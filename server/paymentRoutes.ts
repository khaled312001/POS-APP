/**
 * HTTP surface for payments.
 *
 * Split by trust level:
 *   - /api/payments/config          public; publishable key + offered methods
 *   - /api/payments/order/:id/...   public but proves possession of the order's
 *                                   tracking token, so order ids cannot be
 *                                   enumerated for their totals
 *   - /api/payments/sale/...        till staff (employee token)
 *   - /api/payments/refund          admin/owner only
 *   - /api/payment-gateway/config   GET public (checkout needs it), PUT admin
 *
 * No handler here ever accepts an amount for an order or a sale. Amounts come
 * from the stored record - see paymentService.ts.
 */
import type { Express, Request, Response } from "express";
import express from "express";
import { requireAdmin, type EmployeeRequest } from "./employeeAuth";
import { pool } from "./db";
import {
  isStripeConfigured,
  getStripePublishableKey,
  getStripeMode,
  requireStripeClient,
} from "./stripeClient";
import {
  createOrderPaymentIntent,
  createSalePaymentIntent,
  createWalletTopupIntent,
  createSubscriptionIntent,
  refundPayment,
  listAvailablePaymentMethods,
  stripeAccountStatus,
  currencyFor,
  createCheckoutSession,
} from "./paymentService";
import { processStripeWebhook } from "./stripeWebhook";
import {
  ShamCashError,
  publicShamCashStatus,
  createInvoiceFor,
  verifyInvoice,
  invoiceStatus,
  handleWebhook as handleShamCashWebhook,
  adminShamCashView,
  saveShamCashSettings,
  recordOrderReference,
} from "./shamcash";

/** Where Sham Cash should deliver invoice webhooks. */
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || "https://kassenta.com";

interface TenantRequest extends Request {
  tenantId?: number;
}

async function q(sqlText: string, params: any[] = []): Promise<any[]> {
  const [rows] = await pool.query(sqlText, params);
  return Array.isArray(rows) ? (rows as any[]) : [];
}

/** Map a thrown error onto a sensible status without leaking internals. */
function fail(res: Response, e: any, fallback = 500) {
  const status = e?.statusCode ?? (e?.code === "STRIPE_NOT_CONFIGURED" ? 503 : fallback);
  const message = e?.message || "Payment error";
  if (status >= 500) console.error("[payments]", message);
  res.status(status).json({ error: message, code: e?.code });
}

// ── gateway settings, persisted ─────────────────────────────────────────────

const DEFAULT_GATEWAY = {
  enabledMethods: ["cash", "card", "mobile", "nfc"],
  stripe: { enabled: true, mode: "test", currency: "CHF", autoCapture: true },
  nfc: { enabled: true, provider: "stripe_tap" },
  cash: { enabled: true, requireExactAmount: false },
  mobile: { enabled: true, providers: ["apple_pay", "google_pay"] },
};

async function loadGatewaySettings(tenantId: number): Promise<any> {
  try {
    const rows = await q(
      `SELECT tenant_id, config_json FROM payment_gateway_settings
        WHERE tenant_id IN (?, 0) ORDER BY tenant_id DESC LIMIT 1`,
      [tenantId || 0],
    );
    if (rows[0]?.config_json) {
      const parsed =
        typeof rows[0].config_json === "string"
          ? JSON.parse(rows[0].config_json)
          : rows[0].config_json;
      // Which buttons a till offers is a per-store choice. The tenant-0 row
      // was written by stores' own settings screens before that write was
      // scoped to the store, so it must not switch methods off for everyone.
      if (tenantId && Number(rows[0].tenant_id) === 0) delete parsed.enabledMethods;
      return { ...DEFAULT_GATEWAY, ...parsed };
    }
  } catch (e: any) {
    console.warn("[payments] gateway settings read failed:", e?.message || e);
  }
  return { ...DEFAULT_GATEWAY };
}

async function saveGatewaySettings(tenantId: number, config: any): Promise<void> {
  const currency = config?.stripe?.currency || "CHF";
  await q(
    `INSERT INTO payment_gateway_settings (tenant_id, config_json, currency, enabled_methods)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE config_json = VALUES(config_json),
                             currency = VALUES(currency),
                             enabled_methods = VALUES(enabled_methods)`,
    [
      tenantId || 0,
      JSON.stringify(config),
      currency,
      JSON.stringify(config?.enabledMethods ?? DEFAULT_GATEWAY.enabledMethods),
    ],
  );
}

/**
 * The webhook only. Must be registered BEFORE express.json(), because
 * signature verification needs the untouched request body: once a JSON parser
 * has consumed the stream, the raw bytes are gone and every delivery fails.
 */
export function registerStripeWebhook(app: Express): void {
  const webhook = async (req: Request, res: Response) => {
    const signature = req.headers["stripe-signature"];
    if (!signature) return res.status(400).json({ error: "Missing stripe-signature header" });
    try {
      const sig = Array.isArray(signature) ? signature[0] : signature;
      const result = await processStripeWebhook(req.body as Buffer, sig);
      res.status(200).json(result);
    } catch (e: any) {
      // 400 tells Stripe the delivery was rejected; it will retry.
      console.error("[payments] webhook rejected:", e?.message || e);
      res.status(e?.statusCode === 503 ? 503 : 400).json({ error: e?.message || "Webhook error" });
    }
  };

  // Mounted at both paths so an endpoint configured either way keeps working.
  const rawJson = express.raw({ type: "application/json" });
  app.post("/api/stripe/webhook", rawJson, webhook);
  app.post("/api/payments/webhook", rawJson, webhook);

  // Sham Cash invoice webhook. Always answers 2xx quickly for anything that is
  // not a bad signature: Sham Cash does not retry invoice webhooks, and the
  // status endpoint re-reads the invoice anyway.
  app.post("/api/payments/webhook/shamcash", rawJson, async (req: Request, res: Response) => {
    try {
      const sig = req.headers["x-webhook-signature"];
      const result = await handleShamCashWebhook(req.body as Buffer, Array.isArray(sig) ? sig[0] : sig);
      res.status(200).json(result);
    } catch (e: any) {
      if (e?.statusCode === 401) return res.status(401).json({ error: "bad signature" });
      console.error("[shamcash] webhook:", e?.message || e);
      res.status(200).json({ received: true });
    }
  });
}

/**
 * Everything else. Registered AFTER body parsing and the auth middleware, so
 * req.body is populated and req.tenantId / req.employee are available.
 */
export function registerPaymentRoutes(app: Express): void {
  // ── public config for a checkout page ───────────────────────────────────
  const config = async (req: TenantRequest, res: Response) => {
    try {
      const tenantId = Number(req.query.tenantId ?? req.tenantId ?? 0) || 0;
      const settings = await loadGatewaySettings(tenantId);
      const configured = await isStripeConfigured();
      const mode = await getStripeMode();
      const publishableKey = await getStripePublishableKey();
      const methods = configured ? (await listAvailablePaymentMethods()).methods : [];

      const { shamcash: _storedShamCash, ...publicSettings } = settings;
      res.json({
        ...publicSettings,
        shamcash: await publicShamCashStatus(tenantId),
        currency: (await currencyFor(tenantId)).toUpperCase(),
        stripe: {
          ...settings.stripe,
          status: configured && publishableKey ? "connected" : "disconnected",
          mode: mode ?? settings.stripe?.mode ?? "test",
          // Safe to publish; this is the whole point of a publishable key.
          publishableKey: publishableKey ?? null,
          availableMethods: methods,
        },
      });
    } catch (e: any) {
      fail(res, e);
    }
  };

  app.get("/api/payments/config", config);
  app.get("/api/payment-gateway/config", config);

  // Admin-only write. The path is in the public allowlist so checkout can read
  // it, which means the guard has to live on the handler itself.
  app.put("/api/payment-gateway/config", requireAdmin, async (req: EmployeeRequest, res) => {
    try {
      // The path is public, so the licence middleware never set req.tenantId;
      // without the employee's own tenant every store would write tenant 0,
      // the platform-wide default that all stores read.
      const tenantId = Number((req as any).tenantId ?? req.employee?.tenantId ?? 0) || 0;
      if (!tenantId) return res.status(401).json({ error: "Store authentication required" });
      const current = await loadGatewaySettings(tenantId);
      const merged = { ...current, ...req.body };
      // Sham Cash has its own endpoint (it holds a key); never overwrite it here.
      merged.shamcash = current.shamcash;
      // Keys are never accepted over HTTP; they live in the environment.
      delete (merged as any).secretKey;
      delete (merged as any).publishableKey;
      if (merged.stripe) {
        delete merged.stripe.secretKey;
        delete merged.stripe.publishableKey;
      }
      await saveGatewaySettings(tenantId, merged);
      const { shamcash: _sc, ...safe } = merged;
      res.json(safe);
    } catch (e: any) {
      fail(res, e);
    }
  });

  // ── order payment ───────────────────────────────────────────────────────
  /**
   * Create (or reuse) the PaymentIntent for an order.
   * Requires the tracking token the client received when the order was placed.
   */
  app.post("/api/payments/order/:orderId/intent", async (req: Request, res: Response) => {
    try {
      const orderId = Number.parseInt(String(req.params.orderId), 10);
      if (!Number.isFinite(orderId)) return res.status(400).json({ error: "Invalid order id" });

      const token = String(req.body?.trackingToken ?? req.query.trackingToken ?? "");
      const rows = await q(
        `SELECT tracking_token FROM online_orders WHERE id = ? LIMIT 1`,
        [orderId],
      );
      if (!rows.length) return res.status(404).json({ error: "Order not found" });

      const expected = rows[0].tracking_token;
      if (expected && token !== expected) {
        return res.status(403).json({ error: "Invalid tracking token for this order" });
      }

      res.json(await createOrderPaymentIntent(orderId));
    } catch (e: any) {
      fail(res, e);
    }
  });

  /** Poll a PaymentIntent. Used while waiting for the webhook to land. */
  app.get("/api/payments/status/:paymentIntentId", async (req: Request, res: Response) => {
    try {
      const stripe = await requireStripeClient();
      const pi = await stripe.paymentIntents.retrieve(String(req.params.paymentIntentId));

      const orderRows = await q(
        `SELECT id, order_number, payment_status, tracking_token
           FROM online_orders WHERE stripe_payment_intent_id = ? LIMIT 1`,
        [pi.id],
      );

      res.json({
        status: pi.status,
        amount: pi.amount,
        currency: pi.currency,
        // Our own record is the authority on whether the order is settled.
        order: orderRows[0]
          ? {
              id: orderRows[0].id,
              orderNumber: orderRows[0].order_number,
              paymentStatus: orderRows[0].payment_status,
              trackingToken: orderRows[0].tracking_token,
            }
          : null,
      });
    } catch (e: any) {
      fail(res, e);
    }
  });

  // ── till ────────────────────────────────────────────────────────────────
  /** Card/TWINT payment for a POS sale. Employee token required by default. */
  app.post("/api/payments/sale/:saleId/intent", async (req: Request, res: Response) => {
    try {
      const saleId = Number.parseInt(String(req.params.saleId), 10);
      if (!Number.isFinite(saleId)) return res.status(400).json({ error: "Invalid sale id" });
      res.json(await createSalePaymentIntent(saleId));
    } catch (e: any) {
      fail(res, e);
    }
  });

  // ── wallet ──────────────────────────────────────────────────────────────
  app.post("/api/payments/wallet/topup", async (req: TenantRequest, res: Response) => {
    try {
      const { customerId, amount } = req.body ?? {};
      const tenantId = Number(req.body?.tenantId ?? req.tenantId ?? 0);
      if (!tenantId || !customerId) {
        return res.status(400).json({ error: "tenantId and customerId are required" });
      }
      res.json(
        await createWalletTopupIntent({
          tenantId,
          customerId: Number(customerId),
          amount: Number(amount),
        }),
      );
    } catch (e: any) {
      fail(res, e);
    }
  });

  // ── subscriptions ───────────────────────────────────────────────────────
  app.post("/api/payments/subscription/intent", async (req: TenantRequest, res: Response) => {
    try {
      const { tenantId, planId, amount, email } = req.body ?? {};
      const tid = Number(tenantId ?? req.tenantId ?? 0);
      if (!tid) return res.status(400).json({ error: "tenantId is required" });
      res.json(
        await createSubscriptionIntent({
          tenantId: tid,
          planId: planId ? Number(planId) : null,
          amount: amount != null ? Number(amount) : null,
          email: email ?? null,
        }),
      );
    } catch (e: any) {
      fail(res, e);
    }
  });

  // ── hosted checkout ─────────────────────────────────────────────────────
  /**
   * Stripe-hosted Checkout Session.
   *
   * Public on purpose for `planId`: a prospect buying a plan on the marketing
   * site has no account yet. It is still safe because the amount is read from
   * subscription_plans - a caller can choose *which* plan, never its price.
   * An ad-hoc `amount` is refused here for the same reason.
   */
  app.post("/api/payments/checkout-session", async (req: TenantRequest, res: Response) => {
    try {
      const { planId, orderId, saleId, email, successUrl, cancelUrl } = req.body ?? {};
      if (!planId && !orderId && !saleId) {
        return res.status(400).json({ error: "planId, orderId or saleId is required" });
      }

      const base = process.env.PUBLIC_BASE_URL || `https://${req.get("host")}`;
      const kind = planId ? "tenant_subscription" : orderId ? "online_order" : "pos_sale";

      res.json(
        await createCheckoutSession({
          kind,
          planId: planId ? Number(planId) : null,
          orderId: orderId ? Number(orderId) : null,
          saleId: saleId ? Number(saleId) : null,
          tenantId: Number(req.tenantId ?? 0) || null,
          email: email ?? null,
          successUrl: String(successUrl || `${base}/pay/success`),
          cancelUrl: String(cancelUrl || `${base}/pay/cancelled`),
        }),
      );
    } catch (e: any) {
      fail(res, e);
    }
  });

  // ── refunds ─────────────────────────────────────────────────────────────
  app.post("/api/payments/refund", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { paymentIntentId, amount, reason } = req.body ?? {};
      if (!paymentIntentId) {
        return res.status(400).json({ error: "paymentIntentId is required" });
      }
      res.json(
        await refundPayment({
          paymentIntentId: String(paymentIntentId),
          amount: amount != null ? Number(amount) : null,
          reason,
        }),
      );
    } catch (e: any) {
      fail(res, e);
    }
  });

  // ── diagnostics ─────────────────────────────────────────────────────────
  /** Backs the "Test connection" button on the POS settings screen. */
  const health = async (_req: Request, res: Response) => {
    res.json(await stripeAccountStatus());
  };
  // ── Sham Cash (invoice based, SYP/USD stores) ─────────────────────────────
  const scFail = (res: Response, e: any) => {
    if (e instanceof ShamCashError) return res.status(e.statusCode).json({ error: e.message, code: e.code });
    fail(res, e);
  };

  /** Same proof of possession as the Stripe order intent: the tracking token. */
  async function orderFromToken(req: Request, res: Response): Promise<number | null> {
    const orderId = Number.parseInt(String(req.params.orderId), 10);
    if (!Number.isFinite(orderId)) {
      res.status(400).json({ error: "Invalid order id" });
      return null;
    }
    const token = String(req.body?.trackingToken ?? req.query.trackingToken ?? "");
    const rows = await q(`SELECT tracking_token FROM online_orders WHERE id = ? LIMIT 1`, [orderId]);
    if (!rows.length) {
      res.status(404).json({ error: "Order not found" });
      return null;
    }
    if (rows[0].tracking_token && token !== rows[0].tracking_token) {
      res.status(403).json({ error: "Invalid tracking token for this order" });
      return null;
    }
    return orderId;
  }

  app.post("/api/payments/order/:orderId/shamcash", async (req: Request, res: Response) => {
    try {
      const id = await orderFromToken(req, res);
      if (id == null) return;
      res.json(await createInvoiceFor({ kind: "order", id }, PUBLIC_BASE_URL));
    } catch (e: any) {
      scFail(res, e);
    }
  });

  app.post("/api/payments/order/:orderId/shamcash/verify", async (req: Request, res: Response) => {
    try {
      const id = await orderFromToken(req, res);
      if (id == null) return;
      res.json(await verifyInvoice({ kind: "order", id }, String(req.body?.tranId ?? "")));
    } catch (e: any) {
      scFail(res, e);
    }
  });

  // Manual mode: the customer leaves the transaction number for the store.
  app.post("/api/payments/order/:orderId/shamcash/reference", async (req: Request, res: Response) => {
    try {
      const id = await orderFromToken(req, res);
      if (id == null) return;
      await recordOrderReference(id, String(req.body?.reference ?? ""));
      res.json({ ok: true });
    } catch (e: any) {
      scFail(res, e);
    }
  });

  app.get("/api/payments/order/:orderId/shamcash/status", async (req: Request, res: Response) => {
    try {
      const id = await orderFromToken(req, res);
      if (id == null) return;
      res.json(await invoiceStatus({ kind: "order", id }));
    } catch (e: any) {
      scFail(res, e);
    }
  });

  /** Till: the cashier issues an invoice for a sale and verifies it. */
  async function saleOfTenant(req: TenantRequest, res: Response): Promise<number | null> {
    const saleId = Number.parseInt(String(req.params.saleId), 10);
    if (!Number.isFinite(saleId)) {
      res.status(400).json({ error: "Invalid sale id" });
      return null;
    }
    const rows = await q(
      `SELECT b.tenant_id FROM sales s JOIN branches b ON b.id = s.branch_id WHERE s.id = ? LIMIT 1`,
      [saleId],
    );
    if (!rows.length) {
      res.status(404).json({ error: "Sale not found" });
      return null;
    }
    if (req.tenantId && Number(rows[0].tenant_id) !== Number(req.tenantId)) {
      res.status(403).json({ error: "Sale belongs to another store" });
      return null;
    }
    return saleId;
  }

  app.post("/api/payments/sale/:saleId/shamcash", async (req: TenantRequest, res: Response) => {
    try {
      const id = await saleOfTenant(req, res);
      if (id == null) return;
      res.json(await createInvoiceFor({ kind: "sale", id }, PUBLIC_BASE_URL));
    } catch (e: any) {
      scFail(res, e);
    }
  });

  app.post("/api/payments/sale/:saleId/shamcash/verify", async (req: TenantRequest, res: Response) => {
    try {
      const id = await saleOfTenant(req, res);
      if (id == null) return;
      res.json(await verifyInvoice({ kind: "sale", id }, String(req.body?.tranId ?? "")));
    } catch (e: any) {
      scFail(res, e);
    }
  });

  app.get("/api/payments/sale/:saleId/shamcash/status", async (req: TenantRequest, res: Response) => {
    try {
      const id = await saleOfTenant(req, res);
      if (id == null) return;
      res.json(await invoiceStatus({ kind: "sale", id }));
    } catch (e: any) {
      scFail(res, e);
    }
  });

  /** Store settings: admin/owner only. */
  app.get("/api/payment-gateway/shamcash", requireAdmin, async (req: EmployeeRequest, res) => {
    try {
      const tenantId = Number((req as any).tenantId ?? 0) || 0;
      if (!tenantId) return res.status(400).json({ error: "tenant required" });
      res.json(await adminShamCashView(tenantId));
    } catch (e: any) {
      scFail(res, e);
    }
  });

  app.put("/api/payment-gateway/shamcash", requireAdmin, async (req: EmployeeRequest, res) => {
    try {
      const tenantId = Number((req as any).tenantId ?? 0) || 0;
      if (!tenantId) return res.status(400).json({ error: "tenant required" });
      const { enabled, qrImage, phone, holderName } = req.body ?? {};
      await saveShamCashSettings(tenantId, { enabled, qrImage, phone, holderName });
      res.json(await adminShamCashView(tenantId));
    } catch (e: any) {
      scFail(res, e);
    }
  });

  app.get("/api/payments/health", health);
  app.post("/api/payment-gateway/test-stripe", async (_req, res) => {
    const status = await stripeAccountStatus();
    res.json({ success: status.connected, ...status });
  });

  // ── legacy aliases, kept so older clients keep working ──────────────────
  app.get("/api/stripe/publishable-key", async (_req, res) => {
    const key = await getStripePublishableKey();
    if (!key) {
      return res
        .status(503)
        .json({ error: "Stripe is not configured", publishableKey: null });
    }
    res.json({ publishableKey: key });
  });

  app.get("/api/stripe/payment-methods", async (_req, res) => {
    try {
      res.json(await listAvailablePaymentMethods());
    } catch (e: any) {
      fail(res, e);
    }
  });

  /**
   * Deprecated. It used to take an arbitrary client-supplied amount, which let
   * a caller pay any price they liked. Amounts are now only ever derived from
   * a stored order or sale, so this redirects rather than charging.
   */
  app.post("/api/stripe/create-payment-intent", async (req: Request, res: Response) => {
    const orderId = req.body?.orderId ?? req.body?.metadata?.orderId;
    if (orderId) {
      try {
        return res.json(await createOrderPaymentIntent(Number(orderId)));
      } catch (e: any) {
        return fail(res, e);
      }
    }
    res.status(410).json({
      error:
        "This endpoint no longer accepts a client-supplied amount. Create the order first, " +
        "then call POST /api/payments/order/:orderId/intent.",
      code: "USE_ORDER_INTENT",
    });
  });

  app.post("/api/stripe/confirm-payment", async (req: Request, res: Response) => {
    try {
      const { paymentIntentId } = req.body ?? {};
      if (!paymentIntentId) {
        return res.status(400).json({ error: "paymentIntentId is required" });
      }
      const stripe = await requireStripeClient();
      const pi = await stripe.paymentIntents.retrieve(String(paymentIntentId));
      res.json({ status: pi.status, amount: pi.amount, currency: pi.currency });
    } catch (e: any) {
      fail(res, e);
    }
  });
}
