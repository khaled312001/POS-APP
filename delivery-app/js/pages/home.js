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
      pages.home._categories = menu?.categories || [];

      const banners      = storeConfig?.bannerImages || [];
      const categories   = pages.home._categories;
      const allProducts  = pages.home._allProducts;

      // Filter out alcohol/beer categories
      const alcoholRegex = /^(beer|bier|alcohol|alkohol|wine|wein|spirits|spirituosen|cocktail|drinks?.?alcohol|vodka|whisky|champagn|likör|liqueur)/i;
      const alcoholCatIds = new Set(categories.filter(c => alcoholRegex.test(c.name)).map(c => c.id));

      // Filter out alcohol products by name
      const alcoholProductRegex = /\b(beer|bier|alcohol|alkohol|wine|wein|spirits|vodka|whisky|whiskey|champagn|rum|gin|tequila|cognac|brandy|likör|liqueur|prosecco|aperol|spritz|grappa|absinth|jägermeister|sambuca|ouzo|raki|schnapps|schnaps)\b/i;

      // Find "Extra" / addon categories to exclude from featured items
      const extraCatIds = new Set(categories.filter(c =>
        /^extra|^addon|^zusatz|^beilage/i.test(c.name)
      ).map(c => c.id));

      // Featured items: exclude extras/zero-price AND alcohol, sort by price (main dishes first), then salesCount
      const mainItems = allProducts.filter(p =>
        !extraCatIds.has(p.categoryId) &&
        !alcoholCatIds.has(p.categoryId) &&
        !alcoholProductRegex.test(p.name || "") &&
        parseFloat(p.price || 0) > 0
      );

      // Also filter categories to exclude alcohol from cuisine grid
      const filteredCategories = categories.filter(c => !alcoholRegex.test(c.name));
      const hasSales = mainItems.some(p => (p.salesCount || 0) > 0);
      const popular = [...mainItems].sort((a, b) => {
        if (hasSales) return (b.salesCount || 0) - (a.salesCount || 0);
        return (parseFloat(b.price) || 0) - (parseFloat(a.price) || 0);
      }).slice(0, 12);
      const featuredPromos = storeConfig?.promoText || null;

      // Cuisine categories with real food photos (Just Eat style circular images)
      const cuisineImages = {
        "pizza": "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=150&h=150&fit=crop",
        "burger": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=150&h=150&fit=crop",
        "sushi": "https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=150&h=150&fit=crop",
        "chicken": "https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=150&h=150&fit=crop",
        "pasta": "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=150&h=150&fit=crop",
        "salad": "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=150&h=150&fit=crop",
        "dessert": "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=150&h=150&fit=crop",
        "drinks": "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=150&h=150&fit=crop",
        "breakfast": "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=150&h=150&fit=crop",
        "sandwich": "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=150&h=150&fit=crop",
        "seafood": "https://images.unsplash.com/photo-1615141982883-c7ad0e69fd62?w=150&h=150&fit=crop",
        "grill": "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=150&h=150&fit=crop",
        "vegan": "https://images.unsplash.com/photo-1543362906-acfc16c67564?w=150&h=150&fit=crop",
        "soup": "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=150&h=150&fit=crop",
        "coffee": "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=150&h=150&fit=crop",
        "wrap": "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=150&h=150&fit=crop",
        "steak": "https://images.unsplash.com/photo-1600891964092-4316c288032e?w=150&h=150&fit=crop",
        "falafel": "https://images.unsplash.com/photo-1593001872095-7d5b3868fb1d?w=150&h=150&fit=crop",
        "kebab": "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=150&h=150&fit=crop",
        "shawarma": "https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=150&h=150&fit=crop",
      };
      // Arabic name to key map
      var arMap = {"بيتزا":"pizza","برجر":"burger","سوشي":"sushi","دجاج":"chicken","باستا":"pasta","سلطة":"salad","حلويات":"dessert","مشروبات":"drinks","فطار":"breakfast","ساندوتشات":"sandwich","مأكولات بحرية":"seafood","مشويات":"grill","نباتي":"vegan","شوربة":"soup","قهوة":"coffee"};
      function getCuisineImage(name) {
        var key = name.toLowerCase();
        // Try direct match
        for (var k in cuisineImages) { if (key.includes(k)) return cuisineImages[k]; }
        // Try Arabic
        if (arMap[name]) return cuisineImages[arMap[name]];
        // Fallback: pick by hash
        var keys = Object.keys(cuisineImages);
        var hash = 0;
        for (var i = 0; i < name.length; i++) hash = ((hash << 5) - hash) + name.charCodeAt(i);
        return cuisineImages[keys[Math.abs(hash) % keys.length]];
      }

      container.innerHTML = `
<div class="home-page">

  <!-- ── Hero ──────────────────────────────────────────────────────── -->
  <section class="home-hero" aria-label="Search">
    <div class="home-hero__greeting">${rtl ? "أهلاً" : "Hello"} <i data-lucide="hand" class="icon-md"></i></div>
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
        <i data-lucide="clock" class="icon-sm"></i> <strong>${cfg.minDeliveryTime || 20}–${cfg.maxDeliveryTime || 45} min</strong> ${rtl ? "توصيل" : "delivery"}
      </div>
      ${storeConfig?.deliveryFee != null ? `
      <div class="home-hero__meta-item">
        <i data-lucide="truck" class="icon-sm"></i> ${parseFloat(storeConfig.deliveryFee) === 0
          ? (rtl ? "<strong>توصيل مجاني</strong>" : "<strong>Free delivery</strong>")
          : formatCurrency(storeConfig.deliveryFee, cfg.currency) + " " + (rtl ? "توصيل" : "delivery")}
      </div>` : ""}
      ${storeConfig?.minOrderAmount ? `
      <div class="home-hero__meta-item">
        <i data-lucide="shopping-cart" class="icon-sm"></i> ${rtl ? "حد أدنى" : "Min."} <strong>${formatCurrency(storeConfig.minOrderAmount, cfg.currency)}</strong>
      </div>` : ""}
    </div>
  </section>

  <!-- ── Service tabs ───────────────────────────────────────────────── -->
  <div class="service-tabs" role="tablist">
    <button class="service-tab active" role="tab" aria-selected="true" onclick="pages.home._setServiceTab(this,'delivery')">
      <i data-lucide="bike" class="icon-sm"></i> ${rtl ? "توصيل" : "Delivery"}
    </button>
    <button class="service-tab" role="tab" aria-selected="false" onclick="pages.home._setServiceTab(this,'pickup')">
      <i data-lucide="footprints" class="icon-sm"></i> ${rtl ? "استلام ذاتي" : "Pickup"}
    </button>
  </div>

  <!-- ── Banners ────────────────────────────────────────────────────── -->
  ${banners.length > 0 ? `
  <div class="home-section home-section--compact">
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
  <div class="home-section home-section--flush">
    <div class="promo-strip" onclick="router.navigate('offers')">
      <div>
        <div class="promo-strip__title"><i data-lucide="gift" class="icon-sm"></i> ${rtl ? "عروض اليوم" : "Today's Deals"}</div>
        <div class="promo-strip__sub">${featuredPromos}</div>
      </div>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="2">
        <polyline points="${rtl ? "15 18 9 12 15 6" : "9 18 15 12 9 6"}"/>
      </svg>
    </div>
  </div>` : ""}

  <!-- ── Cuisine categories ─────────────────────────────────────────── -->
  ${filteredCategories.length > 0 ? `
  <div class="home-section">
    <div class="section-header">
      <h2 class="section-header__title">${rtl ? "ماذا تحب اليوم؟" : "What do you fancy?"}</h2>
    </div>
    <div class="cuisine-grid">
      ${filteredCategories.slice(0, 12).map(c => {
        const imgUrl = getCuisineImage(c.name);
        return `
        <div class="cuisine-card" onclick="pages.home._filterByCategory(${c.id})" data-cat="${c.id}">
          <div class="cuisine-card__emoji-wrap">
            <img src="${imgUrl}" alt="${c.name}" loading="lazy" onerror="this.style.display='none'" />
          </div>
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
      <div class="loyalty-bar__icon"><i data-lucide="star" class="icon-lg"></i></div>
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
    <div class="promo-strip home-promo-dark" onclick="router.navigate('offers')">
      <div>
        <div class="promo-strip__title"><i data-lucide="gift" class="icon-sm"></i> ${rtl ? "انتظرك عرض ترحيبي!" : "Welcome offer inside!"}</div>
        <div class="promo-strip__sub">${rtl ? "استخدم كود WELCOME10 واحصل على 10% خصم" : "Use code WELCOME10 for 10% off your first order"}</div>
      </div>
    </div>
  </div>

  <!-- Bottom spacer for mobile nav -->
  <div class="home-spacer"></div>
</div>
      `;

      // Events
      const searchInput = document.getElementById("home-search");
      if (searchInput) {
        searchInput.addEventListener("input", (e) => {
          pages.home._filterProducts(e.target.value);
          // Sync header search
          var headerSearch = document.getElementById("header-search");
          if (headerSearch) headerSearch.value = e.target.value;
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
          <div class="empty-state__icon"><i data-lucide="alert-triangle" class="icon-2xl"></i></div>
          <div class="empty-state__title">Something went wrong</div>
          <div class="empty-state__text">${err.message}</div>
          <button class="btn btn-primary mt-md" onclick="router.navigate('home')">Retry</button>
        </div>`;
    }
  },

  _skeleton() {
    return `
      <div class="home-page">
        <div class="home-hero" style="min-height:220px">
          <div class="skeleton skeleton-text" style="width:100px;height:14px;background:rgba(255,255,255,0.08)"></div>
          <div class="skeleton skeleton-text" style="width:260px;height:32px;margin-top:12px;background:rgba(255,255,255,0.1)"></div>
          <div class="skeleton skeleton-text" style="width:180px;height:16px;margin-top:8px;background:rgba(255,255,255,0.06)"></div>
          <div class="skeleton skeleton-text" style="height:52px;border-radius:var(--radius-lg);margin-top:20px;background:rgba(255,255,255,0.08)"></div>
        </div>
        <div class="home-section">
          <div class="skeleton skeleton-text" style="width:160px;height:22px"></div>
          <div style="display:flex;gap:12px;margin-top:16px;overflow:hidden">
            ${Array(6).fill('<div style="flex-shrink:0;text-align:center"><div class="skeleton" style="width:68px;height:68px;border-radius:50%"></div><div class="skeleton skeleton-text" style="width:50px;height:12px;margin:8px auto 0"></div></div>').join("")}
          </div>
        </div>
        <div class="home-section">
          <div class="skeleton skeleton-text" style="width:180px;height:22px"></div>
          <div class="products-grid" style="margin-top:16px">
            ${Array(4).fill('<div style="border-radius:var(--radius-lg);overflow:hidden;border:1px solid var(--delivery-border)"><div class="skeleton" style="aspect-ratio:4/3"></div><div style="padding:12px"><div class="skeleton skeleton-text" style="width:80%"></div><div class="skeleton skeleton-text" style="width:50%;margin-top:8px"></div></div></div>').join("")}
          </div>
        </div>
      </div>`;
  },

  _productCard(p) {
    const cfg = window.DELIVERY_CONFIG || {};
    const price = formatCurrency(parseFloat(p.price) || 0, cfg.currency);
    // Use real image or food fallback from menu page
    const imgUrl = p.imageUrl || "";
    const isRealImg = imgUrl && !imgUrl.startsWith("data:image/svg") && imgUrl.length > 10;
    const fallbackImg = (pages.menu && pages.menu._getFoodImage) ? pages.menu._getFoodImage(p) : "";
    const displayImg = isRealImg ? fixImageUrl(imgUrl) : fallbackImg;
    return `
      <div class="product-card" onclick="pages.menu.openProductModal(${p.id})">
        <div style="overflow:hidden;border-radius:var(--radius-lg) var(--radius-lg) 0 0">
        ${displayImg
          ? `<img class="product-card__image" src="${displayImg}" alt="${p.name}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=product-card__image-placeholder><i data-lucide=utensils class=icon-xl></i></div>'" />`
          : `<div class="product-card__image-placeholder"><i data-lucide="utensils" class="icon-xl"></i></div>`}
        </div>
        <div class="product-card__body">
          <div class="product-card__name line-clamp-2">${p.name}</div>
          ${p.description ? `<div class="product-card__desc line-clamp-2">${p.description}</div>` : ""}
        </div>
        <div class="product-card__footer">
          <span class="product-card__price">${price}</span>
          <button class="product-card__add" aria-label="Add ${p.name} to cart"
            onclick="event.stopPropagation(); pages.menu.openProductModal(${p.id})">+</button>
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
    const alcoholRx = /\b(beer|bier|alcohol|alkohol|wine|wein|vodka|whisky|whiskey|champagn|rum|gin|tequila|cognac|brandy|likör|liqueur|prosecco|aperol|spritz|grappa|absinth|jägermeister|sambuca|ouzo|raki|schnapps|schnaps)\b/i;
    // Exclude zero-price extras and alcohol from default view
    const mainProducts = allProducts.filter(p => parseFloat(p.price || 0) > 0 && !alcoholRx.test(p.name || ""));
    const results = q
      ? mainProducts.filter(p =>
          p.name.toLowerCase().includes(q) ||
          (p.description || "").toLowerCase().includes(q))
      : mainProducts.slice(0, 12);

    if (results.length === 0) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
        <div class="empty-state__icon"><i data-lucide="search" class="icon-2xl"></i></div>
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
