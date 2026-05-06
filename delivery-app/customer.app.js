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

  // ─── Dialog (replaces native alert/confirm/prompt) ─────────────────
  // Returns a Promise that resolves with:
  //   alert  → true on OK
  //   confirm → true on OK, false on Cancel
  //   prompt → string value on OK, null on Cancel
  //   form   → object {field: value} on OK, null on Cancel
  var dialog = (function () {
    var bd = $("modal-backdrop");
    var iconEl = $("modal-icon");
    var titleEl = $("modal-title");
    var msgEl = $("modal-msg");
    var fieldsEl = $("modal-fields");
    var okBtn = $("modal-ok");
    var cancelBtn = $("modal-cancel");
    var current = null;
    function close(result) {
      if (!current) return;
      bd.classList.remove("open");
      var resolve = current.resolve;
      current = null;
      // Allow CSS exit anim
      setTimeout(function () { resolve(result); }, 220);
    }
    okBtn.addEventListener("click", function () {
      if (!current) return;
      if (current.kind === "alert") return close(true);
      if (current.kind === "confirm") return close(true);
      if (current.kind === "prompt") {
        var inp = fieldsEl.querySelector("input");
        var v = (inp && inp.value || "").trim();
        if (current.required && !v) { inp.focus(); inp.style.borderColor = "var(--danger)"; return; }
        return close(v);
      }
      if (current.kind === "form") {
        var out = {};
        var ok = true;
        current.fields.forEach(function (f) {
          var el = fieldsEl.querySelector('[data-fkey="' + f.key + '"]');
          var v = (el && el.value || "").trim();
          if (f.required && !v) { ok = false; el.focus(); el.style.borderColor = "var(--danger)"; }
          out[f.key] = v;
        });
        if (!ok) return;
        return close(out);
      }
    });
    cancelBtn.addEventListener("click", function () {
      if (!current) return;
      if (current.kind === "alert") return close(true); // alerts only have OK
      if (current.kind === "confirm") return close(false);
      return close(null);
    });
    bd.addEventListener("click", function (e) {
      if (e.target === bd && current && current.kind !== "alert") {
        if (current.kind === "confirm") close(false);
        else close(null);
      }
    });
    document.addEventListener("keydown", function (e) {
      if (!current) return;
      if (e.key === "Escape" && current.kind !== "alert") {
        e.preventDefault();
        if (current.kind === "confirm") close(false);
        else close(null);
      } else if (e.key === "Enter" && (current.kind === "prompt" || current.kind === "alert")) {
        e.preventDefault();
        okBtn.click();
      }
    });

    function open(opts) {
      return new Promise(function (resolve) {
        current = { kind: opts.kind, fields: opts.fields, required: opts.required, resolve: resolve };
        iconEl.className = "modal__icon" + (opts.iconKind ? " " + opts.iconKind : "");
        iconEl.textContent = opts.icon || "✨";
        titleEl.textContent = opts.title || "";
        msgEl.textContent = opts.msg || "";
        msgEl.style.display = opts.msg ? "" : "none";
        fieldsEl.innerHTML = "";
        if (opts.kind === "prompt") {
          var inp = document.createElement("input");
          inp.className = "inp"; inp.type = opts.inputType || "text";
          inp.placeholder = opts.placeholder || "";
          inp.value = opts.defaultValue || "";
          fieldsEl.appendChild(inp);
          setTimeout(function () { inp.focus(); inp.select(); }, 30);
        } else if (opts.kind === "form") {
          (opts.fields || []).forEach(function (f) {
            var label = document.createElement("label");
            label.style.cssText = "font-size:0.72rem;font-weight:700;color:var(--text-2);text-transform:uppercase;letter-spacing:.4px;margin-bottom:-4px;display:block;";
            label.textContent = f.label + (f.required ? " *" : "");
            fieldsEl.appendChild(label);
            var el;
            if (f.type === "textarea") {
              el = document.createElement("textarea"); el.className = "txt"; el.rows = 3;
            } else {
              el = document.createElement("input"); el.className = "inp"; el.type = f.type || "text";
            }
            el.setAttribute("data-fkey", f.key);
            el.placeholder = f.placeholder || "";
            el.value = f.defaultValue || "";
            fieldsEl.appendChild(el);
          });
          setTimeout(function () { var first = fieldsEl.querySelector("input,textarea"); if (first) first.focus(); }, 30);
        }
        // Buttons
        if (opts.kind === "alert") {
          cancelBtn.style.display = "none";
          okBtn.textContent = opts.okLabel || "OK";
        } else {
          cancelBtn.style.display = "";
          cancelBtn.textContent = opts.cancelLabel || "Cancel";
          okBtn.textContent = opts.okLabel || "Confirm";
        }
        bd.classList.add("open");
      });
    }

    return {
      alert:   function (title, msg, opts) { return open(Object.assign({ kind: "alert", icon: "ℹ️", title: title, msg: msg }, opts || {})); },
      confirm: function (title, msg, opts) { return open(Object.assign({ kind: "confirm", icon: "❓", title: title, msg: msg }, opts || {})); },
      prompt:  function (title, opts) { return open(Object.assign({ kind: "prompt", icon: "✏️", title: title }, opts || {})); },
      form:    function (title, fields, opts) { return open(Object.assign({ kind: "form", icon: "📝", title: title, fields: fields }, opts || {})); },
    };
  })();

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
    dialog.prompt("Welcome!", {
      msg: "What's your name? We'll greet you with it.",
      placeholder: "Your name",
      icon: "👋",
      okLabel: "Continue",
      required: true,
    }).then(function (name) {
      if (name === null) return; // cancelled
      api("POST", "/api/delivery/auth/guest", { name: name, tenantId: 24 })
        .then(function (data) {
          state.auth = { token: data.token, customer: data.customer, isGuest: true };
          save(); toast("Welcome, " + name, "success");
          navigate("home");
        })
        .catch(function (err) { toast(err.message || "Guest login failed", "error"); });
    });
  }

  function logout() {
    dialog.confirm("Log out?", "You'll need to sign in again to see your orders.", {
      icon: "👋", iconKind: "warn", okLabel: "Log out", cancelLabel: "Stay",
    }).then(function (ok) {
      if (!ok) return;
      api("POST", "/api/delivery/auth/logout", {}).catch(function () {});
      localStorage.removeItem("bc_auth");
      state.auth = null;
      state.cart = []; save();
      navigate("intro");
    });
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
  // Cart items with variants/modifiers/notes need a unique signature so
  // ordering "Pizza (Large) + Cheese" and "Pizza (Small)" creates two lines.
  function cartSig(it) {
    return [it.productId, it.tenantId, it.variant || "", (it.modifiers || []).join("|"), it.notes || ""].join("§");
  }

  function addToCart(item) {
    // If switching restaurants in non-broadcast mode, ask before clearing cart
    var existingMode = state.cartMode;
    var newMode = state.currentRoute === "broadcast" ? "broadcast" : ("tenant:" + item.tenantId);
    if (state.cart.length > 0 && existingMode !== newMode && existingMode !== "broadcast") {
      dialog.confirm("Replace cart?", "Your cart has items from another restaurant. Adding this dish will clear them.", {
        icon: "🛒", iconKind: "warn", okLabel: "Replace", cancelLabel: "Keep cart",
      }).then(function (ok) {
        if (!ok) return;
        state.cart = [];
        state.cartMode = newMode;
        state.cart.push(item);
        save(); refreshCart(); beep(700, 0.08);
        if (state.currentRoute === "menu" && state.tenantMenu) renderMenu(state.tenantMenu.slug);
        if (state.currentRoute === "broadcast") renderBroadcast();
      });
      return;
    }
    state.cartMode = newMode;
    var sig = cartSig(item);
    var ex = state.cart.find(function (it) { return cartSig(it) === sig; });
    if (ex) ex.quantity += (item.quantity || 1);
    else state.cart.push(Object.assign({ quantity: 1 }, item));
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
  // Local state for the broadcast page (kept on `state.bc` so we can persist
  // chip/sort selection across re-renders triggered by search input).
  if (!state.bc) state.bc = { activeCat: "all", sort: "popular", restaurants: [], categories: [] };

  function renderBroadcast() {
    if (state.products.length === 0 || !state.bc.restaurants.length) {
      api("GET", "/api/delivery/broadcast/menu").then(function (data) {
        state.products = data.products || [];
        state.bc.restaurants = data.restaurants || [];
        state.bc.categories = ["all"].concat((data.categories || []).filter(Boolean));
        wireBroadcastUI();
        renderBroadcastStats();
        renderBroadcastRestaurants();
        renderBroadcastChips();
        renderBroadcastProducts();
      }).catch(function (err) {
        $("bc-products").innerHTML = '<div class="empty"><div class="empty__icon">⚠️</div><div class="empty__title">Menu unavailable</div><div class="empty__sub">' + escHtml(err.message || "") + '</div></div>';
      });
    } else {
      renderBroadcastStats();
      renderBroadcastRestaurants();
      renderBroadcastChips();
      renderBroadcastProducts();
    }
  }

  function wireBroadcastUI() {
    var s = $("bc-search"); if (s && !s.__wired) { s.addEventListener("input", renderBroadcastProducts); s.__wired = true; }
    var so = $("bc-sort"); if (so && !so.__wired) { so.addEventListener("change", function () { state.bc.sort = so.value; renderBroadcastProducts(); }); so.__wired = true; }
  }

  function renderBroadcastStats() {
    var rCount = state.bc.restaurants.length;
    var cCount = Math.max(0, state.bc.categories.length - 1);
    $("bc-stat-dishes").textContent = state.products.length;
    $("bc-stat-rest").textContent = rCount;
    $("bc-stat-cats").textContent = cCount;
    $("broadcast-sub").textContent = state.products.length + " dishes from " + rCount + " restaurant" + (rCount === 1 ? "" : "s");
  }

  function renderBroadcastRestaurants() {
    var strip = $("bc-rest-strip");
    if (!state.bc.restaurants.length) { strip.innerHTML = '<div style="color:var(--text-dim);font-size:0.85rem;">No restaurants yet</div>'; return; }
    strip.innerHTML = state.bc.restaurants.map(function (r) {
      var sample = state.products.find(function (p) { return p.tenantId === r.id && p.imageUrl; });
      var img = r.logo || (sample && sample.imageUrl) || "";
      var dishes = state.products.filter(function (p) { return p.tenantId === r.id; }).length;
      var bgStyle = img
        ? 'background-image: linear-gradient(135deg, rgba(7,11,20,0.25), rgba(7,11,20,0.55)), url("' + escHtml(img) + '");'
        : 'background: linear-gradient(135deg, ' + (r.primaryColor || "#FF5722") + ', #E64A19);';
      return '<div class="bc-rest" data-tenant="' + r.id + '" data-name="' + escHtml(r.name || "") + '" style="' + bgStyle + '">'
           + '  <div class="bc-rest__body">'
           + '    <div class="bc-rest__name">' + escHtml(r.name || "Restaurant") + '</div>'
           + '    <div class="bc-rest__meta"><span>🍽️ ' + dishes + ' dishes</span><span>⚡ Quick accept</span></div>'
           + '  </div>'
           + '</div>';
    }).join("");
    strip.querySelectorAll(".bc-rest").forEach(function (el) {
      el.addEventListener("click", function () {
        var name = el.getAttribute("data-name") || "";
        $("bc-search").value = name;
        renderBroadcastProducts();
        var grid = $("bc-products"); if (grid) grid.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  function renderBroadcastChips() {
    var el = $("bc-cats");
    el.innerHTML = state.bc.categories.map(function (c) {
      var active = c === state.bc.activeCat ? " active" : "";
      var label = c === "all" ? (state.lang === "ar" ? "الكل" : state.lang === "de" ? "Alle" : "All") : c;
      return '<button class="bc-chip' + active + '" data-cat="' + escHtml(c) + '">' + escHtml(label) + '</button>';
    }).join("");
    el.querySelectorAll(".bc-chip").forEach(function (b) {
      b.addEventListener("click", function () {
        state.bc.activeCat = b.getAttribute("data-cat");
        renderBroadcastChips();
        renderBroadcastProducts();
      });
    });
  }

  function renderBroadcastProducts() {
    var q = ($("bc-search").value || "").toLowerCase().trim();
    var filtered = state.products.filter(function (p) {
      if (state.bc.activeCat !== "all" && p.category !== state.bc.activeCat) return false;
      if (!q) return true;
      var h = (p.name + " " + (p.tenantName || "") + " " + (p.category || "") + " " + (p.nameAr || "") + " " + (p.description || "")).toLowerCase();
      return h.indexOf(q) > -1;
    });
    if (state.bc.sort === "price-asc") filtered.sort(function (a, b) { return a.price - b.price; });
    else if (state.bc.sort === "price-desc") filtered.sort(function (a, b) { return b.price - a.price; });
    else if (state.bc.sort === "name") filtered.sort(function (a, b) { return (a.name || "").localeCompare(b.name || ""); });

    $("bc-section-title").textContent = state.bc.activeCat === "all" ? "All Dishes" : state.bc.activeCat;
    $("bc-section-count").textContent = filtered.length + (filtered.length === 1 ? " item" : " items");

    if (filtered.length === 0) {
      $("bc-products").innerHTML = '<div class="empty" style="grid-column:1 / -1;"><div class="empty__icon">🔍</div><div class="empty__title">No dishes match</div><div class="empty__sub">Try a different search</div></div>';
      return;
    }
    $("bc-products").innerHTML = filtered.slice(0, 120).map(function (p) {
      return broadcastProductCard(p);
    }).join("");
    bindBroadcastProductClicks();
  }

  function broadcastProductCard(p) {
    // Sum item across variants under same product+tenant for the qty badge
    var qty = state.cart.filter(function (it) { return it.productId === p.id && it.tenantId === p.tenantId; })
                       .reduce(function (s, it) { return s + (it.quantity || 0); }, 0);
    var hasOptions = (p.modifiers && p.modifiers.length) || (p.variants && p.variants.length);
    var img = p.imageUrl ? '<img src="' + escHtml(p.imageUrl) + '" alt="' + escHtml(p.name) + '" onerror="this.style.display=\'none\'" />' : "";
    return '<div class="card" data-pid="' + p.id + '">'
         + '  <div class="card__cover">' + img
         + '    <div class="card__badges">'
         +        (p.tenantName ? '<span class="badge--tenant">🏪 ' + escHtml(p.tenantName) + '</span>' : '<span></span>')
         +        (p.category ? '<span class="badge--cat">' + escHtml(p.category) + '</span>' : '<span></span>')
         + '    </div>'
         +      (hasOptions ? '<div class="card__customize-hint">⚙️ Customize</div>' : '')
         + '  </div>'
         + '  <div class="card__body">'
         + '    <div class="card__title">' + escHtml(p.name) + '</div>'
         + (p.description ? '<div class="card__sub">' + escHtml(String(p.description).slice(0, 70)) + '</div>' : '')
         + '    <div class="card__foot">'
         + '      <span class="card__price">CHF ' + Number(p.price).toFixed(2) + '</span>'
         + (qty > 0
              ? '<button class="card__add" data-bc-pid="' + p.id + '" style="background:var(--success);">' + qty + ' in cart</button>'
              : '<button class="card__add" data-bc-pid="' + p.id + '">+ Add</button>')
         + '    </div>'
         + '  </div>'
         + '</div>';
  }

  function bindBroadcastProductClicks() {
    $("bc-products").querySelectorAll("[data-bc-pid]").forEach(function (b) {
      b.addEventListener("click", function () {
        var id = Number(b.getAttribute("data-bc-pid"));
        var p = state.products.find(function (x) { return x.id === id; });
        if (!p) return;
        openCustomizeSheet(p);
      });
    });
  }

  // ─── Customize sheet (variant + modifiers + qty + notes) ────────────
  var custState = null;
  function openCustomizeSheet(product) {
    var hasVariants = product.variants && product.variants.length > 0;
    var hasModifiers = product.modifiers && product.modifiers.length > 0;
    custState = {
      product: product,
      qty: 1,
      variant: hasVariants ? null : { name: "", price: Number(product.price) }, // null = none chosen yet
      // For each modifier group, store array of selected option indices
      mods: (product.modifiers || []).map(function () { return []; }),
      notes: "",
    };

    $("cust-name").textContent = product.name;
    $("cust-tenant").textContent = "🏪 " + (product.tenantName || "");
    var cover = $("cust-cover");
    if (product.imageUrl) {
      var existingImg = cover.querySelector("img");
      if (existingImg) existingImg.remove();
      var img = document.createElement("img");
      img.src = product.imageUrl;
      img.alt = product.name;
      img.onerror = function () { img.style.display = "none"; };
      cover.insertBefore(img, cover.firstChild);
    } else {
      var existingImg2 = cover.querySelector("img");
      if (existingImg2) existingImg2.remove();
    }

    renderCustomizeBody();
    updateCustomizeTotal();

    $("cust-overlay").classList.add("open");
    $("cust-sheet").classList.add("open");
    $("cust-sheet").setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeCustomizeSheet() {
    $("cust-overlay").classList.remove("open");
    $("cust-sheet").classList.remove("open");
    $("cust-sheet").setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    custState = null;
  }

  function renderCustomizeBody() {
    if (!custState) return;
    var p = custState.product;
    var html = "";

    // Description
    if (p.description) {
      html += '<div style="font-size:0.82rem;color:var(--text-2);line-height:1.5;">' + escHtml(p.description) + '</div>';
    }

    // Variants (single-select, required if exists)
    if (p.variants && p.variants.length > 0) {
      html += '<div class="cust-section">';
      html += '  <div class="cust-section__head"><h4>Choose size</h4><span class="req">Required</span></div>';
      html += '  <div class="cust-options">';
      p.variants.forEach(function (v, i) {
        var sel = custState.variant && custState.variant.__idx === i ? " selected" : "";
        html += '<div class="cust-opt' + sel + '" data-kind="single" data-vidx="' + i + '">'
             +    '<div class="cust-opt__check"></div>'
             +    '<div class="cust-opt__label">' + escHtml(v.name || ("Option " + (i + 1))) + '</div>'
             +    '<div class="cust-opt__price">CHF ' + Number(v.price || p.price).toFixed(2) + '</div>'
             + '</div>';
      });
      html += '  </div></div>';
    }

    // Modifiers (each group can be single or multi; default = multi for extras/sauces, single for "size"-like)
    (p.modifiers || []).forEach(function (m, gi) {
      var nameLower = String(m.name || "").toLowerCase();
      var isSingle = /size|كبير|صغير|حجم/.test(nameLower); // size-like → single-select
      html += '<div class="cust-section">';
      html += '  <div class="cust-section__head"><h4>' + escHtml(m.name || "Options") + '</h4><span class="opt">' + (isSingle ? "Pick one" : "Pick any") + '</span></div>';
      html += '  <div class="cust-options">';
      (m.options || []).forEach(function (op, oi) {
        var sel = custState.mods[gi].indexOf(oi) > -1 ? " selected" : "";
        html += '<div class="cust-opt' + sel + '" data-kind="' + (isSingle ? "single" : "multi") + '" data-gi="' + gi + '" data-oi="' + oi + '">'
             +    '<div class="cust-opt__check"></div>'
             +    '<div class="cust-opt__label">' + escHtml(op.label || op.name || "Option") + '</div>'
             +    (Number(op.price) > 0 ? '<div class="cust-opt__price">+CHF ' + Number(op.price).toFixed(2) + '</div>' : '<div class="cust-opt__price" style="color:var(--text-dim);">Free</div>')
             + '</div>';
      });
      html += '  </div></div>';
    });

    // Quantity
    html += '<div class="cust-section">';
    html += '  <div class="cust-section__head"><h4>Quantity</h4></div>';
    html += '  <div class="cust-qty"><button id="cust-qty-dec" type="button">−</button><span id="cust-qty-num">' + custState.qty + '</span><button id="cust-qty-inc" type="button">+</button></div>';
    html += '</div>';

    // Notes
    html += '<div class="cust-section cust-notes">';
    html += '  <div class="cust-section__head"><h4>Notes</h4><span class="opt">Optional</span></div>';
    html += '  <textarea id="cust-notes-inp" placeholder="e.g. extra spicy, no onions, leave at door…">' + escHtml(custState.notes) + '</textarea>';
    html += '</div>';

    $("cust-body").innerHTML = html;

    // Wire variants
    $("cust-body").querySelectorAll("[data-vidx]").forEach(function (el) {
      el.addEventListener("click", function () {
        var idx = Number(el.getAttribute("data-vidx"));
        var v = custState.product.variants[idx];
        custState.variant = { __idx: idx, name: v.name, price: Number(v.price || custState.product.price) };
        renderCustomizeBody();
        updateCustomizeTotal();
      });
    });
    // Wire modifier options
    $("cust-body").querySelectorAll("[data-gi][data-oi]").forEach(function (el) {
      el.addEventListener("click", function () {
        var gi = Number(el.getAttribute("data-gi"));
        var oi = Number(el.getAttribute("data-oi"));
        var kind = el.getAttribute("data-kind");
        var arr = custState.mods[gi];
        if (kind === "single") {
          custState.mods[gi] = arr[0] === oi ? [] : [oi];
        } else {
          var pos = arr.indexOf(oi);
          if (pos > -1) arr.splice(pos, 1); else arr.push(oi);
        }
        renderCustomizeBody();
        updateCustomizeTotal();
      });
    });
    // Wire qty
    var inc = $("cust-qty-inc"); if (inc) inc.addEventListener("click", function () { custState.qty = Math.min(99, custState.qty + 1); $("cust-qty-num").textContent = custState.qty; updateCustomizeTotal(); });
    var dec = $("cust-qty-dec"); if (dec) dec.addEventListener("click", function () { custState.qty = Math.max(1, custState.qty - 1); $("cust-qty-num").textContent = custState.qty; updateCustomizeTotal(); });
    // Wire notes
    var n = $("cust-notes-inp"); if (n) n.addEventListener("input", function () { custState.notes = n.value; });
  }

  function customizeUnitPrice() {
    if (!custState) return 0;
    var p = custState.product;
    var base = (custState.variant && Number(custState.variant.price)) || Number(p.price);
    var addons = 0;
    (custState.mods || []).forEach(function (sel, gi) {
      sel.forEach(function (oi) {
        var op = (p.modifiers[gi] && p.modifiers[gi].options && p.modifiers[gi].options[oi]) || null;
        if (op) addons += Number(op.price || 0);
      });
    });
    return base + addons;
  }
  function updateCustomizeTotal() {
    if (!custState) return;
    $("cust-total").textContent = "CHF " + (customizeUnitPrice() * custState.qty).toFixed(2);
  }

  function commitCustomize() {
    if (!custState) return;
    var p = custState.product;
    if (p.variants && p.variants.length > 0 && !custState.variant) {
      toast("Please choose a size", "error"); return;
    }
    var unit = customizeUnitPrice();
    var modSummary = [];
    (custState.mods || []).forEach(function (sel, gi) {
      var grp = p.modifiers[gi];
      if (!grp || sel.length === 0) return;
      var picked = sel.map(function (oi) { return grp.options[oi] && (grp.options[oi].label || grp.options[oi].name); }).filter(Boolean);
      if (picked.length) modSummary.push(grp.name + ": " + picked.join(", "));
    });
    var customLabel = [
      custState.variant && custState.variant.name ? custState.variant.name : "",
      modSummary.join(" · "),
    ].filter(Boolean).join(" · ");
    var displayName = customLabel ? (p.name + " (" + customLabel + ")") : p.name;

    addToCart({
      productId: p.id,
      tenantId: p.tenantId,
      tenantName: p.tenantName,
      name: displayName,
      quantity: custState.qty,
      estimatedPrice: unit,
      imageUrl: p.imageUrl,
      variant: custState.variant ? custState.variant.name : null,
      modifiers: modSummary,
      notes: custState.notes || null,
    });
    closeCustomizeSheet();
    toast("Added to cart", "success");
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
    var c = (state.auth && state.auth.customer) || {};
    var fields = [];
    fields.push({ key: "name", label: "Full name", placeholder: "John Smith", required: true, value: c.name || "" });
    fields.push({ key: "phone", label: "Phone", type: "tel", placeholder: "+41 79 123 45 67", required: true, value: c.phone || "" });
    fields.push({ key: "email", label: "Email (optional)", type: "email", placeholder: "you@example.com", value: c.email || "" });
    fields.push({ key: "address", label: "Delivery address", placeholder: "Street, number, city", required: true, value: c.address || "" });
    fields.push({ key: "notes", label: "Order notes", type: "textarea", placeholder: "e.g. apartment number, gate code, leave at door" });
    fields.push({ key: "payment", label: "Payment method", type: "select", options: [
      { value: "cash", label: "💵 Cash on delivery" },
      { value: "card", label: "💳 Card on delivery" },
    ], value: "cash" });

    dialog.form("Checkout", fields, {
      icon: "📦", iconKind: "", okLabel: "Place order →", cancelLabel: "Cancel",
      msg: state.cartMode === "broadcast"
           ? "We'll broadcast your order — the first restaurant to accept prepares it."
           : "Enter your delivery details to complete the order.",
    }).then(function (data) {
      if (!data) return; // cancelled
      var name = (data.name || c.name || "").trim();
      var phone = (data.phone || c.phone || "").trim();
      var email = (data.email || "").trim() || null;
      var address = (data.address || "").trim();
      var notes = (data.notes || "").trim() || null;
      var payment = data.payment || "cash";
      if (!name || !phone || !address) {
        toast("Name, phone, and address are required", "error"); return;
      }
      var total = state.cart.reduce(function (s, it) { return s + it.quantity * Number(it.estimatedPrice || 0); }, 0);

      if (state.cartMode === "broadcast") {
        api("POST", "/api/delivery/broadcast", {
          customerName: name, customerPhone: phone, customerEmail: email, customerAddress: address,
          items: state.cart.map(function (it) {
            return {
              productId: it.productId, name: it.name, quantity: it.quantity,
              estimatedPrice: it.estimatedPrice, tenantName: it.tenantName,
              variant: it.variant || null, modifiers: it.modifiers || [], notes: it.notes || null,
            };
          }),
          notes: notes, estimatedTotal: total, paymentMethod: payment,
        }).then(function (resp) {
          state.cart = []; save(); refreshCart(); closeCart();
          toast("Order broadcast! Waiting for a restaurant…", "success");
          pollBroadcast(resp.token);
        }).catch(function (err) { toast(err.message || "Failed to place order", "error"); });
      } else {
        var tid = Number(state.cartMode.split(":")[1]);
        api("POST", "/api/delivery/orders", {
          tenantId: tid, customerName: name, customerPhone: phone, customerEmail: email, customerAddress: address,
          items: state.cart.map(function (it) {
            return {
              productId: it.productId, name: it.name, quantity: it.quantity,
              unitPrice: it.estimatedPrice, total: it.quantity * it.estimatedPrice,
              variant: it.variant || null, modifiers: it.modifiers || [], notes: it.notes || null,
            };
          }),
          notes: notes, subtotal: total, totalAmount: total, paymentMethod: payment, orderType: "delivery",
        }).then(function (resp) {
          state.cart = []; save(); refreshCart(); closeCart();
          toast("Order placed!", "success");
          if (resp && resp.trackingToken) navigate("track", [resp.trackingToken]);
          else navigate("orders");
        }).catch(function (err) { toast(err.message || "Failed to place order", "error"); });
      }
    });
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

  // ─── Customize sheet ──────────────────────────────────────────────
  var custClose = $("cust-close"); if (custClose) custClose.addEventListener("click", closeCustomizeSheet);
  var custOverlay = $("cust-overlay"); if (custOverlay) custOverlay.addEventListener("click", closeCustomizeSheet);
  var custAdd = $("cust-add"); if (custAdd) custAdd.addEventListener("click", commitCustomize);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && custState) closeCustomizeSheet(); });

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
