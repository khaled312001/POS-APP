import React, { useEffect, useState } from "react";
import { View, Text, Pressable, Switch, TextInput, ActivityIndicator, Image, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "@/lib/theme-context";
import { useLanguage } from "@/lib/language-context";
import { apiRequest, getQueryFn, getApiUrl } from "@/lib/query-client";

/**
 * Sham Cash (شام كاش) for a store: its own QR code and Sham Cash number,
 * shown to the customer at checkout on the till and on the online store. The
 * money goes straight to the store's own Sham Cash account; no gateway.
 */
const COPY = {
  en: {
    title: "Sham Cash",
    sub: "Customers pay to your own Sham Cash account",
    live: "Shown at checkout (till and online store)",
    enabled: "Accept Sham Cash",
    qr: "Your Sham Cash QR code",
    qrHint: "Open the Sham Cash app → Receive → save the QR image, then upload it here.",
    upload: "Upload QR code",
    change: "Change",
    remove: "Remove",
    phone: "Sham Cash number",
    phonePh: "e.g. 0944 123 456",
    holder: "Account holder name",
    holderPh: "Name shown in Sham Cash",
    save: "Save",
    saved: "Saved",
    needOne: "Add a QR code or a Sham Cash number so customers know where to pay.",
    uploadFailed: "Upload failed",
  },
  de: {
    title: "Sham Cash",
    sub: "Kunden zahlen direkt auf Ihr Sham-Cash-Konto",
    live: "Wird an der Kasse und im Online-Shop angezeigt",
    enabled: "Sham Cash akzeptieren",
    qr: "Ihr Sham-Cash-QR-Code",
    qrHint: "In der Sham-Cash-App → Empfangen → QR-Bild speichern und hier hochladen.",
    upload: "QR-Code hochladen",
    change: "Ändern",
    remove: "Entfernen",
    phone: "Sham-Cash-Nummer",
    phonePh: "z. B. 0944 123 456",
    holder: "Kontoinhaber",
    holderPh: "Name in Sham Cash",
    save: "Speichern",
    saved: "Gespeichert",
    needOne: "QR-Code oder Sham-Cash-Nummer angeben, damit Kunden wissen, wohin sie zahlen.",
    uploadFailed: "Upload fehlgeschlagen",
  },
  ar: {
    title: "شام كاش",
    sub: "الزبون يدفع مباشرة إلى حساب شام كاش الخاص بمتجرك",
    live: "يظهر عند الدفع في الكاشير والمتجر الإلكتروني",
    enabled: "تفعيل الدفع عبر شام كاش",
    qr: "رمز QR الخاص بشام كاش",
    qrHint: "من تطبيق شام كاش ← استلام ← احفظ صورة رمز QR ثم ارفعها هنا.",
    upload: "رفع رمز QR",
    change: "تغيير",
    remove: "حذف",
    phone: "رقم شام كاش",
    phonePh: "مثال: 0944 123 456",
    holder: "اسم صاحب الحساب",
    holderPh: "الاسم كما يظهر في شام كاش",
    save: "حفظ",
    saved: "تم الحفظ",
    needOne: "أضف رمز QR أو رقم شام كاش حتى يعرف الزبون أين يدفع.",
    uploadFailed: "فشل رفع الصورة",
  },
};

export function shamCashImageUri(path?: string | null): string | null {
  if (!path) return null;
  if (/^(https?:|data:|file:|blob:)/.test(path)) return path;
  const p = path.startsWith("/api/") ? path : `/api${path}`;
  return `${getApiUrl().replace(/\/$/, "")}${p}`;
}

const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

export default function ShamCashSettings() {
  const { colors } = useTheme();
  const { language, isRTL } = useLanguage();
  const c = (COPY as any)[language] ?? COPY.en;
  const { data, refetch, isLoading } = useQuery<any>({
    queryKey: ["/api/payment-gateway/shamcash"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const [enabled, setEnabled] = useState(false);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [holderName, setHolderName] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!data) return;
    setEnabled(!!data.enabled);
    setQrImage(data.qrImage ?? null);
    setPhone(data.phone ?? "");
    setHolderName(data.holderName ?? "");
  }, [data]);

  const save = async (patch?: { enabled?: boolean; qrImage?: string | null }) => {
    setBusy(true);
    setMsg(null);
    try {
      await apiRequest("PUT", "/api/payment-gateway/shamcash", {
        enabled: patch?.enabled ?? enabled,
        qrImage: patch && "qrImage" in patch ? patch.qrImage : qrImage,
        phone,
        holderName,
      });
      await refetch();
      setMsg(c.saved);
    } catch (e: any) {
      setMsg(e?.message || "Error");
    } finally {
      setBusy(false);
    }
  };

  const pickQr = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images" as ImagePicker.MediaType,
      quality: 0.9,
    });
    if (result.canceled || !result.assets[0]) return;
    setUploading(true);
    setMsg(null);
    try {
      const blob = await (await fetch(result.assets[0].uri)).blob();
      const res = await apiRequest("POST", "/api/objects/upload", {
        imageData: await blobToBase64(blob),
        contentType: blob.type || "image/png",
      });
      const { objectPath } = await res.json();
      if (!objectPath) throw new Error(c.uploadFailed);
      setQrImage(objectPath);
      await save({ qrImage: objectPath });
    } catch (e: any) {
      setMsg(e?.message || c.uploadFailed);
    } finally {
      setUploading(false);
    }
  };

  const live = !!data?.live;
  const row = isRTL ? ("row-reverse" as const) : ("row" as const);
  const align = isRTL ? ("right" as const) : ("left" as const);
  const qrUri = shamCashImageUri(qrImage);
  const inputStyle = [s.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card, textAlign: align }];

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

      <Text style={[s.label, { color: colors.textMuted, textAlign: align }]}>{c.qr}</Text>
      <View style={[s.qrRow, { flexDirection: row, borderColor: colors.border, backgroundColor: colors.card }]}>
        {qrUri ? (
          <Image source={{ uri: qrUri }} style={s.qr} resizeMode="contain" />
        ) : (
          <View style={[s.qr, s.qrEmpty, { borderColor: colors.border }]}>
            <Ionicons name="qr-code-outline" size={40} color={colors.textMuted} />
          </View>
        )}
        <View style={{ flex: 1, gap: 8 }}>
          <Text style={{ color: colors.textMuted, fontSize: 12, textAlign: align }}>{c.qrHint}</Text>
          <View style={{ flexDirection: row, gap: 8, flexWrap: "wrap" }}>
            <Pressable onPress={pickQr} disabled={uploading} style={[s.smallBtn, { backgroundColor: "#0E9F6E" }]}>
              {uploading ? <ActivityIndicator color="#fff" size="small" /> : (
                <Text style={s.smallBtnText}>{qrUri ? c.change : c.upload}</Text>
              )}
            </Pressable>
            {!!qrUri && (
              <Pressable
                onPress={() => { setQrImage(null); save({ qrImage: null }); }}
                style={[s.smallBtn, { borderWidth: 1, borderColor: colors.danger }]}
              >
                <Text style={[s.smallBtnText, { color: colors.danger }]}>{c.remove}</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>

      <Text style={[s.label, { color: colors.textMuted, textAlign: align }]}>{c.phone}</Text>
      <TextInput
        value={phone}
        onChangeText={setPhone}
        placeholder={c.phonePh}
        placeholderTextColor={colors.textMuted}
        keyboardType="phone-pad"
        style={inputStyle}
      />

      <Text style={[s.label, { color: colors.textMuted, textAlign: align }]}>{c.holder}</Text>
      <TextInput
        value={holderName}
        onChangeText={setHolderName}
        placeholder={c.holderPh}
        placeholderTextColor={colors.textMuted}
        style={inputStyle}
      />

      {enabled && !qrImage && !phone.trim() && (
        <Text style={[s.note, { color: colors.warning, textAlign: align }]}>{c.needOne}</Text>
      )}

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
  qrRow: { alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 12, padding: 10 },
  qr: { width: 110, height: 110, borderRadius: 8, backgroundColor: "#fff" },
  qrEmpty: { borderWidth: 1, borderStyle: "dashed", justifyContent: "center", alignItems: "center", backgroundColor: "transparent" },
  smallBtn: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, minWidth: 80, alignItems: "center" },
  smallBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  hint: { fontSize: 11, marginTop: 6 },
  note: { fontSize: 12, marginTop: 8 },
  btn: { marginTop: 14, backgroundColor: "#0E9F6E", borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  btnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
});
