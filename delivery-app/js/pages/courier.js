/**
 * courier.js — "deliver for us". There is no online driver sign-up, so this
 * page says so plainly and points to the store (drivers are added by the
 * store in the POS).
 */
window.pages = window.pages || {};

pages.courier = {
  async render(params, container) {
    const storeCfg = await shop.config();
    const wa = String(storeCfg.socialWhatsapp || "").replace(/\D/g, "");
    const phone = String(storeCfg.phone || "").replace(/[^\d+]/g, "");
    container.innerHTML = ui.topBar(L("Deliver with us", "انضم كمندوب توصيل"), { back: "home" }) +
      ui.empty("bike", L("Want to deliver for ", "هل تريد التوصيل لـ ") + (storeCfg.storeName || ""),
        L("Drivers are added by the store. Get in touch and they'll set you up with the driver app.", "المندوبون يضيفهم المتجر. تواصل معهم وسيجهّزون لك تطبيق المندوب."),
        `<div class="btn-row">${wa ? `<a class="btn btn-primary" href="https://wa.me/${esc(wa)}" target="_blank" rel="noopener">${icon("message-circle", "icon-sm")} ${esc(L("WhatsApp the store", "راسل المتجر على واتساب"))}</a>` : ""}
        ${phone ? `<a class="btn btn-soft" href="tel:${esc(phone)}">${icon("phone", "icon-sm")} ${esc(L("Call", "اتصل"))}</a>` : ""}</div>`);
  },
};
