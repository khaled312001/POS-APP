/**
 * partner.js — Partner with Us / Barmagly for Business (Just Eat style)
 */
window.pages = window.pages || {};

pages.partner = {
  render(params, container) {
    var cfg = window.DELIVERY_CONFIG || {};
    var rtl = isRtl();

    container.innerHTML = `
<div class="info-page">
  <div class="top-bar top-bar--sticky">
    <button class="top-bar__icon" onclick="history.back()">${rtl ? "›" : "‹"}</button>
    <span class="top-bar__title">${rtl ? "شراكة معنا" : "Partner with Us"}</span>
  </div>

  <!-- Hero -->
  <div class="partner-hero">
    <div class="partner-hero__icon"><i data-lucide="handshake" class="icon-3xl"></i></div>
    <h1 class="partner-hero__title">${rtl ? "انمِّ مطعمك مع Barmagly" : "Grow your restaurant with Barmagly"}</h1>
    <p class="partner-hero__sub">${rtl ? "انضم إلى منصتنا واوصل طعامك لآلاف العملاء الجدد" : "Join our platform and reach thousands of new customers"}</p>
    <button class="btn btn-primary btn-lg" onclick="pages.partner._scrollToForm()">
      <i data-lucide="rocket" class="icon-sm"></i>
      ${rtl ? "سجّل مطعمك" : "Register your restaurant"}
    </button>
  </div>

  <!-- Stats -->
  <div class="info-section">
    <div class="partner-stats">
      <div class="partner-stat">
        <div class="partner-stat__number">10K+</div>
        <div class="partner-stat__label">${rtl ? "عميل نشط" : "Active customers"}</div>
      </div>
      <div class="partner-stat">
        <div class="partner-stat__number">500+</div>
        <div class="partner-stat__label">${rtl ? "مطعم شريك" : "Partner restaurants"}</div>
      </div>
      <div class="partner-stat">
        <div class="partner-stat__number">98%</div>
        <div class="partner-stat__label">${rtl ? "رضا الشركاء" : "Partner satisfaction"}</div>
      </div>
      <div class="partner-stat">
        <div class="partner-stat__number">30min</div>
        <div class="partner-stat__label">${rtl ? "متوسط التوصيل" : "Avg delivery time"}</div>
      </div>
    </div>
  </div>

  <!-- Benefits -->
  <div class="info-section">
    <h2 class="info-section__title">${rtl ? "لماذا Barmagly؟" : "Why Barmagly?"}</h2>
    <div class="partner-benefits">
      <div class="partner-benefit">
        <div class="partner-benefit__icon"><i data-lucide="users" class="icon-xl"></i></div>
        <h3>${rtl ? "الوصول لعملاء جدد" : "Reach new customers"}</h3>
        <p>${rtl ? "اعرض مطعمك لآلاف العملاء الجدد يومياً" : "Expose your restaurant to thousands of new customers daily"}</p>
      </div>
      <div class="partner-benefit">
        <div class="partner-benefit__icon"><i data-lucide="bar-chart-3" class="icon-xl"></i></div>
        <h3>${rtl ? "تحليلات مفصلة" : "Detailed analytics"}</h3>
        <p>${rtl ? "تتبع المبيعات والطلبات وسلوك العملاء" : "Track sales, orders, and customer behaviour"}</p>
      </div>
      <div class="partner-benefit">
        <div class="partner-benefit__icon"><i data-lucide="headphones" class="icon-xl"></i></div>
        <h3>${rtl ? "دعم مخصص" : "Dedicated support"}</h3>
        <p>${rtl ? "مدير حساب خاص ودعم فني على مدار الساعة" : "Dedicated account manager and 24/7 technical support"}</p>
      </div>
      <div class="partner-benefit">
        <div class="partner-benefit__icon"><i data-lucide="megaphone" class="icon-xl"></i></div>
        <h3>${rtl ? "تسويق مجاني" : "Free marketing"}</h3>
        <p>${rtl ? "ترويج مطعمك على منصتنا وشبكاتنا الاجتماعية" : "Promote your restaurant on our platform and social media"}</p>
      </div>
      <div class="partner-benefit">
        <div class="partner-benefit__icon"><i data-lucide="truck" class="icon-xl"></i></div>
        <h3>${rtl ? "خدمة توصيل متكاملة" : "Integrated delivery"}</h3>
        <p>${rtl ? "أسطول سائقين محترف مع تتبع مباشر" : "Professional driver fleet with real-time tracking"}</p>
      </div>
      <div class="partner-benefit">
        <div class="partner-benefit__icon"><i data-lucide="tablet-smartphone" class="icon-xl"></i></div>
        <h3>${rtl ? "نظام POS متكامل" : "Integrated POS"}</h3>
        <p>${rtl ? "اربط نظام نقاط البيع مع منصة التوصيل بسهولة" : "Connect your POS system with the delivery platform seamlessly"}</p>
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
        <h3>${rtl ? "سجّل" : "Register"}</h3>
        <p>${rtl ? "املأ نموذج التسجيل وأرسل مستنداتك" : "Fill in the registration form and submit your documents"}</p>
      </div>
      <div class="info-step">
        <div class="info-step__num">2</div>
        <div class="info-step__icon"><i data-lucide="settings" class="icon-xl"></i></div>
        <h3>${rtl ? "إعداد القائمة" : "Setup menu"}</h3>
        <p>${rtl ? "نساعدك في إعداد قائمتك وتصوير منتجاتك" : "We help set up your menu and photograph your products"}</p>
      </div>
      <div class="info-step">
        <div class="info-step__num">3</div>
        <div class="info-step__icon"><i data-lucide="store" class="icon-xl"></i></div>
        <h3>${rtl ? "افتح متجرك" : "Go live"}</h3>
        <p>${rtl ? "ابدأ باستقبال الطلبات وتنمية أعمالك" : "Start receiving orders and grow your business"}</p>
      </div>
    </div>
  </div>

  <!-- Pricing -->
  <div class="info-section">
    <h2 class="info-section__title">${rtl ? "الباقات والأسعار" : "Plans & pricing"}</h2>
    <div class="partner-plans">
      <div class="partner-plan">
        <div class="partner-plan__name">${rtl ? "أساسي" : "Starter"}</div>
        <div class="partner-plan__price">
          <span class="partner-plan__amount">0%</span>
          <span class="partner-plan__period">${rtl ? "أول 30 يوم" : "First 30 days"}</span>
        </div>
        <ul class="partner-plan__features">
          <li><i data-lucide="check" class="icon-sm"></i> ${rtl ? "قائمة رقمية" : "Digital menu"}</li>
          <li><i data-lucide="check" class="icon-sm"></i> ${rtl ? "لوحة تحكم أساسية" : "Basic dashboard"}</li>
          <li><i data-lucide="check" class="icon-sm"></i> ${rtl ? "دعم عبر البريد" : "Email support"}</li>
        </ul>
        <button class="btn btn-outline btn-block">${rtl ? "ابدأ مجاناً" : "Start free"}</button>
      </div>
      <div class="partner-plan partner-plan--popular">
        <div class="partner-plan__badge">${rtl ? "الأكثر شعبية" : "Most Popular"}</div>
        <div class="partner-plan__name">${rtl ? "احترافي" : "Professional"}</div>
        <div class="partner-plan__price">
          <span class="partner-plan__amount">15%</span>
          <span class="partner-plan__period">${rtl ? "لكل طلب" : "Per order"}</span>
        </div>
        <ul class="partner-plan__features">
          <li><i data-lucide="check" class="icon-sm"></i> ${rtl ? "كل ميزات الأساسي" : "All Starter features"}</li>
          <li><i data-lucide="check" class="icon-sm"></i> ${rtl ? "تحليلات متقدمة" : "Advanced analytics"}</li>
          <li><i data-lucide="check" class="icon-sm"></i> ${rtl ? "ترويج مميز" : "Featured promotion"}</li>
          <li><i data-lucide="check" class="icon-sm"></i> ${rtl ? "دعم أولوية" : "Priority support"}</li>
        </ul>
        <button class="btn btn-primary btn-block">${rtl ? "اختر هذه الباقة" : "Choose plan"}</button>
      </div>
      <div class="partner-plan">
        <div class="partner-plan__name">${rtl ? "مؤسسات" : "Enterprise"}</div>
        <div class="partner-plan__price">
          <span class="partner-plan__amount">${rtl ? "مخصص" : "Custom"}</span>
          <span class="partner-plan__period">${rtl ? "تواصل معنا" : "Contact us"}</span>
        </div>
        <ul class="partner-plan__features">
          <li><i data-lucide="check" class="icon-sm"></i> ${rtl ? "كل ميزات الاحترافي" : "All Pro features"}</li>
          <li><i data-lucide="check" class="icon-sm"></i> ${rtl ? "تكامل API" : "API integration"}</li>
          <li><i data-lucide="check" class="icon-sm"></i> ${rtl ? "مدير حساب مخصص" : "Dedicated account manager"}</li>
          <li><i data-lucide="check" class="icon-sm"></i> ${rtl ? "تخصيص كامل" : "Full customization"}</li>
        </ul>
        <button class="btn btn-outline btn-block">${rtl ? "تواصل معنا" : "Contact us"}</button>
      </div>
    </div>
  </div>

  <!-- Registration form -->
  <div class="info-section" id="partnerForm">
    <h2 class="info-section__title">${rtl ? "سجّل مطعمك" : "Register your restaurant"}</h2>
    <div class="courier-form">
      <div class="gift-form__field">
        <label>${rtl ? "اسم المطعم" : "Restaurant name"}</label>
        <input type="text" placeholder="${rtl ? "اسم مطعمك" : "Your restaurant name"}" class="gift-input">
      </div>
      <div class="gift-form__field">
        <label>${rtl ? "اسم المالك" : "Owner name"}</label>
        <input type="text" placeholder="${rtl ? "الاسم الكامل" : "Full name"}" class="gift-input">
      </div>
      <div class="gift-form__field">
        <label>${rtl ? "البريد الإلكتروني" : "Email"}</label>
        <input type="email" placeholder="${rtl ? "بريدك الإلكتروني" : "Your email"}" class="gift-input">
      </div>
      <div class="gift-form__field">
        <label>${rtl ? "رقم الهاتف" : "Phone number"}</label>
        <input type="tel" placeholder="+41" class="gift-input">
      </div>
      <div class="gift-form__field">
        <label>${rtl ? "العنوان" : "Restaurant address"}</label>
        <input type="text" placeholder="${rtl ? "عنوان المطعم" : "Full address"}" class="gift-input">
      </div>
      <div class="gift-form__field">
        <label>${rtl ? "نوع المطبخ" : "Cuisine type"}</label>
        <input type="text" placeholder="${rtl ? "إيطالي، آسيوي، عربي..." : "Italian, Asian, Arabic..."}" class="gift-input">
      </div>
      <div class="gift-form__field">
        <label>${rtl ? "رسالة إضافية" : "Additional message"}</label>
        <textarea rows="3" placeholder="${rtl ? "أخبرنا المزيد عن مطعمك..." : "Tell us more about your restaurant..."}" class="gift-input gift-textarea"></textarea>
      </div>
      <button class="btn btn-primary btn-lg btn-block" onclick="pages.partner._submit()">
        ${rtl ? "أرسل طلب الشراكة" : "Submit Partnership Request"}
      </button>
    </div>
  </div>

  <!-- Testimonials -->
  <div class="info-section">
    <h2 class="info-section__title">${rtl ? "ماذا يقول شركاؤنا" : "What our partners say"}</h2>
    <div class="partner-testimonials">
      <div class="partner-testimonial">
        <div class="partner-testimonial__stars">★★★★★</div>
        <p class="partner-testimonial__text">"${rtl ? "منذ انضمامنا لـ Barmagly، زادت مبيعاتنا بنسبة 40%. المنصة سهلة الاستخدام والدعم ممتاز" : "Since joining Barmagly, our sales increased by 40%. The platform is easy to use and support is excellent"}"</p>
        <div class="partner-testimonial__author">${rtl ? "أحمد — مطعم الشرق" : "Ahmad — Eastern Kitchen"}</div>
      </div>
      <div class="partner-testimonial">
        <div class="partner-testimonial__stars">★★★★★</div>
        <p class="partner-testimonial__text">"${rtl ? "أفضل قرار اتخذناه هو الشراكة مع Barmagly. وصلنا لعملاء لم نكن نحلم بالوصول إليهم" : "The best decision we made was partnering with Barmagly. We reached customers we never dreamed of"}"</p>
        <div class="partner-testimonial__author">${rtl ? "ماركو — بيتزا نابولي" : "Marco — Napoli Pizza"}</div>
      </div>
    </div>
  </div>

  <div class="home-spacer"></div>
</div>`;
    if (window.lucide) window.lucide.createIcons();
  },

  _scrollToForm() {
    var form = document.getElementById("partnerForm");
    if (form) form.scrollIntoView({ behavior: "smooth" });
  },

  _submit() {
    var rtl = isRtl();
    alert(rtl ? "شكراً! سنتواصل معك خلال 48 ساعة" : "Thank you! We'll contact you within 48 hours.");
  }
};
