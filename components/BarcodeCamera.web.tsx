import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";
import { useLanguage } from "@/lib/language-context";
import { themedStyles } from "@/lib/themed-styles";
import type { BarcodeCameraProps } from "./BarcodeCamera";

/**
 * Web camera for BarcodeScannerModal (kassenta.com/app in any browser).
 *
 * expo-camera's web build only reads QR codes (and fetches jsQR from a CDN),
 * so product barcodes are decoded here instead:
 *   - the native BarcodeDetector API when the browser has it with EAN support
 *     (Chrome on Android / ChromeOS / macOS) — fast, off the JS thread;
 *   - otherwise @zxing/browser, a pure-JS decoder that works in Firefox and
 *     Safari (iPhone / iPad) as well.
 * getUserMedia needs a secure context — https://kassenta.com is one.
 */

type CamError = "insecure" | "denied" | "nocamera" | "busy" | "other";

const DETECTOR_FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "code_93", "itf", "codabar", "qr_code", "data_matrix"];

const ZXING_FORMATS = [
  BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E,
  BarcodeFormat.CODE_128, BarcodeFormat.CODE_39, BarcodeFormat.CODE_93, BarcodeFormat.ITF,
  BarcodeFormat.CODABAR, BarcodeFormat.QR_CODE, BarcodeFormat.DATA_MATRIX,
];

async function makeNativeDetector(): Promise<any | null> {
  const BD = (globalThis as any).BarcodeDetector;
  if (!BD) return null;
  try {
    const supported: string[] = typeof BD.getSupportedFormats === "function" ? await BD.getSupportedFormats() : [];
    const formats = DETECTOR_FORMATS.filter((f) => supported.includes(f));
    // Some desktop builds expose the API but only decode QR — fall back to zxing there.
    if (!formats.includes("ean_13")) return null;
    return new BD({ formats });
  } catch {
    return null;
  }
}

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((t) => { try { t.stop(); } catch {} });
}

export default function BarcodeCamera({ active, onDetected }: BarcodeCameraProps) {
  const { language } = useLanguage();
  const L = (ar: string, de: string, en: string) => (language === "ar" ? ar : language === "de" ? de : en);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const activeRef = useRef(active);
  activeRef.current = active;
  const onDetectedRef = useRef(onDetected);
  onDetectedRef.current = onDetected;
  const [error, setError] = useState<CamError | null>(null);
  const [starting, setStarting] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let stream: MediaStream | null = null;
    let controls: { stop: () => void } | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const videoEl = videoRef.current;

    const emit = (text: string | null | undefined) => {
      if (!cancelled && text && activeRef.current) onDetectedRef.current(String(text));
    };

    (async () => {
      setError(null);
      setStarting(true);
      const md = typeof navigator !== "undefined" ? navigator.mediaDevices : undefined;
      if (typeof window !== "undefined" && (!window.isSecureContext || !md?.getUserMedia)) {
        setError("insecure");
        setStarting(false);
        return;
      }
      try {
        stream = await md!.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        });
      } catch (e: any) {
        const name = e?.name || "";
        if (!cancelled) {
          setError(
            name === "NotAllowedError" || name === "SecurityError" || name === "PermissionDeniedError" ? "denied"
              : name === "NotFoundError" || name === "OverconstrainedError" || name === "DevicesNotFoundError" ? "nocamera"
                : name === "NotReadableError" || name === "TrackStartError" ? "busy"
                  : "other",
          );
          setStarting(false);
        }
        return;
      }
      if (cancelled) { stopStream(stream); return; }

      // Continuous autofocus where supported (most phone cameras); ignored elsewhere.
      try {
        const track = stream.getVideoTracks()[0];
        await track?.applyConstraints({ advanced: [{ focusMode: "continuous" } as any] });
      } catch {}

      const video = videoEl;
      if (!video) { stopStream(stream); return; }

      try {
        const detector = await makeNativeDetector();
        if (cancelled) { stopStream(stream); return; }
        if (detector) {
          video.srcObject = stream;
          video.muted = true;
          video.setAttribute("playsinline", "true");
          await video.play().catch(() => {});
          const tick = async () => {
            if (cancelled) return;
            if (activeRef.current && video.readyState >= 2) {
              try {
                const found = await detector.detect(video);
                if (found?.length) emit(found[0].rawValue);
              } catch {}
            }
            if (!cancelled) timer = setTimeout(tick, 120);
          };
          tick();
        } else {
          const hints = new Map<DecodeHintType, any>();
          hints.set(DecodeHintType.POSSIBLE_FORMATS, ZXING_FORMATS);
          hints.set(DecodeHintType.TRY_HARDER, true);
          const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 120, delayBetweenScanSuccess: 300 });
          const c = await reader.decodeFromStream(stream, video, (result) => {
            if (result) emit(result.getText());
          });
          if (cancelled) { c.stop(); stopStream(stream); return; }
          controls = c;
        }
        if (!cancelled) setStarting(false);
      } catch {
        stopStream(stream);
        if (!cancelled) { setError("other"); setStarting(false); }
      }
    })();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      try { controls?.stop(); } catch {}
      stopStream(stream);
      if (videoEl) { try { videoEl.pause(); videoEl.srcObject = null; } catch {} }
    };
  }, [attempt]);

  const errorText: Record<CamError, string> = {
    insecure: L(
      "الكاميرا تعمل فقط عبر اتصال آمن (https). استخدم قارئ باركود أو اكتب الرمز يدويًا.",
      "Die Kamera funktioniert nur über eine sichere Verbindung (https). Nutze einen Barcode-Scanner oder tippe den Code ein.",
      "The camera only works over a secure connection (https). Use a barcode scanner or type the code.",
    ),
    denied: L(
      "تم رفض إذن الكاميرا. اسمح بالكاميرا من إعدادات المتصفح (رمز القفل بجانب العنوان) ثم أعد المحاولة.",
      "Kamerazugriff wurde verweigert. Erlaube die Kamera in den Browser-Einstellungen (Schloss-Symbol neben der Adresse) und versuche es erneut.",
      "Camera permission was denied. Allow the camera in your browser settings (lock icon next to the address) and try again.",
    ),
    nocamera: L(
      "لم يتم العثور على كاميرا في هذا الجهاز. استخدم قارئ باركود USB أو اكتب الرمز.",
      "Keine Kamera gefunden. Nutze einen USB-Barcode-Scanner oder tippe den Code ein.",
      "No camera found on this device. Use a USB barcode scanner or type the code.",
    ),
    busy: L(
      "الكاميرا مستخدمة من تطبيق آخر. أغلقه ثم أعد المحاولة.",
      "Die Kamera wird von einer anderen App verwendet. Schließe sie und versuche es erneut.",
      "The camera is in use by another app. Close it and try again.",
    ),
    other: L(
      "تعذّر تشغيل الكاميرا. أعد المحاولة أو اكتب الرمز يدويًا.",
      "Kamera konnte nicht gestartet werden. Versuche es erneut oder tippe den Code ein.",
      "Could not start the camera. Try again or type the code.",
    ),
  };

  return (
    <View style={StyleSheet.absoluteFill}>
      {React.createElement("video", {
        ref: videoRef,
        autoPlay: true,
        muted: true,
        playsInline: true,
        style: { width: "100%", height: "100%", objectFit: "cover", backgroundColor: "#000", display: error ? "none" : "block" },
      })}
      {starting && !error ? (
        <View style={styles.center} pointerEvents="none">
          <Text style={styles.msg}>{L("جارٍ تشغيل الكاميرا…", "Kamera wird gestartet…", "Starting camera…")}</Text>
        </View>
      ) : null}
      {error ? (
        <View style={styles.center}>
          <Ionicons name={error === "nocamera" ? "videocam-off-outline" : "camera-outline"} size={52} color="#FFFFFF" />
          <Text style={styles.msg}>{errorText[error]}</Text>
          {error !== "insecure" ? (
            <Pressable style={styles.btn} onPress={() => setAttempt((n) => n + 1)}>
              <Text style={styles.btnText}>{L("إعادة المحاولة", "Erneut versuchen", "Try again")}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = themedStyles((Colors) => ({
  center: { ...StyleSheet.absoluteFillObject, justifyContent: "center", alignItems: "center", padding: 32, gap: 14 },
  msg: { color: "rgba(255,255,255,0.9)", fontSize: 15, textAlign: "center", maxWidth: 420, lineHeight: 22 },
  btn: { backgroundColor: Colors.accent, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 4 },
  btnText: { color: Colors.textDark, fontSize: 15, fontWeight: "700" },
}));
