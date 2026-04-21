/**
 * Global broadcast-order notification banner.
 *
 * Mounted once at the app root so incoming marketplace broadcasts pop up
 * on every POS screen (dashboard, products, customers, reports, settings …),
 * not just the online-orders tab. Tap the banner to jump straight to the
 * broadcast panel in Online Orders.
 */
import React, { useEffect, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View, Animated } from "react-native";
import { useRouter } from "expo-router";
import { useLicense } from "@/lib/license-context";
import { getApiUrl } from "@/lib/query-client";

type Broadcast = {
  id: number;
  token: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  estimatedTotal?: string | number;
  items?: any;
  expiresAt: string;
};

export default function BroadcastToaster() {
  const router = useRouter();
  const { tenant } = useLicense();
  const tenantId = tenant?.id;
  const [current, setCurrent] = useState<Broadcast | null>(null);
  const [tick, setTick] = useState(0);
  const slide = useRef(new Animated.Value(-160)).current;
  const audioCtxRef = useRef<any>(null);

  const show = (bc: Broadcast) => {
    setCurrent(bc);
    Animated.spring(slide, { toValue: 0, useNativeDriver: true, friction: 8 }).start();
    beep();
  };
  const hide = () => {
    Animated.timing(slide, { toValue: -160, duration: 200, useNativeDriver: true }).start(() => setCurrent(null));
  };

  const beep = () => {
    if (Platform.OS !== "web") return;
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new (window as any).AudioContext();
      const ctx = audioCtxRef.current;
      [0, 0.15, 0.3].forEach((t, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = i === 0 ? 880 : i === 1 ? 1100 : 1320;
        gain.gain.setValueAtTime(0.25, ctx.currentTime + t);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.3);
        osc.start(ctx.currentTime + t);
        osc.stop(ctx.currentTime + t + 0.3);
      });
    } catch {}
  };

  // WebSocket listener — lives for the full app session
  useEffect(() => {
    if (Platform.OS !== "web") return;
    if (!tenantId) return;
    let ws: WebSocket | null = null;
    let retryTimer: any = null;
    let mounted = true;

    const connect = () => {
      try {
        const base = getApiUrl().replace(/^http/, "ws");
        ws = new WebSocket(`${base}/api/ws/caller-id`);
        ws.onopen = () => {
          try { ws?.send(JSON.stringify({ type: "register", tenantId })); } catch {}
        };
        ws.onmessage = (ev) => {
          try {
            const msg = JSON.parse(ev.data);
            if (msg.type === "broadcast_new") {
              show(msg as Broadcast);
            } else if (msg.type === "broadcast_claimed" || msg.type === "broadcast_cancelled") {
              setCurrent((c) => (c && c.id === msg.id ? (hide(), null) : c));
            }
          } catch {}
        };
        ws.onclose = () => {
          if (!mounted) return;
          retryTimer = setTimeout(connect, 4000);
        };
        ws.onerror = () => { try { ws?.close(); } catch {} };
      } catch {
        retryTimer = setTimeout(connect, 4000);
      }
    };
    connect();
    return () => {
      mounted = false;
      if (retryTimer) clearTimeout(retryTimer);
      try { ws?.close(); } catch {}
    };
  }, [tenantId]);

  // Re-render every second so the countdown ticks
  useEffect(() => {
    if (!current) return;
    const iv = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(iv);
  }, [current]);

  // Auto-dismiss when expired
  useEffect(() => {
    if (!current) return;
    const expires = new Date(current.expiresAt).getTime();
    if (Date.now() >= expires) hide();
  }, [current, tick]);

  if (!current) return null;

  const secsLeft = Math.max(0, Math.floor((new Date(current.expiresAt).getTime() - Date.now()) / 1000));
  const items = Array.isArray(current.items) ? current.items : (typeof current.items === "string" ? (() => { try { return JSON.parse(current.items as any); } catch { return []; } })() : []);
  const itemLine = items.slice(0, 2).map((it: any) => `${it.quantity}× ${it.name}`).join(" • ") + (items.length > 2 ? ` • +${items.length - 2}` : "");

  return (
    <Animated.View style={[styles.wrap, { transform: [{ translateY: slide }] }]} pointerEvents="box-none">
      <Pressable style={styles.card} onPress={() => { router.push("/(tabs)/online-orders" as any); hide(); }}>
        <View style={styles.row}>
          <View style={styles.icon}><Text style={styles.iconText}>📣</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>New Broadcast Order — {current.customerName}</Text>
            <Text style={styles.line} numberOfLines={1}>{itemLine || "tap to view"}</Text>
            <Text style={styles.sub}>
              ⏱ {Math.floor(secsLeft / 60)}:{String(secsLeft % 60).padStart(2, "0")}
              {current.estimatedTotal ? `  ·  CHF ${Number(current.estimatedTotal).toFixed(2)}` : ""}
            </Text>
          </View>
          <Pressable onPress={hide} style={styles.close} hitSlop={8}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
        </View>
        <Text style={styles.cta}>Tap to open & accept →</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute" as const, top: 0, left: 0, right: 0, zIndex: 9999, alignItems: "center", paddingHorizontal: 12, paddingTop: 12 },
  card: { width: "100%" as const, maxWidth: 640, backgroundColor: "rgba(255,87,34,0.95)", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.15)", shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
  row: { flexDirection: "row" as const, alignItems: "flex-start" as const, gap: 12 },
  icon: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center" as const, justifyContent: "center" as const },
  iconText: { fontSize: 22 },
  title: { color: "#fff", fontWeight: "800" as const, fontSize: 14, marginBottom: 2 },
  line: { color: "rgba(255,255,255,0.9)", fontSize: 12 },
  sub: { color: "rgba(255,255,255,0.75)", fontSize: 11, marginTop: 4, fontWeight: "600" as const },
  cta: { color: "rgba(255,255,255,0.9)", fontSize: 11, marginTop: 10, fontWeight: "700" as const, textAlign: "right" as const },
  close: { padding: 4 },
  closeText: { color: "#fff", fontSize: 18, fontWeight: "700" as const },
});
