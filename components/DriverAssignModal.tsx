import React, { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  Modal, View, Text, TouchableOpacity, FlatList, ActivityIndicator, Platform,
} from "react-native";
import { Colors } from "@/constants/colors";
import { themedStyles } from "@/lib/themed-styles";
import { apiRequest, apiErrorMessage } from "@/lib/query-client";
import { useLanguage } from "@/lib/language-context";

/** A row of GET /api/delivery/manage/drivers — a `vehicles` row with a driver. */
interface Driver {
  id: number;
  driverName: string;
  driverPhone?: string | null;
  driverStatus?: string | null;
  driverRating?: string | number | null;
  licensePlate?: string | null;
  make?: string | null;
  model?: string | null;
  activeOrderId?: number | null;
}

interface Props {
  visible: boolean;
  orderId: number;
  tenantId: number;
  licenseKey: string;
  apiBase: string;
  onAssigned: (driverId: number) => void;
  onClose: () => void;
  /** Driver currently on the order (online_orders.driverId), if any. */
  currentDriverId?: number | null;
}

export default function DriverAssignModal({
  visible, orderId, tenantId, onAssigned, onClose, currentDriverId,
}: Props) {
  const { language } = useLanguage();
  const tr = (en: string, de: string, ar: string) => (language === "ar" ? ar : language === "de" ? de : en);
  const isRTL = language === "ar";
  // document dir=rtl already mirrors "row" on web; only native needs the flip.
  const flipRow = isRTL && Platform.OS !== "web";

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [assigning, setAssigning] = useState<number | null>(null);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    setAssignError(null);
    // apiRequest attaches the x-license-key header itself (TenantInfo doesn't
    // carry the key, so the licenseKey prop is often empty).
    apiRequest("GET", `/api/delivery/manage/drivers?tenantId=${tenantId}`)
      .then(r => r.json())
      .then((data: Driver[]) => {
        if (cancelled) return;
        const list = Array.isArray(data) ? [...data] : [];
        const rank: Record<string, number> = { available: 0, on_delivery: 1, offline: 2 };
        list.sort((a, b) => (rank[a.driverStatus || "offline"] ?? 9) - (rank[b.driverStatus || "offline"] ?? 9));
        setDrivers(list);
      })
      .catch((e) => {
        if (cancelled) return;
        setDrivers([]);
        setLoadError(apiErrorMessage(e, tr("Could not load drivers", "Fahrer konnten nicht geladen werden", "تعذّر تحميل السائقين")));
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, tenantId, reloadKey]);

  const assignDriver = async (driverId: number) => {
    if (assigning !== null) return;
    if (driverId === currentDriverId) { onClose(); return; }
    setAssigning(driverId);
    setAssignError(null);
    try {
      await apiRequest("PUT", `/api/delivery/manage/orders/${orderId}/assign`, {
        vehicleId: driverId, tenantId,
      });
      onAssigned(driverId);
      onClose();
    } catch (err) {
      setAssignError(apiErrorMessage(err, tr("Could not assign the driver", "Fahrer konnte nicht zugewiesen werden", "تعذّر تعيين السائق")));
    } finally {
      setAssigning(null);
    }
  };

  // Take the driver off the order (e.g. wrong driver, driver unavailable).
  const unassignDriver = async () => {
    if (assigning !== null || !currentDriverId) return;
    setAssigning(-1);
    setAssignError(null);
    try {
      await apiRequest("PUT", `/api/delivery/manage/orders/${orderId}/unassign`, { tenantId });
      onAssigned(0);
      onClose();
    } catch (err) {
      setAssignError(apiErrorMessage(err, tr("Could not remove the driver", "Fahrer konnte nicht entfernt werden", "تعذّر إلغاء تعيين السائق")));
    } finally {
      setAssigning(null);
    }
  };

  const statusInfo = (s?: string | null) =>
    s === "available"
      ? { color: Colors.driverOnline, label: tr("Available", "Verfügbar", "متاح") }
      : s === "on_delivery"
        ? { color: Colors.driverBusy, label: tr("On delivery", "Unterwegs", "في مهمة") }
        : { color: Colors.driverOffline, label: tr("Offline", "Offline", "غير متصل") };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={[styles.header, flipRow && { flexDirection: "row-reverse" }]}>
            <Text style={styles.title}>{tr("Assign driver", "Fahrer zuweisen", "تعيين سائق")}</Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel={tr("Close", "Schließen", "إغلاق")}
            >
              <Ionicons name="close" size={20} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          {currentDriverId ? (
            <TouchableOpacity
              onPress={unassignDriver}
              disabled={assigning !== null}
              style={[styles.unassignBtn, flipRow && { flexDirection: "row-reverse" }, assigning !== null && { opacity: 0.5 }]}
              accessibilityRole="button"
            >
              {assigning === -1
                ? <ActivityIndicator size="small" color={Colors.danger} />
                : <Ionicons name="person-remove-outline" size={16} color={Colors.danger} />}
              <Text style={styles.unassignText}>{tr("Remove assigned driver", "Zugewiesenen Fahrer entfernen", "إلغاء تعيين السائق الحالي")}</Text>
            </TouchableOpacity>
          ) : null}

          {assignError ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={16} color={Colors.danger} />
              <Text style={styles.errorText}>{assignError}</Text>
            </View>
          ) : null}

          {loading ? (
            <ActivityIndicator color={Colors.deliveryPrimary} style={{ margin: 24 }} />
          ) : loadError ? (
            <View style={styles.emptyState}>
              <Ionicons name="cloud-offline-outline" size={40} color={Colors.textMuted} />
              <Text style={styles.emptyText}>{loadError}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={() => setReloadKey(k => k + 1)}>
                <Text style={styles.retryText}>{tr("Try again", "Erneut versuchen", "إعادة المحاولة")}</Text>
              </TouchableOpacity>
            </View>
          ) : drivers.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="car-outline" size={40} color={Colors.textMuted} />
              <Text style={styles.emptyText}>{tr("No drivers yet", "Noch keine Fahrer", "لا يوجد سائقون بعد")}</Text>
              <Text style={styles.emptySub}>
                {tr(
                  "Add a vehicle with a driver name in Settings → Vehicles.",
                  "Fügen Sie unter Einstellungen → Fahrzeuge ein Fahrzeug mit Fahrername hinzu.",
                  "أضف مركبة مع اسم السائق من الإعدادات ← المركبات.",
                )}
              </Text>
            </View>
          ) : (
            <FlatList
              data={drivers}
              keyExtractor={d => String(d.id)}
              contentContainerStyle={{ paddingBottom: 16 }}
              renderItem={({ item: driver }) => {
                const st = statusInfo(driver.driverStatus);
                const isCurrent = currentDriverId != null && driver.id === currentDriverId;
                const vehicle = [
                  [driver.make, driver.model].filter(Boolean).join(" "),
                  driver.licensePlate,
                ].filter(Boolean).join(" · ");
                const rating = Number(driver.driverRating);
                return (
                  <TouchableOpacity
                    style={[styles.driverCard, flipRow && { flexDirection: "row-reverse" }, isCurrent && styles.driverCardCurrent]}
                    onPress={() => assignDriver(driver.id)}
                    disabled={assigning !== null}
                    accessibilityRole="button"
                  >
                    <View style={[styles.avatar, { backgroundColor: st.color + "22" }]}>
                      <Ionicons name="car-sport-outline" size={20} color={st.color} />
                    </View>
                    <View style={styles.driverInfo}>
                      <View style={[styles.nameRow, flipRow && { flexDirection: "row-reverse" }]}>
                        <Text style={styles.driverName} numberOfLines={1}>{driver.driverName || tr("Driver", "Fahrer", "سائق")}</Text>
                        <View style={[styles.statusPill, { backgroundColor: st.color + "22" }]}>
                          <Text style={[styles.statusPillText, { color: st.color }]}>{st.label}</Text>
                        </View>
                      </View>
                      <Text style={[styles.driverMeta, isRTL && { textAlign: "right" }]} numberOfLines={1}>
                        {[vehicle, Number.isFinite(rating) && rating > 0 ? `${rating.toFixed(1)}★` : ""].filter(Boolean).join(" · ") || "—"}
                      </Text>
                      {driver.driverPhone ? (
                        <Text style={[styles.driverPhone, isRTL && { textAlign: "right" }]} numberOfLines={1}>{driver.driverPhone}</Text>
                      ) : null}
                    </View>
                    {assigning === driver.id ? (
                      <ActivityIndicator size="small" color={Colors.deliveryPrimary} />
                    ) : isCurrent ? (
                      <View style={[styles.assignBtn, styles.assignedBtn]}>
                        <Ionicons name="checkmark" size={14} color={Colors.success} />
                        <Text style={[styles.assignBtnText, { color: Colors.success }]}>{tr("Assigned", "Zugewiesen", "مُعيَّن")}</Text>
                      </View>
                    ) : (
                      <View style={[styles.assignBtn, assigning !== null && { opacity: 0.5 }]}>
                        <Text style={styles.assignBtnText}>
                          {currentDriverId ? tr("Reassign", "Neu zuweisen", "إعادة تعيين") : tr("Assign", "Zuweisen", "تعيين")}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = themedStyles((Colors) => ({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "80%",
    paddingBottom: 24,
    width: "100%",
    maxWidth: 640,
    alignSelf: "center",
  },
  handle: {
    width: 40, height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    margin: 10,
    alignSelf: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: { fontSize: 17, fontWeight: "700", color: Colors.text },
  closeBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  errorBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginHorizontal: 12, marginTop: 10, padding: 10, borderRadius: 10,
    backgroundColor: Colors.danger + "15", borderWidth: 1, borderColor: Colors.danger + "40",
  },
  unassignBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    minHeight: 44, marginHorizontal: 16, marginBottom: 8, borderRadius: 10,
    borderWidth: 1, borderColor: Colors.danger,
  },
  unassignText: { color: Colors.danger, fontSize: 14, fontWeight: "600" },
  errorText: { color: Colors.danger, fontSize: 13, flex: 1 },
  emptyState: { alignItems: "center", padding: 32, gap: 8 },
  emptyText: { color: Colors.textSecondary, fontSize: 14, fontWeight: "600", textAlign: "center" },
  emptySub: { color: Colors.textMuted, fontSize: 12, textAlign: "center", maxWidth: 320 },
  retryBtn: { marginTop: 6, paddingHorizontal: 16, minHeight: 44, justifyContent: "center", borderRadius: 10, backgroundColor: Colors.deliveryPrimary },
  retryText: { color: Colors.white, fontWeight: "700" },
  driverCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    marginHorizontal: 12,
    marginTop: 8,
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    minHeight: 64,
  },
  driverCardCurrent: { borderColor: Colors.success },
  avatar: {
    width: 44, height: 44,
    borderRadius: 22,
    alignItems: "center", justifyContent: "center",
  },
  driverInfo: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2, flexWrap: "wrap" },
  driverName: { color: Colors.text, fontWeight: "700", fontSize: 14, flexShrink: 1 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99 },
  statusPillText: { fontSize: 11, fontWeight: "700" },
  driverMeta: { color: Colors.textMuted, fontSize: 12, marginTop: 1 },
  driverPhone: { color: Colors.textMuted, fontSize: 11, marginTop: 1 },
  assignBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.deliveryPrimary,
    borderRadius: 8,
    paddingHorizontal: 12,
    minHeight: 36,
    justifyContent: "center",
  },
  assignedBtn: { backgroundColor: Colors.success + "18" },
  assignBtnText: { color: Colors.white, fontWeight: "700", fontSize: 13 },
}));
