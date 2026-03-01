import React, { useState, useEffect, useCallback } from "react";
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
import { useLanguage } from "@/lib/language-context";

export default function POSScreen() {
  const insets = useSafeAreaInsets();
  const { employee, isCashier, canManage, login } = useAuth();
  const { tenant } = useLicense();
  const qc = useQueryClient();
  const cart = useCart();
  const { t, isRTL, rtlTextAlign, rtlText, rtlRow } = useLanguage();
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
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [showInvoiceHistory, setShowInvoiceHistory] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [showReprintReceipt, setShowReprintReceipt] = useState(false);
  const [reprintQrDataUrl, setReprintQrDataUrl] = useState<string | null>(null);
  const [showAccountSwitcher, setShowAccountSwitcher] = useState(false);
  const [switchTarget, setSwitchTarget] = useState<any>(null);
  const [switchPin, setSwitchPin] = useState("");
  const [switchLoading, setSwitchLoading] = useState(false);
  const [switchError, setSwitchError] = useState("");

  const { data: categories = [] } = useQuery<any[]>({
    queryKey: ["/api/categories"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const tenantId = tenant?.id;
  const { data: products = [] } = useQuery<any[]>({
    queryKey: ["/api/products", tenantId ? `?tenantId=${tenantId}` : (search ? `?search=${search}` : "")],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: true,
  });

  // Only show categories that have products for this tenant
  const activeCategoryIds = React.useMemo(() => {
    return new Set(products.map((p: any) => p.categoryId).filter(Boolean));
  }, [products]);

  const tenantCategories = React.useMemo(() => {
    if (activeCategoryIds.size === 0) return categories;
    return (categories as any[]).filter((c: any) => activeCategoryIds.has(c.id));
  }, [categories, activeCategoryIds]);

  const { data: allEmployees = [] } = useQuery<any[]>({
    queryKey: ["/api/employees"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: showAccountSwitcher,
  });

  const { data: customers = [] } = useQuery<any[]>({
    queryKey: ["/api/customers"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const { data: storeSettings } = useQuery<any>({
    queryKey: ["/api/store-settings"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const { data: salesHistory = [] } = useQuery<any[]>({
    queryKey: ["/api/sales"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: showInvoiceHistory,
  });

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
        printWindow.document.write(`<tr><td>${t("tax")}:</td><td class="right">CHF ${Number(inv.tax || 0).toFixed(2)}</td></tr></table>`);
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

  useEffect(() => {
    apiRequest("POST", "/api/seed").catch(() => { });
  }, []);

  useEffect(() => {
    const wsUrl = `${getApiUrl().replace("http", "ws")}/api/ws/caller-id`;
    let ws: WebSocket;

    try {
      ws = new WebSocket(wsUrl);
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "incoming_call") {
            const customer = customers.find((c: any) => c.phone === data.phoneNumber);
            setIncomingCall({ ...data, customer });
            if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          }
        } catch (e) {
          console.error("WS Message Error:", e);
        }
      };
      return () => ws.close();
    } catch (e) {
      console.error("WS Connection Error:", e);
    }
  }, [customers]);

  const filteredProducts = selectedCategory
    ? products.filter((p: any) => p.categoryId === selectedCategory)
    : products;

  const selectedCustomer = customers.find((c: any) => c.id === cart.customerId);

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

  const completeSaleAfterPayment = (saleData: any) => {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setLastSale({
      ...saleData,
      items: cart.items.map((i) => ({ name: i.name, quantity: i.quantity, price: i.price, total: i.price * i.quantity })),
      subtotal: cart.subtotal,
      tax: cart.tax,
      discount: cart.discount,
      total: cart.total,
      paymentMethod,
      cashReceived: Number(cashReceived) || 0,
      change: paymentMethod === "cash" && cashReceived ? Number(cashReceived) - cart.total : 0,
      customerName: selectedCustomer?.name || t("walkIn"),
      employeeName: employee?.name || "Staff",
      date: new Date().toLocaleString(),
    });
    generateQR(`barmagly:receipt:${saleData.receiptNumber || saleData.id}`);
    cart.clearCart();
    setShowCheckout(false);
    setCashReceived("");
    setCardNumber("");
    setCardExpiry("");
    setCardCvc("");
    setCardError("");
    setNfcStatus("waiting");
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
    cart.addItem({ id: product.id, name: product.name, price: Number(product.price) });
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [cart]);

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
    } catch {
      setSwitchError(t("invalidPin" as any) || "Invalid PIN");
      setSwitchPin("");
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSwitchLoading(false);
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
            <View style={[styles.headerRight, isRTL && { flexDirection: "row-reverse" }]}>
              <Pressable onPress={() => setShowInvoiceHistory(true)} style={styles.headerInvoiceBtn}>
                <Ionicons name="receipt-outline" size={28} color={Colors.white} />
                <Text style={styles.headerInvoiceLabel}>{t("invoices" as any)}</Text>
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

      {incomingCall && (
        <View style={styles.callNotification}>
          <LinearGradient colors={[Colors.accent, Colors.gradientMid]} style={[styles.callGradient, isRTL && { flexDirection: "row-reverse" }]}>
            <View style={styles.callIconWrap}>
              <Ionicons name="call" size={24} color={Colors.white} />
            </View>
            <View style={[styles.callInfo, isRTL && { alignItems: "flex-end" }]}>
              <Text style={styles.callTitle}>{t("incomingCall" as any) || "Incoming Call"}</Text>
              <Text style={styles.callNumber}>{incomingCall.phoneNumber}</Text>
              {incomingCall.customer ? (
                <Text style={styles.callCustomer}>{incomingCall.customer.name}</Text>
              ) : (
                <Text style={styles.callCustomer}>{t("newCustomer" as any) || "New Customer"}</Text>
              )}
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable
                style={[styles.callActionBtn, { backgroundColor: Colors.success }]}
                onPress={() => {
                  if (incomingCall.customer) {
                    cart.setCustomerId(incomingCall.customer.id);
                  } else {
                    // Navigate to customers or open add customer modal
                    setShowCustomerPicker(true);
                  }
                  setIncomingCall(null);
                }}
              >
                <Ionicons name="checkmark" size={20} color={Colors.white} />
              </Pressable>
              <Pressable
                style={[styles.callActionBtn, { backgroundColor: Colors.danger }]}
                onPress={() => setIncomingCall(null)}
              >
                <Ionicons name="close" size={20} color={Colors.white} />
              </Pressable>
            </View>
          </LinearGradient>
        </View>
      )}

      <View style={[styles.mainContent, { flexDirection: isTablet ? (isRTL ? "row-reverse" : "row") : "column" }]}>
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
                  style={[styles.categoryChip, isActive && { borderColor: cat.color || Colors.accent, backgroundColor: `${cat.color || Colors.accent}18` }]}
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
                  <View style={[styles.productIcon, { backgroundColor: `${catColor}15` }]}>
                    {item.image ? (
                      <Image source={{ uri: item.image.startsWith("http") ? item.image : `${getApiUrl()}${item.image}` }} style={{ width: 44, height: 44, borderRadius: 12 }} resizeMode="cover" />
                    ) : (
                      <Ionicons name={catIcon} size={26} color={catColor} />
                    )}
                  </View>
                  <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
                  <Text style={styles.productPrice}>CHF {Number(item.price).toFixed(2)}</Text>
                  {item.barcode ? <Text style={styles.barcodeText}>{item.barcode}</Text> : null}
                  <View style={[styles.productAddBadge, { backgroundColor: `${catColor}20` }]}>
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

          <Pressable style={[styles.customerSelect, isRTL && { flexDirection: "row-reverse" }]} onPress={() => setShowCustomerPicker(true)}>
            <Ionicons name="person" size={16} color={cart.customerId ? Colors.accent : Colors.textMuted} />
            <Text style={[styles.customerSelectText, cart.customerId && { color: Colors.accent }, rtlTextAlign]}>
              {selectedCustomer ? selectedCustomer.name : `${t("selectCustomer")} (${t("walkIn")})`}
            </Text>
            <Ionicons name={isRTL ? "chevron-back" : "chevron-down"} size={14} color={Colors.textMuted} />
          </Pressable>

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
                  <Pressable style={styles.qtyBtn} onPress={() => cart.updateQuantity(item.productId, item.quantity - 1)}>
                    <Ionicons name="remove" size={16} color={Colors.text} />
                  </Pressable>
                  <Text style={styles.qtyText}>{item.quantity}</Text>
                  <Pressable style={styles.qtyBtn} onPress={() => cart.updateQuantity(item.productId, item.quantity + 1)}>
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
                  { key: "cash",   icon: "cash" as const,           label: t("cash")   },
                  { key: "card",   icon: "card" as const,           label: t("card")   },
                  { key: "twint",  icon: "phone-portrait" as const, label: "TWINT"     },
                  { key: "mobile", icon: "phone-portrait" as const, label: t("mobile") },
                  { key: "nfc",    icon: "wifi" as const,           label: t("nfcPay") },
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

              <Pressable
                style={[styles.completeBtn, (saleMutation.isPending || cardProcessing || nfcStatus === "reading" || (paymentMethod === "card" && !isCardValid())) && { opacity: 0.5 }]}
                onPress={() => !saleMutation.isPending && !cardProcessing && nfcStatus !== "reading" && !(paymentMethod === "card" && !isCardValid()) && saleMutation.mutate()}
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
                    <Image source={{ uri: storeSettings.logo.startsWith("http") ? storeSettings.logo : `${getApiUrl()}${storeSettings.logo}` }} style={{ width: 50, height: 50, borderRadius: 6 }} resizeMode="contain" />
                  </View>
                )}

                <Text style={{ textAlign: "center", color: "#000", fontSize: 16, fontWeight: "800", marginTop: 4 }}>{storeSettings?.name || tenant?.name || "POS System"}</Text>
                {storeSettings?.address && <Text style={{ textAlign: "center", color: "#333", fontSize: 10, marginTop: 2, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>{storeSettings.address}</Text>}
                {storeSettings?.phone && <Text style={{ textAlign: "center", color: "#333", fontSize: 10, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>{storeSettings.phone}</Text>}
                {storeSettings?.email && <Text style={{ textAlign: "center", color: "#333", fontSize: 10, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>{storeSettings.email}</Text>}

                <Text style={{ textAlign: "center", color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace", marginTop: 6, letterSpacing: 1 }}>{"─".repeat(36)}</Text>

                <View style={{ marginVertical: 6 }}>
                  <Text style={{ color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>{t("receiptDate")}: {lastSale?.date ? new Date(lastSale.date).toLocaleDateString() : new Date().toLocaleDateString()}, {lastSale?.date ? new Date(lastSale.date).toLocaleTimeString() : new Date().toLocaleTimeString()}</Text>
                  <Text style={{ color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>{t("receiptNumber")}: {lastSale?.receiptNumber || `#${lastSale?.id}`}</Text>
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
                  <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 }}>
                    <Text style={{ color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>{t("tax")}:</Text>
                    <Text style={{ color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>CHF {lastSale?.tax?.toFixed(2)}</Text>
                  </View>

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
            <FlatList
              data={salesHistory}
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
                        {item.receiptNumber || `#${item.id}`}
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
                      <Image source={{ uri: storeSettings.logo.startsWith("http") ? storeSettings.logo : `${getApiUrl()}${storeSettings.logo}` }} style={{ width: 50, height: 50, borderRadius: 6 }} resizeMode="contain" />
                    </View>
                  )}

                  <Text style={{ textAlign: "center", color: "#000", fontSize: 16, fontWeight: "800", marginTop: 4 }}>{storeSettings?.name || tenant?.name || "POS System"}</Text>
                  {storeSettings?.address && <Text style={{ textAlign: "center", color: "#333", fontSize: 10, marginTop: 2, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>{storeSettings.address}</Text>}
                  {storeSettings?.phone && <Text style={{ textAlign: "center", color: "#333", fontSize: 10, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>{storeSettings.phone}</Text>}

                  <Text style={{ textAlign: "center", color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace", marginTop: 6, letterSpacing: 1 }}>{"─".repeat(36)}</Text>

                  <View style={{ marginVertical: 6 }}>
                    <Text style={{ color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>{t("receiptDate")}: {new Date(selectedInvoice.createdAt || selectedInvoice.date).toLocaleDateString()}, {new Date(selectedInvoice.createdAt || selectedInvoice.date).toLocaleTimeString()}</Text>
                    <Text style={{ color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>{t("receiptNumber")}: {selectedInvoice.receiptNumber || `#${selectedInvoice.id}`}</Text>
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
});
