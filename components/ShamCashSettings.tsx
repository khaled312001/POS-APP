import React, { useEffect, useState } from "react";
import { View, Text, Pressable, Switch, TextInput, ActivityIndicator, Image, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "@/lib/theme-context";
import { useLanguage } from "@/lib/language-context";
import { apiRequest, apiErrorMessage, getQueryFn, getApiUrl } from "@/lib/query-client";
import { getCurrency } from "@/lib/currency";
import { isValidStorePhone } from "@/components/store-locale";

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
    save: "Save Sham Cash details",
    saved: "Saved",
    needOne: "Add a QR code or a Sham Cash number so customers know where to pay.",
    uploadFailed: "Upload failed",
    badPhone: "That Sham Cash number does not look right.",
    unsaved: "Unsaved changes",
    loadFailed: "Could not load the Sham Cash settings.",
    retry: "Try again",
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
    save: "Sham-Cash-Angaben speichern",
    saved: "Gespeichert",
    needOne: "QR-Code oder Sham-Cash-Nummer angeben, damit Kunden wissen, wohin sie zahlen.",
    uploadFailed: "Upload fehlgeschlagen",
    badPhone: "Diese Sham-Cash-Nummer scheint nicht korrekt zu sein.",
    unsaved: "Nicht gespeicherte Änderungen",
    loadFailed: "Sham-Cash-Einstellungen konnten nicht geladen werden.",
    retry: "Erneut versuchen",
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
    save: "حفظ بيانات شام كاش",
    saved: "تم الحفظ",
    needOne: "أضف رمز QR أو رقم شام كاش حتى يعرف الزبون أين يدفع.",
    uploadFailed: "فشل رفع الصورة",
    badPhone: "رقم شام كاش غير صحيح.",
    unsaved: "توجد تغييرات غير محفوظة",
    loadFailed: "تعذّر تحميل إعدادات شام كاش.",
    retry: "إعادة المحاولة",
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

/** Sham Cash only settles in these currencies (server/shamcash.ts). */
const SHAMCASH_CURRENCIES = ["SYP", "USD"];

export default function ShamCashSettings() {
  const { colors } = useTheme();
  const { language, isRTL } = useLanguage();
  const c = (COPY as any)[language] ?? COPY.en;
  const { data, refetch, isLoading, isError } = useQuery<any>({
    queryKey: ["/api/payment-gateway/shamcash"],
    queryFn: getQueryFn({ on401: "throw" }),
    retry: 1,
  });

  const [enabled, setEnabled] = useState(false);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [holderName, setHolderName] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; error: boolean } | null>(null);

  useEffect(() => {
    if (!data) return;
    setEnabled(!!data.enabled);
    setQrImage(data.qrImage ?? null);
    setPhone(data.phone ?? "");
    setHolderName(data.holderName ?? "");
  }, [data]);

  // Stores in other currencies (e.g. the Swiss CHF stores) do not see Sham
  // Cash at all, unless it was already switched on — then it stays visible
  // so it can be switched off.
  const storeCurrency = String(data?.currency || getCurrency() || "").toUpperCase();
  const currencyOk = SHAMCASH_CURRENCIES.includes(storeCurrency);
  const supported = data ? !!data.currency || !!data.enabled : currencyOk;

  const dirty = !!data && (
    phone.trim() !== String(data.phone ?? "").trim() ||
    holderName.trim() !== String(data.holderName ?? "").trim()
  );

  const save = async (patch?: { enabled?: boolean; qrImage?: string | null }) => {
    const nextPhone = phone.trim();
    if (nextPhone && !isValidStorePhone(nextPhone, storeCurrency)) {
      setMsg({ text: c.badPhone, error: true });
      // The switch or QR must not look saved when nothing was sent.
      if (patch && "enabled" in patch) setEnabled(!!data?.enabled);
      if (patch && "qrImage" in patch) setQrImage(data?.qrImage ?? null);
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      await apiRequest("PUT", "/api/payment-gateway/shamcash", {
        enabled: patch?.enabled ?? enabled,
        qrImage: patch && "qrImage" in patch ? patch.qrImage : qrImage,
        phone: nextPhone,
        holderName: holderName.trim(),
      });
      await refetch();
      setMsg({ text: c.saved, error: false });
    } catch (e: any) {
      // Show what is really stored, not the position the user tapped.
      setEnabled(!!data?.enabled);
      setQrImage(data?.qrImage ?? null);
      setMsg({ text: apiErrorMessage(e), error: true });
    } finally {
      setBusy(false);
    }
  };

  const pickQr = async () => {
    let result: ImagePicker.ImagePickerResult;
    try {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images" as ImagePicker.MediaType,
        quality: 0.9,
      });
    } catch (e: any) {
      setMsg({ text: apiErrorMessage(e, c.uploadFailed), error: true });
      return;
    }
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
      setMsg({ text: apiErrorMessage(e, c.uploadFailed), error: true });
    } finally {
      setUploading(false);
    }
  };

  const align = isRTL ? ("right" as const) : ("left" as const);
  const cardStyle = [s.card, { borderColor: colors.border, backgroundColor: colors.card }];

  if (isLoading) {
    if (!currencyOk) return null;
    return (
      <View style={[cardStyle, { alignItems: "center" }]}>
        <ActivityIndicator color="#0E9F6E" />
      </View>
    );
  }
  if (isError && !data) {
    if (!currencyOk) return null;
    return (
      <View style={cardStyle}>
        <Text style={{ color: colors.danger, fontSize: 13, textAlign: align }}>{c.loadFailed}</Text>
        <Pressable onPress={() => refetch()} style={s.btn} accessibilityRole="button">
          <Text style={s.btnText}>{c.retry}</Text>
        </Pressable>
      </View>
    );
  }
  if (!supported) return null;

  const live = !!data?.live;
  // react-native-web already flips "row" under dir=rtl; only native needs it.
  const row = isRTL && Platform.OS !== "web" ? ("row-reverse" as const) : ("row" as const);
  const qrUri = shamCashImageUri(qrImage);
  const inputStyle = [s.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background, textAlign: align }];
  const locked = busy || uploading;

  return (
    <View style={cardStyle}>
      <View style={[s.header, { flexDirection: row }]}>
        <View style={[s.icon, { backgroundColor: "#0E9F6E20" }]}>
          <Ionicons name="wallet" size={24} color="#0E9F6E" />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[s.name, { color: colors.text, textAlign: align }]}>{c.title}</Text>
          <Text style={{ color: live ? colors.success : colors.textMuted, fontSize: 13, fontWeight: "600", marginTop: 3, textAlign: align }}>
            {live ? c.live : c.sub}
          </Text>
        </View>
        <Switch
          value={enabled}
          onValueChange={(v) => { setEnabled(v); save({ enabled: v }); }}
          disabled={locked}
          trackColor={{ false: colors.border, true: "#0E9F6E" }}
          accessibilityLabel={c.enabled}
        />
      </View>

      <Text style={[s.label, { color: colors.textMuted, textAlign: align }]}>{c.qr}</Text>
      <View style={[s.qrRow, { flexDirection: row, borderColor: colors.border, backgroundColor: colors.background }]}>
        {qrUri ? (
          <Image source={{ uri: qrUri }} style={s.qr} resizeMode="contain" />
        ) : (
          <View style={[s.qr, s.qrEmpty, { borderColor: colors.border }]}>
            <Ionicons name="qr-code-outline" size={40} color={colors.textMuted} />
          </View>
        )}
        <View style={{ flex: 1, minWidth: 0, gap: 8 }}>
          <Text style={{ color: colors.textMuted, fontSize: 12, textAlign: align }}>{c.qrHint}</Text>
          <View style={{ flexDirection: row, gap: 8, flexWrap: "wrap" }}>
            <Pressable
              onPress={pickQr}
              disabled={locked}
              style={[s.smallBtn, { backgroundColor: "#0E9F6E" }, locked && { opacity: 0.6 }]}
              accessibilityRole="button"
            >
              {uploading ? <ActivityIndicator color="#fff" size="small" /> : (
                <Text style={s.smallBtnText}>{qrUri ? c.change : c.upload}</Text>
              )}
            </Pressable>
            {!!qrUri && (
              <Pressable
                onPress={() => { setQrImage(null); save({ qrImage: null }); }}
                disabled={locked}
                style={[s.smallBtn, { borderWidth: 1, borderColor: colors.danger }, locked && { opacity: 0.6 }]}
                accessibilityRole="button"
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
        maxLength={40}
        style={inputStyle}
      />

      <Text style={[s.label, { color: colors.textMuted, textAlign: align }]}>{c.holder}</Text>
      <TextInput
        value={holderName}
        onChangeText={setHolderName}
        placeholder={c.holderPh}
        placeholderTextColor={colors.textMuted}
        maxLength={80}
        style={inputStyle}
      />

      {enabled && !qrImage && !phone.trim() && (
        <Text style={[s.note, { color: colors.warning, textAlign: align }]}>{c.needOne}</Text>
      )}

      <Pressable onPress={() => save()} disabled={locked} style={[s.btn, locked && { opacity: 0.6 }]} accessibilityRole="button">
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>{c.save}</Text>}
      </Pressable>
      {dirty && !busy && !msg && <Text style={[s.hint, { color: colors.warning }]}>{c.unsaved}</Text>}
      {!!msg && <Text style={[s.hint, { color: msg.error ? colors.danger : colors.success }]}>{msg.text}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 14, padding: 14, marginTop: 16, marginBottom: 8 },
  header: { alignItems: "center", gap: 14, marginBottom: 4 },
  icon: { width: 48, height: 48, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  name: { fontSize: 18, fontWeight: "700" },
  label: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 12, marginBottom: 6 },
  qrRow: { alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 12, padding: 10 },
  qr: { width: 110, height: 110, borderRadius: 8, backgroundColor: "#fff" },
  qrEmpty: { borderWidth: 1, borderStyle: "dashed", justifyContent: "center", alignItems: "center", backgroundColor: "transparent" },
  smallBtn: { borderRadius: 10, paddingHorizontal: 14, minHeight: 44, minWidth: 88, alignItems: "center", justifyContent: "center" },
  smallBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, minHeight: 44, fontSize: 14 },
  hint: { fontSize: 12, marginTop: 8, textAlign: "center" },
  note: { fontSize: 12, marginTop: 8 },
  btn: { marginTop: 14, backgroundColor: "#0E9F6E", borderRadius: 12, minHeight: 48, justifyContent: "center", alignItems: "center", paddingHorizontal: 12 },
  btnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
});
