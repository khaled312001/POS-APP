/**
 * WhatsApp messaging for the platform and for each store.
 *
 * The sessions themselves live in the WhatsApp bridge process
 * (server/waBridge.ts), reached through server/waClient.ts:
 *   - "platform"      the platform's own number (verification codes, and the
 *                     fallback sender for stores that haven't linked one);
 *   - "t<tenantId>"   a store's own WhatsApp, linked by the store owner.
 * Order messages for a store go out from the store's own number when it is
 * linked, using the store's templates (server/waTemplates.ts).
 */
import { bridge, ensureBridge, startBridgeWatchdog } from "./waClient";
import { renderTemplate, resolveTemplate, statusEvent, type TemplateLang, type TemplateEvent } from "./waTemplates";

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

export interface SessionView {
    key: string;
    status: WhatsAppStatus;
    qrCode: string | null;
    phone: string | null;
    name: string | null;
    lastError: string | null;
    connectedAt: string | null;
    linked: boolean;
    pending: number;
    log: { time: string; event: string }[];
}

const EMPTY: SessionView = {
    key: "platform", status: "disconnected", qrCode: null, phone: null, name: null,
    lastError: null, connectedAt: null, linked: false, pending: 0, log: [],
};

export const storeKey = (tenantId: number) => `t${tenantId}`;

// Several routes read the platform status synchronously, so keep a copy that
// is refreshed in the background and after every action.
let platform: SessionView = { ...EMPTY };
let refreshTimer: any = null;

async function refreshPlatform(): Promise<SessionView> {
    try {
        platform = await bridge<SessionView>("GET", "/status?key=platform", undefined, 5000);
    } catch (e: any) {
        platform = { ...platform, status: "disconnected", lastError: e?.message || String(e) };
    }
    return platform;
}

// Short cache so a burst of order messages doesn't ask the bridge each time.
const storeCache = new Map<number, { at: number; view: SessionView }>();

export async function storeSession(tenantId: number, fresh = false): Promise<SessionView> {
    const hit = storeCache.get(tenantId);
    if (!fresh && hit && Date.now() - hit.at < 5000) return hit.view;
    try {
        const view = await bridge<SessionView>("GET", `/status?key=${storeKey(tenantId)}`, undefined, 5000);
        storeCache.set(tenantId, { at: Date.now(), view });
        return view;
    } catch {
        return { ...EMPTY, key: storeKey(tenantId) };
    }
}

async function sendVia(key: string, to: string, text: string): Promise<{ ok: boolean; queued?: boolean; error?: string }> {
    try {
        return await bridge("POST", "/send", { key, to, text, wait: true }, 60000);
    } catch (e: any) {
        return { ok: false, error: e?.message || String(e) };
    }
}

// ── Store context for templates ─────────────────────────────────────────────
interface StoreContext { name: string; meta: any; currency: string; lang: TemplateLang }

async function storeContext(tenantId: number): Promise<StoreContext> {
    const { storage } = await import("./storage");
    const tenant: any = await storage.getTenant(tenantId);
    let currency = "CHF";
    try {
        const { pool } = await import("./db");
        const [rows]: any = await pool.query(
            "SELECT currency FROM branches WHERE tenant_id = ? ORDER BY is_main DESC, id LIMIT 1", [tenantId]);
        if (rows?.[0]?.currency) currency = String(rows[0].currency);
    } catch { }
    const meta = (tenant?.metadata as any) || {};
    const lang: TemplateLang = meta.whatsappTemplates?.lang || (currency === "SYP" ? "ar" : "en");
    return { name: tenant?.businessName || "Store", meta, currency, lang };
}

const ZERO_DECIMAL = new Set(["SYP", "IQD", "LBP", "JPY", "KRW"]);
function money(v: unknown, currency: string): string {
    const n = Number(v) || 0;
    if (ZERO_DECIMAL.has(currency)) {
        const s = Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        return currency === "SYP" ? `${s} ل.س` : `${s} ${currency}`;
    }
    return `${n.toFixed(2)} ${currency}`;
}

function orderVars(order: OrderData, ctx: StoreContext) {
    const ar = ctx.lang === "ar";
    const payment: Record<string, string> = ar
        ? { cash: "نقداً", card: "بطاقة", shamcash: "شام كاش", online: "دفع إلكتروني", credit: "آجل" }
        : { cash: "Cash", card: "Card", shamcash: "Sham Cash", online: "Online", credit: "On account" };
    return {
        orderNumber: order.orderNumber,
        storeName: ctx.name,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        address: order.customerAddress || "",
        items: (order.items || [])
            .map((i, idx) => `  ${idx + 1}. ${i.name} × ${i.quantity} — ${money(i.unitPrice, ctx.currency)}`)
            .join("\n"),
        subtotal: money(order.subtotal, ctx.currency),
        deliveryFee: order.deliveryFee && Number(order.deliveryFee) > 0 ? money(order.deliveryFee, ctx.currency) : "",
        total: money(order.totalAmount, ctx.currency),
        orderType: order.orderType === "delivery" ? (ar ? "🚚 توصيل" : "🚚 Delivery") : (ar ? "🏪 استلام" : "🏪 Pickup"),
        paymentMethod: payment[order.paymentMethod] || order.paymentMethod,
        notes: order.notes || "",
    };
}

function templateText(ctx: StoreContext, event: TemplateEvent, vars: Record<string, any>): string | null {
    const t = resolveTemplate(ctx.meta.whatsappTemplates, event, ctx.lang);
    return t.enabled ? renderTemplate(t.text, vars) : null;
}

export const whatsappService = {
    // ── Platform session ────────────────────────────────────────────────────
    getStatus(): { status: WhatsAppStatus; lastError: string | null; log: SessionView["log"]; phase: string } {
        const phase = platform.status === "connected" ? "ready" : platform.status === "qr_ready" ? "awaiting_qr" : platform.status === "connecting" ? "starting" : "idle";
        return { status: platform.status, lastError: platform.lastError, log: platform.log || [], phase };
    },

    getQrCode(): string | null {
        return platform.qrCode;
    },

    hasSession(): boolean {
        return !!platform.linked;
    },

    sessionModified(): string | null {
        return platform.connectedAt;
    },

    /** On boot: make sure the bridge runs (it resumes every linked session). */
    async autoConnect(): Promise<void> {
        if (process.env.WHATSAPP_DISABLED === "1") return;
        startBridgeWatchdog();
        await ensureBridge();
        if (!refreshTimer) {
            refreshTimer = setInterval(() => { refreshPlatform().catch(() => { }); }, 5000);
            refreshTimer.unref?.();
        }
        await refreshPlatform();
    },

    async connect(): Promise<{ status: WhatsAppStatus; qrCode?: string }> {
        if (process.env.WHATSAPP_DISABLED === "1") return { status: "disconnected" };
        platform = await bridge<SessionView>("POST", "/connect", { key: "platform" }, 15000);
        return { status: platform.status, qrCode: platform.qrCode || undefined };
    },

    async disconnect(): Promise<void> {
        platform = await bridge<SessionView>("POST", "/disconnect", { key: "platform" });
    },

    async logout(): Promise<void> {
        platform = await bridge<SessionView>("POST", "/logout", { key: "platform" });
    },

    /** Alias — several routes historically call sendMessage(). */
    async sendMessage(phone: string, text: string, tenantId?: number): Promise<boolean> {
        return this.sendText(phone, text, tenantId);
    },

    /**
     * Send from the store's own WhatsApp when it is linked, else from the
     * platform number. true = sent, or queued on a linked session (it goes
     * out as soon as the session is back).
     */
    async sendText(phone: string, text: string, tenantId?: number): Promise<boolean> {
        if (!phone || !text) return false;
        if (tenantId) {
            const s = await storeSession(tenantId);
            if (s.linked || s.status === "connected") {
                const r = await sendVia(storeKey(tenantId), phone, text);
                if (r.ok || r.queued) return true;
                console.log(`[WhatsApp] store ${tenantId} send failed (${r.error}) — trying the platform number`);
            }
        }
        if (!platform.linked && platform.status !== "connected") await refreshPlatform();
        if (!platform.linked && platform.status !== "connected") {
            console.log(`[WhatsApp] platform number not linked — message to ${phone} not sent`);
            return false;
        }
        const r = await sendVia("platform", phone, text);
        return r.ok || !!r.queued;
    },

    // ── Store sessions ──────────────────────────────────────────────────────
    storeSession,
    async storeConnect(tenantId: number): Promise<SessionView> {
        const v = await bridge<SessionView>("POST", "/connect", { key: storeKey(tenantId) }, 15000);
        storeCache.delete(tenantId);
        return v;
    },
    async storeLogout(tenantId: number): Promise<SessionView> {
        const v = await bridge<SessionView>("POST", "/logout", { key: storeKey(tenantId) });
        storeCache.delete(tenantId);
        return v;
    },
    async storeSend(tenantId: number, to: string, text: string) {
        return sendVia(storeKey(tenantId), to, text);
    },
    async storeGroups(tenantId: number, refresh = false) {
        return bridge<{ groups: { id: string; name: string; size: number }[]; refreshedAt: string | null }>(
            "GET", `/groups?key=${storeKey(tenantId)}${refresh ? "&refresh=1" : ""}`, undefined, 30000);
    },
    async storeMarkRead(tenantId: number, jid: string) {
        return bridge("POST", "/read", { key: storeKey(tenantId), jid });
    },

    // ── Order messages ──────────────────────────────────────────────────────
    async sendOrderNotification(order: OrderData, storeName?: string, adminPhone?: string, tenantId?: number): Promise<boolean> {
        if (tenantId) {
            const ctx = await storeContext(tenantId);
            const text = templateText(ctx, "order_new", orderVars(order, ctx));
            if (!text) return false;
            const s = await storeSession(tenantId);
            if (s.linked || s.status === "connected") {
                // From the store's own number: to its alert group, and to the
                // owner's number (its own chat when none is set).
                const alerts = ctx.meta.whatsappAlerts || {};
                const targets = new Set<string>();
                if (alerts.groupJid && alerts.groupEnabled !== false) targets.add(alerts.groupJid);
                if (alerts.notifyOwner !== false) {
                    const owner = adminPhone || s.phone;
                    if (owner) targets.add(owner.replace(/\D/g, ""));
                }
                let any = false;
                for (const to of targets) {
                    const r = await sendVia(storeKey(tenantId), to, text);
                    any = any || r.ok || !!r.queued;
                }
                return any;
            }
            if (!adminPhone) return false;
            return this.sendText(adminPhone, text);
        }
        if (!adminPhone) return false;
        const ctx: StoreContext = { name: storeName || "Store", meta: {}, currency: "CHF", lang: "en" };
        return this.sendText(adminPhone, renderTemplate(resolveTemplate(undefined, "order_new", "en").text, orderVars(order, ctx)));
    },

    async sendCustomerConfirmation(
        customerPhone: string,
        orderNumber: string,
        storeName: string,
        totalAmount: string | number,
        tenantId?: number,
        customerName?: string,
    ): Promise<boolean> {
        const ctx: StoreContext = tenantId
            ? await storeContext(tenantId)
            : { name: storeName, meta: {}, currency: "CHF", lang: "en" };
        const text = templateText(ctx, "order_confirmed", {
            orderNumber, storeName: ctx.name, customerName: customerName || "", total: money(totalAmount, ctx.currency),
        });
        return text ? this.sendText(customerPhone, text, tenantId) : false;
    },

    async sendStatusUpdate(
        customerPhone: string,
        orderNumber: string,
        newStatus: string,
        storeName: string,
        tenantId?: number,
        customerName?: string,
    ): Promise<boolean> {
        const event = statusEvent(newStatus);
        if (!event) return false;
        const ctx: StoreContext = tenantId
            ? await storeContext(tenantId)
            : { name: storeName, meta: {}, currency: "CHF", lang: "en" };
        const text = templateText(ctx, event, { orderNumber, storeName: ctx.name, customerName: customerName || "" });
        return text ? this.sendText(customerPhone, text, tenantId) : false;
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
