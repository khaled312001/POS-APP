import { Platform } from "react-native";

export const MOBILE_WEB_BREAKPOINT = 900;
export const WEB_TOOLBAR_DESKTOP_H = 48;
export const WEB_TOOLBAR_MOBILE_H = 56;

export function getChromeMetrics(width: number) {
  const isMobileWeb = Platform.OS === "web" && width < MOBILE_WEB_BREAKPOINT;

  return {
    isMobileWeb,
    topPad: Platform.OS === "web" ? (isMobileWeb ? WEB_TOOLBAR_MOBILE_H : 0) : 0,
    bottomPad: Platform.OS === "web" ? (isMobileWeb ? 20 : 84) : 60,
  };
}
