/**
 * courier.js — Become a Courier page (Just Eat style)
 */
window.pages = window.pages || {};

pages.courier = {
  render(params, container) {
    var cfg = window.DELIVERY_CONFIG || {};
    var rtl = isRtl();

    container.innerHTML = `
<div class="info-page">
  <div class="top-bar top-bar--sticky">
    <button class="top-bar__icon" onclick="history.back()">${rtl ? "›" : "‹"}</button>
    <span class="top-bar__title">${rtl ? "كن سائقاً" : "Become a Courier"}</span>
  </div>

  <!-- Hero -->
  <div class="courier-hero">
    <div class="courier-hero__icon"><i data-lucide="bike" class="icon-3xl"></i></div>
    <h1 class="courier-hero__title">${rtl ? "اربح المال كسائق توصيل" : "Earn money as a delivery courier"}</h1>
    <p class="courier-hero__sub">${rtl ? "اعمل بمرونة واربح حسب جدولك الخاص" : "Flexible hours, earn on your own schedule"}</p>
    <button class="btn btn-primary btn-lg" onclick="pages.courier._scrollToForm()">
      <i data-lucide="clipboard-check" class="icon-sm"></i>
      ${rtl ? "سجل الآن" : "Apply Now"}
    </button>
  </div>

  <!-- Benefits -->
  <div class="info-section">
    <h2 class="info-section__title">${rtl ? "لماذا تنضم إلينا؟" : "Why deliver with us?"}</h2>
    <div class="courier-benefits">
      <div class="courier-benefit">
        <div class="courier-benefit__icon"><i data-lucide="clock" class="icon-xl"></i></div>
        <h3>${rtl ? "ساعات مرنة" : "Flexible hours"}</h3>
        <p>${rtl ? "اعمل متى تريد. لا التزامات ولا جدول محدد" : "Work when you want. No commitments, no fixed schedule"}</p>
      </div>
      <div class="courier-benefit">
        <div class="courier-benefit__icon"><i data-lucide="wallet" class="icon-xl"></i></div>
        <h3>${rtl ? "أرباح تنافسية" : "Competitive earnings"}</h3>
        <p>${rtl ? "اربح لكل توصيل بالإضافة إلى الإكراميات. دفع أسبوعي" : "Earn per delivery plus tips. Weekly payouts"}</p>
      </div>
      <div class="courier-benefit">
        <div class="courier-benefit__icon"><i data-lucide="shield-check" class="icon-xl"></i></div>
        <h3>${rtl ? "تأمين وحماية" : "Insurance & support"}</h3>
        <p>${rtl ? "تغطية تأمينية أثناء التوصيل ودعم على مدار الساعة" : "Insurance coverage during deliveries and 24/7 support"}</p>
      </div>
      <div class="courier-benefit">
        <div class="courier-benefit__icon"><i data-lucide="trending-up" class="icon-xl"></i></div>
        <h3>${rtl ? "مكافآت ومحفزات" : "Bonuses & incentives"}</h3>
        <p>${rtl ? "اربح مكافآت إضافية في أوقات الذروة والعطلات" : "Earn extra bonuses during peak hours and holidays"}</p>
      </div>
    </div>
  </div>

  <!-- How it works -->
  <div class="info-section">
    <h2 class="info-section__title">${rtl ? "كيف تبدأ؟" : "How to get started"}</h2>
    <div class="info-steps">
      <div class="info-step">
        <div class="info-step__num">1</div>
        <div class="info-step__icon"><i data-lucide="file-text" class="icon-xl"></i></div>
        <h3>${rtl ? "قدم طلبك" : "Apply"}</h3>
        <p>${rtl ? "املأ النموذج أدناه" : "Fill in the form below"}</p>
      </div>
      <div class="info-step">
        <div class="info-step__num">2</div>
        <div class="info-step__icon"><i data-lucide="check-circle" class="icon-xl"></i></div>
        <h3>${rtl ? "احصل على الموافقة" : "Get approved"}</h3>
        <p>${rtl ? "نراجع طلبك خلال 48 ساعة" : "We review your application within 48 hours"}</p>
      </div>
      <div class="info-step">
        <div class="info-step__num">3</div>
        <div class="info-step__icon"><i data-lucide="rocket" class="icon-xl"></i></div>
        <h3>${rtl ? "ابدأ التوصيل" : "Start delivering"}</h3>
        <p>${rtl ? "حمّل التطبيق وابدأ بقبول الطلبات" : "Download the app and start accepting orders"}</p>
      </div>
    </div>
  </div>

  <!-- Requirements -->
  <div class="info-section">
    <h2 class="info-section__title">${rtl ? "المتطلبات" : "Requirements"}</h2>
    <div class="courier-requirements">
      <div class="courier-req">
        <i data-lucide="check" class="icon-sm"></i>
        <span>${rtl ? "العمر 18 سنة أو أكثر" : "Age 18 or older"}</span>
      </div>
      <div class="courier-req">
        <i data-lucide="check" class="icon-sm"></i>
        <span>${rtl ? "رخصة قيادة سارية (للسيارات/الدراجات النارية)" : "Valid driving license (for car/motorbike)"}</span>
      </div>
      <div class="courier-req">
        <i data-lucide="check" class="icon-sm"></i>
        <span>${rtl ? "هاتف ذكي مع اتصال بالإنترنت" : "Smartphone with internet connection"}</span>
      </div>
      <div class="courier-req">
        <i data-lucide="check" class="icon-sm"></i>
        <span>${rtl ? "تصريح عمل ساري" : "Valid work permit"}</span>
      </div>
      <div class="courier-req">
        <i data-lucide="check" class="icon-sm"></i>
        <span>${rtl ? "حقيبة توصيل (نوفرها عند التسجيل)" : "Delivery bag (provided upon signup)"}</span>
      </div>
    </div>
  </div>

  <!-- Earnings calculator -->
  <div class="info-section">
    <h2 class="info-section__title">${rtl ? "حاسبة الأرباح" : "Earnings calculator"}</h2>
    <div class="courier-calculator">
      <div class="courier-calc__row">
        <label>${rtl ? "عدد التوصيلات يومياً" : "Deliveries per day"}</label>
        <div class="courier-calc__slider">
          <input type="range" min="5" max="30" value="15" oninput="pages.courier._calcEarnings(this.value)">
          <span class="courier-calc__value" id="calcDeliveries">15</span>
        </div>
      </div>
      <div class="courier-calc__row">
        <label>${rtl ? "أيام العمل أسبوعياً" : "Days per week"}</label>
        <div class="courier-calc__slider">
          <input type="range" min="1" max="7" value="5" oninput="pages.courier._calcEarnings(null, this.value)">
          <span class="courier-calc__value" id="calcDays">5</span>
        </div>
      </div>
      <div class="courier-calc__result">
        <div class="courier-calc__label">${rtl ? "الأرباح الأسبوعية التقديرية" : "Estimated weekly earnings"}</div>
        <div class="courier-calc__amount" id="calcAmount">CHF 750</div>
        <p class="courier-calc__note">${rtl ? "* الأرقام تقديرية وتعتمد على المنطقة وأوقات العمل" : "* Estimates vary based on area and working hours"}</p>
      </div>
    </div>
  </div>

  <!-- Application form -->
  <div class="info-section" id="courierForm">
    <h2 class="info-section__title">${rtl ? "نموذج التسجيل" : "Application form"}</h2>
    <div class="courier-form">
      <div class="gift-form__field">
        <label>${rtl ? "الاسم الكامل" : "Full name"}</label>
        <input type="text" placeholder="${rtl ? "أدخل اسمك" : "Enter your name"}" class="gift-input">
      </div>
      <div class="gift-form__field">
        <label>${rtl ? "البريد الإلكتروني" : "Email"}</label>
        <input type="email" placeholder="${rtl ? "أدخل بريدك الإلكتروني" : "Enter your email"}" class="gift-input">
      </div>
      <div class="gift-form__field">
        <label>${rtl ? "رقم الهاتف" : "Phone number"}</label>
        <input type="tel" placeholder="+41" class="gift-input">
      </div>
      <div class="gift-form__field">
        <label>${rtl ? "المدينة" : "City"}</label>
        <input type="text" placeholder="${rtl ? "مدينتك" : "Your city"}" class="gift-input">
      </div>
      <div class="gift-form__field">
        <label>${rtl ? "وسيلة النقل" : "Vehicle type"}</label>
        <div class="courier-vehicles">
          <button class="courier-vehicle courier-vehicle--active" onclick="pages.courier._selectVehicle(this)">
            <i data-lucide="bike" class="icon-lg"></i>
            <span>${rtl ? "دراجة" : "Bicycle"}</span>
          </button>
          <button class="courier-vehicle" onclick="pages.courier._selectVehicle(this)">
            <i data-lucide="zap" class="icon-lg"></i>
            <span>${rtl ? "سكوتر" : "E-Scooter"}</span>
          </button>
          <button class="courier-vehicle" onclick="pages.courier._selectVehicle(this)">
            <i data-lucide="car" class="icon-lg"></i>
            <span>${rtl ? "سيارة" : "Car"}</span>
          </button>
        </div>
      </div>
      <button class="btn btn-primary btn-lg btn-block" onclick="pages.courier._submit()">
        ${rtl ? "أرسل الطلب" : "Submit Application"}
      </button>
    </div>
  </div>

  <div class="home-spacer"></div>
</div>`;
    if (window.lucide) window.lucide.createIcons();
  },

  _deliveries: 15,
  _days: 5,

  _scrollToForm() {
    var form = document.getElementById("courierForm");
    if (form) form.scrollIntoView({ behavior: "smooth" });
  },

  _calcEarnings(deliveries, days) {
    if (deliveries) this._deliveries = parseInt(deliveries);
    if (days) this._days = parseInt(days);
    var el1 = document.getElementById("calcDeliveries");
    var el2 = document.getElementById("calcDays");
    var el3 = document.getElementById("calcAmount");
    if (el1) el1.textContent = this._deliveries;
    if (el2) el2.textContent = this._days;
    var weekly = this._deliveries * this._days * 10; // CHF 10 avg per delivery
    if (el3) el3.textContent = "CHF " + weekly.toLocaleString("de-CH");
  },

  _selectVehicle(btn) {
    document.querySelectorAll(".courier-vehicle").forEach(function(b) { b.classList.remove("courier-vehicle--active"); });
    btn.classList.add("courier-vehicle--active");
  },

  _submit() {
    var rtl = isRtl();
    alert(rtl ? "شكراً! سنتواصل معك قريباً" : "Thank you! We'll be in touch soon.");
  }
};
