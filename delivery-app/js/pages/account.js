/**
 * account.js — Profile, order history, addresses, loyalty, wallet
 * Professional Just Eat-inspired design
 */
window.pages = window.pages || {};

pages.account = {
  _customer: null,
  _orders: [],
  _loyalty: null,
  _wallet: null,
  _addresses: [],

  async render(params, container) {
    const cfg = window.DELIVERY_CONFIG || {};
    const rtl = isRtl();
    const customer = auth.getCustomer();

    if (!customer) {
      container.innerHTML = pages.account._guestView(cfg, rtl);
      _setBottomNavActive("account");
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    pages.account._customer = customer;
    container.innerHTML = pages.account._skeleton(rtl);

    try {
      const [loyalty, wallet, orders, addresses] = await Promise.all([
        api.loyalty.get(customer.id).catch(() => ({ points: 0, tier: "bronze", nextTierPoints: 500 })),
        api.wallet.get(customer.id).catch(() => ({ balance: 0 })),
        api.orders.history(cfg.tenantId).catch(() => []),
        api.addresses.list().catch(() => []),
      ]);

      pages.account._loyalty = loyalty;
      pages.account._wallet = wallet;
      pages.account._orders = Array.isArray(orders) ? orders : (orders?.orders || []);
      pages.account._addresses = addresses;

      container.innerHTML = pages.account._build(customer, loyalty, wallet, cfg, rtl);
      _setBottomNavActive("account");
      if (window.lucide) window.lucide.createIcons();

    } catch (err) {
      container.innerHTML = `<div class="empty-state"><div class="empty-state__icon"><i data-lucide="alert-triangle" class="icon-2xl"></i></div><div class="empty-state__title">${err.message}</div><button class="btn btn-primary mt-md" onclick="router.navigate('account')">${isRtl() ? "إعادة المحاولة" : "Retry"}</button></div>`;
      if (window.lucide) window.lucide.createIcons();
    }
  },

  _guestView(cfg, rtl) {
    return `
<div class="account-page">
  <!-- Guest Hero -->
  <div class="account-hero account-hero--guest">
    <div class="account-hero__bg"></div>
    <div class="account-hero__content">
      <div class="account-avatar account-avatar--guest">
        <i data-lucide="user" class="icon-3xl"></i>
      </div>
      <h1 class="account-hero__title">${rtl ? "مرحباً بك في Barmagly" : "Welcome to Barmagly"}</h1>
      <p class="account-hero__sub">${rtl ? "سجل دخولك لتتبع طلباتك واكسب النقاط" : "Sign in to track orders, earn points & more"}</p>
      <div class="account-hero__actions">
        <button class="btn btn-primary btn-lg" onclick="router.navigate('login')">
          <i data-lucide="log-in" class="icon-sm"></i>
          ${rtl ? "تسجيل الدخول" : "Sign in"}
        </button>
        <button class="btn btn-outline-white btn-lg" onclick="router.navigate('login')">
          ${rtl ? "إنشاء حساب" : "Create account"}
        </button>
      </div>
    </div>
  </div>

  <!-- Guest quick links -->
  <div class="account-section">
    <div class="account-quick-grid">
      <div class="account-quick-card" onclick="router.navigate('offers')">
        <div class="account-quick-card__icon" style="background: rgba(255,87,34,0.1); color: var(--delivery-primary);"><i data-lucide="tag" class="icon-lg"></i></div>
        <span>${rtl ? "العروض" : "Offers"}</span>
      </div>
      <div class="account-quick-card" onclick="router.navigate('rewards')">
        <div class="account-quick-card__icon" style="background: rgba(255,193,7,0.1); color: #F59E0B;"><i data-lucide="award" class="icon-lg"></i></div>
        <span>${rtl ? "المكافآت" : "Rewards"}</span>
      </div>
      <div class="account-quick-card" onclick="router.navigate('stamps')">
        <div class="account-quick-card__icon" style="background: rgba(108,92,231,0.1); color: #6C5CE7;"><i data-lucide="stamp" class="icon-lg"></i></div>
        <span>${rtl ? "الطوابع" : "Stamps"}</span>
      </div>
      <div class="account-quick-card" onclick="router.navigate('help')">
        <div class="account-quick-card__icon" style="background: rgba(0,184,148,0.1); color: #00B894;"><i data-lucide="help-circle" class="icon-lg"></i></div>
        <span>${rtl ? "المساعدة" : "Help"}</span>
      </div>
    </div>
  </div>
</div>`;
  },

  _skeleton(rtl) {
    return `<div class="account-page">
      <div class="account-hero">
        <div class="account-hero__bg"></div>
        <div class="account-hero__content">
          <div class="skeleton" style="width:80px;height:80px;border-radius:50%;margin:0 auto var(--space-md)"></div>
          <div class="skeleton" style="width:150px;height:20px;margin:0 auto var(--space-sm);border-radius:8px"></div>
          <div class="skeleton" style="width:100px;height:14px;margin:0 auto;border-radius:8px"></div>
        </div>
      </div>
      <div style="padding:var(--space-md)">
        ${Array(4).fill('<div class="skeleton" style="height:60px;border-radius:12px;margin-bottom:var(--space-sm)"></div>').join("")}
      </div>
    </div>`;
  },

  _build(customer, loyalty, wallet, cfg, rtl) {
    const tierColors = { bronze: "#CD7F32", silver: "#9CA3AF", gold: "#F59E0B", platinum: "#6366F1" };
    const tierGradients = {
      bronze: "linear-gradient(135deg, #CD7F32, #B8860B)",
      silver: "linear-gradient(135deg, #C0C0C0, #A8A8A8)",
      gold: "linear-gradient(135deg, #FFD700, #F59E0B)",
      platinum: "linear-gradient(135deg, #6366F1, #8B5CF6)"
    };
    const tier = loyalty.tier || "bronze";
    const points = loyalty.points || 0;
    const nextPoints = loyalty.nextTierPoints || 500;
    const progress = Math.min(100, Math.round((points / nextPoints) * 100));
    const initials = (customer.name || customer.phone || "?").charAt(0).toUpperCase();
    const recentOrders = pages.account._orders.slice(0, 3);
    const currency = cfg.currency || "CHF";

    return `
<div class="account-page">
  <!-- Profile Hero -->
  <div class="account-hero">
    <div class="account-hero__bg"></div>
    <div class="account-hero__content">
      <div class="account-avatar">
        <span class="account-avatar__initials">${initials}</span>
        <button class="account-avatar__edit" onclick="pages.account._editProfile()" aria-label="Edit profile">
          <i data-lucide="pencil" class="icon-xs"></i>
        </button>
      </div>
      <h1 class="account-hero__name">${customer.name || customer.phone || "Guest"}</h1>
      <p class="account-hero__contact">${customer.phone || customer.email || ""}</p>
      <div class="account-tier-badge" style="background:${tierGradients[tier]}">
        ${tier === "gold" || tier === "platinum" ? '<i data-lucide="trophy" class="icon-xs"></i>' : '<i data-lucide="medal" class="icon-xs"></i>'}
        ${tier.charAt(0).toUpperCase() + tier.slice(1)} ${rtl ? "عضو" : "Member"}
      </div>
    </div>
  </div>

  <!-- Stats -->
  <div class="account-stats-bar">
    <div class="account-stat-item">
      <div class="account-stat-item__value">${pages.account._orders.length}</div>
      <div class="account-stat-item__label">${rtl ? "طلبات" : "Orders"}</div>
    </div>
    <div class="account-stat-item account-stat-item--highlight">
      <div class="account-stat-item__value">${points.toLocaleString()}</div>
      <div class="account-stat-item__label">${rtl ? "نقاط" : "Points"}</div>
    </div>
    <div class="account-stat-item">
      <div class="account-stat-item__value">${formatCurrency(wallet.balance || 0, currency)}</div>
      <div class="account-stat-item__label">${rtl ? "المحفظة" : "Wallet"}</div>
    </div>
  </div>

  <!-- Loyalty Progress -->
  <div class="account-section">
    <div class="account-loyalty-card" onclick="router.navigate('rewards')">
      <div class="account-loyalty-card__left">
        <div class="account-loyalty-card__icon" style="color:${tierColors[tier]}">
          <i data-lucide="star" class="icon-lg"></i>
        </div>
        <div class="account-loyalty-card__info">
          <div class="account-loyalty-card__title">${points.toLocaleString()} ${rtl ? "نقطة" : "points"}</div>
          <div class="account-loyalty-card__sub">${tier === "platinum" ? (rtl ? "أعلى مستوى!" : "Top tier!") : (rtl ? `${(nextPoints - points).toLocaleString()} نقطة للمستوى التالي` : `${(nextPoints - points).toLocaleString()} pts to next tier`)}</div>
        </div>
      </div>
      <div class="account-loyalty-card__right">
        <div class="account-loyalty-progress">
          <svg viewBox="0 0 36 36" class="account-loyalty-ring">
            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--delivery-border)" stroke-width="3"/>
            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="${tierColors[tier]}" stroke-width="3" stroke-dasharray="${progress}, 100" stroke-linecap="round"/>
          </svg>
          <span class="account-loyalty-ring__text">${progress}%</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Quick Actions -->
  <div class="account-section">
    <div class="account-quick-grid">
      <div class="account-quick-card" onclick="router.navigate('history')">
        <div class="account-quick-card__icon" style="background: rgba(255,87,34,0.1); color: var(--delivery-primary);"><i data-lucide="clipboard-list" class="icon-lg"></i></div>
        <span>${rtl ? "الطلبات" : "Orders"}</span>
        ${pages.account._orders.length > 0 ? `<span class="account-quick-card__badge">${pages.account._orders.length}</span>` : ""}
      </div>
      <div class="account-quick-card" onclick="router.navigate('favorites')">
        <div class="account-quick-card__icon" style="background: rgba(233,30,99,0.1); color: #E91E63;"><i data-lucide="heart" class="icon-lg"></i></div>
        <span>${rtl ? "المفضلة" : "Favorites"}</span>
      </div>
      <div class="account-quick-card" onclick="pages.account._showAddresses()">
        <div class="account-quick-card__icon" style="background: rgba(33,150,243,0.1); color: #2196F3;"><i data-lucide="map-pin" class="icon-lg"></i></div>
        <span>${rtl ? "العناوين" : "Addresses"}</span>
        ${pages.account._addresses.length > 0 ? `<span class="account-quick-card__badge">${pages.account._addresses.length}</span>` : ""}
      </div>
      <div class="account-quick-card" onclick="pages.account._topUpWallet()">
        <div class="account-quick-card__icon" style="background: rgba(0,184,148,0.1); color: #00B894;"><i data-lucide="wallet" class="icon-lg"></i></div>
        <span>${rtl ? "المحفظة" : "Wallet"}</span>
      </div>
    </div>
  </div>

  <!-- Recent Orders -->
  ${recentOrders.length > 0 ? `
  <div class="account-section">
    <div class="account-section__header">
      <h3>${rtl ? "آخر الطلبات" : "Recent orders"}</h3>
      <a onclick="router.navigate('history')" href="javascript:void(0)">${rtl ? "عرض الكل" : "See all"}</a>
    </div>
    <div class="account-orders-list">
      ${recentOrders.map(order => {
        var statusIcon = order.status === "delivered" ? "check-circle" : order.status === "pending" ? "clock" : "truck";
        var statusColor = order.status === "delivered" ? "var(--delivery-success)" : order.status === "cancelled" ? "var(--delivery-danger)" : "var(--delivery-primary)";
        return `
        <div class="account-order-card" onclick="router.navigate('tracking', {token: '${order.trackingToken || order.id}'})">
          <div class="account-order-card__status" style="color:${statusColor}">
            <i data-lucide="${statusIcon}" class="icon-md"></i>
          </div>
          <div class="account-order-card__info">
            <div class="account-order-card__id">${order.orderNumber || "#" + order.id}</div>
            <div class="account-order-card__date">${new Date(order.createdAt).toLocaleDateString()}</div>
            <div class="account-order-card__items">${(order.items || []).map(i => i.name).slice(0, 2).join(", ")}</div>
          </div>
          <div class="account-order-card__right">
            <div class="account-order-card__total">${formatCurrency(order.total || 0, currency)}</div>
            <span class="account-order-card__status-text" style="color:${statusColor}">${order.status}</span>
          </div>
        </div>`;
      }).join("")}
    </div>
  </div>` : ""}

  <!-- Menu Items -->
  <div class="account-section">
    <div class="account-menu-list">
      <div class="account-menu-row" onclick="router.navigate('rewards')">
        <div class="account-menu-row__icon" style="color:#F59E0B"><i data-lucide="award" class="icon-md"></i></div>
        <span class="account-menu-row__label">${rtl ? "المكافآت" : "Rewards"}</span>
        <span class="account-menu-row__arrow"><i data-lucide="chevron-right" class="icon-sm"></i></span>
      </div>
      <div class="account-menu-row" onclick="router.navigate('stamps')">
        <div class="account-menu-row__icon" style="color:#6C5CE7"><i data-lucide="stamp" class="icon-md"></i></div>
        <span class="account-menu-row__label">${rtl ? "بطاقات الطوابع" : "Stamp Cards"}</span>
        <span class="account-menu-row__arrow"><i data-lucide="chevron-right" class="icon-sm"></i></span>
      </div>
      <div class="account-menu-row" onclick="router.navigate('giftcards')">
        <div class="account-menu-row__icon" style="color:#E91E63"><i data-lucide="gift" class="icon-md"></i></div>
        <span class="account-menu-row__label">${rtl ? "بطاقات الهدايا" : "Gift Cards"}</span>
        <span class="account-menu-row__arrow"><i data-lucide="chevron-right" class="icon-sm"></i></span>
      </div>
      <div class="account-menu-row" onclick="router.navigate('offers')">
        <div class="account-menu-row__icon" style="color:#FF5722"><i data-lucide="tag" class="icon-md"></i></div>
        <span class="account-menu-row__label">${rtl ? "العروض والخصومات" : "Offers & Promos"}</span>
        <span class="account-menu-row__arrow"><i data-lucide="chevron-right" class="icon-sm"></i></span>
      </div>
    </div>
  </div>

  <div class="account-section">
    <div class="account-menu-list">
      <div class="account-menu-row" onclick="router.navigate('help')">
        <div class="account-menu-row__icon" style="color:#00B894"><i data-lucide="help-circle" class="icon-md"></i></div>
        <span class="account-menu-row__label">${rtl ? "مركز المساعدة" : "Help Center"}</span>
        <span class="account-menu-row__arrow"><i data-lucide="chevron-right" class="icon-sm"></i></span>
      </div>
      <div class="account-menu-row" onclick="pages.account._showNotificationSettings()">
        <div class="account-menu-row__icon" style="color:#2196F3"><i data-lucide="bell" class="icon-md"></i></div>
        <span class="account-menu-row__label">${rtl ? "الإشعارات" : "Notifications"}</span>
        <span class="account-menu-row__arrow"><i data-lucide="chevron-right" class="icon-sm"></i></span>
      </div>
      <div class="account-menu-row account-menu-row--danger" onclick="pages.account._logout()">
        <div class="account-menu-row__icon"><i data-lucide="log-out" class="icon-md"></i></div>
        <span class="account-menu-row__label">${rtl ? "تسجيل الخروج" : "Sign out"}</span>
      </div>
    </div>
  </div>

  <p class="account-version">Barmagly v2.0</p>
  <div class="home-spacer"></div>
</div>`;
  },

  async renderHistory(params, container) {
    const cfg = window.DELIVERY_CONFIG || {};
    const rtl = isRtl();
    const customer = auth.getCustomer();
    if (!customer) { router.navigate("login"); return; }

    container.innerHTML = `<div class="top-bar top-bar--sticky"><button class="top-bar__icon" onclick="history.back()">${rtl ? "›" : "‹"}</button><span class="top-bar__title">${rtl ? "سجل الطلبات" : "Order history"}</span></div><div style="display:flex;justify-content:center;padding:var(--space-3xl)"><div class="loading-spinner"></div></div>`;

    try {
      const orders = await api.orders.history(cfg.tenantId);
      const list = Array.isArray(orders) ? orders : (orders?.orders || []);
      const currency = cfg.currency || "CHF";

      const topBar = `<div class="top-bar top-bar--sticky"><button class="top-bar__icon" onclick="history.back()">${rtl ? "›" : "‹"}</button><span class="top-bar__title">${rtl ? "سجل الطلبات" : "Order history"} (${list.length})</span></div>`;

      if (list.length === 0) {
        container.innerHTML = topBar + `<div class="empty-state" style="margin-top:var(--space-3xl)"><div class="empty-state__icon"><i data-lucide="clipboard-list" class="icon-2xl"></i></div><div class="empty-state__title">${rtl ? "لا طلبات بعد" : "No orders yet"}</div><button class="btn btn-primary mt-md" onclick="router.navigate('home')">${rtl ? "اطلب الآن" : "Order now"}</button></div>`;
        if (window.lucide) window.lucide.createIcons();
        return;
      }

      container.innerHTML = topBar + `<div class="account-section">
        <div class="account-orders-list">
          ${list.map(order => {
            var statusIcon = order.status === "delivered" ? "check-circle" : order.status === "pending" ? "clock" : "truck";
            var statusColor = order.status === "delivered" ? "var(--delivery-success)" : order.status === "cancelled" ? "var(--delivery-danger)" : "var(--delivery-primary)";
            return `
            <div class="account-order-card" onclick="router.navigate('tracking', {token: '${order.trackingToken || order.id}'})">
              <div class="account-order-card__status" style="color:${statusColor}">
                <i data-lucide="${statusIcon}" class="icon-md"></i>
              </div>
              <div class="account-order-card__info">
                <div class="account-order-card__id">${order.orderNumber || "#" + order.id}</div>
                <div class="account-order-card__date">${new Date(order.createdAt).toLocaleString()}</div>
                <div class="account-order-card__items">${(order.items || []).map(i => i.name).slice(0,2).join(", ")}</div>
              </div>
              <div class="account-order-card__right">
                <div class="account-order-card__total">${formatCurrency(order.total || 0, currency)}</div>
                <span class="account-order-card__status-text" style="color:${statusColor}">${order.status}</span>
                ${order.status === "delivered" ? `<button class="btn btn-xs btn-outline" onclick="event.stopPropagation();api.orders.reorder(${order.id}).then(()=>{showToast('${rtl ? "تمت الإضافة" : "Added to cart"}','success');router.navigate('cart')}).catch(e=>showToast(e.message,'error'))">${rtl ? "أعد الطلب" : "Reorder"}</button>` : ""}
              </div>
            </div>`;
          }).join("")}
        </div>
      </div><div class="home-spacer"></div>`;
      if (window.lucide) window.lucide.createIcons();

    } catch (err) {
      container.innerHTML += `<div class="empty-state"><div class="empty-state__icon"><i data-lucide="alert-triangle" class="icon-2xl"></i></div><div class="empty-state__title">${err.message}</div></div>`;
      if (window.lucide) window.lucide.createIcons();
    }
  },

  _editProfile() {
    const customer = pages.account._customer;
    if (!customer) return;
    const name = prompt(isRtl() ? "اسمك" : "Your name:", customer.name || "");
    if (name === null) return;
    api.auth.updateMe({ name }).then(() => {
      auth.cacheCustomer({ ...customer, name });
      showToast(isRtl() ? "تم التحديث" : "Profile updated", "success");
      router.navigate("account");
    }).catch(err => showToast(err.message, "error"));
  },

  _showAddresses() {
    const addrs = pages.account._addresses;
    const rtl = isRtl();
    const app = document.getElementById("app");
    if (!app) return;

    const iconMap = { home: "home", work: "building-2" };

    app.innerHTML = `
<div class="account-page">
  <div class="top-bar top-bar--sticky">
    <button class="top-bar__icon" onclick="router.navigate('account')">${rtl ? "›" : "‹"}</button>
    <span class="top-bar__title">${rtl ? "عناوين التوصيل" : "Delivery Addresses"}</span>
  </div>
  ${addrs.length === 0 ? `
    <div class="empty-state" style="margin-top:var(--space-3xl)">
      <div class="empty-state__icon"><i data-lucide="map-pin" class="icon-2xl"></i></div>
      <h3 class="empty-state__title">${rtl ? "لا عناوين محفوظة" : "No saved addresses"}</h3>
      <p class="empty-state__text">${rtl ? "ستظهر عناوينك هنا بعد الطلب الأول" : "Your addresses will appear here after your first order"}</p>
    </div>
  ` : `
    <div class="account-section">
      <div class="account-orders-list">
        ${addrs.map(addr => `
          <div class="account-order-card">
            <div class="account-order-card__status" style="color:var(--delivery-primary)">
              <i data-lucide="${iconMap[addr.label] || "map-pin"}" class="icon-md"></i>
            </div>
            <div class="account-order-card__info">
              <div class="account-order-card__id">${addr.label || (rtl ? "عنوان" : "Address")}</div>
              <div class="account-order-card__items">${addr.address}${addr.floor ? ", " + addr.floor : ""}</div>
              ${addr.notes ? `<div class="account-order-card__date">${addr.notes}</div>` : ""}
            </div>
            <div class="account-order-card__right">
              ${addr.isDefault ? `<span class="badge badge-success" style="font-size:0.6875rem">${rtl ? "افتراضي" : "Default"}</span>` : `<button class="btn btn-xs btn-outline" onclick="api.addresses.setDefault(${addr.id}).then(()=>{showToast('${rtl ? "تم التعيين" : "Default set"}','success');pages.account._showAddresses()}).catch(e=>showToast(e.message,'error'))">${rtl ? "تعيين" : "Set default"}</button>`}
              <button class="btn btn-xs btn-ghost" onclick="if(confirm('${rtl ? "حذف؟" : "Delete?"}')){api.addresses.delete(${addr.id}).then(()=>{pages.account._addresses=pages.account._addresses.filter(a=>a.id!==${addr.id});pages.account._showAddresses();showToast('${rtl ? "تم الحذف" : "Deleted"}','success')}).catch(e=>showToast(e.message,'error'))}" aria-label="Delete">
                <i data-lucide="trash-2" class="icon-sm" style="color:var(--delivery-danger)"></i>
              </button>
            </div>
          </div>`).join("")}
      </div>
    </div>
  `}
</div>`;
    if (window.lucide) window.lucide.createIcons();
  },

  _showNotificationSettings() {
    const rtl = isRtl();
    var prefs = JSON.parse(localStorage.getItem("barmagly_notif_prefs") || '{"orders":true,"promos":true,"restaurants":true}');

    const app = document.getElementById("app");
    if (!app) return;
    app.innerHTML = `
<div class="account-page">
  <div class="top-bar top-bar--sticky">
    <button class="top-bar__icon" onclick="router.navigate('account')">${rtl ? "›" : "‹"}</button>
    <span class="top-bar__title">${rtl ? "الإشعارات" : "Notifications"}</span>
  </div>
  <div class="account-section">
    <div class="account-menu-list">
      <div class="account-menu-row">
        <div class="account-menu-row__icon" style="color:var(--delivery-primary)"><i data-lucide="truck" class="icon-md"></i></div>
        <span class="account-menu-row__label">${rtl ? "تحديثات الطلبات" : "Order updates"}</span>
        <label class="toggle-switch">
          <input type="checkbox" ${prefs.orders ? "checked" : ""} onchange="pages.account._toggleNotif('orders', this.checked)">
          <span class="toggle-slider"></span>
        </label>
      </div>
      <div class="account-menu-row">
        <div class="account-menu-row__icon" style="color:#E91E63"><i data-lucide="megaphone" class="icon-md"></i></div>
        <span class="account-menu-row__label">${rtl ? "العروض الترويجية" : "Promotions"}</span>
        <label class="toggle-switch">
          <input type="checkbox" ${prefs.promos ? "checked" : ""} onchange="pages.account._toggleNotif('promos', this.checked)">
          <span class="toggle-slider"></span>
        </label>
      </div>
      <div class="account-menu-row">
        <div class="account-menu-row__icon" style="color:#00B894"><i data-lucide="store" class="icon-md"></i></div>
        <span class="account-menu-row__label">${rtl ? "مطاعم جديدة" : "New restaurants"}</span>
        <label class="toggle-switch">
          <input type="checkbox" ${prefs.restaurants ? "checked" : ""} onchange="pages.account._toggleNotif('restaurants', this.checked)">
          <span class="toggle-slider"></span>
        </label>
      </div>
    </div>
  </div>
</div>`;
    if (window.lucide) window.lucide.createIcons();
  },

  _toggleNotif(key, val) {
    var prefs = JSON.parse(localStorage.getItem("barmagly_notif_prefs") || '{"orders":true,"promos":true,"restaurants":true}');
    prefs[key] = val;
    localStorage.setItem("barmagly_notif_prefs", JSON.stringify(prefs));
    showToast(isRtl() ? "تم الحفظ" : "Saved", "success");
  },

  _topUpWallet() {
    const amount = parseFloat(prompt(isRtl() ? "أدخل المبلغ للشحن:" : "Enter amount to top up:") || "0");
    if (!amount || amount <= 0) return;
    const cfg = window.DELIVERY_CONFIG || {};
    const customer = auth.getCustomer();
    if (!customer) return;
    api.wallet.topup(customer.id, cfg.tenantId, amount).then(() => {
      showToast(isRtl() ? "تم شحن المحفظة" : "Wallet topped up", "success");
      router.navigate("account");
    }).catch(err => showToast(err.message, "error"));
  },

  _logout() {
    const confirmed = confirm(isRtl() ? "هل تريد تسجيل الخروج؟" : "Sign out?");
    if (!confirmed) return;
    auth.logout();
    api.auth.logout().catch(() => {});
    showToast(isRtl() ? "تم تسجيل الخروج" : "Signed out", "success");
    router.navigate("home");
    const navLabel = document.getElementById("nav-user-label");
    if (navLabel) navLabel.textContent = isRtl() ? "تسجيل الدخول" : "Sign in";
  },
};
