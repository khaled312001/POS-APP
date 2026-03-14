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

// Security and Cross-Origin Headers
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  next();
});

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
      origins.add(`https://${process.env.REPLIT_DEV_DOMAIN}:5000`);
      origins.add(`https://${process.env.REPLIT_DEV_DOMAIN}:8080`);
      origins.add(`https://${process.env.REPLIT_DEV_DOMAIN}:3000`);
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


  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
}

/**
 * Injects PWA meta tags, manifest, service worker, and a custom install dialog.
 */
function injectPWATags(html: string): string {
  if (html.includes('__pwa_injected__')) return html;

  const pwaHead = `
  <!-- PWA -->
  <link rel="manifest" href="/manifest.json">
  <meta name="theme-color" content="#2FD3C6">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-title" content="Barmagly POS">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  <meta name="msapplication-TileColor" content="#0A0E17">
  <meta name="msapplication-tap-highlight" content="no">
  <!-- __pwa_injected__ -->
  <style>
    /* ── PWA Install Dialog ── */
    #pwa-dialog-overlay {
      display: none; position: fixed; inset: 0; z-index: 999999;
      background: rgba(0,0,0,0.55); backdrop-filter: blur(6px);
      align-items: flex-end; justify-content: center;
      padding: 0 0 0 0;
      animation: pwa-fade-in 0.25s ease;
    }
    #pwa-dialog-overlay.open { display: flex; }
    @keyframes pwa-fade-in { from{opacity:0} to{opacity:1} }
    #pwa-dialog {
      background: #13172A;
      border: 1px solid rgba(47,211,198,0.2);
      border-radius: 24px 24px 0 0;
      padding: 28px 24px 36px;
      width: 100%; max-width: 480px;
      box-shadow: 0 -20px 60px rgba(0,0,0,0.5);
      animation: pwa-slide-up 0.35s cubic-bezier(0.34,1.56,0.64,1);
      position: relative;
    }
    @keyframes pwa-slide-up { from{transform:translateY(100%)} to{transform:translateY(0)} }
    #pwa-dialog-close {
      position: absolute; top: 16px; right: 18px;
      background: rgba(255,255,255,0.08); border: none; color: #94a3b8;
      width: 30px; height: 30px; border-radius: 50%; cursor: pointer;
      font-size: 16px; display: flex; align-items: center; justify-content: center;
      transition: background 0.2s;
    }
    #pwa-dialog-close:hover { background: rgba(255,255,255,0.15); }
    .pwa-header { display: flex; align-items: center; gap: 14px; margin-bottom: 18px; }
    .pwa-icon {
      width: 58px; height: 58px; border-radius: 14px; flex-shrink: 0;
      background: linear-gradient(135deg,#0A0E17,#1a1f35);
      border: 1px solid rgba(47,211,198,0.3);
      display: flex; align-items: center; justify-content: center;
      font-size: 28px;
    }
    .pwa-title { font-family: system-ui,-apple-system,sans-serif; }
    .pwa-title h2 { margin:0 0 4px; font-size:18px; font-weight:800; color:#f0f4f8; }
    .pwa-title p  { margin:0; font-size:13px; color:#64748b; }
    .pwa-preview {
      width: 100%; height: 130px; border-radius: 14px; overflow: hidden;
      background: linear-gradient(135deg,#0d1120,#1a1f35);
      border: 1px solid rgba(255,255,255,0.07);
      margin-bottom: 18px; display: flex; align-items: center; justify-content: center;
      position: relative;
    }
    .pwa-preview-bar {
      position: absolute; top: 0; left: 0; right: 0; height: 28px;
      background: rgba(0,0,0,0.4); display: flex; align-items: center;
      gap: 5px; padding: 0 10px;
    }
    .pwa-preview-dot { width: 8px; height: 8px; border-radius: 50%; }
    .pwa-preview-content {
      display: flex; flex-direction: column; align-items: center;
      gap: 8px; margin-top: 20px;
    }
    .pwa-preview-logo {
      font-size: 22px; font-weight: 900; letter-spacing: -1px;
      background: linear-gradient(135deg,#2FD3C6,#6366F1);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .pwa-preview-bars { display: flex; flex-direction: column; gap: 4px; width: 120px; }
    .pwa-preview-bar-item {
      height: 6px; border-radius: 3px;
      background: linear-gradient(90deg,rgba(47,211,198,0.4),rgba(99,102,241,0.2));
    }
    .pwa-benefits { list-style: none; margin: 0 0 22px; padding: 0; display: flex; flex-direction: column; gap: 10px; }
    .pwa-benefits li {
      display: flex; align-items: center; gap: 10px;
      font-size: 14px; color: #cbd5e1; font-family: system-ui,-apple-system,sans-serif;
    }
    .pwa-benefits li::before {
      content: '✓'; display: flex; align-items: center; justify-content: center;
      width: 22px; height: 22px; border-radius: 50%;
      background: rgba(47,211,198,0.15); color: #2FD3C6;
      font-size: 12px; font-weight: 800; flex-shrink: 0;
    }
    .pwa-actions { display: flex; gap: 10px; }
    .pwa-btn-install {
      flex: 1; padding: 14px; border: none; border-radius: 14px; cursor: pointer;
      background: linear-gradient(135deg,#2FD3C6,#6366F1);
      color: #fff; font-size: 15px; font-weight: 700;
      font-family: system-ui,-apple-system,sans-serif;
      transition: opacity 0.2s, transform 0.15s;
    }
    .pwa-btn-install:hover { opacity: 0.9; transform: translateY(-1px); }
    .pwa-btn-later {
      padding: 14px 20px; border-radius: 14px; cursor: pointer;
      background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
      color: #94a3b8; font-size: 14px; font-weight: 600;
      font-family: system-ui,-apple-system,sans-serif;
      transition: background 0.2s;
    }
    .pwa-btn-later:hover { background: rgba(255,255,255,0.1); }

    /* iOS install banner (Safari doesn't support beforeinstallprompt) */
    #pwa-ios-banner {
      display: none; position: fixed; bottom: 0; left: 0; right: 0; z-index: 999998;
      background: #13172A; border-top: 1px solid rgba(47,211,198,0.2);
      padding: 14px 20px 24px; box-shadow: 0 -8px 30px rgba(0,0,0,0.4);
      font-family: system-ui,-apple-system,sans-serif;
    }
    #pwa-ios-banner.show { display: block; }
    .pwa-ios-text { font-size: 13px; color: #94a3b8; line-height: 1.6; text-align: center; }
    .pwa-ios-text strong { color: #2FD3C6; }
    .pwa-ios-close {
      position: absolute; top: 10px; right: 14px; background: none; border: none;
      color: #64748b; font-size: 18px; cursor: pointer;
    }
  </style>`;

  const pwaBody = `
  <!-- PWA Install Dialog -->
  <div id="pwa-dialog-overlay">
    <div id="pwa-dialog" role="dialog" aria-modal="true" aria-labelledby="pwa-dialog-title">
      <button id="pwa-dialog-close" aria-label="Close">✕</button>

      <div class="pwa-header">
        <div class="pwa-icon">⚡</div>
        <div class="pwa-title">
          <h2 id="pwa-dialog-title">Install Barmagly POS</h2>
          <p>Add to your desktop — works offline</p>
        </div>
      </div>

      <div class="pwa-preview" aria-hidden="true">
        <div class="pwa-preview-bar">
          <div class="pwa-preview-dot" style="background:#ff5f57"></div>
          <div class="pwa-preview-dot" style="background:#febc2e"></div>
          <div class="pwa-preview-dot" style="background:#28c840"></div>
        </div>
        <div class="pwa-preview-content">
          <div class="pwa-preview-logo">Barmagly POS</div>
          <div class="pwa-preview-bars">
            <div class="pwa-preview-bar-item" style="width:100%"></div>
            <div class="pwa-preview-bar-item" style="width:75%;background:linear-gradient(90deg,rgba(99,102,241,0.4),rgba(47,211,198,0.2))"></div>
            <div class="pwa-preview-bar-item" style="width:55%"></div>
          </div>
        </div>
      </div>

      <ul class="pwa-benefits">
        <li>Works offline — access your POS anytime</li>
        <li>Faster load times, native app experience</li>
        <li>Quick access from your desktop or home screen</li>
        <li>No App Store needed — install directly</li>
      </ul>

      <div class="pwa-actions">
        <button class="pwa-btn-install" id="pwa-install-btn">Install App</button>
        <button class="pwa-btn-later" id="pwa-later-btn">Not Now</button>
      </div>
    </div>
  </div>

  <!-- iOS Safari install hint -->
  <div id="pwa-ios-banner">
    <button class="pwa-ios-close" id="pwa-ios-close">✕</button>
    <p class="pwa-ios-text">
      To install <strong>Barmagly POS</strong> on your iPhone:<br>
      Tap the <strong>Share</strong> button ↑ then <strong>"Add to Home Screen"</strong>
    </p>
  </div>

  <script>
  (function(){
    var STORAGE_KEY = 'pwa_dismissed_v2';
    var dismissed = localStorage.getItem(STORAGE_KEY);
    var deferredPrompt = null;
    var overlay = document.getElementById('pwa-dialog-overlay');
    var installBtn = document.getElementById('pwa-install-btn');
    var laterBtn = document.getElementById('pwa-later-btn');
    var closeBtn = document.getElementById('pwa-dialog-close');
    var iosBanner = document.getElementById('pwa-ios-banner');
    var iosClose = document.getElementById('pwa-ios-close');

    function isIOS() {
      return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
    }
    function isInStandaloneMode() {
      return window.matchMedia('(display-mode: standalone)').matches ||
             window.navigator.standalone === true;
    }
    function dismissDialog() {
      if (overlay) overlay.classList.remove('open');
      localStorage.setItem(STORAGE_KEY, '1');
    }
    function dismissIOS() {
      if (iosBanner) iosBanner.classList.remove('show');
      localStorage.setItem(STORAGE_KEY, '1');
    }

    // Register service worker
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', function() {
        navigator.serviceWorker.register('/sw.js', { scope: '/' })
          .then(function(reg) {
            console.log('[PWA] SW registered:', reg.scope);
            setInterval(function(){ reg.update(); }, 3600000);
          })
          .catch(function(err){ console.warn('[PWA] SW failed:', err); });
      });
    }

    // Handle Android/Chrome/Edge install prompt
    window.addEventListener('beforeinstallprompt', function(e) {
      e.preventDefault();
      deferredPrompt = e;
      if (!dismissed && !isInStandaloneMode()) {
        setTimeout(function(){ if (overlay) overlay.classList.add('open'); }, 2500);
      }
    });

    if (installBtn) {
      installBtn.addEventListener('click', function() {
        if (deferredPrompt) {
          deferredPrompt.prompt();
          deferredPrompt.userChoice.then(function(result) {
            console.log('[PWA] Install:', result.outcome);
            deferredPrompt = null;
            dismissDialog();
          });
        }
      });
    }
    if (laterBtn) laterBtn.addEventListener('click', dismissDialog);
    if (closeBtn) closeBtn.addEventListener('click', dismissDialog);

    // Close on overlay click
    if (overlay) {
      overlay.addEventListener('click', function(e) {
        if (e.target === overlay) dismissDialog();
      });
    }

    // iOS Safari hint
    if (isIOS() && !isInStandaloneMode() && !dismissed) {
      setTimeout(function(){ if (iosBanner) iosBanner.classList.add('show'); }, 3000);
    }
    if (iosClose) iosClose.addEventListener('click', dismissIOS);

    // Track appinstalled
    window.addEventListener('appinstalled', function() {
      console.log('[PWA] App installed successfully');
      dismissDialog();
      deferredPrompt = null;
    });

    // Keyboard: Escape closes dialog
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') { dismissDialog(); dismissIOS(); }
    });
  })();
  </script>`;

  html = html.replace('</head>', pwaHead + '\n</head>');
  html = html.replace('</body>', pwaBody + '\n</body>');
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
    if (req.path === "/manifest.json" || req.path === "/app/manifest.json") {
      const forwardedProto = req.header("x-forwarded-proto");
      const protocol = forwardedProto || req.protocol || "https";
      const forwardedHost = req.header("x-forwarded-host");
      const host = forwardedHost || req.get("host");
      const origin = `${protocol}://${host}`;
      const manifest = {
        name: "Barmagly POS",
        short_name: "Barmagly",
        description: "Cloud-powered Point of Sale system for modern restaurants, cafés, and retail stores. Multi-branch, multi-language, Stripe payments, inventory, CRM and more.",
        start_url: "/app",
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
            url: "/super-admin/login",
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
    // /pos → redirect to the POS app at /app
    if (req.path === "/pos") {
      return res.redirect(301, "/app");
    }

    if (req.path === "/" || req.path === "/index.html") {
      return serveLandingPage({ req, res, appName });
    }

    if (req.path === "/app" || req.path === "/app/" || req.path === "/app/index.html") {
      const indexPath = path.resolve(process.cwd(), "dist", "index.html");
      if (fs.existsSync(indexPath)) {
        let html = fs.readFileSync(indexPath, "utf-8");
        html = injectPWATags(html);
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        return res.status(200).send(html);
      }
    }

    if (req.path.startsWith("/super_admin")) {
      return res.redirect(301, req.url.replace("/super_admin", "/super-admin"));
    }

    if (req.path.startsWith("/super-admin")) {
      const superAdminTemplatePath = path.resolve(
        process.cwd(),
        "server",
        "templates",
        req.path === "/super-admin/login" ? "super-admin-login.html" : "super-admin-dashboard.html"
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
  app.use("/app", express.static(path.resolve(process.cwd(), "dist")));
  app.use(express.static(path.resolve(process.cwd(), "static-build")));

  // SPA catch-all: serve index.html with PWA tags for any unmatched route under /app
  // This ensures /app/intro, /app/login, /app/license-gate etc. all get the PWA install dialog
  const staticIndexPath = path.resolve(process.cwd(), "dist", "index.html");
  app.get("/app/{*splat}", (req: Request, res: Response, next: NextFunction) => {
    if (
      req.path.includes(".") // static files with extensions
    ) {
      return next();
    }
    if (fs.existsSync(staticIndexPath)) {
      let html = fs.readFileSync(staticIndexPath, "utf-8");
      html = injectPWATags(html);
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(200).send(html);
    }
    next();
  });

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
    await runMigrations({ databaseUrl });
    log('Stripe schema ready');

    let stripeSync, secretKey;
    try {
      stripeSync = await getStripeSync();
      secretKey = await getStripeSecretKey();
    } catch (connErr: any) {
      log('Stripe connection not available, skipping:', connErr?.message || connErr);
      return;
    }

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
  } catch (error: any) {
    log('Stripe init skipped:', error?.message || error);
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
        } as any,
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

  configureExpoAndLanding(app);

  registerSuperAdminRoutes(app);
  const server = await registerRoutes(app);

  setupErrorHandler(app);

  const isProduction = process.env.NODE_ENV === 'production';
  const port = parseInt(process.env.PORT || (isProduction ? "8081" : "5000"), 10);

  await new Promise<void>((resolve, reject) => {
    server.listen({ port, host: "0.0.0.0" }, () => {
      log(`express server serving on port ${port}`);
      resolve();
    }).on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        log(`[ERROR] Port ${port} is already in use.`);
        process.exit(1);
      } else {
        reject(err);
      }
    });
  });

  // --- Deferred initialization (after port is open) ---

  await callerIdService.init(server);

  initStripe().catch(err => log('Stripe init error (non-fatal):', err));

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

  try {
    const { seedPizzaLemon } = await import("./seedPizzaLemon");
    await seedPizzaLemon();
  } catch (err) {
    log("Error seeding Pizza Lemon data:", err);
  }

  if (!isProduction) {
    const http = await import('http');
    const expoPort = 8080;
    const proxy = http.createServer((req, res) => {
      const targetPort = (req.url || '').startsWith('/api') ? port : expoPort;
      const options = {
        hostname: '127.0.0.1',
        port: targetPort,
        path: req.url,
        method: req.method,
        headers: req.headers,
      };
      const proxyReq = http.request(options, (proxyRes) => {
        res.writeHead(proxyRes.statusCode || 500, proxyRes.headers);
        proxyRes.pipe(res, { end: true });
      });
      proxyReq.on('error', () => {
        res.writeHead(502);
        res.end('Backend not ready');
      });
      req.pipe(proxyReq, { end: true });
    });
    proxy.listen(8081, '0.0.0.0', () => {
      log(`proxy on port 8081 → Expo:${expoPort} (API→${port}) (default preview)`);
    });
  }
})();
