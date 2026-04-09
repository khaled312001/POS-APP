import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colors } from "@/constants/colors";

type Tier = "bronze" | "silver" | "gold" | "platinum";

const TIER_CONFIG: Record<Tier, { icon: string; color: string; bg: string }> = {
  bronze:   { icon: "🥉", color: Colors.loyaltyBronze,   bg: "rgba(205,127,50,0.15)" },
  silver:   { icon: "🥈", color: Colors.loyaltySilver,   bg: "rgba(192,192,192,0.20)" },
  gold:     { icon: "🥇", color: Colors.loyaltyGold,     bg: "rgba(255,215,0,0.20)" },
  platinum: { icon: "💎", color: Colors.loyaltyPlatinum, bg: "rgba(229,228,226,0.25)" },
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
        <Text style={styles.compactIcon}>{config.icon}</Text>
        <Text style={[styles.compactLabel, { color: config.color }]}>
          {tier.charAt(0).toUpperCase() + tier.slice(1)}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: config.bg }]}>
      <Text style={styles.icon}>{config.icon}</Text>
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

const styles = StyleSheet.create({
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
});
