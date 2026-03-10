/**
 * WhatsApp Service — uses wppconnect to send WhatsApp messages.
 *
 * Provides:
 *   • Session management (connect / disconnect / status / QR)
 *   • Order notification to admin
 *   • Customer order confirmation & status updates
 */

import wppconnect from "@wppconnect-team/wppconnect";

// ── Config ────────────────────────────────────────────────────────────────────
const ADMIN_PHONE = "201204593124"; // without leading "+"
const SESSION_NAME = "barmagly-pos";

// ── Types ─────────────────────────────────────────────────────────────────────
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

// ── Singleton state ───────────────────────────────────────────────────────────
let client: wppconnect.Whatsapp | null = null;
let status: WhatsAppStatus = "disconnected";
let lastQrCode: string | null = null;
let lastError: string | null = null;
let connectionLog: { time: string; event: string }[] = [];

function log(event: string) {
    const entry = { time: new Date().toISOString(), event };
    connectionLog.unshift(entry);
    if (connectionLog.length > 50) connectionLog.length = 50;
    console.log(`[WhatsApp] ${event}`);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
/**
 * Normalise a phone number to the wppconnect chatId format: <digits>@c.us
 */
function toChatId(phone: string): string {
    const digits = phone.replace(/\D/g, "");
    return `${digits}@c.us`;
}

// ── Service API ───────────────────────────────────────────────────────────────
export const whatsappService = {
    /** Current connection status */
    getStatus(): { status: WhatsAppStatus; lastError: string | null; log: typeof connectionLog } {
        return { status, lastError, log: connectionLog.slice(0, 20) };
    },

    /** Latest QR code (base64 PNG data-uri) for the admin to scan */
    getQrCode(): string | null {
        return lastQrCode;
    },

    /** Start / reconnect the WhatsApp session */
    async connect(): Promise<{ status: WhatsAppStatus; qrCode?: string }> {
        if (status === "connected" && client) {
            return { status: "connected" };
        }

        status = "connecting";
        lastError = null;
        lastQrCode = null;
        log("Connecting…");

        try {
            // Resolve Chrome path — puppeteer's bundled browser or system Chromium
            let browserPath: string | undefined;
            try {
                const puppeteer = await import("puppeteer");
                browserPath = (puppeteer as any).executablePath?.() || undefined;
            } catch { }
            // Fallback: common system paths
            if (!browserPath) {
                const { execSync } = await import("child_process");
                try {
                    browserPath = execSync("which chromium-browser || which chromium || which google-chrome-stable || which google-chrome", { encoding: "utf-8" }).trim();
                } catch { }
            }
            if (browserPath) log(`Using browser: ${browserPath}`);

            client = await wppconnect.create({
                session: SESSION_NAME,
                headless: true,
                devtools: false,
                useChrome: false,
                debug: false,
                logQR: false,
                autoClose: 0, // never auto-close
                browserArgs: [
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--disable-dev-shm-usage",
                    "--disable-gpu",
                    "--no-first-run",
                    "--no-zygote",
                    "--single-process",
                ],
                ...(browserPath ? { browserPathExecutable: browserPath } : {}),
                catchQR: (base64Qr: string, _asciiQR: string, _attempts: number, _urlCode?: string) => {
                    lastQrCode = base64Qr;
                    status = "qr_ready";
                    log("QR code generated — scan with WhatsApp");
                },
                statusFind: (statusSession: string, session: string) => {
                    log(`Session "${session}" status: ${statusSession}`);
                    if (statusSession === "inChat" || statusSession === "isLogged") {
                        status = "connected";
                        lastQrCode = null;
                        log("✅ Connected to WhatsApp");
                    }
                    if (statusSession === "notLogged" || statusSession === "browserClose" || statusSession === "desconnectedMobile") {
                        status = "disconnected";
                        log(`⚠ Disconnected: ${statusSession}`);
                    }
                },
            });

            status = "connected";
            lastQrCode = null;
            log("✅ WhatsApp client ready");

            // Listen for incoming messages (optional — admin can receive replies)
            client.onMessage(async (message: any) => {
                log(`Incoming message from ${message.from}: ${(message.body || "").slice(0, 80)}`);
            });

            return { status: "connected" };
        } catch (err: any) {
            lastError = err.message || String(err);
            status = "disconnected";
            log(`❌ Connection failed: ${lastError}`);
            return { status: "disconnected" };
        }
    },

    /** Gracefully disconnect */
    async disconnect(): Promise<void> {
        if (client) {
            try {
                await client.close();
            } catch { }
            client = null;
        }
        status = "disconnected";
        lastQrCode = null;
        log("Disconnected");
    },

    // ── Messaging ─────────────────────────────────────────────────────────────

    /** Send a text message. Returns true on success. */
    async sendText(phone: string, text: string): Promise<boolean> {
        if (!client || status !== "connected") {
            log(`Cannot send — status is "${status}"`);
            return false;
        }
        try {
            await client.sendText(toChatId(phone), text);
            log(`Message sent to ${phone}`);
            return true;
        } catch (err: any) {
            log(`Failed to send to ${phone}: ${err.message}`);
            return false;
        }
    },

    /** Notify admin about a new online order */
    async sendOrderNotification(order: OrderData, storeName?: string): Promise<boolean> {
        const itemLines = order.items
            .map((i, idx) => `  ${idx + 1}. ${i.name} × ${i.quantity} — ${Number(i.unitPrice).toFixed(2)}`)
            .join("\n");

        const msg = [
            `🛒 *New Order ${order.orderNumber}*`,
            storeName ? `📍 Store: ${storeName}` : "",
            `👤 ${order.customerName}`,
            `📱 ${order.customerPhone}`,
            order.customerAddress ? `🏠 ${order.customerAddress}` : "",
            ``,
            `📦 *Items:*`,
            itemLines,
            ``,
            `💰 Subtotal: ${Number(order.subtotal).toFixed(2)}`,
            order.deliveryFee && Number(order.deliveryFee) > 0 ? `🚚 Delivery: ${Number(order.deliveryFee).toFixed(2)}` : "",
            `💵 *Total: ${Number(order.totalAmount).toFixed(2)}*`,
            ``,
            `📋 Type: ${order.orderType === "delivery" ? "🚚 Delivery" : "🏪 Pickup"}`,
            `💳 Payment: ${order.paymentMethod}`,
            order.notes ? `📝 Notes: ${order.notes}` : "",
        ]
            .filter(Boolean)
            .join("\n");

        return this.sendText(ADMIN_PHONE, msg);
    },

    /** Send order confirmation to the customer */
    async sendCustomerConfirmation(
        customerPhone: string,
        orderNumber: string,
        storeName: string,
        totalAmount: string | number,
    ): Promise<boolean> {
        const msg = [
            `✅ *Order Confirmed — ${orderNumber}*`,
            ``,
            `Thank you for ordering from *${storeName}*! 🎉`,
            `Total: *${Number(totalAmount).toFixed(2)}*`,
            ``,
            `We'll update you when your order is being prepared.`,
            `If you have questions, reply to this message.`,
        ].join("\n");

        return this.sendText(customerPhone, msg);
    },

    /** Notify customer about order status changes */
    async sendStatusUpdate(
        customerPhone: string,
        orderNumber: string,
        newStatus: string,
        storeName: string,
    ): Promise<boolean> {
        const statusEmoji: Record<string, string> = {
            accepted: "👍",
            preparing: "👨‍🍳",
            ready: "✅",
            delivered: "🎉",
            cancelled: "❌",
        };

        const statusText: Record<string, string> = {
            accepted: "Your order has been accepted!",
            preparing: "Your order is being prepared…",
            ready: "Your order is ready for pickup/delivery!",
            delivered: "Your order has been delivered. Enjoy! 🎉",
            cancelled: "Unfortunately your order has been cancelled.",
        };

        const emoji = statusEmoji[newStatus] || "📋";
        const text = statusText[newStatus] || `Order status: ${newStatus}`;

        const msg = `${emoji} *${storeName} — Order ${orderNumber}*\n\n${text}`;
        return this.sendText(customerPhone, msg);
    },
};
