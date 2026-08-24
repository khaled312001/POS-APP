/**
 * Creating and settling Stripe payments.
 *
 * The one rule this module exists to enforce: **the amount charged is read
 * from the database, never from the request body.** The public ordering
 * endpoints accept client-supplied line prices, so trusting a client-sent
 * total would let anyone pay CHF 0.01 for a CHF 60 order. Every function here
 * loads the record first and charges what the server already stored.
 *
 * Payment method coverage is delegated to Stripe: automatic_payment_methods
 * makes the PaymentIntent offer whatever is enabled on the account for the
 * currency and the customer's device - cards, TWINT, Apple Pay, Google Pay,
 * Link, Klarna and so on. Turning a method on in the Stripe Dashboard is
 * therefore enough to make it appear in the checkout; no code change needed.
 */
import type Stripe from "stripe";
import { requireStripeClient, getStripePublishableKey } from "./stripeClient";
import { pool } from "./db";
import { MK, type PaymentKind } from "./stripeWebhook";

/** Checkout sessions cover the same kinds plus ad-hoc amounts. */
type PaymentKindLite = PaymentKind;

const DEFAULT_CURRENCY = (process.env.DEFAULT_CURRENCY || "CHF").toLowerCase();

/** Guard rails so a bug cannot create an absurd charge. */
const MIN_MAJOR = 0.5;
const MAX_MAJOR = 20000;

export interface IntentResult {
  clientSecret: string;
  paymentIntentId: string;
  publishableKey: string | null;
  amount: number;
  currency: string;
}

async function q(sqlText: string, params: any[] = []): Promise<any[]> {
  const [rows] = await pool.query(sqlText, params);
  return Array.isArray(rows) ? (rows as any[]) : [];
}

function badRequest(message: string, status = 400): Error {
  const err: any = new Error(message);
  err.statusCode = status;
  return err;
}

/** Major units (CHF) -> minor units (rappen), with sanity bounds. */
function toMinor(major: number | string, label: string): number {
  const n = typeof major === "string" ? Number.parseFloat(major) : major;
  if (!Number.isFinite(n)) throw badRequest(`${label}: amount is not a number`);
  if (n < MIN_MAJOR) throw badRequest(`${label}: amount ${n} is below the ${MIN_MAJOR} minimum`);
  if (n > MAX_MAJOR) throw badRequest(`${label}: amount ${n} exceeds the ${MAX_MAJOR} maximum`);
  return Math.round(n * 100);
}

/**
 * Per-tenant currency, falling back to the platform default. Stored settings
 * come from payment_gateway_settings, written by the POS settings screen.
 */
export async function currencyFor(tenantId?: number | null): Promise<string> {
  if (!tenantId) return DEFAULT_CURRENCY;
  try {
    const rows = await q(
      `SELECT currency FROM payment_gateway_settings WHERE tenant_id IN (?, 0)
        ORDER BY tenant_id DESC LIMIT 1`,
      [tenantId],
    );
    const c = rows[0]?.currency;
    return c ? String(c).toLowerCase() : DEFAULT_CURRENCY;
  } catch {
    return DEFAULT_CURRENCY;
  }
}

async function buildIntent(opts: {
  amountMinor: number;
  currency: string;
  kind: PaymentKind;
  tenantId?: number | null;
  orderId?: number | null;
  saleId?: number | null;
  customerId?: number | null;
  description?: string;
  receiptEmail?: string | null;
  idempotencyKey?: string;
  stripeCustomerId?: string | null;
}): Promise<IntentResult> {
  const stripe = await requireStripeClient();

  const metadata: Record<string, string> = { [MK.kind]: opts.kind };
  if (opts.tenantId) metadata[MK.tenantId] = String(opts.tenantId);
  if (opts.orderId) metadata[MK.orderId] = String(opts.orderId);
  if (opts.saleId) metadata[MK.saleId] = String(opts.saleId);
  if (opts.customerId) metadata[MK.customerId] = String(opts.customerId);

  const params: Stripe.PaymentIntentCreateParams = {
    amount: opts.amountMinor,
    currency: opts.currency,
    metadata,
    description: opts.description,
    // Lets the Dashboard decide which methods are offered, per device and
    // currency, without a redeploy.
    automatic_payment_methods: { enabled: true },
  };
  if (opts.receiptEmail) params.receipt_email = opts.receiptEmail;
  if (opts.stripeCustomerId) params.customer = opts.stripeCustomerId;

  const intent = await stripe.paymentIntents.create(
    params,
    // Retrying the same order must not create a second charge.
    opts.idempotencyKey ? { idempotencyKey: opts.idempotencyKey } : undefined,
  );

  return {
    clientSecret: intent.client_secret!,
    paymentIntentId: intent.id,
    publishableKey: await getStripePublishableKey(),
    amount: opts.amountMinor,
    currency: opts.currency,
  };
}

// ── online orders ───────────────────────────────────────────────────────────

/**
 * Payment intent for an existing online order.
 *
 * The order must already be persisted; its stored total_amount is the only
 * amount that can be charged. Reuses an existing intent when one is still
 * usable, so a customer refreshing checkout does not strand intents.
 */
export async function createOrderPaymentIntent(orderId: number): Promise<IntentResult> {
  const rows = await q(
    `SELECT id, tenant_id, order_number, total_amount, payment_status,
            customer_email, stripe_payment_intent_id
       FROM online_orders WHERE id = ? LIMIT 1`,
    [orderId],
  );
  const order = rows[0];
  if (!order) throw badRequest(`Order ${orderId} not found`, 404);
  if (order.payment_status === "paid") throw badRequest("Order is already paid", 409);

  const currency = await currencyFor(order.tenant_id);
  const amountMinor = toMinor(order.total_amount, `order ${orderId}`);

  // Reuse an intent that is still payable and still for the right amount.
  if (order.stripe_payment_intent_id) {
    try {
      const stripe = await requireStripeClient();
      const existing = await stripe.paymentIntents.retrieve(order.stripe_payment_intent_id);
      const reusable =
        existing.amount === amountMinor &&
        existing.currency === currency &&
        ["requires_payment_method", "requires_confirmation", "requires_action", "processing"].includes(
          existing.status,
        );
      if (reusable) {
        return {
          clientSecret: existing.client_secret!,
          paymentIntentId: existing.id,
          publishableKey: await getStripePublishableKey(),
          amount: existing.amount,
          currency: existing.currency,
        };
      }
    } catch {
      // Unretrievable (wrong mode, deleted) - fall through and make a new one.
    }
  }

  const result = await buildIntent({
    amountMinor,
    currency,
    kind: "online_order",
    tenantId: order.tenant_id,
    orderId: order.id,
    description: `Order ${order.order_number}`,
    receiptEmail: order.customer_email || null,
    idempotencyKey: `order-${order.id}-${amountMinor}`,
  });

  await q(`UPDATE online_orders SET stripe_payment_intent_id = ? WHERE id = ?`, [
    result.paymentIntentId,
    orderId,
  ]);
  return result;
}

// ── till sales ──────────────────────────────────────────────────────────────

/**
 * Payment intent for a POS sale, so the cashier can take a card or TWINT
 * payment by showing the customer a QR / handing over a tablet.
 */
export async function createSalePaymentIntent(saleId: number): Promise<IntentResult> {
  const rows = await q(
    `SELECT s.id, s.receipt_number, s.total_amount, s.payment_status, b.tenant_id
       FROM sales s LEFT JOIN branches b ON b.id = s.branch_id
      WHERE s.id = ? LIMIT 1`,
    [saleId],
  );
  const sale = rows[0];
  if (!sale) throw badRequest(`Sale ${saleId} not found`, 404);
  if (sale.payment_status === "paid") throw badRequest("Sale is already paid", 409);

  const currency = await currencyFor(sale.tenant_id);
  const amountMinor = toMinor(sale.total_amount, `sale ${saleId}`);

  const result = await buildIntent({
    amountMinor,
    currency,
    kind: "pos_sale",
    tenantId: sale.tenant_id,
    saleId: sale.id,
    description: `Receipt ${sale.receipt_number}`,
    idempotencyKey: `sale-${sale.id}-${amountMinor}`,
  });

  await q(`UPDATE sales SET stripe_payment_intent_id = ? WHERE id = ?`, [
    result.paymentIntentId,
    saleId,
  ]);
  return result;
}

// ── wallet ──────────────────────────────────────────────────────────────────

/** The only flow where the client legitimately chooses the amount. */
export async function createWalletTopupIntent(opts: {
  tenantId: number;
  customerId: number;
  amount: number;
}): Promise<IntentResult> {
  const rows = await q(`SELECT id, email, tenant_id FROM customers WHERE id = ? LIMIT 1`, [
    opts.customerId,
  ]);
  const customer = rows[0];
  if (!customer) throw badRequest(`Customer ${opts.customerId} not found`, 404);
  if (Number(customer.tenant_id) !== Number(opts.tenantId)) {
    throw badRequest("Customer does not belong to this tenant", 403);
  }

  const currency = await currencyFor(opts.tenantId);
  const amountMinor = toMinor(opts.amount, "wallet top-up");

  return buildIntent({
    amountMinor,
    currency,
    kind: "wallet_topup",
    tenantId: opts.tenantId,
    customerId: opts.customerId,
    description: "Wallet top-up",
    receiptEmail: customer.email || null,
  });
}

// ── subscriptions ───────────────────────────────────────────────────────────

/** One-off payment for a tenant's plan, priced from subscription_plans. */
export async function createSubscriptionIntent(opts: {
  tenantId: number;
  planId?: number | null;
  amount?: number | null;
  email?: string | null;
}): Promise<IntentResult> {
  let amount = opts.amount ?? null;

  if (opts.planId) {
    const rows = await q(`SELECT id, name, price FROM subscription_plans WHERE id = ? LIMIT 1`, [
      opts.planId,
    ]);
    if (!rows.length) throw badRequest(`Plan ${opts.planId} not found`, 404);
    amount = Number(rows[0].price);
  }
  if (amount === null) throw badRequest("Either planId or amount is required");

  const currency = await currencyFor(opts.tenantId);
  return buildIntent({
    amountMinor: toMinor(amount, "subscription"),
    currency,
    kind: "tenant_subscription",
    tenantId: opts.tenantId,
    description: "Kassenta subscription",
    receiptEmail: opts.email ?? null,
  });
}

// ── refunds ─────────────────────────────────────────────────────────────────

/**
 * Refund a payment. Amount omitted means a full refund; the webhook writes
 * the result back, so this does not update our tables itself.
 */
export async function refundPayment(opts: {
  paymentIntentId: string;
  amount?: number | null;
  reason?: Stripe.RefundCreateParams.Reason;
}): Promise<{ refundId: string; amount: number; status: string | null }> {
  const stripe = await requireStripeClient();

  const params: Stripe.RefundCreateParams = { payment_intent: opts.paymentIntentId };
  if (opts.amount != null) params.amount = toMinor(opts.amount, "refund");
  if (opts.reason) params.reason = opts.reason;

  const refund = await stripe.refunds.create(params);
  return { refundId: refund.id, amount: refund.amount, status: refund.status };
}

// ── introspection ───────────────────────────────────────────────────────────

/**
 * Which payment methods the live account can actually present, straight from
 * Stripe rather than a hardcoded list, so the settings UI tells the truth.
 */
export async function listAvailablePaymentMethods(): Promise<{
  methods: string[];
  configuration: string | null;
}> {
  const stripe = await requireStripeClient();
  try {
    const configs = await stripe.paymentMethodConfigurations.list({ limit: 1 });
    const cfg: any = configs.data[0];
    if (!cfg) return { methods: [], configuration: null };

    const methods = Object.entries(cfg)
      .filter(([, v]: [string, any]) => v && typeof v === "object" && v.display_preference)
      .filter(([, v]: [string, any]) =>
        ["on", "default"].includes(v.display_preference.value ?? v.display_preference.preference),
      )
      .map(([k]) => k)
      .sort();

    return { methods, configuration: cfg.id ?? null };
  } catch (e: any) {
    console.warn("[stripe] could not list payment method configurations:", e?.message || e);
    return { methods: [], configuration: null };
  }
}

/** Account health, used by the settings screen's "Test connection" button. */
export async function stripeAccountStatus(): Promise<{
  connected: boolean;
  mode?: string;
  accountId?: string;
  country?: string;
  defaultCurrency?: string;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  methods?: string[];
  error?: string;
}> {
  try {
    const stripe = await requireStripeClient();
    const account = await stripe.accounts.retrieve();
    const { methods } = await listAvailablePaymentMethods();
    const pk = await getStripePublishableKey();
    return {
      connected: true,
      mode: pk?.startsWith("pk_live") ? "live" : "test",
      accountId: account.id,
      country: account.country ?? undefined,
      defaultCurrency: account.default_currency ?? undefined,
      chargesEnabled: account.charges_enabled ?? undefined,
      payoutsEnabled: account.payouts_enabled ?? undefined,
      methods,
    };
  } catch (e: any) {
    return { connected: false, error: e?.message || String(e) };
  }
}

// ── hosted checkout ─────────────────────────────────────────────────────────

/**
 * Stripe-hosted Checkout Session.
 *
 * Used by two surfaces that should not host card fields themselves:
 *   - the marketing site, where a prospect buys a plan before a tenant exists
 *   - the till, where the cashier shows the customer a link/QR to pay on their
 *     own phone (Stripe Terminal cannot do TWINT, so a reader would not help)
 *
 * Hosted checkout brings SCA, wallets, receipts and every Dashboard-enabled
 * method with no card data touching our servers.
 */
export async function createCheckoutSession(opts: {
  kind: PaymentKindLite;
  amount?: number | null;
  planId?: number | null;
  orderId?: number | null;
  saleId?: number | null;
  tenantId?: number | null;
  email?: string | null;
  description?: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ id: string; url: string | null; amount: number; currency: string }> {
  const stripe = await requireStripeClient();

  let amount = opts.amount ?? null;
  let label = opts.description ?? "Kassenta";

  if (opts.planId) {
    const rows = await q(`SELECT id, name, price FROM subscription_plans WHERE id = ? LIMIT 1`, [
      opts.planId,
    ]);
    if (!rows.length) throw badRequest(`Plan ${opts.planId} not found`, 404);
    amount = Number(rows[0].price);
    label = `Kassenta ${rows[0].name}`;
  } else if (opts.orderId) {
    const rows = await q(
      `SELECT order_number, total_amount, tenant_id FROM online_orders WHERE id = ? LIMIT 1`,
      [opts.orderId],
    );
    if (!rows.length) throw badRequest(`Order ${opts.orderId} not found`, 404);
    amount = Number(rows[0].total_amount);
    label = `Order ${rows[0].order_number}`;
  } else if (opts.saleId) {
    const rows = await q(
      `SELECT s.receipt_number, s.total_amount, b.tenant_id
         FROM sales s LEFT JOIN branches b ON b.id = s.branch_id
        WHERE s.id = ? LIMIT 1`,
      [opts.saleId],
    );
    if (!rows.length) throw badRequest(`Sale ${opts.saleId} not found`, 404);
    amount = Number(rows[0].total_amount);
    label = `Receipt ${rows[0].receipt_number}`;
  }

  if (amount === null) throw badRequest("Nothing to charge: pass planId, orderId, saleId or amount");

  const currency = await currencyFor(opts.tenantId ?? null);
  const amountMinor = toMinor(amount, label);

  const metadata: Record<string, string> = { [MK.kind]: opts.kind };
  if (opts.tenantId) metadata[MK.tenantId] = String(opts.tenantId);
  if (opts.orderId) metadata[MK.orderId] = String(opts.orderId);
  if (opts.saleId) metadata[MK.saleId] = String(opts.saleId);

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    // Omitting payment_method_types lets the Dashboard decide, which is how
    // TWINT / Klarna / PayPal appear without a code change.
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency,
          unit_amount: amountMinor,
          product_data: { name: label },
        },
      },
    ],
    metadata,
    // Mirrored onto the PaymentIntent so the webhook can settle either object.
    payment_intent_data: { metadata },
    customer_email: opts.email ?? undefined,
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
  });

  return { id: session.id, url: session.url, amount: amountMinor, currency };
}
