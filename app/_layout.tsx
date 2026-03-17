import { QueryClientProvider } from "@tanstack/react-query";
import { Stack, Redirect } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { queryClient } from "@/lib/query-client";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "@/lib/auth-context";
import { CartProvider } from "@/lib/cart-context";
import { LanguageProvider } from "@/lib/language-context";
import { LicenseProvider, useLicense } from "@/lib/license-context";
import { NotificationProvider } from "@/lib/notification-context";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useFonts } from "expo-font";
import { Platform } from "react-native";

SplashScreen.preventAutoHideAsync();

// Suppress PWA install prompt on mobile/tablet browsers
if (Platform.OS === "web" && typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
  });
}

import { useRouter, useSegments } from "expo-router";
import * as WebBrowser from "expo-web-browser";

WebBrowser.maybeCompleteAuthSession();

function RootLayoutNav() {
  const { isValid, isValidating } = useLicense();
  const [fontsLoaded, fontError] = useFonts({
    ...Ionicons.font,
    ...Feather.font,
  });

  useEffect(() => {
    if ((fontsLoaded || fontError) && !isValidating) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, isValidating]);

  if (isValidating || (!fontsLoaded && !fontError)) {
    return null;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="intro" options={{ headerShown: false }} />
      <Stack.Screen name="license-gate" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  // Splash hide moved to RootLayoutNav to wait for license validation

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <KeyboardProvider>
            <LanguageProvider>
              <LicenseProvider>
                <AuthProvider>
                  <NotificationProvider>
                    <CartProvider>
                      <StatusBar style="light" />
                      <RootLayoutNav />
                    </CartProvider>
                  </NotificationProvider>
                </AuthProvider>
              </LicenseProvider>
            </LanguageProvider>
          </KeyboardProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
