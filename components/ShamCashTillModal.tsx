import React, { useEffect, useState } from "react";
import { View, Text, Pressable, TextInput, ActivityIndicator, Modal, ScrollView, Image, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/lib/theme-context";
import { useLanguage } from "@/lib/language-context";
import { formatMoney } from "@/lib/currency";
import { shamCashImageUri } from "@/components/ShamCashSettings";

/**
 * Till-side Sham Cash: shows the store's own QR code and number so the
 * customer can transfer from their Sham Cash app. The cashier checks the
 * store's Sham Cash app and confirms; only then is the sale recorded.
 */
const COPY = {
  en: {
    title: "Sham Cash payment", scan: "Scan with the Sham Cash app, or send to:", number: "Sham Cash number", holder: "Account name",
    refPh: "Transaction number (optional)", confirm: "Payment received", cancel: "Back",
    check: "Confirm only after the money shows in your Sham Cash app.",
  },
  de: {
    title: "Sham-Cash-Zahlung", scan: "Mit der Sham-Cash-App scannen oder senden an:", number: "Sham-Cash-Nummer", holder: "Kontoname",
    refPh: "Transaktionsnummer (optional)", confirm: "Zahlung erhalten", cancel: "Zurück",
    check: "Erst bestätigen, wenn das Geld in Ihrer Sham-Cash-App angekommen ist.",
  },
  ar: {
    title: "الدفع عبر شام كاش", scan: "امسح الرمز من تطبيق شام كاش، أو حوّل إلى:", number: "رقم شام كاش", holder: "اسم الحساب",
    refPh: "رقم العملية (اختياري)", confirm: "تم استلام المبلغ", cancel: "رجوع",
    check: "أكّد فقط بعد أن يظهر المبلغ في تطبيق شام كاش الخاص بالمتجر.",
  },
};

export interface ShamCashInfo {
  qrImage?: string | null;
  phone?: string | null;
  holderName?: string | null;
}

interface Props {
  visible: boolean;
  amount: number;
  info: ShamCashInfo | null | undefined;
  busy?: boolean;
  onConfirm: (reference: string) => void;
  onCancel: () => void;
}

export default function ShamCashTillModal({ visible, amount, info, busy, onConfirm, onCancel }: Props) {
  const { colors } = useTheme();
  const { language, isRTL } = useLanguage();
  const c = (COPY as any)[language] ?? COPY.en;
  const align = isRTL ? ("right" as const) : ("left" as const);
  const [reference, setReference] = useState("");
  useEffect(() => { if (visible) setReference(""); }, [visible]);

  const qrUri = shamCashImageUri(info?.qrImage);
  const row = (label: string, value?: string | null) =>
    !value ? null : (
      <View style={[s.row, { flexDirection: isRTL ? "row-reverse" : "row", borderColor: colors.border }]}>
        <Text style={{ color: colors.textMuted, fontSize: 13 }}>{label}</Text>
        <Text selectable style={{ color: colors.text, fontWeight: "700", fontSize: 15 }}>{value}</Text>
      </View>
    );

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={s.overlay}>
        <View style={[s.card, { backgroundColor: colors.surface }]}>
          <View style={[s.header, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <View style={[s.icon, { backgroundColor: "#0E9F6E20" }]}>
              <Ionicons name="wallet" size={20} color="#0E9F6E" />
            </View>
            <Text style={[s.title, { color: colors.text, textAlign: align, flex: 1 }]}>{c.title}</Text>
            <Pressable onPress={onCancel} disabled={busy}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={[s.amount, { color: colors.text }]}>{formatMoney(amount)}</Text>
            <Text style={[s.step, { color: colors.textMuted, textAlign: align }]}>{c.scan}</Text>
            {!!qrUri && (
              <View style={s.qrWrap}>
                <Image source={{ uri: qrUri }} style={s.qr} resizeMode="contain" />
              </View>
            )}
            {row(c.number, info?.phone)}
            {row(c.holder, info?.holderName)}

            <TextInput
              value={reference}
              onChangeText={setReference}
              placeholder={c.refPh}
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              style={[s.input, { color: colors.text, borderColor: colors.border, textAlign: align }]}
            />
            <Text style={[s.step, { color: colors.warning, textAlign: align }]}>{c.check}</Text>

            <Pressable onPress={() => onConfirm(reference.trim())} disabled={busy} style={[s.primary, busy && { opacity: 0.6 }]}>
              {busy ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={s.primaryText}>{c.confirm}</Text>
                </>
              )}
            </Pressable>
            <Pressable onPress={onCancel} disabled={busy} style={s.ghost}>
              <Text style={{ color: colors.textMuted }}>{c.cancel}</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: 16 },
  card: { width: "100%", maxWidth: 420, maxHeight: "94%", borderRadius: 20, padding: 20 },
  header: { alignItems: "center", gap: 10, marginBottom: 6 },
  icon: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 18, fontWeight: "700" },
  amount: { fontSize: 30, fontWeight: "800", textAlign: "center", marginVertical: 6 },
  step: { fontSize: 13, marginTop: 8, marginBottom: 6, lineHeight: 19 },
  qrWrap: { alignItems: "center", backgroundColor: "#fff", borderRadius: 14, padding: 10, marginVertical: 6 },
  qr: { width: 230, height: 230 },
  row: { justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15, marginTop: 12 },
  primary: { marginTop: 8, backgroundColor: "#0E9F6E", borderRadius: 12, paddingVertical: 13, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  primaryText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  ghost: { alignItems: "center", paddingVertical: 12 },
});
