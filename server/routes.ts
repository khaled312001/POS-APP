import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import { storage } from "./storage";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";

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

export async function registerRoutes(app: Express): Promise<Server> {
  // Landing Page Subscription
  app.post("/api/landing/subscribe", async (req, res) => {
    try {
      const {
        businessName,
        ownerName,
        ownerEmail,
        ownerPhone,
        planType, // trial, monthly, yearly
        planName,
        paymentMethod, // stripe, bank
        receiptUrl,
        stripeToken
      } = req.body;

      if (!businessName || !ownerName || !ownerEmail) {
        return res.status(400).json({ error: "Required fields are missing" });
      }

      // 1. Check if tenant already exists
      const existing = await storage.getTenantByEmail(ownerEmail);
      if (existing) {
        return res.status(400).json({ error: "A store with this email already exists" });
      }

      // 2. Create Tenant
      // Generate a temporary password (e.g., ownerName lower + 123)
      const tempPassword = "admin" + Math.floor(1000 + Math.random() * 9000);
      const passwordHash = await bcrypt.hash("admin123", 10); // Default for now, or use generated

      const tenant = await storage.createTenant({
        businessName,
        ownerName,
        ownerEmail,
        ownerPhone: ownerPhone || null,
        passwordHash,
        status: planType === "trial" ? "active" : "active", // In a real app, "pending" for bank
        maxBranches: planName === "pro" ? 5 : 1,
        maxEmployees: planName === "pro" ? 999 : 5,
        metadata: {
          signupDate: new Date().toISOString(),
          paymentMethod,
          receiptUrl: receiptUrl || null
        }
      });

      // 3. Create Subscription
      const startDate = new Date();
      let endDate = new Date();
      let status = "active";

      if (planType === "monthly") {
        endDate = addMonths(startDate, 1);
      } else if (planType === "yearly") {
        endDate = addYears(startDate, 1);
      } else {
        endDate = addDays(startDate, 30);
        status = "active"; // Trial
      }

      const subscription = await storage.createTenantSubscription({
        tenantId: tenant.id,
        planType,
        planName: planName || "Starter",
        price: planType === "trial" ? "0" : (planName === "pro" ? "79.00" : "29.00"),
        status,
        startDate,
        endDate,
        autoRenew: planType !== "trial",
        paymentMethod: paymentMethod || "manual"
      });

      // 4. Generate License Key
      const randomSegments = Array.from({ length: 4 }, () =>
        crypto.randomBytes(2).toString('hex').toUpperCase()
      );
      const licenseKey = `BARMAGLY-${randomSegments.join('-')}`;

      await storage.createLicenseKey({
        licenseKey,
        tenantId: tenant.id,
        subscriptionId: subscription.id,
        status: "active",
        maxActivations: planName === "pro" ? 10 : 3,
        expiresAt: endDate,
        notes: `Subscription from landing page: ${planName}`
      });

      // 5. Create Welcome Notification
      await storage.createTenantNotification({
        tenantId: tenant.id,
        type: "info",
        title: "Welcome to Barmagly!",
        message: `Your account for ${businessName} has been created successfully. Use the mobile app to activate with your license key.`,
        priority: "normal"
      });

      res.json({
        success: true,
        tenantId: tenant.id,
        licenseKey,
        tempPassword: "admin123" // In a real app, we'd email this
      });
    } catch (e: any) {
      console.error("Subscription error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // Dashboard
  app.get("/api/dashboard", async (_req: Request, res: Response) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Multi-branch dashboard stats
  app.get("/api/dashboard/multi-branch", async (_req: Request, res: Response) => {
    try {
      const allBranches = await storage.getBranches();
      const allEmployees = await storage.getEmployees();
      const allInventory = await storage.getInventory();
      const allSales = await storage.getSales({});
      const allShifts = await storage.getShifts();
      const allProducts = await storage.getProducts();
      const allCategories = await storage.getCategories();
      const allCustomers = await storage.getCustomers();

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
  app.get("/api/branches", async (_req, res) => {
    try { res.json(await storage.getBranches()); } catch (e: any) { res.status(500).json({ error: e.message }); }
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
  app.get("/api/employees", async (_req, res) => {
    try {
      const emps = await storage.getEmployees();
      console.log(`[DEBUG] /api/employees: Found ${emps.length} employees`);
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
      const emp = await storage.getEmployeeByPin(req.body.pin);
      if (!emp) return res.status(401).json({ error: "Invalid PIN" });
      if (req.body.employeeId && emp.id !== Number(req.body.employeeId)) {
        return res.status(401).json({ error: "Invalid PIN for this employee" });
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
  app.get("/api/categories", async (_req, res) => {
    try { res.json(await storage.getCategories()); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/categories", async (req, res) => {
    try { res.json(await storage.createCategory(sanitizeDates(req.body))); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.put("/api/categories/:id", async (req, res) => {
    try { res.json(await storage.updateCategory(Number(req.params.id), sanitizeDates(req.body))); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.delete("/api/categories/:id", async (req, res) => {
    try { await storage.deleteCategory(Number(req.params.id)); res.json({ success: true }); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Products
  app.get("/api/products", async (req, res) => {
    try { res.json(await storage.getProducts(req.query.search as string)); } catch (e: any) { res.status(500).json({ error: e.message }); }
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
      res.json(await storage.createProduct(sanitizeDates(req.body)));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.put("/api/products/:id", async (req, res) => {
    try {
      res.json(await storage.updateProduct(Number(req.params.id), sanitizeDates(req.body)));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.delete("/api/products/:id", async (req, res) => {
    try { await storage.deleteProduct(Number(req.params.id)); res.json({ success: true }); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Inventory
  app.get("/api/inventory", async (req, res) => {
    try { res.json(await storage.getInventory(req.query.branchId ? Number(req.query.branchId) : undefined)); } catch (e: any) { res.status(500).json({ error: e.message }); }
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
  app.get("/api/inventory/low-stock", async (_req, res) => {
    try { res.json(await storage.getLowStockItems()); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Customers
  app.get("/api/customers", async (req, res) => {
    try { res.json(await storage.getCustomers(req.query.search as string)); } catch (e: any) { res.status(500).json({ error: e.message }); }
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
  app.post("/api/customers/:id/loyalty", async (req, res) => {
    try { res.json(await storage.addLoyaltyPoints(Number(req.params.id), req.body.points)); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.get("/api/customers/:id/sales", async (req, res) => {
    try { res.json(await storage.getCustomerSales(Number(req.params.id))); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Sales
  app.get("/api/sales", async (req, res) => {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : undefined;
      res.json(await storage.getSales({ limit }));
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

  // Suppliers
  app.get("/api/suppliers", async (_req, res) => {
    try { res.json(await storage.getSuppliers()); } catch (e: any) { res.status(500).json({ error: e.message }); }
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
  app.get("/api/purchase-orders", async (_req, res) => {
    try { res.json(await storage.getPurchaseOrders()); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/purchase-orders", async (req, res) => {
    try { res.json(await storage.createPurchaseOrder(sanitizeDates(req.body))); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.put("/api/purchase-orders/:id", async (req, res) => {
    try { res.json(await storage.updatePurchaseOrder(Number(req.params.id), sanitizeDates(req.body))); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Shifts
  app.get("/api/shifts", async (_req, res) => {
    try { res.json(await storage.getShifts()); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.get("/api/shifts/stats", async (_req, res) => {
    try { res.json(await storage.getShiftStats()); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.get("/api/shifts/active", async (_req, res) => {
    try { res.json(await storage.getAllActiveShifts()); } catch (e: any) { res.status(500).json({ error: e.message }); }
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
  app.get("/api/expenses", async (_req, res) => {
    try { res.json(await storage.getExpenses()); } catch (e: any) { res.status(500).json({ error: e.message }); }
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
      res.json(await storage.getActivityLog(limit));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Returns & Refunds
  app.get("/api/returns", async (_req, res) => {
    try { res.json(await storage.getReturns()); } catch (e: any) { res.status(500).json({ error: e.message }); }
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
    try { res.json(await storage.getWarehouses(req.query.branchId ? Number(req.query.branchId) : undefined)); } catch (e: any) { res.status(500).json({ error: e.message }); }
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
    try { res.json(await storage.getProductBatches(req.query.productId ? Number(req.query.productId) : undefined)); } catch (e: any) { res.status(500).json({ error: e.message }); }
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
  app.get("/api/analytics/predictions", async (_req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      const topProducts = await storage.getTopProducts(10);
      const slowMoving = await storage.getSlowMovingProducts(30);
      const allProds = await storage.getProducts();
      const lowStockData = await storage.getLowStockItems();

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
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      if (error instanceof ObjectNotFoundError) return res.sendStatus(404);
      return res.sendStatus(500);
    }
  });

  // Object Storage - Get upload URL
  app.post("/api/objects/upload", async (_req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error: any) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Object Storage - Save uploaded image path
  app.put("/api/images/save", async (req, res) => {
    if (!req.body.imageURL) return res.status(400).json({ error: "imageURL is required" });
    try {
      const objectStorageService = new ObjectStorageService();
      const objectPath = objectStorageService.normalizeObjectEntityPath(req.body.imageURL);
      res.status(200).json({ objectPath });
    } catch (error) {
      console.error("Error saving image:", error);
      res.status(500).json({ error: "Internal server error" });
    }
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
      const shifts = await storage.getShifts();
      const active = shifts.find((s: any) => s.employeeId === Number(req.params.employeeId) && s.status === "open");
      res.json(active || null);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Get store settings (main branch)
  app.get("/api/store-settings", async (_req, res) => {
    try {
      const branches = await storage.getBranches();
      const mainBranch = branches.find((b: any) => b.isMain) || branches[0];
      res.json(mainBranch || { name: "Barmagly Smart POS", address: "", phone: "", email: "", logo: "" });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Update store settings (update main branch)
  app.put("/api/store-settings", async (req, res) => {
    try {
      const branches = await storage.getBranches();
      const mainBranch = branches.find((b: any) => b.isMain) || branches[0];
      if (!mainBranch) return res.status(404).json({ error: "No branch found" });
      const updated = await storage.updateBranch(mainBranch.id, sanitizeDates(req.body));
      res.json(updated);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  const httpServer = createServer(app);

  storage.seedInitialData().then(seeded => {
    if (seeded) console.log("Initial seed data created");
  }).catch(e => console.log("Seed check:", e));

  return httpServer;
}
