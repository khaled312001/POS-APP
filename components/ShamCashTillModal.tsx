import React, { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, TextInput, ActivityIndicator, Modal, ScrollView, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/lib/theme-context";
import { useLanguage } from "@/lib/language-context";
import { apiRequest } from "@/lib/query-client";
import { formatMoney } from "@/lib/currency";

/**
 * Till-side Sham Cash payment. The sale already exists (unpaid); this opens a
 * Sham Cash invoice for it, shows the customer where to send the money, and
 * waits. The sale is only called paid once the server has re-read the invoice
 * from Sham Cash — either through the webhook (picked up by polling) or when
 * the cashier types the transaction number from the customer's app.
 */
const COPY = {
  en: {
    title: "Sham Cash payment", creating: "Creating the invoice…", step1: "The customer sends exactly this amount in the Sham Cash app to:",
    step2: "Then type the transaction number from their app, or wait — it confirms on its own.",
    account: "Account number", wallet: "Wallet address", beneficiary: "Beneficiary", invoice: "Invoice",
    tranPh: "Sham Cash transaction number", verify: "Confirm payment", checking: "Checking…", waiting: "Waiting for the payment…",
    notYet: "Payment not received yet", paid: "Payment received", cash: "Take cash instead", later: "Leave payment pending",
    expired: "The invoice expired. Take cash or leave it pending.", copy: "Copy", copied: "Copied", enterTran: "Enter the transaction number",
  },
  de: {
    title: "Sham-Cash-Zahlung", creating: "Rechnung wird erstellt…", step1: "Der Kunde überweist genau diesen Betrag in der Sham-Cash-App an:",
    step2: "Dann die Transaktionsnummer aus der App eingeben — oder warten, es bestätigt sich selbst.",
    account: "Kontonummer", wallet: "Wallet-Adresse", beneficiary: "Empfänger", invoice: "Rechnung",
    tranPh: "Sham-Cash-Transaktionsnummer", verify: "Zahlung bestätigen", checking: "Wird geprüft…", waiting: "Warte auf Zahlung…",
    notYet: "Zahlung noch nicht eingegangen", paid: "Zahlung erhalten", cash: "Stattdessen bar kassieren", later: "Zahlung offen lassen",
    expired: "Die Rechnung ist abgelaufen. Bar kassieren oder offen lassen.", copy: "Kopieren", copied: "Kopiert", enterTran: "Transaktionsnummer eingeben",
  },
  ar: {
    title: "الدفع عبر شام كاش", creating: "جارٍ إنشاء الفاتورة…", step1: "يحوّل الزبون هذا المبلغ بالضبط من تطبيق شام كاش إلى:",
    step2: "ثم أدخل رقم العملية من تطبيقه، أو انتظر — يتأكد الدفع تلقائياً.",
    account: "رقم الحساب", wallet: "عنوان المحفظة", beneficiary: "اسم المستفيد", invoice: "رقم الفاتورة",
    tranPh: "رقم العملية من شام كاش", verify: "تأكيد الدفع", checking: "جارٍ التحقق…", waiting: "بانتظار الدفع…",
    notYet: "لم يصل الدفع بعد", paid: "تم استلام الدفع", cash: "الدفع نقداً بدلاً من ذلك", later: "ترك الدفع معلّقاً",
    expired: "انتهت صلاحية الفاتورة. اقبض نقداً أو اتركها معلّقة.", copy: "نسخ", copied: "تم", enterTran: "أدخل رقم العملية",
  },
};

const POLL_MS = 5000;

interface Props {
  saleId: number | null;
  onPaid: () => void;
  onTakeCash: () => Promise<void> | void;
  onLeavePending: () => void;
}

export default function ShamCashTillModal({ saleId, onPaid, onTakeCash, onLeavePending }: Props) {
  const { colors } = useTheme();
  const { language, isRTL } = useLanguage();
  const c = (COPY as any)[language] ?? COPY.en;
  const align = isRTL ? ("right" as const) : ("left" as const);

  const [invoice, setInvoice] = useState<any>(null);
  const [error, setError] = useState("");
  const [tranId, setTranId] = useState("");
  const [busy, setBusy] = useState(false);
  const [paid, setPaid] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const done = useRef(false);

  const finish = () => {
    if (done.current) return;
    done.current = true;
    setPaid(true);
    setTimeout(onPaid, 900);
  };

  // Open (or reuse) the invoice whenever a new sale comes in.
  useEffect(() => {
    done.current = false;
    setInvoice(null); setError(""); setTranId(""); setPaid(false); setBusy(false);
    if (!saleId) return;
    let cancelled = false;
    apiRequest("POST", `/api/payments/sale/${saleId}/shamcash`, {})
      .then((r) => r.json())
      .then((inv) => { if (!cancelled) inv?.status === "paid" ? finish() : setInvoice(inv); })
      .catch((e) => { if (!cancelled) setError(e?.message || "Error"); });
    return () => { cancelled = true; };
  }, [saleId]);

  // The webhook may settle it first — poll the invoice quietly.
  useEffect(() => {
    if (!saleId || !invoice || paid) return;
    const timer = setInterval(async () => {
      try {
        const r = await apiRequest("GET", `/api/payments/sale/${saleId}/shamcash/status`);
        const s = await r.json();
        if (s?.status === "paid") finish();
        else if (s?.status === "expired") setError(c.expired);
      } catch { /* network blip at the till — keep waiting */ }
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [saleId, invoice, paid]);

  const verify = async () => {
    const t = tranId.trim();
    if (!t) { setError(c.enterTran); return; }
    setBusy(true); setError("");
    try {
      const r = await apiRequest("POST", `/api/payments/sale/${saleId}/shamcash/verify`, { tranId: t });
      const s = await r.json();
      if (s?.status === "paid") finish();
      else setError(c.notYet);
    } catch (e: any) {
      setError(e?.message || c.notYet);
    } finally {
      setBusy(false);
    }
  };

  const copy = (value: string) => {
    try {
      if (Platform.OS === "web" && (globalThis as any).navigator?.clipboard) {
        (globalThis as any).navigator.clipboard.writeText(value);
        setCopied(value);
      }
    } catch { /* not critical */ }
  };

  const row = (label: string, value?: string | null, canCopy = true) =>
    !value ? null : (
      <View style={[s.row, { flexDirection: isRTL ? "row-reverse" : "row", borderColor: colors.border }]}>
        <Text style={{ color: colors.textMuted, fontSize: 13 }}>{label}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text selectable style={{ color: colors.text, fontWeight: "700", fontSize: 14 }}>{value}</Text>
          {canCopy && Platform.OS === "web" && (
            <Pressable onPress={() => copy(value)} style={[s.copyBtn, { borderColor: colors.border }]}>
              <Text style={{ color: colors.text, fontSize: 11 }}>{copied === value ? c.copied : c.copy}</Text>
            </Pressable>
          )}
        </View>
      </View>
    );

  const to = invoice?.payTo || {};

  return (
    <Modal visible={saleId != null} animationType="fade" transparent>
      <View style={s.overlay}>
        <View style={[s.card, { backgroundColor: colors.surface ?? colors.card }]}>
          <View style={[s.header, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <View style={[s.icon, { backgroundColor: "#0E9F6E20" }]}>
              <Ionicons name="wallet" size={20} color="#0E9F6E" />
            </View>
            <Text style={[s.title, { color: colors.text, textAlign: align, flex: 1 }]}>{paid ? c.paid : c.title}</Text>
          </View>

          {paid ? (
            <View style={s.centre}>
              <Ionicons name="checkmark-circle" size={64} color={colors.success} />
            </View>
          ) : !invoice && !error ? (
            <View style={s.centre}>
              <ActivityIndicator size="large" color="#0E9F6E" />
              <Text style={{ color: colors.textMuted, marginTop: 10 }}>{c.creating}</Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {invoice && (
                <>
                  <Text style={[s.amount, { color: colors.text }]}>{formatMoney(invoice.amount)}</Text>
                  <Text style={[s.step, { color: colors.textMuted, textAlign: align }]}>{c.step1}</Text>
                  {row(c.account, to.accountNumber)}
                  {row(c.wallet, to.walletAddress)}
                  {row(c.beneficiary, to.label, false)}
                  {row(c.invoice, invoice.invoiceNumber)}
                  <Text style={[s.step, { color: colors.textMuted, textAlign: align }]}>{c.step2}</Text>
                  <TextInput
                    value={tranId}
                    onChangeText={setTranId}
                    placeholder={c.tranPh}
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                    style={[s.input, { color: colors.text, borderColor: colors.border, textAlign: align }]}
                  />
                  <Pressable onPress={verify} disabled={busy} style={[s.primary, busy && { opacity: 0.6 }]}>
                    {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryText}>{c.verify}</Text>}
                  </Pressable>
                  <View style={[s.waitRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                    <ActivityIndicator size="small" color="#0E9F6E" />
                    <Text style={{ color: colors.textMuted, fontSize: 12 }}>{c.waiting}</Text>
                  </View>
                </>
              )}
              {!!error && <Text style={[s.error, { color: colors.danger, textAlign: align }]}>{error}</Text>}
              <Pressable onPress={() => onTakeCash()} style={[s.secondary, { borderColor: colors.warning }]}>
                <Ionicons name="cash-outline" size={18} color={colors.warning} />
                <Text style={{ color: colors.warning, fontWeight: "700" }}>{c.cash}</Text>
              </Pressable>
              <Pressable onPress={onLeavePending} style={s.ghost}>
                <Text style={{ color: colors.textMuted }}>{c.later}</Text>
              </Pressable>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: 16 },
  card: { width: "100%", maxWidth: 440, maxHeight: "92%", borderRadius: 20, padding: 20 },
  header: { alignItems: "center", gap: 10, marginBottom: 10 },
  icon: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 18, fontWeight: "700" },
  centre: { alignItems: "center", paddingVertical: 28 },
  amount: { fontSize: 30, fontWeight: "800", textAlign: "center", marginVertical: 8 },
  step: { fontSize: 13, marginTop: 10, marginBottom: 6, lineHeight: 19 },
  row: { justifyContent: "space-between", alignItems: "center", paddingVertical: 9, borderBottomWidth: 1 },
  copyBtn: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, fontSize: 16, marginTop: 6 },
  primary: { marginTop: 10, backgroundColor: "#0E9F6E", borderRadius: 12, paddingVertical: 13, alignItems: "center" },
  primaryText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  waitRow: { alignItems: "center", gap: 8, marginTop: 10, justifyContent: "center" },
  error: { fontSize: 13, marginTop: 10 },
  secondary: { flexDirection: "row", gap: 8, justifyContent: "center", alignItems: "center", borderWidth: 1, borderRadius: 12, paddingVertical: 11, marginTop: 14 },
  ghost: { alignItems: "center", paddingVertical: 12 },
});
