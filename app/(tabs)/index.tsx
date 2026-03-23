import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "expo-router";
import {
  StyleSheet, Text, View, FlatList, Pressable, TextInput,
  ScrollView, Modal, Alert, Platform, Dimensions, Image, Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Colors } from "@/constants/colors";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { useLicense } from "@/lib/license-context";
import { apiRequest, getQueryFn, getApiUrl } from "@/lib/query-client";
import BarcodeScanner from "@/components/BarcodeScanner";
import { playClickSound, playAddSound } from "@/lib/sound";
import RealTimeClock from "@/components/RealTimeClock";
import { useLanguage } from "@/lib/language-context";
import { useNotifications } from "@/lib/notification-context";

const AnimatedProductImage = ({ uri }: { uri: string }) => {
  return (
    <Image
      source={{ uri }}
      style={{ width: 50, height: 50, borderRadius: 12 }}
      resizeMode="cover"
    />
  );
};

export default function POSScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { employee, isCashier, canManage, login } = useAuth();
  const { tenant } = useLicense();
  const qc = useQueryClient();
  const cart = useCart();
  const { t, isRTL, rtlTextAlign, rtlText, rtlRow, language } = useLanguage();
  const [screenDims, setScreenDims] = useState(Dimensions.get("window"));
  useEffect(() => {
    const sub = Dimensions.addEventListener("change", ({ window }) => setScreenDims(window));
    return () => sub?.remove();
  }, []);
  const isTablet = screenDims.width > 600;
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [cashReceived, setCashReceived] = useState("");
  const [lastSale, setLastSale] = useState<any>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [discountInput, setDiscountInput] = useState("");
  const [discountType, setDiscountType] = useState<"fixed" | "percent">("fixed");
  const [showScanner, setShowScanner] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [debouncedCustomerSearch, setDebouncedCustomerSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCustomerSearch(customerSearch);
    }, 400);
    return () => clearTimeout(timer);
  }, [customerSearch]);

  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [cardProcessing, setCardProcessing] = useState(false);
  const [cardError, setCardError] = useState("");
  const [nfcStatus, setNfcStatus] = useState<"waiting" | "reading" | "success" | "error">("waiting");
  const [nfcPulse, setNfcPulse] = useState(0);
  const [showInvoiceHistory, setShowInvoiceHistory] = useState(false);
  const [invoiceFilter24h, setInvoiceFilter24h] = useState(true); // default: last 24h
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [showReprintReceipt, setShowReprintReceipt] = useState(false);
  const [reprintQrDataUrl, setReprintQrDataUrl] = useState<string | null>(null);
  const [showAccountSwitcher, setShowAccountSwitcher] = useState(false);
  const [switchTarget, setSwitchTarget] = useState<any>(null);
  const [switchPin, setSwitchPin] = useState("");
  const [switchLoading, setSwitchLoading] = useState(false);
  const [switchError, setSwitchError] = useState("");
  const [showSwitchShiftPrompt, setShowSwitchShiftPrompt] = useState(false);
  const [switchedEmployee, setSwitchedEmployee] = useState<any>(null);
  const [switchOpeningCash, setSwitchOpeningCash] = useState("");
  const [showSwitchCashInput, setShowSwitchCashInput] = useState(false);
  const [selectedProductForOptions, setSelectedProductForOptions] = useState<any>(null);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [selectedToppings, setSelectedToppings] = useState<string[]>([]);
  const [showToppingsStep, setShowToppingsStep] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");
  const [customerPhoneLoading, setCustomerPhoneLoading] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [leftHandMode, setLeftHandMode] = useState(false);
  useEffect(() => {
    import("@react-native-async-storage/async-storage").then(({ default: AsyncStorage }) => {
      AsyncStorage.getItem("barmagly_left_hand_mode").then((v) => {
        if (v === "true") setLeftHandMode(true);
      });
    });
  }, []);
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({ name: "", phone: "", address: "", email: "" });
  const [showOnlineOrders, setShowOnlineOrders] = useState(false);
  const [showCallHistory, setShowCallHistory] = useState(false);
  const [callHistoryFilter, setCallHistoryFilter] = useState<"all" | "missed" | "answered" | "today">("all");
  const [callHistorySearch, setCallHistorySearch] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [showOrderNotes, setShowOrderNotes] = useState(false);
  const [endOfDayLoading, setEndOfDayLoading] = useState(false);
  const [lastAddedId, setLastAddedId] = useState<number | null>(null);
  const flashAnim = useRef(new Animated.Value(0)).current;
  const checkoutPulse = useRef(new Animated.Value(1)).current;
  const [activeCallId, setActiveCallId] = useState<number | null>(null);

  const { onlineOrderNotification, setOnlineOrderNotification, incomingCalls, setIncomingCalls, dismissCall } = useNotifications();

  const tenantId = tenant?.id;

  // Track which call IDs have already been auto-processed so we don't re-run on re-renders
  const processedCallIds = useRef<Set<string>>(new Set());
  // Store auto-dismiss timer IDs so they can be cleared on manual dismiss (prevents double-dismiss)
  const autoDismissTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  // Store caller's full customer object directly (faster than waiting for customers list)
  const [callerCustomer, setCallerCustomer] = useState<any>(null);

  // Pulse checkout button when cart has items
  useEffect(() => {
    if (cart.items.length > 0) {
      Animated.sequence([
        Animated.timing(checkoutPulse, { toValue: 1.03, duration: 180, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(checkoutPulse, { toValue: 1, duration: 180, useNativeDriver: Platform.OS !== 'web' }),
      ]).start();
    }
  }, [cart.items.length]);

  // Wrapper around dismissCall that also clears the pending auto-dismiss timer
  const handleDismissCall = useCallback((callId: string, slot: number) => {
    const timer = autoDismissTimers.current.get(callId);
    if (timer) {
      clearTimeout(timer);
      autoDismissTimers.current.delete(callId);
    }
    dismissCall(callId, slot);
  }, [dismissCall]);

  // Flash animation when item added
  const triggerFlash = useCallback((productId: number) => {
    setLastAddedId(productId);
    flashAnim.setValue(1);
    Animated.timing(flashAnim, { toValue: 0, duration: 600, useNativeDriver: false }).start(() => {
      setLastAddedId(null);
    });
  }, [flashAnim]);

  // AUTO-ASSIGN: when a call comes in, immediately add caller to the current cart
  useEffect(() => {
    if (incomingCalls.length === 0) return;
    incomingCalls.forEach((call) => {
      const callId = String(call.id);
      if (processedCallIds.current.has(callId)) return;
      processedCallIds.current.add(callId);

      if (call.customer) {
        // Known customer → assign to cart and store full customer object for immediate display
        cart.setCustomerId(call.customer.id);
        setCallerCustomer(call.customer);
        setPhoneInput(call.customer.phone || call.phoneNumber);
        if (call.dbCallId) setActiveCallId(Number(call.dbCallId));
      } else {
        // Unknown caller → pre-fill phone and immediately try silent lookup
        setPhoneInput(call.phoneNumber);
        setCallerCustomer(null);
        if (call.dbCallId) setActiveCallId(Number(call.dbCallId));
        if (tenantId) {
          apiRequest("GET", `/api/customers/phone-lookup?phone=${encodeURIComponent(call.phoneNumber)}&tenantId=${tenantId}`)
            .then(res => res.ok ? res.json() : [])
            .then((matches: any[]) => {
              if (matches && matches.length > 0) {
                const found = matches[0];
                cart.setCustomerId(found.id);
                setCallerCustomer(found);
                setPhoneInput(found.phone || call.phoneNumber);
                // Update the call notification to show customer name
                setIncomingCalls(prev => prev.map(c => c.id === call.id ? { ...c, customer: found } : c));
              }
            })
            .catch(() => { });
        }
      }

      // Auto-dismiss the popup after 10 seconds (timer tracked so manual dismiss can cancel it)
      const autoDismissTimer = setTimeout(() => {
        autoDismissTimers.current.delete(callId);
        dismissCall(callId, call.slot);
      }, 10000);
      autoDismissTimers.current.set(callId, autoDismissTimer);
    });
  }, [incomingCalls]);

  const PIZZA_TOPPINGS = [
    // Sauces / Base
    { name: "Tomato Sauce", names: ["Tomato Sauce", "Tomatensauce", "Extra Tomatensauce"], icon: "🍅", category: "Sauces" },
    { name: "Tomatoes", names: ["Tomatoes", "Tomaten", "Extra Tomaten"], icon: "🍅", category: "Vegetables" },
    { name: "Sliced Tomatoes", names: ["Sliced Tomatoes", "Tomatenscheiben", "Extra Tomatenscheiben"], icon: "🍅", category: "Vegetables" },
    // Vegetables
    { name: "Garlic", names: ["Garlic", "Knoblauch", "Extra Knoblauch"], icon: "🧄", category: "Vegetables" },
    { name: "Onions", names: ["Onions", "Zwiebeln", "Extra Zwiebeln"], icon: "🧅", category: "Vegetables" },
    { name: "Capers", names: ["Capers", "Kapern", "Extra Kapern"], icon: "🫛", category: "Vegetables" },
    { name: "Olives", names: ["Olives", "Oliven", "Extra Oliven"], icon: "🫒", category: "Vegetables" },
    { name: "Oregano", names: ["Oregano", "Extra Oregano"], icon: "🌿", category: "Others" },
    { name: "Vegetables", names: ["Vegetables", "Gemüse", "Extra Gemüse"], icon: "🥦", category: "Vegetables" },
    { name: "Spinach", names: ["Spinach", "Spinat", "Extra Spinat"], icon: "🥬", category: "Vegetables" },
    { name: "Bell Peppers", names: ["Bell Peppers", "Peperoni", "Paprika", "Extra Peperoni"], icon: "🫑", category: "Vegetables" },
    { name: "Corn", names: ["Corn", "Mais", "Extra Mais"], icon: "🌽", category: "Vegetables" },
    { name: "Broccoli", names: ["Broccoli", "Extra Broccoli"], icon: "🥦", category: "Vegetables" },
    { name: "Artichokes", names: ["Artichokes", "Artischocken", "Artischoken", "Extra Artischocken"], icon: "🌿", category: "Vegetables" },
    { name: "Arugula", names: ["Arugula", "Rucola", "Rukola", "Extra Rucola"], icon: "🥬", category: "Vegetables" },
    { name: "Egg", names: ["Egg", "Ei", "Extra Ei"], icon: "🥚", category: "Others" },
    { name: "Pineapple", names: ["Pineapple", "Ananas", "Extra Ananas"], icon: "🍍", category: "Others" },
    { name: "Mushrooms", names: ["Mushrooms", "Pilze", "Champignons", "Extra Pilze", "Extra Champignons"], icon: "🍄", category: "Vegetables" },
    // Meat
    { name: "Ham", names: ["Ham", "Schinken", "Extra Schinken"], icon: "🥩", category: "Meat" },
    { name: "Spicy Salami", names: ["Spicy Salami", "Scharfe Salami", "Salami scharf", "Extra Scharfe Salami", "Diavola"], icon: "🌶️", category: "Meat" },
    { name: "Salami", names: ["Salami", "Extra Salami"], icon: "🥩", category: "Meat" },
    { name: "Bacon", names: ["Bacon", "Speck", "Extra Speck"], icon: "🥓", category: "Meat" },
    { name: "Prosciutto", names: ["Prosciutto", "Rohschinken", "Raw Ham", "Extra Rohschinken"], icon: "🥩", category: "Meat" },
    { name: "Lamb", names: ["Lamb", "Lammfleisch", "Extra Lammfleisch"], icon: "🥩", category: "Meat" },
    { name: "Chicken", names: ["Chicken", "Poulet", "Hähnchen", "Extra Poulet"], icon: "🍗", category: "Meat" },
    { name: "Kebab", names: ["Kebab", "Kebabfleisch", "Extra Kebabfleisch"], icon: "🥙", category: "Meat" },
    { name: "Minced Meat", names: ["Minced Meat", "Hackfleisch", "Extra Hackfleisch"], icon: "🥩", category: "Meat" },
    // Seafood
    { name: "Anchovies", names: ["Anchovies", "Sardellen", "Extra Sardellen"], icon: "🐟", category: "Seafood" },
    { name: "Shrimp", names: ["Shrimp", "Crevetten", "Garnelen", "Extra Crevetten"], icon: "🍤", category: "Seafood" },
    { name: "Tuna", names: ["Tuna", "Thunfisch", "Thon", "Extra Thunfisch"], icon: "🐟", category: "Seafood" },
    // Sauces
    { name: "Mayonnaise", names: ["Mayonnaise", "Mayo", "Mayonaise"], icon: "🫙", category: "Sauces" },
    { name: "Ketchup", names: ["Ketchup"], icon: "🫙", category: "Sauces" },
    { name: "Cocktail Sauce", names: ["Cocktail Sauce", "Cocktailsauce", "Cocktail"], icon: "🫙", category: "Sauces" },
    { name: "Spicy Sauce", names: ["Spicy Sauce", "Scharfe Sauce", "SCHARF", "Extra Scharf"], icon: "🌶️", category: "Sauces" },
    { name: "Garlic Sauce", names: ["Garlic Sauce", "Knoblauchsauce"], icon: "🫙", category: "Sauces" },
    { name: "Yogurt Sauce", names: ["Yogurt Sauce", "Joghurtsauce", "Joghurt"], icon: "🫙", category: "Sauces" },
    // Cheese
    { name: "Mozzarella", names: ["Mozzarella", "Extra Mozzarella", "Käse", "Extra Käse"], icon: "🧀", category: "Cheese" },
    { name: "Gorgonzola", names: ["Gorgonzola", "Extra Gorgonzola"], icon: "🧀", category: "Cheese" },
    { name: "Parmesan", names: ["Parmesan", "Extra Parmesan"], icon: "🧀", category: "Cheese" },
    { name: "Mascarpone", names: ["Mascarpone", "Extra Mascarpone"], icon: "🧀", category: "Cheese" },
    { name: "Kaeserand", names: ["Kaeserand", "Käserand", "Käserand (33cm)", "Käserand (45cm)", "Cheese Crust"], icon: "🧀", category: "Cheese" },
  ];

  // POS-style color-coded topping grid (matches image 2 layout)
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

  // Localized topping display name
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

  const getToppingInfo = (label: string) => {
    const clean = label.toLowerCase()
      .replace(/^(extra|zusatz|mit)\s+/i, "")
      .trim();

    const found = PIZZA_TOPPINGS.find(t =>
      t.name.toLowerCase() === clean ||
      (t.names && t.names.some(n => n.toLowerCase() === clean)) ||
      label.toLowerCase().includes(t.name.toLowerCase()) ||
      (t.names && t.names.some(n => label.toLowerCase().includes(n.toLowerCase())))
    );

    return found || { icon: "✨", category: "Others" };
  };


  const { data: categories = [] } = useQuery<any[]>({
    queryKey: ["/api/categories", tenantId ? `?tenantId=${tenantId}` : ""],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!tenantId,
  });

  const { data: products = [] } = useQuery<any[]>({
    queryKey: ["/api/products", `?tenantId=${tenantId || ""}${search ? `&search=${search}` : ""}`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: true,
  });

  // Sort categories: pizza first, then rest by sortOrder
  const tenantCategories = [...(categories as any[])].sort((a, b) => {
    const aIsPizza = (a.name || "").toLowerCase().includes("pizza");
    const bIsPizza = (b.name || "").toLowerCase().includes("pizza");
    if (aIsPizza && !bIsPizza) return -1;
    if (!aIsPizza && bIsPizza) return 1;
    return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
  });

  // Merge Bier + Alkoholische Getränke into one chip
  const MERGED_ALCOHOL_ID = -99;
  const bierCat = (categories as any[]).find((c: any) => (c.name || "").toLowerCase() === "bier");
  const alkoCat = (categories as any[]).find((c: any) => (c.name || "").toLowerCase().includes("alkohol"));
  const mergedAlcoholIds: number[] = [bierCat?.id, alkoCat?.id].filter(Boolean) as number[];
  const displayCategories = mergedAlcoholIds.length >= 2
    ? tenantCategories
      .filter((c: any) => !mergedAlcoholIds.includes(c.id))
      .concat([{ id: MERGED_ALCOHOL_ID, name: "Bier & Alkohol", icon: "beer", color: "#f59e0b" }])
    : tenantCategories;

  const { data: allEmployees = [] } = useQuery<any[]>({
    queryKey: ["/api/employees", tenantId ? `?tenantId=${tenantId}` : ""],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: showAccountSwitcher && !!tenantId,
  });

  const { data: customers = [] } = useQuery<any[]>({
    queryKey: [`/api/customers?tenantId=${tenantId || ""}${debouncedCustomerSearch ? `&search=${encodeURIComponent(debouncedCustomerSearch)}` : ""}`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!tenantId,
  });

  const { data: storeSettings } = useQuery<any>({
    queryKey: ["/api/store-settings", tenantId ? `?tenantId=${tenantId}` : ""],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const { data: salesHistory = [] } = useQuery<any[]>({
    queryKey: ["/api/sales", tenantId ? `?tenantId=${tenantId}` : ""],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: showInvoiceHistory && !!tenantId,
  });

  const { data: onlineOrders = [] } = useQuery<any[]>({
    queryKey: ["/api/online-orders", tenantId ? `?tenantId=${tenantId}` : ""],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: showOnlineOrders && !!tenantId,
    refetchInterval: showOnlineOrders ? 30000 : false,
  });

  const { data: callHistory = [] } = useQuery<any[]>({
    queryKey: ["/api/calls", tenantId ? `?tenantId=${tenantId}` : ""],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!tenantId,
    refetchInterval: 5000,
  });

  // Invalidate call history immediately when a new call arrives
  useEffect(() => {
    if (incomingCalls.length > 0) {
      qc.invalidateQueries({ queryKey: ["/api/calls"] });
    }
  }, [incomingCalls.length]);

  const { data: customerCountData } = useQuery<{ count: number }>({
    queryKey: ["/api/customers/count", `?tenantId=${tenantId || ""}${debouncedCustomerSearch ? `&search=${encodeURIComponent(debouncedCustomerSearch)}` : ""}`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!tenantId && showCustomerPicker,
  });
  const totalCustomerCount = customerCountData?.count || 0;

  const { data: myShifts = [] } = useQuery<any[]>({
    queryKey: [tenantId ? `/api/shifts?tenantId=${tenantId}` : "/api/shifts"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!tenantId && showAccountSwitcher,
  });
  const myActiveShift = (myShifts as any[]).find((s: any) => s.employeeId === employee?.id && !s.endTime && s.status === "open");

  const generateThermalReceiptHTML = (saleData: any, qrUrl: string | null = null, options: { isKitchen?: boolean, isPartial?: boolean, title?: string } = {}) => {
    const { isKitchen = false, isPartial = false, title = isKitchen ? "KÜCHENBON" : (t("viewReceipt" as any) || "RECHNUNG") } = options;
    const storeName = storeSettings?.name || tenant?.name || "POS System";
    const storeAddr = storeSettings?.address || "";
    const storePhone = storeSettings?.phone || "";
    const storeEmail = storeSettings?.email || "";
    const logoPath = storeSettings?.logo || "";
    const logoUrl = logoPath ? (logoPath.startsWith("http") || logoPath.startsWith("data:") ? logoPath : `${getApiUrl().replace(/\/$/, "")}${logoPath}`) : "";

    const receiptNum = saleData.receiptNumber || `#${saleData.id}`;
    const saleDate = new Date(saleData.createdAt || saleData.date || Date.now());
    const dateStr = saleDate.toLocaleDateString();
    const timeStr = saleDate.toLocaleTimeString();
    const empName = saleData.employeeName || employee?.name || "Staff";
    const custName = saleData.customerName || "";

    const itemsHtml = (saleData.items || []).map((item: any) => `
      <div style="display:flex;justify-content:space-between;padding:3px 0;${isKitchen ? 'font-size:14px;font-weight:bold;' : ''}">
        <span style="flex:2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${item.productName || item.name}</span>
        <span style="width:40px;text-align:center;">x${item.quantity}</span>
        ${!isKitchen ? `<span style="width:75px;text-align:right;">CHF ${Number(item.total || (item.unitPrice * item.quantity)).toFixed(2)}</span>` : ""}
      </div>
    `).join("");

    const logoHtml = logoUrl && !isKitchen ? `<div style="text-align:center;margin:8px 0;"><img src="${logoUrl}" style="max-height:55px;max-width:200px;object-fit:contain;" /></div>` : "";
    const qrHtml = qrUrl && !isKitchen ? `<div style="text-align:center;margin-top:14px;"><img src="${qrUrl}" style="width:90px;height:90px;" /></div>` : "";

    const innerContent = `
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
  
  <div>${t("receiptDate")}: ${dateStr}, ${timeStr}</div>
  <div>${t("receiptNumber")}: ${receiptNum}</div>
  ${!isKitchen ? `<div>${t("servedBy")}: ${empName}</div>` : ""}
  ${custName ? `<div>${t("customer")}: ${custName}</div>` : ""}
  
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
    <span>${t("subtotal")}:</span>
    <span>CHF ${Number(saleData.subtotal || saleData.totalAmount).toFixed(2)}</span>
  </div>
  ${Number(saleData.discount) > 0 ? `
    <div class="flex-between">
      <span>${t("discount")}:</span>
      <span>-CHF ${Number(saleData.discount).toFixed(2)}</span>
    </div>
  ` : ""}
  ${Number(saleData.serviceFee || saleData.serviceFeeAmount) > 0 ? `
    <div class="flex-between">
      <span>${t("serviceTax") || "Service Tax"}:</span>
      <span>CHF ${Number(saleData.serviceFee || saleData.serviceFeeAmount).toFixed(2)}</span>
    </div>
  ` : ""}
  <div class="flex-between">
    <span>${t("tax")}:</span>
    <span>CHF ${Number(saleData.tax).toFixed(2)}</span>
  </div>
  ${Number(saleData.deliveryFee) > 0 ? `
    <div class="flex-between">
      <span>Delivery Fee:</span>
      <span>CHF ${Number(saleData.deliveryFee).toFixed(2)}</span>
    </div>
  ` : ""}
  
  <div class="center sep" style="letter-spacing:1px;margin:5px 0;">${"=".repeat(36)}</div>
  
  <div class="flex-between bold" style="font-size:15px;">
    <span>TOTAL:</span>
    <span>CHF ${Number(saleData.total || saleData.totalAmount).toFixed(2)}</span>
  </div>
  
  <div class="center sep" style="letter-spacing:1px;margin:5px 0;">${"=".repeat(36)}</div>
  
  <div class="flex-between">
    <span>${t("paymentMethod")}:</span>
    <span style="text-transform:uppercase;">${saleData.paymentMethod || "cash"}</span>
  </div>
  ${saleData.paymentMethod === "cash" ? `
    <div class="flex-between">
      <span>${t("cash")}:</span>
      <span>CHF ${Number(saleData.cashReceived || 0).toFixed(2)}</span>
    </div>
    <div class="flex-between">
      <span>${t("change")}:</span>
      <span>CHF ${Number(saleData.change || 0).toFixed(2)}</span>
    </div>
  ` : ""}
  
  ${qrHtml}
  ` : ""}
  
  <div class="center bold" style="margin-top:14px;font-size:13px;">${isKitchen ? "KÜCHENBON" : t("thankYou")}</div>
  ${!isKitchen && storeAddr ? `<div class="center" style="font-size:10px;margin-top:2px;">${t("visitUs")}: ${storeAddr}</div>` : ""}
  <div class="center" style="font-size:9px;color:#999;margin-top:6px;">${t("poweredBy")}</div>
  <div class="center sep" style="margin-top:6px;overflow:hidden;white-space:nowrap;">${"=".repeat(36)}</div>
`;

    if (isPartial) return innerContent;

    return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <style>
    @page { margin: 0; }
    body { font-family: 'Courier New', monospace; font-size: 11px; width: 300px; margin: 0 auto; color: #000; background: #fff; padding: 15px; line-height: 1.2; }
    .center { text-align: center; }
    .bold { font-weight: 800; }
    .sep { letter-spacing: 1px; margin: 5px 0; overflow: hidden; white-space: nowrap; }
    .flex-between { display: flex; justify-content: space-between; padding: 2px 0; }
    .page-break { page-break-after: always; }
  </style>
</head>
<body>
  ${innerContent}
</body>
</html>`;
  };

  const loadInvoiceDetails = async (saleId: number) => {
    try {
      const res = await apiRequest("GET", `/api/sales/${saleId}`);
      const data = await res.json();
      setSelectedInvoice(data);
      if (Platform.OS === "web") {
        try {
          const QRCode = require("qrcode");
          const url = await QRCode.toDataURL(`barmagly:receipt:${data.receiptNumber || data.id}`, { width: 200, margin: 1, color: { dark: "#0A0E27", light: "#FFFFFF" } });
          setReprintQrDataUrl(url);
        } catch { }
      }
      setShowReprintReceipt(true);
    } catch {
      Alert.alert(t("error"), t("saleNotFound"));
    }
  };

  const printReceipt = () => {
    if (!selectedInvoice) return;
    if (Platform.OS !== "web") {
      const inv = selectedInvoice;
      const itemsText = (inv.items || []).map((item: any) =>
        `${item.productName || item.name}  x${item.quantity}  CHF ${Number(item.total || (item.unitPrice * item.quantity)).toFixed(2)}`
      ).join("\n");
      const receiptText = `${storeSettings?.name || tenant?.name || "POS System"}\n${storeSettings?.address || ""}\n${"─".repeat(30)}\n${t("receiptNumber")}: ${inv.receiptNumber || "#" + inv.id}\n${t("receiptDate")}: ${new Date(inv.createdAt || inv.date).toLocaleString()}\n${"─".repeat(30)}\n${itemsText}\n${"─".repeat(30)}\nTOTAL: CHF ${Number(inv.totalAmount).toFixed(2)}\n${t("paymentMethod")}: ${(inv.paymentMethod || "cash").toUpperCase()}\n${"═".repeat(30)}\n${t("thankYou")}`;
      Alert.alert(t("printInvoice"), receiptText);
      return;
    }
    if (Platform.OS === "web" && selectedInvoice) {
      const printWindow = window.open("", "_blank", "width=400,height=600");
      if (printWindow) {
        const html = generateThermalReceiptHTML(selectedInvoice, reprintQrDataUrl);
        printWindow.document.write(html);
        printWindow.document.close();
        // Wait for potential images to load
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
        }, 500);
      }
    }
  };

  const isPizzaProduct = useCallback((product: any) => {
    if (!product) return false;
    const name = (product.name || "").toLowerCase();
    const catName = (categories as any[]).find((c: any) => c.id === product.categoryId)?.name?.toLowerCase() || "";
    return name.includes("pizza") || catName.includes("pizza");
  }, [categories]);

  useEffect(() => {
    if (storeSettings?.taxRate !== undefined) {
      cart.setTaxRate(Number(storeSettings.taxRate) || 0);
    }
    if (storeSettings?.commissionRate !== undefined) {
      cart.setServiceFeeRate(Number(storeSettings.commissionRate) || 0);
    }
  }, [storeSettings?.taxRate, storeSettings?.commissionRate]);

  useEffect(() => {
    if (cart.orderType === "delivery" && storeSettings?.deliveryFee) {
      cart.setDeliveryFee(Number(storeSettings.deliveryFee) || 0);
    } else {
      cart.setDeliveryFee(0);
    }
  }, [cart.orderType, storeSettings?.deliveryFee]);

  useEffect(() => {
    if (__DEV__) {
      apiRequest("POST", "/api/seed").catch(() => { });
    }

    // Redirect to onboarding if not completed
    if (tenant && tenant.setupCompleted === false) {
      router.replace("/onboarding" as any);
    }
  }, [tenant]);

  /* Removed local WebSocket logic in favor of global NotificationProvider */

  const filteredProducts = products.filter((p: any) => {
    const matchesCategory = selectedCategory
      ? (selectedCategory === MERGED_ALCOHOL_ID ? mergedAlcoholIds.includes(p.categoryId) : p.categoryId === selectedCategory)
      : true;
    const matchesSearch = search ? p.name.toLowerCase().includes(search.toLowerCase()) : true;
    return matchesCategory && matchesSearch;
  }).sort((a: any, b: any) => {
    const aCatIdx = tenantCategories.findIndex((c: any) => c.id === a.categoryId);
    const bCatIdx = tenantCategories.findIndex((c: any) => c.id === b.categoryId);
    if (aCatIdx === -1 && bCatIdx === -1) return 0;
    if (aCatIdx === -1) return 1;
    if (bCatIdx === -1) return -1;
    return aCatIdx - bCatIdx;
  });

  // Use caller's customer directly for immediate display; fall back to loaded customers list
  const selectedCustomer = customers.find((c: any) => c.id === cart.customerId)
    || (callerCustomer && callerCustomer.id === cart.customerId ? callerCustomer : null);

  const handlePhoneSearch = useCallback(async (phone: string) => {
    const trimmed = phone.trim();
    if (!trimmed) {
      cart.setCustomerId(null);
      return;
    }

    setCustomerPhoneLoading(true);
    try {
      const res = await apiRequest("GET", `/api/customers/phone-lookup?phone=${encodeURIComponent(trimmed)}&tenantId=${tenantId}`);
      if (res.ok) {
        const matches = await res.json();
        if (matches && matches.length > 0) {
          cart.setCustomerId(matches[0].id);
          setCallerCustomer(matches[0]);
          setCustomerPhoneLoading(false);
          return;
        }
      }
    } catch (err) {
      console.error("[phoneSearch] error looking up customer:", err);
    }
    setCustomerPhoneLoading(false);

    // Normalize for fuzzy matching: strip spaces, dashes, parens (fallback)
    const normalize = (p: string) => p.replace(/[\s\-().+]/g, "");
    const normTrimmed = normalize(trimmed);
    const found = (customers as any[]).find((c: any) =>
      c.phone && normalize(c.phone).includes(normTrimmed.slice(-8))
    );
    if (found) {
      cart.setCustomerId(found.id);
      setCallerCustomer(found);
    } else {
      setNewCustomerForm({ name: "", phone: trimmed, address: "", email: "" });
      setShowNewCustomerForm(true);
    }
  }, [customers, cart, tenantId]);

  const handleCreateCustomer = async () => {
    if (!newCustomerForm.name.trim()) return;
    setCustomerPhoneLoading(true);
    try {
      const res = await apiRequest("POST", "/api/customers", {
        tenantId,
        name: newCustomerForm.name.trim(),
        phone: newCustomerForm.phone.trim(),
        email: newCustomerForm.email.trim() || null,
        address: newCustomerForm.address.trim() || null,
      });
      const newCust = await res.json();
      qc.invalidateQueries({ queryKey: ["/api/customers"] });
      cart.setCustomerId(newCust.id);
      setPhoneInput(newCustomerForm.phone.trim());
      setShowNewCustomerForm(false);
    } catch (e: any) {
      Alert.alert(t("error"), e.message || "Failed to create customer");
    } finally {
      setCustomerPhoneLoading(false);
    }
  };

  const generateQR = async (text: string) => {
    try {
      if (Platform.OS === "web") {
        const QRCode = require("qrcode");
        const url = await QRCode.toDataURL(text, { width: 200, margin: 1, color: { dark: "#0A0E27", light: "#FFFFFF" } });
        setQrDataUrl(url);
      }
    } catch { }
  };

  const formatCardNumber = (text: string) => {
    const cleaned = text.replace(/\D/g, "").slice(0, 16);
    const groups = cleaned.match(/.{1,4}/g);
    return groups ? groups.join(" ") : cleaned;
  };

  const formatExpiry = (text: string) => {
    const cleaned = text.replace(/\D/g, "").slice(0, 4);
    if (cleaned.length >= 3) return cleaned.slice(0, 2) + "/" + cleaned.slice(2);
    return cleaned;
  };

  const isCardValid = () => {
    const num = cardNumber.replace(/\s/g, "");
    const [mm, yy] = cardExpiry.split("/");
    return num.length >= 15 && mm && yy && mm.length === 2 && yy.length >= 2 && cardCvc.length >= 3;
  };

  const autoPrint3Copies = (saleData: any, cartItems: typeof cart.items, cartSubtotal: number, cartTax: number, cartDiscount: number, cartServiceFee: number, cartTotal: number, cartDeliveryFee: number, pmMethod: string, cashAmt: number, custName: string, empName: string, custObj?: any) => {
    if (Platform.OS !== "web") return;
    const printWin = window.open("", "_blank", "width=400,height=600");
    if (!printWin) return;

    const fullSale = {
      ...saleData,
      items: cartItems.map(i => ({ productName: i.name, quantity: i.quantity, total: i.price * i.quantity })),
      subtotal: cartSubtotal,
      tax: cartTax,
      discount: cartDiscount,
      serviceFee: cartServiceFee,
      total: cartTotal,
      deliveryFee: cartDeliveryFee,
      paymentMethod: pmMethod,
      cashReceived: cashAmt,
      change: pmMethod === "cash" ? cashAmt - cartTotal : 0,
      customerName: custName,
      employeeName: empName,
    };

    const pmLabel = pmMethod === "cash" ? "BAR" : pmMethod === "card" ? "KARTE" : pmMethod.toUpperCase();
    const orderId = saleData?.id || "";
    const custAddress = custObj?.address || "";
    const mapsUrl = custAddress ? `https://maps.google.com/?q=${encodeURIComponent(custAddress)}` : "";

    // Generate QR for customer address map (async, build receipt after)
    const buildAndPrint = async () => {
      let printQrDataUrl: string | null = null;
      try {
        const QRCode = require("qrcode");
        const qrContent = mapsUrl || `barmagly:receipt:${saleData?.receiptNumber || saleData?.id}`;
        printQrDataUrl = await QRCode.toDataURL(qrContent, { width: 200, margin: 1, color: { dark: "#000000", light: "#ffffff" } });
      } catch { }

      const customerInner = generateThermalReceiptHTML(fullSale, printQrDataUrl, { title: "KUNDENBELEG", isPartial: true });
      const driverInner = generateThermalReceiptHTML(fullSale, null, { title: `FAHRERAUFTRAG #${orderId}`, isPartial: true });
      const kitchenInner = generateThermalReceiptHTML(fullSale, null, { isKitchen: true, isPartial: true });

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
            <span style="flex:1;font-style:italic;">${pmLabel}</span>
          </div>
        </div>`;

      const combinedHtml = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <title>Rechnung ${saleData?.receiptNumber || '#' + saleData?.id}</title>
  <style>
    @page { size: A4; margin: 15mm 20mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Courier New', monospace; font-size: 11px; color: #000; background: #fff; line-height: 1.3; }
    .receipt-unit { width: 300px; margin: 0 auto; padding: 12px 6px; page-break-after: always; }
    .receipt-unit:last-child { page-break-after: avoid; }
    .center { text-align: center; }
    .bold { font-weight: 800; }
    .sep { letter-spacing: 1px; margin: 5px 0; overflow: hidden; white-space: nowrap; }
    .flex-between { display: flex; justify-content: space-between; padding: 2px 0; }
  </style>
</head>
<body>
  <div class="receipt-unit">${customerInner}</div>
  <div class="receipt-unit">${driverInner}${driverFooter}</div>
  <div class="receipt-unit">${kitchenInner}</div>
</body>
</html>`;

      printWin.document.write(combinedHtml);
      printWin.document.close();
      setTimeout(() => {
        printWin.focus();
        printWin.print();
      }, 500);
    };

    buildAndPrint();
  };

  const completeSaleAfterPayment = (saleData: any) => {
    playAddSound();
    const saleItems = cart.items.map((i) => ({ name: i.name, quantity: i.quantity, price: i.price, total: i.price * i.quantity }));
    const custName = selectedCustomer?.name || t("walkIn");
    const empName = employee?.name || "Staff";
    const cashAmt = Number(cashReceived) || 0;
    // Auto-print 3 copies on web
    autoPrint3Copies(
      saleData, cart.items, cart.subtotal, cart.tax, cart.discount, cart.serviceFee, cart.total, cart.deliveryFee,
      paymentMethod, cashAmt, custName, empName, selectedCustomer
    );
    setLastSale({
      ...saleData,
      items: saleItems,
      subtotal: cart.subtotal,
      tax: cart.tax,
      serviceFee: cart.serviceFee,
      discount: cart.discount,
      deliveryFee: cart.deliveryFee,
      total: cart.total,
      paymentMethod,
      cashReceived: cashAmt,
      change: paymentMethod === "cash" && cashReceived ? cashAmt - cart.total : 0,
      customerName: custName,
      employeeName: empName,
      date: new Date().toLocaleString(),
    });
    const custAddress = selectedCustomer?.address || "";
    const qrContent = custAddress
      ? `https://maps.google.com/?q=${encodeURIComponent(custAddress)}`
      : `barmagly:receipt:${saleData.receiptNumber || saleData.id}`;
    generateQR(qrContent);
    cart.clearCart();
    setPhoneInput("");
    setCallerCustomer(null);
    setActiveCallId(null);
    setOrderNotes("");
    setShowCheckout(false);
    setCashReceived("");
    setCardNumber("");
    setCardExpiry("");
    setCardCvc("");
    setCardError("");
    setNfcStatus("waiting");
    setPaymentConfirmed(false);
    setShowReceipt(true);
    qc.invalidateQueries({ queryKey: ["/api/sales"] });
    qc.invalidateQueries({ queryKey: ["/api/dashboard"] });
    qc.invalidateQueries({ queryKey: ["/api/inventory"] });
    qc.invalidateQueries({ queryKey: ["/api/customers"] });
  };

  const createSale = async (pm: string, stripePaymentId: string | null) => {
    const saleItems = cart.items.map((i) => ({
      productId: i.productId,
      productName: i.name,
      quantity: i.quantity,
      unitPrice: i.price.toFixed(2),
      total: (i.price * i.quantity).toFixed(2),
      discount: "0",
    }));
    const data: any = {
      branchId: employee?.branchId || 1,
      employeeId: employee?.id || 1,
      customerId: cart.customerId,
      subtotal: cart.subtotal.toFixed(2),
      taxAmount: cart.tax.toFixed(2),
      serviceFeeAmount: cart.serviceFee.toFixed(2),
      discountAmount: cart.discount.toFixed(2),
      totalAmount: cart.total.toFixed(2),
      paymentMethod: pm,
      paymentStatus: "completed",
      status: "completed",
      tableNumber: cart.tableNumber || null,
      orderType: cart.orderType,
      changeAmount: paymentMethod === "cash" && cashReceived
        ? (Number(cashReceived) - cart.total).toFixed(2) : "0",
      items: saleItems,
      callId: activeCallId,
    };
    const notesParts = [];
    if (orderNotes.trim()) notesParts.push(orderNotes.trim());
    if (stripePaymentId) notesParts.push(`Stripe: ${stripePaymentId}`);
    if (notesParts.length > 0) data.notes = notesParts.join(" | ");
    const res = await apiRequest("POST", "/api/sales", data);
    return await res.json();
  };

  const validateBeforeComplete = (): string | null => {
    // Delivery order: customer must have phone and address
    if (cart.orderType === "delivery") {
      if (!cart.customerId) {
        return t("customerPhoneRequired" as any) || "Delivery requires customer phone number";
      }
      const cust = (customers as any[]).find((c: any) => c.id === cart.customerId);
      if (!cust?.phone) {
        return t("customerPhoneRequired" as any) || "Delivery requires customer phone number";
      }
      if (!cust?.address) {
        return t("customerAddressRequired" as any) || "Delivery requires customer address";
      }
    }
    // Non-cash: confirm payment received via external device
    if (paymentMethod !== "cash" && !paymentConfirmed) {
      return t("paymentNotConfirmed" as any) || "Please confirm payment has been received";
    }
    return null;
  };

  const endShiftMutation = useMutation({
    mutationFn: (id: number) => apiRequest("PUT", `/api/shifts/${id}/close`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [tenantId ? `/api/shifts?tenantId=${tenantId}` : "/api/shifts"] });
      setShowAccountSwitcher(false);
      Alert.alert("Success", "Shift ended successfully");
    },
    onError: (e: any) => Alert.alert("Error", e.message),
  });

  const startShiftAfterSwitchMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/shifts", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [tenantId ? `/api/shifts?tenantId=${tenantId}` : "/api/shifts"] });
      setShowSwitchShiftPrompt(false);
      setShowSwitchCashInput(false);
      setSwitchOpeningCash("");
      setSwitchedEmployee(null);
    },
    onError: (e: any) => Alert.alert("Error", e.message),
  });

  const saleMutation = useMutation({
    mutationFn: async () => {
      return await createSale(paymentMethod, null);
    },
    onSuccess: (saleData: any) => {
      completeSaleAfterPayment(saleData);
    },
    onError: (e: any) => {
      Alert.alert(t("error"), e.message || "Failed to complete sale");
    },
  });

  const handleAddToCart = useCallback((product: any) => {
    // Convert modifiers to variants if no explicit variants exist
    let enrichedProduct = product;
    if (
      (!product.variants || product.variants.length === 0) &&
      product.modifiers && Array.isArray(product.modifiers) && product.modifiers.length > 0
    ) {
      const sizeGroup = product.modifiers.find((m: any) => m.required === true);
      if (sizeGroup?.options?.length > 0) {
        const basePrice = Number(product.price);
        enrichedProduct = {
          ...product,
          variants: sizeGroup.options.map((opt: any) => ({
            name: opt.label,
            price: basePrice + Number(opt.price),
          })),
        };
      }
    }

    // If product has variants, show options modal (size selection + pizza toppings)
    if (enrichedProduct.variants && Array.isArray(enrichedProduct.variants) && enrichedProduct.variants.length > 0) {
      setSelectedProductForOptions(enrichedProduct);
      setShowToppingsStep(false);
      return;
    }
    // Pizza without variants: skip to toppings directly
    if (isPizzaProduct(product)) {
      setSelectedProductForOptions(product);
      setSelectedVariant(null);
      setSelectedToppings([]);
      setShowToppingsStep(true);
      return;
    }
    cart.addItem({ id: product.id, name: product.name, price: Number(product.price) });
    playAddSound();
    triggerFlash(product.id);
  }, [cart, isPizzaProduct, triggerFlash]);

  const handleBarcodeScan = useCallback(async (barcode: string) => {
    try {
      const res = await apiRequest("GET", `/api/products/barcode/${encodeURIComponent(barcode)}`);
      const product = await res.json();
      if (product && product.id) {
        cart.addItem({ id: product.id, name: product.name, price: Number(product.price) });
        playAddSound();
        setShowScanner(false);
        Alert.alert(t("success"), `${product.name} - ${t("itemAdded")}`);
      }
    } catch {
      Alert.alert(t("error"), t("noProductsFound"));
    }
  }, [cart]);

  const maxCashierDiscountPct = 10;
  const applyDiscount = () => {
    const val = Number(discountInput);
    if (isNaN(val) || val <= 0) return;
    let discountAmount = 0;
    if (discountType === "percent") {
      const pct = isCashier ? Math.min(val, maxCashierDiscountPct) : val;
      discountAmount = cart.subtotal * (pct / 100);
    } else {
      const maxFixed = isCashier ? cart.subtotal * (maxCashierDiscountPct / 100) : Infinity;
      discountAmount = Math.min(val, maxFixed);
    }
    cart.setDiscount(discountAmount);
    setShowDiscountModal(false);
    setDiscountInput("");
  };

  const topPad = Platform.OS === "web" ? 8 : 0;

  const handleSwitchAccount = async (pinCode: string) => {
    if (!switchTarget) return;
    setSwitchLoading(true);
    setSwitchError("");
    try {
      const res = await apiRequest("POST", "/api/employees/login", { pin: pinCode, employeeId: switchTarget.id });
      const emp = await res.json();
      cart.clearCart();
      login(emp);
      playClickSound("medium");
      setShowAccountSwitcher(false);
      setSwitchTarget(null);
      setSwitchPin("");
      qc.invalidateQueries();
      // Check if new user has an active shift
      try {
        const shiftRes = await apiRequest("GET", `/api/shifts/active/${emp.id}`);
        const activeShift = await shiftRes.json();
        if (!activeShift) {
          setSwitchedEmployee(emp);
          setShowSwitchShiftPrompt(true);
        }
      } catch {
        // ignore shift check errors
      }
    } catch {
      setSwitchError(t("invalidPin" as any) || "Invalid PIN");
      setSwitchPin("");
      playClickSound("light");
    } finally {
      setSwitchLoading(false);
    }
  };

  const handleEndOfDay = async () => {
    const confirmed = await new Promise((resolve) => {
      if (Platform.OS === "web") {
        resolve(window.confirm(t("confirmEndOfDay")));
      } else {
        Alert.alert(t("endOfDay"), t("confirmEndOfDay"), [
          { text: t("cancel"), onPress: () => resolve(false), style: "cancel" },
          { text: t("yes"), onPress: () => resolve(true) }
        ]);
      }
    });

    if (!confirmed) return;

    try {
      setEndOfDayLoading(true);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const res = await apiRequest("GET", `/api/sales?tenantId=${tenantId}&limit=200`);
      const allSales = await res.json();
      const todaySalesSummaries = allSales.filter((s: any) => new Date(s.createdAt || s.date) >= today);

      if (todaySalesSummaries.length > 0) {
        const fullSales = [];
        for (const s of todaySalesSummaries) {
          try {
            const fullRes = await apiRequest("GET", `/api/sales/${s.id}`);
            fullSales.push(await fullRes.json());
          } catch { }
        }

        if (Platform.OS === "web") {
          const printWindow = window.open("", "_blank", "width=380,height=600");
          if (printWindow) {
            const combinedHtml = fullSales.map((inv, index) => {
              const html = generateThermalReceiptHTML(inv, null, { isPartial: true });
              return `
                <div class="receipt-unit">
                  ${html}
                </div>
                ${index < fullSales.length - 1 ? '<div class="page-break"></div>' : ''}
              `;
            }).join("");

            printWindow.document.write(`
<!DOCTYPE html>
<html>
<head>
  <title>Daily Invoices</title>
  <style>
    @page { margin: 0; }
    body { font-family: 'Courier New', monospace; font-size: 11px; width: 300px; margin: 0 auto; color: #000; background: #fff; padding: 15px; line-height: 1.2; }
    .center { text-align: center; }
    .bold { font-weight: 800; }
    .sep { letter-spacing: 1px; margin: 5px 0; overflow: hidden; white-space: nowrap; }
    .flex-between { display: flex; justify-content: space-between; padding: 2px 0; }
    .page-break { page-break-after: always; }
  </style>
</head>
<body>
  ${combinedHtml}
</body>
</html>`);
            printWindow.document.close();
            setTimeout(() => {
              printWindow.focus();
              printWindow.print();
            }, 500);
          }
        } else {
          Alert.alert(t("success"), `Sent ${fullSales.length} invoices to printer queue.`);
        }
      } else {
        Alert.alert(t("info" as any), t("noInvoicesToday" as any));
      }

      // Close active shift for this employee
      const shiftRes = await apiRequest("GET", `/api/shifts/active?tenantId=${tenantId}`);
      const activeShifts = await shiftRes.json();
      const myShift = activeShifts.find((s: any) => s.employeeId === employee?.id);
      if (myShift) {
        await apiRequest("PUT", `/api/shifts/${myShift.id}/close`, { closingCash: "0", totalSales: "0", totalTransactions: 0 });
        qc.invalidateQueries({ queryKey: ["/api/shifts"] });
      }

      Alert.alert(t("success"), t("endOfDaySuccess"));
      qc.invalidateQueries();
    } catch (err: any) {
      Alert.alert(t("error"), err.message);
    } finally {
      setEndOfDayLoading(false);
    }
  };

  const handleSwitchPinPress = (digit: string) => {
    if (switchPin.length < 4) {
      playClickSound("light");
      const newPin = switchPin + digit;
      setSwitchPin(newPin);
      if (newPin.length === 4) {
        handleSwitchAccount(newPin);
      }
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + topPad, direction: isRTL ? "rtl" : "ltr" }]}>
      <View style={styles.header}>
        <LinearGradient colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.headerGradient}>
          <View style={[styles.headerContent, isRTL && { flexDirection: "row-reverse" }]}>
            <Text style={[styles.headerTitle, rtlTextAlign]}>Barmagly POS</Text>
            <View style={[styles.headerRight, isRTL && { flexDirection: "row-reverse", alignItems: "center" }, { alignItems: "center" }]}>
              <RealTimeClock />
              <Pressable onPress={() => setShowCallHistory(true)} style={[styles.headerInvoiceBtn, { position: "relative" }]}>
                <Ionicons name="call-outline" size={20} color={Colors.white} />
                <Text style={styles.headerInvoiceLabel}>{language === "ar" ? "مكالمات" : language === "de" ? "Anrufe" : "Calls"}</Text>
                {incomingCalls.length > 0 && (
                  <View style={{ position: "absolute", top: -2, right: -2, width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.danger }} />
                )}
              </Pressable>
              <Pressable onPress={() => setShowOnlineOrders(true)} style={[styles.headerInvoiceBtn, { position: "relative" }]}>
                <Ionicons name="globe-outline" size={20} color={Colors.white} />
                <Text style={styles.headerInvoiceLabel}>{language === "ar" ? "طلبات" : language === "de" ? "Online" : "Orders"}</Text>
                {onlineOrderNotification && (
                  <View style={{ position: "absolute", top: -2, right: -2, width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.danger }} />
                )}
              </Pressable>
              <Pressable onPress={handleEndOfDay} style={styles.headerInvoiceBtn} disabled={endOfDayLoading}>
                <Ionicons name="power-outline" size={20} color={endOfDayLoading ? Colors.textMuted : Colors.danger} />
                <Text style={[styles.headerInvoiceLabel, { color: endOfDayLoading ? Colors.textMuted : Colors.danger }]}>{t("endOfDay")}</Text>
              </Pressable>
              <Pressable onPress={() => setShowInvoiceHistory(true)} style={styles.headerInvoiceBtn}>
                <Ionicons name="receipt-outline" size={20} color={Colors.white} />
                <Text style={styles.headerInvoiceLabel}>{t("invoices")}</Text>
              </Pressable>
              {employee && (
                <Pressable onPress={() => setShowAccountSwitcher(true)} style={styles.headerAvatarBtn}>
                  <LinearGradient colors={[Colors.accent, Colors.gradientStart]} style={styles.headerAvatarCircle}>
                    <Text style={styles.headerAvatarText}>{employee.name.charAt(0).toUpperCase()}</Text>
                  </LinearGradient>
                </Pressable>
              )}
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* ── Phone / Customer Bar ── */}
      <View style={[styles.phoneBar, isRTL && { flexDirection: "row-reverse" }]}>
        <View style={[styles.phoneBarInputWrap, isRTL && { flexDirection: "row-reverse" }, selectedCustomer && { flex: 0, minWidth: 160, maxWidth: 200 }]}>
          <Ionicons name="call-outline" size={16} color={selectedCustomer ? Colors.accent : Colors.textMuted} />
          <TextInput
            style={[styles.phoneBarInput, isRTL && { textAlign: "right" }]}
            placeholder={language === "ar" ? "رقم الهاتف..." : language === "de" ? "Telefonnummer..." : "Phone number..."}
            placeholderTextColor={Colors.textMuted}
            value={phoneInput}
            onChangeText={(v) => {
              setPhoneInput(v);
              if (!v.trim()) cart.setCustomerId(null);
            }}
            onSubmitEditing={() => handlePhoneSearch(phoneInput)}
            onBlur={() => { if (phoneInput.trim()) handlePhoneSearch(phoneInput); }}
            keyboardType="phone-pad"
            returnKeyType="search"
          />
          {customerPhoneLoading && (
            <Ionicons name="sync" size={14} color={Colors.textMuted} />
          )}
          {phoneInput ? (
            <Pressable onPress={() => { setPhoneInput(""); cart.setCustomerId(null); setCallerCustomer(null); }}>
              <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
            </Pressable>
          ) : null}
        </View>

        {selectedCustomer ? (
          <Pressable
            style={[styles.phoneBarCustomer, isRTL && { flexDirection: "row-reverse" }]}
            onPress={() => setShowCustomerPicker(true)}
          >
            <View style={styles.phoneBarAvatar}>
              <Text style={styles.phoneBarAvatarText}>{selectedCustomer.name.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={[styles.phoneBarCustomerInfo, isRTL && { alignItems: "flex-end" }]}>
              <Text style={styles.phoneBarCustomerName} numberOfLines={1}>{selectedCustomer.name}</Text>
              <View style={[styles.phoneBarCustomerMeta, isRTL && { flexDirection: "row-reverse" }]}>
                {selectedCustomer.phone && <Text style={styles.phoneBarMetaText}>{selectedCustomer.phone}</Text>}
                {selectedCustomer.address && <Text style={styles.phoneBarMetaDot}>·</Text>}
                {selectedCustomer.address && <Text style={styles.phoneBarMetaText} numberOfLines={1}>{selectedCustomer.address}</Text>}
              </View>
              {selectedCustomer.email && <Text style={[styles.phoneBarMetaText, { color: Colors.info }]} numberOfLines={1}>{selectedCustomer.email}</Text>}
            </View>
            <Pressable onPress={() => { cart.setCustomerId(null); setPhoneInput(""); setCallerCustomer(null); }} style={styles.phoneBarClear}>
              <Ionicons name="close" size={14} color={Colors.textMuted} />
            </Pressable>
          </Pressable>
        ) : (
          <Pressable style={styles.phoneBarWalkIn} onPress={() => setShowCustomerPicker(true)}>
            <Ionicons name="person-add-outline" size={14} color={Colors.textMuted} />
            <Text style={styles.phoneBarWalkInText}>{t("selectCustomer")}</Text>
          </Pressable>
        )}
      </View>

      {incomingCalls.length > 0 && (
        <View style={styles.callNotification}>
          {incomingCalls.length > 1 && (
            <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingTop: 6, paddingBottom: 2 }}>
              <Text style={{ color: Colors.white, fontSize: 11, fontWeight: "700", opacity: 0.9 }}>
                {t("callQueue" as any)} — {incomingCalls.length} {t("callsWaiting" as any)}
              </Text>
              <Pressable
                onPress={() => { incomingCalls.forEach(c => handleDismissCall(c.id, c.slot)); }}
                style={{ paddingHorizontal: 10, paddingVertical: 3, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 8 }}
              >
                <Text style={{ color: Colors.white, fontSize: 11, fontWeight: "600" }}>{t("dismissAll" as any)}</Text>
              </Pressable>
            </View>
          )}
          {incomingCalls.map((call, idx) => (
            <LinearGradient
              key={call.id || idx}
              colors={idx === 0 ? [Colors.accent, Colors.gradientMid] : ["#1E3A5F", "#2A4A7F"]}
              style={[styles.callGradient, isRTL && { flexDirection: "row-reverse" }, idx > 0 && { marginTop: 2, opacity: 0.9 }]}
            >
              <View style={styles.callIconWrap}>
                <Ionicons name="call" size={idx === 0 ? 24 : 18} color={Colors.white} />
                {incomingCalls.length > 1 && (
                  <Text style={{ color: Colors.white, fontSize: 9, fontWeight: "800", position: "absolute", bottom: -2, right: -2 }}>
                    {t("callSlot" as any)}{call.slot}
                  </Text>
                )}
              </View>
              <View style={[styles.callInfo, isRTL && { alignItems: "flex-end" }, { flex: 1 }]}>
                {call.customer ? (
                  <>
                    <Text style={[styles.callNumber, idx > 0 && { fontSize: 12 }]}>{call.phoneNumber}</Text>
                    <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 4, marginTop: 2 }}>
                      <Ionicons name="person-circle" size={13} color="rgba(255,255,255,0.95)" />
                      <Text style={[styles.callCustomer, { fontSize: idx === 0 ? 14 : 11, fontWeight: "700" }]}>
                        {call.customer.name}
                      </Text>
                    </View>
                    {call.customer.address ? (
                      <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 10, marginTop: 1 }} numberOfLines={1}>
                        {call.customer.address}
                      </Text>
                    ) : null}
                    {call.customer.visitCount ? (
                      <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 10, marginTop: 1 }}>
                        {language === "ar" ? `${call.customer.visitCount} زيارة` : language === "de" ? `${call.customer.visitCount} Besuche` : `${call.customer.visitCount} visits`}
                        {call.customer.totalSpent ? ` · CHF ${Number(call.customer.totalSpent).toFixed(0)}` : ""}
                      </Text>
                    ) : null}
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 3, marginTop: 2 }}>
                      <Ionicons name="checkmark-circle" size={11} color="rgba(255,255,255,0.85)" />
                      <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 10, fontWeight: "600" }}>
                        {language === "ar" ? "أُضيف للفاتورة" : language === "de" ? "Zur Rechnung hinzugefügt" : "Added to invoice"}
                      </Text>
                    </View>
                  </>
                ) : (
                  <>
                    <Text style={[styles.callNumber, idx > 0 && { fontSize: 13 }]}>{call.phoneNumber}</Text>
                    <Text style={[styles.callCustomer, idx > 0 && { fontSize: 11 }, { opacity: 0.8 }]}>
                      {language === "ar" ? "عميل غير معروف · الرقم في السلة" : language === "de" ? "Unbekannt · Nummer im Warenkorb" : "Unknown · Number added to cart"}
                    </Text>
                  </>
                )}
              </View>
              <View style={{ flexDirection: "row", gap: 6 }}>
                <Pressable
                  style={[styles.callActionBtn, { backgroundColor: "rgba(255,255,255,0.25)" }]}
                  onPress={() => {
                    if (call.customer) {
                      // Known customer: ensure assigned to cart immediately
                      cart.setCustomerId(call.customer.id);
                      setCallerCustomer(call.customer);
                      setPhoneInput(call.customer.phone || call.phoneNumber);
                      handleDismissCall(call.id, call.slot);
                    } else {
                      // Unknown caller: silent lookup — assign if found, pre-fill if not (no new-customer form)
                      handleDismissCall(call.id, call.slot);
                      if (tenantId) {
                        apiRequest("GET", `/api/customers/phone-lookup?phone=${encodeURIComponent(call.phoneNumber)}&tenantId=${tenantId}`)
                          .then(res => res.ok ? res.json() : [])
                          .then((matches: any[]) => {
                            if (matches && matches.length > 0) {
                              const found = matches[0];
                              cart.setCustomerId(found.id);
                              setCallerCustomer(found);
                              setPhoneInput(found.phone || call.phoneNumber);
                            } else {
                              setPhoneInput(call.phoneNumber);
                            }
                          })
                          .catch(() => { setPhoneInput(call.phoneNumber); });
                      } else {
                        setPhoneInput(call.phoneNumber);
                      }
                    }
                  }}
                >
                  <Ionicons name="checkmark" size={18} color={Colors.white} />
                </Pressable>
                <Pressable
                  style={[styles.callActionBtn, { backgroundColor: Colors.danger }]}
                  onPress={() => {
                    // Undo: clear the caller from the cart
                    cart.setCustomerId(null);
                    setPhoneInput("");
                    setCallerCustomer(null);
                    handleDismissCall(call.id, call.slot);
                  }}
                >
                  <Ionicons name="close" size={18} color={Colors.white} />
                </Pressable>
              </View>
            </LinearGradient>
          ))}
        </View>
      )}

      <View style={[styles.mainContent, { flexDirection: isTablet ? (leftHandMode ? (isRTL ? "row" : "row-reverse") : (isRTL ? "row-reverse" : "row")) : "column" }]}>
        <View style={[styles.productsSection, isTablet && styles.productsSectionTablet]}>
          <View style={[styles.searchRow, { flexDirection: isRTL ? "row-reverse" : "row", gap: 8, alignItems: "center" }]}>
            <View style={[styles.searchBox, { flex: 1 }, isRTL && { flexDirection: "row-reverse" }]}>
              <Ionicons name="search" size={18} color={Colors.textMuted} />
              <TextInput
                style={[styles.searchInput, isRTL ? { marginRight: 8, marginLeft: 0 } : null, rtlTextAlign]}
                placeholder={t("search") + "..."}
                placeholderTextColor={Colors.textMuted}
                value={search}
                onChangeText={setSearch}
              />
              {search ? (
                <Pressable onPress={() => setSearch("")}>
                  <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
                </Pressable>
              ) : null}
            </View>
            <Pressable style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: Colors.accent, justifyContent: "center", alignItems: "center" }} onPress={() => setShowScanner(true)}>
              <Ionicons name="barcode-outline" size={22} color={Colors.textDark} />
            </Pressable>
          </View>

          <View style={styles.categoriesGrid}>
            {/* ALL chip */}
            <Pressable
              style={[styles.catChip, !selectedCategory && styles.catChipActive]}
              onPress={() => { playClickSound("light"); setSelectedCategory(null); }}
            >
              {!selectedCategory ? (
                <LinearGradient colors={[Colors.gradientStart, Colors.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.catChipGrad}>
                  <Ionicons name="grid" size={19} color={Colors.white} />
                  <Text style={[styles.catChipText, { color: Colors.white }]}>{t("allCategories")}</Text>
                </LinearGradient>
              ) : (
                <View style={styles.catChipGrad}>
                  <Ionicons name="grid" size={19} color={Colors.accent} />
                  <Text style={styles.catChipText}>{t("allCategories")}</Text>
                </View>
              )}
            </Pressable>
            {displayCategories.map((cat: any) => {
              const isActive = selectedCategory === cat.id;
              const iconName = (cat.icon || "cube") as keyof typeof Ionicons.glyphMap;
              const color = cat.color || Colors.accent;
              return (
                <Pressable
                  key={cat.id}
                  style={[styles.catChip, isActive && { borderColor: color, backgroundColor: `${color}22` }]}
                  onPress={() => { playClickSound("light"); setSelectedCategory(isActive ? null : cat.id); }}
                >
                  <View style={styles.catChipGrad}>
                    <View style={[styles.catDot, { backgroundColor: color }]} />
                    <Ionicons name={iconName} size={19} color={isActive ? color : Colors.textSecondary} />
                    <Text style={[styles.catChipText, isActive && { color, fontWeight: "700" }]}>{cat.name}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          <FlatList
            data={filteredProducts}
            numColumns={isTablet ? 3 : 2}
            key={isTablet ? "tablet3" : "phone2"}
            keyExtractor={(item: any) => String(item.id)}
            contentContainerStyle={styles.productGrid}
            scrollEnabled={!!filteredProducts.length}
            renderItem={({ item }: { item: any }) => {
              const cat = categories.find((c: any) => c.id === item.categoryId);
              const catColor = cat?.color || Colors.accent;
              const catIcon = (cat?.icon || "cube") as keyof typeof Ionicons.glyphMap;
              const cartQty = cart.items.find((i: any) => i.id === item.id || i.productId === item.id)?.quantity || 0;
              const isJustAdded = lastAddedId === item.id;
              return (
                <Pressable
                  style={({ pressed }) => [styles.productCard, pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] }]}
                  onPress={() => handleAddToCart(item)}
                >
                  {isJustAdded && (
                    <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: catColor, opacity: flashAnim, borderRadius: 16 }]} />
                  )}
                  <View style={[styles.productCardTopBorder, { backgroundColor: catColor }]} />
                  <View style={[styles.productIcon, { backgroundColor: `${catColor}22` }]}>
                    {item.image ? (
                      <AnimatedProductImage uri={item.image.startsWith("http") || item.image.startsWith("file://") || item.image.startsWith("data:") ? item.image : `${getApiUrl().replace(/\/$/, "")}${item.image}`} />
                    ) : (
                      <Ionicons name={catIcon} size={26} color={catColor} />
                    )}
                  </View>
                  <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
                  <Text style={[styles.productPrice, { color: catColor }]}>CHF {Number(item.price).toFixed(2)}</Text>
                  {tenant?.storeType !== "restaurant" && item.trackInventory && (
                    <Text style={[styles.barcodeText, { color: Colors.textSecondary }]}>Stock: {item.quantity || 0}</Text>
                  )}
                  {item.barcode ? <Text style={styles.barcodeText}>{item.barcode}</Text> : null}
                  {cartQty > 0 ? (
                    <View style={[styles.productCartBadge, { backgroundColor: catColor }]}>
                      <Text style={styles.productCartBadgeText}>{cartQty}</Text>
                    </View>
                  ) : (
                    <View style={[styles.productAddBadge, { backgroundColor: `${catColor}22` }]}>
                      <Ionicons name="add" size={14} color={catColor} />
                    </View>
                  )}
                </Pressable>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="search" size={48} color={Colors.textMuted} />
                <Text style={[styles.emptyText, rtlTextAlign]}>{t("noProductsFound")}</Text>
              </View>
            }
          />
        </View>

        <View style={[styles.cartSection, isTablet && styles.cartSectionTablet, isTablet && isRTL && { borderLeftWidth: 0, borderRightWidth: 1, borderColor: Colors.cardBorder }]}>
          <View style={[styles.cartHeader, isRTL && { flexDirection: "row-reverse" }]}>
            <Text style={[styles.cartTitle, rtlTextAlign]}>{t("cart")} ({cart.itemCount})</Text>
            <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 10 }}>
              {/* SPEZIF notes button - always visible */}
              <Pressable
                onPress={() => setShowOrderNotes(true)}
                style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: orderNotes ? Colors.warning + "22" : Colors.surfaceLight, borderWidth: 1, borderColor: orderNotes ? Colors.warning : Colors.cardBorder }}
              >
                <Ionicons name="create-outline" size={16} color={orderNotes ? Colors.warning : Colors.textMuted} />
                <Text style={{ fontSize: 11, fontWeight: "700", color: orderNotes ? Colors.warning : Colors.textMuted }}>
                  {language === "ar" ? "ملاحظة" : language === "de" ? "SPEZIF" : "NOTES"}
                </Text>
              </Pressable>
              {cart.items.length > 0 && (
                <>
                  <Pressable onPress={() => setShowDiscountModal(true)}>
                    <Ionicons name="pricetag" size={20} color={Colors.success} />
                  </Pressable>
                  <Pressable onPress={() => cart.clearCart()}>
                    <Ionicons name="trash" size={20} color={Colors.danger} />
                  </Pressable>
                </>
              )}
            </View>
          </View>

          {selectedCustomer ? (
            <View style={[styles.cartCustomerCard, isRTL && { flexDirection: "row-reverse" }]}>
              <LinearGradient colors={[Colors.primary, Colors.secondary]} style={styles.cartCustomerAvatar}>
                <Text style={styles.cartCustomerAvatarText}>{selectedCustomer.name.charAt(0).toUpperCase()}</Text>
              </LinearGradient>
              <View style={[styles.cartCustomerBody, isRTL && { alignItems: "flex-end" }]}>
                <Text style={[styles.cartCustomerName, rtlTextAlign]} numberOfLines={1}>{selectedCustomer.name}</Text>
                <View style={[styles.cartCustomerRow, isRTL && { flexDirection: "row-reverse" }]}>
                  {selectedCustomer.phone && (
                    <View style={[styles.cartCustomerChip, isRTL && { flexDirection: "row-reverse" }]}>
                      <Ionicons name="call-outline" size={10} color={Colors.accent} />
                      <Text style={styles.cartCustomerChipText}>{selectedCustomer.phone}</Text>
                    </View>
                  )}
                  {selectedCustomer.email && (
                    <View style={[styles.cartCustomerChip, isRTL && { flexDirection: "row-reverse" }]}>
                      <Ionicons name="mail-outline" size={10} color={Colors.info} />
                      <Text style={styles.cartCustomerChipText}>{selectedCustomer.email}</Text>
                    </View>
                  )}
                </View>
                {selectedCustomer.address && (
                  <View style={[styles.cartCustomerChip, { marginTop: 2 }, isRTL && { flexDirection: "row-reverse" }]}>
                    <Ionicons name="location-outline" size={10} color={Colors.warning} />
                    <Text style={styles.cartCustomerChipText} numberOfLines={1}>{selectedCustomer.address}</Text>
                  </View>
                )}
              </View>
              <Pressable onPress={() => { cart.setCustomerId(null); setPhoneInput(""); }} style={styles.cartCustomerClear}>
                <Ionicons name="close-circle" size={26} color={Colors.danger} />
              </Pressable>
            </View>
          ) : (
            <Pressable style={[styles.customerSelect, isRTL && { flexDirection: "row-reverse" }]} onPress={() => setShowCustomerPicker(true)}>
              <Ionicons name="person" size={16} color={Colors.textMuted} />
              <Text style={[styles.customerSelectText, rtlTextAlign]}>
                {`${t("selectCustomer")}(${t("walkIn")})`}
              </Text>
              <Ionicons name={isRTL ? "chevron-back" : "chevron-down"} size={14} color={Colors.textMuted} />
            </Pressable>
          )}

          {/* Show order notes badge if set */}
          {orderNotes.trim() !== "" && (
            <Pressable
              onPress={() => setShowOrderNotes(true)}
              style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 6, backgroundColor: Colors.warning + "18", borderWidth: 1, borderColor: Colors.warning + "44", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, marginHorizontal: 10, marginBottom: 6 }}
            >
              <Ionicons name="create-outline" size={14} color={Colors.warning} />
              <Text style={{ color: Colors.warning, fontSize: 12, fontWeight: "700", flex: 1 }} numberOfLines={1}>{orderNotes}</Text>
              <Ionicons name="pencil" size={12} color={Colors.warning} />
            </Pressable>
          )}

          <FlatList
            data={cart.items}
            keyExtractor={(item) => String(item.productId)}
            scrollEnabled={!!cart.items.length}
            style={styles.cartList}
            renderItem={({ item, index }) => (
              <View style={[styles.cartItem, isRTL && { flexDirection: "row-reverse" }]}>
                {/* Index badge */}
                <View style={styles.cartItemIndexBadge}>
                  <Text style={styles.cartItemIndexText}>{index + 1}</Text>
                </View>
                <View style={styles.cartItemInfo}>
                  <Text style={[styles.cartItemName, rtlTextAlign]} numberOfLines={1}>{item.name}</Text>
                  <Text style={[styles.cartItemUnit, rtlTextAlign]}>CHF {Number(item.price).toFixed(2)} × {item.quantity}</Text>
                </View>
                <View style={[styles.cartItemActions, isRTL && { flexDirection: "row-reverse" }]}>
                  <Pressable
                    style={[styles.qtyBtn, item.quantity === 1 && { backgroundColor: `${Colors.danger}22`, borderColor: Colors.danger }]}
                    onPress={() => { cart.updateQuantity(item.id, item.quantity - 1); playClickSound("light"); }}
                  >
                    <Ionicons name={item.quantity === 1 ? "trash-outline" : "remove"} size={14} color={item.quantity === 1 ? Colors.danger : Colors.text} />
                  </Pressable>
                  <View style={styles.qtyBadge}>
                    <Text style={styles.qtyText}>{item.quantity}</Text>
                  </View>
                  <Pressable
                    style={[styles.qtyBtn, { backgroundColor: `${Colors.accent}22`, borderColor: Colors.accent }]}
                    onPress={() => { cart.updateQuantity(item.id, item.quantity + 1); playClickSound("light"); }}
                  >
                    <Ionicons name="add" size={14} color={Colors.accent} />
                  </Pressable>
                  <Text style={styles.cartItemTotal}>CHF {(item.price * item.quantity).toFixed(2)}</Text>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.cartEmpty}>
                <Ionicons name="cart-outline" size={44} color={Colors.textMuted} />
                <Text style={styles.cartEmptyText}>{t("emptyCart")}</Text>
                <Text style={styles.cartEmptySubtext}>{t("addToCart")}</Text>
              </View>
            }
          />

          <View style={styles.cartSummary}>
            <View style={[styles.summaryRow, isRTL && { flexDirection: "row-reverse" }]}>
              <Text style={[styles.summaryLabel, rtlTextAlign]}>{t("subtotal")}</Text>
              <Text style={[styles.summaryValue, rtlTextAlign]}>CHF {cart.subtotal.toFixed(2)}</Text>
            </View>
            {cart.discount > 0 && (
              <View style={[styles.summaryRow, isRTL && { flexDirection: "row-reverse" }]}>
                <Text style={[styles.summaryLabel, { color: Colors.success }, rtlTextAlign]}>{t("discount")}</Text>
                <Text style={[styles.summaryValue, { color: Colors.success }, rtlTextAlign]}>-CHF {cart.discount.toFixed(2)}</Text>
              </View>
            )}
            {cart.serviceFee > 0 && (
              <View style={[styles.summaryRow, isRTL && { flexDirection: "row-reverse" }]}>
                <Text style={[styles.summaryLabel, rtlTextAlign]}>{t("serviceTax" as any) || "Service Tax"} ({cart.serviceFeeRate}%)</Text>
                <Text style={[styles.summaryValue, rtlTextAlign]}>CHF {cart.serviceFee.toFixed(2)}</Text>
              </View>
            )}
            <View style={[styles.summaryRow, isRTL && { flexDirection: "row-reverse" }]}>
              <Text style={[styles.summaryLabel, rtlTextAlign]}>{t("tax")} ({cart.taxRate}%)</Text>
              <Text style={[styles.summaryValue, rtlTextAlign]}>CHF {cart.tax.toFixed(2)}</Text>
            </View>
            <View style={[styles.summaryRow, styles.totalRow, isRTL && { flexDirection: "row-reverse" }]}>
              <Text style={[styles.totalLabel, rtlTextAlign]}>{t("total")}</Text>
              <Text style={[styles.totalValue, rtlTextAlign]}>CHF {cart.total.toFixed(2)}</Text>
            </View>
          </View>

          <Animated.View style={{ transform: [{ scale: checkoutPulse }] }}>
            <Pressable
              style={[styles.checkoutBtn, !cart.items.length && styles.checkoutBtnDisabled]}
              onPress={() => { if (cart.items.length > 0) { playClickSound("heavy"); setPaymentConfirmed(false); setShowCheckout(true); } }}
              disabled={!cart.items.length}
            >
              <LinearGradient
                colors={cart.items.length > 0 ? [Colors.gradientStart, Colors.gradientMid, Colors.accent] : ["#333", "#444", "#555"]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.checkoutBtnGradient}
              >
                <View style={[styles.checkoutBtnInner, isRTL && { flexDirection: "row-reverse" }]}>
                  <View style={[styles.checkoutBtnLeft, isRTL && { flexDirection: "row-reverse" }]}>
                    <Ionicons name="bag-check" size={20} color={Colors.white} />
                    <Text style={styles.checkoutBtnText}>{t("checkout")}</Text>
                  </View>
                  <View style={styles.checkoutBtnPrice}>
                    <Text style={styles.checkoutBtnPriceText}>CHF {cart.total.toFixed(2)}</Text>
                    {cart.items.length > 0 && (
                      <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 10, textAlign: "center" }}>{cart.itemCount} items</Text>
                    )}
                  </View>
                </View>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        </View>
      </View>

      <Modal visible={!!selectedProductForOptions} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxWidth: isTablet ? (showToppingsStep ? 750 : 420) : 420, padding: isTablet ? 32 : 24, maxHeight: "92%" }]}>
            <View style={[styles.modalHeader, isRTL && { flexDirection: "row-reverse" }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, rtlTextAlign, { fontSize: 24, fontWeight: "900" }]}>{selectedProductForOptions?.name}</Text>
                <Text style={[styles.sectionLabel, { marginTop: 4, marginBottom: 0 }, rtlTextAlign]}>
                  {showToppingsStep ? (language === "ar" ? "اختر الإضافات" : language === "de" ? "Extras wählen" : "Select Extras") : (t("selectSize" as any) || "Select Size")}
                </Text>
              </View>
              <Pressable onPress={() => { setSelectedProductForOptions(null); setSelectedVariant(null); setSelectedToppings([]); setShowToppingsStep(false); }} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={28} color={Colors.textMuted} />
              </Pressable>
            </View>

            {!showToppingsStep ? (
              /* ── SIZE SELECTION ── */
              <View style={{ marginTop: 20, gap: 12 }}>
                <Text style={[styles.sectionLabel, { marginBottom: 4 }]}>
                  {language === "ar" ? "اختر الحجم" : language === "de" ? "Größe wählen" : "CHOOSE SIZE"}
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
                  {selectedProductForOptions?.variants?.map((v: any, idx: number) => (
                    <Pressable
                      key={idx}
                      style={[styles.sizeCard, { flex: 1, minWidth: isTablet ? 140 : 120 }, selectedVariant?.name === v.name && styles.sizeCardSelected]}
                      onPress={() => {
                        if (isPizzaProduct(selectedProductForOptions)) {
                          setSelectedVariant(v);
                          setSelectedToppings([]);
                          setShowToppingsStep(true);
                        } else {
                          cart.addItem({
                            id: selectedProductForOptions.id,
                            name: selectedProductForOptions.name,
                            price: Number(selectedProductForOptions.price),
                            variant: v,
                          });
                          playAddSound();
                          setSelectedProductForOptions(null);
                        }
                      }}
                    >
                      <Text style={[styles.sizeCardName, selectedVariant?.name === v.name && { color: Colors.accent }]}>{v.name}</Text>
                      <Text style={[styles.sizeCardPrice, selectedVariant?.name === v.name && { color: Colors.accent }]}>CHF {Number(v.price).toFixed(2)}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : (
              /* ── TOPPINGS: POS-style Color Grid (Image 2 layout) ── */
              <ScrollView style={{ marginTop: 8 }} showsVerticalScrollIndicator={false} bounces={false}>
                {/* Selected size badge */}
                {selectedVariant && (
                  <View style={[styles.selectedSizeBadge, { paddingVertical: 8, paddingHorizontal: 14, backgroundColor: Colors.accent + "18", marginBottom: 8 }]}>
                    <Ionicons name="pizza" size={15} color={Colors.accent} />
                    <Text style={[styles.selectedSizeBadgeText, { fontSize: 14, fontWeight: "700" }]}>
                      {selectedVariant.name} — CHF {Number(selectedVariant.price).toFixed(2)}
                    </Text>
                    {selectedToppings.length > 0 && (
                      <View style={{ marginLeft: "auto", backgroundColor: Colors.accent, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 }}>
                        <Text style={{ color: "#000", fontSize: 12, fontWeight: "800" }}>{selectedToppings.length}</Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Color-coded POS grid */}
                <View style={{ gap: 2, borderRadius: 8, overflow: "hidden" }}>
                  {(() => {
                    // If product has custom modifiers, use those; otherwise use TOPPING_GRID
                    const extrasGroup = selectedProductForOptions?.modifiers?.find(
                      (m: any) => !m.required && m.options?.length > 0
                    );

                    if (extrasGroup) {
                      // Custom modifiers: show in grouped grid
                      const toppingOptions = extrasGroup.options.map((o: any) => {
                        const info = getToppingInfo(o.label);
                        return { name: o.label, price: 0, icon: info.icon, category: info.category };
                      });
                      const displayCats = ["Cheese", "Meat", "Vegetables", "Seafood", "Sauces", "Others"];
                      return displayCats.map((cat: string) => {
                        const catToppings = toppingOptions.filter((t: any) => t.category === cat);
                        if (catToppings.length === 0) return null;
                        const rowColor = cat === "Cheese" ? "#F9A825" : cat === "Meat" ? "#B71C1C" : cat === "Vegetables" ? "#1976D2" : cat === "Seafood" ? "#BF360C" : cat === "Sauces" ? "#1455A4" : "#616161";
                        const textColor = cat === "Cheese" ? "#1a1a2e" : "#fff";
                        return (
                          <View key={cat} style={{ flexDirection: "row", flexWrap: "wrap", gap: 2 }}>
                            {catToppings.map((topping: any) => {
                              const isSelected = selectedToppings.includes(topping.name);
                              return (
                                <Pressable
                                  key={topping.name}
                                  onPress={() => setSelectedToppings((prev: string[]) =>
                                    isSelected ? prev.filter((t: string) => t !== topping.name) : [...prev, topping.name]
                                  )}
                                  style={{
                                    height: 58, minWidth: 80, flex: 1,
                                    backgroundColor: isSelected ? Colors.accent : rowColor,
                                    justifyContent: "center", alignItems: "center",
                                    borderWidth: isSelected ? 2 : 1,
                                    borderColor: isSelected ? Colors.accent : "rgba(0,0,0,0.15)",
                                    paddingHorizontal: 4, paddingVertical: 4, gap: 2,
                                  }}
                                >
                                  <Text style={{ fontSize: 16, lineHeight: 18 }}>{topping.icon || toppingEmoji(topping.name)}</Text>
                                  <Text style={{ fontSize: 9, fontWeight: "700", textAlign: "center", color: isSelected ? "#000" : textColor }} numberOfLines={2}>
                                    {topping.name}
                                  </Text>
                                  {isSelected && <Text style={{ fontSize: 9, fontWeight: "900", color: "#000" }}>✓</Text>}
                                </Pressable>
                              );
                            })}
                          </View>
                        );
                      });
                    }

                    // Standard POS grid — full TOPPING_GRID (image 2 layout)
                    return TOPPING_GRID.map((row, rowIdx) => (
                      <View key={rowIdx} style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 2 }}>
                        {row.items.map((toppingName, colIdx) => {
                          if (!toppingName) {
                            return <View key={colIdx} style={{ flex: 1, height: 54, backgroundColor: row.color, opacity: 0.25 }} />;
                          }
                          const isSelected = selectedToppings.includes(toppingName);
                          return (
                            <Pressable
                              key={toppingName}
                              onPress={() => {
                                setSelectedToppings((prev: string[]) =>
                                  isSelected ? prev.filter((t: string) => t !== toppingName) : [...prev, toppingName]
                                );
                                playClickSound("light");
                              }}
                              style={{
                                flex: 1, height: 54,
                                backgroundColor: isSelected ? Colors.accent : row.color,
                                justifyContent: "center", alignItems: "center",
                                borderWidth: isSelected ? 2 : 0.5,
                                borderColor: isSelected ? Colors.accent : "rgba(0,0,0,0.2)",
                                paddingHorizontal: 2, paddingVertical: 4, gap: 2,
                              }}
                            >
                              <Text style={{ fontSize: isTablet ? 18 : 16, lineHeight: 20 }}>{toppingEmoji(toppingName)}</Text>
                              <Text style={{ fontSize: isTablet ? 10 : 8, fontWeight: "700", textAlign: "center", color: isSelected ? "#000" : row.textColor, lineHeight: 11 }} numberOfLines={2}>
                                {toppingDisplayName(toppingName)}
                              </Text>
                              {isSelected && <Text style={{ fontSize: 8, fontWeight: "900", color: "#000", position: "absolute", top: 2, right: 3 }}>✓</Text>}
                            </Pressable>
                          );
                        })}
                      </View>
                    ));
                  })()}
                </View>

                {/* Selected toppings summary */}
                {selectedToppings.length > 0 && (
                  <View style={{ marginTop: 8, padding: 8, backgroundColor: Colors.surfaceLight, borderRadius: 8, borderWidth: 1, borderColor: Colors.cardBorder }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <Text style={{ color: Colors.accent, fontSize: 11, fontWeight: "700" }}>
                        {language === "ar" ? `الإضافات المختارة (${selectedToppings.length})` : language === "de" ? `Ausgewählte Extras (${selectedToppings.length})` : `Selected Extras (${selectedToppings.length})`}
                      </Text>
                      <Pressable onPress={() => setSelectedToppings([])}>
                        <Text style={{ color: Colors.danger, fontSize: 11, fontWeight: "600" }}>
                          {language === "ar" ? "مسح الكل" : language === "de" ? "Alle löschen" : "Clear all"}
                        </Text>
                      </Pressable>
                    </View>
                    <Text style={{ color: Colors.text, fontSize: 11 }} numberOfLines={2}>
                      {selectedToppings.map(t => toppingDisplayName(t)).join(" · ")}
                    </Text>
                  </View>
                )}

                {/* Add to Cart */}
                <View style={{ gap: 8, marginTop: 10 }}>
                  <Pressable
                    style={{ borderRadius: 14, overflow: "hidden" }}
                    onPress={() => {
                      const toppingsSuffix = selectedToppings.length > 0 ? ` [${selectedToppings.map(t => toppingDisplayName(t)).join(", ")}]` : "";
                      cart.addItem({
                        id: selectedProductForOptions.id,
                        name: selectedProductForOptions.name + toppingsSuffix,
                        price: Number(selectedProductForOptions.price),
                        variant: selectedVariant,
                      });
                      playAddSound();
                      setSelectedProductForOptions(null);
                      setSelectedVariant(null);
                      setSelectedToppings([]);
                      setShowToppingsStep(false);
                    }}
                  >
                    <LinearGradient colors={[Colors.accent, Colors.gradientMid]} style={{ paddingVertical: 15, alignItems: "center", borderRadius: 14 }}>
                      <Text style={{ color: Colors.textDark, fontSize: 17, fontWeight: "900" }}>
                        {language === "ar" ? `إضافة للسلة${selectedToppings.length > 0 ? ` (${selectedToppings.length} إضافة)` : ""}` :
                          language === "de" ? `In den Warenkorb${selectedToppings.length > 0 ? ` (${selectedToppings.length} Extras)` : ""}` :
                            `Add to Cart${selectedToppings.length > 0 ? ` (${selectedToppings.length} extras)` : ""}`}
                      </Text>
                    </LinearGradient>
                  </Pressable>

                  {selectedVariant && (
                    <Pressable style={{ paddingVertical: 10 }} onPress={() => setShowToppingsStep(false)}>
                      <Text style={{ color: Colors.textMuted, textAlign: "center", fontSize: 13, fontWeight: "600" }}>
                        {language === "ar" ? "← العودة للأحجام" : language === "de" ? "← Zurück zu Größen" : "← Back to sizes"}
                      </Text>
                    </Pressable>
                  )}
                </View>
              </ScrollView>
            )}

            {!showToppingsStep && (
              <Pressable
                style={[styles.modalCancelBtn, { marginTop: 16 }]}
                onPress={() => { setSelectedProductForOptions(null); setSelectedVariant(null); setSelectedToppings([]); setShowToppingsStep(false); }}
              >
                <Text style={styles.modalCancelBtnText}>{t("cancel")}</Text>
              </Pressable>
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={showCheckout} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={[styles.modalHeader, isRTL && { flexDirection: "row-reverse" }]}>
                <Text style={[styles.modalTitle, rtlTextAlign]}>{t("completePayment")}</Text>
                <Pressable onPress={() => setShowCheckout(false)}>
                  <Ionicons name="close" size={24} color={Colors.text} />
                </Pressable>
              </View>

              <Text style={styles.modalTotal}>CHF {cart.total.toFixed(2)}</Text>

              {selectedCustomer && (
                <View style={[styles.customerInfo, isRTL && { flexDirection: "row-reverse" }]}>
                  <Ionicons name="person-circle" size={20} color={Colors.accent} />
                  <Text style={[styles.customerInfoText, rtlTextAlign]}>{selectedCustomer.name}</Text>
                  <View style={[styles.loyaltyBadge, isRTL && { flexDirection: "row-reverse" }]}>
                    <Ionicons name="star" size={12} color={Colors.warning} />
                    <Text style={styles.loyaltyBadgeText}>{selectedCustomer.loyaltyPoints || 0} {t("pts")}</Text>
                  </View>
                </View>
              )}

              <Text style={[styles.sectionLabel, rtlTextAlign]}>{t("paymentMethod")}</Text>
              <View style={[styles.paymentMethods, isRTL && { flexDirection: "row-reverse" }]}>
                {[
                  { key: "cash", icon: "cash" as const, label: t("cash") },
                  { key: "card", icon: "card" as const, label: t("card") },
                  { key: "twint", icon: "phone-portrait" as const, label: "TWINT" },
                  { key: "nfc", icon: "wifi" as const, label: t("nfcPay") },
                ].map((m) => (
                  <Pressable
                    key={m.key}
                    style={[styles.paymentBtn, paymentMethod === m.key && styles.paymentBtnActive]}
                    onPress={() => { setPaymentMethod(m.key); setPaymentConfirmed(false); }}
                  >
                    <Ionicons name={m.icon} size={22} color={paymentMethod === m.key ? Colors.accent : Colors.textSecondary} />
                    <Text style={[styles.paymentBtnText, paymentMethod === m.key && { color: Colors.accent }]}>{m.label}</Text>
                  </Pressable>
                ))}
              </View>

              {paymentMethod === "cash" && (
                <View style={styles.cashSection}>
                  <Text style={[styles.sectionLabel, rtlTextAlign]}>{t("cashReceived")} <Text style={{ color: Colors.textMuted, fontSize: 11, textTransform: "none", letterSpacing: 0 }}>({t("optional" as any) || "optional"})</Text></Text>
                  <TextInput
                    style={styles.cashInput}
                    placeholder={t("enterAmount")}
                    placeholderTextColor={Colors.textMuted}
                    value={cashReceived}
                    onChangeText={setCashReceived}
                    keyboardType="decimal-pad"
                  />
                  {cashReceived && Number(cashReceived) >= cart.total && (
                    <Text style={styles.changeText}>{t("change")}: CHF {(Number(cashReceived) - cart.total).toFixed(2)}</Text>
                  )}
                </View>
              )}

              {paymentMethod === "nfc" && (
                <Pressable
                  style={[{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 10, backgroundColor: paymentConfirmed ? Colors.success + "15" : Colors.surfaceLight, borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1.5, borderColor: paymentConfirmed ? Colors.success : Colors.cardBorder }]}
                  onPress={() => setPaymentConfirmed(!paymentConfirmed)}
                >
                  <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: paymentConfirmed ? Colors.success : Colors.textMuted, backgroundColor: paymentConfirmed ? Colors.success : "transparent", justifyContent: "center", alignItems: "center" }}>
                    {paymentConfirmed && <Ionicons name="checkmark" size={14} color={Colors.white} />}
                  </View>
                  <Ionicons name="wifi" size={18} color={paymentConfirmed ? Colors.success : Colors.textSecondary} />
                  <Text style={[{ color: paymentConfirmed ? Colors.success : Colors.text, fontSize: 13, fontWeight: "600", flex: 1 }, rtlTextAlign]}>
                    {t("confirmPayment" as any) || "Confirm NFC payment"} — CHF {cart.total.toFixed(2)}
                  </Text>
                </Pressable>
              )}

              {paymentMethod === "card" && (
                <Pressable
                  style={[{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 10, backgroundColor: paymentConfirmed ? Colors.success + "15" : Colors.surfaceLight, borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1.5, borderColor: paymentConfirmed ? Colors.success : Colors.cardBorder }]}
                  onPress={() => setPaymentConfirmed(!paymentConfirmed)}
                >
                  <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: paymentConfirmed ? Colors.success : Colors.textMuted, backgroundColor: paymentConfirmed ? Colors.success : "transparent", justifyContent: "center", alignItems: "center" }}>
                    {paymentConfirmed && <Ionicons name="checkmark" size={14} color={Colors.white} />}
                  </View>
                  <Ionicons name="card" size={18} color={paymentConfirmed ? Colors.success : Colors.textSecondary} />
                  <Text style={[{ color: paymentConfirmed ? Colors.success : Colors.text, fontSize: 13, fontWeight: "600", flex: 1 }, rtlTextAlign]}>
                    {t("confirmPayment" as any) || "Confirm card payment via terminal"} — CHF {cart.total.toFixed(2)}
                  </Text>
                </Pressable>
              )}

              <Text style={[styles.sectionLabel, rtlTextAlign]}>{t("orderSummary")}</Text>
              {cart.items.map((item) => (
                <View key={item.productId} style={[styles.checkoutItem, isRTL && { flexDirection: "row-reverse" }]}>
                  <Text style={[styles.checkoutItemName, rtlTextAlign]}>{item.name} x{item.quantity}</Text>
                  <Text style={[styles.checkoutItemTotal, rtlTextAlign]}>CHF {(item.price * item.quantity).toFixed(2)}</Text>
                </View>
              ))}
              {/* Delivery Fee Stepper — editable in 0.50 CHF increments */}
              <View style={[{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", justifyContent: "space-between", backgroundColor: Colors.surfaceLight, borderRadius: 12, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: Colors.cardBorder }]}>
                <View style={[{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 6 }]}>
                  <Ionicons name="bicycle-outline" size={16} color={Colors.info} />
                  <Text style={[{ color: Colors.text, fontSize: 13, fontWeight: "600" }, rtlTextAlign]}>
                    {t("adjustDeliveryFee" as any)}
                  </Text>
                </View>
                <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 8 }}>
                  <Pressable
                    onPress={() => cart.setDeliveryFee(Math.max(0, Math.round((cart.deliveryFee - 0.5) * 100) / 100))}
                    style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: Colors.danger + "20", justifyContent: "center", alignItems: "center" }}
                  >
                    <Ionicons name="remove" size={16} color={Colors.danger} />
                  </Pressable>
                  <Text style={{ color: Colors.accent, fontSize: 14, fontWeight: "700", minWidth: 60, textAlign: "center" }}>
                    CHF {cart.deliveryFee.toFixed(2)}
                  </Text>
                  <Pressable
                    onPress={() => cart.setDeliveryFee(Math.round((cart.deliveryFee + 0.5) * 100) / 100)}
                    style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: Colors.success + "20", justifyContent: "center", alignItems: "center" }}
                  >
                    <Ionicons name="add" size={16} color={Colors.success} />
                  </Pressable>
                </View>
              </View>

              {/* Payment confirmation checkbox for TWINT/QR payments */}
              {(paymentMethod === "twint" || paymentMethod === "qr") && (
                <Pressable
                  style={[{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 10, backgroundColor: paymentConfirmed ? Colors.success + "15" : Colors.surfaceLight, borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1.5, borderColor: paymentConfirmed ? Colors.success : Colors.cardBorder }]}
                  onPress={() => setPaymentConfirmed(!paymentConfirmed)}
                >
                  <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: paymentConfirmed ? Colors.success : Colors.textMuted, backgroundColor: paymentConfirmed ? Colors.success : "transparent", justifyContent: "center", alignItems: "center" }}>
                    {paymentConfirmed && <Ionicons name="checkmark" size={14} color={Colors.white} />}
                  </View>
                  <Text style={[{ color: paymentConfirmed ? Colors.success : Colors.text, fontSize: 13, fontWeight: "600", flex: 1 }, rtlTextAlign]}>
                    {t("confirmPayment" as any)} — CHF {cart.total.toFixed(2)}
                  </Text>
                </Pressable>
              )}

              <Pressable
                style={[styles.completeBtn, saleMutation.isPending && { opacity: 0.5 }]}
                onPress={() => {
                  const validationError = validateBeforeComplete();
                  if (validationError) {
                    Alert.alert(t("error"), validationError);
                    return;
                  }
                  if (!saleMutation.isPending) {
                    saleMutation.mutate();
                  }
                }}
                disabled={saleMutation.isPending}
              >
                <LinearGradient colors={[Colors.success, "#059669"]} style={[styles.completeBtnGradient, isRTL && { flexDirection: "row-reverse" }]}>
                  <Ionicons name="checkmark-circle" size={22} color={Colors.white} />
                  <Text style={styles.completeBtnText}>
                    {saleMutation.isPending ? t("processing") : t("completeSale")}
                  </Text>
                </LinearGradient>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showReceipt} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={{ backgroundColor: Colors.surface, borderRadius: 16, width: "94%", maxWidth: 380, maxHeight: "90%", overflow: "hidden" }}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={{ backgroundColor: "#FFFFFF", padding: 20, margin: 12, borderRadius: 4 }}>
                <Text style={{ textAlign: "center", color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace", letterSpacing: 1 }}>{"=".repeat(36)}</Text>

                {storeSettings?.logo && (
                  <View style={{ alignItems: "center", marginVertical: 8 }}>
                    <Image source={{ uri: storeSettings.logo.startsWith("http") || storeSettings.logo.startsWith("file://") || storeSettings.logo.startsWith("data:") ? storeSettings.logo : `${getApiUrl().replace(/\/$/, "")}${storeSettings.logo}` }} style={{ width: 50, height: 50, borderRadius: 6 }} resizeMode="contain" />
                  </View>
                )}

                <Text style={{ textAlign: "center", color: "#000", fontSize: 18, fontWeight: "900", fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>{storeSettings?.name || tenant?.name || "POS System"}</Text>
                {storeSettings?.address && <Text style={{ textAlign: "center", color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>{storeSettings.address}</Text>}
                {storeSettings?.phone && <Text style={{ textAlign: "center", color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>{storeSettings.phone}</Text>}
                {storeSettings?.email && <Text style={{ textAlign: "center", color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>{storeSettings.email}</Text>}

                <Text style={{ textAlign: "center", color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace", marginTop: 6, letterSpacing: 1 }}>{"─".repeat(36)}</Text>

                <View style={{ marginVertical: 6 }}>
                  <Text style={{ color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>{t("receiptDate")}: {lastSale?.date ? new Date(lastSale.date).toLocaleDateString() : new Date().toLocaleDateString()}, {lastSale?.date ? new Date(lastSale.date).toLocaleTimeString() : new Date().toLocaleTimeString()}</Text>
                  <Text style={{ color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>{t("receiptNumber")}: {lastSale?.receiptNumber || `#${lastSale?.id} `}</Text>
                  <Text style={{ color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>{t("servedBy")}: {lastSale?.employeeName || employee?.name}</Text>
                  {lastSale?.customerName && <Text style={{ color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>{t("customer")}: {lastSale.customerName}</Text>}
                </View>

                <Text style={{ textAlign: "center", color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace", letterSpacing: 1 }}>{"─".repeat(36)}</Text>

                <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6, marginBottom: 4 }}>
                  <Text style={{ color: "#000", fontSize: 11, fontWeight: "700", fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace", flex: 2 }}>Item</Text>
                  <Text style={{ color: "#000", fontSize: 11, fontWeight: "700", fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace", width: 40, textAlign: "center" }}>Qty</Text>
                  <Text style={{ color: "#000", fontSize: 11, fontWeight: "700", fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace", width: 65, textAlign: "right" }}>Total</Text>
                </View>

                <Text style={{ color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace", letterSpacing: 1 }}>{"─".repeat(36)}</Text>

                <View style={{ marginVertical: 4 }}>
                  {lastSale?.items?.map((item: any, idx: number) => (
                    <View key={idx} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 }}>
                      <Text style={{ color: "#000", fontSize: 11, flex: 2, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }} numberOfLines={1}>{item.productName || item.name}</Text>
                      <Text style={{ color: "#000", fontSize: 11, width: 40, textAlign: "center", fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>x{item.quantity}</Text>
                      <Text style={{ color: "#000", fontSize: 11, width: 75, textAlign: "right", fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>CHF {Number(item.total || (item.unitPrice * item.quantity)).toFixed(2)}</Text>
                    </View>
                  ))}
                </View>

                <Text style={{ textAlign: "center", color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace", marginTop: 4, letterSpacing: 1 }}>{"─".repeat(36)}</Text>

                <View style={{ marginVertical: 4 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 }}>
                    <Text style={{ color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>{t("subtotal")}:</Text>
                    <Text style={{ color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>CHF {Number(lastSale?.subtotal || lastSale?.totalAmount).toFixed(2)}</Text>
                  </View>
                  {(lastSale?.discount || 0) > 0 && (
                    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 }}>
                      <Text style={{ color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>{t("discount")}:</Text>
                      <Text style={{ color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>-CHF {Number(lastSale?.discount).toFixed(2)}</Text>
                    </View>
                  )}
                  {(lastSale?.serviceFee || lastSale?.serviceFeeAmount || 0) > 0 && (
                    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 }}>
                      <Text style={{ color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>{t("serviceTax")}:</Text>
                      <Text style={{ color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>CHF {Number(lastSale?.serviceFee || lastSale?.serviceFeeAmount).toFixed(2)}</Text>
                    </View>
                  )}
                  <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 }}>
                    <Text style={{ color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>{t("tax")}:</Text>
                    <Text style={{ color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>CHF {lastSale?.tax?.toFixed(2)}</Text>
                  </View>
                  {(lastSale?.deliveryFee || 0) > 0 && (
                    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 }}>
                      <Text style={{ color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>Delivery Fee:</Text>
                      <Text style={{ color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>CHF {Number(lastSale?.deliveryFee).toFixed(2)}</Text>
                    </View>
                  )}

                  <Text style={{ textAlign: "center", color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace", marginVertical: 4, letterSpacing: 1 }}>{"=".repeat(36)}</Text>

                  <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 }}>
                    <Text style={{ color: "#000", fontSize: 15, fontWeight: "900", fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>TOTAL:</Text>
                    <Text style={{ color: "#000", fontSize: 15, fontWeight: "900", fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>CHF {lastSale?.total?.toFixed(2)}</Text>
                  </View>

                  <Text style={{ textAlign: "center", color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace", marginVertical: 4, letterSpacing: 1 }}>{"=".repeat(36)}</Text>

                  <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 2, marginTop: 4 }}>
                    <Text style={{ color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>{t("paymentMethod")}:</Text>
                    <Text style={{ color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace", textTransform: "uppercase" }}>{lastSale?.paymentMethod}</Text>
                  </View>
                  {lastSale?.paymentMethod === "cash" && (
                    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 }}>
                      <Text style={{ color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>{t("cash")}:</Text>
                      <Text style={{ color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>CHF {lastSale?.cashReceived?.toFixed(2)}</Text>
                    </View>
                  )}
                  {(lastSale?.change || 0) > 0 && (
                    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 }}>
                      <Text style={{ color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>{t("change")}:</Text>
                      <Text style={{ color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>CHF {lastSale?.change?.toFixed(2)}</Text>
                    </View>
                  )}
                </View>

                {qrDataUrl && Platform.OS === "web" && (
                  <View style={{ alignItems: "center", marginTop: 12 }}>
                    <Image source={{ uri: qrDataUrl }} style={{ width: 90, height: 90, resizeMode: "contain" }} />
                  </View>
                )}

                <View style={{ alignItems: "center", marginTop: 14 }}>
                  <Text style={{ color: "#000", fontSize: 13, fontWeight: "700", textAlign: "center", fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>{t("thankYou")}</Text>
                  <Text style={{ textAlign: "center", color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace", marginTop: 6, letterSpacing: 1 }}>{"=".repeat(36)}</Text>
                </View>
              </View>
            </ScrollView>

            <Pressable style={{ margin: 12, marginTop: 0 }} onPress={() => { setShowReceipt(false); setLastSale(null); setQrDataUrl(null); }}>
              <LinearGradient colors={[Colors.accent, Colors.gradientMid]} style={[styles.closeReceiptGradient, isRTL && { flexDirection: "row-reverse" }]}>
                <Ionicons name="checkmark" size={20} color={Colors.white} />
                <Text style={styles.closeReceiptText}>{t("newSale")}</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={showCustomerPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.modalHeader, isRTL && { flexDirection: "row-reverse" }]}>
              <View style={{ flex: 1, flexDirection: isRTL ? "row-reverse" : "row", alignItems: "baseline", gap: 6 }}>
                <Text style={[styles.modalTitle, rtlTextAlign]}>{t("selectCustomer")}</Text>
                <Text style={{ fontSize: 13, color: Colors.accent, fontWeight: "800", backgroundColor: Colors.accent + "15", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, overflow: "hidden" }}>
                  {totalCustomerCount} {t("total" as any) || "Total"}
                </Text>
              </View>
              <Pressable onPress={() => { setShowCustomerPicker(false); setCustomerSearch(""); }}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </Pressable>
            </View>

            <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
              <View style={[styles.searchBox, { height: 42, backgroundColor: Colors.surfaceLight, borderRadius: 12, borderWidth: 1, borderColor: Colors.cardBorder }]}>
                <Ionicons name="search" size={16} color={Colors.textMuted} />
                <TextInput
                  style={[styles.searchInput, { fontSize: 14, color: Colors.text }]}
                  placeholder={t("search" as any) + "..."}
                  placeholderTextColor={Colors.textMuted}
                  value={customerSearch}
                  onChangeText={setCustomerSearch}
                  autoFocus={Platform.OS === "web"}
                />
                {customerSearch ? (
                  <Pressable onPress={() => setCustomerSearch("")}>
                    <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
                  </Pressable>
                ) : null}
              </View>
            </View>

            <Pressable
              style={[styles.walkInBtn, isRTL && { flexDirection: "row-reverse" }, { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.cardBorder, marginHorizontal: 20, marginBottom: 16 }]}
              onPress={() => { cart.setCustomerId(null); setShowCustomerPicker(false); setCustomerSearch(""); }}
            >
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.textSecondary + "15", justifyContent: "center", alignItems: "center", marginRight: 12 }}>
                <Ionicons name="person-outline" size={18} color={Colors.textSecondary} />
              </View>
              <Text style={[styles.walkInText, rtlTextAlign, { fontSize: 15, fontWeight: "600", color: Colors.textSecondary }]}>{t("walkIn")}</Text>
            </Pressable>
            <FlatList
              data={customers}
              keyExtractor={(item: any) => String(item.id)}
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
              renderItem={({ item }: { item: any }) => (
                <Pressable
                  style={[styles.customerCard, cart.customerId === item.id && styles.customerCardActive, isRTL && { flexDirection: "row-reverse" }]}
                  onPress={() => { cart.setCustomerId(item.id); setShowCustomerPicker(false); }}
                >
                  <View style={[styles.customerAvatar, { backgroundColor: cart.customerId === item.id ? Colors.white : Colors.primary + "15" }]}>
                    <Text style={[styles.customerAvatarText, { color: cart.customerId === item.id ? Colors.primary : Colors.primary }]}>{item.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.customerCardInfo}>
                    <Text style={[styles.customerCardName, rtlTextAlign, cart.customerId === item.id && { color: Colors.white }]}>{item.name}</Text>
                    <Text style={[styles.customerCardMeta, rtlTextAlign, cart.customerId === item.id && { color: Colors.white + "CC" }]}>{item.phone || item.email || t("noContact")}</Text>
                  </View>
                  <View style={[styles.customerLoyalty, isRTL && { flexDirection: "row-reverse" }, { backgroundColor: cart.customerId === item.id ? Colors.white + "25" : Colors.warning + "15" }]}>
                    <Ionicons name="star" size={12} color={cart.customerId === item.id ? Colors.white : Colors.warning} />
                    <Text style={[styles.customerLoyaltyText, { color: cart.customerId === item.id ? Colors.white : Colors.warning, fontWeight: "700" }]}>{item.loyaltyPoints || 0}</Text>
                  </View>
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* ── New Customer Form Modal ── */}
      <Modal visible={showNewCustomerForm} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: 500 }]}>
            <View style={[styles.modalHeader, isRTL && { flexDirection: "row-reverse" }]}>
              <View style={[{ flexDirection: "row", alignItems: "center", gap: 10 }, isRTL && { flexDirection: "row-reverse" }]}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.primary + "33", justifyContent: "center", alignItems: "center" }}>
                  <Ionicons name="person-add" size={20} color={Colors.primary} />
                </View>
                <Text style={[styles.modalTitle, rtlTextAlign]}>
                  {language === "ar" ? "عميل جديد" : language === "de" ? "Neuer Kunde" : "New Customer"}
                </Text>
              </View>
              <Pressable onPress={() => setShowNewCustomerForm(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </Pressable>
            </View>

            <ScrollView style={{ paddingHorizontal: 20, paddingBottom: 16 }} keyboardShouldPersistTaps="handled">
              {/* Name */}
              <Text style={styles.newCustLabel}>
                {language === "ar" ? "الاسم الكامل *" : language === "de" ? "Vollständiger Name *" : "Full Name *"}
              </Text>
              <View style={[styles.newCustInputWrap, isRTL && { flexDirection: "row-reverse" }]}>
                <Ionicons name="person-outline" size={16} color={Colors.textMuted} />
                <TextInput
                  style={[styles.newCustInput, isRTL && { textAlign: "right" }]}
                  placeholder={language === "ar" ? "أدخل الاسم" : language === "de" ? "Name eingeben" : "Enter name"}
                  placeholderTextColor={Colors.textMuted}
                  value={newCustomerForm.name}
                  onChangeText={(v) => setNewCustomerForm((f) => ({ ...f, name: v }))}
                />
              </View>

              {/* Phone */}
              <Text style={styles.newCustLabel}>
                {language === "ar" ? "رقم الهاتف" : language === "de" ? "Telefon" : "Phone Number"}
              </Text>
              <View style={[styles.newCustInputWrap, isRTL && { flexDirection: "row-reverse" }]}>
                <Ionicons name="call-outline" size={16} color={Colors.textMuted} />
                <TextInput
                  style={[styles.newCustInput, isRTL && { textAlign: "right" }]}
                  placeholder="079 123 45 67"
                  placeholderTextColor={Colors.textMuted}
                  value={newCustomerForm.phone}
                  onChangeText={(v) => setNewCustomerForm((f) => ({ ...f, phone: v }))}
                  keyboardType="phone-pad"
                />
              </View>

              {/* Address */}
              <Text style={styles.newCustLabel}>
                {language === "ar" ? "العنوان" : language === "de" ? "Adresse" : "Address"}
              </Text>
              <View style={[styles.newCustInputWrap, isRTL && { flexDirection: "row-reverse" }]}>
                <Ionicons name="location-outline" size={16} color={Colors.textMuted} />
                <TextInput
                  style={[styles.newCustInput, isRTL && { textAlign: "right" }]}
                  placeholder={language === "ar" ? "أدخل العنوان" : language === "de" ? "Adresse eingeben" : "Enter address"}
                  placeholderTextColor={Colors.textMuted}
                  value={newCustomerForm.address}
                  onChangeText={(v) => setNewCustomerForm((f) => ({ ...f, address: v }))}
                />
              </View>

              {/* Email */}
              <Text style={styles.newCustLabel}>
                {language === "ar" ? "البريد الإلكتروني" : language === "de" ? "E-Mail" : "Email"}
              </Text>
              <View style={[styles.newCustInputWrap, isRTL && { flexDirection: "row-reverse" }]}>
                <Ionicons name="mail-outline" size={16} color={Colors.textMuted} />
                <TextInput
                  style={[styles.newCustInput, isRTL && { textAlign: "right" }]}
                  placeholder="email@example.com"
                  placeholderTextColor={Colors.textMuted}
                  value={newCustomerForm.email}
                  onChangeText={(v) => setNewCustomerForm((f) => ({ ...f, email: v }))}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={{ height: 16 }} />

              <Pressable
                onPress={handleCreateCustomer}
                disabled={customerPhoneLoading || !newCustomerForm.name.trim()}
                style={{ opacity: !newCustomerForm.name.trim() ? 0.5 : 1 }}
              >
                <LinearGradient
                  colors={[Colors.primary, Colors.secondary]}
                  style={styles.newCustSaveBtn}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                >
                  <Ionicons name={customerPhoneLoading ? "sync" : "checkmark"} size={18} color={Colors.white} />
                  <Text style={styles.newCustSaveBtnText}>
                    {customerPhoneLoading
                      ? (language === "ar" ? "جاري الحفظ..." : language === "de" ? "Speichern..." : "Saving...")
                      : (language === "ar" ? "حفظ وربط" : language === "de" ? "Speichern & Verknüpfen" : "Save & Link")}
                  </Text>
                </LinearGradient>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── SPEZIF / Order Notes Modal ── */}
      <Modal visible={showOrderNotes} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: 320 }]}>
            <View style={[styles.modalHeader, isRTL && { flexDirection: "row-reverse" }]}>
              <View>
                <Text style={[styles.modalTitle, rtlTextAlign]}>
                  {language === "ar" ? "ملاحظات الطلب" : language === "de" ? "Bestellnotiz (SPEZIF)" : "Order Notes (SPEZIF)"}
                </Text>
                <Text style={{ color: Colors.textMuted, fontSize: 12, marginTop: 2 }}>
                  {language === "ar" ? "تعليمات خاصة للطلب" : language === "de" ? "Besondere Anweisungen für die Bestellung" : "Special instructions for this order"}
                </Text>
              </View>
              <Pressable onPress={() => setShowOrderNotes(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </Pressable>
            </View>
            <TextInput
              style={[styles.searchInput, { flex: 0, height: 100, textAlignVertical: "top", padding: 12, marginTop: 8, backgroundColor: Colors.surface, borderRadius: 10, borderWidth: 1, borderColor: Colors.cardBorder }, rtlTextAlign]}
              multiline
              value={orderNotes}
              onChangeText={setOrderNotes}
              placeholder={language === "ar" ? "مثال: بدون بصل، توصيل عند الباب الخلفي..." : language === "de" ? "z.B.: ohne Zwiebeln, Lieferung am Hintereingang..." : "e.g.: no onions, ring doorbell twice..."}
              placeholderTextColor={Colors.textMuted}
              autoFocus
            />
            <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
              {orderNotes.trim() !== "" && (
                <Pressable
                  style={[styles.modalCancelBtn, { flex: 1, marginTop: 0, borderColor: Colors.danger }]}
                  onPress={() => { setOrderNotes(""); setShowOrderNotes(false); }}
                >
                  <Text style={[styles.modalCancelBtnText, { color: Colors.danger }]}>
                    {language === "ar" ? "مسح" : language === "de" ? "Löschen" : "Clear"}
                  </Text>
                </Pressable>
              )}
              <Pressable
                style={{ flex: 2, borderRadius: 14, overflow: "hidden" }}
                onPress={() => setShowOrderNotes(false)}
              >
                <LinearGradient colors={[Colors.accent, Colors.gradientMid]} style={{ paddingVertical: 14, alignItems: "center", borderRadius: 14 }}>
                  <Text style={{ color: Colors.textDark, fontSize: 16, fontWeight: "800" }}>
                    {language === "ar" ? "حفظ" : language === "de" ? "Speichern" : "Save"}
                  </Text>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showDiscountModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: 340 }]}>
            <View style={[styles.modalHeader, isRTL && { flexDirection: "row-reverse" }]}>
              <Text style={[styles.modalTitle, rtlTextAlign]}>{t("applyDiscount")}</Text>
              <Pressable onPress={() => setShowDiscountModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </Pressable>
            </View>
            <View style={[styles.discountTypeRow, isRTL && { flexDirection: "row-reverse" }]}>
              <Pressable style={[styles.discountTypeBtn, discountType === "fixed" && styles.discountTypeBtnActive]} onPress={() => setDiscountType("fixed")}>
                <Text style={[styles.discountTypeBtnText, discountType === "fixed" && { color: Colors.textDark }]}>{t("fixedAmount")} (CHF)</Text>
              </Pressable>
              <Pressable style={[styles.discountTypeBtn, discountType === "percent" && styles.discountTypeBtnActive]} onPress={() => setDiscountType("percent")}>
                <Text style={[styles.discountTypeBtnText, discountType === "percent" && { color: Colors.textDark }]}>{t("percentage")} (%)</Text>
              </Pressable>
            </View>
            <TextInput
              style={styles.cashInput}
              placeholder={discountType === "fixed" ? t("enterAmount") : t("percentage") + "..."}
              placeholderTextColor={Colors.textMuted}
              value={discountInput}
              onChangeText={setDiscountInput}
              keyboardType="decimal-pad"
            />
            {isCashier && (
              <Text style={{ color: Colors.warning, fontSize: 12, marginTop: 6, textAlign: "center" }}>
                {t("maxDiscountWarning")}
              </Text>
            )}
            <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 10, marginTop: 16 }}>
              <Pressable style={[styles.completeBtn, { flex: 1 }]} onPress={() => { cart.setDiscount(0); setShowDiscountModal(false); }}>
                <View style={[styles.completeBtnGradient, { backgroundColor: Colors.surfaceLight }]}>
                  <Text style={styles.completeBtnText}>{t("removeDiscount")}</Text>
                </View>
              </Pressable>
              <Pressable style={[styles.completeBtn, { flex: 1 }]} onPress={applyDiscount}>
                <LinearGradient colors={[Colors.success, "#059669"]} style={styles.completeBtnGradient}>
                  <Text style={styles.completeBtnText}>{t("apply")}</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showInvoiceHistory} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: "85%" }]}>
            <View style={[styles.modalHeader, isRTL && { flexDirection: "row-reverse" }]}>
              <Text style={[styles.modalTitle, rtlTextAlign]}>{t("previousInvoices")}</Text>
              <Pressable onPress={() => setShowInvoiceHistory(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </Pressable>
            </View>

            {/* 24h filter toggle */}
            <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 8, paddingHorizontal: 4, paddingBottom: 10 }}>
              <Pressable
                onPress={() => setInvoiceFilter24h(true)}
                style={{ flex: 1, paddingVertical: 8, borderRadius: 10, backgroundColor: invoiceFilter24h ? Colors.accent : Colors.surfaceLight, alignItems: "center", borderWidth: 1, borderColor: invoiceFilter24h ? Colors.accent : Colors.cardBorder }}
              >
                <Text style={{ color: invoiceFilter24h ? Colors.textDark : Colors.textSecondary, fontSize: 12, fontWeight: "700" }}>
                  {t("last24Hours" as any)}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setInvoiceFilter24h(false)}
                style={{ flex: 1, paddingVertical: 8, borderRadius: 10, backgroundColor: !invoiceFilter24h ? Colors.accent : Colors.surfaceLight, alignItems: "center", borderWidth: 1, borderColor: !invoiceFilter24h ? Colors.accent : Colors.cardBorder }}
              >
                <Text style={{ color: !invoiceFilter24h ? Colors.textDark : Colors.textSecondary, fontSize: 12, fontWeight: "700" }}>
                  {t("allInvoices" as any)}
                </Text>
              </Pressable>
            </View>

            <FlatList
              data={salesHistory.filter((s: any) => {
                if (!invoiceFilter24h) return true;
                const saleDate = new Date(s.createdAt || s.date);
                return (Date.now() - saleDate.getTime()) <= 24 * 60 * 60 * 1000;
              })}
              keyExtractor={(item: any) => String(item.id)}
              scrollEnabled={!!salesHistory.length}
              renderItem={({ item }: { item: any }) => {
                const saleDate = new Date(item.createdAt || item.date);
                return (
                  <Pressable
                    style={[{
                      flexDirection: isRTL ? "row-reverse" : "row",
                      alignItems: "center",
                      backgroundColor: Colors.surfaceLight,
                      borderRadius: 12,
                      padding: 14,
                      marginBottom: 8,
                      borderWidth: 1,
                      borderColor: Colors.cardBorder,
                    }]}
                    onPress={() => loadInvoiceDetails(item.id)}
                  >
                    <View style={{
                      width: 42, height: 42, borderRadius: 12,
                      backgroundColor: "rgba(47,211,198,0.12)",
                      justifyContent: "center", alignItems: "center",
                      marginRight: isRTL ? 0 : 12, marginLeft: isRTL ? 12 : 0,
                    }}>
                      <Ionicons name="receipt" size={20} color={Colors.accent} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[{ color: Colors.text, fontSize: 14, fontWeight: "700" }, rtlTextAlign]}>
                        {item.receiptNumber || `#${item.id} `}
                      </Text>
                      <Text style={[{ color: Colors.textMuted, fontSize: 11, marginTop: 2 }, rtlTextAlign]}>
                        {saleDate.toLocaleDateString()} • {saleDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </Text>
                      <Text style={[{ color: Colors.textMuted, fontSize: 11, marginTop: 1 }, rtlTextAlign]}>
                        {(item.paymentMethod || "cash").toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ alignItems: isRTL ? "flex-start" : "flex-end" }}>
                      <Text style={{ color: Colors.accent, fontSize: 16, fontWeight: "800" }}>
                        CHF {Number(item.totalAmount).toFixed(2)}
                      </Text>
                      <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 4, marginTop: 4 }}>
                        <Ionicons name="eye-outline" size={14} color={Colors.info} />
                        <Text style={{ color: Colors.info, fontSize: 11, fontWeight: "600" }}>{t("viewInvoice")}</Text>
                      </View>
                    </View>
                  </Pressable>
                );
              }}
              ListEmptyComponent={
                <View style={{ alignItems: "center", paddingVertical: 40 }}>
                  <Ionicons name="receipt-outline" size={48} color={Colors.textMuted} />
                  <Text style={{ color: Colors.textMuted, fontSize: 15, marginTop: 12, fontWeight: "600" }}>{t("noInvoices")}</Text>
                  <Text style={{ color: Colors.textMuted, fontSize: 12, marginTop: 4 }}>{t("noInvoicesDesc")}</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>

      <Modal visible={showReprintReceipt} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={{ backgroundColor: Colors.surface, borderRadius: 16, width: "94%", maxWidth: 380, maxHeight: "90%", overflow: "hidden" }}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedInvoice && (
                <View style={{ padding: 20, backgroundColor: "#fff" }}>
                  <Text style={{ textAlign: "center", color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace", letterSpacing: 1 }}>{"=".repeat(36)}</Text>
                  
                  {storeSettings?.logo && (
                    <View style={{ alignItems: "center", marginVertical: 8 }}>
                      <Image source={{ uri: storeSettings.logo.startsWith("http") || storeSettings.logo.startsWith("file://") || storeSettings.logo.startsWith("data:") ? storeSettings.logo : `${getApiUrl().replace(/\/$/, "")}${storeSettings.logo}` }} style={{ width: 150, height: 50, resizeMode: "contain" }} />
                    </View>
                  )}

                  <Text style={{ color: "#000", fontSize: 18, fontWeight: "900", textAlign: "center", textTransform: "uppercase", fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>{t("viewReceipt" as any) || "RECHNUNG"}</Text>
                  <Text style={{ color: "#000", fontSize: 14, fontWeight: "700", textAlign: "center", fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>{storeSettings?.name || tenant?.name || "POS System"}</Text>
                  
                  {storeSettings?.address && <Text style={{ color: "#000", fontSize: 11, textAlign: "center", fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>{storeSettings.address}</Text>}
                  {storeSettings?.phone && <Text style={{ color: "#000", fontSize: 11, textAlign: "center", fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>{storeSettings.phone}</Text>}
                  
                  <Text style={{ textAlign: "center", color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace", marginTop: 4, letterSpacing: 1 }}>{"─".repeat(36)}</Text>

                  <View style={{ marginVertical: 4 }}>
                    <Text style={{ color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>{t("receiptDate")}: {new Date(selectedInvoice.createdAt || selectedInvoice.date).toLocaleDateString("de-DE")}, {new Date(selectedInvoice.createdAt || selectedInvoice.date).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}</Text>
                    <Text style={{ color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>{t("receiptNumber")}: {selectedInvoice.receiptNumber || `#${selectedInvoice.id}`}</Text>
                    <Text style={{ color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>{t("servedBy")}: {selectedInvoice.employeeName || selectedInvoice.employee?.name || "Cashier"}</Text>
                    {selectedInvoice.customerName ? <Text style={{ color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>{t("customer")}: {selectedInvoice.customerName}</Text> : null}
                  </View>

                  <Text style={{ textAlign: "center", color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace", marginVertical: 4, letterSpacing: 1 }}>{"─".repeat(36)}</Text>

                  <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 }}>
                    <Text style={{ color: "#000", fontSize: 11, fontWeight: "800", flex: 2, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>Item</Text>
                    <Text style={{ color: "#000", fontSize: 11, fontWeight: "800", width: 40, textAlign: "center", fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>Qty</Text>
                    <Text style={{ color: "#000", fontSize: 11, fontWeight: "800", width: 75, textAlign: "right", fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>Total</Text>
                  </View>

                  <Text style={{ textAlign: "center", color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace", marginBottom: 4, letterSpacing: 1 }}>{"─".repeat(36)}</Text>

                  <View style={{ marginVertical: 4 }}>
                    {selectedInvoice.items?.map((item: any, idx: number) => (
                      <View key={idx} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 }}>
                        <Text style={{ color: "#000", fontSize: 11, flex: 2, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }} numberOfLines={1}>{item.productName || item.name}</Text>
                        <Text style={{ color: "#000", fontSize: 11, width: 40, textAlign: "center", fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>x{item.quantity}</Text>
                        <Text style={{ color: "#000", fontSize: 11, width: 75, textAlign: "right", fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>CHF {Number(item.total || (item.unitPrice * item.quantity)).toFixed(2)}</Text>
                      </View>
                    ))}
                  </View>

                  <Text style={{ textAlign: "center", color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace", marginVertical: 4, letterSpacing: 1 }}>{"─".repeat(36)}</Text>

                  <View style={{ marginVertical: 4 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 }}>
                      <Text style={{ color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>{t("subtotal")}:</Text>
                      <Text style={{ color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>CHF {Number(selectedInvoice.subtotal || selectedInvoice.totalAmount).toFixed(2)}</Text>
                    </View>
                    {Number(selectedInvoice.discount) > 0 && (
                      <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 }}>
                        <Text style={{ color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>{t("discount")}:</Text>
                        <Text style={{ color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>-CHF {Number(selectedInvoice.discount).toFixed(2)}</Text>
                      </View>
                    )}
                    {(selectedInvoice.serviceFee || selectedInvoice.serviceFeeAmount || 0) > 0 && (
                      <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 }}>
                        <Text style={{ color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>{t("serviceTax")}:</Text>
                        <Text style={{ color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>CHF {Number(selectedInvoice.serviceFee || selectedInvoice.serviceFeeAmount).toFixed(2)}</Text>
                      </View>
                    )}
                    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 }}>
                      <Text style={{ color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>{t("tax")}:</Text>
                      <Text style={{ color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>CHF {Number(selectedInvoice.tax || 0).toFixed(2)}</Text>
                    </View>
                    {(selectedInvoice.deliveryFee || 0) > 0 && (
                      <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 }}>
                        <Text style={{ color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>Delivery Fee:</Text>
                        <Text style={{ color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>CHF {Number(selectedInvoice.deliveryFee).toFixed(2)}</Text>
                      </View>
                    )}

                    <Text style={{ textAlign: "center", color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace", marginVertical: 4, letterSpacing: 1 }}>{"=".repeat(36)}</Text>

                    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 }}>
                      <Text style={{ color: "#000", fontSize: 15, fontWeight: "900", fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>TOTAL:</Text>
                      <Text style={{ color: "#000", fontSize: 15, fontWeight: "900", fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>CHF {Number(selectedInvoice.totalAmount).toFixed(2)}</Text>
                    </View>

                    <Text style={{ textAlign: "center", color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace", marginVertical: 4, letterSpacing: 1 }}>{"=".repeat(36)}</Text>

                    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 2, marginTop: 4 }}>
                      <Text style={{ color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>{t("paymentMethod")}:</Text>
                      <Text style={{ color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace", textTransform: "uppercase" }}>{selectedInvoice.paymentMethod || "cash"}</Text>
                    </View>
                  </View>

                  {reprintQrDataUrl && Platform.OS === "web" && (
                    <View style={{ alignItems: "center", marginTop: 12 }}>
                      <Image source={{ uri: reprintQrDataUrl }} style={{ width: 90, height: 90, resizeMode: "contain" }} />
                    </View>
                  )}

                  <View style={{ alignItems: "center", marginTop: 14 }}>
                    <Text style={{ color: "#000", fontSize: 13, fontWeight: "700", textAlign: "center", fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>{t("thankYou")}</Text>
                    <Text style={{ textAlign: "center", color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace", marginTop: 6, letterSpacing: 1 }}>{"=".repeat(36)}</Text>
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={{ flexDirection: isRTL ? "row-reverse" : "row", margin: 12, marginTop: 0, gap: 8 }}>
              <Pressable style={{ flex: 1, borderRadius: 14, overflow: "hidden" }} onPress={printReceipt}>
                <LinearGradient colors={[Colors.info, "#2563EB"]} style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", justifyContent: "center", paddingVertical: 14, gap: 8 }}>
                  <Ionicons name="print" size={20} color={Colors.white} />
                  <Text style={{ color: Colors.white, fontSize: 15, fontWeight: "700" }}>{t("printInvoice")}</Text>
                </LinearGradient>
              </Pressable>
              <Pressable style={{ flex: 1, borderRadius: 14, overflow: "hidden" }} onPress={() => { setShowReprintReceipt(false); setSelectedInvoice(null); setReprintQrDataUrl(null); }}>
                <View style={{ backgroundColor: Colors.surfaceLight, flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", justifyContent: "center", paddingVertical: 14, gap: 8, borderRadius: 14 }}>
                  <Ionicons name="close" size={20} color={Colors.text} />
                  <Text style={{ color: Colors.text, fontSize: 15, fontWeight: "700" }}>{t("close")}</Text>
                </View>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Account Switcher Modal */}
      <Modal visible={showAccountSwitcher} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: "85%" }]}>
            <View style={[styles.modalHeader, isRTL && { flexDirection: "row-reverse" }]}>
              <Text style={[styles.modalTitle, rtlTextAlign]}>{t("switchAccount" as any)}</Text>
              <Pressable onPress={() => { setShowAccountSwitcher(false); setSwitchTarget(null); setSwitchPin(""); setSwitchError(""); }}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </Pressable>
            </View>

            {!switchTarget ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                {employee && (
                  <View style={styles.switchCurrentAccount}>
                    <LinearGradient colors={[Colors.accent, Colors.gradientStart]} style={styles.switchCurrentAvatar}>
                      <Text style={styles.switchCurrentAvatarText}>{employee.name.charAt(0).toUpperCase()}</Text>
                    </LinearGradient>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.switchCurrentName, rtlTextAlign]}>{employee.name}</Text>
                      <Text style={[styles.switchCurrentRole, rtlTextAlign]}>{employee.role}</Text>
                    </View>
                    <View style={styles.switchActiveBadge}>
                      <View style={styles.switchActiveDot} />
                      <Text style={styles.switchActiveText}>{t("active" as any)}</Text>
                    </View>
                  </View>
                )}

                {/* Shift status */}
                {myActiveShift && (
                  <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: Colors.success + "15", borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: Colors.success + "40" }}>
                    <Ionicons name="radio-button-on" size={16} color={Colors.success} style={{ marginRight: 8 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: Colors.success, fontSize: 13, fontWeight: "700" }}>
                        {language === "ar" ? "وردية نشطة" : language === "de" ? "Aktive Schicht" : "Active Shift"}
                      </Text>
                      <Text style={{ color: Colors.textMuted, fontSize: 12 }}>
                        {new Date(myActiveShift.startTime).toLocaleTimeString()}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => endShiftMutation.mutate(myActiveShift.id)}
                      style={{ backgroundColor: Colors.danger + "20", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, flexDirection: "row", alignItems: "center", gap: 6 }}
                    >
                      <Ionicons name="stop-circle" size={16} color={Colors.danger} />
                      <Text style={{ color: Colors.danger, fontSize: 13, fontWeight: "700" }}>
                        {language === "ar" ? "إنهاء الوردية" : language === "de" ? "Schicht beenden" : "End Shift"}
                      </Text>
                    </Pressable>
                  </View>
                )}

                <Text style={[styles.switchSectionTitle, rtlTextAlign]}>{t("employees" as any)}</Text>

                {allEmployees.filter((e: any) => e.id !== employee?.id).map((emp: any) => {
                  const roleColors: Record<string, string> = { admin: Colors.danger, manager: Colors.warning, cashier: Colors.info, owner: Colors.secondary };
                  const roleColor = roleColors[emp.role?.toLowerCase()] || Colors.info;
                  return (
                    <Pressable key={emp.id} style={styles.switchEmployeeCard} onPress={() => { setSwitchTarget(emp); setSwitchPin(""); setSwitchError(""); }}>
                      <View style={[styles.switchEmployeeAvatar, { borderColor: roleColor }]}>
                        <Text style={styles.switchEmployeeAvatarText}>{emp.name.charAt(0).toUpperCase()}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.switchEmployeeName, rtlTextAlign]}>{emp.name}</Text>
                        <View style={[styles.switchRoleBadge, { backgroundColor: roleColor }]}>
                          <Text style={styles.switchRoleBadgeText}>{emp.role}</Text>
                        </View>
                      </View>
                      <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={20} color={Colors.textMuted} />
                    </Pressable>
                  );
                })}

                {allEmployees.filter((e: any) => e.id !== employee?.id).length === 0 && (
                  <Text style={{ color: Colors.textMuted, fontSize: 14, textAlign: "center", marginTop: 20 }}>{t("noEmployees" as any)}</Text>
                )}
              </ScrollView>
            ) : (
              <View style={styles.switchPinSection}>
                <Pressable style={styles.switchBackBtn} onPress={() => { setSwitchTarget(null); setSwitchPin(""); setSwitchError(""); }}>
                  <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={22} color={Colors.text} />
                </Pressable>

                <View style={styles.switchPinAvatar}>
                  <LinearGradient colors={[Colors.accent, Colors.gradientStart]} style={styles.switchPinAvatarCircle}>
                    <Text style={styles.switchPinAvatarText}>{switchTarget.name.charAt(0).toUpperCase()}</Text>
                  </LinearGradient>
                  <Text style={[styles.switchPinName, rtlTextAlign]}>{switchTarget.name}</Text>
                </View>

                <Text style={[styles.switchPinLabel, rtlTextAlign]}>{t("enterPinToSwitch" as any)}</Text>

                <View style={styles.switchPinDots}>
                  {[0, 1, 2, 3].map((i) => (
                    <View key={i} style={[styles.switchDot, i < switchPin.length && styles.switchDotFilled]} />
                  ))}
                </View>

                {switchError ? (
                  <View style={styles.switchErrorRow}>
                    <Ionicons name="alert-circle" size={16} color={Colors.danger} />
                    <Text style={styles.switchErrorText}>{switchError}</Text>
                  </View>
                ) : null}

                {switchLoading ? (
                  <View style={{ paddingVertical: 20 }}>
                    <Text style={{ color: Colors.accent, textAlign: "center", fontSize: 14, fontWeight: "600" }}>{t("processing" as any)}</Text>
                  </View>
                ) : (
                  <View style={styles.switchKeypad}>
                    {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"].map((key) => {
                      if (key === "") return <View key="empty" style={styles.switchKeyBtn} />;
                      if (key === "del") {
                        return (
                          <Pressable key="del" style={styles.switchKeyBtn} onPress={() => { playClickSound("light"); setSwitchPin(switchPin.slice(0, -1)); }}>
                            <Ionicons name="backspace" size={24} color={Colors.text} />
                          </Pressable>
                        );
                      }
                      return (
                        <Pressable key={key} style={styles.switchKeyBtn} onPress={() => handleSwitchPinPress(key)}>
                          <Text style={styles.switchKeyText}>{key}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>
            )}
          </View>
        </View>
      </Modal>

      <BarcodeScanner
        visible={showScanner}
        onScanned={handleBarcodeScan}
        onClose={() => setShowScanner(false)}
      />

      {/* ── Shift Prompt after Account Switch ── */}
      <Modal visible={showSwitchShiftPrompt} animationType="fade" transparent onRequestClose={() => { }}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", alignItems: "center", padding: 24 }}>
          <View style={{ backgroundColor: Colors.surface, borderRadius: 20, padding: 24, width: "100%", maxWidth: 380, borderWidth: 1, borderColor: Colors.cardBorder }}>
            {!showSwitchCashInput ? (
              <>
                <View style={{ alignItems: "center", marginBottom: 20 }}>
                  <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.accent + "20", justifyContent: "center", alignItems: "center", marginBottom: 12 }}>
                    <Ionicons name="time-outline" size={30} color={Colors.accent} />
                  </View>
                  <Text style={{ color: Colors.text, fontSize: 20, fontWeight: "700", marginBottom: 8 }}>
                    {language === "ar" ? "بدء الوردية" : language === "de" ? "Schicht starten" : "Start Shift"}
                  </Text>
                  <Text style={{ color: Colors.textSecondary, fontSize: 14, textAlign: "center" }}>
                    {switchedEmployee?.name}{language === "ar" ? " لا يوجد وردية نشطة. هل تريد بدء وردية؟" : language === "de" ? " hat keine aktive Schicht. Schicht starten?" : " has no active shift. Start one now?"}
                  </Text>
                </View>
                <Pressable
                  onPress={() => setShowSwitchCashInput(true)}
                  style={{ backgroundColor: Colors.accent, borderRadius: 12, paddingVertical: 14, alignItems: "center" }}
                >
                  <Text style={{ color: Colors.textDark, fontSize: 16, fontWeight: "700" }}>
                    {language === "ar" ? "بدء الوردية الآن" : language === "de" ? "Schicht jetzt starten" : "Start Shift Now"}
                  </Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={{ color: Colors.text, fontSize: 18, fontWeight: "700", marginBottom: 16, textAlign: "center" }}>
                  {language === "ar" ? "رصيد الفتح النقدي" : language === "de" ? "Öffnungskassenbestand" : "Opening Cash Balance"}
                </Text>
                <TextInput
                  style={{ backgroundColor: Colors.surfaceLight, borderRadius: 12, padding: 14, fontSize: 18, color: Colors.text, textAlign: "center", borderWidth: 1, borderColor: Colors.cardBorder, marginBottom: 16 }}
                  value={switchOpeningCash}
                  onChangeText={setSwitchOpeningCash}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={Colors.textMuted}
                  autoFocus
                />
                <Pressable
                  onPress={() => {
                    if (!switchedEmployee) return;
                    startShiftAfterSwitchMutation.mutate({
                      employeeId: switchedEmployee.id,
                      branchId: switchedEmployee.branchId || 1,
                      openingCash: switchOpeningCash ? Number(switchOpeningCash) : 0,
                    });
                  }}
                  style={{ backgroundColor: Colors.accent, borderRadius: 12, paddingVertical: 14, alignItems: "center", marginBottom: 10 }}
                >
                  <Text style={{ color: Colors.textDark, fontSize: 16, fontWeight: "700" }}>
                    {language === "ar" ? "بدء الوردية" : language === "de" ? "Schicht starten" : "Start Shift"}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setShowSwitchCashInput(false)}
                  style={{ borderRadius: 12, paddingVertical: 14, alignItems: "center" }}
                >
                  <Text style={{ color: Colors.textSecondary, fontSize: 15 }}>
                    {language === "ar" ? "رجوع" : language === "de" ? "Zurück" : "Back"}
                  </Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ── Online Orders Panel ── */}
      <Modal visible={showOnlineOrders} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: "92%" }]}>
            <View style={[styles.modalHeader, isRTL && { flexDirection: "row-reverse" }]}>
              <Text style={[styles.modalTitle, rtlTextAlign]}>
                {language === "ar" ? "🌐 الطلبات الإلكترونية" : language === "de" ? "🌐 Online-Bestellungen" : "🌐 Online Orders"}
              </Text>
              <Pressable onPress={() => setShowOnlineOrders(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </Pressable>
            </View>

            <FlatList
              data={onlineOrders as any[]}
              keyExtractor={(item: any) => String(item.id)}
              scrollEnabled
              renderItem={({ item }: { item: any }) => {
                const orderDate = new Date(item.createdAt);
                const statusColor: Record<string, string> = {
                  pending: Colors.warning,
                  accepted: Colors.info,
                  preparing: Colors.secondary,
                  ready: Colors.accent,
                  delivered: Colors.success,
                  cancelled: Colors.danger,
                };
                const payIcon: Record<string, string> = { cash: "💵", card: "💳", mobile: "📱" };
                return (
                  <View style={{
                    backgroundColor: Colors.surfaceLight,
                    borderRadius: 14, padding: 14, marginBottom: 10,
                    borderWidth: 1, borderColor: Colors.cardBorder,
                    borderLeftWidth: 4, borderLeftColor: statusColor[item.status] || Colors.textMuted,
                  }}>
                    <View style={{ flexDirection: isRTL ? "row-reverse" : "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <Text style={{ color: Colors.text, fontWeight: "800", fontSize: 14 }}>#{item.orderNumber}</Text>
                      <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                        <View style={{ backgroundColor: statusColor[item.status] || Colors.textMuted, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 }}>
                          <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700", textTransform: "capitalize" }}>{item.status}</Text>
                        </View>
                        <Text style={{ color: Colors.accent, fontWeight: "800" }}>CHF {Number(item.totalAmount).toFixed(2)}</Text>
                      </View>
                    </View>
                    <Text style={{ color: Colors.textSecondary, fontSize: 12, marginBottom: 2 }}>
                      👤 {item.customerName} · 📞 {item.customerPhone}
                    </Text>
                    {item.customerAddress && (
                      <Text style={{ color: Colors.textMuted, fontSize: 11, marginBottom: 2 }}>📍 {item.customerAddress}</Text>
                    )}
                    <Text style={{ color: Colors.textMuted, fontSize: 11, marginBottom: 6 }}>
                      {payIcon[item.paymentMethod] || "💵"} {item.paymentMethod?.toUpperCase()} · {item.orderType?.toUpperCase()} · {orderDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </Text>
                    {/* Items */}
                    {(item.items || []).map((it: any, idx: number) => (
                      <Text key={idx} style={{ color: Colors.textMuted, fontSize: 11 }}>
                        • {it.name} x{it.quantity} — CHF {Number(it.total).toFixed(2)}
                      </Text>
                    ))}
                    {item.notes && <Text style={{ color: Colors.warning, fontSize: 11, marginTop: 4 }}>📝 {item.notes}</Text>}

                    {/* Action buttons */}
                    <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                      {item.status === "pending" && (
                        <Pressable
                          onPress={async () => {
                            await apiRequest("PUT", `/api/online-orders/${item.id}`, { status: "accepted", estimatedTime: 30 });
                            qc.invalidateQueries({ queryKey: ["/api/online-orders"] });
                          }}
                          style={{ backgroundColor: Colors.info, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8 }}
                        >
                          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12 }}>
                            {language === "ar" ? "قبول" : language === "de" ? "Annehmen" : "Accept"}
                          </Text>
                        </Pressable>
                      )}
                      {item.status === "accepted" && (
                        <Pressable
                          onPress={async () => {
                            await apiRequest("PUT", `/api/online-orders/${item.id}`, { status: "preparing" });
                            qc.invalidateQueries({ queryKey: ["/api/online-orders"] });
                          }}
                          style={{ backgroundColor: Colors.secondary, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8 }}
                        >
                          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12 }}>
                            {language === "ar" ? "قيد التحضير" : language === "de" ? "In Zubereitung" : "Preparing"}
                          </Text>
                        </Pressable>
                      )}
                      {item.status === "preparing" && (
                        <Pressable
                          onPress={async () => {
                            await apiRequest("PUT", `/api/online-orders/${item.id}`, { status: "ready" });
                            qc.invalidateQueries({ queryKey: ["/api/online-orders"] });
                          }}
                          style={{ backgroundColor: Colors.accent, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8 }}
                        >
                          <Text style={{ color: Colors.textDark || "#111", fontWeight: "700", fontSize: 12 }}>
                            {language === "ar" ? "جاهز" : language === "de" ? "Fertig" : "Ready"}
                          </Text>
                        </Pressable>
                      )}
                      {item.status === "ready" && (
                        <Pressable
                          onPress={async () => {
                            await apiRequest("PUT", `/api/online-orders/${item.id}`, { status: "delivered" });
                            qc.invalidateQueries({ queryKey: ["/api/online-orders"] });
                          }}
                          style={{ backgroundColor: "#22c55e", paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8 }}
                        >
                          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12 }}>
                            {language === "ar" ? "تم التوصيل" : language === "de" ? "Geliefert" : "Delivered"}
                          </Text>
                        </Pressable>
                      )}
                      {item.status !== "cancelled" && item.status !== "delivered" && (
                        <Pressable
                          onPress={async () => {
                            await apiRequest("PUT", `/api/online-orders/${item.id}`, { status: "cancelled" });
                            qc.invalidateQueries({ queryKey: ["/api/online-orders"] });
                          }}
                          style={{ backgroundColor: Colors.danger, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8 }}
                        >
                          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12 }}>
                            {language === "ar" ? "إلغاء" : language === "de" ? "Stornieren" : "Cancel"}
                          </Text>
                        </Pressable>
                      )}
                      {/* Load to POS cart */}
                      {["pending", "accepted", "preparing"].includes(item.status) && (
                        <Pressable
                          onPress={() => {
                            // Load items into cart
                            cart.clearCart();
                            (item.items || []).forEach((it: any) => {
                              for (let i = 0; i < it.quantity; i++) {
                                cart.addItem({ id: it.productId || 0, name: it.name, price: Number(it.unitPrice) || 0 });
                              }
                            });
                            setShowOnlineOrders(false);
                          }}
                          style={{ backgroundColor: Colors.surfaceLight, borderWidth: 1, borderColor: Colors.cardBorder, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8 }}
                        >
                          <Text style={{ color: Colors.text, fontWeight: "700", fontSize: 12 }}>
                            🛒 {language === "ar" ? "تحميل للنقطة" : language === "de" ? "In POS laden" : "Load to POS"}
                          </Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                );
              }}
              ListEmptyComponent={
                <View style={{ alignItems: "center", paddingVertical: 40 }}>
                  <Text style={{ fontSize: 40 }}>🌐</Text>
                  <Text style={{ color: Colors.textMuted, fontSize: 15, marginTop: 12, fontWeight: "600" }}>
                    {language === "ar" ? "لا توجد طلبات إلكترونية" : language === "de" ? "Keine Online-Bestellungen" : "No online orders yet"}
                  </Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>

      {/* ── Call History Panel ── */}
      <Modal visible={showCallHistory} animationType="slide" transparent onShow={() => { setCallHistoryFilter("all"); setCallHistorySearch(""); }}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: "92%" }]}>
            {/* Header */}
            <View style={[styles.modalHeader, isRTL && { flexDirection: "row-reverse" }]}>
              <Text style={[styles.modalTitle, rtlTextAlign]}>
                {language === "ar" ? "📞 سجل المكالمات" : language === "de" ? "📞 Anrufhistorie" : "📞 Call History"}
              </Text>
              <Pressable onPress={() => setShowCallHistory(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </Pressable>
            </View>

            {/* Stats bar */}
            {(() => {
              const total = (callHistory as any[]).length;
              const missed = (callHistory as any[]).filter((c: any) => c.status === "missed").length;
              const answered = (callHistory as any[]).filter((c: any) => c.status === "answered").length;
              const todayCount = (callHistory as any[]).filter((c: any) => {
                const d = new Date(c.createdAt); const now = new Date();
                return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
              }).length;
              return (
                <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                  {[
                    { label: language === "ar" ? "الكل" : language === "de" ? "Alle" : "Total", value: total, color: Colors.accent },
                    { label: language === "ar" ? "فاتت" : language === "de" ? "Verpasst" : "Missed", value: missed, color: Colors.danger },
                    { label: language === "ar" ? "رُدَّ عليها" : language === "de" ? "Beantw." : "Answered", value: answered, color: Colors.success },
                    { label: language === "ar" ? "اليوم" : language === "de" ? "Heute" : "Today", value: todayCount, color: "#a78bfa" },
                  ].map((s) => (
                    <View key={s.label} style={{ flex: 1, minWidth: 70, backgroundColor: s.color + "18", borderRadius: 10, paddingVertical: 7, paddingHorizontal: 6, alignItems: "center" }}>
                      <Text style={{ color: s.color, fontSize: 18, fontWeight: "800" }}>{s.value}</Text>
                      <Text style={{ color: s.color, fontSize: 10, fontWeight: "600", opacity: 0.85, marginTop: 1 }}>{s.label}</Text>
                    </View>
                  ))}
                </View>
              );
            })()}

            {/* Search bar */}
            <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", backgroundColor: Colors.surfaceLight, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 8, borderWidth: 1, borderColor: Colors.cardBorder, gap: 6 }}>
              <Ionicons name="search" size={16} color={Colors.textMuted} />
              <TextInput
                value={callHistorySearch}
                onChangeText={setCallHistorySearch}
                placeholder={language === "ar" ? "ابحث برقم أو اسم..." : language === "de" ? "Suche nach Nummer oder Name..." : "Search by number or name..."}
                placeholderTextColor={Colors.textMuted}
                style={{ flex: 1, color: Colors.text, fontSize: 14, textAlign: isRTL ? "right" : "left" }}
              />
              {callHistorySearch.length > 0 && (
                <Pressable onPress={() => setCallHistorySearch("")}>
                  <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
                </Pressable>
              )}
            </View>

            {/* Filter tabs */}
            <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 6, marginBottom: 10 }}>
              {(["all", "missed", "answered", "today"] as const).map((f) => {
                const labels: Record<string, Record<string, string>> = {
                  all:      { ar: "الكل", de: "Alle", en: "All" },
                  missed:   { ar: "فاتتني", de: "Verpasst", en: "Missed" },
                  answered: { ar: "تم الرد", de: "Beantwortet", en: "Answered" },
                  today:    { ar: "اليوم", de: "Heute", en: "Today" },
                };
                const label = labels[f][language] ?? labels[f]["en"];
                const active = callHistoryFilter === f;
                return (
                  <Pressable key={f} onPress={() => setCallHistoryFilter(f)} style={{ flex: 1, paddingVertical: 6, borderRadius: 8, backgroundColor: active ? Colors.accent : Colors.surfaceLight, borderWidth: 1, borderColor: active ? Colors.accent : Colors.cardBorder, alignItems: "center" }}>
                    <Text style={{ color: active ? Colors.white : Colors.textSecondary, fontSize: 12, fontWeight: "700" }}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <FlatList
              data={(() => {
                // Group calls by phone number
                const grouped = new Map<string, any>();
                for (const call of (callHistory as any[])) {
                  const key = call.phoneNumber;
                  if (!grouped.has(key)) {
                    grouped.set(key, { ...call, callCount: 1, missedCount: call.status === "missed" ? 1 : 0, answeredCount: call.status === "answered" ? 1 : 0 });
                  } else {
                    const existing = grouped.get(key)!;
                    existing.callCount += 1;
                    if (call.status === "missed") existing.missedCount += 1;
                    if (call.status === "answered") existing.answeredCount += 1;
                  }
                }
                let items = Array.from(grouped.values());

                // Apply filter
                const now = new Date();
                if (callHistoryFilter === "missed") items = items.filter((i: any) => i.missedCount > 0 && i.answeredCount === 0);
                if (callHistoryFilter === "answered") items = items.filter((i: any) => i.answeredCount > 0);
                if (callHistoryFilter === "today") items = items.filter((i: any) => {
                  const d = new Date(i.createdAt);
                  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
                });

                // Apply search
                if (callHistorySearch.trim()) {
                  const q = callHistorySearch.trim().toLowerCase();
                  items = items.filter((i: any) => {
                    const custName = i.customerName || customers.find((c: any) => c.id === i.customerId)?.name || "";
                    return i.phoneNumber?.includes(q) || custName.toLowerCase().includes(q);
                  });
                }
                return items;
              })()}
              keyExtractor={(item: any) => String(item.phoneNumber)}
              renderItem={({ item }: { item: any }) => {
                const callDate = new Date(item.createdAt);
                const hasAnswered = item.answeredCount > 0;
                const isMissed = !hasAnswered;
                const custFromList = customers.find((c: any) => c.id === item.customerId);
                const custName: string | null = item.customerName || custFromList?.name || null;
                const dateStr = callDate.toLocaleDateString(undefined, { day: "2-digit", month: "2-digit", year: "numeric" });
                const timeStr = callDate.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });

                return (
                  <Pressable
                    onPress={() => {
                      if (item.phoneNumber) {
                        setPhoneInput(item.phoneNumber);
                        if (custFromList) {
                          cart.setCustomerId(custFromList.id);
                          setCallerCustomer(custFromList);
                        } else {
                          handlePhoneSearch(item.phoneNumber);
                        }
                        setActiveCallId(item.id);
                        setShowCallHistory(false);
                      }
                    }}
                    style={{
                      backgroundColor: Colors.surfaceLight,
                      borderRadius: 14, padding: 12, marginBottom: 8,
                      borderWidth: 1, borderColor: Colors.cardBorder,
                      borderLeftWidth: 4, borderLeftColor: isMissed ? Colors.danger : Colors.success,
                      flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 10
                    }}
                  >
                    {/* Avatar / status icon */}
                    <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: custName ? Colors.accent + "22" : (isMissed ? Colors.danger + "22" : Colors.success + "22"), justifyContent: "center", alignItems: "center" }}>
                      {custName
                        ? <Text style={{ color: Colors.accent, fontSize: 18, fontWeight: "800" }}>{custName.charAt(0).toUpperCase()}</Text>
                        : <Ionicons name={isMissed ? "call-outline" : "call"} size={22} color={isMissed ? Colors.danger : Colors.success} />
                      }
                    </View>

                    {/* Main info */}
                    <View style={{ flex: 1 }}>
                      {custName && (
                        <Text style={{ color: Colors.accent, fontWeight: "800", fontSize: 15 }}>{custName}</Text>
                      )}
                      <Text style={{ color: custName ? Colors.textSecondary : Colors.text, fontWeight: custName ? "600" : "800", fontSize: custName ? 13 : 16, marginTop: custName ? 1 : 0 }}>
                        {item.phoneNumber}
                      </Text>
                      <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 6, marginTop: 4 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                          <Ionicons name="calendar-outline" size={12} color={Colors.textMuted} />
                          <Text style={{ color: Colors.textMuted, fontSize: 12, fontWeight: "600" }}>{dateStr}</Text>
                        </View>
                        <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: Colors.textMuted }} />
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                          <Ionicons name="time-outline" size={12} color={Colors.textMuted} />
                          <Text style={{ color: Colors.textMuted, fontSize: 12, fontWeight: "600" }}>{timeStr}</Text>
                        </View>
                        {item.callCount > 1 && (
                          <>
                            <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: Colors.textMuted }} />
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                              <Ionicons name="layers-outline" size={12} color={Colors.textMuted} />
                              <Text style={{ color: Colors.textMuted, fontSize: 12, fontWeight: "600" }}>{item.callCount}x</Text>
                            </View>
                          </>
                        )}
                      </View>
                    </View>

                    {/* Right side: badges + arrow */}
                    <View style={{ alignItems: "flex-end", gap: 4 }}>
                      {item.answeredCount > 0 && (
                        <View style={{ backgroundColor: Colors.success + "18", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
                          <Text style={{ color: Colors.success, fontSize: 12, fontWeight: "700" }}>
                            {language === "ar" ? "تم الرد" : language === "de" ? "Beantwortet" : "Answered"}
                          </Text>
                        </View>
                      )}
                      {item.missedCount > 0 && (
                        <View style={{ backgroundColor: Colors.danger + "18", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
                          <Text style={{ color: Colors.danger, fontSize: 12, fontWeight: "700" }}>
                            {item.missedCount > 1 ? `${item.missedCount} ` : ""}{language === "ar" ? "فاتت" : language === "de" ? "Verpasst" : "Missed"}
                          </Text>
                        </View>
                      )}
                      {item.saleId && (
                        <View style={{ backgroundColor: Colors.accent + "22", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 }}>
                          <Text style={{ color: Colors.accent, fontSize: 10, fontWeight: "800" }}>
                            {language === "ar" ? "مباع" : language === "de" ? "Verkauft" : "SOLD"}
                          </Text>
                        </View>
                      )}
                      <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={16} color={Colors.textMuted} />
                    </View>
                  </Pressable>
                );
              }}
              ListEmptyComponent={
                <View style={{ alignItems: "center", paddingVertical: 40 }}>
                  <Ionicons name="call-outline" size={48} color={Colors.textMuted} />
                  <Text style={{ color: Colors.textMuted, fontSize: 15, marginTop: 12, fontWeight: "600" }}>
                    {callHistorySearch ? (language === "ar" ? "لا توجد نتائج" : language === "de" ? "Keine Ergebnisse" : "No results found") : (language === "ar" ? "لا يوجد سجل مكالمات" : language === "de" ? "Keine Anrufhistorie" : "No call history yet")}
                  </Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>

      {/* Online Order Notification moved to _layout.tsx */}

      <View style={{ height: Platform.OS === "web" ? 84 : 60 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { overflow: "hidden" },
  headerGradient: { paddingHorizontal: 16, paddingVertical: 8 },
  headerContent: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerTitle: { fontSize: 18, fontWeight: "800", color: Colors.white, letterSpacing: 0.5 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  employeeName: { color: Colors.white, fontSize: 13, opacity: 0.9 },
  mainContent: { flex: 1 },
  productsSection: { flex: 1 },
  productsSectionTablet: { flex: 1 },
  searchRow: { paddingHorizontal: 14, paddingTop: 12 },
  searchBox: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.inputBg, borderRadius: 14, paddingHorizontal: 14, height: 44, borderWidth: 1, borderColor: Colors.inputBorder },
  searchInput: { flex: 1, color: Colors.text, marginLeft: 8, fontSize: 15 },

  // ── Category grid (no scroll, wraps automatically)
  categoriesGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 10, paddingVertical: 8, gap: 6 },
  catChip: { flexDirection: "row", borderRadius: 28, backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.cardBorder, overflow: "hidden" },
  catChipActive: { borderColor: Colors.accent, borderWidth: 2 },
  catChipGrad: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 11, gap: 7 },
  catChipText: { color: Colors.textSecondary, fontSize: 15, fontWeight: "700" },
  catDot: { width: 10, height: 10, borderRadius: 5 },

  // ── Kept for compat (unused now)
  categoriesRow: { flexGrow: 0 },
  categoriesContent: {},
  categoryChip: {}, categoryChipAll: {}, categoryChipAllActive: {},
  categoryChipGradient: {}, categoryChipInner: {},
  categoryChipText: {}, categoryChipTextAll: {}, categoryDot: {},

  // ── Products
  productGrid: { padding: 8 },
  productCard: { flex: 1, margin: 4, backgroundColor: Colors.surface, borderRadius: 14, padding: 12, alignItems: "center", borderWidth: 1, borderColor: Colors.cardBorder, minWidth: 80, overflow: "hidden", position: "relative" as const },
  productCardTopBorder: { position: "absolute" as const, top: 0, left: 0, right: 0, height: 3, borderTopLeftRadius: 14, borderTopRightRadius: 14 },
  productIcon: { width: 64, height: 64, borderRadius: 16, justifyContent: "center", alignItems: "center", marginBottom: 10, marginTop: 4, overflow: "hidden" as const },
  productName: { color: Colors.text, fontSize: 14, fontWeight: "700", textAlign: "center", marginBottom: 4, lineHeight: 19 },
  productPrice: { color: Colors.accent, fontSize: 16, fontWeight: "800" },
  productAddBadge: { position: "absolute" as const, top: 7, right: 7, width: 20, height: 20, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  productCartBadge: { position: "absolute" as const, top: 7, right: 7, minWidth: 20, height: 20, borderRadius: 10, justifyContent: "center", alignItems: "center", paddingHorizontal: 4 },
  productCartBadgeText: { color: Colors.white, fontSize: 11, fontWeight: "800" },
  barcodeText: { color: Colors.textMuted, fontSize: 9, marginTop: 3 },
  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  emptyText: { color: Colors.textMuted, fontSize: 15, marginTop: 12 },

  // ── Cart
  cartSection: { backgroundColor: Colors.surface, borderTopWidth: 1, borderColor: Colors.cardBorder, maxHeight: 380 },
  cartSectionTablet: { flex: 1.2, borderTopWidth: 0, borderLeftWidth: 1, maxHeight: "100%" as any, display: "flex" as any, flexDirection: "column" as any },
  cartHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: 1, borderColor: Colors.cardBorder },
  cartTitle: { color: Colors.text, fontSize: 17, fontWeight: "700" },
  customerSelect: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 6, borderBottomWidth: 1, borderColor: "rgba(255,255,255,0.05)" },
  customerSelectText: { color: Colors.textMuted, fontSize: 13, flex: 1 },
  cartList: { flex: 1 },
  cartItem: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 7, borderBottomWidth: 1, borderColor: "rgba(255,255,255,0.05)", gap: 8 },
  cartItemIndexBadge: { width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.surfaceLight, justifyContent: "center", alignItems: "center", flexShrink: 0 },
  cartItemIndexText: { color: Colors.textMuted, fontSize: 10, fontWeight: "700" },
  cartItemInfo: { flex: 1, minWidth: 0 },
  cartItemName: { color: Colors.text, fontSize: 15, fontWeight: "600" },
  cartItemUnit: { color: Colors.textMuted, fontSize: 13, marginTop: 1 },
  cartItemPrice: { color: Colors.accent, fontSize: 14, marginTop: 2, fontWeight: "500" },
  cartItemTotal: { color: Colors.accent, fontSize: 16, fontWeight: "700", minWidth: 70, textAlign: "right" },
  cartItemActions: { flexDirection: "row", alignItems: "center", gap: 6 },
  qtyBtn: { width: 26, height: 26, borderRadius: 13, backgroundColor: Colors.surfaceLight, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: Colors.cardBorder },
  qtyBadge: { minWidth: 26, height: 26, borderRadius: 13, backgroundColor: Colors.surfaceLight, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: Colors.cardBorder },
  qtyText: { color: Colors.text, fontSize: 13, fontWeight: "700", textAlign: "center" },
  cartEmpty: { alignItems: "center", paddingVertical: 28 },
  cartEmptyText: { color: Colors.textMuted, fontSize: 13, marginTop: 8, fontWeight: "600" },
  cartEmptySubtext: { color: Colors.textMuted, fontSize: 11, marginTop: 4 },
  cartSummary: { paddingHorizontal: 14, paddingVertical: 6, borderTopWidth: 1, borderColor: Colors.cardBorder },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  summaryLabel: { color: Colors.textSecondary, fontSize: 13 },
  summaryValue: { color: Colors.text, fontSize: 13, fontWeight: "600" },
  totalRow: { borderTopWidth: 1, borderColor: Colors.cardBorder, paddingTop: 10, marginTop: 6 },
  totalLabel: { color: Colors.text, fontSize: 22, fontWeight: "800" },
  totalValue: { color: Colors.accent, fontSize: 26, fontWeight: "800" },
  checkoutBtn: { marginHorizontal: 14, marginVertical: 7, borderRadius: 14, overflow: "hidden", elevation: 4, boxShadow: "0px 4px 8px rgba(124, 58, 237, 0.3)" },
  checkoutBtnDisabled: { opacity: 0.5, elevation: 0, boxShadow: "none" },
  checkoutBtnGradient: { paddingVertical: 12, paddingHorizontal: 16 },
  checkoutBtnInner: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  checkoutBtnLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  checkoutBtnPrice: { backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20 },
  checkoutBtnPriceText: { color: Colors.white, fontSize: 16, fontWeight: "800" },
  checkoutBtnText: { color: Colors.white, fontSize: 16, fontWeight: "700" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", alignItems: "center" },
  modalContent: { backgroundColor: Colors.surface, borderRadius: 20, padding: 24, width: "90%", maxWidth: 420, maxHeight: "80%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { color: Colors.text, fontSize: 20, fontWeight: "700" },
  modalTotal: { color: Colors.accent, fontSize: 36, fontWeight: "800", textAlign: "center", marginBottom: 16 },
  customerInfo: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: Colors.surfaceLight, borderRadius: 12, padding: 12, marginBottom: 16 },
  customerInfoText: { color: Colors.text, fontSize: 14, fontWeight: "600", flex: 1 },
  loyaltyBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(245,158,11,0.15)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  loyaltyBadgeText: { color: Colors.warning, fontSize: 12, fontWeight: "700" },
  sectionLabel: { color: Colors.textSecondary, fontSize: 13, fontWeight: "600", marginBottom: 8, textTransform: "uppercase" as const, letterSpacing: 1 },
  paymentMethods: { flexDirection: "row", gap: 8, marginBottom: 16, flexWrap: "wrap" },
  paymentBtn: { flex: 1, alignItems: "center", paddingVertical: 14, borderRadius: 14, backgroundColor: Colors.surfaceLight, borderWidth: 1, borderColor: Colors.cardBorder, gap: 4, minWidth: 70 },
  paymentBtnActive: { borderColor: Colors.accent, backgroundColor: "rgba(47,211,198,0.1)" },
  paymentBtnText: { color: Colors.textSecondary, fontSize: 11, fontWeight: "600" },
  cashSection: { marginBottom: 16 },
  cashInput: { backgroundColor: Colors.inputBg, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: Colors.text, fontSize: 18, fontWeight: "700", borderWidth: 1, borderColor: Colors.inputBorder, textAlign: "center" },
  changeText: { color: Colors.success, fontSize: 16, fontWeight: "700", textAlign: "center", marginTop: 8 },
  nfcPaySection: { alignItems: "center", paddingVertical: 20, gap: 10, marginBottom: 16 },
  nfcIconContainer: { width: 120, height: 120, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  nfcRing: { position: "absolute", borderRadius: 999, borderWidth: 2, borderColor: "rgba(47,211,198,0.15)" },
  nfcRingOuter: { width: 120, height: 120 },
  nfcRingMiddle: { width: 90, height: 90, borderColor: "rgba(47,211,198,0.25)" },
  nfcRingInner: { width: 60, height: 60, borderColor: "rgba(47,211,198,0.4)" },
  nfcCenterIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.accent, alignItems: "center", justifyContent: "center", transform: [{ rotate: "90deg" }] },
  nfcPayTitle: { color: Colors.text, fontSize: 18, fontWeight: "700" },
  nfcPaySubtitle: { color: Colors.textSecondary, fontSize: 13 },
  nfcPayAmount: { color: Colors.accent, fontSize: 28, fontWeight: "800" },
  nfcStatusBadge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(47,211,198,0.15)", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginTop: 4 },
  nfcStatusText: { color: Colors.accent, fontSize: 13, fontWeight: "600" },
  nfcBadge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(47,211,198,0.15)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  nfcText: { color: Colors.accent, fontSize: 13, fontWeight: "600" },
  cardInputSection: { backgroundColor: Colors.surfaceLight, borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: Colors.cardBorder },
  cardInputHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  cardInputTitle: { color: Colors.text, fontSize: 15, fontWeight: "700", flex: 1 },
  cardBrands: { flexDirection: "row", gap: 4 },
  cardBrand: { color: Colors.textMuted, fontSize: 10, fontWeight: "700", backgroundColor: Colors.surface, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: "hidden" },
  cardField: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.surface, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 0, borderWidth: 1, borderColor: Colors.cardBorder, marginBottom: 8, height: 48 },
  cardInput: { flex: 1, color: Colors.text, fontSize: 15, fontWeight: "500", height: 48 },
  cardRow: { flexDirection: "row", gap: 0 },
  cardErrorRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  cardErrorText: { color: Colors.danger, fontSize: 12, fontWeight: "500", flex: 1 },
  cardProcessingRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  cardProcessingText: { color: Colors.accent, fontSize: 12, fontWeight: "500" },
  cardSecureRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8, justifyContent: "center" },
  cardSecureText: { color: Colors.textMuted, fontSize: 11 },
  checkoutItem: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  checkoutItemName: { color: Colors.textSecondary, fontSize: 13 },
  checkoutItemTotal: { color: Colors.text, fontSize: 13, fontWeight: "600" },
  completeBtn: { borderRadius: 14, overflow: "hidden", marginTop: 8 },
  completeBtnGradient: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 16, gap: 8 },
  completeBtnText: { color: Colors.white, fontSize: 16, fontWeight: "700" },
  receiptHeader: { alignItems: "center", paddingVertical: 16 },
  receiptLogo: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.surfaceLight, justifyContent: "center", alignItems: "center", marginBottom: 8 },
  receiptStoreName: { color: Colors.text, fontSize: 18, fontWeight: "800", textAlign: "center" },
  receiptBrand: { color: Colors.text, fontSize: 18, fontWeight: "800" },
  receiptSubtitle: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  receiptDivider: { height: 1, backgroundColor: Colors.cardBorder, marginVertical: 12 },
  receiptInfo: { gap: 4 },
  receiptInfoText: { color: Colors.textSecondary, fontSize: 13 },
  receiptItem: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  receiptItemName: { color: Colors.text, fontSize: 14 },
  receiptItemTotal: { color: Colors.text, fontSize: 14, fontWeight: "600" },
  receiptTotals: { gap: 4 },
  receiptTotalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  receiptTotalLabel: { color: Colors.textSecondary, fontSize: 14 },
  receiptTotalValue: { color: Colors.text, fontSize: 14, fontWeight: "600" },
  receiptGrandLabel: { color: Colors.text, fontSize: 18, fontWeight: "800" },
  receiptGrandValue: { color: Colors.accent, fontSize: 20, fontWeight: "800" },
  qrSection: { alignItems: "center", paddingVertical: 16 },
  qrImage: { width: 160, height: 160, borderRadius: 8 },
  qrLabel: { color: Colors.textMuted, fontSize: 12, marginTop: 8 },
  receiptFooter: { color: Colors.textMuted, fontSize: 12, textAlign: "center", marginTop: 16 },
  receiptFooter2: { color: Colors.textMuted, fontSize: 11, textAlign: "center", marginTop: 4 },
  closeReceiptBtn: { borderRadius: 14, overflow: "hidden", marginTop: 16 },
  closeReceiptGradient: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 14, gap: 8 },
  closeReceiptText: { color: Colors.white, fontSize: 16, fontWeight: "700" },
  walkInBtn: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 12, backgroundColor: Colors.surfaceLight, marginBottom: 8 },
  walkInText: { color: Colors.textSecondary, fontSize: 14, fontWeight: "500" },
  customerCard: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 12, backgroundColor: Colors.surfaceLight, marginBottom: 6, borderWidth: 1, borderColor: "transparent" },
  customerCardActive: { borderColor: Colors.accent, backgroundColor: "rgba(47,211,198,0.1)" },
  customerAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.gradientMid, justifyContent: "center", alignItems: "center", marginRight: 10 },
  customerAvatarText: { color: Colors.white, fontSize: 14, fontWeight: "700" },
  customerCardInfo: { flex: 1 },
  customerCardName: { color: Colors.text, fontSize: 14, fontWeight: "600" },
  customerCardMeta: { color: Colors.textMuted, fontSize: 11, marginTop: 1 },
  customerLoyalty: { flexDirection: "row", alignItems: "center", gap: 4 },
  customerLoyaltyText: { color: Colors.warning, fontSize: 12, fontWeight: "700" },

  // Phone bar
  phoneBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderColor: Colors.cardBorder,
  },
  phoneBarInputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.inputBg,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
  },
  phoneBarInput: {
    flex: 1,
    color: Colors.text,
    fontSize: 14,
    fontWeight: "500",
  },
  phoneBarCustomer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.primary + "18",
    borderWidth: 1,
    borderColor: Colors.primary + "40",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
    minWidth: 0,
  },
  phoneBarAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  phoneBarAvatarText: { color: Colors.white, fontSize: 13, fontWeight: "700" },
  phoneBarCustomerInfo: { flex: 1, minWidth: 0 },
  phoneBarCustomerName: { color: Colors.white, fontSize: 13, fontWeight: "700" },
  phoneBarCustomerMeta: { flexDirection: "row", alignItems: "center", gap: 4, flexWrap: "nowrap" },
  phoneBarMetaText: { color: Colors.textMuted, fontSize: 11, flexShrink: 1 },
  phoneBarMetaDot: { color: Colors.textMuted, fontSize: 11 },
  phoneBarClear: { padding: 4, flexShrink: 0 },
  phoneBarWalkIn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: Colors.inputBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderStyle: "dashed" as const,
  },
  phoneBarWalkInText: { color: Colors.textMuted, fontSize: 13 },

  // Cart customer card
  cartCustomerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: Colors.primary + "30",
    backgroundColor: Colors.primary + "10",
  },
  cartCustomerAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  cartCustomerAvatarText: { color: Colors.white, fontSize: 14, fontWeight: "800" },
  cartCustomerBody: { flex: 1, minWidth: 0 },
  cartCustomerName: { color: Colors.white, fontSize: 13, fontWeight: "700", marginBottom: 3 },
  cartCustomerRow: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  cartCustomerChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: Colors.surface,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  cartCustomerChipText: { color: Colors.textMuted, fontSize: 10 },
  cartCustomerClear: { padding: 8 },

  // New customer form
  newCustLabel: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 14,
    marginBottom: 6,
    letterSpacing: 0.5,
    textTransform: "uppercase" as const,
  },
  newCustInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.inputBg,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
  },
  newCustInput: {
    flex: 1,
    color: Colors.text,
    fontSize: 15,
  },
  newCustSaveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    marginBottom: 8,
  },
  newCustSaveBtnText: { color: Colors.white, fontSize: 16, fontWeight: "700" },

  discountTypeRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  discountTypeBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: Colors.surfaceLight, alignItems: "center" },
  discountTypeBtnActive: { backgroundColor: Colors.accent },
  discountTypeBtnText: { color: Colors.textSecondary, fontSize: 14, fontWeight: "600" },
  callNotification: { position: "absolute", top: 100, left: 20, right: 20, zIndex: 1000, borderRadius: 16, overflow: "hidden", elevation: 8, boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.3)" },
  callGradient: { flexDirection: "row", alignItems: "center", padding: 16, gap: 12 },
  callIconWrap: { width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center" },
  callInfo: { flex: 1 },
  callTitle: { color: Colors.white, fontSize: 11, fontWeight: "600", opacity: 0.8 },
  callNumber: { color: Colors.white, fontSize: 18, fontWeight: "800" },
  callCustomer: { color: Colors.white, fontSize: 14, fontWeight: "600", marginTop: 2 },
  callActionBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center" },

  // Header Invoice & Avatar
  headerInvoiceBtn: { flexDirection: "row" as const, alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.15)", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16 },
  headerInvoiceLabel: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" as const },
  headerAvatarBtn: { padding: 2 },
  headerAvatarCircle: { width: 34, height: 34, borderRadius: 17, justifyContent: "center" as const, alignItems: "center" as const, borderWidth: 2, borderColor: "rgba(255,255,255,0.4)" },
  headerAvatarText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" as const },

  // Account Switcher
  switchCurrentAccount: { flexDirection: "row" as const, alignItems: "center", gap: 14, backgroundColor: Colors.surfaceLight, borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: Colors.accent + "30" },
  switchCurrentAvatar: { width: 50, height: 50, borderRadius: 25, justifyContent: "center" as const, alignItems: "center" as const },
  switchCurrentAvatarText: { color: "#FFFFFF", fontSize: 22, fontWeight: "800" as const },
  switchCurrentName: { color: Colors.text, fontSize: 17, fontWeight: "700" as const },
  switchCurrentRole: { color: Colors.textSecondary, fontSize: 13, fontWeight: "500" as const, textTransform: "capitalize" as const, marginTop: 2 },
  switchActiveBadge: { flexDirection: "row" as const, alignItems: "center", gap: 5, backgroundColor: Colors.success + "20", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  switchActiveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.success },
  switchActiveText: { color: Colors.success, fontSize: 12, fontWeight: "700" as const },
  switchSectionTitle: { color: Colors.textSecondary, fontSize: 13, fontWeight: "600" as const, textTransform: "uppercase" as const, letterSpacing: 1, marginBottom: 12 },
  switchEmployeeCard: { flexDirection: "row" as const, alignItems: "center", gap: 14, backgroundColor: Colors.surfaceLight, borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: Colors.cardBorder },
  switchEmployeeAvatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: "rgba(0,0,0,0.2)", justifyContent: "center" as const, alignItems: "center" as const, borderWidth: 2 },
  switchEmployeeAvatarText: { color: Colors.text, fontSize: 20, fontWeight: "700" as const },
  switchEmployeeName: { color: Colors.text, fontSize: 15, fontWeight: "600" as const, marginBottom: 4 },
  switchRoleBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, alignSelf: "flex-start" as const },
  switchRoleBadgeText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" as const, textTransform: "capitalize" as const },
  switchPinSection: { alignItems: "center" as const, paddingVertical: 10 },
  switchBackBtn: { alignSelf: "flex-start" as const, padding: 6, marginBottom: 8 },
  switchPinAvatar: { alignItems: "center" as const, marginBottom: 20 },
  switchPinAvatarCircle: { width: 70, height: 70, borderRadius: 35, justifyContent: "center" as const, alignItems: "center" as const, marginBottom: 10 },
  switchPinAvatarText: { color: "#FFFFFF", fontSize: 30, fontWeight: "800" as const },
  switchPinName: { color: Colors.text, fontSize: 20, fontWeight: "700" as const },
  switchPinLabel: { color: Colors.textSecondary, fontSize: 14, fontWeight: "500" as const, marginBottom: 20 },
  switchPinDots: { flexDirection: "row" as const, gap: 18, marginBottom: 24 },
  switchDot: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: Colors.cardBorder, backgroundColor: "transparent" },
  switchDotFilled: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  switchErrorRow: { flexDirection: "row" as const, alignItems: "center", gap: 6, marginBottom: 12 },
  switchErrorText: { color: Colors.danger, fontSize: 13, fontWeight: "500" as const },
  switchKeypad: { flexDirection: "row" as const, flexWrap: "wrap" as const, width: 260, justifyContent: "center" as const },
  switchKeyBtn: { width: 260 / 3, height: 58, justifyContent: "center" as const, alignItems: "center" as const },
  switchKeyText: { color: Colors.text, fontSize: 26, fontWeight: "600" as const },
  modalCloseBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.05)", justifyContent: "center", alignItems: "center" },
  variantBtn: { borderRadius: 18, backgroundColor: Colors.surfaceLight, borderWidth: 1, borderColor: Colors.cardBorder, overflow: "hidden" as const, elevation: 4, boxShadow: "0px 2px 4px rgba(0,0,0,0.2)" },
  variantBtnInner: { flexDirection: "row" as const, alignItems: "center", justifyContent: "space-between", padding: 16 },
  variantIconCircle: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(47, 211, 198, 0.1)", justifyContent: "center" as const, alignItems: "center" as const },
  variantBtnName: { color: Colors.white, fontSize: 16, fontWeight: "700" as const },
  variantPriceTag: { backgroundColor: "rgba(47, 211, 198, 0.15)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  variantBtnPrice: { color: Colors.accent, fontSize: 16, fontWeight: "800" as const },
  // Size grid cards
  sizeCard: {
    flex: 1, minWidth: 120,
    paddingVertical: 14, paddingHorizontal: 12,
    borderRadius: 12, borderWidth: 2,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.surfaceLight,
    alignItems: "center" as const,
  },
  sizeCardSelected: {
    borderColor: Colors.accent,
    backgroundColor: "rgba(47,211,198,0.08)",
  },
  sizeCardName: { color: Colors.white, fontSize: 15, fontWeight: "700" as const, marginBottom: 4 },
  sizeCardPrice: { color: Colors.accent, fontSize: 13, fontWeight: "600" as const },
  // Toppings list
  selectedSizeBadge: {
    flexDirection: "row" as const, alignItems: "center", gap: 6,
    backgroundColor: "rgba(47,211,198,0.1)",
    borderWidth: 1, borderColor: "rgba(47,211,198,0.3)",
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, alignSelf: "flex-start" as const,
  },
  selectedSizeBadgeText: { color: Colors.accent, fontSize: 12, fontWeight: "600" as const },
  toppingRow: {
    flexDirection: "row" as const, alignItems: "center", gap: 12,
    paddingVertical: 10, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)",
  },
  toppingRowSelected: { backgroundColor: "rgba(47,211,198,0.06)", borderRadius: 10, borderBottomColor: "transparent" },
  toppingIconWrap: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: Colors.surfaceLight,
    justifyContent: "center" as const, alignItems: "center" as const,
  },
  toppingName: { color: Colors.text, fontSize: 14, fontWeight: "500" as const },
  toppingPrice: { color: Colors.textMuted, fontSize: 11, marginTop: 1 },
  toppingCheckbox: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 2, borderColor: Colors.cardBorder,
    justifyContent: "center" as const, alignItems: "center" as const,
  },
  toppingCheckboxSelected: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  modalCancelBtn: { marginTop: 24, paddingVertical: 14, borderRadius: 16, borderWidth: 1, borderColor: Colors.cardBorder, alignItems: "center" as const },
  modalCancelBtnText: { color: Colors.textMuted, fontSize: 15, fontWeight: "600" as const },
});
