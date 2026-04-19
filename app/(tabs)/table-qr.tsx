import React, { useState, useCallback, useRef } from "react";
import {
  StyleSheet, Text, View, FlatList, Pressable, Platform,
  Modal, Alert, ScrollView, useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Colors } from "@/constants/colors";
import { useLicense } from "@/lib/license-context";
import { useLanguage } from "@/lib/language-context";
import { apiRequest, getQueryFn, getApiUrl } from "@/lib/query-client";
import { playClickSound } from "@/lib/sound";
import TabPageHeader from "@/components/tab-page-header";

// ── Print Template ──────────────────────────────────────────────────────────
function buildPrintHtml(qrCodes: any[], storeSlug: string, storeName: string, apiUrl: string) {
  const cards = qrCodes.map((qr) => {
    const qrUrl = `${apiUrl}/order/${storeSlug}?table=${qr.qrToken}`;
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(qrUrl)}&margin=8&format=svg`;
    return `
      <div class="qr-card">
        <div class="card-header">
          <div class="restaurant-name">${storeName}</div>
        </div>
        <div class="qr-wrapper">
          <img src="${qrImageUrl}" alt="QR ${qr.tableName}" class="qr-image" />
        </div>
        <div class="table-name">${qr.tableName}</div>
        <div class="scan-text">Scan to order from your table</div>
        <div class="scan-text-ar">امسح للطلب من طاولتك</div>
        <div class="divider"></div>
        <div class="footer-text">Powered by Barmagly POS</div>
      </div>
    `;
  }).join("");

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  @page { size: A4; margin: 10mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; background: #f5f5f5; }
  .print-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
    padding: 8px;
  }
  .qr-card {
    background: white;
    border-radius: 20px;
    padding: 24px 20px 18px;
    text-align: center;
    border: 2px solid #e0e0e0;
    page-break-inside: avoid;
    position: relative;
    overflow: hidden;
  }
  .qr-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 6px;
    background: linear-gradient(90deg, #1E40AF, #7C3AED, #2FD3C6);
  }
  .card-header { margin-bottom: 12px; margin-top: 4px; }
  .restaurant-name {
    font-size: 16px;
    font-weight: 800;
    color: #1a1a2e;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }
  .qr-wrapper {
    display: flex;
    justify-content: center;
    align-items: center;
    margin: 8px auto;
    width: 200px;
    height: 200px;
    border-radius: 16px;
    background: #f8f9ff;
    border: 2px solid #e8eaf6;
    padding: 12px;
  }
  .qr-image { width: 176px; height: 176px; }
  .table-name {
    font-size: 28px;
    font-weight: 900;
    color: #1E40AF;
    margin: 10px 0 4px;
    letter-spacing: 1px;
  }
  .scan-text {
    font-size: 12px;
    color: #555;
    font-weight: 600;
    margin-bottom: 2px;
  }
  .scan-text-ar {
    font-size: 12px;
    color: #888;
    font-weight: 500;
    direction: rtl;
    margin-bottom: 8px;
  }
  .divider {
    width: 60px;
    height: 2px;
    background: linear-gradient(90deg, #2FD3C6, #7C3AED);
    margin: 6px auto;
    border-radius: 1px;
  }
  .footer-text {
    font-size: 9px;
    color: #aaa;
    margin-top: 4px;
    font-weight: 500;
  }
  @media print {
    body { background: white; }
    .qr-card { border: 1.5px solid #ccc; box-shadow: none; }
  }
</style>
</head><body>
<div class="print-grid">${cards}</div>
<script>window.onload = function() { window.print(); }</script>
</body></html>`;
}

function buildSinglePrintHtml(qr: any, storeSlug: string, storeName: string, apiUrl: string) {
  const qrUrl = `${apiUrl}/order/${storeSlug}?table=${qr.qrToken}`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qrUrl)}&margin=10&format=svg`;

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  @page { size: 100mm 140mm; margin: 5mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', system-ui, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: white; }
  .card {
    text-align: center;
    padding: 20px;
    max-width: 360px;
  }
  .card::before {
    content: '';
    display: block;
    width: 80%;
    height: 4px;
    background: linear-gradient(90deg, #1E40AF, #7C3AED, #2FD3C6);
    border-radius: 2px;
    margin: 0 auto 16px;
  }
  .restaurant { font-size: 18px; font-weight: 800; color: #1a1a2e; text-transform: uppercase; letter-spacing: 1px; }
  .qr-box {
    margin: 16px auto;
    width: 240px; height: 240px;
    border-radius: 20px;
    background: #f8f9ff;
    border: 2px solid #e8eaf6;
    padding: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .qr-box img { width: 208px; height: 208px; }
  .table { font-size: 36px; font-weight: 900; color: #1E40AF; margin: 10px 0 6px; }
  .msg { font-size: 13px; color: #555; font-weight: 600; }
  .msg-ar { font-size: 13px; color: #888; direction: rtl; margin-top: 2px; }
  .footer { font-size: 9px; color: #bbb; margin-top: 12px; }
</style>
</head><body>
<div class="card">
  <div class="restaurant">${storeName}</div>
  <div class="qr-box"><img src="${qrImageUrl}" /></div>
  <div class="table">${qr.tableName}</div>
  <div class="msg">Scan to order from your table</div>
  <div class="msg-ar">امسح للطلب من طاولتك</div>
  <div class="footer">Powered by Barmagly POS</div>
</div>
<script>window.onload = function() { window.print(); }</script>
</body></html>`;
}

// ── Main Component ──────────────────────────────────────────────────────────
export default function TableQrScreen() {
  const { width } = useWindowDimensions();
  const { tenant } = useLicense();
  const { language } = useLanguage();
  const qc = useQueryClient();
  const tenantId = tenant?.id;
  const printFrameRef = useRef<HTMLIFrameElement | null>(null);

  const [selectedQr, setSelectedQr] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [generating, setGenerating] = useState(false);

  const lbl = (en: string, ar: string, de: string) =>
    language === "ar" ? ar : language === "de" ? de : en;

  // Fetch tables and QR codes
  const { data: allTables = [] } = useQuery<any[]>({
    queryKey: ["/api/tables"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!tenantId,
  });

  const { data: qrCodes = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/table-qr-codes", tenantId ? `?tenantId=${tenantId}` : ""],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!tenantId,
  });

  const { data: landingConfig } = useQuery<any>({
    queryKey: ["/api/landing-page-config", tenantId ? `?tenantId=${tenantId}` : ""],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!tenantId,
  });

  const storeSlug = landingConfig?.slug || "";
  const storeName = tenant?.businessName || "Restaurant";
  const apiUrl = getApiUrl();
  const baseUrl = apiUrl.replace(/\/api$/, "").replace(/:\d+$/, "");

  const tablesWithQr = allTables.map((table: any) => {
    const qr = qrCodes.find((q: any) => q.tableId === table.id);
    return { ...table, qrCode: qr || null };
  });

  const tablesWithoutQr = tablesWithQr.filter((t: any) => !t.qrCode);
  const tablesWithQrCode = tablesWithQr.filter((t: any) => t.qrCode);

  // Generate QR for single table
  const generateSingleQr = useCallback(async (table: any) => {
    try {
      playClickSound("medium");
      await apiRequest("POST", "/api/table-qr-codes", {
        tenantId, tableId: table.id, branchId: table.branchId, tableName: table.name,
      });
      qc.invalidateQueries({ queryKey: ["/api/table-qr-codes"] });
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  }, [tenantId, qc]);

  // Generate QR for all tables
  const generateAll = useCallback(async () => {
    try {
      setGenerating(true);
      playClickSound("medium");
      const result = await apiRequest("POST", "/api/table-qr-codes/generate-all", { tenantId });
      const data = await result.json();
      qc.invalidateQueries({ queryKey: ["/api/table-qr-codes"] });
      Alert.alert(
        lbl("Success", "تم", "Erfolg"),
        lbl(`Generated ${data.created} QR codes`, `تم إنشاء ${data.created} QR`, `${data.created} QR-Codes erstellt`)
      );
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setGenerating(false);
    }
  }, [tenantId, qc]);

  // Delete QR
  const deleteQr = useCallback(async (qrId: number) => {
    try {
      playClickSound("light");
      await apiRequest("DELETE", `/api/table-qr-codes/${qrId}`);
      qc.invalidateQueries({ queryKey: ["/api/table-qr-codes"] });
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  }, [qc]);

  // Toggle active
  const toggleActive = useCallback(async (qr: any) => {
    try {
      await apiRequest("PUT", `/api/table-qr-codes/${qr.id}`, { isActive: !qr.isActive });
      qc.invalidateQueries({ queryKey: ["/api/table-qr-codes"] });
    } catch (e: any) {
      Alert.alert("Error", e.message);
    }
  }, [qc]);

  // Print functions (web only)
  const printQr = useCallback((qr: any) => {
    if (Platform.OS !== "web") return;
    const html = buildSinglePrintHtml(qr, storeSlug, storeName, apiUrl);
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.top = "-9999px";
    iframe.style.left = "-9999px";
    iframe.style.width = "0";
    iframe.style.height = "0";
    document.body.appendChild(iframe);
    iframe.contentDocument?.open();
    iframe.contentDocument?.write(html);
    iframe.contentDocument?.close();
    setTimeout(() => document.body.removeChild(iframe), 10000);
  }, [storeSlug, storeName, apiUrl]);

  const printAll = useCallback(() => {
    if (Platform.OS !== "web") return;
    if (qrCodes.length === 0) return;
    const html = buildPrintHtml(qrCodes, storeSlug, storeName, apiUrl);
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.top = "-9999px";
    iframe.style.left = "-9999px";
    iframe.style.width = "0";
    iframe.style.height = "0";
    document.body.appendChild(iframe);
    iframe.contentDocument?.open();
    iframe.contentDocument?.write(html);
    iframe.contentDocument?.close();
    setTimeout(() => document.body.removeChild(iframe), 10000);
  }, [qrCodes, storeSlug, storeName, apiUrl]);

  const getQrUrl = (qr: any) => {
    const productionBase = "https://pos.barmagly.tech/api";
    return `${productionBase}/order/${storeSlug}?table=${qr.qrToken}`;
  };

  // ── Render QR Card ──────────────────────────────────────────────────────
  const renderQrCard = ({ item }: { item: any }) => {
    const qr = item.qrCode;
    if (!qr) return null;
    const qrUrl = getQrUrl(qr);
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUrl)}&margin=6&format=svg`;

    return (
      <View style={[styles.qrCard, !qr.isActive && styles.qrCardInactive]}>
        <View style={styles.qrCardHeader}>
          <View style={styles.tableNameBadge}>
            <Ionicons name="restaurant-outline" size={14} color="#fff" />
            <Text style={styles.tableNameText}>{item.name}</Text>
          </View>
          <View style={{ flexDirection: "row", gap: 6 }}>
            <Pressable
              onPress={() => toggleActive(qr)}
              style={[styles.iconBtn, { backgroundColor: qr.isActive ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)" }]}
            >
              <Ionicons name={qr.isActive ? "eye-outline" : "eye-off-outline"} size={16} color={qr.isActive ? Colors.success : Colors.danger} />
            </Pressable>
            <Pressable
              onPress={() => {
                Alert.alert(
                  lbl("Delete QR?", "حذف QR؟", "QR löschen?"),
                  lbl("This will permanently remove this QR code.", "سيتم حذف هذا الـ QR نهائياً.", "Dieser QR-Code wird dauerhaft entfernt."),
                  [
                    { text: lbl("Cancel", "إلغاء", "Abbrechen"), style: "cancel" },
                    { text: lbl("Delete", "حذف", "Löschen"), style: "destructive", onPress: () => deleteQr(qr.id) },
                  ]
                );
              }}
              style={[styles.iconBtn, { backgroundColor: "rgba(239,68,68,0.1)" }]}
            >
              <Ionicons name="trash-outline" size={16} color={Colors.danger} />
            </Pressable>
          </View>
        </View>

        {/* QR Code Image */}
        <View style={styles.qrImageContainer}>
          {Platform.OS === "web" ? (
            <img src={qrImageUrl} style={{ width: 160, height: 160 } as any} alt={`QR for ${item.name}`} />
          ) : (
            <Text style={styles.qrPlaceholder}>QR</Text>
          )}
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="scan-outline" size={12} color={Colors.textSecondary} />
            <Text style={styles.statText}>{qr.scannedCount || 0} {lbl("scans", "مسح", "Scans")}</Text>
          </View>
          {qr.lastScannedAt && (
            <View style={styles.statItem}>
              <Ionicons name="time-outline" size={12} color={Colors.textSecondary} />
              <Text style={styles.statText}>
                {new Date(qr.lastScannedAt).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actionRow}>
          <Pressable
            onPress={() => { setSelectedQr({ ...qr, url: qrUrl }); setShowPreview(true); }}
            style={[styles.actionBtn, { backgroundColor: "rgba(59,130,246,0.12)" }]}
          >
            <Ionicons name="eye-outline" size={14} color={Colors.info} />
            <Text style={[styles.actionBtnText, { color: Colors.info }]}>{lbl("Preview", "معاينة", "Vorschau")}</Text>
          </Pressable>
          <Pressable
            onPress={() => printQr(qr)}
            style={[styles.actionBtn, { backgroundColor: "rgba(47,211,198,0.12)" }]}
          >
            <Ionicons name="print-outline" size={14} color={Colors.accent} />
            <Text style={[styles.actionBtnText, { color: Colors.accent }]}>{lbl("Print", "طباعة", "Drucken")}</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  // ── Render Table without QR ──────────────────────────────────────────
  const renderTableWithoutQr = ({ item }: { item: any }) => (
    <View style={styles.noQrCard}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
        <View style={styles.tableIcon}>
          <Ionicons name="restaurant-outline" size={18} color={Colors.textMuted} />
        </View>
        <View>
          <Text style={styles.noQrTableName}>{item.name}</Text>
          <Text style={styles.noQrCapacity}>
            {lbl("Capacity", "السعة", "Kapazität")}: {item.capacity || "N/A"}
          </Text>
        </View>
      </View>
      <Pressable
        onPress={() => generateSingleQr(item)}
        style={styles.generateBtn}
      >
        <Ionicons name="qr-code-outline" size={16} color="#fff" />
        <Text style={styles.generateBtnText}>{lbl("Generate QR", "إنشاء QR", "QR erstellen")}</Text>
      </Pressable>
    </View>
  );

  const isWide = width > 768;
  const numColumns = isWide ? 3 : width > 500 ? 2 : 1;

  return (
    <View style={styles.container}>
      <TabPageHeader title={lbl("Table QR Codes", "QR الطاولات", "Tisch QR-Codes")}>
        {/* Action Buttons */}
        <View style={styles.headerActions}>
          {tablesWithoutQr.length > 0 && (
            <Pressable
              onPress={generateAll}
              disabled={generating}
              style={[styles.headerBtn, { backgroundColor: Colors.accent }]}
            >
              <Ionicons name="flash-outline" size={16} color="#fff" />
              <Text style={styles.headerBtnText}>
                {generating
                  ? lbl("Generating...", "جاري الإنشاء...", "Wird erstellt...")
                  : lbl(`Generate All (${tablesWithoutQr.length})`, `إنشاء الكل (${tablesWithoutQr.length})`, `Alle erstellen (${tablesWithoutQr.length})`)}
              </Text>
            </Pressable>
          )}
          {qrCodes.length > 0 && (
            <Pressable onPress={printAll} style={[styles.headerBtn, { backgroundColor: Colors.info }]}>
              <Ionicons name="print-outline" size={16} color="#fff" />
              <Text style={styles.headerBtnText}>{lbl("Print All", "طباعة الكل", "Alle drucken")}</Text>
            </Pressable>
          )}
        </View>

        {/* Summary */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>{allTables.length}</Text>
            <Text style={styles.summaryLabel}>{lbl("Tables", "طاولات", "Tische")}</Text>
          </View>
          <View style={[styles.summaryItem, { borderColor: Colors.success }]}>
            <Text style={[styles.summaryNumber, { color: Colors.success }]}>{qrCodes.filter((q: any) => q.isActive).length}</Text>
            <Text style={styles.summaryLabel}>{lbl("Active QR", "QR نشط", "Aktive QR")}</Text>
          </View>
          <View style={[styles.summaryItem, { borderColor: Colors.warning }]}>
            <Text style={[styles.summaryNumber, { color: Colors.warning }]}>{tablesWithoutQr.length}</Text>
            <Text style={styles.summaryLabel}>{lbl("No QR", "بدون QR", "Ohne QR")}</Text>
          </View>
          <View style={[styles.summaryItem, { borderColor: Colors.info }]}>
            <Text style={[styles.summaryNumber, { color: Colors.info }]}>
              {qrCodes.reduce((sum: number, q: any) => sum + (q.scannedCount || 0), 0)}
            </Text>
            <Text style={styles.summaryLabel}>{lbl("Total Scans", "إجمالي المسح", "Gesamt Scans")}</Text>
          </View>
        </View>
      </TabPageHeader>

      <ScrollView style={styles.scrollContent} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Tables without QR */}
        {tablesWithoutQr.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="warning-outline" size={16} color={Colors.warning} />{" "}
              {lbl("Tables Without QR Code", "طاولات بدون QR", "Tische ohne QR-Code")}
            </Text>
            <FlatList
              data={tablesWithoutQr}
              keyExtractor={(item: any) => `no-qr-${item.id}`}
              renderItem={renderTableWithoutQr}
              scrollEnabled={false}
            />
          </View>
        )}

        {/* Tables with QR */}
        {tablesWithQrCode.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="qr-code-outline" size={16} color={Colors.accent} />{" "}
              {lbl("Active QR Codes", "رموز QR النشطة", "Aktive QR-Codes")}
            </Text>
            <FlatList
              data={tablesWithQrCode}
              keyExtractor={(item: any) => `qr-${item.id}`}
              renderItem={renderQrCard}
              numColumns={numColumns}
              key={`grid-${numColumns}`}
              columnWrapperStyle={numColumns > 1 ? { gap: 12 } : undefined}
              scrollEnabled={false}
              contentContainerStyle={{ gap: 12 }}
            />
          </View>
        )}

        {/* Empty State */}
        {allTables.length === 0 && !isLoading && (
          <View style={styles.emptyState}>
            <Ionicons name="restaurant-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>{lbl("No Tables Found", "لا توجد طاولات", "Keine Tische gefunden")}</Text>
            <Text style={styles.emptyText}>
              {lbl(
                "Go to Settings > Tables to add restaurant tables first.",
                "اذهب إلى الإعدادات > الطاولات لإضافة الطاولات أولاً.",
                "Gehen Sie zu Einstellungen > Tische, um zuerst Tische hinzuzufügen."
              )}
            </Text>
          </View>
        )}

        {!storeSlug && allTables.length > 0 && (
          <View style={[styles.emptyState, { backgroundColor: "rgba(245,158,11,0.08)", borderColor: Colors.warning }]}>
            <Ionicons name="alert-circle-outline" size={36} color={Colors.warning} />
            <Text style={[styles.emptyTitle, { color: Colors.warning }]}>
              {lbl("Store Not Configured", "المتجر غير مُعد", "Shop nicht konfiguriert")}
            </Text>
            <Text style={styles.emptyText}>
              {lbl(
                "Set up your online store (Landing Page) in Settings first to enable QR ordering.",
                "قم بإعداد المتجر الإلكتروني (صفحة الهبوط) في الإعدادات أولاً لتفعيل الطلب بـ QR.",
                "Richten Sie zuerst Ihren Online-Shop (Landing Page) in den Einstellungen ein."
              )}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* ── Preview Modal ─────────────────────────────────────────────── */}
      <Modal visible={showPreview} animationType="fade" transparent onRequestClose={() => setShowPreview(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{lbl("QR Preview", "معاينة QR", "QR Vorschau")}</Text>
              <Pressable onPress={() => setShowPreview(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={22} color={Colors.text} />
              </Pressable>
            </View>

            {selectedQr && (
              <ScrollView contentContainerStyle={{ alignItems: "center", padding: 20 }}>
                {/* Large preview card */}
                <View style={styles.previewCard}>
                  <LinearGradient
                    colors={["#1E40AF", "#7C3AED", "#2FD3C6"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.previewGradient}
                  />
                  <Text style={styles.previewStoreName}>{storeName}</Text>

                  <View style={styles.previewQrBox}>
                    {Platform.OS === "web" ? (
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(selectedQr.url)}&margin=10&format=svg`}
                        style={{ width: 220, height: 220 } as any}
                        alt="QR Preview"
                      />
                    ) : (
                      <Text style={{ fontSize: 60 }}>QR</Text>
                    )}
                  </View>

                  <Text style={styles.previewTableName}>{selectedQr.tableName}</Text>
                  <Text style={styles.previewScanText}>{lbl("Scan to order", "امسح للطلب", "Scannen zum Bestellen")}</Text>
                </View>

                {/* URL info */}
                <View style={styles.urlBox}>
                  <Text style={styles.urlLabel}>{lbl("QR URL:", "رابط QR:", "QR-URL:")}</Text>
                  <Text style={styles.urlText} selectable>{selectedQr.url}</Text>
                </View>

                {/* Print button */}
                <Pressable
                  onPress={() => { printQr(selectedQr); setShowPreview(false); }}
                  style={styles.printPreviewBtn}
                >
                  <Ionicons name="print-outline" size={20} color="#fff" />
                  <Text style={styles.printPreviewBtnText}>{lbl("Print This QR", "طباعة هذا QR", "Diesen QR drucken")}</Text>
                </Pressable>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { flex: 1, paddingHorizontal: 16 },

  headerActions: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginBottom: 10 },
  headerBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 10,
  },
  headerBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },

  summaryRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  summaryItem: {
    flex: 1, minWidth: 80,
    backgroundColor: Colors.card, borderRadius: 12,
    padding: 10, alignItems: "center",
    borderWidth: 1, borderColor: Colors.cardBorder,
  },
  summaryNumber: { fontSize: 22, fontWeight: "900", color: Colors.text },
  summaryLabel: { fontSize: 10, color: Colors.textSecondary, fontWeight: "600", marginTop: 2 },

  section: { marginTop: 16 },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: Colors.text, marginBottom: 10 },

  // QR Card
  qrCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  qrCardInactive: { opacity: 0.5 },
  qrCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  tableNameBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(30,64,175,0.2)", paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 8,
  },
  tableNameText: { color: "#93B4FF", fontSize: 14, fontWeight: "800" },
  iconBtn: {
    width: 32, height: 32, borderRadius: 8,
    alignItems: "center", justifyContent: "center",
  },
  qrImageContainer: {
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 12,
    padding: 10, marginBottom: 8,
  },
  qrPlaceholder: { fontSize: 40, color: Colors.textMuted },

  statsRow: { flexDirection: "row", gap: 12, marginBottom: 8, justifyContent: "center" },
  statItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  statText: { fontSize: 11, color: Colors.textSecondary, fontWeight: "600" },

  actionRow: { flexDirection: "row", gap: 8 },
  actionBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 4, paddingVertical: 8, borderRadius: 8,
  },
  actionBtnText: { fontSize: 12, fontWeight: "700" },

  // No QR card
  noQrCard: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: Colors.card, borderRadius: 12,
    padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: Colors.cardBorder,
  },
  tableIcon: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center", justifyContent: "center",
  },
  noQrTableName: { color: Colors.text, fontSize: 14, fontWeight: "700" },
  noQrCapacity: { color: Colors.textMuted, fontSize: 11, fontWeight: "500" },
  generateBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: Colors.accent, paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 8,
  },
  generateBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },

  // Empty
  emptyState: {
    alignItems: "center", justifyContent: "center",
    padding: 40, marginTop: 40,
    backgroundColor: Colors.card, borderRadius: 20,
    borderWidth: 1, borderColor: Colors.cardBorder,
  },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: Colors.text, marginTop: 12 },
  emptyText: { fontSize: 13, color: Colors.textSecondary, textAlign: "center", marginTop: 6, maxWidth: 300 },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center", alignItems: "center",
  },
  modalContent: {
    width: "90%", maxWidth: 500, maxHeight: "85%",
    backgroundColor: Colors.surface, borderRadius: 20,
    borderWidth: 1, borderColor: Colors.cardBorder,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.cardBorder,
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: Colors.text },
  modalCloseBtn: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
    backgroundColor: Colors.card,
  },

  // Preview card
  previewCard: {
    backgroundColor: "#fff", borderRadius: 20, padding: 24,
    alignItems: "center", width: "100%", maxWidth: 320,
    overflow: "hidden",
    ...(Platform.OS === "web"
      ? { boxShadow: "0 4px 24px rgba(0,0,0,0.15)" }
      : { elevation: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 }),
  },
  previewGradient: {
    position: "absolute", top: 0, left: 0, right: 0, height: 6,
  },
  previewStoreName: {
    fontSize: 16, fontWeight: "800", color: "#1a1a2e",
    textTransform: "uppercase", letterSpacing: 1, marginTop: 4,
  },
  previewQrBox: {
    width: 240, height: 240, borderRadius: 16,
    backgroundColor: "#f8f9ff", borderWidth: 2, borderColor: "#e8eaf6",
    alignItems: "center", justifyContent: "center",
    marginVertical: 14, padding: 10,
  },
  previewTableName: {
    fontSize: 32, fontWeight: "900", color: "#1E40AF", marginBottom: 4,
  },
  previewScanText: { fontSize: 13, color: "#666", fontWeight: "600" },

  urlBox: {
    marginTop: 16, width: "100%",
    backgroundColor: Colors.card, borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: Colors.cardBorder,
  },
  urlLabel: { fontSize: 11, color: Colors.textSecondary, fontWeight: "700", marginBottom: 4 },
  urlText: { fontSize: 11, color: Colors.accent, fontWeight: "500" },

  printPreviewBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: Colors.accent, paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: 12, marginTop: 16,
  },
  printPreviewBtnText: { color: "#fff", fontSize: 14, fontWeight: "800" },
});
