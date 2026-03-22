// Post-export script: restores files that expo export removes from dist/
const fs = require("fs");
const path = require("path");

const distDir = path.resolve(__dirname, "../dist");

// ── Service Worker ────────────────────────────────────────────────────────────
const swContent = `// Barmagly POS — Service Worker
// Handles offline caching and Web Push notifications.

const CACHE_NAME = "barmagly-pos-v2";

// Core app shell files to cache on install
const APP_SHELL = [
  "/app",
  "/app/",
  "/app/manifest.webmanifest",
  "/app/favicon.ico",
  "/app/assets/images/icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Cache the app shell; ignore failures for individual assets
      return Promise.allSettled(APP_SHELL.map((url) => cache.add(url)));
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    // Remove old caches
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => clients.claim())
  );
});

// ── Fetch handler ─────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Don't intercept API calls, WebSocket upgrades, or cross-origin requests
  if (
    url.pathname.startsWith("/api") ||
    request.headers.get("upgrade") === "websocket" ||
    url.origin !== self.location.origin
  ) {
    return;
  }

  // For navigation requests (HTML pages) — network first, fall back to cached /app
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match("/app").then((cached) => cached || caches.match("/app/"))
      )
    );
    return;
  }

  // For static assets — cache first, then network, then cache the result
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        // Only cache successful same-origin responses
        if (
          response.ok &&
          response.type === "basic" &&
          (url.pathname.startsWith("/app") || url.pathname.startsWith("/assets"))
        ) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      }).catch(() => caches.match(request));
    })
  );
});

// ── Push notification handler ─────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Barmagly POS", body: event.data.text(), type: "generic" };
  }

  const { type, title, body, data = {} } = payload;
  const icon = "/app/assets/images/icon.png";
  const badge = "/app/favicon.ico";
  const tag = type || "generic";

  const options = {
    body,
    icon,
    badge,
    tag,
    data,
    requireInteraction: type === "incoming_call",
    vibrate: type === "incoming_call" ? [200, 100, 200, 100, 200] : [200],
    actions: type === "incoming_call"
      ? [{ action: "accept", title: "✅ Accept" }, { action: "decline", title: "❌ Decline" }]
      : type === "new_order"
      ? [{ action: "view", title: "👁 View Order" }]
      : [],
  };

  // For incoming calls: skip push if POS app tab is already open and focused
  if (type === "incoming_call") {
    event.waitUntil(
      clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
        const hasFocusedAppTab = windowClients.some(
          (c) => c.url.includes("/app") && c.focused
        );
        if (hasFocusedAppTab) return;
        return self.registration.showNotification(title || "Barmagly POS", options);
      })
    );
  } else {
    event.waitUntil(self.registration.showNotification(title || "Barmagly POS", options));
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const { action } = event;
  const data = event.notification.data || {};
  let targetUrl = "/app";
  if (action === "view" || data.orderId) targetUrl = "/app/online-orders";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes("/app") && "focus" in client) {
          client.focus();
          client.postMessage({ type: "NOTIFICATION_ACTION", action, data });
          return;
        }
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});
`;

// ── Web App Manifest ──────────────────────────────────────────────────────────
const manifestContent = JSON.stringify({
  name: "Barmagly POS",
  short_name: "Barmagly",
  description: "Point of Sale system for modern restaurants and stores",
  start_url: "/app/",
  scope: "/app/",
  display: "standalone",
  orientation: "any",
  theme_color: "#2FD3C6",
  background_color: "#0A0E17",
  lang: "en",
  icons: [
    { src: "/app/assets/images/icon.png", sizes: "192x192", type: "image/png", purpose: "any" },
    { src: "/app/assets/images/icon.png", sizes: "512x512", type: "image/png", purpose: "any" },
    { src: "/app/assets/images/icon.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
  ],
  categories: ["business", "productivity"],
}, null, 2);

fs.writeFileSync(path.join(distDir, "sw.js"), swContent);
fs.writeFileSync(path.join(distDir, "manifest.webmanifest"), manifestContent);

// ── Patch index.html to add manifest + PWA meta tags ─────────────────────────
const indexPath = path.join(distDir, "index.html");
if (fs.existsSync(indexPath)) {
  let html = fs.readFileSync(indexPath, "utf8");
  if (!html.includes('rel="manifest"')) {
    html = html.replace(
      "</head>",
      '  <link rel="manifest" href="/app/manifest.webmanifest" />\n' +
      '  <link rel="apple-touch-icon" href="/app/assets/images/icon.png" />\n' +
      '  <meta name="mobile-web-app-capable" content="yes" />\n' +
      '  <meta name="apple-mobile-web-app-capable" content="yes" />\n' +
      '  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />\n' +
      '</head>'
    );
    fs.writeFileSync(indexPath, html, "utf8");
    console.log("[post-export] Patched index.html with manifest link.");
  } else {
    console.log("[post-export] index.html already has manifest link.");
  }
}

console.log("[post-export] Restored sw.js and manifest.webmanifest to dist/");
