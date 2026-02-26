import pg from "pg";
const { Client } = pg;

async function checkDatabaseState() {
    console.log("Connecting to database...");
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    console.log("Connected.");
    try {
        const tenants = await client.query('SELECT id, "businessName" FROM tenants');
        console.log(`Tenants found: ${tenants.rowCount}`);
        for (const r of tenants.rows) {
            console.log(` - Tenant ID ${r.id}: ${r.businessName}`);
        }

        const branches = await client.query('SELECT id, name, "tenantId" FROM branches');
        console.log(`Branches found: ${branches.rowCount}`);
        for (const r of branches.rows) {
            console.log(` - Branch ID ${r.id}: ${r.name} (Tenant: ${r.tenantId})`);
        }

        const employees = await client.query('SELECT id, name, "branchId" FROM employees');
        console.log(`Employees found: ${employees.rowCount}`);
        for (const r of employees.rows) {
            console.log(` - Employee ID ${r.id}: ${r.name} (Branch: ${r.branchId})`);
        }

    } catch (err) {
        console.error("Query error:", err);
    } finally {
        await client.end();
        console.log("Disconnected.");
        process.exit(0);
    }
}

checkDatabaseState().catch(err => {
    console.error("Fatal error:", err);
    process.exit(1);
});
