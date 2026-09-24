import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Text, View, Pressable, Platform, Alert, ActivityIndicator, TextInput, Modal,
  ScrollView, Image, Animated, useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/colors";
import { themedStyles } from "@/lib/themed-styles";
import { useAuth } from "@/lib/auth-context";
import { apiRequest, getQueryFn, getApiUrl } from "@/lib/query-client";
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
  return name.trim().charAt(0).toUpperCase();
}

const COPY = {
  en: {
    who: "Who's working?",
    signOutStore: "Sign out of store",
    confirmTitle: "Sign out of this store?",
    confirmBody: "This device will be disconnected from the store. To use it again you will need the store email and license key.",
    confirm: "Sign out",
    cancel: "Cancel",
    wrongPin: "Wrong PIN, try again",
    noEmployees: "No employees yet",
    noEmployeesHint: "Add employees from Settings in the owner account.",
    roles: { owner: "Owner", admin: "Admin", manager: "Manager", cashier: "Cashier" } as Record<string, string>,
    types: { pharmacy: "Pharmacy", restaurant: "Restaurant", supermarket: "Supermarket", cafe: "Café", retail: "Store", bakery: "Bakery" } as Record<string, string>,
    store: "Store",
  },
  de: {
    who: "Wer arbeitet gerade?",
    signOutStore: "Vom Geschäft abmelden",
    confirmTitle: "Von diesem Geschäft abmelden?",
    confirmBody: "Dieses Gerät wird vom Geschäft getrennt. Zum erneuten Anmelden brauchen Sie die Geschäfts-E-Mail und den Lizenzschlüssel.",
    confirm: "Abmelden",
    cancel: "Abbrechen",
    wrongPin: "Falsche PIN, bitte erneut versuchen",
    noEmployees: "Noch keine Mitarbeiter",
    noEmployeesHint: "Mitarbeiter im Inhaberkonto unter Einstellungen hinzufügen.",
    roles: { owner: "Inhaber", admin: "Admin", manager: "Manager", cashier: "Kassierer" } as Record<string, string>,
    types: { pharmacy: "Apotheke", restaurant: "Restaurant", supermarket: "Supermarkt", cafe: "Café", retail: "Geschäft", bakery: "Bäckerei" } as Record<string, string>,
    store: "Geschäft",
  },
  ar: {
    who: "من يعمل الآن؟",
    signOutStore: "تسجيل الخروج من المتجر",
    confirmTitle: "تسجيل الخروج من هذا المتجر؟",
    confirmBody: "سيُفصل هذا الجهاز عن المتجر. للدخول مرة أخرى ستحتاج بريد المتجر ومفتاح الترخيص.",
    confirm: "تسجيل الخروج",
    cancel: "إلغاء",
    wrongPin: "رمز خاطئ، حاول مرة أخرى",
    noEmployees: "لا يوجد موظفون بعد",
    noEmployeesHint: "أضف الموظفين من الإعدادات في حساب المالك.",
    roles: { owner: "المالك", admin: "مدير النظام", manager: "مدير", cashier: "كاشير" } as Record<string, string>,
    types: { pharmacy: "صيدلية", restaurant: "مطعم", supermarket: "سوبر ماركت", cafe: "مقهى", retail: "متجر", bakery: "مخبز" } as Record<string, string>,
    store: "متجر",
  },
};

const TYPE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  pharmacy: "medkit",
  restaurant: "restaurant",
  cafe: "cafe",
  supermarket: "cart",
  bakery: "pizza",
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * Employee grid that always fits the space it is given: picks the column
 * count that gives the largest tiles without overflowing, so the screen never
 * needs to scroll. Only with a very long staff list does it fall back to
 * scrolling the grid itself.
 */
function gridLayout(count: number, w: number, h: number, gap: number) {
  let best = { cols: 1, size: 0 };
  const n = Math.max(1, count);
  for (let cols = 1; cols <= Math.min(n, 8); cols++) {
    const rows = Math.ceil(n / cols);
    const size = Math.min((w - gap * (cols - 1)) / cols, (h - gap * (rows - 1)) / rows, 168);
    if (size >= best.size) best = { cols, size }; // ties → more columns (shorter grid)
  }
  return { cols: best.cols, size: Math.floor(best.size), fits: best.size >= 92 };
}

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { login } = useAuth();
  const { t, isRTL, language } = useLanguage();
  const c = (COPY as any)[language] ?? COPY.en;
  const { logoutLicense, tenant, isValid, isValidating } = useLicense();
  const [mode, setMode] = useState<"select" | "pin">("select");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [showShiftPrompt, setShowShiftPrompt] = useState(false);
  const [showOpeningCashInput, setShowOpeningCashInput] = useState(false);
  const [openingCash, setOpeningCash] = useState("");
  const [loggedInEmployee, setLoggedInEmployee] = useState<Employee | null>(null);
  const [showTabletBanner, setShowTabletBanner] = useState(false);
  const shake = useRef(new Animated.Value(0)).current;

  // Without a store licence there is nothing to sign in to (e.g. right after
  // "sign out of store"): go back to the licence screen.
  useEffect(() => {
    if (!isValidating && isValid === false) router.replace("/license-gate" as any);
  }, [isValid, isValidating]);

  // Show tablet recommendation once for phone users
  useEffect(() => {
    if (width < 600 && Platform.OS !== "web") {
      AsyncStorage.getItem("barmagly_tablet_tip_shown").then((shown) => {
        if (!shown) setShowTabletBanner(true);
      });
    }
  }, []);

  const { data: employees, isLoading: employeesLoading } = useQuery<Employee[]>({
    queryKey: [`/api/employees?tenantId=${tenant?.id}`],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!tenant?.id,
  });
  const staff = employees || [];

  // ── Layout budget ────────────────────────────────────────────────────────
  const compact = height < 560;
  const gutter = width < 480 ? 16 : 24;
  const headerH = compact ? 56 : 72;
  // Measured space below the header (on the web an install banner can take
  // part of the window); the window size is only the first-frame estimate.
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  const bodyW = Math.min((box?.w ?? width) - gutter * 2, 980);
  const bodyH = (box?.h ?? height - insets.top - insets.bottom - headerH) - (compact ? 16 : 32);
  const titleH = compact ? 40 : 64;
  const gap = width < 480 ? 10 : 14;
  const grid = gridLayout(staff.length, bodyW, bodyH - titleH - 8, gap);

  // PIN stage: side by side when the screen is short and wide (landscape phone)
  const pinRow = width > height && height < 640;
  const infoH = pinRow ? 0 : compact ? 170 : 200;
  const keyH = clamp((bodyH - infoH - 16) / 4 - 10, 44, 76);
  const keyW = clamp(keyH * 1.35, 64, 104);

  const storeType = (tenant?.storeType || "").toLowerCase();
  const typeLabel = c.types[storeType] || c.store;
  const typeIcon = TYPE_ICONS[storeType] || "storefront";
  const logoUri = tenant?.logo
    ? /^(https?:|data:)/.test(tenant.logo)
      ? tenant.logo
      : `${getApiUrl().replace(/\/$/, "")}${tenant.logo.startsWith("/api/") ? tenant.logo : `/api${tenant.logo}`}`
    : null;

  // ── Actions ──────────────────────────────────────────────────────────────
  const tap = (style = Haptics.ImpactFeedbackStyle.Light) => {
    if (Platform.OS !== "web") Haptics.impactAsync(style);
  };

  const handleSelectEmployee = (emp: Employee) => {
    tap(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedEmployee(emp);
    setPin("");
    setPinError(false);
    setMode("pin");
  };

  const handleBack = useCallback(() => {
    tap();
    setMode("select");
    setSelectedEmployee(null);
    setPin("");
    setPinError(false);
  }, []);

  const failPin = () => {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    setPinError(true);
    setPin("");
    shake.setValue(0);
    Animated.sequence(
      [10, -10, 8, -8, 4, 0].map((v) =>
        Animated.timing(shake, { toValue: v, duration: 50, useNativeDriver: Platform.OS !== "web" }),
      ),
    ).start();
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
    } catch {
      failPin();
    } finally {
      setLoading(false);
    }
  };

  const handlePinPress = (digit: string) => {
    if (loading || pin.length >= 4) return;
    tap();
    setPinError(false);
    const newPin = pin + digit;
    setPin(newPin);
    if (newPin.length === 4) handleLogin(newPin);
  };

  const handleDelete = () => {
    tap();
    setPin((p) => p.slice(0, -1));
  };

  // Physical keyboard on web / tablets with keyboards: digits, Backspace, Esc.
  useEffect(() => {
    if (Platform.OS !== "web" || mode !== "pin" || typeof window === "undefined") return;
    const onKey = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) handlePinPress(e.key);
      else if (e.key === "Backspace") handleDelete();
      else if (e.key === "Escape") handleBack();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const handleSignOutStore = async () => {
    setConfirmSignOut(false);
    try { await AsyncStorage.removeItem("barmagly_employee"); } catch { }
    await logoutLicense();
    router.replace("/license-gate" as any);
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
    // Shift is mandatory for admin and cashier — warn them
    if (loggedInEmployee && (loggedInEmployee.role === "admin" || loggedInEmployee.role === "cashier" || loggedInEmployee.role === "owner")) {
      Alert.alert(
        t("shiftRequiredTitle" as any) || "Shift Required",
        t("cannotSkipShift" as any) || "Starting a shift is mandatory before accessing the POS",
        [{ text: t("startShift"), onPress: () => setShowOpeningCashInput(true) }]
      );
      return;
    }
    // Managers can skip
    setShowShiftPrompt(false);
    setShowOpeningCashInput(false);
    setOpeningCash("");
    router.replace("/(tabs)");
  };

  // "row" already follows the layout direction (document dir on the web,
  // I18nManager on native), so Arabic runs right-to-left without reversing.
  const row = "row" as const;
  const roleLabel = (role: string) => c.roles[role.toLowerCase()] || role;

  // ── Pieces ───────────────────────────────────────────────────────────────
  const header = (
    <View style={[styles.header, { height: headerH, flexDirection: row, paddingHorizontal: gutter }]}>
      <View style={[styles.brand, { flexDirection: row }]}>
        <View style={[styles.brandLogo, compact && { width: 40, height: 40, borderRadius: 12 }]}>
          {logoUri ? (
            <Image source={{ uri: logoUri }} style={styles.brandLogoImg} resizeMode="cover" />
          ) : (
            <Ionicons name={typeIcon} size={compact ? 20 : 24} color={Colors.white} />
          )}
        </View>
        <View style={{ flexShrink: 1, alignItems: "flex-start" }}>
          <Text style={[styles.storeName, compact && { fontSize: 16 }]} numberOfLines={1}>
            {tenant?.name || " "}
          </Text>
          <Text style={styles.storeType} numberOfLines={1}>{typeLabel}</Text>
        </View>
      </View>
      <Pressable
        onPress={() => setConfirmSignOut(true)}
        style={({ pressed, hovered }: any) => [
          styles.signOutBtn,
          { flexDirection: row },
          (pressed || hovered) && styles.signOutBtnActive,
        ]}
        accessibilityRole="button"
        accessibilityLabel={c.signOutStore}
      >
        <Ionicons name="log-out-outline" size={18} color={Colors.white} />
        {width >= 420 && <Text style={styles.signOutText}>{c.signOutStore}</Text>}
      </Pressable>
    </View>
  );

  const employeeTile = (item: Employee, size: number) => {
    const badgeColor = getRoleBadgeColor(item.role);
    const avatar = clamp(size * 0.4, 36, 64);
    return (
      <Pressable
        key={item.id}
        onPress={() => handleSelectEmployee(item)}
        style={({ pressed, hovered }: any) => [
          styles.tile,
          { width: size, height: size },
          hovered && styles.tileHover,
          pressed && styles.tilePressed,
        ]}
      >
        <View style={[styles.avatar, { width: avatar, height: avatar, borderRadius: avatar / 2, borderColor: badgeColor }]}>
          <Text style={[styles.avatarText, { fontSize: avatar * 0.42 }]}>{getInitial(item.name)}</Text>
        </View>
        <Text style={[styles.tileName, { fontSize: clamp(size * 0.095, 12, 16) }]} numberOfLines={1}>
          {item.name}
        </Text>
        <View style={[styles.roleBadge, { backgroundColor: badgeColor + "33", borderColor: badgeColor }]}>
          <Text style={[styles.roleBadgeText, { fontSize: clamp(size * 0.07, 10, 12) }]}>{roleLabel(item.role)}</Text>
        </View>
      </Pressable>
    );
  };

  const selectView = (
    <View style={{ width: bodyW, height: bodyH, alignItems: "center" }}>
      <View style={{ height: titleH, justifyContent: "center", alignItems: "center" }}>
        <Text style={[styles.title, compact && { fontSize: 20 }]}>{c.who}</Text>
        {!compact && <Text style={styles.subtitle}>{t("selectEmployee")}</Text>}
      </View>
      {employeesLoading || isValidating || !tenant ? (
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.white} /></View>
      ) : staff.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="people-outline" size={44} color="rgba(255,255,255,0.55)" />
          <Text style={styles.emptyTitle}>{c.noEmployees}</Text>
          <Text style={styles.emptyHint}>{c.noEmployeesHint}</Text>
        </View>
      ) : grid.fits ? (
        <View style={[styles.center, { width: bodyW }]}>
          <View style={[styles.grid, { gap, width: grid.cols * grid.size + gap * (grid.cols - 1), flexDirection: row }]}>
            {staff.map((e) => employeeTile(e, grid.size))}
          </View>
        </View>
      ) : (
        <ScrollView style={{ width: bodyW }} contentContainerStyle={[styles.grid, { gap, flexDirection: row, paddingBottom: 12 }]}>
          {staff.map((e) => employeeTile(e, 104))}
        </ScrollView>
      )}
      {__DEV__ && (
        <Pressable
          onPress={async () => {
            await AsyncStorage.removeItem("hasSeenIntro");
            await logoutLicense();
            router.replace("/");
          }}
          style={{ position: "absolute", bottom: 0 }}
        >
          <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, textDecorationLine: "underline" }}>Reset App Flow (Dev Only)</Text>
        </Pressable>
      )}
    </View>
  );

  const pinInfo = selectedEmployee && (
    <View style={{ alignItems: "center" }}>
      <View style={[styles.avatarLarge, compact && { width: 56, height: 56, borderRadius: 28 }, { borderColor: getRoleBadgeColor(selectedEmployee.role) }]}>
        <Text style={[styles.avatarLargeText, compact && { fontSize: 24 }]}>{getInitial(selectedEmployee.name)}</Text>
      </View>
      <Text style={[styles.selectedName, compact && { fontSize: 17 }]} numberOfLines={1}>{selectedEmployee.name}</Text>
      <Text style={[styles.subtitle, { marginTop: 2 }]}>{pinError ? " " : t("enterPin")}</Text>
      <Animated.View style={[styles.pinDots, { transform: [{ translateX: shake }] }]}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={[styles.dot, i < pin.length && styles.dotFilled, pinError && styles.dotError]} />
        ))}
      </Animated.View>
      <Text style={styles.pinError}>{pinError ? c.wrongPin : " "}</Text>
    </View>
  );

  const keypad = (
    <View style={{ width: keyW * 3 + 24, flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8, opacity: loading ? 0.5 : 1, direction: "ltr" }}>
      {["1", "2", "3", "4", "5", "6", "7", "8", "9", "back", "0", "del"].map((key) => {
        const icon = key === "del" ? "backspace-outline" : key === "back" ? "people-outline" : null;
        return (
          <Pressable
            key={key}
            disabled={loading}
            onPress={() => (key === "del" ? handleDelete() : key === "back" ? handleBack() : handlePinPress(key))}
            style={({ pressed, hovered }: any) => [
              styles.key,
              { width: keyW, height: keyH, borderRadius: keyH / 2.4 },
              icon && styles.keyGhost,
              hovered && styles.keyHover,
              pressed && styles.keyPressed,
            ]}
            accessibilityLabel={key === "del" ? "Delete" : key === "back" ? "Back" : key}
          >
            {icon ? (
              <Ionicons name={icon as any} size={clamp(keyH * 0.38, 20, 28)} color={Colors.white} />
            ) : (
              <Text style={[styles.keyText, { fontSize: clamp(keyH * 0.42, 20, 30) }]}>{key}</Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );

  const pinView = (
    <View style={[styles.center, { width: bodyW, height: bodyH, flexDirection: pinRow ? row : "column", gap: pinRow ? 40 : 12 }]}>
      {pinInfo}
      {loading && !pinRow ? (
        <View style={{ height: keyH * 4 + 24, justifyContent: "center" }}><ActivityIndicator size="large" color={Colors.white} /></View>
      ) : keypad}
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]}
        style={[styles.gradient, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {header}
        <View
          style={styles.body}
          onLayout={(e) => {
            const { width: w, height: h } = e.nativeEvent.layout;
            if (!box || Math.abs(box.w - w) > 1 || Math.abs(box.h - h) > 1) setBox({ w, h });
          }}
        >
          {mode === "select" ? selectView : pinView}
        </View>

        {showTabletBanner && (
          <Pressable
            onPress={() => {
              AsyncStorage.setItem("barmagly_tablet_tip_shown", "true");
              setShowTabletBanner(false);
            }}
            style={[styles.tabletTip, { bottom: insets.bottom + 12, flexDirection: row }]}
          >
            <Ionicons name="tablet-landscape-outline" size={22} color={Colors.white} />
            <Text style={styles.tabletTipText}>Best on a tablet or iPad — the POS is optimized for larger screens.</Text>
            <Ionicons name="close" size={16} color="rgba(255,255,255,0.7)" />
          </Pressable>
        )}
      </LinearGradient>

      {/* Sign out of the store (licence) */}
      <Modal visible={confirmSignOut} animationType="fade" transparent onRequestClose={() => setConfirmSignOut(false)}>
        <View style={styles.backdrop}>
          <View style={styles.dialog}>
            <View style={styles.dialogIcon}>
              <Ionicons name="log-out-outline" size={28} color={Colors.danger} />
            </View>
            <Text style={styles.dialogTitle}>{c.confirmTitle}</Text>
            {!!tenant?.name && <Text style={styles.dialogStore}>{tenant.name}</Text>}
            <Text style={styles.dialogBody}>{c.confirmBody}</Text>
            <View style={[styles.dialogActions, { flexDirection: row }]}>
              <Pressable onPress={() => setConfirmSignOut(false)} style={[styles.dialogBtn, styles.dialogBtnGhost]}>
                <Text style={styles.dialogBtnGhostText}>{c.cancel}</Text>
              </Pressable>
              <Pressable onPress={handleSignOutStore} style={[styles.dialogBtn, { backgroundColor: Colors.danger }]}>
                <Text style={styles.dialogBtnText}>{c.confirm}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showShiftPrompt} animationType="fade" transparent>
        <View style={styles.backdrop}>
          <View style={styles.dialog}>
            {!showOpeningCashInput ? (
              <>
                <View style={{ alignItems: "center", marginBottom: 20 }}>
                  <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.accent + "20", justifyContent: "center", alignItems: "center", marginBottom: 12 }}>
                    <Ionicons name="time-outline" size={30} color={Colors.accent} />
                  </View>
                  <Text style={{ color: Colors.text, fontSize: 20, fontWeight: "700", marginBottom: 8 }}>{t("shiftPromptTitle")}</Text>
                  <Text style={{ color: Colors.textSecondary, fontSize: 14, textAlign: "center" }}>{t("shiftPromptMessage")}</Text>
                </View>
                <Pressable onPress={() => setShowOpeningCashInput(true)} style={{ backgroundColor: Colors.accent, borderRadius: 12, paddingVertical: 14, alignItems: "center", marginBottom: 10, alignSelf: "stretch" }}>
                  <Text style={{ color: Colors.textDark, fontSize: 16, fontWeight: "700" }}>{t("startShiftNow")}</Text>
                </Pressable>
                {/* Only allow skip for non-admin/cashier roles (e.g. manager access without shift) */}
                {loggedInEmployee && loggedInEmployee.role === "manager" && (
                  <Pressable onPress={handleSkipShift} style={{ borderRadius: 12, paddingVertical: 14, alignItems: "center", borderWidth: 1, borderColor: Colors.cardBorder, alignSelf: "stretch" }}>
                    <Text style={{ color: Colors.textSecondary, fontSize: 16, fontWeight: "500" }}>{t("skipForNow")}</Text>
                  </Pressable>
                )}
                {loggedInEmployee && (loggedInEmployee.role === "admin" || loggedInEmployee.role === "cashier" || loggedInEmployee.role === "owner") && (
                  <View style={{ borderRadius: 12, paddingVertical: 10, alignItems: "center" }}>
                    <Text style={{ color: Colors.warning, fontSize: 12, textAlign: "center", paddingHorizontal: 20 }}>
                      {t("cannotSkipShift" as any)}
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <>
                <Text style={{ color: Colors.text, fontSize: 18, fontWeight: "700", marginBottom: 16, textAlign: "center" }}>{t("enterOpeningCash")}</Text>
                <TextInput
                  style={{ alignSelf: "stretch", backgroundColor: Colors.surfaceLight, borderRadius: 12, padding: 14, fontSize: 18, color: Colors.text, textAlign: "center", borderWidth: 1, borderColor: Colors.cardBorder, marginBottom: 16 }}
                  value={openingCash}
                  onChangeText={setOpeningCash}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={Colors.textMuted}
                  autoFocus
                />
                <Pressable onPress={handleStartShift} style={{ alignSelf: "stretch", backgroundColor: Colors.accent, borderRadius: 12, paddingVertical: 14, alignItems: "center", marginBottom: 10 }}>
                  <Text style={{ color: Colors.textDark, fontSize: 16, fontWeight: "700" }}>{t("startShift")}</Text>
                </Pressable>
                <Pressable onPress={() => setShowOpeningCashInput(false)} style={{ alignSelf: "stretch", borderRadius: 12, paddingVertical: 14, alignItems: "center" }}>
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

const styles = themedStyles((Colors) => ({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  gradient: {
    flex: 1,
    overflow: "hidden" as const,
  },
  header: {
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.12)",
    gap: 12,
  },
  brand: {
    alignItems: "center",
    gap: 12,
    flexShrink: 1,
  },
  brandLogo: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden" as const,
  },
  brandLogoImg: { width: "100%", height: "100%" },
  storeName: {
    color: Colors.white,
    fontSize: 19,
    fontWeight: "800" as const,
  },
  storeType: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    fontWeight: "600" as const,
    marginTop: 1,
  },
  signOutBtn: {
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
  },
  signOutBtnActive: {
    backgroundColor: "rgba(220,38,38,0.85)",
    borderColor: "rgba(220,38,38,1)",
  },
  signOutText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: "700" as const,
  },
  body: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: Colors.white,
    fontSize: 26,
    fontWeight: "800" as const,
    textAlign: "center" as const,
  },
  subtitle: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 14,
    fontWeight: "500" as const,
    marginTop: 4,
    textAlign: "center" as const,
  },
  grid: {
    flexWrap: "wrap" as const,
    justifyContent: "center",
    alignSelf: "center",
  },
  tile: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
  },
  tileHover: {
    backgroundColor: "rgba(255,255,255,0.17)",
    borderColor: "rgba(255,255,255,0.4)",
  },
  tilePressed: {
    backgroundColor: "rgba(255,255,255,0.24)",
    transform: [{ scale: 0.96 }],
  },
  avatar: {
    backgroundColor: "rgba(0,0,0,0.25)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    borderWidth: 2,
  },
  avatarText: {
    color: Colors.white,
    fontWeight: "800" as const,
  },
  tileName: {
    color: Colors.white,
    fontWeight: "700" as const,
    marginBottom: 6,
    textAlign: "center" as const,
    maxWidth: "100%",
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
  },
  roleBadgeText: {
    color: Colors.white,
    fontWeight: "700" as const,
  },
  emptyTitle: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: "700" as const,
    marginTop: 10,
  },
  emptyHint: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 13,
    marginTop: 4,
    textAlign: "center" as const,
  },
  avatarLarge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(0,0,0,0.25)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    borderWidth: 3,
  },
  avatarLargeText: {
    color: Colors.white,
    fontSize: 30,
    fontWeight: "800" as const,
  },
  selectedName: {
    color: Colors.white,
    fontSize: 20,
    fontWeight: "800" as const,
  },
  pinDots: {
    flexDirection: "row" as const,
    gap: 18,
    marginTop: 14,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.55)",
    backgroundColor: "transparent",
  },
  dotFilled: {
    backgroundColor: Colors.white,
    borderColor: Colors.white,
  },
  dotError: {
    borderColor: "#FCA5A5",
  },
  pinError: {
    color: "#FECACA",
    fontSize: 13,
    fontWeight: "700" as const,
    marginTop: 8,
    minHeight: 18,
  },
  key: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
  },
  keyGhost: {
    backgroundColor: "transparent",
    borderColor: "transparent",
  },
  keyHover: {
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  keyPressed: {
    backgroundColor: "rgba(255,255,255,0.3)",
    transform: [{ scale: 0.95 }],
  },
  keyText: {
    color: Colors.white,
    fontWeight: "600" as const,
  },
  tabletTip: {
    position: "absolute" as const,
    left: 16,
    right: 16,
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  tabletTipText: {
    flex: 1,
    color: Colors.white,
    fontSize: 12,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  dialog: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    alignItems: "center",
  },
  dialogIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.danger + "1F",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  dialogTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: "800" as const,
    textAlign: "center" as const,
  },
  dialogStore: {
    color: Colors.accent,
    fontSize: 14,
    fontWeight: "700" as const,
    marginTop: 4,
  },
  dialogBody: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center" as const,
    marginTop: 10,
  },
  dialogActions: {
    gap: 10,
    marginTop: 20,
    alignSelf: "stretch",
  },
  dialogBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  dialogBtnGhost: {
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  dialogBtnGhostText: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: "600" as const,
  },
  dialogBtnText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: "700" as const,
  },
}));
