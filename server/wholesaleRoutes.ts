/**
 * /api/wholesale/* — wholesale traders (تجار الجملة), their statements and
 * collections. Data rules live in ./wholesale.ts; this file only maps HTTP.
 *
 * Every route is tenant-scoped through req.tenantId, which tenantAuth sets
 * from the validated licence key. Reading is open to all staff (the till
 * needs balances); collecting a payment is staff work; creating/editing
 * traders, manual charges and voiding entries are manager work.
 */
import type { Express, Response } from "express";
import { requireManager, requireStaff, type EmployeeRequest } from "./employeeAuth";
import {
  WholesaleError,
  listTraders,
  getTrader,
  createTrader,
  updateTrader,
  deactivateTrader,
  recordPayment,
  recordCharge,
  voidLedgerEntry,
  getStatement,
  getSummary,
} from "./wholesale";

function tenantOf(req: EmployeeRequest): number {
  const t = req.tenantId;
  if (!t || !Number.isInteger(t)) throw new WholesaleError("Store not identified", 401, "NO_TENANT");
  return t;
}

function idParam(v: unknown): number {
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) throw new WholesaleError("Invalid id", 400, "INVALID_ID");
  return n;
}

function employeeOf(req: EmployeeRequest): number | null {
  const fromToken = req.employee?.employeeId;
  if (fromToken && Number.isInteger(Number(fromToken))) return Number(fromToken);
  const fromBody = Number((req.body as any)?.employeeId);
  return Number.isInteger(fromBody) && fromBody > 0 ? fromBody : null;
}

function fail(res: Response, e: any) {
  if (e instanceof WholesaleError) {
    return res.status(e.statusCode).json({ error: e.message, code: e.code, ...(e.details || {}) });
  }
  console.error("[wholesale]", e?.message || e);
  return res.status(500).json({ error: "Wholesale request failed" });
}

type Handler = (req: EmployeeRequest, res: Response) => Promise<unknown>;
const wrap = (fn: Handler) => async (req: EmployeeRequest, res: Response) => {
  try {
    await fn(req, res);
  } catch (e) {
    fail(res, e);
  }
};

export function registerWholesaleRoutes(app: Express): void {
  app.get("/api/wholesale/summary", wrap(async (req, res) => {
    res.json(await getSummary(tenantOf(req)));
  }));

  app.get("/api/wholesale/traders", wrap(async (req, res) => {
    res.json(await listTraders(tenantOf(req), {
      search: typeof req.query.search === "string" ? req.query.search : undefined,
      includeInactive: req.query.includeInactive === "1" || req.query.includeInactive === "true",
    }));
  }));

  app.get("/api/wholesale/traders/:id", wrap(async (req, res) => {
    res.json(await getTrader(tenantOf(req), idParam(req.params.id)));
  }));

  app.get("/api/wholesale/traders/:id/statement", wrap(async (req, res) => {
    res.json(await getStatement(tenantOf(req), idParam(req.params.id), req.query.from, req.query.to));
  }));

  app.post("/api/wholesale/traders", requireManager, wrap(async (req, res) => {
    res.status(201).json(await createTrader(tenantOf(req), req.body || {}, employeeOf(req)));
  }));

  app.put("/api/wholesale/traders/:id", requireManager, wrap(async (req, res) => {
    const b = req.body || {};
    res.json(await updateTrader(tenantOf(req), idParam(req.params.id), {
      name: b.name, shopName: b.shopName, phone: b.phone, email: b.email, address: b.address,
      taxNumber: b.taxNumber, notes: b.notes, creditLimit: b.creditLimit, isActive: b.isActive,
    }));
  }));

  // Deactivate, not delete: the account and its history stay.
  app.delete("/api/wholesale/traders/:id", requireManager, wrap(async (req, res) => {
    res.json(await deactivateTrader(tenantOf(req), idParam(req.params.id)));
  }));

  app.post("/api/wholesale/traders/:id/payments", requireStaff, wrap(async (req, res) => {
    res.status(201).json(await recordPayment(tenantOf(req), idParam(req.params.id), req.body || {}, employeeOf(req)));
  }));

  app.post("/api/wholesale/traders/:id/charges", requireManager, wrap(async (req, res) => {
    res.status(201).json(await recordCharge(tenantOf(req), idParam(req.params.id), req.body || {}, employeeOf(req)));
  }));

  app.delete("/api/wholesale/entries/:id", requireManager, wrap(async (req, res) => {
    res.json(await voidLedgerEntry(tenantOf(req), idParam(req.params.id)));
  }));
}
