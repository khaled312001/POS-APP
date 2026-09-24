import { Alert, Platform } from "react-native";

/**
 * `Alert.alert` from react-native-web is an empty stub: on the web build every
 * error, validation message and confirm dialog routed through it silently does
 * nothing. The till runs mostly in the browser, so these helpers fall back to
 * the browser's own dialogs there and keep the native Alert everywhere else.
 */

export type AlertButton = {
  text: string;
  style?: "default" | "cancel" | "destructive";
  onPress?: () => void;
};

export function showAlert(title: string, message?: string, buttons?: AlertButton[]) {
  if (Platform.OS !== "web") {
    Alert.alert(title, message, buttons);
    return;
  }
  if (typeof window === "undefined") return;
  const text = [title, message].filter(Boolean).join("\n\n");
  const actions = (buttons || []).filter((b) => b.style !== "cancel");
  const cancel = (buttons || []).find((b) => b.style === "cancel");
  if (!buttons || buttons.length <= 1 || actions.length === 0) {
    window.alert(text);
    (actions[0] || cancel)?.onPress?.();
    return;
  }
  // Two or more buttons: OK runs the (first) real action, Cancel the cancel one.
  if (window.confirm(text)) actions[0].onPress?.();
  else cancel?.onPress?.();
}

/** Yes/no question; resolves true when the user confirms. */
export function confirmAsync(
  title: string,
  message: string,
  confirmText: string,
  cancelText: string,
  destructive = false,
): Promise<boolean> {
  return new Promise((resolve) => {
    showAlert(title, message, [
      { text: cancelText, style: "cancel", onPress: () => resolve(false) },
      { text: confirmText, style: destructive ? "destructive" : "default", onPress: () => resolve(true) },
    ]);
  });
}

/**
 * True when a request failed without a definite answer from the server —
 * offline, timed out (apiRequest aborts after 20 s) or a 5xx. The write may or
 * may not have happened, so it must not simply be retried blind.
 */
export function isUncertainFailure(e: unknown): boolean {
  const msg = String((e as any)?.message ?? e ?? "");
  if (/^4\d\d:/.test(msg)) return false;
  return true;
}

/** True when the request never reached the server or never came back. */
export function isNetworkFailure(e: unknown): boolean {
  const name = String((e as any)?.name ?? "");
  const msg = String((e as any)?.message ?? e ?? "");
  if (/^\d{3}:/.test(msg)) return false;
  return name === "AbortError" || /abort|network|failed to fetch|timeout|timed out|load failed|offline/i.test(msg) || !msg;
}

const NETWORK_COPY: Record<string, string> = {
  en: "No connection to the server. Check the internet connection and try again.",
  de: "Keine Verbindung zum Server. Bitte Internetverbindung prüfen und erneut versuchen.",
  ar: "لا يوجد اتصال بالخادم. تحقّق من الاتصال بالإنترنت وحاول مرة أخرى.",
};

/**
 * Human-readable text for a failed apiRequest: the server's own `error` field
 * when there is one ("400: {\"error\":\"…\"}" → "…"), a translated connection
 * message for network failures, otherwise the fallback.
 */
export function describeError(e: unknown, language: string, fallback: string): string {
  if (isNetworkFailure(e)) return NETWORK_COPY[language] || NETWORK_COPY.en;
  const raw = String((e as any)?.message ?? "");
  const body = raw.replace(/^\d{3}:\s*/, "");
  try {
    const parsed = JSON.parse(body);
    if (parsed && typeof parsed.error === "string" && parsed.error) return parsed.error;
    if (parsed && typeof parsed.message === "string" && parsed.message) return parsed.message;
  } catch { /* not JSON */ }
  // An HTML error page or an empty body is no use to a cashier.
  if (!body || body.startsWith("<")) return fallback;
  return body.length > 200 ? fallback : body;
}
