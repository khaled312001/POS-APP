import { getCurrency, isZeroDecimalCurrency } from "./currency";

/** Arabic-Indic / Persian digits → ASCII (phone numbers, PINs, amounts). */
export function toLatinDigits(text: string): string {
  return String(text ?? "")
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

/**
 * Money typed by a cashier. Accepts Arabic-Indic / Persian digits, the Arabic
 * decimal and thousands marks, "12,50" (German keyboards) and "12,500"
 * (thousands separator in a zero-decimal currency such as SYP).
 * Returns NaN when nothing numeric was typed.
 */
export function parseAmountInput(text: string | null | undefined, currency: string = getCurrency()): number {
  let s = String(text ?? "")
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/٫/g, ".") // Arabic decimal separator
    .replace(/[٬’'\s]/g, "") // Arabic thousands mark, apostrophe (CH), spaces
    .trim();
  if (!s) return NaN;
  if (isZeroDecimalCurrency(currency)) {
    // No minor units: every separator is a thousands separator.
    s = s.replace(/[.,]/g, "");
  } else if (s.includes(",") && s.includes(".")) {
    s = s.replace(/,/g, "");
  } else {
    s = s.replace(",", ".");
  }
  if (!/^-?\d*\.?\d*$/.test(s) || s === "" || s === "." || s === "-") return NaN;
  return Number(s);
}

/** Rounds to what the currency can actually be paid in (whole SYP, 0.01 CHF). */
export function roundMoney(value: number, currency: string = getCurrency()): number {
  const n = Number(value) || 0;
  if (isZeroDecimalCurrency(currency)) return Math.round(n);
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Fixed-point string for the API (decimal(…, 2) columns). */
export function moneyString(value: number, currency: string = getCurrency()): string {
  return roundMoney(value, currency).toFixed(2);
}

// Notes and coins a customer actually hands over.
const DENOMINATIONS: Record<string, number[]> = {
  // Old and new (2026, two zeros removed) Syrian pound notes side by side, so
  // the suggestions fit whichever price level the store works in.
  SYP: [10, 25, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 25000, 50000, 100000],
  CHF: [1, 2, 5, 10, 20, 50, 100, 200, 1000],
};
const DEFAULT_DENOMINATIONS = [1, 2, 5, 10, 20, 50, 100, 200, 500];

/**
 * Likely "cash received" amounts for a total: the next round sums a customer
 * pays with (e.g. 23.40 → 25 / 30 / 40 / 50; 12,340 SYP → 14,000 / 15,000 /
 * 20,000 / 25,000). The exact amount is offered separately by the caller.
 */
export function cashSuggestions(total: number, currency: string = getCurrency(), max = 4): number[] {
  const t = roundMoney(total, currency);
  if (!(t > 0)) return [];
  const notes = DENOMINATIONS[currency] || DEFAULT_DENOMINATIONS;
  const out = new Set<number>();
  for (const d of notes) {
    // Skip denominations far too small to matter for this total.
    if (d < t / 12) continue;
    const v = Math.ceil(t / d - 1e-9) * d;
    if (v > t + 1e-9) out.add(roundMoney(v, currency));
  }
  return Array.from(out).sort((a, b) => a - b).slice(0, max);
}

/** A sensible ± step for small manual corrections (delivery fee, adjustment). */
export function moneyStep(currency: string = getCurrency(), kind: "small" | "fee" = "small"): number {
  // New Syrian pound (~110 SYP/USD): 10 / 50 are the smallest useful steps.
  if (isZeroDecimalCurrency(currency)) return kind === "fee" ? 50 : 10;
  return kind === "fee" ? 0.5 : 1;
}
