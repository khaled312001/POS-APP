var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  activityLog: () => activityLog,
  branches: () => branches,
  calls: () => calls,
  cashDrawerOperations: () => cashDrawerOperations,
  categories: () => categories,
  customers: () => customers,
  dailyClosings: () => dailyClosings,
  employeeCommissions: () => employeeCommissions,
  employees: () => employees,
  expenses: () => expenses,
  insertActivityLogSchema: () => insertActivityLogSchema,
  insertBranchSchema: () => insertBranchSchema,
  insertCallSchema: () => insertCallSchema,
  insertCashDrawerOperationSchema: () => insertCashDrawerOperationSchema,
  insertCategorySchema: () => insertCategorySchema,
  insertCustomerSchema: () => insertCustomerSchema,
  insertDailyClosingSchema: () => insertDailyClosingSchema,
  insertEmployeeCommissionSchema: () => insertEmployeeCommissionSchema,
  insertEmployeeSchema: () => insertEmployeeSchema,
  insertExpenseSchema: () => insertExpenseSchema,
  insertInventoryMovementSchema: () => insertInventoryMovementSchema,
  insertInventorySchema: () => insertInventorySchema,
  insertKitchenOrderSchema: () => insertKitchenOrderSchema,
  insertLandingPageConfigSchema: () => insertLandingPageConfigSchema,
  insertLicenseKeySchema: () => insertLicenseKeySchema,
  insertMonthlyClosingSchema: () => insertMonthlyClosingSchema,
  insertNotificationSchema: () => insertNotificationSchema,
  insertOnlineOrderSchema: () => insertOnlineOrderSchema,
  insertPlatformCommissionSchema: () => insertPlatformCommissionSchema,
  insertPlatformSettingSchema: () => insertPlatformSettingSchema,
  insertPrinterConfigSchema: () => insertPrinterConfigSchema,
  insertProductBatchSchema: () => insertProductBatchSchema,
  insertProductSchema: () => insertProductSchema,
  insertPurchaseOrderItemSchema: () => insertPurchaseOrderItemSchema,
  insertPurchaseOrderSchema: () => insertPurchaseOrderSchema,
  insertReturnItemSchema: () => insertReturnItemSchema,
  insertReturnSchema: () => insertReturnSchema,
  insertSaleItemSchema: () => insertSaleItemSchema,
  insertSaleSchema: () => insertSaleSchema,
  insertShiftSchema: () => insertShiftSchema,
  insertStockCountItemSchema: () => insertStockCountItemSchema,
  insertStockCountSchema: () => insertStockCountSchema,
  insertSubscriptionPlanSchema: () => insertSubscriptionPlanSchema,
  insertSubscriptionSchema: () => insertSubscriptionSchema,
  insertSuperAdminSchema: () => insertSuperAdminSchema,
  insertSupplierContractSchema: () => insertSupplierContractSchema,
  insertSupplierSchema: () => insertSupplierSchema,
  insertTableSchema: () => insertTableSchema,
  insertTenantNotificationSchema: () => insertTenantNotificationSchema,
  insertTenantSchema: () => insertTenantSchema,
  insertTenantSubscriptionSchema: () => insertTenantSubscriptionSchema,
  insertVehicleSchema: () => insertVehicleSchema,
  insertWarehouseSchema: () => insertWarehouseSchema,
  insertWarehouseTransferSchema: () => insertWarehouseTransferSchema,
  inventory: () => inventory,
  inventoryMovements: () => inventoryMovements,
  kitchenOrders: () => kitchenOrders,
  landingPageConfig: () => landingPageConfig,
  licenseKeys: () => licenseKeys,
  monthlyClosings: () => monthlyClosings,
  notifications: () => notifications,
  onlineOrders: () => onlineOrders,
  platformCommissions: () => platformCommissions,
  platformSettings: () => platformSettings,
  printerConfigs: () => printerConfigs,
  productBatches: () => productBatches,
  products: () => products,
  purchaseOrderItems: () => purchaseOrderItems,
  purchaseOrders: () => purchaseOrders,
  returnItems: () => returnItems,
  returns: () => returns,
  saleItems: () => saleItems,
  sales: () => sales,
  shifts: () => shifts,
  stockCountItems: () => stockCountItems,
  stockCounts: () => stockCounts,
  subscriptionPlans: () => subscriptionPlans,
  subscriptions: () => subscriptions,
  superAdmins: () => superAdmins,
  supplierContracts: () => supplierContracts,
  suppliers: () => suppliers,
  syncQueue: () => syncQueue,
  tables: () => tables,
  tenantNotifications: () => tenantNotifications,
  tenantSubscriptions: () => tenantSubscriptions,
  tenants: () => tenants,
  vehicles: () => vehicles,
  warehouseTransfers: () => warehouseTransfers,
  warehouses: () => warehouses
});
import { pgTable, text, integer, decimal, boolean, timestamp, jsonb, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
var branches, employees, categories, products, inventory, customers, sales, saleItems, calls, suppliers, purchaseOrders, purchaseOrderItems, shifts, notifications, expenses, tables, kitchenOrders, subscriptionPlans, subscriptions, activityLog, returns, returnItems, syncQueue, cashDrawerOperations, warehouses, warehouseTransfers, productBatches, inventoryMovements, stockCounts, stockCountItems, supplierContracts, employeeCommissions, superAdmins, tenants, tenantSubscriptions, licenseKeys, tenantNotifications, platformSettings, platformCommissions, onlineOrders, landingPageConfig, vehicles, printerConfigs, dailyClosings, monthlyClosings, insertBranchSchema, insertEmployeeSchema, insertCategorySchema, insertProductSchema, insertInventorySchema, insertCustomerSchema, insertSaleSchema, insertSaleItemSchema, insertSupplierSchema, insertPurchaseOrderSchema, insertPurchaseOrderItemSchema, insertShiftSchema, insertNotificationSchema, insertExpenseSchema, insertCallSchema, insertTableSchema, insertKitchenOrderSchema, insertSubscriptionPlanSchema, insertSubscriptionSchema, insertActivityLogSchema, insertReturnSchema, insertReturnItemSchema, insertCashDrawerOperationSchema, insertWarehouseSchema, insertWarehouseTransferSchema, insertProductBatchSchema, insertInventoryMovementSchema, insertStockCountSchema, insertStockCountItemSchema, insertSupplierContractSchema, insertEmployeeCommissionSchema, insertSuperAdminSchema, insertTenantSchema, insertTenantSubscriptionSchema, insertLicenseKeySchema, insertTenantNotificationSchema, insertOnlineOrderSchema, insertLandingPageConfigSchema, insertPlatformSettingSchema, insertPlatformCommissionSchema, insertVehicleSchema, insertPrinterConfigSchema, insertDailyClosingSchema, insertMonthlyClosingSchema;
var init_schema = __esm({
  "shared/schema.ts"() {
    "use strict";
    branches = pgTable("branches", {
      id: serial("id").primaryKey(),
      tenantId: integer("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
      // Added for multi-tenancy
      name: text("name").notNull(),
      address: text("address"),
      phone: text("phone"),
      email: text("email"),
      logo: text("logo"),
      isActive: boolean("is_active").default(true),
      isMain: boolean("is_main").default(false),
      currency: text("currency").default("CHF"),
      taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).default("0"),
      deliveryFee: decimal("delivery_fee", { precision: 10, scale: 2 }).default("0"),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    employees = pgTable("employees", {
      id: serial("id").primaryKey(),
      tenantId: integer("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
      name: text("name").notNull(),
      email: text("email"),
      phone: text("phone"),
      pin: text("pin").notNull(),
      role: text("role").notNull().default("cashier"),
      branchId: integer("branch_id").references(() => branches.id, { onDelete: "cascade" }),
      isActive: boolean("is_active").default(true),
      hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }),
      commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }).default("0"),
      avatar: text("avatar"),
      permissions: jsonb("permissions").$type().default([]),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    categories = pgTable("categories", {
      id: serial("id").primaryKey(),
      tenantId: integer("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
      // Added for multi-tenancy
      name: text("name").notNull(),
      nameAr: text("name_ar"),
      color: text("color").default("#7C3AED"),
      icon: text("icon").default("grid"),
      image: text("image"),
      parentId: integer("parent_id"),
      sortOrder: integer("sort_order").default(0),
      isActive: boolean("is_active").default(true),
      createdAt: timestamp("created_at").defaultNow()
    });
    products = pgTable("products", {
      id: serial("id").primaryKey(),
      tenantId: integer("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
      // Added for multi-tenancy
      name: text("name").notNull(),
      nameAr: text("name_ar"),
      description: text("description"),
      sku: text("sku").unique(),
      barcode: text("barcode"),
      categoryId: integer("category_id").references(() => categories.id, { onDelete: "cascade" }),
      price: decimal("price", { precision: 10, scale: 2 }).notNull(),
      costPrice: decimal("cost_price", { precision: 10, scale: 2 }),
      image: text("image"),
      unit: text("unit").default("piece"),
      taxable: boolean("taxable").default(true),
      trackInventory: boolean("track_inventory").default(true),
      isActive: boolean("is_active").default(true),
      expiryDate: timestamp("expiry_date"),
      modifiers: jsonb("modifiers").$type().default([]),
      variants: jsonb("variants").$type().default([]),
      isAddon: boolean("is_addon").default(false),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    inventory = pgTable("inventory", {
      id: serial("id").primaryKey(),
      productId: integer("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
      branchId: integer("branch_id").references(() => branches.id, { onDelete: "cascade" }).notNull(),
      quantity: integer("quantity").default(0),
      lowStockThreshold: integer("low_stock_threshold").default(10),
      reorderPoint: integer("reorder_point").default(5),
      reorderQuantity: integer("reorder_quantity").default(20),
      lastRestocked: timestamp("last_restocked"),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    customers = pgTable("customers", {
      id: serial("id").primaryKey(),
      tenantId: integer("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
      // Added for multi-tenancy
      name: text("name").notNull(),
      email: text("email"),
      phone: text("phone"),
      address: text("address"),
      loyaltyPoints: integer("loyalty_points").default(0),
      totalSpent: decimal("total_spent", { precision: 12, scale: 2 }).default("0"),
      visitCount: integer("visit_count").default(0),
      notes: text("notes"),
      creditBalance: decimal("credit_balance", { precision: 10, scale: 2 }).default("0"),
      isActive: boolean("is_active").default(true),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    sales = pgTable("sales", {
      id: serial("id").primaryKey(),
      receiptNumber: text("receipt_number").notNull().unique(),
      branchId: integer("branch_id").references(() => branches.id, { onDelete: "cascade" }),
      employeeId: integer("employee_id").references(() => employees.id, { onDelete: "cascade" }),
      customerId: integer("customer_id").references(() => customers.id, { onDelete: "cascade" }),
      subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
      taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).default("0"),
      serviceFeeAmount: decimal("service_fee_amount", { precision: 10, scale: 2 }).default("0"),
      discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).default("0"),
      totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
      paymentMethod: text("payment_method").notNull().default("cash"),
      paymentStatus: text("payment_status").default("completed"),
      status: text("status").default("completed"),
      notes: text("notes"),
      tipAmount: decimal("tip_amount", { precision: 10, scale: 2 }).default("0"),
      changeAmount: decimal("change_amount", { precision: 10, scale: 2 }).default("0"),
      tableNumber: text("table_number"),
      orderType: text("order_type").default("dine_in"),
      paymentDetails: jsonb("payment_details").$type(),
      createdAt: timestamp("created_at").defaultNow()
    });
    saleItems = pgTable("sale_items", {
      id: serial("id").primaryKey(),
      saleId: integer("sale_id").references(() => sales.id, { onDelete: "cascade" }).notNull(),
      productId: integer("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
      productName: text("product_name").notNull(),
      quantity: integer("quantity").notNull(),
      unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
      discount: decimal("discount", { precision: 10, scale: 2 }).default("0"),
      total: decimal("total", { precision: 10, scale: 2 }).notNull(),
      modifiers: jsonb("modifiers").$type().default([]),
      notes: text("notes")
    });
    calls = pgTable("calls", {
      id: serial("id").primaryKey(),
      tenantId: integer("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
      branchId: integer("branch_id").references(() => branches.id, { onDelete: "cascade" }),
      phoneNumber: text("phone_number").notNull(),
      customerId: integer("customer_id").references(() => customers.id, { onDelete: "set null" }),
      status: text("status").notNull().default("missed"),
      // answered, missed
      saleId: integer("sale_id").references(() => sales.id, { onDelete: "set null" }),
      createdAt: timestamp("created_at").defaultNow()
    });
    suppliers = pgTable("suppliers", {
      id: serial("id").primaryKey(),
      tenantId: integer("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
      // Added for multi-tenancy
      name: text("name").notNull(),
      contactName: text("contact_name"),
      email: text("email"),
      phone: text("phone"),
      address: text("address"),
      paymentTerms: text("payment_terms"),
      balance: decimal("balance", { precision: 12, scale: 2 }).default("0"),
      isActive: boolean("is_active").default(true),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    purchaseOrders = pgTable("purchase_orders", {
      id: serial("id").primaryKey(),
      orderNumber: text("order_number").notNull().unique(),
      supplierId: integer("supplier_id").references(() => suppliers.id, { onDelete: "cascade" }).notNull(),
      branchId: integer("branch_id").references(() => branches.id, { onDelete: "cascade" }),
      status: text("status").default("pending"),
      totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).default("0"),
      notes: text("notes"),
      expectedDate: timestamp("expected_date"),
      receivedDate: timestamp("received_date"),
      createdAt: timestamp("created_at").defaultNow()
    });
    purchaseOrderItems = pgTable("purchase_order_items", {
      id: serial("id").primaryKey(),
      purchaseOrderId: integer("purchase_order_id").references(() => purchaseOrders.id, { onDelete: "cascade" }).notNull(),
      productId: integer("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
      quantity: integer("quantity").notNull(),
      unitCost: decimal("unit_cost", { precision: 10, scale: 2 }).notNull(),
      receivedQuantity: integer("received_quantity").default(0),
      total: decimal("total", { precision: 10, scale: 2 }).notNull()
    });
    shifts = pgTable("shifts", {
      id: serial("id").primaryKey(),
      employeeId: integer("employee_id").references(() => employees.id, { onDelete: "cascade" }).notNull(),
      branchId: integer("branch_id").references(() => branches.id, { onDelete: "cascade" }),
      startTime: timestamp("start_time").defaultNow(),
      endTime: timestamp("end_time"),
      expectedDurationHours: decimal("expected_duration_hours", { precision: 4, scale: 1 }).default("8"),
      openingCash: decimal("opening_cash", { precision: 10, scale: 2 }).default("0"),
      closingCash: decimal("closing_cash", { precision: 10, scale: 2 }),
      totalSales: decimal("total_sales", { precision: 12, scale: 2 }).default("0"),
      totalTransactions: integer("total_transactions").default(0),
      totalReturns: integer("total_returns").default(0),
      totalDiscounts: decimal("total_discounts", { precision: 10, scale: 2 }).default("0"),
      status: text("status").default("open"),
      notes: text("notes"),
      breakMinutes: integer("break_minutes").default(0),
      overtimeMinutes: integer("overtime_minutes").default(0)
    });
    notifications = pgTable("notifications", {
      id: serial("id").primaryKey(),
      recipientId: integer("recipient_id").references(() => employees.id, { onDelete: "cascade" }).notNull(),
      senderId: integer("sender_id").references(() => employees.id, { onDelete: "cascade" }),
      type: text("type").notNull(),
      title: text("title").notNull(),
      message: text("message").notNull(),
      entityType: text("entity_type"),
      entityId: integer("entity_id"),
      isRead: boolean("is_read").default(false),
      priority: text("priority").default("normal"),
      createdAt: timestamp("created_at").defaultNow()
    });
    expenses = pgTable("expenses", {
      id: serial("id").primaryKey(),
      tenantId: integer("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
      // Added for multi-tenancy
      branchId: integer("branch_id").references(() => branches.id, { onDelete: "cascade" }),
      category: text("category").notNull(),
      amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
      description: text("description"),
      date: timestamp("date").defaultNow(),
      employeeId: integer("employee_id").references(() => employees.id, { onDelete: "cascade" }),
      createdAt: timestamp("created_at").defaultNow()
    });
    tables = pgTable("tables", {
      id: serial("id").primaryKey(),
      branchId: integer("branch_id").references(() => branches.id, { onDelete: "cascade" }),
      name: text("name").notNull(),
      capacity: integer("capacity").default(4),
      status: text("status").default("available"),
      currentOrderId: integer("current_order_id"),
      posX: integer("pos_x").default(0),
      posY: integer("pos_y").default(0),
      createdAt: timestamp("created_at").defaultNow()
    });
    kitchenOrders = pgTable("kitchen_orders", {
      id: serial("id").primaryKey(),
      saleId: integer("sale_id").references(() => sales.id, { onDelete: "cascade" }).notNull(),
      branchId: integer("branch_id").references(() => branches.id, { onDelete: "cascade" }),
      tableNumber: text("table_number"),
      status: text("status").default("pending"),
      items: jsonb("items").$type().default([]),
      priority: text("priority").default("normal"),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    subscriptionPlans = pgTable("subscription_plans", {
      id: serial("id").primaryKey(),
      name: text("name").notNull(),
      description: text("description"),
      price: decimal("price", { precision: 10, scale: 2 }).notNull(),
      interval: text("interval").default("monthly"),
      features: jsonb("features").$type().default([]),
      isActive: boolean("is_active").default(true),
      createdAt: timestamp("created_at").defaultNow()
    });
    subscriptions = pgTable("subscriptions", {
      id: serial("id").primaryKey(),
      customerId: integer("customer_id").references(() => customers.id, { onDelete: "cascade" }).notNull(),
      planId: integer("plan_id").references(() => subscriptionPlans.id, { onDelete: "cascade" }).notNull(),
      status: text("status").default("active"),
      startDate: timestamp("start_date").defaultNow(),
      endDate: timestamp("end_date"),
      nextBillingDate: timestamp("next_billing_date"),
      createdAt: timestamp("created_at").defaultNow()
    });
    activityLog = pgTable("activity_log", {
      id: serial("id").primaryKey(),
      employeeId: integer("employee_id").references(() => employees.id, { onDelete: "cascade" }).notNull(),
      action: text("action").notNull(),
      entityType: text("entity_type"),
      entityId: integer("entity_id"),
      details: text("details"),
      metadata: jsonb("metadata").$type(),
      createdAt: timestamp("created_at").defaultNow()
    });
    returns = pgTable("returns", {
      id: serial("id").primaryKey(),
      originalSaleId: integer("original_sale_id").references(() => sales.id, { onDelete: "cascade" }).notNull(),
      employeeId: integer("employee_id").references(() => employees.id, { onDelete: "cascade" }),
      reason: text("reason"),
      type: text("type").default("refund"),
      totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
      returnGraceDays: integer("return_grace_days").default(30),
      refundMethod: text("refund_method"),
      approvedBy: integer("approved_by").references(() => employees.id, { onDelete: "cascade" }),
      branchId: integer("branch_id").references(() => branches.id, { onDelete: "cascade" }),
      status: text("status").default("completed"),
      createdAt: timestamp("created_at").defaultNow()
    });
    returnItems = pgTable("return_items", {
      id: serial("id").primaryKey(),
      returnId: integer("return_id").references(() => returns.id, { onDelete: "cascade" }).notNull(),
      productId: integer("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
      productName: text("product_name").notNull(),
      quantity: integer("quantity").notNull(),
      unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
      total: decimal("total", { precision: 10, scale: 2 }).notNull()
    });
    syncQueue = pgTable("sync_queue", {
      id: serial("id").primaryKey(),
      entityType: text("entity_type").notNull(),
      entityId: integer("entity_id").notNull(),
      action: text("action").notNull(),
      data: jsonb("data"),
      status: text("status").default("pending"),
      retryCount: integer("retry_count").default(0),
      createdAt: timestamp("created_at").defaultNow(),
      processedAt: timestamp("processed_at")
    });
    cashDrawerOperations = pgTable("cash_drawer_operations", {
      id: serial("id").primaryKey(),
      shiftId: integer("shift_id").references(() => shifts.id, { onDelete: "set null" }),
      employeeId: integer("employee_id").references(() => employees.id, { onDelete: "cascade" }).notNull(),
      type: text("type").notNull(),
      amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
      expectedAmount: decimal("expected_amount", { precision: 10, scale: 2 }),
      actualAmount: decimal("actual_amount", { precision: 10, scale: 2 }),
      difference: decimal("difference", { precision: 10, scale: 2 }),
      reason: text("reason"),
      approvedBy: integer("approved_by").references(() => employees.id, { onDelete: "cascade" }),
      createdAt: timestamp("created_at").defaultNow()
    });
    warehouses = pgTable("warehouses", {
      id: serial("id").primaryKey(),
      name: text("name").notNull(),
      branchId: integer("branch_id").references(() => branches.id, { onDelete: "cascade" }).notNull(),
      address: text("address"),
      isDefault: boolean("is_default").default(false),
      isActive: boolean("is_active").default(true),
      createdAt: timestamp("created_at").defaultNow()
    });
    warehouseTransfers = pgTable("warehouse_transfers", {
      id: serial("id").primaryKey(),
      fromWarehouseId: integer("from_warehouse_id").references(() => warehouses.id, { onDelete: "cascade" }).notNull(),
      toWarehouseId: integer("to_warehouse_id").references(() => warehouses.id, { onDelete: "cascade" }).notNull(),
      productId: integer("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
      quantity: integer("quantity").notNull(),
      employeeId: integer("employee_id").references(() => employees.id, { onDelete: "cascade" }),
      status: text("status").default("completed"),
      notes: text("notes"),
      createdAt: timestamp("created_at").defaultNow()
    });
    productBatches = pgTable("product_batches", {
      id: serial("id").primaryKey(),
      productId: integer("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
      batchNumber: text("batch_number").notNull(),
      quantity: integer("quantity").default(0),
      expiryDate: timestamp("expiry_date"),
      costPrice: decimal("cost_price", { precision: 10, scale: 2 }),
      branchId: integer("branch_id").references(() => branches.id, { onDelete: "cascade" }),
      supplierId: integer("supplier_id").references(() => suppliers.id, { onDelete: "cascade" }),
      receivedDate: timestamp("received_date").defaultNow(),
      isActive: boolean("is_active").default(true),
      createdAt: timestamp("created_at").defaultNow()
    });
    inventoryMovements = pgTable("inventory_movements", {
      id: serial("id").primaryKey(),
      productId: integer("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
      branchId: integer("branch_id").references(() => branches.id, { onDelete: "cascade" }),
      type: text("type").notNull(),
      quantity: integer("quantity").notNull(),
      previousQuantity: integer("previous_quantity"),
      newQuantity: integer("new_quantity"),
      referenceType: text("reference_type"),
      referenceId: integer("reference_id"),
      batchNumber: text("batch_number"),
      employeeId: integer("employee_id").references(() => employees.id, { onDelete: "cascade" }),
      notes: text("notes"),
      createdAt: timestamp("created_at").defaultNow()
    });
    stockCounts = pgTable("stock_counts", {
      id: serial("id").primaryKey(),
      branchId: integer("branch_id").references(() => branches.id, { onDelete: "cascade" }).notNull(),
      employeeId: integer("employee_id").references(() => employees.id, { onDelete: "cascade" }).notNull(),
      status: text("status").default("in_progress"),
      approvedBy: integer("approved_by").references(() => employees.id, { onDelete: "cascade" }),
      totalItems: integer("total_items").default(0),
      discrepancies: integer("discrepancies").default(0),
      notes: text("notes"),
      completedAt: timestamp("completed_at"),
      createdAt: timestamp("created_at").defaultNow()
    });
    stockCountItems = pgTable("stock_count_items", {
      id: serial("id").primaryKey(),
      stockCountId: integer("stock_count_id").references(() => stockCounts.id, { onDelete: "cascade" }).notNull(),
      productId: integer("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
      systemQuantity: integer("system_quantity").notNull(),
      actualQuantity: integer("actual_quantity"),
      difference: integer("difference"),
      notes: text("notes")
    });
    supplierContracts = pgTable("supplier_contracts", {
      id: serial("id").primaryKey(),
      supplierId: integer("supplier_id").references(() => suppliers.id, { onDelete: "cascade" }).notNull(),
      discountRate: decimal("discount_rate", { precision: 5, scale: 2 }).default("0"),
      paymentTerms: text("payment_terms"),
      minOrderAmount: decimal("min_order_amount", { precision: 10, scale: 2 }),
      startDate: timestamp("start_date"),
      endDate: timestamp("end_date"),
      isActive: boolean("is_active").default(true),
      notes: text("notes"),
      createdAt: timestamp("created_at").defaultNow()
    });
    employeeCommissions = pgTable("employee_commissions", {
      id: serial("id").primaryKey(),
      employeeId: integer("employee_id").references(() => employees.id, { onDelete: "cascade" }).notNull(),
      saleId: integer("sale_id").references(() => sales.id, { onDelete: "cascade" }).notNull(),
      commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }).notNull(),
      commissionAmount: decimal("commission_amount", { precision: 10, scale: 2 }).notNull(),
      status: text("status").default("pending"),
      createdAt: timestamp("created_at").defaultNow()
    });
    superAdmins = pgTable("super_admins", {
      id: serial("id").primaryKey(),
      name: text("name").notNull(),
      email: text("email").notNull().unique(),
      passwordHash: text("password_hash").notNull(),
      role: text("role").default("super_admin"),
      isActive: boolean("is_active").default(true),
      lastLogin: timestamp("last_login"),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    tenants = pgTable("tenants", {
      id: serial("id").primaryKey(),
      businessName: text("business_name").notNull(),
      ownerName: text("owner_name").notNull(),
      ownerEmail: text("owner_email").notNull().unique(),
      ownerPhone: text("owner_phone"),
      passwordHash: text("password_hash"),
      address: text("address"),
      logo: text("logo"),
      status: text("status").default("active"),
      // active, suspended, expired, trial
      maxBranches: integer("max_branches").default(1),
      maxEmployees: integer("max_employees").default(5),
      storeType: text("store_type").default("supermarket"),
      // supermarket, restaurant, pharmacy, others
      metadata: jsonb("metadata").$type(),
      setupCompleted: boolean("setup_completed").default(false),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    tenantSubscriptions = pgTable("tenant_subscriptions", {
      id: serial("id").primaryKey(),
      tenantId: integer("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
      planType: text("plan_type").notNull().default("trial"),
      // trial, monthly, yearly
      planName: text("plan_name").notNull(),
      price: decimal("price", { precision: 10, scale: 2 }).default("0"),
      status: text("status").default("active"),
      // active, expired, cancelled, pending
      startDate: timestamp("start_date").defaultNow(),
      endDate: timestamp("end_date"),
      trialEndsAt: timestamp("trial_ends_at"),
      autoRenew: boolean("auto_renew").default(false),
      paymentMethod: text("payment_method"),
      lastPaymentDate: timestamp("last_payment_date"),
      nextPaymentDate: timestamp("next_payment_date"),
      cancelledAt: timestamp("cancelled_at"),
      cancellationReason: text("cancellation_reason"),
      features: jsonb("features").$type().default([]),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    licenseKeys = pgTable("license_keys", {
      id: serial("id").primaryKey(),
      licenseKey: text("license_key").notNull().unique(),
      tenantId: integer("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
      subscriptionId: integer("subscription_id").references(() => tenantSubscriptions.id, { onDelete: "cascade" }),
      status: text("status").default("active"),
      // active, expired, revoked, pending
      activatedAt: timestamp("activated_at"),
      expiresAt: timestamp("expires_at"),
      lastValidatedAt: timestamp("last_validated_at"),
      deviceInfo: text("device_info"),
      maxActivations: integer("max_activations").default(3),
      currentActivations: integer("current_activations").default(0),
      notes: text("notes"),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    tenantNotifications = pgTable("tenant_notifications", {
      id: serial("id").primaryKey(),
      tenantId: integer("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
      type: text("type").notNull(),
      // warning, promotion, info, expiry_alert, upgrade_offer
      title: text("title").notNull(),
      message: text("message").notNull(),
      priority: text("priority").default("normal"),
      // low, normal, high, urgent
      isRead: boolean("is_read").default(false),
      isDismissed: boolean("is_dismissed").default(false),
      actionUrl: text("action_url"),
      actionLabel: text("action_label"),
      expiresAt: timestamp("expires_at"),
      sentBy: integer("sent_by").references(() => superAdmins.id, { onDelete: "cascade" }),
      createdAt: timestamp("created_at").defaultNow()
    });
    platformSettings = pgTable("platform_settings", {
      id: serial("id").primaryKey(),
      key: text("key").notNull().unique(),
      value: text("value").notNull(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    platformCommissions = pgTable("platform_commissions", {
      id: serial("id").primaryKey(),
      tenantId: integer("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
      orderId: integer("order_id"),
      saleTotal: decimal("sale_total", { precision: 12, scale: 2 }).notNull(),
      commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }).notNull(),
      commissionAmount: decimal("commission_amount", { precision: 12, scale: 2 }).notNull(),
      status: text("status").default("pending"),
      createdAt: timestamp("created_at").defaultNow()
    });
    onlineOrders = pgTable("online_orders", {
      id: serial("id").primaryKey(),
      tenantId: integer("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
      orderNumber: text("order_number").notNull(),
      customerName: text("customer_name").notNull(),
      customerPhone: text("customer_phone").notNull(),
      customerAddress: text("customer_address"),
      customerEmail: text("customer_email"),
      items: jsonb("items").$type().notNull().default([]),
      subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
      taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).default("0"),
      deliveryFee: decimal("delivery_fee", { precision: 10, scale: 2 }).default("0"),
      totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
      paymentMethod: text("payment_method").notNull().default("cash"),
      // cash, card, mobile
      paymentStatus: text("payment_status").notNull().default("pending"),
      // pending, paid, failed
      stripePaymentIntentId: text("stripe_payment_intent_id"),
      status: text("status").notNull().default("pending"),
      // pending, accepted, preparing, ready, delivered, cancelled
      orderType: text("order_type").notNull().default("delivery"),
      // delivery, pickup
      notes: text("notes"),
      estimatedTime: integer("estimated_time"),
      // minutes
      language: text("language").default("en"),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    landingPageConfig = pgTable("landing_page_config", {
      id: serial("id").primaryKey(),
      tenantId: integer("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull().unique(),
      slug: text("slug").notNull().unique(),
      // URL slug e.g. "pizza-lemon"
      heroTitle: text("hero_title"),
      heroSubtitle: text("hero_subtitle"),
      heroImage: text("hero_image"),
      aboutText: text("about_text"),
      aboutImage: text("about_image"),
      primaryColor: text("primary_color").default("#2FD3C6"),
      accentColor: text("accent_color").default("#6366F1"),
      enableOnlineOrdering: boolean("enable_online_ordering").default(true),
      enableDelivery: boolean("enable_delivery").default(true),
      enablePickup: boolean("enable_pickup").default(true),
      acceptCard: boolean("accept_card").default(true),
      acceptMobile: boolean("accept_mobile").default(true),
      acceptCash: boolean("accept_cash").default(true),
      minOrderAmount: decimal("min_order_amount", { precision: 10, scale: 2 }).default("0"),
      estimatedDeliveryTime: integer("estimated_delivery_time").default(30),
      // minutes
      footerText: text("footer_text"),
      socialFacebook: text("social_facebook"),
      socialInstagram: text("social_instagram"),
      socialWhatsapp: text("social_whatsapp"),
      phone: text("phone"),
      email: text("email"),
      address: text("address"),
      openingHours: text("opening_hours"),
      // e.g. "Mon-Sun 11:00–22:00"
      deliveryRadius: text("delivery_radius"),
      // e.g. "within 10km"
      customCss: text("custom_css"),
      isPublished: boolean("is_published").default(true),
      language: text("language").default("en"),
      // System language: en | ar | de
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    vehicles = pgTable("vehicles", {
      id: serial("id").primaryKey(),
      tenantId: integer("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
      branchId: integer("branch_id").references(() => branches.id, { onDelete: "cascade" }),
      licensePlate: text("license_plate").notNull(),
      make: text("make"),
      model: text("model"),
      color: text("color"),
      driverName: text("driver_name"),
      driverPhone: text("driver_phone"),
      isActive: boolean("is_active").default(true),
      notes: text("notes"),
      createdAt: timestamp("created_at").defaultNow()
    });
    printerConfigs = pgTable("printer_configs", {
      id: serial("id").primaryKey(),
      tenantId: integer("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
      branchId: integer("branch_id").references(() => branches.id, { onDelete: "cascade" }),
      receiptType: text("receipt_type").notNull(),
      // kitchen, home_delivery, take_away, restaurant, driver_order, check_out, lists, daily_close, monthly_close, accounts_receivable
      printer1: text("printer_1"),
      printer1Copy: boolean("printer_1_copy").default(false),
      printer2: text("printer_2"),
      printer2Copy: boolean("printer_2_copy").default(false),
      paperSize: text("paper_size").default("80mm"),
      isActive: boolean("is_active").default(true),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    dailyClosings = pgTable("daily_closings", {
      id: serial("id").primaryKey(),
      tenantId: integer("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
      branchId: integer("branch_id").references(() => branches.id, { onDelete: "cascade" }),
      employeeId: integer("employee_id").references(() => employees.id, { onDelete: "cascade" }),
      closingDate: text("closing_date").notNull(),
      // YYYY-MM-DD
      totalSales: decimal("total_sales", { precision: 12, scale: 2 }).default("0"),
      totalCash: decimal("total_cash", { precision: 12, scale: 2 }).default("0"),
      totalCard: decimal("total_card", { precision: 12, scale: 2 }).default("0"),
      totalMobile: decimal("total_mobile", { precision: 12, scale: 2 }).default("0"),
      totalTransactions: integer("total_transactions").default(0),
      totalReturns: decimal("total_returns", { precision: 12, scale: 2 }).default("0"),
      totalDiscounts: decimal("total_discounts", { precision: 12, scale: 2 }).default("0"),
      openingCash: decimal("opening_cash", { precision: 12, scale: 2 }).default("0"),
      closingCash: decimal("closing_cash", { precision: 12, scale: 2 }).default("0"),
      notes: text("notes"),
      status: text("status").default("closed"),
      // closed, approved
      createdAt: timestamp("created_at").defaultNow()
    });
    monthlyClosings = pgTable("monthly_closings", {
      id: serial("id").primaryKey(),
      tenantId: integer("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
      branchId: integer("branch_id").references(() => branches.id, { onDelete: "cascade" }),
      employeeId: integer("employee_id").references(() => employees.id, { onDelete: "cascade" }),
      closingMonth: text("closing_month").notNull(),
      // YYYY-MM
      totalSales: decimal("total_sales", { precision: 12, scale: 2 }).default("0"),
      totalCash: decimal("total_cash", { precision: 12, scale: 2 }).default("0"),
      totalCard: decimal("total_card", { precision: 12, scale: 2 }).default("0"),
      totalMobile: decimal("total_mobile", { precision: 12, scale: 2 }).default("0"),
      totalTransactions: integer("total_transactions").default(0),
      totalReturns: decimal("total_returns", { precision: 12, scale: 2 }).default("0"),
      totalDiscounts: decimal("total_discounts", { precision: 12, scale: 2 }).default("0"),
      totalExpenses: decimal("total_expenses", { precision: 12, scale: 2 }).default("0"),
      netRevenue: decimal("net_revenue", { precision: 12, scale: 2 }).default("0"),
      notes: text("notes"),
      status: text("status").default("closed"),
      // closed, approved
      createdAt: timestamp("created_at").defaultNow()
    });
    insertBranchSchema = createInsertSchema(branches).omit({ id: true, createdAt: true, updatedAt: true });
    insertEmployeeSchema = createInsertSchema(employees).omit({ id: true, createdAt: true, updatedAt: true });
    insertCategorySchema = createInsertSchema(categories).omit({ id: true, createdAt: true });
    insertProductSchema = createInsertSchema(products).omit({ id: true, createdAt: true, updatedAt: true });
    insertInventorySchema = createInsertSchema(inventory).omit({ id: true, updatedAt: true });
    insertCustomerSchema = createInsertSchema(customers).omit({ id: true, createdAt: true, updatedAt: true });
    insertSaleSchema = createInsertSchema(sales).omit({ id: true, createdAt: true });
    insertSaleItemSchema = createInsertSchema(saleItems).omit({ id: true });
    insertSupplierSchema = createInsertSchema(suppliers).omit({ id: true, createdAt: true, updatedAt: true });
    insertPurchaseOrderSchema = createInsertSchema(purchaseOrders).omit({ id: true, createdAt: true });
    insertPurchaseOrderItemSchema = createInsertSchema(purchaseOrderItems).omit({ id: true });
    insertShiftSchema = createInsertSchema(shifts).omit({ id: true });
    insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });
    insertExpenseSchema = createInsertSchema(expenses).omit({ id: true, createdAt: true });
    insertCallSchema = createInsertSchema(calls).omit({ id: true, createdAt: true });
    insertTableSchema = createInsertSchema(tables).omit({ id: true, createdAt: true });
    insertKitchenOrderSchema = createInsertSchema(kitchenOrders).omit({ id: true, createdAt: true, updatedAt: true });
    insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans).omit({ id: true, createdAt: true });
    insertSubscriptionSchema = createInsertSchema(subscriptions).omit({ id: true, createdAt: true });
    insertActivityLogSchema = createInsertSchema(activityLog).omit({ id: true, createdAt: true });
    insertReturnSchema = createInsertSchema(returns).omit({ id: true, createdAt: true });
    insertReturnItemSchema = createInsertSchema(returnItems).omit({ id: true });
    insertCashDrawerOperationSchema = createInsertSchema(cashDrawerOperations).omit({ id: true, createdAt: true });
    insertWarehouseSchema = createInsertSchema(warehouses).omit({ id: true, createdAt: true });
    insertWarehouseTransferSchema = createInsertSchema(warehouseTransfers).omit({ id: true, createdAt: true });
    insertProductBatchSchema = createInsertSchema(productBatches).omit({ id: true, createdAt: true });
    insertInventoryMovementSchema = createInsertSchema(inventoryMovements).omit({ id: true, createdAt: true });
    insertStockCountSchema = createInsertSchema(stockCounts).omit({ id: true, createdAt: true });
    insertStockCountItemSchema = createInsertSchema(stockCountItems).omit({ id: true });
    insertSupplierContractSchema = createInsertSchema(supplierContracts).omit({ id: true, createdAt: true });
    insertEmployeeCommissionSchema = createInsertSchema(employeeCommissions).omit({ id: true, createdAt: true });
    insertSuperAdminSchema = createInsertSchema(superAdmins).omit({ id: true, createdAt: true, updatedAt: true });
    insertTenantSchema = createInsertSchema(tenants).omit({ id: true, createdAt: true, updatedAt: true });
    insertTenantSubscriptionSchema = createInsertSchema(tenantSubscriptions).omit({ id: true, createdAt: true, updatedAt: true });
    insertLicenseKeySchema = createInsertSchema(licenseKeys).omit({ id: true, createdAt: true, updatedAt: true });
    insertTenantNotificationSchema = createInsertSchema(tenantNotifications).omit({ id: true, createdAt: true });
    insertOnlineOrderSchema = createInsertSchema(onlineOrders).omit({ id: true, createdAt: true, updatedAt: true });
    insertLandingPageConfigSchema = createInsertSchema(landingPageConfig).omit({ id: true, createdAt: true, updatedAt: true });
    insertPlatformSettingSchema = createInsertSchema(platformSettings).omit({ id: true, updatedAt: true });
    insertPlatformCommissionSchema = createInsertSchema(platformCommissions).omit({ id: true, createdAt: true });
    insertVehicleSchema = createInsertSchema(vehicles).omit({ id: true, createdAt: true });
    insertPrinterConfigSchema = createInsertSchema(printerConfigs).omit({ id: true, updatedAt: true });
    insertDailyClosingSchema = createInsertSchema(dailyClosings).omit({ id: true, createdAt: true });
    insertMonthlyClosingSchema = createInsertSchema(monthlyClosings).omit({ id: true, createdAt: true });
  }
});

// server/db.ts
var db_exports = {};
__export(db_exports, {
  db: () => db,
  pool: () => pool
});
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
var Pool, connectionString, pool, db;
var init_db = __esm({
  "server/db.ts"() {
    "use strict";
    init_schema();
    ({ Pool } = pg);
    connectionString = process.env.NODE_ENV === "production" ? process.env.DATABASE_URL : process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        "DATABASE_URL must be set. Did you forget to provision a database?"
      );
    }
    pool = new Pool({ connectionString });
    pool.on("connect", (client2) => {
      client2.query("SET client_encoding = 'UTF8'");
    });
    db = drizzle(pool, { schema: schema_exports });
  }
});

// server/phoneUtils.ts
var phoneUtils_exports = {};
__export(phoneUtils_exports, {
  digitsOnly: () => digitsOnly,
  getPhoneSearchVariants: () => getPhoneSearchVariants,
  lastNDigits: () => lastNDigits,
  normalizePhone: () => normalizePhone,
  phonesMatch: () => phonesMatch
});
function normalizePhone(phone) {
  let cleaned = phone.replace(/[\s\-\(\)\.\/]/g, "");
  if (cleaned.startsWith("+41")) {
    cleaned = "0" + cleaned.slice(3);
  } else if (cleaned.startsWith("0041")) {
    cleaned = "0" + cleaned.slice(4);
  }
  if (cleaned.startsWith("+")) {
    return cleaned;
  }
  if (!cleaned.startsWith("0") && cleaned.length >= 9 && cleaned.length <= 10) {
    cleaned = "0" + cleaned;
  }
  return cleaned;
}
function phonesMatch(phone1, phone2) {
  return normalizePhone(phone1) === normalizePhone(phone2);
}
function digitsOnly(phone) {
  return phone.replace(/\D/g, "");
}
function lastNDigits(phone, n = 8) {
  return digitsOnly(phone).slice(-n);
}
function getPhoneSearchVariants(search) {
  const cleaned = search.replace(/[\s\-\(\)\.\/]/g, "");
  const variants = /* @__PURE__ */ new Set();
  variants.add(cleaned);
  const normalized = normalizePhone(cleaned);
  variants.add(normalized);
  let baseNumber = normalized;
  if (baseNumber.startsWith("0")) {
    baseNumber = baseNumber.slice(1);
  } else if (baseNumber.startsWith("+")) {
    baseNumber = baseNumber.slice(1);
    if (baseNumber.startsWith("41") && baseNumber.length === 11) {
      variants.add("0" + baseNumber.slice(2));
    }
  }
  if (baseNumber.length >= 8) {
    variants.add("+41" + baseNumber);
    variants.add("0041" + baseNumber);
    variants.add("0" + baseNumber);
    variants.add(baseNumber);
  }
  return Array.from(variants).filter((v) => v.length >= 6);
}
var init_phoneUtils = __esm({
  "server/phoneUtils.ts"() {
    "use strict";
  }
});

// server/storage.ts
var storage_exports = {};
__export(storage_exports, {
  storage: () => storage
});
import { eq, desc, sql, and, gte, lte, ilike, or, isNull } from "drizzle-orm";
import * as fs from "fs";
var storage;
var init_storage = __esm({
  "server/storage.ts"() {
    "use strict";
    init_db();
    init_schema();
    storage = {
      seedLog(msg) {
        const timestamp2 = (/* @__PURE__ */ new Date()).toISOString();
        try {
          fs.appendFileSync("seed_debug.log", `[${timestamp2}] ${msg}
`);
        } catch (e) {
        }
        console.log(msg);
      },
      // Branches
      async getBranches() {
        return db.select().from(branches).orderBy(desc(branches.createdAt));
      },
      async getBranchesByTenant(tenantId) {
        return db.select().from(branches).where(eq(branches.tenantId, tenantId)).orderBy(desc(branches.createdAt));
      },
      async getBranch(id) {
        const [branch] = await db.select().from(branches).where(eq(branches.id, id));
        return branch;
      },
      async createBranch(data) {
        const [branch] = await db.insert(branches).values(data).returning();
        return branch;
      },
      async updateBranch(id, data) {
        const [branch] = await db.update(branches).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq(branches.id, id)).returning();
        return branch;
      },
      async deleteBranch(id) {
        await db.delete(branches).where(eq(branches.id, id));
      },
      // Employees
      async getEmployees() {
        return db.select().from(employees).where(eq(employees.isActive, true)).orderBy(desc(employees.createdAt));
      },
      async getEmployeesByTenant(tenantId) {
        const tenantBranches = await this.getBranchesByTenant(tenantId);
        const branchIds = tenantBranches.map((b) => b.id);
        const { inArray: inArray2 } = await import("drizzle-orm");
        if (branchIds.length > 0) {
          return db.select().from(employees).where(and(eq(employees.isActive, true), or(eq(employees.tenantId, tenantId), inArray2(employees.branchId, branchIds)))).orderBy(desc(employees.createdAt));
        }
        return db.select().from(employees).where(and(eq(employees.isActive, true), eq(employees.tenantId, tenantId))).orderBy(desc(employees.createdAt));
      },
      async getEmployee(id) {
        const [emp] = await db.select().from(employees).where(eq(employees.id, id));
        return emp;
      },
      async getEmployeeByPin(pin) {
        const [emp] = await db.select().from(employees).where(eq(employees.pin, pin));
        return emp;
      },
      async createEmployee(data) {
        const [emp] = await db.insert(employees).values(data).returning();
        return emp;
      },
      async updateEmployee(id, data) {
        const [emp] = await db.update(employees).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq(employees.id, id)).returning();
        return emp;
      },
      async deleteEmployee(id) {
        await db.update(employees).set({ isActive: false, updatedAt: /* @__PURE__ */ new Date() }).where(eq(employees.id, id));
      },
      // Categories
      async getCategories(tenantId) {
        if (tenantId) {
          return db.select().from(categories).where(and(eq(categories.tenantId, tenantId), eq(categories.isActive, true))).orderBy(categories.sortOrder);
        }
        return db.select().from(categories).where(eq(categories.isActive, true)).orderBy(categories.sortOrder);
      },
      async createCategory(data) {
        const [cat] = await db.insert(categories).values(data).returning();
        return cat;
      },
      async getCategory(id) {
        const [category] = await db.select().from(categories).where(eq(categories.id, id));
        return category;
      },
      async updateCategory(id, data) {
        const [cat] = await db.update(categories).set(data).where(eq(categories.id, id)).returning();
        return cat;
      },
      async deleteCategory(id) {
        await db.update(categories).set({ isActive: false }).where(eq(categories.id, id));
      },
      // Products
      async getProducts(search) {
        if (search) {
          return db.select().from(products).where(
            and(
              eq(products.isActive, true),
              or(
                ilike(products.name, `%${search}%`),
                ilike(products.sku, `%${search}%`),
                ilike(products.barcode, `%${search}%`)
              )
            )
          ).orderBy(desc(products.createdAt));
        }
        return db.select().from(products).where(eq(products.isActive, true)).orderBy(desc(products.createdAt));
      },
      async getProductsByTenant(tenantId, search) {
        if (search) {
          return db.select().from(products).where(
            and(
              eq(products.tenantId, tenantId),
              eq(products.isActive, true),
              or(
                ilike(products.name, `%${search}%`),
                ilike(products.sku, `%${search}%`),
                ilike(products.barcode, `%${search}%`)
              )
            )
          ).orderBy(desc(products.createdAt));
        }
        return db.select().from(products).where(and(eq(products.tenantId, tenantId), eq(products.isActive, true))).orderBy(desc(products.createdAt));
      },
      async getProduct(id) {
        const [prod] = await db.select().from(products).where(eq(products.id, id));
        return prod;
      },
      async getProductByBarcode(barcode) {
        const [prod] = await db.select().from(products).where(eq(products.barcode, barcode));
        return prod;
      },
      async createProduct(data) {
        const [prod] = await db.insert(products).values(data).returning();
        return prod;
      },
      async updateProduct(id, data) {
        const [prod] = await db.update(products).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq(products.id, id)).returning();
        return prod;
      },
      async deleteProduct(id) {
        await db.update(products).set({ isActive: false }).where(eq(products.id, id));
      },
      // Inventory
      async getInventory(branchId, tenantId) {
        if (branchId) {
          return db.select().from(inventory).where(eq(inventory.branchId, branchId));
        }
        if (tenantId) {
          const tenantBranches = await this.getBranchesByTenant(tenantId);
          const branchIds = tenantBranches.map((b) => b.id);
          if (branchIds.length > 0) {
            const { inArray: inArray2 } = await import("drizzle-orm");
            return db.select().from(inventory).where(inArray2(inventory.branchId, branchIds));
          }
          return [];
        }
        return db.select().from(inventory);
      },
      async getProductInventory(productId, branchId) {
        const [inv] = await db.select().from(inventory).where(
          and(eq(inventory.productId, productId), eq(inventory.branchId, branchId))
        );
        return inv;
      },
      async upsertInventory(data) {
        const existing = await this.getProductInventory(data.productId, data.branchId);
        if (existing) {
          const [inv2] = await db.update(inventory).set({ quantity: data.quantity, updatedAt: /* @__PURE__ */ new Date() }).where(eq(inventory.id, existing.id)).returning();
          return inv2;
        }
        const [inv] = await db.insert(inventory).values(data).returning();
        return inv;
      },
      async adjustInventory(productId, branchId, adjustment) {
        const existing = await this.getProductInventory(productId, branchId);
        if (existing) {
          const newQty = (existing.quantity || 0) + adjustment;
          const [inv2] = await db.update(inventory).set({ quantity: newQty, updatedAt: /* @__PURE__ */ new Date() }).where(eq(inventory.id, existing.id)).returning();
          return inv2;
        }
        const [inv] = await db.insert(inventory).values({ productId, branchId, quantity: adjustment }).returning();
        return inv;
      },
      async getLowStockItems(branchId) {
        const { inArray: inArray2, notInArray, lte: ltEq } = await import("drizzle-orm");
        const restaurantTenants = await db.select({ id: tenants.id }).from(tenants).where(eq(tenants.storeType, "restaurant"));
        const restaurantTenantIds = restaurantTenants.map((t) => t.id);
        let excludedBranchIds = [];
        if (restaurantTenantIds.length > 0) {
          const restaurantBranches = await db.select({ id: branches.id }).from(branches).where(inArray2(branches.tenantId, restaurantTenantIds));
          excludedBranchIds = restaurantBranches.map((b) => b.id);
        }
        const conditions = [
          sql`${inventory.quantity} <= ${inventory.lowStockThreshold}`
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
      async getCustomers(search, tenantId, limit = 50, offset = 0) {
        const conditions = [or(eq(customers.isActive, true), isNull(customers.isActive))];
        if (tenantId) conditions.push(eq(customers.tenantId, tenantId));
        if (search) {
          const looksLikePhone = /^[\d\s\+\-\(\)\.]{4,}$/.test(search.trim());
          if (looksLikePhone) {
            const { getPhoneSearchVariants: getPhoneSearchVariants2 } = await Promise.resolve().then(() => (init_phoneUtils(), phoneUtils_exports));
            const variants = getPhoneSearchVariants2(search.trim());
            const phoneConditions = variants.map((v) => ilike(customers.phone || "", `%${v}%`));
            const strippedCol = sql`REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(${customers.phone}, ' ', ''), '-', ''), '(', ''), ')', ''), '.', '')`;
            for (const v of variants) {
              phoneConditions.push(sql`${strippedCol} ILIKE ${"%" + v + "%"}`);
            }
            conditions.push(or(...phoneConditions));
          } else {
            conditions.push(
              or(
                ilike(customers.name, `%${search}%`),
                ilike(customers.phone || "", `%${search}%`),
                ilike(customers.email || "", `%${search}%`)
              )
            );
          }
        }
        return db.select().from(customers).where(and(...conditions)).orderBy(desc(customers.createdAt)).limit(limit).offset(offset);
      },
      async getCustomerCount(search, tenantId) {
        const conditions = [or(eq(customers.isActive, true), isNull(customers.isActive))];
        if (tenantId) conditions.push(eq(customers.tenantId, tenantId));
        if (search) {
          const looksLikePhone = /^[\d\s\+\-\(\)\.]{4,}$/.test(search.trim());
          if (looksLikePhone) {
            const { getPhoneSearchVariants: getPhoneSearchVariants2 } = await Promise.resolve().then(() => (init_phoneUtils(), phoneUtils_exports));
            const variants = getPhoneSearchVariants2(search.trim());
            const phoneConditions = variants.map((v) => ilike(customers.phone || "", `%${v}%`));
            const strippedCol = sql`REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(${customers.phone}, ' ', ''), '-', ''), '(', ''), ')', ''), '.', '')`;
            for (const v of variants) {
              phoneConditions.push(sql`${strippedCol} ILIKE ${"%" + v + "%"}`);
            }
            conditions.push(or(...phoneConditions));
          } else {
            conditions.push(
              or(
                ilike(customers.name, `%${search}%`),
                ilike(customers.phone || "", `%${search}%`),
                ilike(customers.email || "", `%${search}%`)
              )
            );
          }
        }
        const [result] = await db.select({ count: sql`count(*)` }).from(customers).where(and(...conditions));
        return Number(result?.count || 0);
      },
      async findCustomerByPhone(phone, tenantId) {
        const { getPhoneSearchVariants: getPhoneSearchVariants2, normalizePhone: normalizePhone2, lastNDigits: lastNDigits2 } = await Promise.resolve().then(() => (init_phoneUtils(), phoneUtils_exports));
        const variants = getPhoneSearchVariants2(phone);
        const strippedCol = sql`REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(${customers.phone}, ' ', ''), '-', ''), '(', ''), ')', ''), '.', '')`;
        const phoneConditions = variants.map((v) => ilike(customers.phone, `%${v}%`));
        for (const v of variants) {
          phoneConditions.push(sql`${strippedCol} ILIKE ${"%" + v + "%"}`);
        }
        const last8 = lastNDigits2(phone, 8);
        if (last8.length >= 7) {
          phoneConditions.push(
            sql`RIGHT(REGEXP_REPLACE(${customers.phone}, '[^0-9]', '', 'g'), 8) = ${last8}`
          );
        }
        const conditions = [
          eq(customers.isActive, true),
          or(...phoneConditions)
        ];
        if (tenantId) {
          conditions.push(eq(customers.tenantId, tenantId));
        }
        const normalized = normalizePhone2(phone);
        const results = await db.select().from(customers).where(and(...conditions)).limit(5);
        results.sort((a, b) => {
          const aNorm = a.phone ? normalizePhone2(a.phone) : "";
          const bNorm = b.phone ? normalizePhone2(b.phone) : "";
          const aExact = aNorm === normalized ? 0 : 1;
          const bExact = bNorm === normalized ? 0 : 1;
          return aExact - bExact;
        });
        return results;
      },
      async getCustomer(id) {
        const [cust] = await db.select().from(customers).where(eq(customers.id, id));
        return cust;
      },
      async createCustomer(data) {
        const [cust] = await db.insert(customers).values(data).returning();
        return cust;
      },
      async updateCustomer(id, data) {
        const [cust] = await db.update(customers).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq(customers.id, id)).returning();
        return cust;
      },
      async deleteCustomer(id) {
        const [cust] = await db.delete(customers).where(eq(customers.id, id)).returning();
        return cust;
      },
      async addLoyaltyPoints(id, points) {
        const cust = await this.getCustomer(id);
        if (!cust) return null;
        return this.updateCustomer(id, { loyaltyPoints: (cust.loyaltyPoints || 0) + points });
      },
      // Sales
      async getCustomerSales(customerId) {
        return db.select().from(sales).where(eq(sales.customerId, customerId)).orderBy(desc(sales.createdAt)).limit(50);
      },
      async getSales(filters) {
        let conditions = [];
        if (filters?.branchId) conditions.push(eq(sales.branchId, filters.branchId));
        if (filters?.tenantId) {
          const tenantBranches = await this.getBranchesByTenant(filters.tenantId);
          const branchIds = tenantBranches.map((b) => b.id);
          if (branchIds.length > 0) {
            const { inArray: inArray2 } = await import("drizzle-orm");
            conditions.push(inArray2(sales.branchId, branchIds));
          } else {
            return [];
          }
        }
        let query = conditions.length > 0 ? db.select().from(sales).where(and(...conditions)) : db.select().from(sales);
        if (filters?.limit) {
          return query.orderBy(desc(sales.createdAt)).limit(filters.limit);
        }
        return query.orderBy(desc(sales.createdAt));
      },
      async getSale(id) {
        const [sale] = await db.select().from(sales).where(eq(sales.id, id));
        return sale;
      },
      async createSale(data) {
        const [sale] = await db.insert(sales).values(data).returning();
        return sale;
      },
      async getSaleItems(saleId) {
        return db.select().from(saleItems).where(eq(saleItems.saleId, saleId));
      },
      async createSaleItem(data) {
        const [item] = await db.insert(saleItems).values(data).returning();
        return item;
      },
      async updateSale(id, data) {
        const [sale] = await db.update(sales).set(data).where(eq(sales.id, id)).returning();
        return sale;
      },
      // Suppliers
      async getSuppliers(tenantId) {
        if (tenantId) {
          return db.select().from(suppliers).where(and(eq(suppliers.tenantId, tenantId), eq(suppliers.isActive, true))).orderBy(desc(suppliers.createdAt));
        }
        return db.select().from(suppliers).where(eq(suppliers.isActive, true)).orderBy(desc(suppliers.createdAt));
      },
      async getSupplier(id) {
        const [sup] = await db.select().from(suppliers).where(eq(suppliers.id, id));
        return sup;
      },
      async createSupplier(data) {
        const [sup] = await db.insert(suppliers).values(data).returning();
        return sup;
      },
      async updateSupplier(id, data) {
        const [sup] = await db.update(suppliers).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq(suppliers.id, id)).returning();
        return sup;
      },
      // Purchase Orders
      async getPurchaseOrders(tenantId) {
        if (tenantId) {
          const tenantBranches = await this.getBranchesByTenant(tenantId);
          const branchIds = tenantBranches.map((b) => b.id);
          if (branchIds.length > 0) {
            const { inArray: inArray2 } = await import("drizzle-orm");
            return db.select().from(purchaseOrders).where(inArray2(purchaseOrders.branchId, branchIds)).orderBy(desc(purchaseOrders.createdAt));
          }
          return [];
        }
        return db.select().from(purchaseOrders).orderBy(desc(purchaseOrders.createdAt));
      },
      async createPurchaseOrder(data) {
        const [po] = await db.insert(purchaseOrders).values(data).returning();
        return po;
      },
      async updatePurchaseOrder(id, data) {
        const [po] = await db.update(purchaseOrders).set(data).where(eq(purchaseOrders.id, id)).returning();
        return po;
      },
      async getPurchaseOrder(id) {
        const [po] = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, id));
        return po;
      },
      async getPurchaseOrderItems(poId) {
        return db.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.purchaseOrderId, poId));
      },
      async createPurchaseOrderItem(data) {
        const [item] = await db.insert(purchaseOrderItems).values(data).returning();
        return item;
      },
      async receivePurchaseOrder(id, items) {
        const po = await this.getPurchaseOrder(id);
        if (!po) return null;
        for (const item of items) {
          await db.update(purchaseOrderItems).set({ receivedQuantity: item.receivedQuantity }).where(and(eq(purchaseOrderItems.purchaseOrderId, id), eq(purchaseOrderItems.productId, item.productId)));
          if (po.branchId) {
            await this.adjustInventory(item.productId, po.branchId, item.receivedQuantity);
          }
        }
        const [updated] = await db.update(purchaseOrders).set({ status: "received", receivedDate: /* @__PURE__ */ new Date() }).where(eq(purchaseOrders.id, id)).returning();
        return updated;
      },
      // Shifts
      async getShifts(tenantId) {
        if (tenantId) {
          const tenantBranches = await this.getBranchesByTenant(tenantId);
          const branchIds = tenantBranches.map((b) => b.id);
          if (branchIds.length > 0) {
            const { inArray: inArray2 } = await import("drizzle-orm");
            return db.select().from(shifts).where(inArray2(shifts.branchId, branchIds)).orderBy(desc(shifts.startTime));
          }
          return [];
        }
        return db.select().from(shifts).orderBy(desc(shifts.startTime));
      },
      async getActiveShiftsGlobal(tenantId) {
        if (tenantId) {
          const tenantBranches = await this.getBranchesByTenant(tenantId);
          const branchIds = tenantBranches.map((b) => b.id);
          if (branchIds.length > 0) {
            const { inArray: inArray2 } = await import("drizzle-orm");
            return db.select().from(shifts).where(and(eq(shifts.status, "open"), inArray2(shifts.branchId, branchIds))).orderBy(desc(shifts.startTime));
          }
          return [];
        }
        return db.select().from(shifts).where(eq(shifts.status, "open")).orderBy(desc(shifts.startTime));
      },
      async getActiveShift(employeeId) {
        const [shift] = await db.select().from(shifts).where(
          and(eq(shifts.employeeId, employeeId), eq(shifts.status, "open"))
        );
        return shift;
      },
      async createShift(data) {
        const [shift] = await db.insert(shifts).values(data).returning();
        return shift;
      },
      async closeShift(id, data) {
        const [shift] = await db.update(shifts).set({
          ...data,
          endTime: /* @__PURE__ */ new Date(),
          status: "closed"
        }).where(eq(shifts.id, id)).returning();
        return shift;
      },
      async getEmployeeAttendance(employeeId) {
        return db.select().from(shifts).where(eq(shifts.employeeId, employeeId)).orderBy(desc(shifts.startTime));
      },
      // Expenses
      async getExpenses(tenantId) {
        if (tenantId) {
          return db.select().from(expenses).where(eq(expenses.tenantId, tenantId)).orderBy(desc(expenses.createdAt));
        }
        return db.select().from(expenses).orderBy(desc(expenses.createdAt));
      },
      async createExpense(data) {
        const [exp] = await db.insert(expenses).values(data).returning();
        return exp;
      },
      async getExpensesByDateRange(startDate, endDate) {
        const conditions = [];
        if (startDate) conditions.push(gte(expenses.date, startDate));
        if (endDate) conditions.push(lte(expenses.date, endDate));
        if (conditions.length > 0) {
          return db.select().from(expenses).where(and(...conditions)).orderBy(desc(expenses.createdAt));
        }
        return db.select().from(expenses).orderBy(desc(expenses.createdAt));
      },
      async deleteExpense(id) {
        await db.delete(expenses).where(eq(expenses.id, id));
      },
      // Tables
      async getTables(branchId) {
        if (branchId) {
          return db.select().from(tables).where(eq(tables.branchId, branchId));
        }
        return db.select().from(tables);
      },
      async createTable(data) {
        const [table] = await db.insert(tables).values(data).returning();
        return table;
      },
      async updateTable(id, data) {
        const [table] = await db.update(tables).set(data).where(eq(tables.id, id)).returning();
        return table;
      },
      // Kitchen Orders
      async getKitchenOrders(branchId) {
        if (branchId) {
          return db.select().from(kitchenOrders).where(
            and(eq(kitchenOrders.branchId, branchId), eq(kitchenOrders.status, "pending"))
          ).orderBy(kitchenOrders.createdAt);
        }
        return db.select().from(kitchenOrders).where(eq(kitchenOrders.status, "pending")).orderBy(kitchenOrders.createdAt);
      },
      async createKitchenOrder(data) {
        const [order] = await db.insert(kitchenOrders).values(data).returning();
        return order;
      },
      async updateKitchenOrder(id, data) {
        const [order] = await db.update(kitchenOrders).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq(kitchenOrders.id, id)).returning();
        return order;
      },
      // Subscriptions
      async getSubscriptionPlans() {
        return db.select().from(subscriptionPlans).where(eq(subscriptionPlans.isActive, true));
      },
      async createSubscriptionPlan(data) {
        const [plan] = await db.insert(subscriptionPlans).values(data).returning();
        return plan;
      },
      async getSubscriptions() {
        return db.select().from(subscriptions).orderBy(desc(subscriptions.createdAt));
      },
      async createSubscription(data) {
        const [sub] = await db.insert(subscriptions).values(data).returning();
        return sub;
      },
      async getActivityLog(limit, tenantId) {
        const l = limit || 50;
        if (tenantId) {
          const emps = await this.getEmployeesByTenant(tenantId);
          const empIds = emps.map((e) => e.id);
          if (empIds.length > 0) {
            const { inArray: inArray2 } = await import("drizzle-orm");
            return db.select().from(activityLog).where(inArray2(activityLog.employeeId, empIds)).orderBy(desc(activityLog.createdAt)).limit(l);
          }
          return [];
        }
        return db.select().from(activityLog).orderBy(desc(activityLog.createdAt)).limit(l);
      },
      async createActivityLog(data) {
        const [log3] = await db.insert(activityLog).values(data).returning();
        return log3;
      },
      // Calls
      async getCalls(tenantId, limit = 50) {
        const conditions = [];
        if (tenantId) conditions.push(eq(calls.tenantId, tenantId));
        let query = db.select().from(calls);
        if (conditions.length > 0) {
          query = query.where(and(...conditions));
        }
        return query.orderBy(desc(calls.createdAt)).limit(limit);
      },
      async createCall(data) {
        const [call] = await db.insert(calls).values(data).returning();
        return call;
      },
      async updateCall(id, data) {
        const [call] = await db.update(calls).set(data).where(eq(calls.id, id)).returning();
        return call;
      },
      // Returns
      async getReturns(tenantId) {
        if (tenantId) {
          const tenantBranches = await this.getBranchesByTenant(tenantId);
          const branchIds = tenantBranches.map((b) => b.id);
          if (branchIds.length > 0) {
            const { inArray: inArray2 } = await import("drizzle-orm");
            return db.select().from(returns).where(inArray2(returns.branchId, branchIds)).orderBy(desc(returns.createdAt));
          }
          return [];
        }
        return db.select().from(returns).orderBy(desc(returns.createdAt));
      },
      async getReturn(id) {
        const [ret] = await db.select().from(returns).where(eq(returns.id, id));
        return ret;
      },
      async createReturn(data) {
        const [ret] = await db.insert(returns).values(data).returning();
        return ret;
      },
      async getReturnItems(returnId) {
        return db.select().from(returnItems).where(eq(returnItems.returnId, returnId));
      },
      async createReturnItem(data) {
        const [item] = await db.insert(returnItems).values(data).returning();
        return item;
      },
      // Sales Analytics
      async getSalesByDateRange(startDate, endDate) {
        return db.select().from(sales).where(and(gte(sales.createdAt, startDate), lte(sales.createdAt, endDate))).orderBy(desc(sales.createdAt));
      },
      async getTopProducts(limit) {
        const topLimit = limit || 10;
        const result = await db.select({
          productId: saleItems.productId,
          name: saleItems.productName,
          totalSold: sql`sum(${saleItems.quantity})`,
          revenue: sql`sum(${saleItems.total}::numeric)`
        }).from(saleItems).groupBy(saleItems.productId, saleItems.productName).orderBy(sql`sum(${saleItems.quantity}) desc`).limit(topLimit);
        return result.map((r) => ({ ...r, totalSold: Number(r.totalSold), revenue: Number(r.revenue) }));
      },
      async getSalesByPaymentMethod() {
        const result = await db.select({
          method: sales.paymentMethod,
          count: sql`count(*)`,
          total: sql`coalesce(sum(${sales.totalAmount}::numeric), 0)`
        }).from(sales).groupBy(sales.paymentMethod);
        return result.map((r) => ({ method: r.method, count: Number(r.count), total: Number(r.total) }));
      },
      // Dashboard Stats
      async getDashboardStats(tenantId) {
        let salesCountQuery = db.select({ count: sql`count(*)` }).from(sales);
        let totalRevenueQuery = db.select({ total: sql`coalesce(sum(total_amount::numeric), 0)` }).from(sales);
        let customerCountQuery = db.select({ count: sql`count(*)` }).from(customers);
        let productCountQuery = db.select({ count: sql`count(*)` }).from(products).where(eq(products.isActive, true));
        let lowStockQuery;
        let todaySalesQuery;
        let weekSalesQuery;
        let monthSalesQuery;
        let totalExpensesQuery = db.select({ total: sql`coalesce(sum(${expenses.amount}::numeric), 0)` }).from(expenses);
        let todayExpensesQuery;
        let topProductsQuery;
        let salesByPaymentMethodQuery;
        let recentSalesQuery;
        let profitRowQuery;
        const todayStart = /* @__PURE__ */ new Date();
        todayStart.setHours(0, 0, 0, 0);
        const weekStart = /* @__PURE__ */ new Date();
        weekStart.setDate(weekStart.getDate() - 7);
        weekStart.setHours(0, 0, 0, 0);
        const monthStart = /* @__PURE__ */ new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);
        if (tenantId) {
          const tenantBranches = await this.getBranchesByTenant(tenantId);
          const branchIds = tenantBranches.map((b) => b.id);
          if (branchIds.length > 0) {
            const { inArray: inArray2 } = await import("drizzle-orm");
            salesCountQuery = db.select({ count: sql`count(*)` }).from(sales).where(inArray2(sales.branchId, branchIds));
            totalRevenueQuery = db.select({ total: sql`coalesce(sum(total_amount::numeric), 0)` }).from(sales).where(inArray2(sales.branchId, branchIds));
            customerCountQuery = db.select({ count: sql`count(*)` }).from(customers).where(eq(customers.tenantId, tenantId));
            productCountQuery = db.select({ count: sql`count(*)` }).from(products).where(and(eq(products.tenantId, tenantId), eq(products.isActive, true)));
            const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId));
            const isRestaurant = tenant?.storeType === "restaurant";
            lowStockQuery = isRestaurant ? db.select({ count: sql`cast(0 as integer)` }).from(branches).limit(1) : db.select({ count: sql`count(*)` }).from(inventory).where(and(sql`quantity <= low_stock_threshold`, inArray2(inventory.branchId, branchIds)));
            todaySalesQuery = db.select({
              count: sql`count(*)`,
              total: sql`coalesce(sum(total_amount::numeric), 0)`
            }).from(sales).where(and(gte(sales.createdAt, todayStart), inArray2(sales.branchId, branchIds)));
            weekSalesQuery = db.select({
              total: sql`coalesce(sum(total_amount::numeric), 0)`
            }).from(sales).where(and(gte(sales.createdAt, weekStart), inArray2(sales.branchId, branchIds)));
            monthSalesQuery = db.select({
              total: sql`coalesce(sum(total_amount::numeric), 0)`
            }).from(sales).where(and(gte(sales.createdAt, monthStart), inArray2(sales.branchId, branchIds)));
            totalExpensesQuery = db.select({ total: sql`coalesce(sum(${expenses.amount}::numeric), 0)` }).from(expenses).where(eq(expenses.tenantId, tenantId));
            todayExpensesQuery = db.select({
              total: sql`coalesce(sum(${expenses.amount}::numeric), 0)`
            }).from(expenses).where(and(gte(expenses.date, todayStart), eq(expenses.tenantId, tenantId)));
            const topLimit = 5;
            topProductsQuery = db.select({
              productId: saleItems.productId,
              name: saleItems.productName,
              totalSold: sql`sum(${saleItems.quantity})`,
              revenue: sql`sum(${saleItems.total}::numeric)`
            }).from(saleItems).innerJoin(sales, eq(saleItems.saleId, sales.id)).where(inArray2(sales.branchId, branchIds)).groupBy(saleItems.productId, saleItems.productName).orderBy(sql`sum(${saleItems.quantity}) desc`).limit(topLimit);
            salesByPaymentMethodQuery = db.select({
              method: sales.paymentMethod,
              count: sql`count(*)`,
              total: sql`coalesce(sum(${sales.totalAmount}::numeric), 0)`
            }).from(sales).where(inArray2(sales.branchId, branchIds)).groupBy(sales.paymentMethod);
            recentSalesQuery = db.select().from(sales).where(inArray2(sales.branchId, branchIds)).orderBy(desc(sales.createdAt)).limit(5);
            profitRowQuery = db.select({
              totalCost: sql`coalesce(sum(${products.costPrice}::numeric * ${saleItems.quantity}), 0)`
            }).from(saleItems).innerJoin(products, eq(saleItems.productId, products.id)).innerJoin(sales, eq(saleItems.saleId, sales.id)).where(inArray2(sales.branchId, branchIds));
          } else {
            return {
              totalSales: 0,
              totalRevenue: 0,
              totalCustomers: 0,
              totalProducts: 0,
              lowStockItems: 0,
              todaySalesCount: 0,
              todayRevenue: 0,
              weekRevenue: 0,
              monthRevenue: 0,
              totalExpenses: 0,
              todayExpenses: 0,
              avgOrderValue: 0,
              topProducts: [],
              salesByPaymentMethod: [],
              recentSales: [],
              totalProfit: 0
            };
          }
        } else {
          lowStockQuery = db.select({ count: sql`count(*)` }).from(inventory).where(sql`quantity <= low_stock_threshold`);
          todaySalesQuery = db.select({
            count: sql`count(*)`,
            total: sql`coalesce(sum(total_amount::numeric), 0)`
          }).from(sales).where(gte(sales.createdAt, todayStart));
          weekSalesQuery = db.select({
            total: sql`coalesce(sum(total_amount::numeric), 0)`
          }).from(sales).where(gte(sales.createdAt, weekStart));
          monthSalesQuery = db.select({
            total: sql`coalesce(sum(total_amount::numeric), 0)`
          }).from(sales).where(gte(sales.createdAt, monthStart));
          todayExpensesQuery = db.select({
            total: sql`coalesce(sum(${expenses.amount}::numeric), 0)`
          }).from(expenses).where(gte(expenses.date, todayStart));
          topProductsQuery = db.select({
            productId: saleItems.productId,
            name: saleItems.productName,
            totalSold: sql`sum(${saleItems.quantity})`,
            revenue: sql`sum(${saleItems.total}::numeric)`
          }).from(saleItems).groupBy(saleItems.productId, saleItems.productName).orderBy(sql`sum(${saleItems.quantity}) desc`).limit(5);
          salesByPaymentMethodQuery = db.select({
            method: sales.paymentMethod,
            count: sql`count(*)`,
            total: sql`coalesce(sum(${sales.totalAmount}::numeric), 0)`
          }).from(sales).groupBy(sales.paymentMethod);
          recentSalesQuery = db.select().from(sales).orderBy(desc(sales.createdAt)).limit(5);
          profitRowQuery = db.select({
            totalCost: sql`coalesce(sum(${products.costPrice}::numeric * ${saleItems.quantity}), 0)`
          }).from(saleItems).innerJoin(products, eq(saleItems.productId, products.id));
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
        const topProducts = topProductsResult.map((r) => ({ ...r, totalSold: Number(r.totalSold), revenue: Number(r.revenue) }));
        const salesByPaymentMethodResult = await salesByPaymentMethodQuery;
        const salesByPaymentMethod = salesByPaymentMethodResult.map((r) => ({ method: r.method, count: Number(r.count), total: Number(r.total) }));
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
          totalProfit: totalRevenueNum - totalCost
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
          taxRate: "10"
        });
        await this.createEmployee({
          name: "Admin",
          email: "admin@barmagly.com",
          pin: "1234",
          role: "admin",
          branchId: branch.id,
          permissions: ["all"]
        });
        await this.createEmployee({
          name: "Cashier",
          email: "cashier@barmagly.com",
          pin: "0000",
          role: "cashier",
          branchId: branch.id,
          permissions: ["pos", "customers"]
        });
        const cats = [
          { name: "Beverages", nameAr: null, color: "#3B82F6", icon: "cafe" },
          { name: "Food", nameAr: null, color: "#EF4444", icon: "restaurant" },
          { name: "Desserts", nameAr: null, color: "#F59E0B", icon: "ice-cream" },
          { name: "Electronics", nameAr: null, color: "#8B5CF6", icon: "hardware-chip" },
          { name: "Clothing", nameAr: null, color: "#10B981", icon: "shirt" }
        ];
        const createdCats = [];
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
          { name: "T-Shirt", price: "25.00", costPrice: "10.00", categoryId: createdCats[4].id, sku: "CLO-001", barcode: "5234567890123", unit: "piece" }
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
      async getCashDrawerOperations(shiftId) {
        return db.select().from(cashDrawerOperations).where(eq(cashDrawerOperations.shiftId, shiftId)).orderBy(desc(cashDrawerOperations.createdAt));
      },
      async createCashDrawerOperation(data) {
        const [op] = await db.insert(cashDrawerOperations).values(data).returning();
        return op;
      },
      // Warehouses
      async getWarehouses(branchId, tenantId) {
        if (branchId) return db.select().from(warehouses).where(and(eq(warehouses.branchId, branchId), eq(warehouses.isActive, true)));
        if (tenantId) {
          const tenantBranches = await this.getBranchesByTenant(tenantId);
          const branchIds = tenantBranches.map((b) => b.id);
          if (branchIds.length > 0) {
            const { inArray: inArray2 } = await import("drizzle-orm");
            return db.select().from(warehouses).where(and(inArray2(warehouses.branchId, branchIds), eq(warehouses.isActive, true)));
          }
          return [];
        }
        return db.select().from(warehouses).where(eq(warehouses.isActive, true));
      },
      async createWarehouse(data) {
        const [wh] = await db.insert(warehouses).values(data).returning();
        return wh;
      },
      async updateWarehouse(id, data) {
        const [wh] = await db.update(warehouses).set(data).where(eq(warehouses.id, id)).returning();
        return wh;
      },
      // Warehouse Transfers
      async getWarehouseTransfers() {
        return db.select().from(warehouseTransfers).orderBy(desc(warehouseTransfers.createdAt));
      },
      async createWarehouseTransfer(data) {
        const [transfer] = await db.insert(warehouseTransfers).values(data).returning();
        return transfer;
      },
      // Product Batches
      async getProductBatches(productId, tenantId) {
        const conditions = [eq(productBatches.isActive, true)];
        if (productId) conditions.push(eq(productBatches.productId, productId));
        if (tenantId) {
          const tenantBranches = await this.getBranchesByTenant(tenantId);
          const branchIds = tenantBranches.map((b) => b.id);
          if (branchIds.length > 0) {
            const { inArray: inArray2 } = await import("drizzle-orm");
            conditions.push(inArray2(productBatches.branchId, branchIds));
          } else {
            return [];
          }
        }
        const { and: and3 } = await import("drizzle-orm");
        return db.select().from(productBatches).where(and3(...conditions)).orderBy(productBatches.expiryDate);
      },
      async createProductBatch(data) {
        const [batch] = await db.insert(productBatches).values(data).returning();
        return batch;
      },
      async updateProductBatch(id, data) {
        const [batch] = await db.update(productBatches).set(data).where(eq(productBatches.id, id)).returning();
        return batch;
      },
      // Inventory Movements
      async getInventoryMovements(productId, limit) {
        const l = limit || 100;
        if (productId) return db.select().from(inventoryMovements).where(eq(inventoryMovements.productId, productId)).orderBy(desc(inventoryMovements.createdAt)).limit(l);
        return db.select().from(inventoryMovements).orderBy(desc(inventoryMovements.createdAt)).limit(l);
      },
      async createInventoryMovement(data) {
        const [mov] = await db.insert(inventoryMovements).values(data).returning();
        return mov;
      },
      // Stock Counts
      async getStockCounts() {
        return db.select().from(stockCounts).orderBy(desc(stockCounts.createdAt));
      },
      async getStockCount(id) {
        const [sc] = await db.select().from(stockCounts).where(eq(stockCounts.id, id));
        return sc;
      },
      async createStockCount(data) {
        const [sc] = await db.insert(stockCounts).values(data).returning();
        return sc;
      },
      async updateStockCount(id, data) {
        const [sc] = await db.update(stockCounts).set(data).where(eq(stockCounts.id, id)).returning();
        return sc;
      },
      async getStockCountItems(stockCountId) {
        return db.select().from(stockCountItems).where(eq(stockCountItems.stockCountId, stockCountId));
      },
      async createStockCountItem(data) {
        const [item] = await db.insert(stockCountItems).values(data).returning();
        return item;
      },
      async updateStockCountItem(id, data) {
        const [item] = await db.update(stockCountItems).set(data).where(eq(stockCountItems.id, id)).returning();
        return item;
      },
      // Supplier Contracts
      async getSupplierContracts(supplierId) {
        if (supplierId) return db.select().from(supplierContracts).where(and(eq(supplierContracts.supplierId, supplierId), eq(supplierContracts.isActive, true)));
        return db.select().from(supplierContracts).where(eq(supplierContracts.isActive, true));
      },
      async createSupplierContract(data) {
        const [contract] = await db.insert(supplierContracts).values(data).returning();
        return contract;
      },
      async updateSupplierContract(id, data) {
        const [contract] = await db.update(supplierContracts).set(data).where(eq(supplierContracts.id, id)).returning();
        return contract;
      },
      // Employee Commissions
      async getEmployeeCommissions(employeeId) {
        if (employeeId) return db.select().from(employeeCommissions).where(eq(employeeCommissions.employeeId, employeeId)).orderBy(desc(employeeCommissions.createdAt));
        return db.select().from(employeeCommissions).orderBy(desc(employeeCommissions.createdAt));
      },
      async createEmployeeCommission(data) {
        const [comm] = await db.insert(employeeCommissions).values(data).returning();
        return comm;
      },
      // Advanced Analytics
      async getEmployeeSalesReport(employeeId) {
        const result = await db.select({
          count: sql`count(*)`,
          total: sql`coalesce(sum(${sales.totalAmount}::numeric), 0)`
        }).from(sales).where(eq(sales.employeeId, employeeId));
        return { salesCount: Number(result[0]?.count || 0), totalRevenue: Number(result[0]?.total || 0) };
      },
      async getSlowMovingProducts(days = 30) {
        const cutoffDate = /* @__PURE__ */ new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        const allProds = await db.select().from(products).where(eq(products.isActive, true));
        const recentSaleItems = await db.select({
          productId: saleItems.productId,
          totalSold: sql`sum(${saleItems.quantity})`
        }).from(saleItems).innerJoin(sales, eq(saleItems.saleId, sales.id)).where(gte(sales.createdAt, cutoffDate)).groupBy(saleItems.productId);
        const soldMap = new Map(recentSaleItems.map((r) => [r.productId, Number(r.totalSold)]));
        return allProds.filter((p) => !soldMap.has(p.id) || (soldMap.get(p.id) || 0) < 3).map((p) => ({
          ...p,
          recentSold: soldMap.get(p.id) || 0
        }));
      },
      async getProfitByProduct() {
        const result = await db.select({
          productId: saleItems.productId,
          productName: saleItems.productName,
          totalRevenue: sql`sum(${saleItems.total}::numeric)`,
          totalSold: sql`sum(${saleItems.quantity})`
        }).from(saleItems).groupBy(saleItems.productId, saleItems.productName);
        const prodList = await db.select().from(products);
        const prodMap = new Map(prodList.map((p) => [p.id, p]));
        return result.map((r) => {
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
            costPrice
          };
        }).sort((a, b) => b.profit - a.profit);
      },
      async getCashierPerformance() {
        const result = await db.select({
          employeeId: sales.employeeId,
          count: sql`count(*)`,
          total: sql`coalesce(sum(${sales.totalAmount}::numeric), 0)`,
          avgSale: sql`coalesce(avg(${sales.totalAmount}::numeric), 0)`
        }).from(sales).groupBy(sales.employeeId);
        const empList = await db.select().from(employees);
        const empMap = new Map(empList.map((e) => [e.id, e]));
        return result.map((r) => ({
          employeeId: r.employeeId,
          employeeName: empMap.get(r.employeeId)?.name || "Unknown",
          role: empMap.get(r.employeeId)?.role || "unknown",
          salesCount: Number(r.count || 0),
          totalRevenue: Number(r.total || 0),
          avgSaleValue: Number(r.avgSale || 0)
        })).sort((a, b) => b.totalRevenue - a.totalRevenue);
      },
      async getReturnsReport() {
        const result = await db.select({
          count: sql`count(*)`,
          total: sql`coalesce(sum(${returns.totalAmount}::numeric), 0)`
        }).from(returns);
        const returnsList = await db.select().from(returns).orderBy(desc(returns.createdAt)).limit(20);
        return {
          totalReturns: Number(result[0]?.count || 0),
          totalRefundAmount: Number(result[0]?.total || 0),
          recentReturns: returnsList
        };
      },
      // Notifications
      async getNotifications(recipientId) {
        return db.select().from(notifications).where(eq(notifications.recipientId, recipientId)).orderBy(desc(notifications.createdAt)).limit(50);
      },
      async getUnreadNotificationCount(recipientId) {
        const [result] = await db.select({ count: sql`count(*)` }).from(notifications).where(and(eq(notifications.recipientId, recipientId), eq(notifications.isRead, false)));
        return Number(result?.count || 0);
      },
      async createNotification(data) {
        const [notif] = await db.insert(notifications).values(data).returning();
        return notif;
      },
      async markNotificationRead(id) {
        const [notif] = await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id)).returning();
        return notif;
      },
      async markAllNotificationsRead(recipientId) {
        await db.update(notifications).set({ isRead: true }).where(eq(notifications.recipientId, recipientId));
      },
      async notifyAdmins(senderId, type, title, message, entityType, entityId, priority) {
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
            priority: priority || "normal"
          }).returning();
          notifs.push(notif);
        }
        return notifs;
      },
      // Enhanced shift operations
      async getShiftWithEmployee(shiftId) {
        const [shift] = await db.select().from(shifts).where(eq(shifts.id, shiftId));
        if (!shift) return null;
        const [emp] = await db.select().from(employees).where(eq(employees.id, shift.employeeId));
        return { ...shift, employee: emp };
      },
      async getAllActiveShifts(tenantId) {
        let activeShifts;
        if (tenantId) {
          const tenantBranches = await this.getBranchesByTenant(tenantId);
          const branchIds = tenantBranches.map((b) => b.id);
          if (branchIds.length > 0) {
            const { inArray: inArray2 } = await import("drizzle-orm");
            activeShifts = await db.select().from(shifts).where(and(eq(shifts.status, "open"), inArray2(shifts.branchId, branchIds))).orderBy(desc(shifts.startTime));
          } else {
            activeShifts = [];
          }
        } else {
          activeShifts = await db.select().from(shifts).where(eq(shifts.status, "open")).orderBy(desc(shifts.startTime));
        }
        const empList = await db.select().from(employees);
        const empMap = new Map(empList.map((e) => [e.id, e]));
        return activeShifts.map((s) => ({
          ...s,
          employeeName: empMap.get(s.employeeId)?.name || "Unknown",
          employeeRole: empMap.get(s.employeeId)?.role || "unknown"
        }));
      },
      async getShiftStats(tenantId) {
        let allShifts;
        if (tenantId) {
          const tenantBranches = await this.getBranchesByTenant(tenantId);
          const branchIds = tenantBranches.map((b) => b.id);
          if (branchIds.length > 0) {
            const { inArray: inArray2 } = await import("drizzle-orm");
            allShifts = await db.select().from(shifts).where(inArray2(shifts.branchId, branchIds)).orderBy(desc(shifts.startTime)).limit(100);
          } else {
            allShifts = [];
          }
        } else {
          allShifts = await db.select().from(shifts).orderBy(desc(shifts.startTime)).limit(100);
        }
        const empList = await db.select().from(employees);
        const empMap = new Map(empList.map((e) => [e.id, e]));
        const activeShifts = allShifts.filter((s) => s.status === "open");
        const closedShifts = allShifts.filter((s) => s.status === "closed");
        const today = /* @__PURE__ */ new Date();
        today.setHours(0, 0, 0, 0);
        const todayShifts = allShifts.filter((s) => s.startTime && new Date(s.startTime) >= today);
        return {
          activeCount: activeShifts.length,
          todayCount: todayShifts.length,
          totalTransactions: closedShifts.reduce((sum2, s) => sum2 + (s.totalTransactions || 0), 0),
          totalSales: closedShifts.reduce((sum2, s) => sum2 + Number(s.totalSales || 0), 0),
          shifts: allShifts.map((s) => ({
            ...s,
            employeeName: empMap.get(s.employeeId)?.name || "Unknown",
            employeeRole: empMap.get(s.employeeId)?.role || "unknown"
          }))
        };
      },
      async updateShift(id, data) {
        const [shift] = await db.update(shifts).set(data).where(eq(shifts.id, id)).returning();
        return shift;
      },
      // ========== Super Admin System ==========
      // Vehicles / Fleet Management
      async getVehicles(tenantId, branchId) {
        if (tenantId && branchId) return db.select().from(vehicles).where(and(eq(vehicles.tenantId, tenantId), eq(vehicles.branchId, branchId), eq(vehicles.isActive, true))).orderBy(desc(vehicles.createdAt));
        if (tenantId) return db.select().from(vehicles).where(and(eq(vehicles.tenantId, tenantId), eq(vehicles.isActive, true))).orderBy(desc(vehicles.createdAt));
        return db.select().from(vehicles).where(eq(vehicles.isActive, true)).orderBy(desc(vehicles.createdAt));
      },
      async createVehicle(data) {
        const [v] = await db.insert(vehicles).values(data).returning();
        return v;
      },
      async updateVehicle(id, data) {
        const [v] = await db.update(vehicles).set(data).where(eq(vehicles.id, id)).returning();
        return v;
      },
      async deleteVehicle(id) {
        await db.update(vehicles).set({ isActive: false }).where(eq(vehicles.id, id));
      },
      // Printer Configurations
      async getPrinterConfigs(tenantId, branchId) {
        if (branchId) return db.select().from(printerConfigs).where(and(eq(printerConfigs.tenantId, tenantId), eq(printerConfigs.branchId, branchId)));
        return db.select().from(printerConfigs).where(eq(printerConfigs.tenantId, tenantId));
      },
      async upsertPrinterConfig(data) {
        const existing = await db.select().from(printerConfigs).where(and(eq(printerConfigs.tenantId, data.tenantId), eq(printerConfigs.receiptType, data.receiptType)));
        if (existing.length > 0) {
          const [c2] = await db.update(printerConfigs).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq(printerConfigs.id, existing[0].id)).returning();
          return c2;
        }
        const [c] = await db.insert(printerConfigs).values(data).returning();
        return c;
      },
      // Daily Closings
      async getDailyClosings(tenantId, branchId) {
        if (branchId) return db.select().from(dailyClosings).where(and(eq(dailyClosings.tenantId, tenantId), eq(dailyClosings.branchId, branchId))).orderBy(desc(dailyClosings.createdAt));
        return db.select().from(dailyClosings).where(eq(dailyClosings.tenantId, tenantId)).orderBy(desc(dailyClosings.createdAt));
      },
      async createDailyClosing(data) {
        const [dc] = await db.insert(dailyClosings).values(data).returning();
        return dc;
      },
      async getDailyClosingByDate(tenantId, closingDate, branchId) {
        if (branchId) {
          const [dc2] = await db.select().from(dailyClosings).where(and(eq(dailyClosings.tenantId, tenantId), eq(dailyClosings.closingDate, closingDate), eq(dailyClosings.branchId, branchId)));
          return dc2;
        }
        const [dc] = await db.select().from(dailyClosings).where(and(eq(dailyClosings.tenantId, tenantId), eq(dailyClosings.closingDate, closingDate)));
        return dc;
      },
      // Monthly Closings
      async getMonthlyClosings(tenantId, branchId) {
        if (branchId) return db.select().from(monthlyClosings).where(and(eq(monthlyClosings.tenantId, tenantId), eq(monthlyClosings.branchId, branchId))).orderBy(desc(monthlyClosings.createdAt));
        return db.select().from(monthlyClosings).where(eq(monthlyClosings.tenantId, tenantId)).orderBy(desc(monthlyClosings.createdAt));
      },
      async createMonthlyClosing(data) {
        const [mc] = await db.insert(monthlyClosings).values(data).returning();
        return mc;
      },
      async getMonthlyClosingByMonth(tenantId, closingMonth, branchId) {
        if (branchId) {
          const [mc2] = await db.select().from(monthlyClosings).where(and(eq(monthlyClosings.tenantId, tenantId), eq(monthlyClosings.closingMonth, closingMonth), eq(monthlyClosings.branchId, branchId)));
          return mc2;
        }
        const [mc] = await db.select().from(monthlyClosings).where(and(eq(monthlyClosings.tenantId, tenantId), eq(monthlyClosings.closingMonth, closingMonth)));
        return mc;
      },
      // Super Admins
      async getSuperAdmins() {
        return db.select().from(superAdmins).orderBy(desc(superAdmins.createdAt));
      },
      async getSuperAdmin(id) {
        const [admin] = await db.select().from(superAdmins).where(eq(superAdmins.id, id));
        return admin;
      },
      async getSuperAdminByEmail(email) {
        const [admin] = await db.select().from(superAdmins).where(eq(superAdmins.email, email));
        return admin;
      },
      async createSuperAdmin(data) {
        const [admin] = await db.insert(superAdmins).values(data).returning();
        return admin;
      },
      async updateSuperAdmin(id, data) {
        const [admin] = await db.update(superAdmins).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq(superAdmins.id, id)).returning();
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
          const branchIds = tenantBranches.map((b) => b.id);
          const tenantEmployees = await this.getEmployeesByTenant(tenant.id);
          let salesToday = "0.00";
          if (branchIds.length > 0) {
            const { inArray: inArray2 } = await import("drizzle-orm");
            const todayStart = /* @__PURE__ */ new Date();
            todayStart.setHours(0, 0, 0, 0);
            const [todaySales] = await db.select({
              total: sql`coalesce(sum(total_amount::numeric), 0)`
            }).from(sales).where(and(gte(sales.createdAt, todayStart), inArray2(sales.branchId, branchIds)));
            salesToday = Number(todaySales?.total || 0).toFixed(2);
          }
          results.push({
            ...tenant,
            branchCount: tenantBranches.length,
            employeeCount: tenantEmployees.length,
            salesToday
          });
        }
        return results;
      },
      async getTenant(id) {
        const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id));
        return tenant;
      },
      async getTenantByEmail(email) {
        const [tenant] = await db.select().from(tenants).where(eq(tenants.ownerEmail, email));
        return tenant;
      },
      async createTenant(data) {
        const [tenant] = await db.insert(tenants).values(data).returning();
        return tenant;
      },
      async updateTenant(id, data) {
        const [tenant] = await db.update(tenants).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq(tenants.id, id)).returning();
        return tenant;
      },
      async deleteTenant(id) {
        await db.delete(licenseKeys).where(eq(licenseKeys.tenantId, id));
        await db.delete(tenantSubscriptions).where(eq(tenantSubscriptions.tenantId, id));
        await db.delete(tenantNotifications).where(eq(tenantNotifications.tenantId, id));
        await db.delete(tenants).where(eq(tenants.id, id));
      },
      // Tenant Subscriptions
      async getTenantSubscriptions(tenantId) {
        if (tenantId) {
          return db.select().from(tenantSubscriptions).where(eq(tenantSubscriptions.tenantId, tenantId)).orderBy(desc(tenantSubscriptions.createdAt));
        }
        return db.select().from(tenantSubscriptions).orderBy(desc(tenantSubscriptions.createdAt));
      },
      async getTenantSubscription(id) {
        const [sub] = await db.select().from(tenantSubscriptions).where(eq(tenantSubscriptions.id, id));
        return sub;
      },
      async createTenantSubscription(data) {
        const [sub] = await db.insert(tenantSubscriptions).values(data).returning();
        return sub;
      },
      async updateTenantSubscription(id, data) {
        const [sub] = await db.update(tenantSubscriptions).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq(tenantSubscriptions.id, id)).returning();
        return sub;
      },
      async deleteTenantSubscription(id) {
        await db.delete(tenantSubscriptions).where(eq(tenantSubscriptions.id, id));
      },
      // License Keys
      async getLicenseKeys(tenantId) {
        if (tenantId) {
          return db.select().from(licenseKeys).where(eq(licenseKeys.tenantId, tenantId)).orderBy(desc(licenseKeys.createdAt));
        }
        return db.select().from(licenseKeys).orderBy(desc(licenseKeys.createdAt));
      },
      async getLicenseKey(id) {
        const [key] = await db.select().from(licenseKeys).where(eq(licenseKeys.id, id));
        return key;
      },
      async getLicenseByKey(keyString) {
        const [key] = await db.select().from(licenseKeys).where(eq(licenseKeys.licenseKey, keyString));
        return key;
      },
      async createLicenseKey(data) {
        const [key] = await db.insert(licenseKeys).values(data).returning();
        return key;
      },
      async updateLicenseKey(id, data) {
        const [key] = await db.update(licenseKeys).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq(licenseKeys.id, id)).returning();
        return key;
      },
      // Tenant Notifications
      async getTenantNotifications(tenantId) {
        if (tenantId) {
          return db.select().from(tenantNotifications).where(eq(tenantNotifications.tenantId, tenantId)).orderBy(desc(tenantNotifications.createdAt));
        }
        return db.select().from(tenantNotifications).orderBy(desc(tenantNotifications.createdAt));
      },
      async createTenantNotification(data) {
        const [notif] = await db.insert(tenantNotifications).values(data).returning();
        return notif;
      },
      async updateTenantNotification(id, data) {
        const [notif] = await db.update(tenantNotifications).set(data).where(eq(tenantNotifications.id, id)).returning();
        return notif;
      },
      // Tenants & Store Config
      // (Removed duplicate getTenants, getTenant, updateTenant to fix TypeScript errors)
      // Bulk Operations
      async bulkCreateCustomers(data) {
        if (data.length === 0) return [];
        return db.insert(customers).values(data).returning();
      },
      async bulkCreateProducts(data) {
        if (data.length === 0) return [];
        return db.insert(products).values(data).returning();
      },
      // System Wide Analytics
      async getSuperAdminDashboardStats() {
        try {
          this.seedLog("Fetching Super Admin dashboard stats...");
          const [tenantCount] = await db.select({ count: sql`count(*)` }).from(tenants);
          const [activeTenants] = await db.select({ count: sql`count(*)` }).from(tenants).where(eq(tenants.status, "active"));
          const [activeSubs] = await db.select({ count: sql`count(*)` }).from(tenantSubscriptions).where(eq(tenantSubscriptions.status, "active"));
          const in7Days = /* @__PURE__ */ new Date();
          in7Days.setDate(in7Days.getDate() + 7);
          const now = /* @__PURE__ */ new Date();
          const [expiringSubs] = await db.select({ count: sql`count(*)` }).from(tenantSubscriptions).where(and(eq(tenantSubscriptions.status, "active"), lte(tenantSubscriptions.endDate, in7Days), gte(tenantSubscriptions.endDate, now)));
          const [revenueRow] = await db.select({ total: sql`coalesce(sum(price), 0)::text` }).from(tenantSubscriptions).where(eq(tenantSubscriptions.status, "active"));
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
        } catch (error) {
          this.seedLog(`ERROR in getSuperAdminDashboardStats: ${error.message}`);
          throw error;
        }
      },
      // ── Online Orders ──────────────────────────────────────────────────────────
      async getOnlineOrders(tenantId, status2) {
        const conditions = [];
        if (tenantId) conditions.push(eq(onlineOrders.tenantId, tenantId));
        if (status2) conditions.push(eq(onlineOrders.status, status2));
        if (conditions.length > 0) {
          return db.select().from(onlineOrders).where(and(...conditions)).orderBy(desc(onlineOrders.createdAt));
        }
        return db.select().from(onlineOrders).orderBy(desc(onlineOrders.createdAt));
      },
      async getOnlineOrder(id) {
        const [order] = await db.select().from(onlineOrders).where(eq(onlineOrders.id, id));
        return order;
      },
      async createOnlineOrder(data) {
        const [order] = await db.insert(onlineOrders).values(data).returning();
        return order;
      },
      async updateOnlineOrder(id, data) {
        const [order] = await db.update(onlineOrders).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq(onlineOrders.id, id)).returning();
        return order;
      },
      async deleteOnlineOrder(id) {
        await db.delete(onlineOrders).where(eq(onlineOrders.id, id));
      },
      // ── Landing Page Config ────────────────────────────────────────────────────
      async getOnboardingStatus(tenantId) {
        const categoriesList = await this.getCategories(tenantId);
        const productsList = await this.getProductsByTenant(tenantId);
        const tenant = await this.getTenant(tenantId);
        return {
          hasCategory: categoriesList.length > 0,
          hasProduct: productsList.length > 0,
          isCompleted: tenant?.setupCompleted || false
        };
      },
      async getLandingPageConfig(tenantId) {
        const [config] = await db.select().from(landingPageConfig).where(eq(landingPageConfig.tenantId, tenantId));
        return config;
      },
      async getLandingPageConfigBySlug(slug) {
        const [config] = await db.select().from(landingPageConfig).where(eq(landingPageConfig.slug, slug));
        return config;
      },
      async upsertLandingPageConfig(tenantId, data) {
        if (!data.slug) {
          const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId));
          if (tenant) {
            data.slug = tenant.businessName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
          }
        }
        const existing = await this.getLandingPageConfig(tenantId);
        if (existing) {
          const [updated] = await db.update(landingPageConfig).set({ ...data, tenantId, updatedAt: /* @__PURE__ */ new Date() }).where(eq(landingPageConfig.tenantId, tenantId)).returning();
          return updated;
        } else {
          const [created] = await db.insert(landingPageConfig).values({ tenantId, ...data }).returning();
          return created;
        }
      },
      // Seed Super Admin Data
      async seedSuperAdminData() {
        this.seedLog("seedSuperAdminData started");
        const existingTenants = await this.getTenants();
        this.seedLog(`Existing tenants count: ${existingTenants.length}`);
        if (existingTenants.length > 0) return false;
        const adminEmail = "admin@barmagly.com";
        this.seedLog(`Checking for super admin: ${adminEmail}`);
        const existingAdmin = await this.getSuperAdminByEmail(adminEmail);
        if (!existingAdmin) {
          await this.createSuperAdmin({
            name: "Super Admin",
            email: adminEmail,
            passwordHash: "$2b$10$OoKOgYj3UlErVOmwqm4rnOpZLdqpLDF3zBiO4VuXJQa56F0DLlesK",
            role: "super_admin",
            isActive: true
          });
        }
        const demoTenants = [
          {
            businessName: "Glow Beauty Salon",
            ownerName: "Sarah Johnson",
            ownerEmail: "sarah@glowsalon.com",
            ownerPhone: "+1234567890",
            address: "456 Fashion Ave, NY",
            status: "active",
            maxBranches: 2,
            maxEmployees: 10
          },
          {
            businessName: "The Gentlemen's Barber",
            ownerName: "Michael Brown",
            ownerEmail: "michael@gentbarber.com",
            ownerPhone: "+1987654321",
            address: "789 Grooming St, CA",
            status: "active",
            maxBranches: 1,
            maxEmployees: 5
          },
          {
            businessName: "Serenity Wellness Spa",
            ownerName: "Emily Davis",
            ownerEmail: "emily@serenityspa.com",
            ownerPhone: "+1555444333",
            address: "101 Peace Way, FL",
            status: "active",
            maxBranches: 3,
            maxEmployees: 15
          }
        ];
        for (const t of demoTenants) {
          const tenant = await this.createTenant(t);
          const plans = [
            { name: "Monthly Basic", type: "monthly", price: "29.99" },
            { name: "Yearly Pro", type: "yearly", price: "299.99" },
            { name: "Trial", type: "trial", price: "0" }
          ];
          const plan = plans[Math.floor(Math.random() * plans.length)];
          const startDate = /* @__PURE__ */ new Date();
          const endDate = /* @__PURE__ */ new Date();
          if (plan.type === "monthly") endDate.setMonth(endDate.getMonth() + 1);
          else if (plan.type === "yearly") endDate.setFullYear(endDate.getFullYear() + 1);
          else endDate.setDate(endDate.getDate() + 30);
          const sub = await this.createTenantSubscription({
            tenantId: tenant.id,
            planName: plan.name,
            planType: plan.type,
            price: plan.price,
            status: "active",
            startDate,
            endDate,
            autoRenew: plan.type !== "trial"
          });
          const randomSegments = Array.from(
            { length: 4 },
            () => Math.random().toString(36).substring(2, 6).toUpperCase()
          );
          const licenseKey = `DEMO-${randomSegments.join("-")}`;
          await this.createLicenseKey({
            licenseKey,
            tenantId: tenant.id,
            subscriptionId: sub.id,
            status: "active",
            maxActivations: 3,
            expiresAt: endDate,
            notes: "Demo license key"
          });
          await this.ensureTenantData(tenant.id);
          await this.createTenantNotification({
            tenantId: tenant.id,
            type: "info",
            title: "Welcome to Barmagly!",
            message: `Hello ${tenant.ownerName}, thank you for joining our platform.`,
            priority: "normal"
          });
        }
        return true;
      },
      /**
       * Ensures a tenant has at least one branch and one admin account.
       * Useful for self-healing and after activation.
       */
      async ensureTenantData(tenantId) {
        const tenant = await this.getTenant(tenantId);
        if (!tenant) return;
        const tenantBranches = await db.select().from(branches).where(eq(branches.tenantId, tenantId)).limit(1);
        let branchId;
        if (tenantBranches.length === 0) {
          this.seedLog(`Creating default branch for tenant ${tenantId}`);
          const [newBranch] = await db.insert(branches).values({
            tenantId,
            name: "Main Branch",
            address: tenant.address || "Main Street",
            phone: tenant.ownerPhone || "123456789",
            isMain: true,
            currency: "CHF",
            taxRate: "10"
          }).returning();
          branchId = newBranch.id;
        } else {
          branchId = tenantBranches[0].id;
        }
        const tenantEmployees = await db.select({ id: employees.id }).from(employees).innerJoin(branches, eq(employees.branchId, branches.id)).where(eq(branches.tenantId, tenantId)).limit(1);
        if (tenantEmployees.length === 0) {
          this.seedLog(`Creating default admin for tenant ${tenantId}`);
          await this.createEmployee({
            name: tenant.ownerName.split(" ")[0] || "Admin",
            email: tenant.ownerEmail,
            pin: "1234",
            role: "admin",
            branchId,
            permissions: ["all"]
          });
        }
      },
      // ── Platform Settings ──────────────────────────────────────────────────────
      async getPlatformSetting(key) {
        const [row] = await db.select().from(platformSettings).where(eq(platformSettings.key, key));
        return row?.value ?? null;
      },
      async setPlatformSetting(key, value) {
        const existing = await db.select().from(platformSettings).where(eq(platformSettings.key, key));
        if (existing.length > 0) {
          await db.update(platformSettings).set({ value, updatedAt: /* @__PURE__ */ new Date() }).where(eq(platformSettings.key, key));
        } else {
          await db.insert(platformSettings).values({ key, value });
        }
      },
      async getCommissionRate() {
        const val = await this.getPlatformSetting("commission_rate");
        return val ? parseFloat(val) : 6;
      },
      // ── Platform Commissions ───────────────────────────────────────────────────
      async createPlatformCommission(data) {
        const [row] = await db.insert(platformCommissions).values(data).returning();
        return row;
      },
      async getPlatformCommissions(tenantId) {
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
              total: sql`coalesce(sum(commission_amount::numeric), 0)::text`,
              count: sql`count(*)`
            }).from(platformCommissions).where(eq(platformCommissions.tenantId, t.id));
            const total = parseFloat(row?.total || "0");
            grandTotal += total;
            result.push({ tenantId: t.id, businessName: t.businessName, commissionTotal: total, count: Number(row?.count || 0) });
          } catch {
            result.push({ tenantId: t.id, businessName: t.businessName, commissionTotal: 0, count: 0 });
          }
        }
        return { tenants: result, grandTotal };
      }
    };
  }
});

// server/seedPizzaLemon.ts
var seedPizzaLemon_exports = {};
__export(seedPizzaLemon_exports, {
  seedPizzaLemon: () => seedPizzaLemon
});
import { eq as eq2, sql as sql2, inArray } from "drizzle-orm";
import bcrypt from "bcrypt";
import { addYears } from "date-fns";
function pizzaModifier(price33, price45) {
  const surcharge = (price45 - price33).toFixed(2);
  return [
    {
      name: "Gr\xF6sse",
      required: true,
      options: [
        { label: "33cm Normal", price: "0.00" },
        { label: `45cm Gross (+${surcharge})`, price: surcharge }
      ]
    },
    {
      name: "Extras",
      required: false,
      multiple: true,
      options: [
        { label: "Extra K\xE4se", price: "0.00" },
        { label: "Extra Pilze", price: "0.00" },
        { label: "Extra Schinken", price: "0.00" },
        { label: "Extra Salami", price: "0.00" },
        { label: "Extra Kebabfleisch", price: "0.00" },
        { label: "Extra Oliven", price: "0.00" },
        { label: "Extra Peperoni", price: "0.00" },
        { label: "Knoblauchsauce", price: "0.00" },
        { label: "Scharfe Sauce", price: "0.00" },
        { label: "K\xE4serand (33cm)", price: "3.00" },
        { label: "K\xE4serand (45cm)", price: "6.00" }
      ]
    }
  ];
}
function drinkSizeModifier(largeExtra) {
  return [
    {
      name: "Gr\xF6sse",
      required: false,
      options: [
        { label: "0.5l Klein", price: "0.00" },
        { label: `1.5l Gross (+${largeExtra.toFixed(2)})`, price: largeExtra.toFixed(2) }
      ]
    }
  ];
}
function sauceModifier() {
  return [
    {
      name: "Sauce",
      required: false,
      options: [
        { label: "Cocktailsauce", price: "0.00" },
        { label: "Joghurtsauce", price: "0.00" },
        { label: "Joghurt + Cocktail", price: "0.00" }
      ]
    }
  ];
}
function sideModifier() {
  return [
    {
      name: "Beilage",
      required: true,
      options: [
        { label: "Pommes Frites", price: "0.00" },
        { label: "Salat", price: "0.00" }
      ]
    }
  ];
}
function dressingModifier() {
  return [
    {
      name: "Salatsauce",
      required: false,
      options: [
        { label: "Italienisch", price: "0.00" },
        { label: "Franz\xF6sisch", price: "0.00" },
        { label: "ohne Salatsauce", price: "0.00" }
      ]
    }
  ];
}
function slugify(name) {
  return name.toLowerCase().replace(/[äÄ]/g, "ae").replace(/[öÖ]/g, "oe").replace(/[üÜ]/g, "ue").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
async function seedPizzaLemon() {
  console.log("[PIZZA LEMON] Checking if Pizza Lemon store is properly configured...");
  const [existingKey] = await db.select().from(licenseKeys).where(eq2(licenseKeys.licenseKey, LICENSE_KEY));
  const isAlreadySeeded = !!existingKey;
  if (isAlreadySeeded) {
    console.log("[PIZZA LEMON] License key already present \u2013 running full catalog update...");
  }
  let tenant;
  const pizzaLemonTenants = await db.select().from(tenants).where(sql2`LOWER(${tenants.businessName}) = 'pizza lemon'`);
  if (pizzaLemonTenants.length > 0) {
    tenant = pizzaLemonTenants[0];
    console.log(`[PIZZA LEMON] Found existing store (ID ${tenant.id}). Upgrading credentials...`);
    const hash3 = await bcrypt.hash(STORE_PASSWORD, 10);
    await db.update(tenants).set({
      ownerEmail: STORE_EMAIL,
      passwordHash: hash3,
      status: "active",
      storeType: "restaurant",
      maxBranches: 3,
      maxEmployees: 20
    }).where(eq2(tenants.id, tenant.id));
  } else {
    console.log("[PIZZA LEMON] No Pizza Lemon store found. Creating new store...");
    const hash3 = await bcrypt.hash(STORE_PASSWORD, 10);
    const [newTenant] = await db.insert(tenants).values({
      businessName: BUSINESS_NAME,
      ownerName: "Pizza Lemon Owner",
      ownerEmail: STORE_EMAIL,
      ownerPhone: "+41443103814",
      passwordHash: hash3,
      status: "active",
      maxBranches: 3,
      maxEmployees: 20,
      storeType: "restaurant"
    }).returning();
    tenant = newTenant;
  }
  const subs = await db.select().from(tenantSubscriptions).where(eq2(tenantSubscriptions.tenantId, tenant.id));
  const activeSub = subs.find((s) => s.status === "active");
  let subId;
  if (activeSub) {
    subId = activeSub.id;
  } else {
    const endDate = addYears(/* @__PURE__ */ new Date(), 2);
    const [newSub] = await db.insert(tenantSubscriptions).values({
      tenantId: tenant.id,
      planType: "yearly",
      planName: "Professional",
      price: "79.00",
      status: "active",
      startDate: /* @__PURE__ */ new Date(),
      endDate,
      autoRenew: true
    }).returning();
    subId = newSub.id;
  }
  if (!isAlreadySeeded) {
    const endDate = addYears(/* @__PURE__ */ new Date(), 2);
    await db.insert(licenseKeys).values({
      licenseKey: LICENSE_KEY,
      tenantId: tenant.id,
      subscriptionId: subId,
      status: "active",
      activatedAt: /* @__PURE__ */ new Date(),
      expiresAt: endDate,
      maxActivations: 5,
      currentActivations: 0
    });
    console.log(`[PIZZA LEMON] License key added: ${LICENSE_KEY}`);
  }
  let tenantBranches = await db.select().from(branches).where(eq2(branches.tenantId, tenant.id));
  let branchId;
  if (tenantBranches.length > 0) {
    branchId = tenantBranches[0].id;
  } else {
    const [branch] = await db.insert(branches).values({
      tenantId: tenant.id,
      name: "Pizza Lemon \u2013 Hauptfiliale",
      address: "Birchstrasse 120, CH-8050 Z\xFCrich-Oerlikon",
      phone: "+41443103814",
      email: STORE_EMAIL,
      isActive: true,
      isMain: true,
      currency: "CHF",
      taxRate: "7.70"
    }).returning();
    branchId = branch.id;
    await db.insert(warehouses).values({ name: "Hauptlager", branchId, isDefault: true, isActive: true });
    for (let i = 1; i <= 8; i++) {
      await db.insert(tables).values({ branchId, name: `Tisch ${i}`, capacity: i <= 4 ? 2 : 4, status: "available" });
    }
    console.log(`[PIZZA LEMON] Created branch, warehouse, 8 tables.`);
  }
  const existingEmps = await db.select().from(employees).where(eq2(employees.branchId, branchId));
  const hasAdmin = existingEmps.some((e) => e.role === "admin" && e.pin === "1234");
  const hasCashier = existingEmps.some((e) => e.role === "cashier" && e.pin === "5678");
  if (!hasAdmin) {
    await db.insert(employees).values({ name: "Admin", email: "admin.emp@pizzalemon.ch", pin: "1234", role: "admin", branchId, isActive: true });
  }
  if (!hasCashier) {
    await db.insert(employees).values({ name: "Cashier", email: "cashier@pizzalemon.ch", pin: "5678", role: "cashier", branchId, isActive: true });
  }
  const existingProds = await db.select().from(products).where(eq2(products.tenantId, tenant.id));
  if (existingProds.length > 0) {
    console.log(`[PIZZA LEMON] Deleting ${existingProds.length} existing products and re-inserting updated catalog...`);
    const prodIds = existingProds.map((p) => p.id);
    await db.delete(inventory).where(inArray(inventory.productId, prodIds));
    await db.delete(products).where(eq2(products.tenantId, tenant.id));
  } else {
    console.log("[PIZZA LEMON] Creating fresh product catalog...");
  }
  const allCats = await db.select({ id: categories.id, name: categories.name }).from(categories).where(eq2(categories.tenantId, tenant.id));
  const catMap = {};
  for (const c of allCats) catMap[c.name] = c.id;
  if (catMap["Softgetr\xE4nke"] && !catMap["Getr\xE4nke"]) {
    await db.update(categories).set({ name: "Getr\xE4nke" }).where(eq2(categories.id, catMap["Softgetr\xE4nke"]));
    catMap["Getr\xE4nke"] = catMap["Softgetr\xE4nke"];
    delete catMap["Softgetr\xE4nke"];
    console.log("[PIZZA LEMON] Renamed category Softgetr\xE4nke \u2192 Getr\xE4nke");
  }
  for (const cat of PIZZA_LEMON_CATEGORIES) {
    if (!catMap[cat.name]) {
      const [ins] = await db.insert(categories).values({
        tenantId: tenant.id,
        name: cat.name,
        color: cat.color,
        icon: cat.icon,
        isActive: true,
        sortOrder: cat.sortOrder
      }).returning();
      catMap[cat.name] = ins.id;
      console.log(`[PIZZA LEMON] Created category: ${cat.name}`);
    } else {
      await db.update(categories).set({
        sortOrder: cat.sortOrder,
        color: cat.color,
        icon: cat.icon
      }).where(eq2(categories.id, catMap[cat.name]));
    }
  }
  let idx = 0;
  async function insertItem(catKey, item, mods = []) {
    const sku = `PL${tenant.id}-${slugify(item.name).toUpperCase().slice(0, 10)}-${++idx}`;
    const [prod] = await db.insert(products).values({
      tenantId: tenant.id,
      name: item.name,
      description: item.description,
      sku,
      categoryId: catMap[catKey],
      price: String(item.price.toFixed(2)),
      costPrice: String((item.price * 0.35).toFixed(2)),
      unit: "piece",
      taxable: true,
      trackInventory: false,
      isActive: true,
      modifiers: mods,
      ...item.image ? { image: item.image } : {}
    }).returning();
    await db.insert(inventory).values({ productId: prod.id, branchId, quantity: 999, lowStockThreshold: 0, reorderPoint: 0 });
  }
  for (const p of PIZZAS) {
    const price45 = p.price45 ?? p.price + 14;
    await insertItem("Pizza", p, pizzaModifier(p.price, price45));
  }
  for (const p of CALZONES) await insertItem("Calzone", p);
  for (const p of PIDE) await insertItem("Pide", p);
  for (const p of LAHMACUN) await insertItem("Lahmacun", p);
  const TELLER_WITH_SIDE = /* @__PURE__ */ new Set([
    "Chicken Nuggets 8Stk",
    "Pouletschnitzel",
    "Pouletfl\xFCgeli 12Stk",
    "Poulet Kebab Teller",
    "Lamm Kebab Teller",
    "K\xF6fte Teller",
    "Cevapcici Teller",
    "Falafel Teller"
  ]);
  for (const p of TELLERGERICHTE) {
    await insertItem("Tellergerichte", p, TELLER_WITH_SIDE.has(p.name) ? sideModifier() : []);
  }
  const FINGER_WITH_SAUCE = /* @__PURE__ */ new Set([
    "D\xF6ner Kebab Tasche",
    "D\xFCr\xFCm Kebab",
    "D\xF6ner Box",
    "Poulet Kebab Tasche",
    "Poulet Kebab Fladen",
    "Lamm Kebab Tasche",
    "Lamm Kebab Fladen",
    "K\xF6fte Taschenbrot",
    "Cevapcici Taschenbrot",
    "Kebab Fladen+Raclette",
    "Kebab Tasche+Raclette",
    "Kebab Fladen+Speck",
    "Kebab Tasche+Speck"
  ]);
  for (const p of FINGERFOOD) {
    await insertItem("Fingerfood", p, FINGER_WITH_SAUCE.has(p.name) ? sauceModifier() : []);
  }
  const SALAT_WITH_DRESSING = /* @__PURE__ */ new Set([
    "Gr\xFCner Salat",
    "Gemischter Salat",
    "Thon Salat",
    "Lemon Salat"
  ]);
  for (const p of SALATE) {
    await insertItem("Salat", p, SALAT_WITH_DRESSING.has(p.name) ? dressingModifier() : []);
  }
  for (const p of DESSERTS) await insertItem("Dessert", p);
  const DRINKS_WITH_SIZE = /* @__PURE__ */ new Set(["Coca-Cola", "Coca-Cola Zero", "Fanta", "Eistee Pfirsich"]);
  for (const p of GETRAENKE) {
    const sizeMod = DRINKS_WITH_SIZE.has(p.name) ? drinkSizeModifier(2) : [];
    await insertItem("Getr\xE4nke", p, sizeMod);
  }
  for (const p of BIER) await insertItem("Bier", p);
  for (const p of ALKOHOL) await insertItem("Alkoholische Getr\xE4nke", p);
  for (const p of TABAK) await insertItem("Tabakwaren", p);
  const total = PIZZAS.length + CALZONES.length + PIDE.length + LAHMACUN.length + TELLERGERICHTE.length + FINGERFOOD.length + SALATE.length + DESSERTS.length + GETRAENKE.length + BIER.length + ALKOHOL.length + TABAK.length;
  console.log(`[PIZZA LEMON] \u2713 ${total} products inserted with updated images (v4) and prices.`);
  const [existingConfig] = await db.select().from(landingPageConfig).where(eq2(landingPageConfig.tenantId, tenant.id));
  const heroImage = IMG("pizzalemon_hero.png");
  if (!existingConfig) {
    await db.insert(landingPageConfig).values({
      tenantId: tenant.id,
      slug: "pizza-lemon",
      heroTitle: "Pizza Lemon",
      heroSubtitle: "Frische Pizza, D\xF6ner & mehr \u2013 direkt zu Ihnen geliefert",
      heroImage,
      aboutText: "Pizza Lemon \u2013 Ihr Lieblingsrestaurant f\xFCr authentische italienische Pizza und t\xFCrkische Spezialit\xE4ten in Z\xFCrich-Oerlikon. Wir verwenden t\xE4glich frische Zutaten. 10% Rabatt bei Mobile App Bestellungen!",
      primaryColor: "#E53E3E",
      accentColor: "#D69E2E",
      enableOnlineOrdering: true,
      enableDelivery: true,
      enablePickup: true,
      acceptCard: true,
      acceptMobile: true,
      acceptCash: true,
      minOrderAmount: "20.00",
      estimatedDeliveryTime: 35,
      footerText: "\xA9 2025 Pizza Lemon \xB7 Alle Rechte vorbehalten",
      socialWhatsapp: "+41443103814",
      socialFacebook: "https://facebook.com/pizzalemon",
      socialInstagram: "https://instagram.com/pizzalemon",
      phone: "+41 44 310 38 14",
      email: "info@pizzalemon.ch",
      address: "Birchstrasse 120, CH-8050 Z\xFCrich-Oerlikon",
      openingHours: "Mo\u2013So: 10:00\u201323:00 | Lieferzeiten: 11:00\u201323:00",
      deliveryRadius: "Zone 1 (ab 20.-): Affoltern, Seebach, Oerlikon | Zone 2 (ab 30.-): Kloten, Wallisellen | Zone 3 (ab 40.-): Regensdorf",
      isPublished: true
    });
    console.log("[PIZZA LEMON] Landing page config created. URL: /store/pizza-lemon");
  } else {
    await db.update(landingPageConfig).set({
      heroImage,
      primaryColor: "#E53E3E",
      accentColor: "#D69E2E",
      minOrderAmount: "20.00",
      openingHours: "Mo\u2013So: 10:00\u201323:00 | Lieferzeiten: 11:00\u201323:00",
      address: existingConfig.address || "Birchstrasse 120, CH-8050 Z\xFCrich-Oerlikon",
      deliveryRadius: "Zone 1 (ab 20.-): Affoltern, Seebach, Oerlikon | Zone 2 (ab 30.-): Kloten, Wallisellen | Zone 3 (ab 40.-): Regensdorf"
    }).where(eq2(landingPageConfig.tenantId, tenant.id));
    console.log("[PIZZA LEMON] Landing page config updated.");
  }
  await db.insert(tenantNotifications).values({
    tenantId: tenant.id,
    type: "info",
    title: "Pizza Lemon Katalog aktualisiert (v4)!",
    message: `Sauce/Beilage/Dressing Modifiers + neue Getr\xE4nke. Email: ${STORE_EMAIL} | PIN: 1234/5678 | Lizenz: ${LICENSE_KEY}`,
    priority: "high"
  }).onConflictDoNothing();
  console.log(`[PIZZA LEMON] \u2713 Setup complete!`);
  console.log(`[PIZZA LEMON]    Email:   ${STORE_EMAIL}`);
  console.log(`[PIZZA LEMON]    Pass:    ${STORE_PASSWORD}`);
  console.log(`[PIZZA LEMON]    License: ${LICENSE_KEY}`);
  console.log(`[PIZZA LEMON]    Admin PIN: 1234  |  Cashier PIN: 5678`);
  console.log(`[PIZZA LEMON]    Menu: 34 Pizza, 3 Calzone, 9 Pide, 2 Lahmacun, 13 Tellergerichte, 24 Fingerfood, 9 Salat, 6 Dessert, 9 Getr\xE4nke, 2 Bier, 6 Alkohol, 1 Tabak = ${total} total`);
}
var STORE_EMAIL, STORE_PASSWORD, LICENSE_KEY, BUSINESS_NAME, IMG, PIZZA_LEMON_CATEGORIES, PIZZAS, CALZONES, PIDE, LAHMACUN, TELLERGERICHTE, FINGERFOOD, SALATE, DESSERTS, GETRAENKE, BIER, ALKOHOL, TABAK;
var init_seedPizzaLemon = __esm({
  "server/seedPizzaLemon.ts"() {
    "use strict";
    init_db();
    init_schema();
    STORE_EMAIL = "admin@pizzalemon.ch";
    STORE_PASSWORD = "pizzalemon123";
    LICENSE_KEY = "PIZZALEMON-MAIN-2024-LMNA-B001";
    BUSINESS_NAME = "Pizza Lemon";
    IMG = (filename) => `/uploads/products/${filename}`;
    PIZZA_LEMON_CATEGORIES = [
      { name: "Pizza", color: "#E53E3E", icon: "pizza", sortOrder: 1 },
      { name: "Calzone", color: "#D69E2E", icon: "pizza", sortOrder: 2 },
      { name: "Pide", color: "#2B6CB0", icon: "restaurant", sortOrder: 3 },
      { name: "Lahmacun", color: "#C05621", icon: "pizza", sortOrder: 4 },
      { name: "Tellergerichte", color: "#276749", icon: "restaurant", sortOrder: 5 },
      { name: "Fingerfood", color: "#805AD5", icon: "fast-food", sortOrder: 6 },
      { name: "Salat", color: "#2F855A", icon: "leaf", sortOrder: 7 },
      { name: "Dessert", color: "#B7791F", icon: "ice-cream", sortOrder: 8 },
      { name: "Getr\xE4nke", color: "#2C7A7B", icon: "cafe", sortOrder: 9 },
      { name: "Bier", color: "#744210", icon: "beer", sortOrder: 10 },
      { name: "Alkoholische Getr\xE4nke", color: "#6B46C1", icon: "wine", sortOrder: 11 },
      { name: "Tabakwaren", color: "#4A5568", icon: "warning", sortOrder: 12 }
    ];
    PIZZAS = [
      { name: "Margherita", description: "Tomaten, Mozzarella, Oregano", price: 14, price45: 25, image: IMG("pizzalemon_01_margherita.jpg") },
      { name: "Profumata", description: "Tomaten, Mozzarella, Knoblauch, Petersilie, Oregano", price: 14, price45: 27, image: IMG("pizzalemon_02_profumata.jpg") },
      { name: "Funghi", description: "Tomaten, Mozzarella, Pilze", price: 15, price45: 28, image: IMG("pizzalemon_03_funghi.jpg") },
      { name: "Spinat", description: "Tomaten, Mozzarella, Spinat", price: 15, price45: 28, image: IMG("pizzalemon_04_spinat.jpg") },
      { name: "Gorgonzola", description: "Tomaten, Mozzarella, Gorgonzola", price: 16, price45: 29, image: IMG("pizzalemon_05_gorgonzola.jpg") },
      { name: "Prosciutto", description: "Tomaten, Mozzarella, Schinken", price: 16, price45: 30, image: IMG("pizzalemon_06_prosciutto.jpg") },
      { name: "Salami", description: "Tomaten, Mozzarella, Salami", price: 16, price45: 30, image: IMG("pizzalemon_07_salami.jpg") },
      { name: "Diavola", description: "Tomaten, Mozzarella, scharfe Salami, Oliven, Peperoncini", price: 17, price45: 31, image: IMG("pizzalemon_08_diavola.jpg") },
      { name: "Arrabbiata", description: "Tomaten, Mozzarella, Speck, Peperoncini, Knoblauch, Zwiebeln", price: 17, price45: 31, image: IMG("pizzalemon_09_arrabbiata.jpg") },
      { name: "Siciliana", description: "Tomaten, Mozzarella, Schinken, Sardellen, Kapern", price: 17, price45: 31, image: IMG("pizzalemon_10_siciliana.jpg") },
      { name: "Prosciutto e Funghi", description: "Tomaten, Mozzarella, Schinken, Pilze", price: 17, price45: 31, image: IMG("pizzalemon_11_prosciutto_e_funghi.jpg") },
      { name: "Hawaii", description: "Tomaten, Mozzarella, Schinken, Ananas", price: 17, price45: 31, image: IMG("pizzalemon_12_hawaii.jpg") },
      { name: "Tonno", description: "Tomaten, Mozzarella, Thunfisch, Zwiebeln", price: 17, price45: 31, image: IMG("pizzalemon_13_tonno.jpg") },
      { name: "Piccante", description: "Tomaten, Mozzarella, Peperoni, Peperoncini, Zwiebeln, Knoblauch, Oregano", price: 18, price45: 32, image: IMG("pizzalemon_14_piccante.jpg") },
      { name: "Raclette", description: "Tomaten, Mozzarella, Rohschinken", price: 18, price45: 32, image: IMG("pizzalemon_15_raclette.jpg") },
      { name: "Fiorentina", description: "Tomaten, Mozzarella, Spinat, Gorgonzola, Knoblauch", price: 18, price45: 32, image: IMG("pizzalemon_16_fiorentina.jpg") },
      { name: "Kebab Pizza", description: "Tomaten, Mozzarella, Kebabfleisch", price: 19, price45: 33, image: IMG("pizzalemon_17_kebab_pizza.jpg") },
      { name: "Poulet", description: "Tomaten, Mozzarella, Poulet", price: 19, price45: 33, image: IMG("pizzalemon_18_poulet.jpg") },
      { name: "Carbonara", description: "Tomaten, Mozzarella, Speck, Ei, Rahm", price: 19, price45: 33, image: IMG("pizzalemon_19_carbonara.jpg") },
      { name: "Gamberetti", description: "Tomaten, Mozzarella, Crevetten, Knoblauch", price: 19, price45: 33, image: IMG("pizzalemon_20_gamberetti.jpg") },
      { name: "Quattro Formaggi", description: "Tomaten, Mozzarella, 4 verschiedene K\xE4sesorten", price: 19, price45: 33, image: IMG("pizzalemon_21_quattro_formaggi.jpg") },
      { name: "Quattro Stagioni", description: "Tomaten, Mozzarella, Schinken, Pilze, Peperoni, Artischocken", price: 19, price45: 33, image: IMG("pizzalemon_22_quattro_stagioni.jpg") },
      { name: "Frutti di Mare", description: "Tomaten, Mozzarella, Meeresfr\xFCchte", price: 19, price45: 33, image: IMG("pizzalemon_23_frutti_di_mare.jpg") },
      { name: "Verdura", description: "Tomaten, Mozzarella, verschiedenes Gem\xFCse", price: 19, price45: 33, image: IMG("pizzalemon_24_verdura.jpg") },
      { name: "Napoli", description: "Tomaten, Mozzarella, Sardellen, Kapern, Oliven", price: 18, price45: 32, image: IMG("pizzalemon_25_napoli.jpg") },
      { name: "Pizzaiolo", description: "Tomaten, Mozzarella, Speck, Knoblauch, Pilze", price: 18, price45: 32, image: IMG("pizzalemon_26_pizzaiolo.jpg") },
      { name: "A'Casa", description: "Tomaten, Mozzarella, Gorgonzola, Peperoni, Pilze, Knoblauch, Zwiebeln", price: 19, price45: 34, image: IMG("pizzalemon_27_a_casa.jpg") },
      { name: "Porcini", description: "Tomaten, Mozzarella, Steinpilze, Zwiebeln, Oregano", price: 19, price45: 34, image: IMG("pizzalemon_28_porcini.jpg") },
      { name: "Spezial", description: "Tomaten, Mozzarella, Kalbfleisch, Knoblauch, Kr\xE4uterbutter, Zwiebeln, Oregano", price: 19, price45: 34, image: IMG("pizzalemon_29_spezial.jpg") },
      { name: "Padrone", description: "Tomaten, Mozzarella, Gorgonzola, Pilze", price: 20, price45: 33, image: IMG("pizzalemon_30_padrone.jpg") },
      { name: "Schloss Pizza", description: "Tomaten, Mozzarella, Kalbfleisch, Speck, scharfe Salami", price: 20, price45: 34, image: IMG("pizzalemon_31_schloss_pizza.jpg") },
      { name: "Italiano", description: "Tomaten, Mozzarella, Rohschinken, Mascarpone, Rucola", price: 20, price45: 34, image: IMG("pizzalemon_32_italiano.jpg") },
      { name: "Americano", description: "Tomaten, Mozzarella, Speck, Mais, Zwiebeln", price: 21, price45: 34, image: IMG("pizzalemon_33_americano.jpg") },
      { name: "Lemon Pizza", description: "Tomaten, Mozzarella, Lammfleisch, Knoblauch, Peperoncini, Scharf", price: 20, price45: 34, image: IMG("pizzalemon_34_lemon_pizza.jpg") }
    ];
    CALZONES = [
      { name: "Calzone", description: "Tomaten, Mozzarella, Schinken, Pilze, Ei", price: 20, image: IMG("pizzalemon_c1_calzone.jpg") },
      { name: "Calzone Kebab", description: "Tomaten, Mozzarella, Kebabfleisch", price: 20, image: IMG("pizzalemon_c2_calzone_kebab.jpg") },
      { name: "Calzone Verdura", description: "Tomaten, Mozzarella, Saisongem\xFCse", price: 20, image: IMG("pizzalemon_c3_calzone_verdura.jpg") }
    ];
    PIDE = [
      { name: "Pide mit K\xE4se", description: "Pide mit Schafsk\xE4se", price: 15, image: IMG("pizzalemon_36_pide_mit_kaese.jpg") },
      { name: "Pide mit Hackfleisch", description: "Pide mit Hackfleisch und Tomaten", price: 17, image: IMG("pizzalemon_37_pide_mit_hackfleisch.jpg") },
      { name: "Pide mit K\xE4se und Hackfleisch", description: "Pide mit Schafsk\xE4se und Hackfleisch", price: 18, image: IMG("pizzalemon_38_pide_kaese_hackfleisch.jpg") },
      { name: "Pide mit K\xE4se und Spinat", description: "Pide mit Schafsk\xE4se und Spinat", price: 18, image: IMG("pizzalemon_39_pide_kaese_spinat.jpg") },
      { name: "Pide mit K\xE4se und Ei", description: "Pide mit Schafsk\xE4se und Ei", price: 18, image: IMG("pizzalemon_40_pide_kaese_ei.jpg") },
      { name: "Lemon Pide", description: "Hausgemachte Pide mit gew\xFCrztem Hackfleisch und K\xE4se", price: 18, image: IMG("pizzalemon_41_lemon_pide.jpg") },
      { name: "Lemon Pide Spezial", description: "Fein gehacktes Fleisch mit dem Messer gehackt", price: 20, image: IMG("pizzalemon_42_lemon_pide_spezial.jpg") },
      { name: "Pide mit Sucuk", description: "Pide mit t\xFCrkischer Knoblauchwurst", price: 18, image: IMG("pizzalemon_43_pide_mit_sucuk.jpg") },
      { name: "Pide mit Kebabfleisch", description: "Pide mit Kebabfleisch", price: 20, image: IMG("pizzalemon_44_pide_mit_kebabfleisch.jpg") }
    ];
    LAHMACUN = [
      { name: "Lahmacun mit Salat", description: "T\xFCrkische Minipizza mit Hackfleisch und frischem Salat", price: 15, image: IMG("pizzalemon_45_lahmacun_mit_salat.jpg") },
      { name: "Lahmacun mit Salat und Kebab", description: "Lahmacun mit frischem Salat und Kebabfleisch", price: 18, image: IMG("pizzalemon_46_lahmacun_salat_kebab.jpg") }
    ];
    TELLERGERICHTE = [
      { name: "D\xF6ner Teller+Pommes", description: "D\xF6ner Kebab auf dem Teller mit Pommes frites", price: 18, image: IMG("pizzalemon_47_doener_teller_pommes.jpg") },
      { name: "D\xF6ner Teller+Salat", description: "D\xF6ner Kebab auf dem Teller mit frischem Salat", price: 18, image: IMG("pizzalemon_48_doener_teller_salat.jpg") },
      { name: "D\xF6ner Teller Komplett", description: "D\xF6ner Kebab auf dem Teller mit Salat und Pommes", price: 20, image: IMG("pizzalemon_49_doener_teller_komplett.jpg") },
      { name: "Chicken Nuggets 8Stk", description: "8 knusprige Chicken Nuggets mit Pommes oder Salat", price: 17, image: IMG("pizzalemon_50_chicken_nuggets_8stk.jpg") },
      { name: "Pouletschnitzel", description: "Zartes Pouletschnitzel mit Pommes oder Salat und Brot", price: 17, image: IMG("pizzalemon_51_pouletschnitzel.jpg") },
      { name: "Pouletfl\xFCgeli 12Stk", description: "12 knusprige Pouletfl\xFCgeli mit Pommes oder Salat", price: 18, image: IMG("pizzalemon_52_pouletfluegeli_12stk.jpg") },
      { name: "Poulet Kebab Teller", description: "Poulet Kebab auf dem Teller mit Pommes oder Salat", price: 18, image: IMG("pizzalemon_53_poulet_kebab_teller.jpg") },
      { name: "Lamm Kebab Teller", description: "Lamm Kebab (Sac Kavurma) mit Pommes oder Salat", price: 22, image: IMG("pizzalemon_54_lamm_kebab_teller.jpg") },
      { name: "K\xF6fte Teller", description: "T\xFCrkische Hackfleischb\xE4llchen mit Pommes oder Salat", price: 18, image: IMG("pizzalemon_55_koefte_teller.jpg") },
      { name: "Cevapcici Teller", description: "Gegrillte Cevapcici mit Pommes oder Salat und Brot", price: 18, image: IMG("pizzalemon_56_cevapcici_teller.jpg") },
      { name: "Falafel Teller", description: "Knusprige Falafel mit Pommes oder Salat und Brot", price: 16, image: IMG("pizzalemon_57_falafel_teller.jpg") },
      { name: "Pommes", description: "Pommes frites, knusprig frittiert", price: 10, image: IMG("pizzalemon_58_pommes.jpg") },
      { name: "Original Schweins Cordon Bleu", description: "Original Schweins Cordon Bleu mit Gem\xFCse, Salat, Pommes", price: 23, image: IMG("pizzalemon_59_cordon_bleu.jpg") }
    ];
    FINGERFOOD = [
      { name: "D\xF6ner Kebab Tasche", description: "D\xF6ner Kebab im Taschenbrot", price: 13, image: IMG("pizzalemon_60_doener_kebab_tasche.jpg") },
      { name: "D\xFCr\xFCm Kebab", description: "D\xF6ner Kebab im Fladenbrot", price: 14, image: IMG("pizzalemon_61_dueruem_kebab.jpg") },
      { name: "D\xF6ner Box", description: "D\xF6ner Kebab in der Box mit Salat und Pommes", price: 13, image: IMG("pizzalemon_62_doener_box.jpg") },
      { name: "Falafel", description: "Knusprige Falafel im Taschenbrot oder D\xFCr\xFCm", price: 12, image: IMG("pizzalemon_63_falafel_taschenbrot.jpg") },
      { name: "Falafel Taschenbrot", description: "Knusprige Falafel im Taschenbrot", price: 12, image: IMG("pizzalemon_63_falafel_taschenbrot.jpg") },
      { name: "Falafel D\xFCr\xFCm", description: "Falafel im Fladenbrot", price: 12, image: IMG("pizzalemon_64_falafel_dueruem.jpg") },
      { name: "Poulet Pepito", description: "Gegrilltes Poulet im Fladenbrot", price: 12, image: IMG("pizzalemon_65_poulet_pepito.jpg") },
      { name: "Lamm Pepito", description: "Gegrilltes Lammfleisch im Fladenbrot", price: 14, image: IMG("pizzalemon_66_lamm_pepito.jpg") },
      { name: "Hamburger", description: "Klassischer Hamburger mit Salat und Sauce", price: 11, image: IMG("pizzalemon_67_hamburger.jpg") },
      { name: "Lemon Burger", description: "Lemon Burger mit Rindfleisch, Raclettek\xE4se und Ei", price: 17, image: IMG("pizzalemon_68_lemon_burger.jpg") },
      { name: "Cheeseburger", description: "Cheeseburger mit Rindfleisch und K\xE4se", price: 13, image: IMG("pizzalemon_69_cheeseburger.jpg") },
      { name: "Hamburger Rindfleisch", description: "Hamburger mit 100% Rindfleisch", price: 12, image: IMG("pizzalemon_70_hamburger_rindfleisch.jpg") },
      { name: "Poulet Kebab Tasche", description: "Poulet Kebab mit Gem\xFCse im Taschenbrot", price: 13, image: IMG("pizzalemon_71_poulet_kebab_tasche.jpg") },
      { name: "Poulet Kebab Fladen", description: "Poulet Kebab mit Gem\xFCse im Fladenbrot", price: 13, image: IMG("pizzalemon_72_poulet_kebab_fladen.jpg") },
      { name: "Lamm Kebab Tasche", description: "Lamm Kebab mit Gem\xFCse im Taschenbrot", price: 14, image: IMG("pizzalemon_73_lamm_kebab_tasche.jpg") },
      { name: "Lamm Kebab Fladen", description: "Lamm Kebab mit Gem\xFCse im Fladenbrot", price: 14, image: IMG("pizzalemon_74_lamm_kebab_fladen.jpg") },
      { name: "K\xF6fte Taschenbrot", description: "T\xFCrkische Hackfleischb\xE4llchen im Taschenbrot", price: 13, image: IMG("pizzalemon_75_koefte_taschenbrot.jpg") },
      { name: "Cevapcici Taschenbrot", description: "Gegrillte Cevapcici im Taschenbrot", price: 13, image: IMG("pizzalemon_76_cevapcici_taschenbrot.jpg") },
      { name: "Falafel Box", description: "Knusprige Falafel in der Box mit Salat und Pommes", price: 12, image: IMG("pizzalemon_77_falafel_box.jpg") },
      { name: "Chicken Nuggets Box", description: "Chicken Nuggets in der Box mit Dip", price: 12, image: IMG("pizzalemon_78_chicken_nuggets_box.jpg") },
      { name: "Kebab Fladen+Raclette", description: "Kebab im Fladenbrot mit Raclettek\xE4se \xFCberbacken", price: 15, image: IMG("pizzalemon_79_kebab_fladen_raclette.jpg") },
      { name: "Kebab Tasche+Raclette", description: "Kebab im Taschenbrot mit Raclettek\xE4se \xFCberbacken", price: 15, image: IMG("pizzalemon_80_kebab_tasche_raclette.jpg") },
      { name: "Kebab Fladen+Speck", description: "Kebab im Fladenbrot mit Speck", price: 15, image: IMG("pizzalemon_81_kebab_fladen_speck.jpg") },
      { name: "Kebab Tasche+Speck", description: "Kebab im Taschenbrot mit Speck", price: 15, image: IMG("pizzalemon_82_kebab_tasche_speck.jpg") }
    ];
    SALATE = [
      { name: "Gr\xFCner Salat", description: "Frischer Blattsalat, Sauce: Italienisch oder Franz\xF6sisch", price: 8, image: IMG("pizzalemon_83_gruener_salat.jpg") },
      { name: "Gemischter Salat", description: "Frischer gemischter Salat, Sauce: Italienisch oder Franz\xF6sisch", price: 9, image: IMG("pizzalemon_84_gemischter_salat.jpg") },
      { name: "Griechischer Salat", description: "Tomaten, Gurken, Oliven, Feta", price: 12, image: IMG("pizzalemon_85_griechischer_salat.jpg") },
      { name: "Lemon Salat", description: "Tomaten, Gurken, gegrilliertes Pouletfleisch", price: 13, image: IMG("pizzalemon_86_lemon_salat.jpg") },
      { name: "Thon Salat", description: "Thunfisch, gemischter Salat", price: 10, image: IMG("pizzalemon_87_thon_salat.jpg") },
      { name: "Tomaten Salat", description: "Tomaten, Zwiebeln", price: 9, image: IMG("pizzalemon_88_tomaten_salat.jpg") },
      { name: "Tomaten Mozzarella", description: "Tomaten mit Mozzarella und Basilikum", price: 12, image: IMG("pizzalemon_89_tomaten_mozzarella.jpg") },
      { name: "Knoblibrot", description: "Knuspriges Brot mit Knoblauchbutter", price: 5, image: IMG("pizzalemon_90_knoblibrot.jpg") },
      { name: "Crevettencocktail", description: "Frischer Crevetten-Cocktailsalat", price: 15, image: IMG("pizzalemon_91_crevettencocktail.jpg") }
    ];
    DESSERTS = [
      { name: "Tiramisu", description: "Klassisches italienisches Tiramisu", price: 6, image: IMG("pizzalemon_92_tiramisu.jpg") },
      { name: "Baklava", description: "T\xFCrkisches Baklava mit Honig und N\xFCssen \u2013 Portion 4 Stk.", price: 8, image: IMG("pizzalemon_93_baklava.jpg") },
      { name: "Marlenke mit Honig", description: "Tschechischer Honigkuchen (Marlenka) mit Honig", price: 6, image: IMG("pizzalemon_94_marlenke.jpg") },
      { name: "Marlenke mit Schokolade", description: "Tschechischer Honigkuchen (Marlenka) mit Schokolade", price: 6, image: IMG("pizzalemon_94_marlenke.jpg") },
      { name: "Choco-Mousse", description: "Cremige Schokoladenmousse", price: 7, image: IMG("pizzalemon_95_choco_mousse.jpg") },
      { name: "M\xF6venpick Glace", description: "M\xF6venpick Premium-Glac\xE9 \u2013 Erdbeer, Schokolade, Vanille, Caramel (175ml)", price: 6, image: IMG("pizzalemon_96_moevenpick_glace.jpg") }
    ];
    GETRAENKE = [
      { name: "Coca-Cola", description: "Coca-Cola, 0.5l / 1.5l", price: 4, image: IMG("pizzalemon_97_coca_cola.jpg") },
      { name: "Coca-Cola Zero", description: "Coca-Cola Zero, 0.5l / 1.5l", price: 4, image: IMG("pizzalemon_97_coca_cola.jpg") },
      { name: "Fanta", description: "Fanta Orange, 0.5l / 1.5l", price: 6, image: IMG("pizzalemon_98_fanta.jpg") },
      { name: "Eistee Pfirsich", description: "Eistee Pfirsich, 0.5l / 1.5l", price: 4, image: IMG("pizzalemon_99_eistee.jpg") },
      { name: "Uludag Gazoz", description: "T\xFCrkische Limonade Uludag, 0.5l", price: 4, image: IMG("pizzalemon_101_uludag_gazoz.jpg") },
      { name: "Rivella Blau", description: "Rivella Blau, 0.5l", price: 4, image: IMG("pizzalemon_102_rivella.jpg") },
      { name: "Rivella Rot", description: "Rivella Rot, 0.5l", price: 4, image: IMG("pizzalemon_102_rivella.jpg") },
      { name: "Ayran", description: "T\xFCrkisches Joghurtgetr\xE4nk, 0.5l", price: 4, image: IMG("pizzalemon_103_ayran.jpg") },
      { name: "Red Bull", description: "Red Bull Energy Drink, 250ml", price: 5, image: IMG("pizzalemon_104_red_bull.jpg") }
    ];
    BIER = [
      { name: "M\xFCllerbr\xE4u", description: "Schweizer Bier M\xFCllerbr\xE4u, 0.5l", price: 5, image: IMG("pizzalemon_105_muellerbraeu.jpg") },
      { name: "Feldschl\xF6sschen", description: "Feldschl\xF6sschen Bier, 0.5l", price: 5, image: IMG("pizzalemon_106_feldschloesschen.jpg") }
    ];
    ALKOHOL = [
      { name: "Rotwein Merlot", description: "Merlot Rotwein, 50cl", price: 13, image: IMG("pizzalemon_107_rotwein_merlot.jpg") },
      { name: "Weisswein", description: "Weisswein, 50cl", price: 15, image: IMG("pizzalemon_108_weisswein.jpg") },
      { name: "Whisky", description: "Whisky 40%, 70cl Flasche", price: 50, image: IMG("pizzalemon_109_whisky.jpg") },
      { name: "Vodka", description: "Vodka 40%, 70cl Flasche", price: 50, image: IMG("pizzalemon_110_vodka.jpg") },
      { name: "Champagner", description: "Champagner, 70cl Flasche", price: 30, image: IMG("pizzalemon_111_champagner.jpg") },
      { name: "Smirnoff Ice", description: "Smirnoff Ice, 275ml", price: 6, image: IMG("pizzalemon_112_smirnoff_ice.jpg") }
    ];
    TABAK = [
      { name: "Zigaretten", description: "Zigaretten \u2013 aktueller Preis. Z\xE4hlen nicht zum Mindestbestellwert.", price: 0, image: IMG("pizzalemon_113_zigaretten.jpg") }
    ];
  }
});

// server/seedAllDemoData.ts
var seedAllDemoData_exports = {};
__export(seedAllDemoData_exports, {
  seedAllDemoData: () => seedAllDemoData
});
import { eq as eq3, sql as sql3 } from "drizzle-orm";
import * as crypto from "crypto";
import bcrypt2 from "bcrypt";
import { addDays, addMonths } from "date-fns";
function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick(arr) {
  return arr[rand(0, arr.length - 1)];
}
function uuid() {
  return crypto.randomUUID().split("-")[0].toUpperCase();
}
async function seedAllDemoData() {
  console.log("[SEED] Starting comprehensive demo data seeding...");
  const [saCount] = await db.select({ count: sql3`count(*)` }).from(superAdmins);
  if (Number(saCount.count) === 0) {
    const hash3 = await bcrypt2.hash("admin123", 10);
    await db.insert(superAdmins).values({
      name: "System Admin",
      email: "admin@barmagly.com",
      passwordHash: hash3,
      role: "super_admin",
      isActive: true
    });
    console.log("[SEED] Created super admin: admin@barmagly.com / admin123");
  }
  const [tenantCount] = await db.select({ count: sql3`count(*)` }).from(tenants);
  if (Number(tenantCount.count) < 3) {
    for (const store of DEMO_STORES) {
      const hash3 = await bcrypt2.hash("store123", 10);
      const [tenant] = await db.insert(tenants).values({
        businessName: store.biz,
        ownerName: store.owner,
        ownerEmail: store.email,
        ownerPhone: store.phone,
        passwordHash: hash3,
        status: "active",
        maxBranches: 5,
        maxEmployees: 20
      }).returning();
      const endDate = addMonths(/* @__PURE__ */ new Date(), 12);
      const [sub] = await db.insert(tenantSubscriptions).values({
        tenantId: tenant.id,
        planType: pick(["monthly", "yearly", "trial"]),
        planName: pick(["Basic", "Professional", "Enterprise"]),
        price: pick(["9.99", "29.99", "99.99"]),
        status: "active",
        startDate: /* @__PURE__ */ new Date(),
        endDate,
        autoRenew: true
      }).returning();
      const key = `BRM-${uuid()}-${uuid()}-${uuid()}`;
      await db.insert(licenseKeys).values({
        licenseKey: key,
        tenantId: tenant.id,
        subscriptionId: sub.id,
        status: "active",
        activatedAt: /* @__PURE__ */ new Date(),
        expiresAt: endDate,
        maxActivations: 3,
        currentActivations: 1
      });
      await db.insert(tenantNotifications).values({
        tenantId: tenant.id,
        type: "info",
        title: "Welcome to Barmagly POS!",
        message: `Welcome ${store.owner}! Your store "${store.biz}" has been set up successfully.`,
        priority: "normal"
      });
    }
    console.log("[SEED] Created demo tenants.");
  }
  const allTenants = await db.select().from(tenants);
  for (const t of allTenants) {
    console.log(`[SEED] Ensuring data for tenant: ${t.businessName} (ID: ${t.id})`);
    const existingCats = await db.select().from(categories);
    if (existingCats.length === 0) {
      for (const cat of CATEGORY_NAMES) {
        await db.insert(categories).values({
          name: cat.name,
          nameAr: cat.nameAr,
          color: cat.color,
          icon: cat.icon,
          isActive: true
        });
      }
    }
    const currentCategories = await db.select().from(categories);
    let tenantBranches = await db.select().from(branches).where(eq3(branches.tenantId, t.id));
    if (tenantBranches.length === 0) {
      const branchNames = ["Main Branch", "Downtown Branch", "Mall Branch"];
      for (let i = 0; i < rand(1, 3); i++) {
        await db.insert(branches).values({
          tenantId: t.id,
          name: branchNames[i],
          address: `${rand(1, 999)} ${pick(["Main St", "Oak Ave", "Market Rd", "King Fahd Blvd"])}`,
          phone: `+201${rand(1e8, 999999999)}`,
          email: `branch${i + 1}_${t.id}@store.com`,
          isActive: true,
          isMain: i === 0,
          currency: "USD",
          taxRate: "5.00"
        });
      }
      tenantBranches = await db.select().from(branches).where(eq3(branches.tenantId, t.id));
    }
    const branchIds = tenantBranches.map((b) => b.id);
    if (branchIds.length === 0) continue;
    for (const bId of branchIds) {
      const [existingWH] = await db.select().from(warehouses).where(eq3(warehouses.branchId, bId)).limit(1);
      if (!existingWH) {
        await db.insert(warehouses).values({
          name: `Warehouse - Branch ${bId}`,
          branchId: bId,
          isDefault: true,
          isActive: true
        });
      }
    }
    let tenantEmployees = await db.select().from(employees).where(sql3`${employees.branchId} IN (${sql3.join(branchIds, sql3`, `)})`);
    if (tenantEmployees.length === 0) {
      const roles = ["admin", "manager", "cashier", "cashier"];
      const empNames = ["Ahmed Manager", "Fatima Cashier", "Omar Staff", "Sara Admin"];
      for (let i = 0; i < roles.length; i++) {
        await db.insert(employees).values({
          name: empNames[i],
          email: `emp${i + 1}_${t.id}@store.com`,
          phone: `+201${rand(1e8, 999999999)}`,
          pin: String(1e3 + i + t.id),
          role: roles[i],
          branchId: pick(branchIds),
          isActive: true,
          hourlyRate: String(rand(10, 25)),
          commissionRate: "2.50"
        });
      }
      tenantEmployees = await db.select().from(employees).where(sql3`${employees.branchId} IN (${sql3.join(branchIds, sql3`, `)})`);
    }
    const employeeIds = tenantEmployees.map((e) => e.id);
    let tenantProducts = await db.select().from(products).where(eq3(products.tenantId, t.id));
    if (tenantProducts.length === 0) {
      for (const cat of currentCategories) {
        const prods = PRODUCT_NAMES[cat.name] || [];
        for (const p of prods) {
          await db.insert(products).values({
            tenantId: t.id,
            name: p.name,
            nameAr: p.nameAr,
            sku: `SKU-${t.id}-${uuid()}`,
            barcode: `${rand(1e12, 9999999999999)}`,
            categoryId: cat.id,
            price: String(p.price),
            costPrice: String(p.cost),
            unit: "piece",
            taxable: true,
            trackInventory: true,
            isActive: true
          });
        }
      }
      tenantProducts = await db.select().from(products).where(eq3(products.tenantId, t.id));
    }
    const productIds = tenantProducts.map((p) => p.id);
    for (const pId of productIds) {
      for (const bId of branchIds) {
        const [existingInv] = await db.select().from(inventory).where(sql3`${inventory.productId} = ${pId} AND ${inventory.branchId} = ${bId}`);
        if (!existingInv) {
          await db.insert(inventory).values({
            productId: pId,
            branchId: bId,
            quantity: rand(10, 200),
            lowStockThreshold: 10,
            reorderPoint: 5,
            reorderQuantity: 50
          });
        }
      }
    }
    const [custCount] = await db.select({ count: sql3`count(*)` }).from(customers);
    if (Number(custCount.count) < 10) {
      for (const cust of CUSTOMER_NAMES) {
        await db.insert(customers).values({
          name: cust.name,
          email: `${cust.email.split("@")[0]}_${t.id}@email.com`,
          phone: cust.phone,
          loyaltyPoints: rand(0, 500),
          totalSpent: String(rand(50, 5e3)),
          visitCount: rand(1, 30),
          isActive: true
        });
      }
    }
    const customerIds = (await db.select().from(customers)).map((c) => c.id);
    const [supCount] = await db.select({ count: sql3`count(*)` }).from(suppliers);
    if (Number(supCount.count) < 5) {
      for (const sup of SUPPLIER_NAMES) {
        await db.insert(suppliers).values({
          name: sup.name,
          contactName: sup.contact,
          email: sup.email,
          phone: sup.phone,
          isActive: true
        });
      }
    }
    const supplierIds = (await db.select().from(suppliers)).map((s) => s.id);
    const [saleCount] = await db.select({ count: sql3`count(*)` }).from(sales).where(sql3`${sales.branchId} IN (${sql3.join(branchIds, sql3`, `)})`);
    if (Number(saleCount.count) < 10) {
      for (let i = 0; i < rand(5, 15); i++) {
        const bId = pick(branchIds);
        const empId = pick(employeeIds);
        const custId = pick(customerIds);
        const pId = pick(productIds);
        const product = tenantProducts.find((p) => p.id === pId);
        const qty = rand(1, 4);
        const unitPrice = parseFloat(product?.price || "10");
        const total = qty * unitPrice;
        const receiptNum = `RCP-${t.id}-${bId}-${Date.now()}-${i}`;
        const [sale] = await db.insert(sales).values({
          receiptNumber: receiptNum,
          branchId: bId,
          employeeId: empId,
          customerId: custId,
          subtotal: String(total),
          taxAmount: String((total * 0.05).toFixed(2)),
          totalAmount: String((total * 1.05).toFixed(2)),
          paymentMethod: pick(["cash", "card", "mobile"]),
          paymentStatus: "completed",
          status: "completed",
          createdAt: addDays(/* @__PURE__ */ new Date(), -rand(0, 30))
        }).returning();
        await db.insert(saleItems).values({
          saleId: sale.id,
          productId: pId,
          productName: product?.name || "Product",
          quantity: qty,
          unitPrice: String(unitPrice),
          total: String(total)
        });
        if (rand(1, 2) === 1) {
          await db.insert(kitchenOrders).values({
            saleId: sale.id,
            branchId: bId,
            status: pick(["pending", "preparing", "ready", "served"]),
            items: [{ name: product?.name || "Product", quantity: qty, notes: "Demo order", status: "pending" }],
            priority: "normal"
          });
        }
        if (rand(1, 10) === 1) {
          const [ret] = await db.insert(returns).values({
            originalSaleId: sale.id,
            employeeId: empId,
            reason: "Defective",
            totalAmount: String(total),
            branchId: bId,
            status: "completed"
          }).returning();
          await db.insert(returnItems).values({
            returnId: ret.id,
            productId: pId,
            productName: product?.name || "Product",
            quantity: qty,
            unitPrice: String(unitPrice),
            total: String(total)
          });
        }
        await db.insert(employeeCommissions).values({
          employeeId: empId,
          saleId: sale.id,
          commissionRate: "2.50",
          commissionAmount: String((total * 0.025).toFixed(2)),
          status: "pending"
        });
      }
    }
    for (const eId of employeeIds) {
      const [existingShift] = await db.select().from(shifts).where(eq3(shifts.employeeId, eId)).limit(1);
      if (!existingShift) {
        const bId = pick(branchIds);
        const [shift] = await db.insert(shifts).values({
          employeeId: eId,
          branchId: bId,
          startTime: addDays(/* @__PURE__ */ new Date(), -1),
          endTime: /* @__PURE__ */ new Date(),
          openingCash: "500.00",
          closingCash: "1200.00",
          totalSales: "700.00",
          totalTransactions: 10,
          status: "closed"
        }).returning();
        await db.insert(cashDrawerOperations).values({
          shiftId: shift.id,
          employeeId: eId,
          type: "cash_in",
          amount: "500.00",
          reason: "Opening balance"
        });
      }
    }
    for (const bId of branchIds) {
      const [existingTable] = await db.select().from(tables).where(eq3(tables.branchId, bId)).limit(1);
      if (!existingTable) {
        for (let i = 1; i <= 5; i++) {
          await db.insert(tables).values({
            branchId: bId,
            name: `T-${i}`,
            capacity: pick([2, 4, 6]),
            status: "available"
          });
        }
      }
    }
    const [expCount] = await db.select({ count: sql3`count(*)` }).from(expenses).where(sql3`${expenses.branchId} IN (${sql3.join(branchIds, sql3`, `)})`);
    if (Number(expCount.count) < 3) {
      for (let i = 0; i < 3; i++) {
        await db.insert(expenses).values({
          branchId: pick(branchIds),
          category: pick(["Rent", "Utilities", "Supplies"]),
          amount: String(rand(100, 500)),
          description: "Demo expense",
          date: addDays(/* @__PURE__ */ new Date(), -rand(0, 30)),
          employeeId: pick(employeeIds)
        });
      }
    }
    for (const pId of productIds) {
      const [existingBatch] = await db.select().from(productBatches).where(eq3(productBatches.productId, pId)).limit(1);
      if (!existingBatch) {
        const bId = pick(branchIds);
        await db.insert(productBatches).values({
          productId: pId,
          batchNumber: `BAT-${uuid()}`,
          quantity: 100,
          costPrice: "5.00",
          branchId: bId,
          supplierId: pick(supplierIds),
          receivedDate: /* @__PURE__ */ new Date()
        });
        await db.insert(inventoryMovements).values({
          productId: pId,
          branchId: bId,
          type: "receiving",
          quantity: 100,
          newQuantity: 100,
          notes: "Initial stock load",
          employeeId: pick(employeeIds)
        });
      }
    }
    for (const bId of branchIds) {
      const [existingSC] = await db.select().from(stockCounts).where(eq3(stockCounts.branchId, bId)).limit(1);
      if (!existingSC) {
        const [sc] = await db.insert(stockCounts).values({
          branchId: bId,
          employeeId: pick(employeeIds),
          status: "completed",
          totalItems: 5,
          discrepancies: 0,
          completedAt: /* @__PURE__ */ new Date()
        }).returning();
        await db.insert(stockCountItems).values({
          stockCountId: sc.id,
          productId: pick(productIds),
          systemQuantity: 100,
          actualQuantity: 100,
          difference: 0
        });
      }
    }
    await db.insert(activityLog).values({
      employeeId: pick(employeeIds),
      action: "seed_data",
      entityType: "tenant",
      entityId: t.id,
      details: "Comprehensive demo data seeded",
      createdAt: /* @__PURE__ */ new Date()
    });
    await db.insert(notifications).values({
      recipientId: pick(employeeIds),
      type: "info",
      title: "Data Seeding Complete",
      message: "Your store has been populated with demo data.",
      priority: "low"
    });
    console.log(`[SEED] Completed seeding for: ${t.businessName}`);
  }
  console.log("[SEED] \u2705 All demo data seeded successfully!");
}
var DEMO_STORES, CATEGORY_NAMES, PRODUCT_NAMES, CUSTOMER_NAMES, SUPPLIER_NAMES;
var init_seedAllDemoData = __esm({
  "server/seedAllDemoData.ts"() {
    "use strict";
    init_db();
    init_schema();
    DEMO_STORES = [
      { biz: "Glow Beauty Salon", owner: "Sara Ahmed", email: "sara@glow.com", phone: "+201001234567" },
      { biz: "The Gentlemen's Barber", owner: "Mohamed Ali", email: "mohamed@barber.com", phone: "+201009876543" },
      { biz: "Serenity Wellness Spa", owner: "Nour Hassan", email: "nour@serenity.com", phone: "+201005551234" }
    ];
    CATEGORY_NAMES = [
      { name: "Beverages", nameAr: "\u0645\u0634\u0631\u0648\u0628\u0627\u062A", color: "#3B82F6", icon: "coffee" },
      { name: "Food", nameAr: "\u0637\u0639\u0627\u0645", color: "#EF4444", icon: "utensils" },
      { name: "Electronics", nameAr: "\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A\u0627\u062A", color: "#8B5CF6", icon: "smartphone" },
      { name: "Beauty", nameAr: "\u062A\u062C\u0645\u064A\u0644", color: "#EC4899", icon: "sparkles" },
      { name: "Clothing", nameAr: "\u0645\u0644\u0627\u0628\u0633", color: "#F59E0B", icon: "shirt" }
    ];
    PRODUCT_NAMES = {
      Beverages: [
        { name: "Espresso", nameAr: "\u0625\u0633\u0628\u0631\u064A\u0633\u0648", price: 3.5, cost: 0.8 },
        { name: "Cappuccino", nameAr: "\u0643\u0627\u0628\u062A\u0634\u064A\u0646\u0648", price: 4.5, cost: 1.2 },
        { name: "Fresh Orange Juice", nameAr: "\u0639\u0635\u064A\u0631 \u0628\u0631\u062A\u0642\u0627\u0644", price: 5, cost: 1.5 },
        { name: "Green Tea", nameAr: "\u0634\u0627\u064A \u0623\u062E\u0636\u0631", price: 3, cost: 0.5 },
        { name: "Iced Latte", nameAr: "\u0644\u0627\u062A\u064A\u0647 \u0645\u062B\u0644\u062C", price: 5.5, cost: 1.3 },
        { name: "Smoothie Bowl", nameAr: "\u0633\u0645\u0648\u062B\u064A \u0628\u0648\u0644", price: 7, cost: 2 }
      ],
      Food: [
        { name: "Grilled Chicken Sandwich", nameAr: "\u0633\u0627\u0646\u062F\u0648\u064A\u062A\u0634 \u062F\u062C\u0627\u062C \u0645\u0634\u0648\u064A", price: 8.5, cost: 3.5 },
        { name: "Caesar Salad", nameAr: "\u0633\u0644\u0637\u0629 \u0633\u064A\u0632\u0631", price: 7, cost: 2.5 },
        { name: "Margherita Pizza", nameAr: "\u0628\u064A\u062A\u0632\u0627 \u0645\u0627\u0631\u063A\u0631\u064A\u062A\u0627", price: 12, cost: 4 },
        { name: "Beef Burger", nameAr: "\u0628\u0631\u062C\u0631 \u0644\u062D\u0645", price: 10.5, cost: 4.5 },
        { name: "Pasta Alfredo", nameAr: "\u0628\u0627\u0633\u062A\u0627 \u0623\u0644\u0641\u0631\u064A\u062F\u0648", price: 9, cost: 3 }
      ],
      Electronics: [
        { name: "USB-C Cable", nameAr: "\u0643\u064A\u0628\u0644 \u064A\u0648 \u0625\u0633 \u0628\u064A \u0633\u064A", price: 8, cost: 2 },
        { name: "Phone Case", nameAr: "\u0643\u0641\u0631 \u0645\u0648\u0628\u0627\u064A\u0644", price: 12, cost: 3 },
        { name: "Wireless Earbuds", nameAr: "\u0633\u0645\u0627\u0639\u0627\u062A \u0644\u0627\u0633\u0644\u0643\u064A\u0629", price: 35, cost: 15 },
        { name: "Power Bank 10000mAh", nameAr: "\u0628\u0627\u0648\u0631 \u0628\u0627\u0646\u0643", price: 25, cost: 10 }
      ],
      Beauty: [
        { name: "Hair Styling Gel", nameAr: "\u062C\u0644 \u0634\u0639\u0631", price: 15, cost: 5 },
        { name: "Facial Cream", nameAr: "\u0643\u0631\u064A\u0645 \u0648\u062C\u0647", price: 22, cost: 8 },
        { name: "Shampoo 500ml", nameAr: "\u0634\u0627\u0645\u0628\u0648 \u0665\u0660\u0660\u0645\u0644", price: 18, cost: 6 },
        { name: "Nail Polish Set", nameAr: "\u0645\u062C\u0645\u0648\u0639\u0629 \u0645\u0646\u0627\u0643\u064A\u0631", price: 12, cost: 3.5 },
        { name: "Body Lotion", nameAr: "\u0644\u0648\u0634\u0646 \u062C\u0633\u0645", price: 20, cost: 7 }
      ],
      Clothing: [
        { name: "Cotton T-Shirt", nameAr: "\u062A\u064A\u0634\u064A\u0631\u062A \u0642\u0637\u0646", price: 15, cost: 5 },
        { name: "Denim Jeans", nameAr: "\u062C\u064A\u0646\u0632", price: 35, cost: 15 },
        { name: "Baseball Cap", nameAr: "\u0643\u0627\u0628", price: 10, cost: 3 },
        { name: "Leather Belt", nameAr: "\u062D\u0632\u0627\u0645 \u062C\u0644\u062F", price: 18, cost: 6 }
      ]
    };
    CUSTOMER_NAMES = [
      { name: "Ahmed Hassan", email: "ahmed@email.com", phone: "+201111111111" },
      { name: "Fatima Ali", email: "fatima@email.com", phone: "+201222222222" },
      { name: "Omar Khaled", email: "omar@email.com", phone: "+201333333333" },
      { name: "Layla Mohamed", email: "layla@email.com", phone: "+201444444444" },
      { name: "Youssef Ibrahim", email: "youssef@email.com", phone: "+201555555555" },
      { name: "Mona Samir", email: "mona@email.com", phone: "+201666666666" },
      { name: "Karim Nasser", email: "karim@email.com", phone: "+201777777777" },
      { name: "Hana Mahmoud", email: "hana@email.com", phone: "+201888888888" }
    ];
    SUPPLIER_NAMES = [
      { name: "Global Supplies Co.", contact: "John Smith", email: "john@global.com", phone: "+1555111" },
      { name: "Fresh Farms LLC", contact: "Ali Mostafa", email: "ali@freshfarms.com", phone: "+1555222" },
      { name: "Tech Wholesale Inc.", contact: "David Lee", email: "david@techwholesale.com", phone: "+1555333" },
      { name: "Beauty World Dist.", contact: "Lina Adel", email: "lina@beautyworld.com", phone: "+1555444" }
    ];
  }
});

// server/index.ts
import express from "express";

// server/routes.ts
init_storage();
import { createServer } from "node:http";
import * as xlsx from "xlsx";
import path2 from "node:path";
import fs3 from "node:fs";
import { randomUUID as randomUUID3 } from "node:crypto";

// server/objectStorage.ts
import { Storage } from "@google-cloud/storage";
import { randomUUID } from "crypto";
var REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";
var objectStorageClient = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
    type: "external_account",
    credential_source: {
      url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
      format: {
        type: "json",
        subject_token_field_name: "access_token"
      }
    },
    universe_domain: "googleapis.com"
  },
  projectId: ""
});
var ObjectNotFoundError = class _ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, _ObjectNotFoundError.prototype);
  }
};
var ObjectStorageService = class {
  constructor() {
  }
  getPublicObjectSearchPaths() {
    const pathsStr = process.env.PUBLIC_OBJECT_SEARCH_PATHS || "";
    const paths = Array.from(
      new Set(
        pathsStr.split(",").map((path5) => path5.trim()).filter((path5) => path5.length > 0)
      )
    );
    if (paths.length === 0) {
      throw new Error("PUBLIC_OBJECT_SEARCH_PATHS not set.");
    }
    return paths;
  }
  getPrivateObjectDir() {
    const dir = process.env.PRIVATE_OBJECT_DIR || "";
    if (!dir) {
      throw new Error("PRIVATE_OBJECT_DIR not set.");
    }
    return dir;
  }
  async searchPublicObject(filePath) {
    for (const searchPath of this.getPublicObjectSearchPaths()) {
      const fullPath = `${searchPath}/${filePath}`;
      const { bucketName, objectName } = parseObjectPath(fullPath);
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);
      const [exists] = await file.exists();
      if (exists) {
        return file;
      }
    }
    return null;
  }
  async downloadObject(file, res, cacheTtlSec = 3600) {
    try {
      const [metadata] = await file.getMetadata();
      res.set({
        "Content-Type": metadata.contentType || "application/octet-stream",
        "Content-Length": metadata.size,
        "Cache-Control": `public, max-age=${cacheTtlSec}`
      });
      const stream = file.createReadStream();
      stream.on("error", (err) => {
        console.error("Stream error:", err);
        if (!res.headersSent) {
          res.status(500).json({ error: "Error streaming file" });
        }
      });
      stream.pipe(res);
    } catch (error) {
      console.error("Error downloading file:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Error downloading file" });
      }
    }
  }
  async getObjectEntityUploadURL() {
    const privateObjectDir = this.getPrivateObjectDir();
    const objectId = randomUUID();
    const fullPath = `${privateObjectDir}/uploads/${objectId}`;
    const { bucketName, objectName } = parseObjectPath(fullPath);
    return signObjectURL({ bucketName, objectName, method: "PUT", ttlSec: 900 });
  }
  async getObjectEntityFile(objectPath) {
    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }
    const parts = objectPath.slice(1).split("/");
    if (parts.length < 2) {
      throw new ObjectNotFoundError();
    }
    const entityId = parts.slice(1).join("/");
    let entityDir = this.getPrivateObjectDir();
    if (!entityDir.endsWith("/")) entityDir = `${entityDir}/`;
    const objectEntityPath = `${entityDir}${entityId}`;
    const { bucketName, objectName } = parseObjectPath(objectEntityPath);
    const bucket = objectStorageClient.bucket(bucketName);
    const objectFile = bucket.file(objectName);
    const [exists] = await objectFile.exists();
    if (!exists) throw new ObjectNotFoundError();
    return objectFile;
  }
  normalizeObjectEntityPath(rawPath) {
    if (!rawPath.startsWith("https://storage.googleapis.com/")) return rawPath;
    const url = new URL(rawPath);
    const rawObjectPath = url.pathname;
    let objectEntityDir = this.getPrivateObjectDir();
    if (!objectEntityDir.endsWith("/")) objectEntityDir = `${objectEntityDir}/`;
    if (!rawObjectPath.startsWith(objectEntityDir)) return rawObjectPath;
    const entityId = rawObjectPath.slice(objectEntityDir.length);
    return `/objects/${entityId}`;
  }
};
function parseObjectPath(path5) {
  if (!path5.startsWith("/")) path5 = `/${path5}`;
  const pathParts = path5.split("/");
  if (pathParts.length < 3) throw new Error("Invalid path");
  const bucketName = pathParts[1];
  const objectName = pathParts.slice(2).join("/");
  return { bucketName, objectName };
}
async function signObjectURL({ bucketName, objectName, method, ttlSec }) {
  const request = {
    bucket_name: bucketName,
    object_name: objectName,
    method,
    expires_at: new Date(Date.now() + ttlSec * 1e3).toISOString()
  };
  const response = await fetch(`${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request)
  });
  if (!response.ok) throw new Error(`Failed to sign object URL: ${response.status}`);
  const { signed_url: signedURL } = await response.json();
  return signedURL;
}

// server/callerIdService.ts
init_phoneUtils();
import { EventEmitter } from "events";
import { WebSocketServer, WebSocket } from "ws";
var SLOT_EXPIRY_MS = 5 * 60 * 1e3;
var CallerIDService = class extends EventEmitter {
  wss = null;
  isSimulation = true;
  // Key: "tenantId-slot"
  activeCallSlots = /* @__PURE__ */ new Map();
  slotTimeouts = /* @__PURE__ */ new Map();
  constructor() {
    super();
  }
  /**
   * Initialize the service and start listening for calls
   */
  async init(server) {
    console.log("[CallerID] Initializing Service...");
    this.wss = new WebSocketServer({ server, path: "/api/ws/caller-id" });
    this.wss.on("connection", (ws) => {
      console.log("[CallerID] Client connected to WebSocket");
      ws.send(JSON.stringify({ type: "connected", status: "ready", mode: this.isSimulation ? "simulation" : "hardware" }));
      ws.on("message", (message) => {
        try {
          const data = JSON.parse(message.toString());
          if (data.type === "register") {
            const tenantId = Number(data.tenantId);
            if (!isNaN(tenantId)) {
              ws.tenantId = tenantId;
              console.log(`[CallerID] Client registered for tenant: ${tenantId}`);
              const activeCalls = Array.from(this.activeCallSlots.values()).filter((c) => c.tenantId === tenantId);
              if (activeCalls.length > 0) {
                ws.send(JSON.stringify({ type: "active_calls", calls: activeCalls }));
              }
            }
          } else if (data.type === "simulate_call") {
            const tenantId = data.tenantId || ws.tenantId;
            this.handleIncomingCall(data.phoneNumber || "0123456789", data.slot, tenantId);
          } else if (data.type === "call_answered" || data.type === "call_ended") {
            const slot = Number(data.slot);
            const tenantId = ws.tenantId;
            if (slot && tenantId) {
              const key = `${tenantId}-${slot}`;
              const call = this.activeCallSlots.get(key);
              if (call?.dbCallId) {
                Promise.resolve().then(() => (init_storage(), storage_exports)).then(({ storage: storage2 }) => {
                  storage2.updateCall(call.dbCallId, { status: "answered" }).catch(() => {
                  });
                });
              }
              this.activeCallSlots.delete(key);
              const t = this.slotTimeouts.get(key);
              if (t) {
                clearTimeout(t);
                this.slotTimeouts.delete(key);
              }
              this.broadcastCallSlotUpdate(tenantId);
            }
          }
        } catch (e) {
          console.error("[CallerID] WS message error:", e);
        }
      });
      ws.on("close", () => {
        console.log("[CallerID] Client disconnected");
      });
    });
    console.log("[CallerID] WebSocket server listening on /api/ws/caller-id");
  }
  /**
   * Main entry point when a call is detected
   */
  async handleIncomingCall(phoneNumber, preferredSlot, tenantId) {
    const normalized = normalizePhone(phoneNumber);
    let resolvedTenantId = tenantId || null;
    if (this.wss && resolvedTenantId) {
      const hasClientForTenant = Array.from(this.wss.clients).some(
        (c) => c.readyState === WebSocket.OPEN && c.tenantId === resolvedTenantId
      );
      if (!hasClientForTenant) {
        const firstRegistered = Array.from(this.wss.clients).find(
          (c) => c.readyState === WebSocket.OPEN && c.tenantId
        );
        if (firstRegistered?.tenantId) {
          console.log(`[CallerID] Bridge tenantId=${resolvedTenantId} has no clients. Remapping to tenant=${firstRegistered.tenantId}`);
          resolvedTenantId = firstRegistered.tenantId;
        }
      }
    }
    console.log(`[CallerID] Incoming call for tenant ${resolvedTenantId}: ${phoneNumber} (Normalized: ${normalized})`);
    let slot = preferredSlot || 0;
    if (slot < 1 || slot > 4) {
      for (let i = 1; i <= 4; i++) {
        const key2 = `${resolvedTenantId}-${i}`;
        if (!this.activeCallSlots.has(key2)) {
          slot = i;
          break;
        }
      }
    }
    if (slot === 0) {
      console.log(`[CallerID] No slots available for tenant ${resolvedTenantId}, dropping call notification`);
      return null;
    }
    const key = `${resolvedTenantId}-${slot}`;
    const existingTimeout = this.slotTimeouts.get(key);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      this.slotTimeouts.delete(key);
    }
    const callInfo = {
      phoneNumber,
      normalizedPhone: normalized,
      slot,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      tenantId: resolvedTenantId,
      customer: null
    };
    this.activeCallSlots.set(key, callInfo);
    const timeout = setTimeout(() => {
      console.log(`[CallerID] Auto-expiring slot ${slot} for tenant ${resolvedTenantId}`);
      this.activeCallSlots.delete(key);
      this.slotTimeouts.delete(key);
      if (resolvedTenantId) this.broadcastCallSlotUpdate(resolvedTenantId);
    }, SLOT_EXPIRY_MS);
    this.slotTimeouts.set(key, timeout);
    try {
      const { storage: storage2 } = await Promise.resolve().then(() => (init_storage(), storage_exports));
      const customers2 = await storage2.findCustomerByPhone(normalized, resolvedTenantId);
      if (customers2 && customers2.length > 0) {
        callInfo.customer = customers2[0];
        console.log(`[CallerID] Matched customer: ${callInfo.customer?.name}`);
      }
    } catch (e) {
      console.error("[CallerID] Customer lookup error:", e);
    }
    try {
      const { storage: storage2 } = await Promise.resolve().then(() => (init_storage(), storage_exports));
      const dbCall = await storage2.createCall({
        tenantId: resolvedTenantId,
        phoneNumber,
        customerId: callInfo.customer?.id || null,
        status: "missed"
      });
      callInfo.dbCallId = dbCall.id;
      console.log(`[CallerID] Call recorded in DB with ID: ${dbCall.id} for tenant ${resolvedTenantId}`);
    } catch (e) {
      console.error("[CallerID] DB save error:", e);
    }
    const tenantActiveCalls = Array.from(this.activeCallSlots.values()).filter((c) => c.tenantId === resolvedTenantId);
    const payload = JSON.stringify({
      type: "incoming_call",
      phoneNumber,
      normalizedPhone: normalized,
      slot,
      timestamp: callInfo.timestamp,
      customer: callInfo.customer,
      totalActiveCalls: tenantActiveCalls.length,
      allActiveCalls: tenantActiveCalls
    });
    this.broadcastToTenant(payload, resolvedTenantId || void 0);
    this.emit("call", phoneNumber, slot, callInfo.customer, resolvedTenantId);
    return callInfo;
  }
  broadcastToTenant(payload, tenantId) {
    if (!this.wss) return;
    let total = 0, matched = 0;
    const allOpen = [];
    this.wss.clients.forEach((client2) => {
      if (client2.readyState === WebSocket.OPEN) {
        total++;
        allOpen.push(client2);
        if (!tenantId || !client2.tenantId || client2.tenantId === tenantId) {
          matched++;
          client2.send(payload);
        }
      }
    });
    if (tenantId && matched === 0 && allOpen.length > 0) {
      console.log(`[CallerID] No clients for tenant=${tenantId}, falling back to broadcast all ${allOpen.length} clients`);
      allOpen.forEach((c) => c.send(payload));
      matched = allOpen.length;
    }
    console.log(`[CallerID] Broadcast: ${matched}/${total} clients matched tenant=${tenantId}`);
  }
  /**
   * Broadcasts updated slot information to a specific tenant
   */
  broadcastCallSlotUpdate(tenantId) {
    const tenantActiveCalls = Array.from(this.activeCallSlots.values()).filter((c) => c.tenantId === tenantId);
    const payload = JSON.stringify({
      type: "calls_update",
      allActiveCalls: tenantActiveCalls,
      totalActiveCalls: tenantActiveCalls.length
    });
    this.broadcastToTenant(payload, tenantId);
  }
  /**
   * Broadcast any arbitrary message to a specific tenant
   */
  broadcast(payload, tenantId) {
    const msg = JSON.stringify(payload);
    this.broadcastToTenant(msg, tenantId);
  }
  /**
   * Returns all currently active calls for a given tenant (for HTTP polling fallback).
   */
  getActiveCallsForTenant(tenantId) {
    return Array.from(this.activeCallSlots.values()).filter((c) => c.tenantId === tenantId);
  }
  /**
   * Mock function to trigger a call (for testing)
   */
  simulateCall(number = "0123456789", slot, tenantId) {
    this.handleIncomingCall(number, slot, tenantId);
  }
};
var callerIdService = new CallerIDService();

// server/pushService.ts
import webpush from "web-push";
var VAPID_PUBLIC = "BN_VRMNof7tvLBE3u4-dJdq7ZBSOHUqrexcuD2Tf81rQe4t1GSkbUNzRGU9DyoXObqFwUa2ef1w4AWhteWalk08";
var VAPID_PRIVATE = "SYAn5KRDjhIDKcIb7WJr3kgr_LDsLKQYWEIHmcgfnjY";
var VAPID_EMAIL = "mailto:admin@barmagly.tech";
webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE);
var subscriptions2 = /* @__PURE__ */ new Map();
var pushService = {
  /** Public VAPID key for the browser to use when subscribing */
  publicKey: VAPID_PUBLIC,
  /** Save a push subscription received from the browser */
  subscribe(sub, tenantId) {
    if (!tenantId) return;
    subscriptions2.set(sub.endpoint, { sub, tenantId });
    console.log(`[Push] Subscription saved for tenant ${tenantId}. Total: ${subscriptions2.size}`);
  },
  /** Remove a subscription (when browser unsubscribes) */
  unsubscribe(endpoint) {
    subscriptions2.delete(endpoint);
  },
  /** Send a push payload to all subscribed browsers of a specific tenant */
  async broadcast(payload, tenantId) {
    if (subscriptions2.size === 0) return;
    const msg = JSON.stringify(payload);
    const failed = [];
    const recipients = Array.from(subscriptions2.values()).filter((record) => {
      return !tenantId || record.tenantId === tenantId;
    });
    if (recipients.length === 0) return;
    await Promise.allSettled(
      recipients.map(async (record) => {
        try {
          await webpush.sendNotification(record.sub, msg);
        } catch (err) {
          if (err.statusCode === 410 || err.statusCode === 404) {
            failed.push(record.sub.endpoint);
          } else {
            console.error("[Push] Send failed:", err.message);
          }
        }
      })
    );
    failed.forEach((ep) => subscriptions2.delete(ep));
  },
  /** Push: incoming call notification */
  async notifyIncomingCall(phoneNumber, tenantId, customerName, address) {
    let body = phoneNumber;
    if (customerName) body += ` \u2014 ${customerName}`;
    if (address) body += `
\u{1F4CD} ${address}`;
    await this.broadcast({
      type: "incoming_call",
      title: `\u{1F4DE} Incoming Call`,
      body,
      data: { type: "incoming_call", phoneNumber }
    }, tenantId);
  },
  /** Push: new online order notification */
  async notifyNewOrder(orderNumber, total, tenantId) {
    await this.broadcast({
      type: "new_online_order",
      title: "\u{1F6D2} New Online Order",
      body: `Order #${orderNumber} \u2014 CHF ${Number(total).toFixed(2)}`,
      data: { type: "new_online_order", orderNumber }
    }, tenantId);
  }
};

// server/superAdminAuth.ts
init_storage();
import jwt from "jsonwebtoken";
var JWT_SECRET = process.env.JWT_SECRET || "barmagly-super-admin-secret-key-2024";
function generateToken(adminId, email, role) {
  return jwt.sign({ id: adminId, email, role }, JWT_SECRET, { expiresIn: "24h" });
}
var requireSuperAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized: Missing or invalid token" });
    }
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const admin = await storage.getSuperAdmin(decoded.id);
    if (!admin || !admin.isActive) {
      return res.status(401).json({ error: "Unauthorized: Admin account disabled or not found" });
    }
    req.admin = {
      id: admin.id,
      email: admin.email,
      role: admin.role || "super_admin"
    };
    next();
  } catch (error) {
    return res.status(401).json({ error: "Unauthorized: Invalid token" });
  }
};

// server/stripeClient.ts
import Stripe from "stripe";
var connectionSettings;
async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY ? "repl " + process.env.REPL_IDENTITY : process.env.WEB_REPL_RENEWAL ? "depl " + process.env.WEB_REPL_RENEWAL : null;
  if (!xReplitToken) {
    if (process.env.NODE_ENV === "development") {
      console.warn("X-Replit-Token not found. Using dummy credentials for local development.");
      return {
        publishableKey: "pk_test_dummy",
        secretKey: "sk_test_dummy"
      };
    }
    throw new Error("X-Replit-Token not found for repl/depl");
  }
  const connectorName = "stripe";
  const isProduction = process.env.REPLIT_DEPLOYMENT === "1";
  const targetEnvironment = isProduction ? "production" : "development";
  const url = new URL(`https://${hostname}/api/v2/connection`);
  url.searchParams.set("include_secrets", "true");
  url.searchParams.set("connector_names", connectorName);
  url.searchParams.set("environment", targetEnvironment);
  const response = await fetch(url.toString(), {
    headers: {
      "Accept": "application/json",
      "X-Replit-Token": xReplitToken
    }
  });
  const data = await response.json();
  connectionSettings = data.items?.[0];
  if (!connectionSettings || (!connectionSettings.settings.publishable || !connectionSettings.settings.secret)) {
    throw new Error(`Stripe ${targetEnvironment} connection not found`);
  }
  return {
    publishableKey: connectionSettings.settings.publishable,
    secretKey: connectionSettings.settings.secret
  };
}
async function getUncachableStripeClient() {
  const { secretKey } = await getCredentials();
  return new Stripe(secretKey, {
    apiVersion: "2025-08-27.basil"
  });
}
async function getStripePublishableKey() {
  const { publishableKey } = await getCredentials();
  return publishableKey;
}
async function getStripeSecretKey() {
  const { secretKey } = await getCredentials();
  return secretKey;
}
var stripeSync = null;
async function getStripeSync() {
  if (!stripeSync) {
    const { StripeSync } = await import("stripe-replit-sync");
    const secretKey = await getStripeSecretKey();
    stripeSync = new StripeSync({
      poolConfig: {
        connectionString: process.env.DATABASE_URL,
        max: 2
      },
      stripeSecretKey: secretKey
    });
  }
  return stripeSync;
}

// server/emailService.ts
import nodemailer from "nodemailer";
var SMTP_HOST = process.env.SMTP_HOST || "smtp.hostinger.com";
var SMTP_PORT = parseInt(process.env.SMTP_PORT || "465");
var SMTP_USER = process.env.SMTP_USER || "info@barmagly.tech";
var SMTP_PASS = process.env.SMTP_PASS || "Khaled312001*Khaled312001*";
var FROM_NAME = "Barmagly POS";
var transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: true,
  // port 465 = SSL
  auth: { user: SMTP_USER, pass: SMTP_PASS },
  tls: { rejectUnauthorized: false }
});
async function sendLicenseKeyEmail(opts) {
  const { to, ownerName, businessName, licenseKey, planName, planType, tempPassword, expiresAt } = opts;
  const planLabel = planName === "advanced" ? "Smart Business Growth" : "POS Starter";
  const billingLabel = planType === "yearly" ? "Annual" : planType === "monthly" ? "Monthly" : "Trial";
  const expiryStr = expiresAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Welcome to Barmagly</title>
</head>
<body style="margin:0;padding:0;background:#0A0E17;font-family:Inter,Arial,sans-serif;color:#e2e8f0">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0E17;padding:40px 20px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#13172A;border-radius:20px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);max-width:600px">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1a1f35,#0d1120);padding:40px 40px 32px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.06)">
            <div style="font-size:32px;font-weight:900;background:linear-gradient(135deg,#2FD3C6,#6366F1);-webkit-background-clip:text;-webkit-text-fill-color:transparent;letter-spacing:-1px;margin-bottom:8px">
              Barmagly POS
            </div>
            <div style="font-size:13px;color:#64748b;letter-spacing:2px;text-transform:uppercase">Point of Sale System</div>
          </td>
        </tr>
        <!-- Confetti banner -->
        <tr>
          <td style="background:linear-gradient(135deg,#2FD3C620,#6366F110);padding:28px 40px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.05)">
            <div style="font-size:40px;margin-bottom:10px">\u{1F389}</div>
            <h1 style="margin:0 0 8px;font-size:26px;font-weight:800;color:#f0f4f8">You're all set, ${ownerName}!</h1>
            <p style="margin:0;font-size:15px;color:#94a3b8">Your <strong style="color:#2FD3C6">${businessName}</strong> store is ready to go live</p>
          </td>
        </tr>
        <!-- License Key Box -->
        <tr>
          <td style="padding:32px 40px">
            <div style="background:#0A0E17;border:1px solid rgba(47,211,198,0.3);border-radius:16px;padding:24px;text-align:center;margin-bottom:24px">
              <div style="font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#64748b;margin-bottom:12px">Your License Key</div>
              <div style="font-size:20px;font-weight:800;letter-spacing:3px;color:#2FD3C6;font-family:monospace;word-break:break-all">${licenseKey}</div>
              <div style="margin-top:12px;font-size:12px;color:#475569">Valid until ${expiryStr}</div>
            </div>

            <!-- Plan Info -->
            <div style="display:flex;gap:12px;margin-bottom:24px">
              <div style="flex:1;background:rgba(47,211,198,0.08);border:1px solid rgba(47,211,198,0.2);border-radius:12px;padding:16px;text-align:center">
                <div style="font-size:11px;color:#64748b;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px">Plan</div>
                <div style="font-size:15px;font-weight:700;color:#2FD3C6">${planLabel}</div>
              </div>
              <div style="flex:1;background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.2);border-radius:12px;padding:16px;text-align:center">
                <div style="font-size:11px;color:#64748b;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px">Billing</div>
                <div style="font-size:15px;font-weight:700;color:#6366F1">${billingLabel}</div>
              </div>
            </div>

            <!-- Login Credentials -->
            <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:20px;margin-bottom:24px">
              <div style="font-size:13px;font-weight:700;color:#94a3b8;margin-bottom:12px;text-transform:uppercase;letter-spacing:1px">App Login Credentials</div>
              <table width="100%" cellpadding="4" cellspacing="0">
                <tr>
                  <td style="font-size:13px;color:#64748b;width:100px">Email</td>
                  <td style="font-size:13px;color:#e2e8f0;font-weight:600">${to}</td>
                </tr>
                <tr>
                  <td style="font-size:13px;color:#64748b">Password</td>
                  <td style="font-size:13px;color:#e2e8f0;font-weight:600;font-family:monospace">${tempPassword}</td>
                </tr>
                <tr>
                  <td style="font-size:13px;color:#64748b">License Key</td>
                  <td style="font-size:13px;color:#2FD3C6;font-weight:600;font-family:monospace">${licenseKey}</td>
                </tr>
              </table>
            </div>

            <!-- Steps -->
            <div style="margin-bottom:24px">
              <div style="font-size:13px;font-weight:700;color:#94a3b8;margin-bottom:16px;text-transform:uppercase;letter-spacing:1px">Get Started in 3 Steps</div>
              <div style="display:flex;flex-direction:column;gap:10px">
                <div style="display:flex;align-items:center;gap:12px;background:rgba(255,255,255,0.02);border-radius:10px;padding:12px">
                  <div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#2FD3C6,#6366F1);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;color:#fff;flex-shrink:0;text-align:center;line-height:28px">1</div>
                  <span style="font-size:14px;color:#cbd5e1">Download the <strong style="color:#f0f4f8">Barmagly POS</strong> app</span>
                </div>
                <div style="display:flex;align-items:center;gap:12px;background:rgba(255,255,255,0.02);border-radius:10px;padding:12px">
                  <div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#2FD3C6,#6366F1);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;color:#fff;flex-shrink:0;text-align:center;line-height:28px">2</div>
                  <span style="font-size:14px;color:#cbd5e1">Enter your <strong style="color:#f0f4f8">email & password</strong> to log in</span>
                </div>
                <div style="display:flex;align-items:center;gap:12px;background:rgba(255,255,255,0.02);border-radius:10px;padding:12px">
                  <div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#2FD3C6,#6366F1);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;color:#fff;flex-shrink:0;text-align:center;line-height:28px">3</div>
                  <span style="font-size:14px;color:#cbd5e1">Enter your <strong style="color:#2FD3C6">license key</strong> to activate your store</span>
                </div>
              </div>
            </div>

            <!-- CTA Button -->
            <div style="text-align:center">
              <a href="https://barmagly.com" style="display:inline-block;background:linear-gradient(135deg,#2FD3C6,#6366F1);color:#fff;text-decoration:none;padding:14px 40px;border-radius:999px;font-weight:700;font-size:15px;letter-spacing:0.5px">Open Barmagly POS \u2192</a>
            </div>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:rgba(0,0,0,0.3);border-top:1px solid rgba(255,255,255,0.05);padding:24px 40px;text-align:center">
            <p style="margin:0 0 8px;font-size:12px;color:#475569">Questions? Contact us at <a href="mailto:info@barmagly.tech" style="color:#2FD3C6;text-decoration:none">info@barmagly.tech</a></p>
            <p style="margin:0;font-size:11px;color:#334155">\xA9 ${(/* @__PURE__ */ new Date()).getFullYear()} Barmagly POS \xB7 All rights reserved</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  await transporter.sendMail({
    from: `"${FROM_NAME}" <${SMTP_USER}>`,
    to,
    subject: `\u{1F389} Welcome to Barmagly POS \u2014 Your License Key for ${businessName}`,
    html,
    text: `Welcome to Barmagly POS!

Hi ${ownerName},

Your store "${businessName}" is ready.

License Key: ${licenseKey}
Email: ${to}
Password: ${tempPassword}
Plan: ${planLabel} (${billingLabel})
Expires: ${expiryStr}

Get the Barmagly POS app and enter your credentials to get started.

Questions? Email us at info@barmagly.tech`
  });
}

// server/whatsappService.ts
import os from "os";
import path from "path";
import fs2 from "fs";
var wppconnect = null;
async function loadWppConnect() {
  if (!wppconnect) {
    console.log("[WhatsApp] Attempting to load @wppconnect-team/wppconnect...");
    try {
      const mod = await import("@wppconnect-team/wppconnect");
      wppconnect = mod.default ?? mod;
      console.log("[WhatsApp] Successfully loaded @wppconnect-team/wppconnect");
    } catch (err) {
      console.error("[WhatsApp] FAIL to load wppconnect:", err);
      return null;
    }
  }
  return wppconnect;
}
var ADMIN_PHONE = "201204593124";
var SESSION_NAME = "barmagly-pos";
var STORAGE_DIR = path.resolve(process.cwd(), ".wppconnect");
var CHROME_DATA_DIR = path.join(STORAGE_DIR, "chrome-data");
var TOKEN_DIR = path.join(STORAGE_DIR, "tokens");
var client = null;
var clientReady = false;
var status = "disconnected";
var lastQrCode = null;
var lastError = null;
var connectionLog = [];
var connecting = false;
var connectionPhase = "idle";
var connectionStartTime = 0;
var autoReconnectTimer = null;
var pendingMessages = [];
function log(event) {
  const entry = { time: (/* @__PURE__ */ new Date()).toISOString(), event };
  connectionLog.unshift(entry);
  if (connectionLog.length > 100) connectionLog.length = 100;
  console.log(`[WhatsApp] ${event}`);
}
function toChatId(phone) {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("410") && digits.length === 12) {
    digits = "41" + digits.slice(3);
  } else if (digits.startsWith("0") && digits.length === 10) {
    digits = "41" + digits.slice(1);
  } else if (digits.length === 9 && !digits.startsWith("0")) {
    digits = "41" + digits;
  }
  return `${digits}@c.us`;
}
async function cleanupProcesses() {
  try {
    const { execSync } = await import("child_process");
    const isWindows = os.platform() === "win32";
    if (isWindows) {
      execSync(`wmic process where "name='chrome.exe' and commandline like '%chrome-data%'" call terminate 2>nul`, { stdio: "ignore" });
      execSync(`wmic process where "name='chromium.exe' and commandline like '%chrome-data%'" call terminate 2>nul`, { stdio: "ignore" });
    } else {
      execSync(
        `pkill -9 -f 'wppconnect' 2>/dev/null; pkill -9 -f 'chromium.*barmagly' 2>/dev/null; true`,
        { timeout: 4e3 }
      );
    }
    await new Promise((r) => setTimeout(r, 500));
  } catch {
  }
  if (!fs2.existsSync(STORAGE_DIR)) {
    fs2.mkdirSync(STORAGE_DIR, { recursive: true });
  }
}
async function isClientAlive() {
  if (!client) return false;
  try {
    const state = await Promise.race([
      client.getConnectionState(),
      new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 5e3))
    ]);
    return state === "CONNECTED";
  } catch {
    return false;
  }
}
function scheduleAutoReconnect() {
  if (autoReconnectTimer) clearTimeout(autoReconnectTimer);
  autoReconnectTimer = setTimeout(async () => {
    autoReconnectTimer = null;
    if (status === "disconnected" && !connecting) {
      log("Auto-reconnecting\u2026");
      try {
        await whatsappService.connect();
        if (whatsappService.getStatus().status === "connected" && pendingMessages.length > 0) {
          log(`Flushing ${pendingMessages.length} queued message(s)`);
          const toSend = [...pendingMessages];
          pendingMessages = [];
          for (const m of toSend) {
            if (Date.now() - m.timestamp < 10 * 60 * 1e3) {
              await whatsappService.sendText(m.phone, m.text);
            } else {
              log(`Dropped stale queued message for ${m.phone} (>10min old)`);
            }
          }
        }
      } catch (err) {
        log(`Auto-reconnect failed: ${err.message}`);
        scheduleAutoReconnect();
      }
    }
  }, 15e3);
}
async function _connectBackground(wpp) {
  try {
    const { execSync } = await import("child_process");
    const fsMod = await import("fs");
    let browserPath;
    const envChrome = process.env.CHROME_PATH || process.env.PUPPETEER_EXECUTABLE_PATH;
    if (envChrome && fsMod.existsSync(envChrome)) {
      browserPath = envChrome;
      log(`Using env override: ${browserPath}`);
    }
    const isWindows = os.platform() === "win32";
    if (!browserPath && !isWindows) {
      try {
        const found = execSync(
          "which chromium 2>/dev/null || which chromium-browser 2>/dev/null || which google-chrome-stable 2>/dev/null || which google-chrome 2>/dev/null",
          { encoding: "utf-8", timeout: 5e3 }
        ).trim().split("\n")[0];
        if (found && fsMod.existsSync(found)) {
          browserPath = found;
        }
      } catch {
      }
    }
    if (!browserPath && !isWindows) {
      try {
        const nixFound = execSync(
          "find /nix/store -maxdepth 4 -name 'chromium' -type f 2>/dev/null | grep '/bin/chromium$' | head -1",
          { encoding: "utf-8", timeout: 8e3 }
        ).trim();
        if (nixFound && fsMod.existsSync(nixFound)) {
          browserPath = nixFound;
        }
      } catch {
      }
    }
    if (!browserPath && isWindows) {
      const username = os.userInfo().username;
      const windowsPaths = [
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
        `C:\\Users\\${username}\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe`,
        "C:\\Program Files\\Chromium\\Application\\chromium.exe",
        `C:\\Users\\${username}\\AppData\\Local\\Chromium\\Application\\chrome.exe`
      ];
      for (const p of windowsPaths) {
        if (fsMod.existsSync(p)) {
          browserPath = p;
          break;
        }
      }
    }
    if (!browserPath) {
      try {
        const { executablePath } = await import("puppeteer");
        const ep = executablePath();
        if (ep && fsMod.existsSync(ep)) {
          browserPath = ep;
        }
      } catch {
      }
    }
    if (!browserPath) throw new Error("No Chrome/Chromium found. Set CHROME_PATH environment variable.");
    log(`Using browser: ${browserPath}`);
    fsMod.mkdirSync(CHROME_DATA_DIR, { recursive: true });
    fsMod.mkdirSync(TOKEN_DIR, { recursive: true });
    const browserArgs = [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--no-first-run",
      "--no-zygote",
      "--disable-extensions",
      "--disable-software-rasterizer",
      "--disable-features=VizDisplayCompositor",
      "--window-size=1280,800"
    ];
    connectionPhase = "awaiting_qr";
    let sessionConfirmedByEvent = false;
    let stabilisationComplete = false;
    client = await wpp.create({
      session: SESSION_NAME,
      folderNameToken: TOKEN_DIR,
      headless: true,
      devtools: false,
      useChrome: false,
      debug: false,
      logQR: false,
      autoClose: 0,
      disableWelcome: true,
      puppeteerOptions: {
        executablePath: browserPath,
        args: browserArgs,
        headless: true,
        userDataDir: CHROME_DATA_DIR
      },
      browserArgs,
      catchQR: (base64Qr) => {
        lastQrCode = base64Qr;
        status = "qr_ready";
        connectionPhase = "awaiting_qr";
        log("QR code generated \u2014 scan with WhatsApp");
      },
      statusFind: (statusSession, session) => {
        log(`Session "${session}": ${statusSession}`);
        if (statusSession === "qrReadSuccess") {
          connectionPhase = "qr_scanned";
          log("QR scanned \u2014 waiting for session to confirm");
        }
        if (statusSession === "inChat" || statusSession === "isLogged") {
          sessionConfirmedByEvent = true;
          if (connectionPhase !== "ready") {
            connectionPhase = "qr_scanned";
          }
          if (status === "disconnected" && !connecting) {
            status = "connected";
            clientReady = true;
            connectionPhase = "ready";
            log("WhatsApp reconnected natively from mobile");
          }
        }
        if (statusSession === "notLogged" || statusSession === "browserClose" || statusSession === "serverWssNotConnected" || statusSession === "disconnectedMobile" || statusSession === "desconnectedMobile" || statusSession === "deviceNotConnected") {
          status = "disconnected";
          clientReady = false;
          client = null;
          connectionPhase = "idle";
          connecting = false;
          log(`Session offline (${statusSession}) \u2014 will automatically retry/reconnect...`);
          scheduleAutoReconnect();
        }
      }
    });
    log("WPP client created \u2014 waiting for session to stabilize...");
    if (sessionConfirmedByEvent) {
      log("Session confirmed via statusFind \u2014 settling for 3s...");
      await new Promise((r) => setTimeout(r, 3e3));
    } else {
      await new Promise((r) => setTimeout(r, 8e3));
      if (!sessionConfirmedByEvent) {
        const alive = await isClientAlive();
        if (!alive) {
          log("Session not confirmed yet \u2014 retrying in 5s...");
          await new Promise((r) => setTimeout(r, 5e3));
          const retryAlive = await isClientAlive();
          if (!retryAlive && !sessionConfirmedByEvent) {
            throw new Error("WhatsApp session failed to stabilize \u2014 please scan the QR code again");
          }
        }
      }
    }
    stabilisationComplete = true;
    status = "connected";
    clientReady = true;
    connectionPhase = "ready";
    lastQrCode = null;
    connecting = false;
    log("\u2705 WhatsApp connected and ready");
    client.onMessage(async (message) => {
      log(`Msg from ${message.from}: ${(message.body || "").slice(0, 80)}`);
    });
  } catch (err) {
    lastError = err.message || String(err);
    status = "disconnected";
    clientReady = false;
    connecting = false;
    connectionPhase = "idle";
    log(`Connection failed: ${lastError}`);
  }
}
var whatsappService = {
  getStatus() {
    return { status, lastError, log: connectionLog.slice(0, 20), phase: connectionPhase };
  },
  getQrCode() {
    return lastQrCode;
  },
  async connect() {
    if (clientReady && status === "connected" && client) {
      const alive = await isClientAlive();
      if (alive) return { status: "connected" };
      log("Client was marked connected but is actually dead \u2014 reconnecting");
      clientReady = false;
      status = "disconnected";
      client = null;
    }
    if (connecting) {
      if (Date.now() - connectionStartTime > 6e4) {
        log("Connection starting phase seems stuck for over 60s. Forcing restart...");
        connecting = false;
      } else {
        log("Connection already in progress \u2014 ignored duplicate request");
        return { status };
      }
    }
    connecting = true;
    connectionStartTime = Date.now();
    connectionPhase = "starting";
    clientReady = false;
    if (client) {
      try {
        await client.close();
      } catch {
      }
      client = null;
    }
    await cleanupProcesses();
    log("Cleared previous session data");
    const wpp = await loadWppConnect();
    if (!wpp) {
      lastError = "@wppconnect-team/wppconnect package not installed";
      connecting = false;
      connectionPhase = "idle";
      return { status: "disconnected" };
    }
    status = "connecting";
    lastError = null;
    lastQrCode = null;
    log("Connecting\u2026");
    _connectBackground(wpp);
    return { status: "connecting" };
  },
  async disconnect() {
    if (autoReconnectTimer) {
      clearTimeout(autoReconnectTimer);
      autoReconnectTimer = null;
    }
    if (client) {
      try {
        await client.close();
      } catch {
      }
      client = null;
    }
    await cleanupProcesses();
    status = "disconnected";
    clientReady = false;
    lastQrCode = null;
    connecting = false;
    connectionPhase = "idle";
    pendingMessages = [];
    log("Disconnected (manual)");
  },
  async sendText(phone, text2, _attempt = 1) {
    if (!client || !clientReady || status !== "connected") {
      log(`Cannot send \u2014 not ready (status="${status}"). Queuing message for ${phone}`);
      pendingMessages.push({ phone, text: text2, timestamp: Date.now() });
      if (pendingMessages.length > 50) pendingMessages.shift();
      scheduleAutoReconnect();
      return false;
    }
    if (_attempt === 1) {
      const alive = await isClientAlive();
      if (!alive) {
        log("Client not alive when trying to send \u2014 queuing and reconnecting");
        clientReady = false;
        status = "disconnected";
        client = null;
        connectionPhase = "idle";
        pendingMessages.push({ phone, text: text2, timestamp: Date.now() });
        if (pendingMessages.length > 50) pendingMessages.shift();
        scheduleAutoReconnect();
        return false;
      }
    }
    try {
      const resolvedChatId = toChatId(phone);
      log(`Attempting to send message to resolved chatId: ${resolvedChatId}`);
      const result = await client.sendText(resolvedChatId, text2);
      log(`Message successfully sent to ${phone}`);
      console.log(`[WhatsApp Detailed Log] sendText result for ${phone}:`, JSON.stringify(result));
      return true;
    } catch (err) {
      const msg = typeof err === "object" ? err.message || JSON.stringify(err) : String(err);
      log(`Failed to send to ${phone}: ${msg}`);
      if ((msg.includes("WPP is not defined") || msg.includes("NotInitializedError")) && _attempt < 4) {
        log(`Retrying send (attempt ${_attempt + 1})\u2026`);
        await new Promise((r) => setTimeout(r, 2500 * _attempt));
        return this.sendText(phone, text2, _attempt + 1);
      }
      if (msg.includes("Execution context was destroyed") || msg.includes("Protocol error") || msg.includes("Session closed") || msg.includes("Target closed")) {
        log("Client browser crashed \u2014 marking as disconnected");
        clientReady = false;
        status = "disconnected";
        client = null;
        connectionPhase = "idle";
      }
      return false;
    }
  },
  async sendOrderNotification(order, storeName) {
    const itemLines = order.items.map((i, idx) => `  ${idx + 1}. ${i.name} x ${i.quantity} \u2014 ${Number(i.unitPrice).toFixed(2)}`).join("\n");
    const msg = [
      `\u{1F6D2} New Order ${order.orderNumber}`,
      storeName ? `Store: ${storeName}` : "",
      `\u{1F464} ${order.customerName}`,
      `\u{1F4DE} ${order.customerPhone}`,
      order.customerAddress ? `\u{1F4CD} ${order.customerAddress}` : "",
      ``,
      `Items:`,
      itemLines,
      ``,
      `Subtotal: ${Number(order.subtotal).toFixed(2)}`,
      order.deliveryFee && Number(order.deliveryFee) > 0 ? `Delivery: ${Number(order.deliveryFee).toFixed(2)}` : "",
      `Total: ${Number(order.totalAmount).toFixed(2)}`,
      ``,
      `Type: ${order.orderType === "delivery" ? "\u{1F69A} Delivery" : "\u{1F3EA} Pickup"}`,
      `Payment: ${order.paymentMethod}`,
      order.notes ? `Notes: ${order.notes}` : ""
    ].filter(Boolean).join("\n");
    return this.sendText(ADMIN_PHONE, msg);
  },
  async sendCustomerConfirmation(customerPhone, orderNumber, storeName, totalAmount) {
    const msg = [
      `\u2705 Order Confirmed \u2014 ${orderNumber}`,
      ``,
      `Thank you for ordering from ${storeName}!`,
      `Total: ${Number(totalAmount).toFixed(2)}`,
      ``,
      `We'll update you when your order is being prepared.`,
      `If you have questions, reply to this message.`
    ].join("\n");
    return this.sendText(customerPhone, msg);
  },
  async sendStatusUpdate(customerPhone, orderNumber, newStatus, storeName) {
    const statusText = {
      accepted: "\u2705 Your order has been accepted!",
      preparing: "\u{1F468}\u200D\u{1F373} Your order is being prepared\u2026",
      ready: "\u{1F389} Your order is ready for pickup/delivery!",
      delivered: "\u{1F680} Your order has been delivered. Enjoy!",
      cancelled: "\u274C Unfortunately your order has been cancelled."
    };
    const text2 = statusText[newStatus] || `Order status: ${newStatus}`;
    const msg = `${storeName} \u2014 Order ${orderNumber}

${text2}`;
    return this.sendText(customerPhone, msg);
  }
};

// server/routes.ts
import * as bcrypt3 from "bcrypt";
import * as crypto2 from "crypto";
import { addDays as addDays2, addMonths as addMonths2, addYears as addYears2 } from "date-fns";
import { OAuth2Client } from "google-auth-library";
var TIMESTAMP_FIELDS = [
  "createdAt",
  "updatedAt",
  "expiryDate",
  "expectedDate",
  "receivedDate",
  "startTime",
  "endTime",
  "startDate",
  "endDate",
  "nextBillingDate",
  "date",
  "lastRestocked",
  "completedAt",
  "processedAt"
];
function sanitizeDates(data) {
  const result = { ...data };
  for (const field of TIMESTAMP_FIELDS) {
    if (field in result) {
      if (result[field] === "" || result[field] === null || result[field] === void 0) {
        delete result[field];
      } else if (typeof result[field] === "string") {
        result[field] = new Date(result[field]);
      }
    }
  }
  return result;
}
var googleClient = new OAuth2Client("852311970344-8q8a01gm3jip4k9vooljk8ttjpd30802.apps.googleusercontent.com");
async function registerRoutes(app2) {
  app2.post("/api/admin/seed-pizza-lemon", async (_req, res) => {
    try {
      const { seedPizzaLemon: seedPizzaLemon2 } = await Promise.resolve().then(() => (init_seedPizzaLemon(), seedPizzaLemon_exports));
      await seedPizzaLemon2();
      res.json({ success: true, message: "Pizza Lemon store seeded (or already existed)." });
    } catch (e) {
      console.error("[SEED API] Error:", e);
      res.status(500).json({ success: false, error: e.message });
    }
  });
  app2.get("/api/admin/check-pizza-lemon", async (_req, res) => {
    try {
      const { db: db2 } = await Promise.resolve().then(() => (init_db(), db_exports));
      const { tenants: tenants2, licenseKeys: licenseKeys2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const { eq: eq5 } = await import("drizzle-orm");
      const [tenant] = await db2.select().from(tenants2).where(eq5(tenants2.ownerEmail, "admin@pizzalemon.ch"));
      if (!tenant) return res.json({ found: false, message: "Pizza Lemon not found in this database." });
      const licenses = await db2.select().from(licenseKeys2).where(eq5(licenseKeys2.tenantId, tenant.id));
      res.json({ found: true, tenantId: tenant.id, status: tenant.status, licenses: licenses.map((l) => ({ key: l.licenseKey, status: l.status })) });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/landing/subscribe", async (req, res) => {
    try {
      const {
        businessName,
        ownerName,
        ownerEmail,
        ownerPhone,
        planType,
        // monthly | yearly
        planName,
        // basic | advanced
        paymentMethodId,
        // Stripe PaymentMethod ID (preferred)
        stripeToken,
        // fallback: legacy token
        lang
      } = req.body;
      if (!businessName || !ownerName || !ownerEmail) {
        return res.status(400).json({ error: "Required fields are missing" });
      }
      const existing = await storage.getTenantByEmail(ownerEmail);
      if (existing) {
        return res.status(400).json({ error: "A store with this email already exists" });
      }
      let stripeChargeId = null;
      const isAdvanced = planName === "advanced";
      const isYearly = planType === "yearly";
      const priceChf = isYearly ? isAdvanced ? 4999 : 1999 : isAdvanced ? 499 : 199;
      const amountCents = priceChf * 100;
      if (paymentMethodId || stripeToken) {
        try {
          const stripeClient = await getUncachableStripeClient();
          if (paymentMethodId) {
            const pi = await stripeClient.paymentIntents.create({
              amount: amountCents,
              currency: "chf",
              payment_method: paymentMethodId,
              confirm: true,
              automatic_payment_methods: { enabled: true, allow_redirects: "never" },
              receipt_email: ownerEmail,
              description: `Barmagly ${planName} ${planType} \u2014 ${businessName}`,
              metadata: { businessName, ownerEmail, planName, planType }
            });
            if (pi.status === "requires_action") {
              return res.json({ requiresAction: true, clientSecret: pi.client_secret, paymentIntentId: pi.id });
            }
            if (pi.status !== "succeeded") {
              return res.status(402).json({ error: "Payment was not completed. Please try again." });
            }
            stripeChargeId = pi.id;
          } else if (stripeToken) {
            const charge = await stripeClient.charges.create({
              amount: amountCents,
              currency: "chf",
              source: stripeToken,
              receipt_email: ownerEmail,
              description: `Barmagly ${planName} ${planType} \u2014 ${businessName}`,
              metadata: { businessName, ownerEmail, planName, planType }
            });
            if (charge.status !== "succeeded") {
              return res.status(402).json({ error: "Payment failed. Please try again." });
            }
            stripeChargeId = charge.id;
          }
        } catch (stripeErr) {
          console.error("[SUBSCRIBE] Stripe error:", stripeErr.message);
          return res.status(402).json({ error: stripeErr.message || "Payment processing failed" });
        }
      }
      const tempPassword = "Bpos" + Math.floor(1e5 + Math.random() * 9e5);
      const passwordHash = await bcrypt3.hash(tempPassword, 10);
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
          signupDate: (/* @__PURE__ */ new Date()).toISOString(),
          paymentMethod: paymentMethodId || stripeToken ? "stripe" : "bank",
          stripeChargeId
        }
      });
      const startDate = /* @__PURE__ */ new Date();
      let endDate = /* @__PURE__ */ new Date();
      if (isYearly) {
        endDate = addYears2(startDate, 1);
      } else {
        endDate = addMonths2(startDate, 1);
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
        paymentMethod: stripeChargeId ? "stripe" : "bank"
      });
      const randomSegments = Array.from(
        { length: 4 },
        () => crypto2.randomBytes(2).toString("hex").toUpperCase()
      );
      const licenseKey = `BARMAGLY-${randomSegments.join("-")}`;
      await storage.createLicenseKey({
        licenseKey,
        tenantId: tenant.id,
        subscriptionId: subscription.id,
        status: "active",
        maxActivations: isAdvanced ? 10 : 3,
        expiresAt: endDate,
        notes: `Landing page subscription: ${planName} ${planType}`
      });
      await storage.createTenantNotification({
        tenantId: tenant.id,
        type: "info",
        title: "Welcome to Barmagly!",
        message: `Your account for ${businessName} is ready. Open the app and enter your license key to activate.`,
        priority: "normal"
      });
      sendLicenseKeyEmail({
        to: ownerEmail,
        ownerName,
        businessName,
        licenseKey,
        planName,
        planType,
        tempPassword,
        expiresAt: endDate
      }).then(() => {
        console.log(`[SUBSCRIBE] Email sent to ${ownerEmail}`);
      }).catch((emailErr) => {
        console.error("[SUBSCRIBE] Email send failed (non-fatal):", emailErr.message);
      });
      console.log(`[SUBSCRIBE] Tenant created: ${businessName} (ID: ${tenant.id}) | Stripe: ${stripeChargeId || "none"}`);
      res.json({
        success: true,
        tenantId: tenant.id,
        licenseKey,
        requiresAction: false
      });
    } catch (e) {
      console.error("[SUBSCRIBE] Error:", e);
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/landing/confirm-subscription", async (req, res) => {
    try {
      const { paymentIntentId, businessName, ownerName, ownerEmail, ownerPhone, planType, planName } = req.body;
      if (!paymentIntentId) return res.status(400).json({ error: "paymentIntentId required" });
      const stripeClient = await getUncachableStripeClient();
      const pi = await stripeClient.paymentIntents.retrieve(paymentIntentId);
      if (pi.status !== "succeeded") {
        return res.status(402).json({ error: "Payment not completed" });
      }
      const existingTenant = await storage.getTenantByEmail(ownerEmail);
      if (existingTenant) {
        const licenses = await storage.getLicenseKeys(existingTenant.id);
        const key = licenses[0]?.licenseKey || "";
        return res.json({ success: true, tenantId: existingTenant.id, licenseKey: key, requiresAction: false });
      }
      const isAdvanced = planName === "advanced";
      const isYearly = planType === "yearly";
      const priceChf = isYearly ? isAdvanced ? 4999 : 1999 : isAdvanced ? 499 : 199;
      const tempPassword = "Bpos" + Math.floor(1e5 + Math.random() * 9e5);
      const passwordHash = await bcrypt3.hash(tempPassword, 10);
      const tenant = await storage.createTenant({
        businessName,
        ownerName,
        ownerEmail,
        ownerPhone: ownerPhone || null,
        passwordHash,
        status: "active",
        maxBranches: isAdvanced ? 10 : 1,
        maxEmployees: isAdvanced ? 999 : 5,
        metadata: { stripeChargeId: paymentIntentId }
      });
      const startDate = /* @__PURE__ */ new Date();
      const endDate = isYearly ? addYears2(startDate, 1) : addMonths2(startDate, 1);
      const subscription = await storage.createTenantSubscription({
        tenantId: tenant.id,
        planType,
        planName: planName || "basic",
        price: String(priceChf) + ".00",
        status: "active",
        startDate,
        endDate,
        autoRenew: true,
        paymentMethod: "stripe"
      });
      const randomSegments = Array.from({ length: 4 }, () => crypto2.randomBytes(2).toString("hex").toUpperCase());
      const licenseKey = `BARMAGLY-${randomSegments.join("-")}`;
      await storage.createLicenseKey({
        licenseKey,
        tenantId: tenant.id,
        subscriptionId: subscription.id,
        status: "active",
        maxActivations: isAdvanced ? 10 : 3,
        expiresAt: endDate
      });
      sendLicenseKeyEmail({ to: ownerEmail, ownerName, businessName, licenseKey, planName, planType, tempPassword, expiresAt: endDate }).catch(() => {
      });
      res.json({ success: true, tenantId: tenant.id, licenseKey, requiresAction: false });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/auth/google", async (req, res) => {
    try {
      const { idToken, deviceId } = req.body;
      if (!idToken) return res.status(400).json({ error: "idToken is required" });
      const ticket = await googleClient.verifyIdToken({
        idToken
      });
      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        return res.status(400).json({ error: "Invalid Google token" });
      }
      const email = payload.email.toLowerCase();
      const name = payload.name || "Store Owner";
      let tenant = await storage.getTenantByEmail(email);
      let isNew = false;
      if (!tenant) {
        isNew = true;
        const tempPassword = "GAuth-" + crypto2.randomBytes(4).toString("hex");
        const passwordHash = await bcrypt3.hash(tempPassword, 10);
        tenant = await storage.createTenant({
          businessName: payload.name ? `${payload.name}'s Store` : "My New Store",
          ownerName: name,
          ownerEmail: email,
          passwordHash,
          status: "active",
          maxBranches: 1,
          maxEmployees: 5,
          metadata: { signupMethod: "google", signupDate: (/* @__PURE__ */ new Date()).toISOString() }
        });
        const startDate = /* @__PURE__ */ new Date();
        const endDate = addDays2(startDate, 14);
        const sub = await storage.createTenantSubscription({
          tenantId: tenant.id,
          planType: "trial",
          planName: "14-Day Free Trial",
          price: "0",
          status: "active",
          startDate,
          endDate,
          autoRenew: false
        });
        const randomSegments = Array.from(
          { length: 4 },
          () => crypto2.randomBytes(2).toString("hex").toUpperCase()
        );
        const licenseKey = `TRIAL-${randomSegments.join("-")}`;
        await storage.createLicenseKey({
          licenseKey,
          tenantId: tenant.id,
          subscriptionId: sub.id,
          status: "active",
          maxActivations: 3,
          expiresAt: endDate,
          notes: "Auto-generated Google Trial"
        });
        await storage.ensureTenantData(tenant.id);
      }
      const licenses = await storage.getLicenseKeys(tenant.id);
      const activeLicense = licenses.find((l) => l.status === "active" && (!l.expiresAt || new Date(l.expiresAt) > /* @__PURE__ */ new Date()));
      if (!activeLicense) {
        return res.status(403).json({ error: "No active license found for this account. Your trial may have expired." });
      }
      const employees2 = await storage.getEmployeesByTenant(tenant.id);
      const adminEmployee = employees2.find((e) => e.role === "admin" || e.email === email);
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
          permissions: adminEmployee.permissions
        } : null
      });
    } catch (e) {
      console.error("[GOOGLE AUTH] Error:", e);
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/tenant/onboarding-status", async (req, res) => {
    try {
      const tenantId = Number(req.query.tenantId);
      if (!tenantId) return res.status(400).json({ error: "tenantId is required" });
      const status2 = await storage.getOnboardingStatus(tenantId);
      res.json(status2);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/tenant/onboarding-complete", async (req, res) => {
    try {
      const { tenantId, businessName, ownerPhone, storeType, logo } = req.body;
      if (!tenantId) return res.status(400).json({ error: "tenantId is required" });
      await storage.updateTenant(tenantId, {
        businessName,
        ownerPhone,
        storeType,
        logo,
        setupCompleted: true
      });
      const config = await storage.getLandingPageConfig(tenantId);
      if (!config) {
        const { db: db2 } = await Promise.resolve().then(() => (init_db(), db_exports));
        const { landingPageConfig: landingConfig } = await Promise.resolve().then(() => (init_schema(), schema_exports));
        await db2.insert(landingConfig).values({
          tenantId,
          slug: businessName.toLowerCase().replace(/\s+/g, "-"),
          heroTitle: businessName,
          phone: ownerPhone,
          socialWhatsapp: ownerPhone
        });
      } else {
        const { db: db2 } = await Promise.resolve().then(() => (init_db(), db_exports));
        const { landingPageConfig: landingConfig } = await Promise.resolve().then(() => (init_schema(), schema_exports));
        const { eq: eq5 } = await import("drizzle-orm");
        await db2.update(landingConfig).set({
          heroTitle: businessName,
          phone: ownerPhone,
          socialWhatsapp: ownerPhone
        }).where(eq5(landingConfig.tenantId, tenantId));
      }
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/license/validate", async (req, res) => {
    try {
      const { licenseKey, email, password, deviceId } = req.body;
      if (process.env.NODE_ENV !== "production") console.log("[VALIDATE] Incoming request details:", { licenseKey, email: email ? email.substring(0, 2) + "***" : void 0, deviceId });
      if (!licenseKey) {
        return res.json({ isValid: false, reason: "License key is required" });
      }
      const license = await storage.getLicenseByKey(licenseKey);
      if (process.env.NODE_ENV !== "production") console.log("[VALIDATE] getLicenseByKey result for", licenseKey, ":", !!license);
      if (!license) {
        return res.json({ isValid: false, reason: "Invalid license key" });
      }
      if (license.status !== "active") {
        return res.json({ isValid: false, reason: `License is ${license.status}` });
      }
      if (license.expiresAt && new Date(license.expiresAt) < /* @__PURE__ */ new Date()) {
        return res.json({ isValid: false, reason: "License has expired" });
      }
      const tenant = await storage.getTenant(license.tenantId);
      if (!tenant) {
        return res.json({ isValid: false, reason: "Tenant not found" });
      }
      if (tenant.status !== "active") {
        return res.json({ isValid: false, reason: `Store account is ${tenant.status}` });
      }
      if (email) {
        if (tenant.ownerEmail.toLowerCase() !== email.toLowerCase()) {
          return res.json({ isValid: false, reason: "Email does not match this license" });
        }
        if (password) {
          if (!tenant.passwordHash) {
            return res.json({ isValid: false, reason: "Account credentials not configured" });
          }
          const passwordValid = await bcrypt3.compare(password, tenant.passwordHash);
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
      const activeSub = subs.find((s) => s.status === "active");
      await storage.updateLicenseKey(license.id, {
        lastValidatedAt: /* @__PURE__ */ new Date(),
        deviceInfo: deviceId || license.deviceInfo,
        currentActivations: (license.currentActivations || 0) + (isNewActivation ? 1 : 0)
      });
      const subInfo = activeSub ? {
        active: true,
        plan: activeSub.planName,
        daysRemaining: activeSub.endDate ? Math.max(0, Math.ceil((new Date(activeSub.endDate).getTime() - Date.now()) / (1e3 * 60 * 60 * 24))) : 365,
        requiresUpgrade: false
      } : {
        active: false,
        plan: "No active plan",
        daysRemaining: 0,
        requiresUpgrade: true
      };
      res.json({
        isValid: true,
        tenant: {
          id: tenant.id,
          name: tenant.businessName,
          logo: tenant.logo,
          storeType: tenant.storeType
        },
        subscription: subInfo
      });
    } catch (e) {
      console.error("License validation error:", e);
      res.status(500).json({ isValid: false, reason: "Server error during validation" });
    }
  });
  app2.get("/api/dashboard", async (req, res) => {
    try {
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : void 0;
      if (!tenantId) return res.status(400).json({ error: "tenantId is required" });
      const stats = await storage.getDashboardStats(tenantId);
      res.json(stats);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/dashboard/multi-branch", async (req, res) => {
    try {
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : void 0;
      if (!tenantId) return res.status(400).json({ error: "tenantId is required" });
      const allBranches = await storage.getBranchesByTenant(tenantId);
      const allEmployees = await storage.getEmployeesByTenant(tenantId);
      const allInventory = await storage.getInventory(void 0, tenantId);
      const allSales = await storage.getSales({ tenantId });
      const allShifts = await storage.getShifts(tenantId);
      const allProducts = await storage.getProductsByTenant(tenantId);
      const allCategories = await storage.getCategories(tenantId);
      const allCustomers = await storage.getCustomers(void 0, tenantId);
      const todayStart = /* @__PURE__ */ new Date();
      todayStart.setHours(0, 0, 0, 0);
      const weekStart = /* @__PURE__ */ new Date();
      weekStart.setDate(weekStart.getDate() - 7);
      weekStart.setHours(0, 0, 0, 0);
      const monthStart = /* @__PURE__ */ new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const branchStats = allBranches.map((branch) => {
        const branchSales = allSales.filter((s) => s.branchId === branch.id);
        const branchEmployees = allEmployees.filter((e) => e.branchId === branch.id);
        const branchInventory = allInventory.filter((i) => i.branchId === branch.id);
        const activeShifts = allShifts.filter((s) => s.branchId === branch.id && s.status === "open");
        const todaySales = branchSales.filter((s) => s.createdAt && new Date(s.createdAt) >= todayStart);
        const weekSales = branchSales.filter((s) => s.createdAt && new Date(s.createdAt) >= weekStart);
        const monthSales = branchSales.filter((s) => s.createdAt && new Date(s.createdAt) >= monthStart);
        const todayRevenue = todaySales.reduce((sum2, s) => sum2 + Number(s.totalAmount || 0), 0);
        const weekRevenue = weekSales.reduce((sum2, s) => sum2 + Number(s.totalAmount || 0), 0);
        const monthRevenue = monthSales.reduce((sum2, s) => sum2 + Number(s.totalAmount || 0), 0);
        const totalRevenue2 = branchSales.reduce((sum2, s) => sum2 + Number(s.totalAmount || 0), 0);
        const lowStockItems = branchInventory.filter((i) => (i.quantity || 0) <= (i.lowStockThreshold || 10));
        const outOfStockItems = branchInventory.filter((i) => (i.quantity || 0) === 0);
        const paymentBreakdown = {};
        branchSales.forEach((s) => {
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
          totalRevenue: totalRevenue2,
          todaySalesCount: todaySales.length,
          totalSalesCount: branchSales.length,
          employeeCount: branchEmployees.length,
          activeEmployees: branchEmployees.filter((e) => e.isActive).length,
          activeShifts: activeShifts.length,
          inventoryCount: branchInventory.length,
          lowStockCount: lowStockItems.length,
          outOfStockCount: outOfStockItems.length,
          paymentBreakdown
        };
      });
      const totalRevenue = allSales.reduce((sum2, s) => sum2 + Number(s.totalAmount || 0), 0);
      const todayTotalRevenue = allSales.filter((s) => s.createdAt && new Date(s.createdAt) >= todayStart).reduce((sum2, s) => sum2 + Number(s.totalAmount || 0), 0);
      const monthTotalRevenue = allSales.filter((s) => s.createdAt && new Date(s.createdAt) >= monthStart).reduce((sum2, s) => sum2 + Number(s.totalAmount || 0), 0);
      res.json({
        summary: {
          totalBranches: allBranches.length,
          activeBranches: allBranches.filter((b) => b.isActive).length,
          totalEmployees: allEmployees.length,
          totalProducts: allProducts.length,
          totalCategories: allCategories.length,
          totalCustomers: allCustomers.length,
          totalSales: allSales.length,
          totalRevenue,
          todayRevenue: todayTotalRevenue,
          monthRevenue: monthTotalRevenue,
          activeShifts: allShifts.filter((s) => s.status === "open").length
        },
        branches: branchStats
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/dashboard/subscriptions", async (_req, res) => {
    try {
      const tenantSubs = await storage.getTenantSubscriptions();
      const tenants2 = await storage.getTenants();
      const licenses = await storage.getLicenseKeys();
      const subsWithTenant = tenantSubs.map((sub) => {
        const tenant = tenants2.find((t) => t.id === sub.tenantId);
        const tenantLicenses = licenses.filter((l) => l.tenantId === sub.tenantId);
        return {
          ...sub,
          tenantName: tenant?.businessName || "Unknown",
          tenantEmail: tenant?.ownerEmail || "",
          tenantStatus: tenant?.status || "unknown",
          licenseCount: tenantLicenses.length,
          activeLicenses: tenantLicenses.filter((l) => l.status === "active").length
        };
      });
      res.json({
        subscriptions: subsWithTenant,
        summary: {
          total: tenantSubs.length,
          active: tenantSubs.filter((s) => s.status === "active").length,
          trial: tenantSubs.filter((s) => s.planType === "trial").length,
          monthly: tenantSubs.filter((s) => s.planType === "monthly").length,
          yearly: tenantSubs.filter((s) => s.planType === "yearly").length,
          expiringSoon: tenantSubs.filter((s) => {
            if (!s.endDate) return false;
            const daysLeft = Math.ceil((new Date(s.endDate).getTime() - Date.now()) / (1e3 * 60 * 60 * 24));
            return daysLeft > 0 && daysLeft <= 7;
          }).length,
          totalMRR: tenantSubs.filter((s) => s.status === "active" && s.planType === "monthly").reduce((sum2, s) => sum2 + Number(s.price || 0), 0)
        }
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/branches", async (req, res) => {
    try {
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : void 0;
      if (!tenantId) return res.status(400).json({ error: "tenantId is required" });
      res.json(await storage.getBranchesByTenant(tenantId));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/branches", async (req, res) => {
    try {
      res.json(await storage.createBranch(sanitizeDates(req.body)));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.put("/api/branches/:id", async (req, res) => {
    try {
      res.json(await storage.updateBranch(Number(req.params.id), sanitizeDates(req.body)));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.delete("/api/branches/:id", async (req, res) => {
    try {
      await storage.deleteBranch(Number(req.params.id));
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/employees", async (req, res) => {
    try {
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : void 0;
      if (!tenantId) return res.status(400).json({ error: "tenantId is required" });
      const emps = await storage.getEmployeesByTenant(tenantId);
      res.json(emps);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/employees/:id", async (req, res) => {
    try {
      const emp = await storage.getEmployee(Number(req.params.id));
      if (!emp) return res.status(404).json({ error: "Employee not found" });
      res.json(emp);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/employees", async (req, res) => {
    try {
      res.json(await storage.createEmployee(sanitizeDates(req.body)));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.put("/api/employees/:id", async (req, res) => {
    try {
      res.json(await storage.updateEmployee(Number(req.params.id), sanitizeDates(req.body)));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.delete("/api/employees/:id", async (req, res) => {
    try {
      await storage.deleteEmployee(Number(req.params.id));
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/employees/login", async (req, res) => {
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
      await storage.createActivityLog({
        employeeId: emp.id,
        action: "login",
        entityType: "employee",
        entityId: emp.id,
        details: `${emp.name} logged in`
      });
      res.json(emp);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/categories", async (req, res) => {
    try {
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : void 0;
      if (!tenantId) return res.status(400).json({ error: "tenantId is required" });
      const categories2 = await storage.getCategories(tenantId);
      res.json(sortCategoriesByPriority(categories2));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/categories", async (req, res) => {
    try {
      const c = await storage.createCategory(sanitizeDates(req.body));
      callerIdService.broadcast({ type: "menu_updated" }, req.tenantId);
      res.json(c);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.put("/api/categories/:id", async (req, res) => {
    try {
      const c = await storage.updateCategory(Number(req.params.id), sanitizeDates(req.body));
      callerIdService.broadcast({ type: "menu_updated" }, req.tenantId);
      res.json(c);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.delete("/api/categories/:id", async (req, res) => {
    try {
      const c = await storage.getCategory(Number(req.params.id));
      await storage.deleteCategory(Number(req.params.id));
      if (c) callerIdService.broadcast({ type: "menu_updated" }, req.tenantId);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/products", async (req, res) => {
    try {
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : void 0;
      const search = req.query.search;
      if (!tenantId) return res.status(400).json({ error: "tenantId is required" });
      res.json(await storage.getProductsByTenant(tenantId, search));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/products/template", (req, res) => {
    const templateData = [
      { Name: "Sample Product 1", Price: "9.99", CostPrice: "5.00", SKU: "SKU001", Barcode: "1234567890", Unit: "piece", NameArabic: "\u0645\u0646\u062A\u062C 1" },
      { Name: "Sample Product 2", Price: "15.50", CostPrice: "8.00", SKU: "SKU002", Barcode: "0987654321", Unit: "kg", NameArabic: "\u0645\u0646\u062A\u062C 2" }
    ];
    const ws = xlsx.utils.json_to_sheet(templateData);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Products");
    const buf = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });
    res.setHeader("Content-Disposition", "attachment; filename=products_template.xlsx");
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buf);
  });
  app2.post("/api/products/import", async (req, res) => {
    try {
      const { fileBase64, tenantId, branchId } = req.body;
      const buffer = Buffer.from(fileBase64, "base64");
      const workbook = xlsx.read(buffer, { type: "buffer" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = xlsx.utils.sheet_to_json(sheet);
      const productsToInsert = data.map((item) => ({
        tenantId: Number(tenantId),
        name: item.Name || item.name,
        nameAr: item.NameArabic || item.name_ar,
        sku: item.SKU || item.sku || void 0,
        barcode: String(item.Barcode || item.barcode || ""),
        price: String(item.Price || item.price || "0"),
        costPrice: String(item.CostPrice || item.cost_price || "0"),
        unit: item.Unit || item.unit || "piece",
        isActive: true
      }));
      const results = await storage.bulkCreateProducts(productsToInsert);
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
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/products/:id", async (req, res) => {
    try {
      const prod = await storage.getProduct(Number(req.params.id));
      if (!prod) return res.status(404).json({ error: "Product not found" });
      res.json(prod);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/products/barcode/:barcode", async (req, res) => {
    try {
      const prod = await storage.getProductByBarcode(req.params.barcode);
      if (!prod) return res.status(404).json({ error: "Product not found" });
      res.json(prod);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/products", async (req, res) => {
    try {
      const body = sanitizeDates(req.body);
      if (body.isAddon) body.price = "0";
      const p = await storage.createProduct(body);
      callerIdService.broadcast({ type: "menu_updated" }, req.tenantId);
      res.json(p);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.put("/api/products/:id", async (req, res) => {
    try {
      const body = sanitizeDates(req.body);
      if (body.isAddon) body.price = "0";
      const p = await storage.updateProduct(Number(req.params.id), body);
      callerIdService.broadcast({ type: "menu_updated" }, req.tenantId);
      res.json(p);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.delete("/api/products/:id", async (req, res) => {
    try {
      const p = await storage.getProduct(Number(req.params.id));
      await storage.deleteProduct(Number(req.params.id));
      if (p) callerIdService.broadcast({ type: "menu_updated" }, req.tenantId);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/inventory", async (req, res) => {
    try {
      const branchId = req.query.branchId ? Number(req.query.branchId) : void 0;
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : void 0;
      res.json(await storage.getInventory(branchId, tenantId));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/inventory", async (req, res) => {
    try {
      res.json(await storage.upsertInventory(sanitizeDates(req.body)));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/inventory/adjust", async (req, res) => {
    try {
      const { productId, branchId, adjustment } = req.body;
      res.json(await storage.adjustInventory(productId, branchId, adjustment));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/inventory/low-stock", async (req, res) => {
    try {
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : void 0;
      const branchId = req.query.branchId ? Number(req.query.branchId) : void 0;
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
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/customers", async (req, res) => {
    try {
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : void 0;
      if (!tenantId) return res.status(400).json({ error: "tenantId is required" });
      const limit = req.query.limit ? Math.min(Number(req.query.limit), 200) : 50;
      const offset = req.query.offset ? Number(req.query.offset) : 0;
      res.json(await storage.getCustomers(req.query.search, tenantId, limit, offset));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/customers/count", async (req, res) => {
    try {
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : void 0;
      const search = req.query.search;
      res.json({ count: await storage.getCustomerCount(search, tenantId) });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/customers/template", (req, res) => {
    const templateData = [
      { Name: "John Doe", Phone: "+41791234567", Email: "john@example.com", Address: "123 Main St" },
      { Name: "Jane Smith", Phone: "+41799876543", Email: "jane@example.com", Address: "456 Elm Ave" }
    ];
    const ws = xlsx.utils.json_to_sheet(templateData);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Customers");
    const buf = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });
    res.setHeader("Content-Disposition", "attachment; filename=customers_template.xlsx");
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buf);
  });
  app2.get("/api/customers/export", async (req, res) => {
    try {
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : void 0;
      const customers2 = await storage.getCustomers(void 0, tenantId);
      const exportData = customers2.map((c) => ({
        Name: c.name || "",
        Phone: c.phone || "",
        Email: c.email || "",
        Address: c.address || "",
        LoyaltyPoints: c.loyaltyPoints || 0,
        TotalPurchases: c.totalPurchases || 0,
        CreatedAt: c.createdAt ? new Date(c.createdAt).toLocaleDateString() : ""
      }));
      const ws = xlsx.utils.json_to_sheet(exportData);
      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, "Customers");
      const buf = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });
      res.setHeader("Content-Disposition", "attachment; filename=customers_export.xlsx");
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.send(buf);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/customers/phone-lookup", async (req, res) => {
    try {
      const phone = req.query.phone;
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : void 0;
      if (!phone) return res.status(400).json({ error: "phone is required" });
      if (!tenantId) return res.status(400).json({ error: "tenantId is required" });
      const results = await storage.findCustomerByPhone(phone, tenantId);
      res.json(results);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/customers/import", async (req, res) => {
    try {
      const { fileBase64, tenantId } = req.body;
      if (!fileBase64) return res.status(400).json({ error: "fileBase64 is required" });
      const buffer = Buffer.from(fileBase64, "base64");
      const workbook = xlsx.read(buffer, { type: "buffer" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = xlsx.utils.sheet_to_json(sheet);
      const customersToInsert = data.map((item) => ({
        name: item.Name || item.name || "",
        email: item.Email || item.email || void 0,
        phone: String(item.Phone || item.phone || ""),
        address: item.Address || item.address || void 0,
        tenantId: tenantId ? Number(tenantId) : void 0,
        isActive: true
      })).filter((c) => c.name);
      const results = await storage.bulkCreateCustomers(customersToInsert);
      res.json({ success: true, count: results.length });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/customers/:id", async (req, res) => {
    try {
      const cust = await storage.getCustomer(Number(req.params.id));
      if (!cust) return res.status(404).json({ error: "Customer not found" });
      res.json(cust);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/customers", async (req, res) => {
    try {
      res.json(await storage.createCustomer(sanitizeDates(req.body)));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.put("/api/customers/:id", async (req, res) => {
    try {
      res.json(await storage.updateCustomer(Number(req.params.id), sanitizeDates(req.body)));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.delete("/api/customers/:id", async (req, res) => {
    try {
      await storage.deleteCustomer(Number(req.params.id));
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/customers/:id/loyalty", async (req, res) => {
    try {
      res.json(await storage.addLoyaltyPoints(Number(req.params.id), req.body.points));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/customers/:id/sales", async (req, res) => {
    try {
      res.json(await storage.getCustomerSales(Number(req.params.id)));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/calls", async (req, res) => {
    try {
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : void 0;
      const limit = req.query.limit ? Number(req.query.limit) : 50;
      const calls2 = await storage.getCalls(tenantId, limit);
      res.json(calls2);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/sales", async (req, res) => {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : void 0;
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : void 0;
      const branchId = req.query.branchId ? Number(req.query.branchId) : void 0;
      res.json(await storage.getSales({ limit, tenantId, branchId }));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/sales/:id", async (req, res) => {
    try {
      const sale = await storage.getSale(Number(req.params.id));
      if (!sale) return res.status(404).json({ error: "Sale not found" });
      const items = await storage.getSaleItems(sale.id);
      res.json({ ...sale, items });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/sales", async (req, res) => {
    try {
      const { items, ...saleData } = sanitizeDates(req.body);
      const receiptNumber = `RCP-${Date.now()}-${Math.floor(Math.random() * 1e3)}`;
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
              employeeId: saleData.employeeId
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
            totalSpent: String(Number(existingCustomer.totalSpent || 0) + Number(saleData.totalAmount))
          });
        }
      }
      if (req.body.callId) {
        await storage.updateCall(Number(req.body.callId), { saleId: sale.id, status: "answered" });
      }
      await storage.createActivityLog({
        employeeId: saleData.employeeId,
        action: "sale_created",
        entityType: "sale",
        entityId: sale.id,
        details: `Sale ${sale.receiptNumber} completed for $${saleData.totalAmount}`
      });
      if (saleData.employeeId) {
        const emp = await storage.getEmployee(saleData.employeeId);
        if (emp && Number(emp.commissionRate || 0) > 0) {
          const commRate = Number(emp.commissionRate);
          const commAmount = Number(saleData.totalAmount) * (commRate / 100);
          await storage.createEmployeeCommission({
            employeeId: saleData.employeeId,
            saleId: sale.id,
            commissionRate: String(commRate),
            commissionAmount: String(commAmount.toFixed(2))
          });
        }
      }
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
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/suppliers", async (req, res) => {
    try {
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : void 0;
      res.json(await storage.getSuppliers(tenantId));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/suppliers/:id", async (req, res) => {
    try {
      const sup = await storage.getSupplier(Number(req.params.id));
      if (!sup) return res.status(404).json({ error: "Supplier not found" });
      res.json(sup);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/suppliers", async (req, res) => {
    try {
      res.json(await storage.createSupplier(sanitizeDates(req.body)));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.put("/api/suppliers/:id", async (req, res) => {
    try {
      res.json(await storage.updateSupplier(Number(req.params.id), sanitizeDates(req.body)));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/purchase-orders", async (req, res) => {
    try {
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : void 0;
      res.json(await storage.getPurchaseOrders(tenantId));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/purchase-orders", async (req, res) => {
    try {
      res.json(await storage.createPurchaseOrder(sanitizeDates(req.body)));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.put("/api/purchase-orders/:id", async (req, res) => {
    try {
      res.json(await storage.updatePurchaseOrder(Number(req.params.id), sanitizeDates(req.body)));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/shifts", async (req, res) => {
    try {
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : void 0;
      res.json(await storage.getShifts(tenantId));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/shifts/stats", async (req, res) => {
    try {
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : void 0;
      if (!tenantId) return res.status(400).json({ error: "tenantId is required" });
      res.json(await storage.getShiftStats(tenantId));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/shifts/active", async (req, res) => {
    try {
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : void 0;
      if (!tenantId) return res.status(400).json({ error: "tenantId is required" });
      res.json(await storage.getAllActiveShifts(tenantId));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/shifts", async (req, res) => {
    try {
      const shift = await storage.createShift(sanitizeDates(req.body));
      const emp = await storage.getEmployee(shift.employeeId);
      await storage.createActivityLog({
        employeeId: shift.employeeId,
        action: "shift_started",
        entityType: "shift",
        entityId: shift.id,
        details: `Shift started by ${emp?.name || "Unknown"} with $${shift.openingCash || 0} opening cash`
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
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.put("/api/shifts/:id", async (req, res) => {
    try {
      const shift = await storage.updateShift(Number(req.params.id), sanitizeDates(req.body));
      res.json(shift);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.put("/api/shifts/:id/close", async (req, res) => {
    try {
      const shift = await storage.closeShift(Number(req.params.id), sanitizeDates(req.body));
      const emp = await storage.getEmployee(shift.employeeId);
      await storage.createActivityLog({
        employeeId: shift.employeeId,
        action: "shift_closed",
        entityType: "shift",
        entityId: shift.id,
        details: `Shift closed with ${shift.totalTransactions || 0} transactions and $${shift.closingCash || 0} closing cash`
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
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/notifications/:employeeId", async (req, res) => {
    try {
      res.json(await storage.getNotifications(Number(req.params.employeeId)));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/notifications/:employeeId/unread-count", async (req, res) => {
    try {
      res.json({ count: await storage.getUnreadNotificationCount(Number(req.params.employeeId)) });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/notifications", async (req, res) => {
    try {
      res.json(await storage.createNotification(sanitizeDates(req.body)));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.put("/api/notifications/:id/read", async (req, res) => {
    try {
      res.json(await storage.markNotificationRead(Number(req.params.id)));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.put("/api/notifications/:employeeId/read-all", async (req, res) => {
    try {
      await storage.markAllNotificationsRead(Number(req.params.employeeId));
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/expenses", async (req, res) => {
    try {
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : void 0;
      res.json(await storage.getExpenses(tenantId));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/expenses", async (req, res) => {
    try {
      res.json(await storage.createExpense(sanitizeDates(req.body)));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/tables", async (req, res) => {
    try {
      res.json(await storage.getTables(req.query.branchId ? Number(req.query.branchId) : void 0));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/tables", async (req, res) => {
    try {
      res.json(await storage.createTable(sanitizeDates(req.body)));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.put("/api/tables/:id", async (req, res) => {
    try {
      res.json(await storage.updateTable(Number(req.params.id), sanitizeDates(req.body)));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/kitchen-orders", async (req, res) => {
    try {
      res.json(await storage.getKitchenOrders(req.query.branchId ? Number(req.query.branchId) : void 0));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/kitchen-orders", async (req, res) => {
    try {
      res.json(await storage.createKitchenOrder(sanitizeDates(req.body)));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.put("/api/kitchen-orders/:id", async (req, res) => {
    try {
      res.json(await storage.updateKitchenOrder(Number(req.params.id), sanitizeDates(req.body)));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/subscription-plans", async (_req, res) => {
    try {
      res.json(await storage.getSubscriptionPlans());
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/subscription-plans", async (req, res) => {
    try {
      res.json(await storage.createSubscriptionPlan(sanitizeDates(req.body)));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/subscriptions", async (_req, res) => {
    try {
      res.json(await storage.getSubscriptions());
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/subscriptions", async (req, res) => {
    try {
      res.json(await storage.createSubscription(sanitizeDates(req.body)));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.delete("/api/expenses/:id", async (req, res) => {
    try {
      await storage.deleteExpense(Number(req.params.id));
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/purchase-orders/:id", async (req, res) => {
    try {
      const po = await storage.getPurchaseOrder(Number(req.params.id));
      if (!po) return res.status(404).json({ error: "Purchase order not found" });
      const items = await storage.getPurchaseOrderItems(po.id);
      res.json({ ...po, items });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/purchase-orders/:id/items", async (req, res) => {
    try {
      const item = await storage.createPurchaseOrderItem({ ...sanitizeDates(req.body), purchaseOrderId: Number(req.params.id) });
      res.json(item);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/purchase-orders/:id/receive", async (req, res) => {
    try {
      const result = await storage.receivePurchaseOrder(Number(req.params.id), req.body.items);
      if (!result) return res.status(404).json({ error: "Purchase order not found" });
      res.json(result);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/employees/:id/shifts", async (req, res) => {
    try {
      res.json(await storage.getEmployeeAttendance(Number(req.params.id)));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/analytics/top-products", async (req, res) => {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : void 0;
      res.json(await storage.getTopProducts(limit));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/analytics/sales-by-payment", async (_req, res) => {
    try {
      res.json(await storage.getSalesByPaymentMethod());
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/analytics/sales-range", async (req, res) => {
    try {
      const startDate = req.query.startDate ? new Date(req.query.startDate) : /* @__PURE__ */ new Date(0);
      const endDate = req.query.endDate ? new Date(req.query.endDate) : /* @__PURE__ */ new Date();
      res.json(await storage.getSalesByDateRange(startDate, endDate));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/seed", async (_req, res) => {
    try {
      const seeded = await storage.seedInitialData();
      if (!seeded) return res.json({ message: "Data already seeded" });
      res.json({ message: "Seed data created successfully" });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/fix-schema-and-seed", async (_req, res) => {
    try {
      const { db: db2 } = await Promise.resolve().then(() => (init_db(), db_exports));
      const { sql: sql5 } = await import("drizzle-orm");
      console.log("[API-SEED] Fixing schema...");
      const tables2 = ["branches", "products", "employees", "sales", "inventory", "customers", "suppliers"];
      for (const table of tables2) {
        try {
          await db2.execute(sql5.raw(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS tenant_id integer`));
          console.log(`[API-SEED] Table ${table} fixed`);
        } catch (e) {
          console.log(`[API-SEED] Table ${table} skip: ${e.message}`);
        }
      }
      const { seedAllDemoData: seedAllDemoData2 } = await Promise.resolve().then(() => (init_seedAllDemoData(), seedAllDemoData_exports));
      await seedAllDemoData2();
      res.json({ success: true, message: "Schema fixed and comprehensive demo data seeded." });
    } catch (e) {
      console.error("Manual fix & seed error:", e);
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/force-full-seed", async (_req, res) => {
    try {
      const { seedAllDemoData: seedAllDemoData2 } = await Promise.resolve().then(() => (init_seedAllDemoData(), seedAllDemoData_exports));
      await seedAllDemoData2();
      res.json({ success: true, message: "Comprehensive demo data seeded successfully" });
    } catch (e) {
      console.error("Manual seed error:", e);
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/activity-log", async (req, res) => {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : void 0;
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : void 0;
      res.json(await storage.getActivityLog(limit, tenantId));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/returns", async (req, res) => {
    try {
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : void 0;
      res.json(await storage.getReturns(tenantId));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/returns/:id", async (req, res) => {
    try {
      const ret = await storage.getReturn(Number(req.params.id));
      if (!ret) return res.status(404).json({ error: "Return not found" });
      const items = await storage.getReturnItems(ret.id);
      res.json({ ...ret, items });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/returns", async (req, res) => {
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
              employeeId: returnData.employeeId
            });
          }
        }
      }
      if (returnData.originalSaleId) {
        await storage.updateSale(returnData.originalSaleId, { status: "refunded" });
      }
      await storage.createActivityLog({
        employeeId: returnData.employeeId,
        action: "return_created",
        entityType: "return",
        entityId: ret.id,
        details: `Return/refund processed for sale #${returnData.originalSaleId}, amount: $${returnData.totalAmount}`
      });
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
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/cash-drawer/:shiftId", async (req, res) => {
    try {
      res.json(await storage.getCashDrawerOperations(Number(req.params.shiftId)));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/cash-drawer", async (req, res) => {
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
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/warehouses", async (req, res) => {
    try {
      const branchId = req.query.branchId ? Number(req.query.branchId) : void 0;
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : void 0;
      res.json(await storage.getWarehouses(branchId, tenantId));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/warehouses", async (req, res) => {
    try {
      res.json(await storage.createWarehouse(sanitizeDates(req.body)));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.put("/api/warehouses/:id", async (req, res) => {
    try {
      res.json(await storage.updateWarehouse(Number(req.params.id), sanitizeDates(req.body)));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/warehouse-transfers", async (_req, res) => {
    try {
      res.json(await storage.getWarehouseTransfers());
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/warehouse-transfers", async (req, res) => {
    try {
      const transfer = await storage.createWarehouseTransfer(sanitizeDates(req.body));
      await storage.createInventoryMovement({ productId: req.body.productId, branchId: null, type: "transfer", quantity: req.body.quantity, referenceType: "transfer", referenceId: transfer.id, employeeId: req.body.employeeId, notes: `Transfer from warehouse ${req.body.fromWarehouseId} to ${req.body.toWarehouseId}` });
      res.json(transfer);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/product-batches", async (req, res) => {
    try {
      const productId = req.query.productId ? Number(req.query.productId) : void 0;
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : void 0;
      res.json(await storage.getProductBatches(productId, tenantId));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/product-batches", async (req, res) => {
    try {
      res.json(await storage.createProductBatch(sanitizeDates(req.body)));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.put("/api/product-batches/:id", async (req, res) => {
    try {
      res.json(await storage.updateProductBatch(Number(req.params.id), sanitizeDates(req.body)));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.delete("/api/product-batches/:id", async (req, res) => {
    try {
      res.json(await storage.updateProductBatch(Number(req.params.id), { isActive: false }));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/inventory-movements", async (req, res) => {
    try {
      const productId = req.query.productId ? Number(req.query.productId) : void 0;
      const limit = req.query.limit ? Number(req.query.limit) : void 0;
      res.json(await storage.getInventoryMovements(productId, limit));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/stock-counts", async (_req, res) => {
    try {
      res.json(await storage.getStockCounts());
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/stock-counts/:id", async (req, res) => {
    try {
      const sc = await storage.getStockCount(Number(req.params.id));
      if (!sc) return res.status(404).json({ error: "Stock count not found" });
      const items = await storage.getStockCountItems(sc.id);
      res.json({ ...sc, items });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/stock-counts", async (req, res) => {
    try {
      const { items, ...countData } = sanitizeDates(req.body);
      const sc = await storage.createStockCount(countData);
      if (items && items.length > 0) {
        for (const item of items) {
          await storage.createStockCountItem({ ...item, stockCountId: sc.id });
        }
      }
      res.json(sc);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.put("/api/stock-counts/:id/approve", async (req, res) => {
    try {
      const sc = await storage.updateStockCount(Number(req.params.id), { status: "approved", approvedBy: req.body.approvedBy });
      const items = await storage.getStockCountItems(sc.id);
      for (const item of items) {
        if (item.actualQuantity !== null && item.difference !== null && item.difference !== 0) {
          await storage.adjustInventory(item.productId, sc.branchId, item.difference);
          await storage.createInventoryMovement({ productId: item.productId, branchId: sc.branchId, type: "count", quantity: item.difference, referenceType: "manual", referenceId: sc.id, notes: `Stock count adjustment: system ${item.systemQuantity} \u2192 actual ${item.actualQuantity}` });
        }
      }
      await storage.createActivityLog({ employeeId: req.body.approvedBy, action: "stock_count_approved", entityType: "stock_count", entityId: sc.id, details: `Stock count #${sc.id} approved with ${sc.discrepancies || 0} discrepancies` });
      res.json(sc);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/supplier-contracts", async (req, res) => {
    try {
      res.json(await storage.getSupplierContracts(req.query.supplierId ? Number(req.query.supplierId) : void 0));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/supplier-contracts", async (req, res) => {
    try {
      res.json(await storage.createSupplierContract(sanitizeDates(req.body)));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.put("/api/supplier-contracts/:id", async (req, res) => {
    try {
      res.json(await storage.updateSupplierContract(Number(req.params.id), sanitizeDates(req.body)));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/employee-commissions", async (req, res) => {
    try {
      res.json(await storage.getEmployeeCommissions(req.query.employeeId ? Number(req.query.employeeId) : void 0));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/employee-commissions", async (req, res) => {
    try {
      res.json(await storage.createEmployeeCommission(sanitizeDates(req.body)));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/analytics/employee-sales/:id", async (req, res) => {
    try {
      res.json(await storage.getEmployeeSalesReport(Number(req.params.id)));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/analytics/slow-moving", async (req, res) => {
    try {
      res.json(await storage.getSlowMovingProducts(req.query.days ? Number(req.query.days) : 30));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/analytics/profit-by-product", async (_req, res) => {
    try {
      res.json(await storage.getProfitByProduct());
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/analytics/cashier-performance", async (_req, res) => {
    try {
      res.json(await storage.getCashierPerformance());
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/analytics/returns-report", async (_req, res) => {
    try {
      res.json(await storage.getReturnsReport());
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/reports/sales-export", async (req, res) => {
    try {
      const startDate = req.query.startDate || "2000-01-01";
      const endDate = req.query.endDate || "2099-12-31";
      const salesData = await storage.getSalesByDateRange(new Date(startDate), new Date(endDate));
      const headers = ["Receipt #", "Date", "Total", "Payment Method", "Status", "Employee ID", "Customer ID"];
      const rows = salesData.map((s) => [
        s.receiptNumber || `#${s.id}`,
        new Date(s.createdAt).toLocaleString(),
        Number(s.totalAmount).toFixed(2),
        s.paymentMethod,
        s.status,
        s.employeeId,
        s.customerId || "Walk-in"
      ]);
      const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename=sales-report-${startDate}-to-${endDate}.csv`);
      res.send(csv);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/reports/inventory-export", async (_req, res) => {
    try {
      const allProducts = await storage.getProducts();
      const headers = ["ID", "Name", "Category", "Barcode", "Price", "Cost Price", "Stock Qty", "Low Stock Threshold", "Status"];
      const rows = allProducts.map((p) => [
        p.id,
        `"${p.name}"`,
        p.categoryId,
        p.barcode || "N/A",
        Number(p.price).toFixed(2),
        Number(p.costPrice || 0).toFixed(2),
        p.stockQuantity || 0,
        p.lowStockThreshold || 10,
        p.isActive ? "Active" : "Inactive"
      ]);
      const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=inventory-report.csv");
      res.send(csv);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/reports/profit-export", async (_req, res) => {
    try {
      const profitData = await storage.getProfitByProduct();
      const headers = ["Product", "Total Sold", "Revenue", "Total Cost", "Profit", "Cost Price"];
      const rows = profitData.map((p) => [
        `"${p.productName}"`,
        p.totalSold,
        Number(p.totalRevenue).toFixed(2),
        Number(p.totalCost).toFixed(2),
        Number(p.profit).toFixed(2),
        Number(p.costPrice).toFixed(2)
      ]);
      const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=profit-report.csv");
      res.send(csv);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/reports/employee-performance-export", async (_req, res) => {
    try {
      const perfData = await storage.getCashierPerformance();
      const headers = ["Employee", "Role", "Sales Count", "Total Revenue", "Avg Sale Value"];
      const rows = perfData.map((p) => [
        `"${p.employeeName}"`,
        p.role,
        p.salesCount,
        Number(p.totalRevenue).toFixed(2),
        Number(p.avgSaleValue).toFixed(2)
      ]);
      const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=employee-performance-report.csv");
      res.send(csv);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/analytics/predictions", async (req, res) => {
    try {
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : void 0;
      const stats = await storage.getDashboardStats(tenantId);
      const limit = 10;
      const topProducts = stats.topProducts || [];
      const slowMoving = await storage.getSlowMovingProducts(30);
      const allProds = tenantId ? await storage.getProductsByTenant(tenantId) : await storage.getProducts();
      let lowStockData = [];
      if (tenantId) {
        const tenantBranches = await storage.getBranchesByTenant(tenantId);
        for (const branch of tenantBranches) {
          const items = await storage.getLowStockItems(branch.id);
          lowStockData.push(...items);
        }
      } else {
        lowStockData = await storage.getLowStockItems();
      }
      const avgDailyRevenue = Number(stats.monthRevenue || 0) / 30;
      const projectedMonthly = avgDailyRevenue * 30;
      const projectedYearly = avgDailyRevenue * 365;
      const stockAlerts = lowStockData.map((item) => {
        const prod = allProds.find((p) => p.id === item.productId);
        return {
          productId: item.productId,
          productName: prod?.name || `Product #${item.productId}`,
          currentStock: item.quantity || 0,
          threshold: item.lowStockThreshold || 10,
          urgency: (item.quantity || 0) <= 5 ? "critical" : "warning",
          recommendation: `Reorder ${Math.max(50 - (item.quantity || 0), 20)} units`
        };
      });
      const categoryPerf = topProducts.reduce((acc, p) => {
        const prod = allProds.find((pr) => pr.id === p.productId);
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
        totalActiveProducts: allProds.filter((p) => p.isActive).length,
        slowMovingCount: slowMoving.length,
        topSellingProducts: topProducts.slice(0, 5).map((p) => ({
          name: p.name,
          revenue: Number(p.revenue || 0),
          soldCount: Number(p.totalSold || 0)
        })),
        stockAlerts,
        categoryPerformance: Object.entries(categoryPerf).map(([catId, data]) => ({
          categoryId: Number(catId),
          revenue: data.revenue,
          itemsSold: data.count
        })),
        insights: [
          avgDailyRevenue > 0 ? `Average daily revenue: $${avgDailyRevenue.toFixed(2)}` : "No sales data yet for predictions",
          slowMoving.length > 0 ? `${slowMoving.length} products with low sales in the last 30 days - consider promotions` : "All products are selling well",
          stockAlerts.filter((a) => a.urgency === "critical").length > 0 ? `${stockAlerts.filter((a) => a.urgency === "critical").length} products critically low on stock - reorder immediately` : "Stock levels are healthy"
        ]
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/public-objects/*filePath", async (req, res) => {
    const filePath = req.params.filePath;
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
  app2.get("/objects/*objectPath", async (req, res) => {
    const uploadsDir = path2.resolve(process.cwd(), "uploads");
    const filename = req.path.replace(/^\/objects\//, "");
    const localPath = path2.join(uploadsDir, filename);
    if (fs3.existsSync(localPath)) {
      return res.sendFile(localPath);
    }
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      return res.sendStatus(404);
    }
  });
  app2.post("/api/objects/upload", async (req, res) => {
    try {
      const { imageData, contentType = "image/jpeg" } = req.body;
      if (!imageData) {
        return res.status(400).json({ error: "imageData is required" });
      }
      const uploadsDir = path2.resolve(process.cwd(), "uploads");
      if (!fs3.existsSync(uploadsDir)) fs3.mkdirSync(uploadsDir, { recursive: true });
      const ext = (contentType.split("/")[1] || "jpg").split(";")[0];
      const filename = `${randomUUID3()}.${ext}`;
      const filePath = path2.join(uploadsDir, filename);
      const buffer = Buffer.from(imageData, "base64");
      fs3.writeFileSync(filePath, buffer);
      const objectPath = `/objects/${filename}`;
      res.json({ objectPath });
    } catch (error) {
      console.error("Error uploading file:", error);
      res.status(500).json({ error: error.message });
    }
  });
  app2.put("/api/images/save", async (req, res) => {
    const { imageURL } = req.body;
    if (!imageURL) {
      return res.status(400).json({ error: "imageURL is required" });
    }
    res.status(200).json({ objectPath: imageURL });
  });
  app2.post("/api/products-with-stock", async (req, res) => {
    try {
      const { initialStock, branchId, ...productData } = sanitizeDates(req.body);
      const product = await storage.createProduct(productData);
      if (initialStock && initialStock > 0 && branchId) {
        await storage.upsertInventory({ productId: product.id, branchId: Number(branchId), quantity: Number(initialStock) });
        await storage.createInventoryMovement({
          productId: product.id,
          branchId: Number(branchId),
          type: "purchase",
          quantity: Number(initialStock),
          referenceType: "manual",
          notes: "Initial stock on product creation"
        });
      }
      res.json(product);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/shifts/active/:employeeId", async (req, res) => {
    try {
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : void 0;
      const shifts2 = await storage.getShifts(tenantId);
      const active = shifts2.find((s) => s.employeeId === Number(req.params.employeeId) && s.status === "open");
      res.json(active || null);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/store-settings", async (req, res) => {
    try {
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : void 0;
      let branches2 = [];
      if (tenantId) {
        branches2 = await storage.getBranchesByTenant(tenantId);
      } else {
        branches2 = await storage.getBranches();
      }
      const mainBranch = branches2.find((b) => b.isMain) || branches2[0];
      if (!mainBranch) return res.status(404).json({ error: "No branch found" });
      const tenant = mainBranch.tenantId ? await storage.getTenant(mainBranch.tenantId) : null;
      const commissionRate = await storage.getCommissionRate();
      res.json({
        ...mainBranch,
        storeType: tenant?.storeType || "supermarket",
        commissionRate
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.put("/api/store-settings", async (req, res) => {
    try {
      const { storeType, tenantId: bodyTenantId, ...branchData } = sanitizeDates(req.body);
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : bodyTenantId ? Number(bodyTenantId) : void 0;
      let branches2 = [];
      if (tenantId) {
        branches2 = await storage.getBranchesByTenant(tenantId);
      } else {
        branches2 = await storage.getBranches();
      }
      const mainBranch = branches2.find((b) => b.isMain) || branches2[0];
      if (!mainBranch) return res.status(404).json({ error: "No branch found" });
      const updatedBranch = await storage.updateBranch(mainBranch.id, branchData);
      if (storeType && mainBranch.tenantId) {
        await storage.updateTenant(mainBranch.tenantId, { storeType });
      }
      res.json({ ...updatedBranch, storeType });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.put("/api/system-language", async (req, res) => {
    try {
      const { language } = req.body;
      if (!["en", "ar", "de"].includes(language)) {
        return res.status(400).json({ error: "Invalid language. Must be en, ar, or de" });
      }
      const tenantId = req.tenantId;
      if (!tenantId) return res.status(401).json({ error: "Not authorized" });
      await storage.upsertLandingPageConfig(tenantId, { language });
      res.json({ success: true, language });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/caller-id/simulate", async (req, res) => {
    const { phoneNumber, tenantId: bodyTenantId } = req.body;
    const tenantId = bodyTenantId || req.tenantId;
    await callerIdService.handleIncomingCall(phoneNumber || "0551234567", void 0, tenantId ? Number(tenantId) : void 0);
    res.json({ success: true });
  });
  app2.get("/api/caller-id/incoming", (_req, res) => {
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
    r.textContent=res.ok?'\u2713 Success! Check POS for popup.':'\u2717 '+JSON.stringify(d);
  }catch(e){r.className='err';r.textContent='\u2717 '+e.message;}
}
</script></body></html>`);
  });
  app2.get("/api/caller-id/active-calls", (req, res) => {
    const tenantId = req.tenantId || Number(req.query.tenantId);
    if (!tenantId) return res.status(400).json({ error: "tenantId required" });
    const calls2 = callerIdService.getActiveCallsForTenant(Number(tenantId));
    res.json({ calls: calls2 });
  });
  app2.post("/api/caller-id/incoming", async (req, res) => {
    try {
      const secret = req.headers["x-bridge-secret"] || req.body.secret;
      if (process.env.CALLER_ID_BRIDGE_SECRET && secret !== process.env.CALLER_ID_BRIDGE_SECRET) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const { phoneNumber, slot } = req.body;
      const tenantId = req.body.tenantId || req.tenantId;
      const callInfo = await callerIdService.handleIncomingCall(
        phoneNumber || "0123456789",
        slot ? Number(slot) : void 0,
        tenantId ? Number(tenantId) : void 0
      );
      const customerName = callInfo?.customer?.name;
      const customerAddress = callInfo?.customer?.address;
      pushService.notifyIncomingCall(phoneNumber || "0123456789", tenantId ? Number(tenantId) : void 0, customerName, customerAddress).catch(() => {
      });
      res.json({ success: true });
    } catch (e) {
      console.error("[CallerID] Error handling incoming call:", e);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.get("/api/push/vapid-public-key", (_req, res) => {
    res.json({ publicKey: pushService.publicKey });
  });
  app2.post("/api/push/subscribe", (req, res) => {
    const sub = req.body;
    if (!sub || !sub.endpoint) return res.status(400).json({ error: "Invalid subscription" });
    const tenantId = req.tenantId;
    if (!tenantId) return res.status(401).json({ error: "Tenant identification required" });
    pushService.subscribe(sub, tenantId);
    res.json({ success: true });
  });
  app2.post("/api/push/unsubscribe", (req, res) => {
    const { endpoint } = req.body;
    if (endpoint) pushService.unsubscribe(endpoint);
    res.json({ success: true });
  });
  function sortCategoriesByPriority(cats) {
    const getPriority = (name) => {
      const n = name.toLowerCase();
      if (/pizza|بيتزا|calzone|pide|lahmacun|burger|burg|sandwich|wrap|grill|shawarma|شاورما/.test(n)) return 1;
      if (/pasta|meal|main|plate|chicken|meat|fish|teller|nuggets|schnitzel|kebab|دجاج|لحم|سمك/.test(n)) return 2;
      if (/appetizer|starter|finger|snack|مقبلات|فاتح/.test(n)) return 3;
      if (/salad|سلطة/.test(n)) return 6;
      if (/dessert|sweet|حلوى|حلويات|baklava|tiramisu/.test(n)) return 7;
      if (/drink|beverage|juice|water|coke|cola|bier|beer|wine|alcohol|عصير|مشروب/.test(n)) return 8;
      if (/tabak|tobacco|cigarette/.test(n)) return 9;
      return 5;
    };
    return [...cats].sort((a, b) => {
      const aOrder = a.sortOrder || 0;
      const bOrder = b.sortOrder || 0;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return getPriority(a.name) - getPriority(b.name);
    });
  }
  app2.get("/api/store/:tenantId/menu", async (req, res) => {
    try {
      const tenantId = Number(req.params.tenantId);
      if (!tenantId || isNaN(tenantId)) {
        return res.status(400).json({ error: "Valid tenantId is required" });
      }
      const tenant = await storage.getTenant(tenantId);
      if (!tenant) {
        return res.status(404).json({ error: "Store not found" });
      }
      const categories2 = sortCategoriesByPriority(await storage.getCategories(tenantId));
      const products2 = await storage.getProductsByTenant(tenantId);
      const categoryOrder = categories2.map((c) => c.id);
      products2.sort((a, b) => categoryOrder.indexOf(a.categoryId) - categoryOrder.indexOf(b.categoryId));
      const config = await storage.getLandingPageConfig(tenantId);
      res.json({
        store: {
          id: tenant.id,
          name: tenant.businessName,
          logo: tenant.logo,
          storeType: tenant.storeType
        },
        config: config || null,
        products: products2,
        categories: categories2
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/store-public/:slug", async (req, res) => {
    try {
      const { slug } = req.params;
      const config = await storage.getLandingPageConfigBySlug(slug);
      if (!config) return res.status(404).json({ error: "Store not found" });
      if (!config.isPublished) return res.status(404).json({ error: "Store is currently unavailable" });
      const tenant = await storage.getTenant(config.tenantId);
      let products2 = await storage.getProductsByTenant(config.tenantId);
      const commissionRate = await storage.getCommissionRate();
      if (commissionRate > 0) {
        const factor = 1 + commissionRate / 100;
        products2 = products2.map((p) => {
          const rawPrice = parseFloat(p.price) * factor;
          const rounded = Math.ceil(rawPrice * 2) / 2;
          return { ...p, price: rounded.toFixed(2) };
        });
      }
      const categories2 = sortCategoriesByPriority(await storage.getCategories(config.tenantId));
      const categoryOrder = categories2.map((c) => c.id);
      products2.sort((a, b) => categoryOrder.indexOf(a.categoryId) - categoryOrder.indexOf(b.categoryId));
      res.json({ config, tenant, products: products2, categories: categories2 });
    } catch (e) {
      console.error(`[API] Public store error for ${req.params.slug}:`, e);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  app2.post("/api/online-orders/public", async (req, res) => {
    try {
      const { slug, tenantId: bodyTenantId, ...orderData } = req.body;
      let resolvedTenantId;
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
        status: "pending"
      });
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
            status: "pending"
          });
        }
      } catch (commErr) {
        console.error("[Commission] Failed to track commission:", commErr);
      }
      callerIdService.broadcast({
        type: "new_online_order",
        order
      });
      pushService.notifyNewOrder(orderNumber, orderData.totalAmount || "0").catch(() => {
      });
      try {
        const tenant = await storage.getTenant(resolvedTenantId);
        const storeName = tenant?.businessName || "Online Store";
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
          notes: orderData.notes
        }, storeName);
        if (orderData.customerPhone) {
          await whatsappService.sendCustomerConfirmation(
            orderData.customerPhone,
            orderNumber,
            storeName,
            orderData.totalAmount
          );
        }
      } catch (waErr) {
        console.error("[WhatsApp] Failed to send order notifications:", waErr);
      }
      res.json(order);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/online-orders", async (req, res) => {
    try {
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : void 0;
      const status2 = req.query.status;
      const orders = await storage.getOnlineOrders(tenantId, status2);
      res.json(orders);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.put("/api/online-orders/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const order = await storage.updateOnlineOrder(id, req.body);
      callerIdService.broadcast({ type: "online_order_updated", order });
      if (app2._broadcastOrderStatus) {
        app2._broadcastOrderStatus(id, { type: "status_update", order });
      }
      if (req.body.status && order.customerPhone) {
        try {
          const tenant = order.tenantId ? await storage.getTenant(order.tenantId) : null;
          const storeName = tenant?.businessName || "Store";
          await whatsappService.sendStatusUpdate(
            order.customerPhone,
            order.orderNumber,
            req.body.status,
            storeName
          );
        } catch (waErr) {
          console.error("[WhatsApp] Failed to send status update:", waErr);
        }
      }
      res.json(order);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.delete("/api/online-orders/:id", async (req, res) => {
    try {
      await storage.deleteOnlineOrder(Number(req.params.id));
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/super-admin/whatsapp/status", requireSuperAdmin, async (_req, res) => {
    res.json(whatsappService.getStatus());
  });
  app2.post("/api/super-admin/whatsapp/connect", requireSuperAdmin, async (_req, res) => {
    try {
      const result = await whatsappService.connect();
      const qr = whatsappService.getQrCode();
      res.json({ ...result, qrCode: qr });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/super-admin/whatsapp/disconnect", requireSuperAdmin, async (_req, res) => {
    await whatsappService.disconnect();
    res.json({ success: true });
  });
  app2.get("/api/super-admin/whatsapp/qr", requireSuperAdmin, async (_req, res) => {
    const qr = whatsappService.getQrCode();
    res.json({ qrCode: qr });
  });
  app2.post("/api/super-admin/whatsapp/test", requireSuperAdmin, async (req, res) => {
    const targetPhone = (req.body?.phone || "201204593124").replace(/\D/g, "");
    const sent = await whatsappService.sendText(
      targetPhone,
      "\u{1F9EA} *Test Message*\n\nThis is a test from Barmagly POS WhatsApp integration.\n\n\u2705 If you receive this, the connection is working!"
    );
    res.json({ success: sent, phone: targetPhone });
  });
  app2.get("/api/landing-page-config", async (req, res) => {
    try {
      const tenantId = Number(req.query.tenantId);
      if (!tenantId) return res.status(400).json({ error: "tenantId required" });
      const config = await storage.getLandingPageConfig(tenantId);
      res.json(config || null);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.put("/api/landing-page-config", requireSuperAdmin, async (req, res) => {
    try {
      const { tenantId, ...data } = req.body;
      if (!tenantId) return res.status(400).json({ error: "tenantId required" });
      const config = await storage.upsertLandingPageConfig(Number(tenantId), data);
      res.json(config);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/store-public/commission-rate", async (_req, res) => {
    try {
      const rate = await storage.getCommissionRate();
      res.json({ rate });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/create-payment-intent", async (req, res) => {
    try {
      const { amount, currency, tenantId } = req.body;
      const stripe = await getUncachableStripeClient();
      const amountInCents = Math.round(parseFloat(amount) * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: (currency || "chf").toLowerCase(),
        metadata: { tenantId: String(tenantId || ""), source: "online_order" }
      });
      res.json({ clientSecret: paymentIntent.client_secret, publishableKey: await getStripePublishableKey() });
    } catch (e) {
      console.error("[Stripe] PaymentIntent error:", e);
      res.status(500).json({ error: e.message });
    }
  });
  const orderSseClients = /* @__PURE__ */ new Map();
  app2.get("/api/online-orders/:id/status-stream", (req, res) => {
    const orderId = Number(req.params.id);
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();
    if (!orderSseClients.has(orderId)) orderSseClients.set(orderId, /* @__PURE__ */ new Set());
    orderSseClients.get(orderId).add(res);
    res.write(`data: ${JSON.stringify({ type: "connected" })}

`);
    const keepAlive = setInterval(() => res.write(`: ping

`), 25e3);
    req.on("close", () => {
      clearInterval(keepAlive);
      orderSseClients.get(orderId)?.delete(res);
    });
  });
  app2._broadcastOrderStatus = (orderId, data) => {
    const clients = orderSseClients.get(orderId);
    if (clients) {
      const msg = `data: ${JSON.stringify(data)}

`;
      clients.forEach((c) => {
        try {
          c.write(msg);
        } catch {
        }
      });
    }
  };
  app2.get("/store/:slug", async (req, res) => {
    try {
      const { slug } = req.params;
      const config = await storage.getLandingPageConfigBySlug(slug);
      if (!config || !config.isPublished) {
        return res.status(404).send("<h1>Store not found</h1>");
      }
      const templatePath = path2.resolve(process.cwd(), "server", "templates", "restaurant-store.html");
      let html = fs3.readFileSync(templatePath, "utf8");
      const branches2 = await storage.getBranchesByTenant(config.tenantId);
      const currency = branches2?.[0]?.currency || "CHF";
      html = html.replace(/\{\{SLUG\}\}/g, slug);
      html = html.replace(/\{\{TENANT_ID\}\}/g, String(config.tenantId));
      html = html.replace(/\{\{PRIMARY_COLOR\}\}/g, config.primaryColor || "#2FD3C6");
      html = html.replace(/\{\{ACCENT_COLOR\}\}/g, config.accentColor || "#6366F1");
      html = html.replace(/\{\{CURRENCY\}\}/g, currency);
      html = html.replace(/\{\{LANGUAGE\}\}/g, config.language || "en");
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.send(html);
    } catch (e) {
      console.error("[store/:slug] Error:", e);
      res.status(500).send("<h1>Server error</h1>");
    }
  });
  const TENANT_BACKUP_DIR = path2.resolve(process.cwd(), "backups");
  if (!fs3.existsSync(TENANT_BACKUP_DIR)) fs3.mkdirSync(TENANT_BACKUP_DIR, { recursive: true });
  app2.get("/api/backup/list", async (req, res) => {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) return res.status(401).json({ error: "Not authorized" });
      const files = fs3.readdirSync(TENANT_BACKUP_DIR).filter((f) => f.startsWith(`backup_tenant_${tenantId}_`) && f.endsWith(".json")).map((f) => {
        const stat = fs3.statSync(path2.join(TENANT_BACKUP_DIR, f));
        return { filename: f, size: stat.size, createdAt: stat.mtime.toISOString() };
      }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      res.json(files);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/backup/create", async (req, res) => {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) return res.status(401).json({ error: "Not authorized" });
      const tenant = await storage.getTenant(tenantId);
      if (!tenant) return res.status(404).json({ error: "Tenant not found" });
      const [branches2, employees2, products2, categories2, customers2] = await Promise.all([
        storage.getBranchesByTenant(tenantId),
        storage.getEmployeesByTenant(tenantId),
        storage.getProductsByTenant(tenantId),
        storage.getCategories(tenantId),
        storage.getCustomers(void 0, tenantId)
      ]);
      let inventory2 = [];
      let expenses2 = [];
      for (const b of branches2) {
        try {
          const inv = await storage.getInventory(b.id, tenantId);
          inventory2.push(...inv);
        } catch {
        }
      }
      try {
        expenses2 = await storage.getExpenses(tenantId);
      } catch {
      }
      const sales2 = await storage.getSales({ tenantId, limit: 1e4 });
      const snapshot = {
        version: "2.0",
        exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
        tenantId,
        tenant: { ...tenant, passwordHash: "[REDACTED]" },
        branches: branches2,
        employees: employees2.map((e) => ({ ...e, pin: "[REDACTED]", passwordHash: "[REDACTED]" })),
        categories: categories2,
        products: products2,
        inventory: inventory2,
        customers: customers2,
        expenses: expenses2,
        sales: sales2.slice(0, 5e3)
      };
      const filename = `backup_tenant_${tenantId}_${Date.now()}.json`;
      const filepath = path2.join(TENANT_BACKUP_DIR, filename);
      fs3.writeFileSync(filepath, JSON.stringify(snapshot));
      const stat = fs3.statSync(filepath);
      console.log(`[BACKUP] Manual by tenant ${tenantId}: ${filename} (${Math.round(stat.size / 1024)}KB)`);
      res.json({ success: true, filename, size: stat.size, createdAt: stat.mtime.toISOString() });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/backup/restore/:filename", async (req, res) => {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) return res.status(401).json({ error: "Not authorized" });
      const filename = path2.basename(req.params.filename);
      if (!filename.startsWith(`backup_tenant_${tenantId}_`)) {
        return res.status(403).json({ error: "Not authorized to restore this backup" });
      }
      const filepath = path2.join(TENANT_BACKUP_DIR, filename);
      if (!fs3.existsSync(filepath)) return res.status(404).json({ error: "Backup not found" });
      const snapshot = JSON.parse(fs3.readFileSync(filepath, "utf-8"));
      const restored = { branches: 0, categories: 0, products: 0, customers: 0, expenses: 0 };
      if (snapshot.categories?.length) {
        const existingCats = await storage.getCategories(tenantId);
        for (const c of snapshot.categories) {
          try {
            if (!existingCats.find((ec) => ec.name === c.name)) {
              await storage.createCategory({ ...c, id: void 0, tenantId });
              restored.categories++;
            }
          } catch {
          }
        }
      }
      if (snapshot.products?.length) {
        const existingProducts = await storage.getProductsByTenant(tenantId);
        const freshCats = await storage.getCategories(tenantId);
        const catMap = new Map(freshCats.map((c) => [c.name, c.id]));
        const origCatMap = new Map((snapshot.categories || []).map((c) => [c.id, c.name]));
        for (const p of snapshot.products) {
          try {
            let newCatId = p.categoryId;
            if (p.categoryId && origCatMap.has(p.categoryId)) {
              newCatId = catMap.get(origCatMap.get(p.categoryId)) ?? p.categoryId;
            }
            const match = p.barcode ? existingProducts.find((ep) => ep.barcode === p.barcode) : existingProducts.find((ep) => ep.name === p.name);
            if (match) {
              await storage.updateProduct(match.id, { name: p.name, price: p.price, costPrice: p.costPrice, description: p.description, isActive: p.isActive, categoryId: newCatId });
            } else {
              await storage.createProduct({ ...p, id: void 0, tenantId, categoryId: newCatId });
            }
            restored.products++;
          } catch {
          }
        }
      }
      if (snapshot.customers?.length) {
        const existingCustomers = await storage.getCustomers(void 0, tenantId);
        const existingEmails = new Set(existingCustomers.filter((c) => c.email).map((c) => c.email?.toLowerCase()));
        for (const c of snapshot.customers) {
          try {
            if (!c.email || !existingEmails.has(c.email.toLowerCase())) {
              await storage.createCustomer({ ...c, id: void 0, tenantId });
              restored.customers++;
            }
          } catch {
          }
        }
      }
      res.json({ success: true, tenantId, restored });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.delete("/api/backup/:filename", async (req, res) => {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) return res.status(401).json({ error: "Not authorized" });
      const filename = path2.basename(req.params.filename);
      if (!filename.startsWith(`backup_tenant_${tenantId}_`)) {
        return res.status(403).json({ error: "Not authorized" });
      }
      const filepath = path2.join(TENANT_BACKUP_DIR, filename);
      if (fs3.existsSync(filepath)) fs3.unlinkSync(filepath);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/vehicles", async (req, res) => {
    try {
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : void 0;
      const branchId = req.query.branchId ? Number(req.query.branchId) : void 0;
      res.json(await storage.getVehicles(tenantId, branchId));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/vehicles", async (req, res) => {
    try {
      res.json(await storage.createVehicle(req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.put("/api/vehicles/:id", async (req, res) => {
    try {
      res.json(await storage.updateVehicle(Number(req.params.id), req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.delete("/api/vehicles/:id", async (req, res) => {
    try {
      await storage.deleteVehicle(Number(req.params.id));
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/printer-configs", async (req, res) => {
    try {
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : 1;
      const branchId = req.query.branchId ? Number(req.query.branchId) : void 0;
      res.json(await storage.getPrinterConfigs(tenantId, branchId));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/printer-configs", async (req, res) => {
    try {
      res.json(await storage.upsertPrinterConfig(req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/daily-closings", async (req, res) => {
    try {
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : 1;
      const branchId = req.query.branchId ? Number(req.query.branchId) : void 0;
      res.json(await storage.getDailyClosings(tenantId, branchId));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/daily-closings", async (req, res) => {
    try {
      const { tenantId, branchId, closingDate } = req.body;
      const today = closingDate || (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const startOfDay = /* @__PURE__ */ new Date(today + "T00:00:00.000Z");
      const endOfDay = /* @__PURE__ */ new Date(today + "T23:59:59.999Z");
      const daySales = await storage.getSalesByDateRange(startOfDay, endOfDay);
      const totalSales = daySales.reduce((s, sale) => s + Number(sale.totalAmount || 0), 0);
      const totalCash = daySales.filter((s) => s.paymentMethod === "cash").reduce((a, s) => a + Number(s.totalAmount || 0), 0);
      const totalCard = daySales.filter((s) => s.paymentMethod === "card").reduce((a, s) => a + Number(s.totalAmount || 0), 0);
      const totalMobile = daySales.filter((s) => s.paymentMethod === "mobile").reduce((a, s) => a + Number(s.totalAmount || 0), 0);
      const totalDiscounts = daySales.reduce((s, sale) => s + Number(sale.discountAmount || 0), 0);
      const dc = await storage.createDailyClosing({
        tenantId,
        branchId: branchId || null,
        employeeId: req.body.employeeId || null,
        closingDate: today,
        totalSales: String(totalSales),
        totalCash: String(totalCash),
        totalCard: String(totalCard),
        totalMobile: String(totalMobile),
        totalTransactions: daySales.length,
        totalReturns: "0",
        totalDiscounts: String(totalDiscounts),
        openingCash: String(req.body.openingCash || 0),
        closingCash: String(req.body.closingCash || 0),
        notes: req.body.notes || null,
        status: "closed"
      });
      res.json(dc);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/monthly-closings", async (req, res) => {
    try {
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : 1;
      const branchId = req.query.branchId ? Number(req.query.branchId) : void 0;
      res.json(await storage.getMonthlyClosings(tenantId, branchId));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/monthly-closings", async (req, res) => {
    try {
      const { tenantId, branchId, closingMonth } = req.body;
      const month = closingMonth || (/* @__PURE__ */ new Date()).toISOString().slice(0, 7);
      const startOfMonth = /* @__PURE__ */ new Date(month + "-01T00:00:00.000Z");
      const endOfMonth = /* @__PURE__ */ new Date(new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 0).toISOString().split("T")[0] + "T23:59:59.999Z");
      const monthSales = await storage.getSalesByDateRange(startOfMonth, endOfMonth);
      const totalSales = monthSales.reduce((s, sale) => s + Number(sale.totalAmount || 0), 0);
      const totalCash = monthSales.filter((s) => s.paymentMethod === "cash").reduce((a, s) => a + Number(s.totalAmount || 0), 0);
      const totalCard = monthSales.filter((s) => s.paymentMethod === "card").reduce((a, s) => a + Number(s.totalAmount || 0), 0);
      const totalMobile = monthSales.filter((s) => s.paymentMethod === "mobile").reduce((a, s) => a + Number(s.totalAmount || 0), 0);
      const totalDiscounts = monthSales.reduce((s, sale) => s + Number(sale.discountAmount || 0), 0);
      const expenses2 = await storage.getExpensesByDateRange(startOfMonth, endOfMonth);
      const totalExpenses = expenses2.reduce((s, e) => s + Number(e.amount || 0), 0);
      const mc = await storage.createMonthlyClosing({
        tenantId,
        branchId: branchId || null,
        employeeId: req.body.employeeId || null,
        closingMonth: month,
        totalSales: String(totalSales),
        totalCash: String(totalCash),
        totalCard: String(totalCard),
        totalMobile: String(totalMobile),
        totalTransactions: monthSales.length,
        totalReturns: "0",
        totalDiscounts: String(totalDiscounts),
        totalExpenses: String(totalExpenses),
        netRevenue: String(totalSales - totalExpenses),
        notes: req.body.notes || null,
        status: "closed"
      });
      res.json(mc);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/superAdminRoutes.ts
init_storage();
import * as bcrypt4 from "bcrypt";
import * as crypto3 from "crypto";
import * as fs4 from "fs";
import * as path3 from "path";
init_db();
import { addMonths as addMonths3, addYears as addYears3, addDays as addDays3 } from "date-fns";
import { eq as eq4, desc as desc2, sql as sql4, and as and2, gte as gte2, lte as lte2 } from "drizzle-orm";
var BACKUP_DIR = path3.resolve(process.cwd(), "backups");
if (!fs4.existsSync(BACKUP_DIR)) fs4.mkdirSync(BACKUP_DIR, { recursive: true });
async function createTenantBackup(tenantId) {
  const tenant = await storage.getTenant(tenantId);
  if (!tenant) throw new Error("Tenant not found");
  const [branches2, employees2, products2, categories2, customers2, subs, licenses] = await Promise.all([
    storage.getBranchesByTenant(tenantId),
    storage.getEmployeesByTenant(tenantId),
    storage.getProductsByTenant(tenantId),
    storage.getCategories(tenantId),
    storage.getCustomers(void 0, tenantId),
    storage.getTenantSubscriptions(tenantId),
    storage.getLicenseKeys(tenantId)
  ]);
  const allBranchIds = branches2.map((b) => b.id);
  let inventory2 = [];
  let expenses2 = [];
  for (const bid of allBranchIds) {
    try {
      const inv = await storage.getInventory(bid, tenantId);
      inventory2.push(...inv);
    } catch {
    }
  }
  try {
    expenses2 = await storage.getExpenses(tenantId);
  } catch {
  }
  const sales2 = await storage.getSales({ tenantId, limit: 5e4 });
  const snapshot = {
    version: "2.0",
    exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
    tenantId,
    tenant: { ...tenant, passwordHash: "[REDACTED]" },
    branches: branches2,
    employees: employees2.map((e) => ({ ...e, pin: "[REDACTED]", passwordHash: "[REDACTED]" })),
    categories: categories2,
    products: products2,
    inventory: inventory2,
    customers: customers2,
    expenses: expenses2,
    sales: sales2.slice(0, 1e4),
    // cap at 10k for size
    subscriptions: subs,
    licenses: licenses.map((l) => ({ ...l }))
  };
  const filename = `backup_tenant_${tenantId}_${Date.now()}.json`;
  const filepath = path3.join(BACKUP_DIR, filename);
  fs4.writeFileSync(filepath, JSON.stringify(snapshot, null, 2));
  console.log(`[BACKUP] Created ${filename} (${Math.round(fs4.statSync(filepath).size / 1024)}KB)`);
  return filename;
}
function pruneOldBackups() {
  try {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1e3;
    fs4.readdirSync(BACKUP_DIR).forEach((f) => {
      const fp = path3.join(BACKUP_DIR, f);
      if (fs4.statSync(fp).mtimeMs < cutoff) fs4.unlinkSync(fp);
    });
  } catch (e) {
    console.error("[BACKUP] Prune error:", e);
  }
}
var autoBackupInterval = null;
function startAutoBackup() {
  if (autoBackupInterval) return;
  autoBackupInterval = setInterval(async () => {
    console.log("[BACKUP] Running daily auto-backup\u2026");
    pruneOldBackups();
    try {
      const tenants2 = await storage.getTenants();
      for (const t of tenants2) {
        try {
          await createTenantBackup(t.id);
        } catch (e) {
          console.error(`[BACKUP] Failed for tenant ${t.id}:`, e);
        }
      }
      console.log(`[BACKUP] Done \u2013 ${tenants2.length} stores backed up.`);
    } catch (e) {
      console.error("[BACKUP] Error:", e);
    }
  }, 24 * 60 * 60 * 1e3);
}
startAutoBackup();
function registerSuperAdminRoutes(app2) {
  app2.post("/api/super-admin/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }
      const admin = await storage.getSuperAdminByEmail(email);
      if (!admin || !admin.isActive) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      const valid = await bcrypt4.compare(password, admin.passwordHash);
      if (!valid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      const token = generateToken(admin.id, admin.email, admin.role || "super_admin");
      res.json({ token, admin: { id: admin.id, name: admin.name, email: admin.email, role: admin.role } });
    } catch (e) {
      console.error("Super admin login error:", e);
      res.status(500).json({ error: "Server error" });
    }
  });
  app2.get("/api/super-admin/stats", requireSuperAdmin, async (_req, res) => {
    try {
      const stats = await storage.getSuperAdminDashboardStats();
      res.json(stats);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/super-admin/analytics/overview", requireSuperAdmin, async (_req, res) => {
    try {
      const { tenants: tenants2, tenantSubscriptions: tenantSubscriptions2, licenseKeys: licenseKeys2, branches: branches2, employees: employees2, products: products2, sales: sales2, customers: customers2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const [totalTenants] = await db.select({ count: sql4`count(*)` }).from(tenants2);
      const [activeTenants] = await db.select({ count: sql4`count(*)` }).from(tenants2).where(eq4(tenants2.status, "active"));
      const [totalSubs] = await db.select({ count: sql4`count(*)` }).from(tenantSubscriptions2);
      const [activeSubs] = await db.select({ count: sql4`count(*)` }).from(tenantSubscriptions2).where(eq4(tenantSubscriptions2.status, "active"));
      const [totalLicenses] = await db.select({ count: sql4`count(*)` }).from(licenseKeys2);
      const [activeLicenses] = await db.select({ count: sql4`count(*)` }).from(licenseKeys2).where(eq4(licenseKeys2.status, "active"));
      const [totalBranches] = await db.select({ count: sql4`count(*)` }).from(branches2);
      const [totalEmployees] = await db.select({ count: sql4`count(*)` }).from(employees2);
      const [totalProducts] = await db.select({ count: sql4`count(*)` }).from(products2);
      const [totalSales] = await db.select({ count: sql4`count(*)` }).from(sales2);
      const [totalCustomers] = await db.select({ count: sql4`count(*)` }).from(customers2);
      const [revenueRow] = await db.select({ total: sql4`coalesce(sum(cast(price as decimal)), 0)::text` }).from(tenantSubscriptions2).where(eq4(tenantSubscriptions2.status, "active"));
      const [salesRevenue] = await db.select({ total: sql4`coalesce(sum(cast(total_amount as decimal)), 0)::text` }).from(sales2);
      const in7Days = /* @__PURE__ */ new Date();
      in7Days.setDate(in7Days.getDate() + 7);
      const now = /* @__PURE__ */ new Date();
      const [expiringSubs] = await db.select({ count: sql4`count(*)` }).from(tenantSubscriptions2).where(and2(eq4(tenantSubscriptions2.status, "active"), lte2(tenantSubscriptions2.endDate, in7Days), gte2(tenantSubscriptions2.endDate, now)));
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
        totalSalesRevenue: parseFloat(salesRevenue?.total || "0")
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/super-admin/analytics/revenue", requireSuperAdmin, async (_req, res) => {
    try {
      const { tenantSubscriptions: tenantSubscriptions2, tenants: tenants2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const allTenants = await storage.getTenants();
      const allSubs = await storage.getTenantSubscriptions();
      const revenueByTenant = allTenants.map((t) => {
        const tenantSubs = allSubs.filter((s) => s.tenantId === t.id && s.status === "active");
        const rev = tenantSubs.reduce((acc, s) => acc + parseFloat(s.price || "0"), 0);
        return { tenantId: t.id, businessName: t.businessName, revenue: rev, subCount: tenantSubs.length };
      }).filter((t) => t.revenue > 0).sort((a, b) => b.revenue - a.revenue);
      const monthly = [];
      for (let i = 5; i >= 0; i--) {
        const d = /* @__PURE__ */ new Date();
        d.setMonth(d.getMonth() - i);
        const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
        const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        const monthSubs = allSubs.filter((s) => {
          const created = new Date(s.createdAt);
          return created >= monthStart && created <= monthEnd;
        });
        const monthRev = monthSubs.reduce((acc, s) => acc + parseFloat(s.price || "0"), 0);
        monthly.push({
          month: d.toLocaleString("en-US", { month: "short", year: "2-digit" }),
          revenue: monthRev,
          count: monthSubs.length
        });
      }
      const planBreakdown = {};
      allSubs.filter((s) => s.status === "active").forEach((s) => {
        const plan = s.planType || "unknown";
        if (!planBreakdown[plan]) planBreakdown[plan] = { count: 0, revenue: 0 };
        planBreakdown[plan].count++;
        planBreakdown[plan].revenue += parseFloat(s.price || "0");
      });
      res.json({ revenueByTenant, monthly, planBreakdown });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/super-admin/analytics/sales", requireSuperAdmin, async (_req, res) => {
    try {
      const allTenants = await storage.getTenants();
      const result = [];
      let grandTotal = 0;
      let grandCount = 0;
      for (const t of allTenants) {
        const tenantSales = await storage.getSales({ tenantId: t.id, limit: 1e3 });
        const total = tenantSales.reduce((acc, s) => acc + parseFloat(s.totalAmount || "0"), 0);
        grandTotal += total;
        grandCount += tenantSales.length;
        const today = /* @__PURE__ */ new Date();
        today.setHours(0, 0, 0, 0);
        const todaySales = tenantSales.filter((s) => new Date(s.createdAt) >= today);
        const todayTotal = todaySales.reduce((acc, s) => acc + parseFloat(s.totalAmount || "0"), 0);
        result.push({
          tenantId: t.id,
          businessName: t.businessName,
          totalSales: tenantSales.length,
          totalRevenue: total,
          todaySales: todaySales.length,
          todayRevenue: todayTotal
        });
      }
      result.sort((a, b) => b.totalRevenue - a.totalRevenue);
      res.json({ tenants: result, grandTotal, grandCount });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/super-admin/analytics/activity", requireSuperAdmin, async (_req, res) => {
    try {
      const log3 = await storage.getActivityLog(100);
      res.json(log3);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/super-admin/tenant-notifications", requireSuperAdmin, async (_req, res) => {
    try {
      const notifs = await storage.getTenantNotifications();
      res.json(notifs);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/super-admin/tenant-notifications", requireSuperAdmin, async (req, res) => {
    try {
      const { tenantId, title, message, type, priority } = req.body;
      if (!tenantId || !title || !message) {
        return res.status(400).json({ error: "tenantId, title, and message are required" });
      }
      const notif = await storage.createTenantNotification({
        tenantId,
        title,
        message,
        type: type || "info",
        priority: priority || "normal",
        isRead: false
      });
      res.json(notif);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/super-admin/tenant-notifications/broadcast", requireSuperAdmin, async (req, res) => {
    try {
      const { title, message, type, priority } = req.body;
      if (!title || !message) {
        return res.status(400).json({ error: "title and message are required" });
      }
      const allTenants = await storage.getTenants();
      const results = [];
      for (const t of allTenants) {
        const notif = await storage.createTenantNotification({
          tenantId: t.id,
          title,
          message,
          type: type || "info",
          priority: priority || "normal",
          isRead: false
        });
        results.push(notif);
      }
      res.json({ success: true, sent: results.length });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.patch("/api/super-admin/tenant-notifications/:id/read", requireSuperAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const notif = await storage.updateTenantNotification(id, { isRead: true });
      res.json(notif);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/super-admin/tenants", requireSuperAdmin, async (_req, res) => {
    try {
      const list = await storage.getTenants();
      res.json(list);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/super-admin/tenants/:id", requireSuperAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const tenant = await storage.getTenant(id);
      if (!tenant) return res.status(404).json({ error: "Tenant not found" });
      const branches2 = await storage.getBranchesByTenant(id);
      const employees2 = await storage.getEmployeesByTenant(id);
      const products2 = await storage.getProductsByTenant(id);
      const subs = await storage.getTenantSubscriptions(id);
      const licenses = await storage.getLicenseKeys(id);
      const customers2 = await storage.getCustomers(void 0, id);
      res.json({ ...tenant, branches: branches2, employees: employees2, products: products2, subscriptions: subs, licenses, customerCount: customers2.length });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/super-admin/tenants", requireSuperAdmin, async (req, res) => {
    try {
      const { businessName, ownerName, ownerEmail, ownerPhone, status: status2, maxBranches, maxEmployees, storeType, address } = req.body;
      const passwordHash = await bcrypt4.hash("admin123", 10);
      const tenant = await storage.createTenant({
        businessName,
        ownerName,
        ownerEmail,
        ownerPhone: ownerPhone || null,
        address: address || null,
        passwordHash,
        status: status2 || "active",
        maxBranches: maxBranches || 1,
        maxEmployees: maxEmployees || 5,
        storeType: storeType || "supermarket"
      });
      const startDate = /* @__PURE__ */ new Date();
      const endDate = addDays3(startDate, 14);
      const sub = await storage.createTenantSubscription({
        tenantId: tenant.id,
        planType: "trial",
        planName: "14-Day Free Trial",
        price: "0",
        status: "active",
        startDate,
        endDate,
        autoRenew: false
      });
      const randomSegments = Array.from(
        { length: 4 },
        () => crypto3.randomBytes(2).toString("hex").toUpperCase()
      );
      const licenseKey = `TRIAL-${randomSegments.join("-")}`;
      await storage.createLicenseKey({
        licenseKey,
        tenantId: tenant.id,
        subscriptionId: sub.id,
        status: "active",
        maxActivations: 3,
        expiresAt: endDate,
        notes: "Auto-generated Trial for Dashboard creation"
      });
      await storage.ensureTenantData(tenant.id);
      res.json({ ...tenant, licenseKey });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.patch("/api/super-admin/tenants/:id", requireSuperAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const tenant = await storage.updateTenant(id, req.body);
      res.json(tenant);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.delete("/api/super-admin/tenants/:id", requireSuperAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteTenant(id);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/super-admin/tenants/:id/reset-password", requireSuperAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { newPassword } = req.body;
      const passwordHash = await bcrypt4.hash(newPassword || "admin123", 10);
      await storage.updateTenant(id, { passwordHash });
      res.json({ success: true, message: "Password reset successfully" });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/super-admin/subscriptions", requireSuperAdmin, async (_req, res) => {
    try {
      const subs = await storage.getTenantSubscriptions();
      const tenantList = await storage.getTenants();
      const tenantMap = Object.fromEntries(tenantList.map((t) => [t.id, t]));
      const enriched = subs.map((s) => ({ ...s, tenant: tenantMap[s.tenantId] || null }));
      res.json(enriched);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/super-admin/subscriptions", requireSuperAdmin, async (req, res) => {
    try {
      const { tenantId, planType, planName, price, status: status2, autoRenew, paymentMethod } = req.body;
      const startDate = /* @__PURE__ */ new Date();
      let endDate = /* @__PURE__ */ new Date();
      if (planType === "monthly") endDate = addMonths3(startDate, 1);
      else if (planType === "yearly") endDate = addYears3(startDate, 1);
      else endDate = addDays3(startDate, 30);
      const sub = await storage.createTenantSubscription({
        tenantId,
        planType: planType || "trial",
        planName: planName || "Starter",
        price: price || "0",
        status: status2 || "active",
        startDate,
        endDate,
        autoRenew: autoRenew || false,
        paymentMethod: paymentMethod || "manual"
      });
      res.json(sub);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.patch("/api/super-admin/subscriptions/:id", requireSuperAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const sub = await storage.updateTenantSubscription(id, req.body);
      res.json(sub);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.delete("/api/super-admin/subscriptions/:id", requireSuperAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteTenantSubscription(id);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/super-admin/subscriptions/:id/extend", requireSuperAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { days, months } = req.body;
      const sub = await storage.getTenantSubscription(id);
      if (!sub) return res.status(404).json({ error: "Subscription not found" });
      const currentEnd = sub.endDate ? new Date(sub.endDate) : /* @__PURE__ */ new Date();
      let newEnd = currentEnd;
      if (months) newEnd = addMonths3(currentEnd, months);
      else if (days) newEnd = addDays3(currentEnd, days);
      const updated = await storage.updateTenantSubscription(id, { endDate: newEnd, status: "active" });
      res.json(updated);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/super-admin/licenses", requireSuperAdmin, async (_req, res) => {
    try {
      const keys = await storage.getLicenseKeys();
      const tenantList = await storage.getTenants();
      const tenantMap = Object.fromEntries(tenantList.map((t) => [t.id, t]));
      const enriched = keys.map((k) => ({ ...k, tenant: tenantMap[k.tenantId] || null }));
      res.json(enriched);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/super-admin/licenses/generate", requireSuperAdmin, async (req, res) => {
    try {
      const { tenantId, subscriptionId, maxActivations, expiresAt, notes, customKey } = req.body;
      const segments = Array.from({ length: 4 }, () => crypto3.randomBytes(2).toString("hex").toUpperCase());
      const licenseKey = customKey || `BARMAGLY-${segments.join("-")}`;
      const key = await storage.createLicenseKey({
        licenseKey,
        tenantId,
        subscriptionId: subscriptionId || null,
        status: "active",
        maxActivations: maxActivations || 3,
        expiresAt: expiresAt ? new Date(expiresAt) : addYears3(/* @__PURE__ */ new Date(), 1),
        notes: notes || null
      });
      res.json(key);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.patch("/api/super-admin/licenses/:id", requireSuperAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const key = await storage.updateLicenseKey(id, req.body);
      res.json(key);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.patch("/api/super-admin/licenses/:id/revoke", requireSuperAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const key = await storage.updateLicenseKey(id, { status: "revoked" });
      res.json(key);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.delete("/api/super-admin/licenses/:id", requireSuperAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { licenseKeys: licenseKeys2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      await db.delete(licenseKeys2).where(eq4(licenseKeys2.id, id));
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/super-admin/all-stores", requireSuperAdmin, async (_req, res) => {
    try {
      const allTenants = await storage.getTenants();
      const allSubs = await storage.getTenantSubscriptions();
      const result = [];
      for (const t of allTenants) {
        const branches2 = await storage.getBranchesByTenant(t.id);
        const employees2 = await storage.getEmployeesByTenant(t.id);
        const products2 = await storage.getProductsByTenant(t.id);
        const tenantSubs = allSubs.filter((s) => s.tenantId === t.id && s.status === "active");
        const todaySales = await storage.getSales({ tenantId: t.id, limit: 200 });
        const today = /* @__PURE__ */ new Date();
        today.setHours(0, 0, 0, 0);
        const todayFiltered = todaySales.filter((s) => new Date(s.createdAt) >= today);
        const todayRevenue = todayFiltered.reduce((acc, s) => acc + parseFloat(s.total || "0"), 0);
        result.push({
          ...t,
          branchCount: branches2.length,
          employeeCount: employees2.length,
          productCount: products2.length,
          activeSub: tenantSubs[0] || null,
          salesToday: todayFiltered.length,
          revenuToday: todayRevenue
        });
      }
      res.json(result);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/super-admin/active-shifts", requireSuperAdmin, async (_req, res) => {
    try {
      const shifts2 = await storage.getShifts();
      const active = shifts2.filter((s) => !s.endTime);
      res.json(active);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/super-admin/stores/:id/branches", requireSuperAdmin, async (req, res) => {
    try {
      const tenantId = parseInt(req.params.id);
      const branches2 = await storage.getBranchesByTenant(tenantId);
      res.json(branches2);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/super-admin/stores/:id/branches", requireSuperAdmin, async (req, res) => {
    try {
      const tenantId = parseInt(req.params.id);
      const branch = await storage.createBranch({ ...req.body, tenantId });
      res.json(branch);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/super-admin/stores/:id/employees", requireSuperAdmin, async (req, res) => {
    try {
      const tenantId = parseInt(req.params.id);
      const employees2 = await storage.getEmployeesByTenant(tenantId);
      res.json(employees2);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/super-admin/stores/:id/employees", requireSuperAdmin, async (req, res) => {
    try {
      const tenantId = parseInt(req.params.id);
      const branches2 = await storage.getBranchesByTenant(tenantId);
      const branchId = req.body.branchId || (branches2[0]?.id ?? null);
      const employee = await storage.createEmployee({ ...req.body, branchId, tenantId, isActive: true });
      res.json(employee);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/super-admin/stores/:id/products", requireSuperAdmin, async (req, res) => {
    try {
      const tenantId = parseInt(req.params.id);
      const products2 = await storage.getProductsByTenant(tenantId);
      res.json(products2);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/super-admin/stores/:id/products", requireSuperAdmin, async (req, res) => {
    try {
      const tenantId = parseInt(req.params.id);
      const product = await storage.createProduct({ ...req.body, tenantId });
      res.json(product);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/super-admin/stores/:id/customers", requireSuperAdmin, async (req, res) => {
    try {
      const tenantId = parseInt(req.params.id);
      const customers2 = await storage.getCustomers(void 0, tenantId);
      res.json(customers2);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/super-admin/stores/:id/sales", requireSuperAdmin, async (req, res) => {
    try {
      const tenantId = parseInt(req.params.id);
      const salesData = await storage.getSales({ tenantId, limit: 100 });
      res.json(salesData);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/super-admin/stores/:id/:type", requireSuperAdmin, async (req, res) => {
    try {
      const tenantId = parseInt(req.params.id);
      const type = req.params.type;
      let data = [];
      if (type === "branches") data = await storage.getBranchesByTenant(tenantId);
      else if (type === "employees") data = await storage.getEmployeesByTenant(tenantId);
      else if (type === "products") data = await storage.getProductsByTenant(tenantId);
      else if (type === "customers") data = await storage.getCustomers(void 0, tenantId);
      else if (type === "sales") data = await storage.getSales({ tenantId, limit: 50 });
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.put("/api/super-admin/branches/:id", requireSuperAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const branch = await storage.updateBranch(id, req.body);
      res.json(branch);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.delete("/api/super-admin/branches/:id", requireSuperAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteBranch(id);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.put("/api/super-admin/employees/:id", requireSuperAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const emp = await storage.updateEmployee(id, req.body);
      res.json(emp);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.delete("/api/super-admin/employees/:id", requireSuperAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteEmployee(id);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.put("/api/super-admin/products/:id", requireSuperAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const product = await storage.updateProduct(id, req.body);
      res.json(product);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.delete("/api/super-admin/products/:id", requireSuperAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteProduct(id);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.patch("/api/super-admin/customers/:id/deactivate", requireSuperAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const customer = await storage.updateCustomer(id, { isActive: false });
      res.json(customer);
    } catch (e) {
      console.error("[SUPER-ADMIN] Customer deactivate error:", e);
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/super-admin/system/health", requireSuperAdmin, async (_req, res) => {
    try {
      const startTime = process.uptime();
      const memUsage = process.memoryUsage();
      const shifts2 = await storage.getShifts();
      const activeShifts = shifts2.filter((s) => !s.endTime);
      res.json({
        status: "healthy",
        uptime: Math.floor(startTime),
        uptimeFormatted: `${Math.floor(startTime / 3600)}h ${Math.floor(startTime % 3600 / 60)}m`,
        memoryUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        memoryTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        activeShifts: activeShifts.length,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || "development"
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/super-admin/backup/list", requireSuperAdmin, async (_req, res) => {
    try {
      const files = fs4.readdirSync(BACKUP_DIR).filter((f) => f.endsWith(".json")).map((f) => {
        const stat = fs4.statSync(path3.join(BACKUP_DIR, f));
        return { filename: f, size: stat.size, createdAt: stat.mtime.toISOString() };
      }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      res.json(files);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/super-admin/backup/create", requireSuperAdmin, async (req, res) => {
    try {
      const { tenantId } = req.body;
      if (tenantId) {
        const filename = await createTenantBackup(parseInt(tenantId));
        res.json({ success: true, filename });
      } else {
        const tenants2 = await storage.getTenants();
        const results = [];
        for (const t of tenants2) {
          try {
            results.push(await createTenantBackup(t.id));
          } catch (e) {
            console.error(`[BACKUP] Failed to backup tenant ${t.id}:`, e);
          }
        }
        res.json({ success: true, count: results.length, files: results });
      }
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/super-admin/backup/download/:filename", requireSuperAdmin, async (req, res) => {
    try {
      const filename = path3.basename(req.params.filename);
      const filepath = path3.join(BACKUP_DIR, filename);
      if (!fs4.existsSync(filepath)) return res.status(404).json({ error: "Backup not found" });
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.send(fs4.readFileSync(filepath));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/super-admin/backup/restore/:filename", requireSuperAdmin, async (req, res) => {
    try {
      const filename = path3.basename(req.params.filename);
      const filepath = path3.join(BACKUP_DIR, filename);
      if (!fs4.existsSync(filepath)) return res.status(404).json({ error: "Backup file not found" });
      const raw = fs4.readFileSync(filepath, "utf-8");
      const snapshot = JSON.parse(raw);
      if (!snapshot.tenant) return res.status(400).json({ error: "Invalid backup format: missing tenant data" });
      const tenantId = snapshot.tenantId || snapshot.tenant.id;
      const existingTenant = await storage.getTenant(tenantId);
      if (!existingTenant) {
        return res.status(404).json({ error: `Tenant #${tenantId} not found. The tenant must exist before restoring data.` });
      }
      const restored = {
        branches: 0,
        employees: 0,
        categories: 0,
        products: 0,
        customers: 0,
        expenses: 0
      };
      if (snapshot.branches?.length) {
        const existingBranches = await storage.getBranchesByTenant(tenantId);
        for (const b of snapshot.branches) {
          try {
            const match = existingBranches.find((eb) => eb.name === b.name);
            if (match) {
              await storage.updateBranch(match.id, { address: b.address, phone: b.phone, currency: b.currency, taxRate: b.taxRate, deliveryFee: b.deliveryFee });
            } else {
              await storage.createBranch({ ...b, id: void 0, tenantId });
            }
            restored.branches++;
          } catch (err) {
            console.error(`[RESTORE] Branch "${b.name}":`, err);
          }
        }
      }
      if (snapshot.categories?.length) {
        const existingCats = await storage.getCategories(tenantId);
        for (const c of snapshot.categories) {
          try {
            const match = existingCats.find((ec) => ec.name === c.name);
            if (!match) {
              await storage.createCategory({ ...c, id: void 0, tenantId });
              restored.categories++;
            }
          } catch (err) {
            console.error(`[RESTORE] Category "${c.name}":`, err);
          }
        }
      }
      if (snapshot.products?.length) {
        const existingProducts = await storage.getProductsByTenant(tenantId);
        const freshCats = await storage.getCategories(tenantId);
        const catMap = new Map(freshCats.map((c) => [c.name, c.id]));
        const origCatMap = new Map((snapshot.categories || []).map((c) => [c.id, c.name]));
        for (const p of snapshot.products) {
          try {
            const barcodeMatch = p.barcode ? existingProducts.find((ep) => ep.barcode === p.barcode) : null;
            const nameMatch = existingProducts.find((ep) => ep.name === p.name);
            let newCatId = p.categoryId;
            if (p.categoryId && origCatMap.has(p.categoryId)) {
              const catName = origCatMap.get(p.categoryId);
              newCatId = catMap.get(catName) ?? p.categoryId;
            }
            if (barcodeMatch || nameMatch) {
              const existing = barcodeMatch || nameMatch;
              await storage.updateProduct(existing.id, { name: p.name, price: p.price, costPrice: p.costPrice, description: p.description, isActive: p.isActive, categoryId: newCatId });
            } else {
              await storage.createProduct({ ...p, id: void 0, tenantId, categoryId: newCatId });
            }
            restored.products++;
          } catch (err) {
            console.error(`[RESTORE] Product "${p.name}":`, err);
          }
        }
      }
      if (snapshot.customers?.length) {
        const existingCustomers = await storage.getCustomers(void 0, tenantId);
        const existingEmails = new Set(existingCustomers.filter((c) => c.email).map((c) => c.email.toLowerCase()));
        const existingPhones = new Set(existingCustomers.filter((c) => c.phone).map((c) => c.phone));
        for (const c of snapshot.customers) {
          try {
            const emailDup = c.email && existingEmails.has(c.email.toLowerCase());
            const phoneDup = c.phone && existingPhones.has(c.phone);
            if (!emailDup && !phoneDup) {
              await storage.createCustomer({ ...c, id: void 0, tenantId });
              restored.customers++;
            }
          } catch (err) {
            console.error(`[RESTORE] Customer "${c.name}":`, err);
          }
        }
      }
      if (snapshot.expenses?.length) {
        for (const e of snapshot.expenses) {
          try {
            await storage.createExpense({ ...e, id: void 0, tenantId });
            restored.expenses++;
          } catch (err) {
            console.error(`[RESTORE] Expense:`, err);
          }
        }
      }
      console.log(`[RESTORE] \u2713 Restored from ${filename}:`, restored);
      res.json({ success: true, tenantId, restored });
    } catch (e) {
      console.error("[RESTORE] Error:", e);
      res.status(500).json({ error: e.message });
    }
  });
  app2.delete("/api/super-admin/backup/:filename", requireSuperAdmin, async (req, res) => {
    try {
      const filename = path3.basename(req.params.filename);
      const filepath = path3.join(BACKUP_DIR, filename);
      if (fs4.existsSync(filepath)) fs4.unlinkSync(filepath);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/super-admin/expenses", requireSuperAdmin, async (_req, res) => {
    try {
      const { expenses: expenses2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const rows = await db.select().from(expenses2).orderBy(desc2(expenses2.createdAt)).limit(500);
      res.json(rows);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/super-admin/expenses/by-tenant", requireSuperAdmin, async (_req, res) => {
    try {
      const { expenses: expenses2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const tenants2 = await storage.getTenants();
      const result = [];
      for (const t of tenants2) {
        const branchesList = await storage.getBranchesByTenant(t.id);
        const branchIds = branchesList.map((b) => b.id);
        let total = 0;
        if (branchIds.length > 0) {
          const { inArray: inArray2 } = await import("drizzle-orm");
          const rows = await db.select().from(expenses2).where(inArray2(expenses2.branchId, branchIds));
          total = rows.reduce((acc, e) => acc + parseFloat(e.amount || "0"), 0);
        }
        result.push({ tenantId: t.id, businessName: t.businessName, totalExpenses: total });
      }
      res.json(result);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/super-admin/shifts/all", requireSuperAdmin, async (_req, res) => {
    try {
      const { shifts: shifts2, employees: employees2, branches: branches2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const rows = await db.select().from(shifts2).orderBy(desc2(shifts2.startTime)).limit(200);
      res.json(rows);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/super-admin/activity", requireSuperAdmin, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit) : 200;
      const log3 = await storage.getActivityLog(limit);
      res.json(log3);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/super-admin/reports/summary", requireSuperAdmin, async (_req, res) => {
    try {
      const tenants2 = await storage.getTenants();
      const subs = await storage.getTenantSubscriptions();
      const report = [];
      for (const t of tenants2) {
        const sales2 = await storage.getSales({ tenantId: t.id, limit: 1e4 });
        const revenue = sales2.reduce((a, s) => a + parseFloat(s.totalAmount || "0"), 0);
        const activeSub = subs.find((s) => s.tenantId === t.id && s.status === "active");
        const employees2 = await storage.getEmployeesByTenant(t.id);
        const products2 = await storage.getProductsByTenant(t.id);
        const branches2 = await storage.getBranchesByTenant(t.id);
        report.push({
          tenantId: t.id,
          businessName: t.businessName,
          ownerEmail: t.ownerEmail,
          status: t.status,
          storeType: t.storeType,
          branches: branches2.length,
          employees: employees2.length,
          products: products2.length,
          totalSales: sales2.length,
          totalRevenue: revenue,
          subscription: activeSub ? { plan: activeSub.planName, expires: activeSub.endDate } : null,
          createdAt: t.createdAt
        });
      }
      res.json(report);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/super-admin/bulk-import/template", requireSuperAdmin, async (_req, res) => {
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=products_template.csv");
    res.send("name,barcode,price,cost,category,description\nSample Product,123456,9.99,5.00,General,Sample description");
  });
  app2.post("/api/super-admin/stores/:id/bulk-import/products", requireSuperAdmin, async (req, res) => {
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
            trackInventory: true
          });
          imported++;
        } catch (err) {
          console.error(`[BULK-IMPORT] Failed to import product "${p.name}":`, err);
        }
      }
      res.json({ success: true, imported });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/super-admin/products", requireSuperAdmin, async (req, res) => {
    try {
      const product = await storage.createProduct(req.body);
      res.json(product);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/super-admin/categories", requireSuperAdmin, async (req, res) => {
    try {
      const category = await storage.createCategory(req.body);
      res.json(category);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.put("/api/super-admin/categories/:id", requireSuperAdmin, async (req, res) => {
    try {
      const category = await storage.updateCategory(parseInt(req.params.id), req.body);
      res.json(category);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.delete("/api/super-admin/categories/:id", requireSuperAdmin, async (req, res) => {
    try {
      await storage.deleteCategory(parseInt(req.params.id));
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/super-admin/customers", requireSuperAdmin, async (req, res) => {
    try {
      const customer = await storage.createCustomer(req.body);
      res.json(customer);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.put("/api/super-admin/customers/:id", requireSuperAdmin, async (req, res) => {
    try {
      const customer = await storage.updateCustomer(parseInt(req.params.id), req.body);
      res.json(customer);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/super-admin/inventory/adjust", requireSuperAdmin, async (req, res) => {
    try {
      const { productId, branchId, adjustment, absoluteQuantity } = req.body;
      if (absoluteQuantity !== void 0 && absoluteQuantity !== null && absoluteQuantity !== "") {
        const result = await storage.upsertInventory({ productId, branchId, quantity: Number(absoluteQuantity) });
        res.json(result);
      } else {
        const result = await storage.adjustInventory(productId, branchId, Number(adjustment));
        res.json(result);
      }
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/super-admin/commission/settings", requireSuperAdmin, async (_req, res) => {
    try {
      const rate = await storage.getCommissionRate();
      res.json({ commissionRate: rate });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.put("/api/super-admin/commission/settings", requireSuperAdmin, async (req, res) => {
    try {
      const { commissionRate } = req.body;
      if (commissionRate === void 0 || isNaN(Number(commissionRate))) {
        return res.status(400).json({ error: "Valid commissionRate required" });
      }
      const rate = Math.max(0, Math.min(100, Number(commissionRate)));
      await storage.setPlatformSetting("commission_rate", String(rate));
      res.json({ commissionRate: rate });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/super-admin/commission/summary", requireSuperAdmin, async (_req, res) => {
    try {
      const summary = await storage.getCommissionSummary();
      res.json(summary);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/super-admin/commission/transactions", requireSuperAdmin, async (req, res) => {
    try {
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : void 0;
      const commissions = await storage.getPlatformCommissions(tenantId);
      res.json(commissions);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/super-admin/change-password", requireSuperAdmin, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const adminId = req.admin?.id;
      if (!adminId) return res.status(401).json({ error: "Unauthorized" });
      const admin = await storage.getSuperAdminByEmail(req.admin.email);
      if (!admin) return res.status(404).json({ error: "Admin not found" });
      const valid = await bcrypt4.compare(currentPassword, admin.passwordHash);
      if (!valid) return res.status(400).json({ error: "Current password is incorrect" });
      const newHash = await bcrypt4.hash(newPassword, 10);
      await storage.updateSuperAdmin(adminId, { passwordHash: newHash });
      res.json({ success: true, message: "Password changed successfully" });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  console.log("[SUPER-ADMIN] All super admin routes registered.");
}

// server/tenantAuth.ts
init_storage();
import jwt2 from "jsonwebtoken";
var JWT_SECRET2 = process.env.JWT_SECRET || "barmagly-super-admin-secret-key-2024";
var PUBLIC_ROUTES = [
  "/api/license/validate",
  "/api/auth/google",
  "/api/landing/subscribe",
  "/api/landing-page-config",
  "/api/store-public/",
  "/api/online-orders/public",
  "/api/stripe/webhook",
  "/api/stripe/publishable-key",
  "/api/payment-gateway/config",
  "/api/products/template",
  "/api/dashboard/subscriptions",
  "/api/caller-id/incoming",
  // Local FRITZ!Card bridge (secured by CALLER_ID_BRIDGE_SECRET)
  "/api/caller-id/active-calls",
  // HTTP polling fallback — tenantId required in query string
  "/api/push/vapid-public-key",
  // Public — needed for SW push subscription before auth
  "/api/push/subscribe"
  // Public — SW registers subscription before full auth
];
var PUBLIC_ROUTE_PATTERNS = [
  /^\/api\/store\/\d+\/menu$/
];
function isPublicRoute(path5) {
  if (PUBLIC_ROUTES.some((route) => path5.startsWith(route))) return true;
  if (PUBLIC_ROUTE_PATTERNS.some((pattern) => pattern.test(path5))) return true;
  return false;
}
var SEED_ROUTES = [
  "/api/admin/seed-pizza-lemon",
  "/api/admin/check-pizza-lemon",
  "/api/seed",
  "/api/fix-schema-and-seed",
  "/api/force-full-seed"
];
function isSeedRoute(path5) {
  return SEED_ROUTES.some((route) => path5.startsWith(route));
}
function tenantAuthMiddleware() {
  const isDev = process.env.NODE_ENV === "development";
  return async (req, res, next) => {
    if (!req.path.startsWith("/api")) {
      return next();
    }
    if (req.path.startsWith("/api/super-admin")) {
      return next();
    }
    if (isPublicRoute(req.path)) {
      return next();
    }
    if (isSeedRoute(req.path)) {
      if (isDev) return next();
      return res.status(403).json({ error: "Seed endpoints are disabled in production" });
    }
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.split(" ")[1];
        const decoded = jwt2.verify(token, JWT_SECRET2);
        const admin = await storage.getSuperAdmin(decoded.id);
        if (admin && admin.isActive) {
          const tenantId2 = req.query.tenantId ? Number(req.query.tenantId) : req.body?.tenantId ? Number(req.body.tenantId) : void 0;
          if (tenantId2) req.tenantId = tenantId2;
          return next();
        }
      } catch (_) {
      }
    }
    const tenantId = req.query.tenantId ? Number(req.query.tenantId) : req.body?.tenantId ? Number(req.body.tenantId) : void 0;
    const licenseKey = req.headers["x-license-key"];
    if (!tenantId && !licenseKey) {
      return res.status(401).json({ error: "Authentication required. Provide x-license-key header." });
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
      if (tenantId && license.tenantId !== tenantId) {
        return res.status(403).json({ error: "License key does not match the requested tenant" });
      }
      if (license.expiresAt && new Date(license.expiresAt) < /* @__PURE__ */ new Date()) {
        const isTrial = license.licenseKey.startsWith("TRIAL-");
        return res.status(401).json({
          error: isTrial ? "Your 14-day trial period has expired. Please subscribe to continue." : "License has expired",
          code: "LICENSE_EXPIRED",
          isTrial
        });
      }
      req.tenantId = license.tenantId;
      req.licenseKey = licenseKey;
      next();
    } catch (error) {
      console.error("[tenantAuth] Error validating license:", error);
      return res.status(500).json({ error: "Authentication error" });
    }
  };
}

// server/index.ts
import { runMigrations } from "stripe-replit-sync";

// server/webhookHandlers.ts
var WebhookHandlers = class {
  static async processWebhook(payload, signature) {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        "STRIPE WEBHOOK ERROR: Payload must be a Buffer. Received type: " + typeof payload + ". This usually means express.json() parsed the body before reaching this handler. FIX: Ensure webhook route is registered BEFORE app.use(express.json())."
      );
    }
    const sync = await getStripeSync();
    await sync.processWebhook(payload, signature);
  }
};

// server/index.ts
import * as fs5 from "fs";
import * as path4 from "path";
var app = express();
var log2 = console.log;
app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "unsafe-none");
  next();
});
function setupCors(app2) {
  app2.use((req, res, next) => {
    const origins = /* @__PURE__ */ new Set([
      "https://pos.barmagly.tech"
    ]);
    if (process.env.REPLIT_DEV_DOMAIN) {
      origins.add(`https://${process.env.REPLIT_DEV_DOMAIN}`);
      origins.add(`https://${process.env.REPLIT_DEV_DOMAIN}:5000`);
      origins.add(`https://${process.env.REPLIT_DEV_DOMAIN}:8080`);
      origins.add(`https://${process.env.REPLIT_DEV_DOMAIN}:3000`);
    }
    if (process.env.REPLIT_DOMAINS) {
      process.env.REPLIT_DOMAINS.split(",").forEach((d) => {
        origins.add(`https://${d.trim()}`);
      });
    }
    const origin = req.header("origin");
    const isLocalhost = origin?.startsWith("http://localhost:") || origin?.startsWith("http://127.0.0.1:");
    if (origin && (origins.has(origin) || isLocalhost)) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS"
      );
      res.header("Access-Control-Allow-Headers", "Content-Type, x-license-key");
      res.header("Access-Control-Allow-Credentials", "true");
    }
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });
}
function setupBodyParsing(app2) {
  app2.use(
    express.json({
      limit: "10mb",
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      }
    })
  );
  app2.use(express.urlencoded({ extended: false }));
}
function setupRequestLogging(app2) {
  app2.use((req, res, next) => {
    const start = Date.now();
    const path5 = req.path;
    let capturedJsonResponse = void 0;
    const originalResJson = res.json;
    res.json = function(bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };
    res.on("finish", () => {
      if (!path5.startsWith("/api")) return;
      const duration = Date.now() - start;
      let logLine = `${req.method} ${path5} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log2(logLine);
    });
    next();
  });
}
function getAppName() {
  try {
    const appJsonPath = path4.resolve(process.cwd(), "app.json");
    const appJsonContent = fs5.readFileSync(appJsonPath, "utf-8");
    const appJson = JSON.parse(appJsonContent);
    return appJson.expo?.name || "App Landing Page";
  } catch {
    return "App Landing Page";
  }
}
function serveExpoManifest(platform, res) {
  const manifestPath = path4.resolve(
    process.cwd(),
    "static-build",
    platform,
    "manifest.json"
  );
  if (!fs5.existsSync(manifestPath)) {
    return res.status(404).json({ error: `Manifest not found for platform: ${platform}` });
  }
  res.setHeader("expo-protocol-version", "1");
  res.setHeader("expo-sfv-version", "0");
  res.setHeader("content-type", "application/json");
  const manifest = fs5.readFileSync(manifestPath, "utf-8");
  res.send(manifest);
}
function serveLandingPage({
  req,
  res,
  appName
}) {
  const forwardedProto = req.header("x-forwarded-proto");
  const protocol = forwardedProto || req.protocol || "https";
  const forwardedHost = req.header("x-forwarded-host");
  const host = forwardedHost || req.get("host");
  const baseUrl = `${protocol}://${host}`;
  const expsUrl = `${host}`;
  log2(`baseUrl`, baseUrl);
  log2(`expsUrl`, expsUrl);
  const templatePath = path4.resolve(
    process.cwd(),
    "server",
    "templates",
    "landing-page.html"
  );
  const template = fs5.readFileSync(templatePath, "utf-8");
  let html = template.replace(/BASE_URL_PLACEHOLDER/g, baseUrl).replace(/EXPS_URL_PLACEHOLDER/g, expsUrl).replace(/APP_NAME_PLACEHOLDER/g, appName);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
}
function configureExpoAndLanding(app2) {
  const templatePath = path4.resolve(
    process.cwd(),
    "server",
    "templates",
    "landing-page.html"
  );
  const dashboardPath = path4.resolve(
    process.cwd(),
    "server",
    "templates",
    "dashboard.html"
  );
  const appName = getAppName();
  log2("Serving static Expo files with dynamic manifest routing");
  app2.use(async (req, res, next) => {
    if (req.path.startsWith("/api")) {
      return next();
    }
    if (req.path === "/favicon.ico") {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#0A0E17"/><text x="16" y="23" text-anchor="middle" font-size="20" fill="#2FD3C6">B</text></svg>`;
      res.setHeader("Content-Type", "image/svg+xml");
      return res.status(200).send(svg);
    }
    if (req.path === "/pos") {
      return res.redirect(301, "/app");
    }
    if (req.path === "/" || req.path === "/index.html") {
      return serveLandingPage({ req, res, appName });
    }
    if (req.path === "/app" || req.path === "/app/" || req.path === "/app/index.html") {
      const indexPath = path4.resolve(process.cwd(), "dist", "index.html");
      if (fs5.existsSync(indexPath)) {
        const html = fs5.readFileSync(indexPath, "utf-8");
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        return res.status(200).send(html);
      }
    }
    if (req.path === "/app/sw.js") {
      const swPath = path4.resolve(process.cwd(), "dist", "sw.js");
      if (fs5.existsSync(swPath)) {
        res.setHeader("Content-Type", "application/javascript");
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.setHeader("Service-Worker-Allowed", "/app/");
        return res.sendFile(swPath);
      }
    }
    if (req.path.startsWith("/super_admin")) {
      return res.redirect(301, req.url.replace("/super_admin", "/super-admin"));
    }
    if (req.path.startsWith("/super-admin")) {
      const superAdminTemplatePath = path4.resolve(
        process.cwd(),
        "server",
        "templates",
        req.path === "/super-admin/login" ? "super-admin-login.html" : "super-admin-dashboard.html"
      );
      try {
        const superAdminTemplate = fs5.readFileSync(superAdminTemplatePath, "utf-8");
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        return res.status(200).send(superAdminTemplate);
      } catch (err) {
        return res.status(404).send("Super Admin Template not found");
      }
    }
    if (req.path === "/dashboard") {
      const dbTemplate = fs5.readFileSync(dashboardPath, "utf-8");
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(200).send(dbTemplate);
    }
    const storeByIdMatch = req.path.match(/^\/store\/(\d+)$/);
    if (storeByIdMatch) {
      try {
        const tenantId = parseInt(storeByIdMatch[1], 10);
        const { storage: storage2 } = await Promise.resolve().then(() => (init_storage(), storage_exports));
        const tenant = await storage2.getTenant(tenantId);
        if (!tenant) {
          return res.status(404).send("<h1>Store not found</h1>");
        }
        const config = await storage2.getLandingPageConfig(tenantId);
        const storePath = path4.resolve(process.cwd(), "server", "templates", "restaurant-store.html");
        let html = fs5.readFileSync(storePath, "utf-8");
        const slug = config?.slug || `tenant-${tenantId}`;
        html = html.replace(/\{\{SLUG\}\}/g, slug);
        html = html.replace(/\{\{TENANT_ID\}\}/g, String(tenantId));
        html = html.replace(/\{\{PRIMARY_COLOR\}\}/g, config?.primaryColor || "#2FD3C6");
        html = html.replace(/\{\{ACCENT_COLOR\}\}/g, config?.accentColor || "#6366F1");
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        return res.status(200).send(html);
      } catch (err) {
        console.error("[store/:tenantId] Error:", err);
        return res.status(500).send("<h1>Server error</h1>");
      }
    }
    if (req.path !== "/landing" && req.path !== "/manifest") {
      return next();
    }
    const platform = req.header("expo-platform");
    if (platform && (platform === "ios" || platform === "android")) {
      return serveExpoManifest(platform, res);
    }
    if (req.path === "/landing") {
      return serveLandingPage({
        req,
        res,
        appName
      });
    }
    next();
  });
  app2.use("/assets", express.static(path4.resolve(process.cwd(), "assets")));
  app2.use("/uploads", express.static(path4.resolve(process.cwd(), "uploads")));
  app2.use("/objects", express.static(path4.resolve(process.cwd(), "uploads")));
  app2.use("/app/assets/images", express.static(path4.resolve(process.cwd(), "assets", "images")));
  app2.use("/app", express.static(path4.resolve(process.cwd(), "dist"), {
    setHeaders(res, filePath) {
      if (filePath.endsWith(".webmanifest")) {
        res.setHeader("Content-Type", "application/manifest+json");
      }
    }
  }));
  app2.use(express.static(path4.resolve(process.cwd(), "static-build")));
  const staticIndexPath = path4.resolve(process.cwd(), "dist", "index.html");
  app2.get("/app/{*splat}", (req, res, next) => {
    if (req.path.includes(".")) {
      return next();
    }
    if (fs5.existsSync(staticIndexPath)) {
      const html = fs5.readFileSync(staticIndexPath, "utf-8");
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(200).send(html);
    }
    next();
  });
  log2("Expo routing: Checking expo-platform header on / and /manifest");
}
function setupErrorHandler(app2) {
  app2.use((err, _req, res, next) => {
    const error = err;
    const status2 = error.status || error.statusCode || 500;
    const message = error.message || "Internal Server Error";
    console.error("Internal Server Error:", err);
    if (res.headersSent) {
      return next(err);
    }
    return res.status(status2).json({ message });
  });
}
async function initStripe() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    log2("DATABASE_URL not set, skipping Stripe init");
    return;
  }
  try {
    log2("Initializing Stripe schema...");
    await runMigrations({ databaseUrl });
    log2("Stripe schema ready");
    let stripeSync2, secretKey;
    try {
      stripeSync2 = await getStripeSync();
      secretKey = await getStripeSecretKey();
    } catch (connErr) {
      log2("Stripe connection not available, skipping:", connErr?.message || connErr);
      return;
    }
    if (!secretKey || secretKey.includes("dummy")) {
      log2("Stripe: Dummy or missing key detected. Skipping webhook setup and sync.");
      return;
    }
    log2("Setting up managed webhook...");
    const webhookBaseUrl = `https://${process.env.REPLIT_DOMAINS?.split(",")[0]}`;
    const webhookResult = await stripeSync2.findOrCreateManagedWebhook(
      `${webhookBaseUrl}/api/stripe/webhook`
    );
    log2(`Webhook configured: ${webhookResult?.webhook?.url || "ready"}`);
    log2("Syncing Stripe data...");
    stripeSync2.syncBackfill().then(() => log2("Stripe data synced")).catch((err) => log2("Error syncing Stripe data:", err));
  } catch (error) {
    log2("Stripe init skipped:", error?.message || error);
  }
}
function setupStripeWebhook(app2) {
  app2.post(
    "/api/stripe/webhook",
    express.raw({ type: "application/json" }),
    async (req, res) => {
      const signature = req.headers["stripe-signature"];
      if (!signature) {
        return res.status(400).json({ error: "Missing stripe-signature" });
      }
      try {
        const sig = Array.isArray(signature) ? signature[0] : signature;
        if (!Buffer.isBuffer(req.body)) {
          return res.status(500).json({ error: "Webhook processing error" });
        }
        await WebhookHandlers.processWebhook(req.body, sig);
        res.status(200).json({ received: true });
      } catch (error) {
        log2("Webhook error:", error.message);
        res.status(400).json({ error: "Webhook processing error" });
      }
    }
  );
}
function setupStripeRoutes(app2) {
  app2.get("/api/stripe/publishable-key", async (_req, res) => {
    try {
      const key = await getStripePublishableKey();
      res.json({ publishableKey: key });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/stripe/create-payment-intent", async (req, res) => {
    try {
      const { amount, currency = "chf", metadata } = req.body;
      if (!amount || amount <= 0) {
        return res.status(400).json({ error: "Valid amount is required" });
      }
      const stripe = await getUncachableStripeClient();
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount),
        currency,
        metadata: metadata || {},
        automatic_payment_methods: { enabled: true }
      });
      res.json({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/stripe/confirm-payment", async (req, res) => {
    try {
      const { paymentIntentId } = req.body;
      if (!paymentIntentId) {
        return res.status(400).json({ error: "paymentIntentId is required" });
      }
      const stripe = await getUncachableStripeClient();
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      res.json({
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/stripe/payment-methods", async (_req, res) => {
    try {
      res.json({
        methods: ["card"],
        supportedCards: ["visa", "mastercard", "amex"]
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/stripe/pos-charge", async (req, res) => {
    try {
      const { amount, currency = "chf", token, metadata } = req.body;
      if (!amount || amount <= 0) {
        return res.status(400).json({ error: "Valid amount is required" });
      }
      if (!token) {
        return res.status(400).json({ error: "Payment token is required" });
      }
      const stripe = await getUncachableStripeClient();
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount),
        currency,
        payment_method_data: {
          type: "card",
          card: { token }
        },
        confirm: true,
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: "never"
        },
        metadata: metadata || {}
      });
      res.json({
        success: paymentIntent.status === "succeeded",
        status: paymentIntent.status,
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency
      });
    } catch (e) {
      const errorMsg = e.type === "StripeCardError" ? e.message : e.message || "Payment processing failed";
      res.status(e.statusCode || 500).json({ error: errorMsg, code: e.code });
    }
  });
}
var paymentGatewayConfig = {
  enabledMethods: ["cash", "card", "mobile", "nfc"],
  stripe: {
    enabled: true,
    mode: "test",
    currency: "chf",
    autoCapture: true
  },
  nfc: {
    enabled: true,
    provider: "stripe_tap"
  },
  cash: {
    enabled: true,
    requireExactAmount: false
  },
  mobile: {
    enabled: true,
    providers: ["twint", "apple_pay", "google_pay"]
  }
};
function setupPaymentGatewayRoutes(app2) {
  app2.get("/api/payment-gateway/config", async (_req, res) => {
    try {
      let stripeStatus = "disconnected";
      let stripeMode = "test";
      try {
        const key = await getStripePublishableKey();
        if (key) {
          stripeStatus = "connected";
          stripeMode = key.startsWith("pk_live") ? "live" : "test";
        }
      } catch {
      }
      res.json({
        ...paymentGatewayConfig,
        stripe: {
          ...paymentGatewayConfig.stripe,
          status: stripeStatus,
          mode: stripeMode
        }
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.put("/api/payment-gateway/config", async (req, res) => {
    try {
      const updates = req.body;
      paymentGatewayConfig = { ...paymentGatewayConfig, ...updates };
      res.json(paymentGatewayConfig);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/payment-gateway/test-stripe", async (_req, res) => {
    try {
      const stripe = await getUncachableStripeClient();
      const balance = await stripe.balance.retrieve();
      const key = await getStripePublishableKey();
      res.json({
        success: true,
        mode: key.startsWith("pk_live") ? "live" : "test",
        currency: balance.available?.[0]?.currency || "chf",
        available: balance.available?.map((b) => ({ amount: b.amount, currency: b.currency }))
      });
    } catch (e) {
      res.json({ success: false, error: e.message });
    }
  });
}
(async () => {
  try {
    const { db: db2 } = await Promise.resolve().then(() => (init_db(), db_exports));
    const { sql: sql5 } = await import("drizzle-orm");
    await db2.execute(sql5.raw(`ALTER TABLE landing_page_config ADD COLUMN IF NOT EXISTS language text DEFAULT 'en'`));
  } catch (e) {
    console.log("[Migration] landing_page_config.language:", e.message);
  }
  setupCors(app);
  setupStripeWebhook(app);
  setupBodyParsing(app);
  setupRequestLogging(app);
  app.use(tenantAuthMiddleware());
  setupStripeRoutes(app);
  setupPaymentGatewayRoutes(app);
  configureExpoAndLanding(app);
  registerSuperAdminRoutes(app);
  const server = await registerRoutes(app);
  setupErrorHandler(app);
  const isProduction = process.env.NODE_ENV === "production";
  const port = parseInt(process.env.PORT || (isProduction ? "8081" : "5000"), 10);
  await new Promise((resolve3, reject) => {
    server.listen({ port, host: "0.0.0.0" }, () => {
      log2(`express server serving on port ${port}`);
      resolve3();
    }).on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        log2(`[ERROR] Port ${port} is already in use.`);
        process.exit(1);
      } else {
        reject(err);
      }
    });
  });
  await callerIdService.init(server);
  whatsappService.connect().catch((err) => log2("WhatsApp auto-connect error:", err));
  initStripe().catch((err) => log2("Stripe init error (non-fatal):", err));
  try {
    const { pool: pool2 } = await Promise.resolve().then(() => (init_db(), db_exports));
    await pool2.query(`
      CREATE TABLE IF NOT EXISTS platform_settings (
        id SERIAL PRIMARY KEY,
        key TEXT NOT NULL UNIQUE,
        value TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS platform_commissions (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        order_id INTEGER,
        sale_total DECIMAL(12,2) NOT NULL,
        commission_rate DECIMAL(5,2) NOT NULL,
        commission_amount DECIMAL(12,2) NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    log2("Platform tables ready");
  } catch (err) {
    log2("Error ensuring platform tables:", err);
  }
  try {
    const { pool: pool2 } = await Promise.resolve().then(() => (init_db(), db_exports));
    await pool2.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS is_addon boolean NOT NULL DEFAULT false;`);
    const callsCols = await pool2.query(`SELECT column_name FROM information_schema.columns WHERE table_name='calls'`);
    const callsHasPhone = callsCols.rows.some((r) => r.column_name === "phone_number");
    if (!callsHasPhone) {
      await pool2.query(`DROP TABLE IF EXISTS calls CASCADE;`);
      await pool2.query(`
        CREATE TABLE calls (
          id serial PRIMARY KEY,
          tenant_id integer,
          branch_id integer,
          phone_number text NOT NULL DEFAULT '',
          customer_id integer,
          status text NOT NULL DEFAULT 'missed',
          sale_id integer,
          created_at timestamp DEFAULT now()
        );
      `);
    } else {
      await pool2.query(`
        ALTER TABLE calls DROP CONSTRAINT IF EXISTS calls_tenant_id_fkey;
        ALTER TABLE calls DROP CONSTRAINT IF EXISTS calls_branch_id_fkey;
        ALTER TABLE calls DROP CONSTRAINT IF EXISTS calls_customer_id_fkey;
        ALTER TABLE calls DROP CONSTRAINT IF EXISTS calls_sale_id_fkey;
      `);
    }
    const vehiclesCols = await pool2.query(`SELECT column_name FROM information_schema.columns WHERE table_name='vehicles'`);
    const vehiclesHasPlate = vehiclesCols.rows.some((r) => r.column_name === "license_plate");
    if (!vehiclesHasPlate) {
      await pool2.query(`DROP TABLE IF EXISTS vehicles CASCADE;`);
      await pool2.query(`
        CREATE TABLE vehicles (
          id serial PRIMARY KEY,
          tenant_id integer REFERENCES tenants(id) ON DELETE CASCADE,
          branch_id integer REFERENCES branches(id) ON DELETE CASCADE,
          license_plate text NOT NULL DEFAULT '',
          make text,
          model text,
          color text,
          driver_name text,
          driver_phone text,
          is_active boolean DEFAULT true,
          notes text,
          created_at timestamp DEFAULT now()
        );
      `);
    }
    const printerCols = await pool2.query(`SELECT column_name FROM information_schema.columns WHERE table_name='printer_configs'`);
    const printerHasReceiptType = printerCols.rows.some((r) => r.column_name === "receipt_type");
    if (!printerHasReceiptType) {
      await pool2.query(`DROP TABLE IF EXISTS printer_configs CASCADE;`);
      await pool2.query(`
        CREATE TABLE printer_configs (
          id serial PRIMARY KEY,
          tenant_id integer NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          branch_id integer REFERENCES branches(id) ON DELETE CASCADE,
          receipt_type text NOT NULL DEFAULT 'check_out',
          printer_1 text,
          printer_1_copy boolean DEFAULT false,
          printer_2 text,
          printer_2_copy boolean DEFAULT false,
          paper_size text DEFAULT '80mm',
          is_active boolean DEFAULT true,
          updated_at timestamp DEFAULT now()
        );
      `);
    }
    const dailyCols = await pool2.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name='daily_closings'`);
    const dailyHasBranchId = dailyCols.rows.some((r) => r.column_name === "branch_id");
    if (!dailyHasBranchId) {
      await pool2.query(`DROP TABLE IF EXISTS daily_closings CASCADE;`);
      await pool2.query(`
        CREATE TABLE daily_closings (
          id serial PRIMARY KEY,
          tenant_id integer NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          branch_id integer REFERENCES branches(id) ON DELETE CASCADE,
          employee_id integer REFERENCES employees(id) ON DELETE CASCADE,
          closing_date text NOT NULL DEFAULT '',
          total_sales numeric(12,2) DEFAULT 0,
          total_cash numeric(12,2) DEFAULT 0,
          total_card numeric(12,2) DEFAULT 0,
          total_mobile numeric(12,2) DEFAULT 0,
          total_transactions integer DEFAULT 0,
          total_returns numeric(12,2) DEFAULT 0,
          total_discounts numeric(12,2) DEFAULT 0,
          opening_cash numeric(12,2) DEFAULT 0,
          closing_cash numeric(12,2) DEFAULT 0,
          notes text,
          status text DEFAULT 'closed',
          created_at timestamp DEFAULT now()
        );
      `);
    }
    const monthlyCols = await pool2.query(`SELECT column_name FROM information_schema.columns WHERE table_name='monthly_closings'`);
    const monthlyHasBranchId = monthlyCols.rows.some((r) => r.column_name === "branch_id");
    if (!monthlyHasBranchId) {
      await pool2.query(`DROP TABLE IF EXISTS monthly_closings CASCADE;`);
      await pool2.query(`
        CREATE TABLE monthly_closings (
          id serial PRIMARY KEY,
          tenant_id integer NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          branch_id integer REFERENCES branches(id) ON DELETE CASCADE,
          employee_id integer REFERENCES employees(id) ON DELETE CASCADE,
          closing_month text NOT NULL DEFAULT '',
          total_sales numeric(12,2) DEFAULT 0,
          total_cash numeric(12,2) DEFAULT 0,
          total_card numeric(12,2) DEFAULT 0,
          total_mobile numeric(12,2) DEFAULT 0,
          total_transactions integer DEFAULT 0,
          total_returns numeric(12,2) DEFAULT 0,
          total_discounts numeric(12,2) DEFAULT 0,
          total_expenses numeric(12,2) DEFAULT 0,
          net_revenue numeric(12,2) DEFAULT 0,
          notes text,
          status text DEFAULT 'closed',
          created_at timestamp DEFAULT now()
        );
      `);
    }
    log2("Schema migration complete");
  } catch (err) {
    log2("Schema migration error (non-fatal):", err);
  }
  try {
    const { storage: storage2 } = await Promise.resolve().then(() => (init_storage(), storage_exports));
    const adminEmail = "admin@barmagly.com";
    const existingAdmin = await storage2.getSuperAdminByEmail(adminEmail);
    if (!existingAdmin) {
      await storage2.createSuperAdmin({
        name: "Super Admin",
        email: adminEmail,
        passwordHash: "$2b$10$OoKOgYj3UlErVOmwqm4rnOpZLdqpLDF3zBiO4VuXJQa56F0DLlesK",
        role: "super_admin",
        isActive: true
      });
      log2("Super admin created");
    }
  } catch (err) {
    log2("Error creating super admin:", err);
  }
  try {
    const { seedPizzaLemon: seedPizzaLemon2 } = await Promise.resolve().then(() => (init_seedPizzaLemon(), seedPizzaLemon_exports));
    await seedPizzaLemon2();
  } catch (err) {
    log2("Error seeding Pizza Lemon data:", err);
  }
  if (!isProduction) {
    const http = await import("http");
    const expoPort = 8080;
    const proxy = http.createServer((req, res) => {
      const targetPort = (req.url || "").startsWith("/api") ? port : expoPort;
      const options = {
        hostname: "127.0.0.1",
        port: targetPort,
        path: req.url,
        method: req.method,
        headers: req.headers
      };
      const proxyReq = http.request(options, (proxyRes) => {
        res.writeHead(proxyRes.statusCode || 500, proxyRes.headers);
        proxyRes.pipe(res, { end: true });
      });
      proxyReq.on("error", () => {
        res.writeHead(502);
        res.end("Backend not ready");
      });
      req.pipe(proxyReq, { end: true });
    });
    proxy.listen(8081, "0.0.0.0", () => {
      log2(`proxy on port 8081 \u2192 Expo:${expoPort} (API\u2192${port}) (default preview)`);
    });
  }
})();
