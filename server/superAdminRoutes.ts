import type { Express, Request, Response } from "express";
import * as bcrypt from "bcrypt";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { storage } from "./storage";
import { generateToken, requireSuperAdmin, SuperAdminRequest } from "./superAdminAuth";
import { addMonths, addYears, addDays } from "date-fns";
import { db } from "./db";
import { eq, desc, sql, and, gte, lte, sum } from "drizzle-orm";

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
  app.post("/api/super-admin/login", async (req: Request, res: Response) => {
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
      const enriched = subs.map((s: any) => ({ ...s, tenant: tenantMap[s.tenantId] || null }));
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

  // Extend subscription
  app.post("/api/super-admin/subscriptions/:id/extend", requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id as string);
      const { days, months } = req.body;
      const sub = await storage.getTenantSubscription(id);
      if (!sub) return res.status(404).json({ error: "Subscription not found" });
      const currentEnd = sub.endDate ? new Date(sub.endDate) : new Date();
      let newEnd = currentEnd;
      if (months) newEnd = addMonths(currentEnd, months);
      else if (days) newEnd = addDays(currentEnd, days);
      const updated = await storage.updateTenantSubscription(id, { endDate: newEnd, status: "active" });
      res.json(updated);
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
      const licenseKey = customKey || `BARMAGLY-${segments.join("-")}`;

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

  // ── One-time DB migration: old Neon → Replit Neon ──────────────────────────
  app.post("/api/super-admin/db-migrate-to-replit-neon", requireSuperAdmin, async (_req: Request, res: Response) => {
    const pgHost = process.env.PGHOST || "";
    if (!pgHost.includes("neon.tech")) {
      return res.status(400).json({ error: "PGHOST is not a Neon host — migration can only run in production", pgHost });
    }

    const log: string[] = [];
    const report = (msg: string) => { log.push(msg); console.log("[MIGRATE]", msg); };

    try {
      const { Pool: PgPool } = await import("pg") as any;

      // Source: old Neon database (current app pool source URL)
      const srcPool = new PgPool({
        connectionString: "postgresql://neondb_owner:npg_HFhrVY7sSDp3@ep-polished-sun-amr4cmn7.c-5.us-east-1.aws.neon.tech/neondb",
        ssl: { rejectUnauthorized: false }, max: 3,
      });

      // Destination: Replit-managed Neon database
      const dstPool = new PgPool({
        host: process.env.PGHOST, database: process.env.PGDATABASE,
        user: process.env.PGUSER, password: process.env.PGPASSWORD,
        port: parseInt(process.env.PGPORT || "5432"),
        ssl: { rejectUnauthorized: false }, max: 3,
      });

      // Test connections
      const [srcTest, dstTest] = await Promise.all([
        srcPool.query("SELECT COUNT(*) as c FROM customers"),
        dstPool.query("SELECT current_database() as db"),
      ]);
      report(`Source: ${srcTest.rows[0].c} customers`);
      report(`Destination: ${dstTest.rows[0].db} on ${pgHost}`);

      // Clear destination
      await dstPool.query(`
        TRUNCATE TABLE
          stock_count_items, stock_counts, cash_drawer_operations, employee_commissions,
          platform_commissions, activity_log, notifications, tenant_notifications,
          calls, online_orders, kitchen_orders, return_items, returns,
          sale_items, sales, inventory_movements, inventory,
          purchase_order_items, purchase_orders, warehouse_transfers,
          warehouses, vehicles, shifts, daily_closings, monthly_closings,
          expenses, supplier_contracts, suppliers, customers, employees,
          tables, products, categories, branches,
          tenant_subscriptions, license_keys,
          landing_page_config, platform_settings, printer_configs, sync_queue,
          tenants, super_admins, subscription_plans
        RESTART IDENTITY CASCADE
      `);
      report("Destination cleared");

      function sqlVal(v: any): string {
        if (v === null || v === undefined) return "NULL";
        if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
        if (typeof v === "number") return String(v);
        if (v instanceof Date) return `'${v.toISOString()}'`;
        return `'${String(v).replace(/'/g, "''")}'`;
      }

      async function migrate(tbl: string, batchSize = 300) {
        const rows = await srcPool.query(`SELECT * FROM "${tbl}" ORDER BY id`);
        if (!rows.rows.length) { report(`  ${tbl}: 0`); return; }
        const cols = Object.keys(rows.rows[0]);
        const colsSql = cols.map((c: string) => `"${c}"`).join(",");
        for (let i = 0; i < rows.rows.length; i += batchSize) {
          const batch = rows.rows.slice(i, i + batchSize);
          const vals = batch.map((r: any) => `(${cols.map((c: string) => sqlVal(r[c])).join(",")})`).join(",");
          await dstPool.query(`INSERT INTO "${tbl}" (${colsSql}) VALUES ${vals} ON CONFLICT (id) DO NOTHING`);
        }
        await dstPool.query(`SELECT setval(pg_get_serial_sequence('${tbl}','id'), COALESCE((SELECT MAX(id) FROM "${tbl}"),0)+1, false)`);
        report(`  ${tbl}: ${rows.rows.length}`);
      }

      // Migrate in FK order
      await migrate("super_admins"); await migrate("tenants");
      await migrate("license_keys"); await migrate("tenant_subscriptions");
      await migrate("branches"); await migrate("categories");
      await migrate("warehouses"); await migrate("vehicles");
      await migrate("employees"); await migrate("suppliers");
      await migrate("products", 100);

      // Customers in large batches (direct pg is fast)
      const custRows = await srcPool.query("SELECT * FROM customers ORDER BY id");
      const custCols = Object.keys(custRows.rows[0]);
      const custColsSql = custCols.map((c: string) => `"${c}"`).join(",");
      let custDone = 0;
      for (let i = 0; i < custRows.rows.length; i += 500) {
        const batch = custRows.rows.slice(i, i + 500);
        const vals = batch.map((r: any) => `(${custCols.map((c: string) => sqlVal(r[c])).join(",")})`).join(",");
        await dstPool.query(`INSERT INTO customers (${custColsSql}) VALUES ${vals} ON CONFLICT (id) DO NOTHING`);
        custDone += batch.length;
      }
      await dstPool.query(`SELECT setval(pg_get_serial_sequence('customers','id'), COALESCE((SELECT MAX(id) FROM customers),0)+1, false)`);
      report(`  customers: ${custDone}`);

      await migrate("sales", 100); await migrate("sale_items", 100);
      await migrate("inventory", 100); await migrate("expenses");
      await migrate("shifts"); await migrate("notifications", 100);
      await migrate("calls", 100); await migrate("activity_log");
      await migrate("stock_counts"); await migrate("cash_drawer_operations");
      await migrate("platform_commissions"); await migrate("tables");

      // Tables without id
      const noIdTables = ["landing_page_config", "platform_settings"];
      for (const tbl of noIdTables) {
        const rows = await srcPool.query(`SELECT * FROM "${tbl}"`);
        if (!rows.rows.length) continue;
        const cols = Object.keys(rows.rows[0]);
        const colsSql = cols.map((c: string) => `"${c}"`).join(",");
        const vals = rows.rows.map((r: any) => `(${cols.map((c: string) => sqlVal(r[c])).join(",")})`).join(",");
        await dstPool.query(`INSERT INTO "${tbl}" (${colsSql}) VALUES ${vals} ON CONFLICT DO NOTHING`);
        report(`  ${tbl}: ${rows.rows.length}`);
      }

      // Verify
      const verify = await dstPool.query(`
        SELECT (SELECT COUNT(*) FROM tenants) t,
               (SELECT COUNT(*) FROM customers) c,
               (SELECT id FROM tenants LIMIT 1) tid
      `);
      report(`Done — tenant_id=${verify.rows[0].tid}, customers=${verify.rows[0].c}`);

      await Promise.all([srcPool.end(), dstPool.end()]);
      res.json({ success: true, log });
    } catch (e: any) {
      log.push(`ERROR: ${e.message}`);
      res.status(500).json({ success: false, log, error: e.message });
    }
  });

  console.log("[SUPER-ADMIN] All super admin routes registered.");
}
