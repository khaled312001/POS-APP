import path from 'path';
import fs from 'fs';
import { pathToFileURL } from 'url';
// @ts-ignore -- qrcode ships no type declarations
import QRCode from 'qrcode';

/**
 * Platform WhatsApp session, over Baileys (WhatsApp Web's own WebSocket
 * protocol — no browser). It replaced wppconnect + headless Chrome, which
 * needs ~50 threads: on the shared hosting account that budget is shared by
 * every site, so Chrome never got a renderer and took the other sites down
 * with it. Baileys runs inside the node process (~11 threads).
 *
 * Baileys is ESM-only and is installed on the server in its own folder
 * (wa-baileys/ next to the app, or BAILEYS_DIR) so the app's node_modules are
 * left alone; a normal node_modules install is used as a fallback.
 */
const STORAGE_DIR = path.resolve(process.cwd(), ".whatsapp");
const AUTH_DIR = path.join(STORAGE_DIR, "auth");
const BAILEYS_DIR = process.env.BAILEYS_DIR || path.resolve(process.cwd(), "wa-baileys");

export type WhatsAppStatus = "disconnected" | "connecting" | "qr_ready" | "connected";

interface OrderItem {
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
    notes?: string;
}

interface OrderData {
    orderNumber: string;
    customerName: string;
    customerPhone: string;
    customerAddress?: string | null;
    items: OrderItem[];
    subtotal: string | number;
    deliveryFee?: string | number;
    totalAmount: string | number;
    orderType: string;
    paymentMethod: string;
    notes?: string | null;
}

let baileys: any = null;
let sock: any = null;
let status: WhatsAppStatus = "disconnected";
let lastQrCode: string | null = null;
let lastError: string | null = null;
let connectionLog: { time: string; event: string }[] = [];
let connectionPhase: "idle" | "starting" | "awaiting_qr" | "qr_scanned" | "ready" = "idle";
let reconnectTimer: any = null;
let reconnectAttempts = 0;
let manualStop = false;
let pendingMessages: { phone: string; text: string; timestamp: number }[] = [];

function log(event: string) {
    const entry = { time: new Date().toISOString(), event };
    connectionLog.unshift(entry);
    if (connectionLog.length > 100) connectionLog.length = 100;
    console.log(`[WhatsApp] ${event}`);
}

// Baileys wants a pino-style logger; its protocol chatter is not useful here.
const quietLogger: any = {
    level: "silent",
    child() { return quietLogger; },
    trace() { }, debug() { }, info() { },
    warn() { },
    error() { },
    fatal(obj: any, msg?: string) { console.error("[WhatsApp] fatal", msg || "", obj?.err?.message || ""); },
};

async function loadBaileys(): Promise<any> {
    if (baileys) return baileys;
    const entry = path.join(BAILEYS_DIR, "node_modules", "@whiskeysockets", "baileys", "lib", "index.js");
    try {
        baileys = fs.existsSync(entry)
            ? await import(pathToFileURL(entry).href)
            : await import("@whiskeysockets/baileys" as any);
        return baileys;
    } catch (err: any) {
        lastError = `Baileys not installed: ${err?.message || err}`;
        log(lastError);
        return null;
    }
}

function toJid(phone: string): string {
    let digits = phone.replace(/\D/g, "");

    // Normalize Swiss numbers
    // 1. If it starts with 410... (e.g. 410791234567) -> 41791234567
    if (digits.startsWith("410") && digits.length === 12) {
        digits = "41" + digits.slice(3);
    }
    // 2. If it starts with 0... (10 digits, e.g., 0791234567) -> 41791234567
    else if (digits.startsWith("0") && digits.length === 10) {
        digits = "41" + digits.slice(1);
    }
    // 3. If it has 9 digits and doesn't start with 0 (e.g. 791234567) -> 41791234567
    else if (digits.length === 9 && !digits.startsWith("0")) {
        digits = "41" + digits;
    }

    return `${digits}@s.whatsapp.net`;
}

function hasSession(): boolean {
    return fs.existsSync(path.join(AUTH_DIR, "creds.json"));
}

function queue(phone: string, text: string) {
    pendingMessages.push({ phone, text, timestamp: Date.now() });
    if (pendingMessages.length > 50) pendingMessages.shift();
}

async function flushPending() {
    if (!pendingMessages.length) return;
    const toSend = pendingMessages;
    pendingMessages = [];
    log(`Flushing ${toSend.length} queued message(s)`);
    for (const m of toSend) {
        if (Date.now() - m.timestamp < 10 * 60 * 1000) {
            await whatsappService.sendText(m.phone, m.text);
        } else {
            log(`Dropped stale queued message for ${m.phone} (>10min old)`);
        }
    }
}

function scheduleReconnect(delayMs?: number) {
    if (manualStop || reconnectTimer) return;
    reconnectAttempts++;
    const delay = delayMs ?? Math.min(60000, 5000 * reconnectAttempts);
    log(`Reconnecting in ${Math.round(delay / 1000)}s…`);
    reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        startSocket().catch((e) => log(`Reconnect failed: ${e?.message || e}`));
    }, delay);
}

function closeSocket() {
    const s = sock;
    sock = null;
    if (!s) return;
    try { s.ev.removeAllListeners(); } catch { }
    try { s.end(undefined); } catch { }
}

async function startSocket(): Promise<void> {
    const B = await loadBaileys();
    if (!B) { status = "disconnected"; connectionPhase = "idle"; return; }
    const makeWASocket = B.default?.default || B.default || B.makeWASocket;
    const { useMultiFileAuthState, fetchLatestBaileysVersion, Browsers, DisconnectReason } = B;

    closeSocket();
    fs.mkdirSync(AUTH_DIR, { recursive: true });
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    let version: number[] | undefined;
    try { version = (await fetchLatestBaileysVersion()).version; } catch { }

    status = "connecting";
    connectionPhase = hasSession() && state.creds?.registered ? "starting" : "awaiting_qr";
    const s = makeWASocket({
        auth: state,
        logger: quietLogger,
        version,
        browser: Browsers.ubuntu("Kassenta"),
        markOnlineOnConnect: false,
        syncFullHistory: false,
    });
    sock = s;
    s.ev.on("creds.update", saveCreds);
    s.ev.on("connection.update", async (u: any) => {
        if (sock !== s) return;
        if (u.qr) {
            try {
                lastQrCode = await QRCode.toDataURL(u.qr, { margin: 1, width: 320 });
                status = "qr_ready";
                connectionPhase = "awaiting_qr";
                log("QR code generated — scan with WhatsApp");
            } catch (e: any) {
                log(`QR render failed: ${e?.message || e}`);
            }
        }
        if (u.connection === "open") {
            status = "connected";
            connectionPhase = "ready";
            lastQrCode = null;
            lastError = null;
            reconnectAttempts = 0;
            log(`✅ WhatsApp connected as ${String(s.user?.id || "").split(":")[0]}`);
            flushPending().catch(() => { });
        }
        if (u.connection === "close") {
            const code = u.lastDisconnect?.error?.output?.statusCode;
            const reason = u.lastDisconnect?.error?.message || "closed";
            status = "disconnected";
            connectionPhase = "idle";
            lastQrCode = null;
            sock = null;
            if (code === DisconnectReason.loggedOut) {
                // Unlinked from the phone: the saved credentials are dead.
                lastError = "WhatsApp was logged out from the phone — connect again and scan the QR code";
                log(lastError);
                try { fs.rmSync(AUTH_DIR, { recursive: true, force: true }); } catch { }
                return;
            }
            if (code === DisconnectReason.restartRequired) {
                // Normal right after the QR is scanned.
                connectionPhase = "qr_scanned";
                log("QR scanned — restarting the session");
                scheduleReconnect(500);
                return;
            }
            if (code === DisconnectReason.timedOut && !state.creds?.registered) {
                lastError = "QR code expired — press connect to get a new one";
                log(lastError);
                return;
            }
            lastError = `${reason}${code ? ` (${code})` : ""}`;
            log(`Connection closed: ${lastError}`);
            scheduleReconnect();
        }
    });
    s.ev.on("messages.upsert", ({ messages, type }: any) => {
        if (type !== "notify") return;
        for (const m of messages || []) {
            if (m.key?.fromMe) continue;
            const body = m.message?.conversation || m.message?.extendedTextMessage?.text || "";
            log(`Msg from ${m.key?.remoteJid}: ${body.slice(0, 80)}`);
        }
    });
}

export const whatsappService = {
    getStatus(): { status: WhatsAppStatus; lastError: string | null; log: typeof connectionLog; phase: string } {
        return { status, lastError, log: connectionLog.slice(0, 20), phase: connectionPhase };
    },

    getQrCode(): string | null {
        return lastQrCode;
    },

    /** Whether a linked session is saved (survives restarts). */
    hasSession,

    sessionModified(): string | null {
        try { return fs.statSync(path.join(AUTH_DIR, "creds.json")).mtime.toISOString(); } catch { return null; }
    },

    /** On boot: resume a linked session; never start a QR flow on its own. */
    async autoConnect(): Promise<void> {
        if (process.env.WHATSAPP_DISABLED === "1" || !hasSession()) return;
        await this.connect();
    },

    async connect(): Promise<{ status: WhatsAppStatus; qrCode?: string }> {
        if (process.env.WHATSAPP_DISABLED === "1") {
            lastError = "WhatsApp is disabled on this server (WHATSAPP_DISABLED=1)";
            return { status: "disconnected" };
        }
        if (sock && (status === "connected" || status === "qr_ready" || status === "connecting")) {
            return { status, qrCode: lastQrCode || undefined };
        }
        manualStop = false;
        if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
        lastError = null;
        lastQrCode = null;
        log("Connecting…");
        await startSocket();
        // The QR usually arrives within a couple of seconds; give the caller
        // a chance to get it in the same response.
        for (let i = 0; i < 16 && status === "connecting"; i++) {
            await new Promise(r => setTimeout(r, 250));
        }
        return { status, qrCode: lastQrCode || undefined };
    },

    async disconnect(): Promise<void> {
        manualStop = true;
        if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
        closeSocket();
        status = "disconnected";
        lastQrCode = null;
        connectionPhase = "idle";
        pendingMessages = [];
        log("Disconnected (manual)");
    },

    /** Unlink the device and forget the saved session. */
    async logout(): Promise<void> {
        manualStop = true;
        try { await sock?.logout(); } catch { }
        await this.disconnect();
        try { fs.rmSync(AUTH_DIR, { recursive: true, force: true }); } catch { }
        log("Logged out — session removed");
    },

    /** Alias — several routes historically call sendMessage(). */
    async sendMessage(phone: string, text: string): Promise<boolean> {
        return this.sendText(phone, text);
    },

    async sendText(phone: string, text: string): Promise<boolean> {
        if (!sock || status !== "connected") {
            log(`Cannot send — not ready (status="${status}"). Queuing message for ${phone}`);
            queue(phone, text);
            if (hasSession() && !manualStop && !sock) scheduleReconnect();
            return false;
        }
        const jid = toJid(phone);
        try {
            const [found] = (await sock.onWhatsApp(jid)) || [];
            if (found && found.exists === false) {
                log(`${phone} is not on WhatsApp — not sent`);
                return false;
            }
            await sock.sendMessage(found?.jid || jid, { text });
            log(`Message sent to ${phone}`);
            return true;
        } catch (err: any) {
            log(`Failed to send to ${phone}: ${err?.message || err}`);
            return false;
        }
    },

    async sendOrderNotification(order: OrderData, storeName?: string, adminPhone?: string): Promise<boolean> {
        if (!adminPhone) {
            log("No admin phone configured for this store — skipping admin notification");
            return false;
        }

        const itemLines = order.items
            .map((i, idx) => `  ${idx + 1}. ${i.name} x ${i.quantity} — ${Number(i.unitPrice).toFixed(2)}`)
            .join("\n");

        const msg = [
            `🛒 New Order ${order.orderNumber}`,
            storeName ? `Store: ${storeName}` : "",
            `👤 ${order.customerName}`,
            `📞 ${order.customerPhone}`,
            order.customerAddress ? `📍 ${order.customerAddress}` : "",
            ``,
            `Items:`,
            itemLines,
            ``,
            `Subtotal: ${Number(order.subtotal).toFixed(2)}`,
            order.deliveryFee && Number(order.deliveryFee) > 0 ? `Delivery: ${Number(order.deliveryFee).toFixed(2)}` : "",
            `Total: ${Number(order.totalAmount).toFixed(2)}`,
            ``,
            `Type: ${order.orderType === "delivery" ? "🚚 Delivery" : "🏪 Pickup"}`,
            `Payment: ${order.paymentMethod}`,
            order.notes ? `Notes: ${order.notes}` : "",
        ]
            .filter(Boolean)
            .join("\n");

        return this.sendText(adminPhone, msg);
    },

    async sendCustomerConfirmation(
        customerPhone: string,
        orderNumber: string,
        storeName: string,
        totalAmount: string | number,
    ): Promise<boolean> {
        const msg = [
            `✅ Order Confirmed — ${orderNumber}`,
            ``,
            `Thank you for ordering from ${storeName}!`,
            `Total: ${Number(totalAmount).toFixed(2)}`,
            ``,
            `We'll update you when your order is being prepared.`,
            `If you have questions, reply to this message.`,
        ].join("\n");

        return this.sendText(customerPhone, msg);
    },

    async sendStatusUpdate(
        customerPhone: string,
        orderNumber: string,
        newStatus: string,
        storeName: string,
    ): Promise<boolean> {
        const statusText: Record<string, string> = {
            accepted: "✅ Your order has been accepted!",
            preparing: "👨‍🍳 Your order is being prepared…",
            ready: "🎉 Your order is ready for pickup/delivery!",
            delivered: "🚀 Your order has been delivered. Enjoy!",
            cancelled: "❌ Unfortunately your order has been cancelled.",
        };

        const text = statusText[newStatus] || `Order status: ${newStatus}`;
        const msg = `${storeName} — Order ${orderNumber}\n\n${text}`;
        return this.sendText(customerPhone, msg);
    },

    // ── Delivery Platform Notifications ───────────────────────────────────────

    /** Notify driver about new assignment + deep link to driver PWA */
    async sendDriverAssignment(
        driverPhone: string,
        driverName: string,
        orderId: number,
        customerAddress: string,
        storeName: string,
        driverToken: string,
        baseUrl: string,
    ): Promise<boolean> {
        const driverLink = `${baseUrl}/driver/${driverToken}`;
        const msg = [
            `🚗 New Delivery Assignment — ${storeName}`,
            ``,
            `Hi ${driverName}!`,
            `Order #${orderId} has been assigned to you.`,
            ``,
            `📍 Deliver to: ${customerAddress}`,
            ``,
            `Open the driver app to start navigation:`,
            driverLink,
        ].join("\n");
        return this.sendText(driverPhone, msg);
    },

    /** Send live tracking link to customer when driver picks up order */
    async sendOrderTracking(
        customerPhone: string,
        orderNumber: string,
        storeName: string,
        trackingToken: string,
        baseUrl: string,
    ): Promise<boolean> {
        const trackLink = `${baseUrl}/track/${trackingToken}`;
        const msg = [
            `🛵 Your order is on the way! — ${storeName}`,
            ``,
            `Order ${orderNumber} has been picked up and is heading your way.`,
            ``,
            `Track your delivery in real time:`,
            trackLink,
        ].join("\n");
        return this.sendText(customerPhone, msg);
    },

    /** Request a rating after successful delivery */
    async sendRatingRequest(
        customerPhone: string,
        orderNumber: string,
        storeName: string,
        orderId: number,
        baseUrl: string,
        slug: string,
    ): Promise<boolean> {
        const rateLink = `${baseUrl}/order/${slug}#rate-${orderId}`;
        const msg = [
            `⭐ How was your order? — ${storeName}`,
            ``,
            `Your order ${orderNumber} has been delivered. We hope you enjoyed it!`,
            ``,
            `Please take a moment to rate your experience:`,
            rateLink,
        ].join("\n");
        return this.sendText(customerPhone, msg);
    },

    /** Broadcast a promotional message to a customer */
    async sendPromoNotification(
        customerPhone: string,
        storeName: string,
        promoTitle: string,
        promoCode: string,
        expiryDate: string,
        baseUrl: string,
        slug: string,
    ): Promise<boolean> {
        const storeLink = `${baseUrl}/order/${slug}`;
        const msg = [
            `🎁 Special Offer from ${storeName}!`,
            ``,
            `${promoTitle}`,
            ``,
            `Use code: *${promoCode}*`,
            `Valid until: ${expiryDate}`,
            ``,
            `Order now:`,
            storeLink,
        ].join("\n");
        return this.sendText(customerPhone, msg);
    },

    // ── Food Tracker™ automatic milestone messages ────────────────────────────

    /** Sends the right WhatsApp message per order milestone (accepted/ready/on_way) */
    async sendFoodTrackerUpdate(
        customerPhone: string,
        orderNumber: string,
        storeName: string,
        status: string,
        trackingToken?: string,
        baseUrl?: string,
    ): Promise<boolean> {
        if (status === "accepted") {
            const msg = [
                `✅ Order Received — ${storeName}`,
                ``,
                `Order ${orderNumber} has been accepted and is now being prepared.`,
                `We'll notify you when it's on the way!`,
            ].join("\n");
            return this.sendText(customerPhone, msg);
        }

        if (status === "ready") {
            const msg = [
                `👨‍🍳 Order Ready — ${storeName}`,
                ``,
                `Order ${orderNumber} is ready and waiting for the driver.`,
                `Delivery is starting soon!`,
            ].join("\n");
            return this.sendText(customerPhone, msg);
        }

        if (status === "on_way" && trackingToken && baseUrl) {
            const trackLink = `${baseUrl}/track/${trackingToken}`;
            const msg = [
                `🛵 On the Way! — ${storeName}`,
                ``,
                `Your driver has picked up order ${orderNumber} and is heading to you.`,
                ``,
                `Live tracking:`,
                trackLink,
            ].join("\n");
            return this.sendText(customerPhone, msg);
        }

        return false;
    },
};
