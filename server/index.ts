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
      const indexPath = path.resolve(process.cwd(), "dist", "index.html");
      if (fs.existsSync(indexPath)) {
        const html = fs.readFileSync(indexPath, "utf-8");
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

  // SPA catch-all: serve index.html for any unmatched route under /app
  const staticIndexPath = path.resolve(process.cwd(), "dist", "index.html");
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
