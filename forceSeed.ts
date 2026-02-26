import { storage } from "./server/storage";
import { db } from "./server/db";
import { tenants } from "@shared/schema";
import { sql } from "drizzle-orm";

async function forceSeed() {
    console.log("Checking current tenants...");
    const tCount = await db.select({ count: sql`count(*)` }).from(tenants);
    console.log("Current tenant count:", tCount[0].count);

    console.log("Starting force seed...");
    try {
        // We'll call the internal method but without the guard if possible, 
        // or just call it and log result.
        // Since I can't easily modify the method here without re-writing logic,
        // I'll just check why it might skip.

        const result = await storage.seedSuperAdminData();
        console.log("Seed result:", result);

        const tCountAfter = await db.select({ count: sql`count(*)` }).from(tenants);
        console.log("Tenant count after seed:", tCountAfter[0].count);

        if (tCountAfter[0].count === "0" || tCountAfter[0].count === 0) {
            console.log("Seed failed to create tenants. Investigating storage.createTenant...");
        }
    } catch (err) {
        console.error("Seed error:", err);
    }
    process.exit(0);
}

forceSeed();
