/**
 * cart-page.js — basket: lines with their options, quantity, order notes,
 * promo code (checked with the server), minimum order, suggestions.
 */
window.pages = window.pages || {};

pages.cart = {
  /** Server promo messages are English; show them in the customer's language. */
  promoError(msg) {
    const m = String(msg || "");
    const map = [
      [/invalid promo/i, L("This code is not valid.", "هذا الكود غير صالح.")],
      [/not active yet/i, L("This code is not active yet.", "هذا الكود غير مفعّل بعد.")],
      [/expired/i, L("This code has expired.", "انتهت صلاحية هذا الكود.")],
      [/usage limit/i, L("This code has been fully used.", "استُنفد استخدام هذا الكود.")],
      [/minimum order amount is ([\d.]+)/i, null],
      [/order type/i, L("This code doesn't apply to this order type.", "هذا الكود لا ينطبق على نوع الطلب هذا.")],
      [/already used/i, L("You have already used this code.", "لقد استخدمت هذا الكود من قبل.")],
    ];
    for (const [re, text] of map) {
      const hit = m.match(re);
      if (hit && text) return text;
      if (hit) return L("Spend at least ", "الحد الأدنى لاستخدام الكود ") + formatCurrency(Number(hit[1]));
    }
    return m || L("This code is not valid.", "هذا الكود غير صالح.");
  },

  /** Validate a code with the server and store it on the cart. Returns an error string or "". */
  async applyPromo(code) {
    code = String(code || "").trim().toUpperCase();
    if (!code) return L("Enter a code", "أدخل الكود");
    const st = cart.getState();
    const c = auth.getCustomer();
    const r = await api.promos.validate(kx.cfg.tenantId, code, st.subtotal, st.orderType === "dine_in" ? "pickup" : st.orderType, c && c.id);
    if (!r || !r.valid) return pages.cart.promoError(r && r.error);
    const p = r.promoCode || {};
    if ((r.discountType || p.discountType) === "free_delivery") {
      return L("Free-delivery codes can't be applied online. Please mention it to the store.", "أكواد التوصيل المجاني لا تُطبَّق عبر الإنترنت حالياً. يرجى ذكره للمتجر.");
    }
    cart.setPromo({
      code: p.code || code,
      promoCodeId: p.id || null,
      discountType: r.discountType || p.discountType,
      discountValue: Number(p.discountValue) || 0,
      maxDiscountCap: p.maxDiscountCap != null ? Number(p.maxDiscountCap) : null,
      minOrderAmount: Number(p.minOrderAmount) || 0,
    });
    return "";
  },

  async render(params, container, alive) {
    const storeCfg = await shop.config();
    // Refresh prices/options against the live menu (quietly; offline keeps the cart).
    try {
      const menu = await shop.menu();
      const removed = cart.reconcile(menu);
      if (removed.length) showToast(L("No longer available: ", "لم يعد متوفراً: ") + removed.join("، "), "info", 5000);
    } catch (_) {}
    if (!alive()) return;

    const draw = () => {
      const st = cart.getState();
      if (!st.items.length) {
        container.innerHTML = ui.topBar(L("Your cart", "السلة"), { back: "menu" }) +
          ui.empty("shopping-bag", L("Your cart is empty", "سلتك فارغة"), L("Add something tasty from the menu.", "أضف ما يعجبك من القائمة."),
            `<button class="btn btn-primary" data-nav="menu">${icon("utensils", "icon-sm")} ${esc(L("Browse the menu", "تصفّح القائمة"))}</button>`);
        refreshIcons();
        return;
      }
      const types = shop.orderTypes();
      const isDelivery = st.orderType === "delivery";
      const minOrder = isDelivery ? Number(storeCfg.minOrderAmount) || 0 : 0;
      const short = Math.max(0, minOrder - st.subtotal);
      const fee = isDelivery ? Number(storeCfg.deliveryFee) || 0 : 0;
      const total = Math.max(0, st.subtotal - st.discountAmount) + fee;
      const promoLost = st.promo && st.discountAmount === 0;

      container.innerHTML = `
${ui.topBar(L("Your cart", "السلة"), { back: "menu", right: `<button class="icon-btn" data-clear aria-label="${esc(L("Empty the cart", "إفراغ السلة"))}">${icon("trash-2", "icon-md")}</button>` })}
<div class="page page--cart">
  <div class="cols">
    <div class="cols__main">
      ${st.orderType === "dine_in" ? `<div class="notice notice--info">${icon("utensils", "icon-sm")} ${esc(L("Dine-in", "طلب داخل المطعم"))}${st.tableName ? " · " + esc(st.tableName) : ""}</div>`
        : types.length > 1 ? `<div class="seg" role="radiogroup">${types.map(tp => `<button class="seg__btn ${st.orderType === tp ? "is-on" : ""}" role="radio" aria-checked="${st.orderType === tp}" data-type="${tp}">${icon(tp === "delivery" ? "bike" : "store", "icon-sm")} ${tp === "delivery" ? esc(L("Delivery", "توصيل")) : esc(L("Pickup", "استلام"))}</button>`).join("")}</div>` : ""}

      <section class="card">
        <ul class="lines">
          ${st.items.map(i => `
          <li class="line">
            ${i.image ? ui.img(i.image, "", "line__img") : `<div class="line__img img-ph">${icon("package", "icon-md")}</div>`}
            <div class="line__body">
              <div class="line__name">${esc(kx.lang() === "ar" && i.nameAr ? i.nameAr : i.name)}</div>
              ${cart.describe(i) ? `<div class="line__opts">${esc(cart.describe(i))}</div>` : ""}
              ${i.notes ? `<div class="line__notes">${icon("message-square", "icon-xs")} ${esc(i.notes)}</div>` : ""}
              <div class="line__foot">
                <span class="price">${esc(formatCurrency(cart.lineTotal(i)))}</span>
                <div class="stepper stepper--sm">
                  <button class="stepper__btn" data-dec="${esc(i._key)}" aria-label="${esc(i.qty === 1 ? L("Remove", "حذف") : L("Decrease", "إنقاص"))}">${icon(i.qty === 1 ? "trash-2" : "minus", "icon-sm")}</button>
                  <span class="stepper__val">${i.qty}</span>
                  <button class="stepper__btn" data-inc="${esc(i._key)}" aria-label="${esc(L("Increase", "زيادة"))}" ${i.qty >= 99 ? "disabled" : ""}>${icon("plus", "icon-sm")}</button>
                </div>
              </div>
            </div>
          </li>`).join("")}
        </ul>
        <button class="btn btn-ghost btn-block" data-nav="menu">${icon("plus", "icon-sm")} ${esc(L("Add more items", "أضف أصنافاً أخرى"))}</button>
      </section>

      <div id="upsell"></div>

      <section class="card">
        <label class="field">
          <span class="field__label">${esc(L("Note for the store", "ملاحظة للمتجر"))} <span class="muted">(${esc(L("optional", "اختياري"))})</span></span>
          <textarea class="input" id="order-notes" rows="2" maxlength="300" placeholder="${esc(L("e.g. please ring the bell", "مثال: يرجى رنّ الجرس"))}">${esc(st.notes)}</textarea>
        </label>
      </section>
    </div>

    <aside class="cols__side">
      ${storeCfg.enablePromos !== false && st.orderType !== "dine_in" ? `
      <section class="card">
        <h2 class="card__title">${icon("ticket-percent", "icon-sm")} ${esc(L("Promo code", "كود الخصم"))}</h2>
        ${st.promo ? `
          <div class="applied">
            <span>${icon("badge-check", "icon-sm")} <b class="code">${esc(st.promo.code)}</b>
              ${promoLost ? `<span class="muted">${esc(L("— add more to use it", "— أضف المزيد لاستخدامه"))}</span>` : `<span>−${esc(formatCurrency(st.discountAmount))}</span>`}</span>
            <button class="btn btn-ghost btn-sm" data-unpromo>${esc(L("Remove", "إزالة"))}</button>
          </div>` : `
          <form class="inline-form" id="promo-form" novalidate>
            <input class="input" id="promo-input" autocomplete="off" autocapitalize="characters" maxlength="32" placeholder="${esc(L("Enter code", "أدخل الكود"))}" aria-label="${esc(L("Promo code", "كود الخصم"))}">
            <button class="btn btn-soft" type="submit">${esc(L("Apply", "تطبيق"))}</button>
          </form>
          <p class="field__err" id="promo-err" hidden></p>`}
      </section>` : ""}

      <section class="card summary">
        <div class="summary__row"><span>${esc(L("Subtotal", "المجموع الفرعي"))}</span><span>${esc(formatCurrency(st.subtotal))}</span></div>
        ${st.discountAmount ? `<div class="summary__row summary__row--good"><span>${esc(L("Discount", "الخصم"))}</span><span>−${esc(formatCurrency(st.discountAmount))}</span></div>` : ""}
        ${isDelivery ? `<div class="summary__row"><span>${esc(L("Delivery", "التوصيل"))}</span><span>${fee ? esc(formatCurrency(fee)) : esc(L("Free", "مجاني"))}</span></div>` : ""}
        <div class="summary__row summary__row--total"><span>${esc(L("Total", "الإجمالي"))}</span><span>${esc(formatCurrency(total))}</span></div>
        ${isDelivery ? `<p class="muted small">${esc(L("The delivery fee may change with your area at checkout.", "قد تتغيّر رسوم التوصيل حسب منطقتك عند إتمام الطلب."))}</p>` : ""}
        ${short > 0 ? `
        <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="${minOrder}" aria-valuenow="${st.subtotal}">
          <div class="progress__bar" style="width:${Math.min(100, Math.round(st.subtotal / minOrder * 100))}%"></div>
        </div>
        <p class="small">${esc(L("Add ", "أضف "))}<b>${esc(formatCurrency(short))}</b>${esc(L(" more to reach the minimum order for delivery.", " للوصول إلى الحد الأدنى لطلب التوصيل."))}</p>` : ""}
      </section>

      <div class="cta-bar">
        <button class="btn btn-primary btn-lg btn-block" data-checkout ${short > 0 ? "disabled" : ""}>
          <span>${esc(short > 0 ? L("Minimum order not reached", "لم يتم بلوغ الحد الأدنى") : L("Go to checkout", "متابعة الطلب"))}</span>
          <span>${esc(formatCurrency(total))}</span>
        </button>
      </div>
    </aside>
  </div>
</div>`;

      bind();
      drawUpsell();
      refreshIcons();
    };

    const bind = () => {
      container.querySelectorAll("[data-type]").forEach(b => b.onclick = () => cart.setOrderType(b.dataset.type));
      container.querySelectorAll("[data-inc]").forEach(b => b.onclick = () => {
        const it = cart._items.find(x => x._key === b.dataset.inc);
        if (it) cart.setQty(it._key, it.qty + 1);
      });
      container.querySelectorAll("[data-dec]").forEach(b => b.onclick = () => {
        const it = cart._items.find(x => x._key === b.dataset.dec);
        if (it) cart.setQty(it._key, it.qty - 1);
      });
      const clr = container.querySelector("[data-clear]");
      if (clr) clr.onclick = async () => {
        if (await confirmDialog(L("Remove everything from your cart?", "هل تريد إفراغ السلة بالكامل؟"), L("Empty cart", "إفراغ السلة"), true)) cart.clear();
      };
      const notes = container.querySelector("#order-notes");
      if (notes) notes.oninput = () => cart.setNotes(notes.value);
      const un = container.querySelector("[data-unpromo]");
      if (un) un.onclick = () => cart.clearPromo();
      const form = container.querySelector("#promo-form");
      if (form) form.onsubmit = async (e) => {
        e.preventDefault();
        const btn = form.querySelector("button");
        const input = form.querySelector("input");
        const err = container.querySelector("#promo-err");
        btn.disabled = true;
        btn.classList.add("is-loading");
        err.hidden = true;
        try {
          const msg = await pages.cart.applyPromo(input.value);
          if (msg) { err.textContent = msg; err.hidden = false; }
          else showToast(L("Code applied", "تم تطبيق الكود"), "success");
        } catch (ex) {
          err.textContent = ex.message; err.hidden = false;
        } finally {
          btn.disabled = false;
          btn.classList.remove("is-loading");
        }
      };
      const go = container.querySelector("[data-checkout]");
      if (go) go.onclick = () => router.navigate("checkout");
    };

    const drawUpsell = () => {
      const box = container.querySelector("#upsell");
      const menu = shop.cachedMenu();
      if (!box || !menu) return;
      const inCart = new Set(cart._items.map(i => i.productId));
      const cats = new Set(cart._items.map(i => menu.byId[i.productId] && menu.byId[i.productId].categoryId));
      // Other categories first (drinks with food, etc.), items with photos.
      const pool = menu.products.filter(p => !inCart.has(p.id) && (Number(p.price) > 0 || shop.variants(p).length));
      const pick = pool.filter(p => !cats.has(p.categoryId) && shop.productImage(p))
        .concat(pool.filter(p => cats.has(p.categoryId) && shop.productImage(p))).slice(0, 8);
      if (pick.length < 2) { box.innerHTML = ""; return; }
      box.innerHTML = `<section class="section section--flush">
        <div class="section__head"><h2 class="section__title">${esc(L("You might also like", "قد يعجبك أيضاً"))}</h2></div>
        <div class="rail">${pick.map(ui.productCard).join("")}</div></section>`;
    };

    draw();
    const off = cart.onChange(() => { if (alive()) draw(); });
    router.onLeave(off);
  },
};
