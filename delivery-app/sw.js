/**
 * Service Worker — Barmagly Delivery PWA
 * Caches static assets, serves offline fallback, and handles push notifications.
 */

const CACHE_NAME = "barmagly-delivery-v1";
const STATIC_ASSETS = [
  "/api/delivery-app/css/base.css",
  "/api/delivery-app/css/components.css",
  "/api/delivery-app/css/pages.css",
  "/api/delivery-app/js/router.js",
  "/api/delivery-app/js/cart.js",
  "/api/delivery-app/js/auth.js",
  "/api/delivery-app/js/api.js",
  "/api/delivery-app/js/pages/home.js",
  "/api/delivery-app/js/pages/menu.js",
  "/api/delivery-app/js/pages/cart-page.js",
  "/api/delivery-app/js/pages/checkout.js",
  "/api/delivery-app/js/pages/tracking.js",
  "/api/delivery-app/js/pages/account.js",
  "/api/delivery-app/js/pages/offers.js",
  "/api/delivery-app/js/pages/login.js",
];

// Install — cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // Non-critical: some assets may not be available yet
      });
    })
  );
  self.skipWaiting();
});

// Activate — clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch — network-first for API, cache-first for static
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== "GET") return;

  // API data requests — network only (don't cache dynamic data)
  if (url.pathname.startsWith("/api/delivery/")) {
    return;
  }

  // Static assets — cache first, fallback to network
  if (
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".woff2")
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // HTML pages — network first, cache fallback
  if (event.request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }
});

// Push notifications
self.addEventListener("push", (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    const options = {
      body: data.body || "",
      icon: "/api/delivery-app/icons/icon-192.png",
      badge: "/api/delivery-app/icons/icon-192.png",
      tag: data.tag || "delivery-notification",
      data: { url: data.url || "/api/order" },
      vibrate: [200, 100, 200],
      actions: data.actions || [],
    };
    event.waitUntil(self.registration.showNotification(data.title || "Barmagly Delivery", options));
  } catch (_) {}
});

// Notification click — open the relevant page
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/api/order";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes("/api/order") && "focus" in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
