/**
 * help.js — Help Center with FAQ accordion and support tickets
 */
window.pages = window.pages || {};

pages.help = {
  _faq: [],
  _tickets: [],

  _t: {
    en: {
      title: "Help Center",
      searchFaq: "Search FAQ...",
      faqTitle: "Frequently Asked Questions",
      ticketsTitle: "Your Tickets",
      submitTicket: "Submit a Ticket",
      subject: "Subject",
      message: "Describe your issue...",
      send: "Send",
      sending: "Sending...",
      sent: "Ticket submitted successfully!",
      noTickets: "No support tickets yet",
      contactTitle: "Contact Us",
      contactEmail: "support@barmagly.tech",
      contactHours: "Mon–Sun, 9:00 – 22:00",
      subjectOptions: ["Order Issue", "Payment Problem", "Delivery Issue", "Account Help", "Other"],
      statusOpen: "Open",
      statusInProgress: "In Progress",
      statusResolved: "Resolved",
      emptyFaq: "No FAQ entries available",
      back: "Back",
    },
    ar: {
      title: "مركز المساعدة",
      searchFaq: "ابحث في الأسئلة الشائعة...",
      faqTitle: "الأسئلة الشائعة",
      ticketsTitle: "تذاكر الدعم",
      submitTicket: "إرسال تذكرة",
      subject: "الموضوع",
      message: "صف مشكلتك...",
      send: "إرسال",
      sending: "جاري الإرسال...",
      sent: "تم إرسال التذكرة بنجاح!",
      noTickets: "لا توجد تذاكر دعم بعد",
      contactTitle: "اتصل بنا",
      contactEmail: "support@barmagly.tech",
      contactHours: "الاثنين – الأحد، 9:00 – 22:00",
      subjectOptions: ["مشكلة في الطلب", "مشكلة في الدفع", "مشكلة في التوصيل", "مساعدة الحساب", "أخرى"],
      statusOpen: "مفتوح",
      statusInProgress: "قيد المعالجة",
      statusResolved: "تم الحل",
      emptyFaq: "لا توجد أسئلة شائعة",
      back: "رجوع",
    },
    de: {
      title: "Hilfe-Center",
      searchFaq: "FAQ durchsuchen...",
      faqTitle: "Häufig gestellte Fragen",
      ticketsTitle: "Ihre Tickets",
      submitTicket: "Ticket erstellen",
      subject: "Betreff",
      message: "Beschreiben Sie Ihr Problem...",
      send: "Senden",
      sending: "Wird gesendet...",
      sent: "Ticket erfolgreich gesendet!",
      noTickets: "Noch keine Support-Tickets",
      contactTitle: "Kontaktieren Sie uns",
      contactEmail: "support@barmagly.tech",
      contactHours: "Mo–So, 9:00 – 22:00",
      subjectOptions: ["Bestellproblem", "Zahlungsproblem", "Lieferproblem", "Kontohilfe", "Sonstiges"],
      statusOpen: "Offen",
      statusInProgress: "In Bearbeitung",
      statusResolved: "Gelöst",
      emptyFaq: "Keine FAQ-Einträge verfügbar",
      back: "Zurück",
    },
  },

  async render(params, container) {
    const cfg = window.DELIVERY_CONFIG || {};
    const lang = cfg.language || "en";
    const t = pages.help._t[lang] || pages.help._t.en;

    container.innerHTML = `
<div class="help-page">
  <header class="help-page__header">
    <button class="btn-icon" onclick="history.back()" aria-label="${t.back}">
      <i data-lucide="arrow-left" class="icon-md"></i>
    </button>
    <h2 class="help-page__title">${t.title}</h2>
  </header>

  <div class="help-page__body">
    <!-- Contact Card -->
    <section class="help-contact-card">
      <div class="help-contact-card__icon"><i data-lucide="headphones" class="icon-lg"></i></div>
      <div class="help-contact-card__info">
        <h3>${t.contactTitle}</h3>
        <p><i data-lucide="mail" class="icon-xs"></i> ${t.contactEmail}</p>
        <p><i data-lucide="clock" class="icon-xs"></i> ${t.contactHours}</p>
      </div>
    </section>

    <!-- FAQ Section -->
    <section class="help-section">
      <h3 class="help-section__title"><i data-lucide="help-circle" class="icon-sm"></i> ${t.faqTitle}</h3>
      <div class="help-faq__search">
        <i data-lucide="search" class="icon-sm"></i>
        <input type="search" placeholder="${t.searchFaq}" id="faq-search" aria-label="${t.searchFaq}">
      </div>
      <div id="faq-list" class="help-faq__list">
        <div class="skeleton skeleton-text" style="height:48px;margin-bottom:8px"></div>
        <div class="skeleton skeleton-text" style="height:48px;margin-bottom:8px"></div>
        <div class="skeleton skeleton-text" style="height:48px"></div>
      </div>
    </section>

    <!-- Submit Ticket -->
    <section class="help-section">
      <h3 class="help-section__title"><i data-lucide="message-square" class="icon-sm"></i> ${t.submitTicket}</h3>
      <form class="help-ticket-form" id="ticket-form">
        <div class="form-group">
          <label class="form-label">${t.subject}</label>
          <select class="form-select" id="ticket-subject" required>
            ${t.subjectOptions.map(function (opt) { return '<option value="' + opt + '">' + opt + '</option>'; }).join("")}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">${t.message}</label>
          <textarea class="form-textarea" id="ticket-message" rows="4" placeholder="${t.message}" required></textarea>
        </div>
        <button type="submit" class="btn btn-primary btn-full" id="ticket-submit">${t.send}</button>
      </form>
    </section>

    <!-- My Tickets -->
    ${auth.isLoggedIn() ? `<section class="help-section">
      <h3 class="help-section__title"><i data-lucide="ticket" class="icon-sm"></i> ${t.ticketsTitle}</h3>
      <div id="tickets-list">
        <div class="skeleton skeleton-text" style="height:60px;margin-bottom:8px"></div>
      </div>
    </section>` : ""}
  </div>
</div>`;

    if (window.lucide) window.lucide.createIcons();

    // Load FAQ
    pages.help._loadFaq(cfg, t, lang);

    // Load tickets if logged in
    if (auth.isLoggedIn()) {
      pages.help._loadTickets(t);
    }

    // FAQ search filter
    document.getElementById("faq-search").addEventListener("input", function (e) {
      pages.help._filterFaq(e.target.value, lang);
    });

    // Ticket form
    document.getElementById("ticket-form").addEventListener("submit", function (e) {
      e.preventDefault();
      pages.help._submitTicket(cfg, t);
    });
  },

  _loadFaq: async function (cfg, t, lang) {
    try {
      var data = await api.help.getFaq(cfg.tenantId);
      pages.help._faq = Array.isArray(data) ? data : (data.faq || []);
      pages.help._renderFaq(pages.help._faq, t, lang);
    } catch (err) {
      document.getElementById("faq-list").innerHTML = `<p class="text-muted text-sm">${t.emptyFaq}</p>`;
    }
  },

  _renderFaq: function (items, t, lang) {
    var el = document.getElementById("faq-list");
    if (!el) return;

    if (!items || items.length === 0) {
      el.innerHTML = `<p class="text-muted text-sm">${t.emptyFaq}</p>`;
      return;
    }

    el.innerHTML = items.map(function (faq, i) {
      var question = (lang === "ar" && faq.questionAr) ? faq.questionAr : faq.question;
      var answer = (lang === "ar" && faq.answerAr) ? faq.answerAr : faq.answer;
      return `<div class="help-faq__item" id="faq-item-${i}">
        <button class="help-faq__question" onclick="pages.help._toggleFaq(${i})" aria-expanded="false">
          <span>${question}</span>
          <i data-lucide="chevron-down" class="icon-sm help-faq__chevron"></i>
        </button>
        <div class="help-faq__answer">${answer}</div>
      </div>`;
    }).join("");
    if (window.lucide) window.lucide.createIcons();
  },

  _toggleFaq: function (idx) {
    var item = document.getElementById("faq-item-" + idx);
    if (!item) return;
    var isOpen = item.classList.contains("open");
    // Close all
    document.querySelectorAll(".help-faq__item.open").forEach(function (el) { el.classList.remove("open"); });
    if (!isOpen) item.classList.add("open");
  },

  _filterFaq: function (query, lang) {
    var filtered = pages.help._faq.filter(function (faq) {
      var q = (lang === "ar" && faq.questionAr) ? faq.questionAr : faq.question;
      var a = (lang === "ar" && faq.answerAr) ? faq.answerAr : faq.answer;
      var search = query.toLowerCase();
      return q.toLowerCase().indexOf(search) >= 0 || a.toLowerCase().indexOf(search) >= 0;
    });
    var t = pages.help._t[lang] || pages.help._t.en;
    pages.help._renderFaq(filtered, t, lang);
  },

  _loadTickets: async function (t) {
    try {
      var data = await api.help.getTickets();
      pages.help._tickets = Array.isArray(data) ? data : (data.tickets || []);
      pages.help._renderTickets(t);
    } catch (err) {
      var el = document.getElementById("tickets-list");
      if (el) el.innerHTML = `<p class="text-muted text-sm">${t.noTickets}</p>`;
    }
  },

  _renderTickets: function (t) {
    var el = document.getElementById("tickets-list");
    if (!el) return;
    var tickets = pages.help._tickets;

    if (!tickets || tickets.length === 0) {
      el.innerHTML = `<p class="text-muted text-sm">${t.noTickets}</p>`;
      return;
    }

    var statusMap = { open: t.statusOpen, in_progress: t.statusInProgress, resolved: t.statusResolved };
    var statusClass = { open: "warning", in_progress: "info", resolved: "success" };

    el.innerHTML = tickets.map(function (ticket) {
      var status = ticket.status || "open";
      return `<div class="help-ticket-card">
        <div class="help-ticket-card__header">
          <h4>${ticket.subject}</h4>
          <span class="badge badge-${statusClass[status] || 'default'}">${statusMap[status] || status}</span>
        </div>
        <p class="help-ticket-card__message">${ticket.message}</p>
        <span class="help-ticket-card__date">${new Date(ticket.createdAt).toLocaleDateString()}</span>
      </div>`;
    }).join("");
  },

  _submitTicket: async function (cfg, t) {
    var btn = document.getElementById("ticket-submit");
    var subject = document.getElementById("ticket-subject").value;
    var message = document.getElementById("ticket-message").value.trim();

    if (!message) return;

    btn.disabled = true;
    btn.textContent = t.sending;

    try {
      await api.help.submitTicket({
        tenantId: cfg.tenantId,
        subject: subject,
        message: message,
      });
      showToast(t.sent, "success");
      document.getElementById("ticket-message").value = "";

      // Reload tickets
      if (auth.isLoggedIn()) {
        pages.help._loadTickets(t);
      }
    } catch (err) {
      showToast(err.message || "Error", "error");
    } finally {
      btn.disabled = false;
      btn.textContent = t.send;
    }
  },
};
