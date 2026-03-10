import express from "express";
import type { Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { registerSuperAdminRoutes } from "./superAdminRoutes";
import { tenantAuthMiddleware } from "./tenantAuth";
import { callerIdService } from "./callerIdService";
import { runMigrations } from "stripe-replit-sync";
import { getStripeSync, getStripePublishableKey, getUncachableStripeClient, getStripeSecretKey } from "./stripeClient";
import { WebhookHandlers } from "./webhookHandlers";
import * as fs from "fs";
import * as path from "path";

const app = express();
const log = console.log;

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

function setupCors(app: express.Application) {
  app.use((req, res, next) => {
    const origins = new Set<string>();

    if (process.env.REPLIT_DEV_DOMAIN) {
      origins.add(`https://${process.env.REPLIT_DEV_DOMAIN}`);
    }

    if (process.env.REPLIT_DOMAINS) {
      process.env.REPLIT_DOMAINS.split(",").forEach((d) => {
        origins.add(`https://${d.trim()}`);
      });
    }

    const origin = req.header("origin");

    // Allow localhost origins for Expo web development (any port)
    const isLocalhost =
      origin?.startsWith("http://localhost:") ||
      origin?.startsWith("http://127.0.0.1:");

    if (origin && (origins.has(origin) || isLocalhost)) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS",
      );
      res.header("Access-Control-Allow-Headers", "Content-Type, x-license-key");
      res.header("Access-Control-Allow-Credentials", "true");
    }

    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }

    next();
  });
}

function setupBodyParsing(app: express.Application) {
  app.use(
    express.json({
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );

  app.use(express.urlencoded({ extended: false }));
}

function setupRequestLogging(app: express.Application) {
  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse: Record<string, unknown> | undefined = undefined;

    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };

    res.on("finish", () => {
      if (!path.startsWith("/api")) return;

      const duration = Date.now() - start;

      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    });

    next();
  });
}

function getAppName(): string {
  try {
    const appJsonPath = path.resolve(process.cwd(), "app.json");
    const appJsonContent = fs.readFileSync(appJsonPath, "utf-8");
    const appJson = JSON.parse(appJsonContent);
    return appJson.expo?.name || "App Landing Page";
  } catch {
    return "App Landing Page";
  }
}

function serveExpoManifest(platform: string, res: Response) {
  const manifestPath = path.resolve(
    process.cwd(),
    "static-build",
    platform,
    "manifest.json",
  );

  if (!fs.existsSync(manifestPath)) {
    return res
      .status(404)
      .json({ error: `Manifest not found for platform: ${platform}` });
  }

  res.setHeader("expo-protocol-version", "1");
  res.setHeader("expo-sfv-version", "0");
  res.setHeader("content-type", "application/json");

  const manifest = fs.readFileSync(manifestPath, "utf-8");
  res.send(manifest);
}

function serveLandingPage({
  req,
  res,
  appName,
}: {
  req: Request;
  res: Response;
  appName: string;
}) {
  const forwardedProto = req.header("x-forwarded-proto");
  const protocol = forwardedProto || req.protocol || "https";
  const forwardedHost = req.header("x-forwarded-host");
  const host = forwardedHost || req.get("host");
  const baseUrl = `${protocol}://${host}`;
  const expsUrl = `${host}`;

  log(`baseUrl`, baseUrl);
  log(`expsUrl`, expsUrl);

  const templatePath = path.resolve(
    process.cwd(),
    "server",
    "templates",
    "landing-page.html"
  );
  const template = fs.readFileSync(templatePath, "utf-8");

  let html = template
    .replace(/BASE_URL_PLACEHOLDER/g, baseUrl)
    .replace(/EXPS_URL_PLACEHOLDER/g, expsUrl)
    .replace(/APP_NAME_PLACEHOLDER/g, appName);

  // Inject PWA tags so the POS app is installable from the landing page
  html = injectPWATags(html);

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
}

/**
 * Injects PWA meta tags, manifest link, and service worker registration into HTML.
 * This makes any page PWA-installable from the browser.
 */
function injectPWATags(html: string): string {
  // Don't double-inject
  if (html.includes('/manifest.json') && html.includes('/sw.js')) {
    return html;
  }

  const pwaHead = [
    '<link rel="manifest" href="/manifest.json">',
    '<meta name="theme-color" content="#2FD3C6">',
    '<meta name="mobile-web-app-capable" content="yes">',
    '<meta name="apple-mobile-web-app-capable" content="yes">',
    '<meta name="apple-mobile-web-app-title" content="Barmagly POS">',
    '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">',
    '<link rel="apple-touch-icon" href="/apple-touch-icon.png">',
    '<meta name="msapplication-TileColor" content="#0A0E17">',
    '<meta name="msapplication-tap-highlight" content="no">',
  ].join('\n  ');

  const pwaScript = `<script>
  // Register PWA Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' })
        .then(reg => {
          console.log('[PWA] Service Worker registered:', reg.scope);
          // Check for updates periodically
          setInterval(() => reg.update(), 60 * 60 * 1000);
        })
        .catch(err => console.warn('[PWA] SW registration failed:', err));
    });
  }

  // Prompt user to install if available
  let deferredPrompt;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    // Show install button if one exists
    const installBtn = document.getElementById('pwa-install-btn');
    if (installBtn) {
      installBtn.style.display = 'inline-flex';
      installBtn.addEventListener('click', () => {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(result => {
          if (result.outcome === 'accepted') console.log('[PWA] App installed');
          deferredPrompt = null;
          installBtn.style.display = 'none';
        });
      });
    }
  });
  </script>`;

  if (!html.includes('/manifest.json')) {
    html = html.replace('</head>', `  ${pwaHead}\n  ${pwaScript}\n</head>`);
  } else if (!html.includes('/sw.js')) {
    html = html.replace('</body>', `${pwaScript}\n</body>`);
  }

  return html;
}

function configureExpoAndLanding(app: express.Application) {
  const templatePath = path.resolve(
    process.cwd(),
    "server",
    "templates",
    "landing-page.html",
  );
  const dashboardPath = path.resolve(
    process.cwd(),
    "server",
    "templates",
    "dashboard.html",
  );
  const appName = getAppName();

  log("Serving static Expo files with dynamic manifest routing");

  app.use(async (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith("/api")) {
      return next();
    }

    if (req.path === "/favicon.ico") {
      // Inline SVG favicon – prevents 404 noise
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#0A0E17"/><text x="16" y="23" text-anchor="middle" font-size="20" fill="#2FD3C6">B</text></svg>`;
      res.setHeader("Content-Type", "image/svg+xml");
      return res.status(200).send(svg);
    }

    // PWA manifest – enables "Install App" prompt in browsers
    if (req.path === "/manifest.json") {
      const forwardedProto = req.header("x-forwarded-proto");
      const protocol = forwardedProto || req.protocol || "https";
      const forwardedHost = req.header("x-forwarded-host");
      const host = forwardedHost || req.get("host");
      const origin = `${protocol}://${host}`;
      const manifest = {
        name: "Barmagly POS",
        short_name: "Barmagly",
        description: "Cloud-powered Point of Sale system for modern restaurants, cafés, and retail stores. Multi-branch, multi-language, Stripe payments, inventory, CRM and more.",
        start_url: "/",
        scope: "/",
        id: "/",
        display: "standalone",
        display_override: ["window-controls-overlay", "standalone", "minimal-ui"],
        background_color: "#0A0E17",
        theme_color: "#2FD3C6",
        orientation: "any",
        icons: [
          { src: "/pwa-icon-192.svg", sizes: "192x192", type: "image/svg+xml", purpose: "any" },
          { src: "/pwa-icon-512.svg", sizes: "512x512", type: "image/svg+xml", purpose: "any" },
          { src: "/pwa-icon-maskable.svg", sizes: "512x512", type: "image/svg+xml", purpose: "maskable" },
          { src: "/assets/images/icon.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/assets/images/icon.png", sizes: "512x512", type: "image/png", purpose: "any" }
        ],
        shortcuts: [
          {
            name: "POS Terminal",
            short_name: "POS",
            url: "/",
            icons: [{ src: "/pwa-icon-192.svg", sizes: "192x192" }]
          },
          {
            name: "Dashboard",
            short_name: "Dashboard",
            url: "/dashboard",
            icons: [{ src: "/pwa-icon-192.svg", sizes: "192x192" }]
          },
          {
            name: "Admin Panel",
            short_name: "Admin",
            url: "/super_admin/login",
            icons: [{ src: "/pwa-icon-192.svg", sizes: "192x192" }]
          }
        ],
        categories: ["business", "productivity", "finance"],
        lang: "en",
        dir: "ltr",
        prefer_related_applications: false,
        edge_side_panel: { preferred_width: 480 }
      };
      res.setHeader("Content-Type", "application/manifest+json");
      res.setHeader("Cache-Control", "public, max-age=86400");
      return res.status(200).json(manifest);
    }

    // SVG icons for PWA
    if (req.path === "/pwa-icon-192.svg" || req.path === "/pwa-icon-512.svg") {
      const size = req.path.includes("192") ? 192 : 512;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0A0E17"/>
      <stop offset="100%" style="stop-color:#111827"/>
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#2FD3C6"/>
      <stop offset="100%" style="stop-color:#6366F1"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="108" fill="url(#bg)"/>
  <rect x="24" y="24" width="464" height="464" rx="90" fill="none" stroke="url(#accent)" stroke-width="3" opacity="0.3"/>
  <text x="256" y="340" text-anchor="middle" font-family="system-ui,-apple-system,sans-serif" font-size="280" font-weight="900" fill="url(#accent)">B</text>
  <circle cx="390" cy="130" r="40" fill="#2FD3C6" opacity="0.15"/>
  <circle cx="130" cy="400" r="30" fill="#6366F1" opacity="0.1"/>
</svg>`;
      res.setHeader("Content-Type", "image/svg+xml");
      res.setHeader("Cache-Control", "public, max-age=604800");
      return res.status(200).send(svg);
    }

    // Maskable icon for PWA (with safe zone padding)
    if (req.path === "/pwa-icon-maskable.svg") {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0A0E17"/>
      <stop offset="100%" style="stop-color:#111827"/>
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#2FD3C6"/>
      <stop offset="100%" style="stop-color:#6366F1"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <text x="256" y="330" text-anchor="middle" font-family="system-ui,-apple-system,sans-serif" font-size="240" font-weight="900" fill="url(#accent)">B</text>
</svg>`;
      res.setHeader("Content-Type", "image/svg+xml");
      res.setHeader("Cache-Control", "public, max-age=604800");
      return res.status(200).send(svg);
    }

    // Apple touch icon
    if (req.path === "/apple-touch-icon.png" || req.path === "/apple-touch-icon-precomposed.png") {
      const iconPath = path.resolve(process.cwd(), "assets", "images", "icon.png");
      if (fs.existsSync(iconPath)) {
        const iconBuf = fs.readFileSync(iconPath);
        res.setHeader("Content-Type", "image/png");
        res.setHeader("Cache-Control", "public, max-age=604800");
        return res.status(200).send(iconBuf);
      }
    }

    // Offline fallback page
    if (req.path === "/offline.html") {
      const offlineHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Barmagly POS — Offline</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:system-ui,-apple-system,sans-serif;background:#0A0E17;color:#f0f4f8;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:24px}
    .container{max-width:480px}
    .icon{width:80px;height:80px;margin:0 auto 24px;border-radius:20px;background:rgba(47,211,198,.1);border:1px solid rgba(47,211,198,.3);display:flex;align-items:center;justify-content:center;font-size:36px}
    h1{font-size:1.8rem;font-weight:800;margin-bottom:12px;background:linear-gradient(135deg,#2FD3C6,#6366F1);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
    p{color:#7b8fa6;font-size:1rem;line-height:1.7;margin-bottom:32px}
    button{padding:14px 32px;border-radius:12px;border:none;background:#2FD3C6;color:#000;font-size:1rem;font-weight:700;cursor:pointer;transition:all .3s}
    button:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(47,211,198,.3)}
    .pulse{animation:pulse 2s infinite}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">📡</div>
    <h1>You're Offline</h1>
    <p>It seems you've lost your internet connection. Barmagly POS needs an internet connection to process transactions and sync data. Please check your connection and try again.</p>
    <button onclick="window.location.reload()">🔄 Try Again</button>
    <p style="margin-top:24px;font-size:.8rem" class="pulse">Waiting for connection...</p>
  </div>
  <script>window.addEventListener('online',()=>window.location.reload())</script>
</body>
</html>`;
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(200).send(offlineHtml);
    }

    // Enhanced service worker for PWA
    if (req.path === "/sw.js") {
      const sw = `
const CACHE_VERSION = 'barmagly-pos-v3';
const STATIC_CACHE = CACHE_VERSION + '-static';
const DYNAMIC_CACHE = CACHE_VERSION + '-dynamic';

const PRECACHE_URLS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/pwa-icon-192.svg',
  '/pwa-icon-512.svg',
  '/favicon.ico'
];

// Install: pre-cache essential assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
            .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: network-first for API, cache-first for static
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET and cross-origin
  if (event.request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  // API requests: network only (don't cache)
  if (url.pathname.startsWith('/api/')) return;

  // HTML pages: network-first with offline fallback
  if (event.request.mode === 'navigate' || event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(DYNAMIC_CACHE).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() =>
          caches.match(event.request)
            .then(cached => cached || caches.match('/offline.html'))
        )
    );
    return;
  }

  // Static assets: cache-first, network fallback
  event.respondWith(
    caches.match(event.request)
      .then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(DYNAMIC_CACHE).then(cache => cache.put(event.request, clone));
          }
          return response;
        });
      })
      .catch(() => {
        // Return offline page for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('/offline.html');
        }
      })
  );
});

// Handle messages from client
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
`;
      res.setHeader("Content-Type", "application/javascript");
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Service-Worker-Allowed", "/");
      return res.status(200).send(sw);
    }

    // Inject PWA tags into the main app index.html for installability
    // /pos → redirect to the POS app at root
    if (req.path === "/pos") {
      return res.redirect(301, "/");
    }

    if (req.path === "/" || req.path === "/index.html") {
      const indexPath = path.resolve(process.cwd(), "static-build", "index.html");
      if (fs.existsSync(indexPath)) {
        let html = fs.readFileSync(indexPath, "utf-8");
        html = injectPWATags(html);
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        return res.status(200).send(html);
      }
      return serveLandingPage({ req, res, appName });
    }

    if (req.path.startsWith("/super_admin")) {
      const superAdminTemplatePath = path.resolve(
        process.cwd(),
        "server",
        "templates",
        req.path === "/super_admin/login" ? "super-admin-login.html" : "super-admin-dashboard.html"
      );

      try {
        const superAdminTemplate = fs.readFileSync(superAdminTemplatePath, "utf-8");
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        return res.status(200).send(superAdminTemplate);
      } catch (err) {
        return res.status(404).send("Super Admin Template not found");
      }
    }

    if (req.path === "/dashboard") {
      const dbTemplate = fs.readFileSync(dashboardPath, "utf-8");
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(200).send(dbTemplate);
    }

    const storeByIdMatch = req.path.match(/^\/store\/(\d+)$/);
    if (storeByIdMatch) {
      try {
        const tenantId = parseInt(storeByIdMatch[1], 10);
        const { storage } = await import("./storage");
        const tenant = await storage.getTenant(tenantId);
        if (!tenant) {
          return res.status(404).send("<h1>Store not found</h1>");
        }
        const config = await storage.getLandingPageConfig(tenantId);
        const storePath = path.resolve(process.cwd(), "server", "templates", "restaurant-store.html");
        let html = fs.readFileSync(storePath, "utf-8");
        const slug = config?.slug || `tenant-${tenantId}`;
        html = html.replace(/\{\{SLUG\}\}/g, slug);
        html = html.replace(/\{\{TENANT_ID\}\}/g, String(tenantId));
        html = html.replace(/\{\{PRIMARY_COLOR\}\}/g, config?.primaryColor || "#2FD3C6");
        html = html.replace(/\{\{ACCENT_COLOR\}\}/g, config?.accentColor || "#6366F1");
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        return res.status(200).send(html);
      } catch (err) {
        console.error("[store/:tenantId] Error:", err);
        return res.status(500).send("<h1>Server error</h1>");
      }
    }

    if (req.path !== "/landing" && req.path !== "/manifest") {
      return next();
    }

    const platform = req.header("expo-platform");
    if (platform && (platform === "ios" || platform === "android")) {
      return serveExpoManifest(platform, res);
    }

    if (req.path === "/landing") {
      return serveLandingPage({
        req,
        res,
        appName,
      });
    }

    next();
  });

  app.use("/assets", express.static(path.resolve(process.cwd(), "assets")));
  app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));
  app.use("/objects", express.static(path.resolve(process.cwd(), "uploads")));
  app.use(express.static(path.resolve(process.cwd(), "static-build")));

  log("Expo routing: Checking expo-platform header on / and /manifest");
}

function setupErrorHandler(app: express.Application) {
  app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
    const error = err as {
      status?: number;
      statusCode?: number;
      message?: string;
    };

    const status = error.status || error.statusCode || 500;
    const message = error.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });
}

async function initStripe() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    log('DATABASE_URL not set, skipping Stripe init');
    return;
  }

  try {
    log('Initializing Stripe schema...');
    await runMigrations({ databaseUrl, schema: 'stripe' });
    log('Stripe schema ready');

    const stripeSync = await getStripeSync();
    const secretKey = await getStripeSecretKey();

    if (!secretKey || secretKey.includes('dummy')) {
      log('Stripe: Dummy or missing key detected. Skipping webhook setup and sync.');
      return;
    }

    log('Setting up managed webhook...');
    const webhookBaseUrl = `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`;
    const webhookResult = await stripeSync.findOrCreateManagedWebhook(
      `${webhookBaseUrl}/api/stripe/webhook`
    );
    log(`Webhook configured: ${webhookResult?.webhook?.url || 'ready'}`);

    log('Syncing Stripe data...');
    stripeSync.syncBackfill()
      .then(() => log('Stripe data synced'))
      .catch((err: any) => log('Error syncing Stripe data:', err));
  } catch (error) {
    log('Failed to initialize Stripe:', error);
  }
}

function setupStripeWebhook(app: express.Application) {
  app.post(
    '/api/stripe/webhook',
    express.raw({ type: 'application/json' }),
    async (req, res) => {
      const signature = req.headers['stripe-signature'];
      if (!signature) {
        return res.status(400).json({ error: 'Missing stripe-signature' });
      }

      try {
        const sig = Array.isArray(signature) ? signature[0] : signature;
        if (!Buffer.isBuffer(req.body)) {
          return res.status(500).json({ error: 'Webhook processing error' });
        }
        await WebhookHandlers.processWebhook(req.body as Buffer, sig);
        res.status(200).json({ received: true });
      } catch (error: any) {
        log('Webhook error:', error.message);
        res.status(400).json({ error: 'Webhook processing error' });
      }
    }
  );
}

function setupStripeRoutes(app: express.Application) {
  app.get('/api/stripe/publishable-key', async (_req, res) => {
    try {
      const key = await getStripePublishableKey();
      res.json({ publishableKey: key });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/stripe/create-payment-intent', async (req, res) => {
    try {
      const { amount, currency = 'chf', metadata } = req.body;
      if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'Valid amount is required' });
      }
      const stripe = await getUncachableStripeClient();
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount),
        currency,
        metadata: metadata || {},
        automatic_payment_methods: { enabled: true },
      });
      res.json({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/stripe/confirm-payment', async (req, res) => {
    try {
      const { paymentIntentId } = req.body;
      if (!paymentIntentId) {
        return res.status(400).json({ error: 'paymentIntentId is required' });
      }
      const stripe = await getUncachableStripeClient();
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      res.json({
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/stripe/payment-methods', async (_req, res) => {
    try {
      res.json({
        methods: ['card'],
        supportedCards: ['visa', 'mastercard', 'amex'],
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/stripe/pos-charge', async (req, res) => {
    try {
      const { amount, currency = 'chf', token, metadata } = req.body;
      if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'Valid amount is required' });
      }
      if (!token) {
        return res.status(400).json({ error: 'Payment token is required' });
      }
      const stripe = await getUncachableStripeClient();
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount),
        currency,
        payment_method_data: {
          type: 'card',
          card: { token },
        },
        confirm: true,
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'never',
        },
        metadata: metadata || {},
      });
      res.json({
        success: paymentIntent.status === 'succeeded',
        status: paymentIntent.status,
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
      });
    } catch (e: any) {
      const errorMsg = e.type === 'StripeCardError'
        ? e.message
        : e.message || 'Payment processing failed';
      res.status(e.statusCode || 500).json({ error: errorMsg, code: e.code });
    }
  });
}

let paymentGatewayConfig: any = {
  enabledMethods: ["cash", "card", "mobile", "nfc"],
  stripe: {
    enabled: true,
    mode: "test",
    currency: "chf",
    autoCapture: true,
  },
  nfc: {
    enabled: true,
    provider: "stripe_tap",
  },
  cash: {
    enabled: true,
    requireExactAmount: false,
  },
  mobile: {
    enabled: true,
    providers: ["twint", "apple_pay", "google_pay"],
  },
};

function setupPaymentGatewayRoutes(app: express.Application) {
  app.get('/api/payment-gateway/config', async (_req, res) => {
    try {
      let stripeStatus = "disconnected";
      let stripeMode = "test";
      try {
        const key = await getStripePublishableKey();
        if (key) {
          stripeStatus = "connected";
          stripeMode = key.startsWith("pk_live") ? "live" : "test";
        }
      } catch { }
      res.json({
        ...paymentGatewayConfig,
        stripe: {
          ...paymentGatewayConfig.stripe,
          status: stripeStatus,
          mode: stripeMode,
        },
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.put('/api/payment-gateway/config', async (req, res) => {
    try {
      const updates = req.body;
      paymentGatewayConfig = { ...paymentGatewayConfig, ...updates };
      res.json(paymentGatewayConfig);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/payment-gateway/test-stripe', async (_req, res) => {
    try {
      const stripe = await getUncachableStripeClient();
      const balance = await stripe.balance.retrieve();
      const key = await getStripePublishableKey();
      res.json({
        success: true,
        mode: key.startsWith("pk_live") ? "live" : "test",
        currency: balance.available?.[0]?.currency || "chf",
        available: balance.available?.map((b: any) => ({ amount: b.amount, currency: b.currency })),
      });
    } catch (e: any) {
      res.json({ success: false, error: e.message });
    }
  });
}

(async () => {
  setupCors(app);

  setupStripeWebhook(app);

  setupBodyParsing(app);
  setupRequestLogging(app);

  app.use(tenantAuthMiddleware());

  setupStripeRoutes(app);
  setupPaymentGatewayRoutes(app);

  await initStripe();

  // Ensure platform tables exist (idempotent)
  try {
    const { pool } = await import("./db");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS platform_settings (
        id SERIAL PRIMARY KEY,
        key TEXT NOT NULL UNIQUE,
        value TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS platform_commissions (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        order_id INTEGER,
        sale_total DECIMAL(12,2) NOT NULL,
        commission_rate DECIMAL(5,2) NOT NULL,
        commission_amount DECIMAL(12,2) NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    log("Platform tables ready");
  } catch (err) {
    log("Error ensuring platform tables:", err);
  }

  // Ensure super admin exists (no demo tenants)
  try {
    const { storage } = await import("./storage");
    const adminEmail = "admin@barmagly.com";
    const existingAdmin = await storage.getSuperAdminByEmail(adminEmail);
    if (!existingAdmin) {
      await storage.createSuperAdmin({
        name: "Super Admin",
        email: adminEmail,
        passwordHash: "$2b$10$OoKOgYj3UlErVOmwqm4rnOpZLdqpLDF3zBiO4VuXJQa56F0DLlesK",
        role: "super_admin",
        isActive: true,
      });
      log("Super admin created");
    }
  } catch (err) {
    log("Error creating super admin:", err);
  }

  // Seed only Pizza Lemon store (no demo data auto-created)
  try {
    const { seedPizzaLemon } = await import("./seedPizzaLemon");
    await seedPizzaLemon();
  } catch (err) {
    log("Error seeding Pizza Lemon data:", err);
  }

  configureExpoAndLanding(app);

  registerSuperAdminRoutes(app);
  const server = await registerRoutes(app);

  // Initialize Caller ID Service with WebSocket Support
  await callerIdService.init(server);

  setupErrorHandler(app);

  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(
    {
      port,
      host: "0.0.0.0",
    },
    () => {
      log(`express server serving on port ${port}`);
    },
  ).on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      log(`[ERROR] Port ${port} is already in use.`);
      log(`Try running: npx kill-port ${port}`);
      process.exit(1);
    } else {
      throw err;
    }
  });
})();
