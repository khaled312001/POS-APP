import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  DEFAULT_THEME,
  getActiveMode,
  getActivePalette,
  getThemeVersion,
  palettes,
  setActiveMode,
  type Palette,
  type ThemeMode,
} from "@/constants/theme";

const THEME_KEY = "kassenta_theme";

interface ThemeContextValue {
  mode: ThemeMode;
  colors: Palette;
  isDark: boolean;
  version: number;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Reads the persisted preference synchronously on web so the first paint is
 * already correct. `lib/web-static.ts` writes the same key from an inline
 * <script> in index.html to keep the pre-hydration paint in sync.
 */
function readSyncPreference(): ThemeMode | null {
  if (Platform.OS !== "web" || typeof window === "undefined") return null;
  try {
    const stored = window.localStorage?.getItem(THEME_KEY);
    return stored === "light" || stored === "dark" ? stored : null;
  } catch {
    return null;
  }
}

function paintDocument(mode: ThemeMode) {
  if (Platform.OS !== "web" || typeof document === "undefined") return;
  const root = document.documentElement;
  root.setAttribute("data-theme", mode);
  root.style.colorScheme = mode;
  const background = palettes[mode].background;
  root.style.backgroundColor = background;
  if (document.body) document.body.style.backgroundColor = background;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", mode === "dark" ? palettes.dark.background : palettes.light.surface);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    const sync = readSyncPreference() ?? DEFAULT_THEME;
    setActiveMode(sync);
    return sync;
  });

  // Native has no synchronous storage — settle the preference before the first
  // interactive frame. The default (light) is already painted, so a mismatch
  // only flashes for users who explicitly chose dark.
  useEffect(() => {
    paintDocument(mode);
    if (Platform.OS === "web") return;
    let cancelled = false;
    AsyncStorage.getItem(THEME_KEY)
      .then((stored) => {
        if (cancelled) return;
        if (stored === "light" || stored === "dark") {
          setActiveMode(stored);
          setModeState(stored);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    if (next === getActiveMode()) return;
    setActiveMode(next);
    setModeState(next);
    paintDocument(next);
    AsyncStorage.setItem(THEME_KEY, next).catch(() => {});
    if (Platform.OS === "web") {
      try {
        window.localStorage?.setItem(THEME_KEY, next);
      } catch {
        /* private mode */
      }
    }
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      colors: getActivePalette(),
      isDark: mode === "dark",
      version: getThemeVersion(),
      setMode,
      toggle: () => setMode(getActiveMode() === "dark" ? "light" : "dark"),
    }),
    [mode, setMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // Outside the provider (e.g. an isolated test render) fall back to the
    // module-level runtime rather than throwing — theming is never critical
    // enough to take a screen down.
    return {
      mode: getActiveMode(),
      colors: getActivePalette(),
      isDark: getActiveMode() === "dark",
      version: getThemeVersion(),
      setMode: setActiveMode,
      toggle: () => setActiveMode(getActiveMode() === "dark" ? "light" : "dark"),
    };
  }
  return ctx;
}
