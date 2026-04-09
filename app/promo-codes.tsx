import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, ActivityIndicator, Alert, Modal, Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { Colors } from "@/constants/colors";
import { useLicense } from "@/lib/license-context";
import { getQueryFn, getApiUrl } from "@/lib/query-client";
import { useLanguage } from "@/lib/language-context";

interface PromoCode {
  id: number;
  code: string;
  description?: string;
  discountType: "percent" | "fixed" | "free_delivery";
  discountValue: number | string;
  minOrderAmount?: number | string;
  maxDiscountCap?: number | string;
  usageLimit?: number;
  usageCount: number;
  validFrom?: string;
  validUntil?: string;
  isActive: boolean;
}

const DISCOUNT_TYPES = [
  { key: "percent", label: "Percent (%)", labelAr: "نسبة مئوية (%)" },
  { key: "fixed", label: "Fixed (CHF)", labelAr: "مبلغ ثابت (CHF)" },
  { key: "free_delivery", label: "Free Delivery", labelAr: "توصيل مجاني" },
];

export default function PromoCodesScreen() {
  const { tenant } = useLicense();
  const { language } = useLanguage();
  const tenantId = (tenant as any)?.id;
  const licenseKey = (tenant as any)?.licenseKey || "";
  const qc = useQueryClient();
  const isRTL = language === "ar";

  const [showForm, setShowForm] = useState(false);
  const [editPromo, setEditPromo] = useState<PromoCode | null>(null);
  const [form, setForm] = useState({
    code: "", description: "",
    discountType: "percent" as "percent" | "fixed" | "free_delivery",
    discountValue: "", minOrderAmount: "", maxDiscountCap: "",
    usageLimit: "", validFrom: "", validUntil: "", isActive: true,
  });

  const { data: promos = [], isLoading } = useQuery<PromoCode[]>({
    queryKey: [`/api/delivery/promos?tenantId=${tenantId}`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!tenantId,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const url = editPromo
        ? `${getApiUrl()}/api/delivery/promos/${editPromo.id}`
        : `${getApiUrl()}/api/delivery/promos`;
      const resp = await fetch(url, {
        method: editPromo ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", "x-license-key": licenseKey },
        body: JSON.stringify({ ...data, tenantId }),
      });
      if (!resp.ok) throw new Error("Failed");
      return resp.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/delivery/promos?tenantId=${tenantId}`] });
      closeForm();
    },
    onError: () => Alert.alert("Error", "Failed to save promo code"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const resp = await fetch(`${getApiUrl()}/api/delivery/promos/${id}`, {
        method: "DELETE",
        headers: { "x-license-key": licenseKey },
      });
      if (!resp.ok) throw new Error("Failed");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [`/api/delivery/promos?tenantId=${tenantId}`] }),
  });

  const openCreate = () => {
    setEditPromo(null);
    setForm({ code: "", description: "", discountType: "percent", discountValue: "", minOrderAmount: "", maxDiscountCap: "", usageLimit: "", validFrom: "", validUntil: "", isActive: true });
    setShowForm(true);
  };

  const openEdit = (p: PromoCode) => {
    setEditPromo(p);
    setForm({
      code: p.code,
      description: p.description || "",
      discountType: p.discountType,
      discountValue: String(p.discountValue),
      minOrderAmount: p.minOrderAmount ? String(p.minOrderAmount) : "",
      maxDiscountCap: p.maxDiscountCap ? String(p.maxDiscountCap) : "",
      usageLimit: p.usageLimit ? String(p.usageLimit) : "",
      validFrom: p.validFrom || "",
      validUntil: p.validUntil || "",
      isActive: p.isActive,
    });
    setShowForm(true);
  };

  const closeForm = () => { setShowForm(false); setEditPromo(null); };

  const handleSave = () => {
    if (!form.code.trim()) { Alert.alert("Error", "Code is required"); return; }
    saveMutation.mutate({
      code: form.code.toUpperCase().trim(),
      description: form.description.trim() || null,
      discountType: form.discountType,
      discountValue: parseFloat(form.discountValue) || 0,
      minOrderAmount: parseFloat(form.minOrderAmount) || 0,
      maxDiscountCap: parseFloat(form.maxDiscountCap) || null,
      usageLimit: parseInt(form.usageLimit) || null,
      validFrom: form.validFrom || null,
      validUntil: form.validUntil || null,
      isActive: form.isActive,
    });
  };

  const confirmDelete = (p: PromoCode) => {
    Alert.alert("Delete Promo?", `Delete code "${p.code}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate(p.id) },
    ]);
  };

  const discountLabel = (p: PromoCode) => {
    if (p.discountType === "percent") return `${p.discountValue}% off`;
    if (p.discountType === "fixed") return `CHF ${Number(p.discountValue).toFixed(2)} off`;
    return "Free delivery";
  };

  const statusColor = (p: PromoCode) => p.isActive ? Colors.success : Colors.textMuted;

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, isRTL && { flexDirection: "row-reverse" }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name={isRTL ? "chevron-forward" : "chevron-back"} size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isRTL && { textAlign: "right" }]}>
          {language === "ar" ? "كودات الخصم" : "Promo Codes"}
        </Text>
        <TouchableOpacity onPress={openCreate} style={styles.addBtn}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator color={Colors.deliveryPrimary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
          {promos.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={{ fontSize: 40 }}>🏷️</Text>
              <Text style={styles.emptyText}>
                {language === "ar" ? "لا توجد كودات بعد" : "No promo codes yet"}
              </Text>
              <TouchableOpacity style={styles.createBtn} onPress={openCreate}>
                <Text style={styles.createBtnText}>
                  {language === "ar" ? "+ إنشاء كود" : "+ Create Code"}
                </Text>
              </TouchableOpacity>
            </View>
          )}
          {promos.map((promo) => (
            <View key={promo.id} style={styles.promoCard}>
              <View style={[styles.promoLeft, isRTL && { flexDirection: "row-reverse" }]}>
                <View style={[styles.codeBadge, { backgroundColor: promo.isActive ? Colors.accent + "20" : Colors.border }]}>
                  <Text style={[styles.codeText, { color: promo.isActive ? Colors.accent : Colors.textMuted }]}>{promo.code}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.discountLabel, isRTL && { textAlign: "right" }]}>{discountLabel(promo)}</Text>
                  {promo.description ? <Text style={[styles.promoDesc, isRTL && { textAlign: "right" }]}>{promo.description}</Text> : null}
                  <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 8, marginTop: 4 }}>
                    <Text style={styles.promoMeta}>{promo.usageCount}/{promo.usageLimit ?? "∞"} {language === "ar" ? "استخدام" : "uses"}</Text>
                    {promo.validUntil && <Text style={styles.promoMeta}>· {language === "ar" ? "حتى" : "until"} {promo.validUntil.slice(0, 10)}</Text>}
                  </View>
                </View>
              </View>
              <View style={styles.promoActions}>
                <View style={[styles.statusDot, { backgroundColor: statusColor(promo) }]} />
                <TouchableOpacity style={styles.editPromoBtn} onPress={() => openEdit(promo)}>
                  <Ionicons name="pencil" size={16} color={Colors.accent} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.deletePromoBtn} onPress={() => confirmDelete(promo)}>
                  <Ionicons name="trash-outline" size={16} color={Colors.danger} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Form Modal */}
      <Modal visible={showForm} animationType="slide" transparent onRequestClose={closeForm}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={[styles.modalHeader, isRTL && { flexDirection: "row-reverse" }]}>
              <Text style={styles.modalTitle}>
                {editPromo ? (language === "ar" ? "تعديل الكود" : "Edit Code") : (language === "ar" ? "كود جديد" : "New Promo Code")}
              </Text>
              <TouchableOpacity onPress={closeForm} style={styles.modalClose}>
                <Ionicons name="close" size={22} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
              <Text style={[styles.fieldLabel, isRTL && { textAlign: "right" }]}>{language === "ar" ? "الكود" : "Code"}</Text>
              <TextInput
                style={[styles.input, { textTransform: "uppercase" }]}
                value={form.code}
                onChangeText={v => setForm(f => ({ ...f, code: v.toUpperCase() }))}
                placeholder="SUMMER20"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="characters"
              />

              <Text style={[styles.fieldLabel, isRTL && { textAlign: "right" }]}>{language === "ar" ? "الوصف (اختياري)" : "Description (optional)"}</Text>
              <TextInput
                style={[styles.input, isRTL && { textAlign: "right" }]}
                value={form.description}
                onChangeText={v => setForm(f => ({ ...f, description: v }))}
                placeholder={language === "ar" ? "مثلاً: خصم صيفي 20%" : "e.g. Summer 20% discount"}
                placeholderTextColor={Colors.textMuted}
              />

              <Text style={[styles.fieldLabel, isRTL && { textAlign: "right" }]}>{language === "ar" ? "نوع الخصم" : "Discount Type"}</Text>
              <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 8 }}>
                {DISCOUNT_TYPES.map(dt => (
                  <TouchableOpacity
                    key={dt.key}
                    style={[styles.typeBtn, form.discountType === dt.key && styles.typeBtnActive]}
                    onPress={() => setForm(f => ({ ...f, discountType: dt.key as any }))}
                  >
                    <Text style={[styles.typeBtnText, form.discountType === dt.key && styles.typeBtnTextActive]}>
                      {isRTL ? dt.labelAr : dt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {form.discountType !== "free_delivery" && (
                <>
                  <Text style={[styles.fieldLabel, isRTL && { textAlign: "right" }]}>
                    {form.discountType === "percent" ? (language === "ar" ? "النسبة (%)" : "Percent (%)") : (language === "ar" ? "المبلغ (CHF)" : "Amount (CHF)")}
                  </Text>
                  <TextInput
                    style={[styles.input, isRTL && { textAlign: "right" }]}
                    value={form.discountValue}
                    onChangeText={v => setForm(f => ({ ...f, discountValue: v }))}
                    keyboardType="decimal-pad"
                    placeholder={form.discountType === "percent" ? "20" : "5.00"}
                    placeholderTextColor={Colors.textMuted}
                  />
                </>
              )}

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, isRTL && { textAlign: "right" }]}>{language === "ar" ? "حد أدنى للطلب" : "Min Order"}</Text>
                  <TextInput
                    style={[styles.input, isRTL && { textAlign: "right" }]}
                    value={form.minOrderAmount}
                    onChangeText={v => setForm(f => ({ ...f, minOrderAmount: v }))}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, isRTL && { textAlign: "right" }]}>{language === "ar" ? "الحد الأقصى للخصم" : "Max Discount"}</Text>
                  <TextInput
                    style={[styles.input, isRTL && { textAlign: "right" }]}
                    value={form.maxDiscountCap}
                    onChangeText={v => setForm(f => ({ ...f, maxDiscountCap: v }))}
                    keyboardType="decimal-pad"
                    placeholder="—"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, isRTL && { textAlign: "right" }]}>{language === "ar" ? "صالح من" : "Valid From"}</Text>
                  <TextInput
                    style={[styles.input, isRTL && { textAlign: "right" }]}
                    value={form.validFrom}
                    onChangeText={v => setForm(f => ({ ...f, validFrom: v }))}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, isRTL && { textAlign: "right" }]}>{language === "ar" ? "صالح حتى" : "Valid Until"}</Text>
                  <TextInput
                    style={[styles.input, isRTL && { textAlign: "right" }]}
                    value={form.validUntil}
                    onChangeText={v => setForm(f => ({ ...f, validUntil: v }))}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
              </View>

              <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={[styles.fieldLabel, { marginBottom: 0 }]}>{language === "ar" ? "مفعّل" : "Active"}</Text>
                <Switch
                  value={form.isActive}
                  onValueChange={v => setForm(f => ({ ...f, isActive: v }))}
                  trackColor={{ true: Colors.deliveryPrimary, false: Colors.border }}
                  thumbColor="#fff"
                />
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, saveMutation.isPending && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>
                    {editPromo ? (language === "ar" ? "حفظ التغييرات" : "Save Changes") : (language === "ar" ? "إنشاء الكود" : "Create Code")}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: "row", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn: { padding: 4, marginRight: 8 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: "700", color: Colors.text },
  addBtn: { backgroundColor: Colors.deliveryPrimary, borderRadius: 8, padding: 6 },
  emptyState: { alignItems: "center", paddingVertical: 60, gap: 12 },
  emptyText: { color: Colors.textMuted, fontSize: 15 },
  createBtn: { backgroundColor: Colors.deliveryPrimary, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10, marginTop: 4 },
  createBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  promoCard: { backgroundColor: Colors.card, borderRadius: 14, padding: 14, flexDirection: "row", alignItems: "center", gap: 10 },
  promoLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  codeBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  codeText: { fontWeight: "800", fontSize: 14, letterSpacing: 1 },
  discountLabel: { color: Colors.text, fontSize: 14, fontWeight: "600" },
  promoDesc: { color: Colors.textSecondary, fontSize: 12, marginTop: 2 },
  promoMeta: { color: Colors.textMuted, fontSize: 11 },
  promoActions: { flexDirection: "row", gap: 8, alignItems: "center" },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  editPromoBtn: { padding: 8, backgroundColor: Colors.accent + "15", borderRadius: 8 },
  deletePromoBtn: { padding: 8, backgroundColor: Colors.danger + "15", borderRadius: 8 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: Colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "90%" },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle: { fontSize: 17, fontWeight: "700", color: Colors.text },
  modalClose: { padding: 4 },
  fieldLabel: { color: Colors.textSecondary, fontSize: 12, fontWeight: "600", marginBottom: 4 },
  input: { backgroundColor: Colors.background, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: Colors.text, fontSize: 14, borderWidth: 1, borderColor: Colors.border },
  row: { flexDirection: "row", gap: 12 },
  typeBtn: { flex: 1, borderRadius: 8, paddingVertical: 8, alignItems: "center", backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  typeBtnActive: { backgroundColor: Colors.deliveryPrimaryLight, borderColor: Colors.deliveryPrimary },
  typeBtnText: { color: Colors.textMuted, fontSize: 11, fontWeight: "600", textAlign: "center" },
  typeBtnTextActive: { color: Colors.deliveryPrimary },
  saveBtn: { backgroundColor: Colors.deliveryPrimary, borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 8 },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
