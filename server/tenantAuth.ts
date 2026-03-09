import type { Request, Response, NextFunction } from "express";
import { storage } from "./storage";

export interface TenantAuthRequest extends Request {
  tenantId?: number;
  licenseKey?: string;
}

const PUBLIC_ROUTES = [
  "/api/license/validate",
  "/api/landing/subscribe",
  "/api/store-public/",
  "/api/online-orders/public",
  "/api/admin/seed-pizza-lemon",
  "/api/admin/check-pizza-lemon",
  "/api/seed",
  "/api/fix-schema-and-seed",
  "/api/force-full-seed",
  "/api/stripe/webhook",
  "/api/stripe/publishable-key",
  "/api/payment-gateway/config",
  "/api/products/template",
  "/api/caller-id/simulate",
  "/api/dashboard/subscriptions",
  "/api/objects/upload",
  "/api/images/save",
];

function isPublicRoute(path: string): boolean {
  return PUBLIC_ROUTES.some(route => path.startsWith(route));
}

function isStorePublicRoute(path: string): boolean {
  return path.startsWith("/store/") || path.startsWith("/public-objects/");
}

export function tenantAuthMiddleware() {
  return async (req: TenantAuthRequest, res: Response, next: NextFunction) => {
    if (!req.path.startsWith("/api")) {
      return next();
    }

    if (req.path.startsWith("/api/super-admin")) {
      return next();
    }

    if (isPublicRoute(req.path) || isStorePublicRoute(req.path)) {
      return next();
    }

    const tenantId = req.query.tenantId ? Number(req.query.tenantId) : (req.body?.tenantId ? Number(req.body.tenantId) : undefined);
    const licenseKey = req.headers["x-license-key"] as string | undefined;

    if (!tenantId) {
      return next();
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

      if (license.tenantId !== tenantId) {
        return res.status(403).json({ error: "License key does not match the requested tenant" });
      }

      if (license.expiresAt && new Date(license.expiresAt) < new Date()) {
        return res.status(401).json({ error: "License has expired" });
      }

      req.tenantId = tenantId;
      req.licenseKey = licenseKey;
      next();
    } catch (error) {
      console.error("[tenantAuth] Error validating license:", error);
      return res.status(500).json({ error: "Authentication error" });
    }
  };
}
