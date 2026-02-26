import pg from "pg";
const { Client } = pg;

async function findCredentials() {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    try {
        const tenantsRes = await client.query('SELECT id, "businessName", "ownerEmail" FROM tenants');
        console.log("--- TEST CREDENTIALS ---");
        for (const tenant of tenantsRes.rows) {
            const licensesRes = await client.query('SELECT "licenseKey" FROM license_keys WHERE "tenantId" = $1', [tenant.id]);
            console.log(`Store: ${tenant.businessName}`);
            console.log(`Email: ${tenant.ownerEmail}`);
            console.log(`Password: admin123 (Default)`);
            console.log(`Licenses: ${licensesRes.rows.map(l => l.licenseKey).join(", ")}`);
            console.log("------------------------");
        }
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

findCredentials();
