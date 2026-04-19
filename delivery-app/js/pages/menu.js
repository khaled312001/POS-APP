/**
 * menu.js — Restaurant detail + full menu page
 * Cover photo · Store info · Order type toggle · Category sticky nav · Item rows · Product modal
 */
window.pages = window.pages || {};

pages.menu = {
  _products: [],
  _categories: [],
  _storeConfig: null,
  _activeCatId: null,
  _orderType: "delivery",
  _modalQty: 1,
  _modalProduct: null,
  _selectedVariant: null,
  _selectedToppings: [],
  _scrollObserver: null,

  async render(params, container) {
    const cfg = window.DELIVERY_CONFIG || {};
    const slug = cfg.slug || "";
    const rtl = isRtl();

    container.innerHTML = pages.menu._skeleton();

    try {
      const [storeConfig, menu] = await Promise.all([
        api.store.getConfig(slug).catch(() => ({})),
        api.store.getMenu(slug).catch(() => ({ categories: [], allProducts: [] })),
      ]);

      pages.menu._storeConfig = storeConfig;

      // Check for demo restaurant override from restaurants page
      var demoRestaurant = null;
      try {
        var demoJson = sessionStorage.getItem("demo_restaurant");
        if (demoJson) {
          demoRestaurant = JSON.parse(demoJson);
          sessionStorage.removeItem("demo_restaurant");
        }
      } catch(e) {}

      // If demo restaurant, override storeConfig display data
      if (demoRestaurant) {
        storeConfig = Object.assign({}, storeConfig);
        storeConfig.storeName = demoRestaurant.name;
        storeConfig.name = demoRestaurant.name;
        if (demoRestaurant.coverImage) storeConfig.coverImage = demoRestaurant.coverImage;
        if (demoRestaurant.logo) storeConfig.logo = demoRestaurant.logo;
        storeConfig.cuisine = demoRestaurant.cuisine || storeConfig.cuisine;
        storeConfig.cuisineTypes = demoRestaurant.cuisine || storeConfig.cuisineTypes;
        storeConfig.rating = demoRestaurant.rating || storeConfig.rating;
        storeConfig.reviewCount = demoRestaurant.reviewCount || storeConfig.reviewCount;
        storeConfig.deliveryFee = demoRestaurant.deliveryFee != null ? demoRestaurant.deliveryFee : storeConfig.deliveryFee;
        storeConfig.minOrderAmount = demoRestaurant.minOrder || storeConfig.minOrderAmount;
        pages.menu._storeConfig = storeConfig;
        // Also generate demo menu categories and products for non-primary restaurants
        if (demoRestaurant.id !== (cfg.tenantId || 24)) {
          var demoMenu = pages.menu._generateDemoMenu(demoRestaurant);
          menu = demoMenu;
        }
      }

      // Filter out alcohol/beer categories
      var allCats = menu?.categories || [];
      var alcoholRegex = /^(beer|bier|alcohol|alkohol|wine|wein|spirits|cocktail|drinks?.?alcohol)/i;
      var filteredCats = allCats.filter(function(c) { return !alcoholRegex.test(c.name); });
      var blockedCatIds = new Set(allCats.filter(function(c) { return alcoholRegex.test(c.name); }).map(function(c) { return c.id; }));

      // Sort categories: main food first, extras/condiments last
      var extraRegex = /^(extra|addon|zusatz|beilage|condiment|sauce|topping)/i;
      filteredCats.sort(function(a, b) {
        var aExtra = extraRegex.test(a.name) ? 1 : 0;
        var bExtra = extraRegex.test(b.name) ? 1 : 0;
        return aExtra - bExtra;
      });

      pages.menu._categories = filteredCats;
      // Filter out products from blocked categories and zero-price condiments in Extra
      var allProds = (menu?.allProducts || menu?.products || []).filter(function(p) {
        return !blockedCatIds.has(p.categoryId);
      });
      pages.menu._products = allProds;
      pages.menu._activeCatId = pages.menu._categories[0]?.id || null;

      // ── Detect dine-in QR code from URL ──
      const urlParams = new URLSearchParams(window.location.search);
      const tableToken = urlParams.get("table");
      let isDineIn = false;
      let dineInTableName = "";
      if (tableToken) {
        try {
          const qrValidation = await fetch(`/api/dine-in/validate/${tableToken}`).then(r => r.json());
          if (qrValidation.valid) {
            isDineIn = true;
            dineInTableName = qrValidation.tableName || "Table";
            cart.setDineIn(tableToken, qrValidation.tableName);
            pages.menu._orderType = "dine_in";
          }
        } catch (e) { console.warn("QR validation failed:", e); }
      }
      if (!isDineIn) {
        pages.menu._orderType = cart.getState().orderType || "delivery";
      }

      // Pre-filter category from home page
      const preFilterCat = window._filterCatId;
      window._filterCatId = null;

      // Pre-fill search from header
      const preSearch = window._headerSearch;
      window._headerSearch = null;

      _setBottomNavActive("menu");

      container.innerHTML = `
<div class="menu-page">

  <!-- Cover photo -->
  <div class="restaurant-cover" id="rest-cover">
    ${(storeConfig?.coverImage || storeConfig?.coverImageUrl || storeConfig?.headerBgImage)
      ? `<img class="restaurant-cover__img" src="${fixImageUrl(storeConfig.coverImage || storeConfig.coverImageUrl || storeConfig.headerBgImage)}" alt="${storeConfig.storeName || ''}" loading="lazy" onerror="this.style.display='none'" />`
      : `<div class="menu-cover-fallback"><i data-lucide="utensils" class="icon-3xl"></i></div>`}
    <div class="restaurant-cover__overlay"></div>
    <button class="restaurant-cover__back" onclick="history.back()" aria-label="Go back">
      ${rtl ? "›" : "‹"}
    </button>
  </div>

  <!-- Restaurant info -->
  <div class="restaurant-info">
    <div class="restaurant-info__header">
      ${(storeConfig?.logo || storeConfig?.logoUrl || cfg.logo)
        ? `<img class="restaurant-info__logo" src="${fixImageUrl(storeConfig.logo || storeConfig.logoUrl || cfg.logo)}" alt="${storeConfig.storeName || ''}" onerror="this.style.display='none'" />`
        : `<div class="restaurant-info__logo-placeholder"><i data-lucide="store" class="icon-xl"></i></div>`}
      <div class="flex-1">
        <h1 class="restaurant-info__name">${storeConfig?.storeName || storeConfig?.name || cfg.storeName || "Menu"}</h1>
        ${(storeConfig?.cuisine || storeConfig?.cuisineTypes) ? `<div class="restaurant-info__cuisine">${storeConfig.cuisine || storeConfig.cuisineTypes}</div>` : ""}
        <div class="restaurant-info__meta-row">
          <div class="restaurant-info__rating">
            <span class="rating-star">★</span>
            ${storeConfig?.rating ? parseFloat(storeConfig.rating).toFixed(1) : (storeConfig?.averageRating ? storeConfig.averageRating.toFixed(1) : "4.8")}
            <span class="text-muted font-medium menu-review-count">(${storeConfig?.reviewCount || "100+"})</span>
          </div>
          <div class="restaurant-info__meta-item">
            <i data-lucide="clock" class="icon-xs"></i> ${cfg.minDeliveryTime || 20}–${cfg.maxDeliveryTime || 45} min
          </div>
          ${storeConfig?.deliveryFee != null ? `
          <div class="restaurant-info__meta-item">
            <i data-lucide="truck" class="icon-xs"></i> ${parseFloat(storeConfig.deliveryFee) === 0
              ? `<span class="menu-free-delivery">${rtl ? "توصيل مجاني" : "Free delivery"}</span>`
              : formatCurrency(storeConfig.deliveryFee, cfg.currency)}
          </div>` : ""}
          ${storeConfig?.minOrderAmount ? `
          <div class="restaurant-info__meta-item">
            <i data-lucide="shopping-cart" class="icon-xs"></i> ${rtl ? "حد أدنى" : "Min"} ${formatCurrency(storeConfig.minOrderAmount, cfg.currency)}
          </div>` : ""}
        </div>
      </div>
    </div>

    <!-- Order type toggle -->
    ${isDineIn ? `
    <div class="dine-in-banner">
      <div class="dine-in-banner__icon">🍽</div>
      <div class="dine-in-banner__text">
        <div class="dine-in-banner__title">${rtl ? "طلب من الطاولة" : "Dine-in Order"}</div>
        <div class="dine-in-banner__table">${dineInTableName}</div>
      </div>
    </div>
    ` : `
    <div class="order-type-toggle">
      <button class="order-type-btn ${pages.menu._orderType === "delivery" ? "active" : ""}"
        onclick="pages.menu._setOrderType('delivery', this)">
        <i data-lucide="bike" class="icon-sm"></i> ${rtl ? "توصيل" : "Delivery"}
      </button>
      <button class="order-type-btn ${pages.menu._orderType === "pickup" ? "active" : ""}"
        onclick="pages.menu._setOrderType('pickup', this)">
        <i data-lucide="footprints" class="icon-sm"></i> ${rtl ? "استلام ذاتي" : "Pickup"}
      </button>
    </div>
    `}

    <!-- Search in menu -->
    <div class="search-bar">
      <svg class="search-bar__icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      <input
        type="search"
        id="menu-search"
        placeholder="${rtl ? "ابحث في القائمة..." : "Search menu…"}"
        autocomplete="off"
        value="${preSearch || ""}"
      />
    </div>
  </div>

  <!-- Category sticky nav -->
  <nav class="menu-cat-nav" id="cat-nav" aria-label="Menu categories">
    ${pages.menu._categories.map((c, i) => `
      <button class="menu-cat-tab ${(preFilterCat ? c.id === preFilterCat : i === 0) ? "active" : ""}"
        data-cat-id="${c.id}"
        onclick="pages.menu.scrollToCategory(${c.id})">
        ${c.name}
      </button>`).join("")}
  </nav>

  <!-- Menu sections -->
  <div id="menu-sections" class="menu-page-layout">
    <div id="menu-main">
      ${pages.menu._categories.map(cat => {
        const items = pages.menu._products.filter(p => p.categoryId === cat.id);
        if (items.length === 0) return "";
        return `
          <section class="menu-section" id="cat-${cat.id}" aria-label="${cat.name}">
            <h2 class="menu-section-title">${cat.name}</h2>
            <div class="menu-items-list">
              ${items.map(p => pages.menu._itemRow(p)).join("")}
            </div>
          </section>`;
      }).join("")}
    </div>

    <!-- Desktop cart sidebar -->
    <aside class="menu-sidebar desktop-only" id="menu-sidebar">
      <div class="menu-sidebar-header">
        ${rtl ? "سلتك" : "Your order"}
      </div>
      <div id="sidebar-cart-items" class="menu-sidebar-items"></div>
      <div id="sidebar-cart-footer" class="hidden menu-sidebar-footer"></div>
    </aside>
  </div>

  <!-- Mobile Cart FAB -->
  <div id="cart-fab-mount"></div>

  <!-- Product modal -->
  <div class="modal-backdrop" id="product-modal-backdrop" onclick="pages.menu.closeModal()" role="dialog" aria-modal="true" aria-labelledby="product-modal-name">
    <div class="modal" id="product-modal" onclick="event.stopPropagation()">
      <div class="modal-handle"></div>
      <div id="product-modal-inner"></div>
    </div>
  </div>

</div>
      `;

      // Scroll spy
      pages.menu._setupScrollSpy();

      // Cart sync
      pages.menu._refreshCartUI();
      cart.onChange(() => pages.menu._refreshCartUI());

      // Search
      const searchEl = document.getElementById("menu-search");
      if (searchEl) {
        searchEl.addEventListener("input", e => pages.menu._filterItems(e.target.value));
        if (preSearch) pages.menu._filterItems(preSearch);
      }

      // Scroll to pre-filtered category
      if (preFilterCat) {
        setTimeout(() => pages.menu.scrollToCategory(preFilterCat), 100);
      }

    } catch (err) {
      console.error("Menu render error:", err);
      container.innerHTML = `<div class="empty-state"><div class="empty-state__icon"><i data-lucide="alert-triangle" class="icon-2xl"></i></div><div class="empty-state__title">Failed to load menu</div><button class="btn btn-primary mt-md" onclick="router.navigate('menu')">Retry</button></div>`;
    }
  },

  _skeleton() {
    return `<div class="menu-page">
      <div class="skeleton menu-skel-cover"></div>
      <div class="menu-skel-info">
        <div class="menu-skel-row">
          <div class="skeleton menu-skel-logo"></div>
          <div class="menu-skel-flex1"><div class="skeleton menu-skel-text-lg"></div><div class="skeleton menu-skel-text-sm"></div></div>
        </div>
      </div>
      <div class="menu-skel-nav"></div>
      <div class="menu-skel-items">
        ${Array(4).fill('').map(() => `
          <div class="menu-skel-item">
            <div class="menu-skel-item-text"><div class="skeleton menu-skel-item-line1"></div><div class="skeleton menu-skel-item-line2"></div><div class="skeleton menu-skel-item-line3"></div></div>
            <div class="skeleton menu-skel-item-img"></div>
          </div>`).join("")}
      </div>
    </div>`;
  },

  _itemRow(p) {
    const cfg = window.DELIVERY_CONFIG || {};
    const price = formatCurrency(parseFloat(p.price) || 0, cfg.currency);
    // Check if image is a real photo (not SVG placeholder)
    const imgUrl = p.imageUrl || "";
    const isRealImg = imgUrl && !imgUrl.startsWith("data:image/svg") && imgUrl.length > 10;
    const fallbackImg = pages.menu._getFoodImage(p);
    const displayImg = isRealImg ? fixImageUrl(imgUrl) : fallbackImg;
    return `
      <div class="menu-item-card" onclick="pages.menu.openProductModal(${p.id})">
        <div class="menu-item-card__body">
          <div class="menu-item-card__name">${p.name}</div>
          ${p.description ? `<div class="menu-item-card__desc line-clamp-2">${p.description}</div>` : ""}
          <div class="menu-item-card__footer">
            <span class="product-card__price">${price}</span>
            ${p.isVegetarian ? `<span class="badge badge-success menu-badge-sm"><i data-lucide="vegan" class="icon-xs"></i> Veg</span>` : ""}
            ${p.isHalal ? `<span class="badge badge-info menu-badge-sm">Halal</span>` : ""}
          </div>
        </div>
        ${displayImg
          ? `<img class="menu-item-card__image" src="${displayImg}" alt="${p.name}" loading="lazy" onerror="this.style.display='none'" />`
          : `<div class="menu-item-card__image-placeholder"><i data-lucide="utensils" class="icon-xl"></i></div>`}
      </div>`;
  },

  _filterItems(query) {
    const q = query.toLowerCase().trim();
    const sections = document.getElementById("menu-main");
    if (!sections) return;

    if (!q) {
      // Restore all
      document.querySelectorAll(".menu-item-card").forEach(el => el.style.display = "");
      document.querySelectorAll(".menu-section").forEach(el => el.style.display = "");
      return;
    }

    document.querySelectorAll(".menu-item-card").forEach(el => {
      const name = (el.querySelector(".menu-item-card__name")?.textContent || "").toLowerCase();
      const desc = (el.querySelector(".menu-item-card__desc")?.textContent || "").toLowerCase();
      const match = name.includes(q) || desc.includes(q);
      el.style.display = match ? "" : "none";
    });

    document.querySelectorAll(".menu-section").forEach(section => {
      const visible = [...section.querySelectorAll(".menu-item-card")].some(el => el.style.display !== "none");
      section.style.display = visible ? "" : "none";
    });
  },

  _setOrderType(type, btn) {
    pages.menu._orderType = type;
    cart.setOrderType(type);
    document.querySelectorAll(".order-type-btn").forEach(b => b.classList.toggle("active", b === btn));
  },

  _refreshCartUI() {
    const state = cart.getState();
    const cfg = window.DELIVERY_CONFIG || {};
    const rtl = isRtl();

    // Mobile FAB
    const fabMount = document.getElementById("cart-fab-mount");
    if (fabMount) {
      if (state.count === 0) {
        fabMount.innerHTML = "";
      } else {
        fabMount.innerHTML = `
          <button class="cart-fab" onclick="router.navigate('cart')">
            <span class="cart-fab__count">${state.count}</span>
            <span>${rtl ? "عرض السلة" : "View cart"}</span>
            <span class="cart-fab__total">${formatCurrency(state.subtotal, cfg.currency)}</span>
          </button>`;
      }
    }

    // Desktop sidebar
    const sideItems = document.getElementById("sidebar-cart-items");
    const sideFoot = document.getElementById("sidebar-cart-footer");
    if (!sideItems) return;

    if (state.items.length === 0) {
      sideItems.innerHTML = `<div class="empty-state menu-cart-empty">
        <div><i data-lucide="shopping-cart" class="icon-2xl"></i></div>
        <div class="menu-cart-empty-title">${rtl ? "السلة فارغة" : "Cart is empty"}</div>
        <div class="menu-cart-empty-sub">${rtl ? "اختر من القائمة" : "Select items from menu"}</div>
      </div>`;
      if (sideFoot) sideFoot.classList.add("hidden");
      return;
    }

    sideItems.innerHTML = state.items.map(item => {
      const safeKey = item._key.replace(/'/g, "\\'");
      return `
      <div class="cart-item menu-cart-item">
        <div class="cart-item__info">
          <div class="cart-item__name menu-cart-item-name">${item.name}</div>
          <div class="cart-item__price">${formatCurrency((item.price + (item.modifierPrice || 0)) * item.qty, cfg.currency)}</div>
        </div>
        <div class="qty-control">
          <button class="qty-btn" onclick="cart.setQty('${safeKey}', ${item.qty - 1}); pages.menu._refreshCartUI()" aria-label="Remove">−</button>
          <span class="qty-value">${item.qty}</span>
          <button class="qty-btn" onclick="cart.setQty('${safeKey}', ${item.qty + 1}); pages.menu._refreshCartUI()" aria-label="Add">+</button>
        </div>
      </div>`;
    }).join("");

    if (sideFoot) {
      const total = Math.max(0, state.subtotal - (state.discountAmount || 0));
      sideFoot.classList.remove("hidden");
      sideFoot.innerHTML = `
        <div class="summary-row"><span class="label">${rtl ? "المجموع الجزئي" : "Subtotal"}</span><strong>${formatCurrency(state.subtotal, cfg.currency)}</strong></div>
        <button class="btn btn-primary btn-full mt-md" onclick="router.navigate('checkout')">
          ${rtl ? "إتمام الطلب" : "Checkout"} — ${formatCurrency(total, cfg.currency)}
        </button>`;
    }
  },

  // ── Topping data (mirrors POS toppingUtils) ────────────────────────────────
  _TOPPINGS: [
    { name: "Tomato Sauce", icon: "🍅", cat: "Vegetables", price: 2 },
    { name: "Sliced Tomatoes", icon: "🍅", cat: "Vegetables", price: 2 },
    { name: "Garlic", icon: "🧄", cat: "Vegetables", price: 2 },
    { name: "Onions", icon: "🧅", cat: "Vegetables", price: 2 },
    { name: "Olives", icon: "🫒", cat: "Vegetables", price: 2 },
    { name: "Mushrooms", icon: "🍄", cat: "Vegetables", price: 2 },
    { name: "Bell Peppers", icon: "🫑", cat: "Vegetables", price: 2 },
    { name: "Corn", icon: "🌽", cat: "Vegetables", price: 2 },
    { name: "Spinach", icon: "🥬", cat: "Vegetables", price: 2 },
    { name: "Broccoli", icon: "🥦", cat: "Vegetables", price: 2 },
    { name: "Pineapple", icon: "🍍", cat: "Vegetables", price: 2 },
    { name: "Arugula", icon: "🥬", cat: "Vegetables", price: 2 },
    { name: "Egg", icon: "🥚", cat: "Vegetables", price: 2 },
    { name: "Ham", icon: "🥩", cat: "Meat", price: 2 },
    { name: "Salami", icon: "🥩", cat: "Meat", price: 2 },
    { name: "Spicy Salami", icon: "🌶️", cat: "Meat", price: 2 },
    { name: "Bacon", icon: "🥓", cat: "Meat", price: 2 },
    { name: "Prosciutto", icon: "🥩", cat: "Meat", price: 2 },
    { name: "Chicken", icon: "🍗", cat: "Meat", price: 2 },
    { name: "Kebab", icon: "🥙", cat: "Meat", price: 2 },
    { name: "Minced Meat", icon: "🥩", cat: "Meat", price: 2 },
    { name: "Lamb", icon: "🐑", cat: "Meat", price: 2 },
    { name: "Anchovies", icon: "🐟", cat: "Seafood", price: 2 },
    { name: "Shrimp", icon: "🍤", cat: "Seafood", price: 2 },
    { name: "Tuna", icon: "🐟", cat: "Seafood", price: 2 },
    { name: "Mozzarella", icon: "🧀", cat: "Cheese", price: 2 },
    { name: "Gorgonzola", icon: "🧀", cat: "Cheese", price: 2 },
    { name: "Parmesan", icon: "🧀", cat: "Cheese", price: 2 },
    { name: "Kaeserand", icon: "🧀", cat: "Cheese", price: 3 },
    { name: "Mayonnaise", icon: "🫙", cat: "Sauces", price: 0 },
    { name: "Ketchup", icon: "🍅", cat: "Sauces", price: 0 },
    { name: "Cocktail Sauce", icon: "🥂", cat: "Sauces", price: 0 },
    { name: "Yogurt Sauce", icon: "🥛", cat: "Sauces", price: 0 },
    { name: "Spicy Sauce", icon: "🌶️", cat: "Sauces", price: 0 },
    { name: "Garlic Sauce", icon: "🫙", cat: "Sauces", price: 0 },
  ],

  _hasToppings(product) {
    const allCats = pages.menu._categories.length > 0
      ? pages.menu._categories
      : (pages.home && pages.home._categories || []);
    const cat = allCats.find(c => c.id === product.categoryId);
    const catName = (cat?.name || "").toLowerCase();
    const pName = (product.name || "").toLowerCase();
    const toppingCats = ["pizza", "calzone", "pide", "lahmacun", "fingerfood", "snack"];
    return toppingCats.some(k => catName.includes(k) || pName.includes(k));
  },

  _parseModifiers(product) {
    if (!product.modifiers) return [];
    try {
      const mods = typeof product.modifiers === "string" ? JSON.parse(product.modifiers) : product.modifiers;
      return Array.isArray(mods) ? mods : [];
    } catch { return []; }
  },

  _getSizeModifier(product) {
    const mods = pages.menu._parseModifiers(product);
    return mods.find(m => m.required && m.options?.length > 1 && /gr[öo]sse|size/i.test(m.name)) || null;
  },

  _getExtrasModifier(product) {
    const mods = pages.menu._parseModifiers(product);
    return mods.find(m => !m.required && m.multiple && /extra|zusatz|topping/i.test(m.name)) || null;
  },

  _getModalTotal() {
    const product = pages.menu._modalProduct;
    if (!product) return 0;
    const basePrice = parseFloat(product.price) || 0;
    const sizeExtra = pages.menu._selectedVariant ? (parseFloat(pages.menu._selectedVariant.price) || 0) : 0;
    const toppingPrice = pages.menu._selectedToppings.reduce((sum, name) => {
      const t = pages.menu._TOPPINGS.find(x => x.name === name);
      return sum + (t ? t.price : 2);
    }, 0);
    return (basePrice + sizeExtra + toppingPrice) * pages.menu._modalQty;
  },

  _updateModalPrice() {
    const priceEl = document.getElementById("modal-price");
    if (priceEl) {
      priceEl.textContent = formatCurrency(pages.menu._getModalTotal(), (window.DELIVERY_CONFIG || {}).currency);
    }
  },

  _toggleTopping(name) {
    const idx = pages.menu._selectedToppings.indexOf(name);
    if (idx >= 0) {
      pages.menu._selectedToppings.splice(idx, 1);
    } else {
      pages.menu._selectedToppings.push(name);
    }
    // Update button styles
    document.querySelectorAll(".topping-chip").forEach(el => {
      const selected = pages.menu._selectedToppings.includes(el.dataset.name);
      el.classList.toggle("topping-selected", selected);
    });
    // Update count badge
    const countEl = document.getElementById("topping-count");
    if (countEl) {
      const c = pages.menu._selectedToppings.length;
      countEl.textContent = c > 0 ? ` (${c})` : "";
    }
    pages.menu._updateModalPrice();
  },

  _selectVariant(idx) {
    const sizeMod = pages.menu._getSizeModifier(pages.menu._modalProduct);
    if (!sizeMod) return;
    pages.menu._selectedVariant = sizeMod.options[idx];
    document.querySelectorAll(".variant-btn").forEach((el, i) => {
      el.classList.toggle("variant-selected", i === idx);
    });
    pages.menu._updateModalPrice();
  },

  async openProductModal(productId) {
    const product = pages.menu._products.find(p => p.id === productId)
      || (pages.home && pages.home._allProducts || []).find(p => p.id === productId);
    if (!product) return;

    pages.menu._modalProduct = product;
    pages.menu._modalQty = 1;
    pages.menu._selectedToppings = [];
    pages.menu._selectedVariant = null;

    const cfg = window.DELIVERY_CONFIG || {};
    const rtl = isRtl();
    const price = parseFloat(product.price) || 0;
    const sizeMod = pages.menu._getSizeModifier(product);
    const hasToppings = pages.menu._hasToppings(product);

    // Auto-select first size option if available
    if (sizeMod) {
      pages.menu._selectedVariant = sizeMod.options[0];
    }

    const inner = document.getElementById("product-modal-inner");
    if (!inner) return;

    const modalImgUrl = product.imageUrl && !product.imageUrl.startsWith("data:image/svg")
      ? fixImageUrl(product.imageUrl)
      : pages.menu._getFoodImage(product);

    // Build size selector HTML from modifiers
    let variantsHtml = "";
    if (sizeMod) {
      variantsHtml = `
        <div class="modal-section">
          <h4 class="modal-section-title">${rtl ? "اختر الحجم" : sizeMod.name || "Choose Size"}</h4>
          <div class="variant-grid">
            ${sizeMod.options.map((opt, i) => {
              const extraPrice = parseFloat(opt.price) || 0;
              const totalForSize = price + extraPrice;
              return `
              <button class="variant-btn ${i === 0 ? "variant-selected" : ""}" onclick="pages.menu._selectVariant(${i})">
                <span class="variant-name">${opt.label}</span>
                <span class="variant-price">${formatCurrency(totalForSize, cfg.currency)}${extraPrice > 0 ? ' (+' + formatCurrency(extraPrice, cfg.currency) + ')' : ''}</span>
              </button>`;
            }).join("")}
          </div>
        </div>`;
    }

    // Build toppings HTML
    let toppingsHtml = "";
    if (hasToppings) {
      const groups = {};
      pages.menu._TOPPINGS.forEach(t => {
        if (!groups[t.cat]) groups[t.cat] = [];
        groups[t.cat].push(t);
      });
      const catLabels = {
        Vegetables: rtl ? "خضار" : "Vegetables",
        Meat: rtl ? "لحوم" : "Meat",
        Seafood: rtl ? "مأكولات بحرية" : "Seafood",
        Cheese: rtl ? "جبنة" : "Cheese",
        Sauces: rtl ? "صلصات (مجاني)" : "Sauces (free)",
      };
      let groupsHtml = "";
      for (const [cat, items] of Object.entries(groups)) {
        groupsHtml += `
          <div class="topping-group">
            <div class="topping-group-label">${catLabels[cat] || cat}</div>
            <div class="topping-chips">
              ${items.map(t => `
                <button class="topping-chip" data-name="${t.name}" onclick="pages.menu._toggleTopping('${t.name}')">
                  <span class="topping-icon">${t.icon}</span>
                  <span class="topping-label">${t.name}</span>
                  ${t.price > 0 ? `<span class="topping-price">+${t.price}</span>` : `<span class="topping-free">${rtl ? "مجاني" : "Free"}</span>`}
                </button>
              `).join("")}
            </div>
          </div>`;
      }
      toppingsHtml = `
        <div class="modal-section">
          <h4 class="modal-section-title">${rtl ? "إضافات" : "Extras / Toppings"}<span id="topping-count"></span></h4>
          <div class="toppings-container">${groupsHtml}</div>
        </div>`;
    }

    const displayPrice = price;

    inner.innerHTML = `
      ${modalImgUrl
        ? `<img class="product-modal-image" src="${modalImgUrl}" alt="${product.name}" />`
        : `<div class="menu-modal-img-fallback"><i data-lucide="utensils" class="icon-3xl"></i></div>`}
      <div class="product-modal-body">
        <h2 class="product-modal-name" id="product-modal-name">${product.name}</h2>
        ${product.description ? `<p class="product-modal-desc">${product.description}</p>` : ""}
        ${product.calories ? `<p class="text-sm text-muted"><i data-lucide="flame" class="icon-xs"></i> ${product.calories} kcal</p>` : ""}
        <div class="menu-modal-badges">
          ${product.isVegetarian ? `<span class="badge badge-success"><i data-lucide="vegan" class="icon-xs"></i> Vegetarian</span>` : ""}
          ${product.isHalal ? `<span class="badge badge-info">✓ Halal</span>` : ""}
          ${product.isSpicy ? `<span class="badge badge-danger"><i data-lucide="flame" class="icon-xs"></i> Spicy</span>` : ""}
        </div>
        ${variantsHtml}
        ${toppingsHtml}
      </div>
      <div class="product-modal-footer">
        <div class="qty-control">
          <button class="qty-btn" onclick="pages.menu._adjustQty(-1)" aria-label="Decrease">−</button>
          <span class="qty-value" id="modal-qty">1</span>
          <button class="qty-btn" onclick="pages.menu._adjustQty(1)" aria-label="Increase">+</button>
        </div>
        <button class="btn btn-primary flex-1" id="modal-add-btn"
          onclick="pages.menu._addToCart()">
          ${rtl ? "أضف للسلة" : "Add to cart"} — <span id="modal-price">${formatCurrency(displayPrice, cfg.currency)}</span>
        </button>
      </div>`;

    document.getElementById("product-modal-backdrop").classList.add("open");
    document.body.style.overflow = "hidden";
  },

  closeModal() {
    document.getElementById("product-modal-backdrop")?.classList.remove("open");
    document.body.style.overflow = "";
    pages.menu._selectedToppings = [];
    pages.menu._selectedVariant = null;
  },

  _adjustQty(delta) {
    pages.menu._modalQty = Math.max(1, pages.menu._modalQty + delta);
    const qtyEl = document.getElementById("modal-qty");
    if (qtyEl) qtyEl.textContent = pages.menu._modalQty;
    pages.menu._updateModalPrice();
  },

  _addToCart() {
    const product = pages.menu._modalProduct;
    if (!product) return;
    const rtl = isRtl();

    // Require login for delivery/pickup, allow guest for dine-in
    const isDineIn = cart.getState().orderType === "dine_in";
    if (!isDineIn && !auth.isLoggedIn()) {
      showToast(rtl ? "يجب تسجيل الدخول أولاً للطلب" : "Please login first to order", "warning");
      pages.menu.closeModal();
      router.navigate("login");
      return;
    }
    const toppings = pages.menu._selectedToppings;
    const variant = pages.menu._selectedVariant;

    // Build modifiers array for cart
    const modifiers = toppings.map(name => {
      const t = pages.menu._TOPPINGS.find(x => x.name === name);
      return { groupId: "topping", optionId: name, name: name, price: t ? t.price : 2 };
    });

    // Calculate modifier total price (toppings + size extra)
    const toppingTotal = modifiers.reduce((s, m) => s + m.price, 0);
    const sizeExtra = variant ? (parseFloat(variant.price) || 0) : 0;
    const modifierPrice = toppingTotal + sizeExtra;

    // Build display name with variant + toppings
    let displayName = product.name;
    if (variant) displayName += " (" + variant.label + ")";
    if (toppings.length > 0) displayName += " + " + toppings.join(", ");

    // If size selected, add size modifier to modifiers array
    if (variant && sizeExtra > 0) {
      modifiers.unshift({ groupId: "size", optionId: variant.label, name: variant.label, price: sizeExtra });
    }

    // Base product price (without size extra, that's in modifierPrice)
    const itemProduct = {
      id: product.id,
      name: displayName,
      price: product.price,
      imageUrl: product.imageUrl,
    };

    cart.addItem(itemProduct, pages.menu._modalQty, modifiers, modifierPrice);
    pages.menu.closeModal();
    showToast((rtl ? "تمت الإضافة ✓" : "Added to cart ✓") + " " + product.name, "success");
    pages.menu._refreshCartUI();
    refreshCartDrawer();
  },

  scrollToCategory(catId) {
    const el = document.getElementById(`cat-${catId}`);
    if (el) {
      const offset = 120; // sticky nav height
      const y = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
    document.querySelectorAll(".menu-cat-tab").forEach(t => {
      t.classList.toggle("active", Number(t.dataset.catId) === catId);
    });
    pages.menu._activeCatId = catId;
  },

  _setupScrollSpy() {
    if (pages.menu._scrollObserver) pages.menu._scrollObserver.disconnect();
    pages.menu._scrollObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.id.replace("cat-", "");
          document.querySelectorAll(".menu-cat-tab").forEach(t => {
            t.classList.toggle("active", t.dataset.catId === id);
          });
        }
      });
    }, { rootMargin: "-40% 0px -55% 0px" });

    pages.menu._categories.forEach(c => {
      const el = document.getElementById(`cat-${c.id}`);
      if (el) pages.menu._scrollObserver.observe(el);
    });
  },

  // Get a real food image based on product name/category
  _getFoodImage(product) {
    const name = (product.name || "").toLowerCase();
    const cat = pages.menu._categories.find(c => c.id === product.categoryId);
    const catName = (cat?.name || "").toLowerCase();

    // Food image library by keywords
    const foodImages = {
      // Pizza
      "margherita": "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=300&h=200&fit=crop&q=80",
      "pepperoni": "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=300&h=200&fit=crop&q=80",
      "hawaii": "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=300&h=200&fit=crop&q=80",
      "quattro": "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=300&h=200&fit=crop&q=80",
      "tonno": "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=300&h=200&fit=crop&q=80",
      "funghi": "https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?w=300&h=200&fit=crop&q=80",
      "diavola": "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=300&h=200&fit=crop&q=80",
      "capricciosa": "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=300&h=200&fit=crop&q=80",
      "prosciutto": "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=300&h=200&fit=crop&q=80",
      "vegetariana": "https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?w=300&h=200&fit=crop&q=80",
      // Calzone
      "calzone": "https://images.unsplash.com/photo-1536964549093-0b3f3e440aab?w=300&h=200&fit=crop&q=80",
      // Pide
      "pide": "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=300&h=200&fit=crop&q=80",
      "lahmacun": "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=300&h=200&fit=crop&q=80",
      // Main dishes
      "schnitzel": "https://images.unsplash.com/photo-1599921841143-819065a55cc6?w=300&h=200&fit=crop&q=80",
      "chicken": "https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=300&h=200&fit=crop&q=80",
      "kebab": "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=300&h=200&fit=crop&q=80",
      "döner": "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=300&h=200&fit=crop&q=80",
      "steak": "https://images.unsplash.com/photo-1600891964092-4316c288032e?w=300&h=200&fit=crop&q=80",
      "burger": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300&h=200&fit=crop&q=80",
      "pasta": "https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=300&h=200&fit=crop&q=80",
      "spaghetti": "https://images.unsplash.com/photo-1612874742237-6526221588e3?w=300&h=200&fit=crop&q=80",
      "lasagna": "https://images.unsplash.com/photo-1574894709920-11b28e7367e3?w=300&h=200&fit=crop&q=80",
      "gyros": "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=300&h=200&fit=crop&q=80",
      "falafel": "https://images.unsplash.com/photo-1593001874117-c99c800e3eb7?w=300&h=200&fit=crop&q=80",
      // Fingerfood / Sides
      "nuggets": "https://images.unsplash.com/photo-1562967914-608f82629710?w=300&h=200&fit=crop&q=80",
      "pommes": "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=300&h=200&fit=crop&q=80",
      "fries": "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=300&h=200&fit=crop&q=80",
      "wings": "https://images.unsplash.com/photo-1569058242567-93de6f36f8e6?w=300&h=200&fit=crop&q=80",
      "onion ring": "https://images.unsplash.com/photo-1639024471283-03518883512d?w=300&h=200&fit=crop&q=80",
      "spring roll": "https://images.unsplash.com/photo-1585032226651-759b368d7246?w=300&h=200&fit=crop&q=80",
      "mozzarella stick": "https://images.unsplash.com/photo-1531749668029-2db88e4276c7?w=300&h=200&fit=crop&q=80",
      // Salads
      "salat": "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=300&h=200&fit=crop&q=80",
      "salad": "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=300&h=200&fit=crop&q=80",
      "caesar": "https://images.unsplash.com/photo-1546793665-c74683f339c1?w=300&h=200&fit=crop&q=80",
      // Desserts
      "tiramisu": "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=300&h=200&fit=crop&q=80",
      "brownie": "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=300&h=200&fit=crop&q=80",
      "ice cream": "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=300&h=200&fit=crop&q=80",
      "kuchen": "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=300&h=200&fit=crop&q=80",
      "cake": "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=300&h=200&fit=crop&q=80",
      "chocolate": "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=300&h=200&fit=crop&q=80",
      // Drinks
      "cola": "https://images.unsplash.com/photo-1554866585-cd94860890b7?w=300&h=200&fit=crop&q=80",
      "fanta": "https://images.unsplash.com/photo-1624517452488-04869289c4ca?w=300&h=200&fit=crop&q=80",
      "sprite": "https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=300&h=200&fit=crop&q=80",
      "wasser": "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=300&h=200&fit=crop&q=80",
      "water": "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=300&h=200&fit=crop&q=80",
      "juice": "https://images.unsplash.com/photo-1534353473418-4cfa6c56fd38?w=300&h=200&fit=crop&q=80",
      "saft": "https://images.unsplash.com/photo-1534353473418-4cfa6c56fd38?w=300&h=200&fit=crop&q=80",
      "coffee": "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=300&h=200&fit=crop&q=80",
      "kaffee": "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=300&h=200&fit=crop&q=80",
      "tee": "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=300&h=200&fit=crop&q=80",
      "tea": "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=300&h=200&fit=crop&q=80",
    };

    // Category-level fallbacks
    const catImages = {
      "pizza": "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=300&h=200&fit=crop&q=80",
      "calzone": "https://images.unsplash.com/photo-1536964549093-0b3f3e440aab?w=300&h=200&fit=crop&q=80",
      "pide": "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=300&h=200&fit=crop&q=80",
      "lahmacun": "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=300&h=200&fit=crop&q=80",
      "tellergerichte": "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=300&h=200&fit=crop&q=80",
      "fingerfood": "https://images.unsplash.com/photo-1562967914-608f82629710?w=300&h=200&fit=crop&q=80",
      "salat": "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=300&h=200&fit=crop&q=80",
      "dessert": "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=300&h=200&fit=crop&q=80",
      "getränke": "https://images.unsplash.com/photo-1554866585-cd94860890b7?w=300&h=200&fit=crop&q=80",
      "drinks": "https://images.unsplash.com/photo-1554866585-cd94860890b7?w=300&h=200&fit=crop&q=80",
    };

    // Match by product name keywords
    for (const [keyword, url] of Object.entries(foodImages)) {
      if (name.includes(keyword)) return url;
    }

    // Fallback by category name
    for (const [keyword, url] of Object.entries(catImages)) {
      if (catName.includes(keyword)) return url;
    }

    // Generic food image fallback
    return "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=300&h=200&fit=crop&q=80";
  },

  // Generate demo menu data for non-primary demo restaurants
  _generateDemoMenu(restaurant) {
    const cuisine = (restaurant.cuisine || "").toLowerCase();
    const menus = {
      burgers: {
        categories: [
          { id: 9001, name: "Popular Burgers" },
          { id: 9002, name: "Chicken Burgers" },
          { id: 9003, name: "Sides" },
          { id: 9004, name: "Drinks" },
          { id: 9005, name: "Desserts" },
        ],
        allProducts: [
          { id: 90001, categoryId: 9001, name: "Classic Cheeseburger", description: "Beef patty, cheddar, lettuce, tomato, pickles, special sauce", price: "14.90", imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300&h=200&fit=crop&q=80" },
          { id: 90002, categoryId: 9001, name: "Double Smash Burger", description: "Two smashed beef patties, American cheese, caramelized onions", price: "18.90", imageUrl: "https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=300&h=200&fit=crop&q=80" },
          { id: 90003, categoryId: 9001, name: "BBQ Bacon Burger", description: "Beef patty, crispy bacon, BBQ sauce, cheddar, onion rings", price: "17.50", imageUrl: "https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=300&h=200&fit=crop&q=80" },
          { id: 90004, categoryId: 9001, name: "Truffle Mushroom Burger", description: "Angus beef, sauteed mushrooms, truffle mayo, gruyere", price: "21.90", imageUrl: "https://images.unsplash.com/photo-1572802419224-296b0aeee0d9?w=300&h=200&fit=crop&q=80" },
          { id: 90005, categoryId: 9002, name: "Crispy Chicken Burger", description: "Buttermilk fried chicken, coleslaw, pickles, spicy mayo", price: "15.90", imageUrl: "https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=300&h=200&fit=crop&q=80" },
          { id: 90006, categoryId: 9002, name: "Grilled Chicken Avocado", description: "Grilled chicken breast, avocado, lettuce, ranch dressing", price: "16.50", imageUrl: "https://images.unsplash.com/photo-1525164286253-04e68b9d94c6?w=300&h=200&fit=crop&q=80" },
          { id: 90007, categoryId: 9003, name: "French Fries", description: "Crispy golden fries with sea salt", price: "5.90", imageUrl: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=300&h=200&fit=crop&q=80" },
          { id: 90008, categoryId: 9003, name: "Onion Rings", description: "Beer-battered crispy onion rings", price: "6.90", imageUrl: "https://images.unsplash.com/photo-1639024471283-03518883512d?w=300&h=200&fit=crop&q=80" },
          { id: 90009, categoryId: 9003, name: "Chicken Wings (6pc)", description: "Buffalo or BBQ sauce, served with blue cheese dip", price: "12.90", imageUrl: "https://images.unsplash.com/photo-1569058242567-93de6f36f8e6?w=300&h=200&fit=crop&q=80" },
          { id: 90010, categoryId: 9004, name: "Coca Cola", description: "330ml can", price: "3.50" },
          { id: 90011, categoryId: 9004, name: "Milkshake", description: "Vanilla, chocolate, or strawberry", price: "7.90" },
          { id: 90012, categoryId: 9005, name: "Brownie Sundae", description: "Warm chocolate brownie with vanilla ice cream", price: "8.90", imageUrl: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=300&h=200&fit=crop&q=80" },
        ]
      },
      japanese: {
        categories: [
          { id: 9001, name: "Sushi Rolls" },
          { id: 9002, name: "Nigiri & Sashimi" },
          { id: 9003, name: "Hot Dishes" },
          { id: 9004, name: "Sides" },
          { id: 9005, name: "Drinks" },
        ],
        allProducts: [
          { id: 90001, categoryId: 9001, name: "California Roll (8pc)", description: "Crab, avocado, cucumber, sesame", price: "14.90", imageUrl: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=300&h=200&fit=crop&q=80" },
          { id: 90002, categoryId: 9001, name: "Salmon Avocado Roll (8pc)", description: "Fresh salmon, avocado, rice, nori", price: "16.90", imageUrl: "https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?w=300&h=200&fit=crop&q=80" },
          { id: 90003, categoryId: 9001, name: "Dragon Roll (8pc)", description: "Shrimp tempura, avocado, eel sauce, tobiko", price: "19.90", imageUrl: "https://images.unsplash.com/photo-1553621042-f6e147245754?w=300&h=200&fit=crop&q=80" },
          { id: 90004, categoryId: 9001, name: "Spicy Tuna Roll (8pc)", description: "Spicy tuna, cucumber, sriracha mayo", price: "17.50", imageUrl: "https://images.unsplash.com/photo-1611143669185-af224c5e3252?w=300&h=200&fit=crop&q=80" },
          { id: 90005, categoryId: 9002, name: "Salmon Nigiri (2pc)", description: "Fresh Norwegian salmon on seasoned rice", price: "8.90" },
          { id: 90006, categoryId: 9002, name: "Tuna Sashimi (5pc)", description: "Premium bluefin tuna, thinly sliced", price: "18.90" },
          { id: 90007, categoryId: 9003, name: "Chicken Teriyaki", description: "Grilled chicken with teriyaki glaze, steamed rice", price: "18.90", imageUrl: "https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=300&h=200&fit=crop&q=80" },
          { id: 90008, categoryId: 9003, name: "Ramen Tonkotsu", description: "Rich pork broth, chashu, soft egg, noodles", price: "16.90", imageUrl: "https://images.unsplash.com/photo-1557872943-16a5ac26437e?w=300&h=200&fit=crop&q=80" },
          { id: 90009, categoryId: 9004, name: "Edamame", description: "Steamed soybeans with sea salt", price: "5.90" },
          { id: 90010, categoryId: 9004, name: "Miso Soup", description: "Traditional miso with tofu and wakame", price: "4.90" },
          { id: 90011, categoryId: 9005, name: "Green Tea", description: "Hot Japanese green tea", price: "3.50" },
          { id: 90012, categoryId: 9005, name: "Mochi Ice Cream (3pc)", description: "Matcha, strawberry, mango", price: "7.90" },
        ]
      },
      grills: {
        categories: [
          { id: 9001, name: "Steaks & Grills" },
          { id: 9002, name: "Platters" },
          { id: 9003, name: "Sides" },
          { id: 9004, name: "Salads" },
          { id: 9005, name: "Drinks" },
        ],
        allProducts: [
          { id: 90001, categoryId: 9001, name: "Ribeye Steak 300g", description: "Prime ribeye, grilled to perfection, herb butter", price: "38.90", imageUrl: "https://images.unsplash.com/photo-1600891964092-4316c288032e?w=300&h=200&fit=crop&q=80" },
          { id: 90002, categoryId: 9001, name: "Grilled Lamb Chops", description: "4 lamb chops, rosemary, garlic, mint sauce", price: "34.90", imageUrl: "https://images.unsplash.com/photo-1603360946369-dc9bb6258143?w=300&h=200&fit=crop&q=80" },
          { id: 90003, categoryId: 9001, name: "Mixed Grill Skewers", description: "Chicken, beef, and lamb skewers with vegetables", price: "26.90", imageUrl: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=300&h=200&fit=crop&q=80" },
          { id: 90004, categoryId: 9002, name: "Family Platter", description: "500g mixed meats, fries, salad, sauces (serves 2-3)", price: "54.90", imageUrl: "https://images.unsplash.com/photo-1544025162-d76694265947?w=300&h=200&fit=crop&q=80" },
          { id: 90005, categoryId: 9003, name: "Grilled Vegetables", description: "Zucchini, peppers, mushrooms, eggplant", price: "8.90" },
          { id: 90006, categoryId: 9003, name: "Baked Potato", description: "With sour cream and chives", price: "6.90" },
          { id: 90007, categoryId: 9003, name: "Coleslaw", description: "Creamy homemade coleslaw", price: "4.90" },
          { id: 90008, categoryId: 9004, name: "Caesar Salad", description: "Romaine, croutons, parmesan, Caesar dressing", price: "12.90" },
          { id: 90009, categoryId: 9005, name: "Fresh Lemonade", description: "Homemade with mint", price: "5.50" },
          { id: 90010, categoryId: 9005, name: "Iced Tea", description: "Peach or lemon", price: "4.50" },
        ]
      },
      italian: {
        categories: [
          { id: 9001, name: "Pasta" },
          { id: 9002, name: "Pizza" },
          { id: 9003, name: "Antipasti" },
          { id: 9004, name: "Desserts" },
          { id: 9005, name: "Drinks" },
        ],
        allProducts: [
          { id: 90001, categoryId: 9001, name: "Spaghetti Carbonara", description: "Guanciale, egg, pecorino, black pepper", price: "18.90", imageUrl: "https://images.unsplash.com/photo-1612874742237-6526221588e3?w=300&h=200&fit=crop&q=80" },
          { id: 90002, categoryId: 9001, name: "Penne Arrabbiata", description: "Spicy tomato sauce, garlic, chili, basil", price: "15.90", imageUrl: "https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=300&h=200&fit=crop&q=80" },
          { id: 90003, categoryId: 9001, name: "Lasagna Bolognese", description: "Layers of pasta, meat ragu, bechamel, parmesan", price: "19.90", imageUrl: "https://images.unsplash.com/photo-1574894709920-11b28e7367e3?w=300&h=200&fit=crop&q=80" },
          { id: 90004, categoryId: 9002, name: "Margherita Pizza", description: "San Marzano tomatoes, mozzarella, fresh basil", price: "16.90", imageUrl: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=300&h=200&fit=crop&q=80" },
          { id: 90005, categoryId: 9002, name: "Quattro Formaggi", description: "Mozzarella, gorgonzola, fontina, parmesan", price: "19.90", imageUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=300&h=200&fit=crop&q=80" },
          { id: 90006, categoryId: 9003, name: "Bruschetta Trio", description: "Tomato basil, mushroom, prosciutto", price: "12.90", imageUrl: "https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?w=300&h=200&fit=crop&q=80" },
          { id: 90007, categoryId: 9003, name: "Caprese Salad", description: "Buffalo mozzarella, tomatoes, basil, olive oil", price: "14.90" },
          { id: 90008, categoryId: 9004, name: "Tiramisu", description: "Classic Italian tiramisu with mascarpone", price: "9.90", imageUrl: "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=300&h=200&fit=crop&q=80" },
          { id: 90009, categoryId: 9004, name: "Panna Cotta", description: "Vanilla panna cotta with berry compote", price: "8.90" },
          { id: 90010, categoryId: 9005, name: "Espresso", description: "Italian espresso", price: "3.50" },
          { id: 90011, categoryId: 9005, name: "Sparkling Water", description: "San Pellegrino 500ml", price: "4.50" },
        ]
      },
      healthy: {
        categories: [
          { id: 9001, name: "Bowls" },
          { id: 9002, name: "Salads" },
          { id: 9003, name: "Smoothies" },
          { id: 9004, name: "Wraps" },
          { id: 9005, name: "Snacks" },
        ],
        allProducts: [
          { id: 90001, categoryId: 9001, name: "Acai Power Bowl", description: "Acai, banana, granola, berries, honey, coconut", price: "14.90", imageUrl: "https://images.unsplash.com/photo-1590301157890-4810ed352768?w=300&h=200&fit=crop&q=80" },
          { id: 90002, categoryId: 9001, name: "Quinoa Buddha Bowl", description: "Quinoa, avocado, chickpeas, kale, tahini", price: "16.90", imageUrl: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=300&h=200&fit=crop&q=80" },
          { id: 90003, categoryId: 9001, name: "Poke Bowl", description: "Salmon, rice, edamame, mango, sesame", price: "18.90", imageUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&h=200&fit=crop&q=80" },
          { id: 90004, categoryId: 9002, name: "Greek Salad", description: "Tomatoes, cucumber, olives, feta, red onion", price: "13.90" },
          { id: 90005, categoryId: 9002, name: "Chicken Avocado Salad", description: "Grilled chicken, avocado, mixed greens, vinaigrette", price: "15.90" },
          { id: 90006, categoryId: 9003, name: "Green Detox Smoothie", description: "Spinach, apple, ginger, lemon, cucumber", price: "8.90" },
          { id: 90007, categoryId: 9003, name: "Berry Blast Smoothie", description: "Mixed berries, banana, yogurt, honey", price: "8.90" },
          { id: 90008, categoryId: 9004, name: "Falafel Wrap", description: "Falafel, hummus, lettuce, tomato, tahini", price: "13.90" },
          { id: 90009, categoryId: 9005, name: "Energy Balls (4pc)", description: "Dates, oats, cocoa, coconut", price: "6.90" },
          { id: 90010, categoryId: 9005, name: "Hummus & Veggies", description: "Homemade hummus with carrot and celery sticks", price: "7.90" },
        ]
      },
      chinese: {
        categories: [
          { id: 9001, name: "Starters" },
          { id: 9002, name: "Main Courses" },
          { id: 9003, name: "Noodles & Rice" },
          { id: 9004, name: "Drinks" },
        ],
        allProducts: [
          { id: 90001, categoryId: 9001, name: "Spring Rolls (4pc)", description: "Crispy vegetable spring rolls with sweet chili", price: "8.90", imageUrl: "https://images.unsplash.com/photo-1585032226651-759b368d7246?w=300&h=200&fit=crop&q=80" },
          { id: 90002, categoryId: 9001, name: "Dim Sum Basket (6pc)", description: "Mixed steamed dumplings", price: "12.90" },
          { id: 90003, categoryId: 9001, name: "Wonton Soup", description: "Clear broth with pork wontons", price: "9.90" },
          { id: 90004, categoryId: 9002, name: "Kung Pao Chicken", description: "Chicken, peanuts, chili, Sichuan pepper", price: "18.90", imageUrl: "https://images.unsplash.com/photo-1525755662778-989d0524087e?w=300&h=200&fit=crop&q=80" },
          { id: 90005, categoryId: 9002, name: "Sweet & Sour Pork", description: "Crispy pork, bell peppers, pineapple", price: "17.90" },
          { id: 90006, categoryId: 9002, name: "Mapo Tofu", description: "Silken tofu in spicy Sichuan sauce", price: "15.90", isVegetarian: true },
          { id: 90007, categoryId: 9003, name: "Fried Rice", description: "Egg fried rice with vegetables and choice of protein", price: "14.90" },
          { id: 90008, categoryId: 9003, name: "Chow Mein", description: "Stir-fried noodles with vegetables and soy sauce", price: "15.90" },
          { id: 90009, categoryId: 9004, name: "Jasmine Tea", description: "Traditional Chinese jasmine tea", price: "3.90" },
          { id: 90010, categoryId: 9004, name: "Mango Juice", description: "Fresh mango juice", price: "5.50" },
        ]
      },
      turkish: {
        categories: [
          { id: 9001, name: "Kebabs" },
          { id: 9002, name: "Pide & Lahmacun" },
          { id: 9003, name: "Meze" },
          { id: 9004, name: "Drinks" },
        ],
        allProducts: [
          { id: 90001, categoryId: 9001, name: "Doner Kebab", description: "Seasoned meat, salad, garlic sauce, in fresh bread", price: "12.90", imageUrl: "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=300&h=200&fit=crop&q=80", isHalal: true },
          { id: 90002, categoryId: 9001, name: "Adana Kebab", description: "Spicy minced lamb on skewer, rice, salad", price: "18.90", isHalal: true },
          { id: 90003, categoryId: 9001, name: "Chicken Shish", description: "Marinated chicken breast skewers, grilled vegetables", price: "16.90", isHalal: true },
          { id: 90004, categoryId: 9001, name: "Mixed Grill Plate", description: "Doner, adana, chicken shish, rice, salad", price: "24.90", isHalal: true },
          { id: 90005, categoryId: 9002, name: "Lahmacun", description: "Turkish flatbread with spiced minced meat", price: "8.90", isHalal: true },
          { id: 90006, categoryId: 9002, name: "Cheese Pide", description: "Boat-shaped flatbread with melted cheese", price: "14.90" },
          { id: 90007, categoryId: 9003, name: "Hummus", description: "Creamy chickpea dip with olive oil", price: "6.90", isVegetarian: true },
          { id: 90008, categoryId: 9003, name: "Falafel Plate (6pc)", description: "Crispy falafel with tahini sauce", price: "10.90", isVegetarian: true },
          { id: 90009, categoryId: 9004, name: "Ayran", description: "Traditional yogurt drink", price: "3.50" },
          { id: 90010, categoryId: 9004, name: "Turkish Tea", description: "Black tea served in traditional glass", price: "2.90" },
        ]
      },
      desserts: {
        categories: [
          { id: 9001, name: "Cakes" },
          { id: 9002, name: "Pastries" },
          { id: 9003, name: "Ice Cream" },
          { id: 9004, name: "Hot Drinks" },
        ],
        allProducts: [
          { id: 90001, categoryId: 9001, name: "Chocolate Lava Cake", description: "Warm chocolate cake with molten center, vanilla ice cream", price: "11.90", imageUrl: "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=300&h=200&fit=crop&q=80" },
          { id: 90002, categoryId: 9001, name: "New York Cheesecake", description: "Classic creamy cheesecake with berry topping", price: "9.90", imageUrl: "https://images.unsplash.com/photo-1524351199678-941a58a3df50?w=300&h=200&fit=crop&q=80" },
          { id: 90003, categoryId: 9001, name: "Red Velvet Cake", description: "Red velvet sponge with cream cheese frosting", price: "8.90" },
          { id: 90004, categoryId: 9002, name: "Croissant", description: "Butter croissant, freshly baked", price: "4.50", imageUrl: "https://images.unsplash.com/photo-1555507036-ab1f4038024a?w=300&h=200&fit=crop&q=80" },
          { id: 90005, categoryId: 9002, name: "Pain au Chocolat", description: "Flaky pastry with dark chocolate", price: "4.90" },
          { id: 90006, categoryId: 9002, name: "Cinnamon Roll", description: "Warm cinnamon roll with cream cheese glaze", price: "5.90" },
          { id: 90007, categoryId: 9003, name: "Gelato (2 scoops)", description: "Choose from: vanilla, chocolate, pistachio, strawberry", price: "7.90" },
          { id: 90008, categoryId: 9003, name: "Sundae Supreme", description: "3 scoops, whipped cream, nuts, hot fudge", price: "11.90" },
          { id: 90009, categoryId: 9004, name: "Hot Chocolate", description: "Rich Belgian hot chocolate with whipped cream", price: "5.90" },
          { id: 90010, categoryId: 9004, name: "Cappuccino", description: "Double espresso with steamed milk foam", price: "4.90" },
        ]
      },
      mexican: {
        categories: [
          { id: 9001, name: "Tacos" },
          { id: 9002, name: "Burritos" },
          { id: 9003, name: "Sides & Starters" },
          { id: 9004, name: "Drinks" },
        ],
        allProducts: [
          { id: 90001, categoryId: 9001, name: "Beef Tacos (3pc)", description: "Seasoned beef, salsa, sour cream, cheese, lettuce", price: "14.90", imageUrl: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=300&h=200&fit=crop&q=80" },
          { id: 90002, categoryId: 9001, name: "Fish Tacos (3pc)", description: "Battered fish, chipotle mayo, cabbage slaw", price: "16.90" },
          { id: 90003, categoryId: 9001, name: "Chicken Tacos (3pc)", description: "Grilled chicken, pico de gallo, guacamole", price: "14.90" },
          { id: 90004, categoryId: 9002, name: "Classic Burrito", description: "Beef or chicken, rice, beans, cheese, salsa, sour cream", price: "15.90", imageUrl: "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=300&h=200&fit=crop&q=80" },
          { id: 90005, categoryId: 9002, name: "Veggie Burrito", description: "Black beans, rice, peppers, guacamole, cheese", price: "13.90", isVegetarian: true },
          { id: 90006, categoryId: 9003, name: "Nachos Supreme", description: "Tortilla chips, cheese, jalapenos, salsa, guacamole", price: "12.90" },
          { id: 90007, categoryId: 9003, name: "Guacamole & Chips", description: "Fresh avocado guacamole with tortilla chips", price: "8.90" },
          { id: 90008, categoryId: 9003, name: "Quesadilla", description: "Grilled tortilla with cheese and choice of filling", price: "11.90" },
          { id: 90009, categoryId: 9004, name: "Agua Fresca", description: "Watermelon or hibiscus", price: "5.50" },
          { id: 90010, categoryId: 9004, name: "Horchata", description: "Sweet rice milk with cinnamon", price: "5.90" },
        ]
      },
      indian: {
        categories: [
          { id: 9001, name: "Curries" },
          { id: 9002, name: "Tandoori" },
          { id: 9003, name: "Breads & Rice" },
          { id: 9004, name: "Drinks" },
        ],
        allProducts: [
          { id: 90001, categoryId: 9001, name: "Butter Chicken", description: "Tender chicken in rich tomato-butter sauce", price: "18.90", imageUrl: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=300&h=200&fit=crop&q=80", isHalal: true },
          { id: 90002, categoryId: 9001, name: "Lamb Rogan Josh", description: "Slow-cooked lamb in Kashmiri spices", price: "21.90", isHalal: true },
          { id: 90003, categoryId: 9001, name: "Palak Paneer", description: "Cottage cheese in spinach gravy", price: "15.90", isVegetarian: true },
          { id: 90004, categoryId: 9001, name: "Chicken Tikka Masala", description: "Grilled chicken in creamy masala sauce", price: "18.90", isHalal: true },
          { id: 90005, categoryId: 9002, name: "Tandoori Chicken", description: "Whole leg marinated in yogurt and spices", price: "16.90", isHalal: true },
          { id: 90006, categoryId: 9002, name: "Seekh Kebab (4pc)", description: "Spiced minced lamb skewers", price: "14.90", isHalal: true },
          { id: 90007, categoryId: 9003, name: "Garlic Naan", description: "Freshly baked garlic naan bread", price: "4.50" },
          { id: 90008, categoryId: 9003, name: "Biryani", description: "Fragrant basmati rice with choice of protein", price: "17.90" },
          { id: 90009, categoryId: 9004, name: "Mango Lassi", description: "Sweet yogurt drink with mango", price: "5.50" },
          { id: 90010, categoryId: 9004, name: "Masala Chai", description: "Spiced Indian tea with milk", price: "3.90" },
        ]
      },
      cafe: {
        categories: [
          { id: 9001, name: "Coffee" },
          { id: 9002, name: "Breakfast" },
          { id: 9003, name: "Sandwiches" },
          { id: 9004, name: "Pastries" },
        ],
        allProducts: [
          { id: 90001, categoryId: 9001, name: "Flat White", description: "Double espresso with silky steamed milk", price: "5.50", imageUrl: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=300&h=200&fit=crop&q=80" },
          { id: 90002, categoryId: 9001, name: "Iced Latte", description: "Espresso over ice with cold milk", price: "6.50" },
          { id: 90003, categoryId: 9001, name: "Matcha Latte", description: "Japanese matcha with oat milk", price: "6.90" },
          { id: 90004, categoryId: 9002, name: "Avocado Toast", description: "Sourdough, smashed avocado, poached egg, chili flakes", price: "14.90", imageUrl: "https://images.unsplash.com/photo-1541519227354-08fa5d50c44d?w=300&h=200&fit=crop&q=80" },
          { id: 90005, categoryId: 9002, name: "Eggs Benedict", description: "Poached eggs, ham, hollandaise on English muffin", price: "16.90" },
          { id: 90006, categoryId: 9002, name: "Granola Bowl", description: "Greek yogurt, granola, fresh berries, honey", price: "11.90" },
          { id: 90007, categoryId: 9003, name: "Club Sandwich", description: "Turkey, bacon, lettuce, tomato, mayo on toast", price: "15.90" },
          { id: 90008, categoryId: 9003, name: "Grilled Cheese", description: "Sourdough with cheddar and gruyere, tomato soup", price: "13.90" },
          { id: 90009, categoryId: 9004, name: "Chocolate Chip Cookie", description: "Freshly baked, warm and gooey", price: "3.90" },
          { id: 90010, categoryId: 9004, name: "Banana Bread", description: "Homemade banana bread with walnuts", price: "4.90" },
        ]
      },
    };

    // Find matching menu by cuisine, fallback to a generic one
    const key = Object.keys(menus).find(k => cuisine.includes(k)) || null;
    if (key) return menus[key];

    // For cuisines without a specific menu, generate a generic one
    const generic = {
      categories: [
        { id: 9001, name: "Popular Items" },
        { id: 9002, name: "Main Courses" },
        { id: 9003, name: "Sides" },
        { id: 9004, name: "Drinks" },
        { id: 9005, name: "Desserts" },
      ],
      allProducts: [
        { id: 90001, categoryId: 9001, name: restaurant.name + " Special", description: "Our signature dish, chef's recommendation", price: "19.90", imageUrl: restaurant.coverImage },
        { id: 90002, categoryId: 9001, name: "House Favorite", description: "Most popular item on our menu", price: "17.90" },
        { id: 90003, categoryId: 9002, name: "Grilled Chicken Plate", description: "Herb-marinated chicken with seasonal vegetables", price: "18.90" },
        { id: 90004, categoryId: 9002, name: "Pan-Seared Salmon", description: "Fresh salmon fillet with lemon butter sauce", price: "24.90" },
        { id: 90005, categoryId: 9002, name: "Vegetarian Platter", description: "Selection of seasonal vegetable dishes", price: "16.90", isVegetarian: true },
        { id: 90006, categoryId: 9003, name: "Mixed Salad", description: "Fresh garden salad with house dressing", price: "8.90" },
        { id: 90007, categoryId: 9003, name: "French Fries", description: "Crispy golden fries", price: "5.90" },
        { id: 90008, categoryId: 9004, name: "Soft Drink", description: "Coca Cola, Sprite, or Fanta", price: "3.50" },
        { id: 90009, categoryId: 9004, name: "Fresh Juice", description: "Orange, apple, or mixed", price: "5.90" },
        { id: 90010, categoryId: 9005, name: "Chocolate Cake", description: "Rich chocolate cake with cream", price: "8.90" },
      ]
    };
    return generic;
  },
};
