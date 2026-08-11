import { StyleSheet, type ImageStyle, type TextStyle, type ViewStyle } from "react-native";
import { getActivePalette, getThemeVersion, type Palette } from "@/constants/theme";

// Mirrors react-native's own StyleSheet.create signature so each style literal
// still gets ViewStyle/TextStyle as its contextual type — without it, unions
// like `position: "absolute"` widen to `string` and every style prop errors.
type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle };

/**
 * Drop-in replacement for a module-scope `StyleSheet.create({...})` block that
 * needs to follow the active theme.
 *
 *   const styles = themedStyles((Colors) => ({ card: { backgroundColor: Colors.card } }));
 *
 * The returned value is a proxy, so every existing `styles.card` read keeps
 * working unchanged. The factory runs at most once per theme switch — the
 * resolved sheet is cached against the theme version, so steady-state reads
 * cost one integer compare plus a property lookup.
 *
 * Re-rendering is handled one level up: ThemeProvider -> LanguageProvider ->
 * every screen (see lib/theme-context.tsx).
 */
export function themedStyles<T extends NamedStyles<T> | NamedStyles<any>>(
  factory: (colors: Palette) => T & NamedStyles<any>
): T {
  let resolved: T | null = null;
  let builtForVersion = -1;

  const ensure = (): T => {
    const version = getThemeVersion();
    if (resolved === null || builtForVersion !== version) {
      resolved = StyleSheet.create(factory(getActivePalette()) as any) as T;
      builtForVersion = version;
    }
    return resolved;
  };

  return new Proxy({} as T, {
    get: (_target, key: string | symbol) => (ensure() as Record<string | symbol, unknown>)[key],
    has: (_target, key) => key in (ensure() as object),
    ownKeys: () => Reflect.ownKeys(ensure() as object),
    getOwnPropertyDescriptor: (_target, key) => {
      const descriptor = Object.getOwnPropertyDescriptor(ensure() as object, key);
      // The proxy target is an empty object, so every reported property must be
      // configurable or the invariant check throws.
      return descriptor ? { ...descriptor, configurable: true } : undefined;
    },
  });
}

export default themedStyles;
