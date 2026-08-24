import type { Express, Request, Response } from "express";
import * as bcrypt from "bcrypt";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { storage } from "./storage";
import { generateToken, requireSuperAdmin, SuperAdminRequest } from "./superAdminAuth";
import { addMonths, addYears, addDays } from "date-fns";
import { db, pool } from "./db";
import { eq, ne, or, isNull, inArray, desc, sql, and, gte, lte, sum } from "drizzle-orm";
import { rateLimit } from "./rateLimit";
import { refundPayment, currencyFor, stripeAccountStatus } from "./paymentService";

/**
 * Raw SQL escape hatch. The Stripe columns (stripe_payment_intent_id, paid_at,
 * amount_refunded, …) and the stripe_webhook_events table are created by
 * stripeMigrations.ts, not by the drizzle schema, so they are unreachable
 * through `storage` and have to be read directly.
 */
async function q(text: string, params: any[] = []): Promise<any[]> {
  const [rows] = await pool.query(text, params);
  return Array.isArray(rows) ? (rows as any[]) : [];
}

// ── BACKUP HELPERS ────────────────────────────────────────────────────────
const BACKUP_DIR = path.resolve(process.cwd(), "backups");
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

async function createTenantBackup(tenantId: number): Promise<string> {
  const tenant = await storage.getTenant(tenantId);
  if (!tenant) throw new Error("Tenant not found");

  const [branches, employees, products, categories, customers, subs, licenses] = await Promise.all([
    storage.getBranchesByTenant(tenantId),
    storage.getEmployeesByTenant(tenantId),
    storage.getProductsByTenant(tenantId),
    storage.getCategories(tenantId),
    storage.getCustomers(undefined, tenantId),
    storage.getTenantSubscriptions(tenantId),
    storage.getLicenseKeys(tenantId),
  ]);

  // Fetch inventory, expenses, purchase orders
  const allBranchIds = branches.map((b: any) => b.id);
  let inventory: any[] = [];
  let expenses: any[] = [];
  for (const bid of allBranchIds) {
    try {
      const inv = await storage.getInventory(bid, tenantId);
      inventory.push(...inv);
    } catch { }
  }
  try { expenses = await storage.getExpenses(tenantId); } catch { }

  const sales = await storage.getSales({ tenantId, limit: 50000 });

  const snapshot = {
    version: "2.0",
    exportedAt: new Date().toISOString(),
    tenantId,
    tenant: { ...tenant, passwordHash: "[REDACTED]" },
    branches,
    employees: employees.map((e: any) => ({ ...e, pin: "[REDACTED]", passwordHash: "[REDACTED]" })),
    categories,
    products,
    inventory,
    customers,
    expenses,
    sales: sales.slice(0, 10000), // cap at 10k for size
    subscriptions: subs,
    licenses: licenses.map((l: any) => ({ ...l })),
  };

  const filename = `backup_tenant_${tenantId}_${Date.now()}.json`;
  const filepath = path.join(BACKUP_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(snapshot, null, 2));
  console.log(`[BACKUP] Created ${filename} (${Math.round(fs.statSync(filepath).size / 1024)}KB)`);
  return filename;
}

// Prune backups older than 30 days
function pruneOldBackups() {
  try {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    fs.readdirSync(BACKUP_DIR).forEach(f => {
      const fp = path.join(BACKUP_DIR, f);
      if (fs.statSync(fp).mtimeMs < cutoff) fs.unlinkSync(fp);
    });
  } catch (e) { console.error("[BACKUP] Prune error:", e); }
}

// Auto-backup scheduler (runs once a day)
let autoBackupInterval: ReturnType<typeof setInterval> | null = null;
function startAutoBackup() {
  if (autoBackupInterval) return;
  autoBackupInterval = setInterval(async () => {
    console.log("[BACKUP] Running daily auto-backup…");
    pruneOldBackups();
    try {
      const tenants = await storage.getTenants();
      for (const t of tenants) {
        try { await createTenantBackup(t.id); } catch (e) { console.error(`[BACKUP] Failed for tenant ${t.id}:`, e); }
      }
      console.log(`[BACKUP] Done – ${tenants.length} stores backed up.`);
    } catch (e) { console.error("[BACKUP] Error:", e); }
  }, 24 * 60 * 60 * 1000); // 24 h
}
startAutoBackup();

export function registerSuperAdminRoutes(app: Express) {
  // ── AUTH ──────────────────────────────────────────────────────────────
  // Brute-force guard on the highest-value credential in the system: a
  // successful guess here reaches every tenant's data.
  app.post(
    "/api/super-admin/login",
    rateLimit({ name: "sa-login-ip", max: 10, windowMs: 15 * 60 * 1000, message: "Too many login attempts. Try again in a few minutes." }),
    rateLimit({
      name: "sa-login-email",
      max: 5,
      windowMs: 15 * 60 * 1000,
      keyFn: (req) => String((req.body as any)?.email || "").toLowerCase().slice(0, 160),
      message: "Too many login attempts for this account. Try again in a few minutes.",
    }),
    async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }
      const admin = await storage.getSuperAdminByEmail(email);
      if (!admin || !admin.isActive) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      const valid = await bcrypt.compare(password, admin.passwordHash);
      if (!valid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      const token = generateToken(admin.id, admin.email, admin.role || "super_admin");
      res.json({ token, admin: { id: admin.id, name: admin.name, email: admin.email, role: admin.role } });
    } catch (e: any) {
      console.error("Super admin login error:", e);
      res.status(500).json({ error: "Server error" });
    }
  });

  // ── DASHBOARD STATS ───────────────────────────────────────────────────
  app.get("/api/super-admin/stats", requireSuperAdmin, async (_req: Request, res: Response) => {
    try {
      const stats = await storage.getSuperAdminDashboardStats();
      res.json(stats);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── ANALYTICS ─────────────────────────────────────────────────────────
  app.get("/api/super-admin/analytics/overview", requireSuperAdmin, async (_req: Request, res: Response) => {
    try {
      const { tenants, tenantSubscriptions, licenseKeys, branches, employees, products, sales, customers } = await import("@shared/schema");

      const [totalTenants] = await db.select({ count: sql<number>`count(*)` }).from(tenants);
      const [activeTenants] = await db.select({ count: sql<number>`count(*)` }).from(tenants).where(eq(tenants.status, "active"));
      const [totalSubs] = await db.select({ count: sql<number>`count(*)` }).from(tenantSubscriptions);
      const [activeSubs] = await db.select({ count: sql<number>`count(*)` }).from(tenantSubscriptions).where(eq(tenantSubscriptions.status, "active"));
      const [totalLicenses] = await db.select({ count: sql<number>`count(*)` }).from(licenseKeys);
      const [activeLicenses] = await db.select({ count: sql<number>`count(*)` }).from(licenseKeys).where(eq(licenseKeys.status, "active"));
      const [totalBranches] = await db.select({ count: sql<number>`count(*)` }).from(branches);
      const [totalEmployees] = await db.select({ count: sql<number>`count(*)` }).from(employees);
      const [totalProducts] = await db.select({ count: sql<number>`count(*)` }).from(products);
      const [totalSales] = await db.select({ count: sql<number>`count(*)` }).from(sales);
      const [totalCustomers] = await db.select({ count: sql<number>`count(*)` }).from(customers);
      const [revenueRow] = await db.select({ total: sql<string>`cast(coalesce(sum(cast(price as decimal(10,2))), 0) as char)` }).from(tenantSubscriptions).where(eq(tenantSubscriptions.status, "active"));
      const [salesRevenue] = await db.select({ total: sql<string>`cast(coalesce(sum(cast(total_amount as decimal(12,2))), 0) as char)` }).from(sales);

      // Expiring subs within 7 days
      const in7Days = new Date(); in7Days.setDate(in7Days.getDate() + 7);
      const now = new Date();
      const [expiringSubs] = await db.select({ count: sql<number>`count(*)` }).from(tenantSubscriptions)
        .where(and(eq(tenantSubscriptions.status, "active"), lte(tenantSubscriptions.endDate, in7Days), gte(tenantSubscriptions.endDate, now)));

      res.json({
        totalTenants: Number(totalTenants?.count || 0),
        activeTenants: Number(activeTenants?.count || 0),
        totalSubscriptions: Number(totalSubs?.count || 0),
        activeSubscriptions: Number(activeSubs?.count || 0),
        expiringSubscriptions: Number(expiringSubs?.count || 0),
        totalLicenses: Number(totalLicenses?.count || 0),
        activeLicenses: Number(activeLicenses?.count || 0),
        totalBranches: Number(totalBranches?.count || 0),
        totalEmployees: Number(totalEmployees?.count || 0),
        totalProducts: Number(totalProducts?.count || 0),
        totalSales: Number(totalSales?.count || 0),
        totalCustomers: Number(totalCustomers?.count || 0),
        subscriptionRevenue: parseFloat(revenueRow?.total || "0"),
        totalSalesRevenue: parseFloat(salesRevenue?.total || "0"),
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/super-admin/analytics/revenue", requireSuperAdmin, async (_req: Request, res: Response) => {
    try {
      const { tenantSubscriptions, tenants } = await import("@shared/schema");
      const allTenants = await storage.getTenants();
      const allSubs = await storage.getTenantSubscriptions();

      // Revenue per tenant
      const revenueByTenant = allTenants.map(t => {
        const tenantSubs = allSubs.filter((s: any) => s.tenantId === t.id && s.status === "active");
        const rev = tenantSubs.reduce((acc: number, s: any) => acc + parseFloat(s.price || "0"), 0);
        return { tenantId: t.id, businessName: t.businessName, revenue: rev, subCount: tenantSubs.length };
      }).filter((t: any) => t.revenue > 0).sort((a: any, b: any) => b.revenue - a.revenue);

      // Monthly breakdown (last 6 months)
      const monthly: any[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
        const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        const monthSubs = allSubs.filter((s: any) => {
          const created = new Date(s.createdAt);
          return created >= monthStart && created <= monthEnd;
        });
        const monthRev = monthSubs.reduce((acc: number, s: any) => acc + parseFloat(s.price || "0"), 0);
        monthly.push({
          month: d.toLocaleString("en-US", { month: "short", year: "2-digit" }),
          revenue: monthRev,
          count: monthSubs.length
        });
      }

      // Plan breakdown
      const planBreakdown: Record<string, { count: number; revenue: number }> = {};
      allSubs.filter((s: any) => s.status === "active").forEach((s: any) => {
        const plan = s.planType || "unknown";
        if (!planBreakdown[plan]) planBreakdown[plan] = { count: 0, revenue: 0 };
        planBreakdown[plan].count++;
        planBreakdown[plan].revenue += parseFloat(s.price || "0");
      });

      res.json({ revenueByTenant, monthly, planBreakdown });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/super-admin/analytics/sales", requireSuperAdmin, async (_req: Request, res: Response) => {
    try {
      const allTenants = await storage.getTenants();
      const result = [];
      let grandTotal = 0;
      let grandCount = 0;

      for (const t of allTenants) {
        const tenantSales = await storage.getSales({ tenantId: t.id, limit: 1000 });
        const total = tenantSales.reduce((acc: number, s: any) => acc + parseFloat(s.totalAmount || "0"), 0);
        grandTotal += total;
        grandCount += tenantSales.length;

        // Today's sales
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const todaySales = tenantSales.filter((s: any) => new Date(s.createdAt) >= today);
        const todayTotal = todaySales.reduce((acc: number, s: any) => acc + parseFloat(s.totalAmount || "0"), 0);

        result.push({
          tenantId: t.id,
          businessName: t.businessName,
          totalSales: tenantSales.length,
          totalRevenue: total,
          todaySales: todaySales.length,
          todayRevenue: todayTotal,
        });
      }

      result.sort((a, b) => b.totalRevenue - a.totalRevenue);
      res.json({ tenants: result, grandTotal, grandCount });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/super-admin/analytics/activity", requireSuperAdmin, async (_req: Request, res: Response) => {
    try {
      const log = await storage.getActivityLog(100);
      res.json(log);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── TENANT NOTIFICATIONS ──────────────────────────────────────────────
  app.get("/api/super-admin/tenant-notifications", requireSuperAdmin, async (_req: Request, res: Response) => {
    try {
      const notifs = await storage.getTenantNotifications();
      res.json(notifs);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/super-admin/tenant-notifications", requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const { tenantId, title, message, type, priority } = req.body;
      if (!tenantId || !title || !message) {
        return res.status(400).json({ error: "tenantId, title, and message are required" });
      }
      const notif = await storage.createTenantNotification({
        tenantId, title, message,
        type: type || "info",
        priority: priority || "normal",
        isRead: false,
      });
      res.json(notif);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/super-admin/tenant-notifications/broadcast", requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const { title, message, type, priority } = req.body;
      if (!title || !message) {
        return res.status(400).json({ error: "title and message are required" });
      }
      const allTenants = await storage.getTenants();
      const results = [];
      for (const t of allTenants) {
        const notif = await storage.createTenantNotification({
          tenantId: t.id, title, message,
          type: type || "info",
          priority: priority || "normal",
          isRead: false,
        });
        results.push(notif);
      }
      res.json({ success: true, sent: results.length });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.patch("/api/super-admin/tenant-notifications/:id/read", requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id as string);
      const notif = await storage.updateTenantNotification(id, { isRead: true });
      res.json(notif);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── TENANTS ───────────────────────────────────────────────────────────
  app.get("/api/super-admin/tenants", requireSuperAdmin, async (_req: Request, res: Response) => {
    try {
      const list = await storage.getTenants();
      res.json(list);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/super-admin/tenants/:id", requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id as string);
      const tenant = await storage.getTenant(id);
      if (!tenant) return res.status(404).json({ error: "Tenant not found" });
      const branches = await storage.getBranchesByTenant(id);
      const employees = await storage.getEmployeesByTenant(id);
      const products = await storage.getProductsByTenant(id);
      const subs = await storage.getTenantSubscriptions(id);
      const licenses = await storage.getLicenseKeys(id);
      const customers = await storage.getCustomers(undefined, id);
      res.json({ ...tenant, branches, employees, products, subscriptions: subs, licenses, customerCount: customers.length });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/super-admin/tenants", requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const { businessName, ownerName, ownerEmail, ownerPhone, status, maxBranches, maxEmployees, storeType, address } = req.body;
      const passwordHash = await bcrypt.hash("admin123", 10);
      const tenant = await storage.createTenant({
        businessName, ownerName, ownerEmail,
        ownerPhone: ownerPhone || null,
        address: address || null,
        passwordHash, status: status || "active",
        maxBranches: maxBranches || 1,
        maxEmployees: maxEmployees || 5,
        storeType: storeType || "supermarket",
      });

      // Automatically create a 14-day trial subscription and license key
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
        notes: "Auto-generated Trial for Dashboard creation",
      });

      // Ensure default data (branch/admin)
      await storage.ensureTenantData(tenant.id);

      res.json({ ...tenant, licenseKey });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.patch("/api/super-admin/tenants/:id", requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id as string);
      const tenant = await storage.updateTenant(id, req.body);
      res.json(tenant);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/super-admin/tenants/:id", requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id as string);
      await storage.deleteTenant(id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Reset tenant password
  app.post("/api/super-admin/tenants/:id/reset-password", requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id as string);
      const { newPassword } = req.body;
      const passwordHash = await bcrypt.hash(newPassword || "admin123", 10);
      await storage.updateTenant(id, { passwordHash } as any);
      res.json({ success: true, message: "Password reset successfully" });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── SUBSCRIPTIONS ─────────────────────────────────────────────────────
  app.get("/api/super-admin/subscriptions", requireSuperAdmin, async (_req: Request, res: Response) => {
    try {
      const subs = await storage.getTenantSubscriptions();
      // Enrich with tenant names
      const tenantList = await storage.getTenants();
      const tenantMap = Object.fromEntries(tenantList.map((t: any) => [t.id, t]));

      // The Stripe columns live outside the drizzle schema; without them the UI
      // cannot tell a Stripe-billed subscription from a hand-typed one.
      const billingMap: Record<number, any> = {};
      try {
        const rows = await q(
          `SELECT id, stripe_customer_id, stripe_subscription_id, stripe_price_id,
                  last_invoice_id, last_payment_error
             FROM tenant_subscriptions`,
        );
        for (const r of rows) {
          billingMap[Number(r.id)] = {
            stripeCustomerId: r.stripe_customer_id || null,
            stripeSubscriptionId: r.stripe_subscription_id || null,
            stripePriceId: r.stripe_price_id || null,
            lastInvoiceId: r.last_invoice_id || null,
            lastPaymentError: r.last_payment_error || null,
          };
        }
      } catch (e: any) {
        // Migration has not run on this database yet - report the plain row.
        console.warn("[super-admin] subscription Stripe columns unavailable:", e?.message || e);
      }

      const enriched = subs.map((s: any) => ({
        ...s,
        tenant: tenantMap[s.tenantId] || null,
        ...(billingMap[s.id] || {}),
      }));
      res.json(enriched);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/super-admin/subscriptions", requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const { tenantId, planType, planName, price, status, autoRenew, paymentMethod } = req.body;
      const startDate = new Date();
      let endDate = new Date();
      if (planType === "monthly") endDate = addMonths(startDate, 1);
      else if (planType === "yearly") endDate = addYears(startDate, 1);
      else endDate = addDays(startDate, 30);

      const sub = await storage.createTenantSubscription({
        tenantId, planType: planType || "trial", planName: planName || "Starter",
        price: price || "0", status: status || "active",
        startDate, endDate, autoRenew: autoRenew || false,
        paymentMethod: paymentMethod || "manual",
      });
      res.json(sub);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.patch("/api/super-admin/subscriptions/:id", requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id as string);
      const sub = await storage.updateTenantSubscription(id, req.body);
      res.json(sub);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/super-admin/subscriptions/:id", requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id as string);
      await storage.deleteTenantSubscription(id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Extend subscription.
  //
  // Tenant access is gated on license_keys.expiresAt (see tenantAuth.ts), NOT on
  // tenant_subscriptions.endDate. Bumping only the subscription row therefore
  // renewed the invoice and left the customer locked out - this button did not
  // renew anything. Both dates now move together, in one transaction, or
  // neither moves.
  app.post("/api/super-admin/subscriptions/:id/extend", requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id as string);
      const months = Number(req.body?.months) || 0;
      const days = Number(req.body?.days) || 0;
      if (months <= 0 && days <= 0) {
        return res.status(400).json({ error: "Provide a positive number of days or months" });
      }

      const sub = await storage.getTenantSubscription(id);
      if (!sub) return res.status(404).json({ error: "Subscription not found" });

      // Extending a lapsed subscription from its old end date can land in the
      // past and renew nothing, so anything already expired restarts from now.
      const now = new Date();
      const currentEnd = sub.endDate ? new Date(sub.endDate) : now;
      const base = currentEnd > now ? currentEnd : now;
      const newEnd = months > 0 ? addMonths(base, months) : addDays(base, days);

      const { tenantSubscriptions, licenseKeys } = await import("@shared/schema");
      // Revoked keys stay revoked: revocation is a deliberate act, not a lapse.
      const renewable = and(
        eq(licenseKeys.tenantId, sub.tenantId),
        or(isNull(licenseKeys.status), ne(licenseKeys.status, "revoked")),
      );

      let licenseTotal = 0;
      let licensesUpdated = 0;
      await db.transaction(async (tx) => {
        await tx.update(tenantSubscriptions)
          .set({ endDate: newEnd, status: "active", updatedAt: now })
          .where(eq(tenantSubscriptions.id, id));

        const keys = await tx
          .select({ id: licenseKeys.id, expiresAt: licenseKeys.expiresAt })
          .from(licenseKeys)
          .where(renewable);
        licenseTotal = keys.length;

        // A key is only ever moved forward. One that already runs past the new
        // end date (a yearly key on a monthly plan) must not be cut short.
        const behind = keys.filter((k) => !k.expiresAt || new Date(k.expiresAt) < newEnd).map((k) => k.id);
        if (behind.length) {
          await tx.update(licenseKeys)
            .set({ expiresAt: newEnd, status: "active", updatedAt: now })
            .where(inArray(licenseKeys.id, behind));
        }
        licensesUpdated = behind.length;
      });

      const updated = await storage.getTenantSubscription(id);
      res.json({ ...updated, licenseTotal, licensesUpdated, licenseExpiresAt: licensesUpdated ? newEnd : null });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── LICENSE KEYS ──────────────────────────────────────────────────────
  app.get("/api/super-admin/licenses", requireSuperAdmin, async (_req: Request, res: Response) => {
    try {
      const keys = await storage.getLicenseKeys();
      const tenantList = await storage.getTenants();
      const tenantMap = Object.fromEntries(tenantList.map((t: any) => [t.id, t]));
      const enriched = keys.map((k: any) => ({ ...k, tenant: tenantMap[k.tenantId] || null }));
      res.json(enriched);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/super-admin/licenses/generate", requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const { tenantId, subscriptionId, maxActivations, expiresAt, notes, customKey } = req.body;
      const segments = Array.from({ length: 4 }, () => crypto.randomBytes(2).toString("hex").toUpperCase());
      const licenseKey = customKey || `KASSENTA-${segments.join("-")}`;

      const key = await storage.createLicenseKey({
        licenseKey, tenantId,
        subscriptionId: subscriptionId || null,
        status: "active",
        maxActivations: maxActivations || 3,
        expiresAt: expiresAt ? new Date(expiresAt) : addYears(new Date(), 1),
        notes: notes || null,
      });
      res.json(key);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.patch("/api/super-admin/licenses/:id", requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id as string);
      const key = await storage.updateLicenseKey(id, req.body);
      res.json(key);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.patch("/api/super-admin/licenses/:id/revoke", requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id as string);
      const key = await storage.updateLicenseKey(id, { status: "revoked" });
      res.json(key);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/super-admin/licenses/:id", requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id as string);
      const { licenseKeys } = await import("@shared/schema");
      await db.delete(licenseKeys).where(eq(licenseKeys.id, id));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── PAYMENTS ──────────────────────────────────────────────────────────
  // A read-only window onto what Stripe actually charged. Every row here is
  // written by the signed webhook (stripeWebhook.ts); nothing on this surface
  // marks a record paid, and the refund route below deliberately does not
  // write back either.

  /** Stripe accepts only these three reasons; anything else is dropped. */
  const REFUND_REASONS = ["duplicate", "fraudulent", "requested_by_customer"] as const;
  type RefundReason = (typeof REFUND_REASONS)[number];

  /** One row per charge, unioned across the tables that can hold one. */
  function paymentSources(opts: {
    source: string;
    stripeOnly: boolean;
    tenantId: number | null;
    status: string | null;
  }): { sql: string; params: any[] } {
    const parts: string[] = [];
    const params: any[] = [];

    if (opts.source === "all" || opts.source === "online_order") {
      let where = "1 = 1";
      if (opts.stripeOnly) where += " AND o.stripe_payment_intent_id IS NOT NULL";
      if (opts.tenantId) { where += " AND o.tenant_id = ?"; params.push(opts.tenantId); }
      if (opts.status) { where += " AND o.payment_status = ?"; params.push(opts.status); }
      parts.push(
        `SELECT 'online_order' AS source, o.id AS rowId, o.order_number AS reference,
                o.tenant_id AS tenantId, o.total_amount AS amount,
                COALESCE(o.amount_refunded, 0) AS refunded,
                o.payment_method AS method, o.payment_status AS status,
                o.stripe_payment_intent_id AS paymentIntentId,
                o.stripe_charge_id AS chargeId, o.stripe_refund_id AS refundId,
                o.payment_error AS paymentError, o.paid_at AS paidAt, o.created_at AS createdAt
           FROM online_orders o
          WHERE ${where}`,
      );
    }

    if (opts.source === "all" || opts.source === "pos_sale") {
      // sales carries no tenant_id of its own; it hangs off the branch.
      let where = "1 = 1";
      if (opts.stripeOnly) where += " AND s.stripe_payment_intent_id IS NOT NULL";
      if (opts.tenantId) { where += " AND b.tenant_id = ?"; params.push(opts.tenantId); }
      if (opts.status) { where += " AND s.payment_status = ?"; params.push(opts.status); }
      parts.push(
        `SELECT 'pos_sale' AS source, s.id AS rowId, s.receipt_number AS reference,
                b.tenant_id AS tenantId, s.total_amount AS amount,
                NULL AS refunded,
                s.payment_method AS method, s.payment_status AS status,
                s.stripe_payment_intent_id AS paymentIntentId,
                s.stripe_charge_id AS chargeId, s.stripe_refund_id AS refundId,
                NULL AS paymentError, s.paid_at AS paidAt, s.created_at AS createdAt
           FROM sales s
           LEFT JOIN branches b ON b.id = s.branch_id
          WHERE ${where}`,
      );
    }

    return { sql: parts.join(" UNION ALL "), params };
  }

  app.get("/api/super-admin/payments", requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const source = ["online_order", "pos_sale"].includes(String(req.query.source))
        ? String(req.query.source)
        : "all";
      // The default view is Stripe traffic only; cash till sales would bury it.
      const stripeOnly = String(req.query.includeOffline || "") !== "1";
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) || null : null;
      const status = req.query.status ? String(req.query.status).slice(0, 40) : null;
      const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);

      const union = paymentSources({ source, stripeOnly, tenantId, status });

      let rows: any[] = [];
      let totals: any = {};
      try {
        rows = await q(
          `SELECT * FROM ( ${union.sql} ) p
            ORDER BY COALESCE(p.paidAt, p.createdAt) DESC
            LIMIT ?`,
          [...union.params, limit],
        );
        const agg = await q(
          `SELECT COUNT(*) AS n,
                  SUM(CASE WHEN p.status IN ('paid','completed') THEN p.amount ELSE 0 END) AS collected,
                  SUM(COALESCE(p.refunded, 0)) AS refunded,
                  SUM(CASE WHEN p.status = 'failed' THEN 1 ELSE 0 END) AS failed,
                  SUM(CASE WHEN p.status = 'pending' THEN 1 ELSE 0 END) AS pending
             FROM ( ${union.sql} ) p`,
          union.params,
        );
        totals = agg[0] || {};
      } catch (e: any) {
        // The Stripe columns arrive with runStripeMigrations(). Say that plainly
        // rather than rendering an empty table that reads as "no payments".
        return res.json({
          payments: [],
          stats: null,
          error: `Payment columns unavailable: ${e?.message || e}`,
        });
      }

      const tenantList = await storage.getTenants();
      const tenantMap = Object.fromEntries(tenantList.map((t: any) => [t.id, t]));

      // Currency is resolved the same way the PaymentIntent resolved it
      // (payment_gateway_settings, then the platform default), cached per call.
      const currencyCache = new Map<number, string>();
      const currencyOf = async (tid: any) => {
        const key = Number(tid) || 0;
        if (!currencyCache.has(key)) currencyCache.set(key, await currencyFor(key || null));
        return currencyCache.get(key)!;
      };

      const payments: any[] = [];
      for (const r of rows) {
        payments.push({
          source: r.source,
          id: Number(r.rowId),
          reference: r.reference,
          tenantId: r.tenantId != null ? Number(r.tenantId) : null,
          tenantName: tenantMap[r.tenantId]?.businessName || null,
          amount: r.amount != null ? Number(r.amount) : null,
          refunded: r.refunded != null ? Number(r.refunded) : null,
          currency: (await currencyOf(r.tenantId)).toUpperCase(),
          method: r.method || null,
          status: r.status || null,
          paymentIntentId: r.paymentIntentId || null,
          chargeId: r.chargeId || null,
          refundId: r.refundId || null,
          paymentError: r.paymentError || null,
          paidAt: r.paidAt || null,
          createdAt: r.createdAt || null,
        });
      }

      res.json({
        payments,
        stats: {
          count: Number(totals.n || 0),
          collected: Number(totals.collected || 0),
          refunded: Number(totals.refunded || 0),
          failed: Number(totals.failed || 0),
          pending: Number(totals.pending || 0),
          returned: payments.length,
        },
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  /** Is Stripe reachable at all, and in which mode. Never returns a key. */
  app.get("/api/super-admin/payments/stripe", requireSuperAdmin, async (_req: Request, res: Response) => {
    try {
      res.json(await stripeAccountStatus());
    } catch (e: any) {
      res.json({ connected: false, error: e?.message || String(e) });
    }
  });

  /** The webhook delivery log - the only proof that settlement actually arrived. */
  app.get("/api/super-admin/payments/events", requireSuperAdmin, async (req: Request, res: Response) => {
    const limit = Math.min(Math.max(Number(req.query.limit) || 40, 1), 200);
    try {
      const rows = await q(
        `SELECT id, type, status, livemode, error, received_at, processed_at
           FROM stripe_webhook_events
          ORDER BY received_at DESC
          LIMIT ?`,
        [limit],
      );
      res.json({
        events: rows.map((r: any) => ({
          id: r.id,
          type: r.type,
          status: r.status,
          livemode: !!r.livemode,
          error: r.error || null,
          receivedAt: r.received_at || null,
          processedAt: r.processed_at || null,
        })),
      });
    } catch (e: any) {
      res.json({ events: [], error: `Webhook event log unavailable: ${e?.message || e}` });
    }
  });

  /**
   * Issue a refund through Stripe.
   *
   * This route only asks Stripe. The row is updated when Stripe sends
   * charge.refunded back (stripeWebhook.applyRefund) - the same rule that
   * governs payment: nothing outside the signed webhook decides a record's
   * money state.
   */
  app.post("/api/super-admin/payments/refund", requireSuperAdmin, async (req: SuperAdminRequest, res: Response) => {
    try {
      const paymentIntentId = String(req.body?.paymentIntentId || "").trim();
      if (!/^pi_[A-Za-z0-9_]+$/.test(paymentIntentId)) {
        return res.status(400).json({ error: "A Stripe PaymentIntent id (pi_...) is required" });
      }

      // Refund only what this platform recorded: a mistyped id must not reach
      // an unrelated charge on the same Stripe account.
      const known = await q(
        `SELECT total_amount AS amount, COALESCE(amount_refunded, 0) AS refunded
           FROM online_orders WHERE stripe_payment_intent_id = ?
          UNION ALL
         SELECT total_amount AS amount, 0 AS refunded
           FROM sales WHERE stripe_payment_intent_id = ?`,
        [paymentIntentId, paymentIntentId],
      );
      if (!known.length) {
        return res.status(404).json({
          error: "No order or sale on this platform was paid with that PaymentIntent",
        });
      }

      let amount: number | null = null;
      const raw = req.body?.amount;
      if (raw != null && String(raw).trim() !== "") {
        amount = Number(raw);
        if (!Number.isFinite(amount) || amount <= 0) {
          return res.status(400).json({ error: "Refund amount must be a positive number" });
        }
        const refundable = Number(known[0].amount || 0) - Number(known[0].refunded || 0);
        if (amount > refundable + 0.005) {
          return res.status(400).json({
            error: `At most ${refundable.toFixed(2)} is still refundable on this payment`,
          });
        }
      }

      const reason: RefundReason | undefined = REFUND_REASONS.includes(req.body?.reason)
        ? (req.body.reason as RefundReason)
        : undefined;

      const result = await refundPayment({ paymentIntentId, amount, reason });
      console.log(
        `[super-admin] refund ${result.refundId} of ${result.amount} on ${paymentIntentId} by ${req.admin?.email}`,
      );

      res.json({
        ...result,
        // The table still reads "paid" until the webhook lands. That is correct.
        note: "Stripe accepted the refund. The order updates when the charge.refunded webhook arrives.",
      });
    } catch (e: any) {
      res.status(e?.statusCode || 500).json({ error: e?.message || String(e) });
    }
  });

  // ── STORES / TENANTS MANAGEMENT ───────────────────────────────────────
  app.get("/api/super-admin/all-stores", requireSuperAdmin, async (_req: Request, res: Response) => {
    try {
      const allTenants = await storage.getTenants();
      const allSubs = await storage.getTenantSubscriptions();
      const result = [];
      for (const t of allTenants) {
        const branches = await storage.getBranchesByTenant(t.id);
        const employees = await storage.getEmployeesByTenant(t.id);
        const products = await storage.getProductsByTenant(t.id);
        const tenantSubs = allSubs.filter((s: any) => s.tenantId === t.id && s.status === "active");
        const todaySales = await storage.getSales({ tenantId: t.id, limit: 200 });
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const todayFiltered = todaySales.filter((s: any) => new Date(s.createdAt) >= today);
        const todayRevenue = todayFiltered.reduce((acc: number, s: any) => acc + parseFloat(s.total || "0"), 0);
        result.push({
          ...t,
          branchCount: branches.length,
          employeeCount: employees.length,
          productCount: products.length,
          activeSub: tenantSubs[0] || null,
          salesToday: todayFiltered.length,
          revenuToday: todayRevenue,
        });
      }
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/super-admin/active-shifts", requireSuperAdmin, async (_req: Request, res: Response) => {
    try {
      const shifts = await storage.getShifts();
      const active = shifts.filter((s: any) => !s.endTime);
      res.json(active);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/super-admin/stores/:id/branches", requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const tenantId = parseInt(req.params.id as string);
      const branches = await storage.getBranchesByTenant(tenantId);
      res.json(branches);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/super-admin/stores/:id/branches", requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const tenantId = parseInt(req.params.id as string);
      const branch = await storage.createBranch({ ...req.body, tenantId });
      res.json(branch);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/super-admin/stores/:id/employees", requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const tenantId = parseInt(req.params.id as string);
      const employees = await storage.getEmployeesByTenant(tenantId);
      res.json(employees);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/super-admin/stores/:id/employees", requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const tenantId = parseInt(req.params.id as string);
      const branches = await storage.getBranchesByTenant(tenantId);
      const branchId = req.body.branchId || (branches[0]?.id ?? null);
      const employee = await storage.createEmployee({ ...req.body, branchId, tenantId, isActive: true });
      res.json(employee);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/super-admin/stores/:id/products", requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const tenantId = parseInt(req.params.id as string);
      const products = await storage.getProductsByTenant(tenantId);
      res.json(products);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/super-admin/stores/:id/products", requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const tenantId = parseInt(req.params.id as string);
      const product = await storage.createProduct({ ...req.body, tenantId });
      res.json(product);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/super-admin/stores/:id/customers", requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const tenantId = parseInt(req.params.id as string);
      const customers = await storage.getCustomers(undefined, tenantId);
      res.json(customers);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/super-admin/stores/:id/sales", requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const tenantId = parseInt(req.params.id as string);
      const salesData = await storage.getSales({ tenantId, limit: 100 });
      res.json(salesData);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/super-admin/stores/:id/:type", requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const tenantId = parseInt(req.params.id as string);
      const type = req.params.type;
      let data: any[] = [];
      if (type === "branches") data = await storage.getBranchesByTenant(tenantId);
      else if (type === "employees") data = await storage.getEmployeesByTenant(tenantId);
      else if (type === "products") data = await storage.getProductsByTenant(tenantId);
      else if (type === "customers") data = await storage.getCustomers(undefined, tenantId);
      else if (type === "sales") data = await storage.getSales({ tenantId, limit: 50 });
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── BRANCH CRUD ───────────────────────────────────────────────────────
  app.put("/api/super-admin/branches/:id", requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id as string);
      const branch = await storage.updateBranch(id, req.body);
      res.json(branch);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/super-admin/branches/:id", requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id as string);
      await storage.deleteBranch(id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── EMPLOYEE CRUD ─────────────────────────────────────────────────────
  app.put("/api/super-admin/employees/:id", requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id as string);
      const emp = await storage.updateEmployee(id, req.body);
      res.json(emp);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/super-admin/employees/:id", requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id as string);
      await storage.deleteEmployee(id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── PRODUCT CRUD ──────────────────────────────────────────────────────
  app.put("/api/super-admin/products/:id", requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id as string);
      const product = await storage.updateProduct(id, req.body);
      res.json(product);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/super-admin/products/:id", requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id as string);
      await storage.deleteProduct(id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── CUSTOMER SOFT-DELETE ─────────────────────────────────────────────
  app.patch("/api/super-admin/customers/:id/deactivate", requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id as string);
      const customer = await storage.updateCustomer(id, { isActive: false } as any);
      res.json(customer);
    } catch (e: any) {
      console.error("[SUPER-ADMIN] Customer deactivate error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // ── SYSTEM HEALTH ─────────────────────────────────────────────────────
  app.get("/api/super-admin/system/health", requireSuperAdmin, async (_req: Request, res: Response) => {
    try {
      const startTime = process.uptime();
      const memUsage = process.memoryUsage();
      const shifts = await storage.getShifts();
      const activeShifts = shifts.filter((s: any) => !s.endTime);
      res.json({
        status: "healthy",
        uptime: Math.floor(startTime),
        uptimeFormatted: `${Math.floor(startTime / 3600)}h ${Math.floor((startTime % 3600) / 60)}m`,
        memoryUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        memoryTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        activeShifts: activeShifts.length,
        timestamp: new Date().toISOString(),
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || "development",
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── BACKUP ────────────────────────────────────────────────────────────
  app.get("/api/super-admin/backup/list", requireSuperAdmin, async (_req: Request, res: Response) => {
    try {
      const files = fs.readdirSync(BACKUP_DIR)
        .filter(f => f.endsWith(".json"))
        .map(f => {
          const stat = fs.statSync(path.join(BACKUP_DIR, f));
          return { filename: f, size: stat.size, createdAt: stat.mtime.toISOString() };
        })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      res.json(files);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/super-admin/backup/create", requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const { tenantId } = req.body;
      if (tenantId) {
        const filename = await createTenantBackup(parseInt(tenantId));
        res.json({ success: true, filename });
      } else {
        // Backup all tenants
        const tenants = await storage.getTenants();
        const results: string[] = [];
        for (const t of tenants) {
          try { results.push(await createTenantBackup(t.id)); } catch (e) { console.error(`[BACKUP] Failed to backup tenant ${t.id}:`, e); }
        }
        res.json({ success: true, count: results.length, files: results });
      }
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/super-admin/backup/download/:filename", requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const filename = path.basename(req.params.filename as string); // prevent traversal
      const filepath = path.join(BACKUP_DIR, filename);
      if (!fs.existsSync(filepath)) return res.status(404).json({ error: "Backup not found" });
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.send(fs.readFileSync(filepath));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/super-admin/backup/restore/:filename", requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const filename = path.basename(req.params.filename as string);
      const filepath = path.join(BACKUP_DIR, filename);
      if (!fs.existsSync(filepath)) return res.status(404).json({ error: "Backup file not found" });
      const raw = fs.readFileSync(filepath, "utf-8");
      const snapshot = JSON.parse(raw);
      if (!snapshot.tenant) return res.status(400).json({ error: "Invalid backup format: missing tenant data" });

      const tenantId = snapshot.tenantId || snapshot.tenant.id;
      const existingTenant = await storage.getTenant(tenantId);
      if (!existingTenant) {
        return res.status(404).json({ error: `Tenant #${tenantId} not found. The tenant must exist before restoring data.` });
      }

      const restored: Record<string, number> = {
        branches: 0, employees: 0, categories: 0, products: 0, customers: 0, expenses: 0,
      };

      // 1. Restore branches
      if (snapshot.branches?.length) {
        const existingBranches = await storage.getBranchesByTenant(tenantId);
        for (const b of snapshot.branches) {
          try {
            const match = existingBranches.find((eb: any) => eb.name === b.name);
            if (match) {
              await storage.updateBranch(match.id, { address: b.address, phone: b.phone, currency: b.currency, taxRate: b.taxRate, deliveryFee: b.deliveryFee });
            } else {
              await storage.createBranch({ ...b, id: undefined, tenantId });
            }
            restored.branches++;
          } catch (err) { console.error(`[RESTORE] Branch "${b.name}":`, err); }
        }
      }

      // 2. Restore categories
      if (snapshot.categories?.length) {
        const existingCats = await storage.getCategories(tenantId);
        for (const c of snapshot.categories) {
          try {
            const match = existingCats.find((ec: any) => ec.name === c.name);
            if (!match) {
              await storage.createCategory({ ...c, id: undefined, tenantId });
              restored.categories++;
            }
          } catch (err) { console.error(`[RESTORE] Category "${c.name}":`, err); }
        }
      }

      // 3. Restore products (upsert by barcode or name)
      if (snapshot.products?.length) {
        const existingProducts = await storage.getProductsByTenant(tenantId);
        // Rebuild category name→id map
        const freshCats = await storage.getCategories(tenantId);
        const catMap = new Map(freshCats.map((c: any) => [c.name, c.id]));
        const origCatMap = new Map((snapshot.categories || []).map((c: any) => [c.id, c.name]));
        for (const p of snapshot.products) {
          try {
            const barcodeMatch = p.barcode ? existingProducts.find((ep: any) => ep.barcode === p.barcode) : null;
            const nameMatch = existingProducts.find((ep: any) => ep.name === p.name);
            // Remap categoryId via name
            let newCatId = p.categoryId;
            if (p.categoryId && origCatMap.has(p.categoryId)) {
              const catName = origCatMap.get(p.categoryId);
              newCatId = catMap.get(catName) ?? p.categoryId;
            }
            if (barcodeMatch || nameMatch) {
              const existing = barcodeMatch || nameMatch;
              await storage.updateProduct(existing!.id, { name: p.name, price: p.price, costPrice: p.costPrice, description: p.description, isActive: p.isActive, categoryId: newCatId });
            } else {
              await storage.createProduct({ ...p, id: undefined, tenantId, categoryId: newCatId });
            }
            restored.products++;
          } catch (err) { console.error(`[RESTORE] Product "${p.name}":`, err); }
        }
      }

      // 4. Restore customers (skip duplicates by email or phone)
      if (snapshot.customers?.length) {
        const existingCustomers = await storage.getCustomers(undefined, tenantId);
        const existingEmails = new Set(existingCustomers.filter((c: any) => c.email).map((c: any) => c.email.toLowerCase()));
        const existingPhones = new Set(existingCustomers.filter((c: any) => c.phone).map((c: any) => c.phone));
        for (const c of snapshot.customers) {
          try {
            const emailDup = c.email && existingEmails.has(c.email.toLowerCase());
            const phoneDup = c.phone && existingPhones.has(c.phone);
            if (!emailDup && !phoneDup) {
              await storage.createCustomer({ ...c, id: undefined, tenantId });
              restored.customers++;
            }
          } catch (err) { console.error(`[RESTORE] Customer "${c.name}":`, err); }
        }
      }

      // 5. Restore expenses (re-create if not already present by amount+date+category)
      if (snapshot.expenses?.length) {
        for (const e of snapshot.expenses) {
          try {
            await storage.createExpense({ ...e, id: undefined, tenantId });
            restored.expenses++;
          } catch (err) { console.error(`[RESTORE] Expense:`, err); }
        }
      }

      console.log(`[RESTORE] ✓ Restored from ${filename}:`, restored);
      res.json({ success: true, tenantId, restored });
    } catch (e: any) {
      console.error("[RESTORE] Error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/super-admin/backup/:filename", requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const filename = path.basename(req.params.filename as string);
      const filepath = path.join(BACKUP_DIR, filename);
      if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ── EXPENSES (cross-tenant) ────────────────────────────────────────────
  app.get("/api/super-admin/expenses", requireSuperAdmin, async (_req: Request, res: Response) => {
    try {
      const { expenses } = await import("@shared/schema");
      const rows = await db.select().from(expenses).orderBy(desc(expenses.createdAt)).limit(500);
      res.json(rows);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/super-admin/expenses/by-tenant", requireSuperAdmin, async (_req: Request, res: Response) => {
    try {
      const { expenses } = await import("@shared/schema");
      const tenants = await storage.getTenants();
      const result = [];
      for (const t of tenants) {
        const branchesList = await storage.getBranchesByTenant(t.id);
        const branchIds = branchesList.map((b: any) => b.id);
        let total = 0;
        if (branchIds.length > 0) {
          const { inArray } = await import("drizzle-orm");
          const rows = await db.select().from(expenses).where(inArray(expenses.branchId, branchIds));
          total = rows.reduce((acc: number, e: any) => acc + parseFloat(e.amount || "0"), 0);
        }
        result.push({ tenantId: t.id, businessName: t.businessName, totalExpenses: total });
      }
      res.json(result);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ── SHIFTS (cross-tenant) ─────────────────────────────────────────────
  app.get("/api/super-admin/shifts/all", requireSuperAdmin, async (_req: Request, res: Response) => {
    try {
      const { shifts, employees, branches } = await import("@shared/schema");
      const rows = await db.select().from(shifts).orderBy(desc(shifts.startTime)).limit(200);
      res.json(rows);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ── ACTIVITY LOG (global) ─────────────────────────────────────────────
  app.get("/api/super-admin/activity", requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 200;
      const log = await storage.getActivityLog(limit);
      res.json(log);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ── REPORTS ───────────────────────────────────────────────────────────
  app.get("/api/super-admin/reports/summary", requireSuperAdmin, async (_req: Request, res: Response) => {
    try {
      const tenants = await storage.getTenants();
      const subs = await storage.getTenantSubscriptions();
      const report = [];
      for (const t of tenants) {
        const sales = await storage.getSales({ tenantId: t.id, limit: 10000 });
        const revenue = sales.reduce((a: number, s: any) => a + parseFloat(s.totalAmount || "0"), 0);
        const activeSub = subs.find((s: any) => s.tenantId === t.id && s.status === "active");
        const employees = await storage.getEmployeesByTenant(t.id);
        const products = await storage.getProductsByTenant(t.id);
        const branches = await storage.getBranchesByTenant(t.id);
        report.push({
          tenantId: t.id, businessName: t.businessName, ownerEmail: t.ownerEmail,
          status: t.status, storeType: t.storeType,
          branches: branches.length, employees: employees.length, products: products.length,
          totalSales: sales.length, totalRevenue: revenue,
          subscription: activeSub ? { plan: activeSub.planName, expires: activeSub.endDate } : null,
          createdAt: t.createdAt,
        });
      }
      res.json(report);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ── BULK IMPORT ───────────────────────────────────────────────────────
  app.get("/api/super-admin/bulk-import/template", requireSuperAdmin, async (_req: Request, res: Response) => {
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=products_template.csv");
    res.send("name,barcode,price,cost,category,description\nSample Product,123456,9.99,5.00,General,Sample description");
  });

  app.post("/api/super-admin/stores/:id/bulk-import/products", requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const tenantId = parseInt(req.params.id as string);
      const { products: productsData } = req.body;
      if (!productsData || !Array.isArray(productsData)) {
        return res.status(400).json({ error: "products array required" });
      }
      let imported = 0;
      for (const p of productsData) {
        try {
          await storage.createProduct({
            name: p.name,
            price: String(p.price || 0),
            costPrice: String(p.cost || 0),
            barcode: p.barcode || null,
            description: p.description || null,
            tenantId,
            isActive: true,
            taxable: true,
            trackInventory: true,
          });
          imported++;
        } catch (err) { console.error(`[BULK-IMPORT] Failed to import product "${p.name}":`, err); }
      }
      res.json({ success: true, imported });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── AUTHENTICATED WRITE PROXIES (for super admin dashboard) ──────────────
  // These endpoints allow the dashboard to perform writes using the super admin
  // JWT token instead of relying on unauthenticated tenant routes.

  app.post("/api/super-admin/products", requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const product = await storage.createProduct(req.body);
      res.json(product);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/super-admin/categories", requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const category = await storage.createCategory(req.body);
      res.json(category);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.put("/api/super-admin/categories/:id", requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const category = await storage.updateCategory(parseInt(req.params.id as string), req.body);
      res.json(category);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete("/api/super-admin/categories/:id", requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      await storage.deleteCategory(parseInt(req.params.id as string));
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/super-admin/customers", requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const customer = await storage.createCustomer(req.body);
      res.json(customer);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.put("/api/super-admin/customers/:id", requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const customer = await storage.updateCustomer(parseInt(req.params.id as string), req.body);
      res.json(customer);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/super-admin/inventory/adjust", requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const { productId, branchId, adjustment, absoluteQuantity } = req.body;
      if (absoluteQuantity !== undefined && absoluteQuantity !== null && absoluteQuantity !== "") {
        const result = await storage.upsertInventory({ productId, branchId, quantity: Number(absoluteQuantity) });
        res.json(result);
      } else {
        const result = await storage.adjustInventory(productId, branchId, Number(adjustment));
        res.json(result);
      }
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ── COMMISSION SETTINGS ───────────────────────────────────────────────────
  app.get("/api/super-admin/commission/settings", requireSuperAdmin, async (_req: Request, res: Response) => {
    try {
      const rate = await storage.getCommissionRate();
      res.json({ commissionRate: rate });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.put("/api/super-admin/commission/settings", requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const { commissionRate } = req.body;
      if (commissionRate === undefined || isNaN(Number(commissionRate))) {
        return res.status(400).json({ error: "Valid commissionRate required" });
      }
      const rate = Math.max(0, Math.min(100, Number(commissionRate)));
      await storage.setPlatformSetting("commission_rate", String(rate));
      res.json({ commissionRate: rate });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/super-admin/commission/summary", requireSuperAdmin, async (_req: Request, res: Response) => {
    try {
      const summary = await storage.getCommissionSummary();
      res.json(summary);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/super-admin/commission/transactions", requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : undefined;
      const commissions = await storage.getPlatformCommissions(tenantId);
      res.json(commissions);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ── CHANGE SUPER ADMIN PASSWORD ───────────────────────────────────────
  app.post("/api/super-admin/change-password", requireSuperAdmin, async (req: SuperAdminRequest, res: Response) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const adminId = req.admin?.id;
      if (!adminId) return res.status(401).json({ error: "Unauthorized" });
      const admin = await storage.getSuperAdminByEmail(req.admin!.email);
      if (!admin) return res.status(404).json({ error: "Admin not found" });
      const valid = await bcrypt.compare(currentPassword, admin.passwordHash);
      if (!valid) return res.status(400).json({ error: "Current password is incorrect" });
      const newHash = await bcrypt.hash(newPassword, 10);
      await storage.updateSuperAdmin(adminId, { passwordHash: newHash });
      res.json({ success: true, message: "Password changed successfully" });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  console.log("[SUPER-ADMIN] All super admin routes registered.");
}
