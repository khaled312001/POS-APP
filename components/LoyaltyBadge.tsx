import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { themedStyles } from "@/lib/themed-styles";

type Tier = "bronze" | "silver" | "gold" | "platinum";

type TierStyle = { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string };

// `bg` stays translucent on purpose so the tier tint reads on both palettes.
const TIER_CONFIG: Record<Tier, TierStyle> = {
  bronze:   { icon: "medal-outline",   color: Colors.loyaltyBronze,   bg: "rgba(205,127,50,0.15)" },
  silver:   { icon: "medal-outline",   color: Colors.loyaltySilver,   bg: "rgba(148,163,184,0.20)" },
  gold:     { icon: "trophy-outline",  color: Colors.loyaltyGold,     bg: "rgba(255,215,0,0.18)" },
  platinum: { icon: "diamond-outline", color: Colors.loyaltyPlatinum, bg: "rgba(100,116,139,0.18)" },
};

interface Props {
  tier: Tier | string;
  points?: number;
  compact?: boolean;
}

export default function LoyaltyBadge({ tier, points, compact = false }: Props) {
  const config = TIER_CONFIG[tier as Tier] || TIER_CONFIG.bronze;

  if (compact) {
    return (
      <View style={[styles.compact, { backgroundColor: config.bg }]}>
        <Ionicons name={config.icon} size={13} color={config.color} />
        <Text style={[styles.compactLabel, { color: config.color }]}>
          {tier.charAt(0).toUpperCase() + tier.slice(1)}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: config.bg }]}>
      <Ionicons name={config.icon} size={20} color={config.color} />
      <View>
        <Text style={[styles.tier, { color: config.color }]}>
          {tier.charAt(0).toUpperCase() + tier.slice(1)} Member
        </Text>
        {points !== undefined && (
          <Text style={styles.points}>{points.toLocaleString()} pts</Text>
        )}
      </View>
    </View>
  );
}

const styles = themedStyles((Colors) => ({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  icon: { fontSize: 20 },
  tier: { fontSize: 13, fontWeight: "700" },
  points: { fontSize: 11, color: "rgba(255,255,255,0.55)", marginTop: 1 },
  compact: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  compactIcon: { fontSize: 12 },
  compactLabel: { fontSize: 11, fontWeight: "600" },
}));
