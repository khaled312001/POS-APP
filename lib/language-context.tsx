import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { I18nManager, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Language, t, TranslationKey, isRTL } from "./i18n";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
  isRTL: boolean;
  rtlStyle: (style?: any) => any;
  rtlRow: any;
  rtlRowReverse: any;
  rtlTextAlign: any;
  rtlText: any;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

const LANG_KEY = "app_language";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLangState] = useState<Language>("en");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(LANG_KEY).then((val) => {
      if (val === "ar" || val === "en" || val === "de") setLangState(val);
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLangState(lang);
    AsyncStorage.setItem(LANG_KEY, lang).catch(() => {});
    const rtl = isRTL(lang);
    if (Platform.OS !== "web") {
      I18nManager.allowRTL(rtl);
      I18nManager.forceRTL(rtl);
    }
  }, []);

  const translate = useCallback((key: TranslationKey) => t(language, key), [language]);

  const rtl = isRTL(language);

  const rtlRow = { flexDirection: rtl ? "row-reverse" as const : "row" as const };
  const rtlRowReverse = { flexDirection: rtl ? "row" as const : "row-reverse" as const };
  const rtlTextAlign = { textAlign: rtl ? "right" as const : "left" as const };
  const rtlText = { writingDirection: rtl ? "rtl" as const : "ltr" as const };

  const rtlStyle = useCallback((style?: any) => {
    if (!rtl || !style) return style || {};
    const result = { ...style };
    if (result.flexDirection === "row") result.flexDirection = "row-reverse";
    if (result.textAlign === "left") result.textAlign = "right";
    return result;
  }, [rtl]);

  if (!loaded) return null;

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t: translate, isRTL: rtl, rtlStyle, rtlRow, rtlRowReverse, rtlTextAlign, rtlText }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
