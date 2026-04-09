/**
 * account.js — Profile, order history, addresses, loyalty, wallet
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
      // Show guest state with login prompt
      container.innerHTML = pages.account._guestView(cfg, rtl);
      _setBottomNavActive("account");
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

      try {
        container.innerHTML = pages.account._build(customer, loyalty, wallet, cfg, rtl);
      } catch (renderErr) {
        console.error("[account] render error:", renderErr);
        // Render a minimal fallback with whatever data we have
        container.innerHTML = `
          <div class="account-page">
            <div class="profile-header">
              <div class="profile-avatar">${(customer.name||customer.phone||"?").charAt(0).toUpperCase()}</div>
              <div><div class="profile-header__name">${customer.name||customer.phone||""}</div></div>
            </div>
            <div style="padding:16px;text-align:center;color:var(--delivery-text-muted)">
              <p>${rtl ? "حدث خطأ في التحميل" : "Some data failed to load"}</p>
              <button class="btn btn-primary mt-md" onclick="router.navigate('account')">${rtl ? "إعادة المحاولة" : "Retry"}</button>
            </div>
          </div>`;
      }
      _setBottomNavActive("account");

    } catch (err) {
      container.innerHTML = `<div class="empty-state"><div class="empty-state__icon">⚠️</div><div class="empty-state__title">${err.message}</div><button class="btn btn-primary mt-md" onclick="router.navigate('account')">${isRtl() ? "إعادة المحاولة" : "Retry"}</button></div>`;
    }
  },

  _guestView(cfg, rtl) {
    return `
<div class="account-page">
  <div class="profile-header" style="flex-direction:column;align-items:center;text-align:center;padding:var(--space-3xl) var(--space-md)">
    <div class="profile-avatar" style="width:96px;height:96px;font-size:3rem;margin-bottom:var(--space-md)">👤</div>
    <h2 style="color:#fff">${rtl ? "سجل دخولك" : "Sign in to your account"}</h2>
    <p style="color:rgba(255,255,255,0.6);margin-top:var(--space-sm)">${rtl ? "تتبع طلباتك، واحفظ عناوينك، واكسب نقاط ولاء" : "Track orders, save addresses & earn loyalty points"}</p>
    <button class="btn btn-primary" style="margin-top:var(--space-lg);min-width:180px" onclick="router.navigate('login')">
      ${rtl ? "تسجيل الدخول / إنشاء حساب" : "Sign in / Register"}
    </button>
  </div>
  <div class="account-menu">
    <div class="account-menu-item" onclick="router.navigate('offers')">
      <div class="account-menu-item__icon" style="background:rgba(255,87,34,0.12);color:var(--delivery-primary)">🎁</div>
      <span class="account-menu-item__label">${rtl ? "العروض والخصومات" : "Offers & Discounts"}</span>
      <span class="account-menu-item__arrow">›</span>
    </div>
  </div>
</div>`;
  },

  _skeleton(rtl) {
    return `<div class="account-page">
      <div style="background:var(--nav-bg);height:160px;display:flex;align-items:center;padding:var(--space-xl) var(--space-md);gap:var(--space-md)">
        <div class="skeleton" style="width:72px;height:72px;border-radius:50%"></div>
        <div style="flex:1"><div class="skeleton" style="height:18px;width:60%;margin-bottom:8px"></div><div class="skeleton" style="height:14px;width:40%"></div></div>
      </div>
      <div style="background:var(--delivery-surface);margin-top:var(--space-sm);padding:var(--space-md)">
        ${Array(4).fill('<div class="skeleton" style="height:48px;margin-bottom:8px;border-radius:8px"></div>').join("")}
      </div>
    </div>`;
  },

  _build(customer, loyalty, wallet, cfg, rtl) {
    const tierColors = { bronze: "#CD7F32", silver: "#9CA3AF", gold: "#F59E0B", platinum: "#6366F1" };
    const tier = loyalty.tier || "bronze";
    const points = loyalty.points || 0;
    const nextPoints = loyalty.nextTierPoints || 500;
    const progress = Math.min(100, Math.round((points / nextPoints) * 100));
    const initials = (customer.name || customer.phone || "?").charAt(0).toUpperCase();
    const recentOrders = pages.account._orders.slice(0, 3);

    return `
<div class="account-page">
  <!-- Profile header -->
  <div class="profile-header">
    <div class="profile-avatar">${initials}</div>
    <div>
      <div class="profile-header__name">${customer.name || customer.phone || "Guest"}</div>
      <div class="profile-header__phone">${customer.phone || customer.email || ""}</div>
      <div class="profile-header__tier" style="margin-top:6px">
        <span class="badge badge-${tier}" style="font-size:0.75rem">
          ${tier === "bronze" ? "🥉" : tier === "silver" ? "🥈" : tier === "gold" ? "🥇" : "💎"} ${tier.charAt(0).toUpperCase() + tier.slice(1)}
        </span>
      </div>
    </div>
    <button class="btn btn-icon btn-ghost ms-auto" onclick="pages.account._editProfile()" style="color:rgba(255,255,255,0.6)" aria-label="Edit profile">✎</button>
  </div>

  <!-- Stats bar -->
  <div class="account-stats">
    <div class="account-stat">
      <div class="account-stat__value">${pages.account._orders.length}</div>
      <div class="account-stat__label">${rtl ? "طلبات" : "Orders"}</div>
    </div>
    <div class="account-stat">
      <div class="account-stat__value" style="color:var(--delivery-primary)">${points.toLocaleString()}</div>
      <div class="account-stat__label">${rtl ? "نقاط" : "Points"}</div>
    </div>
    <div class="account-stat">
      <div class="account-stat__value">${formatCurrency(wallet.balance || 0, cfg.currency)}</div>
      <div class="account-stat__label">${rtl ? "المحفظة" : "Wallet"}</div>
    </div>
  </div>

  <!-- Loyalty bar -->
  <div style="background:var(--delivery-surface);padding:var(--space-md);margin-top:var(--space-sm)">
    <div class="loyalty-bar">
      <div class="loyalty-bar__icon">⭐</div>
      <div class="loyalty-bar__info">
        <div class="loyalty-bar__points">${points.toLocaleString()} ${rtl ? "نقطة" : "pts"}</div>
        <div class="loyalty-bar__tier">${rtl ? `حتى ${tier === "platinum" ? "💎 أعلى مستوى!" : `${(nextPoints - points).toLocaleString()} نقطة للمستوى التالي`}` : `${tier === "platinum" ? "💎 Top tier!" : `${(nextPoints - points).toLocaleString()} pts to next tier`}`}</div>
        <div class="tier-progress" style="margin-top:8px">
          <div class="tier-progress__fill" style="width:${progress}%"></div>
        </div>
      </div>
    </div>
  </div>

  <!-- Recent orders -->
  ${recentOrders.length > 0 ? `
  <div style="margin-top:var(--space-sm)">
    <div style="background:var(--delivery-surface);padding:var(--space-md);border-bottom:1px solid var(--delivery-border);display:flex;justify-content:space-between;align-items:center">
      <h3 style="font-size:1rem;font-weight:700">${rtl ? "آخر الطلبات" : "Recent orders"}</h3>
      <a class="section-header__link" onclick="router.navigate('history')" href="#" role="button">${rtl ? "عرض الكل" : "See all"} →</a>
    </div>
    <div class="account-menu">
      ${recentOrders.map(order => `
        <div class="order-history-item" onclick="router.navigate('tracking', {token: '${order.trackingToken || order.id}'})">
          <div class="order-history-item__icon">🍽️</div>
          <div class="order-history-item__info">
            <div class="order-history-item__store">${order.orderNumber || "#" + order.id}</div>
            <div class="order-history-item__date">${new Date(order.createdAt).toLocaleDateString()}</div>
            <div class="order-history-item__items">${(order.items || []).map(i => i.name).slice(0, 2).join(", ")}</div>
          </div>
          <div class="order-history-item__right">
            <div class="order-history-item__total">${formatCurrency(order.total || 0, cfg.currency)}</div>
            <span class="badge badge-${order.status}" style="margin-top:4px">${order.status}</span>
          </div>
        </div>`).join("")}
    </div>
  </div>` : ""}

  <!-- Account menu -->
  <div class="account-menu" style="margin-top:var(--space-sm)">
    <div class="account-menu-item" onclick="router.navigate('history')">
      <div class="account-menu-item__icon" style="background:rgba(59,130,246,0.12);color:#3B82F6">📋</div>
      <div class="flex-1">
        <div class="account-menu-item__label">${rtl ? "سجل الطلبات" : "Order history"}</div>
        <div class="account-menu-item__sub">${pages.account._orders.length} ${rtl ? "طلب" : "orders"}</div>
      </div>
      <span class="account-menu-item__arrow">›</span>
    </div>

    <div class="account-menu-item" onclick="pages.account._showAddresses()">
      <div class="account-menu-item__icon" style="background:rgba(255,87,34,0.12);color:var(--delivery-primary)">📍</div>
      <div class="flex-1">
        <div class="account-menu-item__label">${rtl ? "عناوين التوصيل" : "Delivery addresses"}</div>
        <div class="account-menu-item__sub">${pages.account._addresses.length} ${rtl ? "عنوان" : "saved"}</div>
      </div>
      <span class="account-menu-item__arrow">›</span>
    </div>

    <div class="account-menu-item" onclick="router.navigate('offers')">
      <div class="account-menu-item__icon" style="background:rgba(139,92,246,0.12);color:#8B5CF6">🎁</div>
      <div class="flex-1">
        <div class="account-menu-item__label">${rtl ? "العروض والخصومات" : "Offers & Promos"}</div>
      </div>
      <span class="account-menu-item__arrow">›</span>
    </div>

    <div class="account-menu-item" onclick="pages.account._topUpWallet()">
      <div class="account-menu-item__icon" style="background:rgba(16,185,129,0.12);color:var(--delivery-success)">👛</div>
      <div class="flex-1">
        <div class="account-menu-item__label">${rtl ? "المحفظة" : "Wallet"}</div>
        <div class="account-menu-item__sub">${formatCurrency(wallet.balance || 0, cfg.currency)}</div>
      </div>
      <span class="account-menu-item__arrow">›</span>
    </div>

    <div class="account-menu-item" onclick="pages.account._logout()">
      <div class="account-menu-item__icon" style="background:rgba(239,68,68,0.12);color:var(--delivery-danger)">🚪</div>
      <span class="account-menu-item__label" style="color:var(--delivery-danger)">${rtl ? "تسجيل الخروج" : "Sign out"}</span>
    </div>
  </div>

  <div style="height:var(--space-3xl)"></div>
</div>`;
  },

  async renderHistory(params, container) {
    const cfg = window.DELIVERY_CONFIG || {};
    const rtl = isRtl();
    const customer = auth.getCustomer();
    if (!customer) { router.navigate("login"); return; }

    container.innerHTML = `<div class="top-bar"><button class="top-bar__icon" onclick="history.back()">${rtl ? "›" : "‹"}</button><span class="top-bar__title">${rtl ? "سجل الطلبات" : "Order history"}</span></div><div style="padding:var(--space-md);text-align:center"><div class="loading-spinner" style="margin:0 auto"></div></div>`;

    try {
      const orders = await api.orders.history(cfg.tenantId);
      const list = Array.isArray(orders) ? orders : (orders?.orders || []);

      const topBar = `<div class="top-bar" style="position:sticky;top:0;z-index:100"><button class="top-bar__icon" onclick="history.back()">${rtl ? "›" : "‹"}</button><span class="top-bar__title">${rtl ? "سجل الطلبات" : "Order history"} (${list.length})</span></div>`;

      if (list.length === 0) {
        container.innerHTML = topBar + `<div class="empty-state"><div class="empty-state__icon">📋</div><div class="empty-state__title">${rtl ? "لا طلبات بعد" : "No orders yet"}</div><button class="btn btn-primary mt-md" onclick="router.navigate('menu')">${rtl ? "اطلب الآن" : "Order now"}</button></div>`;
        return;
      }

      container.innerHTML = topBar + `<div class="account-menu" style="margin-top:var(--space-sm)">
        ${list.map(order => `
          <div class="order-history-item" onclick="router.navigate('tracking', {token: '${order.trackingToken || order.id}'})">
            <div class="order-history-item__icon">🍽️</div>
            <div class="order-history-item__info">
              <div class="order-history-item__store">${order.orderNumber || "#" + order.id}</div>
              <div class="order-history-item__date">${new Date(order.createdAt).toLocaleString()}</div>
              <div class="order-history-item__items">${(order.items || []).map(i => i.name).slice(0,2).join(", ")}</div>
            </div>
            <div class="order-history-item__right">
              <div class="order-history-item__total">${formatCurrency(order.total || 0, cfg.currency)}</div>
              <span class="badge badge-${order.status}" style="margin-top:4px;font-size:0.7rem">${order.status}</span>
              ${order.status === "delivered" ? `<button class="btn btn-sm btn-ghost" style="margin-top:4px" onclick="event.stopPropagation();api.orders.reorder(${order.id}).then(()=>{showToast('Reordering…','success');router.navigate('cart')}).catch(e=>showToast(e.message,'error'))">${rtl ? "🔄 أعد الطلب" : "🔄 Reorder"}</button>` : ""}
            </div>
          </div>`).join("")}
      </div><div style="height:100px"></div>`;

    } catch (err) {
      container.innerHTML += `<div class="empty-state"><div class="empty-state__icon">⚠️</div><div class="empty-state__title">${err.message}</div></div>`;
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
    if (addrs.length === 0) {
      showToast(rtl ? "لا عناوين محفوظة" : "No saved addresses", "warning");
      return;
    }
    alert(addrs.map(a => `${a.label || "Address"}: ${a.address}`).join("\n"));
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
    // Update header nav label
    const navLabel = document.getElementById("nav-user-label");
    if (navLabel) navLabel.textContent = isRtl() ? "تسجيل الدخول" : "Sign in";
  },
};
