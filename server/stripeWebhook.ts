/**
 * Native Stripe webhook processing.
 *
 * The previous handler delegated to stripe-replit-sync, which mirrors Stripe
 * objects into Postgres. Production is MariaDB, so that path was a no-op and
 * nothing was ever marked paid by Stripe - orders were marked paid by the
 * client instead, which is exactly the wrong way round.
 *
 * The webhook is the ONLY thing allowed to move a record to "paid". A client
 * saying it paid is a claim; a signed Stripe event is proof.
 *
 * Idempotency has two layers, because Stripe retries and money bugs are
 * unforgiving:
 *   1. stripe_webhook_events.id is Stripe's event id and a primary key, so a
 *      redelivered event is rejected on insert.
 *   2. Each mutation is written to be safe if it somehow runs twice (wallet
 *      credits check for an existing row against the same PaymentIntent).
 *
 * Deliberately uses raw parameterised SQL rather than the Drizzle models:
 * several columns here are added at boot by stripeMigrations.ts and are not
 * described in shared/schema.ts.
 */
import type Stripe from "stripe";
import { requireStripeClient, getStripeWebhookSecret } from "./stripeClient";
import { pool } from "./db";

/** Metadata keys we attach when creating a PaymentIntent. */
import { provisionPaidPlan } from "./planSignup";

export const MK = {
  kind: "kassenta_kind",
  orderId: "kassenta_order_id",
  saleId: "kassenta_sale_id",
  tenantId: "kassenta_tenant_id",
  customerId: "kassenta_customer_id",
  planId: "kassenta_plan_id",
} as const;

export type PaymentKind =
  | "online_order"
  | "pos_sale"
  | "wallet_topup"
  | "tenant_subscription";

async function q(sqlText: string, params: any[] = []): Promise<any[]> {
  const [rows] = await pool.query(sqlText, params);
  return Array.isArray(rows) ? (rows as any[]) : [];
}

/** Stripe works in minor units; our tables store major units. */
function toMajor(minor: number | null | undefined): string {
  return (((minor ?? 0) as number) / 100).toFixed(2);
}

function meta(obj: { metadata?: Stripe.Metadata | null }, key: string): string | null {
  const v = obj.metadata?.[key];
  return v === undefined || v === null || v === "" ? null : String(v);
}

function metaInt(obj: { metadata?: Stripe.Metadata | null }, key: string): number | null {
  const v = meta(obj, key);
  if (v === null) return null;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}

// ── individual outcomes ──────────────────────────────────────────────────────

async function markOnlineOrderPaid(pi: Stripe.PaymentIntent): Promise<string> {
  const orderId = metaInt(pi, MK.orderId);
  if (!orderId) return "no order id in metadata";

  const chargeId =
    typeof (pi as any).latest_charge === "string"
      ? (pi as any).latest_charge
      : ((pi as any).latest_charge?.id ?? null);

  const res: any = await pool.query(
    `UPDATE online_orders
        SET payment_status = 'paid',
            stripe_payment_intent_id = ?,
            stripe_charge_id = COALESCE(?, stripe_charge_id),
            paid_at = COALESCE(paid_at, NOW()),
            payment_error = NULL
      WHERE id = ? AND payment_status <> 'paid'`,
    [pi.id, chargeId, orderId],
  );
  const changed = res?.[0]?.affectedRows ?? 0;
  return changed ? `order ${orderId} -> paid` : `order ${orderId} already paid`;
}

async function markOnlineOrderFailed(pi: Stripe.PaymentIntent): Promise<string> {
  const orderId = metaInt(pi, MK.orderId);
  if (!orderId) return "no order id in metadata";

  const reason =
    pi.last_payment_error?.message ??
    pi.last_payment_error?.code ??
    "payment failed";

  await q(
    `UPDATE online_orders
        SET payment_status = 'failed',
            stripe_payment_intent_id = ?,
            payment_error = ?
      WHERE id = ? AND payment_status <> 'paid'`,
    [pi.id, String(reason).slice(0, 500), orderId],
  );
  return `order ${orderId} -> failed (${reason})`;
}

async function markSalePaid(pi: Stripe.PaymentIntent): Promise<string> {
  const saleId = metaInt(pi, MK.saleId);
  if (!saleId) return "no sale id in metadata";

  const chargeId =
    typeof (pi as any).latest_charge === "string"
      ? (pi as any).latest_charge
      : ((pi as any).latest_charge?.id ?? null);

  await q(
    `UPDATE sales
        SET payment_status = 'paid',
            stripe_payment_intent_id = ?,
            stripe_charge_id = COALESCE(?, stripe_charge_id),
            paid_at = COALESCE(paid_at, NOW())
      WHERE id = ? AND payment_status <> 'paid'`,
    [pi.id, chargeId, saleId],
  );
  return `sale ${saleId} -> paid`;
}

/**
 * Wallet top-up. Guarded twice: the event table stops redelivery, and this
 * checks for a transaction already carrying the same PaymentIntent id, which
 * covers a top-up arriving via two different event types.
 */
async function creditWallet(pi: Stripe.PaymentIntent): Promise<string> {
  const customerId = metaInt(pi, MK.customerId);
  const tenantId = metaInt(pi, MK.tenantId);
  if (!customerId || !tenantId) return "missing customer/tenant in metadata";

  const existing = await q(
    `SELECT id FROM wallet_transactions WHERE stripe_payment_intent_id = ? LIMIT 1`,
    [pi.id],
  );
  if (existing.length) return `wallet already credited for ${pi.id}`;

  const amount = toMajor(pi.amount_received || pi.amount);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rows]: any = await conn.query(
      `SELECT wallet_balance FROM customers WHERE id = ? FOR UPDATE`,
      [customerId],
    );
    if (!rows?.length) {
      await conn.rollback();
      return `customer ${customerId} not found`;
    }

    const before = Number(rows[0].wallet_balance ?? 0);
    const after = before + Number(amount);

    await conn.query(`UPDATE customers SET wallet_balance = ? WHERE id = ?`, [
      after.toFixed(2),
      customerId,
    ]);

    await conn.query(
      `INSERT INTO wallet_transactions
         (customer_id, tenant_id, type, amount, balance_before, balance_after,
          stripe_payment_intent_id, description, created_at)
       VALUES (?, ?, 'top_up', ?, ?, ?, ?, ?, NOW())`,
      [
        customerId,
        tenantId,
        amount,
        before.toFixed(2),
        after.toFixed(2),
        pi.id,
        "Stripe top-up",
      ],
    );

    await conn.commit();
    return `wallet +${amount} for customer ${customerId} (now ${after.toFixed(2)})`;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

async function activateSubscription(pi: Stripe.PaymentIntent): Promise<string> {
  const tenantId = metaInt(pi, MK.tenantId);
  if (!tenantId) return "no tenant id in metadata";

  await q(
    `UPDATE tenant_subscriptions
        SET status = 'active',
            last_payment_date = NOW(),
            last_payment_error = NULL
      WHERE tenant_id = ?`,
    [tenantId],
  );
  await q(`UPDATE tenants SET status = 'active' WHERE id = ?`, [tenantId]);
  return `tenant ${tenantId} subscription -> active`;
}

/** Refunds arrive as charge.refunded, which carries the parent intent id. */
async function applyRefund(charge: Stripe.Charge): Promise<string> {
  const piId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
  if (!piId) return "charge has no payment intent";

  const refundId = charge.refunds?.data?.[0]?.id ?? null;
  const refunded = toMajor(charge.amount_refunded);
  const fully = charge.amount_refunded >= charge.amount;

  const res: any = await pool.query(
    `UPDATE online_orders
        SET payment_status = ?,
            amount_refunded = ?,
            stripe_refund_id = COALESCE(?, stripe_refund_id),
            refunded_at = COALESCE(refunded_at, NOW())
      WHERE stripe_payment_intent_id = ?`,
    [fully ? "refunded" : "partially_refunded", refunded, refundId, piId],
  );

  await q(
    `UPDATE sales
        SET payment_status = ?,
            stripe_refund_id = COALESCE(?, stripe_refund_id)
      WHERE stripe_payment_intent_id = ?`,
    [fully ? "refunded" : "partially_refunded", refundId, piId],
  );

  const n = res?.[0]?.affectedRows ?? 0;
  return `refund ${refunded} on ${piId} (${n} order row(s), ${fully ? "full" : "partial"})`;
}

// ── dispatch ────────────────────────────────────────────────────────────────

async function onPaymentIntentSucceeded(pi: Stripe.PaymentIntent): Promise<string> {
  const kind = (meta(pi, MK.kind) ?? "") as PaymentKind | "";

  switch (kind) {
    case "online_order":
      return markOnlineOrderPaid(pi);
    case "pos_sale":
      return markSalePaid(pi);
    case "wallet_topup":
      return creditWallet(pi);
    case "tenant_subscription":
      return activateSubscription(pi);
    default:
      // Older intents predate the metadata contract; fall back to whichever
      // record already references this intent so they still settle.
      if (metaInt(pi, MK.orderId)) return markOnlineOrderPaid(pi);
      await q(
        `UPDATE online_orders SET payment_status = 'paid', paid_at = COALESCE(paid_at, NOW())
          WHERE stripe_payment_intent_id = ? AND payment_status <> 'paid'`,
        [pi.id],
      );
      return `no kind metadata; settled by intent id ${pi.id}`;
  }
}

async function onCheckoutCompleted(session: Stripe.Checkout.Session): Promise<string> {
  const tenantId = metaInt(session, MK.tenantId);
  const kind = meta(session, MK.kind);

  if (kind === "tenant_subscription" && tenantId) {
    // A plan bought in the app (plans page after Google sign-up): create or
    // extend the store's licence. Keyed by the session id, so retries are no-ops.
    const planId = metaInt(session, MK.planId);
    if (planId && session.payment_status === "paid") {
      return provisionPaidPlan(tenantId, planId, session.id);
    }
    const subId =
      typeof session.subscription === "string"
        ? session.subscription
        : (session.subscription?.id ?? null);
    const custId =
      typeof session.customer === "string" ? session.customer : (session.customer?.id ?? null);

    await q(
      `UPDATE tenant_subscriptions
          SET status = 'active',
              stripe_subscription_id = COALESCE(?, stripe_subscription_id),
              stripe_customer_id = COALESCE(?, stripe_customer_id),
              last_payment_date = NOW()
        WHERE tenant_id = ?`,
      [subId, custId, tenantId],
    );
    if (custId) {
      await q(`UPDATE tenants SET stripe_customer_id = ?, status = 'active' WHERE id = ?`, [
        custId,
        tenantId,
      ]);
    }
    return `checkout completed for tenant ${tenantId}`;
  }

  const orderId = metaInt(session, MK.orderId);
  if (orderId && session.payment_status === "paid") {
    const piId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : (session.payment_intent?.id ?? null);
    await q(
      `UPDATE online_orders
          SET payment_status = 'paid',
              stripe_payment_intent_id = COALESCE(?, stripe_payment_intent_id),
              paid_at = COALESCE(paid_at, NOW())
        WHERE id = ? AND payment_status <> 'paid'`,
      [piId, orderId],
    );
    return `checkout completed for order ${orderId}`;
  }

  return "checkout session ignored (no recognised metadata)";
}

async function onInvoice(invoice: Stripe.Invoice, paid: boolean): Promise<string> {
  const custId =
    typeof invoice.customer === "string" ? invoice.customer : (invoice.customer?.id ?? null);
  if (!custId) return "invoice has no customer";

  if (paid) {
    await q(
      `UPDATE tenant_subscriptions
          SET status = 'active',
              last_payment_date = NOW(),
              last_invoice_id = ?,
              last_payment_error = NULL
        WHERE stripe_customer_id = ?`,
      [invoice.id, custId],
    );
    return `invoice ${invoice.id} paid for customer ${custId}`;
  }

  await q(
    `UPDATE tenant_subscriptions
        SET status = 'past_due',
            last_invoice_id = ?,
            last_payment_error = ?
      WHERE stripe_customer_id = ?`,
    [invoice.id, "invoice payment failed", custId],
  );
  return `invoice ${invoice.id} failed for customer ${custId}`;
}

async function onSubscriptionChanged(sub: Stripe.Subscription): Promise<string> {
  const custId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
  if (!custId) return "subscription has no customer";

  // Stripe statuses map cleanly enough onto ours; cancelled is the one that
  // must also flip the tenant, or a cancelled shop keeps trading.
  const status =
    sub.status === "active" || sub.status === "trialing"
      ? "active"
      : sub.status === "past_due" || sub.status === "unpaid"
        ? "past_due"
        : "cancelled";

  await q(
    `UPDATE tenant_subscriptions
        SET status = ?,
            stripe_subscription_id = ?,
            auto_renew = ?,
            cancelled_at = CASE WHEN ? = 'cancelled' THEN COALESCE(cancelled_at, NOW()) ELSE cancelled_at END
      WHERE stripe_customer_id = ?`,
    [status, sub.id, sub.cancel_at_period_end ? 0 : 1, status, custId],
  );

  if (status === "cancelled") {
    await q(`UPDATE tenants SET status = 'suspended' WHERE stripe_customer_id = ?`, [custId]);
  }
  return `subscription ${sub.id} -> ${status}`;
}

/** Returns a short human-readable outcome, logged against the event row. */
export async function dispatchStripeEvent(event: Stripe.Event): Promise<string> {
  const obj = event.data.object as any;

  switch (event.type) {
    case "payment_intent.succeeded":
      return onPaymentIntentSucceeded(obj as Stripe.PaymentIntent);
    case "payment_intent.payment_failed":
      return markOnlineOrderFailed(obj as Stripe.PaymentIntent);
    case "payment_intent.canceled":
      return markOnlineOrderFailed(obj as Stripe.PaymentIntent);
    case "charge.refunded":
      return applyRefund(obj as Stripe.Charge);
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      return onCheckoutCompleted(obj as Stripe.Checkout.Session);
    case "invoice.paid":
    case "invoice.payment_succeeded":
      return onInvoice(obj as Stripe.Invoice, true);
    case "invoice.payment_failed":
      return onInvoice(obj as Stripe.Invoice, false);
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
    case "customer.subscription.created":
      return onSubscriptionChanged(obj as Stripe.Subscription);
    default:
      return `ignored (${event.type})`;
  }
}

/**
 * Verify, de-duplicate, record and dispatch one webhook delivery.
 *
 * Throws only when the signature is bad - Stripe should see a 400 then. Any
 * failure in the business handler is recorded and rethrown so Stripe retries.
 */
export async function processStripeWebhook(
  rawBody: Buffer,
  signature: string,
): Promise<{ received: true; eventId: string; outcome: string }> {
  if (!Buffer.isBuffer(rawBody)) {
    throw new Error(
      "Stripe webhook payload must be a raw Buffer. The webhook route has to be " +
        "registered before express.json().",
    );
  }

  const secret = getStripeWebhookSecret();
  if (!secret) {
    const err: any = new Error("STRIPE_WEBHOOK_SECRET is not set");
    err.statusCode = 503;
    throw err;
  }

  const stripe = await requireStripeClient();
  // Throws on a bad signature; that is the whole point of this call.
  const event = stripe.webhooks.constructEvent(rawBody, signature, secret);

  // Claim the event. A duplicate key means Stripe is retrying something we
  // have already handled, so acknowledge without touching anything.
  try {
    await q(
      `INSERT INTO stripe_webhook_events (id, type, api_version, livemode, status, payload)
       VALUES (?, ?, ?, ?, 'received', ?)`,
      [
        event.id,
        event.type,
        event.api_version ?? null,
        event.livemode ? 1 : 0,
        JSON.stringify(event).slice(0, 4_000_000),
      ],
    );
  } catch (e: any) {
    if (e?.code === "ER_DUP_ENTRY" || /duplicate/i.test(String(e?.message))) {
      return { received: true, eventId: event.id, outcome: "duplicate, ignored" };
    }
    // A missing events table must not stop us settling a real payment.
    console.warn("[stripe-webhook] could not record event:", e?.message || e);
  }

  try {
    const outcome = await dispatchStripeEvent(event);
    await q(
      `UPDATE stripe_webhook_events SET status='processed', processed_at=NOW(), error=? WHERE id=?`,
      [outcome.slice(0, 500), event.id],
    ).catch(() => {});
    console.log(`[stripe-webhook] ${event.type} ${event.id}: ${outcome}`);
    return { received: true, eventId: event.id, outcome };
  } catch (e: any) {
    const msg = String(e?.message || e);
    await q(
      `UPDATE stripe_webhook_events SET status='failed', error=? WHERE id=?`,
      [msg.slice(0, 500), event.id],
    ).catch(() => {});
    console.error(`[stripe-webhook] ${event.type} ${event.id} FAILED: ${msg}`);
    // Rethrow so Stripe retries rather than marking it delivered.
    throw e;
  }
}
