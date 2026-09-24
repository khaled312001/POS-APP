/**
 * help.js — contact the store (WhatsApp / call), the store's own FAQ, and a
 * message form (help ticket). Also answers the common questions honestly
 * when the store hasn't written an FAQ.
 */
window.pages = window.pages || {};

pages.help = {
  async render(params, container, alive) {
    const top = ui.topBar(L("Help & contact", "المساعدة والتواصل"), { back: "account" });
    container.innerHTML = top + ui.spinner();
    const storeCfg = await shop.config();
    const [faq, tickets] = await Promise.all([
      api.help.getFaq(kx.cfg.tenantId).catch(() => []),
      auth.isLoggedIn() ? api.help.getTickets().catch(() => []) : Promise.resolve([]),
    ]);
    if (!alive()) return;
    const wa = String(storeCfg.socialWhatsapp || "").replace(/\D/g, "");
    const phone = String(storeCfg.supportPhone || storeCfg.phone || "").replace(/[^\d+]/g, "");
    const ar = kx.lang() === "ar";
    const entries = (Array.isArray(faq) ? faq : []).map(f => ({ q: (ar && f.questionAr) || f.question, a: (ar && f.answerAr) || f.answer }));
    if (!entries.length) {
      entries.push(
        { q: L("How do I pay?", "كيف أدفع؟"), a: L("Choose a payment method at checkout. Cash is paid when you receive your order.", "اختر طريقة الدفع عند إتمام الطلب. الدفع النقدي يكون عند استلام الطلب.") },
        { q: L("How do I follow my order?", "كيف أتابع طلبي؟"), a: L("After ordering you get a tracking link on screen and on WhatsApp. Signed-in customers also find it under My orders.", "بعد الطلب يظهر لك رابط التتبع على الشاشة ويصلك عبر واتساب. ويمكن للمسجّلين إيجاده في «طلباتي».") },
        { q: L("Can I change or cancel an order?", "هل يمكنني تعديل الطلب أو إلغاؤه؟"), a: L("Contact the store as soon as possible — before it is being prepared.", "تواصل مع المتجر بأسرع وقت — قبل أن يبدأ تحضير الطلب.") },
      );
    }
    const tlist = Array.isArray(tickets) ? tickets : [];
    const tStatus = { open: L("Open", "مفتوحة"), in_progress: L("In progress", "قيد المعالجة"), resolved: L("Resolved", "تم الحل"), closed: L("Closed", "مغلقة") };

    container.innerHTML = `
${top}
<div class="page page--help">
  ${(wa || phone) ? `<section class="card">
    <h2 class="card__title">${icon("headset", "icon-sm")} ${esc(L("Contact", "تواصل معنا"))} ${esc(storeCfg.storeName || "")}</h2>
    <div class="btn-row">
      ${wa ? `<a class="btn btn-primary" href="https://wa.me/${esc(wa)}" target="_blank" rel="noopener">${icon("message-circle", "icon-sm")} ${esc(L("WhatsApp", "واتساب"))}</a>` : ""}
      ${phone ? `<a class="btn btn-soft" href="tel:${esc(phone)}">${icon("phone", "icon-sm")} ${esc(L("Call", "اتصال"))}</a>` : ""}
    </div>
    ${phone ? `<p class="small muted">${icon("phone", "icon-xs")} <span dir="ltr">${esc(storeCfg.supportPhone || storeCfg.phone)}</span></p>` : ""}
    ${storeCfg.openingHours ? `<p class="small muted">${icon("clock", "icon-xs")} ${esc(storeCfg.openingHours)}</p>` : ""}
    ${storeCfg.address ? `<p class="small muted">${icon("map-pin", "icon-xs")} ${esc(storeCfg.address)}</p>` : ""}
  </section>` : ""}

  <section class="card">
    <h2 class="card__title">${icon("circle-help", "icon-sm")} ${esc(L("Questions", "أسئلة شائعة"))}</h2>
    <div class="faq">${entries.map(e => `<details class="faq__item"><summary>${esc(e.q)}</summary><p>${esc(e.a)}</p></details>`).join("")}</div>
  </section>

  <section class="card">
    <h2 class="card__title">${icon("mail", "icon-sm")} ${esc(L("Send us a message", "أرسل لنا رسالة"))}</h2>
    <form id="tk" novalidate>
      <label class="field"><span class="field__label">${esc(L("Subject", "الموضوع"))}</span>
        <input class="input" id="tk-subject" maxlength="120"></label>
      <label class="field"><span class="field__label">${esc(L("Message", "الرسالة"))}</span>
        <textarea class="input" id="tk-message" rows="4" maxlength="2000"></textarea></label>
      ${auth.isLoggedIn() ? "" : `<label class="field"><span class="field__label">${esc(L("Your mobile, so we can reply", "رقم موبايلك لنرد عليك"))}</span>
        <input class="input" id="tk-phone" type="tel" dir="ltr" inputmode="tel" maxlength="20" placeholder="${esc(kx.phoneHint().replace(/^[^\d+]*/, ""))}"></label>`}
      <p class="field__err" id="tk-err" hidden></p>
      <button class="btn btn-primary btn-block" type="submit">${esc(L("Send", "إرسال"))}</button>
    </form>
  </section>

  ${tlist.length ? `<section class="card">
    <h2 class="card__title">${icon("inbox", "icon-sm")} ${esc(L("Your messages", "رسائلك"))}</h2>
    <ul class="tickets">${tlist.map(t => `<li>
      <div class="tickets__head"><strong>${esc(t.subject)}</strong><span class="badge">${esc(tStatus[t.status] || t.status)}</span></div>
      <p class="small">${esc(t.message)}</p>
      ${t.response ? `<p class="tickets__reply">${icon("reply", "icon-xs")} ${esc(t.response)}</p>` : ""}
      <small class="muted">${esc(kx.fmtDate(t.createdAt, true))}</small></li>`).join("")}</ul>
  </section>` : ""}
</div>`;
    refreshIcons();

    const form = container.querySelector("#tk");
    form.onsubmit = async (e) => {
      e.preventDefault();
      const btn = form.querySelector("button[type=submit]");
      const err = form.querySelector("#tk-err");
      if (btn.disabled) return;
      const subject = form.querySelector("#tk-subject").value.trim();
      let message = form.querySelector("#tk-message").value.trim();
      const ph = form.querySelector("#tk-phone");
      if (subject.length < 2 || message.length < 5) { err.textContent = L("Write a subject and a short message.", "اكتب الموضوع ورسالة قصيرة."); err.hidden = false; return; }
      if (ph) {
        const n = kx.normalizePhone(ph.value);
        if (!n.valid) { err.textContent = L("Enter your mobile number so the store can reply. ", "أدخل رقم موبايلك ليتمكّن المتجر من الرد. ") + kx.phoneHint(); err.hidden = false; return; }
        message += "\n\n" + L("Phone: ", "الهاتف: ") + n.value;
      }
      btn.disabled = true; btn.classList.add("is-loading"); err.hidden = true;
      try {
        await api.help.submitTicket({ subject, message, tenantId: kx.cfg.tenantId });
        form.reset();
        showToast(L("Message sent. The store will get back to you.", "تم إرسال رسالتك. سيتواصل معك المتجر."), "success", 4000);
      } catch (ex) { err.textContent = ex.message; err.hidden = false; }
      btn.disabled = false; btn.classList.remove("is-loading");
    };
  },
};
