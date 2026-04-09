import React, { useEffect, useState } from "react";
import {
  Modal, View, Text, TouchableOpacity, FlatList, ActivityIndicator, StyleSheet,
} from "react-native";
import { Colors } from "@/constants/colors";

interface Driver {
  id: number;
  driverName: string;
  driverPhone: string;
  driverStatus: string;
  driverRating: string | number;
  vehicleType: string;
  plateNumber: string;
}

interface Props {
  visible: boolean;
  orderId: number;
  tenantId: number;
  licenseKey: string;
  apiBase: string;
  onAssigned: (driverId: number) => void;
  onClose: () => void;
}

export default function DriverAssignModal({
  visible, orderId, tenantId, licenseKey, apiBase, onAssigned, onClose,
}: Props) {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState<number | null>(null);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    fetch(`${apiBase}/api/delivery/manage/drivers?tenantId=${tenantId}`, {
      headers: { "x-license-key": licenseKey },
    })
      .then(r => r.json())
      .then(data => setDrivers(data?.filter((d: Driver) => d.driverStatus === "available") || []))
      .catch(() => setDrivers([]))
      .finally(() => setLoading(false));
  }, [visible]);

  const assignDriver = async (driverId: number) => {
    setAssigning(driverId);
    try {
      const resp = await fetch(`${apiBase}/api/delivery/manage/orders/${orderId}/assign`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-license-key": licenseKey,
        },
        body: JSON.stringify({ vehicleId: driverId, tenantId }),
      });
      if (!resp.ok) throw new Error("Failed to assign");
      onAssigned(driverId);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setAssigning(null);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>Assign Driver</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color={Colors.deliveryPrimary} style={{ margin: 24 }} />
          ) : drivers.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🚗</Text>
              <Text style={styles.emptyText}>No available drivers</Text>
            </View>
          ) : (
            <FlatList
              data={drivers}
              keyExtractor={d => String(d.id)}
              contentContainerStyle={{ paddingBottom: 16 }}
              renderItem={({ item: driver }) => (
                <TouchableOpacity
                  style={styles.driverCard}
                  onPress={() => assignDriver(driver.id)}
                  disabled={assigning === driver.id}
                >
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>🚗</Text>
                  </View>
                  <View style={styles.driverInfo}>
                    <Text style={styles.driverName}>{driver.driverName || "Driver"}</Text>
                    <Text style={styles.driverMeta}>
                      {driver.vehicleType} · {driver.plateNumber} · ⭐ {parseFloat(String(driver.driverRating || 5)).toFixed(1)}
                    </Text>
                    {driver.driverPhone && (
                      <Text style={styles.driverPhone}>{driver.driverPhone}</Text>
                    )}
                  </View>
                  {assigning === driver.id ? (
                    <ActivityIndicator size="small" color={Colors.deliveryPrimary} />
                  ) : (
                    <View style={styles.assignBtn}>
                      <Text style={styles.assignBtnText}>Assign</Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#1A1A2E",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "75%",
    paddingBottom: 24,
  },
  handle: {
    width: 40, height: 4,
    backgroundColor: "rgba(255,255,255,0.2)",
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
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  title: { fontSize: 17, fontWeight: "700", color: "#fff" },
  closeBtn: { padding: 4 },
  closeText: { color: "rgba(255,255,255,0.5)", fontSize: 16 },
  emptyState: { alignItems: "center", padding: 32, gap: 8 },
  emptyIcon: { fontSize: 32 },
  emptyText: { color: "rgba(255,255,255,0.5)", fontSize: 14 },
  driverCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    marginHorizontal: 12,
    marginTop: 8,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
  },
  avatar: {
    width: 44, height: 44,
    borderRadius: 22,
    backgroundColor: Colors.deliveryPrimaryLight,
    alignItems: "center", justifyContent: "center",
  },
  avatarText: { fontSize: 20 },
  driverInfo: { flex: 1 },
  driverName: { color: "#fff", fontWeight: "600", fontSize: 14 },
  driverMeta: { color: "rgba(255,255,255,0.45)", fontSize: 12, marginTop: 1 },
  driverPhone: { color: "rgba(255,255,255,0.35)", fontSize: 11, marginTop: 1 },
  assignBtn: {
    backgroundColor: Colors.deliveryPrimary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  assignBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
});
