import React, { useState } from "react";
import {
  StyleSheet, Text, View, FlatList, Pressable, TextInput,
  Modal, Alert, ScrollView, Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Colors } from "@/constants/colors";
import { apiRequest, getQueryFn } from "@/lib/query-client";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";

export default function CustomersScreen() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { canManage } = useAuth();
  const { t, isRTL, rtlTextAlign, rtlText } = useLanguage();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editCustomer, setEditCustomer] = useState<any>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "", notes: "" });
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [showDetail, setShowDetail] = useState(false);

  const { data: customers = [] } = useQuery<any[]>({
    queryKey: ["/api/customers", search ? `?search=${search}` : ""],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const { data: customerSales = [] } = useQuery<any[]>({
    queryKey: [`/api/customers/${selectedCustomer?.id}/sales`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!selectedCustomer?.id,
  });

  const saveMutation = useMutation({
    mutationFn: (data: any) => apiRequest(editCustomer ? "PUT" : "POST", editCustomer ? `/api/customers/${editCustomer.id}` : "/api/customers", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/customers"] });
      setShowForm(false);
      setEditCustomer(null);
      setForm({ name: "", email: "", phone: "", address: "", notes: "" });
    },
    onError: (e: any) => Alert.alert(t("error"), e.message),
  });

  const openEdit = (c: any) => {
    setEditCustomer(c);
    setForm({ name: c.name, email: c.email || "", phone: c.phone || "", address: c.address || "", notes: c.notes || "" });
    setShowForm(true);
  };

  const handleSave = () => {
    if (!form.name) return Alert.alert(t("error"), t("customerName"));
    saveMutation.mutate({ name: form.name, email: form.email || undefined, phone: form.phone || undefined, address: form.address || undefined, notes: form.notes || undefined });
  };

  const topPad = Platform.OS === "web" ? 67 : 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top + topPad, direction: isRTL ? "rtl" : "ltr" }]}>
      <LinearGradient colors={[Colors.gradientStart, Colors.gradientMid]} style={[styles.header, isRTL && { flexDirection: "row-reverse" }]}>
        <Text style={[styles.headerTitle, rtlTextAlign]}>{t("customers")}</Text>
        {canManage && (
          <Pressable style={styles.addBtn} onPress={() => { setEditCustomer(null); setForm({ name: "", email: "", phone: "", address: "", notes: "" }); setShowForm(true); }}>
            <Ionicons name="add" size={24} color={Colors.white} />
          </Pressable>
        )}
      </LinearGradient>

      <View style={styles.searchRow}>
        <View style={[styles.searchBox, isRTL && { flexDirection: "row-reverse" }]}>
          <Ionicons name="search" size={18} color={Colors.textMuted} />
          <TextInput style={[styles.searchInput, isRTL ? { marginRight: 8, marginLeft: 0 } : { marginLeft: 8 }, rtlTextAlign, rtlText]} placeholder={t("search") + "..."} placeholderTextColor={Colors.textMuted} value={search} onChangeText={setSearch} />
        </View>
      </View>

      <FlatList
        data={customers}
        keyExtractor={(item: any) => String(item.id)}
        contentContainerStyle={styles.list}
        scrollEnabled={!!customers.length}
        renderItem={({ item }: { item: any }) => (
          <Pressable style={[styles.card, isRTL && { flexDirection: "row-reverse" }]} onPress={() => { setSelectedCustomer(item); setShowDetail(true); }}>
            <View style={[styles.avatar, isRTL ? { marginLeft: 12, marginRight: 0 } : { marginRight: 12 }]}>
              <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.cardInfo}>
              <Text style={[styles.cardName, rtlTextAlign]}>{item.name}</Text>
              <Text style={[styles.cardMeta, rtlTextAlign]}>{item.phone || item.email || t("noContactInfo")}</Text>
            </View>
            <View style={[styles.cardRight, isRTL && { alignItems: "flex-start" }]}>
              <View style={[styles.loyaltyBadge, isRTL && { flexDirection: "row-reverse" }]}>
                <Ionicons name="star" size={12} color={Colors.warning} />
                <Text style={styles.loyaltyText}>{item.loyaltyPoints || 0}</Text>
              </View>
              <Text style={styles.totalSpent}>CHF {Number(item.totalSpent || 0).toFixed(0)}</Text>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={<View style={styles.empty}><Ionicons name="people-outline" size={48} color={Colors.textMuted} /><Text style={[styles.emptyText, rtlTextAlign]}>{t("noCustomers")}</Text></View>}
      />

      <Modal visible={showForm} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.modalHeader, isRTL && { flexDirection: "row-reverse" }]}>
              <Text style={[styles.modalTitle, rtlTextAlign]}>{editCustomer ? t("edit") + " " + t("customers") : t("addCustomer")}</Text>
              <Pressable onPress={() => setShowForm(false)}><Ionicons name="close" size={24} color={Colors.text} /></Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.label, rtlTextAlign]}>{t("customerName")} *</Text>
              <TextInput style={[styles.input, rtlTextAlign, rtlText]} value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} placeholderTextColor={Colors.textMuted} placeholder={t("customerName")} />
              <Text style={[styles.label, rtlTextAlign]}>{t("phone")}</Text>
              <TextInput style={[styles.input, rtlTextAlign, rtlText]} value={form.phone} onChangeText={(v) => setForm({ ...form, phone: v })} keyboardType="phone-pad" placeholderTextColor={Colors.textMuted} placeholder="+1234567890" />
              <Text style={[styles.label, rtlTextAlign]}>{t("email")}</Text>
              <TextInput style={[styles.input, rtlTextAlign, rtlText]} value={form.email} onChangeText={(v) => setForm({ ...form, email: v })} keyboardType="email-address" placeholderTextColor={Colors.textMuted} placeholder="email@example.com" autoCapitalize="none" />
              <Text style={[styles.label, rtlTextAlign]}>{t("address")}</Text>
              <TextInput style={[styles.input, rtlTextAlign, rtlText]} value={form.address} onChangeText={(v) => setForm({ ...form, address: v })} placeholderTextColor={Colors.textMuted} placeholder={t("address")} />
              <Text style={[styles.label, rtlTextAlign]}>{t("notes")}</Text>
              <TextInput style={[styles.input, { height: 80, textAlignVertical: "top" }, rtlTextAlign, rtlText]} value={form.notes} onChangeText={(v) => setForm({ ...form, notes: v })} multiline placeholderTextColor={Colors.textMuted} placeholder={t("notes")} />
              <Pressable style={styles.saveBtn} onPress={handleSave}>
                <LinearGradient colors={[Colors.accent, Colors.gradientMid]} style={styles.saveBtnGradient}>
                  <Text style={styles.saveBtnText}>{editCustomer ? t("save") : t("addCustomer")}</Text>
                </LinearGradient>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showDetail} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: "90%" }]}>
            <View style={[styles.modalHeader, isRTL && { flexDirection: "row-reverse" }]}>
              <Text style={[styles.modalTitle, rtlTextAlign]}>{t("customerDetails")}</Text>
              <Pressable onPress={() => setShowDetail(false)}><Ionicons name="close" size={24} color={Colors.text} /></Pressable>
            </View>
            
            {selectedCustomer && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={{ alignItems: "center", marginBottom: 20 }}>
                  <View style={[styles.avatar, { width: 64, height: 64, borderRadius: 32, marginRight: 0, marginBottom: 10 }]}>
                    <Text style={[styles.avatarText, { fontSize: 28 }]}>{selectedCustomer.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <Text style={{ color: Colors.text, fontSize: 20, fontWeight: "700" }}>{selectedCustomer.name}</Text>
                  {selectedCustomer.phone && <Text style={{ color: Colors.textMuted, fontSize: 13, marginTop: 4 }}>{selectedCustomer.phone}</Text>}
                  {selectedCustomer.email && <Text style={{ color: Colors.textMuted, fontSize: 13, marginTop: 2 }}>{selectedCustomer.email}</Text>}
                </View>

                <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 8, marginBottom: 16 }}>
                  <View style={{ flex: 1, backgroundColor: Colors.surfaceLight, borderRadius: 14, padding: 14, alignItems: "center" }}>
                    <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 4, marginBottom: 4 }}>
                      <Ionicons name="star" size={16} color={Colors.warning} />
                      <Text style={{ color: Colors.warning, fontSize: 20, fontWeight: "800" }}>{selectedCustomer.loyaltyPoints || 0}</Text>
                    </View>
                    <Text style={{ color: Colors.textMuted, fontSize: 11 }}>{t("loyaltyPoints")}</Text>
                  </View>
                  <View style={{ flex: 1, backgroundColor: Colors.surfaceLight, borderRadius: 14, padding: 14, alignItems: "center" }}>
                    <Text style={{ color: Colors.accent, fontSize: 20, fontWeight: "800" }}>CHF {Number(selectedCustomer.totalSpent || 0).toFixed(0)}</Text>
                    <Text style={{ color: Colors.textMuted, fontSize: 11 }}>{t("totalSpent")}</Text>
                  </View>
                  <View style={{ flex: 1, backgroundColor: Colors.surfaceLight, borderRadius: 14, padding: 14, alignItems: "center" }}>
                    <Text style={{ color: Colors.info, fontSize: 20, fontWeight: "800" }}>{selectedCustomer.visitCount || 0}</Text>
                    <Text style={{ color: Colors.textMuted, fontSize: 11 }}>{t("visits")}</Text>
                  </View>
                </View>

                {selectedCustomer.address && (
                  <View style={{ backgroundColor: Colors.surfaceLight, borderRadius: 12, padding: 12, marginBottom: 12 }}>
                    <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <Ionicons name="location-outline" size={14} color={Colors.textMuted} />
                      <Text style={[{ color: Colors.textSecondary, fontSize: 12, fontWeight: "600" }, rtlTextAlign]}>{t("address").toUpperCase()}</Text>
                    </View>
                    <Text style={[{ color: Colors.text, fontSize: 14 }, rtlTextAlign]}>{selectedCustomer.address}</Text>
                  </View>
                )}

                {selectedCustomer.notes && (
                  <View style={{ backgroundColor: Colors.surfaceLight, borderRadius: 12, padding: 12, marginBottom: 12 }}>
                    <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <Ionicons name="document-text-outline" size={14} color={Colors.textMuted} />
                      <Text style={[{ color: Colors.textSecondary, fontSize: 12, fontWeight: "600" }, rtlTextAlign]}>{t("notes").toUpperCase()}</Text>
                    </View>
                    <Text style={[{ color: Colors.text, fontSize: 14 }, rtlTextAlign]}>{selectedCustomer.notes}</Text>
                  </View>
                )}

                {canManage && (
                  <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 8, marginBottom: 16 }}>
                    <Pressable style={{ flex: 1, borderRadius: 12, overflow: "hidden" }} onPress={() => { setShowDetail(false); openEdit(selectedCustomer); }}>
                      <LinearGradient colors={[Colors.accent, Colors.gradientMid]} style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", justifyContent: "center", paddingVertical: 12, gap: 6 }}>
                        <Ionicons name="create-outline" size={18} color={Colors.white} />
                        <Text style={{ color: Colors.white, fontSize: 14, fontWeight: "600" }}>{t("edit")}</Text>
                      </LinearGradient>
                    </Pressable>
                  </View>
                )}

                <Text style={[{ color: Colors.textSecondary, fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }, rtlTextAlign]}>{t("purchaseHistory")}</Text>
                
                {customerSales.length === 0 ? (
                  <View style={{ alignItems: "center", paddingVertical: 24 }}>
                    <Ionicons name="receipt-outline" size={36} color={Colors.textMuted} />
                    <Text style={{ color: Colors.textMuted, fontSize: 13, marginTop: 8 }}>{t("noPurchases")}</Text>
                  </View>
                ) : (
                  customerSales.map((sale: any) => (
                    <View key={sale.id} style={{ backgroundColor: Colors.surfaceLight, borderRadius: 12, padding: 12, marginBottom: 8 }}>
                      <View style={{ flexDirection: isRTL ? "row-reverse" : "row", justifyContent: "space-between", alignItems: "center" }}>
                        <Text style={[{ color: Colors.text, fontSize: 14, fontWeight: "600" }, rtlTextAlign]}>Sale #{sale.id}</Text>
                        <Text style={{ color: Colors.accent, fontSize: 14, fontWeight: "700" }}>CHF {Number(sale.totalAmount || 0).toFixed(2)}</Text>
                      </View>
                      <View style={{ flexDirection: isRTL ? "row-reverse" : "row", justifyContent: "space-between", marginTop: 4 }}>
                        <Text style={{ color: Colors.textMuted, fontSize: 12 }}>
                          {sale.createdAt ? new Date(sale.createdAt).toLocaleDateString() : "N/A"}
                        </Text>
                        <View style={{ backgroundColor: sale.paymentMethod === "cash" ? Colors.accent + "20" : Colors.secondary + "20", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                          <Text style={{ color: sale.paymentMethod === "cash" ? Colors.accent : Colors.secondary, fontSize: 11, fontWeight: "600", textTransform: "capitalize" }}>{sale.paymentMethod || "cash"}</Text>
                        </View>
                      </View>
                    </View>
                  ))
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <View style={{ height: Platform.OS === "web" ? 84 : 60 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14 },
  headerTitle: { fontSize: 22, fontWeight: "800", color: Colors.white },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.15)", justifyContent: "center", alignItems: "center" },
  searchRow: { paddingHorizontal: 12, paddingVertical: 10 },
  searchBox: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.inputBg, borderRadius: 12, paddingHorizontal: 12, height: 42, borderWidth: 1, borderColor: Colors.inputBorder },
  searchInput: { flex: 1, color: Colors.text, fontSize: 15 },
  list: { paddingHorizontal: 12 },
  card: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.surface, borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: Colors.cardBorder },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.gradientMid, justifyContent: "center", alignItems: "center" },
  avatarText: { color: Colors.white, fontSize: 18, fontWeight: "800" },
  cardInfo: { flex: 1 },
  cardName: { color: Colors.text, fontSize: 15, fontWeight: "600" },
  cardMeta: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  cardRight: { alignItems: "flex-end", gap: 4 },
  loyaltyBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(245,158,11,0.15)", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  loyaltyText: { color: Colors.warning, fontSize: 12, fontWeight: "700" },
  totalSpent: { color: Colors.textMuted, fontSize: 12 },
  empty: { alignItems: "center", paddingVertical: 60 },
  emptyText: { color: Colors.textMuted, fontSize: 15, marginTop: 12 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", alignItems: "center" },
  modalContent: { backgroundColor: Colors.surface, borderRadius: 20, padding: 24, width: "90%", maxWidth: 460, maxHeight: "85%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { color: Colors.text, fontSize: 20, fontWeight: "700" },
  label: { color: Colors.textSecondary, fontSize: 12, fontWeight: "600", marginBottom: 6, marginTop: 12, textTransform: "uppercase" as const, letterSpacing: 0.5 },
  input: { backgroundColor: Colors.inputBg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: Colors.text, fontSize: 15, borderWidth: 1, borderColor: Colors.inputBorder },
  saveBtn: { borderRadius: 14, overflow: "hidden", marginTop: 20, marginBottom: 16 },
  saveBtnGradient: { paddingVertical: 14, alignItems: "center" },
  saveBtnText: { color: Colors.white, fontSize: 16, fontWeight: "700" },
});
