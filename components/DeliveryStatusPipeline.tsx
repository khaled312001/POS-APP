import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, StyleSheet } from "react-native";
import { Colors } from "@/constants/colors";
import { themedStyles } from "@/lib/themed-styles";
import { useLanguage } from "@/lib/language-context";

const STEPS = [
  { key: "pending",   label: "Received",  labelAr: "استلام",     labelDe: "Eingegangen" },
  { key: "accepted",  label: "Accepted",  labelAr: "مقبول",      labelDe: "Angenommen" },
  { key: "preparing", label: "Preparing", labelAr: "تحضير",      labelDe: "Zubereitung" },
  { key: "ready",     label: "Ready",     labelAr: "جاهز",       labelDe: "Fertig" },
  { key: "on_way",    label: "On Way",    labelAr: "في الطريق",  labelDe: "Unterwegs" },
  { key: "delivered", label: "Delivered", labelAr: "تم التسليم", labelDe: "Geliefert" },
];

// Read per render: `Colors` is a live view onto the active theme, so a
// module-scope copy would keep the palette that was active at import time.
const statusColors = (): Record<string, string> => ({
  pending:   Colors.statusPending,
  accepted:  Colors.statusAccepted,
  preparing: Colors.statusPreparing,
  ready:     Colors.statusReady,
  on_way:    Colors.statusOnWay,
  delivered: Colors.statusDelivered,
  cancelled: Colors.statusCancelled,
});

interface Props {
  currentStatus: string;
  isRtl?: boolean;
  timestamps?: Record<string, string | null>;
}

export default function DeliveryStatusPipeline({ currentStatus, isRtl = false, timestamps }: Props) {
  const { language } = useLanguage();
  const currentIdx = STEPS.findIndex(s => s.key === currentStatus);
  const STATUS_COLORS = statusColors();

  return (
    <View style={styles.container}>
      {STEPS.map((step, i) => {
        const isDone = i < currentIdx;
        const isActive = i === currentIdx;
        const dotColor = isDone
          ? Colors.statusDelivered
          : isActive
          ? STATUS_COLORS[step.key] || Colors.deliveryPrimary
          : Colors.inputBorder;

        return (
          <React.Fragment key={step.key}>
            {i > 0 && (
              <View style={[styles.connector, isDone && styles.connectorDone]} />
            )}
            <View style={styles.stepContainer}>
              <View style={[styles.dot, { backgroundColor: dotColor, borderColor: dotColor }]}>
                {isDone && <Ionicons name="checkmark" size={11} color={Colors.white} style={styles.checkmark} />}
                {isActive && <View style={styles.activeDot} />}
              </View>
              <Text style={[
                styles.label,
                isActive && styles.labelActive,
                isDone && styles.labelDone,
              ]}>
                {isRtl || language === "ar" ? step.labelAr : language === "de" ? step.labelDe : step.label}
              </Text>
              {timestamps?.[step.key] && (
                <Text style={styles.timestamp}>
                  {new Date(timestamps[step.key]!).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </Text>
              )}
            </View>
          </React.Fragment>
        );
      })}
    </View>
  );
}

const styles = themedStyles((Colors) => ({
  container: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  stepContainer: {
    alignItems: "center",
    flex: 1,
    gap: 4,
  },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  activeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#fff",
  },
  checkmark: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  connector: {
    flex: 1,
    height: 2,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginTop: 13,
    alignSelf: "flex-start",
  },
  connectorDone: {
    backgroundColor: Colors.statusDelivered,
  },
  label: {
    fontSize: 10,
    textAlign: "center",
    color: "rgba(255,255,255,0.4)",
    lineHeight: 13,
  },
  labelActive: {
    color: "#fff",
    fontWeight: "700",
  },
  labelDone: {
    color: "rgba(255,255,255,0.7)",
  },
  timestamp: {
    fontSize: 9,
    color: "rgba(255,255,255,0.35)",
  },
}));
