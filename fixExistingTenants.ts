import pg from "pg";
const { Client } = pg;

async function fixTenants() {
    console.log("Connecting...");
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    console.log("Connected.");

    try {
        const tenantsRes = await client.query('SELECT id, "businessName", "ownerName", "ownerEmail", "ownerPhone", address FROM tenants');
        console.log(`Found ${tenantsRes.rowCount} tenants.`);

        for (const tenant of tenantsRes.rows) {
            // Check if they have branches
            const branchRes = await client.query('SELECT id FROM branches WHERE "tenantId" = $1', [tenant.id]);
            if (branchRes.rowCount === 0) {
                console.log(`Fixing Tenant ${tenant.id} (${tenant.businessName})...`);

                // Create Branch
                const newBranchRes = await client.query(
                    'INSERT INTO branches ("tenantId", name, address, phone, "isMain", currency, "tax_rate") VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
                    [tenant.id, "Main Branch", tenant.address || "Main Street", tenant.ownerPhone || "123456789", true, "USD", "10"]
                );
                const branchId = newBranchRes.rows[0].id;

                // Create Admin Employee
                await client.query(
                    'INSERT INTO employees (name, email, phone, pin, role, "branch_id", permissions) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                    [tenant.ownerName.split(" ")[0] || "Admin", tenant.ownerEmail, tenant.ownerPhone, "1234", "admin", branchId, JSON.stringify(["all"])]
                );

                console.log(` - Created Branch ID ${branchId} and Admin account (PIN: 1234).`);
            } else {
                console.log(`Tenant ${tenant.id} already has ${branchRes.rowCount} branches. Skipping.`);
            }
        }

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
        console.log("Done.");
        process.exit(0);
    }
}

fixTenants();
