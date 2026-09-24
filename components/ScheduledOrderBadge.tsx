import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { View, Text } from "react-native";
import { Colors } from "@/constants/colors";
import { themedStyles } from "@/lib/themed-styles";
import { useLanguage } from "@/lib/language-context";
import { formatInStoreTz } from "@/components/store-locale";

interface Props {
  scheduledAt: string | Date;
  /** Kept for compatibility; the language now comes from the app setting. */
  isRtl?: boolean;
}

export default function ScheduledOrderBadge({ scheduledAt }: Props) {
  const { language } = useLanguage();
  // Store time zone (Asia/Damascus for SYP stores, Europe/Zurich otherwise),
  // not the device's — a scheduled order is due at the store's local time.
  const locale = language === "ar" ? "ar-u-nu-latn" : language === "de" ? "de-CH" : "en-GB";
  const formatted = formatInStoreTz(scheduledAt, locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  if (!formatted) return null;
  const prefix = language === "ar" ? "مجدول:" : language === "de" ? "Geplant:" : "Scheduled:";

  return (
    <View style={styles.badge}>
      <Ionicons name="calendar-outline" size={12} color={Colors.warning} />
      <Text style={styles.text}>{`${prefix} ${formatted}`}</Text>
    </View>
  );
}

const styles = themedStyles((Colors) => ({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.warning + "26",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
  text: {
    fontSize: 11,
    color: Colors.warning,
    fontWeight: "600",
  },
}));
