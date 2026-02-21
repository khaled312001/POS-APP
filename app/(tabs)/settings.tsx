import React, { useState, useEffect } from "react";
import {
  StyleSheet, Text, View, ScrollView, Pressable, Modal,
  TextInput, Alert, Platform, FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Colors } from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";
import { apiRequest, getQueryFn } from "@/lib/query-client";

function SettingRow({ icon, label, value, onPress, color }: { icon: string; label: string; value?: string; onPress?: () => void; color?: string }) {
  return (
    <Pressable style={rowStyles.row} onPress={onPress}>
      <View style={[rowStyles.iconWrap, { backgroundColor: (color || Colors.accent) + "20" }]}>
        <Ionicons name={icon as any} size={20} color={color || Colors.accent} />
      </View>
      <View style={rowStyles.info}>
        <Text style={rowStyles.label}>{label}</Text>
        {value ? <Text style={rowStyles.value}>{value}</Text> : null}
      </View>
      {onPress && <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />}
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
  const { employee, logout } = useAuth();
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

  const { data: employees = [] } = useQuery<any[]>({ queryKey: ["/api/employees"], queryFn: getQueryFn({ on401: "throw" }) });
  const { data: suppliers = [] } = useQuery<any[]>({ queryKey: ["/api/suppliers"], queryFn: getQueryFn({ on401: "throw" }) });
  const { data: branches = [] } = useQuery<any[]>({ queryKey: ["/api/branches"], queryFn: getQueryFn({ on401: "throw" }) });
  const { data: shifts = [] } = useQuery<any[]>({ queryKey: ["/api/shifts"], queryFn: getQueryFn({ on401: "throw" }) });
  const { data: expenses = [] } = useQuery<any[]>({ queryKey: ["/api/expenses"], queryFn: getQueryFn({ on401: "throw" }) });
  const { data: purchaseOrders = [] } = useQuery<any[]>({ queryKey: ["/api/purchase-orders"], queryFn: getQueryFn({ on401: "throw" }) });
  const { data: activityLog = [] } = useQuery<any[]>({ queryKey: ["/api/activity-log"], queryFn: getQueryFn({ on401: "throw" }) });

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
    onError: (e: any) => Alert.alert("Error", e.message),
  });

  const createSupMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/suppliers", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/suppliers"] }); setShowSupplierForm(false); },
    onError: (e: any) => Alert.alert("Error", e.message),
  });

  const createExpenseMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/expenses", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/expenses"] }); setShowExpenseForm(false); },
    onError: (e: any) => Alert.alert("Error", e.message),
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/expenses/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/expenses"] }); },
    onError: (e: any) => Alert.alert("Error", e.message),
  });

  const clockInMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/shifts", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/shifts"] }); },
    onError: (e: any) => Alert.alert("Error", e.message),
  });

  const clockOutMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest("PUT", `/api/shifts/${id}/close`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/shifts"] }); },
    onError: (e: any) => Alert.alert("Error", e.message),
  });

  const createPOMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/purchase-orders", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/purchase-orders"] }); setShowPOForm(false); },
    onError: (e: any) => Alert.alert("Error", e.message),
  });

  const receivePOMutation = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/api/purchase-orders/${id}/receive`, { items: [] }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/purchase-orders"] }); },
    onError: (e: any) => Alert.alert("Error", e.message),
  });

  const topPad = Platform.OS === "web" ? 67 : 0;
  const roleColors: Record<string, string> = { admin: Colors.danger, manager: Colors.warning, cashier: Colors.info, owner: Colors.secondary };

  const formatDuration = (startTime: string, endTime: string) => {
    const ms = new Date(endTime).getTime() - new Date(startTime).getTime();
    const hours = Math.floor(ms / 3600000);
    const mins = Math.floor((ms % 3600000) / 60000);
    return `${hours}h ${mins}m`;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + topPad }]}>
      <LinearGradient colors={[Colors.gradientStart, Colors.gradientMid]} style={styles.header}>
        <Text style={styles.headerTitle}>Settings & More</Text>
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

        <Text style={styles.sectionTitle}>Management</Text>
        <SettingRow icon="people" label="Employees" value={`${employees.length} members`} onPress={() => setShowEmployees(true)} color={Colors.info} />
        <SettingRow icon="business" label="Branches" value={`${branches.length} locations`} onPress={() => setShowBranches(true)} color={Colors.secondary} />
        <SettingRow icon="cube" label="Suppliers" value={`${suppliers.length} suppliers`} onPress={() => setShowSuppliers(true)} color={Colors.success} />
        <SettingRow icon="wallet" label="Expenses" value={`${expenses.length} expenses`} onPress={() => setShowExpenses(true)} color={Colors.warning} />
        <SettingRow icon="time" label="Attendance" value={`${shifts.length} shifts`} onPress={() => setShowAttendance(true)} color={Colors.warning} />
        <SettingRow icon="document-text" label="Purchase Orders" value={`${purchaseOrders.length} orders`} onPress={() => setShowPurchaseOrders(true)} color={Colors.info} />
        <SettingRow icon="list" label="Activity Log" value={`${activityLog.length} entries`} onPress={() => setShowActivityLog(true)} color={Colors.secondary} />

        <Text style={styles.sectionTitle}>System</Text>
        <SettingRow icon="language" label="Language" value="English" color={Colors.accent} />
        <SettingRow icon="print" label="Receipt Printer" value="Not configured" color={Colors.textMuted} />
        <SettingRow icon="cloud-upload" label="Sync Status" value="Connected" color={Colors.success} />
        <SettingRow icon="information-circle" label="App Version" value="1.0.0" color={Colors.info} />

        <Pressable style={styles.logoutBtn} onPress={() => { logout(); Alert.alert("Logged Out", "You have been logged out"); }}>
          <Ionicons name="log-out" size={20} color={Colors.danger} />
          <Text style={styles.logoutText}>Log Out</Text>
        </Pressable>
      </ScrollView>

      <Modal visible={showEmployees} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Employees</Text>
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
                    <Text style={styles.empMeta}>PIN: {item.pin} | {item.email || "No email"}</Text>
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
              <Text style={styles.modalTitle}>New Employee</Text>
              <Pressable onPress={() => setShowEmployeeForm(false)}><Ionicons name="close" size={24} color={Colors.text} /></Pressable>
            </View>
            <ScrollView>
              <Text style={styles.label}>Name *</Text>
              <TextInput style={styles.input} value={empForm.name} onChangeText={(t) => setEmpForm({ ...empForm, name: t })} placeholderTextColor={Colors.textMuted} placeholder="Employee name" />
              <Text style={styles.label}>PIN *</Text>
              <TextInput style={styles.input} value={empForm.pin} onChangeText={(t) => setEmpForm({ ...empForm, pin: t })} keyboardType="number-pad" placeholderTextColor={Colors.textMuted} placeholder="4-digit PIN" maxLength={4} />
              <Text style={styles.label}>Role</Text>
              <View style={styles.roleRow}>
                {["cashier", "manager", "admin", "owner"].map((r) => (
                  <Pressable key={r} style={[styles.roleChip, empForm.role === r && { backgroundColor: Colors.accent }]} onPress={() => setEmpForm({ ...empForm, role: r })}>
                    <Text style={[styles.roleChipText, empForm.role === r && { color: Colors.textDark }]}>{r}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.label}>Email</Text>
              <TextInput style={styles.input} value={empForm.email} onChangeText={(t) => setEmpForm({ ...empForm, email: t })} placeholderTextColor={Colors.textMuted} placeholder="email@example.com" autoCapitalize="none" />
              <Pressable style={styles.saveBtn} onPress={() => {
                if (!empForm.name || !empForm.pin) return Alert.alert("Error", "Name and PIN required");
                createEmpMutation.mutate({ name: empForm.name, pin: empForm.pin, role: empForm.role, email: empForm.email || undefined, branchId: 1, permissions: empForm.role === "admin" ? ["all"] : ["pos"] });
              }}>
                <LinearGradient colors={[Colors.accent, Colors.gradientMid]} style={styles.saveBtnGradient}>
                  <Text style={styles.saveBtnText}>Create Employee</Text>
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
              <Text style={styles.modalTitle}>Suppliers</Text>
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
                    <Text style={styles.empMeta}>{item.contactName || "No contact"} | {item.phone || "No phone"}</Text>
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
              <Text style={styles.modalTitle}>New Supplier</Text>
              <Pressable onPress={() => setShowSupplierForm(false)}><Ionicons name="close" size={24} color={Colors.text} /></Pressable>
            </View>
            <ScrollView>
              <Text style={styles.label}>Company Name *</Text>
              <TextInput style={styles.input} value={supForm.name} onChangeText={(t) => setSupForm({ ...supForm, name: t })} placeholderTextColor={Colors.textMuted} placeholder="Supplier name" />
              <Text style={styles.label}>Contact Person</Text>
              <TextInput style={styles.input} value={supForm.contactName} onChangeText={(t) => setSupForm({ ...supForm, contactName: t })} placeholderTextColor={Colors.textMuted} placeholder="Contact name" />
              <Text style={styles.label}>Phone</Text>
              <TextInput style={styles.input} value={supForm.phone} onChangeText={(t) => setSupForm({ ...supForm, phone: t })} keyboardType="phone-pad" placeholderTextColor={Colors.textMuted} placeholder="+1234567890" />
              <Text style={styles.label}>Email</Text>
              <TextInput style={styles.input} value={supForm.email} onChangeText={(t) => setSupForm({ ...supForm, email: t })} placeholderTextColor={Colors.textMuted} placeholder="email@example.com" autoCapitalize="none" />
              <Pressable style={styles.saveBtn} onPress={() => {
                if (!supForm.name) return Alert.alert("Error", "Company name required");
                createSupMutation.mutate({ name: supForm.name, contactName: supForm.contactName || undefined, phone: supForm.phone || undefined, email: supForm.email || undefined, paymentTerms: supForm.paymentTerms || undefined });
              }}>
                <LinearGradient colors={[Colors.accent, Colors.gradientMid]} style={styles.saveBtnGradient}>
                  <Text style={styles.saveBtnText}>Create Supplier</Text>
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
              <Text style={styles.modalTitle}>Branches</Text>
              <Pressable onPress={() => setShowBranches(false)}><Ionicons name="close" size={24} color={Colors.text} /></Pressable>
            </View>
            <FlatList
              data={branches}
              keyExtractor={(item: any) => String(item.id)}
              scrollEnabled={!!branches.length}
              renderItem={({ item }: { item: any }) => (
                <View style={styles.empCard}>
                  <View style={[styles.empAvatar, { backgroundColor: Colors.secondary + "30" }]}>
                    <Ionicons name="business" size={20} color={Colors.secondary} />
                  </View>
                  <View style={styles.empInfo}>
                    <Text style={styles.empName}>{item.name}</Text>
                    <Text style={styles.empMeta}>{item.address || "No address"} | {item.currency || "USD"}</Text>
                  </View>
                  {item.isMain && (
                    <View style={[styles.roleBadge, { backgroundColor: Colors.accent + "20" }]}>
                      <Text style={[styles.roleText, { color: Colors.accent }]}>Main</Text>
                    </View>
                  )}
                </View>
              )}
            />
          </View>
        </View>
      </Modal>

      <Modal visible={showExpenses} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Expenses</Text>
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
              ListEmptyComponent={<Text style={{ color: Colors.textMuted, textAlign: "center", paddingVertical: 20 }}>No expenses recorded</Text>}
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
                      Alert.alert("Delete Expense", `Delete "${item.description}"?`, [
                        { text: "Cancel", style: "cancel" },
                        { text: "Delete", style: "destructive", onPress: () => deleteExpenseMutation.mutate(item.id) },
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
              <Text style={styles.modalTitle}>Add Expense</Text>
              <Pressable onPress={() => setShowExpenseForm(false)}><Ionicons name="close" size={24} color={Colors.text} /></Pressable>
            </View>
            <ScrollView>
              <Text style={styles.label}>Description *</Text>
              <TextInput style={styles.input} value={expenseForm.description} onChangeText={(t) => setExpenseForm({ ...expenseForm, description: t })} placeholderTextColor={Colors.textMuted} placeholder="Expense description" />
              <Text style={styles.label}>Amount *</Text>
              <TextInput style={styles.input} value={expenseForm.amount} onChangeText={(t) => setExpenseForm({ ...expenseForm, amount: t })} keyboardType="decimal-pad" placeholderTextColor={Colors.textMuted} placeholder="0.00" />
              <Text style={styles.label}>Category</Text>
              <View style={styles.roleRow}>
                {expenseCategories.map((c) => (
                  <Pressable key={c} style={[styles.roleChip, expenseForm.category === c && { backgroundColor: expenseCategoryColors[c] }]} onPress={() => setExpenseForm({ ...expenseForm, category: c })}>
                    <Text style={[styles.roleChipText, expenseForm.category === c && { color: Colors.white }]}>{c}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.label}>Date</Text>
              <TextInput style={styles.input} value={expenseForm.date} onChangeText={(t) => setExpenseForm({ ...expenseForm, date: t })} placeholderTextColor={Colors.textMuted} placeholder="YYYY-MM-DD" />
              <Text style={styles.label}>Notes</Text>
              <TextInput style={[styles.input, { minHeight: 60 }]} value={expenseForm.notes} onChangeText={(t) => setExpenseForm({ ...expenseForm, notes: t })} placeholderTextColor={Colors.textMuted} placeholder="Optional notes" multiline />
              <Pressable style={styles.saveBtn} onPress={() => {
                if (!expenseForm.description || !expenseForm.amount) return Alert.alert("Error", "Description and amount required");
                createExpenseMutation.mutate({ branchId: 1, categoryId: expenseForm.category, description: expenseForm.description, amount: parseFloat(expenseForm.amount), date: expenseForm.date, notes: expenseForm.notes || undefined });
              }}>
                <LinearGradient colors={[Colors.accent, Colors.gradientMid]} style={styles.saveBtnGradient}>
                  <Text style={styles.saveBtnText}>Add Expense</Text>
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
              <Text style={styles.modalTitle}>Attendance</Text>
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
                    <Text style={[styles.empMeta, { color: Colors.success }]}>Clocked In {activeShiftElapsed ? `| ${activeShiftElapsed}` : ""}</Text>
                  ) : (
                    <Text style={styles.empMeta}>Not clocked in</Text>
                  )}
                </View>
                {activeShift ? (
                  <Pressable style={[styles.clockBtn, { backgroundColor: Colors.danger + "20" }]} onPress={() => clockOutMutation.mutate({ id: activeShift.id, data: {} })}>
                    <Ionicons name="stop-circle" size={20} color={Colors.danger} />
                    <Text style={[styles.clockBtnText, { color: Colors.danger }]}>Out</Text>
                  </Pressable>
                ) : (
                  <Pressable style={[styles.clockBtn, { backgroundColor: Colors.success + "20" }]} onPress={() => clockInMutation.mutate({ employeeId: employee.id, branchId: 1, startTime: new Date().toISOString(), status: "open" })}>
                    <Ionicons name="play-circle" size={20} color={Colors.success} />
                    <Text style={[styles.clockBtnText, { color: Colors.success }]}>In</Text>
                  </Pressable>
                )}
              </View>
            )}
            <FlatList
              data={shifts}
              keyExtractor={(item: any) => String(item.id)}
              scrollEnabled={!!shifts.length}
              ListEmptyComponent={<Text style={{ color: Colors.textMuted, textAlign: "center", paddingVertical: 20 }}>No shifts recorded</Text>}
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
                        {item.endTime ? ` - ${new Date(item.endTime).toLocaleString()}` : " (Active)"}
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
              <Text style={styles.modalTitle}>Purchase Orders</Text>
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
              ListEmptyComponent={<Text style={{ color: Colors.textMuted, textAlign: "center", paddingVertical: 20 }}>No purchase orders</Text>}
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
              <Text style={styles.modalTitle}>Create Purchase Order</Text>
              <Pressable onPress={() => setShowPOForm(false)}><Ionicons name="close" size={24} color={Colors.text} /></Pressable>
            </View>
            <ScrollView>
              <Text style={styles.label}>Supplier *</Text>
              <View style={styles.roleRow}>
                {suppliers.map((s: any) => (
                  <Pressable key={s.id} style={[styles.roleChip, poForm.supplierId === String(s.id) && { backgroundColor: Colors.accent }]} onPress={() => setPOForm({ ...poForm, supplierId: String(s.id) })}>
                    <Text style={[styles.roleChipText, poForm.supplierId === String(s.id) && { color: Colors.textDark }]}>{s.name}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.label}>Notes</Text>
              <TextInput style={[styles.input, { minHeight: 60 }]} value={poForm.notes} onChangeText={(t) => setPOForm({ ...poForm, notes: t })} placeholderTextColor={Colors.textMuted} placeholder="Optional notes" multiline />
              <Pressable style={styles.saveBtn} onPress={() => {
                if (!poForm.supplierId) return Alert.alert("Error", "Please select a supplier");
                createPOMutation.mutate({ branchId: 1, supplierId: parseInt(poForm.supplierId), status: "draft", notes: poForm.notes || undefined });
              }}>
                <LinearGradient colors={[Colors.accent, Colors.gradientMid]} style={styles.saveBtnGradient}>
                  <Text style={styles.saveBtnText}>Create Order</Text>
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
              <Text style={styles.modalTitle}>Activity Log</Text>
              <Pressable onPress={() => setShowActivityLog(false)}><Ionicons name="close" size={24} color={Colors.text} /></Pressable>
            </View>
            <FlatList
              data={activityLog}
              keyExtractor={(item: any) => String(item.id)}
              scrollEnabled={!!activityLog.length}
              ListEmptyComponent={<Text style={{ color: Colors.textMuted, textAlign: "center", paddingVertical: 20 }}>No activity recorded</Text>}
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
  roleRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  roleChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.surfaceLight },
  roleChipText: { color: Colors.textSecondary, fontSize: 13, fontWeight: "600", textTransform: "capitalize" as const },
  saveBtn: { borderRadius: 14, overflow: "hidden", marginTop: 20, marginBottom: 16 },
  saveBtnGradient: { paddingVertical: 14, alignItems: "center" },
  saveBtnText: { color: Colors.white, fontSize: 16, fontWeight: "700" },
  clockBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  clockBtnText: { fontSize: 13, fontWeight: "700" },
});
