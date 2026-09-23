import React, { useState } from "react";
import { View, Text, Pressable, TextInput, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "@/lib/theme-context";
import { useLanguage } from "@/lib/language-context";
import { apiRequest, apiErrorMessage, getQueryFn } from "@/lib/query-client";

/**
 * The store's WhatsApp number for order notifications. It only takes effect
 * once verified: a code is sent to the number over WhatsApp and typed back.
 */
const COPY = {
  en: {
    title: "WhatsApp for order notifications",
    linked: "Linked and verified",
    notLinked: "Not linked — new orders are not sent to WhatsApp",
    phonePh: "Number with country code, e.g. 963944123456",
    send: "Send code",
    resend: "Send again",
    codeSent: "We sent a code on WhatsApp to",
    codePh: "6-digit code",
    confirm: "Confirm",
    change: "Change number",
    unlink: "Unlink",
    offline: "The WhatsApp service is offline right now; codes can't be sent. Try again later.",
    done: "WhatsApp linked",
  },
  de: {
    title: "WhatsApp für Bestellbenachrichtigungen",
    linked: "Verknüpft und bestätigt",
    notLinked: "Nicht verknüpft — neue Bestellungen gehen nicht an WhatsApp",
    phonePh: "Nummer mit Ländervorwahl, z. B. 41791234567",
    send: "Code senden",
    resend: "Erneut senden",
    codeSent: "Wir haben per WhatsApp einen Code gesendet an",
    codePh: "6-stelliger Code",
    confirm: "Bestätigen",
    change: "Nummer ändern",
    unlink: "Trennen",
    offline: "Der WhatsApp-Dienst ist gerade offline; Codes können nicht gesendet werden.",
    done: "WhatsApp verknüpft",
  },
  ar: {
    title: "واتساب إشعارات الطلبات",
    linked: "مربوط ومؤكَّد",
    notLinked: "غير مربوط — الطلبات الجديدة لا تُرسل على واتساب",
    phonePh: "الرقم مع رمز الدولة، مثال: 963944123456",
    send: "إرسال رمز التأكيد",
    resend: "إعادة الإرسال",
    codeSent: "أرسلنا رمزاً على واتساب إلى",
    codePh: "الرمز المكوّن من 6 أرقام",
    confirm: "تأكيد",
    change: "تغيير الرقم",
    unlink: "إلغاء الربط",
    offline: "خدمة واتساب غير متصلة حالياً، لا يمكن إرسال الرموز. حاول لاحقاً.",
    done: "تم ربط واتساب",
  },
};

export default function WhatsAppVerify() {
  const { colors } = useTheme();
  const { language, isRTL } = useLanguage();
  const c = (COPY as any)[language] ?? COPY.en;
  const align = isRTL ? ("right" as const) : ("left" as const);
  const row = isRTL ? ("row-reverse" as const) : ("row" as const);

  const { data, refetch } = useQuery<any>({
    queryKey: ["/api/whatsapp/store"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const [editing, setEditing] = useState(false);
  const [phone, setPhone] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok?: boolean } | null>(null);

  const verified = !!data?.verified;
  const showForm = !verified || editing;

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setMsg(null);
    try { await fn(); } catch (e: any) { setMsg({ text: apiErrorMessage(e) }); } finally { setBusy(false); }
  };

  const sendCode = () => run(async () => {
    const res = await apiRequest("POST", "/api/whatsapp/store/verify/start", { phone });
    const out = await res.json();
    setSentTo(out.phone);
    setCode("");
  });

  const confirm = () => run(async () => {
    await apiRequest("POST", "/api/whatsapp/store/verify/confirm", { code });
    setSentTo(null);
    setEditing(false);
    setPhone("");
    setCode("");
    await refetch();
    setMsg({ text: c.done, ok: true });
  });

  const unlink = () => run(async () => {
    await apiRequest("DELETE", "/api/whatsapp/store");
    setEditing(false);
    await refetch();
  });

  const input = [s.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card, textAlign: align }];

  return (
    <View style={{ marginTop: 12 }}>
      <View style={[{ flexDirection: row, alignItems: "center", gap: 8, marginBottom: 6 }]}>
        <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
        <Text style={{ color: colors.text, fontWeight: "700", fontSize: 14, flex: 1, textAlign: align }}>{c.title}</Text>
      </View>

      {verified && (
        <View style={[s.status, { flexDirection: row, borderColor: "#25D366" }]}>
          <Ionicons name="checkmark-circle" size={18} color="#25D366" />
          <Text style={{ color: colors.text, fontWeight: "700", flex: 1, textAlign: align }}>
            +{data.phone} · <Text style={{ color: "#25D366", fontWeight: "600" }}>{c.linked}</Text>
          </Text>
        </View>
      )}
      {!verified && data && (
        <Text style={{ color: colors.warning, fontSize: 12, marginBottom: 6, textAlign: align }}>{c.notLinked}</Text>
      )}
      {data && !data.platformConnected && showForm && (
        <Text style={{ color: colors.danger, fontSize: 12, marginBottom: 6, textAlign: align }}>{c.offline}</Text>
      )}

      {showForm && !sentTo && (
        <View style={{ gap: 8 }}>
          <TextInput value={phone} onChangeText={setPhone} placeholder={c.phonePh} placeholderTextColor={colors.textMuted} keyboardType="phone-pad" style={input} />
          <Pressable onPress={sendCode} disabled={busy || phone.replace(/\D/g, "").length < 8} style={[s.btn, (busy || phone.replace(/\D/g, "").length < 8) && { opacity: 0.5 }]}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>{c.send}</Text>}
          </Pressable>
        </View>
      )}

      {showForm && !!sentTo && (
        <View style={{ gap: 8 }}>
          <Text style={{ color: colors.textMuted, fontSize: 12, textAlign: align }}>{c.codeSent} +{sentTo}</Text>
          <TextInput value={code} onChangeText={setCode} placeholder={c.codePh} placeholderTextColor={colors.textMuted} keyboardType="number-pad" maxLength={6} style={[input, { letterSpacing: 4, fontSize: 18 }]} />
          <Pressable onPress={confirm} disabled={busy || code.length < 6} style={[s.btn, (busy || code.length < 6) && { opacity: 0.5 }]}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>{c.confirm}</Text>}
          </Pressable>
          <Pressable onPress={() => { setSentTo(null); setCode(""); }} disabled={busy} style={s.link}>
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>{c.resend}</Text>
          </Pressable>
        </View>
      )}

      {verified && !editing && (
        <View style={{ flexDirection: row, gap: 16, marginTop: 6 }}>
          <Pressable onPress={() => { setEditing(true); setSentTo(null); }} style={s.link}>
            <Text style={{ color: colors.text, fontSize: 12, fontWeight: "600" }}>{c.change}</Text>
          </Pressable>
          <Pressable onPress={unlink} disabled={busy} style={s.link}>
            <Text style={{ color: colors.danger, fontSize: 12, fontWeight: "600" }}>{c.unlink}</Text>
          </Pressable>
        </View>
      )}

      {!!msg && <Text style={{ color: msg.ok ? colors.success : colors.danger, fontSize: 12, marginTop: 6, textAlign: align }}>{msg.text}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  status: { alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 12, padding: 10, marginBottom: 4 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  btn: { backgroundColor: "#25D366", borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  btnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  link: { paddingVertical: 6 },
});
