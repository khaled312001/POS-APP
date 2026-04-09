import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Colors } from "@/constants/colors";
import { useLicense } from "@/lib/license-context";
import { getQueryFn, getApiUrl } from "@/lib/query-client";
import { useLanguage } from "@/lib/language-context";

interface Driver {
  id: number;
  driverName: string;
  driverPhone: string;
  driverStatus: "offline" | "available" | "on_delivery";
  driverRating: number | string;
  vehicleType: string;
  plateNumber: string;
  currentLat?: number | null;
  currentLng?: number | null;
  locationUpdatedAt?: string;
  totalDeliveries: number;
  activeOrderId?: number | null;
}

const STATUS_META: Record<string, { label: string; labelAr: string; color: string; icon: string }> = {
  offline: { label: "Offline", labelAr: "غير متصل", color: Colors.driverOffline, icon: "ellipse" },
  available: { label: "Available", labelAr: "متاح", color: Colors.driverOnline, icon: "checkmark-circle" },
  on_delivery: { label: "On Delivery", labelAr: "في مهمة", color: Colors.driverBusy, icon: "bicycle" },
};

export default function DriverManagementScreen() {
  const { tenant } = useLicense();
  const { language } = useLanguage();
  const tenantId = (tenant as any)?.id;
  const licenseKey = (tenant as any)?.licenseKey || "";
  const isRTL = language === "ar";
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"list" | "stats">("list");

  const { data: drivers = [], isLoading, refetch } = useQuery<Driver[]>({
    queryKey: [`/api/delivery/manage/drivers?tenantId=${tenantId}`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!tenantId,
    refetchInterval: 15000, // auto-refresh every 15s
  });

  const { data: deliveryStats } = useQuery<any>({
    queryKey: [`/api/delivery/manage/stats?tenantId=${tenantId}`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!tenantId,
    refetchInterval: 30000,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const onlineDrivers = drivers.filter(d => d.driverStatus !== "offline");
  const availableCount = drivers.filter(d => d.driverStatus === "available").length;
  const busyCount = drivers.filter(d => d.driverStatus === "on_delivery").length;
  const offlineCount = drivers.filter(d => d.driverStatus === "offline").length;

  const lbl = (en: string, ar: string) => language === "ar" ? ar : en;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, isRTL && { flexDirection: "row-reverse" }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name={isRTL ? "chevron-forward" : "chevron-back"} size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isRTL && { textAlign: "right" }]}>
          {lbl("Driver Management", "إدارة السائقين")}
        </Text>
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>

      {/* KPI Bar */}
      <View style={[styles.kpiBar, isRTL && { flexDirection: "row-reverse" }]}>
        <View style={styles.kpiItem}>
          <Text style={[styles.kpiValue, { color: Colors.driverOnline }]}>{availableCount}</Text>
          <Text style={styles.kpiLabel}>{lbl("Available", "متاح")}</Text>
        </View>
        <View style={styles.kpiDivider} />
        <View style={styles.kpiItem}>
          <Text style={[styles.kpiValue, { color: Colors.driverBusy }]}>{busyCount}</Text>
          <Text style={styles.kpiLabel}>{lbl("On Delivery", "في مهمة")}</Text>
        </View>
        <View style={styles.kpiDivider} />
        <View style={styles.kpiItem}>
          <Text style={[styles.kpiValue, { color: Colors.driverOffline }]}>{offlineCount}</Text>
          <Text style={styles.kpiLabel}>{lbl("Offline", "غير متصل")}</Text>
        </View>
        <View style={styles.kpiDivider} />
        <View style={styles.kpiItem}>
          <Text style={[styles.kpiValue, { color: Colors.text }]}>{deliveryStats?.todayDeliveries ?? "—"}</Text>
          <Text style={styles.kpiLabel}>{lbl("Today", "اليوم")}</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={[styles.tabRow, isRTL && { flexDirection: "row-reverse" }]}>
        {(["list", "stats"] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabBtnText, activeTab === tab && styles.tabBtnTextActive]}>
              {tab === "list" ? lbl("Drivers", "السائقون") : lbl("Stats", "الإحصائيات")}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <ActivityIndicator color={Colors.deliveryPrimary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 12 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.deliveryPrimary} />}
        >
          {activeTab === "list" ? (
            <>
              {drivers.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={{ fontSize: 40 }}>🚗</Text>
                  <Text style={styles.emptyText}>{lbl("No drivers added yet", "لا يوجد سائقون بعد")}</Text>
                  <Text style={styles.emptySubtext}>{lbl("Add drivers from the Vehicles section in Settings", "أضف سائقين من قسم المركبات في الإعدادات")}</Text>
                </View>
              ) : (
                drivers.map(driver => {
                  const meta = STATUS_META[driver.driverStatus] || STATUS_META.offline;
                  const lastSeen = driver.locationUpdatedAt
                    ? new Date(driver.locationUpdatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                    : null;
                  return (
                    <View key={driver.id} style={styles.driverCard}>
                      <View style={[styles.driverLeft, isRTL && { flexDirection: "row-reverse" }]}>
                        <View style={[styles.avatar, { backgroundColor: meta.color + "20" }]}>
                          <Ionicons name={meta.icon as any} size={22} color={meta.color} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.driverName, isRTL && { textAlign: "right" }]}>{driver.driverName}</Text>
                          <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 8, marginTop: 2 }}>
                            <Text style={styles.driverMeta}>{driver.vehicleType || "—"} · {driver.plateNumber || "—"}</Text>
                          </View>
                          <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                            {/* Status chip */}
                            <View style={[styles.chip, { backgroundColor: meta.color + "15" }]}>
                              <View style={[styles.chipDot, { backgroundColor: meta.color }]} />
                              <Text style={[styles.chipText, { color: meta.color }]}>
                                {isRTL ? meta.labelAr : meta.label}
                              </Text>
                            </View>
                            {/* Rating chip */}
                            <View style={[styles.chip, { backgroundColor: Colors.loyaltyGold + "15" }]}>
                              <Text style={[styles.chipText, { color: Colors.loyaltyGold }]}>
                                ⭐ {parseFloat(String(driver.driverRating || 5)).toFixed(1)}
                              </Text>
                            </View>
                            {/* Deliveries */}
                            <View style={[styles.chip, { backgroundColor: Colors.info + "15" }]}>
                              <Text style={[styles.chipText, { color: Colors.info }]}>
                                {driver.totalDeliveries} {lbl("trips", "رحلة")}
                              </Text>
                            </View>
                          </View>
                          {/* GPS info */}
                          {driver.currentLat && driver.currentLng ? (
                            <Text style={styles.gpsText}>
                              📍 {Number(driver.currentLat).toFixed(4)}, {Number(driver.currentLng).toFixed(4)}
                              {lastSeen ? ` · ${lastSeen}` : ""}
                            </Text>
                          ) : null}
                          {driver.activeOrderId ? (
                            <Text style={[styles.activeOrder, isRTL && { textAlign: "right" }]}>
                              {lbl(`Order #${driver.activeOrderId}`, `طلب #${driver.activeOrderId}`)}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                      <TouchableOpacity
                        style={styles.callBtn}
                        onPress={() => {
                          if (driver.driverPhone) {
                            const url = `tel:${driver.driverPhone}`;
                            if (Platform.OS !== "web") require("react-native").Linking.openURL(url);
                          }
                        }}
                      >
                        <Ionicons name="call" size={18} color={Colors.success} />
                      </TouchableOpacity>
                    </View>
                  );
                })
              )}
            </>
          ) : (
            /* Stats tab */
            <>
              <View style={styles.statsCard}>
                <Text style={[styles.statsTitle, isRTL && { textAlign: "right" }]}>
                  {lbl("Today's Summary", "ملخص اليوم")}
                </Text>
                <View style={{ gap: 12, marginTop: 12 }}>
                  {[
                    { label: lbl("Total Deliveries", "إجمالي التوصيلات"), value: deliveryStats?.todayDeliveries ?? 0, color: Colors.deliveryPrimary },
                    { label: lbl("Avg. Delivery Time", "متوسط وقت التوصيل"), value: `${deliveryStats?.avgDeliveryMinutes ?? 0} min`, color: Colors.info },
                    { label: lbl("Delivery Revenue", "إيرادات التوصيل"), value: `CHF ${Number(deliveryStats?.deliveryRevenue ?? 0).toFixed(2)}`, color: Colors.success },
                    { label: lbl("Active Drivers", "السائقون النشطون"), value: onlineDrivers.length, color: Colors.driverOnline },
                  ].map((item, i) => (
                    <View key={i} style={[styles.statRow, isRTL && { flexDirection: "row-reverse" }]}>
                      <Text style={[styles.statLabel, isRTL && { textAlign: "right" }]}>{item.label}</Text>
                      <Text style={[styles.statValue, { color: item.color }]}>{item.value}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {drivers.length > 0 && (
                <View style={styles.statsCard}>
                  <Text style={[styles.statsTitle, isRTL && { textAlign: "right" }]}>
                    {lbl("Driver Leaderboard", "ترتيب السائقين")}
                  </Text>
                  {[...drivers]
                    .sort((a, b) => b.totalDeliveries - a.totalDeliveries)
                    .slice(0, 5)
                    .map((driver, i) => (
                      <View key={driver.id} style={[styles.leaderRow, isRTL && { flexDirection: "row-reverse" }, i === 0 && { backgroundColor: Colors.loyaltyGold + "10", borderRadius: 8, padding: 8 }]}>
                        <Text style={[styles.leaderRank, { color: i === 0 ? Colors.loyaltyGold : Colors.textMuted }]}>#{i + 1}</Text>
                        <Text style={[styles.leaderName, { flex: 1 }, isRTL && { textAlign: "right" }]}>{driver.driverName}</Text>
                        <Text style={styles.leaderDeliveries}>{driver.totalDeliveries} {lbl("trips", "رحلة")}</Text>
                        <Text style={styles.leaderRating}>⭐ {parseFloat(String(driver.driverRating || 5)).toFixed(1)}</Text>
                      </View>
                    ))}
                </View>
              )}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: "row", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn: { padding: 4, marginRight: 8 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: "700", color: Colors.text },
  liveIndicator: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: Colors.danger + "15", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.danger },
  liveText: { color: Colors.danger, fontSize: 11, fontWeight: "800" },
  kpiBar: { flexDirection: "row", backgroundColor: Colors.card, paddingVertical: 12, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  kpiItem: { flex: 1, alignItems: "center" },
  kpiValue: { fontSize: 22, fontWeight: "800" },
  kpiLabel: { color: Colors.textMuted, fontSize: 11, marginTop: 2 },
  kpiDivider: { width: 1, backgroundColor: Colors.border },
  tabRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: Colors.border },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: "center" },
  tabBtnActive: { borderBottomWidth: 2, borderBottomColor: Colors.deliveryPrimary },
  tabBtnText: { color: Colors.textMuted, fontSize: 14, fontWeight: "600" },
  tabBtnTextActive: { color: Colors.deliveryPrimary },
  emptyState: { alignItems: "center", paddingVertical: 60, gap: 10 },
  emptyText: { color: Colors.textMuted, fontSize: 15, fontWeight: "600" },
  emptySubtext: { color: Colors.textMuted, fontSize: 13, textAlign: "center", paddingHorizontal: 32 },
  driverCard: { backgroundColor: Colors.card, borderRadius: 14, padding: 14, flexDirection: "row", alignItems: "flex-start", gap: 10 },
  driverLeft: { flex: 1, flexDirection: "row", alignItems: "flex-start", gap: 10 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", marginTop: 2 },
  driverName: { color: Colors.text, fontSize: 15, fontWeight: "700" },
  driverMeta: { color: Colors.textMuted, fontSize: 12 },
  chip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  chipDot: { width: 6, height: 6, borderRadius: 3 },
  chipText: { fontSize: 11, fontWeight: "600" },
  gpsText: { color: Colors.textMuted, fontSize: 10, marginTop: 4 },
  activeOrder: { color: Colors.deliveryPrimary, fontSize: 12, fontWeight: "600", marginTop: 3 },
  callBtn: { padding: 10, backgroundColor: Colors.success + "15", borderRadius: 10, marginTop: 2 },
  statsCard: { backgroundColor: Colors.card, borderRadius: 14, padding: 16 },
  statsTitle: { color: Colors.text, fontSize: 15, fontWeight: "700" },
  statRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border + "60" },
  statLabel: { color: Colors.textSecondary, fontSize: 14 },
  statValue: { fontSize: 16, fontWeight: "700" },
  leaderRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  leaderRank: { fontSize: 16, fontWeight: "800", width: 28 },
  leaderName: { color: Colors.text, fontSize: 14, fontWeight: "600" },
  leaderDeliveries: { color: Colors.textMuted, fontSize: 12 },
  leaderRating: { color: Colors.textMuted, fontSize: 12, marginLeft: 6 },
});
