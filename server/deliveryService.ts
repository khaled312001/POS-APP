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
import { db } from "./db";
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

export async function getLoyaltyConfig(
  tenantId: number
): Promise<{ pointsPerUnit: number; redemptionRate: number }> {
  const [config] = await db
    .select({
      loyaltyPointsPerUnit: landingPageConfig.loyaltyPointsPerUnit,
      loyaltyRedemptionRate: landingPageConfig.loyaltyRedemptionRate,
    })
    .from(landingPageConfig)
    .where(eq(landingPageConfig.tenantId, tenantId))
    .limit(1);

  return {
    pointsPerUnit: parseFloat((config?.loyaltyPointsPerUnit as string) ?? "1"),
    redemptionRate: parseFloat((config?.loyaltyRedemptionRate as string) ?? "0.01"),
  };
}

export function calculateLoyaltyTier(points: number): string {
  if (points >= 5000) return "platinum";
  if (points >= 2000) return "gold";
  if (points >= 500) return "silver";
  return "bronze";
}

export async function awardLoyaltyPoints(
  customerId: number,
  tenantId: number,
  orderId: number,
  orderTotal: number
): Promise<number> {
  const config = await getLoyaltyConfig(tenantId);
  const pointsToAdd = Math.floor(orderTotal * config.pointsPerUnit);

  if (pointsToAdd <= 0) return 0;

  const [customer] = await db
    .select({ loyaltyPoints: customers.loyaltyPoints })
    .from(customers)
    .where(eq(customers.id, customerId))
    .limit(1);

  const before = customer?.loyaltyPoints ?? 0;
  const after = before + pointsToAdd;
  const newTier = calculateLoyaltyTier(after);

  await db
    .update(customers)
    .set({ loyaltyPoints: after, loyaltyTier: newTier })
    .where(eq(customers.id, customerId));

  await db.insert(loyaltyTransactions).values({
    customerId,
    tenantId,
    orderId,
    type: "earn",
    points: pointsToAdd,
    balanceBefore: before,
    balanceAfter: after,
    description: `Earned from order #${orderId}`,
  });

  return pointsToAdd;
}

export async function redeemLoyaltyPoints(
  customerId: number,
  tenantId: number,
  pointsToRedeem: number
): Promise<{ success: boolean; discountAmount: number; error?: string }> {
  const config = await getLoyaltyConfig(tenantId);

  const [customer] = await db
    .select({ loyaltyPoints: customers.loyaltyPoints })
    .from(customers)
    .where(eq(customers.id, customerId))
    .limit(1);

  const available = customer?.loyaltyPoints ?? 0;
  if (pointsToRedeem > available)
    return { success: false, discountAmount: 0, error: "Insufficient loyalty points" };

  const discountAmount = Math.round(pointsToRedeem * config.redemptionRate * 100) / 100;
  const after = available - pointsToRedeem;
  const newTier = calculateLoyaltyTier(after);

  await db
    .update(customers)
    .set({ loyaltyPoints: after, loyaltyTier: newTier })
    .where(eq(customers.id, customerId));

  await db.insert(loyaltyTransactions).values({
    customerId,
    tenantId,
    type: "redeem",
    points: -pointsToRedeem,
    balanceBefore: available,
    balanceAfter: after,
    description: `Redeemed ${pointsToRedeem} points for ${discountAmount} discount`,
  });

  return { success: true, discountAmount };
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
