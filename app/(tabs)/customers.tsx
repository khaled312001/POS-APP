import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  StyleSheet, Text, View, Pressable, TextInput,
  Modal, Alert, ScrollView, Platform, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Colors } from "@/constants/colors";
import { apiRequest, getQueryFn } from "@/lib/query-client";
import { playClickSound } from "@/lib/sound";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";
import { useLicense } from "@/lib/license-context";

const PAGE_SIZE = 200;

function InfoRow({ icon, label, value, isRTL }: { icon: string; label: string; value: string; isRTL?: boolean }) {
  if (!value) return null;
  return (
    <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
      <Ionicons name={icon as any} size={15} color={Colors.accent} style={{ marginTop: 2 }} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: Colors.textMuted, fontSize: 10, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</Text>
        <Text style={{ color: Colors.text, fontSize: 14, marginTop: 1 }}>{value}</Text>
      </View>
    </View>
  );
}

export default function CustomersScreen() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { canManage, canDeleteCustomers } = useAuth();
  const { t, isRTL, rtlTextAlign, rtlText, language } = useLanguage();
  const { tenant } = useLicense();

  // Search state — raw (shown in input) + debounced (sent to API)
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pagination
  const [offset, setOffset] = useState(0);
  const [allCustomers, setAllCustomers] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const loadingMore = useRef(false);
  // Detail & Edit Modals
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editCustomer, setEditCustomer] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "", email: "", phone: "", address: "", notes: "", company: "",
    firstName: "", lastName: "", street: "", streetNr: "", houseNr: "",
    city: "", postalCode: "", salutation: "", zhd: "",
    howToGo: "", screenInfo: "", customerNr: ""
  });


  // Total count query
  const { data: countData } = useQuery<{ count: number }>({
    queryKey: ["/api/customers/count", `?tenantId=${tenant?.id || ""}${debouncedSearch ? `&search=${encodeURIComponent(debouncedSearch)}` : ""}`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!tenant?.id,
  });
  const totalCount = countData?.count ?? 0;

  const handleSearchChange = useCallback((text: string) => {
    setSearch(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(text);
      setOffset(0);
      setAllCustomers([]);
      setHasMore(true);
      loadingMore.current = false;
    }, 400);
  }, []);

  const queryUrl = tenant?.id
    ? `/api/customers?tenantId=${tenant.id}&limit=${PAGE_SIZE}&offset=${offset}${debouncedSearch ? `&search=${encodeURIComponent(debouncedSearch)}` : ""}`
    : null;

  const { data: pageData, isFetching } = useQuery<any[]>({
    queryKey: [queryUrl],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!queryUrl,
  });

  useEffect(() => {
    if (!pageData) return;
    if (offset === 0) {
      setAllCustomers(pageData);
    } else {
      setAllCustomers(prev => [...prev, ...pageData]);
    }
    setHasMore(pageData.length === PAGE_SIZE);
    loadingMore.current = false;
  }, [pageData]);

  const loadMore = () => {
    if (isFetching || !hasMore || loadingMore.current) return;
    loadingMore.current = true;
    setOffset(prev => prev + PAGE_SIZE);
  };

  const invalidateCustomers = () => {
    qc.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).includes(`/api/customers`) });
    setOffset(0);
    setAllCustomers([]);
    setHasMore(true);
    loadingMore.current = false;
  };

  const { data: customerSales = [] } = useQuery<any[]>({
    queryKey: [`/api/customers/${selectedCustomer?.id}/sales`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!selectedCustomer?.id,
  });

  const saveMutation = useMutation({
    mutationFn: (data: any) => apiRequest(editCustomer ? "PUT" : "POST", editCustomer ? `/api/customers/${editCustomer.id}` : "/api/customers", data),
    onSuccess: () => {
      invalidateCustomers();
      setShowForm(false);
      setEditCustomer(null);
      resetForm();
    },
    onError: (e: any) => Alert.alert(t("error"), e.message),
  });

  const handleImportCSV = async () => {
    try {
      if (Platform.OS !== "web") {
        Alert.alert("Available on Web", "This feature is currently only available on the web version.");
        return;
      }
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".csv";
      input.onchange = async (e: any) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (re: any) => {
          const content = re.target.result;
          setLoading(true);
          try {
            const resRaw = await apiRequest("POST", "/api/customers/import-csv", { csv: content, tenantId: tenant?.id });
            const res = await resRaw.json();
            Alert.alert("Import Finished", `Imported ${res.imported} customers successfully!`);
            invalidateCustomers();
          } catch (err: any) {
            Alert.alert("Error", err.message);
          } finally {
            setLoading(false);
          }
        };
        reader.readAsText(file);
      };
      input.click();
    } catch (err: any) {
      Alert.alert("Error", err.message);
    }
  };

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/customers/${id}`),
    onSuccess: () => {
      invalidateCustomers();
      setShowDetail(false);
      setSelectedCustomer(null);
    },
    onError: (e: any) => Alert.alert(t("error"), e.message),
  });

  const resetForm = () => setForm({
    name: "", email: "", phone: "", address: "", notes: "", company: "",
    firstName: "", lastName: "", street: "", streetNr: "", houseNr: "",
    city: "", postalCode: "", salutation: "", zhd: "",
    howToGo: "", screenInfo: "", customerNr: ""
  });

  const openEdit = (c: any) => {
    setEditCustomer(c);
    setForm({
      name: c.name || "",
      email: c.email || "",
      phone: c.phone || "",
      address: c.address || "",
      notes: c.notes || "",
      company: c.company || "",
      firstName: c.firstName || "",
      lastName: c.lastName || "",
      street: c.street || "",
      streetNr: c.streetNr || "",
      houseNr: c.houseNr || "",
      city: c.city || "",
      postalCode: c.postalCode || "",
      salutation: c.salutation || "",
      zhd: c.zhd || "",
      howToGo: c.howToGo || "",
      screenInfo: c.screenInfo || "",
      customerNr: c.customerNr ? String(c.customerNr) : "",
    });
    setShowForm(true);
  };

  const handleSave = () => {
    if (!form.name && !form.lastName) return Alert.alert(t("error"), t("customerName"));
    const name = form.name || [form.lastName, form.firstName].filter(Boolean).join(", ");
    saveMutation.mutate({
      name,
      email: form.email || undefined,
      phone: form.phone || undefined,
      address: form.address || undefined,
      notes: form.notes || undefined,
      company: form.company || undefined,
      firstName: form.firstName || undefined,
      lastName: form.lastName || undefined,
      street: form.street || undefined,
      streetNr: form.streetNr || undefined,
      houseNr: form.houseNr || undefined,
      city: form.city || undefined,
      postalCode: form.postalCode || undefined,
      salutation: form.salutation || undefined,
      zhd: form.zhd || undefined,
      howToGo: form.howToGo || undefined,
      screenInfo: form.screenInfo || undefined,
      customerNr: form.customerNr ? parseInt(form.customerNr) : undefined,
      tenantId: tenant?.id,
    });
  };

  const topPad = Platform.OS === "web" ? 48 : 0;

  // Helper to get subtitle for list card
  const getSubtitle = (item: any) => {
    const parts: string[] = [];
    if (item.company) parts.push(item.company);
    if (item.city) parts.push(item.city);
    if (item.phone) parts.push(item.phone);
    if (parts.length === 0 && item.email) parts.push(item.email);
    if (parts.length === 0) parts.push(t("noContactInfo"));
    return parts.join(" · ");
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + topPad, direction: isRTL ? "rtl" : "ltr" }]}>
      <LinearGradient colors={[Colors.gradientStart, Colors.gradientMid]} style={[styles.header, isRTL && { flexDirection: "row-reverse" }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Text style={[styles.headerTitle, rtlTextAlign]}>{t("customers")}</Text>
          <View style={{ backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
            <Text style={{ color: Colors.white, fontSize: 13, fontWeight: "800" }}>{totalCount} {t("total" as any) || "Total"}</Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable style={styles.headerBtn} onPress={() => { playClickSound("medium"); handleImportCSV(); }}>
            <Ionicons name="cloud-upload" size={20} color={Colors.white} />
          </Pressable>
          <Pressable style={styles.headerBtn} onPress={() => { playClickSound("medium"); setEditCustomer(null); resetForm(); setShowForm(true); }}>
            <Ionicons name="add" size={24} color={Colors.white} />
          </Pressable>
        </View>
      </LinearGradient>

      <View style={styles.searchRow}>
        <View style={[styles.searchBox, isRTL && { flexDirection: "row-reverse" }]}>
          <Ionicons name="search" size={18} color={Colors.textMuted} />
          <TextInput
            style={[styles.searchInput, isRTL ? { marginRight: 8, marginLeft: 0 } : { marginLeft: 8 }, rtlTextAlign, rtlText]}
            placeholder={t("search") + "..."}
            placeholderTextColor={Colors.textMuted}
            value={search}
            onChangeText={handleSearchChange}
          />
          {isFetching && <ActivityIndicator size="small" color={Colors.textMuted} style={{ marginLeft: 6 }} />}
        </View>
        {totalCount > 0 && (
          <Text style={styles.countText}>
            {allCustomers.length}/{totalCount}
          </Text>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {isFetching && allCustomers.length === 0 ? (
          <View style={styles.empty}><ActivityIndicator size="large" color={Colors.textMuted} /></View>
        ) : allCustomers.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={48} color={Colors.textMuted} />
            <Text style={[styles.emptyText, rtlTextAlign]}>{t("noCustomers")}</Text>
          </View>
        ) : (
          <>
            {allCustomers.map((item: any) => (
              <Pressable key={String(item.id)} style={[styles.card, isRTL && { flexDirection: "row-reverse" }]} onPress={() => { playClickSound("light"); setSelectedCustomer(item); setShowDetail(true); }}>
                <View style={[styles.avatar, isRTL ? { marginLeft: 12, marginRight: 0 } : { marginRight: 12 }]}>
                  <Text style={styles.avatarText}>{(item.name || "U").charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.cardInfo}>
                  <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <Text style={[styles.cardName, rtlTextAlign]} numberOfLines={1}>{item.name}</Text>
                    {item.salutation ? <Text style={{ color: Colors.textMuted, fontSize: 11, fontStyle: "italic" }}>({item.salutation})</Text> : null}
                    {item.customerNr ? (
                      <View style={{ backgroundColor: Colors.surfaceLight, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, borderWidth: 1, borderColor: Colors.cardBorder }}>
                        <Text style={{ color: Colors.accent, fontSize: 10, fontWeight: "700" }}>#{item.customerNr}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={[styles.cardMeta, rtlTextAlign]} numberOfLines={1}>{getSubtitle(item)}</Text>
                  {item.company ? <Text style={[{ color: Colors.accent, fontSize: 11, marginTop: 2 }, rtlTextAlign]}>🏢 {item.company}</Text> : null}
                </View>
                <View style={[styles.cardRight, isRTL && { alignItems: "flex-start" }]}>
                  {(item.orderCount > 0 || item.visitCount > 0) && (
                    <View style={[styles.loyaltyBadge, { backgroundColor: Colors.accent + "15" }, isRTL && { flexDirection: "row-reverse" }]}>
                      <Ionicons name="receipt-outline" size={12} color={Colors.accent} />
                      <Text style={[styles.loyaltyText, { color: Colors.accent }]}>{item.orderCount || item.visitCount}</Text>
                    </View>
                  )}
                  {(Number(item.totalSpent || 0) > 0 || Number(item.legacyTotalSpent || 0) > 0) && (
                    <Text style={styles.totalSpent}>CHF {Number(item.totalSpent || item.legacyTotalSpent || 0).toFixed(0)}</Text>
                  )}
                  {item.loyaltyPoints > 0 && (
                    <View style={[styles.loyaltyBadge, isRTL && { flexDirection: "row-reverse" }]}>
                      <Ionicons name="star" size={11} color={Colors.warning} />
                      <Text style={styles.loyaltyText}>{item.loyaltyPoints}</Text>
                    </View>
                  )}
                </View>
              </Pressable>
            ))}

            {hasMore && (
              <Pressable style={styles.loadMoreBtn} onPress={loadMore} disabled={isFetching}>
                {isFetching ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Text style={styles.loadMoreText}>Load More</Text>
                )}
              </Pressable>
            )}
          </>
        )}
      </ScrollView>

      {/* Add / Edit Customer Modal */}
      <Modal visible={showForm} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: "90%" }]}>
            <View style={[styles.modalHeader, isRTL && { flexDirection: "row-reverse" }]}>
              <Text style={[styles.modalTitle, rtlTextAlign]}>{editCustomer ? t("edit") + " " + t("customers") : t("addCustomer")}</Text>
              <Pressable onPress={() => { playClickSound("light"); setShowForm(false); }}><Ionicons name="close" size={24} color={Colors.text} /></Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.sectionLabel, rtlTextAlign]}>📋 {language === "ar" ? "معلومات أساسية" : "Basic Info"}</Text>

              <View style={{ flexDirection: "row", gap: 8 }}>
                <View style={{ width: 80 }}>
                  <Text style={[styles.label, rtlTextAlign]}>{language === "ar" ? "اللقب" : "Anrede"}</Text>
                  <TextInput style={[styles.input, rtlTextAlign, rtlText]} value={form.salutation} onChangeText={(v) => setForm({ ...form, salutation: v })} placeholderTextColor={Colors.textMuted} placeholder="Herr/Frau" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, rtlTextAlign]}>{language === "ar" ? "الاسم الأول" : "Vorname"}</Text>
                  <TextInput style={[styles.input, rtlTextAlign, rtlText]} value={form.firstName} onChangeText={(v) => setForm({ ...form, firstName: v })} placeholderTextColor={Colors.textMuted} placeholder={language === "ar" ? "الاسم الأول" : "First Name"} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, rtlTextAlign]}>{language === "ar" ? "الاسم الأخير" : "Nachname"}</Text>
                  <TextInput style={[styles.input, rtlTextAlign, rtlText]} value={form.lastName} onChangeText={(v) => setForm({ ...form, lastName: v })} placeholderTextColor={Colors.textMuted} placeholder={language === "ar" ? "اسم العائلة" : "Last Name"} />
                </View>
              </View>

              <Text style={[styles.label, rtlTextAlign]}>{t("customerName")} *</Text>
              <TextInput style={[styles.input, rtlTextAlign, rtlText]} value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} placeholderTextColor={Colors.textMuted} placeholder={t("customerName")} />

              <Text style={[styles.label, rtlTextAlign]}>{language === "ar" ? "الشركة" : "Firma"}</Text>
              <TextInput style={[styles.input, rtlTextAlign, rtlText]} value={form.company} onChangeText={(v) => setForm({ ...form, company: v })} placeholderTextColor={Colors.textMuted} placeholder={language === "ar" ? "اسم الشركة" : "Company"} />

              <Text style={[styles.label, rtlTextAlign]}>{t("phone")}</Text>
              <TextInput style={[styles.input, rtlTextAlign, rtlText]} value={form.phone} onChangeText={(v) => setForm({ ...form, phone: v })} keyboardType="phone-pad" placeholderTextColor={Colors.textMuted} placeholder="+41..." />

              <Text style={[styles.label, rtlTextAlign]}>{t("email")}</Text>
              <TextInput style={[styles.input, rtlTextAlign, rtlText]} value={form.email} onChangeText={(v) => setForm({ ...form, email: v })} keyboardType="email-address" placeholderTextColor={Colors.textMuted} placeholder="email@example.com" autoCapitalize="none" />

              <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, rtlTextAlign]}>z.Hd. (Zusatz)</Text>
                  <TextInput style={[styles.input, rtlTextAlign, rtlText]} value={form.zhd} onChangeText={(v) => setForm({ ...form, zhd: v })} placeholderTextColor={Colors.textMuted} placeholder="z.Hd." />
                </View>
                <View style={{ width: 100 }}>
                  <Text style={[styles.label, rtlTextAlign]}>Cust. Nr</Text>
                  <TextInput style={[styles.input, rtlTextAlign, rtlText]} value={form.customerNr} onChangeText={(v) => setForm({ ...form, customerNr: v })} keyboardType="numeric" placeholderTextColor={Colors.textMuted} placeholder="123" />
                </View>
              </View>

              <Text style={[styles.sectionLabel, rtlTextAlign]}>🚗 {language === "ar" ? "معلومات التوصيل" : "Delivery Info"}</Text>
              <Text style={[styles.label, rtlTextAlign]}>{language === "ar" ? "كيف تصل" : "How to Go"}</Text>
              <TextInput style={[styles.input, rtlTextAlign, rtlText]} value={form.howToGo} onChangeText={(v) => setForm({ ...form, howToGo: v })} placeholderTextColor={Colors.textMuted} placeholder="Driving directions..." />

              <Text style={[styles.label, rtlTextAlign]}>Screen Info</Text>
              <TextInput style={[styles.input, rtlTextAlign, rtlText]} value={form.screenInfo} onChangeText={(v) => setForm({ ...form, screenInfo: v })} placeholderTextColor={Colors.textMuted} placeholder="Door code, etc..." />

              <Text style={[styles.sectionLabel, rtlTextAlign]}>📍 {language === "ar" ? "العنوان" : "Address"}</Text>

              <View style={{ flexDirection: "row", gap: 8 }}>
                <View style={{ flex: 2 }}>
                  <Text style={[styles.label, rtlTextAlign]}>{language === "ar" ? "الشارع" : "Strasse"}</Text>
                  <TextInput style={[styles.input, rtlTextAlign, rtlText]} value={form.street} onChangeText={(v) => setForm({ ...form, street: v })} placeholderTextColor={Colors.textMuted} placeholder={language === "ar" ? "الشارع" : "Street"} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, rtlTextAlign]}>{language === "ar" ? "رقم" : "Nr."}</Text>
                  <TextInput style={[styles.input, rtlTextAlign, rtlText]} value={form.streetNr} onChangeText={(v) => setForm({ ...form, streetNr: v })} placeholderTextColor={Colors.textMuted} placeholder="Nr." />
                </View>
              </View>

              <View style={{ flexDirection: "row", gap: 8 }}>
                <View style={{ width: 80 }}>
                  <Text style={[styles.label, rtlTextAlign]}>{language === "ar" ? "الرمز" : "PLZ"}</Text>
                  <TextInput style={[styles.input, rtlTextAlign, rtlText]} value={form.postalCode} onChangeText={(v) => setForm({ ...form, postalCode: v })} keyboardType="numeric" placeholderTextColor={Colors.textMuted} placeholder="PLZ" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, rtlTextAlign]}>{language === "ar" ? "المدينة" : "Ort"}</Text>
                  <TextInput style={[styles.input, rtlTextAlign, rtlText]} value={form.city} onChangeText={(v) => setForm({ ...form, city: v })} placeholderTextColor={Colors.textMuted} placeholder={language === "ar" ? "المدينة" : "City"} />
                </View>
              </View>

              <Text style={[styles.label, rtlTextAlign]}>{t("address")} ({language === "ar" ? "كامل" : "Full"})</Text>
              <TextInput style={[styles.input, rtlTextAlign, rtlText]} value={form.address} onChangeText={(v) => setForm({ ...form, address: v })} placeholderTextColor={Colors.textMuted} placeholder={t("address")} />

              <Text style={[styles.label, rtlTextAlign]}>{t("notes")}</Text>
              <TextInput style={[styles.input, { height: 80, textAlignVertical: "top" }, rtlTextAlign, rtlText]} value={form.notes} onChangeText={(v) => setForm({ ...form, notes: v })} multiline placeholderTextColor={Colors.textMuted} placeholder={t("notes")} />

              <Pressable style={styles.saveBtn} onPress={() => { playClickSound("heavy"); handleSave(); }}>
                <LinearGradient colors={[Colors.accent, Colors.gradientMid]} style={styles.saveBtnGradient}>
                  <Text style={styles.saveBtnText}>{editCustomer ? t("save") : t("addCustomer")}</Text>
                </LinearGradient>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Customer Detail Modal */}
      <Modal visible={showDetail} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: "90%" }]}>
            <View style={[styles.modalHeader, isRTL && { flexDirection: "row-reverse" }]}>
              <Text style={[styles.modalTitle, rtlTextAlign]}>{t("customerDetails")}</Text>
              <Pressable onPress={() => { playClickSound("light"); setShowDetail(false); }}><Ionicons name="close" size={24} color={Colors.text} /></Pressable>
            </View>

            {selectedCustomer && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={{ alignItems: "center", marginBottom: 16 }}>
                  <View style={[styles.avatar, { width: 64, height: 64, borderRadius: 32, marginRight: 0, marginBottom: 10 }]}>
                    <Text style={[styles.avatarText, { fontSize: 28 }]}>{selectedCustomer.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <Text style={{ color: Colors.text, fontSize: 20, fontWeight: "700" }}>{selectedCustomer.name}</Text>
                  {selectedCustomer.salutation && <Text style={{ color: Colors.textMuted, fontSize: 12, marginTop: 2 }}>({selectedCustomer.salutation})</Text>}
                  {selectedCustomer.company && <Text style={{ color: Colors.accent, fontSize: 13, marginTop: 4, fontWeight: "600" }}>🏢 {selectedCustomer.company}</Text>}
                  {selectedCustomer.customerNr && <Text style={{ color: Colors.textMuted, fontSize: 11, marginTop: 2 }}>Kunden-Nr: #{selectedCustomer.customerNr}</Text>}
                </View>

                {/* Stats Row */}
                <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 6, marginBottom: 14 }}>
                  <View style={styles.statBox}>
                    <Text style={[styles.statValue, { color: Colors.accent }]}>CHF {Number(selectedCustomer.totalSpent || selectedCustomer.legacyTotalSpent || 0).toFixed(0)}</Text>
                    <Text style={styles.statLabel}>{t("totalSpent")}</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={[styles.statValue, { color: Colors.info }]}>{selectedCustomer.orderCount || selectedCustomer.visitCount || 0}</Text>
                    <Text style={styles.statLabel}>{t("visits")}</Text>
                  </View>
                  {Number(selectedCustomer.averageOrderValue || 0) > 0 && (
                    <View style={styles.statBox}>
                      <Text style={[styles.statValue, { color: Colors.warning }]}>CHF {Number(selectedCustomer.averageOrderValue).toFixed(0)}</Text>
                      <Text style={styles.statLabel}>⌀ {language === "ar" ? "متوسط" : "Avg"}</Text>
                    </View>
                  )}
                  {(selectedCustomer.loyaltyPoints || 0) > 0 && (
                    <View style={styles.statBox}>
                      <View style={{ flexDirection: "row", gap: 3, alignItems: "center" }}>
                        <Ionicons name="star" size={14} color={Colors.warning} />
                        <Text style={[styles.statValue, { color: Colors.warning }]}>{selectedCustomer.loyaltyPoints}</Text>
                      </View>
                      <Text style={styles.statLabel}>{t("loyaltyPoints")}</Text>
                    </View>
                  )}
                </View>

                {/* Contact Info */}
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>📞 {language === "ar" ? "معلومات الاتصال" : "Contact"}</Text>
                  <InfoRow icon="call-outline" label={language === "ar" ? "هاتف" : "Telefon"} value={selectedCustomer.phone} isRTL={isRTL} />
                  <InfoRow icon="mail-outline" label={language === "ar" ? "بريد" : "Email"} value={selectedCustomer.email} isRTL={isRTL} />
                  {selectedCustomer.zhd && <InfoRow icon="person-outline" label="z.Hd." value={selectedCustomer.zhd} isRTL={isRTL} />}
                </View>

                {/* Address */}
                {(selectedCustomer.address || selectedCustomer.street || selectedCustomer.city) && (
                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>📍 {language === "ar" ? "العنوان" : "Adresse"}</Text>
                    {selectedCustomer.street && (
                      <InfoRow icon="navigate-outline" label={language === "ar" ? "الشارع" : "Strasse"} value={`${selectedCustomer.street || ""} ${selectedCustomer.streetNr || ""} ${selectedCustomer.houseNr || ""}`.trim()} isRTL={isRTL} />
                    )}
                    {(selectedCustomer.postalCode || selectedCustomer.city) && (
                      <InfoRow icon="business-outline" label={language === "ar" ? "المدينة" : "Ort"} value={`${selectedCustomer.postalCode || ""} ${selectedCustomer.city || ""}`.trim()} isRTL={isRTL} />
                    )}
                    {selectedCustomer.quadrat && (
                      <InfoRow icon="grid-outline" label="Quadrat" value={selectedCustomer.quadrat} isRTL={isRTL} />
                    )}
                    {selectedCustomer.address && !selectedCustomer.street && (
                      <InfoRow icon="location-outline" label={language === "ar" ? "العنوان" : "Adresse"} value={selectedCustomer.address} isRTL={isRTL} />
                    )}
                  </View>
                )}

                {/* Delivery */}
                {(selectedCustomer.howToGo || selectedCustomer.screenInfo) && (
                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>🚗 {language === "ar" ? "توصيل" : "Lieferung"}</Text>
                    <InfoRow icon="car-outline" label={language === "ar" ? "كيف تصل" : "How to Go"} value={selectedCustomer.howToGo} isRTL={isRTL} />
                    <InfoRow icon="tv-outline" label="Screen Info" value={selectedCustomer.screenInfo} isRTL={isRTL} />
                  </View>
                )}

                {/* Order History Dates */}
                {(selectedCustomer.firstOrderDate || selectedCustomer.lastOrderDate) && (
                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>📅 {language === "ar" ? "تاريخ الطلبات" : "Bestellhistorie"}</Text>
                    <InfoRow icon="calendar-outline" label={language === "ar" ? "أول طلب" : "Erste Bestellung"} value={selectedCustomer.firstOrderDate} isRTL={isRTL} />
                    <InfoRow icon="time-outline" label={language === "ar" ? "آخر طلب" : "Letzte Bestellung"} value={selectedCustomer.lastOrderDate} isRTL={isRTL} />
                  </View>
                )}

                {/* Notes */}
                {selectedCustomer.notes && (
                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>📝 {language === "ar" ? "ملاحظات" : "Notizen"}</Text>
                    <Text style={{ color: Colors.text, fontSize: 14, lineHeight: 20 }}>{selectedCustomer.notes}</Text>
                  </View>
                )}

                {/* Source & Legacy Metadata */}
                {(selectedCustomer.source || selectedCustomer.legacyRef || selectedCustomer.customerNr ||
                  selectedCustomer.r1 || selectedCustomer.r3 || selectedCustomer.r4 || selectedCustomer.r5 ||
                  selectedCustomer.r8 || selectedCustomer.r9 || selectedCustomer.r10 ||
                  Number(selectedCustomer.r14) > 0 || Number(selectedCustomer.r15) > 0) && (
                  <View style={[styles.detailSection, { backgroundColor: Colors.surface + "bb", borderStyle: "dashed", borderWidth: 1, borderColor: Colors.cardBorder }]}>
                    <Text style={styles.sectionTitle}>ℹ️ {language === "ar" ? "معلومات إضافية" : "Additional Info"}</Text>
                    {selectedCustomer.customerNr ? <InfoRow icon="id-card-outline" label="Kunden-Nr" value={`#${selectedCustomer.customerNr}`} isRTL={isRTL} /> : null}
                    {selectedCustomer.source ? <InfoRow icon="cloud-outline" label="Source" value={selectedCustomer.source} isRTL={isRTL} /> : null}
                    {selectedCustomer.legacyRef ? <InfoRow icon="link-outline" label="Legacy Ref" value={selectedCustomer.legacyRef} isRTL={isRTL} /> : null}
                    {selectedCustomer.r1 ? <InfoRow icon="code-outline" label="R1" value={selectedCustomer.r1} isRTL={isRTL} /> : null}
                    {selectedCustomer.r3 ? <InfoRow icon="code-outline" label="R3" value={selectedCustomer.r3} isRTL={isRTL} /> : null}
                    {selectedCustomer.r4 ? <InfoRow icon="code-outline" label="R4" value={selectedCustomer.r4} isRTL={isRTL} /> : null}
                    {selectedCustomer.r5 ? <InfoRow icon="code-outline" label="R5" value={selectedCustomer.r5} isRTL={isRTL} /> : null}
                    {selectedCustomer.r8 ? <InfoRow icon="code-outline" label="R8" value={selectedCustomer.r8} isRTL={isRTL} /> : null}
                    {selectedCustomer.r9 ? <InfoRow icon="code-outline" label="R9" value={selectedCustomer.r9} isRTL={isRTL} /> : null}
                    {selectedCustomer.r10 ? <InfoRow icon="code-outline" label="R10" value={selectedCustomer.r10} isRTL={isRTL} /> : null}
                    {Number(selectedCustomer.r14) > 0 ? <InfoRow icon="stats-chart-outline" label="R14" value={String(selectedCustomer.r14)} isRTL={isRTL} /> : null}
                    {Number(selectedCustomer.r15) > 0 ? <InfoRow icon="stats-chart-outline" label="R15" value={String(selectedCustomer.r15)} isRTL={isRTL} /> : null}
                  </View>
                )}

                {canManage && (
                  <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 8, marginBottom: 16 }}>
                    <Pressable style={{ flex: 1, borderRadius: 12, overflow: "hidden" }} onPress={() => { playClickSound("medium"); setShowDetail(false); openEdit(selectedCustomer); }}>
                      <LinearGradient colors={[Colors.accent, Colors.gradientMid]} style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", justifyContent: "center", paddingVertical: 12, gap: 6 }}>
                        <Ionicons name="create-outline" size={18} color={Colors.white} />
                        <Text style={{ color: Colors.white, fontSize: 14, fontWeight: "600" }}>{t("edit")}</Text>
                      </LinearGradient>
                    </Pressable>
                    {canDeleteCustomers && (
                      <Pressable style={{ flex: 1, borderRadius: 12, overflow: "hidden" }} onPress={() => {
                        const msg = `${t("delete")} "${selectedCustomer.name}"?`;
                        if (Platform.OS === "web") {
                          if (window.confirm(msg)) {
                            deleteMutation.mutate(selectedCustomer.id);
                          }
                        } else {
                          Alert.alert(
                            t("deleteCustomer" as any) || "Delete Customer",
                            msg,
                            [
                              { text: t("cancel"), style: "cancel" },
                              { text: t("delete"), style: "destructive", onPress: () => deleteMutation.mutate(selectedCustomer.id) },
                            ]
                          );
                        }
                      }}>
                        <View style={{ flexDirection: isRTL ? "row-reverse" : "row", backgroundColor: Colors.danger, alignItems: "center", justifyContent: "center", paddingVertical: 12, gap: 6 }}>
                          <Ionicons name="trash-outline" size={18} color={Colors.white} />
                          <Text style={{ color: Colors.white, fontSize: 14, fontWeight: "600" }}>{t("delete")}</Text>
                        </View>
                      </Pressable>
                    )}
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
  headerBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.15)", justifyContent: "center", alignItems: "center" },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.15)", justifyContent: "center", alignItems: "center" },
  searchRow: { paddingHorizontal: 12, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 8 },
  searchBox: { flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: Colors.inputBg, borderRadius: 12, paddingHorizontal: 12, height: 42, borderWidth: 1, borderColor: Colors.inputBorder },
  searchInput: { flex: 1, color: Colors.text, fontSize: 15 },
  countText: { color: Colors.textMuted, fontSize: 12, fontWeight: "600", minWidth: 36, textAlign: "right" },
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
  modalContent: { backgroundColor: Colors.surface, borderRadius: 20, padding: 24, width: "90%", maxWidth: 520, maxHeight: "85%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { color: Colors.text, fontSize: 20, fontWeight: "700" },
  label: { color: Colors.textSecondary, fontSize: 11, fontWeight: "600", marginBottom: 4, marginTop: 10, textTransform: "uppercase" as const, letterSpacing: 0.5 },
  sectionLabel: { color: Colors.accent, fontSize: 13, fontWeight: "700", marginTop: 16, marginBottom: 4 },
  input: { backgroundColor: Colors.inputBg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: Colors.text, fontSize: 15, borderWidth: 1, borderColor: Colors.inputBorder },
  saveBtn: { borderRadius: 14, overflow: "hidden", marginTop: 20, marginBottom: 16 },
  saveBtnGradient: { paddingVertical: 14, alignItems: "center" },
  saveBtnText: { color: Colors.white, fontSize: 16, fontWeight: "700" },
  loadMoreBtn: { marginVertical: 16, marginHorizontal: 4, borderRadius: 12, backgroundColor: Colors.gradientMid, paddingVertical: 14, alignItems: "center" },
  loadMoreText: { color: Colors.white, fontSize: 15, fontWeight: "600" },
  // Detail modal styles
  statBox: { flex: 1, backgroundColor: Colors.surfaceLight, borderRadius: 12, padding: 10, alignItems: "center" },
  statValue: { fontSize: 18, fontWeight: "800" },
  statLabel: { color: Colors.textMuted, fontSize: 10, marginTop: 2 },
  detailSection: { backgroundColor: Colors.surfaceLight, borderRadius: 12, padding: 12, marginBottom: 10 },
  sectionTitle: { color: Colors.textSecondary, fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
});
