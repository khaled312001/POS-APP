import os from 'os';
import path from 'path';
import fs from 'fs';

let wppconnect: any = null;

async function loadWppConnect() {
    if (!wppconnect) {
        console.log("[WhatsApp] Attempting to load @wppconnect-team/wppconnect...");
        try {
            const mod = await import("@wppconnect-team/wppconnect");
            wppconnect = mod.default ?? mod;
            console.log("[WhatsApp] Successfully loaded @wppconnect-team/wppconnect");
        } catch (err: any) {
            console.error("[WhatsApp] FAIL to load wppconnect:", err);
            return null;
        }
    }
    return wppconnect;
}

const ADMIN_PHONE = "201204593124";
const SESSION_NAME = "barmagly-pos";
const STORAGE_DIR = path.resolve(process.cwd(), ".wppconnect");
const CHROME_DATA_DIR = path.join(STORAGE_DIR, "chrome-data");
const TOKEN_DIR = path.join(STORAGE_DIR, "tokens");

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
let connectionPhase: "idle" | "starting" | "awaiting_qr" | "qr_scanned" | "ready" = "idle";
let autoReconnectTimer: any = null;
let pendingMessages: { phone: string; text: string; timestamp: number }[] = [];

function log(event: string) {
    const entry = { time: new Date().toISOString(), event };
    connectionLog.unshift(entry);
    if (connectionLog.length > 100) connectionLog.length = 100;
    console.log(`[WhatsApp] ${event}`);
}

function toChatId(phone: string): string {
    const digits = phone.replace(/\D/g, "");
    return `${digits}@c.us`;
}

async function cleanupProcesses() {
    // Only cleanup if we are not on Windows or if we really need to force a reset.
    // On Windows, taskkill is noisy and often unnecessary if we use a stable userDataDir.
    const isWindows = os.platform() === 'win32';
    if (!isWindows) {
        try {
            const { execSync } = await import("child_process");
            execSync(
                `pkill -9 -f 'wppconnect' 2>/dev/null; pkill -9 -f 'chromium.*barmagly' 2>/dev/null; true`,
                { timeout: 4000 }
            );
            await new Promise(r => setTimeout(r, 500));
        } catch { }
    }

    // We don't wipe the whole /tmp anymore to preserve session data.
    // Instead, we just ensure the STORAGE_DIR exists.
    if (!fs.existsSync(STORAGE_DIR)) {
        fs.mkdirSync(STORAGE_DIR, { recursive: true });
    }
}

async function isClientAlive(): Promise<boolean> {
    if (!client) return false;
    try {
        const state = await Promise.race([
            client.getConnectionState(),
            new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 5000))
        ]);
        return state === "CONNECTED";
    } catch {
        return false;
    }
}

function scheduleAutoReconnect() {
    if (autoReconnectTimer) clearTimeout(autoReconnectTimer);
    autoReconnectTimer = setTimeout(async () => {
        autoReconnectTimer = null;
        if (status === "disconnected" && !connecting) {
            log("Auto-reconnecting…");
            try {
                await whatsappService.connect();
                if (whatsappService.getStatus().status === "connected" && pendingMessages.length > 0) {
                    log(`Flushing ${pendingMessages.length} queued message(s)`);
                    const toSend = [...pendingMessages];
                    pendingMessages = [];
                    for (const m of toSend) {
                        if (Date.now() - m.timestamp < 10 * 60 * 1000) {
                            await whatsappService.sendText(m.phone, m.text);
                        } else {
                            log(`Dropped stale queued message for ${m.phone} (>10min old)`);
                        }
                    }
                }
            } catch (err: any) {
                log(`Auto-reconnect failed: ${err.message}`);
                scheduleAutoReconnect();
            }
        }
    }, 15000);
}

async function _connectBackground(wpp: any): Promise<void> {
    try {
        const { execSync } = await import("child_process");
        const fsMod = await import("fs");

        let browserPath: string | undefined;

        const envChrome = process.env.CHROME_PATH || process.env.PUPPETEER_EXECUTABLE_PATH;
        if (envChrome && fsMod.existsSync(envChrome)) {
            browserPath = envChrome;
            log(`Using env override: ${browserPath}`);
        }

        const isWindows = os.platform() === 'win32';

        if (!browserPath && !isWindows) {
            try {
                const found = execSync(
                    "which chromium 2>/dev/null || which chromium-browser 2>/dev/null || which google-chrome-stable 2>/dev/null || which google-chrome 2>/dev/null",
                    { encoding: "utf-8", timeout: 5000 }
                ).trim().split("\n")[0];
                if (found && fsMod.existsSync(found)) { browserPath = found; }
            } catch { }
        }

        if (!browserPath && !isWindows) {
            try {
                const nixFound = execSync(
                    "find /nix/store -maxdepth 4 -name 'chromium' -type f 2>/dev/null | grep '/bin/chromium$' | head -1",
                    { encoding: "utf-8", timeout: 8000 }
                ).trim();
                if (nixFound && fsMod.existsSync(nixFound)) { browserPath = nixFound; }
            } catch { }
        }

        // Windows: search common Chrome/Chromium install paths
        if (!browserPath && isWindows) {
            const username = os.userInfo().username;
            const windowsPaths = [
                'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
                'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
                `C:\\Users\\${username}\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe`,
                'C:\\Program Files\\Chromium\\Application\\chromium.exe',
                `C:\\Users\\${username}\\AppData\\Local\\Chromium\\Application\\chrome.exe`,
            ];
            for (const p of windowsPaths) {
                if (fsMod.existsSync(p)) { browserPath = p; break; }
            }
        }

        if (!browserPath) {
            try {
                const { executablePath } = await import("puppeteer");
                const ep = executablePath();
                if (ep && fsMod.existsSync(ep)) { browserPath = ep; }
            } catch { }
        }

        if (!browserPath) throw new Error("No Chrome/Chromium found. Set CHROME_PATH environment variable.");
        log(`Using browser: ${browserPath}`);

        fsMod.mkdirSync(CHROME_DATA_DIR, { recursive: true });
        fsMod.mkdirSync(TOKEN_DIR, { recursive: true });

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

        connectionPhase = "awaiting_qr";

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
                connectionPhase = "awaiting_qr";
                log("QR code generated — scan with WhatsApp");
            },
            statusFind: (statusSession: string, session: string) => {
                log(`Session "${session}": ${statusSession}`);

                if (statusSession === "qrReadSuccess") {
                    connectionPhase = "qr_scanned";
                    log("QR scanned successfully — waiting for session to stabilize");
                }

                if (statusSession === "inChat" || statusSession === "isLogged") {
                    if (connectionPhase !== "ready") {
                        connectionPhase = "qr_scanned";
                    }
                }

                if (connectionPhase === "ready") {
                    if (
                        statusSession === "notLogged" ||
                        statusSession === "browserClose" ||
                        statusSession === "desconnectedMobile" ||
                        statusSession === "disconnectedMobile"
                    ) {
                        status = "disconnected";
                        clientReady = false;
                        client = null;
                        connectionPhase = "idle";
                        log(`Session lost: ${statusSession} — will auto-reconnect in 15s`);
                        scheduleAutoReconnect();
                    }
                }
            },
        });

        log("WPP client created — waiting for session to stabilize...");
        await new Promise(r => setTimeout(r, 6000));

        const alive = await isClientAlive();
        if (!alive) {
            log("Client not alive after stabilization — retrying connection state check...");
            await new Promise(r => setTimeout(r, 5000));
            const retryAlive = await isClientAlive();
            if (!retryAlive) {
                throw new Error("WhatsApp session failed to stabilize after QR scan");
            }
        }

        status = "connected";
        clientReady = true;
        connectionPhase = "ready";
        lastQrCode = null;
        connecting = false;
        log("WhatsApp client ready and verified");

        client.onMessage(async (message: any) => {
            log(`Msg from ${message.from}: ${(message.body || "").slice(0, 80)}`);
        });
    } catch (err: any) {
        lastError = err.message || String(err);
        status = "disconnected";
        clientReady = false;
        connecting = false;
        connectionPhase = "idle";
        log(`Connection failed: ${lastError}`);
    }
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
            const alive = await isClientAlive();
            if (alive) return { status: "connected" };
            log("Client was marked connected but is actually dead — reconnecting");
            clientReady = false;
            status = "disconnected";
            client = null;
        }

        if (connecting) {
            log("Connection already in progress — ignored duplicate request");
            return { status };
        }
        connecting = true;
        connectionPhase = "starting";
        clientReady = false;

        if (client) {
            try { await client.close(); } catch { }
            client = null;
        }

        await cleanupProcesses();
        log("Cleared previous session data");

        const wpp = await loadWppConnect();
        if (!wpp) {
            lastError = "@wppconnect-team/wppconnect package not installed";
            connecting = false;
            connectionPhase = "idle";
            return { status: "disconnected" };
        }

        status = "connecting";
        lastError = null;
        lastQrCode = null;
        log("Connecting…");

        // Run in background so the HTTP request returns immediately.
        // The frontend should poll /status and /qr until QR appears or connected.
        _connectBackground(wpp);
        return { status: "connecting" };
    },

    async disconnect(): Promise<void> {
        if (autoReconnectTimer) { clearTimeout(autoReconnectTimer); autoReconnectTimer = null; }
        if (client) {
            try { await client.close(); } catch { }
            client = null;
        }
        await cleanupProcesses();
        status = "disconnected";
        clientReady = false;
        lastQrCode = null;
        connecting = false;
        connectionPhase = "idle";
        pendingMessages = [];
        log("Disconnected (manual)");
    },

    async sendText(phone: string, text: string, _attempt = 1): Promise<boolean> {
        if (!client || !clientReady || status !== "connected") {
            log(`Cannot send — not ready (status="${status}"). Queuing message for ${phone}`);
            pendingMessages.push({ phone, text, timestamp: Date.now() });
            if (pendingMessages.length > 50) pendingMessages.shift();
            scheduleAutoReconnect();
            return false;
        }

        if (_attempt === 1) {
            const alive = await isClientAlive();
            if (!alive) {
                log("Client not alive when trying to send — queuing and reconnecting");
                clientReady = false;
                status = "disconnected";
                client = null;
                connectionPhase = "idle";
                pendingMessages.push({ phone, text, timestamp: Date.now() });
                if (pendingMessages.length > 50) pendingMessages.shift();
                scheduleAutoReconnect();
                return false;
            }
        }

        try {
            const resolvedChatId = toChatId(phone);
            log(`Attempting to send message to resolved chatId: ${resolvedChatId}`);

            const result = await client.sendText(resolvedChatId, text);
            log(`Message successfully sent to ${phone}`);
            console.log(`[WhatsApp Detailed Log] sendText result for ${phone}:`, JSON.stringify(result));
            return true;
        } catch (err: any) {
            const msg = typeof err === "object" ? (err.message || JSON.stringify(err)) : String(err);
            log(`Failed to send to ${phone}: ${msg}`);

            if (
                (msg.includes("WPP is not defined") || msg.includes("NotInitializedError")) &&
                _attempt < 4
            ) {
                log(`Retrying send (attempt ${_attempt + 1})…`);
                await new Promise(r => setTimeout(r, 2500 * _attempt));
                return this.sendText(phone, text, _attempt + 1);
            }

            if (
                msg.includes("Execution context was destroyed") ||
                msg.includes("Protocol error") ||
                msg.includes("Session closed") ||
                msg.includes("Target closed")
            ) {
                log("Client browser crashed — marking as disconnected");
                clientReady = false;
                status = "disconnected";
                client = null;
                connectionPhase = "idle";
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
