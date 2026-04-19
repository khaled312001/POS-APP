/**
 * stamps.js — Stamp Cards page (Just Eat style)
 */
window.pages = window.pages || {};

pages.stamps = {
  render(params, container) {
    var cfg = window.DELIVERY_CONFIG || {};
    var rtl = isRtl();
    var customer = auth.getCustomer();

    // Demo stamp cards
    var cards = [
      {
        id: 1,
        restaurant: "Barmagly",
        reward: rtl ? "وجبة مجانية" : "Free meal",
        total: 10,
        collected: customer ? 7 : 0,
        icon: "pizza",
        color: "#FF5722"
      },
      {
        id: 2,
        restaurant: "Burger Factory",
        reward: rtl ? "برجر مجاني" : "Free burger",
        total: 8,
        collected: customer ? 3 : 0,
        icon: "beef",
        color: "#8B4513"
      },
      {
        id: 3,
        restaurant: "Sushi Zen",
        reward: rtl ? "طبق سوشي مجاني" : "Free sushi platter",
        total: 12,
        collected: customer ? 5 : 0,
        icon: "fish",
        color: "#E91E63"
      },
      {
        id: 4,
        restaurant: "The Grill House",
        reward: rtl ? "مشويات مجانية" : "Free grill combo",
        total: 10,
        collected: customer ? 1 : 0,
        icon: "flame",
        color: "#FF9800"
      }
    ];

    function renderStamps(card) {
      var stamps = "";
      for (var i = 0; i < card.total; i++) {
        if (i < card.collected) {
          stamps += '<div class="stamp stamp--collected"><i data-lucide="check" class="icon-sm"></i></div>';
        } else if (i === card.total - 1) {
          stamps += '<div class="stamp stamp--reward"><i data-lucide="gift" class="icon-sm"></i></div>';
        } else {
          stamps += '<div class="stamp stamp--empty"><i data-lucide="' + card.icon + '" class="icon-sm"></i></div>';
        }
      }
      return stamps;
    }

    var cardsHtml = cards.map(function(card) {
      var progress = Math.round((card.collected / card.total) * 100);
      return `
        <div class="stamp-card" style="--stamp-color: ${card.color}">
          <div class="stamp-card__header">
            <div class="stamp-card__restaurant">
              <i data-lucide="store" class="icon-md" style="color:${card.color}"></i>
              <span>${card.restaurant}</span>
            </div>
            <div class="stamp-card__progress">${card.collected}/${card.total}</div>
          </div>
          <div class="stamp-card__reward">
            <i data-lucide="gift" class="icon-sm"></i>
            ${rtl ? "المكافأة:" : "Reward:"} ${card.reward}
          </div>
          <div class="stamp-card__grid">
            ${renderStamps(card)}
          </div>
          <div class="stamp-card__bar">
            <div class="stamp-card__bar-fill" style="width:${progress}%"></div>
          </div>
          <p class="stamp-card__hint">${rtl ? `اطلب ${card.total - card.collected} مرات أخرى للحصول على المكافأة` : `Order ${card.total - card.collected} more times to earn your reward`}</p>
        </div>`;
    }).join("");

    container.innerHTML = `
<div class="info-page">
  <div class="top-bar top-bar--sticky">
    <button class="top-bar__icon" onclick="history.back()">${rtl ? "›" : "‹"}</button>
    <span class="top-bar__title">${rtl ? "بطاقات الطوابع" : "Stamp Cards"}</span>
  </div>

  <!-- Hero -->
  <div class="stamps-hero">
    <div class="stamps-hero__icon"><i data-lucide="stamp" class="icon-3xl"></i></div>
    <h1 class="stamps-hero__title">${rtl ? "اجمع الطوابع واحصل على مكافآت" : "Collect stamps, earn rewards"}</h1>
    <p class="stamps-hero__sub">${rtl ? "اطلب من مطاعمك المفضلة واحصل على وجبات مجانية" : "Order from your favourite restaurants and get free meals"}</p>
    ${!customer ? `<button class="btn btn-primary" onclick="router.navigate('login')">${rtl ? "سجل دخولك للبدء" : "Sign in to start collecting"}</button>` : ""}
  </div>

  <!-- How it works -->
  <div class="info-section">
    <h2 class="info-section__title">${rtl ? "كيف يعمل؟" : "How it works"}</h2>
    <div class="info-steps">
      <div class="info-step">
        <div class="info-step__num">1</div>
        <div class="info-step__icon"><i data-lucide="shopping-bag" class="icon-xl"></i></div>
        <h3>${rtl ? "اطلب" : "Order"}</h3>
        <p>${rtl ? "اطلب من أي مطعم مشارك" : "Order from any participating restaurant"}</p>
      </div>
      <div class="info-step">
        <div class="info-step__num">2</div>
        <div class="info-step__icon"><i data-lucide="stamp" class="icon-xl"></i></div>
        <h3>${rtl ? "اجمع الطوابع" : "Collect Stamps"}</h3>
        <p>${rtl ? "احصل على طابع مع كل طلب" : "Get a stamp with every order"}</p>
      </div>
      <div class="info-step">
        <div class="info-step__num">3</div>
        <div class="info-step__icon"><i data-lucide="party-popper" class="icon-xl"></i></div>
        <h3>${rtl ? "احصل على المكافأة" : "Get Rewarded"}</h3>
        <p>${rtl ? "أكمل البطاقة واحصل على وجبة مجانية" : "Complete the card and get a free meal"}</p>
      </div>
    </div>
  </div>

  <!-- Stamp Cards -->
  <div class="info-section">
    <h2 class="info-section__title">${rtl ? "بطاقاتك" : "Your cards"}</h2>
    ${customer ? `<div class="stamp-cards">${cardsHtml}</div>` :
      `<div class="empty-state">
        <i data-lucide="stamp" class="icon-3xl"></i>
        <h3>${rtl ? "لا توجد بطاقات بعد" : "No stamp cards yet"}</h3>
        <p>${rtl ? "سجل دخولك وابدأ بجمع الطوابع" : "Sign in and start collecting stamps"}</p>
      </div>`}
  </div>

  <div class="home-spacer"></div>
</div>`;
    if (window.lucide) window.lucide.createIcons();
  }
};
