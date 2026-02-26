import { db } from "./db";
import { eq, sql } from "drizzle-orm";
import {
    branches, employees, categories, products, inventory,
    customers, sales, saleItems, suppliers, purchaseOrders,
    purchaseOrderItems, shifts, expenses, tables, kitchenOrders,
    tenants, tenantSubscriptions, licenseKeys, tenantNotifications,
    superAdmins, activityLog, notifications, warehouses,
    cashDrawerOperations, returns, returnItems,
    productBatches, inventoryMovements, stockCounts, stockCountItems,
    supplierContracts, employeeCommissions
} from "@shared/schema";
import * as crypto from "crypto";
import bcrypt from "bcrypt";
import { addDays, addMonths } from "date-fns";

// Helper
function rand(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick<T>(arr: T[]): T { return arr[rand(0, arr.length - 1)]; }
function uuid() { return crypto.randomUUID().split("-")[0].toUpperCase(); }

const DEMO_STORES = [
    { biz: "Glow Beauty Salon", owner: "Sara Ahmed", email: "sara@glow.com", phone: "+201001234567" },
    { biz: "The Gentlemen's Barber", owner: "Mohamed Ali", email: "mohamed@barber.com", phone: "+201009876543" },
    { biz: "Serenity Wellness Spa", owner: "Nour Hassan", email: "nour@serenity.com", phone: "+201005551234" },
];

const CATEGORY_NAMES = [
    { name: "Beverages", nameAr: "مشروبات", color: "#3B82F6", icon: "coffee" },
    { name: "Food", nameAr: "طعام", color: "#EF4444", icon: "utensils" },
    { name: "Electronics", nameAr: "إلكترونيات", color: "#8B5CF6", icon: "smartphone" },
    { name: "Beauty", nameAr: "تجميل", color: "#EC4899", icon: "sparkles" },
    { name: "Clothing", nameAr: "ملابس", color: "#F59E0B", icon: "shirt" },
];

const PRODUCT_NAMES: Record<string, { name: string; nameAr: string; price: number; cost: number }[]> = {
    Beverages: [
        { name: "Espresso", nameAr: "إسبريسو", price: 3.50, cost: 0.80 },
        { name: "Cappuccino", nameAr: "كابتشينو", price: 4.50, cost: 1.20 },
        { name: "Fresh Orange Juice", nameAr: "عصير برتقال", price: 5.00, cost: 1.50 },
        { name: "Green Tea", nameAr: "شاي أخضر", price: 3.00, cost: 0.50 },
        { name: "Iced Latte", nameAr: "لاتيه مثلج", price: 5.50, cost: 1.30 },
        { name: "Smoothie Bowl", nameAr: "سموثي بول", price: 7.00, cost: 2.00 },
    ],
    Food: [
        { name: "Grilled Chicken Sandwich", nameAr: "ساندويتش دجاج مشوي", price: 8.50, cost: 3.50 },
        { name: "Caesar Salad", nameAr: "سلطة سيزر", price: 7.00, cost: 2.50 },
        { name: "Margherita Pizza", nameAr: "بيتزا مارغريتا", price: 12.00, cost: 4.00 },
        { name: "Beef Burger", nameAr: "برجر لحم", price: 10.50, cost: 4.50 },
        { name: "Pasta Alfredo", nameAr: "باستا ألفريدو", price: 9.00, cost: 3.00 },
    ],
    Electronics: [
        { name: "USB-C Cable", nameAr: "كيبل يو إس بي سي", price: 8.00, cost: 2.00 },
        { name: "Phone Case", nameAr: "كفر موبايل", price: 12.00, cost: 3.00 },
        { name: "Wireless Earbuds", nameAr: "سماعات لاسلكية", price: 35.00, cost: 15.00 },
        { name: "Power Bank 10000mAh", nameAr: "باور بانك", price: 25.00, cost: 10.00 },
    ],
    Beauty: [
        { name: "Hair Styling Gel", nameAr: "جل شعر", price: 15.00, cost: 5.00 },
        { name: "Facial Cream", nameAr: "كريم وجه", price: 22.00, cost: 8.00 },
        { name: "Shampoo 500ml", nameAr: "شامبو ٥٠٠مل", price: 18.00, cost: 6.00 },
        { name: "Nail Polish Set", nameAr: "مجموعة مناكير", price: 12.00, cost: 3.50 },
        { name: "Body Lotion", nameAr: "لوشن جسم", price: 20.00, cost: 7.00 },
    ],
    Clothing: [
        { name: "Cotton T-Shirt", nameAr: "تيشيرت قطن", price: 15.00, cost: 5.00 },
        { name: "Denim Jeans", nameAr: "جينز", price: 35.00, cost: 15.00 },
        { name: "Baseball Cap", nameAr: "كاب", price: 10.00, cost: 3.00 },
        { name: "Leather Belt", nameAr: "حزام جلد", price: 18.00, cost: 6.00 },
    ],
};

const CUSTOMER_NAMES = [
    { name: "Ahmed Hassan", email: "ahmed@email.com", phone: "+201111111111" },
    { name: "Fatima Ali", email: "fatima@email.com", phone: "+201222222222" },
    { name: "Omar Khaled", email: "omar@email.com", phone: "+201333333333" },
    { name: "Layla Mohamed", email: "layla@email.com", phone: "+201444444444" },
    { name: "Youssef Ibrahim", email: "youssef@email.com", phone: "+201555555555" },
    { name: "Mona Samir", email: "mona@email.com", phone: "+201666666666" },
    { name: "Karim Nasser", email: "karim@email.com", phone: "+201777777777" },
    { name: "Hana Mahmoud", email: "hana@email.com", phone: "+201888888888" },
];

const SUPPLIER_NAMES = [
    { name: "Global Supplies Co.", contact: "John Smith", email: "john@global.com", phone: "+1555111" },
    { name: "Fresh Farms LLC", contact: "Ali Mostafa", email: "ali@freshfarms.com", phone: "+1555222" },
    { name: "Tech Wholesale Inc.", contact: "David Lee", email: "david@techwholesale.com", phone: "+1555333" },
    { name: "Beauty World Dist.", contact: "Lina Adel", email: "lina@beautyworld.com", phone: "+1555444" },
];

export async function seedAllDemoData() {
    console.log("[SEED] Starting comprehensive demo data seeding...");

    // 1. Ensure Super Admin exists
    const [saCount] = await db.select({ count: sql<number>`count(*)` }).from(superAdmins);
    if (Number(saCount.count) === 0) {
        const hash = await bcrypt.hash("admin123", 10);
        await db.insert(superAdmins).values({
            name: "System Admin",
            email: "admin@barmagly.com",
            passwordHash: hash,
            role: "super_admin",
            isActive: true,
        });
        console.log("[SEED] Created super admin: admin@barmagly.com / admin123");
    }

    // 2. Create Demo Tenants if none exist
    const [tenantCount] = await db.select({ count: sql<number>`count(*)` }).from(tenants);
    if (Number(tenantCount.count) < 3) {
        for (const store of DEMO_STORES) {
            const hash = await bcrypt.hash("store123", 10);
            const [tenant] = await db.insert(tenants).values({
                businessName: store.biz,
                ownerName: store.owner,
                ownerEmail: store.email,
                ownerPhone: store.phone,
                passwordHash: hash,
                status: "active",
                maxBranches: 5,
                maxEmployees: 20,
            }).returning();

            // Subscription
            const endDate = addMonths(new Date(), 12);
            const [sub] = await db.insert(tenantSubscriptions).values({
                tenantId: tenant.id,
                planType: pick(["monthly", "yearly", "trial"]),
                planName: pick(["Basic", "Professional", "Enterprise"]),
                price: pick(["9.99", "29.99", "99.99"]),
                status: "active",
                startDate: new Date(),
                endDate,
                autoRenew: true,
            }).returning();

            // License Key
            const key = `BRM-${uuid()}-${uuid()}-${uuid()}`;
            await db.insert(licenseKeys).values({
                licenseKey: key,
                tenantId: tenant.id,
                subscriptionId: sub.id,
                status: "active",
                activatedAt: new Date(),
                expiresAt: endDate,
                maxActivations: 3,
                currentActivations: 1,
            });

            // Notification
            await db.insert(tenantNotifications).values({
                tenantId: tenant.id,
                type: "info",
                title: "Welcome to Barmagly POS!",
                message: `Welcome ${store.owner}! Your store "${store.biz}" has been set up successfully.`,
                priority: "normal",
            });
        }
        console.log("[SEED] Created demo tenants.");
    }

    // 3. Get all tenants to ensure they have data
    const allTenants = await db.select().from(tenants);

    for (const t of allTenants) {
        console.log(`[SEED] Ensuring data for tenant: ${t.businessName} (ID: ${t.id})`);

        // Categories (global)
        const existingCats = await db.select().from(categories);
        if (existingCats.length === 0) {
            for (const cat of CATEGORY_NAMES) {
                await db.insert(categories).values({
                    name: cat.name,
                    nameAr: cat.nameAr,
                    color: cat.color,
                    icon: cat.icon,
                    isActive: true,
                });
            }
        }
        const currentCategories = await db.select().from(categories);

        // Branches
        let tenantBranches = await db.select().from(branches).where(eq(branches.tenantId, t.id));
        if (tenantBranches.length === 0) {
            const branchNames = ["Main Branch", "Downtown Branch", "Mall Branch"];
            for (let i = 0; i < rand(1, 3); i++) {
                await db.insert(branches).values({
                    tenantId: t.id,
                    name: branchNames[i],
                    address: `${rand(1, 999)} ${pick(["Main St", "Oak Ave", "Market Rd", "King Fahd Blvd"])}`,
                    phone: `+201${rand(100000000, 999999999)}`,
                    email: `branch${i + 1}_${t.id}@store.com`,
                    isActive: true,
                    isMain: i === 0,
                    currency: "USD",
                    taxRate: "5.00",
                });
            }
            tenantBranches = await db.select().from(branches).where(eq(branches.tenantId, t.id));
        }
        const branchIds = tenantBranches.map(b => b.id);

        if (branchIds.length === 0) continue; // Should not happen with above logic

        // Warehouses
        for (const bId of branchIds) {
            const [existingWH] = await db.select().from(warehouses).where(eq(warehouses.branchId, bId)).limit(1);
            if (!existingWH) {
                await db.insert(warehouses).values({
                    name: `Warehouse - Branch ${bId}`,
                    branchId: bId,
                    isDefault: true,
                    isActive: true,
                });
            }
        }

        // Employees
        let tenantEmployees = await db.select().from(employees).where(sql`${employees.branchId} IN (${sql.join(branchIds, sql`, `)})`);
        if (tenantEmployees.length === 0) {
            const roles = ["admin", "manager", "cashier", "cashier"];
            const empNames = ["Ahmed Manager", "Fatima Cashier", "Omar Staff", "Sara Admin"];
            for (let i = 0; i < roles.length; i++) {
                await db.insert(employees).values({
                    name: empNames[i],
                    email: `emp${i + 1}_${t.id}@store.com`,
                    phone: `+201${rand(100000000, 999999999)}`,
                    pin: String(1000 + i + t.id),
                    role: roles[i],
                    branchId: pick(branchIds),
                    isActive: true,
                    hourlyRate: String(rand(10, 25)),
                    commissionRate: "2.50",
                });
            }
            tenantEmployees = await db.select().from(employees).where(sql`${employees.branchId} IN (${sql.join(branchIds, sql`, `)})`);
        }
        const employeeIds = tenantEmployees.map(e => e.id);

        // Products
        let tenantProducts = await db.select().from(products).where(eq(products.tenantId, t.id));
        if (tenantProducts.length === 0) {
            for (const cat of currentCategories) {
                const prods = PRODUCT_NAMES[cat.name] || [];
                for (const p of prods) {
                    await db.insert(products).values({
                        tenantId: t.id,
                        name: p.name,
                        nameAr: p.nameAr,
                        sku: `SKU-${t.id}-${uuid()}`,
                        barcode: `${rand(1000000000000, 9999999999999)}`,
                        categoryId: cat.id,
                        price: String(p.price),
                        costPrice: String(p.cost),
                        unit: "piece",
                        taxable: true,
                        trackInventory: true,
                        isActive: true,
                    });
                }
            }
            tenantProducts = await db.select().from(products).where(eq(products.tenantId, t.id));
        }
        const productIds = tenantProducts.map(p => p.id);

        // Inventory
        for (const pId of productIds) {
            for (const bId of branchIds) {
                const [existingInv] = await db.select().from(inventory).where(sql`${inventory.productId} = ${pId} AND ${inventory.branchId} = ${bId}`);
                if (!existingInv) {
                    await db.insert(inventory).values({
                        productId: pId,
                        branchId: bId,
                        quantity: rand(10, 200),
                        lowStockThreshold: 10,
                        reorderPoint: 5,
                        reorderQuantity: 50,
                    });
                }
            }
        }

        // Customers
        const [custCount] = await db.select({ count: sql<number>`count(*)` }).from(customers);
        if (Number(custCount.count) < 10) {
            for (const cust of CUSTOMER_NAMES) {
                await db.insert(customers).values({
                    name: cust.name,
                    email: `${cust.email.split("@")[0]}_${t.id}@email.com`,
                    phone: cust.phone,
                    loyaltyPoints: rand(0, 500),
                    totalSpent: String(rand(50, 5000)),
                    visitCount: rand(1, 30),
                    isActive: true,
                });
            }
        }
        const customerIds = (await db.select().from(customers)).map(c => c.id);

        // Suppliers
        const [supCount] = await db.select({ count: sql<number>`count(*)` }).from(suppliers);
        if (Number(supCount.count) < 5) {
            for (const sup of SUPPLIER_NAMES) {
                await db.insert(suppliers).values({
                    name: sup.name,
                    contactName: sup.contact,
                    email: sup.email,
                    phone: sup.phone,
                    isActive: true,
                });
            }
        }
        const supplierIds = (await db.select().from(suppliers)).map(s => s.id);

        // Sales & Kitchen Orders
        const [saleCount] = await db.select({ count: sql<number>`count(*)` }).from(sales).where(sql`${sales.branchId} IN (${sql.join(branchIds, sql`, `)})`);
        if (Number(saleCount.count) < 10) {
            for (let i = 0; i < rand(5, 15); i++) {
                const bId = pick(branchIds);
                const empId = pick(employeeIds);
                const custId = pick(customerIds);
                const pId = pick(productIds);
                const product = tenantProducts.find(p => p.id === pId);

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
                    createdAt: addDays(new Date(), -rand(0, 30)),
                }).returning();

                await db.insert(saleItems).values({
                    saleId: sale.id,
                    productId: pId,
                    productName: product?.name || "Product",
                    quantity: qty,
                    unitPrice: String(unitPrice),
                    total: String(total),
                });

                // Kitchen Order
                if (rand(1, 2) === 1) {
                    await db.insert(kitchenOrders).values({
                        saleId: sale.id,
                        branchId: bId,
                        status: pick(["pending", "preparing", "ready", "served"]),
                        items: [{ name: product?.name || "Product", quantity: qty, notes: "Demo order", status: "pending" }],
                        priority: "normal",
                    });
                }

                // Returns
                if (rand(1, 10) === 1) {
                    const [ret] = await db.insert(returns).values({
                        originalSaleId: sale.id,
                        employeeId: empId,
                        reason: "Defective",
                        totalAmount: String(total),
                        branchId: bId,
                        status: "completed",
                    }).returning();

                    await db.insert(returnItems).values({
                        returnId: ret.id,
                        productId: pId,
                        productName: product?.name || "Product",
                        quantity: qty,
                        unitPrice: String(unitPrice),
                        total: String(total),
                    });
                }

                // Commission
                await db.insert(employeeCommissions).values({
                    employeeId: empId,
                    saleId: sale.id,
                    commissionRate: "2.50",
                    commissionAmount: String((total * 0.025).toFixed(2)),
                    status: "pending",
                });
            }
        }

        // Shifts
        for (const eId of employeeIds) {
            const [existingShift] = await db.select().from(shifts).where(eq(shifts.employeeId, eId)).limit(1);
            if (!existingShift) {
                const bId = pick(branchIds);
                const [shift] = await db.insert(shifts).values({
                    employeeId: eId,
                    branchId: bId,
                    startTime: addDays(new Date(), -1),
                    endTime: new Date(),
                    openingCash: "500.00",
                    closingCash: "1200.00",
                    totalSales: "700.00",
                    totalTransactions: 10,
                    status: "closed",
                }).returning();

                await db.insert(cashDrawerOperations).values({
                    shiftId: shift.id,
                    employeeId: eId,
                    type: "cash_in",
                    amount: "500.00",
                    reason: "Opening balance",
                });
            }
        }

        // Tables
        for (const bId of branchIds) {
            const [existingTable] = await db.select().from(tables).where(eq(tables.branchId, bId)).limit(1);
            if (!existingTable) {
                for (let i = 1; i <= 5; i++) {
                    await db.insert(tables).values({
                        branchId: bId,
                        name: `T-${i}`,
                        capacity: pick([2, 4, 6]),
                        status: "available",
                    });
                }
            }
        }

        // Expenses
        const [expCount] = await db.select({ count: sql<number>`count(*)` }).from(expenses).where(sql`${expenses.branchId} IN (${sql.join(branchIds, sql`, `)})`);
        if (Number(expCount.count) < 3) {
            for (let i = 0; i < 3; i++) {
                await db.insert(expenses).values({
                    branchId: pick(branchIds),
                    category: pick(["Rent", "Utilities", "Supplies"]),
                    amount: String(rand(100, 500)),
                    description: "Demo expense",
                    date: addDays(new Date(), -rand(0, 30)),
                    employeeId: pick(employeeIds),
                });
            }
        }

        // Batches & Movements
        for (const pId of productIds) {
            const [existingBatch] = await db.select().from(productBatches).where(eq(productBatches.productId, pId)).limit(1);
            if (!existingBatch) {
                const bId = pick(branchIds);
                await db.insert(productBatches).values({
                    productId: pId,
                    batchNumber: `BAT-${uuid()}`,
                    quantity: 100,
                    costPrice: "5.00",
                    branchId: bId,
                    supplierId: pick(supplierIds),
                    receivedDate: new Date(),
                });

                await db.insert(inventoryMovements).values({
                    productId: pId,
                    branchId: bId,
                    type: "receiving",
                    quantity: 100,
                    newQuantity: 100,
                    notes: "Initial stock load",
                    employeeId: pick(employeeIds),
                });
            }
        }

        // Stock Counts
        for (const bId of branchIds) {
            const [existingSC] = await db.select().from(stockCounts).where(eq(stockCounts.branchId, bId)).limit(1);
            if (!existingSC) {
                const [sc] = await db.insert(stockCounts).values({
                    branchId: bId,
                    employeeId: pick(employeeIds),
                    status: "completed",
                    totalItems: 5,
                    discrepancies: 0,
                    completedAt: new Date(),
                }).returning();

                await db.insert(stockCountItems).values({
                    stockCountId: sc.id,
                    productId: pick(productIds),
                    systemQuantity: 100,
                    actualQuantity: 100,
                    difference: 0,
                });
            }
        }

        // Global Tenant Activity Log
        await db.insert(activityLog).values({
            employeeId: pick(employeeIds),
            action: "seed_data",
            entityType: "tenant",
            entityId: t.id,
            details: "Comprehensive demo data seeded",
            createdAt: new Date(),
        });

        // Notifications
        await db.insert(notifications).values({
            recipientId: pick(employeeIds),
            type: "info",
            title: "Data Seeding Complete",
            message: "Your store has been populated with demo data.",
            priority: "low",
        });

        console.log(`[SEED] Completed seeding for: ${t.businessName}`);
    }

    console.log("[SEED] ✅ All demo data seeded successfully!");
}
