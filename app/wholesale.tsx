/**
 * Wholesale traders (تجار الجملة).
 *
 * Shops that buy from the store in bulk at wholesale prices, often on credit
 * (آجل). A trader is a customer with customerType "wholesale"; at the till
 * their cart is billed at each product's wholesale price and can be paid
 * "credit", which the server books on the trader's balance (refused over the
 * credit limit). This screen lists traders with what they owe, shows each
 * trader's statement and records collections.
 *
 * Server: server/wholesale.ts + server/wholesaleRoutes.ts (/api/wholesale/*).
 */
import React, { useMemo, useState } from "react";
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator,
  Alert, Modal, Platform, Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { Colors } from "@/constants/colors";
import { themedStyles } from "@/lib/themed-styles";
import { useLicense } from "@/lib/license-context";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { apiRequest, getQueryFn } from "@/lib/query-client";
import { useLanguage } from "@/lib/language-context";
import { useTheme } from "@/lib/theme-context";
import { formatMoney, currencyLabel, isZeroDecimalCurrency, useCurrency } from "@/lib/currency";
import { printHtmlViaIframe } from "@/utils/printing";
import {
  normalizeStorePhone, isValidStorePhone, storePhonePlaceholder,
  storeYmd, storeDayStart, storeDayEnd, addDaysYmd, formatInStoreTz,
} from "@/components/store-locale";

interface Trader {
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
  lastPaymentAt?: string | null;
  lastCreditSaleAt?: string | null;
}

interface Summary {
  traders: number;
  activeTraders: number;
  totalReceivables: number;
  debtors: number;
  overLimit: number;
  collectedThisMonth: number;
  creditSalesThisMonth: number;
  creditSalesCountThisMonth: number;
  topDebtors: Trader[];
}

interface StatementEntry {
  id: string;
  date: string;
  type: "sale" | "payment" | "charge" | "return";
  reference: string | null;
  method: string | null;
  note: string | null;
  debit: number;
  credit: number;
  balance: number;
  saleId: number | null;
  entryId: number | null;
}

interface Statement {
  trader: Trader;
  openingBalance: number;
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
  entries: StatementEntry[];
}

type RangeKey = "month" | "30d" | "all" | "custom";
type LedgerMode = "payment" | "charge";

const EMPTY_FORM = {
  name: "", shopName: "", phone: "", email: "", address: "",
  taxNumber: "", creditLimit: "", notes: "", openingBalance: "",
};

const PAY_METHODS = ["cash", "card", "transfer", "shamcash", "cheque", "other"] as const;

/** Arabic-Indic / Eastern Arabic-Indic digits and Arabic separators → ASCII. */
function asciiDigits(v: string): string {
  return String(v ?? "")
    .replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 0x06f0))
    .replace(/٫/g, ".")
    .replace(/٬/g, ",");
}

/**
 * Cleans a money input while typing. Zero-decimal currencies (SYP) keep digits
 * only ("1,250,000" → "1250000"); others keep one decimal separator and at most
 * two decimals.
 */
function cleanMoneyInput(raw: string, zeroDecimals: boolean): string {
  let s = asciiDigits(raw).replace(/[\s'’]/g, "").replace(/[^0-9.,]/g, "");
  if (zeroDecimals) return s.replace(/[.,]/g, "");
  if (s.includes(".") && s.includes(",")) s = s.replace(/,/g, "");
  s = s.replace(/,/g, ".");
  const i = s.indexOf(".");
  if (i >= 0) s = s.slice(0, i + 1) + s.slice(i + 1).replace(/\./g, "").slice(0, 2);
  return s;
}

const isMoney = (v: string) => /^\d+(\.\d{1,2})?$/.test(v) && Number.isFinite(Number(v));
const isYmd = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v.trim()) && !Number.isNaN(new Date(`${v.trim()}T00:00:00Z`).getTime());

function escapeHtml(s: unknown): string {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

/** apiRequest throws "409: {json}" — pull out the server's error and code. */
function parseApiError(e: any): { message: string; code?: string; data?: any } {
  const raw = String(e?.message || e || "");
  const m = raw.match(/^\d{3}:\s*([\s\S]*)$/);
  if (m) {
    try {
      const data = JSON.parse(m[1]);
      return { message: data?.error || raw, code: data?.code, data };
    } catch {
      return { message: m[1] || raw };
    }
  }
  return { message: raw };
}

export default function WholesaleScreen() {
  const { tenant } = useLicense();
  const { canManage, employee } = useAuth();
  const { language, isRTL } = useLanguage();
  const currency = useCurrency();
  const zeroDec = isZeroDecimalCurrency(currency);
  useTheme(); // re-render on theme switch (styles are theme-aware)
  const cart = useCart();
  const qc = useQueryClient();
  const tenantId = (tenant as any)?.id;
  const L = (ar: string, de: string, en: string) => (language === "ar" ? ar : language === "de" ? de : en);
  const ta = isRTL ? ({ textAlign: "right" } as const) : null;
  // On web the document is dir="rtl" already, so a plain "row" is right-to-left;
  // flipping it again would lay the Arabic UI out left-to-right.
  const flipRow = isRTL && Platform.OS !== "web";
  const row = flipRow ? ({ flexDirection: "row-reverse" } as const) : ({ flexDirection: "row" } as const);
  const endAlign = flipRow ? ("flex-start" as const) : ("flex-end" as const);
  const dateLocale = language === "ar" ? "ar" : language === "de" ? "de-CH" : "en-GB";

  // ── list state ────────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  // ── trader form ───────────────────────────────────────────────────────────
  const [showForm, setShowForm] = useState(false);
  const [editTrader, setEditTrader] = useState<Trader | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // ── detail / statement ────────────────────────────────────────────────────
  const [detailId, setDetailId] = useState<number | null>(null);
  const [range, setRange] = useState<RangeKey>("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  // ── payment / charge ──────────────────────────────────────────────────────
  const [ledgerMode, setLedgerMode] = useState<LedgerMode | null>(null);
  const [ledgerAmount, setLedgerAmount] = useState("");
  const [ledgerMethod, setLedgerMethod] = useState<(typeof PAY_METHODS)[number]>("cash");
  const [ledgerNote, setLedgerNote] = useState("");
  const [ledgerBusy, setLedgerBusy] = useState(false);

  const invalidate = () =>
    qc.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith("/api/wholesale") });

  const notify = (title: string, message: string) => {
    if (Platform.OS === "web" && typeof window !== "undefined") window.alert(`${title}\n\n${message}`);
    else Alert.alert(title, message);
  };
  const confirm = (title: string, message: string, onYes: () => void) => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      if (window.confirm(`${title}\n\n${message}`)) onYes();
      return;
    }
    Alert.alert(title, message, [
      { text: L("إلغاء", "Abbrechen", "Cancel"), style: "cancel" },
      { text: L("تأكيد", "Bestätigen", "Confirm"), style: "destructive", onPress: onYes },
    ]);
  };

  const errorText = (e: any) => {
    const { message, code, data } = parseApiError(e);
    switch (code) {
      case "OVERPAYMENT":
        return L(
          `المبلغ أكبر من الرصيد المستحق (${formatMoney(data?.balance)})`,
          `Betrag übersteigt den offenen Saldo (${formatMoney(data?.balance)})`,
          `Amount exceeds the outstanding balance (${formatMoney(data?.balance)})`,
        );
      case "INVALID_AMOUNT": return L("أدخل مبلغاً صحيحاً أكبر من صفر", "Bitte einen gültigen Betrag über null eingeben", "Enter a valid amount greater than zero");
      case "NAME_REQUIRED": return L("اسم التاجر مطلوب", "Name ist erforderlich", "Name is required");
      case "FORBIDDEN_ROLE": return L("هذه العملية للمدير فقط", "Nur für Manager", "Managers only");
      default: return message || L("حدث خطأ", "Fehler", "Something went wrong");
    }
  };

  // ── queries ───────────────────────────────────────────────────────────────
  const { data: summary, refetch: refetchSummary } = useQuery<Summary>({
    queryKey: [`/api/wholesale/summary?tenantId=${tenantId || ""}`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!tenantId,
  });

  const { data: traders = [], isLoading, isError: tradersError, refetch: refetchTraders } = useQuery<Trader[]>({
    queryKey: [`/api/wholesale/traders?tenantId=${tenantId || ""}${showInactive ? "&includeInactive=1" : ""}`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!tenantId,
  });

  const filtered = useMemo(() => {
    const s = asciiDigits(search).trim().toLowerCase();
    if (!s) return traders;
    // Phones are stored normalised (e.g. 9639xxxxxxxx), so "09…" must still match.
    const digits = s.replace(/\D/g, "");
    const phoneKey = digits.length >= 6 ? normalizeStorePhone(s).replace(/\D/g, "").slice(-9) : "";
    return traders.filter((t) =>
      [t.name, t.shopName, t.phone, t.taxNumber].some((v) => String(v || "").toLowerCase().includes(s))
      || (!!phoneKey && String(t.phone || "").replace(/\D/g, "").includes(phoneKey)));
  }, [traders, search]);

  // Calendar days are the store's (Asia/Damascus for SYP), not the device's.
  const { fromDate, toDate } = useMemo(() => {
    const today = storeYmd();
    if (range === "month") return { fromDate: `${today.slice(0, 7)}-01`, toDate: "" };
    if (range === "30d") return { fromDate: addDaysYmd(today, -29), toDate: "" };
    if (range === "custom") {
      return { fromDate: isYmd(customFrom) ? customFrom.trim() : "", toDate: isYmd(customTo) ? customTo.trim() : "" };
    }
    return { fromDate: "", toDate: "" };
  }, [range, customFrom, customTo]);
  const customRangeInvalid =
    range === "custom" &&
    ((!!customFrom.trim() && !isYmd(customFrom)) || (!!customTo.trim() && !isYmd(customTo)) || (!!fromDate && !!toDate && fromDate > toDate));
  // The server reads a bare YYYY-MM-DD in its own time zone, so the bounds are
  // sent as exact instants of the store-local day start / end.
  const fromParam = fromDate ? encodeURIComponent(storeDayStart(fromDate).toISOString()) : "";
  const toParam = toDate ? encodeURIComponent(storeDayEnd(toDate).toISOString()) : "";

  const { data: statement, isLoading: statementLoading, isError: statementError, refetch: refetchStatement } = useQuery<Statement>({
    queryKey: [`/api/wholesale/traders/${detailId}/statement?tenantId=${tenantId || ""}&from=${fromParam}&to=${toParam}`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!tenantId && detailId != null && !customRangeInvalid,
  });

  const detail: Trader | null =
    traders.find((t) => t.id === detailId) || (statement?.trader?.id === detailId ? statement.trader : null);

  // ── actions ───────────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditTrader(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (t: Trader) => {
    setEditTrader(t);
    setForm({
      name: t.name || "", shopName: t.shopName || "", phone: t.phone || "", email: t.email || "",
      address: t.address || "", taxNumber: t.taxNumber || "",
      creditLimit: t.creditLimit != null ? (zeroDec ? String(Math.round(t.creditLimit)) : String(t.creditLimit)) : "", notes: t.notes || "", openingBalance: "",
    });
    setShowForm(true);
  };

  const saveTrader = async () => {
    if (!form.name.trim()) return notify(L("خطأ", "Fehler", "Error"), L("اسم التاجر مطلوب", "Name ist erforderlich", "Name is required"));
    const limit = cleanMoneyInput(form.creditLimit, zeroDec);
    const opening = cleanMoneyInput(form.openingBalance, zeroDec);
    if ((limit && !isMoney(limit)) || (opening && !isMoney(opening))) {
      return notify(L("خطأ", "Fehler", "Error"), L("أدخل مبلغاً صحيحاً", "Bitte einen gültigen Betrag eingeben", "Enter a valid amount"));
    }
    const phoneRaw = form.phone.trim();
    // Legacy numbers are only re-checked when they are actually changed.
    const phoneChanged = !editTrader || phoneRaw !== String(editTrader.phone || "").trim();
    if (phoneRaw && phoneChanged && !isValidStorePhone(phoneRaw)) {
      return notify(L("خطأ", "Fehler", "Error"), L(
        `أدخل رقم هاتف صحيحاً (مثل ${storePhonePlaceholder()})`,
        `Bitte eine gültige Telefonnummer eingeben (z. B. ${storePhonePlaceholder()})`,
        `Enter a valid phone number (e.g. ${storePhonePlaceholder()})`,
      ));
    }
    const phone = phoneRaw && phoneChanged ? normalizeStorePhone(phoneRaw) : phoneRaw;
    const email = form.email.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return notify(L("خطأ", "Fehler", "Error"), L("أدخل بريداً إلكترونياً صحيحاً", "Bitte eine gültige E-Mail-Adresse eingeben", "Enter a valid email address"));
    }
    const body: any = {
      tenantId, employeeId: employee?.id,
      name: form.name.trim(), shopName: form.shopName, phone, email,
      address: form.address, taxNumber: form.taxNumber, notes: form.notes,
      creditLimit: limit === "" ? null : limit,
    };
    if (!editTrader && opening) body.openingBalance = opening;
    setSaving(true);
    try {
      if (editTrader) await apiRequest("PUT", `/api/wholesale/traders/${editTrader.id}`, body);
      else await apiRequest("POST", "/api/wholesale/traders", body);
      setShowForm(false);
      setEditTrader(null);
      invalidate();
    } catch (e) {
      notify(L("خطأ", "Fehler", "Error"), errorText(e));
    } finally {
      setSaving(false);
    }
  };

  const [activeBusy, setActiveBusy] = useState(false);
  const setActive = (t: Trader, active: boolean) => {
    if (activeBusy) return;
    const run = async () => {
      setActiveBusy(true);
      try {
        if (active) await apiRequest("PUT", `/api/wholesale/traders/${t.id}`, { tenantId, isActive: true });
        else await apiRequest("DELETE", `/api/wholesale/traders/${t.id}?tenantId=${tenantId || ""}`);
        invalidate();
        if (!active && !showInactive) setDetailId(null);
      } catch (e) {
        notify(L("خطأ", "Fehler", "Error"), errorText(e));
      } finally {
        setActiveBusy(false);
      }
    };
    if (active) return void run();
    confirm(
      L("إيقاف التاجر؟", "Händler deaktivieren?", "Deactivate trader?"),
      L(
        "لن يظهر في القائمة ولن يُسمح بالبيع الآجل له. يبقى رصيده وسجله محفوظين.",
        "Er erscheint nicht mehr in der Liste und kann nicht mehr auf Rechnung kaufen. Saldo und Verlauf bleiben erhalten.",
        "They leave the list and can no longer buy on credit. Their balance and history are kept.",
      ),
      run,
    );
  };

  const openLedger = (mode: LedgerMode) => {
    setLedgerMode(mode);
    setLedgerAmount(mode === "payment" && detail && detail.balance > 0 ? (zeroDec ? String(Math.round(detail.balance)) : String(detail.balance)) : "");
    setLedgerMethod("cash");
    setLedgerNote("");
  };

  const submitLedger = async () => {
    if (!detail || !ledgerMode) return;
    const amount = cleanMoneyInput(ledgerAmount, zeroDec);
    if (!isMoney(amount) || !(Number(amount) > 0)) {
      return notify(L("خطأ", "Fehler", "Error"), L("أدخل مبلغاً صحيحاً أكبر من صفر", "Bitte einen gültigen Betrag über null eingeben", "Enter a valid amount greater than zero"));
    }
    setLedgerBusy(true);
    try {
      const path = ledgerMode === "payment" ? "payments" : "charges";
      await apiRequest("POST", `/api/wholesale/traders/${detail.id}/${path}`, {
        tenantId, employeeId: employee?.id, amount, method: ledgerMethod, note: ledgerNote.trim() || null,
      });
      setLedgerMode(null);
      invalidate();
    } catch (e) {
      notify(L("خطأ", "Fehler", "Error"), errorText(e));
    } finally {
      setLedgerBusy(false);
    }
  };

  const [voidingId, setVoidingId] = useState<number | null>(null);
  const voidEntry = (e: StatementEntry) => {
    if (!canManage || !e.entryId || e.type === "return" || e.type === "sale" || voidingId != null) return;
    confirm(
      L("إلغاء هذه الحركة؟", "Buchung stornieren?", "Void this entry?"),
      L("سيُعاد حساب رصيد التاجر.", "Der Saldo des Händlers wird angepasst.", "The trader's balance will be adjusted."),
      async () => {
        setVoidingId(e.entryId);
        try {
          await apiRequest("DELETE", `/api/wholesale/entries/${e.entryId}?tenantId=${tenantId || ""}`);
          invalidate();
        } catch (err) {
          notify(L("خطأ", "Fehler", "Error"), errorText(err));
        } finally {
          setVoidingId(null);
        }
      },
    );
  };

  const sellToTrader = (t: Trader) => {
    cart.setCustomerId(t.id);
    setDetailId(null);
    // The POS tab; "/" is the launch/redirect screen, not the till.
    router.navigate("/(tabs)" as any);
  };

  const typeLabel = (t: StatementEntry["type"]) =>
    t === "sale" ? L("بيع آجل", "Verkauf auf Rechnung", "Credit sale")
      : t === "payment" ? L("دفعة", "Zahlung", "Payment")
        : t === "charge" ? L("قيد مدين", "Belastung", "Charge")
          : L("مرتجع", "Retoure", "Return");

  const methodLabel = (m: string | null) => {
    switch (m) {
      case "cash": return L("نقداً", "Bar", "Cash");
      case "card": return L("بطاقة", "Karte", "Card");
      case "transfer": return L("تحويل", "Überweisung", "Transfer");
      case "shamcash": return L("شام كاش", "Sham Cash", "Sham Cash");
      case "cheque": return L("شيك", "Scheck", "Cheque");
      case "opening": return L("رصيد افتتاحي", "Anfangssaldo", "Opening balance");
      case "other": return L("أخرى", "Andere", "Other");
      default: return m || "";
    }
  };

  const fmtDate = (iso: string) =>
    formatInStoreTz(iso, dateLocale, { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });

  const printStatement = () => {
    if (!statement || !detail) return;
    const storeName = (tenant as any)?.name || "";
    const rows = statement.entries.map((e) => `
      <tr>
        <td>${escapeHtml(fmtDate(e.date))}</td>
        <td>${escapeHtml(typeLabel(e.type))}${e.reference ? ` ${escapeHtml(e.reference)}` : ""}${e.method && e.type !== "sale" ? ` · ${escapeHtml(methodLabel(e.method))}` : ""}${e.note ? `<br><small>${escapeHtml(e.note)}</small>` : ""}</td>
        <td class="n">${e.debit ? escapeHtml(formatMoney(e.debit)) : ""}</td>
        <td class="n">${e.credit ? escapeHtml(formatMoney(e.credit)) : ""}</td>
        <td class="n">${escapeHtml(formatMoney(e.balance))}</td>
      </tr>`).join("");
    const html = `<!doctype html><html dir="${isRTL ? "rtl" : "ltr"}"><head><meta charset="utf-8">
      <title>${escapeHtml(L("كشف حساب", "Kontoauszug", "Statement"))}</title>
      <style>
        body{font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#000;margin:16px}
        h1{font-size:16px;margin:0 0 4px} .muted{color:#555}
        table{width:100%;border-collapse:collapse;margin-top:12px}
        th,td{border-bottom:1px solid #ccc;padding:5px 4px;text-align:${isRTL ? "right" : "left"};vertical-align:top}
        .n{text-align:${isRTL ? "left" : "right"};white-space:nowrap}
        tfoot td{font-weight:bold;border-top:2px solid #000}
      </style></head><body>
      <h1>${escapeHtml(storeName)}</h1>
      <div>${escapeHtml(L("كشف حساب تاجر جملة", "Kontoauszug Großhändler", "Wholesale trader statement"))}</div>
      <div><b>${escapeHtml(detail.shopName || detail.name)}</b>${detail.shopName ? ` — ${escapeHtml(detail.name)}` : ""}${detail.phone ? ` · ${escapeHtml(detail.phone)}` : ""}</div>
      <div class="muted">${escapeHtml(fromDate || L("من البداية", "Seit Beginn", "From the start"))} → ${escapeHtml(toDate || storeYmd())}</div>
      <table>
        <thead><tr>
          <th>${escapeHtml(L("التاريخ", "Datum", "Date"))}</th>
          <th>${escapeHtml(L("البيان", "Beschreibung", "Description"))}</th>
          <th class="n">${escapeHtml(L("مدين", "Soll", "Debit"))}</th>
          <th class="n">${escapeHtml(L("دائن", "Haben", "Credit"))}</th>
          <th class="n">${escapeHtml(L("الرصيد", "Saldo", "Balance"))}</th>
        </tr></thead>
        <tbody>
          <tr><td></td><td>${escapeHtml(L("رصيد أول المدة", "Anfangssaldo", "Opening balance"))}</td><td></td><td></td><td class="n">${escapeHtml(formatMoney(statement.openingBalance))}</td></tr>
          ${rows}
        </tbody>
        <tfoot><tr>
          <td></td><td>${escapeHtml(L("الرصيد الختامي", "Schlusssaldo", "Closing balance"))}</td>
          <td class="n">${escapeHtml(formatMoney(statement.totalDebit))}</td>
          <td class="n">${escapeHtml(formatMoney(statement.totalCredit))}</td>
          <td class="n">${escapeHtml(formatMoney(statement.closingBalance))}</td>
        </tr></tfoot>
      </table></body></html>`;
    printHtmlViaIframe(html);
  };

  // ── render helpers ────────────────────────────────────────────────────────
  const SummaryCard = ({ icon, label, value, color }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; color: string }) => (
    <View style={[styles.summaryCard, { borderColor: color + "55" }]}>
      <View style={[row, { alignItems: "center", gap: 6 }]}>
        <Ionicons name={icon} size={16} color={color} />
        <Text style={[styles.summaryLabel, ta]} numberOfLines={1}>{label}</Text>
      </View>
      <Text style={[styles.summaryValue, { color }, ta]} numberOfLines={1}>{value}</Text>
    </View>
  );

  const LimitBar = ({ t }: { t: Trader }) => {
    if (t.creditLimit == null || t.creditLimit <= 0) return null;
    const pct = Math.max(0, Math.min(1, t.balance / t.creditLimit));
    const color = pct >= 1 ? Colors.danger : pct >= 0.8 ? Colors.warning : Colors.success;
    return (
      <View style={styles.limitTrack}>
        <View style={[styles.limitFill, { width: `${pct * 100}%`, backgroundColor: color }, flipRow && { alignSelf: "flex-end" }]} />
      </View>
    );
  };

  const inputRow = (label: string, key: keyof typeof EMPTY_FORM, opts: { numeric?: boolean; placeholder?: string; multiline?: boolean; keyboard?: "phone-pad" | "email-address" } = {}) => (
    <View style={{ gap: 4 }}>
      <Text style={[styles.fieldLabel, ta]} numberOfLines={2}>{label}</Text>
      <TextInput
        style={[styles.input, ta, opts.multiline && { minHeight: 70, textAlignVertical: "top" }]}
        value={form[key]}
        onChangeText={(v) => setForm((f) => ({ ...f, [key]: opts.numeric ? cleanMoneyInput(v, zeroDec) : v }))}
        keyboardType={opts.numeric ? (zeroDec ? "number-pad" : "decimal-pad") : opts.keyboard || "default"}
        autoCapitalize={opts.keyboard === "email-address" ? "none" : undefined}
        placeholder={opts.placeholder}
        placeholderTextColor={Colors.textMuted}
        multiline={opts.multiline}
      />
    </View>
  );

  // ── screen ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, row]}>
        <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.navigate("/(tabs)/customers" as any))} style={styles.backBtn} accessibilityRole="button" accessibilityLabel={L("رجوع", "Zurück", "Back")}>
          <Ionicons name={isRTL ? "chevron-forward" : "chevron-back"} size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, ta]}>{L("تجار الجملة", "Großhändler", "Wholesale traders")}</Text>
        {canManage && (
          <TouchableOpacity onPress={openCreate} style={styles.addBtn} accessibilityLabel={L("إضافة تاجر", "Händler hinzufügen", "Add trader")}>
            <Ionicons name="add" size={22} color={Colors.textDark} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        {/* Receivables summary */}
        <View style={[styles.summaryGrid, row]}>
          <SummaryCard icon="cash-outline" label={L("إجمالي الذمم", "Offene Forderungen", "Total receivables")} value={formatMoney(summary?.totalReceivables ?? 0)} color={Colors.danger} />
          <SummaryCard icon="people-outline" label={L("تجار مدينون", "Schuldner", "Debtors")} value={`${summary?.debtors ?? 0} / ${summary?.activeTraders ?? 0}`} color={Colors.warning} />
          <SummaryCard icon="arrow-down-circle-outline" label={L("المحصّل هذا الشهر", "Eingezogen (Monat)", "Collected this month")} value={formatMoney(summary?.collectedThisMonth ?? 0)} color={Colors.success} />
          <SummaryCard icon="document-text-outline" label={L("مبيعات آجلة هذا الشهر", "Auf Rechnung (Monat)", "Credit sales this month")} value={formatMoney(summary?.creditSalesThisMonth ?? 0)} color={Colors.info} />
        </View>
        {!!summary?.overLimit && (
          <View style={[styles.warnBox, row]}>
            <Ionicons name="warning-outline" size={16} color={Colors.danger} />
            <Text style={[styles.warnText, ta]}>
              {L(`${summary.overLimit} تاجر تجاوز سقف الدين`, `${summary.overLimit} Händler über dem Kreditlimit`, `${summary.overLimit} trader(s) over their credit limit`)}
            </Text>
          </View>
        )}

        {/* Search */}
        <View style={[styles.searchBox, row]}>
          <Ionicons name="search" size={18} color={Colors.textMuted} />
          <TextInput
            style={[styles.searchInput, ta]}
            value={search}
            onChangeText={setSearch}
            placeholder={L("بحث بالاسم أو المحل أو الهاتف", "Name, Geschäft oder Telefon suchen", "Search name, shop or phone")}
            placeholderTextColor={Colors.textMuted}
          />
        </View>
        <View style={[row, { alignItems: "center", justifyContent: "space-between" }]}>
          <Text style={styles.muted}>
            {L(`${filtered.length} تاجر`, `${filtered.length} Händler`, `${filtered.length} trader(s)`)}
          </Text>
          <View style={[row, { alignItems: "center", gap: 6 }]}>
            <Text style={styles.muted}>{L("إظهار الموقوفين", "Inaktive zeigen", "Show inactive")}</Text>
            <Switch value={showInactive} onValueChange={setShowInactive} trackColor={{ true: Colors.accent, false: Colors.border }} thumbColor="#fff" />
          </View>
        </View>

        {/* Traders list */}
        {isLoading ? (
          <ActivityIndicator color={Colors.accent} style={{ marginTop: 30 }} />
        ) : tradersError && traders.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="cloud-offline-outline" size={40} color={Colors.textMuted} />
            <Text style={styles.emptyText}>{L("تعذّر تحميل التجار", "Händler konnten nicht geladen werden", "Could not load traders")}</Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => { refetchTraders(); refetchSummary(); }}>
              <Text style={styles.primaryBtnText}>{L("إعادة المحاولة", "Erneut versuchen", "Retry")}</Text>
            </TouchableOpacity>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="storefront-outline" size={40} color={Colors.textMuted} />
            <Text style={styles.emptyText}>
              {traders.length === 0
                ? L("لا يوجد تجار جملة بعد", "Noch keine Großhändler", "No wholesale traders yet")
                : L("لا نتائج", "Keine Treffer", "No matches")}
            </Text>
            {traders.length === 0 && canManage && (
              <TouchableOpacity style={styles.primaryBtn} onPress={openCreate}>
                <Text style={styles.primaryBtnText}>{L("+ إضافة تاجر", "+ Händler hinzufügen", "+ Add trader")}</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filtered.map((t) => (
            <TouchableOpacity key={t.id} style={[styles.traderCard, !t.isActive && { opacity: 0.55 }]} onPress={() => { setRange("month"); setDetailId(t.id); }}>
              <View style={[row, { alignItems: "center", gap: 10 }]}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{(t.shopName || t.name || "?").charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.traderName, ta]} numberOfLines={1}>{t.shopName || t.name}</Text>
                  <Text style={[styles.traderMeta, ta]} numberOfLines={1}>
                    {[t.shopName ? t.name : null, t.phone].filter(Boolean).join(" · ") || " "}
                  </Text>
                </View>
                <View style={{ alignItems: endAlign, flexShrink: 0, maxWidth: "50%" }}>
                  <Text style={[styles.balance, { color: t.balance > 0 ? Colors.danger : Colors.success }]} numberOfLines={1}>{formatMoney(t.balance)}</Text>
                  <Text style={styles.traderMeta}>
                    {t.creditLimit != null
                      ? `${L("السقف", "Limit", "Limit")} ${formatMoney(t.creditLimit)}`
                      : L("بلا سقف", "Ohne Limit", "No limit")}
                  </Text>
                </View>
              </View>
              <LimitBar t={t} />
              {(t.overLimit || !t.isActive) && (
                <View style={[row, { gap: 6, marginTop: 6 }]}>
                  {t.overLimit && <Text style={[styles.tag, { color: Colors.danger, borderColor: Colors.danger }]}>{L("تجاوز السقف", "Über Limit", "Over limit")}</Text>}
                  {!t.isActive && <Text style={[styles.tag, { color: Colors.textMuted, borderColor: Colors.textMuted }]}>{L("موقوف", "Inaktiv", "Inactive")}</Text>}
                </View>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* ── Trader detail + statement ─────────────────────────────────────── */}
      <Modal visible={detailId != null} animationType="slide" transparent onRequestClose={() => setDetailId(null)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { height: "92%" }]}>
            <View style={[styles.modalHeader, row]}>
              <Text style={[styles.modalTitle, ta, { flex: 1 }]} numberOfLines={1}>{detail ? detail.shopName || detail.name : ""}</Text>
              <TouchableOpacity onPress={() => setDetailId(null)} style={styles.modalClose} accessibilityRole="button" accessibilityLabel={L("إغلاق", "Schließen", "Close")}>
                <Ionicons name="close" size={22} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
            {detail ? (
              <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}>
                <View style={styles.balanceBox}>
                  <Text style={[styles.muted, ta]}>{L("الرصيد المستحق", "Offener Saldo", "Outstanding balance")}</Text>
                  <Text style={[styles.bigBalance, { color: detail.balance > 0 ? Colors.danger : Colors.success }, ta]}>{formatMoney(detail.balance)}</Text>
                  <Text style={[styles.traderMeta, ta]}>
                    {detail.creditLimit != null
                      ? `${L("سقف الدين", "Kreditlimit", "Credit limit")}: ${formatMoney(detail.creditLimit)} · ${L("المتاح", "Verfügbar", "Available")}: ${formatMoney(detail.availableCredit ?? 0)}`
                      : L("بلا سقف دين", "Ohne Kreditlimit", "No credit limit")}
                  </Text>
                  <LimitBar t={detail} />
                  <Text style={[styles.traderMeta, ta, { marginTop: 6 }]}>
                    {[detail.shopName ? detail.name : null, detail.phone, detail.email, detail.address,
                      detail.taxNumber ? `${L("الرقم الضريبي", "Steuer-Nr.", "Tax no.")} ${detail.taxNumber}` : null]
                      .filter(Boolean).join(" · ")}
                  </Text>
                  {!!detail.notes && <Text style={[styles.traderMeta, ta]}>{detail.notes}</Text>}
                </View>

                <View style={[row, { flexWrap: "wrap", gap: 8 }]}>
                  {detail.balance > 0 && (
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: Colors.success }]} onPress={() => openLedger("payment")}>
                      <Ionicons name="cash-outline" size={16} color="#fff" />
                      <Text style={styles.actionBtnText}>{L("تسجيل دفعة", "Zahlung erfassen", "Record payment")}</Text>
                    </TouchableOpacity>
                  )}
                  {detail.isActive && (
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: Colors.info }]} onPress={() => sellToTrader(detail)}>
                      <Ionicons name="cart-outline" size={16} color="#fff" />
                      <Text style={styles.actionBtnText}>{L("بيع لهذا التاجر", "Verkauf an Händler", "Sell to trader")}</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={[styles.actionBtn, styles.outlineBtn]} onPress={printStatement} disabled={!statement}>
                    <Ionicons name="print-outline" size={16} color={Colors.text} />
                    <Text style={[styles.actionBtnText, { color: Colors.text }]}>{L("طباعة الكشف", "Auszug drucken", "Print statement")}</Text>
                  </TouchableOpacity>
                  {canManage && (
                    <>
                      <TouchableOpacity style={[styles.actionBtn, styles.outlineBtn]} onPress={() => openLedger("charge")}>
                        <Ionicons name="add-circle-outline" size={16} color={Colors.text} />
                        <Text style={[styles.actionBtnText, { color: Colors.text }]}>{L("قيد مدين", "Belastung", "Add charge")}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.actionBtn, styles.outlineBtn]} onPress={() => openEdit(detail)}>
                        <Ionicons name="pencil" size={16} color={Colors.text} />
                        <Text style={[styles.actionBtnText, { color: Colors.text }]}>{L("تعديل", "Bearbeiten", "Edit")}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.actionBtn, styles.outlineBtn, activeBusy && { opacity: 0.6 }]} disabled={activeBusy} onPress={() => setActive(detail, !detail.isActive)}>
                        <Ionicons name={detail.isActive ? "pause-circle-outline" : "play-circle-outline"} size={16} color={detail.isActive ? Colors.danger : Colors.success} />
                        <Text style={[styles.actionBtnText, { color: detail.isActive ? Colors.danger : Colors.success }]}>
                          {detail.isActive ? L("إيقاف", "Deaktivieren", "Deactivate") : L("تفعيل", "Aktivieren", "Reactivate")}
                        </Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>

                {/* Statement */}
                <Text style={[styles.sectionTitle, ta]}>{L("كشف الحساب", "Kontoauszug", "Statement")}</Text>
                <View style={[row, { gap: 6, flexWrap: "wrap" }]}>
                  {([
                    ["month", L("هذا الشهر", "Dieser Monat", "This month")],
                    ["30d", L("آخر 30 يوماً", "Letzte 30 Tage", "Last 30 days")],
                    ["all", L("الكل", "Alles", "All")],
                    ["custom", L("مخصص", "Zeitraum", "Custom")],
                  ] as [RangeKey, string][]).map(([k, label]) => (
                    <TouchableOpacity key={k} style={[styles.chip, range === k && styles.chipActive]} onPress={() => setRange(k)}>
                      <Text style={[styles.chipText, range === k && styles.chipTextActive]}>{label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {range === "custom" && (
                  <View style={[row, { gap: 8 }]}>
                    <TextInput style={[styles.input, { flex: 1, minWidth: 0 }]} value={customFrom} onChangeText={(v) => setCustomFrom(asciiDigits(v).replace(/[^0-9-]/g, "").slice(0, 10))} placeholder={`${L("من", "Von", "From")} YYYY-MM-DD`} placeholderTextColor={Colors.textMuted} keyboardType="numbers-and-punctuation" maxLength={10} />
                    <TextInput style={[styles.input, { flex: 1, minWidth: 0 }]} value={customTo} onChangeText={(v) => setCustomTo(asciiDigits(v).replace(/[^0-9-]/g, "").slice(0, 10))} placeholder={`${L("إلى", "Bis", "To")} YYYY-MM-DD`} placeholderTextColor={Colors.textMuted} keyboardType="numbers-and-punctuation" maxLength={10} />
                  </View>
                )}

                {customRangeInvalid ? (
                  <Text style={[styles.warnText, ta]}>{L("أدخل التاريخين بالشكل YYYY-MM-DD، وتاريخ البداية قبل النهاية.", "Beide Daten als JJJJ-MM-TT eingeben, Beginn vor Ende.", "Enter both dates as YYYY-MM-DD, with the start before the end.")}</Text>
                ) : statementError && !statement ? (
                  <View style={{ alignItems: "center", gap: 10, paddingVertical: 16 }}>
                    <Text style={styles.muted}>{L("تعذّر تحميل كشف الحساب", "Kontoauszug konnte nicht geladen werden", "Could not load the statement")}</Text>
                    <TouchableOpacity style={[styles.actionBtn, styles.outlineBtn]} onPress={() => refetchStatement()}>
                      <Ionicons name="refresh" size={16} color={Colors.text} />
                      <Text style={[styles.actionBtnText, { color: Colors.text }]}>{L("إعادة المحاولة", "Erneut versuchen", "Retry")}</Text>
                    </TouchableOpacity>
                  </View>
                ) : statementLoading || !statement ? (
                  <ActivityIndicator color={Colors.accent} style={{ marginTop: 20 }} />
                ) : (
                  <View style={styles.statementBox}>
                    <View style={[styles.stRow, row]}>
                      <Text style={[styles.stLabel, ta, { flex: 1 }]}>{L("رصيد أول المدة", "Anfangssaldo", "Opening balance")}</Text>
                      <Text style={styles.stAmount}>{formatMoney(statement.openingBalance)}</Text>
                    </View>
                    {statement.entries.length === 0 && (
                      <Text style={[styles.muted, { textAlign: "center", paddingVertical: 14 }]}>{L("لا حركات في هذه الفترة", "Keine Buchungen im Zeitraum", "No entries in this period")}</Text>
                    )}
                    {statement.entries.map((e) => {
                      const voidable = canManage && !!e.entryId && (e.type === "payment" || e.type === "charge");
                      return (
                        <TouchableOpacity key={e.id} activeOpacity={voidable ? 0.6 : 1} onLongPress={() => voidEntry(e)} style={[styles.stRow, row]}>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={[styles.stLabel, ta]}>
                              {typeLabel(e.type)}{e.reference ? ` · ${e.reference}` : ""}{e.method && e.type !== "sale" && e.type !== "return" ? ` · ${methodLabel(e.method)}` : ""}
                            </Text>
                            <Text style={[styles.traderMeta, ta]}>{fmtDate(e.date)}{e.note ? ` · ${e.note}` : ""}</Text>
                          </View>
                          <View style={{ alignItems: endAlign, minWidth: 96, flexShrink: 0 }}>
                            <Text style={[styles.stAmount, { color: e.debit ? Colors.danger : Colors.success }]} numberOfLines={1}>
                              {e.debit ? `+ ${formatMoney(e.debit)}` : `− ${formatMoney(e.credit)}`}
                            </Text>
                            <Text style={styles.traderMeta} numberOfLines={1}>{formatMoney(e.balance)}</Text>
                          </View>
                          {voidable && (
                            <TouchableOpacity
                              onPress={() => voidEntry(e)}
                              disabled={voidingId != null}
                              style={styles.voidBtn}
                              accessibilityRole="button"
                              accessibilityLabel={L("إلغاء الحركة", "Buchung stornieren", "Void entry")}
                            >
                              {voidingId === e.entryId
                                ? <ActivityIndicator size="small" color={Colors.danger} />
                                : <Ionicons name="close-circle-outline" size={20} color={Colors.danger} />}
                            </TouchableOpacity>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                    <View style={[styles.stRow, row, { borderBottomWidth: 0 }]}>
                      <Text style={[styles.stLabel, ta, { flex: 1, fontWeight: "800" }]}>{L("الرصيد الختامي", "Schlusssaldo", "Closing balance")}</Text>
                      <Text style={[styles.stAmount, { fontWeight: "800" }]}>{formatMoney(statement.closingBalance)}</Text>
                    </View>
                    {canManage && statement.entries.some((e) => e.type === "payment" || e.type === "charge") && (
                      <Text style={[styles.hint, ta]}>{L("اضغط ✕ بجانب دفعة أو قيد لإلغائه.", "✕ neben einer Zahlung/Belastung tippen, um sie zu stornieren.", "Tap ✕ next to a payment or charge to void it.")}</Text>
                    )}
                  </View>
                )}
              </ScrollView>
            ) : statementError ? (
              <View style={{ alignItems: "center", gap: 10, padding: 24 }}>
                <Text style={styles.muted}>{L("تعذّر تحميل بيانات التاجر", "Händlerdaten konnten nicht geladen werden", "Could not load this trader")}</Text>
                <TouchableOpacity style={[styles.actionBtn, styles.outlineBtn]} onPress={() => refetchStatement()}>
                  <Ionicons name="refresh" size={16} color={Colors.text} />
                  <Text style={[styles.actionBtnText, { color: Colors.text }]}>{L("إعادة المحاولة", "Erneut versuchen", "Retry")}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ActivityIndicator color={Colors.accent} style={{ marginTop: 40 }} />
            )}
          </View>
        </View>
      </Modal>

      {/* ── Record payment / add charge ───────────────────────────────────── */}
      <Modal visible={ledgerMode != null} animationType="fade" transparent onRequestClose={() => setLedgerMode(null)}>
        <View style={[styles.modalBackdrop, { justifyContent: "center", padding: 16 }]}>
          <View style={[styles.modalSheet, { borderRadius: 20 }]}>
            <View style={[styles.modalHeader, row]}>
              <Text style={[styles.modalTitle, ta, { flex: 1 }]}>
                {ledgerMode === "payment" ? L("تسجيل دفعة من التاجر", "Zahlung des Händlers erfassen", "Record a payment") : L("إضافة قيد مدين", "Belastung hinzufügen", "Add a charge")}
              </Text>
              <TouchableOpacity onPress={() => setLedgerMode(null)} style={styles.modalClose} accessibilityRole="button" accessibilityLabel={L("إغلاق", "Schließen", "Close")}>
                <Ionicons name="close" size={22} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }} keyboardShouldPersistTaps="handled">
              {detail && (
                <Text style={[styles.muted, ta]}>
                  {(detail.shopName || detail.name) + " · "}{L("الرصيد", "Saldo", "Balance")}: {formatMoney(detail.balance)}
                </Text>
              )}
              <Text style={[styles.fieldLabel, ta]}>{L("المبلغ", "Betrag", "Amount")} ({currencyLabel()})</Text>
              <TextInput style={[styles.input, ta, { fontSize: 20, fontWeight: "700" }]} value={ledgerAmount} onChangeText={(v) => setLedgerAmount(cleanMoneyInput(v, zeroDec))} keyboardType={zeroDec ? "number-pad" : "decimal-pad"} placeholder="0" placeholderTextColor={Colors.textMuted} autoFocus />
              {ledgerMode === "payment" && (
                <>
                  <Text style={[styles.fieldLabel, ta]}>{L("طريقة الدفع", "Zahlungsart", "Method")}</Text>
                  <View style={[row, { flexWrap: "wrap", gap: 6 }]}>
                    {PAY_METHODS.map((m) => (
                      <TouchableOpacity key={m} style={[styles.chip, ledgerMethod === m && styles.chipActive]} onPress={() => setLedgerMethod(m)}>
                        <Text style={[styles.chipText, ledgerMethod === m && styles.chipTextActive]}>{methodLabel(m)}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}
              <Text style={[styles.fieldLabel, ta]}>{L("ملاحظة (اختياري)", "Notiz (optional)", "Note (optional)")}</Text>
              <TextInput style={[styles.input, ta]} value={ledgerNote} onChangeText={setLedgerNote} placeholder={ledgerMode === "charge" ? L("مثلاً: دين سابق", "z. B. Altschuld", "e.g. previous debt") : ""} placeholderTextColor={Colors.textMuted} />
              <TouchableOpacity style={[styles.primaryBtn, { marginTop: 6 }, ledgerBusy && { opacity: 0.6 }]} onPress={submitLedger} disabled={ledgerBusy}>
                {ledgerBusy ? <ActivityIndicator color={Colors.textDark} /> : (
                  <Text style={styles.primaryBtnText}>{ledgerMode === "payment" ? L("تسجيل الدفعة", "Zahlung buchen", "Record payment") : L("إضافة القيد", "Belastung buchen", "Add charge")}</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Add / edit trader ─────────────────────────────────────────────── */}
      <Modal visible={showForm} animationType="slide" transparent onRequestClose={() => setShowForm(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={[styles.modalHeader, row]}>
              <Text style={[styles.modalTitle, ta, { flex: 1 }]}>
                {editTrader ? L("تعديل التاجر", "Händler bearbeiten", "Edit trader") : L("تاجر جملة جديد", "Neuer Großhändler", "New wholesale trader")}
              </Text>
              <TouchableOpacity onPress={() => setShowForm(false)} style={styles.modalClose} accessibilityRole="button" accessibilityLabel={L("إغلاق", "Schließen", "Close")}>
                <Ionicons name="close" size={22} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
              {inputRow(L("اسم التاجر *", "Name *", "Name *"), "name")}
              {inputRow(L("اسم المحل", "Geschäftsname", "Shop name"), "shopName")}
              <View style={[row, { gap: 10 }]}>
                <View style={{ flex: 1, minWidth: 0 }}>{inputRow(L("الهاتف", "Telefon", "Phone"), "phone", { keyboard: "phone-pad", placeholder: storePhonePlaceholder() })}</View>
                <View style={{ flex: 1, minWidth: 0 }}>{inputRow(L("الرقم الضريبي / السجل", "Steuer-/Handelsreg.-Nr.", "Tax / register no."), "taxNumber")}</View>
              </View>
              {inputRow(L("البريد الإلكتروني", "E-Mail", "Email"), "email", { keyboard: "email-address" })}
              {inputRow(L("العنوان", "Adresse", "Address"), "address")}
              {inputRow(`${L("سقف الدين", "Kreditlimit", "Credit limit")} (${currencyLabel()})`, "creditLimit", {
                numeric: true,
                placeholder: L("فارغ = بلا سقف، 0 = نقداً فقط", "leer = ohne Limit, 0 = nur bar", "empty = no limit, 0 = cash only"),
              })}
              {!editTrader && inputRow(`${L("رصيد افتتاحي (دين سابق)", "Anfangssaldo (Altschuld)", "Opening balance (existing debt)")} (${currencyLabel()})`, "openingBalance", { numeric: true, placeholder: "0" })}
              {inputRow(L("ملاحظات", "Notizen", "Notes"), "notes", { multiline: true })}
              <TouchableOpacity style={[styles.primaryBtn, { marginTop: 6 }, saving && { opacity: 0.6 }]} onPress={saveTrader} disabled={saving}>
                {saving ? <ActivityIndicator color={Colors.textDark} /> : (
                  <Text style={styles.primaryBtnText}>{editTrader ? L("حفظ التغييرات", "Speichern", "Save changes") : L("إضافة التاجر", "Händler anlegen", "Add trader")}</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = themedStyles((Colors) => ({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: 8 },
  backBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 22 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: "700", color: Colors.text },
  addBtn: { backgroundColor: Colors.accent, borderRadius: 12, width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  summaryGrid: { flexWrap: "wrap", gap: 10 },
  summaryCard: { flexGrow: 1, flexBasis: 150, backgroundColor: Colors.card, borderRadius: 14, padding: 12, borderWidth: 1, gap: 6 },
  summaryLabel: { color: Colors.textSecondary, fontSize: 12, fontWeight: "600", flexShrink: 1 },
  summaryValue: { fontSize: 18, fontWeight: "800" },
  warnBox: { alignItems: "center", gap: 8, backgroundColor: Colors.danger + "15", borderRadius: 10, padding: 10, borderWidth: 1, borderColor: Colors.danger + "44" },
  warnText: { color: Colors.danger, fontSize: 13, fontWeight: "600", flex: 1 },
  searchBox: { alignItems: "center", gap: 8, backgroundColor: Colors.card, borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: Colors.border },
  searchInput: { flex: 1, color: Colors.text, fontSize: 14, paddingVertical: 11 },
  muted: { color: Colors.textMuted, fontSize: 12 },
  emptyState: { alignItems: "center", paddingVertical: 50, gap: 12 },
  emptyText: { color: Colors.textMuted, fontSize: 15 },
  traderCard: { backgroundColor: Colors.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.cardBorder },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.accent + "25", alignItems: "center", justifyContent: "center" },
  avatarText: { color: Colors.accent, fontWeight: "800", fontSize: 16 },
  traderName: { color: Colors.text, fontSize: 15, fontWeight: "700" },
  traderMeta: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  balance: { fontSize: 16, fontWeight: "800" },
  limitTrack: { height: 5, borderRadius: 3, backgroundColor: Colors.border, marginTop: 10, overflow: "hidden" },
  limitFill: { height: 5, borderRadius: 3 },
  tag: { fontSize: 11, fontWeight: "700", borderWidth: 1, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: Colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "92%", width: "100%", maxWidth: 760, alignSelf: "center" },
  modalHeader: { alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: 8 },
  modalTitle: { fontSize: 17, fontWeight: "700", color: Colors.text },
  modalClose: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 22 },
  balanceBox: { backgroundColor: Colors.surfaceLight, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.cardBorder },
  bigBalance: { fontSize: 28, fontWeight: "900", marginVertical: 4 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, minHeight: 44 },
  voidBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 18 },
  actionBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  outlineBtn: { backgroundColor: Colors.surfaceLight, borderWidth: 1, borderColor: Colors.cardBorder },
  sectionTitle: { color: Colors.text, fontSize: 15, fontWeight: "800", marginTop: 6 },
  chip: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8, minHeight: 38, justifyContent: "center", backgroundColor: Colors.surfaceLight, borderWidth: 1, borderColor: Colors.cardBorder },
  chipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  chipText: { color: Colors.textSecondary, fontSize: 12, fontWeight: "600" },
  chipTextActive: { color: Colors.textDark },
  statementBox: { backgroundColor: Colors.surfaceLight, borderRadius: 14, paddingHorizontal: 12, borderWidth: 1, borderColor: Colors.cardBorder },
  stRow: { alignItems: "center", gap: 8, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  stLabel: { color: Colors.text, fontSize: 13, fontWeight: "600" },
  stAmount: { color: Colors.text, fontSize: 14, fontWeight: "700" },
  hint: { color: Colors.textMuted, fontSize: 11, paddingBottom: 10 },
  fieldLabel: { color: Colors.textSecondary, fontSize: 12, fontWeight: "600" },
  input: { backgroundColor: Colors.inputBg, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, minHeight: 46, color: Colors.text, fontSize: 14, borderWidth: 1, borderColor: Colors.inputBorder },
  primaryBtn: { backgroundColor: Colors.accent, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 20, alignItems: "center" },
  primaryBtnText: { color: Colors.textDark, fontWeight: "800", fontSize: 15 },
}));
