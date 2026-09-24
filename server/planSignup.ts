/**
 * A store that signed up (Google) without a licence picks a plan in the app.
 *
 *  1. /api/auth/google answers `needsPlan` with a short-lived plan token that
 *     names the store — the only thing that ties a checkout to it.
 *  2. The app opens /api/payments/checkout-session with { planId, planToken }.
 *  3. Stripe's checkout.session.completed webhook calls provisionPaidPlan():
 *     a subscription row and an active licence key, e-mailed to the owner.
 *  4. The app asks /api/auth/plan-status with the same token and signs in.
 */
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { addMonths, addYears } from "date-fns";
import { JWT_SECRET } from "./jwtSecret";
import { pool } from "./db";
import { storage } from "./storage";
import { sendLicenseKeyEmail } from "./emailService";

const PLAN_SECRET = `${JWT_SECRET}:plan-signup`;

export function signPlanToken(tenantId: number, email: string): string {
  return jwt.sign({ typ: "plan", t: tenantId, em: email }, PLAN_SECRET, { expiresIn: "12h" });
}

/** The store the token was issued for, or null. */
export function verifyPlanToken(token: unknown): { tenantId: number; email: string } | null {
  if (typeof token !== "string" || !token) return null;
  try {
    const c = jwt.verify(token, PLAN_SECRET) as any;
    if (c?.typ !== "plan" || !Number(c.t)) return null;
    return { tenantId: Number(c.t), email: String(c.em || "") };
  } catch {
    return null;
  }
}

async function q(sqlText: string, params: any[] = []): Promise<any[]> {
  const [rows]: any = await pool.query(sqlText, params);
  return rows;
}

/** The store's current licence: active and not expired. */
export async function activeLicenseFor(tenantId: number): Promise<any | null> {
  const rows = await q(
    `SELECT * FROM license_keys
      WHERE tenant_id = ? AND status = 'active' AND (expires_at IS NULL OR expires_at > NOW())
      ORDER BY expires_at IS NULL DESC, expires_at DESC LIMIT 1`,
    [tenantId],
  );
  return rows[0] || null;
}

/**
 * Called once per paid checkout (`ref` is the Checkout Session id, so a
 * webhook retry never grants the period twice). A store with a live licence
 * gets it extended; otherwise a subscription and a new licence are created.
 */
export async function provisionPaidPlan(tenantId: number, planId: number, ref: string): Promise<string> {
  const done = await q(`SELECT 1 FROM license_keys WHERE tenant_id = ? AND notes LIKE ? LIMIT 1`, [tenantId, `%${ref}%`]);
  if (done.length) return `plan ${planId} for tenant ${tenantId} already provisioned (${ref})`;

  const [plan] = await q(`SELECT id, name, price, \`interval\` FROM subscription_plans WHERE id = ? LIMIT 1`, [planId]);
  if (!plan) return `plan ${planId} not found`;
  const tenant = await storage.getTenant(tenantId);
  if (!tenant) return `tenant ${tenantId} not found`;

  const yearly = String(plan.interval || "").toLowerCase().startsWith("year");
  const extend = (from: Date) => (yearly ? addYears(from, 1) : addMonths(from, 1));

  const current = await activeLicenseFor(tenantId);
  if (current) {
    const base = current.expires_at && new Date(current.expires_at) > new Date() ? new Date(current.expires_at) : new Date();
    const until = extend(base);
    await q(`UPDATE license_keys SET expires_at = ?, notes = CONCAT(COALESCE(notes, ''), ?) WHERE id = ?`,
      [until, ` | paid ${plan.name} ${ref}`, current.id]);
    if (current.subscription_id) {
      await q(`UPDATE tenant_subscriptions SET status = 'active', end_date = ?, last_payment_date = NOW() WHERE id = ?`,
        [until, current.subscription_id]);
    }
    return `tenant ${tenantId} licence extended to ${until.toISOString()}`;
  }

  const startDate = new Date();
  const endDate = extend(startDate);
  const sub = await storage.createTenantSubscription({
    tenantId,
    planType: yearly ? "yearly" : "monthly",
    planName: String(plan.name),
    price: String(plan.price),
    status: "active",
    startDate,
    endDate,
    autoRenew: false,
    paymentMethod: "stripe",
  } as any);
  const licenseKey = `KASSENTA-${Array.from({ length: 4 }, () => crypto.randomBytes(2).toString("hex").toUpperCase()).join("-")}`;
  await storage.createLicenseKey({
    licenseKey,
    tenantId,
    subscriptionId: sub.id,
    status: "active",
    maxActivations: 3,
    expiresAt: endDate,
    notes: `In-app plan purchase: ${plan.name} ${ref}`,
  } as any);
  await q(`UPDATE tenants SET status = 'active' WHERE id = ?`, [tenantId]);

  sendLicenseKeyEmail({
    to: tenant.ownerEmail,
    ownerName: tenant.ownerName,
    businessName: tenant.businessName,
    licenseKey,
    planName: String(plan.name),
    planType: yearly ? "yearly" : "monthly",
    tempPassword: "Google sign-in",
    expiresAt: endDate,
  }).catch(() => { });
  return `tenant ${tenantId}: ${plan.name} licence created`;
}
