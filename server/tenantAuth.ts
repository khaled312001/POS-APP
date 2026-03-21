import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { storage } from "./storage";

const JWT_SECRET = process.env.JWT_SECRET || "barmagly-super-admin-secret-key-2024";

export interface TenantAuthRequest extends Request {
  tenantId?: number;
  licenseKey?: string;
}

const PUBLIC_ROUTES = [
  "/api/license/validate",
  "/api/auth/google",
  "/api/landing/subscribe",
  "/api/landing-page-config",
  "/api/store-public/",
  "/api/online-orders/public",
  "/api/stripe/webhook",
  "/api/stripe/publishable-key",
  "/api/payment-gateway/config",
  "/api/products/template",
  "/api/dashboard/subscriptions",
  "/api/caller-id/incoming", // Local FRITZ!Card bridge (secured by CALLER_ID_BRIDGE_SECRET)
  "/api/push/vapid-public-key", // Public — needed for SW push subscription before auth
  "/api/push/subscribe", // Public — SW registers subscription before full auth
];

const PUBLIC_ROUTE_PATTERNS = [
  /^\/api\/store\/\d+\/menu$/,
];

function isPublicRoute(path: string): boolean {
  if (PUBLIC_ROUTES.some(route => path.startsWith(route))) return true;
  if (PUBLIC_ROUTE_PATTERNS.some(pattern => pattern.test(path))) return true;
  return false;
}

const SEED_ROUTES = [
  "/api/admin/seed-pizza-lemon",
  "/api/admin/check-pizza-lemon",
  "/api/seed",
  "/api/fix-schema-and-seed",
  "/api/force-full-seed",
];

function isSeedRoute(path: string): boolean {
  return SEED_ROUTES.some(route => path.startsWith(route));
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
      if (isDev) return next();
      return res.status(403).json({ error: "Seed endpoints are disabled in production" });
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

      if (tenantId && license.tenantId !== tenantId) {
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
      next();
    } catch (error) {
      console.error("[tenantAuth] Error validating license:", error);
      return res.status(500).json({ error: "Authentication error" });
    }
  };
}
