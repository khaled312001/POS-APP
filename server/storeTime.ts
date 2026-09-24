/**
 * Store-local time and money.
 *
 * A store's "today" is its own calendar day, not the server's and not UTC:
 * a Damascus shop that closes at 23:30 must not see that sale on tomorrow's
 * report. The store's currency (branches.currency on the main branch) picks
 * the zone — SYP stores are in Asia/Damascus, the Swiss CHF stores in
 * Europe/Zurich — and the number of decimals for money.
 */
import { pool } from "./db";

const ZONE_BY_CURRENCY: Record<string, string> = {
  SYP: "Asia/Damascus",
  EGP: "Africa/Cairo",
  SAR: "Asia/Riyadh",
  AED: "Asia/Dubai",
  CHF: "Europe/Zurich",
  EUR: "Europe/Zurich",
};
export const DEFAULT_TIME_ZONE = "Europe/Zurich";

const ZERO_DECIMAL = new Set(["SYP", "IQD", "LBP", "JPY", "KRW"]);

/** Currencies that are never written with cents (SYP, IQD, LBP, …). */
export function isZeroDecimal(currency: string | null | undefined): boolean {
  return ZERO_DECIMAL.has(String(currency || "").toUpperCase());
}

/** Round an amount the way the currency is written: whole units for SYP, cents otherwise. */
export function roundMoney(amount: number, currency: string | null | undefined): number {
  const n = Number(amount) || 0;
  return isZeroDecimal(currency) ? Math.round(n) : Math.round(n * 100) / 100;
}

/** "12,500 ل.س" / "12.50 CHF" — for activity-log and notification text. */
export function formatMoney(amount: unknown, currency: string | null | undefined): string {
  const cur = String(currency || "CHF").toUpperCase();
  const n = Number(amount) || 0;
  if (isZeroDecimal(cur)) {
    const s = Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return cur === "SYP" ? `${s} ل.س` : `${s} ${cur}`;
  }
  return `${n.toFixed(2)} ${cur}`;
}

export function timeZoneForCurrency(currency: string | null | undefined): string {
  return ZONE_BY_CURRENCY[String(currency || "").toUpperCase()] || DEFAULT_TIME_ZONE;
}

// ── per-tenant lookups (cached: branch currency changes rarely) ────────────

const CACHE_MS = 5 * 60 * 1000;
const currencyCache = new Map<number, { at: number; currency: string }>();

/** Main-branch currency of a store ("CHF" when unknown). */
export async function storeCurrency(tenantId: number | null | undefined): Promise<string> {
  const id = Number(tenantId) || 0;
  if (!id) return "CHF";
  const hit = currencyCache.get(id);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.currency;
  let currency = "CHF";
  try {
    const [rows]: any = await pool.query(
      "SELECT currency FROM branches WHERE tenant_id = ? ORDER BY is_main DESC, id LIMIT 1",
      [id],
    );
    if (rows?.[0]?.currency) currency = String(rows[0].currency).toUpperCase();
  } catch { /* keep the default */ }
  currencyCache.set(id, { at: Date.now(), currency });
  return currency;
}

/** Store currency for a branch (sales carry a branch, not a tenant). */
export async function branchCurrency(branchId: number | null | undefined): Promise<string> {
  const id = Number(branchId) || 0;
  if (!id) return "CHF";
  try {
    const [rows]: any = await pool.query("SELECT tenant_id, currency FROM branches WHERE id = ? LIMIT 1", [id]);
    const row = rows?.[0];
    if (row?.currency) return String(row.currency).toUpperCase();
    if (row?.tenant_id) return storeCurrency(Number(row.tenant_id));
  } catch { /* default */ }
  return "CHF";
}

export async function storeTimeZone(tenantId: number | null | undefined): Promise<string> {
  return timeZoneForCurrency(await storeCurrency(tenantId));
}

// ── zone arithmetic (no dependencies: Intl only) ──────────────────────────

function partsIn(tz: string, d: Date) {
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const p: Record<string, number> = {};
  for (const x of f.formatToParts(d)) if (x.type !== "literal") p[x.type] = Number(x.value);
  return p as { year: number; month: number; day: number; hour: number; minute: number; second: number };
}

/** Offset of `tz` from UTC at instant `d`, in ms (Damascus summer → +3h). */
function offsetMs(tz: string, d: Date): number {
  const p = partsIn(tz, d);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - (d.getTime() - d.getMilliseconds());
}

/** The instant a wall-clock time in `tz` happens. */
function zonedToUtc(tz: string, y: number, m: number, d: number, hh = 0, mm = 0, ss = 0, ms = 0): Date {
  const guess = Date.UTC(y, m - 1, d, hh, mm, ss, ms);
  let t = guess - offsetMs(tz, new Date(guess));
  // Second pass settles DST edges.
  t = guess - offsetMs(tz, new Date(t));
  return new Date(t);
}

/** "YYYY-MM-DD" of instant `d` in `tz`. */
export function localDateString(tz: string, d: Date = new Date()): string {
  const p = partsIn(tz, d);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

/** "YYYYMMDD" of now in `tz` — order and receipt numbers. */
export function compactDate(tz: string, d: Date = new Date()): string {
  return localDateString(tz, d).replace(/-/g, "");
}

function ymd(s: string): [number, number, number] | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || "").trim());
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

/** Midnight at the start of the store day containing `d` (or of "YYYY-MM-DD"). */
export function dayStart(tz: string, d: Date | string = new Date()): Date {
  const parts = typeof d === "string" ? ymd(d) : null;
  if (typeof d === "string" && !parts) return new Date(NaN);
  const [y, m, day] = parts ?? (() => { const p = partsIn(tz, d as Date); return [p.year, p.month, p.day] as [number, number, number]; })();
  return zonedToUtc(tz, y, m, day);
}

/** Last millisecond of that store day. */
export function dayEnd(tz: string, d: Date | string = new Date()): Date {
  const start = dayStart(tz, d);
  if (isNaN(start.getTime())) return start;
  const p = partsIn(tz, new Date(start.getTime() + 12 * 3600 * 1000)); // noon of that day
  const next = zonedToUtc(tz, p.year, p.month, p.day + 1);
  return new Date(next.getTime() - 1);
}

/** Start of the store day `days` days before today (days = 6 → a 7-day window incl. today). */
export function daysAgoStart(tz: string, days: number, now: Date = new Date()): Date {
  const p = partsIn(tz, now);
  return zonedToUtc(tz, p.year, p.month, p.day - days);
}

/** First moment of the current store month. */
export function monthStart(tz: string, now: Date = new Date()): Date {
  const p = partsIn(tz, now);
  return zonedToUtc(tz, p.year, p.month, 1);
}

/** Store month "YYYY-MM" → [first ms, last ms]. */
export function monthRange(tz: string, month: string): [Date, Date] | null {
  const m = /^(\d{4})-(\d{2})$/.exec(String(month || "").trim());
  if (!m) return null;
  const y = Number(m[1]), mo = Number(m[2]);
  const start = zonedToUtc(tz, y, mo, 1);
  const next = zonedToUtc(tz, y, mo + 1, 1);
  return [start, new Date(next.getTime() - 1)];
}

/** "YYYY-MM" of now in `tz`. */
export function localMonthString(tz: string, d: Date = new Date()): string {
  return localDateString(tz, d).slice(0, 7);
}
