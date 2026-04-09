/**
 * router.js — History API pushState SPA router
 * Matches routes to page modules and renders them into #app.
 */

const router = {
  _routes: [],
  _slug: null,
  _current: null,

  init(slug) {
    this._slug = slug;
    window.addEventListener("popstate", () => this._resolve());
    document.addEventListener("click", (e) => {
      const a = e.target.closest("a[data-route]");
      if (!a) return;
      e.preventDefault();
      this.navigate(a.dataset.route, a.dataset.params ? JSON.parse(a.dataset.params) : {});
    });
  },

  define(routes) {
    this._routes = routes;
  },

  navigate(name, params = {}) {
    const route = this._routes.find(r => r.name === name);
    if (!route) return;
    const path = this._buildPath(route.path, params);
    history.pushState({ name, params }, "", path);
    this._render(route, params);
  },

  replace(name, params = {}) {
    const route = this._routes.find(r => r.name === name);
    if (!route) return;
    const path = this._buildPath(route.path, params);
    history.replaceState({ name, params }, "", path);
    this._render(route, params);
  },

  _resolve() {
    const path = location.pathname;
    for (const route of this._routes) {
      const params = this._match(route.path, path);
      if (params !== null) {
        this._render(route, params);
        return;
      }
    }
    // Default to home
    const home = this._routes.find(r => r.name === "home");
    if (home) this._render(home, {});
  },

  _match(pattern, path) {
    const patternParts = pattern.split("/").filter(Boolean);
    const pathParts = path.split("/").filter(Boolean);
    if (patternParts.length !== pathParts.length) return null;

    const params = {};
    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i].startsWith(":")) {
        params[patternParts[i].slice(1)] = decodeURIComponent(pathParts[i]);
      } else if (patternParts[i] !== pathParts[i]) {
        return null;
      }
    }
    return params;
  },

  _buildPath(pattern, params) {
    let path = pattern;
    for (const [key, val] of Object.entries(params)) {
      path = path.replace(`:${key}`, encodeURIComponent(val));
    }
    // Replace :slug placeholder
    path = path.replace(":slug", this._slug);
    return path;
  },

  async _render(route, params) {
    this._current = { route, params };
    const app = document.getElementById("app");
    if (!app) return;

    // Show loading state
    if (route.loader) {
      app.innerHTML = `<div class="flex items-center justify-center" style="min-height:60vh">
        <div class="loading-spinner"></div>
      </div>`;
    }

    try {
      await route.render(params, app);
    } catch (err) {
      console.error("[router] Render error:", err);
      app.innerHTML = `<div class="empty-state">
        <div class="empty-state__icon">⚠️</div>
        <h2 class="empty-state__title">Something went wrong</h2>
        <p class="empty-state__text">${err.message || "Please try again."}</p>
        <button class="btn btn-primary mt-md" onclick="router.navigate('home')">Go Home</button>
      </div>`;
    }

    this._updateBottomNav(route.name);
  },

  _updateBottomNav(routeName) {
    document.querySelectorAll(".bottom-nav__item").forEach(el => {
      el.classList.toggle("active", el.dataset.route === routeName);
    });
  },

  getCurrent() {
    return this._current;
  },

  getSlug() {
    return this._slug;
  },
};

window.router = router;
