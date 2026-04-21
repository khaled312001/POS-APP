import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  StyleSheet, Text, View, FlatList, Pressable, ScrollView,
  Alert, Platform, Animated, RefreshControl, Modal, TextInput, KeyboardAvoidingView,
  Image, useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Colors } from "@/constants/colors";
import { useLicense } from "@/lib/license-context";
import { apiRequest, getQueryFn, getApiUrl } from "@/lib/query-client";
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
import DeliveryStatusPipeline from "@/components/DeliveryStatusPipeline";

const STATUS_FLOW = ["pending", "accepted", "preparing", "ready", "delivered"];

const STATUS_META: Record<string, { label: string; labelAr: string; labelDe: string; color: string; icon: string; next?: string }> = {
  pending: { label: "Pending", labelAr: "انتظار", labelDe: "Ausstehend", color: "#F59E0B", icon: "time-outline", next: "accepted" },
  accepted: { label: "Accepted", labelAr: "مقبول", labelDe: "Angenommen", color: "#3B82F6", icon: "checkmark-circle-outline", next: "preparing" },
  preparing: { label: "Preparing", labelAr: "قيد التحضير", labelDe: "In Zubereitung", color: "#8B5CF6", icon: "flame-outline", next: "ready" },
  ready: { label: "Ready", labelAr: "جاهز", labelDe: "Fertig", color: "#2FD3C6", icon: "bag-check-outline", next: "delivered" },
  delivered: { label: "Delivered", labelAr: "تم التوصيل", labelDe: "Geliefert", color: "#10B981", icon: "checkmark-done-outline" },
  cancelled: { label: "Cancelled", labelAr: "ملغي", labelDe: "Storniert", color: "#EF4444", icon: "close-circle-outline" },
  completed: { label: "Completed", labelAr: "مكتمل", labelDe: "Abgeschlossen", color: "#10B981", icon: "checkmark-done-outline" },
};

const PAY_ICON: Record<string, string> = { cash: "💵", card: "💳", mobile: "📱" };

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


export default function OrdersScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { tenant } = useLicense();
  const { language } = useLanguage();
  const qc = useQueryClient();
  const tenantId = tenant?.id;

  const [viewMode, setViewMode] = useState<"online" | "pos" | "all">("all");
  const [filter, setFilter] = useState<string>("all");
  const [orderTypeFilter, setOrderTypeFilter] = useState<string>("all_types");
  const [driverAssignOrderId, setDriverAssignOrderId] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [newOrderIds, setNewOrderIds] = useState<Set<number>>(new Set());
  const knownOrderIds = useRef<Set<string>>(new Set());
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Edit state (unified for both types)
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [editForm, setEditForm] = useState<{
    customerName: string;
    customerPhone: string;
    customerAddress: string;
    notes: string;
    estimatedTime: string;
    items: any[];
    subtotal: number;
    deliveryFee: number;
    totalAmount: number;
  }>({
    customerName: "", customerPhone: "", customerAddress: "",
    notes: "", estimatedTime: "", items: [],
    subtotal: 0, deliveryFee: 0, totalAmount: 0,
  });

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

  const isRTL = language === "ar";
  const { topPad } = getChromeMetrics(width);
  const lbl = (en: string, ar: string, de: string) =>
    language === "ar" ? ar : language === "de" ? de : en;

  // --- Data Queries ---
  const { data: onlineOrders = [], refetch: refetchOnline } = useQuery<any[]>({
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
    if (filter === "active") return ["pending", "accepted", "preparing", "ready"].includes(o.status);
    if (filter === "done") return ["delivered", "cancelled", "completed"].includes(o.status);
    // Delivery order type filter
    if (orderTypeFilter === "delivery") return o.orderType === "delivery";
    if (orderTypeFilter === "pickup") return o.orderType === "pickup";
    if (orderTypeFilter === "dine_in") return o.orderType === "dine_in";
    if (orderTypeFilter === "scheduled") return Boolean(o.scheduledAt);
    return true;
  });

  const pendingCount = normalizedOnlineOrders.filter((o: any) => o.status === "pending").length;

  // New order notification
  useEffect(() => {
    if (!normalizedOnlineOrders.length) return;
    const incoming = normalizedOnlineOrders.filter(o => !knownOrderIds.current.has(`online-${o.id}`) && o.status === "pending");
    if (incoming.length > 0) {
      playNotificationSound();
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
    }
    normalizedOnlineOrders.forEach(o => knownOrderIds.current.add(`online-${o.id}`));
  }, [normalizedOnlineOrders]);

  // ── Broadcast Orders (marketplace / drop-shipping) ───────────────────
  const { data: broadcastOrders = [], refetch: refetchBroadcasts } = useQuery<any[]>({
    queryKey: ["/api/broadcast-orders/pending", tenantId ? `?tenantId=${tenantId}` : ""],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!tenantId,
    refetchInterval: 10000,
  });
  const [bcBusyId, setBcBusyId] = useState<number | null>(null);
  const [bcToast, setBcToast] = useState<string | null>(null);

  const acceptBroadcast = async (bc: any) => {
    if (!tenantId || bcBusyId) return;
    setBcBusyId(bc.id);
    try {
      const res = await apiRequest("POST", `/api/broadcast-orders/${bc.id}/accept`, { tenantId });
      const data = await res.json();
      if (data?.success) {
        playNotificationSound();
        setBcToast(lbl("✅ Order accepted — now in your POS queue", "✅ تم قبول الطلب — موجود الآن في قائمتك", "✅ Bestellung angenommen"));
        qc.invalidateQueries({ queryKey: ["/api/broadcast-orders/pending"] });
        qc.invalidateQueries({ queryKey: ["/api/online-orders"] });
      } else {
        setBcToast(data?.error || lbl("Too late — another restaurant accepted first", "فات الوقت — مطعم آخر قبل الطلب أولاً", "Zu spät — ein anderes Restaurant hat zuerst angenommen"));
        qc.invalidateQueries({ queryKey: ["/api/broadcast-orders/pending"] });
      }
    } catch (e: any) {
      setBcToast(lbl("Failed: ", "فشل: ", "Fehlgeschlagen: ") + (e?.message || ""));
    } finally {
      setBcBusyId(null);
      setTimeout(() => setBcToast(null), 4000);
    }
  };

  const rejectBroadcast = async (bc: any) => {
    if (!tenantId) return;
    try {
      await apiRequest("POST", `/api/broadcast-orders/${bc.id}/reject`, { tenantId });
      qc.invalidateQueries({ queryKey: ["/api/broadcast-orders/pending"] });
    } catch { }
  };

  // WebSocket for instant notifications
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const wsUrl = `${getApiUrl().replace("http", "ws")}/api/ws/caller-id`;
    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl);
      ws.onopen = () => {
        if (tenantId) {
          try { ws.send(JSON.stringify({ type: "register", tenantId })); } catch {}
        }
      };
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "new_online_order") {
            playNotificationSound();
            qc.invalidateQueries({ queryKey: ["/api/online-orders"] });
            setNewOrderIds(prev => { const next = new Set(prev); next.add(data.order?.id); return next; });
          } else if (data.type === "online_order_updated") {
            qc.invalidateQueries({ queryKey: ["/api/online-orders"] });
          } else if (data.type === "broadcast_new" || data.type === "broadcast_claimed" || data.type === "broadcast_cancelled") {
            if (data.type === "broadcast_new") playNotificationSound();
            qc.invalidateQueries({ queryKey: ["/api/broadcast-orders/pending"] });
            if (data.type === "broadcast_claimed" && data.claimedByTenantId === tenantId) {
              qc.invalidateQueries({ queryKey: ["/api/online-orders"] });
            }
          }
        } catch { }
      };
    } catch { }
    return () => ws?.close();
  }, [tenantId]);

  // Polling for native
  useEffect(() => {
    if (Platform.OS === "web") return;
    const interval = setInterval(() => {
      qc.invalidateQueries({ queryKey: ["/api/online-orders"] });
      qc.invalidateQueries({ queryKey: ["/api/sales"] });
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchOnline(), refetchPos()]);
    setRefreshing(false);
  }, [refetchOnline, refetchPos]);

  const updateOnlineStatus = async (id: number, status: string) => {
    try {
      await apiRequest("PUT", `/api/online-orders/${id}`, { status });
      qc.invalidateQueries({ queryKey: ["/api/online-orders"] });
      setNewOrderIds(prev => { const next = new Set(prev); next.delete(id); return next; });
    } catch {
      Alert.alert("Error", "Failed to update order status");
    }
  };

  const deleteOnlineOrder = async (id: number) => {
    const confirmed = Platform.OS === "web"
      ? window.confirm(lbl("Permanently delete this order?", "سيتم حذف هذا الطلب نهائياً", "Bestellung dauerhaft löschen?"))
      : await new Promise<boolean>((resolve) => {
        Alert.alert(
          lbl("Delete Order?", "حذف الطلب", "Bestellung löschen?"),
          lbl("This will permanently delete the order.", "سيتم حذف هذا الطلب نهائياً", "Diese Bestellung wird dauerhaft gelöscht."),
          [
            { text: lbl("Cancel", "إلغاء", "Abbrechen"), style: "cancel", onPress: () => resolve(false) },
            { text: lbl("Delete", "حذف", "Löschen"), style: "destructive", onPress: () => resolve(true) },
          ]
        );
      });
    if (!confirmed) return;
    try {
      await apiRequest("DELETE", `/api/online-orders/${id}`);
      qc.invalidateQueries({ queryKey: ["/api/online-orders"] });
    } catch {
      Alert.alert("Error", "Failed to delete order");
    }
  };

  const deletePosOrder = async (id: number) => {
    const confirmed = Platform.OS === "web"
      ? window.confirm(lbl("Permanently delete this invoice?", "سيتم حذف هذه الفاتورة نهائياً", "Rechnung dauerhaft löschen?"))
      : await new Promise<boolean>((resolve) => {
        Alert.alert(
          lbl("Delete Invoice?", "حذف الفاتورة", "Rechnung löschen?"),
          lbl("This will permanently delete the invoice.", "سيتم حذف هذه الفاتورة نهائياً", "Diese Rechnung wird dauerhaft gelöscht."),
          [
            { text: lbl("Cancel", "إلغاء", "Abbrechen"), style: "cancel", onPress: () => resolve(false) },
            { text: lbl("Delete", "حذف", "Löschen"), style: "destructive", onPress: () => resolve(true) },
          ]
        );
      });
    if (!confirmed) return;
    try {
      await apiRequest("DELETE", `/api/sales/${id}`);
      qc.invalidateQueries({ queryKey: ["/api/sales"] });
    } catch {
      Alert.alert("Error", "Failed to delete invoice");
    }
  };

  const openEditOrder = async (order: any) => {
    if (order._type === "pos") {
      // Fetch full sale + customer info
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
        const subtotal = items.reduce((s: number, i: any) => s + i.total, 0);

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

        setEditForm({
          customerName: custName,
          customerPhone: custPhone,
          customerAddress: custAddress,
          notes: full.notes || "",
          estimatedTime: "",
          items,
          subtotal,
          deliveryFee: Number(full.deliveryFee || 0),
          totalAmount: Number(full.totalAmount || subtotal),
        });
      } catch {
        setEditForm({
          customerName: "", customerPhone: "", customerAddress: "",
          notes: order.notes || "", estimatedTime: "",
          items: [], subtotal: 0, deliveryFee: 0, totalAmount: Number(order.totalAmount || 0),
        });
      }
    } else {
      setEditForm({
        customerName: order.customerName || "",
        customerPhone: order.customerPhone || "",
        customerAddress: order.customerAddress || "",
        notes: order.notes || "",
        estimatedTime: order.estimatedTime ? String(order.estimatedTime) : "",
        items: cloneOrderItems(order.items),
        subtotal: Number(order.subtotal || 0),
        deliveryFee: Number(order.deliveryFee || 0),
        totalAmount: Number(order.totalAmount || 0),
      });
    }
    setEditingOrder(order);
  };

  const saveEditOrder = async () => {
    if (!editingOrder) return;
    try {
      if (editingOrder._type === "pos") {
        await apiRequest("PUT", `/api/sales/${editingOrder.id}`, {
          notes: editForm.notes || null,
          subtotal: String(editForm.subtotal.toFixed(2)),
          totalAmount: String(editForm.totalAmount.toFixed(2)),
          items: editForm.items.map(it => ({
            productId: it.productId,
            productName: it.name,
            quantity: it.quantity,
            unitPrice: String(it.unitPrice),
            total: String(it.total),
            modifiers: it.modifiers || [],
            notes: it.notes || null,
          })),
        });
        qc.invalidateQueries({ queryKey: ["/api/sales"] });
      } else {
        await apiRequest("PUT", `/api/online-orders/${editingOrder.id}`, {
          customerName: editForm.customerName,
          customerPhone: editForm.customerPhone,
          customerAddress: editForm.customerAddress || null,
          notes: editForm.notes || null,
          estimatedTime: editForm.estimatedTime ? Number(editForm.estimatedTime) : null,
          items: editForm.items,
          subtotal: String(editForm.subtotal.toFixed(2)),
          totalAmount: String(editForm.totalAmount.toFixed(2)),
        });
        qc.invalidateQueries({ queryKey: ["/api/online-orders"] });
      }
      setEditingOrder(null);
    } catch {
      Alert.alert("Error", "Failed to update order");
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
      return { ...prev, items: nextItems, subtotal: newSubtotal, totalAmount: newSubtotal + prev.deliveryFee };
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
    ) || { icon: "✨", category: "Others" };
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
      return { ...prev, items: nextItems, subtotal: newSubtotal, totalAmount: newSubtotal + prev.deliveryFee };
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
        return { ...prev, items: nextItems, subtotal: newSubtotal, totalAmount: newSubtotal + prev.deliveryFee };
      });
    } else {
      setEditForm(prev => {
        const nextItems = [...prev.items, { productId: configuringProduct.id, name: finalName, quantity: 1, unitPrice: finalUnitPrice, total: finalUnitPrice }];
        const newSubtotal = nextItems.reduce((sum, i) => sum + (i.total || 0), 0);
        return { ...prev, items: nextItems, subtotal: newSubtotal, totalAmount: newSubtotal + prev.deliveryFee };
      });
    }
    setConfiguringProduct(null);
    setConfiguringItemIndex(null);
  };

  // --- Render Order Card ---
  const renderOrder = ({ item }: { item: any }) => {
    const meta = STATUS_META[item.status] || STATUS_META.completed;
    const isNew = newOrderIds.has(item.id) && item._type === "online";
    const orderDate = new Date(item.createdAt);
    const next = meta.next;
    const isPOS = item._type === "pos";
    const orderItems = normalizeOrderItems(item.items);

    const nextBtnColor: Record<string, string[]> = {
      accepted: ["#3B82F6", "#1D4ED8"],
      preparing: ["#8B5CF6", "#6D28D9"],
      ready: ["#2FD3C6", "#0D9488"],
      delivered: ["#10B981", "#059669"],
    };

    const sourceColor = isPOS ? "#F59E0B" : "#6366F1";
    const sourceBg = isPOS ? "rgba(245,158,11,0.12)" : "rgba(99,102,241,0.12)";
    const sourceLabel = isPOS ? (language === "ar" ? "📞 كاشير" : "📞 POS") : (language === "ar" ? "🌐 إلكتروني" : "🌐 Online");
    const orderId = isPOS ? (getDisplayNumber(item.receiptNumber) || `#${item.id}`) : `#${getDisplayNumber(item.orderNumber)}`;

    return (
      <Animated.View style={[
        styles.orderCard,
        isNew && styles.orderCardNew,
        isPOS && styles.orderCardPos,
        { borderLeftColor: isPOS ? sourceColor : meta.color, transform: isNew ? [{ scale: pulseAnim }] : [] },
      ]}>
        {/* Source badge + Header */}
        <View style={[styles.orderHeader, isRTL && { flexDirection: "row-reverse" }]}>
          <View style={[styles.orderNumRow, isRTL && { flexDirection: "row-reverse" }]}>
            {isNew && <View style={styles.newDot} />}
            <View style={[styles.sourceBadge, { backgroundColor: sourceBg, borderColor: sourceColor + "60" }]}>
              <Text style={[styles.sourceBadgeText, { color: sourceColor }]}>{sourceLabel}</Text>
            </View>
            <Text style={styles.orderNum}>{orderId}</Text>
            <View style={[styles.statusBadge, { backgroundColor: meta.color + "22", borderColor: meta.color }]}>
              <Ionicons name={meta.icon as any} size={11} color={meta.color} />
              <Text style={[styles.statusText, { color: meta.color }]}>
                {language === "ar" ? meta.labelAr : language === "de" ? meta.labelDe : meta.label}
              </Text>
            </View>
          </View>
          <Text style={styles.orderAmount}>CHF {Number(item.totalAmount).toFixed(2)}</Text>
        </View>

        {/* Customer info */}
        {(item.customerName || item.customerPhone) ? (
          <View style={[styles.customerRow, isRTL && { flexDirection: "row-reverse" }]}>
            <View style={styles.customerIcon}>
              <Ionicons name="person" size={14} color={Colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              {item.customerName ? <Text style={[styles.customerName, isRTL && { textAlign: "right" }]}>{item.customerName}</Text> : null}
              <Text style={[styles.customerSub, isRTL && { textAlign: "right" }]}>
                {item.customerPhone || ""}
                {item.customerAddress ? ` • ${item.customerAddress}` : ""}
              </Text>
            </View>
            <View style={styles.metaChips}>
              {item.paymentMethod ? (
                <View style={styles.metaChip}>
                  <Text style={styles.metaChipText}>{PAY_ICON[item.paymentMethod] || "💵"} {item.paymentMethod?.toUpperCase()}</Text>
                </View>
              ) : null}
              {item.orderType ? (
                <View style={[styles.metaChip, {
                  backgroundColor: item.orderType === "delivery" ? "rgba(99,102,241,0.15)"
                    : item.orderType === "dine_in" ? "rgba(245,158,11,0.15)"
                    : "rgba(16,185,129,0.15)"
                }]}>
                  <Text style={styles.metaChipText}>
                    {item.orderType === "delivery" ? "🛵" : item.orderType === "dine_in" ? "🍽" : "🏃"} {item.orderType === "dine_in" ? "Dine-in" : item.orderType}
                  </Text>
                </View>
              ) : null}
              {item.tableNumber ? (
                <View style={[styles.metaChip, { backgroundColor: "rgba(30,64,175,0.15)" }]}>
                  <Text style={styles.metaChipText}>🪑 {item.tableNumber}</Text>
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
                <View style={[styles.itemRow, isRTL && { flexDirection: "row-reverse" }]}>
                  <Text style={styles.itemQty}>{it.quantity}×</Text>
                  <Text style={[styles.itemName, { flex: 1 }, isRTL && { textAlign: "right" }]}>{it.name || it.productName}</Text>
                  <Text style={styles.itemPrice}>CHF {(Number(it.total) || (Number(it.unitPrice) * Number(it.quantity)) || 0).toFixed(2)}</Text>
                </View>
                {it.notes ? <Text style={[styles.itemAddons, isRTL && { textAlign: "right" }]}>↳ {it.notes}</Text> : null}
              </View>
            ))}
            {orderItems.length > 4 && <Text style={styles.itemAddons}>+{orderItems.length - 4} {lbl("more items", "عناصر أخرى", "weitere Artikel")}</Text>}
            {item.notes ? <Text style={[styles.orderNotes, isRTL && { textAlign: "right" }]}>📝 {item.notes}</Text> : null}
          </View>
        ) : item.notes ? (
          <View style={styles.itemsList}>
            <Text style={[styles.orderNotes, isRTL && { textAlign: "right" }]}>📝 {item.notes}</Text>
          </View>
        ) : null}

        {/* Scheduled badge */}
        {item.scheduledAt ? (
          <View style={{ marginBottom: 6 }}>
            <ScheduledOrderBadge scheduledAt={item.scheduledAt} isRtl={isRTL} />
          </View>
        ) : null}

        {/* Tracking link + driver info */}
        {!isPOS && item.orderType === "delivery" && item.trackingToken ? (
          <View style={{ marginBottom: 6 }}>
            <TrackingLinkButton trackingToken={item.trackingToken} label={lbl("Share Tracking", "رابط التتبع", "Tracking teilen")} />
          </View>
        ) : null}

        {/* Time + fee */}
        <View style={[styles.totalsRow, isRTL && { flexDirection: "row-reverse" }]}>
          <Text style={styles.timeText}>
            📅 {orderDate.toLocaleDateString()} ⏰ {orderDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </Text>
          {item.deliveryFee && Number(item.deliveryFee) > 0 ? (
            <Text style={styles.feeText}>+CHF {Number(item.deliveryFee).toFixed(2)} {lbl("delivery", "توصيل", "Lieferung")}</Text>
          ) : null}
        </View>

        {/* Actions */}
        <View style={[styles.actions, isRTL && { flexDirection: "row-reverse" }]}>
          {/* Next status button - only for online orders */}
          {!isPOS && item.status !== "delivered" && item.status !== "cancelled" && next && nextBtnColor[next] && (
            <Pressable style={{ flex: 1, borderRadius: 10, overflow: "hidden" }} onPress={() => { playClickSound("medium"); updateOnlineStatus(item.id, next); }}>
              <LinearGradient colors={nextBtnColor[next] as [string, string]} style={styles.actionBtnPrimary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Ionicons name={STATUS_META[next]?.icon as any || "arrow-forward"} size={16} color="#fff" />
                <Text style={styles.actionBtnText}>
                  {language === "ar" ? STATUS_META[next]?.labelAr : language === "de" ? STATUS_META[next]?.labelDe : STATUS_META[next]?.label}
                </Text>
              </LinearGradient>
            </Pressable>
          )}
          {/* Assign Driver - delivery orders only */}
          {!isPOS && item.orderType === "delivery" && item.status !== "delivered" && item.status !== "cancelled" && (
            <Pressable
              style={[styles.editBtn, { backgroundColor: Colors.deliveryPrimaryLight }]}
              onPress={() => { playClickSound("light"); setDriverAssignOrderId(item.id); }}
            >
              <Ionicons name="bicycle" size={16} color={Colors.deliveryPrimary} />
            </Pressable>
          )}
          {/* Edit */}
          <Pressable style={styles.editBtn} onPress={() => { playClickSound("light"); openEditOrder(item); }}>
            <Ionicons name="pencil" size={16} color={Colors.accent} />
          </Pressable>
          {/* Cancel (online only, active) */}
          {!isPOS && item.status !== "delivered" && item.status !== "cancelled" && (
            <Pressable style={styles.cancelBtn} onPress={() =>
              Alert.alert(
                lbl("Cancel Order?", "إلغاء الطلب", "Stornieren?"),
                lbl("Are you sure?", "هل أنت متأكد؟", "Sind Sie sicher?"),
                [
                  { text: lbl("No", "لا", "Nein"), style: "cancel" },
                  { text: lbl("Cancel", "إلغاء", "Stornieren"), style: "destructive", onPress: () => updateOnlineStatus(item.id, "cancelled") },
                ]
              )
            }>
              <Ionicons name="close" size={18} color={Colors.danger} />
            </Pressable>
          )}
          {/* Delete */}
          {!isPOS && (
            <Pressable style={styles.deleteBtn} onPress={() => { playClickSound("light"); deleteOnlineOrder(item.id); }}>
              <Ionicons name="trash-outline" size={16} color={Colors.danger} />
            </Pressable>
          )}
          {isPOS && (
            <Pressable style={styles.deleteBtn} onPress={() => { playClickSound("light"); deletePosOrder(item.id); }}>
              <Ionicons name="trash-outline" size={16} color={Colors.danger} />
            </Pressable>
          )}
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
      editForm.customerName || "Laufkunde", "",
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
          onAssigned={(driverId) => {
            qc.invalidateQueries({ queryKey: ["/api/online-orders"] });
          }}
          onClose={() => setDriverAssignOrderId(null)}
        />
      )}

      {/* ===== EDIT ORDER MODAL ===== */}
      <Modal visible={!!editingOrder} animationType="slide" transparent onRequestClose={() => setEditingOrder(null)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={styles.modalSheet}>
            <View style={[styles.modalHeader, isRTL && { flexDirection: "row-reverse" }]}>
              <Text style={styles.modalTitle}>
                {lbl("Edit Order", "تعديل الطلب", "Bestellung bearbeiten")}{" "}
                {editingOrder?._type === "pos" ? (getDisplayNumber(editingOrder?.receiptNumber) || `#${editingOrder?.id}`) : `#${getDisplayNumber(editingOrder?.orderNumber)}`}
              </Text>
              <Pressable onPress={() => setEditingOrder(null)}>
                <Ionicons name="close" size={22} color={Colors.textMuted} />
              </Pressable>
            </View>
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
              {/* Customer info - shown for all order types */}
              {[
                { label: lbl("Customer Name", "اسم العميل", "Kundenname"), key: "customerName", placeholder: "Name" },
                { label: lbl("Phone", "الهاتف", "Telefon"), key: "customerPhone", placeholder: "+1 234 567" },
                { label: lbl("Address", "العنوان", "Adresse"), key: "customerAddress", placeholder: "Street, City" },
              ].map((f: any) => (
                <View key={f.key} style={styles.editField}>
                  <Text style={[styles.editLabel, isRTL && { textAlign: "right" }]}>{f.label}</Text>
                  <TextInput
                    style={[styles.editInput, isRTL && { textAlign: "right" }]}
                    value={(editForm as any)[f.key]}
                    onChangeText={v => setEditForm(prev => ({ ...prev, [f.key]: v }))}
                    placeholder={f.placeholder}
                    placeholderTextColor={Colors.textMuted}
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
                    onChangeText={v => setEditForm(prev => ({ ...prev, estimatedTime: v }))}
                    placeholder="30"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="number-pad"
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
                  placeholder="..."
                  placeholderTextColor={Colors.textMuted}
                  multiline
                />
              </View>

              {/* Items section */}
              <View style={[styles.editDivider, { marginTop: 10, marginBottom: 15 }]} />
              <View style={[styles.modalHeader, isRTL && { flexDirection: "row-reverse" }, { marginBottom: 10, borderBottomWidth: 0 }]}>
                <Text style={[styles.editLabel, { marginBottom: 0 }]}>{lbl("Order Items", "محتويات الطلب", "Bestellartikel")}</Text>
                <View style={{ flexDirection: "row", gap: 8 }}>
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
                  <View key={idx} style={[styles.editItemRow, isRTL && { flexDirection: "row-reverse" }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.editItemName, isRTL && { textAlign: "right" }]}>{it.name}</Text>
                      <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 10 }}>
                        <Text style={styles.editItemPrice}>CHF {Number(it.unitPrice).toFixed(2)}</Text>
                        <Pressable onPress={() => editItemAddons(idx)} style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: Colors.accent + "15", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 }}>
                          <Ionicons name="options-outline" size={12} color={Colors.accent} />
                          <Text style={{ fontSize: 10, color: Colors.accent, fontWeight: "700" }}>{lbl("Edit Addons", "تعديل الإضافات", "Extras bearbeiten")}</Text>
                        </Pressable>
                      </View>
                    </View>
                    <View style={[styles.qtyControl, isRTL && { flexDirection: "row-reverse" }]}>
                      <Pressable onPress={() => { playClickSound("light"); updateItemQty(idx, -1); }} style={styles.qtyBtn}>
                        <Ionicons name="remove" size={16} color={Colors.text} />
                      </Pressable>
                      <Text style={styles.qtyVal}>{it.quantity}</Text>
                      <Pressable onPress={() => { playClickSound("light"); updateItemQty(idx, 1); }} style={styles.qtyBtn}>
                        <Ionicons name="add" size={16} color={Colors.text} />
                      </Pressable>
                    </View>
                    <Text style={styles.editItemTotal}>{(it.total || 0).toFixed(2)}</Text>
                    <Pressable onPress={() => updateItemQty(idx, -it.quantity)} style={styles.itemDelBtn}>
                      <Ionicons name="trash-outline" size={16} color={Colors.danger} />
                    </Pressable>
                  </View>
                ))
              )}

              <View style={[styles.editDivider, { marginVertical: 15 }]} />
              <View style={[styles.modalTotalRow, isRTL && { flexDirection: "row-reverse" }]}>
                <Text style={styles.modalTotalLabel}>{lbl("Subtotal", "المجموع الفرعي", "Zwischensumme")}</Text>
                <Text style={styles.modalTotalVal}>CHF {editForm.subtotal.toFixed(2)}</Text>
              </View>
              {editForm.deliveryFee > 0 && (
                <View style={[styles.modalTotalRow, isRTL && { flexDirection: "row-reverse" }]}>
                  <Text style={styles.modalTotalLabel}>{lbl("Delivery Fee", "رسوم التوصيل", "Liefergebühr")}</Text>
                  <Text style={styles.modalTotalVal}>CHF {editForm.deliveryFee.toFixed(2)}</Text>
                </View>
              )}
              <View style={[styles.modalTotalRow, isRTL && { flexDirection: "row-reverse" }, { marginTop: 4 }]}>
                <Text style={[styles.modalTotalLabel, { color: Colors.text, fontWeight: "700" }]}>{lbl("Total", "الإجمالي", "Gesamt")}</Text>
                <Text style={[styles.modalTotalVal, { color: Colors.accent, fontSize: 18, fontWeight: "800" }]}>CHF {editForm.totalAmount.toFixed(2)}</Text>
              </View>
              <View style={{ height: 40 }} />
            </ScrollView>
            <View style={[styles.modalFooter, isRTL && { flexDirection: "row-reverse" }]}>
              <Pressable style={styles.modalCancelBtn} onPress={() => { playClickSound("light"); setEditingOrder(null); }}>
                <Text style={styles.modalCancelText}>{lbl("Cancel", "إلغاء", "Abbrechen")}</Text>
              </Pressable>
              <Pressable style={[styles.modalCancelBtn, { backgroundColor: Colors.cardBorder + "40", borderColor: "transparent" }]} onPress={() => { playClickSound("light"); printEditedOrder(); }}>
                <Ionicons name="print-outline" size={18} color={Colors.text} style={{ marginBottom: 2 }} />
                <Text style={[styles.modalCancelText, { color: Colors.text, fontSize: 12 }]}>{lbl("Print", "طباعة", "Drucken")}</Text>
              </Pressable>
              <Pressable style={styles.modalSaveBtn} onPress={() => { playClickSound("heavy"); saveEditOrder(); }}>
                <Text style={styles.modalSaveText}>{lbl("Save Changes", "حفظ", "Speichern")}</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ===== PRODUCT CONFIGURATOR MODAL ===== */}
      <Modal visible={!!configuringProduct} animationType="fade" transparent>
        <View style={styles.pickerOverlay}>
          <View style={[styles.modalContent, { maxWidth: 700, padding: 24, maxHeight: "92%" }]}>
            <View style={[styles.modalHeader, isRTL && { flexDirection: "row-reverse" }]}>
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
                              return { ...prev, items: nextItems, subtotal: newSubtotal, totalAmount: newSubtotal + prev.deliveryFee };
                            });
                          } else {
                            setEditForm(prev => {
                              const nextItems = [...prev.items, { productId: configuringProduct.id, name: variantName, quantity: 1, unitPrice: Number(v.price), total: Number(v.price) }];
                              const newSubtotal = nextItems.reduce((sum, i) => sum + (i.total || 0), 0);
                              return { ...prev, items: nextItems, subtotal: newSubtotal, totalAmount: newSubtotal + prev.deliveryFee };
                            });
                          }
                          setConfiguringProduct(null);
                        }
                      }}
                    >
                      <Text style={[styles.statusTabText, selectedVariant?.name === v.name && styles.statusTabTextActive]}>{v.name}</Text>
                      <Text style={[styles.statusTabText, { opacity: 0.8, fontSize: 13 }, selectedVariant?.name === v.name && styles.statusTabTextActive]}>CHF {Number(v.price).toFixed(2)}</Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            ) : (
              <ScrollView style={{ marginTop: 10 }} showsVerticalScrollIndicator={false}>
                <View style={{ backgroundColor: Colors.accent + "15", padding: 12, borderRadius: 10, marginBottom: 10, flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Ionicons name="pizza" size={20} color={Colors.accent} />
                  <Text style={{ color: Colors.accent, fontWeight: "700", fontSize: 15 }}>
                    {selectedVariant?.name || configuringProduct?.name} — CHF {Number(selectedVariant?.price || configuringProduct?.price).toFixed(2)}
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
                            {isSelected && <Text style={{ fontSize: 10, fontWeight: "900", color: "#000", position: "absolute", top: 2, right: 3 }}>✓</Text>}
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
                        <Text style={{ color: "#EF4444", fontSize: 11, fontWeight: "600" }}>{lbl("Clear all", "مسح الكل", "Alle löschen")}</Text>
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
            <View style={[styles.modalHeader, isRTL && { flexDirection: "row-reverse" }]}>
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
                          {isSelected && <Text style={{ fontSize: 10, fontWeight: "900", color: "#000", position: "absolute", top: 2, right: 3 }}>✓</Text>}
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
                        {isSelected && <Text style={{ fontSize: 10, fontWeight: "900", color: "#000", position: "absolute", top: 2, right: 4 }}>✓</Text>}
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
            <View style={[styles.modalHeader, isRTL && { flexDirection: "row-reverse" }]}>
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
                              <Text style={{ fontSize: 20 }}>🍕</Text>
                            </View>
                          )}
                          <View style={styles.productCardBody}>
                            <Text style={styles.productCardName} numberOfLines={2}>{p.name}</Text>
                            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
                              <Text style={[styles.productCardPrice, { color: catColor }]}>CHF {Number(p.price).toFixed(2)}</Text>
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
          ? lbl(`${pendingCount} online order${pendingCount > 1 ? "s" : ""} pending`, `${pendingCount} طلب إلكتروني جديد`, `${pendingCount} neue Online - Bestellung(en)`)
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
        <View style={[styles.filterRow, isRTL && { flexDirection: "row-reverse" }]}>
          {[
            { key: "all", en: "All Orders", ar: "الكل", de: "Alle" },
            { key: "online", en: "🌐 Online", ar: "🌐 إلكتروني", de: "🌐 Online" },
            { key: "dine_in", en: "🍽 Tables", ar: "🍽 طاولات", de: "🍽 Tisch" },
            { key: "pos", en: "📞 POS", ar: "📞 كاشير", de: "📞 Kasse" },
          ].map(f => (
            <Pressable key={f.key} onPress={() => { playClickSound("light"); setViewMode(f.key as any); }} style={[styles.filterTab, viewMode === f.key && styles.filterTabActive]}>
              <Text style={[styles.filterTabText, viewMode === f.key && styles.filterTabTextActive]}>
                {language === "ar" ? f.ar : language === "de" ? f.de : f.en}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={[styles.filterRow, isRTL && { flexDirection: "row-reverse" }]}>
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
          <View style={[styles.filterRow, isRTL && { flexDirection: "row-reverse" }]}>
            {[
              { key: "all_types", en: "All Types", ar: "الكل", de: "Alle" },
              { key: "delivery", en: "🛵 Delivery", ar: "🛵 توصيل", de: "🛵 Lieferung" },
              { key: "pickup", en: "🏃 Pickup", ar: "🏃 استلام", de: "🏃 Abholung" },
              { key: "dine_in", en: "🍽 Dine-in", ar: "🍽 طاولات", de: "🍽 Vor Ort" },
              { key: "scheduled", en: "📅 Scheduled", ar: "📅 مجدول", de: "📅 Geplant" },
            ].map(f => (
              <Pressable
                key={f.key}
                onPress={() => { playClickSound("light"); setOrderTypeFilter?.(f.key); }}
                style={[
                  styles.filterTab,
                  { paddingHorizontal: 8 },
                  (orderTypeFilter || "all_types") === f.key && { backgroundColor: Colors.deliveryPrimaryLight, borderColor: Colors.deliveryPrimary },
                ]}
              >
                <Text style={[styles.filterTabText, (orderTypeFilter || "all_types") === f.key && { color: Colors.deliveryPrimary }]}>
                  {language === "ar" ? f.ar : language === "de" ? f.de : f.en}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </TabPageHeader>

      {/* ===== ORDER LIST ===== */}
      <FlatList
        data={filteredOrders}
        keyExtractor={(item: any) => `${item._type} -${item.id} `}
        renderItem={renderOrder}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            {bcToast ? (
              <View style={styles.bcToast}><Text style={styles.bcToastText}>{bcToast}</Text></View>
            ) : null}
            {(broadcastOrders as any[]).length > 0 ? (
              <View style={styles.bcSection}>
                <View style={styles.bcSectionHdr}>
                  <Text style={styles.bcSectionTitle}>
                    📣 {lbl("Incoming Broadcast Orders", "طلبات مفتوحة", "Eingehende Broadcast-Bestellungen")}
                    {"  "}
                    <Text style={styles.bcSectionCount}>({(broadcastOrders as any[]).length})</Text>
                  </Text>
                  <Text style={styles.bcSectionSub}>
                    {lbl("First to accept wins. Tap Accept to take the order.", "أول من يقبل يفوز. اضغط قبول لاستلام الطلب.", "Wer zuerst annimmt, gewinnt. Tippe auf Annehmen.")}
                  </Text>
                </View>
                {(broadcastOrders as any[]).map((bc: any) => {
                  const expiresMs = new Date(bc.expiresAt).getTime() - Date.now();
                  const secsLeft = Math.max(0, Math.floor(expiresMs / 1000));
                  const bcItems = Array.isArray(bc.items) ? bc.items : (typeof bc.items === "string" ? (() => { try { return JSON.parse(bc.items); } catch { return []; } })() : []);
                  return (
                    <View key={`bc-${bc.id}`} style={styles.bcCard}>
                      <View style={styles.bcRow}>
                        <Text style={styles.bcName}>👤 {bc.customerName}</Text>
                        <Text style={styles.bcTimer}>⏱ {Math.floor(secsLeft / 60)}:{String(secsLeft % 60).padStart(2, "0")}</Text>
                      </View>
                      <Text style={styles.bcMeta}>📞 {bc.customerPhone}</Text>
                      {bc.customerAddress ? <Text style={styles.bcMeta}>📍 {bc.customerAddress}</Text> : null}
                      <View style={styles.bcItemsBox}>
                        {bcItems.map((it: any, idx: number) => (
                          <Text key={idx} style={styles.bcItem}>• {it.quantity}× {it.name}{it.notes ? ` — ${it.notes}` : ""}</Text>
                        ))}
                      </View>
                      {bc.notes ? <Text style={styles.bcNotes}>📝 {bc.notes}</Text> : null}
                      <View style={styles.bcTotalRow}>
                        <Text style={styles.bcTotalLbl}>{lbl("Est. Total", "الإجمالي المقدر", "Geschätzt")}</Text>
                        <Text style={styles.bcTotalVal}>CHF {Number(bc.estimatedTotal || 0).toFixed(2)}</Text>
                      </View>
                      <View style={styles.bcActions}>
                        <Pressable style={[styles.bcBtn, styles.bcBtnReject]} onPress={() => rejectBroadcast(bc)} disabled={bcBusyId === bc.id}>
                          <Text style={styles.bcBtnRejectText}>{lbl("Reject", "رفض", "Ablehnen")}</Text>
                        </Pressable>
                        <Pressable style={[styles.bcBtn, styles.bcBtnAccept, bcBusyId === bc.id && { opacity: 0.6 }]} onPress={() => acceptBroadcast(bc)} disabled={bcBusyId === bc.id}>
                          <Text style={styles.bcBtnAcceptText}>{bcBusyId === bc.id ? lbl("Accepting…", "جاري القبول…", "Wird angenommen…") : "✓ " + lbl("Accept", "قبول", "Annehmen")}</Text>
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
            <Text style={styles.emptyIcon}>{viewMode === "online" ? "🌐" : viewMode === "pos" ? "📞" : "📋"}</Text>
            <Text style={styles.emptyTitle}>{lbl("No orders yet", "لا توجد طلبات", "Keine Bestellungen")}</Text>
            <Text style={styles.emptyText}>
              {lbl("Orders will appear here in real time", "ستظهر الطلبات هنا فور وصولها", "Bestellungen erscheinen hier in Echtzeit")}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
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
  filterRow: { flexDirection: "row", gap: 8, paddingBottom: 10 },
  filterTab: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
  },
  filterTabActive: { backgroundColor: Colors.accent + "22", borderColor: Colors.accent },
  filterTabText: { color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: "600" },
  filterTabTextActive: { color: Colors.accent },
  listContent: { padding: 12, paddingBottom: 100, gap: 12 },

  orderCard: {
    backgroundColor: Colors.surface, borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: Colors.cardBorder, borderLeftWidth: 4,
  },
  orderCardNew: {
    borderColor: "#F59E0B",
    elevation: 6,
    ...(Platform.OS === "web" ? { boxShadow: "0px 0px 8px rgba(245,158,11,0.25)" } as any : { shadowColor: "#F59E0B", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.25, shadowRadius: 8 }),
  },
  orderCardPos: {
    borderStyle: "dashed" as any,
  },
  newDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#F59E0B", marginRight: 6 },
  sourceBadge: {
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, borderWidth: 1,
  },
  sourceBadgeText: { fontSize: 10, fontWeight: "800" },
  orderHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  orderNumRow: { flexDirection: "row", alignItems: "center", gap: 6 },
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
  metaChips: { flexDirection: "column", gap: 4, alignItems: "flex-end" },
  metaChip: { backgroundColor: "rgba(255,255,255,0.06)", paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
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

  actions: { flexDirection: "row", gap: 8 },
  actionBtnPrimary: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 11, paddingHorizontal: 16, borderRadius: 10,
  },
  actionBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  editBtn: {
    width: 42, height: 42, borderRadius: 10,
    backgroundColor: "rgba(47,211,198,0.1)", borderWidth: 1, borderColor: "rgba(47,211,198,0.3)",
    justifyContent: "center", alignItems: "center",
  },
  cancelBtn: {
    width: 42, height: 42, borderRadius: 10,
    backgroundColor: "rgba(239,68,68,0.1)", borderWidth: 1, borderColor: "rgba(239,68,68,0.3)",
    justifyContent: "center", alignItems: "center",
  },
  deleteBtn: {
    width: 42, height: 42, borderRadius: 10,
    backgroundColor: "rgba(239,68,68,0.1)", borderWidth: 1, borderColor: "rgba(239,68,68,0.3)",
    justifyContent: "center", alignItems: "center",
  },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalSheet: {
    backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, maxHeight: "88%",
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
  modalCancelBtn: { flex: 1, paddingVertical: 13, borderRadius: 10, borderWidth: 1, borderColor: Colors.cardBorder, alignItems: "center" },
  modalCancelText: { color: Colors.textMuted, fontWeight: "600", fontSize: 14 },
  modalSaveBtn: { flex: 2, paddingVertical: 13, borderRadius: 10, backgroundColor: Colors.accent, alignItems: "center" },
  modalSaveText: { color: "#000", fontWeight: "800", fontSize: 14 },

  editDivider: { height: 1, backgroundColor: Colors.cardBorder },
  addSmallBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, backgroundColor: Colors.accent + "15" },
  addSmallText: { color: Colors.accent, fontSize: 12, fontWeight: "700" },
  emptyItems: { padding: 20, alignItems: "center" },
  emptyItemsText: { color: Colors.textMuted, fontSize: 12 },
  editItemRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.cardBorder + "44" },
  editItemName: { color: Colors.text, fontSize: 13, fontWeight: "600" },
  editItemPrice: { color: Colors.textMuted, fontSize: 11 },
  qtyControl: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.background, borderRadius: 8, borderWidth: 1, borderColor: Colors.cardBorder },
  qtyBtn: { width: 30, height: 30, justifyContent: "center", alignItems: "center" },
  qtyVal: { color: Colors.text, fontSize: 13, fontWeight: "700", minWidth: 24, textAlign: "center" },
  editItemTotal: { color: Colors.text, fontSize: 13, fontWeight: "700", minWidth: 50, textAlign: "right" },
  itemDelBtn: { padding: 4 },
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
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { color: Colors.text, fontSize: 18, fontWeight: "800", marginBottom: 8 },
  emptyText: { color: Colors.textMuted, fontSize: 13, textAlign: "center", lineHeight: 20 },
});
