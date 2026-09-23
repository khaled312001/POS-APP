/**
 * deliveryService.ts
 * Business logic for the delivery platform:
 *  - Delivery zone matching & fee calculation
 *  - Promo code validation & application
 *  - Loyalty points calculation and redemption
 *  - Driver assignment helpers
 *  - Tracking token generation
 */

import crypto from "crypto";
import { db, pool } from "./db";
import {
  deliveryZones,
  promoCodes,
  promoCodeUsages,
  loyaltyTransactions,
  walletTransactions,
  vehicles,
  onlineOrders,
  customers,
  landingPageConfig,
} from "../shared/schema";
import { eq, and, lte, gte, or, isNull, sql } from "drizzle-orm";
import type {
  DeliveryZone,
  PromoCode,
  Customer,
  LandingPageConfig,
} from "../shared/schema";

// ── Tracking token ────────────────────────────────────────────────────────────

export function generateTrackingToken(): string {
  return crypto.randomBytes(20).toString("hex");
}

// ── Delivery zone helpers ─────────────────────────────────────────────────────

/** Haversine distance in km between two lat/lng points */
function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Point-in-polygon test using ray-casting algorithm */
function pointInPolygon(
  lat: number,
  lng: number,
  polygon: { lat: number; lng: number }[]
): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng,
      yi = polygon[i].lat;
    const xj = polygon[j].lng,
      yj = polygon[j].lat;
    const intersect =
      yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export async function getDeliveryZoneForLocation(
  tenantId: number,
  customerLat: number,
  customerLng: number
): Promise<DeliveryZone | null> {
  const zones = await db
    .select()
    .from(deliveryZones)
    .where(and(eq(deliveryZones.tenantId, tenantId), eq(deliveryZones.isActive, true)))
    .orderBy(deliveryZones.sortOrder);

  for (const zone of zones) {
    // Polygon-based check
    if (zone.polygon && (zone.polygon as any[]).length > 2) {
      if (pointInPolygon(customerLat, customerLng, zone.polygon as any)) {
        return zone;
      }
    } else if (zone.centerLat && zone.centerLng && zone.radiusKm) {
      const dist = haversineKm(
        customerLat,
        customerLng,
        parseFloat(zone.centerLat as string),
        parseFloat(zone.centerLng as string)
      );
      if (dist <= parseFloat(zone.radiusKm as string)) {
        return zone;
      }
    }
  }

  return null;
}

export async function getDeliveryZones(tenantId: number): Promise<DeliveryZone[]> {
  return db
    .select()
    .from(deliveryZones)
    .where(and(eq(deliveryZones.tenantId, tenantId), eq(deliveryZones.isActive, true)))
    .orderBy(deliveryZones.sortOrder);
}

// ── Promo code ────────────────────────────────────────────────────────────────

export interface PromoValidationResult {
  valid: boolean;
  error?: string;
  discountAmount?: number;
  discountType?: string;
  promoCode?: PromoCode;
}

export async function validatePromoCode(
  tenantId: number,
  code: string,
  orderTotal: number,
  orderType: string,
  customerId?: number
): Promise<PromoValidationResult> {
  const now = new Date();

  const [promo] = await db
    .select()
    .from(promoCodes)
    .where(
      and(
        eq(promoCodes.tenantId, tenantId),
        eq(promoCodes.code, code.toUpperCase()),
        eq(promoCodes.isActive, true)
      )
    )
    .limit(1);

  if (!promo) return { valid: false, error: "Invalid promo code" };

  if (promo.validFrom && new Date(promo.validFrom) > now)
    return { valid: false, error: "Promo code is not active yet" };

  if (promo.validUntil && new Date(promo.validUntil) < now)
    return { valid: false, error: "Promo code has expired" };

  if (
    promo.usageLimit !== null &&
    promo.usageLimit !== undefined &&
    (promo.usageCount ?? 0) >= promo.usageLimit
  )
    return { valid: false, error: "Promo code usage limit reached" };

  const minAmount = parseFloat((promo.minOrderAmount as string) ?? "0");
  if (orderTotal < minAmount)
    return {
      valid: false,
      error: `Minimum order amount is ${minAmount} to use this code`,
    };

  const types = (promo.applicableOrderTypes as string[]) ?? ["delivery", "pickup"];
  if (!types.includes(orderType))
    return { valid: false, error: "Promo code not applicable for this order type" };

  // Per-customer limit check
  if (customerId && promo.perCustomerLimit) {
    const [usageCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(promoCodeUsages)
      .where(
        and(
          eq(promoCodeUsages.promoCodeId, promo.id),
          eq(promoCodeUsages.customerId, customerId)
        )
      );

    if ((usageCount?.count ?? 0) >= promo.perCustomerLimit)
      return { valid: false, error: "You have already used this promo code" };
  }

  // Calculate discount
  let discountAmount = 0;
  const value = parseFloat(promo.discountValue as string);

  if (promo.discountType === "percent") {
    discountAmount = (orderTotal * value) / 100;
    if (promo.maxDiscountCap) {
      discountAmount = Math.min(discountAmount, parseFloat(promo.maxDiscountCap as string));
    }
  } else if (promo.discountType === "fixed") {
    discountAmount = Math.min(value, orderTotal);
  } else if (promo.discountType === "free_delivery") {
    discountAmount = 0; // handled separately in order creation
  }

  return {
    valid: true,
    discountAmount: Math.round(discountAmount * 100) / 100,
    discountType: promo.discountType,
    promoCode: promo,
  };
}

export async function recordPromoUsage(
  promoCodeId: number,
  customerId: number | undefined,
  orderId: number,
  discountApplied: number
): Promise<void> {
  await db.insert(promoCodeUsages).values({
    promoCodeId,
    customerId: customerId ?? null,
    orderId,
    discountApplied: discountApplied.toFixed(2),
  });

  await db
    .update(promoCodes)
    .set({ usageCount: sql`usage_count + 1` })
    .where(eq(promoCodes.id, promoCodeId));
}

// ── Loyalty points ────────────────────────────────────────────────────────────

/**
 * The store's loyalty programme, edited in POS Settings → Loyalty. One setting
 * drives both the till (POST /api/sales) and the online store.
 */
export interface LoyaltyConfig {
  enabled: boolean;
  pointsPerUnit: number; // points earned per 1 unit of the store currency
  redemptionRate: number; // currency value of 1 point when redeemed
  minRedeemPoints: number; // smallest balance that may be redeemed
}

export async function getLoyaltyConfig(tenantId: number): Promise<LoyaltyConfig> {
  const [config] = await db
    .select({
      enableLoyalty: landingPageConfig.enableLoyalty,
      loyaltyPointsPerUnit: landingPageConfig.loyaltyPointsPerUnit,
      loyaltyRedemptionRate: landingPageConfig.loyaltyRedemptionRate,
      loyaltyMinRedeemPoints: landingPageConfig.loyaltyMinRedeemPoints,
    })
    .from(landingPageConfig)
    .where(eq(landingPageConfig.tenantId, tenantId))
    .limit(1);

  const num = (v: unknown, fallback: number) => {
    const n = parseFloat(String(v ?? ""));
    return Number.isFinite(n) && n >= 0 ? n : fallback;
  };
  return {
    enabled: config?.enableLoyalty !== false,
    pointsPerUnit: num(config?.loyaltyPointsPerUnit, 1),
    redemptionRate: num(config?.loyaltyRedemptionRate, 0.01),
    minRedeemPoints: Math.floor(num(config?.loyaltyMinRedeemPoints, 0)),
  };
}

/**
 * Widens the loyalty columns (the original decimal(5,2) could not hold
 * "1 point per 1,000 SYP") and adds the minimum-redeem column. Idempotent;
 * runs on boot and never aborts startup.
 */
export async function runLoyaltyMigrations(): Promise<void> {
  const run = async (label: string, statement: string) => {
    try {
      await db.execute(sql.raw(statement));
    } catch (e: any) {
      const msg = String(e?.message || e);
      if (!/duplicate|already exists/i.test(msg)) console.log(`[loyalty-migration] ${label}: ${msg}`);
    }
  };
  await run(
    "loyalty_min_redeem_points",
    "ALTER TABLE landing_page_config ADD COLUMN IF NOT EXISTS loyalty_min_redeem_points int DEFAULT 0",
  );
  try {
    const [result] = await pool.query(
      `SELECT COLUMN_NAME AS name, NUMERIC_SCALE AS scale FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'landing_page_config'
          AND COLUMN_NAME IN ('loyalty_points_per_unit', 'loyalty_redemption_rate')`,
    );
    const rows: any[] = Array.isArray(result) ? (result as any[]) : [];
    const scaleOf = (name: string) => Number(rows.find((r) => r.name === name)?.scale ?? 99);
    if (scaleOf("loyalty_points_per_unit") < 6) {
      await run(
        "loyalty_points_per_unit",
        "ALTER TABLE landing_page_config MODIFY COLUMN loyalty_points_per_unit decimal(14,6) DEFAULT 1.000000",
      );
    }
    if (scaleOf("loyalty_redemption_rate") < 4) {
      await run(
        "loyalty_redemption_rate",
        "ALTER TABLE landing_page_config MODIFY COLUMN loyalty_redemption_rate decimal(14,4) DEFAULT 0.0100",
      );
    }
  } catch (e: any) {
    console.log("[loyalty-migration] column check:", e?.message || e);
  }
}

export function calculateLoyaltyTier(points: number): string {
  if (points >= 5000) return "platinum";
  if (points >= 2000) return "gold";
  if (points >= 500) return "silver";
  return "bronze";
}

/**
 * Adds (or, with a negative delta, removes) points and writes the ledger row.
 * orderId is an online_orders id; till sales leave it null and name the
 * receipt in the description instead.
 */
async function moveLoyaltyPoints(
  customerId: number,
  tenantId: number,
  delta: number,
  type: "earn" | "redeem",
  description: string,
  orderId: number | null = null
): Promise<{ before: number; after: number }> {
  const [customer] = await db
    .select({ loyaltyPoints: customers.loyaltyPoints })
    .from(customers)
    .where(eq(customers.id, customerId))
    .limit(1);

  const before = customer?.loyaltyPoints ?? 0;
  const after = Math.max(0, before + delta);
  const newTier = calculateLoyaltyTier(after);

  await db
    .update(customers)
    .set({ loyaltyPoints: after, loyaltyTier: newTier })
    .where(eq(customers.id, customerId));

  await db.insert(loyaltyTransactions).values({
    customerId,
    tenantId,
    orderId,
    type,
    points: after - before,
    balanceBefore: before,
    balanceAfter: after,
    description,
  });

  return { before, after };
}

/** Whole points earned on an amount; the epsilon absorbs float error (0.29 × 100 = 28.999…). */
export function pointsEarnedFor(amount: number, config: LoyaltyConfig): number {
  const raw = Math.max(0, Number(amount) || 0) * config.pointsPerUnit;
  return Math.floor(raw + 1e-6);
}

export async function awardLoyaltyPoints(
  customerId: number,
  tenantId: number,
  orderId: number,
  orderTotal: number
): Promise<number> {
  const config = await getLoyaltyConfig(tenantId);
  if (!config.enabled) return 0;
  const pointsToAdd = pointsEarnedFor(orderTotal, config);

  if (pointsToAdd <= 0) return 0;

  await moveLoyaltyPoints(customerId, tenantId, pointsToAdd, "earn", `Earned from order #${orderId}`, orderId);
  return pointsToAdd;
}

/** Why a redemption would be refused, or null when it may go ahead. */
export async function checkLoyaltyRedemption(
  customerId: number,
  tenantId: number,
  pointsToRedeem: number,
  config?: LoyaltyConfig
): Promise<string | null> {
  const cfg = config ?? (await getLoyaltyConfig(tenantId));
  if (!cfg.enabled) return "Loyalty programme is disabled";
  if (!Number.isInteger(pointsToRedeem) || pointsToRedeem <= 0) return "Invalid number of points";
  if (cfg.minRedeemPoints > 0 && pointsToRedeem < cfg.minRedeemPoints)
    return `At least ${cfg.minRedeemPoints} points are needed to redeem`;

  const [customer] = await db
    .select({ loyaltyPoints: customers.loyaltyPoints, tenantId: customers.tenantId })
    .from(customers)
    .where(eq(customers.id, customerId))
    .limit(1);
  if (!customer || (customer.tenantId != null && customer.tenantId !== tenantId)) return "Customer not found";
  if (pointsToRedeem > (customer.loyaltyPoints ?? 0)) return "Insufficient loyalty points";
  return null;
}

export async function redeemLoyaltyPoints(
  customerId: number,
  tenantId: number,
  pointsToRedeem: number
): Promise<{ success: boolean; discountAmount: number; error?: string }> {
  const config = await getLoyaltyConfig(tenantId);
  const refusal = await checkLoyaltyRedemption(customerId, tenantId, pointsToRedeem, config);
  if (refusal) return { success: false, discountAmount: 0, error: refusal };

  const discountAmount = Math.round(pointsToRedeem * config.redemptionRate * 100) / 100;
  await moveLoyaltyPoints(
    customerId, tenantId, -pointsToRedeem, "redeem",
    `Redeemed ${pointsToRedeem} points for ${discountAmount} discount`,
  );
  return { success: true, discountAmount };
}

/**
 * Loyalty for a till sale, applied after the sale row exists: first the points
 * the cashier redeemed at checkout (already validated with
 * checkLoyaltyRedemption and already taken off the total as a discount), then
 * the points earned on what the customer actually paid.
 */
export async function settlePosSaleLoyalty(opts: {
  customerId: number;
  tenantId: number;
  receiptNumber: string;
  amountPaid: number;
  redeemPoints: number;
}): Promise<{ earned: number; redeemed: number }> {
  const config = await getLoyaltyConfig(opts.tenantId);
  if (!config.enabled) return { earned: 0, redeemed: 0 };

  let redeemed = 0;
  if (opts.redeemPoints > 0) {
    const value = Math.round(opts.redeemPoints * config.redemptionRate * 100) / 100;
    await moveLoyaltyPoints(
      opts.customerId, opts.tenantId, -opts.redeemPoints, "redeem",
      `Redeemed ${opts.redeemPoints} points for ${value} discount on sale ${opts.receiptNumber}`,
    );
    redeemed = opts.redeemPoints;
  }

  const earned = pointsEarnedFor(opts.amountPaid, config);
  if (earned > 0) {
    await moveLoyaltyPoints(
      opts.customerId, opts.tenantId, earned, "earn",
      `Earned from sale ${opts.receiptNumber}`,
    );
  }
  return { earned, redeemed };
}

// ── Driver helpers ────────────────────────────────────────────────────────────

export async function getAvailableDrivers(tenantId: number) {
  return db
    .select()
    .from(vehicles)
    .where(
      and(
        eq(vehicles.tenantId, tenantId),
        eq(vehicles.isActive, true),
        eq(vehicles.driverStatus, "available")
      )
    );
}

export async function assignDriverToOrder(
  orderId: number,
  vehicleId: number
): Promise<void> {
  await db
    .update(onlineOrders)
    .set({ driverId: vehicleId })
    .where(eq(onlineOrders.id, orderId));

  await db
    .update(vehicles)
    .set({ driverStatus: "on_delivery", activeOrderId: orderId })
    .where(eq(vehicles.id, vehicleId));
}

export async function releaseDriver(vehicleId: number): Promise<void> {
  await db
    .update(vehicles)
    .set({ driverStatus: "available", activeOrderId: null })
    .where(eq(vehicles.id, vehicleId));
}

// ── Wallet helpers ────────────────────────────────────────────────────────────

export async function deductWallet(
  customerId: number,
  tenantId: number,
  amount: number,
  orderId?: number
): Promise<{ success: boolean; error?: string }> {
  const [customer] = await db
    .select({ walletBalance: customers.walletBalance })
    .from(customers)
    .where(eq(customers.id, customerId))
    .limit(1);

  const balance = parseFloat((customer?.walletBalance as string) ?? "0");
  if (amount > balance)
    return { success: false, error: "Insufficient wallet balance" };

  const after = Math.round((balance - amount) * 100) / 100;

  await db
    .update(customers)
    .set({ walletBalance: after.toFixed(2) })
    .where(eq(customers.id, customerId));

  await db.insert(walletTransactions).values({
    customerId,
    tenantId,
    orderId: orderId ?? null,
    type: "payment",
    amount: amount.toFixed(2),
    balanceBefore: balance.toFixed(2),
    balanceAfter: after.toFixed(2),
    description: orderId ? `Payment for order #${orderId}` : "Wallet payment",
  });

  return { success: true };
}

export async function creditWallet(
  customerId: number,
  tenantId: number,
  amount: number,
  type: "top_up" | "refund" | "bonus",
  stripePaymentIntentId?: string
): Promise<void> {
  const [customer] = await db
    .select({ walletBalance: customers.walletBalance })
    .from(customers)
    .where(eq(customers.id, customerId))
    .limit(1);

  const balance = parseFloat((customer?.walletBalance as string) ?? "0");
  const after = Math.round((balance + amount) * 100) / 100;

  await db
    .update(customers)
    .set({ walletBalance: after.toFixed(2) })
    .where(eq(customers.id, customerId));

  await db.insert(walletTransactions).values({
    customerId,
    tenantId,
    type,
    amount: amount.toFixed(2),
    balanceBefore: balance.toFixed(2),
    balanceAfter: after.toFixed(2),
    stripePaymentIntentId: stripePaymentIntentId ?? null,
    description: `Wallet ${type}`,
  });
}
