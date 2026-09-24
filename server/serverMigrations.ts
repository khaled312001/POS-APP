/**
 * Idempotent runtime migrations for the tenant-isolation / till work.
 * Safe to run on every boot: each step checks information_schema first and
 * only logs (never throws) on failure, so a boot is never blocked.
 *
 *  1. products.sku: unique PER STORE instead of globally. Two stores may
 *     both sell "COLA-330"; the old global UNIQUE made the second store's
 *     product save fail. The per-store index is added first, and the global
 *     one is only dropped once the per-store one exists.
 *  2. sales.client_ref: the till's idempotency key (Idempotency-Key header or
 *     paymentDetails[].ref), UNIQUE per branch, so a retried POST /api/sales
 *     returns the first sale instead of charging twice.
 */
import { pool } from "./db";

async function q(sqlText: string, params: any[] = []): Promise<any[]> {
  const [rows]: any = await pool.query(sqlText, params);
  return rows;
}

async function columnExists(table: string, column: string) {
  const rows = await q(
    `SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1`,
    [table, column],
  );
  return rows.length > 0;
}

async function indexExists(table: string, index: string) {
  const rows = await q(
    `SELECT 1 FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ? LIMIT 1`,
    [table, index],
  );
  return rows.length > 0;
}

/** True once sales.client_ref exists — the sale route only uses it then. */
export let salesClientRefReady = false;

async function migrateSkuPerTenant() {
  try {
    if (!(await indexExists("products", "ux_products_tenant_sku"))) {
      await q(`ALTER TABLE products ADD UNIQUE INDEX ux_products_tenant_sku (tenant_id, sku(191))`);
      console.log("[migrations] products: added UNIQUE (tenant_id, sku)");
    }
  } catch (e: any) {
    // Leave the global index in place if the per-store one could not be built.
    console.error("[migrations] products per-store sku index:", e?.message || e);
    return;
  }
  try {
    // Unique indexes whose ONLY column is sku (the old global constraint).
    const rows = await q(
      `SELECT INDEX_NAME AS name
         FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND NON_UNIQUE = 0
        GROUP BY INDEX_NAME
       HAVING COUNT(*) = 1 AND MAX(COLUMN_NAME) = 'sku'`,
    );
    for (const r of rows) {
      await q(`ALTER TABLE products DROP INDEX \`${String(r.name).replace(/`/g, "")}\``);
      console.log(`[migrations] products: dropped global sku index ${r.name}`);
    }
  } catch (e: any) {
    console.error("[migrations] products global sku index:", e?.message || e);
  }
}

async function migrateSalesClientRef() {
  try {
    if (!(await columnExists("sales", "client_ref"))) {
      await q(`ALTER TABLE sales ADD COLUMN client_ref VARCHAR(100) NULL`);
      console.log("[migrations] sales: added client_ref");
    }
    if (!(await indexExists("sales", "ux_sales_branch_client_ref"))) {
      await q(`ALTER TABLE sales ADD UNIQUE INDEX ux_sales_branch_client_ref (branch_id, client_ref)`);
    }
    salesClientRefReady = true;
  } catch (e: any) {
    const msg = String(e?.message || e);
    if (/duplicate (column|key)/i.test(msg)) salesClientRefReady = true;
    else console.error("[migrations] sales.client_ref:", msg);
  }
}

/** True once online_orders.client_ref / broadcast_orders.client_ref exist. */
export let orderClientRefReady = false;
export let broadcastClientRefReady = false;

/**
 * 3. online_orders.client_ref and broadcast_orders.client_ref: the
 *    storefront's Idempotency-Key, so a retried checkout returns the first
 *    order instead of placing a second one. Plain (non-unique) indexes.
 */
async function migrateOrderClientRef() {
  const targets: [string, string, string, () => void][] = [
    ["online_orders", "ix_online_orders_client_ref", "tenant_id, client_ref", () => { orderClientRefReady = true; }],
    // broadcast_orders has no tenant_id (it is not a store's order yet).
    ["broadcast_orders", "ix_broadcast_orders_client_ref", "client_ref", () => { broadcastClientRefReady = true; }],
  ];
  for (const [table, index, cols, setReady] of targets) {
    try {
      const exists = await q(
        `SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? LIMIT 1`, [table]);
      if (!exists.length) continue; // broadcast_orders is created lazily by its routes
      if (!(await columnExists(table, "client_ref"))) {
        await q(`ALTER TABLE \`${table}\` ADD COLUMN client_ref VARCHAR(100) NULL`);
        console.log(`[migrations] ${table}: added client_ref`);
      }
      if (!(await indexExists(table, index))) {
        await q(`ALTER TABLE \`${table}\` ADD INDEX ${index} (${cols})`);
      }
      setReady();
    } catch (e: any) {
      const msg = String(e?.message || e);
      if (/duplicate (column|key)/i.test(msg)) setReady();
      else console.error(`[migrations] ${table}.client_ref:`, msg);
    }
  }
}

/** For tables created lazily after boot (broadcast_orders). */
export async function ensureBroadcastClientRef(): Promise<void> {
  if (!broadcastClientRefReady) await migrateOrderClientRef();
}

/**
 * 4. customers.phone_verified_at: set when a customer proves the phone with
 *    an OTP login; order history across stores relies on it.
 */
async function migrateCustomerPhoneVerified() {
  try {
    if (!(await columnExists("customers", "phone_verified_at"))) {
      await q(`ALTER TABLE customers ADD COLUMN phone_verified_at DATETIME NULL`);
      console.log("[migrations] customers: added phone_verified_at");
    }
  } catch (e: any) {
    const msg = String(e?.message || e);
    if (!/duplicate column/i.test(msg)) console.error("[migrations] customers.phone_verified_at:", msg);
  }
}

export async function runServerMigrations(): Promise<void> {
  await migrateSkuPerTenant();
  await migrateSalesClientRef();
  await migrateOrderClientRef();
  await migrateCustomerPhoneVerified();
}
