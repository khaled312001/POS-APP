import { storage } from "./server/storage";

async function run() {
    console.log("Forcing super admin creation...");
    try {
        const adminEmail = "admin@barmagly.com";
        const existingAdmin = await storage.getSuperAdminByEmail(adminEmail);
        if (!existingAdmin) {
            console.log("Admin not found, creating one now.");
            await storage.createSuperAdmin({
                name: "Super Admin",
                email: adminEmail,
                passwordHash: "$2b$10$OoKOgYj3UlErVOmwqm4rnOpZLdqpLDF3zBiO4VuXJQa56F0DLlesK", // bcrypt hash for 'admin123'
                role: "super_admin",
                isActive: true,
            });
            console.log("Super admin created successfully.");
        } else {
            console.log("Super admin already exists! Let's update its password to be sure.");
            await storage.updateSuperAdmin(existingAdmin.id, {
                passwordHash: "$2b$10$OoKOgYj3UlErVOmwqm4rnOpZLdqpLDF3zBiO4VuXJQa56F0DLlesK",
                isActive: true
            });
            console.log("Super admin updated successfully.");
        }
    } catch (error) {
        console.error("Error seeding:", error);
    }
    process.exit(0);
}

run();
