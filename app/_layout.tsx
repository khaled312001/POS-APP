import { QueryClientProvider } from "@tanstack/react-query";
import { Stack, Redirect } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
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
import { Ionicons } from "@expo/vector-icons";
import * as Font from "expo-font";

SplashScreen.preventAutoHideAsync();

import { useRouter, useSegments } from "expo-router";

function RootLayoutNav() {
  const { isValid, isValidating } = useLicense();
  const [fontsLoaded, setFontsLoaded] = useState(false);

  // Load icon fonts
  useEffect(() => {
    async function loadFonts() {
      try {
        await Font.loadAsync({
          ...Ionicons.font,
        });
      } catch (e) {
        console.warn("Error loading fonts:", e);
      } finally {
        setFontsLoaded(true);
      }
    }
    loadFonts();
  }, []);

  // Keep splash screen while validating or loading fonts
  useEffect(() => {
    if (!isValidating && fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [isValidating, fontsLoaded]);

  if (isValidating || !fontsLoaded) {
    return null; // Return nothing while splash screen is visible
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="intro" options={{ headerShown: false }} />
      <Stack.Screen name="license-gate" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
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
                  <CartProvider>
                    <StatusBar style="light" />
                    <RootLayoutNav />
                  </CartProvider>
                </AuthProvider>
              </LicenseProvider>
            </LanguageProvider>
          </KeyboardProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
