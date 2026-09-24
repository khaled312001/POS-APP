import React, { useState } from "react";
import {
  View, Text, ScrollView, TextInput, Pressable,
  ActivityIndicator, Alert, Modal, Switch, Platform, KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { Colors } from "@/constants/colors";
import { themedStyles } from "@/lib/themed-styles";
import { useLicense } from "@/lib/license-context";
import { getQueryFn, apiRequest, apiErrorMessage } from "@/lib/query-client";
import { useLanguage } from "@/lib/language-context";
import { formatMoney, currencyLabel, isZeroDecimalCurrency } from "@/lib/currency";

interface DeliveryZone {
  id: number;
  name: string;
  nameAr?: string | null;
  deliveryFee: number | string | null;
  minOrderAmount: number | string | null;
  estimatedMinutes: number | null;
  radiusKm: number | string | null;
  isActive: boolean;
}

const toAsciiDigits = (v: string) => v.replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x0660));

/** Digits plus one decimal point (max 2 places) — no decimals at all for zero-decimal currencies. */
function cleanMoney(v: string): string {
  const ascii = toAsciiDigits(v).replace(",", ".");
  if (isZeroDecimalCurrency()) return ascii.replace(/\D/g, "");
  const [int, ...rest] = ascii.replace(/[^\d.]/g, "").split(".");
  return rest.length ? `${int}.${rest.join("").slice(0, 2)}` : int;
}

function cleanDecimal(v: string, places: number): string {
  const ascii = toAsciiDigits(v).replace(",", ".");
  const [int, ...rest] = ascii.replace(/[^\d.]/g, "").split(".");
  return rest.length ? `${int}.${rest.join("").slice(0, places)}` : int;
}

const cleanInt = (v: string) => toAsciiDigits(v).replace(/\D/g, "");

/** A stored number (maybe "12.50", maybe null) as form text, without "null" or trailing zeros. */
const numText = (v: unknown, fallback = "") => {
  if (v === null || v === undefined || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? String(n) : fallback;
};

const blankForm = () => ({
  name: "", nameAr: "",
  deliveryFee: "", minOrderAmount: "",
  estimatedMinutes: "30", radiusKm: "5",
  isActive: true,
});

export default function DeliveryZonesScreen() {
  const { tenant } = useLicense();
  const { language } = useLanguage();
  const tenantId = (tenant as any)?.id;
  const qc = useQueryClient();
  const isRTL = language === "ar";
  const tr = (en: string, de: string, ar: string) => (language === "ar" ? ar : language === "de" ? de : en);
  const listKey = [`/api/delivery/manage/zones?tenantId=${tenantId}`];
  const zeroDecimal = isZeroDecimalCurrency();
  const moneyPlaceholder = zeroDecimal ? "0" : "0.00";

  const [showForm, setShowForm] = useState(false);
  const [editZone, setEditZone] = useState<DeliveryZone | null>(null);
  const [form, setForm] = useState(blankForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const { data: zones = [], isLoading, isError, refetch } = useQuery<DeliveryZone[]>({
    queryKey: listKey,
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!tenantId,
  });

  const notify = (title: string, message: string) => {
    if (Platform.OS === "web" && typeof window !== "undefined") window.alert(`${title}\n\n${message}`);
    else Alert.alert(title, message);
  };
  const errorTitle = tr("Error", "Fehler", "خطأ");

  const saveMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = editZone
        ? await apiRequest("PUT", `/api/delivery/manage/zones/${editZone.id}`, data)
        : await apiRequest("POST", "/api/delivery/manage/zones", { ...data, tenantId });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: listKey });
      closeForm();
    },
    onError: (e) => setFormError(`${tr("Could not save the zone", "Zone konnte nicht gespeichert werden", "تعذّر حفظ المنطقة")}: ${apiErrorMessage(e)}`),
  });

  const toggleMutation = useMutation({
    mutationFn: async (z: DeliveryZone) => {
      setBusyId(z.id);
      await apiRequest("PUT", `/api/delivery/manage/zones/${z.id}`, { isActive: !z.isActive });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: listKey }),
    onError: (e) => notify(errorTitle, apiErrorMessage(e)),
    onSettled: () => setBusyId(null),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      setBusyId(id);
      await apiRequest("DELETE", `/api/delivery/manage/zones/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: listKey }),
    onError: (e) => notify(errorTitle, `${tr("Could not delete the zone", "Zone konnte nicht gelöscht werden", "تعذّر حذف المنطقة")}: ${apiErrorMessage(e)}`),
    onSettled: () => setBusyId(null),
  });

  const openCreate = () => {
    setEditZone(null);
    setForm(blankForm());
    setFormError(null);
    setShowForm(true);
  };

  const openEdit = (zone: DeliveryZone) => {
    setEditZone(zone);
    setForm({
      name: zone.name || "",
      nameAr: zone.nameAr || "",
      deliveryFee: numText(zone.deliveryFee),
      minOrderAmount: numText(zone.minOrderAmount),
      estimatedMinutes: numText(zone.estimatedMinutes, "30"),
      radiusKm: numText(zone.radiusKm),
      isActive: zone.isActive !== false,
    });
    setFormError(null);
    setShowForm(true);
  };

  const closeForm = () => { setShowForm(false); setEditZone(null); setFormError(null); };

  const handleSave = () => {
    if (saveMutation.isPending) return;
    const name = form.name.trim();
    const nameAr = form.nameAr.trim();
    if (!name) return setFormError(tr("Zone name is required.", "Zonenname ist erforderlich.", "اسم المنطقة مطلوب."));
    if (zones.some((z) => z.name.trim().toLowerCase() === name.toLowerCase() && z.id !== editZone?.id)) {
      return setFormError(tr(`A zone named "${name}" already exists.`, `Eine Zone „${name}" existiert bereits.`, `توجد منطقة باسم "${name}" مسبقاً.`));
    }
    const fee = form.deliveryFee ? Number(form.deliveryFee) : 0;
    if (!Number.isFinite(fee) || fee < 0) return setFormError(tr("Delivery fee must be 0 or more.", "Liefergebühr muss 0 oder mehr sein.", "يجب أن تكون رسوم التوصيل 0 أو أكثر."));
    const minOrder = form.minOrderAmount ? Number(form.minOrderAmount) : 0;
    if (!Number.isFinite(minOrder) || minOrder < 0) return setFormError(tr("Minimum order must be 0 or more.", "Mindestbestellwert muss 0 oder mehr sein.", "يجب أن يكون الحد الأدنى للطلب 0 أو أكثر."));
    const minutes = form.estimatedMinutes ? parseInt(form.estimatedMinutes, 10) : NaN;
    if (!(minutes >= 1 && minutes <= 600)) return setFormError(tr("Estimated time must be between 1 and 600 minutes.", "Geschätzte Zeit muss zwischen 1 und 600 Minuten liegen.", "يجب أن يكون الوقت المقدر بين 1 و600 دقيقة."));
    const radius = form.radiusKm ? Number(form.radiusKm) : NaN;
    if (!(radius > 0 && radius <= 999.99)) return setFormError(tr("Radius must be greater than 0 and at most 999.99 km.", "Radius muss größer als 0 und höchstens 999,99 km sein.", "يجب أن يكون النطاق أكبر من 0 ولا يتجاوز 999.99 كم."));

    setFormError(null);
    saveMutation.mutate({
      name,
      nameAr: nameAr || null,
      deliveryFee: fee,
      minOrderAmount: minOrder,
      estimatedMinutes: minutes,
      radiusKm: radius,
      isActive: form.isActive,
    });
  };

  const confirmDelete = (zone: DeliveryZone) => {
    const title = tr("Delete zone?", "Zone löschen?", "حذف المنطقة؟");
    const label = isRTL && zone.nameAr ? zone.nameAr : zone.name;
    const msg = tr(`"${label}" will be deleted permanently.`, `„${label}" wird dauerhaft gelöscht.`, `سيتم حذف "${label}" نهائياً.`);
    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && window.confirm(`${title}\n\n${msg}`)) deleteMutation.mutate(zone.id);
      return;
    }
    Alert.alert(title, msg, [
      { text: tr("Cancel", "Abbrechen", "إلغاء"), style: "cancel" },
      { text: tr("Delete", "Löschen", "حذف"), style: "destructive", onPress: () => deleteMutation.mutate(zone.id) },
    ]);
  };

  const align = isRTL ? ({ textAlign: "right" } as const) : null;
  const minLabel = tr("min", "Min.", "دقيقة");
  const kmLabel = tr("km", "km", "كم");

  return (
    <SafeAreaView style={[styles.container, { direction: isRTL ? "rtl" : "ltr" }]}>
      {/* The root sets the layout direction, so plain "row" already runs right-to-left in Arabic. */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerIconBtn} hitSlop={6} accessibilityRole="button" accessibilityLabel={tr("Back", "Zurück", "رجوع")}>
          <Ionicons name={isRTL ? "chevron-forward" : "chevron-back"} size={24} color={Colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, align]} numberOfLines={1}>
          {tr("Delivery Zones", "Liefergebiete", "مناطق التوصيل")}
        </Text>
        <Pressable onPress={openCreate} style={styles.addBtn} accessibilityRole="button" accessibilityLabel={tr("New zone", "Neue Zone", "منطقة جديدة")}>
          <Ionicons name="add" size={22} color="#fff" />
        </Pressable>
      </View>

      {isLoading ? (
        <ActivityIndicator color={Colors.deliveryPrimary} style={{ marginTop: 40 }} />
      ) : isError ? (
        <View style={styles.emptyState}>
          <Ionicons name="cloud-offline-outline" size={40} color={Colors.danger} />
          <Text style={[styles.emptyText, { textAlign: "center" }]}>
            {tr("Could not load delivery zones.", "Liefergebiete konnten nicht geladen werden.", "تعذّر تحميل مناطق التوصيل.")}
          </Text>
          <Pressable style={styles.secondaryBtn} onPress={() => refetch()} accessibilityRole="button">
            <Ionicons name="refresh" size={16} color={Colors.accent} />
            <Text style={styles.secondaryBtnText}>{tr("Retry", "Erneut versuchen", "إعادة المحاولة")}</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}>
          {zones.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="map-outline" size={40} color={Colors.textMuted} />
              <Text style={styles.emptyText}>{tr("No delivery zones yet", "Noch keine Liefergebiete", "لا توجد مناطق توصيل بعد")}</Text>
              <Pressable style={styles.createBtn} onPress={openCreate} accessibilityRole="button">
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={styles.createBtnText}>{tr("Create zone", "Zone erstellen", "إنشاء منطقة")}</Text>
              </Pressable>
            </View>
          )}
          {zones.map((zone) => {
            const busy = busyId === zone.id;
            const active = zone.isActive !== false;
            return (
              <View key={zone.id} style={[styles.zoneCard, !active && { opacity: 0.75 }]}>
                <View style={styles.zoneTop}>
                  <View style={[styles.zoneIcon, { backgroundColor: active ? Colors.deliveryPrimaryLight : Colors.border }]}>
                    <Ionicons name="map" size={20} color={active ? Colors.deliveryPrimary : Colors.textMuted} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[styles.zoneName, align]} numberOfLines={1}>{isRTL && zone.nameAr ? zone.nameAr : zone.name}</Text>
                    <Text style={[styles.zoneStatus, { color: active ? Colors.success : Colors.textMuted }, align]}>
                      {active ? tr("Active", "Aktiv", "مفعّلة") : tr("Inactive", "Inaktiv", "غير مفعّلة")}
                    </Text>
                  </View>
                  {busy ? (
                    <ActivityIndicator size="small" color={Colors.accent} />
                  ) : (
                    <Switch
                      value={active}
                      onValueChange={() => toggleMutation.mutate(zone)}
                      trackColor={{ true: Colors.deliveryPrimary, false: Colors.border }}
                      thumbColor="#fff"
                      accessibilityLabel={tr("Active", "Aktiv", "مفعّلة")}
                    />
                  )}
                </View>
                <View style={styles.statsRow}>
                  <View style={styles.statChip}>
                    <Text style={styles.statChipLabel}>{tr("Fee", "Gebühr", "الرسوم")}</Text>
                    <Text style={styles.statChipValue} numberOfLines={1}>{formatMoney(zone.deliveryFee || 0, 2, { group: true })}</Text>
                  </View>
                  <View style={styles.statChip}>
                    <Text style={styles.statChipLabel}>{tr("Min. order", "Mindestbestellung", "حد أدنى")}</Text>
                    <Text style={styles.statChipValue} numberOfLines={1}>{formatMoney(zone.minOrderAmount || 0, 2, { group: true })}</Text>
                  </View>
                  <View style={styles.statChip}>
                    <Text style={styles.statChipLabel}>{tr("Time", "Zeit", "الوقت")}</Text>
                    <Text style={styles.statChipValue} numberOfLines={1}>{zone.estimatedMinutes ?? "—"} {minLabel}</Text>
                  </View>
                  <View style={styles.statChip}>
                    <Text style={styles.statChipLabel}>{tr("Radius", "Radius", "النطاق")}</Text>
                    <Text style={styles.statChipValue} numberOfLines={1}>{zone.radiusKm != null ? `${Number(zone.radiusKm)} ${kmLabel}` : "—"}</Text>
                  </View>
                </View>
                <View style={styles.cardActions}>
                  <Pressable style={styles.editZoneBtn} onPress={() => openEdit(zone)} disabled={busy} accessibilityRole="button">
                    <Ionicons name="pencil" size={16} color={Colors.accent} />
                    <Text style={{ color: Colors.accent, fontWeight: "700", fontSize: 13 }}>{tr("Edit", "Bearbeiten", "تعديل")}</Text>
                  </Pressable>
                  <Pressable style={styles.deleteZoneBtn} onPress={() => confirmDelete(zone)} disabled={busy} accessibilityRole="button" accessibilityLabel={tr("Delete", "Löschen", "حذف")}>
                    <Ionicons name="trash-outline" size={16} color={Colors.danger} />
                  </Pressable>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Create / Edit Modal */}
      <Modal visible={showForm} animationType="slide" transparent onRequestClose={closeForm}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { direction: isRTL ? "rtl" : "ltr" }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { flex: 1 }, align]} numberOfLines={1}>
                {editZone ? tr("Edit zone", "Zone bearbeiten", "تعديل المنطقة") : tr("New zone", "Neue Zone", "منطقة جديدة")}
              </Text>
              <Pressable onPress={closeForm} style={styles.headerIconBtn} accessibilityRole="button" accessibilityLabel={tr("Close", "Schließen", "إغلاق")}>
                <Ionicons name="close" size={22} color={Colors.textMuted} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 28 }} keyboardShouldPersistTaps="handled">
              <Text style={[styles.fieldLabel, align]}>{tr("Zone name", "Zonenname", "اسم المنطقة (لاتيني)")}</Text>
              <TextInput
                style={[styles.input, align]}
                value={form.name}
                onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
                placeholder={tr("e.g. Downtown", "z. B. Innenstadt", "مثلاً: Downtown")}
                placeholderTextColor={Colors.textMuted}
                maxLength={100}
              />
              <Text style={[styles.fieldLabel, align]}>{tr("Zone name (Arabic, optional)", "Zonenname (Arabisch, optional)", "اسم المنطقة (عربي، اختياري)")}</Text>
              <TextInput
                style={[styles.input, { textAlign: "right", writingDirection: "rtl" }]}
                value={form.nameAr}
                onChangeText={(v) => setForm((f) => ({ ...f, nameAr: v }))}
                placeholder="مثلاً: وسط البلد"
                placeholderTextColor={Colors.textMuted}
                maxLength={100}
              />
              <View style={styles.row}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.fieldLabel, align]} numberOfLines={1}>{tr(`Delivery fee (${currencyLabel()})`, `Liefergebühr (${currencyLabel()})`, `رسوم التوصيل (${currencyLabel()})`)}</Text>
                  <TextInput
                    style={[styles.input, align]}
                    value={form.deliveryFee}
                    onChangeText={(v) => setForm((f) => ({ ...f, deliveryFee: cleanMoney(v) }))}
                    keyboardType={zeroDecimal ? "number-pad" : "decimal-pad"}
                    placeholder={moneyPlaceholder}
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.fieldLabel, align]} numberOfLines={1}>{tr(`Min. order (${currencyLabel()})`, `Mindestbestellung (${currencyLabel()})`, `الحد الأدنى للطلب (${currencyLabel()})`)}</Text>
                  <TextInput
                    style={[styles.input, align]}
                    value={form.minOrderAmount}
                    onChangeText={(v) => setForm((f) => ({ ...f, minOrderAmount: cleanMoney(v) }))}
                    keyboardType={zeroDecimal ? "number-pad" : "decimal-pad"}
                    placeholder={moneyPlaceholder}
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
              </View>
              <View style={styles.row}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.fieldLabel, align]} numberOfLines={1}>{tr("Est. time (min)", "Gesch. Zeit (Min.)", "الوقت المقدر (دقيقة)")}</Text>
                  <TextInput
                    style={[styles.input, align]}
                    value={form.estimatedMinutes}
                    onChangeText={(v) => setForm((f) => ({ ...f, estimatedMinutes: cleanInt(v).slice(0, 3) }))}
                    keyboardType="number-pad"
                    placeholder="30"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.fieldLabel, align]} numberOfLines={1}>{tr("Radius (km)", "Radius (km)", "النطاق (كم)")}</Text>
                  <TextInput
                    style={[styles.input, align]}
                    value={form.radiusKm}
                    onChangeText={(v) => setForm((f) => ({ ...f, radiusKm: cleanDecimal(v, 2).slice(0, 6) }))}
                    keyboardType="decimal-pad"
                    placeholder="5"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
              </View>

              <View style={styles.switchRow}>
                <Text style={[styles.fieldLabel, { marginBottom: 0, flex: 1 }, align]}>{tr("Active", "Aktiv", "مفعّلة")}</Text>
                <Switch
                  value={form.isActive}
                  onValueChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
                  trackColor={{ true: Colors.deliveryPrimary, false: Colors.border }}
                  thumbColor="#fff"
                />
              </View>

              {formError ? (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={16} color={Colors.danger} />
                  <Text style={[styles.errorText, align]}>{formError}</Text>
                </View>
              ) : null}

              <Pressable
                style={[styles.saveBtn, saveMutation.isPending && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={saveMutation.isPending}
                accessibilityRole="button"
              >
                {saveMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>{editZone ? tr("Save changes", "Änderungen speichern", "حفظ التغييرات") : tr("Create zone", "Zone erstellen", "إنشاء المنطقة")}</Text>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = themedStyles((Colors) => ({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerIconBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: "700", color: Colors.text },
  addBtn: { backgroundColor: Colors.deliveryPrimary, borderRadius: 12, width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  emptyState: { alignItems: "center", paddingVertical: 60, paddingHorizontal: 24, gap: 12 },
  emptyText: { color: Colors.textMuted, fontSize: 15 },
  createBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: Colors.deliveryPrimary, borderRadius: 12, paddingHorizontal: 20, minHeight: 44, marginTop: 4 },
  createBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  secondaryBtn: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 44, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: Colors.accent + "55", backgroundColor: Colors.accent + "12" },
  secondaryBtnText: { color: Colors.accent, fontWeight: "700", fontSize: 13 },
  zoneCard: { backgroundColor: Colors.card, borderRadius: 14, padding: 14, gap: 10, borderWidth: 1, borderColor: Colors.border },
  zoneTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  zoneIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  zoneName: { color: Colors.text, fontSize: 15, fontWeight: "700" },
  zoneStatus: { fontSize: 12, fontWeight: "600", marginTop: 2 },
  statsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statChip: { flexGrow: 1, flexBasis: 120, backgroundColor: Colors.background, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  statChipLabel: { color: Colors.textMuted, fontSize: 11, fontWeight: "600" },
  statChipValue: { color: Colors.text, fontSize: 14, fontWeight: "700", marginTop: 2 },
  cardActions: { flexDirection: "row", gap: 8 },
  editZoneBtn: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 40, paddingHorizontal: 14, backgroundColor: Colors.accent + "15", borderRadius: 10 },
  deleteZoneBtn: { minHeight: 40, width: 44, alignItems: "center", justifyContent: "center", backgroundColor: Colors.danger + "15", borderRadius: 10 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end", alignItems: "center" },
  modalSheet: { backgroundColor: Colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "90%", width: "100%", maxWidth: 640 },
  modalHeader: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle: { fontSize: 17, fontWeight: "700", color: Colors.text },
  fieldLabel: { color: Colors.textSecondary, fontSize: 12, fontWeight: "600", marginBottom: 2 },
  input: { backgroundColor: Colors.background, borderRadius: 10, paddingHorizontal: 14, minHeight: 46, color: Colors.text, fontSize: 14, borderWidth: 1, borderColor: Colors.border },
  row: { flexDirection: "row", gap: 12 },
  switchRow: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 44 },
  errorBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: Colors.danger + "15", borderRadius: 10, padding: 10 },
  errorText: { color: Colors.danger, fontSize: 13, flex: 1, lineHeight: 18 },
  saveBtn: { backgroundColor: Colors.deliveryPrimary, borderRadius: 12, minHeight: 50, alignItems: "center", justifyContent: "center", marginTop: 6 },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
}));
