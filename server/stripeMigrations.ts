/**
 * Schema additions required by the Stripe integration.
 *
 * Runs on boot, is idempotent, and never aborts startup: a payment column
 * that cannot be added is worth a loud log line, not a dead server.
 *
 * Production is MariaDB 11.8, which supports ADD COLUMN IF NOT EXISTS. The
 * per-statement try/catch keeps this safe on engines that do not.
 */
import { sql } from "drizzle-orm";
import { db } from "./db";

/** `table` -> column definitions to add if absent. */
const COLUMNS: Record<string, string[]> = {
  // Which Stripe objects paid for an online order, and when.
  online_orders: [
    "stripe_charge_id varchar(255)",
    "stripe_refund_id varchar(255)",
    "paid_at timestamp NULL DEFAULT NULL",
    "refunded_at timestamp NULL DEFAULT NULL",
    "amount_refunded decimal(10,2) DEFAULT 0",
    "payment_error text",
  ],
  // Till sales taken by card/TWINT rather than cash.
  sales: [
    "stripe_payment_intent_id varchar(255)",
    "stripe_charge_id varchar(255)",
    "stripe_refund_id varchar(255)",
    "paid_at timestamp NULL DEFAULT NULL",
  ],
  // A refund issued from the POS needs to point back at the Stripe refund.
  //
  // online_order_id closes a real gap: returns.original_sale_id points at
  // `sales` only, so the online orders that are the ones actually paid by card
  // or TWINT could not be refunded through the schema at all.
  returns: [
    "stripe_refund_id varchar(255)",
    "refund_status varchar(40)",
    "online_order_id int NULL DEFAULT NULL",
  ],
  // Billing identity for the shop owner, used for subscriptions and receipts.
  //
  // stripe_account_id is for Stripe Connect: if each restaurant's takings should
  // land in ITS own Stripe account rather than the platform's, that id goes here
  // and paymentService.buildIntent() gains on_behalf_of / transfer_data /
  // application_fee_amount. The column exists now so enabling Connect later is a
  // switch rather than a migration. Today the platform collects everything.
  tenants: [
    "stripe_customer_id varchar(255)",
    "stripe_account_id varchar(255)",
  ],
  tenant_subscriptions: [
    "stripe_customer_id varchar(255)",
    "stripe_subscription_id varchar(255)",
    "stripe_price_id varchar(255)",
    "last_invoice_id varchar(255)",
    "last_payment_error text",
  ],
  subscription_plans: [
    "stripe_price_id varchar(255)",
    "stripe_product_id varchar(255)",
  ],
};

const INDEXES: Array<{ table: string; name: string; cols: string }> = [
  { table: "online_orders", name: "idx_online_orders_pi", cols: "stripe_payment_intent_id(64)" },
  { table: "sales", name: "idx_sales_pi", cols: "stripe_payment_intent_id(64)" },
  { table: "wallet_transactions", name: "idx_wallet_tx_pi", cols: "stripe_payment_intent_id(64)" },
];

/**
 * Every webhook Stripe has delivered. The primary key is Stripe's own event
 * id, which is what makes redelivery a no-op: Stripe retries aggressively and
 * will happily send the same payment_intent.succeeded several times.
 */
const EVENTS_TABLE = `
  CREATE TABLE IF NOT EXISTS stripe_webhook_events (
    id            varchar(255) NOT NULL PRIMARY KEY,
    type          varchar(120) NOT NULL,
    api_version   varchar(40),
    livemode      tinyint(1) NOT NULL DEFAULT 0,
    status        varchar(20) NOT NULL DEFAULT 'received',
    error         text,
    payload       longtext,
    received_at   timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processed_at  timestamp NULL DEFAULT NULL,
    KEY idx_stripe_events_type (type),
    KEY idx_stripe_events_status (status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
`;

/**
 * Per-tenant gateway configuration. This used to be a module-level object in
 * index.ts, so every edit was lost on the next restart and every tenant shared
 * one setting. tenant_id 0 is the platform-wide default.
 */
const GATEWAY_TABLE = `
  CREATE TABLE IF NOT EXISTS payment_gateway_settings (
    id               int NOT NULL AUTO_INCREMENT PRIMARY KEY,
    tenant_id        int NOT NULL DEFAULT 0,
    enabled_methods  text,
    stripe_enabled   tinyint(1) NOT NULL DEFAULT 1,
    currency         varchar(10) NOT NULL DEFAULT 'CHF',
    auto_capture     tinyint(1) NOT NULL DEFAULT 1,
    cash_enabled     tinyint(1) NOT NULL DEFAULT 1,
    twint_enabled    tinyint(1) NOT NULL DEFAULT 1,
    apple_pay_enabled tinyint(1) NOT NULL DEFAULT 1,
    google_pay_enabled tinyint(1) NOT NULL DEFAULT 1,
    card_enabled     tinyint(1) NOT NULL DEFAULT 1,
    statement_descriptor varchar(40),
    config_json      longtext,
    created_at       timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_gateway_tenant (tenant_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
`;

async function run(label: string, statement: string): Promise<boolean> {
  try {
    await db.execute(sql.raw(statement));
    return true;
  } catch (e: any) {
    const msg = String(e?.message || e);
    // Re-running a completed migration is the normal case, not a problem.
    if (/duplicate|already exists|exists/i.test(msg)) return false;
    console.log(`[stripe-migration] ${label}: ${msg}`);
    return false;
  }
}

export async function runStripeMigrations(): Promise<void> {
  let added = 0;

  for (const [table, cols] of Object.entries(COLUMNS)) {
    for (const col of cols) {
      const name = col.split(/\s+/)[0];
      const ok = await run(
        `${table}.${name}`,
        `ALTER TABLE \`${table}\` ADD COLUMN IF NOT EXISTS ${col}`,
      );
      if (ok) added++;
    }
  }

  for (const stmt of [EVENTS_TABLE, GATEWAY_TABLE]) {
    await run("create table", stmt);
  }

  for (const ix of INDEXES) {
    // ADD INDEX has no IF NOT EXISTS on every engine; the catch covers it.
    await run(
      `${ix.table}.${ix.name}`,
      `ALTER TABLE \`${ix.table}\` ADD INDEX ${ix.name} (${ix.cols})`,
    );
  }

  console.log(
    added > 0
      ? `[stripe-migration] added ${added} column(s); tables and indexes ensured`
      : "[stripe-migration] schema already up to date",
  );
}
