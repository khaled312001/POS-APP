/**
 * core.js — shared foundation for the per-store storefront (/order/:slug).
 *
 * Everything the pages need and must agree on lives here, loaded before any
 * other storefront script:
 *   - language (Arabic/English) and RTL, with a per-store saved choice
 *   - money formatting per currency (SYP has no decimals: "12,000 ل.س")
 *   - phone normalisation (Syrian local formats → 9639xxxxxxxx)
 *   - fetch with timeout + retry, so a slow link never leaves a spinner forever
 *   - the store config / menu cache every page reads
 *   - toast, bottom sheet, lazy script loading, HTML escaping
 *
 * Plain ES2017 on purpose: no bundler sits in front of this app.
 */
(function () {
  "use strict";

  var cfg = (window.DELIVERY_CONFIG = window.DELIVERY_CONFIG || {});
  var slug = cfg.slug || "";

  // ── Storage that never throws (private mode, blocked storage) ──────────────
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) {} },
    json: function (k, fallback) {
      try { var v = JSON.parse(localStorage.getItem(k) || "null"); return v == null ? fallback : v; } catch (e) { return fallback; }
    },
  };
  window.safeStorage = store;

  // ── HTML escaping — every store/customer supplied string goes through it ──
  function esc(s) {
    if (s == null) return "";
    return String(s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  window.esc = esc;

  // ── Currency ───────────────────────────────────────────────────────────────
  // Currencies that are never shown with minor units in practice.
  var ZERO_DECIMAL = { SYP: 1, IQD: 1, LBP: 1, IRR: 1, JPY: 1, KRW: 1, VND: 1, CLP: 1, IDR: 1, UGX: 1, XAF: 1, XOF: 1 };
  // Currencies Stripe cannot take (sanctioned or unsupported markets). A store
  // pricing in one of these must never be offered card payment or load Stripe.
  var STRIPE_UNSUPPORTED = { SYP: 1, IRR: 1, KPW: 1, CUP: 1, SDG: 1 };

  function currency() { return String(cfg.currency || "CHF").toUpperCase(); }

  function currencyDecimals(c) { return ZERO_DECIMAL[String(c || currency()).toUpperCase()] ? 0 : 2; }

  function roundMoney(n, c) {
    var d = currencyDecimals(c);
    var f = Math.pow(10, d);
    return Math.round((Number(n) || 0) * f) / f;
  }

  function formatCurrency(amount, cur) {
    var c = String(cur || currency()).toUpperCase();
    var n = Number(amount);
    if (!isFinite(n)) n = 0;
    var d = currencyDecimals(c);
    var neg = n < 0;
    n = Math.abs(n);
    var num;
    try {
      num = n.toLocaleString(c === "CHF" ? "de-CH" : "en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
    } catch (e) {
      num = n.toFixed(d);
    }
    var out;
    // Arabic UI: "12,000 ل.س". English UI keeps the code so no Arabic run
    // lands inside left-to-right text (bidi would move the symbol around).
    if (c === "SYP") out = lang() === "ar" ? num + " ل.س" : num + " SYP";
    else if (c === "EGP") out = num + (lang() === "ar" ? " ج.م" : " EGP");
    else if (c === "USD") out = "$" + num;
    else if (c === "EUR") out = "€" + num;
    else out = c + " " + num;
    return (neg ? "−" : "") + out;
  }
  window.formatCurrency = formatCurrency;
  window.money = formatCurrency;

  // ── Language / RTL ─────────────────────────────────────────────────────────
  var LANG_KEY = "kassenta_lang_" + slug;
  var _lang = null;

  // The store's configured language, captured before applyLang() overwrites cfg.language.
  var configLang = String(cfg.language || "").slice(0, 2).toLowerCase();

  function resolveLang() {
    var saved = store.get(LANG_KEY);
    if (saved === "ar" || saved === "en") return saved;
    // Syrian-pound stores serve Arabic-speaking customers first (the server's
    // language default is "en" even when a store never chose one).
    if (currency() === "SYP") return "ar";
    return configLang === "ar" ? "ar" : "en";
  }

  function lang() { return _lang || (_lang = resolveLang()); }

  function applyLang() {
    _lang = resolveLang();
    var html = document.documentElement;
    html.lang = _lang;
    html.dir = _lang === "ar" ? "rtl" : "ltr";
    if (document.body) document.body.dir = html.dir;
    cfg.language = _lang;
  }

  function setLang(l) {
    store.set(LANG_KEY, l === "ar" ? "ar" : "en");
    location.reload();
  }

  /** Pick the string for the active language. L("Cart", "السلة") */
  function L(en, ar) { return lang() === "ar" ? (ar != null ? ar : en) : en; }

  function isRtl() { return lang() === "ar"; }

  window.L = L;
  window.isRtl = isRtl;

  // ── Numbers typed on Arabic keyboards ──────────────────────────────────────
  function latinDigits(s) {
    return String(s == null ? "" : s)
      .replace(/[٠-٩]/g, function (d) { return String(d.charCodeAt(0) - 0x0660); })
      .replace(/[۰-۹]/g, function (d) { return String(d.charCodeAt(0) - 0x06F0); });
  }

  // ── Phone numbers ──────────────────────────────────────────────────────────
  function storeCountry() {
    var c = currency();
    if (c === "SYP") return "SY";
    if (c === "EGP") return "EG";
    if (c === "CHF") return "CH";
    return "";
  }

  /**
   * Normalise what a customer typed into international digits.
   * Returns { value, digits, valid, display }.
   *  - Syrian stores: 09xxxxxxxx / 9xxxxxxxx / 00963… / +963… → +9639xxxxxxxx
   *  - Egyptian 01x mobiles → 201x (nice-to-have, any store)
   *  - Other stores keep the customer's own format (the POS already stores
   *    those numbers that way; changing it would break phone matching).
   */
  function normalizePhone(raw) {
    var s = latinDigits(raw).trim();
    var hasPlus = /^\+/.test(s);
    var d = s.replace(/\D/g, "");
    if (!d) return { value: "", valid: false, display: "" };
    var country = storeCountry();

    if (hasPlus) {
      // already international
    } else if (d.indexOf("00") === 0) {
      d = d.slice(2);
    } else if (country === "SY" && /^09\d{8}$/.test(d)) {
      d = "963" + d.slice(1);
    } else if (country === "SY" && /^9\d{8}$/.test(d)) {
      d = "963" + d;
    } else if (/^01[0125]\d{8}$/.test(d)) {
      d = "20" + d.slice(1);
    } else if (country === "EG" && /^1[0125]\d{8}$/.test(d)) {
      d = "20" + d;
    } else if (country !== "SY" && country !== "EG") {
      // Keep the local format these stores already use (e.g. 079 123 45 67).
      var local = s.replace(/[^\d+]/g, "");
      return { value: local, valid: d.length >= 8 && d.length <= 15, display: s };
    }

    if (/^96309\d{8}$/.test(d)) d = "963" + d.slice(4); // +963 0933… typed with the trunk 0
    var valid;
    if (d.indexOf("963") === 0) valid = /^9639\d{8}$/.test(d) || /^963\d{8,9}$/.test(d);
    else if (d.indexOf("20") === 0) valid = /^201[0125]\d{8}$/.test(d) || /^20\d{8,10}$/.test(d);
    else valid = d.length >= 8 && d.length <= 15;
    // "+963…" is the spelling the server stores (server/phone.ts canonicalPhone).
    return { value: "+" + d, digits: d, valid: valid, display: "+" + d };
  }

  function phoneHint() {
    var c = storeCountry();
    if (c === "SY") return L("e.g. 0933 123 456", "مثال: 0933 123 456");
    if (c === "EG") return L("e.g. 010 1234 5678", "مثال: 010 1234 5678");
    if (c === "CH") return L("e.g. 079 123 45 67", "مثال: 079 123 45 67");
    return L("Include the country code", "مع رمز الدولة");
  }

  function phoneFieldPrefix() {
    var c = storeCountry();
    return c === "SY" ? "+963" : c === "EG" ? "+20" : c === "CH" ? "+41" : "";
  }

  // ── HTTP with timeout + retry ──────────────────────────────────────────────
  function netError(kind) {
    var e = new Error(kind === "timeout"
      ? L("The connection is slow and the request timed out. Please try again.", "الاتصال بطيء وانتهت مهلة الطلب. حاول مرة أخرى.")
      : L("Connection problem. Check your internet and try again.", "تعذّر الاتصال. تحقّق من الإنترنت وحاول مرة أخرى."));
    e.network = true;
    e.timeout = kind === "timeout";
    return e;
  }

  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  /**
   * fetch() that always settles. GETs retry once on a network failure; writes
   * never retry automatically (a retried order POST could double-order).
   */
  function http(path, opts) {
    opts = opts || {};
    var method = (opts.method || "GET").toUpperCase();
    var timeout = opts.timeout || (method === "GET" ? 15000 : 30000);
    var retries = opts.retries != null ? opts.retries : (method === "GET" ? 1 : 0);
    var headers = { "Content-Type": "application/json" };
    var token = opts.auth === false ? null : (window.auth && auth.getToken && auth.getToken());
    if (token) headers.Authorization = "Bearer " + token;
    if (opts.headers) for (var k in opts.headers) headers[k] = opts.headers[k];

    function attempt(left) {
      var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
      var timedOut = false;
      var timer = setTimeout(function () { timedOut = true; if (ctrl) ctrl.abort(); }, timeout);
      return fetch(path, {
        method: method,
        headers: headers,
        body: opts.body != null ? (typeof opts.body === "string" ? opts.body : JSON.stringify(opts.body)) : undefined,
        signal: ctrl ? ctrl.signal : undefined,
        credentials: "same-origin",
      }).then(function (resp) {
        clearTimeout(timer);
        if (resp.status === 204) return null;
        return resp.text().then(function (txt) {
          var data = null;
          try { data = txt ? JSON.parse(txt) : null; } catch (e) { data = null; }
          if (resp.status === 401 && token && window.auth) auth.clearSession();
          if (!resp.ok) {
            var msg = (data && (data.error || data.message)) || (resp.status >= 500
              ? L("The store is temporarily unavailable. Please try again.", "المتجر غير متاح مؤقتاً. حاول مرة أخرى.")
              : "HTTP " + resp.status);
            var err = new Error(msg);
            err.status = resp.status;
            err.data = data;
            throw err;
          }
          return data;
        });
      }, function () {
        clearTimeout(timer);
        var e = netError(timedOut ? "timeout" : "network");
        if (left > 0) return wait(900).then(function () { return attempt(left - 1); });
        throw e;
      });
    }
    return attempt(retries);
  }
  window.http = http;

  // ── Images ─────────────────────────────────────────────────────────────────
  function fixImageUrl(url) {
    if (!url) return "";
    url = String(url);
    if (/^(https?:|data:image\/(png|jpe?g|webp|gif))/i.test(url)) return url;
    if (/^data:/i.test(url)) return "";
    var base = cfg.basePath || "";
    if (url.indexOf("/api/") === 0) return url;
    if (url.indexOf("/") !== 0) url = "/" + url;
    if (base && /^\/(uploads|assets|objects)\//.test(url)) return base + url;
    return url;
  }
  window.fixImageUrl = fixImageUrl;

  function productImage(p) {
    var u = p && (p.imageUrl || p.image || p.productImage);
    if (!u || String(u).length < 8 || /^data:image\/svg/i.test(u)) return "";
    return fixImageUrl(u);
  }

  // ── Store data (one fetch per session, shared by all pages) ────────────────
  var _config = null, _configP = null, _menu = null, _menuP = null, _zonesP = null, _promosP = null, _payP = null;

  var shop = {
    config: function (force) {
      if (_config && !force) return Promise.resolve(_config);
      if (_configP && !force) return _configP;
      _configP = http("/api/delivery/store/" + encodeURIComponent(slug), { timeout: 12000, retries: 2, auth: false })
        .then(function (c) {
          _config = c || {};
          if (_config.currency) cfg.currency = String(_config.currency).toUpperCase();
          return _config;
        })
        .catch(function (e) { _configP = null; throw e; });
      return _configP;
    },
    cachedConfig: function () { return _config || {}; },

    menu: function (force) {
      if (_menu && !force) return Promise.resolve(_menu);
      if (_menuP && !force) return _menuP;
      _menuP = http("/api/delivery/store/" + encodeURIComponent(slug) + "/menu", { timeout: 20000, retries: 2, auth: false })
        .then(function (m) {
          m = m || {};
          var products = (m.allProducts || m.products || []).filter(function (p) { return p && p.isActive !== false; });
          var cats = (m.categories || []).filter(function (c) { return c && c.isActive !== false; });
          var byId = {};
          products.forEach(function (p) { byId[p.id] = p; });
          _menu = { categories: cats, products: products, byId: byId };
          return _menu;
        })
        .catch(function (e) { _menuP = null; throw e; });
      return _menuP;
    },
    cachedMenu: function () { return _menu; },

    zones: function () {
      if (!_zonesP) {
        _zonesP = http("/api/delivery/zones?tenantId=" + encodeURIComponent(cfg.tenantId), { timeout: 10000, auth: false })
          .then(function (z) { return (Array.isArray(z) ? z : []).filter(function (x) { return x && x.isActive !== false; }); })
          .catch(function () { _zonesP = null; return []; });
      }
      return _zonesP;
    },

    promos: function () {
      if (!_promosP) {
        _promosP = http("/api/delivery/store/" + encodeURIComponent(slug) + "/promos", { timeout: 10000, auth: false })
          .then(function (r) { return Array.isArray(r) ? r : ((r && r.promos) || []); })
          .catch(function () { _promosP = null; return []; });
      }
      return _promosP;
    },

    /**
     * What the store can take online. Never loads Stripe.js — only our own
     * config endpoint — and gives up after 8 s so checkout is never blocked.
     */
    payments: function () {
      if (!_payP) {
        _payP = http("/api/payments/config?tenantId=" + encodeURIComponent(cfg.tenantId), { timeout: 8000, retries: 1, auth: false })
          .then(function (pc) {
            pc = pc || {};
            var cur = currency();
            var stripe = pc.stripe || {};
            var cardOk = !STRIPE_UNSUPPORTED[cur] &&
              pc.cardAvailable !== false &&
              !!(stripe.status === "connected" && stripe.publishableKey) &&
              stripe.enabled !== false &&
              !(pc.enabledMethods && pc.enabledMethods.indexOf && pc.enabledMethods.indexOf("card") < 0);
            var sc = pc.shamcash || {};
            var shamOk = !!(sc.enabled && (sc.qrImage || sc.phone));
            var cashOk = !(pc.cash && pc.cash.enabled === false);
            if (!cardOk && !shamOk) cashOk = true; // never leave a customer with no way to pay
            if (cardOk && window.KassentaPay) window.KassentaPay.config = pc;
            return { raw: pc, card: cardOk, cash: cashOk, shamcash: shamOk ? sc : null, methods: stripe.availableMethods || [] };
          })
          .catch(function () { _payP = null; return { raw: null, card: false, cash: true, shamcash: null, methods: [] }; });
      }
      return _payP;
    },

    categoryName: function (c) { return (lang() === "ar" && c && c.nameAr) ? c.nameAr : (c && c.name) || ""; },
    productName: function (p) { return (lang() === "ar" && p && p.nameAr) ? p.nameAr : (p && (p.name || p.productName)) || ""; },
    productImage: productImage,

    /** Modifier groups as stored on the product: [{name, required, multiple, options:[{label, price}]}] */
    modGroups: function (p) {
      var m = p && p.modifiers;
      if (!m) return [];
      if (typeof m === "string") { try { m = JSON.parse(m); } catch (e) { return []; } }
      if (!Array.isArray(m)) return [];
      return m.filter(function (g) { return g && Array.isArray(g.options) && g.options.length; }).map(function (g) {
        return {
          name: String(g.name || ""),
          required: !!g.required,
          multiple: !!g.multiple,
          max: Number(g.max || g.maxSelect || 0) || 0,
          options: g.options.map(function (o) {
            return { label: String(o.label != null ? o.label : (o.name || "")), price: Number(o.price) || 0 };
          }).filter(function (o) { return o.label; }),
        };
      }).filter(function (g) { return g.options.length; });
    },

    /** Size variants: [{name, price}] — price REPLACES the base price. */
    variants: function (p) {
      var v = p && p.variants;
      if (!v) return [];
      if (typeof v === "string") { try { v = JSON.parse(v); } catch (e) { return []; } }
      if (!Array.isArray(v)) return [];
      return v.filter(function (x) { return x && x.name; }).map(function (x) {
        return { name: String(x.name), price: x.price != null && x.price !== "" ? Number(x.price) : Number(p.price) || 0 };
      });
    },

    hasOptions: function (p) { return shop.modGroups(p).length > 0 || shop.variants(p).length > 0; },

    orderTypes: function () {
      var c = _config || {};
      var types = [];
      if (c.enableDelivery !== false) types.push("delivery");
      if (c.enablePickup !== false) types.push("pickup");
      if (!types.length) types.push("pickup");
      return types;
    },

    storeCountry: storeCountry,
    stripeSupported: function () { return !STRIPE_UNSUPPORTED[currency()]; },
  };
  window.shop = shop;

  // ── Toasts ─────────────────────────────────────────────────────────────────
  function showToast(msg, type, duration) {
    var box = document.getElementById("toast-container");
    if (!box) {
      box = document.createElement("div");
      box.id = "toast-container";
      box.setAttribute("aria-live", "polite");
      document.body.appendChild(box);
    }
    var el = document.createElement("div");
    el.className = "toast" + (type ? " toast--" + type : "");
    el.setAttribute("role", type === "error" ? "alert" : "status");
    el.textContent = msg;
    box.appendChild(el);
    requestAnimationFrame(function () { el.classList.add("toast--in"); });
    setTimeout(function () {
      el.classList.remove("toast--in");
      setTimeout(function () { el.remove(); }, 250);
    }, duration || (type === "error" ? 5000 : 3000));
  }
  window.showToast = showToast;

  // ── Bottom sheet / dialog ──────────────────────────────────────────────────
  var _openSheets = [];
  function sheet(html, opts) {
    opts = opts || {};
    var wrap = document.createElement("div");
    wrap.className = "sheet-layer" + (opts.className ? " " + opts.className : "");
    wrap.innerHTML =
      '<div class="sheet-layer__backdrop" data-close></div>' +
      '<div class="sheet" role="dialog" aria-modal="true"' + (opts.label ? ' aria-label="' + esc(opts.label) + '"' : "") + '>' +
        '<div class="sheet__grip" aria-hidden="true"></div>' +
        (opts.noClose ? "" : '<button class="sheet__close" data-close aria-label="' + esc(L("Close", "إغلاق")) + '">' + icon("x") + "</button>") +
        '<div class="sheet__body">' + html + "</div>" +
      "</div>";
    document.body.appendChild(wrap);
    document.body.classList.add("no-scroll");
    var api = {
      el: wrap,
      body: wrap.querySelector(".sheet__body"),
      close: function () {
        if (api.closed) return;
        api.closed = true;
        wrap.classList.remove("sheet-layer--open");
        _openSheets = _openSheets.filter(function (s) { return s !== api; });
        if (!_openSheets.length) document.body.classList.remove("no-scroll");
        setTimeout(function () { wrap.remove(); }, 260);
        if (opts.onClose) opts.onClose();
      },
    };
    wrap.addEventListener("click", function (e) {
      if (e.target.closest("[data-close]") && !opts.noClose) api.close();
    });
    _openSheets.push(api);
    requestAnimationFrame(function () { wrap.classList.add("sheet-layer--open"); });
    refreshIcons();
    return api;
  }
  function closeAllSheets() { _openSheets.slice().forEach(function (s) { s.close(); }); }
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && _openSheets.length) _openSheets[_openSheets.length - 1].close();
  });
  window.sheet = sheet;
  window.closeAllSheets = closeAllSheets;

  function confirmDialog(message, okLabel, danger) {
    return new Promise(function (resolve) {
      var s = sheet(
        '<div class="dialog">' +
          '<p class="dialog__text">' + esc(message) + "</p>" +
          '<div class="dialog__actions">' +
            '<button class="btn btn-ghost" data-act="no">' + esc(L("Cancel", "إلغاء")) + "</button>" +
            '<button class="btn ' + (danger ? "btn-danger" : "btn-primary") + '" data-act="yes">' + esc(okLabel || L("OK", "موافق")) + "</button>" +
          "</div></div>",
        { className: "sheet-layer--dialog", onClose: function () { resolve(false); } }
      );
      s.el.querySelector('[data-act="no"]').onclick = function () { s.close(); };
      s.el.querySelector('[data-act="yes"]').onclick = function () { resolve(true); s.close(); };
    });
  }
  window.confirmDialog = confirmDialog;

  // ── Icons (local subset, see js/vendor/icons.js) ───────────────────────────
  function icon(name, cls) { return '<i data-lucide="' + name + '" class="' + (cls || "icon-md") + '" aria-hidden="true"></i>'; }
  var _iconTimer = null;
  function refreshIcons() {
    if (_iconTimer) return;
    _iconTimer = requestAnimationFrame(function () {
      _iconTimer = null;
      if (window.lucide && window.lucide.createIcons) { try { window.lucide.createIcons(); } catch (e) {} }
    });
  }
  window.icon = icon;
  window.refreshIcons = refreshIcons;

  // ── Lazy loading of optional third-party code ──────────────────────────────
  var _scripts = {};
  function loadScript(src, timeoutMs) {
    if (_scripts[src]) return _scripts[src];
    _scripts[src] = new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = src;
      s.async = true;
      var t = setTimeout(function () { delete _scripts[src]; reject(new Error("timeout")); }, timeoutMs || 12000);
      s.onload = function () { clearTimeout(t); resolve(); };
      s.onerror = function () { clearTimeout(t); delete _scripts[src]; reject(new Error("load failed")); };
      document.head.appendChild(s);
    });
    return _scripts[src];
  }
  function loadCss(href) {
    if (document.querySelector('link[href="' + href + '"]')) return;
    var l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = href;
    document.head.appendChild(l);
  }
  /**
   * Leaflet is self-hosted and only loaded when a map is actually opened.
   * Leaflet claims window.L, which is our translation helper, so it is handed
   * back with noConflict() and kept as window.Leaflet.
   */
  function loadLeaflet() {
    if (window.Leaflet && window.Leaflet.map) return Promise.resolve(window.Leaflet);
    var base = "/api/delivery-app"; // same prefix the page's own assets use
    loadCss(base + "/css/vendor/leaflet.css");
    return loadScript(base + "/js/vendor/leaflet.js", 15000).then(function () {
      var lf = window.L;
      if (!lf || !lf.map) throw new Error("leaflet");
      if (lf.noConflict) lf = lf.noConflict();
      if (window.L !== L) window.L = L;
      window.Leaflet = lf;
      return lf;
    });
  }
  window.loadScript = loadScript;
  window.loadLeaflet = loadLeaflet;

  // ── Misc helpers ───────────────────────────────────────────────────────────
  function debounce(fn, ms) {
    var t;
    return function () { var a = arguments, self = this; clearTimeout(t); t = setTimeout(function () { fn.apply(self, a); }, ms); };
  }

  function fmtDate(d, withTime) {
    try {
      var dt = new Date(d);
      if (isNaN(dt)) return "";
      var o = { day: "numeric", month: "short", year: "numeric" };
      if (withTime) { o.hour = "2-digit"; o.minute = "2-digit"; }
      return dt.toLocaleString(lang() === "ar" ? "ar-SY-u-nu-latn" : "en-GB", o);
    } catch (e) { return ""; }
  }

  function statusLabel(s, orderType) {
    var pickup = orderType === "pickup" || orderType === "dine_in";
    var map = {
      pending: L("Waiting for confirmation", "بانتظار التأكيد"),
      accepted: L("Confirmed", "تم التأكيد"),
      confirmed: L("Confirmed", "تم التأكيد"),
      preparing: L("Being prepared", "قيد التحضير"),
      ready: pickup ? L("Ready for pickup", "جاهز للاستلام") : L("Ready", "جاهز"),
      on_way: L("On the way", "في الطريق"),
      out_for_delivery: L("On the way", "في الطريق"),
      delivered: pickup ? L("Collected", "تم الاستلام") : L("Delivered", "تم التوصيل"),
      completed: L("Completed", "مكتمل"),
      cancelled: L("Cancelled", "ملغي"),
      rejected: L("Declined", "مرفوض"),
    };
    return map[s] || s || "";
  }

  function trackUrl(token) {
    var base = cfg.basePath || "";
    return base + "/track/" + encodeURIComponent(token) + "?lang=" + lang();
  }

  window.kx = {
    cfg: cfg,
    lang: lang,
    applyLang: applyLang,
    setLang: setLang,
    currency: currency,
    currencyDecimals: currencyDecimals,
    roundMoney: roundMoney,
    normalizePhone: normalizePhone,
    phoneHint: phoneHint,
    phoneFieldPrefix: phoneFieldPrefix,
    latinDigits: latinDigits,
    debounce: debounce,
    fmtDate: fmtDate,
    statusLabel: statusLabel,
    trackUrl: trackUrl,
    wait: wait,
    storage: store,
  };

  applyLang();
})();
