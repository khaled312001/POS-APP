import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Text, View, Pressable, TextInput,
  Modal, Alert, ScrollView, Platform, ActivityIndicator, useWindowDimensions,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Colors } from "@/constants/colors";
import { themedStyles } from "@/lib/themed-styles";
import { apiRequest, getQueryFn } from "@/lib/query-client";
import { playClickSound } from "@/lib/sound";
import { useAuth } from "@/lib/auth-context";
import { useLanguage } from "@/lib/language-context";
import { useLicense } from "@/lib/license-context";
import { getChromeMetrics } from "@/lib/responsive";
import TabPageHeader, { HeaderIconButton } from "@/components/tab-page-header";
import LoyaltyBadge from "@/components/LoyaltyBadge";
import { formatMoney, useCurrency } from "@/lib/currency";
import {
  normalizeStorePhone, isValidStorePhone, storePhonePlaceholder, formatInStoreTz,
} from "@/components/store-locale";
import { router } from "expo-router";

const PAGE_SIZE = 200;

const EMPTY_FORM = {
  name: "", email: "", phone: "", address: "", notes: "", company: "",
  firstName: "", lastName: "", street: "", streetNr: "", houseNr: "",
  city: "", postalCode: "", salutation: "", zhd: "",
  howToGo: "", screenInfo: "", customerNr: "",
};

/** Arabic-Indic / Eastern Arabic-Indic digits → ASCII. */
function asciiDigits(v: string): string {
  return String(v ?? "")
    .replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 0x06f0));
}

/** apiRequest throws "409: {json}" — pull out the server's message. */
function apiErrorText(e: any): string {
  const raw = String(e?.message || e || "");
  const m = raw.match(/^\d{3}:\s*([\s\S]*)$/);
  if (!m) return raw;
  try {
    const data = JSON.parse(m[1]);
    return String(data?.error || data?.message || m[1]);
  } catch {
    return m[1] || raw;
  }
}

function InfoRow({ icon, label, value, rowDir, textAlign }: { icon: string; label: string; value?: string | null; rowDir: "row" | "row-reverse"; textAlign: any }) {
  if (!value) return null;
  return (
    <View style={{ flexDirection: rowDir, alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
      <Ionicons name={icon as any} size={15} color={Colors.accent} style={{ marginTop: 2 }} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[{ color: Colors.textMuted, fontSize: 10, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 }, textAlign]}>{label}</Text>
        <Text style={[{ color: Colors.text, fontSize: 14, marginTop: 1 }, textAlign]} selectable>{value}</Text>
      </View>
    </View>
  );
}

export default function CustomersScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const qc = useQueryClient();
  const { canManage, canDeleteCustomers } = useAuth();
  const { t, isRTL, rtlTextAlign, rtlText, language } = useLanguage();
  const { tenant } = useLicense();
  const currency = useCurrency();
  const isSwissStore = currency === "CHF";
  const { topPad, bottomPad } = getChromeMetrics(width);
  const tr = (en: string, de: string, ar: string) => (language === "ar" ? ar : language === "de" ? de : en);
  // On web the document is dir="rtl" already, so a plain "row" is right-to-left;
  // flipping it again would lay the Arabic UI out left-to-right.
  const rowDir: "row" | "row-reverse" = isRTL && Platform.OS !== "web" ? "row-reverse" : "row";
  const endAlign: "flex-start" | "flex-end" = isRTL && Platform.OS !== "web" ? "flex-start" : "flex-end";
  const dateLocale = language === "ar" ? "ar" : language === "de" ? "de-CH" : "en-GB";

  // Search state — raw (shown in input) + debounced (sent to API)
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedSearchRef = useRef("");

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
  const [importing, setImporting] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  // Swiss address autocomplete
  const [streetSuggestions, setStreetSuggestions] = useState<{ label: string }[]>([]);
  const [showStreetSuggestions, setShowStreetSuggestions] = useState(false);
  const [addressSearching, setAddressSearching] = useState(false);
  const streetSearchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (streetSearchRef.current) clearTimeout(streetSearchRef.current);
  }, []);

  const notify = (title: string, message: string) => {
    if (Platform.OS === "web" && typeof window !== "undefined") window.alert(`${title}\n\n${message}`);
    else Alert.alert(title, message);
  };

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
      // Arabic-Indic digits → ASCII so a phone typed on an Arabic keyboard still matches.
      const next = asciiDigits(text).trim();
      // Same query as now (e.g. a letter typed and deleted): keep the list —
      // clearing it would leave it empty, since the query key does not change.
      if (next === debouncedSearchRef.current) return;
      debouncedSearchRef.current = next;
      setDebouncedSearch(next);
      setOffset(0);
      setAllCustomers([]);
      setHasMore(true);
      loadingMore.current = false;
    }, 400);
  }, []);

  const queryUrl = tenant?.id
    ? `/api/customers?tenantId=${tenant.id}&limit=${PAGE_SIZE}&offset=${offset}${debouncedSearch ? `&search=${encodeURIComponent(debouncedSearch)}` : ""}`
    : null;

  const { data: pageData, isFetching, isError: listError, refetch: refetchList } = useQuery<any[]>({
    queryKey: [queryUrl],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!queryUrl,
  });

  useEffect(() => {
    if (!pageData) return;
    if (offset === 0) {
      setAllCustomers(pageData);
    } else {
      setAllCustomers(prev => {
        const seen = new Set(prev.map((c) => c.id));
        return [...prev, ...pageData.filter((c) => !seen.has(c.id))];
      });
    }
    setHasMore(pageData.length === PAGE_SIZE);
    loadingMore.current = false;
  }, [pageData]);

  const loadMore = () => {
    if (isFetching || !hasMore || loadingMore.current) return;
    loadingMore.current = true;
    setOffset(prev => prev + PAGE_SIZE);
  };

  // Refetch from the first page. The list is NOT cleared here: when the
  // refetched page is identical, react-query keeps the same array reference,
  // the effect above never fires, and a cleared list would stay empty.
  const invalidateCustomers = () => {
    qc.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).includes(`/api/customers`) });
    setOffset(0);
    setHasMore(true);
    loadingMore.current = false;
  };

  const { data: customerSales = [], isLoading: salesLoading, isError: salesError, refetch: refetchSales } = useQuery<any[]>({
    queryKey: [`/api/customers/${selectedCustomer?.id}/sales`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!selectedCustomer?.id && showDetail,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest(editCustomer ? "PUT" : "POST", editCustomer ? `/api/customers/${editCustomer.id}` : "/api/customers", data);
      return res.json().catch(() => null);
    },
    onSuccess: (saved: any) => {
      invalidateCustomers();
      // Keep the detail card in sync with what was just saved.
      if (saved && selectedCustomer && saved.id === selectedCustomer.id) setSelectedCustomer(saved);
      setShowForm(false);
      setEditCustomer(null);
      resetForm();
    },
    onError: (e: any) => notify(t("error"), apiErrorText(e) || tr("Could not save the customer.", "Kunde konnte nicht gespeichert werden.", "تعذّر حفظ العميل.")),
  });

  const runImport = async (base64: string) => {
    if (!tenant?.id) return;
    setImporting(true);
    try {
      const resRaw = await apiRequest("POST", "/api/customers/import", { fileBase64: base64, tenantId: tenant.id });
      const res = await resRaw.json();
      notify(t("success"), `${t("imported")} ${res.count ?? 0} ${t("customers")}`);
      invalidateCustomers();
    } catch (err: any) {
      notify(t("error"), apiErrorText(err) || tr("Import failed", "Import fehlgeschlagen", "فشل الاستيراد"));
    } finally {
      setImporting(false);
    }
  };

  // Imports the chosen spreadsheet (columns Name, Phone, Email, Address — the
  // server's /api/customers/template). CSV files are read by the same parser.
  const handleImport = async () => {
    if (importing) return;
    try {
      if (Platform.OS === "web") {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".xlsx,.xls,.csv";
        input.onchange = (e: any) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = (re: any) => { void runImport(String(re.target.result).split(",")[1]); };
          reader.onerror = () => notify(t("error"), tr("Could not read the file", "Datei konnte nicht gelesen werden", "تعذّرت قراءة الملف"));
          reader.readAsDataURL(file);
        };
        input.click();
      } else {
        const result = await DocumentPicker.getDocumentAsync({
          type: [
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.ms-excel",
            "text/csv",
            "text/comma-separated-values",
          ],
          copyToCacheDirectory: true,
        });
        if (result.canceled || !result.assets[0]) return;
        const response = await fetch(result.assets[0].uri);
        const blob = await response.blob();
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(String(reader.result).split(",")[1]);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        await runImport(base64);
      }
    } catch (err: any) {
      notify(t("error"), err?.message || tr("Import failed", "Import fehlgeschlagen", "فشل الاستيراد"));
    }
  };

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/customers/${id}`),
    onSuccess: (_d, id) => {
      setAllCustomers((prev) => prev.filter((c) => c.id !== id));
      invalidateCustomers();
      setShowDetail(false);
      setSelectedCustomer(null);
    },
    onError: (e: any) => notify(t("error"), apiErrorText(e)),
  });

  const searchSwissAddress = async (streetText: string, cityText: string) => {
    const query = [streetText, cityText].filter(Boolean).join(" ").trim();
    if (query.length < 3) {
      setStreetSuggestions([]);
      setShowStreetSuggestions(false);
      return;
    }
    setAddressSearching(true);
    try {
      const url = `https://api3.geo.admin.ch/rest/services/api/SearchServer?searchText=${encodeURIComponent(query)}&type=locations&origins=address&limit=12&sr=4326`;
      const res = await fetch(url);
      const data = await res.json();
      const results = (data.results || []).map((r: any) => ({ label: r.attrs.label as string }));
      setStreetSuggestions(results);
      setShowStreetSuggestions(results.length > 0);
    } catch {
      setStreetSuggestions([]);
      setShowStreetSuggestions(false);
    } finally {
      setAddressSearching(false);
    }
  };

  const parseAddressLabel = (label: string) => {
    const clean = label.replace(/<[^>]+>/g, "").trim();
    // Format from GeoAdmin: "Streetname [Nr] PLZ City"
    const m = clean.match(/^(.+?)\s+(\d{4})\s+(.+)$/);
    if (!m) return { street: clean, streetNr: "", postalCode: "", city: "" };
    const streetPart = m[1].trim();
    const postalCode = m[2];
    const city = m[3].trim();
    const nrM = streetPart.match(/^(.+?)\s+(\d+[a-zA-Z]?)$/);
    if (nrM) return { street: nrM[1].trim(), streetNr: nrM[2], postalCode, city };
    return { street: streetPart, streetNr: "", postalCode, city };
  };

  const selectStreetSuggestion = (label: string) => {
    const parsed = parseAddressLabel(label);
    setForm(prev => ({
      ...prev,
      street: parsed.street,
      streetNr: parsed.streetNr,
      postalCode: parsed.postalCode,
      city: parsed.city,
    }));
    setShowStreetSuggestions(false);
    setStreetSuggestions([]);
  };

  const handleStreetInputChange = (text: string, currentCity: string) => {
    setForm(prev => ({ ...prev, street: text }));
    // The GeoAdmin lookup only knows Swiss addresses.
    if (!isSwissStore) return;
    if (streetSearchRef.current) clearTimeout(streetSearchRef.current);
    streetSearchRef.current = setTimeout(() => searchSwissAddress(text, currentCity), 400);
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setStreetSuggestions([]);
    setShowStreetSuggestions(false);
  };

  const openCreate = () => {
    setEditCustomer(null);
    resetForm();
    setShowForm(true);
  };

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
    if (saveMutation.isPending) return;
    const name = form.name.trim() || [form.lastName.trim(), form.firstName.trim()].filter(Boolean).join(", ");
    if (!name) return notify(t("error"), tr("Enter the customer's name.", "Bitte den Namen des Kunden eingeben.", "أدخل اسم العميل."));
    const phoneRaw = form.phone.trim();
    // Legacy numbers are only re-checked when they are actually changed.
    const phoneChanged = !editCustomer || phoneRaw !== String(editCustomer.phone || "").trim();
    if (phoneRaw && phoneChanged && !isValidStorePhone(phoneRaw)) {
      return notify(t("error"), tr(
        `Enter a valid phone number (e.g. ${storePhonePlaceholder()}).`,
        `Bitte eine gültige Telefonnummer eingeben (z. B. ${storePhonePlaceholder()}).`,
        `أدخل رقم هاتف صحيحاً (مثل ${storePhonePlaceholder()}).`,
      ));
    }
    const phone = phoneRaw ? (phoneChanged ? normalizeStorePhone(phoneRaw) : phoneRaw) : "";
    const email = form.email.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return notify(t("error"), tr("Enter a valid email address.", "Bitte eine gültige E-Mail-Adresse eingeben.", "أدخل بريداً إلكترونياً صحيحاً."));
    }
    const customerNr = form.customerNr.trim();
    if (customerNr && !/^\d+$/.test(customerNr)) {
      return notify(t("error"), tr("Customer no. must be a number.", "Kunden-Nr. muss eine Zahl sein.", "رقم العميل يجب أن يكون رقماً."));
    }
    // Editing: a cleared field is sent as null so it is really cleared.
    const empty = editCustomer ? null : undefined;
    const val = (v: string) => v.trim() || empty;
    saveMutation.mutate({
      name,
      email: email || empty,
      phone: phone || empty,
      address: val(form.address),
      notes: val(form.notes),
      company: val(form.company),
      firstName: val(form.firstName),
      lastName: val(form.lastName),
      street: val(form.street),
      streetNr: val(form.streetNr),
      houseNr: val(form.houseNr),
      city: val(form.city),
      postalCode: val(form.postalCode),
      salutation: val(form.salutation),
      zhd: val(form.zhd),
      howToGo: val(form.howToGo),
      screenInfo: val(form.screenInfo),
      customerNr: customerNr ? parseInt(customerNr, 10) : empty,
      tenantId: tenant?.id,
    });
  };

  const confirmDelete = (c: any) => {
    if (c.customerType === "wholesale") {
      return notify(
        tr("Wholesale trader", "Großhändler", "تاجر جملة"),
        tr(
          "This customer is a wholesale trader. Deactivate them from the Wholesale traders screen so their balance and statement are kept.",
          "Dieser Kunde ist ein Großhändler. Bitte im Bereich Großhändler deaktivieren, damit Saldo und Kontoauszug erhalten bleiben.",
          "هذا العميل تاجر جملة. أوقفه من شاشة تجار الجملة ليبقى رصيده وكشف حسابه محفوظين.",
        ),
      );
    }
    const title = t("deleteCustomer");
    const msg = tr(
      `Delete "${c.name}" permanently? This cannot be undone.`,
      `„${c.name}" endgültig löschen? Dies kann nicht rückgängig gemacht werden.`,
      `حذف "${c.name}" نهائياً؟ لا يمكن التراجع عن ذلك.`,
    );
    if (Platform.OS === "web" && typeof window !== "undefined") {
      if (window.confirm(`${title}\n\n${msg}`)) deleteMutation.mutate(c.id);
      return;
    }
    Alert.alert(title, msg, [
      { text: t("cancel"), style: "cancel" },
      { text: t("delete"), style: "destructive", onPress: () => deleteMutation.mutate(c.id) },
    ]);
  };

  // Helper to get subtitle for list card
  const getSubtitle = (item: any) => {
    const parts: string[] = [];
    if (item.city) parts.push(item.city);
    if (item.phone) parts.push(item.phone);
    if (parts.length === 0 && item.email) parts.push(item.email);
    if (parts.length === 0) parts.push(t("noContactInfo"));
    return parts.join(" · ");
  };

  const paymentLabel = (m: string | null | undefined) => {
    switch (String(m || "cash").toLowerCase()) {
      case "cash": return tr("Cash", "Bar", "نقداً");
      case "card": return tr("Card", "Karte", "بطاقة");
      case "credit": return tr("On account", "Auf Rechnung", "آجل");
      case "mixed":
      case "split": return tr("Split", "Geteilt", "مقسّم");
      case "shamcash": return "Sham Cash";
      case "wallet": return tr("Wallet", "Guthaben", "المحفظة");
      default: return String(m);
    }
  };

  const spent = (c: any) => Number(c?.totalSpent || 0) || Number(c?.legacyTotalSpent || 0);
  const initial = (s: unknown) => (String(s || "").trim().charAt(0) || "?").toUpperCase();
  const labelText = (s: string) => <Text style={[styles.label, rtlTextAlign]} numberOfLines={1}>{s}</Text>;
  const inputStyle = [styles.input, rtlTextAlign, rtlText];

  const closeX = (onPress: () => void) => (
    <Pressable onPress={onPress} hitSlop={10} style={styles.closeBtn} accessibilityRole="button" accessibilityLabel={t("close")}>
      <Ionicons name="close" size={24} color={Colors.text} />
    </Pressable>
  );

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
        title={t("customers")}
        icon="people"
        badgeText={`${totalCount} ${t("total")}`}
        isRTL={isRTL}
        rightActions={
          <View style={{ flexDirection: rowDir, gap: 8 }}>
            {/* Wholesale traders (تجار الجملة) — app/wholesale.tsx */}
            <HeaderIconButton icon="storefront-outline" onPress={() => { playClickSound("medium"); router.push("/wholesale" as any); }} />
            {canManage && (
              <HeaderIconButton icon="cloud-upload" onPress={() => { playClickSound("medium"); void handleImport(); }} />
            )}
            <HeaderIconButton icon="add" onPress={() => { playClickSound("medium"); openCreate(); }} />
          </View>
        }
      />

      {importing && (
        <View style={[styles.banner, { flexDirection: rowDir }]}>
          <ActivityIndicator size="small" color={Colors.accent} />
          <Text style={[styles.bannerText, rtlTextAlign]}>{tr("Importing customers…", "Kunden werden importiert…", "جارٍ استيراد العملاء…")}</Text>
        </View>
      )}

      <View style={[styles.searchRow, { flexDirection: rowDir }]}>
        <View style={[styles.searchBox, { flexDirection: rowDir }]}>
          <Ionicons name="search" size={18} color={Colors.textMuted} />
          <TextInput
            style={[styles.searchInput, rtlTextAlign, rtlText]}
            placeholder={tr("Search name, phone, email…", "Name, Telefon, E-Mail suchen…", "ابحث بالاسم أو الهاتف أو البريد…")}
            placeholderTextColor={Colors.textMuted}
            value={search}
            onChangeText={handleSearchChange}
          />
          {isFetching ? (
            <ActivityIndicator size="small" color={Colors.textMuted} />
          ) : !!search ? (
            <Pressable onPress={() => handleSearchChange("")} hitSlop={10} accessibilityLabel={t("close")}>
              <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
            </Pressable>
          ) : null}
        </View>
        {totalCount > 0 && (
          <Text style={styles.countText}>
            {allCustomers.length}/{totalCount}
          </Text>
        )}
      </View>

      <ScrollView contentContainerStyle={[styles.list, { paddingBottom: bottomPad + 16 }]} keyboardShouldPersistTaps="handled">
        {isFetching && allCustomers.length === 0 ? (
          <View style={styles.empty}><ActivityIndicator size="large" color={Colors.accent} /></View>
        ) : listError && allCustomers.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="cloud-offline-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>{tr("Could not load customers.", "Kunden konnten nicht geladen werden.", "تعذّر تحميل العملاء.")}</Text>
            <Pressable style={styles.primarySmallBtn} onPress={() => refetchList()}>
              <Text style={styles.primarySmallText}>{tr("Retry", "Erneut versuchen", "إعادة المحاولة")}</Text>
            </Pressable>
          </View>
        ) : allCustomers.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name={debouncedSearch ? "search-outline" : "people-outline"} size={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>
              {debouncedSearch ? tr("No customers match your search.", "Keine Kunden gefunden.", "لا يوجد عملاء مطابقون.") : t("noCustomers")}
            </Text>
            {!debouncedSearch && (
              <Pressable style={styles.primarySmallBtn} onPress={openCreate}>
                <Text style={styles.primarySmallText}>{t("addCustomer")}</Text>
              </Pressable>
            )}
          </View>
        ) : (
          <>
            {allCustomers.map((item: any) => (
              <Pressable key={String(item.id)} style={[styles.card, { flexDirection: rowDir }]} onPress={() => { playClickSound("light"); setSelectedCustomer(item); setShowDetail(true); }}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initial(item.name)}</Text>
                </View>
                <View style={styles.cardInfo}>
                  <View style={{ flexDirection: rowDir, alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <Text style={[styles.cardName, rtlTextAlign, { flexShrink: 1 }]} numberOfLines={1}>{item.name}</Text>
                    {item.customerNr ? (
                      <View style={styles.nrTag}>
                        <Text style={{ color: Colors.accent, fontSize: 10, fontWeight: "700" }}>#{item.customerNr}</Text>
                      </View>
                    ) : null}
                    {item.customerType === "wholesale" ? (
                      <View style={[styles.nrTag, { borderColor: Colors.info }]}>
                        <Text style={{ color: Colors.info, fontSize: 10, fontWeight: "700" }}>{tr("Wholesale", "Großhandel", "جملة")}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={[styles.cardMeta, rtlTextAlign]} numberOfLines={1}>{getSubtitle(item)}</Text>
                  {item.company ? <Text style={[{ color: Colors.accent, fontSize: 11, marginTop: 2 }, rtlTextAlign]} numberOfLines={1}>{item.company}</Text> : null}
                </View>
                <View style={[styles.cardRight, { alignItems: endAlign }]}>
                  {(item.orderCount > 0 || item.visitCount > 0) && (
                    <View style={[styles.loyaltyBadge, { backgroundColor: Colors.accent + "15", flexDirection: rowDir }]}>
                      <Ionicons name="receipt-outline" size={12} color={Colors.accent} />
                      <Text style={[styles.loyaltyText, { color: Colors.accent }]}>{item.orderCount || item.visitCount}</Text>
                    </View>
                  )}
                  {spent(item) > 0 && (
                    <Text style={styles.totalSpent} numberOfLines={1}>{formatMoney(spent(item), 0)}</Text>
                  )}
                  {item.loyaltyPoints > 0 && (
                    <View style={[styles.loyaltyBadge, { flexDirection: rowDir }]}>
                      <Ionicons name="star" size={11} color={Colors.warning} />
                      <Text style={styles.loyaltyText}>{Number(item.loyaltyPoints).toLocaleString("en-US")}</Text>
                    </View>
                  )}
                  {item.loyaltyTier && item.loyaltyTier !== "bronze" ? (
                    <LoyaltyBadge tier={item.loyaltyTier} compact />
                  ) : null}
                  {Number(item.walletBalance || 0) > 0 && (
                    <View style={{ backgroundColor: Colors.success + "1F", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                      <Text style={{ color: Colors.success, fontSize: 10, fontWeight: "700" }} numberOfLines={1}>{formatMoney(item.walletBalance)}</Text>
                    </View>
                  )}
                </View>
              </Pressable>
            ))}

            {hasMore && (
              <Pressable style={[styles.loadMoreBtn, isFetching && { opacity: 0.7 }]} onPress={loadMore} disabled={isFetching}>
                {isFetching ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Text style={styles.loadMoreText}>{tr("Load more", "Mehr laden", "تحميل المزيد")}</Text>
                )}
              </Pressable>
            )}
          </>
        )}
      </ScrollView>

      {/* Add / Edit Customer Modal */}
      <Modal visible={showForm} animationType="slide" transparent onRequestClose={() => { if (!saveMutation.isPending) setShowForm(false); }}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: "92%" }]}>
            <View style={[styles.modalHeader, { flexDirection: rowDir }]}>
              <Text style={[styles.modalTitle, rtlTextAlign]} numberOfLines={1}>{editCustomer ? tr("Edit customer", "Kunde bearbeiten", "تعديل العميل") : t("addCustomer")}</Text>
              {closeX(() => { if (!saveMutation.isPending) { playClickSound("light"); setShowForm(false); } })}
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={[styles.sectionLabel, rtlTextAlign]}>{tr("Basic info", "Grunddaten", "معلومات أساسية")}</Text>

              <View style={{ flexDirection: rowDir, gap: 8 }}>
                <View style={{ width: 90 }}>
                  {labelText(tr("Title", "Anrede", "اللقب"))}
                  <TextInput style={inputStyle} value={form.salutation} onChangeText={(v) => setForm({ ...form, salutation: v })} placeholderTextColor={Colors.textMuted} placeholder={tr("Mr/Ms", "Herr/Frau", "السيد/ة")} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  {labelText(tr("First name", "Vorname", "الاسم الأول"))}
                  <TextInput style={inputStyle} value={form.firstName} onChangeText={(v) => setForm({ ...form, firstName: v })} placeholderTextColor={Colors.textMuted} placeholder={tr("First name", "Vorname", "الاسم الأول")} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  {labelText(tr("Last name", "Nachname", "اسم العائلة"))}
                  <TextInput style={inputStyle} value={form.lastName} onChangeText={(v) => setForm({ ...form, lastName: v })} placeholderTextColor={Colors.textMuted} placeholder={tr("Last name", "Nachname", "اسم العائلة")} />
                </View>
              </View>

              {labelText(`${t("customerName")} *`)}
              <TextInput style={inputStyle} value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} placeholderTextColor={Colors.textMuted} placeholder={form.lastName || form.firstName ? [form.lastName, form.firstName].filter(Boolean).join(", ") : t("customerName")} />

              {labelText(tr("Company", "Firma", "الشركة"))}
              <TextInput style={inputStyle} value={form.company} onChangeText={(v) => setForm({ ...form, company: v })} placeholderTextColor={Colors.textMuted} placeholder={tr("Company", "Firma", "اسم الشركة")} />

              {labelText(t("phone"))}
              <TextInput style={[styles.input, rtlTextAlign]} value={form.phone} onChangeText={(v) => setForm({ ...form, phone: v })} keyboardType="phone-pad" placeholderTextColor={Colors.textMuted} placeholder={storePhonePlaceholder()} />

              {labelText(t("email"))}
              <TextInput style={[styles.input, rtlTextAlign]} value={form.email} onChangeText={(v) => setForm({ ...form, email: v })} keyboardType="email-address" placeholderTextColor={Colors.textMuted} placeholder="email@example.com" autoCapitalize="none" autoCorrect={false} />

              <View style={{ flexDirection: rowDir, gap: 8, marginTop: 4 }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  {labelText(tr("Attn. / c/o", "z.Hd. (Zusatz)", "بعناية / لدى"))}
                  <TextInput style={inputStyle} value={form.zhd} onChangeText={(v) => setForm({ ...form, zhd: v })} placeholderTextColor={Colors.textMuted} placeholder={tr("Attn.", "z.Hd.", "بعناية")} />
                </View>
                <View style={{ width: 110 }}>
                  {labelText(tr("Cust. no.", "Kunden-Nr.", "رقم العميل"))}
                  <TextInput style={[styles.input, rtlTextAlign]} value={form.customerNr} onChangeText={(v) => setForm({ ...form, customerNr: asciiDigits(v).replace(/[^0-9]/g, "") })} keyboardType="number-pad" placeholderTextColor={Colors.textMuted} placeholder="123" />
                </View>
              </View>

              <Text style={[styles.sectionLabel, rtlTextAlign]}>{tr("Delivery info", "Lieferinfos", "معلومات التوصيل")}</Text>
              {labelText(tr("Directions", "Anfahrt", "كيف تصل"))}
              <TextInput style={inputStyle} value={form.howToGo} onChangeText={(v) => setForm({ ...form, howToGo: v })} placeholderTextColor={Colors.textMuted} placeholder={tr("Driving directions…", "Wegbeschreibung…", "وصف الطريق…")} />

              {labelText(tr("Door / screen info", "Tür-/Bildschirminfo", "معلومات الباب / الشاشة"))}
              <TextInput style={inputStyle} value={form.screenInfo} onChangeText={(v) => setForm({ ...form, screenInfo: v })} placeholderTextColor={Colors.textMuted} placeholder={tr("Door code, floor…", "Türcode, Stockwerk…", "رمز الباب، الطابق…")} />

              <Text style={[styles.sectionLabel, rtlTextAlign]}>{tr("Address", "Adresse", "العنوان")}</Text>

              {/* Quick city picker (Swiss stores) */}
              {isSwissStore && (
                <>
                  {labelText(tr("Pick a city", "Stadt wählen", "اختر المدينة"))}
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }} keyboardShouldPersistTaps="handled">
                    <View style={{ flexDirection: rowDir, gap: 6, paddingBottom: 4 }}>
                      {["Zürich", "Winterthur", "Bern", "Basel", "Genf", "Lausanne", "Luzern", "St. Gallen", "Zug", "Schaffhausen", "Frauenfeld", "Uster"].map((c) => (
                        <Pressable
                          key={c}
                          onPress={() => { playClickSound("light"); setForm(prev => ({ ...prev, city: c })); }}
                          style={[
                            styles.chip,
                            form.city === c
                              ? { backgroundColor: Colors.accent, borderColor: Colors.accent }
                              : { backgroundColor: Colors.surfaceLight, borderColor: Colors.cardBorder },
                          ]}
                        >
                          <Text style={[{ fontSize: 12, fontWeight: "600" }, form.city === c ? { color: Colors.textDark } : { color: Colors.text }]}>
                            {c}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </ScrollView>
                </>
              )}

              {/* Street input with GeoAdmin autocomplete (Swiss stores) */}
              <View style={{ flexDirection: rowDir, gap: 8 }}>
                <View style={{ flex: 2, minWidth: 0 }}>
                  {labelText(tr("Street", "Strasse", "الشارع"))}
                  <View>
                    <TextInput
                      style={inputStyle}
                      value={form.street}
                      onChangeText={(v) => handleStreetInputChange(v, form.city)}
                      onBlur={() => setTimeout(() => setShowStreetSuggestions(false), 200)}
                      placeholderTextColor={Colors.textMuted}
                      placeholder={isSwissStore ? tr("Type to search…", "Tippen zum Suchen…", "ابدأ الكتابة للبحث…") : tr("Street", "Strasse", "الشارع")}
                    />
                    {addressSearching && (
                      <ActivityIndicator size="small" color={Colors.accent} style={{ position: "absolute", [isRTL ? "left" : "right"]: 10, top: 14 } as any} />
                    )}
                  </View>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  {labelText(tr("No.", "Nr.", "رقم"))}
                  <TextInput style={inputStyle} value={form.streetNr} onChangeText={(v) => setForm({ ...form, streetNr: v })} placeholderTextColor={Colors.textMuted} placeholder={tr("No.", "Nr.", "رقم")} />
                </View>
              </View>

              {/* Address suggestions dropdown */}
              {showStreetSuggestions && streetSuggestions.length > 0 && (
                <View style={styles.suggestBox}>
                  <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                    {streetSuggestions.map((s, i) => {
                      const display = s.label.replace(/<[^>]+>/g, "");
                      return (
                        <Pressable
                          key={i}
                          onPress={() => { playClickSound("light"); selectStreetSuggestion(s.label); }}
                          style={({ pressed }) => [
                            { minHeight: 44, padding: 10, flexDirection: rowDir, alignItems: "center", gap: 8 },
                            i < streetSuggestions.length - 1 && { borderBottomWidth: 1, borderBottomColor: Colors.cardBorder },
                            pressed && { backgroundColor: Colors.accent + "25" },
                          ]}
                        >
                          <Ionicons name="location-outline" size={14} color={Colors.accent} />
                          <Text style={{ color: Colors.text, fontSize: 13, flex: 1 }} numberOfLines={1}>{display}</Text>
                        </Pressable>
                      );
                    })}
                    <Pressable
                      onPress={() => setShowStreetSuggestions(false)}
                      style={{ minHeight: 40, padding: 8, alignItems: "center", justifyContent: "center", borderTopWidth: 1, borderTopColor: Colors.cardBorder }}
                    >
                      <Text style={{ color: Colors.textMuted, fontSize: 12 }}>{t("close")}</Text>
                    </Pressable>
                  </ScrollView>
                </View>
              )}

              <View style={{ flexDirection: rowDir, gap: 8 }}>
                <View style={{ width: 100 }}>
                  {labelText(tr("Postcode", "PLZ", "الرمز البريدي"))}
                  <TextInput style={[styles.input, rtlTextAlign]} value={form.postalCode} onChangeText={(v) => setForm({ ...form, postalCode: asciiDigits(v) })} keyboardType="number-pad" placeholderTextColor={Colors.textMuted} placeholder={tr("Postcode", "PLZ", "الرمز")} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  {labelText(tr("City", "Ort", "المدينة"))}
                  <TextInput style={inputStyle} value={form.city} onChangeText={(v) => setForm({ ...form, city: v })} placeholderTextColor={Colors.textMuted} placeholder={tr("City", "Ort", "المدينة")} />
                </View>
              </View>

              {labelText(`${t("address")} (${tr("full", "vollständig", "كامل")})`)}
              <TextInput style={inputStyle} value={form.address} onChangeText={(v) => setForm({ ...form, address: v })} placeholderTextColor={Colors.textMuted} placeholder={t("address")} />

              {labelText(t("notes"))}
              <TextInput style={[...inputStyle, { height: 80, textAlignVertical: "top" }]} value={form.notes} onChangeText={(v) => setForm({ ...form, notes: v })} multiline placeholderTextColor={Colors.textMuted} placeholder={t("notes")} />

              <Pressable style={[styles.saveBtn, saveMutation.isPending && { opacity: 0.7 }]} disabled={saveMutation.isPending} onPress={() => { playClickSound("heavy"); handleSave(); }}>
                <LinearGradient colors={[Colors.accent, Colors.gradientMid]} style={styles.saveBtnGradient}>
                  {saveMutation.isPending ? <ActivityIndicator color={Colors.white} /> : (
                    <Text style={styles.saveBtnText}>{editCustomer ? t("save") : t("addCustomer")}</Text>
                  )}
                </LinearGradient>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Customer Detail Modal */}
      <Modal visible={showDetail} animationType="slide" transparent onRequestClose={() => setShowDetail(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: "92%" }]}>
            <View style={[styles.modalHeader, { flexDirection: rowDir }]}>
              <Text style={[styles.modalTitle, rtlTextAlign]} numberOfLines={1}>{t("customerDetails")}</Text>
              {closeX(() => { playClickSound("light"); setShowDetail(false); })}
            </View>

            {selectedCustomer && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={{ alignItems: "center", marginBottom: 16 }}>
                  <View style={[styles.avatar, { width: 64, height: 64, borderRadius: 32, marginBottom: 10 }]}>
                    <Text style={[styles.avatarText, { fontSize: 28 }]}>{initial(selectedCustomer.name)}</Text>
                  </View>
                  <Text style={{ color: Colors.text, fontSize: 20, fontWeight: "700", textAlign: "center" }}>{selectedCustomer.name || "—"}</Text>
                  {selectedCustomer.salutation ? <Text style={{ color: Colors.textMuted, fontSize: 12, marginTop: 2 }}>({selectedCustomer.salutation})</Text> : null}
                  {selectedCustomer.company ? <Text style={{ color: Colors.accent, fontSize: 13, marginTop: 4, fontWeight: "600" }}>{selectedCustomer.company}</Text> : null}
                  {selectedCustomer.customerNr ? <Text style={{ color: Colors.textMuted, fontSize: 11, marginTop: 2 }}>{tr("Customer no.", "Kunden-Nr.", "رقم العميل")}: #{selectedCustomer.customerNr}</Text> : null}
                  {selectedCustomer.customerType === "wholesale" ? (
                    <Pressable onPress={() => { setShowDetail(false); router.push("/wholesale" as any); }} style={[styles.nrTag, { borderColor: Colors.info, marginTop: 6, paddingVertical: 4, paddingHorizontal: 10 }]}>
                      <Text style={{ color: Colors.info, fontSize: 12, fontWeight: "700" }}>{tr("Wholesale trader — open statement", "Großhändler — Kontoauszug öffnen", "تاجر جملة — فتح كشف الحساب")}</Text>
                    </Pressable>
                  ) : null}
                  {selectedCustomer.loyaltyTier ? (
                    <View style={{ marginTop: 6 }}>
                      <LoyaltyBadge tier={selectedCustomer.loyaltyTier} points={Number(selectedCustomer.loyaltyPoints) || 0} />
                    </View>
                  ) : null}
                  {selectedCustomer.referralCode ? (
                    <Text style={{ color: Colors.textMuted, fontSize: 11, marginTop: 4 }} selectable>{t("referralCode")}: {selectedCustomer.referralCode}</Text>
                  ) : null}
                </View>

                {/* Stats Row */}
                <View style={{ flexDirection: rowDir, flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
                  <View style={styles.statBox}>
                    <Text style={[styles.statValue, { color: Colors.accent }]} numberOfLines={1} adjustsFontSizeToFit>{formatMoney(spent(selectedCustomer), 0)}</Text>
                    <Text style={styles.statLabel}>{t("totalSpent")}</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={[styles.statValue, { color: Colors.info }]}>{selectedCustomer.orderCount || selectedCustomer.visitCount || 0}</Text>
                    <Text style={styles.statLabel}>{t("visits")}</Text>
                  </View>
                  {Number(selectedCustomer.averageOrderValue || 0) > 0 && (
                    <View style={styles.statBox}>
                      <Text style={[styles.statValue, { color: Colors.warning }]} numberOfLines={1} adjustsFontSizeToFit>{formatMoney(selectedCustomer.averageOrderValue, 0)}</Text>
                      <Text style={styles.statLabel}>{tr("Avg. order", "Ø Bestellung", "متوسط الطلب")}</Text>
                    </View>
                  )}
                  {(selectedCustomer.loyaltyPoints || 0) > 0 && (
                    <View style={styles.statBox}>
                      <View style={{ flexDirection: rowDir, gap: 3, alignItems: "center" }}>
                        <Ionicons name="star" size={14} color={Colors.warning} />
                        <Text style={[styles.statValue, { color: Colors.warning }]}>{Number(selectedCustomer.loyaltyPoints).toLocaleString("en-US")}</Text>
                      </View>
                      <Text style={styles.statLabel}>{t("loyaltyPoints")}</Text>
                    </View>
                  )}
                  {Number(selectedCustomer.walletBalance || 0) > 0 && (
                    <View style={styles.statBox}>
                      <Text style={[styles.statValue, { color: Colors.success }]} numberOfLines={1} adjustsFontSizeToFit>
                        {formatMoney(selectedCustomer.walletBalance)}
                      </Text>
                      <Text style={styles.statLabel}>{t("walletBalance")}</Text>
                    </View>
                  )}
                </View>

                {/* Contact Info */}
                {(selectedCustomer.phone || selectedCustomer.email || selectedCustomer.zhd) ? (
                  <View style={styles.detailSection}>
                    <Text style={[styles.sectionTitle, rtlTextAlign]}>{tr("Contact", "Kontakt", "معلومات الاتصال")}</Text>
                    <InfoRow icon="call-outline" label={t("phone")} value={selectedCustomer.phone} rowDir={rowDir} textAlign={rtlTextAlign} />
                    <InfoRow icon="mail-outline" label={t("email")} value={selectedCustomer.email} rowDir={rowDir} textAlign={rtlTextAlign} />
                    <InfoRow icon="person-outline" label={tr("Attn. / c/o", "z.Hd.", "بعناية / لدى")} value={selectedCustomer.zhd} rowDir={rowDir} textAlign={rtlTextAlign} />
                  </View>
                ) : null}

                {/* Address */}
                {(selectedCustomer.address || selectedCustomer.street || selectedCustomer.city) ? (
                  <View style={styles.detailSection}>
                    <Text style={[styles.sectionTitle, rtlTextAlign]}>{tr("Address", "Adresse", "العنوان")}</Text>
                    {selectedCustomer.street ? (
                      <InfoRow icon="navigate-outline" label={tr("Street", "Strasse", "الشارع")} value={`${selectedCustomer.street || ""} ${selectedCustomer.streetNr || ""} ${selectedCustomer.houseNr || ""}`.trim()} rowDir={rowDir} textAlign={rtlTextAlign} />
                    ) : null}
                    {(selectedCustomer.postalCode || selectedCustomer.city) ? (
                      <InfoRow icon="business-outline" label={tr("City", "Ort", "المدينة")} value={`${selectedCustomer.postalCode || ""} ${selectedCustomer.city || ""}`.trim()} rowDir={rowDir} textAlign={rtlTextAlign} />
                    ) : null}
                    <InfoRow icon="grid-outline" label="Quadrat" value={selectedCustomer.quadrat} rowDir={rowDir} textAlign={rtlTextAlign} />
                    {!selectedCustomer.street ? (
                      <InfoRow icon="location-outline" label={tr("Address", "Adresse", "العنوان")} value={selectedCustomer.address} rowDir={rowDir} textAlign={rtlTextAlign} />
                    ) : null}
                  </View>
                ) : null}

                {/* Delivery */}
                {(selectedCustomer.howToGo || selectedCustomer.screenInfo) ? (
                  <View style={styles.detailSection}>
                    <Text style={[styles.sectionTitle, rtlTextAlign]}>{tr("Delivery", "Lieferung", "توصيل")}</Text>
                    <InfoRow icon="car-outline" label={tr("Directions", "Anfahrt", "كيف تصل")} value={selectedCustomer.howToGo} rowDir={rowDir} textAlign={rtlTextAlign} />
                    <InfoRow icon="tv-outline" label={tr("Door / screen info", "Tür-/Bildschirminfo", "معلومات الباب / الشاشة")} value={selectedCustomer.screenInfo} rowDir={rowDir} textAlign={rtlTextAlign} />
                  </View>
                ) : null}

                {/* Order History Dates */}
                {(selectedCustomer.firstOrderDate || selectedCustomer.lastOrderDate) ? (
                  <View style={styles.detailSection}>
                    <Text style={[styles.sectionTitle, rtlTextAlign]}>{tr("Order history", "Bestellhistorie", "تاريخ الطلبات")}</Text>
                    <InfoRow icon="calendar-outline" label={tr("First order", "Erste Bestellung", "أول طلب")} value={selectedCustomer.firstOrderDate} rowDir={rowDir} textAlign={rtlTextAlign} />
                    <InfoRow icon="time-outline" label={tr("Last order", "Letzte Bestellung", "آخر طلب")} value={selectedCustomer.lastOrderDate} rowDir={rowDir} textAlign={rtlTextAlign} />
                  </View>
                ) : null}

                {/* Notes */}
                {selectedCustomer.notes ? (
                  <View style={styles.detailSection}>
                    <Text style={[styles.sectionTitle, rtlTextAlign]}>{t("notes")}</Text>
                    <Text style={[{ color: Colors.text, fontSize: 14, lineHeight: 20 }, rtlTextAlign]} selectable>{selectedCustomer.notes}</Text>
                  </View>
                ) : null}

                {/* Source & Legacy Metadata */}
                {(selectedCustomer.source || selectedCustomer.legacyRef ||
                  selectedCustomer.r1 || selectedCustomer.r3 || selectedCustomer.r4 || selectedCustomer.r5 ||
                  selectedCustomer.r8 || selectedCustomer.r9 || selectedCustomer.r10 ||
                  Number(selectedCustomer.r14) > 0 || Number(selectedCustomer.r15) > 0) ? (
                  <View style={[styles.detailSection, { borderStyle: "dashed", borderWidth: 1, borderColor: Colors.cardBorder }]}>
                    <Text style={[styles.sectionTitle, rtlTextAlign]}>{tr("Additional info", "Zusatzinfos", "معلومات إضافية")}</Text>
                    <InfoRow icon="cloud-outline" label={tr("Source", "Quelle", "المصدر")} value={selectedCustomer.source} rowDir={rowDir} textAlign={rtlTextAlign} />
                    <InfoRow icon="link-outline" label={tr("Legacy ref.", "Alt-Referenz", "مرجع قديم")} value={selectedCustomer.legacyRef} rowDir={rowDir} textAlign={rtlTextAlign} />
                    {(["r1", "r3", "r4", "r5", "r8", "r9", "r10"] as const).map((k) => (
                      <InfoRow key={k} icon="code-outline" label={k.toUpperCase()} value={selectedCustomer[k]} rowDir={rowDir} textAlign={rtlTextAlign} />
                    ))}
                    {Number(selectedCustomer.r14) > 0 ? <InfoRow icon="stats-chart-outline" label="R14" value={String(selectedCustomer.r14)} rowDir={rowDir} textAlign={rtlTextAlign} /> : null}
                    {Number(selectedCustomer.r15) > 0 ? <InfoRow icon="stats-chart-outline" label="R15" value={String(selectedCustomer.r15)} rowDir={rowDir} textAlign={rtlTextAlign} /> : null}
                  </View>
                ) : null}

                {(canManage || canDeleteCustomers) && (
                  <View style={{ flexDirection: rowDir, gap: 8, marginBottom: 16 }}>
                    {canManage && (
                      <Pressable style={{ flex: 1, borderRadius: 12, overflow: "hidden" }} onPress={() => { playClickSound("medium"); setShowDetail(false); openEdit(selectedCustomer); }}>
                        <LinearGradient colors={[Colors.accent, Colors.gradientMid]} style={[styles.actionBtn, { flexDirection: rowDir }]}>
                          <Ionicons name="create-outline" size={18} color={Colors.white} />
                          <Text style={{ color: Colors.white, fontSize: 14, fontWeight: "600" }}>{t("edit")}</Text>
                        </LinearGradient>
                      </Pressable>
                    )}
                    {canDeleteCustomers && (
                      <Pressable
                        style={[styles.actionBtn, styles.dangerOutline, { flex: 1, flexDirection: rowDir }, deleteMutation.isPending && { opacity: 0.6 }]}
                        disabled={deleteMutation.isPending}
                        onPress={() => confirmDelete(selectedCustomer)}
                      >
                        {deleteMutation.isPending ? <ActivityIndicator color={Colors.danger} /> : (
                          <>
                            <Ionicons name="trash-outline" size={18} color={Colors.danger} />
                            <Text style={{ color: Colors.danger, fontSize: 14, fontWeight: "700" }}>{t("delete")}</Text>
                          </>
                        )}
                      </Pressable>
                    )}
                  </View>
                )}

                <Text style={[styles.historyTitle, rtlTextAlign]}>{t("purchaseHistory")}</Text>

                {salesLoading ? (
                  <ActivityIndicator color={Colors.accent} style={{ paddingVertical: 24 }} />
                ) : salesError ? (
                  <View style={{ alignItems: "center", paddingVertical: 20, gap: 10 }}>
                    <Text style={{ color: Colors.textMuted, fontSize: 13 }}>{tr("Could not load purchases.", "Einkäufe konnten nicht geladen werden.", "تعذّر تحميل المشتريات.")}</Text>
                    <Pressable style={styles.primarySmallBtn} onPress={() => refetchSales()}>
                      <Text style={styles.primarySmallText}>{tr("Retry", "Erneut versuchen", "إعادة المحاولة")}</Text>
                    </Pressable>
                  </View>
                ) : customerSales.length === 0 ? (
                  <View style={{ alignItems: "center", paddingVertical: 24 }}>
                    <Ionicons name="receipt-outline" size={36} color={Colors.textMuted} />
                    <Text style={{ color: Colors.textMuted, fontSize: 13, marginTop: 8 }}>{t("noPurchases")}</Text>
                  </View>
                ) : (
                  customerSales.map((sale: any) => (
                    <View key={sale.id} style={styles.saleCard}>
                      <View style={{ flexDirection: rowDir, justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                        <Text style={[{ color: Colors.text, fontSize: 14, fontWeight: "600", flex: 1, minWidth: 0 }, rtlTextAlign]} numberOfLines={1}>
                          {sale.receiptNumber ? `${tr("Receipt", "Beleg", "إيصال")} ${sale.receiptNumber}` : `${tr("Sale", "Verkauf", "عملية بيع")} #${sale.id}`}
                        </Text>
                        <Text style={{ color: Colors.accent, fontSize: 14, fontWeight: "700" }}>{formatMoney(sale.totalAmount || 0)}</Text>
                      </View>
                      <View style={{ flexDirection: rowDir, justifyContent: "space-between", alignItems: "center", marginTop: 4, gap: 8 }}>
                        <Text style={{ color: Colors.textMuted, fontSize: 12 }}>
                          {sale.createdAt ? formatInStoreTz(sale.createdAt, dateLocale, { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"}
                        </Text>
                        <View style={{ backgroundColor: sale.paymentMethod === "cash" ? Colors.accent + "20" : Colors.secondary + "20", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                          <Text style={{ color: sale.paymentMethod === "cash" ? Colors.accent : Colors.secondary, fontSize: 11, fontWeight: "600" }}>{paymentLabel(sale.paymentMethod)}</Text>
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

const styles = themedStyles((Colors) => ({
  container: { flex: 1, backgroundColor: Colors.background },
  banner: { alignItems: "center", gap: 8, marginHorizontal: 12, marginTop: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: Colors.accent + "15", borderWidth: 1, borderColor: Colors.accent + "40" },
  bannerText: { flex: 1, color: Colors.text, fontSize: 13, fontWeight: "600" },
  searchRow: { paddingHorizontal: 12, paddingVertical: 10, alignItems: "center", gap: 8 },
  searchBox: { flex: 1, minWidth: 0, alignItems: "center", gap: 8, backgroundColor: Colors.inputBg, borderRadius: 12, paddingHorizontal: 12, height: 44, borderWidth: 1, borderColor: Colors.inputBorder },
  searchInput: { flex: 1, minWidth: 0, color: Colors.text, fontSize: 15, height: 44 },
  countText: { color: Colors.textMuted, fontSize: 12, fontWeight: "600", minWidth: 36, textAlign: "center" },
  list: { paddingHorizontal: 12 },
  card: { alignItems: "center", gap: 12, backgroundColor: Colors.surface, borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: Colors.cardBorder },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.gradientMid, justifyContent: "center", alignItems: "center" },
  avatarText: { color: Colors.white, fontSize: 18, fontWeight: "800" },
  cardInfo: { flex: 1, minWidth: 0 },
  cardName: { color: Colors.text, fontSize: 15, fontWeight: "600" },
  cardMeta: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  cardRight: { gap: 4, flexShrink: 0, maxWidth: "40%" },
  nrTag: { backgroundColor: Colors.surfaceLight, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6, borderWidth: 1, borderColor: Colors.cardBorder },
  loyaltyBadge: { alignItems: "center", gap: 4, backgroundColor: Colors.warning + "26", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  loyaltyText: { color: Colors.warning, fontSize: 12, fontWeight: "700" },
  totalSpent: { color: Colors.textMuted, fontSize: 12 },
  empty: { alignItems: "center", paddingVertical: 60, paddingHorizontal: 16, gap: 12 },
  emptyText: { color: Colors.textMuted, fontSize: 15, textAlign: "center" },
  primarySmallBtn: { minHeight: 44, paddingHorizontal: 20, borderRadius: 12, backgroundColor: Colors.accent, alignItems: "center", justifyContent: "center" },
  primarySmallText: { color: Colors.textDark, fontSize: 14, fontWeight: "700" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", alignItems: "center" },
  modalContent: { backgroundColor: Colors.surface, borderRadius: 20, padding: 20, width: "92%", maxWidth: 560, maxHeight: "85%" },
  modalHeader: { justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 12 },
  modalTitle: { flex: 1, color: Colors.text, fontSize: 20, fontWeight: "700" },
  closeBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: Colors.surfaceLight },
  label: { color: Colors.textSecondary, fontSize: 11, fontWeight: "600", marginBottom: 4, marginTop: 10, textTransform: "uppercase" as const, letterSpacing: 0.5 },
  sectionLabel: { color: Colors.accent, fontSize: 13, fontWeight: "700", marginTop: 16, marginBottom: 4 },
  input: { backgroundColor: Colors.inputBg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, minHeight: 46, color: Colors.text, fontSize: 15, borderWidth: 1, borderColor: Colors.inputBorder },
  chip: { minHeight: 36, justifyContent: "center", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 18, borderWidth: 1 },
  suggestBox: { backgroundColor: Colors.surfaceLight, borderWidth: 1, borderColor: Colors.accent + "50", borderRadius: 8, marginTop: 4, marginBottom: 10, maxHeight: 220, overflow: "hidden", elevation: 10 },
  saveBtn: { borderRadius: 14, overflow: "hidden", marginTop: 20, marginBottom: 16 },
  saveBtnGradient: { minHeight: 50, paddingVertical: 14, alignItems: "center", justifyContent: "center" },
  saveBtnText: { color: Colors.white, fontSize: 16, fontWeight: "700" },
  actionBtn: { minHeight: 46, alignItems: "center", justifyContent: "center", paddingVertical: 12, gap: 6, borderRadius: 12 },
  dangerOutline: { borderWidth: 1, borderColor: Colors.danger, backgroundColor: Colors.danger + "12" },
  loadMoreBtn: { marginVertical: 16, marginHorizontal: 4, minHeight: 48, borderRadius: 12, backgroundColor: Colors.gradientMid, paddingVertical: 14, alignItems: "center", justifyContent: "center" },
  loadMoreText: { color: Colors.white, fontSize: 15, fontWeight: "600" },
  // Detail modal styles
  statBox: { flexGrow: 1, flexBasis: 96, minWidth: 0, backgroundColor: Colors.surfaceLight, borderRadius: 12, padding: 10, alignItems: "center" },
  statValue: { fontSize: 17, fontWeight: "800" },
  statLabel: { color: Colors.textMuted, fontSize: 10, marginTop: 2, textAlign: "center" },
  detailSection: { backgroundColor: Colors.surfaceLight, borderRadius: 12, padding: 12, marginBottom: 10 },
  sectionTitle: { color: Colors.textSecondary, fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  historyTitle: { color: Colors.textSecondary, fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 },
  saleCard: { backgroundColor: Colors.surfaceLight, borderRadius: 12, padding: 12, marginBottom: 8 },
}));
