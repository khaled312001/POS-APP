import React, { useState, useEffect, useMemo } from "react";
import {
  Text, View, FlatList, Pressable, TextInput,
  Modal, Alert, ScrollView, Platform, Dimensions, Image, ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Colors } from "@/constants/colors";
import { themedStyles } from "@/lib/themed-styles";
import { apiRequest, getQueryFn, getApiUrl } from "@/lib/query-client";
import { playClickSound } from "@/lib/sound";
import BarcodeScannerModal from "@/components/BarcodeScannerModal";
import { useLocalSearchParams, useRouter } from "expo-router";
import { normalizeBarcode } from "@/lib/barcode";
import { useAuth } from "@/lib/auth-context";
import { useLicense } from "@/lib/license-context";
import { useLanguage } from "@/lib/language-context";
import { getChromeMetrics } from "@/lib/responsive";
import { getWebStaticFallbackChain } from "@/lib/web-static";
import TabPageHeader, { HeaderIconButton } from "@/components/tab-page-header";
import { formatMoney, currencyLabel, isZeroDecimalCurrency, useCurrency } from "@/lib/currency";
import { storeYmd } from "@/components/store-locale";

const AnimatedProductImage = ({ uri }: { uri: string }) => {
  const fallbacks = getWebStaticFallbackChain(uri);
  const [currentUri, setCurrentUri] = useState(fallbacks[0] || uri);

  useEffect(() => {
    setCurrentUri(fallbacks[0] || uri);
  }, [uri]);

  return (
    <Image
      source={{ uri: currentUri }}
      style={{ width: 44, height: 44, borderRadius: 10 }}
      resizeMode="cover"
      onError={() => {
        const currentIndex = fallbacks.indexOf(currentUri);
        const nextUri = fallbacks[currentIndex + 1];
        if (nextUri && nextUri !== currentUri) {
          setCurrentUri(nextUri);
        }
      }}
    />
  );
};

/** Arabic-Indic / Eastern Arabic-Indic digits and Arabic separators → ASCII. */
function asciiDigits(v: string): string {
  return String(v ?? "")
    .replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 0x06f0))
    .replace(/٫/g, ".")
    .replace(/٬/g, ",");
}

/**
 * Cleans a money input while typing. Zero-decimal currencies (SYP) keep digits
 * only, so "1,250,000" becomes "1250000"; others keep one decimal separator
 * and at most two decimals ("1,250.50" → "1250.50", "12,5" → "12.5").
 */
function cleanMoneyInput(raw: string, zeroDecimals: boolean): string {
  let s = asciiDigits(raw).replace(/[\s'’]/g, "").replace(/[^0-9.,]/g, "");
  if (zeroDecimals) return s.replace(/[.,]/g, "");
  if (s.includes(".") && s.includes(",")) s = s.replace(/,/g, "");
  s = s.replace(/,/g, ".");
  const i = s.indexOf(".");
  if (i >= 0) s = s.slice(0, i + 1) + s.slice(i + 1).replace(/\./g, "").slice(0, 2);
  return s;
}

const isMoney = (v: string) => /^\d+(\.\d{1,2})?$/.test(v) && Number.isFinite(Number(v));

const UNITS = ["piece", "kg", "g", "l", "ml", "box", "pack"] as const;

function ymdOf(v: unknown): string {
  if (!v) return "";
  const s = String(v);
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1];
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? "" : storeYmd(d);
}

function daysBetweenYmd(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000);
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

export default function ProductsScreen() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { canManage, canManageProducts, employee } = useAuth();
  const canEdit = canManage || canManageProducts;
  const { tenant } = useLicense();
  const { t, isRTL, rtlTextAlign, language } = useLanguage();
  const currency = useCurrency();
  const zeroDec = isZeroDecimalCurrency(currency);
  const moneyPlaceholder = zeroDec ? "0" : "0.00";
  const tr = (en: string, de: string, ar: string) => (language === "ar" ? ar : language === "de" ? de : en);
  // On web the document is dir="rtl" already, so a plain "row" is right-to-left;
  // flipping it again would lay the Arabic UI out left-to-right.
  const rowDir: "row" | "row-reverse" = isRTL && Platform.OS !== "web" ? "row-reverse" : "row";
  const endAlign: "flex-start" | "flex-end" = isRTL && Platform.OS !== "web" ? "flex-start" : "flex-end";
  const tenantId = tenant?.id;
  const [screenDims, setScreenDims] = useState(Dimensions.get("window"));
  useEffect(() => {
    const sub = Dimensions.addEventListener("change", ({ window }) => setScreenDims(window));
    return () => sub?.remove();
  }, []);
  const { isMobileWeb, topPad, bottomPad } = getChromeMetrics(screenDims.width);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<number | "all">("all");
  const [showForm, setShowForm] = useState(false);
  const [editProduct, setEditProduct] = useState<any>(null);
  const [form, setForm] = useState({ name: "", price: "", sku: "", barcode: "", categoryId: "", costPrice: "", unit: "piece", expiryDate: "", isAddon: false });
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());
  const [pickerMonth, setPickerMonth] = useState(new Date().getMonth() + 1);
  const [pickerDay, setPickerDay] = useState(1);
  const [viewMode, setViewMode] = useState<"products" | "categories">("products");
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editCategory, setEditCategory] = useState<any>(null);
  const [catForm, setCatForm] = useState({ name: "", color: Colors.hueIndigo, icon: "grid" });
  const [productImage, setProductImage] = useState<string | null>(null);
  const [categoryImage, setCategoryImage] = useState<string | null>(null);
  const [initialStock, setInitialStock] = useState("");
  const [imageUploading, setImageUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [catSaving, setCatSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  // Wholesale price / minimum quantity (تجار الجملة) — kept apart from `form`.
  const [wholesaleForm, setWholesaleForm] = useState({ price: "", minQty: "" });

  const toInputAmount = (v: unknown): string => {
    if (v == null || v === "") return "";
    const n = Number(v);
    if (!Number.isFinite(n)) return String(v);
    return zeroDec ? String(Math.round(n)) : String(v);
  };

  useEffect(() => {
    if (!showForm) return;
    setWholesaleForm({
      price: editProduct?.wholesalePrice != null ? toInputAmount(editProduct.wholesalePrice) : "",
      minQty: editProduct?.wholesaleMinQty != null ? String(editProduct.wholesaleMinQty) : "",
    });
  }, [showForm, editProduct]);

  // Keep the picked day valid when the month/year changes (31 → February).
  useEffect(() => {
    const dim = new Date(pickerYear, pickerMonth, 0).getDate();
    if (pickerDay > dim) setPickerDay(dim);
  }, [pickerYear, pickerMonth]);

  const notify = (title: string, message: string) => {
    if (Platform.OS === "web" && typeof window !== "undefined") window.alert(`${title}\n\n${message}`);
    else Alert.alert(title, message);
  };

  const confirmAction = (title: string, message: string, confirmLabel: string, onConfirm: () => void) => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      if (window.confirm(`${title}\n\n${message}`)) onConfirm();
      return;
    }
    Alert.alert(title, message, [
      { text: t("cancel"), style: "cancel" },
      { text: confirmLabel, style: "destructive", onPress: onConfirm },
    ]);
  };

  // The whole catalogue is loaded once and filtered here: the list, the
  // category counts and the duplicate-barcode check all need every product.
  const { data: products = [], isLoading: productsLoading, isError: productsError, refetch: refetchProducts } = useQuery<any[]>({
    queryKey: ["/api/products", `?tenantId=${tenantId}`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!tenantId,
  });

  const { data: categories = [] } = useQuery<any[]>({
    queryKey: ["/api/categories", tenantId ? `?tenantId=${tenantId}` : ""],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!tenantId,
  });

  // Scoped to this store: the server only filters inventory by the tenantId
  // query parameter.
  const { data: inventoryData = [] } = useQuery<any[]>({
    queryKey: ["/api/inventory", `?tenantId=${tenantId}`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!tenantId,
  });

  const { data: storeSettings } = useQuery<any>({
    queryKey: ["/api/store-settings"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const isRestaurant = storeSettings?.storeType === "restaurant";
  // Stock is booked on the signed-in employee's branch, else the store's main branch.
  const stockBranchId: number | undefined = employee?.branchId || storeSettings?.id || undefined;

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/products/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/products"] });
      qc.invalidateQueries({ queryKey: ["/api/inventory"] });
    },
    onError: (e: any) => notify(t("error"), apiErrorText(e)),
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/categories/${id}`),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: ["/api/categories"] });
      qc.invalidateQueries({ queryKey: ["/api/products"] });
      if (catFilter === id) setCatFilter("all");
    },
    onError: (e: any) => notify(t("error"), apiErrorText(e)),
  });

  const { newBarcode } = useLocalSearchParams<{ newBarcode?: string }>();
  const router = useRouter();
  useEffect(() => {
    const code = normalizeBarcode(String(newBarcode || ""));
    if (!code) return;
    resetForm(); setEditProduct(null);
    setForm((f) => ({ ...f, barcode: code }));
    setViewMode("products");
    setShowForm(true);
    router.setParams({ newBarcode: "" });
  }, [newBarcode]);

  const resetForm = () => { setForm({ name: "", price: "", sku: "", barcode: "", categoryId: "", costPrice: "", unit: "piece", expiryDate: "", isAddon: false }); setProductImage(null); setInitialStock(""); };

  const openEdit = (p: any) => {
    setEditProduct(p);
    setForm({
      name: p.name || "", price: p.isAddon ? "0" : toInputAmount(p.price), sku: p.sku || "",
      barcode: p.barcode || "", categoryId: p.categoryId ? String(p.categoryId) : "",
      costPrice: p.costPrice != null && Number(p.costPrice) > 0 ? toInputAmount(p.costPrice) : "", unit: p.unit || "piece",
      expiryDate: ymdOf(p.expiryDate), isAddon: !!p.isAddon,
    });
    setProductImage(p.image || null);
    setShowForm(true);
  };

  const pickImage = async (type: "product" | "category") => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images' as ImagePicker.MediaType,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        if (type === "product") setProductImage(uri);
        else setCategoryImage(uri);
      }
    } catch (e: any) {
      notify(t("error"), e?.message || tr("Could not open the photo library", "Fotomediathek konnte nicht geöffnet werden", "تعذّر فتح مكتبة الصور"));
    }
  };

  const blobToBase64 = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  /** A picked image that still lives on the device and must be uploaded first. */
  const isLocalImage = (uri: string | null) =>
    !!uri && !uri.startsWith("/objects") && !uri.startsWith("/uploads") && !uri.startsWith("http");

  const imageSrc = (uri: string) =>
    uri.startsWith("http") || uri.startsWith("file://") || uri.startsWith("data:") || uri.startsWith("blob:")
      ? uri
      : `${getApiUrl().replace(/\/$/, "")}${uri}`;

  const uploadImage = async (uri: string): Promise<string | null> => {
    try {
      setImageUploading(true);
      const response = await fetch(uri);
      const blob = await response.blob();
      const imageData = await blobToBase64(blob);
      const uploadRes = await apiRequest("POST", "/api/objects/upload", {
        imageData,
        contentType: blob.type || "image/jpeg",
      });
      const { objectPath } = await uploadRes.json();
      return objectPath || null;
    } catch (e) {
      console.error("Upload failed:", e);
      return null;
    } finally {
      setImageUploading(false);
    }
  };

  const imageUploadFailed = () =>
    notify(t("error"), tr("The image could not be uploaded. Check the connection and try again.", "Das Bild konnte nicht hochgeladen werden. Bitte Verbindung prüfen und erneut versuchen.", "تعذّر رفع الصورة. تحقق من الاتصال وحاول مرة أخرى."));

  const saveErrorText = (e: any) => {
    const msg = apiErrorText(e);
    if (/duplicate entry/i.test(msg) && /sku/i.test(msg)) {
      return tr("This SKU is already in use. Enter a different SKU or leave it empty.", "Diese SKU ist bereits vergeben. Bitte eine andere SKU eingeben oder leer lassen.", "رمز SKU مستخدم مسبقاً. أدخل رمزاً آخر أو اتركه فارغاً.");
    }
    return msg || tr("Something went wrong", "Etwas ist schiefgelaufen", "حدث خطأ ما");
  };

  const invalidMoneyMsg = (field: string) =>
    zeroDec
      ? tr(`${field}: enter a whole amount without decimals.`, `${field}: bitte einen ganzen Betrag ohne Nachkommastellen eingeben.`, `${field}: أدخل مبلغاً صحيحاً بدون كسور.`)
      : tr(`${field}: enter a valid amount (e.g. 12.50).`, `${field}: bitte einen gültigen Betrag eingeben (z. B. 12.50).`, `${field}: أدخل مبلغاً صالحاً (مثل 12.50).`);

  const handleSave = async (skipBarcodeCheck = false) => {
    if (saving) return;
    const name = form.name.trim();
    if (!name) return notify(t("error"), tr("Enter a product name.", "Bitte einen Produktnamen eingeben.", "أدخل اسم المنتج."));
    const price = form.isAddon ? "0" : form.price.trim();
    if (!form.isAddon && !price) return notify(t("error"), tr("Enter a price.", "Bitte einen Preis eingeben.", "أدخل السعر."));
    if (!isMoney(price)) return notify(t("error"), invalidMoneyMsg(t("price")));
    const cost = form.costPrice.trim();
    if (cost && !isMoney(cost)) return notify(t("error"), invalidMoneyMsg(t("costPrice")));
    const wsPrice = wholesaleForm.price.trim();
    const wsMinQty = wholesaleForm.minQty.trim();
    if ((wsPrice && !isMoney(wsPrice)) || (wsMinQty && !(Number.isInteger(Number(wsMinQty)) && Number(wsMinQty) >= 1))) {
      return notify(t("error"), tr("Invalid wholesale price or minimum quantity", "Großhandelspreis oder Mindestmenge ungültig", "سعر الجملة أو الحد الأدنى للكمية غير صالح"));
    }
    const stockQty = !editProduct && !isRestaurant && initialStock.trim() ? Number(initialStock.trim()) : 0;
    if (!Number.isInteger(stockQty) || stockQty < 0) {
      return notify(t("error"), tr("Initial stock must be a whole number.", "Anfangsbestand muss eine ganze Zahl sein.", "يجب أن يكون المخزون الأولي عدداً صحيحاً."));
    }
    if (stockQty > 0 && !stockBranchId) {
      return notify(t("error"), tr("The store branch is still loading. Try again in a moment.", "Die Filiale wird noch geladen. Bitte gleich erneut versuchen.", "لم يتم تحميل الفرع بعد. حاول بعد لحظات."));
    }
    const barcode = form.barcode.trim();
    if (barcode && !skipBarcodeCheck) {
      const taken = (products as any[]).find((p: any) => p.barcode && String(p.barcode) === barcode && p.id !== editProduct?.id);
      if (taken) {
        confirmAction(
          tr("Barcode already in use", "Barcode bereits vergeben", "الباركود مستخدم مسبقاً"),
          tr(`"${taken.name}" already has this barcode. Save anyway?`, `„${taken.name}" hat bereits diesen Barcode. Trotzdem speichern?`, `المنتج "${taken.name}" يستخدم هذا الباركود. هل تريد الحفظ على أي حال؟`),
          t("save"),
          () => { void handleSave(true); },
        );
        return;
      }
    }

    setSaving(true);
    try {
      // Editing: a cleared field is sent as null so it is really cleared;
      // creating: an empty field is simply left out.
      const empty = editProduct ? null : undefined;
      let imagePath: string | null | undefined = productImage || empty;
      if (isLocalImage(productImage)) {
        imagePath = await uploadImage(productImage as string);
        if (!imagePath) { imageUploadFailed(); return; }
      }
      const productData: any = {
        tenantId: tenantId || undefined,
        name, price: form.isAddon ? "0" : price, sku: form.sku.trim() || empty,
        barcode: barcode || empty, costPrice: cost || empty,
        categoryId: form.categoryId ? Number(form.categoryId) : empty, unit: form.unit || "piece",
        expiryDate: form.expiryDate || empty,
        image: imagePath, isAddon: form.isAddon,
      };
      productData.wholesalePrice = form.isAddon || !wsPrice ? null : wsPrice;
      productData.wholesaleMinQty = form.isAddon || !wsPrice || !wsMinQty ? null : Number(wsMinQty);

      if (stockQty > 0) {
        await apiRequest("POST", "/api/products-with-stock", { ...productData, initialStock: stockQty, branchId: stockBranchId });
      } else if (editProduct) {
        await apiRequest("PUT", `/api/products/${editProduct.id}`, productData);
      } else {
        await apiRequest("POST", "/api/products", productData);
      }
      qc.invalidateQueries({ queryKey: ["/api/products"] });
      qc.invalidateQueries({ queryKey: ["/api/inventory"] });
      setShowForm(false);
      setEditProduct(null);
      resetForm();
    } catch (e: any) {
      notify(t("error"), saveErrorText(e));
    } finally {
      setSaving(false);
    }
  };

  const saveCategory = async () => {
    if (catSaving) return;
    const name = catForm.name.trim();
    if (!name) return notify(t("error"), tr("Enter a category name.", "Bitte einen Kategorienamen eingeben.", "أدخل اسم الفئة."));
    setCatSaving(true);
    try {
      const empty = editCategory ? null : undefined;
      let imagePath: string | null | undefined = categoryImage || empty;
      if (isLocalImage(categoryImage)) {
        imagePath = await uploadImage(categoryImage as string);
        if (!imagePath) { imageUploadFailed(); return; }
      }
      const body = { tenantId: tenantId || undefined, name, color: catForm.color, icon: catForm.icon, image: imagePath };
      if (editCategory) await apiRequest("PUT", `/api/categories/${editCategory.id}`, body);
      else await apiRequest("POST", "/api/categories", body);
      qc.invalidateQueries({ queryKey: ["/api/categories"] });
      setShowCategoryForm(false);
      setEditCategory(null);
      setCategoryImage(null);
      setCatForm({ name: "", color: Colors.hueIndigo, icon: "grid" });
    } catch (e: any) {
      notify(t("error"), apiErrorText(e));
    } finally {
      setCatSaving(false);
    }
  };

  const openNewCategory = () => {
    setCatForm({ name: "", color: Colors.hueIndigo, icon: "grid" });
    setEditCategory(null);
    setCategoryImage(null);
    setShowCategoryForm(true);
  };

  const runImport = async (base64: string) => {
    if (!tenantId) return;
    setImporting(true);
    try {
      const res = await apiRequest("POST", "/api/products/import", { fileBase64: base64, tenantId, branchId: stockBranchId });
      const data = await res.json();
      if (data.success) {
        notify(t("success"), `${t("imported")} ${data.count} ${t("products")}`);
        qc.invalidateQueries({ queryKey: ["/api/products"] });
        qc.invalidateQueries({ queryKey: ["/api/inventory"] });
      } else {
        notify(t("error"), data.error || tr("Import failed", "Import fehlgeschlagen", "فشل الاستيراد"));
      }
    } catch (err: any) {
      notify(t("error"), apiErrorText(err) || tr("Import failed", "Import fehlgeschlagen", "فشل الاستيراد"));
    } finally {
      setImporting(false);
    }
  };

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
          reader.onload = (ev) => { void runImport((ev.target?.result as string).split(",")[1]); };
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
        if (!result.canceled && result.assets[0]) {
          const response = await fetch(result.assets[0].uri);
          const blob = await response.blob();
          const base64 = await blobToBase64(blob);
          await runImport(base64);
        }
      }
    } catch (err: any) {
      notify(t("error"), err?.message || tr("Import failed", "Import fehlgeschlagen", "فشل الاستيراد"));
    }
  };

  const getStock = (productId: number) => {
    const rows = (inventoryData as any[]).filter((i: any) => i.productId === productId);
    if (rows.length === 0) return null;
    return rows.reduce((s: number, i: any) => s + (Number(i.quantity) || 0), 0);
  };

  const todayYmd = storeYmd();
  const isExpired = (dateStr: string | null) => {
    const ymd = ymdOf(dateStr);
    return !!ymd && ymd < todayYmd;
  };
  const isNearExpiry = (dateStr: string | null) => {
    const ymd = ymdOf(dateStr);
    if (!ymd || ymd < todayYmd) return false;
    return daysBetweenYmd(todayYmd, ymd) <= 30;
  };
  const dateLocale = language === "ar" ? "ar" : language === "de" ? "de-CH" : "en-GB";
  const formatYmd = (ymd: string) => {
    const [y, m, d] = ymd.split("-").map(Number);
    if (!y || !m || !d) return ymd;
    return new Date(y, m - 1, d).toLocaleDateString(dateLocale);
  };

  const unitLabel = (u: string) => {
    switch (u) {
      case "piece": return tr("Piece", "Stück", "قطعة");
      case "kg": return tr("kg", "kg", "كغ");
      case "g": return tr("g", "g", "غ");
      case "l": return tr("Litre", "Liter", "لتر");
      case "ml": return tr("ml", "ml", "مل");
      case "box": return tr("Box", "Karton", "علبة");
      case "pack": return tr("Pack", "Packung", "عبوة");
      default: return u;
    }
  };

  const getCatName = (catId: number | null) => categories.find((c: any) => c.id === catId)?.name || t("uncategorized");

  const getPriority = (name: string) => {
    if (!name) return 999;
    const n = name.toLowerCase();
    if (/pizza|بيتزا|calzone|pide|lahmacun|burger|burg|sandwich|wrap|grill|shawarma|شاورما/.test(n)) return 1;
    if (/pasta|meal|main|plate|chicken|meat|fish|teller|nuggets|schnitzel|kebab|دجاج|لحم|سمك/.test(n)) return 2;
    if (/appetizer|starter|finger|snack|مقبلات|فاتح/.test(n)) return 3;
    if (/salad|سلطة/.test(n)) return 6;
    if (/dessert|sweet|حلوى|حلويات|baklava|tiramisu/.test(n)) return 7;
    if (/drink|beverage|juice|water|coke|cola|bier|beer|wine|alcohol|عصير|مشروب/.test(n)) return 8;
    if (/tabak|tobacco|cigarette/.test(n)) return 9;
    return 5; // Default for other generic foods
  };

  const sortedCategories = [...categories].sort((a, b) => {
    const aOrder = a.sortOrder || 0;
    const bOrder = b.sortOrder || 0;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return getPriority(a.name) - getPriority(b.name);
  });

  const sortedProducts = useMemo(() => {
    const q = asciiDigits(search).trim().toLowerCase();
    const list = (products as any[]).filter((p: any) => {
      if (catFilter !== "all" && p.categoryId !== catFilter) return false;
      if (!q) return true;
      return [p.name, p.nameAr, p.sku, p.barcode, p.description]
        .some((v) => v != null && String(v).toLowerCase().includes(q));
    });
    return list.sort((a, b) => {
      const pA = getPriority(getCatName(a.categoryId));
      const pB = getPriority(getCatName(b.categoryId));
      if (pA !== pB) return pA - pB;
      return String(a.name || "").localeCompare(String(b.name || ""));
    });
  }, [products, categories, search, catFilter]);

  const years = useMemo(() => {
    const now = new Date().getFullYear();
    const list = Array.from({ length: 11 }, (_, i) => now - 1 + i);
    if (!list.includes(pickerYear)) list.unshift(pickerYear);
    return list;
  }, [pickerYear]);

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
        title={t("products")}
        icon="grid"
        isRTL={isRTL}
        rightActions={canEdit ? (
          <HeaderIconButton
            icon="add"
            onPress={() => {
              playClickSound("medium");
              if (viewMode === "products") {
                resetForm(); setEditProduct(null); setShowForm(true);
              } else {
                openNewCategory();
              }
            }}
          />
        ) : undefined}
      />

      <View style={{ flexDirection: rowDir, paddingHorizontal: 12, paddingTop: 10, gap: 8, flexWrap: isMobileWeb ? "wrap" : "nowrap" }}>
        {(["products", "categories"] as const).map((mode) => {
          const active = viewMode === mode;
          return (
            <Pressable
              key={mode}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              style={[styles.segment, active && styles.segmentActive]}
              onPress={() => { playClickSound("light"); setViewMode(mode); }}
            >
              <Text style={{ color: active ? Colors.textDark : Colors.textSecondary, fontSize: 14, fontWeight: "600" }} numberOfLines={1}>
                {mode === "products" ? `${t("products")} (${products.length})` : `${tr("Categories", "Kategorien", "الفئات")} (${categories.length})`}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {viewMode === "products" && (
        <>
          <View style={[styles.searchRow, { flexDirection: rowDir }]}>
            <View style={[styles.searchBox, { flexDirection: rowDir }]}>
              <Ionicons name="search" size={18} color={Colors.textMuted} />
              <TextInput
                style={[styles.searchInput, rtlTextAlign]}
                placeholder={tr("Search name, SKU or barcode…", "Name, SKU oder Barcode suchen…", "ابحث بالاسم أو SKU أو الباركود…")}
                placeholderTextColor={Colors.textMuted}
                value={search}
                onChangeText={setSearch}
              />
              {!!search && (
                <Pressable onPress={() => setSearch("")} hitSlop={10} accessibilityLabel={t("close")}>
                  <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
                </Pressable>
              )}
            </View>
            {canEdit && (
              <Pressable
                style={[styles.iconSquare, importing && { opacity: 0.6 }]}
                onPress={handleImport}
                disabled={importing}
                accessibilityRole="button"
                accessibilityLabel={tr("Import products from Excel/CSV", "Produkte aus Excel/CSV importieren", "استيراد المنتجات من Excel/CSV")}
              >
                {importing ? <ActivityIndicator size="small" color={Colors.accent} /> : <Ionicons name="cloud-upload-outline" size={20} color={Colors.accent} />}
              </Pressable>
            )}
          </View>

          {categories.length > 0 && (
            <View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, gap: 8, paddingBottom: 8 }}>
                {[{ id: "all" as const, name: tr("All", "Alle", "الكل") }, ...sortedCategories].map((c: any) => {
                  const active = catFilter === c.id;
                  return (
                    <Pressable key={String(c.id)} style={[styles.catChip, active && styles.catChipActive]} onPress={() => setCatFilter(c.id)}>
                      <Text style={[styles.catChipText, active && { color: Colors.textDark }]} numberOfLines={1}>{c.name}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}
        </>
      )}

      {viewMode === "products" && (
        <FlatList
          data={sortedProducts}
          keyExtractor={(item: any) => String(item.id)}
          contentContainerStyle={[styles.list, { paddingBottom: bottomPad + 16 }]}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }: { item: any }) => {
            const stock = getStock(item.id);
            const expiryYmd = ymdOf(item.expiryDate);
            return (
              <Pressable style={[styles.productCard, { flexDirection: rowDir }]} onPress={() => { if (canEdit) { playClickSound("light"); openEdit(item); } }}>
                <View style={styles.productIconWrap}>
                  {item.image ? (
                    <AnimatedProductImage uri={imageSrc(item.image)} />
                  ) : (
                    <Ionicons name="cube" size={24} color={Colors.accent} />
                  )}
                </View>
                <View style={styles.productInfo}>
                  <Text style={[styles.productName, rtlTextAlign]} numberOfLines={2}>{item.name}</Text>
                  <Text style={[styles.productMeta, rtlTextAlign]} numberOfLines={1}>{item.sku || t("noSku")} | {getCatName(item.categoryId)}</Text>
                  {stock !== null && (
                    <View style={{ flexDirection: rowDir, alignItems: "center", gap: 4, marginTop: 2 }}>
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: stock <= 0 ? Colors.danger : stock <= 10 ? Colors.warning : Colors.success }} />
                      <Text style={{ color: stock <= 0 ? Colors.danger : stock <= 10 ? Colors.warning : Colors.textMuted, fontSize: 11 }}>
                        {stock <= 0 ? t("outOfStockFull") : `${stock} ${t("xInStock")}`}
                      </Text>
                    </View>
                  )}
                  {!!expiryYmd && (
                    <Text style={{ color: isExpired(expiryYmd) ? Colors.danger : isNearExpiry(expiryYmd) ? Colors.warning : Colors.textMuted, fontSize: 11, marginTop: 2, ...rtlTextAlign }}>
                      {isExpired(expiryYmd) ? `${t("expired")} · ${formatYmd(expiryYmd)}` : `${t("expiryDate")}: ${formatYmd(expiryYmd)}`}
                    </Text>
                  )}
                </View>
                <View style={[styles.productRight, { alignItems: endAlign }]}>
                  {item.isAddon ? (
                    <Text style={[styles.productPrice, { color: Colors.success }]}>{tr("Free", "Gratis", "مجاني")}</Text>
                  ) : (
                    <Text style={styles.productPrice} numberOfLines={1}>{formatMoney(item.price)}</Text>
                  )}
                  {item.isAddon && (
                    <View style={{ backgroundColor: Colors.success + "22", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 }}>
                      <Text style={{ color: Colors.success, fontSize: 9, fontWeight: "800" }}>{tr("ADD-ON", "EXTRA", "إضافة")}</Text>
                    </View>
                  )}
                  {canEdit && (
                    <Pressable
                      hitSlop={8}
                      style={styles.trashBtn}
                      accessibilityRole="button"
                      accessibilityLabel={`${t("delete")} ${item.name}`}
                      onPress={(event: any) => {
                        event?.stopPropagation?.();
                        confirmAction(
                          t("delete"),
                          `${t("delete")} "${item.name}"?`,
                          t("delete"),
                          () => deleteMutation.mutate(item.id),
                        );
                      }}
                    >
                      <Ionicons name="trash-outline" size={18} color={Colors.danger} />
                    </Pressable>
                  )}
                </View>
              </Pressable>
            );
          }}
          ListEmptyComponent={
            productsLoading ? (
              <View style={styles.empty}><ActivityIndicator size="large" color={Colors.accent} /></View>
            ) : productsError ? (
              <View style={styles.empty}>
                <Ionicons name="cloud-offline-outline" size={48} color={Colors.textMuted} />
                <Text style={styles.emptyText}>{tr("Could not load products.", "Produkte konnten nicht geladen werden.", "تعذّر تحميل المنتجات.")}</Text>
                <Pressable style={styles.retryBtn} onPress={() => refetchProducts()}>
                  <Text style={styles.retryText}>{tr("Retry", "Erneut versuchen", "إعادة المحاولة")}</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.empty}>
                <Ionicons name={search || catFilter !== "all" ? "search-outline" : "cube-outline"} size={48} color={Colors.textMuted} />
                <Text style={styles.emptyText}>
                  {search || catFilter !== "all" ? tr("No products match your search.", "Keine Produkte gefunden.", "لا توجد منتجات مطابقة.") : t("noProducts")}
                </Text>
                {canEdit && !search && catFilter === "all" && (
                  <Pressable style={styles.retryBtn} onPress={() => { resetForm(); setEditProduct(null); setShowForm(true); }}>
                    <Text style={styles.retryText}>{t("addProduct")}</Text>
                  </Pressable>
                )}
              </View>
            )
          }
        />
      )}

      {viewMode === "categories" && (
        <FlatList
          data={sortedCategories}
          keyExtractor={(item: any) => String(item.id)}
          contentContainerStyle={[styles.list, { paddingTop: 10, paddingBottom: bottomPad + 16 }]}
          renderItem={({ item }: { item: any }) => {
            const count = products.filter((p: any) => p.categoryId === item.id).length;
            return (
              <Pressable style={[styles.productCard, { flexDirection: rowDir }]} onPress={() => {
                if (!canEdit) return;
                setEditCategory(item);
                setCatForm({ name: item.name, color: item.color || "#7C3AED", icon: item.icon || "grid" });
                setCategoryImage(item.image || null);
                setShowCategoryForm(true);
              }}>
                <View style={[styles.productIconWrap, { backgroundColor: (item.color || "#7C3AED") + "20" }]}>
                  {item.image ? (
                    <AnimatedProductImage uri={imageSrc(item.image)} />
                  ) : (
                    <Ionicons name={(item.icon || "grid") as any} size={24} color={item.color || "#7C3AED"} />
                  )}
                </View>
                <View style={styles.productInfo}>
                  <Text style={[styles.productName, rtlTextAlign]} numberOfLines={1}>{item.name}</Text>
                  <Text style={[styles.productMeta, rtlTextAlign]}>
                    {count} {t("products2")}
                  </Text>
                </View>
                <View style={{ flexDirection: rowDir, alignItems: "center", gap: 8 }}>
                  {canEdit && (
                    <Pressable
                      hitSlop={8}
                      style={styles.trashBtn}
                      accessibilityRole="button"
                      accessibilityLabel={`${t("delete")} ${item.name}`}
                      onPress={(event: any) => {
                        event?.stopPropagation?.();
                        confirmAction(
                          tr("Delete category", "Kategorie löschen", "حذف الفئة"),
                          count > 0
                            ? tr(
                              `Delete "${item.name}"? Its ${count} product(s) stay on sale and show as uncategorized.`,
                              `„${item.name}" löschen? Die ${count} Produkt(e) bleiben im Verkauf und erscheinen ohne Kategorie.`,
                              `حذف "${item.name}"؟ تبقى منتجاتها (${count}) معروضة للبيع وتظهر بدون فئة.`,
                            )
                            : `${t("delete")} "${item.name}"?`,
                          t("delete"),
                          () => deleteCategoryMutation.mutate(item.id),
                        );
                      }}
                    >
                      <Ionicons name="trash-outline" size={18} color={Colors.danger} />
                    </Pressable>
                  )}
                  <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={18} color={Colors.textMuted} />
                </View>
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="grid-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyText}>{t("noCategories")}</Text>
              {canEdit && (
                <Pressable style={styles.retryBtn} onPress={openNewCategory}>
                  <Text style={styles.retryText}>{tr("Add category", "Kategorie hinzufügen", "إضافة فئة")}</Text>
                </Pressable>
              )}
            </View>
          }
        />
      )}

      <Modal visible={showForm} animationType="slide" transparent onRequestClose={() => { if (!saving) setShowForm(false); }}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.modalHeader, { flexDirection: rowDir }]}>
              <Text style={[styles.modalTitle, rtlTextAlign]} numberOfLines={1}>{editProduct ? t("editProduct") : t("addProduct")}</Text>
              {closeX(() => { if (!saving) setShowForm(false); })}
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={[styles.label, rtlTextAlign]}>{t("productImage")}</Text>
              <Pressable onPress={() => pickImage("product")} style={styles.imagePicker}>
                {productImage ? (
                  <View style={{ alignItems: "center" }}>
                    <Image source={{ uri: imageSrc(productImage) }} style={{ width: 100, height: 100, borderRadius: 12 }} />
                    <Text style={{ color: Colors.accent, fontSize: 13, marginTop: 8 }}>{t("changeImage")}</Text>
                  </View>
                ) : (
                  <View style={{ alignItems: "center" }}>
                    <Ionicons name="camera-outline" size={32} color={Colors.textMuted} />
                    <Text style={{ color: Colors.textMuted, fontSize: 13, marginTop: 4 }}>{t("tapToAddImage")}</Text>
                  </View>
                )}
              </Pressable>
              {!!productImage && (
                <Pressable onPress={() => setProductImage(null)} hitSlop={8} style={styles.removeImageBtn}>
                  <Ionicons name="trash-outline" size={14} color={Colors.danger} />
                  <Text style={{ color: Colors.danger, fontSize: 13, fontWeight: "600" }}>{tr("Remove image", "Bild entfernen", "إزالة الصورة")}</Text>
                </Pressable>
              )}
              <Text style={[styles.label, rtlTextAlign]}>{t("productName")} *</Text>
              <TextInput style={[styles.input, rtlTextAlign]} value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} placeholderTextColor={Colors.textMuted} placeholder={t("productName")} />

              {/* Free Addon Toggle */}
              <Pressable
                accessibilityRole="switch"
                accessibilityState={{ checked: form.isAddon }}
                style={[styles.addonToggleRow, { flexDirection: rowDir }, form.isAddon && styles.addonToggleRowActive]}
                onPress={() => setForm({ ...form, isAddon: !form.isAddon, price: !form.isAddon ? "0" : "" })}
              >
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[{ color: form.isAddon ? Colors.success : Colors.text, fontWeight: "700", fontSize: 14 }, rtlTextAlign]}>
                    {tr("Free add-on", "Gratis-Extra", "إضافة مجانية")}
                  </Text>
                  <Text style={[{ color: Colors.textMuted, fontSize: 11, marginTop: 2 }, rtlTextAlign]}>
                    {tr("e.g. ketchup, sauces — always free", "z. B. Ketchup, Saucen — immer gratis", "مثل الكاتشاب والصوصات — دائماً مجاني")}
                  </Text>
                </View>
                <View style={[styles.addonToggle, form.isAddon && styles.addonToggleOn]}>
                  <View style={[styles.addonToggleThumb, form.isAddon && styles.addonToggleThumbOn]} />
                </View>
              </Pressable>

              <View style={[styles.row, { flexDirection: rowDir }]}>
                <View style={styles.half}>
                  <Text style={[styles.label, rtlTextAlign]} numberOfLines={1}>{t("price")} ({currencyLabel()}) {!form.isAddon && "*"}</Text>
                  <TextInput style={[styles.input, rtlTextAlign, form.isAddon && { opacity: 0.4 }]} value={form.isAddon ? "0" : form.price} onChangeText={(v) => setForm({ ...form, price: cleanMoneyInput(v, zeroDec) })} keyboardType={zeroDec ? "number-pad" : "decimal-pad"} placeholderTextColor={Colors.textMuted} placeholder={moneyPlaceholder} editable={!form.isAddon} />
                </View>
                <View style={styles.half}>
                  <Text style={[styles.label, rtlTextAlign]} numberOfLines={1}>{t("costPrice")} ({currencyLabel()})</Text>
                  <TextInput style={[styles.input, rtlTextAlign]} value={form.costPrice} onChangeText={(v) => setForm({ ...form, costPrice: cleanMoneyInput(v, zeroDec) })} keyboardType={zeroDec ? "number-pad" : "decimal-pad"} placeholderTextColor={Colors.textMuted} placeholder={moneyPlaceholder} />
                </View>
              </View>
              {!form.isAddon && (
                <View style={[styles.row, { flexDirection: rowDir }]}>
                  <View style={styles.half}>
                    <Text style={[styles.label, rtlTextAlign]} numberOfLines={1}>{tr("Wholesale price", "Großhandelspreis", "سعر الجملة")} ({currencyLabel()})</Text>
                    <TextInput style={[styles.input, rtlTextAlign]} value={wholesaleForm.price} onChangeText={(v) => setWholesaleForm((w) => ({ ...w, price: cleanMoneyInput(v, zeroDec) }))} keyboardType={zeroDec ? "number-pad" : "decimal-pad"} placeholderTextColor={Colors.textMuted} placeholder={tr("optional", "optional", "اختياري")} />
                  </View>
                  <View style={styles.half}>
                    <Text style={[styles.label, rtlTextAlign]} numberOfLines={1}>{tr("Min. wholesale qty", "Mindestmenge Großhandel", "أقل كمية للجملة")}</Text>
                    <TextInput style={[styles.input, rtlTextAlign, !wholesaleForm.price.trim() && { opacity: 0.5 }]} value={wholesaleForm.minQty} onChangeText={(v) => setWholesaleForm((w) => ({ ...w, minQty: asciiDigits(v).replace(/[^0-9]/g, "") }))} keyboardType="number-pad" placeholderTextColor={Colors.textMuted} placeholder="1" editable={!!wholesaleForm.price.trim()} />
                  </View>
                </View>
              )}
              <Text style={[styles.label, rtlTextAlign]}>SKU</Text>
              <TextInput style={[styles.input, rtlTextAlign]} value={form.sku} onChangeText={(v) => setForm({ ...form, sku: v })} placeholderTextColor={Colors.textMuted} placeholder="SKU-001" autoCapitalize="characters" />

              <Text style={[styles.label, rtlTextAlign]}>{t("barcode")}</Text>
              <View style={{ flexDirection: rowDir, gap: 8, alignItems: "center" }}>
                <TextInput style={[styles.input, { flex: 1, minWidth: 0 }, rtlTextAlign]} value={form.barcode} onChangeText={(v) => setForm({ ...form, barcode: asciiDigits(v) })} placeholderTextColor={Colors.textMuted} placeholder="ABC-123456" autoCapitalize="none" />
                <Pressable
                  style={styles.scanBtn}
                  onPress={() => setShowBarcodeScanner(true)}
                  accessibilityRole="button"
                  accessibilityLabel={tr("Scan barcode", "Barcode scannen", "مسح الباركود")}
                >
                  <Ionicons name="barcode-outline" size={22} color={Colors.textDark} />
                </Pressable>
              </View>

              <Text style={[styles.label, rtlTextAlign]}>{tr("Unit", "Einheit", "الوحدة")}</Text>
              <View style={{ flexDirection: rowDir, flexWrap: "wrap", gap: 8 }}>
                {(UNITS.includes(form.unit as any) ? UNITS : [...UNITS, form.unit]).map((u) => (
                  <Pressable key={u} style={[styles.catChip, form.unit === u && styles.catChipActive]} onPress={() => setForm({ ...form, unit: u })}>
                    <Text style={[styles.catChipText, form.unit === u && { color: Colors.textDark }]}>{unitLabel(u)}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={[styles.label, rtlTextAlign]}>{t("expiryDateFull")}</Text>
              <Pressable
                style={[styles.input, { flexDirection: rowDir, alignItems: "center", justifyContent: "space-between" }]}
                onPress={() => {
                  const ymd = ymdOf(form.expiryDate);
                  if (ymd) {
                    const parts = ymd.split("-").map(Number);
                    setPickerYear(parts[0]);
                    setPickerMonth(parts[1]);
                    setPickerDay(parts[2]);
                  } else {
                    setPickerYear(new Date().getFullYear());
                    setPickerMonth(new Date().getMonth() + 1);
                    setPickerDay(1);
                  }
                  setShowDatePicker(true);
                }}
              >
                <Text style={{ color: form.expiryDate ? Colors.text : Colors.textMuted, fontSize: 15 }}>
                  {form.expiryDate ? formatYmd(form.expiryDate) : t("selectDate")}
                </Text>
                <Ionicons name="calendar-outline" size={20} color={Colors.textMuted} />
              </Pressable>
              <Text style={[styles.label, rtlTextAlign]}>{t("category")}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catRow} contentContainerStyle={{ gap: 8 }} keyboardShouldPersistTaps="handled">
                <Pressable style={[styles.catChip, !form.categoryId && styles.catChipActive]} onPress={() => setForm({ ...form, categoryId: "" })}>
                  <Text style={[styles.catChipText, !form.categoryId && { color: Colors.textDark }]}>{t("uncategorized")}</Text>
                </Pressable>
                {sortedCategories.map((cat: any) => (
                  <Pressable key={cat.id} style={[styles.catChip, form.categoryId === String(cat.id) && styles.catChipActive]} onPress={() => setForm({ ...form, categoryId: String(cat.id) })}>
                    <Text style={[styles.catChipText, form.categoryId === String(cat.id) && { color: Colors.textDark }]}>{cat.name}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              {!editProduct && !isRestaurant && (
                <View>
                  <Text style={[styles.label, rtlTextAlign]}>{t("initialStock")}</Text>
                  <TextInput style={[styles.input, rtlTextAlign]} value={initialStock} onChangeText={(v) => setInitialStock(asciiDigits(v).replace(/[^0-9]/g, ""))} keyboardType="number-pad" placeholderTextColor={Colors.textMuted} placeholder={t("enterInitialStock")} />
                </View>
              )}
              <Pressable style={[styles.saveBtn, saving && { opacity: 0.7 }]} disabled={saving} onPress={() => { playClickSound("heavy"); void handleSave(); }}>
                <LinearGradient colors={[Colors.accent, Colors.gradientMid]} style={styles.saveBtnGradient}>
                  {saving ? (
                    <View style={{ flexDirection: rowDir, alignItems: "center", gap: 8 }}>
                      <ActivityIndicator color={Colors.white} />
                      {imageUploading && <Text style={styles.saveBtnText}>{tr("Uploading image…", "Bild wird hochgeladen…", "جارٍ رفع الصورة…")}</Text>}
                    </View>
                  ) : (
                    <Text style={styles.saveBtnText}>{editProduct ? t("save") : t("addProduct")}</Text>
                  )}
                </LinearGradient>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showCategoryForm} animationType="slide" transparent onRequestClose={() => { if (!catSaving) setShowCategoryForm(false); }}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.modalHeader, { flexDirection: rowDir }]}>
              <Text style={[styles.modalTitle, rtlTextAlign]} numberOfLines={1}>{editCategory ? tr("Edit category", "Kategorie bearbeiten", "تعديل الفئة") : tr("Add category", "Kategorie hinzufügen", "إضافة فئة")}</Text>
              {closeX(() => { if (!catSaving) setShowCategoryForm(false); })}
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={[styles.label, rtlTextAlign]}>{t("categoryImage")}</Text>
              <Pressable onPress={() => pickImage("category")} style={styles.imagePicker}>
                {categoryImage ? (
                  <View style={{ alignItems: "center" }}>
                    <Image source={{ uri: imageSrc(categoryImage) }} style={{ width: 80, height: 80, borderRadius: 12 }} />
                    <Text style={{ color: Colors.accent, fontSize: 13, marginTop: 8 }}>{t("changeImage")}</Text>
                  </View>
                ) : (
                  <View style={{ alignItems: "center" }}>
                    <Ionicons name="camera-outline" size={28} color={Colors.textMuted} />
                    <Text style={{ color: Colors.textMuted, fontSize: 13, marginTop: 4 }}>{t("tapToAddImage")}</Text>
                  </View>
                )}
              </Pressable>
              {!!categoryImage && (
                <Pressable onPress={() => setCategoryImage(null)} hitSlop={8} style={styles.removeImageBtn}>
                  <Ionicons name="trash-outline" size={14} color={Colors.danger} />
                  <Text style={{ color: Colors.danger, fontSize: 13, fontWeight: "600" }}>{tr("Remove image", "Bild entfernen", "إزالة الصورة")}</Text>
                </Pressable>
              )}
              <Text style={[styles.label, rtlTextAlign]}>{t("name")} *</Text>
              <TextInput style={[styles.input, rtlTextAlign]} value={catForm.name} onChangeText={(v) => setCatForm({ ...catForm, name: v })} placeholderTextColor={Colors.textMuted} placeholder={t("category")} />

              <Text style={[styles.label, rtlTextAlign]}>{t("color")}</Text>
              <View style={{ flexDirection: rowDir, flexWrap: "wrap", gap: 8, marginTop: 4 }}>
                {["#7C3AED", "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#EC4899", "#2FD3C6", "#F97316"].map((c) => (
                  <Pressable
                    key={c}
                    onPress={() => setCatForm({ ...catForm, color: c })}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: catForm.color === c }}
                    style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c, borderWidth: catForm.color === c ? 3 : 0, borderColor: Colors.text, justifyContent: "center", alignItems: "center" }}
                  >
                    {catForm.color === c && <Ionicons name="checkmark" size={20} color="#FFFFFF" />}
                  </Pressable>
                ))}
              </View>

              <Text style={[styles.label, rtlTextAlign]}>{t("icon")}</Text>
              <View style={{ flexDirection: rowDir, flexWrap: "wrap", gap: 8, marginTop: 4 }}>
                {["grid", "cube", "nutrition", "medical", "cart", "cafe", "beer", "pizza", "leaf", "sparkles", "hardware-chip", "shirt"].map((ic) => (
                  <Pressable
                    key={ic}
                    onPress={() => setCatForm({ ...catForm, icon: ic })}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: catForm.icon === ic }}
                    style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: catForm.icon === ic ? Colors.accent + "30" : Colors.surfaceLight, justifyContent: "center", alignItems: "center", borderWidth: catForm.icon === ic ? 1 : 0, borderColor: Colors.accent }}
                  >
                    <Ionicons name={ic as any} size={20} color={catForm.icon === ic ? Colors.accent : Colors.textMuted} />
                  </Pressable>
                ))}
              </View>

              <Pressable style={[styles.saveBtn, catSaving && { opacity: 0.7 }]} disabled={catSaving} onPress={() => { playClickSound("heavy"); void saveCategory(); }}>
                <LinearGradient colors={[Colors.accent, Colors.gradientMid]} style={styles.saveBtnGradient}>
                  {catSaving ? <ActivityIndicator color={Colors.white} /> : (
                    <Text style={styles.saveBtnText}>{editCategory ? t("save") : tr("Create category", "Kategorie anlegen", "إنشاء الفئة")}</Text>
                  )}
                </LinearGradient>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <BarcodeScannerModal
        visible={showBarcodeScanner}
        title={t("barcode")}
        onScanned={(barcode) => {
          const applyCode = () => { setForm((f) => ({ ...f, barcode })); setShowBarcodeScanner(false); };
          const taken = (products as any[]).find((p: any) => p.barcode === barcode && p.id !== editProduct?.id);
          if (!taken) { applyCode(); return; }
          return {
            ok: false,
            message: tr(`Barcode already used by: ${taken.name}`, `Barcode wird bereits verwendet von: ${taken.name}`, `هذا الباركود مستخدم للمنتج: ${taken.name}`),
            action: { label: tr("Use anyway", "Trotzdem verwenden", "استخدمه رغم ذلك"), onPress: applyCode },
          };
        }}
        onClose={() => setShowBarcodeScanner(false)}
      />

      <Modal visible={showDatePicker} animationType="fade" transparent onRequestClose={() => setShowDatePicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: "80%" }]}>
            <View style={[styles.modalHeader, { flexDirection: rowDir }]}>
              <Text style={[styles.modalTitle, rtlTextAlign]} numberOfLines={1}>{t("expiryDateFull")}</Text>
              {closeX(() => setShowDatePicker(false))}
            </View>
            <View style={{ flexDirection: rowDir, gap: 8, marginBottom: 16 }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { marginTop: 0 }, rtlTextAlign]}>{t("year")}</Text>
                <ScrollView style={styles.pickerCol}>
                  {years.map((y) => (
                    <Pressable
                      key={y}
                      onPress={() => setPickerYear(y)}
                      style={[styles.pickerItem, pickerYear === y && { backgroundColor: Colors.accent + "30" }]}
                    >
                      <Text style={{ color: pickerYear === y ? Colors.accent : Colors.text, fontSize: 15, fontWeight: pickerYear === y ? "700" : "400", textAlign: "center" }}>{y}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { marginTop: 0 }, rtlTextAlign]}>{t("month")}</Text>
                <ScrollView style={styles.pickerCol}>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <Pressable
                      key={m}
                      onPress={() => setPickerMonth(m)}
                      style={[styles.pickerItem, pickerMonth === m && { backgroundColor: Colors.accent + "30" }]}
                    >
                      <Text style={{ color: pickerMonth === m ? Colors.accent : Colors.text, fontSize: 15, fontWeight: pickerMonth === m ? "700" : "400", textAlign: "center" }} numberOfLines={1}>
                        {new Date(2000, m - 1, 1).toLocaleString(dateLocale, { month: "short" })}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { marginTop: 0 }, rtlTextAlign]}>{t("day")}</Text>
                <ScrollView style={styles.pickerCol}>
                  {Array.from({ length: new Date(pickerYear, pickerMonth, 0).getDate() }, (_, i) => i + 1).map((d) => (
                    <Pressable
                      key={d}
                      onPress={() => setPickerDay(d)}
                      style={[styles.pickerItem, pickerDay === d && { backgroundColor: Colors.accent + "30" }]}
                    >
                      <Text style={{ color: pickerDay === d ? Colors.accent : Colors.text, fontSize: 15, fontWeight: pickerDay === d ? "700" : "400", textAlign: "center" }}>{d}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            </View>
            <Text style={{ color: Colors.textSecondary, fontSize: 14, textAlign: "center", marginBottom: 16 }}>
              {formatYmd(`${pickerYear}-${String(pickerMonth).padStart(2, "0")}-${String(pickerDay).padStart(2, "0")}`)}
            </Text>
            <View style={{ flexDirection: rowDir, gap: 12 }}>
              <Pressable
                style={styles.secondaryBtn}
                onPress={() => { setForm({ ...form, expiryDate: "" }); setShowDatePicker(false); }}
              >
                <Text style={{ color: Colors.danger, fontSize: 15, fontWeight: "600" }}>{tr("Clear date", "Datum entfernen", "مسح التاريخ")}</Text>
              </Pressable>
              <Pressable
                style={{ flex: 1, borderRadius: 12, overflow: "hidden" }}
                onPress={() => {
                  const dim = new Date(pickerYear, pickerMonth, 0).getDate();
                  const dateStr = `${pickerYear}-${String(pickerMonth).padStart(2, "0")}-${String(Math.min(pickerDay, dim)).padStart(2, "0")}`;
                  setForm({ ...form, expiryDate: dateStr });
                  setShowDatePicker(false);
                }}
              >
                <LinearGradient colors={[Colors.accent, Colors.gradientMid]} style={{ minHeight: 46, paddingVertical: 12, alignItems: "center", justifyContent: "center", borderRadius: 12 }}>
                  <Text style={{ color: Colors.white, fontSize: 15, fontWeight: "600" }}>{t("set")}</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <View style={{ height: Platform.OS === "web" ? 84 : 60 }} />
    </View>
  );
}

const styles = themedStyles((Colors) => ({
  container: { flex: 1, backgroundColor: Colors.background },
  segment: { flex: 1, minHeight: 44, paddingVertical: 10, paddingHorizontal: 8, borderRadius: 12, backgroundColor: Colors.surface, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: Colors.cardBorder },
  segmentActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  searchRow: { paddingHorizontal: 12, paddingVertical: 10, alignItems: "center", gap: 8 },
  searchBox: { flex: 1, minWidth: 0, alignItems: "center", gap: 8, backgroundColor: Colors.inputBg, borderRadius: 12, paddingHorizontal: 12, height: 44, borderWidth: 1, borderColor: Colors.inputBorder },
  searchInput: { flex: 1, minWidth: 0, color: Colors.text, fontSize: 15, height: 44 },
  iconSquare: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.cardBorder, justifyContent: "center", alignItems: "center" },
  list: { paddingHorizontal: 12 },
  productCard: { alignItems: "center", gap: 12, backgroundColor: Colors.surface, borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: Colors.cardBorder },
  productIconWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.surfaceLight, justifyContent: "center", alignItems: "center", overflow: "hidden" as const },
  productInfo: { flex: 1, minWidth: 0 },
  productName: { color: Colors.text, fontSize: 15, fontWeight: "600" },
  productMeta: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  productRight: { gap: 6, flexShrink: 0, maxWidth: "45%" },
  productPrice: { color: Colors.accent, fontSize: 16, fontWeight: "800" },
  trashBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: Colors.danger + "14" },
  empty: { alignItems: "center", paddingVertical: 60, paddingHorizontal: 16, gap: 12 },
  emptyText: { color: Colors.textMuted, fontSize: 15, textAlign: "center" },
  retryBtn: { minHeight: 44, paddingHorizontal: 20, borderRadius: 12, backgroundColor: Colors.accent, alignItems: "center", justifyContent: "center" },
  retryText: { color: Colors.textDark, fontSize: 14, fontWeight: "700" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", alignItems: "center" },
  modalContent: { backgroundColor: Colors.surface, borderRadius: 20, padding: 20, width: "92%", maxWidth: 480, maxHeight: "88%" },
  modalHeader: { justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 12 },
  modalTitle: { flex: 1, color: Colors.text, fontSize: 20, fontWeight: "700" },
  closeBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: Colors.surfaceLight },
  label: { color: Colors.textSecondary, fontSize: 12, fontWeight: "600", marginBottom: 6, marginTop: 12, textTransform: "uppercase" as const, letterSpacing: 0.5 },
  input: { backgroundColor: Colors.inputBg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, minHeight: 46, color: Colors.text, fontSize: 15, borderWidth: 1, borderColor: Colors.inputBorder },
  imagePicker: { alignItems: "center", marginBottom: 4, padding: 16, borderRadius: 12, borderWidth: 1, borderStyle: "dashed", borderColor: Colors.cardBorder, backgroundColor: Colors.surfaceLight },
  removeImageBtn: { flexDirection: "row", alignSelf: "center", alignItems: "center", gap: 6, paddingVertical: 8, paddingHorizontal: 12, marginBottom: 4 },
  row: { gap: 12 },
  half: { flex: 1, minWidth: 0 },
  catRow: { maxHeight: 48, marginBottom: 8 },
  catChip: { minHeight: 36, justifyContent: "center", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.surfaceLight, borderWidth: 1, borderColor: Colors.cardBorder },
  catChipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  catChipText: { color: Colors.textSecondary, fontSize: 13, fontWeight: "600" },
  scanBtn: { width: 48, height: 48, borderRadius: 12, backgroundColor: Colors.accent, justifyContent: "center", alignItems: "center" },
  saveBtn: { borderRadius: 14, overflow: "hidden", marginTop: 20, marginBottom: 16 },
  saveBtnGradient: { minHeight: 50, paddingVertical: 14, alignItems: "center", justifyContent: "center" },
  saveBtnText: { color: Colors.white, fontSize: 16, fontWeight: "700" },
  secondaryBtn: { flex: 1, minHeight: 46, paddingVertical: 12, borderRadius: 12, backgroundColor: Colors.surfaceLight, alignItems: "center", justifyContent: "center" },
  pickerCol: { maxHeight: 180, backgroundColor: Colors.inputBg, borderRadius: 12, borderWidth: 1, borderColor: Colors.inputBorder },
  pickerItem: { minHeight: 40, paddingVertical: 10, paddingHorizontal: 8, borderRadius: 8, justifyContent: "center" },
  addonToggleRow: { alignItems: "center", gap: 12, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: Colors.cardBorder, backgroundColor: Colors.surfaceLight, marginTop: 14 },
  addonToggleRowActive: { borderColor: Colors.success, backgroundColor: Colors.success + "11" },
  addonToggle: { width: 46, height: 26, borderRadius: 13, backgroundColor: Colors.cardBorder, padding: 2, justifyContent: "center" },
  addonToggleOn: { backgroundColor: Colors.success },
  addonToggleThumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#fff", alignSelf: "flex-start" },
  addonToggleThumbOn: { alignSelf: "flex-end" },
}));
