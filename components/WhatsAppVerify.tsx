import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useTheme } from "@/lib/theme-context";
import { useLanguage } from "@/lib/language-context";
import { getQueryFn } from "@/lib/query-client";

/**
 * Store WhatsApp summary in Store Settings. The store links its own WhatsApp
 * (QR) on the WhatsApp screen; linking proves it holds the number, so no
 * separate code check is needed any more.
 */
const COPY = {
  ar: {
    title: "واتساب المتجر",
    on: (p: string) => `مربوط بالرقم +${p} — الطلبات والرسائل تعمل`,
    waiting: "بانتظار مسح رمز QR",
    off: "غير مربوط — اربط رقم متجرك لإرسال رسائل الطلبات والعروض واستقبال رسائل الزبائن",
    manage: "إدارة واتساب",
    link: "ربط واتساب",
  },
  de: {
    title: "WhatsApp des Geschäfts",
    on: (p: string) => `Verbunden mit +${p} — Bestellnachrichten und Chats sind aktiv`,
    waiting: "Warte auf das Scannen des QR-Codes",
    off: "Nicht verbunden — verbinden Sie die Nummer Ihres Geschäfts, um Bestellnachrichten und Angebote zu senden und Kundenchats zu empfangen",
    manage: "WhatsApp verwalten",
    link: "WhatsApp verbinden",
  },
  en: {
    title: "Store WhatsApp",
    on: (p: string) => `Linked to +${p} — order messages and chats are on`,
    waiting: "Waiting for the QR code to be scanned",
    off: "Not linked — link your store's number to send order messages and offers and receive customer chats",
    manage: "Manage WhatsApp",
    link: "Link WhatsApp",
  },
};

export default function WhatsAppVerify({ onOpen }: { onOpen?: () => void }) {
  const { colors } = useTheme();
  const { language, isRTL } = useLanguage();
  const c = language === "ar" ? COPY.ar : language === "de" ? COPY.de : COPY.en;
  const { data } = useQuery<any>({
    queryKey: ["/api/whatsapp/session"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    refetchInterval: 20000,
  });
  const status = data?.status;
  const connected = status === "connected";
  const color = connected ? colors.success : status === "qr_ready" || status === "connecting" ? colors.warning : colors.textMuted;
  const align = isRTL ? ("right" as const) : ("left" as const);

  return (
    <View style={[s.card, { borderColor: colors.border, backgroundColor: colors.card }]}>
      <View style={s.row}>
        <View style={[s.icon, { backgroundColor: "#25D36622" }]}>
          <Ionicons name="logo-whatsapp" size={24} color="#25D366" />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[s.title, { color: colors.text, textAlign: align }]}>{c.title}</Text>
          <Text style={[s.sub, { color, textAlign: align }]}>
            {connected && data?.phone ? c.on(String(data.phone).replace(/^\+/, "")) : status === "qr_ready" || status === "connecting" ? c.waiting : c.off}
          </Text>
        </View>
      </View>
      <Pressable
        onPress={() => { onOpen?.(); router.push("/whatsapp" as any); }}
        accessibilityRole="button"
        style={[s.btn, { backgroundColor: connected ? "transparent" : "#128C7E", borderColor: "#128C7E" }]}
      >
        <Ionicons name={connected ? "settings-outline" : "qr-code-outline"} size={16} color={connected ? "#128C7E" : "#fff"} />
        <Text style={[s.btnText, { color: connected ? "#128C7E" : "#fff" }]}>{connected ? c.manage : c.link}</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 14, padding: 14, marginTop: 16, gap: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  icon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 15, fontWeight: "800" },
  sub: { fontSize: 12, fontWeight: "600", marginTop: 3, lineHeight: 17 },
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 12, minHeight: 44 },
  btnText: { fontSize: 14, fontWeight: "800" },
});
