// Post-export script: restores files that expo export removes from dist/
const fs = require("fs");
const path = require("path");

const distDir = path.resolve(__dirname, "../dist");

// ── Service Worker ────────────────────────────────────────────────────────────
const swContent = `// Barmagly POS — Service Worker
// Handles Web Push notifications for incoming calls and online orders
// even when the app tab is closed.

const CACHE_NAME = "barmagly-pos-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

// ── Fetch handler (required for PWA installability) ───────────────────────────
self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
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
  const icon = "/app/favicon.ico";
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

  event.waitUntil(self.registration.showNotification(title || "Barmagly POS", options));
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
  start_url: "/app",
  scope: "/app",
  display: "standalone",
  orientation: "any",
  theme_color: "#2FD3C6",
  background_color: "#0A0E17",
  lang: "en",
  icons: [
    { src: "/app/assets/images/icon.png", sizes: "192x192", type: "image/png", purpose: "any maskable" },
    { src: "/app/assets/images/icon.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
  ],
  screenshots: [],
  categories: ["business", "productivity"],
}, null, 2);

fs.writeFileSync(path.join(distDir, "sw.js"), swContent);
fs.writeFileSync(path.join(distDir, "manifest.webmanifest"), manifestContent);

// ── Patch index.html to add manifest link ────────────────────────────────────
const indexPath = path.join(distDir, "index.html");
if (fs.existsSync(indexPath)) {
  let html = fs.readFileSync(indexPath, "utf8");
  if (!html.includes('rel="manifest"')) {
    html = html.replace(
      "</head>",
      '  <link rel="manifest" href="/app/manifest.webmanifest" />\n  <link rel="apple-touch-icon" href="/app/assets/images/icon.png" />\n  <meta name="mobile-web-app-capable" content="yes" />\n  <meta name="apple-mobile-web-app-capable" content="yes" />\n  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />\n</head>'
    );
    fs.writeFileSync(indexPath, html, "utf8");
    console.log("[post-export] Patched index.html with manifest link.");
  } else {
    console.log("[post-export] index.html already has manifest link.");
  }
}

console.log("[post-export] Restored sw.js and manifest.webmanifest to dist/");
