/**
 * auth.js — Customer session management (OTP + email/password)
 * Uses localStorage to persist the session token.
 */

const SESSION_KEY = "barmagly_delivery_token";
const CUSTOMER_KEY = "barmagly_delivery_customer";

const auth = {
  // ── Token helpers ──────────────────────────────────────────────────────────
  getToken() {
    return localStorage.getItem(SESSION_KEY);
  },

  setToken(token) {
    localStorage.setItem(SESSION_KEY, token);
  },

  clearSession() {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(CUSTOMER_KEY);
  },

  isLoggedIn() {
    return Boolean(localStorage.getItem(SESSION_KEY));
  },

  // ── Customer cache ─────────────────────────────────────────────────────────
  getCachedCustomer() {
    try {
      return JSON.parse(localStorage.getItem(CUSTOMER_KEY) || "null");
    } catch {
      return null;
    }
  },

  cacheCustomer(customer) {
    localStorage.setItem(CUSTOMER_KEY, JSON.stringify(customer));
  },

  // ── Session shorthand (used by login page) ────────────────────────────────
  setSession(token, customer) {
    if (token) this.setToken(token);
    if (customer) this.cacheCustomer(customer);
  },

  /** Return cached customer synchronously (may be null if not logged in) */
  getCustomer() {
    return this.getCachedCustomer();
  },

  // ── OTP flow ───────────────────────────────────────────────────────────────
  async requestOtp(phone, tenantId) {
    return api.auth.requestOtp(phone, tenantId);
  },

  async verifyOtp(phone, tenantId, otp) {
    const result = await api.auth.verifyOtp(phone, tenantId, otp);
    if (result.token) {
      this.setToken(result.token);
      if (result.customer) {
        this.cacheCustomer(result.customer);
      }
    }
    return result;
  },

  // ── Email/password login ───────────────────────────────────────────────────
  async loginWithEmail(email, password, tenantId) {
    const result = await api.auth.login(email, password, tenantId);
    if (result.token) {
      this.setToken(result.token);
      if (result.customer) {
        this.cacheCustomer(result.customer);
      }
    }
    return result;
  },

  // ── Load current customer from server ─────────────────────────────────────
  async loadMe() {
    if (!this.isLoggedIn()) return null;
    try {
      const customer = await api.auth.getMe();
      this.cacheCustomer(customer);
      return customer;
    } catch {
      return this.getCachedCustomer();
    }
  },

  // ── Logout ─────────────────────────────────────────────────────────────────
  async logout() {
    try {
      await api.auth.logout();
    } catch (_) { }
    this.clearSession();
  },

  // ── UI helpers ─────────────────────────────────────────────────────────────
  requireAuth() {
    if (!this.isLoggedIn()) {
      router.navigate("login");
      return false;
    }
    return true;
  },
};

window.auth = auth;
