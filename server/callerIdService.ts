import { EventEmitter } from "events";
import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";
import { normalizePhone } from "./phoneUtils";

interface ActiveCall {
  phoneNumber: string;
  normalizedPhone: string;
  slot: number;
  timestamp: string;
  tenantId: number | null;
  dbCallId?: number;
  customer?: {
    id: number;
    name: string;
    phone: string | null;
    email: string | null;
    address?: string | null;
    loyaltyPoints: number | null;
    visitCount: number | null;
    totalSpent: string | null;
    notes: string | null;
  } | null;
}

interface TenantWebSocket extends WebSocket {
  tenantId?: number;
}

/**
 * CallerIDService handles incoming calls from hardware (FRITZ!Card via CAPI)
 * and broadcasts them to connected POS clients via WebSockets.
 * Supports up to 4 simultaneous call slots per tenant.
 */
const SLOT_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes — auto-free stuck slots if client never signals

export class CallerIDService extends EventEmitter {
  private wss: WebSocketServer | null = null;
  private isSimulation: boolean = true;
  // Key: "tenantId-slot"
  private activeCallSlots: Map<string, ActiveCall> = new Map();
  private slotTimeouts: Map<string, ReturnType<typeof setTimeout>> = new Map();
  // Deduplication: track recent calls to prevent double-counting
  // Key: "normalizedPhone-tenantId", Value: timestamp
  private recentCalls: Map<string, number> = new Map();
  private readonly DEDUP_WINDOW_MS = 5000; // 5 seconds

  constructor() {
    super();
  }

  /**
   * Initialize the service and start listening for calls
   */
  public async init(server: Server) {
    console.log("[CallerID] Initializing Service...");

    // Initialize WebSocket Server
    this.wss = new WebSocketServer({ server, path: "/api/ws/caller-id" });

    this.wss.on("connection", (ws: TenantWebSocket) => {
      console.log("[CallerID] Client connected to WebSocket");
      ws.send(JSON.stringify({ type: "connected", status: "ready", mode: this.isSimulation ? "simulation" : "hardware" }));

      ws.on("message", (message: any) => {
        try {
          const data = JSON.parse(message.toString());

          if (data.type === "register") {
            const tenantId = Number(data.tenantId);
            if (!isNaN(tenantId)) {
              ws.tenantId = tenantId;
              console.log(`[CallerID] Client registered for tenant: ${tenantId}`);

              // Send current active calls for this tenant to newly connected client
              const activeCalls = Array.from(this.activeCallSlots.values())
                .filter(c => c.tenantId === tenantId);

              if (activeCalls.length > 0) {
                ws.send(JSON.stringify({ type: "active_calls", calls: activeCalls }));
              }
            }
          } else if (data.type === "simulate_call") {
            // Use tenantId from registration if available
            const tenantId = data.tenantId || ws.tenantId;
            this.handleIncomingCall(data.phoneNumber || "0123456789", data.slot, tenantId);
          } else if (data.type === "call_answered" || data.type === "call_ended") {
            const slot = Number(data.slot);
            const tenantId = ws.tenantId;
            if (slot && tenantId) {
              const key = `${tenantId}-${slot}`;
              const call = this.activeCallSlots.get(key);
              if (call?.dbCallId) {
                import("./storage").then(({ storage }) => {
                  storage.updateCall(call.dbCallId!, { status: "answered" }).catch(() => { });
                });
              }
              this.activeCallSlots.delete(key);
              const t = this.slotTimeouts.get(key);
              if (t) { clearTimeout(t); this.slotTimeouts.delete(key); }
              this.broadcastCallSlotUpdate(tenantId);
            }
          }
        } catch (e) {
          console.error("[CallerID] WS message error:", e);
        }
      });

      ws.on("close", () => {
        console.log("[CallerID] Client disconnected");
      });
    });

    console.log("[CallerID] WebSocket server listening on /api/ws/caller-id");
  }

  /**
   * Main entry point when a call is detected
   */
  public async handleIncomingCall(phoneNumber: string, preferredSlot?: number, tenantId?: number): Promise<ActiveCall | null> {
    const normalized = normalizePhone(phoneNumber);

    // Resolve actual tenantId: if no WS clients are registered for the given tenantId,
    // fall back to the first connected client's tenantId (handles misconfigured bridge)
    let resolvedTenantId: number | null = tenantId || null;
    if (this.wss && resolvedTenantId) {
      const hasClientForTenant = Array.from(this.wss.clients).some(
        (c: any) => c.readyState === WebSocket.OPEN && c.tenantId === resolvedTenantId
      );
      if (!hasClientForTenant) {
        const firstRegistered = Array.from(this.wss.clients).find(
          (c: any) => c.readyState === WebSocket.OPEN && c.tenantId
        ) as TenantWebSocket | undefined;
        if (firstRegistered?.tenantId) {
          console.log(`[CallerID] Bridge tenantId=${resolvedTenantId} has no clients. Remapping to tenant=${firstRegistered.tenantId}`);
          resolvedTenantId = firstRegistered.tenantId;
        }
      }
    }

    console.log(`[CallerID] Incoming call for tenant ${resolvedTenantId}: ${phoneNumber} (Normalized: ${normalized})`);

    // ── Deduplication: skip if the same phone+tenant was already processed recently ──
    const dedupKey = `${normalized}-${resolvedTenantId}`;
    const now = Date.now();
    const lastSeen = this.recentCalls.get(dedupKey);
    if (lastSeen && (now - lastSeen) < this.DEDUP_WINDOW_MS) {
      console.log(`[CallerID] Duplicate call from ${normalized} within ${this.DEDUP_WINDOW_MS}ms — skipping`);
      // Return existing active call if any
      const existing = Array.from(this.activeCallSlots.values())
        .find(c => c.normalizedPhone === normalized && c.tenantId === resolvedTenantId);
      return existing || null;
    }
    this.recentCalls.set(dedupKey, now);
    // Clean up old entries periodically
    if (this.recentCalls.size > 100) {
      for (const [k, ts] of this.recentCalls) {
        if (now - ts > this.DEDUP_WINDOW_MS * 2) this.recentCalls.delete(k);
      }
    }

    // 1. Assign a slot (1-4)
    let slot = preferredSlot || 0;
    if (slot < 1 || slot > 4) {
      // Find first available slot for THIS tenant
      for (let i = 1; i <= 4; i++) {
        const key = `${resolvedTenantId}-${i}`;
        if (!this.activeCallSlots.has(key)) {
          slot = i;
          break;
        }
      }
    }

    if (slot === 0) {
      console.log(`[CallerID] No slots available for tenant ${resolvedTenantId}, dropping call notification`);
      return null;
    }

    const key = `${resolvedTenantId}-${slot}`;

    // 2. Clear any existing timeout for this slot
    const existingTimeout = this.slotTimeouts.get(key);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      this.slotTimeouts.delete(key);
    }

    // 3. Prepare call info
    const callInfo: ActiveCall = {
      phoneNumber,
      normalizedPhone: normalized,
      slot,
      timestamp: new Date().toISOString(),
      tenantId: resolvedTenantId,
      customer: null
    };

    // 4. Register in active slots
    this.activeCallSlots.set(key, callInfo);

    // 5. Set auto-expiry (prevent stuck slots)
    const timeout = setTimeout(() => {
      console.log(`[CallerID] Auto-expiring slot ${slot} for tenant ${resolvedTenantId}`);
      this.activeCallSlots.delete(key);
      this.slotTimeouts.delete(key);
      if (resolvedTenantId) this.broadcastCallSlotUpdate(resolvedTenantId);
    }, SLOT_EXPIRY_MS);
    this.slotTimeouts.set(key, timeout);

    // 6. Async Lookup Customer & Persist to DB
    try {
      const { storage } = await import("./storage");
      const customers = await storage.findCustomerByPhone(normalized, resolvedTenantId as number);
      if (customers && customers.length > 0) {
        callInfo.customer = customers[0] as any;
        console.log(`[CallerID] Matched customer: ${callInfo.customer?.name}`);
      }
    } catch (e) {
      console.error("[CallerID] Customer lookup error:", e);
    }

    // Persist call to database
    try {
      const { storage } = await import("./storage");
      const dbCall = await storage.createCall({
        tenantId: resolvedTenantId,
        phoneNumber: phoneNumber,
        customerId: callInfo.customer?.id || null,
        status: "missed",
      });
      callInfo.dbCallId = dbCall.id;
      console.log(`[CallerID] Call recorded in DB with ID: ${dbCall.id} for tenant ${resolvedTenantId}`);
    } catch (e) {
      console.error("[CallerID] DB save error:", e);
    }

    const tenantActiveCalls = Array.from(this.activeCallSlots.values())
      .filter(c => c.tenantId === resolvedTenantId);

    const payload = JSON.stringify({
      type: "incoming_call",
      phoneNumber,
      normalizedPhone: normalized,
      slot,
      timestamp: callInfo.timestamp,
      customer: callInfo.customer,
      totalActiveCalls: tenantActiveCalls.length,
      allActiveCalls: tenantActiveCalls,
    });

    this.broadcastToTenant(payload, resolvedTenantId || undefined);

    this.emit("call", phoneNumber, slot, callInfo.customer, resolvedTenantId);
    return callInfo;
  }

  private broadcastToTenant(payload: string, tenantId?: number) {
    if (!this.wss) return;
    let total = 0, matched = 0;
    const allOpen: TenantWebSocket[] = [];
    this.wss.clients.forEach((client: TenantWebSocket) => {
      if (client.readyState === WebSocket.OPEN) {
        total++;
        allOpen.push(client);
        // Send to: unfiltered calls, unregistered clients (compat), or matching-tenant clients
        if (!tenantId || !client.tenantId || client.tenantId === tenantId) {
          matched++;
          client.send(payload);
        }
      }
    });
    // Fallback: if bridge sent a tenantId but no client is registered for it,
    // broadcast to ALL connected clients (handles misconfigured bridge tenantId)
    if (tenantId && matched === 0 && allOpen.length > 0) {
      console.log(`[CallerID] No clients for tenant=${tenantId}, falling back to broadcast all ${allOpen.length} clients`);
      allOpen.forEach(c => c.send(payload));
      matched = allOpen.length;
    }
    console.log(`[CallerID] Broadcast: ${matched}/${total} clients matched tenant=${tenantId}`);
  }

  /**
   * Broadcasts updated slot information to a specific tenant
   */
  private broadcastCallSlotUpdate(tenantId: number) {
    const tenantActiveCalls = Array.from(this.activeCallSlots.values())
      .filter(c => c.tenantId === tenantId);

    const payload = JSON.stringify({
      type: "calls_update",
      allActiveCalls: tenantActiveCalls,
      totalActiveCalls: tenantActiveCalls.length,
    });
    this.broadcastToTenant(payload, tenantId);
  }

  /**
   * Broadcast any arbitrary message to a specific tenant
   */
  public broadcast(payload: object, tenantId?: number) {
    const msg = JSON.stringify(payload);
    this.broadcastToTenant(msg, tenantId);
  }

  /**
   * Returns all currently active calls for a given tenant (for HTTP polling fallback).
   */
  public getActiveCallsForTenant(tenantId: number): ActiveCall[] {
    return Array.from(this.activeCallSlots.values()).filter(c => c.tenantId === tenantId);
  }

  /**
   * Mock function to trigger a call (for testing)
   */
  public simulateCall(number: string = "0123456789", slot?: number, tenantId?: number) {
    this.handleIncomingCall(number, slot, tenantId);
  }

  // ── Delivery Platform broadcast helpers ──────────────────────────────────────

  /**
   * Broadcast driver GPS location update to tenant POS clients
   */
  public broadcastDriverLocation(
    tenantId: number,
    vehicleId: number,
    lat: number,
    lng: number,
    orderId?: number,
  ) {
    this.broadcast({
      type: "driver_location_update",
      vehicleId,
      lat,
      lng,
      orderId: orderId ?? null,
      timestamp: new Date().toISOString(),
    }, tenantId);
  }

  /**
   * Broadcast delivery order status change to tenant POS clients
   */
  public broadcastDeliveryStatus(
    tenantId: number,
    orderId: number,
    status: string,
    driverName?: string,
  ) {
    this.broadcast({
      type: "delivery_status_change",
      orderId,
      status,
      driverName: driverName ?? null,
      timestamp: new Date().toISOString(),
    }, tenantId);
  }

  /**
   * Broadcast a new scheduled order alert to tenant POS clients
   */
  public broadcastScheduledOrder(
    tenantId: number,
    orderId: number,
    scheduledAt: string,
    customerName?: string,
  ) {
    this.broadcast({
      type: "new_scheduled_order",
      orderId,
      scheduledAt,
      customerName: customerName ?? null,
      timestamp: new Date().toISOString(),
    }, tenantId);
  }
}

export const callerIdService = new CallerIDService();
