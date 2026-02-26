import React, { useState, useEffect } from "react";
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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Colors } from "@/constants/colors";
import { getQueryFn, getApiUrl } from "@/lib/query-client";
import { useLanguage } from "@/lib/language-context";
import { useAuth } from "@/lib/auth-context";

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

function MiniLineChart({ data, height = 100, color = Colors.accent }: { data: number[]; height?: number; color?: string }) {
  if (data.length < 2) return null;
  const maxVal = Math.max(...data, 1);
  const minVal = Math.min(...data, 0);
  const range = maxVal - minVal || 1;
  const stepX = 100 / (data.length - 1);
  const points = data.map((v, i) => ({
    x: i * stepX,
    y: 100 - ((v - minVal) / range) * 80 - 10,
  }));

  if (Platform.OS === "web") {
    const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
    const areaD = `${pathD} L ${points[points.length - 1].x} 100 L ${points[0].x} 100 Z`;
    return (
      <View style={{ height, overflow: "hidden" }}>
        <svg width="100%" height={height} viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <linearGradient id={`grad-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.3" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaD} fill={`url(#grad-${color.replace("#", "")})`} />
          <path d={pathD} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
          {points.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="3" fill={color} vectorEffect="non-scaling-stroke" />
          ))}
        </svg>
      </View>
    );
  }

  return (
    <View style={{ height, flexDirection: "row", alignItems: "flex-end", gap: 2, paddingHorizontal: 2 }}>
      {data.map((v, i) => {
        const barH = Math.max(((v - minVal) / range) * (height - 20), 2);
        return (
          <View key={i} style={{ flex: 1, alignItems: "center", justifyContent: "flex-end" }}>
            <View style={{ width: "80%", height: barH, backgroundColor: color, borderRadius: 3, opacity: 0.7 + (i / data.length) * 0.3 }} />
          </View>
        );
      })}
    </View>
  );
}

export default function ReportsScreen() {
  const insets = useSafeAreaInsets();
  const { t, isRTL, rtlRow, rtlTextAlign, rtlText } = useLanguage();
  const { isCashier } = useAuth();
  const [screenDims, setScreenDims] = useState(Dimensions.get("window"));
  useEffect(() => {
    const sub = Dimensions.addEventListener("change", ({ window }) => setScreenDims(window));
    return () => sub?.remove();
  }, []);
  const isTablet = screenDims.width > 600;
  const [tab, setTab] = useState<TabType>("overview");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data: stats } = useQuery<any>({
    queryKey: ["/api/dashboard"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const { data: salesData = [] } = useQuery<any[]>({
    queryKey: ["/api/sales?limit=20"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const { data: lowStock = [] } = useQuery<any[]>({
    queryKey: ["/api/inventory/low-stock"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const { data: allProducts = [] } = useQuery<any[]>({
    queryKey: ["/api/products"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const { data: activityLog = [] } = useQuery<any[]>({
    queryKey: ["/api/activity-log?limit=50"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const salesQueryKey = dateFrom || dateTo 
    ? `/api/analytics/sales-range?startDate=${dateFrom || "2000-01-01"}&endDate=${dateTo || "2099-12-31"}`
    : null;

  const { data: filteredSales = [] } = useQuery<any[]>({
    queryKey: [salesQueryKey],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!(dateFrom || dateTo),
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

  const renderOverview = () => (
    <>
      <GlassCard style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
        <Pressable onPress={() => handleExport("/api/reports/sales-export")} style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 6, backgroundColor: Colors.success + "20", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 }}>
          <Ionicons name="download" size={14} color={Colors.success} />
          <Text style={[{ color: Colors.success, fontSize: 12, fontWeight: "600" }, rtlText]}>{t("exportSalesCSV")}</Text>
        </Pressable>
        <Pressable onPress={() => handleExport("/api/reports/inventory-export")} style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 6, backgroundColor: Colors.info + "20", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 }}>
          <Ionicons name="download" size={14} color={Colors.info} />
          <Text style={[{ color: Colors.info, fontSize: 12, fontWeight: "600" }, rtlText]}>{t("exportInventoryCSV")}</Text>
        </Pressable>
        <Pressable onPress={() => handleExport("/api/reports/profit-export")} style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 6, backgroundColor: Colors.accent + "20", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 }}>
          <Ionicons name="download" size={14} color={Colors.accent} />
          <Text style={[{ color: Colors.accent, fontSize: 12, fontWeight: "600" }, rtlText]}>{t("exportProfitCSV")}</Text>
        </Pressable>
        <Pressable onPress={() => handleExport("/api/reports/employee-performance-export")} style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 6, backgroundColor: Colors.secondary + "20", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 }}>
          <Ionicons name="download" size={14} color={Colors.secondary} />
          <Text style={[{ color: Colors.secondary, fontSize: 12, fontWeight: "600" }, rtlText]}>{t("exportPerformanceCSV")}</Text>
        </Pressable>
      </GlassCard>
      <View style={[styles.statGrid, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <GlassCard style={styles.statCardHalf}>
          <View style={[styles.statIconWrap, { backgroundColor: Colors.accent + "20" }]}>
            <Ionicons name="today" size={20} color={Colors.accent} />
          </View>
          <Text style={[styles.statLabel, rtlTextAlign, rtlText]}>{t("todayRevenue")}</Text>
          <Text style={[styles.statValue, rtlTextAlign]}>CHF {Number(todayRevenue).toFixed(2)}</Text>
          <Text style={[styles.statSub, rtlTextAlign, rtlText]}>{todaySalesCount} {t("transactions")}</Text>
        </GlassCard>
        <GlassCard style={styles.statCardHalf}>
          <View style={[styles.statIconWrap, { backgroundColor: Colors.info + "20" }]}>
            <Ionicons name="calendar" size={20} color={Colors.info} />
          </View>
          <Text style={[styles.statLabel, rtlTextAlign, rtlText]}>{t("monthRevenue")}</Text>
          <Text style={[styles.statValue, rtlTextAlign]}>CHF {Number(weekRevenue).toFixed(2)}</Text>
        </GlassCard>
      </View>
      <View style={[styles.statGrid, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <GlassCard style={styles.statCardHalf}>
          <View style={[styles.statIconWrap, { backgroundColor: Colors.secondary + "20" }]}>
            <Ionicons name="trending-up" size={20} color={Colors.secondary} />
          </View>
          <Text style={[styles.statLabel, rtlTextAlign, rtlText]}>{t("monthRevenue")}</Text>
          <Text style={[styles.statValue, rtlTextAlign]}>CHF {Number(monthRevenue).toFixed(2)}</Text>
        </GlassCard>
        <GlassCard style={styles.statCardHalf}>
          <View style={[styles.statIconWrap, { backgroundColor: totalProfit >= 0 ? Colors.success + "20" : Colors.danger + "20" }]}>
            <Ionicons name="wallet" size={20} color={totalProfit >= 0 ? Colors.success : Colors.danger} />
          </View>
          <Text style={[styles.statLabel, rtlTextAlign, rtlText]}>{t("netProfit")}</Text>
          <Text style={[styles.statValue, { color: totalProfit >= 0 ? Colors.success : Colors.danger }, rtlTextAlign]}>
            ${Number(totalProfit).toFixed(2)}
          </Text>
        </GlassCard>
      </View>

      <Text style={[styles.sectionTitle, rtlTextAlign, rtlText]}>{t("revenueOverview")}</Text>
      <GlassCard>
        <BarChart
          isRTL={isRTL}
          data={[
            { label: t("todayRevenue"), value: Number(todayRevenue), color: Colors.accent },
            { label: t("weekRevenue"), value: Number(weekRevenue), color: Colors.info },
            { label: t("monthRevenue"), value: Number(monthRevenue), color: Colors.secondary },
            { label: t("totalRevenue"), value: Number(totalRevenue), color: Colors.success },
          ]}
        />
      </GlassCard>

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

      <Text style={[styles.sectionTitle, rtlTextAlign, rtlText]}>{t("topProducts")}</Text>
      {topProducts.length > 0 && (
        <GlassCard>
          <BarChart
            isRTL={isRTL}
            data={topProducts.slice(0, 6).map((p: any) => ({
              label: (p.name || "").substring(0, 8),
              value: Number(p.revenue || 0),
              color: Colors.accent,
            }))}
          />
        </GlassCard>
      )}
      {topProducts.length > 0 ? (
        <GlassCard>
          {topProducts.slice(0, 5).map((product: any, index: number) => (
            <View key={index} style={[styles.topProductRow, { flexDirection: isRTL ? "row-reverse" : "row" }, index < Math.min(topProducts.length, 5) - 1 && styles.topProductBorder]}>
              <View style={styles.topProductRank}>
                <Text style={styles.topProductRankText}>{index + 1}</Text>
              </View>
              <View style={styles.topProductInfo}>
                <Text style={[styles.topProductName, rtlTextAlign, rtlText]} numberOfLines={1}>{product.name}</Text>
                <View style={[styles.topProductMeta, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                  <Text style={styles.topProductRevenue}>CHF {Number(product.revenue || 0).toFixed(2)}</Text>
                  <Text style={[styles.topProductQty, rtlText]}>{product.totalSold || 0} {t("sold")}</Text>
                </View>
                <PercentBar percent={(product.revenue / topProductMax) * 100} color={Colors.accent} height={6} />
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

      <Text style={[styles.sectionTitle, rtlTextAlign, rtlText]}>{t("paymentMethods")}</Text>
      {salesByPaymentMethod.length > 0 && (
        <GlassCard>
          <DonutChart
            data={salesByPaymentMethod.map((m: any) => {
              const methodColors: Record<string, string> = { cash: Colors.success, card: Colors.info, mobile: Colors.secondary };
              return { label: m.method || "Other", value: Number(m.total || 0), color: methodColors[m.method?.toLowerCase()] || Colors.accent };
            })}
          />
        </GlassCard>
      )}
      {salesByPaymentMethod.length > 0 ? (
        <GlassCard>
          {salesByPaymentMethod.map((method: any, index: number) => {
            const pct = (method.total / paymentTotal) * 100;
            const methodColors: Record<string, string> = {
              cash: Colors.success,
              card: Colors.info,
              mobile: Colors.secondary,
            };
            const color = methodColors[method.method?.toLowerCase()] || Colors.accent;
            const methodIcons: Record<string, string> = {
              cash: "cash",
              card: "card",
              mobile: "phone-portrait",
            };
            const icon = methodIcons[method.method?.toLowerCase()] || "ellipse";
            return (
              <View key={index} style={[styles.paymentRow, { flexDirection: isRTL ? "row-reverse" : "row" }, index < salesByPaymentMethod.length - 1 && styles.topProductBorder]}>
                <View style={[styles.paymentIcon, { backgroundColor: color + "20" }]}>
                  <Ionicons name={icon as any} size={18} color={color} />
                </View>
                <View style={styles.paymentInfo}>
                  <View style={[styles.paymentHeader, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                    <Text style={[styles.paymentName, rtlText]}>{method.method || "Unknown"}</Text>
                    <Text style={styles.paymentPct}>{pct.toFixed(0)}%</Text>
                  </View>
                  <Text style={[styles.paymentAmount, rtlTextAlign, rtlText]}>CHF {Number(method.total || 0).toFixed(2)} ({method.count || 0} {t("salesCount")})</Text>
                  <PercentBar percent={pct} color={color} height={6} />
                </View>
              </View>
            );
          })}
        </GlassCard>
      ) : (
        <GlassCard>
          <View style={styles.empty}>
            <Ionicons name="pie-chart-outline" size={32} color={Colors.textMuted} />
            <Text style={[styles.emptyText, rtlText]}>{t("noPaymentData")}</Text>
          </View>
        </GlassCard>
      )}

      <Text style={[styles.sectionTitle, rtlTextAlign, rtlText]}>{t("quickStats")}</Text>
      <View style={[styles.quickStatsGrid, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <GlassCard style={styles.quickStatCard}>
          <Ionicons name="pricetag" size={20} color={Colors.accent} />
          <Text style={styles.quickStatValue}>CHF {Number(avgOrderValue).toFixed(2)}</Text>
          <Text style={[styles.quickStatLabel, rtlText]}>{t("avgOrder")}</Text>
        </GlassCard>
        <GlassCard style={styles.quickStatCard}>
          <Ionicons name="people" size={20} color={Colors.info} />
          <Text style={styles.quickStatValue}>{Number(totalCustomers).toFixed(0)}</Text>
          <Text style={[styles.quickStatLabel, rtlText]}>{t("customers")}</Text>
        </GlassCard>
        <GlassCard style={styles.quickStatCard}>
          <Ionicons name="cube" size={20} color={Colors.secondary} />
          <Text style={styles.quickStatValue}>{Number(totalProducts).toFixed(0)}</Text>
          <Text style={[styles.quickStatLabel, rtlText]}>{t("products")}</Text>
        </GlassCard>
        <GlassCard style={styles.quickStatCard}>
          <Ionicons name="alert-circle" size={20} color={Colors.danger} />
          <Text style={styles.quickStatValue}>{Number(lowStockItems).toFixed(0)}</Text>
          <Text style={[styles.quickStatLabel, rtlText]}>{t("lowStock")}</Text>
        </GlassCard>
      </View>

      <Text style={[styles.sectionTitle, rtlTextAlign, rtlText]}>{t("smartInsights")}</Text>
      {predictions ? (
        <GlassCard>
          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 12 }}>
              <View style={{ flex: 1, backgroundColor: Colors.accent + "10", borderRadius: 12, padding: 12 }}>
                <Text style={[{ color: Colors.textMuted, fontSize: 11 }, rtlTextAlign, rtlText]}>{t("projectedMonthly")}</Text>
                <Text style={[{ color: Colors.accent, fontSize: 18, fontWeight: "700" }, rtlTextAlign]}>CHF {Number(predictions.projectedMonthlyRevenue || 0).toFixed(0)}</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: Colors.success + "10", borderRadius: 12, padding: 12 }}>
                <Text style={[{ color: Colors.textMuted, fontSize: 11 }, rtlTextAlign, rtlText]}>{t("projectedYearly")}</Text>
                <Text style={[{ color: Colors.success, fontSize: 18, fontWeight: "700" }, rtlTextAlign]}>CHF {Number(predictions.projectedYearlyRevenue || 0).toFixed(0)}</Text>
              </View>
            </View>
            <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 12 }}>
              <View style={{ flex: 1, backgroundColor: Colors.info + "10", borderRadius: 12, padding: 12 }}>
                <Text style={[{ color: Colors.textMuted, fontSize: 11 }, rtlTextAlign, rtlText]}>{t("dailyAverage")}</Text>
                <Text style={[{ color: Colors.info, fontSize: 18, fontWeight: "700" }, rtlTextAlign]}>CHF {Number(predictions.avgDailyRevenue || 0).toFixed(2)}</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: Colors.warning + "10", borderRadius: 12, padding: 12 }}>
                <Text style={[{ color: Colors.textMuted, fontSize: 11 }, rtlTextAlign, rtlText]}>{t("slowMoving")}</Text>
                <Text style={[{ color: Colors.warning, fontSize: 18, fontWeight: "700" }, rtlTextAlign]}>{predictions.slowMovingCount || 0}</Text>
              </View>
            </View>
            {(predictions.insights || []).map((insight: string, i: number) => (
              <View key={i} style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 8, alignItems: isRTL ? "flex-end" : "flex-start" }}>
                <Ionicons name="bulb" size={16} color={Colors.warning} style={{ marginTop: 2 }} />
                <Text style={[{ color: Colors.textSecondary, fontSize: 13, flex: 1 }, rtlTextAlign, rtlText]}>{insight}</Text>
              </View>
            ))}
            {(predictions.stockAlerts || []).length > 0 && (
              <View style={{ marginTop: 4 }}>
                <Text style={[{ color: Colors.danger, fontSize: 13, fontWeight: "700", marginBottom: 6 }, rtlTextAlign, rtlText]}>{t("stockAlerts")}</Text>
                {(predictions.stockAlerts || []).slice(0, 5).map((alert: any, i: number) => (
                  <View key={i} style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 8, paddingVertical: 4 }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: alert.urgency === "critical" ? Colors.danger : Colors.warning }} />
                    <Text style={[{ color: Colors.text, fontSize: 12, flex: 1 }, rtlTextAlign, rtlText]}>{alert.productName}</Text>
                    <Text style={[{ color: Colors.textMuted, fontSize: 11 }, rtlText]}>{t("stock")}: {alert.currentStock}</Text>
                    <Text style={[{ color: Colors.accent, fontSize: 11, fontWeight: "600" }, rtlText]}>{alert.recommendation}</Text>
                  </View>
                ))}
              </View>
            )}
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

  const renderSales = () => (
    <>
      <Text style={[styles.sectionTitle, rtlTextAlign, rtlText]}>{t("dateFilter")}</Text>
      <GlassCard>
        <View style={{ flexDirection: isRTL ? "row-reverse" : "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={[{ color: Colors.textMuted, fontSize: 11, marginBottom: 4 }, rtlTextAlign, rtlText]}>{t("from")}</Text>
            <TextInput
              style={[{ backgroundColor: Colors.surfaceLight, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: Colors.text, fontSize: 14, borderWidth: 1, borderColor: Colors.cardBorder }, rtlTextAlign, rtlText]}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={Colors.textMuted}
              value={dateFrom}
              onChangeText={setDateFrom}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[{ color: Colors.textMuted, fontSize: 11, marginBottom: 4 }, rtlTextAlign, rtlText]}>{t("to")}</Text>
            <TextInput
              style={[{ backgroundColor: Colors.surfaceLight, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: Colors.text, fontSize: 14, borderWidth: 1, borderColor: Colors.cardBorder }, rtlTextAlign, rtlText]}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={Colors.textMuted}
              value={dateTo}
              onChangeText={setDateTo}
            />
          </View>
        </View>
        {(dateFrom || dateTo) && (
          <View style={{ marginTop: 10 }}>
            <Text style={[{ color: Colors.accent, fontSize: 13, fontWeight: "600" }, rtlTextAlign, rtlText]}>
              {filteredSales.length} {t("salesFoundInRange")}
            </Text>
            <Pressable onPress={() => { setDateFrom(""); setDateTo(""); }} style={{ marginTop: 6 }}>
              <Text style={[{ color: Colors.danger, fontSize: 12 }, rtlTextAlign, rtlText]}>{t("clearFilter")}</Text>
            </Pressable>
          </View>
        )}
      </GlassCard>

      {((dateFrom || dateTo) ? filteredSales : salesData).length > 0 && (
        <>
          <Text style={[styles.sectionTitle, rtlTextAlign, rtlText]}>{t("salesTrend")}</Text>
          <GlassCard>
            <MiniLineChart
              data={((dateFrom || dateTo) ? filteredSales : salesData).slice(0, 15).reverse().map((s: any) => Number(s.totalAmount || 0))}
              color={Colors.accent}
              height={120}
            />
            <View style={{ flexDirection: isRTL ? "row-reverse" : "row", justifyContent: "space-between", marginTop: 8 }}>
              <Text style={{ color: Colors.textMuted, fontSize: 10 }}>{t("oldest")}</Text>
              <Text style={{ color: Colors.textMuted, fontSize: 10 }}>{t("latest")}</Text>
            </View>
          </GlassCard>
        </>
      )}

      <Text style={[styles.sectionTitle, rtlTextAlign, rtlText]}>{t("recentSales")}</Text>
      <FlatList
        data={(dateFrom || dateTo) ? filteredSales : salesData}
        keyExtractor={(item: any) => String(item.id)}
        renderItem={renderSaleItem}
        scrollEnabled={!!((dateFrom || dateTo) ? filteredSales : salesData).length}
        ListEmptyComponent={
          <GlassCard>
            <View style={styles.empty}>
              <Ionicons name="receipt-outline" size={40} color={Colors.textMuted} />
              <Text style={[styles.emptyText, rtlText]}>{t("noSalesData")}</Text>
            </View>
          </GlassCard>
        }
      />
    </>
  );

  const renderInventory = () => (
    <>
      <Text style={[styles.sectionTitle, rtlTextAlign, rtlText]}>{t("stockAlerts")}</Text>
      {lowStock.length > 0 ? (
        <FlatList
          data={lowStock}
          keyExtractor={(item: any) => String(item.id)}
          scrollEnabled={!!lowStock.length}
          renderItem={({ item }: { item: any }) => {
            const product = allProducts.find((p: any) => p.id === item.productId);
            const qty = item.quantity ?? 0;
            const threshold = item.lowStockThreshold ?? 10;
            const pct = threshold > 0 ? Math.min((qty / threshold) * 100, 100) : 0;
            return (
              <GlassCard style={[styles.stockAlertCard, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                <View style={[styles.stockAlertLeft, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                  <View style={[styles.stockAlertIcon, { backgroundColor: Colors.danger + "20" }]}>
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
          }}
        />
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
        <FlatList
          data={inventoryMovements.slice(0, 15)}
          keyExtractor={(item: any) => String(item.id)}
          scrollEnabled={false}
          renderItem={({ item }: { item: any }) => {
            const typeColors: Record<string, string> = { sale: Colors.success, return: Colors.warning, adjustment: Colors.info, transfer: Colors.secondary, purchase: Colors.accent, count: Colors.danger };
            const typeIcons: Record<string, string> = { sale: "cart", return: "swap-horizontal", adjustment: "construct", transfer: "repeat", purchase: "cube", count: "clipboard" };
            const color = typeColors[item.type] || Colors.textMuted;
            return (
              <GlassCard style={{ flexDirection: isRTL ? "row-reverse" : "row", alignItems: "center", gap: 10, paddingVertical: 10 }}>
                <View style={[styles.paymentIcon, { backgroundColor: color + "20" }]}>
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
          }}
        />
      ) : (
        <GlassCard>
          <View style={styles.empty}>
            <Ionicons name="swap-vertical-outline" size={32} color={Colors.textMuted} />
            <Text style={[styles.emptyText, rtlText]}>{t("noMovements")}</Text>
          </View>
        </GlassCard>
      )}

      <Text style={[styles.sectionTitle, rtlTextAlign, rtlText]}>{t("fullInventory")}</Text>
      <FlatList
        data={allProducts}
        keyExtractor={(item: any) => String(item.id)}
        scrollEnabled={!!allProducts.length}
        renderItem={({ item }: { item: any }) => (
          <GlassCard style={[styles.inventoryCard, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <View style={[styles.inventoryLeft, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <View style={[styles.inventoryIcon, { backgroundColor: Colors.accent + "15" }]}>
                <Ionicons name="cube-outline" size={18} color={Colors.accent} />
              </View>
              <View style={styles.inventoryInfo}>
                <Text style={[styles.inventoryName, rtlTextAlign, rtlText]} numberOfLines={1}>{item.name}</Text>
                <Text style={[styles.inventoryPrice, rtlTextAlign]}>CHF {Number(item.price || 0).toFixed(2)}</Text>
              </View>
            </View>
            <View style={[styles.inventoryRight, { marginLeft: isRTL ? 0 : 12, marginRight: isRTL ? 12 : 0 }]}>
              <Text style={[styles.inventoryQty, { color: (item.stockQuantity ?? 0) <= 5 ? Colors.danger : (item.stockQuantity ?? 0) <= 15 ? Colors.warning : Colors.success }]}>
                {item.stockQuantity ?? 0}
              </Text>
              <Text style={[styles.inventoryUnit, rtlText]}>{t("inStock")}</Text>
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
                      {t("profit")}: ${Number(product.profit).toFixed(2)}
                    </Text>
                    <Text style={[styles.topProductQty, rtlText]}>{product.totalSold} {t("sold")} | {t("cost")}: ${Number(product.costPrice).toFixed(2)}</Text>
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
                  <Text style={[{ color: Colors.textMuted, fontSize: 11 }, rtlTextAlign, rtlText]}>{t("price")}: ${Number(product.price).toFixed(2)} | {t("sold")}: {product.recentSold}</Text>
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
