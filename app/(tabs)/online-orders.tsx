import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  StyleSheet, Text, View, FlatList, Pressable, ScrollView,
  Alert, Platform, Animated, RefreshControl, Modal, TextInput, KeyboardAvoidingView,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Colors } from "@/constants/colors";
import { useLicense } from "@/lib/license-context";
import { apiRequest, getQueryFn, getApiUrl } from "@/lib/query-client";
import { useLanguage } from "@/lib/language-context";
import { playClickSound } from "@/lib/sound";

// ── Web receipt printing via hidden iframe (no popup-blocking) ──────────────
function printHtmlViaIframe(html: string) {
  if (typeof document === "undefined") return;
  const frameId = "_receipt_print_frame";
  const existing = document.getElementById(frameId);
  if (existing) existing.remove();
  const iframe = document.createElement("iframe");
  iframe.id = frameId;
  Object.assign(iframe.style, {
    position: "fixed", right: "0", bottom: "0",
    width: "1px", height: "1px",
    border: "none", opacity: "0",
    pointerEvents: "none", zIndex: "-1",
  });
  document.body.appendChild(iframe);
  try {
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    iframe.src = url;
    iframe.onload = () => {
      setTimeout(() => {
        try { iframe.contentWindow?.focus(); iframe.contentWindow?.print(); } catch (_) {}
        URL.revokeObjectURL(url);
        setTimeout(() => iframe?.remove(), 3000);
      }, 400);
    };
  } catch (_) { iframe.remove(); }
}

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

const PIZZA_TOPPINGS = [
  { name: "Tomato Sauce", names: ["Tomato Sauce", "Tomatensauce", "Extra Tomatensauce"], icon: "🍅", category: "Sauces" },
  { name: "Tomatoes", names: ["Tomatoes", "Tomaten"], icon: "🍅", category: "Vegetables" },
  { name: "Sliced Tomatoes", names: ["Sliced Tomatoes", "Tomatenscheiben"], icon: "🍅", category: "Vegetables" },
  { name: "Garlic", names: ["Garlic", "Knoblauch"], icon: "🧄", category: "Vegetables" },
  { name: "Onions", names: ["Onions", "Zwiebeln"], icon: "🧅", category: "Vegetables" },
  { name: "Capers", names: ["Capers", "Kapern"], icon: "🫛", category: "Vegetables" },
  { name: "Olives", names: ["Olives", "Oliven"], icon: "🫒", category: "Vegetables" },
  { name: "Oregano", names: ["Oregano"], icon: "🌿", category: "Others" },
  { name: "Vegetables", names: ["Vegetables", "Gemüse"], icon: "🥦", category: "Vegetables" },
  { name: "Spinach", names: ["Spinach", "Spinat"], icon: "🥬", category: "Vegetables" },
  { name: "Bell Peppers", names: ["Bell Peppers", "Peperoni", "Paprika"], icon: "🫑", category: "Vegetables" },
  { name: "Corn", names: ["Corn", "Mais"], icon: "🌽", category: "Vegetables" },
  { name: "Broccoli", names: ["Broccoli"], icon: "🥦", category: "Vegetables" },
  { name: "Artichokes", names: ["Artichokes", "Artischocken"], icon: "🌿", category: "Vegetables" },
  { name: "Arugula", names: ["Arugula", "Rucola"], icon: "🥬", category: "Vegetables" },
  { name: "Egg", names: ["Egg", "Ei"], icon: "🥚", category: "Others" },
  { name: "Pineapple", names: ["Pineapple", "Ananas"], icon: "🍍", category: "Others" },
  { name: "Mushrooms", names: ["Mushrooms", "Pilze", "Champignons"], icon: "🍄", category: "Vegetables" },
  { name: "Ham", names: ["Ham", "Schinken"], icon: "🥩", category: "Meat" },
  { name: "Spicy Salami", names: ["Spicy Salami", "Scharfe Salami", "Diavola"], icon: "🌶️", category: "Meat" },
  { name: "Salami", names: ["Salami"], icon: "🥩", category: "Meat" },
  { name: "Bacon", names: ["Bacon", "Speck"], icon: "🥓", category: "Meat" },
  { name: "Prosciutto", names: ["Prosciutto", "Rohschinken"], icon: "🥩", category: "Meat" },
  { name: "Lamb", names: ["Lamb", "Lammfleisch"], icon: "🥩", category: "Meat" },
  { name: "Chicken", names: ["Chicken", "Poulet", "Hähnchen"], icon: "🍗", category: "Meat" },
  { name: "Kebab", names: ["Kebab", "Kebabfleisch"], icon: "🥙", category: "Meat" },
  { name: "Minced Meat", names: ["Minced Meat", "Hackfleisch"], icon: "🥩", category: "Meat" },
  { name: "Anchovies", names: ["Anchovies", "Sardellen"], icon: "🐟", category: "Seafood" },
  { name: "Shrimp", names: ["Shrimp", "Crevetten", "Garnelen"], icon: "🍤", category: "Seafood" },
  { name: "Tuna", names: ["Tuna", "Thunfisch"], icon: "🐟", category: "Seafood" },
  { name: "Mayonnaise", names: ["Mayonnaise", "Mayo"], icon: "🫙", category: "Sauces" },
  { name: "Ketchup", names: ["Ketchup"], icon: "🫙", category: "Sauces" },
  { name: "Cocktail Sauce", names: ["Cocktail Sauce", "Cocktailsauce"], icon: "🫙", category: "Sauces" },
  { name: "Spicy Sauce", names: ["Spicy Sauce", "Scharfe Sauce", "SCHARF"], icon: "🌶️", category: "Sauces" },
  { name: "Garlic Sauce", names: ["Garlic Sauce", "Knoblauchsauce"], icon: "🫙", category: "Sauces" },
  { name: "Yogurt Sauce", names: ["Yogurt Sauce", "Joghurtsauce"], icon: "🫙", category: "Sauces" },
  { name: "Mozzarella", names: ["Mozzarella", "Extra Mozzarella", "Käse"], icon: "🧀", category: "Cheese" },
  { name: "Gorgonzola", names: ["Gorgonzola"], icon: "🧀", category: "Cheese" },
  { name: "Parmesan", names: ["Parmesan"], icon: "🧀", category: "Cheese" },
  { name: "Mascarpone", names: ["Mascarpone"], icon: "🧀", category: "Cheese" },
  { name: "Kaeserand", names: ["Kaeserand", "Käserand", "Cheese Crust"], icon: "🧀", category: "Cheese" },
];

export default function OrdersScreen() {
  const insets = useSafeAreaInsets();
  const { tenant } = useLicense();
  const { language } = useLanguage();
  const qc = useQueryClient();
  const tenantId = tenant?.id;

  const [viewMode, setViewMode] = useState<"online" | "pos" | "all">("all");
  const [filter, setFilter] = useState<string>("all");
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

  // Normalize both sources into unified list
  const unifiedOrders = [
    ...(onlineOrders as any[]).map(o => ({ ...o, _type: "online" as const, _sortTime: new Date(o.createdAt).getTime() })),
    ...(posOrders as any[]).map(s => ({ ...s, _type: "pos" as const, _sortTime: new Date(s.createdAt).getTime(), status: s.status || "completed" })),
  ].sort((a, b) => b._sortTime - a._sortTime);

  // Filter
  const filteredOrders = unifiedOrders.filter(o => {
    if (viewMode === "online" && o._type !== "online") return false;
    if (viewMode === "pos" && o._type !== "pos") return false;
    if (filter === "active") return ["pending", "accepted", "preparing", "ready"].includes(o.status);
    if (filter === "done") return ["delivered", "cancelled", "completed"].includes(o.status);
    return true;
  });

  const pendingCount = (onlineOrders as any[]).filter((o: any) => o.status === "pending").length;

  // New order notification
  useEffect(() => {
    if (!onlineOrders.length) return;
    const incoming = (onlineOrders as any[]).filter(o => !knownOrderIds.current.has(`online-${o.id}`) && o.status === "pending");
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
    (onlineOrders as any[]).forEach(o => knownOrderIds.current.add(`online-${o.id}`));
  }, [onlineOrders]);

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
            setNewOrderIds(prev => { const next = new Set(prev); next.add(data.order?.id); return next; });
          } else if (data.type === "online_order_updated") {
            qc.invalidateQueries({ queryKey: ["/api/online-orders"] });
          }
        } catch { }
      };
    } catch { }
    return () => ws?.close();
  }, []);

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
      // Fetch items for POS sale
      try {
        const res = await apiRequest("GET", `/api/sales/${order.id}`);
        const full = await res.json();
        const items = (full.items || []).map((it: any) => ({
          productId: it.productId,
          name: it.productName,
          quantity: it.quantity,
          unitPrice: Number(it.unitPrice),
          total: Number(it.total),
          notes: it.notes || "",
          modifiers: it.modifiers || [],
        }));
        const subtotal = items.reduce((s: number, i: any) => s + i.total, 0);
        setEditForm({
          customerName: order.customerName || "",
          customerPhone: order.customerPhone || "",
          customerAddress: "",
          notes: full.notes || "",
          estimatedTime: "",
          items,
          subtotal,
          deliveryFee: 0,
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
        items: order.items ? JSON.parse(JSON.stringify(order.items)) : [],
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

    const nextBtnColor: Record<string, string[]> = {
      accepted: ["#3B82F6", "#1D4ED8"],
      preparing: ["#8B5CF6", "#6D28D9"],
      ready: ["#2FD3C6", "#0D9488"],
      delivered: ["#10B981", "#059669"],
    };

    const sourceColor = isPOS ? "#F59E0B" : "#6366F1";
    const sourceBg = isPOS ? "rgba(245,158,11,0.12)" : "rgba(99,102,241,0.12)";
    const sourceLabel = isPOS ? (language === "ar" ? "📞 كاشير" : "📞 POS") : (language === "ar" ? "🌐 إلكتروني" : "🌐 Online");
    const orderId = isPOS ? (item.receiptNumber || `#${item.id}`) : `#${item.orderNumber}`;

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
                <View style={[styles.metaChip, { backgroundColor: item.orderType === "delivery" ? "rgba(99,102,241,0.15)" : "rgba(16,185,129,0.15)" }]}>
                  <Text style={styles.metaChipText}>{item.orderType === "delivery" ? "🛵" : "🏃"} {item.orderType}</Text>
                </View>
              ) : null}
            </View>
          </View>
        ) : null}

        {/* Items - for online orders with full items data */}
        {item.items && item.items.length > 0 ? (
          <View style={styles.itemsList}>
            {(item.items || []).slice(0, 4).map((it: any, idx: number) => (
              <View key={idx} style={{ marginBottom: 4 }}>
                <View style={[styles.itemRow, isRTL && { flexDirection: "row-reverse" }]}>
                  <Text style={styles.itemQty}>{it.quantity}×</Text>
                  <Text style={[styles.itemName, { flex: 1 }, isRTL && { textAlign: "right" }]}>{it.name || it.productName}</Text>
                  <Text style={styles.itemPrice}>CHF {Number(it.total).toFixed(2)}</Text>
                </View>
                {it.notes ? <Text style={[styles.itemAddons, isRTL && { textAlign: "right" }]}>↳ {it.notes}</Text> : null}
              </View>
            ))}
            {item.items.length > 4 && <Text style={styles.itemAddons}>+{item.items.length - 4} {lbl("more items", "عناصر أخرى", "weitere Artikel")}</Text>}
            {item.notes ? <Text style={[styles.orderNotes, isRTL && { textAlign: "right" }]}>📝 {item.notes}</Text> : null}
          </View>
        ) : item.notes ? (
          <View style={styles.itemsList}>
            <Text style={[styles.orderNotes, isRTL && { textAlign: "right" }]}>📝 {item.notes}</Text>
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

  // --- Color-coded topping grid (POS style) ---
  const TOPPING_GRID: { color: string; textColor: string; items: (string | null)[] }[] = [
    { color: "#1455A4", textColor: "#fff", items: ["Tomato Sauce", "Sliced Tomatoes", "Garlic", "Onions", "Capers", "Olives", "Oregano"] },
    { color: "#1976D2", textColor: "#fff", items: ["Vegetables", "Spinach", "Bell Peppers", null, "Corn", "Broccoli", "Artichokes"] },
    { color: "#E8EAF6", textColor: "#1a1a2e", items: ["Egg", "Pineapple", null, null, null, null, "Arugula"] },
    { color: "#E8EAF6", textColor: "#1a1a2e", items: ["Mushrooms", null, null, null, null, null, null] },
    { color: "#B71C1C", textColor: "#fff", items: ["Ham", "Spicy Salami", "Salami", "Bacon", "Prosciutto", null, null] },
    { color: "#B71C1C", textColor: "#fff", items: ["Lamb", "Chicken", "Kebab", "Minced Meat", null, "Mayonnaise", null] },
    { color: "#BF360C", textColor: "#fff", items: ["Anchovies", "Shrimp", "Tuna", null, null, "Ketchup", null] },
    { color: "#1B5E20", textColor: "#fff", items: [null, null, null, null, null, "Cocktail Sauce", "Spicy Sauce"] },
    { color: "#F9A825", textColor: "#1a1a2e", items: ["Mozzarella", "Gorgonzola", "Parmesan", "Mascarpone", "Kaeserand", "Yogurt Sauce", null] },
  ];

  const toppingDisplayName = (name: string): string => {
    const de: Record<string, string> = {
      "Tomato Sauce": "Tomatensauce", "Sliced Tomatoes": "Tomatenscheiben", "Garlic": "Knoblauch",
      "Onions": "Zwiebeln", "Capers": "Kapern", "Olives": "Oliven", "Oregano": "Oregano",
      "Vegetables": "Gemüse", "Spinach": "Spinat", "Bell Peppers": "Peperoni",
      "Corn": "Mais", "Broccoli": "Broccoli", "Artichokes": "Artischoken",
      "Egg": "Ei", "Pineapple": "Ananas", "Arugula": "Rukola", "Mushrooms": "Champignons",
      "Ham": "Schinken", "Spicy Salami": "Salami scharf", "Salami": "Salami",
      "Bacon": "Speck", "Prosciutto": "Rohschinken",
      "Lamb": "Lammfleisch", "Chicken": "Poulet", "Kebab": "Kebab",
      "Minced Meat": "Hackfleisch", "Mayonnaise": "Mayonaise",
      "Anchovies": "Sardellen", "Shrimp": "Crevetten", "Tuna": "Thon",
      "Ketchup": "Ketchup", "Cocktail Sauce": "Cocktail", "Spicy Sauce": "SCHARF",
      "Mozzarella": "Mozzarella", "Gorgonzola": "Gorgonzola", "Parmesan": "Käse",
      "Mascarpone": "Mascarpone", "Kaeserand": "Käserand", "Yogurt Sauce": "Joghurt",
    };
    const ar: Record<string, string> = {
      "Tomato Sauce": "صلصة طماطم", "Sliced Tomatoes": "طماطم مقطعة", "Garlic": "ثوم",
      "Onions": "بصل", "Capers": "كابر", "Olives": "زيتون", "Oregano": "أوريغانو",
      "Vegetables": "خضار", "Spinach": "سبانخ", "Bell Peppers": "فلفل", "Corn": "ذرة",
      "Broccoli": "بروكلي", "Artichokes": "أرضي شوكي", "Egg": "بيض", "Pineapple": "أناناس",
      "Arugula": "جرجير", "Mushrooms": "مشروم", "Ham": "هام", "Spicy Salami": "سلامي حار",
      "Salami": "سلامي", "Bacon": "لحم مدخن", "Prosciutto": "بروشوتو",
      "Lamb": "لحم ضأن", "Chicken": "دجاج", "Kebab": "كباب", "Minced Meat": "لحم مفروم",
      "Mayonnaise": "مايونيز", "Anchovies": "أنشوجة", "Shrimp": "جمبري", "Tuna": "تونة",
      "Ketchup": "كاتشاب", "Cocktail Sauce": "صلصة كوكتيل", "Spicy Sauce": "حار",
      "Mozzarella": "موزاريلا", "Gorgonzola": "جورجونزولا", "Parmesan": "جبنة",
      "Mascarpone": "ماسكاربوني", "Kaeserand": "حافة جبنة", "Yogurt Sauce": "زبادي",
    };
    if (language === "de") return de[name] || name;
    if (language === "ar") return ar[name] || name;
    return name;
  };

  const toppingEmoji = (name: string): string => {
    const map: Record<string, string> = {
      "Tomato Sauce": "🍅", "Sliced Tomatoes": "🍅", "Garlic": "🧄", "Onions": "🧅",
      "Capers": "🫛", "Olives": "🫒", "Oregano": "🌿", "Vegetables": "🥦",
      "Spinach": "🥬", "Bell Peppers": "🫑", "Corn": "🌽", "Broccoli": "🥦",
      "Artichokes": "🌿", "Arugula": "🥬", "Egg": "🥚", "Pineapple": "🍍",
      "Mushrooms": "🍄", "Ham": "🥩", "Spicy Salami": "🌶️", "Salami": "🥩",
      "Bacon": "🥓", "Prosciutto": "🥩", "Lamb": "🐑", "Chicken": "🍗",
      "Kebab": "🥙", "Minced Meat": "🥩", "Mayonnaise": "🫙", "Anchovies": "🐟",
      "Shrimp": "🍤", "Tuna": "🐟", "Ketchup": "🍅", "Cocktail Sauce": "🥂",
      "Spicy Sauce": "🌶️", "Mozzarella": "🧀", "Gorgonzola": "🧀",
      "Parmesan": "🧀", "Mascarpone": "🧀", "Kaeserand": "🧀", "Yogurt Sauce": "🥛",
    };
    return map[name] || "✨";
  };

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
    if (Platform.OS !== "web") {
      Alert.alert("Print", "Printing is only supported on web currently.");
      return;
    }

    const orderNum = editingOrder?._type === "pos" ? (editingOrder?.receiptNumber || `#${editingOrder?.id}`) : `#${editingOrder?.orderNumber}`;
    const dateStr = new Date().toLocaleDateString();
    const timeStr = new Date().toLocaleTimeString();

    const storeName = storeSettings?.name || "POS System";
    const storeAddr = storeSettings?.address || "";
    const storePhone = storeSettings?.phone || "";
    const storeEmail = storeSettings?.email || "";
    const logoUrl = storeSettings?.logo || "";

    const generateInnerReceipt = (isKitchen: boolean, title: string) => {
      const itemsHtml = editForm.items.map((item: any) => `
        <div style="display:flex;justify-content:space-between;padding:3px 0;${isKitchen ? 'font-size:14px;font-weight:bold;' : ''}">
          <span style="flex:2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${item.name}</span>
          <span style="width:40px;text-align:center;">x${item.quantity}</span>
          ${!isKitchen ? `<span style="width:75px;text-align:right;">CHF ${Number(item.total || 0).toFixed(2)}</span>` : ""}
        </div>
      `).join("");

      const logoHtml = logoUrl && !isKitchen ? `<div style="text-align:center;margin:8px 0;"><img src="${logoUrl}" style="max-height:55px;max-width:200px;object-fit:contain;" /></div>` : "";

      return `
        <div class="center sep" style="letter-spacing:1px;margin:5px 0;">${"=".repeat(36)}</div>
        ${logoHtml}
        <div class="center bold" style="font-size:18px;margin-bottom:4px;text-transform:uppercase;">${title}</div>
        <div class="center bold" style="font-size:14px;">${storeName}</div>
        ${!isKitchen ? `
          ${storeAddr ? `<div class="center">${storeAddr}</div>` : ""}
          ${storePhone ? `<div class="center">${storePhone}</div>` : ""}
          ${storeEmail ? `<div class="center">${storeEmail}</div>` : ""}
        ` : ""}
        
        <div class="center sep" style="letter-spacing:1px;margin:5px 0;">${"─".repeat(36)}</div>
        
        <div>${lbl("Date", "التاريخ", "Datum")}: ${dateStr}, ${timeStr}</div>
        <div>${lbl("Order Number", "رقم الطلب", "Bestellnummer")}: ${orderNum}</div>
        ${editForm.customerName ? `<div>${lbl("Customer", "العميل", "Kunde")}: ${editForm.customerName}</div>` : ""}
        ${editForm.customerPhone ? `<div>${lbl("Phone", "الهاتف", "Telefon")}: ${editForm.customerPhone}</div>` : ""}
        ${editForm.customerAddress ? `<div>${lbl("Address", "العنوان", "Adresse")}: ${editForm.customerAddress}</div>` : ""}
        
        <div class="center sep" style="letter-spacing:1px;margin:5px 0;">${"─".repeat(36)}</div>
        
        <div class="flex-between bold">
          <span style="flex:2;">Item</span>
          <span style="width:40px;text-align:center;">Qty</span>
          ${!isKitchen ? `<span style="width:75px;text-align:right;">Total</span>` : ""}
        </div>
        
        <div class="center sep" style="letter-spacing:1px;margin:5px 0;">${"─".repeat(36)}</div>
        
        ${itemsHtml}
        
        ${!isKitchen ? `
        <div class="center sep" style="letter-spacing:1px;margin:5px 0;">${"─".repeat(36)}</div>
        
        <div class="flex-between">
          <span>${lbl("Subtotal", "المجموع الفرعي", "Zwischensumme")}:</span>
          <span>CHF ${Number(editForm.subtotal).toFixed(2)}</span>
        </div>
        ${editForm.deliveryFee > 0 ?
            '<div class="flex-between"><span>' + lbl("Delivery Fee", "رسوم التوصيل", "Liefergebühr") + ':</span><span>CHF ' + Number(editForm.deliveryFee).toFixed(2) + '</span></div>'
            : ""}
        
        <div class="center sep" style="letter-spacing:1px;margin:5px 0;">${"=".repeat(36)}</div>
        
        <div class="flex-between bold" style="font-size:15px;">
          <span>TOTAL:</span>
          <span>CHF ${Number(editForm.totalAmount).toFixed(2)}</span>
        </div>
        
        <div class="center sep" style="letter-spacing:1px;margin:5px 0;">${"=".repeat(36)}</div>
        
        <div class="center bold" style="margin-top:14px;font-size:13px;">${lbl("Thank You", "شكراً لك", "Vielen Dank")}</div>
        ${storeAddr ? `<div class="center" style="font-size:10px;margin-top:2px;">Visit us: ${storeAddr}</div>` : ""}
        <div class="center sep" style="margin-top:10px;overflow:hidden;white-space:nowrap;">${"=".repeat(36)}</div>
        ` : `
        <div class="center bold" style="margin-top:14px;font-size:13px;">KÜCHENBON</div>
        <div class="center sep" style="margin-top:10px;overflow:hidden;white-space:nowrap;">${"=".repeat(36)}</div>
        `}
      `;
    };

    const customerInner = generateInnerReceipt(false, lbl("CUSTOMER RECEIPT", "فاتورة العميل", "KUNDENBELEG"));
    const driverInner = generateInnerReceipt(false, lbl(`DRIVER ORDER ${orderNum}`, `طلب السائق ${orderNum}`, `FAHRERAUFTRAG ${orderNum}`));
    const kitchenInner = generateInnerReceipt(true, lbl("KITCHEN RECEIPT", "طلبية المطبخ", "KÜCHENBON"));

    const driverFooter = `
      <div style="border:1px solid #000;margin-top:12px;font-family:'Courier New',monospace;font-size:12px;color:#000;">
        <div style="display:flex;border-bottom:1px solid #000;padding:10px 10px;">
          <span style="font-weight:700;width:110px;min-width:110px;">FAHRER</span>
          <span style="flex:1;">&nbsp;</span>
        </div>
        <div style="display:flex;border-bottom:1px solid #000;padding:10px 10px;">
          <span style="font-weight:700;width:110px;min-width:110px;">LIEFERZEIT</span>
          <span style="flex:1;">&nbsp;</span>
        </div>
        <div style="display:flex;padding:10px 10px;">
          <span style="font-weight:700;width:110px;min-width:110px;">NOTIZ</span>
          <span style="flex:1;">&nbsp;</span>
        </div>
      </div>`;

    const combinedHtml = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <title>Receipt ${orderNum}</title>
  <style>
    @page { size: A4; margin: 15mm 20mm; }
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 13px; color: #333; line-height: 1.4; background: #fff; margin: 0; padding: 0; }
    .page-break { page-break-after: always; }
    
    /* Thermal aesthetics for inside A4 wrapper */
    .thermal-receipt {
      width: 320px;
      margin: 0 auto;
      font-family: 'Courier New', monospace;
      font-size: 11px;
      color: #000;
    }
    .center { text-align: center; }
    .bold { font-weight: 800; }
    .sep { letter-spacing: 1px; margin: 5px 0; overflow: hidden; white-space: nowrap; }
    .flex-between { display: flex; justify-content: space-between; padding: 2px 0; }
  </style>
</head>
<body>
  
  <div class="thermal-receipt">
    ${customerInner}
  </div>

  <div class="page-break"></div>
  
  <div class="thermal-receipt">
    ${driverInner}
    ${driverFooter}
  </div>

  <div class="page-break"></div>

  <div class="thermal-receipt">
    ${kitchenInner}
  </div>

</body>
</html>`;

    printHtmlViaIframe(combinedHtml);
  };

  return (
    <View style={styles.container}>

      {/* ===== EDIT ORDER MODAL ===== */}
      <Modal visible={!!editingOrder} animationType="slide" transparent onRequestClose={() => setEditingOrder(null)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={styles.modalSheet}>
            <View style={[styles.modalHeader, isRTL && { flexDirection: "row-reverse" }]}>
              <Text style={styles.modalTitle}>
                {lbl("Edit Order", "تعديل الطلب", "Bestellung bearbeiten")}{" "}
                {editingOrder?._type === "pos" ? (editingOrder?.receiptNumber || `#${editingOrder?.id}`) : `#${editingOrder?.orderNumber}`}
              </Text>
              <Pressable onPress={() => setEditingOrder(null)}>
                <Ionicons name="close" size={22} color={Colors.textMuted} />
              </Pressable>
            </View>
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
              {/* Online-order specific fields */}
              {editingOrder?._type !== "pos" && [
                { label: lbl("Customer Name", "اسم العميل", "Kundenname"), key: "customerName", placeholder: "Name" },
                { label: lbl("Phone", "الهاتف", "Telefon"), key: "customerPhone", placeholder: "+1 234 567" },
                { label: lbl("Address", "العنوان", "Adresse"), key: "customerAddress", placeholder: "Street, City" },
                { label: lbl("Estimated Time (min)", "وقت التوصيل (دقيقة)", "Geschätzte Zeit (Min)"), key: "estimatedTime", placeholder: "30" },
              ].map((f: any) => (
                <View key={f.key} style={styles.editField}>
                  <Text style={[styles.editLabel, isRTL && { textAlign: "right" }]}>{f.label}</Text>
                  <TextInput
                    style={[styles.editInput, isRTL && { textAlign: "right" }]}
                    value={(editForm as any)[f.key]}
                    onChangeText={v => setEditForm(prev => ({ ...prev, [f.key]: v }))}
                    placeholder={f.placeholder}
                    placeholderTextColor={Colors.textMuted}
                    keyboardType={f.key === "estimatedTime" ? "number-pad" : "default"}
                  />
                </View>
              ))}
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
            <Text style={{ color: Colors.textMuted, fontSize: 12, marginBottom: 8 }}>
              {lbl("SELECT EXTRAS", "اختر الإضافات", "EXTRAS AUSWÄHLEN")}
            </Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
              {/* POS Topping Grid */}
              <View style={{ flexDirection: "row", flexWrap: "wrap", borderRadius: 8, overflow: "hidden" }}>
                {TOPPING_GRID.flatMap((row, rowIdx) =>
                  row.items.map((toppingName, colIdx) => {
                    if (!toppingName) return null;
                    const isSelected = freeExtrasSelected.includes(toppingName);
                    return (
                      <View key={`${rowIdx}-${colIdx}`} style={{ width: "14.28%", height: 48, padding: 1 }}>
                        <Pressable
                          onPress={() => setFreeExtrasSelected(prev => isSelected ? prev.filter(t => t !== toppingName) : [...prev, toppingName])}
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
              {/* Selected summary */}
              {freeExtrasSelected.length > 0 && (
                <View style={{ marginBottom: 10, padding: 8, backgroundColor: Colors.success + "15", borderRadius: 8, borderWidth: 1, borderColor: Colors.success + "40" }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <Text style={{ color: Colors.success, fontSize: 11, fontWeight: "700" }}>
                      {lbl(`Selected(${freeExtrasSelected.length})`, `المختار(${freeExtrasSelected.length})`, `Ausgewählt(${freeExtrasSelected.length})`)}
                    </Text>
                    <Pressable onPress={() => setFreeExtrasSelected([])}>
                      <Text style={{ color: Colors.danger, fontSize: 11, fontWeight: "600" }}>{lbl("Clear all", "مسح الكل", "Alle löschen")}</Text>
                    </Pressable>
                  </View>
                  <Text style={{ color: Colors.text, fontSize: 11 }}>{freeExtrasSelected.map(t => toppingDisplayName(t)).join(", ")}</Text>
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
                      { productId: 0, name: `[Extras] ${extrasName} `, quantity: 1, unitPrice: 0, total: 0 },
                    ];
                    return { ...prev, items: nextItems };
                  });
                }
                setShowFreeExtrasModal(false);
                setFreeExtrasSelected([]);
              }}
            >
              <Text style={styles.modalSaveText}>
                {freeExtrasSelected.length > 0 ? lbl(`Add ${freeExtrasSelected.length} Extras`, `إضافة ${freeExtrasSelected.length} إضافة`, `${freeExtrasSelected.length} hinzufügen`) : lbl("Done", "تم", "Fertig")}
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
                            <Image source={{ uri: p.image }} style={styles.productCardImage} resizeMode="cover" />
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

      {/* ===== HEADER ===== */}
      <View style={[styles.header, { paddingTop: Platform.OS === "web" ? 48 : insets.top }]}>
        <LinearGradient colors={["#1E1B4B", "#312E81", "#0A0E27"]} style={styles.headerGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={[styles.headerContent, isRTL && { flexDirection: "row-reverse" }]}>
            <View>
              <Text style={[styles.headerTitle, isRTL && { textAlign: "right" }]}>
                {lbl("All Orders", "جميع الطلبات", "Alle Bestellungen")}
              </Text>
              <Text style={[styles.headerSub, isRTL && { textAlign: "right" }]}>
                {pendingCount > 0
                  ? lbl(`${pendingCount} online order${pendingCount > 1 ? "s" : ""} pending`, `${pendingCount} طلب إلكتروني جديد`, `${pendingCount} neue Online - Bestellung(en)`)
                  : lbl("Live orders dashboard", "لوحة الطلبات المباشرة", "Live-Bestellübersicht")}
              </Text>
            </View>
            {pendingCount > 0 && (
              <Animated.View style={[styles.pendingBadge, { transform: [{ scale: pulseAnim }] }]}>
                <Text style={styles.pendingBadgeText}>{pendingCount}</Text>
              </Animated.View>
            )}
          </View>

          {/* Source tabs */}
          <View style={[styles.filterRow, isRTL && { flexDirection: "row-reverse" }]}>
            {[
              { key: "all", en: "All Orders", ar: "الكل", de: "Alle" },
              { key: "online", en: "🌐 Online", ar: "🌐 إلكتروني", de: "🌐 Online" },
              { key: "pos", en: "📞 POS", ar: "📞 كاشير", de: "📞 Kasse" },
            ].map(f => (
              <Pressable key={f.key} onPress={() => { playClickSound("light"); setViewMode(f.key as any); }} style={[styles.filterTab, viewMode === f.key && styles.filterTabActive]}>
                <Text style={[styles.filterTabText, viewMode === f.key && styles.filterTabTextActive]}>
                  {language === "ar" ? f.ar : language === "de" ? f.de : f.en}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Status filter */}
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
        </LinearGradient>
      </View>

      {/* ===== ORDER LIST ===== */}
      <FlatList
        data={filteredOrders}
        keyExtractor={(item: any) => `${item._type} -${item.id} `}
        renderItem={renderOrder}
        contentContainerStyle={styles.listContent}
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
  header: { overflow: "hidden" },
  headerGrad: { paddingHorizontal: 16, paddingBottom: 0 },
  headerContent: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 16, paddingBottom: 12 },
  headerTitle: { color: "#fff", fontSize: 22, fontWeight: "800" },
  headerSub: { color: "rgba(255,255,255,0.6)", fontSize: 12, marginTop: 2 },
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
