import { db } from "./server/db";
import { tenants } from "@shared/schema";
import { sql } from "drizzle-orm";

async function check() {
    try {
        const result = await db.select({ count: sql`count(*)` }).from(tenants);
        console.log("Tenant Count:", result[0].count);
    } catch (err) {
        console.error("Error checking tenants:", err);
    }
    process.exit(0);
}

check();
