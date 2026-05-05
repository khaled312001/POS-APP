/* Barmagly Customer SPA — single-file front-end.
   Hash routing: #/intro | #/login | #/register | #/home | #/restaurants
                 #/menu/:slug | #/broadcast | #/orders | #/track/:token
                 #/chat/:orderId | #/account
*/
(function () {
  "use strict";

  // ─── State ─────────────────────────────────────────────────────────
  var state = {
    auth:        JSON.parse(localStorage.getItem("bc_auth") || "null"),
    lang:        localStorage.getItem("bc_lang") || "en",
    cart:        JSON.parse(localStorage.getItem("bc_cart") || "[]"), // {productId, tenantId, tenantName, name, quantity, estimatedPrice, imageUrl}
    cartMode:    localStorage.getItem("bc_cart_mode") || "broadcast", // "broadcast" | "tenant:<id>"
    restaurants: [],
    products:    [],            // broadcast aggregate
    tenantMenu:  null,          // current restaurant menu
    activeOrder: null,
    orders:      [],            // user's orders
    activeChatRoom: null,
    currentRoute: null,
    ws: null,
  };

  function save() {
    localStorage.setItem("bc_cart", JSON.stringify(state.cart));
    localStorage.setItem("bc_cart_mode", state.cartMode);
    if (state.auth) localStorage.setItem("bc_auth", JSON.stringify(state.auth));
  }
  function escHtml(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[c]; }); }
  function $(id) { return document.getElementById(id); }
  function $$(sel) { return document.querySelectorAll(sel); }

  // ─── Toast ──────────────────────────────────────────────────────────
  function toast(msg, kind) {
    var el = document.createElement("div");
    el.className = "toast" + (kind ? " " + kind : "");
    el.textContent = msg;
    $("toasts").appendChild(el);
    setTimeout(function () { el.remove(); }, 3300);
  }

  // ─── API ────────────────────────────────────────────────────────────
  function api(method, path, body) {
    var headers = { "Content-Type": "application/json" };
    if (state.auth && state.auth.token) headers["Authorization"] = "Bearer " + state.auth.token;
    return fetch(path, {
      method: method,
      headers: headers,
      body: body ? JSON.stringify(body) : undefined,
    }).then(function (r) {
      return r.text().then(function (t) {
        var json = null; try { json = t ? JSON.parse(t) : null; } catch (e) {}
        if (!r.ok) {
          var err = new Error((json && (json.error || json.message)) || ("HTTP " + r.status));
          err.status = r.status;
          throw err;
        }
        return json;
      });
    });
  }

  // ─── Sound ──────────────────────────────────────────────────────────
  var audioCtx = null;
  function beep(freq, dur) {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      var o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.connect(g); g.connect(audioCtx.destination);
      o.frequency.value = freq || 800; g.gain.setValueAtTime(0.1, audioCtx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + (dur || 0.12));
      o.start(); o.stop(audioCtx.currentTime + (dur || 0.12));
    } catch (e) {}
  }

  // ─── Router ─────────────────────────────────────────────────────────
  var routes = {
    "intro":       renderIntro,
    "login":       renderLogin,
    "register":    renderRegister,
    "home":        renderHome,
    "restaurants": renderRestaurants,
    "menu":        renderMenu,
    "broadcast":   renderBroadcast,
    "orders":      renderOrders,
    "track":       renderTrack,
    "chat":        renderChat,
    "account":     renderAccount,
  };

  function navigate(name, args) {
    var hash = "#/" + name + (args ? "/" + args.join("/") : "");
    if (location.hash !== hash) location.hash = hash;
    else applyRoute();
  }

  function applyRoute() {
    var h = location.hash.replace(/^#\/?/, "") || "intro";
    var parts = h.split("/").filter(Boolean);
    var name = parts[0] || "intro";
    if (!routes[name]) name = "intro";
    // Auth gate — public routes that work without auth
    var publicOk = ["intro", "login", "register"];
    if (!state.auth && publicOk.indexOf(name) === -1) {
      navigate("intro");
      return;
    }
    state.currentRoute = name;
    $$(".page").forEach(function (p) { p.classList.remove("active"); });
    var pageEl = $("page-" + name);
    if (pageEl) pageEl.classList.add("active");
    // Show/hide tab bar (hidden on intro/login/register/chat)
    var hideTabs = ["intro", "login", "register", "chat"].indexOf(name) > -1;
    $("tab-bar").classList.toggle("hidden", hideTabs);
    // Highlight active tab
    $$(".tab").forEach(function (t) { t.classList.toggle("active", t.getAttribute("data-tab") === name); });
    // Run page renderer
    try { routes[name].apply(null, parts.slice(1)); } catch (e) { console.error(name + " render error:", e); }
    window.scrollTo(0, 0);
  }

  // ─── Auth ───────────────────────────────────────────────────────────
  function handleLogin(e) {
    e.preventDefault();
    var email = $("login-email").value.trim();
    var password = $("login-password").value;
    var btn = $("btn-login-submit");
    btn.disabled = true; btn.textContent = "Signing in…";
    api("POST", "/api/delivery/auth/login", { email: email, password: password, tenantId: 24 })
      .then(function (data) {
        state.auth = { token: data.token, customer: data.customer, isGuest: false };
        save(); toast("Welcome back, " + data.customer.name, "success");
        navigate("home");
      })
      .catch(function (err) { toast(err.message || "Login failed", "error"); })
      .finally(function () { btn.disabled = false; btn.textContent = "Sign in"; });
  }

  function handleRegister(e) {
    e.preventDefault();
    var name = $("reg-name").value.trim();
    var phone = $("reg-phone").value.trim();
    var email = $("reg-email").value.trim() || null;
    var password = $("reg-password").value;
    var btn = $("btn-register-submit");
    btn.disabled = true; btn.textContent = "Creating…";
    api("POST", "/api/delivery/auth/register", { name: name, phone: phone, email: email, password: password, tenantId: 24 })
      .then(function (data) {
        state.auth = { token: data.token, customer: { id: data.customer.id, name: name, phone: phone, email: email }, isGuest: false };
        save(); toast("Account created!", "success");
        navigate("home");
      })
      .catch(function (err) { toast(err.message || "Registration failed", "error"); })
      .finally(function () { btn.disabled = false; btn.textContent = "Create account"; });
  }

  function handleGuest() {
    var name = prompt("What's your name? (we'll greet you with this)") || "Guest";
    api("POST", "/api/delivery/auth/guest", { name: name, tenantId: 24 })
      .then(function (data) {
        state.auth = { token: data.token, customer: data.customer, isGuest: true };
        save(); toast("Welcome, " + name, "success");
        navigate("home");
      })
      .catch(function (err) { toast(err.message || "Guest login failed", "error"); });
  }

  function logout() {
    if (!confirm("Log out?")) return;
    api("POST", "/api/delivery/auth/logout", {}).catch(function () {});
    localStorage.removeItem("bc_auth");
    state.auth = null;
    state.cart = []; save();
    navigate("intro");
  }

  // ─── Pages ──────────────────────────────────────────────────────────
  function renderIntro() {
    if (state.auth) navigate("home");
  }

  function renderLogin() { /* form handled by submit listener */ }
  function renderRegister() { /* form handled by submit listener */ }

  function renderHome() {
    var c = state.auth.customer || {};
    $("home-greet-name").textContent = (c.name || "there").split(" ")[0];

    // Load restaurants if not cached
    if (state.restaurants.length === 0) {
      api("GET", "/api/delivery/restaurants").then(function (rs) {
        state.restaurants = rs || []; renderHomeRestaurants();
      }).catch(function () {});
    } else {
      renderHomeRestaurants();
    }

    // Load orders
    refreshOrders();
  }

  function renderHomeRestaurants() {
    var el = $("home-restaurants");
    if (state.restaurants.length === 0) {
      el.innerHTML = '<div class="empty"><div class="empty__icon">🏪</div><div class="empty__title">No restaurants yet</div></div>';
      return;
    }
    el.innerHTML = state.restaurants.slice(0, 4).map(function (r) {
      return restaurantCard(r);
    }).join("");
    bindRestaurantClicks(el);
  }

  function restaurantCard(r) {
    var img = r.coverImage || r.logo || "/api/delivery-app/icons/icon-192.png";
    return '<div class="card" data-slug="' + escHtml(r.slug) + '">'
         + '  <div class="card__cover"><img src="' + escHtml(img) + '" onerror="this.style.display=\'none\'" /></div>'
         + '  <div class="card__body">'
         + '    <div class="card__title">' + escHtml(r.name || "Restaurant") + '</div>'
         + '    <div class="card__sub">' + escHtml(r.cuisine || "") + ' · ⭐ ' + (r.rating || "—") + '</div>'
         + '  </div>'
         + '</div>';
  }

  function bindRestaurantClicks(el) {
    el.querySelectorAll("[data-slug]").forEach(function (n) {
      n.addEventListener("click", function () { navigate("menu", [n.getAttribute("data-slug")]); });
    });
  }

  function renderRestaurants() {
    var p = api("GET", "/api/delivery/restaurants").then(function (rs) {
      state.restaurants = rs || [];
      var listEl = $("restaurants-list");
      $("restaurants-count").textContent = state.restaurants.length + " restaurants";
      var renderList = function (q) {
        var filtered = q ? state.restaurants.filter(function (r) {
          var hay = ((r.name || "") + " " + (r.cuisine || "")).toLowerCase();
          return hay.indexOf(q.toLowerCase()) > -1;
        }) : state.restaurants;
        if (filtered.length === 0) {
          listEl.innerHTML = '<div class="empty"><div class="empty__icon">🔍</div><div class="empty__title">No results</div></div>';
          return;
        }
        listEl.innerHTML = filtered.map(function (r) {
          return '<div class="list-item" data-slug="' + escHtml(r.slug) + '">'
               + '  <img class="list-item__img" src="' + escHtml(r.coverImage || r.logo || "/api/delivery-app/icons/icon-192.png") + '" onerror="this.style.display=\'none\'" />'
               + '  <div class="list-item__body">'
               + '    <div class="list-item__title">' + escHtml(r.name) + '</div>'
               + '    <div class="list-item__sub">' + escHtml(r.cuisine || "") + ' · ⭐ ' + (r.rating || "—") + ' · 🕐 ' + (r.deliveryTime || "20") + ' min</div>'
               + '  </div>'
               + '</div>';
        }).join("");
        bindRestaurantClicks(listEl);
      };
      renderList("");
      $("restaurants-search").oninput = function (e) { renderList(e.target.value); };
    });
  }

  function renderMenu(slug) {
    if (!slug) { navigate("restaurants"); return; }
    $("menu-title").textContent = "Menu";
    $("menu-sub").textContent = "Loading…";
    Promise.all([
      api("GET", "/api/delivery/store/" + encodeURIComponent(slug)),
      api("GET", "/api/delivery/store/" + encodeURIComponent(slug) + "/menu"),
    ]).then(function (out) {
      var store = out[0], menu = out[1];
      state.tenantMenu = { slug: slug, store: store, menu: menu };
      $("menu-title").textContent = store.storeName || store.name || "Menu";
      $("menu-sub").textContent = (store.cuisine || "") + " · " + (menu.length || 0) + " items";
      // Build categories
      var cats = ["all"];
      menu.forEach(function (p) { if (p.category && cats.indexOf(p.category) === -1) cats.push(p.category); });
      var catEl = $("menu-cats"); var activeCat = "all";
      var renderProducts = function () {
        var q = ($("menu-search").value || "").toLowerCase().trim();
        var filtered = menu.filter(function (p) {
          if (activeCat !== "all" && p.category !== activeCat) return false;
          if (q) { var h = (p.name + " " + (p.description || "")).toLowerCase(); if (h.indexOf(q) === -1) return false; }
          return true;
        });
        if (filtered.length === 0) {
          $("menu-products").innerHTML = '<div class="empty"><div class="empty__icon">🍽️</div><div class="empty__title">No items</div></div>';
          return;
        }
        $("menu-products").innerHTML = filtered.map(function (p) {
          return productCard(p, store.tenantId, store.storeName || store.name);
        }).join("");
        bindProductClicks($("menu-products"));
      };
      catEl.innerHTML = cats.map(function (c) {
        return '<button class="badge" style="cursor:pointer;padding:7px 14px;font-size:12px;flex-shrink:0;background:' + (c === activeCat ? "var(--accent)" : "var(--surface-2)") + ';color:' + (c === activeCat ? "#fff" : "var(--text-2)") + ';" data-cat="' + escHtml(c) + '">' + escHtml(c === "all" ? "All" : c) + '</button>';
      }).join("");
      catEl.querySelectorAll("[data-cat]").forEach(function (b) {
        b.addEventListener("click", function () { activeCat = b.getAttribute("data-cat"); renderMenu(slug); /* easier: re-render */ });
      });
      $("menu-search").oninput = renderProducts;
      renderProducts();
    }).catch(function (err) {
      $("menu-products").innerHTML = '<div class="empty"><div class="empty__icon">⚠️</div><div class="empty__title">' + escHtml(err.message) + '</div></div>';
    });
  }

  function productCard(p, tenantId, tenantName) {
    var qty = (state.cart.find(function (it) { return it.productId === p.id && it.tenantId === tenantId; }) || {}).quantity || 0;
    return '<div class="card">'
         + '  <div class="card__cover">' + (p.imageUrl ? '<img src="' + escHtml(p.imageUrl) + '" onerror="this.style.display=\'none\'" />' : "") + '</div>'
         + '  <div class="card__body">'
         + '    <div class="card__title">' + escHtml(p.name) + '</div>'
         + (p.description ? '<div class="card__sub">' + escHtml(p.description.slice(0, 60)) + '</div>' : "")
         + '    <div class="card__foot">'
         + '      <span class="card__price">CHF ' + Number(p.price).toFixed(2) + '</span>'
         + (qty > 0
              ? '<div class="qty"><button class="qty__btn" data-act="dec" data-id="' + p.id + '" data-tenant="' + tenantId + '" data-tname="' + escHtml(tenantName || "") + '">−</button><span class="qty__num">' + qty + '</span><button class="qty__btn" data-act="inc" data-id="' + p.id + '" data-tenant="' + tenantId + '" data-tname="' + escHtml(tenantName || "") + '">+</button></div>'
              : '<button class="card__add" data-act="add" data-id="' + p.id + '" data-tenant="' + tenantId + '" data-tname="' + escHtml(tenantName || "") + '" data-name="' + escHtml(p.name) + '" data-price="' + p.price + '" data-img="' + escHtml(p.imageUrl || "") + '">+ Add</button>')
         + '    </div>'
         + '  </div>'
         + '</div>';
  }

  function bindProductClicks(scope) {
    scope.querySelectorAll("[data-act]").forEach(function (b) {
      b.addEventListener("click", function () {
        var act = b.getAttribute("data-act");
        var id = Number(b.getAttribute("data-id"));
        var tid = Number(b.getAttribute("data-tenant"));
        var tname = b.getAttribute("data-tname");
        if (act === "add") {
          var name = b.getAttribute("data-name");
          var price = Number(b.getAttribute("data-price"));
          var img = b.getAttribute("data-img");
          addToCart({ productId: id, tenantId: tid, tenantName: tname, name: name, quantity: 1, estimatedPrice: price, imageUrl: img });
        } else if (act === "inc") incToCart(id, tid);
        else if (act === "dec") decFromCart(id, tid);
      });
    });
  }

  // ─── Cart ───────────────────────────────────────────────────────────
  function addToCart(item) {
    // If switching restaurants in non-broadcast mode, ask
    var existingMode = state.cartMode;
    var newMode = state.currentRoute === "broadcast" ? "broadcast" : ("tenant:" + item.tenantId);
    if (state.cart.length > 0 && existingMode !== newMode && existingMode !== "broadcast") {
      if (!confirm("Your cart has items from another restaurant. Replace?")) return;
      state.cart = [];
    }
    state.cartMode = newMode;
    var ex = state.cart.find(function (it) { return it.productId === item.productId && it.tenantId === item.tenantId; });
    if (ex) ex.quantity += 1;
    else state.cart.push(item);
    save(); refreshCart(); beep(700, 0.08);
    if (state.currentRoute === "menu" && state.tenantMenu) renderMenu(state.tenantMenu.slug);
    if (state.currentRoute === "broadcast") renderBroadcast();
  }
  function incToCart(productId, tenantId) {
    var ex = state.cart.find(function (it) { return it.productId === productId && it.tenantId === tenantId; });
    if (ex) ex.quantity += 1;
    save(); refreshCart(); beep(700, 0.08);
    if (state.currentRoute === "menu" && state.tenantMenu) renderMenu(state.tenantMenu.slug);
    if (state.currentRoute === "broadcast") renderBroadcast();
  }
  function decFromCart(productId, tenantId) {
    var ex = state.cart.find(function (it) { return it.productId === productId && it.tenantId === tenantId; });
    if (!ex) return;
    ex.quantity -= 1;
    if (ex.quantity <= 0) state.cart = state.cart.filter(function (it) { return it !== ex; });
    if (state.cart.length === 0) state.cartMode = "broadcast";
    save(); refreshCart(); beep(400, 0.08);
    if (state.currentRoute === "menu" && state.tenantMenu) renderMenu(state.tenantMenu.slug);
    if (state.currentRoute === "broadcast") renderBroadcast();
  }
  function refreshCart() {
    var n = state.cart.reduce(function (s, it) { return s + it.quantity; }, 0);
    var total = state.cart.reduce(function (s, it) { return s + it.quantity * Number(it.estimatedPrice || 0); }, 0);
    var fab = $("cart-fab");
    if (n > 0) {
      fab.classList.remove("hidden");
      $("cart-fab-count").textContent = n;
      $("cart-fab-total").textContent = "CHF " + total.toFixed(2);
    } else fab.classList.add("hidden");
    // Drawer body
    var body = $("cart-body");
    if (state.cart.length === 0) {
      body.innerHTML = '<div class="empty"><div class="empty__icon">🛍️</div><div class="empty__title">Cart is empty</div></div>';
    } else {
      body.innerHTML = state.cart.map(function (it) {
        return '<div class="list-item">'
             + '  <div class="list-item__body">'
             + '    <div class="list-item__title">' + escHtml(it.name) + '</div>'
             + '    <div class="list-item__sub">🏪 ' + escHtml(it.tenantName || "") + ' · CHF ' + Number(it.estimatedPrice).toFixed(2) + '</div>'
             + '  </div>'
             + '  <div style="display:flex;flex-direction:column;align-items:end;gap:4px;">'
             + '    <span class="list-item__price">CHF ' + (it.quantity * Number(it.estimatedPrice)).toFixed(2) + '</span>'
             + '    <div class="qty"><button class="qty__btn" data-cart-act="dec" data-id="' + it.productId + '" data-tenant="' + it.tenantId + '">−</button><span class="qty__num">' + it.quantity + '</span><button class="qty__btn" data-cart-act="inc" data-id="' + it.productId + '" data-tenant="' + it.tenantId + '">+</button></div>'
             + '  </div>'
             + '</div>';
      }).join("");
      body.querySelectorAll("[data-cart-act]").forEach(function (b) {
        b.addEventListener("click", function () {
          var act = b.getAttribute("data-cart-act");
          var id = Number(b.getAttribute("data-id"));
          var tid = Number(b.getAttribute("data-tenant"));
          if (act === "inc") incToCart(id, tid); else decFromCart(id, tid);
          refreshCart();
        });
      });
    }
    $("cart-total").textContent = "CHF " + total.toFixed(2);
    $("btn-checkout").disabled = state.cart.length === 0;
  }

  function openCart() { $("cart-drawer").classList.add("open"); $("cart-overlay").classList.add("open"); }
  function closeCart() { $("cart-drawer").classList.remove("open"); $("cart-overlay").classList.remove("open"); }

  // ─── Broadcast ──────────────────────────────────────────────────────
  function renderBroadcast() {
    if (state.products.length === 0) {
      api("GET", "/api/delivery/broadcast/menu").then(function (data) {
        state.products = data.products || [];
        renderBroadcastProducts();
      });
    } else {
      renderBroadcastProducts();
    }
  }

  function renderBroadcastProducts() {
    var q = ($("bc-search").value || "").toLowerCase().trim();
    var filtered = state.products.filter(function (p) {
      if (!q) return true;
      var h = (p.name + " " + (p.tenantName || "") + " " + (p.category || "")).toLowerCase();
      return h.indexOf(q) > -1;
    });
    $("broadcast-sub").textContent = filtered.length + " items from " + new Set(state.products.map(function (p) { return p.tenantId; })).size + " restaurants";
    if (filtered.length === 0) {
      $("bc-products").innerHTML = '<div class="empty"><div class="empty__icon">🍽️</div><div class="empty__title">No dishes match</div></div>';
      return;
    }
    $("bc-products").innerHTML = filtered.slice(0, 60).map(function (p) {
      return productCard(p, p.tenantId, p.tenantName);
    }).join("");
    bindProductClicks($("bc-products"));
    $("bc-search").oninput = renderBroadcastProducts;
  }

  // ─── Orders + Tracking ─────────────────────────────────────────────
  function refreshOrders() {
    if (!state.auth) return;
    api("GET", "/api/delivery/orders/history").then(function (orders) {
      state.orders = orders || [];
      // Show recent on home
      var homeEl = $("home-orders");
      if (state.orders.length === 0) {
        homeEl.innerHTML = '<div class="empty"><div class="empty__icon">🛍️</div><div class="empty__title">No orders yet</div><div class="empty__sub">Place your first order</div></div>';
      } else {
        homeEl.innerHTML = state.orders.slice(0, 3).map(orderListItem).join("");
        bindOrderClicks(homeEl);
      }
      // Active count for tab badge
      var active = state.orders.filter(function (o) { return ["pending", "accepted", "preparing", "ready", "on_way"].indexOf(o.status) > -1; }).length;
      var badge = $("tab-badge-orders");
      if (active > 0) { badge.classList.remove("hidden"); badge.textContent = active; } else badge.classList.add("hidden");
    }).catch(function () {});
  }

  function orderListItem(o) {
    var s = o.status || "pending";
    return '<div class="list-item" data-token="' + escHtml(o.trackingToken || "") + '" data-id="' + o.id + '">'
         + '  <div class="list-item__body">'
         + '    <div class="list-item__title">Order #' + escHtml(o.orderNumber || o.id) + '</div>'
         + '    <div class="list-item__sub">CHF ' + Number(o.totalAmount || 0).toFixed(2) + ' · ' + new Date(o.createdAt).toLocaleString() + '</div>'
         + '  </div>'
         + '  <span class="status-pill" data-s="' + s + '">' + s.replace(/_/g, " ") + '</span>'
         + '</div>';
  }

  function bindOrderClicks(scope) {
    scope.querySelectorAll("[data-token]").forEach(function (n) {
      n.addEventListener("click", function () {
        var token = n.getAttribute("data-token");
        if (token) navigate("track", [token]);
      });
    });
  }

  function renderOrders() {
    refreshOrders();
    var el = $("orders-list");
    if (state.orders.length === 0) {
      el.innerHTML = '<div class="empty"><div class="empty__icon">🛍️</div><div class="empty__title">No orders yet</div></div>';
      return;
    }
    el.innerHTML = state.orders.map(orderListItem).join("");
    bindOrderClicks(el);
  }

  function renderTrack(token) {
    if (!token) { navigate("orders"); return; }
    $("track-title").textContent = "Tracking";
    $("track-sub").textContent = "Loading…";
    $("track-content").innerHTML = '<div class="skeleton" style="height:280px;margin-bottom:14px;"></div>';
    api("GET", "/api/delivery/orders/track/" + encodeURIComponent(token)).then(function (data) {
      var order = data.order, store = data.store;
      state.activeOrder = order;
      $("track-title").textContent = "Order #" + escHtml(order.orderNumber || order.id);
      $("track-sub").textContent = (store ? store.name : "") + " · " + new Date(order.createdAt).toLocaleString();
      $("btn-open-chat").onclick = function () { navigate("chat", [order.id]); };
      $("track-content").innerHTML = trackContentHtml(order, store);
      // Map
      var hasC = order.customerLat && order.customerLng;
      var hasD = order.driverLat && order.driverLng;
      if (hasC || hasD) {
        var lat = hasC ? Number(order.customerLat) : Number(order.driverLat);
        var lng = hasC ? Number(order.customerLng) : Number(order.driverLng);
        try {
          var map = L.map("track-map", { zoomControl: true }).setView([lat, lng], 14);
          L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OSM" }).addTo(map);
          if (hasC) L.marker([Number(order.customerLat), Number(order.customerLng)]).addTo(map).bindPopup("You");
          if (hasD) L.marker([Number(order.driverLat), Number(order.driverLng)], {
            icon: L.divIcon({ html: '<div style="background:#FF5722;border:3px solid #fff;color:#fff;width:32px;height:32px;border-radius:50%;display:grid;place-items:center;box-shadow:0 4px 14px rgba(255,87,34,.5)">🛵</div>', className: "", iconSize: [32, 32], iconAnchor: [16, 16] }),
          }).addTo(map);
        } catch (e) {}
      } else if (order.customerAddress) {
        // Geocode the address
        fetch("https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" + encodeURIComponent(order.customerAddress))
          .then(function (r) { return r.ok ? r.json() : null; })
          .then(function (j) {
            if (!j || !j.length) return;
            var lat = parseFloat(j[0].lat), lng = parseFloat(j[0].lon);
            try {
              var map = L.map("track-map", { zoomControl: true }).setView([lat, lng], 14);
              L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OSM" }).addTo(map);
              L.marker([lat, lng]).addTo(map).bindPopup("Delivery location");
            } catch (e) {}
          }).catch(function () {});
      }
    }).catch(function (err) {
      $("track-content").innerHTML = '<div class="empty"><div class="empty__icon">⚠️</div><div class="empty__title">' + escHtml(err.message) + '</div></div>';
    });
  }

  function trackContentHtml(o, store) {
    var STEPS = [
      { k: "pending", label: "Order received" },
      { k: "accepted", label: "Confirmed by restaurant" },
      { k: "preparing", label: "Being prepared" },
      { k: "ready", label: "Ready for pickup" },
      { k: "on_way", label: "On the way" },
      { k: "delivered", label: "Delivered" },
    ];
    var idx = STEPS.findIndex(function (s) { return s.k === o.status; });
    var pipeHtml = STEPS.map(function (s, i) {
      var cls = i < idx ? "done" : i === idx ? "active" : "";
      return '<div class="step ' + cls + '"><div class="step__dot">' + (i < idx ? "✓" : (i + 1)) + '</div><div class="step__label">' + s.label + '</div></div>';
    }).join("");
    var items = o.items || [];
    if (typeof items === "string") { try { items = JSON.parse(items); } catch (e) { items = []; } }
    var itemsHtml = items.map(function (it) {
      return '<div style="display:flex;justify-content:space-between;padding:6px 0;font-size:0.875rem;color:var(--text-2);"><span>' + (it.quantity || 1) + '× ' + escHtml(it.name || "") + '</span><span>CHF ' + Number((it.unitPrice || 0) * (it.quantity || 1)).toFixed(2) + '</span></div>';
    }).join("");
    return ''
      + '<div id="track-map" style="height:240px;background:var(--bg-2);margin-bottom:14px;"></div>'
      + '<div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--r-lg);padding:18px;margin-bottom:14px;">'
      + '  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;"><strong>Status</strong><span class="status-pill" data-s="' + (o.status || "pending") + '">' + (o.status || "pending").replace(/_/g, " ") + '</span></div>'
      + '  <div class="pipeline">' + pipeHtml + '</div>'
      + '</div>'
      + '<div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--r-lg);padding:18px;">'
      + '  <strong style="display:block;margin-bottom:10px;">Order details</strong>'
      + itemsHtml
      + '  <div style="display:flex;justify-content:space-between;padding-top:10px;border-top:1px solid var(--border);margin-top:8px;font-weight:800;"><span>Total</span><span style="color:var(--accent-2);">CHF ' + Number(o.totalAmount || 0).toFixed(2) + '</span></div>'
      + '</div>';
  }

  // ─── Chat ───────────────────────────────────────────────────────────
  function renderChat(orderId) {
    if (!orderId) { navigate("orders"); return; }
    state.activeChatRoom = Number(orderId);
    $("chat-title").textContent = "Order #" + orderId;
    $("chat-sub").textContent = "Loading…";
    $("chat-box").innerHTML = '<div class="skeleton" style="height:300px;"></div>';
    api("GET", "/api/customer/chats/order/" + orderId).then(function (data) {
      var msgs = data.messages || [];
      $("chat-sub").textContent = msgs.length + " messages";
      $("chat-box").innerHTML = '<div class="chat-msgs" id="chat-msgs">' + (
        msgs.length === 0
          ? '<div class="empty"><div class="empty__icon">💬</div><div class="empty__title">No messages yet</div><div class="empty__sub">Start a conversation</div></div>'
          : msgs.map(chatMsgHtml).join("")
      ) + '</div>';
      var box = document.querySelector("#chat-box");
      if (box) box.scrollTop = box.scrollHeight;
    }).catch(function (err) {
      $("chat-box").innerHTML = '<div class="empty"><div class="empty__icon">⚠️</div><div class="empty__title">' + escHtml(err.message) + '</div></div>';
    });
    // Back button: go to track instead of last hash
    $("btn-chat-back").onclick = function () {
      if (state.activeOrder && state.activeOrder.trackingToken) navigate("track", [state.activeOrder.trackingToken]);
      else navigate("orders");
    };
  }
  function chatMsgHtml(m) {
    var mine = m.senderType === "customer";
    var time = new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return '<div class="chat-msg ' + (mine ? "me" : "them") + '">'
         + (mine ? "" : '<strong style="display:block;font-size:0.72rem;opacity:0.7;margin-bottom:2px;">' + escHtml(m.senderName || "Restaurant") + '</strong>')
         + escHtml(m.body)
         + '<span class="chat-msg__time">' + time + '</span>'
         + '</div>';
  }
  function sendChatMessage() {
    var inp = $("chat-input"); var body = inp.value.trim();
    if (!body || !state.activeChatRoom) return;
    inp.value = "";
    api("POST", "/api/customer/chats/order/" + state.activeChatRoom + "/messages", { body: body }).then(function () {
      // Optimistic insert
      var html = chatMsgHtml({ senderType: "customer", body: body, createdAt: new Date() });
      var msgs = document.querySelector("#chat-msgs");
      if (msgs && !msgs.querySelector(".empty")) { msgs.insertAdjacentHTML("beforeend", html); msgs.scrollTop = msgs.scrollHeight; }
      else renderChat(state.activeChatRoom);
    }).catch(function (err) { toast(err.message || "Failed to send", "error"); });
  }

  // ─── Account ────────────────────────────────────────────────────────
  function renderAccount() {
    var c = state.auth.customer || {};
    $("account-sub").textContent = state.auth.isGuest ? "Guest session" : (c.email || c.phone || "");
    $("account-info").innerHTML = ''
      + '<div style="display:flex;align-items:center;gap:14px;margin-bottom:18px;">'
      + '  <div style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent-2));display:grid;place-items:center;font-size:24px;font-weight:800;color:#fff;">' + ((c.name || "G").slice(0, 1).toUpperCase()) + '</div>'
      + '  <div><div style="font-weight:800;font-size:1.1rem;">' + escHtml(c.name || "Guest") + '</div><div style="color:var(--text-dim);font-size:0.85rem;">' + (state.auth.isGuest ? "Guest user" : escHtml(c.email || c.phone || "")) + '</div></div>'
      + '</div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">'
      + '  <div style="background:var(--surface-2);padding:12px;border-radius:var(--r-md);text-align:center;"><div style="font-size:0.7rem;color:var(--text-dim);text-transform:uppercase;">Loyalty</div><div style="font-weight:800;font-size:1.05rem;">' + (c.loyaltyPoints || 0) + ' pts</div></div>'
      + '  <div style="background:var(--surface-2);padding:12px;border-radius:var(--r-md);text-align:center;"><div style="font-size:0.7rem;color:var(--text-dim);text-transform:uppercase;">Wallet</div><div style="font-weight:800;font-size:1.05rem;">CHF ' + Number(c.walletBalance || 0).toFixed(2) + '</div></div>'
      + '</div>';
  }

  // ─── Checkout ──────────────────────────────────────────────────────
  function startCheckout() {
    if (state.cart.length === 0) return;
    var name = (state.auth.customer || {}).name || prompt("Your name?");
    var phone = (state.auth.customer || {}).phone || prompt("Your phone? (+41…)");
    var address = prompt("Delivery address?");
    if (!name || !phone || !address) return toast("Name, phone, and address are required", "error");
    var total = state.cart.reduce(function (s, it) { return s + it.quantity * Number(it.estimatedPrice || 0); }, 0);

    if (state.cartMode === "broadcast") {
      // Broadcast order — any restaurant can accept
      api("POST", "/api/delivery/broadcast", {
        customerName: name, customerPhone: phone, customerAddress: address,
        items: state.cart.map(function (it) { return { productId: it.productId, name: it.name, quantity: it.quantity, estimatedPrice: it.estimatedPrice, tenantName: it.tenantName }; }),
        estimatedTotal: total, paymentMethod: "cash",
      }).then(function (data) {
        state.cart = []; save(); refreshCart(); closeCart();
        toast("Order broadcast! Waiting for a restaurant…", "success");
        // Poll for claim
        pollBroadcast(data.token);
      }).catch(function (err) { toast(err.message || "Failed to place order", "error"); });
    } else {
      // Tenant-specific order
      var tid = Number(state.cartMode.split(":")[1]);
      api("POST", "/api/delivery/orders", {
        tenantId: tid, customerName: name, customerPhone: phone, customerAddress: address,
        items: state.cart.map(function (it) { return { productId: it.productId, name: it.name, quantity: it.quantity, unitPrice: it.estimatedPrice, total: it.quantity * it.estimatedPrice }; }),
        subtotal: total, totalAmount: total, paymentMethod: "cash", orderType: "delivery",
      }).then(function (data) {
        state.cart = []; save(); refreshCart(); closeCart();
        toast("Order placed!", "success");
        if (data && data.trackingToken) navigate("track", [data.trackingToken]);
        else navigate("orders");
      }).catch(function (err) { toast(err.message || "Failed to place order", "error"); });
    }
  }

  function pollBroadcast(token) {
    var done = false;
    function tick() {
      if (done) return;
      api("GET", "/api/delivery/broadcast/" + token).then(function (data) {
        if (data.status === "claimed") {
          done = true;
          toast("✨ " + (data.claimedByName || "A restaurant") + " accepted your order!", "success");
          if (data.trackingToken) navigate("track", [data.trackingToken]);
          refreshOrders();
        } else if (data.status === "expired" || data.status === "cancelled") {
          done = true;
          toast("Order " + data.status + ". Please try again.", "error");
        }
      }).catch(function () {});
    }
    tick();
    var iv = setInterval(function () { if (done) clearInterval(iv); else tick(); }, 5000);
  }

  // ─── WebSocket (chat updates) ───────────────────────────────────────
  function connectWS() {
    if (state.ws) return;
    try {
      var proto = location.protocol === "https:" ? "wss:" : "ws:";
      var ws = new WebSocket(proto + "//" + location.host + "/api/ws/caller-id");
      state.ws = ws;
      ws.onmessage = function (ev) {
        try {
          var m = JSON.parse(ev.data);
          if (m.type === "chat_new_message") {
            // If user is in chat for this order, append; else show toast
            if (state.activeChatRoom === m.orderId && state.currentRoute === "chat") {
              var msgs = document.querySelector("#chat-msgs");
              if (msgs) {
                if (msgs.querySelector(".empty")) msgs.innerHTML = "";
                msgs.insertAdjacentHTML("beforeend", chatMsgHtml({ senderType: m.senderType, senderName: m.senderName, body: m.body, createdAt: m.createdAt }));
                msgs.scrollTop = msgs.scrollHeight;
              }
            } else if (m.senderType !== "customer") {
              toast("💬 " + (m.senderName || "Restaurant") + ": " + m.body.slice(0, 60), "success");
              beep(900, 0.12);
            }
          } else if (m.type === "broadcast_claimed" && state.cartMode === "broadcast") {
            // Customer's broadcast was claimed
            refreshOrders();
          }
        } catch (e) {}
      };
      ws.onclose = function () { state.ws = null; setTimeout(connectWS, 4000); };
    } catch (e) {}
  }

  // ─── Init ───────────────────────────────────────────────────────────
  // Listeners
  document.addEventListener("click", function (e) {
    var navTarget = e.target.closest("[data-nav]");
    if (navTarget) { e.preventDefault(); var n = navTarget.getAttribute("data-nav"); navigate(n); return; }
  });
  $("btn-go-login").onclick = function () { navigate("login"); };
  $("btn-go-register").onclick = function () { navigate("register"); };
  $("btn-go-guest").onclick = handleGuest;
  $("form-login").addEventListener("submit", handleLogin);
  $("form-register").addEventListener("submit", handleRegister);
  $("btn-logout").onclick = logout;
  $("cart-fab").onclick = openCart;
  $("btn-close-cart").onclick = closeCart;
  $("cart-overlay").onclick = closeCart;
  $("btn-checkout").onclick = startCheckout;
  $("btn-send-chat").onclick = sendChatMessage;
  $("chat-input").addEventListener("keydown", function (e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChatMessage(); } });
  $("btn-open-chats").onclick = function () { navigate("orders"); };

  window.addEventListener("hashchange", applyRoute);

  // First load
  refreshCart();
  connectWS();
  if (!location.hash) {
    if (state.auth) navigate("home"); else navigate("intro");
  } else {
    applyRoute();
  }
})();
