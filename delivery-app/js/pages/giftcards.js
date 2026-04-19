/**
 * giftcards.js — Gift Cards page (Just Eat style)
 */
window.pages = window.pages || {};

pages.giftcards = {
  render(params, container) {
    var cfg = window.DELIVERY_CONFIG || {};
    var rtl = isRtl();
    var currency = cfg.currency || "CHF";

    var amounts = [25, 50, 75, 100];
    var designs = [
      { name: rtl ? "عيد ميلاد سعيد" : "Happy Birthday", icon: "cake", gradient: "linear-gradient(135deg, #FF6B6B, #FF8E53)" },
      { name: rtl ? "شكراً لك" : "Thank You", icon: "heart", gradient: "linear-gradient(135deg, #4ECDC4, #44B09E)" },
      { name: rtl ? "تهانينا" : "Congratulations", icon: "party-popper", gradient: "linear-gradient(135deg, #A18CD1, #FBC2EB)" },
      { name: rtl ? "بالشفاء العاجل" : "Get Well Soon", icon: "flower-2", gradient: "linear-gradient(135deg, #89CFF0, #667EEA)" },
      { name: rtl ? "عيد سعيد" : "Happy Holidays", icon: "snowflake", gradient: "linear-gradient(135deg, #1A1A2E, #2d1b4e)" },
      { name: rtl ? "مجرد هدية" : "Just Because", icon: "gift", gradient: "linear-gradient(135deg, #FF5722, #FF9800)" }
    ];

    var designCards = designs.map(function(d, i) {
      return `
        <button class="gift-design ${i === 0 ? 'gift-design--active' : ''}" onclick="pages.giftcards._selectDesign(this, ${i})" style="background:${d.gradient}">
          <i data-lucide="${d.icon}" class="icon-xl"></i>
          <span>${d.name}</span>
        </button>`;
    }).join("");

    var amountBtns = amounts.map(function(a, i) {
      return `<button class="gift-amount ${i === 1 ? 'gift-amount--active' : ''}" onclick="pages.giftcards._selectAmount(this, ${a})">${currency} ${a}</button>`;
    }).join("");

    container.innerHTML = `
<div class="info-page">
  <div class="top-bar top-bar--sticky">
    <button class="top-bar__icon" onclick="history.back()">${rtl ? "›" : "‹"}</button>
    <span class="top-bar__title">${rtl ? "بطاقات الهدايا" : "Gift Cards"}</span>
  </div>

  <!-- Hero -->
  <div class="giftcards-hero">
    <div class="giftcards-hero__icon"><i data-lucide="gift" class="icon-3xl"></i></div>
    <h1 class="giftcards-hero__title">${rtl ? "أهدِ متعة الطعام" : "Give the gift of food"}</h1>
    <p class="giftcards-hero__sub">${rtl ? "أرسل بطاقة هدية لأصدقائك وعائلتك" : "Send a gift card to friends and family"}</p>
  </div>

  <!-- Choose design -->
  <div class="info-section">
    <h2 class="info-section__title">${rtl ? "اختر التصميم" : "Choose a design"}</h2>
    <div class="gift-designs">${designCards}</div>
  </div>

  <!-- Choose amount -->
  <div class="info-section">
    <h2 class="info-section__title">${rtl ? "اختر المبلغ" : "Choose an amount"}</h2>
    <div class="gift-amounts">${amountBtns}</div>
    <div class="gift-custom-amount">
      <label>${rtl ? "أو أدخل مبلغاً مخصصاً" : "Or enter a custom amount"}</label>
      <div class="gift-custom-input">
        <span class="gift-custom-input__currency">${currency}</span>
        <input type="number" min="10" max="500" placeholder="0" class="gift-custom-input__field" oninput="pages.giftcards._customAmount(this)">
      </div>
    </div>
  </div>

  <!-- Recipient -->
  <div class="info-section">
    <h2 class="info-section__title">${rtl ? "تفاصيل المستلم" : "Recipient details"}</h2>
    <div class="gift-form">
      <div class="gift-form__field">
        <label>${rtl ? "اسم المستلم" : "Recipient name"}</label>
        <input type="text" placeholder="${rtl ? "أدخل الاسم" : "Enter name"}" class="gift-input">
      </div>
      <div class="gift-form__field">
        <label>${rtl ? "البريد الإلكتروني" : "Email address"}</label>
        <input type="email" placeholder="${rtl ? "أدخل البريد الإلكتروني" : "Enter email"}" class="gift-input">
      </div>
      <div class="gift-form__field">
        <label>${rtl ? "رسالة شخصية (اختياري)" : "Personal message (optional)"}</label>
        <textarea rows="3" placeholder="${rtl ? "أضف رسالة..." : "Add a message..."}" class="gift-input gift-textarea"></textarea>
      </div>
    </div>
  </div>

  <!-- Preview -->
  <div class="info-section">
    <h2 class="info-section__title">${rtl ? "معاينة" : "Preview"}</h2>
    <div class="gift-preview" id="giftPreview">
      <div class="gift-preview__card" style="background:${designs[0].gradient}">
        <div class="gift-preview__logo">Barmagly</div>
        <div class="gift-preview__icon"><i data-lucide="${designs[0].icon}" class="icon-2xl"></i></div>
        <div class="gift-preview__amount">${currency} 50</div>
        <div class="gift-preview__label">${designs[0].name}</div>
      </div>
    </div>
  </div>

  <!-- Buy button -->
  <div class="info-section" style="text-align:center; padding-bottom: var(--space-2xl);">
    <button class="btn btn-primary btn-lg" onclick="pages.giftcards._purchase()">
      <i data-lucide="credit-card" class="icon-sm"></i>
      ${rtl ? "شراء بطاقة الهدية" : "Purchase Gift Card"} — ${currency} 50
    </button>
  </div>

  <!-- Redeem section -->
  <div class="info-section giftcards-redeem">
    <h2 class="info-section__title">${rtl ? "هل لديك بطاقة هدية؟" : "Have a gift card?"}</h2>
    <p>${rtl ? "أدخل رمز بطاقة الهدية لإضافة الرصيد إلى حسابك" : "Enter your gift card code to add credit to your account"}</p>
    <div class="gift-redeem-form">
      <input type="text" placeholder="${rtl ? "أدخل رمز البطاقة" : "Enter card code"}" class="gift-input gift-redeem-input" maxlength="16">
      <button class="btn btn-outline">${rtl ? "استبدال" : "Redeem"}</button>
    </div>
  </div>

  <div class="home-spacer"></div>
</div>`;
    if (window.lucide) window.lucide.createIcons();
  },

  _selectedDesign: 0,
  _selectedAmount: 50,

  _selectDesign(btn, index) {
    document.querySelectorAll(".gift-design").forEach(function(b) { b.classList.remove("gift-design--active"); });
    btn.classList.add("gift-design--active");
    this._selectedDesign = index;
  },

  _selectAmount(btn, amount) {
    document.querySelectorAll(".gift-amount").forEach(function(b) { b.classList.remove("gift-amount--active"); });
    btn.classList.add("gift-amount--active");
    this._selectedAmount = amount;
    var customInput = document.querySelector(".gift-custom-input__field");
    if (customInput) customInput.value = "";
  },

  _customAmount(input) {
    var val = parseInt(input.value);
    if (val >= 10) {
      document.querySelectorAll(".gift-amount").forEach(function(b) { b.classList.remove("gift-amount--active"); });
      this._selectedAmount = val;
    }
  },

  _purchase() {
    var rtl = isRtl();
    alert(rtl ? "ستتوفر هذه الخاصية قريباً!" : "Coming soon! Gift card purchases will be available shortly.");
  }
};
