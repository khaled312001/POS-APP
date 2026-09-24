/**
 * Extra customer-facing routes: guest auth + chat (room + messages).
 *
 * Built as a separate file so the existing routes.ts (already 4500+ lines)
 * doesn't grow further. Registered from server/index.ts.
 */
import type { Express, Request, Response } from "express";
import { db, pool } from "./db";
import { chatRooms, chatMessages, onlineOrders, customers, tenants } from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import {
  createCustomerSession,
  getAuthenticatedCustomer,
  findOrCreateCustomerByPhone,
} from "./customerAuthService";
import { storage } from "./storage";
import { callerIdService } from "./callerIdService";
import { canonicalPhone } from "./phone";

/**
 * Does this logged-in customer own the order behind a chat room? By the
 * room's customer id, or (for rooms without one) the same store and the
 * same canonical phone. Any other customer used to be able to read and
 * write every order's chat by guessing ids.
 */
async function customerOwnsRoom(customer: any, room: any): Promise<boolean> {
  if (!customer || !room) return false;
  if (room.customerId) return room.customerId === customer.id;
  const [order] = await db.select().from(onlineOrders).where(eq(onlineOrders.id, room.orderId)).limit(1);
  if (!order || !customer.phone || String(customer.phone).startsWith("guest-")) return false;
  return order.tenantId === customer.tenantId
    && canonicalPhone(order.customerPhone) === canonicalPhone(customer.phone);
}

let chatMigrationRan = false;
async function ensureChatTables(): Promise<void> {
  if (chatMigrationRan) return;
  chatMigrationRan = true;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS chat_rooms (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL UNIQUE,
        tenant_id INT NOT NULL,
        customer_id INT NULL,
        customer_name TEXT NULL,
        customer_phone TEXT NULL,
        status TEXT NOT NULL,
        last_message_at TIMESTAMP NULL,
        unread_by_customer INT DEFAULT 0,
        unread_by_tenant INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_chat_rooms_order (order_id),
        INDEX idx_chat_rooms_tenant (tenant_id),
        INDEX idx_chat_rooms_customer (customer_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        room_id INT UNSIGNED NOT NULL,
        sender_type TEXT NOT NULL,
        sender_id INT NULL,
        sender_name TEXT NULL,
        body TEXT NOT NULL,
        attachment_url TEXT NULL,
        read_by_other BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_chat_msg_room_created (room_id, created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("[CHAT] Migration check OK — chat tables ready.");
  } catch (e: any) {
    console.warn("[CHAT] Migration warning:", e.message);
    chatMigrationRan = false;
  }
}

async function getOrCreateRoom(orderId: number): Promise<any> {
  await ensureChatTables();
  const [existing] = await db.select().from(chatRooms).where(eq(chatRooms.orderId, orderId)).limit(1);
  if (existing) return existing;
  const [order] = await db.select().from(onlineOrders).where(eq(onlineOrders.id, orderId)).limit(1);
  if (!order) return null;
  // Try to find the customer record by phone within the tenant
  let custId: number | null = null;
  try {
    custId = await storage.getCustomerIdByPhone(order.customerPhone, order.tenantId);
  } catch { custId = null; }
  await db.insert(chatRooms).values({
    orderId,
    tenantId: order.tenantId,
    customerId: custId ?? null,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    status: "open",
  } as any);
  const [created] = await db.select().from(chatRooms).where(eq(chatRooms.orderId, orderId)).limit(1);
  return created;
}

export function registerCustomerExtraRoutes(app: Express) {
  ensureChatTables().catch(() => {});

  // ── PUBLIC: Guest session — anonymous customer for marketplace mode ──
  // Creates a customer row with hasAccount=false and returns a session token.
  // Caller can later upgrade to a full account via /api/delivery/auth/register.
  app.post("/api/delivery/auth/guest", async (req: Request, res: Response) => {
    try {
      const { name, phone, tenantId } = req.body || {};
      // Default to Pizza Lemon (24) if no tenantId — the /customer app keeps
      // its customer accounts under that tenant (PLATFORM_TENANT = 24).
      const tid = Number(tenantId) || 24;
      if (!(await storage.getTenant(tid))) return res.status(404).json({ error: "Store not found" });
      const guestName = String(name || "Guest").trim().slice(0, 120) || "Guest";
      // A guest session must NEVER open an existing customer: that handed the
      // account (addresses, wallet, order history) of any phone number to
      // whoever typed it. A guest is always a fresh row; the typed phone is
      // only stored when no customer of this store has it yet.
      const typed = phone ? canonicalPhone(phone) : "";
      const taken = typed ? await storage.findCustomerByPhoneExact(typed, tid) : undefined;
      const guestPhone = typed && !taken ? typed : `guest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const [ins] = await db.insert(customers).values({
        tenantId: tid, name: guestName, phone: guestPhone, hasAccount: false, source: "customer-app-guest",
      } as any).$returningId();
      const [customer] = await db.select().from(customers).where(eq(customers.id, ins.id)).limit(1);
      if (!customer) return res.status(500).json({ error: "Failed to create guest" });
      const token = await createCustomerSession((customer as any).id, tid, req.headers["user-agent"] as any);
      res.json({
        success: true, token, isGuest: true,
        customer: {
          id: (customer as any).id,
          name: guestName,                       // honor the user-provided name in the response
          phone: typed || (customer as any).phone,
          isGuest: true,
        },
      });
    } catch (e: any) {
      console.error("[auth/guest] error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // ── CHAT: list customer's chat rooms ──
  app.get("/api/customer/chats", async (req: Request, res: Response) => {
    try {
      await ensureChatTables();
      const customer = await getAuthenticatedCustomer(req.headers.authorization as any);
      if (!customer) return res.status(401).json({ error: "Not authenticated" });
      const rooms = await db.select({
        id: chatRooms.id,
        orderId: chatRooms.orderId,
        tenantId: chatRooms.tenantId,
        status: chatRooms.status,
        lastMessageAt: chatRooms.lastMessageAt,
        unreadByCustomer: chatRooms.unreadByCustomer,
        tenantName: tenants.businessName,
        orderNumber: onlineOrders.orderNumber,
        orderStatus: onlineOrders.status,
      })
      .from(chatRooms)
      .leftJoin(tenants, eq(tenants.id, chatRooms.tenantId))
      .leftJoin(onlineOrders, eq(onlineOrders.id, chatRooms.orderId))
      .where(eq(chatRooms.customerId, (customer as any).id))
      .orderBy(desc(chatRooms.lastMessageAt))
      .limit(50);
      res.json(rooms);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ── CHAT: get a single room + messages (customer-side, by orderId) ──
  app.get("/api/customer/chats/order/:orderId", async (req: Request, res: Response) => {
    try {
      await ensureChatTables();
      const orderId = Number(req.params.orderId);
      const customer = await getAuthenticatedCustomer(req.headers.authorization as any);
      if (!customer) return res.status(401).json({ error: "Not authenticated" });
      const room = await getOrCreateRoom(orderId);
      if (!room) return res.status(404).json({ error: "Order not found" });
      // Confirm the customer owns the order (customerId match OR phone match)
      if (!(await customerOwnsRoom(customer, room))) {
        return res.status(403).json({ error: "Forbidden" });
      }
      const messages = await db.select().from(chatMessages)
        .where(eq(chatMessages.roomId, room.id))
        .orderBy(chatMessages.createdAt)
        .limit(200);
      // Mark unread customer messages as read
      try {
        await db.update(chatRooms).set({ unreadByCustomer: 0 } as any).where(eq(chatRooms.id, room.id));
      } catch {}
      res.json({ room, messages });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ── CHAT: post a message (customer-side, by orderId) ──
  app.post("/api/customer/chats/order/:orderId/messages", async (req: Request, res: Response) => {
    try {
      await ensureChatTables();
      const orderId = Number(req.params.orderId);
      const { body } = req.body || {};
      if (!body || !String(body).trim()) return res.status(400).json({ error: "body required" });
      const customer = await getAuthenticatedCustomer(req.headers.authorization as any);
      if (!customer) return res.status(401).json({ error: "Not authenticated" });
      const room = await getOrCreateRoom(orderId);
      if (!room) return res.status(404).json({ error: "Order not found" });
      if (!(await customerOwnsRoom(customer, room))) {
        return res.status(403).json({ error: "Forbidden" });
      }
      await db.insert(chatMessages).values({
        roomId: room.id,
        senderType: "customer",
        senderId: (customer as any).id,
        senderName: (customer as any).name,
        body: String(body).slice(0, 2000),
      } as any);
      const now = new Date();
      await db.update(chatRooms).set({
        lastMessageAt: now,
        unreadByTenant: sql`${chatRooms.unreadByTenant} + 1`,
      } as any).where(eq(chatRooms.id, room.id));
      // Push to POS via existing WS channel
      const payload = {
        type: "chat_new_message",
        roomId: room.id, orderId,
        senderType: "customer",
        senderName: (customer as any).name,
        body: String(body),
        createdAt: now.toISOString(),
      };
      try { callerIdService.broadcast(payload, room.tenantId); } catch {}
      res.json({ success: true });
    } catch (e: any) {
      console.error("[chat/customer/post] error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // ── CHAT: tenant lists its rooms (POS) ──
  app.get("/api/chat/rooms", async (req: Request, res: Response) => {
    try {
      await ensureChatTables();
      const tenantId = Number((req as any).tenantId || req.query.tenantId);
      if (!tenantId) return res.status(400).json({ error: "tenantId required" });
      const rooms = await db.select({
        id: chatRooms.id,
        orderId: chatRooms.orderId,
        customerName: chatRooms.customerName,
        customerPhone: chatRooms.customerPhone,
        status: chatRooms.status,
        lastMessageAt: chatRooms.lastMessageAt,
        unreadByTenant: chatRooms.unreadByTenant,
        orderNumber: onlineOrders.orderNumber,
        orderStatus: onlineOrders.status,
      })
      .from(chatRooms)
      .leftJoin(onlineOrders, eq(onlineOrders.id, chatRooms.orderId))
      .where(eq(chatRooms.tenantId, tenantId))
      .orderBy(desc(chatRooms.lastMessageAt))
      .limit(100);
      res.json(rooms);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ── CHAT: tenant ensures a room exists for an order (POS-initiated chat) ──
  app.post("/api/chat/order/:orderId/ensure", async (req: Request, res: Response) => {
    try {
      const orderId = Number(req.params.orderId);
      const tenantId = Number((req as any).tenantId || 0);
      if (!tenantId && !(req as any).isSuperAdmin) return res.status(400).json({ error: "tenantId required" });
      const [order] = await db.select({ tenantId: onlineOrders.tenantId }).from(onlineOrders).where(eq(onlineOrders.id, orderId)).limit(1);
      // Checked before creating: a foreign order must not get a room.
      if (!order || (tenantId && order.tenantId !== tenantId)) return res.status(404).json({ error: "Order not found" });
      const room = await getOrCreateRoom(orderId);
      if (!room) return res.status(404).json({ error: "Order not found" });
      res.json({ room });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ── CHAT: tenant fetches messages of a room (POS) ──
  app.get("/api/chat/rooms/:id/messages", async (req: Request, res: Response) => {
    try {
      await ensureChatTables();
      const id = Number(req.params.id);
      // The licence's store; the room must be one of its own (a missing
      // tenant used to skip the check entirely).
      const tenantId = Number((req as any).tenantId || 0);
      if (!tenantId && !(req as any).isSuperAdmin) return res.status(400).json({ error: "tenantId required" });
      const [room] = await db.select().from(chatRooms).where(eq(chatRooms.id, id)).limit(1);
      if (!room || (tenantId && room.tenantId !== tenantId)) return res.status(404).json({ error: "Room not found" });
      const messages = await db.select().from(chatMessages)
        .where(eq(chatMessages.roomId, id))
        .orderBy(chatMessages.createdAt)
        .limit(500);
      try {
        await db.update(chatRooms).set({ unreadByTenant: 0 } as any).where(eq(chatRooms.id, id));
      } catch {}
      res.json({ room, messages });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ── CHAT: tenant posts a message (POS) ──
  app.post("/api/chat/rooms/:id/messages", async (req: Request, res: Response) => {
    try {
      await ensureChatTables();
      const id = Number(req.params.id);
      const { body, senderName, senderId, senderType } = req.body || {};
      if (!body || !String(body).trim()) return res.status(400).json({ error: "body required" });
      const tenantId = Number((req as any).tenantId || 0);
      if (!tenantId && !(req as any).isSuperAdmin) return res.status(400).json({ error: "tenantId required" });
      const [room] = await db.select().from(chatRooms).where(eq(chatRooms.id, id)).limit(1);
      if (!room || (tenantId && room.tenantId !== tenantId)) return res.status(404).json({ error: "Room not found" });
      await db.insert(chatMessages).values({
        roomId: id,
        // The store side cannot post as the customer.
        senderType: senderType === "driver" ? "driver" : "tenant",
        senderId: senderId ? Number(senderId) : null,
        senderName: senderName || "Restaurant",
        body: String(body).slice(0, 2000),
      } as any);
      const now = new Date();
      await db.update(chatRooms).set({
        lastMessageAt: now,
        unreadByCustomer: sql`${chatRooms.unreadByCustomer} + 1`,
      } as any).where(eq(chatRooms.id, id));
      const payload = {
        type: "chat_new_message",
        roomId: id, orderId: room.orderId,
        senderType: senderType === "driver" ? "driver" : "tenant",
        senderName: senderName || "Restaurant",
        body: String(body),
        createdAt: now.toISOString(),
      };
      try { callerIdService.broadcast(payload, room.tenantId); } catch {}
      res.json({ success: true });
    } catch (e: any) {
      console.error("[chat/tenant/post] error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  console.log("[CUSTOMER-EXTRAS] Routes registered: /api/delivery/auth/guest + chat endpoints");
}
