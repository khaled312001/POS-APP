/**
 * Store-locale helpers shared by the management screens (customers, drivers,
 * WhatsApp alerts, reports, online orders).
 *
 * Everything here is keyed off the store currency (branches.currency, see
 * lib/currency.ts). Swiss/CHF stores keep their existing behaviour: phones are
 * passed through untouched and the time zone is Europe/Zurich. Syrian (SYP)
 * stores get Syrian phone normalisation and Asia/Damascus day boundaries.
 */
import { getCurrency } from "@/lib/currency";

// ── Time zones ────────────────────────────────────────────────────────────────

/** Mirrors server/whatsappService.ts TIME_ZONE so client and server agree. */
const TIME_ZONE_BY_CURRENCY: Record<string, string> = {
  SYP: "Asia/Damascus",
  EGP: "Africa/Cairo",
  SAR: "Asia/Riyadh",
  AED: "Asia/Dubai",
};

export function storeTimeZone(currency: string = getCurrency()): string {
  return TIME_ZONE_BY_CURRENCY[String(currency || "").toUpperCase()] || "Europe/Zurich";
}

type Parts = { year: number; month: number; day: number; hour: number; minute: number; second: number };

function partsInTz(date: Date, timeZone: string): Parts | null {
  try {
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    const out: Record<string, number> = {};
    for (const p of fmt.formatToParts(date)) {
      if (p.type !== "literal") out[p.type] = Number(p.value);
    }
    if (!Number.isFinite(out.year) || !Number.isFinite(out.day)) return null;
    return {
      year: out.year,
      month: out.month,
      day: out.day,
      hour: out.hour === 24 ? 0 : out.hour,
      minute: out.minute,
      second: out.second,
    };
  } catch {
    return null; // engine without Intl time-zone support → caller falls back to device time
  }
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Calendar date (YYYY-MM-DD) of `date` as seen in the store's time zone. */
export function storeYmd(date: Date = new Date(), timeZone: string = storeTimeZone()): string {
  const p = partsInTz(date, timeZone);
  if (!p) return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** Offset (minutes, east of UTC positive) of `timeZone` at the instant `date`. */
export function tzOffsetMinutes(date: Date, timeZone: string = storeTimeZone()): number {
  const p = partsInTz(date, timeZone);
  if (!p) return -date.getTimezoneOffset();
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asUtc - Math.floor(date.getTime() / 1000) * 1000) / 60000);
}

/**
 * The UTC instant at which the store-local day `ymd` (YYYY-MM-DD) begins.
 * Use it for "from" bounds; for an inclusive "to" bound use
 * `storeDayStart(nextDay) - 1ms` (see storeDayEnd).
 */
export function storeDayStart(ymd: string, timeZone: string = storeTimeZone()): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  const guess = Date.UTC(y, (m || 1) - 1, d || 1, 0, 0, 0);
  // Two passes settle DST transitions.
  let ts = guess - tzOffsetMinutes(new Date(guess), timeZone) * 60000;
  ts = guess - tzOffsetMinutes(new Date(ts), timeZone) * 60000;
  return new Date(ts);
}

/** Last millisecond of the store-local day `ymd`. */
export function storeDayEnd(ymd: string, timeZone: string = storeTimeZone()): Date {
  return new Date(storeDayStart(addDaysYmd(ymd, 1), timeZone).getTime() - 1);
}

/** Pure calendar arithmetic on YYYY-MM-DD strings (no time zone involved). */
export function addDaysYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, (m || 1) - 1, (d || 1) + days));
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

/** Formats a timestamp for display in the store's time zone. */
export function formatInStoreTz(
  value: string | number | Date,
  locale: string,
  options: Intl.DateTimeFormatOptions,
  timeZone: string = storeTimeZone(),
): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  try {
    return date.toLocaleString(locale, { ...options, timeZone });
  } catch {
    return date.toLocaleString(locale, options);
  }
}

// ── Phone numbers ─────────────────────────────────────────────────────────────

function stripPhone(raw: string): string {
  // Arabic-Indic and Eastern Arabic-Indic digits → ASCII, then drop separators.
  const ascii = String(raw || "")
    .replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 0x06f0));
  return ascii.replace(/[\s\-().\/‎‏]/g, "").trim();
}

/**
 * Normalises a phone number the way the store expects it to be stored/sent.
 *
 * SYP stores: 09xxxxxxxx, 9xxxxxxxx, +963…, 00963… → "9639xxxxxxxx"
 * (international digits, no plus). Other explicit international numbers
 * (+…/00…) become plain digits too.
 *
 * Every other store: returned trimmed, otherwise unchanged — existing Swiss
 * stores keep exactly the data format they have today.
 */
export function normalizeStorePhone(raw: string, currency: string = getCurrency()): string {
  const cleaned = stripPhone(raw);
  if (!cleaned) return "";
  if (String(currency || "").toUpperCase() !== "SYP") return String(raw || "").trim();

  let digits = cleaned;
  if (digits.startsWith("+")) digits = digits.slice(1);
  else if (digits.startsWith("00")) digits = digits.slice(2);
  else if (digits.startsWith("0")) digits = "963" + digits.slice(1); // 09xxxxxxxx / 011xxxxxxx
  else if (/^9\d{8}$/.test(digits)) digits = "963" + digits; // 9xxxxxxxx (mobile without 0)
  // Same spelling as the server and the storefront (server/phone.ts: +963…),
  // so a customer the till saves is the one who orders online.
  digits = digits.replace(/\D/g, "");
  return digits ? "+" + digits : "";
}

/**
 * True when the value is a plausible phone number for this store.
 * SYP: Syrian numbers must be 963 + 8–9 digits (mobiles are 9639xxxxxxxx);
 * explicit foreign numbers need 8–15 digits. Other stores: 6–15 digits.
 */
export function isValidStorePhone(raw: string, currency: string = getCurrency()): boolean {
  const cleaned = stripPhone(raw);
  if (!cleaned) return false;
  if (String(currency || "").toUpperCase() !== "SYP") {
    const d = cleaned.replace(/^\+/, "").replace(/\D/g, "");
    return /^\+?[\d]+$/.test(cleaned) && d.length >= 6 && d.length <= 15;
  }
  if (!/^\+?\d+$/.test(cleaned)) return false;
  const n = normalizeStorePhone(cleaned, currency).replace(/^\+/, "");
  if (n.startsWith("963")) return /^963\d{8,9}$/.test(n) && !(n[3] === "9" && n.length !== 12);
  return n.length >= 8 && n.length <= 15;
}

/** Placeholder hint for phone inputs. */
export function storePhonePlaceholder(currency: string = getCurrency()): string {
  return String(currency || "").toUpperCase() === "SYP" ? "09xx xxx xxx" : "+41 79 123 45 67";
}
