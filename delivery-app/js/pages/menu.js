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
      pages.menu._categories = menu?.categories || [];
      pages.menu._products = menu?.allProducts || menu?.products || [];
      pages.menu._activeCatId = pages.menu._categories[0]?.id || null;
      pages.menu._orderType = cart.getState().orderType || "delivery";

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
      : `<div style="width:100%;height:100%;background:linear-gradient(135deg,var(--nav-bg),var(--delivery-primary-dark));display:flex;align-items:center;justify-content:center;font-size:6rem;opacity:0.25">🍽️</div>`}
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
        : `<div class="restaurant-info__logo-placeholder">🏪</div>`}
      <div class="flex-1">
        <h1 class="restaurant-info__name">${storeConfig?.storeName || storeConfig?.name || cfg.storeName || "Menu"}</h1>
        ${(storeConfig?.cuisine || storeConfig?.cuisineTypes) ? `<div class="restaurant-info__cuisine">${storeConfig.cuisine || storeConfig.cuisineTypes}</div>` : ""}
        <div class="restaurant-info__meta-row">
          <div class="restaurant-info__rating">
            <span class="rating-star">★</span>
            ${storeConfig?.rating ? parseFloat(storeConfig.rating).toFixed(1) : (storeConfig?.averageRating ? storeConfig.averageRating.toFixed(1) : "4.8")}
            <span class="text-muted font-medium" style="font-size:0.8125rem">(${storeConfig?.reviewCount || "100+"})</span>
          </div>
          <div class="restaurant-info__meta-item">
            ⏱ ${cfg.minDeliveryTime || 20}–${cfg.maxDeliveryTime || 45} min
          </div>
          ${storeConfig?.deliveryFee != null ? `
          <div class="restaurant-info__meta-item">
            🚚 ${parseFloat(storeConfig.deliveryFee) === 0
              ? `<span style="color:var(--delivery-success);font-weight:600">${rtl ? "توصيل مجاني" : "Free delivery"}</span>`
              : formatCurrency(storeConfig.deliveryFee, cfg.currency)}
          </div>` : ""}
          ${storeConfig?.minOrderAmount ? `
          <div class="restaurant-info__meta-item">
            🛒 ${rtl ? "حد أدنى" : "Min"} ${formatCurrency(storeConfig.minOrderAmount, cfg.currency)}
          </div>` : ""}
        </div>
      </div>
    </div>

    <!-- Order type toggle -->
    <div class="order-type-toggle">
      <button class="order-type-btn ${pages.menu._orderType === "delivery" ? "active" : ""}"
        onclick="pages.menu._setOrderType('delivery', this)">
        🚴 ${rtl ? "توصيل" : "Delivery"}
      </button>
      <button class="order-type-btn ${pages.menu._orderType === "pickup" ? "active" : ""}"
        onclick="pages.menu._setOrderType('pickup', this)">
        🏃 ${rtl ? "استلام ذاتي" : "Pickup"}
      </button>
    </div>

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
      <div style="padding:var(--space-md);font-weight:700;font-size:1rem;border-bottom:1px solid var(--delivery-border)">
        ${rtl ? "سلتك" : "Your order"}
      </div>
      <div id="sidebar-cart-items" style="padding:var(--space-sm)"></div>
      <div id="sidebar-cart-footer" class="hidden" style="padding:var(--space-md);border-top:1px solid var(--delivery-border)"></div>
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
      container.innerHTML = `<div class="empty-state"><div class="empty-state__icon">⚠️</div><div class="empty-state__title">Failed to load menu</div><button class="btn btn-primary mt-md" onclick="router.navigate('menu')">Retry</button></div>`;
    }
  },

  _skeleton() {
    return `<div class="menu-page">
      <div style="height:220px;background:var(--delivery-border)" class="skeleton"></div>
      <div style="padding:var(--space-lg) var(--space-md);background:var(--delivery-surface)">
        <div style="display:flex;gap:16px">
          <div class="skeleton" style="width:72px;height:72px;border-radius:12px;flex-shrink:0"></div>
          <div style="flex:1"><div class="skeleton" style="height:20px;margin-bottom:8px"></div><div class="skeleton" style="height:14px;width:60%"></div></div>
        </div>
      </div>
      <div style="height:52px;background:var(--delivery-surface);border-bottom:1px solid var(--delivery-border)"></div>
      <div style="padding:var(--space-md)">
        ${Array(4).fill('').map(() => `
          <div style="display:flex;gap:16px;padding:16px;background:var(--delivery-surface);border-radius:12px;margin-bottom:8px">
            <div style="flex:1"><div class="skeleton" style="height:16px;margin-bottom:8px"></div><div class="skeleton" style="height:12px;width:80%;margin-bottom:6px"></div><div class="skeleton" style="height:12px;width:40%"></div></div>
            <div class="skeleton" style="width:88px;height:88px;border-radius:8px;flex-shrink:0"></div>
          </div>`).join("")}
      </div>
    </div>`;
  },

  _itemRow(p) {
    const cfg = window.DELIVERY_CONFIG || {};
    const price = formatCurrency(parseFloat(p.price) || 0, cfg.currency);
    const hasImg = !!p.imageUrl;
    return `
      <div class="menu-item-card" onclick="pages.menu.openProductModal(${p.id})">
        <div class="menu-item-card__body">
          <div class="menu-item-card__name">${p.name}</div>
          ${p.description ? `<div class="menu-item-card__desc line-clamp-2">${p.description}</div>` : ""}
          <div class="menu-item-card__footer">
            <span class="product-card__price">${price}</span>
            ${p.isVegetarian ? `<span class="badge badge-success" style="font-size:0.7rem">🌱 Veg</span>` : ""}
            ${p.isHalal ? `<span class="badge badge-info" style="font-size:0.7rem">Halal</span>` : ""}
          </div>
        </div>
        ${hasImg
          ? `<img class="menu-item-card__image" src="${fixImageUrl(p.imageUrl)}" alt="${p.name}" loading="lazy" />`
          : `<div class="menu-item-card__image-placeholder">🍽️</div>`}
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
      sideItems.innerHTML = `<div class="empty-state" style="padding:var(--space-xl) var(--space-md)">
        <div style="font-size:2.5rem">🛒</div>
        <div style="font-size:0.9375rem;font-weight:600;margin-top:8px">${rtl ? "السلة فارغة" : "Cart is empty"}</div>
        <div style="font-size:0.8125rem;color:var(--delivery-text-muted);margin-top:4px">${rtl ? "اختر من القائمة" : "Select items from menu"}</div>
      </div>`;
      if (sideFoot) sideFoot.classList.add("hidden");
      return;
    }

    sideItems.innerHTML = state.items.map(item => {
      const safeKey = item._key.replace(/'/g, "\\'");
      return `
      <div class="cart-item" style="padding:var(--space-sm) 0">
        <div class="cart-item__info">
          <div class="cart-item__name" style="font-size:0.875rem">${item.name}</div>
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

  async openProductModal(productId) {
    const product = pages.menu._products.find(p => p.id === productId);
    if (!product) return;

    pages.menu._modalProduct = product;
    pages.menu._modalQty = 1;

    const cfg = window.DELIVERY_CONFIG || {};
    const rtl = isRtl();
    const price = parseFloat(product.price) || 0;

    const inner = document.getElementById("product-modal-inner");
    if (!inner) return;

    inner.innerHTML = `
      ${product.imageUrl
        ? `<img class="product-modal-image" src="${fixImageUrl(product.imageUrl)}" alt="${product.name}" />`
        : `<div style="height:180px;background:linear-gradient(135deg,var(--delivery-border),var(--delivery-primary-light));display:flex;align-items:center;justify-content:center;font-size:5rem">🍽️</div>`}
      <div class="product-modal-body">
        <h2 class="product-modal-name" id="product-modal-name">${product.name}</h2>
        ${product.description ? `<p class="product-modal-desc">${product.description}</p>` : ""}
        ${product.calories ? `<p class="text-sm text-muted">🔥 ${product.calories} kcal</p>` : ""}
        <div style="display:flex;gap:var(--space-xs);margin-top:var(--space-sm)">
          ${product.isVegetarian ? `<span class="badge badge-success">🌱 Vegetarian</span>` : ""}
          ${product.isHalal ? `<span class="badge badge-info">✓ Halal</span>` : ""}
          ${product.isSpicy ? `<span class="badge badge-danger">🌶 Spicy</span>` : ""}
        </div>
      </div>
      <div class="product-modal-footer">
        <div class="qty-control">
          <button class="qty-btn" onclick="pages.menu._adjustQty(-1)" aria-label="Decrease">−</button>
          <span class="qty-value" id="modal-qty">1</span>
          <button class="qty-btn" onclick="pages.menu._adjustQty(1)" aria-label="Increase">+</button>
        </div>
        <button class="btn btn-primary flex-1" id="modal-add-btn"
          onclick="pages.menu._addToCart()">
          ${rtl ? "أضف للسلة" : "Add to cart"} — <span id="modal-price">${formatCurrency(price, cfg.currency)}</span>
        </button>
      </div>`;

    document.getElementById("product-modal-backdrop").classList.add("open");
    document.body.style.overflow = "hidden";
  },

  closeModal() {
    document.getElementById("product-modal-backdrop")?.classList.remove("open");
    document.body.style.overflow = "";
  },

  _adjustQty(delta) {
    pages.menu._modalQty = Math.max(1, pages.menu._modalQty + delta);
    const qtyEl = document.getElementById("modal-qty");
    if (qtyEl) qtyEl.textContent = pages.menu._modalQty;
    const priceEl = document.getElementById("modal-price");
    if (priceEl && pages.menu._modalProduct) {
      const total = parseFloat(pages.menu._modalProduct.price) * pages.menu._modalQty;
      priceEl.textContent = formatCurrency(total, (window.DELIVERY_CONFIG || {}).currency);
    }
  },

  _addToCart() {
    const product = pages.menu._modalProduct;
    if (!product) return;
    cart.addItem(product, pages.menu._modalQty);
    pages.menu.closeModal();
    const rtl = isRtl();
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
};
