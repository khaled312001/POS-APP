import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  StyleSheet, Text, View, FlatList, Pressable, ScrollView,
  Alert, Platform, Animated, RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Colors } from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";
import { useLicense } from "@/lib/license-context";
import { apiRequest, getQueryFn, getApiUrl } from "@/lib/query-client";
import { useLanguage } from "@/lib/language-context";
import * as Haptics from "expo-haptics";

const STATUS_FLOW = ["pending", "accepted", "preparing", "ready", "delivered"];

const STATUS_META: Record<string, { label: string; labelAr: string; labelDe: string; color: string; icon: string; next?: string }> = {
  pending:   { label: "Pending",   labelAr: "انتظار",      labelDe: "Ausstehend",     color: "#F59E0B", icon: "time-outline",         next: "accepted" },
  accepted:  { label: "Accepted",  labelAr: "مقبول",       labelDe: "Angenommen",     color: "#3B82F6", icon: "checkmark-circle-outline", next: "preparing" },
  preparing: { label: "Preparing", labelAr: "قيد التحضير", labelDe: "In Zubereitung", color: "#8B5CF6", icon: "flame-outline",         next: "ready" },
  ready:     { label: "Ready",     labelAr: "جاهز",        labelDe: "Fertig",          color: "#2FD3C6", icon: "bag-check-outline",    next: "delivered" },
  delivered: { label: "Delivered", labelAr: "تم التوصيل",  labelDe: "Geliefert",       color: "#10B981", icon: "checkmark-done-outline" },
  cancelled: { label: "Cancelled", labelAr: "ملغي",        labelDe: "Storniert",       color: "#EF4444", icon: "close-circle-outline" },
};

const PAY_ICON: Record<string, string> = { cash: "💵", card: "💳", mobile: "📱" };

function playNotificationSound() {
  if (Platform.OS !== "web") return;
  try {
    const ctx = new (window as any).AudioContext();
    const times = [0, 0.15, 0.3];
    times.forEach((t, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = i === 0 ? 880 : i === 1 ? 1100 : 1320;
      gain.gain.setValueAtTime(0.35, ctx.currentTime + t);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.3);
      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime + t + 0.3);
    });
  } catch {}
}

export default function OnlineOrdersScreen() {
  const insets = useSafeAreaInsets();
  const { tenant } = useLicense();
  const { language } = useLanguage();
  const qc = useQueryClient();
  const tenantId = tenant?.id;
  const [filter, setFilter] = useState<string>("active");
  const [refreshing, setRefreshing] = useState(false);
  const [newOrderIds, setNewOrderIds] = useState<Set<number>>(new Set());
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const knownOrderIds = useRef<Set<number>>(new Set());

  const isRTL = language === "ar";

  const { data: orders = [], refetch } = useQuery<any[]>({
    queryKey: ["/api/online-orders", tenantId ? `?tenantId=${tenantId}` : ""],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!tenantId,
    refetchInterval: 15000,
  });

  // Detect new orders and play sound
  useEffect(() => {
    if (!orders.length) return;
    const incoming = orders.filter(o => !knownOrderIds.current.has(o.id) && o.status === "pending");
    if (incoming.length > 0) {
      playNotificationSound();
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      setNewOrderIds(prev => {
        const next = new Set(prev);
        incoming.forEach(o => next.add(o.id));
        return next;
      });
      // Pulse animation
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 150, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]).start();
    }
    orders.forEach(o => knownOrderIds.current.add(o.id));
  }, [orders]);

  // WebSocket for instant notifications
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const wsUrl = `${getApiUrl().replace("http", "ws")}/api/ws/caller-id`;
    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl);
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "new_online_order") {
            playNotificationSound();
            qc.invalidateQueries({ queryKey: ["/api/online-orders"] });
            setNewOrderIds(prev => {
              const next = new Set(prev);
              next.add(data.order?.id);
              return next;
            });
          } else if (data.type === "online_order_updated") {
            qc.invalidateQueries({ queryKey: ["/api/online-orders"] });
          }
        } catch {}
      };
    } catch {}
    return () => ws?.close();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const updateStatus = async (id: number, status: string) => {
    try {
      await apiRequest("PUT", `/api/online-orders/${id}`, { status });
      qc.invalidateQueries({ queryKey: ["/api/online-orders"] });
      setNewOrderIds(prev => { const next = new Set(prev); next.delete(id); return next; });
    } catch {
      Alert.alert("Error", "Failed to update order status");
    }
  };

  const filteredOrders = orders.filter((o: any) => {
    if (filter === "active") return ["pending", "accepted", "preparing", "ready"].includes(o.status);
    if (filter === "done") return ["delivered", "cancelled"].includes(o.status);
    return true;
  });

  const pendingCount = orders.filter((o: any) => o.status === "pending").length;

  const s = (key: string) => {
    const meta = STATUS_META[key];
    if (!meta) return key;
    if (language === "ar") return meta.labelAr;
    if (language === "de") return meta.labelDe;
    return meta.label;
  };

  const renderOrder = ({ item }: { item: any }) => {
    const meta = STATUS_META[item.status] || STATUS_META.pending;
    const isNew = newOrderIds.has(item.id);
    const orderDate = new Date(item.createdAt);
    const next = meta.next;

    const nextLabel = next ? s(next) : null;

    const nextBtnColor: Record<string, string[]> = {
      accepted:  ["#3B82F6", "#1D4ED8"],
      preparing: ["#8B5CF6", "#6D28D9"],
      ready:     ["#2FD3C6", "#0D9488"],
      delivered: ["#10B981", "#059669"],
    };

    return (
      <Animated.View style={[
        styles.orderCard,
        isNew && styles.orderCardNew,
        { borderLeftColor: meta.color, transform: isNew ? [{ scale: pulseAnim }] : [] },
      ]}>
        {/* Header */}
        <View style={[styles.orderHeader, isRTL && { flexDirection: "row-reverse" }]}>
          <View style={[styles.orderNumRow, isRTL && { flexDirection: "row-reverse" }]}>
            {isNew && <View style={styles.newDot} />}
            <Text style={styles.orderNum}>#{item.orderNumber}</Text>
            <View style={[styles.statusBadge, { backgroundColor: meta.color + "22", borderColor: meta.color }]}>
              <Ionicons name={meta.icon as any} size={11} color={meta.color} />
              <Text style={[styles.statusText, { color: meta.color }]}>{s(item.status)}</Text>
            </View>
          </View>
          <Text style={styles.orderAmount}>CHF {Number(item.totalAmount).toFixed(2)}</Text>
        </View>

        {/* Customer */}
        <View style={[styles.customerRow, isRTL && { flexDirection: "row-reverse" }]}>
          <View style={styles.customerIcon}>
            <Ionicons name="person" size={14} color={Colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.customerName, isRTL && { textAlign: "right" }]}>{item.customerName}</Text>
            <Text style={[styles.customerSub, isRTL && { textAlign: "right" }]}>
              {item.customerPhone}
              {item.customerAddress ? ` • ${item.customerAddress}` : ""}
            </Text>
          </View>
          <View style={styles.metaChips}>
            <View style={styles.metaChip}>
              <Text style={styles.metaChipText}>{PAY_ICON[item.paymentMethod] || "💵"} {item.paymentMethod?.toUpperCase()}</Text>
            </View>
            <View style={[styles.metaChip, { backgroundColor: item.orderType === "delivery" ? "rgba(99,102,241,0.15)" : "rgba(16,185,129,0.15)" }]}>
              <Text style={styles.metaChipText}>{item.orderType === "delivery" ? "🛵" : "🏃"} {item.orderType}</Text>
            </View>
          </View>
        </View>

        {/* Items */}
        <View style={styles.itemsList}>
          {(item.items || []).map((it: any, idx: number) => (
            <View key={idx} style={[styles.itemRow, isRTL && { flexDirection: "row-reverse" }]}>
              <Text style={styles.itemQty}>{it.quantity}×</Text>
              <Text style={[styles.itemName, { flex: 1 }, isRTL && { textAlign: "right" }]} numberOfLines={1}>{it.name}</Text>
              <Text style={styles.itemPrice}>CHF {Number(it.total).toFixed(2)}</Text>
            </View>
          ))}
          {item.notes ? (
            <Text style={[styles.orderNotes, isRTL && { textAlign: "right" }]}>📝 {item.notes}</Text>
          ) : null}
        </View>

        {/* Totals */}
        <View style={[styles.totalsRow, isRTL && { flexDirection: "row-reverse" }]}>
          <Text style={styles.timeText}>
            {orderDate.toLocaleDateString()} {orderDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </Text>
          <View style={[{ flexDirection: isRTL ? "row-reverse" : "row", gap: 4 }]}>
            {item.deliveryFee && Number(item.deliveryFee) > 0 ? (
              <Text style={styles.feeText}>+CHF {Number(item.deliveryFee).toFixed(2)} delivery</Text>
            ) : null}
          </View>
        </View>

        {/* Actions */}
        {item.status !== "delivered" && item.status !== "cancelled" && (
          <View style={[styles.actions, isRTL && { flexDirection: "row-reverse" }]}>
            {next && nextBtnColor[next] && (
              <Pressable
                style={{ flex: 1, borderRadius: 10, overflow: "hidden" }}
                onPress={() => updateStatus(item.id, next)}
              >
                <LinearGradient
                  colors={nextBtnColor[next] as [string, string]}
                  style={styles.actionBtnPrimary}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                >
                  <Ionicons name={STATUS_META[next]?.icon as any || "arrow-forward"} size={16} color="#fff" />
                  <Text style={styles.actionBtnText}>
                    {language === "ar" ? STATUS_META[next]?.labelAr : language === "de" ? STATUS_META[next]?.labelDe : STATUS_META[next]?.label}
                  </Text>
                </LinearGradient>
              </Pressable>
            )}
            <Pressable
              style={styles.cancelBtn}
              onPress={() => Alert.alert(
                language === "ar" ? "إلغاء الطلب" : language === "de" ? "Stornieren?" : "Cancel Order?",
                language === "ar" ? "هل أنت متأكد؟" : language === "de" ? "Sind Sie sicher?" : "Are you sure?",
                [
                  { text: language === "ar" ? "لا" : language === "de" ? "Nein" : "No", style: "cancel" },
                  { text: language === "ar" ? "إلغاء" : language === "de" ? "Stornieren" : "Cancel", style: "destructive", onPress: () => updateStatus(item.id, "cancelled") },
                ]
              )}
            >
              <Ionicons name="close" size={18} color={Colors.danger} />
            </Pressable>
          </View>
        )}
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <LinearGradient colors={["#1E1B4B", "#312E81", "#0A0E27"]} style={styles.headerGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={[styles.headerContent, isRTL && { flexDirection: "row-reverse" }]}>
            <View>
              <Text style={[styles.headerTitle, isRTL && { textAlign: "right" }]}>
                {language === "ar" ? "الطلبات الإلكترونية" : language === "de" ? "Online-Bestellungen" : "Online Orders"}
              </Text>
              <Text style={[styles.headerSub, isRTL && { textAlign: "right" }]}>
                {pendingCount > 0
                  ? (language === "ar" ? `${pendingCount} طلب جديد بانتظار الموافقة` : language === "de" ? `${pendingCount} neue Bestellung(en)` : `${pendingCount} new order${pendingCount > 1 ? "s" : ""} awaiting`)
                  : (language === "ar" ? "لا توجد طلبات جديدة" : language === "de" ? "Keine neuen Bestellungen" : "No new orders")}
              </Text>
            </View>
            {pendingCount > 0 && (
              <Animated.View style={[styles.pendingBadge, { transform: [{ scale: pulseAnim }] }]}>
                <Text style={styles.pendingBadgeText}>{pendingCount}</Text>
              </Animated.View>
            )}
          </View>

          {/* Filter tabs */}
          <View style={[styles.filterRow, isRTL && { flexDirection: "row-reverse" }]}>
            {[
              { key: "active", labelEn: "Active", labelAr: "النشطة", labelDe: "Aktiv" },
              { key: "done",   labelEn: "Done",   labelAr: "المكتملة", labelDe: "Erledigt" },
              { key: "all",    labelEn: "All",    labelAr: "الكل",    labelDe: "Alle" },
            ].map(f => (
              <Pressable
                key={f.key}
                onPress={() => setFilter(f.key)}
                style={[styles.filterTab, filter === f.key && styles.filterTabActive]}
              >
                <Text style={[styles.filterTabText, filter === f.key && styles.filterTabTextActive]}>
                  {language === "ar" ? f.labelAr : language === "de" ? f.labelDe : f.labelEn}
                  {f.key === "active" && pendingCount > 0 ? ` (${pendingCount})` : ""}
                </Text>
              </Pressable>
            ))}
          </View>
        </LinearGradient>
      </View>

      {/* Orders list */}
      <FlatList
        data={filteredOrders}
        keyExtractor={(item: any) => String(item.id)}
        renderItem={renderOrder}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🌐</Text>
            <Text style={styles.emptyTitle}>
              {language === "ar" ? "لا توجد طلبات" : language === "de" ? "Keine Bestellungen" : "No orders yet"}
            </Text>
            <Text style={styles.emptyText}>
              {language === "ar" ? "ستظهر الطلبات الإلكترونية هنا فور وصولها"
                : language === "de" ? "Online-Bestellungen erscheinen hier sofort"
                : "Online orders will appear here in real time"}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { overflow: "hidden" },
  headerGrad: { paddingHorizontal: 16, paddingBottom: 0 },
  headerContent: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 16, paddingBottom: 12 },
  headerTitle: { color: "#fff", fontSize: 22, fontWeight: "800" },
  headerSub: { color: "rgba(255,255,255,0.6)", fontSize: 12, marginTop: 2 },
  pendingBadge: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.danger,
    justifyContent: "center", alignItems: "center",
    borderWidth: 2, borderColor: "rgba(255,255,255,0.3)",
  },
  pendingBadgeText: { color: "#fff", fontWeight: "900", fontSize: 18 },
  filterRow: { flexDirection: "row", gap: 8, paddingBottom: 12 },
  filterTab: {
    paddingHorizontal: 18, paddingVertical: 8, borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
  },
  filterTabActive: { backgroundColor: Colors.accent + "22", borderColor: Colors.accent },
  filterTabText: { color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: "600" },
  filterTabTextActive: { color: Colors.accent },
  listContent: { padding: 12, paddingBottom: 100, gap: 12 },

  orderCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: Colors.cardBorder,
    borderLeftWidth: 4,
  },
  orderCardNew: {
    borderColor: "#F59E0B",
    shadowColor: "#F59E0B",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  newDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: "#F59E0B", marginRight: 6,
  },
  orderHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  orderNumRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  orderNum: { color: Colors.text, fontWeight: "800", fontSize: 15 },
  statusBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 999, borderWidth: 1,
  },
  statusText: { fontSize: 11, fontWeight: "700" },
  orderAmount: { color: Colors.accent, fontWeight: "900", fontSize: 17 },

  customerRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 10 },
  customerIcon: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: "rgba(47,211,198,0.12)",
    justifyContent: "center", alignItems: "center",
  },
  customerName: { color: Colors.text, fontWeight: "700", fontSize: 13 },
  customerSub: { color: Colors.textMuted, fontSize: 11, marginTop: 1 },
  metaChips: { flexDirection: "column", gap: 4, alignItems: "flex-end" },
  metaChip: {
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6,
  },
  metaChipText: { color: Colors.textSecondary, fontSize: 10, fontWeight: "600" },

  itemsList: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 10, padding: 10, marginBottom: 10, gap: 5,
  },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  itemQty: { color: Colors.accent, fontWeight: "700", fontSize: 12, minWidth: 24 },
  itemName: { color: Colors.textSecondary, fontSize: 12 },
  itemPrice: { color: Colors.text, fontWeight: "600", fontSize: 12 },
  orderNotes: { color: Colors.warning, fontSize: 11, marginTop: 6 },

  totalsRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  timeText: { color: Colors.textMuted, fontSize: 11 },
  feeText: { color: Colors.textMuted, fontSize: 11 },

  actions: { flexDirection: "row", gap: 8 },
  actionBtnPrimary: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 11, paddingHorizontal: 16, borderRadius: 10,
  },
  actionBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  cancelBtn: {
    width: 42, height: 42, borderRadius: 10,
    backgroundColor: "rgba(239,68,68,0.1)",
    borderWidth: 1, borderColor: "rgba(239,68,68,0.3)",
    justifyContent: "center", alignItems: "center",
  },
  emptyState: { alignItems: "center", paddingTop: 80, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { color: Colors.text, fontSize: 18, fontWeight: "800", marginBottom: 8 },
  emptyText: { color: Colors.textMuted, fontSize: 13, textAlign: "center", lineHeight: 20 },
});
