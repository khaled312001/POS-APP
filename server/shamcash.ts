/**
 * Sham Cash (شام كاش) — invoice-based online payments for Syrian stores.
 *
 * Flow:
 *   1. The checkout asks for an invoice for an order (or a till sale). The
 *      amount always comes from our own record, never from the caller.
 *   2. The customer transfers that amount to the store's Sham Cash wallet in
 *      the Sham Cash app.
 *   3. Either Sham Cash calls our webhook (invoice.paid), or the customer
 *      types the transaction number from the app and we call /verify.
 *   4. Whatever the trigger, the invoice is re-read from the Sham Cash API
 *      before anything is marked paid: the webhook body is only a hint, so a
 *      forged delivery cannot settle an order.
 *
 * Keys: the platform key lives in SHAMCASH_API_KEY. A store may bring its own
 * key and wallet; both are kept in payment_gateway_settings.config_json and
 * the key is never sent back over HTTP.
 *
 * Sham Cash invoices support SYP and USD. EUR exists in their API but its
 * amount check is broken upstream (no FX conversion), so it is refused here.
 */
import crypto from "crypto";
import { pool } from "./db";

const BASE = (process.env.SHAMCASH_API_URL || "https://api-shamcash.com/api").replace(/\/$/, "");
export const SHAMCASH_CURRENCIES = ["SYP", "USD"] as const;
const INVOICE_MINUTES = 60;

async function q(sqlText: string, params: any[] = []): Promise<any[]> {
  const [rows] = await pool.query(sqlText, params);
  return Array.isArray(rows) ? (rows as any[]) : [];
}

export class ShamCashError extends Error {
  statusCode: number;
  code?: string;
  constructor(message: string, statusCode = 400, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

// Customer-facing wording for the Sham Cash error codes a payer can cause.
const PAYER_MESSAGES: Record<string, string> = {
  MISSING_TRAN_ID: "أدخل رقم العملية من تطبيق شام كاش",
  TRANSACTION_NOT_FOUND: "لم نجد هذه العملية بعد في شام كاش. انتظر دقيقة ثم أعد المحاولة",
  ALREADY_PAID: "هذه الفاتورة مدفوعة مسبقاً",
  TRAN_ID_USED: "رقم العملية هذا مستخدم لفاتورة أخرى",
  EXPIRED: "انتهت صلاحية الفاتورة، أنشئ فاتورة جديدة",
  AMOUNT_MISMATCH: "المبلغ المحوَّل لا يطابق قيمة الفاتورة",
  INVALID_STATUS: "لا يمكن التحقق من هذه الفاتورة",
  RATE_LIMIT: "محاولات كثيرة، انتظر قليلاً ثم أعد المحاولة",
  WALLET_INACTIVE: "محفظة شام كاش الخاصة بالمتجر غير مفعّلة",
  SUBSCRIPTION_EXPIRED: "اشتراك بوابة شام كاش منتهٍ",
};

// ── schema ──────────────────────────────────────────────────────────────────

export async function runShamCashMigrations(): Promise<void> {
  try {
    await q(`
      CREATE TABLE IF NOT EXISTS shamcash_invoices (
        id int NOT NULL AUTO_INCREMENT PRIMARY KEY,
        tenant_id int NOT NULL,
        online_order_id int NULL DEFAULT NULL,
        sale_id int NULL DEFAULT NULL,
        invoice_number varchar(64) NOT NULL,
        amount decimal(14,2) NOT NULL,
        currency varchar(8) NOT NULL,
        wallet varchar(128) NULL DEFAULT NULL,
        status varchar(20) NOT NULL DEFAULT 'pending',
        tran_id varchar(64) NULL DEFAULT NULL,
        expires_at timestamp NULL DEFAULT NULL,
        paid_at timestamp NULL DEFAULT NULL,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_shamcash_invoice (invoice_number),
        KEY ix_shamcash_order (online_order_id),
        KEY ix_shamcash_sale (sale_id)
      )`);
  } catch (e: any) {
    console.error("[shamcash] migration failed:", e?.message || e);
  }
}

// ── per-tenant settings ─────────────────────────────────────────────────────

export interface ShamCashSettings {
  enabled: boolean;
  walletId: string | null; // UUID, 32-hex address or account number
  apiKey: string | null; // tenant's own key; null = use the platform key
  // Manual mode (what stores use): the store's own Sham Cash QR code and
  // number, shown to the customer at checkout. No gateway call involved.
  qrImage: string | null; // uploaded image path, e.g. /objects/<uuid>.png
  phone: string | null; // Sham Cash number / account the money goes to
  holderName: string | null;
}

async function readConfigJson(tenantId: number): Promise<any> {
  const rows = await q(
    `SELECT config_json FROM payment_gateway_settings WHERE tenant_id = ? LIMIT 1`,
    [tenantId],
  );
  const raw = rows[0]?.config_json;
  if (!raw) return {};
  try {
    return typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return {};
  }
}

export async function loadShamCashSettings(tenantId: number): Promise<ShamCashSettings> {
  const cfg = (await readConfigJson(tenantId))?.shamcash ?? {};
  return {
    enabled: !!cfg.enabled,
    walletId: cfg.walletId ? String(cfg.walletId) : null,
    apiKey: cfg.apiKey ? String(cfg.apiKey) : null,
    qrImage: cfg.qrImage ? String(cfg.qrImage) : null,
    phone: cfg.phone ? String(cfg.phone) : null,
    holderName: cfg.holderName ? String(cfg.holderName) : null,
  };
}

/**
 * Only accept our own upload paths for the QR image. JSON responses rewrite
 * /objects/ to /api/objects/, so a value echoed back from the form is folded
 * back to the stored form.
 */
function cleanImagePath(v: unknown): string | null {
  const raw = String(v ?? "").trim();
  if (!raw) return null;
  const p = raw.replace(/^\/api\//, "/");
  if (!/^\/(objects|uploads)\/[\w./-]{1,200}$/.test(p) || p.includes("..")) {
    throw new ShamCashError("Invalid QR image", 400);
  }
  return p;
}

const clip = (v: unknown, n: number) => {
  const t = String(v ?? "").trim();
  return t ? t.slice(0, n) : null;
};

export async function saveShamCashSettings(
  tenantId: number,
  patch: {
    enabled?: boolean; walletId?: string | null; apiKey?: string | null;
    qrImage?: string | null; phone?: string | null; holderName?: string | null;
  },
): Promise<ShamCashSettings> {
  const cfg = await readConfigJson(tenantId);
  const cur = cfg.shamcash ?? {};
  const next: any = { ...cur };
  if (patch.enabled !== undefined) next.enabled = !!patch.enabled;
  if (patch.walletId !== undefined) next.walletId = patch.walletId ? String(patch.walletId).trim() : null;
  // An empty string clears the store key (back to the platform key); a masked
  // value echoed back from the form leaves it untouched.
  if (patch.apiKey !== undefined && !String(patch.apiKey ?? "").includes("•")) {
    next.apiKey = patch.apiKey ? String(patch.apiKey).trim() : null;
  }
  if (patch.qrImage !== undefined) next.qrImage = cleanImagePath(patch.qrImage);
  if (patch.phone !== undefined) next.phone = clip(patch.phone, 40);
  if (patch.holderName !== undefined) next.holderName = clip(patch.holderName, 80);
  cfg.shamcash = next;
  await q(
    `INSERT INTO payment_gateway_settings (tenant_id, config_json)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE config_json = VALUES(config_json)`,
    [tenantId, JSON.stringify(cfg)],
  );
  return loadShamCashSettings(tenantId);
}

function keyFor(s: ShamCashSettings): string | null {
  return s.apiKey || process.env.SHAMCASH_API_KEY || null;
}

/** Store currency as Sham Cash expects it, or null when unsupported. */
export async function shamCashCurrencyFor(tenantId: number): Promise<string | null> {
  const rows = await q(
    `SELECT currency FROM branches WHERE tenant_id = ? ORDER BY is_main DESC, id ASC LIMIT 1`,
    [tenantId],
  );
  const c = String(rows[0]?.currency || "").toUpperCase();
  return (SHAMCASH_CURRENCIES as readonly string[]).includes(c) ? c : null;
}

/**
 * The wallet that receives a store's payments: the one it picked, or else the
 * first active wallet on the key. Only an active wallet can take invoices.
 */
async function resolveWallet(s: ShamCashSettings): Promise<any | null> {
  const key = keyFor(s);
  if (!key) return null;
  try {
    const wallets = await listWallets(key);
    const w = s.walletId ? matchWallet(wallets, s.walletId) : wallets.find((x) => x.status === "active");
    return w && w.status === "active" ? w : null;
  } catch {
    return null;
  }
}

/**
 * What a checkout needs to know; safe to publish. Each store shows its own
 * QR code and number — both are meant to be seen by the paying customer.
 */
export async function publicShamCashStatus(tenantId: number) {
  if (!tenantId) return { enabled: false };
  const s = await loadShamCashSettings(tenantId);
  const currency = await shamCashCurrencyFor(tenantId);
  const ready = s.enabled && !!(s.qrImage || s.phone);
  if (!ready) return { enabled: false, mode: "manual", currency };
  return {
    enabled: true,
    mode: "manual",
    currency,
    qrImage: s.qrImage,
    phone: s.phone,
    holderName: s.holderName,
  };
}

/**
 * Manual mode: the customer says which Sham Cash transfer paid the order. It
 * is only a note for the store to match against its Sham Cash app — the order
 * stays unpaid until the store confirms it.
 */
export async function recordOrderReference(orderId: number, reference: string): Promise<void> {
  const ref = String(reference || "").replace(/[^\w\- ]/g, "").trim().slice(0, 40);
  if (!ref) throw new ShamCashError(PAYER_MESSAGES.MISSING_TRAN_ID, 400);
  await q(
    `UPDATE online_orders
        SET payment_method = 'shamcash',
            notes = TRIM(CONCAT(COALESCE(notes, ''), CASE WHEN COALESCE(notes, '') = '' THEN '' ELSE ' | ' END, ?))
      WHERE id = ?`,
    [`شام كاش - رقم العملية: ${ref}`, orderId],
  );
}

// ── HTTP client ─────────────────────────────────────────────────────────────

async function call(apiKey: string, method: string, path: string, body?: any): Promise<any> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 35_000);
  let res: Response;
  try {
    res = await fetch(BASE + path, {
      method,
      headers: {
        "X-Api-Key": apiKey,
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    });
  } catch (e: any) {
    throw new ShamCashError("تعذّر الاتصال بشام كاش، حاول مجدداً", 502, "UPSTREAM_UNREACHABLE");
  } finally {
    clearTimeout(timer);
  }
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { message: text.slice(0, 300) };
  }
  if (!res.ok) {
    const code = data?.error || data?.code || `HTTP_${res.status}`;
    const msg = PAYER_MESSAGES[code] || data?.message || "خطأ من بوابة شام كاش";
    if (res.status >= 500 || res.status === 401 || res.status === 403) {
      console.error(`[shamcash] ${method} ${path} -> ${res.status} ${code}: ${data?.message ?? ""}`);
    }
    // 401/403 are our configuration problems, not the payer's.
    const status = res.status === 401 || res.status === 403 ? 503 : res.status;
    throw new ShamCashError(msg, status, code);
  }
  return data;
}

// Wallets change rarely; the checkout reads them on every invoice.
const walletCache = new Map<string, { at: number; wallets: any[] }>();

export async function listWallets(apiKey: string, fresh = false): Promise<any[]> {
  const hit = walletCache.get(apiKey);
  if (!fresh && hit && Date.now() - hit.at < 5 * 60_000) return hit.wallets;
  const data = await call(apiKey, "GET", "/v1/wallets");
  const wallets = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
  walletCache.set(apiKey, { at: Date.now(), wallets });
  return wallets;
}

function matchWallet(wallets: any[], id: string | null): any | null {
  if (!id) return null;
  return (
    wallets.find(
      (w) => w.id === id || w.walletAddress === id || String(w.accountNumber ?? "") === id,
    ) ?? null
  );
}

// ── invoices ────────────────────────────────────────────────────────────────

type Target = { kind: "order"; id: number } | { kind: "sale"; id: number };

async function loadTarget(t: Target): Promise<{ tenantId: number; amount: number; paid: boolean; label: string }> {
  if (t.kind === "order") {
    const rows = await q(
      `SELECT tenant_id, total_amount, payment_status, order_number FROM online_orders WHERE id = ? LIMIT 1`,
      [t.id],
    );
    if (!rows.length) throw new ShamCashError("الطلب غير موجود", 404);
    const r = rows[0];
    return {
      tenantId: Number(r.tenant_id),
      amount: Number(r.total_amount),
      paid: r.payment_status === "paid",
      label: `Order ${r.order_number}`,
    };
  }
  const rows = await q(
    `SELECT b.tenant_id, s.total_amount, s.payment_status, s.receipt_number
       FROM sales s JOIN branches b ON b.id = s.branch_id WHERE s.id = ? LIMIT 1`,
    [t.id],
  );
  if (!rows.length) throw new ShamCashError("الفاتورة غير موجودة", 404);
  const r = rows[0];
  return {
    tenantId: Number(r.tenant_id),
    amount: Number(r.total_amount),
    paid: r.payment_status === "paid",
    label: `Sale ${r.receipt_number}`,
  };
}

function col(t: Target) {
  return t.kind === "order" ? "online_order_id" : "sale_id";
}

async function payToDetails(apiKey: string, walletId: string | null) {
  try {
    const w = matchWallet(await listWallets(apiKey), walletId);
    if (!w) return null;
    return {
      label: w.label ?? null,
      walletAddress: w.walletAddress ?? null,
      accountNumber: w.accountNumber ?? null,
    };
  } catch {
    return null;
  }
}

function publicInvoice(row: any, payTo: any) {
  return {
    invoiceNumber: row.invoice_number,
    amount: Number(row.amount),
    currency: row.currency,
    status: row.status,
    expiresAt: row.expires_at,
    paidAt: row.paid_at,
    payTo,
  };
}

/** Create, or reuse a still-valid pending invoice for, an order or sale. */
export async function createInvoiceFor(t: Target, publicBaseUrl: string) {
  const target = await loadTarget(t);
  if (target.paid) throw new ShamCashError("تم دفع هذا الطلب مسبقاً", 409, "ALREADY_PAID");

  const s = await loadShamCashSettings(target.tenantId);
  const apiKey = keyFor(s);
  const currency = await shamCashCurrencyFor(target.tenantId);
  if (!s.enabled || !apiKey) {
    throw new ShamCashError("الدفع عبر شام كاش غير مفعّل لهذا المتجر", 503, "NOT_CONFIGURED");
  }
  const wallet = await resolveWallet(s);
  if (!wallet) {
    throw new ShamCashError("محفظة شام كاش الخاصة بالمتجر غير مفعّلة بعد", 503, "WALLET_INACTIVE");
  }
  const walletRef: string = wallet.id;
  if (!currency) {
    throw new ShamCashError("شام كاش يدعم الليرة السورية والدولار فقط", 400, "UNSUPPORTED_CURRENCY");
  }
  if (!(target.amount > 0)) throw new ShamCashError("قيمة الطلب غير صالحة", 400);

  // Reuse the open invoice if the amount still matches (the order total can
  // change before payment, e.g. a promo code) and it has not expired.
  const open = await q(
    `SELECT * FROM shamcash_invoices
      WHERE ${col(t)} = ? AND status = 'pending' AND expires_at > NOW() + INTERVAL 2 MINUTE
      ORDER BY id DESC LIMIT 1`,
    [t.id],
  );
  if (open.length && Number(open[0].amount) === Number(target.amount.toFixed(2)) && open[0].currency === currency) {
    return publicInvoice(open[0], await payToDetails(apiKey, open[0].wallet));
  }

  const created = await call(apiKey, "POST", "/v1/invoices", {
    amount: target.amount.toFixed(2).replace(/\.00$/, ""),
    currency,
    walletAddress: walletRef,
    webhookUrl: `${publicBaseUrl.replace(/\/$/, "")}/api/payments/webhook/shamcash`,
    expiresInMinutes: INVOICE_MINUTES,
    note: `Kassenta ${target.label}`.slice(0, 500),
    metadata: { kind: t.kind, id: String(t.id), tenantId: String(target.tenantId) },
  });
  const inv = created?.data ?? created;
  const invoiceNumber = inv?.invoiceNumber ?? inv?.invoice_number;
  if (!invoiceNumber) {
    console.error("[shamcash] unexpected create response:", JSON.stringify(created).slice(0, 400));
    throw new ShamCashError("تعذّر إنشاء فاتورة شام كاش", 502);
  }
  const expiresAt = inv?.expiresAt ? new Date(inv.expiresAt) : new Date(Date.now() + INVOICE_MINUTES * 60_000);

  await q(
    `INSERT INTO shamcash_invoices (tenant_id, ${col(t)}, invoice_number, amount, currency, wallet, status, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
    [target.tenantId, t.id, invoiceNumber, target.amount.toFixed(2), currency, walletRef, expiresAt],
  );
  const [row] = await q(`SELECT * FROM shamcash_invoices WHERE invoice_number = ?`, [invoiceNumber]);
  return publicInvoice(row, await payToDetails(apiKey, walletRef));
}

async function markSettled(row: any, tranId: string | null): Promise<void> {
  await q(
    `UPDATE shamcash_invoices
        SET status = 'paid', tran_id = COALESCE(?, tran_id), paid_at = COALESCE(paid_at, NOW())
      WHERE id = ?`,
    [tranId, row.id],
  );
  if (row.online_order_id) {
    await q(
      `UPDATE online_orders
          SET payment_status = 'paid', payment_method = 'shamcash',
              paid_at = COALESCE(paid_at, NOW()), payment_error = NULL
        WHERE id = ? AND payment_status <> 'paid'`,
      [row.online_order_id],
    );
  }
  if (row.sale_id) {
    await q(
      `UPDATE sales
          SET payment_status = 'paid', payment_method = 'shamcash', paid_at = COALESCE(paid_at, NOW())
        WHERE id = ? AND (payment_status IS NULL OR payment_status <> 'paid')`,
      [row.sale_id],
    );
  }
}

async function apiKeyForRow(row: any): Promise<string> {
  const key = keyFor(await loadShamCashSettings(Number(row.tenant_id)));
  if (!key) throw new ShamCashError("الدفع عبر شام كاش غير مفعّل لهذا المتجر", 503, "NOT_CONFIGURED");
  return key;
}

/**
 * Re-read one invoice from Sham Cash (the source of truth) and settle it
 * locally if it has been paid.
 */
export async function refreshInvoice(invoiceNumber: string) {
  const [row] = await q(`SELECT * FROM shamcash_invoices WHERE invoice_number = ? LIMIT 1`, [invoiceNumber]);
  if (!row) throw new ShamCashError("فاتورة غير معروفة", 404);
  if (row.status !== "paid") {
    const remote = await call(await apiKeyForRow(row), "GET", `/v1/invoices/${encodeURIComponent(invoiceNumber)}`);
    const inv = remote?.data ?? remote;
    const status = String(inv?.status ?? "").toLowerCase();
    if (status === "paid") {
      await markSettled(row, inv?.transactionRef ?? inv?.tranId ?? inv?.tran_id ?? null);
    } else if (status === "expired" || status === "cancelled") {
      await q(`UPDATE shamcash_invoices SET status = ? WHERE id = ?`, [status, row.id]);
    }
  }
  const [fresh] = await q(`SELECT * FROM shamcash_invoices WHERE id = ?`, [row.id]);
  return fresh;
}

/** Customer (or cashier) submits the transaction number shown in the Sham Cash app. */
export async function verifyInvoice(t: Target, tranId: string) {
  const clean = String(tranId ?? "").trim();
  if (!clean) throw new ShamCashError(PAYER_MESSAGES.MISSING_TRAN_ID, 400, "MISSING_TRAN_ID");
  const [row] = await q(
    `SELECT * FROM shamcash_invoices WHERE ${col(t)} = ? ORDER BY id DESC LIMIT 1`,
    [t.id],
  );
  if (!row) throw new ShamCashError("لا توجد فاتورة شام كاش لهذا الطلب", 404);
  if (row.status === "paid") return { status: "paid", invoiceNumber: row.invoice_number };
  try {
    await call(await apiKeyForRow(row), "POST", `/v1/invoices/${encodeURIComponent(row.invoice_number)}/verify`, {
      tran_id: clean,
    });
  } catch (e: any) {
    // Paid meanwhile (e.g. the webhook won the race): fall through to refresh.
    if (e?.code !== "ALREADY_PAID") throw e;
  }
  const fresh = await refreshInvoice(row.invoice_number);
  if (fresh.status === "paid" && !fresh.tran_id) {
    await q(`UPDATE shamcash_invoices SET tran_id = ? WHERE id = ?`, [clean, fresh.id]);
  }
  return { status: fresh.status, invoiceNumber: fresh.invoice_number };
}

export async function invoiceStatus(t: Target) {
  const [row] = await q(
    `SELECT * FROM shamcash_invoices WHERE ${col(t)} = ? ORDER BY id DESC LIMIT 1`,
    [t.id],
  );
  if (!row) return { status: "none" };
  const fresh = row.status === "pending" ? await refreshInvoice(row.invoice_number) : row;
  return { status: fresh.status, invoiceNumber: fresh.invoice_number, paidAt: fresh.paid_at };
}

/**
 * Webhook. The signature is checked when SHAMCASH_WEBHOOK_SECRET is set, but
 * nothing is trusted from the body either way: it only tells us which invoice
 * to re-read.
 */
export async function handleWebhook(rawBody: Buffer, signatureHeader: string | undefined) {
  const secret = process.env.SHAMCASH_WEBHOOK_SECRET;
  if (secret) {
    const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
    const got = String(signatureHeader ?? "").replace(/^sha256=/, "");
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(got, "hex");
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      throw new ShamCashError("bad signature", 401);
    }
  }
  let body: any;
  try {
    body = JSON.parse(rawBody.toString("utf8"));
  } catch {
    throw new ShamCashError("bad json", 400);
  }
  const invoiceNumber = body?.invoiceNumber;
  if (!invoiceNumber) return { ignored: true };
  const [row] = await q(`SELECT id FROM shamcash_invoices WHERE invoice_number = ? LIMIT 1`, [invoiceNumber]);
  if (!row) return { ignored: true }; // not ours
  const fresh = await refreshInvoice(String(invoiceNumber));
  return { invoiceNumber, status: fresh.status };
}

/** Admin view of the store's own (manual) Sham Cash details. */
export async function adminShamCashView(tenantId: number) {
  const s = await loadShamCashSettings(tenantId);
  return {
    enabled: s.enabled,
    mode: "manual",
    qrImage: s.qrImage,
    phone: s.phone,
    holderName: s.holderName,
    currency: await shamCashCurrencyFor(tenantId),
    live: s.enabled && !!(s.qrImage || s.phone),
  };
}

/** Gateway view (API key + wallets). Not used by the settings screen today. */
export async function adminShamCashGatewayView(tenantId: number) {
  const s = await loadShamCashSettings(tenantId);
  const key = keyFor(s);
  let wallets: any[] = [];
  let apiError: string | null = null;
  if (key) {
    try {
      wallets = (await listWallets(key, true)).map((w) => ({
        id: w.id,
        label: w.label ?? null,
        status: w.status ?? null,
        walletAddress: w.walletAddress ?? null,
        accountNumber: w.accountNumber ?? null,
      }));
    } catch (e: any) {
      apiError = e?.message || "Sham Cash API error";
    }
  }
  const selected = matchWallet(wallets, s.walletId);
  return {
    enabled: s.enabled,
    walletId: s.walletId,
    walletStatus: selected?.status ?? null,
    ownApiKey: s.apiKey ? "••••" + s.apiKey.slice(-4) : null,
    platformKeyConfigured: !!process.env.SHAMCASH_API_KEY,
    currency: await shamCashCurrencyFor(tenantId),
    supportedCurrencies: SHAMCASH_CURRENCIES,
    wallets,
    apiError,
  };
}
