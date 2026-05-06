/**
 * Global notification center — replaces the older single-purpose
 * BroadcastToaster. Mounted once at the app root so every realtime
 * event bubbles up as a floating banner regardless of which POS
 * screen is currently visible.
 *
 * Events handled (all over the existing /api/ws/caller-id channel):
 *   new_online_order        → new delivery / pickup / dine-in order
 *   broadcast_new           → marketplace broadcast (drop-shipping)
 *   broadcast_claimed       → another store accepted (dismiss own)
 *   broadcast_cancelled
 *   chat_new_message        → customer wrote into the order chat
 *   delivery_status_change  → driver picked up / delivered
 *   driver_status_change    → driver flipped online / offline
 *   incoming_call           → caller-id ring
 *
 * Each banner: icon avatar + title + body + meta + CTA, with stacking,
 * auto-dismiss (10 s), tap-to-navigate, manual dismiss.
 */
import React, { useEffect, useRef, useState, useCallback } from "react";
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter, usePathname } from "expo-router";
import { useLicense } from "@/lib/license-context";
import { getApiUrl } from "@/lib/query-client";
import { Colors } from "@/constants/colors";

type NotifKind =
  | "order"
  | "broadcast"
  | "chat"
  | "delivery"
  | "call"
  | "driver";

interface Notif {
  id: string;
  kind: NotifKind;
  title: string;
  body: string;
  meta?: string;
  emoji: string;
  color: string;
  href?: string;            // route to open on tap
  expiresAt: number;        // ms timestamp — auto dismiss
  dedupeKey?: string;       // optional: replace older notif with same key
}

const AUTO_DISMISS_MS = 10_000;
const MAX_VISIBLE = 4;

// ─── Single banner row ────────────────────────────────────────────────
function NotificationCard({ n, onTap, onDismiss }: { n: Notif; onTap: () => void; onDismiss: () => void }) {
  const slide = useRef(new Animated.Value(-220)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const [secsLeft, setSecsLeft] = useState(Math.ceil((n.expiresAt - Date.now()) / 1000));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slide, { toValue: 0, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(fade, { toValue: 1, duration: 240, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    const iv = setInterval(() => setSecsLeft(Math.max(0, Math.ceil((n.expiresAt - Date.now()) / 1000))), 1000);
    return () => clearInterval(iv);
  }, [n.expiresAt]);

  const dismiss = useCallback(() => {
    Animated.parallel([
      Animated.timing(slide, { toValue: -220, duration: 200, useNativeDriver: true }),
      Animated.timing(fade, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => onDismiss());
  }, [onDismiss, slide, fade]);

  return (
    <Animated.View style={[styles.cardWrap, { opacity: fade, transform: [{ translateY: slide }] }]} pointerEvents="box-none">
      <Pressable
        onPress={() => { onTap(); dismiss(); }}
        style={[styles.card, { borderColor: n.color + "60", backgroundColor: n.color + "16" }]}
      >
        <View style={[styles.icon, { backgroundColor: n.color }]}>
          <Text style={styles.iconText}>{n.emoji}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={1}>{n.title}</Text>
            <Text style={[styles.timer, { color: n.color }]}>{secsLeft}s</Text>
          </View>
          <Text style={styles.body} numberOfLines={2}>{n.body}</Text>
          {n.meta ? <Text style={styles.meta} numberOfLines={1}>{n.meta}</Text> : null}
        </View>
        <Pressable onPress={(e) => { e.stopPropagation(); dismiss(); }} style={styles.close} hitSlop={8}>
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

// ─── Main provider ────────────────────────────────────────────────────
export default function GlobalNotificationCenter() {
  const router = useRouter();
  const pathname = usePathname();
  const { tenant } = useLicense();
  const tenantId = tenant?.id;
  const [stack, setStack] = useState<Notif[]>([]);
  const audioCtxRef = useRef<any>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<any>(null);
  const seenIdsRef = useRef<Set<string>>(new Set());

  // ── Audio cue ────────────────────────────────────────────────────
  const beep = useCallback((kind: NotifKind) => {
    if (Platform.OS !== "web") return;
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new (window as any).AudioContext();
      const ctx = audioCtxRef.current;
      // Different cadence per kind so the listener can distinguish without looking
      const pattern: Record<NotifKind, [number, number][]> = {
        order:     [[880, 0], [1100, 0.12]],
        broadcast: [[660, 0], [880, 0.12], [1100, 0.24]],
        chat:      [[1320, 0]],
        delivery:  [[1100, 0]],
        call:      [[660, 0], [880, 0.18], [660, 0.36]],
        driver:    [[880, 0]],
      };
      (pattern[kind] || pattern.order).forEach(([f, t]) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = f;
        gain.gain.setValueAtTime(0.22, ctx.currentTime + t);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.28);
        osc.start(ctx.currentTime + t);
        osc.stop(ctx.currentTime + t + 0.28);
      });
    } catch {}
  }, []);

  const push = useCallback((n: Notif) => {
    setStack((prev) => {
      // De-dupe: replace existing by key, otherwise append (cap at MAX_VISIBLE)
      let next = n.dedupeKey ? prev.filter((p) => p.dedupeKey !== n.dedupeKey) : prev;
      next = [...next, n];
      if (next.length > MAX_VISIBLE) next = next.slice(next.length - MAX_VISIBLE);
      return next;
    });
    beep(n.kind);
  }, [beep]);

  const remove = useCallback((id: string) => {
    setStack((prev) => prev.filter((p) => p.id !== id));
  }, []);

  // ── Auto-dismiss timer ───────────────────────────────────────────
  useEffect(() => {
    if (stack.length === 0) return;
    const iv = setInterval(() => {
      const now = Date.now();
      setStack((prev) => prev.filter((p) => p.expiresAt > now));
    }, 1000);
    return () => clearInterval(iv);
  }, [stack.length]);

  // ── WS subscription ──────────────────────────────────────────────
  useEffect(() => {
    if (Platform.OS !== "web") return;
    if (!tenantId) return;
    let mounted = true;

    // We try WebSocket first; if it fails (Hostinger CDN strips the upgrade),
    // we fall back to a Server-Sent-Events stream that mirrors the same
    // broadcast events. SSE works through HTTP/2 proxies without any
    // special server config.
    let esRef: EventSource | null = null;
    let wsFailed = false;

    const startSse = () => {
      if (typeof EventSource === "undefined") return;
      try {
        const base = getApiUrl().replace(/\/$/, "");
        const es = new EventSource(`${base}/api/events?tenantId=${tenantId}`);
        esRef = es;
        es.onmessage = (ev) => {
          try { handleEvent(JSON.parse(ev.data)); } catch {}
        };
        es.onerror = () => {
          // EventSource auto-reconnects, but if the browser gives up we'll
          // re-create after a short delay.
          if (!mounted) return;
          try { es.close(); } catch {}
          esRef = null;
          reconnectRef.current = setTimeout(startSse, 4000);
        };
      } catch {
        reconnectRef.current = setTimeout(startSse, 4000);
      }
    };

    const connect = () => {
      try {
        const base = getApiUrl().replace(/^http/, "ws");
        const ws = new WebSocket(`${base}/api/ws/caller-id`);
        wsRef.current = ws;

        // If the WS doesn't open within 3s (CDN swallowed the upgrade),
        // give up and use SSE — without this, we'd just spin forever.
        const wsTimeout = setTimeout(() => {
          if (ws.readyState !== WebSocket.OPEN) {
            try { ws.close(); } catch {}
            if (!wsFailed) { wsFailed = true; startSse(); }
          }
        }, 3000);

        ws.onopen = () => {
          clearTimeout(wsTimeout);
          try { ws.send(JSON.stringify({ type: "register", tenantId })); } catch {}
        };

        ws.onmessage = (ev) => {
          try {
            const m = JSON.parse(ev.data);
            handleEvent(m);
          } catch {}
        };

        ws.onclose = () => {
          clearTimeout(wsTimeout);
          if (!mounted) return;
          if (wsFailed) return; // SSE already taking over
          reconnectRef.current = setTimeout(connect, 4000);
        };
        ws.onerror = () => {
          try { ws.close(); } catch {}
          if (!wsFailed) { wsFailed = true; startSse(); }
        };
      } catch {
        if (!wsFailed) { wsFailed = true; startSse(); }
      }
    };

    const handleEvent = (m: any) => {
      if (!m || typeof m !== "object" || !m.type) return;
      const id = `${m.type}-${m.id || m.orderId || m.roomId || Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const expiresAt = Date.now() + AUTO_DISMISS_MS;
      const dedupeKey = m.id || m.orderId || m.roomId ? `${m.type}-${m.id || m.orderId || m.roomId}` : undefined;

      switch (m.type) {
        case "new_online_order": {
          push({
            id, kind: "order", emoji: "🛒", color: "#3B82F6",
            title: "New online order",
            body: m.orderNumber ? `Order #${m.orderNumber}` : `Order ID ${m.orderId || ""}`,
            meta: m.tenantId ? `Tenant ${m.tenantId}` : undefined,
            href: "/(tabs)/online-orders",
            expiresAt, dedupeKey,
          });
          break;
        }
        case "broadcast_new": {
          push({
            id, kind: "broadcast", emoji: "📣", color: "#FF5722",
            title: `Broadcast — ${m.customerName || "New customer"}`,
            body: typeof m.items === "string"
              ? "Tap to view items"
              : Array.isArray(m.items) ? m.items.slice(0, 2).map((it: any) => `${it.quantity || 1}× ${it.name}`).join(" · ") : "Tap to view",
            meta: m.estimatedTotal ? `CHF ${Number(m.estimatedTotal).toFixed(2)} · first to accept wins` : "first to accept wins",
            href: "/(tabs)/online-orders",
            expiresAt, dedupeKey,
          });
          break;
        }
        case "broadcast_claimed":
        case "broadcast_cancelled": {
          // Dismiss the matching broadcast_new banner (if still visible)
          setStack((prev) => prev.filter((p) => p.dedupeKey !== `broadcast_new-${m.id}`));
          break;
        }
        case "chat_new_message": {
          if (m.senderType === "customer") {
            push({
              id, kind: "chat", emoji: "💬", color: "#2FD3C6",
              title: `${m.senderName || "Customer"} — Order #${m.orderId}`,
              body: String(m.body || "").slice(0, 120),
              href: "/(tabs)/online-orders",
              expiresAt, dedupeKey: `chat-${m.orderId}`,
            });
          }
          break;
        }
        case "delivery_status_change": {
          const labels: Record<string, string> = {
            on_way: "On the way 🛵",
            delivered: "Delivered ✅",
            ready: "Ready for pickup",
            preparing: "Being prepared",
          };
          push({
            id, kind: "delivery", emoji: "🚚", color: "#10B981",
            title: `Order #${m.orderId} — ${labels[m.status] || m.status}`,
            body: m.driverName ? `Driver: ${m.driverName}` : "Status updated",
            href: "/(tabs)/online-orders",
            expiresAt, dedupeKey: `delivery-${m.orderId}`,
          });
          break;
        }
        case "incoming_call": {
          push({
            id, kind: "call", emoji: "📞", color: "#F59E0B",
            title: "Incoming call",
            body: m.phoneNumber || "Unknown number",
            meta: m.customer?.name ? `${m.customer.name}${m.customer.address ? " · " + m.customer.address : ""}` : undefined,
            href: "/(tabs)",
            expiresAt: Date.now() + 30_000,    // calls stay longer
            dedupeKey: `call-${m.phoneNumber}`,
          });
          break;
        }
        case "driver_status_change": {
          // Quiet — only show if going online (relevant for assignment), no beep
          if (m.status === "available") {
            push({
              id, kind: "driver", emoji: "🟢", color: "#10B981",
              title: "Driver online",
              body: `Vehicle #${m.vehicleId} is now available`,
              expiresAt: Date.now() + 4000,
              dedupeKey: `driver-${m.vehicleId}`,
            });
          }
          break;
        }
      }
    };

    connect();
    return () => {
      mounted = false;
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      try { wsRef.current?.close(); } catch {}
      try { esRef?.close(); } catch {}
    };
  }, [tenantId, push]);

  // ── Tap handler ──────────────────────────────────────────────────
  const onTap = (n: Notif) => {
    if (!n.href) return;
    if (pathname !== n.href) router.push(n.href as any);
  };

  if (stack.length === 0) return null;

  return (
    <View style={styles.host} pointerEvents="box-none">
      {stack.map((n) => (
        <NotificationCard key={n.id} n={n} onTap={() => onTap(n)} onDismiss={() => remove(n.id)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: "absolute" as const,
    top: 0, left: 0, right: 0,
    zIndex: 9999,
    paddingTop: 10,
    paddingHorizontal: 12,
    alignItems: "center" as const,
  },
  cardWrap: {
    width: "100%" as const,
    maxWidth: 640,
    marginBottom: 10,
  },
  card: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: "rgba(7,10,18,0.92)",
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
  icon: {
    width: 42, height: 42, borderRadius: 12,
    alignItems: "center" as const, justifyContent: "center" as const,
    flexShrink: 0,
  },
  iconText: { fontSize: 22 },
  titleRow: { flexDirection: "row" as const, justifyContent: "space-between", alignItems: "baseline", gap: 8 },
  title: { color: Colors.text, fontWeight: "800" as const, fontSize: 14, flex: 1, minWidth: 0 },
  timer: { fontSize: 11, fontWeight: "700" as const, opacity: 0.85 },
  body: { color: Colors.text + "DD", fontSize: 12.5, marginTop: 2, lineHeight: 17 },
  meta: { color: Colors.textMuted, fontSize: 11, marginTop: 4 },
  close: {
    width: 28, height: 28,
    alignItems: "center" as const, justifyContent: "center" as const,
    borderRadius: 14,
  },
  closeText: { color: Colors.text + "AA", fontSize: 16, fontWeight: "700" as const },
});
