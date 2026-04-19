import { db, pool } from "./db";
import { eq, desc, sql, and, gte, lte, like, or, isNull } from "drizzle-orm";
import * as fs from "fs";
import {
  branches, employees, categories, products, inventory,
  customers, sales, saleItems, suppliers, purchaseOrders,
  purchaseOrderItems, shifts, expenses, tables, tableQrCodes, kitchenOrders,
  subscriptionPlans, subscriptions, syncQueue, activityLog, returns, returnItems,
  cashDrawerOperations, warehouses, warehouseTransfers, productBatches,
  inventoryMovements, stockCounts, stockCountItems, supplierContracts, employeeCommissions,
  notifications, calls,
  type InsertBranch, type InsertEmployee, type InsertCategory,
  type InsertProduct, type InsertInventory, type InsertCustomer,
  type InsertSale, type InsertSaleItem, type InsertSupplier,
  type InsertPurchaseOrder, type InsertPurchaseOrderItem, type InsertShift, type InsertExpense,
  type InsertTable, type InsertTableQrCode, type InsertKitchenOrder, type InsertSubscriptionPlan,
  type InsertSubscription, type InsertActivityLog, type InsertReturn, type InsertReturnItem,
  type InsertCashDrawerOperation, type InsertWarehouse, type InsertWarehouseTransfer,
  type InsertProductBatch, type InsertInventoryMovement, type InsertStockCount,
  type InsertStockCountItem, type InsertSupplierContract, type InsertEmployeeCommission,
  type InsertNotification, type InsertCall, superAdmins, tenants, tenantSubscriptions, licenseKeys, tenantNotifications,
  type InsertSuperAdmin, type InsertTenant, type InsertTenantSubscription, type InsertLicenseKey, type InsertTenantNotification,
  onlineOrders, landingPageConfig, platformSettings, platformCommissions,
  vehicles, printerConfigs, dailyClosings, monthlyClosings, dailySequences,
  type InsertOnlineOrder, type InsertLandingPageConfig,
  type InsertPlatformSetting, type InsertPlatformCommission,
  type InsertVehicle, type InsertPrinterConfig, type InsertDailyClosing, type InsertMonthlyClosing,
  // Delivery Platform
  customerAddresses, promoCodes, promoCodeUsages, driverLocations,
  loyaltyTransactions, walletTransactions, orderRatings,
  customerSessions, otpVerifications, deliveryZones,
  type InsertCustomerAddress, type InsertPromoCode, type InsertDeliveryZone,
  type InsertOrderRating, type InsertLoyaltyTransaction, type InsertWalletTransaction,
} from "@shared/schema";

function getStrippedPhoneSql(column: any) {
  return sql`REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(${column}, ''), ' ', ''), '-', ''), '(', ''), ')', ''), '.', ''), '/', ''), '+', '')`;
}

function getPhoneSearchConditions(column: any, variants: string[]) {
  const strippedColumn = getStrippedPhoneSql(column);
  const conditions: any[] = [];
  const digitVariants = new Set<string>();

  for (const variant of variants) {
    if (!variant) continue;
    conditions.push(like(column, `%${variant}%`));

    const digits = variant.replace(/\D/g, "");
    if (digits.length >= 6) {
      digitVariants.add(digits);
    }
  }

  for (const digits of digitVariants) {
    conditions.push(sql`${strippedColumn} like ${"%" + digits + "%"}`);
  }

  return conditions;
}

function normalizeArrayLikeJson(value: unknown) {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
}

function normalizeOnlineOrderRecord<T extends Record<string, any> | undefined>(order: T): T {
  if (!order) {
    return order;
  }

  return {
    ...order,
    items: normalizeArrayLikeJson(order.items),
  };
}

export const storage = {
  seedLog(msg: string) {
    const timestamp = new Date().toISOString();
    try {
      fs.appendFileSync("seed_debug.log", `[${timestamp}] ${msg}\n`);
    } catch (e) { }
    console.log(msg);
  },
  // Branches
  async getBranches() {
    return db.select().from(branches).orderBy(desc(branches.createdAt));
  },
  async getBranchesByTenant(tenantId: number) {
    return db.select().from(branches).where(eq(branches.tenantId, tenantId)).orderBy(desc(branches.createdAt));
  },
  async getBranch(id: number) {
    const [branch] = await db.select().from(branches).where(eq(branches.id, id));
    return branch;
  },
  async createBranch(data: InsertBranch) {
    const _ins_branch = await db.insert(branches).values(data).$returningId();
    const [branch] = await db.select().from(branches).where(eq(branches.id, _ins_branch[0]?.id ?? 0));
    return branch;
  },
  async updateBranch(id: number, data: Partial<InsertBranch>) {
    await db.update(branches).set({ ...data, updatedAt: new Date() }).where(eq(branches.id, id));
    const [branch] = await db.select().from(branches).where(eq(branches.id, id));
    return branch;
  },
  async deleteBranch(id: number) {
    await db.delete(branches).where(eq(branches.id, id));
  },

  // Employees
  async getEmployees() {
    return db.select().from(employees).where(eq(employees.isActive, true)).orderBy(desc(employees.createdAt));
  },
  async getEmployeesByTenant(tenantId: number) {
    const tenantBranches = await this.getBranchesByTenant(tenantId);
    const branchIds = tenantBranches.map((b) => b.id);

    const { inArray } = await import('drizzle-orm');

    if (branchIds.length > 0) {
      return db.select().from(employees)
        .where(and(eq(employees.isActive, true), or(eq(employees.tenantId, tenantId), inArray(employees.branchId, branchIds))))
        .orderBy(desc(employees.createdAt));
    }
    return db.select().from(employees)
      .where(and(eq(employees.isActive, true), eq(employees.tenantId, tenantId)))
      .orderBy(desc(employees.createdAt));
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
    const _ins_emp = await db.insert(employees).values(data).$returningId();
    const [emp] = await db.select().from(employees).where(eq(employees.id, _ins_emp[0]?.id ?? 0));
    return emp;
  },
  async updateEmployee(id: number, data: Partial<InsertEmployee>) {
    await db.update(employees).set({ ...data, updatedAt: new Date() }).where(eq(employees.id, id));
    const [emp] = await db.select().from(employees).where(eq(employees.id, id));
    return emp;
  },
  async deleteEmployee(id: number) {
    await db.update(employees).set({ isActive: false, updatedAt: new Date() }).where(eq(employees.id, id));
  },

  // Categories
  async getCategories(tenantId?: number) {
    if (tenantId) {
      return db.select().from(categories).where(and(eq(categories.tenantId, tenantId), eq(categories.isActive, true))).orderBy(categories.sortOrder);
    }
    return db.select().from(categories).where(eq(categories.isActive, true)).orderBy(categories.sortOrder);
  },
  async createCategory(data: InsertCategory) {
    const _ins_cat = await db.insert(categories).values(data).$returningId();
    const [cat] = await db.select().from(categories).where(eq(categories.id, _ins_cat[0]?.id ?? 0));
    return cat;
  },
  async getCategory(id: number) {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category;
  },
  async updateCategory(id: number, data: Partial<InsertCategory>) {
    const [cat] = await db.update(categories).set(data).where(eq(categories.id, id));
    return cat;
  },
  async deleteCategory(id: number) {
    await db.update(categories).set({ isActive: false }).where(eq(categories.id, id));
  },

  // Products
  async getProducts(search?: string) {
    if (search) {
      const q = `%${search.toLowerCase()}%`;
      return db.select().from(products).where(
        and(
          eq(products.isActive, true),
          or(
            sql`LOWER(${products.name}) LIKE ${q}`,
            sql`LOWER(${products.nameAr}) LIKE ${q}`,
            sql`LOWER(${products.sku}) LIKE ${q}`,
            sql`LOWER(${products.barcode}) LIKE ${q}`,
            sql`LOWER(${products.description}) LIKE ${q}`
          )
        )
      ).orderBy(desc(products.createdAt));
    }
    return db.select().from(products).where(eq(products.isActive, true)).orderBy(desc(products.createdAt));
  },
  async getProductsByTenant(tenantId: number, search?: string) {
    if (search) {
      const q = `%${search.toLowerCase()}%`;
      return db.select().from(products).where(
        and(
          eq(products.tenantId, tenantId),
          eq(products.isActive, true),
          or(
            sql`LOWER(${products.name}) LIKE ${q}`,
            sql`LOWER(${products.nameAr}) LIKE ${q}`,
            sql`LOWER(${products.sku}) LIKE ${q}`,
            sql`LOWER(${products.barcode}) LIKE ${q}`,
            sql`LOWER(${products.description}) LIKE ${q}`
          )
        )
      ).orderBy(desc(products.createdAt));
    }
    return db.select().from(products).where(and(eq(products.tenantId, tenantId), eq(products.isActive, true))).orderBy(desc(products.createdAt));
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
    const _ins_prod = await db.insert(products).values(data).$returningId();
    const [prod] = await db.select().from(products).where(eq(products.id, _ins_prod[0]?.id ?? 0));
    return prod;
  },
  async updateProduct(id: number, data: Partial<InsertProduct>) {
    await db.update(products).set({ ...data, updatedAt: new Date() }).where(eq(products.id, id));
    const [prod] = await db.select().from(products).where(eq(products.id, id));
    return prod;
  },
  async deleteProduct(id: number) {
    await db.update(products).set({ isActive: false }).where(eq(products.id, id));
  },

  // Inventory
  async getInventory(branchId?: number, tenantId?: number) {
    if (branchId) {
      return db.select().from(inventory).where(eq(inventory.branchId, branchId));
    }
    if (tenantId) {
      const tenantBranches = await this.getBranchesByTenant(tenantId);
      const branchIds = tenantBranches.map(b => b.id);
      if (branchIds.length > 0) {
        const { inArray } = await import('drizzle-orm');
        return db.select().from(inventory).where(inArray(inventory.branchId, branchIds));
      }
      return [];
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
        .where(eq(inventory.id, existing.id));
      return inv;
    }
    const _ins_inv = await db.insert(inventory).values(data).$returningId();
    const [inv] = await db.select().from(inventory).where(eq(inventory.id, _ins_inv[0]?.id ?? 0));
    return inv;
  },
  async adjustInventory(productId: number, branchId: number, adjustment: number) {
    const existing = await this.getProductInventory(productId, branchId);
    if (existing) {
      const newQty = (existing.quantity || 0) + adjustment;
      const [inv] = await db.update(inventory)
        .set({ quantity: newQty, updatedAt: new Date() })
        .where(eq(inventory.id, existing.id));
      return inv;
    }
    const [inv] = await db.insert(inventory).values({ productId, branchId, quantity: adjustment });
    return inv;
  },
  async getLowStockItems(branchId?: number) {
    const { inArray, notInArray, lte: ltEq } = await import('drizzle-orm');

    const restaurantTenants = await db.select({ id: tenants.id }).from(tenants).where(eq(tenants.storeType, "restaurant"));
    const restaurantTenantIds = restaurantTenants.map(t => t.id);

    let excludedBranchIds: number[] = [];
    if (restaurantTenantIds.length > 0) {
      const restaurantBranches = await db.select({ id: branches.id }).from(branches).where(inArray(branches.tenantId, restaurantTenantIds));
      excludedBranchIds = restaurantBranches.map(b => b.id);
    }

    const conditions: any[] = [
      sql`${inventory.quantity} <= ${inventory.lowStockThreshold}`,
    ];

    if (branchId) {
      conditions.push(eq(inventory.branchId, branchId));
    }

    if (excludedBranchIds.length > 0) {
      conditions.push(notInArray(inventory.branchId, excludedBranchIds));
    }

    return db.select().from(inventory).where(and(...conditions));
  },

  // Customers
  async getCustomers(search?: string, tenantId?: number, limit = 50, offset = 0) {
    const conditions: any[] = [or(eq(customers.isActive, true), isNull(customers.isActive))];
    if (tenantId) conditions.push(eq(customers.tenantId, tenantId));
    if (search) {
      const looksLikePhone = /^[\d\s\+\-\(\)\.]{4,}$/.test(search.trim());
      if (looksLikePhone) {
        const { getPhoneSearchVariants } = await import("./phoneUtils");
        const variants = getPhoneSearchVariants(search.trim());
        conditions.push(or(...getPhoneSearchConditions(customers.phone, variants)));
      } else {
        conditions.push(
          or(
            like(customers.name, `%${search}%`),
            like(customers.phone || "", `%${search}%`),
            like(customers.email || "", `%${search}%`),
            like(customers.company || "", `%${search}%`),
            like(customers.city || "", `%${search}%`),
            like(customers.street || "", `%${search}%`),
            like(customers.postalCode || "", `%${search}%`),
            like(customers.firstName || "", `%${search}%`),
            like(customers.lastName || "", `%${search}%`)
          )
        );
      }
    }
    return db.select().from(customers).where(and(...conditions)).orderBy(desc(customers.createdAt)).limit(limit).offset(offset);
  },
  async getCustomerCount(search?: string, tenantId?: number) {
    const conditions: any[] = [or(eq(customers.isActive, true), isNull(customers.isActive))];
    if (tenantId) conditions.push(eq(customers.tenantId, tenantId));
    if (search) {
      const looksLikePhone = /^[\d\s\+\-\(\)\.]{4,}$/.test(search.trim());
      if (looksLikePhone) {
        const { getPhoneSearchVariants } = await import("./phoneUtils");
        const variants = getPhoneSearchVariants(search.trim());
        conditions.push(or(...getPhoneSearchConditions(customers.phone, variants)));
      } else {
        conditions.push(
          or(
            like(customers.name, `%${search}%`),
            like(customers.phone || "", `%${search}%`),
            like(customers.email || "", `%${search}%`),
            like(customers.company || "", `%${search}%`),
            like(customers.city || "", `%${search}%`),
            like(customers.street || "", `%${search}%`),
            like(customers.postalCode || "", `%${search}%`),
            like(customers.firstName || "", `%${search}%`),
            like(customers.lastName || "", `%${search}%`)
          )
        );
      }
    }
    const [result] = await db.select({ count: sql<number>`count(*)` }).from(customers).where(and(...conditions));
    return Number(result?.count || 0);
  },

  async findCustomerByPhone(phone: string, tenantId: number) {
    const { getPhoneSearchVariants, normalizePhone, lastNDigits } = await import("./phoneUtils");
    const variants = getPhoneSearchVariants(phone);
    const strippedCol = getStrippedPhoneSql(customers.phone);
    const phoneConditions = getPhoneSearchConditions(customers.phone, variants);
    // Robust last-8-digits matching: strips ALL non-digit chars and compares tail (format-agnostic)
    const last8 = lastNDigits(phone, 8);
    if (last8.length >= 7) {
      phoneConditions.push(
        sql`RIGHT(${strippedCol}, 8) = ${last8}`
      );
    }
    // Last-7-digits matching: catches Swiss numbers stored without area code (e.g. "3716640")
    // when the incoming call arrives as "0443716640" (10 digits)
    const last7 = lastNDigits(phone, 7);
    if (last7.length === 7) {
      phoneConditions.push(
        sql`${strippedCol} = ${last7}`
      );
    }
    const conditions: any[] = [
      eq(customers.isActive, true),
      or(...phoneConditions),
    ];
    if (tenantId) {
      conditions.push(eq(customers.tenantId, tenantId));
    }
    const normalized = normalizePhone(phone);
    const results = await db.select().from(customers).where(and(...conditions)).limit(5);
    results.sort((a, b) => {
      const aNorm = a.phone ? normalizePhone(a.phone) : '';
      const bNorm = b.phone ? normalizePhone(b.phone) : '';
      const aExact = aNorm === normalized ? 0 : 1;
      const bExact = bNorm === normalized ? 0 : 1;
      return aExact - bExact;
    });
    return results;
  },
  async getCustomer(id: number) {
    const [cust] = await db.select().from(customers).where(eq(customers.id, id));
    return cust;
  },
  async createCustomer(data: InsertCustomer) {
    const _ins_cust = await db.insert(customers).values(data).$returningId();
    const [cust] = await db.select().from(customers).where(eq(customers.id, _ins_cust[0]?.id ?? 0));
    return cust;
  },
  async updateCustomer(id: number, data: Partial<InsertCustomer>) {
    await db.update(customers).set({ ...data, updatedAt: new Date() }).where(eq(customers.id, id));
    const [cust] = await db.select().from(customers).where(eq(customers.id, id));
    return cust;
  },
  async deleteCustomer(id: number) {
    const [cust] = await db.delete(customers).where(eq(customers.id, id));
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
  async getSales(filters?: { branchId?: number; tenantId?: number; startDate?: Date; endDate?: Date; limit?: number }) {
    let conditions = [];
    if (filters?.branchId) conditions.push(eq(sales.branchId, filters.branchId));
    if (filters?.tenantId) {
      // Find branches for this tenant to filter sales
      const tenantBranches = await this.getBranchesByTenant(filters.tenantId);
      const branchIds = tenantBranches.map(b => b.id);
      if (branchIds.length > 0) {
        const { inArray } = await import('drizzle-orm');
        conditions.push(inArray(sales.branchId, branchIds));
      } else {
        // No branches means no sales
        return [];
      }
    }

    let query = conditions.length > 0 ? db.select().from(sales).where(and(...conditions)) : db.select().from(sales);

    if (filters?.limit) {
      return query.orderBy(desc(sales.createdAt)).limit(filters.limit);
    }
    return query.orderBy(desc(sales.createdAt));
  },
  async getSale(id: number) {
    const [sale] = await db.select().from(sales).where(eq(sales.id, id));
    return sale;
  },
  async createSale(data: InsertSale) {
    const _ins_sale = await db.insert(sales).values(data).$returningId();
    const [sale] = await db.select().from(sales).where(eq(sales.id, _ins_sale[0]?.id ?? 0));
    return sale;
  },
  async getSaleItems(saleId: number) {
    return db.select().from(saleItems).where(eq(saleItems.saleId, saleId));
  },
  async deleteSaleItems(saleId: number) {
    await db.delete(saleItems).where(eq(saleItems.saleId, saleId));
  },
  async createSaleItem(data: InsertSaleItem) {
    const _ins_item = await db.insert(saleItems).values(data).$returningId();
    const [item] = await db.select().from(saleItems).where(eq(saleItems.id, _ins_item[0]?.id ?? 0));
    return item;
  },
  async updateSale(id: number, data: Partial<InsertSale>) {
    const [sale] = await db.update(sales).set(data).where(eq(sales.id, id));
    return sale;
  },
  async deleteSale(id: number) {
    await db.delete(saleItems).where(eq(saleItems.saleId, id));
    await db.delete(sales).where(eq(sales.id, id));
  },

  // Suppliers
  async getSuppliers(tenantId?: number) {
    if (tenantId) {
      return db.select().from(suppliers).where(and(eq(suppliers.tenantId, tenantId), eq(suppliers.isActive, true))).orderBy(desc(suppliers.createdAt));
    }
    return db.select().from(suppliers).where(eq(suppliers.isActive, true)).orderBy(desc(suppliers.createdAt));
  },
  async getSupplier(id: number) {
    const [sup] = await db.select().from(suppliers).where(eq(suppliers.id, id));
    return sup;
  },
  async createSupplier(data: InsertSupplier) {
    const _ins_sup = await db.insert(suppliers).values(data).$returningId();
    const [sup] = await db.select().from(suppliers).where(eq(suppliers.id, _ins_sup[0]?.id ?? 0));
    return sup;
  },
  async updateSupplier(id: number, data: Partial<InsertSupplier>) {
    await db.update(suppliers).set({ ...data, updatedAt: new Date() }).where(eq(suppliers.id, id));
    const [sup] = await db.select().from(suppliers).where(eq(suppliers.id, id));
    return sup;
  },

  // Purchase Orders
  async getPurchaseOrders(tenantId?: number) {
    if (tenantId) {
      const tenantBranches = await this.getBranchesByTenant(tenantId);
      const branchIds = tenantBranches.map(b => b.id);
      if (branchIds.length > 0) {
        const { inArray } = await import('drizzle-orm');
        return db.select().from(purchaseOrders).where(inArray(purchaseOrders.branchId, branchIds)).orderBy(desc(purchaseOrders.createdAt));
      }
      return [];
    }
    return db.select().from(purchaseOrders).orderBy(desc(purchaseOrders.createdAt));
  },
  async createPurchaseOrder(data: InsertPurchaseOrder) {
    const _ins_po = await db.insert(purchaseOrders).values(data).$returningId();
    const [po] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, _ins_po[0]?.id ?? 0));
    return po;
  },
  async updatePurchaseOrder(id: number, data: Partial<InsertPurchaseOrder>) {
    const [po] = await db.update(purchaseOrders).set(data).where(eq(purchaseOrders.id, id));
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
    const _ins_item = await db.insert(purchaseOrderItems).values(data).$returningId();
    const [item] = await db.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.id, _ins_item[0]?.id ?? 0));
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
    await db.update(purchaseOrders).set({ status: "received", receivedDate: new Date() }).where(eq(purchaseOrders.id, id));
    const [updated] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, id));
    return updated;
  },

  // Shifts
  async getShifts(tenantId?: number) {
    if (tenantId) {
      const tenantBranches = await this.getBranchesByTenant(tenantId);
      const branchIds = tenantBranches.map(b => b.id);
      if (branchIds.length > 0) {
        const { inArray } = await import('drizzle-orm');
        return db.select().from(shifts).where(inArray(shifts.branchId, branchIds)).orderBy(desc(shifts.startTime));
      }
      return [];
    }
    return db.select().from(shifts).orderBy(desc(shifts.startTime));
  },
  async getActiveShiftsGlobal(tenantId?: number) {
    if (tenantId) {
      const tenantBranches = await this.getBranchesByTenant(tenantId);
      const branchIds = tenantBranches.map(b => b.id);
      if (branchIds.length > 0) {
        const { inArray } = await import('drizzle-orm');
        return db.select().from(shifts).where(and(eq(shifts.status, "open"), inArray(shifts.branchId, branchIds))).orderBy(desc(shifts.startTime));
      }
      return [];
    }
    return db.select().from(shifts).where(eq(shifts.status, "open")).orderBy(desc(shifts.startTime));
  },
  async getActiveShift(employeeId: number) {
    const [shift] = await db.select().from(shifts).where(
      and(eq(shifts.employeeId, employeeId), eq(shifts.status, "open"))
    );
    return shift;
  },
  async createShift(data: InsertShift) {
    const _ins_shift = await db.insert(shifts).values(data).$returningId();
    const [shift] = await db.select().from(shifts).where(eq(shifts.id, _ins_shift[0]?.id ?? 0));
    return shift;
  },
  async closeShift(id: number, data: { closingCash?: string; totalSales?: string; totalTransactions?: number }) {
    const [shift] = await db.update(shifts).set({
      ...data,
      endTime: new Date(),
      status: "closed",
    }).where(eq(shifts.id, id));
    return shift;
  },
  async getEmployeeAttendance(employeeId: number) {
    return db.select().from(shifts).where(eq(shifts.employeeId, employeeId)).orderBy(desc(shifts.startTime));
  },

  // Expenses
  async getExpenses(tenantId?: number) {
    if (tenantId) {
      return db.select().from(expenses).where(eq(expenses.tenantId, tenantId)).orderBy(desc(expenses.createdAt));
    }
    return db.select().from(expenses).orderBy(desc(expenses.createdAt));
  },
  async createExpense(data: InsertExpense) {
    const _ins_exp = await db.insert(expenses).values(data).$returningId();
    const [exp] = await db.select().from(expenses).where(eq(expenses.id, _ins_exp[0]?.id ?? 0));
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
    const _ins_table = await db.insert(tables).values(data).$returningId();
    const [table] = await db.select().from(tables).where(eq(tables.id, _ins_table[0]?.id ?? 0));
    return table;
  },
  async updateTable(id: number, data: Partial<InsertTable>) {
    const [table] = await db.update(tables).set(data).where(eq(tables.id, id));
    return table;
  },

  // Table QR Codes
  async getTableQrCodes(tenantId: number) {
    return db.select().from(tableQrCodes).where(eq(tableQrCodes.tenantId, tenantId)).orderBy(tableQrCodes.tableName);
  },
  async getTableQrCodeByToken(token: string) {
    const [qr] = await db.select().from(tableQrCodes).where(eq(tableQrCodes.qrToken, token));
    return qr;
  },
  async createTableQrCode(data: InsertTableQrCode) {
    const _ins = await db.insert(tableQrCodes).values(data).$returningId();
    const [qr] = await db.select().from(tableQrCodes).where(eq(tableQrCodes.id, _ins[0]?.id ?? 0));
    return qr;
  },
  async updateTableQrCode(id: number, data: Partial<InsertTableQrCode>) {
    await db.update(tableQrCodes).set(data).where(eq(tableQrCodes.id, id));
    const [qr] = await db.select().from(tableQrCodes).where(eq(tableQrCodes.id, id));
    return qr;
  },
  async deleteTableQrCode(id: number) {
    await db.delete(tableQrCodes).where(eq(tableQrCodes.id, id));
  },
  async incrementQrScanCount(token: string) {
    await db.update(tableQrCodes)
      .set({ scannedCount: sql`scanned_count + 1`, lastScannedAt: new Date() })
      .where(eq(tableQrCodes.qrToken, token));
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
    const _ins_order = await db.insert(kitchenOrders).values(data).$returningId();
    const [order] = await db.select().from(kitchenOrders).where(eq(kitchenOrders.id, _ins_order[0]?.id ?? 0));
    return order;
  },
  async updateKitchenOrder(id: number, data: Partial<InsertKitchenOrder>) {
    await db.update(kitchenOrders).set({ ...data, updatedAt: new Date() }).where(eq(kitchenOrders.id, id));
    const [order] = await db.select().from(kitchenOrders).where(eq(kitchenOrders.id, id));
    return order;
  },

  // Subscriptions
  async getSubscriptionPlans() {
    return db.select().from(subscriptionPlans).where(eq(subscriptionPlans.isActive, true));
  },
  async createSubscriptionPlan(data: InsertSubscriptionPlan) {
    const _ins_plan = await db.insert(subscriptionPlans).values(data).$returningId();
    const [plan] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, _ins_plan[0]?.id ?? 0));
    return plan;
  },
  async getSubscriptions() {
    return db.select().from(subscriptions).orderBy(desc(subscriptions.createdAt));
  },
  async createSubscription(data: InsertSubscription) {
    const _ins_sub = await db.insert(subscriptions).values(data).$returningId();
    const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.id, _ins_sub[0]?.id ?? 0));
    return sub;
  },

  async getActivityLog(limit?: number, tenantId?: number) {
    const l = limit || 50;
    if (tenantId) {
      const emps = await this.getEmployeesByTenant(tenantId);
      const empIds = emps.map(e => e.id);
      if (empIds.length > 0) {
        const { inArray } = await import('drizzle-orm');
        return db.select().from(activityLog).where(inArray(activityLog.employeeId, empIds)).orderBy(desc(activityLog.createdAt)).limit(l);
      }
      return [];
    }
    return db.select().from(activityLog).orderBy(desc(activityLog.createdAt)).limit(l);
  },
  async createActivityLog(data: InsertActivityLog) {
    const _ins_log = await db.insert(activityLog).values(data).$returningId();
    const [log] = await db.select().from(activityLog).where(eq(activityLog.id, _ins_log[0]?.id ?? 0));
    return log;
  },

  // Calls
  async getCalls(tenantId?: number, limit = 500) {
    const conditions = [];
    if (tenantId) conditions.push(eq(calls.tenantId, tenantId));

    const baseQuery = db
      .select({
        id: calls.id,
        tenantId: calls.tenantId,
        branchId: calls.branchId,
        phoneNumber: calls.phoneNumber,
        customerId: calls.customerId,
        status: calls.status,
        saleId: calls.saleId,
        createdAt: calls.createdAt,
        customerName: customers.name,
        customerAddress: customers.address,
      })
      .from(calls)
      .leftJoin(customers, eq(calls.customerId, customers.id));

    const withWhere = conditions.length > 0
      ? baseQuery.where(and(...conditions))
      : baseQuery;

    return withWhere.orderBy(desc(calls.createdAt)).limit(limit);
  },
  async createCall(data: InsertCall) {
    const _ins_call = await db.insert(calls).values(data).$returningId();
    const [call] = await db.select().from(calls).where(eq(calls.id, _ins_call[0]?.id ?? 0));
    return call;
  },
  async updateCall(id: number, data: Partial<InsertCall>) {
    const [call] = await db.update(calls).set(data).where(eq(calls.id, id));
    return call;
  },

  // Returns
  async getReturns(tenantId?: number) {
    if (tenantId) {
      const tenantBranches = await this.getBranchesByTenant(tenantId);
      const branchIds = tenantBranches.map(b => b.id);
      if (branchIds.length > 0) {
        const { inArray } = await import('drizzle-orm');
        return db.select().from(returns).where(inArray(returns.branchId, branchIds)).orderBy(desc(returns.createdAt));
      }
      return [];
    }
    return db.select().from(returns).orderBy(desc(returns.createdAt));
  },
  async getReturn(id: number) {
    const [ret] = await db.select().from(returns).where(eq(returns.id, id));
    return ret;
  },
  async createReturn(data: InsertReturn) {
    const _ins_ret = await db.insert(returns).values(data).$returningId();
    const [ret] = await db.select().from(returns).where(eq(returns.id, _ins_ret[0]?.id ?? 0));
    return ret;
  },
  async getReturnItems(returnId: number) {
    return db.select().from(returnItems).where(eq(returnItems.returnId, returnId));
  },
  async createReturnItem(data: InsertReturnItem) {
    const _ins_item = await db.insert(returnItems).values(data).$returningId();
    const [item] = await db.select().from(returnItems).where(eq(returnItems.id, _ins_item[0]?.id ?? 0));
    return item;
  },

  // Sales Analytics
  async getSalesByDateRange(startDate: Date, endDate: Date) {
    return db.select().from(sales).where(and(gte(sales.createdAt, startDate), lte(sales.createdAt, endDate))).orderBy(desc(sales.createdAt));
  },
  async getSalesWithCustomerByDateRange(startDate: Date, endDate: Date) {
    return db.select({
      id: sales.id,
      receiptNumber: sales.receiptNumber,
      totalAmount: sales.totalAmount,
      createdAt: sales.createdAt,
      customerId: sales.customerId,
      employeeId: sales.employeeId,
      customerName: customers.name,
      customerAddress: customers.address,
      customerStreet: customers.street,
      customerStreetNr: customers.streetNr,
      customerHouseNr: customers.houseNr,
      customerCity: customers.city,
      customerPostalCode: customers.postalCode,
    }).from(sales)
      .leftJoin(customers, eq(sales.customerId, customers.id))
      .where(and(gte(sales.createdAt, startDate), lte(sales.createdAt, endDate)))
      .orderBy(sales.createdAt);
  },
  async getTopProducts(limit?: number) {
    const topLimit = limit || 10;
    const result = await db.select({
      productId: saleItems.productId,
      name: saleItems.productName,
      totalSold: sql<number>`sum(${saleItems.quantity})`,
      revenue: sql<string>`sum(${saleItems.total})`,
    }).from(saleItems).groupBy(saleItems.productId, saleItems.productName).orderBy(sql`sum(${saleItems.quantity}) desc`).limit(topLimit);
    return result.map(r => ({ ...r, totalSold: Number(r.totalSold), revenue: Number(r.revenue) }));
  },
  async getSalesByPaymentMethod() {
    const result = await db.select({
      method: sales.paymentMethod,
      count: sql<number>`count(*)`,
      total: sql<string>`coalesce(sum(${sales.totalAmount}), 0)`,
    }).from(sales).groupBy(sales.paymentMethod);
    return result.map(r => ({ method: r.method, count: Number(r.count), total: Number(r.total) }));
  },

  // Dashboard Stats
  async getDashboardStats(tenantId?: number) {
    let salesCountQuery: any = db.select({ count: sql<number>`count(*)` }).from(sales);
    let totalRevenueQuery: any = db.select({ total: sql<string>`coalesce(sum(total_amount), 0)` }).from(sales);
    let customerCountQuery: any = db.select({ count: sql<number>`count(*)` }).from(customers);
    let productCountQuery: any = db.select({ count: sql<number>`count(*)` }).from(products).where(eq(products.isActive, true));

    let lowStockQuery: any;
    let todaySalesQuery: any;
    let weekSalesQuery: any;
    let monthSalesQuery: any;
    let totalExpensesQuery: any = db.select({ total: sql<string>`coalesce(sum(${expenses.amount}), 0)` }).from(expenses);
    let todayExpensesQuery: any;
    let topProductsQuery: any;
    let salesByPaymentMethodQuery: any;
    let recentSalesQuery: any;
    let profitRowQuery: any;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    if (tenantId) {
      const tenantBranches = await this.getBranchesByTenant(tenantId);
      const branchIds = tenantBranches.map(b => b.id);

      if (branchIds.length > 0) {
        const { inArray } = await import('drizzle-orm');

        salesCountQuery = db.select({ count: sql<number>`count(*)` }).from(sales).where(inArray(sales.branchId, branchIds));
        totalRevenueQuery = db.select({ total: sql<string>`coalesce(sum(total_amount), 0)` }).from(sales).where(inArray(sales.branchId, branchIds));

        // Customers don't have direct branchId, use tenantId
        customerCountQuery = db.select({ count: sql<number>`count(*)` }).from(customers).where(eq(customers.tenantId, tenantId));
        productCountQuery = db.select({ count: sql<number>`count(*)` }).from(products).where(and(eq(products.tenantId, tenantId), eq(products.isActive, true)));

        const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId));
        const isRestaurant = tenant?.storeType === "restaurant";

        lowStockQuery = isRestaurant
          ? db.select({ count: sql<number>`cast(0 as integer)` }).from(branches).limit(1)
          : db.select({ count: sql<number>`count(*)` }).from(inventory).where(and(sql`quantity <= low_stock_threshold`, inArray(inventory.branchId, branchIds)));

        todaySalesQuery = db.select({
          count: sql<number>`count(*)`,
          total: sql<string>`coalesce(sum(total_amount), 0)`,
        }).from(sales).where(and(gte(sales.createdAt, todayStart), inArray(sales.branchId, branchIds)));

        weekSalesQuery = db.select({
          total: sql<string>`coalesce(sum(total_amount), 0)`,
        }).from(sales).where(and(gte(sales.createdAt, weekStart), inArray(sales.branchId, branchIds)));

        monthSalesQuery = db.select({
          total: sql<string>`coalesce(sum(total_amount), 0)`,
        }).from(sales).where(and(gte(sales.createdAt, monthStart), inArray(sales.branchId, branchIds)));

        totalExpensesQuery = db.select({ total: sql<string>`coalesce(sum(${expenses.amount}), 0)` }).from(expenses).where(eq(expenses.tenantId, tenantId));

        todayExpensesQuery = db.select({
          total: sql<string>`coalesce(sum(${expenses.amount}), 0)`,
        }).from(expenses).where(and(gte(expenses.date, todayStart), eq(expenses.tenantId, tenantId)));

        const topLimit = 5;
        topProductsQuery = db.select({
          productId: saleItems.productId,
          name: saleItems.productName,
          totalSold: sql<number>`sum(${saleItems.quantity})`,
          revenue: sql<string>`sum(${saleItems.total})`,
        }).from(saleItems)
          .innerJoin(sales, eq(saleItems.saleId, sales.id))
          .where(inArray(sales.branchId, branchIds))
          .groupBy(saleItems.productId, saleItems.productName)
          .orderBy(sql`sum(${saleItems.quantity}) desc`)
          .limit(topLimit);

        salesByPaymentMethodQuery = db.select({
          method: sales.paymentMethod,
          count: sql<number>`count(*)`,
          total: sql<string>`coalesce(sum(${sales.totalAmount}), 0)`,
        }).from(sales).where(inArray(sales.branchId, branchIds)).groupBy(sales.paymentMethod);

        recentSalesQuery = db.select().from(sales).where(inArray(sales.branchId, branchIds)).orderBy(desc(sales.createdAt)).limit(5);

        profitRowQuery = db.select({
          totalCost: sql<string>`coalesce(sum(${products.costPrice} * ${saleItems.quantity}), 0)`,
        }).from(saleItems)
          .innerJoin(products, eq(saleItems.productId, products.id))
          .innerJoin(sales, eq(saleItems.saleId, sales.id))
          .where(inArray(sales.branchId, branchIds));
      } else {
        // No branches, return all zeros
        return {
          totalSales: 0, totalRevenue: 0, totalCustomers: 0, totalProducts: 0,
          lowStockItems: 0, todaySalesCount: 0, todayRevenue: 0, weekRevenue: 0,
          monthRevenue: 0, totalExpenses: 0, todayExpenses: 0, avgOrderValue: 0,
          topProducts: [], salesByPaymentMethod: [], recentSales: [], totalProfit: 0,
        };
      }
    } else {
      lowStockQuery = db.select({ count: sql<number>`count(*)` }).from(inventory).where(sql`quantity <= low_stock_threshold`);

      todaySalesQuery = db.select({
        count: sql<number>`count(*)`,
        total: sql<string>`coalesce(sum(total_amount), 0)`,
      }).from(sales).where(gte(sales.createdAt, todayStart));

      weekSalesQuery = db.select({
        total: sql<string>`coalesce(sum(total_amount), 0)`,
      }).from(sales).where(gte(sales.createdAt, weekStart));

      monthSalesQuery = db.select({
        total: sql<string>`coalesce(sum(total_amount), 0)`,
      }).from(sales).where(gte(sales.createdAt, monthStart));

      todayExpensesQuery = db.select({
        total: sql<string>`coalesce(sum(${expenses.amount}), 0)`,
      }).from(expenses).where(gte(expenses.date, todayStart));

      topProductsQuery = db.select({
        productId: saleItems.productId,
        name: saleItems.productName,
        totalSold: sql<number>`sum(${saleItems.quantity})`,
        revenue: sql<string>`sum(${saleItems.total})`,
      }).from(saleItems).groupBy(saleItems.productId, saleItems.productName).orderBy(sql`sum(${saleItems.quantity}) desc`).limit(5);

      salesByPaymentMethodQuery = db.select({
        method: sales.paymentMethod,
        count: sql<number>`count(*)`,
        total: sql<string>`coalesce(sum(${sales.totalAmount}), 0)`,
      }).from(sales).groupBy(sales.paymentMethod);

      recentSalesQuery = db.select().from(sales).orderBy(desc(sales.createdAt)).limit(5);

      profitRowQuery = db.select({
        totalCost: sql<string>`coalesce(sum(${products.costPrice} * ${saleItems.quantity}), 0)`,
      }).from(saleItems)
        .innerJoin(products, eq(saleItems.productId, products.id));
    }

    const [salesCount] = await salesCountQuery;
    const [totalRevenueRow] = await totalRevenueQuery;
    const [customerCount] = await customerCountQuery;
    const [productCount] = await productCountQuery;
    const [lowStockCount] = await lowStockQuery;

    const [todaySales] = await todaySalesQuery;
    const [weekSales] = await weekSalesQuery;
    const [monthSales] = await monthSalesQuery;

    const [totalExpensesRow] = await totalExpensesQuery;
    const [todayExpensesRow] = await todayExpensesQuery;

    const topProductsResult = await topProductsQuery;
    const topProducts = topProductsResult.map((r: any) => ({ ...r, totalSold: Number(r.totalSold), revenue: Number(r.revenue) }));

    const salesByPaymentMethodResult = await salesByPaymentMethodQuery;
    const salesByPaymentMethod = salesByPaymentMethodResult.map((r: any) => ({ method: r.method, count: Number(r.count), total: Number(r.total) }));

    const recentSales = await recentSalesQuery;

    const [profitRow] = await profitRowQuery;

    const totalSalesNum = Number(salesCount?.count || 0);
    const totalRevenueNum = Number(totalRevenueRow?.total || 0);
    const avgOrderValue = totalSalesNum > 0 ? totalRevenueNum / totalSalesNum : 0;
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
      currency: "CHF",
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
    const _ins_op = await db.insert(cashDrawerOperations).values(data).$returningId();
    const [op] = await db.select().from(cashDrawerOperations).where(eq(cashDrawerOperations.id, _ins_op[0]?.id ?? 0));
    return op;
  },

  // Warehouses
  async getWarehouses(branchId?: number, tenantId?: number) {
    if (branchId) return db.select().from(warehouses).where(and(eq(warehouses.branchId, branchId), eq(warehouses.isActive, true)));
    if (tenantId) {
      const tenantBranches = await this.getBranchesByTenant(tenantId);
      const branchIds = tenantBranches.map(b => b.id);
      if (branchIds.length > 0) {
        const { inArray } = await import('drizzle-orm');
        return db.select().from(warehouses).where(and(inArray(warehouses.branchId, branchIds), eq(warehouses.isActive, true)));
      }
      return [];
    }
    return db.select().from(warehouses).where(eq(warehouses.isActive, true));
  },
  async createWarehouse(data: InsertWarehouse) {
    const _ins_wh = await db.insert(warehouses).values(data).$returningId();
    const [wh] = await db.select().from(warehouses).where(eq(warehouses.id, _ins_wh[0]?.id ?? 0));
    return wh;
  },
  async updateWarehouse(id: number, data: Partial<InsertWarehouse>) {
    const [wh] = await db.update(warehouses).set(data).where(eq(warehouses.id, id));
    return wh;
  },

  // Warehouse Transfers
  async getWarehouseTransfers() {
    return db.select().from(warehouseTransfers).orderBy(desc(warehouseTransfers.createdAt));
  },
  async createWarehouseTransfer(data: InsertWarehouseTransfer) {
    const _ins_transfer = await db.insert(warehouseTransfers).values(data).$returningId();
    const [transfer] = await db.select().from(warehouseTransfers).where(eq(warehouseTransfers.id, _ins_transfer[0]?.id ?? 0));
    return transfer;
  },

  // Product Batches
  async getProductBatches(productId?: number, tenantId?: number) {
    const conditions = [eq(productBatches.isActive, true)];
    if (productId) conditions.push(eq(productBatches.productId, productId));
    if (tenantId) {
      const tenantBranches = await this.getBranchesByTenant(tenantId);
      const branchIds = tenantBranches.map(b => b.id);
      if (branchIds.length > 0) {
        const { inArray } = await import('drizzle-orm');
        conditions.push(inArray(productBatches.branchId, branchIds));
      } else { return []; }
    }
    const { and } = await import('drizzle-orm');
    return db.select().from(productBatches).where(and(...conditions)).orderBy(productBatches.expiryDate);
  },
  async createProductBatch(data: InsertProductBatch) {
    const _ins_batch = await db.insert(productBatches).values(data).$returningId();
    const [batch] = await db.select().from(productBatches).where(eq(productBatches.id, _ins_batch[0]?.id ?? 0));
    return batch;
  },
  async updateProductBatch(id: number, data: Partial<InsertProductBatch>) {
    const [batch] = await db.update(productBatches).set(data).where(eq(productBatches.id, id));
    return batch;
  },

  // Inventory Movements
  async getInventoryMovements(productId?: number, limit?: number) {
    const l = limit || 100;
    if (productId) return db.select().from(inventoryMovements).where(eq(inventoryMovements.productId, productId)).orderBy(desc(inventoryMovements.createdAt)).limit(l);
    return db.select().from(inventoryMovements).orderBy(desc(inventoryMovements.createdAt)).limit(l);
  },
  async createInventoryMovement(data: InsertInventoryMovement) {
    const _ins_mov = await db.insert(inventoryMovements).values(data).$returningId();
    const [mov] = await db.select().from(inventoryMovements).where(eq(inventoryMovements.id, _ins_mov[0]?.id ?? 0));
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
    const _ins_sc = await db.insert(stockCounts).values(data).$returningId();
    const [sc] = await db.select().from(stockCounts).where(eq(stockCounts.id, _ins_sc[0]?.id ?? 0));
    return sc;
  },
  async updateStockCount(id: number, data: Partial<InsertStockCount>) {
    const [sc] = await db.update(stockCounts).set(data).where(eq(stockCounts.id, id));
    return sc;
  },
  async getStockCountItems(stockCountId: number) {
    return db.select().from(stockCountItems).where(eq(stockCountItems.stockCountId, stockCountId));
  },
  async createStockCountItem(data: InsertStockCountItem) {
    const _ins_item = await db.insert(stockCountItems).values(data).$returningId();
    const [item] = await db.select().from(stockCountItems).where(eq(stockCountItems.id, _ins_item[0]?.id ?? 0));
    return item;
  },
  async updateStockCountItem(id: number, data: Partial<InsertStockCountItem>) {
    const [item] = await db.update(stockCountItems).set(data).where(eq(stockCountItems.id, id));
    return item;
  },

  // Supplier Contracts
  async getSupplierContracts(supplierId?: number) {
    if (supplierId) return db.select().from(supplierContracts).where(and(eq(supplierContracts.supplierId, supplierId), eq(supplierContracts.isActive, true)));
    return db.select().from(supplierContracts).where(eq(supplierContracts.isActive, true));
  },
  async createSupplierContract(data: InsertSupplierContract) {
    const _ins_contract = await db.insert(supplierContracts).values(data).$returningId();
    const [contract] = await db.select().from(supplierContracts).where(eq(supplierContracts.id, _ins_contract[0]?.id ?? 0));
    return contract;
  },
  async updateSupplierContract(id: number, data: Partial<InsertSupplierContract>) {
    const [contract] = await db.update(supplierContracts).set(data).where(eq(supplierContracts.id, id));
    return contract;
  },

  // Employee Commissions
  async getEmployeeCommissions(employeeId?: number) {
    if (employeeId) return db.select().from(employeeCommissions).where(eq(employeeCommissions.employeeId, employeeId)).orderBy(desc(employeeCommissions.createdAt));
    return db.select().from(employeeCommissions).orderBy(desc(employeeCommissions.createdAt));
  },
  async createEmployeeCommission(data: InsertEmployeeCommission) {
    const _ins_comm = await db.insert(employeeCommissions).values(data).$returningId();
    const [comm] = await db.select().from(employeeCommissions).where(eq(employeeCommissions.id, _ins_comm[0]?.id ?? 0));
    return comm;
  },

  // Advanced Analytics
  async getEmployeeSalesReport(employeeId: number) {
    const result = await db.select({
      count: sql<number>`count(*)`,
      total: sql<string>`coalesce(sum(${sales.totalAmount}), 0)`,
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
      totalRevenue: sql<string>`sum(${saleItems.total})`,
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
      total: sql<string>`coalesce(sum(${sales.totalAmount}), 0)`,
      avgSale: sql<string>`coalesce(avg(${sales.totalAmount}), 0)`,
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
      total: sql<string>`coalesce(sum(${returns.totalAmount}), 0)`,
    }).from(returns);
    const returnsList = await db.select().from(returns).orderBy(desc(returns.createdAt)).limit(20);
    return {
      totalReturns: Number(result[0]?.count || 0),
      totalRefundAmount: Number(result[0]?.total || 0),
      recentReturns: returnsList,
    };
  },

  // Notifications
  async getNotifications(recipientId: number) {
    return db.select().from(notifications).where(eq(notifications.recipientId, recipientId)).orderBy(desc(notifications.createdAt)).limit(50);
  },
  async getUnreadNotificationCount(recipientId: number) {
    const [result] = await db.select({ count: sql<number>`count(*)` }).from(notifications).where(and(eq(notifications.recipientId, recipientId), eq(notifications.isRead, false)));
    return Number(result?.count || 0);
  },
  async createNotification(data: InsertNotification) {
    const _ins_notif = await db.insert(notifications).values(data).$returningId();
    const [notif] = await db.select().from(notifications).where(eq(notifications.id, _ins_notif[0]?.id ?? 0));
    return notif;
  },
  async markNotificationRead(id: number) {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
    const [notif] = await db.select().from(notifications).where(eq(notifications.id, id));
    return notif;
  },
  async markAllNotificationsRead(recipientId: number) {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.recipientId, recipientId));
  },
  async notifyAdmins(senderId: number, type: string, title: string, message: string, entityType?: string, entityId?: number, priority?: string) {
    const admins = await db.select().from(employees).where(
      or(eq(employees.role, "admin"), eq(employees.role, "owner"))
    );
    const notifs = [];
    for (const admin of admins) {
      if (admin.id === senderId) continue;
      const [notif] = await db.insert(notifications).values({
        recipientId: admin.id,
        senderId,
        type,
        title,
        message,
        entityType,
        entityId,
        priority: priority || "normal",
      });
      notifs.push(notif);
    }
    return notifs;
  },

  // Enhanced shift operations
  async getShiftWithEmployee(shiftId: number) {
    const [shift] = await db.select().from(shifts).where(eq(shifts.id, shiftId));
    if (!shift) return null;
    const [emp] = await db.select().from(employees).where(eq(employees.id, shift.employeeId));
    return { ...shift, employee: emp };
  },
  async getAllActiveShifts(tenantId?: number) {
    let activeShifts: any[];
    if (tenantId) {
      const tenantBranches = await this.getBranchesByTenant(tenantId);
      const branchIds = tenantBranches.map(b => b.id);
      if (branchIds.length > 0) {
        const { inArray } = await import('drizzle-orm');
        activeShifts = await db.select().from(shifts).where(and(eq(shifts.status, "open"), inArray(shifts.branchId, branchIds))).orderBy(desc(shifts.startTime));
      } else {
        activeShifts = [];
      }
    } else {
      activeShifts = await db.select().from(shifts).where(eq(shifts.status, "open")).orderBy(desc(shifts.startTime));
    }
    const empList = await db.select().from(employees);
    const empMap = new Map(empList.map(e => [e.id, e]));
    return activeShifts.map(s => ({
      ...s,
      employeeName: empMap.get(s.employeeId)?.name || "Unknown",
      employeeRole: empMap.get(s.employeeId)?.role || "unknown",
    }));
  },
  async getShiftStats(tenantId?: number) {
    let allShifts: any[];
    if (tenantId) {
      const tenantBranches = await this.getBranchesByTenant(tenantId);
      const branchIds = tenantBranches.map(b => b.id);
      if (branchIds.length > 0) {
        const { inArray } = await import('drizzle-orm');
        allShifts = await db.select().from(shifts).where(inArray(shifts.branchId, branchIds)).orderBy(desc(shifts.startTime)).limit(100);
      } else {
        allShifts = [];
      }
    } else {
      allShifts = await db.select().from(shifts).orderBy(desc(shifts.startTime)).limit(100);
    }
    const empList = await db.select().from(employees);
    const empMap = new Map(empList.map(e => [e.id, e]));
    const activeShifts = allShifts.filter(s => s.status === "open");
    const closedShifts = allShifts.filter(s => s.status === "closed");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayShifts = allShifts.filter(s => s.startTime && new Date(s.startTime) >= today);
    return {
      activeCount: activeShifts.length,
      todayCount: todayShifts.length,
      totalTransactions: closedShifts.reduce((sum, s) => sum + (s.totalTransactions || 0), 0),
      totalSales: closedShifts.reduce((sum, s) => sum + Number(s.totalSales || 0), 0),
      shifts: allShifts.map(s => ({
        ...s,
        employeeName: empMap.get(s.employeeId)?.name || "Unknown",
        employeeRole: empMap.get(s.employeeId)?.role || "unknown",
      })),
    };
  },
  async updateShift(id: number, data: Partial<typeof shifts.$inferInsert>) {
    const [shift] = await db.update(shifts).set(data).where(eq(shifts.id, id));
    return shift;
  },

  // ========== Super Admin System ==========

  // Vehicles / Fleet Management
  async getVehicles(tenantId?: number, branchId?: number) {
    if (tenantId && branchId) return db.select().from(vehicles).where(and(eq(vehicles.tenantId, tenantId), eq(vehicles.branchId, branchId), eq(vehicles.isActive, true))).orderBy(desc(vehicles.createdAt));
    if (tenantId) return db.select().from(vehicles).where(and(eq(vehicles.tenantId, tenantId), eq(vehicles.isActive, true))).orderBy(desc(vehicles.createdAt));
    return db.select().from(vehicles).where(eq(vehicles.isActive, true)).orderBy(desc(vehicles.createdAt));
  },
  async createVehicle(data: InsertVehicle) {
    const _ins_v = await db.insert(vehicles).values(data).$returningId();
    const [v] = await db.select().from(vehicles).where(eq(vehicles.id, _ins_v[0]?.id ?? 0));
    return v;
  },
  async updateVehicle(id: number, data: Partial<InsertVehicle>) {
    const [v] = await db.update(vehicles).set(data).where(eq(vehicles.id, id));
    return v;
  },
  async deleteVehicle(id: number) {
    await db.update(vehicles).set({ isActive: false }).where(eq(vehicles.id, id));
  },

  // Printer Configurations
  async getPrinterConfigs(tenantId: number, branchId?: number) {
    if (branchId) return db.select().from(printerConfigs).where(and(eq(printerConfigs.tenantId, tenantId), eq(printerConfigs.branchId, branchId)));
    return db.select().from(printerConfigs).where(eq(printerConfigs.tenantId, tenantId));
  },
  async upsertPrinterConfig(data: InsertPrinterConfig) {
    const existing = await db.select().from(printerConfigs).where(and(eq(printerConfigs.tenantId, data.tenantId), eq(printerConfigs.receiptType, data.receiptType)));
    if (existing.length > 0) {
      const [c] = await db.update(printerConfigs).set({ ...data, updatedAt: new Date() }).where(eq(printerConfigs.id, existing[0].id));
      return c;
    }
    const _ins_c = await db.insert(printerConfigs).values(data).$returningId();
    const [c] = await db.select().from(printerConfigs).where(eq(printerConfigs.id, _ins_c[0]?.id ?? 0));
    return c;
  },

  // Daily Closings
  async getDailyClosings(tenantId: number, branchId?: number) {
    if (branchId) return db.select().from(dailyClosings).where(and(eq(dailyClosings.tenantId, tenantId), eq(dailyClosings.branchId, branchId))).orderBy(desc(dailyClosings.createdAt));
    return db.select().from(dailyClosings).where(eq(dailyClosings.tenantId, tenantId)).orderBy(desc(dailyClosings.createdAt));
  },
  async createDailyClosing(data: InsertDailyClosing) {
    const _ins_dc = await db.insert(dailyClosings).values(data).$returningId();
    const [dc] = await db.select().from(dailyClosings).where(eq(dailyClosings.id, _ins_dc[0]?.id ?? 0));
    return dc;
  },
  async getDailyClosingByDate(tenantId: number, closingDate: string, branchId?: number) {
    if (branchId) {
      const [dc] = await db.select().from(dailyClosings).where(and(eq(dailyClosings.tenantId, tenantId), eq(dailyClosings.closingDate, closingDate), eq(dailyClosings.branchId, branchId)));
      return dc;
    }
    const [dc] = await db.select().from(dailyClosings).where(and(eq(dailyClosings.tenantId, tenantId), eq(dailyClosings.closingDate, closingDate)));
    return dc;
  },

  // Monthly Closings
  async getMonthlyClosings(tenantId: number, branchId?: number) {
    if (branchId) return db.select().from(monthlyClosings).where(and(eq(monthlyClosings.tenantId, tenantId), eq(monthlyClosings.branchId, branchId))).orderBy(desc(monthlyClosings.createdAt));
    return db.select().from(monthlyClosings).where(eq(monthlyClosings.tenantId, tenantId)).orderBy(desc(monthlyClosings.createdAt));
  },
  async createMonthlyClosing(data: InsertMonthlyClosing) {
    const _ins_mc = await db.insert(monthlyClosings).values(data).$returningId();
    const [mc] = await db.select().from(monthlyClosings).where(eq(monthlyClosings.id, _ins_mc[0]?.id ?? 0));
    return mc;
  },
  async getMonthlyClosingByMonth(tenantId: number, closingMonth: string, branchId?: number) {
    if (branchId) {
      const [mc] = await db.select().from(monthlyClosings).where(and(eq(monthlyClosings.tenantId, tenantId), eq(monthlyClosings.closingMonth, closingMonth), eq(monthlyClosings.branchId, branchId)));
      return mc;
    }
    const [mc] = await db.select().from(monthlyClosings).where(and(eq(monthlyClosings.tenantId, tenantId), eq(monthlyClosings.closingMonth, closingMonth)));
    return mc;
  },

  // Super Admins
  async getSuperAdmins() {
    return db.select().from(superAdmins).orderBy(desc(superAdmins.createdAt));
  },
  async getSuperAdmin(id: number) {
    const [admin] = await db.select().from(superAdmins).where(eq(superAdmins.id, id));
    return admin;
  },
  async getSuperAdminByEmail(email: string) {
    const [admin] = await db.select().from(superAdmins).where(eq(superAdmins.email, email));
    return admin;
  },
  async createSuperAdmin(data: InsertSuperAdmin) {
    const _ins_admin = await db.insert(superAdmins).values(data).$returningId();
    const [admin] = await db.select().from(superAdmins).where(eq(superAdmins.id, _ins_admin[0]?.id ?? 0));
    return admin;
  },
  async updateSuperAdmin(id: number, data: Partial<InsertSuperAdmin>) {
    await db.update(superAdmins).set({ ...data, updatedAt: new Date() }).where(eq(superAdmins.id, id));
    const [admin] = await db.select().from(superAdmins).where(eq(superAdmins.id, id));
    return admin;
  },

  // Tenants
  async getTenants() {
    return db.select().from(tenants).orderBy(desc(tenants.createdAt));
  },
  async getTenantsWithStats() {
    const allTenants = await this.getTenants();

    const results = [];
    for (const tenant of allTenants) {
      const tenantBranches = await this.getBranchesByTenant(tenant.id);
      const branchIds = tenantBranches.map(b => b.id);
      const tenantEmployees = await this.getEmployeesByTenant(tenant.id);

      let salesToday = "0.00";
      if (branchIds.length > 0) {
        const { inArray } = await import('drizzle-orm');
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const [todaySales] = await db.select({
          total: sql<string>`coalesce(sum(total_amount), 0)`,
        }).from(sales).where(and(gte(sales.createdAt, todayStart), inArray(sales.branchId, branchIds)));
        salesToday = Number(todaySales?.total || 0).toFixed(2);
      }

      results.push({
        ...tenant,
        branchCount: tenantBranches.length,
        employeeCount: tenantEmployees.length,
        salesToday,
      });
    }
    return results;
  },
  async getTenant(id: number) {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id));
    return tenant;
  },
  async getTenantByEmail(email: string) {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.ownerEmail, email));
    return tenant;
  },
  async createTenant(data: InsertTenant) {
    const _ins_tenant = await db.insert(tenants).values(data).$returningId();
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, _ins_tenant[0]?.id ?? 0));
    return tenant;
  },
  async updateTenant(id: number, data: Partial<InsertTenant>) {
    await db.update(tenants).set({ ...data, updatedAt: new Date() }).where(eq(tenants.id, id));
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id));
    return tenant;
  },
  async deleteTenant(id: number) {
    await db.delete(licenseKeys).where(eq(licenseKeys.tenantId, id));
    await db.delete(tenantSubscriptions).where(eq(tenantSubscriptions.tenantId, id));
    await db.delete(tenantNotifications).where(eq(tenantNotifications.tenantId, id));
    await db.delete(tenants).where(eq(tenants.id, id));
  },

  // Tenant Subscriptions
  async getTenantSubscriptions(tenantId?: number) {
    if (tenantId) {
      return db.select().from(tenantSubscriptions).where(eq(tenantSubscriptions.tenantId, tenantId)).orderBy(desc(tenantSubscriptions.createdAt));
    }
    return db.select().from(tenantSubscriptions).orderBy(desc(tenantSubscriptions.createdAt));
  },
  async getTenantSubscription(id: number) {
    const [sub] = await db.select().from(tenantSubscriptions).where(eq(tenantSubscriptions.id, id));
    return sub;
  },
  async createTenantSubscription(data: InsertTenantSubscription) {
    const _ins_sub = await db.insert(tenantSubscriptions).values(data).$returningId();
    const [sub] = await db.select().from(tenantSubscriptions).where(eq(tenantSubscriptions.id, _ins_sub[0]?.id ?? 0));
    return sub;
  },
  async updateTenantSubscription(id: number, data: Partial<InsertTenantSubscription>) {
    await db.update(tenantSubscriptions).set({ ...data, updatedAt: new Date() }).where(eq(tenantSubscriptions.id, id));
    const [sub] = await db.select().from(tenantSubscriptions).where(eq(tenantSubscriptions.id, id));
    return sub;
  },
  async deleteTenantSubscription(id: number) {
    await db.delete(tenantSubscriptions).where(eq(tenantSubscriptions.id, id));
  },

  // License Keys
  async getLicenseKeys(tenantId?: number) {
    if (tenantId) {
      return db.select().from(licenseKeys).where(eq(licenseKeys.tenantId, tenantId)).orderBy(desc(licenseKeys.createdAt));
    }
    return db.select().from(licenseKeys).orderBy(desc(licenseKeys.createdAt));
  },
  async getLicenseKey(id: number) {
    const [key] = await db.select().from(licenseKeys).where(eq(licenseKeys.id, id));
    return key;
  },
  async getLicenseByKey(keyString: string) {
    const [key] = await db.select().from(licenseKeys).where(eq(licenseKeys.licenseKey, keyString));
    return key;
  },
  async createLicenseKey(data: InsertLicenseKey) {
    const _ins_key = await db.insert(licenseKeys).values(data).$returningId();
    const [key] = await db.select().from(licenseKeys).where(eq(licenseKeys.id, _ins_key[0]?.id ?? 0));
    return key;
  },
  async updateLicenseKey(id: number, data: Partial<InsertLicenseKey>) {
    await db.update(licenseKeys).set({ ...data, updatedAt: new Date() }).where(eq(licenseKeys.id, id));
    const [key] = await db.select().from(licenseKeys).where(eq(licenseKeys.id, id));
    return key;
  },

  // Tenant Notifications
  async getTenantNotifications(tenantId?: number) {
    if (tenantId) {
      return db.select().from(tenantNotifications).where(eq(tenantNotifications.tenantId, tenantId)).orderBy(desc(tenantNotifications.createdAt));
    }
    return db.select().from(tenantNotifications).orderBy(desc(tenantNotifications.createdAt));
  },
  async createTenantNotification(data: InsertTenantNotification) {
    const _ins_notif = await db.insert(tenantNotifications).values(data).$returningId();
    const [notif] = await db.select().from(tenantNotifications).where(eq(tenantNotifications.id, _ins_notif[0]?.id ?? 0));
    return notif;
  },
  async updateTenantNotification(id: number, data: Partial<InsertTenantNotification>) {
    const [notif] = await db.update(tenantNotifications).set(data).where(eq(tenantNotifications.id, id));
    return notif;
  },

  // Tenants & Store Config
  // (Removed duplicate getTenants, getTenant, updateTenant to fix TypeScript errors)

  // Bulk Operations
  async bulkCreateCustomers(data: any[]) {
    if (data.length === 0) return [];
    const { inArray } = await import("drizzle-orm");

    const sanitizedRows = data.map((row) => {
      const { id, createdAt, updatedAt, ...payload } = row;
      return payload;
    });

    const tenantPhoneGroups = new Map<string, string[]>();
    for (const row of sanitizedRows) {
      const tenantId = row.tenantId;
      const phone = typeof row.phone === "string" ? row.phone.trim() : "";
      if (!tenantId || !phone) continue;

      const groupKey = String(tenantId);
      const phones = tenantPhoneGroups.get(groupKey) || [];
      if (!phones.includes(phone)) {
        phones.push(phone);
        tenantPhoneGroups.set(groupKey, phones);
      }
    }

    const existingByTenantPhone = new Map<string, any>();
    for (const [tenantId, phones] of tenantPhoneGroups.entries()) {
      if (phones.length === 0) continue;
      const existingCustomers = await db.select().from(customers).where(
        and(
          eq(customers.tenantId, Number(tenantId)),
          inArray(customers.phone, phones),
        ),
      );
      for (const existing of existingCustomers) {
        existingByTenantPhone.set(`${existing.tenantId}::${existing.phone}`, existing);
      }
    }

    const results: any[] = [];
    for (const row of sanitizedRows) {
      const tenantId = row.tenantId;
      const phone = typeof row.phone === "string" ? row.phone.trim() : "";
      const lookupKey = tenantId && phone ? `${tenantId}::${phone}` : "";
      const basePayload = {
        ...row,
        phone: phone || null,
      };

      const existing = lookupKey ? existingByTenantPhone.get(lookupKey) : undefined;
      if (existing) {
        await db.update(customers).set({ ...basePayload, updatedAt: new Date() }).where(eq(customers.id, existing.id));
        const updated = await this.getCustomer(existing.id);
        if (updated) {
          existingByTenantPhone.set(lookupKey, updated);
          results.push(updated);
        }
        continue;
      }

      const created = await this.createCustomer(basePayload);
      if (created) {
        if (lookupKey) {
          existingByTenantPhone.set(lookupKey, created);
        }
        results.push(created);
      }
    }

    return results;
  },
  async bulkCreateProducts(data: InsertProduct[]) {
    if (data.length === 0) return [];
    return db.insert(products).values(data);
  },

  // System Wide Analytics
  async getSuperAdminDashboardStats() {
    try {
      this.seedLog("Fetching Super Admin dashboard stats...");

      const [tenantCount] = await db.select({ count: sql<number>`count(*)` }).from(tenants);
      const [activeTenants] = await db.select({ count: sql<number>`count(*)` }).from(tenants).where(eq(tenants.status, "active"));
      const [activeSubs] = await db.select({ count: sql<number>`count(*)` }).from(tenantSubscriptions).where(eq(tenantSubscriptions.status, "active"));

      // Convert current date to PG interval representation or simply use JavaScript dates
      const in7Days = new Date();
      in7Days.setDate(in7Days.getDate() + 7);
      const now = new Date();

      const [expiringSubs] = await db.select({ count: sql<number>`count(*)` })
        .from(tenantSubscriptions)
        .where(and(eq(tenantSubscriptions.status, "active"), lte(tenantSubscriptions.endDate, in7Days), gte(tenantSubscriptions.endDate, now)));

      // Safer revenue aggregation
      const [revenueRow] = await db.select({ total: sql<string>`coalesce(sum(price), 0)` }).from(tenantSubscriptions).where(eq(tenantSubscriptions.status, "active"));

      // Recent activity
      const recentTenants = await db.select().from(tenants).orderBy(desc(tenants.createdAt)).limit(5);
      const recentSubs = await db.select().from(tenantSubscriptions).orderBy(desc(tenantSubscriptions.createdAt)).limit(5);

      return {
        totalTenants: Number(tenantCount?.count || 0),
        activeTenants: Number(activeTenants?.count || 0),
        activeSubscriptions: Number(activeSubs?.count || 0),
        expiringSubscriptions: Number(expiringSubs?.count || 0),
        monthlyRevenue: parseFloat(revenueRow?.total || "0"),
        recentTenants,
        recentSubscriptions: recentSubs
      };
    } catch (error: any) {
      this.seedLog(`ERROR in getSuperAdminDashboardStats: ${error.message}`);
      throw error;
    }
  },

  // ── Online Orders ──────────────────────────────────────────────────────────
  async getOnlineOrders(tenantId?: number, status?: string) {
    const conditions = [];
    if (tenantId) conditions.push(eq(onlineOrders.tenantId, tenantId));
    if (status) conditions.push(eq(onlineOrders.status, status));
    if (conditions.length > 0) {
      const orders = await db.select().from(onlineOrders).where(and(...conditions)).orderBy(desc(onlineOrders.createdAt));
      return orders.map((order) => normalizeOnlineOrderRecord(order));
    }
    const orders = await db.select().from(onlineOrders).orderBy(desc(onlineOrders.createdAt));
    return orders.map((order) => normalizeOnlineOrderRecord(order));
  },

  async getOnlineOrder(id: number) {
    const [order] = await db.select().from(onlineOrders).where(eq(onlineOrders.id, id));
    return normalizeOnlineOrderRecord(order);
  },

  async createOnlineOrder(data: InsertOnlineOrder) {
    const _ins_order = await db.insert(onlineOrders).values(data).$returningId();
    const [order] = await db.select().from(onlineOrders).where(eq(onlineOrders.id, _ins_order[0]?.id ?? 0));
    return normalizeOnlineOrderRecord(order);
  },

  async updateOnlineOrder(id: number, data: Partial<InsertOnlineOrder>) {
    await db.update(onlineOrders).set({ ...data, updatedAt: new Date() }).where(eq(onlineOrders.id, id));
    const [order] = await db.select().from(onlineOrders).where(eq(onlineOrders.id, id));
    return normalizeOnlineOrderRecord(order);
  },

  async deleteOnlineOrder(id: number) {
    await db.delete(onlineOrders).where(eq(onlineOrders.id, id));
  },

  // ── Landing Page Config ────────────────────────────────────────────────────


  async getOnboardingStatus(tenantId: number) {
    const categoriesList = await this.getCategories(tenantId);
    const productsList = await this.getProductsByTenant(tenantId);
    const tenant = await this.getTenant(tenantId);

    return {
      hasCategory: categoriesList.length > 0,
      hasProduct: productsList.length > 0,
      isCompleted: tenant?.setupCompleted || false
    };
  },

  async getLandingPageConfig(tenantId: number) {
    const [config] = await db.select().from(landingPageConfig).where(eq(landingPageConfig.tenantId, tenantId));
    return config;
  },

  async getLandingPageConfigBySlug(slug: string) {
    const [config] = await db.select().from(landingPageConfig).where(eq(landingPageConfig.slug, slug));
    return config;
  },

  async getAllLandingPageConfigs(tenantId?: string) {
    if (tenantId) {
      return db.select().from(landingPageConfig).where(eq(landingPageConfig.tenantId, Number(tenantId)));
    }
    return db.select().from(landingPageConfig);
  },

  async upsertLandingPageConfig(tenantId: number, data: Partial<InsertLandingPageConfig>) {
    if (!data.slug) {
      const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId));
      if (tenant) {
        data.slug = tenant.businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      }
    }
    const existing = await this.getLandingPageConfig(tenantId);
    if (existing) {
      const [updated] = await db.update(landingPageConfig)
        .set({ ...data, tenantId, updatedAt: new Date() })
        .where(eq(landingPageConfig.tenantId, tenantId))
        ;
      return updated;
    } else {
      const [created] = await db.insert(landingPageConfig)
        .values({ tenantId, ...data } as InsertLandingPageConfig)
        ;
      return created;
    }
  },

  // Seed Super Admin Data
  async seedSuperAdminData() {
    this.seedLog("seedSuperAdminData started");
    const existingTenants = await this.getTenants();
    this.seedLog(`Existing tenants count: ${existingTenants.length}`);
    if (existingTenants.length > 0) return false;

    // 1. Create Default Super Admin if not exists
    const adminEmail = "admin@barmagly.com";
    this.seedLog(`Checking for super admin: ${adminEmail}`);
    const existingAdmin = await this.getSuperAdminByEmail(adminEmail);
    if (!existingAdmin) {
      await this.createSuperAdmin({
        name: "Super Admin",
        email: adminEmail,
        passwordHash: "$2b$10$OoKOgYj3UlErVOmwqm4rnOpZLdqpLDF3zBiO4VuXJQa56F0DLlesK",
        role: "super_admin",
        isActive: true,
      });
    }

    // 2. Create Demo Tenants
    const demoTenants = [
      {
        businessName: "Glow Beauty Salon",
        ownerName: "Sarah Johnson",
        ownerEmail: "sarah@glowsalon.com",
        ownerPhone: "+1234567890",
        address: "456 Fashion Ave, NY",
        status: "active",
        maxBranches: 2,
        maxEmployees: 10,
      },
      {
        businessName: "The Gentlemen's Barber",
        ownerName: "Michael Brown",
        ownerEmail: "michael@gentbarber.com",
        ownerPhone: "+1987654321",
        address: "789 Grooming St, CA",
        status: "active",
        maxBranches: 1,
        maxEmployees: 5,
      },
      {
        businessName: "Serenity Wellness Spa",
        ownerName: "Emily Davis",
        ownerEmail: "emily@serenityspa.com",
        ownerPhone: "+1555444333",
        address: "101 Peace Way, FL",
        status: "active",
        maxBranches: 3,
        maxEmployees: 15,
      }
    ];

    for (const t of demoTenants) {
      const tenant = await this.createTenant(t as any);

      // 3. Create Subscriptions for each tenant
      const plans = [
        { name: "Monthly Basic", type: "monthly", price: "29.99" },
        { name: "Yearly Pro", type: "yearly", price: "299.99" },
        { name: "Trial", type: "trial", price: "0" }
      ];

      const plan = plans[Math.floor(Math.random() * plans.length)];

      const startDate = new Date();
      const endDate = new Date();
      if (plan.type === 'monthly') endDate.setMonth(endDate.getMonth() + 1);
      else if (plan.type === 'yearly') endDate.setFullYear(endDate.getFullYear() + 1);
      else endDate.setDate(endDate.getDate() + 30);

      const sub = await this.createTenantSubscription({
        tenantId: tenant.id,
        planName: plan.name,
        planType: plan.type as any,
        price: plan.price,
        status: "active",
        startDate,
        endDate,
        autoRenew: plan.type !== 'trial',
      });

      // 4. Create License Key
      const randomSegments = Array.from({ length: 4 }, () =>
        Math.random().toString(36).substring(2, 6).toUpperCase()
      );
      const licenseKey = `DEMO-${randomSegments.join('-')}`;

      await this.createLicenseKey({
        licenseKey,
        tenantId: tenant.id,
        subscriptionId: sub.id,
        status: "active",
        maxActivations: 3,
        expiresAt: endDate,
        notes: "Demo license key",
      });

      // 5. Ensure tenant has data (branch/admin)
      await this.ensureTenantData(tenant.id);

      // 6. Create Sample Notifications
      await this.createTenantNotification({
        tenantId: tenant.id,
        type: "info",
        title: "Welcome to Barmagly!",
        message: `Hello ${tenant.ownerName}, thank you for joining our platform.`,
        priority: "normal",
      });
    }

    return true;
  },

  /**
   * Ensures a tenant has at least one branch and one admin account.
   * Useful for self-healing and after activation.
   */
  async ensureTenantData(tenantId: number) {
    const tenant = await this.getTenant(tenantId);
    if (!tenant) return;

    const tenantBranches = await db.select().from(branches).where(eq(branches.tenantId, tenantId)).limit(1);
    let branchId: number;

    if (tenantBranches.length === 0) {
      this.seedLog(`Creating default branch for tenant ${tenantId}`);
      const [newBranch] = await db.insert(branches).values({
        tenantId,
        name: "Main Branch",
        address: tenant.address || "Main Street",
        phone: tenant.ownerPhone || "123456789",
        isMain: true,
        currency: "CHF",
        taxRate: "10",
      });

      branchId = newBranch.id;
    } else {
      branchId = tenantBranches[0].id;
    }

    const tenantEmployees = await db.select({ id: employees.id })
      .from(employees)
      .innerJoin(branches, eq(employees.branchId, branches.id))
      .where(eq(branches.tenantId, tenantId))
      .limit(1);

    if (tenantEmployees.length === 0) {
      this.seedLog(`Creating default admin for tenant ${tenantId}`);
      await this.createEmployee({
        name: tenant.ownerName.split(" ")[0] || "Admin",
        email: tenant.ownerEmail,
        pin: "1234",
        role: "admin",
        branchId: branchId,
        permissions: ["all"],
      });
    }
  },

  // ── Platform Settings ──────────────────────────────────────────────────────
  async getPlatformSetting(key: string): Promise<string | null> {
    const [row] = await db.select().from(platformSettings).where(eq(platformSettings.key, key));
    return row?.value ?? null;
  },
  async setPlatformSetting(key: string, value: string) {
    const existing = await db.select().from(platformSettings).where(eq(platformSettings.key, key));
    if (existing.length > 0) {
      await db.update(platformSettings).set({ value, updatedAt: new Date() }).where(eq(platformSettings.key, key));
    } else {
      await db.insert(platformSettings).values({ key, value });
    }
  },
  async getCommissionRate(): Promise<number> {
    const val = await this.getPlatformSetting("commission_rate");
    return val ? parseFloat(val) : 6.0;
  },

  // ── Platform Commissions ───────────────────────────────────────────────────
  async createPlatformCommission(data: InsertPlatformCommission) {
    const _ins_row = await db.insert(platformCommissions).values(data).$returningId();
    const [row] = await db.select().from(platformCommissions).where(eq(platformCommissions.id, _ins_row[0]?.id ?? 0));
    return row;
  },
  async getPlatformCommissions(tenantId?: number) {
    if (tenantId) {
      return db.select().from(platformCommissions).where(eq(platformCommissions.tenantId, tenantId)).orderBy(desc(platformCommissions.createdAt));
    }
    return db.select().from(platformCommissions).orderBy(desc(platformCommissions.createdAt));
  },
  async getCommissionSummary() {
    const allTenants = await this.getTenants();
    const result = [];
    let grandTotal = 0;
    for (const t of allTenants) {
      try {
        const [row] = await db.select({
          total: sql<string>`coalesce(sum(commission_amount), 0)`,
          count: sql<number>`count(*)`
        }).from(platformCommissions).where(eq(platformCommissions.tenantId, t.id));
        const total = parseFloat(row?.total || "0");
        grandTotal += total;
        result.push({ tenantId: t.id, businessName: t.businessName, commissionTotal: total, count: Number(row?.count || 0) });
      } catch {
        result.push({ tenantId: t.id, businessName: t.businessName, commissionTotal: 0, count: 0 });
      }
    }
    return { tenants: result, grandTotal };
  },

  // ── Daily Sequential Numbering (resets at midnight Europe/Zurich) ──────────
  async getNextSequenceNumber(scopeKey: string): Promise<number> {
    // Get current date in Swiss timezone (Europe/Zurich = UTC+1/+2)
    const swissDate = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Zurich",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date()); // returns YYYY-MM-DD
    const dateCompact = swissDate.replace(/-/g, ""); // YYYYMMDD

    const [result] = await pool.query(
      `
        INSERT INTO daily_sequences (\`scope_key\`, \`date\`, \`counter\`)
        VALUES (?, ?, 1)
        ON DUPLICATE KEY UPDATE \`counter\` = LAST_INSERT_ID(\`counter\` + 1)
      `,
      [scopeKey, dateCompact],
    ) as any;

    if (result?.affectedRows === 1) {
      return 1;
    }

    return Number(result?.insertId || 1);
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ── Delivery Platform Storage Methods ──────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Delivery Zones ──────────────────────────────────────────────────────────
  async getDeliveryZones(tenantId: number) {
    return db.select().from(deliveryZones)
      .where(eq(deliveryZones.tenantId, tenantId))
      .orderBy(deliveryZones.sortOrder);
  },

  async createDeliveryZone(data: InsertDeliveryZone) {
    const [r] = await db.insert(deliveryZones).values(data).$returningId();
    const [zone] = await db.select().from(deliveryZones).where(eq(deliveryZones.id, r.id)).limit(1);
    return zone;
  },

  async updateDeliveryZone(id: number, data: Partial<InsertDeliveryZone>) {
    await db.update(deliveryZones).set(data).where(eq(deliveryZones.id, id));
    const [zone] = await db.select().from(deliveryZones).where(eq(deliveryZones.id, id)).limit(1);
    return zone;
  },

  async deleteDeliveryZone(id: number) {
    await db.delete(deliveryZones).where(eq(deliveryZones.id, id));
  },

  // ── Promo Codes ─────────────────────────────────────────────────────────────
  async getPromoCodes(tenantId: number) {
    return db.select().from(promoCodes)
      .where(eq(promoCodes.tenantId, tenantId))
      .orderBy(desc(promoCodes.createdAt));
  },

  async getPromoCode(tenantId: number, code: string) {
    const [promo] = await db.select().from(promoCodes)
      .where(and(eq(promoCodes.tenantId, tenantId), eq(promoCodes.code, code.toUpperCase())))
      .limit(1);
    return promo ?? null;
  },

  async createPromoCode(data: InsertPromoCode) {
    const [r] = await db.insert(promoCodes).values({ ...data, code: (data.code as string).toUpperCase() }).$returningId();
    const [promo] = await db.select().from(promoCodes).where(eq(promoCodes.id, r.id)).limit(1);
    return promo;
  },

  async updatePromoCode(id: number, data: Partial<InsertPromoCode>) {
    await db.update(promoCodes).set(data).where(eq(promoCodes.id, id));
    const [promo] = await db.select().from(promoCodes).where(eq(promoCodes.id, id)).limit(1);
    return promo;
  },

  async deletePromoCode(id: number) {
    await db.delete(promoCodes).where(eq(promoCodes.id, id));
  },

  // ── Customer Addresses ──────────────────────────────────────────────────────
  async getCustomerAddresses(customerId: number) {
    return db.select().from(customerAddresses)
      .where(eq(customerAddresses.customerId, customerId))
      .orderBy(desc(customerAddresses.isDefault), desc(customerAddresses.id));
  },

  async createCustomerAddress(data: InsertCustomerAddress) {
    if (data.isDefault) {
      await db.update(customerAddresses)
        .set({ isDefault: false })
        .where(eq(customerAddresses.customerId, data.customerId));
    }
    const [r] = await db.insert(customerAddresses).values(data).$returningId();
    const [addr] = await db.select().from(customerAddresses).where(eq(customerAddresses.id, r.id)).limit(1);
    return addr;
  },

  async updateCustomerAddress(id: number, data: Partial<InsertCustomerAddress>) {
    if (data.isDefault && data.customerId) {
      await db.update(customerAddresses)
        .set({ isDefault: false })
        .where(eq(customerAddresses.customerId, data.customerId));
    }
    await db.update(customerAddresses).set(data).where(eq(customerAddresses.id, id));
    const [addr] = await db.select().from(customerAddresses).where(eq(customerAddresses.id, id)).limit(1);
    return addr;
  },

  async deleteCustomerAddress(id: number) {
    await db.delete(customerAddresses).where(eq(customerAddresses.id, id));
  },

  async setDefaultAddress(id: number, customerId: number) {
    await db.update(customerAddresses).set({ isDefault: false }).where(eq(customerAddresses.customerId, customerId));
    await db.update(customerAddresses).set({ isDefault: true }).where(eq(customerAddresses.id, id));
  },

  // ── Order Ratings ───────────────────────────────────────────────────────────
  async createOrderRating(data: InsertOrderRating) {
    const [r] = await db.insert(orderRatings).values(data).$returningId();
    // Update order rating fields
    await db.update(onlineOrders).set({ rating: data.overallRating, ratingComment: data.comment ?? null })
      .where(eq(onlineOrders.id, data.orderId));
    // Update driver rating average
    if (data.driverId && data.deliveryRating) {
      await db.update(vehicles)
        .set({ driverRating: sql`((driver_rating * total_deliveries) + ${data.deliveryRating}) / (total_deliveries + 1)` })
        .where(eq(vehicles.id, data.driverId));
    }
    const [rating] = await db.select().from(orderRatings).where(eq(orderRatings.id, r.id)).limit(1);
    return rating;
  },

  async getOrderRatings(tenantId: number, limit = 50) {
    return db.select().from(orderRatings)
      .innerJoin(onlineOrders, eq(orderRatings.orderId, onlineOrders.id))
      .where(eq(onlineOrders.tenantId, tenantId))
      .orderBy(desc(orderRatings.createdAt))
      .limit(limit);
  },

  // ── Loyalty Transactions ────────────────────────────────────────────────────
  async getLoyaltyTransactions(customerId: number, limit = 50) {
    return db.select().from(loyaltyTransactions)
      .where(eq(loyaltyTransactions.customerId, customerId))
      .orderBy(desc(loyaltyTransactions.createdAt))
      .limit(limit);
  },

  // ── Wallet Transactions ─────────────────────────────────────────────────────
  async getWalletTransactions(customerId: number, limit = 50) {
    return db.select().from(walletTransactions)
      .where(eq(walletTransactions.customerId, customerId))
      .orderBy(desc(walletTransactions.createdAt))
      .limit(limit);
  },

  // ── Driver Location ─────────────────────────────────────────────────────────
  async updateDriverLocation(vehicleId: number, lat: number, lng: number, orderId?: number) {
    await db.update(vehicles).set({
      currentLat: lat.toFixed(7),
      currentLng: lng.toFixed(7),
      locationUpdatedAt: new Date(),
    }).where(eq(vehicles.id, vehicleId));

    // Insert location history record
    await db.insert(driverLocations).values({
      vehicleId,
      orderId: orderId ?? null,
      lat: lat.toFixed(7),
      lng: lng.toFixed(7),
      speed: null,
      heading: null,
    });
  },

  async getDriverLocation(vehicleId: number) {
    const [vehicle] = await db.select({
      id: vehicles.id,
      driverName: vehicles.driverName,
      driverPhone: vehicles.driverPhone,
      currentLat: vehicles.currentLat,
      currentLng: vehicles.currentLng,
      locationUpdatedAt: vehicles.locationUpdatedAt,
      driverStatus: vehicles.driverStatus,
      driverRating: vehicles.driverRating,
    }).from(vehicles).where(eq(vehicles.id, vehicleId)).limit(1);
    return vehicle ?? null;
  },

  async getActiveDrivers(tenantId: number) {
    return db.select().from(vehicles).where(
      and(
        eq(vehicles.tenantId, tenantId),
        eq(vehicles.isActive, true),
        sql`${vehicles.driverStatus} != 'offline'`
      )
    );
  },

  // ── Delivery Management ─────────────────────────────────────────────────────
  async getDeliveryOrders(tenantId: number, filters?: { status?: string; orderType?: string }) {
    let q = db.select().from(onlineOrders).where(eq(onlineOrders.tenantId, tenantId));
    if (filters?.status) {
      q = q.where(eq(onlineOrders.status, filters.status)) as any;
    }
    if (filters?.orderType) {
      q = q.where(eq(onlineOrders.orderType, filters.orderType)) as any;
    }
    return q.orderBy(desc(onlineOrders.createdAt));
  },

  async assignDriverToOrder(orderId: number, vehicleId: number) {
    await db.update(onlineOrders).set({ driverId: vehicleId }).where(eq(onlineOrders.id, orderId));
    await db.update(vehicles).set({ driverStatus: "on_delivery", activeOrderId: orderId }).where(eq(vehicles.id, vehicleId));
  },

  async getDeliveryStats(tenantId: number) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalRow] = await db.select({ count: sql<number>`count(*)` })
      .from(onlineOrders)
      .where(and(eq(onlineOrders.tenantId, tenantId), gte(onlineOrders.createdAt, today)));

    const [pendingRow] = await db.select({ count: sql<number>`count(*)` })
      .from(onlineOrders)
      .where(and(eq(onlineOrders.tenantId, tenantId), eq(onlineOrders.status, "pending"), gte(onlineOrders.createdAt, today)));

    const [deliveredRow] = await db.select({ count: sql<number>`count(*)` })
      .from(onlineOrders)
      .where(and(eq(onlineOrders.tenantId, tenantId), eq(onlineOrders.status, "delivered"), gte(onlineOrders.createdAt, today)));

    const [revenueRow] = await db.select({ total: sql<string>`COALESCE(SUM(total_amount), 0)` })
      .from(onlineOrders)
      .where(and(eq(onlineOrders.tenantId, tenantId), eq(onlineOrders.status, "delivered"), gte(onlineOrders.createdAt, today)));

    return {
      todayOrders: totalRow?.count ?? 0,
      pendingOrders: pendingRow?.count ?? 0,
      deliveredToday: deliveredRow?.count ?? 0,
      todayRevenue: parseFloat(revenueRow?.total ?? "0"),
    };
  },

  // ── Customer order history (delivery) ──────────────────────────────────────
  async getCustomerOrderHistory(customerId: number, tenantId: number, limit = 20) {
    return db.select().from(onlineOrders)
      .where(and(
        sql`${onlineOrders.customerPhone} = (SELECT phone FROM customers WHERE id = ${customerId})`,
        eq(onlineOrders.tenantId, tenantId)
      ))
      .orderBy(desc(onlineOrders.createdAt))
      .limit(limit);
  },

  // ── Driver earnings ─────────────────────────────────────────────────────────
  async getDriverEarnings(vehicleId: number, days = 7) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return db.select({
      count: sql<number>`count(*)`,
      totalFees: sql<string>`COALESCE(SUM(delivery_fee), 0)`,
    }).from(onlineOrders)
      .where(and(
        eq(onlineOrders.driverId, vehicleId),
        eq(onlineOrders.status, "delivered"),
        gte(onlineOrders.createdAt, since)
      ));
  },

  // ── Missing helpers used by delivery routes ─────────────────────────────────

  async getVehicle(id: number) {
    const [vehicle] = await db.select().from(vehicles).where(eq(vehicles.id, id)).limit(1);
    return vehicle ?? null;
  },

  async getVehicleByAccessToken(token: string) {
    const [vehicle] = await db.select().from(vehicles)
      .where(eq(vehicles.driverAccessToken, token))
      .limit(1);
    return vehicle ?? null;
  },

  async getOnlineOrderByTrackingToken(token: string) {
    const [order] = await db.select().from(onlineOrders)
      .where(eq(onlineOrders.trackingToken, token))
      .limit(1);
    return order ?? null;
  },

  async getDriverActiveOrders(vehicleId: number, tenantId: number) {
    return db.select().from(onlineOrders).where(
      and(
        eq(onlineOrders.tenantId, tenantId),
        eq(onlineOrders.driverId, vehicleId),
        sql`${onlineOrders.status} NOT IN ('delivered', 'cancelled')`
      )
    ).orderBy(desc(onlineOrders.createdAt));
  },

  async getCustomerIdByPhone(phone: string, tenantId: number): Promise<number | null> {
    const [customer] = await db.select({ id: customers.id }).from(customers)
      .where(and(eq(customers.phone, phone), eq(customers.tenantId, tenantId)))
      .limit(1);
    return customer?.id ?? null;
  },

  async getCustomerByReferralCode(code: string) {
    const [customer] = await db.select().from(customers)
      .where(eq(customers.referralCode, code))
      .limit(1);
    return customer ?? null;
  },

  async getLandingPageConfigByTenantId(tenantId: number) {
    const [config] = await db.select().from(landingPageConfig)
      .where(eq(landingPageConfig.tenantId, tenantId))
      .limit(1);
    return config ?? null;
  },
};
