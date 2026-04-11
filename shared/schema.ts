import { sql } from "drizzle-orm";
import { mysqlTable, text, varchar, int, decimal, boolean, timestamp, json, serial, unique } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const branches = mysqlTable("branches", {
  id: serial("id").primaryKey(),
  tenantId: int("tenant_id").references(() => tenants.id, { onDelete: 'cascade' }), // Added for multi-tenancy
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
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const employees = mysqlTable("employees", {
  id: serial("id").primaryKey(),
  tenantId: int("tenant_id").references(() => tenants.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  pin: text("pin").notNull(),
  role: text("role").notNull().default("cashier"),
  branchId: int("branch_id").references(() => branches.id, { onDelete: 'cascade' }),
  isActive: boolean("is_active").default(true),
  hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }).default("0"),
  avatar: text("avatar"),
  permissions: json("permissions").$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const categories = mysqlTable("categories", {
  id: serial("id").primaryKey(),
  tenantId: int("tenant_id").references(() => tenants.id, { onDelete: 'cascade' }), // Added for multi-tenancy
  name: text("name").notNull(),
  nameAr: text("name_ar"),
  color: text("color").default("#7C3AED"),
  icon: text("icon").default("grid"),
  image: text("image"),
  parentId: int("parent_id"),
  sortOrder: int("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const products = mysqlTable("products", {
  id: serial("id").primaryKey(),
  tenantId: int("tenant_id").references(() => tenants.id, { onDelete: 'cascade' }), // Added for multi-tenancy
  name: text("name").notNull(),
  nameAr: text("name_ar"),
  description: text("description"),
  sku: text("sku").unique(),
  barcode: text("barcode"),
  categoryId: int("category_id").references(() => categories.id, { onDelete: 'cascade' }),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  costPrice: decimal("cost_price", { precision: 10, scale: 2 }),
  image: text("image"),
  unit: text("unit").default("piece"),
  taxable: boolean("taxable").default(true),
  trackInventory: boolean("track_inventory").default(true),
  isActive: boolean("is_active").default(true),
  expiryDate: timestamp("expiry_date"),
  modifiers: json("modifiers").$type<{ name: string; options: { label: string; price: number }[] }[]>().default([]),
  variants: json("variants").$type<{ name: string; sku: string; price: number; stock: number }[]>().default([]),
  isAddon: boolean("is_addon").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const inventory = mysqlTable("inventory", {
  id: serial("id").primaryKey(),
  productId: int("product_id").references(() => products.id, { onDelete: 'cascade' }).notNull(),
  branchId: int("branch_id").references(() => branches.id, { onDelete: 'cascade' }).notNull(),
  quantity: int("quantity").default(0),
  lowStockThreshold: int("low_stock_threshold").default(10),
  reorderPoint: int("reorder_point").default(5),
  reorderQuantity: int("reorder_quantity").default(20),
  lastRestocked: timestamp("last_restocked"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const customers = mysqlTable("customers", {
  id: serial("id").primaryKey(),
  tenantId: int("tenant_id").references(() => tenants.id, { onDelete: 'cascade' }), // Added for multi-tenancy
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  loyaltyPoints: int("loyalty_points").default(0),
  totalSpent: decimal("total_spent", { precision: 12, scale: 2 }).default("0"),
  visitCount: int("visit_count").default(0),
  notes: text("notes"),
  creditBalance: decimal("credit_balance", { precision: 10, scale: 2 }).default("0"),
  isActive: boolean("is_active").default(true),
  // ── Extended fields from CSV import ──
  customerNr: int("customer_nr"),
  salutation: text("salutation"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  street: text("street"),
  streetNr: text("street_nr"),
  houseNr: text("house_nr"),
  city: text("city"),
  postalCode: text("postal_code"),
  company: text("company"),
  zhd: text("zhd"),
  howToGo: text("how_to_go"),
  screenInfo: text("screen_info"),
  source: text("source"),
  firstOrderDate: text("first_order_date"),
  lastOrderDate: text("last_order_date"),
  legacyTotalSpent: decimal("legacy_total_spent", { precision: 12, scale: 2 }).default("0"),
  averageOrderValue: decimal("average_order_value", { precision: 10, scale: 2 }).default("0"),
  orderCount: int("order_count").default(0),
  legacyRef: text("legacy_ref"),
  // ── Additional raw fields from KUNDEN CSV ──
  quadrat: text("quadrat"),
  r1: text("r1"),
  r3: text("r3"),
  r4: text("r4"),
  r5: text("r5"),
  r8: text("r8"),
  r9: text("r9"),
  r10: text("r10"),
  r14: decimal("r14", { precision: 12, scale: 2 }),
  r15: decimal("r15", { precision: 12, scale: 2 }),
  r16: boolean("r16").default(false),
  r17: boolean("r17").default(false),
  r18: boolean("r18").default(false),
  r19: boolean("r19").default(false),
  r20: boolean("r20").default(false),
  // ── Delivery Platform Extensions ──
  hasAccount: boolean("has_account").default(false),
  passwordHash: text("password_hash"),
  dateOfBirth: text("date_of_birth"),
  gender: text("gender"),
  preferredLanguage: text("preferred_language").default("en"),
  walletBalance: decimal("wallet_balance", { precision: 10, scale: 2 }).default("0"),
  totalOrdersDelivery: int("total_orders_delivery").default(0),
  totalOrdersPickup: int("total_orders_pickup").default(0),
  referralCode: varchar("referral_code", { length: 16 }),
  referredByCode: varchar("referred_by_code", { length: 16 }),
  fcmToken: text("fcm_token"),
  loyaltyTier: text("loyalty_tier").default("bronze"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const sales = mysqlTable("sales", {
  id: serial("id").primaryKey(),
  receiptNumber: text("receipt_number").notNull().unique(),
  branchId: int("branch_id").references(() => branches.id, { onDelete: 'cascade' }),
  employeeId: int("employee_id").references(() => employees.id, { onDelete: 'cascade' }),
  customerId: int("customer_id").references(() => customers.id, { onDelete: 'cascade' }),
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
  vehicleId: int("vehicle_id"),
  paymentDetails: json("payment_details").$type<{ method: string; amount: number }[]>(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const saleItems = mysqlTable("sale_items", {
  id: serial("id").primaryKey(),
  saleId: int("sale_id").references(() => sales.id, { onDelete: 'cascade' }).notNull(),
  productId: int("product_id").references(() => products.id, { onDelete: 'set null' }),
  productName: text("product_name").notNull(),
  quantity: int("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  discount: decimal("discount", { precision: 10, scale: 2 }).default("0"),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  modifiers: json("modifiers").$type<{ name: string; option: string; price: number }[]>().default([]),
  notes: text("notes"),
});

export const calls = mysqlTable("calls", {
  id: serial("id").primaryKey(),
  tenantId: int("tenant_id").references(() => tenants.id, { onDelete: 'cascade' }),
  branchId: int("branch_id").references(() => branches.id, { onDelete: 'cascade' }),
  phoneNumber: text("phone_number").notNull(),
  customerId: int("customer_id").references(() => customers.id, { onDelete: 'set null' }),
  status: text("status").notNull().default("missed"), // answered, missed
  saleId: int("sale_id").references(() => sales.id, { onDelete: 'set null' }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const suppliers = mysqlTable("suppliers", {
  id: serial("id").primaryKey(),
  tenantId: int("tenant_id").references(() => tenants.id, { onDelete: 'cascade' }), // Added for multi-tenancy
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

export const purchaseOrders = mysqlTable("purchase_orders", {
  id: serial("id").primaryKey(),
  orderNumber: text("order_number").notNull().unique(),
  supplierId: int("supplier_id").references(() => suppliers.id, { onDelete: 'cascade' }).notNull(),
  branchId: int("branch_id").references(() => branches.id, { onDelete: 'cascade' }),
  status: text("status").default("pending"),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).default("0"),
  notes: text("notes"),
  expectedDate: timestamp("expected_date"),
  receivedDate: timestamp("received_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const purchaseOrderItems = mysqlTable("purchase_order_items", {
  id: serial("id").primaryKey(),
  purchaseOrderId: int("purchase_order_id").references(() => purchaseOrders.id, { onDelete: 'cascade' }).notNull(),
  productId: int("product_id").references(() => products.id, { onDelete: 'cascade' }).notNull(),
  quantity: int("quantity").notNull(),
  unitCost: decimal("unit_cost", { precision: 10, scale: 2 }).notNull(),
  receivedQuantity: int("received_quantity").default(0),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
});

export const shifts = mysqlTable("shifts", {
  id: serial("id").primaryKey(),
  employeeId: int("employee_id").references(() => employees.id, { onDelete: 'cascade' }).notNull(),
  branchId: int("branch_id").references(() => branches.id, { onDelete: 'cascade' }),
  startTime: timestamp("start_time").defaultNow(),
  endTime: timestamp("end_time"),
  expectedDurationHours: decimal("expected_duration_hours", { precision: 4, scale: 1 }).default("8"),
  openingCash: decimal("opening_cash", { precision: 10, scale: 2 }).default("0"),
  closingCash: decimal("closing_cash", { precision: 10, scale: 2 }),
  totalSales: decimal("total_sales", { precision: 12, scale: 2 }).default("0"),
  totalTransactions: int("total_transactions").default(0),
  totalReturns: int("total_returns").default(0),
  totalDiscounts: decimal("total_discounts", { precision: 10, scale: 2 }).default("0"),
  status: text("status").default("open"),
  notes: text("notes"),
  breakMinutes: int("break_minutes").default(0),
  overtimeMinutes: int("overtime_minutes").default(0),
});

export const notifications = mysqlTable("notifications", {
  id: serial("id").primaryKey(),
  recipientId: int("recipient_id").references(() => employees.id, { onDelete: 'cascade' }).notNull(),
  senderId: int("sender_id").references(() => employees.id, { onDelete: 'cascade' }),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  entityType: text("entity_type"),
  entityId: int("entity_id"),
  isRead: boolean("is_read").default(false),
  priority: text("priority").default("normal"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const expenses = mysqlTable("expenses", {
  id: serial("id").primaryKey(),
  tenantId: int("tenant_id").references(() => tenants.id, { onDelete: 'cascade' }), // Added for multi-tenancy
  branchId: int("branch_id").references(() => branches.id, { onDelete: 'cascade' }),
  category: text("category").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  date: timestamp("date").defaultNow(),
  employeeId: int("employee_id").references(() => employees.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const tables = mysqlTable("tables", {
  id: serial("id").primaryKey(),
  branchId: int("branch_id").references(() => branches.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  capacity: int("capacity").default(4),
  status: text("status").default("available"),
  currentOrderId: int("current_order_id"),
  posX: int("pos_x").default(0),
  posY: int("pos_y").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const kitchenOrders = mysqlTable("kitchen_orders", {
  id: serial("id").primaryKey(),
  saleId: int("sale_id").references(() => sales.id, { onDelete: 'cascade' }).notNull(),
  branchId: int("branch_id").references(() => branches.id, { onDelete: 'cascade' }),
  tableNumber: text("table_number"),
  status: text("status").default("pending"),
  items: json("items").$type<{ name: string; quantity: number; notes: string; status: string }[]>().default([]),
  priority: text("priority").default("normal"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const subscriptionPlans = mysqlTable("subscription_plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  interval: text("interval").default("monthly"),
  features: json("features").$type<string[]>().default([]),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const subscriptions = mysqlTable("subscriptions", {
  id: serial("id").primaryKey(),
  customerId: int("customer_id").references(() => customers.id, { onDelete: 'cascade' }).notNull(),
  planId: int("plan_id").references(() => subscriptionPlans.id, { onDelete: 'cascade' }).notNull(),
  status: text("status").default("active"),
  startDate: timestamp("start_date").defaultNow(),
  endDate: timestamp("end_date"),
  nextBillingDate: timestamp("next_billing_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const activityLog = mysqlTable("activity_log", {
  id: serial("id").primaryKey(),
  employeeId: int("employee_id").references(() => employees.id, { onDelete: 'cascade' }).notNull(),
  action: text("action").notNull(),
  entityType: text("entity_type"),
  entityId: int("entity_id"),
  details: text("details"),
  metadata: json("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const returns = mysqlTable("returns", {
  id: serial("id").primaryKey(),
  originalSaleId: int("original_sale_id").references(() => sales.id, { onDelete: 'cascade' }).notNull(),
  employeeId: int("employee_id").references(() => employees.id, { onDelete: 'cascade' }),
  reason: text("reason"),
  type: text("type").default("refund"),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
  returnGraceDays: int("return_grace_days").default(30),
  refundMethod: text("refund_method"),
  approvedBy: int("approved_by").references(() => employees.id, { onDelete: 'cascade' }),
  branchId: int("branch_id").references(() => branches.id, { onDelete: 'cascade' }),
  status: text("status").default("completed"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const returnItems = mysqlTable("return_items", {
  id: serial("id").primaryKey(),
  returnId: int("return_id").references(() => returns.id, { onDelete: 'cascade' }).notNull(),
  productId: int("product_id").references(() => products.id, { onDelete: 'cascade' }).notNull(),
  productName: text("product_name").notNull(),
  quantity: int("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
});

export const syncQueue = mysqlTable("sync_queue", {
  id: serial("id").primaryKey(),
  entityType: text("entity_type").notNull(),
  entityId: int("entity_id").notNull(),
  action: text("action").notNull(),
  data: json("data"),
  status: text("status").default("pending"),
  retryCount: int("retry_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  processedAt: timestamp("processed_at"),
});

export const cashDrawerOperations = mysqlTable("cash_drawer_operations", {
  id: serial("id").primaryKey(),
  shiftId: int("shift_id").references(() => shifts.id, { onDelete: 'set null' }),
  employeeId: int("employee_id").references(() => employees.id, { onDelete: 'cascade' }).notNull(),
  type: text("type").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  expectedAmount: decimal("expected_amount", { precision: 10, scale: 2 }),
  actualAmount: decimal("actual_amount", { precision: 10, scale: 2 }),
  difference: decimal("difference", { precision: 10, scale: 2 }),
  reason: text("reason"),
  approvedBy: int("approved_by").references(() => employees.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const warehouses = mysqlTable("warehouses", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  branchId: int("branch_id").references(() => branches.id, { onDelete: 'cascade' }).notNull(),
  address: text("address"),
  isDefault: boolean("is_default").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const warehouseTransfers = mysqlTable("warehouse_transfers", {
  id: serial("id").primaryKey(),
  fromWarehouseId: int("from_warehouse_id").references(() => warehouses.id, { onDelete: 'cascade' }).notNull(),
  toWarehouseId: int("to_warehouse_id").references(() => warehouses.id, { onDelete: 'cascade' }).notNull(),
  productId: int("product_id").references(() => products.id, { onDelete: 'cascade' }).notNull(),
  quantity: int("quantity").notNull(),
  employeeId: int("employee_id").references(() => employees.id, { onDelete: 'cascade' }),
  status: text("status").default("completed"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const productBatches = mysqlTable("product_batches", {
  id: serial("id").primaryKey(),
  productId: int("product_id").references(() => products.id, { onDelete: 'cascade' }).notNull(),
  batchNumber: text("batch_number").notNull(),
  quantity: int("quantity").default(0),
  expiryDate: timestamp("expiry_date"),
  costPrice: decimal("cost_price", { precision: 10, scale: 2 }),
  branchId: int("branch_id").references(() => branches.id, { onDelete: 'cascade' }),
  supplierId: int("supplier_id").references(() => suppliers.id, { onDelete: 'cascade' }),
  receivedDate: timestamp("received_date").defaultNow(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const inventoryMovements = mysqlTable("inventory_movements", {
  id: serial("id").primaryKey(),
  productId: int("product_id").references(() => products.id, { onDelete: 'cascade' }).notNull(),
  branchId: int("branch_id").references(() => branches.id, { onDelete: 'cascade' }),
  type: text("type").notNull(),
  quantity: int("quantity").notNull(),
  previousQuantity: int("previous_quantity"),
  newQuantity: int("new_quantity"),
  referenceType: text("reference_type"),
  referenceId: int("reference_id"),
  batchNumber: text("batch_number"),
  employeeId: int("employee_id").references(() => employees.id, { onDelete: 'cascade' }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const stockCounts = mysqlTable("stock_counts", {
  id: serial("id").primaryKey(),
  branchId: int("branch_id").references(() => branches.id, { onDelete: 'cascade' }).notNull(),
  employeeId: int("employee_id").references(() => employees.id, { onDelete: 'cascade' }).notNull(),
  status: text("status").default("in_progress"),
  approvedBy: int("approved_by").references(() => employees.id, { onDelete: 'cascade' }),
  totalItems: int("total_items").default(0),
  discrepancies: int("discrepancies").default(0),
  notes: text("notes"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const stockCountItems = mysqlTable("stock_count_items", {
  id: serial("id").primaryKey(),
  stockCountId: int("stock_count_id").references(() => stockCounts.id, { onDelete: 'cascade' }).notNull(),
  productId: int("product_id").references(() => products.id, { onDelete: 'cascade' }).notNull(),
  systemQuantity: int("system_quantity").notNull(),
  actualQuantity: int("actual_quantity"),
  difference: int("difference"),
  notes: text("notes"),
});

export const supplierContracts = mysqlTable("supplier_contracts", {
  id: serial("id").primaryKey(),
  supplierId: int("supplier_id").references(() => suppliers.id, { onDelete: 'cascade' }).notNull(),
  discountRate: decimal("discount_rate", { precision: 5, scale: 2 }).default("0"),
  paymentTerms: text("payment_terms"),
  minOrderAmount: decimal("min_order_amount", { precision: 10, scale: 2 }),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  isActive: boolean("is_active").default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const employeeCommissions = mysqlTable("employee_commissions", {
  id: serial("id").primaryKey(),
  employeeId: int("employee_id").references(() => employees.id, { onDelete: 'cascade' }).notNull(),
  saleId: int("sale_id").references(() => sales.id, { onDelete: 'cascade' }).notNull(),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }).notNull(),
  commissionAmount: decimal("commission_amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ========== Super Admin System Tables ==========

export const superAdmins = mysqlTable("super_admins", {
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

export const tenants = mysqlTable("tenants", {
  id: serial("id").primaryKey(),
  businessName: text("business_name").notNull(),
  ownerName: text("owner_name").notNull(),
  ownerEmail: text("owner_email").notNull().unique(),
  ownerPhone: text("owner_phone"),
  passwordHash: text("password_hash"),
  address: text("address"),
  logo: text("logo"),
  status: text("status").default("active"), // active, suspended, expired, trial
  maxBranches: int("max_branches").default(1),
  maxEmployees: int("max_employees").default(5),
  storeType: text("store_type").default("supermarket"), // supermarket, restaurant, pharmacy, others
  metadata: json("metadata").$type<Record<string, unknown>>(),
  setupCompleted: boolean("setup_completed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const tenantSubscriptions = mysqlTable("tenant_subscriptions", {
  id: serial("id").primaryKey(),
  tenantId: int("tenant_id").references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
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
  features: json("features").$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const licenseKeys = mysqlTable("license_keys", {
  id: serial("id").primaryKey(),
  licenseKey: text("license_key").notNull().unique(),
  tenantId: int("tenant_id").references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  subscriptionId: int("subscription_id").references(() => tenantSubscriptions.id, { onDelete: 'cascade' }),
  status: text("status").default("active"), // active, expired, revoked, pending
  activatedAt: timestamp("activated_at"),
  expiresAt: timestamp("expires_at"),
  lastValidatedAt: timestamp("last_validated_at"),
  deviceInfo: text("device_info"),
  maxActivations: int("max_activations").default(3),
  currentActivations: int("current_activations").default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const tenantNotifications = mysqlTable("tenant_notifications", {
  id: serial("id").primaryKey(),
  tenantId: int("tenant_id").references(() => tenants.id, { onDelete: 'cascade' }),
  type: text("type").notNull(), // warning, promotion, info, expiry_alert, upgrade_offer
  title: text("title").notNull(),
  message: text("message").notNull(),
  priority: text("priority").default("normal"), // low, normal, high, urgent
  isRead: boolean("is_read").default(false),
  isDismissed: boolean("is_dismissed").default(false),
  actionUrl: text("action_url"),
  actionLabel: text("action_label"),
  expiresAt: timestamp("expires_at"),
  sentBy: int("sent_by").references(() => superAdmins.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow(),
});

// ========== Platform Settings & Commissions ==========

export const platformSettings = mysqlTable("platform_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const platformCommissions = mysqlTable("platform_commissions", {
  id: serial("id").primaryKey(),
  tenantId: int("tenant_id").references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  orderId: int("order_id"),
  saleTotal: decimal("sale_total", { precision: 12, scale: 2 }).notNull(),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }).notNull(),
  commissionAmount: decimal("commission_amount", { precision: 12, scale: 2 }).notNull(),
  status: text("status").default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ========== Online Ordering ==========

export const onlineOrders = mysqlTable("online_orders", {
  id: serial("id").primaryKey(),
  tenantId: int("tenant_id").references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  orderNumber: text("order_number").notNull(),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  customerAddress: text("customer_address"),
  customerEmail: text("customer_email"),
  items: json("items").$type<{ productId: number; name: string; quantity: number; unitPrice: number; total: number; notes?: string }[]>().notNull().default([]),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).default("0"),
  deliveryFee: decimal("delivery_fee", { precision: 10, scale: 2 }).default("0"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: text("payment_method").notNull().default("cash"), // cash, card, mobile
  paymentStatus: text("payment_status").notNull().default("pending"), // pending, paid, failed
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  status: text("status").notNull().default("pending"), // pending, accepted, preparing, ready, delivered, cancelled
  orderType: text("order_type").notNull().default("delivery"), // delivery, pickup
  notes: text("notes"),
  estimatedTime: int("estimated_time"), // minutes
  language: text("language").default("en"),
  // ── Delivery Platform Extensions ──
  driverId: int("driver_id"),
  scheduledAt: timestamp("scheduled_at"),
  promoCodeId: int("promo_code_id"),
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).default("0"),
  driverLat: decimal("driver_lat", { precision: 10, scale: 7 }),
  driverLng: decimal("driver_lng", { precision: 10, scale: 7 }),
  customerLat: decimal("customer_lat", { precision: 10, scale: 7 }),
  customerLng: decimal("customer_lng", { precision: 10, scale: 7 }),
  riderPickedUpAt: timestamp("rider_picked_up_at"),
  riderDeliveredAt: timestamp("rider_delivered_at"),
  rating: int("rating"),
  ratingComment: text("rating_comment"),
  trackingToken: varchar("tracking_token", { length: 64 }),
  sourceChannel: text("source_channel").default("web"),
  floor: text("floor"),
  buildingName: text("building_name"),
  addressNotes: text("address_notes"),
  savedAddressId: int("saved_address_id"),
  walletAmountUsed: decimal("wallet_amount_used", { precision: 10, scale: 2 }).default("0"),
  loyaltyPointsUsed: int("loyalty_points_used").default(0),
  loyaltyPointsEarned: int("loyalty_points_earned").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const landingPageConfig = mysqlTable("landing_page_config", {
  id: serial("id").primaryKey(),
  tenantId: int("tenant_id").references(() => tenants.id, { onDelete: 'cascade' }).notNull().unique(),
  slug: text("slug").notNull().unique(), // URL slug e.g. "pizza-lemon"
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
  estimatedDeliveryTime: int("estimated_delivery_time").default(30), // minutes
  footerText: text("footer_text"),
  socialFacebook: text("social_facebook"),
  socialInstagram: text("social_instagram"),
  socialWhatsapp: text("social_whatsapp"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  openingHours: text("opening_hours"), // e.g. "Mon-Sun 11:00–22:00"
  deliveryRadius: text("delivery_radius"), // e.g. "within 10km"
  customCss: text("custom_css"),
  isPublished: boolean("is_published").default(true),
  language: text("language").default("en"), // System language: en | ar | de
  // ── Delivery Platform Extensions ──
  bannerImages: json("banner_images").$type<{ url: string; title?: string; link?: string }[]>().default([]),
  featuredCategoryIds: json("featured_category_ids").$type<number[]>().default([]),
  promoText: text("promo_text"),
  deliveryZonesJson: json("delivery_zones_json").$type<{ label: string; lat: number; lng: number; radiusKm: number; fee: number }[]>().default([]),
  minDeliveryTime: int("min_delivery_time").default(20),
  maxDeliveryTime: int("max_delivery_time").default(45),
  loyaltyPointsPerUnit: decimal("loyalty_points_per_unit", { precision: 5, scale: 2 }).default("1.00"),
  loyaltyRedemptionRate: decimal("loyalty_redemption_rate", { precision: 5, scale: 2 }).default("0.01"),
  enableLoyalty: boolean("enable_loyalty").default(true),
  enableScheduledOrders: boolean("enable_scheduled_orders").default(true),
  enablePromos: boolean("enable_promos").default(true),
  enableWallet: boolean("enable_wallet").default(false),
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  googleAnalyticsId: text("google_analytics_id"),
  supportPhone: text("support_phone"),
  logomark: text("logomark"),
  headerBgImage: text("header_bg_image"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ========== Vehicles / Fleet ==========

export const vehicles = mysqlTable("vehicles", {
  id: serial("id").primaryKey(),
  tenantId: int("tenant_id").references(() => tenants.id, { onDelete: 'cascade' }),
  branchId: int("branch_id").references(() => branches.id, { onDelete: 'cascade' }),
  licensePlate: text("license_plate").notNull(),
  make: text("make"),
  model: text("model"),
  color: text("color"),
  driverName: text("driver_name"),
  driverPhone: text("driver_phone"),
  isActive: boolean("is_active").default(true),
  notes: text("notes"),
  // ── Delivery Platform Extensions ──
  employeeId: int("employee_id"),
  currentLat: decimal("current_lat", { precision: 10, scale: 7 }),
  currentLng: decimal("current_lng", { precision: 10, scale: 7 }),
  locationUpdatedAt: timestamp("location_updated_at"),
  driverStatus: text("driver_status").default("offline"),
  driverRating: decimal("driver_rating", { precision: 3, scale: 2 }).default("5.00"),
  totalDeliveries: int("total_deliveries").default(0),
  activeOrderId: int("active_order_id"),
  deviceToken: text("device_token"),
  driverAccessToken: varchar("driver_access_token", { length: 64 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// ========== Printer Configurations ==========

export const printerConfigs = mysqlTable("printer_configs", {
  id: serial("id").primaryKey(),
  tenantId: int("tenant_id").references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  branchId: int("branch_id").references(() => branches.id, { onDelete: 'cascade' }),
  receiptType: text("receipt_type").notNull(), // kitchen, home_delivery, take_away, restaurant, driver_order, check_out, lists, daily_close, monthly_close, accounts_receivable
  printer1: text("printer_1"),
  printer1Copy: boolean("printer_1_copy").default(false),
  printer2: text("printer_2"),
  printer2Copy: boolean("printer_2_copy").default(false),
  paperSize: text("paper_size").default("80mm"),
  isActive: boolean("is_active").default(true),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ========== Daily / Monthly Closings ==========

export const dailyClosings = mysqlTable("daily_closings", {
  id: serial("id").primaryKey(),
  tenantId: int("tenant_id").references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  branchId: int("branch_id").references(() => branches.id, { onDelete: 'cascade' }),
  employeeId: int("employee_id").references(() => employees.id, { onDelete: 'cascade' }),
  closingDate: text("closing_date").notNull(), // YYYY-MM-DD
  totalSales: decimal("total_sales", { precision: 12, scale: 2 }).default("0"),
  totalCash: decimal("total_cash", { precision: 12, scale: 2 }).default("0"),
  totalCard: decimal("total_card", { precision: 12, scale: 2 }).default("0"),
  totalMobile: decimal("total_mobile", { precision: 12, scale: 2 }).default("0"),
  totalTransactions: int("total_transactions").default(0),
  totalReturns: decimal("total_returns", { precision: 12, scale: 2 }).default("0"),
  totalDiscounts: decimal("total_discounts", { precision: 12, scale: 2 }).default("0"),
  openingCash: decimal("opening_cash", { precision: 12, scale: 2 }).default("0"),
  closingCash: decimal("closing_cash", { precision: 12, scale: 2 }).default("0"),
  notes: text("notes"),
  status: text("status").default("closed"), // closed, approved
  createdAt: timestamp("created_at").defaultNow(),
});

export const monthlyClosings = mysqlTable("monthly_closings", {
  id: serial("id").primaryKey(),
  tenantId: int("tenant_id").references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  branchId: int("branch_id").references(() => branches.id, { onDelete: 'cascade' }),
  employeeId: int("employee_id").references(() => employees.id, { onDelete: 'cascade' }),
  closingMonth: text("closing_month").notNull(), // YYYY-MM
  totalSales: decimal("total_sales", { precision: 12, scale: 2 }).default("0"),
  totalCash: decimal("total_cash", { precision: 12, scale: 2 }).default("0"),
  totalCard: decimal("total_card", { precision: 12, scale: 2 }).default("0"),
  totalMobile: decimal("total_mobile", { precision: 12, scale: 2 }).default("0"),
  totalTransactions: int("total_transactions").default(0),
  totalReturns: decimal("total_returns", { precision: 12, scale: 2 }).default("0"),
  totalDiscounts: decimal("total_discounts", { precision: 12, scale: 2 }).default("0"),
  totalExpenses: decimal("total_expenses", { precision: 12, scale: 2 }).default("0"),
  netRevenue: decimal("net_revenue", { precision: 12, scale: 2 }).default("0"),
  notes: text("notes"),
  status: text("status").default("closed"), // closed, approved
  createdAt: timestamp("created_at").defaultNow(),
});

// ========== Daily Sequential Numbering ==========

export const dailySequences = mysqlTable("daily_sequences", {
  id: serial("id").primaryKey(),
  scopeKey: text("scope_key").notNull(), // "branch-{id}" for POS, "tenant-{id}" for online orders
  date: text("date").notNull(),          // YYYY-MM-DD in Europe/Zurich timezone
  counter: int("counter").default(0).notNull(),
}, (table) => ({
  uniqScopeDate: unique("daily_seq_scope_date_unique").on(table.scopeKey, table.date),
}));

// ========== Delivery Platform Tables ==========

export const customerAddresses = mysqlTable("customer_addresses", {
  id: serial("id").primaryKey(),
  customerId: int("customer_id").references(() => customers.id, { onDelete: 'cascade' }).notNull(),
  tenantId: int("tenant_id").references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  label: text("label").notNull().default("Home"),
  street: text("street").notNull(),
  buildingName: text("building_name"),
  floor: text("floor"),
  city: text("city").notNull(),
  postalCode: text("postal_code"),
  lat: decimal("lat", { precision: 10, scale: 7 }),
  lng: decimal("lng", { precision: 10, scale: 7 }),
  notes: text("notes"),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const promoCodes = mysqlTable("promo_codes", {
  id: serial("id").primaryKey(),
  tenantId: int("tenant_id").references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  code: varchar("code", { length: 32 }).notNull(),
  description: text("description"),
  discountType: text("discount_type").notNull().default("percent"), // percent | fixed | free_delivery
  discountValue: decimal("discount_value", { precision: 10, scale: 2 }).notNull(),
  minOrderAmount: decimal("min_order_amount", { precision: 10, scale: 2 }).default("0"),
  maxDiscountCap: decimal("max_discount_cap", { precision: 10, scale: 2 }),
  usageLimit: int("usage_limit"),
  usageCount: int("usage_count").default(0),
  perCustomerLimit: int("per_customer_limit").default(1),
  validFrom: timestamp("valid_from"),
  validUntil: timestamp("valid_until"),
  isActive: boolean("is_active").default(true),
  applicableOrderTypes: json("applicable_order_types").$type<string[]>().default(["delivery", "pickup"]),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  uniqTenantCode: unique("promo_tenant_code").on(t.tenantId, t.code),
}));

export const promoCodeUsages = mysqlTable("promo_code_usages", {
  id: serial("id").primaryKey(),
  promoCodeId: int("promo_code_id").references(() => promoCodes.id, { onDelete: 'cascade' }).notNull(),
  customerId: int("customer_id").references(() => customers.id, { onDelete: 'set null' }),
  orderId: int("order_id").references(() => onlineOrders.id, { onDelete: 'set null' }),
  discountApplied: decimal("discount_applied", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const driverLocations = mysqlTable("driver_locations", {
  id: serial("id").primaryKey(),
  vehicleId: int("vehicle_id").references(() => vehicles.id, { onDelete: 'cascade' }).notNull(),
  orderId: int("order_id").references(() => onlineOrders.id, { onDelete: 'set null' }),
  lat: decimal("lat", { precision: 10, scale: 7 }).notNull(),
  lng: decimal("lng", { precision: 10, scale: 7 }).notNull(),
  speed: decimal("speed", { precision: 5, scale: 2 }),
  heading: int("heading"),
  recordedAt: timestamp("recorded_at").defaultNow(),
});

export const loyaltyTransactions = mysqlTable("loyalty_transactions", {
  id: serial("id").primaryKey(),
  customerId: int("customer_id").references(() => customers.id, { onDelete: 'cascade' }).notNull(),
  tenantId: int("tenant_id").references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  orderId: int("order_id").references(() => onlineOrders.id, { onDelete: 'set null' }),
  type: text("type").notNull(), // earn | redeem | expire | bonus | referral
  points: int("points").notNull(),
  balanceBefore: int("balance_before").notNull(),
  balanceAfter: int("balance_after").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const walletTransactions = mysqlTable("wallet_transactions", {
  id: serial("id").primaryKey(),
  customerId: int("customer_id").references(() => customers.id, { onDelete: 'cascade' }).notNull(),
  tenantId: int("tenant_id").references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  orderId: int("order_id").references(() => onlineOrders.id, { onDelete: 'set null' }),
  type: text("type").notNull(), // top_up | payment | refund | bonus
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  balanceBefore: decimal("balance_before", { precision: 10, scale: 2 }).notNull(),
  balanceAfter: decimal("balance_after", { precision: 10, scale: 2 }).notNull(),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const orderRatings = mysqlTable("order_ratings", {
  id: serial("id").primaryKey(),
  orderId: int("order_id").references(() => onlineOrders.id, { onDelete: 'cascade' }).notNull().unique(),
  customerId: int("customer_id").references(() => customers.id, { onDelete: 'set null' }),
  driverId: int("driver_id").references(() => vehicles.id, { onDelete: 'set null' }),
  foodRating: int("food_rating"),
  deliveryRating: int("delivery_rating"),
  overallRating: int("overall_rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const customerSessions = mysqlTable("customer_sessions", {
  id: serial("id").primaryKey(),
  customerId: int("customer_id").references(() => customers.id, { onDelete: 'cascade' }).notNull(),
  tenantId: int("tenant_id").references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  token: varchar("token", { length: 128 }).notNull().unique(),
  deviceInfo: text("device_info"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const otpVerifications = mysqlTable("otp_verifications", {
  id: serial("id").primaryKey(),
  phone: varchar("phone", { length: 32 }).notNull(),
  tenantId: int("tenant_id").references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  otp: varchar("otp", { length: 8 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  attempts: int("attempts").default(0),
  verified: boolean("verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const deliveryZones = mysqlTable("delivery_zones", {
  id: serial("id").primaryKey(),
  tenantId: int("tenant_id").references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  branchId: int("branch_id").references(() => branches.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  nameAr: text("name_ar"),
  polygon: json("polygon").$type<{ lat: number; lng: number }[]>(),
  centerLat: decimal("center_lat", { precision: 10, scale: 7 }),
  centerLng: decimal("center_lng", { precision: 10, scale: 7 }),
  radiusKm: decimal("radius_km", { precision: 5, scale: 2 }),
  deliveryFee: decimal("delivery_fee", { precision: 10, scale: 2 }).default("0"),
  minOrderAmount: decimal("min_order_amount", { precision: 10, scale: 2 }).default("0"),
  estimatedMinutes: int("estimated_minutes").default(30),
  isActive: boolean("is_active").default(true),
  sortOrder: int("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// ========== Delivery Platform Extended Tables ==========

export const customerFavorites = mysqlTable("customer_favorites", {
  id: serial("id").primaryKey(),
  tenantId: int("tenant_id").references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  customerId: int("customer_id").references(() => customers.id, { onDelete: 'cascade' }).notNull(),
  productId: int("product_id").references(() => products.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => ({
  uniqFav: unique("fav_tenant_customer_product").on(t.tenantId, t.customerId, t.productId),
}));

export const productDietaryTags = mysqlTable("product_dietary_tags", {
  id: serial("id").primaryKey(),
  tenantId: int("tenant_id").references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  productId: int("product_id").references(() => products.id, { onDelete: 'cascade' }).notNull(),
  tag: text("tag").notNull(), // vegetarian, vegan, gluten_free, halal, spicy
});

export const helpTickets = mysqlTable("help_tickets", {
  id: serial("id").primaryKey(),
  tenantId: int("tenant_id").references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  customerId: int("customer_id").references(() => customers.id, { onDelete: 'set null' }),
  orderId: int("order_id").references(() => onlineOrders.id, { onDelete: 'set null' }),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  status: text("status").notNull().default("open"), // open, in_progress, resolved, closed
  priority: text("priority").default("normal"), // low, normal, high, urgent
  response: text("response"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const faqEntries = mysqlTable("faq_entries", {
  id: serial("id").primaryKey(),
  tenantId: int("tenant_id").references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  question: text("question").notNull(),
  questionAr: text("question_ar"),
  answer: text("answer").notNull(),
  answerAr: text("answer_ar"),
  category: text("category").default("general"), // general, orders, delivery, payment, account
  sortOrder: int("sort_order").default(0),
  isActive: boolean("is_active").default(true),
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
export const insertCallSchema = createInsertSchema(calls).omit({ id: true, createdAt: true });
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
export const insertOnlineOrderSchema = createInsertSchema(onlineOrders).omit({ id: true, createdAt: true, updatedAt: true });
export const insertLandingPageConfigSchema = createInsertSchema(landingPageConfig).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPlatformSettingSchema = createInsertSchema(platformSettings).omit({ id: true, updatedAt: true });
export const insertPlatformCommissionSchema = createInsertSchema(platformCommissions).omit({ id: true, createdAt: true });
export type InsertPlatformSetting = z.infer<typeof insertPlatformSettingSchema>;
export type InsertPlatformCommission = z.infer<typeof insertPlatformCommissionSchema>;

export const insertVehicleSchema = createInsertSchema(vehicles).omit({ id: true, createdAt: true });
export const insertPrinterConfigSchema = createInsertSchema(printerConfigs).omit({ id: true, updatedAt: true });
export const insertDailyClosingSchema = createInsertSchema(dailyClosings).omit({ id: true, createdAt: true });
export const insertMonthlyClosingSchema = createInsertSchema(monthlyClosings).omit({ id: true, createdAt: true });

export type Vehicle = typeof vehicles.$inferSelect;
export type InsertVehicle = z.infer<typeof insertVehicleSchema>;
export type PrinterConfig = typeof printerConfigs.$inferSelect;
export type InsertPrinterConfig = z.infer<typeof insertPrinterConfigSchema>;
export type DailyClosing = typeof dailyClosings.$inferSelect;
export type InsertDailyClosing = z.infer<typeof insertDailyClosingSchema>;
export type MonthlyClosing = typeof monthlyClosings.$inferSelect;
export type InsertMonthlyClosing = z.infer<typeof insertMonthlyClosingSchema>;

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
export type Call = typeof calls.$inferSelect;
export type InsertCall = z.infer<typeof insertCallSchema>;
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
export type OnlineOrder = typeof onlineOrders.$inferSelect;
export type InsertOnlineOrder = z.infer<typeof insertOnlineOrderSchema>;
export type LandingPageConfig = typeof landingPageConfig.$inferSelect;
export type InsertLandingPageConfig = z.infer<typeof insertLandingPageConfigSchema>;

// ── Delivery Platform Insert Schemas ──
export const insertCustomerAddressSchema = createInsertSchema(customerAddresses).omit({ id: true, createdAt: true });
export const insertPromoCodeSchema = createInsertSchema(promoCodes).omit({ id: true, createdAt: true });
export const insertPromoCodeUsageSchema = createInsertSchema(promoCodeUsages).omit({ id: true, createdAt: true });
export const insertDriverLocationSchema = createInsertSchema(driverLocations).omit({ id: true, recordedAt: true });
export const insertLoyaltyTransactionSchema = createInsertSchema(loyaltyTransactions).omit({ id: true, createdAt: true });
export const insertWalletTransactionSchema = createInsertSchema(walletTransactions).omit({ id: true, createdAt: true });
export const insertOrderRatingSchema = createInsertSchema(orderRatings).omit({ id: true, createdAt: true });
export const insertCustomerSessionSchema = createInsertSchema(customerSessions).omit({ id: true, createdAt: true });
export const insertOtpVerificationSchema = createInsertSchema(otpVerifications).omit({ id: true, createdAt: true });
export const insertDeliveryZoneSchema = createInsertSchema(deliveryZones).omit({ id: true, createdAt: true });
export const insertCustomerFavoriteSchema = createInsertSchema(customerFavorites).omit({ id: true, createdAt: true });
export const insertProductDietaryTagSchema = createInsertSchema(productDietaryTags).omit({ id: true });
export const insertHelpTicketSchema = createInsertSchema(helpTickets).omit({ id: true, createdAt: true, updatedAt: true });
export const insertFaqEntrySchema = createInsertSchema(faqEntries).omit({ id: true, createdAt: true });

// ── Delivery Platform Types ──
export type CustomerAddress = typeof customerAddresses.$inferSelect;
export type InsertCustomerAddress = z.infer<typeof insertCustomerAddressSchema>;
export type PromoCode = typeof promoCodes.$inferSelect;
export type InsertPromoCode = z.infer<typeof insertPromoCodeSchema>;
export type PromoCodeUsage = typeof promoCodeUsages.$inferSelect;
export type InsertPromoCodeUsage = z.infer<typeof insertPromoCodeUsageSchema>;
export type DriverLocation = typeof driverLocations.$inferSelect;
export type InsertDriverLocation = z.infer<typeof insertDriverLocationSchema>;
export type LoyaltyTransaction = typeof loyaltyTransactions.$inferSelect;
export type InsertLoyaltyTransaction = z.infer<typeof insertLoyaltyTransactionSchema>;
export type WalletTransaction = typeof walletTransactions.$inferSelect;
export type InsertWalletTransaction = z.infer<typeof insertWalletTransactionSchema>;
export type OrderRating = typeof orderRatings.$inferSelect;
export type InsertOrderRating = z.infer<typeof insertOrderRatingSchema>;
export type CustomerSession = typeof customerSessions.$inferSelect;
export type InsertCustomerSession = z.infer<typeof insertCustomerSessionSchema>;
export type OtpVerification = typeof otpVerifications.$inferSelect;
export type InsertOtpVerification = z.infer<typeof insertOtpVerificationSchema>;
export type DeliveryZone = typeof deliveryZones.$inferSelect;
export type InsertDeliveryZone = z.infer<typeof insertDeliveryZoneSchema>;
export type CustomerFavorite = typeof customerFavorites.$inferSelect;
export type InsertCustomerFavorite = z.infer<typeof insertCustomerFavoriteSchema>;
export type ProductDietaryTag = typeof productDietaryTags.$inferSelect;
export type InsertProductDietaryTag = z.infer<typeof insertProductDietaryTagSchema>;
export type HelpTicket = typeof helpTickets.$inferSelect;
export type InsertHelpTicket = z.infer<typeof insertHelpTicketSchema>;
export type FaqEntry = typeof faqEntries.$inferSelect;
export type InsertFaqEntry = z.infer<typeof insertFaqEntrySchema>;
