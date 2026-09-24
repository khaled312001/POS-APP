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
import { formatMoney, formatAmount, currencyLabel, isZeroDecimalCurrency } from "@/lib/currency";
import { storeYmd, storeDayStart, storeDayEnd } from "@/components/store-locale";

type DiscountType = "percent" | "fixed" | "free_delivery";

interface PromoCode {
  id: number;
  code: string;
  description?: string | null;
  discountType: DiscountType;
  discountValue: number | string;
  minOrderAmount?: number | string | null;
  maxDiscountCap?: number | string | null;
  usageLimit?: number | null;
  usageCount?: number | null;
  perCustomerLimit?: number | null;
  validFrom?: string | null;
  validUntil?: string | null;
  isActive: boolean;
  applicableOrderTypes?: string[] | null;
}

const ORDER_TYPES = ["delivery", "pickup", "dine_in"] as const;
const DEFAULT_ORDER_TYPES = ["delivery", "pickup"];
const CODE_RE = /^[A-Z0-9_-]{3,32}$/;
const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

/** A real calendar date in YYYY-MM-DD form (rejects 2026-02-31). */
function isValidYmd(s: string): boolean {
  if (!YMD_RE.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** Keeps only what a money field may contain: digits, plus one decimal point unless the currency has none. */
function cleanMoney(v: string): string {
  const ascii = v.replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x0660)).replace(",", ".");
  if (isZeroDecimalCurrency()) return ascii.replace(/\D/g, "");
  const [int, ...rest] = ascii.replace(/[^\d.]/g, "").split(".");
  return rest.length ? `${int}.${rest.join("").slice(0, 2)}` : int;
}

/** Percent is not money: one decimal place is fine even for zero-decimal currencies. */
function cleanPercent(v: string): string {
  const ascii = v.replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x0660)).replace(",", ".");
  const [int, ...rest] = ascii.replace(/[^\d.]/g, "").split(".");
  const i = int.slice(0, 3);
  return rest.length ? `${i}.${rest.join("").slice(0, 1)}` : i;
}

function cleanInt(v: string): string {
  return v.replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x0660)).replace(/\D/g, "");
}

function blankForm() {
  return {
    code: "", description: "",
    discountType: "percent" as DiscountType,
    discountValue: "", minOrderAmount: "", maxDiscountCap: "",
    usageLimit: "", perCustomerLimit: "1", validFrom: "", validUntil: "", isActive: true,
    orderTypes: [...DEFAULT_ORDER_TYPES] as string[],
  };
}

export default function PromoCodesScreen() {
  const { tenant } = useLicense();
  const { language } = useLanguage();
  const tenantId = (tenant as any)?.id;
  const qc = useQueryClient();
  const isRTL = language === "ar";
  const tr = (en: string, de: string, ar: string) => (language === "ar" ? ar : language === "de" ? de : en);
  const listKey = [`/api/delivery/promos?tenantId=${tenantId}`];
  const todayYmd = storeYmd();
  const zeroDecimal = isZeroDecimalCurrency();
  const moneyPlaceholder = zeroDecimal ? "0" : "0.00";

  const [showForm, setShowForm] = useState(false);
  const [editPromo, setEditPromo] = useState<PromoCode | null>(null);
  const [form, setForm] = useState(blankForm);
  const [initialDates, setInitialDates] = useState({ validFrom: "", validUntil: "" });
  const [formError, setFormError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const { data: promos = [], isLoading, isError, refetch } = useQuery<PromoCode[]>({
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
      const res = editPromo
        ? await apiRequest("PUT", `/api/delivery/promos/${editPromo.id}`, data)
        : await apiRequest("POST", "/api/delivery/promos", { ...data, tenantId });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: listKey });
      closeForm();
    },
    onError: (e) => setFormError(`${tr("Could not save the promo code", "Gutscheincode konnte nicht gespeichert werden", "تعذّر حفظ كود الخصم")}: ${apiErrorMessage(e)}`),
  });

  const toggleMutation = useMutation({
    mutationFn: async (p: PromoCode) => {
      setBusyId(p.id);
      await apiRequest("PUT", `/api/delivery/promos/${p.id}`, { isActive: !p.isActive });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: listKey }),
    onError: (e) => notify(errorTitle, apiErrorMessage(e)),
    onSettled: () => setBusyId(null),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      setBusyId(id);
      await apiRequest("DELETE", `/api/delivery/promos/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: listKey }),
    onError: (e) => notify(errorTitle, `${tr("Could not delete the promo code", "Gutscheincode konnte nicht gelöscht werden", "تعذّر حذف كود الخصم")}: ${apiErrorMessage(e)}`),
    onSettled: () => setBusyId(null),
  });

  const openCreate = () => {
    setEditPromo(null);
    setForm(blankForm());
    setInitialDates({ validFrom: "", validUntil: "" });
    setFormError(null);
    setShowForm(true);
  };

  const openEdit = (p: PromoCode) => {
    // Stored timestamps are instants; the form edits store-local calendar days.
    const from = p.validFrom ? storeYmd(new Date(p.validFrom)) : "";
    const until = p.validUntil ? storeYmd(new Date(p.validUntil)) : "";
    setEditPromo(p);
    setForm({
      code: p.code,
      description: p.description || "",
      discountType: p.discountType,
      discountValue: p.discountType === "free_delivery" ? "" : String(Number(p.discountValue) || ""),
      minOrderAmount: Number(p.minOrderAmount) ? String(Number(p.minOrderAmount)) : "",
      maxDiscountCap: Number(p.maxDiscountCap) ? String(Number(p.maxDiscountCap)) : "",
      usageLimit: p.usageLimit ? String(p.usageLimit) : "",
      perCustomerLimit: p.perCustomerLimit ? String(p.perCustomerLimit) : "",
      validFrom: from,
      validUntil: until,
      isActive: !!p.isActive,
      orderTypes: Array.isArray(p.applicableOrderTypes) && p.applicableOrderTypes.length ? [...p.applicableOrderTypes] : [...DEFAULT_ORDER_TYPES],
    });
    setInitialDates({ validFrom: from, validUntil: until });
    setFormError(null);
    setShowForm(true);
  };

  const closeForm = () => { setShowForm(false); setEditPromo(null); setFormError(null); };

  const handleSave = () => {
    if (saveMutation.isPending) return;
    const code = form.code.trim().toUpperCase();
    const fail = (msg: string) => { setFormError(msg); };
    if (!code) return fail(tr("Code is required.", "Code ist erforderlich.", "الكود مطلوب."));
    if (!CODE_RE.test(code)) {
      return fail(tr(
        "Code: 3–32 characters, letters A–Z, digits, - or _ only.",
        "Code: 3–32 Zeichen, nur A–Z, Ziffern, - oder _.",
        "الكود: من 3 إلى 32 حرفاً، أحرف لاتينية A–Z وأرقام و- أو _ فقط.",
      ));
    }
    if (promos.some((p) => p.code.toUpperCase() === code && p.id !== editPromo?.id)) {
      return fail(tr(`The code "${code}" already exists.`, `Der Code „${code}" existiert bereits.`, `الكود "${code}" موجود مسبقاً.`));
    }

    const value = Number(form.discountValue);
    if (form.discountType === "percent" && !(value > 0 && value <= 100)) {
      return fail(tr("Percent must be greater than 0 and at most 100.", "Prozent muss größer als 0 und höchstens 100 sein.", "يجب أن تكون النسبة أكبر من 0 ولا تتجاوز 100."));
    }
    if (form.discountType === "fixed" && !(value > 0)) {
      return fail(tr("Enter a discount amount greater than 0.", "Rabattbetrag größer als 0 eingeben.", "أدخل مبلغ خصم أكبر من 0."));
    }
    const minOrder = form.minOrderAmount ? Number(form.minOrderAmount) : 0;
    if (!Number.isFinite(minOrder) || minOrder < 0) {
      return fail(tr("Minimum order must be 0 or more.", "Mindestbestellwert muss 0 oder mehr sein.", "يجب أن يكون الحد الأدنى للطلب 0 أو أكثر."));
    }
    const cap = form.discountType === "percent" && form.maxDiscountCap ? Number(form.maxDiscountCap) : null;
    if (cap !== null && !(cap > 0)) {
      return fail(tr("Max discount must be greater than 0 (or leave it empty).", "Maximaler Rabatt muss größer als 0 sein (oder leer lassen).", "يجب أن يكون الحد الأقصى للخصم أكبر من 0 (أو اتركه فارغاً)."));
    }
    const usageLimit = form.usageLimit ? parseInt(form.usageLimit, 10) : null;
    if (usageLimit !== null && !(usageLimit >= 1)) {
      return fail(tr("Usage limit must be at least 1 (or leave it empty for unlimited).", "Nutzungslimit muss mindestens 1 sein (leer = unbegrenzt).", "يجب أن يكون حد الاستخدام 1 على الأقل (أو اتركه فارغاً لعدد غير محدود)."));
    }
    if (editPromo && usageLimit !== null && usageLimit < (editPromo.usageCount || 0)) {
      return fail(tr(
        `This code was already used ${editPromo.usageCount} times; the limit cannot be lower.`,
        `Der Code wurde bereits ${editPromo.usageCount}-mal genutzt; das Limit darf nicht kleiner sein.`,
        `استُخدم هذا الكود ${editPromo.usageCount} مرة؛ لا يمكن أن يكون الحد أقل من ذلك.`,
      ));
    }
    const perCustomer = form.perCustomerLimit ? parseInt(form.perCustomerLimit, 10) : null;
    if (perCustomer !== null && !(perCustomer >= 1)) {
      return fail(tr("Per-customer limit must be at least 1 (or leave it empty for unlimited).", "Limit pro Kunde muss mindestens 1 sein (leer = unbegrenzt).", "يجب أن يكون الحد لكل عميل 1 على الأقل (أو اتركه فارغاً لعدد غير محدود)."));
    }
    if (form.validFrom && !isValidYmd(form.validFrom)) return fail(tr("Valid from: use the format YYYY-MM-DD.", "Gültig ab: Format JJJJ-MM-TT verwenden.", "صالح من: استخدم الصيغة YYYY-MM-DD."));
    if (form.validUntil && !isValidYmd(form.validUntil)) return fail(tr("Valid until: use the format YYYY-MM-DD.", "Gültig bis: Format JJJJ-MM-TT verwenden.", "صالح حتى: استخدم الصيغة YYYY-MM-DD."));
    if (form.validFrom && form.validUntil && form.validUntil < form.validFrom) {
      return fail(tr("The end date must be on or after the start date.", "Das Enddatum muss am oder nach dem Startdatum liegen.", "يجب أن يكون تاريخ الانتهاء في يوم البدء أو بعده."));
    }
    if (form.validUntil && form.validUntil < todayYmd && form.validUntil !== initialDates.validUntil) {
      return fail(tr("The end date is in the past.", "Das Enddatum liegt in der Vergangenheit.", "تاريخ الانتهاء في الماضي."));
    }
    if (form.orderTypes.length === 0) {
      return fail(tr("Select at least one order type.", "Mindestens eine Bestellart wählen.", "اختر نوع طلب واحداً على الأقل."));
    }

    setFormError(null);
    const payload: Record<string, unknown> = {
      code,
      description: form.description.trim() || null,
      discountType: form.discountType,
      discountValue: form.discountType === "free_delivery" ? 0 : value,
      minOrderAmount: minOrder,
      maxDiscountCap: cap,
      usageLimit,
      perCustomerLimit: perCustomer,
      isActive: form.isActive,
      applicableOrderTypes: form.orderTypes,
    };
    // Dates are store-local days: valid from the store's midnight, until the
    // last millisecond of the end day. Unchanged dates are left out on edit.
    if (!editPromo || form.validFrom !== initialDates.validFrom) {
      payload.validFrom = form.validFrom ? storeDayStart(form.validFrom).toISOString() : null;
    }
    if (!editPromo || form.validUntil !== initialDates.validUntil) {
      payload.validUntil = form.validUntil ? storeDayEnd(form.validUntil).toISOString() : null;
    }
    saveMutation.mutate(payload);
  };

  const confirmDelete = (p: PromoCode) => {
    const title = tr("Delete promo code?", "Gutscheincode löschen?", "حذف كود الخصم؟");
    const msg = tr(`"${p.code}" will be deleted permanently.`, `„${p.code}" wird dauerhaft gelöscht.`, `سيتم حذف "${p.code}" نهائياً.`);
    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && window.confirm(`${title}\n\n${msg}`)) deleteMutation.mutate(p.id);
      return;
    }
    Alert.alert(title, msg, [
      { text: tr("Cancel", "Abbrechen", "إلغاء"), style: "cancel" },
      { text: tr("Delete", "Löschen", "حذف"), style: "destructive", onPress: () => deleteMutation.mutate(p.id) },
    ]);
  };

  const discountLabel = (p: PromoCode) => {
    if (p.discountType === "percent") {
      const pct = Number(p.discountValue);
      return tr(`${pct}% off`, `${pct} % Rabatt`, `خصم ${pct}%`);
    }
    if (p.discountType === "fixed") return tr(`${formatMoney(p.discountValue, 2, { group: true })} off`, `${formatMoney(p.discountValue, 2, { group: true })} Rabatt`, `خصم ${formatMoney(p.discountValue, 2, { group: true })}`);
    return tr("Free delivery", "Gratis Lieferung", "توصيل مجاني");
  };

  const promoState = (p: PromoCode): { label: string; color: string } => {
    const from = p.validFrom ? storeYmd(new Date(p.validFrom)) : "";
    const until = p.validUntil ? storeYmd(new Date(p.validUntil)) : "";
    if (!p.isActive) return { label: tr("Inactive", "Inaktiv", "غير مفعّل"), color: Colors.textMuted };
    if (until && until < todayYmd) return { label: tr("Expired", "Abgelaufen", "منتهي"), color: Colors.danger };
    if (from && from > todayYmd) return { label: tr("Scheduled", "Geplant", "مجدول"), color: Colors.info };
    if (p.usageLimit != null && (p.usageCount || 0) >= p.usageLimit) return { label: tr("Used up", "Aufgebraucht", "مستنفد"), color: Colors.warning };
    return { label: tr("Active", "Aktiv", "مفعّل"), color: Colors.success };
  };

  const orderTypeLabel = (ot: string) =>
    ot === "delivery" ? tr("Delivery", "Lieferung", "توصيل") : ot === "pickup" ? tr("Pickup", "Abholung", "استلام") : ot === "dine_in" ? tr("Dine-in", "Vor Ort", "داخل المطعم") : ot;

  const DISCOUNT_TYPES: { key: DiscountType; label: string }[] = [
    { key: "percent", label: tr("Percent (%)", "Prozent (%)", "نسبة مئوية (%)") },
    { key: "fixed", label: tr(`Fixed (${currencyLabel()})`, `Fester Betrag (${currencyLabel()})`, `مبلغ ثابت (${currencyLabel()})`) },
    { key: "free_delivery", label: tr("Free delivery", "Gratis Lieferung", "توصيل مجاني") },
  ];

  const align = isRTL ? ({ textAlign: "right" } as const) : null;

  return (
    <SafeAreaView style={[styles.container, { direction: isRTL ? "rtl" : "ltr" }]}>
      {/* The root sets the layout direction, so plain "row" already runs right-to-left in Arabic. */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerIconBtn} hitSlop={6} accessibilityRole="button" accessibilityLabel={tr("Back", "Zurück", "رجوع")}>
          <Ionicons name={isRTL ? "chevron-forward" : "chevron-back"} size={24} color={Colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, align]} numberOfLines={1}>
          {tr("Promo Codes", "Gutscheincodes", "كودات الخصم")}
        </Text>
        <Pressable onPress={openCreate} style={styles.addBtn} accessibilityRole="button" accessibilityLabel={tr("New promo code", "Neuer Gutscheincode", "كود جديد")}>
          <Ionicons name="add" size={22} color="#fff" />
        </Pressable>
      </View>

      {isLoading ? (
        <ActivityIndicator color={Colors.deliveryPrimary} style={{ marginTop: 40 }} />
      ) : isError ? (
        <View style={styles.emptyState}>
          <Ionicons name="cloud-offline-outline" size={40} color={Colors.danger} />
          <Text style={[styles.emptyText, { textAlign: "center" }]}>
            {tr("Could not load promo codes.", "Gutscheincodes konnten nicht geladen werden.", "تعذّر تحميل كودات الخصم.")}
          </Text>
          <Pressable style={styles.secondaryBtn} onPress={() => refetch()} accessibilityRole="button">
            <Ionicons name="refresh" size={16} color={Colors.accent} />
            <Text style={styles.secondaryBtnText}>{tr("Retry", "Erneut versuchen", "إعادة المحاولة")}</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}>
          {promos.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="pricetag-outline" size={40} color={Colors.textMuted} />
              <Text style={styles.emptyText}>{tr("No promo codes yet", "Noch keine Gutscheincodes", "لا توجد كودات بعد")}</Text>
              <Pressable style={styles.createBtn} onPress={openCreate} accessibilityRole="button">
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={styles.createBtnText}>{tr("Create code", "Code erstellen", "إنشاء كود")}</Text>
              </Pressable>
            </View>
          )}
          {promos.map((promo) => {
            const state = promoState(promo);
            const busy = busyId === promo.id;
            return (
              <View key={promo.id} style={[styles.promoCard, !promo.isActive && { opacity: 0.75 }]}>
                <View style={styles.promoTop}>
                  <View style={[styles.codeBadge, { backgroundColor: promo.isActive ? Colors.accent + "20" : Colors.border }]}>
                    <Text style={[styles.codeText, { color: promo.isActive ? Colors.accent : Colors.textMuted }]} numberOfLines={1}>{promo.code}</Text>
                  </View>
                  <View style={[styles.stateBadge, { backgroundColor: state.color + "20" }]}>
                    <Text style={[styles.stateText, { color: state.color }]}>{state.label}</Text>
                  </View>
                  <View style={{ flex: 1 }} />
                  {busy ? (
                    <ActivityIndicator size="small" color={Colors.accent} />
                  ) : (
                    <Switch
                      value={!!promo.isActive}
                      onValueChange={() => toggleMutation.mutate(promo)}
                      trackColor={{ true: Colors.deliveryPrimary, false: Colors.border }}
                      thumbColor="#fff"
                      accessibilityLabel={tr("Active", "Aktiv", "مفعّل")}
                    />
                  )}
                </View>
                <Text style={[styles.discountLabel, align]}>{discountLabel(promo)}</Text>
                {promo.description ? <Text style={[styles.promoDesc, align]} numberOfLines={2}>{promo.description}</Text> : null}
                <View style={styles.metaRow}>
                  <Text style={styles.promoMeta}>
                    {promo.usageCount || 0}/{promo.usageLimit ?? "∞"} {tr("uses", "Nutzungen", "استخدام")}
                  </Text>
                  {Number(promo.minOrderAmount) > 0 && (
                    <Text style={styles.promoMeta}>· {tr("min.", "mind.", "حد أدنى")} {formatMoney(promo.minOrderAmount, 2, { group: true })}</Text>
                  )}
                  {promo.validFrom ? <Text style={styles.promoMeta}>· {tr("from", "ab", "من")} {storeYmd(new Date(promo.validFrom))}</Text> : null}
                  {promo.validUntil ? <Text style={styles.promoMeta}>· {tr("until", "bis", "حتى")} {storeYmd(new Date(promo.validUntil))}</Text> : null}
                </View>
                <View style={styles.cardActions}>
                  <Pressable style={styles.editPromoBtn} onPress={() => openEdit(promo)} disabled={busy} accessibilityRole="button">
                    <Ionicons name="pencil" size={16} color={Colors.accent} />
                    <Text style={{ color: Colors.accent, fontWeight: "700", fontSize: 13 }}>{tr("Edit", "Bearbeiten", "تعديل")}</Text>
                  </Pressable>
                  <Pressable style={styles.deletePromoBtn} onPress={() => confirmDelete(promo)} disabled={busy} accessibilityRole="button" accessibilityLabel={tr("Delete", "Löschen", "حذف")}>
                    <Ionicons name="trash-outline" size={16} color={Colors.danger} />
                  </Pressable>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Form Modal */}
      <Modal visible={showForm} animationType="slide" transparent onRequestClose={closeForm}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { direction: isRTL ? "rtl" : "ltr" }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { flex: 1 }, align]} numberOfLines={1}>
                {editPromo ? tr("Edit promo code", "Gutscheincode bearbeiten", "تعديل الكود") : tr("New promo code", "Neuer Gutscheincode", "كود جديد")}
              </Text>
              <Pressable onPress={closeForm} style={styles.headerIconBtn} accessibilityRole="button" accessibilityLabel={tr("Close", "Schließen", "إغلاق")}>
                <Ionicons name="close" size={22} color={Colors.textMuted} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 28 }} keyboardShouldPersistTaps="handled">
              <Text style={[styles.fieldLabel, align]}>{tr("Code", "Code", "الكود")}</Text>
              <TextInput
                style={[styles.input, { writingDirection: "ltr", textAlign: isRTL ? "right" : "left" }]}
                value={form.code}
                onChangeText={(v) => setForm((f) => ({ ...f, code: v.toUpperCase().replace(/\s/g, "").slice(0, 32) }))}
                placeholder="SUMMER20"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={32}
              />

              <Text style={[styles.fieldLabel, align]}>{tr("Description (optional)", "Beschreibung (optional)", "الوصف (اختياري)")}</Text>
              <TextInput
                style={[styles.input, align]}
                value={form.description}
                onChangeText={(v) => setForm((f) => ({ ...f, description: v }))}
                placeholder={tr("e.g. Summer 20% discount", "z. B. Sommerrabatt 20 %", "مثلاً: خصم صيفي 20%")}
                placeholderTextColor={Colors.textMuted}
              />

              <Text style={[styles.fieldLabel, align]}>{tr("Discount type", "Rabattart", "نوع الخصم")}</Text>
              <View style={styles.chipRow}>
                {DISCOUNT_TYPES.map((dt) => {
                  const active = form.discountType === dt.key;
                  return (
                    <Pressable
                      key={dt.key}
                      style={[styles.typeBtn, active && styles.typeBtnActive]}
                      onPress={() => setForm((f) => (f.discountType === dt.key ? f : { ...f, discountType: dt.key, discountValue: "", maxDiscountCap: dt.key === "percent" ? f.maxDiscountCap : "" }))}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                    >
                      <Text style={[styles.typeBtnText, active && styles.typeBtnTextActive]}>{dt.label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              {form.discountType !== "free_delivery" && (
                <>
                  <Text style={[styles.fieldLabel, align]}>
                    {form.discountType === "percent" ? tr("Percent (%)", "Prozent (%)", "النسبة (%)") : tr(`Amount (${currencyLabel()})`, `Betrag (${currencyLabel()})`, `المبلغ (${currencyLabel()})`)}
                  </Text>
                  <TextInput
                    style={[styles.input, align]}
                    value={form.discountValue}
                    onChangeText={(v) => setForm((f) => ({ ...f, discountValue: f.discountType === "percent" ? cleanPercent(v) : cleanMoney(v) }))}
                    keyboardType={zeroDecimal && form.discountType === "fixed" ? "number-pad" : "decimal-pad"}
                    placeholder={form.discountType === "percent" ? "20" : zeroDecimal ? "5000" : "5.00"}
                    placeholderTextColor={Colors.textMuted}
                  />
                </>
              )}

              <View style={styles.row}>
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
                {form.discountType === "percent" && (
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[styles.fieldLabel, align]} numberOfLines={1}>{tr(`Max. discount (${currencyLabel()})`, `Max. Rabatt (${currencyLabel()})`, `أقصى خصم (${currencyLabel()})`)}</Text>
                    <TextInput
                      style={[styles.input, align]}
                      value={form.maxDiscountCap}
                      onChangeText={(v) => setForm((f) => ({ ...f, maxDiscountCap: cleanMoney(v) }))}
                      keyboardType={zeroDecimal ? "number-pad" : "decimal-pad"}
                      placeholder={tr("No limit", "Kein Limit", "بلا حد")}
                      placeholderTextColor={Colors.textMuted}
                    />
                  </View>
                )}
              </View>

              <View style={styles.row}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.fieldLabel, align]} numberOfLines={1}>{tr("Total uses", "Nutzungen gesamt", "إجمالي الاستخدامات")}</Text>
                  <TextInput
                    style={[styles.input, align]}
                    value={form.usageLimit}
                    onChangeText={(v) => setForm((f) => ({ ...f, usageLimit: cleanInt(v) }))}
                    keyboardType="number-pad"
                    placeholder={tr("Unlimited", "Unbegrenzt", "غير محدود")}
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.fieldLabel, align]} numberOfLines={1}>{tr("Uses per customer", "Pro Kunde", "لكل عميل")}</Text>
                  <TextInput
                    style={[styles.input, align]}
                    value={form.perCustomerLimit}
                    onChangeText={(v) => setForm((f) => ({ ...f, perCustomerLimit: cleanInt(v) }))}
                    keyboardType="number-pad"
                    placeholder={tr("Unlimited", "Unbegrenzt", "غير محدود")}
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.fieldLabel, align]} numberOfLines={1}>{tr("Valid from", "Gültig ab", "صالح من")}</Text>
                  <TextInput
                    style={[styles.input, { writingDirection: "ltr", textAlign: isRTL ? "right" : "left" }]}
                    value={form.validFrom}
                    onChangeText={(v) => setForm((f) => ({ ...f, validFrom: v.replace(/[^\d-]/g, "").slice(0, 10) }))}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType={Platform.OS === "ios" ? "numbers-and-punctuation" : "default"}
                    maxLength={10}
                  />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.fieldLabel, align]} numberOfLines={1}>{tr("Valid until", "Gültig bis", "صالح حتى")}</Text>
                  <TextInput
                    style={[styles.input, { writingDirection: "ltr", textAlign: isRTL ? "right" : "left" }]}
                    value={form.validUntil}
                    onChangeText={(v) => setForm((f) => ({ ...f, validUntil: v.replace(/[^\d-]/g, "").slice(0, 10) }))}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType={Platform.OS === "ios" ? "numbers-and-punctuation" : "default"}
                    maxLength={10}
                  />
                </View>
              </View>
              <Text style={[styles.hint, align]}>
                {tr(
                  "Dates are whole days in the store's time zone. Leave empty for no limit.",
                  "Daten gelten als ganze Tage in der Zeitzone des Geschäfts. Leer = ohne Begrenzung.",
                  "التواريخ أيام كاملة بتوقيت المتجر. اتركها فارغة لعدم التقييد.",
                )}
              </Text>

              <Text style={[styles.fieldLabel, align]}>{tr("Valid for", "Gültig für", "صالح لـ")}</Text>
              <View style={styles.chipRow}>
                {ORDER_TYPES.map((ot) => {
                  const active = form.orderTypes.includes(ot);
                  return (
                    <Pressable
                      key={ot}
                      style={[styles.typeBtn, active && styles.typeBtnActive]}
                      onPress={() => setForm((f) => ({ ...f, orderTypes: active ? f.orderTypes.filter((x) => x !== ot) : [...f.orderTypes, ot] }))}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: active }}
                    >
                      <Text style={[styles.typeBtnText, active && styles.typeBtnTextActive]}>{orderTypeLabel(ot)}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.switchRow}>
                <Text style={[styles.fieldLabel, { marginBottom: 0, flex: 1 }, align]}>{tr("Active", "Aktiv", "مفعّل")}</Text>
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
                  <Text style={styles.saveBtnText}>
                    {editPromo ? tr("Save changes", "Änderungen speichern", "حفظ التغييرات") : tr("Create code", "Code erstellen", "إنشاء الكود")}
                  </Text>
                )}
              </Pressable>
              {form.discountType === "fixed" && Number(form.discountValue) > 0 && Number(form.minOrderAmount) > 0 && Number(form.discountValue) > Number(form.minOrderAmount) ? (
                <Text style={[styles.hint, align]}>
                  {tr(
                    `Note: the discount (${formatAmount(form.discountValue, 2, { group: true })}) is larger than the minimum order; it is capped at the order total.`,
                    `Hinweis: Der Rabatt (${formatAmount(form.discountValue, 2, { group: true })}) ist höher als der Mindestbestellwert; er wird auf den Bestellwert begrenzt.`,
                    `ملاحظة: الخصم (${formatAmount(form.discountValue, 2, { group: true })}) أكبر من الحد الأدنى للطلب، وسيُحدّ بقيمة الطلب.`,
                  )}
                </Text>
              ) : null}
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
  promoCard: { backgroundColor: Colors.card, borderRadius: 14, padding: 14, gap: 6, borderWidth: 1, borderColor: Colors.border },
  promoTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  codeBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, flexShrink: 1 },
  codeText: { fontWeight: "800", fontSize: 14, letterSpacing: 1 },
  stateBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  stateText: { fontSize: 11, fontWeight: "700" },
  discountLabel: { color: Colors.text, fontSize: 15, fontWeight: "700", marginTop: 4 },
  promoDesc: { color: Colors.textSecondary, fontSize: 12 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", columnGap: 6, rowGap: 2 },
  promoMeta: { color: Colors.textMuted, fontSize: 12 },
  cardActions: { flexDirection: "row", gap: 8, marginTop: 6 },
  editPromoBtn: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 40, paddingHorizontal: 14, backgroundColor: Colors.accent + "15", borderRadius: 10 },
  deletePromoBtn: { minHeight: 40, width: 44, alignItems: "center", justifyContent: "center", backgroundColor: Colors.danger + "15", borderRadius: 10 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end", alignItems: "center" },
  modalSheet: { backgroundColor: Colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "92%", width: "100%", maxWidth: 640 },
  modalHeader: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle: { fontSize: 17, fontWeight: "700", color: Colors.text },
  fieldLabel: { color: Colors.textSecondary, fontSize: 12, fontWeight: "600", marginBottom: 2 },
  input: { backgroundColor: Colors.background, borderRadius: 10, paddingHorizontal: 14, minHeight: 46, color: Colors.text, fontSize: 14, borderWidth: 1, borderColor: Colors.border },
  row: { flexDirection: "row", gap: 12 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  typeBtn: { flexGrow: 1, flexBasis: 96, borderRadius: 10, minHeight: 44, paddingHorizontal: 8, alignItems: "center", justifyContent: "center", backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  typeBtnActive: { backgroundColor: Colors.deliveryPrimaryLight, borderColor: Colors.deliveryPrimary },
  typeBtnText: { color: Colors.textMuted, fontSize: 12, fontWeight: "600", textAlign: "center" },
  typeBtnTextActive: { color: Colors.deliveryPrimary },
  switchRow: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 44 },
  hint: { color: Colors.textMuted, fontSize: 11, lineHeight: 16 },
  errorBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: Colors.danger + "15", borderRadius: 10, padding: 10 },
  errorText: { color: Colors.danger, fontSize: 13, flex: 1, lineHeight: 18 },
  saveBtn: { backgroundColor: Colors.deliveryPrimary, borderRadius: 12, minHeight: 50, alignItems: "center", justifyContent: "center", marginTop: 6 },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
}));
