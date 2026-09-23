import React, { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View, Pressable, Modal, Platform, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BarcodeCamera from "@/components/BarcodeCamera";
import { Colors } from "@/constants/colors";
import { useLanguage } from "@/lib/language-context";
import { themedStyles } from "@/lib/themed-styles";
import { normalizeBarcode } from "@/lib/barcode";

/**
 * One barcode scanner for the whole app — the till and the product form.
 *
 * Camera: expo-camera on Android/iOS, BarcodeDetector / zxing in the browser
 * (see BarcodeCamera.tsx / BarcodeCamera.web.tsx). A text field underneath takes
 * typed codes and codes from a USB/Bluetooth scanner (they type + Enter).
 *
 * onScanned may return feedback, which is shown as a banner inside the scanner:
 * in `continuous` mode (the till) the scanner stays open so a whole basket can
 * be scanned in a row; the same code is ignored for a short window so one
 * product held in front of the camera is not added again and again.
 */
export interface ScanFeedback {
  ok: boolean;
  message: string;
  action?: { label: string; onPress: () => void };
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onScanned: (code: string) => ScanFeedback | void | Promise<ScanFeedback | void>;
  /** Keep scanning after a successful read (till). Default: false. */
  continuous?: boolean;
  title?: string;
}

const SAME_CODE_WINDOW_MS = 1800;

export default function BarcodeScannerModal({ visible, onClose, onScanned, continuous = false, title }: Props) {
  const insets = useSafeAreaInsets();
  const { language, isRTL } = useLanguage();
  const L = (ar: string, de: string, en: string) => (language === "ar" ? ar : language === "de" ? de : en);
  const [feedback, setFeedback] = useState<(ScanFeedback & { at: number }) | null>(null);
  const [manual, setManual] = useState("");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const lastRef = useRef<{ code: string; at: number }>({ code: "", at: 0 });
  const onScannedRef = useRef(onScanned);
  onScannedRef.current = onScanned;

  // Fresh state every time the scanner opens.
  useEffect(() => {
    if (visible) {
      setFeedback(null);
      setManual("");
      lastRef.current = { code: "", at: 0 };
      busyRef.current = false;
      setBusy(false);
    }
  }, [visible]);

  // Banners fade out on their own; ones with an action stay a little longer.
  useEffect(() => {
    if (!feedback) return;
    const t = setTimeout(() => setFeedback((f) => (f && f.at === feedback.at ? null : f)), feedback.action ? 7000 : 3000);
    return () => clearTimeout(t);
  }, [feedback]);

  const handleCode = useCallback(async (raw: string, fromCamera: boolean) => {
    const code = normalizeBarcode(raw);
    if (!code || busyRef.current) return;
    const now = Date.now();
    if (fromCamera && code === lastRef.current.code && now - lastRef.current.at < SAME_CODE_WINDOW_MS) {
      // Still looking at the same product: extend the window instead of re-adding it.
      lastRef.current.at = now;
      return;
    }
    lastRef.current = { code, at: now };
    busyRef.current = true;
    setBusy(true);
    try {
      const res = await onScannedRef.current(code);
      if (res) setFeedback({ ...res, at: Date.now() });
    } catch (e: any) {
      setFeedback({ ok: false, message: e?.message || (language === "ar" ? "حدث خطأ" : language === "de" ? "Fehler" : "Something went wrong"), at: Date.now() });
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [language]);

  const submitManual = () => {
    const code = manual;
    setManual("");
    handleCode(code, false);
  };

  // Desktop browsers: focus the text field so a USB scanner "types" into it.
  const autoFocusInput = Platform.OS === "web" && typeof window !== "undefined"
    && !!window.matchMedia && window.matchMedia("(pointer: fine)").matches;

  return (
    <Modal visible={visible} animationType={Platform.OS === "web" ? "fade" : "slide"} transparent={false} onRequestClose={onClose}>
      <View style={[styles.root, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={[styles.header, isRTL && { flexDirection: "row-reverse" }]}>
          <Ionicons name="barcode-outline" size={24} color="#FFFFFF" />
          <Text style={[styles.headerTitle, { textAlign: isRTL ? "right" : "left" }]} numberOfLines={1}>
            {title || L("مسح الباركود", "Barcode scannen", "Scan barcode")}
          </Text>
          <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={10} accessibilityLabel={L("إغلاق", "Schließen", "Close")}>
            <Ionicons name="close" size={26} color="#FFFFFF" />
          </Pressable>
        </View>

        <View style={styles.cameraBox}>
          {visible ? <BarcodeCamera active={visible && !busy} onDetected={(c) => handleCode(c, true)} /> : null}
          <View style={styles.frameWrap} pointerEvents="none">
            <View style={styles.frame}>
              <View style={[styles.corner, styles.cTL]} />
              <View style={[styles.corner, styles.cTR]} />
              <View style={[styles.corner, styles.cBL]} />
              <View style={[styles.corner, styles.cBR]} />
              <View style={styles.laser} />
            </View>
            <Text style={styles.hint}>
              {L("وجّه الكاميرا نحو الباركود", "Kamera auf den Barcode richten", "Point the camera at the barcode")}
            </Text>
          </View>
        </View>

        <View style={styles.bottom}>
          {feedback ? (
            <View style={[styles.banner, feedback.ok ? styles.bannerOk : styles.bannerErr, isRTL && { flexDirection: "row-reverse" }]}>
              <Ionicons name={feedback.ok ? "checkmark-circle" : "alert-circle"} size={22} color="#FFFFFF" />
              <Text style={[styles.bannerText, { textAlign: isRTL ? "right" : "left" }]}>{feedback.message}</Text>
              {feedback.action ? (
                <Pressable style={styles.bannerAction} onPress={feedback.action.onPress}>
                  <Text style={styles.bannerActionText}>{feedback.action.label}</Text>
                </Pressable>
              ) : null}
            </View>
          ) : continuous ? (
            <Text style={[styles.note, { textAlign: "center" }]}>
              {L("مسح متواصل: امسح المنتجات واحدًا تلو الآخر ثم اضغط «تم».",
                "Dauer-Scan: Artikel nacheinander scannen, dann auf „Fertig“ tippen.",
                "Continuous scan: scan items one after another, then tap Done.")}
            </Text>
          ) : null}

          <View style={[styles.inputRow, isRTL && { flexDirection: "row-reverse" }]}>
            <TextInput
              style={[styles.input, { textAlign: isRTL ? "right" : "left" }]}
              value={manual}
              onChangeText={setManual}
              onSubmitEditing={submitManual}
              placeholder={L("أو اكتب الباركود واضغط Enter", "Oder Barcode eingeben + Enter", "Or type the barcode + Enter")}
              placeholderTextColor="rgba(255,255,255,0.5)"
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus={autoFocusInput}
              blurOnSubmit={false}
              returnKeyType="done"
            />
            <Pressable style={[styles.okBtn, !manual.trim() && { opacity: 0.5 }]} onPress={submitManual} disabled={!manual.trim()}>
              <Ionicons name="return-down-back" size={20} color={Colors.textDark} />
            </Pressable>
          </View>

          {continuous ? (
            <Pressable style={styles.doneBtn} onPress={onClose}>
              <Text style={styles.doneBtnText}>{L("تم", "Fertig", "Done")}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = themedStyles((Colors) => ({
  root: { flex: 1, backgroundColor: "#000000" },
  header: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { flex: 1, color: "#FFFFFF", fontSize: 18, fontWeight: "700" },
  closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.15)", justifyContent: "center", alignItems: "center" },
  cameraBox: { flex: 1, overflow: "hidden", backgroundColor: "#000000", width: "100%", maxWidth: 900, alignSelf: "center" },
  frameWrap: { ...StyleSheet.absoluteFillObject, justifyContent: "center", alignItems: "center", gap: 16 },
  frame: { width: "80%", maxWidth: 420, height: 180, position: "relative", justifyContent: "center" },
  corner: { position: "absolute", width: 34, height: 34, borderColor: Colors.accent },
  cTL: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 10 },
  cTR: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 10 },
  cBL: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 10 },
  cBR: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 10 },
  laser: { height: 2, marginHorizontal: 12, backgroundColor: "rgba(239,68,68,0.85)" },
  hint: { color: "#FFFFFF", fontSize: 15, fontWeight: "600", backgroundColor: "rgba(0,0,0,0.45)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, overflow: "hidden" },
  bottom: { paddingHorizontal: 16, paddingTop: 12, gap: 10, width: "100%", maxWidth: 720, alignSelf: "center" },
  banner: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12 },
  bannerOk: { backgroundColor: "#047857" },
  bannerErr: { backgroundColor: "#B91C1C" },
  bannerText: { flex: 1, color: "#FFFFFF", fontSize: 15, fontWeight: "600" },
  bannerAction: { backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  bannerActionText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  note: { color: "rgba(255,255,255,0.75)", fontSize: 13 },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  input: { flex: 1, height: 48, borderRadius: 12, paddingHorizontal: 14, backgroundColor: "rgba(255,255,255,0.12)", color: "#FFFFFF", fontSize: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
  okBtn: { width: 48, height: 48, borderRadius: 12, backgroundColor: Colors.accent, justifyContent: "center", alignItems: "center" },
  doneBtn: { height: 50, borderRadius: 14, backgroundColor: Colors.accent, justifyContent: "center", alignItems: "center" },
  doneBtnText: { color: Colors.textDark, fontSize: 17, fontWeight: "800" },
}));
