/**
 * cart-page.js — Full cart page with upsell, promo code, summary, min-order progress
 */
window.pages = window.pages || {};

pages.cart = {
  _appliedPromo: null,
  _discountAmount: 0,

  render(params, container) {
    const cfg = window.DELIVERY_CONFIG || {};
    const rtl = isRtl();
    container.innerHTML = pages.cart._build(cfg, rtl);
    pages.cart._bindEvents(cfg, rtl);
    pages.cart._renderItems(cfg, rtl);
    pages.cart._renderUpsell(cfg);
    _setBottomNavActive("cart");
  },

  _build(cfg, rtl) {
    return `
<div class="cart-page">
  <div class="top-bar">
    <button class="top-bar__icon" onclick="history.back()">${rtl ? "›" : "‹"}</button>
    <span class="top-bar__title">${rtl ? "سلة التسوق" : "Your Cart"}</span>
  </div>
  <div class="cart-layout">
    <div class="cart-main">
      <div class="card">
        <div class="cart-items-header">
          <span class="cart-items-title">${rtl ? "العناصر" : "Items"}</span>
          <span id="cart-item-count" class="text-sm text-muted"></span>
        </div>
        <div class="card-body" id="cart-items-list"></div>
      </div>
      <div class="card" id="min-order-card" style="display:none">
        <div class="card-body">
          <div class="cart-min-order-row">
            <span id="min-order-label" class="text-sm"></span>
            <span id="min-order-pct" class="text-sm font-bold text-primary"></span>
          </div>
          <div class="min-order-bar cart-min-order-bar">
            <div class="min-order-bar__fill" id="min-order-fill" style="width:0%"></div>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="cart-notes-wrap">
          <label class="form-label" for="order-notes">${rtl ? "ملاحظات الطلب" : "Order notes (optional)"}</label>
          <textarea id="order-notes" class="item-notes-area cart-notes-textarea"
            placeholder="${rtl ? "مثال: بدون بصل..." : "e.g. No onions, extra sauce…"}" rows="2"></textarea>
        </div>
      </div>
      <div class="upsell-section" id="upsell-section" style="display:none">
        <div class="upsell-header"><i data-lucide="plus-circle" class="icon-sm"></i> ${rtl ? "يضاف معها عادةً" : "People also order"}</div>
        <div class="upsell-scroll" id="upsell-items"></div>
      </div>
    </div>
    <div class="cart-aside">
      <div class="card">
        <div class="cart-promo-wrap">
          <div class="form-label cart-promo-label"><i data-lucide="ticket" class="icon-sm"></i> ${rtl ? "كود الخصم" : "Promo code"}</div>
          <div id="applied-promo" class="hidden cart-applied-promo">
            <span class="cart-applied-promo__text" id="applied-promo-text"></span>
            <button onclick="pages.cart._removePromo()" class="cart-promo-remove">✕</button>
          </div>
          <div class="promo-row" id="promo-input-row">
            <input class="form-input cart-promo-input" id="promo-code-input" placeholder="${rtl ? "أدخل الكود" : "Enter code"}" />
            <button class="btn btn-outline btn-sm" id="promo-apply-btn" onclick="pages.cart._applyPromo()">${rtl ? "تطبيق" : "Apply"}</button>
          </div>
          <div id="promo-error" class="form-error hidden cart-promo-error"></div>
        </div>
      </div>
      <div class="card">
        <div class="cart-summary-wrap">
          <h3 class="cart-summary-title">${rtl ? "ملخص الطلب" : "Order summary"}</h3>
          <div id="summary-rows"></div>
        </div>
      </div>
      <button class="btn btn-primary btn-full desktop-only" onclick="pages.cart._goCheckout()">
        ${rtl ? "إتمام الطلب" : "Proceed to checkout"}
      </button>
    </div>
  </div>
  <div class="checkout-cta mobile-only">
    <button class="btn btn-primary btn-full" onclick="pages.cart._goCheckout()">
      ${rtl ? "إتمام الطلب" : "Checkout"} — <span id="checkout-total-mobile"></span>
    </button>
  </div>
</div>`;
  },

  _bindEvents(cfg, rtl) {
    const notesEl = document.getElementById("order-notes");
    if (notesEl) {
      const saved = cart.getState().notes;
      if (saved) notesEl.value = saved;
      notesEl.addEventListener("input", e => cart.setNotes(e.target.value));
    }
    document.getElementById("promo-code-input")?.addEventListener("keydown", e => {
      if (e.key === "Enter") pages.cart._applyPromo();
    });
  },

  _renderItems(cfg, rtl) {
    const state = cart.getState();
    const listEl = document.getElementById("cart-items-list");
    const countEl = document.getElementById("cart-item-count");
    if (!listEl) return;

    if (state.items.length === 0) {
      listEl.innerHTML = `<div class="empty-state">
        <div class="empty-state__icon"><i data-lucide="shopping-cart" class="icon-2xl"></i></div>
        <div class="empty-state__title">${rtl ? "السلة فارغة" : "Cart is empty"}</div>
        <div class="empty-state__text">${rtl ? "اختر عناصر من القائمة" : "Add items from the menu"}</div>
        <button class="btn btn-primary mt-md" onclick="router.navigate('menu')">${rtl ? "تصفح القائمة" : "Browse menu"}</button>
      </div>`;
      if (countEl) countEl.textContent = "";
      pages.cart._renderSummary(cfg, rtl);
      const minCard = document.getElementById("min-order-card");
      if (minCard) minCard.style.display = "none";
      return;
    }

    if (countEl) countEl.textContent = `${state.count} ${rtl ? "عنصر" : "item"}${state.count > 1 && !rtl ? "s" : ""}`;

    listEl.innerHTML = state.items.map(item => {
      const img = item.image
        ? `<img class="cart-item__image" src="${fixImageUrl(item.image)}" alt="${item.name}" loading="lazy" onerror="this.style.display='none'" />`
        : `<div class="cart-item__image-placeholder"><i data-lucide="utensils" class="icon-lg"></i></div>`;
      const safeKey = item._key.replace(/'/g, "\\'").replace(/"/g, '\\"');
      const rerender = `pages.cart._renderItems(window.DELIVERY_CONFIG, isRtl()); pages.cart._renderSummary(window.DELIVERY_CONFIG, isRtl()); refreshCartDrawer()`;
      return `<div class="cart-item">
        ${img}
        <div class="cart-item__info">
          <div class="cart-item__name">${item.name}</div>
          <div class="cart-item__price">${formatCurrency((item.price + (item.modifierPrice || 0)) * item.qty, cfg.currency)}</div>
          <button class="cart-item__remove" onclick="cart.removeItem('${safeKey}'); ${rerender}">${rtl ? "إزالة" : "Remove"}</button>
        </div>
        <div class="qty-control">
          <button class="qty-btn" onclick="cart.setQty('${safeKey}', ${item.qty - 1}); ${rerender}">−</button>
          <span class="qty-value">${item.qty}</span>
          <button class="qty-btn" onclick="cart.setQty('${safeKey}', ${item.qty + 1}); ${rerender}">+</button>
        </div>
      </div>`;
    }).join("");

    pages.cart._renderSummary(cfg, rtl);
    pages.cart._updateMinOrder(cfg, rtl, state.subtotal);
  },

  _renderUpsell(cfg) {
    const allProducts = pages.menu?._products || [];
    const cartIds = new Set(cart.getState().items.map(i => i.productId));
    const upsell = allProducts.filter(p => !cartIds.has(p.id)).slice(0, 6);
    const section = document.getElementById("upsell-section");
    const itemsEl = document.getElementById("upsell-items");
    if (!section || !itemsEl || upsell.length === 0) return;
    section.style.display = "";
    itemsEl.innerHTML = upsell.map(p => {
      const img = p.imageUrl
        ? `<img class="upsell-item__image" src="${fixImageUrl(p.imageUrl)}" alt="${p.name}" loading="lazy" />`
        : `<div class="upsell-item__image"><i data-lucide="utensils" class="icon-lg"></i></div>`;
      return `<div class="upsell-item" onclick="cart.addItem(${JSON.stringify({id:p.id,name:p.name,price:p.price,imageUrl:p.imageUrl||""}).replace(/"/g,'&quot;')},1); pages.cart._renderItems(window.DELIVERY_CONFIG,isRtl()); showToast('Added','success'); refreshCartDrawer()">
        ${img}
        <div class="upsell-item__body">
          <div class="upsell-item__name">${p.name}</div>
          <div class="upsell-item__price">${formatCurrency(parseFloat(p.price), cfg.currency)}</div>
        </div>
      </div>`;
    }).join("");
  },

  _renderSummary(cfg, rtl) {
    const state = cart.getState();
    const subtotal = state.subtotal;
    const discount = pages.cart._discountAmount;
    const deliveryFee = parseFloat(pages.menu?._storeConfig?.deliveryFee) || 0;
    const total = Math.max(0, subtotal - discount) + deliveryFee;
    const summaryEl = document.getElementById("summary-rows");
    if (summaryEl) {
      summaryEl.innerHTML = `
        <div class="summary-row"><span class="label">${rtl ? "المجموع الجزئي" : "Subtotal"}</span><strong>${formatCurrency(subtotal, cfg.currency)}</strong></div>
        ${deliveryFee > 0
          ? `<div class="summary-row"><span class="label">${rtl ? "التوصيل" : "Delivery"}</span><strong>${formatCurrency(deliveryFee, cfg.currency)}</strong></div>`
          : `<div class="summary-row"><span class="label">${rtl ? "التوصيل" : "Delivery"}</span><strong class="cart-free-delivery">${rtl ? "مجاني" : "Free"}</strong></div>`}
        ${discount > 0 ? `<div class="summary-row discount"><span class="label"><i data-lucide="ticket" class="icon-xs"></i> ${rtl ? "خصم" : "Discount"}</span><strong>−${formatCurrency(discount, cfg.currency)}</strong></div>` : ""}
        <div class="summary-row total"><span>${rtl ? "الإجمالي" : "Total"}</span><strong>${formatCurrency(total, cfg.currency)}</strong></div>`;
    }
    const mobileTotal = document.getElementById("checkout-total-mobile");
    if (mobileTotal) mobileTotal.textContent = formatCurrency(total, cfg.currency);
  },

  _updateMinOrder(cfg, rtl, subtotal) {
    const minOrder = parseFloat(pages.menu?._storeConfig?.minOrderAmount) || 0;
    const card = document.getElementById("min-order-card");
    if (!card || minOrder === 0) { if (card) card.style.display = "none"; return; }
    card.style.display = "";
    const pct = Math.min(100, Math.round((subtotal / minOrder) * 100));
    const fill = document.getElementById("min-order-fill");
    const label = document.getElementById("min-order-label");
    const pctEl = document.getElementById("min-order-pct");
    if (fill) { fill.style.width = pct + "%"; fill.classList.toggle("complete", pct >= 100); }
    if (label) label.textContent = pct < 100
      ? (rtl ? `أضف ${formatCurrency(minOrder - subtotal, cfg.currency)} للحد الأدنى` : `Add ${formatCurrency(minOrder - subtotal, cfg.currency)} to reach minimum`)
      : (rtl ? "✓ وصلت للحد الأدنى" : "✓ Minimum order reached");
    if (pctEl) pctEl.textContent = pct + "%";
  },

  async _applyPromo() {
    const input = document.getElementById("promo-code-input");
    const errEl = document.getElementById("promo-error");
    const applyBtn = document.getElementById("promo-apply-btn");
    const code = (input?.value || "").trim().toUpperCase();
    if (!code) return;
    const cfg = window.DELIVERY_CONFIG || {};
    const state = cart.getState();
    const customer = auth.getCustomer();
    if (applyBtn) applyBtn.classList.add("loading");
    if (errEl) errEl.classList.add("hidden");
    try {
      const result = await api.promos.validate(cfg.tenantId, code, state.subtotal, state.orderType || "delivery", customer?.id);
      pages.cart._appliedPromo = result;
      pages.cart._discountAmount = parseFloat(result.discountAmount) || 0;
      const appliedEl = document.getElementById("applied-promo");
      const appliedText = document.getElementById("applied-promo-text");
      const inputRow = document.getElementById("promo-input-row");
      if (appliedEl && appliedText && inputRow) {
        appliedText.textContent = `${code} — −${formatCurrency(pages.cart._discountAmount, cfg.currency)}`;
        appliedEl.classList.remove("hidden");
        inputRow.classList.add("hidden");
      }
      pages.cart._renderSummary(cfg, isRtl());
      showToast(isRtl() ? "تم تطبيق الخصم" : "Promo applied!", "success");
    } catch (err) {
      if (errEl) { errEl.textContent = err.message || (isRtl() ? "كود غير صالح" : "Invalid code"); errEl.classList.remove("hidden"); }
    } finally {
      if (applyBtn) applyBtn.classList.remove("loading");
    }
  },

  _removePromo() {
    pages.cart._appliedPromo = null;
    pages.cart._discountAmount = 0;
    document.getElementById("applied-promo")?.classList.add("hidden");
    document.getElementById("promo-input-row")?.classList.remove("hidden");
    const inp = document.getElementById("promo-code-input");
    if (inp) inp.value = "";
    pages.cart._renderSummary(window.DELIVERY_CONFIG, isRtl());
  },

  _goCheckout() {
    // Require login for delivery/pickup, but allow guest for dine-in
    const isDineIn = cart.getState().orderType === "dine_in";
    if (!isDineIn && !auth.isLoggedIn()) {
      showToast(isRtl() ? "يجب تسجيل الدخول أولاً لإتمام الطلب" : "Please login first to place an order", "warning");
      router.navigate("login");
      return;
    }
    const state = cart.getState();
    const minOrder = parseFloat(pages.menu?._storeConfig?.minOrderAmount) || 0;
    if (state.items.length === 0) { showToast(isRtl() ? "السلة فارغة" : "Cart is empty", "warning"); return; }
    if (minOrder > 0 && state.subtotal < minOrder) {
      showToast(isRtl() ? `الحد الأدنى ${formatCurrency(minOrder, (window.DELIVERY_CONFIG||{}).currency)}` : `Minimum order: ${formatCurrency(minOrder, (window.DELIVERY_CONFIG||{}).currency)}`, "warning");
      return;
    }
    if (pages.cart._appliedPromo) cart.setPromo(pages.cart._appliedPromo, pages.cart._discountAmount);
    router.navigate("checkout");
  },
};
