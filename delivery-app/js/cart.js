/**
 * cart.js — cart state, persisted per store.
 *
 * A line is { _key, productId, name, image, price, variant, mods, notes, qty }
 *   price   unit price before modifiers (the variant's price when one is chosen)
 *   mods    [{ group, label, price }] — group/label exactly as in products.modifiers,
 *           because the server re-prices every line by matching those names.
 *
 * The server is the authority on money: it re-prices each order from its own
 * product rows. The numbers here only drive the UI, but they use the same
 * rules so the customer sees what they will actually be charged.
 */
(function () {
  "use strict";

  var s = window.safeStorage;
  var VERSION = 2;

  var cart = {
    _items: [],
    _tenantId: null,
    _orderType: "delivery",
    _promo: null,          // { code, promoCodeId, discountType, discountValue, maxDiscountCap, minOrderAmount }
    _notes: "",
    _tableQrToken: null,
    _tableName: null,
    _listeners: [],

    _key: function () { return "kassenta_cart_v2_" + (cart._tenantId || "x"); },

    init: function (tenantId) {
      cart._tenantId = tenantId;
      var d = s.json(cart._key(), null);
      if (d && d.v === VERSION && Array.isArray(d.items)) {
        cart._items = d.items.filter(function (i) { return i && i.productId && i.qty > 0; });
        cart._orderType = d.orderType || "delivery";
        cart._promo = d.promo || null;
        cart._notes = d.notes || "";
        cart._tableQrToken = d.tableQrToken || null;
        cart._tableName = d.tableName || null;
      }
      // Retire the old shared cart (different line format, other stores mixed in).
      s.del("barmagly_cart");
    },

    _save: function (silent) {
      s.set(cart._key(), JSON.stringify({
        v: VERSION,
        items: cart._items,
        orderType: cart._orderType,
        promo: cart._promo,
        notes: cart._notes,
        tableQrToken: cart._tableQrToken,
        tableName: cart._tableName,
      }));
      if (!silent) cart._emit();
    },

    onChange: function (fn) {
      cart._listeners.push(fn);
      return function () { cart._listeners = cart._listeners.filter(function (l) { return l !== fn; }); };
    },
    _emit: function () {
      var st = cart.getState();
      cart._listeners.slice().forEach(function (fn) { try { fn(st); } catch (e) { console.error(e); } });
    },

    unitPrice: function (i) {
      return (Number(i.price) || 0) + (i.mods || []).reduce(function (a, m) { return a + (Number(m.price) || 0); }, 0);
    },
    lineTotal: function (i) { return kx.roundMoney(cart.unitPrice(i) * i.qty); },

    count: function () { return cart._items.reduce(function (a, i) { return a + i.qty; }, 0); },
    subtotal: function () { return kx.roundMoney(cart._items.reduce(function (a, i) { return a + cart.lineTotal(i); }, 0)); },
    isEmpty: function () { return cart._items.length === 0; },

    /** Discount the applied promo is worth on the current basket (0 when it no longer qualifies). */
    discount: function () {
      var p = cart._promo;
      if (!p) return 0;
      var sub = cart.subtotal();
      if (p.minOrderAmount && sub < Number(p.minOrderAmount)) return 0;
      var v = Number(p.discountValue) || 0;
      var d = 0;
      if (p.discountType === "percent") {
        d = sub * v / 100;
        if (p.maxDiscountCap) d = Math.min(d, Number(p.maxDiscountCap));
      } else if (p.discountType === "fixed") {
        d = Math.min(v, sub);
      }
      return kx.roundMoney(Math.max(0, Math.min(d, sub)));
    },

    getState: function () {
      return {
        items: cart._items,
        count: cart.count(),
        subtotal: cart.subtotal(),
        discountAmount: cart.discount(),
        orderType: cart._orderType,
        promo: cart._promo,
        promoCodeId: cart._promo ? cart._promo.promoCodeId : null,
        notes: cart._notes,
        tableQrToken: cart._tableQrToken,
        tableName: cart._tableName,
      };
    },

    setOrderType: function (type) {
      if (cart._orderType === "dine_in" && cart._tableQrToken && type !== "dine_in") {
        cart._tableQrToken = null;
        cart._tableName = null;
      }
      cart._orderType = (type === "pickup" || type === "dine_in") ? type : "delivery";
      cart._save();
    },
    setDineIn: function (token, tableName) {
      cart._orderType = "dine_in";
      cart._tableQrToken = token;
      cart._tableName = tableName || null;
      cart._save();
    },
    setPromo: function (promo) { cart._promo = promo || null; cart._save(); },
    clearPromo: function () { cart._promo = null; cart._save(); },
    setNotes: function (n) { cart._notes = String(n || "").slice(0, 300); cart._save(true); },

    _lineKey: function (productId, variant, mods, notes) {
      var m = (mods || []).map(function (x) { return x.group + ":" + x.label; }).sort().join(",");
      return [productId, variant || "", m, (notes || "").trim()].join("|");
    },

    /**
     * Add a product. `opts` = { qty, variant: {name, price}|null, mods: [{group,label,price}], notes }
     */
    add: function (product, opts) {
      opts = opts || {};
      var qty = Math.max(1, Math.min(99, Number(opts.qty) || 1));
      var variant = opts.variant || null;
      var mods = (opts.mods || []).map(function (m) { return { group: m.group, label: m.label, price: Number(m.price) || 0 }; });
      var notes = (opts.notes || "").trim().slice(0, 200);
      var key = cart._lineKey(product.id, variant && variant.name, mods, notes);
      var existing = cart._items.find(function (i) { return i._key === key; });
      if (existing) {
        existing.qty = Math.min(99, existing.qty + qty);
      } else {
        cart._items.push({
          _key: key,
          productId: product.id,
          name: product.name || "",
          nameAr: product.nameAr || "",
          image: shop.productImage(product) || null,
          price: variant ? Number(variant.price) || 0 : Number(product.price) || 0,
          variant: variant ? variant.name : null,
          mods: mods,
          notes: notes,
          qty: qty,
        });
      }
      cart._save();
    },

    setQty: function (key, qty) {
      var item = cart._items.find(function (i) { return i._key === key; });
      if (!item) return;
      if (qty <= 0) cart._items = cart._items.filter(function (i) { return i._key !== key; });
      else item.qty = Math.min(99, qty);
      cart._save();
    },
    removeItem: function (key) { cart.setQty(key, 0); },

    clear: function () {
      cart._items = [];
      cart._promo = null;
      cart._notes = "";
      cart._save();
    },

    /** Summary strings, one per group, in the exact form the server prices. */
    modLines: function (item) {
      var groups = [];
      var byGroup = {};
      (item.mods || []).forEach(function (m) {
        if (!byGroup[m.group]) { byGroup[m.group] = []; groups.push(m.group); }
        byGroup[m.group].push(m.label);
      });
      return groups.map(function (g) { return g ? g + ": " + byGroup[g].join(", ") : byGroup[g].join(", "); });
    },

    /** Options as the customer reads them under the item name. */
    describe: function (item) {
      var parts = [];
      if (item.variant) parts.push(item.variant);
      (item.mods || []).forEach(function (m) { parts.push(m.label); });
      return parts.join(" · ");
    },

    payloadItems: function () {
      return cart._items.map(function (i) {
        return {
          productId: i.productId,
          productName: i.name,
          quantity: i.qty,
          unitPrice: cart.unitPrice(i),
          variant: i.variant || null,
          modifiers: cart.modLines(i),
          notes: i.notes || null,
        };
      });
    },

    /** Drop lines whose product disappeared from the menu (or changed price). */
    reconcile: function (menu) {
      if (!menu || !menu.byId) return [];
      var removed = [];
      cart._items = cart._items.filter(function (i) {
        var p = menu.byId[i.productId];
        if (!p) { removed.push(i.name); return false; }
        if (!i.variant) i.price = Number(p.price) || 0;
        else {
          var v = shop.variants(p).find(function (x) { return x.name === i.variant; });
          if (!v) { removed.push(i.name); return false; }
          i.price = v.price;
        }
        var groups = shop.modGroups(p);
        i.mods = (i.mods || []).filter(function (m) {
          var g = groups.find(function (x) { return x.name === m.group; });
          var o = g && g.options.find(function (x) { return x.label === m.label; });
          if (o) m.price = o.price;
          return !!o;
        });
        i.image = shop.productImage(p) || i.image;
        return true;
      });
      cart._save();
      return removed;
    },
  };

  window.cart = cart;
})();
