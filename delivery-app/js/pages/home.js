/**
 * home.js — store front page: cover, store facts, order type, search,
 * category tiles (real category/product photos), popular items, offers.
 */
window.pages = window.pages || {};

pages.home = {
  async render(params, container, alive) {
    container.innerHTML = pages.home._skeleton();
    const [storeCfg, menu] = await Promise.all([shop.config(), shop.menu()]);
    if (!alive()) return;
    const cfg = window.DELIVERY_CONFIG || {};
    const name = storeCfg.storeName || cfg.storeName || "";
    const cats = menu.categories.filter(c => menu.products.some(p => p.categoryId === c.id));
    const types = shop.orderTypes();
    const st = cart.getState();
    if (st.orderType !== "dine_in" && types.indexOf(st.orderType) < 0) cart.setOrderType(types[0]);

    // Popular: best sellers when the store has sales data, else the menu's
    // own order (never guess by price).
    const priced = menu.products.filter(p => Number(p.price) > 0 || shop.variants(p).length);
    const hasSales = priced.some(p => Number(p.salesCount) > 0);
    const popular = (hasSales ? priced.slice().sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0)) : priced).slice(0, 8);

    const cover = fixImageUrl(storeCfg.coverImage || cfg.coverImage || "");
    const logo = fixImageUrl(storeCfg.logo || cfg.logo || "");
    const fee = Number(storeCfg.deliveryFee) || 0;
    const minOrder = Number(storeCfg.minOrderAmount) || 0;
    const tMin = storeCfg.minDeliveryTime || cfg.minDeliveryTime, tMax = storeCfg.maxDeliveryTime || cfg.maxDeliveryTime;

    const facts = [];
    if (tMin && tMax) facts.push(`${icon("clock", "icon-sm")}<span>${esc(tMin + "–" + tMax)} ${esc(L("min", "دقيقة"))}</span>`);
    if (types.indexOf("delivery") >= 0) facts.push(`${icon("bike", "icon-sm")}<span>${fee > 0 ? esc(formatCurrency(fee)) : esc(L("Free delivery", "توصيل مجاني"))}</span>`);
    if (minOrder > 0) facts.push(`${icon("shopping-bag", "icon-sm")}<span>${esc(L("Min. ", "الحد الأدنى "))}${esc(formatCurrency(minOrder))}</span>`);

    container.innerHTML = `
<div class="home">
  <section class="store-hero">
    <div class="store-hero__cover">${cover ? `<img src="${esc(cover)}" alt="" decoding="async" fetchpriority="high" onerror="this.remove()">` : ""}</div>
    <div class="store-hero__card">
      <div class="store-hero__id">
        ${logo ? `<img class="store-hero__logo" src="${esc(logo)}" alt="" onerror="this.remove()">` : `<div class="store-hero__logo store-hero__logo--ph">${icon("store", "icon-lg")}</div>`}
        <div class="store-hero__txt">
          <h1 class="store-hero__name">${esc(name)}</h1>
          ${storeCfg.address ? `<p class="store-hero__addr">${icon("map-pin", "icon-xs")} ${esc(storeCfg.address)}</p>` : ""}
        </div>
      </div>
      ${facts.length ? `<div class="facts">${facts.map(f => `<span class="fact">${f}</span>`).join("")}</div>` : ""}
      ${storeCfg.openingHours ? `<p class="store-hero__hours">${icon("calendar-clock", "icon-xs")} ${esc(storeCfg.openingHours)}</p>` : ""}
      ${st.orderType === "dine_in" && st.tableName ? `<div class="notice notice--info">${icon("utensils", "icon-sm")} ${esc(L("Ordering for table ", "طلب للطاولة "))}<strong>${esc(st.tableName)}</strong></div>`
        : types.length > 1 ? `
      <div class="seg" role="radiogroup" aria-label="${esc(L("Order type", "نوع الطلب"))}">
        ${types.map(tp => `<button class="seg__btn ${st.orderType === tp ? "is-on" : ""}" role="radio" aria-checked="${st.orderType === tp}" data-type="${tp}">
          ${icon(tp === "delivery" ? "bike" : "store", "icon-sm")} ${tp === "delivery" ? esc(L("Delivery", "توصيل")) : esc(L("Pickup", "استلام من المتجر"))}</button>`).join("")}
      </div>` : ""}
      <button class="search-trigger" data-nav="search">${icon("search", "icon-md")}<span>${esc(L("Search the menu", "ابحث في القائمة"))}</span></button>
    </div>
  </section>

  <div id="home-promos"></div>

  ${cats.length ? `
  <section class="section">
    <div class="section__head"><h2 class="section__title">${esc(L("Categories", "الأقسام"))}</h2>
      <a class="link" href="${esc(router.url("menu"))}" data-nav="menu">${esc(L("Full menu", "القائمة كاملة"))}</a></div>
    <div class="cat-rail" role="list">
      ${cats.map(c => {
        const img = pages.home._categoryImage(c, menu.products);
        return `<button class="cat-tile" role="listitem" data-cat="${c.id}">
          <span class="cat-tile__img">${img ? `<img src="${esc(img)}" alt="" loading="lazy" decoding="async" onerror="this.remove()">` : icon("layout-grid", "icon-lg")}</span>
          <span class="cat-tile__name">${esc(shop.categoryName(c))}</span></button>`;
      }).join("")}
    </div>
  </section>` : ""}

  ${popular.length ? `
  <section class="section">
    <div class="section__head"><h2 class="section__title">${esc(hasSales ? L("Popular right now", "الأكثر طلباً") : L("Our picks", "مختارات لك"))}</h2>
      <a class="link" href="${esc(router.url("menu"))}" data-nav="menu">${esc(L("See all", "عرض الكل"))}</a></div>
    <div class="p-grid">${popular.map(ui.productCard).join("")}</div>
  </section>` : ui.empty("package-open", L("The menu is being prepared", "القائمة قيد التجهيز"), L("Please check back soon.", "يرجى العودة لاحقاً."))}

  ${storeCfg.enableLoyalty ? `
  <section class="section">
    <button class="promo-card" data-nav="rewards">
      <span class="promo-card__icon">${icon("award", "icon-lg")}</span>
      <span class="promo-card__txt"><strong>${esc(L("Earn points on every order", "اكسب نقاطاً مع كل طلب"))}</strong>
      <span>${esc(auth.isLoggedIn() ? L("See your points and rewards", "اطّلع على نقاطك ومكافآتك") : L("Sign in so your orders count", "سجّل الدخول لتُحتسب طلباتك"))}</span></span>
      ${icon(isRtl() ? "chevron-left" : "chevron-right", "icon-md")}
    </button>
  </section>` : ""}

  ${(storeCfg.phone || storeCfg.socialWhatsapp) ? `
  <section class="section store-contact">
    ${storeCfg.socialWhatsapp ? `<a class="btn btn-soft" href="https://wa.me/${esc(String(storeCfg.socialWhatsapp).replace(/\D/g, ""))}" target="_blank" rel="noopener">${icon("message-circle", "icon-sm")} ${esc(L("WhatsApp", "واتساب"))}</a>` : ""}
    ${storeCfg.phone ? `<a class="btn btn-soft" href="tel:${esc(String(storeCfg.phone).replace(/[^\d+]/g, ""))}">${icon("phone", "icon-sm")} ${esc(L("Call the store", "اتصل بالمتجر"))}</a>` : ""}
  </section>` : ""}
</div>`;

    container.querySelectorAll(".seg__btn").forEach(b => {
      b.onclick = () => {
        cart.setOrderType(b.dataset.type);
        container.querySelectorAll(".seg__btn").forEach(x => { x.classList.toggle("is-on", x === b); x.setAttribute("aria-checked", x === b); });
      };
    });
    container.querySelectorAll(".cat-tile").forEach(b => {
      b.onclick = () => { window._filterCatId = Number(b.dataset.cat); router.navigate("menu"); };
    });

    // Offers only when the store actually has active codes.
    if (storeCfg.enablePromos !== false) {
      shop.promos().then(promos => {
        const box = document.getElementById("home-promos");
        if (!box || !alive() || !promos.length) return;
        const p = promos[0];
        box.innerHTML = `<section class="section"><button class="promo-card promo-card--accent" data-nav="offers">
          <span class="promo-card__icon">${icon("ticket-percent", "icon-lg")}</span>
          <span class="promo-card__txt"><strong>${esc(pages.offers.discountLabel(p))}</strong>
          <span>${esc(L("Use code ", "استخدم الكود "))}<b class="code">${esc(p.code)}</b>${promos.length > 1 ? esc(L(" · more offers", " · عروض أخرى")) : ""}</span></span>
          ${icon(isRtl() ? "chevron-left" : "chevron-right", "icon-md")}</button></section>`;
        refreshIcons();
      });
    }
  },

  /** A category's own image, else a photo of one of its products. */
  _categoryImage(c, products) {
    if (c.image) return fixImageUrl(c.image);
    const withImg = products.find(p => p.categoryId === c.id && shop.productImage(p));
    return withImg ? shop.productImage(withImg) : "";
  },

  _skeleton() {
    return `<div class="home">
      <div class="store-hero"><div class="store-hero__cover skeleton"></div>
        <div class="store-hero__card"><div class="sk sk--title"></div><div class="sk sk--line"></div><div class="sk sk--pill"></div></div></div>
      <section class="section"><div class="sk sk--line" style="width:40%"></div>
        <div class="cat-rail">${'<div class="cat-tile"><span class="cat-tile__img skeleton"></span><span class="sk sk--line"></span></div>'.repeat(5)}</div></section>
      <section class="section"><div class="p-grid">${'<div class="p-card"><div class="p-card__media skeleton"></div><div class="p-card__body"><div class="sk sk--line"></div><div class="sk sk--line" style="width:50%"></div></div></div>'.repeat(4)}</div></section>
    </div>`;
  },
};
