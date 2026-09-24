/**
 * Wholesale traders (تجار الجملة): shops that buy from the store in bulk, at
 * wholesale prices, often on credit (آجل).
 *
 * Data model
 * ──────────
 * A trader is a row in `customers` with customer_type = 'wholesale'. Keeping
 * traders in the customers table means a till sale links to them through the
 * existing sales.customer_id, and every existing customer screen keeps
 * working (a trader is simply a customer with a few extra fields).
 *
 *   customers.customer_type      'retail' (default) | 'wholesale'
 *   customers.shop_name          trading name of the shop
 *   customers.tax_number         tax / commercial register number
 *   customers.credit_limit       NULL = no limit, 0 = no credit allowed
 *   customers.wholesale_balance  what the trader owes the store right now
 *
 * customers.credit_balance is NOT reused: it predates this module and is shown
 * as a separate "credit balance" in settings, so it keeps its own meaning.
 *
 * The balance only ever moves here, on the server, inside a transaction that
 * locks the customer row:
 *   + a till sale paid "credit" (sales.payment_method = 'credit')
 *   + a manual charge (opening balance / old debt)          wholesale_payments.kind = 'charge'
 *   − a collection from the trader                          wholesale_payments.kind = 'payment'
 *   − goods returned from a credit sale                     wholesale_payments.kind = 'return'
 * The generic /api/customers routes strip these fields (see
 * stripProtectedCustomerFields) so a stale form can never write a balance.
 */
import { pool } from "./db";
import { storeTimeZone, dayStart, dayEnd, monthStart as storeMonthStart } from "./storeTime";

async function q(sqlText: string, params: any[] = []): Promise<any[]> {
  const [rows] = await pool.query(sqlText, params);
  return Array.isArray(rows) ? (rows as any[]) : [];
}

export class WholesaleError extends Error {
  statusCode: number;
  code?: string;
  details?: Record<string, unknown>;
  constructor(message: string, statusCode = 400, code?: string, details?: Record<string, unknown>) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

// ── schema ──────────────────────────────────────────────────────────────────

const COLUMNS: Array<[table: string, column: string, definition: string]> = [
  ["products", "wholesale_price", "decimal(12,2) NULL DEFAULT NULL"],
  ["products", "wholesale_min_qty", "int NULL DEFAULT NULL"],
  ["customers", "customer_type", "varchar(20) NOT NULL DEFAULT 'retail'"],
  ["customers", "shop_name", "varchar(160) NULL DEFAULT NULL"],
  ["customers", "tax_number", "varchar(64) NULL DEFAULT NULL"],
  ["customers", "credit_limit", "decimal(14,2) NULL DEFAULT NULL"],
  ["customers", "wholesale_balance", "decimal(14,2) NOT NULL DEFAULT 0"],
];

const PAYMENTS_TABLE = `
  CREATE TABLE IF NOT EXISTS wholesale_payments (
    id int NOT NULL AUTO_INCREMENT PRIMARY KEY,
    tenant_id int NOT NULL,
    customer_id int NOT NULL,
    kind varchar(20) NOT NULL DEFAULT 'payment',
    amount decimal(14,2) NOT NULL,
    method varchar(30) NULL DEFAULT NULL,
    note varchar(500) NULL DEFAULT NULL,
    sale_id int NULL DEFAULT NULL,
    return_id int NULL DEFAULT NULL,
    employee_id int NULL DEFAULT NULL,
    balance_after decimal(14,2) NULL DEFAULT NULL,
    created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY ix_wp_tenant (tenant_id, created_at),
    KEY ix_wp_customer (customer_id, created_at),
    KEY ix_wp_sale (sale_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`;

async function columnExists(table: string, column: string): Promise<boolean> {
  const rows = await q(
    `SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1`,
    [table, column],
  );
  return rows.length > 0;
}

async function indexExists(table: string, index: string): Promise<boolean> {
  const rows = await q(
    `SELECT 1 FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ? LIMIT 1`,
    [table, index],
  );
  return rows.length > 0;
}

/**
 * Idempotent, never aborts startup. Each column is checked in
 * information_schema first (works on MySQL and MariaDB alike), and a
 * "duplicate column" race from a second process is treated as success.
 */
export async function runWholesaleMigrations(): Promise<void> {
  let added = 0;
  for (const [table, column, def] of COLUMNS) {
    try {
      if (await columnExists(table, column)) continue;
      await q(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${def}`);
      added++;
    } catch (e: any) {
      const msg = String(e?.message || e);
      if (!/duplicate column/i.test(msg)) console.error(`[wholesale] ${table}.${column}: ${msg}`);
    }
  }
  try {
    await q(PAYMENTS_TABLE);
  } catch (e: any) {
    console.error("[wholesale] wholesale_payments:", e?.message || e);
  }
  try {
    if (!(await indexExists("customers", "ix_customers_tenant_type"))) {
      await q(`ALTER TABLE customers ADD INDEX ix_customers_tenant_type (tenant_id, customer_type)`);
    }
  } catch (e: any) {
    const msg = String(e?.message || e);
    if (!/duplicate key name/i.test(msg)) console.error("[wholesale] customers index:", msg);
  }
  console.log(added > 0 ? `[wholesale] added ${added} column(s)` : "[wholesale] schema up to date");
}

// ── money helpers ───────────────────────────────────────────────────────────

const MAX_AMOUNT_CENTS = 100_000_000_000_00; // 100 billion — far beyond any SYP invoice

/** Money is handled in integer hundredths so repeated +/− never drifts. */
export function toCents(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}
const fromCents = (c: number) => (c / 100).toFixed(2);
const num = (v: unknown) => (v == null ? 0 : Number(v) || 0);
const numOrNull = (v: unknown) => (v == null || v === "" ? null : Number(v));

/** A positive amount from a request body, or a 400. */
export function parsePositiveAmount(v: unknown, field = "amount"): number {
  const raw = typeof v === "string" ? v.trim().replace(",", ".") : v;
  const n = Number(raw);
  if (raw === "" || raw == null || !Number.isFinite(n)) {
    throw new WholesaleError(`${field} must be a number`, 400, "INVALID_AMOUNT");
  }
  const cents = Math.round(n * 100);
  if (cents <= 0) throw new WholesaleError(`${field} must be greater than zero`, 400, "INVALID_AMOUNT");
  if (cents > MAX_AMOUNT_CENTS) throw new WholesaleError(`${field} is too large`, 400, "INVALID_AMOUNT");
  return cents;
}

/** Optional non-negative money value: "" / null clear it. */
function parseOptionalMoney(v: unknown, field: string): number | null {
  if (v === undefined || v === null) return null;
  const raw = typeof v === "string" ? v.trim().replace(",", ".") : v;
  if (raw === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) throw new WholesaleError(`${field} must be zero or more`, 400, "INVALID_AMOUNT");
  const cents = Math.round(n * 100);
  if (cents > MAX_AMOUNT_CENTS) throw new WholesaleError(`${field} is too large`, 400, "INVALID_AMOUNT");
  return cents;
}

const clip = (v: unknown, n: number): string | null => {
  const t = String(v ?? "").trim();
  return t ? t.slice(0, n) : null;
};

// ── products ────────────────────────────────────────────────────────────────

/**
 * Validates the two wholesale fields on a product create/update body in
 * place. Missing keys stay missing (an update that does not mention them
 * leaves them alone); "" or null clears them.
 */
export function normalizeWholesaleProductFields<T extends Record<string, any>>(body: T): T {
  if (!body || typeof body !== "object") return body;
  const b: Record<string, any> = body;
  if ("wholesalePrice" in b) {
    const cents = parseOptionalMoney(b.wholesalePrice, "wholesalePrice");
    b.wholesalePrice = cents == null ? null : fromCents(cents);
  }
  if ("wholesaleMinQty" in b) {
    const raw = b.wholesaleMinQty;
    if (raw === "" || raw == null) {
      b.wholesaleMinQty = null;
    } else {
      const n = Number(raw);
      if (!Number.isInteger(n) || n < 1 || n > 1_000_000) {
        throw new WholesaleError("wholesaleMinQty must be a whole number of at least 1", 400, "INVALID_QTY");
      }
      b.wholesaleMinQty = n;
    }
  }
  return body;
}

// ── customers ───────────────────────────────────────────────────────────────

/**
 * The generic customer routes take the request body almost verbatim. These
 * fields belong to the wholesale module and are only written through it.
 */
export function stripProtectedCustomerFields<T extends Record<string, any>>(body: T): T {
  if (!body || typeof body !== "object") return body;
  const b: Record<string, any> = { ...body };
  delete b.wholesaleBalance;
  delete b.wholesale_balance;
  delete b.creditLimit;
  delete b.credit_limit;
  delete b.customerType;
  delete b.customer_type;
  return b as T;
}

export interface Trader {
  id: number;
  name: string;
  shopName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  taxNumber: string | null;
  notes: string | null;
  creditLimit: number | null;
  balance: number;
  availableCredit: number | null;
  overLimit: boolean;
  isActive: boolean;
  createdAt: string | null;
  lastPaymentAt?: string | null;
  lastCreditSaleAt?: string | null;
}

function mapTrader(r: any): Trader {
  const balance = num(r.wholesale_balance);
  const creditLimit = numOrNull(r.credit_limit);
  return {
    id: Number(r.id),
    name: r.name,
    shopName: r.shop_name ?? null,
    phone: r.phone ?? null,
    email: r.email ?? null,
    address: r.address ?? null,
    taxNumber: r.tax_number ?? null,
    notes: r.notes ?? null,
    creditLimit,
    balance,
    availableCredit: creditLimit == null ? null : Math.max(0, (toCents(creditLimit) - toCents(balance)) / 100),
    overLimit: creditLimit != null && toCents(balance) > toCents(creditLimit),
    isActive: r.is_active == null ? true : !!Number(r.is_active),
    createdAt: r.created_at ? new Date(r.created_at).toISOString() : null,
    lastPaymentAt: r.last_payment_at ? new Date(r.last_payment_at).toISOString() : null,
    lastCreditSaleAt: r.last_credit_sale_at ? new Date(r.last_credit_sale_at).toISOString() : null,
  };
}

const TRADER_COLUMNS = `c.id, c.name, c.shop_name, c.phone, c.email, c.address, c.tax_number, c.notes,
  c.credit_limit, c.wholesale_balance, c.is_active, c.created_at`;

export async function listTraders(
  tenantId: number,
  opts: { search?: string; includeInactive?: boolean } = {},
): Promise<Trader[]> {
  const where = ["c.tenant_id = ?", "c.customer_type = 'wholesale'"];
  const params: any[] = [tenantId];
  if (!opts.includeInactive) where.push("(c.is_active = 1 OR c.is_active IS NULL)");
  const s = String(opts.search ?? "").trim();
  if (s) {
    const like = `%${s.slice(0, 80)}%`;
    where.push("(c.name LIKE ? OR c.shop_name LIKE ? OR c.phone LIKE ? OR c.tax_number LIKE ?)");
    params.push(like, like, like, like);
  }
  const rows = await q(
    `SELECT ${TRADER_COLUMNS},
       (SELECT MAX(p.created_at) FROM wholesale_payments p
         WHERE p.customer_id = c.id AND p.kind = 'payment') AS last_payment_at,
       (SELECT MAX(s.created_at) FROM sales s
         WHERE s.customer_id = c.id AND s.payment_method = 'credit') AS last_credit_sale_at
     FROM customers c
     WHERE ${where.join(" AND ")}
     ORDER BY c.wholesale_balance DESC, c.name ASC
     LIMIT 1000`,
    params,
  );
  return rows.map(mapTrader);
}

export async function getTrader(tenantId: number, id: number): Promise<Trader> {
  const rows = await q(
    `SELECT ${TRADER_COLUMNS} FROM customers c
      WHERE c.id = ? AND c.tenant_id = ? AND c.customer_type = 'wholesale' LIMIT 1`,
    [id, tenantId],
  );
  if (!rows[0]) throw new WholesaleError("Trader not found", 404, "NOT_FOUND");
  return mapTrader(rows[0]);
}

export interface TraderInput {
  name?: unknown;
  shopName?: unknown;
  phone?: unknown;
  email?: unknown;
  address?: unknown;
  taxNumber?: unknown;
  notes?: unknown;
  creditLimit?: unknown;
  isActive?: unknown;
}

async function withTx<T>(fn: (conn: any) => Promise<T>): Promise<T> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const out = await fn(conn);
    await conn.commit();
    return out;
  } catch (e) {
    try { await conn.rollback(); } catch { /* connection already gone */ }
    throw e;
  } finally {
    conn.release();
  }
}

async function cq(conn: any, sqlText: string, params: any[] = []): Promise<any> {
  const [rows] = await conn.query(sqlText, params);
  return rows;
}

/** Locks the trader row for the rest of the transaction. */
async function lockTrader(conn: any, tenantId: number, customerId: number, requireWholesale = true) {
  const rows = await cq(
    conn,
    `SELECT id, name, customer_type, is_active, credit_limit, wholesale_balance
       FROM customers WHERE id = ? AND tenant_id = ? FOR UPDATE`,
    [customerId, tenantId],
  );
  const row = rows?.[0];
  if (!row) throw new WholesaleError("Trader not found", 404, "NOT_FOUND");
  if (requireWholesale && row.customer_type !== "wholesale") {
    throw new WholesaleError("This customer is not a wholesale trader", 409, "NOT_WHOLESALE");
  }
  return row;
}

/**
 * Creates a trader, or turns an existing customer of the same store into one
 * (`customerId`). An opening balance, when given, is booked as a charge so
 * the statement explains where the number came from.
 */
export async function createTrader(
  tenantId: number,
  input: TraderInput & { customerId?: unknown; openingBalance?: unknown },
  employeeId: number | null,
): Promise<Trader> {
  const name = clip(input.name, 160);
  const limitCents = parseOptionalMoney(input.creditLimit, "creditLimit");
  const openingCents = parseOptionalMoney(input.openingBalance, "openingBalance") ?? 0;
  const existingId = input.customerId != null && input.customerId !== "" ? Number(input.customerId) : null;
  if (existingId != null && !Number.isInteger(existingId)) throw new WholesaleError("Invalid customerId", 400);
  if (!name && existingId == null) throw new WholesaleError("Name is required", 400, "NAME_REQUIRED");

  const id = await withTx(async (conn) => {
    let customerId: number;
    if (existingId != null) {
      const row = await lockTrader(conn, tenantId, existingId, false);
      if (row.customer_type === "wholesale") {
        throw new WholesaleError("This customer is already a wholesale trader", 409, "ALREADY_WHOLESALE");
      }
      await cq(
        conn,
        `UPDATE customers SET customer_type = 'wholesale',
            name = COALESCE(?, name), shop_name = ?, tax_number = ?, credit_limit = ?,
            phone = COALESCE(?, phone), email = COALESCE(?, email), address = COALESCE(?, address),
            notes = COALESCE(?, notes), is_active = 1, wholesale_balance = 0
          WHERE id = ? AND tenant_id = ?`,
        [
          name, clip(input.shopName, 160), clip(input.taxNumber, 64),
          limitCents == null ? null : fromCents(limitCents),
          clip(input.phone, 40), clip(input.email, 160), clip(input.address, 500), clip(input.notes, 1000),
          existingId, tenantId,
        ],
      );
      customerId = existingId;
    } else {
      const res = await cq(
        conn,
        `INSERT INTO customers
           (tenant_id, name, phone, email, address, notes, customer_type, shop_name, tax_number,
            credit_limit, wholesale_balance, is_active)
         VALUES (?, ?, ?, ?, ?, ?, 'wholesale', ?, ?, ?, 0, 1)`,
        [
          tenantId, name, clip(input.phone, 40), clip(input.email, 160), clip(input.address, 500),
          clip(input.notes, 1000), clip(input.shopName, 160), clip(input.taxNumber, 64),
          limitCents == null ? null : fromCents(limitCents),
        ],
      );
      customerId = Number(res.insertId);
    }
    if (openingCents > 0) {
      await cq(conn, `UPDATE customers SET wholesale_balance = ? WHERE id = ?`, [fromCents(openingCents), customerId]);
      await cq(
        conn,
        `INSERT INTO wholesale_payments
           (tenant_id, customer_id, kind, amount, method, note, employee_id, balance_after)
         VALUES (?, ?, 'charge', ?, 'opening', ?, ?, ?)`,
        [tenantId, customerId, fromCents(openingCents), "Opening balance", employeeId, fromCents(openingCents)],
      );
    }
    return customerId;
  });
  return getTrader(tenantId, id);
}

export async function updateTrader(tenantId: number, id: number, input: TraderInput): Promise<Trader> {
  await getTrader(tenantId, id); // 404 for a foreign or non-trader id
  const sets: string[] = [];
  const params: any[] = [];
  const text = (key: keyof TraderInput, col: string, max: number) => {
    if (input[key] !== undefined) { sets.push(`${col} = ?`); params.push(clip(input[key], max)); }
  };
  if (input.name !== undefined) {
    const name = clip(input.name, 160);
    if (!name) throw new WholesaleError("Name is required", 400, "NAME_REQUIRED");
    sets.push("name = ?"); params.push(name);
  }
  text("shopName", "shop_name", 160);
  text("phone", "phone", 40);
  text("email", "email", 160);
  text("address", "address", 500);
  text("taxNumber", "tax_number", 64);
  text("notes", "notes", 1000);
  if (input.creditLimit !== undefined) {
    const cents = parseOptionalMoney(input.creditLimit, "creditLimit");
    sets.push("credit_limit = ?"); params.push(cents == null ? null : fromCents(cents));
  }
  if (input.isActive !== undefined) {
    sets.push("is_active = ?"); params.push(input.isActive ? 1 : 0);
  }
  if (sets.length > 0) {
    params.push(id, tenantId);
    await q(`UPDATE customers SET ${sets.join(", ")} WHERE id = ? AND tenant_id = ? AND customer_type = 'wholesale'`, params);
  }
  return getTrader(tenantId, id);
}

/** Deactivating keeps the account and its history; the balance stays owed. */
export async function deactivateTrader(tenantId: number, id: number): Promise<Trader> {
  return updateTrader(tenantId, id, { isActive: false });
}

// ── ledger ──────────────────────────────────────────────────────────────────

export const PAYMENT_METHODS = ["cash", "card", "transfer", "shamcash", "cheque", "other"] as const;

/** A collection from the trader. Refuses more than is owed. */
export async function recordPayment(
  tenantId: number,
  customerId: number,
  body: { amount?: unknown; method?: unknown; note?: unknown },
  employeeId: number | null,
) {
  const cents = parsePositiveAmount(body.amount);
  const method = String(body.method || "cash").toLowerCase();
  if (!(PAYMENT_METHODS as readonly string[]).includes(method)) {
    throw new WholesaleError("Unknown payment method", 400, "INVALID_METHOD");
  }
  return withTx(async (conn) => {
    const row = await lockTrader(conn, tenantId, customerId);
    const balance = toCents(row.wholesale_balance);
    if (cents > balance) {
      throw new WholesaleError("Amount exceeds the outstanding balance", 409, "OVERPAYMENT", {
        balance: balance / 100,
      });
    }
    const next = balance - cents;
    await cq(conn, `UPDATE customers SET wholesale_balance = ? WHERE id = ?`, [fromCents(next), customerId]);
    const res = await cq(
      conn,
      `INSERT INTO wholesale_payments
         (tenant_id, customer_id, kind, amount, method, note, employee_id, balance_after)
       VALUES (?, ?, 'payment', ?, ?, ?, ?, ?)`,
      [tenantId, customerId, fromCents(cents), method, clip(body.note, 500), employeeId, fromCents(next)],
    );
    return { id: Number(res.insertId), amount: cents / 100, method, balance: next / 100 };
  });
}

/** A manual debit: an old debt carried over, goods delivered off-till, … */
export async function recordCharge(
  tenantId: number,
  customerId: number,
  body: { amount?: unknown; note?: unknown },
  employeeId: number | null,
) {
  const cents = parsePositiveAmount(body.amount);
  return withTx(async (conn) => {
    const row = await lockTrader(conn, tenantId, customerId);
    const next = toCents(row.wholesale_balance) + cents;
    await cq(conn, `UPDATE customers SET wholesale_balance = ? WHERE id = ?`, [fromCents(next), customerId]);
    const res = await cq(
      conn,
      `INSERT INTO wholesale_payments
         (tenant_id, customer_id, kind, amount, method, note, employee_id, balance_after)
       VALUES (?, ?, 'charge', ?, 'manual', ?, ?, ?)`,
      [tenantId, customerId, fromCents(cents), clip(body.note, 500), employeeId, fromCents(next)],
    );
    return { id: Number(res.insertId), amount: cents / 100, balance: next / 100 };
  });
}

/** Undo a payment or manual charge booked by mistake. */
export async function voidLedgerEntry(tenantId: number, entryId: number) {
  const rows = await q(
    `SELECT id, customer_id, kind, amount FROM wholesale_payments WHERE id = ? AND tenant_id = ? LIMIT 1`,
    [entryId, tenantId],
  );
  const entry = rows[0];
  if (!entry) throw new WholesaleError("Entry not found", 404, "NOT_FOUND");
  if (entry.kind === "return") {
    throw new WholesaleError("Returns are reversed from the returns screen", 409, "NOT_VOIDABLE");
  }
  return withTx(async (conn) => {
    const row = await lockTrader(conn, tenantId, Number(entry.customer_id));
    const amount = toCents(entry.amount);
    const next = toCents(row.wholesale_balance) + (entry.kind === "charge" ? -amount : amount);
    const del = await cq(conn, `DELETE FROM wholesale_payments WHERE id = ? AND tenant_id = ?`, [entryId, tenantId]);
    if (!del?.affectedRows) throw new WholesaleError("Entry not found", 404, "NOT_FOUND");
    await cq(conn, `UPDATE customers SET wholesale_balance = ? WHERE id = ?`, [fromCents(next), row.id]);
    return { balance: next / 100 };
  });
}

// ── till integration ────────────────────────────────────────────────────────

export interface CreditHold {
  tenantId: number;
  customerId: number;
  cents: number;
}

/**
 * Called by POST /api/sales before a sale paid "credit" is written. Checks
 * the customer is an active trader of this store and that the sale fits
 * under the credit limit, then books the amount — all under a row lock, so
 * two tills cannot both squeeze under the same limit.
 */
export async function holdCreditForSale(
  tenantId: number | undefined,
  customerId: unknown,
  totalAmount: unknown,
): Promise<CreditHold> {
  if (!tenantId) throw new WholesaleError("Store not identified", 401, "NO_TENANT");
  const cid = Number(customerId);
  if (!customerId || !Number.isInteger(cid) || cid <= 0) {
    throw new WholesaleError("A credit sale needs a wholesale trader as the customer", 400, "CUSTOMER_REQUIRED");
  }
  const cents = parsePositiveAmount(totalAmount, "totalAmount");
  await withTx(async (conn) => {
    const row = await lockTrader(conn, tenantId, cid);
    if (row.is_active != null && !Number(row.is_active)) {
      throw new WholesaleError("This trader account is deactivated", 409, "TRADER_INACTIVE");
    }
    const balance = toCents(row.wholesale_balance);
    const next = balance + cents;
    if (row.credit_limit != null) {
      const limit = toCents(row.credit_limit);
      if (next > limit) {
        throw new WholesaleError("Credit limit exceeded", 409, "CREDIT_LIMIT", {
          balance: balance / 100,
          creditLimit: limit / 100,
          available: Math.max(0, limit - balance) / 100,
        });
      }
    }
    await cq(conn, `UPDATE customers SET wholesale_balance = ? WHERE id = ?`, [fromCents(next), cid]);
  });
  return { tenantId, customerId: cid, cents };
}

/** Gives a hold back when the sale row could not be written after all. */
export async function releaseCreditHold(hold: CreditHold): Promise<void> {
  try {
    await q(
      `UPDATE customers SET wholesale_balance = wholesale_balance - ? WHERE id = ? AND tenant_id = ?`,
      [fromCents(hold.cents), hold.customerId, hold.tenantId],
    );
  } catch (e: any) {
    console.error("[wholesale] could not release credit hold", hold, e?.message || e);
  }
}

async function creditSaleOfTenant(tenantId: number, saleId: number) {
  const rows = await q(
    `SELECT s.id, s.customer_id, s.total_amount, s.receipt_number
       FROM sales s JOIN customers c ON c.id = s.customer_id
      WHERE s.id = ? AND s.payment_method = 'credit' AND c.tenant_id = ? LIMIT 1`,
    [saleId, tenantId],
  );
  return rows[0] ?? null;
}

/**
 * Before a credit sale is deleted: take what is still owed on it off the
 * trader's balance, and drop its return entries (the sale they credit is
 * about to disappear from the statement too). No-op for other sales.
 */
export async function reverseCreditSale(tenantId: number | undefined, saleId: number): Promise<void> {
  if (!tenantId || !Number.isInteger(saleId)) return;
  const sale = await creditSaleOfTenant(tenantId, saleId);
  if (!sale) return;
  await withTx(async (conn) => {
    const row = await lockTrader(conn, tenantId, Number(sale.customer_id), false);
    const ret = await cq(
      conn,
      `SELECT COALESCE(SUM(amount), 0) AS returned FROM wholesale_payments
        WHERE sale_id = ? AND kind = 'return' AND tenant_id = ?`,
      [saleId, tenantId],
    );
    const outstanding = Math.max(0, toCents(sale.total_amount) - toCents(ret?.[0]?.returned));
    await cq(conn, `DELETE FROM wholesale_payments WHERE sale_id = ? AND kind = 'return' AND tenant_id = ?`, [saleId, tenantId]);
    await cq(conn, `UPDATE customers SET wholesale_balance = ? WHERE id = ?`, [
      fromCents(toCents(row.wholesale_balance) - outstanding),
      row.id,
    ]);
  });
}

/**
 * After a return against a credit sale: the goods came back, so the trader
 * owes less. Capped at what is left of the sale after earlier returns.
 */
export async function creditReturnForSale(
  tenantId: number | undefined,
  saleId: unknown,
  returnId: number | null,
  returnTotal: unknown,
  employeeId: number | null,
): Promise<void> {
  const sid = Number(saleId);
  if (!tenantId || !Number.isInteger(sid) || sid <= 0) return;
  const requested = Math.abs(toCents(returnTotal));
  if (requested <= 0) return;
  const sale = await creditSaleOfTenant(tenantId, sid);
  if (!sale) return;
  await withTx(async (conn) => {
    const row = await lockTrader(conn, tenantId, Number(sale.customer_id), false);
    const ret = await cq(
      conn,
      `SELECT COALESCE(SUM(amount), 0) AS returned FROM wholesale_payments
        WHERE sale_id = ? AND kind = 'return' AND tenant_id = ?`,
      [sid, tenantId],
    );
    const left = Math.max(0, toCents(sale.total_amount) - toCents(ret?.[0]?.returned));
    const cents = Math.min(requested, left);
    if (cents <= 0) return;
    const next = toCents(row.wholesale_balance) - cents;
    await cq(conn, `UPDATE customers SET wholesale_balance = ? WHERE id = ?`, [fromCents(next), row.id]);
    await cq(
      conn,
      `INSERT INTO wholesale_payments
         (tenant_id, customer_id, kind, amount, method, note, sale_id, return_id, employee_id, balance_after)
       VALUES (?, ?, 'return', ?, 'return', ?, ?, ?, ?, ?)`,
      [
        tenantId, row.id, fromCents(cents), `Return on ${sale.receipt_number || `#${sid}`}`,
        sid, returnId, employeeId, fromCents(next),
      ],
    );
  });
}

// ── statement & summary ─────────────────────────────────────────────────────

export interface StatementEntry {
  id: string;
  date: string;
  type: "sale" | "payment" | "charge" | "return";
  reference: string | null;
  method: string | null;
  note: string | null;
  debit: number;   // increases what the trader owes
  credit: number;  // decreases it
  balance: number; // running balance after this entry
  saleId: number | null;
  entryId: number | null;
}

/** A statement date: "YYYY-MM-DD" is a whole day in the STORE's time zone. */
function parseDate(v: unknown, endOfDay = false, tz = "Europe/Zurich"): Date | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const d = /^\d{4}-\d{2}-\d{2}$/.test(s)
    ? (endOfDay ? dayEnd(tz, s) : dayStart(tz, s))
    : new Date(s);
  if (Number.isNaN(d.getTime())) throw new WholesaleError("Invalid date", 400, "INVALID_DATE");
  return d;
}

/**
 * Credit sales and ledger entries between `from` and `to`, with a running
 * balance. The running balance is anchored on the stored balance: the
 * opening figure is the current balance minus everything booked since
 * `from`, so the statement always agrees with the account.
 */
export async function getStatement(tenantId: number, customerId: number, fromRaw?: unknown, toRaw?: unknown) {
  const trader = await getTrader(tenantId, customerId);
  const tz = await storeTimeZone(tenantId);
  const from = parseDate(fromRaw, false, tz);
  const to = parseDate(toRaw, true, tz);

  const saleRows = await q(
    `SELECT id, receipt_number, total_amount, created_at FROM sales
      WHERE customer_id = ? AND payment_method = 'credit' ${from ? "AND created_at >= ?" : ""}
      ORDER BY created_at ASC, id ASC`,
    from ? [customerId, from] : [customerId],
  );
  const ledgerRows = await q(
    `SELECT id, kind, amount, method, note, sale_id, created_at FROM wholesale_payments
      WHERE customer_id = ? AND tenant_id = ? ${from ? "AND created_at >= ?" : ""}
      ORDER BY created_at ASC, id ASC`,
    from ? [customerId, tenantId, from] : [customerId, tenantId],
  );

  type Raw = Omit<StatementEntry, "balance"> & { at: number; cents: number };
  const all: Raw[] = [
    ...saleRows.map((s): Raw => {
      const cents = toCents(s.total_amount);
      return {
        id: `s${s.id}`, at: new Date(s.created_at).getTime(), date: new Date(s.created_at).toISOString(),
        type: "sale", reference: s.receipt_number ?? null, method: "credit", note: null,
        debit: cents / 100, credit: 0, cents, saleId: Number(s.id), entryId: null,
      };
    }),
    ...ledgerRows.map((p): Raw => {
      const cents = toCents(p.amount);
      const isDebit = p.kind === "charge";
      return {
        id: `p${p.id}`, at: new Date(p.created_at).getTime(), date: new Date(p.created_at).toISOString(),
        type: (["payment", "charge", "return"].includes(p.kind) ? p.kind : "payment") as StatementEntry["type"],
        reference: null, method: p.method ?? null, note: p.note ?? null,
        debit: isDebit ? cents / 100 : 0, credit: isDebit ? 0 : cents / 100,
        cents: isDebit ? cents : -cents, saleId: p.sale_id != null ? Number(p.sale_id) : null, entryId: Number(p.id),
      };
    }),
  ].sort((a, b) => a.at - b.at);

  const sinceFromNet = all.reduce((s, e) => s + e.cents, 0);
  const openingCents = toCents(trader.balance) - sinceFromNet;
  let running = openingCents;
  let debitCents = 0;
  let creditCents = 0;
  const entries: StatementEntry[] = [];
  for (const e of all) {
    if (to && e.at > to.getTime()) break;
    running += e.cents;
    if (e.cents > 0) debitCents += e.cents; else creditCents -= e.cents;
    const { at: _at, cents: _c, ...rest } = e;
    entries.push({ ...rest, balance: running / 100 });
  }

  return {
    trader,
    from: from ? from.toISOString() : null,
    to: to ? to.toISOString() : null,
    openingBalance: openingCents / 100,
    totalDebit: debitCents / 100,
    totalCredit: creditCents / 100,
    closingBalance: running / 100,
    entries,
  };
}

export async function getSummary(tenantId: number) {
  const [totals] = await q(
    `SELECT COUNT(*) AS traders,
            COALESCE(SUM(CASE WHEN is_active = 1 OR is_active IS NULL THEN 1 ELSE 0 END), 0) AS active,
            COALESCE(SUM(CASE WHEN wholesale_balance > 0 THEN wholesale_balance ELSE 0 END), 0) AS receivables,
            COALESCE(SUM(CASE WHEN wholesale_balance > 0 THEN 1 ELSE 0 END), 0) AS debtors,
            COALESCE(SUM(CASE WHEN credit_limit IS NOT NULL AND wholesale_balance > credit_limit THEN 1 ELSE 0 END), 0) AS over_limit
       FROM customers WHERE tenant_id = ? AND customer_type = 'wholesale'`,
    [tenantId],
  );
  // The 1st of this month at midnight in the store's own time zone.
  const monthStart = storeMonthStart(await storeTimeZone(tenantId));
  const [collected] = await q(
    `SELECT COALESCE(SUM(amount), 0) AS total FROM wholesale_payments
      WHERE tenant_id = ? AND kind = 'payment' AND created_at >= ?`,
    [tenantId, monthStart],
  );
  const [creditSales] = await q(
    `SELECT COALESCE(SUM(s.total_amount), 0) AS total, COUNT(*) AS count
       FROM sales s JOIN customers c ON c.id = s.customer_id
      WHERE c.tenant_id = ? AND s.payment_method = 'credit' AND s.created_at >= ?`,
    [tenantId, monthStart],
  );
  const top = await q(
    `SELECT ${TRADER_COLUMNS} FROM customers c
      WHERE c.tenant_id = ? AND c.customer_type = 'wholesale' AND c.wholesale_balance > 0
      ORDER BY c.wholesale_balance DESC LIMIT 5`,
    [tenantId],
  );
  return {
    traders: num(totals?.traders),
    activeTraders: num(totals?.active),
    totalReceivables: num(totals?.receivables),
    debtors: num(totals?.debtors),
    overLimit: num(totals?.over_limit),
    collectedThisMonth: num(collected?.total),
    creditSalesThisMonth: num(creditSales?.total),
    creditSalesCountThisMonth: num(creditSales?.count),
    monthStart: monthStart.toISOString(),
    topDebtors: top.map(mapTrader),
  };
}
