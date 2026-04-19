import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet, Text, View, ScrollView, Pressable, Modal,
  TextInput, Alert, Platform, FlatList, Switch, Image, useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Colors } from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";
import { useLicense } from "@/lib/license-context";
import { apiRequest, getQueryFn, getApiUrl } from "@/lib/query-client";
import { getDisplayNumber } from "@/lib/api-config";
import { playClickSound } from "@/lib/sound";
import { getChromeMetrics } from "@/lib/responsive";
import TabPageHeader from "@/components/tab-page-header";

function printHtmlViaIframe(html: string, onDone?: () => void) {
  if (typeof document === "undefined") return;
  const frameId = `_rp_${Date.now()}`;
  const iframe = document.createElement("iframe");
  iframe.id = frameId;
  Object.assign(iframe.style, { position: "fixed", right: "0", bottom: "0", width: "1px", height: "1px", border: "none", opacity: "0", pointerEvents: "none", zIndex: "-1" });
  document.body.appendChild(iframe);
  const cleanup = (url: string) => { URL.revokeObjectURL(url); setTimeout(() => iframe?.remove(), 1000); };
  try {
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    iframe.src = url;
    iframe.onload = () => {
      setTimeout(() => {
        try {
          const win = iframe.contentWindow;
          if (!win) return;
          win.focus();
          if (onDone) {
            win.addEventListener("afterprint", () => { cleanup(url); onDone(); }, { once: true });
            setTimeout(() => { try { onDone(); } catch (_) {} }, 8000);
          } else {
            win.addEventListener("afterprint", () => cleanup(url), { once: true });
            setTimeout(() => cleanup(url), 8000);
          }
          win.print();
        } catch (_) { onDone?.(); }
      }, 400);
    };
  } catch (_) { iframe.remove(); onDone?.(); }
}

function SettingRow({ icon, label, value, onPress, color, rtl }: { icon: string; label: string; value?: string; onPress?: () => void; color?: string; rtl?: boolean }) {
  return (
    <Pressable style={[rowStyles.row, rtl && { flexDirection: "row-reverse" }]} onPress={onPress ? () => { playClickSound("light"); onPress(); } : undefined}>
      <View style={[rowStyles.iconWrap, { backgroundColor: (color || Colors.accent) + "20" }, rtl ? { marginLeft: 12, marginRight: 0 } : {}]}>
        <Ionicons name={icon as any} size={20} color={color || Colors.accent} />
      </View>
      <View style={[rowStyles.info, rtl && { alignItems: "flex-end" }]}>
        <Text style={[rowStyles.label, rtl && { textAlign: "right" }]}>{label}</Text>
        {value ? <Text style={[rowStyles.value, rtl && { textAlign: "right" }]}>{value}</Text> : null}
      </View>
      {onPress && <Ionicons name={rtl ? "chevron-back" : "chevron-forward"} size={18} color={Colors.textMuted} />}
    </Pressable>
  );
}

const rowStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.surface, borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: Colors.cardBorder },
  iconWrap: { width: 40, height: 40, borderRadius: 10, justifyContent: "center", alignItems: "center", marginRight: 12 },
  info: { flex: 1 },
  label: { color: Colors.text, fontSize: 15, fontWeight: "600" },
  value: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
});

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

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const qc = useQueryClient();
  const { employee, logout, isAdmin, canManage, isCashier } = useAuth();
  const { t, isRTL, language, setLanguage } = useLanguage();
  const { tenant } = useLicense();
  const { topPad, bottomPad } = getChromeMetrics(width);
  const tenantId = tenant?.id;

  // Landing page config for slug
  const { data: landingConfigData } = useQuery({
    queryKey: ["/api/landing-page-config", tenantId],
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
  const [expenseForm, setExpenseForm] = useState({ description: "", amount: "", category: "other", date: new Date().toISOString().split("T")[0], notes: "" });

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
  const [branchForm, setBranchForm] = useState({ name: "", address: "", phone: "", currency: "CHF", taxRate: "" });
  const [showWarehouseForm, setShowWarehouseForm] = useState(false);
  const [warehouseForm, setWarehouseForm] = useState({ name: "", address: "", type: "main" });
  // Delivery Platform modals
  const [showDeliveryZones, setShowDeliveryZones] = useState(false);
  const [showPromoCodes, setShowPromoCodes] = useState(false);
  const [showDriverManagement, setShowDriverManagement] = useState(false);
  const [showLoyaltyConfig, setShowLoyaltyConfig] = useState(false);

  const [showPrinterSettings, setShowPrinterSettings] = useState(false);
  const [printerPaperSize, setPrinterPaperSize] = useState("80mm");
  const [printerAutoPrint, setPrinterAutoPrint] = useState(false);
  const [showStoreSettings, setShowStoreSettings] = useState(false);
  const [storeForm, setStoreForm] = useState({ name: "", address: "", phone: "", email: "", storeType: "supermarket", taxRate: "", deliveryFee: "", whatsappAdminPhone: "" });
  const [storeLogo, setStoreLogo] = useState<string | null>(null);
  const [storeLogoUploading, setStoreLogoUploading] = useState(false);

  const [showShiftMonitor, setShowShiftMonitor] = useState(false);
  const [shiftMonitorTab, setShiftMonitorTab] = useState<"active" | "history" | "settings">("active");
  const [defaultShiftDuration, setDefaultShiftDuration] = useState("8");
  const [activeShiftsElapsed, setActiveShiftsElapsed] = useState<Record<number, string>>({});

  const [showNotifications, setShowNotifications] = useState(false);
  const [showPaymentGateway, setShowPaymentGateway] = useState(false);
  const [pgTestResult, setPgTestResult] = useState<any>(null);
  const [pgTesting, setPgTesting] = useState(false);

  const [showBulkImport, setShowBulkImport] = useState(false);
  const [importType, setImportType] = useState<"products" | "customers">("products");
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [showCallerIdTest, setShowCallerIdTest] = useState(false);
  const [testPhoneNumber, setTestPhoneNumber] = useState("");
  const [callerIdStatus, setCallerIdStatus] = useState<"idle" | "testing" | "done">("idle");

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
  const { data: storeSettings } = useQuery<any>({ queryKey: [tenant?.id ? `/api/store-settings?tenantId=${tenant.id}` : "/api/store-settings"], queryFn: getQueryFn({ on401: "throw" }), enabled: !!tenant?.id });
  const { data: pgConfig, refetch: refetchPgConfig } = useQuery<any>({ queryKey: ["/api/payment-gateway/config"], queryFn: getQueryFn({ on401: "throw" }), enabled: isAdmin });
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

  const activeShift = shifts.find((s: any) => s.employeeId === employee?.id && s.startTime && !s.endTime && s.status === "open");

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
    onError: (e: any) => Alert.alert(t("error"), e.message),
  });

  const updateEmpMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest("PUT", `/api/employees/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [empQueryKey] }); setShowEmployeeForm(false); setEditEmployee(null); },
    onError: (e: any) => Alert.alert(t("error"), e.message),
  });

  const deleteEmpMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/employees/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).includes("/api/employees") });
    },
    onError: (e: any) => {
      console.error("Delete employee failed:", e.message);
      if (Platform.OS === "web") {
        window.alert(`Delete failed: ${e.message}`);
      } else {
        Alert.alert(t("error"), e.message);
      }
    },
  });

  const createSupMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/suppliers", { ...data, tenantId: tenant?.id }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [tenant?.id ? `/api/suppliers?tenantId=${tenant.id}` : "/api/suppliers"] }); setShowSupplierForm(false); },
    onError: (e: any) => Alert.alert(t("error"), e.message),
  });

  const createExpenseMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/expenses", { ...data, tenantId: tenant?.id }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [tenant?.id ? `/api/expenses?tenantId=${tenant.id}` : "/api/expenses"] }); setShowExpenseForm(false); },
    onError: (e: any) => Alert.alert(t("error"), e.message),
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/expenses/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [tenant?.id ? `/api/expenses?tenantId=${tenant.id}` : "/api/expenses"] }); },
    onError: (e: any) => Alert.alert(t("error"), e.message),
  });

  const shiftsQueryKey = tenant?.id ? `/api/shifts?tenantId=${tenant.id}` : "/api/shifts";
  const activeShiftsQueryKey = tenant?.id ? `/api/shifts/active?tenantId=${tenant.id}` : "/api/shifts/active";

  const clockInMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/shifts", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [shiftsQueryKey] }); },
    onError: (e: any) => Alert.alert(t("error"), e.message),
  });

  const clockOutMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest("PUT", `/api/shifts/${id}/close`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [shiftsQueryKey] });
      qc.invalidateQueries({ queryKey: [activeShiftsQueryKey] });
    },
    onError: (e: any) => Alert.alert(t("error"), e.message),
  });

  const forceCloseShiftMutation = useMutation({
    mutationFn: (id: number) => apiRequest("PUT", `/api/shifts/${id}/close`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [shiftsQueryKey] });
      qc.invalidateQueries({ queryKey: [activeShiftsQueryKey] });
      Alert.alert(t("success"), t("shiftForceClosed"));
    },
    onError: (e: any) => Alert.alert(t("error"), e.message),
  });

  const markNotificationReadMutation = useMutation({
    mutationFn: (id: number) => apiRequest("PUT", `/api/notifications/${id}/read`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/notifications/${employee?.id}`] });
      qc.invalidateQueries({ queryKey: [`/api/notifications/${employee?.id}/unread-count`] });
    },
    onError: (e: any) => Alert.alert(t("error"), e.message),
  });

  const markAllNotificationsReadMutation = useMutation({
    mutationFn: () => apiRequest("PUT", `/api/notifications/${employee?.id}/read-all`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/notifications/${employee?.id}`] });
      qc.invalidateQueries({ queryKey: [`/api/notifications/${employee?.id}/unread-count`] });
    },
    onError: (e: any) => Alert.alert(t("error"), e.message),
  });

  const updateShiftMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest("PUT", `/api/shifts/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/shifts"] });
      qc.invalidateQueries({ queryKey: ["/api/shifts/active"] });
    },
    onError: (e: any) => Alert.alert(t("error"), e.message),
  });

  const createPOMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/purchase-orders", { ...data, tenantId: tenant?.id }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [tenant?.id ? `/api/purchase-orders?tenantId=${tenant.id}` : "/api/purchase-orders"] }); setShowPOForm(false); },
    onError: (e: any) => Alert.alert(t("error"), e.message),
  });

  const receivePOMutation = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/purchase-orders/${id}/receive`, { items: [] }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [tenant?.id ? `/api/purchase-orders?tenantId=${tenant.id}` : "/api/purchase-orders"] }); },
    onError: (e: any) => Alert.alert(t("error"), e.message),
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
        branchId: employee?.branchId || branches[0]?.id || 1,
        tenantId: tenant?.id,
        items: returnItems,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [tenant?.id ? `/api/returns?tenantId=${tenant.id}` : "/api/returns"] });
      qc.invalidateQueries({ queryKey: [tenant?.id ? `/api/sales?limit=50&tenantId=${tenant.id}` : "/api/sales?limit=50"] });
      qc.invalidateQueries({ queryKey: ["/api/inventory"] });
      setShowReturnForm(false);
      setReturnForm({ originalSaleId: "", reason: "", type: "refund" });
      Alert.alert(t("success"), t("returnProcessed"));
    },
    onError: (e: any) => Alert.alert(t("error"), e.message),
  });

  const cashDrawerMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/cash-drawer", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/shifts"] });
      setCashDrawerForm({ type: "withdrawal", amount: "", reason: "" });
      Alert.alert(t("success"), t("cashDrawerRecorded"));
    },
    onError: (e: any) => Alert.alert(t("error"), e.message),
  });

  const createWarehouseMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/warehouses", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/warehouses"] }); setShowWarehouseForm(false); },
    onError: (e: any) => Alert.alert(t("error"), e.message),
  });

  const createBranchMutation = useMutation({
    mutationFn: (data: any) => {
      const payload = { ...data, tenantId: tenant?.id };
      if (editBranch) return apiRequest("PUT", `/api/branches/${editBranch.id}`, payload);
      return apiRequest("POST", "/api/branches", payload);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [tenant?.id ? `/api/branches?tenantId=${tenant.id}` : "/api/branches"] }); setShowBranchForm(false); setEditBranch(null); },
    onError: (e: any) => Alert.alert(t("error"), e.message),
  });

  const deleteBranchMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/branches/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [tenant?.id ? `/api/branches?tenantId=${tenant.id}` : "/api/branches"] }); },
    onError: (e: any) => Alert.alert(t("error"), e.message),
  });

  const createBatchMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/product-batches", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/product-batches"] }); },
    onError: (e: any) => Alert.alert(t("error"), e.message),
  });

  const updateBatchMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest("PUT", `/api/product-batches/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/product-batches"] }); },
    onError: (e: any) => Alert.alert(t("error"), e.message),
  });
  const deleteBatchMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/product-batches/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/product-batches"] }); },
    onError: (e: any) => Alert.alert(t("error"), e.message),
  });

  const updateStoreSettingsMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PUT", "/api/store-settings", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/store-settings"] }); setShowStoreSettings(false); Alert.alert(t("success"), t("storeSettingsSaved")); },
    onError: (e: any) => Alert.alert(t("error"), e.message),
  });

  const pickStoreLogo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images' as ImagePicker.MediaType,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setStoreLogo(result.assets[0].uri);
    }
  };

  const uriToDataUri = async (uri: string): Promise<string | null> => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.error("Image conversion failed:", e);
      return null;
    }
  };

  const handleSaveStoreSettings = async () => {
    let logoPath = storeSettings?.logo || null;
    if (storeLogo && !storeLogo.startsWith("/objects") && !storeLogo.startsWith("data:")) {
      setStoreLogoUploading(true);
      logoPath = await uriToDataUri(storeLogo);
      setStoreLogoUploading(false);
    } else if (storeLogo && storeLogo.startsWith("data:")) {
      logoPath = storeLogo;
    }
    updateStoreSettingsMutation.mutate({
      name: storeForm.name || undefined,
      address: storeForm.address || undefined,
      phone: storeForm.phone || undefined,
      email: storeForm.email || undefined,
      logo: logoPath || undefined,
      storeType: storeForm.storeType || "supermarket",
      taxRate: storeForm.taxRate !== "" ? storeForm.taxRate : undefined,
      deliveryFee: storeForm.deliveryFee !== "" ? storeForm.deliveryFee : undefined,
      whatsappAdminPhone: storeForm.whatsappAdminPhone || "",
    });
  };

  // Vehicle mutations
  const createVehicleMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/vehicles", { ...data, tenantId: tenant?.id, branchId: employee?.branchId || null }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [tenant?.id ? `/api/vehicles?tenantId=${tenant.id}` : "/api/vehicles"] }); setShowVehicleForm(false); setEditVehicle(null); },
    onError: (e: any) => Alert.alert(t("error"), e.message),
  });
  const updateVehicleMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest("PUT", `/api/vehicles/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [tenant?.id ? `/api/vehicles?tenantId=${tenant.id}` : "/api/vehicles"] }); setShowVehicleForm(false); setEditVehicle(null); },
    onError: (e: any) => Alert.alert(t("error"), e.message),
  });
  const deleteVehicleMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/vehicles/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [tenant?.id ? `/api/vehicles?tenantId=${tenant.id}` : "/api/vehicles"] }); },
    onError: (e: any) => Alert.alert(t("error"), e.message),
  });

  // Printer config save
  const savePrinterConfigMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/printer-configs", { ...data, tenantId: tenant?.id }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [tenant?.id ? `/api/printer-configs?tenantId=${tenant.id}` : "/api/printer-configs"] }); Alert.alert(t("success"), t("printerConfigSaved")); },
    onError: (e: any) => Alert.alert(t("error"), e.message),
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
      case "cash_drawer": return { name: "cash", color: "#F59E0B" };
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

  const handleLogout = () => {
    if (activeShift) {
      Alert.alert(
        t("endShift"),
        t("shiftRequiredMsg") || "You must end your shift before logging out.",
        [
          { text: t("cancel"), style: "cancel" },
          {
            text: t("endShift") + " & " + t("logout"),
            style: "destructive",
            onPress: () => clockOutMutation.mutate({ id: activeShift.id, data: {} }, {
              onSuccess: () => {
                if (Platform.OS === "web") {
                  if (window.confirm(t("logoutConfirm"))) logout();
                } else {
                  Alert.alert(t("logoutConfirm"), "", [
                    { text: t("cancel"), style: "cancel" },
                    { text: t("logout"), style: "destructive", onPress: () => logout() },
                  ]);
                }
              },
            }),
          },
        ]
      );
      return;
    }
    if (Platform.OS === "web") {
      if (window.confirm(t("logoutConfirm"))) logout();
    } else {
      Alert.alert(t("logoutConfirm"), "", [
        { text: t("cancel"), style: "cancel" },
        { text: t("logout"), style: "destructive", onPress: () => logout() },
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
                <Text style={[styles.roleText, { color: roleColors[employee.role] || Colors.info }]}>{employee.role}</Text>
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
                deliveryFee: storeSettings?.deliveryFee != null ? String(storeSettings.deliveryFee) : "",
                whatsappAdminPhone: storeSettings?.whatsappAdminPhone || "",
              });
              setStoreLogo(storeSettings?.logo || null);
              setShowStoreSettings(true);
            }} color={Colors.accent} rtl={isRTL} />
            <SettingRow icon="card" label={t("paymentGateways")} value={pgConfig?.stripe?.status === "connected" ? t("stripeConnected") : t("notConfigured")} onPress={() => { setPgTestResult(null); setShowPaymentGateway(true); }} color="#7C3AED" rtl={isRTL} />
            <SettingRow icon="cloud-upload" label={t("bulkImport")} value={t("importData")} onPress={() => { setImportResult(null); setShowBulkImport(true); }} color="#F59E0B" rtl={isRTL} />
            <SettingRow icon="qr-code" label="QR Tables" value={t("manageTables" as any) || "Manage QR codes"} onPress={() => router.push("/table-qr")} color="#2FD3C6" rtl={isRTL} />
          </>
        )}

        {canManage && (
          <>
            <Text style={styles.sectionTitle}>{t("management")}</Text>
            <SettingRow icon="cube" label={t("suppliers")} value={`${suppliers.length} ${t("suppliers")}`} onPress={() => setShowSuppliers(true)} color={Colors.success} rtl={isRTL} />
            <SettingRow icon="wallet" label={t("expenses")} value={`${expenses.length} ${t("expenses")}`} onPress={() => setShowExpenses(true)} color={Colors.warning} rtl={isRTL} />
            <SettingRow icon="time" label={t("attendance")} value={`${shifts.length} ${t("attendance")}`} onPress={() => setShowAttendance(true)} color={Colors.warning} rtl={isRTL} />
            {isAdmin && <SettingRow icon="pulse" label={t("shiftMonitor")} value={`${allActiveShifts.length} ${t("activeShiftsCount")}`} onPress={() => { setShiftMonitorTab("active"); setShowShiftMonitor(true); }} color="#2FD3C6" rtl={isRTL} />}
            <SettingRow icon="document-text" label={t("purchaseOrders")} value={`${purchaseOrders.length} ${t("orders")}`} onPress={() => setShowPurchaseOrders(true)} color={Colors.info} rtl={isRTL} />
            <SettingRow icon="list" label={t("activityLog")} value={`${activityLog.length} ${t("entries")}`} onPress={() => setShowActivityLog(true)} color={Colors.secondary} rtl={isRTL} />
            <SettingRow icon="swap-horizontal" label={t("returnsRefunds")} value={`${returns.length} ${t("returns")}`} onPress={() => setShowReturnsManager(true)} color={Colors.danger} rtl={isRTL} />
            <SettingRow icon="cash" label={t("cashDrawer")} value={activeShift ? t("activeShift") : t("noActiveShift")} onPress={() => setShowCashDrawer(true)} color={Colors.success} rtl={isRTL} />
            <SettingRow icon="home" label={t("warehouses")} value={`${warehousesList.length} ${t("warehouses")}`} onPress={() => setShowWarehouseManager(true)} color={Colors.accent} rtl={isRTL} />
            <SettingRow icon="layers" label={t("productBatches")} value={`${batchesList.length} ${t("batches")}`} onPress={() => { setBatchView("list"); setShowBatchManager(true); }} color={Colors.secondary} rtl={isRTL} />
            <SettingRow icon="car" label={t("vehicles")} value={`${vehiclesList.length} ${t("vehicles")}`} onPress={() => setShowVehicles(true)} color="#F97316" rtl={isRTL} />
            <SettingRow icon="calendar" label={t("dailyClosing")} value={`${dailyClosingsList.length} ${t("entries")}`} onPress={() => setShowDailyClosing(true)} color="#06B6D4" rtl={isRTL} />
            <SettingRow icon="calendar-number" label={t("monthlyClosing")} value={`${monthlyClosingsList.length} ${t("entries")}`} onPress={() => setShowMonthlyClosing(true)} color="#8B5CF6" rtl={isRTL} />
            <SettingRow icon="receipt" label={t("accountsReceivable")} value={t("debitoren")} onPress={() => setShowAccountsReceivable(true)} color="#EF4444" rtl={isRTL} />
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
        <SettingRow icon="pricetag" label={t("promoCodes")} value={t("addPromoCode")} onPress={() => router.push("/promo-codes")} color="#8B5CF6" rtl={isRTL} />
        <SettingRow icon="car" label={t("driverManagement")} value={t("activeDrivers")} onPress={() => router.push("/driver-management")} color={Colors.driverOnline} rtl={isRTL} />
        <SettingRow icon="storefront" label={t("storefrontPreview")} value={slug || "—"} onPress={() => { if (slug) require("react-native").Linking.openURL(getApiUrl() + `/order/${slug}`); }} color={Colors.accent} rtl={isRTL} />
        <SettingRow icon="star" label={t("loyaltyConfiguration")} value={t("loyaltyPoints")} onPress={() => setShowLoyaltyConfig(true)} color={Colors.loyaltyGold} rtl={isRTL} />

        <Text style={styles.sectionTitle}>{t("system")}</Text>
        <SettingRow icon="language" label={t("language")} value={language === "ar" ? "العربية" : language === "de" ? "Deutsch" : "English"} onPress={() => setShowLanguagePicker(true)} color={Colors.info} rtl={isRTL} />
        <Pressable
          style={[rowStyles.row, isRTL && { flexDirection: "row-reverse" }]}
          onPress={() => toggleLeftHandMode(!leftHandMode)}
        >
          <View style={[rowStyles.iconWrap, { backgroundColor: Colors.secondary + "20" }, isRTL ? { marginLeft: 12, marginRight: 0 } : {}]}>
            <Ionicons name="hand-left-outline" size={20} color={Colors.secondary} />
          </View>
          <View style={[rowStyles.info, isRTL && { alignItems: "flex-end" }]}>
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
        {canManage && <SettingRow icon="print" label={t("receiptPrinter")} value={t("notConfigured")} onPress={() => setShowPrinterSettings(true)} color={Colors.textMuted} rtl={isRTL} />}
        {canManage && <SettingRow icon="print-outline" label={t("printerConfig")} value={t("printerConfigDesc")} onPress={() => setShowPrinterConfig(true)} color="#7C3AED" rtl={isRTL} />}
        <SettingRow icon="cloud-upload" label={t("syncStatus")} value={t("connected")} color={Colors.success} rtl={isRTL} />
        <SettingRow icon="information-circle" label={t("appVersion")} value="1.0.0" color={Colors.info} rtl={isRTL} />

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
                <Pressable onPress={() => { setEditEmployee(null); setEmpForm({ name: "", pin: "", role: "cashier", email: "", phone: "" }); setShowEmployeeForm(true); }}>
                  <Ionicons name="add-circle" size={28} color={Colors.accent} />
                </Pressable>
                <Pressable onPress={() => setShowEmployees(false)}><Ionicons name="close" size={24} color={Colors.text} /></Pressable>
              </View>
            </View>
            <FlatList
              data={employees}
              keyExtractor={(item: any) => String(item.id)}
              scrollEnabled={!!employees.length}
              renderItem={({ item }: { item: any }) => (
                <View style={styles.empCard}>
                  <View style={[styles.empAvatar, { backgroundColor: (roleColors[item.role] || Colors.info) + "30" }]}>
                    <Text style={styles.empInitial}>{item.name.charAt(0)}</Text>
                  </View>
                  <View style={styles.empInfo}>
                    <Text style={styles.empName}>{item.name}</Text>
                    <Text style={styles.empMeta}>PIN: {item.pin} | {item.email || t("noEmail")}</Text>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View style={[styles.roleBadge, { backgroundColor: (roleColors[item.role] || Colors.info) + "20" }]}>
                      <Text style={[styles.roleText, { color: roleColors[item.role] || Colors.info }]}>{item.role}</Text>
                    </View>
                    <Pressable onPress={() => {
                      setEditEmployee(item);
                      setEmpForm({ name: item.name, pin: item.pin || "", role: item.role, email: item.email || "", phone: item.phone || "" });
                      setShowEmployeeForm(true);
                    }}>
                      <Ionicons name="create-outline" size={20} color={Colors.info} />
                    </Pressable>
                    <Pressable onPress={() => {
                      if (Platform.OS === "web") {
                        if (window.confirm(`${t("delete")} ${item.name}?`)) deleteEmpMutation.mutate(item.id);
                      } else {
                        Alert.alert(t("delete"), `${t("delete")} ${item.name}?`, [
                          { text: t("cancel"), style: "cancel" },
                          { text: t("delete"), style: "destructive", onPress: () => deleteEmpMutation.mutate(item.id) },
                        ]);
                      }
                    }}>
                      <Ionicons name="trash-outline" size={20} color={Colors.danger} />
                    </Pressable>
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
              <Text style={styles.modalTitle}>{editEmployee ? t("editEmployee" as any) || "Edit Employee" : t("newEmployee")}</Text>
              <Pressable onPress={() => { setShowEmployeeForm(false); setEditEmployee(null); }}><Ionicons name="close" size={24} color={Colors.text} /></Pressable>
            </View>
            <ScrollView>
              <Text style={styles.label}>{t("name")} *</Text>
              <TextInput style={styles.input} value={empForm.name} onChangeText={(v) => setEmpForm({ ...empForm, name: v })} placeholderTextColor={Colors.textMuted} placeholder={t("employeeName2")} />
              <Text style={styles.label}>{t("pin")} *</Text>
              <TextInput style={styles.input} value={empForm.pin} onChangeText={(v) => setEmpForm({ ...empForm, pin: v })} keyboardType="number-pad" placeholderTextColor={Colors.textMuted} placeholder={t("fourDigitPin")} maxLength={4} />
              <Text style={styles.label}>{t("role")}</Text>
              <View style={styles.roleRow}>
                {["cashier", "manager", "admin", "owner"].map((r) => (
                  <Pressable key={r} style={[styles.roleChip, empForm.role === r && { backgroundColor: Colors.accent }]} onPress={() => setEmpForm({ ...empForm, role: r })}>
                    <Text style={[styles.roleChipText, empForm.role === r && { color: Colors.textDark }]}>{t(r as any)}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.label}>{t("email")}</Text>
              <TextInput style={styles.input} value={empForm.email} onChangeText={(v) => setEmpForm({ ...empForm, email: v })} placeholderTextColor={Colors.textMuted} placeholder="email@example.com" autoCapitalize="none" />
              <Pressable style={styles.saveBtn} onPress={() => {
                if (!empForm.name || !empForm.pin) return Alert.alert(t("error"), t("namePinRequired"));
                if (editEmployee) {
                  updateEmpMutation.mutate({ id: editEmployee.id, data: { name: empForm.name, pin: empForm.pin, role: empForm.role, email: empForm.email || undefined, permissions: empForm.role === "admin" ? ["all"] : ["pos"] } });
                } else {
                  createEmpMutation.mutate({ name: empForm.name, pin: empForm.pin, role: empForm.role, email: empForm.email || undefined, tenantId: tenant?.id, branchId: branches[0]?.id ?? null, permissions: empForm.role === "admin" ? ["all"] : ["pos"] });
                }
              }}>
                <LinearGradient colors={[Colors.accent, Colors.gradientMid]} style={styles.saveBtnGradient}>
                  <Text style={styles.saveBtnText}>{editEmployee ? t("save" as any) || "Save Changes" : t("createEmployee")}</Text>
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
                <Pressable onPress={() => { setSupForm({ name: "", contactName: "", email: "", phone: "", paymentTerms: "" }); setShowSupplierForm(true); }}>
                  <Ionicons name="add-circle" size={28} color={Colors.accent} />
                </Pressable>
                <Pressable onPress={() => setShowSuppliers(false)}><Ionicons name="close" size={24} color={Colors.text} /></Pressable>
              </View>
            </View>
            <FlatList
              data={suppliers}
              keyExtractor={(item: any) => String(item.id)}
              scrollEnabled={!!suppliers.length}
              renderItem={({ item }: { item: any }) => (
                <View style={styles.empCard}>
                  <View style={[styles.empAvatar, { backgroundColor: Colors.success + "30" }]}>
                    <Ionicons name="cube" size={20} color={Colors.success} />
                  </View>
                  <View style={styles.empInfo}>
                    <Text style={styles.empName}>{item.name}</Text>
                    <Text style={styles.empMeta}>{item.contactName || t("noContact")} | {item.phone || t("noPhone")}</Text>
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
              <Pressable onPress={() => setShowSupplierForm(false)}><Ionicons name="close" size={24} color={Colors.text} /></Pressable>
            </View>
            <ScrollView>
              <Text style={styles.label}>{t("companyName")} *</Text>
              <TextInput style={styles.input} value={supForm.name} onChangeText={(v) => setSupForm({ ...supForm, name: v })} placeholderTextColor={Colors.textMuted} placeholder={t("supplierNamePlaceholder")} />
              <Text style={styles.label}>{t("contactPerson")}</Text>
              <TextInput style={styles.input} value={supForm.contactName} onChangeText={(v) => setSupForm({ ...supForm, contactName: v })} placeholderTextColor={Colors.textMuted} placeholder={t("contactNamePlaceholder")} />
              <Text style={styles.label}>{t("phone")}</Text>
              <TextInput style={styles.input} value={supForm.phone} onChangeText={(v) => setSupForm({ ...supForm, phone: v })} keyboardType="phone-pad" placeholderTextColor={Colors.textMuted} placeholder="+1234567890" />
              <Text style={styles.label}>{t("email")}</Text>
              <TextInput style={styles.input} value={supForm.email} onChangeText={(v) => setSupForm({ ...supForm, email: v })} placeholderTextColor={Colors.textMuted} placeholder="email@example.com" autoCapitalize="none" />
              <Pressable style={styles.saveBtn} onPress={() => {
                if (!supForm.name) return Alert.alert(t("error"), t("companyNameRequired"));
                createSupMutation.mutate({ name: supForm.name, contactName: supForm.contactName || undefined, phone: supForm.phone || undefined, email: supForm.email || undefined, paymentTerms: supForm.paymentTerms || undefined });
              }}>
                <LinearGradient colors={[Colors.accent, Colors.gradientMid]} style={styles.saveBtnGradient}>
                  <Text style={styles.saveBtnText}>{t("createSupplier")}</Text>
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
                <Pressable onPress={() => { setBranchForm({ name: "", address: "", phone: "", currency: "CHF", taxRate: "" }); setEditBranch(null); setShowBranchForm(true); }}>
                  <Ionicons name="add-circle" size={28} color={Colors.accent} />
                </Pressable>
                <Pressable onPress={() => setShowBranches(false)}><Ionicons name="close" size={24} color={Colors.text} /></Pressable>
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
                    <Text style={styles.empName}>{item.name}</Text>
                    <Text style={styles.empMeta}>{item.address || t("noAddress")} | {item.currency || "CHF"} | {t("taxRate")}: {item.taxRate || "0"}%</Text>
                    {item.phone ? <Text style={styles.empMeta}>{item.phone}</Text> : null}
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    {item.isMain && (
                      <View style={[styles.roleBadge, { backgroundColor: Colors.accent + "20" }]}>
                        <Text style={[styles.roleText, { color: Colors.accent }]}>{t("main")}</Text>
                      </View>
                    )}
                    <Pressable onPress={() => {
                      setEditBranch(item);
                      setBranchForm({ name: item.name, address: item.address || "", phone: item.phone || "", currency: item.currency || "CHF", taxRate: item.taxRate || "" });
                      setShowBranchForm(true);
                    }}>
                      <Ionicons name="pencil" size={18} color={Colors.info} />
                    </Pressable>
                    {!item.isMain && (
                      <Pressable onPress={() => {
                        Alert.alert(t("deleteBranch"), `${t("delete")} "${item.name}"?`, [
                          { text: t("cancel"), style: "cancel" },
                          { text: t("delete"), style: "destructive", onPress: () => deleteBranchMutation.mutate(item.id) },
                        ]);
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
              <Pressable onPress={() => { setShowBranchForm(false); setEditBranch(null); }}><Ionicons name="close" size={24} color={Colors.text} /></Pressable>
            </View>
            <ScrollView>
              <Text style={styles.label}>{t("name")} *</Text>
              <TextInput style={styles.input} value={branchForm.name} onChangeText={(v) => setBranchForm({ ...branchForm, name: v })} placeholderTextColor={Colors.textMuted} placeholder={t("branchName")} />
              <Text style={styles.label}>{t("address")}</Text>
              <TextInput style={styles.input} value={branchForm.address} onChangeText={(v) => setBranchForm({ ...branchForm, address: v })} placeholderTextColor={Colors.textMuted} placeholder={t("branchAddress")} />
              <Text style={styles.label}>{t("phone")}</Text>
              <TextInput style={styles.input} value={branchForm.phone} onChangeText={(v) => setBranchForm({ ...branchForm, phone: v })} keyboardType="phone-pad" placeholderTextColor={Colors.textMuted} placeholder="+1234567890" />
              <Text style={styles.label}>{t("currency")}</Text>
              <View style={styles.roleRow}>
                {["CHF", "USD", "EGP", "EUR", "GBP", "SAR"].map((c) => (
                  <Pressable key={c} style={[styles.roleChip, branchForm.currency === c && { backgroundColor: Colors.accent }]} onPress={() => setBranchForm({ ...branchForm, currency: c })}>
                    <Text style={[styles.roleChipText, branchForm.currency === c && { color: Colors.textDark }]}>{c}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.label}>{t("taxRatePercent")}</Text>
              <TextInput style={styles.input} value={branchForm.taxRate} onChangeText={(v) => setBranchForm({ ...branchForm, taxRate: v })} keyboardType="decimal-pad" placeholderTextColor={Colors.textMuted} placeholder="0.00" />
              <Pressable style={styles.saveBtn} onPress={() => {
                if (!branchForm.name) return Alert.alert(t("error"), t("branchNameRequired"));
                createBranchMutation.mutate({ name: branchForm.name, address: branchForm.address || undefined, phone: branchForm.phone || undefined, currency: branchForm.currency, taxRate: branchForm.taxRate || "0" });
              }}>
                <LinearGradient colors={[Colors.accent, Colors.gradientMid]} style={styles.saveBtnGradient}>
                  <Text style={styles.saveBtnText}>{editBranch ? t("updateBranch") : t("createBranch")}</Text>
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
                <Pressable onPress={() => { setExpenseForm({ description: "", amount: "", category: "other", date: new Date().toISOString().split("T")[0], notes: "" }); setShowExpenseForm(true); }}>
                  <Ionicons name="add-circle" size={28} color={Colors.accent} />
                </Pressable>
                <Pressable onPress={() => setShowExpenses(false)}><Ionicons name="close" size={24} color={Colors.text} /></Pressable>
              </View>
            </View>
            <FlatList
              data={expenses}
              keyExtractor={(item: any) => String(item.id)}
              scrollEnabled={!!expenses.length}
              ListEmptyComponent={<Text style={{ color: Colors.textMuted, textAlign: "center", paddingVertical: 20 }}>{t("noExpenses")}</Text>}
              renderItem={({ item }: { item: any }) => (
                <View style={styles.empCard}>
                  <View style={[styles.empAvatar, { backgroundColor: (expenseCategoryColors[item.categoryId] || expenseCategoryColors.other) + "30" }]}>
                    <Ionicons name="wallet" size={20} color={expenseCategoryColors[item.categoryId] || expenseCategoryColors.other} />
                  </View>
                  <View style={styles.empInfo}>
                    <Text style={styles.empName}>{item.description}</Text>
                    <Text style={styles.empMeta}>CHF {parseFloat(item.amount).toFixed(2)} | {new Date(item.date).toLocaleDateString()}</Text>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View style={[styles.roleBadge, { backgroundColor: (expenseCategoryColors[item.categoryId] || expenseCategoryColors.other) + "20" }]}>
                      <Text style={[styles.roleText, { color: expenseCategoryColors[item.categoryId] || expenseCategoryColors.other }]}>{item.categoryId || "other"}</Text>
                    </View>
                    <Pressable onPress={() => {
                      Alert.alert(t("deleteExpense"), `${t("delete")} "${item.description}"?`, [
                        { text: t("cancel"), style: "cancel" },
                        { text: t("delete"), style: "destructive", onPress: () => deleteExpenseMutation.mutate(item.id) },
                      ]);
                    }}>
                      <Ionicons name="trash" size={18} color={Colors.danger} />
                    </Pressable>
                  </View>
                </View>
              )}
            />
          </View>
        </View>
      </Modal>

      <Modal visible={showExpenseForm} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("addExpense")}</Text>
              <Pressable onPress={() => setShowExpenseForm(false)}><Ionicons name="close" size={24} color={Colors.text} /></Pressable>
            </View>
            <ScrollView>
              <Text style={styles.label}>{t("description")} *</Text>
              <TextInput style={styles.input} value={expenseForm.description} onChangeText={(v) => setExpenseForm({ ...expenseForm, description: v })} placeholderTextColor={Colors.textMuted} placeholder={t("expenseDescription")} />
              <Text style={styles.label}>{t("amount")} *</Text>
              <TextInput style={styles.input} value={expenseForm.amount} onChangeText={(v) => setExpenseForm({ ...expenseForm, amount: v })} keyboardType="decimal-pad" placeholderTextColor={Colors.textMuted} placeholder="0.00" />
              <Text style={styles.label}>{t("category")}</Text>
              <View style={styles.roleRow}>
                {expenseCategories.map((c) => (
                  <Pressable key={c} style={[styles.roleChip, expenseForm.category === c && { backgroundColor: expenseCategoryColors[c] }]} onPress={() => setExpenseForm({ ...expenseForm, category: c })}>
                    <Text style={[styles.roleChipText, expenseForm.category === c && { color: Colors.white }]}>{c}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.label}>{t("date")}</Text>
              <TextInput style={styles.input} value={expenseForm.date} onChangeText={(v) => setExpenseForm({ ...expenseForm, date: v })} placeholderTextColor={Colors.textMuted} placeholder="YYYY-MM-DD" />
              <Text style={styles.label}>{t("notes")}</Text>
              <TextInput style={[styles.input, { minHeight: 60 }]} value={expenseForm.notes} onChangeText={(v) => setExpenseForm({ ...expenseForm, notes: v })} placeholderTextColor={Colors.textMuted} placeholder={t("optionalNotes")} multiline />
              <Pressable style={styles.saveBtn} onPress={() => {
                if (!expenseForm.description || !expenseForm.amount) return Alert.alert(t("error"), t("descriptionAmountRequired"));
                createExpenseMutation.mutate({ branchId: 1, categoryId: expenseForm.category, description: expenseForm.description, amount: parseFloat(expenseForm.amount), date: expenseForm.date, notes: expenseForm.notes || undefined });
              }}>
                <LinearGradient colors={[Colors.accent, Colors.gradientMid]} style={styles.saveBtnGradient}>
                  <Text style={styles.saveBtnText}>{t("addExpense")}</Text>
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
              <Pressable onPress={() => setShowAttendance(false)}><Ionicons name="close" size={24} color={Colors.text} /></Pressable>
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
                  <Pressable style={[styles.clockBtn, { backgroundColor: Colors.danger + "20" }]} onPress={() => clockOutMutation.mutate({ id: activeShift.id, data: {} })}>
                    <Ionicons name="stop-circle" size={20} color={Colors.danger} />
                    <Text style={[styles.clockBtnText, { color: Colors.danger }]}>{t("clockOut")}</Text>
                  </Pressable>
                ) : (
                  <Pressable style={[styles.clockBtn, { backgroundColor: Colors.success + "20" }]} onPress={() => clockInMutation.mutate({ employeeId: employee.id, branchId: 1, startTime: new Date().toISOString(), status: "open" })}>
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
                      <Text style={styles.empName}>{emp?.name || `Employee #${item.employeeId}`}</Text>
                      <Text style={styles.empMeta}>
                        {new Date(item.startTime).toLocaleString()}
                        {item.endTime ? ` - ${new Date(item.endTime).toLocaleString()}` : ` ${t("shiftActiveLabel")}`}
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
                <Pressable onPress={() => { setPOForm({ supplierId: "", notes: "" }); setShowPOForm(true); }}>
                  <Ionicons name="add-circle" size={28} color={Colors.accent} />
                </Pressable>
                <Pressable onPress={() => setShowPurchaseOrders(false)}><Ionicons name="close" size={24} color={Colors.text} /></Pressable>
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
                      <Text style={styles.empName}>PO #{item.id}</Text>
                      <Text style={styles.empMeta}>{sup?.name || `Supplier #${item.supplierId}`} | ${parseFloat(item.totalAmount || "0").toFixed(2)}</Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <View style={[styles.roleBadge, { backgroundColor: statusColor + "20" }]}>
                        <Text style={[styles.roleText, { color: statusColor }]}>{item.status}</Text>
                      </View>
                      {item.status !== "received" && (
                        <Pressable onPress={() => receivePOMutation.mutate(item.id)}>
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
              <Pressable onPress={() => setShowPOForm(false)}><Ionicons name="close" size={24} color={Colors.text} /></Pressable>
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
              <Text style={styles.label}>{t("notes")}</Text>
              <TextInput style={[styles.input, { minHeight: 60 }]} value={poForm.notes} onChangeText={(v) => setPOForm({ ...poForm, notes: v })} placeholderTextColor={Colors.textMuted} placeholder={t("optionalNotes")} multiline />
              <Pressable style={styles.saveBtn} onPress={() => {
                if (!poForm.supplierId) return Alert.alert(t("error"), t("pleaseSelectSupplier"));
                createPOMutation.mutate({ branchId: 1, supplierId: parseInt(poForm.supplierId), status: "draft", notes: poForm.notes || undefined });
              }}>
                <LinearGradient colors={[Colors.accent, Colors.gradientMid]} style={styles.saveBtnGradient}>
                  <Text style={styles.saveBtnText}>{t("createOrder")}</Text>
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
              <Pressable onPress={() => setShowActivityLog(false)}><Ionicons name="close" size={24} color={Colors.text} /></Pressable>
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
                      <Text style={styles.empName}>{emp?.name || `Employee #${item.employeeId}`}</Text>
                      <Text style={styles.empMeta}>{item.details || item.action}</Text>
                      <Text style={[styles.empMeta, { fontSize: 10 }]}>{new Date(item.createdAt || item.timestamp).toLocaleString()}</Text>
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
                <Pressable onPress={() => { setReturnForm({ originalSaleId: "", reason: "", type: "refund" }); setShowReturnForm(true); }}>
                  <Ionicons name="add-circle" size={28} color={Colors.accent} />
                </Pressable>
                <Pressable onPress={() => setShowReturnsManager(false)}><Ionicons name="close" size={24} color={Colors.text} /></Pressable>
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
                    <Text style={styles.empName}>Return #{item.id} - Sale #{item.originalSaleId}</Text>
                    <Text style={styles.empMeta}>CHF {Number(item.totalAmount).toFixed(2)} | {item.reason || t("noReason")} | {new Date(item.createdAt).toLocaleDateString()}</Text>
                  </View>
                  <View style={[styles.roleBadge, { backgroundColor: (item.status === "completed" ? Colors.success : Colors.warning) + "20" }]}>
                    <Text style={[styles.roleText, { color: item.status === "completed" ? Colors.success : Colors.warning }]}>{item.status || "completed"}</Text>
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
              <Pressable onPress={() => setShowReturnForm(false)}><Ionicons name="close" size={24} color={Colors.text} /></Pressable>
            </View>
            <ScrollView>
              <Text style={styles.label}>{t("selectSaleToReturn")}</Text>
              <FlatList
                data={salesList.filter((s: any) => s.status === "completed").slice(0, 20)}
                keyExtractor={(item: any) => String(item.id)}
                scrollEnabled={false}
                renderItem={({ item }: { item: any }) => (
                  <Pressable
                    style={[styles.empCard, returnForm.originalSaleId === String(item.id) && { borderWidth: 2, borderColor: Colors.accent }]}
                    onPress={() => setReturnForm({ ...returnForm, originalSaleId: String(item.id) })}
                  >
                    <View style={styles.empInfo}>
                      <Text style={styles.empName}>{getDisplayNumber(item.receiptNumber)}</Text>
                      <Text style={styles.empMeta}>CHF {Number(item.totalAmount).toFixed(2)} | {new Date(item.createdAt).toLocaleDateString()} | {item.paymentMethod}</Text>
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
              <Pressable style={styles.saveBtn} onPress={() => {
                if (!returnForm.originalSaleId) return Alert.alert(t("error"), t("selectSaleError"));
                createReturnMutation.mutate(returnForm);
              }}>
                <LinearGradient colors={[Colors.warning, Colors.danger]} style={styles.saveBtnGradient}>
                  <Text style={styles.saveBtnText}>{t("processReturn")}</Text>
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
              <Pressable onPress={() => setShowCashDrawer(false)}><Ionicons name="close" size={24} color={Colors.text} /></Pressable>
            </View>
            <ScrollView>
              {/* Shift status info */}
              {activeShift ? (
                <View style={{ backgroundColor: Colors.success + "15", borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: Colors.success + "30" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.success }} />
                    <Text style={{ color: Colors.success, fontSize: 14, fontWeight: "700" }}>{t("activeShift")}</Text>
                  </View>
                  <Text style={{ color: Colors.textMuted, fontSize: 12 }}>{t("openingCash")}: CHF {Number(activeShift.openingCash || 0).toFixed(2)}</Text>
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

              <Text style={styles.label}>{t("amount")} *</Text>
              <TextInput style={styles.input} value={cashDrawerForm.amount} onChangeText={(v) => setCashDrawerForm({ ...cashDrawerForm, amount: v })} keyboardType="decimal-pad" placeholderTextColor={Colors.textMuted} placeholder="0.00" />

              <Text style={styles.label}>{t("reason")}</Text>
              <TextInput style={styles.input} value={cashDrawerForm.reason} onChangeText={(v) => setCashDrawerForm({ ...cashDrawerForm, reason: v })} placeholderTextColor={Colors.textMuted} placeholder={t("reasonForOperation")} />

              <Pressable style={styles.saveBtn} onPress={() => {
                if (!cashDrawerForm.amount) return Alert.alert(t("error"), t("amountRequired"));
                cashDrawerMutation.mutate({
                  shiftId: activeShift?.id || null,
                  employeeId: employee?.id,
                  tenantId: tenant?.id,
                  type: cashDrawerForm.type,
                  amount: cashDrawerForm.amount,
                  reason: cashDrawerForm.reason,
                });
              }}>
                <LinearGradient colors={[Colors.accent, Colors.gradientMid]} style={styles.saveBtnGradient}>
                  <Text style={styles.saveBtnText}>{t("recordOperation")}</Text>
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
                <Pressable onPress={() => { setWarehouseForm({ name: "", address: "", type: "main" }); setShowWarehouseForm(true); }}>
                  <Ionicons name="add-circle" size={28} color={Colors.accent} />
                </Pressable>
                <Pressable onPress={() => setShowWarehouseManager(false)}><Ionicons name="close" size={24} color={Colors.text} /></Pressable>
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
              <Pressable onPress={() => setShowWarehouseForm(false)}><Ionicons name="close" size={24} color={Colors.text} /></Pressable>
            </View>
            <ScrollView>
              <Text style={styles.label}>{t("name")} *</Text>
              <TextInput style={styles.input} value={warehouseForm.name} onChangeText={(v) => setWarehouseForm({ ...warehouseForm, name: v })} placeholderTextColor={Colors.textMuted} placeholder={t("warehouseName")} />
              <Text style={styles.label}>{t("address")}</Text>
              <TextInput style={styles.input} value={warehouseForm.address} onChangeText={(v) => setWarehouseForm({ ...warehouseForm, address: v })} placeholderTextColor={Colors.textMuted} placeholder={t("warehouseAddress")} />
              <Text style={styles.label}>{t("type")}</Text>
              <View style={styles.roleRow}>
                {["main", "secondary", "cold-storage"].map((wt) => (
                  <Pressable key={wt} style={[styles.roleChip, warehouseForm.type === wt && { backgroundColor: Colors.accent }]} onPress={() => setWarehouseForm({ ...warehouseForm, type: wt })}>
                    <Text style={[styles.roleChipText, warehouseForm.type === wt && { color: Colors.textDark }]}>{t(wt.replace("-", "") as any)}</Text>
                  </Pressable>
                ))}
              </View>
              <Pressable style={styles.saveBtn} onPress={() => {
                if (!warehouseForm.name) return Alert.alert(t("error"), t("warehouseNameRequired"));
                createWarehouseMutation.mutate({ name: warehouseForm.name, address: warehouseForm.address || undefined, branchId: employee?.branchId || 1 });
              }}>
                <LinearGradient colors={[Colors.accent, Colors.gradientMid]} style={styles.saveBtnGradient}>
                  <Text style={styles.saveBtnText}>{t("createWarehouse")}</Text>
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
                    <Pressable onPress={() => {
                      setEditBatch(null);
                      setBatchForm({ productId: productsList.length > 0 ? String(productsList[0].id) : "", batchNumber: `BATCH-${Date.now().toString(36).toUpperCase()}`, quantity: "50", expiryDate: "", costPrice: "", supplierId: "" });
                      setBatchView("form");
                    }}>
                      <Ionicons name="add-circle" size={28} color={Colors.accent} />
                    </Pressable>
                    <Pressable onPress={() => setShowBatchManager(false)}><Ionicons name="close" size={24} color={Colors.text} /></Pressable>
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
                      <View style={[styles.empCard, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                        <Pressable style={{ flexDirection: isRTL ? "row-reverse" : "row", flex: 1, alignItems: "center", gap: 12 }} onPress={() => {
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
                            <Text style={[styles.empName, rtlTextAlign]}>{prod?.name || `Product #${item.productId}`}</Text>
                            <Text style={[styles.empMeta, rtlTextAlign]}>
                              {t("batchNumber")}: {item.batchNumber} | {t("quantity")}: {item.quantity}
                              {item.expiryDate ? ` | ${t("expiryDate")}: ${new Date(item.expiryDate).toLocaleDateString()}` : ""}
                            </Text>
                            {item.costPrice && <Text style={[styles.empMeta, { color: Colors.accent }, rtlTextAlign]}>{t("cost")}: ${Number(item.costPrice).toFixed(2)}</Text>}
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
                          <Pressable onPress={() => {
                            if (Platform.OS === "web") {
                              if (confirm(`${t("deleteBatch")}?`)) {
                                deleteBatchMutation.mutate(item.id);
                              }
                            } else {
                              Alert.alert(t("delete"), `${t("deleteBatch")}?`, [
                                { text: t("cancel"), style: "cancel" },
                                { text: t("delete"), style: "destructive", onPress: () => deleteBatchMutation.mutate(item.id) },
                              ]);
                            }
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
                    <Pressable onPress={() => setBatchView("list")}><Ionicons name="arrow-back" size={24} color={Colors.text} /></Pressable>
                    <Text style={styles.modalTitle}>{editBatch ? t("editBatch") : t("newBatch")}</Text>
                  </View>
                  <Pressable onPress={() => { setBatchView("list"); }}><Ionicons name="close" size={24} color={Colors.text} /></Pressable>
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
                  <TextInput style={styles.formInput} placeholder="e.g. BATCH-001" placeholderTextColor={Colors.textMuted} value={batchForm.batchNumber} onChangeText={(v) => setBatchForm({ ...batchForm, batchNumber: v })} />

                  <Text style={styles.label}>{t("quantity")}</Text>
                  <TextInput style={styles.formInput} placeholder={t("quantity")} placeholderTextColor={Colors.textMuted} value={batchForm.quantity} onChangeText={(v) => setBatchForm({ ...batchForm, quantity: v })} keyboardType="number-pad" />

                  <Text style={styles.label}>{t("expiryDate")}</Text>
                  <TextInput style={styles.formInput} placeholder="YYYY-MM-DD" placeholderTextColor={Colors.textMuted} value={batchForm.expiryDate} onChangeText={(v) => setBatchForm({ ...batchForm, expiryDate: v })} />

                  <Text style={styles.label}>{t("costPrice")}</Text>
                  <TextInput style={styles.formInput} placeholder="0.00" placeholderTextColor={Colors.textMuted} value={batchForm.costPrice} onChangeText={(v) => setBatchForm({ ...batchForm, costPrice: v })} keyboardType="decimal-pad" />

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

                  <Pressable style={styles.saveBtn} onPress={() => {
                    if (!batchForm.productId || !batchForm.batchNumber) return Alert.alert(t("error"), t("productBatchRequired"));
                    const payload: any = {
                      productId: Number(batchForm.productId),
                      batchNumber: batchForm.batchNumber,
                      quantity: Number(batchForm.quantity) || 0,
                      branchId: employee?.branchId || 1,
                    };
                    if (batchForm.expiryDate) payload.expiryDate = new Date(batchForm.expiryDate).toISOString();
                    if (batchForm.costPrice) payload.costPrice = batchForm.costPrice;
                    if (batchForm.supplierId) payload.supplierId = Number(batchForm.supplierId);
                    if (editBatch) {
                      updateBatchMutation.mutate({ id: editBatch.id, data: payload }, { onSuccess: () => setBatchView("list") });
                    } else {
                      createBatchMutation.mutate(payload, { onSuccess: () => setBatchView("list") });
                    }
                  }}>
                    <LinearGradient colors={[Colors.gradientStart, Colors.accent]} style={styles.saveBtnGradient}>
                      <Ionicons name="checkmark" size={20} color={Colors.white} />
                      <Text style={styles.saveBtnText}>{editBatch ? t("updateBatch") : t("createBatch")}</Text>
                    </LinearGradient>
                  </Pressable>

                  {editBatch && (
                    <Pressable style={[styles.saveBtn, { marginTop: 8 }]} onPress={() => {
                      if (Platform.OS === "web") {
                        if (window.confirm(`${t("deleteBatch")}?`)) {
                          deleteBatchMutation.mutate(editBatch.id, { onSuccess: () => setBatchView("list") });
                        }
                      } else {
                        Alert.alert(t("deleteBatch"), t("areYouSure"), [
                          { text: t("cancel"), style: "cancel" },
                          { text: t("delete"), style: "destructive", onPress: () => deleteBatchMutation.mutate(editBatch.id, { onSuccess: () => setBatchView("list") }) },
                        ]);
                      }
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
              <Pressable onPress={() => setShowPrinterSettings(false)}><Ionicons name="close" size={24} color={Colors.text} /></Pressable>
            </View>
            <ScrollView>
              <View style={[styles.empCard, { marginBottom: 16 }]}>
                <View style={[styles.empAvatar, { backgroundColor: Colors.danger + "30" }]}>
                  <Ionicons name="print" size={20} color={Colors.danger} />
                </View>
                <View style={styles.empInfo}>
                  <Text style={styles.empName}>{t("printerStatus")}</Text>
                  <Text style={[styles.empMeta, { color: Colors.danger }]}>{t("notConnected")}</Text>
                </View>
              </View>

              <Text style={styles.label}>{t("paperSize")}</Text>
              <View style={styles.roleRow}>
                {["58mm", "80mm"].map((s) => (
                  <Pressable key={s} style={[styles.roleChip, printerPaperSize === s && { backgroundColor: Colors.accent }]} onPress={() => setPrinterPaperSize(s)}>
                    <Text style={[styles.roleChipText, printerPaperSize === s && { color: Colors.textDark }]}>{s}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.label}>{t("autoPrintReceipts")}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: Colors.surfaceLight, borderRadius: 12, padding: 14, marginTop: 4 }}>
                <Text style={{ color: Colors.text, fontSize: 14 }}>{t("printAfterEverySale")}</Text>
                <Switch value={printerAutoPrint} onValueChange={setPrinterAutoPrint} trackColor={{ false: Colors.inputBorder, true: Colors.accent + "60" }} thumbColor={printerAutoPrint ? Colors.accent : Colors.textMuted} />
              </View>

              <Pressable style={styles.saveBtn} onPress={() => {
                const sampleReceipt = `================================\n        SAMPLE RECEIPT\n================================\nDate: ${new Date().toLocaleString()}\nReceipt #: TEST-001\n--------------------------------\nItem 1        x2  CHF 10.00\nItem 2        x1   CHF 5.50\n--------------------------------\nSubtotal:          CHF 15.50\nTax (10%):          CHF 1.55\n--------------------------------\nTOTAL:             CHF 17.05\n================================\n      Thank you!\n================================`;
                if (Platform.OS === "web") {
                  const printWindow = window.open("", "_blank", "width=300,height=600");
                  if (printWindow) {
                    printWindow.document.write(`<pre style="font-family:monospace;font-size:12px;">${sampleReceipt}</pre>`);
                    printWindow.document.close();
                    printWindow.print();
                  }
                } else {
                  Alert.alert(t("testPrint"), sampleReceipt);
                }
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
              <Pressable onPress={() => setShowLanguagePicker(false)}><Ionicons name="close" size={24} color={Colors.text} /></Pressable>
            </View>
            <Pressable
              testID="lang-en"
              style={[styles.empCard, language === "en" && { borderWidth: 2, borderColor: Colors.accent }]}
              onPress={() => { setLanguage("en"); setShowLanguagePicker(false); apiRequest("PUT", "/api/system-language", { language: "en" }).catch(() => {}); }}
            >
              <View style={[styles.empAvatar, { backgroundColor: Colors.info + "30" }]}>
                <Text style={{ fontSize: 20 }}>🇺🇸</Text>
              </View>
              <View style={styles.empInfo}>
                <Text style={styles.empName}>English</Text>
                <Text style={styles.empMeta}>Left to Right (LTR)</Text>
              </View>
              {language === "en" && <Ionicons name="checkmark-circle" size={22} color={Colors.accent} />}
            </Pressable>
            <Pressable
              testID="lang-ar"
              style={[styles.empCard, language === "ar" && { borderWidth: 2, borderColor: Colors.accent }]}
              onPress={() => { setLanguage("ar"); setShowLanguagePicker(false); apiRequest("PUT", "/api/system-language", { language: "ar" }).catch(() => {}); }}
            >
              <View style={[styles.empAvatar, { backgroundColor: Colors.success + "30" }]}>
                <Text style={{ fontSize: 20 }}>🇸🇦</Text>
              </View>
              <View style={styles.empInfo}>
                <Text style={styles.empName}>العربية</Text>
                <Text style={styles.empMeta}>Right to Left (RTL)</Text>
              </View>
              {language === "ar" && <Ionicons name="checkmark-circle" size={22} color={Colors.accent} />}
            </Pressable>
            <Pressable
              testID="lang-de"
              style={[styles.empCard, language === "de" && { borderWidth: 2, borderColor: Colors.accent }]}
              onPress={() => { setLanguage("de"); setShowLanguagePicker(false); apiRequest("PUT", "/api/system-language", { language: "de" }).catch(() => {}); }}
            >
              <View style={[styles.empAvatar, { backgroundColor: Colors.warning + "30" }]}>
                <Text style={{ fontSize: 20 }}>🇩🇪</Text>
              </View>
              <View style={styles.empInfo}>
                <Text style={styles.empName}>Deutsch</Text>
                <Text style={styles.empMeta}>Left to Right (LTR)</Text>
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
              <Pressable onPress={() => setShowShiftMonitor(false)}><Ionicons name="close" size={24} color={Colors.text} /></Pressable>
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
                      <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", marginBottom: 8 }}>
                        <View style={[styles.empAvatar, { backgroundColor: (roleColors[emp?.role || "cashier"] || Colors.info) + "30" }]}>
                          <Text style={styles.empInitial}>{emp?.name?.charAt(0) || "?"}</Text>
                        </View>
                        <View style={[styles.empInfo, isRTL && { alignItems: "flex-end" }]}>
                          <Text style={styles.empName}>{emp?.name || `#${item.employeeId}`}</Text>
                          <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 6, marginTop: 2 }}>
                            <View style={[styles.roleBadge, { backgroundColor: (roleColors[emp?.role || "cashier"] || Colors.info) + "20", marginTop: 0 }]}>
                              <Text style={[styles.roleText, { color: roleColors[emp?.role || "cashier"] || Colors.info }]}>{emp?.role || "cashier"}</Text>
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
                      <View style={{ flexDirection: isRTL ? "row-reverse" : "row", justifyContent: "space-between", marginBottom: 6 }}>
                        <Text style={smStyles.shiftMeta}>{t("started")}: {new Date(item.startTime).toLocaleTimeString()}</Text>
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
                      <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", marginBottom: 6 }}>
                        <View style={[styles.empAvatar, { backgroundColor: Colors.info + "30" }]}>
                          <Text style={styles.empInitial}>{emp?.name?.charAt(0) || "?"}</Text>
                        </View>
                        <View style={[styles.empInfo, isRTL && { alignItems: "flex-end" }]}>
                          <Text style={styles.empName}>{emp?.name || `#${item.employeeId}`}</Text>
                          <Text style={styles.empMeta}>{formatDuration(item.startTime, item.endTime)}</Text>
                        </View>
                      </View>
                      <View style={{ flexDirection: isRTL ? "row-reverse" : "row", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                        <View style={smStyles.statChip}>
                          <Ionicons name="time-outline" size={12} color={Colors.info} />
                          <Text style={smStyles.statChipText}>{new Date(item.startTime).toLocaleString()} - {new Date(item.endTime).toLocaleTimeString()}</Text>
                        </View>
                        <View style={smStyles.statChip}>
                          <Ionicons name="cart-outline" size={12} color={Colors.accent} />
                          <Text style={smStyles.statChipText}>CHF {Number(item.totalSales || 0).toFixed(2)}</Text>
                        </View>
                        <View style={smStyles.statChip}>
                          <Ionicons name="receipt-outline" size={12} color={Colors.warning} />
                          <Text style={smStyles.statChipText}>{item.totalTransactions || 0} {t("txns")}</Text>
                        </View>
                        {item.openingCash != null && (
                          <View style={smStyles.statChip}>
                            <Ionicons name="cash-outline" size={12} color={Colors.success} />
                            <Text style={smStyles.statChipText}>CHF {Number(item.openingCash || 0).toFixed(2)} → CHF {Number(item.closingCash || 0).toFixed(2)}</Text>
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
                <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 12, marginTop: 8 }}>
                  <TextInput
                    style={[styles.formInput, { flex: 1 }]}
                    value={defaultShiftDuration}
                    onChangeText={setDefaultShiftDuration}
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
                    <Pressable style={styles.saveBtn} onPress={() => {
                      const durationVal = parseFloat(defaultShiftDuration);
                      if (isNaN(durationVal) || durationVal <= 0) return Alert.alert(t("error"), t("invalidDuration"));
                      allActiveShifts.forEach((s: any) => {
                        updateShiftMutation.mutate({ id: s.id, data: { expectedDurationHours: String(durationVal) } });
                      });
                    }}>
                      <LinearGradient colors={[Colors.accent, Colors.gradientMid]} style={styles.saveBtnGradient}>
                        <Ionicons name="refresh" size={18} color={Colors.white} />
                        <Text style={styles.saveBtnText}>{t("applyToAllActive")}</Text>
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
                  <Pressable onPress={() => markAllNotificationsReadMutation.mutate()} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Ionicons name="checkmark-done" size={20} color={Colors.accent} />
                    <Text style={{ color: Colors.accent, fontSize: 12, fontWeight: "600" }}>{t("markAllRead")}</Text>
                  </Pressable>
                )}
                <Pressable onPress={() => setShowNotifications(false)}><Ionicons name="close" size={24} color={Colors.text} /></Pressable>
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
                      <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", justifyContent: "space-between" }}>
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
            <View style={[styles.modalHeader, isRTL && { flexDirection: "row-reverse" }]}>
              <Text style={[styles.modalTitle, rtlTextAlign]}>{t("storeSettings")}</Text>
              <Pressable onPress={() => setShowStoreSettings(false)}><Ionicons name="close" size={24} color={Colors.text} /></Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.label, rtlTextAlign]}>{t("storeLogo")}</Text>
              <Pressable onPress={pickStoreLogo} style={{ alignItems: "center", marginBottom: 16, padding: 20, borderRadius: 12, borderWidth: 1, borderStyle: "dashed", borderColor: Colors.cardBorder, backgroundColor: Colors.surfaceLight }}>
                {storeLogo ? (
                  <View style={{ alignItems: "center" }}>
                    <Image source={{ uri: storeLogo.startsWith("http") || storeLogo.startsWith("file://") || storeLogo.startsWith("data:") ? storeLogo : `${getApiUrl().replace(/\/$/, "")}${storeLogo}` }} style={{ width: 80, height: 80, borderRadius: 12 }} />
                    <Text style={{ color: Colors.accent, fontSize: 13, marginTop: 8 }}>{t("changeImage")}</Text>
                  </View>
                ) : (
                  <View style={{ alignItems: "center" }}>
                    <Ionicons name="image-outline" size={32} color={Colors.textMuted} />
                    <Text style={{ color: Colors.textMuted, fontSize: 13, marginTop: 4 }}>{t("tapToAddImage")}</Text>
                  </View>
                )}
              </Pressable>

              <Text style={[styles.label, rtlTextAlign]}>{t("storeName")}</Text>
              <TextInput style={[styles.input, rtlTextAlign]} value={storeForm.name} onChangeText={(v) => setStoreForm({ ...storeForm, name: v })} placeholderTextColor={Colors.textMuted} placeholder={t("storeName")} />

              <Text style={[styles.label, rtlTextAlign]}>{t("storeAddress")}</Text>
              <TextInput style={[styles.input, rtlTextAlign]} value={storeForm.address} onChangeText={(v) => setStoreForm({ ...storeForm, address: v })} placeholderTextColor={Colors.textMuted} placeholder={t("storeAddress")} />

              <Text style={[styles.label, rtlTextAlign]}>{t("storePhone")}</Text>
              <TextInput style={[styles.input, rtlTextAlign]} value={storeForm.phone} onChangeText={(v) => setStoreForm({ ...storeForm, phone: v })} placeholderTextColor={Colors.textMuted} placeholder={t("storePhone")} keyboardType="phone-pad" />

              <Text style={[styles.label, rtlTextAlign]}>{t("storeEmail")}</Text>
              <TextInput style={[styles.input, rtlTextAlign]} value={storeForm.email} onChangeText={(v) => setStoreForm({ ...storeForm, email: v })} placeholderTextColor={Colors.textMuted} placeholder={t("storeEmail")} keyboardType="email-address" />

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

              <Text style={[styles.label, rtlTextAlign]}>Tax Rate (%)</Text>
              <TextInput
                style={[styles.input, rtlTextAlign]}
                value={storeForm.taxRate}
                onChangeText={(v) => setStoreForm({ ...storeForm, taxRate: v })}
                placeholderTextColor={Colors.textMuted}
                placeholder="e.g. 7.7"
                keyboardType="decimal-pad"
              />

              <Text style={[styles.label, rtlTextAlign]}>Delivery Fee (CHF)</Text>
              <TextInput
                style={[styles.input, rtlTextAlign]}
                value={storeForm.deliveryFee}
                onChangeText={(v) => setStoreForm({ ...storeForm, deliveryFee: v })}
                placeholderTextColor={Colors.textMuted}
                placeholder="e.g. 5.00"
                keyboardType="decimal-pad"
              />

              <Text style={[styles.label, rtlTextAlign]}>
                {isRTL ? "رقم واتساب الأدمن (للإشعارات)" : "WhatsApp Admin Phone (Notifications)"}
              </Text>
              <TextInput
                style={[styles.input, rtlTextAlign]}
                value={storeForm.whatsappAdminPhone}
                onChangeText={(v) => setStoreForm({ ...storeForm, whatsappAdminPhone: v })}
                placeholderTextColor={Colors.textMuted}
                placeholder={isRTL ? "مثال: 201234567890" : "e.g. 201234567890"}
                keyboardType="phone-pad"
              />

              <Pressable style={{ marginTop: 16 }} onPress={handleSaveStoreSettings}>
                <LinearGradient colors={[Colors.accent, Colors.gradientMid]} style={{ paddingVertical: 14, borderRadius: 12, alignItems: "center" }}>
                  <Text style={{ color: Colors.white, fontSize: 16, fontWeight: "700" }}>{storeLogoUploading ? t("imageUploading") : t("save")}</Text>
                </LinearGradient>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showPaymentGateway} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.modalHeader, isRTL && { flexDirection: "row-reverse" }]}>
              <Text style={styles.modalTitle}>{t("paymentGateways")}</Text>
              <Pressable onPress={() => setShowPaymentGateway(false)}>
                <Ionicons name="close" size={24} color={Colors.textMuted} />
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={pgStyles.section}>
                <View style={[pgStyles.gatewayHeader, isRTL && { flexDirection: "row-reverse" }]}>
                  <View style={[pgStyles.gatewayIcon, { backgroundColor: "#635BFF20" }]}>
                    <Ionicons name="card" size={24} color="#635BFF" />
                  </View>
                  <View style={[pgStyles.gatewayInfo, isRTL && { alignItems: "flex-end" }]}>
                    <Text style={pgStyles.gatewayName}>Stripe</Text>
                    <View style={[pgStyles.statusRow, isRTL && { flexDirection: "row-reverse" }]}>
                      <View style={[pgStyles.statusDot, { backgroundColor: pgConfig?.stripe?.status === "connected" ? Colors.success : Colors.danger }]} />
                      <Text style={[pgStyles.statusText, { color: pgConfig?.stripe?.status === "connected" ? Colors.success : Colors.danger }]}>
                        {pgConfig?.stripe?.status === "connected" ? t("connected") : t("disconnected")}
                      </Text>
                      {pgConfig?.stripe?.mode && (
                        <View style={[pgStyles.modeBadge, pgConfig.stripe.mode === "live" && { backgroundColor: Colors.success + "20" }]}>
                          <Text style={[pgStyles.modeText, pgConfig.stripe.mode === "live" && { color: Colors.success }]}>
                            {pgConfig.stripe.mode === "live" ? t("liveMode") : t("testMode")}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>

                <View style={pgStyles.configGrid}>
                  <View style={pgStyles.configItem}>
                    <Text style={[pgStyles.configLabel, isRTL && { textAlign: "right" }]}>{t("currency")}</Text>
                    <View style={[pgStyles.configValueRow, isRTL && { flexDirection: "row-reverse" }]}>
                      <Ionicons name="cash-outline" size={16} color={Colors.accent} />
                      <Text style={pgStyles.configValue}>{(pgConfig?.stripe?.currency || "chf").toUpperCase()}</Text>
                    </View>
                  </View>
                  <View style={pgStyles.configItem}>
                    <Text style={[pgStyles.configLabel, isRTL && { textAlign: "right" }]}>{t("autoCapture")}</Text>
                    <Switch
                      value={pgConfig?.stripe?.autoCapture !== false}
                      onValueChange={async (val) => {
                        await apiRequest("PUT", "/api/payment-gateway/config", { stripe: { ...pgConfig?.stripe, autoCapture: val } });
                        refetchPgConfig();
                      }}
                      trackColor={{ false: Colors.inputBg, true: Colors.accent + "60" }}
                      thumbColor={pgConfig?.stripe?.autoCapture !== false ? Colors.accent : Colors.textMuted}
                    />
                  </View>
                </View>

                <Pressable
                  style={[pgStyles.testBtn, pgTesting && { opacity: 0.6 }]}
                  onPress={async () => {
                    setPgTesting(true);
                    setPgTestResult(null);
                    try {
                      const res = await apiRequest("POST", "/api/payment-gateway/test-stripe");
                      const data = await res.json();
                      setPgTestResult(data);
                    } catch (e: any) {
                      setPgTestResult({ success: false, error: e.message });
                    }
                    setPgTesting(false);
                  }}
                  disabled={pgTesting}
                >
                  <Ionicons name={pgTesting ? "sync" : "flash"} size={18} color={Colors.white} />
                  <Text style={pgStyles.testBtnText}>{pgTesting ? t("testing") : t("testConnection")}</Text>
                </Pressable>

                {pgTestResult && (
                  <View style={[pgStyles.testResult, { borderColor: pgTestResult.success ? Colors.success + "40" : Colors.danger + "40", backgroundColor: pgTestResult.success ? Colors.success + "10" : Colors.danger + "10" }]}>
                    <View style={[pgStyles.testResultHeader, isRTL && { flexDirection: "row-reverse" }]}>
                      <Ionicons name={pgTestResult.success ? "checkmark-circle" : "close-circle"} size={20} color={pgTestResult.success ? Colors.success : Colors.danger} />
                      <Text style={[pgStyles.testResultText, { color: pgTestResult.success ? Colors.success : Colors.danger }]}>
                        {pgTestResult.success ? t("connectionSuccess") : t("connectionFailed")}
                      </Text>
                    </View>
                    {pgTestResult.success && pgTestResult.mode && (
                      <Text style={pgStyles.testResultDetail}>
                        {t("mode")}: {pgTestResult.mode === "live" ? t("liveMode") : t("testMode")} | {t("currency")}: {(pgTestResult.currency || "chf").toUpperCase()}
                      </Text>
                    )}
                    {pgTestResult.error && <Text style={[pgStyles.testResultDetail, { color: Colors.danger }]}>{pgTestResult.error}</Text>}
                  </View>
                )}
              </View>

              <View style={pgStyles.divider} />

              <Text style={[pgStyles.methodsTitle, isRTL && { textAlign: "right" }]}>{t("enabledPaymentMethods")}</Text>
              {[
                { key: "cash", icon: "cash", label: t("cash"), color: Colors.success },
                { key: "card", icon: "card", label: t("card"), color: "#635BFF" },
                { key: "nfc", icon: "wifi", label: t("nfcPay"), color: Colors.accent },
                { key: "mobile", icon: "phone-portrait", label: t("mobile"), color: Colors.info },
              ].map((method) => (
                <View key={method.key} style={[pgStyles.methodRow, isRTL && { flexDirection: "row-reverse" }]}>
                  <View style={[pgStyles.methodIconWrap, { backgroundColor: method.color + "20" }]}>
                    <Ionicons name={method.icon as any} size={20} color={method.color} />
                  </View>
                  <Text style={[pgStyles.methodLabel, isRTL && { textAlign: "right" }]}>{method.label}</Text>
                  <Switch
                    value={pgConfig?.enabledMethods?.includes(method.key) !== false}
                    onValueChange={async (val) => {
                      const current = pgConfig?.enabledMethods || ["cash", "card", "mobile", "nfc"];
                      const updated = val ? [...current, method.key] : current.filter((m: string) => m !== method.key);
                      await apiRequest("PUT", "/api/payment-gateway/config", { enabledMethods: updated });
                      refetchPgConfig();
                    }}
                    trackColor={{ false: Colors.inputBg, true: method.color + "60" }}
                    thumbColor={pgConfig?.enabledMethods?.includes(method.key) !== false ? method.color : Colors.textMuted}
                  />
                </View>
              ))}

              <View style={pgStyles.divider} />

              <View style={pgStyles.section}>
                <Text style={[pgStyles.methodsTitle, isRTL && { textAlign: "right" }]}>{t("nfcSettings")}</Text>
                <View style={[pgStyles.infoRow, isRTL && { flexDirection: "row-reverse" }]}>
                  <View style={[pgStyles.gatewayIcon, { backgroundColor: Colors.accent + "20" }]}>
                    <Ionicons name="wifi" size={20} color={Colors.accent} style={{ transform: [{ rotate: "90deg" }] }} />
                  </View>
                  <View style={[pgStyles.gatewayInfo, isRTL && { alignItems: "flex-end" }]}>
                    <Text style={pgStyles.configLabel}>{t("nfcProvider")}</Text>
                    <Text style={pgStyles.configValue}>Stripe Tap to Pay</Text>
                  </View>
                </View>
                <View style={pgStyles.infoNote}>
                  <Ionicons name="information-circle" size={16} color={Colors.info} />
                  <Text style={[pgStyles.infoNoteText, isRTL && { textAlign: "right" }]}>{t("nfcInfo")}</Text>
                </View>
              </View>

              <View style={pgStyles.divider} />

              <View style={pgStyles.section}>
                <Text style={[pgStyles.methodsTitle, isRTL && { textAlign: "right" }]}>{t("mobilePaySettings")}</Text>
                {[
                  { key: "twint", icon: "phone-portrait", label: "TWINT" },
                  { key: "apple_pay", icon: "logo-apple", label: "Apple Pay" },
                  { key: "google_pay", icon: "logo-google", label: "Google Pay" },
                ].map((mp) => (
                  <View key={mp.key} style={[pgStyles.methodRow, isRTL && { flexDirection: "row-reverse" }]}>
                    <View style={[pgStyles.methodIconWrap, { backgroundColor: Colors.textMuted + "20" }]}>
                      <Ionicons name={mp.icon as any} size={20} color={Colors.text} />
                    </View>
                    <Text style={[pgStyles.methodLabel, isRTL && { textAlign: "right" }]}>{mp.label}</Text>
                    <Switch
                      value={pgConfig?.mobile?.providers?.includes(mp.key) !== false}
                      onValueChange={async (val) => {
                        const current = pgConfig?.mobile?.providers || ["apple_pay", "google_pay"];
                        const updated = val ? [...current, mp.key] : current.filter((p: string) => p !== mp.key);
                        await apiRequest("PUT", "/api/payment-gateway/config", { mobile: { ...pgConfig?.mobile, providers: updated } });
                        refetchPgConfig();
                      }}
                      trackColor={{ false: Colors.inputBg, true: Colors.accent + "60" }}
                      thumbColor={Colors.accent}
                    />
                  </View>
                ))}
              </View>

            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Bulk Import Modal */}
      <Modal visible={showBulkImport} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.modalHeader, isRTL && { flexDirection: "row-reverse" }]}>
              <Text style={[styles.modalTitle, rtlTextAlign]}>{t("bulkImport")}</Text>
              <Pressable onPress={() => setShowBulkImport(false)}><Ionicons name="close" size={24} color={Colors.text} /></Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Tab Selector */}
              <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 8, marginBottom: 20 }}>
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
                <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
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
                style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: Colors.surfaceLight, borderRadius: 12, paddingVertical: 12, marginBottom: 8, borderWidth: 1, borderColor: Colors.accent + "40" }}
                onPress={() => {
                  const templateUrl = `${getApiUrl()}/api/${importType}/template`;
                  if (Platform.OS === "web") {
                    window.open(templateUrl, "_blank");
                  } else {
                    Alert.alert(t("downloadTemplate"), templateUrl);
                  }
                }}
              >
                <Ionicons name="download-outline" size={20} color={Colors.accent} />
                <Text style={{ color: Colors.accent, fontSize: 14, fontWeight: "600" }}>{t("downloadTemplate")}</Text>
              </Pressable>

              {/* Export existing data (customers only) */}
              {importType === "customers" && (
                <Pressable
                  style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: Colors.success + "15", borderRadius: 12, paddingVertical: 12, marginBottom: 16, borderWidth: 1, borderColor: Colors.success + "40" }}
                  onPress={() => {
                    const exportUrl = `${getApiUrl()}/api/customers/export${tenant?.id ? `?tenantId=${tenant.id}` : ""}`;
                    if (Platform.OS === "web") {
                      window.open(exportUrl, "_blank");
                    } else {
                      Alert.alert(t("exportCustomersExcel"), exportUrl);
                    }
                  }}
                >
                  <Ionicons name="share-outline" size={20} color={Colors.success} />
                  <Text style={{ color: Colors.success, fontSize: 14, fontWeight: "600" }}>{t("exportCustomersExcel" as any)}</Text>
                </Pressable>
              )}

              {/* Upload Button */}
              <Pressable
                style={{ borderWidth: 2, borderStyle: "dashed", borderColor: importLoading ? Colors.textMuted : Colors.accent, borderRadius: 16, padding: 30, alignItems: "center", marginBottom: 16, backgroundColor: Colors.surfaceLight }}
                onPress={async () => {
                  try {
                    setImportLoading(true);
                    setImportResult(null);

                    if (Platform.OS === "web") {
                      // Web: use file input
                      const input = document.createElement("input");
                      input.type = "file";
                      input.accept = ".xlsx,.xls,.csv";
                      input.onchange = async (e: any) => {
                        const file = e.target.files[0];
                        if (!file) { setImportLoading(false); return; }
                        const reader = new FileReader();
                        reader.onload = async (ev) => {
                          try {
                            const base64 = (ev.target?.result as string).split(",")[1];
                            const endpoint = importType === "products" ? "/api/products/import" : "/api/customers/import";
                            const body: any = { fileBase64: base64, tenantId: tenant?.id || 1 };
                            if (importType === "products") body.branchId = employee?.branchId || 1;
                            const res = await apiRequest("POST", endpoint, body);
                            const data = await res.json();
                            setImportResult(data);
                            if (data.success) {
                              qc.invalidateQueries({ queryKey: importType === "products" ? ["/api/products"] : ["/api/customers"] });
                            }
                          } catch (err: any) {
                            setImportResult({ error: err.message });
                          } finally {
                            setImportLoading(false);
                          }
                        };
                        reader.readAsDataURL(file);
                      };
                      input.click();
                    } else {
                      // Native: use document picker
                      const result = await DocumentPicker.getDocumentAsync({
                        type: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.ms-excel"],
                        copyToCacheDirectory: true,
                      });
                      if (!result.canceled && result.assets[0]) {
                        const fileUri = result.assets[0].uri;
                        const response = await fetch(fileUri);
                        const blob = await response.blob();
                        const reader = new FileReader();
                        reader.onloadend = async () => {
                          try {
                            const base64 = (reader.result as string).split(",")[1];
                            const endpoint = importType === "products" ? "/api/products/import" : "/api/customers/import";
                            const body: any = { fileBase64: base64, tenantId: tenant?.id || 1 };
                            if (importType === "products") body.branchId = employee?.branchId || 1;
                            const res = await apiRequest("POST", endpoint, body);
                            const data = await res.json();
                            setImportResult(data);
                            if (data.success) {
                              qc.invalidateQueries({ queryKey: importType === "products" ? ["/api/products"] : ["/api/customers"] });
                            }
                          } catch (err: any) {
                            setImportResult({ error: err.message });
                          } finally {
                            setImportLoading(false);
                          }
                        };
                        reader.readAsDataURL(blob);
                      } else {
                        setImportLoading(false);
                      }
                    }
                  } catch (err: any) {
                    setImportResult({ error: err.message });
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
                  <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 8 }}>
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

      {/* Caller ID Test Modal */}
      <Modal visible={showCallerIdTest} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.modalHeader, isRTL && { flexDirection: "row-reverse" }]}>
              <Text style={[styles.modalTitle, rtlTextAlign]}>{t("callerID")}</Text>
              <Pressable onPress={() => setShowCallerIdTest(false)}><Ionicons name="close" size={24} color={Colors.text} /></Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Status Indicator */}
              <View style={{ alignItems: "center", marginBottom: 24 }}>
                <View style={{
                  width: 80, height: 80, borderRadius: 40,
                  backgroundColor: callerIdStatus === "done" ? Colors.success + "20" : "#EC4899" + "20",
                  justifyContent: "center", alignItems: "center", marginBottom: 12
                }}>
                  <Ionicons
                    name={callerIdStatus === "done" ? "checkmark-circle" : "call"}
                    size={40}
                    color={callerIdStatus === "done" ? Colors.success : "#EC4899"}
                  />
                </View>
                <Text style={{ color: Colors.text, fontSize: 18, fontWeight: "700" }}>
                  {callerIdStatus === "done" ? t("callSimulated") : t("simulateCall")}
                </Text>
                <Text style={{ color: Colors.textMuted, fontSize: 13, marginTop: 4, textAlign: "center" }}>
                  {t("callerIdDescription")}
                </Text>
              </View>

              {/* Phone Number Input */}
              <Text style={[styles.label, rtlTextAlign]}>{t("phoneNumber")}</Text>
              <TextInput
                style={[styles.input, { fontSize: 18, textAlign: "center", fontWeight: "700" }]}
                value={testPhoneNumber}
                onChangeText={setTestPhoneNumber}
                placeholder="0551234567"
                placeholderTextColor={Colors.textMuted}
                keyboardType="phone-pad"
              />


              {/* Simulate Button */}
              <Pressable
                style={{ borderRadius: 14, overflow: "hidden", marginTop: 24, marginBottom: 8 }}
                onPress={async () => {
                  try {
                    setCallerIdStatus("testing");
                    await apiRequest("POST", "/api/caller-id/simulate", {
                      phoneNumber: testPhoneNumber,
                      slot: 1,
                      tenantId: tenant?.id
                    });
                    setCallerIdStatus("done");
                    setTimeout(() => setCallerIdStatus("idle"), 3000);
                  } catch (err: any) {
                    Alert.alert(t("error"), err.message);
                    setCallerIdStatus("idle");
                  }
                }}
                disabled={callerIdStatus === "testing"}
              >
                <LinearGradient colors={["#EC4899", "#9333EA"]} style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", justifyContent: "center", paddingVertical: 16, gap: 10 }}>
                  <Ionicons name={callerIdStatus === "testing" ? "hourglass" : "call"} size={22} color={Colors.white} />
                  <Text style={{ color: Colors.white, fontSize: 16, fontWeight: "700" }}>
                    {callerIdStatus === "testing" ? t("simulating") : t("simulateIncomingCall")}
                  </Text>
                </LinearGradient>
              </Pressable>

              {/* Multi-call test: simulate all 4 slots */}
              <Pressable
                style={{ borderRadius: 14, overflow: "hidden", marginBottom: 16 }}
                onPress={async () => {
                  const testNumbers = ["0551234567", "0509876543", "0521112233", "+41791234567"];
                  for (let i = 0; i < 4; i++) {
                    try {
                      await apiRequest("POST", "/api/caller-id/simulate", {
                        phoneNumber: testNumbers[i],
                        slot: i + 1,
                        tenantId: tenant?.id
                      });
                      await new Promise((r) => setTimeout(r, 300));
                    } catch { }
                  }
                  setCallerIdStatus("done");
                  setTimeout(() => setCallerIdStatus("idle"), 3000);
                }}
              >
                <LinearGradient colors={["#6366F1", "#8B5CF6"]} style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", justifyContent: "center", paddingVertical: 12, gap: 8 }}>
                  <Ionicons name="call-outline" size={18} color={Colors.white} />
                  <Text style={{ color: Colors.white, fontSize: 14, fontWeight: "700" }}>
                    {t("multipleIncomingCalls" as any)} (4 {t("callSlot" as any)}s)
                  </Text>
                </LinearGradient>
              </Pressable>

              {/* Info Note */}
              <View style={{ flexDirection: isRTL ? "row-reverse" : "row", backgroundColor: Colors.info + "10", borderRadius: 12, padding: 12, gap: 8, alignItems: "flex-start" }}>
                <Ionicons name="information-circle" size={18} color={Colors.info} />
                <Text style={{ color: Colors.textSecondary, fontSize: 12, flex: 1 }}>
                  {t("callerIdNote")}
                </Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Vehicle Management Modal ──────────────────────────────────── */}
      <Modal visible={showVehicles} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.modalHeader, isRTL && { flexDirection: "row-reverse" }]}>
              <Text style={styles.modalTitle}>{t("vehicleManagement")}</Text>
              <Pressable
                onPress={() => setShowVehicles(false)}
                style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.danger + "20", alignItems: "center", justifyContent: "center" }}
              >
                <Ionicons name="close" size={20} color={Colors.danger} />
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
                  <View key={v.id} style={[styles.empCard, isRTL && { flexDirection: "row-reverse" }]}>
                    <View style={[styles.empAvatar, { backgroundColor: "#F97316" + "20" }]}>
                      <Ionicons name="car" size={22} color="#F97316" />
                    </View>
                    <View style={[styles.empInfo, isRTL && { alignItems: "flex-end" }]}>
                      <Text style={styles.empName}>{v.licensePlate}</Text>
                      <Text style={styles.empMeta}>{[v.make, v.model, v.color].filter(Boolean).join(" • ")}</Text>
                      {v.driverName && <Text style={styles.empMeta}>{v.driverName} {v.driverPhone ? `· ${v.driverPhone}` : ""}</Text>}
                    </View>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <Pressable onPress={() => { setEditVehicle(v); setVehicleForm({ licensePlate: v.licensePlate || "", make: v.make || "", model: v.model || "", color: v.color || "", driverName: v.driverName || "", driverPhone: v.driverPhone || "", notes: v.notes || "" }); setShowVehicleForm(true); }}>
                        <Ionicons name="pencil" size={18} color={Colors.info} />
                      </Pressable>
                      <Pressable onPress={() => Alert.alert(t("deleteVehicle"), t("areYouSure"), [{ text: t("cancel") }, { text: t("delete"), style: "destructive", onPress: () => deleteVehicleMutation.mutate(v.id) }])}>
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
            <View style={[styles.modalHeader, isRTL && { flexDirection: "row-reverse" }]}>
              <Text style={styles.modalTitle}>{editVehicle ? t("editVehicle") : t("addVehicle")}</Text>
              <Pressable onPress={() => setShowVehicleForm(false)}><Ionicons name="close" size={24} color={Colors.textMuted} /></Pressable>
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
                    placeholder={label}
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
              ))}
              <Pressable style={styles.saveBtn} onPress={() => {
                if (!vehicleForm.licensePlate.trim()) { Alert.alert(t("error"), t("licensePlate") + " required"); return; }
                if (editVehicle) updateVehicleMutation.mutate({ id: editVehicle.id, data: vehicleForm });
                else createVehicleMutation.mutate(vehicleForm);
              }}>
                <LinearGradient colors={[Colors.accent, Colors.gradientMid]} style={styles.saveBtnGradient}>
                  <Text style={styles.saveBtnText}>{editVehicle ? t("save") : t("addVehicle")}</Text>
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
            <View style={[styles.modalHeader, isRTL && { flexDirection: "row-reverse" }]}>
              <Text style={styles.modalTitle}>{t("printerConfig")}</Text>
              <Pressable onPress={() => setShowPrinterConfig(false)}><Ionicons name="close" size={24} color={Colors.textMuted} /></Pressable>
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
                    <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <Ionicons name={icon as any} size={18} color={Colors.accent} />
                      <Text style={{ color: Colors.text, fontWeight: "700", fontSize: 14 }}>{label}</Text>
                    </View>
                    <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 8 }}>
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
            <View style={[styles.modalHeader, isRTL && { flexDirection: "row-reverse" }]}>
              <Text style={styles.modalTitle}>{t("dailyClosingTitle")}</Text>
              <Pressable onPress={() => setShowDailyClosing(false)}><Ionicons name="close" size={24} color={Colors.textMuted} /></Pressable>
            </View>
            <ScrollView>
              <Text style={{ color: Colors.textMuted, fontSize: 13, marginBottom: 16 }}>{t("dailyClosingDesc")}</Text>

              {/* Perform closing button */}
              <View style={{ backgroundColor: Colors.surfaceLight, borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: "#06B6D4" + "40" }}>
                <Text style={{ color: Colors.text, fontWeight: "700", fontSize: 15, marginBottom: 12 }}>{t("performDailyClosing")}</Text>
                <View style={{ marginBottom: 10 }}>
                  <Text style={styles.label}>{t("openingCash")}</Text>
                  <TextInput style={styles.input} value={dailyClosingForm.openingCash} onChangeText={(v) => setDailyClosingForm((f) => ({ ...f, openingCash: v }))} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={Colors.textMuted} />
                </View>
                <View style={{ marginBottom: 10 }}>
                  <Text style={styles.label}>{t("closingCash")}</Text>
                  <TextInput style={styles.input} value={dailyClosingForm.closingCash} onChangeText={(v) => setDailyClosingForm((f) => ({ ...f, closingCash: v }))} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={Colors.textMuted} />
                </View>
                <View style={{ marginBottom: 10 }}>
                  <Text style={styles.label}>{t("notes")}</Text>
                  <TextInput style={styles.input} value={dailyClosingForm.notes} onChangeText={(v) => setDailyClosingForm((f) => ({ ...f, notes: v }))} placeholder={t("optionalNotes")} placeholderTextColor={Colors.textMuted} />
                </View>
                <Pressable style={styles.saveBtn} onPress={async () => {
                  setDailyClosingLoading(true);
                  try {
                    await apiRequest("POST", "/api/daily-closings", {
                      tenantId: tenant?.id, branchId: employee?.branchId || null,
                      employeeId: employee?.id, openingCash: dailyClosingForm.openingCash, closingCash: dailyClosingForm.closingCash, notes: dailyClosingForm.notes,
                    });
                    qc.invalidateQueries({ queryKey: [tenant?.id ? `/api/daily-closings?tenantId=${tenant.id}` : "/api/daily-closings"] });
                    setDailyClosingForm({ openingCash: "", closingCash: "", notes: "" });

                    // Auto-print Personalbericht after closing
                    if (Platform.OS === "web") {
                      try {
                        const today = new Date().toISOString().split("T")[0];
                        const res = await apiRequest("GET", `/api/reports/daily-sales-report?date=${today}`);
                        const salesData: any[] = await res.json();
                        if (salesData && salesData.length > 0) {
                          const storeName = (storeSettings as any)?.name || tenant?.name || "POS System";
                          const dateObj = new Date();
                          const dateStr = dateObj.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
                          const cashierName = employee?.name || "Kassierer";
                          const total = salesData.reduce((s: number, sale: any) => s + Number(sale.totalAmount || 0), 0);
                          const rowsHtml = salesData.map((sale: any, idx: number) => {
                            const addr = sale.customerAddress || "";
                            const parts = addr.split(",");
                            const street = parts[0]?.trim() || "–";
                            const city = parts[1]?.trim() || parts[0]?.trim() || "–";
                            const timeStr = new Date(sale.createdAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
                            const amt = Number(sale.totalAmount || 0).toFixed(2);
                            return `<tr><td>${idx + 1}</td><td>${street}</td><td>${city}</td><td>${timeStr}</td><td style="text-align:right;">${amt}</td></tr>`;
                          }).join("");
                          const html = `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><title>Personalbericht</title><style>
                            body { font-family: 'Courier New', monospace; font-size: 11px; margin: 0; padding: 10px; color: #000; }
                            h2 { text-align: center; font-size: 14px; margin: 4px 0; }
                            .sub { text-align: center; font-size: 11px; margin-bottom: 8px; }
                            table { width: 100%; border-collapse: collapse; }
                            th { border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 3px 4px; text-align: left; font-size: 10px; }
                            td { padding: 2px 4px; font-size: 10px; border-bottom: 1px dotted #ccc; }
                            .total-row { border-top: 1px solid #000; font-weight: bold; }
                            .total-row td { padding-top: 4px; }
                          </style></head><body>
                            <h2>Personalbericht</h2>
                            <div class="sub">${dateStr}</div>
                            <div class="sub">${storeName}</div>
                            <br/>
                            <div style="font-weight:bold;margin-bottom:4px;">Nr &nbsp; Kassierer: ${cashierName}</div>
                            <table>
                              <thead><tr><th>Nr</th><th>Adresse</th><th>Gebiet</th><th>Zeit</th><th style="text-align:right;">Total</th></tr></thead>
                              <tbody>${rowsHtml}</tbody>
                              <tfoot>
                                <tr class="total-row"><td colspan="4">Umsatz Total</td><td style="text-align:right;">${total.toFixed(2)}</td></tr>
                                <tr><td colspan="4">TAGESAUSGAB</td><td style="text-align:right;">0.00</td></tr>
                                <tr class="total-row"><td colspan="2">${salesData.length}&nbsp;&nbsp;TOTAL Kassierer</td><td colspan="2"></td><td style="text-align:right;">${total.toFixed(2)}</td></tr>
                              </tfoot>
                            </table>
                            <br/>
                            <div style="text-align:center;font-size:10px;">${new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} &nbsp; ${dateStr}</div>
                          </body></html>`;
                          printHtmlViaIframe(html);
                        }
                      } catch (_) { /* print error is non-fatal */ }
                    }

                    Alert.alert(t("success"), t("dailyClosingDone"));
                  } catch (e: any) { Alert.alert(t("error"), e.message); }
                  setDailyClosingLoading(false);
                }} disabled={dailyClosingLoading}>
                  <LinearGradient colors={["#06B6D4", "#0891B2"]} style={styles.saveBtnGradient}>
                    <Text style={styles.saveBtnText}>{dailyClosingLoading ? t("loading") : t("performDailyClosing")}</Text>
                  </LinearGradient>
                </Pressable>
              </View>

              {/* Print daily report button */}
              <Pressable style={{ backgroundColor: "#F59E0B" + "20", borderRadius: 12, padding: 14, marginBottom: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1, borderColor: "#F59E0B" + "60" }} onPress={async () => {
                if (Platform.OS !== "web") { Alert.alert("Info", "Drucken ist nur im Web verfügbar."); return; }
                try {
                  const today = new Date().toISOString().split("T")[0];
                  const res = await apiRequest("GET", `/api/reports/daily-sales-report?date=${today}`);
                  const salesData: any[] = await res.json();
                  if (!salesData || salesData.length === 0) { Alert.alert("Personalbericht", "Keine Bestellungen für heute gefunden."); return; }
                  const storeName = (storeSettings as any)?.name || tenant?.name || "POS System";
                  const dateObj = new Date();
                  const dateStr = dateObj.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
                  const cashierName = employee?.name || "Kassierer";
                  const total = salesData.reduce((s: number, sale: any) => s + Number(sale.totalAmount || 0), 0);
                  const rowsHtml = salesData.map((sale: any, idx: number) => {
                    const addr = sale.customerAddress || "";
                    const parts = addr.split(",");
                    const street = parts[0]?.trim() || "–";
                    const city = parts[1]?.trim() || parts[0]?.trim() || "–";
                    const timeStr = new Date(sale.createdAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
                    const amt = Number(sale.totalAmount || 0).toFixed(2);
                    return `<tr><td>${idx + 1}</td><td>${street}</td><td>${city}</td><td>${timeStr}</td><td style="text-align:right;">${amt}</td></tr>`;
                  }).join("");
                  const html = `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><title>Personalbericht</title><style>
                    body { font-family: 'Courier New', monospace; font-size: 11px; margin: 0; padding: 10px; color: #000; }
                    h2 { text-align: center; font-size: 14px; margin: 4px 0; }
                    .sub { text-align: center; font-size: 11px; margin-bottom: 8px; }
                    table { width: 100%; border-collapse: collapse; }
                    th { border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 3px 4px; text-align: left; font-size: 10px; }
                    td { padding: 2px 4px; font-size: 10px; border-bottom: 1px dotted #ccc; }
                    .total-row { border-top: 1px solid #000; font-weight: bold; }
                    .total-row td { padding-top: 4px; }
                  </style></head><body>
                    <h2>Personalbericht</h2>
                    <div class="sub">${dateStr}</div>
                    <div class="sub">${storeName}</div>
                    <br/>
                    <div style="font-weight:bold;margin-bottom:4px;">Nr &nbsp; Kassierer: ${cashierName}</div>
                    <table>
                      <thead><tr><th>Nr</th><th>Adresse</th><th>Gebiet</th><th>Zeit</th><th style="text-align:right;">Total</th></tr></thead>
                      <tbody>${rowsHtml}</tbody>
                      <tfoot>
                        <tr class="total-row"><td colspan="4">Umsatz Total</td><td style="text-align:right;">${total.toFixed(2)}</td></tr>
                        <tr><td colspan="4">TAGESAUSGAB</td><td style="text-align:right;">0.00</td></tr>
                        <tr class="total-row"><td colspan="2">${salesData.length}&nbsp;&nbsp;TOTAL Kassierer</td><td colspan="2"></td><td style="text-align:right;">${total.toFixed(2)}</td></tr>
                      </tfoot>
                    </table>
                    <br/>
                    <div style="text-align:center;font-size:10px;">${new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} &nbsp; ${dateStr}</div>
                  </body></html>`;
                  printHtmlViaIframe(html);
                } catch (e: any) { Alert.alert("Fehler", e.message); }
              }}>
                <Ionicons name="print-outline" size={20} color="#F59E0B" />
                <Text style={{ color: "#F59E0B", fontWeight: "700", fontSize: 14 }}>Personalbericht drucken</Text>
              </Pressable>

              {/* Past closings */}
              <Text style={{ color: Colors.text, fontWeight: "700", fontSize: 15, marginBottom: 10 }}>{t("dailyClosing")} {t("entries")}</Text>
              {dailyClosingsList.length === 0 ? (
                <Text style={{ color: Colors.textMuted, textAlign: "center", padding: 16 }}>{t("noDailyClosings")}</Text>
              ) : (
                dailyClosingsList.slice(0, 30).map((dc: any) => (
                  <View key={dc.id} style={{ backgroundColor: Colors.surfaceLight, borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: Colors.cardBorder }}>
                    <View style={{ flexDirection: isRTL ? "row-reverse" : "row", justifyContent: "space-between", marginBottom: 4 }}>
                      <Text style={{ color: Colors.text, fontWeight: "700" }}>{dc.closingDate}</Text>
                      <Text style={{ color: Colors.success, fontWeight: "700" }}>CHF {Number(dc.totalSales || 0).toFixed(2)}</Text>
                    </View>
                    <Text style={{ color: Colors.textMuted, fontSize: 12 }}>{dc.totalTransactions} {t("transactions")} · {t("cashDrawer")}: {Number(dc.closingCash || 0).toFixed(2)}</Text>
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
            <View style={[styles.modalHeader, isRTL && { flexDirection: "row-reverse" }]}>
              <Text style={styles.modalTitle}>{t("monthlyClosingTitle")}</Text>
              <Pressable onPress={() => setShowMonthlyClosing(false)}><Ionicons name="close" size={24} color={Colors.textMuted} /></Pressable>
            </View>
            <ScrollView>
              <Text style={{ color: Colors.textMuted, fontSize: 13, marginBottom: 16 }}>{t("monthlyClosingDesc")}</Text>

              <View style={{ backgroundColor: Colors.surfaceLight, borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: "#8B5CF6" + "40" }}>
                <Text style={{ color: Colors.text, fontWeight: "700", fontSize: 15, marginBottom: 12 }}>{t("performMonthlyClosing")}</Text>
                <View style={{ marginBottom: 10 }}>
                  <Text style={styles.label}>{t("notes")}</Text>
                  <TextInput style={styles.input} value={monthlyClosingForm.notes} onChangeText={(v) => setMonthlyClosingForm({ notes: v })} placeholder={t("optionalNotes")} placeholderTextColor={Colors.textMuted} />
                </View>
                <Pressable style={styles.saveBtn} onPress={async () => {
                  setMonthlyClosingLoading(true);
                  try {
                    const now = new Date();
                    await apiRequest("POST", "/api/monthly-closings", {
                      tenantId: tenant?.id, branchId: employee?.branchId || null,
                      employeeId: employee?.id,
                      closingMonth: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
                      notes: monthlyClosingForm.notes,
                    });
                    qc.invalidateQueries({ queryKey: [tenant?.id ? `/api/monthly-closings?tenantId=${tenant.id}` : "/api/monthly-closings"] });
                    Alert.alert(t("success"), t("monthlyClosingDone"));
                    setMonthlyClosingForm({ notes: "" });
                  } catch (e: any) { Alert.alert(t("error"), e.message); }
                  setMonthlyClosingLoading(false);
                }} disabled={monthlyClosingLoading}>
                  <LinearGradient colors={["#8B5CF6", "#7C3AED"]} style={styles.saveBtnGradient}>
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
                    <View style={{ flexDirection: isRTL ? "row-reverse" : "row", justifyContent: "space-between", marginBottom: 4 }}>
                      <Text style={{ color: Colors.text, fontWeight: "700" }}>{mc.closingMonth}</Text>
                      <Text style={{ color: Colors.success, fontWeight: "700" }}>CHF {Number(mc.totalSales || 0).toFixed(2)}</Text>
                    </View>
                    <Text style={{ color: Colors.textMuted, fontSize: 12 }}>{mc.totalTransactions} {t("transactions")} · {t("netRevenue")}: CHF {Number(mc.netRevenue || 0).toFixed(2)}</Text>
                    <Text style={{ color: Colors.textMuted, fontSize: 12 }}>{t("totalExpenses")}: CHF {Number(mc.totalExpenses || 0).toFixed(2)}</Text>
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
            <View style={[styles.modalHeader, isRTL && { flexDirection: "row-reverse" }]}>
              <Text style={styles.modalTitle}>{t("debitoren")}</Text>
              <Pressable onPress={() => setShowAccountsReceivable(false)}><Ionicons name="close" size={24} color={Colors.textMuted} /></Pressable>
            </View>
            <ScrollView>
              {(() => {
                const debtors = customersList.filter((c: any) => Number(c.creditBalance) > 0);
                const total = debtors.reduce((s: number, c: any) => s + Number(c.creditBalance || 0), 0);
                return (
                  <>
                    <View style={{ backgroundColor: "#EF4444" + "15", borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: "#EF4444" + "40" }}>
                      <Text style={{ color: Colors.textMuted, fontSize: 12 }}>{t("totalOutstanding")}</Text>
                      <Text style={{ color: "#EF4444", fontSize: 28, fontWeight: "800" }}>CHF {total.toFixed(2)}</Text>
                      <Text style={{ color: Colors.textMuted, fontSize: 13 }}>{debtors.length} {t("customersWithCredit")}</Text>
                    </View>
                    {debtors.length === 0 ? (
                      <Text style={{ color: Colors.textMuted, textAlign: "center", padding: 24 }}>{t("noOutstandingBalances")}</Text>
                    ) : (
                      debtors.map((c: any) => (
                        <View key={c.id} style={{ backgroundColor: Colors.surfaceLight, borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: Colors.cardBorder }}>
                          <View style={{ flexDirection: isRTL ? "row-reverse" : "row", justifyContent: "space-between", alignItems: "center" }}>
                            <View>
                              <Text style={{ color: Colors.text, fontWeight: "700" }}>{c.name}</Text>
                              <Text style={{ color: Colors.textMuted, fontSize: 12 }}>{c.phone || t("noPhone")}</Text>
                            </View>
                            <View style={{ alignItems: "flex-end" }}>
                              <Text style={{ color: "#EF4444", fontWeight: "800", fontSize: 16 }}>CHF {Number(c.creditBalance).toFixed(2)}</Text>
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

      {/* ── Delivery Zones Modal ────────────────────────────────────────────── */}
      <Modal visible={showDeliveryZones} animationType="slide" transparent onRequestClose={() => setShowDeliveryZones(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🚲 {t("deliveryZones")}</Text>
              <Pressable onPress={() => setShowDeliveryZones(false)}><Ionicons name="close" size={24} color={Colors.text} /></Pressable>
            </View>
            <Text style={{ color: Colors.textMuted, padding: 16, textAlign: "center" }}>
              {t("addDeliveryZone")} — Coming Soon
            </Text>
          </View>
        </View>
      </Modal>

      {/* ── Promo Codes Modal ───────────────────────────────────────────────── */}
      <Modal visible={showPromoCodes} animationType="slide" transparent onRequestClose={() => setShowPromoCodes(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🏷️ {t("promoCodes")}</Text>
              <Pressable onPress={() => setShowPromoCodes(false)}><Ionicons name="close" size={24} color={Colors.text} /></Pressable>
            </View>
            <Text style={{ color: Colors.textMuted, padding: 16, textAlign: "center" }}>
              {t("addPromoCode")} — Coming Soon
            </Text>
          </View>
        </View>
      </Modal>

      {/* ── Driver Management Modal ─────────────────────────────────────────── */}
      <Modal visible={showDriverManagement} animationType="slide" transparent onRequestClose={() => setShowDriverManagement(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🚗 {t("driverManagement")}</Text>
              <Pressable onPress={() => setShowDriverManagement(false)}><Ionicons name="close" size={24} color={Colors.text} /></Pressable>
            </View>
            <Text style={{ color: Colors.textMuted, padding: 16, textAlign: "center" }}>
              {t("activeDrivers")} — Coming Soon
            </Text>
          </View>
        </View>
      </Modal>

      {/* ── Loyalty Configuration Modal ─────────────────────────────────────── */}
      <Modal visible={showLoyaltyConfig} animationType="slide" transparent onRequestClose={() => setShowLoyaltyConfig(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>⭐ {t("loyaltyConfiguration")}</Text>
              <Pressable onPress={() => setShowLoyaltyConfig(false)}><Ionicons name="close" size={24} color={Colors.text} /></Pressable>
            </View>
            <Text style={{ color: Colors.textMuted, padding: 16, textAlign: "center" }}>
              {t("loyaltyPoints")} — Coming Soon
            </Text>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const pgStyles = StyleSheet.create({
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
});

const styles = StyleSheet.create({
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
  clockBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  clockBtnText: { fontSize: 13, fontWeight: "700" },
});

const smStyles = StyleSheet.create({
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
});
