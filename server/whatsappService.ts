/**
 * WhatsApp Service — uses wppconnect to send WhatsApp messages.
 *
 * Provides:
 *   • Session management (connect / disconnect / status / QR)
 *   • Order notification to admin
 *   • Customer order confirmation & status updates
 *
 * The heavy @wppconnect-team/wppconnect dependency is loaded lazily
 * so the server can start even when the package is not installed.
 */

let wppconnect: any = null;

async function loadWppConnect() {
  if (!wppconnect) {
    try {
      wppconnect = (await import("@wppconnect-team/wppconnect")).default;
    } catch {
      console.warn("[WhatsApp] @wppconnect-team/wppconnect not installed — WhatsApp features disabled");
      return null;
    }
  }
  return wppconnect;
}

const ADMIN_PHONE = "201204593124";
const SESSION_NAME = "barmagly-pos";

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

let client: any = null;
let status: WhatsAppStatus = "disconnected";
let lastQrCode: string | null = null;
let lastError: string | null = null;
let connectionLog: { time: string; event: string }[] = [];
let connecting = false;

function log(event: string) {
    const entry = { time: new Date().toISOString(), event };
    connectionLog.unshift(entry);
    if (connectionLog.length > 50) connectionLog.length = 50;
    console.log(`[WhatsApp] ${event}`);
}

function toChatId(phone: string): string {
    const digits = phone.replace(/\D/g, "");
    return `${digits}@c.us`;
}

export const whatsappService = {
    getStatus(): { status: WhatsAppStatus; lastError: string | null; log: typeof connectionLog } {
        return { status, lastError, log: connectionLog.slice(0, 20) };
    },

    getQrCode(): string | null {
        return lastQrCode;
    },

    async connect(): Promise<{ status: WhatsAppStatus; qrCode?: string }> {
        if (status === "connected" && client) {
            return { status: "connected" };
        }

        // Prevent concurrent connection attempts
        if (connecting) {
            log("Connection already in progress — ignored duplicate request");
            return { status };
        }
        connecting = true;

        // Tear down any lingering client before starting fresh
        if (client) {
            try { await client.close(); } catch { }
            client = null;
        }

        const wpp = await loadWppConnect();
        if (!wpp) {
            lastError = "@wppconnect-team/wppconnect package not installed";
            connecting = false;
            return { status: "disconnected" };
        }

        status = "connecting";
        lastError = null;
        lastQrCode = null;
        log("Connecting…");

        try {
            let browserPath: string | undefined;
            const { execSync } = await import("child_process");
            const fs = await import("fs");

            const envChrome = process.env.CHROME_PATH || process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROMIUM_PATH;
            if (envChrome && fs.existsSync(envChrome)) {
                browserPath = envChrome;
                log(`Using env CHROME_PATH: ${browserPath}`);
            }

            if (!browserPath) {
                try {
                    const found = execSync(
                        "which chromium 2>/dev/null || which chromium-browser 2>/dev/null || which google-chrome-stable 2>/dev/null || which google-chrome 2>/dev/null",
                        { encoding: "utf-8", timeout: 5000 }
                    ).trim().split("\n")[0];
                    if (found && fs.existsSync(found)) { browserPath = found; }
                } catch { }
            }

            if (!browserPath) {
                try {
                    const nixFound = execSync(
                        "find /nix/store -maxdepth 4 -name 'chromium' -type f 2>/dev/null | grep '/bin/chromium$' | head -1",
                        { encoding: "utf-8", timeout: 8000 }
                    ).trim();
                    if (nixFound && fs.existsSync(nixFound)) { browserPath = nixFound; }
                } catch { }
            }

            if (!browserPath) {
                for (const c of [
                    "/run/current-system/sw/bin/chromium",
                    "/home/runner/.nix-profile/bin/chromium",
                    "/usr/bin/chromium",
                    "/usr/bin/chromium-browser",
                    "/snap/bin/chromium",
                    "/usr/bin/google-chrome-stable",
                ]) {
                    if (fs.existsSync(c)) { browserPath = c; break; }
                }
            }

            if (!browserPath) {
                try {
                    const { executablePath } = await import("puppeteer");
                    const ep = executablePath();
                    if (ep && fs.existsSync(ep)) { browserPath = ep; }
                } catch { }
            }

            if (browserPath) {
                log(`Using browser: ${browserPath}`);
            } else {
                throw new Error("No Chrome/Chromium found.");
            }

            const browserArgs = [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu",
                "--no-first-run",
                "--no-zygote",
                "--disable-extensions",
                "--disable-software-rasterizer",
                "--disable-features=VizDisplayCompositor",
            ];

            // Use an absolute token dir so cleanup is reliable
            const TOKEN_DIR = "/tmp/wppconnect-tokens";
            try {
                const sessionTokenDir = TOKEN_DIR + "/" + SESSION_NAME;
                if (fs.existsSync(sessionTokenDir)) {
                    fs.rmSync(sessionTokenDir, { recursive: true, force: true });
                }
                fs.mkdirSync(TOKEN_DIR, { recursive: true });
                log("Cleared old session tokens");
            } catch { /* ignore cleanup errors */ }

            client = await wpp.create({
                session: SESSION_NAME,
                folderNameToken: TOKEN_DIR,
                headless: true,
                devtools: false,
                useChrome: false,
                debug: false,
                logQR: false,
                autoClose: 0,
                disableWelcome: true,
                puppeteerOptions: {
                    executablePath: browserPath,
                    args: browserArgs,
                    headless: true,
                    userDataDir: `/tmp/wppconnect-chrome-${SESSION_NAME}`,
                },
                browserArgs,
                catchQR: (base64Qr: string) => {
                    lastQrCode = base64Qr;
                    status = "qr_ready";
                    log("QR code generated — scan with WhatsApp");
                },
                statusFind: (statusSession: string, session: string) => {
                    log(`Session "${session}": ${statusSession}`);
                    if (statusSession === "inChat" || statusSession === "isLogged") {
                        status = "connected";
                        lastQrCode = null;
                        connecting = false;
                        log("Connected to WhatsApp");
                    }
                    if (
                        statusSession === "notLogged" ||
                        statusSession === "browserClose" ||
                        statusSession === "desconnectedMobile"
                    ) {
                        // Ignore stale events from a previous session instance
                        if (!connecting) {
                            status = "disconnected";
                            log(`Disconnected: ${statusSession}`);
                        }
                    }
                },
            });

            status = "connected";
            lastQrCode = null;
            connecting = false;
            log("WhatsApp client ready");

            client.onMessage(async (message: any) => {
                log(`Msg from ${message.from}: ${(message.body || "").slice(0, 80)}`);
            });

            return { status: "connected" };
        } catch (err: any) {
            lastError = err.message || String(err);
            status = "disconnected";
            connecting = false;
            log(`Connection failed: ${lastError}`);
            return { status: "disconnected" };
        }
    },

    async disconnect(): Promise<void> {
        if (client) {
            try {
                await client.close();
            } catch { }
            client = null;
        }
        status = "disconnected";
        lastQrCode = null;
        connecting = false;
        log("Disconnected");
    },

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

    async sendOrderNotification(order: OrderData, storeName?: string): Promise<boolean> {
        const itemLines = order.items
            .map((i, idx) => `  ${idx + 1}. ${i.name} x ${i.quantity} — ${Number(i.unitPrice).toFixed(2)}`)
            .join("\n");

        const msg = [
            `New Order ${order.orderNumber}`,
            storeName ? `Store: ${storeName}` : "",
            `${order.customerName}`,
            `${order.customerPhone}`,
            order.customerAddress ? `${order.customerAddress}` : "",
            ``,
            `Items:`,
            itemLines,
            ``,
            `Subtotal: ${Number(order.subtotal).toFixed(2)}`,
            order.deliveryFee && Number(order.deliveryFee) > 0 ? `Delivery: ${Number(order.deliveryFee).toFixed(2)}` : "",
            `Total: ${Number(order.totalAmount).toFixed(2)}`,
            ``,
            `Type: ${order.orderType === "delivery" ? "Delivery" : "Pickup"}`,
            `Payment: ${order.paymentMethod}`,
            order.notes ? `Notes: ${order.notes}` : "",
        ]
            .filter(Boolean)
            .join("\n");

        return this.sendText(ADMIN_PHONE, msg);
    },

    async sendCustomerConfirmation(
        customerPhone: string,
        orderNumber: string,
        storeName: string,
        totalAmount: string | number,
    ): Promise<boolean> {
        const msg = [
            `Order Confirmed — ${orderNumber}`,
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
            accepted: "Your order has been accepted!",
            preparing: "Your order is being prepared…",
            ready: "Your order is ready for pickup/delivery!",
            delivered: "Your order has been delivered. Enjoy!",
            cancelled: "Unfortunately your order has been cancelled.",
        };

        const text = statusText[newStatus] || `Order status: ${newStatus}`;
        const msg = `${storeName} — Order ${orderNumber}\n\n${text}`;
        return this.sendText(customerPhone, msg);
    },
};
