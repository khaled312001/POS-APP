import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import { storage } from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
  // Dashboard
  app.get("/api/dashboard", async (_req: Request, res: Response) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Branches
  app.get("/api/branches", async (_req, res) => {
    try { res.json(await storage.getBranches()); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/branches", async (req, res) => {
    try { res.json(await storage.createBranch(req.body)); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.put("/api/branches/:id", async (req, res) => {
    try { res.json(await storage.updateBranch(Number(req.params.id), req.body)); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Employees
  app.get("/api/employees", async (_req, res) => {
    try { res.json(await storage.getEmployees()); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.get("/api/employees/:id", async (req, res) => {
    try {
      const emp = await storage.getEmployee(Number(req.params.id));
      if (!emp) return res.status(404).json({ error: "Employee not found" });
      res.json(emp);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/employees", async (req, res) => {
    try { res.json(await storage.createEmployee(req.body)); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.put("/api/employees/:id", async (req, res) => {
    try { res.json(await storage.updateEmployee(Number(req.params.id), req.body)); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.delete("/api/employees/:id", async (req, res) => {
    try { await storage.deleteEmployee(Number(req.params.id)); res.json({ success: true }); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/employees/login", async (req, res) => {
    try {
      const emp = await storage.getEmployeeByPin(req.body.pin);
      if (!emp) return res.status(401).json({ error: "Invalid PIN" });
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
    try { res.json(await storage.createCategory(req.body)); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.put("/api/categories/:id", async (req, res) => {
    try { res.json(await storage.updateCategory(Number(req.params.id), req.body)); } catch (e: any) { res.status(500).json({ error: e.message }); }
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
    try { res.json(await storage.createProduct(req.body)); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.put("/api/products/:id", async (req, res) => {
    try { res.json(await storage.updateProduct(Number(req.params.id), req.body)); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.delete("/api/products/:id", async (req, res) => {
    try { await storage.deleteProduct(Number(req.params.id)); res.json({ success: true }); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Inventory
  app.get("/api/inventory", async (req, res) => {
    try { res.json(await storage.getInventory(req.query.branchId ? Number(req.query.branchId) : undefined)); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/inventory", async (req, res) => {
    try { res.json(await storage.upsertInventory(req.body)); } catch (e: any) { res.status(500).json({ error: e.message }); }
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
    try { res.json(await storage.createCustomer(req.body)); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.put("/api/customers/:id", async (req, res) => {
    try { res.json(await storage.updateCustomer(Number(req.params.id), req.body)); } catch (e: any) { res.status(500).json({ error: e.message }); }
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
      const { items, ...saleData } = req.body;
      const receiptNumber = `RCP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const sale = await storage.createSale({ ...saleData, receiptNumber });
      if (items && items.length > 0) {
        for (const item of items) {
          await storage.createSaleItem({ ...item, saleId: sale.id });
          if (saleData.branchId) {
            await storage.adjustInventory(item.productId, saleData.branchId, -item.quantity);
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
    try { res.json(await storage.createSupplier(req.body)); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.put("/api/suppliers/:id", async (req, res) => {
    try { res.json(await storage.updateSupplier(Number(req.params.id), req.body)); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Purchase Orders
  app.get("/api/purchase-orders", async (_req, res) => {
    try { res.json(await storage.getPurchaseOrders()); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/purchase-orders", async (req, res) => {
    try { res.json(await storage.createPurchaseOrder(req.body)); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.put("/api/purchase-orders/:id", async (req, res) => {
    try { res.json(await storage.updatePurchaseOrder(Number(req.params.id), req.body)); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Shifts
  app.get("/api/shifts", async (_req, res) => {
    try { res.json(await storage.getShifts()); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/shifts", async (req, res) => {
    try { res.json(await storage.createShift(req.body)); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.put("/api/shifts/:id/close", async (req, res) => {
    try {
      const shift = await storage.closeShift(Number(req.params.id), req.body);
      // Log activity
      await storage.createActivityLog({
        employeeId: shift.employeeId,
        action: "shift_closed",
        entityType: "shift",
        entityId: shift.id,
        details: `Shift closed with ${shift.totalTransactions || 0} transactions and $${shift.closingCash || 0} closing cash`,
      });
      res.json(shift);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Expenses
  app.get("/api/expenses", async (_req, res) => {
    try { res.json(await storage.getExpenses()); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/expenses", async (req, res) => {
    try { res.json(await storage.createExpense(req.body)); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Tables
  app.get("/api/tables", async (req, res) => {
    try { res.json(await storage.getTables(req.query.branchId ? Number(req.query.branchId) : undefined)); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/tables", async (req, res) => {
    try { res.json(await storage.createTable(req.body)); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.put("/api/tables/:id", async (req, res) => {
    try { res.json(await storage.updateTable(Number(req.params.id), req.body)); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Kitchen Orders
  app.get("/api/kitchen-orders", async (req, res) => {
    try { res.json(await storage.getKitchenOrders(req.query.branchId ? Number(req.query.branchId) : undefined)); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/kitchen-orders", async (req, res) => {
    try { res.json(await storage.createKitchenOrder(req.body)); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.put("/api/kitchen-orders/:id", async (req, res) => {
    try { res.json(await storage.updateKitchenOrder(Number(req.params.id), req.body)); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Subscriptions
  app.get("/api/subscription-plans", async (_req, res) => {
    try { res.json(await storage.getSubscriptionPlans()); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/subscription-plans", async (req, res) => {
    try { res.json(await storage.createSubscriptionPlan(req.body)); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.get("/api/subscriptions", async (_req, res) => {
    try { res.json(await storage.getSubscriptions()); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/subscriptions", async (req, res) => {
    try { res.json(await storage.createSubscription(req.body)); } catch (e: any) { res.status(500).json({ error: e.message }); }
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
      const item = await storage.createPurchaseOrderItem({ ...req.body, purchaseOrderId: Number(req.params.id) });
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
      const { items, ...returnData } = req.body;
      const ret = await storage.createReturn(returnData);
      if (items && items.length > 0) {
        for (const item of items) {
          await storage.createReturnItem({ ...item, returnId: ret.id });
          if (returnData.branchId) {
            await storage.adjustInventory(item.productId, returnData.branchId, item.quantity);
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
      res.json(ret);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  const httpServer = createServer(app);

  storage.seedInitialData().then(seeded => {
    if (seeded) console.log("Initial seed data created");
  }).catch(e => console.log("Seed check:", e));

  return httpServer;
}
