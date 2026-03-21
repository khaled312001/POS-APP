import { db } from "../server/db";
import { tenants } from "../shared/schema";

async function listTenants() {
    const allTenants = await db.select().from(tenants);
    console.log("Tenants in database:");
    console.table(allTenants.map(t => ({ id: t.id, name: t.name, slug: t.slug })));
    process.exit(0);
}

listTenants().catch(e => {
    console.error(e);
    process.exit(1);
});
