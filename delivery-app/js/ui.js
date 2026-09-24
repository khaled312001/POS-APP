/**
 * ui.js — storefront building blocks shared by several pages:
 * page top bar, product cards/rows, the product options sheet (variants,
 * modifier groups, notes, quantity), favourites, and the sticky cart bar.
 */
(function () {
  "use strict";

  var ui = {};

  // ── Page chrome ────────────────────────────────────────────────────────────
  ui.topBar = function (title, opts) {
    opts = opts || {};
    return '<header class="page-top">' +
      '<button class="icon-btn" data-back="' + esc(opts.back || "home") + '" aria-label="' + esc(L("Back", "رجوع")) + '">' +
        icon(isRtl() ? "chevron-right" : "chevron-left", "icon-lg") + "</button>" +
      '<h1 class="page-top__title">' + esc(title) + "</h1>" +
      (opts.right || '<span class="page-top__spacer"></span>') +
      "</header>";
  };
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-back]");
    if (b) { e.preventDefault(); router.back(b.getAttribute("data-back")); }
  });

  ui.empty = function (iconName, title, text, action) {
    return '<div class="state">' +
      '<div class="state__icon">' + icon(iconName, "icon-xl") + "</div>" +
      '<h2 class="state__title">' + esc(title) + "</h2>" +
      (text ? '<p class="state__text">' + esc(text) + "</p>" : "") +
      (action || "") + "</div>";
  };

  ui.spinner = function (text) {
    return '<div class="state state--loading"><div class="spinner" role="status" aria-label="' + esc(L("Loading", "جارٍ التحميل")) + '"></div>' +
      (text ? '<p class="state__text">' + esc(text) + "</p>" : "") + "</div>";
  };

  ui.img = function (src, alt, cls, placeholderIcon) {
    if (!src) return '<div class="' + (cls || "") + ' img-ph" aria-hidden="true">' + icon(placeholderIcon || "image", "icon-lg") + "</div>";
    return '<img class="' + (cls || "") + '" src="' + esc(src) + '" alt="' + esc(alt || "") + '" loading="lazy" decoding="async" ' +
      "onerror=\"this.onerror=null;this.outerHTML='<div class=&quot;" + (cls || "") + " img-ph&quot;></div>'\">";
  };

  // ── Product presentation ───────────────────────────────────────────────────
  function fromPrice(p) {
    var vs = shop.variants(p);
    if (vs.length) return { value: Math.min.apply(null, vs.map(function (v) { return v.price; })), from: vs.length > 1 };
    var groups = shop.modGroups(p);
    var base = Number(p.price) || 0;
    var reqExtra = 0, varies = false;
    groups.forEach(function (g) {
      if (g.required && !g.multiple) {
        var prices = g.options.map(function (o) { return o.price; });
        reqExtra += Math.min.apply(null, prices);
        if (Math.max.apply(null, prices) !== Math.min.apply(null, prices)) varies = true;
      }
    });
    return { value: base + reqExtra, from: varies };
  }
  ui.priceLabel = function (p) {
    var f = fromPrice(p);
    return (f.from ? L("from ", "من ") : "") + formatCurrency(f.value);
  };

  ui.productCard = function (p) {
    var name = shop.productName(p);
    var img = shop.productImage(p);
    return '<article class="p-card" data-product="' + p.id + '" tabindex="0" role="button" aria-label="' + esc(name) + '">' +
      '<div class="p-card__media">' + ui.img(img, name, "p-card__img", "package") + "</div>" +
      '<div class="p-card__body">' +
        '<h3 class="p-card__name">' + esc(name) + "</h3>" +
        (p.description ? '<p class="p-card__desc">' + esc(p.description) + "</p>" : "") +
        '<div class="p-card__foot"><span class="price">' + esc(ui.priceLabel(p)) + "</span>" +
        '<span class="add-btn" aria-hidden="true">' + icon("plus", "icon-sm") + "</span></div>" +
      "</div></article>";
  };

  ui.productRow = function (p) {
    var name = shop.productName(p);
    var img = shop.productImage(p);
    var inCart = cart._items.filter(function (i) { return i.productId === p.id; }).reduce(function (a, i) { return a + i.qty; }, 0);
    return '<article class="p-row" data-product="' + p.id + '" tabindex="0" role="button" aria-label="' + esc(name) + '">' +
      '<div class="p-row__body">' +
        '<h3 class="p-row__name">' + (inCart ? '<span class="qty-pill">' + inCart + "×</span> " : "") + esc(name) + "</h3>" +
        (p.description ? '<p class="p-row__desc">' + esc(p.description) + "</p>" : "") +
        '<span class="price">' + esc(ui.priceLabel(p)) + "</span>" +
      "</div>" +
      '<div class="p-row__media">' + (img ? ui.img(img, name, "p-row__img") : "") +
        '<span class="add-btn add-btn--float" aria-hidden="true">' + icon("plus", "icon-sm") + "</span></div>" +
      "</article>";
  };

  // Any [data-product] opens the options sheet.
  document.addEventListener("click", function (e) {
    var el = e.target.closest && e.target.closest("[data-product]");
    if (!el) return;
    ui.openProduct(Number(el.getAttribute("data-product")));
  });
  document.addEventListener("keydown", function (e) {
    if ((e.key === "Enter" || e.key === " ") && e.target.matches && e.target.matches("[data-product]")) {
      e.preventDefault();
      ui.openProduct(Number(e.target.getAttribute("data-product")));
    }
  });

  // ── Favourites (server rows keyed by favourite id) ─────────────────────────
  ui._favs = null; // { productId: favoriteId }
  ui.loadFavorites = function () {
    if (!auth.isLoggedIn()) { ui._favs = {}; return Promise.resolve(ui._favs); }
    if (ui._favs) return Promise.resolve(ui._favs);
    return api.favorites.list().then(function (rows) {
      ui._favs = {};
      (Array.isArray(rows) ? rows : []).forEach(function (r) { ui._favs[r.productId] = r.id; });
      return ui._favs;
    }).catch(function () { return {}; });
  };
  auth.onChange(function () { ui._favs = null; });

  ui.toggleFavorite = function (productId, btn) {
    if (!auth.isLoggedIn()) {
      showToast(L("Sign in to save favourites", "سجّل الدخول لحفظ المفضلة"), "info");
      return;
    }
    var favs = ui._favs || {};
    var favId = favs[productId];
    btn && (btn.disabled = true);
    var p = favId
      ? api.favorites.remove(favId).then(function () { delete favs[productId]; return false; })
      : api.favorites.add(productId, kx.cfg.tenantId).then(function (r) { favs[productId] = r && r.id; return true; })
          .catch(function (e) { if (e.status === 409) { ui._favs = null; return true; } throw e; });
    p.then(function (on) {
      ui._favs = favs;
      if (btn) { btn.classList.toggle("is-on", on); btn.setAttribute("aria-pressed", on ? "true" : "false"); }
      showToast(on ? L("Saved to favourites", "أُضيف إلى المفضلة") : L("Removed from favourites", "أُزيل من المفضلة"), "success");
    }).catch(function (e) { showToast(e.message, "error"); })
      .then(function () { if (btn) btn.disabled = false; });
  };

  // ── Product options sheet ──────────────────────────────────────────────────
  ui.openProduct = function (productId) {
    var menu = shop.cachedMenu();
    var p = menu && menu.byId[productId];
    if (!p) {
      shop.menu().then(function (m) { if (m.byId[productId]) ui.openProduct(productId); }).catch(function (e) { showToast(e.message, "error"); });
      return;
    }
    var name = shop.productName(p);
    var img = shop.productImage(p);
    var variants = shop.variants(p);
    var groups = shop.modGroups(p);
    var st = {
      qty: 1,
      variant: variants.length ? variants[0] : null,
      // Required single-choice groups start on their first option.
      sel: groups.map(function (g) { return g.required && !g.multiple ? [0] : []; }),
    };

    function optionPrice(price, sign) {
      if (!price) return "";
      return '<span class="opt__price">' + (sign ? "+" : "") + esc(formatCurrency(price)) + "</span>";
    }

    var html =
      (img ? '<div class="ps__hero">' + ui.img(img, name, "ps__img") + "</div>" : "") +
      '<div class="ps__head">' +
        '<h2 class="ps__name">' + esc(name) + "</h2>" +
        (auth.isLoggedIn() ? '<button class="icon-btn fav-btn" data-fav aria-pressed="false" aria-label="' + esc(L("Favourite", "المفضلة")) + '">' + icon("heart", "icon-md") + "</button>" : "") +
      "</div>" +
      (p.description ? '<p class="ps__desc">' + esc(p.description) + "</p>" : "") +
      '<div class="ps__base price">' + esc(formatCurrency(variants.length ? variants[0].price : p.price)) + "</div>";

    if (variants.length) {
      html += '<fieldset class="opt-group" data-variants>' +
        '<legend class="opt-group__head"><span>' + esc(L("Choose a size", "اختر الحجم")) + '</span><span class="badge-req">' + esc(L("Required", "إلزامي")) + "</span></legend>" +
        variants.map(function (v, i) {
          return '<label class="opt"><input type="radio" name="ps-variant" value="' + i + '"' + (i === 0 ? " checked" : "") + ">" +
            '<span class="opt__mark"></span><span class="opt__label">' + esc(v.name) + "</span>" + optionPrice(v.price, false) + "</label>";
        }).join("") + "</fieldset>";
    }

    groups.forEach(function (g, gi) {
      var single = !g.multiple;
      html += '<fieldset class="opt-group" data-group="' + gi + '">' +
        '<legend class="opt-group__head"><span>' + esc(g.name) + "</span>" +
        (g.required ? '<span class="badge-req">' + esc(L("Required", "إلزامي")) + "</span>"
                    : '<span class="badge-opt">' + esc(single ? L("Optional", "اختياري") : L("Choose any", "اختر ما تريد")) + "</span>") +
        "</legend>" +
        g.options.map(function (o, oi) {
          var checked = st.sel[gi].indexOf(oi) >= 0 ? " checked" : "";
          return '<label class="opt"><input type="' + (single ? "radio" : "checkbox") + '" name="ps-g' + gi + '" value="' + oi + '"' + checked + ">" +
            '<span class="opt__mark' + (single ? "" : " opt__mark--box") + '"></span><span class="opt__label">' + esc(o.label) + "</span>" +
            optionPrice(o.price, true) + "</label>";
        }).join("") +
        '<p class="opt-group__err" hidden>' + esc(L("Please choose an option", "يرجى اختيار خيار")) + "</p>" +
        "</fieldset>";
    });

    html += '<label class="field"><span class="field__label">' + esc(L("Special instructions", "ملاحظات خاصة")) + ' <span class="muted">(' + esc(L("optional", "اختياري")) + ")</span></span>" +
      '<textarea class="input" rows="2" maxlength="200" data-notes placeholder="' + esc(L("e.g. no onions", "مثال: بدون بصل")) + '"></textarea></label>';

    html += '<div class="ps__bar">' +
      '<div class="stepper" role="group" aria-label="' + esc(L("Quantity", "الكمية")) + '">' +
        '<button class="stepper__btn" data-q="-1" aria-label="' + esc(L("Decrease", "إنقاص")) + '">' + icon("minus", "icon-sm") + "</button>" +
        '<span class="stepper__val" data-qty aria-live="polite">1</span>' +
        '<button class="stepper__btn" data-q="1" aria-label="' + esc(L("Increase", "زيادة")) + '">' + icon("plus", "icon-sm") + "</button>" +
      "</div>" +
      '<button class="btn btn-primary btn-lg ps__add" data-add><span>' + esc(L("Add to cart", "أضف إلى السلة")) + '</span><span data-total></span></button>' +
      "</div>";

    var sh = sheet('<div class="ps">' + html + "</div>", { className: "sheet-layer--product", label: name });
    var root = sh.body;

    function unitTotal() {
      var base = st.variant ? st.variant.price : Number(p.price) || 0;
      groups.forEach(function (g, gi) { st.sel[gi].forEach(function (oi) { base += g.options[oi].price; }); });
      return base;
    }
    function update() {
      root.querySelector("[data-qty]").textContent = st.qty;
      root.querySelector("[data-total]").textContent = formatCurrency(kx.roundMoney(unitTotal() * st.qty));
    }

    root.addEventListener("change", function (e) {
      var inp = e.target;
      if (inp.name === "ps-variant") {
        st.variant = variants[Number(inp.value)];
        root.querySelector(".ps__base").textContent = formatCurrency(st.variant.price);
      }
      var m = inp.name && inp.name.match(/^ps-g(\d+)$/);
      if (m) {
        var gi = Number(m[1]);
        var g = groups[gi];
        var oi = Number(inp.value);
        if (!g.multiple) st.sel[gi] = [oi];
        else if (inp.checked) {
          if (g.max && st.sel[gi].length >= g.max) { inp.checked = false; showToast(L("You can choose up to ", "يمكنك اختيار حتى ") + g.max, "info"); return; }
          st.sel[gi].push(oi);
        } else st.sel[gi] = st.sel[gi].filter(function (x) { return x !== oi; });
        var err = root.querySelector('[data-group="' + gi + '"] .opt-group__err');
        if (err) err.hidden = true;
      }
      update();
    });
    // Optional single-choice groups can be un-ticked by tapping the chosen one again.
    root.addEventListener("click", function (e) {
      var inp = e.target.closest && e.target.closest("label.opt") && e.target.closest("label.opt").querySelector("input[type=radio]");
      if (!inp) return;
      var m = inp.name.match(/^ps-g(\d+)$/);
      if (!m) return;
      var gi = Number(m[1]);
      if (groups[gi].required) return;
      if (inp.checked && st.sel[gi][0] === Number(inp.value) && e.target.tagName !== "INPUT") {
        e.preventDefault();
        inp.checked = false;
        st.sel[gi] = [];
        update();
      }
    });
    root.querySelectorAll("[data-q]").forEach(function (b) {
      b.onclick = function () { st.qty = Math.max(1, Math.min(99, st.qty + Number(b.getAttribute("data-q")))); update(); };
    });
    var favBtn = root.querySelector("[data-fav]");
    if (favBtn) {
      ui.loadFavorites().then(function (f) {
        var on = !!f[p.id];
        favBtn.classList.toggle("is-on", on);
        favBtn.setAttribute("aria-pressed", on ? "true" : "false");
      });
      favBtn.onclick = function () { ui.toggleFavorite(p.id, favBtn); };
    }
    root.querySelector("[data-add]").onclick = function () {
      // Required groups must have a choice.
      for (var gi = 0; gi < groups.length; gi++) {
        if (groups[gi].required && !st.sel[gi].length) {
          var fs = root.querySelector('[data-group="' + gi + '"]');
          fs.querySelector(".opt-group__err").hidden = false;
          fs.scrollIntoView({ behavior: "smooth", block: "center" });
          return;
        }
      }
      var mods = [];
      groups.forEach(function (g, gi) {
        st.sel[gi].slice().sort(function (a, b) { return a - b; }).forEach(function (oi) {
          mods.push({ group: g.name, label: g.options[oi].label, price: g.options[oi].price });
        });
      });
      cart.add(p, { qty: st.qty, variant: st.variant, mods: mods, notes: root.querySelector("[data-notes]").value });
      sh.close();
      showToast(L("Added to cart", "أُضيف إلى السلة") + " · " + name, "success", 1800);
    };
    update();
  };

  /** Quick add for items without any options; otherwise opens the sheet. */
  ui.quickAdd = function (productId) {
    var p = shop.cachedMenu() && shop.cachedMenu().byId[productId];
    if (!p) return;
    if (shop.hasOptions(p)) return ui.openProduct(productId);
    cart.add(p, { qty: 1 });
    showToast(L("Added to cart", "أُضيف إلى السلة") + " · " + shop.productName(p), "success", 1800);
  };

  // ── Sticky cart bar ────────────────────────────────────────────────────────
  var CART_BAR_PAGES = { home: 1, menu: 1, search: 1, favorites: 1, offers: 1, reviews: 1 };
  ui.updateCartBar = function () {
    var bar = document.getElementById("cart-bar");
    if (!bar) return;
    var st = cart.getState();
    var page = document.body.getAttribute("data-page");
    var show = st.count > 0 && CART_BAR_PAGES[page];
    bar.hidden = !show;
    document.body.classList.toggle("has-cart-bar", !!show);
    if (!show) return;
    bar.innerHTML = '<button class="cart-bar__btn" data-nav="cart">' +
      '<span class="cart-bar__count">' + st.count + "</span>" +
      '<span class="cart-bar__label">' + esc(L("View cart", "عرض السلة")) + "</span>" +
      '<span class="cart-bar__total">' + esc(formatCurrency(st.subtotal - st.discountAmount)) + "</span></button>";
  };

  // [data-nav="route"] anywhere navigates.
  document.addEventListener("click", function (e) {
    var el = e.target.closest && e.target.closest("[data-nav]");
    if (!el) return;
    e.preventDefault();
    var params = {};
    try { params = el.getAttribute("data-params") ? JSON.parse(el.getAttribute("data-params")) : {}; } catch (_) {}
    router.navigate(el.getAttribute("data-nav"), params);
  });

  window.ui = ui;
})();
