import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "expo-router";
import {
  StyleSheet, Text, View, FlatList, Pressable, TextInput,
  ScrollView, Modal, Alert, Platform, Dimensions, Image, Animated, ActivityIndicator, Linking, I18nManager,
} from "react-native";
import Svg, { Path as SvgPath, Rect as SvgRect } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Colors } from "@/constants/colors";
import { themedStyles } from "@/lib/themed-styles";
import { useCart } from "@/lib/cart-context";
import type { WholesalePricing } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { useLicense } from "@/lib/license-context";
import { apiRequest, getQueryFn, getApiUrl } from "@/lib/query-client";
import { getDisplayNumber } from "@/lib/api-config";
import BarcodeScannerModal, { type ScanFeedback } from "@/components/BarcodeScannerModal";
import { findProductByCode, looksLikeBarcode, normalizeBarcode, useHardwareBarcodeScanner } from "@/lib/barcode";
import { playClickSound, playAddSound } from "@/lib/sound";
import RealTimeClock from "@/components/RealTimeClock";
import { useLanguage } from "@/lib/language-context";
import { useTheme } from "@/lib/theme-context";
import { useNotifications } from "@/lib/notification-context";
import { printHtmlViaIframe, autoPrint3Copies, getReceiptPrinterPrefs } from "@/utils/printing";
import { getChromeMetrics } from "@/lib/responsive";
import { getWebStaticFallbackChain } from "@/lib/web-static";
import {
  PIZZA_TOPPINGS, TOPPING_PRICE, TOPPING_GRID, SAUCE_ROW, SAUCE_NAMES,
  calcToppingsPrice, getToppingDisplayName, getToppingEmoji, getToppingInfo,
} from "@/utils/toppingUtils";
import { formatMoney, formatAmount, currencyLabel, setCurrency, isZeroDecimalCurrency } from "@/lib/currency";
import { parseAmountInput, roundMoney, moneyString, cashSuggestions, moneyStep, toLatinDigits } from "@/lib/money-input";
import { showAlert, confirmAsync, describeError, isUncertainFailure } from "@/lib/alert";
import ShamCashTillModal from "@/components/ShamCashTillModal";

type ProductVariantOption = {
  name: string;
  price: number;
};

const AnimatedProductImage = ({ uri }: { uri: string }) => {
  const fallbacks = getWebStaticFallbackChain(uri);
  const [currentUri, setCurrentUri] = useState(fallbacks[0] || uri);

  useEffect(() => {
    setCurrentUri(fallbacks[0] || uri);
  }, [uri]);

  return (
    <Image
      source={{ uri: currentUri }}
      style={{ width: 50, height: 50, borderRadius: 12 }}
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
};

// ── Stripe capture at the till ───────────────────────────────────────────────
// The shop has no card reader, and Stripe Terminal cannot do TWINT anyway, so a
// card/TWINT/wallet sale is captured by showing the customer a Stripe-hosted
// Checkout link — as a QR they scan and as a tappable link — which they pay on
// their own phone. The sale row is written with paymentStatus "pending" and only
// the signature-verified Stripe webhook ever flips it to "paid"; the till just
// polls the sale until the server says so.
const STRIPE_METHODS = ["card", "wallet"] as const;
const isStripeMethod = (pm: string) => (STRIPE_METHODS as readonly string[]).includes(pm);
/**
 * Currencies Stripe cannot charge in (Stripe does not operate in Syria). A
 * store in one of these never sees the card/TWINT/wallet buttons at all —
 * not greyed out, not offered — so a cashier cannot start a payment that the
 * platform's live Stripe account would then take in the wrong currency.
 */
const STRIPE_UNSUPPORTED_CURRENCIES = new Set(["SYP"]);

/** Reference that ties every attempt at one checkout to the sale it creates. */
const newCheckoutRef = () =>
  `pos-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

/** A sale row carries our checkout reference inside payment_details. */
const saleHasCheckoutRef = (sale: any, ref: string): boolean => {
  let details = sale?.paymentDetails;
  if (typeof details === "string") {
    try { details = JSON.parse(details); } catch { return false; }
  }
  return Array.isArray(details) && details.some((d: any) => d && d.ref === ref);
};

/** How often the till asks the server whether the webhook has landed. */
const STRIPE_POLL_MS = 2500;
/** Give up polling after this long — the cashier can resume or take cash. */
const STRIPE_POLL_TIMEOUT_MS = 10 * 60 * 1000;

type StripeCapture = {
  saleId: number;
  sale: any;
  checkoutUrl: string;
  paymentIntentId: string | null;
  /** Minor units, priced by the server — the till never sends an amount. */
  amountMinor: number;
  currency: string;
};

const QR_QUIET_ZONE = 2;

/**
 * Same run-length walk the `qrcode` package's own SVG renderer uses: one
 * horizontal stroke per run of dark modules, so the whole symbol is a single
 * <Path> instead of a few hundred rects.
 */
function qrModulesToPath(data: Uint8Array, size: number, margin: number): string {
  let path = "";
  let moveBy = 0;
  let newRow = false;
  let lineLength = 0;
  for (let i = 0; i < data.length; i++) {
    const col = i % size;
    const row = Math.floor(i / size);
    if (!col && !newRow) newRow = true;
    if (data[i]) {
      lineLength++;
      if (!(i > 0 && col > 0 && data[i - 1])) {
        path += newRow ? `M${col + margin} ${0.5 + row + margin}` : `m${moveBy} 0`;
        moveBy = 0;
        newRow = false;
      }
      if (!(col + 1 < size && data[i + 1])) {
        path += `h${lineLength}`;
        lineLength = 0;
      }
    } else {
      moveBy++;
    }
  }
  return path;
}

/**
 * QR drawn locally from the bundled `qrcode` dependency. Deliberately not an
 * image service — an earlier audit caught api.qrserver.com being handed live
 * checkout links. `QRCode.create` is pure JS (no canvas), so this also renders
 * inside the Android build, unlike the `toDataURL` path used for receipts.
 */
const PaymentQrCode = ({ value, size }: { value: string; size: number }) => {
  const qr = React.useMemo(() => {
    try {
      const QRCode = require("qrcode");
      const { modules } = QRCode.create(value, { errorCorrectionLevel: "M" });
      return {
        d: qrModulesToPath(modules.data, modules.size, QR_QUIET_ZONE),
        span: modules.size + QR_QUIET_ZONE * 2,
      };
    } catch {
      return null;
    }
  }, [value]);

  if (!qr) return null;
  // Always black on white: a themed QR is a QR that will not scan.
  return (
    <View style={{ backgroundColor: "#FFFFFF", padding: 10, borderRadius: 14 }}>
      <Svg width={size} height={size} viewBox={`0 0 ${qr.span} ${qr.span}`}>
        <SvgRect x={0} y={0} width={qr.span} height={qr.span} fill="#FFFFFF" />
        <SvgPath d={qr.d} stroke="#000000" strokeWidth={1} fill="none" />
      </Svg>
    </View>
  );
};

export default function POSScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { employee, isCashier, canManage, login, logout } = useAuth();
  const { tenant } = useLicense();
  const qc = useQueryClient();
  const cart = useCart();
  const { t, isRTL, rtlTextAlign, language, currency } = useLanguage();
  /** Picks the copy for the current language: L("عربي", "Deutsch", "English"). */
  const L = useCallback((ar: string, de: string, en: string) => (language === "ar" ? ar : language === "de" ? de : en), [language]);
  // Rows already follow the reading direction: the web document runs with
  // dir="rtl" and native Arabic with I18nManager forced RTL. Reversing a row by
  // hand on top of that flipped Arabic back to left-to-right, so rows are only
  // reversed where nothing else does it (native, before the RTL restart).
  const flipRow = isRTL && Platform.OS !== "web" && !I18nManager.isRTL;
  // Physical left/right (borders, margins) is not mirrored by CSS direction.
  const webRTL = isRTL && Platform.OS === "web";
  const stripeCurrencyOk = !STRIPE_UNSUPPORTED_CURRENCIES.has(String(currency || "").toUpperCase());
  const { isDark, toggle: toggleTheme } = useTheme();
  const [screenDims, setScreenDims] = useState(Dimensions.get("window"));
  useEffect(() => {
    const sub = Dimensions.addEventListener("change", ({ window }) => setScreenDims(window));
    return () => sub?.remove();
  }, []);
  const isTablet = screenDims.width > 600;
  const { isMobileWeb, topPad } = getChromeMetrics(screenDims.width);
  // Icon-only header buttons below desktop width so the bar never overflows
  // (German/Arabic labels are long); every button keeps an accessibility label.
  const compactHeader = screenDims.width < 1180;
  const useMobileCartSidebar = isMobileWeb;
  const prefersInlineSizePicker = Platform.OS === "web";
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [cashReceived, setCashReceived] = useState("");
  const [lastSale, setLastSale] = useState<any>(null);
  const [discountInput, setDiscountInput] = useState("");
  const [discountType, setDiscountType] = useState<"fixed" | "percent">("fixed");
  const [manualAdjustment, setManualAdjustment] = useState(0);
  // ± step for the manual adjustment: 1 in CHF-style currencies, 10 in SYP.
  const adjustStep = moneyStep(currency, "small");
  /** What the customer pays: cart total plus the manual ± adjustment, in payable units. */
  const payableTotal = roundMoney(cart.total + manualAdjustment, currency);
  const feeStep = moneyStep(currency, "fee");
  /** Swiss-only helpers (city chips, geo.admin.ch address search, 079 numbers). */
  const swissStore = String(currency || "").toUpperCase() === "CHF";
  /** Physical "end" alignment for number columns (RN-web does not swap left/right). */
  const zeroEndAlign: "left" | "right" = webRTL ? "left" : (isRTL && I18nManager.isRTL ? "right" : isRTL ? "left" : "right");
  const dateLocale = language === "ar" ? "ar-SY-u-nu-latn" : language === "de" ? "de-CH" : "en-GB";
  const paymentLabel = (pm?: string | null): string => {
    switch (String(pm || "cash").toLowerCase()) {
      case "cash": return t("cash");
      case "card": return t("card");
      case "wallet": return t("walletPay");
      case "shamcash": return L("شام كاش", "Sham Cash", "Sham Cash");
      case "credit": return L("آجل", "Auf Rechnung", "On credit");
      case "mobile": return L("جوال", "Mobile", "Mobile");
      default: return String(pm).toUpperCase();
    }
  };
  const [showScanner, setShowScanner] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [debouncedCustomerSearch, setDebouncedCustomerSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCustomerSearch(customerSearch);
    }, 400);
    return () => clearTimeout(timer);
  }, [customerSearch]);

  // Card / TWINT / wallet capture — see STRIPE_METHODS above.
  const [stripeCapture, setStripeCapture] = useState<StripeCapture | null>(null);
  const [stripeStage, setStripeStage] = useState<"idle" | "creating" | "waiting" | "paid" | "failed">("idle");
  const [stripeError, setStripeError] = useState("");
  const [showInvoiceHistory, setShowInvoiceHistory] = useState(false);
  const [invoiceFilter24h, setInvoiceFilter24h] = useState(true); // default: last 24h
  const [invoiceSearch, setInvoiceSearch] = useState("");
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
  const [editingCartItemId, setEditingCartItemId] = useState<number | null>(null);
  const [phoneInput, setPhoneInput] = useState("");
  const [customerPhoneLoading, setCustomerPhoneLoading] = useState(false);
  const [leftHandMode, setLeftHandMode] = useState(false);
  const [expandedSizeProductId, setExpandedSizeProductId] = useState<number | null>(null);
  const [showMobileCart, setShowMobileCart] = useState(false);
  useEffect(() => {
    import("@react-native-async-storage/async-storage").then(({ default: AsyncStorage }) => {
      AsyncStorage.getItem("barmagly_left_hand_mode").then((v) => {
        if (v === "true") setLeftHandMode(true);
      });
    });
  }, []);
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({ name: "", phone: "", address: "", email: "" });
  const [ncAddrSuggestions, setNcAddrSuggestions] = useState<{ label: string }[]>([]);
  const [ncAddrSearching, setNcAddrSearching] = useState(false);
  const [ncShowSuggestions, setNcShowSuggestions] = useState(false);
  const [ncCityFilter, setNcCityFilter] = useState("Zürich");
  const ncAddrTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showCallHistory, setShowCallHistory] = useState(false);
  const [callHistoryFilter, setCallHistoryFilter] = useState<"all" | "missed" | "answered" | "today">("all");
  const [callHistorySearch, setCallHistorySearch] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [showOrderNotes, setShowOrderNotes] = useState(false);
  const [endOfDayLoading, setEndOfDayLoading] = useState(false);
  const [showZeroOutPreview, setShowZeroOutPreview] = useState(false);
  const [zeroOutSalesData, setZeroOutSalesData] = useState<any[]>([]);
  const [zeroOutLoading, setZeroOutLoading] = useState(false);
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

  const toppingDisplayName = (name: string) => getToppingDisplayName(name, language);
  const toppingEmoji = (name: string) => getToppingEmoji(name);

  useEffect(() => {
    if (!useMobileCartSidebar || typeof window === "undefined") return;

    const openCart = () => setShowMobileCart(true);
    window.addEventListener("barmagly-open-cart", openCart as EventListener);
    return () => window.removeEventListener("barmagly-open-cart", openCart as EventListener);
  }, [useMobileCartSidebar]);

  useEffect(() => {
    if (!useMobileCartSidebar) {
      setShowMobileCart(false);
    }
  }, [useMobileCartSidebar]);


  const { data: categories = [] } = useQuery<any[]>({
    queryKey: ["/api/categories", tenantId ? `?tenantId=${tenantId}` : ""],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!tenantId,
  });

  const { data: products = [] } = useQuery<any[]>({
    queryKey: ["/api/products", `?tenantId=${tenantId || ""}${search ? `&search=${encodeURIComponent(search)}` : ""}&applyMarkup=true`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!tenantId,
  });

  // Stock lives in `inventory` (per branch), not on the product row. The
  // cashier's branch when they have one, otherwise every branch of the store.
  const tracksStock = !!tenantId && tenant?.storeType !== "restaurant";
  const { data: inventoryRows = [] } = useQuery<any[]>({
    queryKey: ["/api/inventory", `?tenantId=${tenantId || ""}${employee?.branchId ? `&branchId=${employee.branchId}` : ""}`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: tracksStock,
  });
  const stockByProduct = React.useMemo(() => {
    const m = new Map<number, number>();
    for (const r of inventoryRows as any[]) {
      const id = Number(r.productId);
      m.set(id, (m.get(id) || 0) + (Number(r.quantity) || 0));
    }
    return m;
  }, [inventoryRows]);

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

  const { data: vehicles = [] } = useQuery<any[]>({
    queryKey: [tenantId ? `/api/vehicles?tenantId=${tenantId}` : "/api/vehicles"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!tenantId,
  });

  // Publishable config only — the secret key never leaves the server. Used to
  // decide whether the card/TWINT/wallet buttons can honestly be offered.
  const { data: paymentsConfig } = useQuery<any>({
    queryKey: ["/api/payments/config", tenantId ? `?tenantId=${tenantId}` : ""],
    queryFn: getQueryFn({ on401: "throw" }),
    staleTime: 5 * 60 * 1000,
  });
  // Sham Cash sits next to the Stripe methods for any store that set up its
  // own QR code / number, and for SYP/USD stores (greyed out until set up).
  const shamCashReady = !!paymentsConfig?.shamcash?.enabled;
  // A Syrian-pound store always sees the Sham Cash button (greyed out until
  // its QR/number is set up), even before the payments config has loaded.
  const shamCashStore = shamCashReady || !!paymentsConfig?.shamcash?.currency || String(currency).toUpperCase() === "SYP";
  const stripeAllowed = stripeCurrencyOk
    && !STRIPE_UNSUPPORTED_CURRENCIES.has(String(paymentsConfig?.currency || "").toUpperCase());
  const stripeReady = stripeAllowed && paymentsConfig?.stripe?.status === "connected";
  // A method that is not on offer (Stripe for an SYP store, "on credit" once
  // the trader is removed) must not stay selected out of sight.
  useEffect(() => {
    if ((isStripeMethod(paymentMethod) && !stripeAllowed) || (paymentMethod === "credit" && !cart.customerId)) {
      setPaymentMethod("cash");
    }
  }, [paymentMethod, stripeAllowed, cart.customerId]);
  // Raw Stripe method ids ("apple_pay") read badly in a label.
  const stripeMethods: string[] = (paymentsConfig?.stripe?.availableMethods || [])
    .map((m: string) => m.replace(/_/g, " "));
  // Settings → Payment gateways → "Enabled payment methods" (the till's
  // "wallet" button is the gateway's "mobile" entry). Cash is the default and
  // the fallback for a failed card payment, so it always stays.
  const tillMethodEnabled = (key: string) => {
    const enabled: string[] | undefined = paymentsConfig?.enabledMethods;
    if (!Array.isArray(enabled) || key === "cash" || key === "shamcash" || key === "credit") return true;
    return enabled.includes(key === "wallet" ? "mobile" : key);
  };

  // ── Loyalty (Settings → Loyalty) ──────────────────────────────────────────
  // Same query key as the settings screen, so a saved change shows up here.
  // The server awards the points on POST /api/sales; the till only offers the
  // redemption, which it applies as a discount and reports with the sale.
  const { data: loyaltyConfigRaw } = useQuery<any>({
    queryKey: ["/api/landing-page-config", tenantId ? `?tenantId=${tenantId}` : ""],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!tenantId,
  });
  const loyalty = {
    enabled: loyaltyConfigRaw?.enableLoyalty !== false,
    pointsPerUnit: Number(loyaltyConfigRaw?.loyaltyPointsPerUnit ?? 1) || 0,
    pointValue: Number(loyaltyConfigRaw?.loyaltyRedemptionRate ?? 0.01) || 0,
    minRedeem: Math.max(1, Number(loyaltyConfigRaw?.loyaltyMinRedeemPoints) || 0),
  };
  const [loyaltyRedeem, setLoyaltyRedeem] = useState<{
    customerId: number; points: number; value: number; rate: number; prevRate: number; subtotal: number;
  } | null>(null);
  // A redemption is a discount rate fixed for one customer and one cart. If
  // the cart moves on under it, undo it rather than bill a stale discount.
  useEffect(() => {
    if (!loyaltyRedeem) return;
    const ownRate = Math.abs(cart.discountRate - loyaltyRedeem.rate) < 1e-9;
    const sameCart = loyaltyRedeem.customerId === cart.customerId
      && Math.abs(loyaltyRedeem.subtotal - cart.subtotal) < 0.005;
    if (ownRate && sameCart) return;
    // Still our discount on a changed cart: restore the discount from before.
    // Someone else replaced the rate (manual discount, cleared cart): just forget it.
    if (ownRate && cart.items.length > 0) cart.setDiscount(loyaltyRedeem.prevRate);
    setLoyaltyRedeem(null);
  }, [loyaltyRedeem, cart.discountRate, cart.customerId, cart.subtotal, cart.items.length]);
  /** How many of the selected customer's points this cart can absorb, and their value. */
  const loyaltyRedeemable = () => {
    if (!cart.customerId || !loyalty.enabled || loyalty.pointValue <= 0 || cart.subtotal <= 0) return null;
    const balance = Number(selectedCustomer?.loyaltyPoints) || 0;
    // Never discount more than what is left after any existing discount.
    const room = Math.max(0, cart.subtotal - cart.discount);
    const points = Math.min(balance, Math.floor(room / loyalty.pointValue + 1e-9));
    if (points < loyalty.minRedeem) return null;
    return { points, value: roundMoney(points * loyalty.pointValue, currency) };
  };
  const toggleLoyaltyRedeem = () => {
    if (loyaltyRedeem) {
      cart.setDiscount(loyaltyRedeem.prevRate);
      setLoyaltyRedeem(null);
      return;
    }
    const redeemable = loyaltyRedeemable();
    if (!redeemable || !cart.customerId) return;
    const { points, value } = redeemable;
    const rate = ((cart.discount + value) / cart.subtotal) * 100;
    cart.setDiscount(rate);
    setLoyaltyRedeem({ customerId: cart.customerId, points, value, rate, prevRate: cart.discountRate, subtotal: cart.subtotal });
  };

  const loadInvoiceDetails = async (saleId: number) => {
    try {
      const res = await apiRequest("GET", `/api/sales/${saleId}`);
      const raw = await res.json();
      // The sales row names its money columns taxAmount / discountAmount /
      // serviceFeeAmount; the receipt views read tax / discount / serviceFee.
      const data = {
        ...raw,
        tax: raw?.tax ?? raw?.taxAmount,
        discount: raw?.discount ?? raw?.discountAmount,
        serviceFee: raw?.serviceFee ?? raw?.serviceFeeAmount,
      };
      setSelectedInvoice(data);
      if (Platform.OS === "web") {
        try {
          const QRCode = require("qrcode");
          const url = await QRCode.toDataURL(`barmagly:receipt:${data.receiptNumber || data.id}`, { width: 200, margin: 1, color: { dark: "#0A0E27", light: "#FFFFFF" } });
          setReprintQrDataUrl(url);
        } catch { }
      }
      setShowReprintReceipt(true);
    } catch (e) {
      showAlert(t("error"), describeError(e, language, t("saleNotFound")));
    }
  };

  const printReceipt = () => {
    if (!selectedInvoice) return;
    if (Platform.OS !== "web") {
      const inv = selectedInvoice;
      const itemsText = (inv.items || []).map((item: any) =>
        `${item.productName || item.name}  x${item.quantity}  ${formatMoney(item.total || (item.unitPrice * item.quantity))}`
      ).join("\n");
      const receiptText = `${storeSettings?.name || tenant?.name || "POS System"}\n${storeSettings?.address || ""}\n${"─".repeat(30)}\n${t("receiptNumber")}: ${getDisplayNumber(inv.receiptNumber) || "#" + inv.id}\n${t("receiptDate")}: ${new Date(inv.createdAt || inv.date).toLocaleString(dateLocale)}\n${"─".repeat(30)}\n${itemsText}\n${"─".repeat(30)}\n${t("total")}: ${formatMoney(inv.totalAmount)}\n${t("paymentMethod")}: ${paymentLabel(inv.paymentMethod)}\n${"═".repeat(30)}\n${t("thankYou")}`;
      showAlert(t("printInvoice"), receiptText);
      return;
    }
    const inv = selectedInvoice;
    const cartItems = (inv.items || []).map((item: any) => ({
      name: item.productName || item.name,
      quantity: item.quantity,
      price: Number(item.unitPrice || (item.quantity > 0 ? (item.total / item.quantity) : 0) || 0),
      categoryId: item.categoryId,
    }));
    const custObj = { address: inv.customerAddress || "", phone: inv.customerPhone || "" };
    const vehicleObj = (vehicles as any[]).find((v: any) => v.id == inv.vehicleId);
    autoPrint3Copies(
      inv,
      cartItems,
      Number(inv.subtotal || inv.totalAmount),
      Number(inv.tax || 0),
      Number(inv.discount || 0),
      Number(inv.serviceFee || inv.serviceFeeAmount || 0),
      Number(inv.totalAmount),
      Number(inv.deliveryFee || 0),
      inv.paymentMethod || "cash",
      0,
      inv.customerName || t("walkIn"),
      inv.employeeName || employee?.name || "",
      custObj,
      vehicleObj,
      Number(inv.minimumOrderSurcharge || 0),
      storeSettings,
      tenant,
      categories as any[]
    );
  };

  const isPizzaProduct = useCallback((product: any) => {
    if (!product) return false;
    const name = (product.name || "").toLowerCase();
    const catName = (categories as any[]).find((c: any) => c.id === product.categoryId)?.name?.toLowerCase() || "";
    return name.includes("pizza") || catName.includes("pizza");
  }, [categories]);

  const isFingerfoodProduct = useCallback((product: any) => {
    if (!product) return false;
    const name = (product.name || "").toLowerCase();
    const catName = (categories as any[]).find((c: any) => c.id === product.categoryId)?.name?.toLowerCase() || "";
    return name.includes("fingerfood") || catName.includes("fingerfood");
  }, [categories]);

  const parseJsonArrayLike = useCallback((value: unknown) => {
    if (Array.isArray(value)) return value;
    if (typeof value !== "string") return [];
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, []);

  const getProductVariantOptions = useCallback((product: any): ProductVariantOption[] => {
    if (!product) return [];

    const explicitVariants = parseJsonArrayLike(product.variants)
      .map((variant: any) => ({
        name: String(variant?.name || "").trim(),
        price: Number(variant?.price ?? 0),
      }))
      .filter((variant: ProductVariantOption) => variant.name);

    if (explicitVariants.length > 0) {
      return explicitVariants;
    }

    const modifiers = parseJsonArrayLike(product.modifiers);
    const sizeModifier = modifiers.find((modifier: any) => {
      const modifierName = String(modifier?.name || "").toLowerCase();
      const options = parseJsonArrayLike(modifier?.options);
      const optionLooksLikeSize = options.some((option: any) => {
        const label = String(option?.label || option?.name || "").toLowerCase();
        return /cm|cl|\b1[\.,]5\b|\b50\b|gross|klein/.test(label);
      });
      return options.length > 1 && (
        modifier?.required === true ||
        modifierName.includes("grösse") ||
        modifierName.includes("größe") ||
        modifierName.includes("size") ||
        optionLooksLikeSize
      );
    });

    if (!sizeModifier) {
      return [];
    }

    const basePrice = Number(product.price || 0);
    return parseJsonArrayLike(sizeModifier.options)
      .map((option: any) => ({
        name: String(option?.label || option?.name || "").trim(),
        price: basePrice + Number(option?.price ?? 0),
      }))
      .filter((variant: ProductVariantOption) => variant.name);
  }, [parseJsonArrayLike]);

  const getShortVariantLabel = useCallback((label: string) => {
    return label
      .replace(/\s*normal$/i, "")
      .replace(/\s*klein$/i, "")
      .replace(/\s*gross.*$/i, "")
      .replace(/\s*\(\+.*?\)\s*$/i, "")
      .trim();
  }, []);

  const getVariantSummaryLabel = useCallback((product: any) => {
    const variants = getProductVariantOptions(product);
    if (variants.length === 0) return "";
    return variants.map((variant) => getShortVariantLabel(variant.name)).join(" / ");
  }, [getProductVariantOptions, getShortVariantLabel]);

  const resetProductOptionsState = useCallback(() => {
    setExpandedSizeProductId(null);
    setSelectedProductForOptions(null);
    setSelectedVariant(null);
    setSelectedToppings([]);
    setShowToppingsStep(false);
    setEditingCartItemId(null);
  }, []);

  const openProductOptions = useCallback((product: any, options?: {
    variant?: ProductVariantOption | null;
    toppings?: string[];
    editingItemId?: number | null;
    showExtras?: boolean;
  }) => {
    const variants = getProductVariantOptions(product);
    setExpandedSizeProductId(null);
    setSelectedProductForOptions(variants.length > 0 ? { ...product, variants } : product);
    setSelectedVariant(options?.variant ?? null);
    setSelectedToppings(options?.toppings ?? []);
    setShowToppingsStep(options?.showExtras ?? false);
    setEditingCartItemId(options?.editingItemId ?? null);
    playClickSound("light");
  }, [getProductVariantOptions]);

  const getCartItemVariant = useCallback((product: any, itemName: string) => {
    const match = itemName.match(/\(([^)]+)\)/);
    if (!match) return null;
    const variantName = match[1].trim();
    return getProductVariantOptions(product).find((variant) => variant.name === variantName) || null;
  }, [getProductVariantOptions]);

  const parseToppingsFromName = (itemName: string): string[] => {
    const match = itemName.match(/\[(.+?)\]\s*$/);
    if (!match) return [];
    const displayNames = match[1].split(", ");
    const allToppings: string[] = [
      ...TOPPING_GRID.flatMap(row => row.items).filter(Boolean) as string[],
      ...SAUCE_ROW.map(s => s.name),
    ];
    return allToppings.filter(t => displayNames.includes(toppingDisplayName(t)));
  };

  useEffect(() => {
    setExpandedSizeProductId(null);
  }, [search, selectedCategory, tenantId]);

  useEffect(() => {
    if (storeSettings?.taxRate !== undefined) {
      cart.setTaxRate(Number(storeSettings.taxRate) || 0);
    }
    if (storeSettings?.commissionRate !== undefined) {
      cart.setServiceFeeRate(Number(storeSettings.commissionRate) || 0);
    }
    // BIZ-01: minimum-order top-up is opt-in per store and delivery-only.
    cart.setMinOrderAmount(Number(storeSettings?.minOrderAmount) || 0);
  }, [storeSettings?.taxRate, storeSettings?.commissionRate, storeSettings?.minOrderAmount]);

  // Store currency = main branch's `currency`. The license context already set
  // it at login; this keeps it in sync when store settings are refetched.
  useEffect(() => {
    if (storeSettings?.currency) setCurrency(storeSettings.currency);
  }, [storeSettings?.currency]);

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
    const s = search ? search.toLowerCase() : "";
    const matchesSearch = s ? (
      (p.name || "").toLowerCase().includes(s) ||
      (p.nameAr || "").toLowerCase().includes(s) ||
      (p.sku || "").toLowerCase().includes(s) ||
      (p.barcode || "").toLowerCase().includes(s) ||
      (p.description || "").toLowerCase().includes(s)
    ) : true;
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

  // Build combined address from address field or separate street/city fields
  const selectedCustomerAddress = selectedCustomer
    ? (selectedCustomer.address ||
        [selectedCustomer.street, selectedCustomer.streetNr || selectedCustomer.houseNr, selectedCustomer.postalCode, selectedCustomer.city]
          .filter(Boolean).join(" "))
    : "";

  // ── Wholesale traders (تجار الجملة) — app/wholesale.tsx, server/wholesale.ts ──
  // A trader is a customer with customerType "wholesale": their cart is billed
  // at wholesale prices and may be paid "credit" (آجل) up to their limit.
  const { data: wholesaleTraders = [] } = useQuery<any[]>({
    queryKey: [`/api/wholesale/traders?tenantId=${tenantId || ""}`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!tenantId,
    staleTime: 30 * 1000,
  });
  const selectedTrader: any = cart.customerId
    ? (wholesaleTraders as any[]).find((tr: any) => tr.id === cart.customerId) || null
    : null;
  // Same key as the product grid without a search, so normally already cached.
  const { data: wholesaleCatalog } = useQuery<any[]>({
    queryKey: ["/api/products", `?tenantId=${tenantId || ""}&applyMarkup=true`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!tenantId && !!selectedTrader,
  });
  useEffect(() => {
    if (!selectedTrader || !wholesaleCatalog) {
      cart.setWholesalePricing(null);
      return;
    }
    const pricing: WholesalePricing = {};
    for (const p of wholesaleCatalog) {
      if (p?.wholesalePrice == null || p.wholesalePrice === "") continue;
      pricing[p.id] = { price: Number(p.wholesalePrice), minQty: Number(p.wholesaleMinQty) || 1, retail: Number(p.price) };
    }
    cart.setWholesalePricing(pricing);
  }, [selectedTrader?.id, wholesaleCatalog]);
  useEffect(() => {
    if (!selectedTrader && paymentMethod === "credit") setPaymentMethod("cash");
  }, [selectedTrader, paymentMethod]);
  const wholesaleLineCount = cart.items.filter((i) => i.wholesale).length;
  const creditBalanceAfterSale = selectedTrader ? Number(selectedTrader.balance || 0) + cart.total + manualAdjustment : 0;
  const creditLimitExceeded = !!selectedTrader && selectedTrader.creditLimit != null
    && creditBalanceAfterSale > Number(selectedTrader.creditLimit) + 0.004;
  const wholesaleBanner = selectedTrader ? (
    <View style={{ flexDirection: flipRow ? "row-reverse" : "row", alignItems: "center", gap: 8, marginHorizontal: 10, marginBottom: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: Colors.info + "18", borderWidth: 1, borderColor: Colors.info + "55" }}>
      <View style={{ backgroundColor: Colors.info, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 }}>
        <Text style={{ color: Colors.white, fontSize: 11, fontWeight: "800" }}>
          {language === "ar" ? "جملة" : language === "de" ? "Großhandel" : "Wholesale"}
        </Text>
      </View>
      <Text style={{ flex: 1, color: Colors.text, fontSize: 11, fontWeight: "600", textAlign: isRTL ? "right" : "left" }} numberOfLines={1}>
        {(selectedTrader.shopName || selectedTrader.name) + " · "}
        {language === "ar" ? "الرصيد" : language === "de" ? "Saldo" : "Balance"}: {formatMoney(selectedTrader.balance)}
        {selectedTrader.creditLimit != null ? ` / ${formatMoney(selectedTrader.creditLimit)}` : ""}
      </Text>
      {wholesaleLineCount > 0 && (
        <Text style={{ color: Colors.info, fontSize: 11, fontWeight: "700" }}>
          {wholesaleLineCount} {language === "ar" ? "بسعر الجملة" : language === "de" ? "zum Großhandelspreis" : "at wholesale"}
        </Text>
      )}
    </View>
  ) : null;

  const handlePhoneSearch = useCallback(async (phone: string, openFormIfMissing = true) => {
    const trimmed = toLatinDigits(phone).trim();
    if (!trimmed) {
      cart.setCustomerId(null);
      return;
    }
    const digitsOnly = (p: string) => toLatinDigits(p || "").replace(/\D/g, "");
    // Already showing this customer: nothing to look up.
    if (selectedCustomer?.phone && digitsOnly(selectedCustomer.phone) === digitsOnly(trimmed)) return;

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
    const tail = normTrimmed.slice(-8);
    // Too short to identify anyone (and "" would match every customer).
    const found = tail.length >= 6 ? (customers as any[]).find((c: any) =>
      c.phone && normalize(c.phone).includes(tail)
    ) : undefined;
    if (found) {
      cart.setCustomerId(found.id);
      setCallerCustomer(found);
    } else if (openFormIfMissing) {
      setNewCustomerForm({ name: "", phone: trimmed, address: "", email: "" });
      setShowNewCustomerForm(true);
    }
  }, [customers, cart, tenantId, selectedCustomer]);

  const handleCreateCustomer = async () => {
    if (!newCustomerForm.name.trim() || customerPhoneLoading) return;
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
      // Keep the new customer on screen before the customer list refetches.
      setCallerCustomer(newCust);
      setPhoneInput(newCustomerForm.phone.trim());
      setShowNewCustomerForm(false);
    } catch (e: any) {
      showAlert(t("error"), describeError(e, language, L("تعذّر إنشاء العميل", "Kunde konnte nicht angelegt werden", "Failed to create customer")));
    } finally {
      setCustomerPhoneLoading(false);
    }
  };

  const searchNcAddress = async (text: string, city: string) => {
    const query = [text, city].filter(Boolean).join(" ").trim();
    if (query.length < 3) { setNcAddrSuggestions([]); setNcShowSuggestions(false); return; }
    setNcAddrSearching(true);
    try {
      const url = `https://api3.geo.admin.ch/rest/services/api/SearchServer?searchText=${encodeURIComponent(query)}&type=locations&origins=address&limit=10&sr=4326`;
      const res = await fetch(url);
      const data = await res.json();
      const results = (data.results || []).map((r: any) => ({ label: r.attrs.label as string }));
      setNcAddrSuggestions(results);
      setNcShowSuggestions(results.length > 0);
    } catch { setNcAddrSuggestions([]); setNcShowSuggestions(false); }
    finally { setNcAddrSearching(false); }
  };

  const selectNcAddress = (label: string) => {
    const clean = label.replace(/<[^>]+>/g, "").trim();
    setNewCustomerForm(f => ({ ...f, address: clean }));
    setNcShowSuggestions(false);
    setNcAddrSuggestions([]);
  };

  const handleNcAddressChange = (text: string) => {
    setNewCustomerForm(f => ({ ...f, address: text }));
    if (ncAddrTimerRef.current) clearTimeout(ncAddrTimerRef.current);
    // geo.admin.ch only knows Swiss addresses.
    if (!swissStore) return;
    ncAddrTimerRef.current = setTimeout(() => searchNcAddress(text, ncCityFilter), 400);
  };

  // ── One checkout, one sale ────────────────────────────────────────────────
  // A flaky connection must never turn one checkout into two sales. Every
  // attempt at the same cart carries the same reference (stored in the sale's
  // payment_details). When an attempt fails without a definite answer —
  // timeout, dropped connection, 5xx — the next attempt first looks for a sale
  // with that reference and settles on it instead of writing a second one.
  const checkoutRef = useRef<string | null>(null);
  /** Synchronous double-submit guard for the pay buttons. */
  const submitLock = useRef(false);
  const checkoutUncertain = useRef(false);
  /** Customer auto-created from the phone field during this checkout. */
  const autoCustomerRef = useRef<{ phone: string; id: number } | null>(null);
  const resetCheckoutRef = () => {
    checkoutRef.current = null;
    checkoutUncertain.current = false;
    autoCustomerRef.current = null;
  };

  const findSaleByCheckoutRef = async (ref: string): Promise<any | null> => {
    const res = await apiRequest("GET", `/api/sales?tenantId=${tenantId || ""}&limit=40`);
    const rows = await res.json();
    return (Array.isArray(rows) ? rows : []).find((r: any) => saleHasCheckoutRef(r, ref)) || null;
  };

  // ── After a sale: short confirmation with the change due + reprint ────────
  const [saleDone, setSaleDone] = useState<{ receipt: string; total: number; change: number; pm: string } | null>(null);
  const reprintLastSale = useRef<(() => void) | null>(null);
  useEffect(() => {
    if (!saleDone) return;
    // Cash sales keep the change on screen a little longer.
    const timer = setTimeout(() => setSaleDone(null), saleDone.change > 0 ? 15000 : 7000);
    return () => clearTimeout(timer);
  }, [saleDone]);

  /** Cart header trash: asks first, then empties the lines (the customer stays). */
  const handleClearCart = async () => {
    if (cart.items.length === 0) return;
    const ok = await confirmAsync(
      L("إفراغ السلة؟", "Warenkorb leeren?", "Clear the cart?"),
      L(`سيتم حذف ${cart.itemCount} من المنتجات من السلة.`, `${cart.itemCount} Artikel werden aus dem Warenkorb entfernt.`, `${cart.itemCount} item(s) will be removed from the cart.`),
      L("إفراغ", "Leeren", "Clear"),
      t("cancel"),
      true,
    );
    if (!ok) return;
    cart.clearCart();
    setManualAdjustment(0);
    setCashReceived("");
    resetCheckoutRef();
  };

  const roleLabel = (role?: string | null) => {
    const key = String(role || "").toLowerCase();
    return ["admin", "cashier", "manager", "owner"].includes(key) ? t(key as any) : (role || "");
  };

  const itemCountLabel = (n: number) => L(
    n === 1 ? "منتج واحد" : n === 2 ? "منتجان" : n >= 3 && n <= 10 ? `${n} منتجات` : `${n} منتج`,
    `${n} Artikel`,
    n === 1 ? "1 item" : `${n} items`,
  );

  /** Empties the till for the next customer (cart, phone, notes, adjustment). */
  const resetTill = useCallback(() => {
    cart.clearCart();
    setManualAdjustment(0);
    setPhoneInput("");
    setCallerCustomer(null);
    setActiveCallId(null);
    setOrderNotes("");
    setCashReceived("");
    setPaymentMethod("cash");
    resetCheckoutRef();
  }, [cart]);

  const completeSaleAfterPayment = (saleData: any, pmOverride?: string) => {
    const pm = pmOverride ?? paymentMethod;
    playAddSound();
    const saleItems = cart.items.map((i) => ({ name: i.name, quantity: i.quantity, price: i.price, total: i.price * i.quantity }));
    const custName = selectedCustomer?.name || t("walkIn");
    const empName = employee?.name || "";
    const total = payableTotal;
    const cashGiven = parseAmountInput(cashReceived, currency);
    const cashAmt = Number.isFinite(cashGiven) ? cashGiven : 0;
    const change = pm === "cash" && cashAmt > 0 ? roundMoney(Math.max(0, cashAmt - total), currency) : 0;
    // Auto-print 3 copies on web (unless turned off in Settings → Receipt Printer)
    const vehicleObj = cart.vehicleId ? (vehicles as any[]).find((v: any) => v.id === cart.vehicleId) : undefined;
    const printItems = [...cart.items];
    const printArgs = {
      subtotal: cart.subtotal, tax: cart.tax, discount: cart.discount, serviceFee: cart.serviceFee,
      deliveryFee: cart.deliveryFee, surcharge: cart.minimumOrderSurcharge, customer: selectedCustomer,
    };
    const print = () => autoPrint3Copies(
      saleData, printItems, printArgs.subtotal, printArgs.tax, printArgs.discount, printArgs.serviceFee, total, printArgs.deliveryFee,
      pm, cashAmt, custName, empName, printArgs.customer, vehicleObj, printArgs.surcharge,
      storeSettings, tenant, categories as any[]
    );
    reprintLastSale.current = print;
    if (getReceiptPrinterPrefs().autoPrint) print();
    setLastSale({
      ...saleData,
      items: saleItems,
      subtotal: cart.subtotal,
      tax: cart.tax,
      serviceFee: cart.serviceFee,
      discount: cart.discount,
      deliveryFee: cart.deliveryFee,
      minimumOrderSurcharge: cart.minimumOrderSurcharge,
      total,
      paymentMethod: pm,
      cashReceived: cashAmt,
      change,
      customerName: custName,
      employeeName: empName,
      date: new Date().toISOString(),
      vehicleId: cart.vehicleId || null,
    });
    setSaleDone({
      receipt: getDisplayNumber(saleData?.receiptNumber) || (saleData?.id ? `#${saleData.id}` : ""),
      total,
      change,
      pm,
    });
    resetTill();
    setShowCheckout(false);
    closeStripeCapture();
    qc.invalidateQueries({ queryKey: ["/api/sales"] });
    qc.invalidateQueries({ queryKey: ["/api/dashboard"] });
    qc.invalidateQueries({ queryKey: ["/api/inventory"] });
    qc.invalidateQueries({ queryKey: ["/api/customers"] });
    qc.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith("/api/wholesale") });
  };

  /**
   * `paymentStatus` is "completed" for cash only. A card/TWINT/wallet sale is
   * written "pending" and stays that way until the Stripe webhook says
   * otherwise — the till must never call a sale paid on its own.
   */
  const createSale = async (pm: string, stripePaymentId: string | null, paymentStatus: string = "completed", extraNote?: string) => {
    if (!checkoutRef.current) checkoutRef.current = newCheckoutRef();
    const ref = checkoutRef.current;
    // The previous attempt may have reached the server: settle on that sale.
    if (checkoutUncertain.current) {
      const existing = await findSaleByCheckoutRef(ref);
      if (existing) {
        checkoutUncertain.current = false;
        return existing;
      }
    }

    const total = payableTotal;
    const cashGiven = parseAmountInput(cashReceived, currency);
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
      // Whole pounds for a zero-decimal currency (SYP), cents otherwise.
      subtotal: moneyString(cart.subtotal, currency),
      taxAmount: moneyString(cart.tax, currency),
      serviceFeeAmount: moneyString(cart.serviceFee, currency),
      discountAmount: moneyString(cart.discount, currency),
      minimumOrderSurcharge: moneyString(cart.minimumOrderSurcharge, currency),
      totalAmount: moneyString(total, currency),
      paymentMethod: pm,
      paymentStatus,
      status: "completed",
      tableNumber: cart.tableNumber || null,
      orderType: cart.orderType,
      vehicleId: cart.vehicleId || null,
      changeAmount: pm === "cash" && Number.isFinite(cashGiven)
        ? moneyString(Math.max(0, cashGiven - total), currency) : "0",
      items: saleItems,
      callId: activeCallId,
      // Already inside discountAmount; the server takes the points off the balance.
      loyaltyPointsRedeemed: loyaltyRedeem && loyaltyRedeem.customerId === cart.customerId ? loyaltyRedeem.points : 0,
      // `ref` lets a retry find this sale instead of recording it twice.
      paymentDetails: [{ method: pm, amount: roundMoney(total, currency), ref }],
    };
    const notesParts = [];
    if (orderNotes.trim()) notesParts.push(orderNotes.trim());
    if (stripePaymentId) notesParts.push(`Stripe: ${stripePaymentId}`);
    if (extraNote) notesParts.push(extraNote);
    if (notesParts.length > 0) data.notes = notesParts.join(" | ");

    // ── Auto-save new customer if phone was entered but no customer linked ──
    const phone = phoneInput.trim();
    if (!data.customerId && phone) {
      if (autoCustomerRef.current?.phone === phone) {
        data.customerId = autoCustomerRef.current.id;
      } else {
        try {
          const autoName = newCustomerForm.name.trim() || phone;
          const autoRes = await apiRequest("POST", "/api/customers", {
            tenantId,
            name: autoName,
            phone,
            address: newCustomerForm.address.trim() || null,
            email: newCustomerForm.email.trim() || null,
          });
          const newCust = await autoRes.json();
          if (newCust?.id) {
            data.customerId = newCust.id;
            autoCustomerRef.current = { phone, id: newCust.id };
            qc.invalidateQueries({ queryKey: ["/api/customers"] });
          }
        } catch (_) { /* non-fatal: the sale goes through as walk-in */ }
      }
    }

    try {
      const res = await apiRequest("POST", "/api/sales", data);
      const sale = await res.json();
      checkoutUncertain.current = false;
      return sale;
    } catch (e) {
      // 4xx: the server refused, nothing was written. Anything else: unknown.
      checkoutUncertain.current = isUncertainFailure(e);
      throw e;
    }
  };

  /** Message for a failed checkout; says plainly when a retry is safe. */
  const checkoutErrorMessage = (e: unknown) => checkoutUncertain.current
    ? L(
      "انقطع الاتصال قبل أن يؤكد الخادم البيع. لن يُسجَّل البيع مرتين: اضغط «إتمام البيع» مجدداً عند عودة الاتصال وسيتحقق النظام أولاً إن كان البيع قد سُجّل. لا تغيّر محتوى السلة.",
      "Die Verbindung brach ab, bevor der Server den Verkauf bestätigt hat. Es wird nichts doppelt gebucht: Tippen Sie wieder auf «Verkauf abschliessen», sobald die Verbindung steht – die Kasse prüft zuerst, ob der Verkauf schon gebucht ist. Warenkorb bitte nicht ändern.",
      "The connection dropped before the server confirmed the sale. Nothing will be recorded twice: press Complete again once you are back online — the till first checks whether the sale already went through. Don't change the cart.",
    )
    : describeError(e, language, L("تعذّر إتمام البيع", "Verkauf fehlgeschlagen", "Failed to complete sale"));

  const validateBeforeComplete = (): string | null => {
    if (cart.items.length === 0) return t("emptyCart");
    // Delivery order: customer must have phone and address
    if (cart.orderType === "delivery") {
      if (!cart.customerId || !selectedCustomer?.phone) {
        return t("customerPhoneRequired" as any) || L("التوصيل يتطلب رقم هاتف العميل", "Lieferung erfordert die Telefonnummer des Kunden", "Delivery requires customer phone number");
      }
      if (!selectedCustomerAddress) {
        return t("customerAddressRequired" as any) || L("التوصيل يتطلب عنوان العميل", "Lieferung erfordert die Adresse des Kunden", "Delivery requires customer address");
      }
    }
    if (payableTotal < 0) {
      return L("لا يمكن أن يكون المجموع سالباً. خفّض الخصم أو التعديل.", "Der Gesamtbetrag darf nicht negativ sein. Rabatt oder Anpassung reduzieren.", "The total cannot be negative. Reduce the discount or adjustment.");
    }
    if (paymentMethod === "cash" && cashReceived.trim() !== "") {
      const given = parseAmountInput(cashReceived, currency);
      if (!Number.isFinite(given)) {
        return L("المبلغ المستلم غير صالح.", "Der erhaltene Betrag ist ungültig.", "The cash received is not a valid amount.");
      }
      if (given + 1e-9 < payableTotal) {
        return L(
          `المبلغ المستلم أقل من المجموع (${formatMoney(payableTotal)}).`,
          `Der erhaltene Betrag ist kleiner als der Gesamtbetrag (${formatMoney(payableTotal)}).`,
          `Cash received is less than the total (${formatMoney(payableTotal)}).`,
        );
      }
    }
    // Card / TWINT / wallet are captured through Stripe, so the only thing to
    // check here is that Stripe is actually reachable — the payment itself is
    // confirmed by the webhook, never by the cashier.
    if (isStripeMethod(paymentMethod) && !stripeReady) {
      return stripeAllowed ? t("stripeNotConnected") : L(
        "الدفع بالبطاقة غير متاح لهذه العملة.",
        "Kartenzahlung ist in dieser Währung nicht verfügbar.",
        "Card payments are not available in this currency.",
      );
    }
    return null;
  };

  const endShiftMutation = useMutation({
    mutationFn: (id: number) => apiRequest("PUT", `/api/shifts/${id}/close`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [tenantId ? `/api/shifts?tenantId=${tenantId}` : "/api/shifts"] });
      setShowAccountSwitcher(false);
      showAlert(t("success"), L("تم إنهاء الوردية.", "Schicht beendet.", "Shift ended."));
    },
    onError: (e: any) => showAlert(t("error"), describeError(e, language, L("تعذّر إنهاء الوردية", "Schicht konnte nicht beendet werden", "Could not end the shift"))),
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
    onError: (e: any) => showAlert(t("error"), describeError(e, language, L("تعذّر بدء الوردية", "Schicht konnte nicht gestartet werden", "Could not start the shift"))),
  });

  const saleMutation = useMutation({
    mutationFn: async () => {
      return await createSale(paymentMethod, null);
    },
    onSuccess: (saleData: any) => {
      completeSaleAfterPayment(saleData);
    },
    onError: (e: any) => {
      showAlert(t("error"), checkoutErrorMessage(e));
    },
  });

  // ── card / TWINT / wallet capture ─────────────────────────────────────────
  const stripeFinishTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const closeStripeCapture = useCallback(() => {
    if (stripeFinishTimer.current) {
      clearTimeout(stripeFinishTimer.current);
      stripeFinishTimer.current = null;
    }
    setStripeCapture(null);
    setStripeStage("idle");
    setStripeError("");
  }, []);

  useEffect(() => () => {
    if (stripeFinishTimer.current) clearTimeout(stripeFinishTimer.current);
  }, []);

  /**
   * Records the sale unpaid, then asks the server for a Stripe-hosted Checkout
   * link for it. No amount is ever sent — the server prices the sale from the
   * row it just wrote.
   */
  const stripeCaptureMutation = useMutation({
    mutationFn: async (): Promise<StripeCapture> => {
      const sale = await createSale(paymentMethod, null, "pending");
      if (!sale?.id) throw new Error(t("saleNotFound"));

      // Publish the sale before talking to Stripe. The row (and the stock it
      // just consumed) exists from here on, so if either call below fails the
      // cashier must still be able to settle it in cash rather than ring it up
      // a second time.
      const bound: StripeCapture = {
        saleId: sale.id,
        sale,
        checkoutUrl: "",
        paymentIntentId: null,
        amountMinor: Math.round(payableTotal * 100),
        currency: String(paymentsConfig?.currency || "CHF").toUpperCase(),
      };
      setStripeCapture(bound);

      // Prices the sale server-side and refuses if it is already paid. It also
      // stamps sales.stripe_payment_intent_id, which is what the webhook later
      // reconciles against.
      const intentRes = await apiRequest("POST", `/api/payments/sale/${sale.id}/intent`, {});
      const intent = await intentRes.json();

      // No successUrl/cancelUrl: the server owns those pages (/pay/success,
      // /pay/cancelled) and no amount is passed — it prices the sale itself.
      const sessionRes = await apiRequest("POST", "/api/payments/checkout-session", {
        saleId: sale.id,
      });
      const session = await sessionRes.json();
      if (!session?.url) throw new Error(session?.error || t("paymentLinkFailed"));

      return {
        ...bound,
        checkoutUrl: String(session.url),
        paymentIntentId: intent?.paymentIntentId ?? null,
        amountMinor: Number(session.amount ?? intent?.amount ?? bound.amountMinor),
        currency: String(session.currency || intent?.currency || bound.currency).toUpperCase(),
      };
    },
    onSuccess: (capture) => {
      setStripeCapture(capture);
      setStripeError("");
      setStripeStage("waiting");
    },
    onError: (e: any) => {
      // Deliberately keeps whatever the mutation already bound, so a half-built
      // capture still offers "take cash instead" for the sale that now exists.
      setStripeError(checkoutUncertain.current ? checkoutErrorMessage(e) : describeError(e, language, t("paymentLinkFailed")));
      setStripeStage("failed");
    },
  });

  /**
   * Poll until the server says the sale is settled. The sale row is the
   * authority: only the signature-verified webhook writes "paid" to it.
   *
   * Note we poll the sale rather than /api/payments/status/:paymentIntentId —
   * that endpoint reports the intent we created above, whereas Checkout mints
   * its own intent, and it only joins online_orders, never sales.
   */
  useEffect(() => {
    if (stripeStage !== "waiting" || !stripeCapture) return;
    const saleId = stripeCapture.saleId;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const startedAt = Date.now();

    const poll = async () => {
      if (cancelled) return;
      try {
        const res = await apiRequest("GET", `/api/sales/${saleId}`);
        const fresh = await res.json();
        if (cancelled) return;
        if (fresh?.paymentStatus === "paid") {
          setStripeCapture((c) => (c ? { ...c, sale: { ...c.sale, ...fresh } } : c));
          setStripeStage("paid");
          stripeFinishTimer.current = setTimeout(() => {
            stripeFinishTimer.current = null;
            completeSaleAfterPayment({ ...stripeCapture.sale, ...fresh });
          }, 900);
          return;
        }
        if (fresh?.paymentStatus === "failed") {
          setStripeError(t("paymentFailed"));
          setStripeStage("failed");
          return;
        }
      } catch {
        // Transient network blip at the till — keep waiting.
      }
      if (cancelled) return;
      if (Date.now() - startedAt > STRIPE_POLL_TIMEOUT_MS) {
        setStripeError(t("paymentTimedOut"));
        setStripeStage("failed");
        return;
      }
      timer = setTimeout(poll, STRIPE_POLL_MS);
    };

    timer = setTimeout(poll, STRIPE_POLL_MS);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [stripeStage, stripeCapture?.saleId]);

  /** Escape hatch: the customer gives up on their phone and pays with cash. */
  const switchStripeSaleToCash = useMutation({
    mutationFn: async () => {
      if (!stripeCapture) throw new Error(t("saleNotFound"));
      // PUT /api/sales/:id answers with the driver's result header, not the row,
      // so patch the copy we already hold rather than merging the response.
      await apiRequest("PUT", `/api/sales/${stripeCapture.saleId}`, {
        paymentMethod: "cash",
        paymentStatus: "completed",
      });
      return { ...stripeCapture.sale, paymentMethod: "cash", paymentStatus: "completed" };
    },
    onSuccess: (sale) => {
      completeSaleAfterPayment(sale, "cash");
    },
    onError: (e: any) => {
      setStripeError(describeError(e, language, t("paymentLinkFailed")));
      setStripeStage("failed");
    },
  });

  /**
   * The customer walked off without paying. The sale row stays exactly as it is
   * — unpaid, and still accounting for the stock it consumed — and the till
   * moves on with an empty cart so the order cannot be rung up twice. Nothing
   * is printed: there is no payment to give a receipt for. If the customer pays
   * the link later, the webhook still settles the row.
   */
  const parkStripeSale = useCallback(() => {
    resetTill();
    setShowCheckout(false);
    closeStripeCapture();
    qc.invalidateQueries({ queryKey: ["/api/sales"] });
    qc.invalidateQueries({ queryKey: ["/api/inventory"] });
  }, [resetTill, qc, closeStripeCapture]);

  /** Dismiss: park a sale that was already created, otherwise just close. */
  const dismissStripeCapture = useCallback(() => {
    if (stripeCapture) parkStripeSale();
    else closeStripeCapture();
  }, [stripeCapture, parkStripeSale, closeStripeCapture]);

  // ── Sham Cash ─────────────────────────────────────────────────────────────
  // Each store shows its own Sham Cash QR code and number. The cashier waits
  // for the transfer in the store's Sham Cash app, then confirms; only then is
  // the sale written, as paid.
  const [showShamCash, setShamCashOpen] = useState(false);

  const shamCashMutation = useMutation({
    mutationFn: async (reference: string) =>
      createSale("shamcash", null, "completed", reference ? `شام كاش - رقم العملية: ${reference}` : "شام كاش"),
    onSuccess: (sale: any) => {
      setShamCashOpen(false);
      completeSaleAfterPayment(sale, "shamcash");
    },
    onError: (e: any) => showAlert(t("error"), checkoutErrorMessage(e)),
  });

  const checkoutBusy = saleMutation.isPending || stripeCaptureMutation.isPending || stripeStage !== "idle"
    || shamCashMutation.isPending || showShamCash;

  const openCheckoutLink = useCallback(() => {
    if (!stripeCapture) return;
    Linking.openURL(stripeCapture.checkoutUrl).catch(() => {
      showAlert(t("error"), t("paymentLinkFailed"));
    });
  }, [stripeCapture]);

  const handleAddToCart = useCallback((product: any) => {
    const variants = getProductVariantOptions(product);
    const enrichedProduct = variants.length > 0 ? { ...product, variants } : product;
    setExpandedSizeProductId(null);

    // If product has variants, show options modal (size selection + toppings)
    if (variants.length > 0) {
      openProductOptions(enrichedProduct, { showExtras: false });
      return;
    }
    // Pizza or Fingerfood without variants: skip directly to extras
    if (isPizzaProduct(product) || isFingerfoodProduct(product)) {
      openProductOptions(enrichedProduct, { showExtras: true });
      return;
    }
    cart.addItem({ id: product.id, name: product.name, price: Number(product.price) });
    playAddSound();
    triggerFlash(product.id);
  }, [cart, getProductVariantOptions, isPizzaProduct, isFingerfoodProduct, openProductOptions, triggerFlash]);

  const handleVariantSelection = useCallback((product: any, variant: ProductVariantOption, event?: any) => {
    event?.stopPropagation?.();
    if (isPizzaProduct(product) || isFingerfoodProduct(product)) {
      openProductOptions(product, {
        variant,
        toppings: [],
        showExtras: true,
      });
      return;
    }

    setExpandedSizeProductId(null);
    cart.addItem({
      id: product.id,
      name: product.name,
      price: Number(product.price),
      variant,
    });
    playAddSound();
    triggerFlash(product.id);
  }, [cart, isPizzaProduct, isFingerfoodProduct, openProductOptions, triggerFlash]);

  const handleProductCardPress = useCallback((product: any) => {
    const variants = getProductVariantOptions(product);
    if (prefersInlineSizePicker && variants.length > 0) {
      setExpandedSizeProductId((current) => current === product.id ? null : product.id);
      playClickSound("light");
      return;
    }

    handleAddToCart(product);
  }, [getProductVariantOptions, handleAddToCart, prefersInlineSizePicker]);

  // ── Barcode scanning: camera (scanner modal), USB/Bluetooth scanner, typed code ──
  const { canManageProducts } = useAuth();
  const [scanToast, setScanToast] = useState<ScanFeedback | null>(null);
  useEffect(() => {
    if (!scanToast) return;
    const timer = setTimeout(() => setScanToast(null), 2600);
    return () => clearTimeout(timer);
  }, [scanToast]);

  /** Find a product of this store by barcode (or exact SKU), with the till's marked-up price. */
  const lookupProductByCode = useCallback(async (code: string): Promise<any | undefined> => {
    const inView = findProductByCode(products as any[], code);
    if (inView) return inView;
    // The visible list may be narrowed by a search — try every till list already cached for this store.
    for (const [key, data] of qc.getQueriesData<any[]>({ queryKey: ["/api/products"] })) {
      const params = String((key as any[])[1] ?? "");
      if (!Array.isArray(data) || !params.startsWith(`?tenantId=${tenantId}&`) || !params.includes("applyMarkup=true")) continue;
      const hit = findProductByCode(data, code);
      if (hit) return hit;
    }
    try {
      const res = await apiRequest("GET", `/api/products?tenantId=${tenantId}&search=${encodeURIComponent(code)}&applyMarkup=true`);
      return findProductByCode(await res.json(), code);
    } catch {
      return undefined;
    }
  }, [products, qc, tenantId]);

  const handleBarcodeScan = useCallback(async (rawCode: string): Promise<ScanFeedback> => {
    const L = (ar: string, de: string, en: string) => (language === "ar" ? ar : language === "de" ? de : en);
    const code = normalizeBarcode(rawCode);
    const product = code ? await lookupProductByCode(code) : undefined;
    if (!product) {
      playClickSound("heavy");
      return {
        ok: false,
        message: L(`لا يوجد منتج بهذا الباركود: ${code}`, `Kein Produkt mit Barcode ${code} gefunden`, `No product found for barcode ${code}`),
        action: canManageProducts ? {
          label: L("إضافة كمنتج جديد", "Als neues Produkt anlegen", "Add as new product"),
          onPress: () => {
            setShowScanner(false);
            router.push({ pathname: "/products", params: { newBarcode: code } } as any);
          },
        } : undefined,
      };
    }
    const name = (language === "ar" && product.nameAr) || product.name;
    const needsOptions = getProductVariantOptions(product).length > 0 || isPizzaProduct(product) || isFingerfoodProduct(product);
    if (needsOptions) {
      // Sizes / extras: close the scanner so the options sheet opens on top, exactly like a tap on the card.
      setShowScanner(false);
      setTimeout(() => handleAddToCart(product), Platform.OS === "web" ? 50 : 400);
      return { ok: true, message: L(`${name}: اختر الخيارات`, `${name}: Optionen wählen`, `${name}: choose options`) };
    }
    handleAddToCart(product);
    return { ok: true, message: L(`تمت إضافة ${name}`, `${name} hinzugefügt`, `${name} added`) };
  }, [language, canManageProducts, router, lookupProductByCode, getProductVariantOptions, isPizzaProduct, isFingerfoodProduct, handleAddToCart]);

  /** Codes that arrive as keystrokes (scanner gun in the search box, or with nothing focused). */
  const handleKeyboardScan = useCallback(async (code: string) => {
    const res = await handleBarcodeScan(code);
    setScanToast({ ok: res.ok, message: res.message });
    return res.ok;
  }, [handleBarcodeScan]);
  useHardwareBarcodeScanner(!showScanner && !showCheckout, handleKeyboardScan);

  const handleSearchSubmit = useCallback(async () => {
    const code = normalizeBarcode(search);
    if (!code || (!looksLikeBarcode(code) && !findProductByCode(products as any[], code))) return;
    if (await handleKeyboardScan(code)) setSearch("");
  }, [search, products, handleKeyboardScan]);

  const maxCashierDiscountPct = 10;
  const applyDiscount = () => {
    // Percentages may have decimals in any currency; amounts follow the currency.
    const val = parseAmountInput(discountInput, discountType === "percent" ? "PCT" : currency);
    if (!Number.isFinite(val) || val <= 0) {
      showAlert(t("error"), L("أدخل قيمة خصم صحيحة.", "Bitte einen gültigen Rabatt eingeben.", "Enter a valid discount."));
      return;
    }
    if (cart.subtotal <= 0) return;
    let rate = 0;
    let capped = false;
    if (discountType === "percent") {
      const max = isCashier ? maxCashierDiscountPct : 100;
      capped = val > max;
      rate = Math.min(val, max);
    } else {
      // convert fixed amount to a percentage rate so it scales with future items
      const maxFixed = isCashier ? cart.subtotal * (maxCashierDiscountPct / 100) : cart.subtotal;
      capped = val > maxFixed + 1e-9;
      const discountAmount = Math.min(val, maxFixed);
      rate = (discountAmount / cart.subtotal) * 100;
    }
    cart.setDiscount(rate); // passes rate (percentage)
    setShowDiscountModal(false);
    setDiscountInput("");
    if (capped) {
      showAlert(t("discount"), isCashier
        ? t("maxDiscountWarning")
        : L("لا يمكن أن يتجاوز الخصم قيمة الطلب.", "Der Rabatt kann den Bestellwert nicht übersteigen.", "The discount cannot exceed the order value."));
    }
  };
  const handleSwitchAccount = async (pinCode: string) => {
    if (!switchTarget) return;
    setSwitchLoading(true);
    setSwitchError("");
    try {
      const res = await apiRequest("POST", "/api/employees/login", { pin: pinCode, employeeId: switchTarget.id });
      const emp = await res.json();
      resetTill();
      login(emp);
      playClickSound("medium");
      setShowAccountSwitcher(false);
      setSwitchTarget(null);
      setSwitchPin("");
      qc.invalidateQueries();
      // Check if new user has an active shift
      try {
        const shiftRes = await apiRequest("GET", `/api/shifts/active/${emp.id}?tenantId=${tenantId || ""}`);
        const activeShift = await shiftRes.json();
        if (!activeShift) {
          setSwitchedEmployee(emp);
          setShowSwitchShiftPrompt(true);
        }
      } catch {
        // ignore shift check errors
      }
    } catch (e) {
      const wrongPin = t("invalidPin" as any) || L("رمز PIN غير صحيح", "Falsche PIN", "Invalid PIN");
      // Only a 401 means the PIN was wrong; say so plainly for anything else.
      setSwitchError(/^401:/.test(String((e as any)?.message ?? "")) ? wrongPin : describeError(e, language, wrongPin));
      setSwitchPin("");
      playClickSound("light");
    } finally {
      setSwitchLoading(false);
    }
  };

  const getSaleAddressParts = (sale: any) => {
    // 1. Use dedicated customer fields first
    const streetPart = [sale.customerStreet, sale.customerStreetNr || sale.customerHouseNr].filter(Boolean).join(" ").trim();
    const plzPart = (sale.customerPostalCode || "").trim();
    const cityPart = (sale.customerCity || "").trim();

    if (streetPart || plzPart || cityPart) {
      return { street: streetPart || "–", plz: plzPart || "", city: cityPart || "–" };
    }

    // 2. Fallback: parse full address string using PLZ regex
    const addr = (sale.customerAddress || "").trim();
    if (!addr) return { street: "–", plz: "", city: "–" };

    const plzMatch = addr.match(/\b(\d{4,5})\b/);
    if (plzMatch) {
      const plzIdx = addr.indexOf(plzMatch[0]);
      const streetFb = addr.substring(0, plzIdx).replace(/[,\s]+$/, "").trim();
      const cityFb = addr.substring(plzIdx + plzMatch[0].length).replace(/^[,\s]+/, "").trim();
      return { street: streetFb || "–", plz: plzMatch[0], city: cityFb || "–" };
    }

    // 3. Simple comma split
    const parts = addr.split(",");
    return {
      street: parts[0]?.trim() || "–",
      plz: parts[1]?.trim() || "",
      city: parts[2]?.trim() || parts[1]?.trim() || "–",
    };
  };

  /** Calendar day on this device (the store's own timezone), not UTC. */
  const localDateString = (d: Date = new Date()) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const handleEndOfDay = async () => {
    if (zeroOutLoading || endOfDayLoading) return;
    try {
      setZeroOutLoading(true);
      const [reportRes, staffRes] = await Promise.all([
        apiRequest("GET", `/api/reports/daily-sales-report?date=${localDateString()}&tenantId=${tenantId || ""}`),
        apiRequest("GET", `/api/employees?tenantId=${tenantId || ""}`),
      ]);
      const salesData: any[] = await reportRes.json();
      const staff: any[] = await staffRes.json();
      // The report endpoint is not scoped to a store: keep only the sales rung
      // up by this store's own staff.
      const staffIds = new Set((Array.isArray(staff) ? staff : []).map((e: any) => e.id));
      const ownSales = (Array.isArray(salesData) ? salesData : [])
        .filter((sale: any) => staffIds.has(sale.employeeId))
        .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      setZeroOutSalesData(ownSales);
      setShowZeroOutPreview(true);
    } catch (err: any) {
      showAlert(t("error"), describeError(err, language, L("تعذّر تحميل مبيعات اليوم", "Tagesumsatz konnte nicht geladen werden", "Could not load today's sales")));
    } finally {
      setZeroOutLoading(false);
    }
  };

  const escHtml = (value: unknown) => String(value ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const handleZeroOutConfirm = async () => {
    if (endOfDayLoading) return;
    try {
      setEndOfDayLoading(true);

      if (Platform.OS === "web" && zeroOutSalesData.length > 0) {
        const storeName = escHtml(storeSettings?.name || tenant?.name || "POS System");
        const dateObj = new Date();
        const dateStr = dateObj.toLocaleDateString(dateLocale, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
        const cashierName = escHtml(employee?.name || L("الكاشير", "Kassierer", "Cashier"));
        const total = zeroOutSalesData.reduce((s: number, sale: any) => s + Number(sale.totalAmount || 0), 0);
        const endSide = webRTL ? "left" : "right";
        const rowsHtml = zeroOutSalesData.map((sale: any, idx: number) => {
          const { street, plz, city } = getSaleAddressParts(sale);
          const gebiet = [plz, city !== "–" ? city : ""].filter(Boolean).join(" ") || "–";
          const timeStr = new Date(sale.createdAt).toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit" });
          const amt = formatAmount(sale.totalAmount || 0);
          return `<tr><td>${idx + 1}</td><td>${escHtml(sale.customerName || t("walkIn"))}</td><td>${escHtml(street)}</td><td>${escHtml(gebiet)}</td><td dir="ltr">${timeStr}</td><td style="text-align:${endSide};" dir="ltr">${amt}</td></tr>`;
        }).join("");
        const title = L("تقرير الموظفين", "Personalbericht", "Staff report");
        const html = `<!DOCTYPE html><html lang="${language}" dir="${isRTL ? "rtl" : "ltr"}"><head><meta charset="UTF-8"><title>${title}</title><style>
          body { font-family: 'Courier New', Tahoma, monospace; font-size: 11px; margin: 0; padding: 10px; color: #000; }
          h2 { text-align: center; font-size: 14px; margin: 4px 0; }
          .sub { text-align: center; font-size: 11px; margin-bottom: 8px; }
          table { width: 100%; border-collapse: collapse; }
          th { border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 3px 4px; text-align: start; font-size: 10px; }
          td { padding: 2px 4px; font-size: 10px; border-bottom: 1px dotted #ccc; }
          .total-row { border-top: 1px solid #000; font-weight: bold; }
          .total-row td { padding-top: 4px; }
        </style></head><body>
          <h2>${title}</h2>
          <div class="sub">${dateStr}</div>
          <div class="sub">${storeName}</div>
          <br/>
          <div style="font-weight:bold;margin-bottom:4px;">${L("الكاشير", "Kassierer", "Cashier")}: ${cashierName}</div>
          <table>
            <thead><tr><th>#</th><th>${L("الاسم", "Name", "Name")}</th><th>${L("العنوان", "Adresse", "Address")}</th><th>${L("المنطقة", "Gebiet", "Area")}</th><th>${L("الوقت", "Zeit", "Time")}</th><th style="text-align:${endSide};">${L("المجموع", "Total", "Total")} (${escHtml(currencyLabel())})</th></tr></thead>
            <tbody>${rowsHtml}</tbody>
            <tfoot>
              <tr class="total-row"><td colspan="5">${L("إجمالي المبيعات", "Umsatz Total", "Total sales")}</td><td style="text-align:${endSide};" dir="ltr">${formatAmount(total)}</td></tr>
              <tr><td colspan="5">${L("المصروفات اليومية", "Tagesausgaben", "Daily expenses")}</td><td style="text-align:${endSide};" dir="ltr">${formatAmount(0)}</td></tr>
              <tr class="total-row"><td colspan="2">${zeroOutSalesData.length}&nbsp;&nbsp;${L("فاتورة · الإجمالي", "TOTAL Kassierer", "sales · TOTAL")}</td><td colspan="3"></td><td style="text-align:${endSide};" dir="ltr">${formatAmount(total)}</td></tr>
            </tfoot>
          </table>
          <br/>
          <div style="text-align:center;font-size:10px;">${dateObj.toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit" })} &nbsp; ${dateStr}</div>
        </body></html>`;
        printHtmlViaIframe(html);
      }

      // Close this employee's open shift with the totals it actually took.
      const shiftRes = await apiRequest("GET", `/api/shifts/active?tenantId=${tenantId}`);
      const activeShifts = await shiftRes.json();
      const myShift = (Array.isArray(activeShifts) ? activeShifts : []).find((s: any) => s.employeeId === employee?.id);
      if (myShift) {
        const since = myShift.startTime ? new Date(myShift.startTime).getTime() : 0;
        const shiftSales = zeroOutSalesData.filter((sale: any) =>
          sale.employeeId === employee?.id && new Date(sale.createdAt).getTime() >= since);
        const shiftTotal = shiftSales.reduce((sum: number, sale: any) => sum + Number(sale.totalAmount || 0), 0);
        // The drawer is not counted on this screen, so closingCash is not sent
        // (it used to be recorded as 0, i.e. as a full cash shortfall).
        await apiRequest("PUT", `/api/shifts/${myShift.id}/close`, {
          totalSales: moneyString(shiftTotal, currency),
          totalTransactions: shiftSales.length,
        });
        qc.invalidateQueries({ queryKey: ["/api/shifts"] });
      }

      setShowZeroOutPreview(false);
      showAlert(t("success"), t("endOfDaySuccess"));
      qc.invalidateQueries();
    } catch (err: any) {
      showAlert(t("error"), describeError(err, language, L("تعذّر إغلاق اليوم", "Tagesabschluss fehlgeschlagen", "End of day failed")));
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
    <View style={[styles.container, { paddingTop: insets.top + topPad }, Platform.OS === "web" && { direction: isRTL ? "rtl" : "ltr" }]}>
      <View style={[styles.header, isMobileWeb && styles.headerMobile]}>
        <LinearGradient colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.headerGradient}>
          <View style={[styles.headerContent, flipRow && { flexDirection: "row-reverse" }, isMobileWeb && styles.headerContentMobile]}>
            <Text style={[styles.headerTitle, rtlTextAlign]} numberOfLines={1}>{storeSettings?.name || tenant?.name || "Kassenta POS"}</Text>
            <View style={[styles.headerRight, flipRow && { flexDirection: "row-reverse", alignItems: "center" }, { alignItems: "center" }, isMobileWeb && styles.headerRightMobile]}>
              <RealTimeClock />
              <Pressable
                onPress={() => setShowCallHistory(true)}
                style={[styles.headerInvoiceBtn, { position: "relative" }]}
                accessibilityRole="button"
                accessibilityLabel={L("المكالمات", "Anrufe", "Calls")}
              >
                <Ionicons name="call-outline" size={20} color={Colors.white} />
                {!compactHeader && <Text style={styles.headerInvoiceLabel}>{L("مكالمات", "Anrufe", "Calls")}</Text>}
                {incomingCalls.length > 0 && (
                  <View style={{ position: "absolute", top: -2, right: -2, width: 10, height: 10, borderRadius: 5, backgroundColor: "#EF4444", borderWidth: 1.5, borderColor: "#FFFFFF" }} />
                )}
              </Pressable>
              <Pressable
                onPress={() => {
                  if (Platform.OS === "web" && typeof window !== "undefined") {
                    window.location.reload();
                    return;
                  }
                  qc.invalidateQueries();
                  qc.refetchQueries({ type: "active" });
                }}
                style={styles.headerInvoiceBtn}
                accessibilityRole="button"
                accessibilityLabel={L("تحديث", "Aktualisieren", "Refresh")}
              >
                <Ionicons name="refresh-outline" size={20} color={Colors.white} />
                {!compactHeader && <Text style={styles.headerInvoiceLabel}>{L("تحديث", "Aktualisieren", "Refresh")}</Text>}
              </Pressable>
              <Pressable
                onPress={toggleTheme}
                style={styles.headerInvoiceBtn}
                accessibilityRole="switch"
                accessibilityState={{ checked: isDark }}
                accessibilityLabel={isDark ? L("الوضع الفاتح", "Helles Design", "Light mode") : L("الوضع الداكن", "Dunkles Design", "Dark mode")}
              >
                <Ionicons name={isDark ? "sunny-outline" : "moon-outline"} size={20} color={Colors.white} />
                {!compactHeader && (
                  <Text style={styles.headerInvoiceLabel}>
                    {isDark ? L("فاتح", "Hell", "Light") : L("داكن", "Dunkel", "Dark")}
                  </Text>
                )}
              </Pressable>
              <Pressable
                onPress={handleEndOfDay}
                style={[styles.headerInvoiceBtn, styles.headerDangerBtn, (endOfDayLoading || zeroOutLoading) && { opacity: 0.6 }]}
                disabled={endOfDayLoading || zeroOutLoading}
                accessibilityRole="button"
                accessibilityLabel={t("endOfDay")}
              >
                {zeroOutLoading
                  ? <ActivityIndicator size="small" color={Colors.white} />
                  : <Ionicons name="sync-outline" size={20} color={Colors.white} />
                }
                {!compactHeader && <Text style={styles.headerInvoiceLabel}>{t("endOfDay")}</Text>}
              </Pressable>
              <Pressable
                onPress={() => { setInvoiceSearch(""); setShowInvoiceHistory(true); }}
                style={styles.headerInvoiceBtn}
                accessibilityRole="button"
                accessibilityLabel={t("invoices")}
              >
                <Ionicons name="receipt-outline" size={20} color={Colors.white} />
                {!compactHeader && <Text style={styles.headerInvoiceLabel}>{t("invoices")}</Text>}
              </Pressable>
              {employee && (
                <Pressable
                  onPress={() => setShowAccountSwitcher(true)}
                  style={styles.headerAvatarBtn}
                  accessibilityRole="button"
                  accessibilityLabel={t("switchAccount" as any)}
                >
                  <LinearGradient colors={[Colors.accent, Colors.gradientStart]} style={styles.headerAvatarCircle}>
                    <Text style={styles.headerAvatarText}>{(employee.name || "?").charAt(0).toUpperCase()}</Text>
                  </LinearGradient>
                </Pressable>
              )}
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* ── Phone / Customer Bar ── */}
      <View style={[styles.phoneBar, flipRow && { flexDirection: "row-reverse" }, useMobileCartSidebar && styles.phoneBarMobile]}>
        <View style={[styles.phoneBarInputWrap, flipRow && { flexDirection: "row-reverse" }, !useMobileCartSidebar && selectedCustomer && { flex: 0, minWidth: 160, maxWidth: 200 }]}>
          <Ionicons name="call-outline" size={16} color={selectedCustomer ? Colors.accent : Colors.textMuted} />
          <TextInput
            style={[styles.phoneBarInput, isRTL && { textAlign: "right" }]}
            placeholder={L("رقم هاتف العميل…", "Telefonnummer des Kunden…", "Customer phone number…")}
            placeholderTextColor={Colors.textMuted}
            value={phoneInput}
            onChangeText={(v) => {
              const clean = toLatinDigits(v);
              setPhoneInput(clean);
              if (!clean.trim()) { cart.setCustomerId(null); setCallerCustomer(null); }
            }}
            onSubmitEditing={() => handlePhoneSearch(phoneInput, true)}
            // Leaving the field only looks the number up; the "new customer"
            // form opens on Enter, never by surprise on a stray tap elsewhere.
            onBlur={() => { if (phoneInput.trim()) handlePhoneSearch(phoneInput, false); }}
            keyboardType="phone-pad"
            returnKeyType="search"
            accessibilityLabel={L("رقم هاتف العميل", "Telefonnummer des Kunden", "Customer phone number")}
          />
          {customerPhoneLoading && (
            <ActivityIndicator size="small" color={Colors.textMuted} />
          )}
          {phoneInput ? (
            <Pressable
              onPress={() => { setPhoneInput(""); cart.setCustomerId(null); setCallerCustomer(null); }}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={L("مسح", "Löschen", "Clear")}
            >
              <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
            </Pressable>
          ) : null}
        </View>

        {selectedCustomer ? (
          <Pressable
            style={[styles.phoneBarCustomer, flipRow && { flexDirection: "row-reverse" }]}
            onPress={() => setShowCustomerPicker(true)}
          >
            <View style={styles.phoneBarAvatar}>
              <Text style={styles.phoneBarAvatarText}>{(selectedCustomer.name || "?").charAt(0).toUpperCase()}</Text>
            </View>
            <View style={[styles.phoneBarCustomerInfo, flipRow && { alignItems: "flex-end" }]}>
              <Text style={[styles.phoneBarCustomerName, rtlTextAlign]} numberOfLines={1}>{selectedCustomer.name}</Text>
              <View style={[styles.phoneBarCustomerMeta, flipRow && { flexDirection: "row-reverse" }]}>
                {!!selectedCustomer.phone && <Text style={styles.phoneBarMetaText}>{selectedCustomer.phone}</Text>}
                {selectedCustomerAddress ? <Text style={styles.phoneBarMetaDot}>·</Text> : null}
                {selectedCustomerAddress ? <Text style={styles.phoneBarMetaText} numberOfLines={1}>{selectedCustomerAddress}</Text> : null}
              </View>
              {!!selectedCustomer.email && <Text style={[styles.phoneBarMetaText, { color: Colors.info }]} numberOfLines={1}>{selectedCustomer.email}</Text>}
            </View>
            <Pressable
              onPress={() => { cart.setCustomerId(null); setPhoneInput(""); setCallerCustomer(null); }}
              style={styles.phoneBarClear}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={L("إزالة العميل", "Kunde entfernen", "Remove customer")}
            >
              <Ionicons name="close-circle" size={22} color={Colors.danger} />
            </Pressable>
          </Pressable>
        ) : (
          <Pressable style={styles.phoneBarWalkIn} onPress={() => setShowCustomerPicker(true)} accessibilityRole="button">
            <Ionicons name="person-add-outline" size={16} color={Colors.textMuted} />
            <Text style={styles.phoneBarWalkInText}>{t("selectCustomer")}</Text>
          </Pressable>
        )}
      </View>

      {incomingCalls.length > 0 && (
        <View style={styles.callNotification}>
          {incomingCalls.length > 1 && (
            <View style={{ flexDirection: flipRow ? "row-reverse" : "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingTop: 6, paddingBottom: 2 }}>
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
              style={[styles.callGradient, flipRow && { flexDirection: "row-reverse" }, idx > 0 && { marginTop: 2, opacity: 0.9 }]}
            >
              <View style={styles.callIconWrap}>
                <Ionicons name="call" size={idx === 0 ? 24 : 18} color={Colors.white} />
                {incomingCalls.length > 1 && (
                  <Text style={{ color: Colors.white, fontSize: 9, fontWeight: "800", position: "absolute", bottom: -2, right: -2 }}>
                    {t("callSlot" as any)}{call.slot}
                  </Text>
                )}
              </View>
              <View style={[styles.callInfo, flipRow && { alignItems: "flex-end" }, { flex: 1 }]}>
                {call.customer ? (
                  <>
                    <Text style={[styles.callNumber, idx > 0 && { fontSize: 12 }]}>{call.phoneNumber}</Text>
                    <View style={{ flexDirection: flipRow ? "row-reverse" : "row", alignItems: "center", gap: 4, marginTop: 2 }}>
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
                        {call.customer.totalSpent ? ` · ${formatMoney(call.customer.totalSpent, 0)}` : ""}
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

      <View style={[styles.mainContent, { flexDirection: isTablet && !useMobileCartSidebar ? (leftHandMode ? (flipRow ? "row" : "row-reverse") : (flipRow ? "row-reverse" : "row")) : "column" }]}>
        <View style={[styles.productsSection, isTablet && styles.productsSectionTablet]}>
          <View style={[styles.searchRow, { flexDirection: flipRow ? "row-reverse" : "row", gap: 8, alignItems: "center" }]}>
            <View style={[styles.searchBox, { flex: 1 }, flipRow && { flexDirection: "row-reverse" }]}>
              <Ionicons name="search" size={18} color={Colors.textMuted} />
              <TextInput
                style={[styles.searchInput, rtlTextAlign]}
                placeholder={t("search") + "..."}
                placeholderTextColor={Colors.textMuted}
                value={search}
                onChangeText={setSearch}
                onSubmitEditing={handleSearchSubmit}
                blurOnSubmit={false}
                returnKeyType="search"
              />
              {search ? (
                <Pressable onPress={() => setSearch("")} hitSlop={10} accessibilityRole="button" accessibilityLabel={L("مسح البحث", "Suche löschen", "Clear search")}>
                  <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
                </Pressable>
              ) : null}
            </View>
            <Pressable
              style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.accent, justifyContent: "center", alignItems: "center" }}
              onPress={() => setShowScanner(true)}
              accessibilityRole="button"
              accessibilityLabel={L("مسح الباركود", "Barcode scannen", "Scan barcode")}
            >
              <Ionicons name="barcode-outline" size={22} color={Colors.textDark} />
            </Pressable>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll} contentContainerStyle={styles.categoriesScrollContent}>
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
          </ScrollView>

          <FlatList
            data={filteredProducts}
            numColumns={useMobileCartSidebar ? 2 : isTablet ? 4 : 2}
            key={useMobileCartSidebar ? "mobile2" : isTablet ? "tablet4" : "phone2"}
            keyExtractor={(item: any) => String(item.id)}
            contentContainerStyle={[styles.productGrid, useMobileCartSidebar && styles.productGridMobile]}
            style={{ flex: 1 }}
            scrollEnabled={true}
            initialNumToRender={30}
            maxToRenderPerBatch={30}
            windowSize={10}
            renderItem={({ item }: { item: any }) => {
              const cat = categories.find((c: any) => c.id === item.categoryId);
              const catColor = cat?.color || Colors.accent;
              const catIcon = (cat?.icon || "cube") as keyof typeof Ionicons.glyphMap;
              // Every line of this product (each size / topping combo is its own line).
              const cartQty = cart.items.reduce((sum: number, i: any) =>
                i.productId === item.id ? sum + (Number(i.quantity) || 0) : sum, 0);
              const isJustAdded = lastAddedId === item.id;
              const variantOptions = getProductVariantOptions(item);
              const hasInlineSizeOptions = prefersInlineSizePicker && variantOptions.length > 0;
              const isSizePickerOpen = expandedSizeProductId === item.id;
              return (
                <Pressable
                  style={({ pressed }) => [styles.productCard, pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] }]}
                  onPress={() => handleProductCardPress(item)}
                >
                  {isJustAdded && (
                    <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: catColor, opacity: flashAnim, borderRadius: 16 }]} />
                  )}
                  <View style={[styles.productCardTopBorder, { backgroundColor: catColor }]} />
                  <View style={[styles.productIcon, { backgroundColor: `${catColor}22` }]}>
                    {item.image ? (
                      <AnimatedProductImage uri={item.image.startsWith("http") || item.image.startsWith("file://") || item.image.startsWith("data:") ? item.image : `${getApiUrl().replace(/\/$/, "")}${item.image}`} />
                    ) : (
                      <Ionicons name={catIcon} size={22} color={catColor} />
                    )}
                  </View>
                  <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
                  <Text style={[styles.productPrice, { color: catColor }]}>{formatMoney(item.price)}</Text>
                  {hasInlineSizeOptions && (
                    <View style={styles.productSizeWrap}>
                      <Pressable
                        style={[
                          styles.productSizeButton,
                          { borderColor: `${catColor}55`, backgroundColor: `${catColor}16` },
                          isSizePickerOpen && { borderColor: catColor, backgroundColor: `${catColor}26` },
                        ]}
                        onPress={(event: any) => {
                          event?.stopPropagation?.();
                          setExpandedSizeProductId((current) => current === item.id ? null : item.id);
                          playClickSound("light");
                        }}
                      >
                        <Text style={[styles.productSizeButtonText, { color: catColor }]} numberOfLines={1}>
                          {getVariantSummaryLabel(item)}
                        </Text>
                        <Ionicons
                          name={isSizePickerOpen ? "chevron-up" : "chevron-down"}
                          size={13}
                          color={catColor}
                        />
                      </Pressable>
                      {isSizePickerOpen && (
                        <View style={styles.productSizeDropdown}>
                          {variantOptions.map((variant) => (
                            <Pressable
                              key={`${item.id}-${variant.name}`}
                              style={styles.productSizeOption}
                              onPress={(event: any) => handleVariantSelection(item, variant, event)}
                            >
                              <Text style={styles.productSizeOptionName}>{getShortVariantLabel(variant.name)}</Text>
                              <Text style={[styles.productSizeOptionPrice, { color: catColor }]}>
                                {formatMoney(variant.price)}
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                      )}
                    </View>
                  )}
                  {tenant?.storeType !== "restaurant" && item.trackInventory && (
                    <Text style={[styles.barcodeText, { color: (stockByProduct.get(Number(item.id)) ?? 0) <= 0 ? Colors.danger : Colors.textSecondary }]}>
                      {L("المخزون", "Bestand", "Stock")}: {stockByProduct.get(Number(item.id)) ?? 0}
                    </Text>
                  )}
                  {item.barcode ? <Text style={styles.barcodeText}>{item.barcode}</Text> : null}
                  {cartQty > 0 ? (
                    <View style={[styles.productCartBadge, { backgroundColor: catColor }]}>
                      <Text style={styles.productCartBadgeText}>{cartQty}</Text>
                    </View>
                  ) : (
                    <View style={[styles.productAddBadge, { backgroundColor: `${catColor}22` }]}>
                      <Ionicons name={hasInlineSizeOptions ? "chevron-down" : "add"} size={14} color={catColor} />
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

        {!useMobileCartSidebar && (
        <View style={[styles.cartSection, isTablet && styles.cartSectionTablet, isTablet && webRTL && { borderLeftWidth: 0, borderRightWidth: 1, borderColor: Colors.cardBorder }]}>
          <View style={[styles.cartHeader, flipRow && { flexDirection: "row-reverse" }]}>
            <Text style={[styles.cartTitle, rtlTextAlign]}>{t("cart")} ({cart.itemCount})</Text>
            <View style={{ flexDirection: flipRow ? "row-reverse" : "row", gap: 10 }}>
              {/* SPEZIF notes button - always visible */}
              <Pressable
                onPress={() => setShowOrderNotes(true)}
                style={[styles.cartHeaderBtn, orderNotes ? { backgroundColor: Colors.warning + "22", borderColor: Colors.warning } : null]}
                accessibilityRole="button"
                accessibilityLabel={L("ملاحظة الطلب", "Bestellnotiz", "Order note")}
              >
                <Ionicons name="create-outline" size={16} color={orderNotes ? Colors.warning : Colors.textMuted} />
                <Text style={{ fontSize: 11, fontWeight: "700", color: orderNotes ? Colors.warning : Colors.textMuted }}>
                  {L("ملاحظة", "SPEZIF", "NOTES")}
                </Text>
              </Pressable>
              {cart.items.length > 0 && (
                <>
                  <Pressable
                    onPress={() => setShowDiscountModal(true)}
                    style={[styles.cartHeaderBtn, cart.discount > 0 && { backgroundColor: Colors.success + "22", borderColor: Colors.success }]}
                    accessibilityRole="button"
                    accessibilityLabel={t("discount")}
                  >
                    <Ionicons name="pricetag" size={16} color={Colors.success} />
                  </Pressable>
                  <Pressable
                    onPress={handleClearCart}
                    style={styles.cartHeaderBtn}
                    accessibilityRole="button"
                    accessibilityLabel={L("إفراغ السلة", "Warenkorb leeren", "Clear cart")}
                  >
                    <Ionicons name="trash" size={16} color={Colors.danger} />
                  </Pressable>
                </>
              )}
            </View>
          </View>

          {selectedCustomer ? (
            <View style={[styles.cartCustomerCard, flipRow && { flexDirection: "row-reverse" }]}>
              <LinearGradient colors={[Colors.primary, Colors.secondary]} style={styles.cartCustomerAvatar}>
                <Text style={styles.cartCustomerAvatarText}>{(selectedCustomer.name || "?").charAt(0).toUpperCase()}</Text>
              </LinearGradient>
              <View style={[styles.cartCustomerBody, flipRow && { alignItems: "flex-end" }]}>
                <Text style={[styles.cartCustomerName, rtlTextAlign]} numberOfLines={1}>{selectedCustomer.name}</Text>
                <View style={[styles.cartCustomerRow, flipRow && { flexDirection: "row-reverse" }]}>
                  {!!selectedCustomer.phone && (
                    <View style={[styles.cartCustomerChip, flipRow && { flexDirection: "row-reverse" }]}>
                      <Ionicons name="call-outline" size={12} color={Colors.accent} />
                      <Text style={styles.cartCustomerChipText}>{selectedCustomer.phone}</Text>
                    </View>
                  )}
                  {!!selectedCustomer.email && (
                    <View style={[styles.cartCustomerChip, flipRow && { flexDirection: "row-reverse" }]}>
                      <Ionicons name="mail-outline" size={12} color={Colors.info} />
                      <Text style={styles.cartCustomerChipText}>{selectedCustomer.email}</Text>
                    </View>
                  )}
                </View>
                {selectedCustomerAddress ? (
                  <View style={[styles.cartCustomerChip, { marginTop: 4 }, flipRow && { flexDirection: "row-reverse" }]}>
                    <Ionicons name="location-outline" size={12} color={Colors.warning} />
                    <Text style={styles.cartCustomerChipText} numberOfLines={1}>{selectedCustomerAddress}</Text>
                  </View>
                ) : null}
              </View>
              <Pressable
                onPress={() => { cart.setCustomerId(null); setPhoneInput(""); setCallerCustomer(null); }}
                style={styles.cartCustomerClear}
                accessibilityRole="button"
                accessibilityLabel={L("إزالة العميل", "Kunde entfernen", "Remove customer")}
              >
                <Ionicons name="close-circle" size={26} color={Colors.danger} />
              </Pressable>
            </View>
          ) : (
            <Pressable style={[styles.customerSelect, flipRow && { flexDirection: "row-reverse" }]} onPress={() => setShowCustomerPicker(true)}>
              <Ionicons name="person-add" size={18} color={Colors.primary} />
              <Text style={[styles.customerSelectText, rtlTextAlign]}>
                {`${t("selectCustomer")} (${t("walkIn")})`}
              </Text>
              <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={16} color={Colors.primary} />
            </Pressable>
          )}
          {wholesaleBanner}

          {/* Show order notes badge if set */}
          {orderNotes.trim() !== "" && (
            <Pressable
              onPress={() => setShowOrderNotes(true)}
              style={{ flexDirection: flipRow ? "row-reverse" : "row", alignItems: "center", gap: 6, backgroundColor: Colors.warning + "18", borderWidth: 1, borderColor: Colors.warning + "44", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, marginHorizontal: 10, marginBottom: 6 }}
            >
              <Ionicons name="create-outline" size={14} color={Colors.warning} />
              <Text style={{ color: Colors.warning, fontSize: 12, fontWeight: "700", flex: 1 }} numberOfLines={1}>{orderNotes}</Text>
              <Ionicons name="pencil" size={12} color={Colors.warning} />
            </Pressable>
          )}

          <FlatList
            data={cart.items}
            keyExtractor={(item) => String(item.id)}
            scrollEnabled={!!cart.items.length}
            style={styles.cartList}
            renderItem={({ item, index }) => (
              <View style={[styles.cartItem, flipRow && { flexDirection: "row-reverse" }]}>
                {/* Index badge */}
                <View style={styles.cartItemIndexBadge}>
                  <Text style={styles.cartItemIndexText}>{index + 1}</Text>
                </View>
                <View style={styles.cartItemInfo}>
                  <View style={{ flexDirection: flipRow ? "row-reverse" : "row", alignItems: "center", gap: 4, flex: 1 }}>
                    <Text style={[styles.cartItemName, rtlTextAlign, { flex: 1 }]} numberOfLines={1}>{item.name}</Text>
                    {(() => {
                      const prod = (products as any[]).find((p: any) => p.id === item.productId);
                      if (!prod || (!isPizzaProduct(prod) && !isFingerfoodProduct(prod))) return null;
                      return (
                        <Pressable
                          onPress={() => {
                            const existingToppings = parseToppingsFromName(item.name);
                            const cleanName = item.name.replace(/\s*\[.+?\]$/, "").replace(/\s*\([^)]*\)$/, "");
                            const existingVariant = getCartItemVariant(prod, item.name);
                            openProductOptions({ ...prod, name: cleanName }, {
                              variant: existingVariant,
                              toppings: existingToppings,
                              editingItemId: item.id,
                              showExtras: true,
                            });
                          }}
                          style={{ padding: 6, borderRadius: 8, backgroundColor: Colors.accent + "22" }}
                          hitSlop={6}
                          accessibilityRole="button"
                          accessibilityLabel={L("تعديل الإضافات", "Extras bearbeiten", "Edit extras")}
                        >
                          <Ionicons name="create-outline" size={14} color={Colors.accent} />
                        </Pressable>
                      );
                    })()}
                  </View>
                  <Text style={[styles.cartItemUnit, rtlTextAlign]}>{formatMoney(item.price)} × {item.quantity}</Text>
                </View>
                <View style={[styles.cartItemActions, flipRow && { flexDirection: "row-reverse" }]}>
                  <Pressable
                    style={[styles.qtyBtn, item.quantity === 1 && { backgroundColor: `${Colors.danger}22`, borderColor: Colors.danger }]}
                    onPress={() => { cart.updateQuantity(item.id, item.quantity - 1); playClickSound("light"); }}
                  >
                    <Ionicons name={item.quantity === 1 ? "trash-outline" : "remove"} size={15} color={item.quantity === 1 ? Colors.danger : Colors.text} />
                  </Pressable>
                  <View style={styles.qtyBadge}>
                    <Text style={styles.qtyText}>{item.quantity}</Text>
                  </View>
                  <Pressable
                    style={[styles.qtyBtn, { backgroundColor: `${Colors.accent}22`, borderColor: Colors.accent }]}
                    onPress={() => { cart.updateQuantity(item.id, item.quantity + 1); playClickSound("light"); }}
                    hitSlop={4}
                    accessibilityRole="button"
                    accessibilityLabel={L("زيادة الكمية", "Menge erhöhen", "Increase quantity")}
                  >
                    <Ionicons name="add" size={15} color={Colors.accent} />
                  </Pressable>
                  <Text style={[styles.cartItemTotal, webRTL && { textAlign: "left" }]}>{formatMoney(item.price * item.quantity)}</Text>
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
            <View style={[styles.summaryRow, flipRow && { flexDirection: "row-reverse" }]}>
              <Text style={[styles.summaryLabel, rtlTextAlign]}>{t("subtotal")}</Text>
              <Text style={[styles.summaryValue, rtlTextAlign]}>{formatMoney(cart.subtotal)}</Text>
            </View>
            {cart.discount > 0 && (
              <View style={[styles.summaryRow, flipRow && { flexDirection: "row-reverse" }]}>
                <Text style={[styles.summaryLabel, { color: Colors.success }, rtlTextAlign]}>{t("discount")}</Text>
                <Text style={[styles.summaryValue, { color: Colors.success }, rtlTextAlign]}>-{formatMoney(cart.discount)}</Text>
              </View>
            )}
            {cart.minimumOrderSurcharge > 0 && (
              <View style={[styles.summaryRow, flipRow && { flexDirection: "row-reverse" }]}>
                <Text style={[styles.summaryLabel, { color: Colors.warning }, rtlTextAlign]}>{L("حد أدنى للطلب", "Mindestbestellwert", "Minimum order")} ({L("الحد", "min.", "min.")} {formatMoney(cart.minOrderAmount, 0)})</Text>
                <Text style={[styles.summaryValue, { color: Colors.warning }, rtlTextAlign]}>+{formatMoney(cart.minimumOrderSurcharge)}</Text>
              </View>
            )}
            {cart.serviceFee > 0 && (
              <View style={[styles.summaryRow, flipRow && { flexDirection: "row-reverse" }]}>
                <Text style={[styles.summaryLabel, rtlTextAlign]}>{t("serviceTax" as any) || L("رسوم الخدمة", "Servicegebühr", "Service fee")} ({cart.serviceFeeRate}%)</Text>
                <Text style={[styles.summaryValue, rtlTextAlign]}>{formatMoney(cart.serviceFee)}</Text>
              </View>
            )}
            {cart.deliveryFee > 0 && (
              <View style={[styles.summaryRow, flipRow && { flexDirection: "row-reverse" }]}>
                <Text style={[styles.summaryLabel, rtlTextAlign]}>{L("رسوم التوصيل", "Liefergebühr", "Delivery fee")}</Text>
                <Text style={styles.summaryValue}>{formatMoney(cart.deliveryFee)}</Text>
              </View>
            )}
            <View style={[styles.summaryRow, flipRow && { flexDirection: "row-reverse" }]}>
              <Text style={[styles.summaryLabel, rtlTextAlign]}>{t("tax")} ({cart.taxRate}%)</Text>
              <Text style={[styles.summaryValue, rtlTextAlign]}>{formatMoney(cart.tax)}</Text>
            </View>
            <View style={[styles.summaryRow, flipRow && { flexDirection: "row-reverse" }, { alignItems: "center" }]}>
              <Text style={[styles.summaryLabel, rtlTextAlign]}>{L("تعديل المبلغ", "Anpassung", "Adjustment")}</Text>
              <View style={{ flexDirection: flipRow ? "row-reverse" : "row", alignItems: "center", gap: 6 }}>
                <Pressable
                  onPress={() => setManualAdjustment(v => roundMoney(v - adjustStep, currency))}
                  style={[styles.adjustBtn, { borderColor: Colors.danger, backgroundColor: Colors.danger + "14" }]}
                  hitSlop={4}
                  accessibilityRole="button"
                  accessibilityLabel={`${L("إنقاص", "Verringern um", "Decrease by")} ${formatMoney(adjustStep)}`}
                >
                  <Ionicons name="remove" size={16} color={Colors.danger} />
                </Pressable>
                <Text style={[styles.adjustValue, { color: manualAdjustment < 0 ? Colors.danger : manualAdjustment > 0 ? Colors.success : Colors.textSecondary }]}>
                  {manualAdjustment > 0 ? "+" : ""}{formatMoney(manualAdjustment)}
                </Text>
                <Pressable
                  onPress={() => setManualAdjustment(v => roundMoney(v + adjustStep, currency))}
                  style={[styles.adjustBtn, { borderColor: Colors.success, backgroundColor: Colors.success + "14" }]}
                  hitSlop={4}
                  accessibilityRole="button"
                  accessibilityLabel={`${L("زيادة", "Erhöhen um", "Increase by")} ${formatMoney(adjustStep)}`}
                >
                  <Ionicons name="add" size={16} color={Colors.success} />
                </Pressable>
                {manualAdjustment !== 0 && (
                  <Pressable
                    onPress={() => setManualAdjustment(0)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={L("إلغاء التعديل", "Anpassung zurücksetzen", "Reset adjustment")}
                  >
                    <Ionicons name="close-circle" size={20} color={Colors.textMuted} />
                  </Pressable>
                )}
              </View>
            </View>
            <View style={[styles.summaryRow, styles.totalRow, flipRow && { flexDirection: "row-reverse" }]}>
              <Text style={[styles.totalLabel, rtlTextAlign]}>{t("total")}</Text>
              <Text style={[styles.totalValue, rtlTextAlign]}>{formatMoney(payableTotal)}</Text>
            </View>
          </View>

          <Animated.View style={{ transform: [{ scale: checkoutPulse }] }}>
            <Pressable
              style={[styles.checkoutBtn, !cart.items.length && styles.checkoutBtnDisabled]}
              onPress={() => { if (cart.items.length > 0) { playClickSound("heavy"); setShowCheckout(true); } }}
              disabled={!cart.items.length}
            >
              <LinearGradient
                colors={cart.items.length > 0 ? [Colors.gradientStart, Colors.gradientMid, Colors.accent] : ["#333", "#444", "#555"]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.checkoutBtnGradient}
              >
                <View style={[styles.checkoutBtnInner, flipRow && { flexDirection: "row-reverse" }]}>
                  <View style={[styles.checkoutBtnLeft, flipRow && { flexDirection: "row-reverse" }]}>
                    <Ionicons name="bag-check" size={20} color={Colors.white} />
                    <Text style={styles.checkoutBtnText}>{t("checkout")}</Text>
                  </View>
                  <View style={styles.checkoutBtnPrice}>
                    <Text style={styles.checkoutBtnPriceText}>{formatMoney(payableTotal)}</Text>
                    {cart.items.length > 0 && (
                      <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 10, textAlign: "center" }}>{itemCountLabel(cart.itemCount)}</Text>
                    )}
                  </View>
                </View>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        </View>
        )}
      </View>

      {useMobileCartSidebar && (
        <>
          <Pressable
            style={[styles.mobileCartBar, flipRow && { flexDirection: "row-reverse" }]}
            onPress={() => setShowMobileCart(true)}
            accessibilityRole="button"
            accessibilityLabel={`${t("cart")} · ${itemCountLabel(cart.itemCount)} · ${formatMoney(payableTotal)}`}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.mobileCartBarLabel, rtlTextAlign]}>{t("cart")} · {itemCountLabel(cart.itemCount)}</Text>
              <Text style={[styles.mobileCartBarHint, rtlTextAlign]} numberOfLines={1}>
                {orderNotes ? orderNotes : L("اضغط لفتح السلة", "Tippen zum Öffnen", "Tap to open")}
              </Text>
            </View>
            <View style={styles.mobileCartBarPrice}>
              <Text style={styles.mobileCartBarPriceText}>{formatMoney(payableTotal)}</Text>
            </View>
          </Pressable>

          <Modal visible={showMobileCart} animationType="fade" transparent onRequestClose={() => setShowMobileCart(false)}>
            <View style={styles.mobileCartOverlay}>
              <Pressable style={styles.mobileCartBackdrop} onPress={() => setShowMobileCart(false)} />
              <View style={[styles.mobileCartDrawer, flipRow && { alignSelf: "flex-start" }, webRTL && { borderLeftWidth: 0, borderRightWidth: 1, borderRightColor: Colors.cardBorder }]}>
                <View style={[styles.cartHeader, flipRow && { flexDirection: "row-reverse" }]}>
                  <Text style={[styles.cartTitle, rtlTextAlign]}>{t("cart")} ({cart.itemCount})</Text>
                  <View style={{ flexDirection: flipRow ? "row-reverse" : "row", gap: 8 }}>
                    <Pressable
                      onPress={() => setShowOrderNotes(true)}
                      style={[styles.cartHeaderBtn, orderNotes ? { backgroundColor: Colors.warning + "22", borderColor: Colors.warning } : null]}
                      accessibilityRole="button"
                      accessibilityLabel={L("ملاحظة الطلب", "Bestellnotiz", "Order note")}
                    >
                      <Ionicons name="create-outline" size={18} color={orderNotes ? Colors.warning : Colors.textMuted} />
                    </Pressable>
                    {cart.items.length > 0 ? (
                      <>
                        <Pressable
                          onPress={() => setShowDiscountModal(true)}
                          style={[styles.cartHeaderBtn, cart.discount > 0 && { backgroundColor: Colors.success + "22", borderColor: Colors.success }]}
                          accessibilityRole="button"
                          accessibilityLabel={t("discount")}
                        >
                          <Ionicons name="pricetag" size={18} color={Colors.success} />
                        </Pressable>
                        <Pressable
                          onPress={handleClearCart}
                          style={styles.cartHeaderBtn}
                          accessibilityRole="button"
                          accessibilityLabel={L("إفراغ السلة", "Warenkorb leeren", "Clear cart")}
                        >
                          <Ionicons name="trash" size={18} color={Colors.danger} />
                        </Pressable>
                      </>
                    ) : null}
                    <Pressable
                      onPress={() => setShowMobileCart(false)}
                      style={styles.cartHeaderBtn}
                      accessibilityRole="button"
                      accessibilityLabel={L("إغلاق", "Schliessen", "Close")}
                    >
                      <Ionicons name="close" size={20} color={Colors.textMuted} />
                    </Pressable>
                  </View>
                </View>

                {selectedCustomer ? (
                  <View style={[styles.cartCustomerCard, flipRow && { flexDirection: "row-reverse" }]}>
                    <LinearGradient colors={[Colors.primary, Colors.secondary]} style={styles.cartCustomerAvatar}>
                      <Text style={styles.cartCustomerAvatarText}>{(selectedCustomer.name || "?").charAt(0).toUpperCase()}</Text>
                    </LinearGradient>
                    <View style={[styles.cartCustomerBody, flipRow && { alignItems: "flex-end" }]}>
                      <Text style={[styles.cartCustomerName, rtlTextAlign]} numberOfLines={1}>{selectedCustomer.name}</Text>
                      {selectedCustomer.phone ? <Text style={styles.cartCustomerChipText}>{selectedCustomer.phone}</Text> : null}
                      {selectedCustomerAddress ? <Text style={styles.cartCustomerChipText} numberOfLines={1}>{selectedCustomerAddress}</Text> : null}
                    </View>
                    <Pressable
                      onPress={() => { cart.setCustomerId(null); setPhoneInput(""); setCallerCustomer(null); }}
                      style={styles.cartCustomerClear}
                      accessibilityRole="button"
                      accessibilityLabel={L("إزالة العميل", "Kunde entfernen", "Remove customer")}
                    >
                      <Ionicons name="close-circle" size={24} color={Colors.danger} />
                    </Pressable>
                  </View>
                ) : (
                  <Pressable style={[styles.customerSelect, flipRow && { flexDirection: "row-reverse" }]} onPress={() => setShowCustomerPicker(true)}>
                    <Ionicons name="person-add" size={18} color={Colors.primary} />
                    <Text style={[styles.customerSelectText, rtlTextAlign]}>{`${t("selectCustomer")} (${t("walkIn")})`}</Text>
                  </Pressable>
                )}
                {wholesaleBanner}

                <FlatList
                  data={cart.items}
                  keyExtractor={(item) => String(item.id)}
                  style={styles.cartList}
                  contentContainerStyle={!cart.items.length ? { flexGrow: 1, justifyContent: "center" } : { paddingBottom: 8 }}
                  renderItem={({ item }) => (
                    <View style={[styles.cartItem, flipRow && { flexDirection: "row-reverse" }]}>
                      <View style={styles.cartItemInfo}>
                        <Text style={[styles.cartItemName, rtlTextAlign]} numberOfLines={2}>{item.name}</Text>
                        <Text style={[styles.cartItemUnit, rtlTextAlign]}>{formatMoney(item.price)} × {item.quantity}</Text>
                      </View>
                      <View style={[styles.cartItemActions, flipRow && { flexDirection: "row-reverse" }]}>
                        <Pressable
                          style={[styles.qtyBtn, item.quantity === 1 && { backgroundColor: `${Colors.danger}22`, borderColor: Colors.danger }]}
                          onPress={() => { cart.updateQuantity(item.id, item.quantity - 1); playClickSound("light"); }}
                        >
                          <Ionicons name={item.quantity === 1 ? "trash-outline" : "remove"} size={15} color={item.quantity === 1 ? Colors.danger : Colors.text} />
                        </Pressable>
                        <View style={styles.qtyBadge}>
                          <Text style={styles.qtyText}>{item.quantity}</Text>
                        </View>
                        <Pressable
                          style={[styles.qtyBtn, { backgroundColor: `${Colors.accent}22`, borderColor: Colors.accent }]}
                          onPress={() => { cart.updateQuantity(item.id, item.quantity + 1); playClickSound("light"); }}
                          accessibilityRole="button"
                          accessibilityLabel={L("زيادة الكمية", "Menge erhöhen", "Increase quantity")}
                        >
                          <Ionicons name="add" size={15} color={Colors.accent} />
                        </Pressable>
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
                  <View style={[styles.summaryRow, flipRow && { flexDirection: "row-reverse" }]}>
                    <Text style={[styles.summaryLabel, rtlTextAlign]}>{t("subtotal")}</Text>
                    <Text style={[styles.summaryValue, rtlTextAlign]}>{formatMoney(cart.subtotal)}</Text>
                  </View>
                  {cart.discount > 0 && (
                    <View style={[styles.summaryRow, flipRow && { flexDirection: "row-reverse" }]}>
                      <Text style={[styles.summaryLabel, { color: Colors.success }, rtlTextAlign]}>{t("discount")}</Text>
                      <Text style={[styles.summaryValue, { color: Colors.success }]}>-{formatMoney(cart.discount)}</Text>
                    </View>
                  )}
                  {cart.minimumOrderSurcharge > 0 && (
                    <View style={[styles.summaryRow, flipRow && { flexDirection: "row-reverse" }]}>
                      <Text style={[styles.summaryLabel, { color: Colors.warning }, rtlTextAlign]}>{L("حد أدنى للطلب", "Mindestbestellwert", "Minimum order")}</Text>
                      <Text style={[styles.summaryValue, { color: Colors.warning }]}>+{formatMoney(cart.minimumOrderSurcharge)}</Text>
                    </View>
                  )}
                  {cart.serviceFee > 0 && (
                    <View style={[styles.summaryRow, flipRow && { flexDirection: "row-reverse" }]}>
                      <Text style={[styles.summaryLabel, rtlTextAlign]}>{t("serviceTax" as any) || L("رسوم الخدمة", "Servicegebühr", "Service fee")} ({cart.serviceFeeRate}%)</Text>
                      <Text style={styles.summaryValue}>{formatMoney(cart.serviceFee)}</Text>
                    </View>
                  )}
                  {cart.tax > 0 && (
                    <View style={[styles.summaryRow, flipRow && { flexDirection: "row-reverse" }]}>
                      <Text style={[styles.summaryLabel, rtlTextAlign]}>{t("tax")} ({cart.taxRate}%)</Text>
                      <Text style={styles.summaryValue}>{formatMoney(cart.tax)}</Text>
                    </View>
                  )}
                  {cart.deliveryFee > 0 && (
                    <View style={[styles.summaryRow, flipRow && { flexDirection: "row-reverse" }]}>
                      <Text style={[styles.summaryLabel, rtlTextAlign]}>{L("رسوم التوصيل", "Liefergebühr", "Delivery fee")}</Text>
                      <Text style={styles.summaryValue}>{formatMoney(cart.deliveryFee)}</Text>
                    </View>
                  )}
                  {manualAdjustment !== 0 && (
                    <View style={[styles.summaryRow, flipRow && { flexDirection: "row-reverse" }]}>
                      <Text style={[styles.summaryLabel, rtlTextAlign]}>{L("تعديل المبلغ", "Anpassung", "Adjustment")}</Text>
                      <Text style={styles.summaryValue}>{manualAdjustment > 0 ? "+" : ""}{formatMoney(manualAdjustment)}</Text>
                    </View>
                  )}
                  <View style={[styles.summaryRow, styles.totalRow, flipRow && { flexDirection: "row-reverse" }]}>
                    <Text style={[styles.totalLabel, rtlTextAlign]}>{t("total")}</Text>
                    <Text style={styles.totalValue}>{formatMoney(payableTotal)}</Text>
                  </View>
                </View>

                <Pressable
                  style={[styles.checkoutBtn, !cart.items.length && styles.checkoutBtnDisabled]}
                  onPress={() => {
                    if (cart.items.length > 0) {
                      playClickSound("heavy");
                      setShowMobileCart(false);
                      setShowCheckout(true);
                    }
                  }}
                  disabled={!cart.items.length}
                >
                  <LinearGradient
                    colors={cart.items.length > 0 ? [Colors.gradientStart, Colors.gradientMid, Colors.accent] : ["#333", "#444", "#555"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.checkoutBtnGradient}
                  >
                    <View style={[styles.checkoutBtnInner, flipRow && { flexDirection: "row-reverse" }]}>
                      <View style={[styles.checkoutBtnLeft, flipRow && { flexDirection: "row-reverse" }]}>
                        <Ionicons name="bag-check" size={20} color={Colors.white} />
                        <Text style={styles.checkoutBtnText}>{t("checkout")}</Text>
                      </View>
                      <View style={styles.checkoutBtnPrice}>
                        <Text style={styles.checkoutBtnPriceText}>{formatMoney(payableTotal)}</Text>
                      </View>
                    </View>
                  </LinearGradient>
                </Pressable>
              </View>
            </View>
          </Modal>
        </>
      )}

      <Modal visible={!!selectedProductForOptions} animationType="fade" transparent onRequestClose={resetProductOptionsState}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxWidth: isTablet ? (showToppingsStep ? 750 : 420) : 420, padding: isTablet ? 32 : 24, maxHeight: "92%" }]}>
            <View style={[styles.modalHeader, flipRow && { flexDirection: "row-reverse" }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, rtlTextAlign, { fontSize: 24, fontWeight: "900" }]}>{selectedProductForOptions?.name}</Text>
                <Text style={[styles.sectionLabel, { marginTop: 4, marginBottom: 0 }, rtlTextAlign]}>
                  {showToppingsStep ? (editingCartItemId !== null ? L("تعديل الإضافات", "Extras bearbeiten", "Edit Extras") : L("اختر الإضافات", "Extras wählen", "Select Extras")) : (t("selectSize" as any) || L("اختر الحجم", "Größe wählen", "Select size"))}
                </Text>
              </View>
              <Pressable onPress={resetProductOptionsState} style={styles.modalCloseBtn} accessibilityRole="button" accessibilityLabel={L("إغلاق", "Schliessen", "Close")}>
                <Ionicons name="close" size={24} color={Colors.textMuted} />
              </Pressable>
            </View>

            {!showToppingsStep ? (
              /* ── SIZE SELECTION ── */
              <View style={{ marginTop: 20, gap: 12 }}>
                <Text style={[styles.sectionLabel, { marginBottom: 4 }, rtlTextAlign]}>
                  {L("اختر الحجم", "Größe wählen", "Choose size")}
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
                  {selectedProductForOptions?.variants?.map((v: any, idx: number) => (
                    <Pressable
                      key={idx}
                      style={[styles.sizeCard, { flex: 1, minWidth: isTablet ? 140 : 120 }, selectedVariant?.name === v.name && styles.sizeCardSelected]}
                      onPress={() => {
                        if (isPizzaProduct(selectedProductForOptions) || isFingerfoodProduct(selectedProductForOptions)) {
                          setSelectedVariant(v);
                          setShowToppingsStep(true);
                          playClickSound("light");
                        } else {
                          cart.addItem({
                            id: selectedProductForOptions.id,
                            name: selectedProductForOptions.name,
                            price: Number(selectedProductForOptions.price),
                            variant: v,
                          });
                          playAddSound();
                          resetProductOptionsState();
                        }
                      }}
                    >
                      <Text style={[styles.sizeCardName, selectedVariant?.name === v.name && { color: Colors.accent }]}>{getShortVariantLabel(v.name)}</Text>
                      <Text style={[styles.sizeCardPrice, selectedVariant?.name === v.name && { color: Colors.accent }]}>{formatMoney(v.price)}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : (
              /* ── EXTRAS: POS-style Color Grid ── */
              <ScrollView style={{ marginTop: 8 }} showsVerticalScrollIndicator={false} bounces={false}>
                {/* Selected size badge — shows live price with toppings */}
                {selectedVariant && (
                  <View style={[styles.selectedSizeBadge, { paddingVertical: 8, paddingHorizontal: 14, backgroundColor: Colors.accent + "18", marginBottom: 8 }]}>
                    <Ionicons name="pizza" size={15} color={Colors.accent} />
                    <Text style={[styles.selectedSizeBadgeText, { fontSize: 14, fontWeight: "700" }]}>
                      {getShortVariantLabel(selectedVariant.name)} — {formatMoney(Number(selectedVariant.price) + calcToppingsPrice(selectedToppings, selectedVariant?.name))}
                    </Text>
                    {selectedToppings.length > 0 && (
                      <View style={{ marginLeft: "auto", backgroundColor: Colors.accent, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 }}>
                        <Text style={{ color: Colors.textDark, fontSize: 12, fontWeight: "800" }}>{selectedToppings.length}</Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Price note */}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 6, paddingHorizontal: 2 }}>
                  <Ionicons name="pricetag" size={12} color={Colors.accent} />
                  <Text style={{ color: Colors.accent, fontSize: 11, fontWeight: "700" }}>
                    {language === "ar"
                      ? `كل إضافة +${formatMoney(2)}، وكِسراند 33cm = ${formatMoney(3, 0)} / 45cm = ${formatMoney(6, 0)}`
                      : language === "de"
                        ? `Jedes Extra +${formatMoney(2)}, Käserand 33cm = ${formatMoney(3, 0)} / 45cm = ${formatMoney(6, 0)}`
                        : `Each extra +${formatMoney(2)}, cheese crust 33cm = ${formatMoney(3, 0)} / 45cm = ${formatMoney(6, 0)}`}
                  </Text>
                </View>

                {/* Color-coded POS grid */}
                <View style={{ flexDirection: "row", flexWrap: "wrap", borderRadius: 8, overflow: "hidden" }}>
                  {(() => {
                    return TOPPING_GRID.flatMap((row, rowIdx) =>
                      row.items.map((toppingName, colIdx) => {
                        if (!toppingName) return null;
                        const isSelected = selectedToppings.includes(toppingName);
                        return (
                          <View key={`${rowIdx}-${colIdx}`} style={{ width: "14.28%", height: isTablet ? 56 : 50, padding: 1 }}>
                            <Pressable
                              onPress={() => {
                                setSelectedToppings((prev: string[]) =>
                                  isSelected ? prev.filter((t: string) => t !== toppingName) : [...prev, toppingName]
                                );
                                playClickSound("light");
                              }}
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
                              <Text style={{ fontSize: isTablet ? 15 : 13, lineHeight: 16 }}>{toppingEmoji(toppingName)}</Text>
                              <Text style={{ fontSize: isTablet ? 9 : 8, fontWeight: "700", textAlign: "center", color: isSelected ? Colors.textDark : row.textColor, lineHeight: 10 }} numberOfLines={2}>
                                {toppingDisplayName(toppingName)}
                              </Text>
                              <Text style={{ fontSize: 8, color: isSelected ? Colors.textDark : row.textColor, opacity: 0.8, lineHeight: 10 }}>+2</Text>
                              {isSelected && <Ionicons name="checkmark" size={11} color={Colors.textDark} style={{ position: "absolute", top: 2, right: 3 }} />}
                            </Pressable>
                          </View>
                        );
                      })
                    );
                  })()}
                </View>

                {/* Sauces row — separate labeled section */}
                <View style={{ marginTop: 8 }}>
                  <Text style={{ color: Colors.textMuted, fontSize: 10, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4, paddingHorizontal: 2 }}>
                    {language === "ar" ? "الصوصات" : language === "de" ? "Saucen" : "Sauces"}
                  </Text>
                  <View style={{ flexDirection: "row", gap: 4 }}>
                    {SAUCE_ROW.map((sauce) => {
                      const isSelected = selectedToppings.includes(sauce.name);
                      return (
                        <Pressable
                          key={sauce.name}
                          style={{
                            flex: 1, height: isTablet ? 56 : 50, borderRadius: 6,
                            backgroundColor: isSelected ? Colors.accent : sauce.color,
                            justifyContent: "center", alignItems: "center", padding: 4,
                            borderWidth: isSelected ? 2 : 0, borderColor: Colors.accent,
                          }}
                          onPress={() => {
                            setSelectedToppings((prev: string[]) =>
                              isSelected ? prev.filter((t: string) => t !== sauce.name) : [...prev, sauce.name]
                            );
                            playClickSound("light");
                          }}
                        >
                          <Text style={{ fontSize: isTablet ? 15 : 13, lineHeight: 16 }}>{toppingEmoji(sauce.name)}</Text>
                          <Text style={{ fontSize: isTablet ? 10 : 9, fontWeight: "700", textAlign: "center", color: isSelected ? Colors.textDark : sauce.textColor, lineHeight: 11 }} numberOfLines={1}>
                            {toppingDisplayName(sauce.name)}
                          </Text>
                          <Text style={{ fontSize: 8, color: isSelected ? Colors.textDark : sauce.textColor, opacity: 0.9, lineHeight: 10, fontWeight: "700" }}>
                            {language === "ar" ? "مجاناً" : language === "de" ? "GRATIS" : "FREE"}
                          </Text>
                          {isSelected && <Ionicons name="checkmark" size={11} color={Colors.textDark} style={{ position: "absolute", top: 2, right: 4 }} />}
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {/* Selected toppings summary */}
                {selectedToppings.length > 0 && (
                  <View style={{ marginTop: 8, padding: 8, backgroundColor: Colors.surfaceLight, borderRadius: 8, borderWidth: 1, borderColor: Colors.cardBorder }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <Text style={{ color: Colors.accent, fontSize: 11, fontWeight: "700" }}>
                        {language === "ar"
                          ? `الإضافات المختارة (${selectedToppings.length}) — +${formatMoney(calcToppingsPrice(selectedToppings, selectedVariant?.name))}`
                          : language === "de"
                          ? `Ausgewählte Extras (${selectedToppings.length}) — +${formatMoney(calcToppingsPrice(selectedToppings, selectedVariant?.name))}`
                          : `Selected Extras (${selectedToppings.length}) — +${formatMoney(calcToppingsPrice(selectedToppings, selectedVariant?.name))}`}
                      </Text>
                      <Pressable onPress={() => setSelectedToppings([])} hitSlop={10} accessibilityRole="button">
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

                {/* Add to Cart / Update button */}
                <View style={{ gap: 8, marginTop: 10 }}>
                  <Pressable
                    style={{ borderRadius: 14, overflow: "hidden" }}
                    onPress={() => {
                      const toppingsSuffix = selectedToppings.length > 0 ? ` [${selectedToppings.map(t => toppingDisplayName(t)).join(", ")}]` : "";
                      const toppingsPrice = calcToppingsPrice(selectedToppings, selectedVariant?.name);

                      if (editingCartItemId !== null) {
                        const baseName = selectedVariant
                          ? `${selectedProductForOptions.name} (${selectedVariant.name})`
                          : selectedProductForOptions.name;
                        const basePrice = selectedVariant
                          ? Number(selectedVariant.price)
                          : Number(selectedProductForOptions.price);
                        cart.updateItem(editingCartItemId, {
                          name: baseName + toppingsSuffix,
                          price: basePrice + toppingsPrice,
                        });
                        playAddSound();
                        resetProductOptionsState();
                      } else {
                        const variantWithToppings = selectedVariant
                          ? { ...selectedVariant, price: Number(selectedVariant.price) + toppingsPrice }
                          : undefined;
                        cart.addItem({
                          id: selectedProductForOptions.id,
                          name: selectedProductForOptions.name + toppingsSuffix,
                          price: Number(selectedProductForOptions.price) + toppingsPrice,
                          variant: variantWithToppings,
                        });
                        playAddSound();
                        resetProductOptionsState();
                        triggerFlash(selectedProductForOptions.id);
                      }
                    }}
                  >
                    <LinearGradient colors={[Colors.accent, Colors.gradientMid]} style={{ paddingVertical: 15, alignItems: "center", borderRadius: 14 }}>
                      <Text style={{ color: Colors.textDark, fontSize: 17, fontWeight: "900" }}>
                        {editingCartItemId !== null
                          ? (language === "ar" ? "تحديث الإضافات" : language === "de" ? "Extras aktualisieren" : "Update Extras")
                          : language === "ar"
                          ? `إضافة للسلة${selectedToppings.length > 0 ? ` (+${formatMoney(calcToppingsPrice(selectedToppings, selectedVariant?.name))})` : ""}`
                          : language === "de"
                          ? `In den Warenkorb${selectedToppings.length > 0 ? ` (+${formatMoney(calcToppingsPrice(selectedToppings, selectedVariant?.name))})` : ""}`
                          : `Add to Cart${selectedToppings.length > 0 ? ` (+${formatMoney(calcToppingsPrice(selectedToppings, selectedVariant?.name))})` : ""}`}
                      </Text>
                    </LinearGradient>
                  </Pressable>

                  {selectedVariant && editingCartItemId === null && (
                    <Pressable style={{ paddingVertical: 12 }} onPress={() => setShowToppingsStep(false)} accessibilityRole="button">
                      <Text style={{ color: Colors.textMuted, textAlign: "center", fontSize: 13, fontWeight: "600" }}>
                        {L("→ العودة للأحجام", "← Zurück zu Größen", "← Back to sizes")}
                      </Text>
                    </Pressable>
                  )}
                </View>
              </ScrollView>
            )}

            {!showToppingsStep && (
              <Pressable
                style={[styles.modalCancelBtn, { marginTop: 16 }]}
                onPress={resetProductOptionsState}
              >
                <Text style={styles.modalCancelBtnText}>{t("cancel")}</Text>
              </Pressable>
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={showCheckout} animationType="slide" transparent onRequestClose={() => { if (!checkoutBusy) setShowCheckout(false); }}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: "92%" }]}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={[styles.modalHeader, flipRow && { flexDirection: "row-reverse" }]}>
                <Text style={[styles.modalTitle, rtlTextAlign]}>{t("completePayment")}</Text>
                <Pressable
                  onPress={() => setShowCheckout(false)}
                  disabled={checkoutBusy}
                  style={[styles.modalCloseBtn, checkoutBusy && { opacity: 0.4 }]}
                  accessibilityRole="button"
                  accessibilityLabel={L("إغلاق", "Schliessen", "Close")}
                >
                  <Ionicons name="close" size={22} color={Colors.text} />
                </Pressable>
              </View>

              <Text style={styles.modalTotal} adjustsFontSizeToFit numberOfLines={1}>{formatMoney(payableTotal)}</Text>

              {selectedCustomer && (
                <View style={[styles.customerInfo, flipRow && { flexDirection: "row-reverse" }]}>
                  <Ionicons name="person-circle" size={20} color={Colors.accent} />
                  <Text style={[styles.customerInfoText, rtlTextAlign]}>{selectedCustomer.name}</Text>
                  <View style={[styles.loyaltyBadge, flipRow && { flexDirection: "row-reverse" }]}>
                    <Ionicons name="star" size={12} color={Colors.warning} />
                    <Text style={styles.loyaltyBadgeText}>{selectedCustomer.loyaltyPoints || 0} {t("pts")}</Text>
                  </View>
                </View>
              )}
              {selectedCustomer && loyalty.enabled && (() => {
                // Points to earn are what the server will award on the amount paid.
                const earn = Math.floor(Math.max(0, payableTotal) * loyalty.pointsPerUnit + 1e-6);
                const redeemable = loyaltyRedeem ? null : loyaltyRedeemable();
                if (earn <= 0 && !loyaltyRedeem && !redeemable) return null;
                return (
                  <View style={{ flexDirection: flipRow ? "row-reverse" : "row", alignItems: "center", gap: 8, marginTop: -8, marginBottom: 16 }}>
                    <Text style={[{ flex: 1, color: Colors.textMuted, fontSize: 12 }, rtlTextAlign]}>
                      {earn > 0 ? L(`+${earn} نقطة على هذا الطلب`, `+${earn} Punkte für diesen Einkauf`, `+${earn} pts on this sale`) : ""}
                    </Text>
                    {(loyaltyRedeem || redeemable) && (
                      <Pressable
                        onPress={toggleLoyaltyRedeem}
                        style={{ flexDirection: flipRow ? "row-reverse" : "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: Colors.warning + "60", backgroundColor: loyaltyRedeem ? Colors.warning + "25" : Colors.warning + "10" }}
                      >
                        <Ionicons name={loyaltyRedeem ? "close-circle" : "gift-outline"} size={16} color={Colors.warning} />
                        <Text style={{ color: Colors.warning, fontSize: 12, fontWeight: "700" }}>
                          {loyaltyRedeem
                            ? (language === "ar"
                              ? `إلغاء الاستبدال (${loyaltyRedeem.points} نقطة = −${formatMoney(loyaltyRedeem.value)})`
                              : language === "de"
                                ? `Einlösung aufheben (${loyaltyRedeem.points} Pkt. = −${formatMoney(loyaltyRedeem.value)})`
                                : `Undo redeem (${loyaltyRedeem.points} pts = −${formatMoney(loyaltyRedeem.value)})`)
                            : (language === "ar"
                              ? `استبدال ${redeemable!.points} نقطة (−${formatMoney(redeemable!.value)})`
                              : language === "de"
                                ? `${redeemable!.points} Punkte einlösen (−${formatMoney(redeemable!.value)})`
                                : `Redeem ${redeemable!.points} pts (−${formatMoney(redeemable!.value)})`)}
                        </Text>
                      </Pressable>
                    )}
                  </View>
                );
              })()}

              <Text style={[styles.sectionLabel, rtlTextAlign]}>{t("paymentMethod")}</Text>
              <View style={[styles.paymentMethods, flipRow && { flexDirection: "row-reverse" }]}>
                {[
                  { key: "cash", icon: "cash" as const, label: t("cash") },
                  // Card / wallet go through Stripe, which does not serve every
                  // currency (not SYP): those stores never see the buttons.
                  ...(stripeAllowed
                    ? [
                      { key: "card", icon: "card" as const, label: t("card") },
                      { key: "wallet", icon: "wallet-outline" as const, label: t("walletPay") },
                    ]
                    : []),
                  ...(shamCashStore
                    ? [{ key: "shamcash", icon: "wallet" as const, label: L("شام كاش", "Sham Cash", "Sham Cash") }]
                    : []),
                  ...(selectedTrader
                    ? [{ key: "credit", icon: "document-text-outline" as const, label: L("آجل", "Auf Rechnung", "On credit") }]
                    : []),
                ].filter((m) => tillMethodEnabled(m.key)).map((m) => {
                  // Nothing here talks to a card reader, so the non-cash buttons
                  // are only offered when Stripe (or Sham Cash) is actually live.
                  const blocked = (isStripeMethod(m.key) && !stripeReady) || (m.key === "shamcash" && !shamCashReady);
                  return (
                    <Pressable
                      key={m.key}
                      style={[styles.paymentBtn, paymentMethod === m.key && styles.paymentBtnActive, blocked && { opacity: 0.45 }]}
                      onPress={() => { if (!blocked && !checkoutBusy) setPaymentMethod(m.key); }}
                      disabled={blocked || checkoutBusy}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: paymentMethod === m.key, disabled: blocked }}
                      accessibilityLabel={m.label}
                    >
                      <Ionicons name={m.icon} size={22} color={paymentMethod === m.key ? Colors.accent : Colors.textSecondary} />
                      <Text style={[styles.paymentBtnText, paymentMethod === m.key && { color: Colors.accent }]}>{m.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
              {paymentsConfig !== undefined && stripeAllowed && !stripeReady && (
                <Text style={[styles.payHint, rtlTextAlign]}>{t("stripeNotConnected")}</Text>
              )}
              {shamCashStore && !shamCashReady && (
                <Text style={[styles.payHint, rtlTextAlign]}>
                  {L(
                    "شام كاش غير مفعّل بعد: أضف رمز QR أو رقم شام كاش الخاص بالمتجر من الإعدادات ← إعدادات المتجر ← شام كاش.",
                    "Sham Cash ist noch nicht aktiv: QR-Code oder Sham-Cash-Nummer unter Einstellungen → Filialeinstellungen → Sham Cash hinterlegen.",
                    "Sham Cash is not live yet: add the store's QR code or Sham Cash number in Settings → Store Settings → Sham Cash.",
                  )}
                </Text>
              )}

              {paymentMethod === "cash" && (() => {
                const given = parseAmountInput(cashReceived, currency);
                const hasGiven = cashReceived.trim() !== "" && Number.isFinite(given);
                const diff = hasGiven ? roundMoney(given - payableTotal, currency) : 0;
                const quick = [payableTotal, ...cashSuggestions(payableTotal, currency, 4)].filter((v, i, a) => v > 0 && a.indexOf(v) === i);
                return (
                  <View style={styles.cashSection}>
                    <Text style={[styles.sectionLabel, rtlTextAlign]}>
                      {t("cashReceived")} <Text style={{ color: Colors.textMuted, fontSize: 11, textTransform: "none", letterSpacing: 0 }}>({t("optional" as any) || L("اختياري", "optional", "optional")})</Text>
                    </Text>
                    <TextInput
                      style={styles.cashInput}
                      placeholder={t("enterAmount")}
                      placeholderTextColor={Colors.textMuted}
                      value={cashReceived}
                      onChangeText={setCashReceived}
                      keyboardType={isZeroDecimalCurrency(currency) ? "number-pad" : "decimal-pad"}
                      accessibilityLabel={t("cashReceived")}
                    />
                    {quick.length > 0 && (
                      <View style={[styles.cashChipsRow, flipRow && { flexDirection: "row-reverse" }]}>
                        {quick.map((v, i) => {
                          const active = hasGiven && Math.abs(given - v) < 1e-9;
                          return (
                            <Pressable
                              key={`${i}-${v}`}
                              style={[styles.cashChip, active && styles.cashChipActive]}
                              onPress={() => { setCashReceived(isZeroDecimalCurrency(currency) ? String(Math.round(v)) : String(v)); playClickSound("light"); }}
                              accessibilityRole="button"
                              accessibilityLabel={i === 0 ? L("المبلغ بالضبط", "Passend", "Exact amount") : formatMoney(v)}
                            >
                              <Text style={[styles.cashChipText, active && { color: Colors.accent }]} numberOfLines={1}>
                                {i === 0 ? L("بالضبط", "Passend", "Exact") : formatAmount(v, isZeroDecimalCurrency(currency) ? 0 : (Number.isInteger(v) ? 0 : 2))}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    )}
                    {cashReceived.trim() !== "" && (
                      !Number.isFinite(given) ? (
                        <Text style={[styles.changeText, { color: Colors.danger }]}>
                          {L("المبلغ غير صالح", "Ungültiger Betrag", "Invalid amount")}
                        </Text>
                      ) : (
                        <View style={[
                          styles.changeBox,
                          flipRow && { flexDirection: "row-reverse" },
                          diff >= 0
                            ? { borderColor: Colors.success, backgroundColor: Colors.success + "14" }
                            : { borderColor: Colors.danger, backgroundColor: Colors.danger + "14" },
                        ]}>
                          <Text style={[styles.changeBoxLabel, { color: diff >= 0 ? Colors.success : Colors.danger }]}>
                            {diff >= 0 ? t("change") : L("المبلغ ناقص", "Es fehlen", "Short by")}
                          </Text>
                          <Text style={[styles.changeBoxValue, { color: diff >= 0 ? Colors.success : Colors.danger }]}>
                            {formatMoney(Math.abs(diff))}
                          </Text>
                        </View>
                      )
                    )}
                  </View>
                );
              })()}

              {paymentMethod === "credit" && selectedTrader && (
                <View style={[styles.payNotice, creditLimitExceeded && { borderColor: Colors.danger }]}>
                  <View style={[{ flexDirection: flipRow ? "row-reverse" : "row", alignItems: "center", gap: 8 }]}>
                    <Ionicons name="document-text-outline" size={18} color={creditLimitExceeded ? Colors.danger : Colors.accent} />
                    <Text style={[styles.payNoticeTitle, rtlTextAlign]}>
                      {L("بيع آجل على حساب التاجر", "Verkauf auf Rechnung des Händlers", "Sale on the trader's account")}
                    </Text>
                  </View>
                  <Text style={[styles.payNoticeText, rtlTextAlign]}>
                    {L("الرصيد الحالي", "Aktueller Saldo", "Current balance")}: {formatMoney(selectedTrader.balance)}
                    {"\n"}
                    {L("الرصيد بعد البيع", "Saldo nach Verkauf", "Balance after sale")}: {formatMoney(creditBalanceAfterSale)}
                    {selectedTrader.creditLimit != null
                      ? `\n${L("سقف الدين", "Kreditlimit", "Credit limit")}: ${formatMoney(selectedTrader.creditLimit)}`
                      : ""}
                  </Text>
                  {creditLimitExceeded && (
                    <Text style={[styles.payNoticeText, { color: Colors.danger, fontWeight: "700" }, rtlTextAlign]}>
                      {L("هذا البيع يتجاوز سقف الدين المسموح لهذا التاجر.", "Dieser Verkauf überschreitet das Kreditlimit des Händlers.", "This sale exceeds the trader's credit limit.")}
                    </Text>
                  )}
                </View>
              )}

              {isStripeMethod(paymentMethod) && stripeReady && (
                <View style={styles.payNotice}>
                  <View style={[{ flexDirection: flipRow ? "row-reverse" : "row", alignItems: "center", gap: 8 }]}>
                    <Ionicons name="qr-code-outline" size={18} color={Colors.accent} />
                    <Text style={[styles.payNoticeTitle, rtlTextAlign]}>{t("payOnCustomerPhone")}</Text>
                  </View>
                  <Text style={[styles.payNoticeText, rtlTextAlign]}>{t("payOnCustomerPhoneHint")}</Text>
                  {stripeMethods.length > 0 && (
                    <Text style={[styles.payNoticeMethods, rtlTextAlign]}>{stripeMethods.join(" · ")}</Text>
                  )}
                </View>
              )}

              <Text style={[styles.sectionLabel, rtlTextAlign]}>{t("orderSummary")}</Text>
              {cart.items.map((item) => (
                <View key={String(item.id)} style={[styles.checkoutItem, flipRow && { flexDirection: "row-reverse" }]}>
                  <Text style={[styles.checkoutItemName, rtlTextAlign, { flex: 1 }]}>{item.name} ×{item.quantity}</Text>
                  <Text style={styles.checkoutItemTotal}>{formatMoney(item.price * item.quantity)}</Text>
                </View>
              ))}
              {cart.discount > 0 && (
                <View style={[styles.checkoutItem, flipRow && { flexDirection: "row-reverse" }]}>
                  <Text style={[styles.checkoutItemName, { color: Colors.success, flex: 1 }, rtlTextAlign]}>{t("discount")}</Text>
                  <Text style={[styles.checkoutItemTotal, { color: Colors.success }]}>-{formatMoney(cart.discount)}</Text>
                </View>
              )}
              {cart.tax > 0 && (
                <View style={[styles.checkoutItem, flipRow && { flexDirection: "row-reverse" }]}>
                  <Text style={[styles.checkoutItemName, { flex: 1 }, rtlTextAlign]}>{t("tax")} ({cart.taxRate}%)</Text>
                  <Text style={styles.checkoutItemTotal}>{formatMoney(cart.tax)}</Text>
                </View>
              )}
              {cart.serviceFee > 0 && (
                <View style={[styles.checkoutItem, flipRow && { flexDirection: "row-reverse" }]}>
                  <Text style={[styles.checkoutItemName, { flex: 1 }, rtlTextAlign]}>{t("serviceTax" as any) || L("رسوم الخدمة", "Servicegebühr", "Service fee")}</Text>
                  <Text style={styles.checkoutItemTotal}>{formatMoney(cart.serviceFee)}</Text>
                </View>
              )}
              {cart.minimumOrderSurcharge > 0 && (
                <View style={[styles.checkoutItem, flipRow && { flexDirection: "row-reverse" }]}>
                  <Text style={[styles.checkoutItemName, { flex: 1, color: Colors.warning }, rtlTextAlign]}>{L("حد أدنى للطلب", "Mindestbestellwert", "Minimum order")}</Text>
                  <Text style={[styles.checkoutItemTotal, { color: Colors.warning }]}>+{formatMoney(cart.minimumOrderSurcharge)}</Text>
                </View>
              )}
              {cart.deliveryFee > 0 && (
                <View style={[styles.checkoutItem, flipRow && { flexDirection: "row-reverse" }]}>
                  <Text style={[styles.checkoutItemName, { flex: 1 }, rtlTextAlign]}>{L("رسوم التوصيل", "Liefergebühr", "Delivery fee")}</Text>
                  <Text style={styles.checkoutItemTotal}>{formatMoney(cart.deliveryFee)}</Text>
                </View>
              )}
              {manualAdjustment !== 0 && (
                <View style={[styles.checkoutItem, flipRow && { flexDirection: "row-reverse" }]}>
                  <Text style={[styles.checkoutItemName, { flex: 1 }, rtlTextAlign]}>{L("تعديل المبلغ", "Anpassung", "Adjustment")}</Text>
                  <Text style={styles.checkoutItemTotal}>{manualAdjustment > 0 ? "+" : ""}{formatMoney(manualAdjustment)}</Text>
                </View>
              )}
              {/* Vehicle picker — only when the store has registered vehicles */}
              {(vehicles as any[]).length > 0 && (
                <View style={{ marginTop: 8, marginBottom: 8, borderRadius: 10, borderWidth: 1, borderColor: Colors.cardBorder, padding: 8, backgroundColor: Colors.surfaceLight }}>
                  <View style={{ flexDirection: flipRow ? "row-reverse" : "row", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    <Ionicons name="car-outline" size={15} color={Colors.accent} />
                    <Text style={{ color: Colors.text, fontSize: 12, fontWeight: "600" }}>
                      {L("مركبة التوصيل (اختياري)", "Fahrzeug (optional)", "Delivery vehicle (optional)")}
                    </Text>
                  </View>
                  {(vehicles as any[]).length === 0 ? (
                    <Text style={{ color: Colors.textMuted, fontSize: 11, textAlign: "center", paddingVertical: 4 }}>
                      {language === "ar" ? "لا توجد مركبات مسجلة" : language === "de" ? "Kein Fahrzeug registriert" : "No vehicles registered"}
                    </Text>
                  ) : (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={{ flexDirection: "row", gap: 6 }}>
                        <Pressable
                          onPress={() => cart.setVehicleId(null)}
                          style={{
                            paddingHorizontal: 12, minHeight: 44, borderRadius: 8, borderWidth: 1.5,
                            borderColor: !cart.vehicleId ? Colors.accent : Colors.cardBorder,
                            backgroundColor: !cart.vehicleId ? Colors.accent + "20" : Colors.surface,
                            alignItems: "center", justifyContent: "center",
                          }}
                        >
                          <Text style={{ color: !cart.vehicleId ? Colors.accent : Colors.textMuted, fontSize: 11, fontWeight: "600" }}>
                            {L("بدون", "Keins", "None")}
                          </Text>
                        </Pressable>
                        {(vehicles as any[]).map((v: any) => {
                          const isSelected = cart.vehicleId === v.id;
                          return (
                            <Pressable
                              key={v.id}
                              onPress={() => cart.setVehicleId(isSelected ? null : v.id)}
                              style={{
                                paddingHorizontal: 10, paddingVertical: 6, minHeight: 44, justifyContent: "center", borderRadius: 8, borderWidth: 1.5,
                                borderColor: isSelected ? Colors.accent : Colors.cardBorder,
                                backgroundColor: isSelected ? Colors.accent + "20" : Colors.surface,
                                minWidth: 90,
                              }}
                            >
                              <View style={{ flexDirection: "row", alignItems: "center", gap: 3, marginBottom: 1 }}>
                                <Ionicons name="car-outline" size={13} color={Colors.textSecondary} />
                                <Text style={{ color: isSelected ? Colors.accent : Colors.text, fontSize: 10, fontWeight: "700" }} numberOfLines={1}>
                                  {v.licensePlate}
                                </Text>
                              </View>
                              <Text style={{ color: Colors.textMuted, fontSize: 9 }} numberOfLines={1}>{v.driverName || `${v.make} ${v.model}`}</Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </ScrollView>
                  )}
                </View>
              )}

              {/* Delivery fee stepper — step follows the currency (0.50 CHF, 50 SYP) */}
              <View style={[{ flexDirection: flipRow ? "row-reverse" : "row", alignItems: "center", justifyContent: "space-between", backgroundColor: Colors.surfaceLight, borderRadius: 12, padding: 10, marginTop: 8, marginBottom: 8, borderWidth: 1, borderColor: Colors.cardBorder }]}>
                <View style={[{ flexDirection: flipRow ? "row-reverse" : "row", alignItems: "center", gap: 6, flexShrink: 1 }]}>
                  <Ionicons name="bicycle-outline" size={16} color={Colors.info} />
                  <Text style={[{ color: Colors.text, fontSize: 13, fontWeight: "600", flexShrink: 1 }, rtlTextAlign]}>
                    {t("adjustDeliveryFee" as any) || L("رسوم التوصيل", "Liefergebühr", "Delivery fee")}
                  </Text>
                </View>
                <View style={{ flexDirection: flipRow ? "row-reverse" : "row", alignItems: "center", gap: 8 }}>
                  <Pressable
                    onPress={() => cart.setDeliveryFee(Math.max(0, roundMoney(cart.deliveryFee - feeStep, currency)))}
                    disabled={cart.deliveryFee <= 0}
                    style={[styles.adjustBtn, { borderColor: Colors.danger, backgroundColor: Colors.danger + "14" }, cart.deliveryFee <= 0 && { opacity: 0.4 }]}
                    accessibilityRole="button"
                    accessibilityLabel={`${L("إنقاص", "Verringern um", "Decrease by")} ${formatMoney(feeStep)}`}
                  >
                    <Ionicons name="remove" size={16} color={Colors.danger} />
                  </Pressable>
                  <Text style={[styles.adjustValue, { color: Colors.accent, fontSize: 14 }]}>
                    {formatMoney(cart.deliveryFee)}
                  </Text>
                  <Pressable
                    onPress={() => cart.setDeliveryFee(roundMoney(cart.deliveryFee + feeStep, currency))}
                    style={[styles.adjustBtn, { borderColor: Colors.success, backgroundColor: Colors.success + "14" }]}
                    accessibilityRole="button"
                    accessibilityLabel={`${L("زيادة", "Erhöhen um", "Increase by")} ${formatMoney(feeStep)}`}
                  >
                    <Ionicons name="add" size={16} color={Colors.success} />
                  </Pressable>
                </View>
              </View>

              <Pressable
                style={[styles.completeBtn, checkoutBusy && { opacity: 0.5 }]}
                accessibilityRole="button"
                accessibilityState={{ disabled: checkoutBusy, busy: checkoutBusy }}
                onPress={() => {
                  if (checkoutBusy) return;
                  const validationError = validateBeforeComplete();
                  if (validationError) {
                    showAlert(t("error"), validationError);
                    return;
                  }
                  if (paymentMethod === "credit" && creditLimitExceeded) {
                    showAlert(t("error"), L("هذا البيع يتجاوز سقف الدين المسموح لهذا التاجر.", "Dieser Verkauf überschreitet das Kreditlimit des Händlers.", "This sale exceeds the trader's credit limit."));
                    return;
                  }
                  if (paymentMethod === "shamcash") {
                    setShamCashOpen(true);
                    return;
                  }
                  // Two taps inside one frame both pass `checkoutBusy` (state
                  // updates are async); the ref lock is synchronous.
                  if (submitLock.current) return;
                  submitLock.current = true;
                  const release = { onSettled: () => { submitLock.current = false; } };
                  if (isStripeMethod(paymentMethod)) {
                    setStripeError("");
                    setStripeStage("creating");
                    stripeCaptureMutation.mutate(undefined, release);
                  } else {
                    saleMutation.mutate(undefined, release);
                  }
                }}
                disabled={checkoutBusy}
              >
                <LinearGradient colors={[Colors.success, "#047857"]} style={[styles.completeBtnGradient, flipRow && { flexDirection: "row-reverse" }]}>
                  {checkoutBusy
                    ? <ActivityIndicator size="small" color={Colors.white} />
                    : <Ionicons name={isStripeMethod(paymentMethod) || paymentMethod === "shamcash" ? "qr-code-outline" : "checkmark-circle"} size={22} color={Colors.white} />}
                  <Text style={styles.completeBtnText}>
                    {checkoutBusy
                      ? t("processing")
                      : isStripeMethod(paymentMethod) || paymentMethod === "shamcash" ? t("requestPayment") : t("completeSale")}
                  </Text>
                </LinearGradient>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Card / TWINT / wallet capture ──────────────────────────────────────
          The customer pays on their own phone via Stripe-hosted Checkout. The
          till shows the link as a QR and waits for the webhook; it never marks
          the sale paid itself. */}
      <Modal
        visible={stripeStage !== "idle"}
        animationType="fade"
        transparent
        onRequestClose={() => {
          if ((stripeStage === "waiting" || stripeStage === "failed") && !switchStripeSaleToCash.isPending) dismissStripeCapture();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.payModal}>
            <View style={[styles.modalHeader, flipRow && { flexDirection: "row-reverse" }]}>
              <Text style={[styles.modalTitle, rtlTextAlign]}>
                {stripeStage === "paid" ? t("paymentSuccess") : t("awaitingPayment")}
              </Text>
              {(stripeStage === "waiting" || stripeStage === "failed") && (
                <Pressable
                  onPress={dismissStripeCapture}
                  disabled={switchStripeSaleToCash.isPending}
                  style={styles.modalCloseBtn}
                  accessibilityRole="button"
                  accessibilityLabel={L("إغلاق", "Schliessen", "Close")}
                >
                  <Ionicons name="close" size={22} color={Colors.text} />
                </Pressable>
              )}
            </View>

            {stripeStage === "creating" && (
              <View style={styles.payCentre}>
                <ActivityIndicator size="large" color={Colors.accent} />
                <Text style={[styles.payNoticeText, { textAlign: "center" }]}>{t("creatingPaymentLink")}</Text>
              </View>
            )}

            {stripeStage === "waiting" && !!stripeCapture?.checkoutUrl && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.modalTotal}>
                  {formatMoney(stripeCapture.amountMinor / 100)}
                </Text>

                <View style={styles.payCentre}>
                  <PaymentQrCode value={stripeCapture.checkoutUrl} size={220} />
                  <Text style={[styles.payNoticeText, { textAlign: "center" }]}>{t("scanToPay")}</Text>
                </View>

                <Pressable style={styles.payLinkBtn} onPress={openCheckoutLink}>
                  <Ionicons name="open-outline" size={18} color={Colors.accent} />
                  <Text style={styles.payLinkBtnText} numberOfLines={1}>{t("openPaymentLink")}</Text>
                </Pressable>

                <View style={[styles.payWaitRow, flipRow && { flexDirection: "row-reverse" }]}>
                  <ActivityIndicator size="small" color={Colors.accent} />
                  <Text style={[styles.payNoticeText, { flex: 1 }, rtlTextAlign]}>{t("waitingForPayment")}</Text>
                </View>

                <Pressable
                  style={[styles.payCashBtn, switchStripeSaleToCash.isPending && { opacity: 0.5 }]}
                  onPress={() => { if (!switchStripeSaleToCash.isPending) switchStripeSaleToCash.mutate(); }}
                  disabled={switchStripeSaleToCash.isPending}
                >
                  <Ionicons name="cash-outline" size={18} color={Colors.warning} />
                  <Text style={styles.payCashBtnText}>{t("takeCashInstead")}</Text>
                </Pressable>

                <Pressable style={styles.modalCancelBtn} onPress={dismissStripeCapture} disabled={switchStripeSaleToCash.isPending}>
                  <Text style={styles.modalCancelBtnText}>{t("leavePaymentPending")}</Text>
                </Pressable>
              </ScrollView>
            )}

            {stripeStage === "paid" && (
              <View style={styles.payCentre}>
                <Ionicons name="checkmark-circle" size={64} color={Colors.success} />
                <Text style={[styles.payNoticeTitle, { textAlign: "center" }]}>{t("paymentSuccess")}</Text>
              </View>
            )}

            {stripeStage === "failed" && (
              <View style={styles.payCentre}>
                <Ionicons name="alert-circle" size={48} color={Colors.danger} />
                <Text style={[styles.payNoticeText, { textAlign: "center" }]}>{stripeError || t("paymentFailed")}</Text>
                {!!stripeCapture?.checkoutUrl && (
                  <Pressable style={styles.payLinkBtn} onPress={() => { setStripeError(""); setStripeStage("waiting"); }}>
                    <Ionicons name="refresh" size={18} color={Colors.accent} />
                    <Text style={styles.payLinkBtnText}>{t("keepWaiting")}</Text>
                  </Pressable>
                )}
                {!!stripeCapture && (
                  <Pressable
                    style={[styles.payCashBtn, switchStripeSaleToCash.isPending && { opacity: 0.5 }]}
                    onPress={() => { if (!switchStripeSaleToCash.isPending) switchStripeSaleToCash.mutate(); }}
                    disabled={switchStripeSaleToCash.isPending}
                  >
                    <Ionicons name="cash-outline" size={18} color={Colors.warning} />
                    <Text style={styles.payCashBtnText}>{t("takeCashInstead")}</Text>
                  </Pressable>
                )}
                <Pressable style={styles.modalCancelBtn} onPress={dismissStripeCapture} disabled={switchStripeSaleToCash.isPending}>
                  <Text style={styles.modalCancelBtnText}>{stripeCapture ? t("leavePaymentPending") : t("close")}</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </Modal>

      <ShamCashTillModal
        visible={showShamCash}
        amount={payableTotal}
        info={paymentsConfig?.shamcash}
        busy={shamCashMutation.isPending}
        onConfirm={(reference) => {
          if (submitLock.current) return;
          submitLock.current = true;
          shamCashMutation.mutate(reference, { onSettled: () => { submitLock.current = false; } });
        }}
        onCancel={() => setShamCashOpen(false)}
      />

      <Modal visible={showCustomerPicker} animationType="slide" transparent onRequestClose={() => { setShowCustomerPicker(false); setCustomerSearch(""); }}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.modalHeader, flipRow && { flexDirection: "row-reverse" }]}>
              <View style={{ flex: 1, flexDirection: flipRow ? "row-reverse" : "row", alignItems: "baseline", gap: 6 }}>
                <Text style={[styles.modalTitle, rtlTextAlign]}>{t("selectCustomer")}</Text>
                <Text style={{ fontSize: 13, color: Colors.accent, fontWeight: "800", backgroundColor: Colors.accent + "15", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, overflow: "hidden" }}>
                  {totalCustomerCount} {t("total" as any) || L("المجموع", "Total", "Total")}
                </Text>
              </View>
              <Pressable
                onPress={() => { setShowCustomerPicker(false); setCustomerSearch(""); }}
                style={styles.modalCloseBtn}
                accessibilityRole="button"
                accessibilityLabel={L("إغلاق", "Schliessen", "Close")}
              >
                <Ionicons name="close" size={22} color={Colors.text} />
              </Pressable>
            </View>

            <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
              <View style={[styles.searchBox, { height: 44, backgroundColor: Colors.surfaceLight, borderRadius: 12, borderWidth: 1, borderColor: Colors.cardBorder }]}>
                <Ionicons name="search" size={16} color={Colors.textMuted} />
                <TextInput
                  style={[styles.searchInput, { fontSize: 14, color: Colors.text }, rtlTextAlign]}
                  placeholder={t("search" as any) + "..."}
                  placeholderTextColor={Colors.textMuted}
                  value={customerSearch}
                  onChangeText={setCustomerSearch}
                  autoFocus={Platform.OS === "web"}
                />
                {customerSearch ? (
                  <Pressable onPress={() => setCustomerSearch("")} hitSlop={10} accessibilityRole="button" accessibilityLabel={L("مسح البحث", "Suche löschen", "Clear search")}>
                    <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
                  </Pressable>
                ) : null}
              </View>
            </View>

            <Pressable
              style={[styles.walkInBtn, flipRow && { flexDirection: "row-reverse" }, { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.cardBorder, marginHorizontal: 20, marginBottom: 16 }]}
              onPress={() => { cart.setCustomerId(null); setCallerCustomer(null); setPhoneInput(""); setShowCustomerPicker(false); setCustomerSearch(""); }}
              accessibilityRole="button"
            >
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.textSecondary + "15", justifyContent: "center", alignItems: "center", marginEnd: 12 }}>
                <Ionicons name="person-outline" size={18} color={Colors.textSecondary} />
              </View>
              <Text style={[styles.walkInText, rtlTextAlign, { fontSize: 15, fontWeight: "600", color: Colors.textSecondary }]}>{t("walkIn")}</Text>
            </Pressable>
            <FlatList
              data={customers}
              keyExtractor={(item: any) => String(item.id)}
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }: { item: any }) => {
                const active = cart.customerId === item.id;
                return (
                  <Pressable
                    style={[styles.customerCard, active && styles.customerCardActive, flipRow && { flexDirection: "row-reverse" }]}
                    onPress={() => {
                      cart.setCustomerId(item.id);
                      // Keep the chosen customer on screen even after the list
                      // (a search result page) changes underneath.
                      setCallerCustomer(item);
                      setPhoneInput(item.phone || "");
                      setShowCustomerPicker(false);
                      setCustomerSearch("");
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                  >
                    <View style={[styles.customerAvatar, { backgroundColor: active ? Colors.accent : Colors.primary + "15" }]}>
                      <Text style={[styles.customerAvatarText, { color: active ? Colors.textDark : Colors.primary }]}>{(item.name || "?").charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={styles.customerCardInfo}>
                      <Text style={[styles.customerCardName, rtlTextAlign]} numberOfLines={1}>{item.name}</Text>
                      <Text style={[styles.customerCardMeta, rtlTextAlign]} numberOfLines={1}>{item.phone || item.email || t("noContact")}</Text>
                    </View>
                    <View style={[styles.customerLoyalty, flipRow && { flexDirection: "row-reverse" }, { backgroundColor: Colors.warning + "15", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 }]}>
                      <Ionicons name="star" size={12} color={Colors.warning} />
                      <Text style={[styles.customerLoyaltyText, { fontWeight: "700" }]}>{item.loyaltyPoints || 0}</Text>
                    </View>
                    {active && <Ionicons name="checkmark-circle" size={20} color={Colors.accent} style={{ marginStart: 8 }} />}
                  </Pressable>
                );
              }}
              ListEmptyComponent={
                <View style={{ alignItems: "center", paddingVertical: 32, gap: 10 }}>
                  <Ionicons name="people-outline" size={40} color={Colors.textMuted} />
                  <Text style={{ color: Colors.textMuted, fontSize: 14, fontWeight: "600", textAlign: "center" }}>
                    {customerSearch.trim()
                      ? L("لا يوجد عميل مطابق", "Kein passender Kunde", "No matching customer")
                      : L("لا يوجد عملاء بعد", "Noch keine Kunden", "No customers yet")}
                  </Text>
                  <Pressable
                    onPress={() => {
                      const q = toLatinDigits(customerSearch.trim());
                      const looksLikePhone = /^[+\d\s()-]{5,}$/.test(q);
                      setNewCustomerForm({ name: looksLikePhone ? "" : customerSearch.trim(), phone: looksLikePhone ? q : "", address: "", email: "" });
                      setShowCustomerPicker(false);
                      setCustomerSearch("");
                      setShowNewCustomerForm(true);
                    }}
                    style={{ flexDirection: flipRow ? "row-reverse" : "row", alignItems: "center", gap: 6, paddingHorizontal: 14, minHeight: 44, borderRadius: 12, backgroundColor: Colors.primary + "15", borderWidth: 1, borderColor: Colors.primary + "40" }}
                    accessibilityRole="button"
                  >
                    <Ionicons name="person-add-outline" size={16} color={Colors.primary} />
                    <Text style={{ color: Colors.primary, fontWeight: "700", fontSize: 14 }}>{L("عميل جديد", "Neuer Kunde", "New customer")}</Text>
                  </Pressable>
                </View>
              }
            />
          </View>
        </View>
      </Modal>

      {/* ── New Customer Form Modal ── */}
      <Modal visible={showNewCustomerForm} animationType="slide" transparent onRequestClose={() => setShowNewCustomerForm(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: 620 }]}>
            <View style={[styles.modalHeader, flipRow && { flexDirection: "row-reverse" }]}>
              <View style={[{ flexDirection: "row", alignItems: "center", gap: 10 }, flipRow && { flexDirection: "row-reverse" }]}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.primary + "33", justifyContent: "center", alignItems: "center" }}>
                  <Ionicons name="person-add" size={20} color={Colors.primary} />
                </View>
                <Text style={[styles.modalTitle, rtlTextAlign]}>
                  {L("عميل جديد", "Neuer Kunde", "New Customer")}
                </Text>
              </View>
              <Pressable
                onPress={() => setShowNewCustomerForm(false)}
                style={styles.modalCloseBtn}
                accessibilityRole="button"
                accessibilityLabel={L("إغلاق", "Schliessen", "Close")}
              >
                <Ionicons name="close" size={22} color={Colors.text} />
              </Pressable>
            </View>

            <ScrollView style={{ paddingHorizontal: 20, paddingBottom: 16 }} keyboardShouldPersistTaps="handled">
              {/* Name */}
              <Text style={[styles.newCustLabel, rtlTextAlign]}>
                {L("الاسم الكامل *", "Vollständiger Name *", "Full Name *")}
              </Text>
              <View style={[styles.newCustInputWrap, flipRow && { flexDirection: "row-reverse" }]}>
                <Ionicons name="person-outline" size={16} color={Colors.textMuted} />
                <TextInput
                  style={[styles.newCustInput, isRTL && { textAlign: "right" }]}
                  placeholder={L("أدخل الاسم", "Name eingeben", "Enter name")}
                  placeholderTextColor={Colors.textMuted}
                  value={newCustomerForm.name}
                  onChangeText={(v) => setNewCustomerForm((f) => ({ ...f, name: v }))}
                />
              </View>

              {/* Phone */}
              <Text style={[styles.newCustLabel, rtlTextAlign]}>
                {L("رقم الهاتف", "Telefon", "Phone Number")}
              </Text>
              <View style={[styles.newCustInputWrap, flipRow && { flexDirection: "row-reverse" }]}>
                <Ionicons name="call-outline" size={16} color={Colors.textMuted} />
                <TextInput
                  style={[styles.newCustInput, isRTL && { textAlign: "right" }]}
                  placeholder={swissStore ? "079 123 45 67" : String(currency).toUpperCase() === "SYP" ? "09XX XXX XXX" : L("رقم الهاتف", "Telefonnummer", "Phone number")}
                  placeholderTextColor={Colors.textMuted}
                  value={newCustomerForm.phone}
                  onChangeText={(v) => setNewCustomerForm((f) => ({ ...f, phone: toLatinDigits(v) }))}
                  keyboardType="phone-pad"
                />
              </View>

              {/* Address (Swiss stores get geo.admin.ch autocomplete) */}
              <Text style={[styles.newCustLabel, rtlTextAlign]}>
                {L("العنوان", "Adresse", "Address")}
              </Text>

              {/* Quick city filter — Swiss address search only */}
              {swissStore && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }} keyboardShouldPersistTaps="handled">
                <View style={{ flexDirection: "row", gap: 5 }}>
                  {["Zürich", "Winterthur", "Bern", "Basel", "Genf", "Luzern", "Zug", "St. Gallen"].map((c) => (
                    <Pressable
                      key={c}
                      onPress={() => setNcCityFilter(c)}
                      style={[
                        { paddingHorizontal: 12, minHeight: 32, justifyContent: "center", borderRadius: 16, borderWidth: 1 },
                        ncCityFilter === c
                          ? { backgroundColor: Colors.accent, borderColor: Colors.accent }
                          : { backgroundColor: Colors.surfaceLight, borderColor: Colors.cardBorder },
                      ]}
                    >
                      <Text style={{ fontSize: 11, fontWeight: "600", color: ncCityFilter === c ? Colors.textDark : Colors.text }}>{c}</Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
              )}

              <View style={[styles.newCustInputWrap, flipRow && { flexDirection: "row-reverse" }]}>
                <Ionicons name="location-outline" size={16} color={Colors.textMuted} />
                <TextInput
                  style={[styles.newCustInput, isRTL && { textAlign: "right" }, { flex: 1 }]}
                  placeholder={swissStore ? L("اكتب اسم الشارع…", "Strasse tippen…", "Type street name…") : L("المنطقة، الشارع، البناء…", "Strasse, Hausnummer, Ort…", "Area, street, building…")}
                  placeholderTextColor={Colors.textMuted}
                  value={newCustomerForm.address}
                  onChangeText={handleNcAddressChange}
                  onBlur={() => setTimeout(() => setNcShowSuggestions(false), 200)}
                />
                {ncAddrSearching && <ActivityIndicator size="small" color={Colors.accent} style={{ marginStart: 6 }} />}
              </View>

              {/* Suggestions */}
              {ncShowSuggestions && ncAddrSuggestions.length > 0 && (
                <View style={{
                  backgroundColor: Colors.surfaceLight,
                  borderWidth: 1,
                  borderColor: Colors.accent + "50",
                  borderRadius: 8,
                  marginTop: 2,
                  marginBottom: 8,
                  maxHeight: 200,
                  overflow: "hidden",
                }}>
                  <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                    {ncAddrSuggestions.map((s, i) => (
                      <Pressable
                        key={i}
                        onPress={() => selectNcAddress(s.label)}
                        style={({ pressed }) => [
                          { padding: 10, flexDirection: "row", alignItems: "center", gap: 8 },
                          i < ncAddrSuggestions.length - 1 && { borderBottomWidth: 1, borderBottomColor: Colors.cardBorder },
                          pressed && { backgroundColor: Colors.accent + "25" },
                        ]}
                      >
                        <Ionicons name="location-outline" size={13} color={Colors.accent} />
                        <Text style={{ color: Colors.text, fontSize: 12, flex: 1 }} numberOfLines={1}>
                          {s.label.replace(/<[^>]+>/g, "")}
                        </Text>
                      </Pressable>
                    ))}
                    <Pressable onPress={() => setNcShowSuggestions(false)} style={{ padding: 7, alignItems: "center", borderTopWidth: 1, borderTopColor: Colors.cardBorder }}>
                      <Text style={{ color: Colors.textMuted, fontSize: 11 }}>{L("إغلاق", "Schliessen", "Close")}</Text>
                    </Pressable>
                  </ScrollView>
                </View>
              )}

              {/* Email */}
              <Text style={[styles.newCustLabel, rtlTextAlign]}>
                {L("البريد الإلكتروني", "E-Mail", "Email")}
              </Text>
              <View style={[styles.newCustInputWrap, flipRow && { flexDirection: "row-reverse" }]}>
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
                style={{ opacity: !newCustomerForm.name.trim() || customerPhoneLoading ? 0.5 : 1 }}
                accessibilityRole="button"
              >
                <LinearGradient
                  colors={[Colors.primary, Colors.secondary]}
                  style={styles.newCustSaveBtn}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                >
                  {customerPhoneLoading
                    ? <ActivityIndicator size="small" color={Colors.white} />
                    : <Ionicons name="checkmark" size={18} color={Colors.white} />}
                  <Text style={styles.newCustSaveBtnText}>
                    {customerPhoneLoading
                      ? L("جاري الحفظ…", "Speichern…", "Saving…")
                      : L("حفظ وربط", "Speichern & Verknüpfen", "Save & Link")}
                  </Text>
                </LinearGradient>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Order Notes Modal ── */}
      <Modal visible={showOrderNotes} animationType="slide" transparent onRequestClose={() => setShowOrderNotes(false)}>
        <View style={styles.modalOverlay}>
          <View style={{ backgroundColor: Colors.surface, borderRadius: 24, width: "92%", maxWidth: 440, overflow: "hidden", borderWidth: 1, borderColor: Colors.cardBorder }}>
            {/* Header with gradient strip */}
            <LinearGradient colors={[Colors.accent + "22", Colors.surface]} style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 }}>
              <View style={{ flexDirection: flipRow ? "row-reverse" : "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                <View style={{ flexDirection: flipRow ? "row-reverse" : "row", alignItems: "center", gap: 10 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.accent + "22", justifyContent: "center", alignItems: "center" }}>
                    <Ionicons name="document-text-outline" size={20} color={Colors.accent} />
                  </View>
                  <View style={{ flexShrink: 1 }}>
                    <Text style={[{ color: Colors.text, fontSize: 17, fontWeight: "800" }, rtlTextAlign]}>
                      {L("ملاحظات الطلب", "Bestellnotiz", "Order Notes")}
                    </Text>
                    <Text style={[{ color: Colors.textMuted, fontSize: 12, marginTop: 1 }, rtlTextAlign]}>
                      {L("تعليمات خاصة للطلب", "Besondere Anweisungen", "Special instructions for this order")}
                    </Text>
                  </View>
                </View>
                <Pressable
                  onPress={() => setShowOrderNotes(false)}
                  style={styles.modalCloseBtn}
                  accessibilityRole="button"
                  accessibilityLabel={L("إغلاق", "Schliessen", "Close")}
                >
                  <Ionicons name="close" size={18} color={Colors.textSecondary} />
                </Pressable>
              </View>
            </LinearGradient>

            {/* Body */}
            <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
              <View style={{ backgroundColor: Colors.surfaceLight, borderRadius: 14, borderWidth: 1, borderColor: Colors.inputBorder, overflow: "hidden", marginBottom: 14 }}>
                <TextInput
                  style={[{ color: Colors.text, fontSize: 15, padding: 14, minHeight: 110, textAlignVertical: "top" }, rtlTextAlign]}
                  multiline
                  value={orderNotes}
                  onChangeText={setOrderNotes}
                  placeholder={L("مثال: بدون بصل، اتصل عند الوصول…", "z.B.: ohne Zwiebeln, bei Ankunft anrufen…", "e.g.: no onions, ring doorbell twice…")}
                  placeholderTextColor={Colors.textMuted}
                  autoFocus
                />
                {orderNotes.length > 0 && (
                  <View style={{ flexDirection: "row", justifyContent: "flex-end", paddingHorizontal: 12, paddingBottom: 8 }}>
                    <Text style={{ color: Colors.textMuted, fontSize: 11 }}>{orderNotes.length} {L("حرف", "Zeichen", "chars")}</Text>
                  </View>
                )}
              </View>

              <View style={{ flexDirection: flipRow ? "row-reverse" : "row", gap: 10 }}>
                {orderNotes.trim() !== "" && (
                  <Pressable
                    style={{ flex: 1, paddingVertical: 13, borderRadius: 14, borderWidth: 1.5, borderColor: Colors.danger + "60", alignItems: "center", backgroundColor: Colors.danger + "10" }}
                    onPress={() => { setOrderNotes(""); setShowOrderNotes(false); }}
                  >
                    <Text style={{ color: Colors.danger, fontSize: 15, fontWeight: "700" }}>
                      {L("مسح", "Löschen", "Clear")}
                    </Text>
                  </Pressable>
                )}
                <Pressable
                  style={{ flex: 2, borderRadius: 14, overflow: "hidden" }}
                  onPress={() => setShowOrderNotes(false)}
                >
                  <LinearGradient
                    colors={[Colors.accent, Colors.gradientMid]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={{ paddingVertical: 14, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 7 }}
                  >
                    <Ionicons name="checkmark-circle" size={18} color={Colors.textDark} />
                    <Text style={{ color: Colors.textDark, fontSize: 16, fontWeight: "800" }}>
                      {L("حفظ الملاحظة", "Speichern", "Save Note")}
                    </Text>
                  </LinearGradient>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showDiscountModal} animationType="fade" transparent onRequestClose={() => setShowDiscountModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.modalHeader, flipRow && { flexDirection: "row-reverse" }]}>
              <Text style={[styles.modalTitle, rtlTextAlign]}>{t("applyDiscount")}</Text>
              <Pressable
                onPress={() => setShowDiscountModal(false)}
                style={styles.modalCloseBtn}
                accessibilityRole="button"
                accessibilityLabel={L("إغلاق", "Schliessen", "Close")}
              >
                <Ionicons name="close" size={22} color={Colors.text} />
              </Pressable>
            </View>
            {cart.discount > 0 && (
              <Text style={[{ color: Colors.success, fontSize: 13, fontWeight: "700", marginBottom: 12 }, rtlTextAlign]}>
                {L("الخصم الحالي", "Aktueller Rabatt", "Current discount")}: -{formatMoney(cart.discount)}
              </Text>
            )}
            <View style={[styles.discountTypeRow, flipRow && { flexDirection: "row-reverse" }]}>
              <Pressable style={[styles.discountTypeBtn, discountType === "fixed" && styles.discountTypeBtnActive]} onPress={() => setDiscountType("fixed")}>
                <Text style={[styles.discountTypeBtnText, discountType === "fixed" && { color: Colors.textDark }]}>{t("fixedAmount")} ({currencyLabel()})</Text>
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
              keyboardType={discountType === "fixed" && isZeroDecimalCurrency(currency) ? "number-pad" : "decimal-pad"}
              onSubmitEditing={applyDiscount}
              returnKeyType="done"
            />
            {isCashier && (
              <Text style={{ color: Colors.warning, fontSize: 12, marginTop: 6, textAlign: "center" }}>
                {t("maxDiscountWarning")}
              </Text>
            )}
            <View style={{ flexDirection: flipRow ? "row-reverse" : "row", gap: 10, marginTop: 16 }}>
              <Pressable
                style={[styles.completeBtn, { flex: 1 }, cart.discount <= 0 && { opacity: 0.5 }]}
                disabled={cart.discount <= 0}
                onPress={() => { cart.setDiscount(0); if (loyaltyRedeem) setLoyaltyRedeem(null); setShowDiscountModal(false); }}
                accessibilityRole="button"
              >
                <View style={[styles.completeBtnGradient, { backgroundColor: Colors.surfaceLight, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: 14 }]}>
                  <Text style={[styles.completeBtnText, { color: Colors.text }]}>{t("removeDiscount")}</Text>
                </View>
              </Pressable>
              <Pressable style={[styles.completeBtn, { flex: 1 }]} onPress={applyDiscount} accessibilityRole="button">
                <LinearGradient colors={[Colors.success, "#047857"]} style={styles.completeBtnGradient}>
                  <Text style={styles.completeBtnText}>{t("apply")}</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showInvoiceHistory} animationType="slide" transparent onRequestClose={() => { setShowInvoiceHistory(false); setInvoiceSearch(""); }}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: "85%" }]}>
            <View style={[styles.modalHeader, flipRow && { flexDirection: "row-reverse" }]}>
              <Text style={[styles.modalTitle, rtlTextAlign]}>{t("previousInvoices")}</Text>
              <Pressable
                onPress={() => { setShowInvoiceHistory(false); setInvoiceSearch(""); }}
                style={styles.modalCloseBtn}
                accessibilityRole="button"
                accessibilityLabel={L("إغلاق", "Schliessen", "Close")}
              >
                <Ionicons name="close" size={22} color={Colors.text} />
              </Pressable>
            </View>

            {/* Search bar */}
            <View style={{ flexDirection: flipRow ? "row-reverse" : "row", alignItems: "center", gap: 8, backgroundColor: Colors.surfaceLight, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 10, borderWidth: 1, borderColor: Colors.cardBorder }}>
              <Ionicons name="search" size={16} color={Colors.textMuted} />
              <TextInput
                style={[{ flex: 1, color: Colors.text, fontSize: 14, minHeight: 28 }, rtlTextAlign]}
                placeholder={L("بحث برقم الفاتورة أو اسم العميل…", "Suche nach Rechnungsnr. oder Kundenname…", "Search by invoice # or customer name…")}
                placeholderTextColor={Colors.textMuted}
                value={invoiceSearch}
                onChangeText={setInvoiceSearch}
                autoCapitalize="none"
              />
              {invoiceSearch.length > 0 && (
                <Pressable onPress={() => setInvoiceSearch("")} hitSlop={10} accessibilityRole="button" accessibilityLabel={L("مسح البحث", "Suche löschen", "Clear search")}>
                  <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
                </Pressable>
              )}
            </View>

            {/* 24h filter toggle — hidden when searching */}
            {invoiceSearch.length === 0 && (
              <View style={{ flexDirection: flipRow ? "row-reverse" : "row", gap: 8, paddingHorizontal: 4, paddingBottom: 10 }}>
                <Pressable
                  onPress={() => setInvoiceFilter24h(true)}
                  style={{ flex: 1, minHeight: 40, justifyContent: "center", borderRadius: 10, backgroundColor: invoiceFilter24h ? Colors.accent : Colors.surfaceLight, alignItems: "center", borderWidth: 1, borderColor: invoiceFilter24h ? Colors.accent : Colors.cardBorder }}
                >
                  <Text style={{ color: invoiceFilter24h ? Colors.textDark : Colors.textSecondary, fontSize: 12, fontWeight: "700" }}>
                    {t("last24Hours" as any)}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setInvoiceFilter24h(false)}
                  style={{ flex: 1, minHeight: 40, justifyContent: "center", borderRadius: 10, backgroundColor: !invoiceFilter24h ? Colors.accent : Colors.surfaceLight, alignItems: "center", borderWidth: 1, borderColor: !invoiceFilter24h ? Colors.accent : Colors.cardBorder }}
                >
                  <Text style={{ color: !invoiceFilter24h ? Colors.textDark : Colors.textSecondary, fontSize: 12, fontWeight: "700" }}>
                    {t("allInvoices" as any)}
                  </Text>
                </Pressable>
              </View>
            )}

            <FlatList
              data={salesHistory.filter((s: any) => {
                const q = toLatinDigits(invoiceSearch).trim().toLowerCase();
                if (q) {
                  const receiptNum = String(s.receiptNumber || s.id || "").toLowerCase();
                  const custName = String(s.customerName || s.customer?.name || "").toLowerCase();
                  const custId = String(s.customerId || "").toLowerCase();
                  return receiptNum.includes(q) || custName.includes(q) || custId.includes(q);
                }
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
                      flexDirection: flipRow ? "row-reverse" : "row",
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
                      backgroundColor: Colors.accent + "1F",
                      justifyContent: "center", alignItems: "center",
                      marginEnd: 12,
                    }}>
                      <Ionicons name="receipt" size={20} color={Colors.accent} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[{ color: Colors.text, fontSize: 14, fontWeight: "700" }, rtlTextAlign]}>
                        {getDisplayNumber(item.receiptNumber) || `#${item.id} `}
                      </Text>
                      <Text style={[{ color: Colors.textMuted, fontSize: 11, marginTop: 2 }, rtlTextAlign]}>
                        {saleDate.toLocaleDateString(dateLocale)} • {saleDate.toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit" })}
                      </Text>
                      {(item.customerName || item.customer?.name) ? (
                        <Text style={[{ color: Colors.accent + "cc", fontSize: 11, marginTop: 1, fontWeight: "600" }, rtlTextAlign]}>
                          <Ionicons name="person" size={10} color={Colors.accent} /> {item.customerName || item.customer?.name}
                        </Text>
                      ) : null}
                      <Text style={[{ color: Colors.textMuted, fontSize: 11, marginTop: 1 }, rtlTextAlign]}>
                        {paymentLabel(item.paymentMethod || "cash")}
                      </Text>
                    </View>
                    <View style={{ alignItems: flipRow ? "flex-start" : "flex-end" }}>
                      <Text style={{ color: Colors.accent, fontSize: 16, fontWeight: "800" }}>
                        {formatMoney(item.totalAmount)}
                      </Text>
                      <View style={{ flexDirection: flipRow ? "row-reverse" : "row", alignItems: "center", gap: 4, marginTop: 4 }}>
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

      <Modal visible={showReprintReceipt} animationType="fade" transparent onRequestClose={() => { setShowReprintReceipt(false); setSelectedInvoice(null); setReprintQrDataUrl(null); }}>
        <View style={styles.modalOverlay}>
          <View style={{ backgroundColor: Colors.surface, borderRadius: 16, width: "94%", maxWidth: 380, maxHeight: "90%", overflow: "hidden" }}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedInvoice && (
                <View style={[{ padding: 20, backgroundColor: "#fff" }, Platform.OS === "web" && { direction: isRTL ? "rtl" : "ltr" } as any]}>
                  <Text style={{ textAlign: "center", color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace", letterSpacing: 1 }}>{"=".repeat(36)}</Text>

                  {storeSettings?.logo && (
                    <View style={{ alignItems: "center", marginVertical: 8 }}>
                      <Image source={{ uri: storeSettings.logo.startsWith("http") || storeSettings.logo.startsWith("file://") || storeSettings.logo.startsWith("data:") ? storeSettings.logo : `${getApiUrl().replace(/\/$/, "")}${storeSettings.logo}` }} style={{ width: 150, height: 50, resizeMode: "contain" }} />
                    </View>
                  )}

                  <Text style={{ color: "#000", fontSize: 18, fontWeight: "900", textAlign: "center", textTransform: "uppercase", fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>{L("فاتورة", "RECHNUNG", "RECEIPT")}</Text>
                  <Text style={{ color: "#000", fontSize: 14, fontWeight: "700", textAlign: "center", fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>{storeSettings?.name || tenant?.name || "Kassenta POS"}</Text>

                  {storeSettings?.address && <Text style={{ color: "#000", fontSize: 11, textAlign: "center", fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>{storeSettings.address}</Text>}
                  {storeSettings?.phone && <Text style={{ color: "#000", fontSize: 11, textAlign: "center", fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>{storeSettings.phone}</Text>}

                  <Text style={{ textAlign: "center", color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace", marginTop: 4, letterSpacing: 1 }}>{"─".repeat(36)}</Text>

                  <View style={{ marginVertical: 4 }}>
                    <Text style={{ color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>{t("receiptDate")}: {new Date(selectedInvoice.createdAt || selectedInvoice.date).toLocaleDateString(dateLocale)}, {new Date(selectedInvoice.createdAt || selectedInvoice.date).toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit" })}</Text>
                    <Text style={{ color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>{t("receiptNumber")}: {getDisplayNumber(selectedInvoice.receiptNumber) || `#${selectedInvoice.id}`}</Text>
                    <Text style={{ color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>{t("servedBy")}: {selectedInvoice.employeeName || selectedInvoice.employee?.name || L("الكاشير", "Kassierer", "Cashier")}</Text>
                    {selectedInvoice.customerName ? <Text style={{ color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>{t("customer")}: {selectedInvoice.customerName}</Text> : null}
                  </View>

                  <Text style={{ textAlign: "center", color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace", marginVertical: 4, letterSpacing: 1 }}>{"─".repeat(36)}</Text>

                  <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 }}>
                    <Text style={{ color: "#000", fontSize: 11, fontWeight: "800", flex: 2, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>{L("الصنف", "Artikel", "Item")}</Text>
                    <Text style={{ color: "#000", fontSize: 11, fontWeight: "800", width: 40, textAlign: "center", fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>{L("الكمية", "Menge", "Qty")}</Text>
                    <Text style={{ color: "#000", fontSize: 11, fontWeight: "800", width: 75, textAlign: zeroEndAlign, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>{L("المجموع", "Total", "Total")}</Text>
                  </View>

                  <Text style={{ textAlign: "center", color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace", marginBottom: 4, letterSpacing: 1 }}>{"─".repeat(36)}</Text>

                  <View style={{ marginVertical: 4 }}>
                    {selectedInvoice.items?.map((item: any, idx: number) => (
                      <View key={idx} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 }}>
                        <Text style={{ color: "#000", fontSize: 11, flex: 2, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }} numberOfLines={1}>{item.productName || item.name}</Text>
                        <Text style={{ color: "#000", fontSize: 11, width: 40, textAlign: "center", fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>x{item.quantity}</Text>
                        <Text style={{ color: "#000", fontSize: 11, width: 75, textAlign: zeroEndAlign, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>{formatMoney(item.total || (item.unitPrice * item.quantity))}</Text>
                      </View>
                    ))}
                  </View>

                  <Text style={{ textAlign: "center", color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace", marginVertical: 4, letterSpacing: 1 }}>{"─".repeat(36)}</Text>

                  <View style={{ marginVertical: 4 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 }}>
                      <Text style={{ color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>{t("subtotal")}:</Text>
                      <Text style={{ color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>{formatMoney(selectedInvoice.subtotal || selectedInvoice.totalAmount)}</Text>
                    </View>
                    {Number(selectedInvoice.discount) > 0 && (
                      <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 }}>
                        <Text style={{ color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>{t("discount")}:</Text>
                        <Text style={{ color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>-{formatMoney(selectedInvoice.discount)}</Text>
                      </View>
                    )}
                    {(selectedInvoice.serviceFee || selectedInvoice.serviceFeeAmount || 0) > 0 && (
                      <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 }}>
                        <Text style={{ color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>{t("serviceTax")}:</Text>
                        <Text style={{ color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>{formatMoney(selectedInvoice.serviceFee || selectedInvoice.serviceFeeAmount)}</Text>
                      </View>
                    )}
                    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 }}>
                      <Text style={{ color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>{t("tax")}:</Text>
                      <Text style={{ color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>{formatMoney(selectedInvoice.tax || 0)}</Text>
                    </View>
                    {(selectedInvoice.deliveryFee || 0) > 0 && (
                      <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 }}>
                        <Text style={{ color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>{L("رسوم التوصيل", "Liefergebühr", "Delivery fee")}:</Text>
                        <Text style={{ color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>{formatMoney(selectedInvoice.deliveryFee)}</Text>
                      </View>
                    )}
                    {selectedInvoice?.vehicleId && (() => {
                      const v = (vehicles as any[]).find((x: any) => x.id === selectedInvoice.vehicleId); return v ? (
                        <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 }}>
                          <Text style={{ color: "#555", fontSize: 10, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>{L("السائق", "Fahrer", "Driver")}:</Text>
                          <Text style={{ color: "#555", fontSize: 10, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>{v.driverName || ""}{v.licensePlate ? ` (${v.licensePlate})` : ""}</Text>
                        </View>
                      ) : null;
                    })()}

                    <Text style={{ textAlign: "center", color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace", marginVertical: 4, letterSpacing: 1 }}>{"=".repeat(36)}</Text>

                    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 }}>
                      <Text style={{ color: "#000", fontSize: 15, fontWeight: "900", fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>{L("الإجمالي", "TOTAL", "TOTAL")}:</Text>
                      <Text style={{ color: "#000", fontSize: 15, fontWeight: "900", fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>{formatMoney(selectedInvoice.totalAmount)}</Text>
                    </View>

                    <Text style={{ textAlign: "center", color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace", marginVertical: 4, letterSpacing: 1 }}>{"=".repeat(36)}</Text>

                    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 2, marginTop: 4 }}>
                      <Text style={{ color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>{t("paymentMethod")}:</Text>
                      <Text style={{ color: "#000", fontSize: 11, fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace" }}>{paymentLabel(selectedInvoice.paymentMethod || "cash")}</Text>
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

            <View style={{ flexDirection: flipRow ? "row-reverse" : "row", margin: 12, marginTop: 0, gap: 8 }}>
              <Pressable style={{ flex: 1, borderRadius: 14, overflow: "hidden" }} onPress={printReceipt}>
                <LinearGradient colors={[Colors.info, "#2563EB"]} style={{ flexDirection: flipRow ? "row-reverse" : "row", alignItems: "center", justifyContent: "center", paddingVertical: 14, gap: 8 }}>
                  <Ionicons name="print" size={20} color={Colors.white} />
                  <Text style={{ color: Colors.white, fontSize: 15, fontWeight: "700" }}>{t("printInvoice")}</Text>
                </LinearGradient>
              </Pressable>
              <Pressable style={{ flex: 1, borderRadius: 14, overflow: "hidden" }} onPress={() => { setShowReprintReceipt(false); setSelectedInvoice(null); setReprintQrDataUrl(null); }}>
                <View style={{ backgroundColor: Colors.surfaceLight, flexDirection: flipRow ? "row-reverse" : "row", alignItems: "center", justifyContent: "center", paddingVertical: 14, gap: 8, borderRadius: 14 }}>
                  <Ionicons name="close" size={20} color={Colors.text} />
                  <Text style={{ color: Colors.text, fontSize: 15, fontWeight: "700" }}>{t("close")}</Text>
                </View>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Account Switcher Modal */}
      <Modal visible={showAccountSwitcher} animationType="slide" transparent onRequestClose={() => { if (!switchLoading) { setShowAccountSwitcher(false); setSwitchTarget(null); setSwitchPin(""); setSwitchError(""); } }}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: "85%" }]}>
            <View style={[styles.modalHeader, flipRow && { flexDirection: "row-reverse" }]}>
              <Text style={[styles.modalTitle, rtlTextAlign]}>{t("switchAccount" as any)}</Text>
              <Pressable
                onPress={() => { setShowAccountSwitcher(false); setSwitchTarget(null); setSwitchPin(""); setSwitchError(""); }}
                disabled={switchLoading}
                style={styles.modalCloseBtn}
                accessibilityRole="button"
                accessibilityLabel={L("إغلاق", "Schliessen", "Close")}
              >
                <Ionicons name="close" size={22} color={Colors.text} />
              </Pressable>
            </View>

            {!switchTarget ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                {employee && (
                  <View style={[styles.switchCurrentAccount, flipRow && { flexDirection: "row-reverse" }]}>
                    <LinearGradient colors={[Colors.accent, Colors.gradientStart]} style={styles.switchCurrentAvatar}>
                      <Text style={styles.switchCurrentAvatarText}>{(employee.name || "?").charAt(0).toUpperCase()}</Text>
                    </LinearGradient>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.switchCurrentName, rtlTextAlign]}>{employee.name}</Text>
                      <Text style={[styles.switchCurrentRole, rtlTextAlign]}>{roleLabel(employee.role)}</Text>
                    </View>
                    <View style={styles.switchActiveBadge}>
                      <View style={styles.switchActiveDot} />
                      <Text style={styles.switchActiveText}>{t("active" as any)}</Text>
                    </View>
                  </View>
                )}

                {/* Shift status */}
                {myActiveShift && (
                  <View style={{ flexDirection: flipRow ? "row-reverse" : "row", alignItems: "center", gap: 8, backgroundColor: Colors.success + "15", borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: Colors.success + "40" }}>
                    <Ionicons name="radio-button-on" size={16} color={Colors.success} />
                    <View style={{ flex: 1 }}>
                      <Text style={[{ color: Colors.success, fontSize: 13, fontWeight: "700" }, rtlTextAlign]}>
                        {L("وردية نشطة", "Aktive Schicht", "Active Shift")}
                      </Text>
                      <Text style={[{ color: Colors.textMuted, fontSize: 12 }, rtlTextAlign]}>
                        {L("منذ", "Seit", "Since")} {new Date(myActiveShift.startTime).toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit" })}
                      </Text>
                    </View>
                    <Pressable
                      onPress={async () => {
                        if (endShiftMutation.isPending) return;
                        const ok = await confirmAsync(
                          L("إنهاء الوردية؟", "Schicht beenden?", "End shift?"), "",
                          L("إنهاء الوردية", "Schicht beenden", "End Shift"), t("cancel"), true,
                        );
                        if (ok) endShiftMutation.mutate(myActiveShift.id);
                      }}
                      disabled={endShiftMutation.isPending}
                      style={{ backgroundColor: Colors.danger + "20", paddingHorizontal: 14, minHeight: 40, borderRadius: 10, flexDirection: "row", alignItems: "center", gap: 6, opacity: endShiftMutation.isPending ? 0.6 : 1 }}
                      accessibilityRole="button"
                    >
                      {endShiftMutation.isPending
                        ? <ActivityIndicator size="small" color={Colors.danger} />
                        : <Ionicons name="stop-circle" size={16} color={Colors.danger} />}
                      <Text style={{ color: Colors.danger, fontSize: 13, fontWeight: "700" }}>
                        {L("إنهاء الوردية", "Schicht beenden", "End Shift")}
                      </Text>
                    </Pressable>
                  </View>
                )}

                <Text style={[styles.switchSectionTitle, rtlTextAlign]}>{t("employees" as any)}</Text>

                {allEmployees.filter((e: any) => e.id !== employee?.id).map((emp: any) => {
                  const roleColors: Record<string, string> = { admin: Colors.danger, manager: Colors.warning, cashier: Colors.info, owner: Colors.secondary };
                  const roleColor = roleColors[emp.role?.toLowerCase()] || Colors.info;
                  return (
                    <Pressable key={emp.id} style={[styles.switchEmployeeCard, flipRow && { flexDirection: "row-reverse" }]} onPress={() => { setSwitchTarget(emp); setSwitchPin(""); setSwitchError(""); }} accessibilityRole="button">
                      <View style={[styles.switchEmployeeAvatar, { borderColor: roleColor }]}>
                        <Text style={styles.switchEmployeeAvatarText}>{(emp.name || "?").charAt(0).toUpperCase()}</Text>
                      </View>
                      <View style={[{ flex: 1 }, flipRow && { alignItems: "flex-end" }]}>
                        <Text style={[styles.switchEmployeeName, rtlTextAlign]}>{emp.name}</Text>
                        <View style={[styles.switchRoleBadge, { backgroundColor: roleColor }]}>
                          <Text style={styles.switchRoleBadgeText}>{roleLabel(emp.role)}</Text>
                        </View>
                      </View>
                      <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={20} color={Colors.textMuted} />
                    </Pressable>
                  );
                })}

                {allEmployees.filter((e: any) => e.id !== employee?.id).length === 0 && (
                  <Text style={{ color: Colors.textMuted, fontSize: 14, textAlign: "center", marginTop: 20 }}>{t("noEmployees" as any)}</Text>
                )}

                {/* Log out button — full sign-out instead of switch */}
                <Pressable
                  onPress={() => {
                    const doLogout = () => {
                      setShowAccountSwitcher(false);
                      logout();
                    };
                    const finishLogoutAfterShift = async () => {
                      // After shift closes, ask once for final logout confirmation
                      const ok = await confirmAsync(
                        L("إنهاء الجلسة؟", "Sitzung beenden?", "Log out now?"), "",
                        L("تسجيل الخروج", "Abmelden", "Log out"), t("cancel"), true,
                      );
                      if (ok) doLogout();
                    };

                    if (myActiveShift) {
                      // Auto-end the active shift, then log out — same UX as Settings
                      if (endShiftMutation.isPending) return;
                      const msg = L("إنهاء الوردية وتسجيل الخروج؟", "Schicht beenden und abmelden?", "End your shift and log out?");
                      const proceed = () => {
                        endShiftMutation.mutate(myActiveShift.id, {
                          onSuccess: () => { void finishLogoutAfterShift(); },
                        });
                      };
                      void confirmAsync(msg, "", L("متابعة", "Weiter", "Continue"), t("cancel"), true).then((ok) => { if (ok) proceed(); });
                      return;
                    }

                    // No active shift — direct logout confirm
                    finishLogoutAfterShift();
                  }}
                  style={{
                    marginTop: 16, marginBottom: 8,
                    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
                    padding: 14, borderRadius: 12,
                    backgroundColor: Colors.danger + "15",
                    borderWidth: 1, borderColor: Colors.danger + "40",
                  }}
                >
                  <Ionicons name="log-out-outline" size={20} color={Colors.danger} />
                  <Text style={{ color: Colors.danger, fontSize: 15, fontWeight: "700" }}>
                    {L("تسجيل الخروج", "Abmelden", "Log out")}
                  </Text>
                </Pressable>
              </ScrollView>
            ) : (
              <View style={styles.switchPinSection}>
                <Pressable
                  style={[styles.switchBackBtn, webRTL && { alignSelf: "flex-start" }]}
                  onPress={() => { setSwitchTarget(null); setSwitchPin(""); setSwitchError(""); }}
                  disabled={switchLoading}
                  accessibilityRole="button"
                  accessibilityLabel={L("رجوع", "Zurück", "Back")}
                >
                  <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={22} color={Colors.text} />
                </Pressable>

                <View style={styles.switchPinAvatar}>
                  <LinearGradient colors={[Colors.accent, Colors.gradientStart]} style={styles.switchPinAvatarCircle}>
                    <Text style={styles.switchPinAvatarText}>{(switchTarget.name || "?").charAt(0).toUpperCase()}</Text>
                  </LinearGradient>
                  <Text style={[styles.switchPinName, rtlTextAlign]}>{switchTarget.name}</Text>
                </View>

                <Text style={[styles.switchPinLabel, rtlTextAlign]}>{t("enterPinToSwitch" as any)}</Text>

                <View style={[styles.switchPinDots, { direction: "ltr" } as any]}>
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
                  <View style={{ paddingVertical: 20, alignItems: "center", gap: 10 }}>
                    <ActivityIndicator size="small" color={Colors.accent} />
                    <Text style={{ color: Colors.accent, textAlign: "center", fontSize: 14, fontWeight: "600" }}>{t("processing" as any)}</Text>
                  </View>
                ) : (
                  <View style={[styles.switchKeypad, { direction: "ltr" } as any]}>
                    {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"].map((key) => {
                      if (key === "") return <View key="empty" style={styles.switchKeyBtn} />;
                      if (key === "del") {
                        return (
                          <Pressable key="del" style={styles.switchKeyBtn} onPress={() => { playClickSound("light"); setSwitchPin(switchPin.slice(0, -1)); }} accessibilityRole="button" accessibilityLabel={L("حذف", "Löschen", "Delete")}>
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

      <BarcodeScannerModal
        visible={showScanner}
        onScanned={handleBarcodeScan}
        onClose={() => setShowScanner(false)}
        continuous
      />
      {scanToast ? (
        <View pointerEvents="none" style={{ position: "absolute", top: insets.top + topPad + 60, left: 16, right: 16, alignItems: "center", zIndex: 999 }}>
          <View style={{ flexDirection: flipRow ? "row-reverse" : "row", alignItems: "center", gap: 8, maxWidth: 520, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, backgroundColor: scanToast.ok ? "#047857" : "#B91C1C" }}>
            <Ionicons name={scanToast.ok ? "checkmark-circle" : "alert-circle"} size={20} color="#FFFFFF" />
            <Text style={{ color: "#FFFFFF", fontSize: 15, fontWeight: "600", flexShrink: 1 }}>{scanToast.message}</Text>
          </View>
        </View>
      ) : null}

      {/* ── Shift Prompt after Account Switch ── */}
      <Modal
        visible={showSwitchShiftPrompt}
        animationType="fade"
        transparent
        onRequestClose={() => { if (!startShiftAfterSwitchMutation.isPending) { setShowSwitchShiftPrompt(false); setShowSwitchCashInput(false); setSwitchOpeningCash(""); } }}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", alignItems: "center", padding: 24 }}>
          <View style={{ backgroundColor: Colors.surface, borderRadius: 20, padding: 24, width: "100%", maxWidth: 380, borderWidth: 1, borderColor: Colors.cardBorder }}>
            {!showSwitchCashInput ? (
              <>
                <View style={{ alignItems: "center", marginBottom: 20 }}>
                  <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.accent + "20", justifyContent: "center", alignItems: "center", marginBottom: 12 }}>
                    <Ionicons name="time-outline" size={30} color={Colors.accent} />
                  </View>
                  <Text style={{ color: Colors.text, fontSize: 20, fontWeight: "700", marginBottom: 8 }}>
                    {L("بدء الوردية", "Schicht starten", "Start Shift")}
                  </Text>
                  <Text style={{ color: Colors.textSecondary, fontSize: 14, textAlign: "center" }}>
                    {L(
                      `لا توجد وردية نشطة لـ ${switchedEmployee?.name || ""}. هل تريد بدء وردية؟`,
                      `${switchedEmployee?.name || ""} hat keine aktive Schicht. Schicht starten?`,
                      `${switchedEmployee?.name || ""} has no active shift. Start one now?`,
                    )}
                  </Text>
                </View>
                <Pressable
                  onPress={() => setShowSwitchCashInput(true)}
                  style={{ backgroundColor: Colors.accent, borderRadius: 12, paddingVertical: 14, alignItems: "center" }}
                  accessibilityRole="button"
                >
                  <Text style={{ color: Colors.textDark, fontSize: 16, fontWeight: "700" }}>
                    {L("بدء الوردية الآن", "Schicht jetzt starten", "Start Shift Now")}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => { setShowSwitchShiftPrompt(false); setSwitchedEmployee(null); }}
                  style={{ borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 6 }}
                  accessibilityRole="button"
                >
                  <Text style={{ color: Colors.textSecondary, fontSize: 15 }}>
                    {L("لاحقاً", "Später", "Not now")}
                  </Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={{ color: Colors.text, fontSize: 18, fontWeight: "700", marginBottom: 16, textAlign: "center" }}>
                  {L("رصيد الفتح النقدي", "Öffnungskassenbestand", "Opening Cash Balance")} ({currencyLabel()})
                </Text>
                <TextInput
                  style={{ backgroundColor: Colors.surfaceLight, borderRadius: 12, padding: 14, fontSize: 18, color: Colors.text, textAlign: "center", borderWidth: 1, borderColor: Colors.cardBorder, marginBottom: 16 }}
                  value={switchOpeningCash}
                  onChangeText={setSwitchOpeningCash}
                  keyboardType={isZeroDecimalCurrency(currency) ? "number-pad" : "decimal-pad"}
                  placeholder={formatAmount(0)}
                  placeholderTextColor={Colors.textMuted}
                  autoFocus
                />
                <Pressable
                  onPress={() => {
                    if (!switchedEmployee || startShiftAfterSwitchMutation.isPending) return;
                    const opening = switchOpeningCash.trim() ? parseAmountInput(switchOpeningCash, currency) : 0;
                    if (!Number.isFinite(opening) || opening < 0) {
                      showAlert(t("error"), L("أدخل مبلغاً صحيحاً.", "Bitte einen gültigen Betrag eingeben.", "Enter a valid amount."));
                      return;
                    }
                    startShiftAfterSwitchMutation.mutate({
                      employeeId: switchedEmployee.id,
                      branchId: switchedEmployee.branchId || 1,
                      openingCash: roundMoney(opening, currency),
                    });
                  }}
                  disabled={startShiftAfterSwitchMutation.isPending}
                  style={{ backgroundColor: Colors.accent, borderRadius: 12, paddingVertical: 14, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, marginBottom: 10, opacity: startShiftAfterSwitchMutation.isPending ? 0.6 : 1 }}
                  accessibilityRole="button"
                >
                  {startShiftAfterSwitchMutation.isPending && <ActivityIndicator size="small" color={Colors.textDark} />}
                  <Text style={{ color: Colors.textDark, fontSize: 16, fontWeight: "700" }}>
                    {L("بدء الوردية", "Schicht starten", "Start Shift")}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setShowSwitchCashInput(false)}
                  disabled={startShiftAfterSwitchMutation.isPending}
                  style={{ borderRadius: 12, paddingVertical: 14, alignItems: "center" }}
                  accessibilityRole="button"
                >
                  <Text style={{ color: Colors.textSecondary, fontSize: 15 }}>
                    {L("رجوع", "Zurück", "Back")}
                  </Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ── Call History Panel ── */}
      <Modal visible={showCallHistory} animationType="slide" transparent onRequestClose={() => setShowCallHistory(false)} onShow={() => { setCallHistoryFilter("all"); setCallHistorySearch(""); }}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: "92%" }]}>
            {/* Header */}
            <View style={[styles.modalHeader, flipRow && { flexDirection: "row-reverse" }]}>
              <Text style={[styles.modalTitle, rtlTextAlign]}>
                {L("سجل المكالمات", "Anrufhistorie", "Call History")}
              </Text>
              <Pressable
                onPress={() => setShowCallHistory(false)}
                style={styles.modalCloseBtn}
                accessibilityRole="button"
                accessibilityLabel={L("إغلاق", "Schliessen", "Close")}
              >
                <Ionicons name="close" size={22} color={Colors.text} />
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
                <View style={{ flexDirection: flipRow ? "row-reverse" : "row", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                  {[
                    { label: L("الكل", "Alle", "Total"), value: total, color: Colors.accent },
                    { label: L("فاتت", "Verpasst", "Missed"), value: missed, color: Colors.danger },
                    { label: L("رُدَّ عليها", "Beantw.", "Answered"), value: answered, color: Colors.success },
                    { label: L("اليوم", "Heute", "Today"), value: todayCount, color: Colors.secondary },
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
            <View style={{ flexDirection: flipRow ? "row-reverse" : "row", alignItems: "center", backgroundColor: Colors.surfaceLight, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 8, borderWidth: 1, borderColor: Colors.cardBorder, gap: 6 }}>
              <Ionicons name="search" size={16} color={Colors.textMuted} />
              <TextInput
                value={callHistorySearch}
                onChangeText={setCallHistorySearch}
                placeholder={L("ابحث برقم أو اسم…", "Suche nach Nummer oder Name…", "Search by number or name…")}
                placeholderTextColor={Colors.textMuted}
                style={[{ flex: 1, color: Colors.text, fontSize: 14, minHeight: 30 }, rtlTextAlign]}
              />
              {callHistorySearch.length > 0 && (
                <Pressable onPress={() => setCallHistorySearch("")} hitSlop={10} accessibilityRole="button" accessibilityLabel={L("مسح البحث", "Suche löschen", "Clear search")}>
                  <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
                </Pressable>
              )}
            </View>

            {/* Filter tabs */}
            <View style={{ flexDirection: flipRow ? "row-reverse" : "row", gap: 6, marginBottom: 10 }}>
              {(["all", "missed", "answered", "today"] as const).map((f) => {
                const labels: Record<string, Record<string, string>> = {
                  all: { ar: "الكل", de: "Alle", en: "All" },
                  missed: { ar: "فاتتني", de: "Verpasst", en: "Missed" },
                  answered: { ar: "تم الرد", de: "Beantwortet", en: "Answered" },
                  today: { ar: "اليوم", de: "Heute", en: "Today" },
                };
                const label = labels[f][language] ?? labels[f]["en"];
                const active = callHistoryFilter === f;
                return (
                  <Pressable key={f} onPress={() => setCallHistoryFilter(f)} style={{ flex: 1, minHeight: 38, justifyContent: "center", borderRadius: 8, backgroundColor: active ? Colors.accent : Colors.surfaceLight, borderWidth: 1, borderColor: active ? Colors.accent : Colors.cardBorder, alignItems: "center" }} accessibilityRole="tab" accessibilityState={{ selected: active }}>
                    <Text style={{ color: active ? Colors.textDark : Colors.textSecondary, fontSize: 12, fontWeight: "700" }}>{label}</Text>
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
                  const q = toLatinDigits(callHistorySearch).trim().toLowerCase();
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
                const dateStr = callDate.toLocaleDateString(dateLocale, { day: "2-digit", month: "2-digit", year: "numeric" });
                const timeStr = callDate.toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit" });

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
                      ...(webRTL
                        ? { borderRightWidth: 4, borderRightColor: isMissed ? Colors.danger : Colors.success }
                        : { borderLeftWidth: 4, borderLeftColor: isMissed ? Colors.danger : Colors.success }),
                      flexDirection: flipRow ? "row-reverse" : "row", alignItems: "center", gap: 10
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
                    <View style={[{ flex: 1 }, flipRow && { alignItems: "flex-end" }]}>
                      {!!custName && (
                        <Text style={[{ color: Colors.accent, fontWeight: "800", fontSize: 15 }, rtlTextAlign]}>{custName}</Text>
                      )}
                      <Text style={{ color: custName ? Colors.textSecondary : Colors.text, fontWeight: custName ? "600" : "800", fontSize: custName ? 13 : 16, marginTop: custName ? 1 : 0 }}>
                        {item.phoneNumber}
                      </Text>
                      {item.customerAddress ? (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 3, marginTop: 2 }}>
                          <Ionicons name="location-outline" size={11} color={Colors.textMuted} />
                          <Text style={{ color: Colors.textMuted, fontSize: 11, fontWeight: "500" }} numberOfLines={1}>{item.customerAddress}</Text>
                        </View>
                      ) : null}
                      <View style={{ flexDirection: flipRow ? "row-reverse" : "row", alignItems: "center", gap: 6, marginTop: 4 }}>
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
                    <View style={{ alignItems: flipRow ? "flex-start" : "flex-end", gap: 4 }}>
                      {item.answeredCount > 0 && (
                        <View style={{ backgroundColor: Colors.success + "18", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
                          <Text style={{ color: Colors.success, fontSize: 12, fontWeight: "700" }}>
                            {L("تم الرد", "Beantwortet", "Answered")}
                          </Text>
                        </View>
                      )}
                      {item.missedCount > 0 && (
                        <View style={{ backgroundColor: Colors.danger + "18", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
                          <Text style={{ color: Colors.danger, fontSize: 12, fontWeight: "700" }}>
                            {item.missedCount > 1 ? `${item.missedCount} ` : ""}{L("فاتت", "Verpasst", "Missed")}
                          </Text>
                        </View>
                      )}
                      {item.saleId && (
                        <View style={{ backgroundColor: Colors.accent + "22", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 }}>
                          <Text style={{ color: Colors.accent, fontSize: 10, fontWeight: "800" }}>
                            {L("مباع", "Verkauft", "SOLD")}
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
                    {callHistorySearch ? L("لا توجد نتائج", "Keine Ergebnisse", "No results found") : L("لا يوجد سجل مكالمات", "Keine Anrufhistorie", "No call history yet")}
                  </Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>

      {/* Online Order Notification moved to _layout.tsx */}

      {/* ── Zero Out Shift Preview Modal ── */}
      <Modal visible={showZeroOutPreview} animationType="fade" transparent onRequestClose={() => setShowZeroOutPreview(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: "88%", width: "92%" }]}>
            {/* Header */}
            <LinearGradient
              colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={{ borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingVertical: 14, paddingHorizontal: 18 }}
            >
              <View style={{ flexDirection: flipRow ? "row-reverse" : "row", alignItems: "center", justifyContent: "space-between" }}>
                <View style={{ flexDirection: flipRow ? "row-reverse" : "row", alignItems: "center", gap: 10 }}>
                  <Ionicons name="sync-outline" size={22} color={Colors.white} />
                  <Text style={{ color: Colors.white, fontSize: 17, fontWeight: "800", letterSpacing: 0.5 }}>
                    {L("تصفير الوردية", "SCHICHT NULLSTELLEN", "ZERO OUT SHIFT")}
                  </Text>
                </View>
                <Pressable
                  onPress={() => setShowZeroOutPreview(false)}
                  style={[styles.modalCloseBtn, { backgroundColor: "rgba(255,255,255,0.18)" }]}
                  accessibilityRole="button"
                  accessibilityLabel={L("إغلاق", "Schliessen", "Close")}
                >
                  <Ionicons name="close" size={22} color={Colors.white} />
                </Pressable>
              </View>
            </LinearGradient>

            {/* Sub-header: store + cashier */}
            <View style={{ paddingHorizontal: 14, paddingVertical: 10, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.cardBorder }}>
              <Text style={[{ color: Colors.text, fontWeight: "700", fontSize: 13 }, rtlTextAlign]}>
                {storeSettings?.name || tenant?.name || "Kassenta POS"}
              </Text>
              <Text style={[{ color: Colors.textMuted, fontSize: 11, marginTop: 2 }, rtlTextAlign]}>
                {L("الكاشير:", "Kassierer:", "Cashier:")} {employee?.name || "–"}
                {"  ·  "}
                {new Date().toLocaleDateString(dateLocale, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
              </Text>
            </View>

            {/* Table */}
            <ScrollView style={{ flex: 1 }}>
              {/* Table header row */}
              <View style={{
                flexDirection: flipRow ? "row-reverse" : "row",
                backgroundColor: Colors.surfaceLight,
                borderBottomWidth: 1, borderBottomColor: Colors.cardBorder,
                paddingVertical: 8, paddingHorizontal: 10,
              }}>
                {[
                  { label: "#", flex: 0.4, align: "center" as const },
                  { label: L("الاسم", "Name", "Name"), flex: 1.4, align: undefined },
                  { label: L("العنوان", "Adresse", "Address"), flex: 1.5, align: undefined },
                  { label: L("المنطقة", "Gebiet", "Area"), flex: 1.1, align: undefined },
                  { label: L("الوقت", "Zeit", "Time"), flex: 0.8, align: "center" as const },
                  { label: L("المجموع", "Total", "Total"), flex: 0.9, align: zeroEndAlign },
                ].map((col, i) => (
                  <Text key={i} style={[{ flex: col.flex, color: Colors.textMuted, fontSize: 11, fontWeight: "700" }, col.align ? { textAlign: col.align } : rtlTextAlign]}>
                    {col.label}
                  </Text>
                ))}
              </View>

              {zeroOutSalesData.length === 0 ? (
                <View style={{ alignItems: "center", paddingVertical: 40 }}>
                  <Ionicons name="receipt-outline" size={44} color={Colors.textMuted} />
                  <Text style={{ color: Colors.textMuted, fontSize: 14, marginTop: 10, fontWeight: "600" }}>
                    {L("لا توجد مبيعات اليوم", "Keine Verkäufe heute", "No sales today")}
                  </Text>
                </View>
              ) : (
                zeroOutSalesData.map((sale: any, idx: number) => {
                  const { street, plz, city } = getSaleAddressParts(sale);
                  const gebiet = [plz, city !== "–" ? city : ""].filter(Boolean).join(" ") || "–";
                  const timeStr = new Date(sale.createdAt).toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit" });
                  const amt = formatAmount(sale.totalAmount || 0);
                  const isEven = idx % 2 === 0;
                  return (
                    <View key={sale.id} style={{
                      flexDirection: flipRow ? "row-reverse" : "row",
                      paddingVertical: 7, paddingHorizontal: 10,
                      backgroundColor: isEven ? Colors.background : Colors.surface,
                      borderBottomWidth: 1, borderBottomColor: Colors.cardBorder,
                      alignItems: "center",
                    }}>
                      <Text style={{ flex: 0.4, color: Colors.textMuted, fontSize: 11, textAlign: "center" }}>{idx + 1}</Text>
                      <Text style={[{ flex: 1.4, color: Colors.text, fontSize: 12, fontWeight: "600" }, rtlTextAlign]} numberOfLines={1}>
                        {sale.customerName || t("walkIn")}
                      </Text>
                      <Text style={[{ flex: 1.5, color: Colors.textSecondary, fontSize: 11 }, rtlTextAlign]} numberOfLines={1}>{street}</Text>
                      <Text style={[{ flex: 1.1, color: Colors.textSecondary, fontSize: 11 }, rtlTextAlign]} numberOfLines={1}>{gebiet}</Text>
                      <Text style={{ flex: 0.8, color: Colors.textMuted, fontSize: 11, textAlign: "center" }}>{timeStr}</Text>
                      <Text style={{ flex: 0.9, color: Colors.accent, fontSize: 12, fontWeight: "700", textAlign: zeroEndAlign }}>{amt}</Text>
                    </View>
                  );
                })
              )}

              {/* Totals footer */}
              {zeroOutSalesData.length > 0 && (() => {
                const grandTotal = zeroOutSalesData.reduce((s: number, sale: any) => s + Number(sale.totalAmount || 0), 0);
                return (
                  <View style={{ borderTopWidth: 1, borderTopColor: Colors.cardBorder, marginTop: 4, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: Colors.surfaceLight }}>
                    <View style={{ flexDirection: flipRow ? "row-reverse" : "row", justifyContent: "space-between", marginBottom: 4 }}>
                      <Text style={{ color: Colors.textSecondary, fontSize: 12, fontWeight: "600" }}>
                        {L("إجمالي المبيعات", "Umsatz Total", "Total sales")}
                      </Text>
                      <Text style={{ color: Colors.text, fontSize: 12, fontWeight: "700" }}>{formatMoney(grandTotal)}</Text>
                    </View>
                    <View style={{ flexDirection: flipRow ? "row-reverse" : "row", justifyContent: "space-between", marginBottom: 4 }}>
                      <Text style={{ color: Colors.textSecondary, fontSize: 12 }}>
                        {L("المصروفات اليومية", "Tagesausgaben", "Daily expenses")}
                      </Text>
                      <Text style={{ color: Colors.textMuted, fontSize: 12 }}>{formatMoney(0)}</Text>
                    </View>
                    <View style={{ flexDirection: flipRow ? "row-reverse" : "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: Colors.cardBorder, paddingTop: 6 }}>
                      <Text style={{ color: Colors.text, fontSize: 13, fontWeight: "800" }}>
                        {zeroOutSalesData.length} {L("فاتورة · الإجمالي", "TOTAL Kassierer", "sales · TOTAL")}
                      </Text>
                      <Text style={{ color: Colors.accent, fontSize: 13, fontWeight: "800" }}>{formatMoney(grandTotal)}</Text>
                    </View>
                  </View>
                );
              })()}
            </ScrollView>

            {/* Action buttons */}
            <View style={{ flexDirection: flipRow ? "row-reverse" : "row", gap: 10, padding: 14, borderTopWidth: 1, borderTopColor: Colors.cardBorder }}>
              <Pressable
                onPress={handleZeroOutConfirm}
                disabled={endOfDayLoading}
                style={{
                  flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
                  minHeight: 48, paddingVertical: 13, borderRadius: 12,
                  backgroundColor: Colors.accent,
                  opacity: endOfDayLoading ? 0.6 : 1,
                }}
                accessibilityRole="button"
                accessibilityState={{ disabled: endOfDayLoading, busy: endOfDayLoading }}
              >
                {endOfDayLoading
                  ? <ActivityIndicator size="small" color={Colors.textDark} />
                  : <Ionicons name={Platform.OS === "web" ? "print-outline" : "checkmark-done-outline"} size={20} color={Colors.textDark} />
                }
                <Text style={{ color: Colors.textDark, fontWeight: "800", fontSize: 14 }}>
                  {endOfDayLoading
                    ? L("جاري المعالجة…", "Verarbeitung…", "Processing…")
                    : Platform.OS === "web"
                      ? L("طباعة وتصفير", "Drucken & Nullstellen", "Print & Zero Out")
                      : L("تصفير الوردية", "Nullstellen", "Zero Out")
                  }
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setShowZeroOutPreview(false)}
                disabled={endOfDayLoading}
                style={{
                  paddingHorizontal: 20, minHeight: 48, borderRadius: 12,
                  backgroundColor: Colors.surfaceLight, borderWidth: 1, borderColor: Colors.cardBorder,
                  alignItems: "center", justifyContent: "center",
                }}
                accessibilityRole="button"
              >
                <Text style={{ color: Colors.text, fontWeight: "800", fontSize: 14 }}>
                  {t("cancel")}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {saleDone && (
        <View pointerEvents="box-none" style={[styles.saleDoneWrap, { bottom: useMobileCartSidebar ? 88 : Platform.OS === "web" ? 96 : 76 + insets.bottom }]}>
        <View
          style={[styles.saleDoneToast, flipRow && { flexDirection: "row-reverse" }]}
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
        >
          <View style={styles.saleDoneIcon}>
            <Ionicons name="checkmark-circle" size={26} color={Colors.success} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.saleDoneTitle, rtlTextAlign]} numberOfLines={1}>
              {L("تم البيع", "Verkauf abgeschlossen", "Sale complete")}
              {saleDone.receipt ? ` · ${saleDone.receipt}` : ""}
            </Text>
            {saleDone.change > 0 ? (
              <Text style={[styles.saleDoneChange, rtlTextAlign]}>
                {t("change")}: {formatMoney(saleDone.change)}
              </Text>
            ) : (
              <Text style={[{ color: Colors.textSecondary, fontSize: 13, marginTop: 2 }, rtlTextAlign]} numberOfLines={1}>
                {formatMoney(saleDone.total)} · {paymentLabel(saleDone.pm)}
              </Text>
            )}
          </View>
          {Platform.OS === "web" && (
            <Pressable
              style={styles.saleDoneBtn}
              onPress={() => reprintLastSale.current?.()}
              accessibilityRole="button"
              accessibilityLabel={L("طباعة الإيصال", "Beleg drucken", "Print receipt")}
            >
              <Ionicons name="print-outline" size={18} color={Colors.text} />
              {!isMobileWeb && <Text style={styles.saleDoneBtnText}>{L("طباعة", "Drucken", "Print")}</Text>}
            </Pressable>
          )}
          <Pressable
            style={[styles.saleDoneBtn, { paddingHorizontal: 0 }]}
            onPress={() => setSaleDone(null)}
            accessibilityRole="button"
            accessibilityLabel={L("إغلاق", "Schliessen", "Close")}
          >
            <Ionicons name="close" size={20} color={Colors.textMuted} />
          </Pressable>
        </View>
        </View>
      )}

      <View style={{ height: Platform.OS === "web" ? 84 : 60 }} />
    </View>
  );
}

const styles = themedStyles((Colors) => ({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { overflow: "hidden" },
  headerMobile: { flexShrink: 0 },
  headerGradient: { paddingHorizontal: 16, paddingVertical: 8 },
  headerContent: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerContentMobile: { flexDirection: "column", alignItems: "stretch", gap: 10 },
  headerTitle: { flexShrink: 1, fontSize: 18, fontWeight: "800", color: Colors.white, letterSpacing: 0.5, marginEnd: 12 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" },
  headerRightMobile: { flexWrap: "wrap", justifyContent: "flex-start", gap: 6 },
  employeeName: { color: Colors.white, fontSize: 13, opacity: 0.9 },
  mainContent: { flex: 1 },
  productsSection: { flex: 1 },
  productsSectionTablet: { flex: 1 },
  searchRow: { paddingHorizontal: 12, paddingTop: 8 },
  searchBox: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.inputBg, borderRadius: 12, paddingHorizontal: 12, height: 40, borderWidth: 1, borderColor: Colors.inputBorder },
  searchInput: { flex: 1, color: Colors.text, marginStart: 8, fontSize: 15 },

  // ── Category horizontal scroll row
  categoriesGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 10, paddingVertical: 8, gap: 6 },
  categoriesScroll: { flexGrow: 0, flexShrink: 0 },
  categoriesScrollContent: { flexDirection: "row", flexWrap: "nowrap", paddingHorizontal: 10, paddingVertical: 6, gap: 5, alignItems: "center" },
  catChip: { flexDirection: "row", borderRadius: 20, backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.cardBorder, overflow: "hidden" },
  catChipActive: { borderColor: Colors.accent, borderWidth: 2 },
  catChipGrad: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 7, gap: 5 },
  catChipText: { color: Colors.textSecondary, fontSize: 12, fontWeight: "700" },
  catDot: { width: 8, height: 8, borderRadius: 4 },

  // ── Kept for compat (unused now)
  categoriesRow: { flexGrow: 0 },
  categoriesContent: {},
  categoryChip: {}, categoryChipAll: {}, categoryChipAllActive: {},
  categoryChipGradient: {}, categoryChipInner: {},
  categoryChipText: {}, categoryChipTextAll: {}, categoryDot: {},

  // ── Products
  productGrid: { padding: 6 },
  productGridMobile: { paddingBottom: 140 },
  productCard: { flex: 1, margin: 3, backgroundColor: Colors.surface, borderRadius: 12, padding: 9, alignItems: "center", borderWidth: 1, borderColor: Colors.cardBorder, minWidth: 70, overflow: "hidden", position: "relative" as const },
  productCardTopBorder: { position: "absolute" as const, top: 0, left: 0, right: 0, height: 3, borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  productIcon: { width: 52, height: 52, borderRadius: 13, justifyContent: "center", alignItems: "center", marginBottom: 7, marginTop: 3, overflow: "hidden" as const },
  productName: { color: Colors.text, fontSize: 12, fontWeight: "700", textAlign: "center", marginBottom: 3, lineHeight: 16 },
  productPrice: { color: Colors.accent, fontSize: 14, fontWeight: "800" },
  productSizeWrap: { width: "100%" as const, marginTop: 8, marginBottom: 2 },
  productSizeButton: { minHeight: 32, borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 7, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  productSizeButtonText: { flex: 1, fontSize: 11, fontWeight: "800", textAlign: "center" as const },
  productSizeDropdown: { marginTop: 6, borderRadius: 10, borderWidth: 1, borderColor: Colors.cardBorder, backgroundColor: Colors.surfaceLight, overflow: "hidden" as const },
  productSizeOption: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.cardBorder },
  productSizeOptionName: { color: Colors.text, fontSize: 12, fontWeight: "700" },
  productSizeOptionPrice: { fontSize: 12, fontWeight: "800" },
  productAddBadge: { position: "absolute" as const, top: 7, right: 7, width: 20, height: 20, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  productCartBadge: { position: "absolute" as const, top: 7, right: 7, minWidth: 20, height: 20, borderRadius: 10, justifyContent: "center", alignItems: "center", paddingHorizontal: 4 },
  productCartBadgeText: { color: Colors.white, fontSize: 11, fontWeight: "800" },
  barcodeText: { color: Colors.textMuted, fontSize: 9, marginTop: 3 },
  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  emptyText: { color: Colors.textMuted, fontSize: 15, marginTop: 12 },

  // ── Cart
  cartSection: { backgroundColor: Colors.surface, borderTopWidth: 1, borderColor: Colors.cardBorder, maxHeight: 360 },
  cartSectionTablet: { flex: 0.7, borderTopWidth: 0, borderLeftWidth: 1, maxHeight: "100%" as any, display: "flex" as any, flexDirection: "column" as any },
  cartHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: 1, borderColor: Colors.cardBorder },
  cartTitle: { color: Colors.text, fontSize: 17, fontWeight: "700" },
  cartHeaderBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, minWidth: 40, minHeight: 36, paddingHorizontal: 8, borderRadius: 10, backgroundColor: Colors.surfaceLight, borderWidth: 1, borderColor: Colors.cardBorder },
  adjustBtn: { width: 32, height: 32, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  adjustValue: { fontSize: 13, fontWeight: "700", minWidth: 64, textAlign: "center", fontVariant: ["tabular-nums"] },
  customerSelect: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 10, marginHorizontal: 10, marginVertical: 6, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.primary + "60", borderStyle: "dashed" as const, backgroundColor: Colors.primary + "12" },
  customerSelectText: { color: Colors.primary, fontSize: 14, fontWeight: "700", flex: 1 },
  cartList: { flex: 1 },
  cartItem: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 5, borderBottomWidth: 1, borderColor: Colors.cardBorder, gap: 6 },
  cartItemIndexBadge: { width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.surfaceLight, justifyContent: "center", alignItems: "center", flexShrink: 0 },
  cartItemIndexText: { color: Colors.textMuted, fontSize: 10, fontWeight: "700" },
  cartItemInfo: { flex: 1, minWidth: 0 },
  cartItemName: { color: Colors.text, fontSize: 15, fontWeight: "600" },
  cartItemUnit: { color: Colors.textMuted, fontSize: 13, marginTop: 1 },
  cartItemPrice: { color: Colors.accent, fontSize: 14, marginTop: 2, fontWeight: "500" },
  cartItemTotal: { color: Colors.accent, fontSize: 16, fontWeight: "700", minWidth: 70, textAlign: "right", fontVariant: ["tabular-nums"] },
  cartItemActions: { flexDirection: "row", alignItems: "center", gap: 6 },
  qtyBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.surfaceLight, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: Colors.cardBorder },
  qtyBadge: { minWidth: 30, height: 30, borderRadius: 15, paddingHorizontal: 4, backgroundColor: Colors.surfaceLight, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: Colors.cardBorder },
  qtyText: { color: Colors.text, fontSize: 13, fontWeight: "700", textAlign: "center" },
  cartEmpty: { alignItems: "center", paddingVertical: 28 },
  cartEmptyText: { color: Colors.textMuted, fontSize: 13, marginTop: 8, fontWeight: "600" },
  cartEmptySubtext: { color: Colors.textMuted, fontSize: 11, marginTop: 4 },
  cartSummary: { paddingHorizontal: 12, paddingVertical: 5, borderTopWidth: 1, borderColor: Colors.cardBorder },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  summaryLabel: { color: Colors.textSecondary, fontSize: 13 },
  summaryValue: { color: Colors.text, fontSize: 13, fontWeight: "600" },
  totalRow: { borderTopWidth: 1, borderColor: Colors.cardBorder, paddingTop: 7, marginTop: 4 },
  totalLabel: { color: Colors.text, fontSize: 19, fontWeight: "800" },
  totalValue: { color: Colors.accent, fontSize: 22, fontWeight: "800" },
  checkoutBtn: { marginHorizontal: 12, marginVertical: 6, borderRadius: 14, overflow: "hidden", elevation: 4, boxShadow: "0px 4px 8px rgba(124, 58, 237, 0.3)" },
  checkoutBtnDisabled: { opacity: 0.5, elevation: 0, boxShadow: "none" },
  checkoutBtnGradient: { paddingVertical: 12, paddingHorizontal: 14, minHeight: 52, justifyContent: "center" },
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
  loyaltyBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: Colors.warning + "22", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  loyaltyBadgeText: { color: Colors.warning, fontSize: 12, fontWeight: "700" },
  sectionLabel: { color: Colors.textSecondary, fontSize: 13, fontWeight: "600", marginBottom: 8, textTransform: "uppercase" as const, letterSpacing: 1 },
  paymentMethods: { flexDirection: "row", gap: 8, marginBottom: 16, flexWrap: "wrap" },
  paymentBtn: { flex: 1, alignItems: "center", paddingVertical: 14, borderRadius: 14, backgroundColor: Colors.surfaceLight, borderWidth: 1, borderColor: Colors.cardBorder, gap: 4, minWidth: 70 },
  paymentBtnActive: { borderColor: Colors.accent, borderWidth: 2, backgroundColor: Colors.accent + "1A" },
  paymentBtnText: { color: Colors.textSecondary, fontSize: 12, fontWeight: "700", textAlign: "center" },
  cashSection: { marginBottom: 16 },
  cashInput: { backgroundColor: Colors.inputBg, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: Colors.text, fontSize: 18, fontWeight: "700", borderWidth: 1, borderColor: Colors.inputBorder, textAlign: "center" },
  changeText: { color: Colors.success, fontSize: 16, fontWeight: "700", textAlign: "center", marginTop: 8 },
  cashChipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  cashChip: { flexGrow: 1, minWidth: 72, minHeight: 44, paddingHorizontal: 10, borderRadius: 12, borderWidth: 1, borderColor: Colors.cardBorder, backgroundColor: Colors.surfaceLight, alignItems: "center", justifyContent: "center" },
  cashChipActive: { borderColor: Colors.accent, backgroundColor: Colors.accent + "1A" },
  cashChipText: { color: Colors.text, fontSize: 14, fontWeight: "700", fontVariant: ["tabular-nums"] },
  changeBox: { marginTop: 10, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1 },
  changeBoxLabel: { fontSize: 14, fontWeight: "700" },
  changeBoxValue: { fontSize: 20, fontWeight: "800", fontVariant: ["tabular-nums"] },
  saleDoneWrap: { position: "absolute", left: 0, right: 0, bottom: 24, alignItems: "center", paddingHorizontal: 16, zIndex: 900 },
  saleDoneToast: { width: "100%", maxWidth: 520, borderRadius: 16, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.success, padding: 14, flexDirection: "row", alignItems: "center", gap: 12, boxShadow: "0px 10px 30px rgba(0,0,0,0.25)", elevation: 10 },
  saleDoneIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.success + "22", alignItems: "center", justifyContent: "center" },
  saleDoneTitle: { color: Colors.text, fontSize: 15, fontWeight: "800" },
  saleDoneChange: { color: Colors.success, fontSize: 18, fontWeight: "800", marginTop: 2, fontVariant: ["tabular-nums"] },
  saleDoneBtn: { minHeight: 44, minWidth: 44, paddingHorizontal: 12, borderRadius: 12, backgroundColor: Colors.surfaceLight, borderWidth: 1, borderColor: Colors.cardBorder, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  saleDoneBtnText: { color: Colors.text, fontSize: 13, fontWeight: "700" },
  // ── Card / TWINT / wallet capture (Stripe-hosted Checkout on the
  // customer's own phone). The old fake card form and its NFC dressing lived
  // here; nothing implemented either, so both are gone.
  payHint: { color: Colors.textMuted, fontSize: 12, marginBottom: 12, marginTop: -8 },
  payNotice: { backgroundColor: Colors.surfaceLight, borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: Colors.cardBorder, gap: 6 },
  payNoticeTitle: { color: Colors.text, fontSize: 14, fontWeight: "700" },
  payNoticeText: { color: Colors.textSecondary, fontSize: 13, lineHeight: 19 },
  payNoticeMethods: { color: Colors.accent, fontSize: 11, fontWeight: "600", textTransform: "uppercase" as const, letterSpacing: 0.5 },
  payModal: { backgroundColor: Colors.surface, borderRadius: 20, padding: 24, width: "90%", maxWidth: 420, maxHeight: "88%" },
  payCentre: { alignItems: "center", gap: 14, paddingVertical: 18 },
  payLinkBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: Colors.surfaceLight, borderWidth: 1, borderColor: Colors.accent, borderRadius: 12, paddingVertical: 13, paddingHorizontal: 14, marginTop: 12 },
  payLinkBtnText: { color: Colors.accent, fontSize: 14, fontWeight: "700" },
  payWaitRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 14, backgroundColor: Colors.surfaceLight, borderRadius: 12, padding: 12 },
  payCashBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1, borderColor: Colors.warning, borderRadius: 12, paddingVertical: 13, marginTop: 12 },
  payCashBtnText: { color: Colors.warning, fontSize: 14, fontWeight: "700" },
  checkoutItem: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  checkoutItemName: { color: Colors.textSecondary, fontSize: 13, flexShrink: 1 },
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
  customerCardActive: { borderColor: Colors.accent, backgroundColor: Colors.accent + "1A" },
  customerAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.gradientMid, justifyContent: "center", alignItems: "center", marginEnd: 10 },
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
  phoneBarMobile: {
    flexDirection: "column",
    alignItems: "stretch",
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
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  phoneBarAvatarText: { color: Colors.white, fontSize: 16, fontWeight: "700" },
  phoneBarCustomerInfo: { flex: 1, minWidth: 0 },
  phoneBarCustomerName: { color: Colors.text, fontSize: 16, fontWeight: "800" },
  phoneBarCustomerMeta: { flexDirection: "row", alignItems: "center", gap: 4, flexWrap: "nowrap" },
  phoneBarMetaText: { color: Colors.textSecondary, fontSize: 13, flexShrink: 1 },
  phoneBarMetaDot: { color: Colors.textSecondary, fontSize: 13 },
  phoneBarClear: { padding: 8, flexShrink: 0 },
  phoneBarWalkIn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    minHeight: 40,
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
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  cartCustomerAvatarText: { color: Colors.white, fontSize: 17, fontWeight: "800" },
  cartCustomerBody: { flex: 1, minWidth: 0 },
  cartCustomerName: { color: Colors.text, fontSize: 15, fontWeight: "800", marginBottom: 4 },
  cartCustomerRow: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
  cartCustomerChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.surface,
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  cartCustomerChipText: { color: Colors.textSecondary, fontSize: 12, fontWeight: "600" },
  cartCustomerClear: { padding: 10 },

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
  discountTypeBtn: { flex: 1, minHeight: 44, justifyContent: "center", paddingVertical: 10, borderRadius: 12, backgroundColor: Colors.surfaceLight, alignItems: "center" },
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
  headerInvoiceBtn: { flexDirection: "row" as const, alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.16)", paddingHorizontal: 12, minHeight: 40, minWidth: 40, borderRadius: 20 },
  headerDangerBtn: { backgroundColor: "#DC2626" },
  headerInvoiceLabel: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" as const },
  headerAvatarBtn: { padding: 2 },
  headerAvatarCircle: { width: 40, height: 40, borderRadius: 20, justifyContent: "center" as const, alignItems: "center" as const, borderWidth: 2, borderColor: "rgba(255,255,255,0.4)" },
  headerAvatarText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" as const },
  mobileCartBar: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 25,
    boxShadow: "0px 12px 36px rgba(0,0,0,0.28)",
  },
  mobileCartBarLabel: { color: Colors.text, fontSize: 14, fontWeight: "800" },
  mobileCartBarHint: { color: Colors.textMuted, fontSize: 11, marginTop: 2, maxWidth: 180 },
  mobileCartBarPrice: {
    backgroundColor: Colors.accent,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginStart: 12,
  },
  mobileCartBarPriceText: { color: Colors.textDark, fontSize: 13, fontWeight: "900" },
  mobileCartOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.48)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
  },
  mobileCartBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  mobileCartDrawer: {
    width: "88%",
    maxWidth: 380,
    height: "100%",
    backgroundColor: Colors.surface,
    borderLeftWidth: 1,
    borderLeftColor: Colors.cardBorder,
    paddingTop: 56,
  },

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
  switchEmployeeAvatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: Colors.surface, justifyContent: "center" as const, alignItems: "center" as const, borderWidth: 2 },
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
  modalCloseBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surfaceLight, justifyContent: "center", alignItems: "center" },
  variantBtn: { borderRadius: 18, backgroundColor: Colors.surfaceLight, borderWidth: 1, borderColor: Colors.cardBorder, overflow: "hidden" as const, elevation: 4, boxShadow: "0px 2px 4px rgba(0,0,0,0.2)" },
  variantBtnInner: { flexDirection: "row" as const, alignItems: "center", justifyContent: "space-between", padding: 16 },
  variantIconCircle: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.accent + "1A", justifyContent: "center" as const, alignItems: "center" as const },
  variantBtnName: { color: Colors.text, fontSize: 16, fontWeight: "700" as const },
  variantPriceTag: { backgroundColor: Colors.accent + "22", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
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
    backgroundColor: Colors.accent + "14",
  },
  sizeCardName: { color: Colors.text, fontSize: 15, fontWeight: "700" as const, marginBottom: 4 },
  sizeCardPrice: { color: Colors.accent, fontSize: 13, fontWeight: "600" as const },
  // Toppings list
  selectedSizeBadge: {
    flexDirection: "row" as const, alignItems: "center", gap: 6,
    backgroundColor: Colors.accent + "1A",
    borderWidth: 1, borderColor: Colors.accent + "4D",
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, alignSelf: "flex-start" as const,
  },
  selectedSizeBadgeText: { color: Colors.accent, fontSize: 12, fontWeight: "600" as const },
  toppingRow: {
    flexDirection: "row" as const, alignItems: "center", gap: 12,
    paddingVertical: 10, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: Colors.cardBorder,
  },
  toppingRowSelected: { backgroundColor: Colors.accent + "10", borderRadius: 10, borderBottomColor: "transparent" },
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
  modalCancelBtnText: { color: Colors.textSecondary, fontSize: 15, fontWeight: "600" as const },
}));
