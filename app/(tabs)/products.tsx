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
import BarcodeScanner from "@/components/BarcodeScanner";

export default function ProductsScreen() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editProduct, setEditProduct] = useState<any>(null);
  const [form, setForm] = useState({ name: "", price: "", sku: "", barcode: "", categoryId: "", costPrice: "", unit: "piece", expiryDate: "" });
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [viewMode, setViewMode] = useState<"products" | "categories">("products");
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editCategory, setEditCategory] = useState<any>(null);
  const [catForm, setCatForm] = useState({ name: "", color: "#7C3AED", icon: "grid" });

  const { data: products = [] } = useQuery<any[]>({
    queryKey: ["/api/products", search ? `?search=${search}` : ""],
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

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest(editProduct ? "PUT" : "POST", editProduct ? `/api/products/${editProduct.id}` : "/api/products", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/products"] });
      setShowForm(false);
      setEditProduct(null);
      resetForm();
    },
    onError: (e: any) => Alert.alert("Error", e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/products/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/products"] }),
  });

  const createCategoryMutation = useMutation({
    mutationFn: (data: any) => apiRequest(editCategory ? "PUT" : "POST", editCategory ? `/api/categories/${editCategory.id}` : "/api/categories", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/categories"] });
      setShowCategoryForm(false);
      setEditCategory(null);
      setCatForm({ name: "", color: "#7C3AED", icon: "grid" });
    },
    onError: (e: any) => Alert.alert("Error", e.message),
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/categories/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/categories"] }),
  });

  const resetForm = () => setForm({ name: "", price: "", sku: "", barcode: "", categoryId: "", costPrice: "", unit: "piece", expiryDate: "" });

  const openEdit = (p: any) => {
    setEditProduct(p);
    setForm({
      name: p.name, price: String(p.price), sku: p.sku || "",
      barcode: p.barcode || "", categoryId: p.categoryId ? String(p.categoryId) : "",
      costPrice: p.costPrice ? String(p.costPrice) : "", unit: p.unit || "piece", expiryDate: p.expiryDate || "",
    });
    setShowForm(true);
  };

  const handleSave = () => {
    if (!form.name || !form.price) return Alert.alert("Error", "Name and price are required");
    createMutation.mutate({
      name: form.name, price: form.price, sku: form.sku || undefined,
      barcode: form.barcode || undefined, costPrice: form.costPrice || undefined,
      categoryId: form.categoryId ? Number(form.categoryId) : undefined, unit: form.unit, expiryDate: form.expiryDate || undefined,
    });
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
  const getCatName = (catId: number | null) => categories.find((c: any) => c.id === catId)?.name || "Uncategorized";

  return (
    <View style={[styles.container, { paddingTop: insets.top + topPad }]}>
      <LinearGradient colors={[Colors.gradientStart, Colors.gradientMid]} style={styles.header}>
        <Text style={styles.headerTitle}>Products</Text>
        <Pressable style={styles.addBtn} onPress={() => {
          if (viewMode === "products") {
            resetForm(); setEditProduct(null); setShowForm(true);
          } else {
            setCatForm({ name: "", color: "#7C3AED", icon: "grid" }); setEditCategory(null); setShowCategoryForm(true);
          }
        }}>
          <Ionicons name="add" size={24} color={Colors.white} />
        </Pressable>
      </LinearGradient>

      <View style={{ flexDirection: "row", paddingHorizontal: 12, paddingTop: 10, gap: 8 }}>
        <Pressable
          style={{ flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: viewMode === "products" ? Colors.accent : Colors.surface, alignItems: "center", borderWidth: 1, borderColor: viewMode === "products" ? Colors.accent : Colors.cardBorder }}
          onPress={() => setViewMode("products")}
        >
          <Text style={{ color: viewMode === "products" ? Colors.textDark : Colors.textSecondary, fontSize: 14, fontWeight: "600" }}>Products</Text>
        </Pressable>
        <Pressable
          style={{ flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: viewMode === "categories" ? Colors.accent : Colors.surface, alignItems: "center", borderWidth: 1, borderColor: viewMode === "categories" ? Colors.accent : Colors.cardBorder }}
          onPress={() => setViewMode("categories")}
        >
          <Text style={{ color: viewMode === "categories" ? Colors.textDark : Colors.textSecondary, fontSize: 14, fontWeight: "600" }}>Categories</Text>
        </Pressable>
      </View>

      {viewMode === "products" && (
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color={Colors.textMuted} />
            <TextInput style={styles.searchInput} placeholder="Search products..." placeholderTextColor={Colors.textMuted} value={search} onChangeText={setSearch} />
          </View>
        </View>
      )}

      {viewMode === "products" && (
        <FlatList
          data={products}
          keyExtractor={(item: any) => String(item.id)}
          contentContainerStyle={styles.list}
          scrollEnabled={!!products.length}
          renderItem={({ item }: { item: any }) => (
            <Pressable style={styles.productCard} onPress={() => openEdit(item)}>
              <View style={styles.productIconWrap}>
                <Ionicons name="cube" size={24} color={Colors.accent} />
              </View>
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{item.name}</Text>
                <Text style={styles.productMeta}>{item.sku || "No SKU"} | {getCatName(item.categoryId)}</Text>
                {(() => {
                  const stock = getStock(item.id);
                  return stock !== null ? (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: stock <= 0 ? Colors.danger : stock <= 10 ? Colors.warning : Colors.success }} />
                      <Text style={{ color: stock <= 0 ? Colors.danger : stock <= 10 ? Colors.warning : Colors.textMuted, fontSize: 11 }}>
                        {stock <= 0 ? "Out of stock" : `${stock} in stock`}
                      </Text>
                    </View>
                  ) : null;
                })()}
                {item.expiryDate && (
                  <Text style={{ color: isExpired(item.expiryDate) ? Colors.danger : isNearExpiry(item.expiryDate) ? Colors.warning : Colors.textMuted, fontSize: 10, marginTop: 2 }}>
                    {isExpired(item.expiryDate) ? "EXPIRED" : `Exp: ${new Date(item.expiryDate).toLocaleDateString()}`}
                  </Text>
                )}
              </View>
              <View style={styles.productRight}>
                <Text style={styles.productPrice}>${Number(item.price).toFixed(2)}</Text>
                <Pressable onPress={() => { Alert.alert("Delete", `Delete ${item.name}?`, [
                  { text: "Cancel" },
                  { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate(item.id) },
                ]); }}>
                  <Ionicons name="trash-outline" size={18} color={Colors.danger} />
                </Pressable>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="cube-outline" size={48} color={Colors.textMuted} /><Text style={styles.emptyText}>No products yet</Text></View>}
        />
      )}

      {viewMode === "categories" && (
        <FlatList
          data={categories}
          keyExtractor={(item: any) => String(item.id)}
          contentContainerStyle={styles.list}
          scrollEnabled={!!categories.length}
          renderItem={({ item }: { item: any }) => (
            <Pressable style={styles.productCard} onPress={() => {
              setEditCategory(item);
              setCatForm({ name: item.name, color: item.color || "#7C3AED", icon: item.icon || "grid" });
              setShowCategoryForm(true);
            }}>
              <View style={[styles.productIconWrap, { backgroundColor: (item.color || "#7C3AED") + "20" }]}>
                <Ionicons name={(item.icon || "grid") as any} size={24} color={item.color || "#7C3AED"} />
              </View>
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{item.name}</Text>
                <Text style={styles.productMeta}>
                  {products.filter((p: any) => p.categoryId === item.id).length} products
                </Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Pressable
                  onPress={() => {
                    Alert.alert("Delete Category", `Delete "${item.name}"?`, [
                      { text: "Cancel", style: "cancel" },
                      { text: "Delete", style: "destructive", onPress: () => deleteCategoryMutation.mutate(item.id) },
                    ]);
                  }}
                >
                  <Ionicons name="trash-outline" size={18} color={Colors.danger} />
                </Pressable>
                <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
              </View>
            </Pressable>
          )}
          ListEmptyComponent={<View style={styles.empty}><Ionicons name="grid-outline" size={48} color={Colors.textMuted} /><Text style={styles.emptyText}>No categories yet</Text></View>}
        />
      )}

      <Modal visible={showForm} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editProduct ? "Edit Product" : "New Product"}</Text>
              <Pressable onPress={() => setShowForm(false)}><Ionicons name="close" size={24} color={Colors.text} /></Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Name *</Text>
              <TextInput style={styles.input} value={form.name} onChangeText={(t) => setForm({ ...form, name: t })} placeholderTextColor={Colors.textMuted} placeholder="Product name" />
              <View style={styles.row}>
                <View style={styles.half}>
                  <Text style={styles.label}>Price *</Text>
                  <TextInput style={styles.input} value={form.price} onChangeText={(t) => setForm({ ...form, price: t })} keyboardType="decimal-pad" placeholderTextColor={Colors.textMuted} placeholder="0.00" />
                </View>
                <View style={styles.half}>
                  <Text style={styles.label}>Cost Price</Text>
                  <TextInput style={styles.input} value={form.costPrice} onChangeText={(t) => setForm({ ...form, costPrice: t })} keyboardType="decimal-pad" placeholderTextColor={Colors.textMuted} placeholder="0.00" />
                </View>
              </View>
              <View style={styles.row}>
                <View style={styles.half}>
                  <Text style={styles.label}>SKU</Text>
                  <TextInput style={styles.input} value={form.sku} onChangeText={(t) => setForm({ ...form, sku: t })} placeholderTextColor={Colors.textMuted} placeholder="SKU-001" />
                </View>
                <View style={styles.half}>
                  <Text style={styles.label}>Barcode</Text>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <TextInput style={[styles.input, { flex: 1 }]} value={form.barcode} onChangeText={(t) => setForm({ ...form, barcode: t })} placeholderTextColor={Colors.textMuted} placeholder="123456789" />
                    <Pressable style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: Colors.accent, justifyContent: "center", alignItems: "center" }} onPress={() => setShowBarcodeScanner(true)}>
                      <Ionicons name="barcode-outline" size={22} color={Colors.textDark} />
                    </Pressable>
                  </View>
                </View>
              </View>
              <Text style={styles.label}>Expiry Date</Text>
              <TextInput style={styles.input} value={form.expiryDate} onChangeText={(t) => setForm({ ...form, expiryDate: t })} placeholderTextColor={Colors.textMuted} placeholder="YYYY-MM-DD" />
              <Text style={styles.label}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catRow}>
                {categories.map((cat: any) => (
                  <Pressable key={cat.id} style={[styles.catChip, form.categoryId === String(cat.id) && styles.catChipActive]} onPress={() => setForm({ ...form, categoryId: String(cat.id) })}>
                    <Text style={[styles.catChipText, form.categoryId === String(cat.id) && { color: Colors.textDark }]}>{cat.name}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              <Pressable style={styles.saveBtn} onPress={handleSave}>
                <LinearGradient colors={[Colors.accent, Colors.gradientMid]} style={styles.saveBtnGradient}>
                  <Text style={styles.saveBtnText}>{editProduct ? "Update Product" : "Create Product"}</Text>
                </LinearGradient>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showCategoryForm} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editCategory ? "Edit Category" : "New Category"}</Text>
              <Pressable onPress={() => setShowCategoryForm(false)}><Ionicons name="close" size={24} color={Colors.text} /></Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Name *</Text>
              <TextInput style={styles.input} value={catForm.name} onChangeText={(t) => setCatForm({ ...catForm, name: t })} placeholderTextColor={Colors.textMuted} placeholder="Category name" />

              <Text style={styles.label}>Color</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
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

              <Text style={styles.label}>Icon</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
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

              <Pressable style={styles.saveBtn} onPress={() => {
                if (!catForm.name) return Alert.alert("Error", "Name is required");
                createCategoryMutation.mutate({ name: catForm.name, color: catForm.color, icon: catForm.icon });
              }}>
                <LinearGradient colors={[Colors.accent, Colors.gradientMid]} style={styles.saveBtnGradient}>
                  <Text style={styles.saveBtnText}>{editCategory ? "Update" : "Create"} Category</Text>
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
  productIconWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.surfaceLight, justifyContent: "center", alignItems: "center", marginRight: 12 },
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
