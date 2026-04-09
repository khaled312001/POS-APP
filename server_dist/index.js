"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc3) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc3 = __getOwnPropDesc(from, key)) || desc3.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  activityLog: () => activityLog,
  branches: () => branches,
  calls: () => calls,
  cashDrawerOperations: () => cashDrawerOperations,
  categories: () => categories,
  customerAddresses: () => customerAddresses,
  customerSessions: () => customerSessions,
  customers: () => customers,
  dailyClosings: () => dailyClosings,
  dailySequences: () => dailySequences,
  deliveryZones: () => deliveryZones,
  driverLocations: () => driverLocations,
  employeeCommissions: () => employeeCommissions,
  employees: () => employees,
  expenses: () => expenses,
  insertActivityLogSchema: () => insertActivityLogSchema,
  insertBranchSchema: () => insertBranchSchema,
  insertCallSchema: () => insertCallSchema,
  insertCashDrawerOperationSchema: () => insertCashDrawerOperationSchema,
  insertCategorySchema: () => insertCategorySchema,
  insertCustomerAddressSchema: () => insertCustomerAddressSchema,
  insertCustomerSchema: () => insertCustomerSchema,
  insertCustomerSessionSchema: () => insertCustomerSessionSchema,
  insertDailyClosingSchema: () => insertDailyClosingSchema,
  insertDeliveryZoneSchema: () => insertDeliveryZoneSchema,
  insertDriverLocationSchema: () => insertDriverLocationSchema,
  insertEmployeeCommissionSchema: () => insertEmployeeCommissionSchema,
  insertEmployeeSchema: () => insertEmployeeSchema,
  insertExpenseSchema: () => insertExpenseSchema,
  insertInventoryMovementSchema: () => insertInventoryMovementSchema,
  insertInventorySchema: () => insertInventorySchema,
  insertKitchenOrderSchema: () => insertKitchenOrderSchema,
  insertLandingPageConfigSchema: () => insertLandingPageConfigSchema,
  insertLicenseKeySchema: () => insertLicenseKeySchema,
  insertLoyaltyTransactionSchema: () => insertLoyaltyTransactionSchema,
  insertMonthlyClosingSchema: () => insertMonthlyClosingSchema,
  insertNotificationSchema: () => insertNotificationSchema,
  insertOnlineOrderSchema: () => insertOnlineOrderSchema,
  insertOrderRatingSchema: () => insertOrderRatingSchema,
  insertOtpVerificationSchema: () => insertOtpVerificationSchema,
  insertPlatformCommissionSchema: () => insertPlatformCommissionSchema,
  insertPlatformSettingSchema: () => insertPlatformSettingSchema,
  insertPrinterConfigSchema: () => insertPrinterConfigSchema,
  insertProductBatchSchema: () => insertProductBatchSchema,
  insertProductSchema: () => insertProductSchema,
  insertPromoCodeSchema: () => insertPromoCodeSchema,
  insertPromoCodeUsageSchema: () => insertPromoCodeUsageSchema,
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
  insertWalletTransactionSchema: () => insertWalletTransactionSchema,
  insertWarehouseSchema: () => insertWarehouseSchema,
  insertWarehouseTransferSchema: () => insertWarehouseTransferSchema,
  inventory: () => inventory,
  inventoryMovements: () => inventoryMovements,
  kitchenOrders: () => kitchenOrders,
  landingPageConfig: () => landingPageConfig,
  licenseKeys: () => licenseKeys,
  loyaltyTransactions: () => loyaltyTransactions,
  monthlyClosings: () => monthlyClosings,
  notifications: () => notifications,
  onlineOrders: () => onlineOrders,
  orderRatings: () => orderRatings,
  otpVerifications: () => otpVerifications,
  platformCommissions: () => platformCommissions,
  platformSettings: () => platformSettings,
  printerConfigs: () => printerConfigs,
  productBatches: () => productBatches,
  products: () => products,
  promoCodeUsages: () => promoCodeUsages,
  promoCodes: () => promoCodes,
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
  walletTransactions: () => walletTransactions,
  warehouseTransfers: () => warehouseTransfers,
  warehouses: () => warehouses
});
var import_mysql_core, import_drizzle_zod, branches, employees, categories, products, inventory, customers, sales, saleItems, calls, suppliers, purchaseOrders, purchaseOrderItems, shifts, notifications, expenses, tables, kitchenOrders, subscriptionPlans, subscriptions, activityLog, returns, returnItems, syncQueue, cashDrawerOperations, warehouses, warehouseTransfers, productBatches, inventoryMovements, stockCounts, stockCountItems, supplierContracts, employeeCommissions, superAdmins, tenants, tenantSubscriptions, licenseKeys, tenantNotifications, platformSettings, platformCommissions, onlineOrders, landingPageConfig, vehicles, printerConfigs, dailyClosings, monthlyClosings, dailySequences, customerAddresses, promoCodes, promoCodeUsages, driverLocations, loyaltyTransactions, walletTransactions, orderRatings, customerSessions, otpVerifications, deliveryZones, insertBranchSchema, insertEmployeeSchema, insertCategorySchema, insertProductSchema, insertInventorySchema, insertCustomerSchema, insertSaleSchema, insertSaleItemSchema, insertSupplierSchema, insertPurchaseOrderSchema, insertPurchaseOrderItemSchema, insertShiftSchema, insertNotificationSchema, insertExpenseSchema, insertCallSchema, insertTableSchema, insertKitchenOrderSchema, insertSubscriptionPlanSchema, insertSubscriptionSchema, insertActivityLogSchema, insertReturnSchema, insertReturnItemSchema, insertCashDrawerOperationSchema, insertWarehouseSchema, insertWarehouseTransferSchema, insertProductBatchSchema, insertInventoryMovementSchema, insertStockCountSchema, insertStockCountItemSchema, insertSupplierContractSchema, insertEmployeeCommissionSchema, insertSuperAdminSchema, insertTenantSchema, insertTenantSubscriptionSchema, insertLicenseKeySchema, insertTenantNotificationSchema, insertOnlineOrderSchema, insertLandingPageConfigSchema, insertPlatformSettingSchema, insertPlatformCommissionSchema, insertVehicleSchema, insertPrinterConfigSchema, insertDailyClosingSchema, insertMonthlyClosingSchema, insertCustomerAddressSchema, insertPromoCodeSchema, insertPromoCodeUsageSchema, insertDriverLocationSchema, insertLoyaltyTransactionSchema, insertWalletTransactionSchema, insertOrderRatingSchema, insertCustomerSessionSchema, insertOtpVerificationSchema, insertDeliveryZoneSchema;
var init_schema = __esm({
  "shared/schema.ts"() {
    "use strict";
    import_mysql_core = require("drizzle-orm/mysql-core");
    import_drizzle_zod = require("drizzle-zod");
    branches = (0, import_mysql_core.mysqlTable)("branches", {
      id: (0, import_mysql_core.serial)("id").primaryKey(),
      tenantId: (0, import_mysql_core.int)("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
      // Added for multi-tenancy
      name: (0, import_mysql_core.text)("name").notNull(),
      address: (0, import_mysql_core.text)("address"),
      phone: (0, import_mysql_core.text)("phone"),
      email: (0, import_mysql_core.text)("email"),
      logo: (0, import_mysql_core.text)("logo"),
      isActive: (0, import_mysql_core.boolean)("is_active").default(true),
      isMain: (0, import_mysql_core.boolean)("is_main").default(false),
      currency: (0, import_mysql_core.text)("currency").default("CHF"),
      taxRate: (0, import_mysql_core.decimal)("tax_rate", { precision: 5, scale: 2 }).default("0"),
      deliveryFee: (0, import_mysql_core.decimal)("delivery_fee", { precision: 10, scale: 2 }).default("0"),
      createdAt: (0, import_mysql_core.timestamp)("created_at").defaultNow(),
      updatedAt: (0, import_mysql_core.timestamp)("updated_at").defaultNow()
    });
    employees = (0, import_mysql_core.mysqlTable)("employees", {
      id: (0, import_mysql_core.serial)("id").primaryKey(),
      tenantId: (0, import_mysql_core.int)("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
      name: (0, import_mysql_core.text)("name").notNull(),
      email: (0, import_mysql_core.text)("email"),
      phone: (0, import_mysql_core.text)("phone"),
      pin: (0, import_mysql_core.text)("pin").notNull(),
      role: (0, import_mysql_core.text)("role").notNull().default("cashier"),
      branchId: (0, import_mysql_core.int)("branch_id").references(() => branches.id, { onDelete: "cascade" }),
      isActive: (0, import_mysql_core.boolean)("is_active").default(true),
      hourlyRate: (0, import_mysql_core.decimal)("hourly_rate", { precision: 10, scale: 2 }),
      commissionRate: (0, import_mysql_core.decimal)("commission_rate", { precision: 5, scale: 2 }).default("0"),
      avatar: (0, import_mysql_core.text)("avatar"),
      permissions: (0, import_mysql_core.json)("permissions").$type().default([]),
      createdAt: (0, import_mysql_core.timestamp)("created_at").defaultNow(),
      updatedAt: (0, import_mysql_core.timestamp)("updated_at").defaultNow()
    });
    categories = (0, import_mysql_core.mysqlTable)("categories", {
      id: (0, import_mysql_core.serial)("id").primaryKey(),
      tenantId: (0, import_mysql_core.int)("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
      // Added for multi-tenancy
      name: (0, import_mysql_core.text)("name").notNull(),
      nameAr: (0, import_mysql_core.text)("name_ar"),
      color: (0, import_mysql_core.text)("color").default("#7C3AED"),
      icon: (0, import_mysql_core.text)("icon").default("grid"),
      image: (0, import_mysql_core.text)("image"),
      parentId: (0, import_mysql_core.int)("parent_id"),
      sortOrder: (0, import_mysql_core.int)("sort_order").default(0),
      isActive: (0, import_mysql_core.boolean)("is_active").default(true),
      createdAt: (0, import_mysql_core.timestamp)("created_at").defaultNow()
    });
    products = (0, import_mysql_core.mysqlTable)("products", {
      id: (0, import_mysql_core.serial)("id").primaryKey(),
      tenantId: (0, import_mysql_core.int)("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
      // Added for multi-tenancy
      name: (0, import_mysql_core.text)("name").notNull(),
      nameAr: (0, import_mysql_core.text)("name_ar"),
      description: (0, import_mysql_core.text)("description"),
      sku: (0, import_mysql_core.text)("sku").unique(),
      barcode: (0, import_mysql_core.text)("barcode"),
      categoryId: (0, import_mysql_core.int)("category_id").references(() => categories.id, { onDelete: "cascade" }),
      price: (0, import_mysql_core.decimal)("price", { precision: 10, scale: 2 }).notNull(),
      costPrice: (0, import_mysql_core.decimal)("cost_price", { precision: 10, scale: 2 }),
      image: (0, import_mysql_core.text)("image"),
      unit: (0, import_mysql_core.text)("unit").default("piece"),
      taxable: (0, import_mysql_core.boolean)("taxable").default(true),
      trackInventory: (0, import_mysql_core.boolean)("track_inventory").default(true),
      isActive: (0, import_mysql_core.boolean)("is_active").default(true),
      expiryDate: (0, import_mysql_core.timestamp)("expiry_date"),
      modifiers: (0, import_mysql_core.json)("modifiers").$type().default([]),
      variants: (0, import_mysql_core.json)("variants").$type().default([]),
      isAddon: (0, import_mysql_core.boolean)("is_addon").default(false),
      createdAt: (0, import_mysql_core.timestamp)("created_at").defaultNow(),
      updatedAt: (0, import_mysql_core.timestamp)("updated_at").defaultNow()
    });
    inventory = (0, import_mysql_core.mysqlTable)("inventory", {
      id: (0, import_mysql_core.serial)("id").primaryKey(),
      productId: (0, import_mysql_core.int)("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
      branchId: (0, import_mysql_core.int)("branch_id").references(() => branches.id, { onDelete: "cascade" }).notNull(),
      quantity: (0, import_mysql_core.int)("quantity").default(0),
      lowStockThreshold: (0, import_mysql_core.int)("low_stock_threshold").default(10),
      reorderPoint: (0, import_mysql_core.int)("reorder_point").default(5),
      reorderQuantity: (0, import_mysql_core.int)("reorder_quantity").default(20),
      lastRestocked: (0, import_mysql_core.timestamp)("last_restocked"),
      updatedAt: (0, import_mysql_core.timestamp)("updated_at").defaultNow()
    });
    customers = (0, import_mysql_core.mysqlTable)("customers", {
      id: (0, import_mysql_core.serial)("id").primaryKey(),
      tenantId: (0, import_mysql_core.int)("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
      // Added for multi-tenancy
      name: (0, import_mysql_core.text)("name").notNull(),
      email: (0, import_mysql_core.text)("email"),
      phone: (0, import_mysql_core.text)("phone"),
      address: (0, import_mysql_core.text)("address"),
      loyaltyPoints: (0, import_mysql_core.int)("loyalty_points").default(0),
      totalSpent: (0, import_mysql_core.decimal)("total_spent", { precision: 12, scale: 2 }).default("0"),
      visitCount: (0, import_mysql_core.int)("visit_count").default(0),
      notes: (0, import_mysql_core.text)("notes"),
      creditBalance: (0, import_mysql_core.decimal)("credit_balance", { precision: 10, scale: 2 }).default("0"),
      isActive: (0, import_mysql_core.boolean)("is_active").default(true),
      // ── Extended fields from CSV import ──
      customerNr: (0, import_mysql_core.int)("customer_nr"),
      salutation: (0, import_mysql_core.text)("salutation"),
      firstName: (0, import_mysql_core.text)("first_name"),
      lastName: (0, import_mysql_core.text)("last_name"),
      street: (0, import_mysql_core.text)("street"),
      streetNr: (0, import_mysql_core.text)("street_nr"),
      houseNr: (0, import_mysql_core.text)("house_nr"),
      city: (0, import_mysql_core.text)("city"),
      postalCode: (0, import_mysql_core.text)("postal_code"),
      company: (0, import_mysql_core.text)("company"),
      zhd: (0, import_mysql_core.text)("zhd"),
      howToGo: (0, import_mysql_core.text)("how_to_go"),
      screenInfo: (0, import_mysql_core.text)("screen_info"),
      source: (0, import_mysql_core.text)("source"),
      firstOrderDate: (0, import_mysql_core.text)("first_order_date"),
      lastOrderDate: (0, import_mysql_core.text)("last_order_date"),
      legacyTotalSpent: (0, import_mysql_core.decimal)("legacy_total_spent", { precision: 12, scale: 2 }).default("0"),
      averageOrderValue: (0, import_mysql_core.decimal)("average_order_value", { precision: 10, scale: 2 }).default("0"),
      orderCount: (0, import_mysql_core.int)("order_count").default(0),
      legacyRef: (0, import_mysql_core.text)("legacy_ref"),
      // ── Additional raw fields from KUNDEN CSV ──
      quadrat: (0, import_mysql_core.text)("quadrat"),
      r1: (0, import_mysql_core.text)("r1"),
      r3: (0, import_mysql_core.text)("r3"),
      r4: (0, import_mysql_core.text)("r4"),
      r5: (0, import_mysql_core.text)("r5"),
      r8: (0, import_mysql_core.text)("r8"),
      r9: (0, import_mysql_core.text)("r9"),
      r10: (0, import_mysql_core.text)("r10"),
      r14: (0, import_mysql_core.decimal)("r14", { precision: 12, scale: 2 }),
      r15: (0, import_mysql_core.decimal)("r15", { precision: 12, scale: 2 }),
      r16: (0, import_mysql_core.boolean)("r16").default(false),
      r17: (0, import_mysql_core.boolean)("r17").default(false),
      r18: (0, import_mysql_core.boolean)("r18").default(false),
      r19: (0, import_mysql_core.boolean)("r19").default(false),
      r20: (0, import_mysql_core.boolean)("r20").default(false),
      // ── Delivery Platform Extensions ──
      hasAccount: (0, import_mysql_core.boolean)("has_account").default(false),
      passwordHash: (0, import_mysql_core.text)("password_hash"),
      dateOfBirth: (0, import_mysql_core.text)("date_of_birth"),
      gender: (0, import_mysql_core.text)("gender"),
      preferredLanguage: (0, import_mysql_core.text)("preferred_language").default("en"),
      walletBalance: (0, import_mysql_core.decimal)("wallet_balance", { precision: 10, scale: 2 }).default("0"),
      totalOrdersDelivery: (0, import_mysql_core.int)("total_orders_delivery").default(0),
      totalOrdersPickup: (0, import_mysql_core.int)("total_orders_pickup").default(0),
      referralCode: (0, import_mysql_core.varchar)("referral_code", { length: 16 }),
      referredByCode: (0, import_mysql_core.varchar)("referred_by_code", { length: 16 }),
      fcmToken: (0, import_mysql_core.text)("fcm_token"),
      loyaltyTier: (0, import_mysql_core.text)("loyalty_tier").default("bronze"),
      createdAt: (0, import_mysql_core.timestamp)("created_at").defaultNow(),
      updatedAt: (0, import_mysql_core.timestamp)("updated_at").defaultNow()
    });
    sales = (0, import_mysql_core.mysqlTable)("sales", {
      id: (0, import_mysql_core.serial)("id").primaryKey(),
      receiptNumber: (0, import_mysql_core.text)("receipt_number").notNull().unique(),
      branchId: (0, import_mysql_core.int)("branch_id").references(() => branches.id, { onDelete: "cascade" }),
      employeeId: (0, import_mysql_core.int)("employee_id").references(() => employees.id, { onDelete: "cascade" }),
      customerId: (0, import_mysql_core.int)("customer_id").references(() => customers.id, { onDelete: "cascade" }),
      subtotal: (0, import_mysql_core.decimal)("subtotal", { precision: 12, scale: 2 }).notNull(),
      taxAmount: (0, import_mysql_core.decimal)("tax_amount", { precision: 10, scale: 2 }).default("0"),
      serviceFeeAmount: (0, import_mysql_core.decimal)("service_fee_amount", { precision: 10, scale: 2 }).default("0"),
      discountAmount: (0, import_mysql_core.decimal)("discount_amount", { precision: 10, scale: 2 }).default("0"),
      totalAmount: (0, import_mysql_core.decimal)("total_amount", { precision: 12, scale: 2 }).notNull(),
      paymentMethod: (0, import_mysql_core.text)("payment_method").notNull().default("cash"),
      paymentStatus: (0, import_mysql_core.text)("payment_status").default("completed"),
      status: (0, import_mysql_core.text)("status").default("completed"),
      notes: (0, import_mysql_core.text)("notes"),
      tipAmount: (0, import_mysql_core.decimal)("tip_amount", { precision: 10, scale: 2 }).default("0"),
      changeAmount: (0, import_mysql_core.decimal)("change_amount", { precision: 10, scale: 2 }).default("0"),
      tableNumber: (0, import_mysql_core.text)("table_number"),
      orderType: (0, import_mysql_core.text)("order_type").default("dine_in"),
      vehicleId: (0, import_mysql_core.int)("vehicle_id"),
      paymentDetails: (0, import_mysql_core.json)("payment_details").$type(),
      createdAt: (0, import_mysql_core.timestamp)("created_at").defaultNow()
    });
    saleItems = (0, import_mysql_core.mysqlTable)("sale_items", {
      id: (0, import_mysql_core.serial)("id").primaryKey(),
      saleId: (0, import_mysql_core.int)("sale_id").references(() => sales.id, { onDelete: "cascade" }).notNull(),
      productId: (0, import_mysql_core.int)("product_id").references(() => products.id, { onDelete: "set null" }),
      productName: (0, import_mysql_core.text)("product_name").notNull(),
      quantity: (0, import_mysql_core.int)("quantity").notNull(),
      unitPrice: (0, import_mysql_core.decimal)("unit_price", { precision: 10, scale: 2 }).notNull(),
      discount: (0, import_mysql_core.decimal)("discount", { precision: 10, scale: 2 }).default("0"),
      total: (0, import_mysql_core.decimal)("total", { precision: 10, scale: 2 }).notNull(),
      modifiers: (0, import_mysql_core.json)("modifiers").$type().default([]),
      notes: (0, import_mysql_core.text)("notes")
    });
    calls = (0, import_mysql_core.mysqlTable)("calls", {
      id: (0, import_mysql_core.serial)("id").primaryKey(),
      tenantId: (0, import_mysql_core.int)("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
      branchId: (0, import_mysql_core.int)("branch_id").references(() => branches.id, { onDelete: "cascade" }),
      phoneNumber: (0, import_mysql_core.text)("phone_number").notNull(),
      customerId: (0, import_mysql_core.int)("customer_id").references(() => customers.id, { onDelete: "set null" }),
      status: (0, import_mysql_core.text)("status").notNull().default("missed"),
      // answered, missed
      saleId: (0, import_mysql_core.int)("sale_id").references(() => sales.id, { onDelete: "set null" }),
      createdAt: (0, import_mysql_core.timestamp)("created_at").defaultNow()
    });
    suppliers = (0, import_mysql_core.mysqlTable)("suppliers", {
      id: (0, import_mysql_core.serial)("id").primaryKey(),
      tenantId: (0, import_mysql_core.int)("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
      // Added for multi-tenancy
      name: (0, import_mysql_core.text)("name").notNull(),
      contactName: (0, import_mysql_core.text)("contact_name"),
      email: (0, import_mysql_core.text)("email"),
      phone: (0, import_mysql_core.text)("phone"),
      address: (0, import_mysql_core.text)("address"),
      paymentTerms: (0, import_mysql_core.text)("payment_terms"),
      balance: (0, import_mysql_core.decimal)("balance", { precision: 12, scale: 2 }).default("0"),
      isActive: (0, import_mysql_core.boolean)("is_active").default(true),
      createdAt: (0, import_mysql_core.timestamp)("created_at").defaultNow(),
      updatedAt: (0, import_mysql_core.timestamp)("updated_at").defaultNow()
    });
    purchaseOrders = (0, import_mysql_core.mysqlTable)("purchase_orders", {
      id: (0, import_mysql_core.serial)("id").primaryKey(),
      orderNumber: (0, import_mysql_core.text)("order_number").notNull().unique(),
      supplierId: (0, import_mysql_core.int)("supplier_id").references(() => suppliers.id, { onDelete: "cascade" }).notNull(),
      branchId: (0, import_mysql_core.int)("branch_id").references(() => branches.id, { onDelete: "cascade" }),
      status: (0, import_mysql_core.text)("status").default("pending"),
      totalAmount: (0, import_mysql_core.decimal)("total_amount", { precision: 12, scale: 2 }).default("0"),
      notes: (0, import_mysql_core.text)("notes"),
      expectedDate: (0, import_mysql_core.timestamp)("expected_date"),
      receivedDate: (0, import_mysql_core.timestamp)("received_date"),
      createdAt: (0, import_mysql_core.timestamp)("created_at").defaultNow()
    });
    purchaseOrderItems = (0, import_mysql_core.mysqlTable)("purchase_order_items", {
      id: (0, import_mysql_core.serial)("id").primaryKey(),
      purchaseOrderId: (0, import_mysql_core.int)("purchase_order_id").references(() => purchaseOrders.id, { onDelete: "cascade" }).notNull(),
      productId: (0, import_mysql_core.int)("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
      quantity: (0, import_mysql_core.int)("quantity").notNull(),
      unitCost: (0, import_mysql_core.decimal)("unit_cost", { precision: 10, scale: 2 }).notNull(),
      receivedQuantity: (0, import_mysql_core.int)("received_quantity").default(0),
      total: (0, import_mysql_core.decimal)("total", { precision: 10, scale: 2 }).notNull()
    });
    shifts = (0, import_mysql_core.mysqlTable)("shifts", {
      id: (0, import_mysql_core.serial)("id").primaryKey(),
      employeeId: (0, import_mysql_core.int)("employee_id").references(() => employees.id, { onDelete: "cascade" }).notNull(),
      branchId: (0, import_mysql_core.int)("branch_id").references(() => branches.id, { onDelete: "cascade" }),
      startTime: (0, import_mysql_core.timestamp)("start_time").defaultNow(),
      endTime: (0, import_mysql_core.timestamp)("end_time"),
      expectedDurationHours: (0, import_mysql_core.decimal)("expected_duration_hours", { precision: 4, scale: 1 }).default("8"),
      openingCash: (0, import_mysql_core.decimal)("opening_cash", { precision: 10, scale: 2 }).default("0"),
      closingCash: (0, import_mysql_core.decimal)("closing_cash", { precision: 10, scale: 2 }),
      totalSales: (0, import_mysql_core.decimal)("total_sales", { precision: 12, scale: 2 }).default("0"),
      totalTransactions: (0, import_mysql_core.int)("total_transactions").default(0),
      totalReturns: (0, import_mysql_core.int)("total_returns").default(0),
      totalDiscounts: (0, import_mysql_core.decimal)("total_discounts", { precision: 10, scale: 2 }).default("0"),
      status: (0, import_mysql_core.text)("status").default("open"),
      notes: (0, import_mysql_core.text)("notes"),
      breakMinutes: (0, import_mysql_core.int)("break_minutes").default(0),
      overtimeMinutes: (0, import_mysql_core.int)("overtime_minutes").default(0)
    });
    notifications = (0, import_mysql_core.mysqlTable)("notifications", {
      id: (0, import_mysql_core.serial)("id").primaryKey(),
      recipientId: (0, import_mysql_core.int)("recipient_id").references(() => employees.id, { onDelete: "cascade" }).notNull(),
      senderId: (0, import_mysql_core.int)("sender_id").references(() => employees.id, { onDelete: "cascade" }),
      type: (0, import_mysql_core.text)("type").notNull(),
      title: (0, import_mysql_core.text)("title").notNull(),
      message: (0, import_mysql_core.text)("message").notNull(),
      entityType: (0, import_mysql_core.text)("entity_type"),
      entityId: (0, import_mysql_core.int)("entity_id"),
      isRead: (0, import_mysql_core.boolean)("is_read").default(false),
      priority: (0, import_mysql_core.text)("priority").default("normal"),
      createdAt: (0, import_mysql_core.timestamp)("created_at").defaultNow()
    });
    expenses = (0, import_mysql_core.mysqlTable)("expenses", {
      id: (0, import_mysql_core.serial)("id").primaryKey(),
      tenantId: (0, import_mysql_core.int)("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
      // Added for multi-tenancy
      branchId: (0, import_mysql_core.int)("branch_id").references(() => branches.id, { onDelete: "cascade" }),
      category: (0, import_mysql_core.text)("category").notNull(),
      amount: (0, import_mysql_core.decimal)("amount", { precision: 10, scale: 2 }).notNull(),
      description: (0, import_mysql_core.text)("description"),
      date: (0, import_mysql_core.timestamp)("date").defaultNow(),
      employeeId: (0, import_mysql_core.int)("employee_id").references(() => employees.id, { onDelete: "cascade" }),
      createdAt: (0, import_mysql_core.timestamp)("created_at").defaultNow()
    });
    tables = (0, import_mysql_core.mysqlTable)("tables", {
      id: (0, import_mysql_core.serial)("id").primaryKey(),
      branchId: (0, import_mysql_core.int)("branch_id").references(() => branches.id, { onDelete: "cascade" }),
      name: (0, import_mysql_core.text)("name").notNull(),
      capacity: (0, import_mysql_core.int)("capacity").default(4),
      status: (0, import_mysql_core.text)("status").default("available"),
      currentOrderId: (0, import_mysql_core.int)("current_order_id"),
      posX: (0, import_mysql_core.int)("pos_x").default(0),
      posY: (0, import_mysql_core.int)("pos_y").default(0),
      createdAt: (0, import_mysql_core.timestamp)("created_at").defaultNow()
    });
    kitchenOrders = (0, import_mysql_core.mysqlTable)("kitchen_orders", {
      id: (0, import_mysql_core.serial)("id").primaryKey(),
      saleId: (0, import_mysql_core.int)("sale_id").references(() => sales.id, { onDelete: "cascade" }).notNull(),
      branchId: (0, import_mysql_core.int)("branch_id").references(() => branches.id, { onDelete: "cascade" }),
      tableNumber: (0, import_mysql_core.text)("table_number"),
      status: (0, import_mysql_core.text)("status").default("pending"),
      items: (0, import_mysql_core.json)("items").$type().default([]),
      priority: (0, import_mysql_core.text)("priority").default("normal"),
      createdAt: (0, import_mysql_core.timestamp)("created_at").defaultNow(),
      updatedAt: (0, import_mysql_core.timestamp)("updated_at").defaultNow()
    });
    subscriptionPlans = (0, import_mysql_core.mysqlTable)("subscription_plans", {
      id: (0, import_mysql_core.serial)("id").primaryKey(),
      name: (0, import_mysql_core.text)("name").notNull(),
      description: (0, import_mysql_core.text)("description"),
      price: (0, import_mysql_core.decimal)("price", { precision: 10, scale: 2 }).notNull(),
      interval: (0, import_mysql_core.text)("interval").default("monthly"),
      features: (0, import_mysql_core.json)("features").$type().default([]),
      isActive: (0, import_mysql_core.boolean)("is_active").default(true),
      createdAt: (0, import_mysql_core.timestamp)("created_at").defaultNow()
    });
    subscriptions = (0, import_mysql_core.mysqlTable)("subscriptions", {
      id: (0, import_mysql_core.serial)("id").primaryKey(),
      customerId: (0, import_mysql_core.int)("customer_id").references(() => customers.id, { onDelete: "cascade" }).notNull(),
      planId: (0, import_mysql_core.int)("plan_id").references(() => subscriptionPlans.id, { onDelete: "cascade" }).notNull(),
      status: (0, import_mysql_core.text)("status").default("active"),
      startDate: (0, import_mysql_core.timestamp)("start_date").defaultNow(),
      endDate: (0, import_mysql_core.timestamp)("end_date"),
      nextBillingDate: (0, import_mysql_core.timestamp)("next_billing_date"),
      createdAt: (0, import_mysql_core.timestamp)("created_at").defaultNow()
    });
    activityLog = (0, import_mysql_core.mysqlTable)("activity_log", {
      id: (0, import_mysql_core.serial)("id").primaryKey(),
      employeeId: (0, import_mysql_core.int)("employee_id").references(() => employees.id, { onDelete: "cascade" }).notNull(),
      action: (0, import_mysql_core.text)("action").notNull(),
      entityType: (0, import_mysql_core.text)("entity_type"),
      entityId: (0, import_mysql_core.int)("entity_id"),
      details: (0, import_mysql_core.text)("details"),
      metadata: (0, import_mysql_core.json)("metadata").$type(),
      createdAt: (0, import_mysql_core.timestamp)("created_at").defaultNow()
    });
    returns = (0, import_mysql_core.mysqlTable)("returns", {
      id: (0, import_mysql_core.serial)("id").primaryKey(),
      originalSaleId: (0, import_mysql_core.int)("original_sale_id").references(() => sales.id, { onDelete: "cascade" }).notNull(),
      employeeId: (0, import_mysql_core.int)("employee_id").references(() => employees.id, { onDelete: "cascade" }),
      reason: (0, import_mysql_core.text)("reason"),
      type: (0, import_mysql_core.text)("type").default("refund"),
      totalAmount: (0, import_mysql_core.decimal)("total_amount", { precision: 12, scale: 2 }).notNull(),
      returnGraceDays: (0, import_mysql_core.int)("return_grace_days").default(30),
      refundMethod: (0, import_mysql_core.text)("refund_method"),
      approvedBy: (0, import_mysql_core.int)("approved_by").references(() => employees.id, { onDelete: "cascade" }),
      branchId: (0, import_mysql_core.int)("branch_id").references(() => branches.id, { onDelete: "cascade" }),
      status: (0, import_mysql_core.text)("status").default("completed"),
      createdAt: (0, import_mysql_core.timestamp)("created_at").defaultNow()
    });
    returnItems = (0, import_mysql_core.mysqlTable)("return_items", {
      id: (0, import_mysql_core.serial)("id").primaryKey(),
      returnId: (0, import_mysql_core.int)("return_id").references(() => returns.id, { onDelete: "cascade" }).notNull(),
      productId: (0, import_mysql_core.int)("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
      productName: (0, import_mysql_core.text)("product_name").notNull(),
      quantity: (0, import_mysql_core.int)("quantity").notNull(),
      unitPrice: (0, import_mysql_core.decimal)("unit_price", { precision: 10, scale: 2 }).notNull(),
      total: (0, import_mysql_core.decimal)("total", { precision: 10, scale: 2 }).notNull()
    });
    syncQueue = (0, import_mysql_core.mysqlTable)("sync_queue", {
      id: (0, import_mysql_core.serial)("id").primaryKey(),
      entityType: (0, import_mysql_core.text)("entity_type").notNull(),
      entityId: (0, import_mysql_core.int)("entity_id").notNull(),
      action: (0, import_mysql_core.text)("action").notNull(),
      data: (0, import_mysql_core.json)("data"),
      status: (0, import_mysql_core.text)("status").default("pending"),
      retryCount: (0, import_mysql_core.int)("retry_count").default(0),
      createdAt: (0, import_mysql_core.timestamp)("created_at").defaultNow(),
      processedAt: (0, import_mysql_core.timestamp)("processed_at")
    });
    cashDrawerOperations = (0, import_mysql_core.mysqlTable)("cash_drawer_operations", {
      id: (0, import_mysql_core.serial)("id").primaryKey(),
      shiftId: (0, import_mysql_core.int)("shift_id").references(() => shifts.id, { onDelete: "set null" }),
      employeeId: (0, import_mysql_core.int)("employee_id").references(() => employees.id, { onDelete: "cascade" }).notNull(),
      type: (0, import_mysql_core.text)("type").notNull(),
      amount: (0, import_mysql_core.decimal)("amount", { precision: 10, scale: 2 }).notNull(),
      expectedAmount: (0, import_mysql_core.decimal)("expected_amount", { precision: 10, scale: 2 }),
      actualAmount: (0, import_mysql_core.decimal)("actual_amount", { precision: 10, scale: 2 }),
      difference: (0, import_mysql_core.decimal)("difference", { precision: 10, scale: 2 }),
      reason: (0, import_mysql_core.text)("reason"),
      approvedBy: (0, import_mysql_core.int)("approved_by").references(() => employees.id, { onDelete: "cascade" }),
      createdAt: (0, import_mysql_core.timestamp)("created_at").defaultNow()
    });
    warehouses = (0, import_mysql_core.mysqlTable)("warehouses", {
      id: (0, import_mysql_core.serial)("id").primaryKey(),
      name: (0, import_mysql_core.text)("name").notNull(),
      branchId: (0, import_mysql_core.int)("branch_id").references(() => branches.id, { onDelete: "cascade" }).notNull(),
      address: (0, import_mysql_core.text)("address"),
      isDefault: (0, import_mysql_core.boolean)("is_default").default(false),
      isActive: (0, import_mysql_core.boolean)("is_active").default(true),
      createdAt: (0, import_mysql_core.timestamp)("created_at").defaultNow()
    });
    warehouseTransfers = (0, import_mysql_core.mysqlTable)("warehouse_transfers", {
      id: (0, import_mysql_core.serial)("id").primaryKey(),
      fromWarehouseId: (0, import_mysql_core.int)("from_warehouse_id").references(() => warehouses.id, { onDelete: "cascade" }).notNull(),
      toWarehouseId: (0, import_mysql_core.int)("to_warehouse_id").references(() => warehouses.id, { onDelete: "cascade" }).notNull(),
      productId: (0, import_mysql_core.int)("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
      quantity: (0, import_mysql_core.int)("quantity").notNull(),
      employeeId: (0, import_mysql_core.int)("employee_id").references(() => employees.id, { onDelete: "cascade" }),
      status: (0, import_mysql_core.text)("status").default("completed"),
      notes: (0, import_mysql_core.text)("notes"),
      createdAt: (0, import_mysql_core.timestamp)("created_at").defaultNow()
    });
    productBatches = (0, import_mysql_core.mysqlTable)("product_batches", {
      id: (0, import_mysql_core.serial)("id").primaryKey(),
      productId: (0, import_mysql_core.int)("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
      batchNumber: (0, import_mysql_core.text)("batch_number").notNull(),
      quantity: (0, import_mysql_core.int)("quantity").default(0),
      expiryDate: (0, import_mysql_core.timestamp)("expiry_date"),
      costPrice: (0, import_mysql_core.decimal)("cost_price", { precision: 10, scale: 2 }),
      branchId: (0, import_mysql_core.int)("branch_id").references(() => branches.id, { onDelete: "cascade" }),
      supplierId: (0, import_mysql_core.int)("supplier_id").references(() => suppliers.id, { onDelete: "cascade" }),
      receivedDate: (0, import_mysql_core.timestamp)("received_date").defaultNow(),
      isActive: (0, import_mysql_core.boolean)("is_active").default(true),
      createdAt: (0, import_mysql_core.timestamp)("created_at").defaultNow()
    });
    inventoryMovements = (0, import_mysql_core.mysqlTable)("inventory_movements", {
      id: (0, import_mysql_core.serial)("id").primaryKey(),
      productId: (0, import_mysql_core.int)("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
      branchId: (0, import_mysql_core.int)("branch_id").references(() => branches.id, { onDelete: "cascade" }),
      type: (0, import_mysql_core.text)("type").notNull(),
      quantity: (0, import_mysql_core.int)("quantity").notNull(),
      previousQuantity: (0, import_mysql_core.int)("previous_quantity"),
      newQuantity: (0, import_mysql_core.int)("new_quantity"),
      referenceType: (0, import_mysql_core.text)("reference_type"),
      referenceId: (0, import_mysql_core.int)("reference_id"),
      batchNumber: (0, import_mysql_core.text)("batch_number"),
      employeeId: (0, import_mysql_core.int)("employee_id").references(() => employees.id, { onDelete: "cascade" }),
      notes: (0, import_mysql_core.text)("notes"),
      createdAt: (0, import_mysql_core.timestamp)("created_at").defaultNow()
    });
    stockCounts = (0, import_mysql_core.mysqlTable)("stock_counts", {
      id: (0, import_mysql_core.serial)("id").primaryKey(),
      branchId: (0, import_mysql_core.int)("branch_id").references(() => branches.id, { onDelete: "cascade" }).notNull(),
      employeeId: (0, import_mysql_core.int)("employee_id").references(() => employees.id, { onDelete: "cascade" }).notNull(),
      status: (0, import_mysql_core.text)("status").default("in_progress"),
      approvedBy: (0, import_mysql_core.int)("approved_by").references(() => employees.id, { onDelete: "cascade" }),
      totalItems: (0, import_mysql_core.int)("total_items").default(0),
      discrepancies: (0, import_mysql_core.int)("discrepancies").default(0),
      notes: (0, import_mysql_core.text)("notes"),
      completedAt: (0, import_mysql_core.timestamp)("completed_at"),
      createdAt: (0, import_mysql_core.timestamp)("created_at").defaultNow()
    });
    stockCountItems = (0, import_mysql_core.mysqlTable)("stock_count_items", {
      id: (0, import_mysql_core.serial)("id").primaryKey(),
      stockCountId: (0, import_mysql_core.int)("stock_count_id").references(() => stockCounts.id, { onDelete: "cascade" }).notNull(),
      productId: (0, import_mysql_core.int)("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
      systemQuantity: (0, import_mysql_core.int)("system_quantity").notNull(),
      actualQuantity: (0, import_mysql_core.int)("actual_quantity"),
      difference: (0, import_mysql_core.int)("difference"),
      notes: (0, import_mysql_core.text)("notes")
    });
    supplierContracts = (0, import_mysql_core.mysqlTable)("supplier_contracts", {
      id: (0, import_mysql_core.serial)("id").primaryKey(),
      supplierId: (0, import_mysql_core.int)("supplier_id").references(() => suppliers.id, { onDelete: "cascade" }).notNull(),
      discountRate: (0, import_mysql_core.decimal)("discount_rate", { precision: 5, scale: 2 }).default("0"),
      paymentTerms: (0, import_mysql_core.text)("payment_terms"),
      minOrderAmount: (0, import_mysql_core.decimal)("min_order_amount", { precision: 10, scale: 2 }),
      startDate: (0, import_mysql_core.timestamp)("start_date"),
      endDate: (0, import_mysql_core.timestamp)("end_date"),
      isActive: (0, import_mysql_core.boolean)("is_active").default(true),
      notes: (0, import_mysql_core.text)("notes"),
      createdAt: (0, import_mysql_core.timestamp)("created_at").defaultNow()
    });
    employeeCommissions = (0, import_mysql_core.mysqlTable)("employee_commissions", {
      id: (0, import_mysql_core.serial)("id").primaryKey(),
      employeeId: (0, import_mysql_core.int)("employee_id").references(() => employees.id, { onDelete: "cascade" }).notNull(),
      saleId: (0, import_mysql_core.int)("sale_id").references(() => sales.id, { onDelete: "cascade" }).notNull(),
      commissionRate: (0, import_mysql_core.decimal)("commission_rate", { precision: 5, scale: 2 }).notNull(),
      commissionAmount: (0, import_mysql_core.decimal)("commission_amount", { precision: 10, scale: 2 }).notNull(),
      status: (0, import_mysql_core.text)("status").default("pending"),
      createdAt: (0, import_mysql_core.timestamp)("created_at").defaultNow()
    });
    superAdmins = (0, import_mysql_core.mysqlTable)("super_admins", {
      id: (0, import_mysql_core.serial)("id").primaryKey(),
      name: (0, import_mysql_core.text)("name").notNull(),
      email: (0, import_mysql_core.text)("email").notNull().unique(),
      passwordHash: (0, import_mysql_core.text)("password_hash").notNull(),
      role: (0, import_mysql_core.text)("role").default("super_admin"),
      isActive: (0, import_mysql_core.boolean)("is_active").default(true),
      lastLogin: (0, import_mysql_core.timestamp)("last_login"),
      createdAt: (0, import_mysql_core.timestamp)("created_at").defaultNow(),
      updatedAt: (0, import_mysql_core.timestamp)("updated_at").defaultNow()
    });
    tenants = (0, import_mysql_core.mysqlTable)("tenants", {
      id: (0, import_mysql_core.serial)("id").primaryKey(),
      businessName: (0, import_mysql_core.text)("business_name").notNull(),
      ownerName: (0, import_mysql_core.text)("owner_name").notNull(),
      ownerEmail: (0, import_mysql_core.text)("owner_email").notNull().unique(),
      ownerPhone: (0, import_mysql_core.text)("owner_phone"),
      passwordHash: (0, import_mysql_core.text)("password_hash"),
      address: (0, import_mysql_core.text)("address"),
      logo: (0, import_mysql_core.text)("logo"),
      status: (0, import_mysql_core.text)("status").default("active"),
      // active, suspended, expired, trial
      maxBranches: (0, import_mysql_core.int)("max_branches").default(1),
      maxEmployees: (0, import_mysql_core.int)("max_employees").default(5),
      storeType: (0, import_mysql_core.text)("store_type").default("supermarket"),
      // supermarket, restaurant, pharmacy, others
      metadata: (0, import_mysql_core.json)("metadata").$type(),
      setupCompleted: (0, import_mysql_core.boolean)("setup_completed").default(false),
      createdAt: (0, import_mysql_core.timestamp)("created_at").defaultNow(),
      updatedAt: (0, import_mysql_core.timestamp)("updated_at").defaultNow()
    });
    tenantSubscriptions = (0, import_mysql_core.mysqlTable)("tenant_subscriptions", {
      id: (0, import_mysql_core.serial)("id").primaryKey(),
      tenantId: (0, import_mysql_core.int)("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
      planType: (0, import_mysql_core.text)("plan_type").notNull().default("trial"),
      // trial, monthly, yearly
      planName: (0, import_mysql_core.text)("plan_name").notNull(),
      price: (0, import_mysql_core.decimal)("price", { precision: 10, scale: 2 }).default("0"),
      status: (0, import_mysql_core.text)("status").default("active"),
      // active, expired, cancelled, pending
      startDate: (0, import_mysql_core.timestamp)("start_date").defaultNow(),
      endDate: (0, import_mysql_core.timestamp)("end_date"),
      trialEndsAt: (0, import_mysql_core.timestamp)("trial_ends_at"),
      autoRenew: (0, import_mysql_core.boolean)("auto_renew").default(false),
      paymentMethod: (0, import_mysql_core.text)("payment_method"),
      lastPaymentDate: (0, import_mysql_core.timestamp)("last_payment_date"),
      nextPaymentDate: (0, import_mysql_core.timestamp)("next_payment_date"),
      cancelledAt: (0, import_mysql_core.timestamp)("cancelled_at"),
      cancellationReason: (0, import_mysql_core.text)("cancellation_reason"),
      features: (0, import_mysql_core.json)("features").$type().default([]),
      createdAt: (0, import_mysql_core.timestamp)("created_at").defaultNow(),
      updatedAt: (0, import_mysql_core.timestamp)("updated_at").defaultNow()
    });
    licenseKeys = (0, import_mysql_core.mysqlTable)("license_keys", {
      id: (0, import_mysql_core.serial)("id").primaryKey(),
      licenseKey: (0, import_mysql_core.text)("license_key").notNull().unique(),
      tenantId: (0, import_mysql_core.int)("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
      subscriptionId: (0, import_mysql_core.int)("subscription_id").references(() => tenantSubscriptions.id, { onDelete: "cascade" }),
      status: (0, import_mysql_core.text)("status").default("active"),
      // active, expired, revoked, pending
      activatedAt: (0, import_mysql_core.timestamp)("activated_at"),
      expiresAt: (0, import_mysql_core.timestamp)("expires_at"),
      lastValidatedAt: (0, import_mysql_core.timestamp)("last_validated_at"),
      deviceInfo: (0, import_mysql_core.text)("device_info"),
      maxActivations: (0, import_mysql_core.int)("max_activations").default(3),
      currentActivations: (0, import_mysql_core.int)("current_activations").default(0),
      notes: (0, import_mysql_core.text)("notes"),
      createdAt: (0, import_mysql_core.timestamp)("created_at").defaultNow(),
      updatedAt: (0, import_mysql_core.timestamp)("updated_at").defaultNow()
    });
    tenantNotifications = (0, import_mysql_core.mysqlTable)("tenant_notifications", {
      id: (0, import_mysql_core.serial)("id").primaryKey(),
      tenantId: (0, import_mysql_core.int)("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
      type: (0, import_mysql_core.text)("type").notNull(),
      // warning, promotion, info, expiry_alert, upgrade_offer
      title: (0, import_mysql_core.text)("title").notNull(),
      message: (0, import_mysql_core.text)("message").notNull(),
      priority: (0, import_mysql_core.text)("priority").default("normal"),
      // low, normal, high, urgent
      isRead: (0, import_mysql_core.boolean)("is_read").default(false),
      isDismissed: (0, import_mysql_core.boolean)("is_dismissed").default(false),
      actionUrl: (0, import_mysql_core.text)("action_url"),
      actionLabel: (0, import_mysql_core.text)("action_label"),
      expiresAt: (0, import_mysql_core.timestamp)("expires_at"),
      sentBy: (0, import_mysql_core.int)("sent_by").references(() => superAdmins.id, { onDelete: "cascade" }),
      createdAt: (0, import_mysql_core.timestamp)("created_at").defaultNow()
    });
    platformSettings = (0, import_mysql_core.mysqlTable)("platform_settings", {
      id: (0, import_mysql_core.serial)("id").primaryKey(),
      key: (0, import_mysql_core.text)("key").notNull().unique(),
      value: (0, import_mysql_core.text)("value").notNull(),
      updatedAt: (0, import_mysql_core.timestamp)("updated_at").defaultNow()
    });
    platformCommissions = (0, import_mysql_core.mysqlTable)("platform_commissions", {
      id: (0, import_mysql_core.serial)("id").primaryKey(),
      tenantId: (0, import_mysql_core.int)("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
      orderId: (0, import_mysql_core.int)("order_id"),
      saleTotal: (0, import_mysql_core.decimal)("sale_total", { precision: 12, scale: 2 }).notNull(),
      commissionRate: (0, import_mysql_core.decimal)("commission_rate", { precision: 5, scale: 2 }).notNull(),
      commissionAmount: (0, import_mysql_core.decimal)("commission_amount", { precision: 12, scale: 2 }).notNull(),
      status: (0, import_mysql_core.text)("status").default("pending"),
      createdAt: (0, import_mysql_core.timestamp)("created_at").defaultNow()
    });
    onlineOrders = (0, import_mysql_core.mysqlTable)("online_orders", {
      id: (0, import_mysql_core.serial)("id").primaryKey(),
      tenantId: (0, import_mysql_core.int)("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
      orderNumber: (0, import_mysql_core.text)("order_number").notNull(),
      customerName: (0, import_mysql_core.text)("customer_name").notNull(),
      customerPhone: (0, import_mysql_core.text)("customer_phone").notNull(),
      customerAddress: (0, import_mysql_core.text)("customer_address"),
      customerEmail: (0, import_mysql_core.text)("customer_email"),
      items: (0, import_mysql_core.json)("items").$type().notNull().default([]),
      subtotal: (0, import_mysql_core.decimal)("subtotal", { precision: 10, scale: 2 }).notNull(),
      taxAmount: (0, import_mysql_core.decimal)("tax_amount", { precision: 10, scale: 2 }).default("0"),
      deliveryFee: (0, import_mysql_core.decimal)("delivery_fee", { precision: 10, scale: 2 }).default("0"),
      totalAmount: (0, import_mysql_core.decimal)("total_amount", { precision: 10, scale: 2 }).notNull(),
      paymentMethod: (0, import_mysql_core.text)("payment_method").notNull().default("cash"),
      // cash, card, mobile
      paymentStatus: (0, import_mysql_core.text)("payment_status").notNull().default("pending"),
      // pending, paid, failed
      stripePaymentIntentId: (0, import_mysql_core.text)("stripe_payment_intent_id"),
      status: (0, import_mysql_core.text)("status").notNull().default("pending"),
      // pending, accepted, preparing, ready, delivered, cancelled
      orderType: (0, import_mysql_core.text)("order_type").notNull().default("delivery"),
      // delivery, pickup
      notes: (0, import_mysql_core.text)("notes"),
      estimatedTime: (0, import_mysql_core.int)("estimated_time"),
      // minutes
      language: (0, import_mysql_core.text)("language").default("en"),
      // ── Delivery Platform Extensions ──
      driverId: (0, import_mysql_core.int)("driver_id"),
      scheduledAt: (0, import_mysql_core.timestamp)("scheduled_at"),
      promoCodeId: (0, import_mysql_core.int)("promo_code_id"),
      discountAmount: (0, import_mysql_core.decimal)("discount_amount", { precision: 10, scale: 2 }).default("0"),
      driverLat: (0, import_mysql_core.decimal)("driver_lat", { precision: 10, scale: 7 }),
      driverLng: (0, import_mysql_core.decimal)("driver_lng", { precision: 10, scale: 7 }),
      customerLat: (0, import_mysql_core.decimal)("customer_lat", { precision: 10, scale: 7 }),
      customerLng: (0, import_mysql_core.decimal)("customer_lng", { precision: 10, scale: 7 }),
      riderPickedUpAt: (0, import_mysql_core.timestamp)("rider_picked_up_at"),
      riderDeliveredAt: (0, import_mysql_core.timestamp)("rider_delivered_at"),
      rating: (0, import_mysql_core.int)("rating"),
      ratingComment: (0, import_mysql_core.text)("rating_comment"),
      trackingToken: (0, import_mysql_core.varchar)("tracking_token", { length: 64 }),
      sourceChannel: (0, import_mysql_core.text)("source_channel").default("web"),
      floor: (0, import_mysql_core.text)("floor"),
      buildingName: (0, import_mysql_core.text)("building_name"),
      addressNotes: (0, import_mysql_core.text)("address_notes"),
      savedAddressId: (0, import_mysql_core.int)("saved_address_id"),
      walletAmountUsed: (0, import_mysql_core.decimal)("wallet_amount_used", { precision: 10, scale: 2 }).default("0"),
      loyaltyPointsUsed: (0, import_mysql_core.int)("loyalty_points_used").default(0),
      loyaltyPointsEarned: (0, import_mysql_core.int)("loyalty_points_earned").default(0),
      createdAt: (0, import_mysql_core.timestamp)("created_at").defaultNow(),
      updatedAt: (0, import_mysql_core.timestamp)("updated_at").defaultNow()
    });
    landingPageConfig = (0, import_mysql_core.mysqlTable)("landing_page_config", {
      id: (0, import_mysql_core.serial)("id").primaryKey(),
      tenantId: (0, import_mysql_core.int)("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull().unique(),
      slug: (0, import_mysql_core.text)("slug").notNull().unique(),
      // URL slug e.g. "pizza-lemon"
      heroTitle: (0, import_mysql_core.text)("hero_title"),
      heroSubtitle: (0, import_mysql_core.text)("hero_subtitle"),
      heroImage: (0, import_mysql_core.text)("hero_image"),
      aboutText: (0, import_mysql_core.text)("about_text"),
      aboutImage: (0, import_mysql_core.text)("about_image"),
      primaryColor: (0, import_mysql_core.text)("primary_color").default("#2FD3C6"),
      accentColor: (0, import_mysql_core.text)("accent_color").default("#6366F1"),
      enableOnlineOrdering: (0, import_mysql_core.boolean)("enable_online_ordering").default(true),
      enableDelivery: (0, import_mysql_core.boolean)("enable_delivery").default(true),
      enablePickup: (0, import_mysql_core.boolean)("enable_pickup").default(true),
      acceptCard: (0, import_mysql_core.boolean)("accept_card").default(true),
      acceptMobile: (0, import_mysql_core.boolean)("accept_mobile").default(true),
      acceptCash: (0, import_mysql_core.boolean)("accept_cash").default(true),
      minOrderAmount: (0, import_mysql_core.decimal)("min_order_amount", { precision: 10, scale: 2 }).default("0"),
      estimatedDeliveryTime: (0, import_mysql_core.int)("estimated_delivery_time").default(30),
      // minutes
      footerText: (0, import_mysql_core.text)("footer_text"),
      socialFacebook: (0, import_mysql_core.text)("social_facebook"),
      socialInstagram: (0, import_mysql_core.text)("social_instagram"),
      socialWhatsapp: (0, import_mysql_core.text)("social_whatsapp"),
      phone: (0, import_mysql_core.text)("phone"),
      email: (0, import_mysql_core.text)("email"),
      address: (0, import_mysql_core.text)("address"),
      openingHours: (0, import_mysql_core.text)("opening_hours"),
      // e.g. "Mon-Sun 11:00–22:00"
      deliveryRadius: (0, import_mysql_core.text)("delivery_radius"),
      // e.g. "within 10km"
      customCss: (0, import_mysql_core.text)("custom_css"),
      isPublished: (0, import_mysql_core.boolean)("is_published").default(true),
      language: (0, import_mysql_core.text)("language").default("en"),
      // System language: en | ar | de
      // ── Delivery Platform Extensions ──
      bannerImages: (0, import_mysql_core.json)("banner_images").$type().default([]),
      featuredCategoryIds: (0, import_mysql_core.json)("featured_category_ids").$type().default([]),
      promoText: (0, import_mysql_core.text)("promo_text"),
      deliveryZonesJson: (0, import_mysql_core.json)("delivery_zones_json").$type().default([]),
      minDeliveryTime: (0, import_mysql_core.int)("min_delivery_time").default(20),
      maxDeliveryTime: (0, import_mysql_core.int)("max_delivery_time").default(45),
      loyaltyPointsPerUnit: (0, import_mysql_core.decimal)("loyalty_points_per_unit", { precision: 5, scale: 2 }).default("1.00"),
      loyaltyRedemptionRate: (0, import_mysql_core.decimal)("loyalty_redemption_rate", { precision: 5, scale: 2 }).default("0.01"),
      enableLoyalty: (0, import_mysql_core.boolean)("enable_loyalty").default(true),
      enableScheduledOrders: (0, import_mysql_core.boolean)("enable_scheduled_orders").default(true),
      enablePromos: (0, import_mysql_core.boolean)("enable_promos").default(true),
      enableWallet: (0, import_mysql_core.boolean)("enable_wallet").default(false),
      metaTitle: (0, import_mysql_core.text)("meta_title"),
      metaDescription: (0, import_mysql_core.text)("meta_description"),
      googleAnalyticsId: (0, import_mysql_core.text)("google_analytics_id"),
      supportPhone: (0, import_mysql_core.text)("support_phone"),
      logomark: (0, import_mysql_core.text)("logomark"),
      headerBgImage: (0, import_mysql_core.text)("header_bg_image"),
      createdAt: (0, import_mysql_core.timestamp)("created_at").defaultNow(),
      updatedAt: (0, import_mysql_core.timestamp)("updated_at").defaultNow()
    });
    vehicles = (0, import_mysql_core.mysqlTable)("vehicles", {
      id: (0, import_mysql_core.serial)("id").primaryKey(),
      tenantId: (0, import_mysql_core.int)("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
      branchId: (0, import_mysql_core.int)("branch_id").references(() => branches.id, { onDelete: "cascade" }),
      licensePlate: (0, import_mysql_core.text)("license_plate").notNull(),
      make: (0, import_mysql_core.text)("make"),
      model: (0, import_mysql_core.text)("model"),
      color: (0, import_mysql_core.text)("color"),
      driverName: (0, import_mysql_core.text)("driver_name"),
      driverPhone: (0, import_mysql_core.text)("driver_phone"),
      isActive: (0, import_mysql_core.boolean)("is_active").default(true),
      notes: (0, import_mysql_core.text)("notes"),
      // ── Delivery Platform Extensions ──
      employeeId: (0, import_mysql_core.int)("employee_id"),
      currentLat: (0, import_mysql_core.decimal)("current_lat", { precision: 10, scale: 7 }),
      currentLng: (0, import_mysql_core.decimal)("current_lng", { precision: 10, scale: 7 }),
      locationUpdatedAt: (0, import_mysql_core.timestamp)("location_updated_at"),
      driverStatus: (0, import_mysql_core.text)("driver_status").default("offline"),
      driverRating: (0, import_mysql_core.decimal)("driver_rating", { precision: 3, scale: 2 }).default("5.00"),
      totalDeliveries: (0, import_mysql_core.int)("total_deliveries").default(0),
      activeOrderId: (0, import_mysql_core.int)("active_order_id"),
      deviceToken: (0, import_mysql_core.text)("device_token"),
      driverAccessToken: (0, import_mysql_core.varchar)("driver_access_token", { length: 64 }),
      createdAt: (0, import_mysql_core.timestamp)("created_at").defaultNow()
    });
    printerConfigs = (0, import_mysql_core.mysqlTable)("printer_configs", {
      id: (0, import_mysql_core.serial)("id").primaryKey(),
      tenantId: (0, import_mysql_core.int)("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
      branchId: (0, import_mysql_core.int)("branch_id").references(() => branches.id, { onDelete: "cascade" }),
      receiptType: (0, import_mysql_core.text)("receipt_type").notNull(),
      // kitchen, home_delivery, take_away, restaurant, driver_order, check_out, lists, daily_close, monthly_close, accounts_receivable
      printer1: (0, import_mysql_core.text)("printer_1"),
      printer1Copy: (0, import_mysql_core.boolean)("printer_1_copy").default(false),
      printer2: (0, import_mysql_core.text)("printer_2"),
      printer2Copy: (0, import_mysql_core.boolean)("printer_2_copy").default(false),
      paperSize: (0, import_mysql_core.text)("paper_size").default("80mm"),
      isActive: (0, import_mysql_core.boolean)("is_active").default(true),
      updatedAt: (0, import_mysql_core.timestamp)("updated_at").defaultNow()
    });
    dailyClosings = (0, import_mysql_core.mysqlTable)("daily_closings", {
      id: (0, import_mysql_core.serial)("id").primaryKey(),
      tenantId: (0, import_mysql_core.int)("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
      branchId: (0, import_mysql_core.int)("branch_id").references(() => branches.id, { onDelete: "cascade" }),
      employeeId: (0, import_mysql_core.int)("employee_id").references(() => employees.id, { onDelete: "cascade" }),
      closingDate: (0, import_mysql_core.text)("closing_date").notNull(),
      // YYYY-MM-DD
      totalSales: (0, import_mysql_core.decimal)("total_sales", { precision: 12, scale: 2 }).default("0"),
      totalCash: (0, import_mysql_core.decimal)("total_cash", { precision: 12, scale: 2 }).default("0"),
      totalCard: (0, import_mysql_core.decimal)("total_card", { precision: 12, scale: 2 }).default("0"),
      totalMobile: (0, import_mysql_core.decimal)("total_mobile", { precision: 12, scale: 2 }).default("0"),
      totalTransactions: (0, import_mysql_core.int)("total_transactions").default(0),
      totalReturns: (0, import_mysql_core.decimal)("total_returns", { precision: 12, scale: 2 }).default("0"),
      totalDiscounts: (0, import_mysql_core.decimal)("total_discounts", { precision: 12, scale: 2 }).default("0"),
      openingCash: (0, import_mysql_core.decimal)("opening_cash", { precision: 12, scale: 2 }).default("0"),
      closingCash: (0, import_mysql_core.decimal)("closing_cash", { precision: 12, scale: 2 }).default("0"),
      notes: (0, import_mysql_core.text)("notes"),
      status: (0, import_mysql_core.text)("status").default("closed"),
      // closed, approved
      createdAt: (0, import_mysql_core.timestamp)("created_at").defaultNow()
    });
    monthlyClosings = (0, import_mysql_core.mysqlTable)("monthly_closings", {
      id: (0, import_mysql_core.serial)("id").primaryKey(),
      tenantId: (0, import_mysql_core.int)("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
      branchId: (0, import_mysql_core.int)("branch_id").references(() => branches.id, { onDelete: "cascade" }),
      employeeId: (0, import_mysql_core.int)("employee_id").references(() => employees.id, { onDelete: "cascade" }),
      closingMonth: (0, import_mysql_core.text)("closing_month").notNull(),
      // YYYY-MM
      totalSales: (0, import_mysql_core.decimal)("total_sales", { precision: 12, scale: 2 }).default("0"),
      totalCash: (0, import_mysql_core.decimal)("total_cash", { precision: 12, scale: 2 }).default("0"),
      totalCard: (0, import_mysql_core.decimal)("total_card", { precision: 12, scale: 2 }).default("0"),
      totalMobile: (0, import_mysql_core.decimal)("total_mobile", { precision: 12, scale: 2 }).default("0"),
      totalTransactions: (0, import_mysql_core.int)("total_transactions").default(0),
      totalReturns: (0, import_mysql_core.decimal)("total_returns", { precision: 12, scale: 2 }).default("0"),
      totalDiscounts: (0, import_mysql_core.decimal)("total_discounts", { precision: 12, scale: 2 }).default("0"),
      totalExpenses: (0, import_mysql_core.decimal)("total_expenses", { precision: 12, scale: 2 }).default("0"),
      netRevenue: (0, import_mysql_core.decimal)("net_revenue", { precision: 12, scale: 2 }).default("0"),
      notes: (0, import_mysql_core.text)("notes"),
      status: (0, import_mysql_core.text)("status").default("closed"),
      // closed, approved
      createdAt: (0, import_mysql_core.timestamp)("created_at").defaultNow()
    });
    dailySequences = (0, import_mysql_core.mysqlTable)("daily_sequences", {
      id: (0, import_mysql_core.serial)("id").primaryKey(),
      scopeKey: (0, import_mysql_core.text)("scope_key").notNull(),
      // "branch-{id}" for POS, "tenant-{id}" for online orders
      date: (0, import_mysql_core.text)("date").notNull(),
      // YYYY-MM-DD in Europe/Zurich timezone
      counter: (0, import_mysql_core.int)("counter").default(0).notNull()
    }, (table) => ({
      uniqScopeDate: (0, import_mysql_core.unique)("daily_seq_scope_date_unique").on(table.scopeKey, table.date)
    }));
    customerAddresses = (0, import_mysql_core.mysqlTable)("customer_addresses", {
      id: (0, import_mysql_core.serial)("id").primaryKey(),
      customerId: (0, import_mysql_core.int)("customer_id").references(() => customers.id, { onDelete: "cascade" }).notNull(),
      tenantId: (0, import_mysql_core.int)("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
      label: (0, import_mysql_core.text)("label").notNull().default("Home"),
      street: (0, import_mysql_core.text)("street").notNull(),
      buildingName: (0, import_mysql_core.text)("building_name"),
      floor: (0, import_mysql_core.text)("floor"),
      city: (0, import_mysql_core.text)("city").notNull(),
      postalCode: (0, import_mysql_core.text)("postal_code"),
      lat: (0, import_mysql_core.decimal)("lat", { precision: 10, scale: 7 }),
      lng: (0, import_mysql_core.decimal)("lng", { precision: 10, scale: 7 }),
      notes: (0, import_mysql_core.text)("notes"),
      isDefault: (0, import_mysql_core.boolean)("is_default").default(false),
      createdAt: (0, import_mysql_core.timestamp)("created_at").defaultNow()
    });
    promoCodes = (0, import_mysql_core.mysqlTable)("promo_codes", {
      id: (0, import_mysql_core.serial)("id").primaryKey(),
      tenantId: (0, import_mysql_core.int)("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
      code: (0, import_mysql_core.varchar)("code", { length: 32 }).notNull(),
      description: (0, import_mysql_core.text)("description"),
      discountType: (0, import_mysql_core.text)("discount_type").notNull().default("percent"),
      // percent | fixed | free_delivery
      discountValue: (0, import_mysql_core.decimal)("discount_value", { precision: 10, scale: 2 }).notNull(),
      minOrderAmount: (0, import_mysql_core.decimal)("min_order_amount", { precision: 10, scale: 2 }).default("0"),
      maxDiscountCap: (0, import_mysql_core.decimal)("max_discount_cap", { precision: 10, scale: 2 }),
      usageLimit: (0, import_mysql_core.int)("usage_limit"),
      usageCount: (0, import_mysql_core.int)("usage_count").default(0),
      perCustomerLimit: (0, import_mysql_core.int)("per_customer_limit").default(1),
      validFrom: (0, import_mysql_core.timestamp)("valid_from"),
      validUntil: (0, import_mysql_core.timestamp)("valid_until"),
      isActive: (0, import_mysql_core.boolean)("is_active").default(true),
      applicableOrderTypes: (0, import_mysql_core.json)("applicable_order_types").$type().default(["delivery", "pickup"]),
      createdAt: (0, import_mysql_core.timestamp)("created_at").defaultNow()
    }, (t) => ({
      uniqTenantCode: (0, import_mysql_core.unique)("promo_tenant_code").on(t.tenantId, t.code)
    }));
    promoCodeUsages = (0, import_mysql_core.mysqlTable)("promo_code_usages", {
      id: (0, import_mysql_core.serial)("id").primaryKey(),
      promoCodeId: (0, import_mysql_core.int)("promo_code_id").references(() => promoCodes.id, { onDelete: "cascade" }).notNull(),
      customerId: (0, import_mysql_core.int)("customer_id").references(() => customers.id, { onDelete: "set null" }),
      orderId: (0, import_mysql_core.int)("order_id").references(() => onlineOrders.id, { onDelete: "set null" }),
      discountApplied: (0, import_mysql_core.decimal)("discount_applied", { precision: 10, scale: 2 }).notNull(),
      createdAt: (0, import_mysql_core.timestamp)("created_at").defaultNow()
    });
    driverLocations = (0, import_mysql_core.mysqlTable)("driver_locations", {
      id: (0, import_mysql_core.serial)("id").primaryKey(),
      vehicleId: (0, import_mysql_core.int)("vehicle_id").references(() => vehicles.id, { onDelete: "cascade" }).notNull(),
      orderId: (0, import_mysql_core.int)("order_id").references(() => onlineOrders.id, { onDelete: "set null" }),
      lat: (0, import_mysql_core.decimal)("lat", { precision: 10, scale: 7 }).notNull(),
      lng: (0, import_mysql_core.decimal)("lng", { precision: 10, scale: 7 }).notNull(),
      speed: (0, import_mysql_core.decimal)("speed", { precision: 5, scale: 2 }),
      heading: (0, import_mysql_core.int)("heading"),
      recordedAt: (0, import_mysql_core.timestamp)("recorded_at").defaultNow()
    });
    loyaltyTransactions = (0, import_mysql_core.mysqlTable)("loyalty_transactions", {
      id: (0, import_mysql_core.serial)("id").primaryKey(),
      customerId: (0, import_mysql_core.int)("customer_id").references(() => customers.id, { onDelete: "cascade" }).notNull(),
      tenantId: (0, import_mysql_core.int)("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
      orderId: (0, import_mysql_core.int)("order_id").references(() => onlineOrders.id, { onDelete: "set null" }),
      type: (0, import_mysql_core.text)("type").notNull(),
      // earn | redeem | expire | bonus | referral
      points: (0, import_mysql_core.int)("points").notNull(),
      balanceBefore: (0, import_mysql_core.int)("balance_before").notNull(),
      balanceAfter: (0, import_mysql_core.int)("balance_after").notNull(),
      description: (0, import_mysql_core.text)("description"),
      createdAt: (0, import_mysql_core.timestamp)("created_at").defaultNow()
    });
    walletTransactions = (0, import_mysql_core.mysqlTable)("wallet_transactions", {
      id: (0, import_mysql_core.serial)("id").primaryKey(),
      customerId: (0, import_mysql_core.int)("customer_id").references(() => customers.id, { onDelete: "cascade" }).notNull(),
      tenantId: (0, import_mysql_core.int)("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
      orderId: (0, import_mysql_core.int)("order_id").references(() => onlineOrders.id, { onDelete: "set null" }),
      type: (0, import_mysql_core.text)("type").notNull(),
      // top_up | payment | refund | bonus
      amount: (0, import_mysql_core.decimal)("amount", { precision: 10, scale: 2 }).notNull(),
      balanceBefore: (0, import_mysql_core.decimal)("balance_before", { precision: 10, scale: 2 }).notNull(),
      balanceAfter: (0, import_mysql_core.decimal)("balance_after", { precision: 10, scale: 2 }).notNull(),
      stripePaymentIntentId: (0, import_mysql_core.text)("stripe_payment_intent_id"),
      description: (0, import_mysql_core.text)("description"),
      createdAt: (0, import_mysql_core.timestamp)("created_at").defaultNow()
    });
    orderRatings = (0, import_mysql_core.mysqlTable)("order_ratings", {
      id: (0, import_mysql_core.serial)("id").primaryKey(),
      orderId: (0, import_mysql_core.int)("order_id").references(() => onlineOrders.id, { onDelete: "cascade" }).notNull().unique(),
      customerId: (0, import_mysql_core.int)("customer_id").references(() => customers.id, { onDelete: "set null" }),
      driverId: (0, import_mysql_core.int)("driver_id").references(() => vehicles.id, { onDelete: "set null" }),
      foodRating: (0, import_mysql_core.int)("food_rating"),
      deliveryRating: (0, import_mysql_core.int)("delivery_rating"),
      overallRating: (0, import_mysql_core.int)("overall_rating").notNull(),
      comment: (0, import_mysql_core.text)("comment"),
      createdAt: (0, import_mysql_core.timestamp)("created_at").defaultNow()
    });
    customerSessions = (0, import_mysql_core.mysqlTable)("customer_sessions", {
      id: (0, import_mysql_core.serial)("id").primaryKey(),
      customerId: (0, import_mysql_core.int)("customer_id").references(() => customers.id, { onDelete: "cascade" }).notNull(),
      tenantId: (0, import_mysql_core.int)("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
      token: (0, import_mysql_core.varchar)("token", { length: 128 }).notNull().unique(),
      deviceInfo: (0, import_mysql_core.text)("device_info"),
      expiresAt: (0, import_mysql_core.timestamp)("expires_at").notNull(),
      createdAt: (0, import_mysql_core.timestamp)("created_at").defaultNow()
    });
    otpVerifications = (0, import_mysql_core.mysqlTable)("otp_verifications", {
      id: (0, import_mysql_core.serial)("id").primaryKey(),
      phone: (0, import_mysql_core.varchar)("phone", { length: 32 }).notNull(),
      tenantId: (0, import_mysql_core.int)("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
      otp: (0, import_mysql_core.varchar)("otp", { length: 8 }).notNull(),
      expiresAt: (0, import_mysql_core.timestamp)("expires_at").notNull(),
      attempts: (0, import_mysql_core.int)("attempts").default(0),
      verified: (0, import_mysql_core.boolean)("verified").default(false),
      createdAt: (0, import_mysql_core.timestamp)("created_at").defaultNow()
    });
    deliveryZones = (0, import_mysql_core.mysqlTable)("delivery_zones", {
      id: (0, import_mysql_core.serial)("id").primaryKey(),
      tenantId: (0, import_mysql_core.int)("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
      branchId: (0, import_mysql_core.int)("branch_id").references(() => branches.id, { onDelete: "cascade" }),
      name: (0, import_mysql_core.text)("name").notNull(),
      nameAr: (0, import_mysql_core.text)("name_ar"),
      polygon: (0, import_mysql_core.json)("polygon").$type(),
      centerLat: (0, import_mysql_core.decimal)("center_lat", { precision: 10, scale: 7 }),
      centerLng: (0, import_mysql_core.decimal)("center_lng", { precision: 10, scale: 7 }),
      radiusKm: (0, import_mysql_core.decimal)("radius_km", { precision: 5, scale: 2 }),
      deliveryFee: (0, import_mysql_core.decimal)("delivery_fee", { precision: 10, scale: 2 }).default("0"),
      minOrderAmount: (0, import_mysql_core.decimal)("min_order_amount", { precision: 10, scale: 2 }).default("0"),
      estimatedMinutes: (0, import_mysql_core.int)("estimated_minutes").default(30),
      isActive: (0, import_mysql_core.boolean)("is_active").default(true),
      sortOrder: (0, import_mysql_core.int)("sort_order").default(0),
      createdAt: (0, import_mysql_core.timestamp)("created_at").defaultNow()
    });
    insertBranchSchema = (0, import_drizzle_zod.createInsertSchema)(branches).omit({ id: true, createdAt: true, updatedAt: true });
    insertEmployeeSchema = (0, import_drizzle_zod.createInsertSchema)(employees).omit({ id: true, createdAt: true, updatedAt: true });
    insertCategorySchema = (0, import_drizzle_zod.createInsertSchema)(categories).omit({ id: true, createdAt: true });
    insertProductSchema = (0, import_drizzle_zod.createInsertSchema)(products).omit({ id: true, createdAt: true, updatedAt: true });
    insertInventorySchema = (0, import_drizzle_zod.createInsertSchema)(inventory).omit({ id: true, updatedAt: true });
    insertCustomerSchema = (0, import_drizzle_zod.createInsertSchema)(customers).omit({ id: true, createdAt: true, updatedAt: true });
    insertSaleSchema = (0, import_drizzle_zod.createInsertSchema)(sales).omit({ id: true, createdAt: true });
    insertSaleItemSchema = (0, import_drizzle_zod.createInsertSchema)(saleItems).omit({ id: true });
    insertSupplierSchema = (0, import_drizzle_zod.createInsertSchema)(suppliers).omit({ id: true, createdAt: true, updatedAt: true });
    insertPurchaseOrderSchema = (0, import_drizzle_zod.createInsertSchema)(purchaseOrders).omit({ id: true, createdAt: true });
    insertPurchaseOrderItemSchema = (0, import_drizzle_zod.createInsertSchema)(purchaseOrderItems).omit({ id: true });
    insertShiftSchema = (0, import_drizzle_zod.createInsertSchema)(shifts).omit({ id: true });
    insertNotificationSchema = (0, import_drizzle_zod.createInsertSchema)(notifications).omit({ id: true, createdAt: true });
    insertExpenseSchema = (0, import_drizzle_zod.createInsertSchema)(expenses).omit({ id: true, createdAt: true });
    insertCallSchema = (0, import_drizzle_zod.createInsertSchema)(calls).omit({ id: true, createdAt: true });
    insertTableSchema = (0, import_drizzle_zod.createInsertSchema)(tables).omit({ id: true, createdAt: true });
    insertKitchenOrderSchema = (0, import_drizzle_zod.createInsertSchema)(kitchenOrders).omit({ id: true, createdAt: true, updatedAt: true });
    insertSubscriptionPlanSchema = (0, import_drizzle_zod.createInsertSchema)(subscriptionPlans).omit({ id: true, createdAt: true });
    insertSubscriptionSchema = (0, import_drizzle_zod.createInsertSchema)(subscriptions).omit({ id: true, createdAt: true });
    insertActivityLogSchema = (0, import_drizzle_zod.createInsertSchema)(activityLog).omit({ id: true, createdAt: true });
    insertReturnSchema = (0, import_drizzle_zod.createInsertSchema)(returns).omit({ id: true, createdAt: true });
    insertReturnItemSchema = (0, import_drizzle_zod.createInsertSchema)(returnItems).omit({ id: true });
    insertCashDrawerOperationSchema = (0, import_drizzle_zod.createInsertSchema)(cashDrawerOperations).omit({ id: true, createdAt: true });
    insertWarehouseSchema = (0, import_drizzle_zod.createInsertSchema)(warehouses).omit({ id: true, createdAt: true });
    insertWarehouseTransferSchema = (0, import_drizzle_zod.createInsertSchema)(warehouseTransfers).omit({ id: true, createdAt: true });
    insertProductBatchSchema = (0, import_drizzle_zod.createInsertSchema)(productBatches).omit({ id: true, createdAt: true });
    insertInventoryMovementSchema = (0, import_drizzle_zod.createInsertSchema)(inventoryMovements).omit({ id: true, createdAt: true });
    insertStockCountSchema = (0, import_drizzle_zod.createInsertSchema)(stockCounts).omit({ id: true, createdAt: true });
    insertStockCountItemSchema = (0, import_drizzle_zod.createInsertSchema)(stockCountItems).omit({ id: true });
    insertSupplierContractSchema = (0, import_drizzle_zod.createInsertSchema)(supplierContracts).omit({ id: true, createdAt: true });
    insertEmployeeCommissionSchema = (0, import_drizzle_zod.createInsertSchema)(employeeCommissions).omit({ id: true, createdAt: true });
    insertSuperAdminSchema = (0, import_drizzle_zod.createInsertSchema)(superAdmins).omit({ id: true, createdAt: true, updatedAt: true });
    insertTenantSchema = (0, import_drizzle_zod.createInsertSchema)(tenants).omit({ id: true, createdAt: true, updatedAt: true });
    insertTenantSubscriptionSchema = (0, import_drizzle_zod.createInsertSchema)(tenantSubscriptions).omit({ id: true, createdAt: true, updatedAt: true });
    insertLicenseKeySchema = (0, import_drizzle_zod.createInsertSchema)(licenseKeys).omit({ id: true, createdAt: true, updatedAt: true });
    insertTenantNotificationSchema = (0, import_drizzle_zod.createInsertSchema)(tenantNotifications).omit({ id: true, createdAt: true });
    insertOnlineOrderSchema = (0, import_drizzle_zod.createInsertSchema)(onlineOrders).omit({ id: true, createdAt: true, updatedAt: true });
    insertLandingPageConfigSchema = (0, import_drizzle_zod.createInsertSchema)(landingPageConfig).omit({ id: true, createdAt: true, updatedAt: true });
    insertPlatformSettingSchema = (0, import_drizzle_zod.createInsertSchema)(platformSettings).omit({ id: true, updatedAt: true });
    insertPlatformCommissionSchema = (0, import_drizzle_zod.createInsertSchema)(platformCommissions).omit({ id: true, createdAt: true });
    insertVehicleSchema = (0, import_drizzle_zod.createInsertSchema)(vehicles).omit({ id: true, createdAt: true });
    insertPrinterConfigSchema = (0, import_drizzle_zod.createInsertSchema)(printerConfigs).omit({ id: true, updatedAt: true });
    insertDailyClosingSchema = (0, import_drizzle_zod.createInsertSchema)(dailyClosings).omit({ id: true, createdAt: true });
    insertMonthlyClosingSchema = (0, import_drizzle_zod.createInsertSchema)(monthlyClosings).omit({ id: true, createdAt: true });
    insertCustomerAddressSchema = (0, import_drizzle_zod.createInsertSchema)(customerAddresses).omit({ id: true, createdAt: true });
    insertPromoCodeSchema = (0, import_drizzle_zod.createInsertSchema)(promoCodes).omit({ id: true, createdAt: true });
    insertPromoCodeUsageSchema = (0, import_drizzle_zod.createInsertSchema)(promoCodeUsages).omit({ id: true, createdAt: true });
    insertDriverLocationSchema = (0, import_drizzle_zod.createInsertSchema)(driverLocations).omit({ id: true, recordedAt: true });
    insertLoyaltyTransactionSchema = (0, import_drizzle_zod.createInsertSchema)(loyaltyTransactions).omit({ id: true, createdAt: true });
    insertWalletTransactionSchema = (0, import_drizzle_zod.createInsertSchema)(walletTransactions).omit({ id: true, createdAt: true });
    insertOrderRatingSchema = (0, import_drizzle_zod.createInsertSchema)(orderRatings).omit({ id: true, createdAt: true });
    insertCustomerSessionSchema = (0, import_drizzle_zod.createInsertSchema)(customerSessions).omit({ id: true, createdAt: true });
    insertOtpVerificationSchema = (0, import_drizzle_zod.createInsertSchema)(otpVerifications).omit({ id: true, createdAt: true });
    insertDeliveryZoneSchema = (0, import_drizzle_zod.createInsertSchema)(deliveryZones).omit({ id: true, createdAt: true });
  }
});

// server/db.ts
var db_exports = {};
__export(db_exports, {
  db: () => db,
  pool: () => pool
});
var import_mysql2, import_promise, pool, db;
var init_db = __esm({
  "server/db.ts"() {
    "use strict";
    import_mysql2 = require("drizzle-orm/mysql2");
    import_promise = __toESM(require("mysql2/promise"));
    init_schema();
    pool = import_promise.default.createPool({
      host: process.env.MYSQL_HOST || "127.0.0.1",
      port: Number(process.env.MYSQL_PORT || 3306),
      user: process.env.MYSQL_USER || "",
      password: process.env.MYSQL_PASSWORD || "",
      database: process.env.MYSQL_DATABASE || "",
      waitForConnections: true,
      connectionLimit: 10,
      charset: "utf8mb4",
      connectTimeout: 3e4,
      typeCast(field, next) {
        if (field.type === "JSON") {
          const val = field.string();
          try {
            return val ? JSON.parse(val) : null;
          } catch {
            return val;
          }
        }
        return next();
      }
    });
    console.log(
      `[DB] MySQL \u2014 host: ${process.env.MYSQL_HOST || "127.0.0.1"}, port: ${process.env.MYSQL_PORT || 3306}, database: ${process.env.MYSQL_DATABASE}`
    );
    db = (0, import_mysql2.drizzle)(pool, { schema: schema_exports, mode: "default" });
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
function isSwissSubscriberOnly(digits) {
  return /^\d{7}$/.test(digits) && !digits.startsWith("0");
}
function isSwissLandlineWithAreaCode(digits) {
  return /^0[^7]\d{8}$/.test(digits);
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
  if (isSwissLandlineWithAreaCode(normalized)) {
    const subscriberOnly = normalized.slice(3);
    variants.add(subscriberOnly);
  }
  const digitsOnly2 = cleaned.replace(/\D/g, "");
  if (isSwissSubscriberOnly(digitsOnly2)) {
    for (const areaCode of SWISS_AREA_CODES) {
      variants.add(areaCode + digitsOnly2);
      variants.add("+41" + areaCode.slice(1) + digitsOnly2);
    }
  }
  return Array.from(variants).filter((v) => v.length >= 6);
}
var SWISS_AREA_CODES;
var init_phoneUtils = __esm({
  "server/phoneUtils.ts"() {
    "use strict";
    SWISS_AREA_CODES = [
      "044",
      "043",
      "022",
      "021",
      "026",
      "027",
      "031",
      "032",
      "033",
      "034",
      "041",
      "052",
      "055",
      "056",
      "061",
      "062",
      "071",
      "081",
      "091",
      "058",
      "076",
      "077",
      "078",
      "079"
    ];
  }
});

// server/storage.ts
var storage_exports = {};
__export(storage_exports, {
  storage: () => storage
});
function getStrippedPhoneSql(column) {
  return import_drizzle_orm.sql`REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(${column}, ''), ' ', ''), '-', ''), '(', ''), ')', ''), '.', ''), '/', ''), '+', '')`;
}
function getPhoneSearchConditions(column, variants) {
  const strippedColumn = getStrippedPhoneSql(column);
  const conditions = [];
  const digitVariants = /* @__PURE__ */ new Set();
  for (const variant of variants) {
    if (!variant) continue;
    conditions.push((0, import_drizzle_orm.like)(column, `%${variant}%`));
    const digits = variant.replace(/\D/g, "");
    if (digits.length >= 6) {
      digitVariants.add(digits);
    }
  }
  for (const digits of digitVariants) {
    conditions.push(import_drizzle_orm.sql`${strippedColumn} like ${"%" + digits + "%"}`);
  }
  return conditions;
}
function normalizeArrayLikeJson(value) {
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
function normalizeOnlineOrderRecord(order) {
  if (!order) {
    return order;
  }
  return {
    ...order,
    items: normalizeArrayLikeJson(order.items)
  };
}
var import_drizzle_orm, fs, storage;
var init_storage = __esm({
  "server/storage.ts"() {
    "use strict";
    init_db();
    import_drizzle_orm = require("drizzle-orm");
    fs = __toESM(require("fs"));
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
        return db.select().from(branches).orderBy((0, import_drizzle_orm.desc)(branches.createdAt));
      },
      async getBranchesByTenant(tenantId) {
        return db.select().from(branches).where((0, import_drizzle_orm.eq)(branches.tenantId, tenantId)).orderBy((0, import_drizzle_orm.desc)(branches.createdAt));
      },
      async getBranch(id) {
        const [branch] = await db.select().from(branches).where((0, import_drizzle_orm.eq)(branches.id, id));
        return branch;
      },
      async createBranch(data) {
        const _ins_branch = await db.insert(branches).values(data).$returningId();
        const [branch] = await db.select().from(branches).where((0, import_drizzle_orm.eq)(branches.id, _ins_branch[0]?.id ?? 0));
        return branch;
      },
      async updateBranch(id, data) {
        await db.update(branches).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm.eq)(branches.id, id));
        const [branch] = await db.select().from(branches).where((0, import_drizzle_orm.eq)(branches.id, id));
        return branch;
      },
      async deleteBranch(id) {
        await db.delete(branches).where((0, import_drizzle_orm.eq)(branches.id, id));
      },
      // Employees
      async getEmployees() {
        return db.select().from(employees).where((0, import_drizzle_orm.eq)(employees.isActive, true)).orderBy((0, import_drizzle_orm.desc)(employees.createdAt));
      },
      async getEmployeesByTenant(tenantId) {
        const tenantBranches = await this.getBranchesByTenant(tenantId);
        const branchIds = tenantBranches.map((b) => b.id);
        const { inArray } = await import("drizzle-orm");
        if (branchIds.length > 0) {
          return db.select().from(employees).where((0, import_drizzle_orm.and)((0, import_drizzle_orm.eq)(employees.isActive, true), (0, import_drizzle_orm.or)((0, import_drizzle_orm.eq)(employees.tenantId, tenantId), inArray(employees.branchId, branchIds)))).orderBy((0, import_drizzle_orm.desc)(employees.createdAt));
        }
        return db.select().from(employees).where((0, import_drizzle_orm.and)((0, import_drizzle_orm.eq)(employees.isActive, true), (0, import_drizzle_orm.eq)(employees.tenantId, tenantId))).orderBy((0, import_drizzle_orm.desc)(employees.createdAt));
      },
      async getEmployee(id) {
        const [emp] = await db.select().from(employees).where((0, import_drizzle_orm.eq)(employees.id, id));
        return emp;
      },
      async getEmployeeByPin(pin) {
        const [emp] = await db.select().from(employees).where((0, import_drizzle_orm.eq)(employees.pin, pin));
        return emp;
      },
      async createEmployee(data) {
        const _ins_emp = await db.insert(employees).values(data).$returningId();
        const [emp] = await db.select().from(employees).where((0, import_drizzle_orm.eq)(employees.id, _ins_emp[0]?.id ?? 0));
        return emp;
      },
      async updateEmployee(id, data) {
        await db.update(employees).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm.eq)(employees.id, id));
        const [emp] = await db.select().from(employees).where((0, import_drizzle_orm.eq)(employees.id, id));
        return emp;
      },
      async deleteEmployee(id) {
        await db.update(employees).set({ isActive: false, updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm.eq)(employees.id, id));
      },
      // Categories
      async getCategories(tenantId) {
        if (tenantId) {
          return db.select().from(categories).where((0, import_drizzle_orm.and)((0, import_drizzle_orm.eq)(categories.tenantId, tenantId), (0, import_drizzle_orm.eq)(categories.isActive, true))).orderBy(categories.sortOrder);
        }
        return db.select().from(categories).where((0, import_drizzle_orm.eq)(categories.isActive, true)).orderBy(categories.sortOrder);
      },
      async createCategory(data) {
        const _ins_cat = await db.insert(categories).values(data).$returningId();
        const [cat] = await db.select().from(categories).where((0, import_drizzle_orm.eq)(categories.id, _ins_cat[0]?.id ?? 0));
        return cat;
      },
      async getCategory(id) {
        const [category] = await db.select().from(categories).where((0, import_drizzle_orm.eq)(categories.id, id));
        return category;
      },
      async updateCategory(id, data) {
        const [cat] = await db.update(categories).set(data).where((0, import_drizzle_orm.eq)(categories.id, id));
        return cat;
      },
      async deleteCategory(id) {
        await db.update(categories).set({ isActive: false }).where((0, import_drizzle_orm.eq)(categories.id, id));
      },
      // Products
      async getProducts(search) {
        if (search) {
          const q = `%${search.toLowerCase()}%`;
          return db.select().from(products).where(
            (0, import_drizzle_orm.and)(
              (0, import_drizzle_orm.eq)(products.isActive, true),
              (0, import_drizzle_orm.or)(
                import_drizzle_orm.sql`LOWER(${products.name}) LIKE ${q}`,
                import_drizzle_orm.sql`LOWER(${products.nameAr}) LIKE ${q}`,
                import_drizzle_orm.sql`LOWER(${products.sku}) LIKE ${q}`,
                import_drizzle_orm.sql`LOWER(${products.barcode}) LIKE ${q}`,
                import_drizzle_orm.sql`LOWER(${products.description}) LIKE ${q}`
              )
            )
          ).orderBy((0, import_drizzle_orm.desc)(products.createdAt));
        }
        return db.select().from(products).where((0, import_drizzle_orm.eq)(products.isActive, true)).orderBy((0, import_drizzle_orm.desc)(products.createdAt));
      },
      async getProductsByTenant(tenantId, search) {
        if (search) {
          const q = `%${search.toLowerCase()}%`;
          return db.select().from(products).where(
            (0, import_drizzle_orm.and)(
              (0, import_drizzle_orm.eq)(products.tenantId, tenantId),
              (0, import_drizzle_orm.eq)(products.isActive, true),
              (0, import_drizzle_orm.or)(
                import_drizzle_orm.sql`LOWER(${products.name}) LIKE ${q}`,
                import_drizzle_orm.sql`LOWER(${products.nameAr}) LIKE ${q}`,
                import_drizzle_orm.sql`LOWER(${products.sku}) LIKE ${q}`,
                import_drizzle_orm.sql`LOWER(${products.barcode}) LIKE ${q}`,
                import_drizzle_orm.sql`LOWER(${products.description}) LIKE ${q}`
              )
            )
          ).orderBy((0, import_drizzle_orm.desc)(products.createdAt));
        }
        return db.select().from(products).where((0, import_drizzle_orm.and)((0, import_drizzle_orm.eq)(products.tenantId, tenantId), (0, import_drizzle_orm.eq)(products.isActive, true))).orderBy((0, import_drizzle_orm.desc)(products.createdAt));
      },
      async getProduct(id) {
        const [prod] = await db.select().from(products).where((0, import_drizzle_orm.eq)(products.id, id));
        return prod;
      },
      async getProductByBarcode(barcode) {
        const [prod] = await db.select().from(products).where((0, import_drizzle_orm.eq)(products.barcode, barcode));
        return prod;
      },
      async createProduct(data) {
        const _ins_prod = await db.insert(products).values(data).$returningId();
        const [prod] = await db.select().from(products).where((0, import_drizzle_orm.eq)(products.id, _ins_prod[0]?.id ?? 0));
        return prod;
      },
      async updateProduct(id, data) {
        await db.update(products).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm.eq)(products.id, id));
        const [prod] = await db.select().from(products).where((0, import_drizzle_orm.eq)(products.id, id));
        return prod;
      },
      async deleteProduct(id) {
        await db.update(products).set({ isActive: false }).where((0, import_drizzle_orm.eq)(products.id, id));
      },
      // Inventory
      async getInventory(branchId, tenantId) {
        if (branchId) {
          return db.select().from(inventory).where((0, import_drizzle_orm.eq)(inventory.branchId, branchId));
        }
        if (tenantId) {
          const tenantBranches = await this.getBranchesByTenant(tenantId);
          const branchIds = tenantBranches.map((b) => b.id);
          if (branchIds.length > 0) {
            const { inArray } = await import("drizzle-orm");
            return db.select().from(inventory).where(inArray(inventory.branchId, branchIds));
          }
          return [];
        }
        return db.select().from(inventory);
      },
      async getProductInventory(productId, branchId) {
        const [inv] = await db.select().from(inventory).where(
          (0, import_drizzle_orm.and)((0, import_drizzle_orm.eq)(inventory.productId, productId), (0, import_drizzle_orm.eq)(inventory.branchId, branchId))
        );
        return inv;
      },
      async upsertInventory(data) {
        const existing = await this.getProductInventory(data.productId, data.branchId);
        if (existing) {
          const [inv2] = await db.update(inventory).set({ quantity: data.quantity, updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm.eq)(inventory.id, existing.id));
          return inv2;
        }
        const _ins_inv = await db.insert(inventory).values(data).$returningId();
        const [inv] = await db.select().from(inventory).where((0, import_drizzle_orm.eq)(inventory.id, _ins_inv[0]?.id ?? 0));
        return inv;
      },
      async adjustInventory(productId, branchId, adjustment) {
        const existing = await this.getProductInventory(productId, branchId);
        if (existing) {
          const newQty = (existing.quantity || 0) + adjustment;
          const [inv2] = await db.update(inventory).set({ quantity: newQty, updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm.eq)(inventory.id, existing.id));
          return inv2;
        }
        const [inv] = await db.insert(inventory).values({ productId, branchId, quantity: adjustment });
        return inv;
      },
      async getLowStockItems(branchId) {
        const { inArray, notInArray, lte: ltEq } = await import("drizzle-orm");
        const restaurantTenants = await db.select({ id: tenants.id }).from(tenants).where((0, import_drizzle_orm.eq)(tenants.storeType, "restaurant"));
        const restaurantTenantIds = restaurantTenants.map((t) => t.id);
        let excludedBranchIds = [];
        if (restaurantTenantIds.length > 0) {
          const restaurantBranches = await db.select({ id: branches.id }).from(branches).where(inArray(branches.tenantId, restaurantTenantIds));
          excludedBranchIds = restaurantBranches.map((b) => b.id);
        }
        const conditions = [
          import_drizzle_orm.sql`${inventory.quantity} <= ${inventory.lowStockThreshold}`
        ];
        if (branchId) {
          conditions.push((0, import_drizzle_orm.eq)(inventory.branchId, branchId));
        }
        if (excludedBranchIds.length > 0) {
          conditions.push(notInArray(inventory.branchId, excludedBranchIds));
        }
        return db.select().from(inventory).where((0, import_drizzle_orm.and)(...conditions));
      },
      // Customers
      async getCustomers(search, tenantId, limit = 50, offset = 0) {
        const conditions = [(0, import_drizzle_orm.or)((0, import_drizzle_orm.eq)(customers.isActive, true), (0, import_drizzle_orm.isNull)(customers.isActive))];
        if (tenantId) conditions.push((0, import_drizzle_orm.eq)(customers.tenantId, tenantId));
        if (search) {
          const looksLikePhone = /^[\d\s\+\-\(\)\.]{4,}$/.test(search.trim());
          if (looksLikePhone) {
            const { getPhoneSearchVariants: getPhoneSearchVariants2 } = await Promise.resolve().then(() => (init_phoneUtils(), phoneUtils_exports));
            const variants = getPhoneSearchVariants2(search.trim());
            conditions.push((0, import_drizzle_orm.or)(...getPhoneSearchConditions(customers.phone, variants)));
          } else {
            conditions.push(
              (0, import_drizzle_orm.or)(
                (0, import_drizzle_orm.like)(customers.name, `%${search}%`),
                (0, import_drizzle_orm.like)(customers.phone || "", `%${search}%`),
                (0, import_drizzle_orm.like)(customers.email || "", `%${search}%`),
                (0, import_drizzle_orm.like)(customers.company || "", `%${search}%`),
                (0, import_drizzle_orm.like)(customers.city || "", `%${search}%`),
                (0, import_drizzle_orm.like)(customers.street || "", `%${search}%`),
                (0, import_drizzle_orm.like)(customers.postalCode || "", `%${search}%`),
                (0, import_drizzle_orm.like)(customers.firstName || "", `%${search}%`),
                (0, import_drizzle_orm.like)(customers.lastName || "", `%${search}%`)
              )
            );
          }
        }
        return db.select().from(customers).where((0, import_drizzle_orm.and)(...conditions)).orderBy((0, import_drizzle_orm.desc)(customers.createdAt)).limit(limit).offset(offset);
      },
      async getCustomerCount(search, tenantId) {
        const conditions = [(0, import_drizzle_orm.or)((0, import_drizzle_orm.eq)(customers.isActive, true), (0, import_drizzle_orm.isNull)(customers.isActive))];
        if (tenantId) conditions.push((0, import_drizzle_orm.eq)(customers.tenantId, tenantId));
        if (search) {
          const looksLikePhone = /^[\d\s\+\-\(\)\.]{4,}$/.test(search.trim());
          if (looksLikePhone) {
            const { getPhoneSearchVariants: getPhoneSearchVariants2 } = await Promise.resolve().then(() => (init_phoneUtils(), phoneUtils_exports));
            const variants = getPhoneSearchVariants2(search.trim());
            conditions.push((0, import_drizzle_orm.or)(...getPhoneSearchConditions(customers.phone, variants)));
          } else {
            conditions.push(
              (0, import_drizzle_orm.or)(
                (0, import_drizzle_orm.like)(customers.name, `%${search}%`),
                (0, import_drizzle_orm.like)(customers.phone || "", `%${search}%`),
                (0, import_drizzle_orm.like)(customers.email || "", `%${search}%`),
                (0, import_drizzle_orm.like)(customers.company || "", `%${search}%`),
                (0, import_drizzle_orm.like)(customers.city || "", `%${search}%`),
                (0, import_drizzle_orm.like)(customers.street || "", `%${search}%`),
                (0, import_drizzle_orm.like)(customers.postalCode || "", `%${search}%`),
                (0, import_drizzle_orm.like)(customers.firstName || "", `%${search}%`),
                (0, import_drizzle_orm.like)(customers.lastName || "", `%${search}%`)
              )
            );
          }
        }
        const [result] = await db.select({ count: import_drizzle_orm.sql`count(*)` }).from(customers).where((0, import_drizzle_orm.and)(...conditions));
        return Number(result?.count || 0);
      },
      async findCustomerByPhone(phone, tenantId) {
        const { getPhoneSearchVariants: getPhoneSearchVariants2, normalizePhone: normalizePhone2, lastNDigits: lastNDigits2 } = await Promise.resolve().then(() => (init_phoneUtils(), phoneUtils_exports));
        const variants = getPhoneSearchVariants2(phone);
        const strippedCol = getStrippedPhoneSql(customers.phone);
        const phoneConditions = getPhoneSearchConditions(customers.phone, variants);
        const last8 = lastNDigits2(phone, 8);
        if (last8.length >= 7) {
          phoneConditions.push(
            import_drizzle_orm.sql`RIGHT(${strippedCol}, 8) = ${last8}`
          );
        }
        const last7 = lastNDigits2(phone, 7);
        if (last7.length === 7) {
          phoneConditions.push(
            import_drizzle_orm.sql`${strippedCol} = ${last7}`
          );
        }
        const conditions = [
          (0, import_drizzle_orm.eq)(customers.isActive, true),
          (0, import_drizzle_orm.or)(...phoneConditions)
        ];
        if (tenantId) {
          conditions.push((0, import_drizzle_orm.eq)(customers.tenantId, tenantId));
        }
        const normalized = normalizePhone2(phone);
        const results = await db.select().from(customers).where((0, import_drizzle_orm.and)(...conditions)).limit(5);
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
        const [cust] = await db.select().from(customers).where((0, import_drizzle_orm.eq)(customers.id, id));
        return cust;
      },
      async createCustomer(data) {
        const _ins_cust = await db.insert(customers).values(data).$returningId();
        const [cust] = await db.select().from(customers).where((0, import_drizzle_orm.eq)(customers.id, _ins_cust[0]?.id ?? 0));
        return cust;
      },
      async updateCustomer(id, data) {
        await db.update(customers).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm.eq)(customers.id, id));
        const [cust] = await db.select().from(customers).where((0, import_drizzle_orm.eq)(customers.id, id));
        return cust;
      },
      async deleteCustomer(id) {
        const [cust] = await db.delete(customers).where((0, import_drizzle_orm.eq)(customers.id, id));
        return cust;
      },
      async addLoyaltyPoints(id, points) {
        const cust = await this.getCustomer(id);
        if (!cust) return null;
        return this.updateCustomer(id, { loyaltyPoints: (cust.loyaltyPoints || 0) + points });
      },
      // Sales
      async getCustomerSales(customerId) {
        return db.select().from(sales).where((0, import_drizzle_orm.eq)(sales.customerId, customerId)).orderBy((0, import_drizzle_orm.desc)(sales.createdAt)).limit(50);
      },
      async getSales(filters) {
        let conditions = [];
        if (filters?.branchId) conditions.push((0, import_drizzle_orm.eq)(sales.branchId, filters.branchId));
        if (filters?.tenantId) {
          const tenantBranches = await this.getBranchesByTenant(filters.tenantId);
          const branchIds = tenantBranches.map((b) => b.id);
          if (branchIds.length > 0) {
            const { inArray } = await import("drizzle-orm");
            conditions.push(inArray(sales.branchId, branchIds));
          } else {
            return [];
          }
        }
        let query = conditions.length > 0 ? db.select().from(sales).where((0, import_drizzle_orm.and)(...conditions)) : db.select().from(sales);
        if (filters?.limit) {
          return query.orderBy((0, import_drizzle_orm.desc)(sales.createdAt)).limit(filters.limit);
        }
        return query.orderBy((0, import_drizzle_orm.desc)(sales.createdAt));
      },
      async getSale(id) {
        const [sale] = await db.select().from(sales).where((0, import_drizzle_orm.eq)(sales.id, id));
        return sale;
      },
      async createSale(data) {
        const _ins_sale = await db.insert(sales).values(data).$returningId();
        const [sale] = await db.select().from(sales).where((0, import_drizzle_orm.eq)(sales.id, _ins_sale[0]?.id ?? 0));
        return sale;
      },
      async getSaleItems(saleId) {
        return db.select().from(saleItems).where((0, import_drizzle_orm.eq)(saleItems.saleId, saleId));
      },
      async deleteSaleItems(saleId) {
        await db.delete(saleItems).where((0, import_drizzle_orm.eq)(saleItems.saleId, saleId));
      },
      async createSaleItem(data) {
        const _ins_item = await db.insert(saleItems).values(data).$returningId();
        const [item] = await db.select().from(saleItems).where((0, import_drizzle_orm.eq)(saleItems.id, _ins_item[0]?.id ?? 0));
        return item;
      },
      async updateSale(id, data) {
        const [sale] = await db.update(sales).set(data).where((0, import_drizzle_orm.eq)(sales.id, id));
        return sale;
      },
      async deleteSale(id) {
        await db.delete(saleItems).where((0, import_drizzle_orm.eq)(saleItems.saleId, id));
        await db.delete(sales).where((0, import_drizzle_orm.eq)(sales.id, id));
      },
      // Suppliers
      async getSuppliers(tenantId) {
        if (tenantId) {
          return db.select().from(suppliers).where((0, import_drizzle_orm.and)((0, import_drizzle_orm.eq)(suppliers.tenantId, tenantId), (0, import_drizzle_orm.eq)(suppliers.isActive, true))).orderBy((0, import_drizzle_orm.desc)(suppliers.createdAt));
        }
        return db.select().from(suppliers).where((0, import_drizzle_orm.eq)(suppliers.isActive, true)).orderBy((0, import_drizzle_orm.desc)(suppliers.createdAt));
      },
      async getSupplier(id) {
        const [sup] = await db.select().from(suppliers).where((0, import_drizzle_orm.eq)(suppliers.id, id));
        return sup;
      },
      async createSupplier(data) {
        const _ins_sup = await db.insert(suppliers).values(data).$returningId();
        const [sup] = await db.select().from(suppliers).where((0, import_drizzle_orm.eq)(suppliers.id, _ins_sup[0]?.id ?? 0));
        return sup;
      },
      async updateSupplier(id, data) {
        await db.update(suppliers).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm.eq)(suppliers.id, id));
        const [sup] = await db.select().from(suppliers).where((0, import_drizzle_orm.eq)(suppliers.id, id));
        return sup;
      },
      // Purchase Orders
      async getPurchaseOrders(tenantId) {
        if (tenantId) {
          const tenantBranches = await this.getBranchesByTenant(tenantId);
          const branchIds = tenantBranches.map((b) => b.id);
          if (branchIds.length > 0) {
            const { inArray } = await import("drizzle-orm");
            return db.select().from(purchaseOrders).where(inArray(purchaseOrders.branchId, branchIds)).orderBy((0, import_drizzle_orm.desc)(purchaseOrders.createdAt));
          }
          return [];
        }
        return db.select().from(purchaseOrders).orderBy((0, import_drizzle_orm.desc)(purchaseOrders.createdAt));
      },
      async createPurchaseOrder(data) {
        const _ins_po = await db.insert(purchaseOrders).values(data).$returningId();
        const [po] = await db.select().from(purchaseOrders).where((0, import_drizzle_orm.eq)(purchaseOrders.id, _ins_po[0]?.id ?? 0));
        return po;
      },
      async updatePurchaseOrder(id, data) {
        const [po] = await db.update(purchaseOrders).set(data).where((0, import_drizzle_orm.eq)(purchaseOrders.id, id));
        return po;
      },
      async getPurchaseOrder(id) {
        const [po] = await db.select().from(purchaseOrders).where((0, import_drizzle_orm.eq)(purchaseOrders.id, id));
        return po;
      },
      async getPurchaseOrderItems(poId) {
        return db.select().from(purchaseOrderItems).where((0, import_drizzle_orm.eq)(purchaseOrderItems.purchaseOrderId, poId));
      },
      async createPurchaseOrderItem(data) {
        const _ins_item = await db.insert(purchaseOrderItems).values(data).$returningId();
        const [item] = await db.select().from(purchaseOrderItems).where((0, import_drizzle_orm.eq)(purchaseOrderItems.id, _ins_item[0]?.id ?? 0));
        return item;
      },
      async receivePurchaseOrder(id, items) {
        const po = await this.getPurchaseOrder(id);
        if (!po) return null;
        for (const item of items) {
          await db.update(purchaseOrderItems).set({ receivedQuantity: item.receivedQuantity }).where((0, import_drizzle_orm.and)((0, import_drizzle_orm.eq)(purchaseOrderItems.purchaseOrderId, id), (0, import_drizzle_orm.eq)(purchaseOrderItems.productId, item.productId)));
          if (po.branchId) {
            await this.adjustInventory(item.productId, po.branchId, item.receivedQuantity);
          }
        }
        await db.update(purchaseOrders).set({ status: "received", receivedDate: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm.eq)(purchaseOrders.id, id));
        const [updated] = await db.select().from(purchaseOrders).where((0, import_drizzle_orm.eq)(purchaseOrders.id, id));
        return updated;
      },
      // Shifts
      async getShifts(tenantId) {
        if (tenantId) {
          const tenantBranches = await this.getBranchesByTenant(tenantId);
          const branchIds = tenantBranches.map((b) => b.id);
          if (branchIds.length > 0) {
            const { inArray } = await import("drizzle-orm");
            return db.select().from(shifts).where(inArray(shifts.branchId, branchIds)).orderBy((0, import_drizzle_orm.desc)(shifts.startTime));
          }
          return [];
        }
        return db.select().from(shifts).orderBy((0, import_drizzle_orm.desc)(shifts.startTime));
      },
      async getActiveShiftsGlobal(tenantId) {
        if (tenantId) {
          const tenantBranches = await this.getBranchesByTenant(tenantId);
          const branchIds = tenantBranches.map((b) => b.id);
          if (branchIds.length > 0) {
            const { inArray } = await import("drizzle-orm");
            return db.select().from(shifts).where((0, import_drizzle_orm.and)((0, import_drizzle_orm.eq)(shifts.status, "open"), inArray(shifts.branchId, branchIds))).orderBy((0, import_drizzle_orm.desc)(shifts.startTime));
          }
          return [];
        }
        return db.select().from(shifts).where((0, import_drizzle_orm.eq)(shifts.status, "open")).orderBy((0, import_drizzle_orm.desc)(shifts.startTime));
      },
      async getActiveShift(employeeId) {
        const [shift] = await db.select().from(shifts).where(
          (0, import_drizzle_orm.and)((0, import_drizzle_orm.eq)(shifts.employeeId, employeeId), (0, import_drizzle_orm.eq)(shifts.status, "open"))
        );
        return shift;
      },
      async createShift(data) {
        const _ins_shift = await db.insert(shifts).values(data).$returningId();
        const [shift] = await db.select().from(shifts).where((0, import_drizzle_orm.eq)(shifts.id, _ins_shift[0]?.id ?? 0));
        return shift;
      },
      async closeShift(id, data) {
        const [shift] = await db.update(shifts).set({
          ...data,
          endTime: /* @__PURE__ */ new Date(),
          status: "closed"
        }).where((0, import_drizzle_orm.eq)(shifts.id, id));
        return shift;
      },
      async getEmployeeAttendance(employeeId) {
        return db.select().from(shifts).where((0, import_drizzle_orm.eq)(shifts.employeeId, employeeId)).orderBy((0, import_drizzle_orm.desc)(shifts.startTime));
      },
      // Expenses
      async getExpenses(tenantId) {
        if (tenantId) {
          return db.select().from(expenses).where((0, import_drizzle_orm.eq)(expenses.tenantId, tenantId)).orderBy((0, import_drizzle_orm.desc)(expenses.createdAt));
        }
        return db.select().from(expenses).orderBy((0, import_drizzle_orm.desc)(expenses.createdAt));
      },
      async createExpense(data) {
        const _ins_exp = await db.insert(expenses).values(data).$returningId();
        const [exp] = await db.select().from(expenses).where((0, import_drizzle_orm.eq)(expenses.id, _ins_exp[0]?.id ?? 0));
        return exp;
      },
      async getExpensesByDateRange(startDate, endDate) {
        const conditions = [];
        if (startDate) conditions.push((0, import_drizzle_orm.gte)(expenses.date, startDate));
        if (endDate) conditions.push((0, import_drizzle_orm.lte)(expenses.date, endDate));
        if (conditions.length > 0) {
          return db.select().from(expenses).where((0, import_drizzle_orm.and)(...conditions)).orderBy((0, import_drizzle_orm.desc)(expenses.createdAt));
        }
        return db.select().from(expenses).orderBy((0, import_drizzle_orm.desc)(expenses.createdAt));
      },
      async deleteExpense(id) {
        await db.delete(expenses).where((0, import_drizzle_orm.eq)(expenses.id, id));
      },
      // Tables
      async getTables(branchId) {
        if (branchId) {
          return db.select().from(tables).where((0, import_drizzle_orm.eq)(tables.branchId, branchId));
        }
        return db.select().from(tables);
      },
      async createTable(data) {
        const _ins_table = await db.insert(tables).values(data).$returningId();
        const [table] = await db.select().from(tables).where((0, import_drizzle_orm.eq)(tables.id, _ins_table[0]?.id ?? 0));
        return table;
      },
      async updateTable(id, data) {
        const [table] = await db.update(tables).set(data).where((0, import_drizzle_orm.eq)(tables.id, id));
        return table;
      },
      // Kitchen Orders
      async getKitchenOrders(branchId) {
        if (branchId) {
          return db.select().from(kitchenOrders).where(
            (0, import_drizzle_orm.and)((0, import_drizzle_orm.eq)(kitchenOrders.branchId, branchId), (0, import_drizzle_orm.eq)(kitchenOrders.status, "pending"))
          ).orderBy(kitchenOrders.createdAt);
        }
        return db.select().from(kitchenOrders).where((0, import_drizzle_orm.eq)(kitchenOrders.status, "pending")).orderBy(kitchenOrders.createdAt);
      },
      async createKitchenOrder(data) {
        const _ins_order = await db.insert(kitchenOrders).values(data).$returningId();
        const [order] = await db.select().from(kitchenOrders).where((0, import_drizzle_orm.eq)(kitchenOrders.id, _ins_order[0]?.id ?? 0));
        return order;
      },
      async updateKitchenOrder(id, data) {
        await db.update(kitchenOrders).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm.eq)(kitchenOrders.id, id));
        const [order] = await db.select().from(kitchenOrders).where((0, import_drizzle_orm.eq)(kitchenOrders.id, id));
        return order;
      },
      // Subscriptions
      async getSubscriptionPlans() {
        return db.select().from(subscriptionPlans).where((0, import_drizzle_orm.eq)(subscriptionPlans.isActive, true));
      },
      async createSubscriptionPlan(data) {
        const _ins_plan = await db.insert(subscriptionPlans).values(data).$returningId();
        const [plan] = await db.select().from(subscriptionPlans).where((0, import_drizzle_orm.eq)(subscriptionPlans.id, _ins_plan[0]?.id ?? 0));
        return plan;
      },
      async getSubscriptions() {
        return db.select().from(subscriptions).orderBy((0, import_drizzle_orm.desc)(subscriptions.createdAt));
      },
      async createSubscription(data) {
        const _ins_sub = await db.insert(subscriptions).values(data).$returningId();
        const [sub] = await db.select().from(subscriptions).where((0, import_drizzle_orm.eq)(subscriptions.id, _ins_sub[0]?.id ?? 0));
        return sub;
      },
      async getActivityLog(limit, tenantId) {
        const l = limit || 50;
        if (tenantId) {
          const emps = await this.getEmployeesByTenant(tenantId);
          const empIds = emps.map((e) => e.id);
          if (empIds.length > 0) {
            const { inArray } = await import("drizzle-orm");
            return db.select().from(activityLog).where(inArray(activityLog.employeeId, empIds)).orderBy((0, import_drizzle_orm.desc)(activityLog.createdAt)).limit(l);
          }
          return [];
        }
        return db.select().from(activityLog).orderBy((0, import_drizzle_orm.desc)(activityLog.createdAt)).limit(l);
      },
      async createActivityLog(data) {
        const _ins_log = await db.insert(activityLog).values(data).$returningId();
        const [log3] = await db.select().from(activityLog).where((0, import_drizzle_orm.eq)(activityLog.id, _ins_log[0]?.id ?? 0));
        return log3;
      },
      // Calls
      async getCalls(tenantId, limit = 500) {
        const conditions = [];
        if (tenantId) conditions.push((0, import_drizzle_orm.eq)(calls.tenantId, tenantId));
        const baseQuery = db.select({
          id: calls.id,
          tenantId: calls.tenantId,
          branchId: calls.branchId,
          phoneNumber: calls.phoneNumber,
          customerId: calls.customerId,
          status: calls.status,
          saleId: calls.saleId,
          createdAt: calls.createdAt,
          customerName: customers.name,
          customerAddress: customers.address
        }).from(calls).leftJoin(customers, (0, import_drizzle_orm.eq)(calls.customerId, customers.id));
        const withWhere = conditions.length > 0 ? baseQuery.where((0, import_drizzle_orm.and)(...conditions)) : baseQuery;
        return withWhere.orderBy((0, import_drizzle_orm.desc)(calls.createdAt)).limit(limit);
      },
      async createCall(data) {
        const _ins_call = await db.insert(calls).values(data).$returningId();
        const [call] = await db.select().from(calls).where((0, import_drizzle_orm.eq)(calls.id, _ins_call[0]?.id ?? 0));
        return call;
      },
      async updateCall(id, data) {
        const [call] = await db.update(calls).set(data).where((0, import_drizzle_orm.eq)(calls.id, id));
        return call;
      },
      // Returns
      async getReturns(tenantId) {
        if (tenantId) {
          const tenantBranches = await this.getBranchesByTenant(tenantId);
          const branchIds = tenantBranches.map((b) => b.id);
          if (branchIds.length > 0) {
            const { inArray } = await import("drizzle-orm");
            return db.select().from(returns).where(inArray(returns.branchId, branchIds)).orderBy((0, import_drizzle_orm.desc)(returns.createdAt));
          }
          return [];
        }
        return db.select().from(returns).orderBy((0, import_drizzle_orm.desc)(returns.createdAt));
      },
      async getReturn(id) {
        const [ret] = await db.select().from(returns).where((0, import_drizzle_orm.eq)(returns.id, id));
        return ret;
      },
      async createReturn(data) {
        const _ins_ret = await db.insert(returns).values(data).$returningId();
        const [ret] = await db.select().from(returns).where((0, import_drizzle_orm.eq)(returns.id, _ins_ret[0]?.id ?? 0));
        return ret;
      },
      async getReturnItems(returnId) {
        return db.select().from(returnItems).where((0, import_drizzle_orm.eq)(returnItems.returnId, returnId));
      },
      async createReturnItem(data) {
        const _ins_item = await db.insert(returnItems).values(data).$returningId();
        const [item] = await db.select().from(returnItems).where((0, import_drizzle_orm.eq)(returnItems.id, _ins_item[0]?.id ?? 0));
        return item;
      },
      // Sales Analytics
      async getSalesByDateRange(startDate, endDate) {
        return db.select().from(sales).where((0, import_drizzle_orm.and)((0, import_drizzle_orm.gte)(sales.createdAt, startDate), (0, import_drizzle_orm.lte)(sales.createdAt, endDate))).orderBy((0, import_drizzle_orm.desc)(sales.createdAt));
      },
      async getSalesWithCustomerByDateRange(startDate, endDate) {
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
          customerPostalCode: customers.postalCode
        }).from(sales).leftJoin(customers, (0, import_drizzle_orm.eq)(sales.customerId, customers.id)).where((0, import_drizzle_orm.and)((0, import_drizzle_orm.gte)(sales.createdAt, startDate), (0, import_drizzle_orm.lte)(sales.createdAt, endDate))).orderBy(sales.createdAt);
      },
      async getTopProducts(limit) {
        const topLimit = limit || 10;
        const result = await db.select({
          productId: saleItems.productId,
          name: saleItems.productName,
          totalSold: import_drizzle_orm.sql`sum(${saleItems.quantity})`,
          revenue: import_drizzle_orm.sql`sum(${saleItems.total})`
        }).from(saleItems).groupBy(saleItems.productId, saleItems.productName).orderBy(import_drizzle_orm.sql`sum(${saleItems.quantity}) desc`).limit(topLimit);
        return result.map((r) => ({ ...r, totalSold: Number(r.totalSold), revenue: Number(r.revenue) }));
      },
      async getSalesByPaymentMethod() {
        const result = await db.select({
          method: sales.paymentMethod,
          count: import_drizzle_orm.sql`count(*)`,
          total: import_drizzle_orm.sql`coalesce(sum(${sales.totalAmount}), 0)`
        }).from(sales).groupBy(sales.paymentMethod);
        return result.map((r) => ({ method: r.method, count: Number(r.count), total: Number(r.total) }));
      },
      // Dashboard Stats
      async getDashboardStats(tenantId) {
        let salesCountQuery = db.select({ count: import_drizzle_orm.sql`count(*)` }).from(sales);
        let totalRevenueQuery = db.select({ total: import_drizzle_orm.sql`coalesce(sum(total_amount), 0)` }).from(sales);
        let customerCountQuery = db.select({ count: import_drizzle_orm.sql`count(*)` }).from(customers);
        let productCountQuery = db.select({ count: import_drizzle_orm.sql`count(*)` }).from(products).where((0, import_drizzle_orm.eq)(products.isActive, true));
        let lowStockQuery;
        let todaySalesQuery;
        let weekSalesQuery;
        let monthSalesQuery;
        let totalExpensesQuery = db.select({ total: import_drizzle_orm.sql`coalesce(sum(${expenses.amount}), 0)` }).from(expenses);
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
            const { inArray } = await import("drizzle-orm");
            salesCountQuery = db.select({ count: import_drizzle_orm.sql`count(*)` }).from(sales).where(inArray(sales.branchId, branchIds));
            totalRevenueQuery = db.select({ total: import_drizzle_orm.sql`coalesce(sum(total_amount), 0)` }).from(sales).where(inArray(sales.branchId, branchIds));
            customerCountQuery = db.select({ count: import_drizzle_orm.sql`count(*)` }).from(customers).where((0, import_drizzle_orm.eq)(customers.tenantId, tenantId));
            productCountQuery = db.select({ count: import_drizzle_orm.sql`count(*)` }).from(products).where((0, import_drizzle_orm.and)((0, import_drizzle_orm.eq)(products.tenantId, tenantId), (0, import_drizzle_orm.eq)(products.isActive, true)));
            const [tenant] = await db.select().from(tenants).where((0, import_drizzle_orm.eq)(tenants.id, tenantId));
            const isRestaurant = tenant?.storeType === "restaurant";
            lowStockQuery = isRestaurant ? db.select({ count: import_drizzle_orm.sql`cast(0 as integer)` }).from(branches).limit(1) : db.select({ count: import_drizzle_orm.sql`count(*)` }).from(inventory).where((0, import_drizzle_orm.and)(import_drizzle_orm.sql`quantity <= low_stock_threshold`, inArray(inventory.branchId, branchIds)));
            todaySalesQuery = db.select({
              count: import_drizzle_orm.sql`count(*)`,
              total: import_drizzle_orm.sql`coalesce(sum(total_amount), 0)`
            }).from(sales).where((0, import_drizzle_orm.and)((0, import_drizzle_orm.gte)(sales.createdAt, todayStart), inArray(sales.branchId, branchIds)));
            weekSalesQuery = db.select({
              total: import_drizzle_orm.sql`coalesce(sum(total_amount), 0)`
            }).from(sales).where((0, import_drizzle_orm.and)((0, import_drizzle_orm.gte)(sales.createdAt, weekStart), inArray(sales.branchId, branchIds)));
            monthSalesQuery = db.select({
              total: import_drizzle_orm.sql`coalesce(sum(total_amount), 0)`
            }).from(sales).where((0, import_drizzle_orm.and)((0, import_drizzle_orm.gte)(sales.createdAt, monthStart), inArray(sales.branchId, branchIds)));
            totalExpensesQuery = db.select({ total: import_drizzle_orm.sql`coalesce(sum(${expenses.amount}), 0)` }).from(expenses).where((0, import_drizzle_orm.eq)(expenses.tenantId, tenantId));
            todayExpensesQuery = db.select({
              total: import_drizzle_orm.sql`coalesce(sum(${expenses.amount}), 0)`
            }).from(expenses).where((0, import_drizzle_orm.and)((0, import_drizzle_orm.gte)(expenses.date, todayStart), (0, import_drizzle_orm.eq)(expenses.tenantId, tenantId)));
            const topLimit = 5;
            topProductsQuery = db.select({
              productId: saleItems.productId,
              name: saleItems.productName,
              totalSold: import_drizzle_orm.sql`sum(${saleItems.quantity})`,
              revenue: import_drizzle_orm.sql`sum(${saleItems.total})`
            }).from(saleItems).innerJoin(sales, (0, import_drizzle_orm.eq)(saleItems.saleId, sales.id)).where(inArray(sales.branchId, branchIds)).groupBy(saleItems.productId, saleItems.productName).orderBy(import_drizzle_orm.sql`sum(${saleItems.quantity}) desc`).limit(topLimit);
            salesByPaymentMethodQuery = db.select({
              method: sales.paymentMethod,
              count: import_drizzle_orm.sql`count(*)`,
              total: import_drizzle_orm.sql`coalesce(sum(${sales.totalAmount}), 0)`
            }).from(sales).where(inArray(sales.branchId, branchIds)).groupBy(sales.paymentMethod);
            recentSalesQuery = db.select().from(sales).where(inArray(sales.branchId, branchIds)).orderBy((0, import_drizzle_orm.desc)(sales.createdAt)).limit(5);
            profitRowQuery = db.select({
              totalCost: import_drizzle_orm.sql`coalesce(sum(${products.costPrice} * ${saleItems.quantity}), 0)`
            }).from(saleItems).innerJoin(products, (0, import_drizzle_orm.eq)(saleItems.productId, products.id)).innerJoin(sales, (0, import_drizzle_orm.eq)(saleItems.saleId, sales.id)).where(inArray(sales.branchId, branchIds));
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
          lowStockQuery = db.select({ count: import_drizzle_orm.sql`count(*)` }).from(inventory).where(import_drizzle_orm.sql`quantity <= low_stock_threshold`);
          todaySalesQuery = db.select({
            count: import_drizzle_orm.sql`count(*)`,
            total: import_drizzle_orm.sql`coalesce(sum(total_amount), 0)`
          }).from(sales).where((0, import_drizzle_orm.gte)(sales.createdAt, todayStart));
          weekSalesQuery = db.select({
            total: import_drizzle_orm.sql`coalesce(sum(total_amount), 0)`
          }).from(sales).where((0, import_drizzle_orm.gte)(sales.createdAt, weekStart));
          monthSalesQuery = db.select({
            total: import_drizzle_orm.sql`coalesce(sum(total_amount), 0)`
          }).from(sales).where((0, import_drizzle_orm.gte)(sales.createdAt, monthStart));
          todayExpensesQuery = db.select({
            total: import_drizzle_orm.sql`coalesce(sum(${expenses.amount}), 0)`
          }).from(expenses).where((0, import_drizzle_orm.gte)(expenses.date, todayStart));
          topProductsQuery = db.select({
            productId: saleItems.productId,
            name: saleItems.productName,
            totalSold: import_drizzle_orm.sql`sum(${saleItems.quantity})`,
            revenue: import_drizzle_orm.sql`sum(${saleItems.total})`
          }).from(saleItems).groupBy(saleItems.productId, saleItems.productName).orderBy(import_drizzle_orm.sql`sum(${saleItems.quantity}) desc`).limit(5);
          salesByPaymentMethodQuery = db.select({
            method: sales.paymentMethod,
            count: import_drizzle_orm.sql`count(*)`,
            total: import_drizzle_orm.sql`coalesce(sum(${sales.totalAmount}), 0)`
          }).from(sales).groupBy(sales.paymentMethod);
          recentSalesQuery = db.select().from(sales).orderBy((0, import_drizzle_orm.desc)(sales.createdAt)).limit(5);
          profitRowQuery = db.select({
            totalCost: import_drizzle_orm.sql`coalesce(sum(${products.costPrice} * ${saleItems.quantity}), 0)`
          }).from(saleItems).innerJoin(products, (0, import_drizzle_orm.eq)(saleItems.productId, products.id));
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
        return db.select().from(cashDrawerOperations).where((0, import_drizzle_orm.eq)(cashDrawerOperations.shiftId, shiftId)).orderBy((0, import_drizzle_orm.desc)(cashDrawerOperations.createdAt));
      },
      async createCashDrawerOperation(data) {
        const _ins_op = await db.insert(cashDrawerOperations).values(data).$returningId();
        const [op] = await db.select().from(cashDrawerOperations).where((0, import_drizzle_orm.eq)(cashDrawerOperations.id, _ins_op[0]?.id ?? 0));
        return op;
      },
      // Warehouses
      async getWarehouses(branchId, tenantId) {
        if (branchId) return db.select().from(warehouses).where((0, import_drizzle_orm.and)((0, import_drizzle_orm.eq)(warehouses.branchId, branchId), (0, import_drizzle_orm.eq)(warehouses.isActive, true)));
        if (tenantId) {
          const tenantBranches = await this.getBranchesByTenant(tenantId);
          const branchIds = tenantBranches.map((b) => b.id);
          if (branchIds.length > 0) {
            const { inArray } = await import("drizzle-orm");
            return db.select().from(warehouses).where((0, import_drizzle_orm.and)(inArray(warehouses.branchId, branchIds), (0, import_drizzle_orm.eq)(warehouses.isActive, true)));
          }
          return [];
        }
        return db.select().from(warehouses).where((0, import_drizzle_orm.eq)(warehouses.isActive, true));
      },
      async createWarehouse(data) {
        const _ins_wh = await db.insert(warehouses).values(data).$returningId();
        const [wh] = await db.select().from(warehouses).where((0, import_drizzle_orm.eq)(warehouses.id, _ins_wh[0]?.id ?? 0));
        return wh;
      },
      async updateWarehouse(id, data) {
        const [wh] = await db.update(warehouses).set(data).where((0, import_drizzle_orm.eq)(warehouses.id, id));
        return wh;
      },
      // Warehouse Transfers
      async getWarehouseTransfers() {
        return db.select().from(warehouseTransfers).orderBy((0, import_drizzle_orm.desc)(warehouseTransfers.createdAt));
      },
      async createWarehouseTransfer(data) {
        const _ins_transfer = await db.insert(warehouseTransfers).values(data).$returningId();
        const [transfer] = await db.select().from(warehouseTransfers).where((0, import_drizzle_orm.eq)(warehouseTransfers.id, _ins_transfer[0]?.id ?? 0));
        return transfer;
      },
      // Product Batches
      async getProductBatches(productId, tenantId) {
        const conditions = [(0, import_drizzle_orm.eq)(productBatches.isActive, true)];
        if (productId) conditions.push((0, import_drizzle_orm.eq)(productBatches.productId, productId));
        if (tenantId) {
          const tenantBranches = await this.getBranchesByTenant(tenantId);
          const branchIds = tenantBranches.map((b) => b.id);
          if (branchIds.length > 0) {
            const { inArray } = await import("drizzle-orm");
            conditions.push(inArray(productBatches.branchId, branchIds));
          } else {
            return [];
          }
        }
        const { and: and5 } = await import("drizzle-orm");
        return db.select().from(productBatches).where(and5(...conditions)).orderBy(productBatches.expiryDate);
      },
      async createProductBatch(data) {
        const _ins_batch = await db.insert(productBatches).values(data).$returningId();
        const [batch] = await db.select().from(productBatches).where((0, import_drizzle_orm.eq)(productBatches.id, _ins_batch[0]?.id ?? 0));
        return batch;
      },
      async updateProductBatch(id, data) {
        const [batch] = await db.update(productBatches).set(data).where((0, import_drizzle_orm.eq)(productBatches.id, id));
        return batch;
      },
      // Inventory Movements
      async getInventoryMovements(productId, limit) {
        const l = limit || 100;
        if (productId) return db.select().from(inventoryMovements).where((0, import_drizzle_orm.eq)(inventoryMovements.productId, productId)).orderBy((0, import_drizzle_orm.desc)(inventoryMovements.createdAt)).limit(l);
        return db.select().from(inventoryMovements).orderBy((0, import_drizzle_orm.desc)(inventoryMovements.createdAt)).limit(l);
      },
      async createInventoryMovement(data) {
        const _ins_mov = await db.insert(inventoryMovements).values(data).$returningId();
        const [mov] = await db.select().from(inventoryMovements).where((0, import_drizzle_orm.eq)(inventoryMovements.id, _ins_mov[0]?.id ?? 0));
        return mov;
      },
      // Stock Counts
      async getStockCounts() {
        return db.select().from(stockCounts).orderBy((0, import_drizzle_orm.desc)(stockCounts.createdAt));
      },
      async getStockCount(id) {
        const [sc] = await db.select().from(stockCounts).where((0, import_drizzle_orm.eq)(stockCounts.id, id));
        return sc;
      },
      async createStockCount(data) {
        const _ins_sc = await db.insert(stockCounts).values(data).$returningId();
        const [sc] = await db.select().from(stockCounts).where((0, import_drizzle_orm.eq)(stockCounts.id, _ins_sc[0]?.id ?? 0));
        return sc;
      },
      async updateStockCount(id, data) {
        const [sc] = await db.update(stockCounts).set(data).where((0, import_drizzle_orm.eq)(stockCounts.id, id));
        return sc;
      },
      async getStockCountItems(stockCountId) {
        return db.select().from(stockCountItems).where((0, import_drizzle_orm.eq)(stockCountItems.stockCountId, stockCountId));
      },
      async createStockCountItem(data) {
        const _ins_item = await db.insert(stockCountItems).values(data).$returningId();
        const [item] = await db.select().from(stockCountItems).where((0, import_drizzle_orm.eq)(stockCountItems.id, _ins_item[0]?.id ?? 0));
        return item;
      },
      async updateStockCountItem(id, data) {
        const [item] = await db.update(stockCountItems).set(data).where((0, import_drizzle_orm.eq)(stockCountItems.id, id));
        return item;
      },
      // Supplier Contracts
      async getSupplierContracts(supplierId) {
        if (supplierId) return db.select().from(supplierContracts).where((0, import_drizzle_orm.and)((0, import_drizzle_orm.eq)(supplierContracts.supplierId, supplierId), (0, import_drizzle_orm.eq)(supplierContracts.isActive, true)));
        return db.select().from(supplierContracts).where((0, import_drizzle_orm.eq)(supplierContracts.isActive, true));
      },
      async createSupplierContract(data) {
        const _ins_contract = await db.insert(supplierContracts).values(data).$returningId();
        const [contract] = await db.select().from(supplierContracts).where((0, import_drizzle_orm.eq)(supplierContracts.id, _ins_contract[0]?.id ?? 0));
        return contract;
      },
      async updateSupplierContract(id, data) {
        const [contract] = await db.update(supplierContracts).set(data).where((0, import_drizzle_orm.eq)(supplierContracts.id, id));
        return contract;
      },
      // Employee Commissions
      async getEmployeeCommissions(employeeId) {
        if (employeeId) return db.select().from(employeeCommissions).where((0, import_drizzle_orm.eq)(employeeCommissions.employeeId, employeeId)).orderBy((0, import_drizzle_orm.desc)(employeeCommissions.createdAt));
        return db.select().from(employeeCommissions).orderBy((0, import_drizzle_orm.desc)(employeeCommissions.createdAt));
      },
      async createEmployeeCommission(data) {
        const _ins_comm = await db.insert(employeeCommissions).values(data).$returningId();
        const [comm] = await db.select().from(employeeCommissions).where((0, import_drizzle_orm.eq)(employeeCommissions.id, _ins_comm[0]?.id ?? 0));
        return comm;
      },
      // Advanced Analytics
      async getEmployeeSalesReport(employeeId) {
        const result = await db.select({
          count: import_drizzle_orm.sql`count(*)`,
          total: import_drizzle_orm.sql`coalesce(sum(${sales.totalAmount}), 0)`
        }).from(sales).where((0, import_drizzle_orm.eq)(sales.employeeId, employeeId));
        return { salesCount: Number(result[0]?.count || 0), totalRevenue: Number(result[0]?.total || 0) };
      },
      async getSlowMovingProducts(days = 30) {
        const cutoffDate = /* @__PURE__ */ new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        const allProds = await db.select().from(products).where((0, import_drizzle_orm.eq)(products.isActive, true));
        const recentSaleItems = await db.select({
          productId: saleItems.productId,
          totalSold: import_drizzle_orm.sql`sum(${saleItems.quantity})`
        }).from(saleItems).innerJoin(sales, (0, import_drizzle_orm.eq)(saleItems.saleId, sales.id)).where((0, import_drizzle_orm.gte)(sales.createdAt, cutoffDate)).groupBy(saleItems.productId);
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
          totalRevenue: import_drizzle_orm.sql`sum(${saleItems.total})`,
          totalSold: import_drizzle_orm.sql`sum(${saleItems.quantity})`
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
          count: import_drizzle_orm.sql`count(*)`,
          total: import_drizzle_orm.sql`coalesce(sum(${sales.totalAmount}), 0)`,
          avgSale: import_drizzle_orm.sql`coalesce(avg(${sales.totalAmount}), 0)`
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
          count: import_drizzle_orm.sql`count(*)`,
          total: import_drizzle_orm.sql`coalesce(sum(${returns.totalAmount}), 0)`
        }).from(returns);
        const returnsList = await db.select().from(returns).orderBy((0, import_drizzle_orm.desc)(returns.createdAt)).limit(20);
        return {
          totalReturns: Number(result[0]?.count || 0),
          totalRefundAmount: Number(result[0]?.total || 0),
          recentReturns: returnsList
        };
      },
      // Notifications
      async getNotifications(recipientId) {
        return db.select().from(notifications).where((0, import_drizzle_orm.eq)(notifications.recipientId, recipientId)).orderBy((0, import_drizzle_orm.desc)(notifications.createdAt)).limit(50);
      },
      async getUnreadNotificationCount(recipientId) {
        const [result] = await db.select({ count: import_drizzle_orm.sql`count(*)` }).from(notifications).where((0, import_drizzle_orm.and)((0, import_drizzle_orm.eq)(notifications.recipientId, recipientId), (0, import_drizzle_orm.eq)(notifications.isRead, false)));
        return Number(result?.count || 0);
      },
      async createNotification(data) {
        const _ins_notif = await db.insert(notifications).values(data).$returningId();
        const [notif] = await db.select().from(notifications).where((0, import_drizzle_orm.eq)(notifications.id, _ins_notif[0]?.id ?? 0));
        return notif;
      },
      async markNotificationRead(id) {
        await db.update(notifications).set({ isRead: true }).where((0, import_drizzle_orm.eq)(notifications.id, id));
        const [notif] = await db.select().from(notifications).where((0, import_drizzle_orm.eq)(notifications.id, id));
        return notif;
      },
      async markAllNotificationsRead(recipientId) {
        await db.update(notifications).set({ isRead: true }).where((0, import_drizzle_orm.eq)(notifications.recipientId, recipientId));
      },
      async notifyAdmins(senderId, type, title, message, entityType, entityId, priority) {
        const admins = await db.select().from(employees).where(
          (0, import_drizzle_orm.or)((0, import_drizzle_orm.eq)(employees.role, "admin"), (0, import_drizzle_orm.eq)(employees.role, "owner"))
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
          });
          notifs.push(notif);
        }
        return notifs;
      },
      // Enhanced shift operations
      async getShiftWithEmployee(shiftId) {
        const [shift] = await db.select().from(shifts).where((0, import_drizzle_orm.eq)(shifts.id, shiftId));
        if (!shift) return null;
        const [emp] = await db.select().from(employees).where((0, import_drizzle_orm.eq)(employees.id, shift.employeeId));
        return { ...shift, employee: emp };
      },
      async getAllActiveShifts(tenantId) {
        let activeShifts;
        if (tenantId) {
          const tenantBranches = await this.getBranchesByTenant(tenantId);
          const branchIds = tenantBranches.map((b) => b.id);
          if (branchIds.length > 0) {
            const { inArray } = await import("drizzle-orm");
            activeShifts = await db.select().from(shifts).where((0, import_drizzle_orm.and)((0, import_drizzle_orm.eq)(shifts.status, "open"), inArray(shifts.branchId, branchIds))).orderBy((0, import_drizzle_orm.desc)(shifts.startTime));
          } else {
            activeShifts = [];
          }
        } else {
          activeShifts = await db.select().from(shifts).where((0, import_drizzle_orm.eq)(shifts.status, "open")).orderBy((0, import_drizzle_orm.desc)(shifts.startTime));
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
            const { inArray } = await import("drizzle-orm");
            allShifts = await db.select().from(shifts).where(inArray(shifts.branchId, branchIds)).orderBy((0, import_drizzle_orm.desc)(shifts.startTime)).limit(100);
          } else {
            allShifts = [];
          }
        } else {
          allShifts = await db.select().from(shifts).orderBy((0, import_drizzle_orm.desc)(shifts.startTime)).limit(100);
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
        const [shift] = await db.update(shifts).set(data).where((0, import_drizzle_orm.eq)(shifts.id, id));
        return shift;
      },
      // ========== Super Admin System ==========
      // Vehicles / Fleet Management
      async getVehicles(tenantId, branchId) {
        if (tenantId && branchId) return db.select().from(vehicles).where((0, import_drizzle_orm.and)((0, import_drizzle_orm.eq)(vehicles.tenantId, tenantId), (0, import_drizzle_orm.eq)(vehicles.branchId, branchId), (0, import_drizzle_orm.eq)(vehicles.isActive, true))).orderBy((0, import_drizzle_orm.desc)(vehicles.createdAt));
        if (tenantId) return db.select().from(vehicles).where((0, import_drizzle_orm.and)((0, import_drizzle_orm.eq)(vehicles.tenantId, tenantId), (0, import_drizzle_orm.eq)(vehicles.isActive, true))).orderBy((0, import_drizzle_orm.desc)(vehicles.createdAt));
        return db.select().from(vehicles).where((0, import_drizzle_orm.eq)(vehicles.isActive, true)).orderBy((0, import_drizzle_orm.desc)(vehicles.createdAt));
      },
      async createVehicle(data) {
        const _ins_v = await db.insert(vehicles).values(data).$returningId();
        const [v] = await db.select().from(vehicles).where((0, import_drizzle_orm.eq)(vehicles.id, _ins_v[0]?.id ?? 0));
        return v;
      },
      async updateVehicle(id, data) {
        const [v] = await db.update(vehicles).set(data).where((0, import_drizzle_orm.eq)(vehicles.id, id));
        return v;
      },
      async deleteVehicle(id) {
        await db.update(vehicles).set({ isActive: false }).where((0, import_drizzle_orm.eq)(vehicles.id, id));
      },
      // Printer Configurations
      async getPrinterConfigs(tenantId, branchId) {
        if (branchId) return db.select().from(printerConfigs).where((0, import_drizzle_orm.and)((0, import_drizzle_orm.eq)(printerConfigs.tenantId, tenantId), (0, import_drizzle_orm.eq)(printerConfigs.branchId, branchId)));
        return db.select().from(printerConfigs).where((0, import_drizzle_orm.eq)(printerConfigs.tenantId, tenantId));
      },
      async upsertPrinterConfig(data) {
        const existing = await db.select().from(printerConfigs).where((0, import_drizzle_orm.and)((0, import_drizzle_orm.eq)(printerConfigs.tenantId, data.tenantId), (0, import_drizzle_orm.eq)(printerConfigs.receiptType, data.receiptType)));
        if (existing.length > 0) {
          const [c2] = await db.update(printerConfigs).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm.eq)(printerConfigs.id, existing[0].id));
          return c2;
        }
        const _ins_c = await db.insert(printerConfigs).values(data).$returningId();
        const [c] = await db.select().from(printerConfigs).where((0, import_drizzle_orm.eq)(printerConfigs.id, _ins_c[0]?.id ?? 0));
        return c;
      },
      // Daily Closings
      async getDailyClosings(tenantId, branchId) {
        if (branchId) return db.select().from(dailyClosings).where((0, import_drizzle_orm.and)((0, import_drizzle_orm.eq)(dailyClosings.tenantId, tenantId), (0, import_drizzle_orm.eq)(dailyClosings.branchId, branchId))).orderBy((0, import_drizzle_orm.desc)(dailyClosings.createdAt));
        return db.select().from(dailyClosings).where((0, import_drizzle_orm.eq)(dailyClosings.tenantId, tenantId)).orderBy((0, import_drizzle_orm.desc)(dailyClosings.createdAt));
      },
      async createDailyClosing(data) {
        const _ins_dc = await db.insert(dailyClosings).values(data).$returningId();
        const [dc] = await db.select().from(dailyClosings).where((0, import_drizzle_orm.eq)(dailyClosings.id, _ins_dc[0]?.id ?? 0));
        return dc;
      },
      async getDailyClosingByDate(tenantId, closingDate, branchId) {
        if (branchId) {
          const [dc2] = await db.select().from(dailyClosings).where((0, import_drizzle_orm.and)((0, import_drizzle_orm.eq)(dailyClosings.tenantId, tenantId), (0, import_drizzle_orm.eq)(dailyClosings.closingDate, closingDate), (0, import_drizzle_orm.eq)(dailyClosings.branchId, branchId)));
          return dc2;
        }
        const [dc] = await db.select().from(dailyClosings).where((0, import_drizzle_orm.and)((0, import_drizzle_orm.eq)(dailyClosings.tenantId, tenantId), (0, import_drizzle_orm.eq)(dailyClosings.closingDate, closingDate)));
        return dc;
      },
      // Monthly Closings
      async getMonthlyClosings(tenantId, branchId) {
        if (branchId) return db.select().from(monthlyClosings).where((0, import_drizzle_orm.and)((0, import_drizzle_orm.eq)(monthlyClosings.tenantId, tenantId), (0, import_drizzle_orm.eq)(monthlyClosings.branchId, branchId))).orderBy((0, import_drizzle_orm.desc)(monthlyClosings.createdAt));
        return db.select().from(monthlyClosings).where((0, import_drizzle_orm.eq)(monthlyClosings.tenantId, tenantId)).orderBy((0, import_drizzle_orm.desc)(monthlyClosings.createdAt));
      },
      async createMonthlyClosing(data) {
        const _ins_mc = await db.insert(monthlyClosings).values(data).$returningId();
        const [mc] = await db.select().from(monthlyClosings).where((0, import_drizzle_orm.eq)(monthlyClosings.id, _ins_mc[0]?.id ?? 0));
        return mc;
      },
      async getMonthlyClosingByMonth(tenantId, closingMonth, branchId) {
        if (branchId) {
          const [mc2] = await db.select().from(monthlyClosings).where((0, import_drizzle_orm.and)((0, import_drizzle_orm.eq)(monthlyClosings.tenantId, tenantId), (0, import_drizzle_orm.eq)(monthlyClosings.closingMonth, closingMonth), (0, import_drizzle_orm.eq)(monthlyClosings.branchId, branchId)));
          return mc2;
        }
        const [mc] = await db.select().from(monthlyClosings).where((0, import_drizzle_orm.and)((0, import_drizzle_orm.eq)(monthlyClosings.tenantId, tenantId), (0, import_drizzle_orm.eq)(monthlyClosings.closingMonth, closingMonth)));
        return mc;
      },
      // Super Admins
      async getSuperAdmins() {
        return db.select().from(superAdmins).orderBy((0, import_drizzle_orm.desc)(superAdmins.createdAt));
      },
      async getSuperAdmin(id) {
        const [admin] = await db.select().from(superAdmins).where((0, import_drizzle_orm.eq)(superAdmins.id, id));
        return admin;
      },
      async getSuperAdminByEmail(email) {
        const [admin] = await db.select().from(superAdmins).where((0, import_drizzle_orm.eq)(superAdmins.email, email));
        return admin;
      },
      async createSuperAdmin(data) {
        const _ins_admin = await db.insert(superAdmins).values(data).$returningId();
        const [admin] = await db.select().from(superAdmins).where((0, import_drizzle_orm.eq)(superAdmins.id, _ins_admin[0]?.id ?? 0));
        return admin;
      },
      async updateSuperAdmin(id, data) {
        await db.update(superAdmins).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm.eq)(superAdmins.id, id));
        const [admin] = await db.select().from(superAdmins).where((0, import_drizzle_orm.eq)(superAdmins.id, id));
        return admin;
      },
      // Tenants
      async getTenants() {
        return db.select().from(tenants).orderBy((0, import_drizzle_orm.desc)(tenants.createdAt));
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
            const { inArray } = await import("drizzle-orm");
            const todayStart = /* @__PURE__ */ new Date();
            todayStart.setHours(0, 0, 0, 0);
            const [todaySales] = await db.select({
              total: import_drizzle_orm.sql`coalesce(sum(total_amount), 0)`
            }).from(sales).where((0, import_drizzle_orm.and)((0, import_drizzle_orm.gte)(sales.createdAt, todayStart), inArray(sales.branchId, branchIds)));
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
        const [tenant] = await db.select().from(tenants).where((0, import_drizzle_orm.eq)(tenants.id, id));
        return tenant;
      },
      async getTenantByEmail(email) {
        const [tenant] = await db.select().from(tenants).where((0, import_drizzle_orm.eq)(tenants.ownerEmail, email));
        return tenant;
      },
      async createTenant(data) {
        const _ins_tenant = await db.insert(tenants).values(data).$returningId();
        const [tenant] = await db.select().from(tenants).where((0, import_drizzle_orm.eq)(tenants.id, _ins_tenant[0]?.id ?? 0));
        return tenant;
      },
      async updateTenant(id, data) {
        await db.update(tenants).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm.eq)(tenants.id, id));
        const [tenant] = await db.select().from(tenants).where((0, import_drizzle_orm.eq)(tenants.id, id));
        return tenant;
      },
      async deleteTenant(id) {
        await db.delete(licenseKeys).where((0, import_drizzle_orm.eq)(licenseKeys.tenantId, id));
        await db.delete(tenantSubscriptions).where((0, import_drizzle_orm.eq)(tenantSubscriptions.tenantId, id));
        await db.delete(tenantNotifications).where((0, import_drizzle_orm.eq)(tenantNotifications.tenantId, id));
        await db.delete(tenants).where((0, import_drizzle_orm.eq)(tenants.id, id));
      },
      // Tenant Subscriptions
      async getTenantSubscriptions(tenantId) {
        if (tenantId) {
          return db.select().from(tenantSubscriptions).where((0, import_drizzle_orm.eq)(tenantSubscriptions.tenantId, tenantId)).orderBy((0, import_drizzle_orm.desc)(tenantSubscriptions.createdAt));
        }
        return db.select().from(tenantSubscriptions).orderBy((0, import_drizzle_orm.desc)(tenantSubscriptions.createdAt));
      },
      async getTenantSubscription(id) {
        const [sub] = await db.select().from(tenantSubscriptions).where((0, import_drizzle_orm.eq)(tenantSubscriptions.id, id));
        return sub;
      },
      async createTenantSubscription(data) {
        const _ins_sub = await db.insert(tenantSubscriptions).values(data).$returningId();
        const [sub] = await db.select().from(tenantSubscriptions).where((0, import_drizzle_orm.eq)(tenantSubscriptions.id, _ins_sub[0]?.id ?? 0));
        return sub;
      },
      async updateTenantSubscription(id, data) {
        await db.update(tenantSubscriptions).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm.eq)(tenantSubscriptions.id, id));
        const [sub] = await db.select().from(tenantSubscriptions).where((0, import_drizzle_orm.eq)(tenantSubscriptions.id, id));
        return sub;
      },
      async deleteTenantSubscription(id) {
        await db.delete(tenantSubscriptions).where((0, import_drizzle_orm.eq)(tenantSubscriptions.id, id));
      },
      // License Keys
      async getLicenseKeys(tenantId) {
        if (tenantId) {
          return db.select().from(licenseKeys).where((0, import_drizzle_orm.eq)(licenseKeys.tenantId, tenantId)).orderBy((0, import_drizzle_orm.desc)(licenseKeys.createdAt));
        }
        return db.select().from(licenseKeys).orderBy((0, import_drizzle_orm.desc)(licenseKeys.createdAt));
      },
      async getLicenseKey(id) {
        const [key] = await db.select().from(licenseKeys).where((0, import_drizzle_orm.eq)(licenseKeys.id, id));
        return key;
      },
      async getLicenseByKey(keyString) {
        const [key] = await db.select().from(licenseKeys).where((0, import_drizzle_orm.eq)(licenseKeys.licenseKey, keyString));
        return key;
      },
      async createLicenseKey(data) {
        const _ins_key = await db.insert(licenseKeys).values(data).$returningId();
        const [key] = await db.select().from(licenseKeys).where((0, import_drizzle_orm.eq)(licenseKeys.id, _ins_key[0]?.id ?? 0));
        return key;
      },
      async updateLicenseKey(id, data) {
        await db.update(licenseKeys).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm.eq)(licenseKeys.id, id));
        const [key] = await db.select().from(licenseKeys).where((0, import_drizzle_orm.eq)(licenseKeys.id, id));
        return key;
      },
      // Tenant Notifications
      async getTenantNotifications(tenantId) {
        if (tenantId) {
          return db.select().from(tenantNotifications).where((0, import_drizzle_orm.eq)(tenantNotifications.tenantId, tenantId)).orderBy((0, import_drizzle_orm.desc)(tenantNotifications.createdAt));
        }
        return db.select().from(tenantNotifications).orderBy((0, import_drizzle_orm.desc)(tenantNotifications.createdAt));
      },
      async createTenantNotification(data) {
        const _ins_notif = await db.insert(tenantNotifications).values(data).$returningId();
        const [notif] = await db.select().from(tenantNotifications).where((0, import_drizzle_orm.eq)(tenantNotifications.id, _ins_notif[0]?.id ?? 0));
        return notif;
      },
      async updateTenantNotification(id, data) {
        const [notif] = await db.update(tenantNotifications).set(data).where((0, import_drizzle_orm.eq)(tenantNotifications.id, id));
        return notif;
      },
      // Tenants & Store Config
      // (Removed duplicate getTenants, getTenant, updateTenant to fix TypeScript errors)
      // Bulk Operations
      async bulkCreateCustomers(data) {
        if (data.length === 0) return [];
        const { inArray } = await import("drizzle-orm");
        const sanitizedRows = data.map((row) => {
          const { id, createdAt, updatedAt, ...payload } = row;
          return payload;
        });
        const tenantPhoneGroups = /* @__PURE__ */ new Map();
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
        const existingByTenantPhone = /* @__PURE__ */ new Map();
        for (const [tenantId, phones] of tenantPhoneGroups.entries()) {
          if (phones.length === 0) continue;
          const existingCustomers = await db.select().from(customers).where(
            (0, import_drizzle_orm.and)(
              (0, import_drizzle_orm.eq)(customers.tenantId, Number(tenantId)),
              inArray(customers.phone, phones)
            )
          );
          for (const existing of existingCustomers) {
            existingByTenantPhone.set(`${existing.tenantId}::${existing.phone}`, existing);
          }
        }
        const results = [];
        for (const row of sanitizedRows) {
          const tenantId = row.tenantId;
          const phone = typeof row.phone === "string" ? row.phone.trim() : "";
          const lookupKey = tenantId && phone ? `${tenantId}::${phone}` : "";
          const basePayload = {
            ...row,
            phone: phone || null
          };
          const existing = lookupKey ? existingByTenantPhone.get(lookupKey) : void 0;
          if (existing) {
            await db.update(customers).set({ ...basePayload, updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm.eq)(customers.id, existing.id));
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
      async bulkCreateProducts(data) {
        if (data.length === 0) return [];
        return db.insert(products).values(data);
      },
      // System Wide Analytics
      async getSuperAdminDashboardStats() {
        try {
          this.seedLog("Fetching Super Admin dashboard stats...");
          const [tenantCount] = await db.select({ count: import_drizzle_orm.sql`count(*)` }).from(tenants);
          const [activeTenants] = await db.select({ count: import_drizzle_orm.sql`count(*)` }).from(tenants).where((0, import_drizzle_orm.eq)(tenants.status, "active"));
          const [activeSubs] = await db.select({ count: import_drizzle_orm.sql`count(*)` }).from(tenantSubscriptions).where((0, import_drizzle_orm.eq)(tenantSubscriptions.status, "active"));
          const in7Days = /* @__PURE__ */ new Date();
          in7Days.setDate(in7Days.getDate() + 7);
          const now = /* @__PURE__ */ new Date();
          const [expiringSubs] = await db.select({ count: import_drizzle_orm.sql`count(*)` }).from(tenantSubscriptions).where((0, import_drizzle_orm.and)((0, import_drizzle_orm.eq)(tenantSubscriptions.status, "active"), (0, import_drizzle_orm.lte)(tenantSubscriptions.endDate, in7Days), (0, import_drizzle_orm.gte)(tenantSubscriptions.endDate, now)));
          const [revenueRow] = await db.select({ total: import_drizzle_orm.sql`coalesce(sum(price), 0)` }).from(tenantSubscriptions).where((0, import_drizzle_orm.eq)(tenantSubscriptions.status, "active"));
          const recentTenants = await db.select().from(tenants).orderBy((0, import_drizzle_orm.desc)(tenants.createdAt)).limit(5);
          const recentSubs = await db.select().from(tenantSubscriptions).orderBy((0, import_drizzle_orm.desc)(tenantSubscriptions.createdAt)).limit(5);
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
        if (tenantId) conditions.push((0, import_drizzle_orm.eq)(onlineOrders.tenantId, tenantId));
        if (status2) conditions.push((0, import_drizzle_orm.eq)(onlineOrders.status, status2));
        if (conditions.length > 0) {
          const orders2 = await db.select().from(onlineOrders).where((0, import_drizzle_orm.and)(...conditions)).orderBy((0, import_drizzle_orm.desc)(onlineOrders.createdAt));
          return orders2.map((order) => normalizeOnlineOrderRecord(order));
        }
        const orders = await db.select().from(onlineOrders).orderBy((0, import_drizzle_orm.desc)(onlineOrders.createdAt));
        return orders.map((order) => normalizeOnlineOrderRecord(order));
      },
      async getOnlineOrder(id) {
        const [order] = await db.select().from(onlineOrders).where((0, import_drizzle_orm.eq)(onlineOrders.id, id));
        return normalizeOnlineOrderRecord(order);
      },
      async createOnlineOrder(data) {
        const _ins_order = await db.insert(onlineOrders).values(data).$returningId();
        const [order] = await db.select().from(onlineOrders).where((0, import_drizzle_orm.eq)(onlineOrders.id, _ins_order[0]?.id ?? 0));
        return normalizeOnlineOrderRecord(order);
      },
      async updateOnlineOrder(id, data) {
        await db.update(onlineOrders).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm.eq)(onlineOrders.id, id));
        const [order] = await db.select().from(onlineOrders).where((0, import_drizzle_orm.eq)(onlineOrders.id, id));
        return normalizeOnlineOrderRecord(order);
      },
      async deleteOnlineOrder(id) {
        await db.delete(onlineOrders).where((0, import_drizzle_orm.eq)(onlineOrders.id, id));
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
        const [config] = await db.select().from(landingPageConfig).where((0, import_drizzle_orm.eq)(landingPageConfig.tenantId, tenantId));
        return config;
      },
      async getLandingPageConfigBySlug(slug) {
        const [config] = await db.select().from(landingPageConfig).where((0, import_drizzle_orm.eq)(landingPageConfig.slug, slug));
        return config;
      },
      async getAllLandingPageConfigs(tenantId) {
        if (tenantId) {
          return db.select().from(landingPageConfig).where((0, import_drizzle_orm.eq)(landingPageConfig.tenantId, Number(tenantId)));
        }
        return db.select().from(landingPageConfig);
      },
      async upsertLandingPageConfig(tenantId, data) {
        if (!data.slug) {
          const [tenant] = await db.select().from(tenants).where((0, import_drizzle_orm.eq)(tenants.id, tenantId));
          if (tenant) {
            data.slug = tenant.businessName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
          }
        }
        const existing = await this.getLandingPageConfig(tenantId);
        if (existing) {
          const [updated] = await db.update(landingPageConfig).set({ ...data, tenantId, updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm.eq)(landingPageConfig.tenantId, tenantId));
          return updated;
        } else {
          const [created] = await db.insert(landingPageConfig).values({ tenantId, ...data });
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
        const tenantBranches = await db.select().from(branches).where((0, import_drizzle_orm.eq)(branches.tenantId, tenantId)).limit(1);
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
          });
          branchId = newBranch.id;
        } else {
          branchId = tenantBranches[0].id;
        }
        const tenantEmployees = await db.select({ id: employees.id }).from(employees).innerJoin(branches, (0, import_drizzle_orm.eq)(employees.branchId, branches.id)).where((0, import_drizzle_orm.eq)(branches.tenantId, tenantId)).limit(1);
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
        const [row] = await db.select().from(platformSettings).where((0, import_drizzle_orm.eq)(platformSettings.key, key));
        return row?.value ?? null;
      },
      async setPlatformSetting(key, value) {
        const existing = await db.select().from(platformSettings).where((0, import_drizzle_orm.eq)(platformSettings.key, key));
        if (existing.length > 0) {
          await db.update(platformSettings).set({ value, updatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm.eq)(platformSettings.key, key));
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
        const _ins_row = await db.insert(platformCommissions).values(data).$returningId();
        const [row] = await db.select().from(platformCommissions).where((0, import_drizzle_orm.eq)(platformCommissions.id, _ins_row[0]?.id ?? 0));
        return row;
      },
      async getPlatformCommissions(tenantId) {
        if (tenantId) {
          return db.select().from(platformCommissions).where((0, import_drizzle_orm.eq)(platformCommissions.tenantId, tenantId)).orderBy((0, import_drizzle_orm.desc)(platformCommissions.createdAt));
        }
        return db.select().from(platformCommissions).orderBy((0, import_drizzle_orm.desc)(platformCommissions.createdAt));
      },
      async getCommissionSummary() {
        const allTenants = await this.getTenants();
        const result = [];
        let grandTotal = 0;
        for (const t of allTenants) {
          try {
            const [row] = await db.select({
              total: import_drizzle_orm.sql`coalesce(sum(commission_amount), 0)`,
              count: import_drizzle_orm.sql`count(*)`
            }).from(platformCommissions).where((0, import_drizzle_orm.eq)(platformCommissions.tenantId, t.id));
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
      async getNextSequenceNumber(scopeKey) {
        const swissDate = new Intl.DateTimeFormat("en-CA", {
          timeZone: "Europe/Zurich",
          year: "numeric",
          month: "2-digit",
          day: "2-digit"
        }).format(/* @__PURE__ */ new Date());
        const dateCompact = swissDate.replace(/-/g, "");
        const [result] = await pool.query(
          `
        INSERT INTO daily_sequences (\`scope_key\`, \`date\`, \`counter\`)
        VALUES (?, ?, 1)
        ON DUPLICATE KEY UPDATE \`counter\` = LAST_INSERT_ID(\`counter\` + 1)
      `,
          [scopeKey, dateCompact]
        );
        if (result?.affectedRows === 1) {
          return 1;
        }
        return Number(result?.insertId || 1);
      },
      // ═══════════════════════════════════════════════════════════════════════════
      // ── Delivery Platform Storage Methods ──────────────────────────────────────
      // ═══════════════════════════════════════════════════════════════════════════
      // ── Delivery Zones ──────────────────────────────────────────────────────────
      async getDeliveryZones(tenantId) {
        return db.select().from(deliveryZones).where((0, import_drizzle_orm.eq)(deliveryZones.tenantId, tenantId)).orderBy(deliveryZones.sortOrder);
      },
      async createDeliveryZone(data) {
        const [r] = await db.insert(deliveryZones).values(data).$returningId();
        const [zone] = await db.select().from(deliveryZones).where((0, import_drizzle_orm.eq)(deliveryZones.id, r.id)).limit(1);
        return zone;
      },
      async updateDeliveryZone(id, data) {
        await db.update(deliveryZones).set(data).where((0, import_drizzle_orm.eq)(deliveryZones.id, id));
        const [zone] = await db.select().from(deliveryZones).where((0, import_drizzle_orm.eq)(deliveryZones.id, id)).limit(1);
        return zone;
      },
      async deleteDeliveryZone(id) {
        await db.delete(deliveryZones).where((0, import_drizzle_orm.eq)(deliveryZones.id, id));
      },
      // ── Promo Codes ─────────────────────────────────────────────────────────────
      async getPromoCodes(tenantId) {
        return db.select().from(promoCodes).where((0, import_drizzle_orm.eq)(promoCodes.tenantId, tenantId)).orderBy((0, import_drizzle_orm.desc)(promoCodes.createdAt));
      },
      async getPromoCode(tenantId, code) {
        const [promo] = await db.select().from(promoCodes).where((0, import_drizzle_orm.and)((0, import_drizzle_orm.eq)(promoCodes.tenantId, tenantId), (0, import_drizzle_orm.eq)(promoCodes.code, code.toUpperCase()))).limit(1);
        return promo ?? null;
      },
      async createPromoCode(data) {
        const [r] = await db.insert(promoCodes).values({ ...data, code: data.code.toUpperCase() }).$returningId();
        const [promo] = await db.select().from(promoCodes).where((0, import_drizzle_orm.eq)(promoCodes.id, r.id)).limit(1);
        return promo;
      },
      async updatePromoCode(id, data) {
        await db.update(promoCodes).set(data).where((0, import_drizzle_orm.eq)(promoCodes.id, id));
        const [promo] = await db.select().from(promoCodes).where((0, import_drizzle_orm.eq)(promoCodes.id, id)).limit(1);
        return promo;
      },
      async deletePromoCode(id) {
        await db.delete(promoCodes).where((0, import_drizzle_orm.eq)(promoCodes.id, id));
      },
      // ── Customer Addresses ──────────────────────────────────────────────────────
      async getCustomerAddresses(customerId) {
        return db.select().from(customerAddresses).where((0, import_drizzle_orm.eq)(customerAddresses.customerId, customerId)).orderBy((0, import_drizzle_orm.desc)(customerAddresses.isDefault), (0, import_drizzle_orm.desc)(customerAddresses.id));
      },
      async createCustomerAddress(data) {
        if (data.isDefault) {
          await db.update(customerAddresses).set({ isDefault: false }).where((0, import_drizzle_orm.eq)(customerAddresses.customerId, data.customerId));
        }
        const [r] = await db.insert(customerAddresses).values(data).$returningId();
        const [addr] = await db.select().from(customerAddresses).where((0, import_drizzle_orm.eq)(customerAddresses.id, r.id)).limit(1);
        return addr;
      },
      async updateCustomerAddress(id, data) {
        if (data.isDefault && data.customerId) {
          await db.update(customerAddresses).set({ isDefault: false }).where((0, import_drizzle_orm.eq)(customerAddresses.customerId, data.customerId));
        }
        await db.update(customerAddresses).set(data).where((0, import_drizzle_orm.eq)(customerAddresses.id, id));
        const [addr] = await db.select().from(customerAddresses).where((0, import_drizzle_orm.eq)(customerAddresses.id, id)).limit(1);
        return addr;
      },
      async deleteCustomerAddress(id) {
        await db.delete(customerAddresses).where((0, import_drizzle_orm.eq)(customerAddresses.id, id));
      },
      async setDefaultAddress(id, customerId) {
        await db.update(customerAddresses).set({ isDefault: false }).where((0, import_drizzle_orm.eq)(customerAddresses.customerId, customerId));
        await db.update(customerAddresses).set({ isDefault: true }).where((0, import_drizzle_orm.eq)(customerAddresses.id, id));
      },
      // ── Order Ratings ───────────────────────────────────────────────────────────
      async createOrderRating(data) {
        const [r] = await db.insert(orderRatings).values(data).$returningId();
        await db.update(onlineOrders).set({ rating: data.overallRating, ratingComment: data.comment ?? null }).where((0, import_drizzle_orm.eq)(onlineOrders.id, data.orderId));
        if (data.driverId && data.deliveryRating) {
          await db.update(vehicles).set({ driverRating: import_drizzle_orm.sql`((driver_rating * total_deliveries) + ${data.deliveryRating}) / (total_deliveries + 1)` }).where((0, import_drizzle_orm.eq)(vehicles.id, data.driverId));
        }
        const [rating] = await db.select().from(orderRatings).where((0, import_drizzle_orm.eq)(orderRatings.id, r.id)).limit(1);
        return rating;
      },
      async getOrderRatings(tenantId, limit = 50) {
        return db.select().from(orderRatings).innerJoin(onlineOrders, (0, import_drizzle_orm.eq)(orderRatings.orderId, onlineOrders.id)).where((0, import_drizzle_orm.eq)(onlineOrders.tenantId, tenantId)).orderBy((0, import_drizzle_orm.desc)(orderRatings.createdAt)).limit(limit);
      },
      // ── Loyalty Transactions ────────────────────────────────────────────────────
      async getLoyaltyTransactions(customerId, limit = 50) {
        return db.select().from(loyaltyTransactions).where((0, import_drizzle_orm.eq)(loyaltyTransactions.customerId, customerId)).orderBy((0, import_drizzle_orm.desc)(loyaltyTransactions.createdAt)).limit(limit);
      },
      // ── Wallet Transactions ─────────────────────────────────────────────────────
      async getWalletTransactions(customerId, limit = 50) {
        return db.select().from(walletTransactions).where((0, import_drizzle_orm.eq)(walletTransactions.customerId, customerId)).orderBy((0, import_drizzle_orm.desc)(walletTransactions.createdAt)).limit(limit);
      },
      // ── Driver Location ─────────────────────────────────────────────────────────
      async updateDriverLocation(vehicleId, lat, lng, orderId) {
        await db.update(vehicles).set({
          currentLat: lat.toFixed(7),
          currentLng: lng.toFixed(7),
          locationUpdatedAt: /* @__PURE__ */ new Date()
        }).where((0, import_drizzle_orm.eq)(vehicles.id, vehicleId));
        await db.insert(driverLocations).values({
          vehicleId,
          orderId: orderId ?? null,
          lat: lat.toFixed(7),
          lng: lng.toFixed(7),
          speed: null,
          heading: null
        });
      },
      async getDriverLocation(vehicleId) {
        const [vehicle] = await db.select({
          id: vehicles.id,
          driverName: vehicles.driverName,
          driverPhone: vehicles.driverPhone,
          currentLat: vehicles.currentLat,
          currentLng: vehicles.currentLng,
          locationUpdatedAt: vehicles.locationUpdatedAt,
          driverStatus: vehicles.driverStatus,
          driverRating: vehicles.driverRating
        }).from(vehicles).where((0, import_drizzle_orm.eq)(vehicles.id, vehicleId)).limit(1);
        return vehicle ?? null;
      },
      async getActiveDrivers(tenantId) {
        return db.select().from(vehicles).where(
          (0, import_drizzle_orm.and)(
            (0, import_drizzle_orm.eq)(vehicles.tenantId, tenantId),
            (0, import_drizzle_orm.eq)(vehicles.isActive, true),
            import_drizzle_orm.sql`${vehicles.driverStatus} != 'offline'`
          )
        );
      },
      // ── Delivery Management ─────────────────────────────────────────────────────
      async getDeliveryOrders(tenantId, filters) {
        let q = db.select().from(onlineOrders).where((0, import_drizzle_orm.eq)(onlineOrders.tenantId, tenantId));
        if (filters?.status) {
          q = q.where((0, import_drizzle_orm.eq)(onlineOrders.status, filters.status));
        }
        if (filters?.orderType) {
          q = q.where((0, import_drizzle_orm.eq)(onlineOrders.orderType, filters.orderType));
        }
        return q.orderBy((0, import_drizzle_orm.desc)(onlineOrders.createdAt));
      },
      async assignDriverToOrder(orderId, vehicleId) {
        await db.update(onlineOrders).set({ driverId: vehicleId }).where((0, import_drizzle_orm.eq)(onlineOrders.id, orderId));
        await db.update(vehicles).set({ driverStatus: "on_delivery", activeOrderId: orderId }).where((0, import_drizzle_orm.eq)(vehicles.id, vehicleId));
      },
      async getDeliveryStats(tenantId) {
        const today = /* @__PURE__ */ new Date();
        today.setHours(0, 0, 0, 0);
        const [totalRow] = await db.select({ count: import_drizzle_orm.sql`count(*)` }).from(onlineOrders).where((0, import_drizzle_orm.and)((0, import_drizzle_orm.eq)(onlineOrders.tenantId, tenantId), (0, import_drizzle_orm.gte)(onlineOrders.createdAt, today)));
        const [pendingRow] = await db.select({ count: import_drizzle_orm.sql`count(*)` }).from(onlineOrders).where((0, import_drizzle_orm.and)((0, import_drizzle_orm.eq)(onlineOrders.tenantId, tenantId), (0, import_drizzle_orm.eq)(onlineOrders.status, "pending"), (0, import_drizzle_orm.gte)(onlineOrders.createdAt, today)));
        const [deliveredRow] = await db.select({ count: import_drizzle_orm.sql`count(*)` }).from(onlineOrders).where((0, import_drizzle_orm.and)((0, import_drizzle_orm.eq)(onlineOrders.tenantId, tenantId), (0, import_drizzle_orm.eq)(onlineOrders.status, "delivered"), (0, import_drizzle_orm.gte)(onlineOrders.createdAt, today)));
        const [revenueRow] = await db.select({ total: import_drizzle_orm.sql`COALESCE(SUM(total_amount), 0)` }).from(onlineOrders).where((0, import_drizzle_orm.and)((0, import_drizzle_orm.eq)(onlineOrders.tenantId, tenantId), (0, import_drizzle_orm.eq)(onlineOrders.status, "delivered"), (0, import_drizzle_orm.gte)(onlineOrders.createdAt, today)));
        return {
          todayOrders: totalRow?.count ?? 0,
          pendingOrders: pendingRow?.count ?? 0,
          deliveredToday: deliveredRow?.count ?? 0,
          todayRevenue: parseFloat(revenueRow?.total ?? "0")
        };
      },
      // ── Customer order history (delivery) ──────────────────────────────────────
      async getCustomerOrderHistory(customerId, tenantId, limit = 20) {
        return db.select().from(onlineOrders).where((0, import_drizzle_orm.and)(
          import_drizzle_orm.sql`${onlineOrders.customerPhone} = (SELECT phone FROM customers WHERE id = ${customerId})`,
          (0, import_drizzle_orm.eq)(onlineOrders.tenantId, tenantId)
        )).orderBy((0, import_drizzle_orm.desc)(onlineOrders.createdAt)).limit(limit);
      },
      // ── Driver earnings ─────────────────────────────────────────────────────────
      async getDriverEarnings(vehicleId, days = 7) {
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1e3);
        return db.select({
          count: import_drizzle_orm.sql`count(*)`,
          totalFees: import_drizzle_orm.sql`COALESCE(SUM(delivery_fee), 0)`
        }).from(onlineOrders).where((0, import_drizzle_orm.and)(
          (0, import_drizzle_orm.eq)(onlineOrders.driverId, vehicleId),
          (0, import_drizzle_orm.eq)(onlineOrders.status, "delivered"),
          (0, import_drizzle_orm.gte)(onlineOrders.createdAt, since)
        ));
      },
      // ── Missing helpers used by delivery routes ─────────────────────────────────
      async getVehicle(id) {
        const [vehicle] = await db.select().from(vehicles).where((0, import_drizzle_orm.eq)(vehicles.id, id)).limit(1);
        return vehicle ?? null;
      },
      async getVehicleByAccessToken(token) {
        const [vehicle] = await db.select().from(vehicles).where((0, import_drizzle_orm.eq)(vehicles.driverAccessToken, token)).limit(1);
        return vehicle ?? null;
      },
      async getOnlineOrderByTrackingToken(token) {
        const [order] = await db.select().from(onlineOrders).where((0, import_drizzle_orm.eq)(onlineOrders.trackingToken, token)).limit(1);
        return order ?? null;
      },
      async getDriverActiveOrders(vehicleId, tenantId) {
        return db.select().from(onlineOrders).where(
          (0, import_drizzle_orm.and)(
            (0, import_drizzle_orm.eq)(onlineOrders.tenantId, tenantId),
            (0, import_drizzle_orm.eq)(onlineOrders.driverId, vehicleId),
            import_drizzle_orm.sql`${onlineOrders.status} NOT IN ('delivered', 'cancelled')`
          )
        ).orderBy((0, import_drizzle_orm.desc)(onlineOrders.createdAt));
      },
      async getCustomerIdByPhone(phone, tenantId) {
        const [customer] = await db.select({ id: customers.id }).from(customers).where((0, import_drizzle_orm.and)((0, import_drizzle_orm.eq)(customers.phone, phone), (0, import_drizzle_orm.eq)(customers.tenantId, tenantId))).limit(1);
        return customer?.id ?? null;
      },
      async getCustomerByReferralCode(code) {
        const [customer] = await db.select().from(customers).where((0, import_drizzle_orm.eq)(customers.referralCode, code)).limit(1);
        return customer ?? null;
      },
      async getLandingPageConfigByTenantId(tenantId) {
        const [config] = await db.select().from(landingPageConfig).where((0, import_drizzle_orm.eq)(landingPageConfig.tenantId, tenantId)).limit(1);
        return config ?? null;
      }
    };
  }
});

// server/seedPizzaLemon.ts
var seedPizzaLemon_exports = {};
__export(seedPizzaLemon_exports, {
  seedPizzaLemon: () => seedPizzaLemon
});
function pizzaModifier(price33, price45) {
  const surcharge = (price45 - price33).toFixed(2);
  return [
    {
      name: "Gr\xF6sse",
      required: true,
      options: [
        { label: "33cm", price: "0.00" },
        { label: "45cm", price: surcharge }
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
      required: true,
      options: [
        { label: "50cl", price: "0.00" },
        { label: "1.5 L", price: largeExtra.toFixed(2) }
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
function emojiImg(emoji) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="85" font-size="80" text-anchor="middle" x="50">${emoji}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
function slugify(name) {
  return name.toLowerCase().replace(/[äÄ]/g, "ae").replace(/[öÖ]/g, "oe").replace(/[üÜ]/g, "ue").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
async function seedPizzaLemon() {
  console.log("[PIZZA LEMON] Checking if Pizza Lemon store is properly configured...");
  const [existingKey] = await db.select().from(licenseKeys).where((0, import_drizzle_orm4.eq)(licenseKeys.licenseKey, LICENSE_KEY));
  const isAlreadySeeded = !!existingKey;
  if (isAlreadySeeded) {
    console.log("[PIZZA LEMON] License key already present \u2013 running full catalog update...");
  }
  let tenant;
  const pizzaLemonTenants = await db.select().from(tenants).where((0, import_drizzle_orm4.eq)(tenants.id, 24));
  if (pizzaLemonTenants.length > 0) {
    tenant = pizzaLemonTenants[0];
    console.log(`[PIZZA LEMON] Found existing store (ID ${tenant.id}). Upgrading credentials and data...`);
    const hash3 = await import_bcrypt2.default.hash(STORE_PASSWORD, 10);
    await db.update(tenants).set({
      businessName: BUSINESS_NAME,
      ownerEmail: STORE_EMAIL,
      passwordHash: hash3,
      status: "active",
      storeType: "restaurant",
      maxBranches: 3,
      maxEmployees: 20
    }).where((0, import_drizzle_orm4.eq)(tenants.id, 24));
  } else {
    console.log("[PIZZA LEMON] No Tenant ID 24 found. Creating new store with ID 24...");
    const hash3 = await import_bcrypt2.default.hash(STORE_PASSWORD, 10);
    const [newTenant] = await db.insert(tenants).values({
      id: 24,
      businessName: BUSINESS_NAME,
      ownerName: "Pizza Lemon Owner",
      ownerEmail: STORE_EMAIL,
      ownerPhone: "+41443103814",
      passwordHash: hash3,
      status: "active",
      maxBranches: 3,
      maxEmployees: 20,
      storeType: "restaurant"
    }).$returningId();
    tenant = { id: newTenant.id };
  }
  const subs = await db.select().from(tenantSubscriptions).where((0, import_drizzle_orm4.eq)(tenantSubscriptions.tenantId, tenant.id));
  const activeSub = subs.find((s) => s.status === "active");
  let subId;
  if (activeSub) {
    subId = activeSub.id;
  } else {
    const endDate = (0, import_date_fns.addYears)(/* @__PURE__ */ new Date(), 2);
    const [newSub] = await db.insert(tenantSubscriptions).values({
      tenantId: tenant.id,
      planType: "yearly",
      planName: "Professional",
      price: "79.00",
      status: "active",
      startDate: /* @__PURE__ */ new Date(),
      endDate,
      autoRenew: true
    }).$returningId();
    subId = newSub.id;
  }
  if (!isAlreadySeeded) {
    const endDate = (0, import_date_fns.addYears)(/* @__PURE__ */ new Date(), 2);
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
  let tenantBranches = await db.select().from(branches).where((0, import_drizzle_orm4.eq)(branches.tenantId, tenant.id));
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
    }).$returningId();
    branchId = branch.id;
    await db.insert(warehouses).values({ name: "Hauptlager", branchId, isDefault: true, isActive: true });
    for (let i = 1; i <= 8; i++) {
      await db.insert(tables).values({ branchId, name: `Tisch ${i}`, capacity: i <= 4 ? 2 : 4, status: "available" });
    }
    console.log(`[PIZZA LEMON] Created branch, warehouse, 8 tables.`);
  }
  const existingEmps = await db.select().from(employees).where((0, import_drizzle_orm4.eq)(employees.branchId, branchId));
  const hasAdmin = existingEmps.some((e) => e.role === "admin" && e.pin === "1234");
  const hasCashier = existingEmps.some((e) => e.role === "cashier" && e.pin === "5678");
  if (!hasAdmin) {
    await db.insert(employees).values({ name: "Admin", email: "admin.emp@pizzalemon.ch", pin: "1234", role: "admin", branchId, isActive: true });
  }
  if (!hasCashier) {
    await db.insert(employees).values({ name: "Cashier", email: "cashier@pizzalemon.ch", pin: "5678", role: "cashier", branchId, isActive: true });
  }
  const shouldForceCatalogReset = ["1", "true", "yes"].includes(
    (process.env.PIZZA_LEMON_FORCE_RESET || "").toLowerCase()
  );
  const existingProds = await db.select().from(products).where((0, import_drizzle_orm4.eq)(products.tenantId, tenant.id));
  if (existingProds.length > 0 && !shouldForceCatalogReset) {
    console.log(`[PIZZA LEMON] ${existingProds.length} products already exist \u2014 skipping catalog reset to protect existing data.`);
    return;
  }
  if (shouldForceCatalogReset) {
    const existingCats = await db.select({ id: categories.id, name: categories.name }).from(categories).where((0, import_drizzle_orm4.eq)(categories.tenantId, tenant.id));
    if (existingProds.length > 0) {
      await db.delete(products).where((0, import_drizzle_orm4.eq)(products.tenantId, tenant.id));
    }
    if (existingCats.length > 0) {
      await db.delete(categories).where((0, import_drizzle_orm4.eq)(categories.tenantId, tenant.id));
    }
    console.log(
      `[PIZZA LEMON] Force reset enabled \u2014 cleared ${existingProds.length} products and ${existingCats.length} categories.`
    );
  } else {
    console.log("[PIZZA LEMON] No products found \u2014 creating fresh product catalog...");
  }
  const allCats = await db.select({ id: categories.id, name: categories.name }).from(categories).where((0, import_drizzle_orm4.eq)(categories.tenantId, tenant.id));
  const catMap = {};
  for (const c of allCats) catMap[c.name] = c.id;
  if (catMap["Softgetr\xE4nke"] && !catMap["Getr\xE4nke"]) {
    await db.update(categories).set({ name: "Getr\xE4nke" }).where((0, import_drizzle_orm4.eq)(categories.id, catMap["Softgetr\xE4nke"]));
    catMap["Getr\xE4nke"] = catMap["Softgetr\xE4nke"];
    delete catMap["Softgetr\xE4nke"];
    console.log("[PIZZA LEMON] Renamed category Softgetr\xE4nke \u2192 Getr\xE4nke");
  }
  if (catMap["Tabakwaren"] && !catMap["Extra"]) {
    await db.update(categories).set({ name: "Extra", icon: "add-circle" }).where((0, import_drizzle_orm4.eq)(categories.id, catMap["Tabakwaren"]));
    catMap["Extra"] = catMap["Tabakwaren"];
    delete catMap["Tabakwaren"];
    console.log("[PIZZA LEMON] Renamed category Tabakwaren \u2192 Extra");
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
      }).$returningId();
      catMap[cat.name] = ins.id;
      console.log(`[PIZZA LEMON] Created category: ${cat.name}`);
    } else {
      await db.update(categories).set({
        sortOrder: cat.sortOrder,
        color: cat.color,
        icon: cat.icon
      }).where((0, import_drizzle_orm4.eq)(categories.id, catMap[cat.name]));
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
    }).$returningId();
    await db.insert(inventory).values({
      productId: prod.id,
      branchId,
      quantity: 999,
      lowStockThreshold: 0,
      reorderPoint: 0
    });
  }
  for (const p of PIZZAS) {
    const price45 = p.price45 ?? p.price + 14;
    await insertItem("Pizza", p, pizzaModifier(p.price, price45));
  }
  for (const p of CALZONES) await insertItem("Calzone", p);
  for (const p of PIDE) await insertItem("Pide", p);
  for (const p of LAHMACUN) await insertItem("Lahmacun", p);
  const TELLER_WITH_SIDE = /* @__PURE__ */ new Set([
    "Chicken Nuggets 8 Stk.",
    "Pouletschnitzel",
    "Pouletfl\xFCgeli 12 Stk.",
    "Poulet Kebab Teller",
    "Lamm Kebab Teller / Sac Kavurma",
    "K\xF6fte Teller",
    "Cevapcici",
    "Falafel Teller"
  ]);
  for (const p of TELLERGERICHTE) {
    await insertItem("Tellergerichte", p, TELLER_WITH_SIDE.has(p.name) ? sideModifier() : []);
  }
  const FINGER_WITH_SAUCE = /* @__PURE__ */ new Set([
    "D\xF6ner Kebab Im Taschenbrot",
    "D\xFCr\xFCm Kebab Im Fladenbrot",
    "Falafel Im Taschenbrot",
    "Falafel D\xFCr\xFCm Im Fladenbrot",
    "Poulet Pepito",
    "Lamm Pepito",
    "Poulet Kebab Mit Gem\xFCse Im Taschenbrot",
    "Poulet Kebab Mit Gem\xFCse Im Fladenbrot",
    "Lamm Kebab Mit Gem\xFCse Im Taschenbrot",
    "Lamm Kebab Mit Gem\xFCse Im Fladenbrot",
    "K\xF6fte Im Taschenbrot",
    "Cevapcici Im Taschenbrot",
    "Kebab Im Fladenbrot mit Raclette",
    "Kebab Im Taschenbrot mit Raclette",
    "Kebab Im Fladenbrot mit Speck",
    "Kebab Im Taschenbrot mit Speck"
  ]);
  for (const p of FINGERFOOD) {
    await insertItem("Fingerfood", p, FINGER_WITH_SAUCE.has(p.name) ? sauceModifier() : []);
  }
  const SALAT_WITH_DRESSING = /* @__PURE__ */ new Set([
    "Gr\xFCner Salat",
    "Gemischter Salat",
    "Griechischer Salat",
    "Lemon Salat",
    "Thon Salat",
    "Tomaten Salat",
    "Tomaten Mozzarella Salat",
    "Crevettencocktail Salat"
  ]);
  for (const p of SALATE) {
    await insertItem("Salat", p, SALAT_WITH_DRESSING.has(p.name) ? dressingModifier() : []);
  }
  for (const p of DESSERTS) await insertItem("Dessert", p);
  const DRINKS_WITH_SIZE = /* @__PURE__ */ new Set([
    "Coca-Cola",
    "Coca-Cola Light",
    "Coca-Cola Zero",
    "Fanta",
    "Eistee",
    "Mineralwasser"
  ]);
  for (const p of GETRAENKE) {
    const sizeMod = DRINKS_WITH_SIZE.has(p.name) ? drinkSizeModifier(4) : [];
    await insertItem("Getr\xE4nke", p, sizeMod);
  }
  for (const p of BIER) await insertItem("Bier", p);
  for (const p of ALKOHOL) await insertItem("Alkoholische Getr\xE4nke", p);
  for (const p of EXTRAS) await insertItem("Extra", p);
  const total = PIZZAS.length + CALZONES.length + PIDE.length + LAHMACUN.length + TELLERGERICHTE.length + FINGERFOOD.length + SALATE.length + DESSERTS.length + GETRAENKE.length + BIER.length + ALKOHOL.length + EXTRAS.length;
  console.log(
    `[PIZZA LEMON] \u2713 ${total} products inserted. Pizza ${PIZZAS.length}, Calzone ${CALZONES.length}, Pide ${PIDE.length}, Lahmacun ${LAHMACUN.length}, Tellergerichte ${TELLERGERICHTE.length}, Fingerfood ${FINGERFOOD.length}, Salat ${SALATE.length}, Dessert ${DESSERTS.length}, Getr\xE4nke ${GETRAENKE.length}, Bier ${BIER.length}, Alkohol ${ALKOHOL.length}, Extra ${EXTRAS.length}.`
  );
  const [existingConfig] = await db.select().from(landingPageConfig).where((0, import_drizzle_orm4.eq)(landingPageConfig.tenantId, tenant.id));
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
    }).where((0, import_drizzle_orm4.eq)(landingPageConfig.tenantId, tenant.id));
    console.log("[PIZZA LEMON] Landing page config updated.");
  }
  await db.insert(tenantNotifications).values({
    tenantId: tenant.id,
    type: "info",
    title: "Pizza Lemon Katalog aktualisiert (v7)!",
    message: `Men\xFCpreise, Gr\xF6\xDFen und Getr\xE4nkemengen mit dem aktuellen Foto-Men\xFC abgeglichen. Email: ${STORE_EMAIL} | PIN: 1234/5678 | Lizenz: ${LICENSE_KEY}`,
    priority: "high"
  });
  const existingVehicles = await db.select().from(vehicles).where((0, import_drizzle_orm4.eq)(vehicles.tenantId, tenant.id));
  if (existingVehicles.length === 0) {
    await db.insert(vehicles).values([
      { tenantId: tenant.id, branchId: null, licensePlate: "ZH 123456", make: "Mercedes", model: "Vito", color: "Wei\xDF", driverName: "Ahmed Ali", driverPhone: "+41791234567", isActive: true },
      { tenantId: tenant.id, branchId: null, licensePlate: "ZH 654321", make: "Volkswagen", model: "Transporter", color: "Blau", driverName: "Mohamed Hassan", driverPhone: "+41799876543", isActive: true },
      { tenantId: tenant.id, branchId: null, licensePlate: "ZH 111222", make: "Ford", model: "Transit", color: "Silber", driverName: "Omar Ibrahim", driverPhone: "+41761122334", isActive: true }
    ]);
    console.log("[PIZZA LEMON] \u2713 3 sample vehicles inserted.");
  }
  console.log(`[PIZZA LEMON] \u2713 Setup complete!`);
  console.log(`[PIZZA LEMON]    Email:   ${STORE_EMAIL}`);
  console.log(`[PIZZA LEMON]    Pass:    ${STORE_PASSWORD}`);
  console.log(`[PIZZA LEMON]    License: ${LICENSE_KEY}`);
  console.log(`[PIZZA LEMON]    Admin PIN: 1234  |  Cashier PIN: 5678`);
  console.log(
    `[PIZZA LEMON]    Menu: ${PIZZAS.length} Pizza, ${CALZONES.length} Calzone, ${PIDE.length} Pide, ${LAHMACUN.length} Lahmacun, ${TELLERGERICHTE.length} Tellergerichte, ${FINGERFOOD.length} Fingerfood, ${SALATE.length} Salat, ${DESSERTS.length} Dessert, ${GETRAENKE.length} Getr\xE4nke, ${BIER.length} Bier, ${ALKOHOL.length} Alkohol, ${EXTRAS.length} Extra = ${total} total`
  );
}
var import_drizzle_orm4, import_bcrypt2, import_date_fns, STORE_EMAIL, STORE_PASSWORD, LICENSE_KEY, BUSINESS_NAME, IMG, PIZZA_LEMON_CATEGORIES, PIZZAS, CALZONES, PIDE, LAHMACUN, TELLERGERICHTE, FINGERFOOD, SALATE, DESSERTS, GETRAENKE, BIER, ALKOHOL, EXTRAS;
var init_seedPizzaLemon = __esm({
  "server/seedPizzaLemon.ts"() {
    "use strict";
    init_db();
    import_drizzle_orm4 = require("drizzle-orm");
    init_schema();
    import_bcrypt2 = __toESM(require("bcrypt"));
    import_date_fns = require("date-fns");
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
      { name: "Extra", color: "#4A5568", icon: "add-circle", sortOrder: 12 }
    ];
    PIZZAS = [
      { name: "Margherita", description: "Tomatensauce, Mozzarella, Oregano", price: 15, price45: 27, image: IMG("pizzalemon_01_margherita.jpg") },
      { name: "Profumata", description: "Zwiebeln, Knoblauch", price: 16, price45: 29, image: IMG("pizzalemon_02_profumata.jpg") },
      { name: "Funghi", description: "Frische Champignons", price: 16, price45: 30, image: IMG("pizzalemon_03_funghi.jpg") },
      { name: "Spinat", description: "Spinat", price: 16, price45: 30, image: IMG("pizzalemon_04_spinat.jpg") },
      { name: "Gorgonzola", description: "Gorgonzola", price: 16, price45: 31, image: IMG("pizzalemon_05_gorgonzola.jpg") },
      { name: "Prosciutto", description: "Schinken", price: 17, price45: 32, image: IMG("pizzalemon_06_prosciutto.jpg") },
      { name: "Salami", description: "Scharfe Salami", price: 17, price45: 32, image: IMG("pizzalemon_07_salami.jpg") },
      { name: "Arrabbiata", description: "Oliven, frische Champignons, scharf", price: 17, price45: 33, image: IMG("pizzalemon_09_arrabbiata.jpg") },
      { name: "Diavola", description: "Scharfe Salami, Oliven, Zwiebeln", price: 18, price45: 33, image: IMG("pizzalemon_08_diavola.jpg") },
      { name: "Siciliana", description: "Schinken, Sardellen, Kapern", price: 18, price45: 33, image: IMG("pizzalemon_10_siciliana.jpg") },
      { name: "Prosciutto E Funghi", description: "Frische Champignons, Schinken", price: 18, price45: 33, image: IMG("pizzalemon_11_prosciutto_e_funghi.jpg") },
      { name: "Hawaii", description: "Schinken, Ananas", price: 18, price45: 33, image: IMG("pizzalemon_12_hawaii.jpg") },
      { name: "Tonno", description: "Thon, Zwiebeln", price: 18, price45: 33, image: IMG("pizzalemon_13_tonno.jpg") },
      { name: "Piccante", description: "Peperoni, Peperoncini, Zwiebeln, Knoblauch", price: 18, price45: 34, image: IMG("pizzalemon_14_piccante.jpg") },
      { name: "Raclette", description: "Raclettek\xE4se", price: 18, price45: 34, image: IMG("pizzalemon_15_raclette.jpg") },
      { name: "Fiorentina", description: "Spinat, Parmesan, Ei, Oregano", price: 19, price45: 34, image: IMG("pizzalemon_16_fiorentina.jpg") },
      { name: "Kebab Pizza", description: "Kebabfleisch", price: 20, price45: 35, image: IMG("pizzalemon_17_kebab_pizza.jpg") },
      { name: "Poulet", description: "Poulet", price: 20, price45: 35, image: IMG("pizzalemon_18_poulet.jpg") },
      { name: "Carbonara", description: "Speck, Ei, Zwiebeln", price: 20, price45: 35, image: IMG("pizzalemon_19_carbonara.jpg") },
      { name: "Gamberetti", description: "Crevetten, Knoblauch", price: 20, price45: 35, image: IMG("pizzalemon_20_gamberetti.jpg") },
      { name: "Quattro Formaggi", description: "4 K\xE4sesorten, Mascarpone", price: 20, price45: 35, image: IMG("pizzalemon_21_quattro_formaggi.jpg") },
      { name: "Quattro Stagioni", description: "Schinken, Champignons, Artischocken, Peperoni", price: 20, price45: 35, image: IMG("pizzalemon_22_quattro_stagioni.jpg") },
      { name: "Frutti Di Mare", description: "Meeresfr\xFCchte", price: 20, price45: 35, image: IMG("pizzalemon_23_frutti_di_mare.jpg") },
      { name: "Verdura", description: "Gem\xFCse", price: 20, price45: 35, image: IMG("pizzalemon_24_verdura.jpg") },
      { name: "Napoli", description: "Sardellen, Oliven, Kapern", price: 18, price45: 34, image: IMG("pizzalemon_25_napoli.jpg") },
      { name: "Pizzaiolo", description: "Speck, Knoblauch, frische Champignons", price: 18, price45: 34, image: IMG("pizzalemon_26_pizzaiolo.jpg") },
      { name: "Acasa", description: "Gefl\xFCgelgeschnetzeltes, Peperoni, Ei", price: 20, price45: 36, image: IMG("pizzalemon_27_a_casa.jpg") },
      { name: "Porcini", description: "Steinpilze, Zwiebeln", price: 20, price45: 36, image: IMG("pizzalemon_28_porcini.jpg") },
      { name: "Spezial", description: "Kalbfleisch, Knoblauch, scharf, Kr\xE4uterbutter", price: 21, price45: 36, image: IMG("pizzalemon_29_spezial.jpg") },
      { name: "Padrone", description: "Gorgonzola, frische Champignons", price: 21, price45: 35, image: IMG("pizzalemon_30_padrone.jpg") },
      { name: "Schloss Pizza", description: "Schinken, Speck, scharfe Salami", price: 21, price45: 36, image: IMG("pizzalemon_31_schloss_pizza.jpg") },
      { name: "Italiano", description: "Rohschinken, Mascarpone, Rucola", price: 21, price45: 36, image: IMG("pizzalemon_32_italiano.jpg") },
      { name: "Americano", description: "Speck, Mais, Zwiebeln", price: 21, price45: 36, image: IMG("pizzalemon_33_americano.jpg") },
      { name: "Lemon Pizza", description: "Lammfleisch, Knoblauch, Zwiebeln, Peperoncini, scharf", price: 21, price45: 36, image: IMG("pizzalemon_34_lemon_pizza.jpg") }
    ];
    CALZONES = [
      { name: "Calzone", description: "Tomaten, Mozzarella, Schinken, Pilze, Ei", price: 20, image: IMG("pizzalemon_c1_calzone.jpg") },
      { name: "Calzone Kebab", description: "Tomaten, Mozzarella, Kebabfleisch, Ei", price: 20, image: IMG("pizzalemon_c2_calzone_kebab.jpg") },
      { name: "Calzone Verdura", description: "Tomaten, Mozzarella, Saisongem\xFCse", price: 20, image: IMG("pizzalemon_c3_calzone_verdura.jpg") }
    ];
    PIDE = [
      { name: "Pide mit K\xE4se", description: "Pide mit Schafsk\xE4se", price: 15, image: IMG("pizzalemon_36_pide_mit_kaese.jpg") },
      { name: "Pide mit Hackfleisch", description: "Pide mit Hackfleisch", price: 17, image: IMG("pizzalemon_37_pide_mit_hackfleisch.jpg") },
      { name: "Pide mit K\xE4se und Hackfleisch", description: "Pide mit Schafsk\xE4se und Hackfleisch", price: 18, image: IMG("pizzalemon_38_pide_kaese_hackfleisch.jpg") },
      { name: "Pide mit K\xE4se und Spinat", description: "Pide mit Schafsk\xE4se und Spinat", price: 18, image: IMG("pizzalemon_39_pide_kaese_spinat.jpg") },
      { name: "Pide mit K\xE4se und Ei", description: "Pide mit Schafsk\xE4se und Ei", price: 18, image: IMG("pizzalemon_40_pide_kaese_ei.jpg") },
      { name: "Lemon Pide / Eti Ekmek", description: "Gew\xFCrztes Hackfleisch und K\xE4se", price: 18, image: IMG("pizzalemon_41_lemon_pide.jpg") },
      { name: "Lemon Pide Spezial / Bicak Arasi", description: "Gew\xFCrztes, fein gehacktes Fleisch", price: 20, image: IMG("pizzalemon_42_lemon_pide_spezial.jpg") },
      { name: "Pide mit Sucuk", description: "Knoblauchwurst", price: 18, image: IMG("pizzalemon_43_pide_mit_sucuk.jpg") },
      { name: "Pide mit Kebabfleisch", description: "Pide mit Kebabfleisch", price: 20, image: IMG("pizzalemon_44_pide_mit_kebabfleisch.jpg") }
    ];
    LAHMACUN = [
      { name: "Lahmacun mit Salat", description: "T\xFCrkische Minipizza mit Hackfleisch und frischem Salat", price: 15, image: IMG("pizzalemon_45_lahmacun_mit_salat.jpg") },
      { name: "Lahmacun mit Salat und Kebab", description: "Lahmacun mit frischem Salat und Kebabfleisch", price: 20, image: IMG("pizzalemon_46_lahmacun_salat_kebab.jpg") }
    ];
    TELLERGERICHTE = [
      { name: "D\xF6ner Teller Mit Pommes", description: "D\xF6ner Teller mit Pommes", price: 20, image: IMG("pizzalemon_47_doener_teller_pommes.jpg") },
      { name: "D\xF6ner Teller Mit Salat", description: "D\xF6ner Teller mit Salat", price: 20, image: IMG("pizzalemon_48_doener_teller_salat.jpg") },
      { name: "D\xF6ner Teller Mit Salat Und Pommes", description: "D\xF6ner Teller mit Salat und Pommes", price: 22, image: IMG("pizzalemon_49_doener_teller_komplett.jpg") },
      { name: "Chicken Nuggets 8 Stk.", description: "Mit Pommes oder Salat", price: 19, image: IMG("pizzalemon_50_chicken_nuggets_8stk.jpg") },
      { name: "Pouletschnitzel", description: "Mit Pommes oder Salat und Brot", price: 19, image: IMG("pizzalemon_51_pouletschnitzel.jpg") },
      { name: "Pouletfl\xFCgeli 12 Stk.", description: "Mit Pommes oder Salat und Brot", price: 20, image: IMG("pizzalemon_52_pouletfluegeli_12stk.jpg") },
      { name: "Poulet Kebab Teller", description: "Mit Pommes oder Salat und Brot", price: 20, image: IMG("pizzalemon_53_poulet_kebab_teller.jpg") },
      { name: "Lamm Kebab Teller / Sac Kavurma", description: "Mit Pommes oder Salat und Brot", price: 22, image: IMG("pizzalemon_54_lamm_kebab_teller.jpg") },
      { name: "K\xF6fte Teller", description: "Mit Pommes oder Salat und Brot", price: 21, image: IMG("pizzalemon_55_koefte_teller.jpg") },
      { name: "Cevapcici", description: "Mit Pommes oder Salat und Brot", price: 19, image: IMG("pizzalemon_56_cevapcici_teller.jpg") },
      { name: "Falafel Teller", description: "Mit Pommes oder Salat und Brot", price: 18, image: IMG("pizzalemon_57_falafel_teller.jpg") },
      { name: "Pommes", description: "Pommes frites, knusprig frittiert", price: 10, image: IMG("pizzalemon_58_pommes.jpg") },
      { name: "Original Schweins Cordon Bleu", description: "Mit frischem Gem\xFCse, Salat, Pommes", price: 23, image: IMG("pizzalemon_59_cordon_bleu.jpg") }
    ];
    FINGERFOOD = [
      { name: "D\xF6ner Kebab Im Taschenbrot", description: "Mit hausgemachter Cocktail- oder Joghurtsauce", price: 14, image: IMG("pizzalemon_60_doener_kebab_tasche.jpg") },
      { name: "D\xFCr\xFCm Kebab Im Fladenbrot", description: "Mit hausgemachter Cocktail- oder Joghurtsauce", price: 14, image: IMG("pizzalemon_61_dueruem_kebab.jpg") },
      { name: "D\xF6ner Box Mit Salat Und Pommes", description: "D\xF6ner Box mit Salat und Pommes", price: 14, image: IMG("pizzalemon_62_doener_box.jpg") },
      { name: "Falafel Im Taschenbrot", description: "Mit hausgemachter Cocktail- oder Joghurtsauce", price: 13, image: IMG("pizzalemon_63_falafel_taschenbrot.jpg") },
      { name: "Falafel D\xFCr\xFCm Im Fladenbrot", description: "Mit hausgemachter Cocktail- oder Joghurtsauce", price: 13, image: IMG("pizzalemon_64_falafel_dueruem.jpg") },
      { name: "Poulet Pepito", description: "Poulet im Fladenbrot", price: 13, image: IMG("pizzalemon_65_poulet_pepito.jpg") },
      { name: "Lamm Pepito", description: "Lamm im Fladenbrot", price: 15, image: IMG("pizzalemon_66_lamm_pepito.jpg") },
      { name: "Lemon Burger", description: "Lemon Burger mit Rindfleisch, Raclettek\xE4se und Ei", price: 17, image: IMG("pizzalemon_68_lemon_burger.jpg") },
      { name: "Cheeseburger", description: "Mit Rindfleisch und K\xE4se", price: 14, image: IMG("pizzalemon_69_cheeseburger.jpg") },
      { name: "Hamburger Mit Rindfleisch", description: "Hamburger mit Rindfleisch", price: 13, image: IMG("pizzalemon_70_hamburger_rindfleisch.jpg") },
      { name: "Poulet Kebab Mit Gem\xFCse Im Taschenbrot", description: "Mit hausgemachter Cocktail- oder Joghurtsauce", price: 14, image: IMG("pizzalemon_71_poulet_kebab_tasche.jpg") },
      { name: "Poulet Kebab Mit Gem\xFCse Im Fladenbrot", description: "Mit hausgemachter Cocktail- oder Joghurtsauce", price: 14, image: IMG("pizzalemon_72_poulet_kebab_fladen.jpg") },
      { name: "Lamm Kebab Mit Gem\xFCse Im Taschenbrot", description: "Mit hausgemachter Cocktail- oder Joghurtsauce", price: 15, image: IMG("pizzalemon_73_lamm_kebab_tasche.jpg") },
      { name: "Lamm Kebab Mit Gem\xFCse Im Fladenbrot", description: "Mit hausgemachter Cocktail- oder Joghurtsauce", price: 15, image: IMG("pizzalemon_74_lamm_kebab_fladen.jpg") },
      { name: "K\xF6fte Im Taschenbrot", description: "Mit hausgemachter Cocktail- oder Joghurtsauce", price: 14, image: IMG("pizzalemon_75_koefte_taschenbrot.jpg") },
      { name: "Cevapcici Im Taschenbrot", description: "Mit hausgemachter Cocktail- oder Joghurtsauce", price: 14, image: IMG("pizzalemon_76_cevapcici_taschenbrot.jpg") },
      { name: "Falafel Box Mit Salat Und Pommes", description: "Falafel Box mit Salat und Pommes", price: 13, image: IMG("pizzalemon_77_falafel_box.jpg") },
      { name: "Chicken Nuggets Box", description: "Chicken Nuggets Box", price: 13, image: IMG("pizzalemon_78_chicken_nuggets_box.jpg") },
      { name: "Kebab Im Fladenbrot mit Raclette", description: "Mit hausgemachter Cocktail- oder Joghurtsauce", price: 16, image: IMG("pizzalemon_79_kebab_fladen_raclette.jpg") },
      { name: "Kebab Im Taschenbrot mit Raclette", description: "Mit hausgemachter Cocktail- oder Joghurtsauce", price: 16, image: IMG("pizzalemon_80_kebab_tasche_raclette.jpg") },
      { name: "Kebab Im Fladenbrot mit Speck", description: "Mit hausgemachter Cocktail- oder Joghurtsauce", price: 16, image: IMG("pizzalemon_81_kebab_fladen_speck.jpg") },
      { name: "Kebab Im Taschenbrot mit Speck", description: "Mit hausgemachter Cocktail- oder Joghurtsauce", price: 16, image: IMG("pizzalemon_82_kebab_tasche_speck.jpg") }
    ];
    SALATE = [
      { name: "Gr\xFCner Salat", description: "Sauce nach Wahl: Italienisch oder Franz\xF6sisch", price: 9, image: IMG("pizzalemon_83_gruener_salat.jpg") },
      { name: "Gemischter Salat", description: "Sauce nach Wahl: Italienisch oder Franz\xF6sisch", price: 12, image: IMG("pizzalemon_84_gemischter_salat.jpg") },
      { name: "Griechischer Salat", description: "Sauce nach Wahl: Italienisch oder Franz\xF6sisch", price: 14, image: IMG("pizzalemon_85_griechischer_salat.jpg") },
      { name: "Lemon Salat", description: "Tomaten, Gurken und grilliertes Pouletfleisch", price: 15, image: IMG("pizzalemon_86_lemon_salat.jpg") },
      { name: "Thon Salat", description: "Thunfisch, gemischter Salat", price: 13, image: IMG("pizzalemon_87_thon_salat.jpg") },
      { name: "Tomaten Salat", description: "Tomaten, Zwiebeln", price: 12, image: IMG("pizzalemon_88_tomaten_salat.jpg") },
      { name: "Tomaten Mozzarella Salat", description: "Tomaten, Mozzarella", price: 14, image: IMG("pizzalemon_89_tomaten_mozzarella.jpg") },
      { name: "Knoblibrot", description: "Knoblauchbrot", price: 7, image: IMG("pizzalemon_90_knoblibrot.jpg") },
      { name: "Crevettencocktail Salat", description: "Crevettencocktail Salat", price: 15, image: IMG("pizzalemon_91_crevettencocktail.jpg") }
    ];
    DESSERTS = [
      { name: "Tiramis\xF9", description: "Klassisches italienisches Tiramis\xF9", price: 7, image: IMG("pizzalemon_92_tiramisu.jpg") },
      { name: "Baklava", description: "Portion 4 Stk.", price: 8, image: IMG("pizzalemon_93_baklava.jpg") },
      { name: "Marlenke mit Honig oder Schokolade", description: "Marlenke mit Honig oder Schokolade", price: 7, image: IMG("pizzalemon_94_marlenke.jpg") },
      { name: "Choco-Mousse", description: "Cremige Schokoladenmousse", price: 7, image: IMG("pizzalemon_95_choco_mousse.jpg") }
    ];
    GETRAENKE = [
      { name: "Coca-Cola", description: "50cl oder 1.5 L", price: 4, image: IMG("pizzalemon_97_coca_cola.jpg") },
      { name: "Coca-Cola Light", description: "50cl oder 1.5 L", price: 4, image: IMG("pizzalemon_97_coca_cola.jpg") },
      { name: "Coca-Cola Zero", description: "50cl oder 1.5 L", price: 4, image: IMG("pizzalemon_97_coca_cola.jpg") },
      { name: "Fanta", description: "50cl oder 1.5 L", price: 4, image: IMG("pizzalemon_98_fanta.jpg") },
      { name: "Eistee", description: "50cl oder 1.5 L", price: 4, image: IMG("pizzalemon_99_eistee.jpg") },
      { name: "Mineralwasser", description: "50cl oder 1.5 L", price: 4, image: IMG("pizzalemon_100_mineralwasser.jpg") },
      { name: "Uludag Gazoz", description: "50cl", price: 4, image: IMG("pizzalemon_101_uludag_gazoz.jpg") },
      { name: "Rivella", description: "50cl", price: 4, image: IMG("pizzalemon_102_rivella.jpg") },
      { name: "Ayran 0.25 L", description: "0.25 L", price: 4, image: IMG("pizzalemon_103_ayran.jpg") },
      { name: "Red Bull 0.25 L", description: "0.25 L", price: 5, image: IMG("pizzalemon_104_red_bull.jpg") }
    ];
    BIER = [
      { name: "Feldschl\xF6sschen", description: "Feldschl\xF6sschen Bier, 0.5l", price: 5, image: IMG("pizzalemon_106_feldschloesschen.jpg") }
    ];
    ALKOHOL = [
      { name: "Rotwein / Merlot", description: "50cl", price: 15, image: IMG("pizzalemon_107_rotwein_merlot.jpg") },
      { name: "Weisswein", description: "50cl", price: 17, image: IMG("pizzalemon_108_weisswein.jpg") },
      { name: "Whisky", description: "Whisky 40%, 70cl Flasche", price: 50, image: IMG("pizzalemon_109_whisky.jpg") },
      { name: "Vodka", description: "Vodka 40%, 70cl Flasche", price: 50, image: IMG("pizzalemon_110_vodka.jpg") },
      { name: "Champagner", description: "70cl", price: 35, image: IMG("pizzalemon_111_champagner.jpg") },
      { name: "Smirnoff", description: "275ml", price: 6, image: IMG("pizzalemon_112_smirnoff_ice.jpg") }
    ];
    EXTRAS = [
      // ── Existing extras ──────────────────────────────────────────────────────
      { name: "Brot", description: "Frisches Brot", price: 2, image: IMG("pizzalemon_extra_brot.jpg") },
      { name: "Knoblibrot", description: "Knuspriges Brot mit Knoblauchbutter", price: 7, image: IMG("pizzalemon_90_knoblibrot.jpg") },
      { name: "Pommes Extra", description: "Extra Portion Pommes frites", price: 11, image: IMG("pizzalemon_58_pommes.jpg") },
      // ── Pizza toppings (+CHF 2.00 each) ──────────────────────────────────────
      { name: "Tomato Sauce", description: "Tomatensauce", price: 2, image: emojiImg("\u{1F345}") },
      { name: "Sliced Tomatoes", description: "Tomatenscheiben", price: 2, image: emojiImg("\u{1F345}") },
      { name: "Garlic", description: "Knoblauch", price: 2, image: emojiImg("\u{1F9C4}") },
      { name: "Onions", description: "Zwiebeln", price: 2, image: emojiImg("\u{1F9C5}") },
      { name: "Capers", description: "Kapern", price: 2, image: emojiImg("\u{1FAD9}") },
      { name: "Olivas", description: "Oliven", price: 2, image: emojiImg("\u{1FAD2}") },
      { name: "Oregano", description: "Oregano", price: 2, image: emojiImg("\u{1F33F}") },
      { name: "Vegetables", description: "Gem\xFCse", price: 2, image: emojiImg("\u{1F957}") },
      { name: "Spinach", description: "Spinat", price: 2, image: emojiImg("\u{1F96C}") },
      { name: "Bell Peppers", description: "Paprika", price: 2, image: emojiImg("\u{1FAD1}") },
      { name: "Corn", description: "Mais", price: 2, image: emojiImg("\u{1F33D}") },
      { name: "Broccoli", description: "Brokkoli", price: 2, image: emojiImg("\u{1F966}") },
      { name: "Artichokes", description: "Artischocken", price: 2, image: emojiImg("\u{1F331}") },
      { name: "Egg", description: "Ei", price: 2, image: emojiImg("\u{1F95A}") },
      { name: "Pineapple", description: "Ananas", price: 2, image: emojiImg("\u{1F34D}") },
      { name: "Arugula", description: "Rucola", price: 2, image: emojiImg("\u{1F33F}") },
      { name: "Mushrooms", description: "Pilze", price: 2, image: emojiImg("\u{1F344}") },
      { name: "Ham", description: "Schinken", price: 2, image: emojiImg("\u{1F356}") },
      { name: "Spicy Salami", description: "Scharfe Salami", price: 2, image: emojiImg("\u{1F336}\uFE0F") },
      { name: "Salami", description: "Salami", price: 2, image: emojiImg("\u{1F969}") },
      { name: "Basami", description: "Basilikum", price: 2, image: emojiImg("\u{1F33F}") },
      { name: "Prosciutto", description: "Rohschinken", price: 2, image: emojiImg("\u{1F969}") },
      { name: "Lardons", description: "Speckw\xFCrfel", price: 2, image: emojiImg("\u{1F953}") },
      { name: "Chicken", description: "H\xFChnerfleisch", price: 2, image: emojiImg("\u{1F357}") },
      { name: "Kebab", description: "Kebabfleisch", price: 2, image: emojiImg("\u{1F959}") },
      { name: "Minced Meat", description: "Hackfleisch", price: 2, image: emojiImg("\u{1F969}") },
      { name: "Anchovies", description: "Sardellen", price: 2, image: emojiImg("\u{1F41F}") },
      { name: "Sardinen", description: "Sardinen", price: 2, image: emojiImg("\u{1F41F}") },
      { name: "Tuna", description: "Thunfisch", price: 2, image: emojiImg("\u{1F41F}") },
      { name: "Spicy Sauce", description: "Scharfe Sauce", price: 2, image: emojiImg("\u{1F336}\uFE0F") },
      { name: "Mozzarella", description: "Mozzarella", price: 2, image: emojiImg("\u{1F9C0}") },
      { name: "Gorgonzola", description: "Gorgonzola", price: 2, image: emojiImg("\u{1F9C0}") },
      { name: "Parmesan", description: "Parmesan", price: 2, image: emojiImg("\u{1F9C0}") },
      { name: "Mascarpone", description: "Mascarpone", price: 2, image: emojiImg("\u{1F9C0}") },
      { name: "K\xE4serand (33cm)", description: "K\xE4serand 33cm", price: 3, image: emojiImg("\u{1F9C0}") },
      { name: "K\xE4serand (45cm)", description: "K\xE4serand 45cm", price: 6, image: emojiImg("\u{1F9C0}") },
      // ── Sauces (FREE) ─────────────────────────────────────────────────────────
      { name: "Mayonnaise", description: "Mayonnaise", price: 0, image: emojiImg("\u{1F96B}") },
      { name: "Ketchup", description: "Ketchup", price: 0, image: emojiImg("\u{1F345}") },
      { name: "Cocktail Sauce", description: "Cocktailsauce", price: 0, image: emojiImg("\u{1F96B}") },
      { name: "Yogurt Sauce", description: "Joghurtsauce", price: 0, image: emojiImg("\u{1F95B}") }
    ];
  }
});

// server/seedAllDemoData.ts
var seedAllDemoData_exports = {};
__export(seedAllDemoData_exports, {
  seedAllDemoData: () => seedAllDemoData
});
function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick(arr) {
  return arr[rand(0, arr.length - 1)];
}
function uuid() {
  return crypto3.randomUUID().split("-")[0].toUpperCase();
}
async function seedAllDemoData() {
  console.log("[SEED] Starting comprehensive demo data seeding...");
  const [saCount] = await db.select({ count: import_drizzle_orm5.sql`count(*)` }).from(superAdmins);
  if (Number(saCount.count) === 0) {
    const hash3 = await import_bcrypt3.default.hash("admin123", 10);
    await db.insert(superAdmins).values({
      name: "System Admin",
      email: "admin@barmagly.com",
      passwordHash: hash3,
      role: "super_admin",
      isActive: true
    });
    console.log("[SEED] Created super admin: admin@barmagly.com / admin123");
  }
  const [tenantCount] = await db.select({ count: import_drizzle_orm5.sql`count(*)` }).from(tenants);
  if (Number(tenantCount.count) < 3) {
    for (const store of DEMO_STORES) {
      const hash3 = await import_bcrypt3.default.hash("store123", 10);
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
      const endDate = (0, import_date_fns2.addMonths)(/* @__PURE__ */ new Date(), 12);
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
    let tenantBranches = await db.select().from(branches).where((0, import_drizzle_orm5.eq)(branches.tenantId, t.id));
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
      tenantBranches = await db.select().from(branches).where((0, import_drizzle_orm5.eq)(branches.tenantId, t.id));
    }
    const branchIds = tenantBranches.map((b) => b.id);
    if (branchIds.length === 0) continue;
    for (const bId of branchIds) {
      const [existingWH] = await db.select().from(warehouses).where((0, import_drizzle_orm5.eq)(warehouses.branchId, bId)).limit(1);
      if (!existingWH) {
        await db.insert(warehouses).values({
          name: `Warehouse - Branch ${bId}`,
          branchId: bId,
          isDefault: true,
          isActive: true
        });
      }
    }
    let tenantEmployees = await db.select().from(employees).where(import_drizzle_orm5.sql`${employees.branchId} IN (${import_drizzle_orm5.sql.join(branchIds, import_drizzle_orm5.sql`, `)})`);
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
      tenantEmployees = await db.select().from(employees).where(import_drizzle_orm5.sql`${employees.branchId} IN (${import_drizzle_orm5.sql.join(branchIds, import_drizzle_orm5.sql`, `)})`);
    }
    const employeeIds = tenantEmployees.map((e) => e.id);
    let tenantProducts = await db.select().from(products).where((0, import_drizzle_orm5.eq)(products.tenantId, t.id));
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
      tenantProducts = await db.select().from(products).where((0, import_drizzle_orm5.eq)(products.tenantId, t.id));
    }
    const productIds = tenantProducts.map((p) => p.id);
    for (const pId of productIds) {
      for (const bId of branchIds) {
        const [existingInv] = await db.select().from(inventory).where(import_drizzle_orm5.sql`${inventory.productId} = ${pId} AND ${inventory.branchId} = ${bId}`);
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
    const [custCount] = await db.select({ count: import_drizzle_orm5.sql`count(*)` }).from(customers);
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
    const [supCount] = await db.select({ count: import_drizzle_orm5.sql`count(*)` }).from(suppliers);
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
    const [saleCount] = await db.select({ count: import_drizzle_orm5.sql`count(*)` }).from(sales).where(import_drizzle_orm5.sql`${sales.branchId} IN (${import_drizzle_orm5.sql.join(branchIds, import_drizzle_orm5.sql`, `)})`);
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
          createdAt: (0, import_date_fns2.addDays)(/* @__PURE__ */ new Date(), -rand(0, 30))
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
      const [existingShift] = await db.select().from(shifts).where((0, import_drizzle_orm5.eq)(shifts.employeeId, eId)).limit(1);
      if (!existingShift) {
        const bId = pick(branchIds);
        const [shift] = await db.insert(shifts).values({
          employeeId: eId,
          branchId: bId,
          startTime: (0, import_date_fns2.addDays)(/* @__PURE__ */ new Date(), -1),
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
      const [existingTable] = await db.select().from(tables).where((0, import_drizzle_orm5.eq)(tables.branchId, bId)).limit(1);
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
    const [expCount] = await db.select({ count: import_drizzle_orm5.sql`count(*)` }).from(expenses).where(import_drizzle_orm5.sql`${expenses.branchId} IN (${import_drizzle_orm5.sql.join(branchIds, import_drizzle_orm5.sql`, `)})`);
    if (Number(expCount.count) < 3) {
      for (let i = 0; i < 3; i++) {
        await db.insert(expenses).values({
          branchId: pick(branchIds),
          category: pick(["Rent", "Utilities", "Supplies"]),
          amount: String(rand(100, 500)),
          description: "Demo expense",
          date: (0, import_date_fns2.addDays)(/* @__PURE__ */ new Date(), -rand(0, 30)),
          employeeId: pick(employeeIds)
        });
      }
    }
    for (const pId of productIds) {
      const [existingBatch] = await db.select().from(productBatches).where((0, import_drizzle_orm5.eq)(productBatches.productId, pId)).limit(1);
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
      const [existingSC] = await db.select().from(stockCounts).where((0, import_drizzle_orm5.eq)(stockCounts.branchId, bId)).limit(1);
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
var import_drizzle_orm5, crypto3, import_bcrypt3, import_date_fns2, DEMO_STORES, CATEGORY_NAMES, PRODUCT_NAMES, CUSTOMER_NAMES, SUPPLIER_NAMES;
var init_seedAllDemoData = __esm({
  "server/seedAllDemoData.ts"() {
    "use strict";
    init_db();
    import_drizzle_orm5 = require("drizzle-orm");
    init_schema();
    crypto3 = __toESM(require("crypto"));
    import_bcrypt3 = __toESM(require("bcrypt"));
    import_date_fns2 = require("date-fns");
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
var import_express = __toESM(require("express"));

// server/routes.ts
var import_node_http = require("node:http");
var xlsx = __toESM(require("xlsx"));
var import_node_path = __toESM(require("node:path"));
var import_node_fs = __toESM(require("node:fs"));
var import_node_crypto = require("node:crypto");
init_storage();

// server/objectStorage.ts
var import_storage = require("@google-cloud/storage");
var import_crypto = require("crypto");
var REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";
var objectStorageClient = new import_storage.Storage({
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
    const objectId = (0, import_crypto.randomUUID)();
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
var import_events = require("events");
var import_ws = require("ws");
init_phoneUtils();
var SLOT_EXPIRY_MS = 5 * 60 * 1e3;
var CallerIDService = class extends import_events.EventEmitter {
  wss = null;
  isSimulation = true;
  // Key: "tenantId-slot"
  activeCallSlots = /* @__PURE__ */ new Map();
  slotTimeouts = /* @__PURE__ */ new Map();
  // Deduplication: track recent calls to prevent double-counting
  // Key: "normalizedPhone-tenantId", Value: timestamp
  recentCalls = /* @__PURE__ */ new Map();
  DEDUP_WINDOW_MS = 5e3;
  // 5 seconds
  constructor() {
    super();
  }
  /**
   * Initialize the service and start listening for calls
   */
  async init(server) {
    console.log("[CallerID] Initializing Service...");
    this.wss = new import_ws.WebSocketServer({ server, path: "/api/ws/caller-id" });
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
        (c) => c.readyState === import_ws.WebSocket.OPEN && c.tenantId === resolvedTenantId
      );
      if (!hasClientForTenant) {
        const firstRegistered = Array.from(this.wss.clients).find(
          (c) => c.readyState === import_ws.WebSocket.OPEN && c.tenantId
        );
        if (firstRegistered?.tenantId) {
          console.log(`[CallerID] Bridge tenantId=${resolvedTenantId} has no clients. Remapping to tenant=${firstRegistered.tenantId}`);
          resolvedTenantId = firstRegistered.tenantId;
        }
      }
    }
    console.log(`[CallerID] Incoming call for tenant ${resolvedTenantId}: ${phoneNumber} (Normalized: ${normalized})`);
    const dedupKey = `${normalized}-${resolvedTenantId}`;
    const now = Date.now();
    const lastSeen = this.recentCalls.get(dedupKey);
    if (lastSeen && now - lastSeen < this.DEDUP_WINDOW_MS) {
      console.log(`[CallerID] Duplicate call from ${normalized} within ${this.DEDUP_WINDOW_MS}ms \u2014 skipping`);
      const existing = Array.from(this.activeCallSlots.values()).find((c) => c.normalizedPhone === normalized && c.tenantId === resolvedTenantId);
      return existing || null;
    }
    this.recentCalls.set(dedupKey, now);
    if (this.recentCalls.size > 100) {
      for (const [k, ts] of this.recentCalls) {
        if (now - ts > this.DEDUP_WINDOW_MS * 2) this.recentCalls.delete(k);
      }
    }
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
      if (client2.readyState === import_ws.WebSocket.OPEN) {
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
  // ── Delivery Platform broadcast helpers ──────────────────────────────────────
  /**
   * Broadcast driver GPS location update to tenant POS clients
   */
  broadcastDriverLocation(tenantId, vehicleId, lat, lng, orderId) {
    this.broadcast({
      type: "driver_location_update",
      vehicleId,
      lat,
      lng,
      orderId: orderId ?? null,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }, tenantId);
  }
  /**
   * Broadcast delivery order status change to tenant POS clients
   */
  broadcastDeliveryStatus(tenantId, orderId, status2, driverName) {
    this.broadcast({
      type: "delivery_status_change",
      orderId,
      status: status2,
      driverName: driverName ?? null,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }, tenantId);
  }
  /**
   * Broadcast a new scheduled order alert to tenant POS clients
   */
  broadcastScheduledOrder(tenantId, orderId, scheduledAt, customerName) {
    this.broadcast({
      type: "new_scheduled_order",
      orderId,
      scheduledAt,
      customerName: customerName ?? null,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }, tenantId);
  }
};
var callerIdService = new CallerIDService();

// server/pushService.ts
var import_web_push = __toESM(require("web-push"));
var VAPID_PUBLIC = "BN_VRMNof7tvLBE3u4-dJdq7ZBSOHUqrexcuD2Tf81rQe4t1GSkbUNzRGU9DyoXObqFwUa2ef1w4AWhteWalk08";
var VAPID_PRIVATE = "SYAn5KRDjhIDKcIb7WJr3kgr_LDsLKQYWEIHmcgfnjY";
var VAPID_EMAIL = "mailto:admin@barmagly.tech";
import_web_push.default.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE);
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
          await import_web_push.default.sendNotification(record.sub, msg);
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
var import_jsonwebtoken = __toESM(require("jsonwebtoken"));
init_storage();
var JWT_SECRET = process.env.JWT_SECRET || "barmagly-super-admin-secret-key-2024";
function generateToken(adminId, email, role) {
  return import_jsonwebtoken.default.sign({ id: adminId, email, role }, JWT_SECRET, { expiresIn: "24h" });
}
var requireSuperAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized: Missing or invalid token" });
    }
    const token = authHeader.split(" ")[1];
    const decoded = import_jsonwebtoken.default.verify(token, JWT_SECRET);
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
var import_stripe = __toESM(require("stripe"));
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
  return new import_stripe.default(secretKey, {
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
var import_nodemailer = __toESM(require("nodemailer"));
var SMTP_HOST = process.env.SMTP_HOST || "smtp.hostinger.com";
var SMTP_PORT = parseInt(process.env.SMTP_PORT || "465");
var SMTP_USER = process.env.SMTP_USER || "info@barmagly.tech";
var SMTP_PASS = process.env.SMTP_PASS || "Khaled312001*Khaled312001*";
var FROM_NAME = "Barmagly POS";
var transporter = import_nodemailer.default.createTransport({
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
var import_os = __toESM(require("os"));
var import_path = __toESM(require("path"));
var import_fs = __toESM(require("fs"));
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
var SESSION_NAME = "barmagly-pos";
var STORAGE_DIR = import_path.default.resolve(process.cwd(), ".wppconnect");
var CHROME_DATA_DIR = import_path.default.join(STORAGE_DIR, "chrome-data");
var TOKEN_DIR = import_path.default.join(STORAGE_DIR, "tokens");
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
var keepAliveInterval = null;
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
    const isWindows = import_os.default.platform() === "win32";
    if (isWindows) {
      execSync(`wmic process where "name='chrome.exe' and commandline like '%chrome-data%'" call terminate 2>nul`, { stdio: "ignore" });
      execSync(`wmic process where "name='chromium.exe' and commandline like '%chrome-data%'" call terminate 2>nul`, { stdio: "ignore" });
    } else {
      execSync(
        `pkill -9 -f 'chromium' 2>/dev/null; pkill -9 -f 'wppconnect' 2>/dev/null; true`,
        { timeout: 4e3 }
      );
    }
    await new Promise((r) => setTimeout(r, 800));
  } catch {
  }
  try {
    if (import_fs.default.existsSync(CHROME_DATA_DIR)) {
      import_fs.default.rmSync(CHROME_DATA_DIR, { recursive: true, force: true });
    }
  } catch {
  }
  import_fs.default.mkdirSync(CHROME_DATA_DIR, { recursive: true });
  if (!import_fs.default.existsSync(TOKEN_DIR)) import_fs.default.mkdirSync(TOKEN_DIR, { recursive: true });
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
function startKeepAlive() {
  if (keepAliveInterval) clearInterval(keepAliveInterval);
  keepAliveInterval = setInterval(async () => {
    if (status !== "connected" || !client || !clientReady) return;
    try {
      const alive = await isClientAlive();
      if (!alive) {
        log("Keepalive check failed \u2014 marking disconnected and scheduling reconnect");
        clientReady = false;
        status = "disconnected";
        client = null;
        connectionPhase = "idle";
        scheduleAutoReconnect();
      }
    } catch {
    }
  }, 6e4);
}
function stopKeepAlive() {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
    keepAliveInterval = null;
  }
}
function scheduleAutoReconnect() {
  if (autoReconnectTimer) clearTimeout(autoReconnectTimer);
  autoReconnectTimer = setTimeout(async () => {
    autoReconnectTimer = null;
    if (status === "disconnected" && !connecting) {
      if (client) {
        const alive = await isClientAlive();
        if (alive) {
          log("Native recovery detected \u2014 resuming without full reconnect");
          status = "connected";
          clientReady = true;
          connectionPhase = "ready";
          return;
        }
      }
      try {
        const fsMod = await import("fs");
        const lockFile = import_path.default.join(CHROME_DATA_DIR, "SingletonLock");
        if (fsMod.existsSync(lockFile)) fsMod.unlinkSync(lockFile);
        const cookieLock = import_path.default.join(CHROME_DATA_DIR, "Default", "Cookies-journal");
        if (fsMod.existsSync(cookieLock)) fsMod.unlinkSync(cookieLock);
      } catch {
      }
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
    const isWindows = import_os.default.platform() === "win32";
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
      const username = import_os.default.userInfo().username;
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
      "--disable-extensions",
      "--disable-software-rasterizer",
      "--disable-features=VizDisplayCompositor,AudioServiceOutOfProcess",
      "--disable-background-networking",
      "--disable-default-apps",
      "--disable-sync",
      "--disable-translate",
      "--hide-scrollbars",
      "--metrics-recording-only",
      "--mute-audio",
      "--safebrowsing-disable-auto-update",
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
      waitForInjectToken: true,
      puppeteerOptions: {
        executablePath: browserPath,
        args: browserArgs,
        headless: true,
        userDataDir: CHROME_DATA_DIR,
        timeout: 9e4,
        protocolTimeout: 9e4
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
        if (statusSession === "disconnectedMobile" || statusSession === "desconnectedMobile") {
          if (stabilisationComplete) {
            log(`Transient disconnect (${statusSession}) \u2014 waiting for native recovery\u2026`);
            status = "disconnected";
            clientReady = false;
            connectionPhase = "idle";
            scheduleAutoReconnect();
          }
          return;
        }
        if (statusSession === "notLogged" || statusSession === "browserClose" || statusSession === "serverWssNotConnected" || statusSession === "deviceNotConnected") {
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
    startKeepAlive();
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
    stopKeepAlive();
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
  async sendOrderNotification(order, storeName, adminPhone) {
    if (!adminPhone) {
      log("No admin phone configured for this store \u2014 skipping admin notification");
      return false;
    }
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
    return this.sendText(adminPhone, msg);
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
  },
  // ── Delivery Platform Notifications ───────────────────────────────────────
  /** Notify driver about new assignment + deep link to driver PWA */
  async sendDriverAssignment(driverPhone, driverName, orderId, customerAddress, storeName, driverToken, baseUrl) {
    const driverLink = `${baseUrl}/driver/${driverToken}`;
    const msg = [
      `\u{1F697} New Delivery Assignment \u2014 ${storeName}`,
      ``,
      `Hi ${driverName}!`,
      `Order #${orderId} has been assigned to you.`,
      ``,
      `\u{1F4CD} Deliver to: ${customerAddress}`,
      ``,
      `Open the driver app to start navigation:`,
      driverLink
    ].join("\n");
    return this.sendText(driverPhone, msg);
  },
  /** Send live tracking link to customer when driver picks up order */
  async sendOrderTracking(customerPhone, orderNumber, storeName, trackingToken, baseUrl) {
    const trackLink = `${baseUrl}/track/${trackingToken}`;
    const msg = [
      `\u{1F6F5} Your order is on the way! \u2014 ${storeName}`,
      ``,
      `Order ${orderNumber} has been picked up and is heading your way.`,
      ``,
      `Track your delivery in real time:`,
      trackLink
    ].join("\n");
    return this.sendText(customerPhone, msg);
  },
  /** Request a rating after successful delivery */
  async sendRatingRequest(customerPhone, orderNumber, storeName, orderId, baseUrl, slug) {
    const rateLink = `${baseUrl}/order/${slug}#rate-${orderId}`;
    const msg = [
      `\u2B50 How was your order? \u2014 ${storeName}`,
      ``,
      `Your order ${orderNumber} has been delivered. We hope you enjoyed it!`,
      ``,
      `Please take a moment to rate your experience:`,
      rateLink
    ].join("\n");
    return this.sendText(customerPhone, msg);
  },
  /** Broadcast a promotional message to a customer */
  async sendPromoNotification(customerPhone, storeName, promoTitle, promoCode, expiryDate, baseUrl, slug) {
    const storeLink = `${baseUrl}/order/${slug}`;
    const msg = [
      `\u{1F381} Special Offer from ${storeName}!`,
      ``,
      `${promoTitle}`,
      ``,
      `Use code: *${promoCode}*`,
      `Valid until: ${expiryDate}`,
      ``,
      `Order now:`,
      storeLink
    ].join("\n");
    return this.sendText(customerPhone, msg);
  },
  // ── Food Tracker™ automatic milestone messages ────────────────────────────
  /** Sends the right WhatsApp message per order milestone (accepted/ready/on_way) */
  async sendFoodTrackerUpdate(customerPhone, orderNumber, storeName, status2, trackingToken, baseUrl) {
    if (status2 === "accepted") {
      const msg = [
        `\u2705 Order Received \u2014 ${storeName}`,
        ``,
        `Order ${orderNumber} has been accepted and is now being prepared.`,
        `We'll notify you when it's on the way!`
      ].join("\n");
      return this.sendText(customerPhone, msg);
    }
    if (status2 === "ready") {
      const msg = [
        `\u{1F468}\u200D\u{1F373} Order Ready \u2014 ${storeName}`,
        ``,
        `Order ${orderNumber} is ready and waiting for the driver.`,
        `Delivery is starting soon!`
      ].join("\n");
      return this.sendText(customerPhone, msg);
    }
    if (status2 === "on_way" && trackingToken && baseUrl) {
      const trackLink = `${baseUrl}/track/${trackingToken}`;
      const msg = [
        `\u{1F6F5} On the Way! \u2014 ${storeName}`,
        ``,
        `Your driver has picked up order ${orderNumber} and is heading to you.`,
        ``,
        `Live tracking:`,
        trackLink
      ].join("\n");
      return this.sendText(customerPhone, msg);
    }
    return false;
  }
};

// server/customerAuthService.ts
var import_crypto2 = __toESM(require("crypto"));
var import_bcrypt = __toESM(require("bcrypt"));
init_db();
init_schema();
var import_drizzle_orm2 = require("drizzle-orm");
var SESSION_TTL_DAYS = 30;
var OTP_TTL_MINUTES = 10;
var OTP_MAX_ATTEMPTS = 5;
function generateToken2(bytes = 32) {
  return import_crypto2.default.randomBytes(bytes).toString("hex");
}
function generateOtp() {
  return Math.floor(1e5 + Math.random() * 9e5).toString();
}
async function createOtp(phone, tenantId) {
  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1e3);
  await db.update(otpVerifications).set({ verified: true }).where(
    (0, import_drizzle_orm2.and)(
      (0, import_drizzle_orm2.eq)(otpVerifications.phone, phone),
      (0, import_drizzle_orm2.eq)(otpVerifications.tenantId, tenantId),
      (0, import_drizzle_orm2.eq)(otpVerifications.verified, false)
    )
  );
  await db.insert(otpVerifications).values({
    phone,
    tenantId,
    otp,
    expiresAt,
    attempts: 0,
    verified: false
  });
  return otp;
}
async function verifyOtp(phone, tenantId, inputOtp) {
  const now = /* @__PURE__ */ new Date();
  const [record] = await db.select().from(otpVerifications).where(
    (0, import_drizzle_orm2.and)(
      (0, import_drizzle_orm2.eq)(otpVerifications.phone, phone),
      (0, import_drizzle_orm2.eq)(otpVerifications.tenantId, tenantId),
      (0, import_drizzle_orm2.eq)(otpVerifications.verified, false),
      (0, import_drizzle_orm2.gt)(otpVerifications.expiresAt, now)
    )
  ).orderBy(otpVerifications.id).limit(1);
  if (!record) {
    return { success: false, error: "OTP expired or not found" };
  }
  const attempts = (record.attempts ?? 0) + 1;
  if (attempts > OTP_MAX_ATTEMPTS) {
    await db.update(otpVerifications).set({ verified: true }).where((0, import_drizzle_orm2.eq)(otpVerifications.id, record.id));
    return { success: false, error: "Too many attempts. Please request a new OTP." };
  }
  await db.update(otpVerifications).set({ attempts }).where((0, import_drizzle_orm2.eq)(otpVerifications.id, record.id));
  if (record.otp !== inputOtp) {
    return { success: false, error: "Invalid OTP" };
  }
  await db.update(otpVerifications).set({ verified: true }).where((0, import_drizzle_orm2.eq)(otpVerifications.id, record.id));
  return { success: true };
}
async function findOrCreateCustomerByPhone(phone, tenantId) {
  const [existing] = await db.select().from(customers).where((0, import_drizzle_orm2.and)((0, import_drizzle_orm2.eq)(customers.phone, phone), (0, import_drizzle_orm2.eq)(customers.tenantId, tenantId))).limit(1);
  if (existing) return existing;
  const referralCode = generateToken2(4).toUpperCase();
  const [inserted] = await db.insert(customers).values({
    tenantId,
    name: phone,
    phone,
    hasAccount: true,
    referralCode,
    loyaltyPoints: 0,
    loyaltyTier: "bronze"
  }).$returningId();
  const [newCustomer] = await db.select().from(customers).where((0, import_drizzle_orm2.eq)(customers.id, inserted.id)).limit(1);
  return newCustomer;
}
async function findCustomerByEmail(email, tenantId) {
  const [customer] = await db.select().from(customers).where((0, import_drizzle_orm2.and)((0, import_drizzle_orm2.eq)(customers.email, email), (0, import_drizzle_orm2.eq)(customers.tenantId, tenantId))).limit(1);
  return customer ?? null;
}
async function verifyCustomerPassword(customer, password) {
  if (!customer.passwordHash) return false;
  return import_bcrypt.default.compare(password, customer.passwordHash);
}
async function setCustomerPassword(customerId, password) {
  const hash3 = await import_bcrypt.default.hash(password, 10);
  await db.update(customers).set({ passwordHash: hash3, hasAccount: true }).where((0, import_drizzle_orm2.eq)(customers.id, customerId));
}
async function createCustomerSession(customerId, tenantId, deviceInfo) {
  const token = generateToken2(48);
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1e3);
  await db.insert(customerSessions).values({
    customerId,
    tenantId,
    token,
    deviceInfo: deviceInfo ?? null,
    expiresAt
  });
  return token;
}
async function getCustomerBySession(token) {
  const now = /* @__PURE__ */ new Date();
  const [session] = await db.select().from(customerSessions).where((0, import_drizzle_orm2.and)((0, import_drizzle_orm2.eq)(customerSessions.token, token), (0, import_drizzle_orm2.gt)(customerSessions.expiresAt, now))).limit(1);
  if (!session) return null;
  const [customer] = await db.select().from(customers).where((0, import_drizzle_orm2.eq)(customers.id, session.customerId)).limit(1);
  return customer ?? null;
}
async function deleteCustomerSession(token) {
  await db.delete(customerSessions).where((0, import_drizzle_orm2.eq)(customerSessions.token, token));
}
async function getAuthenticatedCustomer(authHeader) {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.split(" ")[1];
  return getCustomerBySession(token);
}

// server/deliveryService.ts
var import_crypto3 = __toESM(require("crypto"));
init_db();
init_schema();
var import_drizzle_orm3 = require("drizzle-orm");
function generateTrackingToken() {
  return import_crypto3.default.randomBytes(20).toString("hex");
}
async function validatePromoCode(tenantId, code, orderTotal, orderType, customerId) {
  const now = /* @__PURE__ */ new Date();
  const [promo] = await db.select().from(promoCodes).where(
    (0, import_drizzle_orm3.and)(
      (0, import_drizzle_orm3.eq)(promoCodes.tenantId, tenantId),
      (0, import_drizzle_orm3.eq)(promoCodes.code, code.toUpperCase()),
      (0, import_drizzle_orm3.eq)(promoCodes.isActive, true)
    )
  ).limit(1);
  if (!promo) return { valid: false, error: "Invalid promo code" };
  if (promo.validFrom && new Date(promo.validFrom) > now)
    return { valid: false, error: "Promo code is not active yet" };
  if (promo.validUntil && new Date(promo.validUntil) < now)
    return { valid: false, error: "Promo code has expired" };
  if (promo.usageLimit !== null && promo.usageLimit !== void 0 && (promo.usageCount ?? 0) >= promo.usageLimit)
    return { valid: false, error: "Promo code usage limit reached" };
  const minAmount = parseFloat(promo.minOrderAmount ?? "0");
  if (orderTotal < minAmount)
    return {
      valid: false,
      error: `Minimum order amount is ${minAmount} to use this code`
    };
  const types = promo.applicableOrderTypes ?? ["delivery", "pickup"];
  if (!types.includes(orderType))
    return { valid: false, error: "Promo code not applicable for this order type" };
  if (customerId && promo.perCustomerLimit) {
    const [usageCount] = await db.select({ count: import_drizzle_orm3.sql`count(*)` }).from(promoCodeUsages).where(
      (0, import_drizzle_orm3.and)(
        (0, import_drizzle_orm3.eq)(promoCodeUsages.promoCodeId, promo.id),
        (0, import_drizzle_orm3.eq)(promoCodeUsages.customerId, customerId)
      )
    );
    if ((usageCount?.count ?? 0) >= promo.perCustomerLimit)
      return { valid: false, error: "You have already used this promo code" };
  }
  let discountAmount = 0;
  const value = parseFloat(promo.discountValue);
  if (promo.discountType === "percent") {
    discountAmount = orderTotal * value / 100;
    if (promo.maxDiscountCap) {
      discountAmount = Math.min(discountAmount, parseFloat(promo.maxDiscountCap));
    }
  } else if (promo.discountType === "fixed") {
    discountAmount = Math.min(value, orderTotal);
  } else if (promo.discountType === "free_delivery") {
    discountAmount = 0;
  }
  return {
    valid: true,
    discountAmount: Math.round(discountAmount * 100) / 100,
    discountType: promo.discountType,
    promoCode: promo
  };
}
async function recordPromoUsage(promoCodeId, customerId, orderId, discountApplied) {
  await db.insert(promoCodeUsages).values({
    promoCodeId,
    customerId: customerId ?? null,
    orderId,
    discountApplied: discountApplied.toFixed(2)
  });
  await db.update(promoCodes).set({ usageCount: import_drizzle_orm3.sql`usage_count + 1` }).where((0, import_drizzle_orm3.eq)(promoCodes.id, promoCodeId));
}
async function getLoyaltyConfig(tenantId) {
  const [config] = await db.select({
    loyaltyPointsPerUnit: landingPageConfig.loyaltyPointsPerUnit,
    loyaltyRedemptionRate: landingPageConfig.loyaltyRedemptionRate
  }).from(landingPageConfig).where((0, import_drizzle_orm3.eq)(landingPageConfig.tenantId, tenantId)).limit(1);
  return {
    pointsPerUnit: parseFloat(config?.loyaltyPointsPerUnit ?? "1"),
    redemptionRate: parseFloat(config?.loyaltyRedemptionRate ?? "0.01")
  };
}
function calculateLoyaltyTier(points) {
  if (points >= 5e3) return "platinum";
  if (points >= 2e3) return "gold";
  if (points >= 500) return "silver";
  return "bronze";
}
async function awardLoyaltyPoints(customerId, tenantId, orderId, orderTotal) {
  const config = await getLoyaltyConfig(tenantId);
  const pointsToAdd = Math.floor(orderTotal * config.pointsPerUnit);
  if (pointsToAdd <= 0) return 0;
  const [customer] = await db.select({ loyaltyPoints: customers.loyaltyPoints }).from(customers).where((0, import_drizzle_orm3.eq)(customers.id, customerId)).limit(1);
  const before = customer?.loyaltyPoints ?? 0;
  const after = before + pointsToAdd;
  const newTier = calculateLoyaltyTier(after);
  await db.update(customers).set({ loyaltyPoints: after, loyaltyTier: newTier }).where((0, import_drizzle_orm3.eq)(customers.id, customerId));
  await db.insert(loyaltyTransactions).values({
    customerId,
    tenantId,
    orderId,
    type: "earn",
    points: pointsToAdd,
    balanceBefore: before,
    balanceAfter: after,
    description: `Earned from order #${orderId}`
  });
  return pointsToAdd;
}
async function redeemLoyaltyPoints(customerId, tenantId, pointsToRedeem) {
  const config = await getLoyaltyConfig(tenantId);
  const [customer] = await db.select({ loyaltyPoints: customers.loyaltyPoints }).from(customers).where((0, import_drizzle_orm3.eq)(customers.id, customerId)).limit(1);
  const available = customer?.loyaltyPoints ?? 0;
  if (pointsToRedeem > available)
    return { success: false, discountAmount: 0, error: "Insufficient loyalty points" };
  const discountAmount = Math.round(pointsToRedeem * config.redemptionRate * 100) / 100;
  const after = available - pointsToRedeem;
  const newTier = calculateLoyaltyTier(after);
  await db.update(customers).set({ loyaltyPoints: after, loyaltyTier: newTier }).where((0, import_drizzle_orm3.eq)(customers.id, customerId));
  await db.insert(loyaltyTransactions).values({
    customerId,
    tenantId,
    type: "redeem",
    points: -pointsToRedeem,
    balanceBefore: available,
    balanceAfter: after,
    description: `Redeemed ${pointsToRedeem} points for ${discountAmount} discount`
  });
  return { success: true, discountAmount };
}
async function assignDriverToOrder(orderId, vehicleId) {
  await db.update(onlineOrders).set({ driverId: vehicleId }).where((0, import_drizzle_orm3.eq)(onlineOrders.id, orderId));
  await db.update(vehicles).set({ driverStatus: "on_delivery", activeOrderId: orderId }).where((0, import_drizzle_orm3.eq)(vehicles.id, vehicleId));
}
async function releaseDriver(vehicleId) {
  await db.update(vehicles).set({ driverStatus: "available", activeOrderId: null }).where((0, import_drizzle_orm3.eq)(vehicles.id, vehicleId));
}
async function deductWallet(customerId, tenantId, amount, orderId) {
  const [customer] = await db.select({ walletBalance: customers.walletBalance }).from(customers).where((0, import_drizzle_orm3.eq)(customers.id, customerId)).limit(1);
  const balance = parseFloat(customer?.walletBalance ?? "0");
  if (amount > balance)
    return { success: false, error: "Insufficient wallet balance" };
  const after = Math.round((balance - amount) * 100) / 100;
  await db.update(customers).set({ walletBalance: after.toFixed(2) }).where((0, import_drizzle_orm3.eq)(customers.id, customerId));
  await db.insert(walletTransactions).values({
    customerId,
    tenantId,
    orderId: orderId ?? null,
    type: "payment",
    amount: amount.toFixed(2),
    balanceBefore: balance.toFixed(2),
    balanceAfter: after.toFixed(2),
    description: orderId ? `Payment for order #${orderId}` : "Wallet payment"
  });
  return { success: true };
}

// server/routes.ts
var bcrypt4 = __toESM(require("bcrypt"));
var crypto4 = __toESM(require("crypto"));
var import_date_fns3 = require("date-fns");
var import_google_auth_library = require("google-auth-library");
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
var googleClient = new import_google_auth_library.OAuth2Client("852311970344-8q8a01gm3jip4k9vooljk8ttjpd30802.apps.googleusercontent.com");
async function registerRoutes(app2) {
  app2.get("/api/store/:slug", async (req, res) => {
    try {
      const { slug } = req.params;
      const config = await storage.getLandingPageConfigBySlug(slug);
      if (!config) {
        return res.status(404).send("<h1>Store not found</h1>");
      }
      const tenant = await storage.getTenant(config.tenantId);
      if (!tenant) {
        return res.status(404).send("<h1>Store not found</h1>");
      }
      const storePath = import_node_path.default.resolve(process.cwd(), "server", "templates", "restaurant-store.html");
      let html = import_node_fs.default.readFileSync(storePath, "utf-8");
      html = html.replace(/\{\{SLUG\}\}/g, slug);
      html = html.replace(/\{\{TENANT_ID\}\}/g, String(config.tenantId));
      html = html.replace(/\{\{PRIMARY_COLOR\}\}/g, config.primaryColor || "#2FD3C6");
      html = html.replace(/\{\{ACCENT_COLOR\}\}/g, config.accentColor || "#6366F1");
      html = html.replace(/\{\{CURRENCY\}\}/g, tenant.currency || "CHF");
      html = html.replace(/\{\{LANGUAGE\}\}/g, config.language || "en");
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(200).send(html);
    } catch (err) {
      console.error("[store/:slug] Error:", err);
      return res.status(500).send("<h1>Server error</h1>");
    }
  });
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
      const { eq: eq7 } = await import("drizzle-orm");
      const [tenant] = await db2.select().from(tenants2).where(eq7(tenants2.ownerEmail, "admin@pizzalemon.ch"));
      if (!tenant) return res.json({ found: false, message: "Pizza Lemon not found in this database." });
      const licenses = await db2.select().from(licenseKeys2).where(eq7(licenseKeys2.tenantId, tenant.id));
      res.json({ found: true, tenantId: tenant.id, status: tenant.status, licenses: licenses.map((l) => ({ key: l.licenseKey, status: l.status })) });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/health", async (_req, res) => {
    try {
      const { pool: pool2 } = await Promise.resolve().then(() => (init_db(), db_exports));
      await pool2.query("SELECT 1");
      res.json({
        ok: true,
        status: "healthy",
        database: "mysql",
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    } catch (e) {
      res.status(500).json({
        ok: false,
        status: "unhealthy",
        database: "mysql",
        error: e.message
      });
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
      const passwordHash = await bcrypt4.hash(tempPassword, 10);
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
        endDate = (0, import_date_fns3.addYears)(startDate, 1);
      } else {
        endDate = (0, import_date_fns3.addMonths)(startDate, 1);
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
        () => crypto4.randomBytes(2).toString("hex").toUpperCase()
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
      const passwordHash = await bcrypt4.hash(tempPassword, 10);
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
      const endDate = isYearly ? (0, import_date_fns3.addYears)(startDate, 1) : (0, import_date_fns3.addMonths)(startDate, 1);
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
      const randomSegments = Array.from({ length: 4 }, () => crypto4.randomBytes(2).toString("hex").toUpperCase());
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
        const tempPassword = "GAuth-" + crypto4.randomBytes(4).toString("hex");
        const passwordHash = await bcrypt4.hash(tempPassword, 10);
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
        const endDate = (0, import_date_fns3.addDays)(startDate, 14);
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
          () => crypto4.randomBytes(2).toString("hex").toUpperCase()
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
        const { eq: eq7 } = await import("drizzle-orm");
        await db2.update(landingConfig).set({
          heroTitle: businessName,
          phone: ownerPhone,
          socialWhatsapp: ownerPhone
        }).where(eq7(landingConfig.tenantId, tenantId));
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
          const passwordValid = await bcrypt4.compare(password, tenant.passwordHash);
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
      const applyMarkup = req.query.applyMarkup === "true";
      if (!tenantId) return res.status(400).json({ error: "tenantId is required" });
      let products2 = await storage.getProductsByTenant(tenantId, search);
      if (applyMarkup) {
        const commissionRate = await storage.getCommissionRate();
        if (commissionRate > 0) {
          const factor = 1 + commissionRate / 100;
          products2 = products2.map((p) => {
            const rawPrice = parseFloat(p.price) * factor;
            const rounded = Math.round(rawPrice * 2) / 2;
            return { ...p, price: rounded.toFixed(2) };
          });
        }
      }
      res.json(products2);
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
        Quadrat: c.quadrat || "",
        LegacyRef: c.legacyRef || "",
        LegacyTotalSpent: c.legacyTotalSpent || "0",
        R1: c.r1 || "",
        R3: c.r3 || "",
        R4: c.r4 || "",
        R5: c.r5 || "",
        R8: c.r8 || "",
        R9: c.r9 || "",
        R10: c.r10 || "",
        R14: c.r14 || "",
        R15: c.r15 || "",
        R16: c.r16 ? "TRUE" : "FALSE",
        R17: c.r17 ? "TRUE" : "FALSE",
        R18: c.r18 ? "TRUE" : "FALSE",
        R19: c.r19 ? "TRUE" : "FALSE",
        R20: c.r20 ? "TRUE" : "FALSE",
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
  app2.post("/api/customers/import-csv", async (req, res) => {
    try {
      const tenantId = req.body.tenantId ? Number(req.body.tenantId) : void 0;
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
      let batch = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].replace(/\r$/, "").trim();
        if (!line) {
          skipped++;
          continue;
        }
        const values = [];
        let current = "";
        let inQuotes = false;
        for (let j = 0; j < line.length; j++) {
          const ch = line[j];
          if (ch === '"') {
            inQuotes = !inQuotes;
            continue;
          }
          if (ch === "," && !inQuotes) {
            values.push(current.trim());
            current = "";
            continue;
          }
          current += ch;
        }
        values.push(current.trim());
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
        const r6 = values[20] || "";
        const r7 = values[21] || "";
        const r10 = values[24] || "";
        const r11 = values[25] || "";
        const r12 = values[26] || "";
        const _source = values[values.length - 1] || "";
        const fullName = [namen, vorname].filter((s) => s && s.trim()).join(", ").trim() || tel1 || "Unknown";
        const addressParts = [strasse, strassNr, hausNr].filter((s) => s && s.trim()).join(" ").trim();
        const cityParts = [plz, ort].filter((s) => s && s.trim()).join(" ").trim();
        const address = [addressParts, cityParts].filter((s) => s).join(", ");
        const noteParts = [];
        if (screenInfo) noteParts.push(screenInfo);
        if (howToGo) noteParts.push(`Directions: ${howToGo}`);
        if (quadrat) noteParts.push(`Quadrat: ${quadrat}`);
        const notes = noteParts.join(" | ") || void 0;
        const customerData = {
          tenantId,
          name: fullName,
          phone: tel1 || void 0,
          address: address || void 0,
          notes,
          isActive: true,
          customerNr: nr ? parseInt(nr) || void 0 : void 0,
          salutation: anrede || void 0,
          firstName: vorname || void 0,
          lastName: namen || void 0,
          street: strasse || void 0,
          streetNr: strassNr || void 0,
          houseNr: hausNr || void 0,
          city: ort || void 0,
          postalCode: plz || void 0,
          company: firma || void 0,
          zhd: zhd || void 0,
          howToGo: howToGo || void 0,
          screenInfo: screenInfo || void 0,
          source: _source || void 0,
          firstOrderDate: r6 || void 0,
          lastOrderDate: r7 || void 0,
          legacyTotalSpent: r10 ? String(parseFloat(r10) || 0) : "0",
          averageOrderValue: r11 ? String(parseFloat(r11) || 0) : "0",
          orderCount: r12 ? parseInt(r12) || 0 : 0,
          legacyRef: r1 || void 0,
          totalSpent: r10 ? String(parseFloat(r10) || 0) : "0",
          visitCount: r12 ? parseInt(r12) || 0 : 0
        };
        batch.push(customerData);
        if (batch.length >= batchSize) {
          const results = await storage.bulkCreateCustomers(batch);
          imported += results.length;
          batch = [];
        }
      }
      if (batch.length > 0) {
        const results = await storage.bulkCreateCustomers(batch);
        imported += results.length;
      }
      res.json({ success: true, imported, skipped, total: lines.length - 1 });
    } catch (e) {
      console.error("[CSV Import Error]", e);
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
      const limit = req.query.limit ? Number(req.query.limit) : 500;
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
      const swissDateRcp = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Zurich", year: "numeric", month: "2-digit", day: "2-digit" }).format(/* @__PURE__ */ new Date()).replace(/-/g, "");
      const dailySeqRcp = await storage.getNextSequenceNumber(`branch-${saleData.branchId || 0}`);
      const receiptNumber = `${saleData.branchId || 0}-${swissDateRcp}-${dailySeqRcp}`;
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
  app2.put("/api/sales/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { items, ...saleData } = req.body;
      const sale = await storage.updateSale(id, sanitizeDates(saleData));
      if (items !== void 0) {
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
            notes: item.notes || null
          });
        }
      }
      res.json(sale);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.delete("/api/sales/:id", async (req, res) => {
    try {
      await storage.deleteSale(Number(req.params.id));
      res.json({ success: true });
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
  app2.get("/api/reports/daily-sales-report", async (req, res) => {
    try {
      const date = req.query.date || (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const startOfDay = /* @__PURE__ */ new Date(date + "T00:00:00.000Z");
      const endOfDay = /* @__PURE__ */ new Date(date + "T23:59:59.999Z");
      const salesData = await storage.getSalesWithCustomerByDateRange(startOfDay, endOfDay);
      res.json(salesData);
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
    const uploadsDir = import_node_path.default.resolve(process.cwd(), "uploads");
    const filename = req.path.replace(/^\/objects\//, "");
    const localPath = import_node_path.default.join(uploadsDir, filename);
    if (import_node_fs.default.existsSync(localPath)) {
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
      const uploadsDir = import_node_path.default.resolve(process.cwd(), "uploads");
      if (!import_node_fs.default.existsSync(uploadsDir)) import_node_fs.default.mkdirSync(uploadsDir, { recursive: true });
      const ext = (contentType.split("/")[1] || "jpg").split(";")[0];
      const filename = `${(0, import_node_crypto.randomUUID)()}.${ext}`;
      const filePath = import_node_path.default.join(uploadsDir, filename);
      const buffer = Buffer.from(imageData, "base64");
      import_node_fs.default.writeFileSync(filePath, buffer);
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
      res.json({
        ...mainBranch,
        storeType: tenant?.storeType || "supermarket",
        commissionRate: 0,
        // commission is baked into product prices via applyMarkup
        whatsappAdminPhone: tenant?.metadata?.whatsappAdminPhone || ""
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
      const { whatsappAdminPhone, ...cleanBranchData } = branchData;
      const updatedBranch = await storage.updateBranch(mainBranch.id, cleanBranchData);
      if (mainBranch.tenantId) {
        const tenantUpdates = {};
        if (storeType) tenantUpdates.storeType = storeType;
        if (whatsappAdminPhone !== void 0) {
          const existingTenant = await storage.getTenant(mainBranch.tenantId);
          tenantUpdates.metadata = { ...existingTenant?.metadata || {}, whatsappAdminPhone: whatsappAdminPhone.replace(/\D/g, "") };
        }
        if (Object.keys(tenantUpdates).length > 0) {
          await storage.updateTenant(mainBranch.tenantId, tenantUpdates);
        }
      }
      res.json({ ...updatedBranch, storeType, whatsappAdminPhone: whatsappAdminPhone?.replace(/\D/g, "") || "" });
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
    const rawTenantId = req.tenantId ?? req.body?.tenantId;
    const tenantId = Number(rawTenantId);
    if (!Number.isFinite(tenantId) || tenantId <= 0) {
      return res.status(401).json({ error: "Tenant identification required" });
    }
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
          const rounded = Math.round(rawPrice * 2) / 2;
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
      const swissDateOnl = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Zurich", year: "numeric", month: "2-digit", day: "2-digit" }).format(/* @__PURE__ */ new Date()).replace(/-/g, "");
      const dailySeqOnl = await storage.getNextSequenceNumber(`tenant-${resolvedTenantId}`);
      const orderNumber = `${resolvedTenantId}-${swissDateOnl}-${dailySeqOnl}`;
      const order = await storage.createOnlineOrder({
        ...orderData,
        tenantId: resolvedTenantId,
        orderNumber,
        paymentStatus: orderData.paymentMethod === "cash" ? "pending" : "pending",
        status: "pending"
      });
      try {
        const { customerName, customerPhone, customerEmail, customerAddress } = orderData;
        if (customerName) {
          let existing = [];
          if (customerPhone) {
            existing = await storage.findCustomerByPhone(customerPhone, resolvedTenantId);
          }
          if (existing.length === 0) {
            await storage.createCustomer({
              tenantId: resolvedTenantId,
              name: customerName,
              phone: customerPhone || null,
              email: customerEmail || null,
              address: customerAddress || null
            });
          }
        }
      } catch (autoErr) {
        console.error("[AutoCustomer] Failed to auto-save customer from online order:", autoErr);
      }
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
      }, resolvedTenantId);
      pushService.notifyNewOrder(orderNumber, orderData.totalAmount || "0").catch(() => {
      });
      try {
        const tenant = await storage.getTenant(resolvedTenantId);
        const storeName = tenant?.businessName || "Online Store";
        const storeAdminPhone = tenant?.metadata?.whatsappAdminPhone;
        const globalAdminPhone = await storage.getPlatformSetting("whatsapp_admin_phone");
        const adminPhone = storeAdminPhone || globalAdminPhone || void 0;
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
        }, storeName, adminPhone);
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
  app2.get("/api/super-admin/whatsapp/session-info", requireSuperAdmin, async (_req, res) => {
    try {
      const pathMod = await import("path");
      const fsMod = await import("fs");
      const tokenDir = pathMod.resolve(process.cwd(), ".wppconnect", "tokens");
      let hasSession = false;
      let sessionModified = null;
      if (fsMod.existsSync(tokenDir)) {
        const files = fsMod.readdirSync(tokenDir).filter((f) => f.endsWith(".data.json") || f.endsWith(".json"));
        if (files.length > 0) {
          hasSession = true;
          const stat = fsMod.statSync(pathMod.join(tokenDir, files[0]));
          sessionModified = stat.mtime.toISOString();
        }
      }
      res.json({ hasSession, sessionModified });
    } catch (e) {
      res.json({ hasSession: false, sessionModified: null, error: e.message });
    }
  });
  app2.post("/api/super-admin/whatsapp/test", requireSuperAdmin, async (req, res) => {
    const globalPhone = await storage.getPlatformSetting("whatsapp_admin_phone");
    const targetPhone = (req.body?.phone || globalPhone || "").replace(/\D/g, "");
    if (!targetPhone) return res.status(400).json({ error: "No phone number specified and no global admin phone configured" });
    const sent = await whatsappService.sendText(
      targetPhone,
      "\u{1F9EA} *Test Message*\n\nThis is a test from Barmagly POS WhatsApp integration.\n\n\u2705 If you receive this, the connection is working!"
    );
    res.json({ success: sent, phone: targetPhone });
  });
  app2.get("/api/super-admin/whatsapp/admin-phone", requireSuperAdmin, async (_req, res) => {
    try {
      const phone = await storage.getPlatformSetting("whatsapp_admin_phone");
      res.json({ phone: phone || "" });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.put("/api/super-admin/whatsapp/admin-phone", requireSuperAdmin, async (req, res) => {
    try {
      const { phone } = req.body;
      if (phone === void 0) return res.status(400).json({ error: "phone required" });
      await storage.setPlatformSetting("whatsapp_admin_phone", phone.replace(/\D/g, ""));
      res.json({ success: true, phone: phone.replace(/\D/g, "") });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/super-admin/whatsapp/store-phone/:tenantId", requireSuperAdmin, async (req, res) => {
    try {
      const tenant = await storage.getTenant(Number(req.params.tenantId));
      if (!tenant) return res.status(404).json({ error: "Tenant not found" });
      const phone = tenant.metadata?.whatsappAdminPhone || "";
      res.json({ phone });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.put("/api/super-admin/whatsapp/store-phone/:tenantId", requireSuperAdmin, async (req, res) => {
    try {
      const tenant = await storage.getTenant(Number(req.params.tenantId));
      if (!tenant) return res.status(404).json({ error: "Tenant not found" });
      const phone = (req.body?.phone || "").replace(/\D/g, "");
      const metadata = { ...tenant.metadata || {}, whatsappAdminPhone: phone };
      await storage.updateTenant(Number(req.params.tenantId), { metadata });
      res.json({ success: true, phone });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
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
      const templatePath = import_node_path.default.resolve(process.cwd(), "server", "templates", "restaurant-store.html");
      let html = import_node_fs.default.readFileSync(templatePath, "utf8");
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
  const TENANT_BACKUP_DIR = import_node_path.default.resolve(process.cwd(), "backups");
  if (!import_node_fs.default.existsSync(TENANT_BACKUP_DIR)) import_node_fs.default.mkdirSync(TENANT_BACKUP_DIR, { recursive: true });
  app2.get("/api/backup/list", async (req, res) => {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) return res.status(401).json({ error: "Not authorized" });
      const files = import_node_fs.default.readdirSync(TENANT_BACKUP_DIR).filter((f) => f.startsWith(`backup_tenant_${tenantId}_`) && f.endsWith(".json")).map((f) => {
        const stat = import_node_fs.default.statSync(import_node_path.default.join(TENANT_BACKUP_DIR, f));
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
      const filepath = import_node_path.default.join(TENANT_BACKUP_DIR, filename);
      import_node_fs.default.writeFileSync(filepath, JSON.stringify(snapshot));
      const stat = import_node_fs.default.statSync(filepath);
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
      const filename = import_node_path.default.basename(req.params.filename);
      if (!filename.startsWith(`backup_tenant_${tenantId}_`)) {
        return res.status(403).json({ error: "Not authorized to restore this backup" });
      }
      const filepath = import_node_path.default.join(TENANT_BACKUP_DIR, filename);
      if (!import_node_fs.default.existsSync(filepath)) return res.status(404).json({ error: "Backup not found" });
      const snapshot = JSON.parse(import_node_fs.default.readFileSync(filepath, "utf-8"));
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
      const filename = import_node_path.default.basename(req.params.filename);
      if (!filename.startsWith(`backup_tenant_${tenantId}_`)) {
        return res.status(403).json({ error: "Not authorized" });
      }
      const filepath = import_node_path.default.join(TENANT_BACKUP_DIR, filename);
      if (import_node_fs.default.existsSync(filepath)) import_node_fs.default.unlinkSync(filepath);
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
  app2.post("/api/maintenance/fix-tenant-ids", async (req, res) => {
    const secret = req.headers["x-maintenance-secret"] || req.query.secret;
    if (secret !== "fix-tenant-2024-barmagly") {
      return res.status(403).json({ error: "Forbidden" });
    }
    try {
      const { db: db2 } = await Promise.resolve().then(() => (init_db(), db_exports));
      const { sql: sql5 } = await import("drizzle-orm");
      const firstTenant = (await storage.getTenants())[0];
      if (!firstTenant) {
        return res.status(404).json({ error: "No tenants found" });
      }
      const tid = firstTenant.id;
      const tables2 = [
        "products",
        "categories",
        "employees",
        "customers",
        "branches",
        "inventory",
        "sales",
        "sale_items",
        "expenses",
        "shifts",
        "notifications",
        "calls",
        "purchase_orders",
        "purchase_order_items",
        "suppliers",
        "tables",
        "kitchen_orders",
        "returns",
        "return_items",
        "cash_drawer_operations",
        "warehouses",
        "warehouse_transfers",
        "product_batches",
        "inventory_movements",
        "stock_counts",
        "stock_count_items",
        "employee_commissions",
        "daily_closings",
        "monthly_closings"
      ];
      const results = {};
      for (const table of tables2) {
        try {
          const r = await db2.execute(
            sql5.raw(`UPDATE \`${table}\` SET tenant_id = ${tid} WHERE tenant_id IS NULL`)
          );
          results[table] = r[0]?.affectedRows ?? 0;
        } catch (e) {
          results[table] = -1;
        }
      }
      res.json({
        success: true,
        tenant: { id: tid, name: firstTenant.businessName },
        updates: results
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/delivery/auth/request-otp", async (req, res) => {
    try {
      const { phone, tenantId } = req.body;
      if (!phone || !tenantId) return res.status(400).json({ error: "phone and tenantId required" });
      const otp = await createOtp(phone, Number(tenantId));
      if (process.env.NODE_ENV === "development") {
        return res.json({ success: true, otp });
      }
      await whatsappService.sendMessage(phone, `Your verification code is: *${otp}*
Valid for 10 minutes.`);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/delivery/auth/verify-otp", async (req, res) => {
    try {
      const { phone, tenantId, otp } = req.body;
      if (!phone || !tenantId || !otp) return res.status(400).json({ error: "phone, tenantId, otp required" });
      const result = await verifyOtp(phone, Number(tenantId), otp);
      if (!result.success) return res.status(400).json({ error: result.error });
      const customer = await findOrCreateCustomerByPhone(phone, Number(tenantId));
      const token = await createCustomerSession(customer.id, Number(tenantId), req.headers["user-agent"]);
      res.json({ success: true, token, customer: { id: customer.id, name: customer.name, phone: customer.phone, loyaltyPoints: customer.loyaltyPoints, loyaltyTier: customer.loyaltyTier, walletBalance: customer.walletBalance } });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/delivery/auth/login", async (req, res) => {
    try {
      const { email, password, tenantId } = req.body;
      if (!email || !password || !tenantId) return res.status(400).json({ error: "email, password, tenantId required" });
      const customer = await findCustomerByEmail(email, Number(tenantId));
      if (!customer) return res.status(401).json({ error: "Invalid credentials" });
      const valid = await verifyCustomerPassword(customer, password);
      if (!valid) return res.status(401).json({ error: "Invalid credentials" });
      const token = await createCustomerSession(customer.id, Number(tenantId), req.headers["user-agent"]);
      res.json({ success: true, token, customer: { id: customer.id, name: customer.name, email: customer.email, loyaltyPoints: customer.loyaltyPoints, loyaltyTier: customer.loyaltyTier, walletBalance: customer.walletBalance } });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/delivery/auth/register", async (req, res) => {
    try {
      const { name, email, phone, password, tenantId, referralCode } = req.body;
      if (!phone || !tenantId) return res.status(400).json({ error: "phone and tenantId required" });
      const customer = await findOrCreateCustomerByPhone(phone, Number(tenantId));
      const updates = { name: name || customer.name, hasAccount: true };
      if (email) updates.email = email;
      if (password) {
        await setCustomerPassword(customer.id, password);
      }
      await storage.updateCustomer(customer.id, updates);
      const token = await createCustomerSession(customer.id, Number(tenantId), req.headers["user-agent"]);
      res.json({ success: true, token, customer: { id: customer.id, name: updates.name, phone } });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/delivery/auth/logout", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith("Bearer ")) {
        await deleteCustomerSession(authHeader.split(" ")[1]);
      }
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/delivery/auth/me", async (req, res) => {
    try {
      const customer = await getAuthenticatedCustomer(req.headers.authorization);
      if (!customer) return res.status(401).json({ error: "Not authenticated" });
      res.json({ customer });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.put("/api/delivery/auth/me", async (req, res) => {
    try {
      const customer = await getAuthenticatedCustomer(req.headers.authorization);
      if (!customer) return res.status(401).json({ error: "Not authenticated" });
      const { name, email, dateOfBirth, gender, preferredLanguage } = req.body;
      const updates = {};
      if (name) updates.name = name;
      if (email) updates.email = email;
      if (dateOfBirth) updates.dateOfBirth = dateOfBirth;
      if (gender) updates.gender = gender;
      if (preferredLanguage) updates.preferredLanguage = preferredLanguage;
      await storage.updateCustomer(customer.id, updates);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/delivery/addresses", async (req, res) => {
    try {
      const customer = await getAuthenticatedCustomer(req.headers.authorization);
      if (!customer) return res.status(401).json({ error: "Not authenticated" });
      const addresses = await storage.getCustomerAddresses(customer.id);
      res.json(addresses);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/delivery/addresses", async (req, res) => {
    try {
      const customer = await getAuthenticatedCustomer(req.headers.authorization);
      if (!customer) return res.status(401).json({ error: "Not authenticated" });
      const address = await storage.createCustomerAddress({ ...req.body, customerId: customer.id, tenantId: customer.tenantId });
      res.status(201).json(address);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.put("/api/delivery/addresses/:id", async (req, res) => {
    try {
      const customer = await getAuthenticatedCustomer(req.headers.authorization);
      if (!customer) return res.status(401).json({ error: "Not authenticated" });
      const address = await storage.updateCustomerAddress(Number(req.params.id), req.body);
      res.json(address);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.delete("/api/delivery/addresses/:id", async (req, res) => {
    try {
      const customer = await getAuthenticatedCustomer(req.headers.authorization);
      if (!customer) return res.status(401).json({ error: "Not authenticated" });
      await storage.deleteCustomerAddress(Number(req.params.id));
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.put("/api/delivery/addresses/:id/default", async (req, res) => {
    try {
      const customer = await getAuthenticatedCustomer(req.headers.authorization);
      if (!customer) return res.status(401).json({ error: "Not authenticated" });
      await storage.setDefaultAddress(Number(req.params.id), customer.id);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/delivery/restaurants", async (req, res) => {
    try {
      const tenantId = req.query.tenantId;
      const configs = await storage.getAllLandingPageConfigs(tenantId);
      const restaurants = (configs || []).map((c) => ({
        id: c.tenantId,
        slug: c.slug,
        name: c.storeName || c.restaurantName || "Restaurant",
        logo: c.logo || c.logomark || null,
        coverImage: c.coverImage || c.headerBgImage || null,
        cuisine: c.cuisineType || c.cuisine || "",
        rating: c.rating || 4.5,
        reviewCount: c.reviewCount || 0,
        deliveryTime: c.minDeliveryTime || 25,
        deliveryFee: c.deliveryFee || 0,
        minOrder: c.minOrderAmount || 0,
        isOpen: c.isOpen !== false,
        primaryColor: c.primaryColor || "#FF5722"
      }));
      res.json(restaurants);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/delivery/store/:slug", async (req, res) => {
    try {
      const config = await storage.getLandingPageConfigBySlug(req.params.slug);
      if (!config) return res.status(404).json({ error: "Store not found" });
      const tenant = await storage.getTenant(config.tenantId).catch(() => null);
      const currency = config.currency || tenant?.currency || process.env.DEFAULT_CURRENCY || "EGP";
      res.json({
        slug: config.slug,
        tenantId: config.tenantId,
        storeName: config.storeName || config.heroTitle || tenant?.businessName || "Store",
        name: config.storeName || config.heroTitle || tenant?.businessName || "Store",
        primaryColor: config.primaryColor || "#FF5722",
        accentColor: config.accentColor || "#2FD3C6",
        currency,
        phone: config.phone,
        address: config.address,
        openingHours: config.openingHours,
        minOrderAmount: config.minOrderAmount,
        deliveryFee: config.deliveryFee || 0,
        estimatedDeliveryTime: config.estimatedDeliveryTime,
        enableDelivery: config.enableDelivery !== false,
        enablePickup: config.enablePickup !== false,
        enableLoyalty: config.enableLoyalty ?? true,
        enableWallet: config.enableWallet ?? false,
        enableScheduledOrders: config.enableScheduledOrders ?? true,
        enablePromos: config.enablePromos ?? true,
        minDeliveryTime: config.minDeliveryTime ?? 20,
        maxDeliveryTime: config.maxDeliveryTime ?? 45,
        bannerImages: config.bannerImages ?? [],
        promoText: config.promoText,
        logo: config.heroImage || config.logo,
        coverImage: config.coverImage || config.headerBgImage,
        socialWhatsapp: config.socialWhatsapp,
        supportPhone: config.supportPhone || config.phone || "",
        rating: config.rating || 4.5,
        reviewCount: config.reviewCount || 0,
        cuisine: config.cuisineType || config.cuisine || ""
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/delivery/store/:slug/menu", async (req, res) => {
    try {
      const config = await storage.getLandingPageConfigBySlug(req.params.slug);
      if (!config) return res.status(404).json({ error: "Store not found" });
      const [cats, prods] = await Promise.all([
        storage.getCategories(config.tenantId),
        storage.getProductsByTenant(config.tenantId)
      ]);
      const activeProds = prods.filter((p) => p.isActive !== false);
      const menu = cats.filter((c) => c.isActive !== false).map((cat) => ({
        ...cat,
        items: activeProds.filter((p) => p.categoryId === cat.id)
      })).filter((cat) => cat.items.length > 0);
      res.json({ categories: menu, allProducts: activeProds });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/delivery/store/:slug/product/:id", async (req, res) => {
    try {
      const config = await storage.getLandingPageConfigBySlug(req.params.slug);
      if (!config) return res.status(404).json({ error: "Store not found" });
      const product = await storage.getProduct(Number(req.params.id));
      if (!product || product.tenantId !== config.tenantId) return res.status(404).json({ error: "Product not found" });
      res.json(product);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/delivery/store/:slug/promos", async (req, res) => {
    try {
      const config = await storage.getLandingPageConfigBySlug(req.params.slug);
      if (!config) return res.status(404).json({ error: "Store not found" });
      const now = /* @__PURE__ */ new Date();
      const codes = await storage.getPromoCodes ? await storage.getPromoCodes(config.tenantId) : [];
      const active = codes.filter((c) => c.isActive && (!c.validFrom || new Date(c.validFrom) <= now) && (!c.validUntil || new Date(c.validUntil) >= now));
      res.json({ promos: active, bannerImages: config.bannerImages ?? [], promoText: config.promoText });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/delivery/promo/validate", async (req, res) => {
    try {
      const { tenantId, code, orderTotal, orderType, customerId } = req.body;
      if (!tenantId || !code || orderTotal === void 0) return res.status(400).json({ error: "tenantId, code, orderTotal required" });
      const result = await validatePromoCode(Number(tenantId), code, Number(orderTotal), orderType || "delivery", customerId ? Number(customerId) : void 0);
      res.json(result);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/delivery/zones", async (req, res) => {
    try {
      const { tenantId } = req.query;
      if (!tenantId) return res.status(400).json({ error: "tenantId required" });
      const zones = await storage.getDeliveryZones(Number(tenantId));
      res.json(zones);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/delivery/orders", async (req, res) => {
    try {
      const {
        tenantId,
        customerName,
        customerPhone,
        customerEmail,
        customerAddress,
        items,
        subtotal,
        deliveryFee,
        totalAmount,
        paymentMethod,
        orderType,
        notes,
        promoCode,
        promoCodeId,
        discountAmount,
        customerLat,
        customerLng,
        floor,
        buildingName,
        addressNotes,
        scheduledAt,
        loyaltyPointsUsed,
        walletAmountUsed,
        savedAddressId
      } = req.body;
      if (!tenantId || !customerPhone || !items?.length) {
        return res.status(400).json({ error: "tenantId, customerPhone, items required" });
      }
      const trackingToken = generateTrackingToken();
      const orderNumber = `DEL-${Date.now()}`;
      let finalDiscount = Number(discountAmount ?? 0);
      let resolvedPromoId = promoCodeId ? Number(promoCodeId) : null;
      if (promoCode && !promoCodeId) {
        const promoResult = await validatePromoCode(Number(tenantId), promoCode, Number(subtotal), orderType || "delivery");
        if (promoResult.valid && promoResult.promoCode) {
          finalDiscount = promoResult.discountAmount ?? 0;
          resolvedPromoId = promoResult.promoCode.id;
        }
      }
      const customer = await getAuthenticatedCustomer(req.headers.authorization);
      let walletUsed = Number(walletAmountUsed ?? 0);
      if (walletUsed > 0 && customer) {
        const walletResult = await deductWallet(customer.id, Number(tenantId), walletUsed);
        if (!walletResult.success) {
          return res.status(400).json({ error: walletResult.error });
        }
      }
      const order = await storage.createOnlineOrder({
        tenantId: Number(tenantId),
        orderNumber,
        customerName: customerName || customerPhone,
        customerPhone,
        customerEmail: customerEmail ?? null,
        customerAddress: customerAddress ?? null,
        items: items || [],
        subtotal: Number(subtotal).toFixed(2),
        taxAmount: "0",
        deliveryFee: Number(deliveryFee ?? 0).toFixed(2),
        totalAmount: Number(totalAmount).toFixed(2),
        paymentMethod: paymentMethod || "cash",
        paymentStatus: "pending",
        status: "pending",
        orderType: orderType || "delivery",
        notes: notes ?? null,
        estimatedTime: 35,
        language: req.body.language || "en",
        trackingToken,
        sourceChannel: "web",
        promoCodeId: resolvedPromoId ?? void 0,
        discountAmount: finalDiscount.toFixed(2),
        customerLat: customerLat ? String(customerLat) : null,
        customerLng: customerLng ? String(customerLng) : null,
        floor: floor ?? null,
        buildingName: buildingName ?? null,
        addressNotes: addressNotes ?? null,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        walletAmountUsed: walletUsed.toFixed(2),
        loyaltyPointsUsed: Number(loyaltyPointsUsed ?? 0),
        savedAddressId: savedAddressId ? Number(savedAddressId) : null
      });
      if (resolvedPromoId && finalDiscount > 0) {
        await recordPromoUsage(resolvedPromoId, customer?.id, order.id, finalDiscount);
      }
      try {
        const config = await storage.getLandingPageConfigByTenantId(Number(tenantId));
        if (config?.socialWhatsapp) {
          await whatsappService.sendMessage(
            config.socialWhatsapp,
            `\u{1F6CE} New delivery order #${orderNumber}
Customer: ${customerName || customerPhone}
Total: ${totalAmount}
Address: ${customerAddress || "Pickup"}`
          );
        }
      } catch (_) {
      }
      try {
        callerIdService.broadcastToTenant(Number(tenantId), {
          type: "new_online_order",
          order: { id: order.id, orderNumber, customerName, totalAmount, orderType }
        });
      } catch (_) {
      }
      res.status(201).json({ success: true, orderId: order.id, orderNumber, trackingToken });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/delivery/orders/track/:token", async (req, res) => {
    try {
      const order = await storage.getOnlineOrderByTrackingToken(req.params.token);
      if (!order) return res.status(404).json({ error: "Order not found" });
      let driver = null;
      if (order.driverId) {
        driver = await storage.getDriverLocation(order.driverId);
      }
      let store = null;
      try {
        if (order.tenantId) {
          const cfg = await storage.getLandingPageConfigByTenantId(Number(order.tenantId));
          if (cfg) {
            store = {
              name: cfg.storeName || cfg.name,
              primaryColor: cfg.primaryColor || "#FF5722",
              currency: cfg.currency || process.env.DEFAULT_CURRENCY || "EGP",
              logo: cfg.logo,
              supportPhone: cfg.supportPhone,
              slug: cfg.slug
            };
          }
        }
      } catch (_) {
      }
      res.json({ order, driver, store });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/delivery/orders/history", async (req, res) => {
    try {
      const customer = await getAuthenticatedCustomer(req.headers.authorization);
      if (!customer) return res.status(401).json({ error: "Not authenticated" });
      const orders = await storage.getCustomerOrderHistory(customer.id, customer.tenantId);
      res.json(orders);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/delivery/orders/:id/rate", async (req, res) => {
    try {
      const customer = await getAuthenticatedCustomer(req.headers.authorization);
      const { overallRating, foodRating, deliveryRating, comment } = req.body;
      if (!overallRating) return res.status(400).json({ error: "overallRating required" });
      const orderId = Number(req.params.id);
      const order = await storage.getOnlineOrder(orderId);
      if (!order) return res.status(404).json({ error: "Order not found" });
      const rating = await storage.createOrderRating({
        orderId,
        customerId: customer?.id ?? null,
        driverId: order.driverId ?? null,
        overallRating: Number(overallRating),
        foodRating: foodRating ? Number(foodRating) : null,
        deliveryRating: deliveryRating ? Number(deliveryRating) : null,
        comment: comment ?? null
      });
      res.json(rating);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/delivery/driver/auth", async (req, res) => {
    try {
      const { accessToken } = req.body;
      if (!accessToken) return res.status(400).json({ error: "accessToken required" });
      const driver = await storage.getVehicleByAccessToken(accessToken);
      if (!driver) return res.status(401).json({ error: "Invalid driver token" });
      res.json({ driver: { id: driver.id, driverName: driver.driverName, driverPhone: driver.driverPhone, driverStatus: driver.driverStatus } });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/delivery/driver/orders", async (req, res) => {
    try {
      const { token } = req.query;
      if (!token) return res.status(401).json({ error: "Driver token required" });
      const driver = await storage.getVehicleByAccessToken(token);
      if (!driver) return res.status(401).json({ error: "Invalid driver token" });
      const orders = await storage.getDriverActiveOrders(driver.id, driver.tenantId);
      res.json(orders);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/delivery/driver/orders/:id/accept", async (req, res) => {
    try {
      const { token } = req.body;
      if (!token) return res.status(401).json({ error: "Driver token required" });
      const driver = await storage.getVehicleByAccessToken(token);
      if (!driver) return res.status(401).json({ error: "Invalid driver token" });
      const orderId = Number(req.params.id);
      await assignDriverToOrder(orderId, driver.id);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/delivery/driver/orders/:id/picked-up", async (req, res) => {
    try {
      const { token } = req.body;
      if (!token) return res.status(401).json({ error: "Driver token required" });
      const driver = await storage.getVehicleByAccessToken(token);
      if (!driver) return res.status(401).json({ error: "Invalid driver token" });
      const orderId = Number(req.params.id);
      await storage.updateOnlineOrder(orderId, { status: "on_way", riderPickedUpAt: /* @__PURE__ */ new Date() });
      const order = await storage.getOnlineOrder(orderId);
      if (order?.customerPhone && order.trackingToken) {
        try {
          await whatsappService.sendMessage(
            order.customerPhone,
            `\u{1F6F5} Your order is on the way!
Track live: ${process.env.APP_URL || ""}/track/${order.trackingToken}`
          );
        } catch (_) {
        }
      }
      callerIdService.broadcast({ type: "delivery_status_change", orderId, status: "on_way", driverName: driver.driverName }, driver.tenantId);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/delivery/driver/orders/:id/delivered", async (req, res) => {
    try {
      const { token } = req.body;
      if (!token) return res.status(401).json({ error: "Driver token required" });
      const driver = await storage.getVehicleByAccessToken(token);
      if (!driver) return res.status(401).json({ error: "Invalid driver token" });
      const orderId = Number(req.params.id);
      await storage.updateOnlineOrder(orderId, { status: "delivered", riderDeliveredAt: /* @__PURE__ */ new Date() });
      await releaseDriver(driver.id);
      const order = await storage.getOnlineOrder(orderId);
      if (order) {
        const customerId = await storage.getCustomerIdByPhone(order.customerPhone, driver.tenantId);
        if (customerId) {
          await awardLoyaltyPoints(customerId, driver.tenantId, orderId, Number(order.totalAmount));
        }
        if (order.customerPhone && order.trackingToken) {
          setTimeout(async () => {
            try {
              await whatsappService.sendMessage(
                order.customerPhone,
                `\u2B50 How was your order?
Leave a quick review: ${process.env.APP_URL || ""}/track/${order.trackingToken}#rate`
              );
            } catch (_) {
            }
          }, 10 * 60 * 1e3);
        }
      }
      callerIdService.broadcast({ type: "delivery_status_change", orderId, status: "delivered", driverName: driver.driverName }, driver.tenantId);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/delivery/driver/location", async (req, res) => {
    try {
      const { token, lat, lng, orderId } = req.body;
      if (!token || lat === void 0 || lng === void 0) return res.status(400).json({ error: "token, lat, lng required" });
      const driver = await storage.getVehicleByAccessToken(token);
      if (!driver) return res.status(401).json({ error: "Invalid driver token" });
      await storage.updateDriverLocation(driver.id, Number(lat), Number(lng), orderId ? Number(orderId) : void 0);
      callerIdService.broadcastToTenant(driver.tenantId, {
        type: "driver_location_update",
        vehicleId: driver.id,
        lat: Number(lat),
        lng: Number(lng),
        orderId: orderId || null
      });
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/delivery/driver/earnings", async (req, res) => {
    try {
      const { token, days } = req.query;
      if (!token) return res.status(401).json({ error: "Driver token required" });
      const driver = await storage.getVehicleByAccessToken(token);
      if (!driver) return res.status(401).json({ error: "Invalid driver token" });
      const earnings = await storage.getDriverEarnings(driver.id, Number(days ?? 7));
      res.json(earnings);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/delivery/manage/orders", async (req, res) => {
    try {
      const { tenantId, status: status2, orderType } = req.query;
      const tid = req.tenantId || Number(tenantId);
      const orders = await storage.getDeliveryOrders(tid, { status: status2, orderType });
      res.json(orders);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.put("/api/delivery/manage/orders/:id/assign", async (req, res) => {
    try {
      const { vehicleId } = req.body;
      if (!vehicleId) return res.status(400).json({ error: "vehicleId required" });
      const orderId = Number(req.params.id);
      await storage.assignDriverToOrder(orderId, Number(vehicleId));
      const driver = await storage.getVehicle(Number(vehicleId));
      const order = await storage.getOnlineOrder(orderId);
      if (driver?.driverPhone && driver.driverAccessToken && order) {
        try {
          await whatsappService.sendMessage(
            driver.driverPhone,
            `\u{1F6F5} New delivery assignment!
Order #${order.orderNumber}
Customer: ${order.customerName}
Address: ${order.customerAddress || "Pickup"}
Open app: ${process.env.APP_URL || ""}/driver/${driver.driverAccessToken}`
          );
        } catch (_) {
        }
      }
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.put("/api/delivery/manage/orders/:id/status", async (req, res) => {
    try {
      const { status: status2 } = req.body;
      if (!status2) return res.status(400).json({ error: "status required" });
      const orderId = Number(req.params.id);
      await storage.updateOnlineOrder(orderId, { status: status2 });
      const order = await storage.getOnlineOrder(orderId);
      if (order?.customerPhone) {
        const messages = {
          accepted: "\u2705 Your order has been confirmed and is being prepared!",
          preparing: "\u{1F468}\u200D\u{1F373} Your order is being prepared fresh for you!",
          ready: "\u2705 Your order is ready! The driver is collecting it now.",
          delivered: "\u{1F389} Your order has been delivered. Enjoy your meal!",
          cancelled: "\u274C Your order has been cancelled. Contact us if you need help."
        };
        if (messages[status2]) {
          try {
            await whatsappService.sendMessage(order.customerPhone, messages[status2]);
          } catch (_) {
          }
        }
      }
      if (order?.tenantId) {
        callerIdService.broadcast({ type: "delivery_status_change", orderId, status: status2 }, order.tenantId);
      }
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/delivery/manage/drivers", async (req, res) => {
    try {
      const tid = req.tenantId;
      const drivers = await storage.getActiveDrivers(tid);
      res.json(drivers);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/delivery/manage/stats", async (req, res) => {
    try {
      const tid = req.tenantId;
      const stats = await storage.getDeliveryStats(tid);
      res.json(stats);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/delivery/manage/zones", async (req, res) => {
    try {
      const tid = req.tenantId;
      res.json(await storage.getDeliveryZones(tid));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/delivery/manage/zones", async (req, res) => {
    try {
      const tid = req.tenantId;
      const zone = await storage.createDeliveryZone({ ...req.body, tenantId: tid });
      res.status(201).json(zone);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.put("/api/delivery/manage/zones/:id", async (req, res) => {
    try {
      const zone = await storage.updateDeliveryZone(Number(req.params.id), req.body);
      res.json(zone);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.delete("/api/delivery/manage/zones/:id", async (req, res) => {
    try {
      await storage.deleteDeliveryZone(Number(req.params.id));
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/delivery/promos", async (req, res) => {
    try {
      const tid = req.tenantId;
      res.json(await storage.getPromoCodes(tid));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/delivery/promos", async (req, res) => {
    try {
      const tid = req.tenantId;
      const promo = await storage.createPromoCode({ ...req.body, tenantId: tid });
      res.status(201).json(promo);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.put("/api/delivery/promos/:id", async (req, res) => {
    try {
      const promo = await storage.updatePromoCode(Number(req.params.id), req.body);
      res.json(promo);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.delete("/api/delivery/promos/:id", async (req, res) => {
    try {
      await storage.deletePromoCode(Number(req.params.id));
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/delivery/loyalty/:customerId", async (req, res) => {
    try {
      const customerId = Number(req.params.customerId);
      const [customer, transactions] = await Promise.all([
        storage.getCustomer(customerId),
        storage.getLoyaltyTransactions(customerId)
      ]);
      if (!customer) return res.status(404).json({ error: "Customer not found" });
      res.json({ points: customer.loyaltyPoints, tier: customer.loyaltyTier, transactions });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/delivery/loyalty/redeem", async (req, res) => {
    try {
      const customer = await getAuthenticatedCustomer(req.headers.authorization);
      if (!customer) return res.status(401).json({ error: "Not authenticated" });
      const { points } = req.body;
      const result = await redeemLoyaltyPoints(customer.id, customer.tenantId, Number(points));
      res.json(result);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/delivery/wallet/:customerId", async (req, res) => {
    try {
      const customerId = Number(req.params.customerId);
      const [customer, transactions] = await Promise.all([
        storage.getCustomer(customerId),
        storage.getWalletTransactions(customerId)
      ]);
      if (!customer) return res.status(404).json({ error: "Customer not found" });
      res.json({ balance: customer.walletBalance, transactions });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/delivery/wallet/topup", async (req, res) => {
    try {
      const customer = await getAuthenticatedCustomer(req.headers.authorization);
      if (!customer) return res.status(401).json({ error: "Not authenticated" });
      const { amount } = req.body;
      if (!amount || Number(amount) <= 0) return res.status(400).json({ error: "Valid amount required" });
      const stripe = getUncachableStripeClient();
      const intent = await stripe.paymentIntents.create({
        amount: Math.round(Number(amount) * 100),
        currency: "chf",
        metadata: { type: "wallet_topup", customerId: customer.id, tenantId: customer.tenantId }
      });
      res.json({ clientSecret: intent.client_secret, paymentIntentId: intent.id });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/delivery/referral/:code", async (req, res) => {
    try {
      const customer = await storage.getCustomerByReferralCode(req.params.code);
      if (!customer) return res.status(404).json({ error: "Referral code not found" });
      res.json({ valid: true, referrerName: customer.name });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/delivery/orders/:idOrToken/status-stream", (req, res) => {
    const idOrToken = req.params.idOrToken;
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();
    const heartbeat = setInterval(() => {
      try {
        res.write(": heartbeat\n\n");
      } catch (_) {
      }
    }, 25e3);
    const resolveAndListen = async () => {
      try {
        let orderId;
        if (/^\d+$/.test(idOrToken)) {
          orderId = Number(idOrToken);
        } else {
          const order = await storage.getOnlineOrderByTrackingToken(idOrToken);
          if (!order) {
            res.write(`data: ${JSON.stringify({ type: "error", error: "Order not found" })}

`);
            clearInterval(heartbeat);
            res.end();
            return;
          }
          orderId = order.id;
          res.write(`data: ${JSON.stringify({ type: "status_update", order: { id: order.id, status: order.status, orderNumber: order.orderNumber } })}

`);
        }
        if (!app2._orderSseClients) {
          app2._orderSseClients = /* @__PURE__ */ new Map();
        }
        const sseMap = app2._orderSseClients;
        if (!sseMap.has(orderId)) sseMap.set(orderId, /* @__PURE__ */ new Set());
        sseMap.get(orderId).add(res);
        req.on("close", () => {
          clearInterval(heartbeat);
          sseMap.get(orderId)?.delete(res);
          if (sseMap.get(orderId)?.size === 0) sseMap.delete(orderId);
        });
      } catch (err) {
        clearInterval(heartbeat);
        res.end();
      }
    };
    resolveAndListen();
  });
  if (!app2._broadcastDeliveryStatus) {
    app2._broadcastDeliveryStatus = (orderId, payload) => {
      const sseMap = app2._orderSseClients;
      if (!sseMap) return;
      const clients = sseMap.get(orderId);
      if (!clients) return;
      const msg = `data: ${JSON.stringify(payload)}

`;
      clients.forEach((client2) => {
        try {
          client2.write(msg);
        } catch (_) {
          clients.delete(client2);
        }
      });
    };
  }
  app2.post("/api/delivery/orders/:id/reorder", async (req, res) => {
    try {
      const orderId = Number(req.params.id);
      const originalOrder = await storage.getOnlineOrder(orderId);
      if (!originalOrder) return res.status(404).json({ error: "Order not found" });
      const trackingToken = generateTrackingToken();
      const orderNumber = `DEL-${Date.now()}`;
      const newOrder = await storage.createOnlineOrder({
        tenantId: originalOrder.tenantId,
        orderNumber,
        customerName: originalOrder.customerName,
        customerPhone: originalOrder.customerPhone,
        customerEmail: originalOrder.customerEmail ?? null,
        customerAddress: originalOrder.customerAddress ?? null,
        items: originalOrder.items,
        subtotal: originalOrder.subtotal,
        taxAmount: "0",
        deliveryFee: originalOrder.deliveryFee ?? "0",
        totalAmount: originalOrder.totalAmount,
        paymentMethod: originalOrder.paymentMethod || "cash",
        paymentStatus: "pending",
        status: "pending",
        orderType: originalOrder.orderType || "delivery",
        notes: originalOrder.notes ?? null,
        estimatedTime: 35,
        language: originalOrder.language || "en",
        trackingToken,
        sourceChannel: "web"
      });
      try {
        callerIdService.broadcast({
          type: "new_online_order",
          order: { id: newOrder.id, orderNumber, customerName: originalOrder.customerName, totalAmount: originalOrder.totalAmount, orderType: originalOrder.orderType }
        }, originalOrder.tenantId);
      } catch (_) {
      }
      res.status(201).json({ success: true, orderId: newOrder.id, orderNumber, trackingToken });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/delivery/order-ratings", async (req, res) => {
    try {
      const tid = req.tenantId;
      const ratings = await storage.getOrderRatings(tid);
      res.json(ratings);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  const httpServer = (0, import_node_http.createServer)(app2);
  return httpServer;
}

// server/superAdminRoutes.ts
var bcrypt5 = __toESM(require("bcrypt"));
var crypto5 = __toESM(require("crypto"));
var fs4 = __toESM(require("fs"));
var path3 = __toESM(require("path"));
init_storage();
var import_date_fns4 = require("date-fns");
init_db();
var import_drizzle_orm6 = require("drizzle-orm");
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
      const valid = await bcrypt5.compare(password, admin.passwordHash);
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
      const [totalTenants] = await db.select({ count: import_drizzle_orm6.sql`count(*)` }).from(tenants2);
      const [activeTenants] = await db.select({ count: import_drizzle_orm6.sql`count(*)` }).from(tenants2).where((0, import_drizzle_orm6.eq)(tenants2.status, "active"));
      const [totalSubs] = await db.select({ count: import_drizzle_orm6.sql`count(*)` }).from(tenantSubscriptions2);
      const [activeSubs] = await db.select({ count: import_drizzle_orm6.sql`count(*)` }).from(tenantSubscriptions2).where((0, import_drizzle_orm6.eq)(tenantSubscriptions2.status, "active"));
      const [totalLicenses] = await db.select({ count: import_drizzle_orm6.sql`count(*)` }).from(licenseKeys2);
      const [activeLicenses] = await db.select({ count: import_drizzle_orm6.sql`count(*)` }).from(licenseKeys2).where((0, import_drizzle_orm6.eq)(licenseKeys2.status, "active"));
      const [totalBranches] = await db.select({ count: import_drizzle_orm6.sql`count(*)` }).from(branches2);
      const [totalEmployees] = await db.select({ count: import_drizzle_orm6.sql`count(*)` }).from(employees2);
      const [totalProducts] = await db.select({ count: import_drizzle_orm6.sql`count(*)` }).from(products2);
      const [totalSales] = await db.select({ count: import_drizzle_orm6.sql`count(*)` }).from(sales2);
      const [totalCustomers] = await db.select({ count: import_drizzle_orm6.sql`count(*)` }).from(customers2);
      const [revenueRow] = await db.select({ total: import_drizzle_orm6.sql`cast(coalesce(sum(cast(price as decimal(10,2))), 0) as char)` }).from(tenantSubscriptions2).where((0, import_drizzle_orm6.eq)(tenantSubscriptions2.status, "active"));
      const [salesRevenue] = await db.select({ total: import_drizzle_orm6.sql`cast(coalesce(sum(cast(total_amount as decimal(12,2))), 0) as char)` }).from(sales2);
      const in7Days = /* @__PURE__ */ new Date();
      in7Days.setDate(in7Days.getDate() + 7);
      const now = /* @__PURE__ */ new Date();
      const [expiringSubs] = await db.select({ count: import_drizzle_orm6.sql`count(*)` }).from(tenantSubscriptions2).where((0, import_drizzle_orm6.and)((0, import_drizzle_orm6.eq)(tenantSubscriptions2.status, "active"), (0, import_drizzle_orm6.lte)(tenantSubscriptions2.endDate, in7Days), (0, import_drizzle_orm6.gte)(tenantSubscriptions2.endDate, now)));
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
      const passwordHash = await bcrypt5.hash("admin123", 10);
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
      const endDate = (0, import_date_fns4.addDays)(startDate, 14);
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
        () => crypto5.randomBytes(2).toString("hex").toUpperCase()
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
      const passwordHash = await bcrypt5.hash(newPassword || "admin123", 10);
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
      if (planType === "monthly") endDate = (0, import_date_fns4.addMonths)(startDate, 1);
      else if (planType === "yearly") endDate = (0, import_date_fns4.addYears)(startDate, 1);
      else endDate = (0, import_date_fns4.addDays)(startDate, 30);
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
      if (months) newEnd = (0, import_date_fns4.addMonths)(currentEnd, months);
      else if (days) newEnd = (0, import_date_fns4.addDays)(currentEnd, days);
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
      const segments = Array.from({ length: 4 }, () => crypto5.randomBytes(2).toString("hex").toUpperCase());
      const licenseKey = customKey || `BARMAGLY-${segments.join("-")}`;
      const key = await storage.createLicenseKey({
        licenseKey,
        tenantId,
        subscriptionId: subscriptionId || null,
        status: "active",
        maxActivations: maxActivations || 3,
        expiresAt: expiresAt ? new Date(expiresAt) : (0, import_date_fns4.addYears)(/* @__PURE__ */ new Date(), 1),
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
      await db.delete(licenseKeys2).where((0, import_drizzle_orm6.eq)(licenseKeys2.id, id));
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
      const rows = await db.select().from(expenses2).orderBy((0, import_drizzle_orm6.desc)(expenses2.createdAt)).limit(500);
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
          const { inArray } = await import("drizzle-orm");
          const rows = await db.select().from(expenses2).where(inArray(expenses2.branchId, branchIds));
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
      const rows = await db.select().from(shifts2).orderBy((0, import_drizzle_orm6.desc)(shifts2.startTime)).limit(200);
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
      const valid = await bcrypt5.compare(currentPassword, admin.passwordHash);
      if (!valid) return res.status(400).json({ error: "Current password is incorrect" });
      const newHash = await bcrypt5.hash(newPassword, 10);
      await storage.updateSuperAdmin(adminId, { passwordHash: newHash });
      res.json({ success: true, message: "Password changed successfully" });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/super-admin/db-migrate-to-replit-neon", requireSuperAdmin, async (_req, res) => {
    const pgHost = process.env.PGHOST || "";
    if (!pgHost.includes("neon.tech")) {
      return res.status(400).json({ error: "PGHOST is not a Neon host \u2014 migration can only run in production", pgHost });
    }
    const log3 = [];
    const report = (msg) => {
      log3.push(msg);
      console.log("[MIGRATE]", msg);
    };
    try {
      let sqlVal2 = function(v) {
        if (v === null || v === void 0) return "NULL";
        if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
        if (typeof v === "number") return String(v);
        if (v instanceof Date) return `'${v.toISOString()}'`;
        return `'${String(v).replace(/'/g, "''")}'`;
      };
      var sqlVal = sqlVal2;
      const { Pool: PgPool } = await import("pg");
      const srcPool = new PgPool({
        connectionString: "postgresql://neondb_owner:npg_HFhrVY7sSDp3@ep-polished-sun-amr4cmn7.c-5.us-east-1.aws.neon.tech/neondb",
        ssl: { rejectUnauthorized: false },
        max: 3
      });
      const dstPool = new PgPool({
        host: process.env.PGHOST,
        database: process.env.PGDATABASE,
        user: process.env.PGUSER,
        password: process.env.PGPASSWORD,
        port: parseInt(process.env.PGPORT || "5432"),
        ssl: { rejectUnauthorized: false },
        max: 3
      });
      const [srcTest, dstTest] = await Promise.all([
        srcPool.query("SELECT COUNT(*) as c FROM customers"),
        dstPool.query("SELECT current_database() as db")
      ]);
      report(`Source: ${srcTest.rows[0].c} customers`);
      report(`Destination: ${dstTest.rows[0].db} on ${pgHost}`);
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
      async function migrate(tbl, batchSize = 300) {
        const rows = await srcPool.query(`SELECT * FROM "${tbl}" ORDER BY id`);
        if (!rows.rows.length) {
          report(`  ${tbl}: 0`);
          return;
        }
        const cols = Object.keys(rows.rows[0]);
        const colsSql = cols.map((c) => `"${c}"`).join(",");
        for (let i = 0; i < rows.rows.length; i += batchSize) {
          const batch = rows.rows.slice(i, i + batchSize);
          const vals = batch.map((r) => `(${cols.map((c) => sqlVal2(r[c])).join(",")})`).join(",");
          await dstPool.query(`INSERT INTO "${tbl}" (${colsSql}) VALUES ${vals} ON CONFLICT (id) DO NOTHING`);
        }
        await dstPool.query(`SELECT setval(pg_get_serial_sequence('${tbl}','id'), COALESCE((SELECT MAX(id) FROM "${tbl}"),0)+1, false)`);
        report(`  ${tbl}: ${rows.rows.length}`);
      }
      await migrate("super_admins");
      await migrate("tenants");
      await migrate("license_keys");
      await migrate("tenant_subscriptions");
      await migrate("branches");
      await migrate("categories");
      await migrate("warehouses");
      await migrate("vehicles");
      await migrate("employees");
      await migrate("suppliers");
      await migrate("products", 100);
      const custRows = await srcPool.query("SELECT * FROM customers ORDER BY id");
      const custCols = Object.keys(custRows.rows[0]);
      const custColsSql = custCols.map((c) => `"${c}"`).join(",");
      let custDone = 0;
      for (let i = 0; i < custRows.rows.length; i += 500) {
        const batch = custRows.rows.slice(i, i + 500);
        const vals = batch.map((r) => `(${custCols.map((c) => sqlVal2(r[c])).join(",")})`).join(",");
        await dstPool.query(`INSERT INTO customers (${custColsSql}) VALUES ${vals} ON CONFLICT (id) DO NOTHING`);
        custDone += batch.length;
      }
      await dstPool.query(`SELECT setval(pg_get_serial_sequence('customers','id'), COALESCE((SELECT MAX(id) FROM customers),0)+1, false)`);
      report(`  customers: ${custDone}`);
      await migrate("sales", 100);
      await migrate("sale_items", 100);
      await migrate("inventory", 100);
      await migrate("expenses");
      await migrate("shifts");
      await migrate("notifications", 100);
      await migrate("calls", 100);
      await migrate("activity_log");
      await migrate("stock_counts");
      await migrate("cash_drawer_operations");
      await migrate("platform_commissions");
      await migrate("tables");
      const noIdTables = ["landing_page_config", "platform_settings"];
      for (const tbl of noIdTables) {
        const rows = await srcPool.query(`SELECT * FROM "${tbl}"`);
        if (!rows.rows.length) continue;
        const cols = Object.keys(rows.rows[0]);
        const colsSql = cols.map((c) => `"${c}"`).join(",");
        const vals = rows.rows.map((r) => `(${cols.map((c) => sqlVal2(r[c])).join(",")})`).join(",");
        await dstPool.query(`INSERT INTO "${tbl}" (${colsSql}) VALUES ${vals} ON CONFLICT DO NOTHING`);
        report(`  ${tbl}: ${rows.rows.length}`);
      }
      const verify = await dstPool.query(`
        SELECT (SELECT COUNT(*) FROM tenants) t,
               (SELECT COUNT(*) FROM customers) c,
               (SELECT id FROM tenants LIMIT 1) tid
      `);
      report(`Done \u2014 tenant_id=${verify.rows[0].tid}, customers=${verify.rows[0].c}`);
      await Promise.all([srcPool.end(), dstPool.end()]);
      res.json({ success: true, log: log3 });
    } catch (e) {
      log3.push(`ERROR: ${e.message}`);
      res.status(500).json({ success: false, log: log3, error: e.message });
    }
  });
  console.log("[SUPER-ADMIN] All super admin routes registered.");
}

// server/tenantAuth.ts
var import_jsonwebtoken2 = __toESM(require("jsonwebtoken"));
init_storage();
var JWT_SECRET2 = process.env.JWT_SECRET || "barmagly-super-admin-secret-key-2024";
var PUBLIC_ROUTES = [
  "/api/health",
  "/api/license/validate",
  "/api/auth/google",
  "/api/landing/subscribe",
  "/api/landing-page-config",
  "/api/store/",
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
  "/api/push/subscribe",
  // Public — SW registers subscription before full auth
  "/api/maintenance/fix-tenant-ids",
  // One-time migration fix (secured by secret header)
  // ── Delivery Platform Public Routes ──
  "/api/delivery/auth/",
  // Customer OTP login/register
  "/api/delivery/store/",
  // Menu & store config browsing
  "/api/delivery/restaurants",
  // Multi-restaurant discovery listing
  "/api/delivery/orders/track/",
  // Public order tracking by token
  "/api/delivery/orders/public",
  // Public order placement
  "/api/delivery/promo/validate",
  // Promo code validation
  "/api/delivery/zones",
  // Delivery zones for checkout map
  "/api/delivery/referral/",
  // Referral code lookup
  "/api/delivery/driver/auth"
  // Driver token login
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
        const decoded = import_jsonwebtoken2.default.verify(token, JWT_SECRET2);
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
var import_stripe_replit_sync = require("stripe-replit-sync");

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
var fs5 = __toESM(require("fs"));
var path4 = __toESM(require("path"));
var usingMySql = Boolean(process.env.MYSQL_HOST || process.env.MYSQL_DATABASE);
if (!usingMySql) {
  if (process.env.PGHOST && process.env.PGHOST.includes("neon.tech")) {
    const neonUrl = `postgresql://${process.env.PGUSER}:${process.env.PGPASSWORD}@${process.env.PGHOST}:${process.env.PGPORT || 5432}/${process.env.PGDATABASE || "neondb"}?sslmode=require`;
    process.env.DATABASE_URL = neonUrl;
    process.env.NEON_DATABASE_URL = neonUrl;
  } else if (process.env.NEON_DATABASE_URL) {
    let neonUrl = process.env.NEON_DATABASE_URL;
    if (!neonUrl.match(/neon\.tech\/\w+/)) {
      neonUrl = neonUrl.replace(/\/$/, "") + "/neondb?sslmode=require";
      process.env.NEON_DATABASE_URL = neonUrl;
    }
    process.env.DATABASE_URL = neonUrl;
  }
}
var app = (0, import_express.default)();
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
    import_express.default.json({
      limit: "10mb",
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      }
    })
  );
  app2.use(import_express.default.urlencoded({ extended: false }));
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
      const appIndexPath = path4.resolve(process.cwd(), "dist", "app", "index.html");
      const fallbackPath = path4.resolve(process.cwd(), "dist", "index.html");
      const indexPath = fs5.existsSync(appIndexPath) ? appIndexPath : fallbackPath;
      if (fs5.existsSync(indexPath)) {
        const html = fs5.readFileSync(indexPath, "utf-8");
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        return res.status(200).send(html);
      }
    }
    if (req.path === "/app/sw.js") {
      const swPath = fs5.existsSync(path4.resolve(process.cwd(), "dist", "app", "sw.js")) ? path4.resolve(process.cwd(), "dist", "app", "sw.js") : path4.resolve(process.cwd(), "dist", "sw.js");
      if (fs5.existsSync(swPath)) {
        res.setHeader("Content-Type", "application/javascript");
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        res.setHeader("Service-Worker-Allowed", "/app/");
        return res.sendFile(swPath);
      }
    }
    if (req.path.startsWith("/super_admin") || req.path.startsWith("/super-admin")) {
      const isLogin = req.path === "/super_admin/login" || req.path === "/super-admin/login" || req.path === "/super_admin" || req.path === "/super-admin";
      const superAdminTemplatePath = path4.resolve(
        process.cwd(),
        "server",
        "templates",
        isLogin ? "super-admin-login.html" : "super-admin-dashboard.html"
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
    const deliveryMatch = req.path.match(/^\/order\/([^/]+)(\/.*)?$/);
    if (deliveryMatch) {
      try {
        const slug = deliveryMatch[1];
        const { storage: storage2 } = await Promise.resolve().then(() => (init_storage(), storage_exports));
        const config = await storage2.getLandingPageConfigBySlug(slug);
        if (!config) return res.status(404).send("<h1>Store not found</h1>");
        const tenantId = config.tenantId;
        const tenant = await storage2.getTenant(tenantId);
        if (!tenant) return res.status(404).send("<h1>Store not found</h1>");
        const deliveryIndexPath = path4.resolve(process.cwd(), "delivery-app", "index.html");
        if (!fs5.existsSync(deliveryIndexPath)) {
          return res.status(503).send("<h1>Delivery app not yet deployed</h1>");
        }
        let html = fs5.readFileSync(deliveryIndexPath, "utf-8");
        const stripeKey = process.env.STRIPE_PUBLISHABLE_KEY || "";
        const configJson = JSON.stringify({
          slug,
          tenantId,
          primaryColor: config.primaryColor || "#FF5722",
          accentColor: config.accentColor || "#2FD3C6",
          currency: tenant.currency || process.env.DEFAULT_CURRENCY || "EGP",
          language: config.language || "en",
          storeName: config.storeName || config.name || tenant.name,
          logo: config.logo || config.logoUrl || "",
          phone: config.phone || "",
          supportPhone: config.supportPhone || config.phone || "",
          phonePlaceholder: config.phonePlaceholder || "",
          minDeliveryTime: config.minDeliveryTime || 20,
          maxDeliveryTime: config.maxDeliveryTime || 45,
          enableLoyalty: config.enableLoyalty ?? true,
          enableWallet: config.enableWallet ?? false,
          enableScheduledOrders: config.enableScheduledOrders ?? true,
          stripePublishableKey: stripeKey,
          defaultLat: config.defaultLat || null,
          defaultLng: config.defaultLng || null,
          coverImage: config.coverImage || config.headerBgImage || "",
          metaTitle: config.metaTitle || "",
          metaDescription: config.metaDescription || ""
        });
        html = html.replace("__DELIVERY_CONFIG__", configJson);
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        return res.status(200).send(html);
      } catch (err) {
        console.error("[delivery/order/:slug] Error:", err);
        return res.status(500).send("<h1>Server error</h1>");
      }
    }
    if (req.path === "/restaurants" || req.path === "/restaurants/") {
      try {
        const { storage: storage2 } = await Promise.resolve().then(() => (init_storage(), storage_exports));
        const restaurantsIndexPath = path4.resolve(process.cwd(), "delivery-app", "restaurants.html");
        if (!fs5.existsSync(restaurantsIndexPath)) {
          return res.status(503).send("<h1>Restaurants page not yet deployed</h1>");
        }
        let html = fs5.readFileSync(restaurantsIndexPath, "utf-8");
        const configJson = JSON.stringify({
          storeName: "Barmagly Delivery",
          currency: process.env.DEFAULT_CURRENCY || "EGP",
          language: req.query.lang || "en",
          stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY || "",
          primaryColor: "#FF5722",
          accentColor: "#2FD3C6",
          tenantId: null,
          slug: null
        });
        html = html.replace("__DELIVERY_CONFIG__", configJson);
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        return res.status(200).send(html);
      } catch (err) {
        console.error("[/restaurants] Error:", err);
        return res.status(500).send("<h1>Server error</h1>");
      }
    }
    const driverMatch = req.path.match(/^\/driver\/([^/]+)$/);
    if (driverMatch) {
      const driverIndexPath = path4.resolve(process.cwd(), "delivery-app", "driver", "index.html");
      if (!fs5.existsSync(driverIndexPath)) {
        return res.status(503).send("<h1>Driver app not yet deployed</h1>");
      }
      const html = fs5.readFileSync(driverIndexPath, "utf-8");
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(200).send(html);
    }
    const trackMatch = req.path.match(/^\/track\/([^/]+)$/);
    if (trackMatch) {
      const trackIndexPath = path4.resolve(process.cwd(), "delivery-app", "track", "index.html");
      if (!fs5.existsSync(trackIndexPath)) {
        return res.status(503).send("<h1>Tracking page not yet deployed</h1>");
      }
      const html = fs5.readFileSync(trackIndexPath, "utf-8");
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(200).send(html);
    }
    const storeMatch = req.path.match(/^\/store\/(.+)$/);
    if (storeMatch) {
      try {
        const storeParam = storeMatch[1];
        const { storage: storage2 } = await Promise.resolve().then(() => (init_storage(), storage_exports));
        let tenantId;
        let slug;
        if (/^\d+$/.test(storeParam)) {
          tenantId = parseInt(storeParam, 10);
          const config2 = await storage2.getLandingPageConfig(tenantId);
          slug = config2?.slug || `tenant-${tenantId}`;
        } else {
          slug = storeParam;
          const config2 = await storage2.getLandingPageConfigBySlug(slug);
          if (!config2) return res.status(404).send("<h1>Store not found</h1>");
          tenantId = config2.tenantId;
        }
        const tenant = await storage2.getTenant(tenantId);
        if (!tenant) return res.status(404).send("<h1>Store not found</h1>");
        const config = await storage2.getLandingPageConfig(tenantId);
        const storePath = path4.resolve(process.cwd(), "server", "templates", "restaurant-store.html");
        let html = fs5.readFileSync(storePath, "utf-8");
        html = html.replace(/\{\{SLUG\}\}/g, slug);
        html = html.replace(/\{\{TENANT_ID\}\}/g, String(tenantId));
        html = html.replace(/\{\{PRIMARY_COLOR\}\}/g, config?.primaryColor || "#2FD3C6");
        html = html.replace(/\{\{ACCENT_COLOR\}\}/g, config?.accentColor || "#6366F1");
        html = html.replace(/\{\{CURRENCY\}\}/g, tenant.currency || "CHF");
        html = html.replace(/\{\{LANGUAGE\}\}/g, config?.language || "en");
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        return res.status(200).send(html);
      } catch (err) {
        console.error("[store/:param] Error:", err);
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
  app2.use("/delivery-app", import_express.default.static(path4.resolve(process.cwd(), "delivery-app"), {
    index: false
    // HTML is served dynamically above
  }));
  app2.use("/assets", import_express.default.static(path4.resolve(process.cwd(), "assets")));
  app2.use("/uploads", import_express.default.static(path4.resolve(process.cwd(), "uploads")));
  app2.use("/objects", import_express.default.static(path4.resolve(process.cwd(), "uploads")));
  app2.use("/sounds", import_express.default.static(path4.resolve(process.cwd(), "public", "sounds")));
  app2.use("/app/assets/images", import_express.default.static(path4.resolve(process.cwd(), "assets", "images")));
  const appDistDir = fs5.existsSync(path4.resolve(process.cwd(), "dist", "app")) ? path4.resolve(process.cwd(), "dist", "app") : path4.resolve(process.cwd(), "dist");
  app2.use("/app", import_express.default.static(appDistDir, {
    setHeaders(res, filePath) {
      if (filePath.endsWith(".webmanifest")) {
        res.setHeader("Content-Type", "application/manifest+json");
      }
      if (filePath.includes("_expo/static/js") || filePath.endsWith(".js")) {
        res.setHeader("Cache-Control", "no-cache, must-revalidate");
      }
    }
  }));
  app2.use(import_express.default.static(path4.resolve(process.cwd(), "static-build")));
  const staticIndexPath = fs5.existsSync(path4.resolve(process.cwd(), "dist", "app", "index.html")) ? path4.resolve(process.cwd(), "dist", "app", "index.html") : path4.resolve(process.cwd(), "dist", "index.html");
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
  if (usingMySql) {
    log2("MySQL mode detected, skipping Stripe schema sync");
    return;
  }
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    log2("DATABASE_URL not set, skipping Stripe init");
    return;
  }
  try {
    log2("Initializing Stripe schema...");
    await (0, import_stripe_replit_sync.runMigrations)({ databaseUrl });
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
    import_express.default.raw({ type: "application/json" }),
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
  if (usingMySql) {
    log2("MySQL mode active; skipping legacy Postgres-only startup migrations");
  } else {
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
      await pool2.query(`ALTER TABLE sales ADD COLUMN IF NOT EXISTS vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE SET NULL;`);
      await pool2.query(`
      ALTER TABLE sale_items ALTER COLUMN product_id DROP NOT NULL;
      DO $$
      BEGIN
        -- Drop the OLD Drizzle-generated CASCADE constraint (may still exist from initial schema)
        IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sale_items_product_id_products_id_fk') THEN
          ALTER TABLE sale_items DROP CONSTRAINT sale_items_product_id_products_id_fk;
        END IF;
        -- Drop and re-create the SET NULL constraint to ensure correct behavior
        IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sale_items_product_id_fkey') THEN
          ALTER TABLE sale_items DROP CONSTRAINT sale_items_product_id_fkey;
        END IF;
        ALTER TABLE sale_items ADD CONSTRAINT sale_items_product_id_fkey
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;
      END $$;
    `);
      await pool2.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inventory_product_id_products_id_fk') THEN
          ALTER TABLE inventory DROP CONSTRAINT inventory_product_id_products_id_fk;
        END IF;
        ALTER TABLE inventory ADD CONSTRAINT inventory_product_id_products_id_fk
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
      END $$;
    `);
      await pool2.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inventory_branch_id_branches_id_fk') THEN
          ALTER TABLE inventory DROP CONSTRAINT inventory_branch_id_branches_id_fk;
        END IF;
        ALTER TABLE inventory ADD CONSTRAINT inventory_branch_id_branches_id_fk
          FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE;
      END $$;
    `);
      await pool2.query(`
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS customer_nr integer;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS salutation text;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS first_name text;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_name text;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS street text;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS street_nr text;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS house_nr text;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS city text;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS postal_code text;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS company text;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS zhd text;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS how_to_go text;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS screen_info text;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS source text;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS first_order_date text;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_order_date text;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS legacy_total_spent numeric(12,2) DEFAULT 0;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS average_order_value numeric(10,2) DEFAULT 0;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS order_count integer DEFAULT 0;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS legacy_ref text;
    `);
      log2("Customer extended columns migration complete");
      log2("Schema migration complete");
    } catch (err) {
      log2("Schema migration error (non-fatal):", err);
    }
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
  try {
    const { db: db2 } = await Promise.resolve().then(() => (init_db(), db_exports));
    const { sql: sql5 } = await import("drizzle-orm");
    const tenantsResult = await db2.execute(sql5`SELECT id FROM tenants LIMIT 1`);
    const tenantRows = tenantsResult[0];
    if (tenantRows && tenantRows.length > 0) {
      const tid = tenantRows[0].id;
      const tenantTables = [
        "products",
        "categories",
        "employees",
        "customers",
        "branches",
        "inventory",
        "sales",
        "sale_items",
        "expenses",
        "shifts",
        "notifications",
        "calls",
        "purchase_orders",
        "purchase_order_items",
        "suppliers",
        "tables",
        "kitchen_orders",
        "returns",
        "return_items",
        "cash_drawer_operations",
        "warehouses",
        "warehouse_transfers",
        "product_batches",
        "inventory_movements",
        "stock_counts",
        "stock_count_items",
        "employee_commissions",
        "daily_closings",
        "monthly_closings"
      ];
      let totalFixed = 0;
      for (const table of tenantTables) {
        try {
          const r = await db2.execute(sql5.raw(`UPDATE \`${table}\` SET tenant_id = ${tid} WHERE tenant_id IS NULL`));
          const affected = r[0]?.affectedRows ?? 0;
          if (affected > 0) {
            log2(`[migration] Fixed ${affected} rows in ${table}`);
            totalFixed += affected;
          }
        } catch {
        }
      }
      if (totalFixed > 0) log2(`[migration] Total tenant_id backfill: ${totalFixed} rows \u2192 tenant ${tid}`);
      else log2(`[migration] tenant_id backfill: nothing to fix`);
    }
  } catch (err) {
    log2("Error during tenant_id backfill:", err);
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
