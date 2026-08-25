import React, { useState } from "react";
import { View, Text, Pressable, Platform, Linking, StyleSheet } from "react-native";
import Svg, { Path, Defs, LinearGradient, Stop } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { useLanguage } from "@/lib/language-context";
import { useTheme } from "@/lib/theme-context";

/**
 * Slim, dismissible promo shown only on the web build of the POS app, inviting
 * the user to install the native Android app on a phone or tablet. It never
 * renders inside the native app (where it would be redundant) or once dismissed.
 */
const POS_PLAY_URL =
  "https://play.google.com/store/apps/details?id=tech.barmagly.pos";
const STORAGE_KEY = "kassenta_pos_download_banner_dismissed";

const COPY: Record<string, { title: string; sub: string }> = {
  en: { title: "Get the Kassenta POS app", sub: "Run your till on any phone or tablet." },
  de: { title: "Hol dir die Kassenta POS App", sub: "Deine Kasse auf jedem Handy oder Tablet." },
  ar: { title: "حمّل تطبيق Kassenta POS", sub: "شغّل الكاشير على أي هاتف أو جهاز لوحي." },
};

function GooglePlayMark() {
  return (
    <Svg width={18} height={20} viewBox="0 0 24 24">
      <Defs>
        <LinearGradient id="gpm" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#00C6FF" />
          <Stop offset="0.35" stopColor="#00E676" />
          <Stop offset="0.7" stopColor="#FFCE00" />
          <Stop offset="1" stopColor="#FF3D3D" />
        </LinearGradient>
      </Defs>
      <Path d="M4 3.2v17.6c0 .5.5.8.9.6l14.2-8.8c.4-.3.4-.9 0-1.2L4.9 2.6c-.4-.2-.9.1-.9.6z" fill="url(#gpm)" />
    </Svg>
  );
}

export default function AppDownloadBanner() {
  const { language, isRTL } = useLanguage();
  const { colors } = useTheme();
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      return (
        typeof window !== "undefined" &&
        window.localStorage?.getItem(STORAGE_KEY) === "1"
      );
    } catch {
      return false;
    }
  });

  // Hooks are all called above; only now is it safe to bail out.
  if (Platform.OS !== "web" || dismissed) return null;

  const c = COPY[language] ?? COPY.en;
  const close = () => {
    try {
      window.localStorage?.setItem(STORAGE_KEY, "1");
    } catch {
      /* private mode — dismiss for this session only */
    }
    setDismissed(true);
  };
  const open = () => {
    Linking.openURL(POS_PLAY_URL).catch(() => {});
  };

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: colors.card,
          borderBottomColor: colors.border,
          flexDirection: isRTL ? "row-reverse" : "row",
        },
      ]}
    >
      <View
        style={[
          styles.copy,
          { flexDirection: isRTL ? "row-reverse" : "row" },
        ]}
      >
        <Text
          numberOfLines={1}
          style={[styles.title, { color: colors.text, textAlign: isRTL ? "right" : "left" }]}
        >
          {c.title}
        </Text>
        <Text
          numberOfLines={1}
          style={[styles.sub, { color: colors.textSecondary }]}
        >
          {c.sub}
        </Text>
      </View>

      <Pressable
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel="Get it on Google Play"
        style={({ pressed }) => [styles.badge, pressed && { opacity: 0.85 }]}
      >
        <GooglePlayMark />
        <View>
          <Text style={styles.badgeTop}>GET IT ON</Text>
          <Text style={styles.badgeMain}>Google Play</Text>
        </View>
      </Pressable>

      <Pressable
        onPress={close}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Dismiss"
        style={styles.close}
      >
        <Ionicons name="close" size={18} color={colors.textSecondary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    width: "100%",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  copy: { flex: 1, alignItems: "center", gap: 10, minWidth: 0 },
  title: { fontSize: 14, fontWeight: "700" },
  sub: { fontSize: 12.5, flexShrink: 1 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#000000",
    borderColor: "rgba(255,255,255,0.28)",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  badgeTop: { color: "#FFFFFF", fontSize: 8, letterSpacing: 0.5, opacity: 0.85 },
  badgeMain: { color: "#FFFFFF", fontSize: 14, fontWeight: "700", marginTop: -1 },
  close: { padding: 4 },
});
