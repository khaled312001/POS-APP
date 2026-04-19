// Post-export script: restructures dist/ for Vercel deployment
// Layout after this script runs:
//   dist/index.html              ← landing page  (https://pos.barmagly.tech/)
//   dist/app/index.html          ← Expo POS app  (https://pos.barmagly.tech/app)
//   dist/app/_expo/...           ← Expo static assets
//   dist/app/assets/...          ← app assets
//   dist/uploads/...             ← product uploads served from /uploads/*
//   dist/sounds/...              ← shared sounds served from /sounds/*
//   dist/app/sw.js               ← service worker
//   dist/app/manifest.webmanifest
//   dist/super_admin/index.html  ← super-admin dashboard
//   dist/super_admin/login/index.html ← super-admin login
const fs = require("fs");
const path = require("path");

const distDir = path.resolve(__dirname, process.env.EXPORT_DIST_DIR || "../dist");
const appDir = path.join(distDir, "app");
const superAdminDir = path.join(distDir, "super_admin");
const superAdminLoginDir = path.join(superAdminDir, "login");

// ── Helpers ───────────────────────────────────────────────────────────────────
function moveToApp(name) {
  const src = path.join(distDir, name);
  const dest = path.join(appDir, name);
  if (fs.existsSync(src)) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.renameSync(src, dest);
    console.log(`[post-export] Moved ${name} → app/${name}`);
  }
}

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function copyDirRecursive(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) {
    return;
  }

  fs.mkdirSync(destDir, { recursive: true });
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const src = path.join(srcDir, entry.name);
    const dest = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(src, dest);
    } else if (entry.isFile()) {
      copyFile(src, dest);
    }
  }
}

// ── 1. Create app/ directory ──────────────────────────────────────────────────
fs.mkdirSync(appDir, { recursive: true });

// ── 2. Service Worker (scope: /app/) ─────────────────────────────────────────
const swContent = `// Barmagly POS — Service Worker
// Handles offline caching and Web Push notifications.

const CACHE_NAME = "barmagly-pos-v3";

const APP_SHELL = [
  "/app",
  "/app/manifest.webmanifest",
  "/app/favicon.ico",
  "/app/assets/images/icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(APP_SHELL.map((url) => cache.add(url)));
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (
    url.pathname.startsWith("/api") ||
    request.headers.get("upgrade") === "websocket" ||
    url.origin !== self.location.origin
  ) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cached = await caches.match("/app");
        if (cached) return cached;
        const appIndex = await caches.match("/app/index.html");
        if (appIndex) return appIndex;
        return Response.redirect("/app/", 302);
      })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (
          response.ok &&
          response.type === "basic" &&
          (url.pathname === "/app" || url.pathname.startsWith("/app/assets"))
        ) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      }).catch(async () => {
        const fallback = await caches.match(request);
        return fallback || Response.error();
      });
    })
  );
});

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

fs.writeFileSync(path.join(appDir, "sw.js"), swContent);
console.log("[post-export] Wrote app/sw.js");

// ── 3. Web App Manifest ───────────────────────────────────────────────────────
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

fs.writeFileSync(path.join(appDir, "manifest.webmanifest"), manifestContent);
console.log("[post-export] Wrote app/manifest.webmanifest");

// ── 3b. App route fallback for direct /app/* URLs ───────────────────────────
const appHtaccess = `Options -MultiViews
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^ index.html [QSA,L]
`;
fs.writeFileSync(path.join(appDir, ".htaccess"), appHtaccess, "utf8");
console.log("[post-export] Wrote app/.htaccess");

// ── 4. Move Expo output files into dist/app/ ──────────────────────────────────
// These are the folders/files expo export puts at dist/ root
["_expo", "assets", "favicon.ico", "metadata.json"].forEach(moveToApp);

// Move the SPA entry point
const indexSrc = path.join(distDir, "index.html");
const indexDest = path.join(appDir, "index.html");
if (fs.existsSync(indexSrc)) {
  let html = fs.readFileSync(indexSrc, "utf8");

  // Prevent accidental pinch-zoom on iPad/tablet (breaks tablet layout detection)
  html = html.replace(
    /<meta name="viewport"[^>]*>/,
    '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />'
  );

  // Add manifest + PWA meta tags if not already present
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
  }

  fs.writeFileSync(indexDest, html, "utf8");
  fs.unlinkSync(indexSrc);
  console.log("[post-export] Moved index.html → app/index.html");
}

// ── 5. Copy icon image (expo export omits it; needed by PWA manifest) ────────
const srcIconDir = path.resolve(__dirname, "../assets/images");
const destIconDir = path.join(appDir, "assets", "images");
fs.mkdirSync(destIconDir, { recursive: true });
for (const img of ["icon.png", "splash-icon.png", "favicon.png"]) {
  const s = path.join(srcIconDir, img);
  const d = path.join(destIconDir, img);
  if (fs.existsSync(s) && !fs.existsSync(d)) {
    fs.copyFileSync(s, d);
    console.log(`[post-export] Copied assets/images/${img} → app/assets/images/${img}`);
  }
}

// ── 5b. Copy root-served assets that the app requests outside /app/ ──────────
const sourceUploadsDir = path.resolve(__dirname, "../uploads");
const sourceSoundsDir = path.resolve(__dirname, "../public/sounds");
const distUploadsDir = path.join(distDir, "uploads");
const distSoundsDir = path.join(distDir, "sounds");
const appUploadsDir = path.join(appDir, "uploads");
const appSoundsDir = path.join(appDir, "sounds");

if (fs.existsSync(sourceUploadsDir)) {
  copyDirRecursive(sourceUploadsDir, distUploadsDir);
  copyDirRecursive(sourceUploadsDir, appUploadsDir);
  console.log("[post-export] Copied uploads/ → dist/uploads/ and dist/app/uploads/");
}

if (fs.existsSync(sourceSoundsDir)) {
  copyDirRecursive(sourceSoundsDir, distSoundsDir);
  copyDirRecursive(sourceSoundsDir, appSoundsDir);
  console.log("[post-export] Copied public/sounds/ → dist/sounds/ and dist/app/sounds/");
} else if (fs.existsSync(distSoundsDir)) {
  copyDirRecursive(distSoundsDir, appSoundsDir);
  console.log("[post-export] Mirrored dist/sounds/ → dist/app/sounds/");
}

// ── 6. Landing page at dist/index.html ───────────────────────────────────────
const landingTemplatePath = path.resolve(__dirname, "../server/templates/landing-page.html");
if (fs.existsSync(landingTemplatePath)) {
  let landingHtml = fs.readFileSync(landingTemplatePath, "utf-8");
  // Replace server-side template placeholders with static values
  landingHtml = landingHtml
    .replace(/BASE_URL_PLACEHOLDER/g, "https://pos.barmagly.tech")
    .replace(/EXPS_URL_PLACEHOLDER/g, "pos.barmagly.tech")
    .replace(/APP_NAME_PLACEHOLDER/g, "Barmagly POS")
    // Fix super-admin link to use underscore path
    .replace(/\/super-admin\//g, "/super_admin/");

  fs.writeFileSync(path.join(distDir, "index.html"), landingHtml, "utf-8");
  console.log("[post-export] Wrote landing page → dist/index.html");
} else {
  console.warn("[post-export] WARNING: landing-page.html template not found, root will be empty");
}

// ── 7. Super Admin pages ──────────────────────────────────────────────────────
fs.mkdirSync(superAdminDir, { recursive: true });
fs.mkdirSync(superAdminLoginDir, { recursive: true });

const dashboardTemplatePath = path.resolve(__dirname, "../server/templates/super-admin-dashboard.html");
const loginTemplatePath = path.resolve(__dirname, "../server/templates/super-admin-login.html");

if (fs.existsSync(dashboardTemplatePath)) {
  copyFile(dashboardTemplatePath, path.join(superAdminDir, "index.html"));
  console.log("[post-export] Wrote super_admin/index.html");
}
if (fs.existsSync(loginTemplatePath)) {
  copyFile(loginTemplatePath, path.join(superAdminLoginDir, "index.html"));
  console.log("[post-export] Wrote super_admin/login/index.html");
}

console.log("[post-export] Done. dist/ structure:");
console.log("  /             → landing page");
console.log("  /app          → Expo POS app");
console.log("  /super_admin  → Super Admin dashboard");
