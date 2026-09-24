/**
 * api.js — typed wrappers over the storefront's server endpoints.
 * Every call goes through window.http (core.js): timeout, one retry for GETs,
 * never a silent retry for writes.
 */
(function () {
  "use strict";

  function q(v) { return encodeURIComponent(v == null ? "" : v); }
  function post(path, body, opts) { return http(path, Object.assign({ method: "POST", body: body || {} }, opts || {})); }

  var api = {
    auth: {
      // payload: { credential } (ID token) or { accessToken } (OAuth popup)
      googleLogin: function (payload, tenantId) {
        return post("/api/delivery/auth/google", Object.assign({}, payload, { tenantId: tenantId }), { timeout: 20000 });
      },
      requestOtp: function (phone, tenantId) {
        // The server waits for WhatsApp to accept the message; allow for it.
        return post("/api/delivery/auth/request-otp", { phone: phone, tenantId: tenantId }, { timeout: 45000 });
      },
      verifyOtp: function (phone, tenantId, otp) {
        return post("/api/delivery/auth/verify-otp", { phone: phone, tenantId: tenantId, otp: otp }, { timeout: 20000 });
      },
      logout: function () { return post("/api/delivery/auth/logout", {}, { timeout: 8000 }); },
      getMe: function () { return http("/api/delivery/auth/me"); },
      updateMe: function (data) { return http("/api/delivery/auth/me", { method: "PUT", body: data }); },
    },

    store: {
      getConfig: function (slug) { return http("/api/delivery/store/" + q(slug), { auth: false }); },
      getMenu: function (slug) { return http("/api/delivery/store/" + q(slug) + "/menu", { auth: false }); },
      getPromos: function (slug) { return http("/api/delivery/store/" + q(slug) + "/promos", { auth: false }); },
    },

    zones: {
      getZones: function (tenantId) { return http("/api/delivery/zones?tenantId=" + q(tenantId), { auth: false }); },
    },

    promos: {
      /** Resolves to the server result; `valid:false` comes back as HTTP 200. */
      validate: function (tenantId, code, orderTotal, orderType, customerId) {
        return post("/api/delivery/promo/validate", {
          tenantId: tenantId, code: code, orderTotal: orderTotal, orderType: orderType, customerId: customerId,
        }, { timeout: 15000 });
      },
    },

    addresses: {
      list: function () { return http("/api/delivery/addresses"); },
      create: function (data) { return post("/api/delivery/addresses", data); },
      update: function (id, data) { return http("/api/delivery/addresses/" + q(id), { method: "PUT", body: data }); },
      delete: function (id) { return http("/api/delivery/addresses/" + q(id), { method: "DELETE" }); },
      setDefault: function (id) { return http("/api/delivery/addresses/" + q(id) + "/default", { method: "PUT", body: {} }); },
    },

    orders: {
      create: function (data) { return post("/api/delivery/orders", data, { timeout: 45000 }); },
      track: function (token) { return http("/api/delivery/orders/track/" + q(token), { auth: false }); },
      history: function (tenantId) { return http("/api/delivery/orders/history?tenantId=" + q(tenantId)); },
      rate: function (orderId, data) { return post("/api/delivery/orders/" + q(orderId) + "/rate", data); },
    },

    payments: {
      shamCashReference: function (orderId, trackingToken, reference) {
        return post("/api/payments/order/" + q(orderId) + "/shamcash/reference", { trackingToken: trackingToken, reference: reference }, { auth: false });
      },
    },

    loyalty: {
      get: function (customerId) { return http("/api/delivery/loyalty/" + q(customerId)); },
    },

    wallet: {
      get: function (customerId) { return http("/api/delivery/wallet/" + q(customerId)); },
    },

    favorites: {
      // Rows: { id, productId, productName, productPrice, productImage, ... }
      list: function () { return http("/api/delivery/favorites"); },
      add: function (productId, tenantId) { return post("/api/delivery/favorites", { productId: productId, tenantId: tenantId }); },
      // NB: the server deletes by the favourite row id, not the product id.
      remove: function (favoriteId) { return http("/api/delivery/favorites/" + q(favoriteId), { method: "DELETE" }); },
    },

    help: {
      getFaq: function (tenantId) { return http("/api/delivery/help/faq?tenantId=" + q(tenantId), { auth: false }); },
      getTickets: function () { return http("/api/delivery/help/tickets"); },
      submitTicket: function (data) { return post("/api/delivery/help/ticket", data); },
    },

    reviews: {
      getForStore: function (slug, page, limit) {
        return http("/api/delivery/store/" + q(slug) + "/reviews?page=" + (page || 1) + "&limit=" + (limit || 10), { auth: false });
      },
    },
  };

  window.api = api;
})();
