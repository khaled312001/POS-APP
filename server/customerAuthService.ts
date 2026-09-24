/**
 * customerAuthService.ts
 * Handles OTP-based phone login, email/password login, JWT sessions for delivery customers.
 */

import crypto from "crypto";
import bcrypt from "bcrypt";
import { db } from "./db";
import { customers, customerSessions, otpVerifications } from "../shared/schema";
import { eq, and, gt, ne } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "./jwtSecret";
import type { Customer } from "../shared/schema";

const SESSION_TTL_DAYS = 30;
const OTP_TTL_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;

// ── Token generation helpers ──────────────────────────────────────────────────

export function generateToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("hex");
}

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ── OTP Flow ──────────────────────────────────────────────────────────────────

export async function createOtp(phone: string, tenantId: number): Promise<string> {
  const otp = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  // Invalidate any existing OTPs for this phone+tenant
  await db
    .update(otpVerifications)
    .set({ verified: true })
    .where(
      and(
        eq(otpVerifications.phone, phone),
        eq(otpVerifications.tenantId, tenantId),
        eq(otpVerifications.verified, false)
      )
    );

  await db.insert(otpVerifications).values({
    phone,
    tenantId,
    otp,
    expiresAt,
    attempts: 0,
    verified: false,
  });

  return otp;
}

export async function verifyOtp(
  phone: string,
  tenantId: number,
  inputOtp: string
): Promise<{ success: boolean; error?: string }> {
  const now = new Date();

  const [record] = await db
    .select()
    .from(otpVerifications)
    .where(
      and(
        eq(otpVerifications.phone, phone),
        eq(otpVerifications.tenantId, tenantId),
        eq(otpVerifications.verified, false),
        gt(otpVerifications.expiresAt, now)
      )
    )
    .orderBy(otpVerifications.id)
    .limit(1);

  if (!record) {
    return { success: false, error: "انتهت صلاحية الرمز أو لم يُطلب — اطلب رمزاً جديداً / OTP expired or not found" };
  }

  const attempts = (record.attempts ?? 0) + 1;

  if (attempts > OTP_MAX_ATTEMPTS) {
    await db
      .update(otpVerifications)
      .set({ verified: true })
      .where(eq(otpVerifications.id, record.id));
    return { success: false, error: "محاولات كثيرة، اطلب رمزاً جديداً / Too many attempts. Please request a new OTP." };
  }

  await db
    .update(otpVerifications)
    .set({ attempts })
    .where(eq(otpVerifications.id, record.id));

  if (record.otp !== inputOtp) {
    return { success: false, error: "الرمز غير صحيح / Invalid OTP" };
  }

  await db
    .update(otpVerifications)
    .set({ verified: true })
    .where(eq(otpVerifications.id, record.id));

  return { success: true };
}

// ── Customer lookup / creation ────────────────────────────────────────────────

export async function findOrCreateCustomerByPhone(
  phone: string,
  tenantId: number
): Promise<Customer> {
  const [existing] = await db
    .select()
    .from(customers)
    .where(and(eq(customers.phone, phone), eq(customers.tenantId, tenantId)))
    .limit(1);

  if (existing) {
    // A customer the store deleted (soft delete) comes back when they log in
    // again, instead of a second row with the same phone.
    if (existing.isActive === false) {
      await db.update(customers).set({ isActive: true }).where(eq(customers.id, existing.id));
      return { ...existing, isActive: true };
    }
    return existing;
  }

  const referralCode = generateToken(4).toUpperCase(); // 8-char hex ref code
  const [inserted] = await db
    .insert(customers)
    .values({
      tenantId,
      name: phone,
      phone,
      hasAccount: true,
      referralCode,
      loyaltyPoints: 0,
      loyaltyTier: "bronze",
    })
    .$returningId();

  const [newCustomer] = await db
    .select()
    .from(customers)
    .where(eq(customers.id, inserted.id))
    .limit(1);

  return newCustomer;
}

// ── Phone proof ───────────────────────────────────────────────────────────────
// verify-otp hands the client a 15-minute token proving it controls a phone,
// so /auth/register can attach a password to an EXISTING customer only with
// that proof (it used to set one on any phone number — an account takeover).
const PHONE_PROOF_SECRET = `${JWT_SECRET}:phone-proof`;

export function signPhoneProof(phone: string, tenantId: number): string {
  return jwt.sign({ typ: "phone", ph: phone, t: tenantId }, PHONE_PROOF_SECRET, { expiresIn: "15m" });
}

export function verifyPhoneProof(token: unknown, phone: string, tenantId: number): boolean {
  if (typeof token !== "string" || !token) return false;
  try {
    const c = jwt.verify(token, PHONE_PROOF_SECRET) as any;
    return c?.typ === "phone" && c.ph === phone && Number(c.t) === Number(tenantId);
  } catch {
    return false;
  }
}

/**
 * The phone's owner just proved it (OTP). If the row was never a real account
 * — a guest row or one the till created — sessions someone else may have
 * opened on it are revoked before the owner takes it over.
 */
export async function claimCustomerAfterPhoneProof(customer: Customer): Promise<void> {
  // Remember the proof: order history across stores is matched by phone
  // only for proven phones (storage.getCustomerOrderHistory).
  try {
    const { pool } = await import("./db");
    await pool.query("UPDATE customers SET phone_verified_at = NOW() WHERE id = ?", [customer.id]);
  } catch { /* column added by serverMigrations; never block a login */ }
  if (customer.hasAccount) return;
  await db.delete(customerSessions).where(eq(customerSessions.customerId, customer.id));
  await db.update(customers).set({ hasAccount: true, isActive: true }).where(eq(customers.id, customer.id));
}

/** Another customer of this store already uses this e-mail? */
export async function emailTakenByOther(email: string, tenantId: number, customerId?: number): Promise<boolean> {
  const conds = [eq(customers.email, email), eq(customers.tenantId, tenantId)];
  if (customerId) conds.push(ne(customers.id, customerId));
  const [row] = await db.select({ id: customers.id }).from(customers).where(and(...conds)).limit(1);
  return !!row;
}

// ── Email / password login ────────────────────────────────────────────────────

export async function findCustomerByEmail(
  email: string,
  tenantId: number
): Promise<Customer | null> {
  const [customer] = await db
    .select()
    .from(customers)
    .where(and(eq(customers.email, email), eq(customers.tenantId, tenantId)))
    .limit(1);

  return customer ?? null;
}

export async function verifyCustomerPassword(
  customer: Customer,
  password: string
): Promise<boolean> {
  if (!customer.passwordHash) return false;
  return bcrypt.compare(password, customer.passwordHash);
}

export async function setCustomerPassword(
  customerId: number,
  password: string
): Promise<void> {
  const hash = await bcrypt.hash(password, 10);
  await db
    .update(customers)
    .set({ passwordHash: hash, hasAccount: true })
    .where(eq(customers.id, customerId));
}

// ── Session management ────────────────────────────────────────────────────────

export async function createCustomerSession(
  customerId: number,
  tenantId: number,
  deviceInfo?: string
): Promise<string> {
  const token = generateToken(48);
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

  await db.insert(customerSessions).values({
    customerId,
    tenantId,
    token,
    deviceInfo: deviceInfo ?? null,
    expiresAt,
  });

  return token;
}

export async function getCustomerBySession(
  token: string
): Promise<Customer | null> {
  const now = new Date();

  const [session] = await db
    .select()
    .from(customerSessions)
    .where(and(eq(customerSessions.token, token), gt(customerSessions.expiresAt, now)))
    .limit(1);

  if (!session) return null;

  const [customer] = await db
    .select()
    .from(customers)
    .where(eq(customers.id, session.customerId))
    .limit(1);

  return customer ?? null;
}

export async function deleteCustomerSession(token: string): Promise<void> {
  await db.delete(customerSessions).where(eq(customerSessions.token, token));
}

// ── Middleware helper ─────────────────────────────────────────────────────────

export async function getAuthenticatedCustomer(
  authHeader: string | undefined
): Promise<Customer | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.split(" ")[1];
  return getCustomerBySession(token);
}
