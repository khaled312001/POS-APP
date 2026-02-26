import { QueryClientProvider } from "@tanstack/react-query";
import { Stack, Redirect } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { queryClient } from "@/lib/query-client";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "@/lib/auth-context";
import { CartProvider } from "@/lib/cart-context";
import { LanguageProvider } from "@/lib/language-context";
import { LicenseProvider, useLicense } from "@/lib/license-context";

SplashScreen.preventAutoHideAsync();

import { useRouter, useSegments } from "expo-router";

function RootLayoutNav() {
  const { isValid, isValidating } = useLicense();
  const segments = useSegments();
  const router = useRouter();

  // Keep splash screen while validating
  useEffect(() => {
    if (!isValidating) {
      SplashScreen.hideAsync();
    }
  }, [isValidating]);

  // Route guarding
  useEffect(() => {
    if (isValidating) return;

    const inLicenseGate = segments[0] === "license-gate";

    if (isValid === false && !inLicenseGate) {
      // Redirect to license-gate if license is invalid
      router.replace("/license-gate");
    } else if (isValid === true && inLicenseGate) {
      // If licensed and somehow sitting on license-gate, push to login
      router.replace("/login");
    }
  }, [isValid, isValidating, segments]);

  if (isValidating) {
    return null; // Return nothing while splash screen is visible
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
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
