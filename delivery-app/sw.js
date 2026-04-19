/**
 * Service Worker — Barmagly Delivery PWA
 * Caches static assets, serves offline fallback, and handles push notifications.
 */

const CACHE_NAME = "barmagly-delivery-v5";
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
  "/api/delivery-app/js/pages/search.js",
  "/api/delivery-app/js/pages/favorites.js",
  "/api/delivery-app/js/pages/help.js",
  "/api/delivery-app/js/pages/reviews.js",
  "/api/delivery-app/js/pages/rewards.js",
  "/api/delivery-app/js/pages/stamps.js",
  "/api/delivery-app/js/pages/giftcards.js",
  "/api/delivery-app/js/pages/courier.js",
  "/api/delivery-app/js/pages/partner.js",
];

const API_CACHE_NAME = "barmagly-api-v1";
const IMAGE_CACHE_NAME = "barmagly-images-v1";
const API_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const IMAGE_CACHE_MAX = 200;

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
  const validCaches = [CACHE_NAME, API_CACHE_NAME, IMAGE_CACHE_NAME];
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => !validCaches.includes(key))
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

  // API data requests — network-first with cache fallback for read-only endpoints
  if (url.pathname.startsWith("/api/delivery/")) {
    // Cache menu and restaurant data (network-first)
    if (
      url.pathname.match(/\/api\/delivery\/store\/[^/]+\/menu$/) ||
      url.pathname.match(/\/api\/delivery\/store\/[^/]+$/) ||
      url.pathname === "/api/delivery/restaurants" ||
      url.pathname.match(/\/api\/delivery\/help\/faq/)
    ) {
      event.respondWith(
        fetch(event.request)
          .then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(API_CACHE_NAME).then((cache) => cache.put(event.request, clone));
            }
            return response;
          })
          .catch(() => caches.match(event.request))
      );
      return;
    }
    return;
  }

  // Image requests — cache-first with network fallback
  if (
    url.hostname.includes("unsplash.com") ||
    url.hostname.includes("images.unsplash.com") ||
    url.pathname.match(/\.(jpg|jpeg|png|webp|gif)$/i)
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(IMAGE_CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => new Response("", { status: 404 }));
      })
    );
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
        .catch(() =>
          caches.match(event.request).then((cached) => {
            if (cached) return cached;
            // Offline fallback page
            return new Response(
              '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline</title><style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#F8F9FA;color:#1A1A2E;text-align:center;padding:20px}h1{font-size:1.5rem;margin-bottom:8px}p{color:#6B7280}button{margin-top:16px;padding:12px 24px;background:#FF5722;color:#fff;border:none;border-radius:12px;font-size:1rem;cursor:pointer}</style></head><body><div><h1>You\'re offline</h1><p>Check your internet connection and try again</p><button onclick="location.reload()">Retry</button></div></body></html>',
              { headers: { "Content-Type": "text/html; charset=utf-8" } }
            );
          })
        )
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
