import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Text, View, FlatList, Pressable, ScrollView,
  Alert, Platform, Animated, RefreshControl, Modal, TextInput, KeyboardAvoidingView,
  Image, useWindowDimensions, ActivityIndicator, Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Colors } from "@/constants/colors";
import { themedStyles } from "@/lib/themed-styles";
import { useLicense } from "@/lib/license-context";
import { apiRequest, getQueryFn, getApiUrl, apiErrorMessage } from "@/lib/query-client";
import { getDisplayNumber } from "@/lib/api-config";
import { useLanguage } from "@/lib/language-context";
import { cloneOrderItems, normalizeOrderItems } from "@/lib/order-items";
import { playClickSound } from "@/lib/sound";
import { autoPrint3Copies } from "@/utils/printing";
import { getChromeMetrics } from "@/lib/responsive";
import { getWebStaticFallbackChain } from "@/lib/web-static";
import TabPageHeader from "@/components/tab-page-header";
import {
  PIZZA_TOPPINGS, TOPPING_GRID, SAUCE_ROW, SAUCE_NAMES,
  getToppingDisplayName, getToppingEmoji,
} from "@/utils/toppingUtils";
import DriverAssignModal from "@/components/DriverAssignModal";
import TrackingLinkButton from "@/components/TrackingLinkButton";
import ScheduledOrderBadge from "@/components/ScheduledOrderBadge";
import { formatMoney, formatAmount, isZeroDecimalCurrency, getCurrency } from "@/lib/currency";
import { normalizeStorePhone, isValidStorePhone, storePhonePlaceholder, formatInStoreTz } from "@/components/store-locale";

type StatusMeta = { label: string; labelAr: string; labelDe: string; color: string; icon: string; next?: string };

// Built per render: `Colors` is a live view onto the active theme, so a
// module-scope table would freeze the palette that was active at import time.
// Status values mirror online_orders.status on the server: pending → accepted →
// preparing → ready → (on_way, set by the driver app) → delivered, or cancelled.
// POS sales use completed / refunded.
function getStatusMeta(): Record<string, StatusMeta> {
  return {
    pending: { label: "Pending", labelAr: "قيد الانتظار", labelDe: "Ausstehend", color: Colors.hueAmber, icon: "time-outline", next: "accepted" },
    accepted: { label: "Accepted", labelAr: "مقبول", labelDe: "Angenommen", color: "#3B82F6", icon: "checkmark-circle-outline", next: "preparing" },
    preparing: { label: "Preparing", labelAr: "قيد التحضير", labelDe: "In Zubereitung", color: Colors.hueViolet, icon: "flame-outline", next: "ready" },
    ready: { label: "Ready", labelAr: "جاهز", labelDe: "Fertig", color: Colors.hueTeal, icon: "bag-check-outline", next: "delivered" },
    on_way: { label: "On the way", labelAr: "في الطريق", labelDe: "Unterwegs", color: Colors.statusOnWay, icon: "bicycle-outline", next: "delivered" },
    delivered: { label: "Delivered", labelAr: "تم التوصيل", labelDe: "Geliefert", color: "#10B981", icon: "checkmark-done-outline" },
    cancelled: { label: "Cancelled", labelAr: "ملغي", labelDe: "Storniert", color: Colors.hueRose, icon: "close-circle-outline" },
    completed: { label: "Completed", labelAr: "مكتمل", labelDe: "Abgeschlossen", color: "#10B981", icon: "checkmark-done-outline" },
    refunded: { label: "Refunded", labelAr: "مسترد", labelDe: "Erstattet", color: Colors.hueRose, icon: "return-down-back-outline" },
  };
}

const ACTIVE_STATUSES = ["pending", "accepted", "preparing", "ready", "on_way"];
const DONE_STATUSES = ["delivered", "cancelled", "completed", "refunded"];

function notify(title: string, message?: string) {
  if (Platform.OS === "web") {
    try { window.alert(message ? `${title}\n\n${message}` : title); } catch { }
    return;
  }
  Alert.alert(title, message);
}

/** Alert.alert with buttons is a no-op on react-native-web, so web uses window.confirm. */
function confirmAsync(title: string, message: string, confirmText: string, cancelText: string): Promise<boolean> {
  if (Platform.OS === "web") {
    try { return Promise.resolve(window.confirm(`${title}\n\n${message}`)); } catch { return Promise.resolve(false); }
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: cancelText, style: "cancel", onPress: () => resolve(false) },
      { text: confirmText, style: "destructive", onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) });
  });
}

/** tel: and wa.me targets from the store-normalised number (SYP → 9639xxxxxxxx). */
function phoneTargets(raw: string): { tel: string; wa: string | null } {
  const isSyp = getCurrency().toUpperCase() === "SYP";
  const norm = normalizeStorePhone(raw);
  const compact = norm.replace(/[^\d+]/g, "");
  if (isSyp && /^\d+$/.test(norm)) return { tel: `tel:+${norm}`, wa: norm };
  let wa = compact.replace(/^\+/, "").replace(/^00/, "");
  if (/^0\d/.test(compact)) wa = getCurrency().toUpperCase() === "CHF" ? `41${compact.slice(1)}` : "";
  return { tel: `tel:${compact}`, wa: wa && wa.length >= 8 ? wa : null };
}

/** Money for API payloads: whole units for zero-decimal currencies (SYP). */
function moneyStr(n: number): string {
  const v = Number.isFinite(n) ? n : 0;
  return isZeroDecimalCurrency() ? String(Math.round(v)) : v.toFixed(2);
}

const PAY_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  cash: "cash-outline", card: "card-outline", stripe: "card-outline", mobile: "phone-portrait-outline",
  shamcash: "wallet-outline", wallet: "wallet-outline", transfer: "swap-horizontal-outline",
};

function FallbackOrderImage({ uri, style }: { uri: string; style: any }) {
  const fallbacks = getWebStaticFallbackChain(uri);
  const [currentUri, setCurrentUri] = useState(fallbacks[0] || uri);

  useEffect(() => {
    setCurrentUri(fallbacks[0] || uri);
  }, [uri]);

  return (
    <Image
      source={{ uri: currentUri }}
      style={style}
      resizeMode="cover"
      onError={() => {
        const currentIndex = fallbacks.indexOf(currentUri);
        const nextUri = fallbacks[currentIndex + 1];
        if (nextUri && nextUri !== currentUri) {
          setCurrentUri(nextUri);
        }
      }}
    />
  );
}

// One shared AudioContext: browsers cap how many can exist, so creating a new
// one per chime eventually fails silently.
let notifAudioCtx: any = null;
function playNotificationSound() {
  if (Platform.OS !== "web" || typeof window === "undefined") return;
  try {
    const Ctor = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctor) return;
    if (!notifAudioCtx || notifAudioCtx.state === "closed") notifAudioCtx = new Ctor();
    const ctx = notifAudioCtx;
    if (ctx.state === "suspended") ctx.resume?.().catch?.(() => { });
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


export default function OrdersScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { tenant } = useLicense();
  const { language } = useLanguage();
  const qc = useQueryClient();
  const tenantId = tenant?.id;

  const [viewMode, setViewMode] = useState<"online" | "pos" | "dine_in" | "all">("all");
  const [filter, setFilter] = useState<string>("all");
  const [orderTypeFilter, setOrderTypeFilter] = useState<string>("all_types");
  const [driverAssignOrderId, setDriverAssignOrderId] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [newOrderIds, setNewOrderIds] = useState<Set<number>>(new Set());
  const [busyOrderIds, setBusyOrderIds] = useState<Set<number>>(new Set());
  const knownOrderIds = useRef<Set<string>>(new Set());
  const ordersSeeded = useRef(false);
  const announcedOrderIds = useRef<Set<number>>(new Set());
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Edit state (unified for both types)
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState<{
    customerName: string;
    customerPhone: string;
    customerAddress: string;
    notes: string;
    estimatedTime: string;
    items: any[];
    subtotal: number;
    deliveryFee: number;
    /** Discount / tax / wallet part of the original total, kept when items change. */
    adjustment: number;
    totalAmount: number;
  }>({
    customerName: "", customerPhone: "", customerAddress: "",
    notes: "", estimatedTime: "", items: [],
    subtotal: 0, deliveryFee: 0, adjustment: 0, totalAmount: 0,
  });

  const isRTL = language === "ar";
  // document dir=rtl already mirrors "row" on web; flipping again would undo it.
  const flipRow = isRTL && Platform.OS !== "web";
  const { topPad, bottomPad } = getChromeMetrics(width);
  const lbl = (en: string, ar: string, de: string) =>
    language === "ar" ? ar : language === "de" ? de : en;
  const dateLocale = language === "ar" ? "ar-u-nu-latn" : language === "de" ? "de-CH" : "en-GB";
  const STATUS_META = getStatusMeta();

  // ── Chat state — restaurant-side chat for an active order ──
  const [chatOrder, setChatOrder] = useState<{ id: number; label: string } | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatRoomId, setChatRoomId] = useState<number | null>(null);
  const [chatDraft, setChatDraft] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [chatSending, setChatSending] = useState(false);
  const chatRoomOrderId = chatOrder?.id ?? null;
  // The realtime handler is registered once per tenant; it reads the open chat
  // through this ref (a plain closure would always see "no chat open").
  const chatOrderIdRef = useRef<number | null>(null);
  chatOrderIdRef.current = chatRoomOrderId;
  // Bodies this device just sent: their server echo must not be appended twice.
  const sentChatBodies = useRef<Map<string, number>>(new Map());

  const openChat = async (order: any) => {
    setChatOrder({ id: order.id, label: `#${getDisplayNumber(order.orderNumber) || order.id}` });
    setChatMessages([]);
    setChatRoomId(null);
    setChatError(null);
    setChatLoading(true);
    if (!tenantId) { setChatLoading(false); return; }
    try {
      // Ensure a room exists (created on demand if the customer hasn't written yet).
      const ensureRes = await apiRequest("POST", `/api/chat/order/${order.id}/ensure?tenantId=${tenantId}`);
      const ensureData = await ensureRes.json();
      const room = ensureData.room;
      if (!room) return;
      setChatRoomId(room.id);
      const msgsRes = await apiRequest("GET", `/api/chat/rooms/${room.id}/messages?tenantId=${tenantId}`);
      const msgsData = await msgsRes.json();
      setChatMessages(msgsData.messages || []);
    } catch (e) {
      setChatError(apiErrorMessage(e, lbl("Could not load the chat", "تعذّر تحميل المحادثة", "Chat konnte nicht geladen werden")));
    } finally { setChatLoading(false); }
  };

  const sendChatMessage = async () => {
    if (!chatDraft.trim() || !chatRoomId || !tenantId || chatSending) return;
    const body = chatDraft.trim();
    const senderName = storeSettings?.storeName || storeSettings?.name || tenant?.name || "Restaurant";
    setChatSending(true);
    sentChatBodies.current.set(body, Date.now());
    try {
      await apiRequest("POST", `/api/chat/rooms/${chatRoomId}/messages?tenantId=${tenantId}`, {
        body,
        senderName,
        senderType: "tenant",
      });
      setChatDraft("");
      setChatMessages((m) => [...m, { senderType: "tenant", senderName, body, createdAt: new Date().toISOString() }]);
    } catch (e: any) {
      sentChatBodies.current.delete(body);
      notify(lbl("Message not sent", "لم تُرسل الرسالة", "Nachricht nicht gesendet"), apiErrorMessage(e));
    } finally {
      setChatSending(false);
    }
  };

  const [showProductPicker, setShowProductPicker] = useState(false);
  const [pickerCategory, setPickerCategory] = useState<string>("all");
  const [pickerSearch, setPickerSearch] = useState("");
  const [showFreeExtrasModal, setShowFreeExtrasModal] = useState(false);
  const [freeExtrasSelected, setFreeExtrasSelected] = useState<string[]>([]);

  // Product configurator states
  const [configuringProduct, setConfiguringProduct] = useState<any>(null);
  const [configuringItemIndex, setConfiguringItemIndex] = useState<number | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [selectedToppings, setSelectedToppings] = useState<string[]>([]);
  const [showToppingsStep, setShowToppingsStep] = useState(false);

  // --- Data Queries ---
  const { data: onlineOrders = [], refetch: refetchOnline, isError: onlineError, error: onlineErrorObj, isSuccess: onlineSuccess } = useQuery<any[]>({
    queryKey: ["/api/online-orders", tenantId ? `?tenantId=${tenantId}` : ""],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!tenantId,
    refetchInterval: 15000,
  });

  const { data: posOrders = [], refetch: refetchPos } = useQuery<any[]>({
    queryKey: ["/api/sales", tenantId ? `?tenantId=${tenantId}&limit=100` : ""],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!tenantId,
    refetchInterval: 30000,
  });

  const { data: allProducts = [] } = useQuery<any[]>({
    queryKey: ["/api/products", tenantId ? `?tenantId=${tenantId}&applyMarkup=true` : ""],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!tenantId,
  });

  const { data: allCategories = [] } = useQuery<any[]>({
    queryKey: ["/api/categories", tenantId ? `?tenantId=${tenantId}` : ""],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!tenantId,
  });

  const { data: storeSettings } = useQuery<any>({
    queryKey: ["/api/store-settings", tenantId ? `?tenantId=${tenantId}` : ""],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!tenantId,
  });

  // Driver roster (same cache key as the Driver Management screen) — used to
  // show who is on a delivery order.
  const driversKey = `/api/delivery/manage/drivers?tenantId=${tenantId}`;
  const { data: drivers = [] } = useQuery<any[]>({
    queryKey: [driversKey],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!tenantId,
    staleTime: 30000,
  });
  const driverNameById = new Map<number, string>();
  (Array.isArray(drivers) ? drivers : []).forEach((d: any) => driverNameById.set(Number(d.id), d.driverName || ""));

  // Build category map for lookup
  const categoryMap: Record<number, { name: string; color: string; image?: string }> = {};
  (allCategories as any[]).forEach((c: any) => {
    categoryMap[c.id] = { name: c.name, color: c.color || "#7C3AED", image: c.image };
  });

  // Enrich products with category info
  const enrichedProducts = (allProducts as any[]).map((p: any) => {
    let variants = p.variants;
    if ((!p.variants || p.variants.length === 0) && p.modifiers && Array.isArray(p.modifiers) && p.modifiers.length > 0) {
      const sizeGroup = p.modifiers.find((m: any) => m.required === true);
      if (sizeGroup?.options?.length > 0) {
        const basePrice = Number(p.price);
        variants = sizeGroup.options.map((opt: any) => ({
          name: opt.label,
          price: basePrice + Number(opt.price),
        }));
      }
    }
    return {
      ...p,
      variants,
      categoryName: (allCategories as any[]).find((c: any) => c.id === p.categoryId)?.name || "Other",
      categoryColor: (allCategories as any[]).find((c: any) => c.id === p.categoryId)?.color || "#7C3AED",
    };
  });

  const normalizedOnlineOrders = (onlineOrders as any[]).map((order) => ({
    ...order,
    items: normalizeOrderItems(order?.items),
  }));

  // Normalize both sources into unified list
  const unifiedOrders = [
    ...normalizedOnlineOrders.map(o => ({ ...o, _type: "online" as const, _sortTime: new Date(o.createdAt).getTime() })),
    ...(posOrders as any[]).map(s => ({ ...s, _type: "pos" as const, _sortTime: new Date(s.createdAt).getTime(), status: s.status || "completed" })),
  ].sort((a, b) => b._sortTime - a._sortTime);

  // Filter
  const filteredOrders = unifiedOrders.filter(o => {
    if (viewMode === "online" && o._type !== "online") return false;
    if (viewMode === "pos" && o._type !== "pos") return false;
    if (viewMode === "dine_in" && (o._type !== "online" || o.orderType !== "dine_in")) return false;
    // Status and order-type filters combine (they used to short-circuit each other).
    if (filter === "active" && !ACTIVE_STATUSES.includes(o.status)) return false;
    if (filter === "done" && !DONE_STATUSES.includes(o.status)) return false;
    // The type chips are only shown in the Online view — never filter invisibly.
    if (viewMode === "online") {
      if (orderTypeFilter === "delivery" && o.orderType !== "delivery") return false;
      if (orderTypeFilter === "pickup" && o.orderType !== "pickup") return false;
      if (orderTypeFilter === "dine_in" && o.orderType !== "dine_in") return false;
      if (orderTypeFilter === "scheduled" && !o.scheduledAt) return false;
    }
    return true;
  });

  const pendingCount = normalizedOnlineOrders.filter((o: any) => o.status === "pending").length;

  // New order notification. The first successful load only seeds the known
  // set — otherwise every open order chimed each time the screen was opened.
  useEffect(() => {
    if (!tenantId || !onlineSuccess) return;
    const list = normalizedOnlineOrders;
    if (!ordersSeeded.current) {
      list.forEach(o => knownOrderIds.current.add(`online-${o.id}`));
      ordersSeeded.current = true;
      return;
    }
    const incoming = list.filter(o => !knownOrderIds.current.has(`online-${o.id}`) && o.status === "pending");
    list.forEach(o => knownOrderIds.current.add(`online-${o.id}`));
    if (incoming.length === 0) return;
    // Orders already announced by the realtime channel were chimed by the
    // global notification center; only poll-discovered ones chime here.
    if (incoming.some(o => !announcedOrderIds.current.has(Number(o.id)))) playNotificationSound();
    playClickSound("medium");
    setNewOrderIds(prev => {
      const next = new Set(prev);
      incoming.forEach(o => next.add(o.id));
      return next;
    });
    Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.08, duration: 200, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 200, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(pulseAnim, { toValue: 1.05, duration: 150, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 150, useNativeDriver: Platform.OS !== 'web' }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onlineOrders, onlineSuccess, tenantId]);

  // ── Broadcast Orders (marketplace / drop-shipping) ───────────────────
  const { data: broadcastOrders = [], refetch: refetchBroadcasts } = useQuery<any[]>({
    queryKey: ["/api/broadcast-orders/pending", tenantId ? `?tenantId=${tenantId}` : ""],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!tenantId,
    refetchInterval: 10000,
  });
  const [bcBusyId, setBcBusyId] = useState<number | null>(null);
  const [bcToast, setBcToast] = useState<string | null>(null);
  const bcToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showBcToast = (msg: string) => {
    setBcToast(msg);
    if (bcToastTimer.current) clearTimeout(bcToastTimer.current);
    bcToastTimer.current = setTimeout(() => setBcToast(null), 4000);
  };
  useEffect(() => () => { if (bcToastTimer.current) clearTimeout(bcToastTimer.current); }, []);

  // Broadcast countdowns tick every second while any are listed.
  const [, setClockTick] = useState(0);
  const hasBroadcasts = (broadcastOrders as any[]).length > 0;
  useEffect(() => {
    if (!hasBroadcasts) return;
    const iv = setInterval(() => setClockTick(t => t + 1), 1000);
    return () => clearInterval(iv);
  }, [hasBroadcasts]);

  const acceptBroadcast = async (bc: any) => {
    if (!tenantId || bcBusyId) return;
    setBcBusyId(bc.id);
    const tooLate = lbl("Too late — another restaurant accepted first", "فات الوقت — مطعم آخر قبل الطلب أولاً", "Zu spät — ein anderes Restaurant hat zuerst angenommen");
    try {
      const res = await apiRequest("POST", `/api/broadcast-orders/${bc.id}/accept`, { tenantId });
      const data = await res.json();
      if (data?.success) {
        playNotificationSound();
        showBcToast(lbl("Order accepted — now in your order list", "تم قبول الطلب — موجود الآن في قائمة الطلبات", "Bestellung angenommen — jetzt in Ihrer Bestellliste"));
        qc.invalidateQueries({ queryKey: ["/api/online-orders"] });
      } else {
        showBcToast(tooLate);
      }
    } catch (e: any) {
      // 409 = someone else claimed it / it expired.
      showBcToast(String(e?.message || "").startsWith("409") ? tooLate : lbl("Failed: ", "فشل: ", "Fehlgeschlagen: ") + apiErrorMessage(e));
    } finally {
      qc.invalidateQueries({ queryKey: ["/api/broadcast-orders/pending"] });
      setBcBusyId(null);
    }
  };

  const rejectBroadcast = async (bc: any) => {
    if (!tenantId || bcBusyId) return;
    setBcBusyId(bc.id);
    try {
      await apiRequest("POST", `/api/broadcast-orders/${bc.id}/reject`, { tenantId });
      qc.invalidateQueries({ queryKey: ["/api/broadcast-orders/pending"] });
    } catch (e) {
      showBcToast(lbl("Failed: ", "فشل: ", "Fehlgeschlagen: ") + apiErrorMessage(e));
    } finally {
      setBcBusyId(null);
    }
  };

  // Realtime updates (web). WebSocket first; the Hostinger CDN swallows the
  // upgrade, so fall back to the SSE mirror of the same events. Native relies
  // on the react-query refetchInterval above (it never stacks requests).
  useEffect(() => {
    if (Platform.OS !== "web" || !tenantId) return;
    let disposed = false;
    let ws: WebSocket | null = null;
    let es: EventSource | null = null;
    let fellBack = false;
    let wsTimeout: ReturnType<typeof setTimeout> | null = null;

    const handle = (data: any) => {
      if (!data || typeof data !== "object") return;
      if (data.type === "new_online_order") {
        const id = Number(data.order?.id ?? data.orderId);
        if (id) {
          announcedOrderIds.current.add(id);
          setNewOrderIds(prev => { const next = new Set(prev); next.add(id); return next; });
        }
        qc.invalidateQueries({ queryKey: ["/api/online-orders"] });
      } else if (data.type === "online_order_updated" || data.type === "delivery_status_change") {
        qc.invalidateQueries({ queryKey: ["/api/online-orders"] });
        if (data.type === "delivery_status_change") qc.invalidateQueries({ queryKey: [driversKey] });
      } else if (data.type === "driver_status_change") {
        qc.invalidateQueries({ queryKey: [driversKey] });
      } else if (data.type === "broadcast_new" || data.type === "broadcast_claimed" || data.type === "broadcast_cancelled") {
        qc.invalidateQueries({ queryKey: ["/api/broadcast-orders/pending"] });
        if (data.type === "broadcast_claimed" && data.claimedByTenantId === tenantId) {
          qc.invalidateQueries({ queryKey: ["/api/online-orders"] });
        }
      } else if (data.type === "chat_new_message") {
        const openId = chatOrderIdRef.current;
        if (openId && data.orderId === openId) {
          // Skip the echo of a message this device just sent.
          const sentAt = sentChatBodies.current.get(String(data.body));
          if (data.senderType !== "customer" && sentAt && Date.now() - sentAt < 30000) {
            sentChatBodies.current.delete(String(data.body));
            return;
          }
          setChatMessages((m) => [...m, { senderType: data.senderType, senderName: data.senderName, body: data.body, createdAt: data.createdAt }]);
        }
      }
    };

    const startSse = () => {
      if (disposed || fellBack || typeof EventSource === "undefined") return;
      fellBack = true;
      try {
        es = new EventSource(`${getApiUrl().replace(/\/$/, "")}/api/events?tenantId=${tenantId}`);
        es.onmessage = (ev) => { try { handle(JSON.parse(ev.data)); } catch { } };
      } catch { }
    };

    try {
      ws = new WebSocket(`${getApiUrl().replace(/^http/, "ws")}/api/ws/caller-id`);
      wsTimeout = setTimeout(() => {
        if (ws && ws.readyState !== WebSocket.OPEN) { try { ws.close(); } catch { } startSse(); }
      }, 3000);
      ws.onopen = () => {
        if (wsTimeout) clearTimeout(wsTimeout);
        try { ws?.send(JSON.stringify({ type: "register", tenantId })); } catch { }
      };
      ws.onmessage = (event) => { try { handle(JSON.parse(event.data)); } catch { } };
      ws.onerror = () => startSse();
      ws.onclose = () => { if (!disposed) startSse(); };
    } catch {
      startSse();
    }
    return () => {
      disposed = true;
      if (wsTimeout) clearTimeout(wsTimeout);
      try { ws?.close(); } catch { }
      try { es?.close(); } catch { }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchOnline(), refetchPos(), refetchBroadcasts()]);
    } finally {
      setRefreshing(false);
    }
  }, [refetchOnline, refetchPos, refetchBroadcasts]);

  const setOrderBusy = (id: number, on: boolean) =>
    setBusyOrderIds(prev => { const next = new Set(prev); if (on) next.add(id); else next.delete(id); return next; });

  const updateOnlineStatus = async (id: number, status: string) => {
    if (busyOrderIds.has(id)) return;
    setOrderBusy(id, true);
    try {
      await apiRequest("PUT", `/api/online-orders/${id}`, { status });
      await qc.invalidateQueries({ queryKey: ["/api/online-orders"] });
      setNewOrderIds(prev => { const next = new Set(prev); next.delete(id); return next; });
    } catch (e) {
      notify(lbl("Status not updated", "لم يتم تحديث الحالة", "Status nicht aktualisiert"), apiErrorMessage(e));
    } finally {
      setOrderBusy(id, false);
    }
  };

  const cancelOnlineOrder = async (item: any) => {
    const isReject = item.status === "pending";
    const num = getDisplayNumber(item.orderNumber) || item.id;
    const ok = await confirmAsync(
      isReject ? lbl("Reject order?", "رفض الطلب؟", "Bestellung ablehnen?") : lbl("Cancel order?", "إلغاء الطلب؟", "Bestellung stornieren?"),
      lbl(
        `Order #${num} will be cancelled. This cannot be undone.`,
        `سيتم إلغاء الطلب #${num}. لا يمكن التراجع عن ذلك.`,
        `Bestellung #${num} wird storniert. Dies kann nicht rückgängig gemacht werden.`,
      ),
      isReject ? lbl("Reject", "رفض", "Ablehnen") : lbl("Cancel order", "إلغاء الطلب", "Stornieren"),
      lbl("Keep", "تراجع", "Behalten"),
    );
    if (ok) updateOnlineStatus(item.id, "cancelled");
  };

  /** Manual payments (Sham Cash transfer) stay unpaid until the store checks its wallet. */
  const markOrderPaid = async (item: any) => {
    if (busyOrderIds.has(item.id)) return;
    const amount = formatMoney(item.totalAmount);
    const ok = await confirmAsync(
      lbl("Confirm payment received?", "تأكيد استلام الدفعة؟", "Zahlungseingang bestätigen?"),
      lbl(
        `Only confirm after you see ${amount} in your wallet.`,
        `أكّد فقط بعد أن ترى مبلغ ${amount} في محفظتك.`,
        `Nur bestätigen, wenn ${amount} in Ihrer Wallet eingegangen sind.`,
      ),
      lbl("Confirm", "تأكيد", "Bestätigen"),
      lbl("Cancel", "إلغاء", "Abbrechen"),
    );
    if (!ok) return;
    setOrderBusy(item.id, true);
    try {
      await apiRequest("PUT", `/api/online-orders/${item.id}`, { paymentStatus: "paid" });
      await qc.invalidateQueries({ queryKey: ["/api/online-orders"] });
    } catch (e) {
      notify(lbl("Could not update payment", "تعذّر تحديث حالة الدفع", "Zahlung konnte nicht aktualisiert werden"), apiErrorMessage(e));
    } finally {
      setOrderBusy(item.id, false);
    }
  };

  const deleteOnlineOrder = async (id: number) => {
    const confirmed = await confirmAsync(
      lbl("Delete order?", "حذف الطلب؟", "Bestellung löschen?"),
      lbl("This will permanently delete the order.", "سيتم حذف هذا الطلب نهائياً.", "Diese Bestellung wird dauerhaft gelöscht."),
      lbl("Delete", "حذف", "Löschen"),
      lbl("Cancel", "إلغاء", "Abbrechen"),
    );
    if (!confirmed) return;
    setOrderBusy(id, true);
    try {
      await apiRequest("DELETE", `/api/online-orders/${id}`);
      await qc.invalidateQueries({ queryKey: ["/api/online-orders"] });
    } catch (e) {
      notify(lbl("Could not delete the order", "تعذّر حذف الطلب", "Bestellung konnte nicht gelöscht werden"), apiErrorMessage(e));
    } finally {
      setOrderBusy(id, false);
    }
  };

  const deletePosOrder = async (id: number) => {
    const confirmed = await confirmAsync(
      lbl("Delete invoice?", "حذف الفاتورة؟", "Rechnung löschen?"),
      lbl("This will permanently delete the invoice.", "سيتم حذف هذه الفاتورة نهائياً.", "Diese Rechnung wird dauerhaft gelöscht."),
      lbl("Delete", "حذف", "Löschen"),
      lbl("Cancel", "إلغاء", "Abbrechen"),
    );
    if (!confirmed) return;
    setOrderBusy(id, true);
    try {
      await apiRequest("DELETE", `/api/sales/${id}`);
      await qc.invalidateQueries({ queryKey: ["/api/sales"] });
    } catch (e) {
      notify(lbl("Could not delete the invoice", "تعذّر حذف الفاتورة", "Rechnung konnte nicht gelöscht werden"), apiErrorMessage(e));
    } finally {
      setOrderBusy(id, false);
    }
  };

  const openEditOrder = async (order: any) => {
    if (order._type === "pos") {
      if (busyOrderIds.has(order.id)) return;
      setOrderBusy(order.id, true);
      // Fetch full sale + customer info. If this fails the editor must NOT
      // open: saving an empty item list would wipe the invoice's items.
      try {
        const res = await apiRequest("GET", `/api/sales/${order.id}`);
        const full = await res.json();
        const items = normalizeOrderItems(full.items).map((it: any) => ({
          productId: it.productId,
          name: it.productName,
          quantity: it.quantity,
          unitPrice: Number(it.unitPrice),
          total: Number(it.total),
          notes: it.notes || "",
          modifiers: it.modifiers || [],
        }));
        const subtotal = items.reduce((s: number, i: any) => s + (Number(i.total) || 0), 0);

        // Fetch customer details if linked via customerId
        let custName = "";
        let custPhone = "";
        let custAddress = "";
        if (full.customerId) {
          try {
            const custRes = await apiRequest("GET", `/api/customers/${full.customerId}`);
            const cust = await custRes.json();
            custName = cust.name || "";
            custPhone = cust.phone || "";
            custAddress = cust.address ||
              [cust.street, cust.streetNr || cust.houseNr, cust.postalCode, cust.city].filter(Boolean).join(" ") || "";
          } catch { }
        }

        const deliveryFee = Number(full.deliveryFee || 0);
        const totalAmount = Number(full.totalAmount ?? subtotal + deliveryFee);
        setEditForm({
          customerName: custName,
          customerPhone: custPhone,
          customerAddress: custAddress,
          notes: full.notes || "",
          estimatedTime: "",
          items,
          subtotal,
          deliveryFee,
          adjustment: Number.isFinite(totalAmount) ? totalAmount - subtotal - deliveryFee : 0,
          totalAmount: Number.isFinite(totalAmount) ? totalAmount : subtotal + deliveryFee,
        });
        setEditingOrder(order);
      } catch (e) {
        notify(lbl("Could not load the invoice", "تعذّر تحميل الفاتورة", "Rechnung konnte nicht geladen werden"), apiErrorMessage(e));
      } finally {
        setOrderBusy(order.id, false);
      }
      return;
    }
    const subtotal = Number(order.subtotal || 0);
    const deliveryFee = Number(order.deliveryFee || 0);
    const totalAmount = Number(order.totalAmount || 0);
    setEditForm({
      customerName: order.customerName || "",
      customerPhone: order.customerPhone || "",
      customerAddress: order.customerAddress || "",
      notes: order.notes || "",
      estimatedTime: order.estimatedTime ? String(order.estimatedTime) : "",
      items: cloneOrderItems(order.items),
      subtotal,
      deliveryFee,
      // Discount / tax / wallet share of the total — preserved when items change.
      adjustment: totalAmount - subtotal - deliveryFee,
      totalAmount,
    });
    setEditingOrder(order);
  };

  const saveEditOrder = async () => {
    if (!editingOrder || savingEdit) return;
    const isPos = editingOrder._type === "pos";
    if (editForm.items.length === 0) {
      notify(
        lbl("The order has no items", "الطلب لا يحتوي على أصناف", "Die Bestellung hat keine Artikel"),
        lbl("Add at least one item, or cancel the order instead.", "أضف صنفاً واحداً على الأقل، أو ألغِ الطلب بدلاً من ذلك.", "Fügen Sie mindestens einen Artikel hinzu oder stornieren Sie die Bestellung."),
      );
      return;
    }
    let customerPhone = editForm.customerPhone.trim();
    let estimatedTime: number | null = null;
    if (!isPos) {
      if (!editForm.customerName.trim()) {
        notify(lbl("Customer name is required", "اسم العميل مطلوب", "Kundenname ist erforderlich"));
        return;
      }
      // Only validate a phone the user actually changed — old orders may carry
      // formats the current rules would reject.
      if (customerPhone !== String(editingOrder.customerPhone || "").trim()) {
        if (!isValidStorePhone(customerPhone)) {
          notify(
            lbl("Invalid phone number", "رقم الهاتف غير صالح", "Ungültige Telefonnummer"),
            lbl(`Example: ${storePhonePlaceholder()}`, `مثال: ${storePhonePlaceholder()}`, `Beispiel: ${storePhonePlaceholder()}`),
          );
          return;
        }
        customerPhone = normalizeStorePhone(customerPhone);
      }
      if (editForm.estimatedTime.trim()) {
        const n = Number(editForm.estimatedTime.trim());
        if (!Number.isInteger(n) || n < 0 || n > 600) {
          notify(lbl("Estimated time must be 0–600 minutes", "الوقت المقدر يجب أن يكون بين 0 و600 دقيقة", "Geschätzte Zeit: 0–600 Minuten"));
          return;
        }
        estimatedTime = n;
      }
    }
    setSavingEdit(true);
    try {
      if (isPos) {
        await apiRequest("PUT", `/api/sales/${editingOrder.id}`, {
          notes: editForm.notes || null,
          subtotal: moneyStr(editForm.subtotal),
          totalAmount: moneyStr(editForm.totalAmount),
          items: editForm.items.map(it => ({
            // Free extras use productId 0 — sale_items.product_id is a foreign key.
            productId: it.productId ? it.productId : null,
            productName: it.name,
            quantity: it.quantity,
            unitPrice: moneyStr(Number(it.unitPrice) || 0),
            total: moneyStr(Number(it.total) || 0),
            modifiers: it.modifiers || [],
            notes: it.notes || null,
          })),
        });
        await qc.invalidateQueries({ queryKey: ["/api/sales"] });
      } else {
        await apiRequest("PUT", `/api/online-orders/${editingOrder.id}`, {
          customerName: editForm.customerName.trim(),
          customerPhone,
          customerAddress: editForm.customerAddress.trim() || null,
          notes: editForm.notes || null,
          estimatedTime,
          items: editForm.items,
          subtotal: moneyStr(editForm.subtotal),
          totalAmount: moneyStr(editForm.totalAmount),
        });
        await qc.invalidateQueries({ queryKey: ["/api/online-orders"] });
      }
      setEditingOrder(null);
    } catch (e) {
      notify(lbl("Could not save the order", "تعذّر حفظ الطلب", "Bestellung konnte nicht gespeichert werden"), apiErrorMessage(e));
    } finally {
      setSavingEdit(false);
    }
  };

  const updateItemQty = (index: number, delta: number) => {
    setEditForm(prev => {
      const nextItems = [...prev.items];
      const it = nextItems[index];
      const newQty = Math.max(0, (it.quantity || 0) + delta);
      if (newQty === 0) {
        nextItems.splice(index, 1);
      } else {
        nextItems[index] = { ...it, quantity: newQty, total: newQty * it.unitPrice };
      }
      const newSubtotal = nextItems.reduce((sum, i) => sum + (i.total || 0), 0);
      return { ...prev, items: nextItems, subtotal: newSubtotal, totalAmount: Math.max(0, newSubtotal + prev.deliveryFee + prev.adjustment) };
    });
  };

  const isPizzaProduct = useCallback((product: any) => {
    if (!product) return false;
    const name = (product.name || "").toLowerCase();
    const catName = (product.categoryName || "").toLowerCase();
    return name.includes("pizza") || catName.includes("pizza");
  }, []);

  const getToppingInfo = (label: string) => {
    const clean = label.toLowerCase().replace(/^(extra|zusatz|mit)\s+/i, "").trim();
    return PIZZA_TOPPINGS.find(t =>
      t.name.toLowerCase() === clean ||
      (t.names && t.names.some(n => n.toLowerCase() === clean)) ||
      label.toLowerCase().includes(t.name.toLowerCase())
    ) || { icon: "", category: "Others" };
  };

  const addItemToOrder = (prod: any) => {
    if (isPizzaProduct(prod) || (prod.modifiers && prod.modifiers.length > 0) || (prod.variants && prod.variants.length > 0)) {
      setConfiguringProduct(prod);
      setConfiguringItemIndex(null);
      setSelectedVariant(null);
      setSelectedToppings([]);
      setShowToppingsStep(false);
      setShowProductPicker(false);
      return;
    }
    setEditForm(prev => {
      const existingIdx = prev.items.findIndex(i => i.productId === prod.id && (!i.notes || i.notes === ""));
      let nextItems = [...prev.items];
      if (existingIdx > -1) {
        const it = nextItems[existingIdx];
        const newQty = it.quantity + 1;
        nextItems[existingIdx] = { ...it, quantity: newQty, total: newQty * it.unitPrice };
      } else {
        nextItems.push({ productId: prod.id, name: prod.name, quantity: 1, unitPrice: Number(prod.price), total: Number(prod.price) });
      }
      const newSubtotal = nextItems.reduce((sum, i) => sum + (i.total || 0), 0);
      return { ...prev, items: nextItems, subtotal: newSubtotal, totalAmount: Math.max(0, newSubtotal + prev.deliveryFee + prev.adjustment) };
    });
    setShowProductPicker(false);
  };

  const editItemAddons = (index: number) => {
    const item = editForm.items[index];
    const fullProduct = enrichedProducts.find((p: any) => p.id === item.productId);
    if (!fullProduct) return;
    setConfiguringProduct(fullProduct);
    setConfiguringItemIndex(index);
    const nameStr = item.name || "";
    const match = nameStr.match(/\[(.*)\]/);
    if (match && match[1]) setSelectedToppings(match[1].split(", ").map((t: string) => t.trim()));
    else setSelectedToppings([]);
    setShowToppingsStep(true);
  };

  const applyConfiguringItem = () => {
    const baseName = selectedVariant?.name ? `${configuringProduct.name} (${selectedVariant.name})` : configuringProduct.name;
    const toppingsSuffix = selectedToppings.length > 0 ? ` [${selectedToppings.join(", ")}]` : "";
    const finalName = baseName + toppingsSuffix;
    const finalUnitPrice = Number(selectedVariant?.price || configuringProduct.price);

    if (configuringItemIndex !== null) {
      setEditForm(prev => {
        const nextItems = [...prev.items];
        nextItems[configuringItemIndex] = { ...nextItems[configuringItemIndex], name: finalName, unitPrice: finalUnitPrice, total: finalUnitPrice * nextItems[configuringItemIndex].quantity };
        const newSubtotal = nextItems.reduce((sum, i) => sum + (i.total || 0), 0);
        return { ...prev, items: nextItems, subtotal: newSubtotal, totalAmount: Math.max(0, newSubtotal + prev.deliveryFee + prev.adjustment) };
      });
    } else {
      setEditForm(prev => {
        const nextItems = [...prev.items, { productId: configuringProduct.id, name: finalName, quantity: 1, unitPrice: finalUnitPrice, total: finalUnitPrice }];
        const newSubtotal = nextItems.reduce((sum, i) => sum + (i.total || 0), 0);
        return { ...prev, items: nextItems, subtotal: newSubtotal, totalAmount: Math.max(0, newSubtotal + prev.deliveryFee + prev.adjustment) };
      });
    }
    setConfiguringProduct(null);
    setConfiguringItemIndex(null);
  };

  // --- Render Order Card ---
  const orderTypeLabel = (t: string) =>
    t === "delivery" ? lbl("Delivery", "توصيل", "Lieferung")
      : t === "pickup" ? lbl("Pickup", "استلام", "Abholung")
        : t === "dine_in" ? lbl("Dine-in", "في المطعم", "Vor Ort")
          : t;
  const payLabel = (m: string) => {
    const k = String(m || "").toLowerCase();
    return k === "cash" ? lbl("Cash", "نقداً", "Bar")
      : k === "card" || k === "stripe" ? lbl("Card", "بطاقة", "Karte")
        : k === "shamcash" ? lbl("Sham Cash", "شام كاش", "Sham Cash")
          : k === "mobile" ? lbl("Mobile", "دفع بالجوال", "Mobil")
            : k === "wallet" ? lbl("Wallet", "المحفظة", "Guthaben")
              : k === "transfer" ? lbl("Transfer", "تحويل", "Überweisung")
                : k.toUpperCase();
  };
  // Label for the final step: "Delivered" only makes sense for deliveries.
  const nextLabel = (next: string, orderType?: string) => {
    if (next === "delivered" && orderType === "pickup") return lbl("Picked up", "تم الاستلام", "Abgeholt");
    if (next === "delivered" && orderType === "dine_in") return lbl("Served", "تم التقديم", "Serviert");
    const m = STATUS_META[next];
    return m ? (language === "ar" ? m.labelAr : language === "de" ? m.labelDe : m.label) : next;
  };
  const nextVerb = (next: string, orderType?: string) =>
    next === "accepted" ? lbl("Accept", "قبول", "Annehmen")
      : next === "preparing" ? lbl("Start preparing", "بدء التحضير", "Zubereiten")
        : next === "ready" ? lbl("Mark ready", "جاهز", "Fertig melden")
          : nextLabel(next, orderType);

  const renderOrder = ({ item }: { item: any }) => {
    const meta: StatusMeta = STATUS_META[item.status] || (item.status
      ? { label: String(item.status), labelAr: String(item.status), labelDe: String(item.status), color: Colors.textMuted, icon: "ellipse-outline" }
      : STATUS_META.completed);
    const isNew = newOrderIds.has(item.id) && item._type === "online";
    const next = meta.next;
    const isPOS = item._type === "pos";
    const busy = busyOrderIds.has(item.id);
    const orderItems = normalizeOrderItems(item.items);
    const isActive = !isPOS && item.status !== "delivered" && item.status !== "cancelled";

    const nextBtnColor: Record<string, string[]> = {
      accepted: ["#3B82F6", "#1D4ED8"],
      preparing: ["#8B5CF6", "#6D28D9"],
      ready: ["#2FD3C6", "#0D9488"],
      delivered: ["#10B981", "#059669"],
    };

    const sourceColor = isPOS ? "#F59E0B" : "#6366F1";
    const sourceLabel = isPOS ? lbl("POS", "كاشير", "Kasse") : lbl("Online", "إلكتروني", "Online");
    const sourceIcon: keyof typeof Ionicons.glyphMap = isPOS ? "call-outline" : "globe-outline";
    const orderId = isPOS ? (getDisplayNumber(item.receiptNumber) || `#${item.id}`) : `#${getDisplayNumber(item.orderNumber) || item.id}`;
    const timeText = formatInStoreTz(item.createdAt, dateLocale, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
    const pm = String(item.paymentMethod || "").toLowerCase();
    const isPaid = item.paymentStatus === "paid";
    // Sham Cash transfers are matched by hand: the order stays unpaid until the store confirms.
    const awaitingManualPayment = !isPOS && pm === "shamcash" && !isPaid && item.status !== "cancelled";
    const driverName = item.driverId ? driverNameById.get(Number(item.driverId)) : undefined;
    const phoneLinks = !isPOS && item.customerPhone ? phoneTargets(String(item.customerPhone)) : null;
    const showCustomerRow = !!(item.customerName || item.customerPhone || item.orderType || item.tableNumber || item.paymentMethod);

    return (
      <Animated.View style={[
        styles.orderCard,
        isNew && styles.orderCardNew,
        isPOS && styles.orderCardPos,
        { borderLeftColor: isPOS ? sourceColor : meta.color, transform: isNew ? [{ scale: pulseAnim }] : [] },
      ]}>
        {/* Source badge + Header */}
        <View style={[styles.orderHeader, flipRow && { flexDirection: "row-reverse" }]}>
          <View style={[styles.orderNumRow, flipRow && { flexDirection: "row-reverse" }]}>
            {isNew && <View style={styles.newDot} />}
            <View style={[styles.sourceBadge, { backgroundColor: sourceColor + "1F", borderColor: sourceColor + "60" }]}>
              <Ionicons name={sourceIcon} size={11} color={sourceColor} />
              <Text style={[styles.sourceBadgeText, { color: sourceColor }]}>{sourceLabel}</Text>
            </View>
            <Text style={styles.orderNum} numberOfLines={1}>{orderId}</Text>
            <View style={[styles.statusBadge, { backgroundColor: meta.color + "22", borderColor: meta.color }]}>
              <Ionicons name={meta.icon as any} size={11} color={meta.color} />
              <Text style={[styles.statusText, { color: meta.color }]}>
                {language === "ar" ? meta.labelAr : language === "de" ? meta.labelDe : meta.label}
              </Text>
            </View>
          </View>
          <Text style={styles.orderAmount}>{formatMoney(item.totalAmount)}</Text>
        </View>

        {/* Customer info */}
        {showCustomerRow ? (
          <View style={[styles.customerRow, flipRow && { flexDirection: "row-reverse" }]}>
            <View style={styles.customerIcon}>
              <Ionicons name="person" size={14} color={Colors.accent} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              {item.customerName ? <Text style={[styles.customerName, isRTL && { textAlign: "right" }]} numberOfLines={1}>{item.customerName}</Text> : null}
              {item.customerPhone || item.customerAddress ? (
                <Text style={[styles.customerSub, isRTL && { textAlign: "right" }]} numberOfLines={2}>
                  {item.customerPhone || ""}
                  {item.customerAddress ? `${item.customerPhone ? " • " : ""}${item.customerAddress}` : ""}
                </Text>
              ) : null}
              {phoneLinks ? (
                <View style={[styles.contactRow, flipRow && { flexDirection: "row-reverse" }]}>
                  <Pressable
                    onPress={() => Linking.openURL(phoneLinks.tel).catch(() => notify(lbl("Cannot place call", "تعذّر الاتصال", "Anruf nicht möglich"), String(item.customerPhone)))}
                    style={styles.contactBtn}
                    accessibilityRole="button"
                    accessibilityLabel={lbl("Call customer", "اتصال بالعميل", "Kunde anrufen")}
                  >
                    <Ionicons name="call-outline" size={14} color={Colors.success} />
                    <Text style={[styles.contactBtnText, { color: Colors.success }]}>{lbl("Call", "اتصال", "Anrufen")}</Text>
                  </Pressable>
                  {phoneLinks.wa ? (
                    <Pressable
                      onPress={() => Linking.openURL(`https://wa.me/${phoneLinks.wa}`).catch(() => { })}
                      style={styles.contactBtn}
                      accessibilityRole="button"
                      accessibilityLabel="WhatsApp"
                    >
                      <Ionicons name="logo-whatsapp" size={14} color="#25D366" />
                      <Text style={[styles.contactBtnText, { color: "#25D366" }]}>WhatsApp</Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}
            </View>
            <View style={styles.metaChips}>
              {item.paymentMethod ? (
                <View style={[styles.metaChip, isPaid && !isPOS && { backgroundColor: Colors.success + "22" }, awaitingManualPayment && { backgroundColor: Colors.warning + "26" }]}>
                  <Ionicons name={PAY_ICON[pm] || "cash-outline"} size={12} color={awaitingManualPayment ? Colors.warning : isPaid && !isPOS ? Colors.success : Colors.textSecondary} />
                  <Text style={[styles.metaChipText, awaitingManualPayment && { color: Colors.warning }, isPaid && !isPOS && { color: Colors.success }]}>
                    {payLabel(pm)}{!isPOS && isPaid ? ` · ${lbl("Paid", "مدفوع", "Bezahlt")}` : awaitingManualPayment ? ` · ${lbl("Unconfirmed", "بانتظار التأكيد", "Unbestätigt")}` : ""}
                  </Text>
                </View>
              ) : null}
              {item.orderType ? (
                <View style={[styles.metaChip, {
                  backgroundColor: item.orderType === "delivery" ? "#6366F1" + "26"
                    : item.orderType === "dine_in" ? "#F59E0B" + "26"
                      : "#10B981" + "26"
                }]}>
                  <Ionicons
                    name={item.orderType === "delivery" ? "bicycle-outline" : item.orderType === "dine_in" ? "restaurant-outline" : "walk-outline"}
                    size={12}
                    color={Colors.textSecondary}
                  />
                  <Text style={styles.metaChipText}>{orderTypeLabel(item.orderType)}</Text>
                </View>
              ) : null}
              {item.tableNumber ? (
                <View style={[styles.metaChip, { backgroundColor: "#1E40AF" + "26" }]}>
                  <Ionicons name="grid-outline" size={12} color={Colors.textSecondary} />
                  <Text style={styles.metaChipText} numberOfLines={1}>{item.tableNumber}</Text>
                </View>
              ) : null}
            </View>
          </View>
        ) : null}

        {/* Items - for online orders with full items data */}
        {orderItems.length > 0 ? (
          <View style={styles.itemsList}>
            {orderItems.slice(0, 4).map((it: any, idx: number) => (
              <View key={idx} style={{ marginBottom: 4 }}>
                <View style={[styles.itemRow, flipRow && { flexDirection: "row-reverse" }]}>
                  <Text style={styles.itemQty}>{it.quantity}×</Text>
                  <Text style={[styles.itemName, { flex: 1, minWidth: 0 }, isRTL && { textAlign: "right" }]}>{it.name || it.productName}</Text>
                  <Text style={styles.itemPrice}>{formatMoney(Number(it.total) || (Number(it.unitPrice) * Number(it.quantity)) || 0)}</Text>
                </View>
                {it.notes ? <Text style={[styles.itemAddons, isRTL && { textAlign: "right" }]}>↳ {it.notes}</Text> : null}
              </View>
            ))}
            {orderItems.length > 4 && <Text style={styles.itemAddons}>+{orderItems.length - 4} {lbl("more items", "عناصر أخرى", "weitere Artikel")}</Text>}
            {item.notes ? <Text style={[styles.orderNotes, isRTL && { textAlign: "right" }]}>{item.notes}</Text> : null}
          </View>
        ) : item.notes ? (
          <View style={styles.itemsList}>
            <Text style={[styles.orderNotes, isRTL && { textAlign: "right" }]}>{item.notes}</Text>
          </View>
        ) : null}

        {/* Scheduled badge */}
        {item.scheduledAt ? (
          <View style={{ marginBottom: 6 }}>
            <ScheduledOrderBadge scheduledAt={item.scheduledAt} isRtl={isRTL} />
          </View>
        ) : null}

        {/* Driver + tracking link + chat */}
        {!isPOS ? (
          <View style={[styles.extraRow, flipRow && { flexDirection: "row-reverse" }]}>
            {item.orderType === "delivery" && item.driverId ? (
              <View style={[styles.driverChip, flipRow && { flexDirection: "row-reverse" }]}>
                <Ionicons name="bicycle" size={14} color={Colors.deliveryPrimary} />
                <Text style={styles.driverChipText} numberOfLines={1}>
                  {driverName || lbl("Driver assigned", "تم تعيين سائق", "Fahrer zugewiesen")}
                </Text>
              </View>
            ) : null}
            {item.orderType === "delivery" && item.trackingToken ? (
              <TrackingLinkButton trackingToken={item.trackingToken} label={lbl("Share tracking", "مشاركة رابط التتبع", "Tracking teilen")} />
            ) : null}
            <Pressable
              onPress={() => openChat(item)}
              style={styles.chatBtn}
              accessibilityRole="button"
            >
              <Ionicons name="chatbubble-ellipses-outline" size={15} color={Colors.accent} />
              <Text style={{ color: Colors.accent, fontWeight: "600", fontSize: 13 }}>{lbl("Chat", "محادثة", "Chat")}</Text>
            </Pressable>
          </View>
        ) : null}

        {/* Time + fee */}
        <View style={[styles.totalsRow, flipRow && { flexDirection: "row-reverse" }]}>
          <Text style={styles.timeText}>{timeText}</Text>
          {item.deliveryFee && Number(item.deliveryFee) > 0 ? (
            <Text style={styles.feeText}>+{formatMoney(item.deliveryFee)} {lbl("delivery", "توصيل", "Lieferung")}</Text>
          ) : null}
        </View>

        {awaitingManualPayment ? (
          <Pressable
            style={[styles.payConfirmBtn, busy && { opacity: 0.5 }]}
            onPress={() => markOrderPaid(item)}
            disabled={busy}
            accessibilityRole="button"
          >
            <Ionicons name="checkmark-circle-outline" size={16} color={Colors.warning} />
            <Text style={styles.payConfirmText}>{lbl("Confirm Sham Cash payment", "تأكيد استلام دفعة شام كاش", "Sham-Cash-Zahlung bestätigen")}</Text>
          </Pressable>
        ) : null}

        {/* Actions */}
        <View style={[styles.actions, flipRow && { flexDirection: "row-reverse" }]}>
          {/* Next status button - only for online orders */}
          {isActive && next && nextBtnColor[next] ? (
            <Pressable
              style={[styles.nextBtnWrap, busy && { opacity: 0.6 }]}
              disabled={busy}
              onPress={() => { playClickSound("medium"); updateOnlineStatus(item.id, next); }}
              accessibilityRole="button"
              accessibilityState={{ disabled: busy, busy }}
            >
              <LinearGradient colors={nextBtnColor[next] as [string, string]} style={styles.actionBtnPrimary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                {busy ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name={STATUS_META[next]?.icon as any || "arrow-forward"} size={16} color="#fff" />}
                <Text style={styles.actionBtnText} numberOfLines={1}>{nextVerb(next, item.orderType)}</Text>
              </LinearGradient>
            </Pressable>
          ) : null}
          {/* Assign Driver - delivery orders only */}
          {isActive && item.orderType === "delivery" ? (
            <Pressable
              style={[styles.editBtn, { backgroundColor: Colors.deliveryPrimaryLight }]}
              onPress={() => { playClickSound("light"); setDriverAssignOrderId(item.id); }}
              accessibilityRole="button"
              accessibilityLabel={lbl("Assign driver", "تعيين سائق", "Fahrer zuweisen")}
            >
              <Ionicons name="bicycle" size={18} color={Colors.deliveryPrimary} />
            </Pressable>
          ) : null}
          {/* Edit */}
          <Pressable
            style={[styles.editBtn, busy && { opacity: 0.5 }]}
            disabled={busy}
            onPress={() => { playClickSound("light"); openEditOrder(item); }}
            accessibilityRole="button"
            accessibilityLabel={lbl("Edit", "تعديل", "Bearbeiten")}
          >
            {busy && isPOS ? <ActivityIndicator size="small" color={Colors.accent} /> : <Ionicons name="pencil" size={16} color={Colors.accent} />}
          </Pressable>
          {/* Reject (pending) / Cancel (active) — online only */}
          {isActive ? (
            <Pressable
              style={[styles.cancelBtn, busy && { opacity: 0.5 }]}
              disabled={busy}
              onPress={() => { playClickSound("light"); cancelOnlineOrder(item); }}
              accessibilityRole="button"
              accessibilityLabel={item.status === "pending" ? lbl("Reject order", "رفض الطلب", "Bestellung ablehnen") : lbl("Cancel order", "إلغاء الطلب", "Bestellung stornieren")}
            >
              <Ionicons name="close" size={18} color={Colors.danger} />
            </Pressable>
          ) : null}
          {/* Delete */}
          <Pressable
            style={[styles.deleteBtn, busy && { opacity: 0.5 }]}
            disabled={busy}
            onPress={() => { playClickSound("light"); if (isPOS) deletePosOrder(item.id); else deleteOnlineOrder(item.id); }}
            accessibilityRole="button"
            accessibilityLabel={lbl("Delete", "حذف", "Löschen")}
          >
            <Ionicons name="trash-outline" size={16} color={Colors.danger} />
          </Pressable>
        </View>
      </Animated.View>
    );
  };

  // --- Product Picker categories ---
  // Show ALL products regardless of isAddon flag so no items are hidden
  const regularProducts = enrichedProducts;
  const addonProducts = enrichedProducts.filter((p: any) => p.isAddon);
  const allPickerCatNames = Array.from(new Set(enrichedProducts.map((p: any) => p.categoryName || "Other"))) as string[];
  // Sort categories: Pizza first, then the rest
  const pickerCategories = allPickerCatNames.sort((a: string, b: string) => {
    const aIsPizza = a.toLowerCase().includes("pizza");
    const bIsPizza = b.toLowerCase().includes("pizza");
    if (aIsPizza && !bIsPizza) return -1;
    if (!aIsPizza && bIsPizza) return 1;
    return 0;
  });
  const filteredPickerProducts = enrichedProducts.filter((p: any) => {
    const matchCat = pickerCategory === "all" || (p.categoryName || "Other") === pickerCategory;
    const matchSearch = !pickerSearch.trim() || p.name?.toLowerCase().includes(pickerSearch.trim().toLowerCase());
    return matchCat && matchSearch;
  }).sort((a: any, b: any) => {
    if (pickerCategory !== "all") return 0;
    const aIsPizza = (a.categoryName || "").toLowerCase().includes("pizza");
    const bIsPizza = (b.categoryName || "").toLowerCase().includes("pizza");
    if (aIsPizza && !bIsPizza) return -1;
    if (!aIsPizza && bIsPizza) return 1;
    return 0;
  });

  const toppingDisplayName = (name: string) => getToppingDisplayName(name, language);
  const toppingEmoji = (name: string) => getToppingEmoji(name);

  // --- Topping options for configurator ---
  const getToppingOptions = () => {
    return PIZZA_TOPPINGS.map(t => ({ name: t.name, price: 0, icon: t.icon, category: t.category }));
  };

  const displayToppingCats = ["Cheese", "Meat", "Vegetables", "Seafood", "Sauces", "Others"];
  const catLabel = (cat: string) =>
    cat === "Cheese" ? lbl("Cheese", "أجبان", "Käse") :
      cat === "Meat" ? lbl("Meat", "لحوم", "Fleisch") :
        cat === "Vegetables" ? lbl("Vegetables", "خضروات", "Gemüse") :
          cat === "Seafood" ? lbl("Seafood", "مأكولات بحرية", "Meeresfrüchte") :
            cat === "Sauces" ? lbl("Sauces", "صوصات", "Saucen") :
              lbl("Others", "أخرى", "Sonstiges");

  const printEditedOrder = () => {
    if (!editingOrder) return;
    const saleData = {
      receiptNumber: editingOrder._type === "pos"
        ? (getDisplayNumber(editingOrder.receiptNumber) || `#${editingOrder.id}`)
        : `#${getDisplayNumber(editingOrder.orderNumber)}`,
      id: editingOrder.id,
      createdAt: editingOrder.createdAt || new Date().toISOString(),
    };
    const cartItems = editForm.items.map((it: any) => ({
      name: it.name,
      quantity: it.quantity,
      price: Number(it.unitPrice),
      categoryId: it.categoryId,
    }));
    const custObj = {
      address: editForm.customerAddress,
      phone: editForm.customerPhone,
    };
    autoPrint3Copies(
      saleData, cartItems, editForm.subtotal, 0, 0, 0, editForm.totalAmount, editForm.deliveryFee,
      editingOrder.paymentMethod || "cash", 0,
      editForm.customerName || (language === "ar" ? "زبون" : "Laufkunde"), "",
      custObj, undefined, 0,
      storeSettings, tenant, allCategories as any[]
    );
  };

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + topPad,
        },
      ]}
    >

      {/* ===== DRIVER ASSIGN MODAL ===== */}
      {driverAssignOrderId !== null && (
        <DriverAssignModal
          visible={driverAssignOrderId !== null}
          orderId={driverAssignOrderId}
          tenantId={tenantId || 0}
          licenseKey={(tenant as any)?.licenseKey || ""}
          apiBase={getApiUrl()}
          currentDriverId={(normalizedOnlineOrders.find((o: any) => o.id === driverAssignOrderId) as any)?.driverId ?? null}
          onAssigned={() => {
            qc.invalidateQueries({ queryKey: ["/api/online-orders"] });
            qc.invalidateQueries({ queryKey: [driversKey] });
          }}
          onClose={() => setDriverAssignOrderId(null)}
        />
      )}

      {/* ===== EDIT ORDER MODAL ===== */}
      <Modal visible={!!editingOrder} animationType="slide" transparent onRequestClose={() => setEditingOrder(null)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={styles.modalSheet}>
            <View style={[styles.modalHeader, flipRow && { flexDirection: "row-reverse" }]}>
              <Text style={styles.modalTitle}>
                {lbl("Edit Order", "تعديل الطلب", "Bestellung bearbeiten")}{" "}
                {editingOrder?._type === "pos" ? (getDisplayNumber(editingOrder?.receiptNumber) || `#${editingOrder?.id}`) : `#${getDisplayNumber(editingOrder?.orderNumber)}`}
              </Text>
              <Pressable onPress={() => setEditingOrder(null)} style={styles.modalCloseBtn} accessibilityLabel={lbl("Close", "إغلاق", "Schließen")}>
                <Ionicons name="close" size={22} color={Colors.textMuted} />
              </Pressable>
            </View>
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Customer info — editable on online orders. A POS invoice only
                  links a customer record, which this form cannot change. */}
              {editingOrder?._type === "pos" ? (
                editForm.customerName || editForm.customerPhone || editForm.customerAddress ? (
                  <View style={[styles.editField, styles.readOnlyBox]}>
                    <Text style={[styles.editLabel, isRTL && { textAlign: "right" }]}>{lbl("Customer", "العميل", "Kunde")}</Text>
                    <Text style={[styles.readOnlyText, isRTL && { textAlign: "right" }]}>
                      {[editForm.customerName, editForm.customerPhone, editForm.customerAddress].filter(Boolean).join(" · ")}
                    </Text>
                  </View>
                ) : null
              ) : [
                { label: lbl("Customer Name", "اسم العميل", "Kundenname"), key: "customerName", placeholder: lbl("Name", "الاسم", "Name"), keyboard: "default" },
                { label: lbl("Phone", "الهاتف", "Telefon"), key: "customerPhone", placeholder: storePhonePlaceholder(), keyboard: "phone-pad" },
                { label: lbl("Address", "العنوان", "Adresse"), key: "customerAddress", placeholder: lbl("Street, City", "الشارع، المدينة", "Straße, Ort"), keyboard: "default" },
              ].map((f: any) => (
                <View key={f.key} style={styles.editField}>
                  <Text style={[styles.editLabel, isRTL && { textAlign: "right" }]}>{f.label}</Text>
                  <TextInput
                    style={[styles.editInput, isRTL && { textAlign: "right" }]}
                    value={(editForm as any)[f.key]}
                    onChangeText={v => setEditForm(prev => ({ ...prev, [f.key]: v }))}
                    placeholder={f.placeholder}
                    placeholderTextColor={Colors.textMuted}
                    keyboardType={f.keyboard}
                  />
                </View>
              ))}
              {/* Estimated time - only for online orders */}
              {editingOrder?._type !== "pos" && (
                <View style={styles.editField}>
                  <Text style={[styles.editLabel, isRTL && { textAlign: "right" }]}>{lbl("Estimated Time (min)", "وقت التوصيل (دقيقة)", "Geschätzte Zeit (Min)")}</Text>
                  <TextInput
                    style={[styles.editInput, isRTL && { textAlign: "right" }]}
                    value={editForm.estimatedTime}
                    onChangeText={v => setEditForm(prev => ({ ...prev, estimatedTime: v.replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x0660)).replace(/[^0-9]/g, "") }))}
                    placeholder="30"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="number-pad"
                    maxLength={3}
                  />
                </View>
              )}
              {/* Notes - for all types */}
              <View style={styles.editField}>
                <Text style={[styles.editLabel, isRTL && { textAlign: "right" }]}>{lbl("Notes", "ملاحظات", "Notizen")}</Text>
                <TextInput
                  style={[styles.editInput, isRTL && { textAlign: "right" }, { minHeight: 60 }]}
                  value={editForm.notes}
                  onChangeText={v => setEditForm(prev => ({ ...prev, notes: v }))}
                  placeholder={lbl("Notes for the kitchen or driver", "ملاحظات للمطبخ أو السائق", "Hinweise für Küche oder Fahrer")}
                  placeholderTextColor={Colors.textMuted}
                  multiline
                />
              </View>

              {/* Items section */}
              <View style={[styles.editDivider, { marginTop: 10, marginBottom: 15 }]} />
              <View style={[styles.modalHeader, flipRow && { flexDirection: "row-reverse" }, { marginBottom: 10, borderBottomWidth: 0 }]}>
                <Text style={[styles.editLabel, { marginBottom: 0 }]}>{lbl("Order Items", "محتويات الطلب", "Bestellartikel")}</Text>
                <View style={{ flexDirection: flipRow ? "row-reverse" : "row", gap: 8, flexWrap: "wrap" }}>
                  <Pressable onPress={() => { setShowFreeExtrasModal(true); }} style={[styles.addSmallBtn, { borderColor: Colors.success + "60", backgroundColor: Colors.success + "12" }]}>
                    <Ionicons name="leaf-outline" size={16} color={Colors.success} />
                    <Text style={[styles.addSmallText, { color: Colors.success }]}>{lbl("Free Extras", "إضافات مجانية", "Gratis Extras")}</Text>
                  </Pressable>
                  <Pressable onPress={() => { const pizzaCat = (pickerCategories as string[]).find((c: string) => c.toLowerCase().includes("pizza")); setPickerCategory(pizzaCat || "all"); setShowProductPicker(true); }} style={styles.addSmallBtn}>
                    <Ionicons name="add" size={16} color={Colors.accent} />
                    <Text style={styles.addSmallText}>{lbl("Add", "إضافة", "Hinzufügen")}</Text>
                  </Pressable>
                </View>
              </View>

              {editForm.items.length === 0 ? (
                <View style={styles.emptyItems}>
                  <Text style={styles.emptyItemsText}>{lbl("No items in order", "لا توجد أصناف في الطلب", "Keine Artikel")}</Text>
                </View>
              ) : (
                editForm.items.map((it, idx) => (
                  <View key={idx} style={[styles.editItemRow, flipRow && { flexDirection: "row-reverse" }]}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[styles.editItemName, isRTL && { textAlign: "right" }]}>{it.name}</Text>
                      <View style={{ flexDirection: flipRow ? "row-reverse" : "row", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <Text style={styles.editItemPrice}>{formatMoney(it.unitPrice)}</Text>
                        {it.productId ? <Pressable onPress={() => editItemAddons(idx)} hitSlop={8} style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: Colors.accent + "15", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                          <Ionicons name="options-outline" size={12} color={Colors.accent} />
                          <Text style={{ fontSize: 11, color: Colors.accent, fontWeight: "700" }}>{lbl("Edit Addons", "تعديل الإضافات", "Extras bearbeiten")}</Text>
                        </Pressable> : null}
                      </View>
                    </View>
                    <View style={[styles.qtyControl, flipRow && { flexDirection: "row-reverse" }]}>
                      <Pressable onPress={() => { playClickSound("light"); updateItemQty(idx, -1); }} style={styles.qtyBtn}>
                        <Ionicons name="remove" size={16} color={Colors.text} />
                      </Pressable>
                      <Text style={styles.qtyVal}>{it.quantity}</Text>
                      <Pressable onPress={() => { playClickSound("light"); updateItemQty(idx, 1); }} style={styles.qtyBtn}>
                        <Ionicons name="add" size={16} color={Colors.text} />
                      </Pressable>
                    </View>
                    <Text style={styles.editItemTotal}>{formatAmount(Number(it.total) || 0)}</Text>
                    <Pressable onPress={() => updateItemQty(idx, -it.quantity)} style={styles.itemDelBtn} accessibilityLabel={lbl("Remove item", "حذف الصنف", "Artikel entfernen")}>
                      <Ionicons name="trash-outline" size={16} color={Colors.danger} />
                    </Pressable>
                  </View>
                ))
              )}

              <View style={[styles.editDivider, { marginVertical: 15 }]} />
              <View style={[styles.modalTotalRow, flipRow && { flexDirection: "row-reverse" }]}>
                <Text style={styles.modalTotalLabel}>{lbl("Subtotal", "المجموع الفرعي", "Zwischensumme")}</Text>
                <Text style={styles.modalTotalVal}>{formatMoney(editForm.subtotal)}</Text>
              </View>
              {editForm.deliveryFee > 0 && (
                <View style={[styles.modalTotalRow, flipRow && { flexDirection: "row-reverse" }]}>
                  <Text style={styles.modalTotalLabel}>{lbl("Delivery Fee", "رسوم التوصيل", "Liefergebühr")}</Text>
                  <Text style={styles.modalTotalVal}>{formatMoney(editForm.deliveryFee)}</Text>
                </View>
              )}
              {Math.abs(editForm.adjustment) >= 0.005 && (
                <View style={[styles.modalTotalRow, flipRow && { flexDirection: "row-reverse" }]}>
                  <Text style={styles.modalTotalLabel}>
                    {editForm.adjustment < 0
                      ? lbl("Discounts", "الخصومات", "Rabatte")
                      : lbl("Tax & other charges", "الضريبة ورسوم أخرى", "Steuer & weitere Gebühren")}
                  </Text>
                  <Text style={styles.modalTotalVal}>
                    {editForm.adjustment < 0 ? "-" : "+"}{formatMoney(Math.abs(editForm.adjustment))}
                  </Text>
                </View>
              )}
              <View style={[styles.modalTotalRow, flipRow && { flexDirection: "row-reverse" }, { marginTop: 4 }]}>
                <Text style={[styles.modalTotalLabel, { color: Colors.text, fontWeight: "700" }]}>{lbl("Total", "الإجمالي", "Gesamt")}</Text>
                <Text style={[styles.modalTotalVal, { color: Colors.accent, fontSize: 18, fontWeight: "800" }]}>{formatMoney(editForm.totalAmount)}</Text>
              </View>
              <View style={{ height: 40 }} />
            </ScrollView>
            <View style={[styles.modalFooter, flipRow && { flexDirection: "row-reverse" }]}>
              <Pressable style={styles.modalCancelBtn} onPress={() => { playClickSound("light"); setEditingOrder(null); }}>
                <Text style={styles.modalCancelText}>{lbl("Cancel", "إلغاء", "Abbrechen")}</Text>
              </Pressable>
              <Pressable style={[styles.modalCancelBtn, { backgroundColor: Colors.cardBorder + "40", borderColor: "transparent" }]} onPress={() => { playClickSound("light"); printEditedOrder(); }}>
                <Ionicons name="print-outline" size={18} color={Colors.text} style={{ marginBottom: 2 }} />
                <Text style={[styles.modalCancelText, { color: Colors.text, fontSize: 12 }]}>{lbl("Print", "طباعة", "Drucken")}</Text>
              </Pressable>
              <Pressable
                style={[styles.modalSaveBtn, savingEdit && { opacity: 0.6 }]}
                disabled={savingEdit}
                onPress={() => { playClickSound("heavy"); saveEditOrder(); }}
              >
                {savingEdit ? <ActivityIndicator size="small" color="#000" /> : <Text style={styles.modalSaveText}>{lbl("Save Changes", "حفظ التغييرات", "Speichern")}</Text>}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ===== PRODUCT CONFIGURATOR MODAL ===== */}
      <Modal visible={!!configuringProduct} animationType="fade" transparent>
        <View style={styles.pickerOverlay}>
          <View style={[styles.modalContent, { maxWidth: 700, padding: 24, maxHeight: "92%" }]}>
            <View style={[styles.modalHeader, flipRow && { flexDirection: "row-reverse" }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { fontSize: 22, fontWeight: "900" }]}>{configuringProduct?.name}</Text>
                <Text style={{ fontSize: 13, color: Colors.textMuted, marginTop: 2 }}>
                  {showToppingsStep ? lbl("Select Extras", "اختر الإضافات", "Extras wählen") : lbl("Select Size", "اختر الحجم", "Größe wählen")}
                </Text>
              </View>
              <Pressable onPress={() => { setConfiguringProduct(null); setConfiguringItemIndex(null); }} style={{ padding: 4 }}>
                <Ionicons name="close" size={24} color={Colors.textMuted} />
              </Pressable>
            </View>
            {!showToppingsStep ? (
              <ScrollView style={{ marginTop: 15 }} showsVerticalScrollIndicator={false}>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                  {configuringProduct?.variants?.map((v: any, idx: number) => (
                    <Pressable
                      key={idx}
                      style={[styles.statusTab, { flex: 1, minWidth: 140, paddingVertical: 15 }, selectedVariant?.name === v.name && styles.statusTabActive]}
                      onPress={() => {
                        if (isPizzaProduct(configuringProduct)) {
                          setSelectedVariant(v); setSelectedToppings([]); setShowToppingsStep(true);
                        } else {
                          const variantName = configuringProduct.name + (v.name ? ` (${v.name})` : "");
                          if (configuringItemIndex !== null) {
                            setEditForm(prev => {
                              const nextItems = [...prev.items];
                              nextItems[configuringItemIndex] = { ...nextItems[configuringItemIndex], name: variantName, unitPrice: Number(v.price), total: Number(v.price) * nextItems[configuringItemIndex].quantity };
                              const newSubtotal = nextItems.reduce((sum, i) => sum + (i.total || 0), 0);
                              return { ...prev, items: nextItems, subtotal: newSubtotal, totalAmount: Math.max(0, newSubtotal + prev.deliveryFee + prev.adjustment) };
                            });
                          } else {
                            setEditForm(prev => {
                              const nextItems = [...prev.items, { productId: configuringProduct.id, name: variantName, quantity: 1, unitPrice: Number(v.price), total: Number(v.price) }];
                              const newSubtotal = nextItems.reduce((sum, i) => sum + (i.total || 0), 0);
                              return { ...prev, items: nextItems, subtotal: newSubtotal, totalAmount: Math.max(0, newSubtotal + prev.deliveryFee + prev.adjustment) };
                            });
                          }
                          setConfiguringProduct(null);
                        }
                      }}
                    >
                      <Text style={[styles.statusTabText, selectedVariant?.name === v.name && styles.statusTabTextActive]}>{v.name}</Text>
                      <Text style={[styles.statusTabText, { opacity: 0.8, fontSize: 13 }, selectedVariant?.name === v.name && styles.statusTabTextActive]}>{formatMoney(v.price)}</Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            ) : (
              <ScrollView style={{ marginTop: 10 }} showsVerticalScrollIndicator={false}>
                <View style={{ backgroundColor: Colors.accent + "15", padding: 12, borderRadius: 10, marginBottom: 10, flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Ionicons name="pizza" size={20} color={Colors.accent} />
                  <Text style={{ color: Colors.accent, fontWeight: "700", fontSize: 15 }}>
                    {selectedVariant?.name || configuringProduct?.name} — {formatMoney(selectedVariant?.price || configuringProduct?.price)}
                  </Text>
                </View>
                {/* Color-coded POS topping grid */}
                <View style={{ flexDirection: "row", flexWrap: "wrap", borderRadius: 8, overflow: "hidden", marginBottom: 12 }}>
                  {TOPPING_GRID.flatMap((row, rowIdx) =>
                    row.items.map((toppingName, colIdx) => {
                      if (!toppingName) return null;
                      const isSelected = selectedToppings.includes(toppingName);
                      return (
                        <View key={`${rowIdx}-${colIdx}`} style={{ width: "14.28%", height: 48, padding: 1 }}>
                          <Pressable
                            onPress={() => setSelectedToppings(prev => isSelected ? prev.filter(t => t !== toppingName) : [...prev, toppingName])}
                            style={{
                              flex: 1,
                              backgroundColor: isSelected ? Colors.accent : row.color,
                              justifyContent: "center", alignItems: "center",
                              borderWidth: isSelected ? 2 : 0,
                              borderColor: isSelected ? Colors.accent : "transparent",
                              borderRadius: 4,
                              paddingHorizontal: 2, paddingVertical: 2, gap: 1,
                            }}
                          >
                            <Text style={{ fontSize: 16, lineHeight: 18 }}>{toppingEmoji(toppingName)}</Text>
                            <Text style={{ fontSize: 10, fontWeight: "700", textAlign: "center", color: isSelected ? "#000" : row.textColor, lineHeight: 11 }} numberOfLines={2}>
                              {toppingDisplayName(toppingName)}
                            </Text>
                            {isSelected && <Ionicons name="checkmark" size={11} color="#000" style={{ position: "absolute", top: 2, right: 3 }} />}
                          </Pressable>
                        </View>
                      );
                    })
                  )}
                </View>
                {/* Selected toppings summary */}
                {selectedToppings.length > 0 && (
                  <View style={{ marginBottom: 10, padding: 8, backgroundColor: Colors.accent + "15", borderRadius: 8, borderWidth: 1, borderColor: Colors.accent + "40" }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <Text style={{ color: Colors.accent, fontSize: 11, fontWeight: "700" }}>
                        {lbl(`Selected(${selectedToppings.length})`, `الإضافات(${selectedToppings.length})`, `Ausgewählt(${selectedToppings.length})`)}
                      </Text>
                      <Pressable onPress={() => setSelectedToppings([])}>
                        <Text style={{ color: Colors.hueRose, fontSize: 11, fontWeight: "600" }}>{lbl("Clear all", "مسح الكل", "Alle löschen")}</Text>
                      </Pressable>
                    </View>
                    <Text style={{ color: Colors.text, fontSize: 11 }}>{selectedToppings.map(t => toppingDisplayName(t)).join(", ")}</Text>
                  </View>
                )}
                <View style={{ gap: 10, marginTop: 6 }}>
                  <Pressable style={{ borderRadius: 12, overflow: "hidden" }} onPress={applyConfiguringItem}>
                    <LinearGradient colors={[Colors.accent, "#00A3A0"]} style={{ paddingVertical: 14, alignItems: "center" }}>
                      <Text style={{ color: "#000", fontSize: 16, fontWeight: "800" }}>{lbl("Apply Options", "تطبيق الخيارات", "Optionen anwenden")}</Text>
                    </LinearGradient>
                  </Pressable>
                  <Pressable onPress={() => setShowToppingsStep(false)} style={{ paddingVertical: 8 }}>
                    <Text style={{ color: Colors.textMuted, textAlign: "center", fontSize: 13 }}>{lbl("← Back", "← العودة", "← Zurück")}</Text>
                  </Pressable>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ===== FREE EXTRAS MODAL ===== */}
      <Modal visible={showFreeExtrasModal} animationType="fade" transparent onRequestClose={() => { setShowFreeExtrasModal(false); setFreeExtrasSelected([]); }}>
        <View style={styles.pickerOverlay}>
          <View style={[styles.pickerSheet, { maxHeight: "92%" }]}>
            <View style={[styles.modalHeader, flipRow && { flexDirection: "row-reverse" }]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="leaf-outline" size={20} color={Colors.success} />
                <Text style={styles.modalTitle}>{lbl("Free Extras", "إضافات مجانية", "Gratis Extras")}</Text>
              </View>
              <Pressable onPress={() => { setShowFreeExtrasModal(false); setFreeExtrasSelected([]); }}>
                <Ionicons name="close" size={22} color={Colors.textMuted} />
              </Pressable>
            </View>

            <Text style={{ color: Colors.textMuted, fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>
              {lbl("SELECT EXTRAS", "اختر الإضافات", "EXTRAS AUSWÄHLEN")}
            </Text>

            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
              {/* Color-coded topping grid — same as POS */}
              <View style={{ flexDirection: "row", flexWrap: "wrap", borderRadius: 8, overflow: "hidden" }}>
                {TOPPING_GRID.flatMap((row, rowIdx) =>
                  row.items.map((toppingName, colIdx) => {
                    if (!toppingName) return null;
                    const isSelected = freeExtrasSelected.includes(toppingName);
                    return (
                      <View key={`${rowIdx}-${colIdx}`} style={{ width: "14.28%", height: 54, padding: 1 }}>
                        <Pressable
                          onPress={() => { playClickSound("light"); setFreeExtrasSelected(prev => isSelected ? prev.filter(t => t !== toppingName) : [...prev, toppingName]); }}
                          style={{
                            flex: 1,
                            backgroundColor: isSelected ? Colors.accent : row.color,
                            justifyContent: "center", alignItems: "center",
                            borderWidth: isSelected ? 2 : 0,
                            borderColor: isSelected ? Colors.accent : "transparent",
                            borderRadius: 4,
                            paddingHorizontal: 2, paddingVertical: 2, gap: 0,
                          }}
                        >
                          <Text style={{ fontSize: 14, lineHeight: 16 }}>{toppingEmoji(toppingName)}</Text>
                          <Text style={{ fontSize: 9, fontWeight: "700", textAlign: "center", color: isSelected ? "#000" : row.textColor, lineHeight: 10 }} numberOfLines={2}>
                            {toppingDisplayName(toppingName)}
                          </Text>
                          {isSelected && <Ionicons name="checkmark" size={11} color="#000" style={{ position: "absolute", top: 2, right: 3 }} />}
                        </Pressable>
                      </View>
                    );
                  })
                )}
              </View>

              {/* Sauces — separate labeled section, same as POS */}
              <View style={{ marginTop: 8 }}>
                <Text style={{ color: Colors.textMuted, fontSize: 10, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4, paddingHorizontal: 2 }}>
                  {lbl("Sauces", "الصوصات", "Saucen")}
                </Text>
                <View style={{ flexDirection: "row", gap: 4 }}>
                  {SAUCE_ROW.map((sauce) => {
                    const isSelected = freeExtrasSelected.includes(sauce.name);
                    return (
                      <Pressable
                        key={sauce.name}
                        style={{
                          flex: 1, height: 54, borderRadius: 6,
                          backgroundColor: isSelected ? Colors.accent : sauce.color,
                          justifyContent: "center", alignItems: "center", padding: 4,
                          borderWidth: isSelected ? 2 : 0, borderColor: Colors.accent,
                        }}
                        onPress={() => { playClickSound("light"); setFreeExtrasSelected(prev => isSelected ? prev.filter(t => t !== sauce.name) : [...prev, sauce.name]); }}
                      >
                        <Text style={{ fontSize: 14, lineHeight: 16 }}>{toppingEmoji(sauce.name)}</Text>
                        <Text style={{ fontSize: 10, fontWeight: "700", textAlign: "center", color: isSelected ? "#000" : sauce.textColor, lineHeight: 11 }} numberOfLines={1}>
                          {toppingDisplayName(sauce.name)}
                        </Text>
                        {isSelected && <Ionicons name="checkmark" size={11} color="#000" style={{ position: "absolute", top: 2, right: 4 }} />}
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Selected summary */}
              {freeExtrasSelected.length > 0 && (
                <View style={{ marginTop: 8, padding: 8, backgroundColor: Colors.success + "15", borderRadius: 8, borderWidth: 1, borderColor: Colors.success + "40" }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <Text style={{ color: Colors.success, fontSize: 11, fontWeight: "700" }}>
                      {lbl(`Selected (${freeExtrasSelected.length})`, `المختار (${freeExtrasSelected.length})`, `Ausgewählt (${freeExtrasSelected.length})`)}
                    </Text>
                    <Pressable onPress={() => setFreeExtrasSelected([])}>
                      <Text style={{ color: Colors.danger, fontSize: 11, fontWeight: "600" }}>{lbl("Clear all", "مسح الكل", "Alle löschen")}</Text>
                    </Pressable>
                  </View>
                  <Text style={{ color: Colors.text, fontSize: 11 }} numberOfLines={2}>
                    {freeExtrasSelected.map(t => toppingDisplayName(t)).join(" · ")}
                  </Text>
                </View>
              )}
            </ScrollView>

            <Pressable
              style={{ paddingVertical: 13, borderRadius: 10, backgroundColor: Colors.accent, alignItems: "center", marginTop: 8 }}
              onPress={() => {
                if (freeExtrasSelected.length > 0) {
                  setEditForm(prev => {
                    const extrasName = freeExtrasSelected.map(t => toppingDisplayName(t)).join(", ");
                    const nextItems = [
                      ...prev.items,
                      { productId: 0, name: `[Extras] ${extrasName}`, quantity: 1, unitPrice: 0, total: 0 },
                    ];
                    return { ...prev, items: nextItems };
                  });
                }
                setShowFreeExtrasModal(false);
                setFreeExtrasSelected([]);
              }}
            >
              <Text style={styles.modalSaveText}>
                {freeExtrasSelected.length > 0
                  ? lbl(`Add ${freeExtrasSelected.length} Extras`, `إضافة ${freeExtrasSelected.length} إضافة`, `${freeExtrasSelected.length} Extras hinzufügen`)
                  : lbl("Done", "تم", "Fertig")}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ===== PRODUCT PICKER MODAL ===== */}
      <Modal visible={showProductPicker} animationType="fade" transparent onRequestClose={() => { setShowProductPicker(false); setPickerSearch(""); }}>
        <View style={styles.pickerOverlay}>
          <View style={[styles.pickerSheet, { maxHeight: "90%" }]}>
            <View style={[styles.modalHeader, flipRow && { flexDirection: "row-reverse" }]}>
              <Text style={styles.modalTitle}>{lbl("Add Item", "إضافة صنف", "Artikel hinzufügen")}</Text>
              <Pressable onPress={() => { setShowProductPicker(false); setPickerSearch(""); }}>
                <Ionicons name="close" size={22} color={Colors.textMuted} />
              </Pressable>
            </View>

            {/* Search bar */}
            <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: Colors.surfaceLight, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7, marginBottom: 10, borderWidth: 1, borderColor: Colors.cardBorder, gap: 7 }}>
              <Ionicons name="search" size={15} color={Colors.textMuted} />
              <TextInput
                value={pickerSearch}
                onChangeText={setPickerSearch}
                placeholder={lbl("Search products...", "ابحث عن منتج...", "Produkt suchen...")}
                placeholderTextColor={Colors.textMuted}
                style={{ flex: 1, color: Colors.text, fontSize: 13 }}
              />
              {pickerSearch.length > 0 && (
                <Pressable onPress={() => setPickerSearch("")}>
                  <Ionicons name="close-circle" size={15} color={Colors.textMuted} />
                </Pressable>
              )}
            </View>

            {/* Category filter tabs */}
            {pickerCategories.length > 1 && (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                <Pressable
                  style={[styles.pickerCatTab, pickerCategory === "all" && styles.pickerCatTabActive]}
                  onPress={() => setPickerCategory("all")}
                >
                  <Text style={[styles.pickerCatText, pickerCategory === "all" && styles.pickerCatTextActive]}>
                    {lbl("All", "الكل", "Alle")}
                  </Text>
                </Pressable>
                {pickerCategories.map(cat => {
                  const catInfo = (allCategories as any[]).find((c: any) => c.name === cat);
                  return (
                    <Pressable
                      key={cat}
                      style={[styles.pickerCatTab, pickerCategory === cat && styles.pickerCatTabActive, pickerCategory === cat && { borderColor: catInfo?.color || Colors.accent }]}
                      onPress={() => setPickerCategory(cat)}
                    >
                      <Text style={[styles.pickerCatText, pickerCategory === cat && { color: catInfo?.color || Colors.accent }]}>{cat}</Text>
                    </Pressable>
                  );
                })}
              </View>
            )}

            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
              {/* Regular Products Grid */}
              {filteredPickerProducts.length > 0 && (
                <>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7, marginBottom: 16 }}>
                    {filteredPickerProducts.map((p: any) => {
                      const catColor = p.categoryColor || "#7C3AED";
                      return (
                        <Pressable
                          key={String(p.id)}
                          style={[styles.productCard, { borderColor: catColor + "40" }]}
                          onPress={() => addItemToOrder(p)}
                        >
                          {p.image ? (
                            <FallbackOrderImage uri={p.image} style={styles.productCardImage} />
                          ) : (
                            <View style={[styles.productCardImagePlaceholder, { backgroundColor: catColor + "20" }]}>
                              <Ionicons name="fast-food-outline" size={20} color={Colors.textMuted} />
                            </View>
                          )}
                          <View style={styles.productCardBody}>
                            <Text style={styles.productCardName} numberOfLines={2}>{p.name}</Text>
                            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
                              <Text style={[styles.productCardPrice, { color: catColor }]}>{formatMoney(p.price)}</Text>
                              {(p.modifiers?.length > 0 || p.variants?.length > 0 || isPizzaProduct(p)) && (
                                <View style={{ backgroundColor: catColor + "20", paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 }}>
                                  <Text style={{ fontSize: 8, color: catColor, fontWeight: "700" }}>+</Text>
                                </View>
                              )}
                            </View>
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                </>
              )}

              {enrichedProducts.length === 0 && (
                <Text style={[styles.emptyItemsText, { textAlign: "center", marginTop: 40 }]}>{lbl("No products found", "لا يوجد منتجات", "Keine Produkte")}</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <TabPageHeader
        title={lbl("All Orders", "جميع الطلبات", "Alle Bestellungen")}
        subtitle={pendingCount > 0
          ? lbl(`${pendingCount} online order${pendingCount > 1 ? "s" : ""} pending`, `${pendingCount} طلب إلكتروني جديد`, `${pendingCount} offene Online-Bestellung${pendingCount > 1 ? "en" : ""}`)
          : lbl("Live orders dashboard", "لوحة الطلبات المباشرة", "Live-Bestellübersicht")}
        icon="receipt"
        isRTL={isRTL}
        colors={["#1E1B4B", "#312E81", "#0A0E27"]}
        rightActions={pendingCount > 0 ? (
          <Animated.View style={[styles.pendingBadge, { transform: [{ scale: pulseAnim }] }]}>
            <Text style={styles.pendingBadgeText}>{pendingCount}</Text>
          </Animated.View>
        ) : undefined}
      >
        <View style={[styles.filterRow, flipRow && { flexDirection: "row-reverse" }]}>
          {([
            { key: "all", icon: "layers-outline", en: "All Orders", ar: "الكل", de: "Alle" },
            { key: "online", icon: "globe-outline", en: "Online", ar: "إلكتروني", de: "Online" },
            { key: "dine_in", icon: "restaurant-outline", en: "Tables", ar: "طاولات", de: "Tische" },
            { key: "pos", icon: "call-outline", en: "POS", ar: "كاشير", de: "Kasse" },
          ] as const).map(f => (
            <Pressable key={f.key} onPress={() => { playClickSound("light"); setViewMode(f.key); }} style={[styles.filterTab, styles.filterTabWithIcon, viewMode === f.key && styles.filterTabActive]}>
              <Ionicons name={f.icon} size={14} color={viewMode === f.key ? Colors.accent : "rgba(255,255,255,0.85)"} />
              <Text style={[styles.filterTabText, viewMode === f.key && styles.filterTabTextActive]}>
                {language === "ar" ? f.ar : language === "de" ? f.de : f.en}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={[styles.filterRow, flipRow && { flexDirection: "row-reverse" }]}>
          {[
            { key: "active", en: "Active", ar: "النشطة", de: "Aktiv" },
            { key: "done", en: "Done", ar: "المكتملة", de: "Erledigt" },
            { key: "all", en: "All", ar: "الكل", de: "Alle" },
          ].map(f => (
            <Pressable key={f.key} onPress={() => { playClickSound("light"); setFilter(f.key); }} style={[styles.filterTab, filter === f.key && styles.filterTabActive]}>
              <Text style={[styles.filterTabText, filter === f.key && styles.filterTabTextActive]}>
                {language === "ar" ? f.ar : language === "de" ? f.de : f.en}
                {f.key === "active" && pendingCount > 0 && viewMode !== "pos" ? ` (${pendingCount})` : ""}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Delivery order type filter */}
        {viewMode === "online" && (
          <View style={[styles.filterRow, flipRow && { flexDirection: "row-reverse" }]}>
            {([
              { key: "all_types", icon: "apps-outline", en: "All Types", ar: "الكل", de: "Alle" },
              { key: "delivery", icon: "bicycle-outline", en: "Delivery", ar: "توصيل", de: "Lieferung" },
              { key: "pickup", icon: "walk-outline", en: "Pickup", ar: "استلام", de: "Abholung" },
              { key: "dine_in", icon: "restaurant-outline", en: "Dine-in", ar: "في المطعم", de: "Vor Ort" },
              { key: "scheduled", icon: "calendar-outline", en: "Scheduled", ar: "مجدول", de: "Geplant" },
            ] as const).map(f => {
              const active = (orderTypeFilter || "all_types") === f.key;
              return (
                <Pressable
                  key={f.key}
                  onPress={() => { playClickSound("light"); setOrderTypeFilter(f.key); }}
                  style={[
                    styles.filterTab,
                    styles.filterTabWithIcon,
                    { paddingHorizontal: 8 },
                    active && { backgroundColor: Colors.deliveryPrimaryLight, borderColor: Colors.deliveryPrimary },
                  ]}
                >
                  <Ionicons name={f.icon} size={14} color={active ? Colors.deliveryPrimary : "rgba(255,255,255,0.85)"} />
                  <Text style={[styles.filterTabText, active && { color: Colors.deliveryPrimary }]}>
                    {language === "ar" ? f.ar : language === "de" ? f.de : f.en}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </TabPageHeader>

      {/* ===== ORDER LIST ===== */}
      <FlatList
        data={filteredOrders}
        keyExtractor={(item: any) => `${item._type}-${item.id}`}
        renderItem={renderOrder}
        contentContainerStyle={[styles.listContent, { paddingBottom: bottomPad + 24 }]}
        ListHeaderComponent={
          <>
            {onlineError ? (
              <View style={[styles.errorBanner, flipRow && { flexDirection: "row-reverse" }]}>
                <Ionicons name="cloud-offline-outline" size={18} color={Colors.danger} />
                <Text style={[styles.errorBannerText, isRTL && { textAlign: "right" }]} numberOfLines={3}>
                  {lbl("Online orders could not be refreshed", "تعذّر تحديث الطلبات الإلكترونية", "Online-Bestellungen konnten nicht aktualisiert werden")}
                  {onlineErrorObj ? ` — ${apiErrorMessage(onlineErrorObj, "")}` : ""}
                </Text>
                <Pressable onPress={() => refetchOnline()} style={styles.errorRetryBtn}>
                  <Text style={styles.errorRetryText}>{lbl("Retry", "إعادة", "Erneut")}</Text>
                </Pressable>
              </View>
            ) : null}
            {bcToast ? (
              <View style={styles.bcToast}><Text style={styles.bcToastText}>{bcToast}</Text></View>
            ) : null}
            {(broadcastOrders as any[]).length > 0 ? (
              <View style={styles.bcSection}>
                <View style={styles.bcSectionHdr}>
                  <Text style={[styles.bcSectionTitle, isRTL && { textAlign: "right" }]}>
                    {lbl("Incoming broadcast orders", "طلبات مفتوحة لكل المطاعم", "Eingehende Broadcast-Bestellungen")}
                    {"  "}
                    <Text style={styles.bcSectionCount}>({(broadcastOrders as any[]).length})</Text>
                  </Text>
                  <Text style={[styles.bcSectionSub, isRTL && { textAlign: "right" }]}>
                    {lbl("First to accept wins. Tap Accept to take the order.", "أول من يقبل يفوز. اضغط قبول لاستلام الطلب.", "Wer zuerst annimmt, gewinnt. Tippen Sie auf Annehmen.")}
                  </Text>
                </View>
                {(broadcastOrders as any[]).map((bc: any) => {
                  const expiresMs = new Date(bc.expiresAt).getTime() - Date.now();
                  const secsLeft = Math.max(0, Math.floor(expiresMs / 1000));
                  const expired = secsLeft <= 0;
                  const bcBusy = bcBusyId === bc.id;
                  const bcItems = Array.isArray(bc.items) ? bc.items : (typeof bc.items === "string" ? (() => { try { return JSON.parse(bc.items); } catch { return []; } })() : []);
                  return (
                    <View key={`bc-${bc.id}`} style={[styles.bcCard, expired && { opacity: 0.55 }]}>
                      <View style={[styles.bcRow, flipRow && { flexDirection: "row-reverse" }]}>
                        <Text style={[styles.bcName, isRTL && { textAlign: "right" }]} numberOfLines={1}>{bc.customerName}</Text>
                        <Text style={styles.bcTimer}>
                          {expired ? lbl("Expired", "انتهى", "Abgelaufen") : `⏱ ${Math.floor(secsLeft / 60)}:${String(secsLeft % 60).padStart(2, "0")}`}
                        </Text>
                      </View>
                      <Text style={[styles.bcMeta, isRTL && { textAlign: "right" }]}>{bc.customerPhone}</Text>
                      {bc.customerAddress ? <Text style={[styles.bcMeta, isRTL && { textAlign: "right" }]}>{bc.customerAddress}</Text> : null}
                      <View style={styles.bcItemsBox}>
                        {bcItems.map((it: any, idx: number) => (
                          <Text key={idx} style={[styles.bcItem, isRTL && { textAlign: "right" }]}>• {it.quantity}× {it.name}{it.notes ? ` — ${it.notes}` : ""}</Text>
                        ))}
                      </View>
                      {bc.notes ? <Text style={[styles.bcNotes, isRTL && { textAlign: "right" }]}>{bc.notes}</Text> : null}
                      <View style={[styles.bcTotalRow, flipRow && { flexDirection: "row-reverse" }]}>
                        <Text style={styles.bcTotalLbl}>{lbl("Est. total", "الإجمالي المقدّر", "Geschätzte Summe")}</Text>
                        <Text style={styles.bcTotalVal}>{formatMoney(bc.estimatedTotal || 0)}</Text>
                      </View>
                      <View style={[styles.bcActions, flipRow && { flexDirection: "row-reverse" }]}>
                        <Pressable style={[styles.bcBtn, styles.bcBtnReject, (bcBusy || !!bcBusyId) && { opacity: 0.6 }]} onPress={() => rejectBroadcast(bc)} disabled={!!bcBusyId}>
                          <Text style={styles.bcBtnRejectText}>{lbl("Reject", "رفض", "Ablehnen")}</Text>
                        </Pressable>
                        <Pressable style={[styles.bcBtn, styles.bcBtnAccept, (bcBusy || expired) && { opacity: 0.6 }]} onPress={() => acceptBroadcast(bc)} disabled={!!bcBusyId || expired}>
                          {bcBusy ? <ActivityIndicator size="small" color="#fff" /> : (
                            <Text style={styles.bcBtnAcceptText}>{lbl("Accept", "قبول", "Annehmen")}</Text>
                          )}
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : null}
          </>
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons
              name={viewMode === "online" ? "globe-outline" : viewMode === "pos" ? "call-outline" : "receipt-outline"}
              size={52}
              color={Colors.textMuted}
              style={styles.emptyIcon}
            />
            {filter !== "all" || (viewMode === "online" && orderTypeFilter !== "all_types") ? (
              <>
                <Text style={styles.emptyTitle}>{lbl("No orders match this filter", "لا توجد طلبات تطابق هذا الفلتر", "Keine Bestellungen für diesen Filter")}</Text>
                <Pressable onPress={() => { setFilter("all"); setOrderTypeFilter("all_types"); }} style={styles.emptyResetBtn}>
                  <Text style={styles.emptyResetText}>{lbl("Show all", "عرض الكل", "Alle anzeigen")}</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={styles.emptyTitle}>{lbl("No orders yet", "لا توجد طلبات", "Keine Bestellungen")}</Text>
                <Text style={styles.emptyText}>
                  {lbl("Orders will appear here in real time", "ستظهر الطلبات هنا فور وصولها", "Bestellungen erscheinen hier in Echtzeit")}
                </Text>
              </>
            )}
          </View>
        }
      />

      {/* ===== Chat with customer modal ===== */}
      <Modal visible={!!chatRoomOrderId} animationType="slide" onRequestClose={() => setChatOrder(null)} transparent>
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.chatSheet}>
            <View style={[styles.chatHeader, flipRow && { flexDirection: "row-reverse" }]}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[{ color: Colors.text, fontWeight: "800", fontSize: 16 }, isRTL && { textAlign: "right" }]}>{lbl("Chat with customer", "محادثة العميل", "Chat mit Kunde")}</Text>
                <Text style={[{ color: Colors.textMuted, fontSize: 12, marginTop: 2 }, isRTL && { textAlign: "right" }]}>{lbl("Order", "طلب", "Bestellung")} {chatOrder?.label}</Text>
              </View>
              <Pressable onPress={() => setChatOrder(null)} style={styles.modalCloseBtn} accessibilityLabel={lbl("Close", "إغلاق", "Schließen")}>
                <Ionicons name="close" size={22} color={Colors.text} />
              </Pressable>
            </View>
            <ScrollView style={{ flex: 1, marginBottom: 8 }} contentContainerStyle={{ paddingBottom: 12 }} keyboardShouldPersistTaps="handled">
              {chatLoading && chatMessages.length === 0 ? (
                <View style={{ padding: 20, alignItems: "center" }}><ActivityIndicator color={Colors.accent} /></View>
              ) : chatError ? (
                <View style={{ padding: 30, alignItems: "center", gap: 10 }}>
                  <Ionicons name="cloud-offline-outline" size={36} color={Colors.textMuted} />
                  <Text style={{ color: Colors.textMuted, fontSize: 13, textAlign: "center" }}>{chatError}</Text>
                  <Pressable
                    onPress={() => { const o = normalizedOnlineOrders.find((x: any) => x.id === chatRoomOrderId); if (o) openChat(o); }}
                    style={styles.emptyResetBtn}
                  >
                    <Text style={styles.emptyResetText}>{lbl("Try again", "إعادة المحاولة", "Erneut versuchen")}</Text>
                  </Pressable>
                </View>
              ) : chatMessages.length === 0 ? (
                <View style={{ padding: 30, alignItems: "center" }}>
                  <Ionicons name="chatbubbles-outline" size={40} color={Colors.textMuted} style={{ marginBottom: 8, opacity: 0.6 }} />
                  <Text style={{ color: Colors.textMuted, fontSize: 13, textAlign: "center" }}>
                    {lbl("No messages yet — write the first one", "لا توجد رسائل بعد — اكتب أول رسالة", "Noch keine Nachrichten — schreiben Sie die erste")}
                  </Text>
                </View>
              ) : chatMessages.map((m, i) => {
                const mine = m.senderType !== "customer";
                return (
                  <View key={i} style={{ alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "78%", marginVertical: 4, padding: 10, paddingHorizontal: 14, borderRadius: 14, backgroundColor: mine ? Colors.accent : Colors.surface, borderBottomRightRadius: mine ? 4 : 14, borderBottomLeftRadius: mine ? 14 : 4 }}>
                    {!mine ? <Text style={{ color: Colors.textMuted, fontSize: 11, marginBottom: 2, fontWeight: "700" }}>{m.senderName || lbl("Customer", "العميل", "Kunde")}</Text> : null}
                    <Text style={{ color: mine ? "#fff" : Colors.text, fontSize: 14 }}>{m.body}</Text>
                    <Text style={{ color: mine ? "rgba(255,255,255,0.7)" : Colors.textMuted, fontSize: 10, marginTop: 4 }}>
                      {formatInStoreTz(m.createdAt, dateLocale, { hour: "2-digit", minute: "2-digit" })}
                    </Text>
                  </View>
                );
              })}
            </ScrollView>
            <View style={[styles.chatInputRow, flipRow && { flexDirection: "row-reverse" }]}>
              <TextInput
                value={chatDraft}
                onChangeText={setChatDraft}
                placeholder={lbl("Type a reply…", "اكتب رداً…", "Antwort eingeben…")}
                placeholderTextColor={Colors.textMuted}
                style={[styles.chatInput, isRTL && { textAlign: "right" }]}
                onSubmitEditing={sendChatMessage}
                editable={!!chatRoomId}
                maxLength={2000}
              />
              <Pressable
                onPress={sendChatMessage}
                disabled={!chatRoomId || chatSending || !chatDraft.trim()}
                style={[styles.chatSendBtn, (!chatRoomId || chatSending || !chatDraft.trim()) && { opacity: 0.5 }]}
              >
                {chatSending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ color: "#fff", fontWeight: "800" }}>{lbl("Send", "إرسال", "Senden")}</Text>}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = themedStyles((Colors) => ({
  container: { flex: 1, backgroundColor: Colors.background },
  // ── Broadcast (marketplace) panel ─────────────────────────
  bcToast: { backgroundColor: Colors.accent + "20", borderColor: Colors.accent + "60", borderWidth: 1, padding: 12, borderRadius: 10, marginBottom: 10 },
  bcToastText: { color: Colors.accent, fontWeight: "600", textAlign: "center" as const },
  bcSection: { marginBottom: 16, backgroundColor: "rgba(255,152,0,0.05)", borderWidth: 1, borderColor: "rgba(255,152,0,0.25)", borderRadius: 14, padding: 12 },
  bcSectionHdr: { marginBottom: 8 },
  bcSectionTitle: { color: "#FF9800", fontSize: 15, fontWeight: "800" },
  bcSectionCount: { color: "#FF9800", fontWeight: "600", fontSize: 13 },
  bcSectionSub: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  bcCard: { backgroundColor: Colors.surface, borderRadius: 12, padding: 14, marginTop: 8, borderLeftWidth: 4, borderLeftColor: "#FF9800" },
  bcRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  bcName: { color: Colors.text, fontSize: 16, fontWeight: "700", flex: 1 },
  bcTimer: { color: "#FF9800", fontWeight: "700", fontSize: 13 },
  bcMeta: { color: Colors.textMuted, fontSize: 13, marginTop: 2 },
  bcItemsBox: { marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.06)" },
  bcItem: { color: Colors.text, fontSize: 13, marginVertical: 2 },
  bcNotes: { color: Colors.textMuted, fontSize: 12, fontStyle: "italic" as const, marginTop: 6 },
  bcTotalRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.06)" },
  bcTotalLbl: { color: Colors.textMuted, fontSize: 13 },
  bcTotalVal: { color: "#FF9800", fontWeight: "800", fontSize: 16 },
  bcActions: { flexDirection: "row", gap: 8, marginTop: 12 },
  bcBtn: { flex: 1, padding: 12, borderRadius: 10, alignItems: "center" as const },
  bcBtnReject: { backgroundColor: "transparent", borderWidth: 1, borderColor: Colors.danger + "60" },
  bcBtnRejectText: { color: Colors.danger, fontWeight: "600" },
  bcBtnAccept: { backgroundColor: "#10B981" },
  bcBtnAcceptText: { color: "#fff", fontWeight: "800" },
  pendingBadge: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.danger,
    justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: "rgba(255,255,255,0.3)",
  },
  pendingBadgeText: { color: "#fff", fontWeight: "900", fontSize: 18 },
  filterRow: { flexDirection: "row", gap: 8, paddingBottom: 10, flexWrap: "wrap" },
  filterTab: {
    paddingHorizontal: 14, paddingVertical: 7, minHeight: 36, justifyContent: "center", borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
  },
  filterTabWithIcon: { flexDirection: "row", alignItems: "center", gap: 6 },
  filterTabActive: { backgroundColor: Colors.accent + "22", borderColor: Colors.accent },
  filterTabText: { color: "rgba(255,255,255,0.82)", fontSize: 12, fontWeight: "600" },
  filterTabTextActive: { color: Colors.accent },
  listContent: { padding: 12, paddingBottom: 100, gap: 12 },

  orderCard: {
    backgroundColor: Colors.surface, borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: Colors.cardBorder, borderLeftWidth: 4,
  },
  orderCardNew: {
    borderColor: Colors.hueAmber,
    elevation: 6,
    ...(Platform.OS === "web" ? { boxShadow: "0px 0px 8px rgba(245,158,11,0.25)" } as any : { shadowColor: "#F59E0B", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.25, shadowRadius: 8 }),
  },
  orderCardPos: {
    borderStyle: "dashed" as any,
  },
  newDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.hueAmber, marginRight: 6 },
  sourceBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, borderWidth: 1,
  },
  sourceBadgeText: { fontSize: 10, fontWeight: "800" },
  orderHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 8 },
  orderNumRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap", flex: 1, minWidth: 0 },
  orderNum: { color: Colors.text, fontWeight: "800", fontSize: 14 },
  statusBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1,
  },
  statusText: { fontSize: 10, fontWeight: "700" },
  orderAmount: { color: Colors.accent, fontWeight: "900", fontSize: 17 },

  customerRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 10 },
  customerIcon: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(47,211,198,0.12)",
    justifyContent: "center", alignItems: "center",
  },
  customerName: { color: Colors.text, fontWeight: "700", fontSize: 13 },
  customerSub: { color: Colors.textMuted, fontSize: 11, marginTop: 1 },
  metaChips: { flexDirection: "column", gap: 4, alignItems: "flex-end", maxWidth: "45%" },
  contactRow: { flexDirection: "row", gap: 8, marginTop: 6, flexWrap: "wrap" },
  contactBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, minHeight: 32, borderRadius: 8, backgroundColor: Colors.surfaceLight },
  contactBtnText: { fontSize: 12, fontWeight: "700" },
  extraRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: 8 },
  driverChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, minHeight: 36, borderRadius: 8, backgroundColor: Colors.deliveryPrimaryLight, maxWidth: 220 },
  driverChipText: { color: Colors.deliveryPrimary, fontSize: 12, fontWeight: "700", flexShrink: 1 },
  chatBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, minHeight: 36, backgroundColor: Colors.surface, borderRadius: 8, borderWidth: 1, borderColor: Colors.accent + "40" },
  payConfirmBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, minHeight: 44, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: Colors.warning + "80", backgroundColor: Colors.warning + "18" },
  payConfirmText: { color: Colors.warning, fontWeight: "800", fontSize: 13 },
  errorBanner: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: Colors.danger + "60", backgroundColor: Colors.danger + "14" },
  errorBannerText: { flex: 1, minWidth: 0, color: Colors.text, fontSize: 12 },
  errorRetryBtn: { paddingHorizontal: 12, minHeight: 36, justifyContent: "center", borderRadius: 8, backgroundColor: Colors.danger },
  errorRetryText: { color: Colors.white, fontWeight: "700", fontSize: 12 },
  emptyResetBtn: { marginTop: 12, paddingHorizontal: 16, minHeight: 40, justifyContent: "center", borderRadius: 10, backgroundColor: Colors.accent + "22", borderWidth: 1, borderColor: Colors.accent },
  emptyResetText: { color: Colors.accent, fontWeight: "700", fontSize: 13 },
  chatSheet: { backgroundColor: Colors.background, height: "85%", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, width: "100%", maxWidth: 720, alignSelf: "center" },
  chatHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: 8 },
  chatInputRow: { flexDirection: "row", gap: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: Colors.border },
  chatInput: { flex: 1, minHeight: 44, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 12, color: Colors.text, fontSize: 14 },
  chatSendBtn: { backgroundColor: Colors.accent, paddingHorizontal: 18, minHeight: 44, justifyContent: "center", alignItems: "center", borderRadius: 10, minWidth: 72 },
  modalCloseBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  readOnlyBox: { backgroundColor: Colors.background, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: Colors.cardBorder },
  readOnlyText: { color: Colors.text, fontSize: 14 },
  metaChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(255,255,255,0.06)", paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  metaChipText: { color: Colors.textSecondary, fontSize: 10, fontWeight: "600" },

  itemsList: { backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 10, padding: 10, marginBottom: 10, gap: 4 },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  itemQty: { color: Colors.accent, fontWeight: "700", fontSize: 12, minWidth: 24 },
  itemName: { color: Colors.textSecondary, fontSize: 12 },
  itemAddons: { color: Colors.textMuted, fontSize: 11, marginLeft: 32, marginTop: 2, fontStyle: "italic" },
  itemPrice: { color: Colors.text, fontWeight: "600", fontSize: 12 },
  orderNotes: { color: Colors.warning, fontSize: 11, marginTop: 4 },

  totalsRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  timeText: { color: Colors.textMuted, fontSize: 11 },
  feeText: { color: Colors.textMuted, fontSize: 11 },

  actions: { flexDirection: "row", gap: 8, alignItems: "center" },
  nextBtnWrap: { flex: 1, minWidth: 120, borderRadius: 10, overflow: "hidden" },
  actionBtnPrimary: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, minHeight: 44, paddingHorizontal: 12, borderRadius: 10,
  },
  actionBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  editBtn: {
    width: 44, height: 44, borderRadius: 10,
    backgroundColor: "rgba(47,211,198,0.1)", borderWidth: 1, borderColor: "rgba(47,211,198,0.3)",
    justifyContent: "center", alignItems: "center",
  },
  cancelBtn: {
    width: 44, height: 44, borderRadius: 10,
    backgroundColor: "rgba(239,68,68,0.1)", borderWidth: 1, borderColor: "rgba(239,68,68,0.3)",
    justifyContent: "center", alignItems: "center",
  },
  deleteBtn: {
    width: 44, height: 44, borderRadius: 10,
    backgroundColor: "rgba(239,68,68,0.1)", borderWidth: 1, borderColor: "rgba(239,68,68,0.3)",
    justifyContent: "center", alignItems: "center",
  },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalSheet: {
    backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, maxHeight: "88%", height: "88%", width: "100%", maxWidth: 760, alignSelf: "center",
  },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { color: Colors.text, fontWeight: "800", fontSize: 16 },
  editField: { marginBottom: 14 },
  editLabel: { color: Colors.textMuted, fontSize: 11, fontWeight: "600", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  editInput: {
    backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.cardBorder,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: Colors.text, fontSize: 14,
  },
  modalFooter: { flexDirection: "row", gap: 10, marginTop: 16 },
  modalCancelBtn: { flex: 1, minHeight: 46, justifyContent: "center", borderRadius: 10, borderWidth: 1, borderColor: Colors.cardBorder, alignItems: "center" },
  modalCancelText: { color: Colors.textMuted, fontWeight: "600", fontSize: 14 },
  modalSaveBtn: { flex: 2, minHeight: 46, justifyContent: "center", borderRadius: 10, backgroundColor: Colors.accent, alignItems: "center" },
  modalSaveText: { color: "#000", fontWeight: "800", fontSize: 14 },

  editDivider: { height: 1, backgroundColor: Colors.cardBorder },
  addSmallBtn: { flexDirection: "row", alignItems: "center", gap: 4, minHeight: 36, paddingHorizontal: 10, borderRadius: 8, backgroundColor: Colors.accent + "15" },
  addSmallText: { color: Colors.accent, fontSize: 12, fontWeight: "700" },
  emptyItems: { padding: 20, alignItems: "center" },
  emptyItemsText: { color: Colors.textMuted, fontSize: 12 },
  editItemRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.cardBorder + "44" },
  editItemName: { color: Colors.text, fontSize: 13, fontWeight: "600" },
  editItemPrice: { color: Colors.textMuted, fontSize: 11 },
  qtyControl: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.background, borderRadius: 8, borderWidth: 1, borderColor: Colors.cardBorder },
  qtyBtn: { width: 36, height: 36, justifyContent: "center", alignItems: "center" },
  qtyVal: { color: Colors.text, fontSize: 13, fontWeight: "700", minWidth: 24, textAlign: "center" },
  editItemTotal: { color: Colors.text, fontSize: 13, fontWeight: "700", minWidth: 50, textAlign: "right" },
  itemDelBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  modalTotalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 2 },
  modalTotalLabel: { color: Colors.textMuted, fontSize: 12 },
  modalTotalVal: { color: Colors.text, fontSize: 13, fontWeight: "600" },

  // Product Picker
  pickerOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", alignItems: "center", padding: 16 },
  pickerSheet: { backgroundColor: Colors.surface, borderRadius: 20, width: "100%", maxWidth: 600, padding: 20 },
  pickerSectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.cardBorder + "55" },
  pickerSectionTitle: { color: Colors.textMuted, fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.8, flex: 1 },
  freeBadge: { backgroundColor: Colors.success + "22", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  freeBadgeText: { color: Colors.success, fontSize: 10, fontWeight: "800" },
  freePrice: { color: Colors.success, fontWeight: "800", fontSize: 14 },

  pickerCatTab: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999,
    backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.cardBorder,
  },
  pickerCatTabActive: { backgroundColor: Colors.accent + "15", borderColor: Colors.accent },
  pickerCatText: { color: Colors.textMuted, fontSize: 12, fontWeight: "600" },
  pickerCatTextActive: { color: Colors.accent },

  // Product grid cards
  productCard: {
    width: "31%", borderRadius: 12, overflow: "hidden",
    backgroundColor: Colors.surface, borderWidth: 1,
    elevation: 2,
    ...(Platform.OS === "web" ? { boxShadow: "0px 2px 6px rgba(0,0,0,0.12)" } as any : {}),
  },
  productCardImage: { width: "100%", height: 70 },
  productCardImagePlaceholder: { width: "100%", height: 70, alignItems: "center", justifyContent: "center" },
  productCardBody: { padding: 7 },
  productCardName: { color: Colors.text, fontSize: 11, fontWeight: "700", lineHeight: 14 },
  productCardPrice: { fontSize: 11, fontWeight: "800" },

  addonChip: {
    flexDirection: "row", gap: 6, paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10, backgroundColor: Colors.background,
    borderWidth: 1, borderColor: Colors.success + "40", alignItems: "center",
  },
  addonChipText: { color: Colors.text, fontSize: 12, fontWeight: "600" },

  // Configurator
  modalContent: {
    backgroundColor: Colors.surface, borderRadius: 20, padding: 24, width: "92%", maxWidth: 600,
    shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 24,
  },
  statusTab: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.cardBorder, alignItems: "center" },
  statusTabActive: { backgroundColor: Colors.accent + "15", borderColor: Colors.accent },
  statusTabText: { color: Colors.text, fontSize: 14, fontWeight: "600" },
  statusTabTextActive: { color: Colors.accent },

  emptyState: { alignItems: "center", paddingTop: 80, paddingHorizontal: 32 },
  emptyIcon: { marginBottom: 16, opacity: 0.7 },
  emptyTitle: { color: Colors.text, fontSize: 18, fontWeight: "800", marginBottom: 8 },
  emptyText: { color: Colors.textMuted, fontSize: 13, textAlign: "center", lineHeight: 20 },
}));
