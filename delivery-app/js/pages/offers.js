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
  <div class="offers-hero" style="min-height:180px;display:flex;align-items:center;justify-content:center">
    <div class="loading-spinner" style="border-color:rgba(255,255,255,0.3);border-top-color:#fff"></div>
  </div>
  <div style="padding:var(--space-xl) var(--space-md)">
    ${[0,1,2].map(() => `<div class="skeleton" style="height:120px;border-radius:var(--radius-xl);margin-bottom:var(--space-md)"></div>`).join("")}
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
      <div style="font-size:3rem;margin-bottom:var(--space-sm)">🎁</div>
      <h1 class="offers-hero__title">${rtl ? "العروض والخصومات" : "Deals & Offers"}</h1>
      <p class="offers-hero__sub">${rtl ? "وفّر أكثر مع كل طلب" : "Save more with every order"}</p>
    </div>
  </div>

  <div class="page-body" style="max-width:var(--page-max);margin:0 auto;padding:var(--space-xl) var(--space-md)">

    <!-- Loyalty Banner (if logged in) -->
    ${customer ? pages.offers._loyaltyBanner(customer, cfg, rtl) : pages.offers._loginBanner(rtl)}

    <!-- Active Promo Codes -->
    ${promos.length > 0 ? `
    <section style="margin-bottom:var(--space-2xl)">
      <h2 class="section-title" style="margin-bottom:var(--space-lg)">${rtl ? "كودات الخصم" : "Promo Codes"}</h2>
      <div class="promos-grid">
        ${promos.map(p => pages.offers._promoCard(p, rtl, cfg)).join("")}
      </div>
    </section>` : ""}

    <!-- Welcome offer -->
    <section style="margin-bottom:var(--space-2xl)">
      <h2 class="section-title" style="margin-bottom:var(--space-lg)">${rtl ? "عرض الترحيب" : "Welcome Offer"}</h2>
      <div class="promo-card promo-card--featured">
        <div class="promo-card__badge">${rtl ? "عرض الأعضاء الجدد" : "New member offer"}</div>
        <div class="promo-card__body">
          <div class="promo-card__icon">🎉</div>
          <div>
            <div class="promo-card__name">${rtl ? "خصم 10% على أول طلب" : "10% off your first order"}</div>
            <div class="promo-card__desc">${rtl ? "صالح لمدة 30 يوم من التسجيل" : "Valid for 30 days from registration"}</div>
          </div>
        </div>
        <div class="promo-card__code-row">
          <span class="promo-code-display">WELCOME10</span>
          <button class="copy-btn" data-code="WELCOME10" onclick="pages.offers._copyCode('WELCOME10', this)">
            📋 ${rtl ? "نسخ" : "Copy"}
          </button>
        </div>
        <div class="promo-card__terms">${rtl ? "الحد الأدنى للطلب: " : "Min. order: "}${formatCurrency(50, (window.DELIVERY_CONFIG || {}).currency)} · ${rtl ? "مرة واحدة فقط" : "One-time use"}</div>
      </div>
    </section>

    <!-- Referral Program -->
    ${customer ? `
    <section style="margin-bottom:var(--space-2xl)">
      <h2 class="section-title" style="margin-bottom:var(--space-lg)">${rtl ? "برنامج الإحالة" : "Refer & Earn"}</h2>
      <div class="referral-card">
        <div class="referral-card__inner">
          <div class="referral-card__icon">🤝</div>
          <div class="referral-card__content">
            <h3>${rtl ? "ادعُ أصدقاءك واكسب نقاطاً" : "Invite friends, earn points"}</h3>
            <p>${rtl ? "شارك كودك واحصل على 50 نقطة لكل صديق يطلب أول مرة" : "Share your code and earn 50 points for every friend's first order"}</p>
            <div class="referral-code-box">
              <span class="referral-code">${customer.referralCode || "REF" + (customer.id || "").toString().padStart(6, "0")}</span>
              <button class="copy-btn copy-btn--light" onclick="pages.offers._copyCode('${customer.referralCode || ""}', this)">
                📋 ${rtl ? "نسخ" : "Copy"}
              </button>
            </div>
            <button class="btn btn-outline btn-sm" style="margin-top:var(--space-md);background:rgba(255,255,255,0.15);border-color:rgba(255,255,255,0.4);color:#fff" onclick="pages.offers._shareReferral('${customer.referralCode || ""}', '${customer.name || ""}')">
              🔗 ${rtl ? "شارك عبر الواتساب" : "Share via WhatsApp"}
            </button>
          </div>
        </div>
      </div>
    </section>` : ""}

    <!-- How it works -->
    <section style="margin-bottom:var(--space-2xl)">
      <h2 class="section-title" style="margin-bottom:var(--space-lg)">${rtl ? "كيف يعمل البرنامج؟" : "How it works"}</h2>
      <div class="how-it-works">
        ${[
          { icon: "📱", title: rtl ? "سجّل أو سجّل دخولك" : "Sign up or log in", desc: rtl ? "أنشئ حسابك مجاناً في دقيقة" : "Create your free account in a minute" },
          { icon: "🛍️", title: rtl ? "اطلب واكسب نقاطاً" : "Order & earn points", desc: rtl ? "كل طلب يمنحك نقاط ولاء" : "Every order earns you loyalty points" },
          { icon: "🎁", title: rtl ? "استبدل نقاطك بخصومات" : "Redeem for discounts", desc: rtl ? "استخدم نقاطك لتوفير المال" : "Use your points to save on orders" },
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
    <section style="margin-bottom:var(--space-2xl)">
      <h2 class="section-title" style="margin-bottom:var(--space-lg)">${rtl ? "مستويات الولاء" : "Loyalty Tiers"}</h2>
      <div class="tiers-grid">
        ${[
          { tier: "bronze",   icon: "🥉", label: rtl ? "برونزي"   : "Bronze",   pts: "0",     perks: rtl ? "1 نقطة لكل جنيه"          : "1 pt per unit spent" },
          { tier: "silver",   icon: "🥈", label: rtl ? "فضي"      : "Silver",   pts: "500",   perks: rtl ? "1.5 نقطة + أولوية الدعم"  : "1.5x pts + priority support" },
          { tier: "gold",     icon: "🥇", label: rtl ? "ذهبي"     : "Gold",     pts: "1500",  perks: rtl ? "2 نقطة + توصيل مجاني"     : "2x pts + free delivery" },
          { tier: "platinum", icon: "💎", label: rtl ? "بلاتيني"  : "Platinum", pts: "5000",  perks: rtl ? "3 نقطة + خصومات حصرية"    : "3x pts + exclusive deals" },
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
    <div class="promo-card__icon">${isFreeDelivery ? "🚴" : isPercent ? "🏷️" : "💰"}</div>
    <div>
      <div class="promo-card__name">${promo.description || discLabel}</div>
      ${promo.minOrderAmount ? `<div class="promo-card__desc">${rtl ? "الحد الأدنى: " : "Min. order: "}${formatCurrency(promo.minOrderAmount, cfg.currency)}</div>` : ""}
    </div>
  </div>
  <div class="promo-card__code-row">
    <span class="promo-code-display">${promo.code}</span>
    <button class="copy-btn" data-code="${promo.code}" onclick="pages.offers._copyCode('${promo.code}', this)">
      📋 ${rtl ? "نسخ" : "Copy"}
    </button>
  </div>
  ${validUntil ? `<div class="promo-card__terms">${rtl ? "ينتهي: " : "Expires: "}${validUntil}</div>` : ""}
</div>`;
  },

  _loyaltyBanner(customer, cfg, rtl) {
    const pts = customer.loyaltyPoints || 0;
    const tier = customer.loyaltyTier || "bronze";
    const tierLabels = { bronze: rtl ? "برونزي" : "Bronze", silver: rtl ? "فضي" : "Silver", gold: rtl ? "ذهبي" : "Gold", platinum: rtl ? "بلاتيني" : "Platinum" };
    const tierIcons = { bronze: "🥉", silver: "🥈", gold: "🥇", platinum: "💎" };
    const nextTierPts = { bronze: 500, silver: 1500, gold: 5000, platinum: null };
    const next = nextTierPts[tier];
    const pct = next ? Math.min(100, Math.round((pts / next) * 100)) : 100;

    return `
<div class="loyalty-banner" style="margin-bottom:var(--space-2xl)">
  <div class="loyalty-banner__header">
    <div style="display:flex;align-items:center;gap:var(--space-sm)">
      <span style="font-size:1.5rem">${tierIcons[tier] || "🥉"}</span>
      <div>
        <div style="font-weight:700;font-size:1rem">${tierLabels[tier] || tier} ${rtl ? "مستوى" : "Tier"}</div>
        <div style="font-size:0.8rem;opacity:0.8">${customer.name || ""}</div>
      </div>
    </div>
    <div style="text-align:${rtl ? "left" : "right"}">
      <div style="font-size:1.5rem;font-weight:800;color:var(--delivery-primary)">${pts.toLocaleString()}</div>
      <div style="font-size:0.75rem;opacity:0.7">${rtl ? "نقطة" : "points"}</div>
    </div>
  </div>
  ${next ? `
  <div style="margin-top:var(--space-md)">
    <div style="display:flex;justify-content:space-between;font-size:0.75rem;margin-bottom:6px;opacity:0.8">
      <span>${pts.toLocaleString()} ${rtl ? "نقطة" : "pts"}</span>
      <span>${next.toLocaleString()} ${rtl ? "للمستوى التالي" : "for next tier"}</span>
    </div>
    <div style="background:var(--delivery-border);border-radius:99px;height:6px;overflow:hidden">
      <div style="height:100%;width:${pct}%;background:var(--delivery-primary);border-radius:99px;transition:width 0.6s ease"></div>
    </div>
  </div>` : `<div style="text-align:center;margin-top:var(--space-sm);font-size:0.85rem;opacity:0.9">👑 ${rtl ? "أنت في أعلى مستوى!" : "You've reached the highest tier!"}</div>`}
</div>`;
  },

  _loginBanner(rtl) {
    return `
<div class="login-prompt-card" style="margin-bottom:var(--space-2xl);padding:var(--space-xl);background:var(--delivery-surface);border-radius:var(--radius-xl);border:2px dashed var(--delivery-border);text-align:center">
  <div style="font-size:2rem;margin-bottom:var(--space-sm)">⭐</div>
  <h3 style="margin-bottom:var(--space-xs)">${rtl ? "سجّل دخولك لعرض نقاطك" : "Sign in to view your points"}</h3>
  <p style="color:var(--delivery-text-secondary);font-size:0.9rem;margin-bottom:var(--space-md)">${rtl ? "اكسب نقاط مع كل طلب واستبدلها بخصومات" : "Earn points with every order and redeem for discounts"}</p>
  <button class="btn btn-primary" onclick="router.navigate('login')">${rtl ? "تسجيل الدخول" : "Sign in"}</button>
</div>`;
  },

  _bindEvents() {
    // Copy buttons via delegation — already wired via onclick attributes
    // Animate progress bar on render
    const bar = document.querySelector(".loyalty-banner [style*='transition']");
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
      btn.innerHTML = `✅ ${rtl ? "تم النسخ" : "Copied!"}`;
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
