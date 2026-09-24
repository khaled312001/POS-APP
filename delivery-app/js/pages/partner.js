/**
 * partner.js — "sell online with Kassenta". Honest pointer to the platform
 * site instead of a form that went nowhere.
 */
window.pages = window.pages || {};

pages.partner = {
  render(params, container) {
    container.innerHTML = ui.topBar(L("Your own online store", "متجرك الإلكتروني الخاص"), { back: "home" }) +
      ui.empty("store", L("Run a shop or restaurant?", "هل تملك متجراً أو مطعماً؟"),
        L("This ordering page is powered by Kassenta — a till, online store and delivery app in one.", "صفحة الطلب هذه تعمل بنظام Kassenta — نقطة بيع ومتجر إلكتروني وتطبيق توصيل في نظام واحد."),
        `<a class="btn btn-primary" href="https://kassenta.com" target="_blank" rel="noopener">${icon("external-link", "icon-sm")} ${esc(L("Visit kassenta.com", "زر kassenta.com"))}</a>`);
  },
};
