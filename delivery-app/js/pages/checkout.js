/**
 * checkout.js — one page: how to receive the order, address (typed; a map pin
 * is optional), contact, time, payment, summary, place order.
 *
 * Payment options come from the store's own config:
 *   cash      always available unless the store turned it off
 *   shamcash  manual transfer (store QR / number + the customer's reference)
 *   card      Stripe PaymentElement — never for currencies Stripe can't take
 *             (SYP), and Stripe.js is only loaded after the order exists and
 *             the customer chose card.
 *
 * Money shown here is advisory: the server re-prices every order, and the
 * payment panels show the total the server stored.
 */
window.pages = window.pages || {};

pages.checkout = {
  _busy: false,

  _draftKey() { return "kassenta_checkout_" + kx.cfg.tenantId; },
  _pendingKey() { return "kassenta_pending_order_" + kx.cfg.tenantId; },
  _lastKey() { return "kassenta_last_order_" + kx.cfg.tenantId; },

  async render(params, container, alive) {
    if (await pages.checkout._resumeRedirect(container)) return;

    container.innerHTML = ui.topBar(L("Checkout", "إتمام الطلب"), { back: "cart" }) + ui.spinner();
    const storeCfg = await shop.config();
    try { cart.reconcile(await shop.menu()); } catch (_) {}
    if (!alive()) return;
    if (!cart.getState().items.length) { router.replace("cart"); return; }

    const customer = auth.getCustomer();
    const draft = safeStorage.json(pages.checkout._draftKey(), {}) || {};
    const st0 = cart.getState();
    const types = shop.orderTypes();

    const f = {
      type: st0.orderType === "dine_in" && st0.tableQrToken ? "dine_in" : (types.indexOf(st0.orderType) >= 0 ? st0.orderType : types[0]),
      addresses: [],
      addrId: null,
      zones: [],
      zoneId: draft.zoneId || "",
      area: draft.area || "",
      street: draft.street || "",
      building: draft.building || "",
      floor: draft.floor || "",
      landmark: draft.landmark || "",
      lat: null, lng: null,
      saveAddr: true,
      name: auth.displayName(customer) || draft.name || "",
      phone: (customer && customer.phone) || draft.phone || "",
      when: "asap", at: "",
      pay: null,
      payInfo: null,       // result of shop.payments()
      wallet: 0,
      useWallet: false,
      errors: {},
    };

    const byId = (id) => container.querySelector("#" + id);

    // ── computed values ──────────────────────────────────────────────────
    const zone = () => f.zones.find(z => String(z.id) === String(f.zoneId)) || null;
    const calc = () => {
      const st = cart.getState();
      const delivery = f.type === "delivery";
      const z = delivery ? zone() : null;
      const fee = delivery ? (z ? Number(z.deliveryFee) || 0 : Number(storeCfg.deliveryFee) || 0) : 0;
      const minOrder = delivery ? Math.max(Number(storeCfg.minOrderAmount) || 0, z ? Number(z.minOrderAmount) || 0 : 0) : 0;
      const gross = kx.roundMoney(Math.max(0, st.subtotal - st.discountAmount) + fee);
      const walletUsed = f.useWallet ? kx.roundMoney(Math.min(f.wallet, gross)) : 0;
      return { st, fee, minOrder, short: Math.max(0, minOrder - st.subtotal), gross, walletUsed, total: kx.roundMoney(gross - walletUsed) };
    };

    const cashLabel = () => f.type === "delivery"
      ? [L("Cash on delivery", "الدفع نقداً عند الاستلام"), L("Pay the driver when your order arrives.", "ادفع للمندوب عند وصول طلبك.")]
      : f.type === "dine_in"
        ? [L("Pay at the table", "الدفع عند الطاولة"), L("Pay the staff in cash.", "ادفع نقداً للموظف.")]
        : [L("Pay at the store", "الدفع في المتجر"), L("Pay in cash when you collect.", "ادفع نقداً عند الاستلام.")];

    // ── sections ────────────────────────────────────────────────────────
    const typeSection = () => {
      if (f.type === "dine_in") {
        return `<div class="notice notice--info">${icon("utensils", "icon-sm")} ${esc(L("Dine-in order", "طلب داخل المطعم"))}${st0.tableName ? " · " + esc(st0.tableName) : ""}</div>`;
      }
      if (types.length < 2) return "";
      return `<div class="seg" role="radiogroup" aria-label="${esc(L("Order type", "نوع الطلب"))}">${types.map(tp =>
        `<button type="button" class="seg__btn ${f.type === tp ? "is-on" : ""}" role="radio" aria-checked="${f.type === tp}" data-type="${tp}">
          ${icon(tp === "delivery" ? "bike" : "store", "icon-sm")} ${tp === "delivery" ? esc(L("Delivery", "توصيل")) : esc(L("Pickup", "استلام من المتجر"))}</button>`).join("")}</div>`;
    };

    const err = (k) => f.errors[k] ? `<p class="field__err">${esc(f.errors[k])}</p>` : "";
    const inv = (k) => f.errors[k] ? ' aria-invalid="true"' : "";

    const addressSection = () => {
      if (f.type !== "delivery") {
        if (f.type === "pickup") {
          return `<section class="card">
            <h2 class="card__title">${icon("store", "icon-sm")} ${esc(L("Pick up from", "الاستلام من"))}</h2>
            <p class="strong">${esc(storeCfg.storeName || "")}</p>
            ${storeCfg.address ? `<p class="muted">${esc(storeCfg.address)}</p>` : ""}
          </section>`;
        }
        return "";
      }
      const saved = f.addresses;
      const usingSaved = f.addrId != null;
      const zones = f.zones;
      return `<section class="card" id="sec-address">
        <h2 class="card__title">${icon("map-pin", "icon-sm")} ${esc(L("Delivery address", "عنوان التوصيل"))}</h2>
        ${zones.length ? `
        <label class="field">
          <span class="field__label">${esc(L("Area", "المنطقة"))} *</span>
          <select class="input" id="f-zone"${inv("zone")}>
            <option value="">${esc(L("Choose your area", "اختر منطقتك"))}</option>
            ${zones.map(z => `<option value="${z.id}" ${String(z.id) === String(f.zoneId) ? "selected" : ""}>${esc((kx.lang() === "ar" && z.nameAr) ? z.nameAr : z.name)}${Number(z.deliveryFee) > 0 ? " — " + esc(formatCurrency(z.deliveryFee)) : " — " + esc(L("free delivery", "توصيل مجاني"))}</option>`).join("")}
          </select>${err("zone")}
        </label>` : ""}
        ${saved.length ? `
        <div class="choice-list" role="radiogroup" aria-label="${esc(L("Saved addresses", "العناوين المحفوظة"))}">
          ${saved.map(a => `<label class="choice ${String(f.addrId) === String(a.id) ? "is-on" : ""}">
            <input type="radio" name="addr" value="${a.id}" ${String(f.addrId) === String(a.id) ? "checked" : ""}>
            <span class="choice__mark"></span>
            <span class="choice__txt"><strong>${esc(a.label || L("Address", "عنوان"))}</strong>
              <span class="muted">${esc([a.city, a.street, a.buildingName, a.floor ? L("Floor ", "طابق ") + a.floor : ""].filter(Boolean).join("، "))}</span></span>
          </label>`).join("")}
          <label class="choice ${!usingSaved ? "is-on" : ""}">
            <input type="radio" name="addr" value="new" ${!usingSaved ? "checked" : ""}>
            <span class="choice__mark"></span>
            <span class="choice__txt"><strong>${esc(L("New address", "عنوان جديد"))}</strong></span>
          </label>
        </div>` : ""}
        ${usingSaved ? "" : `
        <div class="grid-2">
          ${zones.length ? "" : `<label class="field">
            <span class="field__label">${esc(L("Area / neighbourhood", "المنطقة / الحي"))} *</span>
            <input class="input" id="f-area" value="${esc(f.area)}" maxlength="80" autocomplete="address-level2"${inv("area")} placeholder="${esc(L("e.g. Mezzeh", "مثال: المزة"))}">${err("area")}
          </label>`}
          <label class="field">
            <span class="field__label">${esc(L("Street", "الشارع"))} *</span>
            <input class="input" id="f-street" value="${esc(f.street)}" maxlength="120" autocomplete="address-line1"${inv("street")} placeholder="${esc(L("Street name", "اسم الشارع"))}">${err("street")}
          </label>
          <label class="field">
            <span class="field__label">${esc(L("Building", "البناء"))}</span>
            <input class="input" id="f-building" value="${esc(f.building)}" maxlength="80" placeholder="${esc(L("Building name or number", "اسم أو رقم البناء"))}">
          </label>
          <label class="field">
            <span class="field__label">${esc(L("Floor / apartment", "الطابق / الشقة"))}</span>
            <input class="input" id="f-floor" value="${esc(f.floor)}" maxlength="30">
          </label>
        </div>
        <label class="field">
          <span class="field__label">${esc(L("Directions for the driver", "إرشادات للمندوب"))} <span class="muted">(${esc(L("optional", "اختياري"))})</span></span>
          <input class="input" id="f-landmark" value="${esc(f.landmark)}" maxlength="200" placeholder="${esc(L("Nearby landmark, door colour…", "معلم قريب، لون الباب…"))}">
        </label>
        ${auth.isLoggedIn() ? `<label class="check"><input type="checkbox" id="f-save" ${f.saveAddr ? "checked" : ""}> <span>${esc(L("Save this address for next time", "احفظ هذا العنوان للمرات القادمة"))}</span></label>` : ""}`}
        <div class="loc-row">
          ${f.lat != null ? `<span class="loc-ok">${icon("map-pin-check", "icon-sm")} ${esc(L("Location added", "تمت إضافة الموقع"))}</span>
            <button type="button" class="btn btn-ghost btn-sm" data-loc-clear>${esc(L("Remove", "إزالة"))}</button>`
          : `<button type="button" class="btn btn-soft btn-sm" data-loc>${icon("locate-fixed", "icon-sm")} ${esc(L("Add my location (optional)", "أضف موقعي (اختياري)"))}</button>`}
        </div>
      </section>`;
    };

    const contactSection = () => {
      const pre = kx.phoneFieldPrefix();
      return `<section class="card" id="sec-contact">
        <h2 class="card__title">${icon("user-round", "icon-sm")} ${esc(L("Your details", "بياناتك"))}</h2>
        ${auth.isLoggedIn() ? "" : `<p class="small muted">${esc(L("Have an account? ", "لديك حساب؟ "))}<a href="#" class="link" data-login>${esc(L("Sign in", "سجّل الدخول"))}</a>${esc(L(" to use saved addresses and earn points.", " لاستخدام عناوينك وكسب النقاط."))}</p>`}
        <div class="grid-2">
          <label class="field">
            <span class="field__label">${esc(L("Name", "الاسم"))}${f.type === "dine_in" ? "" : " *"}</span>
            <input class="input" id="f-name" value="${esc(f.name)}" maxlength="80" autocomplete="name"${inv("name")}>${err("name")}
          </label>
          <label class="field">
            <span class="field__label">${esc(L("Mobile (WhatsApp)", "رقم الموبايل (واتساب)"))} *</span>
            <span class="input-group">${pre ? `<span class="input-group__pre" dir="ltr">${esc(pre)}</span>` : ""}
              <input class="input" id="f-phone" type="tel" inputmode="tel" dir="ltr" value="${esc(f.phone)}" maxlength="20" autocomplete="tel"${inv("phone")} placeholder="${esc(kx.phoneHint().replace(/^[^\d+]*/, ""))}"></span>
            ${err("phone") || `<span class="field__hint">${esc(L("We'll send your order confirmation on WhatsApp.", "سنرسل لك تأكيد الطلب عبر واتساب."))}</span>`}
          </label>
        </div>
      </section>`;
    };

    const timeSection = () => {
      if (storeCfg.enableScheduledOrders === false || f.type === "dine_in") return "";
      const min = new Date(Date.now() + 45 * 60000);
      const pad = (n) => String(n).padStart(2, "0");
      const local = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      const max = new Date(Date.now() + 7 * 864e5);
      return `<section class="card" id="sec-time">
        <h2 class="card__title">${icon("clock", "icon-sm")} ${esc(L("When?", "متى؟"))}</h2>
        <div class="seg seg--sm" role="radiogroup">
          <button type="button" class="seg__btn ${f.when === "asap" ? "is-on" : ""}" data-when="asap">${esc(L("As soon as possible", "بأسرع وقت"))}</button>
          <button type="button" class="seg__btn ${f.when === "later" ? "is-on" : ""}" data-when="later">${esc(L("Schedule", "حدّد موعداً"))}</button>
        </div>
        ${f.when === "later" ? `<label class="field">
          <span class="field__label">${esc(L("Date and time", "التاريخ والوقت"))} *</span>
          <input class="input" type="datetime-local" id="f-at" value="${esc(f.at)}" min="${local(min)}" max="${local(max)}"${inv("at")}>${err("at")}
        </label>` : ""}
      </section>`;
    };

    const paySection = () => {
      const p = f.payInfo;
      if (!p) return `<section class="card" id="sec-pay"><h2 class="card__title">${icon("wallet", "icon-sm")} ${esc(L("Payment", "الدفع"))}</h2>
        <div class="sk sk--block"></div><div class="sk sk--block"></div></section>`;
      const opts = [];
      if (p.cash) { const c = cashLabel(); opts.push({ id: "cash", icon: "banknote", title: c[0], text: c[1] }); }
      if (p.shamcash) opts.push({ id: "shamcash", icon: "smartphone", title: L("Sham Cash", "شام كاش"), text: L("Transfer to the store's Sham Cash account after placing the order.", "حوّل المبلغ إلى حساب شام كاش الخاص بالمتجر بعد تأكيد الطلب.") });
      if (p.card && f.type !== "dine_in") opts.push({ id: "card", icon: "credit-card", title: L("Card", "بطاقة"), text: L("Pay securely online.", "ادفع إلكترونياً بأمان.") });
      if (!opts.some(o => o.id === f.pay)) f.pay = opts.length ? opts[0].id : "cash";
      const c = calc();
      return `<section class="card" id="sec-pay">
        <h2 class="card__title">${icon("wallet", "icon-sm")} ${esc(L("Payment", "الدفع"))}</h2>
        ${f.wallet > 0 ? `<label class="check check--card"><input type="checkbox" id="f-wallet" ${f.useWallet ? "checked" : ""}>
          <span>${esc(L("Use my wallet balance", "استخدم رصيد محفظتي"))} <b>${esc(formatCurrency(f.wallet))}</b></span></label>` : ""}
        ${f.useWallet && c.total <= 0 ? `<p class="notice notice--good">${icon("badge-check", "icon-sm")} ${esc(L("Your wallet covers this order.", "رصيد محفظتك يغطي هذا الطلب."))}</p>` : `
        <div class="choice-list" role="radiogroup" aria-label="${esc(L("Payment method", "طريقة الدفع"))}">
          ${opts.map(o => `<label class="choice ${f.pay === o.id ? "is-on" : ""}">
            <input type="radio" name="pay" value="${o.id}" ${f.pay === o.id ? "checked" : ""}>
            <span class="choice__icon">${icon(o.icon, "icon-md")}</span>
            <span class="choice__txt"><strong>${esc(o.title)}</strong><span class="muted">${esc(o.text)}</span></span>
            <span class="choice__mark"></span>
          </label>`).join("")}
        </div>`}
      </section>`;
    };

    const summarySection = () => {
      const c = calc();
      const st = c.st;
      return `<section class="card summary" id="sec-summary">
        <h2 class="card__title">${icon("receipt", "icon-sm")} ${esc(L("Order summary", "ملخص الطلب"))}</h2>
        <ul class="sum-items">
          ${st.items.map(i => `<li><span class="sum-items__q">${i.qty}×</span>
            <span class="sum-items__n">${esc(kx.lang() === "ar" && i.nameAr ? i.nameAr : i.name)}${cart.describe(i) ? `<small>${esc(cart.describe(i))}</small>` : ""}</span>
            <span class="sum-items__p">${esc(formatCurrency(cart.lineTotal(i)))}</span></li>`).join("")}
        </ul>
        <div class="summary__row"><span>${esc(L("Subtotal", "المجموع الفرعي"))}</span><span>${esc(formatCurrency(st.subtotal))}</span></div>
        ${st.discountAmount ? `<div class="summary__row summary__row--good"><span>${esc(L("Discount", "الخصم"))} (${esc(st.promo.code)})</span><span>−${esc(formatCurrency(st.discountAmount))}</span></div>` : ""}
        ${f.type === "delivery" ? `<div class="summary__row"><span>${esc(L("Delivery", "التوصيل"))}</span><span>${c.fee ? esc(formatCurrency(c.fee)) : esc(L("Free", "مجاني"))}</span></div>` : ""}
        ${c.walletUsed ? `<div class="summary__row summary__row--good"><span>${esc(L("Wallet", "المحفظة"))}</span><span>−${esc(formatCurrency(c.walletUsed))}</span></div>` : ""}
        <div class="summary__row summary__row--total"><span>${esc(L("Total", "الإجمالي"))}</span><span>${esc(formatCurrency(c.total))}</span></div>
        ${st.notes ? `<p class="small muted">${icon("message-square", "icon-xs")} ${esc(st.notes)}</p>` : ""}
        ${c.short > 0 ? `<p class="notice notice--warn">${icon("alert-triangle", "icon-sm")} ${esc(L("Minimum order for delivery", "الحد الأدنى لطلب التوصيل"))}: ${esc(formatCurrency(c.minOrder))}. ${esc(L("Add ", "أضف "))}${esc(formatCurrency(c.short))}.</p>` : ""}
      </section>`;
    };

    const draw = () => {
      const c = calc();
      container.innerHTML = `
${ui.topBar(L("Checkout", "إتمام الطلب"), { back: "cart" })}
<form class="page page--checkout" id="co-form" novalidate>
  <div class="cols">
    <div class="cols__main">
      ${typeSection()}
      ${addressSection()}
      ${contactSection()}
      ${timeSection()}
      ${paySection()}
    </div>
    <aside class="cols__side">
      ${summarySection()}
      <div class="cta-bar">
        <p class="field__err" id="co-error" role="alert" hidden></p>
        <button type="submit" class="btn btn-primary btn-lg btn-block" id="co-submit" ${c.short > 0 ? "disabled" : ""}>
          <span>${esc(L("Place order", "تأكيد الطلب"))}</span><span>${esc(formatCurrency(c.total))}</span>
        </button>
        <p class="small muted center">${esc(L("By placing the order you agree to the store's terms.", "بتأكيد الطلب فإنك توافق على شروط المتجر."))}</p>
      </div>
    </aside>
  </div>
</form>`;
      bind();
      refreshIcons();
    };

    const readFields = () => {
      const v = (id) => { const el = byId(id); return el ? el.value : null; };
      const set = (k, id) => { const x = v(id); if (x != null) f[k] = x; };
      set("zoneId", "f-zone"); set("area", "f-area"); set("street", "f-street"); set("building", "f-building");
      set("floor", "f-floor"); set("landmark", "f-landmark"); set("name", "f-name"); set("phone", "f-phone"); set("at", "f-at");
      const sv = byId("f-save"); if (sv) f.saveAddr = sv.checked;
    };
    // Redraw keeps the scroll position and whatever field the customer is typing in.
    const redraw = () => {
      readFields();
      const a = document.activeElement;
      const aid = a && container.contains(a) ? a.id : null;
      let s0 = null, s1 = null;
      try { s0 = a.selectionStart; s1 = a.selectionEnd; } catch (_) {}
      const y = window.scrollY;
      draw();
      window.scrollTo(0, y);
      const el = aid && byId(aid);
      if (el) { el.focus({ preventScroll: true }); try { if (s0 != null) el.setSelectionRange(s0, s1); } catch (_) {} }
    };

    const bind = () => {
      container.querySelectorAll("[data-type]").forEach(b => b.onclick = () => {
        f.type = b.dataset.type; cart.setOrderType(f.type); f.errors = {}; redraw();
      });
      container.querySelectorAll("[data-when]").forEach(b => b.onclick = () => { f.when = b.dataset.when; redraw(); });
      container.querySelectorAll('input[name="addr"]').forEach(r => r.onchange = () => {
        f.addrId = r.value === "new" ? null : r.value;
        const a = f.addresses.find(x => String(x.id) === String(f.addrId));
        if (a && a.lat && a.lng) { f.lat = Number(a.lat); f.lng = Number(a.lng); }
        redraw();
      });
      container.querySelectorAll('input[name="pay"]').forEach(r => r.onchange = () => { f.pay = r.value; redraw(); });
      const zs = byId("f-zone"); if (zs) zs.onchange = () => { delete f.errors.zone; redraw(); };
      const w = byId("f-wallet"); if (w) w.onchange = () => { f.useWallet = w.checked; redraw(); };
      const lg = container.querySelector("[data-login]");
      if (lg) lg.onclick = (e) => { e.preventDefault(); readFields(); saveDraft(); auth.requireLogin("checkout"); };
      const loc = container.querySelector("[data-loc]");
      if (loc) loc.onclick = () => { readFields(); pages.checkout._pickLocation(f, storeCfg, redraw); };
      const lc = container.querySelector("[data-loc-clear]");
      if (lc) lc.onclick = () => { f.lat = f.lng = null; redraw(); };
      // Clear a field's error as soon as it is edited.
      container.querySelectorAll(".input[aria-invalid]").forEach(el => el.addEventListener("input", () => {
        el.removeAttribute("aria-invalid");
        const e = el.closest(".field") && el.closest(".field").querySelector(".field__err");
        if (e) e.remove();
      }, { once: true }));
      byId("co-form").onsubmit = (e) => { e.preventDefault(); submit(); };
    };

    const saveDraft = () => {
      safeStorage.set(pages.checkout._draftKey(), JSON.stringify({
        zoneId: f.zoneId, area: f.area, street: f.street, building: f.building, floor: f.floor,
        landmark: f.landmark, name: f.name, phone: f.phone,
      }));
    };

    const validate = () => {
      const e = {};
      if (f.type === "delivery") {
        if (f.zones.length && !zone()) e.zone = L("Choose your area", "اختر منطقتك");
        if (f.addrId == null) {
          if (!f.zones.length && !f.area.trim()) e.area = L("Enter your area", "أدخل المنطقة");
          if (f.street.trim().length < 2) e.street = L("Enter the street", "أدخل اسم الشارع");
        }
      }
      if (f.type !== "dine_in" && f.name.trim().length < 2) e.name = L("Enter your name", "أدخل اسمك");
      const ph = kx.normalizePhone(f.phone);
      if (!ph.valid) e.phone = L("Enter a valid mobile number. ", "أدخل رقم موبايل صحيحاً. ") + kx.phoneHint();
      if (f.when === "later") {
        const t = new Date(f.at).getTime();
        if (!f.at || isNaN(t)) e.at = L("Choose a date and time", "اختر التاريخ والوقت");
        else if (t < Date.now() + 20 * 60000) e.at = L("Choose a time at least 30 minutes from now", "اختر وقتاً بعد 30 دقيقة على الأقل");
      }
      return e;
    };

    const fingerprint = () => JSON.stringify([f.type, kx.normalizePhone(f.phone).value, cart._items.map(i => i._key + "×" + i.qty)]);

    const setBusy = (on, label) => {
      pages.checkout._busy = on;
      const btn = byId("co-submit");
      if (!btn) return;
      btn.disabled = on;
      btn.classList.toggle("is-loading", on);
      if (label) btn.firstElementChild.textContent = label;
    };
    const showError = (msg) => {
      const el = byId("co-error");
      if (!el) return showToast(msg, "error");
      el.textContent = msg;
      el.hidden = !msg;
      if (msg) el.scrollIntoView({ behavior: "smooth", block: "center" });
    };

    const submit = async () => {
      if (pages.checkout._busy) return;
      readFields();
      saveDraft();
      f.errors = validate();
      if (Object.keys(f.errors).length) {
        redraw();
        const first = container.querySelector('[aria-invalid="true"]');
        if (first) { first.scrollIntoView({ behavior: "smooth", block: "center" }); first.focus({ preventScroll: true }); }
        return;
      }
      const c = calc();
      if (c.short > 0) return showError(L("The minimum order for delivery is ", "الحد الأدنى لطلب التوصيل ") + formatCurrency(c.minOrder));

      // Never send the same basket twice by accident.
      const fp = fingerprint();
      const last = safeStorage.json(pages.checkout._lastKey(), null);
      if (last && last.fp === fp && Date.now() - last.at < 15 * 60000) {
        const again = await confirmDialog(L("You placed this same order a few minutes ago. Send it again?", "لقد أرسلت هذا الطلب نفسه قبل دقائق. هل تريد إرساله مرة أخرى؟"), L("Send again", "أرسل مرة أخرى"));
        if (!again) return;
      }
      const pending = safeStorage.json(pages.checkout._pendingKey(), null);
      if (pending && pending.fp === fp && Date.now() - pending.at < 10 * 60000) {
        const again = await confirmDialog(L("Your last attempt may already have reached the store. Check WhatsApp for a confirmation first. Send the order anyway?", "قد تكون محاولتك السابقة وصلت إلى المتجر. تحقّق أولاً من رسالة التأكيد على واتساب. هل تريد إرسال الطلب على أي حال؟"), L("Send anyway", "أرسل على أي حال"));
        if (!again) return;
      }

      const st = c.st;
      const ph = kx.normalizePhone(f.phone);
      const cust = auth.getCustomer();
      const z = f.type === "delivery" ? zone() : null;
      const savedA = f.addrId != null ? f.addresses.find(a => String(a.id) === String(f.addrId)) : null;
      const area = z ? ((kx.lang() === "ar" && z.nameAr) ? z.nameAr : z.name) : "";
      let customerAddress = null, buildingName = null, floor = null, addressNotes = null;
      if (f.type === "delivery") {
        if (savedA) {
          customerAddress = [area && area !== savedA.city ? area : "", savedA.city, savedA.street].filter(Boolean).join(" - ");
          buildingName = savedA.buildingName || null; floor = savedA.floor || null; addressNotes = savedA.notes || null;
        } else {
          customerAddress = [area || f.area.trim(), f.street.trim()].filter(Boolean).join(" - ");
          buildingName = f.building.trim() || null; floor = f.floor.trim() || null; addressNotes = f.landmark.trim() || null;
        }
      }
      const payMethod = f.useWallet && c.total <= 0 ? "wallet" : (f.pay || "cash");
      const body = {
        tenantId: kx.cfg.tenantId,
        customerName: f.name.trim() || (st.tableName ? st.tableName : ph.value),
        customerPhone: ph.value,
        customerEmail: (cust && cust.email) || undefined,
        customerAddress,
        buildingName, floor, addressNotes,
        customerLat: f.type === "delivery" && f.lat != null ? f.lat : undefined,
        customerLng: f.type === "delivery" && f.lng != null ? f.lng : undefined,
        savedAddressId: savedA ? savedA.id : undefined,
        items: cart.payloadItems(),
        subtotal: st.subtotal,
        deliveryFee: c.fee,
        totalAmount: c.total,
        paymentMethod: payMethod,
        orderType: f.type,
        notes: st.notes || undefined,
        // The code, not the id: the server then re-checks it and computes the discount itself.
        promoCode: st.promo && st.discountAmount > 0 ? st.promo.code : undefined,
        discountAmount: st.promo && st.discountAmount > 0 ? st.discountAmount : 0,
        scheduledAt: f.when === "later" ? new Date(f.at).toISOString() : undefined,
        walletAmountUsed: c.walletUsed || undefined,
        tableQrToken: f.type === "dine_in" ? st.tableQrToken : undefined,
        tableNumber: f.type === "dine_in" ? st.tableName : undefined,
        language: kx.lang(),
      };

      setBusy(true, L("Sending your order…", "جارٍ إرسال طلبك…"));
      showError("");
      safeStorage.set(pages.checkout._pendingKey(), JSON.stringify({ fp, at: Date.now() }));
      let res;
      try {
        res = await api.orders.create(body);
        if (!res || !res.trackingToken) throw Object.assign(new Error(L("The store did not confirm the order. Please try again.", "لم يؤكّد المتجر الطلب. حاول مرة أخرى.")), { status: 500 });
      } catch (e) {
        setBusy(false, L("Place order", "تأكيد الطلب"));
        if (e.network) {
          // The request may have arrived even though the answer didn't.
          showError(L("We couldn't confirm your order because the connection dropped. It may still have reached the store — check WhatsApp for a confirmation before sending it again.",
            "تعذّر تأكيد طلبك بسبب انقطاع الاتصال. ربما وصل الطلب إلى المتجر — تحقّق من رسالة التأكيد على واتساب قبل إعادة الإرسال."));
        } else {
          safeStorage.del(pages.checkout._pendingKey());
          showError(e.message || L("Could not place the order.", "تعذّر إرسال الطلب."));
        }
        return;
      }

      safeStorage.del(pages.checkout._pendingKey());
      safeStorage.set(pages.checkout._lastKey(), JSON.stringify({ fp, at: Date.now(), token: res.trackingToken, number: res.orderNumber }));

      // Best-effort extras; never let them hold the customer up for long.
      const extras = [];
      if (auth.isLoggedIn() && f.type === "delivery" && !savedA && f.saveAddr) {
        extras.push(api.addresses.create({
          label: area || f.area.trim() || L("Home", "المنزل"),
          street: f.street.trim(),
          city: area || f.area.trim() || "-",
          buildingName, floor, notes: addressNotes,
          lat: f.lat != null ? String(f.lat) : null, lng: f.lng != null ? String(f.lng) : null,
          isDefault: f.addresses.length === 0,
        }).catch(() => {}));
      }
      if (auth.isLoggedIn() && !auth.displayName() && f.name.trim()) {
        extras.push(api.auth.updateMe({ name: f.name.trim() }).then(() => auth.loadMe()).catch(() => {}));
      }
      if (extras.length) await Promise.race([Promise.all(extras), kx.wait(3000)]);

      cart.clear();
      if (payMethod === "shamcash" && f.payInfo && f.payInfo.shamcash) return pages.checkout._shamPanel(container, res, f.payInfo.shamcash);
      if (payMethod === "card") return pages.checkout._cardPanel(container, res);
      pages.checkout._goTrack(res.trackingToken);
    };

    draw();

    // Fill in the slower data without holding the page.
    const loads = [
      shop.payments().then(p => { f.payInfo = p; }),
    ];
    if (types.indexOf("delivery") >= 0) loads.push(shop.zones().then(z => { f.zones = z.slice().sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)); }));
    if (auth.isLoggedIn()) {
      loads.push(api.addresses.list().then(a => {
        f.addresses = Array.isArray(a) ? a : [];
        const def = f.addresses.find(x => x.isDefault) || f.addresses[0];
        if (def && !f.street) { f.addrId = def.id; if (def.lat && def.lng) { f.lat = Number(def.lat); f.lng = Number(def.lng); } }
      }).catch(() => {}));
      const cu = auth.getCustomer();
      if (storeCfg.enableWallet && cu && cu.id) {
        loads.push(api.wallet.get(cu.id).then(w => { f.wallet = Math.max(0, Number(w && w.balance) || 0); }).catch(() => {}));
      }
    }
    loads.forEach(p => p.then(() => { if (alive() && !pages.checkout._busy && byId("co-form")) redraw(); }).catch(() => {}));
  },

  _goTrack(token) {
    location.replace(kx.trackUrl(token) + "&new=1");
  },

  /** Optional GPS / map pin. The typed address is always enough on its own. */
  _pickLocation(f, storeCfg, done) {
    const cfg = kx.cfg;
    const country = shop.storeCountry();
    const fallback = country === "SY" ? [33.5138, 36.2765] : country === "EG" ? [30.0444, 31.2357] : [47.3769, 8.5417];
    const start = f.lat != null ? [f.lat, f.lng] : (cfg.defaultLat && cfg.defaultLng ? [Number(cfg.defaultLat), Number(cfg.defaultLng)] : fallback);
    const sh = sheet(`
      <h2 class="sheet__title">${esc(L("Your location", "موقعك"))}</h2>
      <p class="small muted">${esc(L("Optional — it helps the driver find you. Move the map so the pin is on your door.", "اختياري — يساعد المندوب في الوصول إليك. حرّك الخريطة ليكون الدبوس على بابك."))}</p>
      <button type="button" class="btn btn-soft btn-block" data-gps>${icon("locate-fixed", "icon-sm")} ${esc(L("Use my current location", "استخدم موقعي الحالي"))}</button>
      <div class="map-box" id="loc-map"><div class="map-box__msg">${esc(L("Loading map…", "جارٍ تحميل الخريطة…"))}</div><span class="map-box__pin" hidden>${icon("map-pin", "icon-xl")}</span></div>
      <p class="field__err" data-msg hidden></p>
      <button type="button" class="btn btn-primary btn-lg btn-block" data-use disabled>${esc(L("Use this location", "استخدم هذا الموقع"))}</button>`,
      { label: L("Your location", "موقعك") });
    const root = sh.body;
    const msg = root.querySelector("[data-msg]");
    const useBtn = root.querySelector("[data-use]");
    let map = null, picked = null;
    const say = (t) => { msg.textContent = t; msg.hidden = !t; };

    loadLeaflet().then(Lf => {
      if (sh.closed) return;
      const box = root.querySelector("#loc-map");
      box.querySelector(".map-box__msg").remove();
      box.querySelector(".map-box__pin").hidden = false;
      map = Lf.map(box, { zoomControl: true, attributionControl: true }).setView(start, f.lat != null ? 17 : 13);
      Lf.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(map);
      map.on("moveend", () => { picked = map.getCenter(); useBtn.disabled = false; });
      if (f.lat != null) { picked = { lat: f.lat, lng: f.lng }; useBtn.disabled = false; }
      setTimeout(() => map.invalidateSize(), 250);
    }).catch(() => {
      const box = root.querySelector("#loc-map");
      if (box) box.innerHTML = `<div class="map-box__msg">${icon("map", "icon-lg")}<span>${esc(L("The map couldn't load on this connection. You can use your current location, or skip — your typed address is enough.", "تعذّر تحميل الخريطة على هذا الاتصال. يمكنك استخدام موقعك الحالي أو التخطي — العنوان المكتوب يكفي."))}</span></div>`;
      refreshIcons();
    });

    root.querySelector("[data-gps]").onclick = (e) => {
      const btn = e.currentTarget;
      if (!navigator.geolocation) return say(L("Location is not available on this device.", "الموقع غير متاح على هذا الجهاز."));
      btn.disabled = true; btn.classList.add("is-loading"); say("");
      navigator.geolocation.getCurrentPosition(pos => {
        btn.disabled = false; btn.classList.remove("is-loading");
        picked = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        useBtn.disabled = false;
        if (map) map.setView([picked.lat, picked.lng], 17);
        else { f.lat = picked.lat; f.lng = picked.lng; sh.close(); done(); showToast(L("Location added", "تمت إضافة الموقع"), "success"); }
      }, err => {
        btn.disabled = false; btn.classList.remove("is-loading");
        say(err && err.code === 1
          ? L("Location permission was denied. You can still place the order with your typed address.", "تم رفض إذن الموقع. يمكنك إتمام الطلب بالعنوان المكتوب.")
          : L("Couldn't get your location. You can still place the order with your typed address.", "تعذّر تحديد موقعك. يمكنك إتمام الطلب بالعنوان المكتوب."));
      }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
    };
    useBtn.onclick = () => {
      if (!picked) return;
      f.lat = Math.round(picked.lat * 1e6) / 1e6;
      f.lng = Math.round(picked.lng * 1e6) / 1e6;
      sh.close();
      done();
    };
  },

  // ── After the order: Sham Cash manual transfer ─────────────────────────
  _shamPanel(container, order, sc) {
    const amount = formatCurrency(order.totalAmount);
    const qr = sc.qrImage ? (/^data:image\//i.test(sc.qrImage) ? sc.qrImage : fixImageUrl(sc.qrImage)) : "";
    container.innerHTML = `
${ui.topBar(L("Pay with Sham Cash", "الدفع عبر شام كاش"), { back: "home" })}
<div class="page page--pay">
  <div class="done-head">
    <span class="done-head__icon">${icon("check", "icon-lg")}</span>
    <div><h1 class="done-head__title">${esc(L("Order received", "تم استلام طلبك"))}</h1>
    <p class="muted">${esc(L("Order", "الطلب"))} #${esc(order.orderNumber || order.orderId)}</p></div>
  </div>
  <section class="card sham">
    <p>${esc(L("Send exactly this amount to the store's Sham Cash account, then enter the transaction number so the store can match your payment.", "حوّل هذا المبلغ بالضبط إلى حساب شام كاش الخاص بالمتجر، ثم أدخل رقم العملية ليتمكن المتجر من مطابقة دفعتك."))}</p>
    <div class="sham__amount"><span>${esc(L("Amount", "المبلغ"))}</span><strong>${esc(amount)}</strong>
      <button type="button" class="btn btn-ghost btn-sm" data-copy="${esc(String(Math.round(Number(order.totalAmount) * 100) / 100))}">${icon("copy", "icon-sm")} ${esc(L("Copy", "نسخ"))}</button></div>
    ${qr ? `<img class="sham__qr" src="${esc(qr)}" alt="${esc(L("Sham Cash QR code", "رمز QR لشام كاش"))}" loading="lazy">` : ""}
    ${sc.phone ? `<div class="kv"><span>${esc(L("Account / number", "رقم الحساب"))}</span><strong dir="ltr">${esc(sc.phone)}</strong>
      <button type="button" class="btn btn-ghost btn-sm" data-copy="${esc(sc.phone)}">${icon("copy", "icon-sm")} ${esc(L("Copy", "نسخ"))}</button></div>` : ""}
    ${sc.holderName ? `<div class="kv"><span>${esc(L("Account name", "اسم صاحب الحساب"))}</span><strong>${esc(sc.holderName)}</strong></div>` : ""}
    <ol class="steps">
      <li>${esc(L("Open the Sham Cash app.", "افتح تطبيق شام كاش."))}</li>
      <li>${esc(qr ? L("Scan the code or send to the number above.", "امسح الرمز أو حوّل إلى الرقم أعلاه.") : L("Send to the number above.", "حوّل إلى الرقم أعلاه."))}</li>
      <li>${esc(L("Enter the transaction number below.", "أدخل رقم العملية في الأسفل."))}</li>
    </ol>
    <form id="sham-form" novalidate>
      <label class="field">
        <span class="field__label">${esc(L("Transaction number", "رقم العملية"))}</span>
        <input class="input" id="sham-ref" inputmode="text" dir="ltr" maxlength="40" autocomplete="off">
      </label>
      <p class="field__err" id="sham-err" hidden></p>
      <button class="btn btn-primary btn-lg btn-block" type="submit">${esc(L("Send transaction number", "أرسل رقم العملية"))}</button>
    </form>
    <button type="button" class="btn btn-ghost btn-block" data-later>${esc(L("I'll pay later — track my order", "سأدفع لاحقاً — تتبّع طلبي"))}</button>
    <p class="small muted">${esc(L("Your order stays unpaid until the store confirms the transfer.", "يبقى الطلب غير مدفوع حتى يؤكّد المتجر استلام التحويل."))}</p>
  </section>
</div>`;
    refreshIcons();
    window.scrollTo(0, 0);
    pages.checkout._bindCopy(container);
    container.querySelector("[data-later]").onclick = () => pages.checkout._goTrack(order.trackingToken);
    const form = container.querySelector("#sham-form");
    form.onsubmit = async (e) => {
      e.preventDefault();
      const input = container.querySelector("#sham-ref");
      const errEl = container.querySelector("#sham-err");
      const ref = kx.latinDigits(input.value).replace(/[^\w\- ]/g, "").trim();
      if (ref.length < 3) { errEl.textContent = L("Enter the transaction number from Sham Cash.", "أدخل رقم العملية من شام كاش."); errEl.hidden = false; return; }
      const btn = form.querySelector("button");
      if (btn.disabled) return;
      btn.disabled = true; btn.classList.add("is-loading"); errEl.hidden = true;
      try {
        await api.payments.shamCashReference(order.orderId, order.trackingToken, ref);
        showToast(L("Thanks! The store will confirm your payment.", "شكراً! سيؤكّد المتجر دفعتك."), "success", 4000);
        pages.checkout._goTrack(order.trackingToken);
      } catch (ex) {
        errEl.textContent = ex.message; errEl.hidden = false;
        btn.disabled = false; btn.classList.remove("is-loading");
      }
    };
  },

  _bindCopy(root) {
    root.querySelectorAll("[data-copy]").forEach(b => b.onclick = () => {
      const text = b.getAttribute("data-copy");
      const ok = () => showToast(L("Copied", "تم النسخ"), "success", 1500);
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(ok, () => fallback());
      else fallback();
      function fallback() {
        const t = document.createElement("textarea");
        t.value = text; t.setAttribute("readonly", ""); t.style.position = "fixed"; t.style.opacity = "0";
        document.body.appendChild(t); t.select();
        try { document.execCommand("copy"); ok(); } catch (_) {}
        t.remove();
      }
    });
  },

  // ── After the order: card (Stripe PaymentElement) ──────────────────────
  _cardPanel(container, order) {
    container.innerHTML = `
${ui.topBar(L("Pay by card", "الدفع بالبطاقة"), { back: "home" })}
<div class="page page--pay">
  <div class="done-head">
    <span class="done-head__icon">${icon("check", "icon-lg")}</span>
    <div><h1 class="done-head__title">${esc(L("Order received", "تم استلام طلبك"))}</h1>
    <p class="muted">${esc(L("Order", "الطلب"))} #${esc(order.orderNumber || order.orderId)} · ${esc(formatCurrency(order.totalAmount))}</p></div>
  </div>
  <section class="card">
    <div id="pay-element" class="pay-element">${ui.spinner(L("Loading secure payment…", "جارٍ تحميل الدفع الآمن…"))}</div>
    <p class="field__err" id="pay-err" role="alert" hidden></p>
    <button type="button" class="btn btn-primary btn-lg btn-block" id="pay-btn" disabled>${esc(L("Pay", "ادفع"))} ${esc(formatCurrency(order.totalAmount))}</button>
    <button type="button" class="btn btn-ghost btn-block" data-later>${esc(L("Pay later — track my order", "الدفع لاحقاً — تتبّع طلبي"))}</button>
  </section>
</div>`;
    refreshIcons();
    window.scrollTo(0, 0);
    const errEl = container.querySelector("#pay-err");
    const btn = container.querySelector("#pay-btn");
    const say = (m) => { errEl.textContent = m || ""; errEl.hidden = !m; };
    container.querySelector("[data-later]").onclick = () => {
      showToast(L("Your order is placed as unpaid. You can pay from the tracking page.", "طلبك مسجّل كغير مدفوع. يمكنك الدفع من صفحة التتبع."), "info", 5000);
      pages.checkout._goTrack(order.trackingToken);
    };
    const start = async () => {
      say("");
      try {
        if (!window.KassentaPay) throw new Error(L("Card payment is unavailable.", "الدفع بالبطاقة غير متاح."));
        if (!KassentaPay.config) await KassentaPay.init({ basePath: "", tenantId: kx.cfg.tenantId });
        const intent = await KassentaPay.createOrderIntent(order.orderId, order.trackingToken);
        const box = container.querySelector("#pay-element");
        box.innerHTML = "";
        await KassentaPay.mount(box, intent.clientSecret, {
          dark: document.documentElement.getAttribute("data-theme") === "dark",
          primaryColor: getComputedStyle(document.documentElement).getPropertyValue("--delivery-primary").trim() || undefined,
          locale: kx.lang(),
        });
        btn.disabled = false;
      } catch (e) {
        say(e.message || L("Could not start the payment.", "تعذّر بدء الدفع."));
        const box = container.querySelector("#pay-element");
        box.innerHTML = `<button type="button" class="btn btn-soft btn-block" data-retry-pay>${icon("refresh-cw", "icon-sm")} ${esc(L("Try again", "أعد المحاولة"))}</button>`;
        refreshIcons();
        box.querySelector("[data-retry-pay]").onclick = () => { box.innerHTML = ui.spinner(); start(); };
      }
    };
    btn.onclick = async () => {
      if (btn.disabled) return;
      btn.disabled = true; btn.classList.add("is-loading"); say("");
      try {
        const back = KassentaPay.returnUrl({ order_id: order.orderId, tracking_token: order.trackingToken });
        const intent = await KassentaPay.confirm(back);
        if (!intent) return; // redirected away; resumed on return
        const res = await KassentaPay.waitForSettlement(intent.id, { timeoutMs: 40000 });
        pages.checkout._finishPayment(res, order.trackingToken);
      } catch (e) {
        say(e.message || L("Payment failed.", "فشل الدفع."));
        btn.disabled = false; btn.classList.remove("is-loading");
      }
    };
    start();
  },

  /** Back from a redirect payment: wait for our own record before saying "paid". */
  async _resumeRedirect(container) {
    if (!window.KassentaPay) return false;
    const ret = KassentaPay.pendingReturn();
    if (!ret || !ret.paymentIntentId) return false;
    KassentaPay.clearReturn();
    container.innerHTML = `<div class="state state--loading"><div class="spinner"></div>
      <h2 class="state__title">${esc(L("Confirming your payment…", "جارٍ تأكيد الدفع…"))}</h2>
      <p class="state__text">${esc(L("Please keep this page open.", "يرجى إبقاء هذه الصفحة مفتوحة."))}</p></div>`;
    const res = await KassentaPay.waitForSettlement(ret.paymentIntentId, { timeoutMs: 40000 });
    pages.checkout._finishPayment(res, ret.trackingToken);
    return true;
  },

  _finishPayment(res, token) {
    if (res.settled) showToast(L("Payment received — thank you!", "تم استلام الدفع — شكراً لك!"), "success", 5000);
    else if (["pending", "processing", "unknown"].indexOf(res.status) >= 0) showToast(L("Payment is still processing. Your order is placed.", "الدفع قيد المعالجة. طلبك مسجّل."), "info", 6000);
    else showToast(L("Payment was not completed. Your order is placed as unpaid.", "لم يكتمل الدفع. طلبك مسجّل كغير مدفوع."), "error", 7000);
    token = token || (res.order && res.order.trackingToken);
    if (token) pages.checkout._goTrack(token);
    else router.replace("home");
  },
};
