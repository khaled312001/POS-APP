/**
 * offers.js — the store's real, active promo codes (nothing invented) and a
 * pointer to the loyalty programme.
 */
window.pages = window.pages || {};

pages.offers = {
  discountLabel(p) {
    const v = Number(p.discountValue) || 0;
    if (p.discountType === "percent") return L(v + "% off", "خصم " + v + "%");
    if (p.discountType === "fixed") return L(formatCurrency(v) + " off", "خصم " + formatCurrency(v));
    if (p.discountType === "free_delivery") return L("Free delivery", "توصيل مجاني");
    return p.code;
  },

  async render(params, container, alive) {
    container.innerHTML = ui.topBar(L("Offers", "العروض")) + `<div class="page">${'<div class="card"><div class="sk sk--line"></div><div class="sk sk--line" style="width:50%"></div></div>'.repeat(3)}</div>`;
    const [storeCfg, promos] = await Promise.all([shop.config(), shop.promos()]);
    if (!alive()) return;
    // Free-delivery codes can't be applied online (the server never applies them).
    const list = promos.filter(p => p.discountType !== "free_delivery");
    const applied = cart.getState().promo;
    container.innerHTML = `
${ui.topBar(L("Offers", "العروض"))}
<div class="page page--offers">
  ${list.length ? list.map(p => {
    const min = Number(p.minOrderAmount) || 0;
    const until = p.validUntil ? kx.fmtDate(p.validUntil) : "";
    const types = Array.isArray(p.applicableOrderTypes) ? p.applicableOrderTypes : null;
    const on = applied && applied.code === p.code;
    return `<article class="card coupon">
      <div class="coupon__value">${icon("ticket-percent", "icon-lg")}<strong>${esc(pages.offers.discountLabel(p))}</strong></div>
      <div class="coupon__body">
        ${p.description ? `<p>${esc(p.description)}</p>` : ""}
        <ul class="coupon__terms small muted">
          ${min ? `<li>${esc(L("Minimum order ", "الحد الأدنى للطلب "))}${esc(formatCurrency(min))}</li>` : ""}
          ${p.discountType === "percent" && Number(p.maxDiscountCap) ? `<li>${esc(L("Up to ", "بحد أقصى "))}${esc(formatCurrency(p.maxDiscountCap))}</li>` : ""}
          ${types && types.length === 1 ? `<li>${esc(types[0] === "pickup" ? L("Pickup orders only", "لطلبات الاستلام فقط") : L("Delivery orders only", "لطلبات التوصيل فقط"))}</li>` : ""}
          ${until ? `<li>${esc(L("Valid until ", "صالح حتى "))}${esc(until)}</li>` : ""}
        </ul>
        <div class="coupon__foot">
          <span class="code" dir="ltr">${esc(p.code)}</span>
          ${on ? `<span class="badge badge--good">${icon("check", "icon-xs")} ${esc(L("Applied", "مُطبَّق"))}</span>`
               : `<button class="btn btn-soft btn-sm" data-apply="${esc(p.code)}">${esc(L("Use code", "استخدم الكود"))}</button>`}
        </div>
      </div>
    </article>`;
  }).join("") : ui.empty("ticket-percent", L("No offers right now", "لا توجد عروض حالياً"), L("Check back soon for new deals.", "تابعنا قريباً لعروض جديدة."))}

  ${storeCfg.enableLoyalty ? `
  <button class="promo-card" data-nav="rewards">
    <span class="promo-card__icon">${icon("award", "icon-lg")}</span>
    <span class="promo-card__txt"><strong>${esc(L("Loyalty points", "نقاط الولاء"))}</strong><span>${esc(L("Every order earns points with this store.", "كل طلب يكسبك نقاطاً لدى هذا المتجر."))}</span></span>
    ${icon(isRtl() ? "chevron-left" : "chevron-right", "icon-md")}
  </button>` : ""}
</div>`;
    container.querySelectorAll("[data-apply]").forEach(b => b.onclick = async () => {
      if (cart.isEmpty()) {
        showToast(L("Add items to your cart first, then enter the code in the cart.", "أضف أصنافاً إلى سلتك أولاً، ثم أدخل الكود في السلة."), "info", 4000);
        router.navigate("menu");
        return;
      }
      b.disabled = true; b.classList.add("is-loading");
      try {
        const msg = await pages.cart.applyPromo(b.dataset.apply);
        if (!msg) { showToast(L("Code applied", "تم تطبيق الكود"), "success"); router.navigate("cart"); return; }
        showToast(msg, "error", 5000);
      } catch (e) { showToast(e.message, "error"); }
      b.disabled = false; b.classList.remove("is-loading");
    });
  },
};
