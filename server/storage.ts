import { db } from "./db";
import { eq, desc, sql, and, gte, lte, like, ilike, or } from "drizzle-orm";
import {
  branches, employees, categories, products, inventory,
  customers, sales, saleItems, suppliers, purchaseOrders,
  purchaseOrderItems, shifts, expenses, tables, kitchenOrders,
  subscriptionPlans, subscriptions, syncQueue, activityLog, returns, returnItems,
  cashDrawerOperations, warehouses, warehouseTransfers, productBatches,
  inventoryMovements, stockCounts, stockCountItems, supplierContracts, employeeCommissions,
  type InsertBranch, type InsertEmployee, type InsertCategory,
  type InsertProduct, type InsertInventory, type InsertCustomer,
  type InsertSale, type InsertSaleItem, type InsertSupplier,
  type InsertPurchaseOrder, type InsertPurchaseOrderItem, type InsertShift, type InsertExpense,
  type InsertTable, type InsertKitchenOrder, type InsertSubscriptionPlan,
  type InsertSubscription, type InsertActivityLog, type InsertReturn, type InsertReturnItem,
  type InsertCashDrawerOperation, type InsertWarehouse, type InsertWarehouseTransfer,
  type InsertProductBatch, type InsertInventoryMovement, type InsertStockCount,
  type InsertStockCountItem, type InsertSupplierContract, type InsertEmployeeCommission,
} from "@shared/schema";

export const storage = {
  // Branches
  async getBranches() {
    return db.select().from(branches).orderBy(desc(branches.createdAt));
  },
  async getBranch(id: number) {
    const [branch] = await db.select().from(branches).where(eq(branches.id, id));
    return branch;
  },
  async createBranch(data: InsertBranch) {
    const [branch] = await db.insert(branches).values(data).returning();
    return branch;
  },
  async updateBranch(id: number, data: Partial<InsertBranch>) {
    const [branch] = await db.update(branches).set({ ...data, updatedAt: new Date() }).where(eq(branches.id, id)).returning();
    return branch;
  },

  // Employees
  async getEmployees() {
    return db.select().from(employees).orderBy(desc(employees.createdAt));
  },
  async getEmployee(id: number) {
    const [emp] = await db.select().from(employees).where(eq(employees.id, id));
    return emp;
  },
  async getEmployeeByPin(pin: string) {
    const [emp] = await db.select().from(employees).where(eq(employees.pin, pin));
    return emp;
  },
  async createEmployee(data: InsertEmployee) {
    const [emp] = await db.insert(employees).values(data).returning();
    return emp;
  },
  async updateEmployee(id: number, data: Partial<InsertEmployee>) {
    const [emp] = await db.update(employees).set({ ...data, updatedAt: new Date() }).where(eq(employees.id, id)).returning();
    return emp;
  },
  async deleteEmployee(id: number) {
    await db.update(employees).set({ isActive: false }).where(eq(employees.id, id));
  },

  // Categories
  async getCategories() {
    return db.select().from(categories).orderBy(categories.sortOrder);
  },
  async createCategory(data: InsertCategory) {
    const [cat] = await db.insert(categories).values(data).returning();
    return cat;
  },
  async updateCategory(id: number, data: Partial<InsertCategory>) {
    const [cat] = await db.update(categories).set(data).where(eq(categories.id, id)).returning();
    return cat;
  },
  async deleteCategory(id: number) {
    await db.update(categories).set({ isActive: false }).where(eq(categories.id, id));
  },

  // Products
  async getProducts(search?: string) {
    if (search) {
      return db.select().from(products).where(
        and(
          eq(products.isActive, true),
          or(
            ilike(products.name, `%${search}%`),
            ilike(products.sku || "", `%${search}%`),
            ilike(products.barcode || "", `%${search}%`)
          )
        )
      ).orderBy(desc(products.createdAt));
    }
    return db.select().from(products).where(eq(products.isActive, true)).orderBy(desc(products.createdAt));
  },
  async getProduct(id: number) {
    const [prod] = await db.select().from(products).where(eq(products.id, id));
    return prod;
  },
  async getProductByBarcode(barcode: string) {
    const [prod] = await db.select().from(products).where(eq(products.barcode, barcode));
    return prod;
  },
  async createProduct(data: InsertProduct) {
    const [prod] = await db.insert(products).values(data).returning();
    return prod;
  },
  async updateProduct(id: number, data: Partial<InsertProduct>) {
    const [prod] = await db.update(products).set({ ...data, updatedAt: new Date() }).where(eq(products.id, id)).returning();
    return prod;
  },
  async deleteProduct(id: number) {
    await db.update(products).set({ isActive: false }).where(eq(products.id, id));
  },

  // Inventory
  async getInventory(branchId?: number) {
    if (branchId) {
      return db.select().from(inventory).where(eq(inventory.branchId, branchId));
    }
    return db.select().from(inventory);
  },
  async getProductInventory(productId: number, branchId: number) {
    const [inv] = await db.select().from(inventory).where(
      and(eq(inventory.productId, productId), eq(inventory.branchId, branchId))
    );
    return inv;
  },
  async upsertInventory(data: InsertInventory) {
    const existing = await this.getProductInventory(data.productId, data.branchId);
    if (existing) {
      const [inv] = await db.update(inventory)
        .set({ quantity: data.quantity, updatedAt: new Date() })
        .where(eq(inventory.id, existing.id)).returning();
      return inv;
    }
    const [inv] = await db.insert(inventory).values(data).returning();
    return inv;
  },
  async adjustInventory(productId: number, branchId: number, adjustment: number) {
    const existing = await this.getProductInventory(productId, branchId);
    if (existing) {
      const newQty = (existing.quantity || 0) + adjustment;
      const [inv] = await db.update(inventory)
        .set({ quantity: newQty, updatedAt: new Date() })
        .where(eq(inventory.id, existing.id)).returning();
      return inv;
    }
    const [inv] = await db.insert(inventory).values({ productId, branchId, quantity: adjustment }).returning();
    return inv;
  },
  async getLowStockItems(branchId?: number) {
    const result = await db.select().from(inventory);
    return result.filter(item => (item.quantity || 0) <= (item.lowStockThreshold || 10));
  },

  // Customers
  async getCustomers(search?: string) {
    if (search) {
      return db.select().from(customers).where(
        and(
          eq(customers.isActive, true),
          or(
            ilike(customers.name, `%${search}%`),
            ilike(customers.phone || "", `%${search}%`),
            ilike(customers.email || "", `%${search}%`)
          )
        )
      ).orderBy(desc(customers.createdAt));
    }
    return db.select().from(customers).where(eq(customers.isActive, true)).orderBy(desc(customers.createdAt));
  },
  async getCustomer(id: number) {
    const [cust] = await db.select().from(customers).where(eq(customers.id, id));
    return cust;
  },
  async createCustomer(data: InsertCustomer) {
    const [cust] = await db.insert(customers).values(data).returning();
    return cust;
  },
  async updateCustomer(id: number, data: Partial<InsertCustomer>) {
    const [cust] = await db.update(customers).set({ ...data, updatedAt: new Date() }).where(eq(customers.id, id)).returning();
    return cust;
  },
  async addLoyaltyPoints(id: number, points: number) {
    const cust = await this.getCustomer(id);
    if (!cust) return null;
    return this.updateCustomer(id, { loyaltyPoints: (cust.loyaltyPoints || 0) + points });
  },

  // Sales
  async getCustomerSales(customerId: number) {
    return db.select().from(sales).where(eq(sales.customerId, customerId)).orderBy(desc(sales.createdAt)).limit(50);
  },
  async getSales(filters?: { branchId?: number; startDate?: Date; endDate?: Date; limit?: number }) {
    let query = db.select().from(sales).orderBy(desc(sales.createdAt));
    if (filters?.limit) {
      return db.select().from(sales).orderBy(desc(sales.createdAt)).limit(filters.limit);
    }
    return query;
  },
  async getSale(id: number) {
    const [sale] = await db.select().from(sales).where(eq(sales.id, id));
    return sale;
  },
  async createSale(data: InsertSale) {
    const [sale] = await db.insert(sales).values(data).returning();
    return sale;
  },
  async getSaleItems(saleId: number) {
    return db.select().from(saleItems).where(eq(saleItems.saleId, saleId));
  },
  async createSaleItem(data: InsertSaleItem) {
    const [item] = await db.insert(saleItems).values(data).returning();
    return item;
  },
  async updateSale(id: number, data: Partial<InsertSale>) {
    const [sale] = await db.update(sales).set(data).where(eq(sales.id, id)).returning();
    return sale;
  },

  // Suppliers
  async getSuppliers() {
    return db.select().from(suppliers).where(eq(suppliers.isActive, true)).orderBy(desc(suppliers.createdAt));
  },
  async getSupplier(id: number) {
    const [sup] = await db.select().from(suppliers).where(eq(suppliers.id, id));
    return sup;
  },
  async createSupplier(data: InsertSupplier) {
    const [sup] = await db.insert(suppliers).values(data).returning();
    return sup;
  },
  async updateSupplier(id: number, data: Partial<InsertSupplier>) {
    const [sup] = await db.update(suppliers).set({ ...data, updatedAt: new Date() }).where(eq(suppliers.id, id)).returning();
    return sup;
  },

  // Purchase Orders
  async getPurchaseOrders() {
    return db.select().from(purchaseOrders).orderBy(desc(purchaseOrders.createdAt));
  },
  async createPurchaseOrder(data: InsertPurchaseOrder) {
    const [po] = await db.insert(purchaseOrders).values(data).returning();
    return po;
  },
  async updatePurchaseOrder(id: number, data: Partial<InsertPurchaseOrder>) {
    const [po] = await db.update(purchaseOrders).set(data).where(eq(purchaseOrders.id, id)).returning();
    return po;
  },
  async getPurchaseOrder(id: number) {
    const [po] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, id));
    return po;
  },
  async getPurchaseOrderItems(poId: number) {
    return db.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.purchaseOrderId, poId));
  },
  async createPurchaseOrderItem(data: InsertPurchaseOrderItem) {
    const [item] = await db.insert(purchaseOrderItems).values(data).returning();
    return item;
  },
  async receivePurchaseOrder(id: number, items: { productId: number; receivedQuantity: number }[]) {
    const po = await this.getPurchaseOrder(id);
    if (!po) return null;
    for (const item of items) {
      await db.update(purchaseOrderItems).set({ receivedQuantity: item.receivedQuantity })
        .where(and(eq(purchaseOrderItems.purchaseOrderId, id), eq(purchaseOrderItems.productId, item.productId)));
      if (po.branchId) {
        await this.adjustInventory(item.productId, po.branchId, item.receivedQuantity);
      }
    }
    const [updated] = await db.update(purchaseOrders).set({ status: "received", receivedDate: new Date() }).where(eq(purchaseOrders.id, id)).returning();
    return updated;
  },

  // Shifts
  async getShifts() {
    return db.select().from(shifts).orderBy(desc(shifts.startTime));
  },
  async getActiveShift(employeeId: number) {
    const [shift] = await db.select().from(shifts).where(
      and(eq(shifts.employeeId, employeeId), eq(shifts.status, "open"))
    );
    return shift;
  },
  async createShift(data: InsertShift) {
    const [shift] = await db.insert(shifts).values(data).returning();
    return shift;
  },
  async closeShift(id: number, data: { closingCash?: string; totalSales?: string; totalTransactions?: number }) {
    const [shift] = await db.update(shifts).set({
      ...data,
      endTime: new Date(),
      status: "closed",
    }).where(eq(shifts.id, id)).returning();
    return shift;
  },
  async getEmployeeAttendance(employeeId: number) {
    return db.select().from(shifts).where(eq(shifts.employeeId, employeeId)).orderBy(desc(shifts.startTime));
  },

  // Expenses
  async getExpenses() {
    return db.select().from(expenses).orderBy(desc(expenses.createdAt));
  },
  async createExpense(data: InsertExpense) {
    const [exp] = await db.insert(expenses).values(data).returning();
    return exp;
  },
  async getExpensesByDateRange(startDate?: Date, endDate?: Date) {
    const conditions = [];
    if (startDate) conditions.push(gte(expenses.date, startDate));
    if (endDate) conditions.push(lte(expenses.date, endDate));
    if (conditions.length > 0) {
      return db.select().from(expenses).where(and(...conditions)).orderBy(desc(expenses.createdAt));
    }
    return db.select().from(expenses).orderBy(desc(expenses.createdAt));
  },
  async deleteExpense(id: number) {
    await db.delete(expenses).where(eq(expenses.id, id));
  },

  // Tables
  async getTables(branchId?: number) {
    if (branchId) {
      return db.select().from(tables).where(eq(tables.branchId, branchId));
    }
    return db.select().from(tables);
  },
  async createTable(data: InsertTable) {
    const [table] = await db.insert(tables).values(data).returning();
    return table;
  },
  async updateTable(id: number, data: Partial<InsertTable>) {
    const [table] = await db.update(tables).set(data).where(eq(tables.id, id)).returning();
    return table;
  },

  // Kitchen Orders
  async getKitchenOrders(branchId?: number) {
    if (branchId) {
      return db.select().from(kitchenOrders).where(
        and(eq(kitchenOrders.branchId, branchId), eq(kitchenOrders.status, "pending"))
      ).orderBy(kitchenOrders.createdAt);
    }
    return db.select().from(kitchenOrders).where(eq(kitchenOrders.status, "pending")).orderBy(kitchenOrders.createdAt);
  },
  async createKitchenOrder(data: InsertKitchenOrder) {
    const [order] = await db.insert(kitchenOrders).values(data).returning();
    return order;
  },
  async updateKitchenOrder(id: number, data: Partial<InsertKitchenOrder>) {
    const [order] = await db.update(kitchenOrders).set({ ...data, updatedAt: new Date() }).where(eq(kitchenOrders.id, id)).returning();
    return order;
  },

  // Subscriptions
  async getSubscriptionPlans() {
    return db.select().from(subscriptionPlans).where(eq(subscriptionPlans.isActive, true));
  },
  async createSubscriptionPlan(data: InsertSubscriptionPlan) {
    const [plan] = await db.insert(subscriptionPlans).values(data).returning();
    return plan;
  },
  async getSubscriptions() {
    return db.select().from(subscriptions).orderBy(desc(subscriptions.createdAt));
  },
  async createSubscription(data: InsertSubscription) {
    const [sub] = await db.insert(subscriptions).values(data).returning();
    return sub;
  },

  // Activity Log
  async getActivityLog(limit?: number) {
    const l = limit || 50;
    return db.select().from(activityLog).orderBy(desc(activityLog.createdAt)).limit(l);
  },
  async createActivityLog(data: InsertActivityLog) {
    const [log] = await db.insert(activityLog).values(data).returning();
    return log;
  },

  // Returns
  async getReturns() {
    return db.select().from(returns).orderBy(desc(returns.createdAt));
  },
  async getReturn(id: number) {
    const [ret] = await db.select().from(returns).where(eq(returns.id, id));
    return ret;
  },
  async createReturn(data: InsertReturn) {
    const [ret] = await db.insert(returns).values(data).returning();
    return ret;
  },
  async getReturnItems(returnId: number) {
    return db.select().from(returnItems).where(eq(returnItems.returnId, returnId));
  },
  async createReturnItem(data: InsertReturnItem) {
    const [item] = await db.insert(returnItems).values(data).returning();
    return item;
  },

  // Sales Analytics
  async getSalesByDateRange(startDate: Date, endDate: Date) {
    return db.select().from(sales).where(and(gte(sales.createdAt, startDate), lte(sales.createdAt, endDate))).orderBy(desc(sales.createdAt));
  },
  async getTopProducts(limit?: number) {
    const topLimit = limit || 10;
    const result = await db.select({
      productId: saleItems.productId,
      name: saleItems.productName,
      totalSold: sql<number>`sum(${saleItems.quantity})`,
      revenue: sql<string>`sum(${saleItems.total}::numeric)`,
    }).from(saleItems).groupBy(saleItems.productId, saleItems.productName).orderBy(sql`sum(${saleItems.quantity}) desc`).limit(topLimit);
    return result.map(r => ({ ...r, totalSold: Number(r.totalSold), revenue: Number(r.revenue) }));
  },
  async getSalesByPaymentMethod() {
    const result = await db.select({
      method: sales.paymentMethod,
      count: sql<number>`count(*)`,
      total: sql<string>`coalesce(sum(${sales.totalAmount}::numeric), 0)`,
    }).from(sales).groupBy(sales.paymentMethod);
    return result.map(r => ({ method: r.method, count: Number(r.count), total: Number(r.total) }));
  },

  // Dashboard Stats
  async getDashboardStats() {
    const [salesCount] = await db.select({ count: sql<number>`count(*)` }).from(sales);
    const [totalRevenueRow] = await db.select({ total: sql<string>`coalesce(sum(total_amount::numeric), 0)` }).from(sales);
    const [customerCount] = await db.select({ count: sql<number>`count(*)` }).from(customers);
    const [productCount] = await db.select({ count: sql<number>`count(*)` }).from(products).where(eq(products.isActive, true));
    const [lowStockCount] = await db.select({ count: sql<number>`count(*)` }).from(inventory).where(sql`quantity <= low_stock_threshold`);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const [todaySales] = await db.select({
      count: sql<number>`count(*)`,
      total: sql<string>`coalesce(sum(total_amount::numeric), 0)`,
    }).from(sales).where(gte(sales.createdAt, todayStart));

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);
    const [weekSales] = await db.select({
      total: sql<string>`coalesce(sum(total_amount::numeric), 0)`,
    }).from(sales).where(gte(sales.createdAt, weekStart));

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const [monthSales] = await db.select({
      total: sql<string>`coalesce(sum(total_amount::numeric), 0)`,
    }).from(sales).where(gte(sales.createdAt, monthStart));

    const [totalExpensesRow] = await db.select({
      total: sql<string>`coalesce(sum(${expenses.amount}::numeric), 0)`,
    }).from(expenses);
    const [todayExpensesRow] = await db.select({
      total: sql<string>`coalesce(sum(${expenses.amount}::numeric), 0)`,
    }).from(expenses).where(gte(expenses.date, todayStart));

    const totalSalesNum = Number(salesCount?.count || 0);
    const totalRevenueNum = Number(totalRevenueRow?.total || 0);
    const avgOrderValue = totalSalesNum > 0 ? totalRevenueNum / totalSalesNum : 0;

    const topProducts = await this.getTopProducts(5);
    const salesByPaymentMethod = await this.getSalesByPaymentMethod();
    const recentSales = await this.getSales({ limit: 5 });

    const [profitRow] = await db.select({
      totalCost: sql<string>`coalesce(sum(p.cost_price::numeric * si.quantity), 0)`,
    }).from(sql`sale_items si join products p on si.product_id = p.id`);
    const totalCost = Number(profitRow?.totalCost || 0);

    return {
      totalSales: totalSalesNum,
      totalRevenue: totalRevenueNum,
      totalCustomers: Number(customerCount?.count || 0),
      totalProducts: Number(productCount?.count || 0),
      lowStockItems: Number(lowStockCount?.count || 0),
      todaySalesCount: Number(todaySales?.count || 0),
      todayRevenue: Number(todaySales?.total || 0),
      weekRevenue: Number(weekSales?.total || 0),
      monthRevenue: Number(monthSales?.total || 0),
      totalExpenses: Number(totalExpensesRow?.total || 0),
      todayExpenses: Number(todayExpensesRow?.total || 0),
      avgOrderValue,
      topProducts,
      salesByPaymentMethod,
      recentSales,
      totalProfit: totalRevenueNum - totalCost,
    };
  },

  // Seed Initial Data
  async seedInitialData() {
    const existingBranches = await this.getBranches();
    if (existingBranches.length > 0) return false;

    const branch = await this.createBranch({
      name: "Main Branch",
      address: "123 Main Street",
      phone: "+1234567890",
      isMain: true,
      currency: "USD",
      taxRate: "10",
    });

    await this.createEmployee({
      name: "Admin",
      email: "admin@barmagly.com",
      pin: "1234",
      role: "admin",
      branchId: branch.id,
      permissions: ["all"],
    });

    await this.createEmployee({
      name: "Cashier",
      email: "cashier@barmagly.com",
      pin: "0000",
      role: "cashier",
      branchId: branch.id,
      permissions: ["pos", "customers"],
    });

    const cats = [
      { name: "Beverages", nameAr: null, color: "#3B82F6", icon: "cafe" },
      { name: "Food", nameAr: null, color: "#EF4444", icon: "restaurant" },
      { name: "Desserts", nameAr: null, color: "#F59E0B", icon: "ice-cream" },
      { name: "Electronics", nameAr: null, color: "#8B5CF6", icon: "hardware-chip" },
      { name: "Clothing", nameAr: null, color: "#10B981", icon: "shirt" },
    ];
    const createdCats: any[] = [];
    for (const c of cats) {
      createdCats.push(await this.createCategory(c));
    }

    const prods = [
      { name: "Espresso", price: "3.50", costPrice: "1.00", categoryId: createdCats[0].id, sku: "BEV-001", barcode: "1234567890123", unit: "cup" },
      { name: "Cappuccino", price: "4.50", costPrice: "1.50", categoryId: createdCats[0].id, sku: "BEV-002", barcode: "1234567890124", unit: "cup" },
      { name: "Latte", price: "5.00", costPrice: "1.50", categoryId: createdCats[0].id, sku: "BEV-003", barcode: "1234567890125", unit: "cup" },
      { name: "Green Tea", price: "3.00", costPrice: "0.80", categoryId: createdCats[0].id, sku: "BEV-004", barcode: "1234567890126", unit: "cup" },
      { name: "Chicken Burger", price: "8.50", costPrice: "3.50", categoryId: createdCats[1].id, sku: "FOOD-001", barcode: "2234567890123", unit: "piece" },
      { name: "Caesar Salad", price: "7.00", costPrice: "2.50", categoryId: createdCats[1].id, sku: "FOOD-002", barcode: "2234567890124", unit: "plate" },
      { name: "Margherita Pizza", price: "12.00", costPrice: "4.00", categoryId: createdCats[1].id, sku: "FOOD-003", barcode: "2234567890125", unit: "piece" },
      { name: "Chocolate Cake", price: "6.00", costPrice: "2.00", categoryId: createdCats[2].id, sku: "DES-001", barcode: "3234567890123", unit: "slice" },
      { name: "Ice Cream Sundae", price: "5.50", costPrice: "1.80", categoryId: createdCats[2].id, sku: "DES-002", barcode: "3234567890124", unit: "cup" },
      { name: "USB Cable", price: "9.99", costPrice: "3.00", categoryId: createdCats[3].id, sku: "ELEC-001", barcode: "4234567890123", unit: "piece" },
      { name: "Phone Case", price: "15.00", costPrice: "5.00", categoryId: createdCats[3].id, sku: "ELEC-002", barcode: "4234567890124", unit: "piece" },
      { name: "T-Shirt", price: "25.00", costPrice: "10.00", categoryId: createdCats[4].id, sku: "CLO-001", barcode: "5234567890123", unit: "piece" },
    ];
    for (const p of prods) {
      const prod = await this.createProduct(p);
      await this.upsertInventory({ productId: prod.id, branchId: branch.id, quantity: Math.floor(Math.random() * 100) + 10 });
    }

    await this.createCustomer({ name: "Walk-in Customer", phone: "N/A" });
    await this.createCustomer({ name: "John Smith", phone: "+1555000111", email: "john@example.com", loyaltyPoints: 150 });
    await this.createCustomer({ name: "Sarah Johnson", phone: "+1555000222", email: "sarah@example.com", loyaltyPoints: 300 });

    await this.createSupplier({ name: "Fresh Foods Co.", contactName: "Mike", phone: "+1555111000", email: "mike@freshfoods.com", paymentTerms: "Net 30" });
    await this.createSupplier({ name: "Tech Supplies Ltd.", contactName: "Lisa", phone: "+1555222000", email: "lisa@techsupplies.com", paymentTerms: "Net 15" });

    for (let i = 1; i <= 6; i++) {
      await this.createTable({ branchId: branch.id, name: `Table ${i}`, capacity: i <= 3 ? 4 : 6, posX: (i - 1) % 3 * 120, posY: Math.floor((i - 1) / 3) * 120 });
    }

    return true;
  },

  // Cash Drawer Operations
  async getCashDrawerOperations(shiftId: number) {
    return db.select().from(cashDrawerOperations).where(eq(cashDrawerOperations.shiftId, shiftId)).orderBy(desc(cashDrawerOperations.createdAt));
  },
  async createCashDrawerOperation(data: InsertCashDrawerOperation) {
    const [op] = await db.insert(cashDrawerOperations).values(data).returning();
    return op;
  },

  // Warehouses
  async getWarehouses(branchId?: number) {
    if (branchId) return db.select().from(warehouses).where(and(eq(warehouses.branchId, branchId), eq(warehouses.isActive, true)));
    return db.select().from(warehouses).where(eq(warehouses.isActive, true));
  },
  async createWarehouse(data: InsertWarehouse) {
    const [wh] = await db.insert(warehouses).values(data).returning();
    return wh;
  },
  async updateWarehouse(id: number, data: Partial<InsertWarehouse>) {
    const [wh] = await db.update(warehouses).set(data).where(eq(warehouses.id, id)).returning();
    return wh;
  },

  // Warehouse Transfers
  async getWarehouseTransfers() {
    return db.select().from(warehouseTransfers).orderBy(desc(warehouseTransfers.createdAt));
  },
  async createWarehouseTransfer(data: InsertWarehouseTransfer) {
    const [transfer] = await db.insert(warehouseTransfers).values(data).returning();
    return transfer;
  },

  // Product Batches
  async getProductBatches(productId?: number) {
    if (productId) return db.select().from(productBatches).where(and(eq(productBatches.productId, productId), eq(productBatches.isActive, true))).orderBy(productBatches.expiryDate);
    return db.select().from(productBatches).where(eq(productBatches.isActive, true)).orderBy(productBatches.expiryDate);
  },
  async createProductBatch(data: InsertProductBatch) {
    const [batch] = await db.insert(productBatches).values(data).returning();
    return batch;
  },
  async updateProductBatch(id: number, data: Partial<InsertProductBatch>) {
    const [batch] = await db.update(productBatches).set(data).where(eq(productBatches.id, id)).returning();
    return batch;
  },

  // Inventory Movements
  async getInventoryMovements(productId?: number, limit?: number) {
    const l = limit || 100;
    if (productId) return db.select().from(inventoryMovements).where(eq(inventoryMovements.productId, productId)).orderBy(desc(inventoryMovements.createdAt)).limit(l);
    return db.select().from(inventoryMovements).orderBy(desc(inventoryMovements.createdAt)).limit(l);
  },
  async createInventoryMovement(data: InsertInventoryMovement) {
    const [mov] = await db.insert(inventoryMovements).values(data).returning();
    return mov;
  },

  // Stock Counts
  async getStockCounts() {
    return db.select().from(stockCounts).orderBy(desc(stockCounts.createdAt));
  },
  async getStockCount(id: number) {
    const [sc] = await db.select().from(stockCounts).where(eq(stockCounts.id, id));
    return sc;
  },
  async createStockCount(data: InsertStockCount) {
    const [sc] = await db.insert(stockCounts).values(data).returning();
    return sc;
  },
  async updateStockCount(id: number, data: Partial<InsertStockCount>) {
    const [sc] = await db.update(stockCounts).set(data).where(eq(stockCounts.id, id)).returning();
    return sc;
  },
  async getStockCountItems(stockCountId: number) {
    return db.select().from(stockCountItems).where(eq(stockCountItems.stockCountId, stockCountId));
  },
  async createStockCountItem(data: InsertStockCountItem) {
    const [item] = await db.insert(stockCountItems).values(data).returning();
    return item;
  },
  async updateStockCountItem(id: number, data: Partial<InsertStockCountItem>) {
    const [item] = await db.update(stockCountItems).set(data).where(eq(stockCountItems.id, id)).returning();
    return item;
  },

  // Supplier Contracts
  async getSupplierContracts(supplierId?: number) {
    if (supplierId) return db.select().from(supplierContracts).where(and(eq(supplierContracts.supplierId, supplierId), eq(supplierContracts.isActive, true)));
    return db.select().from(supplierContracts).where(eq(supplierContracts.isActive, true));
  },
  async createSupplierContract(data: InsertSupplierContract) {
    const [contract] = await db.insert(supplierContracts).values(data).returning();
    return contract;
  },
  async updateSupplierContract(id: number, data: Partial<InsertSupplierContract>) {
    const [contract] = await db.update(supplierContracts).set(data).where(eq(supplierContracts.id, id)).returning();
    return contract;
  },

  // Employee Commissions
  async getEmployeeCommissions(employeeId?: number) {
    if (employeeId) return db.select().from(employeeCommissions).where(eq(employeeCommissions.employeeId, employeeId)).orderBy(desc(employeeCommissions.createdAt));
    return db.select().from(employeeCommissions).orderBy(desc(employeeCommissions.createdAt));
  },
  async createEmployeeCommission(data: InsertEmployeeCommission) {
    const [comm] = await db.insert(employeeCommissions).values(data).returning();
    return comm;
  },

  // Advanced Analytics
  async getEmployeeSalesReport(employeeId: number) {
    const result = await db.select({
      count: sql<number>`count(*)`,
      total: sql<string>`coalesce(sum(${sales.totalAmount}::numeric), 0)`,
    }).from(sales).where(eq(sales.employeeId, employeeId));
    return { salesCount: Number(result[0]?.count || 0), totalRevenue: Number(result[0]?.total || 0) };
  },
  async getSlowMovingProducts(days: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const allProds = await db.select().from(products).where(eq(products.isActive, true));
    const recentSaleItems = await db.select({
      productId: saleItems.productId,
      totalSold: sql<number>`sum(${saleItems.quantity})`,
    }).from(saleItems)
      .innerJoin(sales, eq(saleItems.saleId, sales.id))
      .where(gte(sales.createdAt, cutoffDate))
      .groupBy(saleItems.productId);
    const soldMap = new Map(recentSaleItems.map(r => [r.productId, Number(r.totalSold)]));
    return allProds.filter(p => !soldMap.has(p.id) || (soldMap.get(p.id) || 0) < 3).map(p => ({
      ...p,
      recentSold: soldMap.get(p.id) || 0,
    }));
  },
  async getProfitByProduct() {
    const result = await db.select({
      productId: saleItems.productId,
      productName: saleItems.productName,
      totalRevenue: sql<string>`sum(${saleItems.total}::numeric)`,
      totalSold: sql<number>`sum(${saleItems.quantity})`,
    }).from(saleItems).groupBy(saleItems.productId, saleItems.productName);
    const prodList = await db.select().from(products);
    const prodMap = new Map(prodList.map(p => [p.id, p]));
    return result.map(r => {
      const prod = prodMap.get(r.productId);
      const costPrice = Number(prod?.costPrice || 0);
      const revenue = Number(r.totalRevenue || 0);
      const totalCost = costPrice * Number(r.totalSold || 0);
      return {
        productId: r.productId,
        productName: r.productName,
        totalRevenue: revenue,
        totalCost,
        profit: revenue - totalCost,
        totalSold: Number(r.totalSold || 0),
        costPrice,
      };
    }).sort((a, b) => b.profit - a.profit);
  },
  async getCashierPerformance() {
    const result = await db.select({
      employeeId: sales.employeeId,
      count: sql<number>`count(*)`,
      total: sql<string>`coalesce(sum(${sales.totalAmount}::numeric), 0)`,
      avgSale: sql<string>`coalesce(avg(${sales.totalAmount}::numeric), 0)`,
    }).from(sales).groupBy(sales.employeeId);
    const empList = await db.select().from(employees);
    const empMap = new Map(empList.map(e => [e.id, e]));
    return result.map(r => ({
      employeeId: r.employeeId,
      employeeName: empMap.get(r.employeeId!)?.name || "Unknown",
      role: empMap.get(r.employeeId!)?.role || "unknown",
      salesCount: Number(r.count || 0),
      totalRevenue: Number(r.total || 0),
      avgSaleValue: Number(r.avgSale || 0),
    })).sort((a, b) => b.totalRevenue - a.totalRevenue);
  },
  async getReturnsReport() {
    const result = await db.select({
      count: sql<number>`count(*)`,
      total: sql<string>`coalesce(sum(${returns.totalAmount}::numeric), 0)`,
    }).from(returns);
    const returnsList = await db.select().from(returns).orderBy(desc(returns.createdAt)).limit(20);
    return {
      totalReturns: Number(result[0]?.count || 0),
      totalRefundAmount: Number(result[0]?.total || 0),
      recentReturns: returnsList,
    };
  },
};
