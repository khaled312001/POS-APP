/**
 * auth.js — customer session (phone OTP over WhatsApp, or Google).
 * The token lives in localStorage; storage failures never throw.
 */
(function () {
  "use strict";

  var SESSION_KEY = "barmagly_delivery_token";
  var CUSTOMER_KEY = "barmagly_delivery_customer";
  var RETURN_KEY = "kassenta_after_login";
  var s = window.safeStorage;

  var auth = {
    getToken: function () { return s.get(SESSION_KEY); },
    setToken: function (t) { if (t) s.set(SESSION_KEY, t); },
    isLoggedIn: function () { return !!s.get(SESSION_KEY); },

    clearSession: function () {
      s.del(SESSION_KEY);
      s.del(CUSTOMER_KEY);
      auth._emit();
    },

    getCustomer: function () {
      if (!auth.isLoggedIn()) return null;
      return s.json(CUSTOMER_KEY, null);
    },

    cacheCustomer: function (c) {
      if (!c) return;
      // /auth/me answers { customer }, the login calls answer the object itself.
      if (c.customer && typeof c.customer === "object") c = c.customer;
      s.set(CUSTOMER_KEY, JSON.stringify(c));
      auth._emit();
    },

    setSession: function (token, customer) {
      auth.setToken(token);
      if (customer) auth.cacheCustomer(customer);
      else auth._emit();
    },

    /** Refresh the cached profile; keeps the cache when offline. */
    loadMe: function () {
      if (!auth.isLoggedIn()) return Promise.resolve(null);
      return api.auth.getMe().then(function (r) {
        auth.cacheCustomer(r);
        return auth.getCustomer();
      }).catch(function () { return auth.getCustomer(); });
    },

    logout: function () {
      var p = api.auth.logout().catch(function () {});
      auth.clearSession();
      return p;
    },

    /** Name that is safe to greet with (the server defaults it to the phone). */
    displayName: function (c) {
      c = c || auth.getCustomer();
      if (!c) return "";
      var n = String(c.name || "").trim();
      if (!n || /^[+\d\s()-]{6,}$/.test(n) || n === c.email) return "";
      return n;
    },

    /** Send the customer to login and bring them back here afterwards. */
    requireLogin: function (returnRoute, params) {
      s.set(RETURN_KEY, JSON.stringify({ name: returnRoute || "home", params: params || {} }));
      router.navigate("login");
    },
    takeReturn: function () {
      var r = s.json(RETURN_KEY, null);
      s.del(RETURN_KEY);
      return r;
    },

    _listeners: [],
    onChange: function (fn) { auth._listeners.push(fn); },
    _emit: function () { auth._listeners.forEach(function (fn) { try { fn(auth.getCustomer()); } catch (e) {} }); },
  };

  window.auth = auth;
})();
