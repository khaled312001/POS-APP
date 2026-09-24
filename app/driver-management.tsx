import React, { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Platform, Linking, Alert, Share,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Colors } from "@/constants/colors";
import { themedStyles } from "@/lib/themed-styles";
import { useLicense } from "@/lib/license-context";
import { getQueryFn, apiErrorMessage } from "@/lib/query-client";
import { useLanguage } from "@/lib/language-context";
import { formatMoney, getCurrency } from "@/lib/currency";
import { normalizeStorePhone, formatInStoreTz } from "@/components/store-locale";

/** A row of GET /api/delivery/manage/drivers (a `vehicles` row with a driver). */
interface Driver {
  id: number;
  driverName: string;
  driverPhone?: string | null;
  driverStatus?: "offline" | "available" | "on_delivery" | null;
  driverRating?: number | string | null;
  licensePlate?: string | null;
  make?: string | null;
  model?: string | null;
  color?: string | null;
  currentLat?: number | string | null;
  currentLng?: number | string | null;
  locationUpdatedAt?: string | null;
  totalDeliveries?: number | null;
  activeOrderId?: number | null;
  driverAccessToken?: string | null;
}

/** Shape returned by storage.getDeliveryStats (server/storage.ts). */
interface DeliveryStats {
  todayOrders?: number;
  pendingOrders?: number;
  deliveredToday?: number;
  todayRevenue?: number;
}

/** Public origin for links handed to drivers (never localhost). */
function publicOrigin(): string {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host && host !== "localhost" && host !== "127.0.0.1" && !host.endsWith(".replit.dev")) {
      return window.location.origin;
    }
  }
  return "https://kassenta.com";
}

/** tel: and wa.me targets built from the store-normalised number. */
function phoneTargets(raw: string): { tel: string; wa: string | null } {
  const isSyp = getCurrency().toUpperCase() === "SYP";
  const norm = normalizeStorePhone(raw);
  const compact = norm.replace(/[^\d+]/g, "");
  if (isSyp && /^\d+$/.test(norm)) return { tel: `tel:+${norm}`, wa: norm };
  let wa = compact.replace(/^\+/, "").replace(/^00/, "");
  if (/^0\d/.test(compact)) wa = getCurrency().toUpperCase() === "CHF" ? `41${compact.slice(1)}` : "";
  return { tel: `tel:${compact}`, wa: wa && wa.length >= 8 ? wa : null };
}

function notify(title: string, message?: string) {
  if (Platform.OS === "web") {
    try { window.alert(message ? `${title}\n\n${message}` : title); } catch { }
    return;
  }
  Alert.alert(title, message);
}

export default function DriverManagementScreen() {
  const { tenant } = useLicense();
  const { language } = useLanguage();
  const tenantId = (tenant as any)?.id;
  const isRTL = language === "ar";
  // document dir=rtl already mirrors "row" on web — only native needs the flip.
  const flipRow = isRTL && Platform.OS !== "web";
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"list" | "stats">("list");
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const tr = (en: string, de: string, ar: string) => (language === "ar" ? ar : language === "de" ? de : en);
  const locale = language === "ar" ? "ar-u-nu-latn" : language === "de" ? "de-CH" : "en-GB";

  const {
    data: drivers = [], isLoading, isError, error, refetch,
  } = useQuery<Driver[]>({
    queryKey: [`/api/delivery/manage/drivers?tenantId=${tenantId}`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!tenantId,
    refetchInterval: 15000, // react-query never overlaps these refetches
  });

  const { data: deliveryStats, refetch: refetchStats } = useQuery<DeliveryStats>({
    queryKey: [`/api/delivery/manage/stats?tenantId=${tenantId}`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!tenantId,
    refetchInterval: 30000,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    try { await Promise.all([refetch(), refetchStats()]); } finally { setRefreshing(false); }
  };

  const STATUS_META: Record<string, { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
    offline: { label: tr("Offline", "Offline", "غير متصل"), color: Colors.driverOffline, icon: "ellipse" },
    available: { label: tr("Available", "Verfügbar", "متاح"), color: Colors.driverOnline, icon: "checkmark-circle" },
    on_delivery: { label: tr("On delivery", "Unterwegs", "في مهمة"), color: Colors.driverBusy, icon: "bicycle" },
  };

  const list = Array.isArray(drivers) ? drivers : [];
  const onlineDrivers = list.filter(d => (d.driverStatus || "offline") !== "offline");
  const availableCount = list.filter(d => d.driverStatus === "available").length;
  const busyCount = list.filter(d => d.driverStatus === "on_delivery").length;
  const offlineCount = list.filter(d => (d.driverStatus || "offline") === "offline").length;

  const callDriver = (phone?: string | null) => {
    if (!phone) return;
    const { tel } = phoneTargets(phone);
    Linking.openURL(tel).catch(() => notify(tr("Cannot place call", "Anruf nicht möglich", "تعذّر الاتصال"), phone));
  };

  const whatsappDriver = (phone?: string | null) => {
    if (!phone) return;
    const { wa } = phoneTargets(phone);
    if (!wa) { notify(tr("Invalid phone number", "Ungültige Telefonnummer", "رقم هاتف غير صالح"), phone); return; }
    Linking.openURL(`https://wa.me/${wa}`).catch(() => { });
  };

  const shareDriverLink = async (driver: Driver) => {
    if (!driver.driverAccessToken) return;
    const url = `${publicOrigin()}/driver/${driver.driverAccessToken}`;
    if (Platform.OS === "web") {
      try {
        await Clipboard.setStringAsync(url);
        setCopiedId(driver.id);
        setTimeout(() => setCopiedId(c => (c === driver.id ? null : c)), 2000);
      } catch {
        try { window.prompt(tr("Copy the driver app link:", "Fahrer-App-Link kopieren:", "انسخ رابط تطبيق السائق:"), url); } catch { }
      }
      return;
    }
    try {
      await Share.share({ message: url, url });
    } catch {
      try { await Clipboard.setStringAsync(url); setCopiedId(driver.id); } catch { }
    }
  };

  const ratingText = (r: Driver["driverRating"]) => {
    const n = Number(r);
    return (Number.isFinite(n) && n > 0 ? n : 5).toFixed(1);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, flipRow && { flexDirection: "row-reverse" }]}>
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/settings" as any))}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel={tr("Back", "Zurück", "رجوع")}
        >
          <Ionicons name={isRTL ? "chevron-forward" : "chevron-back"} size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isRTL && { textAlign: "right" }]} numberOfLines={1}>
          {tr("Driver Management", "Fahrerverwaltung", "إدارة السائقين")}
        </Text>
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>{tr("LIVE", "LIVE", "مباشر")}</Text>
        </View>
      </View>

      {/* KPI Bar */}
      <View style={[styles.kpiBar, flipRow && { flexDirection: "row-reverse" }]}>
        {[
          { value: availableCount, label: tr("Available", "Verfügbar", "متاح"), color: Colors.driverOnline },
          { value: busyCount, label: tr("On delivery", "Unterwegs", "في مهمة"), color: Colors.driverBusy },
          { value: offlineCount, label: tr("Offline", "Offline", "غير متصل"), color: Colors.driverOffline },
          { value: deliveryStats?.deliveredToday ?? "—", label: tr("Delivered today", "Heute geliefert", "سُلّمت اليوم"), color: Colors.text },
        ].map((k, i) => (
          <React.Fragment key={i}>
            {i > 0 ? <View style={styles.kpiDivider} /> : null}
            <View style={styles.kpiItem}>
              <Text style={[styles.kpiValue, { color: k.color }]}>{k.value}</Text>
              <Text style={styles.kpiLabel} numberOfLines={2}>{k.label}</Text>
            </View>
          </React.Fragment>
        ))}
      </View>

      {/* Tabs */}
      <View style={[styles.tabRow, flipRow && { flexDirection: "row-reverse" }]}>
        {(["list", "stats"] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
            onPress={() => setActiveTab(tab)}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === tab }}
          >
            <Text style={[styles.tabBtnText, activeTab === tab && styles.tabBtnTextActive]}>
              {tab === "list" ? tr("Drivers", "Fahrer", "السائقون") : tr("Stats", "Statistik", "الإحصائيات")}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading && !!tenantId ? (
        <ActivityIndicator color={Colors.deliveryPrimary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollBody}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.deliveryPrimary} />}
        >
          {isError && list.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="cloud-offline-outline" size={40} color={Colors.textMuted} />
              <Text style={styles.emptyText}>{tr("Could not load drivers", "Fahrer konnten nicht geladen werden", "تعذّر تحميل السائقين")}</Text>
              <Text style={styles.emptySubtext}>{apiErrorMessage(error, "")}</Text>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => refetch()}>
                <Ionicons name="refresh" size={16} color={Colors.white} />
                <Text style={styles.primaryBtnText}>{tr("Try again", "Erneut versuchen", "إعادة المحاولة")}</Text>
              </TouchableOpacity>
            </View>
          ) : activeTab === "list" ? (
            <>
              {list.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="car-outline" size={40} color={Colors.textMuted} />
                  <Text style={styles.emptyText}>{tr("No drivers added yet", "Noch keine Fahrer", "لا يوجد سائقون بعد")}</Text>
                  <Text style={styles.emptySubtext}>
                    {tr(
                      "Add a vehicle with a driver name and phone in Settings → Vehicles.",
                      "Fügen Sie unter Einstellungen → Fahrzeuge ein Fahrzeug mit Fahrername und Telefon hinzu.",
                      "أضف مركبة مع اسم السائق ورقم هاتفه من الإعدادات ← المركبات.",
                    )}
                  </Text>
                  <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push("/(tabs)/settings" as any)}>
                    <Ionicons name="settings-outline" size={16} color={Colors.white} />
                    <Text style={styles.primaryBtnText}>{tr("Open Settings", "Einstellungen öffnen", "فتح الإعدادات")}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                list.map(driver => {
                  const meta = STATUS_META[driver.driverStatus || "offline"] || STATUS_META.offline;
                  const lastSeen = driver.locationUpdatedAt
                    ? formatInStoreTz(driver.locationUpdatedAt, locale, { hour: "2-digit", minute: "2-digit" })
                    : "";
                  const vehicle = [
                    [driver.make, driver.model].filter(Boolean).join(" "),
                    driver.color,
                    driver.licensePlate,
                  ].filter(Boolean).join(" · ");
                  const hasGps = driver.currentLat != null && driver.currentLng != null
                    && Number(driver.currentLat) !== 0 && Number(driver.currentLng) !== 0;
                  const hasPhone = !!driver.driverPhone;
                  const wa = hasPhone ? phoneTargets(driver.driverPhone!).wa : null;
                  return (
                    <View key={driver.id} style={styles.driverCard}>
                      <View style={[styles.driverTop, flipRow && { flexDirection: "row-reverse" }]}>
                        <View style={[styles.avatar, { backgroundColor: meta.color + "20" }]}>
                          <Ionicons name={meta.icon} size={22} color={meta.color} />
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={[styles.driverName, isRTL && { textAlign: "right" }]} numberOfLines={1}>{driver.driverName}</Text>
                          <Text style={[styles.driverMeta, isRTL && { textAlign: "right" }]} numberOfLines={1}>
                            {vehicle || "—"}
                          </Text>
                          {hasPhone ? (
                            <Text style={[styles.driverMeta, isRTL && { textAlign: "right" }]} numberOfLines={1}>{driver.driverPhone}</Text>
                          ) : null}
                          <View style={[styles.chipRow, flipRow && { flexDirection: "row-reverse" }]}>
                            <View style={[styles.chip, { backgroundColor: meta.color + "15" }]}>
                              <View style={[styles.chipDot, { backgroundColor: meta.color }]} />
                              <Text style={[styles.chipText, { color: meta.color }]}>{meta.label}</Text>
                            </View>
                            <View style={[styles.chip, { backgroundColor: Colors.loyaltyGold + "15" }]}>
                              <Ionicons name="star" size={10} color={Colors.loyaltyGold} />
                              <Text style={[styles.chipText, { color: Colors.loyaltyGold }]}>{ratingText(driver.driverRating)}</Text>
                            </View>
                            <View style={[styles.chip, { backgroundColor: Colors.info + "15" }]}>
                              <Text style={[styles.chipText, { color: Colors.info }]}>
                                {driver.totalDeliveries ?? 0} {tr("trips", "Fahrten", "رحلة")}
                              </Text>
                            </View>
                          </View>
                          {hasGps ? (
                            <Text style={[styles.gpsText, isRTL && { textAlign: "right" }]}>
                              {Number(driver.currentLat).toFixed(4)}, {Number(driver.currentLng).toFixed(4)}
                              {lastSeen ? ` · ${tr("seen", "gesehen", "آخر ظهور")} ${lastSeen}` : ""}
                            </Text>
                          ) : null}
                          {driver.activeOrderId ? (
                            <Text style={[styles.activeOrder, isRTL && { textAlign: "right" }]}>
                              {tr("Active order", "Aktive Bestellung", "الطلب الحالي")} #{driver.activeOrderId}
                            </Text>
                          ) : null}
                        </View>
                      </View>

                      <View style={[styles.actionRow, flipRow && { flexDirection: "row-reverse" }]}>
                        <TouchableOpacity
                          style={[styles.actionBtn, { backgroundColor: Colors.success + "15" }, !hasPhone && styles.actionBtnDisabled]}
                          onPress={() => callDriver(driver.driverPhone)}
                          disabled={!hasPhone}
                          accessibilityRole="button"
                        >
                          <Ionicons name="call" size={16} color={Colors.success} />
                          <Text style={[styles.actionBtnText, { color: Colors.success }]}>{tr("Call", "Anrufen", "اتصال")}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionBtn, { backgroundColor: "#25D366" + "18" }, !wa && styles.actionBtnDisabled]}
                          onPress={() => whatsappDriver(driver.driverPhone)}
                          disabled={!wa}
                          accessibilityRole="button"
                        >
                          <Ionicons name="logo-whatsapp" size={16} color="#25D366" />
                          <Text style={[styles.actionBtnText, { color: "#25D366" }]}>WhatsApp</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionBtn, { backgroundColor: Colors.deliveryPrimary + "15" }, !driver.driverAccessToken && styles.actionBtnDisabled]}
                          onPress={() => shareDriverLink(driver)}
                          disabled={!driver.driverAccessToken}
                          accessibilityRole="button"
                        >
                          <Ionicons name={copiedId === driver.id ? "checkmark" : "link-outline"} size={16} color={Colors.deliveryPrimary} />
                          <Text style={[styles.actionBtnText, { color: Colors.deliveryPrimary }]} numberOfLines={1}>
                            {copiedId === driver.id
                              ? tr("Copied", "Kopiert", "تم النسخ")
                              : tr("App link", "App-Link", "رابط التطبيق")}
                          </Text>
                        </TouchableOpacity>
                      </View>
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
                  {tr("Today's summary", "Heutige Übersicht", "ملخص اليوم")}
                </Text>
                <View style={{ gap: 4, marginTop: 8 }}>
                  {[
                    { label: tr("Online orders today", "Online-Bestellungen heute", "الطلبات الإلكترونية اليوم"), value: deliveryStats?.todayOrders ?? 0, color: Colors.deliveryPrimary },
                    { label: tr("Pending orders", "Offene Bestellungen", "طلبات قيد الانتظار"), value: deliveryStats?.pendingOrders ?? 0, color: Colors.warning },
                    { label: tr("Delivered today", "Heute geliefert", "سُلّمت اليوم"), value: deliveryStats?.deliveredToday ?? 0, color: Colors.info },
                    { label: tr("Revenue (delivered)", "Umsatz (geliefert)", "الإيرادات (المُسلّمة)"), value: formatMoney(deliveryStats?.todayRevenue ?? 0), color: Colors.success },
                    { label: tr("Drivers online", "Fahrer online", "السائقون المتصلون"), value: onlineDrivers.length, color: Colors.driverOnline },
                  ].map((item, i) => (
                    <View key={i} style={[styles.statRow, flipRow && { flexDirection: "row-reverse" }]}>
                      <Text style={[styles.statLabel, isRTL && { textAlign: "right" }]}>{item.label}</Text>
                      <Text style={[styles.statValue, { color: item.color }]}>{item.value}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {list.length > 0 && (
                <View style={styles.statsCard}>
                  <Text style={[styles.statsTitle, isRTL && { textAlign: "right" }]}>
                    {tr("Driver leaderboard", "Fahrer-Rangliste", "ترتيب السائقين")}
                  </Text>
                  {[...list]
                    .sort((a, b) => (b.totalDeliveries ?? 0) - (a.totalDeliveries ?? 0))
                    .slice(0, 5)
                    .map((driver, i) => (
                      <View key={driver.id} style={[styles.leaderRow, flipRow && { flexDirection: "row-reverse" }, i === 0 && { backgroundColor: Colors.loyaltyGold + "10", borderRadius: 8, paddingHorizontal: 8 }]}>
                        <Text style={[styles.leaderRank, { color: i === 0 ? Colors.loyaltyGold : Colors.textMuted }]}>#{i + 1}</Text>
                        <Text style={[styles.leaderName, { flex: 1 }, isRTL && { textAlign: "right" }]} numberOfLines={1}>{driver.driverName}</Text>
                        <Text style={styles.leaderDeliveries}>{driver.totalDeliveries ?? 0} {tr("trips", "Fahrten", "رحلة")}</Text>
                        <Text style={styles.leaderRating}>{ratingText(driver.driverRating)}★</Text>
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

const styles = themedStyles((Colors) => ({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, gap: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, minWidth: 0, fontSize: 18, fontWeight: "700", color: Colors.text },
  liveIndicator: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: Colors.danger + "15", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.danger },
  liveText: { color: Colors.danger, fontSize: 11, fontWeight: "800" },
  kpiBar: { flexDirection: "row", backgroundColor: Colors.card, paddingVertical: 12, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  kpiItem: { flex: 1, alignItems: "center", paddingHorizontal: 2 },
  kpiValue: { fontSize: 22, fontWeight: "800" },
  kpiLabel: { color: Colors.textMuted, fontSize: 11, marginTop: 2, textAlign: "center" },
  kpiDivider: { width: 1, backgroundColor: Colors.border },
  tabRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: Colors.border },
  tabBtn: { flex: 1, minHeight: 46, alignItems: "center", justifyContent: "center" },
  tabBtnActive: { borderBottomWidth: 2, borderBottomColor: Colors.deliveryPrimary },
  tabBtnText: { color: Colors.textMuted, fontSize: 14, fontWeight: "600" },
  tabBtnTextActive: { color: Colors.deliveryPrimary },
  scrollBody: { padding: 16, gap: 12, width: "100%", maxWidth: 900, alignSelf: "center" },
  emptyState: { alignItems: "center", paddingVertical: 60, gap: 10 },
  emptyText: { color: Colors.textSecondary, fontSize: 15, fontWeight: "600", textAlign: "center" },
  emptySubtext: { color: Colors.textMuted, fontSize: 13, textAlign: "center", paddingHorizontal: 32 },
  primaryBtn: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6, paddingHorizontal: 16, minHeight: 44, borderRadius: 10, backgroundColor: Colors.deliveryPrimary },
  primaryBtnText: { color: Colors.white, fontWeight: "700", fontSize: 14 },
  driverCard: { backgroundColor: Colors.card, borderRadius: 14, padding: 14, gap: 12, borderWidth: 1, borderColor: Colors.cardBorder },
  driverTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", marginTop: 2 },
  driverName: { color: Colors.text, fontSize: 15, fontWeight: "700" },
  driverMeta: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  chipRow: { flexDirection: "row", gap: 6, marginTop: 6, flexWrap: "wrap" },
  chip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  chipDot: { width: 6, height: 6, borderRadius: 3 },
  chipText: { fontSize: 11, fontWeight: "600" },
  gpsText: { color: Colors.textMuted, fontSize: 10, marginTop: 4 },
  activeOrder: { color: Colors.deliveryPrimary, fontSize: 12, fontWeight: "600", marginTop: 3 },
  actionRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  actionBtn: { flexGrow: 1, flexBasis: 90, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, minHeight: 44, borderRadius: 10, paddingHorizontal: 10 },
  actionBtnDisabled: { opacity: 0.4 },
  actionBtnText: { fontSize: 13, fontWeight: "700" },
  statsCard: { backgroundColor: Colors.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: Colors.cardBorder },
  statsTitle: { color: Colors.text, fontSize: 15, fontWeight: "700" },
  statRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border + "60" },
  statLabel: { color: Colors.textSecondary, fontSize: 14, flex: 1, minWidth: 0 },
  statValue: { fontSize: 16, fontWeight: "700" },
  leaderRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  leaderRank: { fontSize: 16, fontWeight: "800", width: 28 },
  leaderName: { color: Colors.text, fontSize: 14, fontWeight: "600", minWidth: 0 },
  leaderDeliveries: { color: Colors.textMuted, fontSize: 12 },
  leaderRating: { color: Colors.textMuted, fontSize: 12 },
}));
