import { EventEmitter } from "events";
import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";
import { normalizePhone } from "./phoneUtils";

interface ActiveCall {
  phoneNumber: string;
  normalizedPhone: string;
  slot: number;
  timestamp: string;
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

/**
 * CallerIDService handles incoming calls from hardware (FRITZ!Card via CAPI)
 * and broadcasts them to connected POS clients via WebSockets.
 * Supports up to 4 simultaneous call slots (ISDN B-channels).
 */
export class CallerIDService extends EventEmitter {
  private wss: WebSocketServer | null = null;
  private isSimulation: boolean = true;
  private activeCallSlots: Map<number, ActiveCall> = new Map(); // slot 1-4

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

    this.wss.on("connection", (ws: WebSocket) => {
      console.log("[CallerID] Client connected to WebSocket");
      ws.send(JSON.stringify({ type: "connected", status: "ready", mode: this.isSimulation ? "simulation" : "hardware" }));

      // Send current active calls to newly connected client
      if (this.activeCallSlots.size > 0) {
        const activeCalls = Array.from(this.activeCallSlots.values());
        ws.send(JSON.stringify({ type: "active_calls", calls: activeCalls }));
      }

      ws.on("message", (message: any) => {
        try {
          const data = JSON.parse(message.toString());
          if (data.type === "simulate_call") {
            this.handleIncomingCall(data.phoneNumber || "0123456789", data.slot);
          } else if (data.type === "call_answered" || data.type === "call_ended") {
            // Client signals call was handled — free the slot
            const slot = data.slot;
            if (slot) {
              this.activeCallSlots.delete(slot);
              this.broadcastCallSlotUpdate();
            }
          }
        } catch (e) {
          console.error("[CallerID] WS Message Error:", e);
        }
      });
    });

    try {
      // Attempt to load CAPI (Common ISDN API) for FRITZ!Card
      // This requires the ffi-napi package and the capi2032.dll on Windows
      this.initHardware().then(success => {
        if (success) {
          this.isSimulation = false;
          console.log("[CallerID] Hardware (CAPI) connected successfully");
        } else {
          console.log("[CallerID] Hardware not found, running in simulation mode");
        }
      });
    } catch (e) {
      console.warn("[CallerID] Failed to init hardware, falling back to simulation", e);
    }
  }

  private async initHardware(): Promise<boolean> {
    // In a real production environment on Windows:
    // 1. Install ffi-napi: npm install ffi-napi
    // 2. The code would look like this:
    /*
    try {
      const ffi = require('ffi-napi');
      const capi = ffi.Library('capi2032.dll', {
        'CAPI_REGISTER': ['uint32', ['uint32', 'uint32', 'uint32', 'uint32', 'pointer']],
        'CAPI_RELEASE': ['uint32', ['uint32']],
        'CAPI_PUT_MESSAGE': ['uint32', ['uint32', 'pointer']],
        'CAPI_GET_MESSAGE': ['uint32', ['uint32', 'pointer']],
        // ... more CAPI functions
      });
      return true;
    } catch (e) {
      return false;
    }
    */
    return false; // Default to false for now as ffi-napi might not be compatible with this build env
  }

  /**
   * Handles an incoming call notification, assigning to the next free slot (1-4)
   * Automatically looks up the customer by phone number across all tenants (or specific tenant)
   */
  public async handleIncomingCall(phoneNumber: string, preferredSlot?: number, tenantId?: number): Promise<ActiveCall | null> {
    const normalized = normalizePhone(phoneNumber);
    console.log(`[CallerID] Incoming call from: ${phoneNumber} (normalized: ${normalized})`);

    // Check if a call from this number is already active to prevent duplicates
    for (const [existingSlot, existingCall] of this.activeCallSlots.entries()) {
      if (existingCall.normalizedPhone === normalized || existingCall.phoneNumber === phoneNumber) {
        console.log(`[CallerID] Call from ${phoneNumber} already active in slot ${existingSlot}, ignoring duplicate.`);

        // Update the timestamp to keep it fresh, but don't create a new notification
        existingCall.timestamp = new Date().toISOString();
        this.broadcastCallSlotUpdate();
        return existingCall;
      }
    }

    let slot = preferredSlot;
    if (!slot || this.activeCallSlots.has(slot)) {
      for (let s = 1; s <= 4; s++) {
        if (!this.activeCallSlots.has(s)) { slot = s; break; }
      }
    }
    if (!slot) {
      console.warn("[CallerID] All 4 call slots occupied, dropping call from:", phoneNumber);
      return null;
    }

    // Immediately reserve the slot to prevent race conditions during DB lookup
    const callInfo: ActiveCall = { phoneNumber, normalizedPhone: normalized, slot, timestamp: new Date().toISOString(), customer: null };
    this.activeCallSlots.set(slot, callInfo);

    try {
      const { storage } = await import("./storage");
      const matches = await storage.findCustomerByPhone(phoneNumber, tenantId as number);
      if (matches.length > 0) {
        const c = matches[0];
        callInfo.customer = {
          id: c.id,
          name: c.name,
          phone: c.phone,
          email: c.email,
          address: c.address,
          loyaltyPoints: c.loyaltyPoints,
          visitCount: c.visitCount,
          totalSpent: c.totalSpent,
          notes: c.notes,
        };
        console.log(`[CallerID] Customer matched: ${callInfo.customer.name} (ID: ${callInfo.customer.id})`);
      } else {
        console.log(`[CallerID] No customer found for phone: ${phoneNumber}`);
      }
    } catch (e) {
      console.error("[CallerID] Customer lookup error:", e);
    }

    const payload = JSON.stringify({
      type: "incoming_call",
      phoneNumber,
      normalizedPhone: normalized,
      slot,
      timestamp: callInfo.timestamp,
      customer: callInfo.customer,
      totalActiveCalls: this.activeCallSlots.size,
      allActiveCalls: Array.from(this.activeCallSlots.values()),
    });

    if (this.wss) {
      this.wss.clients.forEach((client: WebSocket) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(payload);
        }
      });
    }

    this.emit("call", phoneNumber, slot, callInfo.customer);
    return callInfo;
  }

  /**
   * Broadcasts updated slot information to all connected clients
   */
  private broadcastCallSlotUpdate() {
    if (!this.wss) return;
    const payload = JSON.stringify({
      type: "calls_update",
      allActiveCalls: Array.from(this.activeCallSlots.values()),
      totalActiveCalls: this.activeCallSlots.size,
    });
    this.wss.clients.forEach((client: WebSocket) => {
      if (client.readyState === WebSocket.OPEN) client.send(payload);
    });
  }

  /**
   * Broadcast any arbitrary message to all connected POS clients
   */
  public broadcast(payload: object) {
    if (!this.wss) return;
    const msg = JSON.stringify(payload);
    this.wss.clients.forEach((client: WebSocket) => {
      if (client.readyState === WebSocket.OPEN) client.send(msg);
    });
  }

  /**
   * Mock function to trigger a call (for testing)
   */
  public simulateCall(number: string = "0551234567", slot?: number) {
    this.handleIncomingCall(number, slot);
  }
}

export const callerIdService = new CallerIDService();
