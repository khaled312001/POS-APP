/**
 * search.js — Full-text search across menu items and restaurants
 * Debounced input, grouped results, dietary filters, recent searches
 */
window.pages = window.pages || {};

pages.search = {
  _debounceTimer: null,
  _results: null,
  _recentSearches: [],

  _t: {
    en: {
      title: "Search",
      placeholder: "Search for dishes, restaurants...",
      recent: "Recent Searches",
      clear: "Clear",
      restaurants: "Restaurants",
      menuItems: "Menu Items",
      noResults: "No results for",
      tryAgain: "Try a different search term",
      filters: "Filters",
      all: "All",
      vegetarian: "Vegetarian",
      vegan: "Vegan",
      halal: "Halal",
      glutenFree: "Gluten Free",
      minOrder: "Min. order",
      deliveryTime: "min",
      startSearching: "Find your favourite food",
      startDesc: "Search across all restaurants and menu items",
    },
    ar: {
      title: "بحث",
      placeholder: "ابحث عن أطباق، مطاعم...",
      recent: "عمليات البحث الأخيرة",
      clear: "مسح",
      restaurants: "مطاعم",
      menuItems: "أصناف القائمة",
      noResults: "لا توجد نتائج لـ",
      tryAgain: "جرب مصطلح بحث مختلف",
      filters: "تصفية",
      all: "الكل",
      vegetarian: "نباتي",
      vegan: "نباتي صرف",
      halal: "حلال",
      glutenFree: "خالي من الجلوتين",
      minOrder: "الحد الأدنى",
      deliveryTime: "د",
      startSearching: "ابحث عن طعامك المفضل",
      startDesc: "ابحث في جميع المطاعم وأصناف القائمة",
    },
    de: {
      title: "Suche",
      placeholder: "Suche nach Gerichten, Restaurants...",
      recent: "Letzte Suchen",
      clear: "Löschen",
      restaurants: "Restaurants",
      menuItems: "Menüpunkte",
      noResults: "Keine Ergebnisse für",
      tryAgain: "Versuche einen anderen Suchbegriff",
      filters: "Filter",
      all: "Alle",
      vegetarian: "Vegetarisch",
      vegan: "Vegan",
      halal: "Halal",
      glutenFree: "Glutenfrei",
      minOrder: "Mindestbestellung",
      deliveryTime: "Min",
      startSearching: "Finde dein Lieblingsessen",
      startDesc: "Suche in allen Restaurants und Menüs",
    },
  },

  async render(params, container) {
    const cfg = window.DELIVERY_CONFIG || {};
    const rtl = isRtl();
    const lang = cfg.language || "en";
    const t = pages.search._t[lang] || pages.search._t.en;

    // Load recent searches from localStorage
    try {
      pages.search._recentSearches = JSON.parse(localStorage.getItem("recent_searches") || "[]");
    } catch (e) { pages.search._recentSearches = []; }

    container.innerHTML = `
<div class="search-page">
  <header class="search-page__header">
    <div class="search-page__input-wrap">
      <i data-lucide="search" class="icon-md search-page__icon"></i>
      <input type="search" class="search-page__input" id="search-input"
             placeholder="${t.placeholder}" autocomplete="off" autofocus
             aria-label="${t.title}">
      <button class="search-page__clear hidden" id="search-clear" aria-label="${t.clear}">
        <i data-lucide="x" class="icon-sm"></i>
      </button>
    </div>

    <div class="search-page__filters" id="search-filters">
      <button class="filter-chip active" data-filter="all">${t.all}</button>
      <button class="filter-chip" data-filter="vegetarian"><i data-lucide="leaf" class="icon-xs"></i> ${t.vegetarian}</button>
      <button class="filter-chip" data-filter="vegan"><i data-lucide="vegan" class="icon-xs"></i> ${t.vegan}</button>
      <button class="filter-chip" data-filter="halal"><i data-lucide="badge-check" class="icon-xs"></i> ${t.halal}</button>
      <button class="filter-chip" data-filter="gluten_free">${t.glutenFree}</button>
    </div>
  </header>

  <div class="search-page__body" id="search-body">
    ${pages.search._recentSearches.length > 0 ? pages.search._renderRecent(t) : pages.search._renderEmpty(t)}
  </div>
</div>`;

    if (window.lucide) window.lucide.createIcons();

    // Event listeners
    const input = document.getElementById("search-input");
    const clearBtn = document.getElementById("search-clear");

    input.addEventListener("input", function () {
      clearBtn.classList.toggle("hidden", !input.value);
      clearTimeout(pages.search._debounceTimer);
      if (!input.value.trim()) {
        document.getElementById("search-body").innerHTML =
          pages.search._recentSearches.length > 0 ? pages.search._renderRecent(t) : pages.search._renderEmpty(t);
        if (window.lucide) window.lucide.createIcons();
        return;
      }
      pages.search._debounceTimer = setTimeout(function () {
        pages.search._doSearch(input.value.trim(), cfg, t);
      }, 350);
    });

    clearBtn.addEventListener("click", function () {
      input.value = "";
      clearBtn.classList.add("hidden");
      document.getElementById("search-body").innerHTML =
        pages.search._recentSearches.length > 0 ? pages.search._renderRecent(t) : pages.search._renderEmpty(t);
      if (window.lucide) window.lucide.createIcons();
      input.focus();
    });

    // Filter chips
    document.getElementById("search-filters").addEventListener("click", function (e) {
      var chip = e.target.closest(".filter-chip");
      if (!chip) return;
      document.querySelectorAll("#search-filters .filter-chip").forEach(function (c) { c.classList.remove("active"); });
      chip.classList.add("active");
      if (input.value.trim()) {
        pages.search._doSearch(input.value.trim(), cfg, t);
      }
    });
  },

  async _doSearch(query, cfg, t) {
    var body = document.getElementById("search-body");
    body.innerHTML = `<div class="search-page__loading">
      <div class="skeleton skeleton-text" style="width:80%;height:20px;margin-bottom:12px"></div>
      <div class="skeleton skeleton-text" style="width:60%;height:20px;margin-bottom:12px"></div>
      <div class="skeleton skeleton-text" style="width:70%;height:20px"></div>
    </div>`;

    try {
      var data = await api.search.query(query, cfg.tenantId);
      pages.search._results = data;

      // Save to recent
      pages.search._saveRecent(query);

      var activeFilter = document.querySelector("#search-filters .filter-chip.active");
      var filter = activeFilter ? activeFilter.dataset.filter : "all";

      var restaurants = data.restaurants || [];
      var items = data.items || data.products || [];

      // Apply dietary filter
      if (filter !== "all") {
        items = items.filter(function (item) {
          return item.dietaryTags && item.dietaryTags.indexOf(filter) >= 0;
        });
      }

      if (restaurants.length === 0 && items.length === 0) {
        body.innerHTML = pages.search._renderNoResults(query, t);
        if (window.lucide) window.lucide.createIcons();
        return;
      }

      var html = "";

      if (restaurants.length > 0) {
        html += `<section class="search-results__section">
          <h3 class="search-results__heading"><i data-lucide="store" class="icon-sm"></i> ${t.restaurants}</h3>
          <div class="search-results__list">
            ${restaurants.map(function (r) { return pages.search._renderRestaurantCard(r, cfg, t); }).join("")}
          </div>
        </section>`;
      }

      if (items.length > 0) {
        html += `<section class="search-results__section">
          <h3 class="search-results__heading"><i data-lucide="utensils" class="icon-sm"></i> ${t.menuItems}</h3>
          <div class="search-results__grid">
            ${items.map(function (item) { return pages.search._renderItemCard(item, cfg); }).join("")}
          </div>
        </section>`;
      }

      body.innerHTML = html;
      if (window.lucide) window.lucide.createIcons();
    } catch (err) {
      body.innerHTML = `<div class="empty-state">
        <div class="empty-state__icon"><i data-lucide="wifi-off" class="icon-2xl"></i></div>
        <h3 class="empty-state__title">Search unavailable</h3>
        <p class="empty-state__text">${err.message || "Please try again later"}</p>
      </div>`;
      if (window.lucide) window.lucide.createIcons();
    }
  },

  _renderRestaurantCard: function (r, cfg, t) {
    var slug = r.slug || cfg.slug || "";
    var img = r.coverImage || "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=200&fit=crop&q=80";
    var rating = r.rating || r.avgRating || "4.5";
    var time = r.deliveryTime || r.avgDeliveryTime || "30";
    var minOrder = r.minOrder || "0";

    return `<div class="search-restaurant-card" onclick="router.navigate('menu', {slug: '${slug}'})">
      <div class="search-restaurant-card__img">
        <img src="${img}" alt="${r.name || ''}" loading="lazy" decoding="async">
      </div>
      <div class="search-restaurant-card__info">
        <h4 class="search-restaurant-card__name">${r.name || "Restaurant"}</h4>
        <p class="search-restaurant-card__cuisine">${r.cuisine || ""}</p>
        <div class="search-restaurant-card__meta">
          <span class="search-restaurant-card__rating"><i data-lucide="star" class="icon-xs"></i> ${rating}</span>
          <span class="search-restaurant-card__time"><i data-lucide="clock" class="icon-xs"></i> ${time} ${t.deliveryTime}</span>
          ${parseFloat(minOrder) > 0 ? `<span class="search-restaurant-card__min">${t.minOrder} ${formatCurrency(minOrder)}</span>` : ""}
        </div>
      </div>
    </div>`;
  },

  _renderItemCard: function (item, cfg) {
    var imgUrl = item.imageUrl;
    var isRealImg = imgUrl && !imgUrl.startsWith("data:image/svg") && imgUrl.length > 10;
    var img = isRealImg ? fixImageUrl(imgUrl) : pages.search._getItemImage(item);
    var price = formatCurrency(item.price || 0);

    return `<div class="search-item-card" onclick="router.navigate('menu')">
      <div class="search-item-card__img">
        <img src="${img}" alt="${item.name || ''}" loading="lazy" decoding="async">
      </div>
      <div class="search-item-card__info">
        <h4 class="search-item-card__name">${item.name || ""}</h4>
        <p class="search-item-card__restaurant">${item.restaurantName || item.storeName || ""}</p>
        <span class="search-item-card__price">${price}</span>
      </div>
    </div>`;
  },

  _getItemImage: function (item) {
    // Reuse menu.js _getFoodImage if available
    if (pages.menu && pages.menu._getFoodImage) {
      return pages.menu._getFoodImage(item);
    }
    return "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&h=200&fit=crop&q=80";
  },

  _renderRecent: function (t) {
    var items = pages.search._recentSearches.slice(0, 8);
    return `<div class="search-recent">
      <div class="search-recent__header">
        <h3 class="search-recent__title"><i data-lucide="history" class="icon-sm"></i> ${t.recent}</h3>
        <button class="search-recent__clear" onclick="pages.search._clearRecent()">${t.clear}</button>
      </div>
      <div class="search-recent__list">
        ${items.map(function (q) {
          return `<button class="search-recent__item" onclick="document.getElementById('search-input').value='${q.replace(/'/g, "\\'")}'; document.getElementById('search-input').dispatchEvent(new Event('input'))">
            <i data-lucide="clock" class="icon-sm"></i> ${q}
          </button>`;
        }).join("")}
      </div>
    </div>`;
  },

  _renderEmpty: function (t) {
    return `<div class="empty-state" style="margin-top:var(--space-3xl)">
      <div class="empty-state__icon"><i data-lucide="search" class="icon-2xl"></i></div>
      <h3 class="empty-state__title">${t.startSearching}</h3>
      <p class="empty-state__text">${t.startDesc}</p>
    </div>`;
  },

  _renderNoResults: function (query, t) {
    return `<div class="empty-state" style="margin-top:var(--space-3xl)">
      <div class="empty-state__icon"><i data-lucide="search-x" class="icon-2xl"></i></div>
      <h3 class="empty-state__title">${t.noResults} "${query}"</h3>
      <p class="empty-state__text">${t.tryAgain}</p>
    </div>`;
  },

  _saveRecent: function (query) {
    var list = pages.search._recentSearches.filter(function (q) { return q !== query; });
    list.unshift(query);
    if (list.length > 10) list = list.slice(0, 10);
    pages.search._recentSearches = list;
    try { localStorage.setItem("recent_searches", JSON.stringify(list)); } catch (e) {}
  },

  _clearRecent: function () {
    pages.search._recentSearches = [];
    try { localStorage.removeItem("recent_searches"); } catch (e) {}
    var body = document.getElementById("search-body");
    if (body) {
      var lang = (window.DELIVERY_CONFIG || {}).language || "en";
      var t = pages.search._t[lang] || pages.search._t.en;
      body.innerHTML = pages.search._renderEmpty(t);
      if (window.lucide) window.lucide.createIcons();
    }
  },
};
