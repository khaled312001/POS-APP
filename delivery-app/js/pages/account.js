/**
 * account.js — account hub, order history (with "order again"), saved
 * addresses, language and theme.
 */
window.pages = window.pages || {};

pages.account = {
  async render(params, container, alive) {
    const storeCfg = await shop.config();
    const logged = auth.isLoggedIn();
    let c = auth.getCustomer();
    const draw = () => {
      const name = auth.displayName(c);
      const theme = safeStorage.get("kassenta_theme") || "system";
      container.innerHTML = `
${ui.topBar(L("Account", "حسابي"))}
<div class="page page--account">
  ${logged ? `
  <section class="card profile">
    <span class="profile__avatar">${esc((name || "?").trim().charAt(0).toUpperCase())}</span>
    <div class="profile__txt">
      <strong>${esc(name || L("Welcome", "أهلاً بك"))}</strong>
      <span class="muted" dir="ltr">${esc((c && (c.phone || c.email)) || "")}</span>
    </div>
    <button class="btn btn-ghost btn-sm" data-edit>${icon("pencil", "icon-sm")} ${esc(L("Edit", "تعديل"))}</button>
  </section>` : `
  <section class="card signin-card">
    <span class="signin-card__icon">${icon("user-round", "icon-lg")}</span>
    <div><strong>${esc(L("Sign in for a better experience", "سجّل الدخول لتجربة أفضل"))}</strong>
    <p class="muted small">${esc(L("Track your orders, save addresses and earn rewards.", "تابع طلباتك واحفظ عناوينك واكسب المكافآت."))}</p></div>
    <button class="btn btn-primary btn-block" data-signin>${esc(L("Sign in with your mobile", "سجّل الدخول برقم موبايلك"))}</button>
  </section>`}

  <nav class="card menu-list" aria-label="${esc(L("Account", "حسابي"))}">
    ${logged ? `
    <button class="menu-list__item" data-nav="history">${icon("receipt", "icon-md")}<span>${esc(L("My orders", "طلباتي"))}</span>${chev()}</button>
    <button class="menu-list__item" data-nav="addresses">${icon("map-pin", "icon-md")}<span>${esc(L("Saved addresses", "العناوين المحفوظة"))}</span>${chev()}</button>
    <button class="menu-list__item" data-nav="favorites">${icon("heart", "icon-md")}<span>${esc(L("Favourites", "المفضلة"))}</span>${chev()}</button>
    ${storeCfg.enableLoyalty ? `<button class="menu-list__item" data-nav="rewards">${icon("award", "icon-md")}<span>${esc(L("Points & rewards", "النقاط والمكافآت"))}</span>${chev()}</button>` : ""}
    ${storeCfg.enableWallet ? `<div class="menu-list__item menu-list__item--static">${icon("wallet", "icon-md")}<span>${esc(L("Wallet balance", "رصيد المحفظة"))}</span><b id="wallet-bal">…</b></div>` : ""}
    ` : ""}
    ${storeCfg.enablePromos !== false ? `<button class="menu-list__item" data-nav="offers">${icon("ticket-percent", "icon-md")}<span>${esc(L("Offers", "العروض"))}</span>${chev()}</button>` : ""}
    <button class="menu-list__item" data-nav="reviews">${icon("star", "icon-md")}<span>${esc(L("Reviews", "التقييمات"))}</span>${chev()}</button>
    <button class="menu-list__item" data-nav="help">${icon("life-buoy", "icon-md")}<span>${esc(L("Help & contact", "المساعدة والتواصل"))}</span>${chev()}</button>
  </nav>

  <section class="card">
    <h2 class="card__title">${icon("languages", "icon-sm")} ${esc(L("Language", "اللغة"))}</h2>
    <div class="seg seg--sm">
      <button class="seg__btn ${kx.lang() === "ar" ? "is-on" : ""}" data-lang="ar" lang="ar">العربية</button>
      <button class="seg__btn ${kx.lang() === "en" ? "is-on" : ""}" data-lang="en" lang="en">English</button>
    </div>
    <h2 class="card__title">${icon("sun-moon", "icon-sm")} ${esc(L("Appearance", "المظهر"))}</h2>
    <div class="seg seg--sm">
      ${[["system", L("Auto", "تلقائي")], ["light", L("Light", "فاتح")], ["dark", L("Dark", "داكن")]].map(([k, t]) =>
        `<button class="seg__btn ${theme === k ? "is-on" : ""}" data-theme-set="${k}">${esc(t)}</button>`).join("")}
    </div>
  </section>

  ${logged ? `<button class="btn btn-ghost btn-danger-text btn-block" data-logout>${icon("log-out", "icon-sm")} ${esc(L("Sign out", "تسجيل الخروج"))}</button>` : ""}
  <p class="small muted center">${esc(storeCfg.storeName || "")} · ${esc(L("Powered by Kassenta", "بدعم من Kassenta"))}</p>
</div>`;
      bind();
      refreshIcons();
      if (logged && storeCfg.enableWallet && c && c.id) {
        api.wallet.get(c.id).then(w => {
          const el = container.querySelector("#wallet-bal");
          if (el) el.textContent = formatCurrency(Number(w && w.balance) || 0);
        }).catch(() => { const el = container.querySelector("#wallet-bal"); if (el) el.textContent = "—"; });
      }
    };
    const chev = () => icon(isRtl() ? "chevron-left" : "chevron-right", "icon-sm menu-list__chev");

    const bind = () => {
      const si = container.querySelector("[data-signin]");
      if (si) si.onclick = () => auth.requireLogin("account");
      container.querySelectorAll("[data-lang]").forEach(b => b.onclick = () => { if (b.dataset.lang !== kx.lang()) kx.setLang(b.dataset.lang); });
      container.querySelectorAll("[data-theme-set]").forEach(b => b.onclick = () => {
        window.setTheme && window.setTheme(b.dataset.themeSet);
        container.querySelectorAll("[data-theme-set]").forEach(x => x.classList.toggle("is-on", x === b));
      });
      const lo = container.querySelector("[data-logout]");
      if (lo) lo.onclick = async () => {
        if (!(await confirmDialog(L("Sign out of your account?", "هل تريد تسجيل الخروج؟"), L("Sign out", "تسجيل الخروج"), true))) return;
        await Promise.race([auth.logout(), kx.wait(3000)]);
        showToast(L("Signed out", "تم تسجيل الخروج"), "success");
        router.replace("home");
      };
      const ed = container.querySelector("[data-edit]");
      if (ed) ed.onclick = () => pages.account._editProfile(() => { c = auth.getCustomer(); draw(); });
    };

    draw();
    if (logged) auth.loadMe().then(fresh => { if (fresh && alive()) { c = fresh; draw(); } });
  },

  _editProfile(done) {
    const c = auth.getCustomer() || {};
    const sh = sheet(`
      <h2 class="sheet__title">${esc(L("Edit profile", "تعديل الملف الشخصي"))}</h2>
      <form id="pf" novalidate>
        <label class="field"><span class="field__label">${esc(L("Name", "الاسم"))}</span>
          <input class="input" id="pf-name" maxlength="80" value="${esc(auth.displayName(c))}" autocomplete="name"></label>
        <label class="field"><span class="field__label">${esc(L("Email", "البريد الإلكتروني"))} <span class="muted">(${esc(L("optional", "اختياري"))})</span></span>
          <input class="input" id="pf-email" type="email" dir="ltr" maxlength="120" value="${esc(c.email || "")}" autocomplete="email"></label>
        ${c.phone ? `<label class="field"><span class="field__label">${esc(L("Mobile", "الموبايل"))}</span>
          <input class="input" value="${esc(c.phone)}" dir="ltr" disabled></label>` : ""}
        <p class="field__err" id="pf-err" hidden></p>
        <button class="btn btn-primary btn-lg btn-block" type="submit">${esc(L("Save", "حفظ"))}</button>
      </form>`, { label: L("Edit profile", "تعديل الملف الشخصي") });
    const form = sh.body.querySelector("#pf");
    form.onsubmit = async (e) => {
      e.preventDefault();
      const btn = form.querySelector("button[type=submit]");
      if (btn.disabled) return;
      const name = form.querySelector("#pf-name").value.trim();
      const email = form.querySelector("#pf-email").value.trim();
      const err = form.querySelector("#pf-err");
      if (name.length < 2) { err.textContent = L("Enter your name", "أدخل اسمك"); err.hidden = false; return; }
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { err.textContent = L("Enter a valid email", "أدخل بريداً إلكترونياً صحيحاً"); err.hidden = false; return; }
      btn.disabled = true; btn.classList.add("is-loading"); err.hidden = true;
      try {
        await api.auth.updateMe({ name, email: email || undefined });
        await auth.loadMe();
        sh.close();
        showToast(L("Saved", "تم الحفظ"), "success");
        done();
      } catch (ex) {
        err.textContent = ex.message; err.hidden = false;
        btn.disabled = false; btn.classList.remove("is-loading");
      }
    };
  },

  // ── Order history ─────────────────────────────────────────────────────
  async renderHistory(params, container, alive) {
    if (!auth.isLoggedIn()) {
      // Guests: their most recent order from this device, plus a way to see all of them.
      const last = safeStorage.json("kassenta_last_order_" + kx.cfg.tenantId, null);
      const recent = last && last.token && Date.now() - last.at < 14 * 864e5;
      container.innerHTML = ui.topBar(L("My orders", "طلباتي"), { back: "home" }) + `<div class="page">
        ${recent ? `<a class="promo-card" href="${esc(kx.trackUrl(last.token))}">
          <span class="promo-card__icon">${icon("navigation", "icon-lg")}</span>
          <span class="promo-card__txt"><strong>${esc(L("Your last order", "طلبك الأخير"))} ${last.number ? "#" + esc(last.number) : ""}</strong>
          <span>${esc(kx.fmtDate(last.at, true))} · ${esc(L("Track it", "تتبّعه"))}</span></span>
          ${icon(isRtl() ? "chevron-left" : "chevron-right", "icon-md")}</a>` : ""}
        ${ui.empty("receipt", L("See all your orders", "اطّلع على كل طلباتك"), L("Sign in with the mobile number you order with.", "سجّل الدخول برقم الموبايل الذي تطلب به."),
          `<button class="btn btn-primary" data-signin>${esc(L("Sign in", "تسجيل الدخول"))}</button>`)}
      </div>`;
      container.querySelector("[data-signin]").onclick = () => auth.requireLogin("history");
      return;
    }
    container.innerHTML = ui.topBar(L("My orders", "طلباتي"), { back: "account" }) +
      `<div class="page">${'<div class="card"><div class="sk sk--line"></div><div class="sk sk--line" style="width:60%"></div></div>'.repeat(3)}</div>`;
    const orders = await api.orders.history(kx.cfg.tenantId);
    if (!alive()) return;
    const list = (Array.isArray(orders) ? orders : []).slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    if (!list.length) {
      container.innerHTML = ui.topBar(L("My orders", "طلباتي"), { back: "account" }) +
        ui.empty("receipt", L("No orders yet", "لا توجد طلبات بعد"), L("Your orders will appear here.", "ستظهر طلباتك هنا."),
          `<button class="btn btn-primary" data-nav="menu">${esc(L("Start ordering", "ابدأ الطلب"))}</button>`);
      return;
    }
    const active = (s) => ["pending", "accepted", "confirmed", "preparing", "ready", "on_way", "out_for_delivery"].indexOf(s) >= 0;
    container.innerHTML = `
${ui.topBar(L("My orders", "طلباتي"), { back: "account" })}
<div class="page page--orders">
  ${list.map(o => {
    const items = pages.account._items(o);
    const cur = o.currency || undefined;
    return `<article class="card order-card">
      <header class="order-card__head">
        <div><strong>#${esc(o.orderNumber || o.id)}</strong><span class="muted small">${esc(kx.fmtDate(o.createdAt, true))}</span></div>
        <span class="status status--${esc(o.status)}">${esc(kx.statusLabel(o.status, o.orderType))}</span>
      </header>
      <p class="order-card__items">${esc(items.map(i => i.quantity + "× " + (i.name || i.productName || "")).join("، "))}</p>
      <footer class="order-card__foot">
        <span class="price">${esc(formatCurrency(o.totalAmount, cur))}</span>
        <div class="order-card__btns">
          ${o.trackingToken ? `<a class="btn ${active(o.status) ? "btn-primary" : "btn-ghost"} btn-sm" href="${esc(kx.trackUrl(o.trackingToken))}">${icon(active(o.status) ? "navigation" : "eye", "icon-sm")} ${esc(active(o.status) ? L("Track", "تتبّع") : L("Details", "التفاصيل"))}</a>` : ""}
          ${items.length ? `<button class="btn btn-soft btn-sm" data-reorder="${o.id}">${icon("rotate-ccw", "icon-sm")} ${esc(L("Order again", "اطلب مجدداً"))}</button>` : ""}
        </div>
      </footer>
    </article>`;
  }).join("")}
</div>`;
    container.querySelectorAll("[data-reorder]").forEach(b => b.onclick = async () => {
      const o = list.find(x => String(x.id) === b.dataset.reorder);
      b.disabled = true;
      try { await pages.account.reorder(o); } catch (e) { showToast(e.message, "error"); }
      b.disabled = false;
    });
  },

  _items(o) {
    let items = o.items;
    if (typeof items === "string") { try { items = JSON.parse(items); } catch (e) { items = []; } }
    return Array.isArray(items) ? items : [];
  },

  /**
   * Put a past order back in the cart at today's prices — the customer
   * reviews it and checks out normally (nothing is ordered behind their back).
   */
  async reorder(order) {
    const menu = await shop.menu();
    const missing = [];
    let added = 0;
    pages.account._items(order).forEach(it => {
      const p = menu.byId[it.productId];
      if (!p) { missing.push(it.name || it.productName || ""); return; }
      let variant = null;
      if (it.variant) {
        variant = shop.variants(p).find(v => v.name === it.variant) || null;
        if (!variant) { missing.push(shop.productName(p)); return; }
      }
      const groups = shop.modGroups(p);
      const mods = [];
      (Array.isArray(it.modifiers) ? it.modifiers : []).forEach(line => {
        const s = String(line && (line.name || line) || "");
        const i = s.indexOf(": ");
        const gName = i >= 0 ? s.slice(0, i) : "";
        const labels = (i >= 0 ? s.slice(i + 2) : s).split(", ");
        const g = groups.find(x => x.name === gName) || (gName ? null : groups[0]);
        if (!g) return;
        labels.forEach(lb => {
          const opt = g.options.find(o => o.label === lb.trim());
          if (opt) mods.push({ group: g.name, label: opt.label, price: opt.price });
        });
      });
      cart.add(p, { qty: Number(it.quantity) || 1, variant, mods, notes: it.notes || "" });
      added++;
    });
    if (!added) throw new Error(L("These items are no longer available.", "هذه الأصناف لم تعد متوفرة."));
    if (missing.length) showToast(L("Not available any more: ", "لم يعد متوفراً: ") + missing.filter(Boolean).join("، "), "info", 5000);
    else showToast(L("Added to your cart — check it and order.", "أُضيف إلى سلتك — راجعها ثم اطلب."), "success");
    router.navigate("cart");
  },

  // ── Saved addresses ───────────────────────────────────────────────────
  async renderAddresses(params, container, alive) {
    if (!auth.isLoggedIn()) { auth.requireLogin("addresses"); return; }
    const top = ui.topBar(L("Saved addresses", "العناوين المحفوظة"), { back: "account",
      right: `<button class="icon-btn" data-add aria-label="${esc(L("Add address", "إضافة عنوان"))}">${icon("plus", "icon-md")}</button>` });
    container.innerHTML = top + ui.spinner();
    const load = async () => {
      const list = await api.addresses.list();
      if (!alive()) return;
      const rows = Array.isArray(list) ? list : [];
      container.innerHTML = top + (rows.length ? `<div class="page">${rows.map(a => `
        <article class="card addr-card">
          <div class="addr-card__txt">
            <strong>${icon("map-pin", "icon-sm")} ${esc(a.label || L("Address", "عنوان"))} ${a.isDefault ? `<span class="badge">${esc(L("Default", "افتراضي"))}</span>` : ""}</strong>
            <span class="muted">${esc([a.city, a.street, a.buildingName, a.floor ? L("Floor ", "طابق ") + a.floor : ""].filter(Boolean).join("، "))}</span>
            ${a.notes ? `<span class="muted small">${esc(a.notes)}</span>` : ""}
          </div>
          <div class="addr-card__btns">
            ${a.isDefault ? "" : `<button class="btn btn-ghost btn-sm" data-def="${a.id}">${esc(L("Make default", "اجعله افتراضياً"))}</button>`}
            <button class="btn btn-ghost btn-sm btn-danger-text" data-del="${a.id}" aria-label="${esc(L("Delete", "حذف"))}">${icon("trash-2", "icon-sm")}</button>
          </div>
        </article>`).join("")}</div>`
        : ui.empty("map-pin", L("No saved addresses", "لا توجد عناوين محفوظة"), L("Addresses you save at checkout appear here.", "تظهر هنا العناوين التي تحفظها عند إتمام الطلب."),
          `<button class="btn btn-primary" data-add>${icon("plus", "icon-sm")} ${esc(L("Add address", "إضافة عنوان"))}</button>`));
      refreshIcons();
      container.querySelectorAll("[data-add]").forEach(b => b.onclick = () => pages.account._addressForm(load));
      container.querySelectorAll("[data-def]").forEach(b => b.onclick = async () => {
        b.disabled = true;
        try { await api.addresses.setDefault(b.dataset.def); await load(); } catch (e) { showToast(e.message, "error"); b.disabled = false; }
      });
      container.querySelectorAll("[data-del]").forEach(b => b.onclick = async () => {
        if (!(await confirmDialog(L("Delete this address?", "حذف هذا العنوان؟"), L("Delete", "حذف"), true))) return;
        b.disabled = true;
        try { await api.addresses.delete(b.dataset.del); await load(); } catch (e) { showToast(e.message, "error"); b.disabled = false; }
      });
    };
    await load();
  },

  _addressForm(onSaved) {
    const sh = sheet(`
      <h2 class="sheet__title">${esc(L("New address", "عنوان جديد"))}</h2>
      <form id="af" novalidate>
        <label class="field"><span class="field__label">${esc(L("Label", "التسمية"))}</span>
          <input class="input" id="af-label" maxlength="40" placeholder="${esc(L("Home, Work…", "المنزل، العمل…"))}"></label>
        <label class="field"><span class="field__label">${esc(L("Area / neighbourhood", "المنطقة / الحي"))} *</span>
          <input class="input" id="af-city" maxlength="80"></label>
        <label class="field"><span class="field__label">${esc(L("Street", "الشارع"))} *</span>
          <input class="input" id="af-street" maxlength="120"></label>
        <div class="grid-2">
          <label class="field"><span class="field__label">${esc(L("Building", "البناء"))}</span><input class="input" id="af-building" maxlength="80"></label>
          <label class="field"><span class="field__label">${esc(L("Floor / apartment", "الطابق / الشقة"))}</span><input class="input" id="af-floor" maxlength="30"></label>
        </div>
        <label class="field"><span class="field__label">${esc(L("Directions for the driver", "إرشادات للمندوب"))}</span><input class="input" id="af-notes" maxlength="200"></label>
        <p class="field__err" id="af-err" hidden></p>
        <button class="btn btn-primary btn-lg btn-block" type="submit">${esc(L("Save address", "حفظ العنوان"))}</button>
      </form>`, { label: L("New address", "عنوان جديد") });
    const form = sh.body.querySelector("#af");
    const v = (id) => form.querySelector("#" + id).value.trim();
    form.onsubmit = async (e) => {
      e.preventDefault();
      const btn = form.querySelector("button[type=submit]");
      const err = form.querySelector("#af-err");
      if (btn.disabled) return;
      if (!v("af-city") || v("af-street").length < 2) { err.textContent = L("Enter the area and street", "أدخل المنطقة والشارع"); err.hidden = false; return; }
      btn.disabled = true; btn.classList.add("is-loading"); err.hidden = true;
      try {
        await api.addresses.create({
          label: v("af-label") || v("af-city"), city: v("af-city"), street: v("af-street"),
          buildingName: v("af-building") || null, floor: v("af-floor") || null, notes: v("af-notes") || null,
        });
        sh.close();
        showToast(L("Address saved", "تم حفظ العنوان"), "success");
        onSaved();
      } catch (ex) {
        err.textContent = ex.message; err.hidden = false;
        btn.disabled = false; btn.classList.remove("is-loading");
      }
    };
  },
};
