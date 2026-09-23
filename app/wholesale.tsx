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
import { formatMoney, currencyLabel } from "@/lib/currency";
import { printHtmlViaIframe } from "@/utils/printing";

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

function ymd(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

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
  useTheme(); // re-render on theme switch (styles are theme-aware)
  const cart = useCart();
  const qc = useQueryClient();
  const tenantId = (tenant as any)?.id;
  const L = (ar: string, de: string, en: string) => (language === "ar" ? ar : language === "de" ? de : en);
  const ta = isRTL ? ({ textAlign: "right" } as const) : null;
  const row = isRTL ? ({ flexDirection: "row-reverse" } as const) : ({ flexDirection: "row" } as const);

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
  const { data: summary } = useQuery<Summary>({
    queryKey: [`/api/wholesale/summary?tenantId=${tenantId || ""}`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!tenantId,
  });

  const { data: traders = [], isLoading } = useQuery<Trader[]>({
    queryKey: [`/api/wholesale/traders?tenantId=${tenantId || ""}${showInactive ? "&includeInactive=1" : ""}`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!tenantId,
  });

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return traders;
    return traders.filter((t) =>
      [t.name, t.shopName, t.phone, t.taxNumber].some((v) => String(v || "").toLowerCase().includes(s)));
  }, [traders, search]);

  const { fromDate, toDate } = useMemo(() => {
    const now = new Date();
    if (range === "month") return { fromDate: ymd(new Date(now.getFullYear(), now.getMonth(), 1)), toDate: "" };
    if (range === "30d") return { fromDate: ymd(new Date(now.getTime() - 29 * 86400000)), toDate: "" };
    if (range === "custom") {
      const ok = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v.trim());
      return { fromDate: ok(customFrom) ? customFrom.trim() : "", toDate: ok(customTo) ? customTo.trim() : "" };
    }
    return { fromDate: "", toDate: "" };
  }, [range, customFrom, customTo]);

  const { data: statement, isLoading: statementLoading } = useQuery<Statement>({
    queryKey: [`/api/wholesale/traders/${detailId}/statement?tenantId=${tenantId || ""}&from=${fromDate}&to=${toDate}`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!tenantId && detailId != null,
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
      creditLimit: t.creditLimit != null ? String(t.creditLimit) : "", notes: t.notes || "", openingBalance: "",
    });
    setShowForm(true);
  };

  const saveTrader = async () => {
    if (!form.name.trim()) return notify(L("خطأ", "Fehler", "Error"), L("اسم التاجر مطلوب", "Name ist erforderlich", "Name is required"));
    const money = (v: string) => v.trim().replace(",", ".");
    const limit = money(form.creditLimit);
    const opening = money(form.openingBalance);
    if ((limit && !(Number(limit) >= 0)) || (opening && !(Number(opening) >= 0))) {
      return notify(L("خطأ", "Fehler", "Error"), L("أدخل مبلغاً صحيحاً", "Bitte einen gültigen Betrag eingeben", "Enter a valid amount"));
    }
    const body: any = {
      tenantId, employeeId: employee?.id,
      name: form.name.trim(), shopName: form.shopName, phone: form.phone, email: form.email,
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

  const setActive = (t: Trader, active: boolean) => {
    const run = async () => {
      try {
        if (active) await apiRequest("PUT", `/api/wholesale/traders/${t.id}`, { tenantId, isActive: true });
        else await apiRequest("DELETE", `/api/wholesale/traders/${t.id}?tenantId=${tenantId || ""}`);
        invalidate();
        if (!active && !showInactive) setDetailId(null);
      } catch (e) {
        notify(L("خطأ", "Fehler", "Error"), errorText(e));
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
    setLedgerAmount(mode === "payment" && detail && detail.balance > 0 ? String(detail.balance) : "");
    setLedgerMethod("cash");
    setLedgerNote("");
  };

  const submitLedger = async () => {
    if (!detail || !ledgerMode) return;
    const amount = ledgerAmount.trim().replace(",", ".");
    if (!(Number(amount) > 0)) {
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

  const voidEntry = (e: StatementEntry) => {
    if (!canManage || !e.entryId || e.type === "return" || e.type === "sale") return;
    confirm(
      L("إلغاء هذه الحركة؟", "Buchung stornieren?", "Void this entry?"),
      L("سيُعاد حساب رصيد التاجر.", "Der Saldo des Händlers wird angepasst.", "The trader's balance will be adjusted."),
      async () => {
        try {
          await apiRequest("DELETE", `/api/wholesale/entries/${e.entryId}?tenantId=${tenantId || ""}`);
          invalidate();
        } catch (err) {
          notify(L("خطأ", "Fehler", "Error"), errorText(err));
        }
      },
    );
  };

  const sellToTrader = (t: Trader) => {
    cart.setCustomerId(t.id);
    setDetailId(null);
    router.navigate("/");
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

  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? "" : d.toLocaleString(language === "ar" ? "ar" : language === "de" ? "de-CH" : "en-GB", {
      year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
    });
  };

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
      <div class="muted">${escapeHtml(fromDate || L("من البداية", "Seit Beginn", "From the start"))} → ${escapeHtml(toDate || ymd(new Date()))}</div>
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
        <View style={[styles.limitFill, { width: `${pct * 100}%`, backgroundColor: color }, isRTL && { alignSelf: "flex-end" }]} />
      </View>
    );
  };

  const inputRow = (label: string, key: keyof typeof EMPTY_FORM, opts: { numeric?: boolean; placeholder?: string; multiline?: boolean } = {}) => (
    <View style={{ gap: 4 }}>
      <Text style={[styles.fieldLabel, ta]}>{label}</Text>
      <TextInput
        style={[styles.input, ta, opts.multiline && { minHeight: 70, textAlignVertical: "top" }]}
        value={form[key]}
        onChangeText={(v) => setForm((f) => ({ ...f, [key]: v }))}
        keyboardType={opts.numeric ? "decimal-pad" : "default"}
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
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
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
                <View style={{ flex: 1 }}>
                  <Text style={[styles.traderName, ta]} numberOfLines={1}>{t.shopName || t.name}</Text>
                  <Text style={[styles.traderMeta, ta]} numberOfLines={1}>
                    {[t.shopName ? t.name : null, t.phone].filter(Boolean).join(" · ") || " "}
                  </Text>
                </View>
                <View style={{ alignItems: isRTL ? "flex-start" : "flex-end" }}>
                  <Text style={[styles.balance, { color: t.balance > 0 ? Colors.danger : Colors.success }]}>{formatMoney(t.balance)}</Text>
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
              <TouchableOpacity onPress={() => setDetailId(null)} style={styles.modalClose}>
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
                      <TouchableOpacity style={[styles.actionBtn, styles.outlineBtn]} onPress={() => setActive(detail, !detail.isActive)}>
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
                    <TextInput style={[styles.input, { flex: 1 }]} value={customFrom} onChangeText={setCustomFrom} placeholder={`${L("من", "Von", "From")} YYYY-MM-DD`} placeholderTextColor={Colors.textMuted} />
                    <TextInput style={[styles.input, { flex: 1 }]} value={customTo} onChangeText={setCustomTo} placeholder={`${L("إلى", "Bis", "To")} YYYY-MM-DD`} placeholderTextColor={Colors.textMuted} />
                  </View>
                )}

                {statementLoading || !statement ? (
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
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.stLabel, ta]}>
                              {typeLabel(e.type)}{e.reference ? ` · ${e.reference}` : ""}{e.method && e.type !== "sale" && e.type !== "return" ? ` · ${methodLabel(e.method)}` : ""}
                            </Text>
                            <Text style={[styles.traderMeta, ta]}>{fmtDate(e.date)}{e.note ? ` · ${e.note}` : ""}</Text>
                          </View>
                          <View style={{ alignItems: isRTL ? "flex-start" : "flex-end", minWidth: 110 }}>
                            <Text style={[styles.stAmount, { color: e.debit ? Colors.danger : Colors.success }]}>
                              {e.debit ? `+ ${formatMoney(e.debit)}` : `− ${formatMoney(e.credit)}`}
                            </Text>
                            <Text style={styles.traderMeta}>{formatMoney(e.balance)}</Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                    <View style={[styles.stRow, row, { borderBottomWidth: 0 }]}>
                      <Text style={[styles.stLabel, ta, { flex: 1, fontWeight: "800" }]}>{L("الرصيد الختامي", "Schlusssaldo", "Closing balance")}</Text>
                      <Text style={[styles.stAmount, { fontWeight: "800" }]}>{formatMoney(statement.closingBalance)}</Text>
                    </View>
                    {canManage && statement.entries.some((e) => e.type === "payment" || e.type === "charge") && (
                      <Text style={[styles.hint, ta]}>{L("اضغط مطولاً على دفعة أو قيد لإلغائه.", "Lang drücken, um eine Zahlung/Belastung zu stornieren.", "Long-press a payment or charge to void it.")}</Text>
                    )}
                  </View>
                )}
              </ScrollView>
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
              <TouchableOpacity onPress={() => setLedgerMode(null)} style={styles.modalClose}>
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
              <TextInput style={[styles.input, ta, { fontSize: 20, fontWeight: "700" }]} value={ledgerAmount} onChangeText={setLedgerAmount} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={Colors.textMuted} autoFocus />
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
              <TouchableOpacity onPress={() => setShowForm(false)} style={styles.modalClose}>
                <Ionicons name="close" size={22} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
              {inputRow(L("اسم التاجر *", "Name *", "Name *"), "name")}
              {inputRow(L("اسم المحل", "Geschäftsname", "Shop name"), "shopName")}
              <View style={[row, { gap: 10 }]}>
                <View style={{ flex: 1 }}>{inputRow(L("الهاتف", "Telefon", "Phone"), "phone")}</View>
                <View style={{ flex: 1 }}>{inputRow(L("الرقم الضريبي / السجل", "Steuer-/Handelsreg.-Nr.", "Tax / register no."), "taxNumber")}</View>
              </View>
              {inputRow(L("البريد الإلكتروني", "E-Mail", "Email"), "email")}
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
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: "700", color: Colors.text },
  addBtn: { backgroundColor: Colors.accent, borderRadius: 8, padding: 6 },
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
  modalClose: { padding: 4 },
  balanceBox: { backgroundColor: Colors.surfaceLight, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.cardBorder },
  bigBalance: { fontSize: 28, fontWeight: "900", marginVertical: 4 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 },
  actionBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  outlineBtn: { backgroundColor: Colors.surfaceLight, borderWidth: 1, borderColor: Colors.cardBorder },
  sectionTitle: { color: Colors.text, fontSize: 15, fontWeight: "800", marginTop: 6 },
  chip: { borderRadius: 16, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: Colors.surfaceLight, borderWidth: 1, borderColor: Colors.cardBorder },
  chipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  chipText: { color: Colors.textSecondary, fontSize: 12, fontWeight: "600" },
  chipTextActive: { color: Colors.textDark },
  statementBox: { backgroundColor: Colors.surfaceLight, borderRadius: 14, paddingHorizontal: 12, borderWidth: 1, borderColor: Colors.cardBorder },
  stRow: { alignItems: "center", gap: 8, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  stLabel: { color: Colors.text, fontSize: 13, fontWeight: "600" },
  stAmount: { color: Colors.text, fontSize: 14, fontWeight: "700" },
  hint: { color: Colors.textMuted, fontSize: 11, paddingBottom: 10 },
  fieldLabel: { color: Colors.textSecondary, fontSize: 12, fontWeight: "600" },
  input: { backgroundColor: Colors.inputBg, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, color: Colors.text, fontSize: 14, borderWidth: 1, borderColor: Colors.inputBorder },
  primaryBtn: { backgroundColor: Colors.accent, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 20, alignItems: "center" },
  primaryBtnText: { color: Colors.textDark, fontWeight: "800", fontSize: 15 },
}));
