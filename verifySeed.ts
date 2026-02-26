import { storage } from "./server/storage";

async function verify() {
    const tenants = await storage.getTenants();
    console.log("Tenants count:", tenants.length);
    tenants.forEach(t => {
        console.log(`- ${t.businessName} (${t.ownerEmail})`);
    });

    const stats = await storage.getSuperAdminDashboardStats();
    console.log("Dashboard Stats:", JSON.stringify(stats, null, 2));

    process.exit(0);
}

verify().catch(err => {
    console.error(err);
    process.exit(1);
});
