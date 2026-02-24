import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet, Text, View, ScrollView, Pressable, Modal,
  TextInput, Alert, Platform, FlatList, Switch, Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Colors } from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";
import { apiRequest, getQueryFn } from "@/lib/query-client";

function SettingRow({ icon, label, value, onPress, color, rtl }: { icon: string; label: string; value?: string; onPress?: () => void; color?: string; rtl?: boolean }) {
  return (
    <Pressable style={[rowStyles.row, rtl && { flexDirection: "row-reverse" }]} onPress={onPress}>
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

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { employee, logout, isAdmin, canManage, isCashier } = useAuth();
  const { t, isRTL, language, setLanguage } = useLanguage();
  const [showEmployees, setShowEmployees] = useState(false);
  const [showSuppliers, setShowSuppliers] = useState(false);
  const [showBranches, setShowBranches] = useState(false);
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
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
  const [branchForm, setBranchForm] = useState({ name: "", address: "", phone: "", currency: "USD", taxRate: "" });
  const [showWarehouseForm, setShowWarehouseForm] = useState(false);
  const [warehouseForm, setWarehouseForm] = useState({ name: "", address: "", type: "main" });
  const [showPrinterSettings, setShowPrinterSettings] = useState(false);
  const [printerPaperSize, setPrinterPaperSize] = useState("80mm");
  const [printerAutoPrint, setPrinterAutoPrint] = useState(false);
  const [showStoreSettings, setShowStoreSettings] = useState(false);
  const [storeForm, setStoreForm] = useState({ name: "", address: "", phone: "", email: "" });
  const [storeLogo, setStoreLogo] = useState<string | null>(null);
  const [storeLogoUploading, setStoreLogoUploading] = useState(false);

  const [showShiftMonitor, setShowShiftMonitor] = useState(false);
  const [shiftMonitorTab, setShiftMonitorTab] = useState<"active" | "history" | "settings">("active");
  const [defaultShiftDuration, setDefaultShiftDuration] = useState("8");
  const [activeShiftsElapsed, setActiveShiftsElapsed] = useState<Record<number, string>>({});

  const [showNotifications, setShowNotifications] = useState(false);

  const { data: employees = [] } = useQuery<any[]>({ queryKey: ["/api/employees"], queryFn: getQueryFn({ on401: "throw" }) });
  const { data: suppliers = [] } = useQuery<any[]>({ queryKey: ["/api/suppliers"], queryFn: getQueryFn({ on401: "throw" }) });
  const { data: branches = [] } = useQuery<any[]>({ queryKey: ["/api/branches"], queryFn: getQueryFn({ on401: "throw" }) });
  const { data: shifts = [] } = useQuery<any[]>({ queryKey: ["/api/shifts"], queryFn: getQueryFn({ on401: "throw" }) });
  const { data: expenses = [] } = useQuery<any[]>({ queryKey: ["/api/expenses"], queryFn: getQueryFn({ on401: "throw" }) });
  const { data: purchaseOrders = [] } = useQuery<any[]>({ queryKey: ["/api/purchase-orders"], queryFn: getQueryFn({ on401: "throw" }) });
  const { data: activityLog = [] } = useQuery<any[]>({ queryKey: ["/api/activity-log"], queryFn: getQueryFn({ on401: "throw" }) });
  const { data: returns = [] } = useQuery<any[]>({ queryKey: ["/api/returns"], queryFn: getQueryFn({ on401: "throw" }) });
  const { data: salesList = [] } = useQuery<any[]>({ queryKey: ["/api/sales?limit=50"], queryFn: getQueryFn({ on401: "throw" }) });
  const { data: warehousesList = [] } = useQuery<any[]>({ queryKey: ["/api/warehouses"], queryFn: getQueryFn({ on401: "throw" }) });
  const { data: batchesList = [] } = useQuery<any[]>({ queryKey: ["/api/product-batches"], queryFn: getQueryFn({ on401: "throw" }) });
  const { data: productsList = [] } = useQuery<any[]>({ queryKey: ["/api/products"], queryFn: getQueryFn({ on401: "throw" }) });
  const { data: storeSettings } = useQuery<any>({ queryKey: ["/api/store-settings"], queryFn: getQueryFn({ on401: "throw" }) });

  const { data: allActiveShifts = [] } = useQuery<any[]>({
    queryKey: ["/api/shifts/active"],
    queryFn: getQueryFn({ on401: "throw" }),
    refetchInterval: 30000,
    enabled: isAdmin,
  });

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

  const createEmpMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/employees", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/employees"] }); setShowEmployeeForm(false); },
    onError: (e: any) => Alert.alert(t("error"), e.message),
  });

  const createSupMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/suppliers", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/suppliers"] }); setShowSupplierForm(false); },
    onError: (e: any) => Alert.alert(t("error"), e.message),
  });

  const createExpenseMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/expenses", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/expenses"] }); setShowExpenseForm(false); },
    onError: (e: any) => Alert.alert(t("error"), e.message),
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/expenses/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/expenses"] }); },
    onError: (e: any) => Alert.alert(t("error"), e.message),
  });

  const clockInMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/shifts", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/shifts"] }); },
    onError: (e: any) => Alert.alert(t("error"), e.message),
  });

  const clockOutMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest("PUT", `/api/shifts/${id}/close`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/shifts"] }); qc.invalidateQueries({ queryKey: ["/api/shifts/active"] }); },
    onError: (e: any) => Alert.alert(t("error"), e.message),
  });

  const forceCloseShiftMutation = useMutation({
    mutationFn: (id: number) => apiRequest("PUT", `/api/shifts/${id}/close`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/shifts"] });
      qc.invalidateQueries({ queryKey: ["/api/shifts/active"] });
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
    mutationFn: (data: any) => apiRequest("POST", "/api/purchase-orders", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/purchase-orders"] }); setShowPOForm(false); },
    onError: (e: any) => Alert.alert(t("error"), e.message),
  });

  const receivePOMutation = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/purchase-orders/${id}/receive`, { items: [] }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/purchase-orders"] }); },
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
        branchId: employee?.branchId || 1,
        items: returnItems,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/returns"] });
      qc.invalidateQueries({ queryKey: ["/api/sales"] });
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
      if (editBranch) return apiRequest("PUT", `/api/branches/${editBranch.id}`, data);
      return apiRequest("POST", "/api/branches", data);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/branches"] }); setShowBranchForm(false); setEditBranch(null); },
    onError: (e: any) => Alert.alert(t("error"), e.message),
  });

  const deleteBranchMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/branches/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/branches"] }); },
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
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setStoreLogo(result.assets[0].uri);
    }
  };

  const uploadStoreLogo = async (uri: string): Promise<string | null> => {
    try {
      setStoreLogoUploading(true);
      const uploadRes = await apiRequest("POST", "/api/objects/upload");
      const { uploadURL } = await uploadRes.json();
      const response = await fetch(uri);
      const blob = await response.blob();
      await fetch(uploadURL, { method: "PUT", body: blob, headers: { "Content-Type": "image/jpeg" } });
      const saveRes = await apiRequest("PUT", "/api/images/save", { imageURL: uploadURL });
      const { objectPath } = await saveRes.json();
      return objectPath;
    } catch (e) {
      console.error("Logo upload failed:", e);
      return null;
    } finally {
      setStoreLogoUploading(false);
    }
  };

  const handleSaveStoreSettings = async () => {
    let logoPath = storeSettings?.logo || null;
    if (storeLogo && !storeLogo.startsWith("/objects")) {
      logoPath = await uploadStoreLogo(storeLogo);
    }
    updateStoreSettingsMutation.mutate({
      name: storeForm.name || undefined,
      address: storeForm.address || undefined,
      phone: storeForm.phone || undefined,
      email: storeForm.email || undefined,
      logo: logoPath || undefined,
    });
  };

  const rtlTextAlign = isRTL ? { textAlign: "right" as const } : {};

  useEffect(() => {
    if (!allActiveShifts || allActiveShifts.length === 0) {
      setActiveShiftsElapsed({});
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

  const topPad = Platform.OS === "web" ? 67 : 0;
  const roleColors: Record<string, string> = { admin: Colors.danger, manager: Colors.warning, cashier: Colors.info, owner: Colors.secondary };

  const formatDuration = (startTime: string, endTime: string) => {
    const ms = new Date(endTime).getTime() - new Date(startTime).getTime();
    const hours = Math.floor(ms / 3600000);
    const mins = Math.floor((ms % 3600000) / 60000);
    return `${hours}h ${mins}m`;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + topPad, direction: isRTL ? "rtl" : "ltr" }]}>
      <LinearGradient colors={[Colors.gradientStart, Colors.gradientMid]} style={styles.header}>
        <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={styles.headerTitle}>{t("settingsMore")}</Text>
          <Pressable onPress={() => setShowNotifications(true)} style={{ position: "relative", padding: 4 }}>
            <Ionicons name="notifications-outline" size={24} color={Colors.white} />
            {unreadCount > 0 && (
              <View style={smStyles.notifBadge}>
                <Text style={smStyles.notifBadgeText}>{unreadCount > 99 ? "99+" : unreadCount}</Text>
              </View>
            )}
          </Pressable>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: (Platform.OS === "web" ? 84 : 60) + 20 }]}>
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

        {canManage && (
          <>
            <Text style={styles.sectionTitle}>{t("management")}</Text>
            {isAdmin && <SettingRow icon="people" label={t("employees")} value={`${employees.length} ${t("members")}`} onPress={() => setShowEmployees(true)} color={Colors.info} rtl={isRTL} />}
            {isAdmin && <SettingRow icon="business" label={t("branches")} value={`${branches.length} ${t("locations")}`} onPress={() => setShowBranches(true)} color={Colors.secondary} rtl={isRTL} />}
            {isAdmin && <SettingRow icon="storefront-outline" label={t("storeSettings")} value={t("configureStore")} onPress={() => {
              setStoreForm({
                name: storeSettings?.name || "",
                address: storeSettings?.address || "",
                phone: storeSettings?.phone || "",
                email: storeSettings?.email || "",
              });
              setStoreLogo(storeSettings?.logo || null);
              setShowStoreSettings(true);
            }} color={Colors.accent} rtl={isRTL} />}
            <SettingRow icon="cube" label={t("suppliers")} value={`${suppliers.length} ${t("suppliers")}`} onPress={() => setShowSuppliers(true)} color={Colors.success} rtl={isRTL} />
            <SettingRow icon="wallet" label={t("expenses")} value={`${expenses.length} ${t("expenses")}`} onPress={() => setShowExpenses(true)} color={Colors.warning} rtl={isRTL} />
            <SettingRow icon="time" label={t("attendance")} value={`${shifts.length} ${t("attendance")}`} onPress={() => setShowAttendance(true)} color={Colors.warning} rtl={isRTL} />
            {isAdmin && <SettingRow icon="pulse" label={t("shiftMonitor")} value={`${allActiveShifts.length} ${t("activeShiftsCount")}`} onPress={() => { setShiftMonitorTab("active"); setShowShiftMonitor(true); }} color="#2FD3C6" rtl={isRTL} />}
            <SettingRow icon="document-text" label={t("purchaseOrders")} value={`${purchaseOrders.length} ${t("orders")}`} onPress={() => setShowPurchaseOrders(true)} color={Colors.info} rtl={isRTL} />
            <SettingRow icon="list" label={t("activityLog")} value={`${activityLog.length} ${t("entries")}`} onPress={() => setShowActivityLog(true)} color={Colors.secondary} rtl={isRTL} />
            <SettingRow icon="swap-horizontal" label={t("returnsRefunds")} value={`${returns.length} ${t("returns")}`} onPress={() => setShowReturnsManager(true)} color={Colors.danger} rtl={isRTL} />
          </>
        )}
        <SettingRow icon="cash" label={t("cashDrawer")} value={activeShift ? t("activeShift") : t("noActiveShift")} onPress={() => setShowCashDrawer(true)} color={Colors.success} rtl={isRTL} />
        {canManage && (
          <>
            <SettingRow icon="home" label={t("warehouses")} value={`${warehousesList.length} ${t("warehouses")}`} onPress={() => setShowWarehouseManager(true)} color={Colors.accent} rtl={isRTL} />
            <SettingRow icon="layers" label={t("productBatches")} value={`${batchesList.length} ${t("batches")}`} onPress={() => { setBatchView("list"); setShowBatchManager(true); }} color={Colors.secondary} rtl={isRTL} />
          </>
        )}

        <Text style={styles.sectionTitle}>{t("system")}</Text>
        <SettingRow icon="language" label={t("language")} value={language === "ar" ? "العربية" : "English"} onPress={() => setShowLanguagePicker(true)} color={Colors.info} rtl={isRTL} />
        <SettingRow icon="print" label={t("receiptPrinter")} value={t("notConfigured")} onPress={() => setShowPrinterSettings(true)} color={Colors.textMuted} rtl={isRTL} />
        <SettingRow icon="cloud-upload" label={t("syncStatus")} value={t("connected")} color={Colors.success} rtl={isRTL} />
        <SettingRow icon="information-circle" label={t("appVersion")} value="1.0.0" color={Colors.info} rtl={isRTL} />

        <Pressable style={styles.logoutBtn} onPress={() => { if (Platform.OS === "web") { if (window.confirm(t("logoutConfirm"))) logout(); } else { Alert.alert(t("logoutConfirm"), "", [{ text: t("cancel"), style: "cancel" }, { text: t("logout"), style: "destructive", onPress: () => logout() }]); } }}>
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
                <Pressable onPress={() => { setEmpForm({ name: "", pin: "", role: "cashier", email: "", phone: "" }); setShowEmployeeForm(true); }}>
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
                  <View style={[styles.roleBadge, { backgroundColor: (roleColors[item.role] || Colors.info) + "20" }]}>
                    <Text style={[styles.roleText, { color: roleColors[item.role] || Colors.info }]}>{item.role}</Text>
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
              <Text style={styles.modalTitle}>{t("newEmployee")}</Text>
              <Pressable onPress={() => setShowEmployeeForm(false)}><Ionicons name="close" size={24} color={Colors.text} /></Pressable>
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
                createEmpMutation.mutate({ name: empForm.name, pin: empForm.pin, role: empForm.role, email: empForm.email || undefined, branchId: 1, permissions: empForm.role === "admin" ? ["all"] : ["pos"] });
              }}>
                <LinearGradient colors={[Colors.accent, Colors.gradientMid]} style={styles.saveBtnGradient}>
                  <Text style={styles.saveBtnText}>{t("createEmployee")}</Text>
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
                <Pressable onPress={() => { setBranchForm({ name: "", address: "", phone: "", currency: "USD", taxRate: "" }); setEditBranch(null); setShowBranchForm(true); }}>
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
                    <Text style={styles.empMeta}>{item.address || t("noAddress")} | {item.currency || "USD"} | {t("taxRate")}: {item.taxRate || "0"}%</Text>
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
                      setBranchForm({ name: item.name, address: item.address || "", phone: item.phone || "", currency: item.currency || "USD", taxRate: item.taxRate || "" });
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
                {["USD", "EGP", "EUR", "GBP", "SAR"].map((c) => (
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
                    <Text style={styles.empMeta}>${parseFloat(item.amount).toFixed(2)} | {new Date(item.date).toLocaleDateString()}</Text>
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
                    {item.endTime && (
                      <View style={[styles.roleBadge, { backgroundColor: Colors.info + "20" }]}>
                        <Text style={[styles.roleText, { color: Colors.info }]}>{formatDuration(item.startTime, item.endTime)}</Text>
                      </View>
                    )}
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
                    <Text style={styles.empMeta}>${Number(item.totalAmount).toFixed(2)} | {item.reason || t("noReason")} | {new Date(item.createdAt).toLocaleDateString()}</Text>
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
                      <Text style={styles.empName}>{item.receiptNumber}</Text>
                      <Text style={styles.empMeta}>${Number(item.totalAmount).toFixed(2)} | {new Date(item.createdAt).toLocaleDateString()} | {item.paymentMethod}</Text>
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
              {activeShift ? (
                <>
                  <View style={{ backgroundColor: Colors.success + "15", borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: Colors.success + "30" }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.success }} />
                      <Text style={{ color: Colors.success, fontSize: 14, fontWeight: "700" }}>{t("activeShift")}</Text>
                    </View>
                    <Text style={{ color: Colors.textMuted, fontSize: 12 }}>{t("openingCash")}: ${Number(activeShift.openingCash || 0).toFixed(2)}</Text>
                    <Text style={{ color: Colors.textMuted, fontSize: 12, marginTop: 2 }}>{t("durationLabel")}: {activeShiftElapsed || "0:00"}</Text>
                  </View>

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
                      shiftId: activeShift.id,
                      employeeId: employee?.id,
                      type: cashDrawerForm.type,
                      amount: cashDrawerForm.amount,
                      reason: cashDrawerForm.reason,
                    });
                  }}>
                    <LinearGradient colors={[Colors.accent, Colors.gradientMid]} style={styles.saveBtnGradient}>
                      <Text style={styles.saveBtnText}>{t("recordOperation")}</Text>
                    </LinearGradient>
                  </Pressable>
                </>
              ) : (
                <View style={{ alignItems: "center", paddingVertical: 40 }}>
                  <Ionicons name="lock-closed" size={48} color={Colors.textMuted} />
                  <Text style={{ color: Colors.textMuted, fontSize: 15, marginTop: 12 }}>{t("noActiveShift")}</Text>
                  <Text style={{ color: Colors.textMuted, fontSize: 12, marginTop: 4, textAlign: "center" }}>{t("noActiveShiftCashDrawer")}</Text>
                </View>
              )}
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
                const sampleReceipt = `================================\n        SAMPLE RECEIPT\n================================\nDate: ${new Date().toLocaleString()}\nReceipt #: TEST-001\n--------------------------------\nItem 1          x2     $10.00\nItem 2          x1      $5.50\n--------------------------------\nSubtotal:              $15.50\nTax (10%):              $1.55\n--------------------------------\nTOTAL:                 $17.05\n================================\n      Thank you!\n================================`;
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
          <View style={[styles.modalContent, { maxWidth: 340, maxHeight: 300 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("language")}</Text>
              <Pressable onPress={() => setShowLanguagePicker(false)}><Ionicons name="close" size={24} color={Colors.text} /></Pressable>
            </View>
            <Pressable
              testID="lang-en"
              style={[styles.empCard, language === "en" && { borderWidth: 2, borderColor: Colors.accent }]}
              onPress={() => { setLanguage("en"); setShowLanguagePicker(false); }}
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
              onPress={() => { setLanguage("ar"); setShowLanguagePicker(false); }}
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
                          <Text style={smStyles.statChipText}>${Number(item.totalSales || 0).toFixed(2)}</Text>
                        </View>
                        <View style={smStyles.statChip}>
                          <Ionicons name="receipt-outline" size={12} color={Colors.warning} />
                          <Text style={smStyles.statChipText}>{item.totalTransactions || 0} {t("txns")}</Text>
                        </View>
                        {item.openingCash != null && (
                          <View style={smStyles.statChip}>
                            <Ionicons name="cash-outline" size={12} color={Colors.success} />
                            <Text style={smStyles.statChipText}>${Number(item.openingCash || 0).toFixed(2)} → ${Number(item.closingCash || 0).toFixed(2)}</Text>
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
                    <Image source={{ uri: storeLogo }} style={{ width: 80, height: 80, borderRadius: 12 }} />
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
              <TextInput style={[styles.input, rtlTextAlign]} value={storeForm.name} onChangeText={(v) => setStoreForm({...storeForm, name: v})} placeholderTextColor={Colors.textMuted} placeholder={t("storeName")} />

              <Text style={[styles.label, rtlTextAlign]}>{t("storeAddress")}</Text>
              <TextInput style={[styles.input, rtlTextAlign]} value={storeForm.address} onChangeText={(v) => setStoreForm({...storeForm, address: v})} placeholderTextColor={Colors.textMuted} placeholder={t("storeAddress")} />

              <Text style={[styles.label, rtlTextAlign]}>{t("storePhone")}</Text>
              <TextInput style={[styles.input, rtlTextAlign]} value={storeForm.phone} onChangeText={(v) => setStoreForm({...storeForm, phone: v})} placeholderTextColor={Colors.textMuted} placeholder={t("storePhone")} keyboardType="phone-pad" />

              <Text style={[styles.label, rtlTextAlign]}>{t("storeEmail")}</Text>
              <TextInput style={[styles.input, rtlTextAlign]} value={storeForm.email} onChangeText={(v) => setStoreForm({...storeForm, email: v})} placeholderTextColor={Colors.textMuted} placeholder={t("storeEmail")} keyboardType="email-address" />

              <Pressable style={{ marginTop: 16 }} onPress={handleSaveStoreSettings}>
                <LinearGradient colors={[Colors.accent, Colors.gradientMid]} style={{ paddingVertical: 14, borderRadius: 12, alignItems: "center" }}>
                  <Text style={{ color: Colors.white, fontSize: 16, fontWeight: "700" }}>{storeLogoUploading ? t("imageUploading") : t("save")}</Text>
                </LinearGradient>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 16, paddingVertical: 14 },
  headerTitle: { fontSize: 22, fontWeight: "800", color: Colors.white },
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
