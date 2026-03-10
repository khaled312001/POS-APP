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
let clientReady = false;
let status: WhatsAppStatus = "disconnected";
let lastQrCode: string | null = null;
let lastError: string | null = null;
let connectionLog: { time: string; event: string }[] = [];
let connecting = false;

// Track the directories created for the active session so we can wipe them on disconnect
let activeChromeDir: string | null = null;
let activeTokenDir: string | null = null;

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

/** Kill ALL wppconnect-related chrome processes and clean /tmp dirs */
async function nukeResidualProcesses() {
    try {
        const { execSync } = await import("child_process");
        // Kill any chromium process that has a wppconnect dir in its command line
        execSync(
            `pkill -9 -f 'wppconnect' 2>/dev/null; pkill -9 -f 'chromium.*barmagly' 2>/dev/null; true`,
            { timeout: 4000 }
        );
        await new Promise(r => setTimeout(r, 1000));
    } catch { }

    // Remove ALL wppconnect temp dirs from /tmp
    try {
        const fs = await import("fs");
        const entries = fs.readdirSync("/tmp").filter(d =>
            d.startsWith("wppconnect-") || d.startsWith("barmagly-")
        );
        for (const e of entries) {
            try { fs.rmSync(`/tmp/${e}`, { recursive: true, force: true }); } catch { }
        }
    } catch { }
}

export const whatsappService = {
    getStatus(): { status: WhatsAppStatus; lastError: string | null; log: typeof connectionLog } {
        return { status, lastError, log: connectionLog.slice(0, 20) };
    },

    getQrCode(): string | null {
        return lastQrCode;
    },

    async connect(): Promise<{ status: WhatsAppStatus; qrCode?: string }> {
        if (clientReady && status === "connected" && client) {
            return { status: "connected" };
        }

        if (connecting) {
            log("Connection already in progress — ignored duplicate request");
            return { status };
        }
        connecting = true;
        clientReady = false;

        // Close any lingering client gracefully
        if (client) {
            try { await client.close(); } catch { }
            client = null;
        }

        // Kill orphaned chrome processes + wipe all wppconnect /tmp dirs
        await nukeResidualProcesses();
        log("Cleared all previous session data");

        const wpp = await loadWppConnect();
        if (!wpp) {
            lastError = "@wppconnect-team/wppconnect package not installed";
            connecting = false;
            return { status: "disconnected" };
        }

        // Also clear wppconnect's internal session registry
        try {
            if (typeof wpp.kill === "function") await wpp.kill(SESSION_NAME).catch(() => {});
        } catch { }
        try {
            if (typeof wpp.deleteSession === "function") await wpp.deleteSession(SESSION_NAME).catch(() => {});
        } catch { }

        status = "connecting";
        lastError = null;
        lastQrCode = null;
        log("Connecting…");

        try {
            const { execSync } = await import("child_process");
            const fs = await import("fs");

            // ----- locate chromium -----
            let browserPath: string | undefined;

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
                    if (found && fs.existsSync(found)) browserPath = found;
                } catch { }
            }

            if (!browserPath) {
                try {
                    const nixFound = execSync(
                        "find /nix/store -maxdepth 4 -name 'chromium' -type f 2>/dev/null | grep '/bin/chromium$' | head -1",
                        { encoding: "utf-8", timeout: 8000 }
                    ).trim();
                    if (nixFound && fs.existsSync(nixFound)) browserPath = nixFound;
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
                    if (ep && fs.existsSync(ep)) browserPath = ep;
                } catch { }
            }

            if (!browserPath) throw new Error("No Chrome/Chromium found.");
            log(`Using browser: ${browserPath}`);

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
                "--window-size=1280,800",
            ];

            // Use fresh unique dirs per connection attempt — eliminates "browser already running"
            const ts = Date.now();
            const CHROME_DATA_DIR = `/tmp/wppconnect-chrome-${ts}`;
            const TOKEN_DIR = `/tmp/wppconnect-tokens-${ts}`;
            fs.mkdirSync(CHROME_DATA_DIR, { recursive: true });
            fs.mkdirSync(TOKEN_DIR, { recursive: true });
            activeChromeDir = CHROME_DATA_DIR;
            activeTokenDir = TOKEN_DIR;

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
                    userDataDir: CHROME_DATA_DIR,
                },
                browserArgs,
                catchQR: (base64Qr: string) => {
                    lastQrCode = base64Qr;
                    status = "qr_ready";
                    log("QR code generated — scan with WhatsApp");
                },
                statusFind: (statusSession: string, session: string) => {
                    log(`Session "${session}": ${statusSession}`);
                    // Only process disconnect events AFTER we are fully ready
                    if (clientReady) {
                        if (
                            statusSession === "notLogged" ||
                            statusSession === "browserClose" ||
                            statusSession === "desconnectedMobile" ||
                            statusSession === "disconnectedMobile"
                        ) {
                            status = "disconnected";
                            clientReady = false;
                            client = null;
                            log(`Disconnected: ${statusSession}`);
                        }
                    }
                },
            });

            // Wait for the WPP injection to settle before marking ready
            await new Promise(r => setTimeout(r, 4000));

            status = "connected";
            clientReady = true;
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
            clientReady = false;
            connecting = false;
            log(`Connection failed: ${lastError}`);
            return { status: "disconnected" };
        }
    },

    async disconnect(): Promise<void> {
        if (client) {
            try { await client.close(); } catch { }
            client = null;
        }
        await nukeResidualProcesses();
        status = "disconnected";
        clientReady = false;
        lastQrCode = null;
        connecting = false;
        activeChromeDir = null;
        activeTokenDir = null;
        log("Disconnected");
    },

    async sendText(phone: string, text: string, _attempt = 1): Promise<boolean> {
        if (!client || !clientReady || status !== "connected") {
            log(`Cannot send — not ready (status="${status}", ready=${clientReady})`);
            return false;
        }
        try {
            await client.sendText(toChatId(phone), text);
            log(`Message sent to ${phone}`);
            return true;
        } catch (err: any) {
            const msg = typeof err === "object" ? (err.message || JSON.stringify(err)) : String(err);
            log(`Failed to send to ${phone}: ${msg}`);

            // Transient injection lag — retry with backoff (up to 3 retries)
            if (
                (msg.includes("WPP is not defined") || msg.includes("NotInitializedError")) &&
                _attempt < 4
            ) {
                log(`Retrying send (attempt ${_attempt + 1})…`);
                await new Promise(r => setTimeout(r, 2500 * _attempt));
                return this.sendText(phone, text, _attempt + 1);
            }

            // Fatal browser errors — mark as disconnected
            if (
                msg.includes("Execution context was destroyed") ||
                msg.includes("Protocol error") ||
                msg.includes("Session closed") ||
                msg.includes("Target closed")
            ) {
                log("Client appears broken — marking as disconnected");
                clientReady = false;
                status = "disconnected";
                client = null;
            }
            return false;
        }
    },

    async sendOrderNotification(order: OrderData, storeName?: string): Promise<boolean> {
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

        return this.sendText(ADMIN_PHONE, msg);
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
};
