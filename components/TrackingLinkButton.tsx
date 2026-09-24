import React, { useEffect, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity, Text, Share, Platform } from "react-native";
import * as Clipboard from "expo-clipboard";
import { Colors } from "@/constants/colors";
import { themedStyles } from "@/lib/themed-styles";
import { useLanguage } from "@/lib/language-context";

interface Props {
  trackingToken: string;
  baseUrl?: string;
  label?: string;
}

/**
 * Public origin that serves /track/<token>. On the production web app that is
 * the page's own origin; local dev and native builds fall back to the public
 * site, since a localhost link is useless to a customer.
 */
function publicOrigin(): string {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host && host !== "localhost" && host !== "127.0.0.1" && !host.endsWith(".replit.dev")) {
      return window.location.origin;
    }
  }
  return "https://kassenta.com";
}

export default function TrackingLinkButton({ trackingToken, baseUrl, label }: Props) {
  const { language } = useLanguage();
  const tr = (en: string, de: string, ar: string) => (language === "ar" ? ar : language === "de" ? de : en);
  const url = `${(baseUrl || publicOrigin()).replace(/\/$/, "")}/track/${trackingToken}`;
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const flashCopied = () => {
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2000);
  };

  const handlePress = async () => {
    if (Platform.OS === "web") {
      try {
        await Clipboard.setStringAsync(url);
        flashCopied();
      } catch {
        // Clipboard blocked (insecure context / permissions): let the user copy by hand.
        try { window.prompt(tr("Copy the tracking link:", "Tracking-Link kopieren:", "انسخ رابط التتبع:"), url); } catch { }
      }
      return;
    }
    try {
      await Share.share({ message: url, url });
    } catch {
      try { await Clipboard.setStringAsync(url); flashCopied(); } catch { }
    }
  };

  return (
    <TouchableOpacity style={styles.btn} onPress={handlePress} accessibilityRole="button">
      <Ionicons name={copied ? "checkmark" : "link-outline"} size={14} color={Colors.accent} />
      <Text style={styles.label}>
        {copied ? tr("Link copied", "Link kopiert", "تم نسخ الرابط") : (label || tr("Share tracking link", "Tracking-Link teilen", "مشاركة رابط التتبع"))}
      </Text>
    </TouchableOpacity>
  );
}

const styles = themedStyles((Colors) => ({
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.accent + "1F",
    borderRadius: 8,
    paddingHorizontal: 12,
    minHeight: 36,
    alignSelf: "flex-start",
  },
  label: { fontSize: 13, color: Colors.accent, fontWeight: "600" },
}));
