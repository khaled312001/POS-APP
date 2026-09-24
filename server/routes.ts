import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import * as xlsx from "xlsx";
import path from "node:path";
import fs from "node:fs";
import { randomUUID } from "node:crypto";
import { storage } from "./storage";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { callerIdService } from "./callerIdService";
import { pushService } from "./pushService";
import { requireSuperAdmin } from "./superAdminAuth";
import {
  generateEmployeeToken, verifyPin, hashPin, isHashedPin,
  requireRole, requireManager, requireAdmin,
} from "./employeeAuth";
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";
import { repriceOrder, PricingError } from "./orderPricing";
import { sendLicenseKeyEmail } from "./emailService";
import { whatsappService } from "./whatsappService";
import { verifiedStorePhone } from "./whatsappVerifyRoutes";
import { canonicalPhone, asciiDigits } from "./phone";
import {
  storeCurrency, storeTimeZone, branchCurrency, formatMoney, compactDate, timeZoneForCurrency, roundMoney,
  dayStart, dayEnd, localDateString, localMonthString, monthRange,
} from "./storeTime";
import { ownedBy, resolvers as own } from "./tenantScope";
import { salesClientRefReady, orderClientRefReady } from "./serverMigrations";
import { signDownloadToken, DOWNLOADABLE_PATHS, DOWNLOAD_TTL_SECONDS } from "./tenantAuth";
import {
  createOtp, verifyOtp, findOrCreateCustomerByPhone,
  findCustomerByEmail, verifyCustomerPassword, setCustomerPassword,
  createCustomerSession, getAuthenticatedCustomer, deleteCustomerSession,
  generateToken, signPhoneProof, verifyPhoneProof, claimCustomerAfterPhoneProof, emailTakenByOther,
} from "./customerAuthService";
import {
  validatePromoCode, recordPromoUsage, awardLoyaltyPoints,
  redeemLoyaltyPoints, checkLoyaltyRedemption, settlePosSaleLoyalty,
  assignDriverToOrder, releaseDriver,
  getDeliveryZoneForLocation, generateTrackingToken,
  creditWallet, deductWallet, getLoyaltyConfig, redeemPointsForOrder,
} from "./deliveryService";
import { cardSupported } from "./paymentService";
import {
  normalizeWholesaleProductFields, stripProtectedCustomerFields,
  holdCreditForSale, releaseCreditHold, reverseCreditSale, creditReturnForSale,
  type CreditHold,
} from "./wholesale";

const TIMESTAMP_FIELDS = [
  "createdAt", "updatedAt", "expiryDate", "expectedDate", "receivedDate",
  "startTime", "endTime", "startDate", "endDate", "nextBillingDate",
  "date", "lastRestocked", "completedAt", "processedAt"
];

const CLEARABLE_DATE_FIELDS = new Set([
  "expiryDate", "expectedDate", "receivedDate", "endDate", "endTime",
  "nextBillingDate", "lastRestocked", "completedAt", "processedAt",
]);

function sanitizeDates(data: any) {
  const result = { ...data };
  for (const field of TIMESTAMP_FIELDS) {
    if (field in result) {
      if (result[field] === undefined) {
        delete result[field];
      } else if (result[field] === "" || result[field] === null) {
        // An explicit empty value clears an optional date (e.g. removing a
        // product's expiry date) — dropping it made such a date impossible to
        // clear. Bookkeeping stamps (createdAt, date, …) are never nulled.
        if (CLEARABLE_DATE_FIELDS.has(field)) result[field] = null;
        else delete result[field];
      } else if (typeof result[field] === "string") {
        const d = new Date(result[field]);
        // An unparseable string must not reach MySQL as "Invalid Date".
        if (isNaN(d.getTime())) delete result[field];
        else result[field] = d;
      }
    }
  }
  return result;
}

/** Duplicate SKU → 409 with a message the POS can show; anything else → 500. */
function productWriteError(res: Response, e: any) {
  const msg = String(e?.message || e);
  if (e?.code === "ER_DUP_ENTRY" || /Duplicate entry/i.test(msg)) {
    if (/sku/i.test(msg)) {
      return res.status(409).json({
        error: "رمز SKU مستخدم لمنتج آخر في متجرك / This SKU is already used by another product in your store",
        code: "DUPLICATE_SKU",
      });
    }
    return res.status(409).json({ error: "Duplicate value", code: "DUPLICATE" });
  }
  if (e?.statusCode) return res.status(e.statusCode).json({ error: e.message, code: e.code });
  return res.status(500).json({ error: msg });
}

/**
 * Store for a report: the licence's store, or — for a super admin — the
 * ?tenantId= they asked for. Reports never run across every store for a
 * licence holder.
 */
function analyticsTenant(req: any): number | undefined {
  const t = reqTenant(req);
  if (t) return t;
  const q = Number(req?.query?.tenantId);
  return Number.isFinite(q) && q > 0 ? q : undefined;
}

const ORDER_STATUSES = new Set([
  "pending", "accepted", "confirmed", "preparing", "ready", "on_way", "out_for_delivery",
  "picked_up", "delivered", "completed", "cancelled", "rejected", "refunded",
]);
const TERMINAL_ORDER_STATUSES = new Set(["delivered", "completed", "cancelled", "rejected", "refunded"]);
const PAYMENT_STATUSES = new Set(["pending", "paid", "failed", "refunded", "partially_refunded", "unpaid"]);

/**
 * The fields the POS may change on an online order. Anything else in the body
 * (tenantId, trackingToken, stripe ids, paid_at …) is ignored — the route used
 * to write the body as-is.
 */
async function editableOrderFields(req: any, body: any): Promise<
  { data: Record<string, any> } | { error: string; status: number; code: string }
> {
  const out: Record<string, any> = {};
  const str = (v: unknown, max: number) => (v == null ? null : String(v).slice(0, max));
  const money = (v: unknown) => {
    const n = Number(asciiDigits(v).replace(/,/g, ""));
    return Number.isFinite(n) && n >= 0 ? n.toFixed(2) : undefined;
  };
  if (body.status !== undefined) {
    if (!ORDER_STATUSES.has(String(body.status))) return { error: "Invalid status", status: 400, code: "INVALID_STATUS" };
    out.status = String(body.status);
  }
  if (body.paymentStatus !== undefined) {
    if (!PAYMENT_STATUSES.has(String(body.paymentStatus))) return { error: "Invalid payment status", status: 400, code: "INVALID_PAYMENT_STATUS" };
    out.paymentStatus = String(body.paymentStatus);
  }
  if (body.paymentMethod !== undefined && body.paymentMethod !== null) out.paymentMethod = str(body.paymentMethod, 32);
  if (body.estimatedTime !== undefined) {
    const n = body.estimatedTime === null || body.estimatedTime === "" ? null : Math.round(Number(asciiDigits(body.estimatedTime)));
    if (n !== null && (!Number.isFinite(n) || n < 0 || n > 24 * 60)) return { error: "Invalid estimatedTime", status: 400, code: "INVALID_TIME" };
    out.estimatedTime = n;
  }
  for (const k of ["notes", "customerAddress", "customerEmail", "tableNumber", "floor", "buildingName", "addressNotes"]) {
    if (body[k] !== undefined) out[k] = str(body[k], 2000);
  }
  if (body.customerName !== undefined) {
    const v = String(body.customerName ?? "").trim();
    if (!v) return { error: "customerName cannot be empty", status: 400, code: "INVALID_NAME" };
    out.customerName = v.slice(0, 200);
  }
  if (body.customerPhone !== undefined) {
    const v = canonicalPhone(body.customerPhone);
    if (!v) return { error: "customerPhone cannot be empty", status: 400, code: "INVALID_PHONE" };
    out.customerPhone = v.slice(0, 40);
  }
  for (const k of ["subtotal", "totalAmount", "deliveryFee", "discountAmount", "taxAmount"]) {
    if (body[k] !== undefined && body[k] !== null && body[k] !== "") {
      const m = money(body[k]);
      if (m === undefined) return { error: `Invalid ${k}`, status: 400, code: "INVALID_AMOUNT" };
      out[k] = m;
    }
  }
  if (body.items !== undefined) {
    if (!Array.isArray(body.items)) return { error: "items must be a list", status: 400, code: "INVALID_ITEMS" };
    out.items = body.items;
  }
  if (body.scheduledAt !== undefined) {
    const d = body.scheduledAt ? new Date(body.scheduledAt) : null;
    if (d && isNaN(d.getTime())) return { error: "Invalid scheduledAt", status: 400, code: "INVALID_DATE" };
    out.scheduledAt = d;
  }
  if (body.driverId !== undefined) {
    if (body.driverId === null || body.driverId === "") out.driverId = null;
    else if (await ownedBy(req, own.vehicle, Number(body.driverId))) out.driverId = Number(body.driverId);
    else return { error: "Driver not found", status: 404, code: "NOT_FOUND" };
  }
  return { data: out };
}

/** paid_at (+ clear payment_error) the way the payment webhooks stamp it. */
async function markOnlineOrderPaid(orderId: number, _method: string | null) {
  const { pool } = await import("./db");
  try {
    await pool.query(
      "UPDATE online_orders SET paid_at = COALESCE(paid_at, NOW()), payment_error = NULL WHERE id = ?",
      [orderId],
    );
  } catch (e: any) {
    // Columns come from runStripeMigrations; never fail the edit over them.
    console.error("[orders] paid_at not stamped:", e?.message || e);
  }
}

/**
 * Promo code body → columns. Dates arrive as strings (drizzle needs Date
 * objects — a dated promo used to fail with a 500), the code is stored upper
 * case, amounts accept Arabic-Indic digits.
 */
function promoFields(body: any, creating: boolean):
  { data: Record<string, any> } | { error: string; code: string } {
  const out: Record<string, any> = {};
  const bad = (en: string, ar: string, code: string) => ({ error: `${ar} / ${en}`, code });
  const num = (v: unknown) => Number(asciiDigits(v).replace(/,/g, "").trim());
  if (body.code !== undefined || creating) {
    const code = asciiDigits(body.code ?? "").trim().toUpperCase();
    if (!code || code.length > 32 || /\s/.test(code)) return bad("Promo code must be 1–32 characters without spaces", "رمز الخصم يجب أن يكون من 1 إلى 32 حرفاً بدون مسافات", "INVALID_CODE");
    out.code = code;
  }
  if (body.discountType !== undefined || creating) {
    const t = String(body.discountType ?? "percent");
    if (!["percent", "fixed", "free_delivery"].includes(t)) return bad("Invalid discount type", "نوع الخصم غير صالح", "INVALID_TYPE");
    out.discountType = t;
  }
  if (body.discountValue !== undefined || creating) {
    const v = body.discountValue === undefined || body.discountValue === "" ? (out.discountType === "free_delivery" ? 0 : NaN) : num(body.discountValue);
    if (!Number.isFinite(v) || v < 0) return bad("Invalid discount value", "قيمة الخصم غير صالحة", "INVALID_VALUE");
    if ((out.discountType ?? body.discountType) === "percent" && v > 100) return bad("A percentage cannot exceed 100", "النسبة لا يمكن أن تتجاوز 100", "INVALID_VALUE");
    out.discountValue = v.toFixed(2);
  }
  for (const k of ["minOrderAmount", "maxDiscountCap"]) {
    if (body[k] === undefined) continue;
    if (body[k] === null || body[k] === "") { out[k] = k === "minOrderAmount" ? "0" : null; continue; }
    const v = num(body[k]);
    if (!Number.isFinite(v) || v < 0) return bad(`Invalid ${k}`, "قيمة غير صالحة", "INVALID_AMOUNT");
    out[k] = v.toFixed(2);
  }
  for (const k of ["usageLimit", "perCustomerLimit"]) {
    if (body[k] === undefined) continue;
    if (body[k] === null || body[k] === "") { out[k] = null; continue; }
    const v = num(body[k]);
    if (!Number.isInteger(v) || v < 0) return bad(`Invalid ${k}`, "عدد غير صالح", "INVALID_LIMIT");
    out[k] = v;
  }
  for (const k of ["validFrom", "validUntil"]) {
    if (body[k] === undefined) continue;
    if (body[k] === null || body[k] === "") { out[k] = null; continue; }
    const d = new Date(body[k]);
    if (isNaN(d.getTime())) return bad(`Invalid date (${k})`, "تاريخ غير صالح", "INVALID_DATE");
    out[k] = d;
  }
  if (out.validFrom && out.validUntil && out.validUntil < out.validFrom) {
    return bad("The end date is before the start date", "تاريخ الانتهاء قبل تاريخ البدء", "INVALID_DATE_RANGE");
  }
  if (body.description !== undefined) out.description = body.description == null ? null : String(body.description).slice(0, 2000);
  if (body.isActive !== undefined) out.isActive = !!body.isActive;
  if (body.applicableOrderTypes !== undefined) {
    if (!Array.isArray(body.applicableOrderTypes)) return bad("applicableOrderTypes must be a list", "قائمة غير صالحة", "INVALID_TYPES");
    out.applicableOrderTypes = body.applicableOrderTypes.map((x: any) => String(x));
  }
  return { data: out };
}

function promoWriteError(res: Response, e: any) {
  const msg = String(e?.message || e);
  if (e?.code === "ER_DUP_ENTRY" || /Duplicate entry/i.test(msg)) {
    return res.status(409).json({
      error: "رمز الخصم هذا موجود مسبقاً في متجرك / This promo code already exists in your store",
      code: "DUPLICATE_PROMO_CODE",
    });
  }
  return res.status(500).json({ error: msg });
}

/** The till's idempotency key: Idempotency-Key header, else paymentDetails[].ref. */
function saleClientRef(req: any): string | null {
  const header = req.get?.("Idempotency-Key") ?? req.headers?.["idempotency-key"];
  let ref: unknown = Array.isArray(header) ? header[0] : header;
  if (!ref && Array.isArray(req.body?.paymentDetails)) {
    ref = req.body.paymentDetails.find((p: any) => p && p.ref)?.ref;
  }
  const s = ref == null ? "" : String(ref).trim();
  return s && s.length <= 100 ? s : null;
}

/** Logs (never rejects) a sale whose subtotal disagrees with its own lines. */
function warnInconsistentSaleTotals(saleData: any, items: any) {
  try {
    if (!Array.isArray(items) || !items.length) return;
    const lines = items.reduce((sum: number, it: any) => {
      const t = Number(it?.total);
      return sum + (Number.isFinite(t) ? t : (Number(it?.unitPrice) || 0) * (Number(it?.quantity) || 0));
    }, 0);
    const subtotal = Number(saleData?.subtotal);
    const total = Number(saleData?.totalAmount);
    const tolerance = Math.max(1, Math.abs(lines) * 0.02);
    if (!Number.isFinite(total) || !Number.isFinite(subtotal) || Math.abs(subtotal - lines) > tolerance) {
      console.warn(`[sales] totals disagree with lines: branch=${saleData?.branchId} lines=${lines.toFixed(2)} subtotal=${saleData?.subtotal} total=${saleData?.totalAmount}`);
    }
  } catch { /* logging only */ }
}

/** Payment methods charged through the card gateway (Stripe). */
const CARD_METHODS = new Set(["card", "stripe", "online", "twint", "apple_pay", "google_pay"]);

/** In-flight idempotency keys (this process), so two concurrent retries cannot both create. */
const inflightIdempotency = new Set<string>();

/** Idempotency-Key header (storefront / customer app), 1–100 chars. */
function requestIdempotencyKey(req: any): string | null {
  const raw = req.get?.("Idempotency-Key") ?? req.headers?.["idempotency-key"];
  const v = String(Array.isArray(raw) ? raw[0] : raw ?? "").trim();
  return v && v.length <= 100 ? v : null;
}

async function findOrderByClientRef(tenantId: number, key: string, phone: string): Promise<any | null> {
  if (!orderClientRefReady) return null;
  try {
    const { pool } = await import("./db");
    const [rows]: any = await pool.query(
      `SELECT id, order_number, tracking_token, total_amount FROM online_orders
        WHERE tenant_id = ? AND client_ref = ? AND customer_phone = ?
          AND created_at >= NOW() - INTERVAL 1 DAY
        ORDER BY id LIMIT 1`, [tenantId, key, phone]);
    return rows?.[0] || null;
  } catch { return null; }
}

/**
 * The store's minimum order: the larger of the storefront setting
 * (landing_page_config.min_order_amount) and the POS store setting
 * (tenant metadata minOrderAmount), so neither can be bypassed.
 */
async function storeMinOrderAmount(tenantId: number): Promise<number> {
  const [config, tenant] = await Promise.all([
    storage.getLandingPageConfigByTenantId(tenantId).catch(() => null),
    storage.getTenant(tenantId).catch(() => null),
  ]);
  const a = Number((config as any)?.minOrderAmount) || 0;
  const b = Number((tenant?.metadata as any)?.minOrderAmount) || 0;
  return Math.max(0, a, b);
}

/** The delivery fee repriceOrder falls back to (same query), for the store APIs. */
async function storeBaseDeliveryFee(tenantId: number): Promise<number> {
  try {
    const { pool } = await import("./db");
    const [rows]: any = await pool.query("SELECT delivery_fee FROM branches WHERE tenant_id = ? LIMIT 1", [tenantId]);
    return Math.round((Number(rows?.[0]?.delivery_fee) || 0) * 100) / 100;
  } catch { return 0; }
}

/** Real rating from order_ratings (null when there are none). */
async function storeRating(tenantId: number): Promise<{ rating: number | null; reviewCount: number }> {
  try {
    const { pool } = await import("./db");
    const [rows]: any = await pool.query(
      `SELECT AVG(r.overall_rating) AS avg, COUNT(*) AS n
         FROM order_ratings r JOIN online_orders o ON o.id = r.order_id
        WHERE o.tenant_id = ?`, [tenantId]);
    const n = Number(rows?.[0]?.n || 0);
    return { rating: n ? Math.round(Number(rows[0].avg) * 10) / 10 : null, reviewCount: n };
  } catch { return { rating: null, reviewCount: 0 }; }
}

/** The licence's store, when the request has one (super admins may have none). */
function reqTenant(req: any): number | undefined {
  const t = Number(req?.tenantId);
  return Number.isFinite(t) && t > 0 ? t : undefined;
}

/**
 * The branch a till writes to. Staff without a branch used to send the
 * placeholder branch 1 (another store's id, or none at all); that now
 * resolves to the licence store's main branch.
 */
async function storeBranch(req: any, branchId: unknown): Promise<number | undefined> {
  const t = reqTenant(req);
  const id = Number(branchId);
  if (Number.isInteger(id) && id > 0) {
    const b: any = await storage.getBranch(id).catch(() => undefined);
    if (b && (!t || Number(b.tenantId) === t)) return id;
  }
  if (!t) return Number.isInteger(id) && id > 0 ? id : undefined;
  const list: any[] = await storage.getBranchesByTenant(t).catch(() => []);
  const main = list.find((b) => b.isMain) || list[0];
  return main?.id ?? (Number.isInteger(id) && id > 0 ? id : undefined);
}

/**
 * New rows belong to the store that created them: the licence's tenant wins
 * over whatever the body says (tenantAuth already rejects a mismatch, this
 * covers the body that sends none).
 */
function withTenant<T extends Record<string, any>>(req: any, data: T): T {
  const t = reqTenant(req);
  return t ? { ...data, tenantId: t } : data;
}

/** An update never moves a row to another store. */
function withoutTenant<T extends Record<string, any>>(data: T): T {
  const { tenantId: _t, id: _id, ...rest } = data as any;
  return rest as T;
}

import * as bcrypt from "bcrypt";
import * as crypto from "crypto";
import { addDays, addMonths, addYears } from "date-fns";
import { OAuth2Client } from "google-auth-library";
import { rateLimit } from "./rateLimit";

/**
 * The web OAuth client. Both Android apps sign in natively against their own
 * Android clients, but Google always stamps the returned ID token with the web
 * client as its `aud`, so this single value validates every path — POS app,
 * storefront app, and both in a browser.
 */
const GOOGLE_WEB_CLIENT_ID =
  process.env.GOOGLE_CLIENT_ID || "852311970344-8q8a01gm3jip4k9vooljk8ttjpd30802.apps.googleusercontent.com";
const googleClient = new OAuth2Client(GOOGLE_WEB_CLIENT_ID);

export async function registerRoutes(app: Express): Promise<Server> {

  // ── Public store page by slug (e.g. /api/store/pizza-lemon) ───────────────
  // Vercel rewrites /store/:slug → /api/store/:slug so this serves the HTML.
  app.get("/api/store/:slug", async (req, res) => {
    try {
      const { slug } = req.params;
      const config = await storage.getLandingPageConfigBySlug(slug);
      if (!config) {
        return res.status(404).send("<h1>Store not found</h1>");
      }
      const tenant = await storage.getTenant(config.tenantId);
      if (!tenant) {
        return res.status(404).send("<h1>Store not found</h1>");
      }
      const storePath = path.resolve(process.cwd(), "server", "templates", "restaurant-store.html");
      let html = fs.readFileSync(storePath, "utf-8");
      const storeName = String((tenant as any).businessName || "Kassenta Store").replace(/[<>"]/g, "");
      const storeLogo = String((config as any).logoUrl || (tenant as any).logo || "https://kassenta.com/app/assets/images/icon.png").replace(/"/g, "");
      html = html.replace(/\{\{SLUG\}\}/g, slug);
      html = html.replace(/\{\{TENANT_ID\}\}/g, String(config.tenantId));
      html = html.replace(/\{\{STORE_NAME\}\}/g, storeName);
      html = html.replace(/\{\{STORE_LOGO\}\}/g, storeLogo);
      html = html.replace(/\{\{PRIMARY_COLOR\}\}/g, config.primaryColor || "#2FD3C6");
      html = html.replace(/\{\{ACCENT_COLOR\}\}/g, config.accentColor || "#6366F1");
      html = html.replace(/\{\{CURRENCY\}\}/g, (tenant as any).currency || "CHF");
      html = html.replace(/\{\{LANGUAGE\}\}/g, (config as any).language || "en");
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(200).send(html);
    } catch (err) {
      console.error("[store/:slug] Error:", err);
      return res.status(500).send("<h1>Server error</h1>");
    }
  });

  // ── One-time production seed endpoint ─────────────────────────────────────
  // Ensures Pizza Lemon store exists in whatever DB this server is connected to.
  // Safe to call multiple times – seedPizzaLemon() is idempotent.
  app.post("/api/admin/seed-pizza-lemon", async (_req, res) => {
    try {
      const { seedPizzaLemon } = await import("./seedPizzaLemon");
      await seedPizzaLemon();
      res.json({ success: true, message: "Pizza Lemon store seeded (or already existed)." });
    } catch (e: any) {
      console.error("[SEED API] Error:", e);
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // Seed 10 real Zürich restaurants (idempotent — skips any whose slug exists).
  app.post("/api/admin/seed-zurich-restaurants", async (_req, res) => {
    try {
      const { seedZurichRestaurants } = await import("./seedZurichRestaurants");
      await seedZurichRestaurants();
      res.json({ success: true, message: "Zürich restaurants seeded (idempotent)." });
    } catch (e: any) {
      console.error("[SEED ZURICH] Error:", e);
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // ── DB health check (returns license key status) ──────────────────────────
  app.get("/api/admin/check-pizza-lemon", async (_req, res) => {
    try {
      const { db } = await import("./db");
      const { tenants, licenseKeys } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      const [tenant] = await db.select().from(tenants).where(eq(tenants.ownerEmail, "admin@pizzalemon.ch"));
      if (!tenant) return res.json({ found: false, message: "Pizza Lemon not found in this database." });
      const licenses = await db.select().from(licenseKeys).where(eq(licenseKeys.tenantId, tenant.id));
      res.json({ found: true, tenantId: tenant.id, status: tenant.status, licenses: licenses.map(l => ({ key: l.licenseKey, status: l.status })) });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/health", async (_req, res) => {
    try {
      const { pool } = await import("./db");
      await pool.query("SELECT 1");
      res.json({
        ok: true,
        status: "healthy",
        database: "mysql",
        timestamp: new Date().toISOString(),
      });
    } catch (e: any) {
      res.status(500).json({
        ok: false,
        status: "unhealthy",
        database: "mysql",
        error: e.message,
      });
    }
  });

  // Landing Page Subscription
  app.post("/api/landing/subscribe", async (req, res) => {
    try {
      const {
        businessName,
        ownerName,
        ownerEmail,
        ownerPhone,
        planType,         // monthly | yearly
        planName,         // basic | advanced
        paymentMethodId,  // Stripe PaymentMethod ID (preferred)
        stripeToken,      // fallback: legacy token
        lang,
      } = req.body;

      if (!businessName || !ownerName || !ownerEmail) {
        return res.status(400).json({ error: "Required fields are missing" });
      }

      // 1. Check if tenant already exists
      const existing = await storage.getTenantByEmail(ownerEmail);
      if (existing) {
        return res.status(400).json({ error: "A store with this email already exists" });
      }

      // 2. Process Stripe payment (if card provided)
      let stripeChargeId: string | null = null;
      const isAdvanced = planName === "advanced";
      const isYearly = planType === "yearly";
      const priceChf = isYearly ? (isAdvanced ? 4999 : 1999) : (isAdvanced ? 499 : 199);
      const amountCents = priceChf * 100;

      if (paymentMethodId || stripeToken) {
        try {
          const stripeClient = await getUncachableStripeClient();
          if (paymentMethodId) {
            // Modern PaymentIntent flow
            const pi = await stripeClient.paymentIntents.create({
              amount: amountCents,
              currency: "chf",
              payment_method: paymentMethodId,
              confirm: true,
              automatic_payment_methods: { enabled: true, allow_redirects: "never" },
              receipt_email: ownerEmail,
              description: `Kassenta ${planName} ${planType} — ${businessName}`,
              metadata: { businessName, ownerEmail, planName, planType },
            });
            if (pi.status === "requires_action") {
              return res.json({ requiresAction: true, clientSecret: pi.client_secret, paymentIntentId: pi.id });
            }
            if (pi.status !== "succeeded") {
              return res.status(402).json({ error: "Payment was not completed. Please try again." });
            }
            stripeChargeId = pi.id;
          } else if (stripeToken) {
            // Legacy token flow
            const charge = await stripeClient.charges.create({
              amount: amountCents,
              currency: "chf",
              source: stripeToken,
              receipt_email: ownerEmail,
              description: `Kassenta ${planName} ${planType} — ${businessName}`,
              metadata: { businessName, ownerEmail, planName, planType },
            });
            if (charge.status !== "succeeded") {
              return res.status(402).json({ error: "Payment failed. Please try again." });
            }
            stripeChargeId = charge.id;
          }
        } catch (stripeErr: any) {
          console.error("[SUBSCRIBE] Stripe error:", stripeErr.message);
          return res.status(402).json({ error: stripeErr.message || "Payment processing failed" });
        }
      }

      // 3. Create Tenant
      const tempPassword = "Bpos" + Math.floor(100000 + Math.random() * 900000);
      const passwordHash = await bcrypt.hash(tempPassword, 10);

      const tenant = await storage.createTenant({
        businessName,
        ownerName,
        ownerEmail,
        ownerPhone: ownerPhone || null,
        passwordHash,
        status: "active",
        maxBranches: isAdvanced ? 10 : 1,
        maxEmployees: isAdvanced ? 999 : 5,
        metadata: {
          signupDate: new Date().toISOString(),
          paymentMethod: paymentMethodId || stripeToken ? "stripe" : "bank",
          stripeChargeId,
        }
      });

      // 4. Create Subscription
      const startDate = new Date();
      let endDate = new Date();
      if (isYearly) {
        endDate = addYears(startDate, 1);
      } else {
        endDate = addMonths(startDate, 1);
      }

      const subscription = await storage.createTenantSubscription({
        tenantId: tenant.id,
        planType,
        planName: planName || "basic",
        price: String(priceChf) + ".00",
        status: "active",
        startDate,
        endDate,
        autoRenew: true,
        paymentMethod: stripeChargeId ? "stripe" : "bank",
      });

      // 5. Generate License Key
      const randomSegments = Array.from({ length: 4 }, () =>
        crypto.randomBytes(2).toString("hex").toUpperCase()
      );
      const licenseKey = `KASSENTA-${randomSegments.join("-")}`;

      await storage.createLicenseKey({
        licenseKey,
        tenantId: tenant.id,
        subscriptionId: subscription.id,
        status: "active",
        maxActivations: isAdvanced ? 10 : 3,
        expiresAt: endDate,
        notes: `Landing page subscription: ${planName} ${planType}`,
      });

      // 6. Welcome Notification
      await storage.createTenantNotification({
        tenantId: tenant.id,
        type: "info",
        title: "Welcome to Kassenta!",
        message: `Your account for ${businessName} is ready. Open the app and enter your license key to activate.`,
        priority: "normal",
      });

      // 7. Send License Key Email (non-blocking)
      sendLicenseKeyEmail({
        to: ownerEmail,
        ownerName,
        businessName,
        licenseKey,
        planName,
        planType,
        tempPassword,
        expiresAt: endDate,
      }).then(() => {
        console.log(`[SUBSCRIBE] Email sent to ${ownerEmail}`);
      }).catch((emailErr: any) => {
        console.error("[SUBSCRIBE] Email send failed (non-fatal):", emailErr.message);
      });

      console.log(`[SUBSCRIBE] Tenant created: ${businessName} (ID: ${tenant.id}) | Stripe: ${stripeChargeId || "none"}`);

      res.json({
        success: true,
        tenantId: tenant.id,
        licenseKey,
        requiresAction: false,
      });
    } catch (e: any) {
      console.error("[SUBSCRIBE] Error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // Confirm subscription after 3DS
  app.post("/api/landing/confirm-subscription", async (req, res) => {
    try {
      const { paymentIntentId, businessName, ownerName, ownerEmail, ownerPhone, planType, planName } = req.body;
      if (!paymentIntentId) return res.status(400).json({ error: "paymentIntentId required" });

      const stripeClient = await getUncachableStripeClient();
      const pi = await stripeClient.paymentIntents.retrieve(paymentIntentId);
      if (pi.status !== "succeeded") {
        return res.status(402).json({ error: "Payment not completed" });
      }

      // Check if tenant was already created (idempotency)
      const existingTenant = await storage.getTenantByEmail(ownerEmail);
      if (existingTenant) {
        const licenses = await storage.getLicenseKeys(existingTenant.id);
        const key = licenses[0]?.licenseKey || "";
        return res.json({ success: true, tenantId: existingTenant.id, licenseKey: key, requiresAction: false });
      }

      // Create tenant (same as above)
      const isAdvanced = planName === "advanced";
      const isYearly = planType === "yearly";
      const priceChf = isYearly ? (isAdvanced ? 4999 : 1999) : (isAdvanced ? 499 : 199);
      const tempPassword = "Bpos" + Math.floor(100000 + Math.random() * 900000);
      const passwordHash = await bcrypt.hash(tempPassword, 10);
      const tenant = await storage.createTenant({
        businessName, ownerName, ownerEmail, ownerPhone: ownerPhone || null, passwordHash,
        status: "active", maxBranches: isAdvanced ? 10 : 1, maxEmployees: isAdvanced ? 999 : 5,
        metadata: { stripeChargeId: paymentIntentId },
      });
      const startDate = new Date();
      const endDate = isYearly ? addYears(startDate, 1) : addMonths(startDate, 1);
      const subscription = await storage.createTenantSubscription({
        tenantId: tenant.id, planType, planName: planName || "basic",
        price: String(priceChf) + ".00", status: "active", startDate, endDate,
        autoRenew: true, paymentMethod: "stripe",
      });
      const randomSegments = Array.from({ length: 4 }, () => crypto.randomBytes(2).toString("hex").toUpperCase());
      const licenseKey = `KASSENTA-${randomSegments.join("-")}`;
      await storage.createLicenseKey({
        licenseKey, tenantId: tenant.id, subscriptionId: subscription.id,
        status: "active", maxActivations: isAdvanced ? 10 : 3, expiresAt: endDate,
      });
      sendLicenseKeyEmail({ to: ownerEmail, ownerName, businessName, licenseKey, planName, planType, tempPassword, expiresAt: endDate }).catch(() => { });
      res.json({ success: true, tenantId: tenant.id, licenseKey, requiresAction: false });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Google Authentication & Auto-Trial
  app.post("/api/auth/google", async (req, res) => {
    try {
      const { idToken, accessToken, deviceId } = req.body;
      if (!idToken && !accessToken) return res.status(400).json({ error: "idToken is required" });

      let payload: { email?: string; name?: string } | undefined;
      if (idToken) {
        // Without an explicit `audience` the library verifies only the signature,
        // so an ID token minted for any other Google app would be accepted here
        // and provision a tenant. Pin it to our own client.
        const ticket = await googleClient.verifyIdToken({
          idToken,
          audience: GOOGLE_WEB_CLIENT_ID,
        }).catch(() => null);
        payload = ticket?.getPayload();
      } else {
        // Web build: Google's pop-up returns an access token. Google itself
        // confirms which client it was issued to, and the e-mail comes from
        // Google's userinfo, never from the request body.
        const info = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(String(accessToken))}`);
        const tokenInfo: any = info.ok ? await info.json() : null;
        if (!tokenInfo || (tokenInfo.aud !== GOOGLE_WEB_CLIENT_ID && tokenInfo.azp !== GOOGLE_WEB_CLIENT_ID)) {
          return res.status(401).json({ error: "Invalid Google token" });
        }
        const ui = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", { headers: { Authorization: `Bearer ${accessToken}` } });
        const u: any = ui.ok ? await ui.json() : null;
        if (!u?.email || u.email_verified === false) return res.status(401).json({ error: "Invalid Google token" });
        payload = { email: u.email, name: u.name };
      }
      if (!payload || !payload.email) {
        return res.status(401).json({ error: "Invalid Google token" });
      }

      const email = payload.email.toLowerCase();
      const name = payload.name || "Store Owner";

      // 1. Check if tenant exists
      let tenant = await storage.getTenantByEmail(email);
      let isNew = false;

      if (!tenant) {
        isNew = true;
        // Create Tenant with Trial status
        const tempPassword = "GAuth-" + crypto.randomBytes(4).toString("hex");
        const passwordHash = await bcrypt.hash(tempPassword, 10);

        tenant = await storage.createTenant({
          businessName: payload.name ? `${payload.name}'s Store` : "My New Store",
          ownerName: name,
          ownerEmail: email,
          passwordHash,
          status: "active",
          maxBranches: 1,
          maxEmployees: 5,
          metadata: { signupMethod: "google", signupDate: new Date().toISOString() }
        });

        // 2. Create 14-Day Trial Subscription
        const startDate = new Date();
        const endDate = addDays(startDate, 14);

        const sub = await storage.createTenantSubscription({
          tenantId: tenant.id,
          planType: "trial",
          planName: "14-Day Free Trial",
          price: "0",
          status: "active",
          startDate,
          endDate,
          autoRenew: false,
        });

        // 3. Generate Trial License Key
        const randomSegments = Array.from({ length: 4 }, () =>
          crypto.randomBytes(2).toString("hex").toUpperCase()
        );
        const licenseKey = `TRIAL-${randomSegments.join("-")}`;

        await storage.createLicenseKey({
          licenseKey,
          tenantId: tenant.id,
          subscriptionId: sub.id,
          status: "active",
          maxActivations: 3,
          expiresAt: endDate,
          notes: "Auto-generated Google Trial",
        });

        // 4. Ensure branch & admin employee
        await storage.ensureTenantData(tenant.id);
      }

      // 5. Find the active license
      const licenses = await storage.getLicenseKeys(tenant.id);
      const activeLicense = licenses.find(l => l.status === "active" && (!l.expiresAt || new Date(l.expiresAt) > new Date()));

      if (!activeLicense) {
        return res.status(403).json({ error: "No active license found for this account. Your trial may have expired." });
      }

      // 6. Find the admin employee
      const employees = await storage.getEmployeesByTenant(tenant.id);
      const adminEmployee = employees.find(e => e.role === "admin" || e.email === email);

      res.json({
        success: true,
        licenseKey: activeLicense.licenseKey,
        isNew,
        tenant: {
          id: tenant.id,
          name: tenant.businessName,
          email: tenant.ownerEmail,
          setupCompleted: tenant.setupCompleted
        },
        employee: adminEmployee ? {
          id: adminEmployee.id,
          name: adminEmployee.name,
          role: adminEmployee.role,
          permissions: adminEmployee.permissions,
        } : null
      });
    } catch (e: any) {
      console.error("[GOOGLE AUTH] Error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/tenant/onboarding-status", async (req, res) => {
    try {
      const tenantId = Number(req.query.tenantId);
      if (!tenantId) return res.status(400).json({ error: "tenantId is required" });
      const status = await storage.getOnboardingStatus(tenantId);
      res.json(status);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/tenant/onboarding-complete", async (req, res) => {
    try {
      const { ownerPhone, storeType, logo } = req.body || {};
      // The licence's store, never a body field (a super admin may name one).
      const tenantId = reqTenant(req) ?? ((req as any).isSuperAdmin ? Number(req.body?.tenantId) || undefined : undefined);
      if (!tenantId) return res.status(400).json({ error: "tenantId is required" });
      const businessName = String(req.body?.businessName ?? "").trim();
      if (!businessName) return res.status(400).json({ error: "businessName is required", code: "BUSINESS_NAME_REQUIRED" });

      // 1. Update Tenant Info
      await storage.updateTenant(tenantId, {
        businessName,
        ownerPhone,
        storeType,
        logo,
        setupCompleted: true
      });

      // 2. Sync with Landing Page Config
      const config = await storage.getLandingPageConfig(tenantId);
      if (!config) {
        const { db } = await import("./db");
        const { landingPageConfig: landingConfig } = await import("@shared/schema");
        await db.insert(landingConfig).values({
          tenantId,
          slug: businessName.toLowerCase().replace(/\s+/g, '-') || `store-${tenantId}`,
          heroTitle: businessName,
          phone: ownerPhone,
          socialWhatsapp: ownerPhone,
        });
      } else {
        const { db } = await import("./db");
        const { landingPageConfig: landingConfig } = await import("@shared/schema");
        const { eq } = await import("drizzle-orm");
        await db.update(landingConfig).set({
          heroTitle: businessName,
          phone: ownerPhone,
          socialWhatsapp: ownerPhone,
        }).where(eq(landingConfig.tenantId, tenantId));
      }

      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // License Validation
  // Licence keys are long, but the endpoint is unauthenticated and public —
  // cap it so it cannot be used to enumerate keys or as an amplification target.
  app.post(
    "/api/license/validate",
    // Generous: a store's tablets and Syrian carrier-NAT users share one IP.
    rateLimit({ name: "license-ip", max: 300, windowMs: 10 * 60 * 1000 }),
    async (req, res) => {
    try {
      const { licenseKey, email, password, deviceId } = req.body;
      if (process.env.NODE_ENV !== 'production') console.log("[VALIDATE] Incoming request details:", { licenseKey, email: email ? email.substring(0, 2) + "***" : undefined, deviceId });

      if (!licenseKey) {
        return res.json({ isValid: false, reason: "License key is required" });
      }

      const license = await storage.getLicenseByKey(licenseKey);
      if (process.env.NODE_ENV !== 'production') console.log("[VALIDATE] getLicenseByKey result for", licenseKey, ":", !!license);
      if (!license) {
        return res.json({ isValid: false, reason: "Invalid license key" });
      }

      if (license.status !== "active") {
        return res.json({ isValid: false, reason: `License is ${license.status}` });
      }

      if (license.expiresAt && new Date(license.expiresAt) < new Date()) {
        return res.json({ isValid: false, reason: "License has expired" });
      }

      const tenant = await storage.getTenant(license.tenantId);
      if (!tenant) {
        return res.json({ isValid: false, reason: "Tenant not found" });
      }

      if (tenant.status !== "active") {
        return res.json({ isValid: false, reason: `Store account is ${tenant.status}` });
      }

      // Validate email if provided (no password required)
      if (email) {
        if (tenant.ownerEmail.toLowerCase() !== email.toLowerCase()) {
          return res.json({ isValid: false, reason: "Email does not match this license" });
        }
        // If password is also provided, validate it (optional)
        if (password) {
          if (!tenant.passwordHash) {
            return res.json({ isValid: false, reason: "Account credentials not configured" });
          }
          const passwordValid = await bcrypt.compare(password, tenant.passwordHash);
          if (!passwordValid) {
            return res.json({ isValid: false, reason: "Invalid password" });
          }
        }
      }

      const isNewActivation = !!email;
      if (isNewActivation) {
        const currentCount = license.currentActivations || 0;
        const maxCount = license.maxActivations || 3;
        if (currentCount >= maxCount) {
          return res.json({ isValid: false, reason: `Maximum activations reached (${maxCount}). Contact support to add more.` });
        }
      }

      const subs = await storage.getTenantSubscriptions(tenant.id);
      const activeSub = subs.find((s: any) => s.status === "active");

      await storage.updateLicenseKey(license.id, {
        lastValidatedAt: new Date(),
        deviceInfo: deviceId || license.deviceInfo,
        currentActivations: (license.currentActivations || 0) + (isNewActivation ? 1 : 0),
      });

      const subInfo = activeSub ? {
        active: true,
        plan: activeSub.planName,
        daysRemaining: activeSub.endDate ? Math.max(0, Math.ceil((new Date(activeSub.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 365,
        requiresUpgrade: false,
      } : {
        active: false,
        plan: "No active plan",
        daysRemaining: 0,
        requiresUpgrade: true,
      };

      res.json({
        isValid: true,
        tenant: {
          id: tenant.id,
          name: tenant.businessName,
          logo: tenant.logo,
          storeType: tenant.storeType,
        },
        subscription: subInfo,
      });
    } catch (e: any) {
      console.error("License validation error:", e);
      res.status(500).json({ isValid: false, reason: "Server error during validation" });
    }
  });

  // Dashboard
  app.get("/api/dashboard", async (req: Request, res: Response) => {
    try {
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : undefined;
      if (!tenantId) return res.status(400).json({ error: "tenantId is required" });
      const stats = await storage.getDashboardStats(tenantId);
      res.json(stats);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Multi-branch dashboard stats
  app.get("/api/dashboard/multi-branch", async (req: Request, res: Response) => {
    try {
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : undefined;
      if (!tenantId) return res.status(400).json({ error: "tenantId is required" });

      const allBranches = await storage.getBranchesByTenant(tenantId);
      const allEmployees = await storage.getEmployeesByTenant(tenantId);
      const allInventory = await storage.getInventory(undefined, tenantId);
      const allSales = await storage.getSales({ tenantId });
      const allShifts = await storage.getShifts(tenantId);
      const allProducts = await storage.getProductsByTenant(tenantId);
      const allCategories = await storage.getCategories(tenantId);
      const allCustomers = await storage.getCustomers(undefined, tenantId);

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 7);
      weekStart.setHours(0, 0, 0, 0);
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const branchStats = allBranches.map((branch: any) => {
        const branchSales = allSales.filter((s: any) => s.branchId === branch.id);
        const branchEmployees = allEmployees.filter((e: any) => e.branchId === branch.id);
        const branchInventory = allInventory.filter((i: any) => i.branchId === branch.id);
        const activeShifts = allShifts.filter((s: any) => s.branchId === branch.id && s.status === "open");

        const todaySales = branchSales.filter((s: any) => s.createdAt && new Date(s.createdAt) >= todayStart);
        const weekSales = branchSales.filter((s: any) => s.createdAt && new Date(s.createdAt) >= weekStart);
        const monthSales = branchSales.filter((s: any) => s.createdAt && new Date(s.createdAt) >= monthStart);

        const todayRevenue = todaySales.reduce((sum: number, s: any) => sum + Number(s.totalAmount || 0), 0);
        const weekRevenue = weekSales.reduce((sum: number, s: any) => sum + Number(s.totalAmount || 0), 0);
        const monthRevenue = monthSales.reduce((sum: number, s: any) => sum + Number(s.totalAmount || 0), 0);
        const totalRevenue = branchSales.reduce((sum: number, s: any) => sum + Number(s.totalAmount || 0), 0);

        const lowStockItems = branchInventory.filter((i: any) => (i.quantity || 0) <= (i.lowStockThreshold || 10));
        const outOfStockItems = branchInventory.filter((i: any) => (i.quantity || 0) === 0);

        const paymentBreakdown: Record<string, { count: number; total: number }> = {};
        branchSales.forEach((s: any) => {
          const method = s.paymentMethod || "cash";
          if (!paymentBreakdown[method]) paymentBreakdown[method] = { count: 0, total: 0 };
          paymentBreakdown[method].count++;
          paymentBreakdown[method].total += Number(s.totalAmount || 0);
        });

        return {
          id: branch.id,
          name: branch.name,
          address: branch.address,
          phone: branch.phone,
          isMain: branch.isMain,
          isActive: branch.isActive,
          currency: branch.currency || "USD",
          todayRevenue,
          weekRevenue,
          monthRevenue,
          totalRevenue,
          todaySalesCount: todaySales.length,
          totalSalesCount: branchSales.length,
          employeeCount: branchEmployees.length,
          activeEmployees: branchEmployees.filter((e: any) => e.isActive).length,
          activeShifts: activeShifts.length,
          inventoryCount: branchInventory.length,
          lowStockCount: lowStockItems.length,
          outOfStockCount: outOfStockItems.length,
          paymentBreakdown,
        };
      });

      const totalRevenue = allSales.reduce((sum: number, s: any) => sum + Number(s.totalAmount || 0), 0);
      const todayTotalRevenue = allSales
        .filter((s: any) => s.createdAt && new Date(s.createdAt) >= todayStart)
        .reduce((sum: number, s: any) => sum + Number(s.totalAmount || 0), 0);
      const monthTotalRevenue = allSales
        .filter((s: any) => s.createdAt && new Date(s.createdAt) >= monthStart)
        .reduce((sum: number, s: any) => sum + Number(s.totalAmount || 0), 0);

      res.json({
        summary: {
          totalBranches: allBranches.length,
          activeBranches: allBranches.filter((b: any) => b.isActive).length,
          totalEmployees: allEmployees.length,
          totalProducts: allProducts.length,
          totalCategories: allCategories.length,
          totalCustomers: allCustomers.length,
          totalSales: allSales.length,
          totalRevenue,
          todayRevenue: todayTotalRevenue,
          monthRevenue: monthTotalRevenue,
          activeShifts: allShifts.filter((s: any) => s.status === "open").length,
        },
        branches: branchStats,
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Subscription status for dashboard
  // Every store's plan, owner name and e-mail: platform data, super admin only
  // (it used to be a public route).
  app.get("/api/dashboard/subscriptions", requireSuperAdmin as any, async (_req: Request, res: Response) => {
    try {
      const tenantSubs = await storage.getTenantSubscriptions();
      const tenants = await storage.getTenants();
      const licenses = await storage.getLicenseKeys();

      const subsWithTenant = tenantSubs.map((sub: any) => {
        const tenant = tenants.find((t: any) => t.id === sub.tenantId);
        const tenantLicenses = licenses.filter((l: any) => l.tenantId === sub.tenantId);
        return {
          ...sub,
          tenantName: tenant?.businessName || "Unknown",
          tenantEmail: tenant?.ownerEmail || "",
          tenantStatus: tenant?.status || "unknown",
          licenseCount: tenantLicenses.length,
          activeLicenses: tenantLicenses.filter((l: any) => l.status === "active").length,
        };
      });

      res.json({
        subscriptions: subsWithTenant,
        summary: {
          total: tenantSubs.length,
          active: tenantSubs.filter((s: any) => s.status === "active").length,
          trial: tenantSubs.filter((s: any) => s.planType === "trial").length,
          monthly: tenantSubs.filter((s: any) => s.planType === "monthly").length,
          yearly: tenantSubs.filter((s: any) => s.planType === "yearly").length,
          expiringSoon: tenantSubs.filter((s: any) => {
            if (!s.endDate) return false;
            const daysLeft = Math.ceil((new Date(s.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            return daysLeft > 0 && daysLeft <= 7;
          }).length,
          totalMRR: tenantSubs.filter((s: any) => s.status === "active" && s.planType === "monthly")
            .reduce((sum: number, s: any) => sum + Number(s.price || 0), 0),
        },
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Branches
  app.get("/api/branches", async (req, res) => {
    try {
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : undefined;
      if (!tenantId) return res.status(400).json({ error: "tenantId is required" });
      res.json(await storage.getBranchesByTenant(tenantId));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/branches", async (req, res) => {
    try { res.json(await storage.createBranch(withTenant(req, sanitizeDates(req.body)))); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.put("/api/branches/:id", async (req, res) => {
    try { res.json(await storage.updateBranch(Number(req.params.id), withoutTenant(sanitizeDates(req.body)))); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.delete("/api/branches/:id", async (req, res) => {
    try { await storage.deleteBranch(Number(req.params.id)); res.json({ success: true }); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Employees
  app.get("/api/employees", async (req, res) => {
    try {
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : undefined;
      if (!tenantId) return res.status(400).json({ error: "tenantId is required" });
      const emps = await storage.getEmployeesByTenant(tenantId);
      // SECURITY: never expose PINs to clients. PIN auth is validated server-
      // side via POST /api/employees/login; the list is only for selection.
      res.json(emps.map(({ pin, ...rest }: any) => ({ ...rest, hasPin: !!pin })));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.get("/api/employees/:id", async (req, res) => {
    try {
      const emp: any = await storage.getEmployee(Number(req.params.id));
      if (!emp) return res.status(404).json({ error: "Employee not found" });
      const { pin, ...safe } = emp;
      res.json({ ...safe, hasPin: !!pin });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/employees", requireAdmin, async (req, res) => {
    try {
      const data: any = withTenant(req, sanitizeDates(req.body));
      if (data.pin) data.pin = await hashPin(String(data.pin));
      const created: any = await storage.createEmployee(data);
      const { pin, ...safe } = created ?? {};
      res.json(safe);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.put("/api/employees/:id", requireAdmin, async (req, res) => {
    try {
      const data: any = withoutTenant(sanitizeDates(req.body));
      // An empty string means "leave the PIN alone", not "clear it".
      if (data.pin) data.pin = await hashPin(String(data.pin));
      else delete data.pin;
      const updated: any = await storage.updateEmployee(Number(req.params.id), data);
      const { pin, ...safe } = updated ?? {};
      res.json(safe);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.delete("/api/employees/:id", requireAdmin, async (req, res) => {
    try { await storage.deleteEmployee(Number(req.params.id)); res.json({ success: true }); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  // A 4-digit PIN has 10k combinations — without a limit it falls in seconds.
  // Keyed per device and per licence so one shop cannot lock out another.
  app.post(
    "/api/employees/login",
    rateLimit({ name: "pin-ip", max: 20, windowMs: 10 * 60 * 1000, message: "Too many attempts. Wait a moment and try again." }),
    rateLimit({
      name: "pin-tenant",
      max: 40,
      windowMs: 10 * 60 * 1000,
      keyFn: (req: any) => String(req.tenantId ?? req.header("x-license-key") ?? "unknown"),
      message: "Too many attempts. Wait a moment and try again.",
    }),
    async (req: any, res) => {
    try {
      const pin = String(req.body?.pin ?? "");
      if (!pin) return res.status(400).json({ error: "PIN is required" });

      // The license key already identified the store; trust that over anything
      // the client sends. A PIN must never match an employee of another tenant.
      const tenantId: number | undefined = req.tenantId;
      let emp: any;

      if (req.body.employeeId) {
        emp = await storage.getEmployee(Number(req.body.employeeId));
        if (!emp) return res.status(401).json({ error: "Invalid PIN for this employee" });
        if (tenantId && emp.tenantId && emp.tenantId !== tenantId) {
          return res.status(401).json({ error: "Invalid PIN for this employee" });
        }
        if (!(await verifyPin(pin, emp.pin))) {
          return res.status(401).json({ error: "Invalid PIN for this employee" });
        }
      } else if (tenantId) {
        const staff = await storage.getEmployeesByTenant(tenantId);
        emp = null;
        for (const candidate of staff as any[]) {
          if (await verifyPin(pin, candidate.pin)) { emp = candidate; break; }
        }
        if (!emp) return res.status(401).json({ error: "Invalid PIN" });
      } else {
        // No license context (local dev). Legacy plaintext lookup only.
        emp = await storage.getEmployeeByPin(pin);
        if (!emp) return res.status(401).json({ error: "Invalid PIN" });
      }

      if (!emp.isActive) return res.status(401).json({ error: "Account deactivated" });

      // SEC-02: transparent migration — the first successful login on a legacy
      // plaintext PIN replaces it with a bcrypt hash.
      if (!isHashedPin(emp.pin)) {
        try {
          await storage.updateEmployee(emp.id, { pin: await hashPin(pin) } as any);
        } catch (err) {
          console.error("[employeeAuth] PIN re-hash failed for employee", emp.id, err);
        }
      }

      await storage.createActivityLog({
        employeeId: emp.id,
        action: "login",
        entityType: "employee",
        entityId: emp.id,
        details: `${emp.name} logged in`,
      });

      const token = generateEmployeeToken({
        employeeId: emp.id,
        tenantId: emp.tenantId ?? tenantId ?? null,
        branchId: emp.branchId ?? null,
        role: emp.role,
        name: emp.name,
        permissions: Array.isArray(emp.permissions) ? emp.permissions : [],
      });

      // Never ship the PIN back to the client — the app persists this object.
      const { pin: _pin, ...safeEmp } = emp;
      res.json({ ...safeEmp, token });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Categories
  app.get("/api/categories", async (req, res) => {
    try {
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : undefined;
      if (!tenantId) return res.status(400).json({ error: "tenantId is required" });
      const categories = await storage.getCategories(tenantId);
      res.json(sortCategoriesByPriority(categories));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/categories", async (req, res) => {
    try {
      const c = await storage.createCategory(withTenant(req, sanitizeDates(req.body)));
      callerIdService.broadcast({ type: "menu_updated" }, (req as any).tenantId);
      res.json(c);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.put("/api/categories/:id", async (req, res) => {
    try {
      const c = await storage.updateCategory(Number(req.params.id), withoutTenant(sanitizeDates(req.body)));
      callerIdService.broadcast({ type: "menu_updated" }, (req as any).tenantId);
      res.json(c);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.delete("/api/categories/:id", async (req, res) => {
    try {
      const c = await storage.getCategory(Number(req.params.id));
      await storage.deleteCategory(Number(req.params.id));
      // Products stay on the menu: they drop to "uncategorised" instead of
      // pointing at a hidden category that made them disappear.
      if (c) await storage.detachProductsFromCategory(c.id);
      if (c) callerIdService.broadcast({ type: "menu_updated" }, (req as any).tenantId);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Products
  app.get("/api/products", async (req, res) => {
    try {
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : undefined;
      const search = req.query.search as string | undefined;
      const applyMarkup = req.query.applyMarkup === "true";
      if (!tenantId) return res.status(400).json({ error: "tenantId is required" });
      let products = await storage.getProductsByTenant(tenantId, search);
      if (applyMarkup) {
        const commissionRate = await storage.getCommissionRate();
        if (commissionRate > 0) {
          const factor = 1 + (commissionRate / 100);
          products = (products as any[]).map((p: any) => {
            const rawPrice = parseFloat(p.price) * factor;
            const rounded = Math.round(rawPrice * 2) / 2; // nearest 0.5
            return { ...p, price: rounded.toFixed(2) };
          });
        }
      }
      res.json(products);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Download Products Excel Template (must be before :id route)
  app.get("/api/products/template", (req, res) => {
    const templateData = [
      { Name: "Sample Product 1", Price: "9.99", CostPrice: "5.00", SKU: "SKU001", Barcode: "1234567890", Unit: "piece", NameArabic: "منتج 1" },
      { Name: "Sample Product 2", Price: "15.50", CostPrice: "8.00", SKU: "SKU002", Barcode: "0987654321", Unit: "kg", NameArabic: "منتج 2" },
    ];
    const ws = xlsx.utils.json_to_sheet(templateData);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Products");
    const buf = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });
    res.setHeader("Content-Disposition", "attachment; filename=products_template.xlsx");
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buf);
  });

  // Bulk Import Products (must be before :id route)
  app.post("/api/products/import", async (req: any, res) => {
    try {
      const { fileBase64, branchId } = req.body;
      const tenantId = reqTenant(req) ?? Number(req.body.tenantId);
      if (!tenantId) return res.status(400).json({ error: "tenantId is required" });
      if (!fileBase64) return res.status(400).json({ error: "fileBase64 is required" });
      const buffer = Buffer.from(fileBase64, "base64");
      const workbook = xlsx.read(buffer, { type: "buffer" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = xlsx.utils.sheet_to_json(sheet);

      const productsToInsert = data.map((item: any) => ({
        tenantId: Number(tenantId),
        name: item.Name || item.name,
        nameAr: item.NameArabic || item.name_ar,
        sku: item.SKU || item.sku || undefined,
        barcode: String(item.Barcode || item.barcode || ""),
        price: String(item.Price || item.price || "0"),
        costPrice: String(item.CostPrice || item.cost_price || "0"),
        unit: item.Unit || item.unit || "piece",
        isActive: true,
      }));

      const results = await storage.bulkCreateProducts(productsToInsert as any);

      if (branchId) {
        for (const prod of results) {
          await storage.upsertInventory({
            productId: prod.id,
            branchId: Number(branchId),
            quantity: 0
          });
        }
      }

      res.json({ success: true, count: results.length });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/products/:id", async (req, res) => {
    try {
      const prod = await storage.getProduct(Number(req.params.id));
      if (!prod) return res.status(404).json({ error: "Product not found" });
      res.json(prod);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.get("/api/products/barcode/:barcode", async (req: any, res) => {
    try {
      // Scoped to the store the licence key identified — never another store's catalogue.
      const tenantId = Number(req.tenantId) || 0;
      if (!tenantId) return res.status(401).json({ error: "Store not identified" });
      const prod = await storage.getProductByBarcode(String(req.params.barcode), tenantId);
      if (!prod) return res.status(404).json({ error: "Product not found" });
      res.json(prod);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/products", async (req, res) => {
    try {
      const body = normalizeWholesaleProductFields(withTenant(req, sanitizeDates(req.body)));
      // Addons are always free
      if (body.isAddon) body.price = "0";
      const p = await storage.createProduct(body);
      callerIdService.broadcast({ type: "menu_updated" }, (req as any).tenantId);
      res.json(p);
    } catch (e: any) { productWriteError(res, e); }
  });
  app.put("/api/products/:id", async (req, res) => {
    try {
      const body = normalizeWholesaleProductFields(withoutTenant(sanitizeDates(req.body)));
      // Addons are always free
      if (body.isAddon) body.price = "0";
      const p = await storage.updateProduct(Number(req.params.id), body);
      callerIdService.broadcast({ type: "menu_updated" }, (req as any).tenantId);
      res.json(p);
    } catch (e: any) { productWriteError(res, e); }
  });
  app.delete("/api/products/:id", async (req, res) => {
    try {
      const p = await storage.getProduct(Number(req.params.id));
      await storage.deleteProduct(Number(req.params.id));
      if (p) callerIdService.broadcast({ type: "menu_updated" }, (req as any).tenantId);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Inventory
  app.get("/api/inventory", async (req, res) => {
    try {
      const branchId = req.query.branchId ? Number(req.query.branchId) : undefined;
      // The licence's store; ?tenantId= only matters for a super admin.
      const tenantId = reqTenant(req) ?? (req.query.tenantId ? Number(req.query.tenantId) : undefined);
      if (!tenantId && !branchId) return res.status(400).json({ error: "tenantId is required" });
      res.json(await storage.getInventory(branchId, tenantId));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/inventory", async (req, res) => {
    try { res.json(await storage.upsertInventory(sanitizeDates(req.body))); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/inventory/adjust", async (req, res) => {
    try {
      const { productId, branchId, adjustment } = req.body;
      res.json(await storage.adjustInventory(productId, branchId, adjustment));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.get("/api/inventory/low-stock", async (req, res) => {
    try {
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : undefined;
      const branchId = req.query.branchId ? Number(req.query.branchId) : undefined;
      if (!tenantId && !branchId) return res.status(400).json({ error: "tenantId or branchId is required" });
      if (branchId) {
        res.json(await storage.getLowStockItems(branchId));
      } else if (tenantId) {
        const tenantBranches = await storage.getBranchesByTenant(tenantId);
        const allLowStock = [];
        for (const branch of tenantBranches) {
          const items = await storage.getLowStockItems(branch.id);
          allLowStock.push(...items);
        }
        res.json(allLowStock);
      }
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Customers
  app.get("/api/customers", async (req, res) => {
    try {
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : undefined;
      if (!tenantId) return res.status(400).json({ error: "tenantId is required" });
      const limit = req.query.limit ? Math.min(Number(req.query.limit), 200) : 50;
      const offset = req.query.offset ? Number(req.query.offset) : 0;
      res.json(await storage.getCustomers(req.query.search as string, tenantId, limit, offset));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/customers/count", async (req, res) => {
    try {
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : undefined;
      const search = req.query.search as string | undefined;
      res.json({ count: await storage.getCustomerCount(search, tenantId) });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Download Customers Excel Template (must be before :id route)
  // A 5-minute link to one export, for clients that cannot send headers
  // (the native app opens downloads with Linking.openURL). Body: { path }
  // e.g. "/api/customers/export" or "/api/reports/sales-export?startDate=…".
  app.post("/api/downloads/link", async (req: any, res) => {
    try {
      const tenantId = reqTenant(req);
      if (!tenantId) return res.status(400).json({ error: "tenantId is required" });
      const raw = String(req.body?.path || "");
      let u: URL;
      try { u = new URL(raw, "http://x"); } catch { return res.status(400).json({ error: "Invalid path" }); }
      if (u.origin !== "http://x" || !DOWNLOADABLE_PATHS.some((re) => re.test(u.pathname))) {
        return res.status(400).json({ error: "This path cannot be downloaded by link", code: "NOT_DOWNLOADABLE" });
      }
      u.searchParams.delete("dl");
      u.searchParams.delete("tenantId");
      u.searchParams.set("dl", signDownloadToken(tenantId, u.pathname, req.employee));
      res.json({ url: `${u.pathname}?${u.searchParams.toString()}`, expiresIn: DOWNLOAD_TTL_SECONDS });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/customers/template", (req, res) => {
    const templateData = [
      { Name: "John Doe", Phone: "+41791234567", Email: "john@example.com", Address: "123 Main St" },
      { Name: "Jane Smith", Phone: "+41799876543", Email: "jane@example.com", Address: "456 Elm Ave" },
    ];
    const ws = xlsx.utils.json_to_sheet(templateData);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Customers");
    const buf = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });
    res.setHeader("Content-Disposition", "attachment; filename=customers_template.xlsx");
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buf);
  });

  // Export Customers Excel (must be before :id route)
  app.get("/api/customers/export", async (req, res) => {
    try {
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : undefined;
      const customers = await storage.getCustomers(undefined, tenantId);
      const exportData = customers.map((c: any) => ({
        Nr: c.customerNr || "",
        Anrede: c.salutation || "",
        Namen: c.lastName || "",
        Vorname: c.firstName || "",
        Name: c.name || "",
        Firma: c.company || "",
        Phone: c.phone || "",
        Email: c.email || "",
        Strasse: c.street || "",
        StrassNr: c.streetNr || "",
        HausNr: c.houseNr || "",
        PLZ: c.postalCode || "",
        Ort: c.city || "",
        Address: c.address || "",
        HowToGo: c.howToGo || "",
        ZHD: c.zhd || "",
        ScreenInfo: c.screenInfo || "",
        LoyaltyPoints: c.loyaltyPoints || 0,
        TotalSpent: c.totalSpent || "0",
        OrderCount: c.orderCount || 0,
        AvgOrderValue: c.averageOrderValue || "0",
        FirstOrder: c.firstOrderDate || "",
        LastOrder: c.lastOrderDate || "",
        Source: c.source || "",
        Notes: c.notes || "",
        Quadrat: c.quadrat || "",
        LegacyRef: c.legacyRef || "",
        LegacyTotalSpent: c.legacyTotalSpent || "0",
        R1: c.r1 || "",
        R3: c.r3 || "",
        R4: c.r4 || "",
        R5: c.r5 || "",
        R8: c.r8 || "",
        R9: c.r9 || "",
        R10: c.r10 || "",
        R14: c.r14 || "",
        R15: c.r15 || "",
        R16: c.r16 ? "TRUE" : "FALSE",
        R17: c.r17 ? "TRUE" : "FALSE",
        R18: c.r18 ? "TRUE" : "FALSE",
        R19: c.r19 ? "TRUE" : "FALSE",
        R20: c.r20 ? "TRUE" : "FALSE",
        CreatedAt: c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "",
      }));
      const ws = xlsx.utils.json_to_sheet(exportData);
      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, "Customers");
      const buf = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });
      res.setHeader("Content-Disposition", "attachment; filename=customers_export.xlsx");
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.send(buf);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Phone number customer lookup (must be before :id route)
  app.get("/api/customers/phone-lookup", async (req, res) => {
    try {
      const phone = req.query.phone as string;
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : undefined;
      if (!phone) return res.status(400).json({ error: "phone is required" });
      if (!tenantId) return res.status(400).json({ error: "tenantId is required" });
      const results = await storage.findCustomerByPhone(phone, tenantId);
      res.json(results);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Bulk Import Customers (must be before :id route)
  app.post("/api/customers/import", async (req: any, res) => {
    try {
      const { fileBase64 } = req.body;
      const tenantId = reqTenant(req) ?? (req.body.tenantId ? Number(req.body.tenantId) : undefined);
      if (!tenantId) return res.status(400).json({ error: "tenantId is required" });
      if (!fileBase64) return res.status(400).json({ error: "fileBase64 is required" });
      const buffer = Buffer.from(fileBase64, "base64");
      const workbook = xlsx.read(buffer, { type: "buffer" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = xlsx.utils.sheet_to_json(sheet);

      const customersToInsert = data.map((item: any) => ({
        name: item.Name || item.name || "",
        email: item.Email || item.email || undefined,
        // Same spelling as storefront logins and orders (0944… → +963944…),
        // so an imported customer is recognised when they order online.
        phone: canonicalPhone(item.Phone || item.phone || ""),
        address: item.Address || item.address || undefined,
        tenantId,
        isActive: true,
      })).filter((c: any) => c.name);

      const results = await storage.bulkCreateCustomers(customersToInsert as any);
      res.json({ success: true, count: results.length });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Bulk Import from KUNDEN_ALL CSV file on disk
  // Imports ONE specific file from the server disk (Pizza Lemon's legacy
  // customer list). Any store could call it and receive those customers, so it
  // is a super-admin maintenance tool now.
  app.post("/api/customers/import-csv", requireSuperAdmin as any, async (req: any, res) => {
    try {
      const tenantId = req.body.tenantId ? Number(req.body.tenantId) : undefined;
      if (!tenantId) return res.status(400).json({ error: "tenantId is required" });

      const csvPath = require("path").resolve(process.cwd(), "KUNDEN_ALL_fixed.csv");
      if (!require("fs").existsSync(csvPath)) {
        return res.status(404).json({ error: "CSV file not found on server" });
      }

      const csvContent = require("fs").readFileSync(csvPath, "utf-8");
      const lines = csvContent.split("\n");
      const headers = lines[0].replace(/\r$/, "").split(",");

      let imported = 0;
      let skipped = 0;
      const batchSize = 100;
      let batch: any[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].replace(/\r$/, "").trim();
        if (!line) { skipped++; continue; }

        // Parse CSV line handling commas inside fields
        const values: string[] = [];
        let current = "";
        let inQuotes = false;
        for (let j = 0; j < line.length; j++) {
          const ch = line[j];
          if (ch === '"') { inQuotes = !inQuotes; continue; }
          if (ch === ',' && !inQuotes) { values.push(current.trim()); current = ""; continue; }
          current += ch;
        }
        values.push(current.trim());

        // Map CSV columns: Nr,ANREDE,NAMEN,VORNAME,STRASSE,HOWTOGO,FIRMA,ZHD,ORT,PLZ,TEL1,STRASSNR,HAUSNR,QUADRAT,SCREENINFO,R1,R2,R3,R4,R5,R6,R7,R8,R9,R10,R11,R12,R13,R14,R15,R16,R17,R18,R19,R20,_source
        const nr = values[0] || "";
        const anrede = values[1] || "";
        const namen = values[2] || "";
        const vorname = values[3] || "";
        const strasse = values[4] || "";
        const howToGo = values[5] || "";
        const firma = values[6] || "";
        const zhd = values[7] || "";
        const ort = values[8] || "";
        const plz = values[9] || "";
        const tel1 = values[10] || "";
        const strassNr = values[11] || "";
        const hausNr = values[12] || "";
        const quadrat = values[13] || "";
        const screenInfo = values[14] || "";
        const r1 = values[15] || "";
        const r6 = values[20] || ""; // first order date
        const r7 = values[21] || ""; // last order date
        const r10 = values[24] || ""; // total spent
        const r11 = values[25] || ""; // average order value
        const r12 = values[26] || ""; // order count
        const _source = values[values.length - 1] || "";

        // Build full name: NAMEN + VORNAME
        const fullName = [namen, vorname].filter(s => s && s.trim()).join(", ").trim() || tel1 || "Unknown";

        // Build address: STRASSE STRASSNR HAUSNR, PLZ ORT
        const addressParts = [strasse, strassNr, hausNr].filter(s => s && s.trim()).join(" ").trim();
        const cityParts = [plz, ort].filter(s => s && s.trim()).join(" ").trim();
        const address = [addressParts, cityParts].filter(s => s).join(", ");

        // Build notes from QUADRAT, SCREENINFO, HOWTOGO
        const noteParts = [];
        if (screenInfo) noteParts.push(screenInfo);
        if (howToGo) noteParts.push(`Directions: ${howToGo}`);
        if (quadrat) noteParts.push(`Quadrat: ${quadrat}`);
        const notes = noteParts.join(" | ") || undefined;

        const customerData: any = {
          tenantId,
          name: fullName,
          phone: tel1 || undefined,
          address: address || undefined,
          notes,
          isActive: true,
          customerNr: nr ? parseInt(nr) || undefined : undefined,
          salutation: anrede || undefined,
          firstName: vorname || undefined,
          lastName: namen || undefined,
          street: strasse || undefined,
          streetNr: strassNr || undefined,
          houseNr: hausNr || undefined,
          city: ort || undefined,
          postalCode: plz || undefined,
          company: firma || undefined,
          zhd: zhd || undefined,
          howToGo: howToGo || undefined,
          screenInfo: screenInfo || undefined,
          source: _source || undefined,
          firstOrderDate: r6 || undefined,
          lastOrderDate: r7 || undefined,
          legacyTotalSpent: r10 ? String(parseFloat(r10) || 0) : "0",
          averageOrderValue: r11 ? String(parseFloat(r11) || 0) : "0",
          orderCount: r12 ? parseInt(r12) || 0 : 0,
          legacyRef: r1 || undefined,
          totalSpent: r10 ? String(parseFloat(r10) || 0) : "0",
          visitCount: r12 ? parseInt(r12) || 0 : 0,
        };

        batch.push(customerData);

        if (batch.length >= batchSize) {
          const results = await storage.bulkCreateCustomers(batch);
          imported += results.length;
          batch = [];
        }
      }

      // Insert remaining batch
      if (batch.length > 0) {
        const results = await storage.bulkCreateCustomers(batch);
        imported += results.length;
      }

      res.json({ success: true, imported, skipped, total: lines.length - 1 });
    } catch (e: any) {
      console.error("[CSV Import Error]", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/customers/:id", async (req, res) => {
    try {
      const cust = await storage.getCustomer(Number(req.params.id));
      if (!cust) return res.status(404).json({ error: "Customer not found" });
      res.json(cust);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/customers", async (req, res) => {
    try {
      const data: any = withTenant(req, stripProtectedCustomerFields(sanitizeDates(req.body)));
      if (data.phone) data.phone = canonicalPhone(data.phone);
      res.json(await storage.createCustomer(data));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.put("/api/customers/:id", async (req, res) => {
    try {
      const data: any = withoutTenant(stripProtectedCustomerFields(sanitizeDates(req.body)));
      if (data.phone) data.phone = canonicalPhone(data.phone);
      res.json(await storage.updateCustomer(Number(req.params.id), data));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  // Soft delete: sales.customer_id is ON DELETE CASCADE, so removing the row
  // used to delete the customer's whole sales history with it.
  app.delete("/api/customers/:id", async (req, res) => {
    try {
      const cust: any = await storage.getCustomer(Number(req.params.id));
      if (!cust) return res.status(404).json({ error: "Customer not found" });
      if (cust.customerType === "wholesale") {
        return res.status(409).json({
          error: "هذا تاجر جملة — أوقفه من شاشة الجملة / This is a wholesale trader — deactivate them from the Wholesale screen",
          code: "WHOLESALE_TRADER",
        });
      }
      await storage.deleteCustomer(cust.id);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/customers/:id/loyalty", async (req, res) => {
    try {
      const points = Number(asciiDigits(req.body?.points).trim());
      if (!Number.isInteger(points) || points === 0 || Math.abs(points) > 10_000_000) {
        return res.status(400).json({ error: "points must be a whole number / يجب أن تكون النقاط عدداً صحيحاً", code: "INVALID_POINTS" });
      }
      const cust = await storage.getCustomer(Number(req.params.id));
      if (!cust) return res.status(404).json({ error: "Customer not found" });
      if ((cust.loyaltyPoints || 0) + points < 0) {
        return res.status(400).json({ error: "Not enough points / النقاط غير كافية", code: "INSUFFICIENT_POINTS" });
      }
      res.json(await storage.addLoyaltyPoints(cust.id, points));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.get("/api/customers/:id/sales", async (req, res) => {
    try { res.json(await storage.getCustomerSales(Number(req.params.id))); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Calls
  app.get("/api/calls", async (req, res) => {
    try {
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : undefined;
      const limit = req.query.limit ? Number(req.query.limit) : 500;
      const calls = await storage.getCalls(tenantId, limit);
      res.json(calls);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Sales
  app.get("/api/sales", async (req, res) => {
    try {
      // Newest first, capped: without a limit this returned every sale ever
      // recorded (default 500, at most 5000 per request).
      const asked = Number(req.query.limit);
      const limit = Number.isFinite(asked) && asked > 0 ? Math.min(Math.floor(asked), 5000) : 500;
      const tenantId = reqTenant(req) ?? (req.query.tenantId ? Number(req.query.tenantId) : undefined);
      const branchId = req.query.branchId ? Number(req.query.branchId) : undefined;
      if (!tenantId && !(req as any).isSuperAdmin) return res.status(400).json({ error: "tenantId is required" });
      res.json(await storage.getSales({ limit, tenantId, branchId }));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.get("/api/sales/:id", async (req, res) => {
    try {
      const sale = await storage.getSale(Number(req.params.id));
      if (!sale) return res.status(404).json({ error: "Sale not found" });
      const items = await storage.getSaleItems(sale.id);
      res.json({ ...sale, items });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/sales", async (req: any, res) => {
    try {
      const { items, loyaltyPointsRedeemed, ...saleData } = sanitizeDates(req.body);
      if (reqTenant(req)) saleData.branchId = await storeBranch(req, saleData.branchId);
      // Loyalty is settled against the licence's tenant, never a body field.
      // A redemption is checked before anything is written, so a stale balance
      // refuses the sale instead of granting a discount the points can't cover.
      const loyaltyTenantId: number | undefined = req.tenantId
        ?? (saleData.customerId ? (await storage.getCustomer(saleData.customerId))?.tenantId ?? undefined : undefined);
      // Idempotency: a till that retries after a timeout sends the same
      // Idempotency-Key header / paymentDetails[].ref — hand back the sale it
      // already made instead of recording (and charging) it twice.
      const clientRef = saleClientRef(req);
      const saleTenant = reqTenant(req) ?? loyaltyTenantId
        ?? (saleData.branchId ? (await storage.getBranch(Number(saleData.branchId)))?.tenantId ?? undefined : undefined);
      if (clientRef && salesClientRefReady) {
        const existing = await storage.findSaleByClientRef(clientRef, saleTenant).catch(() => undefined);
        if (existing) return res.status(200).json(existing);
      }
      const redeemPoints = Math.max(0, Math.floor(Number(loyaltyPointsRedeemed) || 0));
      if (redeemPoints > 0) {
        const refusal = saleData.customerId && loyaltyTenantId
          ? await checkLoyaltyRedemption(Number(saleData.customerId), loyaltyTenantId, redeemPoints)
          : "A customer is required to redeem points";
        if (refusal) return res.status(400).json({ error: refusal });
      }
      // Receipt date in the store's own calendar (Damascus for SYP stores).
      const rcpTz = saleData.branchId
        ? timeZoneForCurrency(await branchCurrency(saleData.branchId))
        : await storeTimeZone(loyaltyTenantId);
      const swissDateRcp = compactDate(rcpTz);
      const dailySeqRcp = await storage.getNextSequenceNumber(`branch-${saleData.branchId || 0}`, rcpTz);
      const receiptNumber = `${saleData.branchId || 0}-${swissDateRcp}-${dailySeqRcp}`;
      // Wholesale credit (آجل): the amount goes on the trader's account under a
      // row lock and is refused over the credit limit — see server/wholesale.ts.
      let creditHold: CreditHold | null = null;
      if (saleData.paymentMethod === "credit") {
        try {
          creditHold = await holdCreditForSale((req as any).tenantId, saleData.customerId, saleData.totalAmount);
        } catch (err: any) {
          return res.status(err?.statusCode || 400).json({ error: err?.message, code: err?.code, ...(err?.details || {}) });
        }
        saleData.customerId = creditHold.customerId;
        saleData.totalAmount = (creditHold.cents / 100).toFixed(2);
        saleData.paymentStatus = "pending";
      }
      // Totals come from the till (discounts, service fees, wholesale prices
      // and manual adjustments are all applied there), so they are not
      // rejected — but a subtotal that disagrees with its own lines is logged.
      warnInconsistentSaleTotals(saleData, items);
      // Sale, lines, stock and the idempotency key in one transaction.
      let sale: any;
      try {
        sale = await storage.createSaleWithItems(
          { ...saleData, receiptNumber },
          Array.isArray(items) ? items : [],
          { clientRef: clientRef && salesClientRefReady ? clientRef : null, employeeId: saleData.employeeId },
        );
      } catch (err: any) {
        if (creditHold) await releaseCreditHold(creditHold);
        // A concurrent retry with the same key won the race: return its sale.
        if (clientRef && err?.code === "ER_DUP_ENTRY" && /client_ref/i.test(String(err?.message))) {
          const existing = await storage.findSaleByClientRef(clientRef, saleTenant).catch(() => undefined);
          if (existing) return res.status(200).json(existing);
        }
        throw err;
      }
      if (saleData.customerId) {
        // Points follow Settings -> Loyalty (on/off, earn rate, point value).
        const existingCustomer = await storage.getCustomer(saleData.customerId);
        if (loyaltyTenantId && existingCustomer
          && (existingCustomer.tenantId == null || existingCustomer.tenantId === loyaltyTenantId)) {
          try {
            await settlePosSaleLoyalty({
              customerId: existingCustomer.id,
              tenantId: loyaltyTenantId,
              receiptNumber: sale.receiptNumber,
              amountPaid: Number(saleData.totalAmount),
              redeemPoints,
            });
          } catch (e: any) {
            // The sale is already written; a loyalty hiccup must not fail it.
            console.error("[loyalty] POS sale", sale.id, e?.message || e);
          }
        }
        if (existingCustomer) {
          await storage.updateCustomer(saleData.customerId, {
            visitCount: (existingCustomer.visitCount || 0) + 1,
            totalSpent: String(Number(existingCustomer.totalSpent || 0) + Number(saleData.totalAmount)),
          });
        }
      }

      // Link call if callId was provided
      if (req.body.callId) {
        await storage.updateCall(Number(req.body.callId), { saleId: sale.id, status: "answered" });
      }

      // Log activity
      const saleCur = saleData.branchId ? await branchCurrency(saleData.branchId) : await storeCurrency(loyaltyTenantId);
      await storage.createActivityLog({
        employeeId: saleData.employeeId,
        action: "sale_created",
        entityType: "sale",
        entityId: sale.id,
        details: `Sale ${sale.receiptNumber} completed for ${formatMoney(saleData.totalAmount, saleCur)}`,
      });
      // Handle employee commission
      if (saleData.employeeId) {
        const emp = await storage.getEmployee(saleData.employeeId);
        if (emp && Number(emp.commissionRate || 0) > 0) {
          const commRate = Number(emp.commissionRate);
          const commAmount = Number(saleData.totalAmount) * (commRate / 100);
          await storage.createEmployeeCommission({
            employeeId: saleData.employeeId,
            saleId: sale.id,
            commissionRate: String(commRate),
            commissionAmount: String(commAmount.toFixed(2)),
          });
        }
      }
      // Notify admins about the sale
      const saleEmp = await storage.getEmployee(saleData.employeeId);
      await storage.notifyAdmins(
        saleData.employeeId,
        "sale_completed",
        "New Sale",
        `${saleEmp?.name || "Employee"} completed sale ${sale.receiptNumber} for ${formatMoney(saleData.totalAmount, saleCur)} (${saleData.paymentMethod || "cash"})`,
        "sale",
        sale.id
      );

      // ── Mirror POS sales-with-driver into online_orders so the assigned ──
      // driver sees the order in their PWA. The driver's order list reads
      // `online_orders WHERE driver_id = :vehicleId`, so without this mirror
      // a sale created at the till with a vehicle picked never reaches the
      // driver app at /driver/<accessToken>. We trigger on ANY vehicleId,
      // not just orderType=delivery, because cashiers sometimes leave the
      // type as dine_in/takeaway but still hand off the order to a driver.
      if (saleData.vehicleId) {
        try {
          const { db } = await import("./db");
          const { onlineOrders, customers, branches, vehicles } = await import("@shared/schema");
          const { eq } = await import("drizzle-orm");
          // Resolve tenantId via branch since POS sales table doesn't carry it.
          let resolvedTenantId: number | undefined = reqTenant(req) ?? saleData.tenantId;
          if (!resolvedTenantId && saleData.branchId) {
            const [br] = await db.select({ tenantId: branches.tenantId }).from(branches).where(eq(branches.id, saleData.branchId)).limit(1);
            resolvedTenantId = br?.tenantId ?? undefined;
          }
          if (!resolvedTenantId) {
            const [veh] = await db.select({ tenantId: vehicles.tenantId }).from(vehicles).where(eq(vehicles.id, saleData.vehicleId)).limit(1);
            resolvedTenantId = veh?.tenantId ?? undefined;
          }
          // Never guess a store (this used to fall back to tenant 24).
          if (!resolvedTenantId) throw new Error("cannot resolve the store of this sale");
          const [cust] = saleData.customerId
            ? await db.select().from(customers).where(eq(customers.id, saleData.customerId)).limit(1)
            : [null];
          const customerName = cust?.name || saleData.customerName || "Walk-in";
          const customerPhone = cust?.phone || "";
          const customerAddress = cust?.address
            || [cust?.street, cust?.streetNr || cust?.houseNr, cust?.postalCode, cust?.city].filter(Boolean).join(" ")
            || "";
          const onlineItems = (items || []).map((it: any) => ({
            productId: it.productId,
            name: it.productName || it.name,
            quantity: it.quantity,
            unitPrice: Number(it.unitPrice),
            total: Number(it.total),
            notes: it.notes || undefined,
          }));
          const trackingToken = require("crypto").randomBytes(24).toString("hex");
          const orderNumber = sale.receiptNumber || `POS-${sale.id}`;
          const [inserted] = await db.insert(onlineOrders).values({
            tenantId: resolvedTenantId,
            orderNumber,
            customerName,
            customerPhone: customerPhone || "—",
            customerAddress: customerAddress || null,
            customerEmail: cust?.email || null,
            items: onlineItems as any,
            subtotal: String(saleData.subtotal || 0),
            taxAmount: String(saleData.taxAmount || 0),
            deliveryFee: "0",
            totalAmount: String(saleData.totalAmount || 0),
            paymentMethod: saleData.paymentMethod || "cash",
            paymentStatus: saleData.paymentStatus === "completed" ? "paid" : "pending",
            status: "accepted",        // POS already confirmed it
            orderType: "delivery",
            notes: saleData.notes || null,
            driverId: saleData.vehicleId,
            sourceChannel: "pos",
            trackingToken,
          } as any).$returningId();

          // Notify the driver via the WS/SSE channel so the PWA reloads.
          try {
            const { callerIdService } = await import("./callerIdService");
            callerIdService.broadcast({
              type: "delivery_status_change",
              orderId: (inserted as any).id,
              vehicleId: saleData.vehicleId,
              status: "accepted",
              orderNumber,
              customerName,
            }, resolvedTenantId);
          } catch { /* non-fatal */ }
        } catch (mirrorErr) {
          console.error("[/api/sales] online_orders mirror failed:", mirrorErr);
          // Don't fail the sale just because the mirror failed.
        }
      }

      res.json(sale);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.put("/api/sales/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { items, ...saleData } = req.body;
      // A sale never moves to another branch/receipt number through an edit.
      const { id: _id, receiptNumber: _r, branchId: _b, tenantId: _t, ...editable } = saleData || {};
      // Header and items change together or not at all: a failure half-way
      // used to leave a sale with its items deleted.
      const sale = await storage.updateSaleWithItems(id, sanitizeDates(editable), Array.isArray(items) ? items : undefined);
      res.json(sale);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete("/api/sales/:id", async (req, res) => {
    try {
      await reverseCreditSale((req as any).tenantId, Number(req.params.id));
      await storage.deleteSale(Number(req.params.id));
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Suppliers
  app.get("/api/suppliers", async (req, res) => {
    try {
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : undefined;
      res.json(await storage.getSuppliers(tenantId));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.get("/api/suppliers/:id", async (req, res) => {
    try {
      const sup = await storage.getSupplier(Number(req.params.id));
      if (!sup) return res.status(404).json({ error: "Supplier not found" });
      res.json(sup);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/suppliers", async (req, res) => {
    try { res.json(await storage.createSupplier(withTenant(req, sanitizeDates(req.body)))); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.put("/api/suppliers/:id", async (req, res) => {
    try { res.json(await storage.updateSupplier(Number(req.params.id), withoutTenant(sanitizeDates(req.body)))); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Purchase Orders
  app.get("/api/purchase-orders", async (req, res) => {
    try {
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : undefined;
      res.json(await storage.getPurchaseOrders(tenantId));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/purchase-orders", async (req, res) => {
    try {
      const data: any = withoutTenant(sanitizeDates(req.body));
      // order_number is NOT NULL UNIQUE across the platform. Keep the client's
      // number (PO-YYYYMMDD-xxxxx) when it is free; otherwise make one here.
      const wanted = typeof data.orderNumber === "string" ? data.orderNumber.trim().slice(0, 64) : "";
      if (!wanted || (await storage.purchaseOrderNumberExists(wanted))) {
        const tz = await storeTimeZone(reqTenant(req));
        let candidate = "";
        for (let i = 0; i < 5; i++) {
          candidate = `PO-${compactDate(tz)}-${crypto.randomInt(10000, 99999)}`;
          if (!(await storage.purchaseOrderNumberExists(candidate))) break;
        }
        data.orderNumber = candidate;
      } else {
        data.orderNumber = wanted;
      }
      res.json(await storage.createPurchaseOrder(data));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.put("/api/purchase-orders/:id", async (req, res) => {
    try { res.json(await storage.updatePurchaseOrder(Number(req.params.id), withoutTenant(sanitizeDates(req.body)))); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Shifts
  app.get("/api/shifts", async (req, res) => {
    try {
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : undefined;
      res.json(await storage.getShifts(tenantId));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.get("/api/shifts/stats", async (req, res) => {
    try {
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : undefined;
      if (!tenantId) return res.status(400).json({ error: "tenantId is required" });
      res.json(await storage.getShiftStats(tenantId));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.get("/api/shifts/active", async (req, res) => {
    try {
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : undefined;
      if (!tenantId) return res.status(400).json({ error: "tenantId is required" });
      res.json(await storage.getAllActiveShifts(tenantId));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/shifts", async (req, res) => {
    try {
      const shiftData = sanitizeDates(req.body);
      if (reqTenant(req)) shiftData.branchId = await storeBranch(req, shiftData.branchId);
      const shift = await storage.createShift(shiftData);
      const emp = await storage.getEmployee(shift.employeeId);
      const cur = shift.branchId ? await branchCurrency(shift.branchId) : await storeCurrency(reqTenant(req));
      await storage.createActivityLog({
        employeeId: shift.employeeId,
        action: "shift_started",
        entityType: "shift",
        entityId: shift.id,
        details: `Shift started by ${emp?.name || "Unknown"} with ${formatMoney(shift.openingCash || 0, cur)} opening cash`,
      });
      await storage.notifyAdmins(
        shift.employeeId,
        "shift_started",
        "Shift Started",
        `${emp?.name || "Employee"} has started a new shift with ${formatMoney(shift.openingCash || 0, cur)} opening cash`,
        "shift",
        shift.id,
        "normal"
      );
      res.json(shift);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.put("/api/shifts/:id", async (req, res) => {
    try {
      const shift = await storage.updateShift(Number(req.params.id), sanitizeDates(req.body));
      res.json(shift);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.put("/api/shifts/:id/close", async (req, res) => {
    try {
      const shift = await storage.closeShift(Number(req.params.id), sanitizeDates(req.body));
      const emp = await storage.getEmployee(shift.employeeId);
      const cur = shift.branchId ? await branchCurrency(shift.branchId) : await storeCurrency(reqTenant(req));
      await storage.createActivityLog({
        employeeId: shift.employeeId,
        action: "shift_closed",
        entityType: "shift",
        entityId: shift.id,
        details: `Shift closed with ${shift.totalTransactions || 0} transactions and ${formatMoney(shift.closingCash || 0, cur)} closing cash`,
      });
      await storage.notifyAdmins(
        shift.employeeId,
        "shift_ended",
        "Shift Ended",
        `${emp?.name || "Employee"} has ended their shift. Transactions: ${shift.totalTransactions || 0}, Sales: ${formatMoney(shift.totalSales || 0, cur)}`,
        "shift",
        shift.id,
        "normal"
      );
      res.json(shift);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Notifications
  app.get("/api/notifications/:employeeId", async (req, res) => {
    try { res.json(await storage.getNotifications(Number(req.params.employeeId))); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.get("/api/notifications/:employeeId/unread-count", async (req, res) => {
    try { res.json({ count: await storage.getUnreadNotificationCount(Number(req.params.employeeId)) }); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/notifications", async (req, res) => {
    try {
      const data: any = sanitizeDates(req.body);
      // Only to a colleague in the same store.
      if (data.recipientId && !(await ownedBy(req, own.employee, Number(data.recipientId)))) {
        return res.status(404).json({ error: "Not found" });
      }
      res.json(await storage.createNotification(data));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.put("/api/notifications/:id/read", async (req, res) => {
    try { res.json(await storage.markNotificationRead(Number(req.params.id))); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.put("/api/notifications/:employeeId/read-all", async (req, res) => {
    try { await storage.markAllNotificationsRead(Number(req.params.employeeId)); res.json({ success: true }); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Expenses
  app.get("/api/expenses", async (req, res) => {
    try {
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : undefined;
      res.json(await storage.getExpenses(tenantId));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/expenses", async (req, res) => {
    try {
      const data: any = withTenant(req, sanitizeDates(req.body));
      // The POS sends categoryId (its expense-category key) or category.
      if ((data.category == null || data.category === "") && data.categoryId != null && data.categoryId !== "") {
        data.category = String(data.categoryId);
      }
      delete data.categoryId;
      if (!data.category) return res.status(400).json({ error: "category is required" });
      if (data.amount != null) data.amount = asciiDigits(data.amount).replace(/,/g, "");
      res.json(await storage.createExpense(data));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Tables
  app.get("/api/tables", async (req, res) => {
    try {
      const branchId = req.query.branchId ? Number(req.query.branchId) : undefined;
      const tenantId = reqTenant(req) ?? (req.query.tenantId ? Number(req.query.tenantId) : undefined);
      if (!branchId && !tenantId) return res.status(400).json({ error: "tenantId or branchId is required" });
      res.json(await storage.getTables(branchId, tenantId));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/tables", async (req, res) => {
    try {
      const data: any = withoutTenant(sanitizeDates(req.body));
      // A table always hangs off one of this store's branches (the ownership
      // middleware has already checked a branchId that was sent).
      if (!data.branchId) {
        const tenantId = reqTenant(req);
        if (!tenantId) return res.status(400).json({ error: "branchId is required" });
        const brs = await storage.getBranchesByTenant(tenantId);
        const main: any = brs.find((b: any) => b.isMain) || brs[0];
        if (!main) return res.status(400).json({ error: "branchId is required" });
        data.branchId = main.id;
      }
      res.json(await storage.createTable(data));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.put("/api/tables/:id", async (req, res) => {
    try { res.json(await storage.updateTable(Number(req.params.id), withoutTenant(sanitizeDates(req.body)))); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.delete("/api/tables/:id", async (req, res) => {
    try {
      const table = await storage.getTable(Number(req.params.id));
      if (!table) return res.status(404).json({ error: "Table not found" });
      await storage.deleteTable(table.id);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ── Table QR Codes ──
  app.get("/api/table-qr-codes", async (req, res) => {
    try {
      const tenantId = Number(req.query.tenantId);
      if (!tenantId) return res.status(400).json({ error: "tenantId required" });
      res.json(await storage.getTableQrCodes(tenantId));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/table-qr-codes", async (req, res) => {
    try {
      const { tableId, branchId, tableName } = req.body;
      const tenantId = reqTenant(req) ?? (req.body.tenantId ? Number(req.body.tenantId) : undefined);
      if (!tenantId || !tableId || !tableName) return res.status(400).json({ error: "tenantId, tableId, tableName required" });
      if (!(await ownedBy(req, own.table, Number(tableId)))) return res.status(404).json({ error: "Table not found" });
      const qrToken = `TBL-${crypto.randomBytes(16).toString("hex")}`;
      const qr = await storage.createTableQrCode({
        tenantId: Number(tenantId),
        tableId: Number(tableId),
        branchId: branchId ? Number(branchId) : null,
        qrToken,
        tableName,
        isActive: true,
      } as any);
      res.status(201).json(qr);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/table-qr-codes/generate-all", async (req, res) => {
    try {
      const { branchId } = req.body;
      const tenantId = reqTenant(req) ?? (req.body.tenantId ? Number(req.body.tenantId) : undefined);
      if (!tenantId) return res.status(400).json({ error: "tenantId required" });
      // Only this store's tables (without a branch it used to take every
      // store's tables and mint QR codes for them).
      const allTables = await storage.getTables(branchId ? Number(branchId) : undefined, Number(tenantId));
      const existing = await storage.getTableQrCodes(Number(tenantId));
      const existingTableIds = new Set(existing.map((q: any) => q.tableId));
      const created: any[] = [];
      for (const table of allTables) {
        if (existingTableIds.has(table.id)) continue;
        const qrToken = `TBL-${crypto.randomBytes(16).toString("hex")}`;
        const qr = await storage.createTableQrCode({
          tenantId: Number(tenantId),
          tableId: table.id,
          branchId: table.branchId ?? null,
          qrToken,
          tableName: table.name,
          isActive: true,
        } as any);
        created.push(qr);
      }
      res.json({ created: created.length, qrCodes: created });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.put("/api/table-qr-codes/:id", async (req, res) => {
    try {
      // The token and owner are fixed; a QR code may be renamed or switched off.
      const { tableName, isActive } = req.body || {};
      const data: any = {};
      if (typeof tableName === "string" && tableName.trim()) data.tableName = tableName.trim().slice(0, 100);
      if (typeof isActive === "boolean") data.isActive = isActive;
      if (req.body?.tableId != null) {
        if (!(await ownedBy(req, own.table, Number(req.body.tableId)))) return res.status(404).json({ error: "Table not found" });
        data.tableId = Number(req.body.tableId);
      }
      if (!Object.keys(data).length) return res.status(400).json({ error: "Nothing to update" });
      res.json(await storage.updateTableQrCode(Number(req.params.id), data));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete("/api/table-qr-codes/:id", async (req, res) => {
    try { await storage.deleteTableQrCode(Number(req.params.id)); res.json({ success: true }); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Validate QR token for dine-in (public endpoint)
  app.get("/api/dine-in/validate/:token", async (req, res) => {
    try {
      const qr = await storage.getTableQrCodeByToken(req.params.token);
      if (!qr || !qr.isActive) return res.status(404).json({ error: "Invalid or inactive QR code" });
      // When the page names the store it is showing, a QR code of another
      // store is not valid there.
      const viewedTenant = req.query.tenantId ? Number(req.query.tenantId) : undefined;
      if (viewedTenant && viewedTenant !== qr.tenantId) return res.status(404).json({ error: "Invalid or inactive QR code" });
      if (typeof req.query.slug === "string" && req.query.slug) {
        const cfg = await storage.getLandingPageConfigBySlug(req.query.slug);
        if (cfg && cfg.tenantId !== qr.tenantId) return res.status(404).json({ error: "Invalid or inactive QR code" });
      }
      await storage.incrementQrScanCount(req.params.token);
      const config = await storage.getLandingPageConfigByTenantId(qr.tenantId);
      res.json({
        valid: true,
        tableId: qr.tableId,
        tableName: qr.tableName,
        branchId: qr.branchId,
        tenantId: qr.tenantId,
        slug: config?.slug || null,
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Kitchen Orders
  app.get("/api/kitchen-orders", async (req, res) => {
    try {
      const branchId = req.query.branchId ? Number(req.query.branchId) : undefined;
      const tenantId = reqTenant(req) ?? (req.query.tenantId ? Number(req.query.tenantId) : undefined);
      if (!branchId && !tenantId) return res.status(400).json({ error: "tenantId or branchId is required" });
      res.json(await storage.getKitchenOrders(branchId, tenantId));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/kitchen-orders", async (req, res) => {
    try {
      const data: any = sanitizeDates(req.body);
      if (data.saleId && !(await ownedBy(req, own.sale, Number(data.saleId)))) return res.status(404).json({ error: "Sale not found" });
      res.json(await storage.createKitchenOrder(data));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.put("/api/kitchen-orders/:id", async (req, res) => {
    try { res.json(await storage.updateKitchenOrder(Number(req.params.id), sanitizeDates(req.body))); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Subscriptions
  app.get("/api/subscription-plans", async (_req, res) => {
    try { res.json(await storage.getSubscriptionPlans()); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  // Plans are one platform-wide list (no tenant column): only the platform
  // operator may add to it.
  app.post("/api/subscription-plans", requireSuperAdmin as any, async (req, res) => {
    try { res.json(await storage.createSubscriptionPlan(sanitizeDates(req.body))); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.get("/api/subscriptions", async (req, res) => {
    try { res.json(await storage.getSubscriptions(reqTenant(req))); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/subscriptions", async (req, res) => {
    try { res.json(await storage.createSubscription(sanitizeDates(req.body))); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Delete Expense
  app.delete("/api/expenses/:id", async (req, res) => {
    try { await storage.deleteExpense(Number(req.params.id)); res.json({ success: true }); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Purchase Order - single with items
  app.get("/api/purchase-orders/:id", async (req, res) => {
    try {
      const po = await storage.getPurchaseOrder(Number(req.params.id));
      if (!po) return res.status(404).json({ error: "Purchase order not found" });
      const items = await storage.getPurchaseOrderItems(po.id);
      res.json({ ...po, items });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Add item to PO
  app.post("/api/purchase-orders/:id/items", async (req, res) => {
    try {
      const item = await storage.createPurchaseOrderItem({ ...sanitizeDates(req.body), purchaseOrderId: Number(req.params.id) });
      res.json(item);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Receive PO
  app.post("/api/purchase-orders/:id/receive", async (req, res) => {
    try {
      const result = await storage.receivePurchaseOrder(Number(req.params.id), req.body.items);
      if (!result) return res.status(404).json({ error: "Purchase order not found" });
      res.json(result);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Employee shifts/attendance
  app.get("/api/employees/:id/shifts", async (req, res) => {
    try { res.json(await storage.getEmployeeAttendance(Number(req.params.id))); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Analytics
  app.get("/api/analytics/top-products", async (req, res) => {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : undefined;
      res.json(await storage.getTopProducts(limit, analyticsTenant(req)));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.get("/api/analytics/sales-by-payment", async (req, res) => {
    try { res.json(await storage.getSalesByPaymentMethod(analyticsTenant(req))); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.get("/api/analytics/sales-range", async (req, res) => {
    try {
      const tenantId = analyticsTenant(req);
      const tz = await storeTimeZone(tenantId);
      // A bare YYYY-MM-DD is a store calendar day (start → 00:00, end → 23:59:59.999).
      const parse = (v: unknown, end: boolean, fallback: Date) => {
        const s = String(v ?? "").trim();
        if (!s) return fallback;
        const d = /^\d{4}-\d{2}-\d{2}$/.test(s) ? (end ? dayEnd(tz, s) : dayStart(tz, s)) : new Date(s);
        return isNaN(d.getTime()) ? fallback : d;
      };
      const startDate = parse(req.query.startDate, false, new Date(0));
      const endDate = parse(req.query.endDate, true, new Date());
      const branchId = req.query.branchId ? Number(req.query.branchId) : undefined;
      res.json(await storage.getSalesByDateRange(startDate, endDate, tenantId, branchId));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Seed data
  app.post("/api/seed", async (_req, res) => {
    try {
      const seeded = await storage.seedInitialData();
      if (!seeded) return res.json({ message: "Data already seeded" });
      res.json({ message: "Seed data created successfully" });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/fix-schema-and-seed", async (_req, res) => {
    try {
      const { db } = await import("./db");
      const { sql } = await import("drizzle-orm");

      console.log("[API-SEED] Fixing schema...");
      const tables = ['branches', 'products', 'employees', 'sales', 'inventory', 'customers', 'suppliers'];
      for (const table of tables) {
        try {
          await db.execute(sql.raw(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS tenant_id integer`));
          console.log(`[API-SEED] Table ${table} fixed`);
        } catch (e: any) {
          console.log(`[API-SEED] Table ${table} skip: ${e.message}`);
        }
      }

      const { seedAllDemoData } = await import("./seedAllDemoData");
      await seedAllDemoData();
      res.json({ success: true, message: "Schema fixed and comprehensive demo data seeded." });
    } catch (e: any) {
      console.error("Manual fix & seed error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/force-full-seed", async (_req, res) => {
    try {
      const { seedAllDemoData } = await import("./seedAllDemoData");
      await seedAllDemoData();
      res.json({ success: true, message: "Comprehensive demo data seeded successfully" });
    } catch (e: any) {
      console.error("Manual seed error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // Activity Log
  app.get("/api/activity-log", async (req, res) => {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : undefined;
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : undefined;
      res.json(await storage.getActivityLog(limit, tenantId));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Returns & Refunds
  app.get("/api/returns", async (req, res) => {
    try {
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : undefined;
      res.json(await storage.getReturns(tenantId));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.get("/api/returns/:id", async (req, res) => {
    try {
      const ret = await storage.getReturn(Number(req.params.id));
      if (!ret) return res.status(404).json({ error: "Return not found" });
      const items = await storage.getReturnItems(ret.id);
      res.json({ ...ret, items });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/returns", async (req, res) => {
    try {
      const { items, ...returnData } = sanitizeDates(req.body);
      if (returnData.originalSaleId && !(await ownedBy(req, own.sale, Number(returnData.originalSaleId)))) {
        return res.status(404).json({ error: "Sale not found" });
      }
      const ret = await storage.createReturn(returnData);
      if (items && items.length > 0) {
        for (const item of items) {
          await storage.createReturnItem({ ...item, returnId: ret.id });
          if (returnData.branchId) {
            await storage.adjustInventory(item.productId, returnData.branchId, item.quantity);
            await storage.createInventoryMovement({
              productId: item.productId,
              branchId: returnData.branchId,
              type: "return",
              quantity: item.quantity,
              referenceType: "return",
              referenceId: ret.id,
              employeeId: returnData.employeeId,
            });
          }
        }
      }
      // Mark original sale as refunded
      if (returnData.originalSaleId) {
        await storage.updateSale(returnData.originalSaleId, { status: "refunded" });
        // Goods back from a wholesale credit sale: the trader owes less.
        try {
          await creditReturnForSale((req as any).tenantId, returnData.originalSaleId, ret.id, returnData.totalAmount, returnData.employeeId ?? null);
        } catch (err: any) {
          console.error("[/api/returns] wholesale balance not reduced:", err?.message || err);
        }
      }
      // Log activity
      const retCur = returnData.branchId ? await branchCurrency(returnData.branchId) : await storeCurrency(reqTenant(req));
      await storage.createActivityLog({
        employeeId: returnData.employeeId,
        action: "return_created",
        entityType: "return",
        entityId: ret.id,
        details: `Return/refund processed for sale #${returnData.originalSaleId}, amount: ${formatMoney(returnData.totalAmount, retCur)}`,
      });
      // Notify admins about the return
      const retEmp = await storage.getEmployee(returnData.employeeId);
      await storage.notifyAdmins(
        returnData.employeeId,
        "return_processed",
        "Return Processed",
        `${retEmp?.name || "Employee"} processed a ${returnData.type || "refund"} for ${formatMoney(returnData.totalAmount, retCur)}`,
        "return",
        ret.id,
        "high"
      );
      res.json(ret);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Cash Drawer Operations
  app.get("/api/cash-drawer/:shiftId", async (req, res) => {
    try { res.json(await storage.getCashDrawerOperations(Number(req.params.shiftId))); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/cash-drawer", async (req, res) => {
    try {
      if (req.body?.shiftId && !(await ownedBy(req, own.shift, Number(req.body.shiftId)))) {
        return res.status(404).json({ error: "Shift not found" });
      }
      const op = await storage.createCashDrawerOperation(sanitizeDates(req.body));
      const cdCur = await storeCurrency(reqTenant(req));
      await storage.createActivityLog({ employeeId: req.body.employeeId, action: "cash_drawer_" + req.body.type, entityType: "cash_drawer", entityId: op.id, details: `Cash drawer ${req.body.type}: ${formatMoney(req.body.amount, cdCur)}` });
      const cdEmp = await storage.getEmployee(req.body.employeeId);
      await storage.notifyAdmins(
        req.body.employeeId,
        "cash_drawer",
        `Cash Drawer: ${req.body.type}`,
        `${cdEmp?.name || "Employee"} performed ${req.body.type} of ${formatMoney(req.body.amount, cdCur)}${req.body.reason ? ` - ${req.body.reason}` : ""}`,
        "cash_drawer",
        op.id,
        req.body.type === "withdrawal" ? "high" : "normal"
      );
      res.json(op);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Warehouses
  app.get("/api/warehouses", async (req, res) => {
    try {
      const branchId = req.query.branchId ? Number(req.query.branchId) : undefined;
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : undefined;
      res.json(await storage.getWarehouses(branchId, tenantId));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/warehouses", async (req, res) => {
    try { res.json(await storage.createWarehouse(sanitizeDates(req.body))); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.put("/api/warehouses/:id", async (req, res) => {
    try { res.json(await storage.updateWarehouse(Number(req.params.id), withoutTenant(sanitizeDates(req.body)))); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Warehouse Transfers
  app.get("/api/warehouse-transfers", async (req, res) => {
    try { res.json(await storage.getWarehouseTransfers(reqTenant(req))); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/warehouse-transfers", async (req, res) => {
    try {
      for (const key of ["fromWarehouseId", "toWarehouseId"]) {
        const wid = Number(req.body?.[key]);
        if (!wid || !(await ownedBy(req, own.warehouse, wid))) return res.status(404).json({ error: "Warehouse not found" });
      }
      const transfer = await storage.createWarehouseTransfer(sanitizeDates(req.body));
      await storage.createInventoryMovement({ productId: req.body.productId, branchId: null, type: "transfer", quantity: req.body.quantity, referenceType: "transfer", referenceId: transfer.id, employeeId: req.body.employeeId, notes: `Transfer from warehouse ${req.body.fromWarehouseId} to ${req.body.toWarehouseId}` });
      res.json(transfer);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Product Batches
  app.get("/api/product-batches", async (req, res) => {
    try {
      const productId = req.query.productId ? Number(req.query.productId) : undefined;
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : undefined;
      res.json(await storage.getProductBatches(productId, tenantId));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/product-batches", async (req, res) => {
    try { res.json(await storage.createProductBatch(sanitizeDates(req.body))); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.put("/api/product-batches/:id", async (req, res) => {
    try { res.json(await storage.updateProductBatch(Number(req.params.id), withoutTenant(sanitizeDates(req.body)))); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.delete("/api/product-batches/:id", async (req, res) => {
    try { res.json(await storage.updateProductBatch(Number(req.params.id), { isActive: false })); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Inventory Movements
  app.get("/api/inventory-movements", async (req, res) => {
    try {
      const productId = req.query.productId ? Number(req.query.productId) : undefined;
      const limit = req.query.limit ? Number(req.query.limit) : undefined;
      res.json(await storage.getInventoryMovements(productId, limit, analyticsTenant(req)));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Stock Counts (Physical Inventory)
  app.get("/api/stock-counts", async (req, res) => {
    try { res.json(await storage.getStockCounts(reqTenant(req))); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.get("/api/stock-counts/:id", async (req, res) => {
    try {
      const sc = await storage.getStockCount(Number(req.params.id));
      if (!sc) return res.status(404).json({ error: "Stock count not found" });
      const items = await storage.getStockCountItems(sc.id);
      res.json({ ...sc, items });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/stock-counts", async (req, res) => {
    try {
      const { items, ...countData } = sanitizeDates(req.body);
      const sc = await storage.createStockCount(countData);
      if (items && items.length > 0) {
        for (const item of items) {
          await storage.createStockCountItem({ ...item, stockCountId: sc.id });
        }
      }
      res.json(sc);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.put("/api/stock-counts/:id/approve", async (req, res) => {
    try {
      const sc = await storage.updateStockCount(Number(req.params.id), { status: "approved", approvedBy: req.body.approvedBy });
      const items = await storage.getStockCountItems(sc.id);
      for (const item of items) {
        if (item.actualQuantity !== null && item.difference !== null && item.difference !== 0) {
          await storage.adjustInventory(item.productId, sc.branchId, item.difference);
          await storage.createInventoryMovement({ productId: item.productId, branchId: sc.branchId, type: "count", quantity: item.difference, referenceType: "manual", referenceId: sc.id, notes: `Stock count adjustment: system ${item.systemQuantity} → actual ${item.actualQuantity}` });
        }
      }
      await storage.createActivityLog({ employeeId: req.body.approvedBy, action: "stock_count_approved", entityType: "stock_count", entityId: sc.id, details: `Stock count #${sc.id} approved with ${sc.discrepancies || 0} discrepancies` });
      res.json(sc);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Supplier Contracts
  app.get("/api/supplier-contracts", async (req, res) => {
    try { res.json(await storage.getSupplierContracts(req.query.supplierId ? Number(req.query.supplierId) : undefined, reqTenant(req))); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/supplier-contracts", async (req, res) => {
    try { res.json(await storage.createSupplierContract(sanitizeDates(req.body))); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.put("/api/supplier-contracts/:id", async (req, res) => {
    try { res.json(await storage.updateSupplierContract(Number(req.params.id), withoutTenant(sanitizeDates(req.body)))); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Employee Commissions
  app.get("/api/employee-commissions", async (req, res) => {
    try { res.json(await storage.getEmployeeCommissions(req.query.employeeId ? Number(req.query.employeeId) : undefined, reqTenant(req))); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/employee-commissions", async (req, res) => {
    try {
      if (req.body?.saleId && !(await ownedBy(req, own.sale, Number(req.body.saleId)))) return res.status(404).json({ error: "Sale not found" });
      res.json(await storage.createEmployeeCommission(sanitizeDates(req.body)));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Advanced Analytics
  app.get("/api/analytics/employee-sales/:id", async (req, res) => {
    try { res.json(await storage.getEmployeeSalesReport(Number(req.params.id))); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.get("/api/analytics/slow-moving", async (req, res) => {
    try { res.json(await storage.getSlowMovingProducts(req.query.days ? Number(req.query.days) : 30, analyticsTenant(req))); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.get("/api/analytics/profit-by-product", async (req, res) => {
    try { res.json(await storage.getProfitByProduct(analyticsTenant(req))); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.get("/api/analytics/cashier-performance", async (req, res) => {
    try { res.json(await storage.getCashierPerformance(analyticsTenant(req))); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.get("/api/analytics/returns-report", async (req, res) => {
    try { res.json(await storage.getReturnsReport(analyticsTenant(req))); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Daily Sales Report (for Tagesabschluss print)
  app.get("/api/reports/daily-sales-report", async (req, res) => {
    try {
      const tenantId = analyticsTenant(req);
      if (!tenantId) return res.status(400).json({ error: "tenantId is required" });
      // The store's calendar day (Damascus / Zurich), not the UTC day.
      const tz = await storeTimeZone(tenantId);
      const raw = String(req.query.date || "").trim();
      const date = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : localDateString(tz);
      const salesData = await storage.getSalesWithCustomerByDateRange(dayStart(tz, date), dayEnd(tz, date), tenantId);
      res.json(salesData);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Report Exports
  app.get("/api/reports/sales-export", async (req, res) => {
    try {
      const tenantId = analyticsTenant(req);
      if (!tenantId) return res.status(400).json({ error: "tenantId is required" });
      const tz = await storeTimeZone(tenantId);
      const startDate = /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.startDate || "")) ? String(req.query.startDate) : "2000-01-01";
      const endDate = /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.endDate || "")) ? String(req.query.endDate) : "2099-12-31";
      const salesData = await storage.getSalesByDateRange(dayStart(tz, startDate), dayEnd(tz, endDate), tenantId);

      const headers = ["Receipt #", "Date", "Total", "Payment Method", "Status", "Employee ID", "Customer ID"];
      const rows = salesData.map((s: any) => [
        s.receiptNumber || `#${s.id}`,
        new Date(s.createdAt).toLocaleString(),
        Number(s.totalAmount).toFixed(2),
        s.paymentMethod,
        s.status,
        s.employeeId,
        s.customerId || "Walk-in",
      ]);

      const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename=sales-report-${startDate}-to-${endDate}.csv`);
      res.send(csv);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // CSV Export for Inventory
  app.get("/api/reports/inventory-export", async (req, res) => {
    try {
      const tenantId = analyticsTenant(req);
      if (!tenantId) return res.status(400).json({ error: "tenantId is required" });
      const allProducts = await storage.getProductsByTenant(tenantId);
      const headers = ["ID", "Name", "Category", "Barcode", "Price", "Cost Price", "Stock Qty", "Low Stock Threshold", "Status"];
      const rows = allProducts.map((p: any) => [
        p.id,
        `"${p.name}"`,
        p.categoryId,
        p.barcode || "N/A",
        Number(p.price).toFixed(2),
        Number(p.costPrice || 0).toFixed(2),
        p.stockQuantity || 0,
        p.lowStockThreshold || 10,
        p.isActive ? "Active" : "Inactive",
      ]);

      const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=inventory-report.csv");
      res.send(csv);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // CSV Export for Profit Report
  app.get("/api/reports/profit-export", async (req, res) => {
    try {
      const tenantId = analyticsTenant(req);
      if (!tenantId) return res.status(400).json({ error: "tenantId is required" });
      const profitData = await storage.getProfitByProduct(tenantId);
      const headers = ["Product", "Total Sold", "Revenue", "Total Cost", "Profit", "Cost Price"];
      const rows = profitData.map((p: any) => [
        `"${p.productName}"`,
        p.totalSold,
        Number(p.totalRevenue).toFixed(2),
        Number(p.totalCost).toFixed(2),
        Number(p.profit).toFixed(2),
        Number(p.costPrice).toFixed(2),
      ]);

      const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=profit-report.csv");
      res.send(csv);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // CSV Export for Employee Performance
  app.get("/api/reports/employee-performance-export", async (req, res) => {
    try {
      const tenantId = analyticsTenant(req);
      if (!tenantId) return res.status(400).json({ error: "tenantId is required" });
      const perfData = await storage.getCashierPerformance(tenantId);
      const headers = ["Employee", "Role", "Sales Count", "Total Revenue", "Avg Sale Value"];
      const rows = perfData.map((p: any) => [
        `"${p.employeeName}"`,
        p.role,
        p.salesCount,
        Number(p.totalRevenue).toFixed(2),
        Number(p.avgSaleValue).toFixed(2),
      ]);

      const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=employee-performance-report.csv");
      res.send(csv);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Smart Predictions / Analytics
  app.get("/api/analytics/predictions", async (req, res) => {
    try {
      const tenantId = analyticsTenant(req);
      if (!tenantId) return res.status(400).json({ error: "tenantId is required" });
      const stats = await storage.getDashboardStats(tenantId);
      const topProducts = stats.topProducts || [];
      const slowMoving = await storage.getSlowMovingProducts(30, tenantId);
      const allProds = await storage.getProductsByTenant(tenantId);
      const lowStockData: any[] = [];
      const tenantBranches = await storage.getBranchesByTenant(tenantId);
      for (const branch of tenantBranches) {
        const items = await storage.getLowStockItems(branch.id);
        lowStockData.push(...items);
      }
      const predCur = await storeCurrency(tenantId);

      // Simple predictions based on trends
      const avgDailyRevenue = Number(stats.monthRevenue || 0) / 30;
      const projectedMonthly = avgDailyRevenue * 30;
      const projectedYearly = avgDailyRevenue * 365;

      // Stock predictions
      const stockAlerts = lowStockData.map((item: any) => {
        const prod = allProds.find((p: any) => p.id === item.productId);
        return {
          productId: item.productId,
          productName: prod?.name || `Product #${item.productId}`,
          currentStock: item.quantity || 0,
          threshold: item.lowStockThreshold || 10,
          urgency: (item.quantity || 0) <= 5 ? "critical" : "warning",
          recommendation: `Reorder ${Math.max(50 - (item.quantity || 0), 20)} units`,
        };
      });

      // Best performing categories
      const categoryPerf = topProducts.reduce((acc: any, p: any) => {
        const prod = allProds.find((pr: any) => pr.id === p.productId);
        const catId = prod?.categoryId || 0;
        if (!acc[catId]) acc[catId] = { revenue: 0, count: 0 };
        acc[catId].revenue += Number(p.revenue || 0);
        acc[catId].count += Number(p.totalSold || 0);
        return acc;
      }, {});

      res.json({
        projectedMonthlyRevenue: projectedMonthly,
        projectedYearlyRevenue: projectedYearly,
        avgDailyRevenue,
        totalActiveProducts: allProds.filter((p: any) => p.isActive).length,
        slowMovingCount: slowMoving.length,
        topSellingProducts: topProducts.slice(0, 5).map((p: any) => ({
          name: p.name,
          revenue: Number(p.revenue || 0),
          soldCount: Number(p.totalSold || 0),
        })),
        stockAlerts,
        categoryPerformance: Object.entries(categoryPerf).map(([catId, data]: any) => ({
          categoryId: Number(catId),
          revenue: data.revenue,
          itemsSold: data.count,
        })),
        insights: [
          avgDailyRevenue > 0 ? `Average daily revenue: ${formatMoney(avgDailyRevenue, predCur)}` : "No sales data yet for predictions",
          slowMoving.length > 0 ? `${slowMoving.length} products with low sales in the last 30 days - consider promotions` : "All products are selling well",
          stockAlerts.filter((a: any) => a.urgency === "critical").length > 0 ? `${stockAlerts.filter((a: any) => a.urgency === "critical").length} products critically low on stock - reorder immediately` : "Stock levels are healthy",
        ],
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Object Storage - Public file serving
  app.get("/public-objects/*filePath", async (req, res) => {
    const filePath = (req.params as any).filePath;
    const objectStorageService = new ObjectStorageService();
    try {
      const file = await objectStorageService.searchPublicObject(filePath);
      if (!file) return res.status(404).json({ error: "File not found" });
      objectStorageService.downloadObject(file, res);
    } catch (error) {
      console.error("Error serving public object:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Object Storage - Private file serving
  app.get("/objects/*objectPath", async (req, res) => {
    // First try local uploads directory (fast path — no env vars needed)
    const uploadsDir = path.resolve(process.cwd(), "uploads");
    const filename = req.path.replace(/^\/objects\//, "");
    const localPath = path.join(uploadsDir, filename);
    if (fs.existsSync(localPath)) {
      return res.sendFile(localPath);
    }

    // Fall back to object storage (GCS), return 404 on any failure
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      // Any error here (missing config, not found, network) → 404
      return res.sendStatus(404);
    }
  });

  // Object Storage - Upload image (local filesystem)
  app.post("/api/objects/upload", async (req: Request, res: Response) => {
    try {
      const { imageData, contentType = "image/jpeg" } = req.body;
      if (!imageData) {
        return res.status(400).json({ error: "imageData is required" });
      }
      const uploadsDir = path.resolve(process.cwd(), "uploads");
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
      const ext = (contentType.split("/")[1] || "jpg").split(";")[0];
      const filename = `${randomUUID()}.${ext}`;
      const filePath = path.join(uploadsDir, filename);
      const buffer = Buffer.from(imageData, "base64");
      fs.writeFileSync(filePath, buffer);
      const objectPath = `/objects/${filename}`;
      res.json({ objectPath });
    } catch (error: any) {
      console.error("Error uploading file:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Object Storage - Save uploaded image path (kept for compatibility)
  app.put("/api/images/save", async (req: Request, res: Response) => {
    const { imageURL } = req.body;
    if (!imageURL) {
      return res.status(400).json({ error: "imageURL is required" });
    }
    res.status(200).json({ objectPath: imageURL });
  });

  // Create product with initial stock
  app.post("/api/products-with-stock", async (req, res) => {
    try {
      const { initialStock, branchId, ...productData } = normalizeWholesaleProductFields(withTenant(req, sanitizeDates(req.body)));
      const product = await storage.createProduct(productData);
      if (initialStock && initialStock > 0 && branchId) {
        await storage.upsertInventory({ productId: product.id, branchId: Number(branchId), quantity: Number(initialStock) });
        await storage.createInventoryMovement({
          productId: product.id, branchId: Number(branchId), type: "purchase",
          quantity: Number(initialStock), referenceType: "manual", notes: "Initial stock on product creation",
        });
      }
      res.json(product);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Get active shift for employee
  app.get("/api/shifts/active/:employeeId", async (req, res) => {
    try {
      // Only this store's shifts (the employee's store is also checked by
      // enforceTenantOwnership).
      const tenantId = reqTenant(req) ?? (req.query.tenantId ? Number(req.query.tenantId) : undefined);
      const shifts = await storage.getShifts(tenantId);
      const active = shifts.find((s: any) => s.employeeId === Number(req.params.employeeId) && s.status === "open");
      res.json(active || null);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Get store settings (main branch + tenant info)
  app.get("/api/store-settings", async (req: any, res) => {
    try {
      const tenantId = req.tenantId ?? (req.query.tenantId ? Number(req.query.tenantId) : undefined);
      let branches = [];
      if (tenantId) {
        branches = await storage.getBranchesByTenant(tenantId);
      } else {
        branches = await storage.getBranches();
      }

      const mainBranch = branches.find((b: any) => b.isMain) || branches[0];
      if (!mainBranch) return res.status(404).json({ error: "No branch found" });

      const tenant = mainBranch.tenantId ? await storage.getTenant(mainBranch.tenantId) : null;
      res.json({
        ...mainBranch,
        storeType: tenant?.storeType || "supermarket",
        commissionRate: 0, // commission is baked into product prices via applyMarkup
        whatsappAdminPhone: (tenant?.metadata as any)?.whatsappAdminPhone || "",
        whatsappVerified: !!verifiedStorePhone(tenant?.metadata),
        // BIZ-01: opt-in minimum-order top-up, delivery only. 0 = disabled.
        minOrderAmount: Number((tenant?.metadata as any)?.minOrderAmount) || 0,
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Update store settings (update main branch + tenant storeType)
  app.put("/api/store-settings", async (req: any, res) => {
    try {
      const { storeType, tenantId: bodyTenantId, ...branchData } = sanitizeDates(req.body);
      // The licence's tenant first: the settings screen sends no tenantId, and
      // falling through to getBranches() would edit another store's branch.
      const tenantId = req.tenantId ?? (req.query.tenantId ? Number(req.query.tenantId) : (bodyTenantId ? Number(bodyTenantId) : undefined));

      let branches = [];
      if (tenantId) {
        branches = await storage.getBranchesByTenant(tenantId);
      } else {
        branches = await storage.getBranches();
      }

      const mainBranch = branches.find((b: any) => b.isMain) || branches[0];
      if (!mainBranch) return res.status(404).json({ error: "No branch found" });

      const { whatsappAdminPhone, minOrderAmount, ...cleanBranchData } = branchData;
      const updatedBranch = await storage.updateBranch(mainBranch.id, cleanBranchData);
      if (mainBranch.tenantId) {
        const tenantUpdates: any = {};
        if (storeType) tenantUpdates.storeType = storeType;
        if (whatsappAdminPhone !== undefined || minOrderAmount !== undefined) {
          const existingTenant = await storage.getTenant(mainBranch.tenantId as number);
          const metadata: any = { ...(existingTenant?.metadata as any || {}) };
          // A new number only takes effect through the WhatsApp code check
          // (/api/whatsapp/store/verify/*); this form may only clear it.
          if (whatsappAdminPhone !== undefined && !String(whatsappAdminPhone).replace(/\D/g, "")) {
            metadata.whatsappAdminPhone = "";
            metadata.whatsappVerifiedAt = null;
          }
          if (minOrderAmount !== undefined) metadata.minOrderAmount = Math.max(0, Number(minOrderAmount) || 0);
          tenantUpdates.metadata = metadata;
        }
        if (Object.keys(tenantUpdates).length > 0) {
          await storage.updateTenant(mainBranch.tenantId as number, tenantUpdates);
        }
      }

      res.json({
        ...updatedBranch,
        storeType,
        whatsappAdminPhone: mainBranch.tenantId
          ? verifiedStorePhone((await storage.getTenant(mainBranch.tenantId as number))?.metadata)
          : "",
        minOrderAmount: Math.max(0, Number(minOrderAmount) || 0),
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Update system language (app + store website)
  app.put("/api/system-language", async (req: any, res) => {
    try {
      const { language } = req.body;
      if (!["en", "ar", "de"].includes(language)) {
        return res.status(400).json({ error: "Invalid language. Must be en, ar, or de" });
      }
      const tenantId = req.tenantId;
      if (!tenantId) return res.status(401).json({ error: "Not authorized" });
      await storage.upsertLandingPageConfig(tenantId, { language } as any);
      res.json({ success: true, language });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Simulate Caller ID (for testing from Settings UI)
  app.post("/api/caller-id/simulate", async (req, res) => {
    const { phoneNumber, tenantId: bodyTenantId } = req.body;
    const tenantId = bodyTenantId || (req as any).tenantId;
    await callerIdService.handleIncomingCall(phoneNumber || "0551234567", undefined, tenantId ? Number(tenantId) : undefined);
    res.json({ success: true });
  });

  // Test page for caller-id (browser GET)
  app.get("/api/caller-id/incoming", (_req, res) => {
    res.send(`<!DOCTYPE html><html><head><title>Caller ID Test</title>
<style>body{font-family:sans-serif;max-width:400px;margin:40px auto;padding:20px}
input,button{display:block;width:100%;margin:8px 0;padding:10px;font-size:16px;box-sizing:border-box}
button{background:#2563eb;color:#fff;border:none;border-radius:6px;cursor:pointer}
#result{margin-top:16px;padding:12px;border-radius:6px;display:none}
.ok{background:#d1fae5;color:#065f46}.err{background:#fee2e2;color:#991b1b}</style></head>
<body><h2>Caller ID Test</h2>
<input id="phone" placeholder="Phone number" value="01012345678"/>
<input id="secret" placeholder="Bridge secret" value="fritzbridge-secret-change-me"/>
<button onclick="test()">Simulate Incoming Call</button>
<div id="result"></div>
<script>
async function test(){
  const r=document.getElementById('result');
  r.style.display='block';r.className='';r.textContent='Sending...';
  try{
    const res=await fetch('/api/caller-id/incoming',{method:'POST',
      headers:{'Content-Type':'application/json','x-bridge-secret':document.getElementById('secret').value},
      body:JSON.stringify({phoneNumber:document.getElementById('phone').value,tenantId:1,slot:1})});
    const d=await res.json();
    r.className=res.ok?'ok':'err';
    r.textContent=res.ok?'✓ Success! Check POS for popup.':'✗ '+JSON.stringify(d);
  }catch(e){r.className='err';r.textContent='✗ '+e.message;}
}
</script></body></html>`);
  });

  // HTTP polling fallback — returns active calls for the requesting tenant
  app.get("/api/caller-id/active-calls", (req, res) => {
    const tenantId = (req as any).tenantId || Number(req.query.tenantId);
    if (!tenantId) return res.status(400).json({ error: "tenantId required" });
    const calls = callerIdService.getActiveCallsForTenant(Number(tenantId));
    res.json({ calls });
  });

  // SSE fallback for the WebSocket events. Hostinger's CDN/LiteSpeed proxy
  // doesn't tunnel WebSocket upgrades, so we expose the same broadcast
  // stream as a long-lived `text/event-stream`. Both POS and customer SPA
  // can subscribe with `new EventSource("/api/events?tenantId=24")`.
  app.get("/api/events", (req, res) => {
    const tenantIdRaw = req.query.tenantId ? Number(req.query.tenantId) : undefined;
    const tenantId = tenantIdRaw && !isNaN(tenantIdRaw) ? tenantIdRaw : undefined;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-store, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders?.();

    res.write(`: connected ${new Date().toISOString()}\n\n`);
    res.write(`data: ${JSON.stringify({ type: "sse_connected", tenantId: tenantId ?? null })}\n\n`);

    const teardown = callerIdService.addSseClient(res, tenantId);

    // Heartbeat every 25s so proxies don't kill idle connections.
    const heartbeat = setInterval(() => {
      try { res.write(`: hb ${Date.now()}\n\n`); } catch { /* ignore */ }
    }, 25000);

    req.on("close", () => {
      clearInterval(heartbeat);
      teardown();
    });
  });

  // Incoming call from local FRITZ!Card bridge (secured by CALLER_ID_BRIDGE_SECRET)
  app.post("/api/caller-id/incoming", async (req, res) => {
    try {
      const secret = (req.headers["x-bridge-secret"] as string) || req.body.secret;
      // Fail closed: if no bridge secret is configured, reject all callers
      // rather than accepting anonymous caller-ID injections.
      const expectedSecret = process.env.CALLER_ID_BRIDGE_SECRET;
      if (!expectedSecret || secret !== expectedSecret) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const { phoneNumber, slot } = req.body;
      // tenantId can come from the body (hardware bridge) or from the license-key auth middleware
      const tenantId = req.body.tenantId || (req as any).tenantId;
      const callInfo = await callerIdService.handleIncomingCall(
        phoneNumber || "0123456789",
        slot ? Number(slot) : undefined,
        tenantId ? Number(tenantId) : undefined
      );
      // Web Push: notify all subscribed browsers (even closed tabs)
      const customerName = (callInfo as any)?.customer?.name;
      const customerAddress = (callInfo as any)?.customer?.address;
      pushService.notifyIncomingCall(phoneNumber || "0123456789", tenantId ? Number(tenantId) : undefined, customerName, customerAddress).catch(() => { });
      res.json({ success: true });
    } catch (e: any) {
      console.error("[CallerID] Error handling incoming call:", e);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ── Web Push Subscription ─────────────────────────────────────────────────
  app.get("/api/push/vapid-public-key", (_req, res) => {
    res.json({ publicKey: pushService.publicKey });
  });

  app.post("/api/push/subscribe", (req, res) => {
    const sub = req.body;
    if (!sub || !sub.endpoint) return res.status(400).json({ error: "Invalid subscription" });
    const rawTenantId = (req as any).tenantId ?? req.body?.tenantId;
    const tenantId = Number(rawTenantId);
    if (!Number.isFinite(tenantId) || tenantId <= 0) {
      return res.status(401).json({ error: "Tenant identification required" });
    }
    pushService.subscribe(sub, tenantId);
    res.json({ success: true });
  });

  app.post("/api/push/unsubscribe", (req, res) => {
    const { endpoint } = req.body;
    if (endpoint) pushService.unsubscribe(endpoint);
    res.json({ success: true });
  });

  // Helper: sort categories by keyword-based priority
  function sortCategoriesByPriority(cats: any[]) {
    const getPriority = (name: string) => {
      const n = name.toLowerCase();
      // Level 1: Core Mains (Pizza, etc.)
      if (/pizza|بيتزا|calzone|pide|lahmacun|burger|burg|sandwich|wrap|grill|shawarma|شاورما/.test(n)) return 1;
      // Level 2: Other Mains
      if (/pasta|meal|main|plate|chicken|meat|fish|teller|nuggets|schnitzel|kebab|دجاج|لحم|سمك/.test(n)) return 2;
      // Level 3: Snacks/Starters
      if (/appetizer|starter|finger|snack|مقبلات|فاتح/.test(n)) return 3;
      // Level 5: Default (unlisted food etc.)
      // Level 6: Salads
      if (/salad|سلطة/.test(n)) return 6;
      // Level 7: Desserts
      if (/dessert|sweet|حلوى|حلويات|baklava|tiramisu/.test(n)) return 7;
      // Level 8: Drinks
      if (/drink|beverage|juice|water|coke|cola|bier|beer|wine|alcohol|عصير|مشروب/.test(n)) return 8;
      // Level 9: Non-food
      if (/tabak|tobacco|cigarette/.test(n)) return 9;
      return 5;
    };
    return [...cats].sort((a, b) => {
      // Prioritize manual sortOrder first. If both are 0 or equal, fall back to keyword priority
      const aOrder = a.sortOrder || 0;
      const bOrder = b.sortOrder || 0;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return getPriority(a.name) - getPriority(b.name);
    });
  }

  app.get("/api/store/:tenantId/menu", async (req, res) => {
    try {
      const tenantId = Number(req.params.tenantId);
      if (!tenantId || isNaN(tenantId)) {
        return res.status(400).json({ error: "Valid tenantId is required" });
      }
      const tenant = await storage.getTenant(tenantId);
      if (!tenant) {
        return res.status(404).json({ error: "Store not found" });
      }
      const categories = sortCategoriesByPriority(await storage.getCategories(tenantId));
      const products = await storage.getProductsByTenant(tenantId);

      const categoryOrder = categories.map((c: any) => c.id);
      products.sort((a: any, b: any) => categoryOrder.indexOf(a.categoryId) - categoryOrder.indexOf(b.categoryId));

      const config = await storage.getLandingPageConfig(tenantId);
      res.json({
        store: {
          id: tenant.id,
          name: tenant.businessName,
          logo: tenant.logo,
          storeType: tenant.storeType,
        },
        config: config || null,
        products,
        categories,
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── Online Orders ──────────────────────────────────────────────────────────
  // Public: get store info + menu by slug (for landing page)
  app.get("/api/store-public/:slug", async (req, res) => {
    try {
      const { slug } = req.params;
      const config = await storage.getLandingPageConfigBySlug(slug);
      if (!config) return res.status(404).json({ error: "Store not found" });
      if (!config.isPublished) return res.status(404).json({ error: "Store is currently unavailable" });

      const tenant = await storage.getTenant(config.tenantId);
      let products = await storage.getProductsByTenant(config.tenantId);

      const commissionRate = await storage.getCommissionRate();
      if (commissionRate > 0) {
        const factor = 1 + (commissionRate / 100);
        products = products.map((p: any) => {
          const rawPrice = parseFloat(p.price) * factor;
          const rounded = Math.round(rawPrice * 2) / 2; // nearest 0.5
          return { ...p, price: rounded.toFixed(2) };
        });
      }

      const categories = sortCategoriesByPriority(await storage.getCategories(config.tenantId));

      // Sort products by category index
      const categoryOrder = categories.map((c: any) => c.id);
      products.sort((a: any, b: any) => categoryOrder.indexOf(a.categoryId) - categoryOrder.indexOf(b.categoryId));

      // SECURITY: never serialise the raw tenant row to an unauthenticated
      // caller — it holds passwordHash, ownerEmail, ownerPhone and a metadata
      // blob (whatsappAdminPhone etc.). Return only public storefront fields.
      const publicTenant = tenant ? {
        id: tenant.id,
        businessName: tenant.businessName,
        name: tenant.businessName,
        logo: tenant.logo,
        storeType: tenant.storeType,
        currency: tenant.currency,
        address: tenant.address,
        city: tenant.city,
        country: tenant.country,
        phone: tenant.businessPhone ?? tenant.phone ?? null,
      } : null;

      res.json({ config, tenant: publicTenant, products, categories });
    } catch (e: any) {
      console.error(`[API] Public store error for ${req.params.slug}:`, e);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Public: create online order
  app.post("/api/online-orders/public", async (req, res) => {
    try {
      const { slug, tenantId: bodyTenantId, ...orderData } = req.body;
      if (orderData.customerPhone) orderData.customerPhone = canonicalPhone(orderData.customerPhone);
      let resolvedTenantId: number | undefined;
      if (slug) {
        const config = await storage.getLandingPageConfigBySlug(slug);
        if (config) resolvedTenantId = config.tenantId;
      }
      if (!resolvedTenantId && bodyTenantId) {
        resolvedTenantId = Number(bodyTenantId);
      }
      if (!resolvedTenantId) return res.status(404).json({ error: "Store not found" });

      // Order date and daily counter in the store's own calendar.
      const onlTz = await storeTimeZone(resolvedTenantId);
      const swissDateOnl = compactDate(onlTz);
      const dailySeqOnl = await storage.getNextSequenceNumber(`tenant-${resolvedTenantId}`, onlTz);
      const orderNumber = `${resolvedTenantId}-${swissDateOnl}-${dailySeqOnl}`;
      const order = await storage.createOnlineOrder({
        ...orderData,
        tenantId: resolvedTenantId,
        orderNumber,
        paymentStatus: orderData.paymentMethod === "cash" ? "pending" : "pending",
        status: "pending",
      });

      // ── Auto-save new customer ────────────────────────────────────────────
      try {
        const { customerName, customerPhone, customerEmail, customerAddress } = orderData;
        if (customerName) {
          let existing: any[] = [];
          if (customerPhone) {
            existing = await storage.findCustomerByPhone(customerPhone, resolvedTenantId);
          }
          if (existing.length === 0) {
            await storage.createCustomer({
              tenantId: resolvedTenantId,
              name: customerName,
              phone: customerPhone || null,
              email: customerEmail || null,
              address: customerAddress || null,
            });
          }
        }
      } catch (autoErr) {
        console.error("[AutoCustomer] Failed to auto-save customer from online order:", autoErr);
      }

      // Track platform commission
      try {
        const commissionRate = await storage.getCommissionRate();
        const saleTotal = parseFloat(orderData.totalAmount || "0");
        const commissionAmount = saleTotal * commissionRate / (100 + commissionRate);
        if (commissionAmount > 0) {
          await storage.createPlatformCommission({
            tenantId: resolvedTenantId,
            orderId: order.id,
            saleTotal: String(saleTotal.toFixed(2)),
            commissionRate: String(commissionRate),
            commissionAmount: String(commissionAmount.toFixed(2)),
            status: "pending",
          });
        }
      } catch (commErr) {
        console.error("[Commission] Failed to track commission:", commErr);
      }

      // Broadcast to connected POS clients for this tenant (WebSocket)
      callerIdService.broadcast({
        type: "new_online_order",
        order,
      }, resolvedTenantId);
      // Web Push: notify even closed browser tabs
      pushService.notifyNewOrder(orderNumber, orderData.totalAmount || "0").catch(() => { });

      // ── WhatsApp notifications ────────────────────────────────
      try {
        const tenant = await storage.getTenant(resolvedTenantId);
        // The store's verified number; unset → the store's own WhatsApp chat.
        const adminPhone = verifiedStorePhone(tenant?.metadata) || undefined;
        // From the store's own WhatsApp: the whole order to the store, and a
        // confirmation with the whole order to the customer.
        await whatsappService.orderPlaced(order as any, resolvedTenantId, adminPhone);
      } catch (waErr) {
        console.error("[WhatsApp] Failed to send order notifications:", waErr);
      }

      res.json(order);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Internal: list online orders
  app.get("/api/online-orders", async (req, res) => {
    try {
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : undefined;
      const status = req.query.status as string | undefined;
      const orders = await storage.getOnlineOrders(tenantId, status);
      res.json(orders);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Internal: update online order status
  app.put("/api/online-orders/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const before: any = await storage.getOnlineOrder(id);
      if (!before) return res.status(404).json({ error: "Order not found" });
      const parsed = await editableOrderFields(req, req.body || {});
      if ("error" in parsed) return res.status(parsed.status).json({ error: parsed.error, code: parsed.code });
      const update: any = parsed.data;
      if (!Object.keys(update).length) return res.status(400).json({ error: "Nothing to update", code: "NO_FIELDS" });
      const order: any = await storage.updateOnlineOrder(id, update);

      // Marked paid by hand (cash on delivery, Sham Cash transfer, …): stamp
      // when, like the payment webhooks do.
      if (update.paymentStatus === "paid" && before.paymentStatus !== "paid") {
        await markOnlineOrderPaid(id, null);
      }
      // A finished or cancelled order frees its driver (only the driver app
      // did this before, so drivers stayed "on delivery" forever).
      if (update.status && TERMINAL_ORDER_STATUSES.has(update.status) && order?.driverId) {
        try { await storage.releaseDriverFromOrder(Number(order.driverId), id); } catch (e) { console.error("[orders] driver release failed:", e); }
      }

      // Broadcast to this store's clients only — without a tenant the full
      // order (name, phone, address) went to every connected client.
      if (order?.tenantId) callerIdService.broadcast({ type: "online_order_updated", order }, Number(order.tenantId));
      // Notify SSE clients tracking this order
      if ((app as any)._broadcastOrderStatus) {
        (app as any)._broadcastOrderStatus(id, { type: "status_update", order });
      }

      // WhatsApp status update to customer
      if (req.body.status && (order as any).customerPhone) {
        try {
          if ((order as any).tenantId) {
            await whatsappService.orderStatusChanged(order as any, req.body.status, (order as any).tenantId);
          }
        } catch (waErr) {
          console.error("[WhatsApp] Failed to send status update:", waErr);
        }
      }

      res.json(order);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Internal: delete online order
  app.delete("/api/online-orders/:id", async (req, res) => {
    try {
      const order: any = await storage.getOnlineOrder(Number(req.params.id));
      if (!order) return res.status(404).json({ error: "Order not found" });
      if (order.driverId) {
        try { await storage.releaseDriverFromOrder(Number(order.driverId), order.id); } catch { /* non-fatal */ }
      }
      await storage.deleteOnlineOrder(order.id);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Sham Cash paid by transfer to the store's own wallet: the cashier checks
  // the Sham Cash app and confirms here. Marks the order paid (with paid_at)
  // and the order's open Sham Cash invoice, if any, as paid.
  app.post("/api/online-orders/:id/confirm-shamcash", requireManager, async (req: any, res) => {
    try {
      const id = Number(req.params.id);
      const order: any = await storage.getOnlineOrder(id);
      if (!order) return res.status(404).json({ error: "Order not found" });
      const tranId = typeof req.body?.tranId === "string" ? asciiDigits(req.body.tranId).trim().slice(0, 64) || null : null;
      const { pool } = await import("./db");
      await pool.query(
        `UPDATE online_orders
            SET payment_status = 'paid', payment_method = 'shamcash',
                paid_at = COALESCE(paid_at, NOW()), payment_error = NULL, updated_at = NOW()
          WHERE id = ?`,
        [id],
      );
      let invoice: any = null;
      try {
        const [rows]: any = await pool.query(
          "SELECT id FROM shamcash_invoices WHERE online_order_id = ? AND tenant_id = ? ORDER BY (status = 'pending') DESC, id DESC LIMIT 1",
          [id, order.tenantId],
        );
        if (rows?.[0]) {
          await pool.query(
            "UPDATE shamcash_invoices SET status = 'paid', tran_id = COALESCE(?, tran_id), paid_at = COALESCE(paid_at, NOW()) WHERE id = ?",
            [tranId, rows[0].id],
          );
          invoice = { id: rows[0].id, status: "paid" };
        }
      } catch (e: any) {
        if (!/doesn't exist/i.test(String(e?.message))) throw e;
      }
      const fresh: any = await storage.getOnlineOrder(id);
      callerIdService.broadcast({ type: "online_order_updated", order: fresh }, Number(order.tenantId));
      if ((app as any)._broadcastOrderStatus) (app as any)._broadcastOrderStatus(id, { type: "status_update", order: fresh });
      res.json({ success: true, order: fresh, invoice });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ── WhatsApp Integration ───────────────────────────────────────────────────
  app.get("/api/super-admin/whatsapp/status", requireSuperAdmin as any, async (_req: any, res: any) => {
    res.json(whatsappService.getStatus());
  });

  app.post("/api/super-admin/whatsapp/connect", requireSuperAdmin as any, async (_req: any, res: any) => {
    try {
      const result = await whatsappService.connect();
      const qr = whatsappService.getQrCode();
      res.json({ ...result, qrCode: qr });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/super-admin/whatsapp/disconnect", requireSuperAdmin as any, async (_req: any, res: any) => {
    await whatsappService.disconnect();
    res.json({ success: true });
  });

  app.get("/api/super-admin/whatsapp/qr", requireSuperAdmin as any, async (_req: any, res: any) => {
    const qr = whatsappService.getQrCode();
    res.json({ qrCode: qr });
  });

  app.get("/api/super-admin/whatsapp/session-info", requireSuperAdmin as any, async (_req: any, res: any) => {
    res.json({ hasSession: whatsappService.hasSession(), sessionModified: whatsappService.sessionModified() });
  });

  app.post("/api/super-admin/whatsapp/test", requireSuperAdmin as any, async (req: any, res: any) => {
    const globalPhone = await storage.getPlatformSetting("whatsapp_admin_phone");
    const targetPhone = (req.body?.phone || globalPhone || "").replace(/\D/g, "");
    if (!targetPhone) return res.status(400).json({ error: "No phone number specified and no global admin phone configured" });
    const sent = await whatsappService.sendText(
      targetPhone,
      "🧪 *Test Message*\n\nThis is a test from Kassenta POS WhatsApp integration.\n\n✅ If you receive this, the connection is working!"
    );
    res.json({ success: sent, phone: targetPhone });
  });

  // Get/set global WhatsApp admin phone (super-admin default)
  app.get("/api/super-admin/whatsapp/admin-phone", requireSuperAdmin as any, async (_req: any, res: any) => {
    try {
      const phone = await storage.getPlatformSetting("whatsapp_admin_phone");
      res.json({ phone: phone || "" });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.put("/api/super-admin/whatsapp/admin-phone", requireSuperAdmin as any, async (req: any, res: any) => {
    try {
      const { phone } = req.body;
      if (phone === undefined) return res.status(400).json({ error: "phone required" });
      await storage.setPlatformSetting("whatsapp_admin_phone", phone.replace(/\D/g, ""));
      res.json({ success: true, phone: phone.replace(/\D/g, "") });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Get/set per-store WhatsApp admin phone
  app.get("/api/super-admin/whatsapp/store-phone/:tenantId", requireSuperAdmin as any, async (req: any, res: any) => {
    try {
      const tenant = await storage.getTenant(Number(req.params.tenantId));
      if (!tenant) return res.status(404).json({ error: "Tenant not found" });
      const phone = (tenant.metadata as any)?.whatsappAdminPhone || "";
      res.json({ phone });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.put("/api/super-admin/whatsapp/store-phone/:tenantId", requireSuperAdmin as any, async (req: any, res: any) => {
    try {
      const tenant = await storage.getTenant(Number(req.params.tenantId));
      if (!tenant) return res.status(404).json({ error: "Tenant not found" });
      const phone = (req.body?.phone || "").replace(/\D/g, "");
      const metadata = {
        ...(tenant.metadata as any || {}),
        whatsappAdminPhone: phone,
        whatsappVerifiedAt: phone ? new Date().toISOString() : null,
      };
      await storage.updateTenant(Number(req.params.tenantId), { metadata });
      res.json({ success: true, phone });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ── Landing Page Config ────────────────────────────────────────────────────
  app.get("/api/landing-page-config", async (req, res) => {
    try {
      const tenantId = Number(req.query.tenantId);
      if (!tenantId) return res.status(400).json({ error: "tenantId required" });
      const config = await storage.getLandingPageConfig(tenantId);
      res.json(config || null);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.put("/api/landing-page-config", requireSuperAdmin as any, async (req: any, res: any) => {
    try {
      const { tenantId, ...data } = req.body;
      if (!tenantId) return res.status(400).json({ error: "tenantId required" });
      const config = await storage.upsertLandingPageConfig(Number(tenantId), data);
      res.json(config);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Tenant-scoped storefront editor: the POS admin edits ONLY their own store's
  // public page (name, content, offers, delivery, payment methods, bank).
  // tenantId is taken from the license-key middleware — client cannot spoof it.
  app.put("/api/tenant/landing-config", async (req: any, res: any) => {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) return res.status(401).json({ error: "License authentication required" });
      const { tenantId: _t, id: _i, createdAt: _c, updatedAt: _u, ...data } = req.body;
      const config = await storage.upsertLandingPageConfig(Number(tenantId), data);
      res.json(config);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ── Public commission rate ─────────────────────────────────────────────────
  app.get("/api/store-public/commission-rate", async (_req, res) => {
    try {
      const rate = await storage.getCommissionRate();
      res.json({ rate });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ── Stripe Payment Intent ──────────────────────────────────────────────────
  app.post("/api/create-payment-intent", async (req, res) => {
    try {
      const { amount, currency, tenantId } = req.body;
      const stripe = await getUncachableStripeClient();
      const amountInCents = Math.round(parseFloat(amount) * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: (currency || "chf").toLowerCase(),
        metadata: { tenantId: String(tenantId || ""), source: "online_order" },
      });
      res.json({ clientSecret: paymentIntent.client_secret, publishableKey: await getStripePublishableKey() });
    } catch (e: any) {
      console.error("[Stripe] PaymentIntent error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // ── SSE: Customer order status tracking ───────────────────────────────────
  const orderSseClients: Map<number, Set<any>> = new Map();
  // One map for every order stream (this one, the delivery-app one and the
  // driver-location push): the delivery stream used to register in a map
  // nothing ever broadcast to.
  (app as any)._orderSseClients = orderSseClients;

  app.get("/api/online-orders/:id/status-stream", async (req, res) => {
    const orderId = Number(req.params.id);
    // The order's own tracking token is required (ids are guessable).
    const order: any = Number.isFinite(orderId) ? await storage.getOnlineOrder(orderId).catch(() => null) : null;
    const token = String(req.query.token || req.query.trackingToken || "");
    if (!order || !order.trackingToken || token !== order.trackingToken) {
      return res.status(404).json({ error: "Order not found" });
    }
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    if (!orderSseClients.has(orderId)) orderSseClients.set(orderId, new Set());
    orderSseClients.get(orderId)!.add(res);

    res.write(`data: ${JSON.stringify({ type: "connected" })}\n\n`);

    const keepAlive = setInterval(() => res.write(`: ping\n\n`), 25000);
    req.on("close", () => {
      clearInterval(keepAlive);
      orderSseClients.get(orderId)?.delete(res);
    });
  });

  (app as any)._broadcastOrderStatus = (orderId: number, data: object) => {
    const clients = orderSseClients.get(orderId);
    if (clients) {
      const msg = `data: ${JSON.stringify(data)}\n\n`;
      clients.forEach((c: any) => { try { c.write(msg); } catch { } });
    }
  };

  // ── Public Restaurant Store page ───────────────────────────────────────────
  app.get("/store/:slug", async (req, res) => {
    try {
      const { slug } = req.params;
      const config = await storage.getLandingPageConfigBySlug(slug);
      if (!config || !config.isPublished) {
        return res.status(404).send("<h1>Store not found</h1>");
      }
      const templatePath = path.resolve(process.cwd(), "server", "templates", "restaurant-store.html");
      let html = fs.readFileSync(templatePath, "utf8");

      const branches = await storage.getBranchesByTenant(config.tenantId);
      const currency = branches?.[0]?.currency || "CHF";
      const storeTenant: any = await storage.getTenant(config.tenantId);
      const storeName = String(storeTenant?.businessName || (config as any).businessName || "Kassenta Store").replace(/[<>"]/g, "");
      const storeLogo = String((config as any).logoUrl || storeTenant?.logo || "https://kassenta.com/app/assets/images/icon.png").replace(/"/g, "");

      html = html.replace(/\{\{SLUG\}\}/g, slug);
      html = html.replace(/\{\{TENANT_ID\}\}/g, String(config.tenantId));
      html = html.replace(/\{\{STORE_NAME\}\}/g, storeName);
      html = html.replace(/\{\{STORE_LOGO\}\}/g, storeLogo);
      html = html.replace(/\{\{PRIMARY_COLOR\}\}/g, config.primaryColor || "#2FD3C6");
      html = html.replace(/\{\{ACCENT_COLOR\}\}/g, config.accentColor || "#6366F1");
      html = html.replace(/\{\{CURRENCY\}\}/g, currency);
      html = html.replace(/\{\{LANGUAGE\}\}/g, (config as any).language || "en");
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.send(html);
    } catch (e: any) {
      console.error("[store/:slug] Error:", e);
      res.status(500).send("<h1>Server error</h1>");
    }
  });

  // ── Tenant Backup & Restore (accessible from mobile app via license-key auth) ─
  const TENANT_BACKUP_DIR = path.resolve(process.cwd(), "backups");
  if (!fs.existsSync(TENANT_BACKUP_DIR)) fs.mkdirSync(TENANT_BACKUP_DIR, { recursive: true });

  // List backups for this tenant
  app.get("/api/backup/list", async (req: any, res) => {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) return res.status(401).json({ error: "Not authorized" });
      const files = fs.readdirSync(TENANT_BACKUP_DIR)
        .filter(f => f.startsWith(`backup_tenant_${tenantId}_`) && f.endsWith(".json"))
        .map(f => {
          const stat = fs.statSync(path.join(TENANT_BACKUP_DIR, f));
          return { filename: f, size: stat.size, createdAt: stat.mtime.toISOString() };
        })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      res.json(files);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Create backup for this tenant
  app.post("/api/backup/create", async (req: any, res) => {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) return res.status(401).json({ error: "Not authorized" });
      const tenant = await storage.getTenant(tenantId);
      if (!tenant) return res.status(404).json({ error: "Tenant not found" });

      const [branches, employees, products, categories, customers] = await Promise.all([
        storage.getBranchesByTenant(tenantId),
        storage.getEmployeesByTenant(tenantId),
        storage.getProductsByTenant(tenantId),
        storage.getCategories(tenantId),
        storage.getCustomers(undefined, tenantId),
      ]);
      let inventory: any[] = [];
      let expenses: any[] = [];
      for (const b of branches) {
        try { const inv = await storage.getInventory(b.id, tenantId); inventory.push(...inv); } catch { }
      }
      try { expenses = await storage.getExpenses(tenantId); } catch { }
      const sales = await storage.getSales({ tenantId, limit: 10000 });

      const snapshot = {
        version: "2.0",
        exportedAt: new Date().toISOString(),
        tenantId,
        tenant: { ...tenant, passwordHash: "[REDACTED]" },
        branches,
        employees: employees.map((e: any) => ({ ...e, pin: "[REDACTED]", passwordHash: "[REDACTED]" })),
        categories, products, inventory, customers, expenses,
        sales: sales.slice(0, 5000),
      };
      const filename = `backup_tenant_${tenantId}_${Date.now()}.json`;
      const filepath = path.join(TENANT_BACKUP_DIR, filename);
      fs.writeFileSync(filepath, JSON.stringify(snapshot));
      const stat = fs.statSync(filepath);
      console.log(`[BACKUP] Manual by tenant ${tenantId}: ${filename} (${Math.round(stat.size / 1024)}KB)`);
      res.json({ success: true, filename, size: stat.size, createdAt: stat.mtime.toISOString() });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Restore backup for this tenant
  app.post("/api/backup/restore/:filename", async (req: any, res) => {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) return res.status(401).json({ error: "Not authorized" });
      const filename = path.basename(req.params.filename);
      // Security: only allow own backups
      if (!filename.startsWith(`backup_tenant_${tenantId}_`)) {
        return res.status(403).json({ error: "Not authorized to restore this backup" });
      }
      const filepath = path.join(TENANT_BACKUP_DIR, filename);
      if (!fs.existsSync(filepath)) return res.status(404).json({ error: "Backup not found" });
      const snapshot = JSON.parse(fs.readFileSync(filepath, "utf-8"));

      const restored: Record<string, number> = { branches: 0, categories: 0, products: 0, customers: 0, expenses: 0 };

      // Restore categories
      if (snapshot.categories?.length) {
        const existingCats = await storage.getCategories(tenantId);
        for (const c of snapshot.categories) {
          try {
            if (!existingCats.find((ec: any) => ec.name === c.name)) {
              await storage.createCategory({ ...c, id: undefined, tenantId });
              restored.categories++;
            }
          } catch { }
        }
      }

      // Restore products (upsert)
      if (snapshot.products?.length) {
        const existingProducts = await storage.getProductsByTenant(tenantId);
        const freshCats = await storage.getCategories(tenantId);
        const catMap = new Map(freshCats.map((c: any) => [c.name, c.id]));
        const origCatMap = new Map((snapshot.categories || []).map((c: any) => [c.id, c.name]));
        for (const p of snapshot.products) {
          try {
            let newCatId = p.categoryId;
            if (p.categoryId && origCatMap.has(p.categoryId)) {
              newCatId = catMap.get(origCatMap.get(p.categoryId)) ?? p.categoryId;
            }
            const match = p.barcode
              ? existingProducts.find((ep: any) => ep.barcode === p.barcode)
              : existingProducts.find((ep: any) => ep.name === p.name);
            if (match) {
              await storage.updateProduct(match.id, { name: p.name, price: p.price, costPrice: p.costPrice, description: p.description, isActive: p.isActive, categoryId: newCatId });
            } else {
              await storage.createProduct({ ...p, id: undefined, tenantId, categoryId: newCatId });
            }
            restored.products++;
          } catch { }
        }
      }

      // Restore customers (skip dups)
      if (snapshot.customers?.length) {
        const existingCustomers = await storage.getCustomers(undefined, tenantId);
        const existingEmails = new Set(existingCustomers.filter((c: any) => c.email).map((c: any) => c.email?.toLowerCase()));
        for (const c of snapshot.customers) {
          try {
            if (!c.email || !existingEmails.has(c.email.toLowerCase())) {
              await storage.createCustomer({ ...c, id: undefined, tenantId });
              restored.customers++;
            }
          } catch { }
        }
      }

      res.json({ success: true, tenantId, restored });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Delete a tenant's own backup
  app.delete("/api/backup/:filename", async (req: any, res) => {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) return res.status(401).json({ error: "Not authorized" });
      const filename = path.basename(req.params.filename);
      if (!filename.startsWith(`backup_tenant_${tenantId}_`)) {
        return res.status(403).json({ error: "Not authorized" });
      }
      const filepath = path.join(TENANT_BACKUP_DIR, filename);
      if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ── Vehicles / Fleet Management ────────────────────────────────────────────
  app.get("/api/vehicles", async (req, res) => {
    try {
      const tenantId = req.query.tenantId ? Number(req.query.tenantId) : undefined;
      const branchId = req.query.branchId ? Number(req.query.branchId) : undefined;
      res.json(await storage.getVehicles(tenantId, branchId));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/vehicles", async (req, res) => {
    try { res.json(await storage.createVehicle(withTenant(req, req.body))); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.put("/api/vehicles/:id", async (req, res) => {
    try {
      // The driver's access token is the key to their app — not editable here.
      const { driverAccessToken: _tok, ...data } = withoutTenant(req.body || {});
      res.json(await storage.updateVehicle(Number(req.params.id), data));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.delete("/api/vehicles/:id", async (req, res) => {
    try { await storage.deleteVehicle(Number(req.params.id)); res.json({ success: true }); } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ── Printer Configurations ─────────────────────────────────────────────────
  app.get("/api/printer-configs", async (req, res) => {
    try {
      // Never another store's printers (this defaulted to tenant 1).
      const tenantId = analyticsTenant(req);
      if (!tenantId) return res.status(400).json({ error: "tenantId is required" });
      const branchId = req.query.branchId ? Number(req.query.branchId) : undefined;
      res.json(await storage.getPrinterConfigs(tenantId, branchId));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/printer-configs", async (req, res) => {
    try {
      const data: any = withTenant(req, req.body || {});
      if (!data.tenantId) return res.status(400).json({ error: "tenantId is required" });
      res.json(await storage.upsertPrinterConfig(data));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ── Daily Closings (TAGESABSCHLUSS) ───────────────────────────────────────
  app.get("/api/daily-closings", async (req, res) => {
    try {
      const tenantId = analyticsTenant(req);
      if (!tenantId) return res.status(400).json({ error: "tenantId is required" });
      const branchId = req.query.branchId ? Number(req.query.branchId) : undefined;
      res.json(await storage.getDailyClosings(tenantId, branchId));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/daily-closings", async (req, res) => {
    try {
      const { branchId, closingDate } = req.body;
      const tenantId = reqTenant(req) ?? (req.body.tenantId ? Number(req.body.tenantId) : undefined);
      if (!tenantId) return res.status(400).json({ error: "tenantId is required" });
      // This store's sales of the store's calendar day (Damascus / Zurich) —
      // it used to add up every store's sales of the UTC day.
      const tz = await storeTimeZone(tenantId);
      const today = /^\d{4}-\d{2}-\d{2}$/.test(String(closingDate || "")) ? String(closingDate) : localDateString(tz);
      const startOfDay = dayStart(tz, today);
      const endOfDay = dayEnd(tz, today);
      const daySales = await storage.getSalesByDateRange(startOfDay, endOfDay, tenantId, branchId ? Number(branchId) : undefined);
      const totalSales = daySales.reduce((s: number, sale: any) => s + Number(sale.totalAmount || 0), 0);
      const totalCash = daySales.filter((s: any) => s.paymentMethod === "cash").reduce((a: number, s: any) => a + Number(s.totalAmount || 0), 0);
      const totalCard = daySales.filter((s: any) => s.paymentMethod === "card").reduce((a: number, s: any) => a + Number(s.totalAmount || 0), 0);
      const totalMobile = daySales.filter((s: any) => s.paymentMethod === "mobile").reduce((a: number, s: any) => a + Number(s.totalAmount || 0), 0);
      const totalDiscounts = daySales.reduce((s: number, sale: any) => s + Number(sale.discountAmount || 0), 0);
      const dc = await storage.createDailyClosing({
        tenantId, branchId: branchId || null, employeeId: req.body.employeeId || null,
        closingDate: today,
        totalSales: String(totalSales), totalCash: String(totalCash),
        totalCard: String(totalCard), totalMobile: String(totalMobile),
        totalTransactions: daySales.length,
        totalReturns: "0", totalDiscounts: String(totalDiscounts),
        openingCash: String(req.body.openingCash || 0),
        closingCash: String(req.body.closingCash || 0),
        notes: req.body.notes || null,
        status: "closed",
      });
      res.json(dc);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ── Monthly Closings (MONATSABSCHLUSS) ────────────────────────────────────
  app.get("/api/monthly-closings", async (req, res) => {
    try {
      const tenantId = analyticsTenant(req);
      if (!tenantId) return res.status(400).json({ error: "tenantId is required" });
      const branchId = req.query.branchId ? Number(req.query.branchId) : undefined;
      res.json(await storage.getMonthlyClosings(tenantId, branchId));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
  app.post("/api/monthly-closings", async (req, res) => {
    try {
      const { branchId, closingMonth } = req.body;
      const tenantId = reqTenant(req) ?? (req.body.tenantId ? Number(req.body.tenantId) : undefined);
      if (!tenantId) return res.status(400).json({ error: "tenantId is required" });
      const tz = await storeTimeZone(tenantId);
      const month = /^\d{4}-\d{2}$/.test(String(closingMonth || "")) ? String(closingMonth) : localMonthString(tz);
      const [startOfMonth, endOfMonth] = monthRange(tz, month)!;
      const monthSales = await storage.getSalesByDateRange(startOfMonth, endOfMonth, tenantId, branchId ? Number(branchId) : undefined);
      const totalSales = monthSales.reduce((s: number, sale: any) => s + Number(sale.totalAmount || 0), 0);
      const totalCash = monthSales.filter((s: any) => s.paymentMethod === "cash").reduce((a: number, s: any) => a + Number(s.totalAmount || 0), 0);
      const totalCard = monthSales.filter((s: any) => s.paymentMethod === "card").reduce((a: number, s: any) => a + Number(s.totalAmount || 0), 0);
      const totalMobile = monthSales.filter((s: any) => s.paymentMethod === "mobile").reduce((a: number, s: any) => a + Number(s.totalAmount || 0), 0);
      const totalDiscounts = monthSales.reduce((s: number, sale: any) => s + Number(sale.discountAmount || 0), 0);
      const expenses = await storage.getExpensesByDateRange(startOfMonth, endOfMonth, tenantId);
      const totalExpenses = expenses.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
      const mc = await storage.createMonthlyClosing({
        tenantId, branchId: branchId || null, employeeId: req.body.employeeId || null,
        closingMonth: month,
        totalSales: String(totalSales), totalCash: String(totalCash),
        totalCard: String(totalCard), totalMobile: String(totalMobile),
        totalTransactions: monthSales.length,
        totalReturns: "0", totalDiscounts: String(totalDiscounts),
        totalExpenses: String(totalExpenses),
        netRevenue: String(totalSales - totalExpenses),
        notes: req.body.notes || null,
        status: "closed",
      });
      res.json(mc);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ── Temporary maintenance: fix NULL tenant_ids (one-time migration fix) ───
  // One-time migration from the single-store days: it stamps EVERY row with
  // a NULL tenant_id with the first tenant. Its secret sat in the source, so
  // it now needs a super-admin login as well.
  app.post("/api/maintenance/fix-tenant-ids", requireSuperAdmin as any, async (req: any, res: any) => {
    const secret = req.headers["x-maintenance-secret"] || req.query.secret;
    if (!process.env.MAINTENANCE_SECRET || secret !== process.env.MAINTENANCE_SECRET) {
      return res.status(403).json({ error: "Forbidden" });
    }
    try {
      const { db } = await import("./db");
      const { sql } = await import("drizzle-orm");

      const firstTenant = (await storage.getTenants())[0];
      if (!firstTenant) {
        return res.status(404).json({ error: "No tenants found" });
      }
      const tid = firstTenant.id;

      const tables = [
        "products", "categories", "employees", "customers", "branches",
        "inventory", "sales", "sale_items", "expenses", "shifts",
        "notifications", "calls", "purchase_orders", "purchase_order_items",
        "suppliers", "tables", "kitchen_orders", "returns", "return_items",
        "cash_drawer_operations", "warehouses", "warehouse_transfers",
        "product_batches", "inventory_movements", "stock_counts",
        "stock_count_items", "employee_commissions", "daily_closings",
        "monthly_closings",
      ];

      const results: Record<string, number> = {};
      for (const table of tables) {
        try {
          const r = await db.execute(
            sql.raw(`UPDATE \`${table}\` SET tenant_id = ${tid} WHERE tenant_id IS NULL`)
          );
          results[table] = (r as any)[0]?.affectedRows ?? 0;
        } catch (e: any) {
          results[table] = -1; // table may not have tenant_id
        }
      }

      res.json({
        success: true,
        tenant: { id: tid, name: firstTenant.businessName },
        updates: results,
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ── DELIVERY PLATFORM API ─────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Customer Auth ─────────────────────────────────────────────────────────

  app.post(
    "/api/delivery/auth/request-otp",
    rateLimit({
      name: "customer-otp",
      max: 5,
      windowMs: 15 * 60 * 1000,
      keyFn: (req: any) => `${req.body?.tenantId}:${canonicalPhone(req.body?.phone).replace(/\D/g, "")}`,
      message: "محاولات كثيرة، انتظر قليلاً ثم أعد المحاولة. / Too many attempts, try again shortly.",
    }),
    async (req: Request, res: Response) => {
    try {
      const { tenantId } = req.body;
      const phone = canonicalPhone(req.body?.phone);
      if (!phone || !tenantId) return res.status(400).json({ error: "رقم الهاتف والمتجر مطلوبان / phone and tenantId required" });
      if (String(phone).replace(/\D/g, "").length < 8) return res.status(400).json({ error: "رقم الهاتف غير صالح — اكتبه مع رمز الدولة / Invalid phone number — include the country code" });
      const otp = await createOtp(phone, Number(tenantId));
      // In production: send via WhatsApp. For now return in dev.
      if (process.env.NODE_ENV === "development") {
        return res.json({ success: true, otp }); // expose OTP in dev only
      }
      // Login codes are a platform service: always sent from the platform's
      // own WhatsApp (linked in Super Admin), never from a store's number.
      const tenant = await storage.getTenant(Number(tenantId));
      const sent = await whatsappService.sendMessage(
        phone,
        `🔐 رمز الدخول إلى ${tenant?.businessName || "المتجر"}: *${otp}*\n` +
          `Your login code: *${otp}*\n\n` +
          `صالح لمدة 10 دقائق. لا تشاركه مع أحد.`,
      );
      if (!sent) {
        return res.status(503).json({ error: "تعذّر إرسال الرمز عبر واتساب. تأكد أن الرقم مسجّل على واتساب ومكتوب مع رمز الدولة، أو سجّل الدخول بـ Google. / Could not send the code via WhatsApp. Check the number is on WhatsApp and includes the country code, or sign in with Google." });
      }
      res.json({ success: true, channel: "whatsapp" });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/delivery/auth/verify-otp", async (req: Request, res: Response) => {
    try {
      const { tenantId } = req.body;
      const phone = canonicalPhone(req.body?.phone);
      const otp = String(req.body?.otp ?? "").replace(/\D/g, "");
      if (!phone || !tenantId || !otp) return res.status(400).json({ error: "رقم الهاتف والرمز مطلوبان / phone, tenantId, otp required" });
      const result = await verifyOtp(phone, Number(tenantId), otp);
      if (!result.success) return res.status(400).json({ error: result.error });
      const customer = await findOrCreateCustomerByPhone(phone, Number(tenantId));
      // Revoke sessions someone else may have opened on a guest/till row
      // before its real owner proved the phone.
      await claimCustomerAfterPhoneProof(customer);
      const token = await createCustomerSession(customer.id, Number(tenantId), req.headers["user-agent"]);
      res.json({
        success: true, token,
        // 15-minute proof of this phone, accepted by /api/delivery/auth/register.
        phoneToken: signPhoneProof(phone, Number(tenantId)),
        customer: { id: customer.id, name: customer.name, phone: customer.phone, loyaltyPoints: customer.loyaltyPoints, loyaltyTier: customer.loyaltyTier, walletBalance: customer.walletBalance },
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post(
    "/api/delivery/auth/login",
    rateLimit({ name: "cust-login-ip", max: 15, windowMs: 15 * 60 * 1000 }),
    rateLimit({
      name: "cust-login-email",
      max: 6,
      windowMs: 15 * 60 * 1000,
      keyFn: (req) => String((req.body as any)?.email || "").toLowerCase().slice(0, 160),
    }),
    async (req: Request, res: Response) => {
    try {
      const { email, password, tenantId } = req.body;
      if (!email || !password || !tenantId) return res.status(400).json({ error: "email, password, tenantId required" });
      const customer = await findCustomerByEmail(email, Number(tenantId));
      if (!customer) return res.status(401).json({ error: "Invalid credentials" });
      const valid = await verifyCustomerPassword(customer, password);
      if (!valid) return res.status(401).json({ error: "Invalid credentials" });
      const token = await createCustomerSession(customer.id, Number(tenantId), req.headers["user-agent"]);
      res.json({ success: true, token, customer: { id: customer.id, name: customer.name, email: customer.email, loyaltyPoints: customer.loyaltyPoints, loyaltyTier: customer.loyaltyTier, walletBalance: customer.walletBalance } });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/delivery/auth/register", async (req: Request, res: Response) => {
    try {
      const { name, password, tenantId } = req.body || {};
      const phone = canonicalPhone(req.body?.phone);
      const email = req.body?.email ? String(req.body.email).trim().toLowerCase() : "";
      if (!phone || !tenantId) return res.status(400).json({ error: "رقم الهاتف والمتجر مطلوبان / phone and tenantId required" });
      const tid = Number(tenantId);
      // Registering onto a phone that already belongs to a customer needs
      // proof of that phone (OTP → phoneToken) or that customer's own session;
      // it used to set a new password on anyone's account.
      const existing = await storage.findCustomerByPhoneExact(phone, tid);
      const phoneProven = verifyPhoneProof(req.body?.phoneToken, phone, tid);
      if (existing) {
        const session = await getAuthenticatedCustomer(req.headers.authorization);
        const proven = phoneProven || session?.id === existing.id;
        if (!proven) {
          return res.status(409).json({
            error: "هذا الرقم مسجّل مسبقاً — سجّل الدخول برمز واتساب / This phone number is already registered — log in with the WhatsApp code",
            code: "PHONE_VERIFICATION_REQUIRED",
          });
        }
      }
      if (email && await emailTakenByOther(email, tid, existing?.id)) {
        return res.status(409).json({
          error: "هذا البريد الإلكتروني مستخدم لحساب آخر / This e-mail is already used by another account",
          code: "EMAIL_IN_USE",
        });
      }
      const customer = existing ?? await findOrCreateCustomerByPhone(phone, tid);
      if (phoneProven) await claimCustomerAfterPhoneProof(customer);
      // Update with registration details
      const updates: any = { name: name || customer.name, hasAccount: true, isActive: true };
      if (email) updates.email = email;
      if (password) { await setCustomerPassword(customer.id, String(password)); }
      await storage.updateCustomer(customer.id, updates);
      const token = await createCustomerSession(customer.id, Number(tenantId), req.headers["user-agent"]);
      res.json({ success: true, token, customer: { id: customer.id, name: updates.name, phone } });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Google Sign-In via the GIS One-Tap / Sign-in-button flow.
  // Client posts the JWT credential it got from `google.accounts.id.initialize`,
  // we verify it against Google's tokeninfo endpoint, then upsert the customer
  // by email and return our own session token. We also accept an optional
  // tenantId so the multi-tenant DB still works (defaults to 24, the platform
  // tenant the rest of the SPA uses).
  app.post("/api/delivery/auth/google", async (req: Request, res: Response) => {
    try {
      const { credential, accessToken, profile, tenantId } = req.body || {};
      const tid = Number(tenantId) || 24;
      // Tokens must have been issued to OUR OAuth client: a token any other
      // site obtained from a user would otherwise log in as that user here.
      const allowedAud = new Set(
        [...String(process.env.GOOGLE_CLIENT_ID || "").split(","), GOOGLE_WEB_CLIENT_ID,
          "852311970344-8q8a01gm3jip4k9vooljk8ttjpd30802.apps.googleusercontent.com"]
          .map((s) => s.trim()).filter(Boolean),
      );

      let payload: any = null;

      if (credential) {
        // Path 1: One-Tap / Sign-In button gives a signed JWT (id_token).
        // tokeninfo validates the signature for us and returns the parsed claims.
        const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
        if (!verifyRes.ok) return res.status(401).json({ error: "Invalid Google credential" });
        payload = await verifyRes.json();
        if (!allowedAud.has(String(payload.aud || ""))) {
          return res.status(401).json({ error: "Token audience mismatch" });
        }
      } else if (accessToken) {
        // Path 2: OAuth popup fallback. We can't trust the JSON the client
        // POSTs us; re-fetch userinfo using the access_token straight from
        // Google so the server sees authoritative claims.
        const info = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(String(accessToken))}`);
        if (!info.ok) return res.status(401).json({ error: "Invalid Google access token" });
        const tokenInfo: any = await info.json();
        if (!allowedAud.has(String(tokenInfo.aud || "")) && !allowedAud.has(String(tokenInfo.azp || ""))) {
          return res.status(401).json({ error: "Token audience mismatch" });
        }
        const ui = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!ui.ok) return res.status(401).json({ error: "Invalid Google access token" });
        payload = await ui.json();
      } else if (profile && profile.email) {
        // Path 3 (legacy/test): client posted profile. Reject in production.
        return res.status(400).json({ error: "credential or accessToken required" });
      } else {
        return res.status(400).json({ error: "credential or accessToken required" });
      }

      if (!payload || !payload.email) return res.status(400).json({ error: "Email not present in token" });
      if (payload.email_verified === false || payload.email_verified === "false") {
        return res.status(401).json({ error: "Google e-mail is not verified" });
      }
      const email = String(payload.email).toLowerCase();
      const name = payload.name || payload.given_name || email.split("@")[0];
      const picture = payload.picture || null;

      // Upsert customer by email within the tenant.
      const { db } = await import("./db");
      const { customers } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      let customer = await findCustomerByEmail(email, tid);
      if (!customer) {
        const [inserted] = await db.insert(customers).values({
          tenantId: tid,
          name,
          email,
          hasAccount: true,
          loyaltyPoints: 0,
          loyaltyTier: "bronze",
        }).$returningId();
        const [created] = await db.select().from(customers).where(eq(customers.id, inserted.id)).limit(1);
        customer = created as any;
      } else if (!customer.name || customer.name === customer.email) {
        // Backfill name from Google if we never had one
        await storage.updateCustomer(customer.id, { name });
      }

      const token = await createCustomerSession(customer.id, tid, req.headers["user-agent"]);
      res.json({
        success: true,
        token,
        customer: {
          id: customer.id,
          name: customer.name || name,
          email: customer.email,
          picture,
          loyaltyPoints: customer.loyaltyPoints,
          loyaltyTier: customer.loyaltyTier,
          walletBalance: customer.walletBalance,
        },
      });
    } catch (e: any) {
      console.error("[google-auth]", e);
      res.status(500).json({ error: e.message || "Google sign-in failed" });
    }
  });

  app.post("/api/delivery/auth/logout", async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith("Bearer ")) {
        await deleteCustomerSession(authHeader.split(" ")[1]);
      }
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/delivery/auth/me", async (req: Request, res: Response) => {
    try {
      const customer = await getAuthenticatedCustomer(req.headers.authorization);
      if (!customer) return res.status(401).json({ error: "Not authenticated" });
      res.json({ customer });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.put("/api/delivery/auth/me", async (req: Request, res: Response) => {
    try {
      const customer = await getAuthenticatedCustomer(req.headers.authorization);
      if (!customer) return res.status(401).json({ error: "Not authenticated" });
      const { name, dateOfBirth, gender, preferredLanguage } = req.body || {};
      const email = req.body?.email ? String(req.body.email).trim().toLowerCase() : "";
      const updates: any = {};
      if (name) updates.name = name;
      if (email && email !== String(customer.email || "").toLowerCase()) {
        // An e-mail shared by two accounts would let Google sign-in land in
        // the wrong one.
        if (customer.tenantId && await emailTakenByOther(email, customer.tenantId, customer.id)) {
          return res.status(409).json({ error: "هذا البريد الإلكتروني مستخدم لحساب آخر / This e-mail is already used by another account", code: "EMAIL_IN_USE" });
        }
        updates.email = email;
      }
      if (dateOfBirth) updates.dateOfBirth = dateOfBirth;
      if (gender) updates.gender = gender;
      if (preferredLanguage) updates.preferredLanguage = preferredLanguage;
      await storage.updateCustomer(customer.id, updates);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ── Customer Addresses ────────────────────────────────────────────────────

  app.get("/api/delivery/addresses", async (req: Request, res: Response) => {
    try {
      const customer = await getAuthenticatedCustomer(req.headers.authorization);
      if (!customer) return res.status(401).json({ error: "Not authenticated" });
      const addresses = await storage.getCustomerAddresses(customer.id);
      res.json(addresses);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/delivery/addresses", async (req: Request, res: Response) => {
    try {
      const customer = await getAuthenticatedCustomer(req.headers.authorization);
      if (!customer) return res.status(401).json({ error: "Not authenticated" });
      const address = await storage.createCustomerAddress({ ...req.body, customerId: customer.id, tenantId: customer.tenantId });
      res.status(201).json(address);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.put("/api/delivery/addresses/:id", async (req: Request, res: Response) => {
    try {
      const customer = await getAuthenticatedCustomer(req.headers.authorization);
      if (!customer) return res.status(401).json({ error: "Not authenticated" });
      // Only the customer's own address, and it stays theirs.
      const existing = await storage.getCustomerAddress(Number(req.params.id));
      if (!existing || existing.customerId !== customer.id) return res.status(404).json({ error: "Address not found" });
      const { id: _id, customerId: _c, tenantId: _t, ...changes } = req.body || {};
      const address = await storage.updateCustomerAddress(existing.id, { ...changes, customerId: customer.id });
      res.json(address);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete("/api/delivery/addresses/:id", async (req: Request, res: Response) => {
    try {
      const customer = await getAuthenticatedCustomer(req.headers.authorization);
      if (!customer) return res.status(401).json({ error: "Not authenticated" });
      const existing = await storage.getCustomerAddress(Number(req.params.id));
      if (!existing || existing.customerId !== customer.id) return res.status(404).json({ error: "Address not found" });
      await storage.deleteCustomerAddress(existing.id);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.put("/api/delivery/addresses/:id/default", async (req: Request, res: Response) => {
    try {
      const customer = await getAuthenticatedCustomer(req.headers.authorization);
      if (!customer) return res.status(401).json({ error: "Not authenticated" });
      const existing = await storage.getCustomerAddress(Number(req.params.id));
      if (!existing || existing.customerId !== customer.id) return res.status(404).json({ error: "Address not found" });
      await storage.setDefaultAddress(existing.id, customer.id);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ── Multi-restaurant discovery (Public) ──────────────────────────────────

  app.get("/api/delivery/restaurants", async (req: Request, res: Response) => {
    try {
      // Return all active landing page configs as a restaurant list
      const tenantId = req.query.tenantId as string | undefined;
      const configs = await storage.getAllLandingPageConfigs(tenantId);
      const restaurants = (configs || []).map((c: any) => ({
        id: c.tenantId,
        slug: c.slug,
        name: c.storeName || c.restaurantName || "Restaurant",
        logo: c.logo || c.logomark || null,
        coverImage: c.coverImage || c.headerBgImage || null,
        cuisine: c.cuisineType || c.cuisine || "",
        rating: null as number | null,
        reviewCount: 0,
        deliveryTime: c.minDeliveryTime || 25,
        deliveryFee: 0,
        minOrder: 0,
        isOpen: c.isOpen !== false,
        primaryColor: c.primaryColor || "#FF5722",
      }));

      // Enrich restaurants with menu-based data if missing key fields
      for (const r of restaurants) {
        // Fix generic names
        if (r.name === "Restaurant" && r.slug) {
          r.name = r.slug.split("-").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
        }
        // Real figures only (this used to show 4.5 stars / "50 reviews" for
        // every store).
        try {
          Object.assign(r, await storeRating(r.id));
          r.deliveryFee = await storeBaseDeliveryFee(r.id);
          r.minOrder = await storeMinOrderAmount(r.id);
        } catch {}
        if (!r.cuisine) {
          try {
            const cats = await storage.getCategories(r.id);
            if (cats.length > 0) {
              const catNames = cats.filter((c: any) => c.isActive !== false).map((c: any) => c.name).slice(0, 3);
              r.cuisine = catNames.join(", ");
            }
          } catch {}
        }
      }

      res.json(restaurants);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Store currency lives on the tenant's main branch (branches.currency), e.g.
  // "CHF" or "SYP". Landing-page config has no currency column of its own.
  async function mainBranchCurrency(tenantId: number | null | undefined): Promise<string | null> {
    if (!tenantId) return null;
    try {
      const brs = await storage.getBranchesByTenant(Number(tenantId));
      const main: any = brs.find((b: any) => b.isMain) || brs[0];
      return main?.currency || null;
    } catch { return null; }
  }

  // ── Slug resolver helper — maps "barmagly" and demo slugs to real config ──
  async function resolveSlugConfig(slug: string) {
    // "barmagly" brand alias → primary tenant
    if (slug === "barmagly") {
      const config = await storage.getLandingPageConfigBySlug("pizza-lemon");
      if (config) {
        (config as any).storeName = "Kassenta";
        (config as any).heroTitle = "Kassenta Delivery";
      }
      return config;
    }
    // Unknown slugs are "not found" — they used to serve Pizza Lemon's menu
    // (and send the orders to Pizza Lemon) under the name in the URL.
    return storage.getLandingPageConfigBySlug(slug);
  }

  // ── Storefront / Menu (Public) ────────────────────────────────────────────

  app.get("/api/delivery/store/:slug", async (req: Request, res: Response) => {
    try {
      const config = await resolveSlugConfig(req.params.slug);
      if (!config) return res.status(404).json({ error: "Store not found" });
      const tenant = await storage.getTenant(config.tenantId).catch(() => null);
      const currency = (await mainBranchCurrency(config.tenantId)) || (config as any).currency || tenant?.currency || process.env.DEFAULT_CURRENCY || "CHF";
      res.setHeader("Cache-Control", "public, max-age=300");
      res.json({
        slug: config.slug,
        tenantId: config.tenantId,
        storeName: (config as any).storeName || (config as any).heroTitle || tenant?.businessName || "Store",
        name: (config as any).storeName || (config as any).heroTitle || tenant?.businessName || "Store",
        primaryColor: config.primaryColor || "#FF5722",
        accentColor: config.accentColor || "#2FD3C6",
        currency,
        phone: config.phone,
        address: config.address,
        openingHours: config.openingHours,
        // What checkout actually enforces / charges by default.
        minOrderAmount: await storeMinOrderAmount(config.tenantId),
        deliveryFee: await storeBaseDeliveryFee(config.tenantId),
        estimatedDeliveryTime: config.estimatedDeliveryTime,
        enableDelivery: config.enableDelivery !== false,
        enablePickup: config.enablePickup !== false,
        enableLoyalty: (config as any).enableLoyalty ?? true,
        enableWallet: (config as any).enableWallet ?? false,
        enableScheduledOrders: (config as any).enableScheduledOrders ?? true,
        enablePromos: (config as any).enablePromos ?? true,
        minDeliveryTime: (config as any).minDeliveryTime ?? 20,
        maxDeliveryTime: (config as any).maxDeliveryTime ?? 45,
        bannerImages: (config as any).bannerImages ?? [],
        promoText: (config as any).promoText,
        logo: config.heroImage || (config as any).logo,
        coverImage: (config as any).coverImage || (config as any).headerBgImage,
        socialWhatsapp: config.socialWhatsapp,
        supportPhone: (config as any).supportPhone || config.phone || "",
        ...(await storeRating(config.tenantId)),
        cuisine: (config as any).cuisineType || (config as any).cuisine || "",
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/delivery/store/:slug/menu", async (req: Request, res: Response) => {
    try {
      const config = await resolveSlugConfig(req.params.slug);
      if (!config) return res.status(404).json({ error: "Store not found" });
      const [cats, prods] = await Promise.all([
        storage.getCategories(config.tenantId),
        storage.getProductsByTenant(config.tenantId),
      ]);
      const activeProds = prods
        .filter((p: any) => p.isActive !== false)
        .map((p: any) => ({ ...p, imageUrl: p.imageUrl || p.image || null }));
      const menu = cats
        .filter((c: any) => c.isActive !== false)
        .map((cat: any) => ({
          ...cat,
          items: activeProds.filter((p: any) => p.categoryId === cat.id),
        }))
        .filter((cat: any) => cat.items.length > 0);
      res.setHeader("Cache-Control", "public, max-age=300").json({ categories: menu, allProducts: activeProds });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/delivery/store/:slug/product/:id", async (req: Request, res: Response) => {
    try {
      const config = await resolveSlugConfig(req.params.slug);
      if (!config) return res.status(404).json({ error: "Store not found" });
      const product = await storage.getProduct(Number(req.params.id));
      if (!product || product.tenantId !== config.tenantId) return res.status(404).json({ error: "Product not found" });
      res.json({ ...product, imageUrl: (product as any).imageUrl || (product as any).image || null });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/delivery/store/:slug/promos", async (req: Request, res: Response) => {
    try {
      const config = await resolveSlugConfig(req.params.slug);
      if (!config) return res.status(404).json({ error: "Store not found" });
      const now = new Date();
      const codes = await storage.getPromoCodes ? await storage.getPromoCodes(config.tenantId) : [];
      const active = codes.filter((c: any) => c.isActive &&
        (!c.validFrom || new Date(c.validFrom) <= now) &&
        (!c.validUntil || new Date(c.validUntil) >= now));
      res.json({ promos: active, bannerImages: (config as any).bannerImages ?? [], promoText: (config as any).promoText });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/delivery/promo/validate", async (req: Request, res: Response) => {
    try {
      const { tenantId, code, orderTotal, orderType, customerId } = req.body;
      if (!tenantId || !code || orderTotal === undefined) return res.status(400).json({ error: "tenantId, code, orderTotal required" });
      const result = await validatePromoCode(Number(tenantId), code, Number(orderTotal), orderType || "delivery", customerId ? Number(customerId) : undefined);
      res.json(result);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/delivery/zones", async (req: Request, res: Response) => {
    try {
      const { tenantId } = req.query;
      if (!tenantId) return res.status(400).json({ error: "tenantId required" });
      const zones = await storage.getDeliveryZones(Number(tenantId));
      res.json(zones);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ── Orders ────────────────────────────────────────────────────────────────

  app.post("/api/delivery/orders", async (req: Request, res: Response) => {
    try {
      const {
        tenantId, customerName, customerPhone: rawCustomerPhone, customerEmail,
        customerAddress, items, subtotal, deliveryFee, totalAmount,
        paymentMethod, orderType, notes, promoCode, promoCodeId,
        discountAmount, customerLat, customerLng, floor, buildingName,
        addressNotes, scheduledAt, loyaltyPointsUsed, walletAmountUsed,
        savedAddressId, tableQrToken, tableNumber,
      } = req.body;
      const customerPhone = rawCustomerPhone ? canonicalPhone(rawCustomerPhone) : rawCustomerPhone;

      if (!tenantId || !customerPhone || !items?.length) {
        return res.status(400).json({ error: "tenantId, customerPhone, items required" });
      }
      const tid = Number(tenantId);
      const type = orderType || "delivery";
      const currency = await storeCurrency(tid);
      // Arabic + English for Syrian stores; Swiss stores keep English.
      const bi = (ar: string, en: string) => (currency === "SYP" ? `${ar} / ${en}` : en);

      // Idempotency: a checkout retried with the same Idempotency-Key (same
      // store and phone, within 24 h) gets the first order back.
      const idemKey = requestIdempotencyKey(req);
      if (idemKey) {
        const prior = await findOrderByClientRef(tid, idemKey, customerPhone);
        if (prior) {
          return res.status(200).json({ success: true, orderId: prior.id, orderNumber: prior.order_number, trackingToken: prior.tracking_token, totalAmount: Number(prior.total_amount), duplicate: true });
        }
        const lockKey = `order:${tid}:${idemKey}`;
        if (inflightIdempotency.has(lockKey)) {
          return res.status(409).json({ error: bi("الطلب قيد المعالجة", "This order is already being placed"), code: "ORDER_IN_PROGRESS" });
        }
        inflightIdempotency.add(lockKey);
        const release = () => inflightIdempotency.delete(lockKey);
        res.on("finish", release);
        res.on("close", release);
      }

      // Card payments only where the gateway can charge the store's currency.
      if (CARD_METHODS.has(String(paymentMethod || "").toLowerCase()) && !cardSupported(currency)) {
        return res.status(400).json({
          error: bi("الدفع بالبطاقة غير متاح لهذا المتجر — اختر طريقة دفع أخرى", "Card payment is not available for this store — choose another payment method"),
          code: "CARD_NOT_SUPPORTED",
        });
      }

      const trackingToken = generateTrackingToken();
      const isDineIn = orderType === "dine_in" && tableQrToken;
      const orderNumber = isDineIn ? `DIN-${Date.now()}` : `DEL-${Date.now()}`;
      const customer = await getAuthenticatedCustomer(req.headers.authorization);

      // Re-price from the tenant's own product rows. The body's subtotal /
      // deliveryFee / totalAmount / discountAmount are advisory only: this
      // endpoint is public, and the stored total is what gets charged.
      let base;
      try {
        base = await repriceOrder({ tenantId: tid, items, clientDeliveryFee: deliveryFee, orderType: type });
      } catch (e: any) {
        if (e instanceof PricingError) return res.status(400).json({ error: e.message });
        throw e;
      }

      // The store's minimum order (delivery orders).
      if (type === "delivery") {
        const min = await storeMinOrderAmount(tid);
        if (min > 0 && base.subtotal < min) {
          return res.status(400).json({
            error: bi(`الحد الأدنى للطلب هو ${formatMoney(min, currency)}`, `The minimum order is ${formatMoney(min, currency)}`),
            code: "MIN_ORDER_NOT_MET",
            minOrderAmount: min,
          });
        }
      }

      // A discount only ever comes from a promo that validates now, on the
      // server's subtotal. A client-sent discountAmount used to be applied
      // as-is, with or without a promo.
      let finalDiscount = 0;
      let resolvedPromoId: number | null = null;
      if (promoCode || promoCodeId) {
        let code = promoCode ? String(promoCode) : "";
        if (!code && promoCodeId) {
          const { pool } = await import("./db");
          const [rows]: any = await pool.query("SELECT code FROM promo_codes WHERE id = ? AND tenant_id = ? LIMIT 1", [Number(promoCodeId), tid]);
          code = rows?.[0]?.code || "";
        }
        const promo = code
          ? await validatePromoCode(tid, code, base.subtotal, type, customer?.id)
          : { valid: false, error: "Invalid promo code" } as any;
        if (!promo.valid || !promo.promoCode) {
          return res.status(400).json({ error: promo.error || "Invalid promo code", code: "PROMO_INVALID" });
        }
        finalDiscount = promo.promoCode.discountType === "free_delivery" ? base.deliveryFee : Number(promo.discountAmount ?? 0);
        resolvedPromoId = promo.promoCode.id;
      } else if (Number(discountAmount) > 0) {
        console.warn(`[delivery/orders] tenant ${tid}: ignored client discountAmount ${discountAmount} without a promo code`);
      }

      // Loyalty points: checked now, taken once the order exists.
      let loyaltyPoints = 0;
      let loyaltyValue = 0;
      const wantPoints = Math.floor(Number(loyaltyPointsUsed) || 0);
      if (wantPoints > 0) {
        const refusal = customer
          ? await checkLoyaltyRedemption(customer.id, tid, wantPoints)
          : "Log in to redeem points";
        if (refusal) return res.status(400).json({ error: refusal, code: "LOYALTY_REFUSED" });
        const cfg = await getLoyaltyConfig(tid);
        loyaltyPoints = wantPoints;
        loyaltyValue = roundMoney(wantPoints * cfg.redemptionRate, currency);
      }

      const discountTotal = Math.min(base.subtotal, roundMoney(finalDiscount + loyaltyValue, currency));
      const gross = Math.max(0, base.subtotal - discountTotal + base.deliveryFee);
      // Wallet: only a logged-in customer's own balance, never more than the
      // order (an anonymous walletAmountUsed used to lower the total for free).
      const walletUsed = customer ? roundMoney(Math.min(Math.max(0, Number(walletAmountUsed ?? 0) || 0), gross), currency) : 0;

      let pricing;
      try {
        pricing = await repriceOrder({
          tenantId: tid,
          items,
          clientSubtotal: subtotal,
          clientDeliveryFee: deliveryFee,
          clientTotal: totalAmount,
          discountAmount: discountTotal,
          walletUsed,
          orderType: type,
        });
      } catch (e: any) {
        if (e instanceof PricingError) return res.status(400).json({ error: e.message });
        throw e;
      }

      if (walletUsed > 0 && customer) {
        const walletResult = await deductWallet(customer.id, tid, walletUsed);
        if (!walletResult.success) {
          return res.status(400).json({ error: walletResult.error });
        }
      }

      const order = await storage.createOnlineOrder({
        tenantId: Number(tenantId),
        orderNumber,
        customerName: customerName || customerPhone,
        customerPhone,
        customerEmail: customerEmail ?? null,
        customerAddress: customerAddress ?? null,
        items: pricing.items,
        subtotal: pricing.subtotal.toFixed(2),
        taxAmount: "0",
        deliveryFee: pricing.deliveryFee.toFixed(2),
        totalAmount: pricing.totalAmount.toFixed(2),
        paymentMethod: paymentMethod || "cash",
        paymentStatus: "pending",
        status: "pending",
        orderType: orderType || "delivery",
        notes: notes ?? null,
        estimatedTime: 35,
        // Syrian stores' customers get Arabic messages unless they chose.
        language: req.body.language || (currency === "SYP" ? "ar" : "en"),
        trackingToken,
        sourceChannel: isDineIn ? "dine_in_qr" : "web",
        tableNumber: tableNumber ?? null,
        tableQrToken: tableQrToken ?? null,
        promoCodeId: resolvedPromoId ?? undefined,
        discountAmount: discountTotal.toFixed(2),
        customerLat: customerLat ? String(customerLat) : null,
        customerLng: customerLng ? String(customerLng) : null,
        floor: floor ?? null,
        buildingName: buildingName ?? null,
        addressNotes: addressNotes ?? null,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        walletAmountUsed: walletUsed.toFixed(2),
        loyaltyPointsUsed: loyaltyPoints,
        savedAddressId: savedAddressId ? Number(savedAddressId) : null,
      } as any).catch(async (err: any) => {
        // Nothing was ordered: give the wallet money back.
        if (walletUsed > 0 && customer) await creditWallet(customer.id, tid, walletUsed, "refund").catch(() => {});
        throw err;
      });

      if (idemKey && orderClientRefReady) {
        const { pool } = await import("./db");
        await pool.query("UPDATE online_orders SET client_ref = ? WHERE id = ?", [idemKey, order.id]).catch(() => {});
      }
      if (loyaltyPoints > 0 && customer) {
        await redeemPointsForOrder(customer.id, tid, loyaltyPoints, order.id, loyaltyValue)
          .catch((e: any) => console.error("[loyalty] order", order.id, e?.message || e));
      }

      // Record promo usage
      if (resolvedPromoId && finalDiscount > 0) {
        await recordPromoUsage(resolvedPromoId, customer?.id, order.id, finalDiscount);
      }

      // WhatsApp from the store's own number: the whole order to the store
      // (alert group / owner) and a confirmation to the customer.
      try {
        const tenantRow = await storage.getTenant(Number(tenantId));
        const config = await storage.getLandingPageConfigByTenantId(Number(tenantId));
        const adminPhone = verifiedStorePhone(tenantRow?.metadata) || config?.socialWhatsapp || undefined;
        whatsappService.orderPlaced(order as any, Number(tenantId), adminPhone).catch(() => {});
      } catch (_) {}

      // Broadcast to POS via WebSocket (public broadcast: (payload, tenantId))
      try {
        callerIdService.broadcast({
          type: "new_online_order",
          order: { id: order.id, orderNumber, customerName, totalAmount: order.totalAmount, orderType }
        }, tid);
      } catch (_) {}

      res.status(201).json({ success: true, orderId: order.id, orderNumber, trackingToken, totalAmount: Number(order.totalAmount) });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/delivery/orders/track/:token", async (req: Request, res: Response) => {
    try {
      const order: any = await storage.getOnlineOrderByTrackingToken(req.params.token);
      if (!order) return res.status(404).json({ error: "Order not found" });
      // Normalize items: MySQL JSON sometimes comes back as a raw string on
      // this query path — the tracking page crashes on (order.items||[]).map
      if (typeof order.items === "string") {
        try { order.items = JSON.parse(order.items); } catch { order.items = []; }
      }
      if (!Array.isArray(order.items)) order.items = [];
      // Get driver info if assigned
      let driver = null;
      if (order.driverId) {
        driver = await storage.getDriverLocation(order.driverId);
      }
      // Include store branding for the public tracking page
      let store: any = null;
      try {
        if (order.tenantId) {
          const cfg = await storage.getLandingPageConfigByTenantId(Number(order.tenantId));
          if (cfg) {
            store = {
              name: (cfg as any).storeName || (cfg as any).name,
              primaryColor: (cfg as any).primaryColor || "#FF5722",
              currency: (await mainBranchCurrency(Number(order.tenantId))) || (cfg as any).currency || process.env.DEFAULT_CURRENCY || "CHF",
              logo: (cfg as any).logo,
              supportPhone: (cfg as any).supportPhone,
              slug: cfg.slug,
            };
          }
        }
      } catch (_) {}
      res.json({ order, driver, store });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/delivery/orders/history", async (req: Request, res: Response) => {
    try {
      const customer = await getAuthenticatedCustomer(req.headers.authorization);
      if (!customer) return res.status(401).json({ error: "Not authenticated" });
      const orders = await storage.getCustomerOrderHistory(customer.id, customer.tenantId!);
      res.json(orders);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/delivery/orders/:id/rate", async (req: Request, res: Response) => {
    try {
      const customer = await getAuthenticatedCustomer(req.headers.authorization);
      const { overallRating, foodRating, deliveryRating, comment } = req.body;
      if (!overallRating) return res.status(400).json({ error: "overallRating required" });
      const orderId = Number(req.params.id);
      const order: any = await storage.getOnlineOrder(orderId);
      if (!order) return res.status(404).json({ error: "Order not found" });
      // Only the customer who placed the order (by login, or holding the
      // order's tracking link) may rate it — ids are guessable.
      const token = String(req.body?.trackingToken || req.query.token || "");
      const byToken = !!order.trackingToken && token === order.trackingToken;
      const byCustomer = !!customer && customer.tenantId === order.tenantId
        && !!customer.phone && canonicalPhone(customer.phone) === canonicalPhone(order.customerPhone);
      if (!byToken && !byCustomer) return res.status(404).json({ error: "Order not found" });
      const stars = (v: unknown) => {
        const n = Math.round(Number(v));
        return Number.isFinite(n) && n >= 1 && n <= 5 ? n : null;
      };
      if (!stars(overallRating)) return res.status(400).json({ error: "overallRating must be 1–5" });
      const rating = await storage.createOrderRating({
        orderId,
        customerId: customer?.id ?? null,
        driverId: (order as any).driverId ?? null,
        overallRating: stars(overallRating)!,
        foodRating: stars(foodRating),
        deliveryRating: stars(deliveryRating),
        comment: comment == null ? null : String(comment).slice(0, 2000),
      });
      res.json(rating);
    } catch (e: any) {
      if (e?.code === "ER_DUP_ENTRY") return res.status(409).json({ error: "This order has already been rated", code: "ALREADY_RATED" });
      res.status(500).json({ error: e.message });
    }
  });

  // ── Driver Routes ─────────────────────────────────────────────────────────

  app.post("/api/delivery/driver/auth", async (req: Request, res: Response) => {
    try {
      const { accessToken } = req.body;
      if (!accessToken) return res.status(400).json({ error: "accessToken required" });
      const driver = await storage.getVehicleByAccessToken(accessToken);
      if (!driver) return res.status(401).json({ error: "Invalid driver token" });
      res.json({ driver: { id: driver.id, driverName: driver.driverName, driverPhone: driver.driverPhone, driverStatus: driver.driverStatus } });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Helper: accept driver token from either Authorization Bearer (PWA),
  // body.token (legacy POSTs), or query.token (legacy GETs).
  const driverTokenFromRequest = (req: Request): string => {
    const bearer = (req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
    return (bearer || (req.body && req.body.token) || (req.query && (req.query.token as string)) || "").trim();
  };

  app.get("/api/delivery/driver/orders", async (req: Request, res: Response) => {
    try {
      const token = driverTokenFromRequest(req);
      if (!token) return res.status(401).json({ error: "Driver token required" });
      const driver = await storage.getVehicleByAccessToken(token);
      if (!driver) return res.status(401).json({ error: "Invalid driver token" });
      const orders = await storage.getDriverActiveOrders(driver.id, driver.tenantId!);
      res.json(orders);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/delivery/driver/orders/:id/accept", async (req: Request, res: Response) => {
    try {
      const token = driverTokenFromRequest(req);
      if (!token) return res.status(401).json({ error: "Driver token required" });
      const driver = await storage.getVehicleByAccessToken(token);
      if (!driver) return res.status(401).json({ error: "Invalid driver token" });
      const orderId = Number(req.params.id);
      await assignDriverToOrder(orderId, driver.id);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/delivery/driver/orders/:id/picked-up", async (req: Request, res: Response) => {
    try {
      const token = driverTokenFromRequest(req);
      if (!token) return res.status(401).json({ error: "Driver token required" });
      const driver = await storage.getVehicleByAccessToken(token);
      if (!driver) return res.status(401).json({ error: "Invalid driver token" });
      const orderId = Number(req.params.id);
      await storage.updateOnlineOrder(orderId, { status: "on_way", riderPickedUpAt: new Date() } as any);
      // Notify customer
      const order = await storage.getOnlineOrder(orderId);
      if (order?.customerPhone && (order as any).trackingToken) {
        try {
          if ((order as any).tenantId) await whatsappService.orderStatusChanged(order as any, "on_way", (order as any).tenantId);
        } catch (_) {}
      }
      callerIdService.broadcast({ type: "delivery_status_change", orderId, status: "on_way", driverName: driver.driverName }, driver.tenantId!);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/delivery/driver/orders/:id/delivered", async (req: Request, res: Response) => {
    try {
      const token = driverTokenFromRequest(req);
      if (!token) return res.status(401).json({ error: "Driver token required" });
      const driver = await storage.getVehicleByAccessToken(token);
      if (!driver) return res.status(401).json({ error: "Invalid driver token" });
      const orderId = Number(req.params.id);
      await storage.updateOnlineOrder(orderId, { status: "delivered", riderDeliveredAt: new Date() } as any);
      await releaseDriver(driver.id);
      // Award loyalty points
      const order = await storage.getOnlineOrder(orderId);
      if (order) {
        const customerId = await storage.getCustomerIdByPhone(order.customerPhone, driver.tenantId!);
        if (customerId) {
          await awardLoyaltyPoints(customerId, driver.tenantId!, orderId, Number(order.totalAmount));
        }
        // "Delivered", with the whole order and the rating link, from the store's number
        if (order.customerPhone && (order as any).tenantId) {
          whatsappService.orderStatusChanged(order as any, "delivered", (order as any).tenantId).catch(() => {});
        }
      }
      callerIdService.broadcast({ type: "delivery_status_change", orderId, status: "delivered", driverName: driver.driverName }, driver.tenantId!);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Toggle driver online/offline status — persists driverStatus on vehicles row
  app.post("/api/delivery/driver/status", async (req: Request, res: Response) => {
    try {
      const token = driverTokenFromRequest(req);
      if (!token) return res.status(401).json({ error: "Driver token required" });
      const driver = await storage.getVehicleByAccessToken(token);
      if (!driver) return res.status(401).json({ error: "Invalid driver token" });
      const status = String(req.body?.status || "").trim();
      if (!["available", "offline", "on_delivery"].includes(status)) {
        return res.status(400).json({ error: "status must be available | offline | on_delivery" });
      }
      const { db } = await import("./db");
      const { vehicles } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      await db.update(vehicles).set({ driverStatus: status, locationUpdatedAt: new Date() } as any).where(eq(vehicles.id, driver.id));
      // Notify the tenant's POS so the available-drivers list refreshes live
      try { callerIdService.broadcast({ type: "driver_status_change", vehicleId: driver.id, status }, driver.tenantId!); } catch {}
      res.json({ success: true, driverStatus: status });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/delivery/driver/location", async (req: Request, res: Response) => {
    try {
      // Accept token from body (legacy) OR Authorization Bearer header (driver app)
      const bearer = (req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
      const token = (req.body?.token || bearer || "").trim();
      const { lat, lng, orderId, status } = req.body || {};
      if (!token) return res.status(401).json({ error: "Driver token required" });
      const driver = await storage.getVehicleByAccessToken(token);
      if (!driver) return res.status(401).json({ error: "Invalid driver token" });

      // If status is sent (driver app's online toggle includes it), persist it
      // even if lat/lng are still null because GPS hasn't locked yet.
      if (status && ["available", "offline", "on_delivery"].includes(status)) {
        try {
          const { db } = await import("./db");
          const { vehicles } = await import("@shared/schema");
          const { eq } = await import("drizzle-orm");
          await db.update(vehicles).set({ driverStatus: status, locationUpdatedAt: new Date() } as any).where(eq(vehicles.id, driver.id));
          try { callerIdService.broadcast({ type: "driver_status_change", vehicleId: driver.id, status }, driver.tenantId!); } catch {}
        } catch (_) {}
      }

      // No coordinates yet (going online before GPS lock) — just acknowledge
      if (lat === undefined || lat === null || lng === undefined || lng === null) {
        return res.json({ success: true, statusOnly: true });
      }
      const oid = orderId ? Number(orderId) : undefined;

      // Persist to vehicles + driver_locations history
      await storage.updateDriverLocation(driver.id, Number(lat), Number(lng), oid);

      // Mirror onto the active online_orders row so the tracking page sees
      // an up-to-date marker even when it reloads (SSE may have dropped)
      if (oid) {
        try {
          await storage.updateOnlineOrder(oid, {
            driverLat: Number(lat).toFixed(7),
            driverLng: Number(lng).toFixed(7),
          } as any);
        } catch (_) {}
      }

      // Broadcast to POS clients (tenant-scoped) — proper method
      callerIdService.broadcastDriverLocation(driver.tenantId!, driver.id, Number(lat), Number(lng), oid);

      // Push to customer tracking SSE stream (if any client is listening for this order)
      if (oid) {
        try {
          const sseMap: Map<number, Set<any>> | undefined = (app as any)._orderSseClients;
          const set = sseMap?.get(oid);
          if (set && set.size) {
            const msg = `data: ${JSON.stringify({ type: "driver_location_update", driverLat: Number(lat), driverLng: Number(lng), vehicleId: driver.id })}\n\n`;
            set.forEach((c: any) => { try { c.write(msg); } catch {} });
          }
        } catch (_) {}
      }

      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/delivery/driver/earnings", async (req: Request, res: Response) => {
    try {
      const token = driverTokenFromRequest(req);
      const days = (req.query.days as string) || "7";
      if (!token) return res.status(401).json({ error: "Driver token required" });
      const driver = await storage.getVehicleByAccessToken(token);
      if (!driver) return res.status(401).json({ error: "Invalid driver token" });
      const earnings = await storage.getDriverEarnings(driver.id, Number(days ?? 7));
      res.json(earnings);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ── POS Management ────────────────────────────────────────────────────────

  app.get("/api/delivery/manage/orders", async (req: Request, res: Response) => {
    try {
      const { tenantId, status, orderType } = req.query;
      const tid = (req as any).tenantId || Number(tenantId);
      if (!tid) return res.status(400).json({ error: "tenantId is required" });
      const orders = await storage.getDeliveryOrders(tid, { status: status as string, orderType: orderType as string });
      res.json(orders);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.put("/api/delivery/manage/orders/:id/assign", async (req: Request, res: Response) => {
    try {
      const { vehicleId } = req.body;
      if (!vehicleId) return res.status(400).json({ error: "vehicleId required" });
      const orderId = Number(req.params.id);
      // The ownership middleware has checked the order and the vehicle belong
      // to this store; a missing / inactive vehicle is refused here.
      const vehicle: any = await storage.getVehicle(Number(vehicleId));
      if (!vehicle || vehicle.isActive === false) return res.status(404).json({ error: "Driver not found" });
      await storage.assignDriverToOrder(orderId, Number(vehicleId));
      const driver = await storage.getVehicle(Number(vehicleId));
      const order = await storage.getOnlineOrder(orderId);
      // Notify driver
      if (driver?.driverPhone && driver.driverAccessToken && order) {
        try {
          await whatsappService.sendMessage(driver.driverPhone,
            `🛵 New delivery assignment!\nOrder #${order.orderNumber}\nCustomer: ${order.customerName}\nAddress: ${order.customerAddress || "Pickup"}\nOpen app: ${process.env.APP_URL || ""}/driver/${driver.driverAccessToken}`, (order as any).tenantId || undefined);
        } catch (_) {}
      }
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.put("/api/delivery/manage/orders/:id/status", async (req: Request, res: Response) => {
    try {
      const { status } = req.body;
      if (!status) return res.status(400).json({ error: "status required" });
      if (!ORDER_STATUSES.has(String(status))) return res.status(400).json({ error: "Invalid status", code: "INVALID_STATUS" });
      const orderId = Number(req.params.id);
      await storage.updateOnlineOrder(orderId, { status });
      const order = await storage.getOnlineOrder(orderId);
      if (order?.driverId && TERMINAL_ORDER_STATUSES.has(String(status))) {
        try { await storage.releaseDriverFromOrder(Number(order.driverId), orderId); } catch { /* non-fatal */ }
      }
      // WhatsApp to the customer from the store's own number, with the whole
      // order (statuses without a template are skipped).
      if (order?.customerPhone && order.tenantId) {
        try {
          await whatsappService.orderStatusChanged(order as any, status, order.tenantId);
        } catch (_) {}
      }
      if (order?.tenantId) {
        callerIdService.broadcast({ type: "delivery_status_change", orderId, status }, order.tenantId);
      }
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Take the driver off an order (wrong driver picked, order goes back to the pool).
  app.put("/api/delivery/manage/orders/:id/unassign", async (req: Request, res: Response) => {
    try {
      const orderId = Number(req.params.id);
      const order: any = await storage.getOnlineOrder(orderId);
      if (!order) return res.status(404).json({ error: "Order not found" });
      const previous = order.driverId ? Number(order.driverId) : null;
      await storage.updateOnlineOrder(orderId, { driverId: null } as any);
      if (previous) await storage.releaseDriverFromOrder(previous, orderId);
      if (order.tenantId) callerIdService.broadcast({ type: "delivery_status_change", orderId, status: order.status, vehicleId: null }, Number(order.tenantId));
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/delivery/manage/drivers", async (req: Request, res: Response) => {
    try {
      const tid = (req as any).tenantId;
      const drivers = await storage.getActiveDrivers(tid);
      res.json(drivers);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/delivery/manage/stats", async (req: Request, res: Response) => {
    try {
      const tid = (req as any).tenantId;
      const stats = await storage.getDeliveryStats(tid);
      res.json(stats);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ── Delivery Zone Management ──────────────────────────────────────────────

  app.get("/api/delivery/manage/zones", async (req: Request, res: Response) => {
    try {
      const tid = (req as any).tenantId;
      res.json(await storage.getDeliveryZones(tid));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/delivery/manage/zones", async (req: Request, res: Response) => {
    try {
      const tid = (req as any).tenantId;
      if (!tid) return res.status(400).json({ error: "tenantId is required" });
      const { id: _id, createdAt: _c, ...body } = req.body || {};
      const zone = await storage.createDeliveryZone({ ...body, tenantId: tid });
      res.status(201).json(zone);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.put("/api/delivery/manage/zones/:id", async (req: Request, res: Response) => {
    try {
      const { id: _id, createdAt: _c, ...body } = withoutTenant(req.body || {});
      const zone = await storage.updateDeliveryZone(Number(req.params.id), body);
      res.json(zone);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete("/api/delivery/manage/zones/:id", async (req: Request, res: Response) => {
    try {
      await storage.deleteDeliveryZone(Number(req.params.id));
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ── Promo Code Management ─────────────────────────────────────────────────

  app.get("/api/delivery/promos", async (req: Request, res: Response) => {
    try {
      const tid = (req as any).tenantId;
      res.json(await storage.getPromoCodes(tid));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/delivery/promos", async (req: Request, res: Response) => {
    try {
      const tid = (req as any).tenantId;
      if (!tid) return res.status(400).json({ error: "tenantId is required" });
      const parsed = promoFields(req.body || {}, true);
      if ("error" in parsed) return res.status(400).json({ error: parsed.error, code: parsed.code });
      const promo = await storage.createPromoCode({ ...parsed.data, tenantId: tid } as any);
      res.status(201).json(promo);
    } catch (e: any) { promoWriteError(res, e); }
  });

  app.put("/api/delivery/promos/:id", async (req: Request, res: Response) => {
    try {
      const parsed = promoFields(req.body || {}, false);
      if ("error" in parsed) return res.status(400).json({ error: parsed.error, code: parsed.code });
      if (!Object.keys(parsed.data).length) return res.status(400).json({ error: "Nothing to update", code: "NO_FIELDS" });
      const promo = await storage.updatePromoCode(Number(req.params.id), parsed.data as any);
      res.json(promo);
    } catch (e: any) { promoWriteError(res, e); }
  });

  app.delete("/api/delivery/promos/:id", async (req: Request, res: Response) => {
    try {
      await storage.deletePromoCode(Number(req.params.id));
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ── Loyalty & Wallet ──────────────────────────────────────────────────────

  app.get("/api/delivery/loyalty/:customerId", async (req: Request, res: Response) => {
    try {
      const customerId = Number(req.params.customerId);
      const [customer, transactions] = await Promise.all([
        storage.getCustomer(customerId),
        storage.getLoyaltyTransactions(customerId),
      ]);
      if (!customer) return res.status(404).json({ error: "Customer not found" });
      res.json({ points: customer.loyaltyPoints, tier: customer.loyaltyTier, transactions });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/delivery/loyalty/redeem", async (req: Request, res: Response) => {
    try {
      const customer = await getAuthenticatedCustomer(req.headers.authorization);
      if (!customer) return res.status(401).json({ error: "Not authenticated" });
      // Validation only: the points are taken when the order is placed
      // (POST /api/delivery/orders with loyaltyPointsUsed). This used to
      // deduct them here, before (and even without) any order.
      const points = Math.floor(Number(req.body?.points) || 0);
      const tenantId = Number(req.body?.tenantId) || customer.tenantId!;
      const refusal = await checkLoyaltyRedemption(customer.id, tenantId, points);
      if (refusal) return res.json({ success: false, discountAmount: 0, error: refusal });
      const cfg = await getLoyaltyConfig(tenantId);
      res.json({ success: true, discountAmount: roundMoney(points * cfg.redemptionRate, await storeCurrency(tenantId)), deferred: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/delivery/wallet/:customerId", async (req: Request, res: Response) => {
    try {
      const customerId = Number(req.params.customerId);
      const [customer, transactions] = await Promise.all([
        storage.getCustomer(customerId),
        storage.getWalletTransactions(customerId),
      ]);
      if (!customer) return res.status(404).json({ error: "Customer not found" });
      res.json({ balance: customer.walletBalance, transactions });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/delivery/wallet/topup", async (req: Request, res: Response) => {
    try {
      const customer = await getAuthenticatedCustomer(req.headers.authorization);
      if (!customer) return res.status(401).json({ error: "Not authenticated" });
      // Disabled: it charged in CHF whatever the store's currency and the
      // payment never reached the wallet (wrong metadata for the webhook).
      // Top-ups go through POST /api/payments/wallet/topup.
      return res.status(410).json({
        error: "شحن المحفظة غير متاح حالياً / Wallet top-up is not available at the moment",
        code: "WALLET_TOPUP_DISABLED",
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/delivery/referral/:code", async (req: Request, res: Response) => {
    try {
      const customer = await storage.getCustomerByReferralCode(req.params.code);
      if (!customer) return res.status(404).json({ error: "Referral code not found" });
      res.json({ valid: true, referrerName: customer.name });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ── Order Status SSE Stream (delivery customer app) ──────────────────────
  // Clients subscribe to live status changes for a specific order by token

  app.get("/api/delivery/orders/:idOrToken/status-stream", (req, res) => {
    const idOrToken = req.params.idOrToken;
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    // Keep-alive heartbeat every 25s
    const heartbeat = setInterval(() => {
      try { res.write(": heartbeat\n\n"); } catch (_) {}
    }, 25000);

    // Listen on the existing orderSseClients map that already exists for /api/online-orders/:id/status-stream
    // We reuse the same broadcast mechanism by looking up orderId
    const resolveAndListen = async () => {
      try {
        let orderId: number;
        if (/^\d+$/.test(idOrToken)) {
          // A numeric id also needs the order's tracking token (?token=).
          const byId: any = await storage.getOnlineOrder(Number(idOrToken)).catch(() => null);
          const token = String(req.query.token || req.query.trackingToken || "");
          if (!byId || !byId.trackingToken || token !== byId.trackingToken) {
            res.write(`data: ${JSON.stringify({ type: "error", error: "Order not found" })}\n\n`);
            clearInterval(heartbeat);
            res.end();
            return;
          }
          orderId = byId.id;
        } else {
          const order = await storage.getOnlineOrderByTrackingToken(idOrToken);
          if (!order) {
            res.write(`data: ${JSON.stringify({ type: "error", error: "Order not found" })}\n\n`);
            clearInterval(heartbeat);
            res.end();
            return;
          }
          orderId = order.id;
          // Send initial status
          res.write(`data: ${JSON.stringify({ type: "status_update", order: { id: order.id, status: order.status, orderNumber: order.orderNumber } })}\n\n`);
        }

        // Register client in existing SSE client map
        if (!(app as any)._orderSseClients) {
          (app as any)._orderSseClients = new Map<number, Set<any>>();
        }
        const sseMap: Map<number, Set<any>> = (app as any)._orderSseClients;
        if (!sseMap.has(orderId)) sseMap.set(orderId, new Set());
        sseMap.get(orderId)!.add(res);

        req.on("close", () => {
          clearInterval(heartbeat);
          sseMap.get(orderId)?.delete(res);
          if (sseMap.get(orderId)?.size === 0) sseMap.delete(orderId);
        });
      } catch (err) {
        clearInterval(heartbeat);
        res.end();
      }
    };
    resolveAndListen();
  });

  // Wire up broadcaster to delivery SSE clients (called from broadcastOrderStatus)
  if (!(app as any)._broadcastDeliveryStatus) {
    (app as any)._broadcastDeliveryStatus = (orderId: number, payload: object) => {
      const sseMap: Map<number, Set<any>> | undefined = (app as any)._orderSseClients;
      if (!sseMap) return;
      const clients = sseMap.get(orderId);
      if (!clients) return;
      const msg = `data: ${JSON.stringify(payload)}\n\n`;
      clients.forEach(client => {
        try { client.write(msg); } catch (_) { clients.delete(client); }
      });
    };
  }

  // ── Reorder ───────────────────────────────────────────────────────────────

  app.post("/api/delivery/orders/:id/reorder", async (req: Request, res: Response) => {
    try {
      const orderId = Number(req.params.id);
      const originalOrder = await storage.getOnlineOrder(orderId);
      if (!originalOrder) return res.status(404).json({ error: "Order not found" });
      // Anyone could duplicate any store's order by guessing its id. Only the
      // logged-in customer who placed it may reorder it.
      const customer = await getAuthenticatedCustomer(req.headers.authorization);
      const token = String(req.body?.trackingToken || req.query.token || "");
      const byToken = !!originalOrder.trackingToken && token === originalOrder.trackingToken;
      const byCustomer = !!customer && customer.tenantId === originalOrder.tenantId && !!customer.phone
        && canonicalPhone(customer.phone) === canonicalPhone(originalOrder.customerPhone);
      if (!byToken && !byCustomer) {
        return res.status(404).json({ error: "Order not found" });
      }
      // Today's prices, not the old order's.
      let repriced;
      try {
        repriced = await repriceOrder({
          tenantId: originalOrder.tenantId,
          items: (originalOrder.items as any[]) || [],
          clientDeliveryFee: originalOrder.deliveryFee,
          orderType: (originalOrder as any).orderType || "delivery",
        });
      } catch (e: any) {
        if (e instanceof PricingError) return res.status(400).json({ error: e.message });
        throw e;
      }

      const trackingToken = generateTrackingToken();
      const orderNumber = `DEL-${Date.now()}`;

      const newOrder = await storage.createOnlineOrder({
        tenantId: originalOrder.tenantId,
        orderNumber,
        customerName: originalOrder.customerName,
        customerPhone: originalOrder.customerPhone,
        customerEmail: originalOrder.customerEmail ?? null,
        customerAddress: originalOrder.customerAddress ?? null,
        items: repriced.items as any,
        subtotal: repriced.subtotal.toFixed(2),
        taxAmount: "0",
        deliveryFee: repriced.deliveryFee.toFixed(2),
        totalAmount: repriced.totalAmount.toFixed(2),
        paymentMethod: originalOrder.paymentMethod || "cash",
        paymentStatus: "pending",
        status: "pending",
        orderType: (originalOrder as any).orderType || "delivery",
        notes: originalOrder.notes ?? null,
        estimatedTime: 35,
        language: originalOrder.language || "en",
        trackingToken,
        sourceChannel: "web",
      } as any);

      // Notify store
      try {
        callerIdService.broadcast({
          type: "new_online_order",
          order: { id: newOrder.id, orderNumber, customerName: originalOrder.customerName, totalAmount: repriced.totalAmount.toFixed(2), orderType: (originalOrder as any).orderType }
        }, originalOrder.tenantId);
      } catch (_) {}

      res.status(201).json({ success: true, orderId: newOrder.id, orderNumber, trackingToken });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ── Favorites ──────────────────────────────────────────────────────────────

  app.get("/api/delivery/favorites", async (req: Request, res: Response) => {
    try {
      const customer = await getAuthenticatedCustomer(req.headers.authorization);
      if (!customer) return res.status(401).json({ error: "Not authenticated" });
      const { db } = await import("./db");
      const { customerFavorites, products } = await import("@shared/schema");
      const { eq, and } = await import("drizzle-orm");
      const favs = await db.select({
        id: customerFavorites.id,
        productId: customerFavorites.productId,
        createdAt: customerFavorites.createdAt,
        productName: products.name,
        productNameAr: products.nameAr,
        productPrice: products.price,
        productImage: products.image,
        productDescription: products.description,
      })
        .from(customerFavorites)
        .innerJoin(products, eq(products.id, customerFavorites.productId))
        .where(and(eq(customerFavorites.customerId, customer.id), eq(customerFavorites.tenantId, customer.tenantId!)));
      res.json(favs);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/delivery/favorites", async (req: Request, res: Response) => {
    try {
      const customer = await getAuthenticatedCustomer(req.headers.authorization);
      if (!customer) return res.status(401).json({ error: "Not authenticated" });
      const { productId } = req.body;
      if (!productId) return res.status(400).json({ error: "productId required" });
      const { db } = await import("./db");
      const { customerFavorites } = await import("@shared/schema");
      const [fav] = await db.insert(customerFavorites).values({
        tenantId: customer.tenantId!,
        customerId: customer.id,
        productId: Number(productId),
      }).$returningId();
      res.status(201).json({ id: fav.id, productId: Number(productId) });
    } catch (e: any) {
      if (e.code === "ER_DUP_ENTRY") return res.status(409).json({ error: "Already in favorites" });
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/delivery/favorites/:id", async (req: Request, res: Response) => {
    try {
      const customer = await getAuthenticatedCustomer(req.headers.authorization);
      if (!customer) return res.status(401).json({ error: "Not authenticated" });
      const { db } = await import("./db");
      const { customerFavorites } = await import("@shared/schema");
      const { eq, and } = await import("drizzle-orm");
      await db.delete(customerFavorites).where(
        and(eq(customerFavorites.id, Number(req.params.id)), eq(customerFavorites.customerId, customer.id))
      );
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ── Product Search ────────────────────────────────────────────────────────

  app.get("/api/delivery/search", async (req: Request, res: Response) => {
    try {
      const q = (req.query.q as string || "").trim();
      const tenantId = Number(req.query.tenantId);
      if (!tenantId) return res.status(400).json({ error: "tenantId required" });
      if (!q) return res.json([]);
      const { db } = await import("./db");
      const { products, categories } = await import("@shared/schema");
      const { eq, and, or, like, sql } = await import("drizzle-orm");
      const pattern = `%${q}%`;
      const results = await db.select({
        id: products.id,
        name: products.name,
        nameAr: products.nameAr,
        description: products.description,
        price: products.price,
        image: products.image,
        categoryId: products.categoryId,
        categoryName: categories.name,
      })
        .from(products)
        .leftJoin(categories, eq(categories.id, products.categoryId))
        .where(and(
          eq(products.tenantId, tenantId),
          eq(products.isActive, true),
          or(
            like(products.name, pattern),
            like(products.nameAr, pattern),
            like(products.description, pattern),
          ),
        ))
        .limit(50);
      res.json(results);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ── Help / FAQ / Tickets ──────────────────────────────────────────────────

  app.get("/api/delivery/help/faq", async (req: Request, res: Response) => {
    try {
      const tenantId = Number(req.query.tenantId);
      if (!tenantId) return res.status(400).json({ error: "tenantId required" });
      const { db } = await import("./db");
      const { faqEntries } = await import("@shared/schema");
      const { eq, and, asc } = await import("drizzle-orm");
      const faqs = await db.select().from(faqEntries)
        .where(and(eq(faqEntries.tenantId, tenantId), eq(faqEntries.isActive, true)))
        .orderBy(asc(faqEntries.sortOrder));
      res.json(faqs);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/delivery/help/ticket", async (req: Request, res: Response) => {
    try {
      const { subject, message, orderId, tenantId } = req.body;
      if (!subject || !message || !tenantId) return res.status(400).json({ error: "subject, message, tenantId required" });
      const customer = await getAuthenticatedCustomer(req.headers.authorization).catch(() => null);
      const { db } = await import("./db");
      const { helpTickets } = await import("@shared/schema");
      const [ticket] = await db.insert(helpTickets).values({
        tenantId: Number(tenantId),
        customerId: customer?.id ?? null,
        orderId: orderId ? Number(orderId) : null,
        subject,
        message,
        status: "open",
        priority: "normal",
      }).$returningId();
      res.status(201).json({ id: ticket.id, status: "open" });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/delivery/help/tickets", async (req: Request, res: Response) => {
    try {
      const customer = await getAuthenticatedCustomer(req.headers.authorization);
      if (!customer) return res.status(401).json({ error: "Not authenticated" });
      const { db } = await import("./db");
      const { helpTickets } = await import("@shared/schema");
      const { eq, and, desc } = await import("drizzle-orm");
      const tickets = await db.select().from(helpTickets)
        .where(and(eq(helpTickets.customerId, customer.id), eq(helpTickets.tenantId, customer.tenantId!)))
        .orderBy(desc(helpTickets.createdAt));
      res.json(tickets);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ── Recently Ordered ─────────────────────────────────────────────────────

  app.get("/api/delivery/recently-ordered", async (req: Request, res: Response) => {
    try {
      const customer = await getAuthenticatedCustomer(req.headers.authorization);
      if (!customer) return res.status(401).json({ error: "Not authenticated" });
      const { db } = await import("./db");
      const { onlineOrders, products } = await import("@shared/schema");
      const { eq, and, desc } = await import("drizzle-orm");
      // Get the last 20 orders for this customer
      const orders = await db.select({ items: onlineOrders.items })
        .from(onlineOrders)
        .where(and(
          eq(onlineOrders.customerPhone, customer.phone!),
          eq(onlineOrders.tenantId, customer.tenantId!),
        ))
        .orderBy(desc(onlineOrders.createdAt))
        .limit(20);
      // Extract unique product IDs from order items
      const seenIds = new Set<number>();
      const recentItems: { productId: number; name: string; quantity: number; unitPrice: number }[] = [];
      for (const order of orders) {
        const items = (order.items || []) as { productId: number; name: string; quantity: number; unitPrice: number }[];
        for (const item of items) {
          if (item.productId && !seenIds.has(item.productId)) {
            seenIds.add(item.productId);
            recentItems.push({ productId: item.productId, name: item.name, quantity: item.quantity, unitPrice: item.unitPrice });
          }
        }
      }
      // Enrich with current product data
      const enriched = [];
      for (const item of recentItems.slice(0, 20)) {
        const [product] = await db.select({ id: products.id, name: products.name, nameAr: products.nameAr, price: products.price, image: products.image, isActive: products.isActive })
          .from(products)
          .where(eq(products.id, item.productId))
          .limit(1);
        enriched.push({
          productId: item.productId,
          name: product?.name || item.name,
          nameAr: product?.nameAr || null,
          price: product?.price || String(item.unitPrice),
          image: product?.image || null,
          isActive: product?.isActive ?? true,
          lastOrderedQuantity: item.quantity,
        });
      }
      res.json(enriched);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ── Sitemap ───────────────────────────────────────────────────────────────

  app.get("/api/delivery/sitemap.xml", async (_req: Request, res: Response) => {
    try {
      const configs = await storage.getAllLandingPageConfigs();
      const baseUrl = process.env.APP_URL || "https://kassenta.com";
      let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
      xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
      for (const config of (configs || [])) {
        if (!config.slug) continue;
        xml += `  <url>\n`;
        xml += `    <loc>${baseUrl}/order/${config.slug}</loc>\n`;
        xml += `    <changefreq>daily</changefreq>\n`;
        xml += `    <priority>0.8</priority>\n`;
        xml += `  </url>\n`;
      }
      xml += `</urlset>`;
      res.set("Content-Type", "application/xml");
      res.send(xml);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ── Order Ratings (POS view) ──────────────────────────────────────────────

  app.get("/api/delivery/order-ratings", async (req: Request, res: Response) => {
    try {
      const tid = (req as any).tenantId;
      const ratings = await storage.getOrderRatings(tid);
      res.json(ratings);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ── Store Reviews (public) ──────────────────────────────────────────────

  app.get("/api/delivery/store/:slug/reviews", async (req: Request, res: Response) => {
    try {
      const slug = req.params.slug;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

      // Find tenant by slug using resolveSlugConfig
      const config = await resolveSlugConfig(slug);
      const tenant = config ? await storage.getTenant(config.tenantId).catch(() => null) : null;
      if (!tenant) {
        return res.json({ reviews: [], summary: { avgRating: 0, totalReviews: 0, distribution: {} } });
      }

      const ratings = await storage.getOrderRatings(tenant.id);
      const total = ratings.length;

      // Calculate summary
      const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      let sum = 0;
      for (const r of ratings) {
        const star = Math.round(r.overallRating || r.foodRating || 0);
        if (star >= 1 && star <= 5) distribution[star]++;
        sum += (r.overallRating || r.foodRating || 0);
      }
      const avgRating = total > 0 ? sum / total : 0;

      // Paginate
      const offset = (page - 1) * limit;
      const pagedRatings = ratings.slice(offset, offset + limit);

      const reviews = pagedRatings.map((r: any) => ({
        id: r.id,
        rating: r.overallRating || r.foodRating || 0,
        comment: r.comment || "",
        customerName: r.customerName || "Customer",
        createdAt: r.createdAt,
        orderItems: r.orderItems || "",
      }));

      res.json({
        reviews,
        summary: { avgRating: Math.round(avgRating * 10) / 10, totalReviews: total, distribution },
        page,
        limit,
        hasMore: offset + limit < total,
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ── Recommendations (public) ────────────────────────────────────────────

  const _recoCache = new Map<string, { data: any; ts: number }>();
  const RECO_TTL = 5 * 60 * 1000; // 5 minutes

  app.get("/api/delivery/recommendations", async (req: Request, res: Response) => {
    try {
      const tid = parseInt(req.query.tenantId as string) || (req as any).tenantId;
      if (!tid) return res.json({ popular: [], recentlyOrdered: [] });

      const cacheKey = `reco_${tid}`;
      const cached = _recoCache.get(cacheKey);
      if (cached && Date.now() - cached.ts < RECO_TTL) {
        return res.json(cached.data);
      }

      // Popular items by most ordered (approximated by products sorted by salesCount/price)
      const products = await storage.getProductsByTenant(tid);
      const popular = products
        .filter((p: any) => p.isActive !== false && parseFloat(p.price || "0") > 0)
        .sort((a: any, b: any) => (b.salesCount || 0) - (a.salesCount || 0))
        .slice(0, 10)
        .map((p: any) => ({
          id: p.id,
          name: p.name,
          nameAr: p.nameAr,
          price: p.price,
          imageUrl: p.imageUrl,
          categoryId: p.categoryId,
        }));

      const result = { popular, recentlyOrdered: [] };
      _recoCache.set(cacheKey, { data: result, ts: Date.now() });
      res.json(result);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ── robots.txt ──────────────────────────────────────────────────────────

  app.get("/api/robots.txt", (_req: Request, res: Response) => {
    res.type("text/plain").send(
      `User-agent: *\nAllow: /api/order/\nAllow: /api/restaurants\nDisallow: /api/delivery/\nSitemap: https://kassenta.com/api/delivery/sitemap.xml\n`
    );
  });

  // ═══════════════════════════════════════════════════════════════════════════

  const httpServer = createServer(app);

  // Auto-seeding removed – only Pizza Lemon is seeded from index.ts

  return httpServer;
}
