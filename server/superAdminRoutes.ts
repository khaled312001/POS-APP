import type { Express, Request, Response } from "express";
import * as bcrypt from "bcrypt";
import * as crypto from "crypto";
import { storage } from "./storage";
import { generateToken, requireSuperAdmin, SuperAdminRequest } from "./superAdminAuth";
import { addMonths, addYears, addDays } from "date-fns";
import { db } from "./db";
import { eq, desc, sql, and, gte, lte, sum } from "drizzle-orm";

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
      const [revenueRow] = await db.select({ total: sql<string>`coalesce(sum(cast(price as decimal)), 0)::text` }).from(tenantSubscriptions).where(eq(tenantSubscriptions.status, "active"));
      const [salesRevenue] = await db.select({ total: sql<string>`coalesce(sum(cast(total as decimal)), 0)::text` }).from(sales);

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
        const total = tenantSales.reduce((acc: number, s: any) => acc + parseFloat(s.total || "0"), 0);
        grandTotal += total;
        grandCount += tenantSales.length;

        // Today's sales
        const today = new Date(); today.setHours(0,0,0,0);
        const todaySales = tenantSales.filter((s: any) => new Date(s.createdAt) >= today);
        const todayTotal = todaySales.reduce((acc: number, s: any) => acc + parseFloat(s.total || "0"), 0);

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
      const id = parseInt(req.params.id);
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
      const id = parseInt(req.params.id);
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
      res.json(tenant);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.patch("/api/super-admin/tenants/:id", requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const tenant = await storage.updateTenant(id, req.body);
      res.json(tenant);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/super-admin/tenants/:id", requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteTenant(id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Reset tenant password
  app.post("/api/super-admin/tenants/:id/reset-password", requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
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
      const id = parseInt(req.params.id);
      const sub = await storage.updateTenantSubscription(id, req.body);
      res.json(sub);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/super-admin/subscriptions/:id", requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteTenantSubscription(id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Extend subscription
  app.post("/api/super-admin/subscriptions/:id/extend", requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
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
      const id = parseInt(req.params.id);
      const key = await storage.updateLicenseKey(id, req.body);
      res.json(key);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.patch("/api/super-admin/licenses/:id/revoke", requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const key = await storage.updateLicenseKey(id, { status: "revoked" });
      res.json(key);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/super-admin/licenses/:id", requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
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
        const today = new Date(); today.setHours(0,0,0,0);
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
      const tenantId = parseInt(req.params.id);
      const branches = await storage.getBranchesByTenant(tenantId);
      res.json(branches);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/super-admin/stores/:id/branches", requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const tenantId = parseInt(req.params.id);
      const branch = await storage.createBranch({ ...req.body, tenantId });
      res.json(branch);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/super-admin/stores/:id/employees", requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const tenantId = parseInt(req.params.id);
      const employees = await storage.getEmployeesByTenant(tenantId);
      res.json(employees);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/super-admin/stores/:id/employees", requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const tenantId = parseInt(req.params.id);
      const branches = await storage.getBranchesByTenant(tenantId);
      const branchId = req.body.branchId || (branches[0]?.id ?? null);
      const employee = await storage.createEmployee({ ...req.body, branchId, isActive: true });
      res.json(employee);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/super-admin/stores/:id/products", requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const tenantId = parseInt(req.params.id);
      const products = await storage.getProductsByTenant(tenantId);
      res.json(products);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/super-admin/stores/:id/products", requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const tenantId = parseInt(req.params.id);
      const product = await storage.createProduct({ ...req.body, tenantId });
      res.json(product);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/super-admin/stores/:id/customers", requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const tenantId = parseInt(req.params.id);
      const customers = await storage.getCustomers(undefined, tenantId);
      res.json(customers);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/super-admin/stores/:id/sales", requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const tenantId = parseInt(req.params.id);
      const salesData = await storage.getSales({ tenantId, limit: 100 });
      res.json(salesData);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/super-admin/stores/:id/:type", requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const tenantId = parseInt(req.params.id);
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
      const id = parseInt(req.params.id);
      const branch = await storage.updateBranch(id, req.body);
      res.json(branch);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/super-admin/branches/:id", requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteBranch(id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── EMPLOYEE CRUD ─────────────────────────────────────────────────────
  app.put("/api/super-admin/employees/:id", requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const emp = await storage.updateEmployee(id, req.body);
      res.json(emp);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/super-admin/employees/:id", requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteEmployee(id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── PRODUCT CRUD ──────────────────────────────────────────────────────
  app.put("/api/super-admin/products/:id", requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const product = await storage.updateProduct(id, req.body);
      res.json(product);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/super-admin/products/:id", requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteProduct(id);
      res.json({ success: true });
    } catch (e: any) {
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
    res.json([]);
  });

  app.post("/api/super-admin/backup/create", requireSuperAdmin, async (_req: Request, res: Response) => {
    res.json({ success: true, message: "Backup feature coming soon" });
  });

  // ── BULK IMPORT ───────────────────────────────────────────────────────
  app.get("/api/super-admin/bulk-import/template", async (_req: Request, res: Response) => {
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=products_template.csv");
    res.send("name,barcode,price,cost,category,description\nSample Product,123456,9.99,5.00,General,Sample description");
  });

  app.post("/api/super-admin/stores/:id/bulk-import/products", requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const tenantId = parseInt(req.params.id);
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
        } catch (err) { /* skip invalid rows */ }
      }
      res.json({ success: true, imported });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
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
