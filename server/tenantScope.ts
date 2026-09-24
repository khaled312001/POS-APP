/**
 * Row ownership for the tenant API.
 *
 * tenantAuth identifies the store from the licence key, but most `/:id`
 * routes then loaded, updated or deleted the row by id alone — any store
 * could read or change another store's products, customers, sales, orders …
 * by guessing numbers. Rather than repeating a check in 80 handlers, this
 * middleware resolves the owning store of every id a request names (path
 * `:id`, and `branchId` / `customerId` / `productId` / `employeeId` /
 * `vehicleId` / `supplierId` in the query or body) and answers 404 when the
 * row belongs to someone else. 404, not 403: a foreign id must look exactly
 * like a missing one.
 *
 * It only acts on licence-authenticated requests (req.tenantId set and not a
 * super admin). Public storefront routes never get a req.tenantId, so they
 * pass straight through.
 */
import type { Request, Response, NextFunction } from "express";
import { pool } from "./db";

type Resolver = (id: number) => Promise<number | null | undefined>;

async function one(sql: string, id: number): Promise<any | undefined> {
  const [rows]: any = await pool.query(sql, [id]);
  return rows?.[0];
}

// Branch → tenant never changes in practice; cache it briefly.
const branchCache = new Map<number, { at: number; tenantId: number | null }>();
export async function branchTenant(id: number): Promise<number | null | undefined> {
  const hit = branchCache.get(id);
  if (hit && Date.now() - hit.at < 60_000) return hit.tenantId;
  const row = await one("SELECT tenant_id FROM branches WHERE id = ? LIMIT 1", id);
  if (!row) return undefined;
  const tenantId = row.tenant_id == null ? null : Number(row.tenant_id);
  branchCache.set(id, { at: Date.now(), tenantId });
  return tenantId;
}

/** A row that carries tenant_id directly. */
const direct = (table: string): Resolver => async (id) => {
  const row = await one(`SELECT tenant_id FROM \`${table}\` WHERE id = ? LIMIT 1`, id);
  if (!row) return undefined;
  return row.tenant_id == null ? null : Number(row.tenant_id);
};

/** A row that belongs to a branch. */
const viaBranch = (table: string): Resolver => async (id) => {
  const row = await one(`SELECT branch_id FROM \`${table}\` WHERE id = ? LIMIT 1`, id);
  if (!row) return undefined;
  return row.branch_id == null ? null : branchTenant(Number(row.branch_id));
};

export const employeeTenant: Resolver = async (id) => {
  const row = await one("SELECT tenant_id, branch_id FROM employees WHERE id = ? LIMIT 1", id);
  if (!row) return undefined;
  if (row.tenant_id != null) return Number(row.tenant_id);
  return row.branch_id == null ? null : branchTenant(Number(row.branch_id));
};

const saleTenant: Resolver = async (id) => {
  const row = await one("SELECT branch_id, employee_id FROM sales WHERE id = ? LIMIT 1", id);
  if (!row) return undefined;
  if (row.branch_id != null) return branchTenant(Number(row.branch_id));
  return row.employee_id == null ? null : employeeTenant(Number(row.employee_id));
};

const shiftTenant: Resolver = async (id) => {
  const row = await one("SELECT branch_id, employee_id FROM shifts WHERE id = ? LIMIT 1", id);
  if (!row) return undefined;
  if (row.branch_id != null) return branchTenant(Number(row.branch_id));
  return employeeTenant(Number(row.employee_id));
};

const returnTenant: Resolver = async (id) => {
  const row = await one("SELECT branch_id, original_sale_id FROM `returns` WHERE id = ? LIMIT 1", id);
  if (!row) return undefined;
  if (row.branch_id != null) return branchTenant(Number(row.branch_id));
  return saleTenant(Number(row.original_sale_id));
};

const productBatchTenant: Resolver = async (id) => {
  const row = await one("SELECT branch_id, product_id FROM product_batches WHERE id = ? LIMIT 1", id);
  if (!row) return undefined;
  if (row.branch_id != null) return branchTenant(Number(row.branch_id));
  return direct("products")(Number(row.product_id));
};

const supplierContractTenant: Resolver = async (id) => {
  const row = await one("SELECT supplier_id FROM supplier_contracts WHERE id = ? LIMIT 1", id);
  if (!row) return undefined;
  return direct("suppliers")(Number(row.supplier_id));
};

const notificationTenant: Resolver = async (id) => {
  const row = await one("SELECT recipient_id FROM notifications WHERE id = ? LIMIT 1", id);
  if (!row) return undefined;
  return employeeTenant(Number(row.recipient_id));
};

export const resolvers = {
  product: direct("products"),
  category: direct("categories"),
  customer: direct("customers"),
  supplier: direct("suppliers"),
  expense: direct("expenses"),
  vehicle: direct("vehicles"),
  onlineOrder: direct("online_orders"),
  tableQr: direct("table_qr_codes"),
  zone: direct("delivery_zones"),
  promo: direct("promo_codes"),
  branch: (id: number) => branchTenant(id),
  employee: employeeTenant,
  sale: saleTenant,
  shift: shiftTenant,
  return: returnTenant,
  purchaseOrder: viaBranch("purchase_orders"),
  table: viaBranch("tables"),
  kitchenOrder: viaBranch("kitchen_orders"),
  warehouse: viaBranch("warehouses"),
  stockCount: viaBranch("stock_counts"),
  productBatch: productBatchTenant,
  supplierContract: supplierContractTenant,
  notification: notificationTenant,
};

/** [path pattern, resolver for the captured id]. First match wins. */
const PATH_RULES: [RegExp, Resolver][] = [
  [/^\/api\/products\/(\d+)(\/|$)/, resolvers.product],
  [/^\/api\/categories\/(\d+)(\/|$)/, resolvers.category],
  [/^\/api\/customers\/(\d+)(\/|$)/, resolvers.customer],
  [/^\/api\/branches\/(\d+)(\/|$)/, resolvers.branch],
  [/^\/api\/employees\/(\d+)(\/|$)/, resolvers.employee],
  [/^\/api\/sales\/(\d+)(\/|$)/, resolvers.sale],
  [/^\/api\/suppliers\/(\d+)(\/|$)/, resolvers.supplier],
  [/^\/api\/purchase-orders\/(\d+)(\/|$)/, resolvers.purchaseOrder],
  [/^\/api\/shifts\/active\/(\d+)$/, resolvers.employee],
  [/^\/api\/shifts\/(\d+)(\/|$)/, resolvers.shift],
  [/^\/api\/notifications\/(\d+)\/read$/, resolvers.notification],
  [/^\/api\/notifications\/(\d+)(\/unread-count|\/read-all)?$/, resolvers.employee],
  [/^\/api\/expenses\/(\d+)(\/|$)/, resolvers.expense],
  [/^\/api\/tables\/(\d+)(\/|$)/, resolvers.table],
  [/^\/api\/table-qr-codes\/(\d+)(\/|$)/, resolvers.tableQr],
  [/^\/api\/kitchen-orders\/(\d+)(\/|$)/, resolvers.kitchenOrder],
  [/^\/api\/returns\/(\d+)(\/|$)/, resolvers.return],
  [/^\/api\/cash-drawer\/(\d+)$/, resolvers.shift],
  [/^\/api\/warehouses\/(\d+)(\/|$)/, resolvers.warehouse],
  [/^\/api\/product-batches\/(\d+)(\/|$)/, resolvers.productBatch],
  [/^\/api\/stock-counts\/(\d+)(\/|$)/, resolvers.stockCount],
  [/^\/api\/supplier-contracts\/(\d+)(\/|$)/, resolvers.supplierContract],
  [/^\/api\/analytics\/employee-sales\/(\d+)$/, resolvers.employee],
  [/^\/api\/online-orders\/(\d+)(\/|$)/, resolvers.onlineOrder],
  [/^\/api\/vehicles\/(\d+)(\/|$)/, resolvers.vehicle],
  [/^\/api\/delivery\/manage\/orders\/(\d+)(\/|$)/, resolvers.onlineOrder],
  [/^\/api\/delivery\/manage\/zones\/(\d+)(\/|$)/, resolvers.zone],
  [/^\/api\/delivery\/promos\/(\d+)(\/|$)/, resolvers.promo],
  [/^\/api\/delivery\/loyalty\/(\d+)$/, resolvers.customer],
  [/^\/api\/delivery\/wallet\/(\d+)$/, resolvers.customer],
];

/** Foreign keys a request may name in its query string or JSON body. */
const FIELD_RULES: [string, Resolver][] = [
  ["branchId", resolvers.branch],
  ["customerId", resolvers.customer],
  ["productId", resolvers.product],
  ["employeeId", resolvers.employee],
  ["vehicleId", resolvers.vehicle],
  ["supplierId", resolvers.supplier],
];

function idOf(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function notFound(res: Response) {
  return res.status(404).json({ error: "Not found" });
}

export function enforceTenantOwnership() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const r = req as any;
    if (!req.path.startsWith("/api/")) return next();
    if (req.path.startsWith("/api/super-admin")) return next();
    if (r.isSuperAdmin) return next();
    const tenantId = r.tenantId;
    if (typeof tenantId !== "number" || !tenantId) return next();

    try {
      for (const [re, resolve] of PATH_RULES) {
        const m = re.exec(req.path);
        if (!m) continue;
        const owner = await resolve(Number(m[1]));
        // Missing rows fall through to the handler's own 404.
        if (owner !== undefined && owner !== tenantId) return notFound(res);
        break;
      }

      const sources: any[] = [req.query];
      if (req.body && typeof req.body === "object" && !Array.isArray(req.body)) sources.push(req.body);
      for (const src of sources) {
        for (const [field, resolve] of FIELD_RULES) {
          const id = idOf(src?.[field]);
          if (!id) continue;
          const owner = await resolve(id);
          if (owner !== undefined && owner !== tenantId) return notFound(res);
        }
      }
    } catch (e: any) {
      console.error("[tenantScope] ownership check failed:", e?.message || e);
      return res.status(500).json({ error: "Ownership check failed" });
    }
    next();
  };
}

/** For handlers: does row `id` (resolved with `resolve`) belong to this request's store? */
export async function ownedBy(req: Request, resolve: Resolver, id: number): Promise<boolean> {
  const r = req as any;
  if (r.isSuperAdmin) return true;
  const tenantId = r.tenantId;
  if (typeof tenantId !== "number" || !tenantId) return false;
  const owner = await resolve(id);
  return owner === tenantId;
}
