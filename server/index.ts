import express from "express";
import type { Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { registerSuperAdminRoutes } from "./superAdminRoutes";
import { tenantAuthMiddleware } from "./tenantAuth";
import { callerIdService } from "./callerIdService";
import { whatsappService } from "./whatsappService";
import { runMigrations } from "stripe-replit-sync";
import { getStripeSync, getStripePublishableKey, getUncachableStripeClient, getStripeSecretKey } from "./stripeClient";
import { WebhookHandlers } from "./webhookHandlers";
import * as fs from "fs";
import * as path from "path";

const usingMySql = Boolean(process.env.MYSQL_HOST || process.env.MYSQL_DATABASE);

// Only synthesize Neon/Postgres settings when the app is not running in MySQL mode.
if (!usingMySql) {
  if (process.env.PGHOST && process.env.PGHOST.includes("neon.tech")) {
    // Build a complete, reliable Neon connection string from individual PG vars
    const neonUrl = `postgresql://${process.env.PGUSER}:${process.env.PGPASSWORD}@${process.env.PGHOST}:${process.env.PGPORT || 5432}/${process.env.PGDATABASE || "neondb"}?sslmode=require`;
    process.env.DATABASE_URL = neonUrl;
    process.env.NEON_DATABASE_URL = neonUrl;
  } else if (process.env.NEON_DATABASE_URL) {
    // NEON_DATABASE_URL may be missing the database name — append "neondb" if needed
    let neonUrl = process.env.NEON_DATABASE_URL;
    if (!neonUrl.match(/neon\.tech\/\w+/)) {
      neonUrl = neonUrl.replace(/\/$/, "") + "/neondb?sslmode=require";
      process.env.NEON_DATABASE_URL = neonUrl;
    }
    process.env.DATABASE_URL = neonUrl;
  }
}

const app = express();
const log = console.log;

// Security and Cross-Origin Headers
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'unsafe-none');
  next();
});

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

function setupCors(app: express.Application) {
  app.use((req, res, next) => {
    const origins = new Set<string>([
      "https://pos.barmagly.tech",
    ]);

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
      limit: "10mb",
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

    // /pos → redirect to the POS app at /app
    if (req.path === "/pos") {
      return res.redirect(301, "/app");
    }

    if (req.path === "/" || req.path === "/index.html") {
      return serveLandingPage({ req, res, appName });
    }

    if (req.path === "/app" || req.path === "/app/" || req.path === "/app/index.html") {
      // post-export.js places the Expo app at dist/app/index.html
      const appIndexPath = path.resolve(process.cwd(), "dist", "app", "index.html");
      const fallbackPath = path.resolve(process.cwd(), "dist", "index.html");
      const indexPath = fs.existsSync(appIndexPath) ? appIndexPath : fallbackPath;
      if (fs.existsSync(indexPath)) {
        const html = fs.readFileSync(indexPath, "utf-8");
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        return res.status(200).send(html);
      }
    }

    // Serve service worker with no-cache headers so updates propagate immediately
    if (req.path === "/app/sw.js") {
      // post-export.js places sw.js at dist/app/sw.js
      const swPath = fs.existsSync(path.resolve(process.cwd(), "dist", "app", "sw.js"))
        ? path.resolve(process.cwd(), "dist", "app", "sw.js")
        : path.resolve(process.cwd(), "dist", "sw.js");
      if (fs.existsSync(swPath)) {
        res.setHeader("Content-Type", "application/javascript");
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.setHeader("Service-Worker-Allowed", "/app/");
        return res.sendFile(swPath);
      }
    }

    // Handle both /super_admin and /super-admin (serve directly, no redirect)
    if (req.path.startsWith("/super_admin") || req.path.startsWith("/super-admin")) {
      const isLogin = req.path === "/super_admin/login" || req.path === "/super-admin/login"
        || req.path === "/super_admin" || req.path === "/super-admin";
      const superAdminTemplatePath = path.resolve(
        process.cwd(),
        "server",
        "templates",
        isLogin ? "super-admin-login.html" : "super-admin-dashboard.html"
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

    // ── Delivery App Routes ──────────────────────────────────────────────────
    // Supports both /order/:slug (direct) and /api/order/:slug (Hostinger CDN compatibility)
    const deliveryMatch = req.path.match(/^(?:\/api)?\/order\/([^/]+)(\/.*)?$/);
    if (deliveryMatch) {
      try {
        const slug = deliveryMatch[1];
        // Detect if request came via /api/ prefix (Hostinger CDN compatibility)
        const isApiPrefixed = req.path.startsWith("/api/");
        const { storage } = await import("./storage");
        const config = await storage.getLandingPageConfigBySlug(slug);
        if (!config) return res.status(404).send("<h1>Store not found</h1>");
        const tenantId = config.tenantId;
        const tenant = await storage.getTenant(tenantId);
        if (!tenant) return res.status(404).send("<h1>Store not found</h1>");

        const deliveryIndexPath = path.resolve(process.cwd(), "delivery-app", "index.html");
        if (!fs.existsSync(deliveryIndexPath)) {
          return res.status(503).send("<h1>Delivery app not yet deployed</h1>");
        }
        let html = fs.readFileSync(deliveryIndexPath, "utf-8");
        const stripeKey = process.env.STRIPE_PUBLISHABLE_KEY || "";
        const configJson = JSON.stringify({
          slug,
          tenantId,
          basePath: isApiPrefixed ? "/api" : "",
          primaryColor: (config as any).primaryColor || "#FF5722",
          accentColor: (config as any).accentColor || "#2FD3C6",
          currency: (tenant as any).currency || process.env.DEFAULT_CURRENCY || "EGP",
          language: (config as any).language || "en",
          storeName: config.storeName || (config as any).name || tenant.name,
          logo: (config as any).logo || config.logoUrl || "",
          phone: config.phone || "",
          supportPhone: (config as any).supportPhone || config.phone || "",
          phonePlaceholder: (config as any).phonePlaceholder || "",
          minDeliveryTime: (config as any).minDeliveryTime || 20,
          maxDeliveryTime: (config as any).maxDeliveryTime || 45,
          enableLoyalty: (config as any).enableLoyalty ?? true,
          enableWallet: (config as any).enableWallet ?? false,
          enableScheduledOrders: (config as any).enableScheduledOrders ?? true,
          stripePublishableKey: stripeKey,
          defaultLat: (config as any).defaultLat || null,
          defaultLng: (config as any).defaultLng || null,
          coverImage: (config as any).coverImage || (config as any).headerBgImage || "",
          metaTitle: (config as any).metaTitle || "",
          metaDescription: (config as any).metaDescription || "",
        });
        html = html.replace("__DELIVERY_CONFIG__", configJson);
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        return res.status(200).send(html);
      } catch (err) {
        console.error("[delivery/order/:slug] Error:", err);
        return res.status(500).send("<h1>Server error</h1>");
      }
    }

    // Multi-restaurant discovery page
    if (req.path === "/restaurants" || req.path === "/restaurants/" || req.path === "/api/restaurants" || req.path === "/api/restaurants/") {
      try {
        const { storage } = await import("./storage");
        const restaurantsIndexPath = path.resolve(process.cwd(), "delivery-app", "restaurants.html");
        if (!fs.existsSync(restaurantsIndexPath)) {
          return res.status(503).send("<h1>Restaurants page not yet deployed</h1>");
        }
        let html = fs.readFileSync(restaurantsIndexPath, "utf-8");
        // Inject minimal global config (no tenant-specific slug)
        const configJson = JSON.stringify({
          storeName: "Barmagly Delivery",
          currency: process.env.DEFAULT_CURRENCY || "EGP",
          language: req.query.lang || "en",
          stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY || "",
          primaryColor: "#FF5722",
          accentColor: "#2FD3C6",
          tenantId: null,
          slug: null,
        });
        html = html.replace("__DELIVERY_CONFIG__", configJson);
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        return res.status(200).send(html);
      } catch (err) {
        console.error("[/restaurants] Error:", err);
        return res.status(500).send("<h1>Server error</h1>");
      }
    }

    // Driver PWA
    const driverMatch = req.path.match(/^(?:\/api)?\/driver\/([^/]+)$/);
    if (driverMatch) {
      const driverIndexPath = path.resolve(process.cwd(), "delivery-app", "driver", "index.html");
      if (!fs.existsSync(driverIndexPath)) {
        return res.status(503).send("<h1>Driver app not yet deployed</h1>");
      }
      const html = fs.readFileSync(driverIndexPath, "utf-8");
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(200).send(html);
    }

    // Public tracking page
    const trackMatch = req.path.match(/^(?:\/api)?\/track\/([^/]+)$/);
    if (trackMatch) {
      const trackIndexPath = path.resolve(process.cwd(), "delivery-app", "track", "index.html");
      if (!fs.existsSync(trackIndexPath)) {
        return res.status(503).send("<h1>Tracking page not yet deployed</h1>");
      }
      const html = fs.readFileSync(trackIndexPath, "utf-8");
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(200).send(html);
    }

    const storeMatch = req.path.match(/^\/store\/(.+)$/);
    if (storeMatch) {
      try {
        const storeParam = storeMatch[1];
        const { storage } = await import("./storage");
        let tenantId: number | undefined;
        let slug: string | undefined;

        // Numeric ID → look up tenant directly
        if (/^\d+$/.test(storeParam)) {
          tenantId = parseInt(storeParam, 10);
          const config = await storage.getLandingPageConfig(tenantId);
          slug = config?.slug || `tenant-${tenantId}`;
        } else {
          // Slug → look up by slug
          slug = storeParam;
          const config = await storage.getLandingPageConfigBySlug(slug);
          if (!config) return res.status(404).send("<h1>Store not found</h1>");
          tenantId = config.tenantId;
        }

        const tenant = await storage.getTenant(tenantId);
        if (!tenant) return res.status(404).send("<h1>Store not found</h1>");

        const config = await storage.getLandingPageConfig(tenantId);
        const storePath = path.resolve(process.cwd(), "server", "templates", "restaurant-store.html");
        let html = fs.readFileSync(storePath, "utf-8");
        html = html.replace(/\{\{SLUG\}\}/g, slug!);
        html = html.replace(/\{\{TENANT_ID\}\}/g, String(tenantId));
        html = html.replace(/\{\{PRIMARY_COLOR\}\}/g, config?.primaryColor || "#2FD3C6");
        html = html.replace(/\{\{ACCENT_COLOR\}\}/g, config?.accentColor || "#6366F1");
        html = html.replace(/\{\{CURRENCY\}\}/g, (tenant as any).currency || "CHF");
        html = html.replace(/\{\{LANGUAGE\}\}/g, config?.language || "en");
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        return res.status(200).send(html);
      } catch (err) {
        console.error("[store/:param] Error:", err);
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

  // ── Delivery App static assets ───────────────────────────────────────────────
  // Served from both /delivery-app/ (local dev) and /api/delivery-app/ (Hostinger CDN)
  const deliveryAppStatic = express.static(path.resolve(process.cwd(), "delivery-app"), {
    index: false, // HTML is served dynamically above
  });
  app.use("/delivery-app", deliveryAppStatic);
  app.use("/api/delivery-app", deliveryAppStatic);

  app.use("/assets", express.static(path.resolve(process.cwd(), "assets")));
  app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));
  app.use("/objects", express.static(path.resolve(process.cwd(), "uploads")));
  app.use("/sounds", express.static(path.resolve(process.cwd(), "public", "sounds")));
  // Serve project icon assets at the /app/assets/images path so the PWA manifest icons resolve
  app.use("/app/assets/images", express.static(path.resolve(process.cwd(), "assets", "images")));

  // post-export.js places the Expo app bundle at dist/app/, so serve /app from dist/app/
  // Fall back to dist/ root for dev builds that haven't run post-export
  const appDistDir = fs.existsSync(path.resolve(process.cwd(), "dist", "app"))
    ? path.resolve(process.cwd(), "dist", "app")
    : path.resolve(process.cwd(), "dist");
  app.use("/app", express.static(appDistDir, {
    setHeaders(res, filePath) {
      if (filePath.endsWith(".webmanifest")) {
        res.setHeader("Content-Type", "application/manifest+json");
      }
      // JS bundles: always revalidate so deploys propagate immediately
      if (filePath.includes("_expo/static/js") || filePath.endsWith(".js")) {
        res.setHeader("Cache-Control", "no-cache, must-revalidate");
      }
    },
  }));
  app.use(express.static(path.resolve(process.cwd(), "static-build")));

  // SPA catch-all: serve index.html for any unmatched route under /app
  const staticIndexPath = fs.existsSync(path.resolve(process.cwd(), "dist", "app", "index.html"))
    ? path.resolve(process.cwd(), "dist", "app", "index.html")
    : path.resolve(process.cwd(), "dist", "index.html");
  app.get("/app/{*splat}", (req: Request, res: Response, next: NextFunction) => {
    if (req.path.includes(".")) {
      return next();
    }
    if (fs.existsSync(staticIndexPath)) {
      const html = fs.readFileSync(staticIndexPath, "utf-8");
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
  if (usingMySql) {
    log("MySQL mode detected, skipping Stripe schema sync");
    return;
  }

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
  // Auto-migrate: add language column to landing_page_config if missing
  try {
    const { db } = await import("./db");
    const { sql } = await import("drizzle-orm");
    await db.execute(sql.raw(`ALTER TABLE landing_page_config ADD COLUMN IF NOT EXISTS language text DEFAULT 'en'`));
  } catch (e: any) {
    console.log("[Migration] landing_page_config.language:", e.message);
  }

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

  // Auto-connect WhatsApp if a session exists
  whatsappService.connect().catch((err: any) => log('WhatsApp auto-connect error:', err));

  initStripe().catch(err => log('Stripe init error (non-fatal):', err));

  if (usingMySql) {
    log("MySQL mode active; skipping legacy Postgres-only startup migrations");
  } else {
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

  // ── Schema auto-migration: ensure all required columns and tables exist ──
  try {
    const { pool } = await import("./db");

    // 1. Add is_addon to products if missing
    await pool.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS is_addon boolean NOT NULL DEFAULT false;`);

    // 2. calls — drop if wrong structure (no phone_number column), recreate correctly
    // NOTE: tenant_id is intentionally WITHOUT FK constraint so bridge misconfiguration
    // (e.g. wrong tenantId) doesn't block call recording
    const callsCols = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name='calls'`);
    const callsHasPhone = callsCols.rows.some((r: any) => r.column_name === 'phone_number');
    if (!callsHasPhone) {
      await pool.query(`DROP TABLE IF EXISTS calls CASCADE;`);
      await pool.query(`
        CREATE TABLE calls (
          id serial PRIMARY KEY,
          tenant_id integer,
          branch_id integer,
          phone_number text NOT NULL DEFAULT '',
          customer_id integer,
          status text NOT NULL DEFAULT 'missed',
          sale_id integer,
          created_at timestamp DEFAULT now()
        );
      `);
    } else {
      // Remove FK constraint on calls.tenant_id if it exists (so bridge misconfiguration doesn't block)
      await pool.query(`
        ALTER TABLE calls DROP CONSTRAINT IF EXISTS calls_tenant_id_fkey;
        ALTER TABLE calls DROP CONSTRAINT IF EXISTS calls_branch_id_fkey;
        ALTER TABLE calls DROP CONSTRAINT IF EXISTS calls_customer_id_fkey;
        ALTER TABLE calls DROP CONSTRAINT IF EXISTS calls_sale_id_fkey;
      `);
    }

    // 3. vehicles — drop if wrong structure (no license_plate column), recreate correctly
    const vehiclesCols = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name='vehicles'`);
    const vehiclesHasPlate = vehiclesCols.rows.some((r: any) => r.column_name === 'license_plate');
    if (!vehiclesHasPlate) {
      await pool.query(`DROP TABLE IF EXISTS vehicles CASCADE;`);
      await pool.query(`
        CREATE TABLE vehicles (
          id serial PRIMARY KEY,
          tenant_id integer REFERENCES tenants(id) ON DELETE CASCADE,
          branch_id integer REFERENCES branches(id) ON DELETE CASCADE,
          license_plate text NOT NULL DEFAULT '',
          make text,
          model text,
          color text,
          driver_name text,
          driver_phone text,
          is_active boolean DEFAULT true,
          notes text,
          created_at timestamp DEFAULT now()
        );
      `);
    }

    // 4. printer_configs — drop if wrong structure (no receipt_type column), recreate correctly
    const printerCols = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name='printer_configs'`);
    const printerHasReceiptType = printerCols.rows.some((r: any) => r.column_name === 'receipt_type');
    if (!printerHasReceiptType) {
      await pool.query(`DROP TABLE IF EXISTS printer_configs CASCADE;`);
      await pool.query(`
        CREATE TABLE printer_configs (
          id serial PRIMARY KEY,
          tenant_id integer NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          branch_id integer REFERENCES branches(id) ON DELETE CASCADE,
          receipt_type text NOT NULL DEFAULT 'check_out',
          printer_1 text,
          printer_1_copy boolean DEFAULT false,
          printer_2 text,
          printer_2_copy boolean DEFAULT false,
          paper_size text DEFAULT '80mm',
          is_active boolean DEFAULT true,
          updated_at timestamp DEFAULT now()
        );
      `);
    }

    // 5. daily_closings — drop if wrong structure (no closing_date as text), recreate correctly
    const dailyCols = await pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name='daily_closings'`);
    const dailyHasBranchId = dailyCols.rows.some((r: any) => r.column_name === 'branch_id');
    if (!dailyHasBranchId) {
      await pool.query(`DROP TABLE IF EXISTS daily_closings CASCADE;`);
      await pool.query(`
        CREATE TABLE daily_closings (
          id serial PRIMARY KEY,
          tenant_id integer NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          branch_id integer REFERENCES branches(id) ON DELETE CASCADE,
          employee_id integer REFERENCES employees(id) ON DELETE CASCADE,
          closing_date text NOT NULL DEFAULT '',
          total_sales numeric(12,2) DEFAULT 0,
          total_cash numeric(12,2) DEFAULT 0,
          total_card numeric(12,2) DEFAULT 0,
          total_mobile numeric(12,2) DEFAULT 0,
          total_transactions integer DEFAULT 0,
          total_returns numeric(12,2) DEFAULT 0,
          total_discounts numeric(12,2) DEFAULT 0,
          opening_cash numeric(12,2) DEFAULT 0,
          closing_cash numeric(12,2) DEFAULT 0,
          notes text,
          status text DEFAULT 'closed',
          created_at timestamp DEFAULT now()
        );
      `);
    }

    // 6. monthly_closings — drop if wrong structure (no closing_month as text), recreate correctly
    const monthlyCols = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name='monthly_closings'`);
    const monthlyHasBranchId = monthlyCols.rows.some((r: any) => r.column_name === 'branch_id');
    if (!monthlyHasBranchId) {
      await pool.query(`DROP TABLE IF EXISTS monthly_closings CASCADE;`);
      await pool.query(`
        CREATE TABLE monthly_closings (
          id serial PRIMARY KEY,
          tenant_id integer NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          branch_id integer REFERENCES branches(id) ON DELETE CASCADE,
          employee_id integer REFERENCES employees(id) ON DELETE CASCADE,
          closing_month text NOT NULL DEFAULT '',
          total_sales numeric(12,2) DEFAULT 0,
          total_cash numeric(12,2) DEFAULT 0,
          total_card numeric(12,2) DEFAULT 0,
          total_mobile numeric(12,2) DEFAULT 0,
          total_transactions integer DEFAULT 0,
          total_returns numeric(12,2) DEFAULT 0,
          total_discounts numeric(12,2) DEFAULT 0,
          total_expenses numeric(12,2) DEFAULT 0,
          net_revenue numeric(12,2) DEFAULT 0,
          notes text,
          status text DEFAULT 'closed',
          created_at timestamp DEFAULT now()
        );
      `);
    }

    // vehicle_id column in sales table
    await pool.query(`ALTER TABLE sales ADD COLUMN IF NOT EXISTS vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE SET NULL;`);

    // Fix sale_items.product_id FK: change from CASCADE to SET NULL to preserve sale history when products are re-seeded
    await pool.query(`
      ALTER TABLE sale_items ALTER COLUMN product_id DROP NOT NULL;
      DO $$
      BEGIN
        -- Drop the OLD Drizzle-generated CASCADE constraint (may still exist from initial schema)
        IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sale_items_product_id_products_id_fk') THEN
          ALTER TABLE sale_items DROP CONSTRAINT sale_items_product_id_products_id_fk;
        END IF;
        -- Drop and re-create the SET NULL constraint to ensure correct behavior
        IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sale_items_product_id_fkey') THEN
          ALTER TABLE sale_items DROP CONSTRAINT sale_items_product_id_fkey;
        END IF;
        ALTER TABLE sale_items ADD CONSTRAINT sale_items_product_id_fkey
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;
      END $$;
    `);

    // Fix inventory.product_id FK: ensure it's ON DELETE CASCADE so product re-seeding works
    await pool.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inventory_product_id_products_id_fk') THEN
          ALTER TABLE inventory DROP CONSTRAINT inventory_product_id_products_id_fk;
        END IF;
        ALTER TABLE inventory ADD CONSTRAINT inventory_product_id_products_id_fk
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
      END $$;
    `);

    // Fix inventory.branch_id FK: ensure it's ON DELETE CASCADE
    await pool.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inventory_branch_id_branches_id_fk') THEN
          ALTER TABLE inventory DROP CONSTRAINT inventory_branch_id_branches_id_fk;
        END IF;
        ALTER TABLE inventory ADD CONSTRAINT inventory_branch_id_branches_id_fk
          FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE;
      END $$;
    `);

    // 7. customer extended columns migration
    await pool.query(`
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS customer_nr integer;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS salutation text;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS first_name text;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_name text;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS street text;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS street_nr text;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS house_nr text;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS city text;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS postal_code text;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS company text;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS zhd text;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS how_to_go text;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS screen_info text;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS source text;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS first_order_date text;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_order_date text;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS legacy_total_spent numeric(12,2) DEFAULT 0;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS average_order_value numeric(10,2) DEFAULT 0;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS order_count integer DEFAULT 0;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS legacy_ref text;
    `);
    log("Customer extended columns migration complete");

    log("Schema migration complete");
    } catch (err) {
      log("Schema migration error (non-fatal):", err);
    }
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

  // ── One-time migration fix: backfill NULL tenant_ids ─────────────────────
  try {
    const { db } = await import("./db");
    const { sql } = await import("drizzle-orm");
    const tenantsResult = await db.execute(sql`SELECT id FROM tenants LIMIT 1`);
    const tenantRows = (tenantsResult as any)[0] as any[];
    if (tenantRows && tenantRows.length > 0) {
      const tid = tenantRows[0].id;
      const tenantTables = [
        "products", "categories", "employees", "customers", "branches",
        "inventory", "sales", "sale_items", "expenses", "shifts",
        "notifications", "calls", "purchase_orders", "purchase_order_items",
        "suppliers", "tables", "kitchen_orders", "returns", "return_items",
        "cash_drawer_operations", "warehouses", "warehouse_transfers",
        "product_batches", "inventory_movements", "stock_counts",
        "stock_count_items", "employee_commissions", "daily_closings",
        "monthly_closings",
      ];
      let totalFixed = 0;
      for (const table of tenantTables) {
        try {
          const r = await db.execute(sql.raw(`UPDATE \`${table}\` SET tenant_id = ${tid} WHERE tenant_id IS NULL`));
          const affected = (r as any)[0]?.affectedRows ?? 0;
          if (affected > 0) { log(`[migration] Fixed ${affected} rows in ${table}`); totalFixed += affected; }
        } catch { /* table may not have tenant_id column */ }
      }
      if (totalFixed > 0) log(`[migration] Total tenant_id backfill: ${totalFixed} rows → tenant ${tid}`);
      else log(`[migration] tenant_id backfill: nothing to fix`);
    }
  } catch (err) {
    log("Error during tenant_id backfill:", err);
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
