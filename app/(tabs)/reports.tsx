import React, { useState, useEffect, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Platform,
  FlatList,
  Dimensions,
  TextInput,
  Linking,
  Modal,
} from "react-native";
import Svg, { Path, Defs, LinearGradient as SvgLinearGradient, Stop, Circle, G, Rect } from "react-native-svg";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameDay, isSameMonth, parseISO } from "date-fns";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Colors } from "@/constants/colors";
import { getQueryFn, getApiUrl } from "@/lib/query-client";
import { useLanguage } from "@/lib/language-context";
import { useAuth } from "@/lib/auth-context";
import { useLicense } from "@/lib/license-context";

type TabType = "overview" | "sales" | "inventory" | "returns" | "finance" | "activity";

const TAB_ICONS: Record<TabType, string> = {
  overview: "analytics",
  sales: "receipt",
  inventory: "cube",
  returns: "swap-horizontal",
  finance: "wallet",
  activity: "list",
};

function GlassCard({ children, style }: { children: React.ReactNode; style?: any }) {
  return (
    <View style={[styles.glassCard, style]}>
      {children}
    </View>
  );
}

function PercentBar({ percent, color, height = 8 }: { percent: number; color: string; height?: number }) {
  return (
    <View style={[styles.barTrack, { height }]}>
      <View style={[styles.barFill, { width: `${Math.min(Math.max(percent, 0), 100)}%`, backgroundColor: color, height }]} />
    </View>
  );
}

function BarChart({ data, height = 180, isRTL = false }: { data: { label: string; value: number; color: string }[]; height?: number; isRTL?: boolean }) {
  if (!data.length) return null;
  const maxVal = Math.max(...data.map(d => d.value), 1);
  return (
    <View style={{ height, flexDirection: isRTL ? "row-reverse" : "row", alignItems: "flex-end", gap: 6, paddingHorizontal: 4, paddingTop: 10 }}>
      {data.map((item, i) => {
        const barH = Math.max((item.value / maxVal) * (height - 40), 4);
        return (
          <View key={i} style={{ flex: 1, alignItems: "center", justifyContent: "flex-end" }}>
            <Text style={{ color: Colors.text, fontSize: 10, fontWeight: "700", marginBottom: 4 }}>
              {item.value >= 1000 ? `${(item.value / 1000).toFixed(1)}k` : item.value % 1 === 0 ? item.value : item.value.toFixed(1)}
            </Text>
            <LinearGradient
              colors={[item.color, item.color + "80"]}
              style={{ width: "100%", height: barH, borderRadius: 6, minWidth: 16, maxWidth: 50 }}
            />
            <Text style={{ color: Colors.textMuted, fontSize: 9, marginTop: 4, textAlign: "center" }} numberOfLines={1}>{item.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

function DonutChart({ data, size = 140 }: { data: { label: string; value: number; color: string }[]; size?: number }) {
  if (!data.length) return null;
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  let cumulative = 0;
  const segments = data.map(d => {
    const pct = (d.value / total) * 100;
    const start = cumulative;
    cumulative += pct;
    return { ...d, pct, start };
  });
  const r = size / 2;
  const strokeW = size * 0.2;
  const innerR = r - strokeW;
  return (
    <View style={{ alignItems: "center" }}>
      <View style={{ width: size, height: size, position: "relative" }}>
        {segments.map((seg, i) => {
          const startAngle = (seg.start / 100) * 360 - 90;
          const endAngle = ((seg.start + seg.pct) / 100) * 360 - 90;
          const startRad = (startAngle * Math.PI) / 180;
          const endRad = (endAngle * Math.PI) / 180;
          const largeArc = seg.pct > 50 ? 1 : 0;
          const x1 = r + r * Math.cos(startRad);
          const y1 = r + r * Math.sin(startRad);
          const x2 = r + r * Math.cos(endRad);
          const y2 = r + r * Math.sin(endRad);
          const ix1 = r + innerR * Math.cos(endRad);
          const iy1 = r + innerR * Math.sin(endRad);
          const ix2 = r + innerR * Math.cos(startRad);
          const iy2 = r + innerR * Math.sin(startRad);
          return (
            <View key={i} style={{ position: "absolute", width: size, height: size }}>
              {Platform.OS === "web" ? (
                <View style={{ width: size, height: size }}>
                  <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                    <path
                      d={`M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix2} ${iy2} Z`}
                      fill={seg.color}
                    />
                  </svg>
                </View>
              ) : (
                <View style={{
                  width: size, height: size, borderRadius: r,
                  borderWidth: strokeW, borderColor: "transparent",
                  position: "absolute",
                  borderTopColor: i === 0 ? seg.color : "transparent",
                  transform: [{ rotate: `${seg.start * 3.6}deg` }],
                }} />
              )}
            </View>
          );
        })}
        <View style={{ position: "absolute", top: strokeW, left: strokeW, width: size - strokeW * 2, height: size - strokeW * 2, borderRadius: (size - strokeW * 2) / 2, backgroundColor: Colors.card, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ color: Colors.text, fontSize: 16, fontWeight: "800" }}>{total >= 1000 ? `CHF ${(total / 1000).toFixed(1)}k` : `CHF ${total.toFixed(0)}`}</Text>
          <Text style={{ color: Colors.textMuted, fontSize: 9 }}>Total</Text>
        </View>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 10, marginTop: 12 }}>
        {segments.map((seg, i) => (
          <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: seg.color }} />
            <Text style={{ color: Colors.textSecondary, fontSize: 11 }}>{seg.label} ({seg.pct.toFixed(0)}%)</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function MiniLineChart({ data, height = 140, color = Colors.accent }: { data: number[]; height?: number; color?: string }) {
  if (data.length < 2) return null;
  const maxVal = Math.max(...data, 1);
  const minVal = Math.min(...data, 0);
  const range = maxVal - minVal || 1;
  const [chartWidth, setChartWidth] = useState(Dimensions.get("window").width - 60);
  const stepX = chartWidth / (data.length - 1);

  const points = data.map((v, i) => ({
    x: i * stepX,
    y: height - ((v - minVal) / range) * (height * 0.7) - 20,
  }));

  const getPathData = () => {
    if (points.length === 0) return "";
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(i - 1, 0)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(i + 2, points.length - 1)];

      const cp1X = p1.x + (p2.x - p0.x) / 6;
      const cp1Y = p1.y + (p2.y - p0.y) / 6;
      const cp2X = p2.x - (p3.x - p1.x) / 6;
      const cp2Y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${p2.x} ${p2.y}`;
    }
    return d;
  };

  const linePath = getPathData();
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

  return (
    <View
      onLayout={(e) => setChartWidth(e.nativeEvent.layout.width)}
      style={{ height, width: "100%", paddingHorizontal: 0 }}
    >
      <Svg height={height} width="100%" style={{ overflow: "visible" }}>
        <Defs>
          <SvgLinearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={color} stopOpacity="0.4" />
            <Stop offset="100%" stopColor={color} stopOpacity="0" />
          </SvgLinearGradient>
          <SvgLinearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor={color} stopOpacity="0.8" />
            <Stop offset="100%" stopColor={color} />
          </SvgLinearGradient>
        </Defs>

        {/* Fill area */}
        <Path d={areaPath} fill="url(#areaGradient)" />

        {/* Glow Line Placeholder (using multiple paths for blur-like effect) */}
        <Path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeOpacity="0.1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Main Line */}
        <Path
          d={linePath}
          fill="none"
          stroke="url(#lineGradient)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Points */}
        {points.map((p, i) => (
          <G key={i}>
            <Circle cx={p.x} cy={p.y} r="6" fill={color} fillOpacity="0.2" />
            <Circle cx={p.x} cy={p.y} r="3" fill="#fff" />
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
  currentDate
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (date: string) => void;
  currentDate?: string;
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const selectedDate = currentDate ? parseISO(currentDate) : new Date();

  const renderHeader = () => {
    return (
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <Pressable onPress={() => setCurrentMonth(subMonths(currentMonth, 1))}>
          <Ionicons name="chevron-back" size={24} color={Colors.accent} />
        </Pressable>
        <Text style={{ color: "#fff", fontSize: 18, fontWeight: "800" }}>
          {format(currentMonth, "MMMM yyyy")}
        </Text>
        <Pressable onPress={() => setCurrentMonth(addMonths(currentMonth, 1))}>
          <Ionicons name="chevron-forward" size={24} color={Colors.accent} />
        </Pressable>
      </View>
    );
  };

  const renderDays = () => {
    const days = [];
    const dateNames = ["S", "M", "T", "W", "T", "F", "S"];
    for (let i = 0; i < 7; i++) {
      days.push(
        <View key={i} style={{ flex: 1, alignItems: "center" }}>
          <Text style={{ color: Colors.textMuted, fontSize: 12, fontWeight: "600" }}>{dateNames[i]}</Text>
        </View>
      );
    }
    return <View style={{ flexDirection: "row", marginBottom: 10 }}>{days}</View>;
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const rows = [];
    let days = [];
    let day = startDate;
    let formattedDate = "";

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, "d");
        const cloneDay = day;
        const isSelected = isSameDay(day, selectedDate);
        const isCurrentMonth = isSameMonth(day, monthStart);

        days.push(
          <Pressable
            key={day.toString()}
            style={{
              flex: 1,
              aspectRatio: 1,
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: isSelected ? Colors.accent : "transparent",
              borderRadius: 8,
              margin: 2,
              opacity: isCurrentMonth ? 1 : 0.3
            }}
            onPress={() => {
              onSelect(format(cloneDay, "yyyy-MM-dd"));
              onClose();
            }}
          >
            <Text style={{
              color: isSelected ? Colors.textDark : "#fff",
              fontWeight: isSelected ? "800" : "400",
              fontSize: 14
            }}>
              {formattedDate}
            </Text>
          </Pressable>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <View key={day.toString()} style={{ flexDirection: "row" }}>
          {days}
        </View>
      );
      days = [];
    }
    return <View>{rows}</View>;
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "center", alignItems: "center", padding: 20 }}>
        <View style={{ backgroundColor: Colors.surface, borderRadius: 24, padding: 20, width: "100%", maxWidth: 400, borderWidth: 1, borderColor: Colors.cardBorder }}>
          {renderHeader()}
          {renderDays()}
          {renderCells()}
          <Pressable
            onPress={onClose}
            style={{ marginTop: 20, padding: 12, backgroundColor: Colors.surfaceLight, borderRadius: 12, alignItems: "center" }}
          >
            <Text style={{ color: "#fff", fontWeight: "700" }}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

type PeriodFilter = "daily" | "yesterday" | "weekly" | "monthly" | "annual" | "specific" | "custom";

function getPeriodDates(period: PeriodFilter, specificDate?: string): { from: string; to: string } {
  const now = new Date();
  const toStr = now.toISOString().split("T")[0];

  if (period === "daily") {
    return { from: toStr, to: toStr };
  } else if (period === "yesterday") {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = yesterday.toISOString().split("T")[0];
    return { from: yStr, to: yStr };
  } else if (period === "specific") {
    return { from: specificDate || toStr, to: specificDate || toStr };
  } else if (period === "weekly") {
    const d = new Date(now);
    d.setDate(d.getDate() - 6);
    return { from: d.toISOString().split("T")[0], to: toStr };
  } else if (period === "monthly") {
    const d = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: d.toISOString().split("T")[0], to: toStr };
  } else if (period === "annual") {
    const d = new Date(now.getFullYear(), 0, 1);
    return { from: d.toISOString().split("T")[0], to: toStr };
  }
  return { from: "", to: "" };
}

export default function ReportsScreen() {
  const insets = useSafeAreaInsets();
  const { t, isRTL, rtlRow, rtlTextAlign, rtlText } = useLanguage();
  const { isCashier } = useAuth();
  const { tenant } = useLicense();
  const tenantId = tenant?.id;
  const [screenDims, setScreenDims] = useState(Dimensions.get("window"));
  useEffect(() => {
    const sub = Dimensions.addEventListener("change", ({ window }) => setScreenDims(window));
    return () => sub?.remove();
  }, []);
  const isTablet = screenDims.width > 600;
  const [tab, setTab] = useState<TabType>("overview");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("monthly");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [specificDate, setSpecificDate] = useState(new Date().toISOString().split("T")[0]);
  const [showDatePicker, setShowDatePicker] = useState<"specific" | "from" | "to" | null>(null);

  const { data: stats } = useQuery<any>({
    queryKey: ["/api/dashboard", tenantId ? `?tenantId=${tenantId}` : ""],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!tenantId,
  });

  const { data: salesData = [] } = useQuery<any[]>({
    queryKey: ["/api/sales", tenantId ? `?tenantId=${tenantId}&limit=20` : "?limit=20"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!tenantId,
  });

  const { data: lowStock = [] } = useQuery<any[]>({
    queryKey: ["/api/inventory/low-stock", tenantId ? `?tenantId=${tenantId}` : ""],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!tenantId,
  });

  const { data: allProducts = [] } = useQuery<any[]>({
    queryKey: ["/api/products", tenantId ? `?tenantId=${tenantId}` : ""],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!tenantId,
  });

  const { data: activityLog = [] } = useQuery<any[]>({
    queryKey: ["/api/activity-log?limit=50"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Compute effective date range from period or custom input
  const effectiveDates = useMemo(() => {
    if (periodFilter === "custom") {
      return { from: dateFrom, to: dateTo };
    }
    return getPeriodDates(periodFilter, specificDate);
  }, [periodFilter, dateFrom, dateTo, specificDate]);

  const salesQueryKey = (effectiveDates.from || effectiveDates.to)
    ? `/api/analytics/sales-range?startDate=${effectiveDates.from || "2000-01-01"}&endDate=${effectiveDates.to || "2099-12-31"}`
    : null;

  const { data: filteredSales = [] } = useQuery<any[]>({
    queryKey: [salesQueryKey],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!(effectiveDates.from || effectiveDates.to),
  });

  const { data: returnsReport } = useQuery<any>({
    queryKey: ["/api/analytics/returns-report"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const { data: profitByProduct = [] } = useQuery<any[]>({
    queryKey: ["/api/analytics/profit-by-product"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const { data: cashierPerformance = [] } = useQuery<any[]>({
    queryKey: ["/api/analytics/cashier-performance"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const { data: slowMovingProducts = [] } = useQuery<any[]>({
    queryKey: ["/api/analytics/slow-moving"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const { data: inventoryMovements = [] } = useQuery<any[]>({
    queryKey: ["/api/inventory-movements?limit=50"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const { data: predictions } = useQuery<any>({
    queryKey: ["/api/analytics/predictions"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const handleExport = (endpoint: string) => {
    const baseUrl = getApiUrl().replace(/\/$/, "");
    const fullUrl = `${baseUrl}${endpoint}`;
    if (Platform.OS === "web") {
      window.open(fullUrl, "_blank");
    } else {
      Linking.openURL(fullUrl);
    }
  };

  const topPad = Platform.OS === "web" ? 67 : 0;
  const bottomPad = Platform.OS === "web" ? 84 : 60;

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

  const todayRevenue = stats?.todayRevenue ?? 0;
  const weekRevenue = stats?.weekRevenue ?? 0;
  const monthRevenue = stats?.monthRevenue ?? 0;
  const totalProfit = stats?.totalProfit ?? 0;
  const totalRevenue = stats?.totalRevenue ?? 0;
  const totalExpenses = stats?.totalExpenses ?? 0;
  const todaySalesCount = stats?.todaySalesCount ?? 0;
  const avgOrderValue = stats?.avgOrderValue ?? 0;
  const totalCustomers = stats?.totalCustomers ?? 0;
  const totalProducts = stats?.totalProducts ?? 0;
  const lowStockItems = stats?.lowStockItems ?? 0;
  const topProducts: any[] = stats?.topProducts ?? [];
  const salesByPaymentMethod: any[] = stats?.salesByPaymentMethod ?? [];

  const revenueExpenseMax = Math.max(totalRevenue, totalExpenses, 1);
  const topProductMax = topProducts.length > 0 ? Math.max(...topProducts.map((p: any) => p.revenue || 0), 1) : 1;
  const paymentTotal = salesByPaymentMethod.reduce((sum: number, m: any) => sum + (m.total || 0), 0) || 1;

  const renderOverview = () => {
    const revenueGrowth = 12.5; // Mocked growth
    const profitGrowth = 8.2; // Mocked growth

    return (
      <>
        {/* Quick Actions */}
        <View style={{ flexDirection: isRTL ? "row-reverse" : "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12, marginTop: 10 }}>
          <Text style={[styles.sectionTitle, { marginTop: 0, marginBottom: 0 }, rtlText]}>{t("quickActions" as any)}</Text>
          <Ionicons name="ellipsis-horizontal" size={20} color={Colors.textMuted} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 10 }}>
          <Pressable onPress={() => handleExport("/api/reports/sales-export")} style={[styles.actionBtn, { borderColor: Colors.success + "40" }]}>
            <View style={[styles.actionIcon, { backgroundColor: Colors.success + "20" }]}>
              <Ionicons name="receipt" size={16} color={Colors.success} />
            </View>
            <Text style={[styles.actionText, rtlText]}>{t("exportSalesCSV")}</Text>
          </Pressable>
          <Pressable onPress={() => handleExport("/api/reports/inventory-export")} style={[styles.actionBtn, { borderColor: Colors.info + "40" }]}>
            <View style={[styles.actionIcon, { backgroundColor: Colors.info + "20" }]}>
              <Ionicons name="cube" size={16} color={Colors.info} />
            </View>
            <Text style={[styles.actionText, rtlText]}>{t("exportInventoryCSV")}</Text>
          </Pressable>
          <Pressable onPress={() => handleExport("/api/reports/profit-export")} style={[styles.actionBtn, { borderColor: Colors.accent + "40" }]}>
            <View style={[styles.actionIcon, { backgroundColor: Colors.accent + "20" }]}>
              <Ionicons name="wallet" size={16} color={Colors.accent} />
            </View>
            <Text style={[styles.actionText, rtlText]}>{t("exportProfitCSV")}</Text>
          </Pressable>
          <Pressable onPress={() => handleExport("/api/reports/employee-performance-export")} style={[styles.actionBtn, { borderColor: Colors.secondary + "40" }]}>
            <View style={[styles.actionIcon, { backgroundColor: Colors.secondary + "20" }]}>
              <Ionicons name="people" size={16} color={Colors.secondary} />
            </View>
            <Text style={[styles.actionText, rtlText]}>{t("exportPerformanceCSV")}</Text>
          </Pressable>
        </ScrollView>

        <Text style={[styles.sectionTitle, { marginTop: 10 }, rtlTextAlign, rtlText]}>{t("keyPerformanceIndicators" as any)}</Text>
        <View style={[styles.statGrid, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <GlassCard style={styles.statCardHalf}>
            <View style={[styles.statIconWrap, { backgroundColor: Colors.accent + "15" }]}>
              <Ionicons name="today" size={20} color={Colors.accent} />
            </View>
            <Text style={[styles.statLabel, rtlTextAlign, rtlText]}>{t("todayRevenue")}</Text>
            <Text style={[styles.statValue, rtlTextAlign]}>CHF {Number(todayRevenue).toFixed(2).toLocaleString()}</Text>
            <View style={[rtlRow, { alignItems: "center", gap: 4, marginTop: 4 }]}>
              <Ionicons name="trending-up" size={12} color={Colors.success} />
              <Text style={{ color: Colors.success, fontSize: 10, fontWeight: "700" }}>+{revenueGrowth}%</Text>
              <Text style={{ color: Colors.textMuted, fontSize: 9 }}>vs yesterday</Text>
            </View>
          </GlassCard>
          <GlassCard style={styles.statCardHalf}>
            <View style={[styles.statIconWrap, { backgroundColor: Colors.info + "15" }]}>
              <Ionicons name="calendar" size={20} color={Colors.info} />
            </View>
            <Text style={[styles.statLabel, rtlTextAlign, rtlText]}>{t("weekRevenue")}</Text>
            <Text style={[styles.statValue, rtlTextAlign]}>CHF {Number(weekRevenue).toFixed(2).toLocaleString()}</Text>
            <Text style={[styles.statSub, rtlTextAlign, rtlText]}>{todaySalesCount} {t("transactions")}</Text>
          </GlassCard>
        </View>

        <View style={[styles.statGrid, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <GlassCard style={styles.statCardHalf}>
            <View style={[styles.statIconWrap, { backgroundColor: Colors.secondary + "15" }]}>
              <Ionicons name="trending-up" size={20} color={Colors.secondary} />
            </View>
            <Text style={[styles.statLabel, rtlTextAlign, rtlText]}>{t("monthRevenue")}</Text>
            <Text style={[styles.statValue, rtlTextAlign]}>CHF {Number(monthRevenue).toFixed(2).toLocaleString()}</Text>
            <Text style={[styles.statSub, rtlTextAlign, rtlText]}>Est. CHF {Number(predictions?.projectedMonthlyRevenue || 0).toFixed(0)}</Text>
          </GlassCard>
          <GlassCard style={styles.statCardHalf}>
            <View style={[styles.statIconWrap, { backgroundColor: totalProfit >= 0 ? Colors.success + "15" : Colors.danger + "15" }]}>
              <Ionicons name="cash" size={20} color={totalProfit >= 0 ? Colors.success : Colors.danger} />
            </View>
            <Text style={[styles.statLabel, rtlTextAlign, rtlText]}>{t("netProfit")}</Text>
            <Text style={[styles.statValue, { color: totalProfit >= 0 ? Colors.success : Colors.danger }, rtlTextAlign]}>
              CHF {Number(totalProfit).toFixed(2).toLocaleString()}
            </Text>
            <View style={[rtlRow, { alignItems: "center", gap: 4, marginTop: 4 }]}>
              <Ionicons name="trending-up" size={12} color={Colors.success} />
              <Text style={{ color: Colors.success, fontSize: 10, fontWeight: "700" }}>+{profitGrowth}%</Text>
            </View>
          </GlassCard>
        </View>

        {/* Charts Section */}
        <View style={[rtlRow, { justifyContent: "space-between", alignItems: "center", marginTop: 18, marginBottom: 10 }]}>
          <Text style={[styles.sectionTitle, { marginTop: 0, marginBottom: 0 }, rtlText]}>{t("revenueOverview")}</Text>
          <View style={{ flexDirection: "row", gap: 4 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.accent }} />
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.info, opacity: 0.5 }} />
          </View>
        </View>
        <GlassCard style={{ paddingVertical: 20 }}>
          <BarChart
            isRTL={isRTL}
            data={[
              { label: t("today" as any), value: Number(todayRevenue), color: Colors.accent },
              { label: t("weekly" as any), value: Number(weekRevenue), color: Colors.info },
              { label: t("monthly" as any), value: Number(monthRevenue), color: Colors.secondary },
              { label: t("total" as any), value: Number(totalRevenue) / 10, color: Colors.success }, // Scaling for visual consistency
            ]}
          />
        </GlassCard>

        {/* Revenue Breakdown */}
        <Text style={[styles.sectionTitle, rtlTextAlign, rtlText]}>{t("revenueVsExpenses")}</Text>
        <GlassCard>
          <View style={styles.revExpRow}>
            <View style={styles.revExpItem}>
              <View style={[styles.revExpHeader, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                <View style={[styles.revExpDot, { backgroundColor: Colors.accent }]} />
                <Text style={[styles.revExpLabel, rtlText]}>{t("revenue")}</Text>
              </View>
              <Text style={[styles.revExpValue, rtlTextAlign]}>CHF {Number(totalRevenue).toFixed(2)}</Text>
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
              <View style={[styles.revExpHeader, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                <View style={[styles.revExpDot, { backgroundColor: Colors.danger }]} />
                <Text style={[styles.revExpLabel, rtlText]}>{t("expenses")}</Text>
              </View>
              <Text style={[styles.revExpValue, rtlTextAlign]}>CHF {Number(totalExpenses).toFixed(2)}</Text>
              <View style={[styles.barTrack, { height: 12, marginTop: 6 }]}>
                <View style={[styles.barFill, { width: `${(totalExpenses / revenueExpenseMax) * 100}%`, backgroundColor: Colors.danger, height: 12 }]} />
              </View>
            </View>
          </View>
        </GlassCard>

        {/* Top Performers */}
        <View style={[rtlRow, { justifyContent: "space-between", alignItems: "center", marginTop: 22, marginBottom: 12 }]}>
          <Text style={[styles.sectionTitle, { marginTop: 0, marginBottom: 0 }, rtlText]}>{t("topProducts")}</Text>
          <Pressable onPress={() => setTab("sales")}>
            <Text style={{ color: Colors.accent, fontSize: 13, fontWeight: "600" }}>{t("viewAll" as any)}</Text>
          </Pressable>
        </View>
        {topProducts.length > 0 ? (
          <GlassCard style={{ padding: 8 }}>
            {topProducts.slice(0, 4).map((product: any, index: number) => (
              <View key={index} style={[styles.topProductRow, { flexDirection: isRTL ? "row-reverse" : "row", paddingHorizontal: 12 }, index < 3 && styles.topProductBorder]}>
                <View style={[styles.topProductRank, { backgroundColor: index === 0 ? "rgba(255, 215, 0, 0.2)" : index === 1 ? "rgba(192, 192, 192, 0.2)" : Colors.accent + "15" }]}>
                  <Text style={[styles.topProductRankText, { color: index === 0 ? "#FFD700" : index === 1 ? "#C0C0C0" : Colors.accent }]}>{index + 1}</Text>
                </View>
                <View style={styles.topProductInfo}>
                  <Text style={[styles.topProductName, rtlTextAlign, rtlText]} numberOfLines={1}>{product.name}</Text>
                  <View style={[styles.topProductMeta, { flexDirection: isRTL ? "row-reverse" : "row", marginBottom: 4 }]}>
                    <Text style={styles.topProductRevenue}>CHF {Number(product.revenue || 0).toFixed(2)}</Text>
                    <Text style={[styles.topProductQty, rtlText]}>{product.totalSold || 0} {t("sold")}</Text>
                  </View>
                  <PercentBar percent={(product.revenue / topProductMax) * 100} color={index === 0 ? "#FFD700" : Colors.accent} height={4} />
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

        {/* Insights */}
        <Text style={[styles.sectionTitle, rtlTextAlign, rtlText]}>{t("smartInsights")}</Text>
        {predictions ? (
          <GlassCard style={{ borderLeftWidth: 4, borderLeftColor: Colors.warning }}>
            <View style={{ gap: 12 }}>
              {(predictions.insights || []).slice(0, 2).map((insight: string, i: number) => (
                <View key={i} style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 10, alignItems: "flex-start", backgroundColor: Colors.surfaceLight + "50", padding: 10, borderRadius: 10 }}>
                  <View style={{ backgroundColor: Colors.warning + "20", padding: 4, borderRadius: 6 }}>
                    <Ionicons name="bulb" size={16} color={Colors.warning} />
                  </View>
                  <Text style={[{ color: Colors.textSecondary, fontSize: 13, flex: 1, lineHeight: 18 }, rtlTextAlign, rtlText]}>{insight}</Text>
                </View>
              ))}
              <Pressable onPress={() => setTab("activity")} style={{ alignSelf: "center", marginTop: 4 }}>
                <Text style={{ color: Colors.accent, fontSize: 12, fontWeight: "700" }}>GENERATE MORE INSIGHTS</Text>
              </Pressable>
            </View>
          </GlassCard>
        ) : (
          <GlassCard>
            <View style={styles.empty}>
              <Ionicons name="bulb-outline" size={32} color={Colors.textMuted} />
              <Text style={[styles.emptyText, rtlText]}>{t("loadingPredictions")}</Text>
            </View>
          </GlassCard>
        )}
      </>
    );
  };

  const renderSaleItem = ({ item }: { item: any }) => {
    const methodColors: Record<string, string> = {
      cash: Colors.success,
      card: Colors.info,
      mobile: Colors.secondary,
    };
    const badgeColor = methodColors[item.paymentMethod?.toLowerCase()] || Colors.accent;
    const statusColor = item.status === "completed" ? Colors.success : item.status === "refunded" ? Colors.danger : Colors.warning;

    return (
      <GlassCard style={styles.saleCard}>
        <View style={[styles.saleTop, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <View style={[styles.saleReceiptWrap, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <Ionicons name="receipt-outline" size={16} color={Colors.accent} />
            <Text style={[styles.saleReceipt, rtlText]}>{item.receiptNumber}</Text>
          </View>
          <Text style={styles.saleAmount}>CHF {Number(item.totalAmount).toFixed(2)}</Text>
        </View>
        <View style={[styles.saleBottom, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <Text style={[styles.saleDate, rtlText]}>{new Date(item.createdAt).toLocaleDateString()} {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Text>
          <View style={[styles.saleBadges, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <View style={[styles.badge, { backgroundColor: badgeColor + "20" }]}>
              <Text style={[styles.badgeText, { color: badgeColor }, rtlText]}>{item.paymentMethod}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: statusColor + "20" }]}>
              <Text style={[styles.badgeText, { color: statusColor }, rtlText]}>{item.status === "completed" ? t("completed") : item.status === "pending" ? t("pending") : item.status}</Text>
            </View>
          </View>
        </View>
      </GlassCard>
    );
  };

  const renderSales = () => {
    const activeSalesList = filteredSales.length > 0 ? filteredSales : salesData;
    const periodTotalRevenue = activeSalesList.reduce((sum: number, s: any) => sum + Number(s.totalAmount || 0), 0);
    const PERIOD_BTNS: { key: PeriodFilter; label: string; icon: string }[] = [
      { key: "daily", label: t("daily" as any), icon: "today" },
      { key: "yesterday", label: t("yesterday" as any), icon: "arrow-back" },
      { key: "specific", label: t("specificDay" as any), icon: "calendar" },
      { key: "weekly", label: t("weekly" as any), icon: "calendar-outline" },
      { key: "monthly", label: t("monthly" as any), icon: "calendar-clear" },
      { key: "annual", label: t("annual" as any), icon: "calendar-number" },
      { key: "custom", label: t("dateFilter"), icon: "options" },
    ];

    return (
      <>
        {/* Period filter buttons */}
        <Text style={[styles.sectionTitle, rtlTextAlign, rtlText]}>{t("filterPeriod" as any)}</Text>
        <GlassCard style={{ padding: 12 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
            {PERIOD_BTNS.map(({ key, label, icon }) => (
              <Pressable
                key={key}
                onPress={() => {
                  setPeriodFilter(key);
                  if (key !== "custom" && key !== "specific") { setDateFrom(""); setDateTo(""); }
                }}
                style={{
                  flexDirection: isRTL ? "row-reverse" : "row",
                  alignItems: "center",
                  gap: 6,
                  paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12,
                  backgroundColor: periodFilter === key ? Colors.accent : Colors.surfaceLight,
                  borderWidth: 1.5, borderColor: periodFilter === key ? Colors.accent : Colors.cardBorder,
                  elevation: periodFilter === key ? 4 : 0,
                  shadowColor: Colors.accent,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: periodFilter === key ? 0.3 : 0,
                  shadowRadius: 4,
                }}
              >
                <Ionicons name={icon as any} size={16} color={periodFilter === key ? Colors.textDark : Colors.textMuted} />
                <Text style={{ color: periodFilter === key ? Colors.textDark : Colors.textSecondary, fontSize: 13, fontWeight: "700" }}>
                  {label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Specific Day Selector */}
          {periodFilter === "specific" && (
            <View style={{ marginTop: 16, backgroundColor: Colors.surface + "40", borderRadius: 12, padding: 12 }}>
              <Text style={[{ color: Colors.textMuted, fontSize: 11, marginBottom: 8, fontWeight: "600" }, rtlTextAlign, rtlText]}>{t("specificDay" as any)} (AGENDA)</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Pressable
                  onPress={() => setShowDatePicker("specific")}
                  style={{ flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: Colors.surfaceLight, borderRadius: 10, borderWidth: 1, borderColor: Colors.cardBorder, paddingHorizontal: 15, paddingVertical: 12 }}
                >
                  <Ionicons name="calendar" size={18} color={Colors.accent} />
                  <Text style={[{ flex: 1, color: Colors.text, fontSize: 15, marginLeft: 10 }, rtlTextAlign, rtlText]}>
                    {specificDate ? format(parseISO(specificDate), "MMMM d, yyyy") : "Select Date"}
                  </Text>
                  <Ionicons name="chevron-down" size={14} color={Colors.textMuted} />
                </Pressable>
                <Pressable
                  onPress={() => setSpecificDate(new Date().toISOString().split("T")[0])}
                  style={{ backgroundColor: Colors.accent + "20", padding: 12, borderRadius: 10 }}
                >
                  <Text style={{ color: Colors.accent, fontWeight: "700", fontSize: 12 }}>{t("today" as any)}</Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* Custom date range inputs */}
          {periodFilter === "custom" && (
            <View style={{ marginTop: 16, backgroundColor: Colors.surface + "40", borderRadius: 12, padding: 12 }}>
              <Text style={[{ color: Colors.textMuted, fontSize: 11, marginBottom: 8, fontWeight: "600" }, rtlTextAlign, rtlText]}>DATE RANGE</Text>
              <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[{ color: Colors.textSecondary, fontSize: 10, marginBottom: 4 }, rtlTextAlign]}>{t("from")}</Text>
                  <Pressable
                    onPress={() => setShowDatePicker("from")}
                    style={[{ backgroundColor: Colors.surfaceLight, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: Colors.cardBorder }, rtlTextAlign]}
                  >
                    <Text style={{ color: dateFrom ? Colors.text : Colors.textMuted, fontSize: 13 }}>
                      {dateFrom ? format(parseISO(dateFrom), "MMM d, yy") : "Start"}
                    </Text>
                    <Ionicons name="calendar-outline" size={14} color={Colors.accent} />
                  </Pressable>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[{ color: Colors.textSecondary, fontSize: 10, marginBottom: 4 }, rtlTextAlign]}>{t("to")}</Text>
                  <Pressable
                    onPress={() => setShowDatePicker("to")}
                    style={[{ backgroundColor: Colors.surfaceLight, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: Colors.cardBorder }, rtlTextAlign]}
                  >
                    <Text style={{ color: dateTo ? Colors.text : Colors.textMuted, fontSize: 13 }}>
                      {dateTo ? format(parseISO(dateTo), "MMM d, yy") : "End"}
                    </Text>
                    <Ionicons name="calendar-outline" size={14} color={Colors.accent} />
                  </Pressable>
                </View>
              </View>
            </View>
          )}

          {/* Period revenue summary */}
          <View style={{ marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.cardBorder, flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", justifyContent: "space-between" }}>
            <View>
              <Text style={[{ color: Colors.textMuted, fontSize: 12 }, rtlText]}>
                {activeSalesList.length} {t("salesFoundInRange")}
              </Text>
              <Text style={[{ color: Colors.textSecondary, fontSize: 10, marginTop: 2 }, rtlText]}>
                {effectiveDates.from} {effectiveDates.to && effectiveDates.from !== effectiveDates.to ? ` - ${effectiveDates.to}` : ""}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={[{ color: Colors.textMuted, fontSize: 10 }, rtlText]}>{t("totalRevenue")}</Text>
              <Text style={[{ color: Colors.accent, fontSize: 20, fontWeight: "900" }]}>
                CHF {periodTotalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            </View>
          </View>
        </GlassCard>

        {activeSalesList.length > 0 && (
          <>
            <View style={[rtlRow, { justifyContent: "space-between", alignItems: "center", marginTop: 18, marginBottom: 10 }]}>
              <Text style={[styles.sectionTitle, { marginTop: 0 }, rtlText]}>{t("salesTrend")}</Text>
              <View style={[styles.badge, { backgroundColor: Colors.accent + "20" }]}>
                <Text style={[styles.badgeText, { color: Colors.accent }]}>Live</Text>
              </View>
            </View>
            <GlassCard>
              <MiniLineChart
                data={activeSalesList.slice(0, 15).reverse().map((s: any) => Number(s.totalAmount || 0))}
                color={Colors.accent}
                height={140}
              />
              <View style={{ flexDirection: isRTL ? "row-reverse" : "row", justifyContent: "space-between", marginTop: 12, paddingHorizontal: 4 }}>
                <View style={{ alignItems: "center" }}>
                  <Text style={{ color: Colors.textMuted, fontSize: 10 }}>{t("oldest")}</Text>
                  <Text style={{ color: Colors.textSecondary, fontSize: 9 }}>{new Date(activeSalesList[Math.min(activeSalesList.length - 1, 14)]?.createdAt).toLocaleDateString()}</Text>
                </View>
                <View style={{ alignItems: "center" }}>
                  <Text style={{ color: Colors.textMuted, fontSize: 10 }}>{t("latest")}</Text>
                  <Text style={{ color: Colors.textSecondary, fontSize: 9 }}>{new Date(activeSalesList[0]?.createdAt).toLocaleDateString()}</Text>
                </View>
              </View>
            </GlassCard>
          </>
        )}

        <Text style={[styles.sectionTitle, rtlTextAlign, rtlText]}>{t("recentSales")}</Text>
        <FlatList
          data={activeSalesList}
          keyExtractor={(item: any) => String(item.id)}
          renderItem={renderSaleItem}
          scrollEnabled={false}
          ListEmptyComponent={
            <GlassCard>
              <View style={styles.empty}>
                <Ionicons name="receipt-outline" size={48} color={Colors.textMuted} />
                <Text style={[styles.emptyText, { fontSize: 16, fontWeight: "600" }, rtlText]}>{t("noSalesData")}</Text>
                <Text style={[{ color: Colors.textMuted, fontSize: 12, textAlign: "center", paddingHorizontal: 20 }, rtlText]}>Try adjusting your filters to see more results.</Text>
              </View>
            </GlassCard>
          }
        />
        <DatePickerModal
          visible={!!showDatePicker}
          onClose={() => setShowDatePicker(null)}
          currentDate={showDatePicker === "from" ? dateFrom : showDatePicker === "to" ? dateTo : specificDate}
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
    const totalStockValue = allProducts.reduce((sum, p) => sum + (p.stockQuantity || 0) * (p.price || 0), 0);
    const lowStockCount = allProducts.filter(p => (p.stockQuantity || 0) <= 5).length;

    return (
      <>
        {/* Inventory Summary */}
        <View style={[styles.statGrid, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <GlassCard style={styles.statCardHalf}>
            <View style={[styles.statIconWrap, { backgroundColor: Colors.accent + "15" }]}>
              <Ionicons name="cube" size={20} color={Colors.accent} />
            </View>
            <Text style={[styles.statLabel, rtlTextAlign, rtlText]}>TOTAL STOCK VALUE</Text>
            <Text style={[styles.statValue, rtlTextAlign]}>CHF {totalStockValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</Text>
            <Text style={[styles.statSub, rtlTextAlign, rtlText]}>{allProducts.length} {t("products")}</Text>
          </GlassCard>
          <GlassCard style={styles.statCardHalf}>
            <View style={[styles.statIconWrap, { backgroundColor: lowStockCount > 0 ? Colors.danger + "15" : Colors.success + "15" }]}>
              <Ionicons name="alert-circle" size={20} color={lowStockCount > 0 ? Colors.danger : Colors.success} />
            </View>
            <Text style={[styles.statLabel, rtlTextAlign, rtlText]}>LOW STOCK ITEMS</Text>
            <Text style={[styles.statValue, { color: lowStockCount > 0 ? Colors.danger : Colors.success }, rtlTextAlign]}>{lowStockCount}</Text>
            <Text style={[styles.statSub, rtlTextAlign, rtlText]}>{lowStockCount > 0 ? "Requires attention" : "Inventory is healthy"}</Text>
          </GlassCard>
        </View>

        <Text style={[styles.sectionTitle, rtlTextAlign, rtlText]}>{t("stockAlerts")}</Text>
        {lowStock.length > 0 ? (
          <View>
            {lowStock.slice(0, 5).map((item: any) => {
              const product = allProducts.find((p: any) => p.id === item.productId);
              const qty = item.quantity ?? 0;
              const threshold = item.lowStockThreshold ?? 10;
              const pct = threshold > 0 ? Math.min((qty / threshold) * 100, 100) : 0;
              return (
                <GlassCard key={item.id} style={[styles.stockAlertCard, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                  <View style={[styles.stockAlertLeft, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                    <View style={[styles.stockAlertIcon, { backgroundColor: Colors.danger + "15" }]}>
                      <Ionicons name="warning" size={20} color={Colors.danger} />
                    </View>
                    <View style={styles.stockAlertInfo}>
                      <Text style={[styles.stockAlertName, rtlTextAlign, rtlText]} numberOfLines={1}>{product?.name || `Product #${item.productId}`}</Text>
                      <Text style={[styles.stockAlertMeta, rtlTextAlign, rtlText]}>{t("threshold")}: {threshold}</Text>
                      <PercentBar percent={pct} color={qty <= 5 ? Colors.danger : Colors.warning} height={4} />
                    </View>
                  </View>
                  <View style={[styles.stockAlertRight, { marginLeft: isRTL ? 0 : 12, marginRight: isRTL ? 12 : 0 }]}>
                    <Text style={[styles.stockAlertQty, { color: qty <= 5 ? Colors.danger : Colors.warning }]}>
                      {qty}
                    </Text>
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
            {inventoryMovements.slice(0, 5).map((item: any) => {
              const typeColors: Record<string, string> = { sale: Colors.success, return: Colors.warning, adjustment: Colors.info, transfer: Colors.secondary, purchase: Colors.accent, count: Colors.danger };
              const typeIcons: Record<string, string> = { sale: "cart", return: "swap-horizontal", adjustment: "construct", transfer: "repeat", purchase: "cube", count: "clipboard" };
              const color = typeColors[item.type] || Colors.textMuted;
              return (
                <GlassCard key={item.id} style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 10, paddingVertical: 12, marginBottom: 8 }}>
                  <View style={[styles.paymentIcon, { backgroundColor: color + "15" }]}>
                    <Ionicons name={(typeIcons[item.type] || "ellipse") as any} size={16} color={color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[{ color: Colors.text, fontSize: 13, fontWeight: "600" }, rtlTextAlign, rtlText]}>{item.notes || `${item.type} movement`}</Text>
                    <Text style={[{ color: Colors.textMuted, fontSize: 11 }, rtlTextAlign, rtlText]}>{new Date(item.createdAt).toLocaleString()}</Text>
                  </View>
                  <Text style={{ color: item.quantity > 0 ? Colors.success : Colors.danger, fontSize: 14, fontWeight: "700" }}>
                    {item.quantity > 0 ? "+" : ""}{item.quantity}
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

        <View style={[rtlRow, { justifyContent: "space-between", alignItems: "center", marginBottom: 12 }]}>
          <Text style={[styles.sectionTitle, { marginTop: 0, marginBottom: 0 }, rtlText]}>{t("fullInventory")}</Text>
          <View style={{ backgroundColor: Colors.accent + "20", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
            <Text style={{ color: Colors.accent, fontSize: 10, fontWeight: "700" }}>{allProducts.length} TOTAL</Text>
          </View>
        </View>
        <FlatList
          data={allProducts}
          keyExtractor={(item: any) => String(item.id)}
          scrollEnabled={false}
          renderItem={({ item }: { item: any }) => (
            <GlassCard style={[styles.inventoryCard, { flexDirection: isRTL ? "row-reverse" : "row", padding: 12 }]}>
              <View style={[styles.inventoryLeft, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                <View style={[styles.inventoryIcon, { backgroundColor: Colors.accent + "10" }]}>
                  <Ionicons name="cube-outline" size={18} color={Colors.accent} />
                </View>
                <View style={styles.inventoryInfo}>
                  <Text style={[styles.inventoryName, rtlTextAlign, rtlText]} numberOfLines={1}>{item.name}</Text>
                  <View style={[rtlRow, { alignItems: "center", gap: 6 }]}>
                    <Text style={[styles.inventoryPrice, { marginTop: 0 }]}>CHF {Number(item.price || 0).toFixed(2)}</Text>
                    <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: Colors.textMuted }} />
                    <Text style={{ color: Colors.textMuted, fontSize: 10 }}>SKU: {item.id}</Text>
                  </View>
                </View>
              </View>
              <View style={[styles.inventoryRight, { marginLeft: isRTL ? 0 : 12, marginRight: isRTL ? 12 : 0, alignItems: "flex-end" }]}>
                <Text style={[styles.inventoryQty, { fontSize: 16, color: (item.stockQuantity ?? 0) <= 5 ? Colors.danger : (item.stockQuantity ?? 0) <= 15 ? Colors.warning : Colors.success }]}>
                  {item.stockQuantity ?? 0}
                </Text>
                <Text style={[styles.inventoryUnit, { fontSize: 9 }, rtlText]}>{t("inStock")}</Text>
              </View>
            </GlassCard>
          )}
          ListEmptyComponent={
            <GlassCard>
              <View style={styles.empty}>
                <Ionicons name="cube-outline" size={40} color={Colors.textMuted} />
                <Text style={[styles.emptyText, rtlText]}>{t("noProductsInInventory")}</Text>
              </View>
            </GlassCard>
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
    return (
      <>
        <Text style={[styles.sectionTitle, rtlTextAlign, rtlText]}>{t("recentActivity")}</Text>
        <FlatList
          data={activityLog}
          keyExtractor={(item: any) => String(item.id)}
          scrollEnabled={!!activityLog.length}
          renderItem={({ item }: { item: any }) => {
            const color = getActionColor(item.action);
            return (
              <GlassCard style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 12, paddingVertical: 12 }}>
                <View style={[styles.paymentIcon, { backgroundColor: color + "20" }]}>
                  <Ionicons name={getActionIcon(item.action) as any} size={18} color={color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[{ color: Colors.text, fontSize: 14, fontWeight: "600" }, rtlTextAlign, rtlText]}>{item.details || item.action}</Text>
                  <Text style={[{ color: Colors.textMuted, fontSize: 11, marginTop: 2 }, rtlTextAlign, rtlText]}>
                    {new Date(item.createdAt).toLocaleString()} | {item.action.replace(/_/g, " ")}
                  </Text>
                </View>
                <View style={[styles.badge, { backgroundColor: color + "20" }]}>
                  <Text style={[styles.badgeText, { color }, rtlText]}>{item.action.replace(/_/g, " ")}</Text>
                </View>
              </GlassCard>
            );
          }}
          ListEmptyComponent={
            <GlassCard>
              <View style={styles.empty}>
                <Ionicons name="list-outline" size={40} color={Colors.textMuted} />
                <Text style={[styles.emptyText, rtlText]}>{t("noActivityRecorded")}</Text>
              </View>
            </GlassCard>
          }
        />
      </>
    );
  };

  const renderReturns = () => (
    <>
      <View style={[styles.statGrid, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <GlassCard style={styles.statCardHalf}>
          <View style={[styles.statIconWrap, { backgroundColor: Colors.warning + "20" }]}>
            <Ionicons name="swap-horizontal" size={20} color={Colors.warning} />
          </View>
          <Text style={[styles.statLabel, rtlTextAlign, rtlText]}>{t("totalReturns")}</Text>
          <Text style={[styles.statValue, rtlTextAlign]}>{returnsReport?.totalReturns || 0}</Text>
        </GlassCard>
        <GlassCard style={styles.statCardHalf}>
          <View style={[styles.statIconWrap, { backgroundColor: Colors.danger + "20" }]}>
            <Ionicons name="cash" size={20} color={Colors.danger} />
          </View>
          <Text style={[styles.statLabel, rtlTextAlign, rtlText]}>{t("totalRefunds")}</Text>
          <Text style={[styles.statValue, rtlTextAlign]}>CHF {Number(returnsReport?.totalRefundAmount || 0).toFixed(2)}</Text>
        </GlassCard>
      </View>

      <Text style={[styles.sectionTitle, rtlTextAlign, rtlText]}>{t("recentReturns")}</Text>
      {(returnsReport?.recentReturns || []).length > 0 ? (
        (returnsReport.recentReturns || []).map((ret: any) => (
          <GlassCard key={ret.id} style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 12, paddingVertical: 12 }}>
            <View style={[styles.paymentIcon, { backgroundColor: Colors.warning + "20" }]}>
              <Ionicons name="swap-horizontal" size={18} color={Colors.warning} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[{ color: Colors.text, fontSize: 14, fontWeight: "600" }, rtlTextAlign, rtlText]}>Return #{ret.id} - Sale #{ret.originalSaleId}</Text>
              <Text style={[{ color: Colors.textMuted, fontSize: 11, marginTop: 2 }, rtlTextAlign, rtlText]}>
                {new Date(ret.createdAt).toLocaleString()} | {ret.reason || "No reason"} | {ret.type || "refund"}
              </Text>
            </View>
            <Text style={{ color: Colors.danger, fontSize: 15, fontWeight: "700" }}>-${Number(ret.totalAmount).toFixed(2)}</Text>
          </GlassCard>
        ))
      ) : (
        <GlassCard>
          <View style={styles.empty}>
            <Ionicons name="checkmark-circle" size={40} color={Colors.success} />
            <Text style={[styles.emptyText, rtlText]}>{t("noReturns")}</Text>
          </View>
        </GlassCard>
      )}
    </>
  );

  const renderFinance = () => {
    const totalProfitAll = profitByProduct.reduce((sum: number, p: any) => sum + (p.profit || 0), 0);
    const maxProfit = profitByProduct.length > 0 ? Math.max(...profitByProduct.map((p: any) => Math.abs(p.profit || 0)), 1) : 1;

    return (
      <>
        <View style={[styles.statGrid, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <GlassCard style={styles.statCardHalf}>
            <View style={[styles.statIconWrap, { backgroundColor: Colors.success + "20" }]}>
              <Ionicons name="trending-up" size={20} color={Colors.success} />
            </View>
            <Text style={[styles.statLabel, rtlTextAlign, rtlText]}>{t("totalProfit")}</Text>
            <Text style={[styles.statValue, { color: totalProfitAll >= 0 ? Colors.success : Colors.danger }, rtlTextAlign]}>
              ${totalProfitAll.toFixed(2)}
            </Text>
          </GlassCard>
          <GlassCard style={styles.statCardHalf}>
            <View style={[styles.statIconWrap, { backgroundColor: Colors.info + "20" }]}>
              <Ionicons name="people" size={20} color={Colors.info} />
            </View>
            <Text style={[styles.statLabel, rtlTextAlign, rtlText]}>{t("activeCashiers")}</Text>
            <Text style={[styles.statValue, rtlTextAlign]}>{cashierPerformance.length}</Text>
          </GlassCard>
        </View>

        {cashierPerformance.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, rtlTextAlign, rtlText]}>{t("performanceChart")}</Text>
            <GlassCard>
              <BarChart
                isRTL={isRTL}
                data={cashierPerformance.slice(0, 6).map((p: any) => ({
                  label: p.employeeName?.split(" ")[0] || `#${p.employeeId}`,
                  value: Number(p.totalRevenue || 0),
                  color: p.role === "admin" ? Colors.danger : p.role === "manager" ? Colors.warning : Colors.info,
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
                isRTL={isRTL}
                data={profitByProduct.slice(0, 8).map((p: any) => ({
                  label: (p.productName || "").substring(0, 8),
                  value: Number(p.profit || 0),
                  color: (p.profit || 0) >= 0 ? Colors.success : Colors.danger,
                }))}
              />
            </GlassCard>
          </>
        )}

        <Text style={[styles.sectionTitle, rtlTextAlign, rtlText]}>{t("cashierPerformance")}</Text>
        {cashierPerformance.length > 0 ? (
          <GlassCard>
            {cashierPerformance.map((perf: any, index: number) => (
              <View key={perf.employeeId} style={[styles.topProductRow, { flexDirection: isRTL ? "row-reverse" : "row" }, index < cashierPerformance.length - 1 && styles.topProductBorder]}>
                <View style={styles.topProductRank}>
                  <Text style={styles.topProductRankText}>{index + 1}</Text>
                </View>
                <View style={styles.topProductInfo}>
                  <Text style={[styles.topProductName, rtlTextAlign, rtlText]}>{perf.employeeName}</Text>
                  <View style={[styles.topProductMeta, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                    <Text style={styles.topProductRevenue}>CHF {Number(perf.totalRevenue).toFixed(2)}</Text>
                    <Text style={[styles.topProductQty, rtlText]}>{perf.salesCount} {t("salesCount")} | {t("avg")} CHF {Number(perf.avgSaleValue).toFixed(2)}</Text>
                  </View>
                </View>
                <View style={[styles.badge, { backgroundColor: (perf.role === "admin" ? Colors.danger : perf.role === "manager" ? Colors.warning : Colors.info) + "20" }]}>
                  <Text style={[styles.badgeText, { color: perf.role === "admin" ? Colors.danger : perf.role === "manager" ? Colors.warning : Colors.info }, rtlText]}>{perf.role}</Text>
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
              <View key={product.productId} style={[styles.topProductRow, { flexDirection: isRTL ? "row-reverse" : "row" }, index < Math.min(profitByProduct.length, 10) - 1 && styles.topProductBorder]}>
                <View style={styles.topProductRank}>
                  <Text style={styles.topProductRankText}>{index + 1}</Text>
                </View>
                <View style={styles.topProductInfo}>
                  <Text style={[styles.topProductName, rtlTextAlign, rtlText]} numberOfLines={1}>{product.productName}</Text>
                  <View style={[styles.topProductMeta, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                    <Text style={[styles.topProductRevenue, { color: product.profit >= 0 ? Colors.success : Colors.danger }]}>
                      {t("profit")}: CHF {Number(product.profit).toFixed(2)}
                    </Text>
                    <Text style={[styles.topProductQty, rtlText]}>{product.totalSold} {t("sold")} | {t("cost")}: CHF {Number(product.costPrice).toFixed(2)}</Text>
                  </View>
                  <PercentBar percent={(Math.abs(product.profit) / maxProfit) * 100} color={product.profit >= 0 ? Colors.success : Colors.danger} height={4} />
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
              <View key={product.id} style={[{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 10, paddingVertical: 8 }, index < Math.min(slowMovingProducts.length, 8) - 1 && styles.topProductBorder]}>
                <View style={[styles.paymentIcon, { backgroundColor: Colors.warning + "20" }]}>
                  <Ionicons name="trending-down" size={16} color={Colors.warning} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[{ color: Colors.text, fontSize: 13, fontWeight: "600" }, rtlTextAlign, rtlText]} numberOfLines={1}>{product.name}</Text>
                  <Text style={[{ color: Colors.textMuted, fontSize: 11 }, rtlTextAlign, rtlText]}>{t("price")}: CHF {Number(product.price).toFixed(2)} | {t("sold")}: {product.recentSold}</Text>
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
    <View style={[styles.container, { paddingTop: insets.top + topPad, direction: isRTL ? "rtl" : "ltr" }]}>
      <LinearGradient
        colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.header, { flexDirection: isRTL ? "row-reverse" : "row" }]}
      >
        <Ionicons name="analytics" size={24} color={Colors.white} />
        <Text style={[styles.headerTitle, rtlText]}>{t("reports")}</Text>
      </LinearGradient>

      <View style={[styles.tabRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        {(["overview", "sales", "inventory", "returns", "finance", "activity"] as const).map((tabKey) => (
          <Pressable
            key={tabKey}
            style={[styles.tabBtn, { flexDirection: isRTL ? "row-reverse" : "row" }, tab === tabKey && styles.tabBtnActive]}
            onPress={() => setTab(tabKey)}
          >
            <Ionicons
              name={TAB_ICONS[tabKey] as any}
              size={16}
              color={tab === tabKey ? Colors.textDark : Colors.textSecondary}
            />
            <Text style={[styles.tabText, tab === tabKey && styles.tabTextActive, rtlText]}>
              {t(tabKey)}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {tab === "overview" && renderOverview()}
        {tab === "sales" && renderSales()}
        {tab === "inventory" && renderInventory()}
        {tab === "returns" && renderReturns()}
        {tab === "finance" && renderFinance()}
        {tab === "activity" && renderActivity()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    alignItems: "center",
    gap: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.white,
  },
  tabRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  tabBtn: {
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    alignItems: "center",
    gap: 8,
    minWidth: 100,
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
  },
  statGrid: {
    gap: 10,
    marginBottom: 2,
  },
  statCardHalf: {
    flex: 1,
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
    backgroundColor: "rgba(255, 255, 255, 0.08)",
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
    alignItems: "center",
    paddingVertical: 10,
    gap: 12,
  },
  topProductBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.06)",
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
  },
  topProductName: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
  topProductMeta: {
    gap: 12,
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
  },
  paymentRow: {
    alignItems: "center",
    paddingVertical: 10,
    gap: 12,
  },
  paymentIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  paymentInfo: {
    flex: 1,
  },
  paymentHeader: {
    justifyContent: "space-between",
    alignItems: "center",
  },
  paymentName: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  paymentPct: {
    color: Colors.accent,
    fontSize: 14,
    fontWeight: "800",
  },
  paymentAmount: {
    color: Colors.textMuted,
    fontSize: 12,
    marginTop: 2,
    marginBottom: 6,
  },
  quickStatsGrid: {
    flexWrap: "wrap",
    gap: 10,
  },
  quickStatCard: {
    flex: 1,
    minWidth: 70,
    alignItems: "center",
    paddingVertical: 14,
    gap: 6,
  },
  quickStatValue: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  quickStatLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: "600",
  },
  saleCard: {
    marginBottom: 8,
  },
  saleTop: {
    justifyContent: "space-between",
    alignItems: "center",
  },
  saleReceiptWrap: {
    alignItems: "center",
    gap: 6,
  },
  saleReceipt: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
  saleAmount: {
    color: Colors.accent,
    fontSize: 18,
    fontWeight: "800",
  },
  saleBottom: {
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  saleDate: {
    color: Colors.textMuted,
    fontSize: 12,
  },
  saleBadges: {
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
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  stockAlertLeft: {
    alignItems: "center",
    gap: 12,
    flex: 1,
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
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  inventoryLeft: {
    alignItems: "center",
    gap: 12,
    flex: 1,
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
});
