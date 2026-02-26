import type { Express } from "express";
import { storage } from "./storage";
import { requireSuperAdmin, generateToken, SuperAdminRequest } from "./superAdminAuth";
import bcrypt from "bcrypt";
import * as crypto from "crypto";
import { addDays, addMonths, addYears } from "date-fns";
import { insertSuperAdminSchema, insertTenantSchema, insertTenantSubscriptionSchema, insertLicenseKeySchema } from "@shared/schema";

export function registerSuperAdminRoutes(app: Express) {
    console.log("[SUPER-ADMIN] Registering all super admin routes...");
    // Public Super Admin Login
    app.post("/api/super-admin/login", async (req, res) => {
        try {
            const { email, password } = req.body;
            const admin = await storage.getSuperAdminByEmail(email);

            if (!admin || !admin.isActive) {
                return res.status(401).json({ error: "Invalid credentials or disabled account" });
            }

            // Special case for seed auth since we haven't created a seeding script yet
            let isValid = false;
            if (admin.passwordHash.startsWith("$2b$") || admin.passwordHash.startsWith("$2a$")) {
                isValid = await bcrypt.compare(password, admin.passwordHash);
            } else {
                // Fallback for plain text passwords inserted during dev
                isValid = password === admin.passwordHash;
            }

            if (!isValid) {
                return res.status(401).json({ error: "Invalid credentials" });
            }

            // Update last login
            await storage.updateSuperAdmin(admin.id, { lastLogin: new Date() });

            const token = generateToken(admin.id, admin.email, admin.role || "super_admin");

            res.json({
                token,
                user: { id: admin.id, name: admin.name, email: admin.email, role: admin.role }
            });
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
    });

    // Protected Super Admin Routes
    app.get("/api/super-admin/me", requireSuperAdmin, async (req: SuperAdminRequest, res) => {
        try {
            if (!req.admin) return res.status(401).json({ error: "Unauthorized" });
            const admin = await storage.getSuperAdmin(req.admin.id);
            if (!admin) return res.status(404).json({ error: "Admin not found" });

            const { passwordHash, ...safeAdmin } = admin;
            res.json(safeAdmin);
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
    });

    // ========== Dashboard Stats ==========
    app.get("/api/super-admin/stats", requireSuperAdmin, async (req, res) => {
        try {
            const stats = await storage.getSuperAdminDashboardStats();
            res.json(stats);
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
    });

    app.post("/api/super-admin/seed", requireSuperAdmin, async (req, res) => {
        try {
            const seeded = await storage.seedSuperAdminData();
            if (!seeded) return res.json({ message: "Data already seeded" });
            res.json({ message: "Super admin demo data created successfully" });
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
    });

    // ========== Tenants ==========
    app.get("/api/super-admin/tenants", requireSuperAdmin, async (req, res) => {
        try {
            const tenants = await storage.getTenants();
            res.json(tenants);
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
    });

    app.get("/api/super-admin/all-stores", requireSuperAdmin, async (req, res) => {
        console.log("DEBUG: GET /api/super-admin/all-stores called");
        try {
            const stores = await storage.getTenantsWithStats();
            console.log(`DEBUG: Found ${stores.length} stores`);
            res.json(stores);
        } catch (e: any) {
            console.error("DEBUG ERROR in /api/super-admin/all-stores:", e);
            res.status(500).json({ error: e.message });
        }
    });

    app.get("/api/super-admin/tenants/:id", requireSuperAdmin, async (req, res) => {
        try {
            const tenant = await storage.getTenant(parseInt(String(req.params.id), 10));
            if (!tenant) return res.status(404).json({ error: "Tenant not found" });

            // Get related data
            const subscriptions = await storage.getTenantSubscriptions(tenant.id);
            const licenses = await storage.getLicenseKeys(tenant.id);

            res.json({ ...tenant, subscriptions, licenses });
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
    });

    app.get("/api/super-admin/stores/:id/branches", requireSuperAdmin, async (req, res) => {
        try {
            const branches = await storage.getBranchesByTenant(parseInt(String(req.params.id), 10));
            res.json(branches);
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
    });

    app.get("/api/super-admin/stores/:id/employees", requireSuperAdmin, async (req, res) => {
        try {
            const employees = await storage.getEmployeesByTenant(parseInt(String(req.params.id), 10));
            res.json(employees);
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
    });

    app.get("/api/super-admin/stores/:id/products", requireSuperAdmin, async (req, res) => {
        try {
            const products = await storage.getProductsByTenant(parseInt(String(req.params.id), 10));
            res.json(products);
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
    });

    app.get("/api/super-admin/active-shifts", requireSuperAdmin, async (req, res) => {
        try {
            const shifts = await storage.getActiveShiftsGlobal();
            res.json(shifts);
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
    });

    // ========== CRUD: Branches ==========
    app.post("/api/super-admin/stores/:id/branches", requireSuperAdmin, async (req, res) => {
        try {
            const branch = await storage.createBranch({ ...req.body, tenantId: parseInt(String(req.params.id), 10) });
            res.json(branch);
        } catch (e: any) { res.status(400).json({ error: e.message }); }
    });
    app.put("/api/super-admin/branches/:bid", requireSuperAdmin, async (req, res) => {
        try {
            const branch = await storage.updateBranch(parseInt(String(req.params.bid), 10), req.body);
            res.json(branch);
        } catch (e: any) { res.status(400).json({ error: e.message }); }
    });
    app.delete("/api/super-admin/branches/:bid", requireSuperAdmin, async (req, res) => {
        try {
            await storage.deleteBranch(parseInt(String(req.params.bid), 10));
            res.json({ success: true });
        } catch (e: any) { res.status(400).json({ error: e.message }); }
    });

    // ========== CRUD: Employees ==========
    app.post("/api/super-admin/stores/:id/employees", requireSuperAdmin, async (req, res) => {
        try {
            const emp = await storage.createEmployee(req.body);
            res.json(emp);
        } catch (e: any) { res.status(400).json({ error: e.message }); }
    });
    app.put("/api/super-admin/employees/:eid", requireSuperAdmin, async (req, res) => {
        try {
            const emp = await storage.updateEmployee(parseInt(String(req.params.eid), 10), req.body);
            res.json(emp);
        } catch (e: any) { res.status(400).json({ error: e.message }); }
    });
    app.delete("/api/super-admin/employees/:eid", requireSuperAdmin, async (req, res) => {
        try {
            await storage.deleteEmployee(parseInt(String(req.params.eid), 10));
            res.json({ success: true });
        } catch (e: any) { res.status(400).json({ error: e.message }); }
    });

    // ========== CRUD: Products ==========
    app.post("/api/super-admin/stores/:id/products", requireSuperAdmin, async (req, res) => {
        try {
            const prod = await storage.createProduct({ ...req.body, tenantId: parseInt(String(req.params.id), 10) });
            res.json(prod);
        } catch (e: any) { res.status(400).json({ error: e.message }); }
    });
    app.put("/api/super-admin/products/:pid", requireSuperAdmin, async (req, res) => {
        try {
            const prod = await storage.updateProduct(parseInt(String(req.params.pid), 10), req.body);
            res.json(prod);
        } catch (e: any) { res.status(400).json({ error: e.message }); }
    });
    app.delete("/api/super-admin/products/:pid", requireSuperAdmin, async (req, res) => {
        try {
            await storage.deleteProduct(parseInt(String(req.params.pid), 10));
            res.json({ success: true });
        } catch (e: any) { res.status(400).json({ error: e.message }); }
    });

    // ========== Delete Tenant ==========
    app.delete("/api/super-admin/tenants/:id", requireSuperAdmin, async (req, res) => {
        try {
            await storage.updateTenant(parseInt(String(req.params.id), 10), { status: "suspended" });
            res.json({ success: true, message: "Tenant suspended" });
        } catch (e: any) { res.status(400).json({ error: e.message }); }
    });

    // ========== Backup System ==========
    app.post("/api/super-admin/backup/create", requireSuperAdmin, async (req, res) => {
        try {
            const { tenantId } = req.body;
            const allTenants = await storage.getTenants();
            const targetTenants = tenantId ? allTenants.filter((t: any) => t.id === tenantId) : allTenants;

            const backupData: any = { exportedAt: new Date().toISOString(), tenants: [] };
            for (const t of targetTenants) {
                const branchList = await storage.getBranchesByTenant(t.id);
                const productList = await storage.getProductsByTenant(t.id);
                backupData.tenants.push({
                    tenant: t,
                    branches: branchList,
                    products: productList,
                });
            }

            // Save backup to filesystem
            const fs = await import("fs");
            const path = await import("path");
            const backupDir = path.join(process.cwd(), "backups");
            if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
            const filename = `backup_${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
            const filepath = path.join(backupDir, filename);
            fs.writeFileSync(filepath, JSON.stringify(backupData, null, 2));

            res.json({ success: true, filename, tenantCount: targetTenants.length, path: filepath });
        } catch (e: any) { res.status(500).json({ error: e.message }); }
    });

    app.get("/api/super-admin/backup/list", requireSuperAdmin, async (req, res) => {
        try {
            const fs = await import("fs");
            const path = await import("path");
            const backupDir = path.join(process.cwd(), "backups");
            if (!fs.existsSync(backupDir)) { return res.json([]); }
            const files = fs.readdirSync(backupDir).filter((f: string) => f.endsWith(".json")).map((f: string) => {
                const stats = fs.statSync(path.join(backupDir, f));
                return { filename: f, size: stats.size, createdAt: stats.mtime.toISOString() };
            });
            res.json(files.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        } catch (e: any) { res.status(500).json({ error: e.message }); }
    });

    app.get("/api/super-admin/backup/download/:filename", requireSuperAdmin, async (req, res) => {
        try {
            const fs = await import("fs");
            const path = await import("path");
            const filepath = path.join(process.cwd(), "backups", req.params.filename as string);
            if (!fs.existsSync(filepath)) return res.status(404).json({ error: "File not found" });
            res.download(filepath);
        } catch (e: any) { res.status(500).json({ error: e.message }); }
    });

    // ========== Bulk Import ==========
    app.get("/api/super-admin/bulk-import/template", requireSuperAdmin, async (req, res) => {
        // Return CSV template for product import
        const headers = "name,nameAr,sku,barcode,category,price,costPrice,unit,taxable";
        const example = "Espresso,إسبريسو,SKU-001,1234567890123,Beverages,3.50,0.80,piece,true";
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", "attachment; filename=product_import_template.csv");
        res.send(`${headers}\n${example}\n`);
    });

    app.post("/api/super-admin/stores/:id/bulk-import/products", requireSuperAdmin, async (req, res) => {
        try {
            const tenantId = parseInt(String(req.params.id), 10);
            const { products: rows } = req.body; // Expect array of product objects
            if (!Array.isArray(rows) || rows.length === 0) {
                return res.status(400).json({ error: "No products provided. Send { products: [...] }" });
            }

            const created = [];
            for (const row of rows) {
                const prod = await storage.createProduct({
                    tenantId,
                    name: row.name,
                    nameAr: row.nameAr || null,
                    sku: row.sku || null,
                    barcode: row.barcode || null,
                    price: String(row.price),
                    costPrice: row.costPrice ? String(row.costPrice) : null,
                    unit: row.unit || "piece",
                    taxable: row.taxable !== false,
                    trackInventory: true,
                    isActive: true,
                });
                created.push(prod);
            }
            res.json({ success: true, imported: created.length, products: created });
        } catch (e: any) { res.status(500).json({ error: e.message }); }
    });

    app.post("/api/super-admin/tenants", requireSuperAdmin, async (req, res) => {
        try {
            const parsed = insertTenantSchema.parse(req.body);

            // Check if email already exists
            const existing = await storage.getTenantByEmail(parsed.ownerEmail as string);
            if (existing) {
                return res.status(400).json({ error: "A tenant with this owner email already exists" });
            }

            const tenant = await storage.createTenant(parsed);
            res.json(tenant);
        } catch (e: any) {
            res.status(400).json({ error: e.message });
        }
    });

    app.patch("/api/super-admin/tenants/:id", requireSuperAdmin, async (req, res) => {
        try {
            const tenant = await storage.updateTenant(parseInt(req.params.id as string), req.body);
            res.json(tenant);
        } catch (e: any) {
            res.status(400).json({ error: e.message });
        }
    });

    // ========== Subscriptions ==========
    app.get("/api/super-admin/subscriptions", requireSuperAdmin, async (req, res) => {
        try {
            const tenantId = req.query.tenantId ? parseInt(req.query.tenantId as string) : undefined;
            const subs = await storage.getTenantSubscriptions(tenantId);
            res.json(subs);
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
    });

    app.post("/api/super-admin/subscriptions", requireSuperAdmin, async (req, res) => {
        try {
            const parsed = insertTenantSubscriptionSchema.parse(req.body);

            // Calculate end dates based on plan type if not provided
            let endDate = parsed.endDate ? new Date(parsed.endDate) : undefined;
            let trialEndsAt = parsed.trialEndsAt ? new Date(parsed.trialEndsAt) : undefined;
            const startDate = parsed.startDate ? new Date(parsed.startDate) : new Date();

            if (!endDate) {
                if (parsed.planType === 'trial') {
                    trialEndsAt = addDays(startDate, 30);
                    endDate = trialEndsAt;
                } else if (parsed.planType === 'monthly') {
                    endDate = addMonths(startDate, 1);
                } else if (parsed.planType === 'yearly') {
                    endDate = addYears(startDate, 1);
                }
            }

            const sub = await storage.createTenantSubscription({
                ...parsed,
                startDate,
                endDate,
                trialEndsAt
            });
            res.json(sub);
        } catch (e: any) {
            res.status(400).json({ error: e.message });
        }
    });

    app.patch("/api/super-admin/subscriptions/:id", requireSuperAdmin, async (req, res) => {
        try {
            const sub = await storage.updateTenantSubscription(parseInt(req.params.id as string), req.body);
            res.json(sub);
        } catch (e: any) {
            res.status(400).json({ error: e.message });
        }
    });

    app.delete("/api/super-admin/subscriptions/:id", requireSuperAdmin, async (req, res) => {
        try {
            await storage.deleteTenantSubscription(parseInt(req.params.id as string));
            res.json({ success: true });
        } catch (e: any) {
            res.status(400).json({ error: e.message });
        }
    });

    // ========== License Keys ==========
    app.get("/api/super-admin/licenses", requireSuperAdmin, async (req, res) => {
        try {
            const tenantId = req.query.tenantId ? parseInt(req.query.tenantId as string) : undefined;
            const keys = await storage.getLicenseKeys(tenantId);
            res.json(keys);
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
    });

    app.post("/api/super-admin/licenses/generate", requireSuperAdmin, async (req, res) => {
        try {
            const { tenantId, subscriptionId, maxActivations, expiresAt, notes } = req.body;

            if (!tenantId) return res.status(400).json({ error: "tenantId is required" });

            // Generate a format like BARMAGLY-XXXX-XXXX-XXXX-XXXX
            const randomSegments = Array.from({ length: 4 }, () =>
                crypto.randomBytes(2).toString('hex').toUpperCase()
            );
            const licenseKey = `BARMAGLY-${randomSegments.join('-')}`;

            const key = await storage.createLicenseKey({
                licenseKey,
                tenantId,
                subscriptionId,
                maxActivations: maxActivations || 3,
                expiresAt: expiresAt ? new Date(expiresAt) : null,
                notes,
                status: "active"
            });

            res.json(key);
        } catch (e: any) {
            res.status(400).json({ error: e.message });
        }
    });

    app.patch("/api/super-admin/licenses/:id/revoke", requireSuperAdmin, async (req, res) => {
        try {
            const key = await storage.updateLicenseKey(parseInt(req.params.id as string), { status: "revoked" });
            res.json(key);
        } catch (e: any) {
            res.status(400).json({ error: e.message });
        }
    });

    app.delete("/api/super-admin/licenses/:id", requireSuperAdmin, async (req, res) => {
        try {
            // Hardware delete isn't in storage yet, so we just set status to revoked
            const key = await storage.updateLicenseKey(parseInt(req.params.id as string), { status: "revoked" });
            res.json(key);
        } catch (e: any) {
            res.status(400).json({ error: e.message });
        }
    });

    // ========== Notifications Center ==========
    app.get("/api/super-admin/notifications", requireSuperAdmin, async (req, res) => {
        try {
            const notifs = await storage.getTenantNotifications();
            res.json(notifs);
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
    });

    app.post("/api/super-admin/notifications/broadcast", requireSuperAdmin, async (req, res) => {
        try {
            const { title, message, type, priority } = req.body;
            if (!title || !message) return res.status(400).json({ error: "Title and message are required" });

            // Create global notification (tenantId = null)
            const notif = await storage.createTenantNotification({
                tenantId: null as any, // Nullable in schema but Drizzle might want an explicit cast or we might need to update schema if it's strict
                title,
                message,
                type: type || "info",
                priority: priority || "normal",
                sentBy: (req as any).admin.id
            });
            res.json(notif);
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
    });


    // ========== Public API for POS App App to Validate License ==========

    // Public endpoint - called by the mobile app on startup
    app.post("/api/license/validate", async (req, res) => {
        try {
            const { licenseKey, deviceId, email, password } = req.body;

            if (!licenseKey) {
                return res.status(400).json({ isValid: false, reason: "License key is missing", code: "MISSING_KEY" });
            }

            // 1. Verify License Key existence
            const keyRecord = await storage.getLicenseByKey(licenseKey);

            if (!keyRecord) {
                return res.status(404).json({ isValid: false, reason: "Invalid license key", code: "INVALID_KEY" });
            }

            // 2. Check Device Binding and Credentials
            let tenant;
            if (keyRecord.deviceInfo && keyRecord.deviceInfo !== "") {
                // If the key is already bound to a device, strict lock applies
                if (keyRecord.deviceInfo !== deviceId) {
                    return res.status(403).json({
                        isValid: false,
                        reason: "Device mismatch. This license is already in use by another device.",
                        code: "DEVICE_LOCKED"
                    });
                }

                // Allowed because it matches the device. We still need the tenant object.
                tenant = await storage.getTenant(keyRecord.tenantId);
            } else {
                // First-time activation: Email and Password are strictly required
                if (!email || !password) {
                    return res.status(400).json({ isValid: false, reason: "Store email and password are required for initial activation", code: "CREDENTIALS_REQUIRED" });
                }

                tenant = await storage.getTenantByEmail(email);
                if (!tenant) {
                    return res.status(404).json({ isValid: false, reason: "Store not found", code: "TENANT_NOT_FOUND" });
                }

                // Verify Password
                let isPasswordValid = false;
                if (tenant.passwordHash) {
                    if (tenant.passwordHash.startsWith("$2b$") || tenant.passwordHash.startsWith("$2a$")) {
                        isPasswordValid = await bcrypt.compare(password, tenant.passwordHash);
                    } else {
                        // Fallback for demo/dev
                        isPasswordValid = password === tenant.passwordHash;
                    }
                } else {
                    isPasswordValid = password === "admin123";
                }

                if (!isPasswordValid) {
                    return res.status(401).json({ isValid: false, reason: "Invalid store credentials", code: "INVALID_CREDENTIALS" });
                }

                // Ensure license belongs to this tenant
                if (keyRecord.tenantId !== tenant.id) {
                    return res.status(403).json({ isValid: false, reason: "License key does not belong to this store", code: "INVALID_LICENSE_OWNER" });
                }

                // First time activation for this key
                await storage.updateLicenseKey(keyRecord.id, {
                    deviceInfo: deviceId,
                    activatedAt: new Date()
                });
            }

            if (!tenant) {
                return res.status(404).json({ isValid: false, reason: "Store not found", code: "TENANT_NOT_FOUND" });
            }

            if (tenant.status && tenant.status !== "active") {
                return res.status(403).json({ isValid: false, reason: "Store account is inactive", code: "TENANT_INACTIVE" });
            }

            if (keyRecord.status && keyRecord.status !== "active") {
                return res.status(403).json({
                    isValid: false,
                    reason: `License is ${keyRecord.status}`,
                    code: `LICENSE_${(keyRecord.status as string).toUpperCase()}`
                });
            }

            if (keyRecord.expiresAt && new Date(keyRecord.expiresAt) < new Date()) {
                await storage.updateLicenseKey(keyRecord.id, { status: "expired" });
                return res.status(403).json({ isValid: false, reason: "License has expired", code: "LICENSE_EXPIRED" });
            }

            let subStatus = { active: false, plan: "none", daysRemaining: 0, requiresUpgrade: false };

            if (keyRecord.subscriptionId) {
                const sub = await storage.getTenantSubscription(keyRecord.subscriptionId);
                if (sub && sub.status === "active") {
                    subStatus.active = true;
                    subStatus.plan = sub.planType;

                    if (sub.endDate) {
                        const daysRemaining = Math.max(0, Math.ceil((sub.endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)));
                        subStatus.daysRemaining = daysRemaining;

                        if (daysRemaining <= 7) {
                            subStatus.requiresUpgrade = true;
                        }
                    }
                }
            }

            // Update validation timestamp
            await storage.updateLicenseKey(keyRecord.id, {
                lastValidatedAt: new Date()
            });

            res.json({
                isValid: true,
                tenant: {
                    id: tenant.id,
                    name: tenant.businessName,
                    logo: tenant.logo
                },
                subscription: subStatus
            });

        } catch (e: any) {
            console.error("License validation error:", e);
            res.status(500).json({ isValid: false, reason: "Internal server error", code: "SERVER_ERROR" });
        }
    });

}
