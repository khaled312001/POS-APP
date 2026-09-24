import React from "react";
import { View, Text, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { themedStyles } from "@/lib/themed-styles";
import { useLanguage } from "@/lib/language-context";

type Tier = "bronze" | "silver" | "gold" | "platinum";

type TierStyle = { icon: keyof typeof Ionicons.glyphMap; color: string };

const TIER_ICON: Record<Tier, keyof typeof Ionicons.glyphMap> = {
  bronze: "medal-outline",
  silver: "medal-outline",
  gold: "trophy-outline",
  platinum: "diamond-outline",
};

// Read at render time: `Colors` follows the active palette, so a module-level
// snapshot would keep the colours of whichever theme was active at import.
function tierStyle(tier: Tier): TierStyle {
  const color =
    tier === "silver" ? Colors.loyaltySilver
      : tier === "gold" ? Colors.loyaltyGold
        : tier === "platinum" ? Colors.loyaltyPlatinum
          : Colors.loyaltyBronze;
  return { icon: TIER_ICON[tier], color };
}

const TIER_NAMES: Record<Tier, { en: string; de: string; ar: string }> = {
  bronze: { en: "Bronze", de: "Bronze", ar: "برونزي" },
  silver: { en: "Silver", de: "Silber", ar: "فضي" },
  gold: { en: "Gold", de: "Gold", ar: "ذهبي" },
  platinum: { en: "Platinum", de: "Platin", ar: "بلاتيني" },
};

interface Props {
  tier: Tier | string;
  points?: number;
  compact?: boolean;
}

export default function LoyaltyBadge({ tier, points, compact = false }: Props) {
  const { language, isRTL } = useLanguage();
  const key: Tier = (String(tier || "").toLowerCase() in TIER_ICON ? String(tier).toLowerCase() : "bronze") as Tier;
  const config = tierStyle(key);
  const bg = config.color + "26"; // palette colours are 6-digit hex
  const names = TIER_NAMES[key];
  const tierName = language === "ar" ? names.ar : language === "de" ? names.de : names.en;
  const rowDir = isRTL && Platform.OS !== "web" ? "row-reverse" : "row";

  if (compact) {
    return (
      <View style={[styles.compact, { backgroundColor: bg, flexDirection: rowDir }]}>
        <Ionicons name={config.icon} size={13} color={config.color} />
        <Text style={[styles.compactLabel, { color: config.color }]} numberOfLines={1}>{tierName}</Text>
      </View>
    );
  }

  const pts = Number(points);
  return (
    <View style={[styles.container, { backgroundColor: bg, flexDirection: rowDir }]}>
      <Ionicons name={config.icon} size={20} color={config.color} />
      <View>
        <Text style={[styles.tier, { color: config.color }]}>
          {language === "ar" ? `عضوية ${tierName}` : language === "de" ? `${tierName}-Mitglied` : `${tierName} member`}
        </Text>
        {points !== undefined && Number.isFinite(pts) && (
          <Text style={styles.points}>
            {pts.toLocaleString("en-US")} {language === "ar" ? "نقطة" : language === "de" ? "Punkte" : "pts"}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = themedStyles((Colors) => ({
  container: {
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  tier: { fontSize: 13, fontWeight: "700" },
  points: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  compact: {
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  compactLabel: { fontSize: 11, fontWeight: "600" },
}));
