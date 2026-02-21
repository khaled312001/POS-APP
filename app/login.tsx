import React, { useState, useEffect } from "react";
import { StyleSheet, Text, View, Pressable, Platform, Alert, Dimensions, FlatList, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";
import { apiRequest, getQueryFn } from "@/lib/query-client";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const isTablet = SCREEN_WIDTH > 700;
const NUM_COLUMNS = isTablet ? 3 : 2;

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
  const [mode, setMode] = useState<"select" | "pin">("select");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const topPad = Platform.OS === "web" ? 67 : 0;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const { data: employees, isLoading: employeesLoading } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
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
      const res = await apiRequest("POST", "/api/employees/login", { pin: pinCode });
      const emp = await res.json();
      login(emp);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(tabs)");
    } catch (e: any) {
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Login Failed", "Invalid PIN. Please try again.");
      setPin("");
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    try {
      const res = await apiRequest("POST", "/api/employees/login", { pin: "1234" });
      const emp = await res.json();
      login(emp);
      router.replace("/(tabs)");
    } catch {
      router.replace("/(tabs)");
    }
  };

  const renderEmployeeCard = ({ item }: { item: Employee }) => {
    const badgeColor = getRoleBadgeColor(item.role);
    return (
      <Pressable
        style={({ pressed }) => [
          styles.employeeCard,
          pressed && styles.employeeCardPressed,
        ]}
        onPress={() => handleSelectEmployee(item)}
      >
        <View style={[styles.avatar, { borderColor: badgeColor }]}>
          <Text style={styles.avatarText}>{getInitial(item.name)}</Text>
        </View>
        <Text style={styles.employeeName} numberOfLines={1}>{item.name}</Text>
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
            <Text style={styles.appDesc}>Smart POS System</Text>
          </View>

          {mode === "select" ? (
            <View style={styles.selectionContainer}>
              <Text style={styles.modeLabel}>Select User</Text>
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
                    <Text style={styles.emptyText}>No employees found</Text>
                  }
                />
              )}
            </View>
          ) : (
            <View style={styles.pinContainer}>
              <Pressable style={styles.backButton} onPress={handleBack}>
                <Ionicons name="arrow-back" size={24} color={Colors.white} />
              </Pressable>

              {selectedEmployee && (
                <View style={styles.selectedUserInfo}>
                  <View style={[styles.avatarLarge, { borderColor: getRoleBadgeColor(selectedEmployee.role) }]}>
                    <Text style={styles.avatarLargeText}>{getInitial(selectedEmployee.name)}</Text>
                  </View>
                  <Text style={styles.selectedUserName}>{selectedEmployee.name}</Text>
                </View>
              )}

              <Text style={styles.modeLabel}>Enter PIN</Text>
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

          <Pressable style={styles.skipBtn} onPress={handleSkip}>
            <Text style={styles.skipText}>Quick Start (Admin)</Text>
          </Pressable>
        </View>
      </LinearGradient>
    </View>
  );
}

const CARD_GAP = 12;
const GRID_PADDING = 24;
const CARD_WIDTH = (SCREEN_WIDTH - GRID_PADDING * 2 - CARD_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

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
    gap: CARD_GAP,
    justifyContent: "center",
    marginBottom: CARD_GAP,
  },
  employeeCard: {
    width: CARD_WIDTH,
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
    width: Math.min(SCREEN_WIDTH * 0.7, 280),
    justifyContent: "center",
  },
  keyBtn: {
    width: Math.min(SCREEN_WIDTH * 0.7, 280) / 3,
    height: 64,
    justifyContent: "center",
    alignItems: "center",
  },
  keyText: {
    color: Colors.white,
    fontSize: 28,
    fontWeight: "600" as const,
  },
  skipBtn: {
    marginTop: 12,
    marginBottom: 8,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  skipText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
  },
  emptyText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 16,
    marginTop: 32,
    textAlign: "center" as const,
  },
});
