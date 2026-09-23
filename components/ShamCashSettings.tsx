import React, { useEffect, useState } from "react";
import { View, Text, Pressable, Switch, TextInput, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "@/lib/theme-context";
import { useLanguage } from "@/lib/language-context";
import { apiRequest, getQueryFn } from "@/lib/query-client";

/**
 * Sham Cash (شام كاش) settings for Syrian stores: switch it on, pick the wallet
 * that receives the money, optionally use the store's own API key instead of
 * the platform one. The key is write-only; the server only ever returns a mask.
 */
const COPY = {
  en: {
    title: "Sham Cash",
    sub: "Online payments in Syrian pounds",
    enabled: "Accept Sham Cash",
    wallet: "Receiving wallet",
    noWallets: "No wallets found for this API key.",
    pending: "pending — finish linking it in the Sham Cash dashboard",
    active: "active",
    ownKey: "Store API key (optional)",
    ownKeyHint: "Leave empty to use the Kassenta platform key.",
    save: "Save",
    saved: "Saved",
    currencyWarn: "Sham Cash only works for stores whose currency is SYP or USD. Change the branch currency first.",
    notReady: "Not live yet: pick an active wallet.",
    live: "Live on the online store",
  },
  de: {
    title: "Sham Cash",
    sub: "Online-Zahlungen in Syrischen Pfund",
    enabled: "Sham Cash akzeptieren",
    wallet: "Empfangs-Wallet",
    noWallets: "Für diesen API-Schlüssel wurden keine Wallets gefunden.",
    pending: "ausstehend — im Sham-Cash-Dashboard fertig verknüpfen",
    active: "aktiv",
    ownKey: "Eigener API-Schlüssel (optional)",
    ownKeyHint: "Leer lassen, um den Kassenta-Plattformschlüssel zu nutzen.",
    save: "Speichern",
    saved: "Gespeichert",
    currencyWarn: "Sham Cash funktioniert nur für Filialen mit Währung SYP oder USD. Bitte zuerst die Währung ändern.",
    notReady: "Noch nicht aktiv: bitte ein aktives Wallet wählen.",
    live: "Aktiv im Online-Shop",
  },
  ar: {
    title: "شام كاش",
    sub: "دفع إلكتروني بالليرة السورية",
    enabled: "تفعيل الدفع عبر شام كاش",
    wallet: "المحفظة المستلِمة",
    noWallets: "لا توجد محافظ مرتبطة بهذا المفتاح.",
    pending: "قيد الانتظار — أكمل ربطها من لوحة شام كاش",
    active: "نشطة",
    ownKey: "مفتاح API خاص بالمتجر (اختياري)",
    ownKeyHint: "اتركه فارغاً لاستخدام مفتاح منصة Kassenta.",
    save: "حفظ",
    saved: "تم الحفظ",
    currencyWarn: "شام كاش يعمل فقط للمتاجر التي عملتها الليرة السورية أو الدولار. غيّر عملة الفرع أولاً.",
    notReady: "غير مفعّل بعد: اختر محفظة نشطة.",
    live: "مفعّل في المتجر الإلكتروني",
  },
};

export default function ShamCashSettings() {
  const { colors } = useTheme();
  const { language, isRTL } = useLanguage();
  const c = (COPY as any)[language] ?? COPY.en;
  const { data, refetch, isLoading } = useQuery<any>({
    queryKey: ["/api/payment-gateway/shamcash"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const [enabled, setEnabled] = useState(false);
  const [walletId, setWalletId] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!data) return;
    setEnabled(!!data.enabled);
    setWalletId(data.walletId ?? null);
    setApiKey(data.ownApiKey ?? "");
  }, [data]);

  const save = async (patch?: { enabled?: boolean }) => {
    setBusy(true);
    setMsg(null);
    try {
      await apiRequest("PUT", "/api/payment-gateway/shamcash", {
        enabled: patch?.enabled ?? enabled,
        walletId,
        apiKey,
      });
      await refetch();
      setMsg(c.saved);
    } catch (e: any) {
      setMsg(e?.message || "Error");
    } finally {
      setBusy(false);
    }
  };

  const wallets: any[] = data?.wallets ?? [];
  // No explicit pick means "first active wallet" (the server does the same).
  const selected = walletId
    ? wallets.find((w) => w.id === walletId || w.walletAddress === walletId || w.accountNumber === walletId)
    : wallets.find((w) => w.status === "active");
  const live = !!data?.enabled && selected?.status === "active" && !!data?.currency;
  const row = isRTL ? ("row-reverse" as const) : ("row" as const);
  const align = isRTL ? ("right" as const) : ("left" as const);

  return (
    <View style={{ marginBottom: 8 }}>
      <View style={[s.header, { flexDirection: row }]}>
        <View style={[s.icon, { backgroundColor: "#0E9F6E20" }]}>
          <Ionicons name="wallet" size={24} color="#0E9F6E" />
        </View>
        <View style={{ flex: 1, alignItems: isRTL ? "flex-end" : "flex-start" }}>
          <Text style={[s.name, { color: colors.text }]}>{c.title}</Text>
          <Text style={{ color: live ? colors.success : colors.textMuted, fontSize: 13, fontWeight: "600", marginTop: 3 }}>
            {live ? c.live : c.sub}
          </Text>
        </View>
        {isLoading ? <ActivityIndicator /> : (
          <Switch
            value={enabled}
            onValueChange={(v) => { setEnabled(v); save({ enabled: v }); }}
            disabled={busy}
          />
        )}
      </View>

      {!!data && !data.currency && (
        <Text style={[s.note, { color: colors.warning, textAlign: align }]}>{c.currencyWarn}</Text>
      )}
      {!!data?.apiError && (
        <Text style={[s.note, { color: colors.danger, textAlign: align }]}>{data.apiError}</Text>
      )}

      <Text style={[s.label, { color: colors.textMuted, textAlign: align }]}>{c.wallet}</Text>
      {wallets.length === 0 ? (
        <Text style={[s.note, { color: colors.textMuted, textAlign: align }]}>{c.noWallets}</Text>
      ) : (
        wallets.map((w) => {
          const on = walletId === w.id;
          return (
            <Pressable
              key={w.id}
              onPress={() => setWalletId(w.id)}
              style={[s.wallet, { flexDirection: row, borderColor: on ? "#0E9F6E" : colors.border, backgroundColor: colors.card }]}
            >
              <Ionicons name={on ? "radio-button-on" : "radio-button-off"} size={18} color={on ? "#0E9F6E" : colors.textMuted} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: "700", textAlign: align }}>
                  {w.label || w.accountNumber || w.id}
                </Text>
                <Text style={{ color: w.status === "active" ? colors.success : colors.warning, fontSize: 12, textAlign: align }}>
                  {w.status === "active" ? c.active : c.pending}
                  {w.accountNumber ? ` · ${w.accountNumber}` : ""}
                </Text>
              </View>
            </Pressable>
          );
        })
      )}

      <Text style={[s.label, { color: colors.textMuted, textAlign: align }]}>{c.ownKey}</Text>
      <TextInput
        value={apiKey}
        onChangeText={setApiKey}
        placeholder="sk_…"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry={!apiKey.includes("•")}
        style={[s.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card, textAlign: align }]}
      />
      <Text style={[s.hint, { color: colors.textMuted, textAlign: align }]}>{c.ownKeyHint}</Text>

      {enabled && !live && <Text style={[s.note, { color: colors.warning, textAlign: align }]}>{c.notReady}</Text>}

      <Pressable onPress={() => save()} disabled={busy} style={[s.btn, busy && { opacity: 0.6 }]}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>{c.save}</Text>}
      </Pressable>
      {!!msg && <Text style={[s.hint, { color: colors.textMuted, textAlign: "center" }]}>{msg}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  header: { alignItems: "center", gap: 14, marginBottom: 12 },
  icon: { width: 48, height: 48, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  name: { fontSize: 18, fontWeight: "700" },
  label: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 12, marginBottom: 6 },
  wallet: { alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  hint: { fontSize: 11, marginTop: 6 },
  note: { fontSize: 12, marginTop: 6 },
  btn: { marginTop: 14, backgroundColor: "#0E9F6E", borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  btnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
});
