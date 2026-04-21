/**
 * Broadcast / Marketplace Order routes (drop-shipping style)
 *
 * Customer creates ONE broadcast order without picking a restaurant. All
 * active tenants see it in real-time via WebSocket. First tenant to accept
 * wins via atomic SQL update. On win, a normal `online_orders` row is
 * created for that tenant and the order flows through the existing POS UI.
 */
import type { Express, Request, Response } from "express";
import { randomBytes } from "crypto";
import { db } from "./db";
import { broadcastOrders, broadcastOrderRecipients, onlineOrders, tenants } from "@shared/schema";
import { eq, and, gt, sql, desc, inArray } from "drizzle-orm";
import { callerIdService } from "./callerIdService";
import { pushService } from "./pushService";

const BROADCAST_TTL_MINUTES = 5; // how long restaurants have to claim

function generateBroadcastToken(): string {
  return randomBytes(20).toString("hex");
}

function generateOrderNumber(tenantId: number): string {
  // Unique but simple — prefixed so it's identifiable as a broadcast-originated order
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = randomBytes(3).toString("hex").toUpperCase();
  return `BC-${tenantId}-${stamp}-${suffix}`;
}

export function registerBroadcastRoutes(app: Express) {
  // ── PUBLIC: Customer creates a broadcast order ────────────────────────────
  app.post("/api/delivery/broadcast", async (req: Request, res: Response) => {
    try {
      const {
        customerName,
        customerPhone,
        customerEmail,
        customerAddress,
        customerLat,
        customerLng,
        items,
        notes,
        estimatedTotal,
        paymentMethod,
      } = req.body || {};

      if (!customerName || !customerPhone) {
        return res.status(400).json({ error: "customerName and customerPhone are required" });
      }
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "items must be a non-empty array" });
      }

      const token = generateBroadcastToken();
      const expiresAt = new Date(Date.now() + BROADCAST_TTL_MINUTES * 60 * 1000);

      const [inserted] = (await db.insert(broadcastOrders).values({
        broadcastToken: token,
        customerName: String(customerName).slice(0, 200),
        customerPhone: String(customerPhone).slice(0, 40),
        customerEmail: customerEmail ? String(customerEmail).slice(0, 200) : null,
        customerAddress: customerAddress ? String(customerAddress).slice(0, 500) : null,
        customerLat: customerLat != null ? String(customerLat) : null,
        customerLng: customerLng != null ? String(customerLng) : null,
        items: items as any,
        notes: notes ? String(notes).slice(0, 2000) : null,
        estimatedTotal: estimatedTotal != null ? String(estimatedTotal) : "0",
        paymentMethod: paymentMethod === "card" ? "card" : "cash",
        status: "pending",
        expiresAt,
      } as any)) as any;

      // Drizzle MySQL insert returns metadata, not the row — fetch it
      const [row] = await db.select().from(broadcastOrders).where(eq(broadcastOrders.broadcastToken, token)).limit(1);

      // Broadcast WS event to ALL connected POS clients
      const payload = {
        type: "broadcast_new",
        id: row.id,
        token: row.broadcastToken,
        customerName: row.customerName,
        customerPhone: row.customerPhone,
        customerAddress: row.customerAddress,
        items: row.items,
        notes: row.notes,
        estimatedTotal: row.estimatedTotal,
        createdAt: row.createdAt,
        expiresAt: row.expiresAt,
      };
      try { callerIdService.broadcast(payload); } catch (_) {}

      // Also send web push so POS gets a banner even if the tab is backgrounded
      try { pushService.broadcast({ type: "broadcast_new", title: "🛵 New Broadcast Order", body: `${row.customerName} — CHF ${row.estimatedTotal || "?"}`, data: { id: row.id, token: row.broadcastToken } } as any); } catch (_) {}

      res.status(201).json({
        id: row.id,
        token: row.broadcastToken,
        status: row.status,
        expiresAt: row.expiresAt,
      });
    } catch (e: any) {
      console.error("[broadcast/create] error:", e);
      res.status(500).json({ error: e.message || "Failed to create broadcast order" });
    }
  });

  // ── PUBLIC: Customer checks status by token (polling fallback) ───────────
  app.get("/api/delivery/broadcast/:token", async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      const [row] = await db.select().from(broadcastOrders).where(eq(broadcastOrders.broadcastToken, token)).limit(1);
      if (!row) return res.status(404).json({ error: "Broadcast order not found" });

      let claimedByName: string | null = null;
      let trackingToken: string | null = null;
      let orderNumber: string | null = null;
      if (row.claimedByTenantId) {
        const [t] = await db.select({ businessName: tenants.businessName }).from(tenants).where(eq(tenants.id, row.claimedByTenantId)).limit(1);
        claimedByName = t?.businessName || null;
        if (row.onlineOrderId) {
          const [oo] = await db.select({ orderNumber: onlineOrders.orderNumber, trackingToken: onlineOrders.trackingToken, status: onlineOrders.status }).from(onlineOrders).where(eq(onlineOrders.id, row.onlineOrderId)).limit(1);
          orderNumber = oo?.orderNumber || null;
          trackingToken = oo?.trackingToken || null;
        }
      }
      res.json({
        id: row.id,
        token: row.broadcastToken,
        status: row.status,
        claimedByTenantId: row.claimedByTenantId,
        claimedByName,
        onlineOrderId: row.onlineOrderId,
        orderNumber,
        trackingToken,
        items: row.items,
        estimatedTotal: row.estimatedTotal,
        expiresAt: row.expiresAt,
        createdAt: row.createdAt,
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── PUBLIC: Customer cancels ─────────────────────────────────────────────
  app.post("/api/delivery/broadcast/:token/cancel", async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      // Only cancel if still pending (can't cancel after a restaurant claimed)
      const [row] = await db.select().from(broadcastOrders).where(eq(broadcastOrders.broadcastToken, token)).limit(1);
      if (!row) return res.status(404).json({ error: "Not found" });
      if (row.status !== "pending") return res.status(409).json({ error: "Already " + row.status });

      await db.update(broadcastOrders).set({
        status: "cancelled",
        cancelledReason: "customer_cancelled",
        updatedAt: new Date(),
      }).where(and(eq(broadcastOrders.id, row.id), eq(broadcastOrders.status, "pending")));

      try { callerIdService.broadcast({ type: "broadcast_cancelled", id: row.id, token: row.broadcastToken, reason: "customer_cancelled" }); } catch (_) {}
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── POS: list currently-pending broadcasts this tenant hasn't rejected ───
  app.get("/api/broadcast-orders/pending", async (req: Request, res: Response) => {
    try {
      const tenantId = Number(req.query.tenantId);
      if (!tenantId) return res.status(400).json({ error: "tenantId required" });

      const now = new Date();
      // Mark expired broadcasts (lightweight sweep)
      await db.update(broadcastOrders).set({ status: "expired", updatedAt: now })
        .where(and(eq(broadcastOrders.status, "pending"), sql`${broadcastOrders.expiresAt} <= ${now}`));

      // Get pending broadcasts
      const pending = await db.select()
        .from(broadcastOrders)
        .where(and(eq(broadcastOrders.status, "pending"), gt(broadcastOrders.expiresAt, now)))
        .orderBy(desc(broadcastOrders.createdAt))
        .limit(50);

      // Filter out ones this tenant already rejected
      if (pending.length === 0) return res.json([]);
      const ids = pending.map((p) => p.id);
      const rejected = await db.select({ broadcastOrderId: broadcastOrderRecipients.broadcastOrderId })
        .from(broadcastOrderRecipients)
        .where(and(
          eq(broadcastOrderRecipients.tenantId, tenantId),
          eq(broadcastOrderRecipients.response, "rejected"),
          inArray(broadcastOrderRecipients.broadcastOrderId, ids),
        ));
      const rejectedSet = new Set(rejected.map((r) => r.broadcastOrderId));
      const visible = pending.filter((p) => !rejectedSet.has(p.id));
      res.json(visible);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── POS: atomic accept / claim ───────────────────────────────────────────
  app.post("/api/broadcast-orders/:id/accept", async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const tenantId = Number(req.body?.tenantId || (req as any).tenantId);
      if (!id || !tenantId) return res.status(400).json({ error: "id + tenantId required" });

      // Atomic claim: UPDATE ... WHERE status='pending' AND expires_at > NOW()
      const now = new Date();
      const result: any = await db.execute(sql`
        UPDATE ${broadcastOrders}
        SET status = 'claimed',
            claimed_by_tenant_id = ${tenantId},
            claimed_at = ${now},
            updated_at = ${now}
        WHERE id = ${id}
          AND status = 'pending'
          AND expires_at > ${now}
      `);
      const affected = result?.affectedRows ?? result?.[0]?.affectedRows ?? 0;
      if (!affected) {
        const [row] = await db.select().from(broadcastOrders).where(eq(broadcastOrders.id, id)).limit(1);
        return res.status(409).json({
          error: "Too late — order already " + (row?.status || "unavailable"),
          status: row?.status,
          claimedByTenantId: row?.claimedByTenantId,
        });
      }

      // Record recipient response
      try {
        await db.insert(broadcastOrderRecipients).values({
          broadcastOrderId: id,
          tenantId,
          response: "accepted",
          respondedAt: now,
        } as any);
      } catch (_) {
        // May conflict on unique constraint if tenant already rejected — update instead
        await db.update(broadcastOrderRecipients)
          .set({ response: "accepted", respondedAt: now })
          .where(and(eq(broadcastOrderRecipients.broadcastOrderId, id), eq(broadcastOrderRecipients.tenantId, tenantId)));
      }

      // Load the full broadcast row
      const [bc] = await db.select().from(broadcastOrders).where(eq(broadcastOrders.id, id)).limit(1);
      if (!bc) return res.status(500).json({ error: "Post-claim read failed" });

      // Create the normal online_orders row so it appears in the POS screen
      const orderNumber = generateOrderNumber(tenantId);
      const trackingToken = randomBytes(32).toString("hex");

      // Normalize items into the onlineOrders shape
      const posItems = (bc.items || []).map((it: any, idx: number) => ({
        productId: it.productId || 0,
        name: it.name,
        quantity: Number(it.quantity) || 1,
        unitPrice: Number(it.estimatedPrice ?? it.unitPrice ?? 0),
        total: Number(it.estimatedPrice ?? it.unitPrice ?? 0) * (Number(it.quantity) || 1),
        notes: it.notes || undefined,
      }));
      const subtotal = posItems.reduce((s, it) => s + (Number(it.total) || 0), 0);

      const [ooInsert] = (await db.insert(onlineOrders).values({
        tenantId,
        orderNumber,
        customerName: bc.customerName,
        customerPhone: bc.customerPhone,
        customerAddress: bc.customerAddress || null,
        customerEmail: bc.customerEmail || null,
        items: posItems as any,
        subtotal: String(subtotal || bc.estimatedTotal || 0),
        totalAmount: String(subtotal || bc.estimatedTotal || 0),
        paymentMethod: bc.paymentMethod || "cash",
        paymentStatus: "pending",
        status: "accepted", // already accepted by the tenant by virtue of claiming
        orderType: "delivery",
        notes: bc.notes || null,
        customerLat: bc.customerLat || null,
        customerLng: bc.customerLng || null,
        trackingToken,
        sourceChannel: "broadcast",
      } as any)) as any;

      // Find the new online_orders row id
      const [newOo] = await db.select({ id: onlineOrders.id }).from(onlineOrders).where(eq(onlineOrders.orderNumber, orderNumber)).limit(1);
      const onlineOrderId = newOo?.id;

      if (onlineOrderId) {
        await db.update(broadcastOrders).set({ onlineOrderId, updatedAt: new Date() }).where(eq(broadcastOrders.id, id));
      }

      // Tenant info for WS payload
      const [tenantRow] = await db.select({ businessName: tenants.businessName }).from(tenants).where(eq(tenants.id, tenantId)).limit(1);

      // Notify everyone
      const claimPayload = {
        type: "broadcast_claimed",
        id: bc.id,
        token: bc.broadcastToken,
        claimedByTenantId: tenantId,
        claimedByName: tenantRow?.businessName || null,
        orderNumber,
        trackingToken,
        onlineOrderId,
      };
      try { callerIdService.broadcast(claimPayload); } catch (_) {}

      // Also notify the winning POS that a NEW online order exists (same event the UI listens for)
      try { callerIdService.broadcast({ type: "new_online_order", tenantId, orderId: onlineOrderId, orderNumber }, tenantId); } catch (_) {}
      try { pushService.notifyNewOrder(orderNumber, subtotal || bc.estimatedTotal || "0", tenantId); } catch (_) {}

      res.json({
        success: true,
        broadcastId: bc.id,
        onlineOrderId,
        orderNumber,
        trackingToken,
      });
    } catch (e: any) {
      console.error("[broadcast/accept] error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // ── POS: reject (just hide from this tenant's UI) ────────────────────────
  app.post("/api/broadcast-orders/:id/reject", async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const tenantId = Number(req.body?.tenantId || (req as any).tenantId);
      if (!id || !tenantId) return res.status(400).json({ error: "id + tenantId required" });

      try {
        await db.insert(broadcastOrderRecipients).values({
          broadcastOrderId: id,
          tenantId,
          response: "rejected",
          respondedAt: new Date(),
        } as any);
      } catch (_) {
        await db.update(broadcastOrderRecipients)
          .set({ response: "rejected", respondedAt: new Date() })
          .where(and(eq(broadcastOrderRecipients.broadcastOrderId, id), eq(broadcastOrderRecipients.tenantId, tenantId)));
      }
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  console.log("[BROADCAST] Routes registered: POST /api/delivery/broadcast, GET /api/delivery/broadcast/:token, POST /api/delivery/broadcast/:token/cancel, GET /api/broadcast-orders/pending, POST /api/broadcast-orders/:id/accept, POST /api/broadcast-orders/:id/reject");
}
