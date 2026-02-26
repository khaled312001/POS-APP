import { db } from "./server/db";
import { sql } from "drizzle-orm";
import {
    tenants, branches, employees, categories, products,
    inventory, customers, sales, saleItems, suppliers,
    purchaseOrders, shifts, expenses, tables, kitchenOrders,
    activityLog, notifications, warehouses, cashDrawerOperations,
    returns, returnItems, productBatches, inventoryMovements,
    stockCounts, stockCountItems, supplierContracts,
    employeeCommissions
} from "./shared/schema";

async function verify() {
    console.log("--- Seeding Verification ---");

    const tables_to_check = [
        { name: "tenants", table: tenants },
        { name: "branches", table: branches },
        { name: "employees", table: employees },
        { name: "categories", table: categories },
        { name: "products", table: products },
        { name: "inventory", table: inventory },
        { name: "customers", table: customers },
        { name: "suppliers", table: suppliers },
        { name: "sales", table: sales },
        { name: "saleItems", table: saleItems },
        { name: "kitchenOrders", table: kitchenOrders },
        { name: "returns", table: returns },
        { name: "returnItems", table: returnItems },
        { name: "shifts", table: shifts },
        { name: "expenses", table: expenses },
        { name: "tables", table: tables },
        { name: "warehouses", table: warehouses },
        { name: "cashDrawerOperations", table: cashDrawerOperations },
        { name: "activityLog", table: activityLog },
        { name: "notifications", table: notifications },
        { name: "productBatches", table: productBatches },
        { name: "inventoryMovements", table: inventoryMovements },
        { name: "stockCounts", table: stockCounts },
        { name: "stockCountItems", table: stockCountItems },
        { name: "supplierContracts", table: supplierContracts },
        { name: "employeeCommissions", table: employeeCommissions }
    ];

    for (const t of tables_to_check) {
        try {
            const [res] = await db.select({ count: sql<number>`count(*)` }).from(t.table);
            console.log(`${t.name.padEnd(25)}: ${res.count}`);
        } catch (e: any) {
            console.log(`${t.name.padEnd(25)}: ERROR - ${e.message}`);
        }
    }

    process.exit(0);
}

verify();
