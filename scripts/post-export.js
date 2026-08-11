// Post-export script: restructures dist/ for Vercel deployment
// Layout after this script runs:
//   dist/index.html              ← marketing site home
//   dist/app/index.html          ← Expo POS app  (/app)
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
const swContent = `// Kassenta POS — Service Worker
// Handles offline caching and Web Push notifications.

const CACHE_NAME = "kassenta-pos-v4";

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
    payload = { title: "Kassenta POS", body: event.data.text(), type: "generic" };
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
      ? [{ action: "accept", title: "Accept" }, { action: "decline", title: "Decline" }]
      : type === "new_order"
      ? [{ action: "view", title: "View order" }]
      : [],
  };

  if (type === "incoming_call") {
    event.waitUntil(
      clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
        const hasFocusedAppTab = windowClients.some(
          (c) => c.url.includes("/app") && c.focused
        );
        if (hasFocusedAppTab) return;
        return self.registration.showNotification(title || "Kassenta POS", options);
      })
    );
  } else {
    event.waitUntil(self.registration.showNotification(title || "Kassenta POS", options));
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
  name: "Kassenta POS",
  short_name: "Kassenta",
  description: "Point of sale, online ordering and delivery in one system.",
  start_url: "/app/",
  scope: "/app/",
  display: "standalone",
  orientation: "any",
  theme_color: "#0C8F85",
  background_color: "#F4F6FA",
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

// ── 6. Marketing site, pre-rendered to static HTML ──────────────────────────
// Apache serves the document root directly and the Hostinger CDN caches and
// brotli-compresses it, so shipping the pages as files skips the node process
// entirely. Express still renders the same routes from the same module as a
// fallback for backend.kassenta.com and for any path Apache has no file for.
{
  const esbuild = require("esbuild");
  const os = require("os");
  const repoRoot = path.resolve(__dirname, "..");
  const stamp = Date.now();
  const bundlePath = path.join(os.tmpdir(), `kassenta-site-${stamp}.cjs`);
  const legalBundle = path.join(os.tmpdir(), `kassenta-legal-${stamp}.cjs`);

  // esbuild's JS API rather than the CLI: spawning npx.cmd fails with EINVAL on
  // Windows, and the API skips a process launch either way.
  const bundle = (entry, outfile) =>
    esbuild.buildSync({
      entryPoints: [entry],
      outfile,
      bundle: true,
      platform: "node",
      format: "cjs",
      packages: "external",
      absWorkingDir: repoRoot,
      logLevel: "silent",
    });

  try {
    bundle(path.join(repoRoot, "server/site/index.ts"), bundlePath);
    const site = require(bundlePath);
    const baseUrl = process.env.PUBLIC_BASE_URL || "https://kassenta.com";
    let pageCount = 0;

    for (const routePath of site.SITE_PATHS) {
      const html = site.renderSitePage(routePath, baseUrl);
      if (!html) continue;
      const outFile =
        routePath === "/"
          ? path.join(distDir, "index.html")
          : path.join(distDir, routePath.slice(1), "index.html");
      fs.mkdirSync(path.dirname(outFile), { recursive: true });
      fs.writeFileSync(outFile, html, "utf8");
      pageCount++;
    }

    // Terms and imprint come from the same shell but live in their own module.
    bundle(path.join(repoRoot, "server/site/legal.ts"), legalBundle);
    const legal = require(legalBundle);
    for (const [slug, html] of [["terms", legal.TERMS_HTML], ["imprint", legal.IMPRINT_HTML]]) {
      fs.mkdirSync(path.join(distDir, slug), { recursive: true });
      fs.writeFileSync(path.join(distDir, slug, "index.html"), html, "utf8");
      pageCount++;
    }

    // Content-hashed stylesheet and script, shared by every page.
    const homeHtml = fs.readFileSync(path.join(distDir, "index.html"), "utf8");
    const assetUrls = new Set(
      [...homeHtml.matchAll(/\/assets\/site\.[a-f0-9]+\.(?:css|js)/g)].map((m) => m[0])
    );
    fs.mkdirSync(path.join(distDir, "assets"), { recursive: true });
    for (const url of assetUrls) {
      const asset = site.findSiteAsset(url);
      if (asset) fs.writeFileSync(path.join(distDir, url.replace(/^\//, "")), asset.body, "utf8");
    }

    // NOTE: deliberately no .htaccess here. The document root already carries
    // the Passenger configuration, and overwriting it would take the whole app
    // down. Pages are emitted as <slug>/index.html and linked with a trailing
    // slash, so Apache serves them directly with no redirect and no rewrite.

    console.log(`[post-export] Pre-rendered ${pageCount} site pages + ${assetUrls.size} assets`);
  } catch (err) {
    console.error("[post-export] Site pre-render FAILED:", err.message);
    console.error("[post-export] The document root would keep serving the previous build — aborting.");
    process.exit(1);
  } finally {
    for (const f of [bundlePath, legalBundle]) {
      try { fs.unlinkSync(f); } catch (_) {}
    }
  }
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
console.log("  /             → marketing site (7 pages + terms + imprint)");
console.log("  /app          → Expo POS app");
console.log("  /super_admin  → Super Admin dashboard");
