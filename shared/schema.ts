import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, boolean, timestamp, jsonb, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const branches = pgTable("branches", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenants.id), // Added for multi-tenancy
  name: text("name").notNull(),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  logo: text("logo"),
  isActive: boolean("is_active").default(true),
  isMain: boolean("is_main").default(false),
  currency: text("currency").default("CHF"),
  taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).default("0"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  pin: text("pin").notNull(),
  role: text("role").notNull().default("cashier"),
  branchId: integer("branch_id").references(() => branches.id),
  isActive: boolean("is_active").default(true),
  hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }).default("0"),
  avatar: text("avatar"),
  permissions: jsonb("permissions").$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  nameAr: text("name_ar"),
  color: text("color").default("#7C3AED"),
  icon: text("icon").default("grid"),
  image: text("image"),
  parentId: integer("parent_id"),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenants.id), // Added for multi-tenancy
  name: text("name").notNull(),
  nameAr: text("name_ar"),
  description: text("description"),
  sku: text("sku").unique(),
  barcode: text("barcode"),
  categoryId: integer("category_id").references(() => categories.id),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  costPrice: decimal("cost_price", { precision: 10, scale: 2 }),
  image: text("image"),
  unit: text("unit").default("piece"),
  taxable: boolean("taxable").default(true),
  trackInventory: boolean("track_inventory").default(true),
  isActive: boolean("is_active").default(true),
  expiryDate: timestamp("expiry_date"),
  modifiers: jsonb("modifiers").$type<{ name: string; options: { label: string; price: number }[] }[]>().default([]),
  variants: jsonb("variants").$type<{ name: string; sku: string; price: number; stock: number }[]>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const inventory = pgTable("inventory", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => products.id).notNull(),
  branchId: integer("branch_id").references(() => branches.id).notNull(),
  quantity: integer("quantity").default(0),
  lowStockThreshold: integer("low_stock_threshold").default(10),
  reorderPoint: integer("reorder_point").default(5),
  reorderQuantity: integer("reorder_quantity").default(20),
  lastRestocked: timestamp("last_restocked"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
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
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const sales = pgTable("sales", {
  id: serial("id").primaryKey(),
  receiptNumber: text("receipt_number").notNull().unique(),
  branchId: integer("branch_id").references(() => branches.id),
  employeeId: integer("employee_id").references(() => employees.id),
  customerId: integer("customer_id").references(() => customers.id),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).default("0"),
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
  paymentDetails: jsonb("payment_details").$type<{ method: string; amount: number }[]>(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const saleItems = pgTable("sale_items", {
  id: serial("id").primaryKey(),
  saleId: integer("sale_id").references(() => sales.id).notNull(),
  productId: integer("product_id").references(() => products.id).notNull(),
  productName: text("product_name").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  discount: decimal("discount", { precision: 10, scale: 2 }).default("0"),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  modifiers: jsonb("modifiers").$type<{ name: string; option: string; price: number }[]>().default([]),
  notes: text("notes"),
});

export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  contactName: text("contact_name"),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  paymentTerms: text("payment_terms"),
  balance: decimal("balance", { precision: 12, scale: 2 }).default("0"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const purchaseOrders = pgTable("purchase_orders", {
  id: serial("id").primaryKey(),
  orderNumber: text("order_number").notNull().unique(),
  supplierId: integer("supplier_id").references(() => suppliers.id).notNull(),
  branchId: integer("branch_id").references(() => branches.id),
  status: text("status").default("pending"),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).default("0"),
  notes: text("notes"),
  expectedDate: timestamp("expected_date"),
  receivedDate: timestamp("received_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const purchaseOrderItems = pgTable("purchase_order_items", {
  id: serial("id").primaryKey(),
  purchaseOrderId: integer("purchase_order_id").references(() => purchaseOrders.id).notNull(),
  productId: integer("product_id").references(() => products.id).notNull(),
  quantity: integer("quantity").notNull(),
  unitCost: decimal("unit_cost", { precision: 10, scale: 2 }).notNull(),
  receivedQuantity: integer("received_quantity").default(0),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
});

export const shifts = pgTable("shifts", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").references(() => employees.id).notNull(),
  branchId: integer("branch_id").references(() => branches.id),
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
  overtimeMinutes: integer("overtime_minutes").default(0),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  recipientId: integer("recipient_id").references(() => employees.id).notNull(),
  senderId: integer("sender_id").references(() => employees.id),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  entityType: text("entity_type"),
  entityId: integer("entity_id"),
  isRead: boolean("is_read").default(false),
  priority: text("priority").default("normal"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").references(() => branches.id),
  category: text("category").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  date: timestamp("date").defaultNow(),
  employeeId: integer("employee_id").references(() => employees.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const tables = pgTable("tables", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").references(() => branches.id),
  name: text("name").notNull(),
  capacity: integer("capacity").default(4),
  status: text("status").default("available"),
  currentOrderId: integer("current_order_id"),
  posX: integer("pos_x").default(0),
  posY: integer("pos_y").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const kitchenOrders = pgTable("kitchen_orders", {
  id: serial("id").primaryKey(),
  saleId: integer("sale_id").references(() => sales.id).notNull(),
  branchId: integer("branch_id").references(() => branches.id),
  tableNumber: text("table_number"),
  status: text("status").default("pending"),
  items: jsonb("items").$type<{ name: string; quantity: number; notes: string; status: string }[]>().default([]),
  priority: text("priority").default("normal"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const subscriptionPlans = pgTable("subscription_plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  interval: text("interval").default("monthly"),
  features: jsonb("features").$type<string[]>().default([]),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").references(() => customers.id).notNull(),
  planId: integer("plan_id").references(() => subscriptionPlans.id).notNull(),
  status: text("status").default("active"),
  startDate: timestamp("start_date").defaultNow(),
  endDate: timestamp("end_date"),
  nextBillingDate: timestamp("next_billing_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const activityLog = pgTable("activity_log", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").references(() => employees.id).notNull(),
  action: text("action").notNull(),
  entityType: text("entity_type"),
  entityId: integer("entity_id"),
  details: text("details"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const returns = pgTable("returns", {
  id: serial("id").primaryKey(),
  originalSaleId: integer("original_sale_id").references(() => sales.id).notNull(),
  employeeId: integer("employee_id").references(() => employees.id),
  reason: text("reason"),
  type: text("type").default("refund"),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
  returnGraceDays: integer("return_grace_days").default(30),
  refundMethod: text("refund_method"),
  approvedBy: integer("approved_by").references(() => employees.id),
  branchId: integer("branch_id").references(() => branches.id),
  status: text("status").default("completed"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const returnItems = pgTable("return_items", {
  id: serial("id").primaryKey(),
  returnId: integer("return_id").references(() => returns.id).notNull(),
  productId: integer("product_id").references(() => products.id).notNull(),
  productName: text("product_name").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
});

export const syncQueue = pgTable("sync_queue", {
  id: serial("id").primaryKey(),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id").notNull(),
  action: text("action").notNull(),
  data: jsonb("data"),
  status: text("status").default("pending"),
  retryCount: integer("retry_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  processedAt: timestamp("processed_at"),
});

export const cashDrawerOperations = pgTable("cash_drawer_operations", {
  id: serial("id").primaryKey(),
  shiftId: integer("shift_id").references(() => shifts.id).notNull(),
  employeeId: integer("employee_id").references(() => employees.id).notNull(),
  type: text("type").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  expectedAmount: decimal("expected_amount", { precision: 10, scale: 2 }),
  actualAmount: decimal("actual_amount", { precision: 10, scale: 2 }),
  difference: decimal("difference", { precision: 10, scale: 2 }),
  reason: text("reason"),
  approvedBy: integer("approved_by").references(() => employees.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const warehouses = pgTable("warehouses", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  branchId: integer("branch_id").references(() => branches.id).notNull(),
  address: text("address"),
  isDefault: boolean("is_default").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const warehouseTransfers = pgTable("warehouse_transfers", {
  id: serial("id").primaryKey(),
  fromWarehouseId: integer("from_warehouse_id").references(() => warehouses.id).notNull(),
  toWarehouseId: integer("to_warehouse_id").references(() => warehouses.id).notNull(),
  productId: integer("product_id").references(() => products.id).notNull(),
  quantity: integer("quantity").notNull(),
  employeeId: integer("employee_id").references(() => employees.id),
  status: text("status").default("completed"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const productBatches = pgTable("product_batches", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => products.id).notNull(),
  batchNumber: text("batch_number").notNull(),
  quantity: integer("quantity").default(0),
  expiryDate: timestamp("expiry_date"),
  costPrice: decimal("cost_price", { precision: 10, scale: 2 }),
  branchId: integer("branch_id").references(() => branches.id),
  supplierId: integer("supplier_id").references(() => suppliers.id),
  receivedDate: timestamp("received_date").defaultNow(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const inventoryMovements = pgTable("inventory_movements", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => products.id).notNull(),
  branchId: integer("branch_id").references(() => branches.id),
  type: text("type").notNull(),
  quantity: integer("quantity").notNull(),
  previousQuantity: integer("previous_quantity"),
  newQuantity: integer("new_quantity"),
  referenceType: text("reference_type"),
  referenceId: integer("reference_id"),
  batchNumber: text("batch_number"),
  employeeId: integer("employee_id").references(() => employees.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const stockCounts = pgTable("stock_counts", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").references(() => branches.id).notNull(),
  employeeId: integer("employee_id").references(() => employees.id).notNull(),
  status: text("status").default("in_progress"),
  approvedBy: integer("approved_by").references(() => employees.id),
  totalItems: integer("total_items").default(0),
  discrepancies: integer("discrepancies").default(0),
  notes: text("notes"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const stockCountItems = pgTable("stock_count_items", {
  id: serial("id").primaryKey(),
  stockCountId: integer("stock_count_id").references(() => stockCounts.id).notNull(),
  productId: integer("product_id").references(() => products.id).notNull(),
  systemQuantity: integer("system_quantity").notNull(),
  actualQuantity: integer("actual_quantity"),
  difference: integer("difference"),
  notes: text("notes"),
});

export const supplierContracts = pgTable("supplier_contracts", {
  id: serial("id").primaryKey(),
  supplierId: integer("supplier_id").references(() => suppliers.id).notNull(),
  discountRate: decimal("discount_rate", { precision: 5, scale: 2 }).default("0"),
  paymentTerms: text("payment_terms"),
  minOrderAmount: decimal("min_order_amount", { precision: 10, scale: 2 }),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  isActive: boolean("is_active").default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const employeeCommissions = pgTable("employee_commissions", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").references(() => employees.id).notNull(),
  saleId: integer("sale_id").references(() => sales.id).notNull(),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }).notNull(),
  commissionAmount: decimal("commission_amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ========== Super Admin System Tables ==========

export const superAdmins = pgTable("super_admins", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").default("super_admin"),
  isActive: boolean("is_active").default(true),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const tenants = pgTable("tenants", {
  id: serial("id").primaryKey(),
  businessName: text("business_name").notNull(),
  ownerName: text("owner_name").notNull(),
  ownerEmail: text("owner_email").notNull().unique(),
  ownerPhone: text("owner_phone"),
  passwordHash: text("password_hash"),
  address: text("address"),
  logo: text("logo"),
  status: text("status").default("active"), // active, suspended, expired, trial
  maxBranches: integer("max_branches").default(1),
  maxEmployees: integer("max_employees").default(5),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const tenantSubscriptions = pgTable("tenant_subscriptions", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenants.id).notNull(),
  planType: text("plan_type").notNull().default("trial"), // trial, monthly, yearly
  planName: text("plan_name").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).default("0"),
  status: text("status").default("active"), // active, expired, cancelled, pending
  startDate: timestamp("start_date").defaultNow(),
  endDate: timestamp("end_date"),
  trialEndsAt: timestamp("trial_ends_at"),
  autoRenew: boolean("auto_renew").default(false),
  paymentMethod: text("payment_method"),
  lastPaymentDate: timestamp("last_payment_date"),
  nextPaymentDate: timestamp("next_payment_date"),
  cancelledAt: timestamp("cancelled_at"),
  cancellationReason: text("cancellation_reason"),
  features: jsonb("features").$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const licenseKeys = pgTable("license_keys", {
  id: serial("id").primaryKey(),
  licenseKey: text("license_key").notNull().unique(),
  tenantId: integer("tenant_id").references(() => tenants.id).notNull(),
  subscriptionId: integer("subscription_id").references(() => tenantSubscriptions.id),
  status: text("status").default("active"), // active, expired, revoked, pending
  activatedAt: timestamp("activated_at"),
  expiresAt: timestamp("expires_at"),
  lastValidatedAt: timestamp("last_validated_at"),
  deviceInfo: text("device_info"),
  maxActivations: integer("max_activations").default(3),
  currentActivations: integer("current_activations").default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const tenantNotifications = pgTable("tenant_notifications", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenants.id),
  type: text("type").notNull(), // warning, promotion, info, expiry_alert, upgrade_offer
  title: text("title").notNull(),
  message: text("message").notNull(),
  priority: text("priority").default("normal"), // low, normal, high, urgent
  isRead: boolean("is_read").default(false),
  isDismissed: boolean("is_dismissed").default(false),
  actionUrl: text("action_url"),
  actionLabel: text("action_label"),
  expiresAt: timestamp("expires_at"),
  sentBy: integer("sent_by").references(() => superAdmins.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// ========== Insert Schemas ==========

export const insertBranchSchema = createInsertSchema(branches).omit({ id: true, createdAt: true, updatedAt: true });
export const insertEmployeeSchema = createInsertSchema(employees).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCategorySchema = createInsertSchema(categories).omit({ id: true, createdAt: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true, createdAt: true, updatedAt: true });
export const insertInventorySchema = createInsertSchema(inventory).omit({ id: true, updatedAt: true });
export const insertCustomerSchema = createInsertSchema(customers).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSaleSchema = createInsertSchema(sales).omit({ id: true, createdAt: true });
export const insertSaleItemSchema = createInsertSchema(saleItems).omit({ id: true });
export const insertSupplierSchema = createInsertSchema(suppliers).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPurchaseOrderSchema = createInsertSchema(purchaseOrders).omit({ id: true, createdAt: true });
export const insertPurchaseOrderItemSchema = createInsertSchema(purchaseOrderItems).omit({ id: true });
export const insertShiftSchema = createInsertSchema(shifts).omit({ id: true });
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });
export const insertExpenseSchema = createInsertSchema(expenses).omit({ id: true, createdAt: true });
export const insertTableSchema = createInsertSchema(tables).omit({ id: true, createdAt: true });
export const insertKitchenOrderSchema = createInsertSchema(kitchenOrders).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans).omit({ id: true, createdAt: true });
export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({ id: true, createdAt: true });
export const insertActivityLogSchema = createInsertSchema(activityLog).omit({ id: true, createdAt: true });
export const insertReturnSchema = createInsertSchema(returns).omit({ id: true, createdAt: true });
export const insertReturnItemSchema = createInsertSchema(returnItems).omit({ id: true });
export const insertCashDrawerOperationSchema = createInsertSchema(cashDrawerOperations).omit({ id: true, createdAt: true });
export const insertWarehouseSchema = createInsertSchema(warehouses).omit({ id: true, createdAt: true });
export const insertWarehouseTransferSchema = createInsertSchema(warehouseTransfers).omit({ id: true, createdAt: true });
export const insertProductBatchSchema = createInsertSchema(productBatches).omit({ id: true, createdAt: true });
export const insertInventoryMovementSchema = createInsertSchema(inventoryMovements).omit({ id: true, createdAt: true });
export const insertStockCountSchema = createInsertSchema(stockCounts).omit({ id: true, createdAt: true });
export const insertStockCountItemSchema = createInsertSchema(stockCountItems).omit({ id: true });
export const insertSupplierContractSchema = createInsertSchema(supplierContracts).omit({ id: true, createdAt: true });
export const insertEmployeeCommissionSchema = createInsertSchema(employeeCommissions).omit({ id: true, createdAt: true });

export const insertSuperAdminSchema = createInsertSchema(superAdmins).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTenantSchema = createInsertSchema(tenants).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTenantSubscriptionSchema = createInsertSchema(tenantSubscriptions).omit({ id: true, createdAt: true, updatedAt: true });
export const insertLicenseKeySchema = createInsertSchema(licenseKeys).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTenantNotificationSchema = createInsertSchema(tenantNotifications).omit({ id: true, createdAt: true });

// ========== Type Exports ==========

export type Branch = typeof branches.$inferSelect;
export type InsertBranch = z.infer<typeof insertBranchSchema>;
export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Inventory = typeof inventory.$inferSelect;
export type InsertInventory = z.infer<typeof insertInventorySchema>;
export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Sale = typeof sales.$inferSelect;
export type InsertSale = z.infer<typeof insertSaleSchema>;
export type SaleItem = typeof saleItems.$inferSelect;
export type InsertSaleItem = z.infer<typeof insertSaleItemSchema>;
export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type InsertPurchaseOrder = z.infer<typeof insertPurchaseOrderSchema>;
export type PurchaseOrderItem = typeof purchaseOrderItems.$inferSelect;
export type InsertPurchaseOrderItem = z.infer<typeof insertPurchaseOrderItemSchema>;
export type Shift = typeof shifts.$inferSelect;
export type InsertShift = z.infer<typeof insertShiftSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Table = typeof tables.$inferSelect;
export type InsertTable = z.infer<typeof insertTableSchema>;
export type KitchenOrder = typeof kitchenOrders.$inferSelect;
export type InsertKitchenOrder = z.infer<typeof insertKitchenOrderSchema>;
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type InsertSubscriptionPlan = z.infer<typeof insertSubscriptionPlanSchema>;
export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type ActivityLog = typeof activityLog.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type Return = typeof returns.$inferSelect;
export type InsertReturn = z.infer<typeof insertReturnSchema>;
export type ReturnItem = typeof returnItems.$inferSelect;
export type InsertReturnItem = z.infer<typeof insertReturnItemSchema>;
export type CashDrawerOperation = typeof cashDrawerOperations.$inferSelect;
export type InsertCashDrawerOperation = z.infer<typeof insertCashDrawerOperationSchema>;
export type Warehouse = typeof warehouses.$inferSelect;
export type InsertWarehouse = z.infer<typeof insertWarehouseSchema>;
export type WarehouseTransfer = typeof warehouseTransfers.$inferSelect;
export type InsertWarehouseTransfer = z.infer<typeof insertWarehouseTransferSchema>;
export type ProductBatch = typeof productBatches.$inferSelect;
export type InsertProductBatch = z.infer<typeof insertProductBatchSchema>;
export type InventoryMovement = typeof inventoryMovements.$inferSelect;
export type InsertInventoryMovement = z.infer<typeof insertInventoryMovementSchema>;
export type StockCount = typeof stockCounts.$inferSelect;
export type InsertStockCount = z.infer<typeof insertStockCountSchema>;
export type StockCountItem = typeof stockCountItems.$inferSelect;
export type InsertStockCountItem = z.infer<typeof insertStockCountItemSchema>;
export type SupplierContract = typeof supplierContracts.$inferSelect;
export type InsertSupplierContract = z.infer<typeof insertSupplierContractSchema>;
export type EmployeeCommission = typeof employeeCommissions.$inferSelect;
export type InsertEmployeeCommission = z.infer<typeof insertEmployeeCommissionSchema>;

export type SuperAdmin = typeof superAdmins.$inferSelect;
export type InsertSuperAdmin = z.infer<typeof insertSuperAdminSchema>;
export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type TenantSubscription = typeof tenantSubscriptions.$inferSelect;
export type InsertTenantSubscription = z.infer<typeof insertTenantSubscriptionSchema>;
export type LicenseKey = typeof licenseKeys.$inferSelect;
export type InsertLicenseKey = z.infer<typeof insertLicenseKeySchema>;
export type TenantNotification = typeof tenantNotifications.$inferSelect;
export type InsertTenantNotification = z.infer<typeof insertTenantNotificationSchema>;
