// ── Kassenta design tokens ───────────────────────────────────────────────────
// Two full palettes with identical key sets. Every value is an opaque 6-digit
// hex string on purpose: ~200 call sites build translucent variants by string
// concatenation (`Colors.accent + "22"`), which silently produces an invalid
// colour if the base is `rgba(...)`. Keeping the palette hex-only makes that
// idiom correct everywhere and avoids a second compositing pass at paint time.
//
// Contrast: every colour used for text or icons clears WCAG AA (4.5:1) against
// the worst surface it actually lands on. For the light theme that surface is
// not white — it is the ~13% tint of the colour itself that the app paints
// behind badges and icon chips (`Colors.accent + "22"`), which is measurably
// harder. Ratios were measured in the running app, not derived from the source.

export type ThemeMode = "light" | "dark";

/** Identity colours — never themed. Kept in sync with scripts/generate-brand-assets.py. */
export const Brand = {
  navy: "#040E32",
  teal: "#00C1B0",
  /** AA teal for light surfaces: 6.1:1 on white, 4.9:1 on its own tint. */
  tealDark: "#0A6E65",
} as const;

export const darkPalette = {
  primary: "#3B6BF5",
  secondary: "#8B5CF6",
  accent: "#00C1B0",
  gradientStart: "#1E40AF",
  gradientMid: "#7C3AED",
  gradientEnd: "#00C1B0",

  brandNavy: Brand.navy,
  brandTeal: Brand.teal,

  background: "#040E32",
  surface: "#0D1A44",
  surfaceLight: "#152355",
  card: "#131F4F",
  cardBorder: "#0F3A57",

  text: "#FFFFFF",
  textSecondary: "#B6BBC7",
  textMuted: "#8A94AD",
  /**
   * Ink for content sitting ON the accent fill — active pills, primary buttons,
   * selected chips. Its value follows the accent, not the page: the dark theme's
   * accent is bright teal so the ink is near-black, the light theme's accent is
   * a deep teal so the ink is white. (Named `textDark` for history; ~50 call
   * sites use it, all of them on an accent fill.)
   */
  textDark: "#04121F",

  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  info: "#3B82F6",

  white: "#FFFFFF",
  black: "#000000",

  tabBar: "#040E32",
  tabActive: "#00C1B0",
  tabInactive: "#8A94AD",

  border: "#212B4B",

  inputBg: "#111C43",
  inputBorder: "#293463",
  inputFocusBorder: "#00C1B0",

  statusAvailable: "#10B981",
  statusOccupied: "#EF4444",
  statusReserved: "#F59E0B",
  statusPending: "#3B82F6",

  // ── Delivery platform ──
  deliveryPrimary: "#FF5722",
  deliveryPrimaryDark: "#E64A19",
  deliveryPrimaryLight: "#3A1D18",

  statusAccepted: "#3B82F6",
  statusPreparing: "#8B5CF6",
  statusReady: "#00C1B0",
  statusOnWay: "#FF5722",
  statusDelivered: "#10B981",
  statusCancelled: "#EF4444",

  driverOnline: "#4CAF50",
  driverBusy: "#FF5722",
  driverOffline: "#9E9E9E",

  loyaltyBronze: "#CD7F32",
  loyaltySilver: "#C0C0C0",
  loyaltyGold: "#FFD700",
  loyaltyPlatinum: "#E5E4E2",

  // ── Category hues ──
  // Used to distinguish settings rows, badges and icon chips from one another.
  // They are tokens rather than literals so the light theme gets a version that
  // survives a white page — the vivid values below are unreadable on one.
  hueTeal: "#2FD3C6",
  hueViolet: "#8B5CF6",
  hueIndigo: "#7C3AED",
  hueAmber: "#F59E0B",
  hueCyan: "#06B6D4",
  hueOrange: "#F97316",
  hueRose: "#EF4444",

  // ── Elevation (mapped to shadow/elevation props) ──
  shadow: "#000000",
  overlay: "rgba(2, 7, 26, 0.72)",
  skeleton: "#152355",
};

export type Palette = typeof darkPalette;

// Light-theme values are measured, not chosen by eye. Every colour used for
// text or icons clears 4.5:1 against the *worst* surface it actually lands on —
// which is not white but the ~13% tint of itself that the app paints behind
// badges and icon chips (`Colors.x + "22"`). Verified in the browser with
// _audit_contrast.js against the running app, not calculated from the source.
export const lightPalette: Palette = {
  primary: "#1E40AF",
  secondary: "#5B21B6",
  accent: "#0A6E65",
  gradientStart: "#1E40AF",
  gradientMid: "#4F46E5",
  gradientEnd: "#0C8F85",

  brandNavy: Brand.navy,
  brandTeal: Brand.teal,

  background: "#F4F6FA",
  surface: "#FFFFFF",
  surfaceLight: "#EDF1F7",
  card: "#FFFFFF",
  cardBorder: "#DCE3ED",

  text: "#0B1220",
  textSecondary: "#3F4C60",
  textMuted: "#5B6779",
  // White, not dark: the light accent (#0A6E65) is a deep teal, and near-black
  // ink on it measured 3.09:1. White gives 6.1:1.
  textDark: "#FFFFFF",

  success: "#046B4E",
  warning: "#92400E",
  danger: "#B91C1C",
  info: "#1D4ED8",

  white: "#FFFFFF",
  black: "#000000",

  tabBar: "#FFFFFF",
  tabActive: "#0A6E65",
  tabInactive: "#5B6779",

  border: "#E3E8EF",

  inputBg: "#FFFFFF",
  inputBorder: "#CBD5E1",
  inputFocusBorder: "#0A6E65",

  statusAvailable: "#046B4E",
  statusOccupied: "#B91C1C",
  statusReserved: "#92400E",
  statusPending: "#1D4ED8",

  deliveryPrimary: "#A8380C",
  deliveryPrimaryDark: "#8A2E0A",
  deliveryPrimaryLight: "#FDEBE3",

  statusAccepted: "#1D4ED8",
  statusPreparing: "#5B21B6",
  statusReady: "#0A6E65",
  statusOnWay: "#A8380C",
  statusDelivered: "#046B4E",
  statusCancelled: "#B91C1C",

  driverOnline: "#256B29",
  driverBusy: "#A8380C",
  driverOffline: "#5B6779",

  loyaltyBronze: "#7A4718",
  loyaltySilver: "#5B6779",
  loyaltyGold: "#854D0E",
  loyaltyPlatinum: "#4B5A70",

  hueTeal: "#0A6E65",
  hueViolet: "#5B21B6",
  hueIndigo: "#4C1D95",
  hueAmber: "#92400E",
  hueCyan: "#155E75",
  hueOrange: "#9A3412",
  hueRose: "#B91C1C",

  shadow: "#0B1220",
  overlay: "rgba(11, 18, 32, 0.45)",
  skeleton: "#E5EAF2",
};

export const palettes: Record<ThemeMode, Palette> = {
  light: lightPalette,
  dark: darkPalette,
};

// ── Active-theme runtime ─────────────────────────────────────────────────────
// A module-level singleton so non-React code (StyleSheet factories, imperative
// helpers) can read the current palette without threading context through.
// `themeVersion` bumps on every switch; `themedStyles()` uses it as a cache key.

export const DEFAULT_THEME: ThemeMode = "light";

let activeMode: ThemeMode = DEFAULT_THEME;
let version = 0;
const listeners = new Set<(mode: ThemeMode) => void>();

export function getActiveMode(): ThemeMode {
  return activeMode;
}

export function getActivePalette(): Palette {
  return palettes[activeMode];
}

export function getThemeVersion(): number {
  return version;
}

/** Swap the palette. No-op (and no re-render) when the mode is unchanged. */
export function setActiveMode(mode: ThemeMode): void {
  if (mode === activeMode) return;
  activeMode = mode;
  version += 1;
  listeners.forEach((fn) => fn(mode));
}

export function subscribeToTheme(fn: (mode: ThemeMode) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// ── Shared shape tokens (theme-independent) ─────────────────────────────────
export const Radius = { xs: 6, sm: 10, md: 14, lg: 20, xl: 28, pill: 999 } as const;
export const Spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
