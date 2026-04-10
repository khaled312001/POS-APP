/**
 * home.js — Just Eat-style home page
 * Hero · Service tabs · Cuisine grid · Banner carousel · Popular items · Promo strip
 */
window.pages = window.pages || {};

pages.home = {
  _storeConfig: null,
  _menu: null,
  _bannerTimer: null,
  _bannerIdx: 0,
  _allProducts: [],

  async render(params, container) {
    const cfg = window.DELIVERY_CONFIG || {};
    const slug = cfg.slug || "";
    const rtl = isRtl();
    const t = pages.home._t;

    container.innerHTML = pages.home._skeleton();

    try {
      const [storeConfig, menu] = await Promise.all([
        api.store.getConfig(slug).catch(() => ({})),
        api.store.getMenu(slug).catch(() => ({ categories: [], allProducts: [] })),
      ]);

      pages.home._storeConfig = storeConfig;
      pages.home._menu = menu;
      pages.home._allProducts = menu?.allProducts || menu?.products || [];

      const banners      = storeConfig?.bannerImages || [];
      const categories   = menu?.categories || [];
      const allProducts  = pages.home._allProducts;
      const popular      = [...allProducts].sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0)).slice(0, 8);
      const featuredPromos = storeConfig?.promoText || null;

      // Cuisine categories (from actual menu categories + generic icons)
      const cuisineIcons = { en: {
        "Pizza":"🍕","Burger":"🍔","Sushi":"🍣","Chicken":"🍗","Pasta":"🍝",
        "Salad":"🥗","Dessert":"🍰","Drinks":"🥤","Breakfast":"🥞","Sandwiches":"🥪",
        "Seafood":"🦞","Grill":"🔥","Vegan":"🌱","Soup":"🍲","Coffee":"☕",
      }, ar: {
        "بيتزا":"🍕","برجر":"🍔","سوشي":"🍣","دجاج":"🍗","باستا":"🍝",
        "سلطة":"🥗","حلويات":"🍰","مشروبات":"🥤","فطار":"🥞","ساندوتشات":"🥪",
        "مأكولات بحرية":"🦞","مشويات":"🔥","نباتي":"🌱","شوربة":"🍲","قهوة":"☕",
      } };
      const icons = cuisineIcons[rtl ? "ar" : "en"];

      container.innerHTML = `
<div class="home-page">

  <!-- ── Hero ──────────────────────────────────────────────────────── -->
  <section class="home-hero" aria-label="Search">
    <div class="home-hero__greeting">${rtl ? "أهلاً 👋" : "Hello 👋"}</div>
    <h1 class="home-hero__title">
      ${storeConfig?.tagline || (rtl ? "اطلب طعامك المفضل" : "Order your favourite food")}
    </h1>
    <p class="home-hero__subtitle">
      ${storeConfig?.storeName || cfg.storeName || (rtl ? "توصيل سريع لباب منزلك" : "Fast delivery to your door")}
    </p>

    <div class="search-bar">
      <svg class="search-bar__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      <input
        type="search"
        id="home-search"
        placeholder="${rtl ? "ابحث عن طعام أو عنصر..." : "Search for food or dishes…"}"
        autocomplete="off"
        aria-label="Search for food"
      />
    </div>

    <div class="home-hero__meta">
      <div class="home-hero__meta-item">
        ⏱ <strong>${cfg.minDeliveryTime || 20}–${cfg.maxDeliveryTime || 45} min</strong> ${rtl ? "توصيل" : "delivery"}
      </div>
      ${storeConfig?.deliveryFee != null ? `
      <div class="home-hero__meta-item">
        🚚 ${parseFloat(storeConfig.deliveryFee) === 0
          ? (rtl ? "<strong>توصيل مجاني</strong>" : "<strong>Free delivery</strong>")
          : formatCurrency(storeConfig.deliveryFee, cfg.currency) + " " + (rtl ? "توصيل" : "delivery")}
      </div>` : ""}
      ${storeConfig?.minOrderAmount ? `
      <div class="home-hero__meta-item">
        🛒 ${rtl ? "حد أدنى" : "Min."} <strong>${formatCurrency(storeConfig.minOrderAmount, cfg.currency)}</strong>
      </div>` : ""}
    </div>
  </section>

  <!-- ── Service tabs ───────────────────────────────────────────────── -->
  <div class="service-tabs" role="tablist">
    <button class="service-tab active" role="tab" aria-selected="true" onclick="pages.home._setServiceTab(this,'delivery')">
      🚴 ${rtl ? "توصيل" : "Delivery"}
    </button>
    <button class="service-tab" role="tab" aria-selected="false" onclick="pages.home._setServiceTab(this,'pickup')">
      🏃 ${rtl ? "استلام ذاتي" : "Pickup"}
    </button>
  </div>

  <!-- ── Banners ────────────────────────────────────────────────────── -->
  ${banners.length > 0 ? `
  <div class="home-section" style="padding-top:var(--space-md);padding-bottom:var(--space-md)">
    <div class="banner-carousel" id="home-banner">
      <div class="banner-track" id="home-banner-track">
        ${banners.map(b =>
          b.url
            ? `<img class="banner-slide" src="${fixImageUrl(b.url)}" alt="${b.title || ''}" loading="lazy" />`
            : `<div class="banner-slide-inner">
                 <h3>${b.title || ""}</h3>
                 <p>${b.subtitle || ""}</p>
               </div>`
        ).join("")}
      </div>
      <div class="banner-dots" id="home-banner-dots">
        ${banners.map((_, i) =>
          `<div class="banner-dot ${i === 0 ? "active" : ""}" onclick="pages.home._goToSlide(${i})" data-i="${i}"></div>`
        ).join("")}
      </div>
      ${banners.length > 1 ? `
      <button class="carousel-arrow prev" onclick="pages.home._prevSlide()" aria-label="Previous">‹</button>
      <button class="carousel-arrow next" onclick="pages.home._nextSlide()" aria-label="Next">›</button>
      ` : ""}
    </div>
  </div>` : ""}

  <!-- ── Promo strip ────────────────────────────────────────────────── -->
  ${featuredPromos ? `
  <div class="home-section" style="padding-top:0;padding-bottom:0">
    <div class="promo-strip" onclick="router.navigate('offers')">
      <div>
        <div class="promo-strip__title">${rtl ? "🎁 عروض اليوم" : "🎁 Today's Deals"}</div>
        <div class="promo-strip__sub">${featuredPromos}</div>
      </div>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="2">
        <polyline points="${rtl ? "15 18 9 12 15 6" : "9 18 15 12 9 6"}"/>
      </svg>
    </div>
  </div>` : ""}

  <!-- ── Cuisine categories ─────────────────────────────────────────── -->
  ${categories.length > 0 ? `
  <div class="home-section">
    <div class="section-header">
      <h2 class="section-header__title">${rtl ? "ماذا تحب اليوم؟" : "What do you fancy?"}</h2>
    </div>
    <div class="cuisine-grid">
      ${categories.slice(0, 12).map(c => {
        const emoji = icons[c.name] || (Object.values(icons)[Math.abs(c.id) % Object.values(icons).length]);
        return `
        <div class="cuisine-card" onclick="pages.home._filterByCategory(${c.id})" data-cat="${c.id}">
          <div class="cuisine-card__emoji">${emoji}</div>
          <div class="cuisine-card__label">${c.name}</div>
        </div>`;
      }).join("")}
    </div>
  </div>` : ""}

  <!-- ── Popular items ──────────────────────────────────────────────── -->
  ${popular.length > 0 ? `
  <div class="home-section" id="home-products-section">
    <div class="section-header">
      <h2 class="section-header__title">${rtl ? "الأكثر طلباً" : "Popular Right Now"}</h2>
      <a class="section-header__link" onclick="router.navigate('menu')" href="#" role="button">
        ${rtl ? "عرض الكل" : "See all"} →
      </a>
    </div>
    <div class="products-grid" id="home-products-grid">
      ${popular.map(p => pages.home._productCard(p)).join("")}
    </div>
  </div>` : ""}

  <!-- ── Free delivery section ─────────────────────────────────────── -->
  ${storeConfig?.enableLoyalty ? `
  <div class="home-section">
    <div class="section-header">
      <h2 class="section-header__title">${rtl ? "برنامج الولاء" : "Loyalty Rewards"}</h2>
    </div>
    <div class="loyalty-bar" onclick="router.navigate('account')">
      <div class="loyalty-bar__icon">⭐</div>
      <div class="loyalty-bar__info">
        <div class="loyalty-bar__points">${rtl ? "اكسب نقاط مع كل طلب" : "Earn points with every order"}</div>
        <div class="loyalty-bar__tier">${rtl ? "انضم الآن وابدأ توفير المال" : "Join now and start saving"}</div>
      </div>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--delivery-text-muted)" stroke-width="2">
        <polyline points="${rtl ? "15 18 9 12 15 6" : "9 18 15 12 9 6"}"/>
      </svg>
    </div>
  </div>` : ""}

  <!-- ── App download banner ────────────────────────────────────────── -->
  <div class="home-section">
    <div class="promo-strip" style="background:linear-gradient(135deg,#1A1A2E,#2a2e44)" onclick="router.navigate('offers')">
      <div>
        <div class="promo-strip__title">${rtl ? "🎁 انتظرك عرض ترحيبي!" : "🎁 Welcome offer inside!"}</div>
        <div class="promo-strip__sub">${rtl ? "استخدم كود WELCOME10 واحصل على 10% خصم" : "Use code WELCOME10 for 10% off your first order"}</div>
      </div>
    </div>
  </div>

  <!-- Bottom spacer for mobile nav -->
  <div style="height:var(--space-xl)"></div>
</div>
      `;

      // Events
      const searchInput = document.getElementById("home-search");
      if (searchInput) {
        searchInput.addEventListener("input", (e) => {
          pages.home._filterProducts(e.target.value);
        });
        // Pre-fill from header search
        if (window._headerSearch) {
          searchInput.value = window._headerSearch;
          pages.home._filterProducts(window._headerSearch);
          window._headerSearch = null;
        }
      }

      // Start carousel
      if (banners.length > 1) {
        pages.home._startCarousel(banners.length);
      }

      // Set active nav item
      _setBottomNavActive("home");

    } catch (err) {
      console.error("Home render error:", err);
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">⚠️</div>
          <div class="empty-state__title">Something went wrong</div>
          <div class="empty-state__text">${err.message}</div>
          <button class="btn btn-primary mt-md" onclick="router.navigate('home')">Retry</button>
        </div>`;
    }
  },

  _skeleton() {
    return `
      <div class="home-page">
        <div style="background:var(--nav-bg);padding:var(--space-xl) var(--space-md);min-height:180px;position:relative">
          <div class="skeleton" style="width:80px;height:14px;margin-bottom:12px"></div>
          <div class="skeleton" style="width:200px;height:28px;margin-bottom:8px"></div>
          <div class="skeleton" style="width:140px;height:14px;margin-bottom:20px"></div>
          <div class="skeleton" style="height:48px;border-radius:var(--radius-pill)"></div>
        </div>
        <div style="height:8px;background:var(--delivery-bg)"></div>
        <div class="home-section">
          <div class="products-grid">
            ${Array(6).fill('<div style="border-radius:var(--radius-md);overflow:hidden"><div class="skeleton" style="aspect-ratio:1"></div><div style="padding:8px"><div class="skeleton" style="height:14px;margin-bottom:6px"></div><div class="skeleton" style="height:12px;width:60%"></div></div></div>').join("")}
          </div>
        </div>
      </div>`;
  },

  _productCard(p) {
    const cfg = window.DELIVERY_CONFIG || {};
    const price = formatCurrency(parseFloat(p.price) || 0, cfg.currency);
    return `
      <div class="product-card" onclick="pages.menu.openProductModal(${p.id})">
        ${p.imageUrl
          ? `<img class="product-card__image" src="${fixImageUrl(p.imageUrl)}" alt="${p.name}" loading="lazy" />`
          : `<div class="product-card__image-placeholder">🍽️</div>`}
        <div class="product-card__body">
          <div class="product-card__name line-clamp-2">${p.name}</div>
          ${p.description ? `<div class="product-card__desc line-clamp-2">${p.description}</div>` : ""}
        </div>
        <div class="product-card__footer">
          <span class="product-card__price">${price}</span>
          <button class="product-card__add" aria-label="Add ${p.name} to cart"
            onclick="event.stopPropagation(); pages.home._quickAdd(${JSON.stringify({id:p.id,name:p.name,price:p.price,imageUrl:p.imageUrl||""}).replace(/"/g,'&quot;')})">+</button>
        </div>
      </div>`;
  },

  _quickAdd(product) {
    cart.addItem(product, 1);
    showToast((isRtl() ? "تمت الإضافة: " : "Added: ") + product.name, "success");
    refreshCartDrawer();
  },

  _filterProducts(query) {
    const grid = document.getElementById("home-products-grid");
    if (!grid) return;
    const q = query.toLowerCase().trim();
    const allProducts = pages.home._allProducts;
    const results = q
      ? allProducts.filter(p =>
          p.name.toLowerCase().includes(q) ||
          (p.description || "").toLowerCase().includes(q))
      : allProducts.slice(0, 8);

    if (results.length === 0) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
        <div class="empty-state__icon">🔍</div>
        <div class="empty-state__title">${isRtl() ? "لا نتائج" : "No results"}</div>
        <div class="empty-state__text">${isRtl() ? "جرب كلمات مختلفة" : "Try different keywords"}</div>
      </div>`;
      return;
    }

    grid.innerHTML = results.map(p => pages.home._productCard(p)).join("");
    // Update section header
    const sectionTitle = document.querySelector("#home-products-section .section-header__title");
    if (sectionTitle && q) {
      sectionTitle.textContent = `${results.length} ${isRtl() ? "نتيجة لـ" : "results for"} "${q}"`;
    }
  },

  _filterByCategory(catId) {
    document.querySelectorAll(".cuisine-card").forEach(c => {
      c.classList.toggle("active", Number(c.dataset.cat) === catId);
    });
    // Navigate to menu and filter
    window._filterCatId = catId;
    router.navigate("menu");
  },

  _setServiceTab(btn, type) {
    document.querySelectorAll(".service-tab").forEach(t => {
      t.classList.toggle("active", t === btn);
      t.setAttribute("aria-selected", t === btn);
    });
    cart.setOrderType(type);
  },

  // ── Banner carousel ──────────────────────────────────────────────────────

  _startCarousel(total) {
    clearInterval(pages.home._bannerTimer);
    pages.home._bannerTimer = setInterval(() => {
      pages.home._nextSlide(total);
    }, 4000);
  },

  _goToSlide(idx) {
    const total = document.querySelectorAll(".banner-dot").length;
    pages.home._bannerIdx = Math.max(0, Math.min(total - 1, idx));
    pages.home._applySlide();
    clearInterval(pages.home._bannerTimer);
    pages.home._startCarousel(total);
  },

  _nextSlide(total) {
    if (!total) total = document.querySelectorAll(".banner-dot").length;
    pages.home._bannerIdx = (pages.home._bannerIdx + 1) % total;
    pages.home._applySlide();
  },

  _prevSlide() {
    const total = document.querySelectorAll(".banner-dot").length;
    pages.home._bannerIdx = (pages.home._bannerIdx - 1 + total) % total;
    pages.home._applySlide();
    clearInterval(pages.home._bannerTimer);
    pages.home._startCarousel(total);
  },

  _applySlide() {
    const track = document.getElementById("home-banner-track");
    const dots = document.querySelectorAll(".banner-dot");
    if (!track) return;
    const offset = isRtl()
      ? pages.home._bannerIdx * 100
      : -(pages.home._bannerIdx * 100);
    track.style.transform = `translateX(${offset}%)`;
    dots.forEach((d, i) => d.classList.toggle("active", i === pages.home._bannerIdx));
  },

  _t: { en: {}, ar: {} },
};
