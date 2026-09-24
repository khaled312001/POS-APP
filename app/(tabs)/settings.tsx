import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet, Text, View, ScrollView, Pressable, Modal,
  TextInput, Alert, Platform, FlatList, Switch, Image, useWindowDimensions, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Colors } from "@/constants/colors";
import { themedStyles } from "@/lib/themed-styles";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";
import ThemeToggle from "@/components/ThemeToggle";
import { useLicense } from "@/lib/license-context";
import { apiRequest, apiErrorMessage, getQueryFn, getApiUrl } from "@/lib/query-client";
import { getDisplayNumber } from "@/lib/api-config";
import { playClickSound } from "@/lib/sound";
import { getChromeMetrics } from "@/lib/responsive";
import TabPageHeader from "@/components/tab-page-header";
import { FlagIcon } from "@/components/FlagIcon";
// Platform-aware printer: native → expo-print (Save-as-PDF), web → hidden iframe.
import { printHtmlViaIframe, getReceiptPrinterPrefs, setReceiptPrinterPrefs, type ReceiptPrinterPrefs } from "@/utils/printing";
import { formatMoney, formatAmount, currencyLabel, getCurrency, isZeroDecimalCurrency } from "@/lib/currency";
import Constants from "expo-constants";
import ShamCashSettings from "@/components/ShamCashSettings";
import WhatsAppVerify from "@/components/WhatsAppVerify";
import { normalizeStorePhone, isValidStorePhone, storePhonePlaceholder, storeYmd, storeDayStart, formatInStoreTz } from "@/components/store-locale";

/**
 * On web the document is dir="rtl" in Arabic, so a plain "row" already lays
 * out right-to-left; reversing it again would put the layout back to LTR.
 * The manual flip is only for native, where this screen has always done it.
 */
const flipRow = (rtl: boolean) => rtl && Platform.OS !== "web";

/** Alert.alert is a no-op on react-native-web, so web gets window.alert. */
function notify(title: string, message?: string) {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}

/** Cross-platform confirm: Alert buttons do nothing on web. */
function confirmAction(title: string, message: string, confirmLabel: string, cancelLabel: string, onConfirm: () => void) {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && window.confirm(message ? `${title}\n\n${message}` : title)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: cancelLabel, style: "cancel" },
    { text: confirmLabel, style: "destructive", onPress: onConfirm },
  ]);
}

/** Parses a money/number field typed with either "." or "," as decimal mark. */
function parseNum(v: string): number {
  const n = parseFloat(String(v ?? "").replace(",", ".").trim());
  return Number.isFinite(n) ? n : NaN;
}

const escapeHtml = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));

function SettingRow({ icon, label, value, onPress, color, rtl }: { icon: string; label: string; value?: string; onPress?: () => void; color?: string; rtl?: boolean }) {
  const flip = flipRow(!!rtl);
  return (
    <Pressable style={[rowStyles.row, flip && { flexDirection: "row-reverse" }]} onPress={onPress ? () => { playClickSound("light"); onPress(); } : undefined}>
      <View style={[rowStyles.iconWrap, { backgroundColor: (color || Colors.accent) + "20" }, rtl ? { marginLeft: 12, marginRight: 0 } : {}]}>
        <Ionicons name={icon as any} size={20} color={color || Colors.accent} />
      </View>
      <View style={[rowStyles.info, flip && { alignItems: "flex-end" }]}>
        <Text style={[rowStyles.label, rtl && { textAlign: "right" }]}>{label}</Text>
        {value ? <Text style={[rowStyles.value, rtl && { textAlign: "right" }]}>{value}</Text> : null}
      </View>
      {onPress && <Ionicons name={rtl ? "chevron-back" : "chevron-forward"} size={18} color={Colors.textMuted} />}
    </Pressable>
  );
}

const rowStyles = themedStyles((Colors) => ({
  row: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.surface, borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: Colors.cardBorder },
  iconWrap: { width: 40, height: 40, borderRadius: 10, justifyContent: "center", alignItems: "center", marginRight: 12 },
  info: { flex: 1 },
  label: { color: Colors.text, fontSize: 15, fontWeight: "600" },
  value: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
}));

const expenseCategoryColors: Record<string, string> = {
  rent: "#3B82F6",
  utilities: "#F59E0B",
  salaries: "#10B981",
  supplies: "#7C3AED",
  marketing: "#EC4899",
  maintenance: "#F97316",
  other: "#6B7280",
};

const expenseCategories = ["rent", "utilities", "salaries", "supplies", "marketing", "maintenance", "other"];

const poStatusColors: Record<string, string> = {
  draft: Colors.textMuted,
  ordered: Colors.warning,
  received: Colors.success,
};

const EMPTY_SHIFTS: any[] = [];

/** Stripe's payment method ids, rendered the way a shop owner names them. */
const pgMethodNames: Record<string, string> = {
  card: "Card", twint: "TWINT", apple_pay: "Apple Pay", google_pay: "Google Pay",
  link: "Link", klarna: "Klarna", paypal: "PayPal", sepa_debit: "SEPA Direct Debit",
  bancontact: "Bancontact", eps: "EPS", ideal: "iDEAL", sofort: "Sofort",
  revolut_pay: "Revolut Pay", cashapp: "Cash App Pay", alipay: "Alipay", wechat_pay: "WeChat Pay",
};
const pgMethodLabel = (id: string) =>
  pgMethodNames[id] ?? id.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const qc = useQueryClient();
  const { employee, logout, isAdmin, canManage, isCashier } = useAuth();
  const { t, isRTL, language, setLanguage, currency } = useLanguage();
  // Inline copy for strings that have no i18n key yet: (Arabic, German, English).
  const tr3 = (ar: string, de: string, en: string) => (language === "ar" ? ar : language === "de" ? de : en);
  // Dates and times are shown on the store's clock (Asia/Damascus for SYP
  // stores), not the device's, in the UI language with Latin digits.
  const dtLocale = language === "ar" ? "ar-u-nu-latn" : language === "de" ? "de-CH" : "en-GB";
  const fmtDate = (v: any) => (v ? formatInStoreTz(v, dtLocale, { year: "numeric", month: "2-digit", day: "2-digit" }) || "—" : "—");
  const fmtTime = (v: any) => (v ? formatInStoreTz(v, dtLocale, { hour: "2-digit", minute: "2-digit" }) : "");
  const fmtDateTime = (v: any) => (v ? formatInStoreTz(v, dtLocale, { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : "");
  const { tenant } = useLicense();
  const { topPad, bottomPad } = getChromeMetrics(width);
  const tenantId = tenant?.id;
  const poStatusLabel = (st: string) =>
    st === "received" ? tr3("مستلَم", "Erhalten", "Received")
      : st === "ordered" ? tr3("مطلوب", "Bestellt", "Ordered")
      : st === "draft" ? tr3("مسودة", "Entwurf", "Draft")
      : st === "pending" ? t("pending")
      : st || "—";
  const expenseCatLabel = (c: string) => t((c === "salaries" ? "salariesCategory" : c === "other" ? "otherCategory" : c) as any);
  // Manual row flip (native only; web RTL comes from the document direction).
  const rowFlip = flipRow(isRTL);
  // Store currency drives money inputs: SYP has no minor units.
  const zeroDec = isZeroDecimalCurrency(currency);
  const moneyKeyboard = zeroDec ? ("number-pad" as const) : ("decimal-pad" as const);
  const moneyPlaceholder = zeroDec ? "0" : "0.00";
  // Stripe does not operate in Syria: card/wallet options are marked unavailable.
  const stripeUnavailable = String(currency || "").toUpperCase() === "SYP";
  const phonePh = storePhonePlaceholder(currency);
  /** Empty → "", otherwise the store's normalised form; null when invalid. */
  const cleanPhone = (raw: string, original?: string | null): string | null => {
    const v = String(raw ?? "").trim();
    if (!v) return "";
    if (original != null && v === String(original).trim()) return v; // untouched: keep as stored
    if (!isValidStorePhone(v, currency)) return null;
    return normalizeStorePhone(v, currency);
  };
  const invalidPhoneMsg = tr3("رقم الهاتف غير صالح", "Ungültige Telefonnummer", "Invalid phone number");
  // Lists are keyed "/api/x?tenantId=…" (one string), so a plain ["/api/x"]
  // key never matches them; invalidate by prefix instead.
  const invalidatePrefix = (prefix: string) =>
    qc.invalidateQueries({ predicate: (q) => String(q.queryKey[0] ?? "").startsWith(prefix) });
  // Excel downloads need the store's auth headers (a bare window.open sends
  // none), so fetch the file and hand the browser a blob to save.
  const downloadExcel = async (route: string, filename: string) => {
    if (Platform.OS !== "web") {
      require("react-native").Linking.openURL(`${getApiUrl().replace(/\/$/, "")}${route}`).catch(() => {});
      return;
    }
    try {
      const res = await apiRequest("GET", route);
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (e: any) {
      notify(t("error"), apiErrorMessage(e));
    }
  };

  // Landing page config for slug
  // The default queryFn joins queryKey with "/", so we must format the second
  // element as a query string ("?tenantId=…"), NOT a bare ID — otherwise the
  // URL becomes /api/landing-page-config/24 (no route) and 404s in a loop.
  const { data: landingConfigData } = useQuery({
    queryKey: ["/api/landing-page-config", tenantId ? `?tenantId=${tenantId}` : ""],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!tenantId,
  });
  const slug = (landingConfigData as any)?.slug;
  const [showEmployees, setShowEmployees] = useState(false);
  const [showSuppliers, setShowSuppliers] = useState(false);
  const [showBranches, setShowBranches] = useState(false);
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [editEmployee, setEditEmployee] = useState<any>(null);
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [empForm, setEmpForm] = useState({ name: "", pin: "", role: "cashier", email: "", phone: "" });
  const [supForm, setSupForm] = useState({ name: "", contactName: "", email: "", phone: "", paymentTerms: "" });

  const [showExpenses, setShowExpenses] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ description: "", amount: "", category: "other", date: storeYmd(), notes: "" });

  const [showAttendance, setShowAttendance] = useState(false);
  const [activeShiftElapsed, setActiveShiftElapsed] = useState("");

  const [showActivityLog, setShowActivityLog] = useState(false);
  const [showPurchaseOrders, setShowPurchaseOrders] = useState(false);
  const [showPOForm, setShowPOForm] = useState(false);
  const [poForm, setPOForm] = useState({ supplierId: "", notes: "" });

  const [showReturnsManager, setShowReturnsManager] = useState(false);
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [returnForm, setReturnForm] = useState({ originalSaleId: "", reason: "", type: "refund" });
  const [showCashDrawer, setShowCashDrawer] = useState(false);
  const [cashDrawerForm, setCashDrawerForm] = useState({ type: "withdrawal", amount: "", reason: "" });
  const [showWarehouseManager, setShowWarehouseManager] = useState(false);
  const [showBatchManager, setShowBatchManager] = useState(false);
  const [batchView, setBatchView] = useState<"list" | "form">("list");
  const [editBatch, setEditBatch] = useState<any>(null);
  const [batchForm, setBatchForm] = useState({ productId: "", batchNumber: "", quantity: "50", expiryDate: "", costPrice: "", supplierId: "" });
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [showBranchForm, setShowBranchForm] = useState(false);
  const [editBranch, setEditBranch] = useState<any | null>(null);
  const [branchForm, setBranchForm] = useState({ name: "", address: "", phone: "", currency: getCurrency(), taxRate: "" });
  const [showWarehouseForm, setShowWarehouseForm] = useState(false);
  const [warehouseForm, setWarehouseForm] = useState({ name: "", address: "" });
  // Loyalty programme (stored on the tenant's landing_page_config, which the
  // till and the online store both read)
  const [showLoyaltyConfig, setShowLoyaltyConfig] = useState(false);
  const [loyaltyForm, setLoyaltyForm] = useState({ enabled: true, spendPerPoint: "", pointValue: "", minRedeem: "" });

  // Receipt printer: per-device preferences, read by utils/printing
  const [showPrinterSettings, setShowPrinterSettings] = useState(false);
  const [printerPrefs, setPrinterPrefsState] = useState<ReceiptPrinterPrefs>(getReceiptPrinterPrefs());
  const updatePrinterPrefs = (next: Partial<ReceiptPrinterPrefs>) => setPrinterPrefsState(setReceiptPrinterPrefs(next));
  const [showStoreSettings, setShowStoreSettings] = useState(false);
  const [storeForm, setStoreForm] = useState({ name: "", address: "", phone: "", email: "", storeType: "supermarket", taxRate: "", deliveryFee: "" });
  const [storeLogo, setStoreLogo] = useState<string | null>(null);
  const [storeLogoUploading, setStoreLogoUploading] = useState(false);

  // Public Storefront editor (edits the public store page shown at /store/<slug>)
  const [showStorefront, setShowStorefront] = useState(false);
  const [storefrontForm, setStorefrontForm] = useState({
    heroTitle: "", heroSubtitle: "", aboutText: "", promoText: "",
    primaryColor: "#2FD3C6", accentColor: "#6366F1",
    enableDelivery: true, enablePickup: true, enableOnlineOrdering: true,
    acceptCard: true, acceptCash: true, acceptMobile: true,
    minOrderAmount: "", estimatedDeliveryTime: "", deliveryRadius: "", openingHours: "",
    phone: "", email: "", address: "", footerText: "",
    socialWhatsapp: "", socialInstagram: "", socialFacebook: "",
    paymentInstructions: "", bankName: "", bankAccountHolder: "", bankIban: "", twintNumber: "",
  });

  const [showShiftMonitor, setShowShiftMonitor] = useState(false);
  const [shiftMonitorTab, setShiftMonitorTab] = useState<"active" | "history" | "settings">("active");
  const [defaultShiftDuration, setDefaultShiftDuration] = useState("8");
  const [activeShiftsElapsed, setActiveShiftsElapsed] = useState<Record<number, string>>({});

  const [showNotifications, setShowNotifications] = useState(false);
  const [showPaymentGateway, setShowPaymentGateway] = useState(false);
  const [pgTestResult, setPgTestResult] = useState<any>(null);
  const [pgTesting, setPgTesting] = useState(false);
  const [pgPending, setPgPending] = useState<{ key: string; val: boolean } | null>(null);

  const [showBulkImport, setShowBulkImport] = useState(false);
  const [importType, setImportType] = useState<"products" | "customers">("products");
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  // Vehicles
  const [showVehicles, setShowVehicles] = useState(false);
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [editVehicle, setEditVehicle] = useState<any>(null);
  const [vehicleForm, setVehicleForm] = useState({ licensePlate: "", make: "", model: "", color: "", driverName: "", driverPhone: "", notes: "" });

  // Advanced Printer Config
  const [showPrinterConfig, setShowPrinterConfig] = useState(false);
  const [printerConfigData, setPrinterConfigData] = useState<Record<string, { printer1: string; printer2: string }>>({});

  // Daily Closing
  const [showDailyClosing, setShowDailyClosing] = useState(false);
  const [dailyClosingForm, setDailyClosingForm] = useState({ openingCash: "", closingCash: "", notes: "" });
  const [dailyClosingLoading, setDailyClosingLoading] = useState(false);

  // Monthly Closing
  const [showMonthlyClosing, setShowMonthlyClosing] = useState(false);
  const [monthlyClosingForm, setMonthlyClosingForm] = useState({ notes: "" });
  const [monthlyClosingLoading, setMonthlyClosingLoading] = useState(false);

  // Accounts Receivable
  const [showAccountsReceivable, setShowAccountsReceivable] = useState(false);
  const [leftHandMode, setLeftHandMode] = useState(false);
  useEffect(() => {
    import("@react-native-async-storage/async-storage").then(({ default: AsyncStorage }) => {
      AsyncStorage.getItem("barmagly_left_hand_mode").then((v) => {
        if (v === "true") setLeftHandMode(true);
      });
    });
  }, []);
  const toggleLeftHandMode = (val: boolean) => {
    setLeftHandMode(val);
    import("@react-native-async-storage/async-storage").then(({ default: AsyncStorage }) => {
      AsyncStorage.setItem("barmagly_left_hand_mode", val ? "true" : "false");
    });
  };
  // Shift monitor's default shift length: remembered on this device.
  useEffect(() => {
    import("@react-native-async-storage/async-storage").then(({ default: AsyncStorage }) => {
      AsyncStorage.getItem("kassenta_default_shift_hours").then((v) => {
        if (v && Number(v) > 0) setDefaultShiftDuration(v);
      });
    });
  }, []);
  const changeDefaultShiftDuration = (val: string) => {
    setDefaultShiftDuration(val);
    if (Number(val) > 0) {
      import("@react-native-async-storage/async-storage").then(({ default: AsyncStorage }) => {
        AsyncStorage.setItem("kassenta_default_shift_hours", val);
      });
    }
  };

  const { data: employees = [] } = useQuery<any[]>({ queryKey: [tenant?.id ? `/api/employees?tenantId=${tenant.id}` : "/api/employees"], queryFn: getQueryFn({ on401: "throw" }), enabled: !!tenant?.id && canManage });
  const { data: suppliers = [] } = useQuery<any[]>({ queryKey: [tenant?.id ? `/api/suppliers?tenantId=${tenant.id}` : "/api/suppliers"], queryFn: getQueryFn({ on401: "throw" }), enabled: !!tenant?.id && canManage });
  const { data: branches = [] } = useQuery<any[]>({ queryKey: [tenant?.id ? `/api/branches?tenantId=${tenant.id}` : "/api/branches"], queryFn: getQueryFn({ on401: "throw" }), enabled: !!tenant?.id && canManage });
  const { data: shifts = [] } = useQuery<any[]>({ queryKey: [tenant?.id ? `/api/shifts?tenantId=${tenant.id}` : "/api/shifts"], queryFn: getQueryFn({ on401: "throw" }), enabled: !!tenant?.id && canManage });
  const { data: expenses = [] } = useQuery<any[]>({ queryKey: [tenant?.id ? `/api/expenses?tenantId=${tenant.id}` : "/api/expenses"], queryFn: getQueryFn({ on401: "throw" }), enabled: !!tenant?.id && canManage });
  const { data: purchaseOrders = [] } = useQuery<any[]>({ queryKey: [tenant?.id ? `/api/purchase-orders?tenantId=${tenant.id}` : "/api/purchase-orders"], queryFn: getQueryFn({ on401: "throw" }), enabled: !!tenant?.id && canManage });
  const { data: activityLog = [] } = useQuery<any[]>({ queryKey: [tenant?.id ? `/api/activity-log?tenantId=${tenant.id}` : "/api/activity-log"], queryFn: getQueryFn({ on401: "throw" }), enabled: !!tenant?.id && canManage });
  const { data: returns = [] } = useQuery<any[]>({ queryKey: [tenant?.id ? `/api/returns?tenantId=${tenant.id}` : "/api/returns"], queryFn: getQueryFn({ on401: "throw" }), enabled: !!tenant?.id && canManage });
  const { data: salesList = [] } = useQuery<any[]>({ queryKey: [tenant?.id ? `/api/sales?limit=50&tenantId=${tenant.id}` : "/api/sales?limit=50"], queryFn: getQueryFn({ on401: "throw" }), enabled: !!tenant?.id && canManage });
  const { data: warehousesList = [] } = useQuery<any[]>({ queryKey: [tenant?.id ? `/api/warehouses?tenantId=${tenant.id}` : "/api/warehouses"], queryFn: getQueryFn({ on401: "throw" }), enabled: !!tenant?.id && canManage });
  const { data: batchesList = [] } = useQuery<any[]>({ queryKey: [tenant?.id ? `/api/product-batches?tenantId=${tenant.id}` : "/api/product-batches"], queryFn: getQueryFn({ on401: "throw" }), enabled: !!tenant?.id && canManage });
  const { data: productsList = [] } = useQuery<any[]>({ queryKey: [tenant?.id ? `/api/products?tenantId=${tenant.id}` : "/api/products"], queryFn: getQueryFn({ on401: "throw" }), enabled: !!tenant?.id && canManage });
  // Same key shape as the till (index.tsx), so both share one cache entry and
  // a save here refreshes the till's receipt header too.
  const { data: storeSettings } = useQuery<any>({ queryKey: ["/api/store-settings", tenantId ? `?tenantId=${tenantId}` : ""], queryFn: getQueryFn({ on401: "throw" }), enabled: !!tenant?.id });
  // The route is public (checkout reads it), so the licence never scopes it:
  // without ?tenantId the server answers with the platform default settings.
  const { data: pgConfig, refetch: refetchPgConfig } = useQuery<any>({ queryKey: ["/api/payment-gateway/config", tenantId ? `?tenantId=${tenantId}` : ""], queryFn: getQueryFn({ on401: "throw" }), enabled: isAdmin && !!tenantId });
  // Live account health. It hits Stripe on the server, so it only runs while
  // the Payment Gateways sheet is open. Answers 200 with { connected:false }
  // when the keys are missing — a thrown error here means our own server is
  // unreachable, not that Stripe is misconfigured.
  const { data: pgHealth, refetch: refetchPgHealth } = useQuery<any>({ queryKey: ["/api/payments/health"], queryFn: getQueryFn({ on401: "returnNull" }), enabled: isAdmin && showPaymentGateway, staleTime: 30000, retry: false });
  const { data: vehiclesList = [] } = useQuery<any[]>({ queryKey: [tenant?.id ? `/api/vehicles?tenantId=${tenant.id}` : "/api/vehicles"], queryFn: getQueryFn({ on401: "throw" }), enabled: !!tenant?.id && canManage });
  const { data: printerConfigsList = [] } = useQuery<any[]>({ queryKey: [tenant?.id ? `/api/printer-configs?tenantId=${tenant.id}` : "/api/printer-configs"], queryFn: getQueryFn({ on401: "throw" }), enabled: !!tenant?.id && canManage });
  const { data: dailyClosingsList = [] } = useQuery<any[]>({ queryKey: [tenant?.id ? `/api/daily-closings?tenantId=${tenant.id}` : "/api/daily-closings"], queryFn: getQueryFn({ on401: "throw" }), enabled: !!tenant?.id && canManage });
  const { data: monthlyClosingsList = [] } = useQuery<any[]>({ queryKey: [tenant?.id ? `/api/monthly-closings?tenantId=${tenant.id}` : "/api/monthly-closings"], queryFn: getQueryFn({ on401: "throw" }), enabled: !!tenant?.id && canManage });
  const { data: customersList = [] } = useQuery<any[]>({ queryKey: [tenant?.id ? `/api/customers?tenantId=${tenant.id}` : "/api/customers"], queryFn: getQueryFn({ on401: "throw" }), enabled: !!tenant?.id && showAccountsReceivable });

  const { data: allActiveShiftsRaw } = useQuery<any[]>({
    queryKey: [tenant?.id ? `/api/shifts/active?tenantId=${tenant.id}` : "/api/shifts/active"],
    queryFn: getQueryFn({ on401: "throw" }),
    refetchInterval: 30000,
    enabled: isAdmin && !!tenant?.id,
  });
  const allActiveShifts = allActiveShiftsRaw ?? EMPTY_SHIFTS;

  const { data: notificationsList = [] } = useQuery<any[]>({
    queryKey: [`/api/notifications/${employee?.id}`],
    queryFn: getQueryFn({ on401: "throw" }),
    refetchInterval: 30000,
    enabled: !!employee?.id,
  });

  const { data: unreadCountData } = useQuery<{ count: number }>({
    queryKey: [`/api/notifications/${employee?.id}/unread-count`],
    queryFn: getQueryFn({ on401: "throw" }),
    refetchInterval: 30000,
    enabled: !!employee?.id,
  });

  const unreadCount = unreadCountData?.count || 0;

  // "Sync status" row: a real round trip to the server (and its database).
  const { data: healthData, isError: healthError } = useQuery<any>({
    queryKey: ["/api/health"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    refetchInterval: 60000,
    retry: false,
  });
  const serverReachable = !healthError && healthData?.ok !== false;

  const activeShift = shifts.find((s: any) => s.employeeId === employee?.id && s.startTime && !s.endTime && s.status === "open");
  // The employee's own branch, else this store's main branch. Expenses, shifts
  // and purchase orders used to be written to branch 1 — another store's.
  const myBranchId: number | null = employee?.branchId || storeSettings?.id || branches[0]?.id || null;

  useEffect(() => {
    if (!activeShift) {
      setActiveShiftElapsed("");
      return;
    }
    const interval = setInterval(() => {
      const elapsed = Date.now() - new Date(activeShift.startTime).getTime();
      const hours = Math.floor(elapsed / 3600000);
      const mins = Math.floor((elapsed % 3600000) / 60000);
      const secs = Math.floor((elapsed % 60000) / 1000);
      setActiveShiftElapsed(`${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [activeShift]);

  const empQueryKey = tenant?.id ? `/api/employees?tenantId=${tenant.id}` : "/api/employees";

  const createEmpMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/employees", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [empQueryKey] }); setShowEmployeeForm(false); },
    onError: (e: any) => notify(t("error"), apiErrorMessage(e)),
  });

  const updateEmpMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest("PUT", `/api/employees/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [empQueryKey] }); setShowEmployeeForm(false); setEditEmployee(null); },
    onError: (e: any) => notify(t("error"), apiErrorMessage(e)),
  });

  const deleteEmpMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/employees/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).includes("/api/employees") });
    },
    onError: (e: any) => notify(t("error"), apiErrorMessage(e)),
  });

  const empSaving = createEmpMutation.isPending || updateEmpMutation.isPending;

  const createSupMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/suppliers", { ...data, tenantId: tenant?.id }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [tenant?.id ? `/api/suppliers?tenantId=${tenant.id}` : "/api/suppliers"] }); setShowSupplierForm(false); },
    onError: (e: any) => notify(t("error"), apiErrorMessage(e)),
  });

  const createExpenseMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/expenses", { ...data, tenantId: tenant?.id }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [tenant?.id ? `/api/expenses?tenantId=${tenant.id}` : "/api/expenses"] }); setShowExpenseForm(false); },
    onError: (e: any) => notify(t("error"), apiErrorMessage(e)),
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/expenses/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [tenant?.id ? `/api/expenses?tenantId=${tenant.id}` : "/api/expenses"] }); },
    onError: (e: any) => notify(t("error"), apiErrorMessage(e)),
  });

  // Public Storefront editor: filled from the saved config on load and again
  // every time it is opened, so abandoned edits never linger.
  const storefrontFromConfig = (c: any) => ({
      heroTitle: c.heroTitle || "",
      heroSubtitle: c.heroSubtitle || "",
      aboutText: c.aboutText || "",
      promoText: c.promoText || "",
      primaryColor: c.primaryColor || "#2FD3C6",
      accentColor: c.accentColor || "#6366F1",
      enableDelivery: c.enableDelivery !== false,
      enablePickup: c.enablePickup !== false,
      enableOnlineOrdering: c.enableOnlineOrdering !== false,
      acceptCard: c.acceptCard !== false,
      acceptCash: c.acceptCash !== false,
      acceptMobile: c.acceptMobile !== false,
      minOrderAmount: c.minOrderAmount != null ? (zeroDec ? String(Math.round(Number(c.minOrderAmount) || 0)) : String(c.minOrderAmount)) : "",
      estimatedDeliveryTime: c.estimatedDeliveryTime != null ? String(c.estimatedDeliveryTime) : "",
      deliveryRadius: c.deliveryRadius || "",
      openingHours: c.openingHours || "",
      phone: c.phone || "",
      email: c.email || "",
      address: c.address || "",
      footerText: c.footerText || "",
      socialWhatsapp: c.socialWhatsapp || "",
      socialInstagram: c.socialInstagram || "",
      socialFacebook: c.socialFacebook || "",
      paymentInstructions: c.paymentInstructions || "",
      bankName: c.bankName || "",
      bankAccountHolder: c.bankAccountHolder || "",
      bankIban: c.bankIban || "",
      twintNumber: c.twintNumber || "",
  });
  useEffect(() => {
    if (landingConfigData) setStorefrontForm(storefrontFromConfig(landingConfigData));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [landingConfigData]);

  const saveStorefrontMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PUT", "/api/tenant/landing-config", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/landing-page-config", tenantId ? `?tenantId=${tenantId}` : ""] });
      setShowStorefront(false);
      notify(t("saved") || "Saved", t("storefrontUpdated") || "Storefront updated");
    },
    onError: (e: any) => notify(t("error"), apiErrorMessage(e)),
  });

  // The decimal/int columns reject "" (MySQL strict mode), so blank numbers
  // are sent as their defaults; phones are normalised like everywhere else.
  const handleSaveStorefront = () => {
    const f = storefrontForm;
    const c: any = landingConfigData || {};
    const minOrder = f.minOrderAmount.trim() === "" ? 0 : parseNum(f.minOrderAmount);
    if (!(minOrder >= 0)) return notify(t("error"), tr3("الحد الأدنى للطلب غير صالح", "Ungültiger Mindestbestellwert", "Invalid minimum order amount"));
    const eta = f.estimatedDeliveryTime.trim() === "" ? 30 : parseInt(f.estimatedDeliveryTime, 10);
    if (!(eta >= 0) || eta > 1440) return notify(t("error"), tr3("وقت التوصيل غير صالح", "Ungültige Lieferzeit", "Invalid delivery time"));
    const hex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
    if (!hex.test(f.primaryColor.trim()) || !hex.test(f.accentColor.trim())) {
      return notify(t("error"), tr3("اللون يجب أن يكون بصيغة ‎#RRGGBB", "Farben im Format #RRGGBB angeben", "Colours must be in #RRGGBB format"));
    }
    const phone = cleanPhone(f.phone, c.phone);
    const wa = cleanPhone(f.socialWhatsapp, c.socialWhatsapp);
    if (phone === null || wa === null) return notify(t("error"), invalidPhoneMsg);
    saveStorefrontMutation.mutate({
      ...f,
      primaryColor: f.primaryColor.trim(),
      accentColor: f.accentColor.trim(),
      minOrderAmount: zeroDec ? String(Math.round(minOrder)) : minOrder.toFixed(2),
      estimatedDeliveryTime: eta,
      phone,
      socialWhatsapp: wa,
    });
  };

  // ── Loyalty programme ───────────────────────────────────────────────────
  // Stored as landing_page_config.loyalty_* (the columns the online store and
  // POST /api/sales read). The screen speaks "spend X for 1 point", which
  // stays readable for SYP (1 point per 1,000) as well as CHF (1 per 10).
  const lc: any = landingConfigData || {};
  const loyaltyEnabled = lc.enableLoyalty !== false;
  const loyaltyPointsPerUnit = Number(lc.loyaltyPointsPerUnit ?? 1) || 0;
  const loyaltySpendPerPoint = loyaltyPointsPerUnit > 0 ? Number((1 / loyaltyPointsPerUnit).toFixed(2)) : 0;
  const openLoyaltyConfig = () => {
    setLoyaltyForm({
      enabled: loyaltyEnabled,
      spendPerPoint: loyaltySpendPerPoint > 0 ? String(loyaltySpendPerPoint) : "",
      pointValue: String(Number(lc.loyaltyRedemptionRate ?? 0.01)),
      minRedeem: String(Number(lc.loyaltyMinRedeemPoints) || 0),
    });
    setShowLoyaltyConfig(true);
  };
  const saveLoyaltyMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PUT", "/api/tenant/landing-config", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/landing-page-config", tenantId ? `?tenantId=${tenantId}` : ""] });
      setShowLoyaltyConfig(false);
      notify(t("success"), tr3("تم حفظ إعدادات الولاء", "Treueprogramm gespeichert", "Loyalty settings saved"));
    },
    onError: (e: any) => notify(t("error"), apiErrorMessage(e)),
  });
  const handleSaveLoyalty = () => {
    const spend = parseFloat(loyaltyForm.spendPerPoint.replace(",", "."));
    const value = parseFloat(loyaltyForm.pointValue.replace(",", "."));
    const minRedeem = parseInt(loyaltyForm.minRedeem || "0", 10);
    // decimal(14,6): below 1 point per 1,000,000 the rate would round to zero.
    if (!(spend > 0) || spend > 1000000) {
      return notify(t("error"), tr3("أدخل مبلغاً صحيحاً لكسب نقطة واحدة", "Bitte einen gültigen Betrag pro Punkt eingeben", "Enter a valid amount per point"));
    }
    if (!(value >= 0) || value > 1000000) {
      return notify(t("error"), tr3("أدخل قيمة صحيحة للنقطة", "Bitte einen gültigen Punktwert eingeben", "Enter a valid point value"));
    }
    saveLoyaltyMutation.mutate({
      enableLoyalty: loyaltyForm.enabled,
      loyaltyPointsPerUnit: (1 / spend).toFixed(6),
      loyaltyRedemptionRate: value.toFixed(4),
      loyaltyMinRedeemPoints: Number.isFinite(minRedeem) && minRedeem > 0 ? minRedeem : 0,
    });
  };

  const shiftsQueryKey = tenant?.id ? `/api/shifts?tenantId=${tenant.id}` : "/api/shifts";
  const activeShiftsQueryKey = tenant?.id ? `/api/shifts/active?tenantId=${tenant.id}` : "/api/shifts/active";

  const clockInMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/shifts", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [shiftsQueryKey] }); },
    onError: (e: any) => notify(t("error"), apiErrorMessage(e)),
  });

  const clockOutMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest("PUT", `/api/shifts/${id}/close`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [shiftsQueryKey] });
      qc.invalidateQueries({ queryKey: [activeShiftsQueryKey] });
    },
    onError: (e: any) => notify(t("error"), apiErrorMessage(e)),
  });

  const forceCloseShiftMutation = useMutation({
    mutationFn: (id: number) => apiRequest("PUT", `/api/shifts/${id}/close`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [shiftsQueryKey] });
      qc.invalidateQueries({ queryKey: [activeShiftsQueryKey] });
      notify(t("success"), t("shiftForceClosed"));
    },
    onError: (e: any) => notify(t("error"), apiErrorMessage(e)),
  });

  const markNotificationReadMutation = useMutation({
    mutationFn: (id: number) => apiRequest("PUT", `/api/notifications/${id}/read`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/notifications/${employee?.id}`] });
      qc.invalidateQueries({ queryKey: [`/api/notifications/${employee?.id}/unread-count`] });
    },
    onError: (e: any) => notify(t("error"), apiErrorMessage(e)),
  });

  const markAllNotificationsReadMutation = useMutation({
    mutationFn: () => apiRequest("PUT", `/api/notifications/${employee?.id}/read-all`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/notifications/${employee?.id}`] });
      qc.invalidateQueries({ queryKey: [`/api/notifications/${employee?.id}/unread-count`] });
    },
    onError: (e: any) => notify(t("error"), apiErrorMessage(e)),
  });

  const [applyingShiftHours, setApplyingShiftHours] = useState(false);

  const createPOMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/purchase-orders", { ...data, tenantId: tenant?.id }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [tenant?.id ? `/api/purchase-orders?tenantId=${tenant.id}` : "/api/purchase-orders"] }); setShowPOForm(false); },
    onError: (e: any) => notify(t("error"), apiErrorMessage(e)),
  });

  const receivePOMutation = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/purchase-orders/${id}/receive`, { items: [] }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [tenant?.id ? `/api/purchase-orders?tenantId=${tenant.id}` : "/api/purchase-orders"] }); },
    onError: (e: any) => notify(t("error"), apiErrorMessage(e)),
  });

  const createReturnMutation = useMutation({
    mutationFn: async (data: any) => {
      const sale = salesList.find((s: any) => String(s.id) === String(data.originalSaleId));
      if (!sale) throw new Error(t("saleNotFound"));
      const saleRes = await apiRequest("GET", `/api/sales/${sale.id}`);
      const saleDetail = await saleRes.json();
      const returnItems = (saleDetail.items || []).map((item: any) => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.total,
      }));
      return apiRequest("POST", "/api/returns", {
        originalSaleId: Number(data.originalSaleId),
        employeeId: employee?.id,
        reason: data.reason,
        type: data.type,
        totalAmount: sale.totalAmount,
        refundMethod: sale.paymentMethod,
        branchId: myBranchId,
        tenantId: tenant?.id,
        items: returnItems,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [tenant?.id ? `/api/returns?tenantId=${tenant.id}` : "/api/returns"] });
      qc.invalidateQueries({ queryKey: [tenant?.id ? `/api/sales?limit=50&tenantId=${tenant.id}` : "/api/sales?limit=50"] });
      invalidatePrefix("/api/inventory");
      invalidatePrefix("/api/products");
      setShowReturnForm(false);
      setReturnForm({ originalSaleId: "", reason: "", type: "refund" });
      notify(t("success"), t("returnProcessed"));
    },
    onError: (e: any) => notify(t("error"), apiErrorMessage(e)),
  });

  const cashDrawerMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/cash-drawer", data),
    onSuccess: () => {
      invalidatePrefix("/api/shifts");
      setCashDrawerForm({ type: "withdrawal", amount: "", reason: "" });
      notify(t("success"), t("cashDrawerRecorded"));
    },
    onError: (e: any) => notify(t("error"), apiErrorMessage(e)),
  });

  const createWarehouseMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/warehouses", data),
    onSuccess: () => { invalidatePrefix("/api/warehouses"); setShowWarehouseForm(false); },
    onError: (e: any) => notify(t("error"), apiErrorMessage(e)),
  });

  const createBranchMutation = useMutation({
    mutationFn: (data: any) => {
      const payload = { ...data, tenantId: tenant?.id };
      if (editBranch) return apiRequest("PUT", `/api/branches/${editBranch.id}`, payload);
      return apiRequest("POST", "/api/branches", payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [tenant?.id ? `/api/branches?tenantId=${tenant.id}` : "/api/branches"] });
      // The branch currency drives every price display; refetching store
      // settings pushes a changed main-branch currency into lib/currency.
      qc.invalidateQueries({ queryKey: ["/api/store-settings"] });
      setShowBranchForm(false); setEditBranch(null);
    },
    onError: (e: any) => notify(t("error"), apiErrorMessage(e)),
  });

  const deleteBranchMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/branches/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [tenant?.id ? `/api/branches?tenantId=${tenant.id}` : "/api/branches"] }); },
    onError: (e: any) => notify(t("error"), apiErrorMessage(e)),
  });

  const createBatchMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/product-batches", data),
    onSuccess: () => { invalidatePrefix("/api/product-batches"); },
    onError: (e: any) => notify(t("error"), apiErrorMessage(e)),
  });

  const updateBatchMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest("PUT", `/api/product-batches/${id}`, data),
    onSuccess: () => { invalidatePrefix("/api/product-batches"); },
    onError: (e: any) => notify(t("error"), apiErrorMessage(e)),
  });
  const deleteBatchMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/product-batches/${id}`),
    onSuccess: () => { invalidatePrefix("/api/product-batches"); },
    onError: (e: any) => notify(t("error"), apiErrorMessage(e)),
  });

  const batchSaving = createBatchMutation.isPending || updateBatchMutation.isPending;

  const updateStoreSettingsMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PUT", "/api/store-settings", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/store-settings"] }); setShowStoreSettings(false); notify(t("success"), t("storeSettingsSaved")); },
    onError: (e: any) => notify(t("error"), apiErrorMessage(e)),
  });

  const storeSaving = storeLogoUploading || updateStoreSettingsMutation.isPending;

  const pickStoreLogo = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images' as ImagePicker.MediaType,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (!result.canceled && result.assets[0]) {
        setStoreLogo(result.assets[0].uri);
      }
    } catch (e: any) {
      notify(t("error"), apiErrorMessage(e));
    }
  };

  // The logo is uploaded as a file and the branch keeps its path: a base64
  // data URI in branches.logo (a TEXT column, 64 KB) fails or gets cut off
  // for an ordinary phone photo.
  const uploadLogo = async (uri: string): Promise<string> => {
    const blob = await (await fetch(uri)).blob();
    const base64: string = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result).split(",")[1] || "");
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    if (!base64) throw new Error(tr3("تعذّر قراءة الصورة", "Bild konnte nicht gelesen werden", "Could not read the image"));
    const res = await apiRequest("POST", "/api/objects/upload", { imageData: base64, contentType: blob.type || "image/jpeg" });
    const { objectPath } = await res.json();
    if (!objectPath) throw new Error(tr3("فشل رفع الصورة", "Bild-Upload fehlgeschlagen", "Image upload failed"));
    return objectPath;
  };

  const handleSaveStoreSettings = async () => {
    const name = storeForm.name.trim();
    if (!name) return notify(t("error"), tr3("اسم المتجر مطلوب", "Name des Geschäfts ist erforderlich", "Store name is required"));
    const taxRate = storeForm.taxRate.trim() === "" ? 0 : parseNum(storeForm.taxRate);
    if (!(taxRate >= 0 && taxRate <= 100)) return notify(t("error"), tr3("نسبة الضريبة يجب أن تكون بين 0 و100", "Steuersatz muss zwischen 0 und 100 liegen", "Tax rate must be between 0 and 100"));
    const deliveryFee = storeForm.deliveryFee.trim() === "" ? 0 : parseNum(storeForm.deliveryFee);
    if (!(deliveryFee >= 0)) return notify(t("error"), tr3("رسوم التوصيل غير صالحة", "Ungültige Liefergebühr", "Invalid delivery fee"));
    const email = storeForm.email.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return notify(t("error"), tr3("البريد الإلكتروني غير صالح", "Ungültige E-Mail-Adresse", "Invalid email address"));
    const phone = cleanPhone(storeForm.phone, storeSettings?.phone);
    if (phone === null) return notify(t("error"), invalidPhoneMsg);

    // null = removed, a stored path/URL = unchanged, anything else = a new pick.
    let logo: string | null = storeLogo;
    if (storeLogo && storeLogo !== storeSettings?.logo && !/^(\/objects|\/api\/objects|\/uploads|https?:)/.test(storeLogo)) {
      setStoreLogoUploading(true);
      try {
        logo = await uploadLogo(storeLogo);
      } catch (e: any) {
        setStoreLogoUploading(false);
        return notify(t("error"), apiErrorMessage(e));
      }
      setStoreLogoUploading(false);
    }
    updateStoreSettingsMutation.mutate({
      tenantId: tenant?.id,
      name,
      // Empty strings are sent on purpose so a cleared field really clears.
      address: storeForm.address.trim(),
      phone,
      email,
      logo: logo || null,
      storeType: storeForm.storeType || "supermarket",
      taxRate: taxRate.toFixed(2),
      deliveryFee: zeroDec ? String(Math.round(deliveryFee)) : deliveryFee.toFixed(2),
    });
  };

  // Vehicle mutations
  const createVehicleMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/vehicles", { ...data, tenantId: tenant?.id, branchId: myBranchId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [tenant?.id ? `/api/vehicles?tenantId=${tenant.id}` : "/api/vehicles"] }); setShowVehicleForm(false); setEditVehicle(null); },
    onError: (e: any) => notify(t("error"), apiErrorMessage(e)),
  });
  const updateVehicleMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest("PUT", `/api/vehicles/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [tenant?.id ? `/api/vehicles?tenantId=${tenant.id}` : "/api/vehicles"] }); setShowVehicleForm(false); setEditVehicle(null); },
    onError: (e: any) => notify(t("error"), apiErrorMessage(e)),
  });
  const deleteVehicleMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/vehicles/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [tenant?.id ? `/api/vehicles?tenantId=${tenant.id}` : "/api/vehicles"] }); },
    onError: (e: any) => notify(t("error"), apiErrorMessage(e)),
  });
  const vehicleSaving = createVehicleMutation.isPending || updateVehicleMutation.isPending;

  // Printer config save
  const savePrinterConfigMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/printer-configs", { ...data, tenantId: tenant?.id }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [tenant?.id ? `/api/printer-configs?tenantId=${tenant.id}` : "/api/printer-configs"] }); notify(t("success"), t("printerConfigSaved")); },
    onError: (e: any) => notify(t("error"), apiErrorMessage(e)),
  });

  const rtlTextAlign = isRTL ? { textAlign: "right" as const } : {};

  useEffect(() => {
    if (!allActiveShifts || allActiveShifts.length === 0) {
      setActiveShiftsElapsed((prev) => Object.keys(prev).length === 0 ? prev : {});
      return;
    }
    const interval = setInterval(() => {
      const newElapsed: Record<number, string> = {};
      allActiveShifts.forEach((s: any) => {
        if (s.startTime) {
          const elapsed = Date.now() - new Date(s.startTime).getTime();
          const hours = Math.floor(elapsed / 3600000);
          const mins = Math.floor((elapsed % 3600000) / 60000);
          const secs = Math.floor((elapsed % 60000) / 1000);
          newElapsed[s.id] = `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
        }
      });
      setActiveShiftsElapsed(newElapsed);
    }, 1000);
    return () => clearInterval(interval);
  }, [allActiveShifts]);

  const getShiftProgress = useCallback((shift: any) => {
    const expectedHours = Number(shift.expectedDurationHours || defaultShiftDuration || 8);
    const elapsed = Date.now() - new Date(shift.startTime).getTime();
    const elapsedHours = elapsed / 3600000;
    const progress = Math.min(elapsedHours / expectedHours, 1.5);
    const isOvertime = elapsedHours > expectedHours;
    return { progress, isOvertime, elapsedHours, expectedHours };
  }, [defaultShiftDuration]);

  const getNotificationIcon = useCallback((type: string): { name: string; color: string } => {
    switch (type) {
      case "shift_started": return { name: "play-circle", color: Colors.success };
      case "shift_ended": return { name: "stop-circle", color: Colors.warning };
      case "sale_completed": return { name: "cart", color: Colors.accent };
      case "return_processed": return { name: "swap-horizontal", color: Colors.danger };
      case "cash_drawer": return { name: "cash", color: Colors.hueAmber };
      default: return { name: "notifications", color: Colors.info };
    }
  }, []);

  const getTimeAgo = useCallback((dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return t("justNow");
    if (mins < 60) return `${mins}${t("minutesAgo")}`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}${t("hoursAgo")}`;
    const days = Math.floor(hours / 24);
    return `${days}${t("daysAgo")}`;
  }, [t]);

  const closedShifts = shifts.filter((s: any) => s.endTime && s.status === "closed");

  const roleColors: Record<string, string> = { admin: Colors.danger, manager: Colors.warning, cashier: Colors.info, owner: Colors.secondary };

  const formatDuration = (startTime: string, endTime: string) => {
    const ms = new Date(endTime).getTime() - new Date(startTime).getTime();
    const hours = Math.floor(ms / 3600000);
    const mins = Math.floor((ms % 3600000) / 60000);
    return `${hours}h ${mins}m`;
  };

  // ── Payment gateway: what the server actually reports ───────────────────
  // /api/payments/health is the fuller picture (it retrieves the account), so
  // it wins when it has answered; /api/payment-gateway/config is the fallback.
  const stripeConnected = pgHealth ? pgHealth.connected === true : pgConfig?.stripe?.status === "connected";
  const stripeMode: string | null = pgHealth?.mode || pgConfig?.stripe?.mode || null;
  const hasPublishableKey = !!pgConfig?.stripe?.publishableKey;
  // Never a hardcoded list: this is what the Stripe account itself offers.
  const accountMethods: string[] = pgHealth?.methods ?? pgConfig?.stripe?.availableMethods ?? [];

  const runStripeTest = async () => {
    setPgTesting(true);
    setPgTestResult(null);
    try {
      const res = await apiRequest("POST", "/api/payment-gateway/test-stripe");
      const data = await res.json();
      // data.error is Stripe's own text and can carry a request id or a key
      // fragment, so it is classified here and then dropped - it never reaches
      // the screen.
      setPgTestResult({
        success: !!data?.success,
        mode: data?.mode ?? null,
        country: data?.country ?? null,
        defaultCurrency: data?.defaultCurrency ?? null,
        chargesEnabled: data?.chargesEnabled ?? null,
        payoutsEnabled: data?.payoutsEnabled ?? null,
        reason: data?.success ? null : /not configured|STRIPE_SECRET_KEY/i.test(String(data?.error ?? "")) ? "missingKeys" : "unreachable",
      });
    } catch {
      setPgTestResult({ success: false, reason: "unreachable" });
    }
    refetchPgHealth();
    refetchPgConfig();
    setPgTesting(false);
  };

  // ── Staff report (Personalbericht): today's orders with delivery address ──
  // The server endpoint is not tenant-scoped (see report), so rows are kept
  // only when they were rung up by one of this store's own employees.
  const printStaffReport = async (silentWhenEmpty: boolean) => {
    const today = storeYmd();
    const res = await apiRequest("GET", `/api/reports/daily-sales-report?date=${today}${tenantId ? `&tenantId=${tenantId}` : ""}`);
    const raw: any[] = await res.json();
    const ownIds = new Set(employees.map((e: any) => e.id));
    const salesData = (Array.isArray(raw) ? raw : []).filter((s: any) => ownIds.has(s.employeeId));
    if (salesData.length === 0) {
      if (!silentWhenEmpty) notify(tr3("تقرير الموظفين", "Personalbericht", "Staff report"), tr3("لا توجد طلبات اليوم.", "Keine Bestellungen für heute gefunden.", "No orders found for today."));
      return;
    }
    const locale = dtLocale;
    const storeName = escapeHtml((storeSettings as any)?.name || tenant?.name || "POS");
    const dateStr = escapeHtml(formatInStoreTz(new Date(), locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" }));
    const cashierName = escapeHtml(employee?.name || "");
    const total = salesData.reduce((sum: number, sale: any) => sum + Number(sale.totalAmount || 0), 0);
    const rowsHtml = salesData.map((sale: any, idx: number) => {
      const parts = String(sale.customerAddress || "").split(",");
      const street = escapeHtml(parts[0]?.trim() || "–");
      const city = escapeHtml(parts[1]?.trim() || sale.customerCity || parts[0]?.trim() || "–");
      const timeStr = fmtTime(sale.createdAt);
      return `<tr><td>${idx + 1}</td><td>${street}</td><td>${city}</td><td>${timeStr}</td><td class="num">${formatAmount(sale.totalAmount)}</td></tr>`;
    }).join("");
    const dir = isRTL ? "rtl" : "ltr";
    const L = {
      title: tr3("تقرير الموظفين", "Personalbericht", "Staff report"),
      cashier: tr3("الكاشير", "Kassierer", "Cashier"),
      nr: tr3("رقم", "Nr", "No."),
      address: tr3("العنوان", "Adresse", "Address"),
      area: tr3("المنطقة", "Gebiet", "Area"),
      time: tr3("الوقت", "Zeit", "Time"),
      total: tr3("المجموع", "Total", "Total"),
      turnover: tr3("إجمالي المبيعات", "Umsatz Total", "Total sales"),
      orders: tr3("طلبات", "Bestellungen", "orders"),
    };
    const html = `<!DOCTYPE html><html lang="${language}" dir="${dir}"><head><meta charset="UTF-8"><title>${L.title}</title><style>
      body { font-family: 'Courier New', monospace; font-size: 11px; margin: 0; padding: 10px; color: #000; }
      h2 { text-align: center; font-size: 14px; margin: 4px 0; }
      .sub { text-align: center; font-size: 11px; margin-bottom: 8px; }
      table { width: 100%; border-collapse: collapse; }
      th { border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 3px 4px; text-align: start; font-size: 10px; }
      td { padding: 2px 4px; font-size: 10px; border-bottom: 1px dotted #ccc; }
      .num { text-align: end; white-space: nowrap; }
      .total-row { border-top: 1px solid #000; font-weight: bold; }
      .total-row td { padding-top: 4px; }
    </style></head><body>
      <h2>${L.title}</h2>
      <div class="sub">${dateStr}</div>
      <div class="sub">${storeName}</div>
      <div style="font-weight:bold;margin:8px 0 4px;">${L.cashier}: ${cashierName}</div>
      <table>
        <thead><tr><th>${L.nr}</th><th>${L.address}</th><th>${L.area}</th><th>${L.time}</th><th class="num">${L.total} (${escapeHtml(currencyLabel())})</th></tr></thead>
        <tbody>${rowsHtml}</tbody>
        <tfoot>
          <tr class="total-row"><td colspan="4">${L.turnover} · ${salesData.length} ${L.orders}</td><td class="num">${formatAmount(total)}</td></tr>
        </tfoot>
      </table>
      <div style="text-align:center;font-size:10px;margin-top:10px;">${fmtTime(new Date())} · ${dateStr}</div>
    </body></html>`;
    printHtmlViaIframe(html);
  };

  const [staffReportBusy, setStaffReportBusy] = useState(false);

  const handleLogout = () => {
    const isWeb = Platform.OS === "web";
    const doLogout = () => {
      // Employee logout: only clear the employee session. Do NOT clear the
      // license or tenant — those are per-device and stay across employee
      // switches. Clearing them caused every next API call to return 401
      // because x-license-key was missing from AsyncStorage.
      logout();
    };
    const shiftMsg = t("shiftRequiredMsg") || "You must end your shift before logging out.";
    const endAndLogoutLabel = t("endShift") + " & " + t("logout");

    if (activeShift) {
      if (isWeb) {
        if (!window.confirm(`${shiftMsg}\n\n${endAndLogoutLabel}?`)) return;
        clockOutMutation.mutate({ id: activeShift.id, data: {} }, {
          onSuccess: () => {
            if (window.confirm(t("logoutConfirm"))) doLogout();
          },
        });
      } else {
        Alert.alert(t("endShift"), shiftMsg, [
          { text: t("cancel"), style: "cancel" },
          {
            text: endAndLogoutLabel,
            style: "destructive",
            onPress: () => clockOutMutation.mutate({ id: activeShift.id, data: {} }, {
              onSuccess: () => {
                Alert.alert(t("logoutConfirm"), "", [
                  { text: t("cancel"), style: "cancel" },
                  { text: t("logout"), style: "destructive", onPress: doLogout },
                ]);
              },
            }),
          },
        ]);
      }
      return;
    }

    if (isWeb) {
      if (window.confirm(t("logoutConfirm"))) doLogout();
    } else {
      Alert.alert(t("logoutConfirm"), "", [
        { text: t("cancel"), style: "cancel" },
        { text: t("logout"), style: "destructive", onPress: doLogout },
      ]);
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + topPad,
          direction: isRTL ? "rtl" : "ltr",
        },
      ]}
    >
      <TabPageHeader
        title={t("settingsMore")}
        icon="settings"
        isRTL={isRTL}
        rightActions={
          <Pressable onPress={() => setShowNotifications(true)} style={{ position: "relative", padding: 4 }}>
            <Ionicons name="notifications-outline" size={24} color={Colors.white} />
            {unreadCount > 0 && (
              <View style={smStyles.notifBadge}>
                <Text style={smStyles.notifBadgeText}>{unreadCount > 99 ? "99+" : unreadCount}</Text>
              </View>
            )}
          </Pressable>
        }
      />

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 20 }]}>
        {employee && (
          <View style={styles.profileCard}>
            <View style={styles.profileAvatar}>
              <Text style={styles.profileInitial}>{employee.name.charAt(0)}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{employee.name}</Text>
              <View style={[styles.roleBadge, { backgroundColor: (roleColors[employee.role] || Colors.info) + "20" }]}>
                <Text style={[styles.roleText, { color: roleColors[employee.role] || Colors.info }]}>{t(employee.role as any)}</Text>
              </View>
            </View>
          </View>
        )}

        {isAdmin && (
          <>
            <Text style={styles.sectionTitle}>{t("storeSettings")}</Text>
            <SettingRow icon="people" label={t("employees")} value={`${employees.length} ${t("members")}`} onPress={() => setShowEmployees(true)} color={Colors.info} rtl={isRTL} />
            <SettingRow icon="business" label={t("branches")} value={`${branches.length} ${t("locations")}`} onPress={() => setShowBranches(true)} color={Colors.secondary} rtl={isRTL} />
            <SettingRow icon="storefront-outline" label={t("storeSettings")} value={t("configureStore")} onPress={() => {
              setStoreForm({
                name: storeSettings?.name || "",
                address: storeSettings?.address || "",
                phone: storeSettings?.phone || "",
                email: storeSettings?.email || "",
                storeType: storeSettings?.storeType || "supermarket",
                taxRate: storeSettings?.taxRate != null ? String(storeSettings.taxRate) : "",
                deliveryFee: storeSettings?.deliveryFee != null ? (zeroDec ? String(Math.round(Number(storeSettings.deliveryFee) || 0)) : String(storeSettings.deliveryFee)) : "",
              });
              setStoreLogo(storeSettings?.logo || null);
              setShowStoreSettings(true);
            }} color={Colors.accent} rtl={isRTL} />
            <SettingRow icon="card" label={t("paymentGateways")} value={stripeUnavailable ? tr3("شام كاش ونقداً · البطاقات غير متاحة في سوريا", "Sham Cash und Bar · Karten in Syrien nicht verfügbar", "Sham Cash and cash · cards unavailable in Syria") : pgConfig?.stripe?.status === "connected" ? `${t("stripeConnected")} - ${pgConfig?.stripe?.mode === "live" ? t("liveMode") : t("testMode")}` : t("stripeNotConfigured")} onPress={() => { setPgTestResult(null); setShowPaymentGateway(true); }} color={Colors.hueIndigo} rtl={isRTL} />
            <SettingRow icon="cloud-upload" label={t("bulkImport")} value={t("importData")} onPress={() => { setImportResult(null); setShowBulkImport(true); }} color={Colors.hueAmber} rtl={isRTL} />
            <SettingRow icon="qr-code" label={tr3("طاولات QR", "QR-Tische", "QR Tables")} value={t("manageTables")} onPress={() => router.push("/table-qr")} color={Colors.hueTeal} rtl={isRTL} />
          </>
        )}

        {canManage && (
          <>
            <Text style={styles.sectionTitle}>{t("management")}</Text>
            <SettingRow icon="cube" label={t("suppliers")} value={`${suppliers.length} ${t("suppliers")}`} onPress={() => setShowSuppliers(true)} color={Colors.success} rtl={isRTL} />
            <SettingRow icon="storefront" label={language === "ar" ? "تجار الجملة" : language === "de" ? "Großhändler" : "Wholesale traders"} value={language === "ar" ? "الذمم والكشوفات والتحصيل" : language === "de" ? "Forderungen, Auszüge, Zahlungen" : "Receivables, statements, payments"} onPress={() => router.push("/wholesale" as any)} color={Colors.hueIndigo} rtl={isRTL} />
            {isAdmin && <SettingRow icon="logo-whatsapp" label={language === "ar" ? "واتساب المتجر" : language === "de" ? "WhatsApp des Geschäfts" : "Store WhatsApp"} value={language === "ar" ? "الربط، المحادثات، رسائل الطلبات والعروض" : language === "de" ? "Verbindung, Chats, Bestell- und Angebotsnachrichten" : "Link, chats, order messages and offers"} onPress={() => router.push("/whatsapp" as any)} color={"#25D366"} rtl={isRTL} />}
            <SettingRow icon="wallet" label={t("expenses")} value={`${expenses.length} ${t("expenses")}`} onPress={() => setShowExpenses(true)} color={Colors.warning} rtl={isRTL} />
            <SettingRow icon="time" label={t("attendance")} value={`${shifts.length} ${t("attendance")}`} onPress={() => setShowAttendance(true)} color={Colors.warning} rtl={isRTL} />
            {isAdmin && <SettingRow icon="pulse" label={t("shiftMonitor")} value={`${allActiveShifts.length} ${t("activeShiftsCount")}`} onPress={() => { setShiftMonitorTab("active"); setShowShiftMonitor(true); }} color={Colors.hueTeal} rtl={isRTL} />}
            <SettingRow icon="document-text" label={t("purchaseOrders")} value={`${purchaseOrders.length} ${t("orders")}`} onPress={() => setShowPurchaseOrders(true)} color={Colors.info} rtl={isRTL} />
            <SettingRow icon="list" label={t("activityLog")} value={`${activityLog.length} ${t("entries")}`} onPress={() => setShowActivityLog(true)} color={Colors.secondary} rtl={isRTL} />
            <SettingRow icon="swap-horizontal" label={t("returnsRefunds")} value={`${returns.length} ${t("returns")}`} onPress={() => setShowReturnsManager(true)} color={Colors.danger} rtl={isRTL} />
            <SettingRow icon="cash" label={t("cashDrawer")} value={activeShift ? t("activeShift") : t("noActiveShift")} onPress={() => setShowCashDrawer(true)} color={Colors.success} rtl={isRTL} />
            <SettingRow icon="home" label={t("warehouses")} value={`${warehousesList.length} ${t("warehouses")}`} onPress={() => setShowWarehouseManager(true)} color={Colors.accent} rtl={isRTL} />
            <SettingRow icon="layers" label={t("productBatches")} value={`${batchesList.length} ${t("batches")}`} onPress={() => { setBatchView("list"); setShowBatchManager(true); }} color={Colors.secondary} rtl={isRTL} />
            <SettingRow icon="car" label={t("vehicles")} value={`${vehiclesList.length} ${t("vehicles")}`} onPress={() => setShowVehicles(true)} color={Colors.hueOrange} rtl={isRTL} />
            <SettingRow icon="calendar" label={t("dailyClosing")} value={`${dailyClosingsList.length} ${t("entries")}`} onPress={() => setShowDailyClosing(true)} color={Colors.hueCyan} rtl={isRTL} />
            <SettingRow icon="calendar-number" label={t("monthlyClosing")} value={`${monthlyClosingsList.length} ${t("entries")}`} onPress={() => setShowMonthlyClosing(true)} color={Colors.hueViolet} rtl={isRTL} />
            <SettingRow icon="receipt" label={t("accountsReceivable")} value={t("debitoren")} onPress={() => setShowAccountsReceivable(true)} color={Colors.hueRose} rtl={isRTL} />
          </>
        )}

        {!canManage && (
          <>
            <Text style={styles.sectionTitle}>{t("management")}</Text>
            <SettingRow icon="time" label={t("attendance")} value={`${shifts.length} ${t("attendance")}`} onPress={() => setShowAttendance(true)} color={Colors.warning} rtl={isRTL} />
            <SettingRow icon="cash" label={t("cashDrawer")} value={activeShift ? t("activeShift") : t("noActiveShift")} onPress={() => setShowCashDrawer(true)} color={Colors.success} rtl={isRTL} />
          </>
        )}

        <Text style={styles.sectionTitle}>{t("deliveryPlatform")}</Text>
        <SettingRow icon="bicycle" label={t("deliveryZones")} value={t("addDeliveryZone")} onPress={() => router.push("/delivery-zones")} color={Colors.deliveryPrimary} rtl={isRTL} />
        <SettingRow icon="pricetag" label={t("promoCodes")} value={t("addPromoCode")} onPress={() => router.push("/promo-codes")} color={Colors.hueViolet} rtl={isRTL} />
        <SettingRow icon="car" label={t("driverManagement")} value={t("activeDrivers")} onPress={() => router.push("/driver-management")} color={Colors.driverOnline} rtl={isRTL} />
        {isAdmin && (
          <SettingRow icon="globe-outline" label={t("editStorefront")} value={t("storefrontDesc")} onPress={() => { if (landingConfigData) setStorefrontForm(storefrontFromConfig(landingConfigData)); setShowStorefront(true); }} color={Colors.accent} rtl={isRTL} />
        )}
        <SettingRow icon="storefront" label={t("storefrontPreview")} value={slug || "—"} onPress={() => { if (slug) require("react-native").Linking.openURL(getApiUrl() + `/order/${slug}`); }} color={Colors.accent} rtl={isRTL} />
        {isAdmin && (
          <SettingRow
            icon="star"
            label={t("loyaltyConfiguration")}
            value={loyaltyEnabled
              ? `${tr3("مفعّل", "Aktiv", "On")} · ${tr3("نقطة لكل", "1 Punkt je", "1 pt per")} ${formatMoney(loyaltySpendPerPoint)}`
              : tr3("متوقف", "Aus", "Off")}
            onPress={openLoyaltyConfig}
            color={Colors.loyaltyGold}
            rtl={isRTL}
          />
        )}

        <Text style={styles.sectionTitle}>{t("system")}</Text>
        <View style={[rowStyles.row, rowFlip && { flexDirection: "row-reverse" }]}>
          <View style={[rowStyles.iconWrap, { backgroundColor: Colors.accent + "20" }, isRTL ? { marginLeft: 12, marginRight: 0 } : {}]}>
            <Ionicons name="contrast-outline" size={20} color={Colors.accent} />
          </View>
          <View style={[rowStyles.info, rowFlip && { alignItems: "flex-end" }]}>
            <Text style={[rowStyles.label, isRTL && { textAlign: "right" }]}>{t("appearance")}</Text>
            <Text style={[rowStyles.value, isRTL && { textAlign: "right" }]}>{t("appearanceDesc")}</Text>
          </View>
          <ThemeToggle variant="segmented" />
        </View>
        <SettingRow icon="language" label={t("language")} value={language === "ar" ? "العربية" : language === "de" ? "Deutsch" : "English"} onPress={() => setShowLanguagePicker(true)} color={Colors.info} rtl={isRTL} />
        <Pressable
          style={[rowStyles.row, rowFlip && { flexDirection: "row-reverse" }]}
          onPress={() => toggleLeftHandMode(!leftHandMode)}
        >
          <View style={[rowStyles.iconWrap, { backgroundColor: Colors.secondary + "20" }, isRTL ? { marginLeft: 12, marginRight: 0 } : {}]}>
            <Ionicons name="hand-left-outline" size={20} color={Colors.secondary} />
          </View>
          <View style={[rowStyles.info, rowFlip && { alignItems: "flex-end" }]}>
            <Text style={[rowStyles.label, isRTL && { textAlign: "right" }]}>{t("leftHandMode" as any)}</Text>
            <Text style={[rowStyles.value, isRTL && { textAlign: "right" }]}>{t("leftHandModeDesc" as any)}</Text>
          </View>
          <Switch
            value={leftHandMode}
            onValueChange={toggleLeftHandMode}
            trackColor={{ false: Colors.cardBorder, true: Colors.secondary + "60" }}
            thumbColor={leftHandMode ? Colors.secondary : Colors.textMuted}
          />
        </Pressable>
        {canManage && <SettingRow icon="print" label={t("receiptPrinter")} value={`${printerPrefs.paperSize} · ${printerPrefs.autoPrint ? t("autoPrintReceipts") : tr3("طباعة يدوية", "Manueller Druck", "Manual printing")}`} onPress={() => { setPrinterPrefsState(getReceiptPrinterPrefs()); setShowPrinterSettings(true); }} color={Colors.hueIndigo} rtl={isRTL} />}
        {canManage && <SettingRow icon="print-outline" label={t("printerConfig")} value={t("printerConfigDesc")} onPress={() => setShowPrinterConfig(true)} color={Colors.hueIndigo} rtl={isRTL} />}
        <SettingRow icon="cloud-upload" label={t("syncStatus")} value={serverReachable ? t("connected") : tr3("غير متصل بالخادم", "Keine Verbindung zum Server", "Server unreachable")} color={serverReachable ? Colors.success : Colors.danger} rtl={isRTL} />
        <SettingRow icon="information-circle" label={t("appVersion")} value={Constants.expoConfig?.version || "1.0.0"} color={Colors.info} rtl={isRTL} />

        <Pressable style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out" size={20} color={Colors.danger} />
          <Text style={styles.logoutText}>{t("logout")}</Text>
        </Pressable>
      </ScrollView>

      <Modal visible={showEmployees} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("employees")}</Text>
              <View style={styles.modalActions}>
                <Pressable hitSlop={8} onPress={() => { setEditEmployee(null); setEmpForm({ name: "", pin: "", role: "cashier", email: "", phone: "" }); setShowEmployeeForm(true); }}>
                  <Ionicons name="add-circle" size={28} color={Colors.accent} />
                </Pressable>
                <Pressable hitSlop={8} style={styles.closeBtn} accessibilityLabel={t("close" as any)} onPress={() => setShowEmployees(false)}><Ionicons name="close" size={24} color={Colors.text} /></Pressable>
              </View>
            </View>
            <FlatList
              data={employees}
              keyExtractor={(item: any) => String(item.id)}
              scrollEnabled={!!employees.length}
              ListEmptyComponent={<Text style={{ color: Colors.textMuted, textAlign: "center", paddingVertical: 20 }}>{tr3("لا يوجد موظفون بعد", "Noch keine Mitarbeitenden", "No employees yet")}</Text>}
              renderItem={({ item }: { item: any }) => (
                <View style={styles.empCard}>
                  <View style={[styles.empAvatar, { backgroundColor: (roleColors[item.role] || Colors.info) + "30" }]}>
                    <Text style={styles.empInitial}>{item.name.charAt(0)}</Text>
                  </View>
                  <View style={styles.empInfo}>
                    <Text style={styles.empName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.empMeta} numberOfLines={1}>{item.hasPin ? tr3("PIN مضبوط ••••", "PIN gesetzt ••••", "PIN set ••••") : tr3("بدون PIN", "Kein PIN", "No PIN")} | {item.email || t("noEmail")}</Text>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View style={[styles.roleBadge, { backgroundColor: (roleColors[item.role] || Colors.info) + "20" }]}>
                      <Text style={[styles.roleText, { color: roleColors[item.role] || Colors.info }]}>{t(item.role as any)}</Text>
                    </View>
                    <Pressable hitSlop={8} style={styles.iconBtn} accessibilityLabel={t("editEmployee" as any)} onPress={() => {
                      setEditEmployee(item);
                      setEmpForm({ name: item.name, pin: "", role: item.role, email: item.email || "", phone: item.phone || "" });
                      setShowEmployeeForm(true);
                    }}>
                      <Ionicons name="create-outline" size={20} color={Colors.info} />
                    </Pressable>
                    {item.id !== employee?.id && (
                      <Pressable hitSlop={8} style={styles.iconBtn} accessibilityLabel={t("delete")} onPress={() => {
                        confirmAction(t("delete"), `${t("delete")} ${item.name}?`, t("delete"), t("cancel"), () => deleteEmpMutation.mutate(item.id));
                      }}>
                        <Ionicons name="trash-outline" size={20} color={Colors.danger} />
                      </Pressable>
                    )}
                  </View>
                </View>
              )}
            />
          </View>
        </View>
      </Modal>

      <Modal visible={showEmployeeForm} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editEmployee ? t("editEmployee" as any) : t("newEmployee")}</Text>
              <Pressable hitSlop={8} style={styles.closeBtn} accessibilityLabel={t("close" as any)} onPress={() => { setShowEmployeeForm(false); setEditEmployee(null); }}><Ionicons name="close" size={24} color={Colors.text} /></Pressable>
            </View>
            <ScrollView>
              <Text style={styles.label}>{t("name")} *</Text>
              <TextInput style={styles.input} value={empForm.name} onChangeText={(v) => setEmpForm({ ...empForm, name: v })} placeholderTextColor={Colors.textMuted} placeholder={t("employeeName2")} />
              <Text style={styles.label}>{t("pin")}{editEmployee ? "" : " *"}</Text>
              <TextInput style={styles.input} value={empForm.pin} onChangeText={(v) => setEmpForm({ ...empForm, pin: v.replace(/[^0-9]/g, "") })} keyboardType="number-pad" secureTextEntry placeholderTextColor={Colors.textMuted} placeholder={editEmployee ? tr3("•••• (اتركه فارغاً للإبقاء عليه)", "•••• (leer lassen = unverändert)", "•••• (leave blank to keep)") : t("fourDigitPin")} maxLength={4} />
              <Text style={styles.label}>{t("role")}</Text>
              <View style={styles.roleRow}>
                {["cashier", "manager", "admin", "owner"].map((r) => (
                  <Pressable key={r} style={[styles.roleChip, empForm.role === r && { backgroundColor: Colors.accent }]} onPress={() => setEmpForm({ ...empForm, role: r })}>
                    <Text style={[styles.roleChipText, empForm.role === r && { color: Colors.textDark }]}>{t(r as any)}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.label}>{t("email")}</Text>
              <TextInput style={styles.input} value={empForm.email} onChangeText={(v) => setEmpForm({ ...empForm, email: v })} placeholderTextColor={Colors.textMuted} placeholder="email@example.com" autoCapitalize="none" keyboardType="email-address" />
              <Text style={styles.label}>{t("phone")}</Text>
              <TextInput style={styles.input} value={empForm.phone} onChangeText={(v) => setEmpForm({ ...empForm, phone: v })} keyboardType="phone-pad" placeholderTextColor={Colors.textMuted} placeholder={phonePh} />
              <Pressable style={[styles.saveBtn, empSaving && { opacity: 0.6 }]} disabled={empSaving} onPress={() => {
                const name = empForm.name.trim();
                if (!name || (!editEmployee && !empForm.pin)) return notify(t("error"), t("namePinRequired"));
                if (empForm.pin && !/^\d{4}$/.test(empForm.pin)) return notify(t("error"), tr3("رمز PIN يجب أن يكون 4 أرقام", "Die PIN muss aus 4 Ziffern bestehen", "The PIN must be 4 digits"));
                const email = empForm.email.trim();
                if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return notify(t("error"), tr3("البريد الإلكتروني غير صالح", "Ungültige E-Mail-Adresse", "Invalid email address"));
                const phone = cleanPhone(empForm.phone, editEmployee?.phone);
                if (phone === null) return notify(t("error"), invalidPhoneMsg);
                const defaultPerms = empForm.role === "admin" ? ["all"] : ["pos"];
                if (editEmployee) {
                  // Blank PIN keeps the existing one; an emptied email/phone
                  // really clears. Permissions are reset only when the role
                  // changes, so rights granted elsewhere survive a small edit.
                  const upd: any = { name, role: empForm.role, email: email || null, phone: phone || null };
                  if (empForm.role !== editEmployee.role) upd.permissions = defaultPerms;
                  if (empForm.pin) upd.pin = empForm.pin;
                  updateEmpMutation.mutate({ id: editEmployee.id, data: upd });
                } else {
                  createEmpMutation.mutate({ name, pin: empForm.pin, role: empForm.role, email: email || undefined, phone: phone || undefined, tenantId: tenant?.id, branchId: myBranchId, permissions: defaultPerms });
                }
              }}>
                <LinearGradient colors={[Colors.accent, Colors.gradientMid]} style={styles.saveBtnGradient}>
                  <Text style={styles.saveBtnText}>{empSaving ? t("loading") : editEmployee ? t("save") : t("createEmployee")}</Text>
                </LinearGradient>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showSuppliers} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("suppliers")}</Text>
              <View style={styles.modalActions}>
                <Pressable hitSlop={8} onPress={() => { setSupForm({ name: "", contactName: "", email: "", phone: "", paymentTerms: "" }); setShowSupplierForm(true); }}>
                  <Ionicons name="add-circle" size={28} color={Colors.accent} />
                </Pressable>
                <Pressable hitSlop={8} style={styles.closeBtn} accessibilityLabel={t("close" as any)} onPress={() => setShowSuppliers(false)}><Ionicons name="close" size={24} color={Colors.text} /></Pressable>
              </View>
            </View>
            <FlatList
              data={suppliers}
              keyExtractor={(item: any) => String(item.id)}
              scrollEnabled={!!suppliers.length}
              ListEmptyComponent={<Text style={{ color: Colors.textMuted, textAlign: "center", paddingVertical: 20 }}>{tr3("لا يوجد موردون بعد", "Noch keine Lieferanten", "No suppliers yet")}</Text>}
              renderItem={({ item }: { item: any }) => (
                <View style={styles.empCard}>
                  <View style={[styles.empAvatar, { backgroundColor: Colors.success + "30" }]}>
                    <Ionicons name="cube" size={20} color={Colors.success} />
                  </View>
                  <View style={styles.empInfo}>
                    <Text style={styles.empName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.empMeta} numberOfLines={1}>{item.contactName || t("noContact")} | {item.phone || t("noPhone")}</Text>
                  </View>
                </View>
              )}
            />
          </View>
        </View>
      </Modal>

      <Modal visible={showSupplierForm} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("newSupplier")}</Text>
              <Pressable hitSlop={8} style={styles.closeBtn} accessibilityLabel={t("close" as any)} onPress={() => setShowSupplierForm(false)}><Ionicons name="close" size={24} color={Colors.text} /></Pressable>
            </View>
            <ScrollView>
              <Text style={styles.label}>{t("companyName")} *</Text>
              <TextInput style={styles.input} value={supForm.name} onChangeText={(v) => setSupForm({ ...supForm, name: v })} placeholderTextColor={Colors.textMuted} placeholder={t("supplierNamePlaceholder")} />
              <Text style={styles.label}>{t("contactPerson")}</Text>
              <TextInput style={styles.input} value={supForm.contactName} onChangeText={(v) => setSupForm({ ...supForm, contactName: v })} placeholderTextColor={Colors.textMuted} placeholder={t("contactNamePlaceholder")} />
              <Text style={styles.label}>{t("phone")}</Text>
              <TextInput style={styles.input} value={supForm.phone} onChangeText={(v) => setSupForm({ ...supForm, phone: v })} keyboardType="phone-pad" placeholderTextColor={Colors.textMuted} placeholder={phonePh} />
              <Text style={styles.label}>{t("email")}</Text>
              <TextInput style={styles.input} value={supForm.email} onChangeText={(v) => setSupForm({ ...supForm, email: v })} placeholderTextColor={Colors.textMuted} placeholder="email@example.com" autoCapitalize="none" keyboardType="email-address" />
              <Text style={styles.label}>{tr3("شروط الدفع", "Zahlungsbedingungen", "Payment terms")}</Text>
              <TextInput style={styles.input} value={supForm.paymentTerms} onChangeText={(v) => setSupForm({ ...supForm, paymentTerms: v })} placeholderTextColor={Colors.textMuted} placeholder={tr3("مثال: 30 يوماً", "z. B. 30 Tage netto", "e.g. Net 30")} />
              <Pressable style={[styles.saveBtn, createSupMutation.isPending && { opacity: 0.6 }]} disabled={createSupMutation.isPending} onPress={() => {
                const name = supForm.name.trim();
                if (!name) return notify(t("error"), t("companyNameRequired"));
                const phone = cleanPhone(supForm.phone);
                if (phone === null) return notify(t("error"), invalidPhoneMsg);
                createSupMutation.mutate({ name, contactName: supForm.contactName.trim() || undefined, phone: phone || undefined, email: supForm.email.trim() || undefined, paymentTerms: supForm.paymentTerms.trim() || undefined });
              }}>
                <LinearGradient colors={[Colors.accent, Colors.gradientMid]} style={styles.saveBtnGradient}>
                  <Text style={styles.saveBtnText}>{createSupMutation.isPending ? t("loading") : t("createSupplier")}</Text>
                </LinearGradient>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showBranches} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("branches")}</Text>
              <View style={styles.modalActions}>
                <Pressable hitSlop={8} onPress={() => { setBranchForm({ name: "", address: "", phone: "", currency: getCurrency(), taxRate: "" }); setEditBranch(null); setShowBranchForm(true); }}>
                  <Ionicons name="add-circle" size={28} color={Colors.accent} />
                </Pressable>
                <Pressable hitSlop={8} style={styles.closeBtn} accessibilityLabel={t("close" as any)} onPress={() => setShowBranches(false)}><Ionicons name="close" size={24} color={Colors.text} /></Pressable>
              </View>
            </View>
            <FlatList
              data={branches}
              keyExtractor={(item: any) => String(item.id)}
              scrollEnabled={!!branches.length}
              ListEmptyComponent={<Text style={{ color: Colors.textMuted, textAlign: "center", paddingVertical: 20 }}>{t("noBranches")}</Text>}
              renderItem={({ item }: { item: any }) => (
                <View style={styles.empCard}>
                  <View style={[styles.empAvatar, { backgroundColor: Colors.secondary + "30" }]}>
                    <Ionicons name="business" size={20} color={Colors.secondary} />
                  </View>
                  <View style={styles.empInfo}>
                    <Text style={styles.empName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.empMeta} numberOfLines={2}>{item.address || t("noAddress")} | {item.currency || getCurrency()} | {t("taxRate")}: {Number(item.taxRate || 0)}%</Text>
                    {item.phone ? <Text style={styles.empMeta}>{item.phone}</Text> : null}
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    {item.isMain && (
                      <View style={[styles.roleBadge, { backgroundColor: Colors.accent + "20" }]}>
                        <Text style={[styles.roleText, { color: Colors.accent }]}>{t("main")}</Text>
                      </View>
                    )}
                    <Pressable hitSlop={8} style={styles.iconBtn} accessibilityLabel={t("editBranch")} onPress={() => {
                      setEditBranch(item);
                      setBranchForm({ name: item.name, address: item.address || "", phone: item.phone || "", currency: item.currency || getCurrency(), taxRate: item.taxRate != null ? String(Number(item.taxRate)) : "" });
                      setShowBranchForm(true);
                    }}>
                      <Ionicons name="pencil" size={18} color={Colors.info} />
                    </Pressable>
                    {!item.isMain && (
                      <Pressable hitSlop={8} style={styles.iconBtn} accessibilityLabel={t("deleteBranch")} onPress={() => {
                        confirmAction(t("deleteBranch"), `${t("delete")} "${item.name}"?`, t("delete"), t("cancel"), () => deleteBranchMutation.mutate(item.id));
                      }}>
                        <Ionicons name="trash" size={18} color={Colors.danger} />
                      </Pressable>
                    )}
                  </View>
                </View>
              )}
            />
          </View>
        </View>
      </Modal>

      <Modal visible={showBranchForm} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editBranch ? t("editBranch") : t("newBranch")}</Text>
              <Pressable hitSlop={8} style={styles.closeBtn} accessibilityLabel={t("close" as any)} onPress={() => { setShowBranchForm(false); setEditBranch(null); }}><Ionicons name="close" size={24} color={Colors.text} /></Pressable>
            </View>
            <ScrollView>
              <Text style={styles.label}>{t("name")} *</Text>
              <TextInput style={styles.input} value={branchForm.name} onChangeText={(v) => setBranchForm({ ...branchForm, name: v })} placeholderTextColor={Colors.textMuted} placeholder={t("branchName")} />
              <Text style={styles.label}>{t("address")}</Text>
              <TextInput style={styles.input} value={branchForm.address} onChangeText={(v) => setBranchForm({ ...branchForm, address: v })} placeholderTextColor={Colors.textMuted} placeholder={t("branchAddress")} />
              <Text style={styles.label}>{t("phone")}</Text>
              <TextInput style={styles.input} value={branchForm.phone} onChangeText={(v) => setBranchForm({ ...branchForm, phone: v })} keyboardType="phone-pad" placeholderTextColor={Colors.textMuted} placeholder={phonePh} />
              <Text style={styles.label}>{t("currency")}</Text>
              <View style={styles.roleRow}>
                {["CHF", "USD", "EGP", "EUR", "GBP", "SAR", "SYP"].map((c) => (
                  <Pressable key={c} style={[styles.roleChip, branchForm.currency === c && { backgroundColor: Colors.accent }]} onPress={() => setBranchForm({ ...branchForm, currency: c })}>
                    <Text style={[styles.roleChipText, branchForm.currency === c && { color: Colors.textDark }]}>{c}</Text>
                  </Pressable>
                ))}
              </View>
              {editBranch?.isMain && branchForm.currency !== (editBranch.currency || getCurrency()) && (
                <Text style={{ color: Colors.warning, fontSize: 12, marginTop: 8, lineHeight: 17 }}>
                  {tr3(
                    "عملة الفرع الرئيسي هي عملة المتجر كله: تتغير كل الأسعار المعروضة والإيصالات، ولا تُحوَّل الأسعار المحفوظة.",
                    "Die Währung der Hauptfiliale gilt für das ganze Geschäft: alle Preise und Belege wechseln, gespeicherte Preise werden nicht umgerechnet.",
                    "The main branch currency is the whole store's currency: every price and receipt switches, and saved prices are not converted.",
                  )}
                </Text>
              )}
              <Text style={styles.label}>{t("taxRatePercent")}</Text>
              <TextInput style={styles.input} value={branchForm.taxRate} onChangeText={(v) => setBranchForm({ ...branchForm, taxRate: v })} keyboardType="decimal-pad" placeholderTextColor={Colors.textMuted} placeholder="0" />
              <Pressable style={[styles.saveBtn, createBranchMutation.isPending && { opacity: 0.6 }]} disabled={createBranchMutation.isPending} onPress={() => {
                const name = branchForm.name.trim();
                if (!name) return notify(t("error"), t("branchNameRequired"));
                const taxRate = branchForm.taxRate.trim() === "" ? 0 : parseNum(branchForm.taxRate);
                if (!(taxRate >= 0 && taxRate <= 100)) return notify(t("error"), tr3("نسبة الضريبة يجب أن تكون بين 0 و100", "Steuersatz muss zwischen 0 und 100 liegen", "Tax rate must be between 0 and 100"));
                const phone = cleanPhone(branchForm.phone, editBranch?.phone);
                if (phone === null) return notify(t("error"), invalidPhoneMsg);
                // On edit, empty address/phone are sent so a cleared field clears.
                createBranchMutation.mutate({
                  name,
                  address: branchForm.address.trim() || (editBranch ? "" : undefined),
                  phone: phone || (editBranch ? "" : undefined),
                  currency: branchForm.currency,
                  taxRate: taxRate.toFixed(2),
                });
              }}>
                <LinearGradient colors={[Colors.accent, Colors.gradientMid]} style={styles.saveBtnGradient}>
                  <Text style={styles.saveBtnText}>{createBranchMutation.isPending ? t("loading") : editBranch ? t("updateBranch") : t("createBranch")}</Text>
                </LinearGradient>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showExpenses} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("expenses")}</Text>
              <View style={styles.modalActions}>
                <Pressable hitSlop={8} onPress={() => { setExpenseForm({ description: "", amount: "", category: "other", date: storeYmd(), notes: "" }); setShowExpenseForm(true); }}>
                  <Ionicons name="add-circle" size={28} color={Colors.accent} />
                </Pressable>
                <Pressable hitSlop={8} style={styles.closeBtn} accessibilityLabel={t("close" as any)} onPress={() => setShowExpenses(false)}><Ionicons name="close" size={24} color={Colors.text} /></Pressable>
              </View>
            </View>
            <FlatList
              data={expenses}
              keyExtractor={(item: any) => String(item.id)}
              scrollEnabled={!!expenses.length}
              ListEmptyComponent={<Text style={{ color: Colors.textMuted, textAlign: "center", paddingVertical: 20 }}>{t("noExpenses")}</Text>}
              renderItem={({ item }: { item: any }) => {
                // The column is "category"; rows saved by older builds may only
                // carry it under categoryId in the response.
                const cat = String(item.category || item.categoryId || "other");
                const color = expenseCategoryColors[cat] || expenseCategoryColors.other;
                return (
                <View style={styles.empCard}>
                  <View style={[styles.empAvatar, { backgroundColor: color + "30" }]}>
                    <Ionicons name="wallet" size={20} color={color} />
                  </View>
                  <View style={styles.empInfo}>
                    <Text style={styles.empName} numberOfLines={2}>{item.description || "—"}</Text>
                    <Text style={styles.empMeta}>{formatMoney(item.amount)} | {fmtDate(item.date)}</Text>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View style={[styles.roleBadge, { backgroundColor: color + "20" }]}>
                      <Text style={[styles.roleText, { color }]}>{expenseCatLabel(cat)}</Text>
                    </View>
                    <Pressable hitSlop={8} style={styles.iconBtn} accessibilityLabel={t("deleteExpense")} onPress={() => {
                      confirmAction(t("deleteExpense"), `${t("delete")} "${item.description || ""}"?`, t("delete"), t("cancel"), () => deleteExpenseMutation.mutate(item.id));
                    }}>
                      <Ionicons name="trash" size={18} color={Colors.danger} />
                    </Pressable>
                  </View>
                </View>
                );
              }}
            />
          </View>
        </View>
      </Modal>

      <Modal visible={showExpenseForm} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("addExpense")}</Text>
              <Pressable hitSlop={8} style={styles.closeBtn} accessibilityLabel={t("close" as any)} onPress={() => setShowExpenseForm(false)}><Ionicons name="close" size={24} color={Colors.text} /></Pressable>
            </View>
            <ScrollView>
              <Text style={styles.label}>{t("description")} *</Text>
              <TextInput style={styles.input} value={expenseForm.description} onChangeText={(v) => setExpenseForm({ ...expenseForm, description: v })} placeholderTextColor={Colors.textMuted} placeholder={t("expenseDescription")} />
              <Text style={styles.label}>{t("amount")} * ({currencyLabel()})</Text>
              <TextInput style={styles.input} value={expenseForm.amount} onChangeText={(v) => setExpenseForm({ ...expenseForm, amount: v })} keyboardType={moneyKeyboard} placeholderTextColor={Colors.textMuted} placeholder={moneyPlaceholder} />
              <Text style={styles.label}>{t("category")}</Text>
              <View style={styles.roleRow}>
                {expenseCategories.map((c) => (
                  <Pressable key={c} style={[styles.roleChip, expenseForm.category === c && { backgroundColor: expenseCategoryColors[c] }]} onPress={() => setExpenseForm({ ...expenseForm, category: c })}>
                    <Text style={[styles.roleChipText, expenseForm.category === c && { color: Colors.white }]}>{expenseCatLabel(c)}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.label}>{t("date")}</Text>
              <TextInput style={styles.input} value={expenseForm.date} onChangeText={(v) => setExpenseForm({ ...expenseForm, date: v })} placeholderTextColor={Colors.textMuted} placeholder="YYYY-MM-DD" />
              <Text style={styles.label}>{t("notes")}</Text>
              <TextInput style={[styles.input, { minHeight: 60 }]} value={expenseForm.notes} onChangeText={(v) => setExpenseForm({ ...expenseForm, notes: v })} placeholderTextColor={Colors.textMuted} placeholder={t("optionalNotes")} multiline />
              <Pressable style={[styles.saveBtn, createExpenseMutation.isPending && { opacity: 0.6 }]} disabled={createExpenseMutation.isPending} onPress={() => {
                const description = expenseForm.description.trim();
                const amount = parseNum(expenseForm.amount);
                if (!description || !expenseForm.amount.trim()) return notify(t("error"), t("descriptionAmountRequired"));
                if (!(amount > 0)) return notify(t("error"), tr3("المبلغ يجب أن يكون أكبر من صفر", "Der Betrag muss größer als 0 sein", "The amount must be greater than 0"));
                const ymd = expenseForm.date.trim();
                if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd) || Number.isNaN(new Date(ymd).getTime())) {
                  return notify(t("error"), tr3("التاريخ بصيغة YYYY-MM-DD", "Datum im Format JJJJ-MM-TT angeben", "Enter the date as YYYY-MM-DD"));
                }
                // The expenses table has category/description but no notes
                // column, so notes travel inside the description. The date is
                // noon of that store-local day, so no time zone shifts it.
                const notes = expenseForm.notes.trim();
                createExpenseMutation.mutate({
                  branchId: myBranchId,
                  employeeId: employee?.id,
                  category: expenseForm.category,
                  description: notes ? `${description} — ${notes}` : description,
                  amount: zeroDec ? String(Math.round(amount)) : amount.toFixed(2),
                  date: new Date(storeDayStart(ymd).getTime() + 12 * 3600000).toISOString(),
                });
              }}>
                <LinearGradient colors={[Colors.accent, Colors.gradientMid]} style={styles.saveBtnGradient}>
                  <Text style={styles.saveBtnText}>{createExpenseMutation.isPending ? t("loading") : t("addExpense")}</Text>
                </LinearGradient>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showAttendance} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("attendance")}</Text>
              <Pressable hitSlop={8} style={styles.closeBtn} accessibilityLabel={t("close" as any)} onPress={() => setShowAttendance(false)}><Ionicons name="close" size={24} color={Colors.text} /></Pressable>
            </View>
            {employee && (
              <View style={[styles.empCard, { marginBottom: 16 }]}>
                <View style={[styles.empAvatar, { backgroundColor: activeShift ? Colors.success + "30" : Colors.textMuted + "30" }]}>
                  <Ionicons name={activeShift ? "radio-button-on" : "radio-button-off"} size={20} color={activeShift ? Colors.success : Colors.textMuted} />
                </View>
                <View style={styles.empInfo}>
                  <Text style={styles.empName}>{employee.name}</Text>
                  {activeShift ? (
                    <Text style={[styles.empMeta, { color: Colors.success }]}>{t("clockedIn")} {activeShiftElapsed ? `| ${activeShiftElapsed}` : ""}</Text>
                  ) : (
                    <Text style={styles.empMeta}>{t("notClockedIn")}</Text>
                  )}
                </View>
                {activeShift ? (
                  <Pressable style={[styles.clockBtn, { backgroundColor: Colors.danger + "20" }, clockOutMutation.isPending && { opacity: 0.6 }]} disabled={clockOutMutation.isPending} onPress={() => clockOutMutation.mutate({ id: activeShift.id, data: {} })}>
                    <Ionicons name="stop-circle" size={20} color={Colors.danger} />
                    <Text style={[styles.clockBtnText, { color: Colors.danger }]}>{t("clockOut")}</Text>
                  </Pressable>
                ) : (
                  <Pressable style={[styles.clockBtn, { backgroundColor: Colors.success + "20" }, clockInMutation.isPending && { opacity: 0.6 }]} disabled={clockInMutation.isPending} onPress={() => clockInMutation.mutate({ employeeId: employee.id, branchId: myBranchId, startTime: new Date().toISOString(), status: "open" })}>
                    <Ionicons name="play-circle" size={20} color={Colors.success} />
                    <Text style={[styles.clockBtnText, { color: Colors.success }]}>{t("clockIn")}</Text>
                  </Pressable>
                )}
              </View>
            )}
            <FlatList
              data={shifts}
              keyExtractor={(item: any) => String(item.id)}
              scrollEnabled={!!shifts.length}
              ListEmptyComponent={<Text style={{ color: Colors.textMuted, textAlign: "center", paddingVertical: 20 }}>{t("noShifts")}</Text>}
              renderItem={({ item }: { item: any }) => {
                const emp = employees.find((e: any) => e.id === item.employeeId);
                return (
                  <View style={styles.empCard}>
                    <View style={[styles.empAvatar, { backgroundColor: item.endTime ? Colors.info + "30" : Colors.success + "30" }]}>
                      <Ionicons name="time" size={20} color={item.endTime ? Colors.info : Colors.success} />
                    </View>
                    <View style={styles.empInfo}>
                      <Text style={styles.empName} numberOfLines={1}>{emp?.name || `#${item.employeeId}`}</Text>
                      <Text style={styles.empMeta}>
                        {fmtDateTime(item.startTime)}
                        {item.endTime ? ` - ${fmtDateTime(item.endTime)}` : ` ${t("shiftActiveLabel")}`}
                      </Text>
                    </View>
                    {item.endTime ? (
                      <View style={[styles.roleBadge, { backgroundColor: Colors.info + "20" }]}>
                        <Text style={[styles.roleText, { color: Colors.info }]}>{formatDuration(item.startTime, item.endTime)}</Text>
                      </View>
                    ) : isAdmin && item.employeeId !== employee?.id ? (
                      <Pressable
                        style={[styles.clockBtn, { backgroundColor: Colors.danger + "20" }]}
                        onPress={() => clockOutMutation.mutate({ id: item.id, data: {} })}
                      >
                        <Ionicons name="stop-circle" size={18} color={Colors.danger} />
                        <Text style={[styles.clockBtnText, { color: Colors.danger }]}>{t("endShift")}</Text>
                      </Pressable>
                    ) : null}
                  </View>
                );
              }}
            />
          </View>
        </View>
      </Modal>

      <Modal visible={showPurchaseOrders} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("purchaseOrders")}</Text>
              <View style={styles.modalActions}>
                <Pressable hitSlop={8} onPress={() => { setPOForm({ supplierId: "", notes: "" }); setShowPOForm(true); }}>
                  <Ionicons name="add-circle" size={28} color={Colors.accent} />
                </Pressable>
                <Pressable hitSlop={8} style={styles.closeBtn} accessibilityLabel={t("close" as any)} onPress={() => setShowPurchaseOrders(false)}><Ionicons name="close" size={24} color={Colors.text} /></Pressable>
              </View>
            </View>
            <FlatList
              data={purchaseOrders}
              keyExtractor={(item: any) => String(item.id)}
              scrollEnabled={!!purchaseOrders.length}
              ListEmptyComponent={<Text style={{ color: Colors.textMuted, textAlign: "center", paddingVertical: 20 }}>{t("noPurchaseOrders")}</Text>}
              renderItem={({ item }: { item: any }) => {
                const sup = suppliers.find((s: any) => s.id === item.supplierId);
                const statusColor = poStatusColors[item.status] || Colors.textMuted;
                return (
                  <View style={styles.empCard}>
                    <View style={[styles.empAvatar, { backgroundColor: statusColor + "30" }]}>
                      <Ionicons name="document-text" size={20} color={statusColor} />
                    </View>
                    <View style={styles.empInfo}>
                      <Text style={styles.empName} numberOfLines={1}>{item.orderNumber || `PO #${item.id}`}</Text>
                      <Text style={styles.empMeta} numberOfLines={1}>{sup?.name || `#${item.supplierId}`} | {formatMoney(item.totalAmount || 0)}</Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <View style={[styles.roleBadge, { backgroundColor: statusColor + "20" }]}>
                        <Text style={[styles.roleText, { color: statusColor }]}>{poStatusLabel(item.status)}</Text>
                      </View>
                      {item.status !== "received" && (
                        <Pressable hitSlop={8} style={styles.iconBtn} disabled={receivePOMutation.isPending} accessibilityLabel={tr3("تم الاستلام", "Als erhalten markieren", "Mark as received")} onPress={() => confirmAction(
                          tr3("تأكيد الاستلام", "Wareneingang bestätigen", "Confirm receipt"),
                          `${item.orderNumber || `PO #${item.id}`}: ${tr3("تسجيل الطلب كمستلَم؟", "Bestellung als erhalten markieren?", "Mark this order as received?")}`,
                          tr3("تم الاستلام", "Erhalten", "Received"),
                          t("cancel"),
                          () => receivePOMutation.mutate(item.id),
                        )}>
                          <Ionicons name="checkmark-circle" size={22} color={Colors.success} />
                        </Pressable>
                      )}
                    </View>
                  </View>
                );
              }}
            />
          </View>
        </View>
      </Modal>

      <Modal visible={showPOForm} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("createPurchaseOrder")}</Text>
              <Pressable hitSlop={8} style={styles.closeBtn} accessibilityLabel={t("close" as any)} onPress={() => setShowPOForm(false)}><Ionicons name="close" size={24} color={Colors.text} /></Pressable>
            </View>
            <ScrollView>
              <Text style={styles.label}>{t("supplier")} *</Text>
              <View style={styles.roleRow}>
                {suppliers.map((s: any) => (
                  <Pressable key={s.id} style={[styles.roleChip, poForm.supplierId === String(s.id) && { backgroundColor: Colors.accent }]} onPress={() => setPOForm({ ...poForm, supplierId: String(s.id) })}>
                    <Text style={[styles.roleChipText, poForm.supplierId === String(s.id) && { color: Colors.textDark }]}>{s.name}</Text>
                  </Pressable>
                ))}
              </View>
              {suppliers.length === 0 && (
                <Text style={{ color: Colors.textMuted, fontSize: 12, marginTop: 4 }}>{tr3("أضف مورداً أولاً من قائمة الموردين.", "Zuerst unter Lieferanten einen Lieferanten anlegen.", "Add a supplier first under Suppliers.")}</Text>
              )}
              <Text style={styles.label}>{t("notes")}</Text>
              <TextInput style={[styles.input, { minHeight: 60 }]} value={poForm.notes} onChangeText={(v) => setPOForm({ ...poForm, notes: v })} placeholderTextColor={Colors.textMuted} placeholder={t("optionalNotes")} multiline />
              <Pressable style={[styles.saveBtn, createPOMutation.isPending && { opacity: 0.6 }]} disabled={createPOMutation.isPending} onPress={() => {
                if (!poForm.supplierId) return notify(t("error"), t("pleaseSelectSupplier"));
                // order_number is NOT NULL + UNIQUE and the server does not
                // generate one, so the client supplies it.
                const orderNumber = `PO-${storeYmd().replace(/-/g, "")}-${Date.now().toString(36).slice(-5).toUpperCase()}`;
                createPOMutation.mutate({ orderNumber, branchId: myBranchId, supplierId: parseInt(poForm.supplierId, 10), status: "draft", notes: poForm.notes.trim() || undefined });
              }}>
                <LinearGradient colors={[Colors.accent, Colors.gradientMid]} style={styles.saveBtnGradient}>
                  <Text style={styles.saveBtnText}>{createPOMutation.isPending ? t("loading") : t("createOrder")}</Text>
                </LinearGradient>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showActivityLog} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("activityLog")}</Text>
              <Pressable hitSlop={8} style={styles.closeBtn} accessibilityLabel={t("close" as any)} onPress={() => setShowActivityLog(false)}><Ionicons name="close" size={24} color={Colors.text} /></Pressable>
            </View>
            <FlatList
              data={activityLog}
              keyExtractor={(item: any) => String(item.id)}
              scrollEnabled={!!activityLog.length}
              ListEmptyComponent={<Text style={{ color: Colors.textMuted, textAlign: "center", paddingVertical: 20 }}>{t("noActivity")}</Text>}
              renderItem={({ item }: { item: any }) => {
                const actionIcons: Record<string, string> = { sale_created: "cart", login: "log-in", return_created: "swap-horizontal", shift_closed: "time" };
                const iconName = actionIcons[item.action] || "ellipse";
                const emp = employees.find((e: any) => e.id === item.employeeId);
                return (
                  <View style={styles.empCard}>
                    <View style={[styles.empAvatar, { backgroundColor: Colors.secondary + "30" }]}>
                      <Ionicons name={iconName as any} size={20} color={Colors.secondary} />
                    </View>
                    <View style={styles.empInfo}>
                      <Text style={styles.empName} numberOfLines={1}>{emp?.name || `#${item.employeeId}`}</Text>
                      <Text style={styles.empMeta} numberOfLines={3}>{item.details || item.action}</Text>
                      <Text style={[styles.empMeta, { fontSize: 10 }]}>{fmtDateTime(item.createdAt || item.timestamp)}</Text>
                    </View>
                    <View style={[styles.roleBadge, { backgroundColor: Colors.secondary + "20" }]}>
                      <Text style={[styles.roleText, { color: Colors.secondary }]}>{item.action?.replace(/_/g, " ") || "action"}</Text>
                    </View>
                  </View>
                );
              }}
            />
          </View>
        </View>
      </Modal>

      <Modal visible={showReturnsManager} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("returnsRefunds")}</Text>
              <View style={styles.modalActions}>
                <Pressable hitSlop={8} onPress={() => { setReturnForm({ originalSaleId: "", reason: "", type: "refund" }); setShowReturnForm(true); }}>
                  <Ionicons name="add-circle" size={28} color={Colors.accent} />
                </Pressable>
                <Pressable hitSlop={8} style={styles.closeBtn} accessibilityLabel={t("close" as any)} onPress={() => setShowReturnsManager(false)}><Ionicons name="close" size={24} color={Colors.text} /></Pressable>
              </View>
            </View>
            <FlatList
              data={returns}
              keyExtractor={(item: any) => String(item.id)}
              scrollEnabled={!!returns.length}
              ListEmptyComponent={<Text style={{ color: Colors.textMuted, textAlign: "center", paddingVertical: 20 }}>{t("noReturns")}</Text>}
              renderItem={({ item }: { item: any }) => (
                <View style={styles.empCard}>
                  <View style={[styles.empAvatar, { backgroundColor: Colors.warning + "30" }]}>
                    <Ionicons name="swap-horizontal" size={20} color={Colors.warning} />
                  </View>
                  <View style={styles.empInfo}>
                    <Text style={styles.empName} numberOfLines={1}>{tr3("مرتجع", "Retoure", "Return")} #{item.id} · {tr3("بيع", "Verkauf", "Sale")} #{item.originalSaleId}</Text>
                    <Text style={styles.empMeta} numberOfLines={2}>{formatMoney(item.totalAmount)} | {item.reason || t("noReason")} | {fmtDate(item.createdAt)}</Text>
                  </View>
                  <View style={[styles.roleBadge, { backgroundColor: ((item.status || "completed") === "completed" ? Colors.success : Colors.warning) + "20" }]}>
                    <Text style={[styles.roleText, { color: (item.status || "completed") === "completed" ? Colors.success : Colors.warning }]}>{(item.status || "completed") === "completed" ? t("completed") : item.status === "pending" ? t("pending") : item.status}</Text>
                  </View>
                </View>
              )}
            />
          </View>
        </View>
      </Modal>

      <Modal visible={showReturnForm} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("processReturn")}</Text>
              <Pressable hitSlop={8} style={styles.closeBtn} accessibilityLabel={t("close" as any)} onPress={() => setShowReturnForm(false)}><Ionicons name="close" size={24} color={Colors.text} /></Pressable>
            </View>
            <ScrollView>
              <Text style={styles.label}>{t("selectSaleToReturn")}</Text>
              <FlatList
                data={salesList.filter((s: any) => s.status === "completed").slice(0, 20)}
                keyExtractor={(item: any) => String(item.id)}
                scrollEnabled={false}
                ListEmptyComponent={<Text style={{ color: Colors.textMuted, textAlign: "center", paddingVertical: 16 }}>{tr3("لا توجد مبيعات مكتملة", "Keine abgeschlossenen Verkäufe", "No completed sales")}</Text>}
                renderItem={({ item }: { item: any }) => (
                  <Pressable
                    style={[styles.empCard, returnForm.originalSaleId === String(item.id) && { borderWidth: 2, borderColor: Colors.accent }]}
                    onPress={() => setReturnForm({ ...returnForm, originalSaleId: String(item.id) })}
                  >
                    <View style={styles.empInfo}>
                      <Text style={styles.empName}>{getDisplayNumber(item.receiptNumber) || `#${item.id}`}</Text>
                      <Text style={styles.empMeta}>{formatMoney(item.totalAmount)} | {fmtDate(item.createdAt)} | {t(item.paymentMethod as any)}</Text>
                    </View>
                    {returnForm.originalSaleId === String(item.id) && <Ionicons name="checkmark-circle" size={22} color={Colors.accent} />}
                  </Pressable>
                )}
              />
              <Text style={styles.label}>{t("returnType")}</Text>
              <View style={styles.roleRow}>
                {["refund", "exchange", "store_credit"].map((rt) => (
                  <Pressable key={rt} style={[styles.roleChip, returnForm.type === rt && { backgroundColor: Colors.accent }]} onPress={() => setReturnForm({ ...returnForm, type: rt })}>
                    <Text style={[styles.roleChipText, returnForm.type === rt && { color: Colors.textDark }]}>{t(rt as any)}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.label}>{t("reason")}</Text>
              <TextInput style={styles.input} value={returnForm.reason} onChangeText={(v) => setReturnForm({ ...returnForm, reason: v })} placeholderTextColor={Colors.textMuted} placeholder={t("reasonForReturn")} />
              <Pressable style={[styles.saveBtn, createReturnMutation.isPending && { opacity: 0.6 }]} disabled={createReturnMutation.isPending} onPress={() => {
                if (!returnForm.originalSaleId) return notify(t("error"), t("selectSaleError"));
                const sale = salesList.find((s: any) => String(s.id) === returnForm.originalSaleId);
                confirmAction(
                  t("processReturn"),
                  `${getDisplayNumber(sale?.receiptNumber) || `#${returnForm.originalSaleId}`} · ${formatMoney(sale?.totalAmount || 0)}\n${tr3("سيُعاد المخزون ويُسجَّل البيع كمُسترد.", "Der Bestand wird zurückgebucht und der Verkauf als erstattet markiert.", "Stock is put back and the sale is marked as refunded.")}`,
                  t("processReturn"),
                  t("cancel"),
                  () => createReturnMutation.mutate(returnForm),
                );
              }}>
                <LinearGradient colors={[Colors.warning, Colors.danger]} style={styles.saveBtnGradient}>
                  <Text style={styles.saveBtnText}>{createReturnMutation.isPending ? t("loading") : t("processReturn")}</Text>
                </LinearGradient>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showCashDrawer} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("cashDrawer")}</Text>
              <Pressable hitSlop={8} style={styles.closeBtn} accessibilityLabel={t("close" as any)} onPress={() => setShowCashDrawer(false)}><Ionicons name="close" size={24} color={Colors.text} /></Pressable>
            </View>
            <ScrollView>
              {/* Shift status info */}
              {activeShift ? (
                <View style={{ backgroundColor: Colors.success + "15", borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: Colors.success + "30" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.success }} />
                    <Text style={{ color: Colors.success, fontSize: 14, fontWeight: "700" }}>{t("activeShift")}</Text>
                  </View>
                  <Text style={{ color: Colors.textMuted, fontSize: 12 }}>{t("openingCash")}: {formatMoney(activeShift.openingCash || 0)}</Text>
                  <Text style={{ color: Colors.textMuted, fontSize: 12, marginTop: 2 }}>{t("durationLabel")}: {activeShiftElapsed || "0:00"}</Text>
                </View>
              ) : (
                <View style={{ backgroundColor: Colors.warning + "15", borderRadius: 14, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: Colors.warning + "30" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Ionicons name="warning-outline" size={16} color={Colors.warning} />
                    <Text style={{ color: Colors.warning, fontSize: 13, fontWeight: "600", flex: 1 }}>{t("noActiveShift")} — {t("noActiveShiftCashDrawer")}</Text>
                  </View>
                </View>
              )}

              <Text style={styles.label}>{t("operationType")}</Text>
              <View style={styles.roleRow}>
                {["withdrawal", "deposit", "count"].map((ct) => (
                  <Pressable key={ct} style={[styles.roleChip, cashDrawerForm.type === ct && { backgroundColor: Colors.accent }]} onPress={() => setCashDrawerForm({ ...cashDrawerForm, type: ct })}>
                    <Text style={[styles.roleChipText, cashDrawerForm.type === ct && { color: Colors.textDark }]}>{t(ct as any)}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.label}>{t("amount")} * ({currencyLabel()})</Text>
              <TextInput style={styles.input} value={cashDrawerForm.amount} onChangeText={(v) => setCashDrawerForm({ ...cashDrawerForm, amount: v })} keyboardType={moneyKeyboard} placeholderTextColor={Colors.textMuted} placeholder={moneyPlaceholder} />

              <Text style={styles.label}>{t("reason")}</Text>
              <TextInput style={styles.input} value={cashDrawerForm.reason} onChangeText={(v) => setCashDrawerForm({ ...cashDrawerForm, reason: v })} placeholderTextColor={Colors.textMuted} placeholder={t("reasonForOperation")} />

              <Pressable style={[styles.saveBtn, cashDrawerMutation.isPending && { opacity: 0.6 }]} disabled={cashDrawerMutation.isPending} onPress={() => {
                if (!cashDrawerForm.amount.trim()) return notify(t("error"), t("amountRequired"));
                const amount = parseNum(cashDrawerForm.amount);
                if (!(amount >= 0) || (cashDrawerForm.type !== "count" && !(amount > 0))) {
                  return notify(t("error"), tr3("المبلغ غير صالح", "Ungültiger Betrag", "Invalid amount"));
                }
                cashDrawerMutation.mutate({
                  shiftId: activeShift?.id || null,
                  employeeId: employee?.id,
                  tenantId: tenant?.id,
                  type: cashDrawerForm.type,
                  amount: zeroDec ? String(Math.round(amount)) : amount.toFixed(2),
                  reason: cashDrawerForm.reason.trim(),
                });
              }}>
                <LinearGradient colors={[Colors.accent, Colors.gradientMid]} style={styles.saveBtnGradient}>
                  <Text style={styles.saveBtnText}>{cashDrawerMutation.isPending ? t("loading") : t("recordOperation")}</Text>
                </LinearGradient>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showWarehouseManager} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("warehouses")}</Text>
              <View style={styles.modalActions}>
                <Pressable hitSlop={8} onPress={() => { setWarehouseForm({ name: "", address: "" }); setShowWarehouseForm(true); }}>
                  <Ionicons name="add-circle" size={28} color={Colors.accent} />
                </Pressable>
                <Pressable hitSlop={8} style={styles.closeBtn} accessibilityLabel={t("close" as any)} onPress={() => setShowWarehouseManager(false)}><Ionicons name="close" size={24} color={Colors.text} /></Pressable>
              </View>
            </View>
            <FlatList
              data={warehousesList}
              keyExtractor={(item: any) => String(item.id)}
              scrollEnabled={!!warehousesList.length}
              ListEmptyComponent={<Text style={{ color: Colors.textMuted, textAlign: "center", paddingVertical: 20 }}>{t("noWarehouses")}</Text>}
              renderItem={({ item }: { item: any }) => (
                <View style={styles.empCard}>
                  <View style={[styles.empAvatar, { backgroundColor: Colors.accent + "30" }]}>
                    <Ionicons name="home" size={20} color={Colors.accent} />
                  </View>
                  <View style={styles.empInfo}>
                    <Text style={styles.empName}>{item.name}</Text>
                    <Text style={styles.empMeta}>{item.address || t("noAddress")}</Text>
                  </View>
                  {item.isDefault && (
                    <View style={[styles.roleBadge, { backgroundColor: Colors.accent + "20" }]}>
                      <Text style={[styles.roleText, { color: Colors.accent }]}>{t("default")}</Text>
                    </View>
                  )}
                </View>
              )}
            />
          </View>
        </View>
      </Modal>

      <Modal visible={showWarehouseForm} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("newWarehouse")}</Text>
              <Pressable hitSlop={8} style={styles.closeBtn} accessibilityLabel={t("close" as any)} onPress={() => setShowWarehouseForm(false)}><Ionicons name="close" size={24} color={Colors.text} /></Pressable>
            </View>
            <ScrollView>
              <Text style={styles.label}>{t("name")} *</Text>
              <TextInput style={styles.input} value={warehouseForm.name} onChangeText={(v) => setWarehouseForm({ ...warehouseForm, name: v })} placeholderTextColor={Colors.textMuted} placeholder={t("warehouseName")} />
              <Text style={styles.label}>{t("address")}</Text>
              <TextInput style={styles.input} value={warehouseForm.address} onChangeText={(v) => setWarehouseForm({ ...warehouseForm, address: v })} placeholderTextColor={Colors.textMuted} placeholder={t("warehouseAddress")} />
              {/* No "type" picker: the warehouses table has no type column, so
                  the choice was silently dropped on save. */}
              <Pressable style={[styles.saveBtn, createWarehouseMutation.isPending && { opacity: 0.6 }]} disabled={createWarehouseMutation.isPending} onPress={() => {
                const name = warehouseForm.name.trim();
                if (!name) return notify(t("error"), t("warehouseNameRequired"));
                if (!myBranchId) return notify(t("error"), t("noBranches"));
                // This store's own branch — never a hard-coded branch 1, which
                // belongs to another store and hid the warehouse from this one.
                createWarehouseMutation.mutate({ name, address: warehouseForm.address.trim() || undefined, branchId: myBranchId, isDefault: warehousesList.length === 0 });
              }}>
                <LinearGradient colors={[Colors.accent, Colors.gradientMid]} style={styles.saveBtnGradient}>
                  <Text style={styles.saveBtnText}>{createWarehouseMutation.isPending ? t("loading") : t("createWarehouse")}</Text>
                </LinearGradient>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showBatchManager} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: "85%" }]}>
            {batchView === "list" ? (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{t("productBatches")}</Text>
                  <View style={styles.modalActions}>
                    <Pressable hitSlop={8} onPress={() => {
                      setEditBatch(null);
                      setBatchForm({ productId: productsList.length > 0 ? String(productsList[0].id) : "", batchNumber: `BATCH-${Date.now().toString(36).toUpperCase()}`, quantity: "50", expiryDate: "", costPrice: "", supplierId: "" });
                      setBatchView("form");
                    }}>
                      <Ionicons name="add-circle" size={28} color={Colors.accent} />
                    </Pressable>
                    <Pressable hitSlop={8} style={styles.closeBtn} accessibilityLabel={t("close" as any)} onPress={() => setShowBatchManager(false)}><Ionicons name="close" size={24} color={Colors.text} /></Pressable>
                  </View>
                </View>
                <FlatList
                  data={batchesList}
                  keyExtractor={(item: any) => String(item.id)}
                  scrollEnabled={!!batchesList.length}
                  ListEmptyComponent={<Text style={{ color: Colors.textMuted, textAlign: "center", paddingVertical: 20 }}>{t("noBatches")}</Text>}
                  renderItem={({ item }: { item: any }) => {
                    const prod = productsList.find((p: any) => p.id === item.productId);
                    const isExpired = item.expiryDate && new Date(item.expiryDate) < new Date();
                    const isNearExpiry = item.expiryDate && !isExpired && (new Date(item.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24) <= 30;
                    return (
                      <View style={[styles.empCard, { flexDirection: rowFlip ? "row-reverse" : "row" }]}>
                        <Pressable style={{ flexDirection: rowFlip ? "row-reverse" : "row", flex: 1, alignItems: "center", gap: 12 }} onPress={() => {
                          setEditBatch(item);
                          setBatchForm({
                            productId: String(item.productId),
                            batchNumber: item.batchNumber || "",
                            quantity: String(item.quantity || 0),
                            expiryDate: item.expiryDate ? new Date(item.expiryDate).toISOString().split("T")[0] : "",
                            costPrice: item.costPrice ? String(item.costPrice) : "",
                            supplierId: item.supplierId ? String(item.supplierId) : "",
                          });
                          setBatchView("form");
                        }}>
                          <View style={[styles.empAvatar, { backgroundColor: (isExpired ? Colors.danger : isNearExpiry ? Colors.warning : Colors.secondary) + "30" }]}>
                            <Ionicons name="layers" size={20} color={isExpired ? Colors.danger : isNearExpiry ? Colors.warning : Colors.secondary} />
                          </View>
                          <View style={[styles.empInfo, { flex: 1 }]}>
                            <Text style={[styles.empName, rtlTextAlign]} numberOfLines={1}>{prod?.name || `#${item.productId}`}</Text>
                            <Text style={[styles.empMeta, rtlTextAlign]}>
                              {t("batchNumber")}: {item.batchNumber} | {t("quantity")}: {item.quantity}
                              {item.expiryDate ? ` | ${t("expiryDate")}: ${new Date(item.expiryDate).toISOString().slice(0, 10)}` : ""}
                            </Text>
                            {item.costPrice != null && item.costPrice !== "" ? <Text style={[styles.empMeta, { color: Colors.accent }, rtlTextAlign]}>{t("cost")}: {formatMoney(item.costPrice)}</Text> : null}
                          </View>
                          {isExpired && (
                            <View style={[styles.roleBadge, { backgroundColor: Colors.danger + "20" }]}>
                              <Text style={[styles.roleText, { color: Colors.danger }]}>{t("expired")}</Text>
                            </View>
                          )}
                          {isNearExpiry && (
                            <View style={[styles.roleBadge, { backgroundColor: Colors.warning + "20" }]}>
                              <Text style={[styles.roleText, { color: Colors.warning }]}>{t("nearExpiry")}</Text>
                            </View>
                          )}
                        </Pressable>
                        <View style={{ flexDirection: "row", gap: 6, marginLeft: isRTL ? 0 : 8, marginRight: isRTL ? 8 : 0 }}>
                          <Pressable onPress={() => {
                            setEditBatch(item);
                            setBatchForm({
                              productId: String(item.productId),
                              batchNumber: item.batchNumber || "",
                              quantity: String(item.quantity || 0),
                              expiryDate: item.expiryDate ? new Date(item.expiryDate).toISOString().split("T")[0] : "",
                              costPrice: item.costPrice ? String(item.costPrice) : "",
                              supplierId: item.supplierId ? String(item.supplierId) : "",
                            });
                            setBatchView("form");
                          }} style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.info + "20", justifyContent: "center", alignItems: "center" }}>
                            <Ionicons name="create-outline" size={18} color={Colors.info} />
                          </Pressable>
                          <Pressable accessibilityLabel={t("deleteBatch")} onPress={() => {
                            confirmAction(t("deleteBatch"), `${prod?.name || ""} · ${item.batchNumber}`, t("delete"), t("cancel"), () => deleteBatchMutation.mutate(item.id));
                          }} style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.danger + "20", justifyContent: "center", alignItems: "center" }}>
                            <Ionicons name="trash-outline" size={18} color={Colors.danger} />
                          </Pressable>
                        </View>
                      </View>
                    );
                  }}
                />
              </>
            ) : (
              <>
                <View style={styles.modalHeader}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <Pressable hitSlop={8} style={styles.closeBtn} accessibilityLabel={t("back" as any)} onPress={() => setBatchView("list")}><Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={24} color={Colors.text} /></Pressable>
                    <Text style={styles.modalTitle}>{editBatch ? t("editBatch") : t("newBatch")}</Text>
                  </View>
                  <Pressable hitSlop={8} style={styles.closeBtn} accessibilityLabel={t("close" as any)} onPress={() => { setBatchView("list"); setShowBatchManager(false); }}><Ionicons name="close" size={24} color={Colors.text} /></Pressable>
                </View>
                <ScrollView>
                  <Text style={styles.label}>{t("product")}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      {productsList.map((p: any) => (
                        <Pressable key={p.id} style={[styles.roleChip, batchForm.productId === String(p.id) && { backgroundColor: Colors.accent }]} onPress={() => setBatchForm({ ...batchForm, productId: String(p.id) })}>
                          <Text style={[styles.roleChipText, batchForm.productId === String(p.id) && { color: Colors.textDark }]} numberOfLines={1}>{p.name}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </ScrollView>

                  <Text style={styles.label}>{t("batchNumber")}</Text>
                  <TextInput style={styles.formInput} placeholder="BATCH-001" placeholderTextColor={Colors.textMuted} value={batchForm.batchNumber} onChangeText={(v) => setBatchForm({ ...batchForm, batchNumber: v })} />

                  <Text style={styles.label}>{t("quantity")}</Text>
                  <TextInput style={styles.formInput} placeholder={t("quantity")} placeholderTextColor={Colors.textMuted} value={batchForm.quantity} onChangeText={(v) => setBatchForm({ ...batchForm, quantity: v.replace(/[^0-9]/g, "") })} keyboardType="number-pad" />

                  <Text style={styles.label}>{t("expiryDate")}</Text>
                  <TextInput style={styles.formInput} placeholder="YYYY-MM-DD" placeholderTextColor={Colors.textMuted} value={batchForm.expiryDate} onChangeText={(v) => setBatchForm({ ...batchForm, expiryDate: v })} />

                  <Text style={styles.label}>{t("costPrice")} ({currencyLabel()})</Text>
                  <TextInput style={styles.formInput} placeholder={moneyPlaceholder} placeholderTextColor={Colors.textMuted} value={batchForm.costPrice} onChangeText={(v) => setBatchForm({ ...batchForm, costPrice: v })} keyboardType={moneyKeyboard} />

                  <Text style={styles.label}>{t("supplier")}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <Pressable style={[styles.roleChip, !batchForm.supplierId && { backgroundColor: Colors.accent }]} onPress={() => setBatchForm({ ...batchForm, supplierId: "" })}>
                        <Text style={[styles.roleChipText, !batchForm.supplierId && { color: Colors.textDark }]}>{t("none")}</Text>
                      </Pressable>
                      {suppliers.map((s: any) => (
                        <Pressable key={s.id} style={[styles.roleChip, batchForm.supplierId === String(s.id) && { backgroundColor: Colors.accent }]} onPress={() => setBatchForm({ ...batchForm, supplierId: String(s.id) })}>
                          <Text style={[styles.roleChipText, batchForm.supplierId === String(s.id) && { color: Colors.textDark }]}>{s.name}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </ScrollView>

                  <Pressable style={[styles.saveBtn, batchSaving && { opacity: 0.6 }]} disabled={batchSaving} onPress={() => {
                    const batchNumber = batchForm.batchNumber.trim();
                    if (!batchForm.productId || !batchNumber) return notify(t("error"), t("productBatchRequired"));
                    const expiry = batchForm.expiryDate.trim();
                    if (expiry && (!/^\d{4}-\d{2}-\d{2}$/.test(expiry) || Number.isNaN(new Date(expiry).getTime()))) {
                      return notify(t("error"), tr3("تاريخ الانتهاء بصيغة YYYY-MM-DD", "Ablaufdatum im Format JJJJ-MM-TT angeben", "Enter the expiry date as YYYY-MM-DD"));
                    }
                    const cost = batchForm.costPrice.trim() === "" ? null : parseNum(batchForm.costPrice);
                    if (cost !== null && !(cost >= 0)) return notify(t("error"), tr3("سعر التكلفة غير صالح", "Ungültiger Einkaufspreis", "Invalid cost price"));
                    const payload: any = {
                      productId: Number(batchForm.productId),
                      batchNumber,
                      quantity: parseInt(batchForm.quantity || "0", 10) || 0,
                      // The batch list only shows batches on this store's own
                      // branches, so never fall back to a hard-coded branch 1.
                      branchId: editBatch?.branchId || myBranchId,
                    };
                    // Stored as UTC midnight of the chosen day; the list reads it back the same way.
                    if (expiry) payload.expiryDate = new Date(`${expiry}T00:00:00.000Z`).toISOString();
                    if (cost !== null) payload.costPrice = zeroDec ? String(Math.round(cost)) : cost.toFixed(2);
                    else if (editBatch) payload.costPrice = null;
                    if (batchForm.supplierId) payload.supplierId = Number(batchForm.supplierId);
                    else if (editBatch) payload.supplierId = null;
                    if (editBatch) {
                      updateBatchMutation.mutate({ id: editBatch.id, data: payload }, { onSuccess: () => setBatchView("list") });
                    } else {
                      createBatchMutation.mutate(payload, { onSuccess: () => setBatchView("list") });
                    }
                  }}>
                    <LinearGradient colors={[Colors.gradientStart, Colors.accent]} style={styles.saveBtnGradient}>
                      <Ionicons name="checkmark" size={20} color={Colors.white} />
                      <Text style={styles.saveBtnText}>{batchSaving ? t("loading") : editBatch ? t("updateBatch") : t("createBatch")}</Text>
                    </LinearGradient>
                  </Pressable>

                  {editBatch && (
                    <Pressable style={[styles.saveBtn, { marginTop: 8 }]} disabled={deleteBatchMutation.isPending} onPress={() => {
                      confirmAction(t("deleteBatch"), t("areYouSure"), t("delete"), t("cancel"), () => deleteBatchMutation.mutate(editBatch.id, { onSuccess: () => setBatchView("list") }));
                    }}>
                      <View style={[styles.saveBtnGradient, { backgroundColor: Colors.danger + "20" }]}>
                        <Ionicons name="trash" size={20} color={Colors.danger} />
                        <Text style={[styles.saveBtnText, { color: Colors.danger }]}>{t("deleteBatch")}</Text>
                      </View>
                    </Pressable>
                  )}
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={showPrinterSettings} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("receiptPrinter")}</Text>
              <Pressable hitSlop={8} style={styles.closeBtn} accessibilityLabel={t("close" as any)} onPress={() => setShowPrinterSettings(false)}><Ionicons name="close" size={24} color={Colors.text} /></Pressable>
            </View>
            <ScrollView>
              {/* The till prints through the system print dialog (browser or
                  OS), so there is no connection state to report here; these
                  choices are saved on this device only. */}
              <View style={[styles.empCard, { marginBottom: 16 }]}>
                <View style={[styles.empAvatar, { backgroundColor: Colors.info + "30" }]}>
                  <Ionicons name="print" size={20} color={Colors.info} />
                </View>
                <View style={styles.empInfo}>
                  <Text style={styles.empName}>{t("printerStatus")}</Text>
                  <Text style={styles.empMeta}>
                    {tr3("الطباعة عبر نافذة الطباعة في النظام · محفوظ على هذا الجهاز", "Druck über den Systemdruckdialog · auf diesem Gerät gespeichert", "Prints via the system print dialog · saved on this device")}
                  </Text>
                </View>
              </View>

              <Text style={styles.label}>{t("paperSize")}</Text>
              <View style={styles.roleRow}>
                {(["58mm", "80mm"] as const).map((s) => (
                  <Pressable key={s} style={[styles.roleChip, printerPrefs.paperSize === s && { backgroundColor: Colors.accent }]} onPress={() => updatePrinterPrefs({ paperSize: s })}>
                    <Text style={[styles.roleChipText, printerPrefs.paperSize === s && { color: Colors.textDark }]}>{s}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.label}>{t("autoPrintReceipts")}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: Colors.surfaceLight, borderRadius: 12, padding: 14, marginTop: 4 }}>
                <Text style={{ color: Colors.text, fontSize: 14, flex: 1 }}>{t("printAfterEverySale")}</Text>
                <Switch value={printerPrefs.autoPrint} onValueChange={(v) => updatePrinterPrefs({ autoPrint: v })} trackColor={{ false: Colors.inputBorder, true: Colors.accent + "60" }} thumbColor={printerPrefs.autoPrint ? Colors.accent : Colors.textMuted} />
              </View>
              {!printerPrefs.autoPrint && (
                <Text style={{ color: Colors.textMuted, fontSize: 12, marginTop: 6 }}>
                  {tr3("يمكن طباعة الإيصال لاحقاً من سجل الفواتير.", "Belege können später aus dem Rechnungsverlauf gedruckt werden.", "Receipts can still be printed later from the invoice history.")}
                </Text>
              )}

              <Pressable style={styles.saveBtn} onPress={() => {
                const k = zeroDec ? 1000 : 1; // SYP has no minor units: use realistic amounts
                const sampleReceipt = `================================\n        SAMPLE RECEIPT\n================================\nDate: ${fmtDateTime(new Date())}\nReceipt #: TEST-001\n--------------------------------\nItem 1        x2  ${formatMoney(10 * k)}\nItem 2        x1   ${formatMoney(5.5 * k)}\n--------------------------------\nSubtotal:          ${formatMoney(15.5 * k)}\nTax (10%):          ${formatMoney(1.55 * k)}\n--------------------------------\nTOTAL:             ${formatMoney(17.05 * k)}\n================================\n      Thank you!\n================================`;
                // Both web and native go through the shared printer so the
                // test print produces a real print / Save-as-PDF sheet in the app.
                printHtmlViaIframe(`<pre style="font-family:monospace;font-size:12px;">${sampleReceipt}</pre>`);
              }}>
                <LinearGradient colors={[Colors.accent, Colors.gradientMid]} style={styles.saveBtnGradient}>
                  <Text style={styles.saveBtnText}>{t("testPrint")}</Text>
                </LinearGradient>
              </Pressable>

              <View style={{ backgroundColor: Colors.info + "15", borderRadius: 12, padding: 14, marginTop: 8, borderWidth: 1, borderColor: Colors.info + "30" }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <Ionicons name="information-circle" size={18} color={Colors.info} />
                  <Text style={{ color: Colors.info, fontSize: 13, fontWeight: "600" }}>{t("connectionInfo")}</Text>
                </View>
                <Text style={{ color: Colors.textMuted, fontSize: 12, lineHeight: 18 }}>{t("printerConnectionDetails")}</Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showLanguagePicker} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxWidth: 340, maxHeight: 420 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("language")}</Text>
              <Pressable hitSlop={8} style={styles.closeBtn} accessibilityLabel={t("close" as any)} onPress={() => setShowLanguagePicker(false)}><Ionicons name="close" size={24} color={Colors.text} /></Pressable>
            </View>
            <Pressable
              testID="lang-en"
              style={[styles.empCard, language === "en" && { borderWidth: 2, borderColor: Colors.accent }]}
              onPress={() => { setLanguage("en"); setShowLanguagePicker(false); apiRequest("PUT", "/api/system-language", { language: "en" }).catch(() => {}); }}
            >
              <View style={[styles.empAvatar, { backgroundColor: Colors.info + "30" }]}>
                <FlagIcon code="en" width={24} height={17} />
              </View>
              <View style={styles.empInfo}>
                <Text style={styles.empName}>English</Text>
                <Text style={styles.empMeta}>{tr3("من اليسار إلى اليمين", "Von links nach rechts", "Left to right")}</Text>
              </View>
              {language === "en" && <Ionicons name="checkmark-circle" size={22} color={Colors.accent} />}
            </Pressable>
            <Pressable
              testID="lang-ar"
              style={[styles.empCard, language === "ar" && { borderWidth: 2, borderColor: Colors.accent }]}
              onPress={() => { setLanguage("ar"); setShowLanguagePicker(false); apiRequest("PUT", "/api/system-language", { language: "ar" }).catch(() => {}); }}
            >
              <View style={[styles.empAvatar, { backgroundColor: Colors.success + "30" }]}>
                <FlagIcon code="ar" width={24} height={17} />
              </View>
              <View style={styles.empInfo}>
                <Text style={styles.empName}>العربية</Text>
                <Text style={styles.empMeta}>{tr3("من اليمين إلى اليسار", "Von rechts nach links", "Right to left")}</Text>
              </View>
              {language === "ar" && <Ionicons name="checkmark-circle" size={22} color={Colors.accent} />}
            </Pressable>
            <Pressable
              testID="lang-de"
              style={[styles.empCard, language === "de" && { borderWidth: 2, borderColor: Colors.accent }]}
              onPress={() => { setLanguage("de"); setShowLanguagePicker(false); apiRequest("PUT", "/api/system-language", { language: "de" }).catch(() => {}); }}
            >
              <View style={[styles.empAvatar, { backgroundColor: Colors.warning + "30" }]}>
                <FlagIcon code="de" width={24} height={17} />
              </View>
              <View style={styles.empInfo}>
                <Text style={styles.empName}>Deutsch</Text>
                <Text style={styles.empMeta}>{tr3("من اليسار إلى اليمين", "Von links nach rechts", "Left to right")}</Text>
              </View>
              {language === "de" && <Ionicons name="checkmark-circle" size={22} color={Colors.accent} />}
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={showShiftMonitor} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: "90%" }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("shiftMonitor")}</Text>
              <Pressable hitSlop={8} style={styles.closeBtn} accessibilityLabel={t("close" as any)} onPress={() => setShowShiftMonitor(false)}><Ionicons name="close" size={24} color={Colors.text} /></Pressable>
            </View>
            <View style={{ flexDirection: "row", gap: 6, marginBottom: 14 }}>
              {(["active", "history", "settings"] as const).map((tab) => (
                <Pressable key={tab} style={[smStyles.tab, shiftMonitorTab === tab && smStyles.tabActive]} onPress={() => setShiftMonitorTab(tab)}>
                  <Text style={[smStyles.tabText, shiftMonitorTab === tab && smStyles.tabTextActive]}>{t(tab === "active" ? "activeShiftsTab" : tab === "history" ? "shiftHistory" : "shiftSettings")}</Text>
                </Pressable>
              ))}
            </View>

            {shiftMonitorTab === "active" && (
              <FlatList
                data={allActiveShifts}
                keyExtractor={(item: any) => String(item.id)}
                scrollEnabled={!!allActiveShifts.length}
                ListEmptyComponent={
                  <View style={{ alignItems: "center", paddingVertical: 30 }}>
                    <Ionicons name="checkmark-circle" size={40} color={Colors.success} />
                    <Text style={{ color: Colors.textMuted, fontSize: 14, marginTop: 8 }}>{t("noActiveShiftsNow")}</Text>
                  </View>
                }
                renderItem={({ item }: { item: any }) => {
                  const emp = employees.find((e: any) => e.id === item.employeeId);
                  const { progress, isOvertime, elapsedHours, expectedHours } = getShiftProgress(item);
                  const progressColor = isOvertime ? Colors.danger : progress > 0.8 ? Colors.warning : Colors.accent;
                  return (
                    <View style={[smStyles.shiftCard, isOvertime && { borderColor: Colors.danger + "40" }]}>
                      <View style={{ flexDirection: rowFlip ? "row-reverse" : "row", alignItems: "center", marginBottom: 8 }}>
                        <View style={[styles.empAvatar, { backgroundColor: (roleColors[emp?.role || "cashier"] || Colors.info) + "30" }]}>
                          <Text style={styles.empInitial}>{emp?.name?.charAt(0) || "?"}</Text>
                        </View>
                        <View style={[styles.empInfo, rowFlip && { alignItems: "flex-end" }]}>
                          <Text style={styles.empName}>{emp?.name || `#${item.employeeId}`}</Text>
                          <View style={{ flexDirection: rowFlip ? "row-reverse" : "row", alignItems: "center", gap: 6, marginTop: 2 }}>
                            <View style={[styles.roleBadge, { backgroundColor: (roleColors[emp?.role || "cashier"] || Colors.info) + "20", marginTop: 0 }]}>
                              <Text style={[styles.roleText, { color: roleColors[emp?.role || "cashier"] || Colors.info }]}>{t((emp?.role || "cashier") as any)}</Text>
                            </View>
                            {isOvertime && (
                              <View style={[styles.roleBadge, { backgroundColor: Colors.danger + "20", marginTop: 0 }]}>
                                <Text style={[styles.roleText, { color: Colors.danger }]}>{t("overtime")}</Text>
                              </View>
                            )}
                          </View>
                        </View>
                        <Pressable
                          style={[styles.clockBtn, { backgroundColor: Colors.danger + "20" }]}
                          onPress={() => {
                            if (Platform.OS === "web") {
                              if (window.confirm(t("forceCloseConfirm"))) forceCloseShiftMutation.mutate(item.id);
                            } else {
                              Alert.alert(t("forceCloseShift"), t("forceCloseConfirm"), [
                                { text: t("cancel"), style: "cancel" },
                                { text: t("forceClose"), style: "destructive", onPress: () => forceCloseShiftMutation.mutate(item.id) },
                              ]);
                            }
                          }}
                        >
                          <Ionicons name="stop-circle" size={18} color={Colors.danger} />
                        </Pressable>
                      </View>
                      <View style={{ flexDirection: rowFlip ? "row-reverse" : "row", justifyContent: "space-between", marginBottom: 6 }}>
                        <Text style={smStyles.shiftMeta}>{t("started")}: {fmtTime(item.startTime)}</Text>
                        <Text style={[smStyles.shiftMeta, { color: progressColor, fontWeight: "700" as const }]}>{activeShiftsElapsed[item.id] || "00:00:00"}</Text>
                      </View>
                      <View style={smStyles.progressBarBg}>
                        <View style={[smStyles.progressBarFill, { width: `${Math.min(progress * 100, 100)}%`, backgroundColor: progressColor }]} />
                        {isOvertime && <View style={[smStyles.progressBarFill, { width: `${Math.min((progress - 1) * 100, 50)}%`, backgroundColor: Colors.danger, position: "absolute", right: 0, top: 0, bottom: 0, borderRadius: 4 }]} />}
                      </View>
                      <Text style={[smStyles.shiftMeta, { marginTop: 4 }]}>
                        {elapsedHours.toFixed(1)}h / {expectedHours}h {t("expected")}
                      </Text>
                    </View>
                  );
                }}
              />
            )}

            {shiftMonitorTab === "history" && (
              <FlatList
                data={closedShifts.slice(0, 20)}
                keyExtractor={(item: any) => String(item.id)}
                scrollEnabled={!!closedShifts.length}
                ListEmptyComponent={
                  <View style={{ alignItems: "center", paddingVertical: 30 }}>
                    <Ionicons name="time-outline" size={40} color={Colors.textMuted} />
                    <Text style={{ color: Colors.textMuted, fontSize: 14, marginTop: 8 }}>{t("noShiftHistory")}</Text>
                  </View>
                }
                renderItem={({ item }: { item: any }) => {
                  const emp = employees.find((e: any) => e.id === item.employeeId);
                  return (
                    <View style={smStyles.shiftCard}>
                      <View style={{ flexDirection: rowFlip ? "row-reverse" : "row", alignItems: "center", marginBottom: 6 }}>
                        <View style={[styles.empAvatar, { backgroundColor: Colors.info + "30" }]}>
                          <Text style={styles.empInitial}>{emp?.name?.charAt(0) || "?"}</Text>
                        </View>
                        <View style={[styles.empInfo, rowFlip && { alignItems: "flex-end" }]}>
                          <Text style={styles.empName}>{emp?.name || `#${item.employeeId}`}</Text>
                          <Text style={styles.empMeta}>{formatDuration(item.startTime, item.endTime)}</Text>
                        </View>
                      </View>
                      <View style={{ flexDirection: rowFlip ? "row-reverse" : "row", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                        <View style={smStyles.statChip}>
                          <Ionicons name="time-outline" size={12} color={Colors.info} />
                          <Text style={smStyles.statChipText}>{fmtDateTime(item.startTime)} - {fmtTime(item.endTime)}</Text>
                        </View>
                        <View style={smStyles.statChip}>
                          <Ionicons name="cart-outline" size={12} color={Colors.accent} />
                          <Text style={smStyles.statChipText}>{formatMoney(item.totalSales || 0)}</Text>
                        </View>
                        <View style={smStyles.statChip}>
                          <Ionicons name="receipt-outline" size={12} color={Colors.warning} />
                          <Text style={smStyles.statChipText}>{item.totalTransactions || 0} {t("txns")}</Text>
                        </View>
                        {item.openingCash != null && (
                          <View style={smStyles.statChip}>
                            <Ionicons name="cash-outline" size={12} color={Colors.success} />
                            <Text style={smStyles.statChipText}>{formatMoney(item.openingCash || 0)} → {formatMoney(item.closingCash || 0)}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                }}
              />
            )}

            {shiftMonitorTab === "settings" && (
              <ScrollView>
                <Text style={styles.label}>{t("defaultShiftDuration")}</Text>
                <View style={{ flexDirection: rowFlip ? "row-reverse" : "row", alignItems: "center", gap: 12, marginTop: 8 }}>
                  <TextInput
                    style={[styles.formInput, { flex: 1 }]}
                    value={defaultShiftDuration}
                    onChangeText={changeDefaultShiftDuration}
                    keyboardType="decimal-pad"
                    placeholderTextColor={Colors.textMuted}
                    placeholder="8"
                  />
                  <Text style={{ color: Colors.textSecondary, fontSize: 14 }}>{t("hours")}</Text>
                </View>
                <Text style={{ color: Colors.textMuted, fontSize: 12, marginTop: 8 }}>{t("defaultShiftDurationHint")}</Text>

                {allActiveShifts.length > 0 && (
                  <>
                    <Text style={[styles.label, { marginTop: 20 }]}>{t("updateActiveShiftsDuration")}</Text>
                    <Pressable style={[styles.saveBtn, applyingShiftHours && { opacity: 0.6 }]} disabled={applyingShiftHours} onPress={async () => {
                      const durationVal = parseNum(defaultShiftDuration);
                      if (!(durationVal > 0 && durationVal <= 24)) return notify(t("error"), t("invalidDuration"));
                      setApplyingShiftHours(true);
                      // One request per shift; report once, not once per shift.
                      const results = await Promise.allSettled(allActiveShifts.map((s: any) =>
                        apiRequest("PUT", `/api/shifts/${s.id}`, { expectedDurationHours: durationVal.toFixed(1) })));
                      setApplyingShiftHours(false);
                      invalidatePrefix("/api/shifts");
                      const failed = results.filter((r) => r.status === "rejected");
                      if (failed.length) notify(t("error"), apiErrorMessage((failed[0] as PromiseRejectedResult).reason));
                      else notify(t("success"), tr3("تم تحديث مدة الورديات النشطة", "Dauer der aktiven Schichten aktualisiert", "Active shifts updated"));
                    }}>
                      <LinearGradient colors={[Colors.accent, Colors.gradientMid]} style={styles.saveBtnGradient}>
                        <Ionicons name="refresh" size={18} color={Colors.white} />
                        <Text style={styles.saveBtnText}>{applyingShiftHours ? t("loading") : t("applyToAllActive")}</Text>
                      </LinearGradient>
                    </Pressable>
                  </>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={showNotifications} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: "85%" }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("notifications")}</Text>
              <View style={styles.modalActions}>
                {unreadCount > 0 && (
                  <Pressable hitSlop={10} disabled={markAllNotificationsReadMutation.isPending} onPress={() => markAllNotificationsReadMutation.mutate()} style={{ flexDirection: "row", alignItems: "center", gap: 4, minHeight: 36, paddingHorizontal: 6 }}>
                    <Ionicons name="checkmark-done" size={20} color={Colors.accent} />
                    <Text style={{ color: Colors.accent, fontSize: 12, fontWeight: "600" }}>{t("markAllRead")}</Text>
                  </Pressable>
                )}
                <Pressable hitSlop={8} style={styles.closeBtn} accessibilityLabel={t("close" as any)} onPress={() => setShowNotifications(false)}><Ionicons name="close" size={24} color={Colors.text} /></Pressable>
              </View>
            </View>
            <FlatList
              data={notificationsList}
              keyExtractor={(item: any) => String(item.id)}
              scrollEnabled={!!notificationsList.length}
              ListEmptyComponent={
                <View style={{ alignItems: "center", paddingVertical: 30 }}>
                  <Ionicons name="notifications-off-outline" size={40} color={Colors.textMuted} />
                  <Text style={{ color: Colors.textMuted, fontSize: 14, marginTop: 8 }}>{t("noNotifications")}</Text>
                </View>
              }
              renderItem={({ item }: { item: any }) => {
                const iconInfo = getNotificationIcon(item.type);
                return (
                  <Pressable
                    style={[smStyles.notifItem, !item.isRead && smStyles.notifUnread]}
                    onPress={() => { if (!item.isRead) markNotificationReadMutation.mutate(item.id); }}
                  >
                    <View style={[smStyles.notifIconWrap, { backgroundColor: iconInfo.color + "20" }]}>
                      <Ionicons name={iconInfo.name as any} size={20} color={iconInfo.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: rowFlip ? "row-reverse" : "row", alignItems: "center", justifyContent: "space-between" }}>
                        <Text style={[smStyles.notifTitle, !item.isRead && { color: Colors.text }]}>{item.title}</Text>
                        {!item.isRead && <View style={smStyles.unreadDot} />}
                      </View>
                      <Text style={smStyles.notifMsg} numberOfLines={2}>{item.message}</Text>
                      <Text style={smStyles.notifTime}>{item.createdAt ? getTimeAgo(item.createdAt) : ""}</Text>
                    </View>
                  </Pressable>
                );
              }}
            />
          </View>
        </View>
      </Modal>

      <Modal visible={showStoreSettings} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.modalHeader, rowFlip && { flexDirection: "row-reverse" }]}>
              <Text style={[styles.modalTitle, rtlTextAlign]}>{t("storeSettings")}</Text>
              <Pressable hitSlop={8} style={styles.closeBtn} accessibilityLabel={t("close" as any)} onPress={() => setShowStoreSettings(false)}><Ionicons name="close" size={24} color={Colors.text} /></Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.label, rtlTextAlign]}>{t("storeLogo")}</Text>
              <Pressable onPress={pickStoreLogo} style={{ alignItems: "center", marginBottom: storeLogo ? 6 : 16, padding: 20, borderRadius: 12, borderWidth: 1, borderStyle: "dashed", borderColor: Colors.cardBorder, backgroundColor: Colors.surfaceLight }}>
                {storeLogo ? (
                  <View style={{ alignItems: "center" }}>
                    <Image source={{ uri: /^(https?:|file:|data:|blob:|content:)/.test(storeLogo) ? storeLogo : `${getApiUrl().replace(/\/$/, "")}${storeLogo}` }} style={{ width: 80, height: 80, borderRadius: 12 }} resizeMode="contain" />
                    <Text style={{ color: Colors.accent, fontSize: 13, marginTop: 8 }}>{t("changeImage")}</Text>
                  </View>
                ) : (
                  <View style={{ alignItems: "center" }}>
                    <Ionicons name="image-outline" size={32} color={Colors.textMuted} />
                    <Text style={{ color: Colors.textMuted, fontSize: 13, marginTop: 4 }}>{t("tapToAddImage")}</Text>
                  </View>
                )}
              </Pressable>
              {storeLogo ? (
                <Pressable hitSlop={8} onPress={() => setStoreLogo(null)} style={{ alignSelf: "center", paddingVertical: 8, paddingHorizontal: 12, marginBottom: 10 }}>
                  <Text style={{ color: Colors.danger, fontSize: 13, fontWeight: "600" }}>{tr3("إزالة الشعار", "Logo entfernen", "Remove logo")}</Text>
                </Pressable>
              ) : null}

              <Text style={[styles.label, rtlTextAlign]}>{t("storeName")} *</Text>
              <TextInput style={[styles.input, rtlTextAlign]} value={storeForm.name} onChangeText={(v) => setStoreForm({ ...storeForm, name: v })} placeholderTextColor={Colors.textMuted} placeholder={t("storeName")} />

              <Text style={[styles.label, rtlTextAlign]}>{t("storeAddress")}</Text>
              <TextInput style={[styles.input, rtlTextAlign]} value={storeForm.address} onChangeText={(v) => setStoreForm({ ...storeForm, address: v })} placeholderTextColor={Colors.textMuted} placeholder={t("storeAddress")} />

              <Text style={[styles.label, rtlTextAlign]}>{t("storePhone")}</Text>
              <TextInput style={[styles.input, rtlTextAlign]} value={storeForm.phone} onChangeText={(v) => setStoreForm({ ...storeForm, phone: v })} placeholderTextColor={Colors.textMuted} placeholder={phonePh} keyboardType="phone-pad" />

              <Text style={[styles.label, rtlTextAlign]}>{t("storeEmail")}</Text>
              <TextInput style={[styles.input, rtlTextAlign]} value={storeForm.email} onChangeText={(v) => setStoreForm({ ...storeForm, email: v })} placeholderTextColor={Colors.textMuted} placeholder="email@example.com" keyboardType="email-address" autoCapitalize="none" />

              <Text style={[styles.label, rtlTextAlign]}>{t("storeType")}</Text>
              <View style={styles.roleRow}>
                {[
                  { id: "supermarket", label: t("supermarket") },
                  { id: "restaurant", label: t("restaurant") },
                  { id: "pharmacy", label: t("pharmacy") },
                  { id: "others", label: t("others") },
                ].map((st) => (
                  <Pressable
                    key={st.id}
                    style={[styles.roleChip, storeForm.storeType === st.id && { backgroundColor: Colors.accent }]}
                    onPress={() => setStoreForm({ ...storeForm, storeType: st.id })}
                  >
                    <Text style={[styles.roleChipText, storeForm.storeType === st.id && { color: Colors.textDark }]}>
                      {st.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={[styles.label, rtlTextAlign]}>{t("taxRatePercent")}</Text>
              <TextInput
                style={[styles.input, rtlTextAlign]}
                value={storeForm.taxRate}
                onChangeText={(v) => setStoreForm({ ...storeForm, taxRate: v })}
                placeholderTextColor={Colors.textMuted}
                placeholder={zeroDec ? "0" : "7.7"}
                keyboardType="decimal-pad"
              />

              <Text style={[styles.label, rtlTextAlign]}>{tr3("رسوم التوصيل", "Liefergebühr", "Delivery Fee")} ({currencyLabel()})</Text>
              <TextInput
                style={[styles.input, rtlTextAlign]}
                value={storeForm.deliveryFee}
                onChangeText={(v) => setStoreForm({ ...storeForm, deliveryFee: v })}
                placeholderTextColor={Colors.textMuted}
                placeholder={zeroDec ? "5000" : "5.00"}
                keyboardType={moneyKeyboard}
              />

              <Pressable style={[styles.saveBtn, storeSaving && { opacity: 0.6 }]} disabled={storeSaving} onPress={handleSaveStoreSettings}>
                <LinearGradient colors={[Colors.accent, Colors.gradientMid]} style={styles.saveBtnGradient}>
                  <Text style={styles.saveBtnText}>{storeLogoUploading ? t("imageUploading") : updateStoreSettingsMutation.isPending ? t("loading") : t("save")}</Text>
                </LinearGradient>
              </Pressable>

              {/* The sections below save on their own, separately from the
                  store details above. */}
              {/* WhatsApp: linked on the WhatsApp screen (QR), shown here as a summary. */}
              <WhatsAppVerify onOpen={() => setShowStoreSettings(false)} />

              {/* Sham Cash: the store's own QR code and number. */}
              <ShamCashSettings />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Public Storefront editor ─────────────────────────────────────────── */}
      <Modal visible={showStorefront} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.modalHeader, rowFlip && { flexDirection: "row-reverse" }]}>
              <Text style={[styles.modalTitle, rtlTextAlign]}>{t("editStorefront")}</Text>
              <Pressable hitSlop={8} style={styles.closeBtn} accessibilityLabel={t("close" as any)} onPress={() => setShowStorefront(false)}><Ionicons name="close" size={24} color={Colors.text} /></Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>

              {/* Store Identity */}
              <Text style={[styles.sectionTitle, rtlTextAlign]}>{t("storeIdentity")}</Text>

              <Text style={[styles.label, rtlTextAlign]}>{t("storeName")}</Text>
              <TextInput style={[styles.input, rtlTextAlign]} value={storefrontForm.heroTitle} onChangeText={(v) => setStorefrontForm({ ...storefrontForm, heroTitle: v })} placeholderTextColor={Colors.textMuted} placeholder={t("storeName")} />

              <Text style={[styles.label, rtlTextAlign]}>{t("tagline")}</Text>
              <TextInput style={[styles.input, rtlTextAlign]} value={storefrontForm.heroSubtitle} onChangeText={(v) => setStorefrontForm({ ...storefrontForm, heroSubtitle: v })} placeholderTextColor={Colors.textMuted} placeholder={t("tagline")} />

              <Text style={[styles.label, rtlTextAlign]}>{t("aboutText")}</Text>
              <TextInput style={[styles.input, rtlTextAlign, { height: 100, textAlignVertical: "top" }]} value={storefrontForm.aboutText} onChangeText={(v) => setStorefrontForm({ ...storefrontForm, aboutText: v })} placeholderTextColor={Colors.textMuted} placeholder={t("aboutText")} multiline numberOfLines={4} />

              <Text style={[styles.label, rtlTextAlign]}>{t("primaryColor")}</Text>
              <View style={{ flexDirection: rowFlip ? "row-reverse" : "row", alignItems: "center", gap: 10 }}>
                <TextInput style={[styles.input, rtlTextAlign, { flex: 1 }]} value={storefrontForm.primaryColor} onChangeText={(v) => setStorefrontForm({ ...storefrontForm, primaryColor: v })} placeholderTextColor={Colors.textMuted} placeholder="#2FD3C6" autoCapitalize="none" />
                <View style={{ width: 24, height: 24, borderRadius: 6, backgroundColor: storefrontForm.primaryColor || "#2FD3C6" }} />
              </View>

              <Text style={[styles.label, rtlTextAlign]}>{t("accentColor")}</Text>
              <View style={{ flexDirection: rowFlip ? "row-reverse" : "row", alignItems: "center", gap: 10 }}>
                <TextInput style={[styles.input, rtlTextAlign, { flex: 1 }]} value={storefrontForm.accentColor} onChangeText={(v) => setStorefrontForm({ ...storefrontForm, accentColor: v })} placeholderTextColor={Colors.textMuted} placeholder="#6366F1" autoCapitalize="none" />
                <View style={{ width: 24, height: 24, borderRadius: 6, backgroundColor: storefrontForm.accentColor || "#6366F1" }} />
              </View>

              {/* Offers */}
              <Text style={[styles.sectionTitle, rtlTextAlign]}>{t("offers")}</Text>
              <Text style={[styles.label, rtlTextAlign]}>{t("promoText")}</Text>
              <TextInput style={[styles.input, rtlTextAlign, { height: 80, textAlignVertical: "top" }]} value={storefrontForm.promoText} onChangeText={(v) => setStorefrontForm({ ...storefrontForm, promoText: v })} placeholderTextColor={Colors.textMuted} placeholder={t("promoTextHint")} multiline numberOfLines={3} />

              {/* Ordering & Delivery */}
              <Text style={[styles.sectionTitle, rtlTextAlign]}>{t("orderingDelivery")}</Text>

              <View style={{ flexDirection: rowFlip ? "row-reverse" : "row", alignItems: "center", justifyContent: "space-between", backgroundColor: Colors.surfaceLight, borderRadius: 12, padding: 14, marginTop: 8 }}>
                <Text style={{ color: Colors.text, fontSize: 14 }}>{t("enableOnlineOrdering")}</Text>
                <Switch value={storefrontForm.enableOnlineOrdering} onValueChange={(v) => setStorefrontForm({ ...storefrontForm, enableOnlineOrdering: v })} trackColor={{ false: Colors.inputBorder, true: Colors.accent + "60" }} thumbColor={storefrontForm.enableOnlineOrdering ? Colors.accent : Colors.textMuted} />
              </View>
              <View style={{ flexDirection: rowFlip ? "row-reverse" : "row", alignItems: "center", justifyContent: "space-between", backgroundColor: Colors.surfaceLight, borderRadius: 12, padding: 14, marginTop: 8 }}>
                <Text style={{ color: Colors.text, fontSize: 14 }}>{t("enableDelivery")}</Text>
                <Switch value={storefrontForm.enableDelivery} onValueChange={(v) => setStorefrontForm({ ...storefrontForm, enableDelivery: v })} trackColor={{ false: Colors.inputBorder, true: Colors.accent + "60" }} thumbColor={storefrontForm.enableDelivery ? Colors.accent : Colors.textMuted} />
              </View>
              <View style={{ flexDirection: rowFlip ? "row-reverse" : "row", alignItems: "center", justifyContent: "space-between", backgroundColor: Colors.surfaceLight, borderRadius: 12, padding: 14, marginTop: 8 }}>
                <Text style={{ color: Colors.text, fontSize: 14 }}>{t("enablePickup")}</Text>
                <Switch value={storefrontForm.enablePickup} onValueChange={(v) => setStorefrontForm({ ...storefrontForm, enablePickup: v })} trackColor={{ false: Colors.inputBorder, true: Colors.accent + "60" }} thumbColor={storefrontForm.enablePickup ? Colors.accent : Colors.textMuted} />
              </View>

              <Text style={[styles.label, rtlTextAlign]}>{t("minOrderAmount")}</Text>
              <TextInput style={[styles.input, rtlTextAlign]} value={storefrontForm.minOrderAmount} onChangeText={(v) => setStorefrontForm({ ...storefrontForm, minOrderAmount: v })} placeholderTextColor={Colors.textMuted} placeholder={zeroDec ? "20000" : "20.00"} keyboardType={moneyKeyboard} />

              <Text style={[styles.label, rtlTextAlign]}>{t("estimatedDeliveryTime")}</Text>
              <TextInput style={[styles.input, rtlTextAlign]} value={storefrontForm.estimatedDeliveryTime} onChangeText={(v) => setStorefrontForm({ ...storefrontForm, estimatedDeliveryTime: v })} placeholderTextColor={Colors.textMuted} placeholder="30" keyboardType="number-pad" />

              <Text style={[styles.label, rtlTextAlign]}>{t("deliveryRadius")}</Text>
              <TextInput style={[styles.input, rtlTextAlign]} value={storefrontForm.deliveryRadius} onChangeText={(v) => setStorefrontForm({ ...storefrontForm, deliveryRadius: v })} placeholderTextColor={Colors.textMuted} placeholder={tr3("مثال: ضمن 10 كم", "z. B. im Umkreis von 10 km", "e.g. within 10 km")} />

              <Text style={[styles.label, rtlTextAlign]}>{t("openingHours")}</Text>
              <TextInput style={[styles.input, rtlTextAlign]} value={storefrontForm.openingHours} onChangeText={(v) => setStorefrontForm({ ...storefrontForm, openingHours: v })} placeholderTextColor={Colors.textMuted} placeholder={tr3("مثال: يومياً 11:00–22:00", "z. B. Mo–So 11:00–22:00", "e.g. Mon–Sun 11:00–22:00")} />

              {/* Payment Methods */}
              <Text style={[styles.sectionTitle, rtlTextAlign]}>{t("paymentMethods")}</Text>
              <Text style={[{ color: Colors.textMuted, fontSize: 12, lineHeight: 18, marginBottom: 8 }, rtlTextAlign]}>{t("paymentMethodsHint")}</Text>

              <View style={{ flexDirection: rowFlip ? "row-reverse" : "row", alignItems: "center", justifyContent: "space-between", backgroundColor: Colors.surfaceLight, borderRadius: 12, padding: 14, marginTop: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: Colors.text, fontSize: 14 }}>{t("acceptCard")}</Text>
                  {stripeUnavailable && (
                    <Text style={{ color: Colors.warning, fontSize: 11, marginTop: 2 }}>{tr3("الدفع بالبطاقة عبر الإنترنت غير متاح في سوريا", "Online-Kartenzahlung ist in Syrien nicht verfügbar", "Online card payment is not available in Syria")}</Text>
                  )}
                </View>
                <Switch value={storefrontForm.acceptCard} onValueChange={(v) => setStorefrontForm({ ...storefrontForm, acceptCard: v })} trackColor={{ false: Colors.inputBorder, true: Colors.accent + "60" }} thumbColor={storefrontForm.acceptCard ? Colors.accent : Colors.textMuted} />
              </View>
              <View style={{ flexDirection: rowFlip ? "row-reverse" : "row", alignItems: "center", justifyContent: "space-between", backgroundColor: Colors.surfaceLight, borderRadius: 12, padding: 14, marginTop: 8 }}>
                <Text style={{ color: Colors.text, fontSize: 14 }}>{t("acceptCash")}</Text>
                <Switch value={storefrontForm.acceptCash} onValueChange={(v) => setStorefrontForm({ ...storefrontForm, acceptCash: v })} trackColor={{ false: Colors.inputBorder, true: Colors.accent + "60" }} thumbColor={storefrontForm.acceptCash ? Colors.accent : Colors.textMuted} />
              </View>
              <View style={{ flexDirection: rowFlip ? "row-reverse" : "row", alignItems: "center", justifyContent: "space-between", backgroundColor: Colors.surfaceLight, borderRadius: 12, padding: 14, marginTop: 8 }}>
                <Text style={{ color: Colors.text, fontSize: 14, flex: 1 }}>{t("acceptMobile")}</Text>
                <Switch value={storefrontForm.acceptMobile} onValueChange={(v) => setStorefrontForm({ ...storefrontForm, acceptMobile: v })} trackColor={{ false: Colors.inputBorder, true: Colors.accent + "60" }} thumbColor={storefrontForm.acceptMobile ? Colors.accent : Colors.textMuted} />
              </View>

              <Text style={[styles.label, rtlTextAlign]}>{t("paymentInstructions")}</Text>
              <TextInput style={[styles.input, rtlTextAlign, { height: 80, textAlignVertical: "top" }]} value={storefrontForm.paymentInstructions} onChangeText={(v) => setStorefrontForm({ ...storefrontForm, paymentInstructions: v })} placeholderTextColor={Colors.textMuted} placeholder={t("paymentInstructionsHint")} multiline numberOfLines={3} />

              <Text style={[styles.label, rtlTextAlign]}>{t("bankName")}</Text>
              <TextInput style={[styles.input, rtlTextAlign]} value={storefrontForm.bankName} onChangeText={(v) => setStorefrontForm({ ...storefrontForm, bankName: v })} placeholderTextColor={Colors.textMuted} placeholder={t("bankName")} />

              <Text style={[styles.label, rtlTextAlign]}>{t("bankAccountHolder")}</Text>
              <TextInput style={[styles.input, rtlTextAlign]} value={storefrontForm.bankAccountHolder} onChangeText={(v) => setStorefrontForm({ ...storefrontForm, bankAccountHolder: v })} placeholderTextColor={Colors.textMuted} placeholder={t("bankAccountHolder")} />

              <Text style={[styles.label, rtlTextAlign]}>{t("bankIban")}</Text>
              <TextInput style={[styles.input, rtlTextAlign]} value={storefrontForm.bankIban} onChangeText={(v) => setStorefrontForm({ ...storefrontForm, bankIban: v })} placeholderTextColor={Colors.textMuted} placeholder={stripeUnavailable ? "SY00 0000 0000 0000 0000 0000 0000" : "CH00 0000 0000 0000 0000 0"} autoCapitalize="characters" />


              {/* Contact & Social */}
              <Text style={[styles.sectionTitle, rtlTextAlign]}>{t("contactSocial")}</Text>

              <Text style={[styles.label, rtlTextAlign]}>{t("storePhone")}</Text>
              <TextInput style={[styles.input, rtlTextAlign]} value={storefrontForm.phone} onChangeText={(v) => setStorefrontForm({ ...storefrontForm, phone: v })} placeholderTextColor={Colors.textMuted} placeholder={t("storePhone")} keyboardType="phone-pad" />

              <Text style={[styles.label, rtlTextAlign]}>{t("storeEmail")}</Text>
              <TextInput style={[styles.input, rtlTextAlign]} value={storefrontForm.email} onChangeText={(v) => setStorefrontForm({ ...storefrontForm, email: v })} placeholderTextColor={Colors.textMuted} placeholder={t("storeEmail")} keyboardType="email-address" autoCapitalize="none" />

              <Text style={[styles.label, rtlTextAlign]}>{t("storeAddress")}</Text>
              <TextInput style={[styles.input, rtlTextAlign]} value={storefrontForm.address} onChangeText={(v) => setStorefrontForm({ ...storefrontForm, address: v })} placeholderTextColor={Colors.textMuted} placeholder={t("storeAddress")} />

              <Text style={[styles.label, rtlTextAlign]}>WhatsApp</Text>
              <TextInput style={[styles.input, rtlTextAlign]} value={storefrontForm.socialWhatsapp} onChangeText={(v) => setStorefrontForm({ ...storefrontForm, socialWhatsapp: v })} placeholderTextColor={Colors.textMuted} placeholder={phonePh} keyboardType="phone-pad" />

              <Text style={[styles.label, rtlTextAlign]}>Instagram</Text>
              <TextInput style={[styles.input, rtlTextAlign]} value={storefrontForm.socialInstagram} onChangeText={(v) => setStorefrontForm({ ...storefrontForm, socialInstagram: v })} placeholderTextColor={Colors.textMuted} placeholder={tr3("@الحساب أو الرابط", "@Name oder Link", "@handle or link")} autoCapitalize="none" />

              <Text style={[styles.label, rtlTextAlign]}>Facebook</Text>
              <TextInput style={[styles.input, rtlTextAlign]} value={storefrontForm.socialFacebook} onChangeText={(v) => setStorefrontForm({ ...storefrontForm, socialFacebook: v })} placeholderTextColor={Colors.textMuted} placeholder={tr3("اسم الصفحة أو الرابط", "Seitenname oder Link", "Page name or link")} autoCapitalize="none" />

              <Text style={[styles.label, rtlTextAlign]}>{t("footerText")}</Text>
              <TextInput style={[styles.input, rtlTextAlign]} value={storefrontForm.footerText} onChangeText={(v) => setStorefrontForm({ ...storefrontForm, footerText: v })} placeholderTextColor={Colors.textMuted} placeholder={t("footerText")} />

              <Pressable style={[styles.saveBtn, saveStorefrontMutation.isPending && { opacity: 0.6 }]} disabled={saveStorefrontMutation.isPending} onPress={handleSaveStorefront}>
                <LinearGradient colors={[Colors.accent, Colors.gradientMid]} style={styles.saveBtnGradient}>
                  <Text style={styles.saveBtnText}>{saveStorefrontMutation.isPending ? t("loading") : t("save")}</Text>
                </LinearGradient>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showPaymentGateway} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.modalHeader, rowFlip && { flexDirection: "row-reverse" }]}>
              <Text style={styles.modalTitle}>{t("paymentGateways")}</Text>
              <Pressable hitSlop={8} style={styles.closeBtn} accessibilityLabel={t("close")} onPress={() => setShowPaymentGateway(false)}>
                <Ionicons name="close" size={24} color={Colors.textMuted} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Syria: Stripe does not operate there, so the card gateway is
                  not offered at all; the store takes cash and Sham Cash. */}
              {stripeUnavailable && (
                <>
                  <View style={pgStyles.warnBox}>
                    <View style={[pgStyles.warnHeader, rowFlip && { flexDirection: "row-reverse" }]}>
                      <Ionicons name="information-circle" size={18} color={Colors.warning} />
                      <Text style={[pgStyles.warnTitle, isRTL && { textAlign: "right" }]}>{tr3("الدفع بالبطاقة غير متاح في سوريا", "Kartenzahlung in Syrien nicht verfügbar", "Card payments are not available in Syria")}</Text>
                    </View>
                    <Text style={[pgStyles.warnText, isRTL && { textAlign: "right" }]}>
                      {tr3(
                        "Stripe لا يعمل في سوريا. يدفع الزبائن نقداً أو عبر شام كاش إلى حساب متجرك مباشرة.",
                        "Stripe ist in Syrien nicht verfügbar. Kunden zahlen bar oder mit Sham Cash direkt auf das Konto des Geschäfts.",
                        "Stripe does not operate in Syria. Customers pay cash or with Sham Cash straight into your store's account.",
                      )}
                    </Text>
                  </View>
                  <ShamCashSettings />
                  <View style={pgStyles.divider} />
                </>
              )}

              {!stripeUnavailable && (<>
              {/* ── Stripe: the state the server reports, never a guess ───── */}
              <View style={pgStyles.section}>
                <View style={[pgStyles.gatewayHeader, rowFlip && { flexDirection: "row-reverse" }]}>
                  <View style={[pgStyles.gatewayIcon, { backgroundColor: "#635BFF20" }]}>
                    <Ionicons name="card" size={24} color="#635BFF" />
                  </View>
                  <View style={[pgStyles.gatewayInfo, rowFlip && { alignItems: "flex-end" }]}>
                    <Text style={pgStyles.gatewayName}>Stripe</Text>
                    <View style={[pgStyles.statusRow, rowFlip && { flexDirection: "row-reverse" }]}>
                      <View style={[pgStyles.statusDot, { backgroundColor: stripeConnected ? Colors.success : Colors.danger }]} />
                      <Text style={[pgStyles.statusText, { color: stripeConnected ? Colors.success : Colors.danger }]}>
                        {stripeConnected ? t("connected") : t("disconnected")}
                      </Text>
                      {stripeConnected && stripeMode && (
                        <View style={[pgStyles.modeBadge, stripeMode === "live" && { backgroundColor: Colors.success + "20" }]}>
                          <Text style={[pgStyles.modeText, stripeMode === "live" && { color: Colors.success }]}>
                            {stripeMode === "live" ? t("liveMode") : t("testMode")}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <Pressable onPress={() => { refetchPgHealth(); refetchPgConfig(); }} hitSlop={10}>
                    <Ionicons name="refresh" size={18} color={Colors.textMuted} />
                  </Pressable>
                </View>

                {/* The currency Stripe charges in: the store's own (main branch).
                    Payments are always captured at once, so there is no
                    capture switch here. */}
                <View style={pgStyles.configGrid}>
                  <View style={pgStyles.configItem}>
                    <Text style={[pgStyles.configLabel, isRTL && { textAlign: "right" }]}>{t("currency")}</Text>
                    <View style={[pgStyles.configValueRow, rowFlip && { flexDirection: "row-reverse" }]}>
                      <Ionicons name="cash-outline" size={16} color={Colors.accent} />
                      <Text style={pgStyles.configValue}>{String(pgConfig?.currency || pgConfig?.stripe?.currency || currency).toUpperCase()}</Text>
                    </View>
                  </View>
                </View>

                {/* Facts read off the connected Stripe account */}
                {stripeConnected && pgHealth?.connected && (
                  <View style={pgStyles.configGrid}>
                    <View style={pgStyles.configItem}>
                      <Text style={[pgStyles.configLabel, isRTL && { textAlign: "right" }]}>{t("accountCountry")}</Text>
                      <Text style={pgStyles.configValue}>{String(pgHealth?.country || "-").toUpperCase()}</Text>
                    </View>
                    <View style={pgStyles.configItem}>
                      <Text style={[pgStyles.configLabel, isRTL && { textAlign: "right" }]}>{t("accountDefaultCurrency")}</Text>
                      <Text style={pgStyles.configValue}>{String(pgHealth?.defaultCurrency || "-").toUpperCase()}</Text>
                    </View>
                  </View>
                )}
                {stripeConnected && pgHealth?.connected && (
                  <View style={pgStyles.configGrid}>
                    <View style={pgStyles.configItem}>
                      <Text style={[pgStyles.configLabel, isRTL && { textAlign: "right" }]}>{t("chargesEnabled")}</Text>
                      <Text style={[pgStyles.configValue, { color: pgHealth?.chargesEnabled ? Colors.success : Colors.warning }]}>
                        {pgHealth?.chargesEnabled ? t("enabledShort") : t("disabledShort")}
                      </Text>
                    </View>
                    <View style={pgStyles.configItem}>
                      <Text style={[pgStyles.configLabel, isRTL && { textAlign: "right" }]}>{t("payoutsEnabled")}</Text>
                      <Text style={[pgStyles.configValue, { color: pgHealth?.payoutsEnabled ? Colors.success : Colors.warning }]}>
                        {pgHealth?.payoutsEnabled ? t("enabledShort") : t("disabledShort")}
                      </Text>
                    </View>
                  </View>
                )}

                {/* What is missing, named exactly as the server environment variable */}
                {!stripeConnected && (
                  <View style={pgStyles.warnBox}>
                    <View style={[pgStyles.warnHeader, rowFlip && { flexDirection: "row-reverse" }]}>
                      <Ionicons name="alert-circle" size={18} color={Colors.warning} />
                      <Text style={[pgStyles.warnTitle, isRTL && { textAlign: "right" }]}>{t("stripeNotConfigured")}</Text>
                    </View>
                    <Text style={[pgStyles.warnText, isRTL && { textAlign: "right" }]}>{t("stripeMissingKeysHelp")}</Text>
                    {[
                      { name: "STRIPE_SECRET_KEY", desc: t("envSecretKeyDesc") },
                      { name: "STRIPE_PUBLISHABLE_KEY", desc: t("envPublishableKeyDesc") },
                      { name: "STRIPE_WEBHOOK_SECRET", desc: t("envWebhookSecretDesc") },
                    ].map((v) => (
                      <View key={v.name} style={pgStyles.envRow}>
                        <Text style={pgStyles.envName}>{v.name}</Text>
                        <Text style={[pgStyles.envDesc, isRTL && { textAlign: "right" }]}>{v.desc}</Text>
                      </View>
                    ))}
                  </View>
                )}
                {stripeConnected && !hasPublishableKey && (
                  <View style={pgStyles.warnBox}>
                    <View style={[pgStyles.warnHeader, rowFlip && { flexDirection: "row-reverse" }]}>
                      <Ionicons name="alert-circle" size={18} color={Colors.warning} />
                      <Text style={[pgStyles.warnTitle, isRTL && { textAlign: "right" }]}>{t("stripeMissingPublishable")}</Text>
                    </View>
                  </View>
                )}

                <Pressable
                  style={[pgStyles.testBtn, pgTesting && { opacity: 0.6 }]}
                  onPress={runStripeTest}
                  disabled={pgTesting}
                >
                  <Ionicons name={pgTesting ? "sync" : "flash"} size={18} color={Colors.white} />
                  <Text style={pgStyles.testBtnText}>{pgTesting ? t("testing") : t("testConnection")}</Text>
                </Pressable>

                {pgTestResult && (
                  <View style={[pgStyles.testResult, { borderColor: pgTestResult.success ? Colors.success + "40" : Colors.danger + "40", backgroundColor: pgTestResult.success ? Colors.success + "10" : Colors.danger + "10" }]}>
                    <View style={[pgStyles.testResultHeader, rowFlip && { flexDirection: "row-reverse" }]}>
                      <Ionicons name={pgTestResult.success ? "checkmark-circle" : "close-circle"} size={20} color={pgTestResult.success ? Colors.success : Colors.danger} />
                      <Text style={[pgStyles.testResultText, { color: pgTestResult.success ? Colors.success : Colors.danger }]}>
                        {pgTestResult.success ? t("connectionSuccess") : t("connectionFailed")}
                      </Text>
                    </View>
                    {pgTestResult.success ? (
                      <>
                        <Text style={[pgStyles.testResultDetail, isRTL && { textAlign: "right" }]}>
                          {t("mode")}: {pgTestResult.mode === "live" ? t("liveMode") : t("testMode")}
                          {pgTestResult.country ? `  |  ${t("accountCountry")}: ${String(pgTestResult.country).toUpperCase()}` : ""}
                          {pgTestResult.defaultCurrency ? `  |  ${t("accountDefaultCurrency")}: ${String(pgTestResult.defaultCurrency).toUpperCase()}` : ""}
                        </Text>
                        <Text style={[pgStyles.testResultDetail, isRTL && { textAlign: "right" }]}>
                          {t("chargesEnabled")}: {pgTestResult.chargesEnabled ? t("enabledShort") : t("disabledShort")}
                          {"  |  "}{t("payoutsEnabled")}: {pgTestResult.payoutsEnabled ? t("enabledShort") : t("disabledShort")}
                        </Text>
                      </>
                    ) : (
                      /* The Stripe error text is deliberately not rendered: it can
                         carry a request id or a fragment of a key. */
                      <Text style={[pgStyles.testResultDetail, { color: Colors.danger }, isRTL && { textAlign: "right" }]}>
                        {pgTestResult.reason === "missingKeys" ? t("stripeMissingKeys") : t("stripeUnreachable")}
                      </Text>
                    )}
                  </View>
                )}

                <Text style={[pgStyles.footNote, isRTL && { textAlign: "right" }]}>{t("stripeKeysServerOnly")}</Text>
              </View>

              <View style={pgStyles.divider} />

              {/* ── What the Stripe account itself offers ─────────────────── */}
              <View style={pgStyles.section}>
                <Text style={[pgStyles.methodsTitle, isRTL && { textAlign: "right" }]}>{t("accountMethods")}</Text>
                {!stripeConnected ? (
                  <Text style={[pgStyles.mutedNote, isRTL && { textAlign: "right" }]}>{t("connectStripeFirst")}</Text>
                ) : accountMethods.length === 0 ? (
                  <Text style={[pgStyles.mutedNote, isRTL && { textAlign: "right" }]}>{t("noAccountMethods")}</Text>
                ) : (
                  <View style={[pgStyles.chipRow, rowFlip && { flexDirection: "row-reverse" }]}>
                    {accountMethods.map((m: string) => (
                      <View key={m} style={pgStyles.chip}>
                        <Text style={pgStyles.chipText}>{pgMethodLabel(m)}</Text>
                      </View>
                    ))}
                  </View>
                )}
                <View style={pgStyles.infoNote}>
                  <Ionicons name="information-circle" size={16} color={Colors.info} />
                  <Text style={[pgStyles.infoNoteText, isRTL && { textAlign: "right" }]}>{t("postFinanceNote")}</Text>
                </View>
              </View>

              <View style={pgStyles.divider} />
              </>)}

              {/* Which buttons the till offers at checkout. Sham Cash lives in
                  Store Settings; cash is the till's default and the fallback
                  for a failed card payment, so it cannot be switched off. */}
              <Text style={[pgStyles.methodsTitle, isRTL && { textAlign: "right" }]}>{t("enabledPaymentMethods")}</Text>
              {[
                { key: "cash", icon: "cash", label: t("cash"), color: Colors.success },
                { key: "card", icon: "card", label: t("card"), color: "#635BFF" },
                { key: "mobile", icon: "phone-portrait", label: t("walletPay"), color: Colors.info },
              ].map((method) => {
                const saved = method.key === "cash" || pgConfig?.enabledMethods?.includes(method.key) !== false;
                // Show the new position while the save is in flight.
                const on = pgPending?.key === method.key ? pgPending.val : saved;
                const stripeOnly = method.key !== "cash";
                return (
                  <View key={method.key} style={[pgStyles.methodRow, rowFlip && { flexDirection: "row-reverse" }]}>
                    <View style={[pgStyles.methodIconWrap, { backgroundColor: method.color + "20" }]}>
                      <Ionicons name={method.icon as any} size={20} color={method.color} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[pgStyles.methodLabel, isRTL && { textAlign: "right" }]}>{method.label}</Text>
                      {stripeUnavailable && stripeOnly && (
                        <Text style={[pgStyles.methodHint, { color: Colors.warning }, isRTL && { textAlign: "right" }]}>
                          {tr3("غير متاح في سوريا — يُنصح بإيقافه", "In Syrien nicht verfügbar — besser ausschalten", "Not available in Syria — best switched off")}
                        </Text>
                      )}
                    </View>
                    <Switch
                      value={on}
                      disabled={method.key === "cash" || !!pgPending}
                      onValueChange={async (val) => {
                        const current: string[] = pgConfig?.enabledMethods || ["cash", "card", "mobile"];
                        const updated = val
                          ? Array.from(new Set([...current, method.key]))
                          : current.filter((m: string) => m !== method.key);
                        setPgPending({ key: method.key, val });
                        try {
                          await apiRequest("PUT", "/api/payment-gateway/config", { enabledMethods: updated });
                        } catch (e: any) {
                          notify(t("error"), apiErrorMessage(e));
                        }
                        try { await refetchPgConfig(); } finally { setPgPending(null); }
                        qc.invalidateQueries({ queryKey: ["/api/payments/config"] });
                      }}
                      trackColor={{ false: Colors.inputBg, true: method.color + "60" }}
                      thumbColor={on ? method.color : Colors.textMuted}
                    />
                  </View>
                );
              })}

              {!stripeUnavailable && (<>
              <View style={pgStyles.divider} />

              {/* ── Mobile wallets: availability comes from the Stripe account ── */}
              <View style={pgStyles.section}>
                <Text style={[pgStyles.methodsTitle, isRTL && { textAlign: "right" }]}>{t("mobilePaySettings")}</Text>
                {[
                  { key: "apple_pay", icon: "logo-apple", label: "Apple Pay" },
                  { key: "google_pay", icon: "logo-google", label: "Google Pay" },
                ].map((mp) => {
                  const offered = accountMethods.includes(mp.key);
                  return (
                    <View key={mp.key} style={[pgStyles.methodRow, rowFlip && { flexDirection: "row-reverse" }]}>
                      <View style={[pgStyles.methodIconWrap, { backgroundColor: Colors.textMuted + "20" }]}>
                        <Ionicons name={mp.icon as any} size={20} color={Colors.text} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[pgStyles.methodLabel, isRTL && { textAlign: "right" }]}>{mp.label}</Text>
                        <Text style={[pgStyles.methodHint, offered && { color: Colors.success }, isRTL && { textAlign: "right" }]}>
                          {!stripeConnected ? t("connectStripeFirst") : offered ? t("availableInStripe") : t("notEnabledInStripe")}
                        </Text>
                      </View>
                      <Ionicons name={offered && stripeConnected ? "checkmark-circle" : "remove-circle-outline"} size={20} color={offered && stripeConnected ? Colors.success : Colors.textMuted} />
                    </View>
                  );
                })}
              </View>
              </>)}

            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Bulk Import Modal */}
      <Modal visible={showBulkImport} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.modalHeader, rowFlip && { flexDirection: "row-reverse" }]}>
              <Text style={[styles.modalTitle, rtlTextAlign]}>{t("bulkImport")}</Text>
              <Pressable hitSlop={8} style={styles.closeBtn} accessibilityLabel={t("close" as any)} onPress={() => setShowBulkImport(false)}><Ionicons name="close" size={24} color={Colors.text} /></Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Tab Selector */}
              <View style={{ flexDirection: rowFlip ? "row-reverse" : "row", gap: 8, marginBottom: 20 }}>
                <Pressable
                  style={{ flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: importType === "products" ? Colors.accent : Colors.surfaceLight, alignItems: "center" }}
                  onPress={() => { setImportType("products"); setImportResult(null); }}
                >
                  <Ionicons name="cube" size={20} color={importType === "products" ? Colors.textDark : Colors.textMuted} />
                  <Text style={{ color: importType === "products" ? Colors.textDark : Colors.textSecondary, fontSize: 13, fontWeight: "600", marginTop: 4 }}>{t("products")}</Text>
                </Pressable>
                <Pressable
                  style={{ flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: importType === "customers" ? Colors.accent : Colors.surfaceLight, alignItems: "center" }}
                  onPress={() => { setImportType("customers"); setImportResult(null); }}
                >
                  <Ionicons name="people" size={20} color={importType === "customers" ? Colors.textDark : Colors.textMuted} />
                  <Text style={{ color: importType === "customers" ? Colors.textDark : Colors.textSecondary, fontSize: 13, fontWeight: "600", marginTop: 4 }}>{t("customers")}</Text>
                </Pressable>
              </View>

              {/* Instructions */}
              <View style={{ backgroundColor: Colors.surfaceLight, borderRadius: 12, padding: 14, marginBottom: 16 }}>
                <View style={{ flexDirection: rowFlip ? "row-reverse" : "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <Ionicons name="information-circle" size={18} color={Colors.info} />
                  <Text style={{ color: Colors.text, fontSize: 14, fontWeight: "600" }}>{t("excelFormat")}</Text>
                </View>
                {importType === "products" ? (
                  <Text style={{ color: Colors.textMuted, fontSize: 12, lineHeight: 18 }}>
                    {t("productImportHelp")}
                  </Text>
                ) : (
                  <Text style={{ color: Colors.textMuted, fontSize: 12, lineHeight: 18 }}>
                    {t("customerImportHelp")}
                  </Text>
                )}
              </View>

              {/* Download Template Button */}
              <Pressable
                style={{ flexDirection: rowFlip ? "row-reverse" : "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: Colors.surfaceLight, borderRadius: 12, paddingVertical: 12, marginBottom: 8, borderWidth: 1, borderColor: Colors.accent + "40" }}
                onPress={() => downloadExcel(`/api/${importType}/template`, `${importType}-template.xlsx`)}
              >
                <Ionicons name="download-outline" size={20} color={Colors.accent} />
                <Text style={{ color: Colors.accent, fontSize: 14, fontWeight: "600" }}>{t("downloadTemplate")}</Text>
              </Pressable>

              {/* Export existing data (customers only) */}
              {importType === "customers" && (
                <Pressable
                  style={{ flexDirection: rowFlip ? "row-reverse" : "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: Colors.success + "15", borderRadius: 12, paddingVertical: 12, marginBottom: 16, borderWidth: 1, borderColor: Colors.success + "40" }}
                  onPress={() => downloadExcel(`/api/customers/export${tenantId ? `?tenantId=${tenantId}` : ""}`, `customers-${storeYmd()}.xlsx`)}
                >
                  <Ionicons name="share-outline" size={20} color={Colors.success} />
                  <Text style={{ color: Colors.success, fontSize: 14, fontWeight: "600" }}>{t("exportCustomersExcel" as any)}</Text>
                </Pressable>
              )}

              {/* Upload Button */}
              <Pressable
                style={{ borderWidth: 2, borderStyle: "dashed", borderColor: importLoading ? Colors.textMuted : Colors.accent, borderRadius: 16, padding: 30, alignItems: "center", marginBottom: 16, backgroundColor: Colors.surfaceLight }}
                onPress={async () => {
                  if (!tenantId) return notify(t("error"), tr3("لم يتم التعرف على المتجر", "Geschäft nicht erkannt", "Store not recognised"));
                  // Sends the file and shows the server's answer; the loading
                  // state only starts once a file was actually chosen, so a
                  // cancelled picker never leaves the button spinning.
                  const upload = async (base64: string) => {
                    setImportLoading(true);
                    setImportResult(null);
                    try {
                      const endpoint = importType === "products" ? "/api/products/import" : "/api/customers/import";
                      const body: any = { fileBase64: base64, tenantId };
                      if (importType === "products") body.branchId = myBranchId;
                      const res = await apiRequest("POST", endpoint, body);
                      const data = await res.json();
                      setImportResult(data);
                      if (data.success) invalidatePrefix(importType === "products" ? "/api/products" : "/api/customers");
                    } catch (err: any) {
                      setImportResult({ error: apiErrorMessage(err) });
                    } finally {
                      setImportLoading(false);
                    }
                  };
                  const readAsBase64 = (blob: Blob) => new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(String(reader.result || "").split(",")[1] || "");
                    reader.onerror = () => reject(reader.error);
                    reader.readAsDataURL(blob);
                  });
                  try {
                    if (Platform.OS === "web") {
                      const input = document.createElement("input");
                      input.type = "file";
                      input.accept = ".xlsx,.xls,.csv";
                      input.onchange = async (e: any) => {
                        const file = e.target?.files?.[0];
                        if (!file) return;
                        try { await upload(await readAsBase64(file)); } catch (err: any) { setImportResult({ error: apiErrorMessage(err) }); }
                      };
                      input.click();
                    } else {
                      const result = await DocumentPicker.getDocumentAsync({
                        type: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.ms-excel", "text/csv", "text/comma-separated-values"],
                        copyToCacheDirectory: true,
                      });
                      if (result.canceled || !result.assets[0]) return;
                      const blob = await (await fetch(result.assets[0].uri)).blob();
                      await upload(await readAsBase64(blob));
                    }
                  } catch (err: any) {
                    setImportResult({ error: apiErrorMessage(err) });
                    setImportLoading(false);
                  }
                }}
                disabled={importLoading}
              >
                <Ionicons name={importLoading ? "hourglass" : "cloud-upload"} size={40} color={importLoading ? Colors.textMuted : Colors.accent} />
                <Text style={{ color: importLoading ? Colors.textMuted : Colors.accent, fontSize: 16, fontWeight: "700", marginTop: 8 }}>
                  {importLoading ? t("uploading") : t("selectExcelFile")}
                </Text>
                <Text style={{ color: Colors.textMuted, fontSize: 12, marginTop: 4 }}>.xlsx, .xls, .csv</Text>
              </Pressable>

              {/* Import Result */}
              {importResult && (
                <View style={{
                  backgroundColor: importResult.success ? Colors.success + "15" : Colors.danger + "15",
                  borderRadius: 12, padding: 14, borderWidth: 1,
                  borderColor: importResult.success ? Colors.success + "30" : Colors.danger + "30"
                }}>
                  <View style={{ flexDirection: rowFlip ? "row-reverse" : "row", alignItems: "center", gap: 8 }}>
                    <Ionicons
                      name={importResult.success ? "checkmark-circle" : "alert-circle"}
                      size={22}
                      color={importResult.success ? Colors.success : Colors.danger}
                    />
                    <Text style={{ color: importResult.success ? Colors.success : Colors.danger, fontSize: 15, fontWeight: "700" }}>
                      {importResult.success
                        ? `${t("imported")} ${importResult.count} ${importType === "products" ? t("products") : t("customers")}`
                        : importResult.error || t("error")}
                    </Text>
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Vehicle Management Modal ──────────────────────────────────── */}
      <Modal visible={showVehicles} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.modalHeader, rowFlip && { flexDirection: "row-reverse" }]}>
              <Text style={styles.modalTitle}>{t("vehicleManagement")}</Text>
              <Pressable hitSlop={8} style={styles.closeBtn} accessibilityLabel={t("close" as any)} onPress={() => setShowVehicles(false)}>
                <Ionicons name="close" size={24} color={Colors.textMuted} />
              </Pressable>
            </View>
            <ScrollView>
              <Pressable style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: Colors.accent, borderRadius: 12, padding: 12, marginBottom: 12, justifyContent: "center" }} onPress={() => { setEditVehicle(null); setVehicleForm({ licensePlate: "", make: "", model: "", color: "", driverName: "", driverPhone: "", notes: "" }); setShowVehicleForm(true); }}>
                <Ionicons name="add" size={20} color={Colors.white} />
                <Text style={{ color: Colors.white, fontWeight: "700", fontSize: 14 }}>{t("addVehicle")}</Text>
              </Pressable>
              {vehiclesList.length === 0 ? (
                <Text style={{ color: Colors.textMuted, textAlign: "center", padding: 24 }}>{t("noVehicles")}</Text>
              ) : (
                vehiclesList.map((v: any) => (
                  <View key={v.id} style={[styles.empCard, rowFlip && { flexDirection: "row-reverse" }]}>
                    <View style={[styles.empAvatar, { backgroundColor: Colors.hueOrange + "20" }]}>
                      <Ionicons name="car" size={22} color={Colors.hueOrange} />
                    </View>
                    <View style={[styles.empInfo, rowFlip && { alignItems: "flex-end" }]}>
                      <Text style={styles.empName}>{v.licensePlate}</Text>
                      <Text style={styles.empMeta}>{[v.make, v.model, v.color].filter(Boolean).join(" • ")}</Text>
                      {!!v.driverName && <Text style={styles.empMeta}>{v.driverName} {v.driverPhone ? `· ${v.driverPhone}` : ""}</Text>}
                    </View>
                    <View style={{ flexDirection: "row", gap: 4 }}>
                      <Pressable hitSlop={6} style={styles.iconBtn} accessibilityLabel={t("editVehicle")} onPress={() => { setEditVehicle(v); setVehicleForm({ licensePlate: v.licensePlate || "", make: v.make || "", model: v.model || "", color: v.color || "", driverName: v.driverName || "", driverPhone: v.driverPhone || "", notes: v.notes || "" }); setShowVehicleForm(true); }}>
                        <Ionicons name="pencil" size={18} color={Colors.info} />
                      </Pressable>
                      <Pressable hitSlop={6} style={styles.iconBtn} accessibilityLabel={t("deleteVehicle")} disabled={deleteVehicleMutation.isPending} onPress={() => confirmAction(t("deleteVehicle"), `${t("areYouSure")}\n${v.licensePlate}`, t("delete"), t("cancel"), () => deleteVehicleMutation.mutate(v.id))}>
                        <Ionicons name="trash" size={18} color={Colors.danger} />
                      </Pressable>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Vehicle Form Modal */}
      <Modal visible={showVehicleForm} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.modalHeader, rowFlip && { flexDirection: "row-reverse" }]}>
              <Text style={styles.modalTitle}>{editVehicle ? t("editVehicle") : t("addVehicle")}</Text>
              <Pressable hitSlop={8} style={styles.closeBtn} accessibilityLabel={t("close" as any)} onPress={() => setShowVehicleForm(false)}><Ionicons name="close" size={24} color={Colors.textMuted} /></Pressable>
            </View>
            <ScrollView>
              {[
                { key: "licensePlate", label: t("licensePlate") },
                { key: "make", label: t("vehicleMake") },
                { key: "model", label: t("vehicleModel") },
                { key: "color", label: t("vehicleColor") },
                { key: "driverName", label: t("driverName") },
                { key: "driverPhone", label: t("driverPhone") },
                { key: "notes", label: t("vehicleNotes") },
              ].map(({ key, label }) => (
                <View key={key} style={{ marginBottom: 12 }}>
                  <Text style={styles.label}>{label}</Text>
                  <TextInput
                    style={[styles.input, isRTL && { textAlign: "right" }]}
                    value={(vehicleForm as any)[key]}
                    onChangeText={(v) => setVehicleForm((f) => ({ ...f, [key]: v }))}
                    placeholder={key === "driverPhone" ? phonePh : label}
                    placeholderTextColor={Colors.textMuted}
                    keyboardType={key === "driverPhone" ? "phone-pad" : "default"}
                    autoCapitalize={key === "licensePlate" ? "characters" : "sentences"}
                    multiline={key === "notes"}
                  />
                </View>
              ))}
              <Pressable style={[styles.saveBtn, vehicleSaving && { opacity: 0.6 }]} disabled={vehicleSaving} onPress={() => {
                const plate = vehicleForm.licensePlate.trim();
                if (!plate) { notify(t("error"), tr3("رقم اللوحة مطلوب", "Kennzeichen ist erforderlich", "Licence plate is required")); return; }
                const driverPhone = cleanPhone(vehicleForm.driverPhone, editVehicle?.driverPhone);
                if (driverPhone === null) { notify(t("error"), invalidPhoneMsg); return; }
                const data = { ...vehicleForm, licensePlate: plate, driverPhone, make: vehicleForm.make.trim(), model: vehicleForm.model.trim(), color: vehicleForm.color.trim(), driverName: vehicleForm.driverName.trim(), notes: vehicleForm.notes.trim() };
                if (editVehicle) updateVehicleMutation.mutate({ id: editVehicle.id, data });
                else createVehicleMutation.mutate(data);
              }}>
                <LinearGradient colors={[Colors.accent, Colors.gradientMid]} style={styles.saveBtnGradient}>
                  <Text style={styles.saveBtnText}>{vehicleSaving ? t("loading") : editVehicle ? t("save") : t("addVehicle")}</Text>
                </LinearGradient>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Advanced Printer Config Modal ─────────────────────────────── */}
      <Modal visible={showPrinterConfig} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.modalHeader, rowFlip && { flexDirection: "row-reverse" }]}>
              <Text style={styles.modalTitle}>{t("printerConfig")}</Text>
              <Pressable hitSlop={8} style={styles.closeBtn} accessibilityLabel={t("close" as any)} onPress={() => setShowPrinterConfig(false)}><Ionicons name="close" size={24} color={Colors.textMuted} /></Pressable>
            </View>
            <ScrollView>
              <Text style={{ color: Colors.textMuted, fontSize: 13, marginBottom: 16 }}>{t("printerConfigDesc")}</Text>
              {[
                { key: "kitchen", label: t("receiptTypeKitchen"), icon: "restaurant" },
                { key: "home_delivery", label: t("receiptTypeHomeDelivery"), icon: "bicycle" },
                { key: "take_away", label: t("receiptTypeTakeAway"), icon: "bag-handle" },
                { key: "restaurant", label: t("receiptTypeRestaurant"), icon: "cafe" },
                { key: "driver_order", label: t("receiptTypeDriverOrder"), icon: "car" },
                { key: "check_out", label: t("receiptTypeCheckOut"), icon: "person-remove" },
                { key: "lists", label: t("receiptTypeLists"), icon: "list" },
                { key: "daily_close", label: t("receiptTypeDailyClose"), icon: "calendar" },
                { key: "monthly_close", label: t("receiptTypeMonthlyClose"), icon: "calendar-number" },
                { key: "accounts_receivable", label: t("receiptTypeDebitoren"), icon: "receipt" },
              ].map(({ key, label, icon }) => {
                const cfg = printerConfigsList.find((p: any) => p.receiptType === key) || {};
                const localCfg = printerConfigData[key] || { printer1: (cfg as any).printer1 || "", printer2: (cfg as any).printer2 || "" };
                return (
                  <View key={key} style={{ backgroundColor: Colors.surfaceLight, borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: Colors.cardBorder }}>
                    <View style={{ flexDirection: rowFlip ? "row-reverse" : "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <Ionicons name={icon as any} size={18} color={Colors.accent} />
                      <Text style={{ color: Colors.text, fontWeight: "700", fontSize: 14 }}>{label}</Text>
                    </View>
                    <View style={{ flexDirection: rowFlip ? "row-reverse" : "row", gap: 8 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: Colors.textMuted, fontSize: 11, marginBottom: 4 }}>{t("printer1")}</Text>
                        <TextInput
                          style={[styles.input, { fontSize: 12, paddingVertical: 8 }]}
                          value={localCfg.printer1}
                          onChangeText={(v) => setPrinterConfigData((d) => ({ ...d, [key]: { ...localCfg, printer1: v } }))}
                          placeholder={t("noPrinterAssigned")}
                          placeholderTextColor={Colors.textMuted}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: Colors.textMuted, fontSize: 11, marginBottom: 4 }}>{t("printer2")}</Text>
                        <TextInput
                          style={[styles.input, { fontSize: 12, paddingVertical: 8 }]}
                          value={localCfg.printer2}
                          onChangeText={(v) => setPrinterConfigData((d) => ({ ...d, [key]: { ...localCfg, printer2: v } }))}
                          placeholder={t("noPrinterAssigned")}
                          placeholderTextColor={Colors.textMuted}
                        />
                      </View>
                    </View>
                    <Pressable style={{ backgroundColor: Colors.accent + "20", borderRadius: 8, padding: 8, marginTop: 6, alignItems: "center" }} onPress={() => {
                      savePrinterConfigMutation.mutate({ receiptType: key, printer1: localCfg.printer1, printer2: localCfg.printer2 });
                    }}>
                      <Text style={{ color: Colors.accent, fontWeight: "700", fontSize: 12 }}>{t("save")}</Text>
                    </Pressable>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Daily Closing Modal (TAGESABSCHLUSS) ─────────────────────── */}
      <Modal visible={showDailyClosing} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.modalHeader, rowFlip && { flexDirection: "row-reverse" }]}>
              <Text style={styles.modalTitle}>{t("dailyClosingTitle")}</Text>
              <Pressable hitSlop={8} style={styles.closeBtn} accessibilityLabel={t("close" as any)} onPress={() => setShowDailyClosing(false)}><Ionicons name="close" size={24} color={Colors.textMuted} /></Pressable>
            </View>
            <ScrollView>
              <Text style={{ color: Colors.textMuted, fontSize: 13, marginBottom: 16 }}>{t("dailyClosingDesc")}</Text>

              {/* Perform closing button */}
              <View style={{ backgroundColor: Colors.surfaceLight, borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: Colors.hueCyan + "40" }}>
                <Text style={{ color: Colors.text, fontWeight: "700", fontSize: 15, marginBottom: 12 }}>{t("performDailyClosing")}</Text>
                <View style={{ marginBottom: 10 }}>
                  <Text style={styles.label}>{t("openingCash")} ({currencyLabel()})</Text>
                  <TextInput style={[styles.input, isRTL && { textAlign: "right" }]} value={dailyClosingForm.openingCash} onChangeText={(v) => setDailyClosingForm((f) => ({ ...f, openingCash: v }))} keyboardType={moneyKeyboard} placeholder={moneyPlaceholder} placeholderTextColor={Colors.textMuted} />
                </View>
                <View style={{ marginBottom: 10 }}>
                  <Text style={styles.label}>{t("closingCash")} ({currencyLabel()})</Text>
                  <TextInput style={[styles.input, isRTL && { textAlign: "right" }]} value={dailyClosingForm.closingCash} onChangeText={(v) => setDailyClosingForm((f) => ({ ...f, closingCash: v }))} keyboardType={moneyKeyboard} placeholder={moneyPlaceholder} placeholderTextColor={Colors.textMuted} />
                </View>
                <View style={{ marginBottom: 10 }}>
                  <Text style={styles.label}>{t("notes")}</Text>
                  <TextInput style={[styles.input, isRTL && { textAlign: "right" }]} value={dailyClosingForm.notes} onChangeText={(v) => setDailyClosingForm((f) => ({ ...f, notes: v }))} placeholder={t("optionalNotes")} placeholderTextColor={Colors.textMuted} />
                </View>
                <Pressable style={[styles.saveBtn, dailyClosingLoading && { opacity: 0.6 }]} onPress={() => {
                  const opening = dailyClosingForm.openingCash.trim() === "" ? 0 : parseNum(dailyClosingForm.openingCash);
                  const closing = dailyClosingForm.closingCash.trim() === "" ? 0 : parseNum(dailyClosingForm.closingCash);
                  if (!Number.isFinite(opening) || opening < 0 || !Number.isFinite(closing) || closing < 0) {
                    notify(t("error"), tr3("أدخل مبالغ نقدية صحيحة", "Bitte gültige Bargeldbeträge eingeben", "Enter valid cash amounts"));
                    return;
                  }
                  const today = storeYmd();
                  const already = dailyClosingsList.some((dc: any) => String(dc.closingDate || "").slice(0, 10) === today);
                  const run = async () => {
                    setDailyClosingLoading(true);
                    try {
                      const fix = (n: number) => (zeroDec ? Math.round(n) : n).toFixed(zeroDec ? 0 : 2);
                      await apiRequest("POST", "/api/daily-closings", {
                        tenantId: tenant?.id, branchId: myBranchId,
                        employeeId: employee?.id, closingDate: today,
                        openingCash: fix(opening), closingCash: fix(closing), notes: dailyClosingForm.notes.trim(),
                      });
                      invalidatePrefix("/api/daily-closings");
                      setDailyClosingForm({ openingCash: "", closingCash: "", notes: "" });
                      notify(t("success"), t("dailyClosingDone"));
                      // Staff report prints after the closing; a print failure
                      // must not look like a failed closing.
                      try { await printStaffReport(true); } catch { /* non-fatal */ }
                    } catch (e: any) {
                      notify(t("error"), apiErrorMessage(e));
                    } finally {
                      setDailyClosingLoading(false);
                    }
                  };
                  if (already) {
                    confirmAction(
                      t("performDailyClosing"),
                      tr3("تم إغلاق اليوم مسبقاً. هل تريد إنشاء إغلاق آخر؟", "Für heute gibt es bereits einen Abschluss. Noch einen erstellen?", "Today has already been closed. Create another closing?"),
                      t("confirm"), t("cancel"), run,
                    );
                  } else run();
                }} disabled={dailyClosingLoading}>
                  <LinearGradient colors={[Colors.hueCyan, Colors.accent]} style={styles.saveBtnGradient}>
                    <Text style={styles.saveBtnText}>{dailyClosingLoading ? t("loading") : t("performDailyClosing")}</Text>
                  </LinearGradient>
                </Pressable>
              </View>

              {/* Print daily report button */}
              <Pressable
                style={{ backgroundColor: Colors.hueAmber + "20", borderRadius: 12, padding: 14, minHeight: 48, marginBottom: 16, flexDirection: rowFlip ? "row-reverse" : "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1, borderColor: Colors.hueAmber + "60", opacity: staffReportBusy ? 0.6 : 1 }}
                disabled={staffReportBusy}
                onPress={async () => {
                  setStaffReportBusy(true);
                  try { await printStaffReport(false); }
                  catch (e: any) { notify(t("error"), apiErrorMessage(e)); }
                  finally { setStaffReportBusy(false); }
                }}
              >
                {staffReportBusy ? <ActivityIndicator size="small" color={Colors.hueAmber} /> : <Ionicons name="print-outline" size={20} color={Colors.hueAmber} />}
                <Text style={{ color: Colors.hueAmber, fontWeight: "700", fontSize: 14 }}>{tr3("طباعة تقرير الموظفين", "Personalbericht drucken", "Print staff report")}</Text>
              </Pressable>

              {/* Past closings */}
              <Text style={{ color: Colors.text, fontWeight: "700", fontSize: 15, marginBottom: 10 }}>{t("dailyClosing")} {t("entries")}</Text>
              {dailyClosingsList.length === 0 ? (
                <Text style={{ color: Colors.textMuted, textAlign: "center", padding: 16 }}>{t("noDailyClosings")}</Text>
              ) : (
                dailyClosingsList.slice(0, 30).map((dc: any) => (
                  <View key={dc.id} style={{ backgroundColor: Colors.surfaceLight, borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: Colors.cardBorder }}>
                    <View style={{ flexDirection: rowFlip ? "row-reverse" : "row", justifyContent: "space-between", marginBottom: 4 }}>
                      <Text style={{ color: Colors.text, fontWeight: "700" }}>{dc.closingDate}</Text>
                      <Text style={{ color: Colors.success, fontWeight: "700" }}>{formatMoney(dc.totalSales || 0)}</Text>
                    </View>
                    <Text style={{ color: Colors.textMuted, fontSize: 12 }}>{dc.totalTransactions} {t("transactions")} · {t("cashDrawer")}: {formatMoney(dc.closingCash || 0)}</Text>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Monthly Closing Modal (MONATSABSCHLUSS) ───────────────────── */}
      <Modal visible={showMonthlyClosing} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.modalHeader, rowFlip && { flexDirection: "row-reverse" }]}>
              <Text style={styles.modalTitle}>{t("monthlyClosingTitle")}</Text>
              <Pressable hitSlop={8} style={styles.closeBtn} accessibilityLabel={t("close" as any)} onPress={() => setShowMonthlyClosing(false)}><Ionicons name="close" size={24} color={Colors.textMuted} /></Pressable>
            </View>
            <ScrollView>
              <Text style={{ color: Colors.textMuted, fontSize: 13, marginBottom: 16 }}>{t("monthlyClosingDesc")}</Text>

              <View style={{ backgroundColor: Colors.surfaceLight, borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: Colors.hueViolet + "40" }}>
                <Text style={{ color: Colors.text, fontWeight: "700", fontSize: 15, marginBottom: 12 }}>{t("performMonthlyClosing")}</Text>
                <View style={{ marginBottom: 10 }}>
                  <Text style={styles.label}>{t("notes")}</Text>
                  <TextInput style={[styles.input, isRTL && { textAlign: "right" }]} value={monthlyClosingForm.notes} onChangeText={(v) => setMonthlyClosingForm({ notes: v })} placeholder={t("optionalNotes")} placeholderTextColor={Colors.textMuted} />
                </View>
                <Pressable style={[styles.saveBtn, monthlyClosingLoading && { opacity: 0.6 }]} onPress={async () => {
                  setMonthlyClosingLoading(true);
                  try {
                    await apiRequest("POST", "/api/monthly-closings", {
                      tenantId: tenant?.id, branchId: myBranchId,
                      employeeId: employee?.id,
                      // The store's own calendar month, not the device's/UTC one.
                      closingMonth: storeYmd().slice(0, 7),
                      notes: monthlyClosingForm.notes.trim(),
                    });
                    invalidatePrefix("/api/monthly-closings");
                    notify(t("success"), t("monthlyClosingDone"));
                    setMonthlyClosingForm({ notes: "" });
                  } catch (e: any) { notify(t("error"), apiErrorMessage(e)); }
                  finally { setMonthlyClosingLoading(false); }
                }} disabled={monthlyClosingLoading}>
                  <LinearGradient colors={[Colors.hueViolet, Colors.accent]} style={styles.saveBtnGradient}>
                    <Text style={styles.saveBtnText}>{monthlyClosingLoading ? t("loading") : t("performMonthlyClosing")}</Text>
                  </LinearGradient>
                </Pressable>
              </View>

              <Text style={{ color: Colors.text, fontWeight: "700", fontSize: 15, marginBottom: 10 }}>{t("monthlyClosing")} {t("entries")}</Text>
              {monthlyClosingsList.length === 0 ? (
                <Text style={{ color: Colors.textMuted, textAlign: "center", padding: 16 }}>{t("noMonthlyClosings")}</Text>
              ) : (
                monthlyClosingsList.map((mc: any) => (
                  <View key={mc.id} style={{ backgroundColor: Colors.surfaceLight, borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: Colors.cardBorder }}>
                    <View style={{ flexDirection: rowFlip ? "row-reverse" : "row", justifyContent: "space-between", marginBottom: 4 }}>
                      <Text style={{ color: Colors.text, fontWeight: "700" }}>{mc.closingMonth}</Text>
                      <Text style={{ color: Colors.success, fontWeight: "700" }}>{formatMoney(mc.totalSales || 0)}</Text>
                    </View>
                    <Text style={{ color: Colors.textMuted, fontSize: 12 }}>{mc.totalTransactions} {t("transactions")} · {t("netRevenue")}: {formatMoney(mc.netRevenue || 0)}</Text>
                    <Text style={{ color: Colors.textMuted, fontSize: 12 }}>{t("totalExpenses")}: {formatMoney(mc.totalExpenses || 0)}</Text>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Accounts Receivable Modal (DEBITOREN) ─────────────────────── */}
      <Modal visible={showAccountsReceivable} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.modalHeader, rowFlip && { flexDirection: "row-reverse" }]}>
              <Text style={styles.modalTitle}>{t("debitoren")}</Text>
              <Pressable hitSlop={8} style={styles.closeBtn} accessibilityLabel={t("close" as any)} onPress={() => setShowAccountsReceivable(false)}><Ionicons name="close" size={24} color={Colors.textMuted} /></Pressable>
            </View>
            <ScrollView>
              {(() => {
                const debtors = customersList.filter((c: any) => Number(c.creditBalance) > 0);
                const total = debtors.reduce((s: number, c: any) => s + Number(c.creditBalance || 0), 0);
                return (
                  <>
                    <View style={{ backgroundColor: Colors.hueRose + "15", borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: Colors.hueRose + "40" }}>
                      <Text style={{ color: Colors.textMuted, fontSize: 12 }}>{t("totalOutstanding")}</Text>
                      <Text style={{ color: Colors.hueRose, fontSize: 28, fontWeight: "800" }}>{formatMoney(total)}</Text>
                      <Text style={{ color: Colors.textMuted, fontSize: 13 }}>{debtors.length} {t("customersWithCredit")}</Text>
                    </View>
                    {debtors.length === 0 ? (
                      <Text style={{ color: Colors.textMuted, textAlign: "center", padding: 24 }}>{t("noOutstandingBalances")}</Text>
                    ) : (
                      debtors.map((c: any) => (
                        <View key={c.id} style={{ backgroundColor: Colors.surfaceLight, borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: Colors.cardBorder }}>
                          <View style={{ flexDirection: rowFlip ? "row-reverse" : "row", justifyContent: "space-between", alignItems: "center" }}>
                            <View>
                              <Text style={{ color: Colors.text, fontWeight: "700" }}>{c.name}</Text>
                              <Text style={{ color: Colors.textMuted, fontSize: 12 }}>{c.phone || t("noPhone")}</Text>
                            </View>
                            <View style={{ alignItems: "flex-end" }}>
                              <Text style={{ color: Colors.hueRose, fontWeight: "800", fontSize: 16 }}>{formatMoney(c.creditBalance)}</Text>
                              <Text style={{ color: Colors.textMuted, fontSize: 11 }}>{t("creditBalance")}</Text>
                            </View>
                          </View>
                        </View>
                      ))
                    )}
                  </>
                );
              })()}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Loyalty programme ─────────────────────────────────────────────────
           One setting for the till and the online store. The server awards the
           points on every sale to a known customer; the till offers redemption. */}
      <Modal visible={showLoyaltyConfig} animationType="slide" transparent onRequestClose={() => setShowLoyaltyConfig(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.modalHeader, rowFlip && { flexDirection: "row-reverse" }]}>
              <Text style={[styles.modalTitle, rtlTextAlign]}>{t("loyaltyConfiguration")}</Text>
              <Pressable hitSlop={8} style={styles.closeBtn} accessibilityLabel={t("close" as any)} onPress={() => setShowLoyaltyConfig(false)}><Ionicons name="close" size={24} color={Colors.text} /></Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[{ color: Colors.textMuted, fontSize: 13, lineHeight: 19, marginBottom: 8 }, rtlTextAlign]}>
                {tr3(
                  "العميل المسجَّل في البيع يكسب نقاطاً على كل عملية شراء في الكاشير والمتجر الإلكتروني، ويمكنه استبدالها كخصم عند الدفع.",
                  "Ein beim Verkauf ausgewählter Kunde sammelt bei jedem Einkauf an der Kasse und im Online-Shop Punkte und kann sie an der Kasse als Rabatt einlösen.",
                  "A customer picked on the sale earns points on every purchase at the till and in the online store, and can redeem them as a discount at checkout.",
                )}
              </Text>

              <View style={{ flexDirection: rowFlip ? "row-reverse" : "row", alignItems: "center", justifyContent: "space-between", backgroundColor: Colors.surfaceLight, borderRadius: 12, padding: 14, marginTop: 8 }}>
                <Text style={{ color: Colors.text, fontSize: 14, fontWeight: "600" }}>{tr3("تفعيل برنامج الولاء", "Treueprogramm aktiv", "Loyalty programme on")}</Text>
                <Switch value={loyaltyForm.enabled} onValueChange={(v) => setLoyaltyForm({ ...loyaltyForm, enabled: v })} trackColor={{ false: Colors.inputBorder, true: Colors.loyaltyGold + "60" }} thumbColor={loyaltyForm.enabled ? Colors.loyaltyGold : Colors.textMuted} />
              </View>

              <Text style={[styles.label, rtlTextAlign]}>{tr3("المبلغ المطلوب لكسب نقطة واحدة", "Umsatz für 1 Punkt", "Spend to earn 1 point")} ({currencyLabel()})</Text>
              <TextInput style={[styles.input, rtlTextAlign]} value={loyaltyForm.spendPerPoint} onChangeText={(v) => setLoyaltyForm({ ...loyaltyForm, spendPerPoint: v })} placeholderTextColor={Colors.textMuted} placeholder={tr3("مثال: 1000", "z. B. 10", "e.g. 10")} keyboardType="decimal-pad" />

              <Text style={[styles.label, rtlTextAlign]}>{tr3("قيمة النقطة عند الاستبدال", "Wert von 1 Punkt beim Einlösen", "Value of 1 point when redeemed")} ({currencyLabel()})</Text>
              <TextInput style={[styles.input, rtlTextAlign]} value={loyaltyForm.pointValue} onChangeText={(v) => setLoyaltyForm({ ...loyaltyForm, pointValue: v })} placeholderTextColor={Colors.textMuted} placeholder={tr3("مثال: 10", "z. B. 0.10", "e.g. 0.10")} keyboardType="decimal-pad" />

              <Text style={[styles.label, rtlTextAlign]}>{tr3("الحد الأدنى من النقاط للاستبدال", "Mindestpunkte zum Einlösen", "Minimum points to redeem")}</Text>
              <TextInput style={[styles.input, rtlTextAlign]} value={loyaltyForm.minRedeem} onChangeText={(v) => setLoyaltyForm({ ...loyaltyForm, minRedeem: v.replace(/[^0-9]/g, "") })} placeholderTextColor={Colors.textMuted} placeholder="0" keyboardType="number-pad" />

              {(() => {
                const spend = parseFloat(loyaltyForm.spendPerPoint.replace(",", "."));
                const value = parseFloat(loyaltyForm.pointValue.replace(",", "."));
                if (!(spend > 0) || !(value >= 0)) return null;
                const back = (value / spend) * 100;
                return (
                  <View style={{ backgroundColor: Colors.loyaltyGold + "15", borderRadius: 12, padding: 12, marginTop: 14, borderWidth: 1, borderColor: Colors.loyaltyGold + "40" }}>
                    <Text style={[{ color: Colors.text, fontSize: 13, lineHeight: 19 }, rtlTextAlign]}>
                      {tr3(
                        `مثال: عملية شراء بقيمة ${formatMoney(spend * 10)} تكسب 10 نقاط، و10 نقاط = خصم ${formatMoney(value * 10)} (${back.toFixed(1)}٪ من قيمة الشراء).`,
                        `Beispiel: Ein Einkauf von ${formatMoney(spend * 10)} bringt 10 Punkte; 10 Punkte = ${formatMoney(value * 10)} Rabatt (${back.toFixed(1)} % zurück).`,
                        `Example: a ${formatMoney(spend * 10)} purchase earns 10 points; 10 points = ${formatMoney(value * 10)} off (${back.toFixed(1)}% back).`,
                      )}
                    </Text>
                  </View>
                );
              })()}

              <Pressable style={styles.saveBtn} disabled={saveLoyaltyMutation.isPending} onPress={handleSaveLoyalty}>
                <LinearGradient colors={[Colors.accent, Colors.gradientMid]} style={styles.saveBtnGradient}>
                  <Text style={styles.saveBtnText}>{saveLoyaltyMutation.isPending ? "…" : t("save")}</Text>
                </LinearGradient>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const pgStyles = themedStyles((Colors) => ({
  section: { marginBottom: 8 },
  gatewayHeader: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 16 },
  gatewayIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  gatewayInfo: { flex: 1 },
  gatewayName: { color: Colors.text, fontSize: 18, fontWeight: "700" },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 13, fontWeight: "600" },
  modeBadge: { backgroundColor: Colors.warning + "20", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginLeft: 6 },
  modeText: { color: Colors.warning, fontSize: 11, fontWeight: "700" },
  configGrid: { flexDirection: "row", gap: 12, marginBottom: 14 },
  configItem: { flex: 1, backgroundColor: Colors.surfaceLight, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: Colors.cardBorder },
  configLabel: { color: Colors.textMuted, fontSize: 11, fontWeight: "600", textTransform: "uppercase" as const, letterSpacing: 0.5, marginBottom: 6 },
  configValueRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  configValue: { color: Colors.text, fontSize: 15, fontWeight: "700" },
  testBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#635BFF", borderRadius: 12, paddingVertical: 12 },
  testBtnText: { color: Colors.white, fontSize: 14, fontWeight: "700" },
  testResult: { borderRadius: 12, padding: 12, marginTop: 10, borderWidth: 1 },
  testResultHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  testResultText: { fontSize: 14, fontWeight: "700" },
  testResultDetail: { color: Colors.textMuted, fontSize: 12, marginTop: 6 },
  divider: { height: 1, backgroundColor: Colors.cardBorder, marginVertical: 16 },
  methodsTitle: { color: Colors.text, fontSize: 16, fontWeight: "700", marginBottom: 12 },
  methodRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.cardBorder },
  methodIconWrap: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  methodLabel: { flex: 1, color: Colors.text, fontSize: 15, fontWeight: "600" },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  infoNote: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: Colors.info + "10", borderRadius: 10, padding: 10, marginTop: 4 },
  infoNoteText: { color: Colors.textSecondary, fontSize: 12, flex: 1 },
  methodHint: { color: Colors.textMuted, fontSize: 11, marginTop: 2 },
  warnBox: { backgroundColor: Colors.warning + "12", borderWidth: 1, borderColor: Colors.warning + "35", borderRadius: 12, padding: 12, marginBottom: 12 },
  warnHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  warnTitle: { flex: 1, color: Colors.text, fontSize: 14, fontWeight: "700" },
  warnText: { color: Colors.textSecondary, fontSize: 12, marginTop: 6 },
  envRow: { marginTop: 8 },
  envName: { color: Colors.text, fontSize: 12, fontWeight: "700", fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" },
  envDesc: { color: Colors.textMuted, fontSize: 11, marginTop: 2 },
  footNote: { color: Colors.textMuted, fontSize: 11, marginTop: 10, lineHeight: 16 },
  mutedNote: { color: Colors.textMuted, fontSize: 12, marginBottom: 4 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  chip: { backgroundColor: Colors.surfaceLight, borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  chipText: { color: Colors.text, fontSize: 12, fontWeight: "600" },
}));

const styles = themedStyles((Colors) => ({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 12 },
  profileCard: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.surface, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: Colors.cardBorder },
  profileAvatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.accent, justifyContent: "center", alignItems: "center", marginRight: 14 },
  profileInitial: { color: Colors.textDark, fontSize: 22, fontWeight: "800" },
  profileInfo: { flex: 1 },
  profileName: { color: Colors.text, fontSize: 18, fontWeight: "700" },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, alignSelf: "flex-start", marginTop: 4 },
  roleText: { fontSize: 12, fontWeight: "700", textTransform: "capitalize" as const },
  sectionTitle: { color: Colors.textSecondary, fontSize: 13, fontWeight: "600", marginTop: 16, marginBottom: 8, textTransform: "uppercase" as const, letterSpacing: 1 },
  logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: Colors.surface, borderRadius: 14, padding: 16, marginTop: 20, borderWidth: 1, borderColor: Colors.danger + "30" },
  logoutText: { color: Colors.danger, fontSize: 16, fontWeight: "600" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", alignItems: "center" },
  modalContent: { backgroundColor: Colors.surface, borderRadius: 20, padding: 24, width: "92%", maxWidth: 500, maxHeight: "85%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { color: Colors.text, fontSize: 20, fontWeight: "700" },
  modalActions: { flexDirection: "row", alignItems: "center", gap: 12 },
  empCard: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.surfaceLight, borderRadius: 12, padding: 12, marginBottom: 8 },
  empAvatar: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center", marginRight: 12 },
  empInitial: { color: Colors.text, fontSize: 16, fontWeight: "700" },
  empInfo: { flex: 1 },
  empName: { color: Colors.text, fontSize: 14, fontWeight: "600" },
  empMeta: { color: Colors.textMuted, fontSize: 11, marginTop: 2 },
  label: { color: Colors.textSecondary, fontSize: 12, fontWeight: "600", marginBottom: 6, marginTop: 12, textTransform: "uppercase" as const, letterSpacing: 0.5 },
  input: { backgroundColor: Colors.inputBg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: Colors.text, fontSize: 15, borderWidth: 1, borderColor: Colors.inputBorder },
  formInput: { backgroundColor: Colors.inputBg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: Colors.text, fontSize: 15, borderWidth: 1, borderColor: Colors.inputBorder, marginBottom: 4 },
  roleRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  roleChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.surfaceLight },
  roleChipText: { color: Colors.textSecondary, fontSize: 13, fontWeight: "600", textTransform: "capitalize" as const },
  saveBtn: { borderRadius: 14, overflow: "hidden", marginTop: 20, marginBottom: 16 },
  saveBtnGradient: { paddingVertical: 14, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 },
  saveBtnText: { color: Colors.white, fontSize: 16, fontWeight: "700" },
  clockBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, minHeight: 36 },
  iconBtn: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  closeBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center" },
  clockBtnText: { fontSize: 13, fontWeight: "700" },
}));

const smStyles = themedStyles((Colors) => ({
  notifBadge: { position: "absolute", top: 0, right: 0, backgroundColor: Colors.danger, borderRadius: 10, minWidth: 18, height: 18, justifyContent: "center", alignItems: "center", paddingHorizontal: 4 },
  notifBadgeText: { color: Colors.white, fontSize: 10, fontWeight: "800" },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 10, backgroundColor: Colors.surfaceLight, alignItems: "center" },
  tabActive: { backgroundColor: Colors.accent },
  tabText: { color: Colors.textMuted, fontSize: 12, fontWeight: "600" },
  tabTextActive: { color: Colors.textDark },
  shiftCard: { backgroundColor: Colors.surfaceLight, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.cardBorder },
  shiftMeta: { color: Colors.textMuted, fontSize: 11 },
  progressBarBg: { height: 6, backgroundColor: Colors.inputBg, borderRadius: 4, overflow: "hidden", position: "relative" as const },
  progressBarFill: { height: 6, borderRadius: 4 },
  statChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: Colors.surface, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  statChipText: { color: Colors.textMuted, fontSize: 10 },
  notifItem: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 12, borderRadius: 12, marginBottom: 6, backgroundColor: Colors.surfaceLight },
  notifUnread: { backgroundColor: Colors.accent + "08", borderWidth: 1, borderColor: Colors.accent + "20" },
  notifIconWrap: { width: 38, height: 38, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  notifTitle: { color: Colors.textSecondary, fontSize: 13, fontWeight: "700" },
  notifMsg: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  notifTime: { color: Colors.textMuted, fontSize: 10, marginTop: 4 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.accent },
}));
