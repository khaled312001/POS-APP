/**
 * offers.js — Offers, Promo Codes, Referral Program, Loyalty Tiers
 */
window.pages = window.pages || {};

pages.offers = {
  _promos: [],
  _customer: null,

  async render(params, container) {
    const cfg = window.DELIVERY_CONFIG || {};
    const rtl = isRtl();

    container.innerHTML = pages.offers._skeleton(rtl);

    // Load promos + customer loyalty in parallel
    const [promos, customer] = await Promise.allSettled([
      api.store.getPromos(cfg.slug || cfg.tenantId),
      auth.getCustomer ? Promise.resolve(auth.getCustomer()) : Promise.resolve(null),
    ]);

    const promosRaw = promos.status === "fulfilled" ? promos.value : null;
    pages.offers._promos = Array.isArray(promosRaw) ? promosRaw : (promosRaw?.promos || []);
    pages.offers._customer = customer.status === "fulfilled" ? customer.value : null;

    container.innerHTML = pages.offers._build(cfg, rtl);
    pages.offers._bindEvents();
  },

  _skeleton(rtl) {
    return `
<div class="offers-page">
  <div class="offers-hero offers-hero--skeleton">
    <div class="loading-spinner offers-spinner-override"></div>
  </div>
  <div class="offers-skeleton-wrap">
    ${[0,1,2].map(() => `<div class="skeleton offers-skeleton-block"></div>`).join("")}
  </div>
</div>`;
  },

  _build(cfg, rtl) {
    const customer = pages.offers._customer;
    const promos = pages.offers._promos;

    return `
<div class="offers-page">

  <!-- Hero -->
  <div class="offers-hero">
    <div class="offers-hero__content">
      <div class="offers-hero__icon-wrap"><i data-lucide="gift" class="icon-2xl"></i></div>
      <h1 class="offers-hero__title">${rtl ? "العروض والخصومات" : "Deals & Offers"}</h1>
      <p class="offers-hero__sub">${rtl ? "وفّر أكثر مع كل طلب" : "Save more with every order"}</p>
    </div>
  </div>

  <div class="page-body offers-page-body">

    <!-- Loyalty Banner (if logged in) -->
    ${customer ? pages.offers._loyaltyBanner(customer, cfg, rtl) : pages.offers._loginBanner(rtl)}

    <!-- Active Promo Codes -->
    ${promos.length > 0 ? `
    <section class="offers-section">
      <h2 class="section-title offers-section-title">${rtl ? "كودات الخصم" : "Promo Codes"}</h2>
      <div class="promos-grid">
        ${promos.map(p => pages.offers._promoCard(p, rtl, cfg)).join("")}
      </div>
    </section>` : ""}

    <!-- Welcome offer -->
    <section class="offers-section">
      <h2 class="section-title offers-section-title">${rtl ? "عرض الترحيب" : "Welcome Offer"}</h2>
      <div class="promo-card promo-card--featured">
        <div class="promo-card__badge">${rtl ? "عرض الأعضاء الجدد" : "New member offer"}</div>
        <div class="promo-card__body">
          <div class="promo-card__icon"><i data-lucide="party-popper" class="icon-lg"></i></div>
          <div>
            <div class="promo-card__name">${rtl ? "خصم 10% على أول طلب" : "10% off your first order"}</div>
            <div class="promo-card__desc">${rtl ? "صالح لمدة 30 يوم من التسجيل" : "Valid for 30 days from registration"}</div>
          </div>
        </div>
        <div class="promo-card__code-row">
          <span class="promo-code-display">WELCOME10</span>
          <button class="copy-btn" data-code="WELCOME10" onclick="pages.offers._copyCode('WELCOME10', this)">
            <i data-lucide="clipboard" class="icon-xs"></i> ${rtl ? "نسخ" : "Copy"}
          </button>
        </div>
        <div class="promo-card__terms">${rtl ? "الحد الأدنى للطلب: " : "Min. order: "}${formatCurrency(50, (window.DELIVERY_CONFIG || {}).currency)} · ${rtl ? "مرة واحدة فقط" : "One-time use"}</div>
      </div>
    </section>

    <!-- Referral Program -->
    ${customer ? `
    <section class="offers-section">
      <h2 class="section-title offers-section-title">${rtl ? "برنامج الإحالة" : "Refer & Earn"}</h2>
      <div class="referral-card">
        <div class="referral-card__inner">
          <div class="referral-card__icon"><i data-lucide="users" class="icon-xl"></i></div>
          <div class="referral-card__content">
            <h3>${rtl ? "ادعُ أصدقاءك واكسب نقاطاً" : "Invite friends, earn points"}</h3>
            <p>${rtl ? "شارك كودك واحصل على 50 نقطة لكل صديق يطلب أول مرة" : "Share your code and earn 50 points for every friend's first order"}</p>
            <div class="referral-code-box">
              <span class="referral-code">${customer.referralCode || "REF" + (customer.id || "").toString().padStart(6, "0")}</span>
              <button class="copy-btn copy-btn--light" onclick="pages.offers._copyCode('${customer.referralCode || ""}', this)">
                <i data-lucide="clipboard" class="icon-xs"></i> ${rtl ? "نسخ" : "Copy"}
              </button>
            </div>
            <button class="btn btn-outline btn-sm offers-referral-share-btn" onclick="pages.offers._shareReferral('${customer.referralCode || ""}', '${customer.name || ""}')">
              <i data-lucide="share-2" class="icon-sm"></i> ${rtl ? "شارك عبر الواتساب" : "Share via WhatsApp"}
            </button>
          </div>
        </div>
      </div>
    </section>` : ""}

    <!-- How it works -->
    <section class="offers-section">
      <h2 class="section-title offers-section-title">${rtl ? "كيف يعمل البرنامج؟" : "How it works"}</h2>
      <div class="how-it-works">
        ${[
          { icon: '<i data-lucide="smartphone" class="icon-lg"></i>', title: rtl ? "سجّل أو سجّل دخولك" : "Sign up or log in", desc: rtl ? "أنشئ حسابك مجاناً في دقيقة" : "Create your free account in a minute" },
          { icon: '<i data-lucide="shopping-bag" class="icon-lg"></i>', title: rtl ? "اطلب واكسب نقاطاً" : "Order & earn points", desc: rtl ? "كل طلب يمنحك نقاط ولاء" : "Every order earns you loyalty points" },
          { icon: '<i data-lucide="gift" class="icon-lg"></i>', title: rtl ? "استبدل نقاطك بخصومات" : "Redeem for discounts", desc: rtl ? "استخدم نقاطك لتوفير المال" : "Use your points to save on orders" },
        ].map((step, i) => `
        <div class="how-step">
          <div class="how-step__icon">${step.icon}</div>
          <div class="how-step__num">${i + 1}</div>
          <div class="how-step__title">${step.title}</div>
          <div class="how-step__desc">${step.desc}</div>
        </div>`).join("")}
      </div>
    </section>

    <!-- Loyalty Tiers -->
    <section class="offers-section">
      <h2 class="section-title offers-section-title">${rtl ? "مستويات الولاء" : "Loyalty Tiers"}</h2>
      <div class="tiers-grid">
        ${[
          { tier: "bronze",   icon: '<i data-lucide="medal" class="icon-lg"></i>', label: rtl ? "برونزي"   : "Bronze",   pts: "0",     perks: rtl ? "1 نقطة لكل جنيه"          : "1 pt per unit spent" },
          { tier: "silver",   icon: '<i data-lucide="medal" class="icon-lg"></i>', label: rtl ? "فضي"      : "Silver",   pts: "500",   perks: rtl ? "1.5 نقطة + أولوية الدعم"  : "1.5x pts + priority support" },
          { tier: "gold",     icon: '<i data-lucide="trophy" class="icon-lg"></i>', label: rtl ? "ذهبي"     : "Gold",     pts: "1500",  perks: rtl ? "2 نقطة + توصيل مجاني"     : "2x pts + free delivery" },
          { tier: "platinum", icon: '<i data-lucide="gem" class="icon-lg"></i>', label: rtl ? "بلاتيني"  : "Platinum", pts: "5000",  perks: rtl ? "3 نقطة + خصومات حصرية"    : "3x pts + exclusive deals" },
        ].map(t => `
        <div class="tier-card tier-card--${t.tier} ${pages.offers._customer?.loyaltyTier === t.tier ? "tier-card--active" : ""}">
          <div class="tier-card__icon">${t.icon}</div>
          <div class="tier-card__name">${t.label}</div>
          <div class="tier-card__pts">${t.pts === "0" ? (rtl ? "مجاني" : "Free") : `${t.pts}+ ${rtl ? "نقطة" : "pts"}`}</div>
          <div class="tier-card__perk">${t.perks}</div>
          ${pages.offers._customer?.loyaltyTier === t.tier ? `<div class="tier-card__badge">${rtl ? "مستواك الحالي" : "Your tier"}</div>` : ""}
        </div>`).join("")}
      </div>
    </section>

  </div>
</div>`;
  },

  _promoCard(promo, rtl, cfg) {
    const isPercent = promo.discountType === "percent";
    const isFreeDelivery = promo.discountType === "free_delivery";
    const discLabel = isFreeDelivery
      ? (rtl ? "توصيل مجاني" : "Free Delivery")
      : isPercent
        ? `${promo.discountValue}% ${rtl ? "خصم" : "off"}`
        : `${formatCurrency(promo.discountValue, cfg.currency)} ${rtl ? "خصم" : "off"}`;

    const validUntil = promo.validUntil ? new Date(promo.validUntil).toLocaleDateString(rtl ? "ar-EG" : "en-GB", { day: "numeric", month: "short" }) : null;

    return `
<div class="promo-card">
  <div class="promo-card__discount-badge">${discLabel}</div>
  <div class="promo-card__body">
    <div class="promo-card__icon">${isFreeDelivery ? '<i data-lucide="bike" class="icon-lg"></i>' : isPercent ? '<i data-lucide="tag" class="icon-lg"></i>' : '<i data-lucide="coins" class="icon-lg"></i>'}</div>
    <div>
      <div class="promo-card__name">${promo.description || discLabel}</div>
      ${promo.minOrderAmount ? `<div class="promo-card__desc">${rtl ? "الحد الأدنى: " : "Min. order: "}${formatCurrency(promo.minOrderAmount, cfg.currency)}</div>` : ""}
    </div>
  </div>
  <div class="promo-card__code-row">
    <span class="promo-code-display">${promo.code}</span>
    <button class="copy-btn" data-code="${promo.code}" onclick="pages.offers._copyCode('${promo.code}', this)">
      <i data-lucide="clipboard" class="icon-xs"></i> ${rtl ? "نسخ" : "Copy"}
    </button>
  </div>
  ${validUntil ? `<div class="promo-card__terms">${rtl ? "ينتهي: " : "Expires: "}${validUntil}</div>` : ""}
</div>`;
  },

  _loyaltyBanner(customer, cfg, rtl) {
    const pts = customer.loyaltyPoints || 0;
    const tier = customer.loyaltyTier || "bronze";
    const tierLabels = { bronze: rtl ? "برونزي" : "Bronze", silver: rtl ? "فضي" : "Silver", gold: rtl ? "ذهبي" : "Gold", platinum: rtl ? "بلاتيني" : "Platinum" };
    const tierIcons = { bronze: '<i data-lucide="medal" class="icon-md"></i>', silver: '<i data-lucide="medal" class="icon-md"></i>', gold: '<i data-lucide="trophy" class="icon-md"></i>', platinum: '<i data-lucide="gem" class="icon-md"></i>' };
    const nextTierPts = { bronze: 500, silver: 1500, gold: 5000, platinum: null };
    const next = nextTierPts[tier];
    const pct = next ? Math.min(100, Math.round((pts / next) * 100)) : 100;

    return `
<div class="loyalty-banner offers-loyalty-banner-spacing">
  <div class="loyalty-banner__header">
    <div class="offers-loyalty-info">
      <span class="offers-loyalty-tier-icon">${tierIcons[tier] || '<i data-lucide="medal" class="icon-md"></i>'}</span>
      <div>
        <div class="offers-loyalty-tier-label">${tierLabels[tier] || tier} ${rtl ? "مستوى" : "Tier"}</div>
        <div class="offers-loyalty-customer-name">${customer.name || ""}</div>
      </div>
    </div>
    <div class="offers-loyalty-points-col">
      <div class="offers-loyalty-points-value">${pts.toLocaleString()}</div>
      <div class="offers-loyalty-points-label">${rtl ? "نقطة" : "points"}</div>
    </div>
  </div>
  ${next ? `
  <div class="offers-loyalty-progress-wrap">
    <div class="offers-loyalty-progress-labels">
      <span>${pts.toLocaleString()} ${rtl ? "نقطة" : "pts"}</span>
      <span>${next.toLocaleString()} ${rtl ? "للمستوى التالي" : "for next tier"}</span>
    </div>
    <div class="offers-loyalty-progress-track">
      <div class="offers-loyalty-progress-bar" style="width:${pct}%"></div>
    </div>
  </div>` : `<div class="offers-loyalty-max-tier"><i data-lucide="crown" class="icon-sm"></i> ${rtl ? "أنت في أعلى مستوى!" : "You've reached the highest tier!"}</div>`}
</div>`;
  },

  _loginBanner(rtl) {
    return `
<div class="login-prompt-card offers-login-card">
  <div class="offers-login-icon-wrap"><i data-lucide="star" class="icon-xl"></i></div>
  <h3 class="offers-login-heading">${rtl ? "سجّل دخولك لعرض نقاطك" : "Sign in to view your points"}</h3>
  <p class="offers-login-desc">${rtl ? "اكسب نقاط مع كل طلب واستبدلها بخصومات" : "Earn points with every order and redeem for discounts"}</p>
  <button class="btn btn-primary" onclick="router.navigate('login')">${rtl ? "تسجيل الدخول" : "Sign in"}</button>
</div>`;
  },

  _bindEvents() {
    // Copy buttons via delegation — already wired via onclick attributes
    // Animate progress bar on render
    const bar = document.querySelector(".offers-loyalty-progress-bar");
    if (bar) {
      bar.style.width = "0";
      requestAnimationFrame(() => requestAnimationFrame(() => { bar.style.width = bar.dataset.pct || bar.style.width; }));
    }
  },

  _copyCode(code, btn) {
    if (!code) return;
    navigator.clipboard.writeText(code).then(() => {
      const rtl = isRtl();
      const original = btn.innerHTML;
      btn.innerHTML = `<i data-lucide="check" class="icon-xs"></i> ${rtl ? "تم النسخ" : "Copied!"}`;
      btn.disabled = true;
      showToast(rtl ? `تم نسخ الكود: ${code}` : `Code copied: ${code}`, "success");
      setTimeout(() => { btn.innerHTML = original; btn.disabled = false; }, 2000);
    }).catch(() => {
      // Fallback for older browsers
      const el = document.createElement("textarea");
      el.value = code;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      showToast(isRtl() ? `تم نسخ الكود: ${code}` : `Code copied: ${code}`, "success");
    });
  },

  _shareReferral(code, name) {
    const cfg = window.DELIVERY_CONFIG || {};
    const slug = cfg.slug || "";
    const storeName = cfg.storeName || "the store";
    const rtl = isRtl();
    const trackUrl = `${location.origin}/order/${slug}?ref=${code}`;
    const text = rtl
      ? `مرحبا! جرّب ${storeName} واستمتع بخصم على أول طلب. استخدم كود الإحالة: ${code} أو اطلب من هنا: ${trackUrl}`
      : `Hey! Try ${storeName} and get a discount on your first order. Use my referral code: ${code} or order here: ${trackUrl}`;

    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;

    if (navigator.share) {
      navigator.share({ title: storeName, text, url: trackUrl }).catch(() => window.open(waUrl, "_blank"));
    } else {
      window.open(waUrl, "_blank");
    }
  },
};
