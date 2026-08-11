import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity, Text, StyleSheet, Share, Platform } from "react-native";
import * as Clipboard from "expo-clipboard";
import { Colors } from "@/constants/colors";
import { themedStyles } from "@/lib/themed-styles";

interface Props {
  trackingToken: string;
  baseUrl?: string;
  label?: string;
}

export default function TrackingLinkButton({ trackingToken, baseUrl, label }: Props) {
  const url = `${baseUrl || "https://kassenta.com"}/track/${trackingToken}`;

  const handlePress = async () => {
    if (Platform.OS === "web") {
      try {
        await navigator.clipboard.writeText(url);
      } catch (_) { }
      return;
    }
    try {
      await Share.share({ message: url, url });
    } catch (_) {
      await Clipboard.setStringAsync(url);
    }
  };

  return (
    <TouchableOpacity style={styles.btn} onPress={handlePress}>
      <Ionicons name="link-outline" size={14} color={Colors.accent} />
      <Text style={styles.label}>{label || "Share Tracking Link"}</Text>
    </TouchableOpacity>
  );
}

const styles = themedStyles((Colors) => ({
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(47,211,198,0.12)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: "flex-start",
  },
  icon: { fontSize: 14 },
  label: { fontSize: 13, color: Colors.accent, fontWeight: "600" },
}));
