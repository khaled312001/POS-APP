import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Platform,
  FlatList,
  Dimensions,
  Modal,
  Alert,
  Share,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import Svg, { Path, Defs, LinearGradient as SvgLinearGradient, Stop, Circle, G } from "react-native-svg";
import { addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth } from "date-fns";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Colors } from "@/constants/colors";
import { themedStyles } from "@/lib/themed-styles";
import { getQueryFn } from "@/lib/query-client";
import { getDisplayNumber } from "@/lib/api-config";
import { useLanguage } from "@/lib/language-context";
import { useAuth } from "@/lib/auth-context";
import { useLicense } from "@/lib/license-context";
import { getChromeMetrics } from "@/lib/responsive";
import TabPageHeader from "@/components/tab-page-header";
import { formatMoney, formatAmount, getCurrency } from "@/lib/currency";
import {
  storeTimeZone,
  storeYmd,
  storeDayStart,
  storeDayEnd,
  addDaysYmd,
  tzOffsetMinutes,
  formatInStoreTz,
} from "@/components/store-locale";

type TabType = "overview" | "sales" | "inventory" | "returns" | "finance" | "activity" | "delivery";
type Lang = "en" | "de" | "ar";

const TAB_ICONS: Record<TabType, string> = {
  overview: "analytics",
  sales: "receipt",
  inventory: "cube",
  returns: "swap-horizontal",
  finance: "wallet",
  activity: "list",
  delivery: "bicycle",
};

// ── Small pure helpers ───────────────────────────────────────────────────────

const pad2 = (n: number) => String(n).padStart(2, "0");

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** Sales in these states never happened as far as revenue is concerned. */
const VOID_STATUSES = new Set(["voided", "void", "cancelled", "canceled"]);

const MONTHS: Record<Lang, string[]> = {
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  de: ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"],
  ar: ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"],
};
const WEEKDAY_INITIALS: Record<Lang, string[]> = {
  en: ["S", "M", "T", "W", "T", "F", "S"],
  de: ["S", "M", "D", "M", "D", "F", "S"],
  ar: ["ح", "ن", "ث", "ر", "خ", "ج", "س"],
};
const WEEKDAY_SHORT: Record<Lang, string[]> = {
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  de: ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"],
  ar: ["أحد", "إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"],
};

const LOCALES: Record<Lang, string> = { en: "en-GB", de: "de-CH", ar: "ar-u-nu-latn" };

const langOf = (language: string): Lang => (language === "ar" || language === "de" ? language : "en");

/** "24 September 2026" / "24. September 2026" / "24 سبتمبر 2026" for a YYYY-MM-DD string. */
function formatYmd(ymd: string, lang: Lang, short = false): string {
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return ymd;
  const month = MONTHS[lang][m - 1] || "";
  const monthText = short && lang !== "ar" ? month.slice(0, 3) : month;
  return lang === "de" ? `${d}. ${monthText} ${y}` : `${d} ${monthText} ${y}`;
}

function weekdayOfYmd(ymd: string): number {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1)).getUTCDay();
}

function daysBetweenYmd(from: string, to: string): number {
  const [y1, m1, d1] = from.split("-").map(Number);
  const [y2, m2, d2] = to.split("-").map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
}

/** Chart/axis label: compact, grouped, never with minor units. */
function compactNumber(n: number): string {
  const a = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  const trim = (v: number) => (v >= 100 ? v.toFixed(0) : v.toFixed(1).replace(/\.0$/, ""));
  if (a >= 1e9) return `${sign}${trim(a / 1e9)}B`;
  if (a >= 1e6) return `${sign}${trim(a / 1e6)}M`;
  if (a >= 1e4) return `${sign}${trim(a / 1e3)}k`;
  return formatAmount(Math.round(n), 0, { group: true });
}

/**
 * Maps a timestamp to the store-local calendar day and hour. The UTC offset is
 * cached per clock hour, so thousands of sales cost only a handful of Intl calls
 * and DST switches are still exact.
 */
function makeStoreClock(timeZone: string) {
  const cache = new Map<number, number>();
  return (value: unknown): { ymd: string; hour: number } | null => {
    const ms = new Date(value as any).getTime();
    if (!Number.isFinite(ms)) return null;
    const key = Math.floor(ms / 3600000);
    let off = cache.get(key);
    if (off === undefined) {
      off = tzOffsetMinutes(new Date(ms), timeZone);
      cache.set(key, off);
    }
    const local = new Date(ms + off * 60000);
    return {
      ymd: `${local.getUTCFullYear()}-${pad2(local.getUTCMonth() + 1)}-${pad2(local.getUTCDate())}`,
      hour: local.getUTCHours(),
    };
  };
}

function salesRangeUrl(from: string, to: string, timeZone: string): string {
  const start = storeDayStart(from, timeZone).toISOString();
  const end = storeDayEnd(to, timeZone).toISOString();
  return `/api/analytics/sales-range?startDate=${encodeURIComponent(start)}&endDate=${encodeURIComponent(end)}`;
}

function notify(title: string, message: string) {
  if (Platform.OS === "web" && typeof window !== "undefined") window.alert(`${title}\n\n${message}`);
  else Alert.alert(title, message);
}

/** Builds a CSV (UTF-8 BOM so Excel shows Arabic/umlauts) and downloads/shares it. */
async function exportCsv(filename: string, rows: (string | number | null | undefined)[][]) {
  const esc = (v: string | number | null | undefined) => {
    let s = v == null ? "" : String(v);
    if (typeof v === "string" && /^[=+@]/.test(s)) s = `'${s}`; // spreadsheet formula injection
    return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = rows.map((r) => r.map(esc).join(",")).join("\r\n");
  if (Platform.OS === "web" && typeof document !== "undefined") {
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return;
  }
  await Share.share({ title: filename, message: csv });
}

// ── Presentational building blocks ───────────────────────────────────────────

function GlassCard({ children, style }: { children: React.ReactNode; style?: any }) {
  return <View style={[styles.glassCard, style]}>{children}</View>;
}

function PercentBar({ percent, color, height = 8 }: { percent: number; color: string; height?: number }) {
  const safe = Number.isFinite(percent) ? Math.min(Math.max(percent, 0), 100) : 0;
  return (
    <View style={[styles.barTrack, { height }]}>
      <View style={[styles.barFill, { width: `${safe}%`, backgroundColor: color, height }]} />
    </View>
  );
}

function ErrorCard({ message, retryLabel, onRetry }: { message: string; retryLabel: string; onRetry: () => void }) {
  return (
    <GlassCard style={{ borderColor: Colors.danger + "55" }}>
      <View style={styles.empty}>
        <Ionicons name="cloud-offline-outline" size={32} color={Colors.danger} />
        <Text style={[styles.emptyText, { textAlign: "center" }]}>{message}</Text>
        <Pressable onPress={onRetry} style={styles.retryBtn} accessibilityRole="button">
          <Ionicons name="refresh" size={16} color={Colors.accent} />
          <Text style={styles.retryText}>{retryLabel}</Text>
        </Pressable>
      </View>
    </GlassCard>
  );
}

/** The screen root sets `direction`, so a plain "row" already runs right-to-left in Arabic. */
function BarChart({ data, height = 180 }: { data: { label: string; value: number; color: string }[]; height?: number }) {
  if (!data.length) return null;
  const maxVal = Math.max(...data.map((d) => Math.abs(d.value)), 1);
  return (
    <View style={{ height, flexDirection: "row", alignItems: "flex-end", gap: 6, paddingHorizontal: 4, paddingTop: 10 }}>
      {data.map((item, i) => {
        const barH = Math.max((Math.abs(item.value) / maxVal) * (height - 44), 4);
        return (
          <View key={i} style={{ flex: 1, minWidth: 0, alignItems: "center", justifyContent: "flex-end" }}>
            <Text style={{ color: Colors.text, fontSize: 10, fontWeight: "700", marginBottom: 4 }} numberOfLines={1}>
              {compactNumber(item.value)}
            </Text>
            <LinearGradient
              colors={[item.color, item.color + "80"]}
              style={{ width: "100%", height: barH, borderRadius: 6, minWidth: 12, maxWidth: 50 }}
            />
            <Text style={{ color: Colors.textMuted, fontSize: 9, marginTop: 4, textAlign: "center" }} numberOfLines={1}>
              {item.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function DonutChart({
  data,
  size = 150,
  centerValue,
  centerLabel,
}: {
  data: { label: string; value: number; color: string }[];
  size?: number;
  centerValue: string;
  centerLabel: string;
}) {
  const total = data.reduce((s, d) => s + Math.max(d.value, 0), 0);
  if (!data.length || total <= 0) return null;
  const stroke = size * 0.16;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <View style={{ alignItems: "center" }}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={Colors.border} strokeWidth={stroke} fill="none" />
          {data.map((d, i) => {
            const len = (Math.max(d.value, 0) / total) * c;
            // Segments start at 12 o'clock (path position 3c/4) and run clockwise.
            const start = (0.75 * c + acc) % c;
            acc += len;
            if (len <= 0) return null;
            return (
              <Circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={r}
                stroke={d.color}
                strokeWidth={stroke}
                fill="none"
                strokeDasharray={`${len} ${Math.max(c - len, 0.001)}`}
                strokeDashoffset={c - start}
              />
            );
          })}
        </Svg>
        <View style={[StyleSheet.absoluteFill, { alignItems: "center", justifyContent: "center", paddingHorizontal: stroke + 4 }]} pointerEvents="none">
          <Text style={{ color: Colors.text, fontSize: 15, fontWeight: "800" }} numberOfLines={1} adjustsFontSizeToFit>
            {centerValue}
          </Text>
          <Text style={{ color: Colors.textMuted, fontSize: 10 }} numberOfLines={1}>{centerLabel}</Text>
        </View>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 10, marginTop: 12 }}>
        {data.map((seg, i) => (
          <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: seg.color }} />
            <Text style={{ color: Colors.textSecondary, fontSize: 11 }}>
              {seg.label} ({((Math.max(seg.value, 0) / total) * 100).toFixed(0)}%)
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function MiniLineChart({ data, height = 140, color = Colors.accent, rtl = false }: { data: number[]; height?: number; color?: string; rtl?: boolean }) {
  // Hooks must run unconditionally and in the same order every render — the
  // early `if (data.length < 2) return null` must NOT precede useState.
  const [chartWidth, setChartWidth] = useState(Math.max(Dimensions.get("window").width - 64, 120));
  if (data.length < 2) return null;
  const maxVal = Math.max(...data, 1);
  const minVal = Math.min(...data, 0);
  const range = maxVal - minVal || 1;
  const padX = 8;
  const stepX = (chartWidth - padX * 2) / (data.length - 1);

  const points = data.map((v, i) => {
    const x = padX + i * stepX;
    return {
      // Arabic reads right-to-left: oldest point on the right, like the bars.
      x: rtl ? chartWidth - x : x,
      y: height - ((v - minVal) / range) * (height * 0.7) - 20,
    };
  });

  let linePath = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(i - 1, 0)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(i + 2, points.length - 1)];
    const cp1X = p1.x + (p2.x - p0.x) / 6;
    const cp1Y = p1.y + (p2.y - p0.y) / 6;
    const cp2X = p2.x - (p3.x - p1.x) / 6;
    const cp2Y = p2.y - (p3.y - p1.y) / 6;
    linePath += ` C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${p2.x} ${p2.y}`;
  }
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;
  const showDots = points.length <= 40;

  return (
    <View onLayout={(e) => setChartWidth(Math.max(e.nativeEvent.layout.width, 60))} style={{ height, width: "100%" }}>
      <Svg height={height} width="100%">
        <Defs>
          <SvgLinearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={color} stopOpacity="0.4" />
            <Stop offset="100%" stopColor={color} stopOpacity="0" />
          </SvgLinearGradient>
        </Defs>
        <Path d={areaPath} fill="url(#areaGradient)" />
        <Path d={linePath} fill="none" stroke={color} strokeWidth="6" strokeOpacity="0.1" strokeLinecap="round" strokeLinejoin="round" />
        <Path d={linePath} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {showDots && points.map((p, i) => (
          <G key={i}>
            <Circle cx={p.x} cy={p.y} r="5" fill={color} fillOpacity="0.2" />
            <Circle cx={p.x} cy={p.y} r="2.5" fill={Colors.card} stroke={color} strokeWidth="1.5" />
          </G>
        ))}
      </Svg>
    </View>
  );
}

function DatePickerModal({
  visible,
  onClose,
  onSelect,
  currentDate,
  todayYmd,
  lang,
  isRTL,
  closeLabel,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (date: string) => void;
  currentDate?: string;
  todayYmd: string;
  lang: Lang;
  isRTL: boolean;
  closeLabel: string;
}) {
  // The grid is pure calendar arithmetic on local Date objects (no instants),
  // so device time zone does not matter here; the selection is a YYYY-MM-DD string.
  const toLocalDate = (ymd: string) => {
    const [y, m, d] = ymd.split("-").map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  };
  const toYmd = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const selected = currentDate || todayYmd;
  const [currentMonth, setCurrentMonth] = useState(() => toLocalDate(selected));

  useEffect(() => {
    if (visible) setCurrentMonth(toLocalDate(selected));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const monthStart = startOfMonth(currentMonth);
  const gridStart = startOfWeek(monthStart);
  const gridEnd = endOfWeek(endOfMonth(monthStart));
  const rows: React.ReactNode[] = [];
  let day = gridStart;
  while (day <= gridEnd) {
    const cells: React.ReactNode[] = [];
    for (let i = 0; i < 7; i++) {
      const ymd = toYmd(day);
      const isSelected = ymd === selected;
      const isToday = ymd === todayYmd;
      const inMonth = isSameMonth(day, monthStart);
      cells.push(
        <Pressable
          key={ymd}
          accessibilityRole="button"
          accessibilityLabel={formatYmd(ymd, lang)}
          style={{
            flex: 1,
            aspectRatio: 1,
            minHeight: 36,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: isSelected ? Colors.accent : "transparent",
            borderWidth: isToday && !isSelected ? 1 : 0,
            borderColor: Colors.accent,
            borderRadius: 8,
            margin: 2,
            opacity: inMonth ? 1 : 0.35,
          }}
          onPress={() => {
            onSelect(ymd);
            onClose();
          }}
        >
          <Text style={{ color: isSelected ? Colors.textDark : Colors.text, fontWeight: isSelected ? "800" : "500", fontSize: 14 }}>
            {day.getDate()}
          </Text>
        </Pressable>,
      );
      day = addDays(day, 1);
    }
    rows.push(<View key={`row-${toYmd(day)}`} style={{ flexDirection: "row" }}>{cells}</View>);
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: 16 }} onPress={onClose}>
        <Pressable onPress={() => {}} style={{ backgroundColor: Colors.surface, borderRadius: 20, padding: 16, width: "100%", maxWidth: 400, borderWidth: 1, borderColor: Colors.cardBorder }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <Pressable onPress={() => setCurrentMonth(subMonths(currentMonth, 1))} hitSlop={10} style={styles.iconBtn} accessibilityRole="button">
              <Ionicons name={isRTL ? "chevron-forward" : "chevron-back"} size={22} color={Colors.accent} />
            </Pressable>
            <Text style={{ color: Colors.text, fontSize: 17, fontWeight: "800" }}>
              {MONTHS[lang][currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </Text>
            <Pressable onPress={() => setCurrentMonth(addMonths(currentMonth, 1))} hitSlop={10} style={styles.iconBtn} accessibilityRole="button">
              <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={22} color={Colors.accent} />
            </Pressable>
          </View>
          <View style={{ flexDirection: "row", marginBottom: 8 }}>
            {WEEKDAY_INITIALS[lang].map((d, i) => (
              <View key={i} style={{ flex: 1, alignItems: "center" }}>
                <Text style={{ color: Colors.textMuted, fontSize: 12, fontWeight: "600" }}>{d}</Text>
              </View>
            ))}
          </View>
          <View>{rows}</View>
          <Pressable onPress={onClose} style={{ marginTop: 16, minHeight: 44, justifyContent: "center", backgroundColor: Colors.surfaceLight, borderRadius: 12, alignItems: "center" }}>
            <Text style={{ color: Colors.text, fontWeight: "700" }}>{closeLabel}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

type PeriodFilter = "daily" | "yesterday" | "weekly" | "monthly" | "annual" | "specific" | "custom";

/** Store-local calendar range (YYYY-MM-DD, inclusive) for a preset period. */
function getPeriodDates(period: PeriodFilter, todayYmd: string, specificDate?: string): { from: string; to: string } {
  switch (period) {
    case "daily":
      return { from: todayYmd, to: todayYmd };
    case "yesterday": {
      const y = addDaysYmd(todayYmd, -1);
      return { from: y, to: y };
    }
    case "specific":
      return { from: specificDate || todayYmd, to: specificDate || todayYmd };
    case "weekly":
      return { from: addDaysYmd(todayYmd, -6), to: todayYmd };
    case "monthly":
      return { from: `${todayYmd.slice(0, 8)}01`, to: todayYmd };
    case "annual":
      return { from: `${todayYmd.slice(0, 5)}01-01`, to: todayYmd };
    default:
      return { from: "", to: "" };
  }
}

const LIST_PAGE = 50;

export default function ReportsScreen() {
  const insets = useSafeAreaInsets();
  const { t, isRTL, rtlTextAlign, rtlText, language, currency } = useLanguage();
  const lang = langOf(language);
  const tr = useCallback((en: string, de: string, ar: string) => (lang === "ar" ? ar : lang === "de" ? de : en), [lang]);
  const locale = LOCALES[lang];
  const { isCashier } = useAuth();
  const { tenant } = useLicense();
  const tenantId = tenant?.id;
  const qc = useQueryClient();
  const [screenDims, setScreenDims] = useState(Dimensions.get("window"));
  useEffect(() => {
    const sub = Dimensions.addEventListener("change", ({ window }) => setScreenDims(window));
    return () => sub?.remove();
  }, []);
  const { topPad, bottomPad } = getChromeMetrics(screenDims.width);
  const [tab, setTab] = useState<TabType>("overview");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("monthly");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showDatePicker, setShowDatePicker] = useState<"specific" | "from" | "to" | null>(null);
  const [salesVisible, setSalesVisible] = useState(LIST_PAGE);
  const [productsVisible, setProductsVisible] = useState(LIST_PAGE);
  const [refreshing, setRefreshing] = useState(false);

  // Store time zone follows the store currency (SYP → Asia/Damascus, else Europe/Zurich).
  const timeZone = useMemo(() => storeTimeZone(currency || getCurrency()), [currency]);
  const [todayYmd, setTodayYmd] = useState(() => storeYmd(new Date(), timeZone));
  useEffect(() => {
    // Roll over at store midnight while the screen stays open.
    const tick = () => setTodayYmd(storeYmd(new Date(), timeZone));
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, [timeZone]);
  const [specificDate, setSpecificDate] = useState("");
  const clock = useMemo(() => makeStoreClock(timeZone), [timeZone]);

  const fmtDateTime = useCallback(
    (v: unknown) => formatInStoreTz(v as any, locale, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }, timeZone),
    [locale, timeZone],
  );

  // ── Tenant-scoped data ────────────────────────────────────────────────────
  const { data: stats, isError: statsError, refetch: refetchStats } = useQuery<any>({
    queryKey: [`/api/dashboard?tenantId=${tenantId}`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!tenantId,
  });

  const { data: branches, isSuccess: branchesLoaded, isError: branchesError, refetch: refetchBranches } = useQuery<any[]>({
    queryKey: [`/api/branches?tenantId=${tenantId}`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!tenantId,
  });
  const branchIds = useMemo(() => new Set((branches || []).map((b: any) => Number(b.id))), [branches]);

  const { data: employees = [] } = useQuery<any[]>({
    queryKey: [`/api/employees?tenantId=${tenantId}`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!tenantId,
  });

  const { data: lowStock = [] } = useQuery<any[]>({
    queryKey: [`/api/inventory/low-stock?tenantId=${tenantId}`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!tenantId,
  });

  const { data: allProducts = [] } = useQuery<any[]>({
    queryKey: [`/api/products?tenantId=${tenantId}`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!tenantId,
  });

  const { data: inventoryRows = [] } = useQuery<any[]>({
    queryKey: [`/api/inventory?tenantId=${tenantId}`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!tenantId,
  });

  const { data: activityLog = [], isError: activityError, refetch: refetchActivity } = useQuery<any[]>({
    queryKey: [`/api/activity-log?limit=50&tenantId=${tenantId}`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!tenantId,
  });

  const { data: tenantReturns = [], isError: returnsError, refetch: refetchReturns } = useQuery<any[]>({
    queryKey: [`/api/returns?tenantId=${tenantId}`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!tenantId,
  });

  // ── Endpoints the server does NOT scope by tenant — filtered here ───────────
  const { data: profitByProductRaw = [] } = useQuery<any[]>({
    queryKey: ["/api/analytics/profit-by-product"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!tenantId,
  });
  const { data: cashierPerformanceRaw = [] } = useQuery<any[]>({
    queryKey: ["/api/analytics/cashier-performance"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!tenantId,
  });
  const { data: slowMovingRaw = [] } = useQuery<any[]>({
    queryKey: ["/api/analytics/slow-moving"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!tenantId,
  });
  const { data: inventoryMovementsRaw = [] } = useQuery<any[]>({
    queryKey: ["/api/inventory-movements?limit=300"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!tenantId,
  });

  const productIds = useMemo(() => new Set(allProducts.map((p: any) => Number(p.id))), [allProducts]);
  const employeeIds = useMemo(() => new Set(employees.map((e: any) => Number(e.id))), [employees]);
  const profitByProduct = useMemo(
    () => profitByProductRaw.filter((p: any) => productIds.has(Number(p.productId))),
    [profitByProductRaw, productIds],
  );
  const cashierPerformance = useMemo(
    () => cashierPerformanceRaw.filter((p: any) => employeeIds.has(Number(p.employeeId))),
    [cashierPerformanceRaw, employeeIds],
  );
  const slowMovingProducts = useMemo(
    () => slowMovingRaw.filter((p: any) => productIds.has(Number(p.id))),
    [slowMovingRaw, productIds],
  );
  const inventoryMovements = useMemo(
    () => inventoryMovementsRaw.filter((m: any) => (m.branchId != null ? branchIds.has(Number(m.branchId)) : productIds.has(Number(m.productId)))),
    [inventoryMovementsRaw, branchIds, productIds],
  );

  // ── Overview: last 7 days + month to date, bucketed by store-local day ─────
  const monthStartYmd = `${todayYmd.slice(0, 8)}01`;
  const weekStartYmd = addDaysYmd(todayYmd, -6);
  const yesterdayYmd = addDaysYmd(todayYmd, -1);
  const overviewFrom = weekStartYmd < monthStartYmd ? weekStartYmd : monthStartYmd;
  const overviewUrl = useMemo(() => salesRangeUrl(overviewFrom, todayYmd, timeZone), [overviewFrom, todayYmd, timeZone]);
  const { data: overviewSalesRaw, isError: overviewQueryError, refetch: refetchOverviewQuery } = useQuery<any[]>({
    queryKey: [overviewUrl],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!tenantId && branchesLoaded,
  });
  // Every sales figure is filtered by the tenant's branches, so a failed branch
  // lookup must surface as an error rather than an endless spinner.
  const overviewError = overviewQueryError || branchesError;
  const refetchOverview = () => { if (branchesError) refetchBranches(); else refetchOverviewQuery(); };

  const overview = useMemo(() => {
    const byDay = new Map<string, number>();
    const byMethod = new Map<string, number>();
    let today = 0, yesterday = 0, week = 0, month = 0, todayCount = 0, monthCount = 0;
    for (const s of overviewSalesRaw || []) {
      if (!branchIds.has(Number(s.branchId)) || VOID_STATUSES.has(String(s.status || "").toLowerCase())) continue;
      const when = clock(s.createdAt);
      if (!when) continue;
      const amt = num(s.totalAmount);
      byDay.set(when.ymd, (byDay.get(when.ymd) || 0) + amt);
      if (when.ymd === todayYmd) { today += amt; todayCount++; }
      if (when.ymd === yesterdayYmd) yesterday += amt;
      if (when.ymd >= weekStartYmd) week += amt;
      if (when.ymd >= monthStartYmd) {
        month += amt;
        monthCount++;
        const m = String(s.paymentMethod || "other").toLowerCase();
        byMethod.set(m, (byMethod.get(m) || 0) + amt);
      }
    }
    const last7 = Array.from({ length: 7 }, (_, i) => {
      const ymd = addDaysYmd(weekStartYmd, i);
      return { ymd, value: byDay.get(ymd) || 0 };
    });
    return { today, yesterday, week, month, todayCount, monthCount, last7, byMethod, ready: !!overviewSalesRaw };
  }, [overviewSalesRaw, branchIds, clock, todayYmd, yesterdayYmd, weekStartYmd, monthStartYmd]);

  // ── Sales tab: selected period ─────────────────────────────────────────────
  const effectiveDates = useMemo(() => {
    if (periodFilter === "custom") {
      let from = dateFrom || dateTo;
      let to = dateTo || dateFrom;
      if (from && to && from > to) [from, to] = [to, from];
      return { from, to };
    }
    return getPeriodDates(periodFilter, todayYmd, specificDate || todayYmd);
  }, [periodFilter, dateFrom, dateTo, specificDate, todayYmd]);

  const salesQueryUrl = useMemo(
    () => (effectiveDates.from && effectiveDates.to ? salesRangeUrl(effectiveDates.from, effectiveDates.to, timeZone) : null),
    [effectiveDates, timeZone],
  );
  const {
    data: periodSalesRaw,
    isLoading: periodLoading,
    isError: periodQueryError,
    refetch: refetchPeriodQuery,
  } = useQuery<any[]>({
    queryKey: [salesQueryUrl],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!tenantId && !!salesQueryUrl && branchesLoaded,
  });

  const periodError = periodQueryError || branchesError;
  const refetchPeriod = () => { if (branchesError) refetchBranches(); else refetchPeriodQuery(); };

  useEffect(() => { setSalesVisible(LIST_PAGE); }, [salesQueryUrl]);

  const periodSales = useMemo(
    () => (periodSalesRaw || []).filter((s: any) => branchIds.has(Number(s.branchId))),
    [periodSalesRaw, branchIds],
  );

  const periodSummary = useMemo(() => {
    let gross = 0, tax = 0, discounts = 0, count = 0;
    for (const s of periodSales) {
      if (VOID_STATUSES.has(String(s.status || "").toLowerCase())) continue;
      gross += num(s.totalAmount);
      tax += num(s.taxAmount);
      discounts += num(s.discountAmount);
      count++;
    }
    let refunds = 0;
    if (effectiveDates.from && effectiveDates.to) {
      for (const r of tenantReturns) {
        const when = clock(r.createdAt);
        if (when && when.ymd >= effectiveDates.from && when.ymd <= effectiveDates.to) refunds += num(r.totalAmount);
      }
    }
    const net = gross - refunds;
    return { gross, tax, discounts, count, refunds, net, avg: count > 0 ? gross / count : 0 };
  }, [periodSales, tenantReturns, effectiveDates, clock]);

  const trend = useMemo(() => {
    const { from, to } = effectiveDates;
    if (!from || !to) return { values: [] as number[], firstLabel: "", lastLabel: "" };
    const span = daysBetweenYmd(from, to);
    const sums = new Map<string, number>();
    for (const s of periodSales) {
      if (VOID_STATUSES.has(String(s.status || "").toLowerCase())) continue;
      const when = clock(s.createdAt);
      if (!when) continue;
      const key = span === 0 ? String(when.hour) : span <= 62 ? when.ymd : when.ymd.slice(0, 7);
      sums.set(key, (sums.get(key) || 0) + num(s.totalAmount));
    }
    if (span === 0) {
      const values = Array.from({ length: 24 }, (_, h) => sums.get(String(h)) || 0);
      return { values, firstLabel: "00:00", lastLabel: "23:00" };
    }
    if (span <= 62) {
      const values = Array.from({ length: span + 1 }, (_, i) => sums.get(addDaysYmd(from, i)) || 0);
      return { values, firstLabel: formatYmd(from, lang, true), lastLabel: formatYmd(to, lang, true) };
    }
    const months: string[] = [];
    let [y, m] = from.split("-").map(Number);
    const [ty, tm] = to.split("-").map(Number);
    while (y < ty || (y === ty && m <= tm)) {
      months.push(`${y}-${pad2(m)}`);
      m++;
      if (m > 12) { m = 1; y++; }
    }
    const label = (ym: string) => `${MONTHS[lang][Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`;
    return { values: months.map((k) => sums.get(k) || 0), firstLabel: label(months[0]), lastLabel: label(months[months.length - 1]) };
  }, [effectiveDates, periodSales, clock, lang]);

  // ── Inventory: stock lives in /api/inventory, not on the product row ──────
  const stockByProduct = useMemo(() => {
    const map = new Map<number, { qty: number; threshold: number }>();
    for (const row of inventoryRows) {
      const id = Number(row.productId);
      const prev = map.get(id);
      const threshold = num(row.lowStockThreshold ?? 10);
      map.set(id, { qty: (prev?.qty || 0) + num(row.quantity), threshold: prev ? Math.max(prev.threshold, threshold) : threshold });
    }
    return map;
  }, [inventoryRows]);

  // ── Delivery (only fetched when the tab is open) ──────────────────────────
  const deliveryOpen = tab === "delivery";
  const { data: deliveryOrders = [], isLoading: deliveryLoading, isError: deliveryError, refetch: refetchDelivery } = useQuery<any[]>({
    queryKey: [`/api/delivery/manage/orders?tenantId=${tenantId}`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!tenantId && deliveryOpen,
  });
  const { data: drivers = [] } = useQuery<any[]>({
    queryKey: [`/api/delivery/manage/drivers?tenantId=${tenantId}`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!tenantId && deliveryOpen,
  });
  const { data: promos = [] } = useQuery<any[]>({
    queryKey: [`/api/delivery/promos?tenantId=${tenantId}`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!tenantId && deliveryOpen,
  });

  const deliveryStats = useMemo(() => {
    const since = addDaysYmd(todayYmd, -29);
    let deliveryCount = 0, pickupCount = 0, revenue = 0, fees = 0, pointsEarned = 0, pointsUsed = 0;
    let deliveredMinutesSum = 0, deliveredTimed = 0;
    const perDriver = new Map<number, { deliveries: number; minutes: number; timed: number; ratingSum: number; rated: number }>();
    const perPromo = new Map<number, { uses: number; discount: number }>();
    for (const o of deliveryOrders) {
      if (Number(o.tenantId) !== Number(tenantId)) continue;
      const when = clock(o.createdAt);
      if (!when || when.ymd < since) continue;
      const status = String(o.status || "").toLowerCase();
      if (status === "cancelled" || status === "canceled" || status === "rejected") continue;
      const type = String(o.orderType || "delivery").toLowerCase();
      if (type === "pickup") pickupCount++;
      else if (type === "delivery") deliveryCount++;
      revenue += num(o.totalAmount);
      fees += num(o.deliveryFee);
      pointsEarned += num(o.loyaltyPointsEarned);
      pointsUsed += num(o.loyaltyPointsUsed);
      let minutes: number | null = null;
      if (o.riderDeliveredAt && o.createdAt) {
        const m = (new Date(o.riderDeliveredAt).getTime() - new Date(o.createdAt).getTime()) / 60000;
        if (Number.isFinite(m) && m > 0 && m < 24 * 60) minutes = m;
      }
      if (minutes != null) { deliveredMinutesSum += minutes; deliveredTimed++; }
      if (o.driverId) {
        const d = perDriver.get(Number(o.driverId)) || { deliveries: 0, minutes: 0, timed: 0, ratingSum: 0, rated: 0 };
        if (status === "delivered") d.deliveries++;
        if (minutes != null) { d.minutes += minutes; d.timed++; }
        if (o.rating) { d.ratingSum += num(o.rating); d.rated++; }
        perDriver.set(Number(o.driverId), d);
      }
      if (o.promoCodeId) {
        const p = perPromo.get(Number(o.promoCodeId)) || { uses: 0, discount: 0 };
        p.uses++;
        p.discount += num(o.discountAmount);
        perPromo.set(Number(o.promoCodeId), p);
      }
    }
    const driverName = new Map(drivers.map((d: any) => [Number(d.id), d.driverName || d.licensePlate]));
    const promoCode = new Map(promos.map((p: any) => [Number(p.id), p.code]));
    return {
      deliveryCount,
      pickupCount,
      revenue,
      fees,
      pointsEarned,
      pointsUsed,
      avgMinutes: deliveredTimed > 0 ? Math.round(deliveredMinutesSum / deliveredTimed) : null,
      activeDrivers: drivers.filter((d: any) => d.driverStatus && d.driverStatus !== "offline").length,
      driverPerformance: Array.from(perDriver.entries())
        .map(([id, d]) => ({
          id,
          name: driverName.get(id) || `#${id}`,
          deliveries: d.deliveries,
          avgMinutes: d.timed > 0 ? Math.round(d.minutes / d.timed) : null,
          rating: d.rated > 0 ? d.ratingSum / d.rated : null,
        }))
        .sort((a, b) => b.deliveries - a.deliveries),
      promoUsage: Array.from(perPromo.entries())
        .map(([id, p]) => ({ id, code: promoCode.get(id) || `#${id}`, uses: p.uses, discount: p.discount }))
        .sort((a, b) => b.uses - a.uses),
    };
  }, [deliveryOrders, drivers, promos, clock, todayYmd, tenantId]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await qc.refetchQueries({ type: "active" });
    } finally {
      setRefreshing(false);
    }
  }, [qc]);

  const retryLabel = tr("Retry", "Erneut versuchen", "إعادة المحاولة");
  const loadError = tr(
    "Could not load this report. Check the connection and try again.",
    "Bericht konnte nicht geladen werden. Verbindung prüfen und erneut versuchen.",
    "تعذّر تحميل التقرير. تحقق من الاتصال وحاول مجدداً.",
  );
  const stillLoading = tr("The data is still loading. Try again in a moment.", "Die Daten werden noch geladen. Bitte gleich erneut versuchen.", "البيانات ما زالت قيد التحميل. حاول بعد لحظات.");
  const cur = getCurrency();

  // ── CSV exports (built from tenant-scoped data; the server exports are not) ──
  const exportSales = async () => {
    if (!periodSalesRaw) return notify(t("exportSalesCSV"), stillLoading);
    await exportCsv(`sales-${effectiveDates.from}-to-${effectiveDates.to}.csv`, [
      ["Receipt", "Date", `Subtotal (${cur})`, `Discount (${cur})`, `Tax (${cur})`, `Total (${cur})`, "Payment", "Status"],
      ...periodSales.map((s: any) => [
        getDisplayNumber(s.receiptNumber) || `#${s.id}`,
        fmtDateTime(s.createdAt),
        formatAmount(s.subtotal),
        formatAmount(s.discountAmount),
        formatAmount(s.taxAmount),
        formatAmount(s.totalAmount),
        s.paymentMethod,
        s.status,
      ]),
    ]);
  };
  const exportInventory = async () => {
    if (!allProducts.length) return notify(t("exportInventoryCSV"), stillLoading);
    await exportCsv(`inventory-${todayYmd}.csv`, [
      ["ID", "Name", "SKU", "Barcode", `Price (${cur})`, `Cost (${cur})`, "Stock", "Low stock threshold"],
      ...allProducts.map((p: any) => {
        const st = stockByProduct.get(Number(p.id));
        return [p.id, p.name, p.sku || "", p.barcode || "", formatAmount(p.price), formatAmount(p.costPrice || 0), st?.qty ?? 0, st?.threshold ?? ""];
      }),
    ]);
  };
  const exportProfit = async () => {
    if (!profitByProduct.length) return notify(t("exportProfitCSV"), t("noProfitData"));
    await exportCsv(`profit-${todayYmd}.csv`, [
      ["Product", "Sold", `Revenue (${cur})`, `Cost (${cur})`, `Profit (${cur})`, `Unit cost (${cur})`],
      ...profitByProduct.map((p: any) => [p.productName, p.totalSold, formatAmount(p.totalRevenue), formatAmount(p.totalCost), formatAmount(p.profit), formatAmount(p.costPrice)]),
    ]);
  };
  const exportPerformance = async () => {
    if (!cashierPerformance.length) return notify(t("exportPerformanceCSV"), t("noSalesData"));
    await exportCsv(`employee-performance-${todayYmd}.csv`, [
      ["Employee", "Role", "Sales", `Revenue (${cur})`, `Average sale (${cur})`],
      ...cashierPerformance.map((p: any) => [p.employeeName, p.role, p.salesCount, formatAmount(p.totalRevenue), formatAmount(p.avgSaleValue)]),
    ]);
  };
  const runExport = (fn: () => Promise<void>) => {
    fn().catch((e) => notify(tr("Export failed", "Export fehlgeschlagen", "فشل التصدير"), String(e?.message || e)));
  };

  if (isCashier) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + topPad, justifyContent: "center", alignItems: "center" }]}>
        <Ionicons name="lock-closed" size={64} color={Colors.textMuted} />
        <Text style={[{ color: Colors.text, fontSize: 20, fontWeight: "700", marginTop: 16 }, rtlTextAlign, rtlText]}>{t("accessRestricted")}</Text>
        <Text style={[{ color: Colors.textMuted, fontSize: 14, marginTop: 8, textAlign: "center", paddingHorizontal: 40 }, rtlText]}>
          {t("reportsForManagers")}
        </Text>
      </View>
    );
  }

  // Server figures are all-time and tenant-scoped; day/week/month come from store-local buckets.
  const todayRevenue = overview.ready ? overview.today : num(stats?.todayRevenue);
  const weekRevenue = overview.ready ? overview.week : num(stats?.weekRevenue);
  const monthRevenue = overview.ready ? overview.month : num(stats?.monthRevenue);
  const todaySalesCount = overview.ready ? overview.todayCount : num(stats?.todaySalesCount);
  const grossProfit = num(stats?.totalProfit);
  const totalRevenue = num(stats?.totalRevenue);
  const totalExpenses = num(stats?.totalExpenses);
  const netProfit = grossProfit - totalExpenses;
  const topProducts: any[] = stats?.topProducts ?? [];
  const revenueExpenseMax = Math.max(totalRevenue, totalExpenses, 1);
  const topProductMax = topProducts.length > 0 ? Math.max(...topProducts.map((p: any) => num(p.revenue)), 1) : 1;

  const growthVsYesterday = overview.ready && overview.yesterday > 0 ? ((overview.today - overview.yesterday) / overview.yesterday) * 100 : null;
  const dayOfMonth = Number(todayYmd.slice(8, 10)) || 1;
  const [ty, tm] = todayYmd.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(ty, tm, 0)).getUTCDate();
  const projectedMonth = overview.ready ? (overview.month / dayOfMonth) * daysInMonth : 0;
  const avgDaily = overview.ready ? overview.month / dayOfMonth : 0;

  const paymentColors = [Colors.accent, Colors.info, Colors.secondary, Colors.success, Colors.warning, Colors.danger];
  const paymentLabel = (m: string) => {
    switch (m) {
      case "cash": return tr("Cash", "Bar", "نقداً");
      case "card": return tr("Card", "Karte", "بطاقة");
      case "mobile": return tr("Mobile", "Mobil", "محفظة");
      case "split": return tr("Split", "Geteilt", "مقسّم");
      case "credit": return tr("On account", "Auf Rechnung", "آجل");
      default: return m;
    }
  };
  const statusLabel = (s: string) => {
    switch (String(s || "").toLowerCase()) {
      case "completed": return t("completed");
      case "pending": return t("pending");
      case "refunded": return tr("Refunded", "Erstattet", "مُسترد");
      case "voided": case "void": return tr("Voided", "Storniert", "ملغاة");
      case "cancelled": case "canceled": return tr("Cancelled", "Storniert", "ملغاة");
      default: return s || "—";
    }
  };

  const renderOverview = () => {
    const methodData = Array.from(overview.byMethod.entries())
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([m, v], i) => ({ label: paymentLabel(m), value: v, color: paymentColors[i % paymentColors.length] }));
    const insights: string[] = [];
    if (overview.ready) {
      insights.push(
        avgDaily > 0
          ? tr(`Average daily revenue this month: ${formatMoney(avgDaily, 2, { group: true })}`, `Durchschnittlicher Tagesumsatz diesen Monat: ${formatMoney(avgDaily, 2, { group: true })}`, `متوسط الإيراد اليومي هذا الشهر: ${formatMoney(avgDaily, 2, { group: true })}`)
          : tr("No sales yet this month.", "Diesen Monat noch keine Verkäufe.", "لا توجد مبيعات هذا الشهر بعد."),
      );
    }
    if (slowMovingProducts.length > 0) {
      insights.push(tr(
        `${slowMovingProducts.length} products sold fewer than 3 units in 30 days — consider a promotion.`,
        `${slowMovingProducts.length} Produkte wurden in 30 Tagen weniger als 3-mal verkauft – eine Aktion könnte helfen.`,
        `${slowMovingProducts.length} منتجاً بيع منه أقل من 3 وحدات خلال 30 يوماً — فكّر في عرض ترويجي.`,
      ));
    }
    if (lowStock.length > 0) {
      insights.push(tr(`${lowStock.length} items are at or below their low-stock level.`, `${lowStock.length} Artikel sind auf oder unter dem Mindestbestand.`, `${lowStock.length} صنفاً عند حد المخزون المنخفض أو دونه.`));
    }

    return (
      <>
        {/* Quick Actions */}
        <Text style={[styles.sectionTitle, { marginTop: 10 }, rtlTextAlign, rtlText]}>{t("quickActions" as any)}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 10 }}>
          {[
            { label: t("exportSalesCSV"), icon: "receipt", color: Colors.success, fn: exportSales },
            { label: t("exportInventoryCSV"), icon: "cube", color: Colors.info, fn: exportInventory },
            { label: t("exportProfitCSV"), icon: "wallet", color: Colors.accent, fn: exportProfit },
            { label: t("exportPerformanceCSV"), icon: "people", color: Colors.secondary, fn: exportPerformance },
          ].map((a) => (
            <Pressable key={a.label} onPress={() => runExport(a.fn)} style={({ pressed }) => [styles.actionBtn, { borderColor: a.color + "40", opacity: pressed ? 0.7 : 1 }]} accessibilityRole="button">
              <View style={[styles.actionIcon, { backgroundColor: a.color + "20" }]}>
                <Ionicons name={a.icon as any} size={16} color={a.color} />
              </View>
              <Text style={[styles.actionText, rtlText]} numberOfLines={2}>{a.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {overviewError && <ErrorCard message={loadError} retryLabel={retryLabel} onRetry={() => { refetchOverview(); refetchStats(); }} />}

        <Text style={[styles.sectionTitle, { marginTop: 10 }, rtlTextAlign, rtlText]}>{t("keyPerformanceIndicators" as any)}</Text>
        <View style={styles.statGrid}>
          <GlassCard style={styles.statCardHalf}>
            <View style={[styles.statIconWrap, { backgroundColor: Colors.accent + "15" }]}>
              <Ionicons name="today" size={20} color={Colors.accent} />
            </View>
            <Text style={[styles.statLabel, rtlTextAlign, rtlText]} numberOfLines={1}>{t("todayRevenue")}</Text>
            <Text style={[styles.statValue, rtlTextAlign]} numberOfLines={1} adjustsFontSizeToFit>{formatMoney(todayRevenue, 2, { group: true })}</Text>
            {growthVsYesterday != null ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4, flexWrap: "wrap" }}>
                <Ionicons name={growthVsYesterday >= 0 ? "trending-up" : "trending-down"} size={12} color={growthVsYesterday >= 0 ? Colors.success : Colors.danger} />
                <Text style={{ color: growthVsYesterday >= 0 ? Colors.success : Colors.danger, fontSize: 10, fontWeight: "700" }}>
                  {growthVsYesterday >= 0 ? "+" : ""}{growthVsYesterday.toFixed(1)}%
                </Text>
                <Text style={{ color: Colors.textMuted, fontSize: 9 }}>{tr("vs yesterday", "ggü. gestern", "مقارنة بالأمس")}</Text>
              </View>
            ) : (
              <Text style={[styles.statSub, rtlTextAlign, rtlText]}>{todaySalesCount} {t("transactions")}</Text>
            )}
          </GlassCard>
          <GlassCard style={styles.statCardHalf}>
            <View style={[styles.statIconWrap, { backgroundColor: Colors.info + "15" }]}>
              <Ionicons name="calendar" size={20} color={Colors.info} />
            </View>
            <Text style={[styles.statLabel, rtlTextAlign, rtlText]} numberOfLines={1}>{t("weekRevenue")}</Text>
            <Text style={[styles.statValue, rtlTextAlign]} numberOfLines={1} adjustsFontSizeToFit>{formatMoney(weekRevenue, 2, { group: true })}</Text>
            <Text style={[styles.statSub, rtlTextAlign, rtlText]}>{tr("Last 7 days", "Letzte 7 Tage", "آخر 7 أيام")}</Text>
          </GlassCard>
        </View>

        <View style={styles.statGrid}>
          <GlassCard style={styles.statCardHalf}>
            <View style={[styles.statIconWrap, { backgroundColor: Colors.secondary + "15" }]}>
              <Ionicons name="trending-up" size={20} color={Colors.secondary} />
            </View>
            <Text style={[styles.statLabel, rtlTextAlign, rtlText]} numberOfLines={1}>{t("monthRevenue")}</Text>
            <Text style={[styles.statValue, rtlTextAlign]} numberOfLines={1} adjustsFontSizeToFit>{formatMoney(monthRevenue, 2, { group: true })}</Text>
            {overview.ready && projectedMonth > 0 && (
              <Text style={[styles.statSub, rtlTextAlign, rtlText]} numberOfLines={1}>
                {tr("Forecast", "Prognose", "المتوقع")}: {formatMoney(projectedMonth, 0, { group: true })}
              </Text>
            )}
          </GlassCard>
          <GlassCard style={styles.statCardHalf}>
            <View style={[styles.statIconWrap, { backgroundColor: netProfit >= 0 ? Colors.success + "15" : Colors.danger + "15" }]}>
              <Ionicons name="cash" size={20} color={netProfit >= 0 ? Colors.success : Colors.danger} />
            </View>
            <Text style={[styles.statLabel, rtlTextAlign, rtlText]} numberOfLines={1}>{t("netProfit")}</Text>
            <Text style={[styles.statValue, { color: netProfit >= 0 ? Colors.success : Colors.danger }, rtlTextAlign]} numberOfLines={1} adjustsFontSizeToFit>
              {formatMoney(netProfit, 2, { group: true })}
            </Text>
            <Text style={[styles.statSub, rtlTextAlign, rtlText]} numberOfLines={1}>
              {tr("Gross profit", "Rohertrag", "إجمالي الربح")}: {formatMoney(grossProfit, 0, { group: true })}
            </Text>
          </GlassCard>
        </View>

        {/* Last 7 days */}
        <Text style={[styles.sectionTitle, rtlTextAlign, rtlText]}>{t("revenueOverview")} · {tr("last 7 days", "letzte 7 Tage", "آخر 7 أيام")}</Text>
        <GlassCard style={{ paddingVertical: 16 }}>
          {overview.ready ? (
            <BarChart
              data={overview.last7.map((d) => ({
                label: d.ymd === todayYmd ? t("today" as any) : WEEKDAY_SHORT[lang][weekdayOfYmd(d.ymd)],
                value: d.value,
                color: d.ymd === todayYmd ? Colors.accent : Colors.info,
              }))}
            />
          ) : overviewError ? null : (
            <ActivityIndicator color={Colors.accent} style={{ marginVertical: 40 }} />
          )}
        </GlassCard>

        {/* Payment methods (month to date) */}
        {methodData.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, rtlTextAlign, rtlText]}>{tr("Payment methods · this month", "Zahlungsarten · diesen Monat", "طرق الدفع · هذا الشهر")}</Text>
            <GlassCard style={{ alignItems: "center", paddingVertical: 20 }}>
              <DonutChart
                data={methodData}
                centerValue={compactNumber(overview.month)}
                centerLabel={`${overview.monthCount} ${t("transactions")}`}
              />
            </GlassCard>
          </>
        )}

        {/* Revenue vs expenses (all time) */}
        <Text style={[styles.sectionTitle, rtlTextAlign, rtlText]}>{t("revenueVsExpenses")} · {tr("all time", "gesamt", "الإجمالي")}</Text>
        <GlassCard>
          <View style={styles.revExpRow}>
            <View style={styles.revExpItem}>
              <View style={styles.revExpHeader}>
                <View style={[styles.revExpDot, { backgroundColor: Colors.accent }]} />
                <Text style={[styles.revExpLabel, rtlText]}>{t("revenue")}</Text>
              </View>
              <Text style={[styles.revExpValue, rtlTextAlign]} numberOfLines={1} adjustsFontSizeToFit>{formatMoney(totalRevenue, 2, { group: true })}</Text>
              <View style={[styles.barTrack, { height: 12, marginTop: 6 }]}>
                <LinearGradient
                  colors={[Colors.gradientStart, Colors.accent]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.barFillGradient, { width: `${(totalRevenue / revenueExpenseMax) * 100}%` }]}
                />
              </View>
            </View>
            <View style={styles.revExpItem}>
              <View style={styles.revExpHeader}>
                <View style={[styles.revExpDot, { backgroundColor: Colors.danger }]} />
                <Text style={[styles.revExpLabel, rtlText]}>{t("expenses")}</Text>
              </View>
              <Text style={[styles.revExpValue, rtlTextAlign]} numberOfLines={1} adjustsFontSizeToFit>{formatMoney(totalExpenses, 2, { group: true })}</Text>
              <View style={[styles.barTrack, { height: 12, marginTop: 6 }]}>
                <View style={[styles.barFill, { width: `${(totalExpenses / revenueExpenseMax) * 100}%`, backgroundColor: Colors.danger, height: 12 }]} />
              </View>
            </View>
          </View>
        </GlassCard>

        {/* Top products */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 18, marginBottom: 10 }}>
          <Text style={[styles.sectionTitle, { marginTop: 0, marginBottom: 0, flexShrink: 1 }, rtlText]}>{t("topProducts")}</Text>
          <Pressable onPress={() => setTab("finance")} hitSlop={10} style={styles.linkBtn} accessibilityRole="button">
            <Text style={{ color: Colors.accent, fontSize: 13, fontWeight: "600" }}>{t("viewAll" as any)}</Text>
          </Pressable>
        </View>
        {topProducts.length > 0 ? (
          <GlassCard style={{ padding: 8 }}>
            {topProducts.slice(0, 5).map((product: any, index: number) => (
              <View key={`${product.productId}-${index}`} style={[styles.topProductRow, { paddingHorizontal: 12 }, index < Math.min(topProducts.length, 5) - 1 && styles.topProductBorder]}>
                <View style={[styles.topProductRank, { backgroundColor: index === 0 ? "#FFD70033" : index === 1 ? "#C0C0C033" : Colors.accent + "15" }]}>
                  <Text style={[styles.topProductRankText, { color: index === 0 ? "#D4A800" : index === 1 ? "#9A9A9A" : Colors.accent }]}>{index + 1}</Text>
                </View>
                <View style={styles.topProductInfo}>
                  <Text style={[styles.topProductName, rtlTextAlign, rtlText]} numberOfLines={1}>{product.name}</Text>
                  <View style={[styles.topProductMeta, { marginBottom: 4 }]}>
                    <Text style={styles.topProductRevenue} numberOfLines={1}>{formatMoney(product.revenue || 0, 2, { group: true })}</Text>
                    <Text style={[styles.topProductQty, rtlText]} numberOfLines={1}>{num(product.totalSold)} {t("sold")}</Text>
                  </View>
                  <PercentBar percent={(num(product.revenue) / topProductMax) * 100} color={index === 0 ? "#D4A800" : Colors.accent} height={4} />
                </View>
              </View>
            ))}
          </GlassCard>
        ) : (
          <GlassCard>
            <View style={styles.empty}>
              <Ionicons name="bar-chart-outline" size={32} color={Colors.textMuted} />
              <Text style={[styles.emptyText, rtlText]}>{t("noProductData")}</Text>
            </View>
          </GlassCard>
        )}

        {/* Insights (computed from this store's data) */}
        <Text style={[styles.sectionTitle, rtlTextAlign, rtlText]}>{t("smartInsights")}</Text>
        <GlassCard style={{ borderStartWidth: 4, borderStartColor: Colors.warning }}>
          {insights.length > 0 ? (
            <View style={{ gap: 10 }}>
              {insights.map((insight, i) => (
                <View key={i} style={{ flexDirection: "row", gap: 10, alignItems: "flex-start", backgroundColor: Colors.surfaceLight + "80", padding: 10, borderRadius: 10 }}>
                  <View style={{ backgroundColor: Colors.warning + "20", padding: 4, borderRadius: 6 }}>
                    <Ionicons name="bulb" size={16} color={Colors.warning} />
                  </View>
                  <Text style={[{ color: Colors.textSecondary, fontSize: 13, flex: 1, lineHeight: 18 }, rtlTextAlign, rtlText]}>{insight}</Text>
                </View>
              ))}
            </View>
          ) : overviewError ? (
            <View style={styles.empty}>
              <Ionicons name="bulb-outline" size={28} color={Colors.textMuted} />
              <Text style={[styles.emptyText, rtlText]}>—</Text>
            </View>
          ) : (
            <View style={styles.empty}>
              <ActivityIndicator color={Colors.textMuted} />
              <Text style={[styles.emptyText, rtlText]}>{t("loadingPredictions")}</Text>
            </View>
          )}
        </GlassCard>
      </>
    );
  };

  const renderSaleItem = ({ item }: { item: any }) => {
    const methodColors: Record<string, string> = { cash: Colors.success, card: Colors.info, mobile: Colors.secondary };
    const method = String(item.paymentMethod || "").toLowerCase();
    const badgeColor = methodColors[method] || Colors.accent;
    const status = String(item.status || "").toLowerCase();
    const statusColor = status === "completed" ? Colors.success : status === "refunded" || VOID_STATUSES.has(status) ? Colors.danger : Colors.warning;

    return (
      <GlassCard style={styles.saleCard}>
        <View style={styles.saleTop}>
          <View style={styles.saleReceiptWrap}>
            <Ionicons name="receipt-outline" size={16} color={Colors.accent} />
            <Text style={[styles.saleReceipt, rtlText]} numberOfLines={1}>{getDisplayNumber(item.receiptNumber)}</Text>
          </View>
          <Text style={[styles.saleAmount, VOID_STATUSES.has(status) && { textDecorationLine: "line-through", color: Colors.textMuted }]} numberOfLines={1}>
            {formatMoney(item.totalAmount, 2, { group: true })}
          </Text>
        </View>
        <View style={styles.saleBottom}>
          <Text style={[styles.saleDate, rtlText]} numberOfLines={1}>{fmtDateTime(item.createdAt)}</Text>
          <View style={styles.saleBadges}>
            <View style={[styles.badge, { backgroundColor: badgeColor + "20" }]}>
              <Text style={[styles.badgeText, { color: badgeColor }, rtlText]}>{paymentLabel(method)}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: statusColor + "20" }]}>
              <Text style={[styles.badgeText, { color: statusColor }, rtlText]}>{statusLabel(item.status)}</Text>
            </View>
          </View>
        </View>
      </GlassCard>
    );
  };

  const renderSales = () => {
    const PERIOD_BTNS: { key: PeriodFilter; label: string; icon: string }[] = [
      { key: "daily", label: t("daily" as any), icon: "today" },
      { key: "yesterday", label: t("yesterday" as any), icon: "arrow-undo" },
      { key: "specific", label: t("specificDay" as any), icon: "calendar" },
      { key: "weekly", label: t("weekly" as any), icon: "calendar-outline" },
      { key: "monthly", label: t("monthly" as any), icon: "calendar-clear" },
      { key: "annual", label: t("annual" as any), icon: "calendar-number" },
      { key: "custom", label: t("dateFilter"), icon: "options" },
    ];
    const rangeText = effectiveDates.from
      ? effectiveDates.from === effectiveDates.to
        ? formatYmd(effectiveDates.from, lang)
        : `${formatYmd(effectiveDates.from, lang)} – ${formatYmd(effectiveDates.to, lang)}`
      : tr("Pick a start and end date", "Start- und Enddatum wählen", "اختر تاريخ البداية والنهاية");
    const dateBtnStyle = { backgroundColor: Colors.surfaceLight, borderRadius: 10, paddingHorizontal: 12, minHeight: 44, flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "space-between" as const, gap: 8, borderWidth: 1, borderColor: Colors.cardBorder };
    const summaryTiles = [
      { label: tr("Gross sales", "Bruttoumsatz", "إجمالي المبيعات"), value: periodSummary.gross, color: Colors.text },
      { label: tr("Refunds", "Erstattungen", "المرتجعات"), value: -periodSummary.refunds, color: periodSummary.refunds > 0 ? Colors.danger : Colors.text },
      { label: tr("Net sales", "Nettoumsatz", "صافي المبيعات"), value: periodSummary.net, color: Colors.accent },
      { label: tr("Average sale", "Ø Verkauf", "متوسط الفاتورة"), value: periodSummary.avg, color: Colors.text },
    ];

    return (
      <>
        <Text style={[styles.sectionTitle, rtlTextAlign, rtlText]}>{t("filterPeriod" as any)}</Text>
        <GlassCard style={{ padding: 12 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
            {PERIOD_BTNS.map(({ key, label, icon }) => {
              const active = periodFilter === key;
              return (
                <Pressable
                  key={key}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => {
                    setPeriodFilter(key);
                    if (key === "custom" && !dateFrom && !dateTo) { setDateFrom(`${todayYmd.slice(0, 8)}01`); setDateTo(todayYmd); }
                  }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    paddingHorizontal: 14,
                    minHeight: 44,
                    borderRadius: 12,
                    backgroundColor: active ? Colors.accent : Colors.surfaceLight,
                    borderWidth: 1.5,
                    borderColor: active ? Colors.accent : Colors.cardBorder,
                  }}
                >
                  <Ionicons name={icon as any} size={16} color={active ? Colors.textDark : Colors.textMuted} />
                  <Text style={{ color: active ? Colors.textDark : Colors.textSecondary, fontSize: 13, fontWeight: "700" }}>{label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {periodFilter === "specific" && (
            <View style={styles.filterPanel}>
              <Text style={[styles.filterPanelLabel, rtlTextAlign, rtlText]}>{t("specificDay" as any)}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Pressable onPress={() => setShowDatePicker("specific")} style={[dateBtnStyle, { flex: 1 }]} accessibilityRole="button">
                  <Ionicons name="calendar" size={18} color={Colors.accent} />
                  <Text style={[{ flex: 1, color: Colors.text, fontSize: 15 }, rtlTextAlign, rtlText]} numberOfLines={1}>
                    {formatYmd(specificDate || todayYmd, lang)}
                  </Text>
                  <Ionicons name="chevron-down" size={14} color={Colors.textMuted} />
                </Pressable>
                <Pressable onPress={() => setSpecificDate(todayYmd)} style={{ backgroundColor: Colors.accent + "20", paddingHorizontal: 14, minHeight: 44, justifyContent: "center", borderRadius: 10 }} accessibilityRole="button">
                  <Text style={{ color: Colors.accent, fontWeight: "700", fontSize: 12 }}>{t("today" as any)}</Text>
                </Pressable>
              </View>
            </View>
          )}

          {periodFilter === "custom" && (
            <View style={styles.filterPanel}>
              <Text style={[styles.filterPanelLabel, rtlTextAlign, rtlText]}>{tr("Date range", "Zeitraum", "النطاق الزمني")}</Text>
              <View style={{ flexDirection: "row", gap: 10 }}>
                {(["from", "to"] as const).map((which) => {
                  const value = which === "from" ? dateFrom : dateTo;
                  return (
                    <View key={which} style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[{ color: Colors.textSecondary, fontSize: 11, marginBottom: 4 }, rtlTextAlign, rtlText]}>{t(which)}</Text>
                      <Pressable onPress={() => setShowDatePicker(which)} style={dateBtnStyle} accessibilityRole="button">
                        <Text style={{ color: value ? Colors.text : Colors.textMuted, fontSize: 13, flexShrink: 1 }} numberOfLines={1}>
                          {value ? formatYmd(value, lang, true) : "—"}
                        </Text>
                        <Ionicons name="calendar-outline" size={14} color={Colors.accent} />
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Period summary */}
          <View style={{ marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.cardBorder }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[{ color: Colors.textMuted, fontSize: 12 }, rtlTextAlign, rtlText]} numberOfLines={1}>
                  {periodSummary.count} {t("salesFoundInRange")}
                </Text>
                <Text style={[{ color: Colors.textSecondary, fontSize: 11, marginTop: 2 }, rtlTextAlign, rtlText]} numberOfLines={2}>{rangeText}</Text>
              </View>
              <Pressable onPress={() => runExport(exportSales)} style={styles.exportChip} accessibilityRole="button" accessibilityLabel={t("exportSalesCSV")}>
                <Ionicons name="download-outline" size={16} color={Colors.accent} />
                <Text style={{ color: Colors.accent, fontSize: 12, fontWeight: "700" }}>CSV</Text>
              </Pressable>
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
              {summaryTiles.map((tile) => (
                <View key={tile.label} style={styles.summaryTile}>
                  <Text style={[{ color: Colors.textMuted, fontSize: 11, fontWeight: "600" }, rtlTextAlign, rtlText]} numberOfLines={1}>{tile.label}</Text>
                  <Text style={[{ color: tile.color, fontSize: 17, fontWeight: "800", marginTop: 2 }, rtlTextAlign]} numberOfLines={1} adjustsFontSizeToFit>
                    {formatMoney(tile.value, 2, { group: true })}
                  </Text>
                </View>
              ))}
            </View>
            <Text style={[{ color: Colors.textMuted, fontSize: 11, marginTop: 10 }, rtlTextAlign, rtlText]}>
              {tr("Tax", "MwSt.", "الضريبة")}: {formatMoney(periodSummary.tax, 2, { group: true })}  ·  {tr("Discounts", "Rabatte", "الخصومات")}: {formatMoney(periodSummary.discounts, 2, { group: true })}
            </Text>
          </View>
        </GlassCard>

        {periodError ? (
          <ErrorCard message={loadError} retryLabel={retryLabel} onRetry={() => refetchPeriod()} />
        ) : periodLoading && salesQueryUrl ? (
          <GlassCard><ActivityIndicator color={Colors.accent} style={{ marginVertical: 24 }} /></GlassCard>
        ) : null}

        {trend.values.some((v) => v > 0) && (
          <>
            <Text style={[styles.sectionTitle, rtlTextAlign, rtlText]}>{t("salesTrend")}</Text>
            <GlassCard>
              <MiniLineChart data={trend.values} color={Colors.accent} height={140} rtl={isRTL} />
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 12, paddingHorizontal: 4 }}>
                <Text style={{ color: Colors.textSecondary, fontSize: 10 }}>{trend.firstLabel}</Text>
                <Text style={{ color: Colors.textMuted, fontSize: 10 }}>{tr("peak", "Spitze", "الذروة")}: {compactNumber(Math.max(...trend.values))}</Text>
                <Text style={{ color: Colors.textSecondary, fontSize: 10 }}>{trend.lastLabel}</Text>
              </View>
            </GlassCard>
          </>
        )}

        <Text style={[styles.sectionTitle, rtlTextAlign, rtlText]}>{t("recentSales")}</Text>
        <FlatList
          data={periodSales.slice(0, salesVisible)}
          keyExtractor={(item: any) => String(item.id)}
          renderItem={renderSaleItem}
          scrollEnabled={false}
          ListEmptyComponent={
            periodLoading || periodError ? null : (
              <GlassCard>
                <View style={styles.empty}>
                  <Ionicons name="receipt-outline" size={44} color={Colors.textMuted} />
                  <Text style={[styles.emptyText, { fontSize: 16, fontWeight: "600" }, rtlText]}>{t("noSalesData")}</Text>
                  <Text style={[{ color: Colors.textMuted, fontSize: 12, textAlign: "center", paddingHorizontal: 20 }, rtlText]}>
                    {tr("No sales in this period. Try another date range.", "Keine Verkäufe in diesem Zeitraum. Anderen Zeitraum wählen.", "لا توجد مبيعات في هذه الفترة. جرّب نطاقاً آخر.")}
                  </Text>
                </View>
              </GlassCard>
            )
          }
          ListFooterComponent={
            periodSales.length > salesVisible ? (
              <Pressable onPress={() => setSalesVisible((v) => v + LIST_PAGE)} style={styles.showMoreBtn} accessibilityRole="button">
                <Text style={styles.showMoreText}>
                  {tr("Show more", "Mehr anzeigen", "عرض المزيد")} ({periodSales.length - salesVisible})
                </Text>
              </Pressable>
            ) : null
          }
        />
        <DatePickerModal
          visible={!!showDatePicker}
          onClose={() => setShowDatePicker(null)}
          todayYmd={todayYmd}
          lang={lang}
          isRTL={isRTL}
          closeLabel={tr("Close", "Schließen", "إغلاق")}
          currentDate={showDatePicker === "from" ? dateFrom : showDatePicker === "to" ? dateTo : specificDate || todayYmd}
          onSelect={(date) => {
            if (showDatePicker === "specific") setSpecificDate(date);
            else if (showDatePicker === "from") setDateFrom(date);
            else if (showDatePicker === "to") setDateTo(date);
          }}
        />
      </>
    );
  };

  const renderInventory = () => {
    const tracked = allProducts.filter((p: any) => p.trackInventory !== false);
    const totalStockValue = tracked.reduce((sum: number, p: any) => sum + Math.max(stockByProduct.get(Number(p.id))?.qty || 0, 0) * num(p.price), 0);
    const lowStockCount = lowStock.length;
    const movementLabel = (type: string) => {
      switch (type) {
        case "sale": return tr("Sale", "Verkauf", "بيع");
        case "return": return tr("Return", "Rückgabe", "مرتجع");
        case "adjustment": return tr("Adjustment", "Korrektur", "تعديل");
        case "transfer": return tr("Transfer", "Umlagerung", "تحويل");
        case "purchase": return tr("Purchase", "Einkauf", "شراء");
        case "count": return tr("Stock count", "Inventur", "جرد");
        default: return type;
      }
    };
    const productName = (id: number) => allProducts.find((p: any) => Number(p.id) === Number(id))?.name || `#${id}`;

    return (
      <>
        <View style={styles.statGrid}>
          <GlassCard style={styles.statCardHalf}>
            <View style={[styles.statIconWrap, { backgroundColor: Colors.accent + "15" }]}>
              <Ionicons name="cube" size={20} color={Colors.accent} />
            </View>
            <Text style={[styles.statLabel, rtlTextAlign, rtlText]} numberOfLines={1}>{tr("Stock value (retail)", "Lagerwert (Verkauf)", "قيمة المخزون (بسعر البيع)")}</Text>
            <Text style={[styles.statValue, rtlTextAlign]} numberOfLines={1} adjustsFontSizeToFit>{formatMoney(totalStockValue, 0, { group: true })}</Text>
            <Text style={[styles.statSub, rtlTextAlign, rtlText]}>{allProducts.length} {t("products")}</Text>
          </GlassCard>
          <GlassCard style={styles.statCardHalf}>
            <View style={[styles.statIconWrap, { backgroundColor: lowStockCount > 0 ? Colors.danger + "15" : Colors.success + "15" }]}>
              <Ionicons name="alert-circle" size={20} color={lowStockCount > 0 ? Colors.danger : Colors.success} />
            </View>
            <Text style={[styles.statLabel, rtlTextAlign, rtlText]} numberOfLines={1}>{tr("Low stock items", "Artikel mit wenig Bestand", "أصناف منخفضة المخزون")}</Text>
            <Text style={[styles.statValue, { color: lowStockCount > 0 ? Colors.danger : Colors.success }, rtlTextAlign]}>{lowStockCount}</Text>
            <Text style={[styles.statSub, rtlTextAlign, rtlText]} numberOfLines={1}>
              {lowStockCount > 0 ? tr("Needs attention", "Handlungsbedarf", "تحتاج إلى متابعة") : tr("Inventory is healthy", "Bestand in Ordnung", "المخزون بحالة جيدة")}
            </Text>
          </GlassCard>
        </View>

        <Text style={[styles.sectionTitle, rtlTextAlign, rtlText]}>{t("stockAlerts")}</Text>
        {lowStock.length > 0 ? (
          <View>
            {lowStock.slice(0, 8).map((item: any) => {
              const qty = num(item.quantity);
              const threshold = num(item.lowStockThreshold ?? 10);
              const pct = threshold > 0 ? Math.min((qty / threshold) * 100, 100) : 0;
              return (
                <GlassCard key={item.id} style={styles.stockAlertCard}>
                  <View style={styles.stockAlertLeft}>
                    <View style={[styles.stockAlertIcon, { backgroundColor: Colors.danger + "15" }]}>
                      <Ionicons name="warning" size={20} color={Colors.danger} />
                    </View>
                    <View style={styles.stockAlertInfo}>
                      <Text style={[styles.stockAlertName, rtlTextAlign, rtlText]} numberOfLines={1}>{productName(item.productId)}</Text>
                      <Text style={[styles.stockAlertMeta, rtlTextAlign, rtlText]}>{t("threshold")}: {threshold}</Text>
                      <PercentBar percent={pct} color={qty <= 0 ? Colors.danger : Colors.warning} height={4} />
                    </View>
                  </View>
                  <View style={[styles.stockAlertRight, { marginStart: 12 }]}>
                    <Text style={[styles.stockAlertQty, { color: qty <= 0 ? Colors.danger : Colors.warning }]}>{qty}</Text>
                    <Text style={[styles.stockAlertUnit, rtlText]}>{t("left")}</Text>
                  </View>
                </GlassCard>
              );
            })}
          </View>
        ) : (
          <GlassCard>
            <View style={styles.empty}>
              <Ionicons name="checkmark-circle" size={40} color={Colors.success} />
              <Text style={[styles.emptyText, rtlText]}>{t("allStockHealthy")}</Text>
            </View>
          </GlassCard>
        )}

        <Text style={[styles.sectionTitle, rtlTextAlign, rtlText]}>{t("recentMovements")}</Text>
        {inventoryMovements.length > 0 ? (
          <View style={{ marginBottom: 12 }}>
            {inventoryMovements.slice(0, 8).map((item: any) => {
              const typeColors: Record<string, string> = { sale: Colors.success, return: Colors.warning, adjustment: Colors.info, transfer: Colors.secondary, purchase: Colors.accent, count: Colors.danger };
              const typeIcons: Record<string, string> = { sale: "cart", return: "swap-horizontal", adjustment: "construct", transfer: "repeat", purchase: "cube", count: "clipboard" };
              const color = typeColors[item.type] || Colors.textMuted;
              const qty = num(item.quantity);
              return (
                <GlassCard key={item.id} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12, marginBottom: 8 }}>
                  <View style={[styles.paymentIcon, { backgroundColor: color + "15" }]}>
                    <Ionicons name={(typeIcons[item.type] || "ellipse") as any} size={16} color={color} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[{ color: Colors.text, fontSize: 13, fontWeight: "600" }, rtlTextAlign, rtlText]} numberOfLines={1}>
                      {productName(item.productId)} · {movementLabel(item.type)}
                    </Text>
                    {item.notes ? <Text style={[{ color: Colors.textSecondary, fontSize: 11 }, rtlTextAlign, rtlText]} numberOfLines={1}>{item.notes}</Text> : null}
                    <Text style={[{ color: Colors.textMuted, fontSize: 11 }, rtlTextAlign, rtlText]}>{fmtDateTime(item.createdAt)}</Text>
                  </View>
                  <Text style={{ color: qty > 0 ? Colors.success : Colors.danger, fontSize: 14, fontWeight: "700" }}>
                    {qty > 0 ? "+" : ""}{qty}
                  </Text>
                </GlassCard>
              );
            })}
          </View>
        ) : (
          <GlassCard>
            <View style={styles.empty}>
              <Ionicons name="swap-vertical-outline" size={32} color={Colors.textMuted} />
              <Text style={[styles.emptyText, rtlText]}>{t("noMovements")}</Text>
            </View>
          </GlassCard>
        )}

        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 18, marginBottom: 12 }}>
          <Text style={[styles.sectionTitle, { marginTop: 0, marginBottom: 0, flexShrink: 1 }, rtlText]}>{t("fullInventory")}</Text>
          <View style={{ backgroundColor: Colors.accent + "20", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
            <Text style={{ color: Colors.accent, fontSize: 11, fontWeight: "700" }}>{allProducts.length}</Text>
          </View>
        </View>
        <FlatList
          data={allProducts.slice(0, productsVisible)}
          keyExtractor={(item: any) => String(item.id)}
          scrollEnabled={false}
          renderItem={({ item }: { item: any }) => {
            const st = stockByProduct.get(Number(item.id));
            const qty = st?.qty ?? 0;
            const threshold = st?.threshold ?? 10;
            const trackedItem = item.trackInventory !== false;
            const qtyColor = !trackedItem ? Colors.textMuted : qty <= threshold ? Colors.danger : qty <= threshold * 1.5 ? Colors.warning : Colors.success;
            return (
              <GlassCard style={[styles.inventoryCard, { padding: 12 }]}>
                <View style={styles.inventoryLeft}>
                  <View style={[styles.inventoryIcon, { backgroundColor: Colors.accent + "10" }]}>
                    <Ionicons name="cube-outline" size={18} color={Colors.accent} />
                  </View>
                  <View style={styles.inventoryInfo}>
                    <Text style={[styles.inventoryName, rtlTextAlign, rtlText]} numberOfLines={1}>{item.name}</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Text style={[styles.inventoryPrice, { marginTop: 0 }]} numberOfLines={1}>{formatMoney(item.price || 0, 2, { group: true })}</Text>
                      {item.sku ? (
                        <>
                          <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: Colors.textMuted }} />
                          <Text style={{ color: Colors.textMuted, fontSize: 10, flexShrink: 1 }} numberOfLines={1}>SKU {item.sku}</Text>
                        </>
                      ) : null}
                    </View>
                  </View>
                </View>
                <View style={[styles.inventoryRight, { marginStart: 12, alignItems: "flex-end" }]}>
                  <Text style={[styles.inventoryQty, { fontSize: 16, color: qtyColor }]}>{trackedItem ? qty : "—"}</Text>
                  <Text style={[styles.inventoryUnit, { fontSize: 9 }, rtlText]}>{t("inStock")}</Text>
                </View>
              </GlassCard>
            );
          }}
          ListEmptyComponent={
            <GlassCard>
              <View style={styles.empty}>
                <Ionicons name="cube-outline" size={40} color={Colors.textMuted} />
                <Text style={[styles.emptyText, rtlText]}>{t("noProductsInInventory")}</Text>
              </View>
            </GlassCard>
          }
          ListFooterComponent={
            allProducts.length > productsVisible ? (
              <Pressable onPress={() => setProductsVisible((v) => v + LIST_PAGE)} style={styles.showMoreBtn} accessibilityRole="button">
                <Text style={styles.showMoreText}>{tr("Show more", "Mehr anzeigen", "عرض المزيد")} ({allProducts.length - productsVisible})</Text>
              </Pressable>
            ) : null
          }
        />
      </>
    );
  };

  const renderActivity = () => {
    const getActionIcon = (action: string) => {
      switch (action) {
        case "sale_created": return "cart";
        case "login": return "log-in";
        case "return_created": return "swap-horizontal";
        case "shift_closed": return "time";
        default: return "ellipse";
      }
    };
    const getActionColor = (action: string) => {
      switch (action) {
        case "sale_created": return Colors.success;
        case "login": return Colors.info;
        case "return_created": return Colors.warning;
        case "shift_closed": return Colors.secondary;
        default: return Colors.textMuted;
      }
    };
    const actionLabel = (action: string) => {
      switch (action) {
        case "sale_created": return tr("Sale", "Verkauf", "بيع");
        case "login": return tr("Login", "Anmeldung", "تسجيل دخول");
        case "return_created": return tr("Return", "Rückgabe", "مرتجع");
        case "shift_closed": return tr("Shift closed", "Schicht beendet", "إغلاق وردية");
        default: return String(action || "").replace(/_/g, " ");
      }
    };
    return (
      <>
        <Text style={[styles.sectionTitle, rtlTextAlign, rtlText]}>{t("recentActivity")}</Text>
        {activityError && <ErrorCard message={loadError} retryLabel={retryLabel} onRetry={() => refetchActivity()} />}
        <FlatList
          data={activityLog}
          keyExtractor={(item: any) => String(item.id)}
          scrollEnabled={false}
          renderItem={({ item }: { item: any }) => {
            const action = String(item.action || "");
            const color = getActionColor(action);
            return (
              <GlassCard style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 }}>
                <View style={[styles.paymentIcon, { backgroundColor: color + "20" }]}>
                  <Ionicons name={getActionIcon(action) as any} size={18} color={color} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[{ color: Colors.text, fontSize: 14, fontWeight: "600" }, rtlTextAlign, rtlText]} numberOfLines={2}>{item.details || actionLabel(action)}</Text>
                  <Text style={[{ color: Colors.textMuted, fontSize: 11, marginTop: 2 }, rtlTextAlign, rtlText]}>{fmtDateTime(item.createdAt)}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: color + "20" }]}>
                  <Text style={[styles.badgeText, { color }, rtlText]} numberOfLines={1}>{actionLabel(action)}</Text>
                </View>
              </GlassCard>
            );
          }}
          ListEmptyComponent={
            activityError ? null : (
              <GlassCard>
                <View style={styles.empty}>
                  <Ionicons name="list-outline" size={40} color={Colors.textMuted} />
                  <Text style={[styles.emptyText, rtlText]}>{t("noActivityRecorded")}</Text>
                </View>
              </GlassCard>
            )
          }
        />
      </>
    );
  };

  const renderDelivery = () => {
    const d = deliveryStats;
    const totalOrders = d.deliveryCount + d.pickupCount;
    return (
      <>
        <Text style={[{ color: Colors.textMuted, fontSize: 12, marginTop: 12 }, rtlTextAlign, rtlText]}>
          {tr("Online orders · last 30 days", "Online-Bestellungen · letzte 30 Tage", "الطلبات الإلكترونية · آخر 30 يوماً")}
        </Text>
        {deliveryError && <ErrorCard message={loadError} retryLabel={retryLabel} onRetry={() => refetchDelivery()} />}
        {deliveryLoading && <GlassCard><ActivityIndicator color={Colors.accent} style={{ marginVertical: 24 }} /></GlassCard>}

        <View style={[styles.statGrid, { marginTop: 8 }]}>
          <GlassCard style={styles.statCardHalf}>
            <View style={[styles.statIconWrap, { backgroundColor: Colors.deliveryPrimary + "20" }]}>
              <Ionicons name="bicycle" size={20} color={Colors.deliveryPrimary} />
            </View>
            <Text style={[styles.statLabel, rtlTextAlign, rtlText]} numberOfLines={1}>{tr("Delivery orders", "Lieferungen", "طلبات التوصيل")}</Text>
            <Text style={[styles.statValue, rtlTextAlign]}>{d.deliveryCount}</Text>
          </GlassCard>
          <GlassCard style={styles.statCardHalf}>
            <View style={[styles.statIconWrap, { backgroundColor: Colors.info + "20" }]}>
              <Ionicons name="time" size={20} color={Colors.info} />
            </View>
            <Text style={[styles.statLabel, rtlTextAlign, rtlText]} numberOfLines={1}>{t("avgDeliveryTime")}</Text>
            <Text style={[styles.statValue, rtlTextAlign]}>
              {d.avgMinutes != null ? d.avgMinutes : "—"}
              <Text style={{ fontSize: 12 }}> {tr("min", "Min.", "دقيقة")}</Text>
            </Text>
          </GlassCard>
        </View>
        <View style={styles.statGrid}>
          <GlassCard style={styles.statCardHalf}>
            <View style={[styles.statIconWrap, { backgroundColor: Colors.driverOnline + "20" }]}>
              <Ionicons name="car" size={20} color={Colors.driverOnline} />
            </View>
            <Text style={[styles.statLabel, rtlTextAlign, rtlText]} numberOfLines={1}>{t("activeDrivers")}</Text>
            <Text style={[styles.statValue, rtlTextAlign]}>{d.activeDrivers}</Text>
            <Text style={[styles.statSub, rtlTextAlign, rtlText]}>{tr(`${drivers.length} in total`, `${drivers.length} insgesamt`, `${drivers.length} إجمالاً`)}</Text>
          </GlassCard>
          <GlassCard style={styles.statCardHalf}>
            <View style={[styles.statIconWrap, { backgroundColor: Colors.success + "20" }]}>
              <Ionicons name="cash" size={20} color={Colors.success} />
            </View>
            <Text style={[styles.statLabel, rtlTextAlign, rtlText]} numberOfLines={1}>{t("deliveryRevenue")}</Text>
            <Text style={[styles.statValue, rtlTextAlign]} numberOfLines={1} adjustsFontSizeToFit>{formatMoney(d.revenue, 2, { group: true })}</Text>
            <Text style={[styles.statSub, rtlTextAlign, rtlText]} numberOfLines={1}>{tr("Fees", "Gebühren", "الرسوم")}: {formatMoney(d.fees, 2, { group: true })}</Text>
          </GlassCard>
        </View>

        <Text style={[styles.sectionTitle, rtlTextAlign, rtlText]}>{t("deliveryVsPickup")}</Text>
        <GlassCard style={{ alignItems: "center", paddingVertical: 20 }}>
          {totalOrders > 0 ? (
            <DonutChart
              size={160}
              centerValue={String(totalOrders)}
              centerLabel={t("orders")}
              data={[
                { label: t("delivery"), value: d.deliveryCount, color: Colors.deliveryPrimary },
                { label: t("pickup"), value: d.pickupCount, color: Colors.statusReady },
              ]}
            />
          ) : (
            <View style={styles.empty}>
              <Ionicons name="bicycle-outline" size={40} color={Colors.textMuted} />
              <Text style={[styles.emptyText, rtlText]}>{t("noDeliveryData")}</Text>
            </View>
          )}
        </GlassCard>

        <Text style={[styles.sectionTitle, rtlTextAlign, rtlText]}>{t("driverPerformance")}</Text>
        <GlassCard style={{ padding: 0 }}>
          {d.driverPerformance.length === 0 ? (
            <View style={[styles.empty, { paddingVertical: 24 }]}>
              <Ionicons name="car-outline" size={36} color={Colors.textMuted} />
              <Text style={[styles.emptyText, rtlText]}>{t("noDriverData")}</Text>
            </View>
          ) : (
            d.driverPerformance.map((driver, i) => (
              <View
                key={driver.id}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  padding: 14,
                  borderBottomWidth: i < d.driverPerformance.length - 1 ? 1 : 0,
                  borderBottomColor: Colors.border,
                }}
              >
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.deliveryPrimary + "20", alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="car-outline" size={16} color={Colors.deliveryPrimary} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[{ color: Colors.text, fontSize: 14, fontWeight: "600" }, rtlTextAlign, rtlText]} numberOfLines={1}>{driver.name}</Text>
                  <View style={{ flexDirection: "row", gap: 8, marginTop: 3, flexWrap: "wrap" }}>
                    <Text style={{ color: Colors.textMuted, fontSize: 11 }}>{driver.deliveries} {t("deliveries")}</Text>
                    {driver.rating != null && (
                      <Text style={{ color: Colors.textMuted, fontSize: 11 }}>· ★ {driver.rating.toFixed(1)}</Text>
                    )}
                  </View>
                </View>
                <View style={[styles.badge, { backgroundColor: Colors.driverOnline + "20" }]}>
                  <Text style={[styles.badgeText, { color: Colors.driverOnline }]}>
                    {driver.avgMinutes != null ? `${driver.avgMinutes} ${tr("min", "Min.", "د")}` : "—"}
                  </Text>
                </View>
              </View>
            ))
          )}
        </GlassCard>

        <Text style={[styles.sectionTitle, rtlTextAlign, rtlText]}>{t("promoCodeUsage")}</Text>
        <GlassCard>
          {d.promoUsage.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="pricetag-outline" size={36} color={Colors.textMuted} />
              <Text style={[styles.emptyText, rtlText]}>{t("noPromoData")}</Text>
            </View>
          ) : (
            d.promoUsage.map((promo, i) => (
              <View
                key={promo.id}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 8,
                  paddingVertical: 10,
                  borderBottomWidth: i < d.promoUsage.length - 1 ? 1 : 0,
                  borderBottomColor: Colors.border,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 1 }}>
                  <View style={{ backgroundColor: Colors.accent + "20", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                    <Text style={{ color: Colors.accent, fontWeight: "700", fontSize: 12 }} numberOfLines={1}>{promo.code}</Text>
                  </View>
                  <Text style={{ color: Colors.textMuted, fontSize: 12 }}>{promo.uses} {t("uses")}</Text>
                </View>
                <Text style={{ color: Colors.danger, fontSize: 13, fontWeight: "600" }}>-{formatMoney(promo.discount, 2, { group: true })}</Text>
              </View>
            ))
          )}
        </GlassCard>

        <Text style={[styles.sectionTitle, rtlTextAlign, rtlText]}>{t("loyaltySummary")}</Text>
        <GlassCard>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <View style={{ alignItems: "center", flex: 1 }}>
              <View style={{ backgroundColor: Colors.loyaltyGold + "20", width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", marginBottom: 6 }}>
                <Ionicons name="star" size={22} color={Colors.loyaltyGold} />
              </View>
              <Text style={{ color: Colors.text, fontSize: 20, fontWeight: "800" }}>{formatAmount(d.pointsEarned, 0, { group: true })}</Text>
              <Text style={{ color: Colors.textMuted, fontSize: 11, marginTop: 2, textAlign: "center" }}>{t("pointsEarned")}</Text>
            </View>
            <View style={{ width: 1, backgroundColor: Colors.border }} />
            <View style={{ alignItems: "center", flex: 1 }}>
              <View style={{ backgroundColor: Colors.deliveryPrimary + "20", width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", marginBottom: 6 }}>
                <Ionicons name="gift" size={22} color={Colors.deliveryPrimary} />
              </View>
              <Text style={{ color: Colors.text, fontSize: 20, fontWeight: "800" }}>{formatAmount(d.pointsUsed, 0, { group: true })}</Text>
              <Text style={{ color: Colors.textMuted, fontSize: 11, marginTop: 2, textAlign: "center" }}>{t("pointsRedeemed")}</Text>
            </View>
          </View>
        </GlassCard>
      </>
    );
  };

  const renderReturns = () => {
    const totalRefundAmount = tenantReturns.reduce((s: number, r: any) => s + num(r.totalAmount), 0);
    const typeLabel = (type: string) => (type === "exchange" ? tr("Exchange", "Umtausch", "استبدال") : tr("Refund", "Erstattung", "استرداد"));
    return (
      <>
        {returnsError && <ErrorCard message={loadError} retryLabel={retryLabel} onRetry={() => refetchReturns()} />}
        <View style={styles.statGrid}>
          <GlassCard style={styles.statCardHalf}>
            <View style={[styles.statIconWrap, { backgroundColor: Colors.warning + "20" }]}>
              <Ionicons name="swap-horizontal" size={20} color={Colors.warning} />
            </View>
            <Text style={[styles.statLabel, rtlTextAlign, rtlText]} numberOfLines={1}>{t("totalReturns")}</Text>
            <Text style={[styles.statValue, rtlTextAlign]}>{tenantReturns.length}</Text>
          </GlassCard>
          <GlassCard style={styles.statCardHalf}>
            <View style={[styles.statIconWrap, { backgroundColor: Colors.danger + "20" }]}>
              <Ionicons name="cash" size={20} color={Colors.danger} />
            </View>
            <Text style={[styles.statLabel, rtlTextAlign, rtlText]} numberOfLines={1}>{t("totalRefunds")}</Text>
            <Text style={[styles.statValue, rtlTextAlign]} numberOfLines={1} adjustsFontSizeToFit>{formatMoney(totalRefundAmount, 2, { group: true })}</Text>
          </GlassCard>
        </View>

        <Text style={[styles.sectionTitle, rtlTextAlign, rtlText]}>{t("recentReturns")}</Text>
        {tenantReturns.length > 0 ? (
          tenantReturns.slice(0, 30).map((ret: any) => (
            <GlassCard key={ret.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 }}>
              <View style={[styles.paymentIcon, { backgroundColor: Colors.warning + "20" }]}>
                <Ionicons name="swap-horizontal" size={18} color={Colors.warning} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[{ color: Colors.text, fontSize: 14, fontWeight: "600" }, rtlTextAlign, rtlText]} numberOfLines={1}>
                  {typeLabel(String(ret.type || "refund"))} #{ret.id} · {tr("Sale", "Verkauf", "فاتورة")} #{ret.originalSaleId}
                </Text>
                <Text style={[{ color: Colors.textMuted, fontSize: 11, marginTop: 2 }, rtlTextAlign, rtlText]} numberOfLines={2}>
                  {fmtDateTime(ret.createdAt)} · {ret.reason || tr("No reason given", "Kein Grund angegeben", "بدون سبب")}
                </Text>
              </View>
              <Text style={{ color: Colors.danger, fontSize: 15, fontWeight: "700" }} numberOfLines={1}>-{formatMoney(ret.totalAmount, 2, { group: true })}</Text>
            </GlassCard>
          ))
        ) : returnsError ? null : (
          <GlassCard>
            <View style={styles.empty}>
              <Ionicons name="checkmark-circle" size={40} color={Colors.success} />
              <Text style={[styles.emptyText, rtlText]}>{t("noReturns")}</Text>
            </View>
          </GlassCard>
        )}
      </>
    );
  };

  const renderFinance = () => {
    const totalProfitAll = profitByProduct.reduce((sum: number, p: any) => sum + num(p.profit), 0);
    const maxProfit = profitByProduct.length > 0 ? Math.max(...profitByProduct.map((p: any) => Math.abs(num(p.profit))), 1) : 1;
    const roleColor = (role: string) => (role === "admin" || role === "owner" ? Colors.danger : role === "manager" ? Colors.warning : Colors.info);
    const roleLabel = (role: string) => {
      switch (role) {
        case "owner": return tr("Owner", "Inhaber", "المالك");
        case "admin": return tr("Admin", "Admin", "مدير النظام");
        case "manager": return tr("Manager", "Manager", "مدير");
        case "cashier": return tr("Cashier", "Kassierer", "كاشير");
        default: return role;
      }
    };

    return (
      <>
        <View style={styles.statGrid}>
          <GlassCard style={styles.statCardHalf}>
            <View style={[styles.statIconWrap, { backgroundColor: Colors.success + "20" }]}>
              <Ionicons name="trending-up" size={20} color={Colors.success} />
            </View>
            <Text style={[styles.statLabel, rtlTextAlign, rtlText]} numberOfLines={1}>{t("totalProfit")}</Text>
            <Text style={[styles.statValue, { color: totalProfitAll >= 0 ? Colors.success : Colors.danger }, rtlTextAlign]} numberOfLines={1} adjustsFontSizeToFit>
              {formatMoney(totalProfitAll, 2, { group: true })}
            </Text>
          </GlassCard>
          <GlassCard style={styles.statCardHalf}>
            <View style={[styles.statIconWrap, { backgroundColor: Colors.info + "20" }]}>
              <Ionicons name="people" size={20} color={Colors.info} />
            </View>
            <Text style={[styles.statLabel, rtlTextAlign, rtlText]} numberOfLines={1}>{t("activeCashiers")}</Text>
            <Text style={[styles.statValue, rtlTextAlign]}>{cashierPerformance.length}</Text>
          </GlassCard>
        </View>

        {cashierPerformance.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, rtlTextAlign, rtlText]}>{t("performanceChart")}</Text>
            <GlassCard>
              <BarChart
                data={cashierPerformance.slice(0, 6).map((p: any) => ({
                  label: String(p.employeeName || "").split(" ")[0] || `#${p.employeeId}`,
                  value: num(p.totalRevenue),
                  color: roleColor(p.role),
                }))}
              />
            </GlassCard>
          </>
        )}

        {profitByProduct.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, rtlTextAlign, rtlText]}>{t("profitChart")}</Text>
            <GlassCard>
              <BarChart
                data={profitByProduct.slice(0, 8).map((p: any) => ({
                  label: String(p.productName || "").substring(0, 8),
                  value: num(p.profit),
                  color: num(p.profit) >= 0 ? Colors.success : Colors.danger,
                }))}
              />
            </GlassCard>
          </>
        )}

        <Text style={[styles.sectionTitle, rtlTextAlign, rtlText]}>{t("cashierPerformance")}</Text>
        {cashierPerformance.length > 0 ? (
          <GlassCard>
            {cashierPerformance.map((perf: any, index: number) => (
              <View key={perf.employeeId} style={[styles.topProductRow, index < cashierPerformance.length - 1 && styles.topProductBorder]}>
                <View style={styles.topProductRank}>
                  <Text style={styles.topProductRankText}>{index + 1}</Text>
                </View>
                <View style={styles.topProductInfo}>
                  <Text style={[styles.topProductName, rtlTextAlign, rtlText]} numberOfLines={1}>{perf.employeeName}</Text>
                  <View style={styles.topProductMeta}>
                    <Text style={styles.topProductRevenue} numberOfLines={1}>{formatMoney(perf.totalRevenue, 2, { group: true })}</Text>
                    <Text style={[styles.topProductQty, rtlText]} numberOfLines={1}>
                      {num(perf.salesCount)} {t("salesCount")} · {t("avg")} {formatMoney(perf.avgSaleValue, 2, { group: true })}
                    </Text>
                  </View>
                </View>
                <View style={[styles.badge, { backgroundColor: roleColor(perf.role) + "20" }]}>
                  <Text style={[styles.badgeText, { color: roleColor(perf.role) }, rtlText]}>{roleLabel(perf.role)}</Text>
                </View>
              </View>
            ))}
          </GlassCard>
        ) : (
          <GlassCard>
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={32} color={Colors.textMuted} />
              <Text style={[styles.emptyText, rtlText]}>{t("noSalesData")}</Text>
            </View>
          </GlassCard>
        )}

        <Text style={[styles.sectionTitle, rtlTextAlign, rtlText]}>{t("profitByProduct")}</Text>
        {profitByProduct.length > 0 ? (
          <GlassCard>
            {profitByProduct.slice(0, 10).map((product: any, index: number) => (
              <View key={product.productId} style={[styles.topProductRow, index < Math.min(profitByProduct.length, 10) - 1 && styles.topProductBorder]}>
                <View style={styles.topProductRank}>
                  <Text style={styles.topProductRankText}>{index + 1}</Text>
                </View>
                <View style={styles.topProductInfo}>
                  <Text style={[styles.topProductName, rtlTextAlign, rtlText]} numberOfLines={1}>{product.productName}</Text>
                  <View style={styles.topProductMeta}>
                    <Text style={[styles.topProductRevenue, { color: num(product.profit) >= 0 ? Colors.success : Colors.danger }]} numberOfLines={1}>
                      {t("profit")}: {formatMoney(product.profit, 2, { group: true })}
                    </Text>
                    <Text style={[styles.topProductQty, rtlText]} numberOfLines={1}>
                      {num(product.totalSold)} {t("sold")} · {t("cost")}: {formatMoney(product.costPrice, 2, { group: true })}
                    </Text>
                  </View>
                  <PercentBar percent={(Math.abs(num(product.profit)) / maxProfit) * 100} color={num(product.profit) >= 0 ? Colors.success : Colors.danger} height={4} />
                </View>
              </View>
            ))}
          </GlassCard>
        ) : (
          <GlassCard>
            <View style={styles.empty}>
              <Ionicons name="bar-chart-outline" size={32} color={Colors.textMuted} />
              <Text style={[styles.emptyText, rtlText]}>{t("noProfitData")}</Text>
            </View>
          </GlassCard>
        )}

        <Text style={[styles.sectionTitle, rtlTextAlign, rtlText]}>{t("slowMovingProducts")}</Text>
        {slowMovingProducts.length > 0 ? (
          <GlassCard>
            {slowMovingProducts.slice(0, 8).map((product: any, index: number) => (
              <View key={product.id} style={[{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 }, index < Math.min(slowMovingProducts.length, 8) - 1 && styles.topProductBorder]}>
                <View style={[styles.paymentIcon, { backgroundColor: Colors.warning + "20" }]}>
                  <Ionicons name="trending-down" size={16} color={Colors.warning} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[{ color: Colors.text, fontSize: 13, fontWeight: "600" }, rtlTextAlign, rtlText]} numberOfLines={1}>{product.name}</Text>
                  <Text style={[{ color: Colors.textMuted, fontSize: 11 }, rtlTextAlign, rtlText]} numberOfLines={1}>
                    {t("price")}: {formatMoney(product.price, 2, { group: true })} · {t("sold")}: {num(product.recentSold)}
                  </Text>
                </View>
                <View style={[styles.badge, { backgroundColor: Colors.warning + "20" }]}>
                  <Text style={[styles.badgeText, { color: Colors.warning }, rtlText]}>{t("slow")}</Text>
                </View>
              </View>
            ))}
          </GlassCard>
        ) : (
          <GlassCard>
            <View style={styles.empty}>
              <Ionicons name="checkmark-circle" size={32} color={Colors.success} />
              <Text style={[styles.emptyText, rtlText]}>{t("allProductsSelling")}</Text>
            </View>
          </GlassCard>
        )}
      </>
    );
  };

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + topPad,
          // Sets the layout direction for the whole screen, so every plain
          // "row" below already runs right-to-left in Arabic (web and native).
          direction: isRTL ? "rtl" : "ltr",
        },
      ]}
    >
      <TabPageHeader title={t("reports")} icon="analytics" isRTL={isRTL}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroller} contentContainerStyle={styles.tabRow}>
          {(["overview", "sales", "inventory", "returns", "finance", "activity", "delivery"] as const).map((tabKey) => (
            <Pressable
              key={tabKey}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === tabKey }}
              style={[styles.tabBtn, tab === tabKey && styles.tabBtnActive]}
              onPress={() => setTab(tabKey)}
            >
              <Ionicons name={TAB_ICONS[tabKey] as any} size={16} color={tab === tabKey ? Colors.textDark : Colors.textSecondary} />
              <Text style={[styles.tabText, tab === tabKey && styles.tabTextActive, rtlText]}>{t(tabKey)}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </TabPageHeader>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 20 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} colors={[Colors.accent]} />}
      >
        {statsError && tab === "overview" && !overviewError && (
          <ErrorCard message={loadError} retryLabel={retryLabel} onRetry={() => refetchStats()} />
        )}
        {tab === "overview" && renderOverview()}
        {tab === "sales" && renderSales()}
        {tab === "inventory" && renderInventory()}
        {tab === "returns" && renderReturns()}
        {tab === "finance" && renderFinance()}
        {tab === "activity" && renderActivity()}
        {tab === "delivery" && renderDelivery()}
      </ScrollView>
    </View>
  );
}

const styles = themedStyles((Colors) => ({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  tabRow: {
    flexDirection: "row",
    paddingHorizontal: 0,
    paddingTop: 2,
    paddingBottom: 2,
    gap: 8,
    alignItems: "center",
  },
  tabScroller: {
    flexGrow: 0,
    backgroundColor: "transparent",
  },
  tabBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    minHeight: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  tabBtnActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  tabText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  tabTextActive: {
    color: Colors.textDark,
  },
  content: {
    paddingHorizontal: 16,
  },
  glassCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  actionBtn: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    alignItems: "center",
    gap: 8,
    width: 118,
    minHeight: 88,
  },
  actionIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  actionText: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
  },
  statGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 2,
  },
  statCardHalf: {
    flex: 1,
    minWidth: 0,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  statLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statValue: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: "800",
    marginTop: 4,
  },
  statSub: {
    color: Colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  sectionTitle: {
    color: Colors.text,
    fontSize: 17,
    fontWeight: "700",
    marginTop: 18,
    marginBottom: 10,
  },
  barTrack: {
    backgroundColor: Colors.textMuted + "22",
    borderRadius: 6,
    overflow: "hidden",
    width: "100%",
  },
  barFill: {
    borderRadius: 6,
  },
  barFillGradient: {
    height: 12,
    borderRadius: 6,
  },
  revExpRow: {
    gap: 16,
  },
  revExpItem: {
    gap: 2,
  },
  revExpHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  revExpDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  revExpLabel: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  revExpValue: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: "800",
    marginTop: 2,
  },
  topProductRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 12,
  },
  topProductBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  topProductRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.accent + "20",
    justifyContent: "center",
    alignItems: "center",
  },
  topProductRankText: {
    color: Colors.accent,
    fontSize: 13,
    fontWeight: "800",
  },
  topProductInfo: {
    flex: 1,
    minWidth: 0,
  },
  topProductName: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
  topProductMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: 12,
    marginTop: 2,
    marginBottom: 6,
  },
  topProductRevenue: {
    color: Colors.accent,
    fontSize: 13,
    fontWeight: "700",
  },
  topProductQty: {
    color: Colors.textMuted,
    fontSize: 12,
    flexShrink: 1,
  },
  paymentIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  saleCard: {
    marginBottom: 8,
  },
  saleTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  saleReceiptWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 1,
  },
  saleReceipt: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: "600",
    flexShrink: 1,
  },
  saleAmount: {
    color: Colors.accent,
    fontSize: 17,
    fontWeight: "800",
  },
  saleBottom: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  saleDate: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  saleBadges: {
    flexDirection: "row",
    gap: 6,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  stockAlertCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  stockAlertLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  stockAlertIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  stockAlertInfo: {
    flex: 1,
    minWidth: 0,
  },
  stockAlertName: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
  stockAlertMeta: {
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: 2,
    marginBottom: 4,
  },
  stockAlertRight: {
    alignItems: "center",
  },
  stockAlertQty: {
    fontSize: 20,
    fontWeight: "800",
  },
  stockAlertUnit: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: "600",
  },
  inventoryCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  inventoryLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  inventoryIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  inventoryInfo: {
    flex: 1,
    minWidth: 0,
  },
  inventoryName: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
  inventoryPrice: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  inventoryRight: {
    alignItems: "center",
  },
  inventoryQty: {
    fontSize: 18,
    fontWeight: "800",
  },
  inventoryUnit: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: "600",
  },
  empty: {
    alignItems: "center",
    paddingVertical: 30,
    gap: 8,
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: 14,
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.accent + "55",
    backgroundColor: Colors.accent + "12",
    marginTop: 4,
  },
  retryText: {
    color: Colors.accent,
    fontWeight: "700",
    fontSize: 13,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  linkBtn: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  filterPanel: {
    marginTop: 14,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
  },
  filterPanelLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    marginBottom: 8,
    fontWeight: "600",
  },
  exportChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: Colors.accent + "15",
    borderWidth: 1,
    borderColor: Colors.accent + "40",
  },
  summaryTile: {
    flexGrow: 1,
    flexBasis: "46%",
    minWidth: 130,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  showMoreBtn: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.surface,
    marginTop: 4,
    marginBottom: 8,
  },
  showMoreText: {
    color: Colors.accent,
    fontWeight: "700",
    fontSize: 13,
  },
}));
