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
import { apiRequest, getQueryFn, getApiUrl } from "@/lib/query-client";
import * as Haptics from "expo-haptics";
import BarcodeScanner from "@/components/BarcodeScanner";
import { useLanguage } from "@/lib/language-context";

export default function POSScreen() {
  const insets = useSafeAreaInsets();
  const { employee, isCashier, canManage } = useAuth();
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

  const { data: categories = [] } = useQuery<any[]>({
    queryKey: ["/api/categories"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const { data: products = [] } = useQuery<any[]>({
    queryKey: ["/api/products", search ? `?search=${search}` : ""],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const { data: customers = [] } = useQuery<any[]>({
    queryKey: ["/api/customers"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const { data: storeSettings } = useQuery<any>({
    queryKey: ["/api/store-settings"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  useEffect(() => {
    apiRequest("POST", "/api/seed").catch(() => {});
  }, []);

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

  const saleMutation = useMutation({
    mutationFn: async () => {
      const saleItems = cart.items.map((i) => ({
        productId: i.productId,
        productName: i.name,
        quantity: i.quantity,
        unitPrice: i.price.toFixed(2),
        total: (i.price * i.quantity).toFixed(2),
        discount: "0",
      }));
      const pm = paymentMethod === "qr" ? "mobile" : paymentMethod;
      const data = {
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
      const res = await apiRequest("POST", "/api/sales", data);
      return await res.json();
    },
    onSuccess: (saleData: any) => {
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
      setShowReceipt(true);
      qc.invalidateQueries({ queryKey: ["/api/sales"] });
      qc.invalidateQueries({ queryKey: ["/api/dashboard"] });
      qc.invalidateQueries({ queryKey: ["/api/inventory"] });
      qc.invalidateQueries({ queryKey: ["/api/customers"] });
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

  return (
    <View style={[styles.container, { paddingTop: insets.top + topPad, direction: isRTL ? "rtl" : "ltr" }]}>
      <View style={styles.header}>
        <LinearGradient colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.headerGradient}>
          <View style={[styles.headerContent, isRTL && { flexDirection: "row-reverse" }]}>
            <Text style={[styles.headerTitle, rtlTextAlign]}>Barmagly POS</Text>
            <View style={[styles.headerRight, isRTL && { flexDirection: "row-reverse" }]}>
              {employee && <Text style={[styles.employeeName, rtlTextAlign]}>{employee.name}</Text>}
            </View>
          </View>
        </LinearGradient>
      </View>

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
                <Ionicons name="grid" size={16} color={!selectedCategory ? Colors.white : Colors.accent} />
                <Text style={[styles.categoryChipText, !selectedCategory && styles.categoryChipTextAll]}>{t("allCategories")}</Text>
              </LinearGradient>
            </Pressable>
            {categories.map((cat: any) => {
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
                    <Ionicons name={iconName} size={16} color={isActive ? (cat.color || Colors.accent) : Colors.textSecondary} />
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
                    <Ionicons name={catIcon} size={26} color={catColor} />
                  </View>
                  <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
                  <Text style={styles.productPrice}>${Number(item.price).toFixed(2)}</Text>
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
                  <Text style={[styles.cartItemPrice, rtlTextAlign]}>${(item.price * item.quantity).toFixed(2)}</Text>
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
              <Text style={[styles.summaryValue, rtlTextAlign]}>${cart.subtotal.toFixed(2)}</Text>
            </View>
            {cart.discount > 0 && (
              <View style={[styles.summaryRow, isRTL && { flexDirection: "row-reverse" }]}>
                <Text style={[styles.summaryLabel, { color: Colors.success }, rtlTextAlign]}>{t("discount")}</Text>
                <Text style={[styles.summaryValue, { color: Colors.success }, rtlTextAlign]}>-${cart.discount.toFixed(2)}</Text>
              </View>
            )}
            <View style={[styles.summaryRow, isRTL && { flexDirection: "row-reverse" }]}>
              <Text style={[styles.summaryLabel, rtlTextAlign]}>{t("tax")} ({cart.taxRate}%)</Text>
              <Text style={[styles.summaryValue, rtlTextAlign]}>${cart.tax.toFixed(2)}</Text>
            </View>
            <View style={[styles.summaryRow, styles.totalRow, isRTL && { flexDirection: "row-reverse" }]}>
              <Text style={[styles.totalLabel, rtlTextAlign]}>{t("total")}</Text>
              <Text style={[styles.totalValue, rtlTextAlign]}>${cart.total.toFixed(2)}</Text>
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
                  <Text style={styles.checkoutBtnPriceText}>${cart.total.toFixed(2)}</Text>
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

              <Text style={styles.modalTotal}>${cart.total.toFixed(2)}</Text>

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
                  { key: "mobile", icon: "phone-portrait" as const, label: t("mobile") },
                  { key: "qr", icon: "qr-code" as const, label: t("qrPay") },
                ].map((m) => (
                  <Pressable
                    key={m.key}
                    style={[styles.paymentBtn, paymentMethod === m.key && styles.paymentBtnActive]}
                    onPress={() => setPaymentMethod(m.key)}
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
                    <Text style={styles.changeText}>{t("change")}: ${(Number(cashReceived) - cart.total).toFixed(2)}</Text>
                  )}
                </View>
              )}

              {paymentMethod === "qr" && (
                <View style={styles.qrPaySection}>
                  <Ionicons name="qr-code" size={64} color={Colors.accent} />
                  <Text style={[styles.qrPayText, rtlTextAlign]}>{t("customerScanQR")}</Text>
                  <Text style={styles.qrPayAmount}>${cart.total.toFixed(2)}</Text>
                </View>
              )}

              {paymentMethod === "card" && (
                <View style={styles.qrPaySection}>
                  <Ionicons name="card" size={48} color={Colors.info} />
                  <Text style={[styles.qrPayText, rtlTextAlign]}>{t("tapCard")}</Text>
                  <View style={[styles.nfcBadge, isRTL && { flexDirection: "row-reverse" }]}>
                    <Ionicons name="wifi" size={16} color={Colors.accent} />
                    <Text style={styles.nfcText}>{t("nfcReady")}</Text>
                  </View>
                </View>
              )}

              <Text style={[styles.sectionLabel, rtlTextAlign]}>{t("orderSummary")}</Text>
              {cart.items.map((item) => (
                <View key={item.productId} style={[styles.checkoutItem, isRTL && { flexDirection: "row-reverse" }]}>
                  <Text style={[styles.checkoutItemName, rtlTextAlign]}>{item.name} x{item.quantity}</Text>
                  <Text style={[styles.checkoutItemTotal, rtlTextAlign]}>${(item.price * item.quantity).toFixed(2)}</Text>
                </View>
              ))}

              <Pressable
                style={[styles.completeBtn, saleMutation.isPending && { opacity: 0.7 }]}
                onPress={() => !saleMutation.isPending && saleMutation.mutate()}
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
                    <Image source={{ uri: storeSettings.logo.startsWith("http") ? storeSettings.logo : `${getApiUrl()}${storeSettings.logo}` }} style={{ width: 50, height: 50, borderRadius: 6 }} resizeMode="contain" />
                  </View>
                )}

                <Text style={{ textAlign: "center", color: "#000", fontSize: 16, fontWeight: "800", marginTop: 4 }}>{storeSettings?.name || "Barmagly POS"}</Text>
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
                    <Text style={{ color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace", width: 65, textAlign: "right" }}>${item.total.toFixed(2)}</Text>
                  </View>
                ))}

                <Text style={{ textAlign: "center", color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace", marginTop: 4, letterSpacing: 1 }}>{"─".repeat(36)}</Text>

                <View style={{ marginTop: 6 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 }}>
                    <Text style={{ color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>{t("subtotal")}:</Text>
                    <Text style={{ color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>${lastSale?.subtotal?.toFixed(2)}</Text>
                  </View>
                  {(lastSale?.discount || 0) > 0 && (
                    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 }}>
                      <Text style={{ color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>{t("discount")}:</Text>
                      <Text style={{ color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>-${lastSale?.discount?.toFixed(2)}</Text>
                    </View>
                  )}
                  <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 }}>
                    <Text style={{ color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>{t("tax")}:</Text>
                    <Text style={{ color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>${lastSale?.tax?.toFixed(2)}</Text>
                  </View>

                  <Text style={{ color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace", letterSpacing: 1 }}>{"=".repeat(36)}</Text>

                  <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 }}>
                    <Text style={{ color: "#000", fontSize: 15, fontWeight: "900", fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>TOTAL:</Text>
                    <Text style={{ color: "#000", fontSize: 15, fontWeight: "900", fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>${lastSale?.total?.toFixed(2)}</Text>
                  </View>

                  <Text style={{ color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace", letterSpacing: 1 }}>{"=".repeat(36)}</Text>

                  <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 2, marginTop: 4 }}>
                    <Text style={{ color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>{t("paymentMethod")}:</Text>
                    <Text style={{ color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace", textTransform: "uppercase" }}>{lastSale?.paymentMethod}</Text>
                  </View>
                  {lastSale?.paymentMethod === "cash" && (
                    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 }}>
                      <Text style={{ color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>{t("cash")}:</Text>
                      <Text style={{ color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>${lastSale?.cashReceived?.toFixed(2)}</Text>
                    </View>
                  )}
                  {(lastSale?.change || 0) > 0 && (
                    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 }}>
                      <Text style={{ color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>{t("change")}:</Text>
                      <Text style={{ color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>${lastSale?.change?.toFixed(2)}</Text>
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
                <Text style={[styles.discountTypeBtnText, discountType === "fixed" && { color: Colors.textDark }]}>{t("fixedAmount")} ($)</Text>
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
  categoriesRow: { maxHeight: 64, marginTop: 12, marginBottom: 4 },
  categoriesContent: { paddingHorizontal: 14, gap: 8, alignItems: "center" },
  categoryChip: { borderRadius: 24, backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.cardBorder, overflow: "hidden" },
  categoryChipAll: { borderColor: Colors.accent, borderWidth: 1.5 },
  categoryChipAllActive: { borderColor: Colors.gradientStart },
  categoryChipGradient: { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingVertical: 12, gap: 7 },
  categoryChipInner: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, gap: 6 },
  categoryChipText: { color: Colors.textSecondary, fontSize: 13, fontWeight: "600" },
  categoryChipTextAll: { color: Colors.white, fontWeight: "700" },
  categoryDot: { width: 7, height: 7, borderRadius: 4 },
  productGrid: { padding: 10 },
  productCard: { flex: 1, margin: 5, backgroundColor: Colors.surface, borderRadius: 16, padding: 14, alignItems: "center", borderWidth: 1, borderColor: Colors.cardBorder, minWidth: 90, overflow: "hidden", position: "relative" as const },
  productCardTopBorder: { position: "absolute" as const, top: 0, left: 0, right: 0, height: 3, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  productIcon: { width: 54, height: 54, borderRadius: 16, justifyContent: "center", alignItems: "center", marginBottom: 10, marginTop: 4 },
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
  checkoutBtn: { marginHorizontal: 16, marginVertical: 10, borderRadius: 16, overflow: "hidden", elevation: 4, shadowColor: Colors.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  checkoutBtnDisabled: { opacity: 0.5, elevation: 0, shadowOpacity: 0 },
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
  qrPaySection: { alignItems: "center", paddingVertical: 20, gap: 8, marginBottom: 16 },
  qrPayText: { color: Colors.textSecondary, fontSize: 14 },
  qrPayAmount: { color: Colors.accent, fontSize: 24, fontWeight: "800" },
  nfcBadge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(47,211,198,0.15)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  nfcText: { color: Colors.accent, fontSize: 13, fontWeight: "600" },
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
});
