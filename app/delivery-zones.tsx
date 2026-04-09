import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, ActivityIndicator, Alert, Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { Colors } from "@/constants/colors";
import { useLicense } from "@/lib/license-context";
import { getQueryFn, apiRequest, getApiUrl } from "@/lib/query-client";
import { useLanguage } from "@/lib/language-context";

interface DeliveryZone {
  id: number;
  name: string;
  nameAr?: string;
  deliveryFee: number | string;
  minOrderAmount: number | string;
  estimatedMinutes: number;
  radiusKm: number | string;
  isActive: boolean;
}

export default function DeliveryZonesScreen() {
  const { tenant } = useLicense();
  const { language } = useLanguage();
  const tenantId = (tenant as any)?.id;
  const licenseKey = (tenant as any)?.licenseKey || "";
  const qc = useQueryClient();
  const isRTL = language === "ar";

  const [showForm, setShowForm] = useState(false);
  const [editZone, setEditZone] = useState<DeliveryZone | null>(null);
  const [form, setForm] = useState({
    name: "", nameAr: "",
    deliveryFee: "", minOrderAmount: "",
    estimatedMinutes: "30", radiusKm: "5",
  });

  const { data: zones = [], isLoading } = useQuery<DeliveryZone[]>({
    queryKey: [`/api/delivery/manage/zones?tenantId=${tenantId}`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!tenantId,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const url = editZone
        ? `${getApiUrl()}/api/delivery/manage/zones/${editZone.id}`
        : `${getApiUrl()}/api/delivery/manage/zones`;
      const method = editZone ? "PUT" : "POST";
      const resp = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", "x-license-key": licenseKey },
        body: JSON.stringify({ ...data, tenantId }),
      });
      if (!resp.ok) throw new Error("Failed to save zone");
      return resp.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/delivery/manage/zones?tenantId=${tenantId}`] });
      closeForm();
    },
    onError: () => Alert.alert("Error", "Failed to save zone"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const resp = await fetch(`${getApiUrl()}/api/delivery/manage/zones/${id}`, {
        method: "DELETE",
        headers: { "x-license-key": licenseKey },
      });
      if (!resp.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [`/api/delivery/manage/zones?tenantId=${tenantId}`] }),
  });

  const openCreate = () => {
    setEditZone(null);
    setForm({ name: "", nameAr: "", deliveryFee: "", minOrderAmount: "", estimatedMinutes: "30", radiusKm: "5" });
    setShowForm(true);
  };

  const openEdit = (zone: DeliveryZone) => {
    setEditZone(zone);
    setForm({
      name: zone.name,
      nameAr: zone.nameAr || "",
      deliveryFee: String(zone.deliveryFee),
      minOrderAmount: String(zone.minOrderAmount),
      estimatedMinutes: String(zone.estimatedMinutes),
      radiusKm: String(zone.radiusKm),
    });
    setShowForm(true);
  };

  const closeForm = () => { setShowForm(false); setEditZone(null); };

  const handleSave = () => {
    if (!form.name.trim()) { Alert.alert("Error", "Zone name is required"); return; }
    saveMutation.mutate({
      name: form.name.trim(),
      nameAr: form.nameAr.trim() || null,
      deliveryFee: parseFloat(form.deliveryFee) || 0,
      minOrderAmount: parseFloat(form.minOrderAmount) || 0,
      estimatedMinutes: parseInt(form.estimatedMinutes) || 30,
      radiusKm: parseFloat(form.radiusKm) || 5,
      isActive: true,
    });
  };

  const confirmDelete = (zone: DeliveryZone) => {
    Alert.alert("Delete Zone", `Delete "${zone.name}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate(zone.id) },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, isRTL && { flexDirection: "row-reverse" }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name={isRTL ? "chevron-forward" : "chevron-back"} size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isRTL && { textAlign: "right" }]}>
          {language === "ar" ? "مناطق التوصيل" : "Delivery Zones"}
        </Text>
        <TouchableOpacity onPress={openCreate} style={styles.addBtn}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator color={Colors.deliveryPrimary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
          {zones.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={{ fontSize: 40 }}>🗺️</Text>
              <Text style={styles.emptyText}>
                {language === "ar" ? "لا توجد مناطق توصيل بعد" : "No delivery zones yet"}
              </Text>
              <TouchableOpacity style={styles.createBtn} onPress={openCreate}>
                <Text style={styles.createBtnText}>
                  {language === "ar" ? "+ إنشاء منطقة" : "+ Create Zone"}
                </Text>
              </TouchableOpacity>
            </View>
          )}
          {zones.map((zone) => (
            <View key={zone.id} style={styles.zoneCard}>
              <View style={[styles.zoneLeft, isRTL && { flexDirection: "row-reverse" }]}>
                <View style={[styles.zoneIcon, { backgroundColor: zone.isActive ? Colors.deliveryPrimaryLight : Colors.border }]}>
                  <Ionicons name="map" size={20} color={zone.isActive ? Colors.deliveryPrimary : Colors.textMuted} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.zoneName, isRTL && { textAlign: "right" }]}>{isRTL && zone.nameAr ? zone.nameAr : zone.name}</Text>
                  <Text style={[styles.zoneMeta, isRTL && { textAlign: "right" }]}>
                    {language === "ar"
                      ? `رسوم التوصيل: CHF ${Number(zone.deliveryFee).toFixed(2)} · ${zone.estimatedMinutes} دقيقة · ${zone.radiusKm} كم`
                      : `Fee: CHF ${Number(zone.deliveryFee).toFixed(2)} · ${zone.estimatedMinutes} min · ${zone.radiusKm} km`}
                  </Text>
                  <Text style={[styles.zoneMin, isRTL && { textAlign: "right" }]}>
                    {language === "ar" ? `حد أدنى: CHF ${Number(zone.minOrderAmount).toFixed(2)}` : `Min order: CHF ${Number(zone.minOrderAmount).toFixed(2)}`}
                  </Text>
                </View>
              </View>
              <View style={styles.zoneActions}>
                <TouchableOpacity style={styles.editZoneBtn} onPress={() => openEdit(zone)}>
                  <Ionicons name="pencil" size={16} color={Colors.accent} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteZoneBtn} onPress={() => confirmDelete(zone)}>
                  <Ionicons name="trash-outline" size={16} color={Colors.danger} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Create / Edit Modal */}
      <Modal visible={showForm} animationType="slide" transparent onRequestClose={closeForm}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={[styles.modalHeader, isRTL && { flexDirection: "row-reverse" }]}>
              <Text style={styles.modalTitle}>
                {editZone
                  ? (language === "ar" ? "تعديل المنطقة" : "Edit Zone")
                  : (language === "ar" ? "منطقة جديدة" : "New Zone")}
              </Text>
              <TouchableOpacity onPress={closeForm} style={styles.modalClose}>
                <Ionicons name="close" size={22} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
              <Text style={[styles.fieldLabel, isRTL && { textAlign: "right" }]}>
                {language === "ar" ? "اسم المنطقة (إنجليزي)" : "Zone Name"}
              </Text>
              <TextInput
                style={[styles.input, isRTL && { textAlign: "right" }]}
                value={form.name}
                onChangeText={v => setForm(f => ({ ...f, name: v }))}
                placeholder="e.g. Downtown"
                placeholderTextColor={Colors.textMuted}
              />
              <Text style={[styles.fieldLabel, isRTL && { textAlign: "right" }]}>
                {language === "ar" ? "اسم المنطقة (عربي)" : "Zone Name (Arabic)"}
              </Text>
              <TextInput
                style={[styles.input, { textAlign: "right" }]}
                value={form.nameAr}
                onChangeText={v => setForm(f => ({ ...f, nameAr: v }))}
                placeholder="مثلاً: وسط البلد"
                placeholderTextColor={Colors.textMuted}
              />
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, isRTL && { textAlign: "right" }]}>
                    {language === "ar" ? "رسوم التوصيل (CHF)" : "Delivery Fee (CHF)"}
                  </Text>
                  <TextInput
                    style={[styles.input, isRTL && { textAlign: "right" }]}
                    value={form.deliveryFee}
                    onChangeText={v => setForm(f => ({ ...f, deliveryFee: v }))}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, isRTL && { textAlign: "right" }]}>
                    {language === "ar" ? "الحد الأدنى للطلب" : "Min Order (CHF)"}
                  </Text>
                  <TextInput
                    style={[styles.input, isRTL && { textAlign: "right" }]}
                    value={form.minOrderAmount}
                    onChangeText={v => setForm(f => ({ ...f, minOrderAmount: v }))}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
              </View>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, isRTL && { textAlign: "right" }]}>
                    {language === "ar" ? "الوقت المقدر (دقيقة)" : "Est. Time (min)"}
                  </Text>
                  <TextInput
                    style={[styles.input, isRTL && { textAlign: "right" }]}
                    value={form.estimatedMinutes}
                    onChangeText={v => setForm(f => ({ ...f, estimatedMinutes: v }))}
                    keyboardType="number-pad"
                    placeholder="30"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, isRTL && { textAlign: "right" }]}>
                    {language === "ar" ? "نطاق (كيلومتر)" : "Radius (km)"}
                  </Text>
                  <TextInput
                    style={[styles.input, isRTL && { textAlign: "right" }]}
                    value={form.radiusKm}
                    onChangeText={v => setForm(f => ({ ...f, radiusKm: v }))}
                    keyboardType="decimal-pad"
                    placeholder="5"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
              </View>
              <TouchableOpacity
                style={[styles.saveBtn, saveMutation.isPending && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>{editZone ? (language === "ar" ? "حفظ التغييرات" : "Save Changes") : (language === "ar" ? "إنشاء المنطقة" : "Create Zone")}</Text>
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
  zoneCard: { backgroundColor: Colors.card, borderRadius: 14, padding: 14, flexDirection: "row", alignItems: "center", gap: 10 },
  zoneLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  zoneIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  zoneName: { color: Colors.text, fontSize: 15, fontWeight: "700" },
  zoneMeta: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  zoneMin: { color: Colors.textSecondary, fontSize: 11, marginTop: 1 },
  zoneActions: { flexDirection: "row", gap: 8 },
  editZoneBtn: { padding: 8, backgroundColor: Colors.accent + "15", borderRadius: 8 },
  deleteZoneBtn: { padding: 8, backgroundColor: Colors.danger + "15", borderRadius: 8 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: Colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "85%" },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle: { fontSize: 17, fontWeight: "700", color: Colors.text },
  modalClose: { padding: 4 },
  fieldLabel: { color: Colors.textSecondary, fontSize: 12, fontWeight: "600", marginBottom: 4 },
  input: { backgroundColor: Colors.background, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: Colors.text, fontSize: 14, borderWidth: 1, borderColor: Colors.border },
  row: { flexDirection: "row", gap: 12 },
  saveBtn: { backgroundColor: Colors.deliveryPrimary, borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 8 },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
