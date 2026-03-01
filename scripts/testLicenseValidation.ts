/**
 * Tests the license validation logic directly against the production DB.
 */
import { db } from "../server/db";
import { tenants, licenseKeys, tenantSubscriptions } from "../shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import { pool } from "../server/db";

const TEST_KEY      = "PIZZALEMON-MAIN-2024-LMNA-B001";
const TEST_EMAIL    = "admin@pizzalemon.ch";
const TEST_PASSWORD = "pizzalemon123";

(async () => {
    console.log("=== License Validation Test ===\n");

    // Step 1: Get license by key
    const [license] = await db.select().from(licenseKeys)
        .where(eq(licenseKeys.licenseKey, TEST_KEY));

    if (!license) {
        console.log("❌ FAIL: License key not found in database:", TEST_KEY);
        await pool.end(); return;
    }
    console.log("✅ License found:", license.licenseKey, "| status:", license.status);

    if (license.status !== "active") {
        console.log("❌ FAIL: License status is not active:", license.status);
        await pool.end(); return;
    }
    console.log("✅ License status: active");

    if (license.expiresAt && new Date(license.expiresAt) < new Date()) {
        console.log("❌ FAIL: License expired at:", license.expiresAt);
        await pool.end(); return;
    }
    console.log("✅ License not expired. Expires:", license.expiresAt);

    // Step 2: Get tenant
    const [tenant] = await db.select().from(tenants)
        .where(eq(tenants.id, license.tenantId!));

    if (!tenant) {
        console.log("❌ FAIL: Tenant not found for tenantId:", license.tenantId);
        await pool.end(); return;
    }
    console.log("✅ Tenant found:", tenant.businessName, "| status:", tenant.status);

    if (tenant.status !== "active") {
        console.log("❌ FAIL: Tenant status is not active:", tenant.status);
        await pool.end(); return;
    }
    console.log("✅ Tenant status: active");

    // Step 3: Email match
    if (tenant.ownerEmail.toLowerCase() !== TEST_EMAIL.toLowerCase()) {
        console.log("❌ FAIL: Email mismatch. DB:", tenant.ownerEmail, "| Input:", TEST_EMAIL);
        await pool.end(); return;
    }
    console.log("✅ Email matches:", tenant.ownerEmail);

    // Step 4: Password hash check
    if (!tenant.passwordHash) {
        console.log("❌ FAIL: No password hash stored for tenant");
        await pool.end(); return;
    }
    const passwordValid = await bcrypt.compare(TEST_PASSWORD, tenant.passwordHash);
    console.log(passwordValid ? "✅ Password valid" : "❌ FAIL: Password invalid");
    if (!passwordValid) {
        console.log("   Hash in DB:", tenant.passwordHash);
        const testHash = await bcrypt.hash(TEST_PASSWORD, 10);
        console.log("   New hash of", TEST_PASSWORD, ":", testHash);
        await pool.end(); return;
    }

    // Step 5: Subscription check
    const subs = await db.select().from(tenantSubscriptions)
        .where(eq(tenantSubscriptions.tenantId, tenant.id));
    const activeSub = subs.find(s => s.status === "active");
    console.log(activeSub ? "✅ Active subscription found:" : "⚠️  No active subscription", activeSub?.planType);

    // Step 6: Activation count
    const maxAct = license.maxActivations || 3;
    const curAct = license.currentActivations || 0;
    if (curAct >= maxAct) {
        console.log("❌ FAIL: Max activations reached:", curAct, "/", maxAct);
        await pool.end(); return;
    }
    console.log("✅ Activations OK:", curAct, "/", maxAct);

    console.log("\n✅✅✅ ALL CHECKS PASSED — License should validate successfully ✅✅✅");
    await pool.end();
})().catch(e => { console.error("Script error:", e); process.exit(1); });
