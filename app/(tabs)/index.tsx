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
import { apiRequest, getQueryFn } from "@/lib/query-client";
import * as Haptics from "expo-haptics";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const isTablet = SCREEN_WIDTH > 700;

export default function POSScreen() {
  const insets = useSafeAreaInsets();
  const { employee } = useAuth();
  const qc = useQueryClient();
  const cart = useCart();
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
        customerName: selectedCustomer?.name || "Walk-in Customer",
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
      Alert.alert("Error", e.message || "Failed to complete sale");
    },
  });

  const handleAddToCart = useCallback((product: any) => {
    cart.addItem({ id: product.id, name: product.name, price: Number(product.price) });
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [cart]);

  const applyDiscount = () => {
    const val = Number(discountInput);
    if (isNaN(val) || val <= 0) return;
    if (discountType === "percent") {
      cart.setDiscount(cart.subtotal * (val / 100));
    } else {
      cart.setDiscount(val);
    }
    setShowDiscountModal(false);
    setDiscountInput("");
  };

  const topPad = Platform.OS === "web" ? 67 : 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top + topPad }]}>
      <View style={styles.header}>
        <LinearGradient colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.headerGradient}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Barmagly POS</Text>
            <View style={styles.headerRight}>
              {employee && <Text style={styles.employeeName}>{employee.name}</Text>}
            </View>
          </View>
        </LinearGradient>
      </View>

      <View style={styles.mainContent}>
        <View style={[styles.productsSection, isTablet && styles.productsSectionTablet]}>
          <View style={styles.searchRow}>
            <View style={styles.searchBox}>
              <Ionicons name="search" size={18} color={Colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search products..."
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
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesRow} contentContainerStyle={styles.categoriesContent}>
            <Pressable
              style={[styles.categoryChip, !selectedCategory && styles.categoryChipActive]}
              onPress={() => setSelectedCategory(null)}
            >
              <Text style={[styles.categoryChipText, !selectedCategory && styles.categoryChipTextActive]}>All</Text>
            </Pressable>
            {categories.map((cat: any) => (
              <Pressable
                key={cat.id}
                style={[styles.categoryChip, selectedCategory === cat.id && styles.categoryChipActive]}
                onPress={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
              >
                <View style={[styles.categoryDot, { backgroundColor: cat.color }]} />
                <Text style={[styles.categoryChipText, selectedCategory === cat.id && styles.categoryChipTextActive]}>{cat.name}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <FlatList
            data={filteredProducts}
            numColumns={isTablet ? 4 : 3}
            key={isTablet ? "tablet" : "phone"}
            keyExtractor={(item: any) => String(item.id)}
            contentContainerStyle={styles.productGrid}
            scrollEnabled={!!filteredProducts.length}
            renderItem={({ item }: { item: any }) => (
              <Pressable style={styles.productCard} onPress={() => handleAddToCart(item)}>
                <View style={[styles.productIcon, { backgroundColor: Colors.surfaceLight }]}>
                  <Ionicons name="cube" size={28} color={Colors.accent} />
                </View>
                <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
                <Text style={styles.productPrice}>${Number(item.price).toFixed(2)}</Text>
                {item.barcode ? <Text style={styles.barcodeText}>{item.barcode}</Text> : null}
              </Pressable>
            )}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="search" size={48} color={Colors.textMuted} />
                <Text style={styles.emptyText}>No products found</Text>
              </View>
            }
          />
        </View>

        <View style={[styles.cartSection, isTablet && styles.cartSectionTablet]}>
          <View style={styles.cartHeader}>
            <Text style={styles.cartTitle}>Cart ({cart.itemCount})</Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
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

          <Pressable style={styles.customerSelect} onPress={() => setShowCustomerPicker(true)}>
            <Ionicons name="person" size={16} color={cart.customerId ? Colors.accent : Colors.textMuted} />
            <Text style={[styles.customerSelectText, cart.customerId && { color: Colors.accent }]}>
              {selectedCustomer ? selectedCustomer.name : "Select Customer (Walk-in)"}
            </Text>
            <Ionicons name="chevron-down" size={14} color={Colors.textMuted} />
          </Pressable>

          <FlatList
            data={cart.items}
            keyExtractor={(item) => String(item.productId)}
            scrollEnabled={!!cart.items.length}
            style={styles.cartList}
            renderItem={({ item }) => (
              <View style={styles.cartItem}>
                <View style={styles.cartItemInfo}>
                  <Text style={styles.cartItemName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.cartItemPrice}>${(item.price * item.quantity).toFixed(2)}</Text>
                </View>
                <View style={styles.cartItemActions}>
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
                <Text style={styles.cartEmptyText}>Cart is empty</Text>
                <Text style={styles.cartEmptySubtext}>Tap products to add</Text>
              </View>
            }
          />

          <View style={styles.cartSummary}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>${cart.subtotal.toFixed(2)}</Text>
            </View>
            {cart.discount > 0 && (
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: Colors.success }]}>Discount</Text>
                <Text style={[styles.summaryValue, { color: Colors.success }]}>-${cart.discount.toFixed(2)}</Text>
              </View>
            )}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tax ({cart.taxRate}%)</Text>
              <Text style={styles.summaryValue}>${cart.tax.toFixed(2)}</Text>
            </View>
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>${cart.total.toFixed(2)}</Text>
            </View>
          </View>

          <Pressable
            style={[styles.checkoutBtn, !cart.items.length && styles.checkoutBtnDisabled]}
            onPress={() => cart.items.length > 0 && setShowCheckout(true)}
            disabled={!cart.items.length}
          >
            <LinearGradient
              colors={cart.items.length > 0 ? [Colors.gradientStart, Colors.accent] : ["#333", "#555"]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.checkoutBtnGradient}
            >
              <Ionicons name="card" size={20} color={Colors.white} />
              <Text style={styles.checkoutBtnText}>Checkout ${cart.total.toFixed(2)}</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>

      <Modal visible={showCheckout} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Complete Payment</Text>
                <Pressable onPress={() => setShowCheckout(false)}>
                  <Ionicons name="close" size={24} color={Colors.text} />
                </Pressable>
              </View>

              <Text style={styles.modalTotal}>${cart.total.toFixed(2)}</Text>

              {selectedCustomer && (
                <View style={styles.customerInfo}>
                  <Ionicons name="person-circle" size={20} color={Colors.accent} />
                  <Text style={styles.customerInfoText}>{selectedCustomer.name}</Text>
                  <View style={styles.loyaltyBadge}>
                    <Ionicons name="star" size={12} color={Colors.warning} />
                    <Text style={styles.loyaltyBadgeText}>{selectedCustomer.loyaltyPoints || 0} pts</Text>
                  </View>
                </View>
              )}

              <Text style={styles.sectionLabel}>Payment Method</Text>
              <View style={styles.paymentMethods}>
                {[
                  { key: "cash", icon: "cash" as const, label: "Cash" },
                  { key: "card", icon: "card" as const, label: "Card" },
                  { key: "mobile", icon: "phone-portrait" as const, label: "Mobile" },
                  { key: "qr", icon: "qr-code" as const, label: "QR Pay" },
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
                  <Text style={styles.sectionLabel}>Cash Received</Text>
                  <TextInput
                    style={styles.cashInput}
                    placeholder="Enter amount..."
                    placeholderTextColor={Colors.textMuted}
                    value={cashReceived}
                    onChangeText={setCashReceived}
                    keyboardType="decimal-pad"
                  />
                  {cashReceived && Number(cashReceived) >= cart.total && (
                    <Text style={styles.changeText}>Change: ${(Number(cashReceived) - cart.total).toFixed(2)}</Text>
                  )}
                </View>
              )}

              {paymentMethod === "qr" && (
                <View style={styles.qrPaySection}>
                  <Ionicons name="qr-code" size={64} color={Colors.accent} />
                  <Text style={styles.qrPayText}>Customer scans QR to pay</Text>
                  <Text style={styles.qrPayAmount}>${cart.total.toFixed(2)}</Text>
                </View>
              )}

              {paymentMethod === "card" && (
                <View style={styles.qrPaySection}>
                  <Ionicons name="card" size={48} color={Colors.info} />
                  <Text style={styles.qrPayText}>Tap card on NFC reader or swipe</Text>
                  <View style={styles.nfcBadge}>
                    <Ionicons name="wifi" size={16} color={Colors.accent} />
                    <Text style={styles.nfcText}>NFC Ready</Text>
                  </View>
                </View>
              )}

              <Text style={styles.sectionLabel}>Order Summary</Text>
              {cart.items.map((item) => (
                <View key={item.productId} style={styles.checkoutItem}>
                  <Text style={styles.checkoutItemName}>{item.name} x{item.quantity}</Text>
                  <Text style={styles.checkoutItemTotal}>${(item.price * item.quantity).toFixed(2)}</Text>
                </View>
              ))}

              <Pressable
                style={[styles.completeBtn, saleMutation.isPending && { opacity: 0.7 }]}
                onPress={() => !saleMutation.isPending && saleMutation.mutate()}
                disabled={saleMutation.isPending}
              >
                <LinearGradient colors={[Colors.success, "#059669"]} style={styles.completeBtnGradient}>
                  <Ionicons name="checkmark-circle" size={22} color={Colors.white} />
                  <Text style={styles.completeBtnText}>
                    {saleMutation.isPending ? "Processing..." : "Complete Sale"}
                  </Text>
                </LinearGradient>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showReceipt} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: "90%" }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.receiptHeader}>
                <View style={styles.receiptLogo}>
                  <Ionicons name="cart" size={24} color={Colors.accent} />
                </View>
                <Text style={styles.receiptBrand}>Barmagly Smart POS</Text>
                <Text style={styles.receiptSubtitle}>www.barmagly.tech</Text>
              </View>

              <View style={styles.receiptDivider} />

              <View style={styles.receiptInfo}>
                <Text style={styles.receiptInfoText}>Receipt: {lastSale?.receiptNumber || `#${lastSale?.id}`}</Text>
                <Text style={styles.receiptInfoText}>Date: {lastSale?.date}</Text>
                <Text style={styles.receiptInfoText}>Cashier: {lastSale?.employeeName}</Text>
                <Text style={styles.receiptInfoText}>Customer: {lastSale?.customerName}</Text>
              </View>

              <View style={styles.receiptDivider} />

              {lastSale?.items?.map((item: any, idx: number) => (
                <View key={idx} style={styles.receiptItem}>
                  <Text style={styles.receiptItemName}>{item.name} x{item.quantity}</Text>
                  <Text style={styles.receiptItemTotal}>${item.total.toFixed(2)}</Text>
                </View>
              ))}

              <View style={styles.receiptDivider} />

              <View style={styles.receiptTotals}>
                <View style={styles.receiptTotalRow}>
                  <Text style={styles.receiptTotalLabel}>Subtotal</Text>
                  <Text style={styles.receiptTotalValue}>${lastSale?.subtotal?.toFixed(2)}</Text>
                </View>
                {(lastSale?.discount || 0) > 0 && (
                  <View style={styles.receiptTotalRow}>
                    <Text style={[styles.receiptTotalLabel, { color: Colors.success }]}>Discount</Text>
                    <Text style={[styles.receiptTotalValue, { color: Colors.success }]}>-${lastSale?.discount?.toFixed(2)}</Text>
                  </View>
                )}
                <View style={styles.receiptTotalRow}>
                  <Text style={styles.receiptTotalLabel}>Tax</Text>
                  <Text style={styles.receiptTotalValue}>${lastSale?.tax?.toFixed(2)}</Text>
                </View>
                <View style={[styles.receiptTotalRow, { borderTopWidth: 1, borderColor: Colors.cardBorder, paddingTop: 8, marginTop: 4 }]}>
                  <Text style={styles.receiptGrandLabel}>TOTAL</Text>
                  <Text style={styles.receiptGrandValue}>${lastSale?.total?.toFixed(2)}</Text>
                </View>
                <View style={styles.receiptTotalRow}>
                  <Text style={styles.receiptTotalLabel}>Paid ({lastSale?.paymentMethod})</Text>
                  <Text style={styles.receiptTotalValue}>
                    {lastSale?.paymentMethod === "cash" ? `$${lastSale?.cashReceived?.toFixed(2)}` : `$${lastSale?.total?.toFixed(2)}`}
                  </Text>
                </View>
                {(lastSale?.change || 0) > 0 && (
                  <View style={styles.receiptTotalRow}>
                    <Text style={[styles.receiptTotalLabel, { color: Colors.warning }]}>Change</Text>
                    <Text style={[styles.receiptTotalValue, { color: Colors.warning }]}>${lastSale?.change?.toFixed(2)}</Text>
                  </View>
                )}
              </View>

              {qrDataUrl && Platform.OS === "web" && (
                <View style={styles.qrSection}>
                  <Image source={{ uri: qrDataUrl }} style={styles.qrImage} />
                  <Text style={styles.qrLabel}>Scan for digital receipt</Text>
                </View>
              )}

              <Text style={styles.receiptFooter}>Thank you for shopping with us!</Text>
              <Text style={styles.receiptFooter2}>info@barmagly.tech | +201010254819</Text>

              <Pressable style={styles.closeReceiptBtn} onPress={() => { setShowReceipt(false); setLastSale(null); setQrDataUrl(null); }}>
                <LinearGradient colors={[Colors.accent, Colors.gradientMid]} style={styles.closeReceiptGradient}>
                  <Ionicons name="checkmark" size={20} color={Colors.white} />
                  <Text style={styles.closeReceiptText}>Done</Text>
                </LinearGradient>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showCustomerPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Customer</Text>
              <Pressable onPress={() => setShowCustomerPicker(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </Pressable>
            </View>
            <Pressable style={styles.walkInBtn} onPress={() => { cart.setCustomerId(null); setShowCustomerPicker(false); }}>
              <Ionicons name="person-outline" size={20} color={Colors.textSecondary} />
              <Text style={styles.walkInText}>Walk-in Customer</Text>
            </Pressable>
            <FlatList
              data={customers}
              keyExtractor={(item: any) => String(item.id)}
              scrollEnabled={!!customers.length}
              renderItem={({ item }: { item: any }) => (
                <Pressable
                  style={[styles.customerCard, cart.customerId === item.id && styles.customerCardActive]}
                  onPress={() => { cart.setCustomerId(item.id); setShowCustomerPicker(false); }}
                >
                  <View style={styles.customerAvatar}>
                    <Text style={styles.customerAvatarText}>{item.name.charAt(0)}</Text>
                  </View>
                  <View style={styles.customerCardInfo}>
                    <Text style={styles.customerCardName}>{item.name}</Text>
                    <Text style={styles.customerCardMeta}>{item.phone || item.email || "No contact"}</Text>
                  </View>
                  <View style={styles.customerLoyalty}>
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
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Apply Discount</Text>
              <Pressable onPress={() => setShowDiscountModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </Pressable>
            </View>
            <View style={styles.discountTypeRow}>
              <Pressable style={[styles.discountTypeBtn, discountType === "fixed" && styles.discountTypeBtnActive]} onPress={() => setDiscountType("fixed")}>
                <Text style={[styles.discountTypeBtnText, discountType === "fixed" && { color: Colors.textDark }]}>Fixed ($)</Text>
              </Pressable>
              <Pressable style={[styles.discountTypeBtn, discountType === "percent" && styles.discountTypeBtnActive]} onPress={() => setDiscountType("percent")}>
                <Text style={[styles.discountTypeBtnText, discountType === "percent" && { color: Colors.textDark }]}>Percent (%)</Text>
              </Pressable>
            </View>
            <TextInput
              style={styles.cashInput}
              placeholder={discountType === "fixed" ? "Amount..." : "Percentage..."}
              placeholderTextColor={Colors.textMuted}
              value={discountInput}
              onChangeText={setDiscountInput}
              keyboardType="decimal-pad"
            />
            <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
              <Pressable style={[styles.completeBtn, { flex: 1 }]} onPress={() => { cart.setDiscount(0); setShowDiscountModal(false); }}>
                <View style={[styles.completeBtnGradient, { backgroundColor: Colors.surfaceLight }]}>
                  <Text style={styles.completeBtnText}>Clear</Text>
                </View>
              </Pressable>
              <Pressable style={[styles.completeBtn, { flex: 1 }]} onPress={applyDiscount}>
                <LinearGradient colors={[Colors.success, "#059669"]} style={styles.completeBtnGradient}>
                  <Text style={styles.completeBtnText}>Apply</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <View style={{ height: Platform.OS === "web" ? 84 : 60 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { overflow: "hidden" },
  headerGradient: { paddingHorizontal: 16, paddingVertical: 12 },
  headerContent: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerTitle: { fontSize: 22, fontWeight: "800", color: Colors.white, letterSpacing: 0.5 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 12 },
  employeeName: { color: Colors.white, fontSize: 13, opacity: 0.9 },
  mainContent: { flex: 1, flexDirection: isTablet ? "row" : "column" },
  productsSection: { flex: 1 },
  productsSectionTablet: { flex: 2 },
  searchRow: { paddingHorizontal: 12, paddingTop: 12 },
  searchBox: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.inputBg, borderRadius: 12, paddingHorizontal: 12, height: 42, borderWidth: 1, borderColor: Colors.inputBorder },
  searchInput: { flex: 1, color: Colors.text, marginLeft: 8, fontSize: 15 },
  categoriesRow: { maxHeight: 44, marginTop: 8 },
  categoriesContent: { paddingHorizontal: 12, gap: 8 },
  categoryChip: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.cardBorder, gap: 6 },
  categoryChipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  categoryChipText: { color: Colors.textSecondary, fontSize: 13, fontWeight: "600" },
  categoryChipTextActive: { color: Colors.textDark },
  categoryDot: { width: 8, height: 8, borderRadius: 4 },
  productGrid: { padding: 8 },
  productCard: { flex: 1, margin: 4, backgroundColor: Colors.surface, borderRadius: 14, padding: 12, alignItems: "center", borderWidth: 1, borderColor: Colors.cardBorder, minWidth: 90 },
  productIcon: { width: 52, height: 52, borderRadius: 14, justifyContent: "center", alignItems: "center", marginBottom: 8 },
  productName: { color: Colors.text, fontSize: 12, fontWeight: "600", textAlign: "center", marginBottom: 4 },
  productPrice: { color: Colors.accent, fontSize: 14, fontWeight: "800" },
  barcodeText: { color: Colors.textMuted, fontSize: 9, marginTop: 2 },
  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  emptyText: { color: Colors.textMuted, fontSize: 15, marginTop: 12 },
  cartSection: { backgroundColor: Colors.surface, borderTopWidth: 1, borderColor: Colors.cardBorder, maxHeight: isTablet ? undefined : 360 },
  cartSectionTablet: { flex: 1, borderTopWidth: 0, borderLeftWidth: 1, maxHeight: undefined },
  cartHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderColor: Colors.cardBorder },
  cartTitle: { color: Colors.text, fontSize: 16, fontWeight: "700" },
  customerSelect: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderColor: "rgba(255,255,255,0.05)" },
  customerSelectText: { color: Colors.textMuted, fontSize: 13, flex: 1 },
  cartList: { maxHeight: isTablet ? undefined : 100 },
  cartItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderColor: "rgba(255,255,255,0.05)" },
  cartItemInfo: { flex: 1 },
  cartItemName: { color: Colors.text, fontSize: 13, fontWeight: "500" },
  cartItemPrice: { color: Colors.accent, fontSize: 12, marginTop: 2 },
  cartItemActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  qtyBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.surfaceLight, justifyContent: "center", alignItems: "center" },
  qtyText: { color: Colors.text, fontSize: 14, fontWeight: "700", minWidth: 20, textAlign: "center" },
  cartEmpty: { alignItems: "center", paddingVertical: 20 },
  cartEmptyText: { color: Colors.textMuted, fontSize: 14, marginTop: 8 },
  cartEmptySubtext: { color: Colors.textMuted, fontSize: 12, marginTop: 4 },
  cartSummary: { paddingHorizontal: 16, paddingVertical: 8, borderTopWidth: 1, borderColor: Colors.cardBorder },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  summaryLabel: { color: Colors.textSecondary, fontSize: 13 },
  summaryValue: { color: Colors.text, fontSize: 13, fontWeight: "600" },
  totalRow: { borderTopWidth: 1, borderColor: Colors.cardBorder, paddingTop: 8, marginTop: 4 },
  totalLabel: { color: Colors.text, fontSize: 16, fontWeight: "800" },
  totalValue: { color: Colors.accent, fontSize: 18, fontWeight: "800" },
  checkoutBtn: { marginHorizontal: 16, marginBottom: 8, borderRadius: 14, overflow: "hidden" },
  checkoutBtnDisabled: { opacity: 0.5 },
  checkoutBtnGradient: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 14, gap: 8 },
  checkoutBtnText: { color: Colors.white, fontSize: 16, fontWeight: "700" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", alignItems: "center" },
  modalContent: { backgroundColor: Colors.surface, borderRadius: 20, padding: 24, width: isTablet ? 420 : "90%", maxHeight: "80%" },
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
