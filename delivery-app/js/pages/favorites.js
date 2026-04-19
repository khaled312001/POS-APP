/**
 * favorites.js — Customer's favorite items
 * Grid of saved items with remove/reorder actions
 */
window.pages = window.pages || {};

pages.favorites = {
  _items: [],

  _t: {
    en: {
      title: "Favorites",
      empty: "No favorites yet",
      emptyDesc: "Browse menus and tap the heart icon to save items here",
      browse: "Browse Restaurants",
      remove: "Remove",
      addToCart: "Add to Cart",
      added: "Added to cart!",
      removed: "Removed from favorites",
      loginRequired: "Please log in to view favorites",
      login: "Log In",
    },
    ar: {
      title: "المفضلة",
      empty: "لا توجد مفضلات بعد",
      emptyDesc: "تصفح القوائم واضغط على أيقونة القلب لحفظ الأصناف هنا",
      browse: "تصفح المطاعم",
      remove: "إزالة",
      addToCart: "أضف للسلة",
      added: "تمت الإضافة للسلة!",
      removed: "تمت الإزالة من المفضلة",
      loginRequired: "يرجى تسجيل الدخول لعرض المفضلة",
      login: "تسجيل الدخول",
    },
    de: {
      title: "Favoriten",
      empty: "Noch keine Favoriten",
      emptyDesc: "Durchsuche Menüs und tippe auf das Herz-Symbol zum Speichern",
      browse: "Restaurants durchsuchen",
      remove: "Entfernen",
      addToCart: "In den Warenkorb",
      added: "Zum Warenkorb hinzugefügt!",
      removed: "Aus Favoriten entfernt",
      loginRequired: "Bitte einloggen um Favoriten zu sehen",
      login: "Einloggen",
    },
  },

  async render(params, container) {
    const cfg = window.DELIVERY_CONFIG || {};
    const lang = cfg.language || "en";
    const t = pages.favorites._t[lang] || pages.favorites._t.en;

    // Check auth
    if (!auth.isLoggedIn()) {
      container.innerHTML = `<div class="favorites-page">
        <div class="empty-state" style="margin-top:var(--space-3xl)">
          <div class="empty-state__icon"><i data-lucide="heart" class="icon-2xl"></i></div>
          <h3 class="empty-state__title">${t.loginRequired}</h3>
          <button class="btn btn-primary mt-md" onclick="router.navigate('login')">${t.login}</button>
        </div>
      </div>`;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    // Loading
    container.innerHTML = `<div class="favorites-page">
      <header class="favorites-page__header">
        <button class="btn-icon" onclick="history.back()" aria-label="Back">
          <i data-lucide="arrow-left" class="icon-md"></i>
        </button>
        <h2 class="favorites-page__title">${t.title}</h2>
      </header>
      <div class="favorites-page__body" id="favorites-body">
        <div class="skeleton-grid">
          ${Array(4).fill('<div class="skeleton skeleton-card" style="height:140px"></div>').join("")}
        </div>
      </div>
    </div>`;
    if (window.lucide) window.lucide.createIcons();

    try {
      var data = await api.favorites.list();
      pages.favorites._items = Array.isArray(data) ? data : (data.favorites || []);
      pages.favorites._renderItems(t, cfg);
    } catch (err) {
      document.getElementById("favorites-body").innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon"><i data-lucide="heart" class="icon-2xl"></i></div>
          <h3 class="empty-state__title">${t.empty}</h3>
          <p class="empty-state__text">${t.emptyDesc}</p>
          <button class="btn btn-primary mt-md" onclick="router.navigate('home')">${t.browse}</button>
        </div>`;
      if (window.lucide) window.lucide.createIcons();
    }
  },

  _renderItems: function (t, cfg) {
    var body = document.getElementById("favorites-body");
    if (!body) return;
    var items = pages.favorites._items;

    if (!items || items.length === 0) {
      body.innerHTML = `<div class="empty-state">
        <div class="empty-state__icon"><i data-lucide="heart" class="icon-2xl"></i></div>
        <h3 class="empty-state__title">${t.empty}</h3>
        <p class="empty-state__text">${t.emptyDesc}</p>
        <button class="btn btn-primary mt-md" onclick="router.navigate('home')">${t.browse}</button>
      </div>`;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    body.innerHTML = `<div class="favorites-grid">
      ${items.map(function (item, idx) {
        var imgUrl = item.imageUrl || item.productImage;
        var isRealImg = imgUrl && !imgUrl.startsWith("data:image/svg") && imgUrl.length > 10;
        var img = isRealImg ? fixImageUrl(imgUrl) : (pages.menu && pages.menu._getFoodImage ? pages.menu._getFoodImage(item) : "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&h=200&fit=crop&q=80");
        var price = formatCurrency(item.price || 0);

        return `<div class="favorites-card" id="fav-${item.productId || item.id}">
          <div class="favorites-card__img">
            <img src="${img}" alt="${item.name || item.productName || ''}" loading="lazy" decoding="async">
            <button class="favorites-card__remove" onclick="pages.favorites._remove(${item.productId || item.id}, event)" aria-label="${t.remove}">
              <i data-lucide="x" class="icon-sm"></i>
            </button>
          </div>
          <div class="favorites-card__info">
            <h4 class="favorites-card__name">${item.name || item.productName || ""}</h4>
            <p class="favorites-card__restaurant">${item.restaurantName || item.storeName || ""}</p>
            <div class="favorites-card__footer">
              <span class="favorites-card__price">${price}</span>
              <button class="btn btn-sm btn-primary" onclick="pages.favorites._addToCart(${idx})">
                <i data-lucide="shopping-cart" class="icon-xs"></i> ${t.addToCart}
              </button>
            </div>
          </div>
        </div>`;
      }).join("")}
    </div>`;
    if (window.lucide) window.lucide.createIcons();
  },

  _remove: async function (productId, event) {
    event.stopPropagation();
    var lang = (window.DELIVERY_CONFIG || {}).language || "en";
    var t = pages.favorites._t[lang] || pages.favorites._t.en;
    try {
      await api.favorites.remove(productId);
      pages.favorites._items = pages.favorites._items.filter(function (i) { return (i.productId || i.id) !== productId; });
      var el = document.getElementById("fav-" + productId);
      if (el) {
        el.style.transform = "scale(0.8)";
        el.style.opacity = "0";
        setTimeout(function () {
          pages.favorites._renderItems(t, window.DELIVERY_CONFIG || {});
        }, 300);
      }
      showToast(t.removed, "success");
    } catch (err) {
      showToast(err.message || "Error", "error");
    }
  },

  _addToCart: function (idx) {
    var item = pages.favorites._items[idx];
    if (!item) return;
    var lang = (window.DELIVERY_CONFIG || {}).language || "en";
    var t = pages.favorites._t[lang] || pages.favorites._t.en;
    cart.addItem({
      id: item.productId || item.id,
      name: item.name || item.productName,
      price: item.price,
      quantity: 1,
    });
    showToast(t.added, "success");
  },
};
