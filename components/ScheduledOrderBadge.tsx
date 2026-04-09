import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colors } from "@/constants/colors";

interface Props {
  scheduledAt: string | Date;
  isRtl?: boolean;
}

export default function ScheduledOrderBadge({ scheduledAt, isRtl = false }: Props) {
  const date = new Date(scheduledAt);
  const formatted = date.toLocaleString(isRtl ? "ar-EG" : "en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <View style={styles.badge}>
      <Text style={styles.icon}>📅</Text>
      <Text style={styles.text}>
        {isRtl ? `مجدول: ${formatted}` : `Scheduled: ${formatted}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(245,158,11,0.15)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
  icon: { fontSize: 12 },
  text: {
    fontSize: 11,
    color: Colors.statusPending,
    fontWeight: "600",
  },
});
