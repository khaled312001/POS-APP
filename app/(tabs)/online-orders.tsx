import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  StyleSheet, Text, View, FlatList, Pressable, ScrollView,
  Alert, Platform, Animated, RefreshControl, Modal, TextInput, KeyboardAvoidingView,
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
  pending: { label: "Pending", labelAr: "انتظار", labelDe: "Ausstehend", color: "#F59E0B", icon: "time-outline", next: "accepted" },
  accepted: { label: "Accepted", labelAr: "مقبول", labelDe: "Angenommen", color: "#3B82F6", icon: "checkmark-circle-outline", next: "preparing" },
  preparing: { label: "Preparing", labelAr: "قيد التحضير", labelDe: "In Zubereitung", color: "#8B5CF6", icon: "flame-outline", next: "ready" },
  ready: { label: "Ready", labelAr: "جاهز", labelDe: "Fertig", color: "#2FD3C6", icon: "bag-check-outline", next: "delivered" },
  delivered: { label: "Delivered", labelAr: "تم التوصيل", labelDe: "Geliefert", color: "#10B981", icon: "checkmark-done-outline" },
  cancelled: { label: "Cancelled", labelAr: "ملغي", labelDe: "Storniert", color: "#EF4444", icon: "close-circle-outline" },
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
  } catch { }
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
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [editForm, setEditForm] = useState({ customerName: "", customerPhone: "", customerAddress: "", notes: "", estimatedTime: "" });
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
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 200, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 200, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 150, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 150, useNativeDriver: Platform.OS !== 'web' }),
      ]).start();
    }
    orders.forEach(o => knownOrderIds.current.add(o.id));
  }, [orders]);

  // WebSocket for instant notifications (web only)
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
        } catch { }
      };
    } catch { }
    return () => ws?.close();
  }, []);

  // Polling fallback for native (iOS/Android) — ensures orders refresh every 15s
  useEffect(() => {
    if (Platform.OS === "web") return;
    const interval = setInterval(() => {
      qc.invalidateQueries({ queryKey: ["/api/online-orders"] });
    }, 15000);
    return () => clearInterval(interval);
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

  const deleteOrder = async (id: number) => {
    Alert.alert(
      language === "ar" ? "حذف الطلب" : language === "de" ? "Bestellung löschen?" : "Delete Order?",
      language === "ar" ? "سيتم حذف هذا الطلب نهائياً" : language === "de" ? "Diese Bestellung wird dauerhaft gelöscht." : "This will permanently delete the order.",
      [
        { text: language === "ar" ? "إلغاء" : language === "de" ? "Abbrechen" : "Cancel", style: "cancel" },
        {
          text: language === "ar" ? "حذف" : language === "de" ? "Löschen" : "Delete", style: "destructive",
          onPress: async () => {
            try {
              await apiRequest("DELETE", `/api/online-orders/${id}`);
              qc.invalidateQueries({ queryKey: ["/api/online-orders"] });
            } catch {
              Alert.alert("Error", "Failed to delete order");
            }
          },
        },
      ]
    );
  };

  const openEditOrder = (order: any) => {
    setEditForm({
      customerName: order.customerName || "",
      customerPhone: order.customerPhone || "",
      customerAddress: order.customerAddress || "",
      notes: order.notes || "",
      estimatedTime: order.estimatedTime ? String(order.estimatedTime) : "",
    });
    setEditingOrder(order);
  };

  const saveEditOrder = async () => {
    if (!editingOrder) return;
    try {
      await apiRequest("PUT", `/api/online-orders/${editingOrder.id}`, {
        customerName: editForm.customerName,
        customerPhone: editForm.customerPhone,
        customerAddress: editForm.customerAddress || null,
        notes: editForm.notes || null,
        estimatedTime: editForm.estimatedTime ? Number(editForm.estimatedTime) : null,
      });
      qc.invalidateQueries({ queryKey: ["/api/online-orders"] });
      setEditingOrder(null);
    } catch {
      Alert.alert("Error", "Failed to update order");
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
      accepted: ["#3B82F6", "#1D4ED8"],
      preparing: ["#8B5CF6", "#6D28D9"],
      ready: ["#2FD3C6", "#0D9488"],
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
            <View key={idx} style={{ marginBottom: 6 }}>
              <View style={[styles.itemRow, isRTL && { flexDirection: "row-reverse" }]}>
                <Text style={styles.itemQty}>{it.quantity}×</Text>
                <Text style={[styles.itemName, { flex: 1 }, isRTL && { textAlign: "right" }]}>{it.name}</Text>
                <Text style={styles.itemPrice}>CHF {Number(it.total).toFixed(2)}</Text>
              </View>
              {it.notes ? (
                <Text style={[styles.itemAddons, isRTL && { textAlign: "right" }]}>↳ {it.notes}</Text>
              ) : null}
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
        <View style={[styles.actions, isRTL && { flexDirection: "row-reverse" }]}>
          {item.status !== "delivered" && item.status !== "cancelled" && next && nextBtnColor[next] && (
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
          {/* Edit button */}
          <Pressable style={styles.editBtn} onPress={() => openEditOrder(item)}>
            <Ionicons name="pencil" size={16} color={Colors.accent} />
          </Pressable>
          {/* Cancel button (active orders only) */}
          {item.status !== "delivered" && item.status !== "cancelled" && (
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
          )}
          {/* Delete button — always visible for all orders */}
          <Pressable style={styles.deleteBtn} onPress={() => deleteOrder(item.id)}>
            <Ionicons name="trash-outline" size={16} color={Colors.danger} />
          </Pressable>
        </View>
      </Animated.View>
    );
  };

  const editLabel = (en: string, ar: string, de: string) =>
    language === "ar" ? ar : language === "de" ? de : en;

  return (
    <View style={styles.container}>
      {/* Edit Order Modal */}
      <Modal visible={!!editingOrder} animationType="slide" transparent onRequestClose={() => setEditingOrder(null)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={styles.modalSheet}>
            <View style={[styles.modalHeader, isRTL && { flexDirection: "row-reverse" }]}>
              <Text style={styles.modalTitle}>{editLabel("Edit Order", "تعديل الطلب", "Bestellung bearbeiten")} #{editingOrder?.orderNumber}</Text>
              <Pressable onPress={() => setEditingOrder(null)}>
                <Ionicons name="close" size={22} color={Colors.textMuted} />
              </Pressable>
            </View>
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
              {[
                { label: editLabel("Customer Name", "اسم العميل", "Kundenname"), key: "customerName", placeholder: "Name" },
                { label: editLabel("Phone", "الهاتف", "Telefon"), key: "customerPhone", placeholder: "+1 234 567" },
                { label: editLabel("Address", "العنوان", "Adresse"), key: "customerAddress", placeholder: "Street, City" },
                { label: editLabel("Estimated Time (min)", "وقت التوصيل (دقيقة)", "Geschätzte Zeit (Min)"), key: "estimatedTime", placeholder: "30" },
                { label: editLabel("Notes", "ملاحظات", "Notizen"), key: "notes", placeholder: "..." },
              ].map(f => (
                <View key={f.key} style={styles.editField}>
                  <Text style={[styles.editLabel, isRTL && { textAlign: "right" }]}>{f.label}</Text>
                  <TextInput
                    style={[styles.editInput, isRTL && { textAlign: "right" }]}
                    value={(editForm as any)[f.key]}
                    onChangeText={v => setEditForm(prev => ({ ...prev, [f.key]: v }))}
                    placeholder={f.placeholder}
                    placeholderTextColor={Colors.textMuted}
                    keyboardType={f.key === "estimatedTime" ? "number-pad" : "default"}
                    multiline={f.key === "notes"}
                  />
                </View>
              ))}
            </ScrollView>
            <View style={[styles.modalFooter, isRTL && { flexDirection: "row-reverse" }]}>
              <Pressable style={styles.modalCancelBtn} onPress={() => setEditingOrder(null)}>
                <Text style={styles.modalCancelText}>{editLabel("Cancel", "إلغاء", "Abbrechen")}</Text>
              </Pressable>
              <Pressable style={styles.modalSaveBtn} onPress={saveEditOrder}>
                <Text style={styles.modalSaveText}>{editLabel("Save Changes", "حفظ", "Speichern")}</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

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
              { key: "done", labelEn: "Done", labelAr: "المكتملة", labelDe: "Erledigt" },
              { key: "all", labelEn: "All", labelAr: "الكل", labelDe: "Alle" },
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
    elevation: 6,
    ...(Platform.OS === "web" ? { boxShadow: "0px 0px 8px rgba(245,158,11,0.25)" } as any : { shadowColor: "#F59E0B", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.25, shadowRadius: 8 }),
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
  itemAddons: { color: Colors.textMuted, fontSize: 11, marginLeft: 32, marginTop: 2, fontStyle: "italic" },
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
  editBtn: {
    width: 42, height: 42, borderRadius: 10,
    backgroundColor: "rgba(47,211,198,0.1)",
    borderWidth: 1, borderColor: "rgba(47,211,198,0.3)",
    justifyContent: "center", alignItems: "center",
  },
  cancelBtn: {
    width: 42, height: 42, borderRadius: 10,
    backgroundColor: "rgba(239,68,68,0.1)",
    borderWidth: 1, borderColor: "rgba(239,68,68,0.3)",
    justifyContent: "center", alignItems: "center",
  },
  deleteBtn: {
    width: 42, height: 42, borderRadius: 10,
    backgroundColor: "rgba(239,68,68,0.1)",
    borderWidth: 1, borderColor: "rgba(239,68,68,0.3)",
    justifyContent: "center", alignItems: "center",
  },
  // Edit Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, maxHeight: "85%",
  },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { color: Colors.text, fontWeight: "800", fontSize: 16 },
  editField: { marginBottom: 14 },
  editLabel: { color: Colors.textMuted, fontSize: 11, fontWeight: "600", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  editInput: {
    backgroundColor: Colors.background,
    borderWidth: 1, borderColor: Colors.cardBorder,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    color: Colors.text, fontSize: 14,
  },
  modalFooter: { flexDirection: "row", gap: 10, marginTop: 16 },
  modalCancelBtn: {
    flex: 1, paddingVertical: 13, borderRadius: 10,
    borderWidth: 1, borderColor: Colors.cardBorder,
    alignItems: "center",
  },
  modalCancelText: { color: Colors.textMuted, fontWeight: "600", fontSize: 14 },
  modalSaveBtn: {
    flex: 2, paddingVertical: 13, borderRadius: 10,
    backgroundColor: Colors.accent, alignItems: "center",
  },
  modalSaveText: { color: "#000", fontWeight: "800", fontSize: 14 },
  emptyState: { alignItems: "center", paddingTop: 80, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { color: Colors.text, fontSize: 18, fontWeight: "800", marginBottom: 8 },
  emptyText: { color: Colors.textMuted, fontSize: 13, textAlign: "center", lineHeight: 20 },
});
