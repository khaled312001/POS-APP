/**
 * rewards.js — the customer's real loyalty balance, tier and history.
 * Tier thresholds match server/deliveryService.ts calculateLoyaltyTier.
 */
window.pages = window.pages || {};

pages.rewards = {
  TIERS: [
    { id: "bronze", min: 0, en: "Bronze", ar: "برونزي" },
    { id: "silver", min: 500, en: "Silver", ar: "فضي" },
    { id: "gold", min: 2000, en: "Gold", ar: "ذهبي" },
    { id: "platinum", min: 5000, en: "Platinum", ar: "بلاتيني" },
  ],

  async render(params, container, alive) {
    const top = ui.topBar(L("Points & rewards", "النقاط والمكافآت"), { back: "account" });
    const storeCfg = await shop.config();
    if (!alive()) return;
    if (!storeCfg.enableLoyalty) {
      container.innerHTML = top + ui.empty("award", L("No loyalty programme", "لا يوجد برنامج ولاء"), L("This store doesn't run a points programme.", "هذا المتجر لا يقدّم برنامج نقاط."));
      return;
    }
    if (!auth.isLoggedIn()) {
      container.innerHTML = top + ui.empty("award", L("Earn points on every order", "اكسب نقاطاً مع كل طلب"),
        L("Sign in so your orders count towards rewards.", "سجّل الدخول لتُحتسب طلباتك في المكافآت."),
        `<button class="btn btn-primary" data-signin>${esc(L("Sign in", "تسجيل الدخول"))}</button>`);
      container.querySelector("[data-signin]").onclick = () => auth.requireLogin("rewards");
      return;
    }
    container.innerHTML = top + ui.spinner();
    const c = auth.getCustomer() || (await auth.loadMe());
    if (!c || !c.id) { auth.requireLogin("rewards"); return; }
    const data = await api.loyalty.get(c.id);
    if (!alive()) return;
    const points = Math.floor(Number(data && data.points) || 0);
    const T = pages.rewards.TIERS;
    let idx = 0;
    T.forEach((t, i) => { if (points >= t.min) idx = i; });
    const tier = T[idx], next = T[idx + 1];
    const pct = next ? Math.round((points - tier.min) / (next.min - tier.min) * 100) : 100;
    const n = (x) => Number(x).toLocaleString("en-US");
    const tx = (data && Array.isArray(data.transactions) ? data.transactions : []).slice(0, 30);
    container.innerHTML = `
${top}
<div class="page page--rewards">
  <section class="card loyalty loyalty--${tier.id}">
    <div class="loyalty__row">
      <div><span class="loyalty__label">${esc(L("Your points", "نقاطك"))}</span>
      <strong class="loyalty__points">${n(points)}</strong></div>
      <span class="loyalty__tier">${icon("award", "icon-sm")} ${esc(L(tier.en, tier.ar))}</span>
    </div>
    <div class="progress progress--light"><div class="progress__bar" style="width:${pct}%"></div></div>
    <p class="small">${next
      ? esc(L(n(next.min - points) + " points to " + next.en, "باقي " + n(next.min - points) + " نقطة للوصول إلى المستوى " + next.ar))
      : esc(L("You've reached the top tier. Thank you!", "وصلت إلى أعلى مستوى. شكراً لك!"))}</p>
  </section>
  <p class="small muted">${esc(L("You earn points on completed orders. Ask the store how to spend them.", "تكسب النقاط على الطلبات المكتملة. اسأل المتجر عن طريقة استخدامها."))}</p>
  <section class="card">
    <h2 class="card__title">${icon("history", "icon-sm")} ${esc(L("History", "السجل"))}</h2>
    ${tx.length ? `<ul class="tx-list">${tx.map(t => {
      const pts = Number(t.points) || 0;
      const plus = t.type === "redeem" ? false : pts >= 0;
      return `<li><span>${esc(t.description || (plus ? L("Points earned", "نقاط مكتسبة") : L("Points used", "نقاط مستخدمة")))}<small class="muted">${esc(kx.fmtDate(t.createdAt))}</small></span>
        <b class="${plus ? "good" : "bad"}">${plus ? "+" : "−"}${n(Math.abs(pts))}</b></li>`;
    }).join("")}</ul>` : `<p class="muted">${esc(L("No points yet — place your first order to start earning.", "لا توجد نقاط بعد — اطلب أول طلب لتبدأ بجمع النقاط."))}</p>`}
  </section>
</div>`;
  },
};
