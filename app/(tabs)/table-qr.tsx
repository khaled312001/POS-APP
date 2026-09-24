import React, { useState, useCallback, useMemo } from "react";
import {
  Text, View, Pressable, Platform, Modal, Alert, ScrollView, TextInput,
  ActivityIndicator, useWindowDimensions, KeyboardAvoidingView, Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Clipboard from "expo-clipboard";
import * as Print from "expo-print";
import Svg, { Path as SvgPath, Rect as SvgRect } from "react-native-svg";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Colors } from "@/constants/colors";
import { themedStyles } from "@/lib/themed-styles";
import { useLicense } from "@/lib/license-context";
import { useLanguage } from "@/lib/language-context";
import { apiRequest, getQueryFn, apiErrorMessage } from "@/lib/query-client";
import { playClickSound } from "@/lib/sound";
import { getChromeMetrics } from "@/lib/responsive";
import TabPageHeader from "@/components/tab-page-header";

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Origin customers reach the store on. The production web app runs on it;
 * local dev and native builds fall back to the public site so a printed QR
 * never encodes localhost.
 */
function publicOrigin(): string {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host && host !== "localhost" && host !== "127.0.0.1" && !host.endsWith(".replit.dev")) {
      return window.location.origin;
    }
  }
  return "https://kassenta.com";
}

/** The dine-in ordering link a table QR encodes (/order/<slug>?table=<token>). */
function tableOrderUrl(storeSlug: string, qrToken: string): string {
  return `${publicOrigin()}/order/${encodeURIComponent(storeSlug)}?table=${encodeURIComponent(qrToken)}`;
}

const QR_QUIET_ZONE = 2;

/** One horizontal stroke per run of dark modules (same walk as the qrcode package's SVG renderer). */
function qrModulesToPath(data: Uint8Array, size: number, margin: number): string {
  let path = "";
  let moveBy = 0;
  let newRow = false;
  let lineLength = 0;
  for (let i = 0; i < data.length; i++) {
    const col = i % size;
    const row = Math.floor(i / size);
    if (!col && !newRow) newRow = true;
    if (data[i]) {
      lineLength++;
      if (!(i > 0 && col > 0 && data[i - 1])) {
        path += newRow ? `M${col + margin} ${0.5 + row + margin}` : `m${moveBy} 0`;
        moveBy = 0;
        newRow = false;
      }
      if (!(col + 1 < size && data[i + 1])) {
        path += `h${lineLength}`;
        lineLength = 0;
      }
    } else {
      moveBy++;
    }
  }
  return path;
}

/**
 * QR generated on the device (pure JS, works on web and Android/iOS) instead
 * of a third-party image service: no network needed and the table token never
 * leaves the app.
 */
function buildQr(value: string): { d: string; span: number } | null {
  try {
    const QRCode = require("qrcode");
    const { modules } = QRCode.create(value, { errorCorrectionLevel: "M" });
    return { d: qrModulesToPath(modules.data, modules.size, QR_QUIET_ZONE), span: modules.size + QR_QUIET_ZONE * 2 };
  } catch {
    return null;
  }
}

function qrSvgMarkup(value: string, px: number): string {
  const qr = buildQr(value);
  if (!qr) return "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 ${qr.span} ${qr.span}" shape-rendering="crispEdges"><rect width="${qr.span}" height="${qr.span}" fill="#ffffff"/><path d="${qr.d}" stroke="#000000" stroke-width="1" fill="none"/></svg>`;
}

function QrImage({ value, size }: { value: string; size: number }) {
  const qr = useMemo(() => buildQr(value), [value]);
  if (!qr) {
    return (
      <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
        <Ionicons name="qr-code-outline" size={size * 0.5} color="#999999" />
      </View>
    );
  }
  // Always black on white: a themed QR is a QR that will not scan.
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${qr.span} ${qr.span}`}>
      <SvgRect x={0} y={0} width={qr.span} height={qr.span} fill="#FFFFFF" />
      <SvgPath d={qr.d} stroke="#000000" strokeWidth={1} fill="none" />
    </Svg>
  );
}

function escapeHtml(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function notify(title: string, message?: string) {
  if (Platform.OS === "web") {
    try { window.alert(message ? `${title}\n\n${message}` : title); } catch { }
    return;
  }
  Alert.alert(title, message);
}

/** Alert.alert with buttons is a no-op on react-native-web, so web uses window.confirm. */
function confirmAsync(title: string, message: string, confirmText: string, cancelText: string): Promise<boolean> {
  if (Platform.OS === "web") {
    try { return Promise.resolve(window.confirm(`${title}\n\n${message}`)); } catch { return Promise.resolve(false); }
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: cancelText, style: "cancel", onPress: () => resolve(false) },
      { text: confirmText, style: "destructive", onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) });
  });
}

type PrintTexts = { scan: string; scanAlt: string; dir: "ltr" | "rtl" };

function cardHtml(qr: { tableName: string; url: string }, storeName: string, t: PrintTexts, px: number) {
  return `
    <div class="qr-card">
      <div class="restaurant-name">${escapeHtml(storeName)}</div>
      <div class="qr-wrapper">${qrSvgMarkup(qr.url, px)}</div>
      <div class="table-name">${escapeHtml(qr.tableName)}</div>
      <div class="scan-text" dir="${t.dir}">${escapeHtml(t.scan)}</div>
      ${t.scanAlt ? `<div class="scan-text-alt">${escapeHtml(t.scanAlt)}</div>` : ""}
      <div class="divider"></div>
      <div class="footer-text">Powered by Kassenta POS</div>
    </div>`;
}

const PRINT_CSS = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', system-ui, -apple-system, 'Noto Sans Arabic', Tahoma, sans-serif; background: #ffffff; color: #1a1a2e; }
  .print-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; padding: 8px; }
  .qr-card { background: #fff; border-radius: 20px; padding: 24px 20px 18px; text-align: center; border: 2px solid #e0e0e0; page-break-inside: avoid; break-inside: avoid; position: relative; overflow: hidden; }
  .qr-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 6px; background: linear-gradient(90deg, #1E40AF, #7C3AED, #2FD3C6); }
  .restaurant-name { font-size: 16px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase; margin: 4px 0 12px; }
  .qr-wrapper { display: flex; justify-content: center; align-items: center; margin: 8px auto; padding: 10px; border-radius: 16px; background: #fff; border: 2px solid #e8eaf6; width: fit-content; }
  .qr-wrapper svg { display: block; }
  .table-name { font-size: 28px; font-weight: 900; color: #1E40AF; margin: 10px 0 4px; letter-spacing: 1px; }
  .scan-text { font-size: 13px; color: #444; font-weight: 700; margin-bottom: 2px; }
  .scan-text-alt { font-size: 11px; color: #888; font-weight: 500; margin-bottom: 6px; }
  .divider { width: 60px; height: 2px; background: linear-gradient(90deg, #2FD3C6, #7C3AED); margin: 6px auto; border-radius: 1px; }
  .footer-text { font-size: 9px; color: #aaa; margin-top: 4px; }
  .single { display: flex; justify-content: center; align-items: center; min-height: 100vh; }
  .single .qr-card { border: none; max-width: 360px; }
  .single .table-name { font-size: 36px; }
  @media print { .qr-card { border-color: #ccc; } }
`;

function buildPrintHtml(qrs: { tableName: string; url: string }[], storeName: string, t: PrintTexts): string {
  const cards = qrs.map((qr) => cardHtml(qr, storeName, t, 176)).join("");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(storeName)} — QR</title>
<style>@page { size: A4; margin: 10mm; } ${PRINT_CSS}</style></head>
<body><div class="print-grid">${cards}</div></body></html>`;
}

function buildSinglePrintHtml(qr: { tableName: string; url: string }, storeName: string, t: PrintTexts): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(qr.tableName)} — QR</title>
<style>@page { size: 100mm 140mm; margin: 5mm; } ${PRINT_CSS}</style></head>
<body><div class="single">${cardHtml(qr, storeName, t, 208)}</div></body></html>`;
}

/** Web: hidden iframe + print(); native: the OS print / Save-as-PDF sheet. */
async function printHtml(html: string): Promise<void> {
  if (Platform.OS !== "web") {
    await Print.printAsync({ html });
    return;
  }
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  Object.assign(iframe.style, { position: "fixed", right: "0", bottom: "0", width: "0", height: "0", border: "0" });
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!doc || !win) { iframe.remove(); throw new Error("print frame unavailable"); }
  doc.open();
  doc.write(html);
  doc.close();
  const cleanup = () => { try { iframe.remove(); } catch { } };
  win.onafterprint = () => setTimeout(cleanup, 500);
  // Inline SVG needs no network, a short tick lets layout settle.
  setTimeout(() => {
    try { win.focus(); win.print(); } catch { cleanup(); }
    setTimeout(cleanup, 60000); // safety net if afterprint never fires
  }, 250);
}

// ── Main Component ──────────────────────────────────────────────────────────
export default function TableQrScreen() {
  const { width } = useWindowDimensions();
  const { tenant } = useLicense();
  const { language } = useLanguage();
  const qc = useQueryClient();
  const tenantId = tenant?.id;
  const isRTL = language === "ar";
  // document dir=rtl already mirrors "row" on web — only native needs the flip.
  const flipRow = isRTL && Platform.OS !== "web";
  const { topPad } = getChromeMetrics(width);

  const tr = (en: string, de: string, ar: string) => (language === "ar" ? ar : language === "de" ? de : en);

  const [selectedQr, setSelectedQr] = useState<any>(null);
  const [generating, setGenerating] = useState(false);
  const [busyQrIds, setBusyQrIds] = useState<Set<number>>(new Set());
  const [busyTableIds, setBusyTableIds] = useState<Set<number>>(new Set());
  const [containerW, setContainerW] = useState(0);
  const [copied, setCopied] = useState(false);

  // Add-table form
  const [showAddTable, setShowAddTable] = useState(false);
  const [newTableName, setNewTableName] = useState("");
  const [newTableCapacity, setNewTableCapacity] = useState("4");
  const [newTableBranchId, setNewTableBranchId] = useState<number | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [addingTable, setAddingTable] = useState(false);

  // ── Data ──────────────────────────────────────────────────────────────
  // Tables have no tenant column, only a branch — so they are read per branch
  // of this tenant (GET /api/tables without branchId returns every store's).
  const branchesKey = `/api/branches?tenantId=${tenantId}`;
  const { data: branches = [], isLoading: branchesLoading, isError: branchesError, refetch: refetchBranches } = useQuery<any[]>({
    queryKey: [branchesKey],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!tenantId,
  });
  const branchIds = useMemo(() => (branches as any[]).map((b) => Number(b.id)).filter(Boolean).sort((a, b) => a - b), [branches]);

  const tablesKey = ["table-qr/tables", tenantId, branchIds.join(",")];
  const { data: allTables = [], isLoading: tablesLoading, isError: tablesError, refetch: refetchTables } = useQuery<any[]>({
    queryKey: tablesKey,
    queryFn: async () => {
      const lists = await Promise.all(branchIds.map(async (bid) => {
        const res = await apiRequest("GET", `/api/tables?branchId=${bid}`);
        const rows = await res.json();
        return Array.isArray(rows) ? rows : [];
      }));
      return lists.flat().sort((a: any, b: any) =>
        String(a.name).localeCompare(String(b.name), undefined, { numeric: true, sensitivity: "base" }));
    },
    enabled: !!tenantId && branchIds.length > 0,
  });

  const { data: qrCodes = [], isLoading: qrLoading, isError: qrError, refetch: refetchQr } = useQuery<any[]>({
    queryKey: ["/api/table-qr-codes", tenantId ? `?tenantId=${tenantId}` : ""],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!tenantId,
  });

  const { data: landingConfig, isLoading: landingLoading } = useQuery<any>({
    queryKey: ["/api/landing-page-config", tenantId ? `?tenantId=${tenantId}` : ""],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!tenantId,
  });

  const storeSlug: string = landingConfig?.slug || "";
  const storeName: string = landingConfig?.storeName || tenant?.name || tr("Restaurant", "Restaurant", "مطعم");
  const printTexts: PrintTexts = {
    scan: tr("Scan to order from your table", "Scannen und direkt am Tisch bestellen", "امسح الرمز للطلب من طاولتك"),
    scanAlt: language === "en" ? "" : "Scan to order from your table",
    dir: isRTL ? "rtl" : "ltr",
  };

  const tableById = useMemo(() => {
    const m = new Map<number, any>();
    (allTables as any[]).forEach((t) => m.set(Number(t.id), t));
    return m;
  }, [allTables]);

  const qrList = useMemo(() => (qrCodes as any[]).map((qr) => ({
    ...qr,
    table: tableById.get(Number(qr.tableId)) || null,
    url: storeSlug ? tableOrderUrl(storeSlug, qr.qrToken) : "",
  })), [qrCodes, tableById, storeSlug]);

  const qrTableIds = useMemo(() => new Set((qrCodes as any[]).map((q) => Number(q.tableId))), [qrCodes]);
  const tablesWithoutQr = (allTables as any[]).filter((t) => !qrTableIds.has(Number(t.id)));
  const activeQrCount = (qrCodes as any[]).filter((q) => q.isActive).length;
  const totalScans = (qrCodes as any[]).reduce((sum: number, q: any) => sum + (Number(q.scannedCount) || 0), 0);

  const loading = !!tenantId && (branchesLoading || qrLoading || (branchIds.length > 0 && tablesLoading));
  const loadFailed = branchesError || tablesError || qrError;

  const invalidateQr = () => qc.invalidateQueries({ queryKey: ["/api/table-qr-codes"] });
  const markBusy = (setter: React.Dispatch<React.SetStateAction<Set<number>>>, id: number, on: boolean) =>
    setter((prev) => { const next = new Set(prev); if (on) next.add(id); else next.delete(id); return next; });

  // ── Actions ─────────────────────────────────────────────────────────────
  const createQrFor = async (table: any) => {
    await apiRequest("POST", "/api/table-qr-codes", {
      tenantId, tableId: table.id, branchId: table.branchId ?? null, tableName: table.name,
    });
  };

  const generateSingleQr = async (table: any) => {
    if (busyTableIds.has(table.id)) return;
    playClickSound("medium");
    markBusy(setBusyTableIds, table.id, true);
    try {
      await createQrFor(table);
      await invalidateQr();
    } catch (e) {
      notify(tr("Could not create QR code", "QR-Code konnte nicht erstellt werden", "تعذّر إنشاء رمز QR"), apiErrorMessage(e));
    } finally {
      markBusy(setBusyTableIds, table.id, false);
    }
  };

  // One request per table of THIS store. (POST /api/table-qr-codes/generate-all
  // without a branchId walks every store's tables, so it is not used here.)
  const generateAll = async () => {
    if (generating || tablesWithoutQr.length === 0) return;
    playClickSound("medium");
    setGenerating(true);
    let ok = 0;
    let failed = 0;
    for (const table of tablesWithoutQr) {
      try { await createQrFor(table); ok++; } catch { failed++; }
    }
    await invalidateQr();
    setGenerating(false);
    if (failed > 0) {
      notify(
        tr("Some QR codes failed", "Einige QR-Codes sind fehlgeschlagen", "فشل إنشاء بعض رموز QR"),
        tr(`${ok} created, ${failed} failed. Please try again.`, `${ok} erstellt, ${failed} fehlgeschlagen. Bitte erneut versuchen.`, `تم إنشاء ${ok}، وفشل ${failed}. حاول مرة أخرى.`),
      );
    }
  };

  const deleteQr = async (qr: any) => {
    const ok = await confirmAsync(
      tr("Delete QR code?", "QR-Code löschen?", "حذف رمز QR؟"),
      tr(
        `The printed code for ${qr.tableName} will stop working. You can generate a new one afterwards.`,
        `Der gedruckte Code für ${qr.tableName} funktioniert danach nicht mehr. Sie können anschließend einen neuen erstellen.`,
        `سيتوقف الرمز المطبوع للطاولة ${qr.tableName} عن العمل. يمكنك إنشاء رمز جديد بعد ذلك.`,
      ),
      tr("Delete", "Löschen", "حذف"),
      tr("Cancel", "Abbrechen", "إلغاء"),
    );
    if (!ok) return;
    markBusy(setBusyQrIds, qr.id, true);
    try {
      await apiRequest("DELETE", `/api/table-qr-codes/${qr.id}`);
      await invalidateQr();
    } catch (e) {
      notify(tr("Could not delete", "Löschen fehlgeschlagen", "تعذّر الحذف"), apiErrorMessage(e));
    } finally {
      markBusy(setBusyQrIds, qr.id, false);
    }
  };

  const toggleActive = async (qr: any) => {
    if (busyQrIds.has(qr.id)) return;
    markBusy(setBusyQrIds, qr.id, true);
    try {
      await apiRequest("PUT", `/api/table-qr-codes/${qr.id}`, { isActive: !qr.isActive });
      await invalidateQr();
    } catch (e) {
      notify(tr("Could not update", "Aktualisierung fehlgeschlagen", "تعذّر التحديث"), apiErrorMessage(e));
    } finally {
      markBusy(setBusyQrIds, qr.id, false);
    }
  };

  const runPrint = async (html: string) => {
    try {
      await printHtml(html);
    } catch (e: any) {
      notify(tr("Printing failed", "Drucken fehlgeschlagen", "فشلت الطباعة"), e?.message || "");
    }
  };

  const printQr = (qr: any) => {
    if (!storeSlug || !qr?.url) return;
    runPrint(buildSinglePrintHtml({ tableName: qr.tableName, url: qr.url }, storeName, printTexts));
  };

  const printAll = () => {
    if (!storeSlug) return;
    const printable = qrList.filter((q) => q.isActive && q.url);
    if (printable.length === 0) {
      notify(tr("Nothing to print", "Nichts zu drucken", "لا يوجد ما يُطبع"), tr("There are no active QR codes.", "Es gibt keine aktiven QR-Codes.", "لا توجد رموز QR نشطة."));
      return;
    }
    runPrint(buildPrintHtml(printable.map((q) => ({ tableName: q.tableName, url: q.url })), storeName, printTexts));
  };

  const copyLink = async (url: string) => {
    try {
      await Clipboard.setStringAsync(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      if (Platform.OS === "web") { try { window.prompt(tr("Copy the link:", "Link kopieren:", "انسخ الرابط:"), url); } catch { } }
    }
  };

  const openAddTable = () => {
    playClickSound("light");
    const mainBranch = (branches as any[]).find((b) => b.isMain) || (branches as any[])[0];
    setNewTableBranchId(mainBranch ? Number(mainBranch.id) : null);
    const nextNo = (allTables as any[]).length + 1;
    setNewTableName(tr(`Table ${nextNo}`, `Tisch ${nextNo}`, `طاولة ${nextNo}`));
    setNewTableCapacity("4");
    setAddError(null);
    setShowAddTable(true);
  };

  const saveNewTable = async () => {
    if (addingTable) return;
    const name = newTableName.trim();
    const capacity = Number(newTableCapacity);
    if (!name) { setAddError(tr("Enter a table name.", "Bitte einen Tischnamen eingeben.", "أدخل اسم الطاولة.")); return; }
    if ((allTables as any[]).some((t) => String(t.name).trim().toLowerCase() === name.toLowerCase())) {
      setAddError(tr("A table with this name already exists.", "Ein Tisch mit diesem Namen existiert bereits.", "توجد طاولة بهذا الاسم مسبقاً."));
      return;
    }
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 100) {
      setAddError(tr("Seats must be a whole number between 1 and 100.", "Plätze: ganze Zahl zwischen 1 und 100.", "عدد المقاعد يجب أن يكون رقماً صحيحاً بين 1 و100."));
      return;
    }
    if (!newTableBranchId) {
      setAddError(tr("Create a branch in Settings first.", "Bitte zuerst eine Filiale in den Einstellungen anlegen.", "أنشئ فرعاً من الإعدادات أولاً."));
      return;
    }
    setAddingTable(true);
    setAddError(null);
    try {
      const res = await apiRequest("POST", "/api/tables", { branchId: newTableBranchId, name, capacity, status: "available" });
      const table = await res.json();
      // A new table on this screen is only useful with its code — create it now.
      if (table?.id) {
        try { await createQrFor(table); } catch { /* shown as "without QR" — can retry from the list */ }
      }
      await Promise.all([qc.invalidateQueries({ queryKey: ["table-qr/tables"] }), invalidateQr()]);
      setShowAddTable(false);
    } catch (e) {
      setAddError(apiErrorMessage(e, tr("Could not add the table", "Tisch konnte nicht hinzugefügt werden", "تعذّر إضافة الطاولة")));
    } finally {
      setAddingTable(false);
    }
  };

  const retryAll = () => {
    refetchBranches();
    refetchQr();
    if (branchIds.length > 0) refetchTables();
  };

  // ── Layout ──────────────────────────────────────────────────────────────
  const GAP = 12;
  const numColumns = containerW > 900 ? 3 : containerW > 540 ? 2 : 1;
  const cardWidth = containerW > 0 ? Math.floor((containerW - GAP * (numColumns - 1)) / numColumns) : undefined;
  const canPrint = !!storeSlug;

  const renderQrCard = (qr: any) => {
    const busy = busyQrIds.has(qr.id);
    return (
      <View key={`qr-${qr.id}`} style={[styles.qrCard, cardWidth ? { width: cardWidth } : { flexGrow: 1 }, !qr.isActive && styles.qrCardInactive]}>
        <View style={[styles.qrCardHeader, flipRow && { flexDirection: "row-reverse" }]}>
          <View style={[styles.tableNameBadge, flipRow && { flexDirection: "row-reverse" }]}>
            <Ionicons name="restaurant-outline" size={14} color={Colors.info} />
            <Text style={styles.tableNameText} numberOfLines={1}>{qr.tableName}</Text>
          </View>
          <View style={[styles.cardIconRow, flipRow && { flexDirection: "row-reverse" }]}>
            {busy ? <ActivityIndicator size="small" color={Colors.accent} style={{ marginHorizontal: 8 }} /> : null}
            <Pressable
              onPress={() => toggleActive(qr)}
              disabled={busy}
              accessibilityRole="switch"
              accessibilityState={{ checked: !!qr.isActive, disabled: busy }}
              accessibilityLabel={qr.isActive ? tr("Deactivate", "Deaktivieren", "إيقاف") : tr("Activate", "Aktivieren", "تفعيل")}
              style={[styles.iconBtn, { backgroundColor: qr.isActive ? Colors.success + "22" : Colors.danger + "22" }]}
            >
              <Ionicons name={qr.isActive ? "eye-outline" : "eye-off-outline"} size={18} color={qr.isActive ? Colors.success : Colors.danger} />
            </Pressable>
            <Pressable
              onPress={() => deleteQr(qr)}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={tr("Delete QR code", "QR-Code löschen", "حذف رمز QR")}
              style={[styles.iconBtn, { backgroundColor: Colors.danger + "18" }]}
            >
              <Ionicons name="trash-outline" size={18} color={Colors.danger} />
            </Pressable>
          </View>
        </View>

        {!qr.isActive ? (
          <Text style={styles.inactiveText}>{tr("Inactive — scanning is blocked", "Inaktiv — Scannen gesperrt", "غير نشط — المسح متوقف")}</Text>
        ) : null}

        <Pressable
          style={styles.qrImageContainer}
          onPress={() => canPrint && setSelectedQr(qr)}
          disabled={!canPrint}
          accessibilityLabel={tr("Preview", "Vorschau", "معاينة")}
        >
          {qr.url ? <QrImage value={qr.url} size={150} /> : (
            <View style={{ width: 150, height: 150, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="qr-code-outline" size={64} color="#BBBBBB" />
            </View>
          )}
        </Pressable>

        <View style={[styles.statsRow, flipRow && { flexDirection: "row-reverse" }]}>
          <View style={styles.statItem}>
            <Ionicons name="scan-outline" size={12} color={Colors.textSecondary} />
            <Text style={styles.statText}>{Number(qr.scannedCount) || 0} {tr("scans", "Scans", "مسح")}</Text>
          </View>
          {qr.table?.capacity ? (
            <View style={styles.statItem}>
              <Ionicons name="people-outline" size={12} color={Colors.textSecondary} />
              <Text style={styles.statText}>{qr.table.capacity}</Text>
            </View>
          ) : null}
          {qr.lastScannedAt ? (
            <View style={styles.statItem}>
              <Ionicons name="time-outline" size={12} color={Colors.textSecondary} />
              <Text style={styles.statText}>
                {new Date(qr.lastScannedAt).toLocaleDateString(language === "ar" ? "ar-u-nu-latn" : language === "de" ? "de-CH" : "en-GB")}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={[styles.actionRow, flipRow && { flexDirection: "row-reverse" }]}>
          <Pressable
            onPress={() => setSelectedQr(qr)}
            disabled={!canPrint}
            style={[styles.actionBtn, { backgroundColor: Colors.info + "1F" }, !canPrint && styles.disabled]}
          >
            <Ionicons name="eye-outline" size={15} color={Colors.info} />
            <Text style={[styles.actionBtnText, { color: Colors.info }]}>{tr("Preview", "Vorschau", "معاينة")}</Text>
          </Pressable>
          <Pressable
            onPress={() => printQr(qr)}
            disabled={!canPrint}
            style={[styles.actionBtn, { backgroundColor: Colors.accent + "1F" }, !canPrint && styles.disabled]}
          >
            <Ionicons name="print-outline" size={15} color={Colors.accent} />
            <Text style={[styles.actionBtnText, { color: Colors.accent }]}>{tr("Print", "Drucken", "طباعة")}</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  const deleteTable = async (table: any) => {
    if (busyTableIds.has(table.id)) return;
    const ok = await confirmAsync(
      tr("Delete table?", "Tisch löschen?", "حذف الطاولة؟"),
      tr(`${table.name} will be removed from this store.`, `${table.name} wird aus dieser Filiale entfernt.`, `ستُحذف الطاولة ${table.name} من هذا المتجر.`),
      tr("Delete", "Löschen", "حذف"),
      tr("Cancel", "Abbrechen", "إلغاء"),
    );
    if (!ok) return;
    markBusy(setBusyTableIds, table.id, true);
    try {
      await apiRequest("DELETE", `/api/tables/${table.id}`);
      await qc.invalidateQueries({ queryKey: ["table-qr/tables"] });
    } catch (e) {
      notify(tr("Could not delete", "Löschen fehlgeschlagen", "تعذّر الحذف"), apiErrorMessage(e));
    } finally {
      markBusy(setBusyTableIds, table.id, false);
    }
  };

  const renderTableWithoutQr = (item: any) => {
    const busy = busyTableIds.has(item.id);
    return (
      <View key={`no-qr-${item.id}`} style={[styles.noQrCard, flipRow && { flexDirection: "row-reverse" }]}>
        <View style={[styles.noQrLeft, flipRow && { flexDirection: "row-reverse" }]}>
          <View style={styles.tableIcon}>
            <Ionicons name="restaurant-outline" size={18} color={Colors.textMuted} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.noQrTableName, isRTL && { textAlign: "right" }]} numberOfLines={1}>{item.name}</Text>
            <Text style={[styles.noQrCapacity, isRTL && { textAlign: "right" }]}>
              {tr("Seats", "Plätze", "المقاعد")}: {item.capacity || "—"}
            </Text>
          </View>
        </View>
        <Pressable
          onPress={() => generateSingleQr(item)}
          disabled={busy || generating}
          style={[styles.generateBtn, (busy || generating) && styles.disabled]}
        >
          {busy ? <ActivityIndicator size="small" color={Colors.textDark} /> : <Ionicons name="qr-code-outline" size={16} color={Colors.textDark} />}
          <Text style={styles.generateBtnText}>{tr("Create QR", "QR erstellen", "إنشاء QR")}</Text>
        </Pressable>
        <Pressable
          onPress={() => deleteTable(item)}
          disabled={busy || generating}
          accessibilityRole="button"
          accessibilityLabel={tr("Delete table", "Tisch löschen", "حذف الطاولة")}
          style={[styles.iconBtn, { backgroundColor: Colors.danger + "18", marginHorizontal: 6 }, (busy || generating) && styles.disabled]}
        >
          <Ionicons name="trash-outline" size={18} color={Colors.danger} />
        </Pressable>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <TabPageHeader
        title={tr("Table QR Codes", "Tisch-QR-Codes", "رموز QR للطاولات")}
        subtitle={tr("Guests scan and order from their table", "Gäste scannen und bestellen am Tisch", "يمسح الضيوف الرمز ويطلبون من طاولتهم")}
        icon="qr-code"
        isRTL={isRTL}
      >
        <View style={[styles.headerActions, flipRow && { flexDirection: "row-reverse" }]}>
          <Pressable onPress={openAddTable} disabled={branchIds.length === 0} style={[styles.headerBtn, { backgroundColor: Colors.accent }, branchIds.length === 0 && styles.disabled]}>
            <Ionicons name="add" size={18} color={Colors.textDark} />
            <Text style={[styles.headerBtnText, { color: Colors.textDark }]}>{tr("Add table", "Tisch hinzufügen", "إضافة طاولة")}</Text>
          </Pressable>
          {tablesWithoutQr.length > 0 && (
            <Pressable onPress={generateAll} disabled={generating} style={[styles.headerBtn, styles.headerBtnGhost, generating && styles.disabled]}>
              {generating ? <ActivityIndicator size="small" color={Colors.white} /> : <Ionicons name="flash-outline" size={16} color={Colors.white} />}
              <Text style={[styles.headerBtnText, { color: Colors.white }]}>
                {generating
                  ? tr("Creating…", "Wird erstellt…", "جاري الإنشاء…")
                  : tr(`Create all (${tablesWithoutQr.length})`, `Alle erstellen (${tablesWithoutQr.length})`, `إنشاء الكل (${tablesWithoutQr.length})`)}
              </Text>
            </Pressable>
          )}
          {activeQrCount > 0 && (
            <Pressable onPress={printAll} disabled={!canPrint} style={[styles.headerBtn, styles.headerBtnGhost, !canPrint && styles.disabled]}>
              <Ionicons name="print-outline" size={16} color={Colors.white} />
              <Text style={[styles.headerBtnText, { color: Colors.white }]}>{tr("Print all", "Alle drucken", "طباعة الكل")}</Text>
            </Pressable>
          )}
        </View>

        <View style={[styles.summaryRow, flipRow && { flexDirection: "row-reverse" }]}>
          {[
            { n: (allTables as any[]).length, label: tr("Tables", "Tische", "الطاولات"), color: Colors.white },
            { n: activeQrCount, label: tr("Active QR", "Aktive QR", "QR نشط"), color: Colors.success },
            { n: tablesWithoutQr.length, label: tr("No QR", "Ohne QR", "بدون QR"), color: Colors.warning },
            { n: totalScans, label: tr("Scans", "Scans", "عمليات المسح"), color: Colors.info },
          ].map((s, i) => (
            <View key={i} style={styles.summaryItem}>
              <Text style={[styles.summaryNumber, { color: s.color }]}>{s.n}</Text>
              <Text style={styles.summaryLabel} numberOfLines={1}>{s.label}</Text>
            </View>
          ))}
        </View>
      </TabPageHeader>

      <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollInner}>
        <View onLayout={(e) => setContainerW(e.nativeEvent.layout.width)}>
          {!landingLoading && !storeSlug && !!tenantId && (
            <View style={[styles.banner, flipRow && { flexDirection: "row-reverse" }]}>
              <Ionicons name="alert-circle-outline" size={22} color={Colors.warning} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.bannerTitle, isRTL && { textAlign: "right" }]}>
                  {tr("Online store not set up", "Online-Shop nicht eingerichtet", "المتجر الإلكتروني غير مُعدّ")}
                </Text>
                <Text style={[styles.bannerText, isRTL && { textAlign: "right" }]}>
                  {tr(
                    "QR codes need your store link. Set up the online store first — printing is disabled until then.",
                    "QR-Codes brauchen Ihren Shop-Link. Richten Sie zuerst den Online-Shop ein — bis dahin ist Drucken deaktiviert.",
                    "تحتاج رموز QR إلى رابط متجرك. أعدّ المتجر الإلكتروني أولاً — الطباعة معطّلة حتى ذلك الحين.",
                  )}
                </Text>
              </View>
            </View>
          )}

          {loadFailed && (
            <View style={[styles.banner, { borderColor: Colors.danger + "66", backgroundColor: Colors.danger + "12" }, flipRow && { flexDirection: "row-reverse" }]}>
              <Ionicons name="cloud-offline-outline" size={22} color={Colors.danger} />
              <Text style={[styles.bannerText, { flex: 1, color: Colors.text }, isRTL && { textAlign: "right" }]}>
                {tr("Could not load tables. Check the connection.", "Tische konnten nicht geladen werden. Verbindung prüfen.", "تعذّر تحميل الطاولات. تحقّق من الاتصال.")}
              </Text>
              <Pressable onPress={retryAll} style={styles.retryBtn}>
                <Text style={styles.retryText}>{tr("Retry", "Erneut", "إعادة")}</Text>
              </Pressable>
            </View>
          )}

          {loading ? (
            <ActivityIndicator color={Colors.accent} style={{ marginTop: 40 }} />
          ) : (
            <>
              {tablesWithoutQr.length > 0 && (
                <View style={styles.section}>
                  <View style={[styles.sectionTitleRow, flipRow && { flexDirection: "row-reverse" }]}>
                    <Ionicons name="warning-outline" size={16} color={Colors.warning} />
                    <Text style={styles.sectionTitle}>{tr("Tables without QR code", "Tische ohne QR-Code", "طاولات بدون رمز QR")}</Text>
                  </View>
                  {tablesWithoutQr.map(renderTableWithoutQr)}
                </View>
              )}

              {qrList.length > 0 && (
                <View style={styles.section}>
                  <View style={[styles.sectionTitleRow, flipRow && { flexDirection: "row-reverse" }]}>
                    <Ionicons name="qr-code-outline" size={16} color={Colors.accent} />
                    <Text style={styles.sectionTitle}>{tr("QR codes", "QR-Codes", "رموز QR")}</Text>
                  </View>
                  <View style={[styles.grid, flipRow && { flexDirection: "row-reverse" }]}>
                    {qrList.map(renderQrCard)}
                  </View>
                </View>
              )}

              {(allTables as any[]).length === 0 && qrList.length === 0 && !loadFailed && (
                <View style={styles.emptyState}>
                  <Ionicons name="restaurant-outline" size={48} color={Colors.textMuted} />
                  <Text style={styles.emptyTitle}>{tr("No tables yet", "Noch keine Tische", "لا توجد طاولات بعد")}</Text>
                  <Text style={styles.emptyText}>
                    {branchIds.length === 0 && !branchesLoading
                      ? tr("Create a branch in Settings first, then add your tables here.", "Legen Sie zuerst in den Einstellungen eine Filiale an und fügen Sie dann hier Tische hinzu.", "أنشئ فرعاً من الإعدادات أولاً، ثم أضف طاولاتك هنا.")
                      : tr("Add your tables — each one gets its own QR code.", "Fügen Sie Ihre Tische hinzu — jeder erhält einen eigenen QR-Code.", "أضف طاولاتك — تحصل كل طاولة على رمز QR خاص بها.")}
                  </Text>
                  {branchIds.length > 0 && (
                    <Pressable onPress={openAddTable} style={[styles.headerBtn, { backgroundColor: Colors.accent, marginTop: 14 }]}>
                      <Ionicons name="add" size={18} color={Colors.textDark} />
                      <Text style={[styles.headerBtnText, { color: Colors.textDark }]}>{tr("Add table", "Tisch hinzufügen", "إضافة طاولة")}</Text>
                    </Pressable>
                  )}
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* ── Add table ─────────────────────────────────────────────────── */}
      <Modal visible={showAddTable} animationType="fade" transparent onRequestClose={() => !addingTable && setShowAddTable(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={[styles.modalContent, { padding: 0 }]}>
            <View style={[styles.modalHeader, flipRow && { flexDirection: "row-reverse" }]}>
              <Text style={styles.modalTitle}>{tr("Add table", "Tisch hinzufügen", "إضافة طاولة")}</Text>
              <Pressable onPress={() => setShowAddTable(false)} disabled={addingTable} style={styles.modalCloseBtn} accessibilityLabel={tr("Close", "Schließen", "إغلاق")}>
                <Ionicons name="close" size={22} color={Colors.text} />
              </Pressable>
            </View>
            <View style={{ padding: 16, gap: 12 }}>
              <View>
                <Text style={[styles.fieldLabel, isRTL && { textAlign: "right" }]}>{tr("Table name", "Tischname", "اسم الطاولة")}</Text>
                <TextInput
                  value={newTableName}
                  onChangeText={(v) => { setNewTableName(v); setAddError(null); }}
                  style={[styles.input, isRTL && { textAlign: "right" }]}
                  placeholder={tr("e.g. Table 5 / Terrace 2", "z. B. Tisch 5 / Terrasse 2", "مثال: طاولة 5 / تراس 2")}
                  placeholderTextColor={Colors.textMuted}
                  maxLength={40}
                  autoFocus
                />
              </View>
              <View>
                <Text style={[styles.fieldLabel, isRTL && { textAlign: "right" }]}>{tr("Seats", "Plätze", "عدد المقاعد")}</Text>
                <TextInput
                  value={newTableCapacity}
                  onChangeText={(v) => { setNewTableCapacity(v.replace(/[^0-9٠-٩]/g, "").replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x0660))); setAddError(null); }}
                  style={[styles.input, isRTL && { textAlign: "right" }]}
                  keyboardType="number-pad"
                  maxLength={3}
                  placeholder="4"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>
              {(branches as any[]).length > 1 && (
                <View>
                  <Text style={[styles.fieldLabel, isRTL && { textAlign: "right" }]}>{tr("Branch", "Filiale", "الفرع")}</Text>
                  <View style={[styles.chipWrap, flipRow && { flexDirection: "row-reverse" }]}>
                    {(branches as any[]).map((b) => {
                      const active = Number(b.id) === newTableBranchId;
                      return (
                        <Pressable key={b.id} onPress={() => setNewTableBranchId(Number(b.id))} style={[styles.branchChip, active && styles.branchChipActive]}>
                          <Text style={[styles.branchChipText, active && { color: Colors.accent }]} numberOfLines={1}>{b.name}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              )}
              <Text style={[styles.hintText, isRTL && { textAlign: "right" }]}>
                {tr("A QR code is created for the new table automatically.", "Für den neuen Tisch wird automatisch ein QR-Code erstellt.", "يُنشأ رمز QR للطاولة الجديدة تلقائياً.")}
              </Text>
              {addError ? <Text style={[styles.errorText, isRTL && { textAlign: "right" }]}>{addError}</Text> : null}
              <View style={[styles.modalFooter, flipRow && { flexDirection: "row-reverse" }]}>
                <Pressable onPress={() => setShowAddTable(false)} disabled={addingTable} style={styles.secondaryBtn}>
                  <Text style={styles.secondaryBtnText}>{tr("Cancel", "Abbrechen", "إلغاء")}</Text>
                </Pressable>
                <Pressable onPress={saveNewTable} disabled={addingTable} style={[styles.primaryBtn, addingTable && styles.disabled]}>
                  {addingTable ? <ActivityIndicator size="small" color={Colors.textDark} /> : <Ionicons name="checkmark" size={18} color={Colors.textDark} />}
                  <Text style={styles.primaryBtnText}>{tr("Add table", "Tisch hinzufügen", "إضافة طاولة")}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Preview Modal ─────────────────────────────────────────────── */}
      <Modal visible={!!selectedQr} animationType="fade" transparent onRequestClose={() => setSelectedQr(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.modalHeader, flipRow && { flexDirection: "row-reverse" }]}>
              <Text style={styles.modalTitle}>{tr("QR preview", "QR-Vorschau", "معاينة QR")}</Text>
              <Pressable onPress={() => setSelectedQr(null)} style={styles.modalCloseBtn} accessibilityLabel={tr("Close", "Schließen", "إغلاق")}>
                <Ionicons name="close" size={22} color={Colors.text} />
              </Pressable>
            </View>

            {selectedQr && (
              <ScrollView contentContainerStyle={{ alignItems: "center", padding: 20 }}>
                <View style={styles.previewCard}>
                  <LinearGradient
                    colors={["#1E40AF", "#7C3AED", "#2FD3C6"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.previewGradient}
                  />
                  <Text style={styles.previewStoreName} numberOfLines={2}>{storeName}</Text>
                  <View style={styles.previewQrBox}>
                    {selectedQr.url ? <QrImage value={selectedQr.url} size={216} /> : null}
                  </View>
                  <Text style={styles.previewTableName} numberOfLines={1}>{selectedQr.tableName}</Text>
                  <Text style={styles.previewScanText}>{printTexts.scan}</Text>
                  {!selectedQr.isActive ? (
                    <Text style={[styles.previewScanText, { color: "#DC2626", marginTop: 6 }]}>
                      {tr("This code is inactive", "Dieser Code ist inaktiv", "هذا الرمز غير نشط")}
                    </Text>
                  ) : null}
                </View>

                <View style={styles.urlBox}>
                  <Text style={[styles.urlLabel, isRTL && { textAlign: "right" }]}>{tr("Ordering link", "Bestell-Link", "رابط الطلب")}</Text>
                  <Text style={styles.urlText} selectable>{selectedQr.url}</Text>
                  <View style={[styles.urlActions, flipRow && { flexDirection: "row-reverse" }]}>
                    <Pressable onPress={() => copyLink(selectedQr.url)} style={styles.urlBtn}>
                      <Ionicons name={copied ? "checkmark" : "copy-outline"} size={15} color={Colors.accent} />
                      <Text style={styles.urlBtnText}>{copied ? tr("Copied", "Kopiert", "تم النسخ") : tr("Copy link", "Link kopieren", "نسخ الرابط")}</Text>
                    </Pressable>
                    <Pressable onPress={() => Linking.openURL(selectedQr.url).catch(() => { })} style={styles.urlBtn}>
                      <Ionicons name="open-outline" size={15} color={Colors.accent} />
                      <Text style={styles.urlBtnText}>{tr("Open", "Öffnen", "فتح")}</Text>
                    </Pressable>
                  </View>
                </View>

                <Pressable
                  onPress={() => { const qr = selectedQr; setSelectedQr(null); printQr(qr); }}
                  style={styles.printPreviewBtn}
                >
                  <Ionicons name="print-outline" size={20} color={Colors.textDark} />
                  <Text style={styles.printPreviewBtnText}>{tr("Print this QR", "Diesen QR drucken", "طباعة هذا الرمز")}</Text>
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
const styles = themedStyles((Colors) => ({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { flex: 1 },
  scrollInner: { paddingHorizontal: 16, paddingBottom: 120, width: "100%", maxWidth: 1200, alignSelf: "center" },

  headerActions: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginBottom: 10 },
  headerBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, minHeight: 44,
    borderRadius: 10,
  },
  headerBtnGhost: { backgroundColor: "rgba(255,255,255,0.14)", borderWidth: 1, borderColor: "rgba(255,255,255,0.25)" },
  headerBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  disabled: { opacity: 0.45 },

  summaryRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  summaryItem: {
    flex: 1, minWidth: 72,
    backgroundColor: "rgba(255,255,255,0.10)", borderRadius: 12,
    paddingVertical: 8, paddingHorizontal: 6, alignItems: "center",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.14)",
  },
  summaryNumber: { fontSize: 20, fontWeight: "900" },
  summaryLabel: { fontSize: 10, color: "rgba(255,255,255,0.8)", fontWeight: "600", marginTop: 2 },

  banner: {
    flexDirection: "row", alignItems: "center", gap: 10, marginTop: 16,
    padding: 12, borderRadius: 12, borderWidth: 1,
    borderColor: Colors.warning + "66", backgroundColor: Colors.warning + "14",
  },
  bannerTitle: { color: Colors.warning, fontSize: 14, fontWeight: "800" },
  bannerText: { color: Colors.textSecondary, fontSize: 12, marginTop: 2 },
  retryBtn: { paddingHorizontal: 14, minHeight: 40, justifyContent: "center", borderRadius: 8, backgroundColor: Colors.danger },
  retryText: { color: Colors.white, fontWeight: "700", fontSize: 13 },

  section: { marginTop: 16 },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: Colors.text },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },

  // QR Card
  qrCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  qrCardInactive: { opacity: 0.6 },
  qrCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 8 },
  tableNameBadge: {
    flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 1, minWidth: 0,
    backgroundColor: Colors.info + "22", paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 8,
  },
  tableNameText: { color: Colors.info, fontSize: 14, fontWeight: "800", flexShrink: 1 },
  cardIconRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  iconBtn: {
    width: 44, height: 44, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
  },
  inactiveText: { color: Colors.danger, fontSize: 11, fontWeight: "700", textAlign: "center", marginBottom: 6 },
  qrImageContainer: {
    alignItems: "center", justifyContent: "center", alignSelf: "center",
    backgroundColor: "#FFFFFF", borderRadius: 12,
    padding: 10, marginBottom: 8,
  },

  statsRow: { flexDirection: "row", gap: 12, marginBottom: 10, justifyContent: "center", flexWrap: "wrap" },
  statItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  statText: { fontSize: 11, color: Colors.textSecondary, fontWeight: "600" },

  actionRow: { flexDirection: "row", gap: 8 },
  actionBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, minHeight: 44, borderRadius: 10,
  },
  actionBtnText: { fontSize: 13, fontWeight: "700" },

  // No QR card
  noQrCard: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10,
    backgroundColor: Colors.card, borderRadius: 12,
    padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: Colors.cardBorder,
  },
  noQrLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1, minWidth: 0 },
  tableIcon: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: Colors.surfaceLight,
    alignItems: "center", justifyContent: "center",
  },
  noQrTableName: { color: Colors.text, fontSize: 14, fontWeight: "700" },
  noQrCapacity: { color: Colors.textMuted, fontSize: 11, fontWeight: "500" },
  generateBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: Colors.accent, paddingHorizontal: 12, minHeight: 44,
    borderRadius: 10,
  },
  generateBtnText: { color: Colors.textDark, fontSize: 13, fontWeight: "700" },

  // Empty
  emptyState: {
    alignItems: "center", justifyContent: "center",
    padding: 32, marginTop: 32,
    backgroundColor: Colors.card, borderRadius: 20,
    borderWidth: 1, borderColor: Colors.cardBorder,
  },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: Colors.text, marginTop: 12, textAlign: "center" },
  emptyText: { fontSize: 13, color: Colors.textSecondary, textAlign: "center", marginTop: 6, maxWidth: 340 },

  // Modals
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center", alignItems: "center", padding: 16,
  },
  modalContent: {
    width: "100%", maxWidth: 500, maxHeight: "90%",
    backgroundColor: Colors.surface, borderRadius: 20,
    borderWidth: 1, borderColor: Colors.cardBorder,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.cardBorder,
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: Colors.text, flexShrink: 1 },
  modalCloseBtn: {
    width: 44, height: 44, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
    backgroundColor: Colors.card,
  },
  modalFooter: { flexDirection: "row", gap: 10, marginTop: 4 },
  fieldLabel: { color: Colors.textMuted, fontSize: 12, fontWeight: "700", marginBottom: 6 },
  input: {
    backgroundColor: Colors.inputBg, borderWidth: 1, borderColor: Colors.inputBorder,
    borderRadius: 10, paddingHorizontal: 12, minHeight: 44, color: Colors.text, fontSize: 15,
  },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  branchChip: { paddingHorizontal: 14, minHeight: 40, justifyContent: "center", borderRadius: 999, borderWidth: 1, borderColor: Colors.cardBorder, backgroundColor: Colors.card, maxWidth: 220 },
  branchChipActive: { borderColor: Colors.accent, backgroundColor: Colors.accent + "18" },
  branchChipText: { color: Colors.textSecondary, fontSize: 13, fontWeight: "600" },
  hintText: { color: Colors.textMuted, fontSize: 12 },
  errorText: { color: Colors.danger, fontSize: 13, fontWeight: "600" },
  secondaryBtn: { flex: 1, minHeight: 46, alignItems: "center", justifyContent: "center", borderRadius: 10, borderWidth: 1, borderColor: Colors.cardBorder },
  secondaryBtnText: { color: Colors.textSecondary, fontSize: 14, fontWeight: "700" },
  primaryBtn: { flex: 2, flexDirection: "row", gap: 6, minHeight: 46, alignItems: "center", justifyContent: "center", borderRadius: 10, backgroundColor: Colors.accent },
  primaryBtnText: { color: Colors.textDark, fontSize: 14, fontWeight: "800" },

  // Preview card (always light — it mirrors the printed card)
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
    fontSize: 16, fontWeight: "800", color: "#1a1a2e", textAlign: "center",
    textTransform: "uppercase", letterSpacing: 1, marginTop: 4,
  },
  previewQrBox: {
    width: 240, height: 240, borderRadius: 16,
    backgroundColor: "#FFFFFF", borderWidth: 2, borderColor: "#e8eaf6",
    alignItems: "center", justifyContent: "center",
    marginVertical: 14,
  },
  previewTableName: {
    fontSize: 32, fontWeight: "900", color: "#1E40AF", marginBottom: 4,
  },
  previewScanText: { fontSize: 13, color: "#666", fontWeight: "600", textAlign: "center" },

  urlBox: {
    marginTop: 16, width: "100%",
    backgroundColor: Colors.card, borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: Colors.cardBorder,
  },
  urlLabel: { fontSize: 11, color: Colors.textSecondary, fontWeight: "700", marginBottom: 4 },
  urlText: { fontSize: 11, color: Colors.accent, fontWeight: "500", writingDirection: "ltr" },
  urlActions: { flexDirection: "row", gap: 8, marginTop: 10 },
  urlBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, minHeight: 40, borderRadius: 8, backgroundColor: Colors.accent + "18" },
  urlBtnText: { color: Colors.accent, fontSize: 13, fontWeight: "700" },

  printPreviewBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: Colors.accent, paddingHorizontal: 24, minHeight: 48,
    borderRadius: 12, marginTop: 16,
  },
  printPreviewBtnText: { color: Colors.textDark, fontSize: 14, fontWeight: "800" },
}));
