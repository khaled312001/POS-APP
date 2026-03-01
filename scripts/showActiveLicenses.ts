import { db } from "../server/db";
import { tenants, licenseKeys } from "../shared/schema";
import { eq } from "drizzle-orm";
import { pool } from "../server/db";

(async () => {
    const allLicenses = await db.select({
        businessName: tenants.businessName,
        ownerEmail: tenants.ownerEmail,
        tenantStatus: tenants.status,
        licenseKey: licenseKeys.licenseKey,
        keyStatus: licenseKeys.status,
        expiresAt: licenseKeys.expiresAt,
        tenantId: tenants.id,
    })
    .from(licenseKeys)
    .innerJoin(tenants, eq(licenseKeys.tenantId, tenants.id))
    .where(eq(licenseKeys.status, "active"));

    console.log("ALL ACTIVE LICENSE KEYS in database:");
    allLicenses.forEach(r => console.log("  ", JSON.stringify(r)));
    await pool.end();
})().catch(e => { console.error(e); process.exit(1); });
