import { db } from "./server/db";
import { tenants, tenantSubscriptions, licenseKeys } from "@shared/schema";
import * as fs from "fs";

async function debug() {
    const result: any = {};
    try {
        result.tenants = await db.select().from(tenants);
        result.subscriptions = await db.select().from(tenantSubscriptions);
        result.licenseKeys = await db.select().from(licenseKeys);

        fs.writeFileSync("db_debug.json", JSON.stringify(result, null, 2));
        console.log("Debug data written to db_debug.json");
        console.log("Tenants found:", result.tenants.length);
    } catch (err: any) {
        fs.writeFileSync("db_debug_error.txt", err.message);
        console.error("Error during debug:", err);
    }
    process.exit(0);
}

debug();
