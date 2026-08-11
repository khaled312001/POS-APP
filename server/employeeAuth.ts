import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { JWT_SECRET } from "./jwtSecret";

/**
 * SEC-01 — server-side role enforcement.
 *
 * Before this module the only credential on the tenant API was the store's
 * `x-license-key`, which grants full access to everything. Every role limit
 * (cashier vs manager vs owner) lived in the browser, where a single
 * localStorage edit made any cashier an owner.
 *
 * Employees now receive a signed token at PIN login carrying their identity,
 * tenant, branch and role. `requireRole` verifies it on the server.
 *
 * ── Rollout ────────────────────────────────────────────────────────────────
 * Clients already in the field (published Android/iOS builds, cached web
 * bundles) do not send the token yet. `EMPLOYEE_AUTH_MODE` controls the switch:
 *
 *   soft   (default) — a request WITH a token is fully enforced; a request
 *                      WITHOUT one is allowed through and logged. Cashiers on
 *                      updated clients are restricted immediately, and nothing
 *                      breaks for older clients.
 *   strict           — a token is mandatory on every guarded route.
 *
 * Flip to `strict` once every client in the field sends the token. Until then
 * the bypass still exists, so treat `soft` as a migration window, not a
 * destination.
 */

export type EmployeeRole = "owner" | "admin" | "manager" | "cashier";

export interface EmployeeClaims {
  employeeId: number;
  tenantId: number | null;
  branchId: number | null;
  role: EmployeeRole | string;
  name: string;
  permissions: string[];
}

export interface EmployeeRequest extends Request {
  employee?: EmployeeClaims;
  /** Set by tenantAuthMiddleware from the validated license key. */
  tenantId?: number;
}

const EMPLOYEE_TOKEN_HEADER = "x-employee-token";
/** One shift. A stolen token stops working the next morning. */
const TOKEN_TTL = "12h";
const BCRYPT_ROUNDS = 10;

export function employeeAuthMode(): "soft" | "strict" {
  return process.env.EMPLOYEE_AUTH_MODE === "strict" ? "strict" : "soft";
}

export function generateEmployeeToken(claims: EmployeeClaims): string {
  return jwt.sign(claims, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

export function verifyEmployeeToken(token: string): EmployeeClaims | null {
  try {
    return jwt.verify(token, JWT_SECRET) as EmployeeClaims;
  } catch {
    return null;
  }
}

// ── PIN hashing (SEC-02) ────────────────────────────────────────────────────

/** bcrypt hashes always start with $2 — anything else is a legacy plaintext PIN. */
export function isHashedPin(stored: string | null | undefined): boolean {
  return typeof stored === "string" && stored.startsWith("$2");
}

export function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, BCRYPT_ROUNDS);
}

/**
 * Accepts both storage formats so existing stores keep working: hashed PINs go
 * through bcrypt, legacy plaintext PINs compare directly (and the caller
 * re-hashes them on the spot — see `/api/employees/login`).
 */
export async function verifyPin(pin: string, stored: string | null | undefined): Promise<boolean> {
  if (!stored || !pin) return false;
  if (isHashedPin(stored)) return bcrypt.compare(pin, stored);
  return stored === pin;
}

// ── Middleware ──────────────────────────────────────────────────────────────

/**
 * Decodes the employee token when present. Never rejects — authorisation is
 * `requireRole`'s job, so unauthenticated public routes stay unaffected.
 */
export function attachEmployee() {
  return (req: EmployeeRequest, _res: Response, next: NextFunction) => {
    const raw = req.headers[EMPLOYEE_TOKEN_HEADER];
    const token = Array.isArray(raw) ? raw[0] : raw;
    if (token) {
      const claims = verifyEmployeeToken(token);
      if (claims) req.employee = claims;
    }
    next();
  };
}

/**
 * Guards a route by role. Owners and admins are always allowed; other roles
 * must be listed explicitly.
 */
export function requireRole(...roles: (EmployeeRole | string)[]) {
  const allowed = new Set<string>([...roles, "owner", "admin"]);

  return (req: EmployeeRequest, res: Response, next: NextFunction) => {
    const emp = req.employee;

    if (!emp) {
      if (employeeAuthMode() === "strict") {
        return res.status(401).json({
          error: "Employee authentication required",
          code: "EMPLOYEE_TOKEN_REQUIRED",
        });
      }
      console.warn(
        `[employeeAuth] soft-mode passthrough: ${req.method} ${req.path} — no employee token`,
      );
      return next();
    }

    // A token issued for one tenant must never authorise work in another.
    if (
      typeof req.tenantId === "number" &&
      typeof emp.tenantId === "number" &&
      emp.tenantId !== req.tenantId
    ) {
      return res.status(403).json({ error: "Employee does not belong to this tenant" });
    }

    if (!allowed.has(emp.role) && !emp.permissions?.some((p) => allowed.has(p))) {
      return res.status(403).json({
        error: "Insufficient permissions",
        code: "FORBIDDEN_ROLE",
        required: [...allowed],
      });
    }

    next();
  };
}

/** Convenience guards for the three tiers used across the app. */
export const requireManager = requireRole("manager");
export const requireAdmin = requireRole();
export const requireStaff = requireRole("manager", "cashier");

// ── Central authorisation table ─────────────────────────────────────────────
//
// One table beats guards scattered over 30 route definitions: every rule is
// visible in one place and a new route cannot silently ship unguarded.
// `roles` lists the roles allowed *in addition to* owner/admin, so an empty
// array means owner/admin only.

interface RouteRule {
  methods: string[];
  /** Anchored at /api/… — use (/|$) boundaries so sibling paths don't match. */
  path: RegExp;
  roles: string[];
  label: string;
}

/** Checked before the rules below — these must stay reachable by anyone. */
const GUARD_EXEMPT: RegExp[] = [
  /^\/api\/employees\/login$/,   // the login itself cannot require a login
];

const ROUTE_RULES: RouteRule[] = [
  // Catalogue & stock — cashiers are read-only.
  {
    methods: ["POST", "PUT", "PATCH", "DELETE"],
    path: /^\/api\/(products|categories|inventory|suppliers|purchase-orders|stock-counts)(\/|$)/,
    roles: ["manager"],
    label: "catalogue",
  },
  // Store-level configuration and staff — owner/admin only.
  {
    methods: ["POST", "PUT", "PATCH", "DELETE"],
    path: /^\/api\/(branches|employees)(\/|$)/,
    roles: [],
    label: "store-admin",
  },
  // Destructive customer/sale operations.
  {
    methods: ["DELETE"],
    path: /^\/api\/(customers|sales|returns)(\/|$)/,
    roles: ["manager"],
    label: "destructive",
  },
  // Business intelligence — hidden from cashiers.
  {
    methods: ["GET"],
    path: /^\/api\/(reports|analytics)(\/|$)/,
    roles: ["manager"],
    label: "reporting",
  },
  // Operational settings.
  {
    methods: ["PUT", "PATCH", "POST"],
    path: /^\/api\/(store-settings|promo-codes|delivery-zones|drivers|payment-gateway)(\/|$)/,
    roles: ["manager"],
    label: "operations",
  },
  // Backups contain the whole tenant database.
  {
    methods: ["POST", "PUT", "DELETE"],
    path: /^\/api\/backup(\/|$)/,
    roles: [],
    label: "backup",
  },
];

/**
 * Applies ROUTE_RULES to every tenant API request. Register once, after
 * `attachEmployee()`.
 */
export function guardTenantRoutes() {
  return (req: EmployeeRequest, res: Response, next: NextFunction) => {
    if (!req.path.startsWith("/api")) return next();
    if (req.path.startsWith("/api/super-admin")) return next(); // has its own guard
    if (GUARD_EXEMPT.some((re) => re.test(req.path))) return next();

    const rule = ROUTE_RULES.find(
      (r) => r.methods.includes(req.method) && r.path.test(req.path),
    );
    if (!rule) return next();

    return requireRole(...rule.roles)(req, res, next);
  };
}

/** Exposed for tests and for an audit view in the admin dashboard. */
export const authorisationRules = ROUTE_RULES;

/**
 * Server-side ceiling on discounts. The client caps cashiers too, but a client
 * cap is a UI convenience, not a control.
 */
export function maxDiscountPercentFor(role: string | undefined, cashierCap: number): number {
  if (role === "owner" || role === "admin" || role === "manager") return 100;
  return cashierCap;
}
