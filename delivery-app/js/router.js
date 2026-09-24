/**
 * router.js — History API router for the storefront.
 * Pages may register cleanup with router.onLeave(fn); it runs before the next
 * page renders, so timers, streams and observers never leak across pages.
 */
(function () {
  "use strict";

  var router = {
    _routes: [],
    _slug: null,
    _current: null,
    _basePath: "",
    _leave: [],
    _seq: 0,
    _listeners: [],

    init: function (slug, basePath) {
      router._slug = slug;
      router._basePath = basePath || "";
      window.addEventListener("popstate", function () {
        if (router._depth > 0) router._depth--;
        router._resolve();
      });
      document.addEventListener("click", function (e) {
        var a = e.target.closest && e.target.closest("a[data-route]");
        if (!a || e.metaKey || e.ctrlKey) return;
        e.preventDefault();
        var params = {};
        try { params = a.dataset.params ? JSON.parse(a.dataset.params) : {}; } catch (_) {}
        router.navigate(a.dataset.route, params);
      });
    },

    define: function (routes) { router._routes = routes; },

    url: function (name, params) {
      var r = router._routes.find(function (x) { return x.name === name; });
      return r ? router._buildPath(r.path, params || {}) : "#";
    },

    navigate: function (name, params) {
      var r = router._routes.find(function (x) { return x.name === name; });
      if (!r) return;
      var path = router._buildPath(r.path, params || {});
      if (path !== location.pathname) history.pushState({ name: name, params: params || {} }, "", path);
      router._render(r, params || {}, true);
    },

    replace: function (name, params) {
      var r = router._routes.find(function (x) { return x.name === name; });
      if (!r) return;
      history.replaceState({ name: name, params: params || {} }, "", router._buildPath(r.path, params || {}));
      router._render(r, params || {}, true);
    },

    back: function (fallback) {
      // Only step back inside this storefront; a first visit goes to a sensible page.
      if (router._depth > 0) history.back();
      else router.replace(fallback || "home");
    },
    _depth: 0,

    onLeave: function (fn) { router._leave.push(fn); },
    onRoute: function (fn) { router._listeners.push(fn); },

    _resolve: function () {
      var path = location.pathname;
      if (router._basePath && path.indexOf(router._basePath) === 0) path = path.slice(router._basePath.length) || "/";
      path = path.replace(/\/+$/, "") || "/";
      for (var i = 0; i < router._routes.length; i++) {
        var params = router._match(router._routes[i].path, path);
        if (params) return router._render(router._routes[i], params, false);
      }
      var home = router._routes.find(function (r) { return r.name === "home"; });
      if (home) router._render(home, {}, false);
    },

    _match: function (pattern, path) {
      var pp = pattern.split("/").filter(Boolean);
      var ap = path.split("/").filter(Boolean);
      if (pp.length !== ap.length) return null;
      var params = {};
      for (var i = 0; i < pp.length; i++) {
        if (pp[i].charAt(0) === ":") {
          try { params[pp[i].slice(1)] = decodeURIComponent(ap[i]); } catch (e) { params[pp[i].slice(1)] = ap[i]; }
        } else if (pp[i] !== ap[i]) return null;
      }
      return params;
    },

    _buildPath: function (pattern, params) {
      var path = pattern;
      Object.keys(params || {}).forEach(function (k) { path = path.replace(":" + k, encodeURIComponent(params[k])); });
      return router._basePath + path;
    },

    _render: function (route, params, pushed) {
      var seq = ++router._seq;
      if (pushed) router._depth++;
      var leave = router._leave;
      router._leave = [];
      leave.forEach(function (fn) { try { fn(); } catch (e) {} });
      if (window.closeAllSheets) closeAllSheets();

      router._current = { route: route, params: params };
      var app = document.getElementById("app");
      if (!app) return;
      document.body.setAttribute("data-page", route.name);
      window.scrollTo(0, 0);
      router._listeners.forEach(function (fn) { try { fn(route.name, params); } catch (e) {} });

      var done = function () { if (seq === router._seq) refreshIcons(); };
      var fail = function (err) {
        if (seq !== router._seq) return;
        console.error("[router]", err);
        app.innerHTML = router.errorState(err, function () { router._render(route, params, false); });
        router._bindRetry(app, function () { router._render(route, params, false); });
        refreshIcons();
      };
      try {
        var r = route.render(params, app, function () { return seq === router._seq; });
        if (r && r.then) r.then(done, fail); else done();
      } catch (err) { fail(err); }
    },

    /** Uniform error block with a retry button (data-retry). */
    errorState: function (err, _retry, title) {
      var net = err && err.network;
      return '<div class="state">' +
        '<div class="state__icon">' + icon(net ? "wifi-off" : "alert-triangle", "icon-xl") + "</div>" +
        '<h2 class="state__title">' + esc(title || (net ? L("You seem to be offline", "يبدو أنك غير متصل") : L("Something went wrong", "حدث خطأ ما"))) + "</h2>" +
        '<p class="state__text">' + esc((err && err.message) || L("Please try again.", "حاول مرة أخرى.")) + "</p>" +
        '<button class="btn btn-primary" data-retry>' + icon("refresh-cw", "icon-sm") + " " + esc(L("Try again", "أعد المحاولة")) + "</button>" +
        "</div>";
    },
    _bindRetry: function (root, fn) {
      var b = root.querySelector("[data-retry]");
      if (b) b.onclick = fn;
    },

    getCurrent: function () { return router._current; },
    getSlug: function () { return router._slug; },
  };

  window.router = router;
})();
