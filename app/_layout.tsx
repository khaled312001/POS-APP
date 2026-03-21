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

// ── Service Worker + Web Push Registration ──────────────────────────────────
if (Platform.OS === "web" && typeof window !== "undefined" && "serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      // Register service worker
      const reg = await navigator.serviceWorker.register("/app/sw.js", { scope: "/app/" });
      console.log("[SW] Registered:", reg.scope);

      // Request push permission and subscribe
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        try {
          // Get VAPID public key
          const keyRes = await fetch("/api/push/vapid-public-key");
          if (!keyRes.ok) throw new Error("VAPID key unavailable");
          const keyData = await keyRes.json();
          const publicKey = keyData?.publicKey;
          if (!publicKey) throw new Error("VAPID public key missing");

          // Subscribe to push
          const existing = await reg.pushManager.getSubscription();
          const sub = existing || await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey),
          });

          // Send subscription to server
          await fetch("/api/push/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(sub.toJSON()),
          });
          console.log("[Push] Subscribed successfully");
        } catch (pushErr) {
          console.warn("[Push] Subscription failed:", pushErr);
        }
      }
    } catch (err) {
      console.warn("[SW] Registration failed:", err);
    }
  });
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

// Store the PWA install prompt for later use (do NOT suppress it)
if (Platform.OS === "web" && typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    (window as any).__pwaInstallPrompt = e;
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
