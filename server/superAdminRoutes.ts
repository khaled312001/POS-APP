import type { Express, Request, Response } from "express";
import * as bcrypt from "bcrypt";
import * as crypto from "crypto";
import { storage } from "./storage";
import { generateToken, requireSuperAdmin, SuperAdminRequest } from "./superAdminAuth";
import { addMonths, addYears, addDays } from "date-fns";

export function registerSuperAdminRoutes(app: Express) {
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

  app.get("/api/super-admin/stats", requireSuperAdmin, async (_req: Request, res: Response) => {
    try {
      const stats = await storage.getSuperAdminDashboardStats();
      res.json(stats);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/super-admin/tenants", requireSuperAdmin, async (_req: Request, res: Response) => {
    try {
      const list = await storage.getTenants();
      res.json(list);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/super-admin/tenants", requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const { businessName, ownerName, ownerEmail, ownerPhone, status, maxBranches, maxEmployees, storeType } = req.body;
      const passwordHash = await bcrypt.hash("admin123", 10);
      const tenant = await storage.createTenant({
        businessName, ownerName, ownerEmail,
        ownerPhone: ownerPhone || null,
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

  app.get("/api/super-admin/subscriptions", requireSuperAdmin, async (_req: Request, res: Response) => {
    try {
      const subs = await storage.getTenantSubscriptions();
      res.json(subs);
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

  app.get("/api/super-admin/licenses", requireSuperAdmin, async (_req: Request, res: Response) => {
    try {
      const keys = await storage.getLicenseKeys();
      res.json(keys);
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

  app.patch("/api/super-admin/licenses/:id/revoke", requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const key = await storage.updateLicenseKey(id, { status: "revoked" });
      res.json(key);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/super-admin/all-stores", requireSuperAdmin, async (_req: Request, res: Response) => {
    try {
      const allTenants = await storage.getTenants();
      const result = [];
      for (const t of allTenants) {
        const branches = await storage.getBranchesByTenant(t.id);
        const employees = await storage.getEmployeesByTenant(t.id);
        result.push({ ...t, branchCount: branches.length, employeeCount: employees.length });
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
      const employee = await storage.createEmployee({ ...req.body, tenantId });
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

  app.get("/api/super-admin/stores/:id/:type", requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const tenantId = parseInt(req.params.id);
      const type = req.params.type;
      let data: any[] = [];
      if (type === "branches") data = await storage.getBranchesByTenant(tenantId);
      else if (type === "employees") data = await storage.getEmployeesByTenant(tenantId);
      else if (type === "products") data = await storage.getProductsByTenant(tenantId);
      res.json(data);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

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

  app.get("/api/super-admin/backup/list", requireSuperAdmin, async (_req: Request, res: Response) => {
    res.json([]);
  });

  app.post("/api/super-admin/backup/create", requireSuperAdmin, async (_req: Request, res: Response) => {
    res.json({ success: true, message: "Backup feature coming soon" });
  });

  app.get("/api/super-admin/bulk-import/template", async (_req: Request, res: Response) => {
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=products_template.csv");
    res.send("name,barcode,price,cost,category,description\nSample Product,123456,9.99,5.00,General,Sample description");
  });

  app.post("/api/super-admin/stores/:id/bulk-import/products", requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const tenantId = parseInt(req.params.id);
      res.json({ success: true, imported: 0, message: "Bulk import processing for tenant " + tenantId });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  console.log("[SUPER-ADMIN] All super admin routes registered.");
}
