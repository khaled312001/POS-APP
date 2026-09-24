/**
 * WhatsApp messaging for the platform and for each store.
 *
 * The sessions themselves live in the WhatsApp bridge process
 * (server/waBridge.ts), reached through server/waClient.ts:
 *   - "platform"      the platform's own number: login/verification codes and
 *                     system messages only;
 *   - "t<tenantId>"   a store's own WhatsApp, linked by the store owner.
 * Everything about a store's orders goes out from the store's own number,
 * using the store's templates (server/waTemplates.ts); a store that hasn't
 * linked one sends none, never the platform number.
 */
import { bridge, ensureBridge, startBridgeWatchdog } from "./waClient";
import { renderTemplate, resolveTemplate, statusEvent, type TemplateLang, type TemplateEvent } from "./waTemplates";

export type WhatsAppStatus = "disconnected" | "connecting" | "qr_ready" | "connected";

interface OrderItem {
    name: string;
    quantity: number;
    unitPrice: number;
    total?: number;
    variant?: string | null;
    modifiers?: string[] | null;
    notes?: string | null;
}

/** An online order: the online_orders row, or the fields a route has at hand. */
export interface OrderData {
    orderNumber: string;
    customerName: string;
    customerPhone: string;
    customerAddress?: string | null;
    items: OrderItem[];
    subtotal: string | number;
    deliveryFee?: string | number | null;
    discountAmount?: string | number | null;
    totalAmount: string | number;
    orderType: string;
    paymentMethod: string;
    paymentStatus?: string | null;
    notes?: string | null;
    tableNumber?: string | null;
    floor?: string | null;
    buildingName?: string | null;
    addressNotes?: string | null;
    scheduledAt?: string | Date | null;
    estimatedTime?: number | null;
    trackingToken?: string | null;
    createdAt?: string | Date | null;
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

const TIME_ZONE: Record<string, string> = { SYP: "Asia/Damascus", EGP: "Africa/Cairo", SAR: "Asia/Riyadh", AED: "Asia/Dubai" };
function when(v: string | Date | null | undefined, ctx: StoreContext): string {
    const d = v ? new Date(v) : null;
    if (!d || isNaN(d.getTime())) return "";
    return new Intl.DateTimeFormat("en-GB", {
        timeZone: TIME_ZONE[ctx.currency] || "Europe/Zurich",
        day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false,
    }).format(d);
}

const BASE_URL = () => (process.env.APP_URL || "https://kassenta.com").replace(/\/$/, "");

function orderVars(order: OrderData, ctx: StoreContext) {
    const ar = ctx.lang === "ar";
    const payment: Record<string, string> = ar
        ? { cash: "نقداً عند الاستلام", card: "بطاقة", stripe: "بطاقة", shamcash: "شام كاش", online: "دفع إلكتروني", credit: "آجل", wallet: "المحفظة" }
        : { cash: "Cash on delivery", card: "Card", stripe: "Card", shamcash: "Sham Cash", online: "Online", credit: "On account", wallet: "Wallet" };
    const types: Record<string, string> = ar
        ? { delivery: "🚚 توصيل", pickup: "🏪 استلام من المتجر", dine_in: "🍽 داخل المطعم" }
        : { delivery: "🚚 Delivery", pickup: "🏪 Pickup", dine_in: "🍽 Dine-in" };
    const items = Array.isArray(order.items) ? order.items : [];
    const itemLines = items.map((i) => {
        const qty = Number(i.quantity) || 1;
        const lineTotal = i.total != null ? Number(i.total) : Number(i.unitPrice) * qty;
        const lines = [`▫️ ${qty} × ${i.name}${i.variant ? ` (${i.variant})` : ""} — ${money(lineTotal, ctx.currency)}`];
        const mods = Array.isArray(i.modifiers) ? i.modifiers.filter(Boolean) : [];
        if (mods.length) lines.push(`      + ${mods.join(ar ? "، " : ", ")}`);
        if (i.notes) lines.push(`      📝 ${i.notes}`);
        return lines.join("\n");
    });
    const address = [
        order.customerAddress,
        order.buildingName,
        order.floor ? (ar ? `الطابق ${order.floor}` : `Floor ${order.floor}`) : "",
        order.addressNotes,
    ].map((x) => (x == null ? "" : String(x).trim())).filter(Boolean).join(ar ? "، " : ", ");
    const paid = order.paymentStatus === "paid" ? (ar ? " ✅ مدفوع" : " ✅ paid") : "";
    const discount = Number(order.discountAmount) || 0;
    const fee = Number(order.deliveryFee) || 0;
    return {
        orderNumber: order.orderNumber,
        orderTime: when(order.createdAt || new Date(), ctx),
        storeName: ctx.name,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        orderType: types[order.orderType] || order.orderType,
        table: order.tableNumber || "",
        address: order.orderType === "delivery" ? address : "",
        scheduledAt: when(order.scheduledAt, ctx),
        items: itemLines.join("\n"),
        itemCount: String(items.reduce((n, i) => n + (Number(i.quantity) || 1), 0)),
        subtotal: money(order.subtotal, ctx.currency),
        discount: discount > 0 ? money(discount, ctx.currency) : "",
        deliveryFee: fee > 0 ? money(fee, ctx.currency) : "",
        total: money(order.totalAmount, ctx.currency),
        paymentMethod: (payment[order.paymentMethod] || order.paymentMethod) + paid,
        notes: order.notes || "",
        eta: order.estimatedTime ? (ar ? `${order.estimatedTime} دقيقة` : `${order.estimatedTime} min`) : "",
        trackingLink: order.trackingToken ? `${BASE_URL()}/track/${order.trackingToken}` : "",
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
     * With a tenantId: from that store's own WhatsApp only (true = sent, or
     * queued on its linked session and sent once it is back). A store that
     * hasn't linked a number sends nothing. Without one: the platform number
     * (login/verification codes, system messages).
     */
    async sendText(phone: string, text: string, tenantId?: number): Promise<boolean> {
        if (!phone || !text) return false;
        if (tenantId) {
            const s = await storeSession(tenantId);
            if (!s.linked && s.status !== "connected") {
                console.log(`[WhatsApp] store ${tenantId} has no linked WhatsApp — message to ${phone} not sent`);
                return false;
            }
            const r = await sendVia(storeKey(tenantId), phone, text);
            if (!r.ok && !r.queued) console.log(`[WhatsApp] store ${tenantId} send failed: ${r.error}`);
            return r.ok || !!r.queued;
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

    // ── Order messages (always from the store's own number) ───────────────
    /** New order → the store: its alert group and/or the owner's number. */
    async sendOrderNotification(order: OrderData, _storeName?: string, adminPhone?: string, tenantId?: number): Promise<boolean> {
        if (!tenantId) return false;
        const s = await storeSession(tenantId);
        if (!s.linked && s.status !== "connected") return false;
        const ctx = await storeContext(tenantId);
        const text = templateText(ctx, "order_new", orderVars(order, ctx));
        if (!text) return false;
        const alerts = ctx.meta.whatsappAlerts || {};
        const targets = new Set<string>();
        if (alerts.groupJid && alerts.groupEnabled !== false) targets.add(alerts.groupJid);
        if (alerts.notifyOwner !== false) {
            // The owner's number; the store's own chat ("Message yourself") when none is set.
            const owner = String(adminPhone || s.phone || "").replace(/\D/g, "");
            if (owner) targets.add(owner);
        }
        let any = false;
        for (const to of targets) {
            const r = await sendVia(storeKey(tenantId), to, text);
            any = any || r.ok || !!r.queued;
        }
        return any;
    },

    /** New order → the customer: confirmation with the whole order. */
    async sendOrderConfirmation(order: OrderData, tenantId: number): Promise<boolean> {
        if (!order.customerPhone || !tenantId) return false;
        const ctx = await storeContext(tenantId);
        const text = templateText(ctx, "order_confirmed", orderVars(order, ctx));
        return text ? this.sendText(order.customerPhone, text, tenantId) : false;
    },

    /** Both messages for a new order. */
    async orderPlaced(order: OrderData, tenantId: number, adminPhone?: string): Promise<void> {
        await this.sendOrderNotification(order, undefined, adminPhone, tenantId).catch((e) =>
            console.error("[WhatsApp] store alert failed:", e?.message || e));
        await this.sendOrderConfirmation(order, tenantId).catch((e) =>
            console.error("[WhatsApp] customer confirmation failed:", e?.message || e));
    },

    /** Status change → the customer, with the whole order. */
    async orderStatusChanged(order: OrderData, status: string, tenantId: number): Promise<boolean> {
        const event = statusEvent(status);
        if (!event || !order.customerPhone || !tenantId) return false;
        const ctx = await storeContext(tenantId);
        const text = templateText(ctx, event, orderVars(order, ctx));
        return text ? this.sendText(order.customerPhone, text, tenantId) : false;
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
