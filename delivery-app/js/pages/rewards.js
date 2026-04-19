/**
 * rewards.js — Loyalty rewards page (Just Eat style)
 */
window.pages = window.pages || {};

pages.rewards = {
  render(params, container) {
    var cfg = window.DELIVERY_CONFIG || {};
    var rtl = isRtl();
    var customer = auth.getCustomer();
    var points = 0;
    var tier = "bronze";

    container.innerHTML = `
<div class="info-page">
  <div class="top-bar top-bar--sticky">
    <button class="top-bar__icon" onclick="history.back()">${rtl ? "›" : "‹"}</button>
    <span class="top-bar__title">${rtl ? "المكافآت" : "Rewards"}</span>
  </div>

  <!-- Hero -->
  <div class="rewards-hero">
    <div class="rewards-hero__icon"><i data-lucide="award" class="icon-3xl"></i></div>
    <h1 class="rewards-hero__title">${rtl ? "اكسب مكافآت مع كل طلب" : "Earn rewards with every order"}</h1>
    <p class="rewards-hero__sub">${rtl ? "اجمع النقاط واستبدلها بخصومات ووجبات مجانية" : "Collect points and redeem them for discounts & free meals"}</p>
    ${!customer ? `<button class="btn btn-primary" onclick="router.navigate('login')">${rtl ? "سجل دخولك للبدء" : "Sign in to start earning"}</button>` : ""}
  </div>

  <!-- How it works -->
  <div class="info-section">
    <h2 class="info-section__title">${rtl ? "كيف يعمل؟" : "How it works"}</h2>
    <div class="info-steps">
      <div class="info-step">
        <div class="info-step__num">1</div>
        <div class="info-step__icon"><i data-lucide="shopping-bag" class="icon-xl"></i></div>
        <h3>${rtl ? "اطلب" : "Order"}</h3>
        <p>${rtl ? "اطلب من أي مطعم على المنصة" : "Order from any restaurant on the platform"}</p>
      </div>
      <div class="info-step">
        <div class="info-step__num">2</div>
        <div class="info-step__icon"><i data-lucide="coins" class="icon-xl"></i></div>
        <h3>${rtl ? "اجمع النقاط" : "Earn Points"}</h3>
        <p>${rtl ? "اكسب 1 نقطة لكل 1 فرنك تنفقه" : "Earn 1 point for every CHF 1 you spend"}</p>
      </div>
      <div class="info-step">
        <div class="info-step__num">3</div>
        <div class="info-step__icon"><i data-lucide="gift" class="icon-xl"></i></div>
        <h3>${rtl ? "استبدل" : "Redeem"}</h3>
        <p>${rtl ? "استبدل نقاطك بخصومات ووجبات" : "Redeem points for discounts and meals"}</p>
      </div>
    </div>
  </div>

  <!-- Tiers -->
  <div class="info-section">
    <h2 class="info-section__title">${rtl ? "مستويات العضوية" : "Membership tiers"}</h2>
    <div class="rewards-tiers">
      <div class="rewards-tier">
        <div class="rewards-tier__icon" style="color:var(--tier-bronze)"><i data-lucide="medal" class="icon-xl"></i></div>
        <div class="rewards-tier__name">Bronze</div>
        <div class="rewards-tier__req">${rtl ? "0 نقطة" : "0 points"}</div>
        <ul class="rewards-tier__perks">
          <li>${rtl ? "اكسب نقاط مع كل طلب" : "Earn points on every order"}</li>
          <li>${rtl ? "عروض حصرية" : "Exclusive offers"}</li>
        </ul>
      </div>
      <div class="rewards-tier">
        <div class="rewards-tier__icon" style="color:var(--tier-silver)"><i data-lucide="medal" class="icon-xl"></i></div>
        <div class="rewards-tier__name">Silver</div>
        <div class="rewards-tier__req">${rtl ? "500 نقطة" : "500 points"}</div>
        <ul class="rewards-tier__perks">
          <li>${rtl ? "نقاط مضاعفة 1.5x" : "1.5x points multiplier"}</li>
          <li>${rtl ? "توصيل مجاني شهري" : "Monthly free delivery"}</li>
        </ul>
      </div>
      <div class="rewards-tier">
        <div class="rewards-tier__icon" style="color:var(--tier-gold)"><i data-lucide="trophy" class="icon-xl"></i></div>
        <div class="rewards-tier__name">Gold</div>
        <div class="rewards-tier__req">${rtl ? "2000 نقطة" : "2,000 points"}</div>
        <ul class="rewards-tier__perks">
          <li>${rtl ? "نقاط مضاعفة 2x" : "2x points multiplier"}</li>
          <li>${rtl ? "توصيل مجاني دائم" : "Always free delivery"}</li>
          <li>${rtl ? "أولوية الدعم" : "Priority support"}</li>
        </ul>
      </div>
      <div class="rewards-tier">
        <div class="rewards-tier__icon" style="color:var(--tier-platinum)"><i data-lucide="gem" class="icon-xl"></i></div>
        <div class="rewards-tier__name">Platinum</div>
        <div class="rewards-tier__req">${rtl ? "5000 نقطة" : "5,000 points"}</div>
        <ul class="rewards-tier__perks">
          <li>${rtl ? "نقاط مضاعفة 3x" : "3x points multiplier"}</li>
          <li>${rtl ? "وصول مبكر للعروض" : "Early access to deals"}</li>
          <li>${rtl ? "هدايا عيد الميلاد" : "Birthday rewards"}</li>
        </ul>
      </div>
    </div>
  </div>

  <div class="home-spacer"></div>
</div>`;
    if (window.lucide) window.lucide.createIcons();
  }
};
