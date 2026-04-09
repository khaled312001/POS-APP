/**
 * api.js — API client for Barmagly Delivery
 * Wraps fetch with auth headers, error handling, and base URL resolution.
 */

const API_BASE = "";  // same origin — no CORS

// ── Core fetch wrapper ─────────────────────────────────────────────────────

async function apiFetch(path, options = {}) {
  const token = auth.getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const resp = await fetch(API_BASE + path, {
    ...options,
    headers,
  });

  if (resp.status === 401) {
    auth.clearSession();
    router.navigate("login");
    throw new Error("Unauthorized");
  }

  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(body.error || body.message || `HTTP ${resp.status}`);
  }

  if (resp.status === 204) return null;
  return resp.json();
}

// ── Customer Auth ──────────────────────────────────────────────────────────

const authApi = {
  requestOtp: (phone, tenantId) =>
    apiFetch("/api/delivery/auth/request-otp", {
      method: "POST",
      body: JSON.stringify({ phone, tenantId }),
    }),

  verifyOtp: (phone, tenantId, otp) =>
    apiFetch("/api/delivery/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify({ phone, tenantId, otp }),
    }),

  login: (email, password, tenantId) =>
    apiFetch("/api/delivery/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password, tenantId }),
    }),

  register: (data) =>
    apiFetch("/api/delivery/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  logout: () =>
    apiFetch("/api/delivery/auth/logout", { method: "POST" }),

  getMe: () => apiFetch("/api/delivery/auth/me"),

  updateMe: (data) =>
    apiFetch("/api/delivery/auth/me", {
      method: "PUT",
      body: JSON.stringify(data),
    }),
};

// ── Store / Menu ────────────────────────────────────────────────────────────

const storeApi = {
  getConfig: (slug) => apiFetch(`/api/delivery/store/${slug}`),
  getMenu: (slug) => apiFetch(`/api/delivery/store/${slug}/menu`),
  getProduct: (slug, productId) => apiFetch(`/api/delivery/store/${slug}/product/${productId}`),
  getPromos: (slug) => apiFetch(`/api/delivery/store/${slug}/promos`),
};

// ── Delivery Zones ──────────────────────────────────────────────────────────

const zonesApi = {
  getZones: (tenantId) => apiFetch(`/api/delivery/zones?tenantId=${tenantId}`),
};

// ── Promo codes ─────────────────────────────────────────────────────────────

const promosApi = {
  validate: (tenantId, code, orderTotal, orderType, customerId) =>
    apiFetch("/api/delivery/promo/validate", {
      method: "POST",
      body: JSON.stringify({ tenantId, code, orderTotal, orderType, customerId }),
    }),
};

// ── Addresses ──────────────────────────────────────────────────────────────

const addressesApi = {
  list: () => apiFetch("/api/delivery/addresses"),
  create: (data) => apiFetch("/api/delivery/addresses", { method: "POST", body: JSON.stringify(data) }),
  update: (id, data) => apiFetch(`/api/delivery/addresses/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id) => apiFetch(`/api/delivery/addresses/${id}`, { method: "DELETE" }),
  setDefault: (id) => apiFetch(`/api/delivery/addresses/${id}/default`, { method: "PUT" }),
};

// ── Orders ─────────────────────────────────────────────────────────────────

const ordersApi = {
  create: (data) =>
    apiFetch("/api/delivery/orders", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  track: (token) => apiFetch(`/api/delivery/orders/track/${token}`),

  history: (tenantId) => apiFetch(`/api/delivery/orders/history?tenantId=${tenantId}`),

  rate: (orderId, data) =>
    apiFetch(`/api/delivery/orders/${orderId}/rate`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  reorder: (orderId) =>
    apiFetch(`/api/delivery/orders/${orderId}/reorder`, { method: "POST" }),

  /**
   * SSE stream for live order status.
   * @param {number} orderId
   * @param {function} onEvent - called with parsed JSON event data
   * @returns {EventSource}
   */
  statusStream: (orderId, onEvent) => {
    const token = auth.getToken();
    const url = `/api/delivery/orders/${orderId}/status-stream${token ? `?token=${token}` : ""}`;
    const es = new EventSource(url);
    es.onmessage = (e) => {
      try { onEvent(JSON.parse(e.data)); } catch (_) { }
    };
    return es;
  },
};

// ── Loyalty & Wallet ────────────────────────────────────────────────────────

const loyaltyApi = {
  get: (customerId) => apiFetch(`/api/delivery/loyalty/${customerId}`),
  redeem: (customerId, tenantId, points) =>
    apiFetch("/api/delivery/loyalty/redeem", {
      method: "POST",
      body: JSON.stringify({ customerId, tenantId, points }),
    }),
};

const walletApi = {
  get: (customerId) => apiFetch(`/api/delivery/wallet/${customerId}`),
  topup: (customerId, tenantId, amount) =>
    apiFetch("/api/delivery/wallet/topup", {
      method: "POST",
      body: JSON.stringify({ customerId, tenantId, amount }),
    }),
};

// ── Referral ────────────────────────────────────────────────────────────────

const referralApi = {
  lookup: (code) => apiFetch(`/api/delivery/referral/${code}`),
};

// ── Exports ─────────────────────────────────────────────────────────────────

window.api = {
  auth: authApi,
  store: storeApi,
  zones: zonesApi,
  promos: promosApi,
  addresses: addressesApi,
  orders: ordersApi,
  loyalty: loyaltyApi,
  wallet: walletApi,
  referral: referralApi,
};
