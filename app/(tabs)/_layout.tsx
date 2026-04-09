import { Tabs, Redirect } from "expo-router";
import { Platform, StyleSheet, Dimensions, Modal } from "react-native";
import React, { useEffect, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { BlurView } from "expo-blur";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";
import { useLicense } from "@/lib/license-context";
import { useNotifications } from "@/lib/notification-context";
import { Text, View, Animated, Pressable } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { usePathname, useRouter } from "expo-router";
import { getQueryFn, getApiUrl } from "@/lib/query-client";
import { getChromeMetrics, WEB_TOOLBAR_DESKTOP_H, WEB_TOOLBAR_MOBILE_H } from "@/lib/responsive";

export default function TabLayout() {
  const { isLoggedIn, isCashier } = useAuth();
  const { t, isRTL } = useLanguage();
  const { subscription, tenant } = useLicense();
  const tenantId = tenant?.id;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const notifPulse = useRef(new Animated.Value(1)).current;
  const [pendingCount, setPendingCount] = useState(0);
  const lastNotifiedOrderIdRef = useRef<number | null>(null);
  const [screenDims, setScreenDims] = useState(Dimensions.get("window"));
  const [showMobileNav, setShowMobileNav] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const sub = Dimensions.addEventListener("change", ({ window }) => setScreenDims(window));
    return () => sub?.remove();
  }, []);

  const { isMobileWeb } = getChromeMetrics(screenDims.width);
  const webToolbarHeight = isMobileWeb ? WEB_TOOLBAR_MOBILE_H : WEB_TOOLBAR_DESKTOP_H;

  const { data: onlineOrders = [] } = useQuery<any[]>({
    queryKey: ["/api/online-orders", tenantId ? `?tenantId=${tenantId}` : ""],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!tenantId,
    refetchInterval: 8000,   // Poll every 8 seconds — fast enough to catch new orders
  });

  const { onlineOrderNotification, setOnlineOrderNotification, playNotificationSound } = useNotifications();
  const router = useRouter();
  const navItems = [
    { href: "/", icon: "cart", label: t("pos") },
    { href: "/online-orders", icon: "receipt", label: t("onlineOrdersTitle" as any) || "Orders" },
    { href: "/products", icon: "grid", label: t("products") },
    { href: "/customers", icon: "people", label: t("customers") },
    ...(!isCashier ? [
      { href: "/reports", icon: "stats-chart", label: t("reports") },
      { href: "/settings", icon: "menu", label: t("more") },
    ] : []),
  ];
  const currentTitle = navItems.find((item) => item.href === pathname)?.label || t("pos");
  const isPosRoute = pathname === "/" || pathname === "/index";

  // ── Detect new online orders → play sound + show toast ────────────────────
  useEffect(() => {
    const all = onlineOrders as any[];
    const count = all.filter((o: any) => o.status === "pending").length;
    setPendingCount(count);

    // Badge pulse animation
    if (count > 0) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.3, duration: 600, useNativeDriver: Platform.OS !== "web" }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: Platform.OS !== "web" }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }

    // Find the newest pending order
    const pending = all.filter((o: any) => o.status === "pending");
    if (pending.length === 0) return;
    const newest = pending.reduce((a: any, b: any) => (a.id > b.id ? a : b));

    if (lastNotifiedOrderIdRef.current === null) {
      // First load — just record the current newest ID, don't notify
      lastNotifiedOrderIdRef.current = newest.id;
      return;
    }

    if (newest.id > lastNotifiedOrderIdRef.current) {
      // A genuinely new order arrived!
      lastNotifiedOrderIdRef.current = newest.id;
      playNotificationSound();
      setOnlineOrderNotification(newest);
    }
  }, [onlineOrders]);

  // Sync lastNotifiedOrderIdRef when WebSocket fires a notification first
  // (prevents the next poll from double-notifying the same order)
  useEffect(() => {
    if (onlineOrderNotification?.id &&
        onlineOrderNotification.id > (lastNotifiedOrderIdRef.current ?? 0)) {
      lastNotifiedOrderIdRef.current = onlineOrderNotification.id;
    }
  }, [onlineOrderNotification]);

  // Pulse the notification toast icon while it's visible
  useEffect(() => {
    if (onlineOrderNotification) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(notifPulse, { toValue: 1.2, duration: 500, useNativeDriver: Platform.OS !== "web" }),
          Animated.timing(notifPulse, { toValue: 1, duration: 500, useNativeDriver: Platform.OS !== "web" }),
        ])
      ).start();
    } else {
      notifPulse.stopAnimation();
      notifPulse.setValue(1);
    }
  }, [onlineOrderNotification]);

  if (!isLoggedIn) {
    return <Redirect href="/login" />;
  }

  const showWarningUrl = "https://www.barmagly.tech/upgrade"; // Or a modal

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
            height: Platform.OS === "web" ? (isMobileWeb ? 0 : 84) : 60,
            paddingBottom: Platform.OS === "web" ? (isMobileWeb ? 0 : 34) : 6,
            paddingTop: 6,
            position: "absolute" as const,
            direction: isRTL ? "rtl" : "ltr",
            display: Platform.OS === "web" && isMobileWeb ? "none" : "flex",
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
          name="online-orders"
          options={{
            title: t("onlineOrdersTitle" as any) || "Orders",
            tabBarIcon: ({ color, size, focused }) => (
              <View style={{ position: "relative" }}>
                <Ionicons name="receipt" size={size} color={color} />
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

      {Platform.OS === "web" && isMobileWeb && (
        <>
          <View style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: webToolbarHeight,
            backgroundColor: Colors.background,
            borderBottomWidth: 1,
            borderBottomColor: "rgba(255,255,255,0.08)",
            flexDirection: isRTL ? "row-reverse" : "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 12,
            zIndex: 9998,
          }}>
            <Pressable
              onPress={() => setShowMobileNav(true)}
              style={({ pressed }) => ({
                width: 40,
                height: 40,
                borderRadius: 12,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: pressed ? Colors.card : "rgba(255,255,255,0.07)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.12)",
              })}
            >
              <Ionicons name="menu-outline" size={22} color={Colors.white} />
            </Pressable>

            <Text style={{ color: Colors.white, fontSize: 16, fontWeight: "800" }} numberOfLines={1}>
              {currentTitle}
            </Text>

            <View style={{ width: 40, height: 40, alignItems: "flex-end", justifyContent: "center" }}>
              {isPosRoute ? (
                <Pressable
                  onPress={() => {
                    if (typeof window !== "undefined") {
                      window.dispatchEvent(new CustomEvent("barmagly-open-cart"));
                    }
                  }}
                  style={({ pressed }) => ({
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: pressed ? Colors.card : "rgba(255,255,255,0.07)",
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.12)",
                  })}
                >
                  <Ionicons name="cart-outline" size={20} color={Colors.white} />
                </Pressable>
              ) : null}
            </View>
          </View>

          <Modal visible={showMobileNav} animationType="fade" transparent onRequestClose={() => setShowMobileNav(false)}>
            <View style={styles.mobileNavOverlay}>
              <Pressable style={styles.mobileNavBackdrop} onPress={() => setShowMobileNav(false)} />
              <View style={[styles.mobileNavSheet, isRTL && { alignSelf: "flex-start" }]}>
                <View style={[styles.mobileNavHeader, isRTL && { flexDirection: "row-reverse" }]}>
                  <Text style={styles.mobileNavTitle}>Barmagly POS</Text>
                  <Pressable onPress={() => setShowMobileNav(false)} style={styles.mobileNavClose}>
                    <Ionicons name="close" size={22} color={Colors.text} />
                  </Pressable>
                </View>

                {navItems.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <Pressable
                      key={item.href}
                      onPress={() => {
                        setShowMobileNav(false);
                        router.push(item.href as any);
                      }}
                      style={[styles.mobileNavItem, active && styles.mobileNavItemActive, isRTL && { flexDirection: "row-reverse" }]}
                    >
                      <Ionicons name={item.icon as any} size={20} color={active ? Colors.textDark : Colors.text} />
                      <Text style={[styles.mobileNavItemText, active && styles.mobileNavItemTextActive]}>{item.label}</Text>
                      {item.href === "/online-orders" && pendingCount > 0 ? (
                        <View style={styles.mobileNavBadge}>
                          <Text style={styles.mobileNavBadgeText}>{pendingCount > 9 ? "9+" : pendingCount}</Text>
                        </View>
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </Modal>
        </>
      )}

      {/* Global Online Order Notification Toast — visible on every tab */}
      {onlineOrderNotification && (
        <Pressable
          onPress={() => {
            router.push("/online-orders" as any);
            setOnlineOrderNotification(null);
          }}
          style={{
            position: "absolute", top: Platform.OS === "web" ? (isMobileWeb ? webToolbarHeight + 8 : 8) : 16, left: 12, right: 12,
            borderRadius: 18, overflow: "hidden",
            zIndex: 99999,
            ...(Platform.OS === "web"
              ? { boxShadow: "0px 8px 32px rgba(34,197,94,0.45)" }
              : { elevation: 20, shadowColor: "#22c55e", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.5, shadowRadius: 16 }),
          }}
        >
          {/* Green gradient background */}
          <View style={{
            backgroundColor: "#14532d",
            borderWidth: 2, borderColor: "#22c55e",
            borderRadius: 18, padding: 14,
            flexDirection: isRTL ? "row-reverse" : "row",
            alignItems: "center", gap: 12,
          }}>
            {/* Pulsing icon */}
            <Animated.View style={{
              width: 56, height: 56, borderRadius: 28,
              backgroundColor: "rgba(34,197,94,0.25)",
              justifyContent: "center", alignItems: "center",
              transform: [{ scale: notifPulse }],
            }}>
              <Text style={{ fontSize: 28 }}>🛵</Text>
            </Animated.View>

            <View style={{ flex: 1 }}>
              <Text style={{ color: "#4ade80", fontWeight: "900", fontSize: 15, letterSpacing: 0.3 }}>
                🔔 {t("newOnlineOrder" as any) || "New Online Order!"}
              </Text>
              <Text style={{ color: "#86efac", fontSize: 13, marginTop: 3, fontWeight: "700" }}>
                #{onlineOrderNotification.orderNumber} · {onlineOrderNotification.customerName}
              </Text>
              <Text style={{ color: "#bbf7d0", fontSize: 13, fontWeight: "800", marginTop: 1 }}>
                CHF {Number(onlineOrderNotification.totalAmount || 0).toFixed(2)}
              </Text>
              <Text style={{ color: "rgba(187,247,208,0.7)", fontSize: 11, marginTop: 3 }}>
                {t("tapToViewDetails" as any) || "Tap to view details →"}
              </Text>
            </View>

            <Pressable
              onPress={(e) => { e.stopPropagation(); setOnlineOrderNotification(null); }}
              style={{ padding: 6, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.1)" }}
            >
              <Ionicons name="close" size={22} color="#4ade80" />
            </Pressable>
          </View>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  mobileNavOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.48)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
  },
  mobileNavBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  mobileNavSheet: {
    marginTop: WEB_TOOLBAR_MOBILE_H,
    width: "82%",
    maxWidth: 320,
    height: "100%",
    backgroundColor: Colors.surface,
    borderLeftWidth: 1,
    borderLeftColor: Colors.cardBorder,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  mobileNavHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  mobileNavTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  mobileNavClose: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.card,
  },
  mobileNavItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 8,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  mobileNavItemActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  mobileNavItemText: {
    flex: 1,
    color: Colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  mobileNavItemTextActive: {
    color: Colors.textDark,
  },
  mobileNavBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.danger,
  },
  mobileNavBadgeText: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: "800",
  },
});
