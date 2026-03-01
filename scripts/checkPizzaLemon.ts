import { db } from "../server/db";
import { tenants, licenseKeys, tenantSubscriptions } from "../shared/schema";
import { eq } from "drizzle-orm";
import { pool } from "../server/db";

(async () => {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.ownerEmail, "admin@pizzalemon.ch"));
    if (!tenant) {
        console.log("TENANT: NOT FOUND");
        process.exit(0);
    }
    console.log("TENANT:", JSON.stringify({ id: tenant.id, businessName: tenant.businessName, ownerEmail: tenant.ownerEmail, status: tenant.status }, null, 2));

    const licenses = await db.select().from(licenseKeys).where(eq(licenseKeys.tenantId, tenant.id));
    console.log("LICENSE KEYS:", JSON.stringify(licenses.map(l => ({
        licenseKey: l.licenseKey,
        status: l.status,
        expiresAt: l.expiresAt,
        maxActivations: l.maxActivations,
        currentActivations: l.currentActivations,
    })), null, 2));

    const subs = await db.select().from(tenantSubscriptions).where(eq(tenantSubscriptions.tenantId, tenant.id));
    console.log("SUBSCRIPTIONS:", JSON.stringify(subs.map(s => ({
        planType: s.planType,
        status: s.status,
        endDate: s.endDate,
    })), null, 2));

    await pool.end();
})().catch(e => { console.error(e); process.exit(1); });
