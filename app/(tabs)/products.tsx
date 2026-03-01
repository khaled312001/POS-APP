import React, { useState, useEffect } from "react";
import {
  StyleSheet, Text, View, FlatList, Pressable, TextInput,
  Modal, Alert, ScrollView, Platform, Dimensions, Image,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Colors } from "@/constants/colors";
import { apiRequest, getQueryFn, getApiUrl } from "@/lib/query-client";
import BarcodeScanner from "@/components/BarcodeScanner";
import { useAuth } from "@/lib/auth-context";
import { useLicense } from "@/lib/license-context";
import { useLanguage } from "@/lib/language-context";

export default function ProductsScreen() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { canManage } = useAuth();
  const { tenant } = useLicense();
  const { t, isRTL, rtlTextAlign, rtlText } = useLanguage();
  const tenantId = tenant?.id;
  const [screenDims, setScreenDims] = useState(Dimensions.get("window"));
  useEffect(() => {
    const sub = Dimensions.addEventListener("change", ({ window }) => setScreenDims(window));
    return () => sub?.remove();
  }, []);
  const isTablet = screenDims.width > 600;
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editProduct, setEditProduct] = useState<any>(null);
  const [form, setForm] = useState({ name: "", price: "", sku: "", barcode: "", categoryId: "", costPrice: "", unit: "piece", expiryDate: "" });
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());
  const [pickerMonth, setPickerMonth] = useState(new Date().getMonth() + 1);
  const [pickerDay, setPickerDay] = useState(1);
  const [viewMode, setViewMode] = useState<"products" | "categories">("products");
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editCategory, setEditCategory] = useState<any>(null);
  const [catForm, setCatForm] = useState({ name: "", color: "#7C3AED", icon: "grid" });
  const [productImage, setProductImage] = useState<string | null>(null);
  const [categoryImage, setCategoryImage] = useState<string | null>(null);
  const [initialStock, setInitialStock] = useState("");
  const [imageUploading, setImageUploading] = useState(false);

  const { data: products = [] } = useQuery<any[]>({
    queryKey: ["/api/products", tenantId ? `?tenantId=${tenantId}` : (search ? `?search=${search}` : "")],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const { data: categories = [] } = useQuery<any[]>({
    queryKey: ["/api/categories"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const { data: inventoryData = [] } = useQuery<any[]>({
    queryKey: ["/api/inventory"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const { data: storeSettings } = useQuery<any>({
    queryKey: ["/api/store-settings"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const isRestaurant = storeSettings?.storeType === "restaurant";

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest(editProduct ? "PUT" : "POST", editProduct ? `/api/products/${editProduct.id}` : "/api/products", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/products"] });
      setShowForm(false);
      setEditProduct(null);
      resetForm();
    },
    onError: (e: any) => Alert.alert(t("error"), e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/products/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/products"] }),
    onError: (e: any) => Alert.alert(t("error"), e.message),
  });

  const createCategoryMutation = useMutation({
    mutationFn: (data: any) => apiRequest(editCategory ? "PUT" : "POST", editCategory ? `/api/categories/${editCategory.id}` : "/api/categories", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/categories"] });
      setShowCategoryForm(false);
      setEditCategory(null);
      setCatForm({ name: "", color: "#7C3AED", icon: "grid" });
    },
    onError: (e: any) => Alert.alert(t("error"), e.message),
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/categories/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/categories"] }),
    onError: (e: any) => Alert.alert(t("error"), e.message),
  });

  const resetForm = () => { setForm({ name: "", price: "", sku: "", barcode: "", categoryId: "", costPrice: "", unit: "piece", expiryDate: "" }); setProductImage(null); setInitialStock(""); };

  const openEdit = (p: any) => {
    setEditProduct(p);
    setForm({
      name: p.name, price: String(p.price), sku: p.sku || "",
      barcode: p.barcode || "", categoryId: p.categoryId ? String(p.categoryId) : "",
      costPrice: p.costPrice ? String(p.costPrice) : "", unit: p.unit || "piece", expiryDate: p.expiryDate || "",
    });
    setProductImage(p.image || null);
    setShowForm(true);
  };

  const pickImage = async (type: "product" | "category") => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      if (type === "product") setProductImage(uri);
      else setCategoryImage(uri);
    }
  };

  const uploadImage = async (uri: string): Promise<string | null> => {
    try {
      setImageUploading(true);
      const uploadRes = await apiRequest("POST", "/api/objects/upload");
      const { uploadURL } = await uploadRes.json();
      const response = await fetch(uri);
      const blob = await response.blob();
      await fetch(uploadURL, { method: "PUT", body: blob, headers: { "Content-Type": "image/jpeg" } });
      const saveRes = await apiRequest("PUT", "/api/images/save", { imageURL: uploadURL });
      const { objectPath } = await saveRes.json();
      return objectPath;
    } catch (e) {
      console.error("Upload failed:", e);
      return null;
    } finally {
      setImageUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.name || !form.price) return Alert.alert(t("error"), t("productName") + " & " + t("price"));
    let imagePath = editProduct?.image || null;
    if (productImage && !productImage.startsWith("/objects")) {
      imagePath = await uploadImage(productImage);
    }
    const productData: any = {
      name: form.name, price: form.price, sku: form.sku || undefined,
      barcode: form.barcode || undefined, costPrice: form.costPrice || undefined,
      categoryId: form.categoryId ? Number(form.categoryId) : undefined, unit: form.unit, expiryDate: form.expiryDate || undefined,
      image: imagePath || undefined,
    };
    if (!editProduct && initialStock && Number(initialStock) > 0) {
      apiRequest("POST", "/api/products-with-stock", { ...productData, initialStock: Number(initialStock), branchId: 1 })
        .then(() => {
          qc.invalidateQueries({ queryKey: ["/api/products"] });
          qc.invalidateQueries({ queryKey: ["/api/inventory"] });
          setShowForm(false); setEditProduct(null); resetForm(); setProductImage(null); setInitialStock("");
        })
        .catch((e: any) => Alert.alert(t("error"), e.message));
    } else {
      createMutation.mutate(productData);
    }
  };

  const getStock = (productId: number) => {
    const inv = inventoryData.find((i: any) => i.productId === productId);
    return inv ? inv.quantity : null;
  };

  const isNearExpiry = (dateStr: string | null) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const now = new Date();
    const diffDays = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays <= 30 && diffDays > 0;
  };

  const isExpired = (dateStr: string | null) => {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date();
  };

  const topPad = Platform.OS === "web" ? 67 : 0;
  const getCatName = (catId: number | null) => categories.find((c: any) => c.id === catId)?.name || t("uncategorized");

  return (
    <View style={[styles.container, { paddingTop: insets.top + topPad, direction: isRTL ? "rtl" : "ltr" }]}>
      <LinearGradient colors={[Colors.gradientStart, Colors.gradientMid]} style={[styles.header, isRTL && { flexDirection: "row-reverse" }]}>
        <Text style={[styles.headerTitle, rtlTextAlign]}>{t("products")}</Text>
        {canManage && (
          <Pressable style={styles.addBtn} onPress={() => {
            if (viewMode === "products") {
              resetForm(); setEditProduct(null); setShowForm(true);
            } else {
              setCatForm({ name: "", color: "#7C3AED", icon: "grid" }); setEditCategory(null); setShowCategoryForm(true);
            }
          }}>
            <Ionicons name="add" size={24} color={Colors.white} />
          </Pressable>
        )}
      </LinearGradient>

      <View style={{ flexDirection: isRTL ? "row-reverse" : "row", paddingHorizontal: 12, paddingTop: 10, gap: 8 }}>
        <Pressable
          style={{ flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: viewMode === "products" ? Colors.accent : Colors.surface, alignItems: "center", borderWidth: 1, borderColor: viewMode === "products" ? Colors.accent : Colors.cardBorder }}
          onPress={() => setViewMode("products")}
        >
          <Text style={{ color: viewMode === "products" ? Colors.textDark : Colors.textSecondary, fontSize: 14, fontWeight: "600" }}>{t("products")}</Text>
        </Pressable>
        <Pressable
          style={{ flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: viewMode === "categories" ? Colors.accent : Colors.surface, alignItems: "center", borderWidth: 1, borderColor: viewMode === "categories" ? Colors.accent : Colors.cardBorder }}
          onPress={() => setViewMode("categories")}
        >
          <Text style={{ color: viewMode === "categories" ? Colors.textDark : Colors.textSecondary, fontSize: 14, fontWeight: "600" }}>{t("category")}</Text>
        </Pressable>
      </View>

      {viewMode === "products" && (
        <View style={styles.searchRow}>
          <View style={[styles.searchBox, isRTL && { flexDirection: "row-reverse" }]}>
            <Ionicons name="search" size={18} color={Colors.textMuted} />
            <TextInput style={[styles.searchInput, isRTL ? { marginRight: 8, marginLeft: 0, textAlign: "right" } : {}]} placeholder={t("search") + "..."} placeholderTextColor={Colors.textMuted} value={search} onChangeText={setSearch} />
          </View>
          {canManage && (
            <Pressable
              style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.cardBorder, justifyContent: "center", alignItems: "center" }}
              onPress={async () => {
                try {
                  if (Platform.OS === "web") {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = ".xlsx,.xls,.csv";
                    input.onchange = async (e: any) => {
                      const file = e.target.files[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = async (ev) => {
                        try {
                          const base64 = (ev.target?.result as string).split(",")[1];
                          const res = await apiRequest("POST", "/api/products/import", { fileBase64: base64, tenantId: tenantId || 1, branchId: 1 });
                          const data = await res.json();
                          if (data.success) {
                            Alert.alert(t("success"), `${(t as any)("imported") || "Imported"} ${data.count} ${t("products")}`);
                            qc.invalidateQueries({ queryKey: ["/api/products"] });
                          } else {
                            Alert.alert(t("error"), data.error || "Import failed");
                          }
                        } catch (err: any) {
                          Alert.alert(t("error"), err.message);
                        }
                      };
                      reader.readAsDataURL(file);
                    };
                    input.click();
                  } else {
                    const result = await DocumentPicker.getDocumentAsync({
                      type: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.ms-excel"],
                      copyToCacheDirectory: true,
                    });
                    if (!result.canceled && result.assets[0]) {
                      const response = await fetch(result.assets[0].uri);
                      const blob = await response.blob();
                      const reader = new FileReader();
                      reader.onloadend = async () => {
                        try {
                          const base64 = (reader.result as string).split(",")[1];
                          const res = await apiRequest("POST", "/api/products/import", { fileBase64: base64, tenantId: tenantId || 1, branchId: 1 });
                          const data = await res.json();
                          if (data.success) {
                            Alert.alert(t("success"), `${(t as any)("imported") || "Imported"} ${data.count} ${t("products")}`);
                            qc.invalidateQueries({ queryKey: ["/api/products"] });
                          } else {
                            Alert.alert(t("error"), data.error || "Import failed");
                          }
                        } catch (err: any) {
                          Alert.alert(t("error"), err.message);
                        }
                      };
                      reader.readAsDataURL(blob);
                    }
                  }
                } catch (err: any) {
                  Alert.alert(t("error"), err.message);
                }
              }}
            >
              <Ionicons name="cloud-upload-outline" size={20} color={Colors.accent} />
            </Pressable>
          )}
        </View>
      )}

      {viewMode === "products" && (
        <FlatList
          data={products}
          keyExtractor={(item: any) => String(item.id)}
          contentContainerStyle={styles.list}
          scrollEnabled={!!products.length}
          renderItem={({ item }: { item: any }) => (
            <Pressable style={[styles.productCard, isRTL && { flexDirection: "row-reverse" }]} onPress={() => canManage ? openEdit(item) : null}>
              <View style={[styles.productIconWrap, isRTL ? { marginLeft: 12, marginRight: 0 } : {}]}>
                {item.image ? (
                  <Image source={{ uri: item.image.startsWith("http") ? item.image : `${getApiUrl()}${item.image}` }} style={{ width: 40, height: 40, borderRadius: 10 }} resizeMode="cover" />
                ) : (
                  <Ionicons name="cube" size={24} color={Colors.accent} />
                )}
              </View>
              <View style={styles.productInfo}>
                <Text style={[styles.productName, rtlTextAlign]}>{item.name}</Text>
                <Text style={[styles.productMeta, rtlTextAlign]}>{item.sku || t("noSku")} | {getCatName(item.categoryId)}</Text>
                {(() => {
                  const stock = getStock(item.id);
                  return stock !== null ? (
                    <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 4, marginTop: 2 }}>
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: stock <= 0 ? Colors.danger : stock <= 10 ? Colors.warning : Colors.success }} />
                      <Text style={{ color: stock <= 0 ? Colors.danger : stock <= 10 ? Colors.warning : Colors.textMuted, fontSize: 11 }}>
                        {stock <= 0 ? t("outOfStockFull") : `${stock} ${t("xInStock")}`}
                      </Text>
                    </View>
                  ) : null;
                })()}
                {item.expiryDate && (
                  <Text style={{ color: isExpired(item.expiryDate) ? Colors.danger : isNearExpiry(item.expiryDate) ? Colors.warning : Colors.textMuted, fontSize: 10, marginTop: 2, ...rtlTextAlign }}>
                    {isExpired(item.expiryDate) ? t("expired") : `${t("expiryDate")}: ${new Date(item.expiryDate).toLocaleDateString()}`}
                  </Text>
                )}
              </View>
              <View style={[styles.productRight, isRTL && { alignItems: "flex-start" }]}>
                <Text style={styles.productPrice}>CHF {Number(item.price).toFixed(2)}</Text>
                {canManage && (
                  <Pressable onPress={() => {
                    Alert.alert(t("delete"), `${t("delete")} ${item.name}?`, [
                      { text: t("cancel") },
                      { text: t("delete"), style: "destructive", onPress: () => deleteMutation.mutate(item.id) },
                    ]);
                  }}>
                    <Ionicons name="trash-outline" size={18} color={Colors.danger} />
                  </Pressable>
                )}
              </View>
            </Pressable>
          )}
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="cube-outline" size={48} color={Colors.textMuted} /><Text style={styles.emptyText}>{t("noProducts")}</Text></View>}
        />
      )}

      {viewMode === "categories" && (
        <FlatList
          data={categories}
          keyExtractor={(item: any) => String(item.id)}
          contentContainerStyle={styles.list}
          scrollEnabled={!!categories.length}
          renderItem={({ item }: { item: any }) => (
            <Pressable style={[styles.productCard, isRTL && { flexDirection: "row-reverse" }]} onPress={() => {
              if (!canManage) return;
              setEditCategory(item);
              setCatForm({ name: item.name, color: item.color || "#7C3AED", icon: item.icon || "grid" });
              setCategoryImage(item.image || null);
              setShowCategoryForm(true);
            }}>
              <View style={[styles.productIconWrap, isRTL ? { marginLeft: 12, marginRight: 0 } : {}, { backgroundColor: (item.color || "#7C3AED") + "20" }]}>
                {item.image ? (
                  <Image source={{ uri: item.image.startsWith("http") ? item.image : `${getApiUrl()}${item.image}` }} style={{ width: 40, height: 40, borderRadius: 10 }} resizeMode="cover" />
                ) : (
                  <Ionicons name={(item.icon || "grid") as any} size={24} color={item.color || "#7C3AED"} />
                )}
              </View>
              <View style={styles.productInfo}>
                <Text style={[styles.productName, rtlTextAlign]}>{item.name}</Text>
                <Text style={[styles.productMeta, rtlTextAlign]}>
                  {products.filter((p: any) => p.categoryId === item.id).length} {t("products2")}
                </Text>
              </View>
              <View style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 8 }}>
                {canManage && (
                  <Pressable
                    onPress={() => {
                      Alert.alert(t("delete") + " " + t("category"), `${t("delete")} "${item.name}"?`, [
                        { text: t("cancel"), style: "cancel" },
                        { text: t("delete"), style: "destructive", onPress: () => deleteCategoryMutation.mutate(item.id) },
                      ]);
                    }}
                  >
                    <Ionicons name="trash-outline" size={18} color={Colors.danger} />
                  </Pressable>
                )}
                <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={18} color={Colors.textMuted} />
              </View>
            </Pressable>
          )}
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="grid-outline" size={48} color={Colors.textMuted} /><Text style={styles.emptyText}>{t("noCategories")}</Text></View>}
        />
      )}

      <Modal visible={showForm} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.modalHeader, isRTL && { flexDirection: "row-reverse" }]}>
              <Text style={[styles.modalTitle, rtlTextAlign]}>{editProduct ? t("editProduct") : t("addProduct")}</Text>
              <Pressable onPress={() => setShowForm(false)}><Ionicons name="close" size={24} color={Colors.text} /></Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.label, rtlTextAlign]}>{t("productImage")}</Text>
              <Pressable onPress={() => pickImage("product")} style={{ alignItems: "center", marginBottom: 12, padding: 16, borderRadius: 12, borderWidth: 1, borderStyle: "dashed", borderColor: Colors.cardBorder, backgroundColor: Colors.surfaceLight }}>
                {productImage ? (
                  <View style={{ alignItems: "center" }}>
                    <Image source={{ uri: productImage.startsWith("http") ? productImage : productImage.startsWith("/objects") ? `${getApiUrl()}${productImage}` : productImage }} style={{ width: 100, height: 100, borderRadius: 12 }} />
                    <Text style={{ color: Colors.accent, fontSize: 13, marginTop: 8 }}>{t("changeImage")}</Text>
                  </View>
                ) : (
                  <View style={{ alignItems: "center" }}>
                    <Ionicons name="camera-outline" size={32} color={Colors.textMuted} />
                    <Text style={{ color: Colors.textMuted, fontSize: 13, marginTop: 4 }}>{t("tapToAddImage")}</Text>
                  </View>
                )}
              </Pressable>
              <Text style={[styles.label, rtlTextAlign]}>{t("productName")} *</Text>
              <TextInput style={[styles.input, rtlTextAlign]} value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} placeholderTextColor={Colors.textMuted} placeholder={t("productName")} />
              <View style={[styles.row, isRTL && { flexDirection: "row-reverse" }]}>
                <View style={styles.half}>
                  <Text style={[styles.label, rtlTextAlign]}>{t("price")} *</Text>
                  <TextInput style={[styles.input, rtlTextAlign]} value={form.price} onChangeText={(v) => setForm({ ...form, price: v })} keyboardType="decimal-pad" placeholderTextColor={Colors.textMuted} placeholder="0.00" />
                </View>
                <View style={styles.half}>
                  <Text style={[styles.label, rtlTextAlign]}>{t("costPrice")}</Text>
                  <TextInput style={[styles.input, rtlTextAlign]} value={form.costPrice} onChangeText={(v) => setForm({ ...form, costPrice: v })} keyboardType="decimal-pad" placeholderTextColor={Colors.textMuted} placeholder="0.00" />
                </View>
              </View>
              <Text style={[styles.label, rtlTextAlign]}>SKU</Text>
              <TextInput style={[styles.input, rtlTextAlign]} value={form.sku} onChangeText={(v) => setForm({ ...form, sku: v })} placeholderTextColor={Colors.textMuted} placeholder="SKU-001" />

              <Text style={[styles.label, rtlTextAlign]}>{t("barcode")}</Text>
              <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 8, alignItems: "center" }}>
                <TextInput style={[styles.input, { flex: 1 }, rtlTextAlign]} value={form.barcode} onChangeText={(v) => setForm({ ...form, barcode: v })} placeholderTextColor={Colors.textMuted} placeholder="ABC-123456" />
                <Pressable style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: Colors.accent, justifyContent: "center", alignItems: "center" }} onPress={() => setShowBarcodeScanner(true)}>
                  <Ionicons name="barcode-outline" size={22} color={Colors.textDark} />
                </Pressable>
              </View>
              <Text style={[styles.label, rtlTextAlign]}>{t("expiryDateFull")}</Text>
              <Pressable
                style={[styles.input, { flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", justifyContent: "space-between" }]}
                onPress={() => {
                  if (form.expiryDate) {
                    const parts = form.expiryDate.split("-");
                    setPickerYear(Number(parts[0]));
                    setPickerMonth(Number(parts[1]));
                    setPickerDay(Number(parts[2]));
                  } else {
                    setPickerYear(new Date().getFullYear());
                    setPickerMonth(new Date().getMonth() + 1);
                    setPickerDay(1);
                  }
                  setShowDatePicker(true);
                }}
              >
                <Text style={{ color: form.expiryDate ? Colors.text : Colors.textMuted, fontSize: 15 }}>
                  {form.expiryDate || t("selectDate")}
                </Text>
                <Ionicons name="calendar-outline" size={20} color={Colors.textMuted} />
              </Pressable>
              <Text style={[styles.label, rtlTextAlign]}>{t("category")}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catRow}>
                {categories.map((cat: any) => (
                  <Pressable key={cat.id} style={[styles.catChip, form.categoryId === String(cat.id) && styles.catChipActive, isRTL ? { marginLeft: 8, marginRight: 0 } : {}]} onPress={() => setForm({ ...form, categoryId: String(cat.id) })}>
                    <Text style={[styles.catChipText, form.categoryId === String(cat.id) && { color: Colors.textDark }]}>{cat.name}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              {!editProduct && !isRestaurant && (
                <View>
                  <Text style={[styles.label, rtlTextAlign]}>{t("initialStock")}</Text>
                  <TextInput style={[styles.input, rtlTextAlign]} value={initialStock} onChangeText={setInitialStock} keyboardType="number-pad" placeholderTextColor={Colors.textMuted} placeholder={t("enterInitialStock")} />
                </View>
              )}
              <Pressable style={styles.saveBtn} onPress={handleSave}>
                <LinearGradient colors={[Colors.accent, Colors.gradientMid]} style={styles.saveBtnGradient}>
                  <Text style={styles.saveBtnText}>{editProduct ? t("editProduct") : t("addProduct")}</Text>
                </LinearGradient>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showCategoryForm} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.modalHeader, isRTL && { flexDirection: "row-reverse" }]}>
              <Text style={[styles.modalTitle, rtlTextAlign]}>{editCategory ? t("edit") + " " + t("category") : t("add") + " " + t("category")}</Text>
              <Pressable onPress={() => setShowCategoryForm(false)}><Ionicons name="close" size={24} color={Colors.text} /></Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.label, rtlTextAlign]}>{t("categoryImage")}</Text>
              <Pressable onPress={() => pickImage("category")} style={{ alignItems: "center", marginBottom: 12, padding: 16, borderRadius: 12, borderWidth: 1, borderStyle: "dashed", borderColor: Colors.cardBorder, backgroundColor: Colors.surfaceLight }}>
                {categoryImage ? (
                  <View style={{ alignItems: "center" }}>
                    <Image source={{ uri: categoryImage.startsWith("http") ? categoryImage : categoryImage.startsWith("/objects") ? `${getApiUrl()}${categoryImage}` : categoryImage }} style={{ width: 80, height: 80, borderRadius: 12 }} />
                    <Text style={{ color: Colors.accent, fontSize: 13, marginTop: 8 }}>{t("changeImage")}</Text>
                  </View>
                ) : (
                  <View style={{ alignItems: "center" }}>
                    <Ionicons name="camera-outline" size={28} color={Colors.textMuted} />
                    <Text style={{ color: Colors.textMuted, fontSize: 13, marginTop: 4 }}>{t("tapToAddImage")}</Text>
                  </View>
                )}
              </Pressable>
              <Text style={[styles.label, rtlTextAlign]}>{t("name")} *</Text>
              <TextInput style={[styles.input, rtlTextAlign]} value={catForm.name} onChangeText={(v) => setCatForm({ ...catForm, name: v })} placeholderTextColor={Colors.textMuted} placeholder={t("category")} />

              <Text style={[styles.label, rtlTextAlign]}>{t("color")}</Text>
              <View style={{ flexDirection: isRTL ? "row-reverse" : "row", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
                {["#7C3AED", "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#EC4899", "#2FD3C6", "#F97316"].map((c) => (
                  <Pressable
                    key={c}
                    onPress={() => setCatForm({ ...catForm, color: c })}
                    style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c, borderWidth: catForm.color === c ? 3 : 0, borderColor: Colors.white, justifyContent: "center", alignItems: "center" }}
                  >
                    {catForm.color === c && <Ionicons name="checkmark" size={18} color={Colors.white} />}
                  </Pressable>
                ))}
              </View>

              <Text style={[styles.label, rtlTextAlign]}>{t("icon")}</Text>
              <View style={{ flexDirection: isRTL ? "row-reverse" : "row", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
                {["grid", "cube", "nutrition", "medical", "cart", "cafe", "beer", "pizza", "leaf", "sparkles", "hardware-chip", "shirt"].map((ic) => (
                  <Pressable
                    key={ic}
                    onPress={() => setCatForm({ ...catForm, icon: ic })}
                    style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: catForm.icon === ic ? Colors.accent + "30" : Colors.surfaceLight, justifyContent: "center", alignItems: "center", borderWidth: catForm.icon === ic ? 1 : 0, borderColor: Colors.accent }}
                  >
                    <Ionicons name={ic as any} size={20} color={catForm.icon === ic ? Colors.accent : Colors.textMuted} />
                  </Pressable>
                ))}
              </View>

              <Pressable style={styles.saveBtn} onPress={async () => {
                if (!catForm.name) return Alert.alert(t("error"), t("name"));
                let imagePath = editCategory?.image || null;
                if (categoryImage && !categoryImage.startsWith("/objects")) {
                  imagePath = await uploadImage(categoryImage);
                }
                createCategoryMutation.mutate({ name: catForm.name, color: catForm.color, icon: catForm.icon, image: imagePath || undefined });
              }}>
                <LinearGradient colors={[Colors.accent, Colors.gradientMid]} style={styles.saveBtnGradient}>
                  <Text style={styles.saveBtnText}>{editCategory ? t("update") : t("create")} {t("category")}</Text>
                </LinearGradient>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <BarcodeScanner
        visible={showBarcodeScanner}
        onScanned={(barcode) => { setForm({ ...form, barcode }); setShowBarcodeScanner(false); }}
        onClose={() => setShowBarcodeScanner(false)}
      />

      <Modal visible={showDatePicker} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: "70%" }]}>
            <View style={[styles.modalHeader, isRTL && { flexDirection: "row-reverse" }]}>
              <Text style={[styles.modalTitle, rtlTextAlign]}>{t("expiryDateFull")}</Text>
              <Pressable onPress={() => setShowDatePicker(false)}><Ionicons name="close" size={24} color={Colors.text} /></Pressable>
            </View>
            <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 8, marginBottom: 16 }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { marginTop: 0 }, rtlTextAlign]}>{t("year")}</Text>
                <ScrollView style={{ maxHeight: 150, backgroundColor: Colors.inputBg, borderRadius: 12, borderWidth: 1, borderColor: Colors.inputBorder }}>
                  {Array.from({ length: 6 }, (_, i) => new Date().getFullYear() + i).map((y) => (
                    <Pressable
                      key={y}
                      onPress={() => setPickerYear(y)}
                      style={{ paddingVertical: 10, paddingHorizontal: 12, backgroundColor: pickerYear === y ? Colors.accent + "30" : "transparent", borderRadius: 8 }}
                    >
                      <Text style={{ color: pickerYear === y ? Colors.accent : Colors.text, fontSize: 15, fontWeight: pickerYear === y ? "700" : "400", textAlign: "center" }}>{y}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { marginTop: 0 }, rtlTextAlign]}>{t("month")}</Text>
                <ScrollView style={{ maxHeight: 150, backgroundColor: Colors.inputBg, borderRadius: 12, borderWidth: 1, borderColor: Colors.inputBorder }}>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <Pressable
                      key={m}
                      onPress={() => setPickerMonth(m)}
                      style={{ paddingVertical: 10, paddingHorizontal: 12, backgroundColor: pickerMonth === m ? Colors.accent + "30" : "transparent", borderRadius: 8 }}
                    >
                      <Text style={{ color: pickerMonth === m ? Colors.accent : Colors.text, fontSize: 15, fontWeight: pickerMonth === m ? "700" : "400", textAlign: "center" }}>
                        {new Date(2000, m - 1).toLocaleString("default", { month: "short" })}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { marginTop: 0 }, rtlTextAlign]}>{t("day")}</Text>
                <ScrollView style={{ maxHeight: 150, backgroundColor: Colors.inputBg, borderRadius: 12, borderWidth: 1, borderColor: Colors.inputBorder }}>
                  {Array.from({ length: new Date(pickerYear, pickerMonth, 0).getDate() }, (_, i) => i + 1).map((d) => (
                    <Pressable
                      key={d}
                      onPress={() => setPickerDay(d)}
                      style={{ paddingVertical: 10, paddingHorizontal: 12, backgroundColor: pickerDay === d ? Colors.accent + "30" : "transparent", borderRadius: 8 }}
                    >
                      <Text style={{ color: pickerDay === d ? Colors.accent : Colors.text, fontSize: 15, fontWeight: pickerDay === d ? "700" : "400", textAlign: "center" }}>{d}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            </View>
            <Text style={{ color: Colors.textSecondary, fontSize: 14, textAlign: "center", marginBottom: 16 }}>
              {pickerYear}-{String(pickerMonth).padStart(2, "0")}-{String(pickerDay).padStart(2, "0")}
            </Text>
            <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 12 }}>
              <Pressable
                style={{ flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: Colors.surfaceLight, alignItems: "center" }}
                onPress={() => { setForm({ ...form, expiryDate: "" }); setShowDatePicker(false); }}
              >
                <Text style={{ color: Colors.danger, fontSize: 15, fontWeight: "600" }}>{t("cancel")}</Text>
              </Pressable>
              <Pressable
                style={{ flex: 1, borderRadius: 12, overflow: "hidden" }}
                onPress={() => {
                  const dateStr = `${pickerYear}-${String(pickerMonth).padStart(2, "0")}-${String(pickerDay).padStart(2, "0")}`;
                  setForm({ ...form, expiryDate: dateStr });
                  setShowDatePicker(false);
                }}
              >
                <LinearGradient colors={[Colors.accent, Colors.gradientMid]} style={{ paddingVertical: 12, alignItems: "center", borderRadius: 12 }}>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14 },
  headerTitle: { fontSize: 22, fontWeight: "800", color: Colors.white },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.15)", justifyContent: "center", alignItems: "center" },
  searchRow: { paddingHorizontal: 12, paddingVertical: 10 },
  searchBox: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.inputBg, borderRadius: 12, paddingHorizontal: 12, height: 42, borderWidth: 1, borderColor: Colors.inputBorder },
  searchInput: { flex: 1, color: Colors.text, marginLeft: 8, fontSize: 15 },
  list: { paddingHorizontal: 12 },
  productCard: { flexDirection: "row", alignItems: "center", backgroundColor: Colors.surface, borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: Colors.cardBorder },
  productIconWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.surfaceLight, justifyContent: "center", alignItems: "center", marginRight: 12, overflow: "hidden" as const },
  productInfo: { flex: 1 },
  productName: { color: Colors.text, fontSize: 15, fontWeight: "600" },
  productMeta: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  productRight: { alignItems: "flex-end", gap: 6 },
  productPrice: { color: Colors.accent, fontSize: 16, fontWeight: "800" },
  empty: { alignItems: "center", paddingVertical: 60 },
  emptyText: { color: Colors.textMuted, fontSize: 15, marginTop: 12 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", alignItems: "center" },
  modalContent: { backgroundColor: Colors.surface, borderRadius: 20, padding: 24, width: "90%", maxWidth: 460, maxHeight: "85%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { color: Colors.text, fontSize: 20, fontWeight: "700" },
  label: { color: Colors.textSecondary, fontSize: 12, fontWeight: "600", marginBottom: 6, marginTop: 12, textTransform: "uppercase" as const, letterSpacing: 0.5 },
  input: { backgroundColor: Colors.inputBg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: Colors.text, fontSize: 15, borderWidth: 1, borderColor: Colors.inputBorder },
  row: { flexDirection: "row", gap: 12 },
  half: { flex: 1 },
  catRow: { maxHeight: 40, marginBottom: 8 },
  catChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.surfaceLight, marginRight: 8 },
  catChipActive: { backgroundColor: Colors.accent },
  catChipText: { color: Colors.textSecondary, fontSize: 13, fontWeight: "600" },
  saveBtn: { borderRadius: 14, overflow: "hidden", marginTop: 20, marginBottom: 16 },
  saveBtnGradient: { paddingVertical: 14, alignItems: "center" },
  saveBtnText: { color: Colors.white, fontSize: 16, fontWeight: "700" },
});
