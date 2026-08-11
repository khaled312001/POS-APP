import React, { useState } from "react";
import { StyleSheet, Text, View, Pressable, Modal, Platform } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { themedStyles } from "@/lib/themed-styles";

interface BarcodeScannerProps {
  visible: boolean;
  onScanned: (barcode: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ visible, onScanned, onClose }: BarcodeScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    onScanned(data);
    setTimeout(() => setScanned(false), 2000);
  };

  const renderContent = () => {
    if (Platform.OS === "web") {
      return (
        <View style={styles.webFallback}>
          <Ionicons name="barcode-outline" size={64} color={Colors.textMuted} />
          <Text style={styles.webFallbackTitle}>Camera Not Available</Text>
          <Text style={styles.webFallbackText}>Barcode scanning via camera is available on mobile devices through the Expo Go app.</Text>
          <Text style={styles.webFallbackText}>Please type the barcode manually.</Text>
          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>Close</Text>
          </Pressable>
        </View>
      );
    }

    if (!permission) {
      return (
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>Loading camera...</Text>
        </View>
      );
    }

    if (!permission.granted) {
      return (
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={64} color={Colors.accent} />
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionText}>Allow camera access to scan barcodes</Text>
          <Pressable style={styles.permissionBtn} onPress={requestPermission}>
            <Text style={styles.permissionBtnText}>Grant Permission</Text>
          </Pressable>
          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>Cancel</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "code128", "code39", "code93", "itf14", "codabar", "qr"] }}
          onBarcodeScanned={handleBarcodeScanned}
        />
        <View style={styles.overlay}>
          <View style={styles.overlayTop} />
          <View style={styles.overlayMiddle}>
            <View style={styles.overlaySide} />
            <View style={styles.scanArea}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
            </View>
            <View style={styles.overlaySide} />
          </View>
          <View style={styles.overlayBottom}>
            <Text style={styles.scanText}>{scanned ? "Barcode detected!" : "Point camera at barcode"}</Text>
          </View>
        </View>
        <Pressable style={styles.closeBtnFloat} onPress={onClose}>
          <Ionicons name="close-circle" size={40} color={Colors.white} />
        </Pressable>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        {renderContent()}
      </View>
    </Modal>
  );
}

const styles = themedStyles((Colors) => ({
  container: { flex: 1, backgroundColor: Colors.background },
  cameraContainer: { flex: 1 },
  camera: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject },
  overlayTop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)" },
  overlayMiddle: { flexDirection: "row", height: 250 },
  overlaySide: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)" },
  scanArea: { width: 250, height: 250, position: "relative" },
  overlayBottom: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", paddingTop: 30 },
  scanText: { color: Colors.white, fontSize: 16, fontWeight: "600" },
  corner: { position: "absolute", width: 30, height: 30, borderColor: Colors.accent },
  cornerTL: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 },
  closeBtnFloat: { position: "absolute", top: 50, right: 20, zIndex: 10 },
  permissionContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40, gap: 16 },
  permissionTitle: { color: Colors.text, fontSize: 20, fontWeight: "700", textAlign: "center" },
  permissionText: { color: Colors.textMuted, fontSize: 14, textAlign: "center" },
  permissionBtn: { backgroundColor: Colors.accent, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14, marginTop: 8 },
  permissionBtnText: { color: Colors.textDark, fontSize: 16, fontWeight: "700" },
  closeBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, backgroundColor: Colors.surfaceLight, marginTop: 8 },
  closeBtnText: { color: Colors.textSecondary, fontSize: 14, fontWeight: "600" },
  webFallback: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40, gap: 12 },
  webFallbackTitle: { color: Colors.text, fontSize: 20, fontWeight: "700" },
  webFallbackText: { color: Colors.textMuted, fontSize: 14, textAlign: "center" },
}));
