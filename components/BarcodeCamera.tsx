import React, { useEffect, useRef } from "react";
import { StyleSheet, Text, View, Pressable, Linking } from "react-native";
import { CameraView, useCameraPermissions, type BarcodeType } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { useLanguage } from "@/lib/language-context";
import { themedStyles } from "@/lib/themed-styles";

/**
 * Native (Android / iOS) camera for BarcodeScannerModal: expo-camera's CameraView
 * with its built-in ML Kit / AVFoundation barcode scanning.
 * The web build resolves BarcodeCamera.web.tsx instead.
 */
export interface BarcodeCameraProps {
  /** Frames are only reported while true (e.g. paused while a scan is processed). */
  active: boolean;
  onDetected: (code: string) => void;
}

export const BARCODE_TYPES: BarcodeType[] = [
  "ean13", "ean8", "upc_a", "upc_e", "code128", "code39", "code93", "itf14", "codabar", "qr", "datamatrix",
];

export default function BarcodeCamera({ active, onDetected }: BarcodeCameraProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const { language } = useLanguage();
  const L = (ar: string, de: string, en: string) => (language === "ar" ? ar : language === "de" ? de : en);
  const asked = useRef(false);

  // Ask once, straight away — the cashier just tapped "scan".
  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain && !asked.current) {
      asked.current = true;
      requestPermission();
    }
  }, [permission, requestPermission]);

  if (!permission) {
    return (
      <View style={styles.center}>
        <Text style={styles.msg}>{L("جارٍ تشغيل الكاميرا…", "Kamera wird gestartet…", "Starting camera…")}</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Ionicons name="camera-outline" size={56} color="#FFFFFF" />
        <Text style={styles.title}>{L("مطلوب إذن الكاميرا", "Kamerazugriff erforderlich", "Camera access required")}</Text>
        <Text style={styles.msg}>
          {L("اسمح للتطبيق باستخدام الكاميرا لمسح الباركود.", "Erlaube der App den Kamerazugriff, um Barcodes zu scannen.", "Allow camera access to scan barcodes.")}
        </Text>
        {permission.canAskAgain ? (
          <Pressable style={styles.btn} onPress={requestPermission}>
            <Text style={styles.btnText}>{L("السماح بالكاميرا", "Kamera erlauben", "Allow camera")}</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.btn} onPress={() => Linking.openSettings().catch(() => {})}>
            <Text style={styles.btnText}>{L("فتح الإعدادات", "Einstellungen öffnen", "Open settings")}</Text>
          </Pressable>
        )}
      </View>
    );
  }

  return (
    <CameraView
      style={StyleSheet.absoluteFill}
      facing="back"
      barcodeScannerSettings={{ barcodeTypes: BARCODE_TYPES }}
      onBarcodeScanned={active ? ({ data }) => { if (data) onDetected(String(data)); } : undefined}
    />
  );
}

const styles = themedStyles((Colors) => ({
  center: { ...StyleSheet.absoluteFillObject, justifyContent: "center", alignItems: "center", padding: 32, gap: 12 },
  title: { color: "#FFFFFF", fontSize: 18, fontWeight: "700", textAlign: "center" },
  msg: { color: "rgba(255,255,255,0.8)", fontSize: 14, textAlign: "center" },
  btn: { backgroundColor: Colors.accent, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 8 },
  btnText: { color: Colors.textDark, fontSize: 15, fontWeight: "700" },
}));
