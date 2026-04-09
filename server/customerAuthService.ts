/**
 * customerAuthService.ts
 * Handles OTP-based phone login, email/password login, JWT sessions for delivery customers.
 */

import crypto from "crypto";
import bcrypt from "bcrypt";
import { db } from "./db";
import { customers, customerSessions, otpVerifications } from "../shared/schema";
import { eq, and, gt } from "drizzle-orm";
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
    return { success: false, error: "OTP expired or not found" };
  }

  const attempts = (record.attempts ?? 0) + 1;

  if (attempts > OTP_MAX_ATTEMPTS) {
    await db
      .update(otpVerifications)
      .set({ verified: true })
      .where(eq(otpVerifications.id, record.id));
    return { success: false, error: "Too many attempts. Please request a new OTP." };
  }

  await db
    .update(otpVerifications)
    .set({ attempts })
    .where(eq(otpVerifications.id, record.id));

  if (record.otp !== inputOtp) {
    return { success: false, error: "Invalid OTP" };
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

  if (existing) return existing;

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
