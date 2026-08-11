import React from "react";
import { StyleSheet, Text, View, Pressable, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors } from "@/constants/colors";
import { themedStyles } from "@/lib/themed-styles";
import { useTheme } from "@/lib/theme-context";

type TabPageHeaderProps = {
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  badgeText?: string;
  isRTL?: boolean;
  colors?: [string, string] | [string, string, string];
  rightActions?: React.ReactNode;
  /** Set false on screens that already expose the switch elsewhere. */
  showThemeToggle?: boolean;
  children?: React.ReactNode;
  style?: ViewStyle;
};

type HeaderIconButtonProps = {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
};

export function HeaderIconButton({ icon, onPress }: HeaderIconButtonProps) {
  return (
    <Pressable onPress={onPress} style={styles.iconButton}>
      <Ionicons name={icon} size={22} color={Colors.white} />
    </Pressable>
  );
}

/**
 * Light/dark switch styled for the gradient header. Present on every tab so the
 * preference is always one tap away, not buried in Settings.
 */
export function HeaderThemeToggle() {
  const { isDark, toggle } = useTheme();
  return (
    <Pressable
      onPress={toggle}
      style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
      accessibilityRole="switch"
      accessibilityState={{ checked: isDark }}
      accessibilityLabel={isDark ? "Switch to light theme" : "Switch to dark theme"}
    >
      <Ionicons name={isDark ? "sunny-outline" : "moon-outline"} size={21} color={Colors.white} />
    </Pressable>
  );
}

export default function TabPageHeader({
  title,
  subtitle,
  icon,
  badgeText,
  isRTL = false,
  colors = [Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd],
  rightActions,
  showThemeToggle = true,
  children,
  style,
}: TabPageHeaderProps) {
  const insets = useSafeAreaInsets();
  return (
    <LinearGradient
      colors={colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      // Push the header content below the status bar / notch (insets.top).
      style={[styles.header, { paddingTop: 14 + insets.top }, style]}
    >
      <View style={[styles.topRow, isRTL && styles.topRowRtl]}>
        <View style={styles.titleWrap}>
          <View style={[styles.titleRow, isRTL && styles.titleRowRtl]}>
            {icon ? <Ionicons name={icon} size={24} color={Colors.white} /> : null}
            <Text style={[styles.title, isRTL && styles.textRtl]}>{title}</Text>
            {badgeText ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{badgeText}</Text>
              </View>
            ) : null}
          </View>
          {subtitle ? (
            <Text style={[styles.subtitle, isRTL && styles.textRtl]}>{subtitle}</Text>
          ) : null}
        </View>
        {rightActions || showThemeToggle ? (
          <View style={[styles.actions, isRTL && styles.actionsRtl]}>
            {rightActions}
            {showThemeToggle ? <HeaderThemeToggle /> : null}
          </View>
        ) : null}
      </View>
      {children ? <View style={styles.content}>{children}</View> : null}
    </LinearGradient>
  );
}

const styles = themedStyles((Colors) => ({
  header: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
    gap: 10,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  topRowRtl: {
    flexDirection: "row-reverse",
  },
  titleWrap: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  titleRowRtl: {
    flexDirection: "row-reverse",
  },
  title: {
    color: Colors.white,
    fontSize: 22,
    fontWeight: "800",
  },
  subtitle: {
    marginTop: 4,
    color: "rgba(255,255,255,0.72)",
    fontSize: 12,
  },
  badge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  badgeText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: "800",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionsRtl: {
    flexDirection: "row-reverse",
  },
  content: {
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  iconButtonPressed: {
    backgroundColor: "rgba(255,255,255,0.28)",
    transform: [{ scale: 0.94 }],
  },
  textRtl: {
    textAlign: "right",
  },
}));
