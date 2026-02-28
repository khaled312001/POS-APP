import 'dotenv/config';
import { db, pool } from './server/db.js';
import { tenants, licenseKeys } from './shared/schema.js';

async function check() {
    console.log("Checking remote DB...");
    const keys = await db.select().from(licenseKeys);
    console.log("All Keys:");
    keys.forEach(k => console.log(k.id, k.licenseKey, k.tenantId));

    const allTenants = await db.select().from(tenants);
    console.log("All Tenants:");
    allTenants.forEach(t => console.log(t.id, t.businessName, t.ownerEmail));

    process.exit(0);
}

check().catch(e => {
    console.error(e);
    process.exit(1);
});
