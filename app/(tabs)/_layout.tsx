import { Tabs, Redirect } from "expo-router";
import { Platform, StyleSheet } from "react-native";
import React, { useEffect, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { BlurView } from "expo-blur";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";
import { useLicense } from "@/lib/license-context";
import { Text, View, Animated } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn, getApiUrl } from "@/lib/query-client";

export default function TabLayout() {
  const { isLoggedIn, isCashier } = useAuth();
  const { t, isRTL } = useLanguage();
  const { subscription, tenant } = useLicense();
  const tenantId = tenant?.id;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [pendingCount, setPendingCount] = useState(0);

  const { data: onlineOrders = [] } = useQuery<any[]>({
    queryKey: ["/api/online-orders", tenantId ? `?tenantId=${tenantId}` : ""],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!tenantId,
    refetchInterval: 20000,
  });

  useEffect(() => {
    const count = (onlineOrders as any[]).filter((o: any) => o.status === "pending").length;
    setPendingCount(count);
    if (count > 0) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.3, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [onlineOrders]);

  if (!isLoggedIn) {
    return <Redirect href="/login" />;
  }

  const showWarningUrl = "https://barmagly.com/upgrade"; // Or a modal

  const banner = subscription?.requiresUpgrade ? (
    <View style={{ backgroundColor: Colors.warning, padding: 12, paddingTop: Platform.OS === 'ios' ? 44 : 24, paddingBottom: 12 }}>
      <Text style={{ color: '#000', fontWeight: 'bold', textAlign: 'center', fontSize: 13 }}>
        ⚠️ Your {subscription.plan} subscription {subscription.daysRemaining > 0 ? `expires in ${subscription.daysRemaining} days` : 'has expired'}. Contact super admin to avoid service interruption.
      </Text>
    </View>
  ) : null;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      {banner}
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors.accent,
          tabBarInactiveTintColor: Colors.tabInactive,
          headerShown: false,
          tabBarStyle: {
            backgroundColor: Platform.OS === "ios" ? "transparent" : Colors.tabBar,
            borderTopWidth: 0,
            elevation: 0,
            height: Platform.OS === "web" ? 84 : 60,
            paddingBottom: Platform.OS === "web" ? 34 : 6,
            paddingTop: 6,
            position: "absolute" as const,
            direction: isRTL ? "rtl" : "ltr",
          },
          tabBarBackground: () =>
            Platform.OS === "ios" ? (
              <BlurView intensity={100} tint="dark" style={StyleSheet.absoluteFill} />
            ) : null,
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: "600" as const,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: t("pos"),
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="cart" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="products"
          options={{
            title: t("products"),
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="grid" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="customers"
          options={{
            title: t("customers"),
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="people" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="reports"
          options={{
            title: t("reports"),
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="stats-chart" size={size} color={color} />
            ),
            href: isCashier ? null : undefined,
          }}
        />
        <Tabs.Screen
          name="online-orders"
          options={{
            title: t("onlineOrdersTitle" as any) || "Orders",
            tabBarIcon: ({ color, size, focused }) => (
              <View style={{ position: "relative" }}>
                <Ionicons name="globe" size={size} color={color} />
                {pendingCount > 0 && (
                  <Animated.View style={{
                    position: "absolute", top: -4, right: -6,
                    minWidth: 16, height: 16, borderRadius: 8,
                    backgroundColor: Colors.danger,
                    justifyContent: "center", alignItems: "center",
                    paddingHorizontal: 3,
                    transform: [{ scale: pulseAnim }],
                    borderWidth: 1.5, borderColor: Colors.tabBar,
                  }}>
                    <Text style={{ color: "#fff", fontSize: 9, fontWeight: "900", lineHeight: 12 }}>
                      {pendingCount > 9 ? "9+" : pendingCount}
                    </Text>
                  </Animated.View>
                )}
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: t("more"),
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="menu" size={size} color={color} />
            ),
            href: isCashier ? null : undefined,
          }}
        />
      </Tabs>
    </View>
  );
}
