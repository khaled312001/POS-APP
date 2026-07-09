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
    es: null,
  };

  function save() {
    localStorage.setItem("bc_cart", JSON.stringify(state.cart));
    localStorage.setItem("bc_cart_mode", state.cartMode);
    if (state.auth) localStorage.setItem("bc_auth", JSON.stringify(state.auth));
  }
  function escHtml(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[c]; }); }
  function $(id) { return document.getElementById(id); }
  function $$(sel) { return document.querySelectorAll(sel); }

  // ─── SVG Icon library ─────────────────────────────────────────────
  // All visual glyphs in the customer SPA come from here so we can swap
  // the entire iconography in one place. Each entry is the inner markup
  // of an SVG (paths, circles, etc.); icon() wraps them with the standard
  // viewBox + .ic class.
  var ICONS = {
    "lightning":  '<path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z"/>',
    "cart":       '<circle cx="9" cy="21" r="1.5"/><circle cx="18" cy="21" r="1.5"/><path d="M3 3h2l3 12h11l3-8H6"/>',
    "cart-plus":  '<circle cx="9" cy="21" r="1.5"/><circle cx="18" cy="21" r="1.5"/><path d="M3 3h2l3 12h11l3-8H6"/><path d="M14 7h6m-3-3v6"/>',
    "store":      '<path d="M3 9l1.5-5h15L21 9M3 9v11a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V9M3 9h18M9 21v-6h6v6"/>',
    "menu":       '<rect x="3" y="6" width="18" height="14" rx="2"/><path d="M3 10h18M8 6V4M16 6V4"/>',
    "search":     '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
    "filter":     '<path d="M3 5h18M6 12h12M10 19h4"/>',
    "sort":       '<path d="M3 6h13M3 12h9M3 18h5M17 8V20m0 0l4-4m-4 4l-4-4"/>',
    "plus":       '<path d="M12 5v14M5 12h14"/>',
    "minus":      '<path d="M5 12h14"/>',
    "check":      '<path d="M5 12l5 5L20 7"/>',
    "x":          '<path d="M18 6L6 18M6 6l12 12"/>',
    "chevron-left":  '<path d="M15 18l-6-6 6-6"/>',
    "chevron-right": '<path d="M9 18l6-6-6-6"/>',
    "chevron-down":  '<path d="M6 9l6 6 6-6"/>',
    "back":       '<path d="M19 12H5M12 19l-7-7 7-7"/>',
    "user":       '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/>',
    "users":      '<circle cx="9" cy="8" r="4"/><path d="M2 21c0-3.9 3.1-7 7-7s7 3.1 7 7"/><path d="M16 11a4 4 0 0 0 0-8"/><path d="M22 21c0-3.5-2.4-6.4-5.6-7"/>',
    "star":       '<path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z"/>',
    "star-filled":'<path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z" fill="currentColor"/>',
    "heart":      '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/>',
    "phone":      '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.7.6 2.5a2 2 0 0 1-.5 2.1L8 9.6a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.8.3 1.6.5 2.5.6A2 2 0 0 1 22 17z"/>',
    "mail":       '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 6l-10 7L2 6"/>',
    "lock":       '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    "map-pin":    '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
    "navigation": '<polygon points="3 11 22 2 13 21 11 13 3 11"/>',
    "clock":      '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    "bell":       '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
    "chat":       '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    "trash":      '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>',
    "edit":       '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 1 1 3 3L12 15l-4 1 1-4z"/>',
    "settings":   '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    "logout":     '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
    "list":       '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    "package":    '<path d="M16 16l4-7-9-5-9 5 9 5 5-2.7M11 22V13M2 9v8l9 5 9-5V9"/>',
    "delivery":   '<rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 3v5h-7"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>',
    "info":       '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
    "warning":    '<path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
    "credit-card":'<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
    "cash":       '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 12h.01M18 12h.01"/>',
    "google":     '<path d="M22.6 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5 5 0 0 1-2.2 3.32v2.76h3.56a10.8 10.8 0 0 0 3.3-8.1z" fill="#4285F4" stroke="none"/><path d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.7a6.6 6.6 0 0 1-9.9-3.5H2.2v2.8A11 11 0 0 0 12 23z" fill="#34A853" stroke="none"/><path d="M5.8 14.1a6.6 6.6 0 0 1 0-4.2V7.1H2.2a11 11 0 0 0 0 9.9l3.6-2.9z" fill="#FBBC05" stroke="none"/><path d="M12 5.4c1.6 0 3 .5 4.2 1.6l3.1-3.1A11 11 0 0 0 2.2 7.1l3.6 2.8A6.6 6.6 0 0 1 12 5.4z" fill="#EA4335" stroke="none"/>',
    "sparkle":    '<path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>',
    "tune":       '<path d="M4 6h7M14 6h6M4 12h3M10 12h10M4 18h11M18 18h2"/><circle cx="13" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
    "shopping":   '<path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18M16 10a4 4 0 1 1-8 0"/>',
    "fire":       '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.4-1.1-2.5-2.5-3-2-.7-4 .7-4 2.7 0 1.5 1 2.8 2.5 3 .9.1 1.7-.4 2-1 .2-.5-.3-1.2-.5-1.2"/><path d="M12 2c2 4 4 6 4 9a4 4 0 0 1-8 0c0-1 .5-1.5 1-2"/>',
    "spinner":    '<circle cx="12" cy="12" r="9" stroke-dasharray="40 20"><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/></circle>',
  };
  function icon(name, opts) {
    var inner = ICONS[name];
    if (!inner) return "";
    var cls = "ic" + (opts && opts.class ? " " + opts.class : "") + (opts && opts.size ? " ic--" + opts.size : "");
    return '<svg class="' + cls + '" viewBox="0 0 24 24" aria-hidden="true">' + inner + '</svg>';
  }
  // Expose for inline HTML callers (e.g. broadcast page)
  window.bcIcon = icon;

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
          var raw = (el && el.value) || "";
          var v = (typeof raw === "string") ? raw.trim() : raw;
          if (f.required && !v) { ok = false; if (el) { el.focus(); el.style.borderColor = "var(--danger)"; } }
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
        iconEl.innerHTML = opts.icon || '<i class="fa-solid fa-wand-magic-sparkles"></i>';
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
            } else if (f.type === "select") {
              el = document.createElement("select"); el.className = "inp";
              (f.options || []).forEach(function (o) {
                var op = document.createElement("option");
                op.value = o.value; op.textContent = o.label || o.value;
                el.appendChild(op);
              });
            } else {
              el = document.createElement("input"); el.className = "inp"; el.type = f.type || "text";
            }
            el.setAttribute("data-fkey", f.key);
            if (el.tagName !== "SELECT") el.placeholder = f.placeholder || "";
            el.value = (f.value !== undefined ? f.value : (f.defaultValue || ""));
            fieldsEl.appendChild(el);
          });
          setTimeout(function () { var first = fieldsEl.querySelector("input,textarea,select"); if (first) first.focus(); }, 30);
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
      alert:   function (title, msg, opts) { return open(Object.assign({ kind: "alert", icon: '<i class="fa-solid fa-circle-info"></i>', title: title, msg: msg }, opts || {})); },
      confirm: function (title, msg, opts) { return open(Object.assign({ kind: "confirm", icon: '<i class="fa-solid fa-circle-question"></i>', title: title, msg: msg }, opts || {})); },
      prompt:  function (title, opts) { return open(Object.assign({ kind: "prompt", icon: '<i class="fa-solid fa-pen"></i>', title: title }, opts || {})); },
      form:    function (title, fields, opts) { return open(Object.assign({ kind: "form", icon: '<i class="fa-solid fa-note-sticky"></i>', title: title, fields: fields }, opts || {})); },
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
      icon: '<i class="fa-solid fa-hand"></i>',
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
      icon: '<i class="fa-solid fa-hand"></i>', iconKind: "warn", okLabel: "Log out", cancelLabel: "Stay",
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
    var firstName = (c.name || "there").split(" ")[0];
    $("home-greet-name").textContent = firstName;
    var hour = new Date().getHours();
    var greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
    $("home-greet-sub").textContent = greet + " · what to eat?";

    // Always pull the broadcast aggregate menu (richest data: restaurants,
    // products, addons, categories) — same source the broadcast page uses,
    // so we get a real, populated home page even before /api/delivery/restaurants.
    if (state.products.length === 0) {
      api("GET", "/api/delivery/broadcast/menu").then(function (data) {
        state.products = data.products || [];
        if (!state.bc) state.bc = { activeCat: "all", sort: "popular", restaurants: [], categories: [], addons: [] };
        state.bc.restaurants = data.restaurants || [];
        state.bc.addons = data.addons || [];
        state.bc.categories = ["all"].concat((data.categories || []).filter(Boolean));
        // Mirror to legacy state.restaurants so other pages still work
        state.restaurants = (data.restaurants || []).map(function (r) {
          return Object.assign({}, r, { name: r.name, slug: r.slug, logo: r.logo });
        });
        renderHomeCuisines();
        renderHomeRestaurants();
        renderHomePopular();
      }).catch(function () {
        $("home-restaurants").innerHTML = homeEmpty("Restaurants unavailable", "Please try again later", "warning");
      });
    } else {
      renderHomeCuisines();
      renderHomeRestaurants();
      renderHomePopular();
    }

    refreshOrders();
  }

  // Map common cuisine words to icons. Anything unmatched falls back to "menu".
  var CUISINE_ICONS = {
    "Pizza": "fire", "pizza": "fire",
    "Burgers": "fire", "burger": "fire",
    "Pasta": "menu", "pasta": "menu",
    "Salad": "menu", "salads": "menu",
    "Sushi": "menu",
    "Dessert": "heart", "desserts": "heart", "Sweets": "heart",
    "Drinks": "cash", "Beverages": "cash",
    "Sauces": "tune",
  };

  function renderHomeCuisines() {
    var el = $("home-cuisines"); if (!el) return;
    var cats = (state.bc && state.bc.categories || []).filter(function (c) { return c !== "all"; });
    if (cats.length === 0) {
      el.innerHTML = '<div class="empty" style="flex:1;padding:20px;">No cuisines yet</div>';
      return;
    }
    el.innerHTML = cats.slice(0, 12).map(function (cat) {
      var count = state.products.filter(function (p) { return p.category === cat; }).length;
      var ico = CUISINE_ICONS[cat] || "menu";
      return '<div class="home-cuisine" data-cuisine="' + escHtml(cat) + '">'
           + '  <div class="home-cuisine__icon">' + icon(ico, { size: "lg" }) + '</div>'
           + '  <div class="home-cuisine__name">' + escHtml(cat) + '</div>'
           + '  <div class="home-cuisine__count">' + count + ' dishes</div>'
           + '</div>';
    }).join("");
    el.querySelectorAll("[data-cuisine]").forEach(function (n) {
      n.addEventListener("click", function () {
        var c = n.getAttribute("data-cuisine");
        if (state.bc) state.bc.activeCat = c;
        navigate("broadcast");
      });
    });
  }

  function renderHomeRestaurants() {
    var el = $("home-restaurants"); if (!el) return;
    var rs = (state.bc && state.bc.restaurants) || state.restaurants || [];
    if (rs.length === 0) {
      el.innerHTML = homeEmpty("No restaurants yet", "Check back soon", "store");
      return;
    }
    el.innerHTML = rs.slice(0, 4).map(function (r) { return homeRestaurantCard(r); }).join("");
    el.querySelectorAll("[data-tenant]").forEach(function (n) {
      n.addEventListener("click", function () {
        var slug = n.getAttribute("data-slug");
        if (slug) navigate("menu", [slug]);
        else navigate("broadcast");
      });
    });
  }

  function homeRestaurantCard(r) {
    var sample = state.products.find(function (p) { return p.tenantId === r.id && p.imageUrl; });
    var img = r.coverImage || r.logo || (sample && sample.imageUrl) || "";
    var dishCount = state.products.filter(function (p) { return p.tenantId === r.id; }).length;
    var rating = r.rating ? Number(r.rating).toFixed(1) : "4.6";
    var deliveryFee = "Free delivery";
    var eta = "25–35 min";
    return '<div class="home-rest" data-tenant="' + r.id + '" data-slug="' + escHtml(r.slug || "") + '">'
         + '  <div class="home-rest__cover" style="' + (img ? 'background-image:url(\'' + escHtml(img) + '\');background-size:cover;background-position:center;' : '') + '">'
         + '    <span class="home-rest__featured">' + icon("star-filled") + ' Featured</span>'
         + '    <span class="home-rest__rating">' + icon("star-filled") + ' ' + rating + '</span>'
         + '  </div>'
         + '  <div class="home-rest__body">'
         + '    <h3 class="home-rest__name">' + escHtml(r.name || "Restaurant") + '</h3>'
         + '    <p class="home-rest__cuisine">' + escHtml(r.cuisine || "Mixed cuisine") + '</p>'
         + '    <div class="home-rest__meta">'
         + '      <span>' + icon("menu") + ' ' + dishCount + ' dishes</span>'
         + '      <span class="dot"></span>'
         + '      <span>' + icon("clock") + ' ' + eta + '</span>'
         + '      <span class="dot"></span>'
         + '      <span>' + icon("delivery") + ' ' + deliveryFee + '</span>'
         + '    </div>'
         + '  </div>'
         + '</div>';
  }

  function renderHomePopular() {
    var el = $("home-popular"); if (!el) return;
    // "Popular" = priced, has image, is not addon. Sort newest tenant first
    // for a varied feed across restaurants.
    var pool = state.products.filter(function (p) { return p.imageUrl && p.price > 0; });
    if (pool.length === 0) {
      el.innerHTML = '<div class="empty" style="flex:1;padding:30px;">No popular dishes yet</div>';
      return;
    }
    // Pick up to 12, deduped by name
    var seen = {};
    var picks = [];
    for (var i = 0; i < pool.length && picks.length < 12; i++) {
      var p = pool[i]; if (seen[p.name]) continue; seen[p.name] = 1; picks.push(p);
    }
    el.innerHTML = picks.map(function (p) {
      return '<div class="home-pop" data-pid="' + p.id + '">'
           + '  <div class="home-pop__cover">'
           +      (p.tenantName ? '<span class="home-pop__tenant">' + escHtml(p.tenantName) + '</span>' : '')
           + '    <img src="' + escHtml(p.imageUrl) + '" alt="' + escHtml(p.name) + '" onerror="this.style.display=\'none\'" />'
           + '  </div>'
           + '  <div class="home-pop__body">'
           + '    <div class="home-pop__name">' + escHtml(p.name) + '</div>'
           + '    <div class="home-pop__price">CHF ' + Number(p.price).toFixed(2) + '</div>'
           + '  </div>'
           + '</div>';
    }).join("");
    el.querySelectorAll("[data-pid]").forEach(function (n) {
      n.addEventListener("click", function () {
        var pid = Number(n.getAttribute("data-pid"));
        var prod = state.products.find(function (x) { return x.id === pid; });
        if (prod) {
          navigate("broadcast");
          // Defer the sheet open until the broadcast page renders
          setTimeout(function () { openCustomizeSheet(prod); }, 200);
        }
      });
    });
  }

  function homeEmpty(title, sub, ico) {
    return '<div class="empty">'
         + '<div class="empty__icon">' + icon(ico || "menu", { size: "2xl" }) + '</div>'
         + '<div class="empty__title">' + escHtml(title) + '</div>'
         + (sub ? '<div class="empty__sub">' + escHtml(sub) + '</div>' : '')
         + '</div>';
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
          listEl.innerHTML = '<div class="empty"><div class="empty__icon"><i class="fa-solid fa-magnifying-glass"></i></div><div class="empty__title">No results</div></div>';
          return;
        }
        listEl.innerHTML = filtered.map(function (r) {
          return '<div class="list-item" data-slug="' + escHtml(r.slug) + '">'
               + '  <img class="list-item__img" src="' + escHtml(r.coverImage || r.logo || "/api/delivery-app/icons/icon-192.png") + '" onerror="this.style.display=\'none\'" />'
               + '  <div class="list-item__body">'
               + '    <div class="list-item__title">' + escHtml(r.name) + '</div>'
               + '    <div class="list-item__sub">' + escHtml(r.cuisine || "") + ' · ' + (r.rating || "—") + ' ★ · ' + (r.deliveryTime || "20") + ' min</div>'
               + '  </div>'
               + '</div>';
        }).join("");
        // Inline restaurant-click binding (the helper function was removed
        // when home was redesigned; keep the wiring local to avoid pulling
        // a global helper that no longer exists).
        listEl.querySelectorAll("[data-slug]").forEach(function (n) {
          n.addEventListener("click", function () {
            var slug = n.getAttribute("data-slug");
            if (slug) navigate("menu", [slug]);
          });
        });
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
      var store = out[0];
      var menuResp = out[1];
      // The /menu endpoint returns { categories:[{...,items}], allProducts:[...] }.
      // Normalise to a flat products array and attach each product's category
      // NAME (the render/filter code below keys off p.category, not categoryId).
      var catNameById = {};
      if (menuResp && Array.isArray(menuResp.categories)) {
        menuResp.categories.forEach(function (c) { catNameById[c.id] = c.name; });
      }
      var menu = Array.isArray(menuResp) ? menuResp
               : (menuResp && Array.isArray(menuResp.allProducts)) ? menuResp.allProducts
               : (menuResp && Array.isArray(menuResp.products)) ? menuResp.products
               : [];
      menu = menu.map(function (p) {
        return p.category ? p : Object.assign({}, p, { category: catNameById[p.categoryId] || "" });
      });
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
          $("menu-products").innerHTML = '<div class="empty"><div class="empty__icon"><i class="fa-solid fa-utensils"></i></div><div class="empty__title">No items</div></div>';
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
      $("menu-products").innerHTML = '<div class="empty"><div class="empty__icon"><i class="fa-solid fa-triangle-exclamation"></i></div><div class="empty__title">' + escHtml(err.message) + '</div></div>';
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
        icon: '<i class="fa-solid fa-cart-shopping"></i>', iconKind: "warn", okLabel: "Replace", cancelLabel: "Keep cart",
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
      body.innerHTML = '<div class="empty"><div class="empty__icon"><i class="fa-solid fa-bag-shopping"></i></div><div class="empty__title">Cart is empty</div></div>';
    } else {
      body.innerHTML = state.cart.map(function (it) {
        return '<div class="list-item">'
             + '  <div class="list-item__body">'
             + '    <div class="list-item__title">' + escHtml(it.name) + '</div>'
             + '    <div class="list-item__sub"><i class="fa-solid fa-store"></i> ' + escHtml(it.tenantName || "") + ' · CHF ' + Number(it.estimatedPrice).toFixed(2) + '</div>'
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
  if (!state.bc) state.bc = { activeCat: "all", sort: "popular", restaurants: [], categories: [], addons: [] };

  function renderBroadcast() {
    if (state.products.length === 0 || !state.bc.restaurants.length) {
      api("GET", "/api/delivery/broadcast/menu").then(function (data) {
        state.products = data.products || [];
        state.bc.addons = data.addons || [];
        state.bc.restaurants = data.restaurants || [];
        state.bc.categories = ["all"].concat((data.categories || []).filter(Boolean));
        wireBroadcastUI();
        renderBroadcastStats();
        renderBroadcastRestaurants();
        renderBroadcastChips();
        renderBroadcastProducts();
      }).catch(function (err) {
        $("bc-products").innerHTML = '<div class="empty"><div class="empty__icon"><i class="fa-solid fa-triangle-exclamation"></i></div><div class="empty__title">Menu unavailable</div><div class="empty__sub">' + escHtml(err.message || "") + '</div></div>';
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

    // Custom sort dropdown — toggle pop, pick option, close on outside click.
    // Replaces the native <select> so the opened menu uses our dark palette
    // (the OS-rendered options panel was white-on-white and clashed badly).
    var sb = $("bc-sort-btn"); var sp = $("bc-sort-pop");
    if (sb && sp && !sb.__wired) {
      var SORT_LABELS = { "popular": "Popular", "price-asc": "Price ↑", "price-desc": "Price ↓", "name": "A – Z" };
      function setSort(val) {
        state.bc.sort = val;
        $("bc-sort-label").textContent = SORT_LABELS[val] || "Popular";
        sp.querySelectorAll(".bc-sort-opt").forEach(function (o) {
          o.classList.toggle("selected", o.getAttribute("data-sort") === val);
        });
        renderBroadcastProducts();
      }
      sb.addEventListener("click", function (e) {
        e.stopPropagation();
        var open = sb.classList.toggle("open");
        sp.classList.toggle("open", open);
      });
      sp.querySelectorAll(".bc-sort-opt").forEach(function (o) {
        o.addEventListener("click", function () {
          setSort(o.getAttribute("data-sort"));
          sb.classList.remove("open"); sp.classList.remove("open");
        });
      });
      document.addEventListener("click", function (e) {
        if (!sb.contains(e.target) && !sp.contains(e.target)) {
          sb.classList.remove("open"); sp.classList.remove("open");
        }
      });
      sb.__wired = true;
    }
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
           + '  <span class="bc-rest__featured">' + icon("star-filled") + ' Featured</span>'
           + '  <div class="bc-rest__body">'
           + '    <div class="bc-rest__name">' + escHtml(r.name || "Restaurant") + '</div>'
           + '    <div class="bc-rest__meta"><span>' + icon("menu") + ' ' + dishes + ' dishes</span><span>' + icon("lightning") + ' Quick</span></div>'
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
      $("bc-products").innerHTML = '<div class="empty" style="grid-column:1 / -1;"><div class="empty__icon"><i class="fa-solid fa-magnifying-glass"></i></div><div class="empty__title">No dishes match</div><div class="empty__sub">Try a different search</div></div>';
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
         + (p.tenantName ? '    <div class="card__badges"><span class="badge--tenant">' + icon("store") + ' ' + escHtml(p.tenantName) + '</span></div>' : '')
         +      (hasOptions ? '<div class="card__customize-hint">' + icon("tune") + ' Customize</div>' : '')
         + '  </div>'
         + '  <div class="card__body">'
         + '    <div class="card__title">' + escHtml(p.name) + '</div>'
         + (p.description ? '<div class="card__sub">' + escHtml(String(p.description).slice(0, 70)) + '</div>' : '')
         + '    <div class="card__foot">'
         + '      <span class="card__price">CHF ' + Number(p.price).toFixed(2) + '</span>'
         + (qty > 0
              ? '<button class="card__add" data-bc-pid="' + p.id + '" data-incart="1">' + icon("check") + ' ' + qty + ' added</button>'
              : '<button class="card__add" data-bc-pid="' + p.id + '">' + icon("plus") + ' Add</button>')
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

  // ─── Customize sheet (variant + modifiers + addons + qty + notes) ───
  // Addons (drinks/sauces/extras stored as separate `isAddon` products in
  // the same tenant) are loaded from state.bc.addons and grouped by their
  // category so the picker matches what cashiers see in the POS app.
  var custState = null;
  function tenantAddons(tenantId) {
    return (state.bc.addons || []).filter(function (a) { return a.tenantId === tenantId; });
  }
  function groupAddonsByCategory(list) {
    var groups = {};
    list.forEach(function (a) {
      var k = a.category || "Add-ons";
      if (!groups[k]) groups[k] = [];
      groups[k].push(a);
    });
    return Object.keys(groups).map(function (k) { return { name: k, items: groups[k] }; });
  }
  function openCustomizeSheet(product) {
    var hasVariants = product.variants && product.variants.length > 0;
    var addons = tenantAddons(product.tenantId);
    var addonGroups = groupAddonsByCategory(addons);
    custState = {
      product: product,
      qty: 1,
      variant: hasVariants ? null : { name: "", price: Number(product.price) },
      // For each modifier group, store array of selected option indices
      mods: (product.modifiers || []).map(function () { return []; }),
      // For each addon, store quantity (0 = not selected)
      addonQty: {},
      addonGroups: addonGroups,
      notes: "",
    };

    $("cust-name").textContent = product.name;
    var tEl = $("cust-tenant");
    tEl.innerHTML = icon("store") + " " + escHtml(product.tenantName || "");
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
    // `inert` is the modern replacement for `aria-hidden` on focusable
    // ancestors — removing it makes the sheet interactive again.
    $("cust-sheet").removeAttribute("inert");
    document.body.style.overflow = "hidden";
  }

  function closeCustomizeSheet() {
    // Move focus out of the sheet *before* setting inert so the browser
    // doesn't warn about hiding a focused element.
    var active = document.activeElement;
    if (active && $("cust-sheet").contains(active)) active.blur();
    $("cust-overlay").classList.remove("open");
    $("cust-sheet").classList.remove("open");
    $("cust-sheet").setAttribute("inert", "");
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
      var isSingle = /size|größe|kleine|grosse|kleines|grosses|كبير|صغير|حجم/.test(nameLower); // size-like → single-select
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

    // Addons (separate products marked isAddon=true on this tenant — drinks,
    // sauces, sides, extras). Each addon supports a quantity stepper so the
    // customer can stack multiples (e.g. "2x Coke + 1x Sauce").
    (custState.addonGroups || []).forEach(function (g) {
      if (!g.items.length) return;
      html += '<div class="cust-section">';
      html += '  <div class="cust-section__head"><h4>' + escHtml(g.name) + '</h4><span class="opt">Optional · ' + g.items.length + ' available</span></div>';
      html += '  <div class="cust-addons">';
      g.items.forEach(function (a) {
        var q = custState.addonQty[a.id] || 0;
        var imgHtml = a.imageUrl ? '<img src="' + escHtml(a.imageUrl) + '" alt="" onerror="this.style.display=\'none\'" />' : icon("package", { class: "cust-addon__ph" });
        html += '<div class="cust-addon' + (q > 0 ? " selected" : "") + '" data-aid="' + a.id + '">'
             +    '<div class="cust-addon__img">' + imgHtml + '</div>'
             +    '<div class="cust-addon__body">'
             +      '<div class="cust-addon__name">' + escHtml(a.name) + '</div>'
             +      '<div class="cust-addon__price">' + (Number(a.price) > 0 ? "CHF " + Number(a.price).toFixed(2) : "Free") + '</div>'
             +    '</div>'
             +    (q > 0
                    ? '<div class="cust-addon__qty">'
                       + '<button data-aact="dec" data-aid="' + a.id + '" type="button">' + icon("minus") + '</button>'
                       + '<span>' + q + '</span>'
                       + '<button data-aact="inc" data-aid="' + a.id + '" type="button">' + icon("plus") + '</button>'
                     + '</div>'
                    : '<button class="cust-addon__add" data-aact="inc" data-aid="' + a.id + '" type="button">' + icon("plus") + '</button>')
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
    // Wire addon stepper (each addon has its own quantity)
    $("cust-body").querySelectorAll("[data-aact]").forEach(function (b) {
      b.addEventListener("click", function (e) {
        e.stopPropagation();
        var aid = Number(b.getAttribute("data-aid"));
        var act = b.getAttribute("data-aact");
        var cur = custState.addonQty[aid] || 0;
        if (act === "inc") cur = Math.min(20, cur + 1);
        else if (act === "dec") cur = Math.max(0, cur - 1);
        if (cur === 0) delete custState.addonQty[aid]; else custState.addonQty[aid] = cur;
        renderCustomizeBody(); updateCustomizeTotal();
      });
    });
    // Wire notes
    var n = $("cust-notes-inp"); if (n) n.addEventListener("input", function () { custState.notes = n.value; });
  }

  function customizeUnitPrice() {
    if (!custState) return 0;
    var p = custState.product;
    var base = (custState.variant && Number(custState.variant.price)) || Number(p.price);
    var modAdd = 0;
    (custState.mods || []).forEach(function (sel, gi) {
      sel.forEach(function (oi) {
        var op = (p.modifiers[gi] && p.modifiers[gi].options && p.modifiers[gi].options[oi]) || null;
        if (op) modAdd += Number(op.price || 0);
      });
    });
    return base + modAdd;
  }
  function customizeAddonsTotal() {
    if (!custState) return 0;
    var sum = 0;
    Object.keys(custState.addonQty || {}).forEach(function (aid) {
      var q = custState.addonQty[aid];
      var a = (state.bc.addons || []).find(function (x) { return x.id === Number(aid); });
      if (a && q) sum += q * Number(a.price || 0);
    });
    return sum;
  }
  function updateCustomizeTotal() {
    if (!custState) return;
    var grand = (customizeUnitPrice() * custState.qty) + customizeAddonsTotal();
    $("cust-total").textContent = "CHF " + grand.toFixed(2);
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
    // Each selected addon is a separate cart line so the kitchen sees them
    // as discrete products (matches how POS handles addon products).
    var addedAddons = 0;
    Object.keys(custState.addonQty || {}).forEach(function (aid) {
      var q = custState.addonQty[aid];
      var a = (state.bc.addons || []).find(function (x) { return x.id === Number(aid); });
      if (!a || !q) return;
      addToCart({
        productId: a.id,
        tenantId: a.tenantId,
        tenantName: a.tenantName,
        name: a.name,
        quantity: q,
        estimatedPrice: Number(a.price || 0),
        imageUrl: a.imageUrl,
        variant: null, modifiers: [], notes: null,
        isAddon: true,
      });
      addedAddons += q;
    });
    closeCustomizeSheet();
    var msg = "Added to cart" + (addedAddons ? " (+" + addedAddons + " add-on" + (addedAddons === 1 ? "" : "s") + ")" : "");
    toast(msg, "success");
  }

  // ─── Orders + Tracking ─────────────────────────────────────────────
  function refreshOrders() {
    if (!state.auth) return;
    api("GET", "/api/delivery/orders/history").then(function (orders) {
      state.orders = orders || [];
      // Show recent on home
      var homeEl = $("home-orders");
      if (state.orders.length === 0) {
        homeEl.innerHTML = homeEmpty("No orders yet", "Place your first order", "shopping");
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
      el.innerHTML = '<div class="empty"><div class="empty__icon"><i class="fa-solid fa-bag-shopping"></i></div><div class="empty__title">No orders yet</div></div>';
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
            icon: L.divIcon({ html: '<div style="background:#FF5722;border:3px solid #fff;color:#fff;width:32px;height:32px;border-radius:50%;display:grid;place-items:center;box-shadow:0 4px 14px rgba(255,87,34,.5)"><i class="fa-solid fa-motorcycle"></i></div>', className: "", iconSize: [32, 32], iconAnchor: [16, 16] }),
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
      $("track-content").innerHTML = '<div class="empty"><div class="empty__icon"><i class="fa-solid fa-triangle-exclamation"></i></div><div class="empty__title">' + escHtml(err.message) + '</div></div>';
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
          ? '<div class="empty"><div class="empty__icon"><i class="fa-solid fa-comment"></i></div><div class="empty__title">No messages yet</div><div class="empty__sub">Start a conversation</div></div>'
          : msgs.map(chatMsgHtml).join("")
      ) + '</div>';
      var box = document.querySelector("#chat-box");
      if (box) box.scrollTop = box.scrollHeight;
    }).catch(function (err) {
      $("chat-box").innerHTML = '<div class="empty"><div class="empty__icon"><i class="fa-solid fa-triangle-exclamation"></i></div><div class="empty__title">' + escHtml(err.message) + '</div></div>';
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
      { value: "cash", label: "<i class='fa-solid fa-money-bill-wave'></i> Cash on delivery" },
      { value: "card", label: "<i class='fa-solid fa-credit-card'></i> Card on delivery" },
    ], value: "cash" });

    dialog.form("Checkout", fields, {
      icon: '<i class="fa-solid fa-box"></i>', iconKind: "", okLabel: "Place order →", cancelLabel: "Cancel",
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
          toast((data.claimedByName || "A restaurant") + " accepted your order", "success");
          // Refresh orders so the new chat thread shows up under "My orders".
          refreshOrders();
          // After claim, the broadcast row carries the restaurant order id —
          // open chat directly so the customer can talk to the restaurant.
          // Tracking still works via the tab; chat is the priority surface.
          if (data.orderId) {
            setTimeout(function () { navigate("chat", [data.orderId]); }, 500);
          } else if (data.trackingToken) {
            navigate("track", [data.trackingToken]);
          }
        } else if (data.status === "expired" || data.status === "cancelled") {
          done = true;
          toast("Order " + data.status + ". Please try again.", "error");
        }
      }).catch(function () {});
    }
    tick();
    var iv = setInterval(function () { if (done) clearInterval(iv); else tick(); }, 5000);
  }

  // ─── WebSocket / SSE (live updates) ─────────────────────────────────
  // Hostinger CDN swallows WebSocket upgrades, so we race a 3 s WS attempt
  // against an SSE fallback. Whichever connects first wins.
  function handleLiveEvent(m) {
    if (!m || !m.type) return;
    if (m.type === "chat_new_message") {
      if (state.activeChatRoom === m.orderId && state.currentRoute === "chat") {
        var msgs = document.querySelector("#chat-msgs");
        if (msgs) {
          if (msgs.querySelector(".empty")) msgs.innerHTML = "";
          msgs.insertAdjacentHTML("beforeend", chatMsgHtml({ senderType: m.senderType, senderName: m.senderName, body: m.body, createdAt: m.createdAt }));
          msgs.scrollTop = msgs.scrollHeight;
        }
      } else if (m.senderType !== "customer") {
        toast((m.senderName || "Restaurant") + ": " + String(m.body || "").slice(0, 60), "success");
        beep(900, 0.12);
      }
    } else if (m.type === "broadcast_claimed" && state.cartMode === "broadcast") {
      refreshOrders();
    } else if (m.type === "delivery_status_change" && state.activeOrder && m.orderId === state.activeOrder.id) {
      // Live status updates on the tracking page
      if (state.currentRoute === "track" && state.activeOrder.trackingToken) {
        renderTrack(state.activeOrder.trackingToken);
      }
    }
  }

  function startSse() {
    if (state.es || typeof EventSource === "undefined") return;
    try {
      var es = new EventSource("/api/events");
      state.es = es;
      es.onmessage = function (ev) { try { handleLiveEvent(JSON.parse(ev.data)); } catch (_) {} };
      es.onerror = function () { /* EventSource auto-reconnects */ };
    } catch (e) { /* ignore */ }
  }

  function connectWS() {
    if (state.ws || state.es) return;
    var wsTimeout = null;
    try {
      var proto = location.protocol === "https:" ? "wss:" : "ws:";
      var ws = new WebSocket(proto + "//" + location.host + "/api/ws/caller-id");
      state.ws = ws;
      wsTimeout = setTimeout(function () {
        if (ws.readyState !== WebSocket.OPEN) {
          try { ws.close(); } catch (_) {}
          state.ws = null;
          startSse();
        }
      }, 3000);
      ws.onopen = function () { clearTimeout(wsTimeout); };
      ws.onmessage = function (ev) { try { handleLiveEvent(JSON.parse(ev.data)); } catch (_) {} };
      ws.onerror = function () { try { ws.close(); } catch (_) {} };
      ws.onclose = function () {
        clearTimeout(wsTimeout);
        state.ws = null;
        if (!state.es) startSse();
      };
    } catch (e) {
      startSse();
    }
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

  // ─── Google Sign-In ───────────────────────────────────────────────
  // Three entry points (intro / login / register) all reuse the same flow.
  // GIS gives us a JWT credential; the server verifies it and issues our
  // own session token, so we never see the user's password.
  var GOOGLE_CLIENT_ID = "1052668409317-el9e1cccc8607h6tud82b8hqetm9jpkl.apps.googleusercontent.com";
  function handleGoogleCredential(resp) {
    if (!resp || !resp.credential) { toast("Google sign-in failed", "error"); return; }
    api("POST", "/api/delivery/auth/google", { credential: resp.credential, tenantId: 24 })
      .then(function (data) {
        state.auth = { token: data.token, customer: data.customer, isGuest: false };
        save();
        toast("Welcome, " + (data.customer.name || "friend"), "success");
        navigate("home");
      })
      .catch(function (err) { toast(err.message || "Google sign-in failed", "error"); });
  }
  function startGoogleSignIn() {
    if (!window.google || !window.google.accounts || !window.google.accounts.id) {
      toast("Google sign-in is loading… please try again", "error"); return;
    }
    try {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredential,
        ux_mode: "popup",
        auto_select: false,
        cancel_on_tap_outside: false,
      });
      window.google.accounts.id.prompt(function (notification) {
        // If One-Tap is suppressed (cookies blocked / dismissed before),
        // fall back to the OAuth-style popup so the user still gets in.
        if (notification && (notification.isNotDisplayed && notification.isNotDisplayed()) ||
            (notification && notification.isSkippedMoment && notification.isSkippedMoment())) {
          openGooglePopup();
        }
      });
    } catch (e) {
      console.error("Google init", e);
      openGooglePopup();
    }
  }
  function openGooglePopup() {
    // Fallback: redirect-style OAuth using the OAuth2 token endpoint via
    // popup. Uses Google's `oauth2.initTokenClient` (implicit-style) and
    // then exchanges the access_token via /userinfo, posting that to our
    // server. Implemented as a JWT-only path is simpler — keep One-Tap path
    // as the primary; popup is a graceful degradation for blocked cookies.
    if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {
      toast("Google sign-in unavailable", "error"); return;
    }
    var client = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: "openid email profile",
      callback: function (tokenResp) {
        if (!tokenResp || !tokenResp.access_token) { toast("Sign-in cancelled", "error"); return; }
        // Fetch userinfo, then send to our /auth/google endpoint as a
        // pseudo-credential. Server handles either id_token or { profile }.
        fetch("https://www.googleapis.com/oauth2/v3/userinfo", { headers: { Authorization: "Bearer " + tokenResp.access_token } })
          .then(function (r) { return r.json(); })
          .then(function (profile) {
            // Server accepts {credential} (JWT) OR {profile} (verified by access_token).
            return api("POST", "/api/delivery/auth/google", { profile: profile, accessToken: tokenResp.access_token, tenantId: 24 });
          })
          .then(function (data) {
            state.auth = { token: data.token, customer: data.customer, isGuest: false };
            save();
            toast("Welcome, " + (data.customer.name || "friend"), "success");
            navigate("home");
          })
          .catch(function (err) { toast(err.message || "Sign-in failed", "error"); });
      },
    });
    client.requestAccessToken({ prompt: "consent" });
  }
  ["btn-intro-google", "btn-login-google", "btn-register-google"].forEach(function (id) {
    var b = $(id); if (b) b.addEventListener("click", startGoogleSignIn);
  });

  // ─── /customer/login redirect target ──────────────────────────────
  // When Google redirects to /customer/login (the OAuth-listed URI), the
  // SPA loads from /customer/ via .htaccess rewrite. Push the user to the
  // login route so they see the form.
  if (location.pathname === "/customer/login" || location.pathname === "/customer/login/") {
    if (location.hash !== "#/login") location.hash = "#/login";
  }
  $("btn-logout").onclick = logout;
  $("cart-fab").onclick = openCart;
  $("btn-close-cart").onclick = closeCart;
  $("cart-overlay").onclick = closeCart;
  $("btn-checkout").onclick = startCheckout;
  $("btn-send-chat").onclick = sendChatMessage;
  $("chat-input").addEventListener("keydown", function (e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChatMessage(); } });
  // btn-open-chats was removed when the home page was redesigned; guard the
  // wiring so the rest of init still runs if it's missing in the markup.
  var btnOpenChats = $("btn-open-chats"); if (btnOpenChats) btnOpenChats.onclick = function () { navigate("orders"); };

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
