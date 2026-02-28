import React, { useState, useEffect } from "react";
import { StyleSheet, Text, View, Pressable, Platform, Alert, Dimensions, FlatList, ActivityIndicator, TextInput, Modal } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";
import { apiRequest, getQueryFn } from "@/lib/query-client";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useLanguage } from "@/lib/language-context";
import { useLicense } from "@/lib/license-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface Employee {
  id: number;
  name: string;
  role: string;
  pin?: string;
  branchId: number | null;
  permissions: string[];
}

const ROLE_COLORS: Record<string, string> = {
  admin: Colors.danger,
  manager: Colors.warning,
  cashier: Colors.info,
  owner: Colors.secondary,
};

function getRoleBadgeColor(role: string): string {
  return ROLE_COLORS[role.toLowerCase()] || Colors.info;
}

function getInitial(name: string): string {
  return name.charAt(0).toUpperCase();
}

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const { t, isRTL, rtlTextAlign, rtlText } = useLanguage();
  const { logoutLicense, tenant } = useLicense();
  const [mode, setMode] = useState<"select" | "pin">("select");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [screenDims, setScreenDims] = useState(Dimensions.get("window"));
  const [showShiftPrompt, setShowShiftPrompt] = useState(false);
  const [showOpeningCashInput, setShowOpeningCashInput] = useState(false);
  const [openingCash, setOpeningCash] = useState("");
  const [loggedInEmployee, setLoggedInEmployee] = useState<Employee | null>(null);
  useEffect(() => {
    const sub = Dimensions.addEventListener("change", ({ window }) => setScreenDims(window));
    return () => sub?.remove();
  }, []);
  const screenWidth = screenDims.width;
  const isTablet = screenWidth > 700;
  const NUM_COLUMNS = isTablet ? 3 : 2;
  const CARD_GAP = 12;
  const GRID_PADDING = 24;
  const CARD_WIDTH = (screenWidth - GRID_PADDING * 2 - CARD_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;
  const topPad = Platform.OS === "web" ? 67 : 0;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const { data: employees, isLoading: employeesLoading } = useQuery<Employee[]>({
    queryKey: [tenant?.id ? `/api/employees?tenantId=${tenant.id}` : "/api/employees"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const handleSelectEmployee = (emp: Employee) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedEmployee(emp);
    setPin("");
    setMode("pin");
  };

  const handleBack = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMode("select");
    setSelectedEmployee(null);
    setPin("");
  };

  const handlePinPress = (digit: string) => {
    if (pin.length < 4) {
      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const newPin = pin + digit;
      setPin(newPin);
      if (newPin.length === 4) {
        handleLogin(newPin);
      }
    }
  };

  const handleDelete = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPin(pin.slice(0, -1));
  };

  const handleLogin = async (pinCode: string) => {
    setLoading(true);
    try {
      const res = await apiRequest("POST", "/api/employees/login", { pin: pinCode, employeeId: selectedEmployee?.id });
      const emp = await res.json();
      login(emp);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      try {
        const shiftRes = await apiRequest("GET", `/api/shifts/active/${emp.id}`);
        const activeShift = await shiftRes.json();
        if (!activeShift) {
          setLoggedInEmployee(emp);
          setShowShiftPrompt(true);
        } else {
          router.replace("/(tabs)");
        }
      } catch {
        router.replace("/(tabs)");
      }
    } catch (e: any) {
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t("loginFailed"), t("invalidPinTryAgain"));
      setPin("");
    } finally {
      setLoading(false);
    }
  };

  const handleStartShift = async () => {
    if (!loggedInEmployee) return;
    try {
      await apiRequest("POST", "/api/shifts", {
        employeeId: loggedInEmployee.id,
        branchId: loggedInEmployee.branchId || 1,
        openingCash: openingCash ? Number(openingCash) : 0,
      });
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(t("success"), t("shiftStartedSuccess"));
    } catch (e: any) {
      console.error("Failed to start shift:", e);
    }
    setShowShiftPrompt(false);
    setShowOpeningCashInput(false);
    setOpeningCash("");
    router.replace("/(tabs)");
  };

  const handleSkipShift = () => {
    setShowShiftPrompt(false);
    setShowOpeningCashInput(false);
    setOpeningCash("");
    router.replace("/(tabs)");
  };

  const renderEmployeeCard = ({ item }: { item: Employee }) => {
    const badgeColor = getRoleBadgeColor(item.role);
    return (
      <Pressable
        style={({ pressed }) => [
          styles.employeeCard,
          { width: CARD_WIDTH },
          pressed && styles.employeeCardPressed,
        ]}
        onPress={() => handleSelectEmployee(item)}
      >
        <View style={[styles.avatar, { borderColor: badgeColor }]}>
          <Text style={styles.avatarText}>{getInitial(item.name)}</Text>
        </View>
        <Text style={[styles.employeeName, rtlText]} numberOfLines={1}>{item.name}</Text>
        <View style={[styles.roleBadge, { backgroundColor: badgeColor }]}>
          <Text style={styles.roleBadgeText}>{item.role}</Text>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + topPad, paddingBottom: insets.bottom + bottomPad }]}>
      <LinearGradient
        colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.content}>
          <View style={styles.logoWrap}>
            <View style={styles.logoCircle}>
              <Ionicons name="cart" size={36} color={Colors.accent} />
            </View>
            <Text style={styles.appName}>Barmagly</Text>
            <Text style={[styles.appDesc, rtlText]}>{t("smartPosSystem")}</Text>
          </View>

          {mode === "select" ? (
            <View style={styles.selectionContainer}>
              <Text style={[styles.modeLabel, rtlTextAlign, rtlText]}>{t("selectEmployee")}</Text>
              {employeesLoading ? (
                <ActivityIndicator size="large" color={Colors.white} style={{ marginTop: 32 }} />
              ) : (
                <FlatList
                  data={employees || []}
                  renderItem={renderEmployeeCard}
                  keyExtractor={(item) => item.id.toString()}
                  numColumns={NUM_COLUMNS}
                  key={NUM_COLUMNS}
                  scrollEnabled={!!(employees && employees.length)}
                  contentContainerStyle={styles.gridContent}
                  columnWrapperStyle={styles.gridRow}
                  showsVerticalScrollIndicator={false}
                  ListEmptyComponent={
                    <Text style={[styles.emptyText, rtlText]}>{t("noEmployees")}</Text>
                  }
                />
              )}

              <Pressable
                onPress={async () => {
                  try {
                    await AsyncStorage.removeItem("hasSeenIntro");
                    await logoutLicense();
                    router.replace("/");
                  } catch (e) {
                    console.error("Reset failed", e);
                  }
                }}
                style={{ marginTop: 20 }}
              >
                <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, textDecorationLine: "underline" }}>
                  Reset App Flow (Testing)
                </Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.pinContainer}>
              <Pressable style={[styles.backButton, isRTL ? { left: undefined, right: 0 } : undefined]} onPress={handleBack}>
                <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={24} color={Colors.white} />
              </Pressable>

              {selectedEmployee && (
                <View style={styles.selectedUserInfo}>
                  <View style={[styles.avatarLarge, { borderColor: getRoleBadgeColor(selectedEmployee.role) }]}>
                    <Text style={styles.avatarLargeText}>{getInitial(selectedEmployee.name)}</Text>
                  </View>
                  <Text style={[styles.selectedUserName, rtlText]}>{selectedEmployee.name}</Text>
                </View>
              )}

              <Text style={[styles.modeLabel, rtlTextAlign, rtlText]}>{t("enterPin")}</Text>
              <View style={styles.pinDots}>
                {[0, 1, 2, 3].map((i) => (
                  <View key={i} style={[styles.dot, i < pin.length && styles.dotFilled]} />
                ))}
              </View>

              {loading ? (
                <ActivityIndicator size="large" color={Colors.white} style={{ marginTop: 24 }} />
              ) : (
                <View style={styles.keypad}>
                  {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"].map((key) => {
                    if (key === "") return <View key="empty" style={styles.keyBtn} />;
                    if (key === "del") {
                      return (
                        <Pressable key="del" style={styles.keyBtn} onPress={handleDelete}>
                          <Ionicons name="backspace" size={24} color={Colors.white} />
                        </Pressable>
                      );
                    }
                    return (
                      <Pressable key={key} style={styles.keyBtn} onPress={() => handlePinPress(key)}>
                        <Text style={styles.keyText}>{key}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
          )}
        </View>
      </LinearGradient>
      <Modal visible={showShiftPrompt} animationType="fade" transparent>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", alignItems: "center", padding: 24 }}>
          <View style={{ backgroundColor: Colors.surface, borderRadius: 20, padding: 24, width: "100%", maxWidth: 380, borderWidth: 1, borderColor: Colors.cardBorder }}>
            {!showOpeningCashInput ? (
              <>
                <View style={{ alignItems: "center", marginBottom: 20 }}>
                  <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.accent + "20", justifyContent: "center", alignItems: "center", marginBottom: 12 }}>
                    <Ionicons name="time-outline" size={30} color={Colors.accent} />
                  </View>
                  <Text style={{ color: Colors.text, fontSize: 20, fontWeight: "700", marginBottom: 8 }}>{t("shiftPromptTitle")}</Text>
                  <Text style={{ color: Colors.textSecondary, fontSize: 14, textAlign: "center" }}>{t("shiftPromptMessage")}</Text>
                </View>
                <Pressable onPress={() => setShowOpeningCashInput(true)} style={{ backgroundColor: Colors.accent, borderRadius: 12, paddingVertical: 14, alignItems: "center", marginBottom: 10 }}>
                  <Text style={{ color: Colors.textDark, fontSize: 16, fontWeight: "700" }}>{t("startShiftNow")}</Text>
                </Pressable>
                <Pressable onPress={handleSkipShift} style={{ borderRadius: 12, paddingVertical: 14, alignItems: "center", borderWidth: 1, borderColor: Colors.cardBorder }}>
                  <Text style={{ color: Colors.textSecondary, fontSize: 16, fontWeight: "500" }}>{t("skipForNow")}</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={{ color: Colors.text, fontSize: 18, fontWeight: "700", marginBottom: 16, textAlign: "center" }}>{t("enterOpeningCash")}</Text>
                <TextInput
                  style={{ backgroundColor: Colors.surfaceLight, borderRadius: 12, padding: 14, fontSize: 18, color: Colors.text, textAlign: "center", borderWidth: 1, borderColor: Colors.cardBorder, marginBottom: 16 }}
                  value={openingCash}
                  onChangeText={setOpeningCash}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={Colors.textMuted}
                  autoFocus
                />
                <Pressable onPress={handleStartShift} style={{ backgroundColor: Colors.accent, borderRadius: 12, paddingVertical: 14, alignItems: "center", marginBottom: 10 }}>
                  <Text style={{ color: Colors.textDark, fontSize: 16, fontWeight: "700" }}>{t("startShift")}</Text>
                </Pressable>
                <Pressable onPress={() => setShowOpeningCashInput(false)} style={{ borderRadius: 12, paddingVertical: 14, alignItems: "center" }}>
                  <Text style={{ color: Colors.textSecondary, fontSize: 15 }}>{t("cancel")}</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  logoWrap: {
    alignItems: "center",
    marginBottom: 24,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  appName: {
    fontSize: 32,
    fontWeight: "900" as const,
    color: Colors.white,
    letterSpacing: 1,
  },
  appDesc: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    marginTop: 4,
  },
  modeLabel: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 16,
    fontWeight: "600" as const,
    marginBottom: 16,
    textAlign: "center" as const,
  },
  selectionContainer: {
    flex: 1,
    width: "100%",
    alignItems: "center",
  },
  gridContent: {
    paddingBottom: 16,
  },
  gridRow: {
    gap: 12,
    justifyContent: "center",
    marginBottom: 12,
  },
  employeeCard: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  employeeCardPressed: {
    backgroundColor: "rgba(255,255,255,0.2)",
    transform: [{ scale: 0.96 }],
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
    borderWidth: 2,
  },
  avatarText: {
    color: Colors.white,
    fontSize: 24,
    fontWeight: "700" as const,
  },
  employeeName: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: "600" as const,
    marginBottom: 8,
    textAlign: "center" as const,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  roleBadgeText: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: "700" as const,
    textTransform: "capitalize" as const,
  },
  pinContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  backButton: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    padding: 8,
    zIndex: 10,
  },
  selectedUserInfo: {
    alignItems: "center",
    marginBottom: 24,
  },
  avatarLarge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
    borderWidth: 3,
  },
  avatarLargeText: {
    color: Colors.white,
    fontSize: 32,
    fontWeight: "700" as const,
  },
  selectedUserName: {
    color: Colors.white,
    fontSize: 20,
    fontWeight: "700" as const,
  },
  pinDots: {
    flexDirection: "row" as const,
    gap: 20,
    marginBottom: 32,
  },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.5)",
    backgroundColor: "transparent",
  },
  dotFilled: {
    backgroundColor: Colors.white,
    borderColor: Colors.white,
  },
  keypad: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    width: 280,
    justifyContent: "center",
  },
  keyBtn: {
    width: 280 / 3,
    height: 64,
    justifyContent: "center",
    alignItems: "center",
  },
  keyText: {
    color: Colors.white,
    fontSize: 28,
    fontWeight: "600" as const,
  },
  emptyText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 16,
    marginTop: 32,
    textAlign: "center" as const,
  },
});
