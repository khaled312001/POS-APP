/**
 * cart.js — Cart state management with localStorage persistence
 * Supports product items, modifiers, quantity management, and totals.
 */

const CART_KEY = "barmagly_cart";

const cart = {
  _items: [],   // [{ productId, name, price, image, qty, modifiers, modifierPrice }]
  _tenantId: null,
  _slug: null,
  _orderType: "delivery",  // "delivery" | "pickup"
  _promo: null,            // { code, discountType, discountValue, promoCodeId }
  _discountAmount: 0,
  _notes: "",

  // ── Init ────────────────────────────────────────────────────────────────────
  init(tenantId, slug) {
    this._tenantId = tenantId;
    this._slug = slug;
    this._load();
    // Clear cart if it's for a different tenant
    if (this._items.length > 0 && this._items[0]._tenantId !== tenantId) {
      this._items = [];
      this._save();
    }
  },

  // ── Persistence ─────────────────────────────────────────────────────────────
  _load() {
    try {
      const raw = localStorage.getItem(CART_KEY);
      const data = raw ? JSON.parse(raw) : null;
      if (data && data.tenantId === this._tenantId) {
        this._items = data.items || [];
        this._orderType = data.orderType || "delivery";
        this._promo = data.promo || null;
        this._discountAmount = data.discountAmount || 0;
        this._notes = data.notes || "";
      } else {
        this._items = [];
      }
    } catch {
      this._items = [];
    }
  },

  _save() {
    localStorage.setItem(CART_KEY, JSON.stringify({
      tenantId: this._tenantId,
      slug: this._slug,
      items: this._items,
      orderType: this._orderType,
      promo: this._promo,
      discountAmount: this._discountAmount,
      notes: this._notes,
    }));
    this._emit();
  },

  // ── Events ──────────────────────────────────────────────────────────────────
  _listeners: [],

  onChange(fn) {
    this._listeners.push(fn);
    return () => {
      this._listeners = this._listeners.filter(l => l !== fn);
    };
  },

  _emit() {
    this._listeners.forEach(fn => fn(this.getState()));
  },

  // ── State ───────────────────────────────────────────────────────────────────
  getState() {
    return {
      items: this._items,
      count: this.count(),
      subtotal: this.subtotal(),
      orderType: this._orderType,
      promo: this._promo,
      discountAmount: this._discountAmount,
      promoCodeId: this._promo?.promoCodeId || null,
      notes: this._notes,
    };
  },

  count() {
    return this._items.reduce((sum, i) => sum + i.qty, 0);
  },

  subtotal() {
    return this._items.reduce((sum, i) => sum + (i.price + (i.modifierPrice || 0)) * i.qty, 0);
  },

  isEmpty() {
    return this._items.length === 0;
  },

  // ── Order metadata ──────────────────────────────────────────────────────────
  setOrderType(type) {
    this._orderType = type === "pickup" ? "pickup" : "delivery";
    this._save();
  },

  setPromo(promo, discountAmount) {
    this._promo = promo || null;
    this._discountAmount = discountAmount || 0;
    this._save();
  },

  clearPromo() {
    this._promo = null;
    this._discountAmount = 0;
    this._save();
  },

  setNotes(notes) {
    this._notes = notes || "";
    this._save();
  },

  // ── Mutations ───────────────────────────────────────────────────────────────
  addItem(product, qty = 1, modifiers = [], modifierPrice = 0) {
    const key = this._itemKey(product.id, modifiers);
    const existing = this._items.find(i => i._key === key);
    if (existing) {
      existing.qty += qty;
    } else {
      this._items.push({
        _key: key,
        productId: product.id,
        name: product.name,
        price: parseFloat(product.price) || 0,
        image: product.imageUrl || null,
        qty,
        modifiers,
        modifierPrice,
      });
    }
    this._save();
  },

  setQty(key, qty) {
    const item = this._items.find(i => i._key === key);
    if (!item) return;
    if (qty <= 0) {
      this._items = this._items.filter(i => i._key !== key);
    } else {
      item.qty = qty;
    }
    this._save();
  },

  /** Alias: accepts _key OR productId (string or number) for convenience */
  updateQty(keyOrProductId, qty) {
    const item = this._items.find(i =>
      i._key === keyOrProductId ||
      String(i.productId) === String(keyOrProductId)
    );
    if (item) this.setQty(item._key, qty);
  },

  removeItem(keyOrProductId) {
    const item = this._items.find(i =>
      i._key === keyOrProductId ||
      String(i.productId) === String(keyOrProductId)
    );
    if (item) {
      this._items = this._items.filter(i => i._key !== item._key);
      this._save();
    }
  },

  clear() {
    this._items = [];
    this._save();
  },

  // ── Helpers ─────────────────────────────────────────────────────────────────
  _itemKey(productId, modifiers) {
    const modStr = modifiers.map(m => `${m.groupId}:${m.optionId}`).sort().join(",");
    return `${productId}|${modStr}`;
  },

  /** Build the payload for POST /api/delivery/orders */
  buildOrderPayload(opts = {}) {
    return {
      tenantId: this._tenantId,
      items: this._items.map(i => ({
        productId: i.productId,
        productName: i.name,
        quantity: i.qty,
        unitPrice: i.price,
        modifiers: i.modifiers,
      })),
      subtotal: this.subtotal().toFixed(2),
      orderType: this._orderType,
      promoCodeId: this._promo?.promoCodeId || null,
      discountAmount: this._discountAmount.toFixed(2),
      notes: this._notes,
      ...opts,
    };
  },
};

window.cart = cart;
