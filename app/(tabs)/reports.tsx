import React, { useState } from "react";
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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Colors } from "@/constants/colors";
import { getQueryFn } from "@/lib/query-client";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const isTablet = SCREEN_WIDTH > 700;

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

export default function ReportsScreen() {
  const insets = useSafeAreaInsets();
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

  const topPad = Platform.OS === "web" ? 67 : 0;
  const bottomPad = Platform.OS === "web" ? 84 : 60;

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
      <View style={styles.statGrid}>
        <GlassCard style={styles.statCardHalf}>
          <View style={[styles.statIconWrap, { backgroundColor: Colors.accent + "20" }]}>
            <Ionicons name="today" size={20} color={Colors.accent} />
          </View>
          <Text style={styles.statLabel}>Today's Revenue</Text>
          <Text style={styles.statValue}>${Number(todayRevenue).toFixed(2)}</Text>
          <Text style={styles.statSub}>{todaySalesCount} transactions</Text>
        </GlassCard>
        <GlassCard style={styles.statCardHalf}>
          <View style={[styles.statIconWrap, { backgroundColor: Colors.info + "20" }]}>
            <Ionicons name="calendar" size={20} color={Colors.info} />
          </View>
          <Text style={styles.statLabel}>Week Revenue</Text>
          <Text style={styles.statValue}>${Number(weekRevenue).toFixed(2)}</Text>
        </GlassCard>
      </View>
      <View style={styles.statGrid}>
        <GlassCard style={styles.statCardHalf}>
          <View style={[styles.statIconWrap, { backgroundColor: Colors.secondary + "20" }]}>
            <Ionicons name="trending-up" size={20} color={Colors.secondary} />
          </View>
          <Text style={styles.statLabel}>Month Revenue</Text>
          <Text style={styles.statValue}>${Number(monthRevenue).toFixed(2)}</Text>
        </GlassCard>
        <GlassCard style={styles.statCardHalf}>
          <View style={[styles.statIconWrap, { backgroundColor: totalProfit >= 0 ? Colors.success + "20" : Colors.danger + "20" }]}>
            <Ionicons name="wallet" size={20} color={totalProfit >= 0 ? Colors.success : Colors.danger} />
          </View>
          <Text style={styles.statLabel}>Net Profit</Text>
          <Text style={[styles.statValue, { color: totalProfit >= 0 ? Colors.success : Colors.danger }]}>
            ${Number(totalProfit).toFixed(2)}
          </Text>
        </GlassCard>
      </View>

      <Text style={styles.sectionTitle}>Revenue vs Expenses</Text>
      <GlassCard>
        <View style={styles.revExpRow}>
          <View style={styles.revExpItem}>
            <View style={styles.revExpHeader}>
              <View style={[styles.revExpDot, { backgroundColor: Colors.accent }]} />
              <Text style={styles.revExpLabel}>Revenue</Text>
            </View>
            <Text style={styles.revExpValue}>${Number(totalRevenue).toFixed(2)}</Text>
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
              <Text style={styles.revExpLabel}>Expenses</Text>
            </View>
            <Text style={styles.revExpValue}>${Number(totalExpenses).toFixed(2)}</Text>
            <View style={[styles.barTrack, { height: 12, marginTop: 6 }]}>
              <View style={[styles.barFill, { width: `${(totalExpenses / revenueExpenseMax) * 100}%`, backgroundColor: Colors.danger, height: 12 }]} />
            </View>
          </View>
        </View>
      </GlassCard>

      <Text style={styles.sectionTitle}>Top Products</Text>
      {topProducts.length > 0 ? (
        <GlassCard>
          {topProducts.slice(0, 5).map((product: any, index: number) => (
            <View key={index} style={[styles.topProductRow, index < Math.min(topProducts.length, 5) - 1 && styles.topProductBorder]}>
              <View style={styles.topProductRank}>
                <Text style={styles.topProductRankText}>{index + 1}</Text>
              </View>
              <View style={styles.topProductInfo}>
                <Text style={styles.topProductName} numberOfLines={1}>{product.name}</Text>
                <View style={styles.topProductMeta}>
                  <Text style={styles.topProductRevenue}>${Number(product.revenue || 0).toFixed(2)}</Text>
                  <Text style={styles.topProductQty}>{product.totalSold || 0} sold</Text>
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
            <Text style={styles.emptyText}>No product data yet</Text>
          </View>
        </GlassCard>
      )}

      <Text style={styles.sectionTitle}>Payment Methods</Text>
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
              <View key={index} style={[styles.paymentRow, index < salesByPaymentMethod.length - 1 && styles.topProductBorder]}>
                <View style={[styles.paymentIcon, { backgroundColor: color + "20" }]}>
                  <Ionicons name={icon as any} size={18} color={color} />
                </View>
                <View style={styles.paymentInfo}>
                  <View style={styles.paymentHeader}>
                    <Text style={styles.paymentName}>{method.method || "Unknown"}</Text>
                    <Text style={styles.paymentPct}>{pct.toFixed(0)}%</Text>
                  </View>
                  <Text style={styles.paymentAmount}>${Number(method.total || 0).toFixed(2)} ({method.count || 0} sales)</Text>
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
            <Text style={styles.emptyText}>No payment data yet</Text>
          </View>
        </GlassCard>
      )}

      <Text style={styles.sectionTitle}>Quick Stats</Text>
      <View style={styles.quickStatsGrid}>
        <GlassCard style={styles.quickStatCard}>
          <Ionicons name="pricetag" size={20} color={Colors.accent} />
          <Text style={styles.quickStatValue}>${Number(avgOrderValue).toFixed(2)}</Text>
          <Text style={styles.quickStatLabel}>Avg Order</Text>
        </GlassCard>
        <GlassCard style={styles.quickStatCard}>
          <Ionicons name="people" size={20} color={Colors.info} />
          <Text style={styles.quickStatValue}>{Number(totalCustomers).toFixed(0)}</Text>
          <Text style={styles.quickStatLabel}>Customers</Text>
        </GlassCard>
        <GlassCard style={styles.quickStatCard}>
          <Ionicons name="cube" size={20} color={Colors.secondary} />
          <Text style={styles.quickStatValue}>{Number(totalProducts).toFixed(0)}</Text>
          <Text style={styles.quickStatLabel}>Products</Text>
        </GlassCard>
        <GlassCard style={styles.quickStatCard}>
          <Ionicons name="alert-circle" size={20} color={Colors.danger} />
          <Text style={styles.quickStatValue}>{Number(lowStockItems).toFixed(0)}</Text>
          <Text style={styles.quickStatLabel}>Low Stock</Text>
        </GlassCard>
      </View>
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
        <View style={styles.saleTop}>
          <View style={styles.saleReceiptWrap}>
            <Ionicons name="receipt-outline" size={16} color={Colors.accent} />
            <Text style={styles.saleReceipt}>{item.receiptNumber}</Text>
          </View>
          <Text style={styles.saleAmount}>${Number(item.totalAmount).toFixed(2)}</Text>
        </View>
        <View style={styles.saleBottom}>
          <Text style={styles.saleDate}>{new Date(item.createdAt).toLocaleDateString()} {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Text>
          <View style={styles.saleBadges}>
            <View style={[styles.badge, { backgroundColor: badgeColor + "20" }]}>
              <Text style={[styles.badgeText, { color: badgeColor }]}>{item.paymentMethod}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: statusColor + "20" }]}>
              <Text style={[styles.badgeText, { color: statusColor }]}>{item.status}</Text>
            </View>
          </View>
        </View>
      </GlassCard>
    );
  };

  const renderSales = () => (
    <>
      <Text style={styles.sectionTitle}>Date Filter</Text>
      <GlassCard>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: Colors.textMuted, fontSize: 11, marginBottom: 4 }}>From</Text>
            <TextInput
              style={{ backgroundColor: Colors.surfaceLight, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: Colors.text, fontSize: 14, borderWidth: 1, borderColor: Colors.cardBorder }}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={Colors.textMuted}
              value={dateFrom}
              onChangeText={setDateFrom}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: Colors.textMuted, fontSize: 11, marginBottom: 4 }}>To</Text>
            <TextInput
              style={{ backgroundColor: Colors.surfaceLight, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: Colors.text, fontSize: 14, borderWidth: 1, borderColor: Colors.cardBorder }}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={Colors.textMuted}
              value={dateTo}
              onChangeText={setDateTo}
            />
          </View>
        </View>
        {(dateFrom || dateTo) && (
          <View style={{ marginTop: 10 }}>
            <Text style={{ color: Colors.accent, fontSize: 13, fontWeight: "600" }}>
              {filteredSales.length} sales found in range
            </Text>
            <Pressable onPress={() => { setDateFrom(""); setDateTo(""); }} style={{ marginTop: 6 }}>
              <Text style={{ color: Colors.danger, fontSize: 12 }}>Clear Filter</Text>
            </Pressable>
          </View>
        )}
      </GlassCard>

      <Text style={styles.sectionTitle}>Recent Sales</Text>
      <FlatList
        data={(dateFrom || dateTo) ? filteredSales : salesData}
        keyExtractor={(item: any) => String(item.id)}
        renderItem={renderSaleItem}
        scrollEnabled={!!((dateFrom || dateTo) ? filteredSales : salesData).length}
        ListEmptyComponent={
          <GlassCard>
            <View style={styles.empty}>
              <Ionicons name="receipt-outline" size={40} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No sales recorded yet</Text>
            </View>
          </GlassCard>
        }
      />
    </>
  );

  const renderInventory = () => (
    <>
      <Text style={styles.sectionTitle}>Low Stock Alerts</Text>
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
              <GlassCard style={styles.stockAlertCard}>
                <View style={styles.stockAlertLeft}>
                  <View style={[styles.stockAlertIcon, { backgroundColor: Colors.danger + "20" }]}>
                    <Ionicons name="warning" size={20} color={Colors.danger} />
                  </View>
                  <View style={styles.stockAlertInfo}>
                    <Text style={styles.stockAlertName} numberOfLines={1}>{product?.name || `Product #${item.productId}`}</Text>
                    <Text style={styles.stockAlertMeta}>Threshold: {threshold}</Text>
                    <PercentBar percent={pct} color={qty <= 5 ? Colors.danger : Colors.warning} height={4} />
                  </View>
                </View>
                <View style={styles.stockAlertRight}>
                  <Text style={[styles.stockAlertQty, { color: qty <= 5 ? Colors.danger : Colors.warning }]}>
                    {qty}
                  </Text>
                  <Text style={styles.stockAlertUnit}>left</Text>
                </View>
              </GlassCard>
            );
          }}
        />
      ) : (
        <GlassCard>
          <View style={styles.empty}>
            <Ionicons name="checkmark-circle" size={40} color={Colors.success} />
            <Text style={styles.emptyText}>All stock levels are healthy</Text>
          </View>
        </GlassCard>
      )}

      <Text style={styles.sectionTitle}>Recent Movements</Text>
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
              <GlassCard style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10 }}>
                <View style={[styles.paymentIcon, { backgroundColor: color + "20" }]}>
                  <Ionicons name={(typeIcons[item.type] || "ellipse") as any} size={16} color={color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: Colors.text, fontSize: 13, fontWeight: "600" }}>{item.notes || `${item.type} movement`}</Text>
                  <Text style={{ color: Colors.textMuted, fontSize: 11 }}>{new Date(item.createdAt).toLocaleString()}</Text>
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
            <Text style={styles.emptyText}>No inventory movements yet</Text>
          </View>
        </GlassCard>
      )}

      <Text style={styles.sectionTitle}>Full Inventory</Text>
      <FlatList
        data={allProducts}
        keyExtractor={(item: any) => String(item.id)}
        scrollEnabled={!!allProducts.length}
        renderItem={({ item }: { item: any }) => (
          <GlassCard style={styles.inventoryCard}>
            <View style={styles.inventoryLeft}>
              <View style={[styles.inventoryIcon, { backgroundColor: Colors.accent + "15" }]}>
                <Ionicons name="cube-outline" size={18} color={Colors.accent} />
              </View>
              <View style={styles.inventoryInfo}>
                <Text style={styles.inventoryName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.inventoryPrice}>${Number(item.price || 0).toFixed(2)}</Text>
              </View>
            </View>
            <View style={styles.inventoryRight}>
              <Text style={[styles.inventoryQty, { color: (item.stockQuantity ?? 0) <= 5 ? Colors.danger : (item.stockQuantity ?? 0) <= 15 ? Colors.warning : Colors.success }]}>
                {item.stockQuantity ?? 0}
              </Text>
              <Text style={styles.inventoryUnit}>in stock</Text>
            </View>
          </GlassCard>
        )}
        ListEmptyComponent={
          <GlassCard>
            <View style={styles.empty}>
              <Ionicons name="cube-outline" size={40} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No products in inventory</Text>
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
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <FlatList
          data={activityLog}
          keyExtractor={(item: any) => String(item.id)}
          scrollEnabled={!!activityLog.length}
          renderItem={({ item }: { item: any }) => {
            const color = getActionColor(item.action);
            return (
              <GlassCard style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 }}>
                <View style={[styles.paymentIcon, { backgroundColor: color + "20" }]}>
                  <Ionicons name={getActionIcon(item.action) as any} size={18} color={color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: Colors.text, fontSize: 14, fontWeight: "600" }}>{item.details || item.action}</Text>
                  <Text style={{ color: Colors.textMuted, fontSize: 11, marginTop: 2 }}>
                    {new Date(item.createdAt).toLocaleString()} | {item.action.replace(/_/g, " ")}
                  </Text>
                </View>
                <View style={[styles.badge, { backgroundColor: color + "20" }]}>
                  <Text style={[styles.badgeText, { color }]}>{item.action.replace(/_/g, " ")}</Text>
                </View>
              </GlassCard>
            );
          }}
          ListEmptyComponent={
            <GlassCard>
              <View style={styles.empty}>
                <Ionicons name="list-outline" size={40} color={Colors.textMuted} />
                <Text style={styles.emptyText}>No activity recorded yet</Text>
              </View>
            </GlassCard>
          }
        />
      </>
    );
  };

  const renderReturns = () => (
    <>
      <View style={styles.statGrid}>
        <GlassCard style={styles.statCardHalf}>
          <View style={[styles.statIconWrap, { backgroundColor: Colors.warning + "20" }]}>
            <Ionicons name="swap-horizontal" size={20} color={Colors.warning} />
          </View>
          <Text style={styles.statLabel}>Total Returns</Text>
          <Text style={styles.statValue}>{returnsReport?.totalReturns || 0}</Text>
        </GlassCard>
        <GlassCard style={styles.statCardHalf}>
          <View style={[styles.statIconWrap, { backgroundColor: Colors.danger + "20" }]}>
            <Ionicons name="cash" size={20} color={Colors.danger} />
          </View>
          <Text style={styles.statLabel}>Total Refunds</Text>
          <Text style={styles.statValue}>${Number(returnsReport?.totalRefundAmount || 0).toFixed(2)}</Text>
        </GlassCard>
      </View>

      <Text style={styles.sectionTitle}>Recent Returns</Text>
      {(returnsReport?.recentReturns || []).length > 0 ? (
        (returnsReport.recentReturns || []).map((ret: any) => (
          <GlassCard key={ret.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 }}>
            <View style={[styles.paymentIcon, { backgroundColor: Colors.warning + "20" }]}>
              <Ionicons name="swap-horizontal" size={18} color={Colors.warning} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: Colors.text, fontSize: 14, fontWeight: "600" }}>Return #{ret.id} - Sale #{ret.originalSaleId}</Text>
              <Text style={{ color: Colors.textMuted, fontSize: 11, marginTop: 2 }}>
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
            <Text style={styles.emptyText}>No returns recorded</Text>
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
        <View style={styles.statGrid}>
          <GlassCard style={styles.statCardHalf}>
            <View style={[styles.statIconWrap, { backgroundColor: Colors.success + "20" }]}>
              <Ionicons name="trending-up" size={20} color={Colors.success} />
            </View>
            <Text style={styles.statLabel}>Total Profit</Text>
            <Text style={[styles.statValue, { color: totalProfitAll >= 0 ? Colors.success : Colors.danger }]}>
              ${totalProfitAll.toFixed(2)}
            </Text>
          </GlassCard>
          <GlassCard style={styles.statCardHalf}>
            <View style={[styles.statIconWrap, { backgroundColor: Colors.info + "20" }]}>
              <Ionicons name="people" size={20} color={Colors.info} />
            </View>
            <Text style={styles.statLabel}>Active Cashiers</Text>
            <Text style={styles.statValue}>{cashierPerformance.length}</Text>
          </GlassCard>
        </View>

        <Text style={styles.sectionTitle}>Cashier Performance</Text>
        {cashierPerformance.length > 0 ? (
          <GlassCard>
            {cashierPerformance.map((perf: any, index: number) => (
              <View key={perf.employeeId} style={[styles.topProductRow, index < cashierPerformance.length - 1 && styles.topProductBorder]}>
                <View style={styles.topProductRank}>
                  <Text style={styles.topProductRankText}>{index + 1}</Text>
                </View>
                <View style={styles.topProductInfo}>
                  <Text style={styles.topProductName}>{perf.employeeName}</Text>
                  <View style={styles.topProductMeta}>
                    <Text style={styles.topProductRevenue}>${Number(perf.totalRevenue).toFixed(2)}</Text>
                    <Text style={styles.topProductQty}>{perf.salesCount} sales | Avg ${Number(perf.avgSaleValue).toFixed(2)}</Text>
                  </View>
                </View>
                <View style={[styles.badge, { backgroundColor: (perf.role === "admin" ? Colors.danger : perf.role === "manager" ? Colors.warning : Colors.info) + "20" }]}>
                  <Text style={[styles.badgeText, { color: perf.role === "admin" ? Colors.danger : perf.role === "manager" ? Colors.warning : Colors.info }]}>{perf.role}</Text>
                </View>
              </View>
            ))}
          </GlassCard>
        ) : (
          <GlassCard>
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={32} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No sales data yet</Text>
            </View>
          </GlassCard>
        )}

        <Text style={styles.sectionTitle}>Profit by Product</Text>
        {profitByProduct.length > 0 ? (
          <GlassCard>
            {profitByProduct.slice(0, 10).map((product: any, index: number) => (
              <View key={product.productId} style={[styles.topProductRow, index < Math.min(profitByProduct.length, 10) - 1 && styles.topProductBorder]}>
                <View style={styles.topProductRank}>
                  <Text style={styles.topProductRankText}>{index + 1}</Text>
                </View>
                <View style={styles.topProductInfo}>
                  <Text style={styles.topProductName} numberOfLines={1}>{product.productName}</Text>
                  <View style={styles.topProductMeta}>
                    <Text style={[styles.topProductRevenue, { color: product.profit >= 0 ? Colors.success : Colors.danger }]}>
                      Profit: ${Number(product.profit).toFixed(2)}
                    </Text>
                    <Text style={styles.topProductQty}>{product.totalSold} sold | Cost: ${Number(product.costPrice).toFixed(2)}</Text>
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
              <Text style={styles.emptyText}>No profit data yet</Text>
            </View>
          </GlassCard>
        )}

        <Text style={styles.sectionTitle}>Slow Moving Products (Last 30 Days)</Text>
        {slowMovingProducts.length > 0 ? (
          <GlassCard>
            {slowMovingProducts.slice(0, 8).map((product: any, index: number) => (
              <View key={product.id} style={[{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 }, index < Math.min(slowMovingProducts.length, 8) - 1 && styles.topProductBorder]}>
                <View style={[styles.paymentIcon, { backgroundColor: Colors.warning + "20" }]}>
                  <Ionicons name="trending-down" size={16} color={Colors.warning} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: Colors.text, fontSize: 13, fontWeight: "600" }} numberOfLines={1}>{product.name}</Text>
                  <Text style={{ color: Colors.textMuted, fontSize: 11 }}>Price: ${Number(product.price).toFixed(2)} | Sold: {product.recentSold}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: Colors.warning + "20" }]}>
                  <Text style={[styles.badgeText, { color: Colors.warning }]}>Slow</Text>
                </View>
              </View>
            ))}
          </GlassCard>
        ) : (
          <GlassCard>
            <View style={styles.empty}>
              <Ionicons name="checkmark-circle" size={32} color={Colors.success} />
              <Text style={styles.emptyText}>All products are selling well</Text>
            </View>
          </GlassCard>
        )}
      </>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + topPad }]}>
      <LinearGradient
        colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <Ionicons name="analytics" size={24} color={Colors.white} />
        <Text style={styles.headerTitle}>Reports & Analytics</Text>
      </LinearGradient>

      <View style={styles.tabRow}>
        {(["overview", "sales", "inventory", "returns", "finance", "activity"] as const).map((t) => (
          <Pressable
            key={t}
            style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
            onPress={() => setTab(t)}
          >
            <Ionicons
              name={TAB_ICONS[t] as any}
              size={16}
              color={tab === t ? Colors.textDark : Colors.textSecondary}
            />
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
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
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.white,
  },
  tabRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  tabBtn: {
    flexDirection: "row",
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
    flexDirection: "row",
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
    flexDirection: "row",
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
    flexDirection: "row",
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
    flexDirection: "row",
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
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  quickStatCard: {
    flex: 1,
    minWidth: isTablet ? 150 : 70,
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  saleReceiptWrap: {
    flexDirection: "row",
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
    marginLeft: 12,
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
    marginLeft: 12,
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
