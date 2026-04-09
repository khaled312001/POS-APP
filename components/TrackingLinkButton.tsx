import React from "react";
import { TouchableOpacity, Text, StyleSheet, Share, Platform } from "react-native";
import * as Clipboard from "expo-clipboard";
import { Colors } from "@/constants/colors";

interface Props {
  trackingToken: string;
  baseUrl?: string;
  label?: string;
}

export default function TrackingLinkButton({ trackingToken, baseUrl, label }: Props) {
  const url = `${baseUrl || "https://pos.barmagly.tech"}/track/${trackingToken}`;

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
      <Text style={styles.icon}>🔗</Text>
      <Text style={styles.label}>{label || "Share Tracking Link"}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
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
});
