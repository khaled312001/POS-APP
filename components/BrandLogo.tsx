import React from "react";
import { Image, ImageStyle, StyleProp } from "react-native";

/**
 * The Kassenta logo, rendered from the real artwork instead of a placeholder
 * badge. Every variant is produced by scripts/generate-brand-assets.py from
 * logo.jpeg — never hand-edit the PNGs.
 *
 *   full  — receipt-K mark + "Kassenta POS System" wordmark
 *   mark  — the K alone (tight spaces: headers, avatars, favicons)
 *
 * `onDark` picks the light rendition: the master artwork is drawn for light
 * backgrounds, so its navy half disappears on the app's navy surfaces.
 */
type Variant = "full" | "mark";

// Intrinsic aspect ratios of the generated files, so callers only pass a height.
const RATIO: Record<Variant, number> = {
  full: 1054 / 303,
  mark: 325 / 303,
};

const SOURCES = {
  full: {
    dark: require("@/assets/brand/logo-full-dark-bg.png"),
    light: require("@/assets/brand/logo-full.png"),
  },
  mark: {
    dark: require("@/assets/brand/logo-mark-dark-bg.png"),
    light: require("@/assets/brand/logo-mark.png"),
  },
};

interface Props {
  variant?: Variant;
  /** Rendered height in points; width follows the artwork's ratio. */
  height?: number;
  onDark?: boolean;
  style?: StyleProp<ImageStyle>;
}

export function BrandLogo({ variant = "full", height = 32, onDark = true, style }: Props) {
  return (
    <Image
      source={SOURCES[variant][onDark ? "dark" : "light"]}
      style={[{ height, width: height * RATIO[variant] }, style]}
      resizeMode="contain"
      accessibilityRole="image"
      accessibilityLabel="Kassenta POS"
    />
  );
}

export default BrandLogo;
