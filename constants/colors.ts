// ── Kassenta palette access ──────────────────────────────────────────────────
// `Colors` is a live view onto whichever palette is active (see constants/theme).
// Reading `Colors.accent` inside a component body or JSX prop therefore always
// yields the current theme's value — no import changes were needed at the ~2400
// existing call sites.
//
// The one thing a live view cannot fix is `StyleSheet.create({...})` at module
// scope: it runs once at import time and copies the values in. Those blocks are
// wrapped in `themedStyles()` (lib/themed-styles.ts), which re-evaluates the
// factory whenever the theme version changes.

import { getActivePalette, type Palette } from "./theme";

export { Brand, Radius, Spacing, type ThemeMode, type Palette } from "./theme";

export const Colors: Palette = new Proxy({} as Palette, {
  get(_target, key: string) {
    return (getActivePalette() as Record<string, string>)[key];
  },
  has(_target, key: string) {
    return key in getActivePalette();
  },
  ownKeys() {
    return Reflect.ownKeys(getActivePalette());
  },
  getOwnPropertyDescriptor(_target, key: string) {
    const value = (getActivePalette() as Record<string, string>)[key];
    if (value === undefined) return undefined;
    return { value, enumerable: true, configurable: true, writable: false };
  },
  set() {
    if (__DEV__) console.warn("[theme] Colors is read-only — use setActiveMode() to switch themes.");
    return true;
  },
});

export default Colors;
