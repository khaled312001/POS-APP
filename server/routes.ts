import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import * as xlsx from "xlsx";
import path from "node:path";
import fs from "node:fs";
import { randomUUID } from "node:crypto";
import { storage } from "./storage";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { callerIdService } from "./callerIdService";
import { pushService } from "./pushService";
import { requireSuperAdmin } from "./superAdminAuth";
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";
import { sendLicenseKeyEmail } from "./emailService";
import { whatsappService } from "./whatsappService";

const TIMESTAMP_FIELDS = [
  "createdAt", "updatedAt", "expiryDate", "expectedDate", "receivedDate",
  "startTime", "endTime", "startDate", "endDate", "nextBillingDate",
  "date", "lastRestocked", "completedAt", "processedAt"
];

function sanitizeDates(data: any) {
  const result = { ...data };
  for (const field of TIMESTAMP_FIELDS) {
    if (field in result) {
      if (result[field] === "" || result[field] === null || result[field] === undefined) {
        delete result[field];
      } else if (typeof result[field] === "string") {
        result[field] = new Date(result[field]);
      }
    }
  }
  return result;
}

import * as bcrypt from "bcrypt";
import * as crypto from "crypto";
import { addDays, addMonths, addYears } from "date-fns";
import { OAuth2Client } from "google-auth-library";

const googleClient = new OAuth2Client("852311970344-8q8a01gm3jip4k9vooljk8ttjpd30802.apps.googleusercontent.com");

export async function registerRoutes(app: Express): Promise<Server> {

  // ── One-time production seed endpoint ─────────────────────────────────────
  // Ensures Pizza Lemon store exists in whatever DB this server is connected to.
  // Safe to call multiple times – seedPizzaLemon() is idempotent.
  app.post("/api/admin/seed-pizza-lemon", async (_req, res) => {
    try {
      const { seedPizzaLemon } = await import("./seedPizzaLemon");
      await seedPizzaLemon();
      res.json({ success: true, message: "Pizza Lemon store seeded (or already existed)." });
    } catch (e: any) {
      console.error("[SEED API] Error:", e);
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // ── DB health check (returns license key status) ──────────────────────────
  app.get("/api/admin/check-pizza-lemon", async (_req, res) => {
    try {
      const { db } = await import("./db");
      const { tenants, licenseKeys } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      const [tenant] = await db.select().from(tenants).where(eq(tenants.ownerEmail, "admin@pizzalemon.ch"));
      if (!tenant) return res.json({ found: false, message: "Pizza Lemon not found in this database." });
      const licenses = await db.select().from(licenseKeys).where(eq(licenseKeys.tenantId, tenant.id));
      res.json({ found: true, tenantId: tenant.id, status: tenant.status, licenses: licenses.map(l => ({ key: l.licenseKey, status: l.status })) });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Landing Page Subscription
  app.post("/api/landing/subscribe", async (req, res) => {
    try {
      const {
        businessName,
        ownerName,
        ownerEmail,
        ownerPhone,
        planType,         // monthly | yearly
        planName,         // basic | advanced
        paymentMethodId,  // Stripe PaymentMethod ID (preferred)
        stripeToken,      // fallback: legacy token
        lang,
      } = req.body;

      if (!businessName || !ownerName || !ownerEmail) {
        return res.status(400).json({ error: "Required fields are missing" });
      }

      // 1. Check if tenant already exists
      const existing = await storage.getTenantByEmail(ownerEmail);
      if (existing) {
        return res.status(400).json({ error: "A store with this email already exists" });
      }

      // 2. Process Stripe payment (if card provided)
      let stripeChargeId: string | null = null;
      const isAdvanced = planName === "advanced";
      const isYearly = planType === "yearly";
      const priceChf = isYearly ? (isAdvanced ? 4999 : 1999) : (isAdvanced ? 499 : 199);
      const amountCents = priceChf * 100;

      if (paymentMethodId || stripeToken) {
        try {
          const stripeClient = await getUncachableStripeClient();
          if (paymentMethodId) {
            // Modern PaymentIntent flow
            const pi = await stripeClient.paymentIntents.create({
              amount: amountCents,
              currency: "chf",
              payment_method: paymentMethodId,
              confirm: true,
              automatic_payment_methods: { enabled: true, allow_redirects: "never" },
              receipt_email: ownerEmail,
              description: `Barmagly ${planName} ${planType} — ${businessName}`,
              metadata: { businessName, ownerEmail, planName, planType },
            });
            if (pi.status === "requires_action") {
              return res.json({ requiresAction: true, clientSecret: pi.client_secret, paymentIntentId: pi.id });
            }
            if (pi.status !== "succeeded") {
              return res.status(402).json({ error: "Payment was not completed. Please try again." });
            }
            stripeChargeId = pi.id;
          } else if (stripeToken) {
            // Legacy token flow
            const charge = await stripeClient.charges.create({
              amount: amountCents,
              currency: "chf",
              source: stripeToken,
              receipt_email: ownerEmail,
              description: `Barmagly ${planName} ${planType} — ${businessName}`,
              metadata: { businessName, ownerEmail, planName, planType },
            });
            if (charge.status !== "succeeded") {
              return res.status(402).json({ error: "Payment failed. Please try again." });
            }
            stripeChargeId = charge.id;
          }
        } catch (stripeErr: any) {
          console.error("[SUBSCRIBE] Stripe error:", stripeErr.message);
          return res.status(402).json({ error: stripeErr.message || "Payment processing failed" });
        }
      }

      // 3. Create Tenant
      const tempPassword = "Bpos" + Math.floor(100000 + Math.random() * 900000);
      const passwordHash = await bcrypt.hash(tempPassword, 10);

      const tenant = await storage.createTenant({
        businessName,
        ownerName,
        ownerEmail,
        ownerPhone: ownerPhone || null,
        passwordHash,
        status: "active",
        maxBranches: isAdvanced ? 10 : 1,
        maxEmployees: isAdvanced ? 999 : 5,
        metadata: {
          signupDate: new Date().toISOString(),
          paymentMethod: paymentMethodId || stripeToken ? "stripe" : "bank",
          stripeChargeId,
        }
      });

      // 4. Create Subscription
      const startDate = new Date();
      let endDate = new Date();
      if (isYearly) {
        endDate = addYears(startDate, 1);
      } else {
        endDate = addMonths(startDate, 1);
      }

      const subscription = await storage.createTenantSubscription({
        tenantId: tenant.id,
        planType,
        planName: planName || "basic",
        price: String(priceChf) + ".00",
        status: "active",
        startDate,
        endDate,
        autoRenew: true,
        paymentMethod: stripeChargeId ? "stripe" : "bank",
      });

      // 5. Generate License Key
      const randomSegments = Array.from({ length: 4 }, () =>
        crypto.randomBytes(2).toString("hex").toUpperCase()
      );
      const licenseKey = `BARMAGLY-${randomSegments.join("-")}`;

      await storage.createLicenseKey({
        licenseKey,
        tenantId: tenant.id,
        subscriptionId: subscription.id,
        status: "active",
        maxActivations: isAdvanced ? 10 : 3,
        expiresAt: endDate,
        notes: `Landing page subscription: ${planName} ${planType}`,
      });

      // 6. Welcome Notification
      await storage.createTenantNotification({
        tenantId: tenant.id,
        type: "info",
        title: "Welcome to Barmagly!",
        message: `Your account for ${businessName} is ready. Open the app and enter your license key to activate.`,
        priority: "normal",
      });

      // 7. Send License Key Email (non-blocking)
      sendLicenseKeyEmail({
        to: ownerEmail,
        ownerName,
        businessName,
        licenseKey,
        planName,
        planType,
        tempPassword,
        expiresAt: endDate,
      }).then(() => {
        console.log(`[SUBSCRIBE] Email sent to ${ownerEmail}`);
      }).catch((emailErr: any) => {
        console.error("[SUBSCRIBE] Email send failed (non-fatal):", emailErr.message);
      });

      console.log(`[SUBSCRIBE] Tenant created: ${businessName} (ID: ${tenant.id}) | Stripe: ${stripeChargeId || "none"}`);

      res.json({
        success: true,
        tenantId: tenant.id,
        licenseKey,
        requiresAction: false,
      });
    } catch (e: any) {
      console.error("[SUBSCRIBE] Error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // Confirm subscription after 3DS
  app.post("/api/landing/confirm-subscription", async (req, res) => {
    try {
      const { paymentIntentId, businessName, ownerName, ownerEmail, ownerPhone, planType, planName } = req.body;
      if (!paymentIntentId) return res.status(400).json({ error: "paymentIntentId required" });

      const stripeClient = await getUncachableStripeClient();
      const pi = await stripeClient.paymentIntents.retrieve(paymentIntentId);
      if (pi.status !== "succeeded") {
        return res.status(402).json({ error: "Payment not completed" });
      }

      // Check if tenant was already created (idempotency)
      const existingTenant = await storage.getTenantByEmail(ownerEmail);
      if (existingTenant) {
        const licenses = await storage.getLicenseKeys(existingTenant.id);
        const key = licenses[0]?.licenseKey || "";
        return res.json({ success: true, tenantId: existingTenant.id, licenseKey: key, requiresAction: false });
      }

      // Create tenant (same as above)
      const isAdvanced = planName === "advanced";
      const isYearly = planType === "yearly";
      const priceChf = isYearly ? (isAdvanced ? 4999 : 1999) : (isAdvanced ? 499 : 199);
      const tempPassword = "Bpos" + Math.floor(100000 + Math.random() * 900000);
      const passwordHash = await bcrypt.hash(tempPassword, 10);
      const tenant = await storage.createTenant({
        businessName, ownerName, ownerEmail, ownerPhone: ownerPhone || null, passwordHash,
        status: "active", maxBranches: isAdvanced ? 10 : 1, maxEmployees: isAdvanced ? 999 : 5,
        metadata: { stripeChargeId: paymentIntentId },
      });
      const startDate = new Date();
      const endDate = isYearly ? addYears(startDate, 1) : addMonths(startDate, 1);
      const subscription = await storage.createTenantSubscription({
        tenantId: tenant.id, planType, planName: planName || "basic",
        price: String(priceChf) + ".00", status: "active", startDate, endDate,
        autoRenew: true, paymentMethod: "stripe",
      });
      const randomSegments = Array.from({ length: 4 }, () => crypto.randomBytes(2).toString("hex").toUpperCase());
      const licenseKey = `BARMAGLY-${randomSegments.join("-")}`;
      await storage.createLicenseKey({
        licenseKey, tenantId: tenant.id, subscriptionId: subscription.id,
        status: "active", maxActivations: isAdvanced ? 10 : 3, expiresAt: endDate,
      });
      sendLicenseKeyEmail({ to: ownerEmail, ownerName, businessName, licenseKey, planName, planType, tempPassword, expiresAt: endDate }).catch(() => { });
      res.json({ success: true, tenantId: tenant.id, licenseKey, requiresAction: false });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Google Authentication & Auto-Trial
  app.post("/api/auth/google", async (req, res) => {
    try {
      const { idToken, deviceId } = req.body;
      if (!idToken) return res.status(400).json({ error: "idToken is required" });

      const ticket = await googleClient.verifyIdToken({
        idToken,
      });
      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        return res.status(400).json({ error: "Invalid Google token" });
      }

      const email = payload.email.toLowerCase();
      const name = payload.name || "Store Owner";

      // 1. Check if tenant exists
      let tenant = await storage.getTenantByEmail(email);
      let isNew = false;

      if (!tenant) {
        isNew = true;
        // Create Tenant with Trial status
        const tempPassword = "GAuth-" + crypto.randomBytes(4).toString("hex");
        const passwordHash = await bcrypt.hash(tempPassword, 10);

        tenant = await storage.createTenant({
          businessName: payload.name ? `${payload.name}'s Store` : "My New Store",
          ownerName: name,
          ownerEmail: email,
          passwordHash,
          status: "active",
          maxBranches: 1,
          maxEmployees: 5,
          metadata: { signupMethod: "google", signupDate: new Date().toISOString() }
        });

        // 2. Create 14-Day Trial Subscription
        const startDate = new Date();
        const endDate = addDays(startDate, 14);

        const sub = await storage.createTenantSubscription({
          tenantId: tenant.id,
          planType: "trial",
          planName: "14-Day Free Trial",
          price: "0",
          status: "active",
          startDate,
          endDate,
          autoRenew: false,
        });

        // 3. Generate Trial License Key
        const randomSegments = Array.from({ length: 4 }, () =>
          crypto.randomBytes(2).toString("hex").toUpperCase()
        );
        const licenseKey = `TRIAL-${randomSegments.join("-")}`;

        await storage.createLicenseKey({
          licenseKey,
          tenantId: tenant.id,
          subscriptionId: sub.id,
          status: "active",
          maxActivations: 3,
          expiresAt: endDate,
          notes: "Auto-generated Google Trial",
        });

        // 4. Ensure branch & admin employee
        await storage.ensureTenantData(tenant.id);
      }

      // 5. Find the active license
      const licenses = await storage.getLicenseKeys(tenant.id);
      const activeLicense = licenses.find(l => l.status === "active" && (!l.expiresAt || new Date(l.expiresAt) > new Date()));

      if (!activeLicense) {
        return res.status(403).json({ error: "No active license found for this account. Your trial may have expired." });
      }

      // 6. Find the admin employee
      const employees = await storage.getEmployeesByTenant(tenant.id);
      const adminEmployee = employees.find(e => e.role === "admin" || e.email === email);

      res.json({
        success: true,
        licenseKey: activeLicense.licenseKey,
        isNew,
        tenant: {
          id: tenant.id,
          name: tenant.businessName,
          email: tenant.ownerEmail,
          setupCompleted: tenant.setupCompleted
        },
        employee: adminEmployee ? {
          id: adminEmployee.id,
          name: adminEmployee.name,
          role: adminEmployee.role,
          permissions: adminEmployee.permissions,
        } : null
      });
    } catch (e: any) {
      console.error("[GOOGLE AUTH] Error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/tenant/onboarding-status", async (req, res) => {
    try {
      const tenantId = Number(req.query.tenantId);
      if (!tenantId) return res.status(400).json({ error: "tenantId is required" });
      const status = await storage.getOnboardingStatus(tenantId);
      res.json(status);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/tenant/onboarding-complete", async (req, res) => {
    try {
      const { tenantId, businessName, ownerPhone, storeType, logo } = req.body;
      if (!tenantId) return res.status(400).json({ error: "tenantId is required" });

      // 1. Update Tenant Info
      await storage.updateTenant(tenantId, {
        businessName,
        ownerPhone,
        storeType,
        logo,
        setupCompleted: true
      });

      // 2. Sync with Landing Page Config
      const config = await storage.getLandingPageConfig(tenantId);
      if (!config) {
        const { db } = await import("./db");
        const { landingPageConfig: landingConfig } = await import("@shared/schema");
        await db.insert(landingConfig).values({
          tenantId,
          slug: businessName.toLowerCase().replace(/\s+/g, '-'),
          heroTitle: businessName,
          phone: ownerPhone,
          socialWhatsapp: ownerPhone,
        });
      } else {
        const { db } = await import("./db");
        const { landingPageConfig: landingConfig } = await import("@shared/schema");
        const { eq } = await import("drizzle-orm");
        await db.update(landingConfig).set({
          heroTitle: businessName,
          phone: ownerPhone,
          socialWhatsapp: ownerPhone,
        }).where(eq(landingConfig.tenantId, tenantId));
      }

      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // License Validation
  app.post("/api/license/validate", async (req, res) => {
    try {
      const { licenseKey, email, password, deviceId } = req.body;
      if (process.env.NODE_ENV !== 'production') console.log("[VALIDATE] Incoming request details:", { licenseKey, email: email ? email.substring(0, 2) + "***" : undefined, deviceId });

      if (!licenseKey) {
        return res.json({ isValid: false, reason: "License key is required" });
      }

      const license = await storage.getLicenseByKey(licenseKey);
      if (process.env.NODE_ENV !== 'production') console.log("[VALIDATE] getLicenseByKey result for", licenseKey, ":", !!license);
      if (!license) {
        return res.json({ isValid: false, reason: "Invalid license key" });
      }

      if (license.status !== "active") {
        return res.json({ isValid: false, reason: `License is ${license.status}` });
      }

      if (license.expiresAt && new Date(license.expiresAt) < new Date()) {
        return res.json({ isValid: false, reason: "License has expired" });
      }

      const tenant = await storage.getTenant(license.tenantId);
      if (!tenant) {
        return res.json({ isValid: false, reason: "Tenant not found" });
      }

      if (tenant.status !== "active") {
        return res.json({ isValid: false, reason: `Store account is ${tenant.status}` });
      }

      // Validate email if provided (no password required)
      if (email) {
        if (tenant.ownerEmail.toLowerCase() !== email.toLowerCase()) {
          return res.json({ isValid: false, reason: "Email does not match this license" });
        }
        // If password is also provided, validate it (optional)
        if (password) {
          if (!tenant.passwordHash) {
            return res.json({ isValid: false, reason: "Account credentials not configured" });
          }
          const passwordValid = await bcrypt.compare(password, tenant.passwordHash);
          if (!passwordValid) {
            return res.json({ isValid: false, reason: "Invalid password" });
          }
        }
      }

      const isNewActivation = !!email;
      if (isNewActivation) {
        const currentCount = license.currentActivations || 0;
        const maxCount = license.maxActivations || 3;
        if (currentCount >= maxCount) {
          return res.json({ isValid: false, reason: `Maximum activations reached (${maxCount}). Contact support to add more.` });
        }
      }

      const subs = await storage.getTenantSubscriptions(tenant.id);
      const activeSub = subs.find((s: any) => s.status === "active");

      await storage.updateLicenseKey(license.id, {
        lastValidatedAt: new Date(),
        deviceInfo: deviceId || license.deviceInfo,
        currentActivations: (license.currentActivations || 0) + (isNewActivation ? 1 : 0),
      });

      const subInfo = activeSub ? {
        active: true,
        plan: activeSub.planName,
        daysRemaining: activeSub.endDate ? Math.max(0, Math.ceil((new Date(activeSub.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 365,
        requiresUpgrade: false,
      } : {
        active: false,
        plan: "No active plan",
        daysRemaining: 0,
        requiresUpgrade: true,
      };

      res.json({
        isValid: true,
        tenant: {
          id: tenant.id,
          name: tenant.businessName,
          logo: tenant.logo,
          storeType: tenant.storeType,
        },
        subscription: subInfo,
      });
    } catch (e: any) {
      console.error("License validation error:", e);
      res.status(500).json({ isValid: false, reason: "Server error during validation" });
    }
  });

  // Dashboard
  app.get("/api/dashboard", async (req: Request, res: Response) => {
    try {
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : undefined;
      if (!tenantId) return res.status(400).json({ error: "tenantId is required" });
      const stats = await storage.getDashboardStats(tenantId);
      res.json(stats);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Multi-branch dashboard stats
  app.get("/api/dashboard/multi-branch", async (req: Request, res: Response) => {
    try {
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : undefined;
      if (!tenantId) return res.status(400).json({ error: "tenantId is required" });

      const allBranches = await storage.getBranchesByTenant(tenantId);
      const allEmployees = await storage.getEmployeesByTenant(tenantId);
      const allInventory = await storage.getInventory(undefined, tenantId);
      const allSales = await storage.getSales({ tenantId });
      const allShifts = await storage.getShifts(tenantId);
      const allProducts = await storage.getProductsByTenant(tenantId);
      const allCategories = await storage.getCategories(tenantId);
      const allCustomers = await storage.getCustomers(undefined, tenantId);

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 7);
      weekStart.setHours(0, 0, 0, 0);
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const branchStats = allBranches.map((branch: any) => {
        const branchSales = allSales.filter((s: any) => s.branchId === branch.id);
        const branchEmployees = allEmployees.filter((e: any) => e.branchId === branch.id);
        const branchInventory = allInventory.filter((i: any) => i.branchId === branch.id);
        const activeShifts = allShifts.filter((s: any) => s.branchId === branch.id && s.status === "open");

        const todaySales = branchSales.filter((s: any) => s.createdAt && new Date(s.createdAt) >= todayStart);
        const weekSales = branchSales.filter((s: any) => s.createdAt && new Date(s.createdAt) >= weekStart);
        const monthSales = branchSales.filter((s: any) => s.createdAt && new Date(s.createdAt) >= monthStart);

        const todayRevenue = todaySales.reduce((sum: number, s: any) => sum + Number(s.totalAmount || 0), 0);
        const weekRevenue = weekSales.reduce((sum: number, s: any) => sum + Number(s.totalAmount || 0), 0);
        const monthRevenue = monthSales.reduce((sum: number, s: any) => sum + Number(s.totalAmount || 0), 0);
        const totalRevenue = branchSales.reduce((sum: number, s: any) => sum + Number(s.totalAmount || 0), 0);

        const lowStockItems = branchInventory.filter((i: any) => (i.quantity || 0) <= (i.lowStockThreshold || 10));
        const outOfStockItems = branchInventory.filter((i: any) => (i.quantity || 0) === 0);

        const paymentBreakdown: Record<string, { count: number; total: number }> = {};
        branchSales.forEach((s: any) => {
          const method = s.paymentMethod || "cash";
          if (!paymentBreakdown[method]) paymentBreakdown[method] = { count: 0, total: 0 };
          paymentBreakdown[method].count++;
          paymentBreakdown[method].total += Number(s.totalAmount || 0);
        });

        return {
          id: branch.id,
          name: branch.name,
          address: branch.address,
          phone: branch.phone,
          isMain: branch.isMain,
          isActive: branch.isActive,
          currency: branch.currency || "USD",
          todayRevenue,
          weekRevenue,
          monthRevenue,
          totalRevenue,
          todaySalesCount: todaySales.length,
          totalSalesCount: branchSales.length,
          employeeCount: branchEmployees.length,
          activeEmployees: branchEmployees.filter((e: any) => e.isActive).length,
          activeShifts: activeShifts.length,
          inventoryCount: branchInventory.length,
          lowStockCount: lowStockItems.length,
          outOfStockCount: outOfStockItems.length,
          paymentBreakdown,
        };
      });

      const totalRevenue = allSales.reduce((sum: number, s: any) => sum + Number(s.totalAmount || 0), 0);
      const todayTotalRevenue = allSales
        .filter((s: any) => s.createdAt && new Date(s.createdAt) >= todayStart)
        .reduce((sum: number, s: any) => sum + Number(s.totalAmount || 0), 0);
      const monthTotalRevenue = allSales
        .filter((s: any) => s.createdAt && new Date(s.createdAt) >= monthStart)
        .reduce((sum: number, s: any) => sum + Number(s.totalAmount || 0), 0);

      res.json({
        summary: {
          totalBranches: allBranches.length,
          activeBranches: allBranches.filter((b: any) => b.isActive).length,
          totalEmployees: allEmployees.length,
          totalProducts: allProducts.length,
          totalCategories: allCategories.length,
          totalCustomers: allCustomers.length,
          totalSales: allSales.length,
          totalRevenue,
          todayRevenue: todayTotalRevenue,
          monthRevenue: monthTotalRevenue,
          activeShifts: allShifts.filter((s: any) => s.status === "open").length,
        },
        branches: branchStats,
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Subscription status for dashboard
  app.get("/api/dashboard/subscriptions", async (_req: Request, res: Response) => {
    try {
      const tenantSubs = await storage.getTenantSubscriptions();
      const tenants = await storage.getTenants();
      const licenses = await storage.getLicenseKeys();

      const subsWithTenant = tenantSubs.map((sub: any) => {
        const tenant = tenants.find((t: any) => t.id === sub.tenantId);
        const tenantLicenses = licenses.filter((l: any) => l.tenantId === sub.tenantId);
        return {
          ...sub,
          tenantName: tenant?.businessName || "Unknown",
          tenantEmail: tenant?.ownerEmail || "",
          tenantStatus: tenant?.status || "unknown",
          licenseCount: tenantLicenses.length,
          activeLicenses: tenantLicenses.filter((l: any) => l.status === "active").length,
        };
      });

      res.json({
        subscriptions: subsWithTenant,
        summary: {
          total: tenantSubs.length,
          active: tenantSubs.filter((s: any) => s.status === "active").length,
          trial: tenantSubs.filter((s: any) => s.planType === "trial").length,
          monthly: tenantSubs.filter((s: any) => s.planType === "monthly").length,
          yearly: tenantSubs.filter((s: any) => s.planType === "yearly").length,
          expiringSoon: tenantSubs.filter((s: any) => {
            if (!s.endDate) return false;
            const daysLeft = Math.ceil((new Date(s.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            return daysLeft > 0 && daysLeft <= 7;
          }).length,
          totalMRR: tenantSubs.filter((s: any) => s.status === "active" && s.planType === "monthly")
            .reduce((sum: number, s: any) => sum + Number(s.price || 0), 0),
        },
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Branches
  app.get("/api/branches", async (req, res) => {
    try {
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : undefined;
      if (!tenantId) return res.status(400).json({ error: "tenantId is required" });
      res.json(await storage.getBranchesByTenant(tenantId));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/branches", async (req, res) => {
    try { res.json(await storage.createBranch(sanitizeDates(req.body))); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.put("/api/branches/:id", async (req, res) => {
    try { res.json(await storage.updateBranch(Number(req.params.id), sanitizeDates(req.body))); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.delete("/api/branches/:id", async (req, res) => {
    try { await storage.deleteBranch(Number(req.params.id)); res.json({ success: true }); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Employees
  app.get("/api/employees", async (req, res) => {
    try {
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : undefined;
      if (!tenantId) return res.status(400).json({ error: "tenantId is required" });
      const emps = await storage.getEmployeesByTenant(tenantId);
      res.json(emps);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.get("/api/employees/:id", async (req, res) => {
    try {
      const emp = await storage.getEmployee(Number(req.params.id));
      if (!emp) return res.status(404).json({ error: "Employee not found" });
      res.json(emp);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/employees", async (req, res) => {
    try { res.json(await storage.createEmployee(sanitizeDates(req.body))); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.put("/api/employees/:id", async (req, res) => {
    try { res.json(await storage.updateEmployee(Number(req.params.id), sanitizeDates(req.body))); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.delete("/api/employees/:id", async (req, res) => {
    try { await storage.deleteEmployee(Number(req.params.id)); res.json({ success: true }); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/employees/login", async (req, res) => {
    try {
      let emp;
      if (req.body.employeeId) {
        emp = await storage.getEmployee(Number(req.body.employeeId));
        if (!emp || emp.pin !== req.body.pin) {
          return res.status(401).json({ error: "Invalid PIN for this employee" });
        }
      } else {
        emp = await storage.getEmployeeByPin(req.body.pin);
        if (!emp) return res.status(401).json({ error: "Invalid PIN" });
      }
      if (!emp.isActive) return res.status(401).json({ error: "Account deactivated" });
      // Log activity
      await storage.createActivityLog({
        employeeId: emp.id,
        action: "login",
        entityType: "employee",
        entityId: emp.id,
        details: `${emp.name} logged in`,
      });
      res.json(emp);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Categories
  app.get("/api/categories", async (req, res) => {
    try {
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : undefined;
      if (!tenantId) return res.status(400).json({ error: "tenantId is required" });
      const categories = await storage.getCategories(tenantId);
      res.json(sortCategoriesByPriority(categories));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/categories", async (req, res) => {
    try {
      const c = await storage.createCategory(sanitizeDates(req.body));
      callerIdService.broadcast({ type: "menu_updated" }, (req as any).tenantId);
      res.json(c);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.put("/api/categories/:id", async (req, res) => {
    try {
      const c = await storage.updateCategory(Number(req.params.id), sanitizeDates(req.body));
      callerIdService.broadcast({ type: "menu_updated" }, (req as any).tenantId);
      res.json(c);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.delete("/api/categories/:id", async (req, res) => {
    try {
      const c = await storage.getCategory(Number(req.params.id));
      await storage.deleteCategory(Number(req.params.id));
      if (c) callerIdService.broadcast({ type: "menu_updated" }, (req as any).tenantId);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Products
  app.get("/api/products", async (req, res) => {
    try {
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : undefined;
      const search = req.query.search as string | undefined;
      const applyMarkup = req.query.applyMarkup === "true";
      if (!tenantId) return res.status(400).json({ error: "tenantId is required" });
      let products = await storage.getProductsByTenant(tenantId, search);
      if (applyMarkup) {
        const commissionRate = await storage.getCommissionRate();
        if (commissionRate > 0) {
          const factor = 1 + (commissionRate / 100);
          products = (products as any[]).map((p: any) => {
            const rawPrice = parseFloat(p.price) * factor;
            const rounded = Math.round(rawPrice * 2) / 2; // nearest 0.5
            return { ...p, price: rounded.toFixed(2) };
          });
        }
      }
      res.json(products);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Download Products Excel Template (must be before :id route)
  app.get("/api/products/template", (req, res) => {
    const templateData = [
      { Name: "Sample Product 1", Price: "9.99", CostPrice: "5.00", SKU: "SKU001", Barcode: "1234567890", Unit: "piece", NameArabic: "منتج 1" },
      { Name: "Sample Product 2", Price: "15.50", CostPrice: "8.00", SKU: "SKU002", Barcode: "0987654321", Unit: "kg", NameArabic: "منتج 2" },
    ];
    const ws = xlsx.utils.json_to_sheet(templateData);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Products");
    const buf = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });
    res.setHeader("Content-Disposition", "attachment; filename=products_template.xlsx");
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buf);
  });

  // Bulk Import Products (must be before :id route)
  app.post("/api/products/import", async (req: any, res) => {
    try {
      const { fileBase64, tenantId, branchId } = req.body;
      const buffer = Buffer.from(fileBase64, "base64");
      const workbook = xlsx.read(buffer, { type: "buffer" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = xlsx.utils.sheet_to_json(sheet);

      const productsToInsert = data.map((item: any) => ({
        tenantId: Number(tenantId),
        name: item.Name || item.name,
        nameAr: item.NameArabic || item.name_ar,
        sku: item.SKU || item.sku || undefined,
        barcode: String(item.Barcode || item.barcode || ""),
        price: String(item.Price || item.price || "0"),
        costPrice: String(item.CostPrice || item.cost_price || "0"),
        unit: item.Unit || item.unit || "piece",
        isActive: true,
      }));

      const results = await storage.bulkCreateProducts(productsToInsert as any);

      if (branchId) {
        for (const prod of results) {
          await storage.upsertInventory({
            productId: prod.id,
            branchId: Number(branchId),
            quantity: 0
          });
        }
      }

      res.json({ success: true, count: results.length });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/products/:id", async (req, res) => {
    try {
      const prod = await storage.getProduct(Number(req.params.id));
      if (!prod) return res.status(404).json({ error: "Product not found" });
      res.json(prod);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.get("/api/products/barcode/:barcode", async (req, res) => {
    try {
      const prod = await storage.getProductByBarcode(req.params.barcode);
      if (!prod) return res.status(404).json({ error: "Product not found" });
      res.json(prod);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/products", async (req, res) => {
    try {
      const body = sanitizeDates(req.body);
      // Addons are always free
      if (body.isAddon) body.price = "0";
      const p = await storage.createProduct(body);
      callerIdService.broadcast({ type: "menu_updated" }, (req as any).tenantId);
      res.json(p);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.put("/api/products/:id", async (req, res) => {
    try {
      const body = sanitizeDates(req.body);
      // Addons are always free
      if (body.isAddon) body.price = "0";
      const p = await storage.updateProduct(Number(req.params.id), body);
      callerIdService.broadcast({ type: "menu_updated" }, (req as any).tenantId);
      res.json(p);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.delete("/api/products/:id", async (req, res) => {
    try {
      const p = await storage.getProduct(Number(req.params.id));
      await storage.deleteProduct(Number(req.params.id));
      if (p) callerIdService.broadcast({ type: "menu_updated" }, (req as any).tenantId);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Inventory
  app.get("/api/inventory", async (req, res) => {
    try {
      const branchId = req.query.branchId ? Number(req.query.branchId) : undefined;
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : undefined;
      res.json(await storage.getInventory(branchId, tenantId));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/inventory", async (req, res) => {
    try { res.json(await storage.upsertInventory(sanitizeDates(req.body))); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/inventory/adjust", async (req, res) => {
    try {
      const { productId, branchId, adjustment } = req.body;
      res.json(await storage.adjustInventory(productId, branchId, adjustment));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.get("/api/inventory/low-stock", async (req, res) => {
    try {
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : undefined;
      const branchId = req.query.branchId ? Number(req.query.branchId) : undefined;
      if (!tenantId && !branchId) return res.status(400).json({ error: "tenantId or branchId is required" });
      if (branchId) {
        res.json(await storage.getLowStockItems(branchId));
      } else if (tenantId) {
        const tenantBranches = await storage.getBranchesByTenant(tenantId);
        const allLowStock = [];
        for (const branch of tenantBranches) {
          const items = await storage.getLowStockItems(branch.id);
          allLowStock.push(...items);
        }
        res.json(allLowStock);
      }
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Customers
  app.get("/api/customers", async (req, res) => {
    try {
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : undefined;
      if (!tenantId) return res.status(400).json({ error: "tenantId is required" });
      const limit = req.query.limit ? Math.min(Number(req.query.limit), 200) : 50;
      const offset = req.query.offset ? Number(req.query.offset) : 0;
      res.json(await storage.getCustomers(req.query.search as string, tenantId, limit, offset));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/customers/count", async (req, res) => {
    try {
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : undefined;
      const search = req.query.search as string | undefined;
      res.json({ count: await storage.getCustomerCount(search, tenantId) });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Download Customers Excel Template (must be before :id route)
  app.get("/api/customers/template", (req, res) => {
    const templateData = [
      { Name: "John Doe", Phone: "+41791234567", Email: "john@example.com", Address: "123 Main St" },
      { Name: "Jane Smith", Phone: "+41799876543", Email: "jane@example.com", Address: "456 Elm Ave" },
    ];
    const ws = xlsx.utils.json_to_sheet(templateData);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Customers");
    const buf = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });
    res.setHeader("Content-Disposition", "attachment; filename=customers_template.xlsx");
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buf);
  });

  // Export Customers Excel (must be before :id route)
  app.get("/api/customers/export", async (req, res) => {
    try {
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : undefined;
      const customers = await storage.getCustomers(undefined, tenantId);
      const exportData = customers.map((c: any) => ({
        Nr: c.customerNr || "",
        Anrede: c.salutation || "",
        Namen: c.lastName || "",
        Vorname: c.firstName || "",
        Name: c.name || "",
        Firma: c.company || "",
        Phone: c.phone || "",
        Email: c.email || "",
        Strasse: c.street || "",
        StrassNr: c.streetNr || "",
        HausNr: c.houseNr || "",
        PLZ: c.postalCode || "",
        Ort: c.city || "",
        Address: c.address || "",
        HowToGo: c.howToGo || "",
        ZHD: c.zhd || "",
        ScreenInfo: c.screenInfo || "",
        LoyaltyPoints: c.loyaltyPoints || 0,
        TotalSpent: c.totalSpent || "0",
        OrderCount: c.orderCount || 0,
        AvgOrderValue: c.averageOrderValue || "0",
        FirstOrder: c.firstOrderDate || "",
        LastOrder: c.lastOrderDate || "",
        Source: c.source || "",
        Notes: c.notes || "",
        CreatedAt: c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "",
      }));
      const ws = xlsx.utils.json_to_sheet(exportData);
      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, "Customers");
      const buf = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });
      res.setHeader("Content-Disposition", "attachment; filename=customers_export.xlsx");
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.send(buf);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Phone number customer lookup (must be before :id route)
  app.get("/api/customers/phone-lookup", async (req, res) => {
    try {
      const phone = req.query.phone as string;
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : undefined;
      if (!phone) return res.status(400).json({ error: "phone is required" });
      if (!tenantId) return res.status(400).json({ error: "tenantId is required" });
      const results = await storage.findCustomerByPhone(phone, tenantId);
      res.json(results);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Bulk Import Customers (must be before :id route)
  app.post("/api/customers/import", async (req: any, res) => {
    try {
      const { fileBase64, tenantId } = req.body;
      if (!fileBase64) return res.status(400).json({ error: "fileBase64 is required" });
      const buffer = Buffer.from(fileBase64, "base64");
      const workbook = xlsx.read(buffer, { type: "buffer" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = xlsx.utils.sheet_to_json(sheet);

      const customersToInsert = data.map((item: any) => ({
        name: item.Name || item.name || "",
        email: item.Email || item.email || undefined,
        phone: String(item.Phone || item.phone || ""),
        address: item.Address || item.address || undefined,
        tenantId: tenantId ? Number(tenantId) : undefined,
        isActive: true,
      })).filter((c: any) => c.name);

      const results = await storage.bulkCreateCustomers(customersToInsert as any);
      res.json({ success: true, count: results.length });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Bulk Import from KUNDEN_ALL CSV file on disk
  app.post("/api/customers/import-csv", async (req: any, res) => {
    try {
      const tenantId = req.body.tenantId ? Number(req.body.tenantId) : undefined;
      if (!tenantId) return res.status(400).json({ error: "tenantId is required" });

      const csvPath = require("path").resolve(process.cwd(), "KUNDEN_ALL_fixed.csv");
      if (!require("fs").existsSync(csvPath)) {
        return res.status(404).json({ error: "CSV file not found on server" });
      }

      const csvContent = require("fs").readFileSync(csvPath, "utf-8");
      const lines = csvContent.split("\n");
      const headers = lines[0].replace(/\r$/, "").split(",");

      let imported = 0;
      let skipped = 0;
      const batchSize = 100;
      let batch: any[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].replace(/\r$/, "").trim();
        if (!line) { skipped++; continue; }

        // Parse CSV line handling commas inside fields
        const values: string[] = [];
        let current = "";
        let inQuotes = false;
        for (let j = 0; j < line.length; j++) {
          const ch = line[j];
          if (ch === '"') { inQuotes = !inQuotes; continue; }
          if (ch === ',' && !inQuotes) { values.push(current.trim()); current = ""; continue; }
          current += ch;
        }
        values.push(current.trim());

        // Map CSV columns: Nr,ANREDE,NAMEN,VORNAME,STRASSE,HOWTOGO,FIRMA,ZHD,ORT,PLZ,TEL1,STRASSNR,HAUSNR,QUADRAT,SCREENINFO,R1,R2,R3,R4,R5,R6,R7,R8,R9,R10,R11,R12,R13,R14,R15,R16,R17,R18,R19,R20,_source
        const nr = values[0] || "";
        const anrede = values[1] || "";
        const namen = values[2] || "";
        const vorname = values[3] || "";
        const strasse = values[4] || "";
        const howToGo = values[5] || "";
        const firma = values[6] || "";
        const zhd = values[7] || "";
        const ort = values[8] || "";
        const plz = values[9] || "";
        const tel1 = values[10] || "";
        const strassNr = values[11] || "";
        const hausNr = values[12] || "";
        const quadrat = values[13] || "";
        const screenInfo = values[14] || "";
        const r1 = values[15] || "";
        const r6 = values[20] || ""; // first order date
        const r7 = values[21] || ""; // last order date
        const r10 = values[24] || ""; // total spent
        const r11 = values[25] || ""; // average order value
        const r12 = values[26] || ""; // order count
        const _source = values[values.length - 1] || "";

        // Build full name: NAMEN + VORNAME
        const fullName = [namen, vorname].filter(s => s && s.trim()).join(", ").trim() || tel1 || "Unknown";

        // Build address: STRASSE STRASSNR HAUSNR, PLZ ORT
        const addressParts = [strasse, strassNr, hausNr].filter(s => s && s.trim()).join(" ").trim();
        const cityParts = [plz, ort].filter(s => s && s.trim()).join(" ").trim();
        const address = [addressParts, cityParts].filter(s => s).join(", ");

        // Build notes from QUADRAT, SCREENINFO, HOWTOGO
        const noteParts = [];
        if (screenInfo) noteParts.push(screenInfo);
        if (howToGo) noteParts.push(`Directions: ${howToGo}`);
        if (quadrat) noteParts.push(`Quadrat: ${quadrat}`);
        const notes = noteParts.join(" | ") || undefined;

        const customerData: any = {
          tenantId,
          name: fullName,
          phone: tel1 || undefined,
          address: address || undefined,
          notes,
          isActive: true,
          customerNr: nr ? parseInt(nr) || undefined : undefined,
          salutation: anrede || undefined,
          firstName: vorname || undefined,
          lastName: namen || undefined,
          street: strasse || undefined,
          streetNr: strassNr || undefined,
          houseNr: hausNr || undefined,
          city: ort || undefined,
          postalCode: plz || undefined,
          company: firma || undefined,
          zhd: zhd || undefined,
          howToGo: howToGo || undefined,
          screenInfo: screenInfo || undefined,
          source: _source || undefined,
          firstOrderDate: r6 || undefined,
          lastOrderDate: r7 || undefined,
          legacyTotalSpent: r10 ? String(parseFloat(r10) || 0) : "0",
          averageOrderValue: r11 ? String(parseFloat(r11) || 0) : "0",
          orderCount: r12 ? parseInt(r12) || 0 : 0,
          legacyRef: r1 || undefined,
          totalSpent: r10 ? String(parseFloat(r10) || 0) : "0",
          visitCount: r12 ? parseInt(r12) || 0 : 0,
        };

        batch.push(customerData);

        if (batch.length >= batchSize) {
          const results = await storage.bulkCreateCustomers(batch);
          imported += results.length;
          batch = [];
        }
      }

      // Insert remaining batch
      if (batch.length > 0) {
        const results = await storage.bulkCreateCustomers(batch);
        imported += results.length;
      }

      res.json({ success: true, imported, skipped, total: lines.length - 1 });
    } catch (e: any) {
      console.error("[CSV Import Error]", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/customers/:id", async (req, res) => {
    try {
      const cust = await storage.getCustomer(Number(req.params.id));
      if (!cust) return res.status(404).json({ error: "Customer not found" });
      res.json(cust);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/customers", async (req, res) => {
    try { res.json(await storage.createCustomer(sanitizeDates(req.body))); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.put("/api/customers/:id", async (req, res) => {
    try { res.json(await storage.updateCustomer(Number(req.params.id), sanitizeDates(req.body))); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.delete("/api/customers/:id", async (req, res) => {
    try { await storage.deleteCustomer(Number(req.params.id)); res.json({ success: true }); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/customers/:id/loyalty", async (req, res) => {
    try { res.json(await storage.addLoyaltyPoints(Number(req.params.id), req.body.points)); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.get("/api/customers/:id/sales", async (req, res) => {
    try { res.json(await storage.getCustomerSales(Number(req.params.id))); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Calls
  app.get("/api/calls", async (req, res) => {
    try {
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : undefined;
      const limit = req.query.limit ? Number(req.query.limit) : 500;
      const calls = await storage.getCalls(tenantId, limit);
      res.json(calls);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Sales
  app.get("/api/sales", async (req, res) => {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : undefined;
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : undefined;
      const branchId = req.query.branchId ? Number(req.query.branchId) : undefined;
      res.json(await storage.getSales({ limit, tenantId, branchId }));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.get("/api/sales/:id", async (req, res) => {
    try {
      const sale = await storage.getSale(Number(req.params.id));
      if (!sale) return res.status(404).json({ error: "Sale not found" });
      const items = await storage.getSaleItems(sale.id);
      res.json({ ...sale, items });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/sales", async (req, res) => {
    try {
      const { items, ...saleData } = sanitizeDates(req.body);
      const receiptNumber = `RCP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const sale = await storage.createSale({ ...saleData, receiptNumber });
      if (items && items.length > 0) {
        for (const item of items) {
          await storage.createSaleItem({ ...item, saleId: sale.id });
          if (saleData.branchId) {
            await storage.adjustInventory(item.productId, saleData.branchId, -item.quantity);
            await storage.createInventoryMovement({
              productId: item.productId,
              branchId: saleData.branchId,
              type: "sale",
              quantity: -item.quantity,
              referenceType: "sale",
              referenceId: sale.id,
              employeeId: saleData.employeeId,
            });
          }
        }
      }
      if (saleData.customerId) {
        const points = Math.floor(Number(saleData.totalAmount) / 10);
        await storage.addLoyaltyPoints(saleData.customerId, points);
        const existingCustomer = await storage.getCustomer(saleData.customerId);
        if (existingCustomer) {
          await storage.updateCustomer(saleData.customerId, {
            visitCount: (existingCustomer.visitCount || 0) + 1,
            totalSpent: String(Number(existingCustomer.totalSpent || 0) + Number(saleData.totalAmount)),
          });
        }
      }

      // Link call if callId was provided
      if (req.body.callId) {
        await storage.updateCall(Number(req.body.callId), { saleId: sale.id, status: "answered" });
      }

      // Log activity
      await storage.createActivityLog({
        employeeId: saleData.employeeId,
        action: "sale_created",
        entityType: "sale",
        entityId: sale.id,
        details: `Sale ${sale.receiptNumber} completed for $${saleData.totalAmount}`,
      });
      // Handle employee commission
      if (saleData.employeeId) {
        const emp = await storage.getEmployee(saleData.employeeId);
        if (emp && Number(emp.commissionRate || 0) > 0) {
          const commRate = Number(emp.commissionRate);
          const commAmount = Number(saleData.totalAmount) * (commRate / 100);
          await storage.createEmployeeCommission({
            employeeId: saleData.employeeId,
            saleId: sale.id,
            commissionRate: String(commRate),
            commissionAmount: String(commAmount.toFixed(2)),
          });
        }
      }
      // Notify admins about the sale
      const saleEmp = await storage.getEmployee(saleData.employeeId);
      await storage.notifyAdmins(
        saleData.employeeId,
        "sale_completed",
        "New Sale",
        `${saleEmp?.name || "Employee"} completed sale ${sale.receiptNumber} for $${saleData.totalAmount} (${saleData.paymentMethod || "cash"})`,
        "sale",
        sale.id
      );
      res.json(sale);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.put("/api/sales/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { items, ...saleData } = req.body;
      const sale = await storage.updateSale(id, sanitizeDates(saleData));
      if (items !== undefined) {
        await storage.deleteSaleItems(id);
        for (const item of items) {
          await storage.createSaleItem({
            saleId: id,
            productId: item.productId,
            productName: item.productName || item.name,
            quantity: item.quantity,
            unitPrice: String(item.unitPrice),
            total: String(item.total),
            modifiers: item.modifiers || [],
            notes: item.notes || null,
          });
        }
      }
      res.json(sale);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete("/api/sales/:id", async (req, res) => {
    try {
      await storage.deleteSale(Number(req.params.id));
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Suppliers
  app.get("/api/suppliers", async (req, res) => {
    try {
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : undefined;
      res.json(await storage.getSuppliers(tenantId));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.get("/api/suppliers/:id", async (req, res) => {
    try {
      const sup = await storage.getSupplier(Number(req.params.id));
      if (!sup) return res.status(404).json({ error: "Supplier not found" });
      res.json(sup);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/suppliers", async (req, res) => {
    try { res.json(await storage.createSupplier(sanitizeDates(req.body))); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.put("/api/suppliers/:id", async (req, res) => {
    try { res.json(await storage.updateSupplier(Number(req.params.id), sanitizeDates(req.body))); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Purchase Orders
  app.get("/api/purchase-orders", async (req, res) => {
    try {
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : undefined;
      res.json(await storage.getPurchaseOrders(tenantId));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/purchase-orders", async (req, res) => {
    try { res.json(await storage.createPurchaseOrder(sanitizeDates(req.body))); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.put("/api/purchase-orders/:id", async (req, res) => {
    try { res.json(await storage.updatePurchaseOrder(Number(req.params.id), sanitizeDates(req.body))); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Shifts
  app.get("/api/shifts", async (req, res) => {
    try {
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : undefined;
      res.json(await storage.getShifts(tenantId));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.get("/api/shifts/stats", async (req, res) => {
    try {
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : undefined;
      if (!tenantId) return res.status(400).json({ error: "tenantId is required" });
      res.json(await storage.getShiftStats(tenantId));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.get("/api/shifts/active", async (req, res) => {
    try {
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : undefined;
      if (!tenantId) return res.status(400).json({ error: "tenantId is required" });
      res.json(await storage.getAllActiveShifts(tenantId));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/shifts", async (req, res) => {
    try {
      const shift = await storage.createShift(sanitizeDates(req.body));
      const emp = await storage.getEmployee(shift.employeeId);
      await storage.createActivityLog({
        employeeId: shift.employeeId,
        action: "shift_started",
        entityType: "shift",
        entityId: shift.id,
        details: `Shift started by ${emp?.name || "Unknown"} with $${shift.openingCash || 0} opening cash`,
      });
      await storage.notifyAdmins(
        shift.employeeId,
        "shift_started",
        "Shift Started",
        `${emp?.name || "Employee"} has started a new shift with $${shift.openingCash || 0} opening cash`,
        "shift",
        shift.id,
        "normal"
      );
      res.json(shift);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.put("/api/shifts/:id", async (req, res) => {
    try {
      const shift = await storage.updateShift(Number(req.params.id), sanitizeDates(req.body));
      res.json(shift);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.put("/api/shifts/:id/close", async (req, res) => {
    try {
      const shift = await storage.closeShift(Number(req.params.id), sanitizeDates(req.body));
      const emp = await storage.getEmployee(shift.employeeId);
      await storage.createActivityLog({
        employeeId: shift.employeeId,
        action: "shift_closed",
        entityType: "shift",
        entityId: shift.id,
        details: `Shift closed with ${shift.totalTransactions || 0} transactions and $${shift.closingCash || 0} closing cash`,
      });
      await storage.notifyAdmins(
        shift.employeeId,
        "shift_ended",
        "Shift Ended",
        `${emp?.name || "Employee"} has ended their shift. Transactions: ${shift.totalTransactions || 0}, Sales: $${shift.totalSales || 0}`,
        "shift",
        shift.id,
        "normal"
      );
      res.json(shift);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Notifications
  app.get("/api/notifications/:employeeId", async (req, res) => {
    try { res.json(await storage.getNotifications(Number(req.params.employeeId))); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.get("/api/notifications/:employeeId/unread-count", async (req, res) => {
    try { res.json({ count: await storage.getUnreadNotificationCount(Number(req.params.employeeId)) }); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/notifications", async (req, res) => {
    try { res.json(await storage.createNotification(sanitizeDates(req.body))); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.put("/api/notifications/:id/read", async (req, res) => {
    try { res.json(await storage.markNotificationRead(Number(req.params.id))); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.put("/api/notifications/:employeeId/read-all", async (req, res) => {
    try { await storage.markAllNotificationsRead(Number(req.params.employeeId)); res.json({ success: true }); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Expenses
  app.get("/api/expenses", async (req, res) => {
    try {
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : undefined;
      res.json(await storage.getExpenses(tenantId));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/expenses", async (req, res) => {
    try { res.json(await storage.createExpense(sanitizeDates(req.body))); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Tables
  app.get("/api/tables", async (req, res) => {
    try { res.json(await storage.getTables(req.query.branchId ? Number(req.query.branchId) : undefined)); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/tables", async (req, res) => {
    try { res.json(await storage.createTable(sanitizeDates(req.body))); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.put("/api/tables/:id", async (req, res) => {
    try { res.json(await storage.updateTable(Number(req.params.id), sanitizeDates(req.body))); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Kitchen Orders
  app.get("/api/kitchen-orders", async (req, res) => {
    try { res.json(await storage.getKitchenOrders(req.query.branchId ? Number(req.query.branchId) : undefined)); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/kitchen-orders", async (req, res) => {
    try { res.json(await storage.createKitchenOrder(sanitizeDates(req.body))); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.put("/api/kitchen-orders/:id", async (req, res) => {
    try { res.json(await storage.updateKitchenOrder(Number(req.params.id), sanitizeDates(req.body))); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Subscriptions
  app.get("/api/subscription-plans", async (_req, res) => {
    try { res.json(await storage.getSubscriptionPlans()); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/subscription-plans", async (req, res) => {
    try { res.json(await storage.createSubscriptionPlan(sanitizeDates(req.body))); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.get("/api/subscriptions", async (_req, res) => {
    try { res.json(await storage.getSubscriptions()); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/subscriptions", async (req, res) => {
    try { res.json(await storage.createSubscription(sanitizeDates(req.body))); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Delete Expense
  app.delete("/api/expenses/:id", async (req, res) => {
    try { await storage.deleteExpense(Number(req.params.id)); res.json({ success: true }); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Purchase Order - single with items
  app.get("/api/purchase-orders/:id", async (req, res) => {
    try {
      const po = await storage.getPurchaseOrder(Number(req.params.id));
      if (!po) return res.status(404).json({ error: "Purchase order not found" });
      const items = await storage.getPurchaseOrderItems(po.id);
      res.json({ ...po, items });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Add item to PO
  app.post("/api/purchase-orders/:id/items", async (req, res) => {
    try {
      const item = await storage.createPurchaseOrderItem({ ...sanitizeDates(req.body), purchaseOrderId: Number(req.params.id) });
      res.json(item);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Receive PO
  app.post("/api/purchase-orders/:id/receive", async (req, res) => {
    try {
      const result = await storage.receivePurchaseOrder(Number(req.params.id), req.body.items);
      if (!result) return res.status(404).json({ error: "Purchase order not found" });
      res.json(result);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Employee shifts/attendance
  app.get("/api/employees/:id/shifts", async (req, res) => {
    try { res.json(await storage.getEmployeeAttendance(Number(req.params.id))); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Analytics
  app.get("/api/analytics/top-products", async (req, res) => {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : undefined;
      res.json(await storage.getTopProducts(limit));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.get("/api/analytics/sales-by-payment", async (_req, res) => {
    try { res.json(await storage.getSalesByPaymentMethod()); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.get("/api/analytics/sales-range", async (req, res) => {
    try {
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(0);
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
      res.json(await storage.getSalesByDateRange(startDate, endDate));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Seed data
  app.post("/api/seed", async (_req, res) => {
    try {
      const seeded = await storage.seedInitialData();
      if (!seeded) return res.json({ message: "Data already seeded" });
      res.json({ message: "Seed data created successfully" });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/fix-schema-and-seed", async (_req, res) => {
    try {
      const { db } = await import("./db");
      const { sql } = await import("drizzle-orm");

      console.log("[API-SEED] Fixing schema...");
      const tables = ['branches', 'products', 'employees', 'sales', 'inventory', 'customers', 'suppliers'];
      for (const table of tables) {
        try {
          await db.execute(sql.raw(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS tenant_id integer`));
          console.log(`[API-SEED] Table ${table} fixed`);
        } catch (e: any) {
          console.log(`[API-SEED] Table ${table} skip: ${e.message}`);
        }
      }

      const { seedAllDemoData } = await import("./seedAllDemoData");
      await seedAllDemoData();
      res.json({ success: true, message: "Schema fixed and comprehensive demo data seeded." });
    } catch (e: any) {
      console.error("Manual fix & seed error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/force-full-seed", async (_req, res) => {
    try {
      const { seedAllDemoData } = await import("./seedAllDemoData");
      await seedAllDemoData();
      res.json({ success: true, message: "Comprehensive demo data seeded successfully" });
    } catch (e: any) {
      console.error("Manual seed error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // Activity Log
  app.get("/api/activity-log", async (req, res) => {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : undefined;
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : undefined;
      res.json(await storage.getActivityLog(limit, tenantId));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Returns & Refunds
  app.get("/api/returns", async (req, res) => {
    try {
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : undefined;
      res.json(await storage.getReturns(tenantId));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.get("/api/returns/:id", async (req, res) => {
    try {
      const ret = await storage.getReturn(Number(req.params.id));
      if (!ret) return res.status(404).json({ error: "Return not found" });
      const items = await storage.getReturnItems(ret.id);
      res.json({ ...ret, items });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/returns", async (req, res) => {
    try {
      const { items, ...returnData } = sanitizeDates(req.body);
      const ret = await storage.createReturn(returnData);
      if (items && items.length > 0) {
        for (const item of items) {
          await storage.createReturnItem({ ...item, returnId: ret.id });
          if (returnData.branchId) {
            await storage.adjustInventory(item.productId, returnData.branchId, item.quantity);
            await storage.createInventoryMovement({
              productId: item.productId,
              branchId: returnData.branchId,
              type: "return",
              quantity: item.quantity,
              referenceType: "return",
              referenceId: ret.id,
              employeeId: returnData.employeeId,
            });
          }
        }
      }
      // Mark original sale as refunded
      if (returnData.originalSaleId) {
        await storage.updateSale(returnData.originalSaleId, { status: "refunded" });
      }
      // Log activity
      await storage.createActivityLog({
        employeeId: returnData.employeeId,
        action: "return_created",
        entityType: "return",
        entityId: ret.id,
        details: `Return/refund processed for sale #${returnData.originalSaleId}, amount: $${returnData.totalAmount}`,
      });
      // Notify admins about the return
      const retEmp = await storage.getEmployee(returnData.employeeId);
      await storage.notifyAdmins(
        returnData.employeeId,
        "return_processed",
        "Return Processed",
        `${retEmp?.name || "Employee"} processed a ${returnData.type || "refund"} for $${returnData.totalAmount}`,
        "return",
        ret.id,
        "high"
      );
      res.json(ret);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Cash Drawer Operations
  app.get("/api/cash-drawer/:shiftId", async (req, res) => {
    try { res.json(await storage.getCashDrawerOperations(Number(req.params.shiftId))); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/cash-drawer", async (req, res) => {
    try {
      const op = await storage.createCashDrawerOperation(sanitizeDates(req.body));
      await storage.createActivityLog({ employeeId: req.body.employeeId, action: "cash_drawer_" + req.body.type, entityType: "cash_drawer", entityId: op.id, details: `Cash drawer ${req.body.type}: $${req.body.amount}` });
      const cdEmp = await storage.getEmployee(req.body.employeeId);
      await storage.notifyAdmins(
        req.body.employeeId,
        "cash_drawer",
        `Cash Drawer: ${req.body.type}`,
        `${cdEmp?.name || "Employee"} performed ${req.body.type} of $${req.body.amount}${req.body.reason ? ` - ${req.body.reason}` : ""}`,
        "cash_drawer",
        op.id,
        req.body.type === "withdrawal" ? "high" : "normal"
      );
      res.json(op);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Warehouses
  app.get("/api/warehouses", async (req, res) => {
    try {
      const branchId = req.query.branchId ? Number(req.query.branchId) : undefined;
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : undefined;
      res.json(await storage.getWarehouses(branchId, tenantId));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/warehouses", async (req, res) => {
    try { res.json(await storage.createWarehouse(sanitizeDates(req.body))); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.put("/api/warehouses/:id", async (req, res) => {
    try { res.json(await storage.updateWarehouse(Number(req.params.id), sanitizeDates(req.body))); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Warehouse Transfers
  app.get("/api/warehouse-transfers", async (_req, res) => {
    try { res.json(await storage.getWarehouseTransfers()); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/warehouse-transfers", async (req, res) => {
    try {
      const transfer = await storage.createWarehouseTransfer(sanitizeDates(req.body));
      await storage.createInventoryMovement({ productId: req.body.productId, branchId: null, type: "transfer", quantity: req.body.quantity, referenceType: "transfer", referenceId: transfer.id, employeeId: req.body.employeeId, notes: `Transfer from warehouse ${req.body.fromWarehouseId} to ${req.body.toWarehouseId}` });
      res.json(transfer);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Product Batches
  app.get("/api/product-batches", async (req, res) => {
    try {
      const productId = req.query.productId ? Number(req.query.productId) : undefined;
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : undefined;
      res.json(await storage.getProductBatches(productId, tenantId));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/product-batches", async (req, res) => {
    try { res.json(await storage.createProductBatch(sanitizeDates(req.body))); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.put("/api/product-batches/:id", async (req, res) => {
    try { res.json(await storage.updateProductBatch(Number(req.params.id), sanitizeDates(req.body))); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.delete("/api/product-batches/:id", async (req, res) => {
    try { res.json(await storage.updateProductBatch(Number(req.params.id), { isActive: false })); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Inventory Movements
  app.get("/api/inventory-movements", async (req, res) => {
    try {
      const productId = req.query.productId ? Number(req.query.productId) : undefined;
      const limit = req.query.limit ? Number(req.query.limit) : undefined;
      res.json(await storage.getInventoryMovements(productId, limit));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Stock Counts (Physical Inventory)
  app.get("/api/stock-counts", async (_req, res) => {
    try { res.json(await storage.getStockCounts()); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.get("/api/stock-counts/:id", async (req, res) => {
    try {
      const sc = await storage.getStockCount(Number(req.params.id));
      if (!sc) return res.status(404).json({ error: "Stock count not found" });
      const items = await storage.getStockCountItems(sc.id);
      res.json({ ...sc, items });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/stock-counts", async (req, res) => {
    try {
      const { items, ...countData } = sanitizeDates(req.body);
      const sc = await storage.createStockCount(countData);
      if (items && items.length > 0) {
        for (const item of items) {
          await storage.createStockCountItem({ ...item, stockCountId: sc.id });
        }
      }
      res.json(sc);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.put("/api/stock-counts/:id/approve", async (req, res) => {
    try {
      const sc = await storage.updateStockCount(Number(req.params.id), { status: "approved", approvedBy: req.body.approvedBy });
      const items = await storage.getStockCountItems(sc.id);
      for (const item of items) {
        if (item.actualQuantity !== null && item.difference !== null && item.difference !== 0) {
          await storage.adjustInventory(item.productId, sc.branchId, item.difference);
          await storage.createInventoryMovement({ productId: item.productId, branchId: sc.branchId, type: "count", quantity: item.difference, referenceType: "manual", referenceId: sc.id, notes: `Stock count adjustment: system ${item.systemQuantity} → actual ${item.actualQuantity}` });
        }
      }
      await storage.createActivityLog({ employeeId: req.body.approvedBy, action: "stock_count_approved", entityType: "stock_count", entityId: sc.id, details: `Stock count #${sc.id} approved with ${sc.discrepancies || 0} discrepancies` });
      res.json(sc);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Supplier Contracts
  app.get("/api/supplier-contracts", async (req, res) => {
    try { res.json(await storage.getSupplierContracts(req.query.supplierId ? Number(req.query.supplierId) : undefined)); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/supplier-contracts", async (req, res) => {
    try { res.json(await storage.createSupplierContract(sanitizeDates(req.body))); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.put("/api/supplier-contracts/:id", async (req, res) => {
    try { res.json(await storage.updateSupplierContract(Number(req.params.id), sanitizeDates(req.body))); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Employee Commissions
  app.get("/api/employee-commissions", async (req, res) => {
    try { res.json(await storage.getEmployeeCommissions(req.query.employeeId ? Number(req.query.employeeId) : undefined)); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/employee-commissions", async (req, res) => {
    try { res.json(await storage.createEmployeeCommission(sanitizeDates(req.body))); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Advanced Analytics
  app.get("/api/analytics/employee-sales/:id", async (req, res) => {
    try { res.json(await storage.getEmployeeSalesReport(Number(req.params.id))); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.get("/api/analytics/slow-moving", async (req, res) => {
    try { res.json(await storage.getSlowMovingProducts(req.query.days ? Number(req.query.days) : 30)); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.get("/api/analytics/profit-by-product", async (_req, res) => {
    try { res.json(await storage.getProfitByProduct()); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.get("/api/analytics/cashier-performance", async (_req, res) => {
    try { res.json(await storage.getCashierPerformance()); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.get("/api/analytics/returns-report", async (_req, res) => {
    try { res.json(await storage.getReturnsReport()); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Daily Sales Report (for Tagesabschluss print)
  app.get("/api/reports/daily-sales-report", async (req, res) => {
    try {
      const date = req.query.date as string || new Date().toISOString().split("T")[0];
      const startOfDay = new Date(date + "T00:00:00.000Z");
      const endOfDay = new Date(date + "T23:59:59.999Z");
      const salesData = await storage.getSalesWithCustomerByDateRange(startOfDay, endOfDay);
      res.json(salesData);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Report Exports
  app.get("/api/reports/sales-export", async (req, res) => {
    try {
      const startDate = req.query.startDate as string || "2000-01-01";
      const endDate = req.query.endDate as string || "2099-12-31";
      const salesData = await storage.getSalesByDateRange(new Date(startDate), new Date(endDate));

      const headers = ["Receipt #", "Date", "Total", "Payment Method", "Status", "Employee ID", "Customer ID"];
      const rows = salesData.map((s: any) => [
        s.receiptNumber || `#${s.id}`,
        new Date(s.createdAt).toLocaleString(),
        Number(s.totalAmount).toFixed(2),
        s.paymentMethod,
        s.status,
        s.employeeId,
        s.customerId || "Walk-in",
      ]);

      const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename=sales-report-${startDate}-to-${endDate}.csv`);
      res.send(csv);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // CSV Export for Inventory
  app.get("/api/reports/inventory-export", async (_req, res) => {
    try {
      const allProducts = await storage.getProducts();
      const headers = ["ID", "Name", "Category", "Barcode", "Price", "Cost Price", "Stock Qty", "Low Stock Threshold", "Status"];
      const rows = allProducts.map((p: any) => [
        p.id,
        `"${p.name}"`,
        p.categoryId,
        p.barcode || "N/A",
        Number(p.price).toFixed(2),
        Number(p.costPrice || 0).toFixed(2),
        p.stockQuantity || 0,
        p.lowStockThreshold || 10,
        p.isActive ? "Active" : "Inactive",
      ]);

      const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=inventory-report.csv");
      res.send(csv);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // CSV Export for Profit Report
  app.get("/api/reports/profit-export", async (_req, res) => {
    try {
      const profitData = await storage.getProfitByProduct();
      const headers = ["Product", "Total Sold", "Revenue", "Total Cost", "Profit", "Cost Price"];
      const rows = profitData.map((p: any) => [
        `"${p.productName}"`,
        p.totalSold,
        Number(p.totalRevenue).toFixed(2),
        Number(p.totalCost).toFixed(2),
        Number(p.profit).toFixed(2),
        Number(p.costPrice).toFixed(2),
      ]);

      const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=profit-report.csv");
      res.send(csv);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // CSV Export for Employee Performance
  app.get("/api/reports/employee-performance-export", async (_req, res) => {
    try {
      const perfData = await storage.getCashierPerformance();
      const headers = ["Employee", "Role", "Sales Count", "Total Revenue", "Avg Sale Value"];
      const rows = perfData.map((p: any) => [
        `"${p.employeeName}"`,
        p.role,
        p.salesCount,
        Number(p.totalRevenue).toFixed(2),
        Number(p.avgSaleValue).toFixed(2),
      ]);

      const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=employee-performance-report.csv");
      res.send(csv);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Smart Predictions / Analytics
  app.get("/api/analytics/predictions", async (req, res) => {
    try {
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : undefined;
      const stats = await storage.getDashboardStats(tenantId);
      const limit = 10;
      const topProducts = stats.topProducts || [];
      const slowMoving = await storage.getSlowMovingProducts(30); // Need to update slowMoving to tenantId if needed
      const allProds = tenantId ? await storage.getProductsByTenant(tenantId) : await storage.getProducts();
      let lowStockData: any[] = [];
      if (tenantId) {
        const tenantBranches = await storage.getBranchesByTenant(tenantId);
        for (const branch of tenantBranches) {
          const items = await storage.getLowStockItems(branch.id);
          lowStockData.push(...items);
        }
      } else {
        lowStockData = await storage.getLowStockItems();
      }

      // Simple predictions based on trends
      const avgDailyRevenue = Number(stats.monthRevenue || 0) / 30;
      const projectedMonthly = avgDailyRevenue * 30;
      const projectedYearly = avgDailyRevenue * 365;

      // Stock predictions
      const stockAlerts = lowStockData.map((item: any) => {
        const prod = allProds.find((p: any) => p.id === item.productId);
        return {
          productId: item.productId,
          productName: prod?.name || `Product #${item.productId}`,
          currentStock: item.quantity || 0,
          threshold: item.lowStockThreshold || 10,
          urgency: (item.quantity || 0) <= 5 ? "critical" : "warning",
          recommendation: `Reorder ${Math.max(50 - (item.quantity || 0), 20)} units`,
        };
      });

      // Best performing categories
      const categoryPerf = topProducts.reduce((acc: any, p: any) => {
        const prod = allProds.find((pr: any) => pr.id === p.productId);
        const catId = prod?.categoryId || 0;
        if (!acc[catId]) acc[catId] = { revenue: 0, count: 0 };
        acc[catId].revenue += Number(p.revenue || 0);
        acc[catId].count += Number(p.totalSold || 0);
        return acc;
      }, {});

      res.json({
        projectedMonthlyRevenue: projectedMonthly,
        projectedYearlyRevenue: projectedYearly,
        avgDailyRevenue,
        totalActiveProducts: allProds.filter((p: any) => p.isActive).length,
        slowMovingCount: slowMoving.length,
        topSellingProducts: topProducts.slice(0, 5).map((p: any) => ({
          name: p.name,
          revenue: Number(p.revenue || 0),
          soldCount: Number(p.totalSold || 0),
        })),
        stockAlerts,
        categoryPerformance: Object.entries(categoryPerf).map(([catId, data]: any) => ({
          categoryId: Number(catId),
          revenue: data.revenue,
          itemsSold: data.count,
        })),
        insights: [
          avgDailyRevenue > 0 ? `Average daily revenue: $${avgDailyRevenue.toFixed(2)}` : "No sales data yet for predictions",
          slowMoving.length > 0 ? `${slowMoving.length} products with low sales in the last 30 days - consider promotions` : "All products are selling well",
          stockAlerts.filter((a: any) => a.urgency === "critical").length > 0 ? `${stockAlerts.filter((a: any) => a.urgency === "critical").length} products critically low on stock - reorder immediately` : "Stock levels are healthy",
        ],
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Object Storage - Public file serving
  app.get("/public-objects/*filePath", async (req, res) => {
    const filePath = (req.params as any).filePath;
    const objectStorageService = new ObjectStorageService();
    try {
      const file = await objectStorageService.searchPublicObject(filePath);
      if (!file) return res.status(404).json({ error: "File not found" });
      objectStorageService.downloadObject(file, res);
    } catch (error) {
      console.error("Error serving public object:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Object Storage - Private file serving
  app.get("/objects/*objectPath", async (req, res) => {
    // First try local uploads directory (fast path — no env vars needed)
    const uploadsDir = path.resolve(process.cwd(), "uploads");
    const filename = req.path.replace(/^\/objects\//, "");
    const localPath = path.join(uploadsDir, filename);
    if (fs.existsSync(localPath)) {
      return res.sendFile(localPath);
    }

    // Fall back to object storage (GCS), return 404 on any failure
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      // Any error here (missing config, not found, network) → 404
      return res.sendStatus(404);
    }
  });

  // Object Storage - Upload image (local filesystem)
  app.post("/api/objects/upload", async (req: Request, res: Response) => {
    try {
      const { imageData, contentType = "image/jpeg" } = req.body;
      if (!imageData) {
        return res.status(400).json({ error: "imageData is required" });
      }
      const uploadsDir = path.resolve(process.cwd(), "uploads");
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
      const ext = (contentType.split("/")[1] || "jpg").split(";")[0];
      const filename = `${randomUUID()}.${ext}`;
      const filePath = path.join(uploadsDir, filename);
      const buffer = Buffer.from(imageData, "base64");
      fs.writeFileSync(filePath, buffer);
      const objectPath = `/objects/${filename}`;
      res.json({ objectPath });
    } catch (error: any) {
      console.error("Error uploading file:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Object Storage - Save uploaded image path (kept for compatibility)
  app.put("/api/images/save", async (req: Request, res: Response) => {
    const { imageURL } = req.body;
    if (!imageURL) {
      return res.status(400).json({ error: "imageURL is required" });
    }
    res.status(200).json({ objectPath: imageURL });
  });

  // Create product with initial stock
  app.post("/api/products-with-stock", async (req, res) => {
    try {
      const { initialStock, branchId, ...productData } = sanitizeDates(req.body);
      const product = await storage.createProduct(productData);
      if (initialStock && initialStock > 0 && branchId) {
        await storage.upsertInventory({ productId: product.id, branchId: Number(branchId), quantity: Number(initialStock) });
        await storage.createInventoryMovement({
          productId: product.id, branchId: Number(branchId), type: "purchase",
          quantity: Number(initialStock), referenceType: "manual", notes: "Initial stock on product creation",
        });
      }
      res.json(product);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Get active shift for employee
  app.get("/api/shifts/active/:employeeId", async (req, res) => {
    try {
      // Pass the tenantId if provided to getShifts
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : undefined;
      const shifts = await storage.getShifts(tenantId);
      const active = shifts.find((s: any) => s.employeeId === Number(req.params.employeeId) && s.status === "open");
      res.json(active || null);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Get store settings (main branch + tenant info)
  app.get("/api/store-settings", async (req: any, res) => {
    try {
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : undefined;
      let branches = [];
      if (tenantId) {
        branches = await storage.getBranchesByTenant(tenantId);
      } else {
        branches = await storage.getBranches();
      }

      const mainBranch = branches.find((b: any) => b.isMain) || branches[0];
      if (!mainBranch) return res.status(404).json({ error: "No branch found" });

      const tenant = mainBranch.tenantId ? await storage.getTenant(mainBranch.tenantId) : null;
      res.json({
        ...mainBranch,
        storeType: tenant?.storeType || "supermarket",
        commissionRate: 0, // commission is baked into product prices via applyMarkup
        whatsappAdminPhone: (tenant?.metadata as any)?.whatsappAdminPhone || "",
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Update store settings (update main branch + tenant storeType)
  app.put("/api/store-settings", async (req: any, res) => {
    try {
      const { storeType, tenantId: bodyTenantId, ...branchData } = sanitizeDates(req.body);
      // Use tenantId from query or body to find the right branch
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : (bodyTenantId ? Number(bodyTenantId) : undefined);

      let branches = [];
      if (tenantId) {
        branches = await storage.getBranchesByTenant(tenantId);
      } else {
        branches = await storage.getBranches();
      }

      const mainBranch = branches.find((b: any) => b.isMain) || branches[0];
      if (!mainBranch) return res.status(404).json({ error: "No branch found" });

      const { whatsappAdminPhone, ...cleanBranchData } = branchData;
      const updatedBranch = await storage.updateBranch(mainBranch.id, cleanBranchData);
      if (mainBranch.tenantId) {
        const tenantUpdates: any = {};
        if (storeType) tenantUpdates.storeType = storeType;
        if (whatsappAdminPhone !== undefined) {
          const existingTenant = await storage.getTenant(mainBranch.tenantId as number);
          tenantUpdates.metadata = { ...(existingTenant?.metadata as any || {}), whatsappAdminPhone: whatsappAdminPhone.replace(/\D/g, "") };
        }
        if (Object.keys(tenantUpdates).length > 0) {
          await storage.updateTenant(mainBranch.tenantId as number, tenantUpdates);
        }
      }

      res.json({ ...updatedBranch, storeType, whatsappAdminPhone: whatsappAdminPhone?.replace(/\D/g, "") || "" });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Update system language (app + store website)
  app.put("/api/system-language", async (req: any, res) => {
    try {
      const { language } = req.body;
      if (!["en", "ar", "de"].includes(language)) {
        return res.status(400).json({ error: "Invalid language. Must be en, ar, or de" });
      }
      const tenantId = req.tenantId;
      if (!tenantId) return res.status(401).json({ error: "Not authorized" });
      await storage.upsertLandingPageConfig(tenantId, { language } as any);
      res.json({ success: true, language });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Simulate Caller ID (for testing from Settings UI)
  app.post("/api/caller-id/simulate", async (req, res) => {
    const { phoneNumber, tenantId: bodyTenantId } = req.body;
    const tenantId = bodyTenantId || (req as any).tenantId;
    await callerIdService.handleIncomingCall(phoneNumber || "0551234567", undefined, tenantId ? Number(tenantId) : undefined);
    res.json({ success: true });
  });

  // Test page for caller-id (browser GET)
  app.get("/api/caller-id/incoming", (_req, res) => {
    res.send(`<!DOCTYPE html><html><head><title>Caller ID Test</title>
<style>body{font-family:sans-serif;max-width:400px;margin:40px auto;padding:20px}
input,button{display:block;width:100%;margin:8px 0;padding:10px;font-size:16px;box-sizing:border-box}
button{background:#2563eb;color:#fff;border:none;border-radius:6px;cursor:pointer}
#result{margin-top:16px;padding:12px;border-radius:6px;display:none}
.ok{background:#d1fae5;color:#065f46}.err{background:#fee2e2;color:#991b1b}</style></head>
<body><h2>Caller ID Test</h2>
<input id="phone" placeholder="Phone number" value="01012345678"/>
<input id="secret" placeholder="Bridge secret" value="fritzbridge-secret-change-me"/>
<button onclick="test()">Simulate Incoming Call</button>
<div id="result"></div>
<script>
async function test(){
  const r=document.getElementById('result');
  r.style.display='block';r.className='';r.textContent='Sending...';
  try{
    const res=await fetch('/api/caller-id/incoming',{method:'POST',
      headers:{'Content-Type':'application/json','x-bridge-secret':document.getElementById('secret').value},
      body:JSON.stringify({phoneNumber:document.getElementById('phone').value,tenantId:1,slot:1})});
    const d=await res.json();
    r.className=res.ok?'ok':'err';
    r.textContent=res.ok?'✓ Success! Check POS for popup.':'✗ '+JSON.stringify(d);
  }catch(e){r.className='err';r.textContent='✗ '+e.message;}
}
</script></body></html>`);
  });

  // HTTP polling fallback — returns active calls for the requesting tenant
  app.get("/api/caller-id/active-calls", (req, res) => {
    const tenantId = (req as any).tenantId || Number(req.query.tenantId);
    if (!tenantId) return res.status(400).json({ error: "tenantId required" });
    const calls = callerIdService.getActiveCallsForTenant(Number(tenantId));
    res.json({ calls });
  });

  // Incoming call from local FRITZ!Card bridge (secured by CALLER_ID_BRIDGE_SECRET)
  app.post("/api/caller-id/incoming", async (req, res) => {
    try {
      const secret = (req.headers["x-bridge-secret"] as string) || req.body.secret;
      if (process.env.CALLER_ID_BRIDGE_SECRET && secret !== process.env.CALLER_ID_BRIDGE_SECRET) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const { phoneNumber, slot } = req.body;
      // tenantId can come from the body (hardware bridge) or from the license-key auth middleware
      const tenantId = req.body.tenantId || (req as any).tenantId;
      const callInfo = await callerIdService.handleIncomingCall(
        phoneNumber || "0123456789",
        slot ? Number(slot) : undefined,
        tenantId ? Number(tenantId) : undefined
      );
      // Web Push: notify all subscribed browsers (even closed tabs)
      const customerName = (callInfo as any)?.customer?.name;
      const customerAddress = (callInfo as any)?.customer?.address;
      pushService.notifyIncomingCall(phoneNumber || "0123456789", tenantId ? Number(tenantId) : undefined, customerName, customerAddress).catch(() => { });
      res.json({ success: true });
    } catch (e: any) {
      console.error("[CallerID] Error handling incoming call:", e);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ── Web Push Subscription ─────────────────────────────────────────────────
  app.get("/api/push/vapid-public-key", (_req, res) => {
    res.json({ publicKey: pushService.publicKey });
  });

  app.post("/api/push/subscribe", (req, res) => {
    const sub = req.body;
    if (!sub || !sub.endpoint) return res.status(400).json({ error: "Invalid subscription" });
    const tenantId = (req as any).tenantId;
    if (!tenantId) return res.status(401).json({ error: "Tenant identification required" });
    pushService.subscribe(sub, tenantId);
    res.json({ success: true });
  });

  app.post("/api/push/unsubscribe", (req, res) => {
    const { endpoint } = req.body;
    if (endpoint) pushService.unsubscribe(endpoint);
    res.json({ success: true });
  });

  // Helper: sort categories by keyword-based priority
  function sortCategoriesByPriority(cats: any[]) {
    const getPriority = (name: string) => {
      const n = name.toLowerCase();
      // Level 1: Core Mains (Pizza, etc.)
      if (/pizza|بيتزا|calzone|pide|lahmacun|burger|burg|sandwich|wrap|grill|shawarma|شاورما/.test(n)) return 1;
      // Level 2: Other Mains
      if (/pasta|meal|main|plate|chicken|meat|fish|teller|nuggets|schnitzel|kebab|دجاج|لحم|سمك/.test(n)) return 2;
      // Level 3: Snacks/Starters
      if (/appetizer|starter|finger|snack|مقبلات|فاتح/.test(n)) return 3;
      // Level 5: Default (unlisted food etc.)
      // Level 6: Salads
      if (/salad|سلطة/.test(n)) return 6;
      // Level 7: Desserts
      if (/dessert|sweet|حلوى|حلويات|baklava|tiramisu/.test(n)) return 7;
      // Level 8: Drinks
      if (/drink|beverage|juice|water|coke|cola|bier|beer|wine|alcohol|عصير|مشروب/.test(n)) return 8;
      // Level 9: Non-food
      if (/tabak|tobacco|cigarette/.test(n)) return 9;
      return 5;
    };
    return [...cats].sort((a, b) => {
      // Prioritize manual sortOrder first. If both are 0 or equal, fall back to keyword priority
      const aOrder = a.sortOrder || 0;
      const bOrder = b.sortOrder || 0;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return getPriority(a.name) - getPriority(b.name);
    });
  }

  app.get("/api/store/:tenantId/menu", async (req, res) => {
    try {
      const tenantId = Number(req.params.tenantId);
      if (!tenantId || isNaN(tenantId)) {
        return res.status(400).json({ error: "Valid tenantId is required" });
      }
      const tenant = await storage.getTenant(tenantId);
      if (!tenant) {
        return res.status(404).json({ error: "Store not found" });
      }
      const categories = sortCategoriesByPriority(await storage.getCategories(tenantId));
      const products = await storage.getProductsByTenant(tenantId);

      const categoryOrder = categories.map((c: any) => c.id);
      products.sort((a: any, b: any) => categoryOrder.indexOf(a.categoryId) - categoryOrder.indexOf(b.categoryId));

      const config = await storage.getLandingPageConfig(tenantId);
      res.json({
        store: {
          id: tenant.id,
          name: tenant.businessName,
          logo: tenant.logo,
          storeType: tenant.storeType,
        },
        config: config || null,
        products,
        categories,
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── Online Orders ──────────────────────────────────────────────────────────
  // Public: get store info + menu by slug (for landing page)
  app.get("/api/store-public/:slug", async (req, res) => {
    try {
      const { slug } = req.params;
      const config = await storage.getLandingPageConfigBySlug(slug);
      if (!config) return res.status(404).json({ error: "Store not found" });
      if (!config.isPublished) return res.status(404).json({ error: "Store is currently unavailable" });

      const tenant = await storage.getTenant(config.tenantId);
      let products = await storage.getProductsByTenant(config.tenantId);

      const commissionRate = await storage.getCommissionRate();
      if (commissionRate > 0) {
        const factor = 1 + (commissionRate / 100);
        products = products.map((p: any) => {
          const rawPrice = parseFloat(p.price) * factor;
          const rounded = Math.round(rawPrice * 2) / 2; // nearest 0.5
          return { ...p, price: rounded.toFixed(2) };
        });
      }

      const categories = sortCategoriesByPriority(await storage.getCategories(config.tenantId));

      // Sort products by category index
      const categoryOrder = categories.map((c: any) => c.id);
      products.sort((a: any, b: any) => categoryOrder.indexOf(a.categoryId) - categoryOrder.indexOf(b.categoryId));

      res.json({ config, tenant, products, categories });
    } catch (e: any) {
      console.error(`[API] Public store error for ${req.params.slug}:`, e);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Public: create online order
  app.post("/api/online-orders/public", async (req, res) => {
    try {
      const { slug, tenantId: bodyTenantId, ...orderData } = req.body;
      let resolvedTenantId: number | undefined;
      if (slug) {
        const config = await storage.getLandingPageConfigBySlug(slug);
        if (config) resolvedTenantId = config.tenantId;
      }
      if (!resolvedTenantId && bodyTenantId) {
        resolvedTenantId = Number(bodyTenantId);
      }
      if (!resolvedTenantId) return res.status(404).json({ error: "Store not found" });

      const orderNumber = `ONL-${Date.now().toString().slice(-6)}`;
      const order = await storage.createOnlineOrder({
        ...orderData,
        tenantId: resolvedTenantId,
        orderNumber,
        paymentStatus: orderData.paymentMethod === "cash" ? "pending" : "pending",
        status: "pending",
      });

      // ── Auto-save new customer ────────────────────────────────────────────
      try {
        const { customerName, customerPhone, customerEmail, customerAddress } = orderData;
        if (customerName) {
          let existing: any[] = [];
          if (customerPhone) {
            existing = await storage.findCustomerByPhone(customerPhone, resolvedTenantId);
          }
          if (existing.length === 0) {
            await storage.createCustomer({
              tenantId: resolvedTenantId,
              name: customerName,
              phone: customerPhone || null,
              email: customerEmail || null,
              address: customerAddress || null,
            });
          }
        }
      } catch (autoErr) {
        console.error("[AutoCustomer] Failed to auto-save customer from online order:", autoErr);
      }

      // Track platform commission
      try {
        const commissionRate = await storage.getCommissionRate();
        const saleTotal = parseFloat(orderData.totalAmount || "0");
        const commissionAmount = saleTotal * commissionRate / (100 + commissionRate);
        if (commissionAmount > 0) {
          await storage.createPlatformCommission({
            tenantId: resolvedTenantId,
            orderId: order.id,
            saleTotal: String(saleTotal.toFixed(2)),
            commissionRate: String(commissionRate),
            commissionAmount: String(commissionAmount.toFixed(2)),
            status: "pending",
          });
        }
      } catch (commErr) {
        console.error("[Commission] Failed to track commission:", commErr);
      }

      // Broadcast to connected POS clients for this tenant (WebSocket)
      callerIdService.broadcast({
        type: "new_online_order",
        order,
      }, resolvedTenantId);
      // Web Push: notify even closed browser tabs
      pushService.notifyNewOrder(orderNumber, orderData.totalAmount || "0").catch(() => { });

      // ── WhatsApp notifications ────────────────────────────────
      try {
        const tenant = await storage.getTenant(resolvedTenantId);
        const storeName = tenant?.businessName || "Online Store";
        // Get store-specific admin phone from metadata, fallback to global platform setting
        const storeAdminPhone = (tenant?.metadata as any)?.whatsappAdminPhone as string | undefined;
        const globalAdminPhone = await storage.getPlatformSetting("whatsapp_admin_phone");
        const adminPhone = storeAdminPhone || globalAdminPhone || undefined;
        // Notify admin
        await whatsappService.sendOrderNotification({
          orderNumber,
          customerName: orderData.customerName,
          customerPhone: orderData.customerPhone,
          customerAddress: orderData.customerAddress,
          items: orderData.items || [],
          subtotal: orderData.subtotal,
          deliveryFee: orderData.deliveryFee,
          totalAmount: orderData.totalAmount,
          orderType: orderData.orderType || "delivery",
          paymentMethod: orderData.paymentMethod || "cash",
          notes: orderData.notes,
        }, storeName, adminPhone);
        // Confirm to customer
        if (orderData.customerPhone) {
          await whatsappService.sendCustomerConfirmation(
            orderData.customerPhone,
            orderNumber,
            storeName,
            orderData.totalAmount,
          );
        }
      } catch (waErr) {
        console.error("[WhatsApp] Failed to send order notifications:", waErr);
      }

      res.json(order);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Internal: list online orders
  app.get("/api/online-orders", async (req, res) => {
    try {
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : undefined;
      const status = req.query.status as string | undefined;
      const orders = await storage.getOnlineOrders(tenantId, status);
      res.json(orders);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Internal: update online order status
  app.put("/api/online-orders/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const order = await storage.updateOnlineOrder(id, req.body);

      // Broadcast status update to all clients
      callerIdService.broadcast({ type: "online_order_updated", order });
      // Notify SSE clients tracking this order
      if ((app as any)._broadcastOrderStatus) {
        (app as any)._broadcastOrderStatus(id, { type: "status_update", order });
      }

      // WhatsApp status update to customer
      if (req.body.status && (order as any).customerPhone) {
        try {
          const tenant = (order as any).tenantId ? await storage.getTenant((order as any).tenantId) : null;
          const storeName = tenant?.businessName || "Store";
          await whatsappService.sendStatusUpdate(
            (order as any).customerPhone,
            (order as any).orderNumber,
            req.body.status,
            storeName,
          );
        } catch (waErr) {
          console.error("[WhatsApp] Failed to send status update:", waErr);
        }
      }

      res.json(order);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Internal: delete online order
  app.delete("/api/online-orders/:id", async (req, res) => {
    try {
      await storage.deleteOnlineOrder(Number(req.params.id));
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ── WhatsApp Integration ───────────────────────────────────────────────────
  app.get("/api/super-admin/whatsapp/status", requireSuperAdmin as any, async (_req: any, res: any) => {
    res.json(whatsappService.getStatus());
  });

  app.post("/api/super-admin/whatsapp/connect", requireSuperAdmin as any, async (_req: any, res: any) => {
    try {
      const result = await whatsappService.connect();
      const qr = whatsappService.getQrCode();
      res.json({ ...result, qrCode: qr });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/super-admin/whatsapp/disconnect", requireSuperAdmin as any, async (_req: any, res: any) => {
    await whatsappService.disconnect();
    res.json({ success: true });
  });

  app.get("/api/super-admin/whatsapp/qr", requireSuperAdmin as any, async (_req: any, res: any) => {
    const qr = whatsappService.getQrCode();
    res.json({ qrCode: qr });
  });

  app.get("/api/super-admin/whatsapp/session-info", requireSuperAdmin as any, async (_req: any, res: any) => {
    try {
      const pathMod = await import("path");
      const fsMod = await import("fs");
      const tokenDir = pathMod.resolve(process.cwd(), ".wppconnect", "tokens");
      let hasSession = false;
      let sessionModified: string | null = null;
      if (fsMod.existsSync(tokenDir)) {
        const files = fsMod.readdirSync(tokenDir).filter((f: string) => f.endsWith(".data.json") || f.endsWith(".json"));
        if (files.length > 0) {
          hasSession = true;
          const stat = fsMod.statSync(pathMod.join(tokenDir, files[0]));
          sessionModified = stat.mtime.toISOString();
        }
      }
      res.json({ hasSession, sessionModified });
    } catch (e: any) { res.json({ hasSession: false, sessionModified: null, error: e.message }); }
  });

  app.post("/api/super-admin/whatsapp/test", requireSuperAdmin as any, async (req: any, res: any) => {
    const globalPhone = await storage.getPlatformSetting("whatsapp_admin_phone");
    const targetPhone = (req.body?.phone || globalPhone || "").replace(/\D/g, "");
    if (!targetPhone) return res.status(400).json({ error: "No phone number specified and no global admin phone configured" });
    const sent = await whatsappService.sendText(
      targetPhone,
      "🧪 *Test Message*\n\nThis is a test from Barmagly POS WhatsApp integration.\n\n✅ If you receive this, the connection is working!"
    );
    res.json({ success: sent, phone: targetPhone });
  });

  // Get/set global WhatsApp admin phone (super-admin default)
  app.get("/api/super-admin/whatsapp/admin-phone", requireSuperAdmin as any, async (_req: any, res: any) => {
    try {
      const phone = await storage.getPlatformSetting("whatsapp_admin_phone");
      res.json({ phone: phone || "" });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.put("/api/super-admin/whatsapp/admin-phone", requireSuperAdmin as any, async (req: any, res: any) => {
    try {
      const { phone } = req.body;
      if (phone === undefined) return res.status(400).json({ error: "phone required" });
      await storage.setPlatformSetting("whatsapp_admin_phone", phone.replace(/\D/g, ""));
      res.json({ success: true, phone: phone.replace(/\D/g, "") });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Get/set per-store WhatsApp admin phone
  app.get("/api/super-admin/whatsapp/store-phone/:tenantId", requireSuperAdmin as any, async (req: any, res: any) => {
    try {
      const tenant = await storage.getTenant(Number(req.params.tenantId));
      if (!tenant) return res.status(404).json({ error: "Tenant not found" });
      const phone = (tenant.metadata as any)?.whatsappAdminPhone || "";
      res.json({ phone });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.put("/api/super-admin/whatsapp/store-phone/:tenantId", requireSuperAdmin as any, async (req: any, res: any) => {
    try {
      const tenant = await storage.getTenant(Number(req.params.tenantId));
      if (!tenant) return res.status(404).json({ error: "Tenant not found" });
      const phone = (req.body?.phone || "").replace(/\D/g, "");
      const metadata = { ...(tenant.metadata as any || {}), whatsappAdminPhone: phone };
      await storage.updateTenant(Number(req.params.tenantId), { metadata });
      res.json({ success: true, phone });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ── Landing Page Config ────────────────────────────────────────────────────
  app.get("/api/landing-page-config", async (req, res) => {
    try {
      const tenantId = Number(req.query.tenantId);
      if (!tenantId) return res.status(400).json({ error: "tenantId required" });
      const config = await storage.getLandingPageConfig(tenantId);
      res.json(config || null);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.put("/api/landing-page-config", requireSuperAdmin as any, async (req: any, res: any) => {
    try {
      const { tenantId, ...data } = req.body;
      if (!tenantId) return res.status(400).json({ error: "tenantId required" });
      const config = await storage.upsertLandingPageConfig(Number(tenantId), data);
      res.json(config);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ── Public commission rate ─────────────────────────────────────────────────
  app.get("/api/store-public/commission-rate", async (_req, res) => {
    try {
      const rate = await storage.getCommissionRate();
      res.json({ rate });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ── Stripe Payment Intent ──────────────────────────────────────────────────
  app.post("/api/create-payment-intent", async (req, res) => {
    try {
      const { amount, currency, tenantId } = req.body;
      const stripe = await getUncachableStripeClient();
      const amountInCents = Math.round(parseFloat(amount) * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: (currency || "chf").toLowerCase(),
        metadata: { tenantId: String(tenantId || ""), source: "online_order" },
      });
      res.json({ clientSecret: paymentIntent.client_secret, publishableKey: await getStripePublishableKey() });
    } catch (e: any) {
      console.error("[Stripe] PaymentIntent error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // ── SSE: Customer order status tracking ───────────────────────────────────
  const orderSseClients: Map<number, Set<any>> = new Map();

  app.get("/api/online-orders/:id/status-stream", (req, res) => {
    const orderId = Number(req.params.id);
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    if (!orderSseClients.has(orderId)) orderSseClients.set(orderId, new Set());
    orderSseClients.get(orderId)!.add(res);

    res.write(`data: ${JSON.stringify({ type: "connected" })}\n\n`);

    const keepAlive = setInterval(() => res.write(`: ping\n\n`), 25000);
    req.on("close", () => {
      clearInterval(keepAlive);
      orderSseClients.get(orderId)?.delete(res);
    });
  });

  (app as any)._broadcastOrderStatus = (orderId: number, data: object) => {
    const clients = orderSseClients.get(orderId);
    if (clients) {
      const msg = `data: ${JSON.stringify(data)}\n\n`;
      clients.forEach((c: any) => { try { c.write(msg); } catch { } });
    }
  };

  // ── Public Restaurant Store page ───────────────────────────────────────────
  app.get("/store/:slug", async (req, res) => {
    try {
      const { slug } = req.params;
      const config = await storage.getLandingPageConfigBySlug(slug);
      if (!config || !config.isPublished) {
        return res.status(404).send("<h1>Store not found</h1>");
      }
      const templatePath = path.resolve(process.cwd(), "server", "templates", "restaurant-store.html");
      let html = fs.readFileSync(templatePath, "utf8");

      const branches = await storage.getBranchesByTenant(config.tenantId);
      const currency = branches?.[0]?.currency || "CHF";

      html = html.replace(/\{\{SLUG\}\}/g, slug);
      html = html.replace(/\{\{TENANT_ID\}\}/g, String(config.tenantId));
      html = html.replace(/\{\{PRIMARY_COLOR\}\}/g, config.primaryColor || "#2FD3C6");
      html = html.replace(/\{\{ACCENT_COLOR\}\}/g, config.accentColor || "#6366F1");
      html = html.replace(/\{\{CURRENCY\}\}/g, currency);
      html = html.replace(/\{\{LANGUAGE\}\}/g, (config as any).language || "en");
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.send(html);
    } catch (e: any) {
      console.error("[store/:slug] Error:", e);
      res.status(500).send("<h1>Server error</h1>");
    }
  });

  // ── Tenant Backup & Restore (accessible from mobile app via license-key auth) ─
  const TENANT_BACKUP_DIR = path.resolve(process.cwd(), "backups");
  if (!fs.existsSync(TENANT_BACKUP_DIR)) fs.mkdirSync(TENANT_BACKUP_DIR, { recursive: true });

  // List backups for this tenant
  app.get("/api/backup/list", async (req: any, res) => {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) return res.status(401).json({ error: "Not authorized" });
      const files = fs.readdirSync(TENANT_BACKUP_DIR)
        .filter(f => f.startsWith(`backup_tenant_${tenantId}_`) && f.endsWith(".json"))
        .map(f => {
          const stat = fs.statSync(path.join(TENANT_BACKUP_DIR, f));
          return { filename: f, size: stat.size, createdAt: stat.mtime.toISOString() };
        })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      res.json(files);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Create backup for this tenant
  app.post("/api/backup/create", async (req: any, res) => {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) return res.status(401).json({ error: "Not authorized" });
      const tenant = await storage.getTenant(tenantId);
      if (!tenant) return res.status(404).json({ error: "Tenant not found" });

      const [branches, employees, products, categories, customers] = await Promise.all([
        storage.getBranchesByTenant(tenantId),
        storage.getEmployeesByTenant(tenantId),
        storage.getProductsByTenant(tenantId),
        storage.getCategories(tenantId),
        storage.getCustomers(undefined, tenantId),
      ]);
      let inventory: any[] = [];
      let expenses: any[] = [];
      for (const b of branches) {
        try { const inv = await storage.getInventory(b.id, tenantId); inventory.push(...inv); } catch { }
      }
      try { expenses = await storage.getExpenses(tenantId); } catch { }
      const sales = await storage.getSales({ tenantId, limit: 10000 });

      const snapshot = {
        version: "2.0",
        exportedAt: new Date().toISOString(),
        tenantId,
        tenant: { ...tenant, passwordHash: "[REDACTED]" },
        branches,
        employees: employees.map((e: any) => ({ ...e, pin: "[REDACTED]", passwordHash: "[REDACTED]" })),
        categories, products, inventory, customers, expenses,
        sales: sales.slice(0, 5000),
      };
      const filename = `backup_tenant_${tenantId}_${Date.now()}.json`;
      const filepath = path.join(TENANT_BACKUP_DIR, filename);
      fs.writeFileSync(filepath, JSON.stringify(snapshot));
      const stat = fs.statSync(filepath);
      console.log(`[BACKUP] Manual by tenant ${tenantId}: ${filename} (${Math.round(stat.size / 1024)}KB)`);
      res.json({ success: true, filename, size: stat.size, createdAt: stat.mtime.toISOString() });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Restore backup for this tenant
  app.post("/api/backup/restore/:filename", async (req: any, res) => {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) return res.status(401).json({ error: "Not authorized" });
      const filename = path.basename(req.params.filename);
      // Security: only allow own backups
      if (!filename.startsWith(`backup_tenant_${tenantId}_`)) {
        return res.status(403).json({ error: "Not authorized to restore this backup" });
      }
      const filepath = path.join(TENANT_BACKUP_DIR, filename);
      if (!fs.existsSync(filepath)) return res.status(404).json({ error: "Backup not found" });
      const snapshot = JSON.parse(fs.readFileSync(filepath, "utf-8"));

      const restored: Record<string, number> = { branches: 0, categories: 0, products: 0, customers: 0, expenses: 0 };

      // Restore categories
      if (snapshot.categories?.length) {
        const existingCats = await storage.getCategories(tenantId);
        for (const c of snapshot.categories) {
          try {
            if (!existingCats.find((ec: any) => ec.name === c.name)) {
              await storage.createCategory({ ...c, id: undefined, tenantId });
              restored.categories++;
            }
          } catch { }
        }
      }

      // Restore products (upsert)
      if (snapshot.products?.length) {
        const existingProducts = await storage.getProductsByTenant(tenantId);
        const freshCats = await storage.getCategories(tenantId);
        const catMap = new Map(freshCats.map((c: any) => [c.name, c.id]));
        const origCatMap = new Map((snapshot.categories || []).map((c: any) => [c.id, c.name]));
        for (const p of snapshot.products) {
          try {
            let newCatId = p.categoryId;
            if (p.categoryId && origCatMap.has(p.categoryId)) {
              newCatId = catMap.get(origCatMap.get(p.categoryId)) ?? p.categoryId;
            }
            const match = p.barcode
              ? existingProducts.find((ep: any) => ep.barcode === p.barcode)
              : existingProducts.find((ep: any) => ep.name === p.name);
            if (match) {
              await storage.updateProduct(match.id, { name: p.name, price: p.price, costPrice: p.costPrice, description: p.description, isActive: p.isActive, categoryId: newCatId });
            } else {
              await storage.createProduct({ ...p, id: undefined, tenantId, categoryId: newCatId });
            }
            restored.products++;
          } catch { }
        }
      }

      // Restore customers (skip dups)
      if (snapshot.customers?.length) {
        const existingCustomers = await storage.getCustomers(undefined, tenantId);
        const existingEmails = new Set(existingCustomers.filter((c: any) => c.email).map((c: any) => c.email?.toLowerCase()));
        for (const c of snapshot.customers) {
          try {
            if (!c.email || !existingEmails.has(c.email.toLowerCase())) {
              await storage.createCustomer({ ...c, id: undefined, tenantId });
              restored.customers++;
            }
          } catch { }
        }
      }

      res.json({ success: true, tenantId, restored });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Delete a tenant's own backup
  app.delete("/api/backup/:filename", async (req: any, res) => {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) return res.status(401).json({ error: "Not authorized" });
      const filename = path.basename(req.params.filename);
      if (!filename.startsWith(`backup_tenant_${tenantId}_`)) {
        return res.status(403).json({ error: "Not authorized" });
      }
      const filepath = path.join(TENANT_BACKUP_DIR, filename);
      if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ── Vehicles / Fleet Management ────────────────────────────────────────────
  app.get("/api/vehicles", async (req, res) => {
    try {
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : undefined;
      const branchId = req.query.branchId ? Number(req.query.branchId) : undefined;
      res.json(await storage.getVehicles(tenantId, branchId));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/vehicles", async (req, res) => {
    try { res.json(await storage.createVehicle(req.body)); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.put("/api/vehicles/:id", async (req, res) => {
    try { res.json(await storage.updateVehicle(Number(req.params.id), req.body)); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.delete("/api/vehicles/:id", async (req, res) => {
    try { await storage.deleteVehicle(Number(req.params.id)); res.json({ success: true }); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ── Printer Configurations ─────────────────────────────────────────────────
  app.get("/api/printer-configs", async (req, res) => {
    try {
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : 1;
      const branchId = req.query.branchId ? Number(req.query.branchId) : undefined;
      res.json(await storage.getPrinterConfigs(tenantId, branchId));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/printer-configs", async (req, res) => {
    try { res.json(await storage.upsertPrinterConfig(req.body)); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ── Daily Closings (TAGESABSCHLUSS) ───────────────────────────────────────
  app.get("/api/daily-closings", async (req, res) => {
    try {
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : 1;
      const branchId = req.query.branchId ? Number(req.query.branchId) : undefined;
      res.json(await storage.getDailyClosings(tenantId, branchId));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/daily-closings", async (req, res) => {
    try {
      const { tenantId, branchId, closingDate } = req.body;
      // Auto-compute from today's sales
      const today = closingDate || new Date().toISOString().split("T")[0];
      const startOfDay = new Date(today + "T00:00:00.000Z");
      const endOfDay = new Date(today + "T23:59:59.999Z");
      const daySales = await storage.getSalesByDateRange(startOfDay, endOfDay);
      const totalSales = daySales.reduce((s: number, sale: any) => s + Number(sale.totalAmount || 0), 0);
      const totalCash = daySales.filter((s: any) => s.paymentMethod === "cash").reduce((a: number, s: any) => a + Number(s.totalAmount || 0), 0);
      const totalCard = daySales.filter((s: any) => s.paymentMethod === "card").reduce((a: number, s: any) => a + Number(s.totalAmount || 0), 0);
      const totalMobile = daySales.filter((s: any) => s.paymentMethod === "mobile").reduce((a: number, s: any) => a + Number(s.totalAmount || 0), 0);
      const totalDiscounts = daySales.reduce((s: number, sale: any) => s + Number(sale.discountAmount || 0), 0);
      const dc = await storage.createDailyClosing({
        tenantId, branchId: branchId || null, employeeId: req.body.employeeId || null,
        closingDate: today,
        totalSales: String(totalSales), totalCash: String(totalCash),
        totalCard: String(totalCard), totalMobile: String(totalMobile),
        totalTransactions: daySales.length,
        totalReturns: "0", totalDiscounts: String(totalDiscounts),
        openingCash: String(req.body.openingCash || 0),
        closingCash: String(req.body.closingCash || 0),
        notes: req.body.notes || null,
        status: "closed",
      });
      res.json(dc);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ── Monthly Closings (MONATSABSCHLUSS) ────────────────────────────────────
  app.get("/api/monthly-closings", async (req, res) => {
    try {
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : 1;
      const branchId = req.query.branchId ? Number(req.query.branchId) : undefined;
      res.json(await storage.getMonthlyClosings(tenantId, branchId));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/monthly-closings", async (req, res) => {
    try {
      const { tenantId, branchId, closingMonth } = req.body;
      const month = closingMonth || new Date().toISOString().slice(0, 7);
      const startOfMonth = new Date(month + "-01T00:00:00.000Z");
      const endOfMonth = new Date(new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 0).toISOString().split("T")[0] + "T23:59:59.999Z");
      const monthSales = await storage.getSalesByDateRange(startOfMonth, endOfMonth);
      const totalSales = monthSales.reduce((s: number, sale: any) => s + Number(sale.totalAmount || 0), 0);
      const totalCash = monthSales.filter((s: any) => s.paymentMethod === "cash").reduce((a: number, s: any) => a + Number(s.totalAmount || 0), 0);
      const totalCard = monthSales.filter((s: any) => s.paymentMethod === "card").reduce((a: number, s: any) => a + Number(s.totalAmount || 0), 0);
      const totalMobile = monthSales.filter((s: any) => s.paymentMethod === "mobile").reduce((a: number, s: any) => a + Number(s.totalAmount || 0), 0);
      const totalDiscounts = monthSales.reduce((s: number, sale: any) => s + Number(sale.discountAmount || 0), 0);
      const expenses = await storage.getExpensesByDateRange(startOfMonth, endOfMonth);
      const totalExpenses = expenses.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
      const mc = await storage.createMonthlyClosing({
        tenantId, branchId: branchId || null, employeeId: req.body.employeeId || null,
        closingMonth: month,
        totalSales: String(totalSales), totalCash: String(totalCash),
        totalCard: String(totalCard), totalMobile: String(totalMobile),
        totalTransactions: monthSales.length,
        totalReturns: "0", totalDiscounts: String(totalDiscounts),
        totalExpenses: String(totalExpenses),
        netRevenue: String(totalSales - totalExpenses),
        notes: req.body.notes || null,
        status: "closed",
      });
      res.json(mc);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  const httpServer = createServer(app);

  // Auto-seeding removed – only Pizza Lemon is seeded from index.ts

  return httpServer;
}
