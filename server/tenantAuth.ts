import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { storage } from "./storage";
import { JWT_SECRET } from "./jwtSecret";

export interface TenantAuthRequest extends Request {
  tenantId?: number;
  licenseKey?: string;
  isSuperAdmin?: boolean;
}

// ── Signed download links ───────────────────────────────────────────────────
// The native app opens exports with Linking.openURL, which cannot send the
// x-license-key header, so those downloads always failed with 401. The app
// first asks POST /api/downloads/link (licence-authenticated) for a URL that
// carries a 5-minute token bound to ONE path and ONE store; tenantAuth
// accepts that token for GET on that path only. Signed with a derived secret
// so it can never pass as an employee or super-admin token (or vice versa).
const DOWNLOAD_SECRET = `${JWT_SECRET}:download-link`;
export const DOWNLOAD_TTL_SECONDS = 300;
export const DOWNLOADABLE_PATHS: RegExp[] = [
  /^\/api\/customers\/export$/,
  /^\/api\/reports\/(sales|inventory|profit|employee-performance)-export$/,
];

export function signDownloadToken(tenantId: number, path: string, employee?: unknown): string {
  return jwt.sign({ typ: "dl", t: tenantId, p: path, emp: employee || undefined }, DOWNLOAD_SECRET, {
    expiresIn: DOWNLOAD_TTL_SECONDS,
  });
}

function verifyDownloadToken(token: string, path: string): { t: number; emp?: any } | null {
  try {
    const c = jwt.verify(token, DOWNLOAD_SECRET) as any;
    if (c?.typ !== "dl" || c.p !== path || !Number.isInteger(c.t) || c.t <= 0) return null;
    return c;
  } catch {
    return null;
  }
}

const PUBLIC_ROUTES = [
  "/api/health",
  "/api/license/validate",
  "/api/auth/google",
  "/api/auth/plan-status",         // plans page: signed plan token, see planSignup.ts
  "/api/landing/subscribe",
  "/api/landing/plans",             // Public plan catalogue for the pricing page
  "/api/landing/checkout-session",  // Read-only Checkout status for /pay/success
  "/api/landing-page-config",
  "/api/store/",
  "/api/store-public/",
  "/api/online-orders/public",
  "/api/stripe/webhook",
  "/api/stripe/publishable-key",
  "/api/payment-gateway/config",
  // ── Payments ──
  // Only the routes a guest checkout genuinely needs. Everything else under
  // /api/payments/ (sale intents, refunds, health) deliberately stays behind
  // the licence/employee check, so this must NOT become a bare "/api/payments/".
  "/api/payments/webhook",       // signature-verified, see stripeWebhook.ts
  "/api/payments/config",        // publishable key + offered methods
  "/api/payments/order/",        // guarded by the order's tracking token
  "/api/payments/status/",       // PaymentIntent id is already a bearer secret
  "/api/payments/checkout-session", // plan price comes from the DB, never the caller
  "/api/products/template",
  "/api/customers/template",        // static sample sheet, no store data
  "/api/caller-id/incoming",  // Local FRITZ!Card bridge (secured by CALLER_ID_BRIDGE_SECRET)
  "/api/caller-id/active-calls", // HTTP polling fallback — tenantId required in query string
  "/api/push/vapid-public-key", // Public — needed for SW push subscription before auth
  "/api/push/subscribe", // Public — SW registers subscription before full auth
  "/api/maintenance/fix-tenant-ids", // One-time migration fix (secured by secret header)
  // ── Delivery Platform Public Routes ──
  "/api/dine-in/validate/",         // Public QR token validation for dine-in
  "/api/delivery/auth/",           // Customer OTP login/register
  "/api/delivery/store/",          // Menu & store config browsing
  "/api/delivery/restaurants",     // Multi-restaurant discovery listing
  "/api/delivery/orders/track/",   // Public order tracking by token
  "/api/delivery/orders/public",   // Public order placement
  "/api/delivery/orders",          // Order creation (customer-facing)
  "/api/delivery/promo/validate",  // Promo code validation
  "/api/delivery/zones",           // Delivery zones for checkout map
  "/api/delivery/referral/",       // Referral code lookup
  "/api/delivery/driver/",         // All driver endpoints (auth via Bearer driver token)
  "/api/delivery/search",          // Public product search
  "/api/delivery/help/faq",        // Public FAQ listing
  "/api/delivery/sitemap.xml",     // Dynamic sitemap XML
  "/api/delivery/recommendations", // Public recommendations
  "/api/delivery/broadcast",        // Public broadcast order creation (drop-shipping)
  "/api/delivery/broadcast/menu",   // Public aggregated menu for /broadcast page
  "/api/customer/chats",            // Customer chat list (auth via Bearer customer token)
  "/api/customer/chats/",           // Customer chat single room + messages
  "/api/robots.txt",               // SEO robots.txt
  "/api/sitemap.xml",              // SEO sitemap (CDN-prefixed variant)
  "/api/contact",                  // Website demo request (rate limited, no auth)
  "/api/favicon.ico",              // Favicon via the CDN-prefixed path
  // ── HTML pages served under /api/ prefix (Hostinger CDN compatibility) ──
  "/api/order",                    // Delivery listing (no-slug) + /api/order/
  "/api/track/",                   // Public tracking page HTML
  "/api/driver",                   // Driver PWA HTML (exact)
  "/api/driver/",                  // Driver PWA HTML (with slash/slug)
  "/api/restaurants",              // Restaurant listing HTML
  "/api/delivery-app/",            // Static assets (CSS, JS, images)
  // ── Static files under /api/ prefix (CDN compatibility) ──
  "/api/uploads/",                 // Product images & media
  "/api/assets/",                  // App assets
  "/api/objects/",                 // Alias for uploads
  "/api/sounds/",                  // Notification sounds
  "/api/ws/",                      // WebSocket upgrade — auth handled by ws server itself
  "/api/events",                   // SSE fallback for the WS broadcast channel
];

const PUBLIC_ROUTE_PATTERNS = [
  /^\/api\/store\/\d+\/menu$/,
];

/**
 * SEC-04 — segment-boundary matching.
 *
 * A plain `startsWith` lets any route that merely shares a textual prefix slip
 * through unauthenticated: `/api/store` would open `/api/store-settings`, and
 * `/api/health` would open `/api/health-internal`. Requiring the match to end
 * at a path separator keeps every intended sub-path public while closing the
 * sibling-prefix hole, including for entries added later.
 */
function matchesPrefix(path: string, route: string): boolean {
  if (route.endsWith("/")) return path.startsWith(route);
  if (path === route) return true;
  return path.startsWith(route + "/");
}

function isPublicRoute(path: string): boolean {
  if (PUBLIC_ROUTES.some(route => matchesPrefix(path, route))) return true;
  if (PUBLIC_ROUTE_PATTERNS.some(pattern => pattern.test(path))) return true;
  return false;
}

const SEED_ROUTES = [
  "/api/admin/seed-pizza-lemon",
  "/api/admin/seed-zurich-restaurants",
  "/api/admin/check-pizza-lemon",
  "/api/seed",
  "/api/fix-schema-and-seed",
  "/api/force-full-seed",
];

function isSeedRoute(path: string): boolean {
  return SEED_ROUTES.some(route => matchesPrefix(path, route));
}

export function tenantAuthMiddleware() {
  const isDev = process.env.NODE_ENV === "development";

  return async (req: TenantAuthRequest, res: Response, next: NextFunction) => {
    if (!req.path.startsWith("/api")) {
      return next();
    }

    if (req.path.startsWith("/api/super-admin")) {
      return next();
    }

    if (isPublicRoute(req.path)) {
      return next();
    }

    if (isSeedRoute(req.path)) {
      // SEC-03: seed routes rebuild the product catalog (delete + reinsert).
      // They are development-only — no secret header can re-open them in
      // production, and 404 hides their existence from probing.
      if (isDev) return next();
      console.warn(`[tenantAuth] Blocked seed route in production: ${req.path}`);
      return res.status(404).json({ error: "Not found" });
    }

    // A signed download link (see signDownloadToken) — GET on its own path only.
    const dl = typeof req.query.dl === "string" ? req.query.dl : "";
    if (dl && req.method === "GET" && DOWNLOADABLE_PATHS.some((re) => re.test(req.path))) {
      const claims = verifyDownloadToken(dl, req.path);
      if (!claims) return res.status(401).json({ error: "Download link expired or invalid", code: "DOWNLOAD_LINK_INVALID" });
      req.tenantId = claims.t;
      if (claims.emp && !(req as any).employee) (req as any).employee = claims.emp;
      const { dl: _dl, ...rest } = req.query as any;
      Object.defineProperty(req, "query", { value: { ...rest, tenantId: String(claims.t) }, writable: true, configurable: true, enumerable: true });
      return next();
    }

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, JWT_SECRET) as { id: number; email: string; role: string };
        const admin = await storage.getSuperAdmin(decoded.id);
        if (admin && admin.isActive) {
          const tenantId = req.query.tenantId ? Number(req.query.tenantId) : (req.body?.tenantId ? Number(req.body.tenantId) : undefined);
          if (tenantId) req.tenantId = tenantId;
          // Lets the ownership checks (server/tenantScope.ts) step aside for
          // the platform operator, who legitimately works across stores.
          req.isSuperAdmin = true;
          return next();
        }
      } catch (_) { }
    }

    const tenantId = req.query.tenantId ? Number(req.query.tenantId) : (req.body?.tenantId ? Number(req.body.tenantId) : undefined);
    const licenseKey = req.headers["x-license-key"] as string | undefined;

    if (!tenantId && !licenseKey) {
      return res.status(401).json({ error: "Authentication required. Provide x-license-key header." });
    }

    if (!licenseKey) {
      return res.status(401).json({ error: "Authentication required. Provide x-license-key header." });
    }

    try {
      const license = await storage.getLicenseByKey(licenseKey);
      if (!license) {
        return res.status(401).json({ error: "Invalid license key" });
      }

      if (license.status !== "active") {
        return res.status(401).json({ error: `License is ${license.status}` });
      }

      // Query and body are checked separately: before, a matching
      // ?tenantId= let a body.tenantId of ANOTHER store through (the check
      // only looked at the query when both were sent).
      const queryTenant = req.query.tenantId ? Number(req.query.tenantId) : undefined;
      const bodyTenant = req.body && typeof req.body === "object" && req.body.tenantId != null && req.body.tenantId !== ""
        ? Number(req.body.tenantId) : undefined;
      if ((queryTenant && license.tenantId !== queryTenant) || (bodyTenant && license.tenantId !== bodyTenant)) {
        return res.status(403).json({ error: "License key does not match the requested tenant" });
      }

      if (license.expiresAt && new Date(license.expiresAt) < new Date()) {
        const isTrial = license.licenseKey.startsWith("TRIAL-");
        return res.status(401).json({
          error: isTrial ? "Your 14-day trial period has expired. Please subscribe to continue." : "License has expired",
          code: "LICENSE_EXPIRED",
          isTrial
        });
      }

      req.tenantId = license.tenantId;
      req.licenseKey = licenseKey;
      // Every tenant route that filters by ?tenantId= used to return ALL
      // stores' rows when the parameter was left out. Pin it to the licence's
      // store so those lists are always scoped. (Express 5's req.query is a
      // getter, so it is shadowed with an own property.)
      if (!queryTenant) {
        const q = { ...(req.query as any), tenantId: String(license.tenantId) };
        Object.defineProperty(req, "query", { value: q, writable: true, configurable: true, enumerable: true });
      }
      next();
    } catch (error) {
      console.error("[tenantAuth] Error validating license:", error);
      return res.status(500).json({ error: "Authentication error" });
    }
  };
}
