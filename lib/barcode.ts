import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { useFocusEffect } from "expo-router";

/**
 * Barcode helpers shared by the till and the product form.
 *
 * Codes arrive from three places: the camera (expo-camera on native, zxing /
 * BarcodeDetector on web), a USB/Bluetooth scanner that "types" the code and
 * presses Enter, and a person typing. All of them go through normalizeBarcode
 * before being compared.
 */

/** Trim, drop whitespace and control characters a keyboard-wedge scanner may add. */
export function normalizeBarcode(raw: string): string {
  return String(raw ?? "")
    .replace(/[\u0000-\u001f\u007f\s]+/g, "")
    .trim();
}

/**
 * The same printed code can be read as UPC-A (12 digits) by one decoder and as
 * EAN-13 with a leading 0 by another, so a stored "012345678905" must match a
 * scanned "12345678905"-style variant and vice versa.
 */
function codeVariants(code: string): string[] {
  const c = code.toLowerCase();
  const out = new Set<string>([c]);
  if (/^\d+$/.test(c)) {
    if (c.length === 12) out.add("0" + c);
    if (c.length === 13 && c.startsWith("0")) out.add(c.slice(1));
  }
  return [...out];
}

/** Exact barcode match first (with UPC/EAN equivalence), then an exact SKU match. */
export function findProductByCode<T extends { barcode?: string | null; sku?: string | null }>(
  products: readonly T[] | null | undefined,
  rawCode: string,
): T | undefined {
  const code = normalizeBarcode(rawCode);
  if (!code || !products?.length) return undefined;
  const variants = codeVariants(code);
  const byBarcode = products.find((p) => {
    const b = normalizeBarcode(p?.barcode || "").toLowerCase();
    return !!b && variants.includes(b);
  });
  if (byBarcode) return byBarcode;
  const lc = code.toLowerCase();
  return products.find((p) => normalizeBarcode(p?.sku || "").toLowerCase() === lc);
}

/** Heuristic: does a string typed into a search box look like a scanned code? */
export function looksLikeBarcode(text: string): boolean {
  const s = normalizeBarcode(text);
  return s.length >= 6 && /^[0-9A-Za-z\-_.]+$/.test(s) && /\d{4,}/.test(s);
}

/**
 * Web only: catch codes from a USB/Bluetooth "keyboard wedge" scanner while no
 * text field has focus (otherwise the field itself receives them — handle that
 * with onSubmitEditing). Scanners type far faster than people, so a burst of
 * characters with <= maxGapMs between keys followed by Enter is treated as a scan.
 * Only listens while the calling screen is focused (tab screens stay mounted),
 * so it must be called from a screen component.
 */
export function useHardwareBarcodeScanner(
  enabled: boolean,
  onScan: (code: string) => void,
  opts?: { minLength?: number; maxGapMs?: number },
) {
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;
  const minLength = opts?.minLength ?? 4;
  const maxGapMs = opts?.maxGapMs ?? 60;

  const stateRef = useRef({ buf: "", last: 0 });
  const [screenFocused, setScreenFocused] = useState(true);
  useFocusEffect(useCallback(() => {
    setScreenFocused(true);
    return () => setScreenFocused(false);
  }, []));

  const handler = useCallback((e: KeyboardEvent) => {
    const state = stateRef.current;
    const target = e.target as HTMLElement | null;
    const tag = target?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target?.isContentEditable) {
      state.buf = "";
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const now = Date.now();
    if (e.key === "Enter" || e.key === "Tab") {
      const code = normalizeBarcode(state.buf);
      const fast = now - state.last <= maxGapMs * 3;
      state.buf = "";
      if (code.length >= minLength && fast) {
        e.preventDefault();
        onScanRef.current(code);
      }
      return;
    }
    if (e.key.length !== 1) return;
    state.buf = now - state.last > maxGapMs ? e.key : state.buf + e.key;
    state.last = now;
  }, [minLength, maxGapMs]);

  useEffect(() => {
    if (Platform.OS !== "web" || !enabled || !screenFocused || typeof window === "undefined") return;
    stateRef.current = { buf: "", last: 0 };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [enabled, screenFocused, handler]);
}
