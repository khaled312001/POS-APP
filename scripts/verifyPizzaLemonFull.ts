/**
 * Full verification of Pizza Lemon store in production database.
 * Shows both stores, all license keys, all employees, and product counts.
 */
import { db } from "../server/db";
import { tenants, licenseKeys, branches, employees, products } from "../shared/schema";
import { eq, inArray } from "drizzle-orm";
import bcrypt from "bcrypt";
import { pool } from "../server/db";

(async () => {
    console.log("=== PIZZA LEMON FULL VERIFICATION ===\n");

    const pizzaLemonTenants = await db.select().from(tenants)
        .where(eq(tenants.businessName, "Pizza Lemon"));

    for (const t of pizzaLemonTenants) {
        console.log(`\n📦 STORE: ${t.businessName} (ID ${t.id})`);
        console.log(`   Email:   ${t.ownerEmail}`);
        console.log(`   Status:  ${t.status}`);

        // Verify password
        if (t.passwordHash) {
            const pw123 = await bcrypt.compare("pizzalemon123", t.passwordHash);
            const store123 = await bcrypt.compare("store123", t.passwordHash);
            console.log(`   Password 'pizzalemon123': ${pw123 ? "✅ VALID" : "❌ INVALID"}`);
            console.log(`   Password 'store123':      ${store123 ? "✅ VALID" : "❌ INVALID"}`);
        } else {
            console.log("   ⚠️  No password hash");
        }

        // License keys
        const keys = await db.select().from(licenseKeys).where(eq(licenseKeys.tenantId, t.id));
        console.log(`   License keys (${keys.filter(k => k.status === "active").length} active):`);
        keys.forEach(k => console.log(`     ${k.status === "active" ? "✅" : "❌"} ${k.licenseKey} | expires: ${k.expiresAt}`));

        // Branches
        const brs = await db.select().from(branches).where(eq(branches.tenantId, t.id));
        console.log(`   Branches: ${brs.length}`);

        // Employees
        if (brs.length > 0) {
            const branchIds = brs.map(b => b.id);
            const emps = await db.select().from(employees).where(inArray(employees.branchId, branchIds));
            console.log(`   Employees: ${emps.length}`);
            emps.forEach(e => console.log(`     - ${e.name} (${e.role}) PIN: ${e.pin}`));
        }

        // Products
        const prods = await db.select().from(products).where(eq(products.tenantId, t.id));
        console.log(`   Products: ${prods.length}`);
    }

    console.log("\n=== DONE ===");
    await pool.end();
})().catch(e => { console.error(e); process.exit(1); });
