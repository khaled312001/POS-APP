import { useSyncExternalStore } from "react";

/**
 * Store currency for every money display in the POS.
 *
 * The real value lives in `branches.currency` (main branch of the tenant) and
 * is pushed in here by the license context once the store is known, and again
 * by the POS screen whenever /api/store-settings is (re)fetched. Until then the
 * default is CHF, so existing Swiss stores render exactly as they always did.
 *
 * Module-level on purpose: receipt/HTML templates are plain functions outside
 * React, so they must be able to read the currency without a hook.
 */

const DEFAULT_CURRENCY = "CHF";

/** Currencies that are never shown with minor units. */
const ZERO_DECIMAL = new Set(["SYP"]);

/** Local-script symbol shown (as a suffix) when the UI language is Arabic. */
const ARABIC_SUFFIX: Record<string, string> = {
  SYP: "ل.س",
};

let currentCurrency = DEFAULT_CURRENCY;
let currentLanguage = "en";
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => {
    try { l(); } catch { /* ignore listener errors */ }
  });
}

export function getCurrency(): string {
  return currentCurrency;
}

/** Sets the store currency (e.g. from branches.currency). Falsy resets to CHF. */
export function setCurrency(code: string | null | undefined) {
  const next = String(code || "").trim().toUpperCase() || DEFAULT_CURRENCY;
  if (next === currentCurrency) return;
  currentCurrency = next;
  emit();
}

/** Called by LanguageProvider so formatMoney knows whether to use Arabic symbols. */
export function setMoneyLanguage(lang: string) {
  currentLanguage = lang || "en";
}

export function subscribeCurrency(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** Returns the current currency code and re-renders the caller when it changes. */
export function useCurrency(): string {
  return useSyncExternalStore(subscribeCurrency, getCurrency, getCurrency);
}

export function isZeroDecimalCurrency(code: string = currentCurrency): boolean {
  return ZERO_DECIMAL.has(code);
}

function groupThousands(intPart: string): string {
  return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * Number part only (no currency). CHF-style currencies keep the call site's
 * `toFixed(decimals)` output unless `group` is set; zero-decimal currencies
 * (SYP) are always rounded and grouped with thousands separators.
 */
export function formatAmount(value: unknown, decimals = 2, opts?: { group?: boolean }): string {
  let n = Number(value);
  if (!Number.isFinite(n)) n = 0;
  const zero = isZeroDecimalCurrency();
  const digits = zero ? 0 : decimals;
  const fixed = n.toFixed(digits);
  if (!zero && !opts?.group) return fixed;
  const neg = fixed.startsWith("-");
  const [intPart, frac] = (neg ? fixed.slice(1) : fixed).split(".");
  const grouped = groupThousands(intPart) + (frac ? `.${frac}` : "");
  return (neg && Number(fixed) !== 0 ? "-" : "") + grouped;
}

/** Short label for field captions such as "Delivery Fee (CHF)". */
export function currencyLabel(): string {
  if (currentLanguage === "ar" && ARABIC_SUFFIX[currentCurrency]) return ARABIC_SUFFIX[currentCurrency];
  return currentCurrency;
}

/** Attaches the currency to an already formatted number string. */
export function withCurrency(amountText: string): string {
  const suffix = currentLanguage === "ar" ? ARABIC_SUFFIX[currentCurrency] : undefined;
  if (suffix) return `${amountText} ${suffix}`;
  return `${currentCurrency} ${amountText}`;
}

/**
 * `CHF 12.50` for CHF/EUR/USD…, `SYP 12,500` (or `12,500 ل.س` in Arabic) for SYP.
 * A leading sign at the call site still works: `-{formatMoney(x)}` → `-CHF 2.00`.
 */
export function formatMoney(value: unknown, decimals = 2, opts?: { group?: boolean }): string {
  return withCurrency(formatAmount(value, decimals, opts));
}
