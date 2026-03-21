import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "expo-router";
import {
  StyleSheet, Text, View, FlatList, Pressable, TextInput,
  ScrollView, Modal, Alert, Platform, Dimensions, Image,
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
import * as Haptics from "expo-haptics";
import BarcodeScanner from "@/components/BarcodeScanner";
import RealTimeClock from "@/components/RealTimeClock";
import { useLanguage } from "@/lib/language-context";
import { useNotifications } from "@/lib/notification-context";

const AnimatedProductImage = ({ uri }: { uri: string }) => {
  return (
    <Image
      source={{ uri }}
      style={{ width: 34, height: 34, borderRadius: 8 }}
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
  const [cardNumber, setCardNumber] = useState("");
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
  const [endOfDayLoading, setEndOfDayLoading] = useState(false);

  const { onlineOrderNotification, setOnlineOrderNotification, incomingCalls, setIncomingCalls, dismissCall } = useNotifications();

  const tenantId = tenant?.id;

  // Track which call IDs have already been auto-processed so we don't re-run on re-renders
  const processedCallIds = useRef<Set<string>>(new Set());
  // Store caller's full customer object directly (faster than waiting for customers list)
  const [callerCustomer, setCallerCustomer] = useState<any>(null);

  // Only handle auto-dismisses now, we don't auto-assign until checkmark is clicked
  useEffect(() => {
    if (incomingCalls.length === 0) return;
    incomingCalls.forEach((call) => {
      const callId = String(call.id);
      if (processedCallIds.current.has(callId)) return;
      processedCallIds.current.add(callId);

      // Auto-dismiss the popup after 15 seconds
      setTimeout(() => {
        dismissCall(callId, call.slot);
      }, 15000);
    });
  }, [incomingCalls]);

  const PIZZA_TOPPINGS: { name: string; icon: string }[] = [
    { name: "Tomatoes", icon: "🍅" },
    { name: "Sliced tomatoes", icon: "🍅" },
    { name: "Garlic", icon: "🧄" },
    { name: "Onions", icon: "🧅" },
    { name: "Capers", icon: "🌿" },
    { name: "Olives", icon: "🫒" },
    { name: "Oregano", icon: "🌿" },
    { name: "Vegetables", icon: "🥦" },
    { name: "Spinach", icon: "🥬" },
    { name: "Pepperoni", icon: "🍕" },
    { name: "Corn", icon: "🌽" },
    { name: "Broccoli", icon: "🥦" },
    { name: "Artichokes", icon: "🌿" },
    { name: "Arugula", icon: "🥬" },
    { name: "Pineapple", icon: "🍍" },
    { name: "Mushrooms", icon: "🍄" },
    { name: "Ham", icon: "🥩" },
    { name: "Spicy salami", icon: "🌶️" },
    { name: "Salami", icon: "🥩" },
    { name: "Bacon", icon: "🥓" },
    { name: "Prosciutto", icon: "🥩" },
    { name: "Lamb", icon: "🥩" },
    { name: "Chicken", icon: "🍗" },
    { name: "Kebab", icon: "🥙" },
    { name: "Minced Meat", icon: "🥩" },
    { name: "Mayonnaise", icon: "🫙" },
    { name: "Anchovies", icon: "🐟" },
    { name: "Shrimp", icon: "🍤" },
    { name: "Tuna", icon: "🐟" },
    { name: "Ketchup", icon: "🫙" },
    { name: "Mozzarella", icon: "🧀" },
    { name: "Gorgonzola", icon: "🧀" },
    { name: "Parmesan", icon: "🧀" },
    { name: "Mascarpone", icon: "🧀" },
    { name: "Kaeserand", icon: "🧀" },
    { name: "Cocktail Sauce", icon: "🫙" },
    { name: "Spicy Sauce", icon: "🌶️" },
    { name: "Yogurt Sauce", icon: "🫙" },
    { name: "Bell Peppers", icon: "🫑" },
  ];

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

  const { data: allEmployees = [] } = useQuery<any[]>({
    queryKey: ["/api/employees", tenantId ? `?tenantId=${tenantId}` : ""],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: showAccountSwitcher && !!tenantId,
  });

  const { data: customers = [] } = useQuery<any[]>({
    queryKey: [`/api/customers?tenantId=${tenantId}`],
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

  const { data: myShifts = [] } = useQuery<any[]>({
    queryKey: [tenantId ? `/api/shifts?tenantId=${tenantId}` : "/api/shifts"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!tenantId && showAccountSwitcher,
  });
  const myActiveShift = (myShifts as any[]).find((s: any) => s.employeeId === employee?.id && !s.endTime && s.status === "open");

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
      const printWindow = window.open("", "_blank", "width=380,height=600");
      if (printWindow) {
        const inv = selectedInvoice;
        const itemsHtml = (inv.items || []).map((item: any) =>
          `<tr><td style="text-align:left">${item.productName || item.name}</td><td style="text-align:center">x${item.quantity}</td><td style="text-align:right">CHF ${Number(item.total || (item.unitPrice * item.quantity)).toFixed(2)}</td></tr>`
        ).join("");
        printWindow.document.write(`<html><head><title>Receipt ${inv.receiptNumber || inv.id}</title><style>body{font-family:'Courier New',monospace;font-size:12px;width:300px;margin:0 auto;padding:20px}table{width:100%;border-collapse:collapse}td{padding:2px 0}.center{text-align:center}.right{text-align:right}.bold{font-weight:bold}.line{border-top:1px dashed #000;margin:8px 0}.dbl{border-top:2px solid #000;margin:8px 0}</style></head><body>`);
        printWindow.document.write(`<div class="dbl"></div><p class="center bold" style="font-size:16px">${storeSettings?.name || tenant?.name || "POS System"}</p>`);
        if (storeSettings?.address) printWindow.document.write(`<p class="center">${storeSettings.address}</p>`);
        if (storeSettings?.phone) printWindow.document.write(`<p class="center">${storeSettings.phone}</p>`);
        printWindow.document.write(`<div class="line"></div>`);
        printWindow.document.write(`<p>${t("receiptDate")}: ${new Date(inv.createdAt || inv.date).toLocaleDateString()} ${new Date(inv.createdAt || inv.date).toLocaleTimeString()}</p>`);
        printWindow.document.write(`<p>${t("receiptNumber")}: ${inv.receiptNumber || "#" + inv.id}</p>`);
        printWindow.document.write(`<div class="line"></div>`);
        printWindow.document.write(`<table>${itemsHtml}</table>`);
        printWindow.document.write(`<div class="line"></div>`);
        printWindow.document.write(`<table><tr><td>${t("subtotal")}:</td><td class="right">CHF ${Number(inv.subtotal || inv.totalAmount).toFixed(2)}</td></tr>`);
        if (Number(inv.discount) > 0) printWindow.document.write(`<tr><td>${t("discount")}:</td><td class="right">-CHF ${Number(inv.discount).toFixed(2)}</td></tr>`);
        if (Number(inv.serviceFeeAmount) > 0) printWindow.document.write(`<tr><td>${t("serviceTax" as any) || "Service Tax"}:</td><td class="right">CHF ${Number(inv.serviceFeeAmount).toFixed(2)}</td></tr>`);
        printWindow.document.write(`<tr><td>${t("tax")}:</td><td class="right">CHF ${Number(inv.taxAmount || inv.tax || 0).toFixed(2)}</td></tr></table>`);
        printWindow.document.write(`<div class="dbl"></div>`);
        printWindow.document.write(`<table><tr><td class="bold" style="font-size:14px">TOTAL:</td><td class="right bold" style="font-size:14px">CHF ${Number(inv.totalAmount).toFixed(2)}</td></tr></table>`);
        printWindow.document.write(`<div class="dbl"></div>`);
        printWindow.document.write(`<p>${t("paymentMethod")}: ${(inv.paymentMethod || "cash").toUpperCase()}</p>`);
        printWindow.document.write(`<p class="center bold" style="margin-top:16px">${t("thankYou")}</p>`);
        printWindow.document.write(`<div class="dbl"></div></body></html>`);
        printWindow.document.close();
        printWindow.print();
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
    apiRequest("POST", "/api/seed").catch(() => { });

    // Redirect to onboarding if not completed
    if (tenant && tenant.setupCompleted === false) {
      router.replace("/onboarding" as any);
    }
  }, [tenant]);

  /* Removed local WebSocket logic in favor of global NotificationProvider */

  const filteredProducts = products.filter((p: any) => {
    const matchesCategory = selectedCategory ? p.categoryId === selectedCategory : true;
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

  const autoPrint3Copies = (saleData: any, cartItems: typeof cart.items, cartSubtotal: number, cartTax: number, cartDiscount: number, cartServiceFee: number, cartTotal: number, cartDeliveryFee: number, pmMethod: string, cashAmt: number, custName: string, empName: string) => {
    if (Platform.OS !== "web") return;
    const printWin = window.open("", "_blank", "width=420,height=700");
    if (!printWin) return;
    const storeName = storeSettings?.name || tenant?.name || "POS System";
    const storeAddr = storeSettings?.address || "";
    const storePhone = storeSettings?.phone || "";
    const receiptNum = saleData?.receiptNumber || `#${saleData?.id}`;
    const dateStr = new Date().toLocaleDateString();
    const timeStr = new Date().toLocaleTimeString();
    const itemsHtml = cartItems.map((i) =>
      `<tr><td>${i.name}</td><td style="text-align:center">x${i.quantity}</td><td style="text-align:right">CHF ${(i.price * i.quantity).toFixed(2)}</td></tr>`
    ).join("");
    const kitchenItemsHtml = cartItems.map((i) =>
      `<tr><td style="font-size:14px;font-weight:bold">${i.name}</td><td style="text-align:center;font-size:14px;font-weight:bold">x${i.quantity}</td></tr>`
    ).join("");
    const deliveryRow = cartDeliveryFee > 0 ? `<tr><td>Delivery:</td><td class="right">CHF ${cartDeliveryFee.toFixed(2)}</td></tr>` : "";
    const serviceFeeRow = cartServiceFee > 0 ? `<tr><td>${t("serviceTax" as any) || "Service Tax"}:</td><td class="right">CHF ${cartServiceFee.toFixed(2)}</td></tr>` : "";
    const changeRow = pmMethod === "cash" && cashAmt > cartTotal ? `<tr><td>Change:</td><td class="right">CHF ${(cashAmt - cartTotal).toFixed(2)}</td></tr>` : "";

    const fullReceipt = (copyLabel: string) => `
<div class="receipt">
  <p class="center label">${copyLabel}</p>
  <p class="center bold big">${storeName}</p>
  ${storeAddr ? `<p class="center small">${storeAddr}</p>` : ""}
  ${storePhone ? `<p class="center small">${storePhone}</p>` : ""}
  <div class="dline"></div>
  <p class="small">Date: ${dateStr} ${timeStr}</p>
  <p class="small">Receipt: ${receiptNum}</p>
  <p class="small">Cashier: ${empName}</p>
  <p class="small">Customer: ${custName}</p>
  <div class="line"></div>
  <table width="100%"><thead><tr><th style="text-align:left">Item</th><th>Qty</th><th style="text-align:right">Total</th></tr></thead><tbody>${itemsHtml}</tbody></table>
  <div class="line"></div>
  <table width="100%">
    <tr><td>Subtotal:</td><td class="right">CHF ${cartSubtotal.toFixed(2)}</td></tr>
    ${cartDiscount > 0 ? `<tr><td>Discount:</td><td class="right">-CHF ${cartDiscount.toFixed(2)}</td></tr>` : ""}
    ${serviceFeeRow}
    <tr><td>Tax:</td><td class="right">CHF ${cartTax.toFixed(2)}</td></tr>
    ${deliveryRow}
  </table>
  <div class="dline"></div>
  <table width="100%"><tr><td class="bold big">TOTAL:</td><td class="right bold big">CHF ${cartTotal.toFixed(2)}</td></tr></table>
  <div class="dline"></div>
  <p class="small">Payment: ${pmMethod.toUpperCase()}</p>
  ${changeRow ? `<table width="100%">${changeRow}</table>` : ""}
  <p class="center bold" style="margin-top:12px">Thank you!</p>
</div>`;

    const kitchenReceipt = `
<div class="receipt">
  <p class="center label">*** KITCHEN ORDER ***</p>
  <p class="center bold big">${storeName}</p>
  <div class="dline"></div>
  <p class="small">Date: ${dateStr} ${timeStr}</p>
  <p class="small">Receipt: ${receiptNum}</p>
  ${pmMethod === "delivery" ? `<p class="bold" style="font-size:14px;text-align:center">⚡ DELIVERY ORDER ⚡</p>` : ""}
  <div class="line"></div>
  <table width="100%"><tbody>${kitchenItemsHtml}</tbody></table>
  <div class="dline"></div>
  <p class="center bold" style="font-size:14px">-- Prepare Now --</p>
</div>`;

    printWin.document.write(`<html><head><title>Receipt</title><style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:'Courier New',monospace;font-size:11px;width:300px;margin:0 auto}
      .receipt{padding:12px;margin-bottom:4px}
      .center{text-align:center}.right{text-align:right}.bold{font-weight:bold}.big{font-size:14px}.small{font-size:10px}
      .label{font-size:12px;font-weight:bold;border:1px solid #000;padding:2px 8px;display:inline-block;margin:0 auto 6px auto}
      .line{border-top:1px dashed #000;margin:6px 0}.dline{border-top:2px solid #000;margin:6px 0}
      table{width:100%;border-collapse:collapse}td,th{padding:2px 0}
      @media print{.pagebreak{page-break-after:always}}
    </style></head><body>`);
    printWin.document.write(fullReceipt("★ CUSTOMER COPY ★"));
    printWin.document.write(`<div class="pagebreak"></div>`);
    printWin.document.write(fullReceipt("★ RESTAURANT / DELIVERY COPY ★"));
    printWin.document.write(`<div class="pagebreak"></div>`);
    printWin.document.write(kitchenReceipt);
    printWin.document.write("</body></html>");
    printWin.document.close();
    printWin.print();
  };

  const completeSaleAfterPayment = (saleData: any) => {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const saleItems = cart.items.map((i) => ({ name: i.name, quantity: i.quantity, price: i.price, total: i.price * i.quantity }));
    const custName = selectedCustomer?.name || t("walkIn");
    const empName = employee?.name || "Staff";
    const cashAmt = Number(cashReceived) || 0;
    // Auto-print 3 copies on web
    autoPrint3Copies(
      saleData, cart.items, cart.subtotal, cart.tax, cart.discount, cart.serviceFee, cart.total, cart.deliveryFee,
      paymentMethod, cashAmt, custName, empName
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
    generateQR(`barmagly:receipt:${saleData.receiptNumber || saleData.id}`);
    cart.clearCart();
    setPhoneInput("");
    setCallerCustomer(null);
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
    };
    if (stripePaymentId) {
      data.notes = `Stripe: ${stripePaymentId}`;
    }
    const res = await apiRequest("POST", "/api/sales", data);
    return await res.json();
  };

  const validateBeforeComplete = (): string | null => {
    // Cash payment: must have received enough
    if (paymentMethod === "cash") {
      if (!cashReceived || Number(cashReceived) < cart.total) {
        return t("insufficientCash" as any) || "Cash received must be at least the total amount";
      }
    }
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
    // Non-cash: confirm payment received
    if (paymentMethod !== "cash" && paymentMethod !== "card" && paymentMethod !== "nfc" && !paymentConfirmed) {
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
      if (paymentMethod === "nfc") {
        setNfcStatus("reading");
        try {
          const amountInCents = Math.round(cart.total * 100);
          const chargeRes = await apiRequest("POST", "/api/stripe/pos-charge", {
            amount: amountInCents,
            currency: "chf",
            token: "tok_visa",
            metadata: {
              employeeId: String(employee?.id || 1),
              branchId: String(employee?.branchId || 1),
              source: "barmagly-pos-nfc",
              paymentType: "contactless",
            },
          });
          const chargeData = await chargeRes.json();
          if (!chargeRes.ok || !chargeData.success) {
            setNfcStatus("error");
            throw new Error(chargeData.error || t("cardDeclined"));
          }
          setNfcStatus("success");
          if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          const saleData = await createSale("card", chargeData.paymentIntentId);
          return saleData;
        } catch (err: any) {
          setNfcStatus("error");
          throw err;
        }
      }

      if (paymentMethod === "card") {
        setCardProcessing(true);
        setCardError("");
        try {
          const num = cardNumber.replace(/\s/g, "");
          const testCardTokens: Record<string, string> = {
            "4242424242424242": "tok_visa",
            "5555555555554444": "tok_mastercard",
            "378282246310005": "tok_amex",
            "4000056655665556": "tok_visa_debit",
            "4000000000009995": "tok_chargeDeclined",
            "4000000000000002": "tok_chargeDeclined",
          };
          const token = testCardTokens[num] || "tok_visa";
          const amountInCents = Math.round(cart.total * 100);
          const chargeRes = await apiRequest("POST", "/api/stripe/pos-charge", {
            amount: amountInCents,
            currency: "chf",
            token,
            metadata: {
              employeeId: String(employee?.id || 1),
              branchId: String(employee?.branchId || 1),
              source: "barmagly-pos",
              cardLast4: num.slice(-4),
            },
          });
          const chargeData = await chargeRes.json();
          if (!chargeRes.ok || !chargeData.success) {
            throw new Error(chargeData.error || t("cardDeclined"));
          }
          setCardProcessing(false);
          const saleData = await createSale("card", chargeData.paymentIntentId);
          return saleData;
        } catch (err: any) {
          setCardProcessing(false);
          setCardError(err.message || t("cardDeclined"));
          throw err;
        }
      }

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
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [cart, isPizzaProduct]);

  const handleBarcodeScan = useCallback(async (barcode: string) => {
    try {
      const res = await apiRequest("GET", `/api/products/barcode/${encodeURIComponent(barcode)}`);
      const product = await res.json();
      if (product && product.id) {
        cart.addItem({ id: product.id, name: product.name, price: Number(product.price) });
        if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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

  const topPad = Platform.OS === "web" ? 67 : 0;

  const handleSwitchAccount = async (pinCode: string) => {
    if (!switchTarget) return;
    setSwitchLoading(true);
    setSwitchError("");
    try {
      const res = await apiRequest("POST", "/api/employees/login", { pin: pinCode, employeeId: switchTarget.id });
      const emp = await res.json();
      cart.clearCart();
      login(emp);
      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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
            printWindow.document.write(`<html><head><title>Daily Invoices</title><style>body{font-family:'Courier New',monospace;font-size:12px;width:300px;margin:0 auto;padding:20px}table{width:100%;border-collapse:collapse}td{padding:2px 0}.center{text-align:center}.right{text-align:right}.bold{font-weight:bold}.line{border-top:1px dashed #000;margin:8px 0}.dbl{border-top:2px solid #000;margin:8px 0}.page-break{page-break-after:always;border-bottom:1px solid #ccc;margin:20px 0}</style></head><body>`);
            fullSales.forEach((inv, index) => {
              const itemsHtml = (inv.items || []).map((item: any) =>
                `<tr><td style="text-align:left">${item.productName || item.name}</td><td style="text-align:center">x${item.quantity}</td><td style="text-align:right">CHF ${Number(item.total || (item.unitPrice * item.quantity)).toFixed(2)}</td></tr>`
              ).join("");

              printWindow.document.write(`<div class="dbl"></div><p class="center bold" style="font-size:16px">${storeSettings?.name || tenant?.name || "POS System"}</p>`);
              printWindow.document.write(`<p class="center">${new Date(inv.createdAt || inv.date).toLocaleString()}</p>`);
              printWindow.document.write(`<p class="center">${t("receiptNumber")}: ${inv.receiptNumber || "#" + inv.id}</p>`);
              printWindow.document.write(`<div class="line"></div><table>${itemsHtml}</table><div class="line"></div>`);
              printWindow.document.write(`<table><tr><td class="bold">TOTAL:</td><td class="right bold">CHF ${Number(inv.totalAmount).toFixed(2)}</td></tr></table>`);
              if (index < fullSales.length - 1) {
                printWindow.document.write(`<div class="page-break"></div>`);
              }
            });
            printWindow.document.write(`</body></html>`);
            printWindow.document.close();
            printWindow.print();
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
      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
              <Pressable onPress={() => setShowOnlineOrders(true)} style={[styles.headerInvoiceBtn, { position: "relative" }]}>
                <Ionicons name="globe-outline" size={28} color={Colors.white} />
                <Text style={styles.headerInvoiceLabel}>{language === "ar" ? "طلبات" : language === "de" ? "Online" : "Orders"}</Text>
                {onlineOrderNotification && (
                  <View style={{ position: "absolute", top: -2, right: -2, width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.danger }} />
                )}
              </Pressable>
              <Pressable onPress={handleEndOfDay} style={styles.headerInvoiceBtn} disabled={endOfDayLoading}>
                <Ionicons name="power-outline" size={28} color={endOfDayLoading ? Colors.textMuted : Colors.danger} />
                <Text style={[styles.headerInvoiceLabel, { color: endOfDayLoading ? Colors.textMuted : Colors.danger }]}>{t("endOfDay")}</Text>
              </Pressable>
              <Pressable onPress={() => setShowInvoiceHistory(true)} style={styles.headerInvoiceBtn}>
                <Ionicons name="receipt-outline" size={28} color={Colors.white} />
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
                onPress={() => { incomingCalls.forEach(c => dismissCall(c.id, c.slot)); }}
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
                    <Text style={[styles.callNumber, { fontSize: idx === 0 ? 18 : 14, fontWeight: "700" }]}>{call.phoneNumber}</Text>
                    <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 4, marginTop: 2 }}>
                      <Ionicons name="person-circle" size={14} color="rgba(255,255,255,0.95)" />
                      <Text style={[styles.callCustomer, { fontSize: idx === 0 ? 15 : 12, fontWeight: "800" }]}>
                        {call.customer.name}
                      </Text>
                    </View>
                    {call.customer.address ? (
                      <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 10, marginTop: 2 }} numberOfLines={1}>
                        {call.customer.address}
                      </Text>
                    ) : null}
                    {call.customer.visitCount ? (
                      <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 10, marginTop: 1 }}>
                        {language === "ar" ? `${call.customer.visitCount} زيارة` : language === "de" ? `${call.customer.visitCount} Besuche` : `${call.customer.visitCount} visits`}
                        {call.customer.totalSpent ? ` · CHF ${Number(call.customer.totalSpent).toFixed(0)}` : ""}
                      </Text>
                    ) : null}
                  </>
                ) : (
                  <>
                    <Text style={[styles.callNumber, { fontSize: idx === 0 ? 18 : 14, fontWeight: "700" }]}>{call.phoneNumber}</Text>
                    <Text style={[styles.callCustomer, { fontSize: idx === 0 ? 13 : 11, opacity: 0.8, marginTop: 2 }]}>
                      {language === "ar" ? "عميل غير معروف" : language === "de" ? "Unbekannt" : "Unknown"}
                    </Text>
                  </>
                )}
              </View>
              <View style={{ flexDirection: "row", gap: 6 }}>
                <Pressable
                  style={[styles.callActionBtn, { backgroundColor: "rgba(255,255,255,0.25)" }]}
                  onPress={() => {
                    if (call.customer) {
                      cart.setCustomerId(call.customer.id);
                      setCallerCustomer(call.customer);
                      setPhoneInput(call.customer.phone || call.phoneNumber);
                    } else {
                      setPhoneInput(call.phoneNumber);
                      if (call.phoneNumber.trim()) {
                        handlePhoneSearch(call.phoneNumber);
                      }
                    }
                    dismissCall(call.id, call.slot);
                  }}
                >
                  <Ionicons name="checkmark" size={18} color={Colors.white} />
                </Pressable>
                <Pressable
                  style={[styles.callActionBtn, { backgroundColor: Colors.danger }]}
                  onPress={() => {
                    dismissCall(call.id, call.slot);
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

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesRow} contentContainerStyle={styles.categoriesContent}>
            <Pressable
              style={[styles.categoryChip, styles.categoryChipAll, !selectedCategory && styles.categoryChipAllActive]}
              onPress={() => setSelectedCategory(null)}
            >
              <LinearGradient
                colors={!selectedCategory ? [Colors.gradientStart, Colors.accent] : ["transparent", "transparent"]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.categoryChipGradient}
              >
                <Ionicons name="grid" size={22} color={!selectedCategory ? Colors.white : Colors.accent} />
                <Text style={[styles.categoryChipText, !selectedCategory && styles.categoryChipTextAll]}>{t("allCategories")}</Text>
              </LinearGradient>
            </Pressable>
            {tenantCategories.map((cat: any) => {
              const isActive = selectedCategory === cat.id;
              const iconName = (cat.icon || "cube") as keyof typeof Ionicons.glyphMap;
              return (
                <Pressable
                  key={cat.id}
                  style={[styles.categoryChip, isActive && { borderColor: cat.color || Colors.accent, backgroundColor: `${cat.color || Colors.accent} 18` }]}
                  onPress={() => setSelectedCategory(isActive ? null : cat.id)}
                >
                  <View style={styles.categoryChipInner}>
                    <View style={[styles.categoryDot, { backgroundColor: cat.color || Colors.accent }]} />
                    <Ionicons name={iconName} size={22} color={isActive ? (cat.color || Colors.accent) : Colors.textSecondary} />
                    <Text style={[styles.categoryChipText, isActive && { color: cat.color || Colors.accent }]}>{cat.name}</Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>

          <FlatList
            data={filteredProducts}
            numColumns={isTablet ? 4 : 3}
            key={isTablet ? "tablet" : "phone"}
            keyExtractor={(item: any) => String(item.id)}
            contentContainerStyle={styles.productGrid}
            scrollEnabled={!!filteredProducts.length}
            renderItem={({ item }: { item: any }) => {
              const cat = categories.find((c: any) => c.id === item.categoryId);
              const catColor = cat?.color || Colors.accent;
              const catIcon = (cat?.icon || "cube") as keyof typeof Ionicons.glyphMap;
              return (
                <Pressable style={styles.productCard} onPress={() => handleAddToCart(item)}>
                  <View style={[styles.productCardTopBorder, { backgroundColor: catColor }]} />
                  <View style={[styles.productIcon, { backgroundColor: `${catColor} 15` }]}>
                    {item.image ? (
                      <AnimatedProductImage uri={item.image.startsWith("http") || item.image.startsWith("file://") || item.image.startsWith("data:") ? item.image : `${getApiUrl().replace(/\/$/, "")}${item.image}`} />
                    ) : (
                      <Ionicons name={catIcon} size={26} color={catColor} />
                    )}
                  </View>
                  <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
                  <Text style={styles.productPrice}>CHF {Number(item.price).toFixed(2)}</Text>
                  {tenant?.storeType !== "restaurant" && item.trackInventory && (
                    <Text style={[styles.barcodeText, { color: Colors.textSecondary }]}>Stock: {item.quantity || 0}</Text>
                  )}
                  {item.barcode ? <Text style={styles.barcodeText}>{item.barcode}</Text> : null}
                  <View style={[styles.productAddBadge, { backgroundColor: `${catColor} 20` }]}>
                    <Ionicons name="add" size={14} color={catColor} />
                  </View>
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
                <Ionicons name="close" size={16} color={Colors.textMuted} />
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

          <FlatList
            data={cart.items}
            keyExtractor={(item) => String(item.productId)}
            scrollEnabled={!!cart.items.length}
            style={styles.cartList}
            renderItem={({ item }) => (
              <View style={[styles.cartItem, isRTL && { flexDirection: "row-reverse" }]}>
                <View style={styles.cartItemInfo}>
                  <Text style={[styles.cartItemName, rtlTextAlign]} numberOfLines={1}>{item.name}</Text>
                  <Text style={[styles.cartItemPrice, rtlTextAlign]}>CHF {(item.price * item.quantity).toFixed(2)}</Text>
                </View>
                <View style={[styles.cartItemActions, isRTL && { flexDirection: "row-reverse" }]}>
                  <Pressable style={styles.qtyBtn} onPress={() => cart.updateQuantity(item.id, item.quantity - 1)}>
                    <Ionicons name="remove" size={16} color={Colors.text} />
                  </Pressable>
                  <Text style={styles.qtyText}>{item.quantity}</Text>
                  <Pressable style={styles.qtyBtn} onPress={() => cart.updateQuantity(item.id, item.quantity + 1)}>
                    <Ionicons name="add" size={16} color={Colors.text} />
                  </Pressable>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.cartEmpty}>
                <Ionicons name="cart-outline" size={40} color={Colors.textMuted} />
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

          <Pressable
            style={[styles.checkoutBtn, !cart.items.length && styles.checkoutBtnDisabled]}
            onPress={() => cart.items.length > 0 && setShowCheckout(true)}
            disabled={!cart.items.length}
          >
            <LinearGradient
              colors={cart.items.length > 0 ? [Colors.gradientStart, Colors.gradientMid, Colors.accent] : ["#333", "#444", "#555"]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.checkoutBtnGradient}
            >
              <View style={[styles.checkoutBtnInner, isRTL && { flexDirection: "row-reverse" }]}>
                <View style={[styles.checkoutBtnLeft, isRTL && { flexDirection: "row-reverse" }]}>
                  <Ionicons name="card" size={20} color={Colors.white} />
                  <Text style={styles.checkoutBtnText}>{t("checkout")}</Text>
                </View>
                <View style={styles.checkoutBtnPrice}>
                  <Text style={styles.checkoutBtnPriceText}>CHF {cart.total.toFixed(2)}</Text>
                </View>
              </View>
            </LinearGradient>
          </Pressable>
        </View>
      </View>

      <Modal visible={!!selectedProductForOptions} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxWidth: 420, padding: 28, maxHeight: "88%" }]}>
            <View style={[styles.modalHeader, isRTL && { flexDirection: "row-reverse" }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, rtlTextAlign, { fontSize: 22, fontWeight: "900" }]}>{selectedProductForOptions?.name}</Text>
                <Text style={[styles.sectionLabel, { marginTop: 4, marginBottom: 0 }, rtlTextAlign]}>
                  {showToppingsStep ? "Select Toppings" : (t("selectSize" as any) || "Select Size")}
                </Text>
              </View>
              <Pressable onPress={() => { setSelectedProductForOptions(null); setSelectedVariant(null); setSelectedToppings([]); setShowToppingsStep(false); }} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color={Colors.textMuted} />
              </Pressable>
            </View>

            {!showToppingsStep ? (
              /* ── SIZE SELECTION: 2-column grid ── */
              <View style={{ marginTop: 16, gap: 10 }}>
                <Text style={[styles.sectionLabel, { marginBottom: 4 }]}>
                  {language === "ar" ? "اختر الحجم" : language === "de" ? "Größe wählen" : "CHOOSE SIZE"}
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                  {selectedProductForOptions?.variants?.map((v: any, idx: number) => (
                    <Pressable
                      key={idx}
                      style={[styles.sizeCard, idx === 0 && styles.sizeCardSelected]}
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
                          if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setSelectedProductForOptions(null);
                        }
                      }}
                    >
                      <Text style={styles.sizeCardName}>{v.name}</Text>
                      <Text style={styles.sizeCardPrice}>CHF {Number(v.price).toFixed(2)}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : (
              /* ── TOPPINGS: icon list with checkbox ── */
              <ScrollView style={{ marginTop: 4 }} showsVerticalScrollIndicator={false}>
                {/* Selected size badge */}
                <View style={styles.selectedSizeBadge}>
                  <Ionicons name="pizza-outline" size={14} color={Colors.accent} />
                  <Text style={styles.selectedSizeBadgeText}>
                    {selectedVariant?.name} — CHF {Number(selectedVariant?.price).toFixed(2)}
                  </Text>
                </View>
                <Text style={[styles.sectionLabel, { marginBottom: 8, marginTop: 10 }]}>
                  {language === "ar" ? "إضافات اختيارية" : language === "de" ? "EXTRA BELÄGE (OPTIONAL)" : "EXTRA TOPPINGS (OPTIONAL)"}
                </Text>
                <View style={{ gap: 2 }}>
                  {(() => {
                    // Use product modifier extras if available, otherwise fallback to hardcoded list
                    const extrasGroup = selectedProductForOptions?.modifiers?.find(
                      (m: any) => !m.required && m.options?.length > 0
                    );
                    const toppingOptions = extrasGroup
                      ? extrasGroup.options.map((o: any) => ({ name: o.label, price: Number(o.price || 0), icon: "" }))
                      : PIZZA_TOPPINGS.map((t) => ({ name: t.name, price: 0, icon: t.icon }));

                    return toppingOptions.map((topping: { name: string; price: number; icon: string }) => {
                      const isSelected = selectedToppings.includes(topping.name);
                      return (
                        <Pressable
                          key={topping.name}
                          onPress={() => {
                            setSelectedToppings((prev) =>
                              isSelected ? prev.filter((t) => t !== topping.name) : [...prev, topping.name]
                            );
                          }}
                          style={[styles.toppingRow, isSelected && styles.toppingRowSelected]}
                        >
                          {topping.icon ? (
                            <View style={styles.toppingIconWrap}>
                              <Text style={{ fontSize: 22 }}>{topping.icon}</Text>
                            </View>
                          ) : null}
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.toppingName, isSelected && { color: Colors.accent }]}>{topping.name}</Text>
                            <Text style={styles.toppingPrice}>+CHF {topping.price.toFixed(2)}</Text>
                          </View>
                          <View style={[styles.toppingCheckbox, isSelected && styles.toppingCheckboxSelected]}>
                            {isSelected && <Ionicons name="checkmark" size={13} color="#000" />}
                          </View>
                        </Pressable>
                      );
                    });
                  })()}
                </View>
                {/* Add to Cart */}
                <Pressable
                  style={{ marginTop: 16, borderRadius: 14, overflow: "hidden" }}
                  onPress={() => {
                    const toppingsSuffix = selectedToppings.length > 0 ? ` [${selectedToppings.join(", ")}]` : "";
                    cart.addItem({
                      id: selectedProductForOptions.id,
                      name: selectedProductForOptions.name + toppingsSuffix,
                      price: Number(selectedProductForOptions.price),
                      variant: selectedVariant,
                    });
                    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedProductForOptions(null);
                    setSelectedVariant(null);
                    setSelectedToppings([]);
                    setShowToppingsStep(false);
                  }}
                >
                  <LinearGradient colors={[Colors.accent, Colors.gradientMid]} style={{ paddingVertical: 14, alignItems: "center", borderRadius: 14 }}>
                    <Text style={{ color: Colors.textDark, fontSize: 16, fontWeight: "800" }}>
                      {language === "ar" ? `أضف للسلة${selectedToppings.length > 0 ? ` (${selectedToppings.length})` : ""}` :
                        language === "de" ? `In den Warenkorb${selectedToppings.length > 0 ? ` (${selectedToppings.length})` : ""}` :
                          `Add to Cart${selectedToppings.length > 0 ? ` (${selectedToppings.length} toppings)` : ""}`}
                    </Text>
                  </LinearGradient>
                </Pressable>
                <Pressable style={{ marginTop: 8, marginBottom: 8 }} onPress={() => setShowToppingsStep(false)}>
                  <Text style={{ color: Colors.textMuted, textAlign: "center", padding: 8, fontSize: 13 }}>
                    {language === "ar" ? "← العودة للأحجام" : language === "de" ? "← Zurück zu Größen" : "← Back to sizes"}
                  </Text>
                </Pressable>
              </ScrollView>
            )}

            {!showToppingsStep && (
              <Pressable
                style={styles.modalCancelBtn}
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
                  { key: "mobile", icon: "phone-portrait" as const, label: t("mobile") },
                  { key: "nfc", icon: "wifi" as const, label: t("nfcPay") },
                ].map((m) => (
                  <Pressable
                    key={m.key}
                    style={[styles.paymentBtn, paymentMethod === m.key && styles.paymentBtnActive]}
                    onPress={() => { setPaymentMethod(m.key); if (m.key === "nfc") setNfcStatus("waiting"); }}
                  >
                    <Ionicons name={m.icon} size={22} color={paymentMethod === m.key ? Colors.accent : Colors.textSecondary} />
                    <Text style={[styles.paymentBtnText, paymentMethod === m.key && { color: Colors.accent }]}>{m.label}</Text>
                  </Pressable>
                ))}
              </View>

              {paymentMethod === "cash" && (
                <View style={styles.cashSection}>
                  <Text style={[styles.sectionLabel, rtlTextAlign]}>{t("cashReceived")}</Text>
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
                <View style={styles.nfcPaySection}>
                  <View style={styles.nfcIconContainer}>
                    <View style={[styles.nfcRing, styles.nfcRingOuter]} />
                    <View style={[styles.nfcRing, styles.nfcRingMiddle]} />
                    <View style={[styles.nfcRing, styles.nfcRingInner]} />
                    <View style={styles.nfcCenterIcon}>
                      <Ionicons name="wifi" size={32} color={Colors.white} />
                    </View>
                  </View>
                  <Text style={[styles.nfcPayTitle, rtlTextAlign]}>{t("tapToPay")}</Text>
                  <Text style={[styles.nfcPaySubtitle, rtlTextAlign]}>{t("holdCardNear")}</Text>
                  <Text style={styles.nfcPayAmount}>CHF {cart.total.toFixed(2)}</Text>
                  <View style={[styles.nfcStatusBadge,
                  nfcStatus === "success" && { backgroundColor: "rgba(16,185,129,0.15)" },
                  nfcStatus === "error" && { backgroundColor: "rgba(239,68,68,0.15)" },
                  nfcStatus === "reading" && { backgroundColor: "rgba(59,130,246,0.15)" },
                  ]}>
                    <Ionicons
                      name={nfcStatus === "success" ? "checkmark-circle" : nfcStatus === "error" ? "close-circle" : nfcStatus === "reading" ? "sync" : "radio-outline"}
                      size={16}
                      color={nfcStatus === "success" ? Colors.success : nfcStatus === "error" ? Colors.danger : nfcStatus === "reading" ? "#3B82F6" : Colors.accent}
                    />
                    <Text style={[styles.nfcStatusText,
                    nfcStatus === "success" && { color: Colors.success },
                    nfcStatus === "error" && { color: Colors.danger },
                    nfcStatus === "reading" && { color: "#3B82F6" },
                    ]}>
                      {nfcStatus === "success" ? t("paymentSuccess") : nfcStatus === "error" ? t("paymentFailed") : nfcStatus === "reading" ? t("processingPayment") : t("nfcReady")}
                    </Text>
                  </View>
                </View>
              )}

              {paymentMethod === "card" && (
                <View style={styles.cardInputSection}>
                  <View style={[styles.cardInputHeader, isRTL && { flexDirection: "row-reverse" }]}>
                    <Ionicons name="card" size={24} color={Colors.accent} />
                    <Text style={[styles.cardInputTitle, rtlTextAlign]}>{t("cardDetails")}</Text>
                    <View style={[styles.cardBrands, isRTL && { flexDirection: "row-reverse" }]}>
                      <Text style={styles.cardBrand}>VISA</Text>
                      <Text style={styles.cardBrand}>MC</Text>
                    </View>
                  </View>
                  <View style={styles.cardField}>
                    <Ionicons name="card-outline" size={18} color={Colors.textMuted} style={{ marginRight: 8 }} />
                    <TextInput
                      style={styles.cardInput}
                      placeholder="4242 4242 4242 4242"
                      placeholderTextColor={Colors.textMuted}
                      value={cardNumber}
                      onChangeText={(t) => setCardNumber(formatCardNumber(t))}
                      keyboardType="number-pad"
                      maxLength={19}
                    />
                  </View>
                  <View style={[styles.cardRow, isRTL && { flexDirection: "row-reverse" }]}>
                    <View style={[styles.cardField, { flex: 1, marginRight: isRTL ? 0 : 8, marginLeft: isRTL ? 8 : 0 }]}>
                      <Ionicons name="calendar-outline" size={18} color={Colors.textMuted} style={{ marginRight: 8 }} />
                      <TextInput
                        style={styles.cardInput}
                        placeholder="MM/YY"
                        placeholderTextColor={Colors.textMuted}
                        value={cardExpiry}
                        onChangeText={(t) => setCardExpiry(formatExpiry(t))}
                        keyboardType="number-pad"
                        maxLength={5}
                      />
                    </View>
                    <View style={[styles.cardField, { flex: 1 }]}>
                      <Ionicons name="lock-closed-outline" size={18} color={Colors.textMuted} style={{ marginRight: 8 }} />
                      <TextInput
                        style={styles.cardInput}
                        placeholder="CVC"
                        placeholderTextColor={Colors.textMuted}
                        value={cardCvc}
                        onChangeText={(t) => setCardCvc(t.replace(/\D/g, "").slice(0, 4))}
                        keyboardType="number-pad"
                        maxLength={4}
                        secureTextEntry
                      />
                    </View>
                  </View>
                  {cardError ? (
                    <View style={[styles.cardErrorRow, isRTL && { flexDirection: "row-reverse" }]}>
                      <Ionicons name="alert-circle" size={16} color={Colors.danger} />
                      <Text style={[styles.cardErrorText, rtlTextAlign]}>{cardError}</Text>
                    </View>
                  ) : null}
                  {cardProcessing && (
                    <View style={[styles.cardProcessingRow, isRTL && { flexDirection: "row-reverse" }]}>
                      <Ionicons name="sync" size={16} color={Colors.accent} />
                      <Text style={[styles.cardProcessingText, rtlTextAlign]}>{t("processingPayment")}</Text>
                    </View>
                  )}
                  <View style={[styles.cardSecureRow, isRTL && { flexDirection: "row-reverse" }]}>
                    <Ionicons name="shield-checkmark" size={14} color={Colors.success} />
                    <Text style={styles.cardSecureText}>{t("securePayment")}</Text>
                  </View>
                </View>
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

              {/* Payment confirmation checkbox for non-card/cash/nfc payments */}
              {(paymentMethod === "twint" || paymentMethod === "mobile" || paymentMethod === "qr") && (
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
                style={[styles.completeBtn, (saleMutation.isPending || cardProcessing || nfcStatus === "reading" || (paymentMethod === "card" && !isCardValid())) && { opacity: 0.5 }]}
                onPress={() => {
                  const validationError = validateBeforeComplete();
                  if (validationError) {
                    Alert.alert(t("error"), validationError);
                    return;
                  }
                  if (!saleMutation.isPending && !cardProcessing && nfcStatus !== "reading" && !(paymentMethod === "card" && !isCardValid())) {
                    saleMutation.mutate();
                  }
                }}
                disabled={saleMutation.isPending || cardProcessing || nfcStatus === "reading" || (paymentMethod === "card" && !isCardValid())}
              >
                <LinearGradient colors={[Colors.success, "#059669"]} style={[styles.completeBtnGradient, isRTL && { flexDirection: "row-reverse" }]}>
                  <Ionicons name="checkmark-circle" size={22} color={Colors.white} />
                  <Text style={styles.completeBtnText}>
                    {cardProcessing || nfcStatus === "reading" ? t("processingPayment") : saleMutation.isPending ? t("processing") : (paymentMethod === "card" || paymentMethod === "nfc") ? t("payAndComplete") : t("completeSale")}
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

                <Text style={{ textAlign: "center", color: "#000", fontSize: 16, fontWeight: "800", marginTop: 4 }}>{storeSettings?.name || tenant?.name || "POS System"}</Text>
                {storeSettings?.address && <Text style={{ textAlign: "center", color: "#333", fontSize: 10, marginTop: 2, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>{storeSettings.address}</Text>}
                {storeSettings?.phone && <Text style={{ textAlign: "center", color: "#333", fontSize: 10, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>{storeSettings.phone}</Text>}
                {storeSettings?.email && <Text style={{ textAlign: "center", color: "#333", fontSize: 10, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>{storeSettings.email}</Text>}

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

                {lastSale?.items?.map((item: any, idx: number) => (
                  <View key={idx} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 }}>
                    <Text style={{ color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace", flex: 2 }} numberOfLines={1}>{item.name}</Text>
                    <Text style={{ color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace", width: 40, textAlign: "center" }}>x{item.quantity}</Text>
                    <Text style={{ color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace", width: 65, textAlign: "right" }}>CHF {item.total.toFixed(2)}</Text>
                  </View>
                ))}

                <Text style={{ textAlign: "center", color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace", marginTop: 4, letterSpacing: 1 }}>{"─".repeat(36)}</Text>

                <View style={{ marginTop: 6 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 }}>
                    <Text style={{ color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>{t("subtotal")}:</Text>
                    <Text style={{ color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>CHF {lastSale?.subtotal?.toFixed(2)}</Text>
                  </View>
                  {(lastSale?.discount || 0) > 0 && (
                    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 }}>
                      <Text style={{ color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>{t("discount")}:</Text>
                      <Text style={{ color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>-CHF {lastSale?.discount?.toFixed(2)}</Text>
                    </View>
                  )}
                  {(lastSale?.serviceFee || lastSale?.serviceFeeAmount || 0) > 0 && (
                    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 }}>
                      <Text style={{ color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>{t("serviceTax" as any) || "Service Tax"}:</Text>
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

                  <Text style={{ color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace", letterSpacing: 1 }}>{"=".repeat(36)}</Text>

                  <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 }}>
                    <Text style={{ color: "#000", fontSize: 15, fontWeight: "900", fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>TOTAL:</Text>
                    <Text style={{ color: "#000", fontSize: 15, fontWeight: "900", fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>CHF {lastSale?.total?.toFixed(2)}</Text>
                  </View>

                  <Text style={{ color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace", letterSpacing: 1 }}>{"=".repeat(36)}</Text>

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
                    <Image source={{ uri: qrDataUrl }} style={{ width: 80, height: 80 }} />
                  </View>
                )}

                <View style={{ alignItems: "center", marginTop: 14 }}>
                  <Text style={{ color: "#000", fontSize: 13, fontWeight: "700", textAlign: "center" }}>{t("thankYou")}</Text>
                  {storeSettings?.address && <Text style={{ color: "#555", fontSize: 10, textAlign: "center", marginTop: 2, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>{t("visitUs")}: {storeSettings.address}</Text>}
                  <Text style={{ color: "#999", fontSize: 9, textAlign: "center", marginTop: 6, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>{t("poweredBy")}</Text>
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
              <Text style={[styles.modalTitle, rtlTextAlign]}>{t("selectCustomer")}</Text>
              <Pressable onPress={() => setShowCustomerPicker(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </Pressable>
            </View>
            <Pressable style={[styles.walkInBtn, isRTL && { flexDirection: "row-reverse" }]} onPress={() => { cart.setCustomerId(null); setShowCustomerPicker(false); }}>
              <Ionicons name="person-outline" size={20} color={Colors.textSecondary} />
              <Text style={[styles.walkInText, rtlTextAlign]}>{t("walkIn")}</Text>
            </Pressable>
            <FlatList
              data={customers}
              keyExtractor={(item: any) => String(item.id)}
              scrollEnabled={!!customers.length}
              renderItem={({ item }: { item: any }) => (
                <Pressable
                  style={[styles.customerCard, cart.customerId === item.id && styles.customerCardActive, isRTL && { flexDirection: "row-reverse" }]}
                  onPress={() => { cart.setCustomerId(item.id); setShowCustomerPicker(false); }}
                >
                  <View style={[styles.customerAvatar, isRTL ? { marginLeft: 10, marginRight: 0 } : null]}>
                    <Text style={styles.customerAvatarText}>{item.name.charAt(0)}</Text>
                  </View>
                  <View style={styles.customerCardInfo}>
                    <Text style={[styles.customerCardName, rtlTextAlign]}>{item.name}</Text>
                    <Text style={[styles.customerCardMeta, rtlTextAlign]}>{item.phone || item.email || t("noContact")}</Text>
                  </View>
                  <View style={[styles.customerLoyalty, isRTL && { flexDirection: "row-reverse" }]}>
                    <Ionicons name="star" size={12} color={Colors.warning} />
                    <Text style={styles.customerLoyaltyText}>{item.loyaltyPoints || 0}</Text>
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
                  placeholder="+41 ..."
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
                <View style={{ backgroundColor: "#FFFFFF", padding: 20, margin: 12, borderRadius: 4 }}>
                  <Text style={{ textAlign: "center", color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace", letterSpacing: 1 }}>{"=".repeat(36)}</Text>

                  {storeSettings?.logo && (
                    <View style={{ alignItems: "center", marginVertical: 8 }}>
                      <Image source={{ uri: storeSettings.logo.startsWith("http") || storeSettings.logo.startsWith("file://") || storeSettings.logo.startsWith("data:") ? storeSettings.logo : `${getApiUrl().replace(/\/$/, "")}${storeSettings.logo}` }} style={{ width: 50, height: 50, borderRadius: 6 }} resizeMode="contain" />
                    </View>
                  )}

                  <Text style={{ textAlign: "center", color: "#000", fontSize: 16, fontWeight: "800", marginTop: 4 }}>{storeSettings?.name || tenant?.name || "POS System"}</Text>
                  {storeSettings?.address && <Text style={{ textAlign: "center", color: "#333", fontSize: 10, marginTop: 2, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>{storeSettings.address}</Text>}
                  {storeSettings?.phone && <Text style={{ textAlign: "center", color: "#333", fontSize: 10, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>{storeSettings.phone}</Text>}

                  <Text style={{ textAlign: "center", color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace", marginTop: 6, letterSpacing: 1 }}>{"─".repeat(36)}</Text>

                  <View style={{ marginVertical: 6 }}>
                    <Text style={{ color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>{t("receiptDate")}: {new Date(selectedInvoice.createdAt || selectedInvoice.date).toLocaleDateString()}, {new Date(selectedInvoice.createdAt || selectedInvoice.date).toLocaleTimeString()}</Text>
                    <Text style={{ color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>{t("receiptNumber")}: {selectedInvoice.receiptNumber || `#${selectedInvoice.id} `}</Text>
                  </View>

                  <Text style={{ textAlign: "center", color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace", letterSpacing: 1 }}>{"─".repeat(36)}</Text>

                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6, marginBottom: 4 }}>
                    <Text style={{ color: "#000", fontSize: 11, fontWeight: "700", fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace", flex: 2 }}>Item</Text>
                    <Text style={{ color: "#000", fontSize: 11, fontWeight: "700", fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace", width: 40, textAlign: "center" }}>Qty</Text>
                    <Text style={{ color: "#000", fontSize: 11, fontWeight: "700", fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace", width: 65, textAlign: "right" }}>Total</Text>
                  </View>

                  <Text style={{ color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace", letterSpacing: 1 }}>{"─".repeat(36)}</Text>

                  {selectedInvoice.items?.map((item: any, idx: number) => (
                    <View key={idx} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 }}>
                      <Text style={{ color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace", flex: 2 }} numberOfLines={1}>{item.productName || item.name}</Text>
                      <Text style={{ color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace", width: 40, textAlign: "center" }}>x{item.quantity}</Text>
                      <Text style={{ color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace", width: 65, textAlign: "right" }}>CHF {Number(item.total || (item.unitPrice * item.quantity)).toFixed(2)}</Text>
                    </View>
                  ))}

                  <Text style={{ textAlign: "center", color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace", marginTop: 4, letterSpacing: 1 }}>{"─".repeat(36)}</Text>

                  <View style={{ marginTop: 6 }}>
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
                    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 }}>
                      <Text style={{ color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>{t("tax")}:</Text>
                      <Text style={{ color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>CHF {Number(selectedInvoice.tax || 0).toFixed(2)}</Text>
                    </View>

                    <Text style={{ color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace", letterSpacing: 1 }}>{"=".repeat(36)}</Text>

                    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 }}>
                      <Text style={{ color: "#000", fontSize: 15, fontWeight: "900", fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>TOTAL:</Text>
                      <Text style={{ color: "#000", fontSize: 15, fontWeight: "900", fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>CHF {Number(selectedInvoice.totalAmount).toFixed(2)}</Text>
                    </View>

                    <Text style={{ color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace", letterSpacing: 1 }}>{"=".repeat(36)}</Text>

                    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 2, marginTop: 4 }}>
                      <Text style={{ color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>{t("paymentMethod")}:</Text>
                      <Text style={{ color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace", textTransform: "uppercase" }}>{selectedInvoice.paymentMethod || "cash"}</Text>
                    </View>
                  </View>

                  {reprintQrDataUrl && Platform.OS === "web" && (
                    <View style={{ alignItems: "center", marginTop: 12 }}>
                      <Image source={{ uri: reprintQrDataUrl }} style={{ width: 80, height: 80 }} />
                    </View>
                  )}

                  <View style={{ alignItems: "center", marginTop: 14 }}>
                    <Text style={{ color: "#000", fontSize: 13, fontWeight: "700", textAlign: "center" }}>{t("thankYou")}</Text>
                    <Text style={{ color: "#999", fontSize: 9, textAlign: "center", marginTop: 6, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>{t("poweredBy")}</Text>
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
                          <Pressable key="del" style={styles.switchKeyBtn} onPress={() => { if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSwitchPin(switchPin.slice(0, -1)); }}>
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
                            await apiRequest("PUT", `/ api / online - orders / ${item.id} `, { status: "accepted", estimatedTime: 30 });
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
                            await apiRequest("PUT", `/ api / online - orders / ${item.id} `, { status: "preparing" });
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
                            await apiRequest("PUT", `/ api / online - orders / ${item.id} `, { status: "ready" });
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
                            await apiRequest("PUT", `/ api / online - orders / ${item.id} `, { status: "delivered" });
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
                            await apiRequest("PUT", `/ api / online - orders / ${item.id} `, { status: "cancelled" });
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

      {/* Online Order Notification moved to _layout.tsx */}

      <View style={{ height: Platform.OS === "web" ? 84 : 60 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { overflow: "hidden" },
  headerGradient: { paddingHorizontal: 16, paddingVertical: 14 },
  headerContent: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerTitle: { fontSize: 22, fontWeight: "800", color: Colors.white, letterSpacing: 0.5 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 12 },
  employeeName: { color: Colors.white, fontSize: 13, opacity: 0.9 },
  mainContent: { flex: 1 },
  productsSection: { flex: 1 },
  productsSectionTablet: { flex: 2 },
  searchRow: { paddingHorizontal: 14, paddingTop: 14 },
  searchBox: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.inputBg, borderRadius: 14, paddingHorizontal: 14, height: 44, borderWidth: 1, borderColor: Colors.inputBorder },
  searchInput: { flex: 1, color: Colors.text, marginLeft: 8, fontSize: 15 },
  categoriesRow: { flexGrow: 0, flexShrink: 0, minHeight: 75, marginTop: 12, marginBottom: 6 },
  categoriesContent: { paddingHorizontal: 14, gap: 10, alignItems: "center" },
  categoryChip: { borderRadius: 28, backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.cardBorder, overflow: "hidden" },
  categoryChipAll: { borderColor: Colors.accent, borderWidth: 2 },
  categoryChipAllActive: { borderColor: Colors.gradientStart },
  categoryChipGradient: { flexDirection: "row", alignItems: "center", paddingHorizontal: 22, paddingVertical: 16, gap: 10 },
  categoryChipInner: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16, gap: 8 },
  categoryChipText: { color: Colors.textSecondary, fontSize: 16, fontWeight: "700" },
  categoryChipTextAll: { color: Colors.white, fontWeight: "800" },
  categoryDot: { width: 10, height: 10, borderRadius: 5 },
  productGrid: { padding: 10 },
  productCard: { flex: 1, margin: 5, backgroundColor: Colors.surface, borderRadius: 16, padding: 14, alignItems: "center", borderWidth: 1, borderColor: Colors.cardBorder, minWidth: 90, overflow: "hidden", position: "relative" as const },
  productCardTopBorder: { position: "absolute" as const, top: 0, left: 0, right: 0, height: 3, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  productIcon: { width: 54, height: 54, borderRadius: 16, justifyContent: "center", alignItems: "center", marginBottom: 10, marginTop: 4, overflow: "hidden" as const },
  productName: { color: Colors.text, fontSize: 12, fontWeight: "600", textAlign: "center", marginBottom: 6, lineHeight: 16 },
  productPrice: { color: Colors.accent, fontSize: 15, fontWeight: "800" },
  productAddBadge: { position: "absolute" as const, top: 8, right: 8, width: 22, height: 22, borderRadius: 11, justifyContent: "center", alignItems: "center" },
  barcodeText: { color: Colors.textMuted, fontSize: 9, marginTop: 3 },
  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  emptyText: { color: Colors.textMuted, fontSize: 15, marginTop: 12 },
  cartSection: { backgroundColor: Colors.surface, borderTopWidth: 1, borderColor: Colors.cardBorder, maxHeight: 400 },
  cartSectionTablet: { flex: 1, borderTopWidth: 0, borderLeftWidth: 1, maxHeight: "100%" as any },
  cartHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderColor: Colors.cardBorder },
  cartTitle: { color: Colors.text, fontSize: 17, fontWeight: "700" },
  customerSelect: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderColor: "rgba(255,255,255,0.05)" },
  customerSelectText: { color: Colors.textMuted, fontSize: 13, flex: 1 },
  cartList: { maxHeight: 140 },
  cartItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderColor: "rgba(255,255,255,0.05)" },
  cartItemInfo: { flex: 1 },
  cartItemName: { color: Colors.text, fontSize: 13, fontWeight: "600" },
  cartItemPrice: { color: Colors.accent, fontSize: 12, marginTop: 2, fontWeight: "500" },
  cartItemActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  qtyBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: Colors.surfaceLight, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: Colors.cardBorder },
  qtyText: { color: Colors.text, fontSize: 15, fontWeight: "700", minWidth: 22, textAlign: "center" },
  cartEmpty: { alignItems: "center", paddingVertical: 24 },
  cartEmptyText: { color: Colors.textMuted, fontSize: 14, marginTop: 8 },
  cartEmptySubtext: { color: Colors.textMuted, fontSize: 12, marginTop: 4 },
  cartSummary: { paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderColor: Colors.cardBorder },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  summaryLabel: { color: Colors.textSecondary, fontSize: 13 },
  summaryValue: { color: Colors.text, fontSize: 13, fontWeight: "600" },
  totalRow: { borderTopWidth: 1, borderColor: Colors.cardBorder, paddingTop: 10, marginTop: 6 },
  totalLabel: { color: Colors.text, fontSize: 17, fontWeight: "800" },
  totalValue: { color: Colors.accent, fontSize: 20, fontWeight: "800" },
  checkoutBtn: { marginHorizontal: 16, marginVertical: 10, borderRadius: 16, overflow: "hidden", elevation: 4, boxShadow: "0px 4px 8px rgba(124, 58, 237, 0.3)" },
  checkoutBtnDisabled: { opacity: 0.5, elevation: 0, boxShadow: "none" },
  checkoutBtnGradient: { paddingVertical: 16, paddingHorizontal: 20 },
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
    paddingVertical: 8,
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
  cartCustomerClear: { padding: 4 },

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
  headerInvoiceBtn: { flexDirection: "row" as const, alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.15)", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  headerInvoiceLabel: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" as const },
  headerAvatarBtn: { padding: 2 },
  headerAvatarCircle: { width: 42, height: 42, borderRadius: 21, justifyContent: "center" as const, alignItems: "center" as const, borderWidth: 2, borderColor: "rgba(255,255,255,0.4)" },
  headerAvatarText: { color: "#FFFFFF", fontSize: 20, fontWeight: "800" as const },

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
