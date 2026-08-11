import React, { useCallback } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { Colors } from "@/constants/colors";
import { useTheme } from "@/lib/theme-context";
import { useLanguage } from "@/lib/language-context";
import { themedStyles } from "@/lib/themed-styles";

type Variant = "icon" | "segmented";

const LABELS: Record<"light" | "dark", Record<string, string>> = {
  light: { en: "Light", ar: "فاتح", de: "Hell" },
  dark: { en: "Dark", ar: "داكن", de: "Dunkel" },
};

function label(mode: "light" | "dark", language: string) {
  return LABELS[mode][language] ?? LABELS[mode].en;
}

/**
 * Light/dark switch. `icon` is the compact form for headers and toolbars;
 * `segmented` is the explicit two-option control used on settings screens.
 */
export default function ThemeToggle({
  variant = "icon",
  size = 20,
}: {
  variant?: Variant;
  size?: number;
}) {
  const { mode, isDark, setMode, toggle } = useTheme();
  const { language } = useLanguage();

  const tap = useCallback(
    (next?: "light" | "dark") => {
      if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
      if (next) setMode(next);
      else toggle();
    },
    [setMode, toggle]
  );

  if (variant === "segmented") {
    return (
      <View style={styles.segment} accessibilityRole="radiogroup">
        {(["light", "dark"] as const).map((option) => {
          const active = mode === option;
          return (
            <Pressable
              key={option}
              onPress={() => tap(option)}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              accessibilityLabel={label(option, language)}
              style={[styles.segmentItem, active && styles.segmentItemActive]}
            >
              <Ionicons
                name={option === "light" ? "sunny" : "moon"}
                size={16}
                color={active ? Colors.textDark : Colors.textMuted}
              />
              <Text style={[styles.segmentText, active && styles.segmentTextActive]} numberOfLines={1}>
                {label(option, language)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    );
  }

  return (
    <Pressable
      onPress={() => tap()}
      hitSlop={8}
      accessibilityRole="switch"
      accessibilityState={{ checked: isDark }}
      accessibilityLabel={label(isDark ? "light" : "dark", language)}
      style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
    >
      <Ionicons name={isDark ? "sunny-outline" : "moon-outline"} size={size} color={Colors.accent} />
    </Pressable>
  );
}

const styles = themedStyles((Colors) => ({
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  iconButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.94 }],
  },
  segment: {
    flexDirection: "row",
    backgroundColor: Colors.surfaceLight,
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    alignSelf: "flex-start",
  },
  segmentItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 9,
  },
  segmentItemActive: {
    backgroundColor: Colors.accent,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textMuted,
  },
  segmentTextActive: {
    color: Colors.textDark,
  },
}));
