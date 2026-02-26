import "dotenv/config";
import { db } from "./server/db";
import { superAdmins } from "./shared/schema";
import * as bcrypt from "bcrypt";

async function seed() {
    console.log("Seeding super admin...");
    try {
        const passwordHash = await bcrypt.hash("superadmin123", 10);

        await db.insert(superAdmins).values({
            name: "Super Admin",
            email: "admin@barmagly.com",
            passwordHash: passwordHash,
            role: "super_admin",
            isActive: true,
            lastLogin: new Date()
        }).onConflictDoNothing({ target: superAdmins.email });

        console.log("Super admin seeded successfully! You can login with admin@barmagly.com / superadmin123");
    } catch (err) {
        console.error("Error seeding super admin:", err);
    }
    process.exit(0);
}

seed();
