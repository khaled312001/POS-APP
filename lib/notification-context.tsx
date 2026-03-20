import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { useQueryClient } from "@tanstack/react-query";
import { getApiUrl, apiRequest } from "./query-client";
import { useLicense } from "./license-context";

interface NotificationContextType {
    onlineOrderNotification: any | null;
    setOnlineOrderNotification: (order: any | null) => void;
    incomingCalls: any[];
    setIncomingCalls: React.Dispatch<React.SetStateAction<any[]>>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Shared AudioContext — created once, reused for all sounds
let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
    if (Platform.OS !== "web") return null;
    try {
        const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (!AC) return null;
        if (!sharedAudioCtx) sharedAudioCtx = new AC();
        return sharedAudioCtx;
    } catch {
        return null;
    }
}

/**
 * Play a single bell strike at a given frequency.
 * Shape: instant attack → slow exponential decay (like a real bell).
 */
function playBellStrike(ctx: AudioContext, freq: number, startTime: number, volume = 0.5) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    // Add a second oscillator for a richer harmonic
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, startTime);
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 2.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + 2.5);

    // Overtone at 2.76x (classic bell harmonic)
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(freq * 2.76, startTime);
    gain2.gain.setValueAtTime(0, startTime);
    gain2.gain.linearRampToValueAtTime(volume * 0.3, startTime + 0.005);
    gain2.gain.exponentialRampToValueAtTime(0.001, startTime + 1.5);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(startTime);
    osc2.stop(startTime + 1.5);
}

/**
 * Play a "ding-ding" restaurant notification bell.
 * Two strikes: E5 → C5, separated by 350ms.
 */
function playRestaurantBell() {
    const ctx = getAudioContext();
    if (!ctx) return;

    // Resume if suspended (browser autoplay policy)
    const play = () => {
        const t = ctx.currentTime;
        playBellStrike(ctx, 659.25, t, 0.55);       // E5
        playBellStrike(ctx, 523.25, t + 0.35, 0.45); // C5
        playBellStrike(ctx, 659.25, t + 0.70, 0.40); // E5 again (softer)
    };

    if (ctx.state === "suspended") {
        ctx.resume().then(play).catch(() => { });
    } else {
        play();
    }
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const [onlineOrderNotification, setOnlineOrderNotificationState] = useState<any | null>(null);
    const [incomingCalls, setIncomingCalls] = useState<any[]>([]);
    const { tenant } = useLicense();
    const qc = useQueryClient();

    // Track the last seen order ID for polling-based fallback detection
    const lastSeenOrderIdRef = useRef<number | null>(null);
    const audioUnlockedRef = useRef(false);

    // Unlock AudioContext on first user gesture (browser autoplay policy)
    useEffect(() => {
        if (Platform.OS !== "web") return;
        const unlock = () => {
            if (audioUnlockedRef.current) return;
            const ctx = getAudioContext();
            if (ctx && ctx.state === "suspended") {
                ctx.resume().then(() => { audioUnlockedRef.current = true; });
            } else {
                audioUnlockedRef.current = true;
            }
        };
        window.addEventListener("click", unlock, { once: false });
        window.addEventListener("keydown", unlock, { once: false });
        window.addEventListener("touchstart", unlock, { once: false });
        return () => {
            window.removeEventListener("click", unlock);
            window.removeEventListener("keydown", unlock);
            window.removeEventListener("touchstart", unlock);
        };
    }, []);

    const playNotificationSound = useCallback(() => {
        if (Platform.OS === "web") {
            playRestaurantBell();
        } else {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
    }, []);

    const setOnlineOrderNotification = useCallback((order: any | null) => {
        setOnlineOrderNotificationState(order);
        if (order) {
            // Auto-hide after 15 seconds
            setTimeout(() => {
                setOnlineOrderNotificationState((current: any) =>
                    current?.id === order.id ? null : current
                );
            }, 15000);
        }
    }, []);

    // ── WebSocket: real-time notifications ──────────────────────────────────
    useEffect(() => {
        if (!tenant?.id) return;

        const wsUrl = `${getApiUrl().replace("http", "ws")}/api/ws/caller-id`;
        let ws: WebSocket;
        let reconnectTimer: ReturnType<typeof setTimeout>;

        function connect() {
            try {
                ws = new WebSocket(wsUrl);

                ws.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);

                        if (data.type === "new_online_order") {
                            playNotificationSound();
                            setOnlineOrderNotification(data.order);
                            qc.invalidateQueries({ queryKey: ["/api/online-orders"] });
                            // Update last seen so polling doesn't double-fire
                            if (data.order?.id) lastSeenOrderIdRef.current = data.order.id;
                        } else if (data.type === "incoming_call") {
                            setIncomingCalls((prev) => {
                                const filtered = prev.filter((c) => c.slot !== data.slot);
                                return [...filtered, { ...data, id: `${data.slot}-${data.timestamp}` }].slice(0, 4);
                            });
                            if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                        } else if (data.type === "active_calls" || data.type === "calls_update") {
                            const calls = (data.calls || data.allActiveCalls || []).map((c: any) => ({
                                ...c,
                                id: `${c.slot}-${c.timestamp}`,
                            }));
                            setIncomingCalls(calls);
                        } else if (data.type === "menu_updated") {
                            qc.invalidateQueries({ queryKey: ["/api/products"] });
                            qc.invalidateQueries({ queryKey: ["/api/categories"] });
                        }
                    } catch (e) {
                        console.error("WS Parse Error:", e);
                    }
                };

                ws.onclose = () => {
                    reconnectTimer = setTimeout(connect, 5000);
                };

                ws.onerror = () => {
                    ws.close();
                };
            } catch {
                reconnectTimer = setTimeout(connect, 5000);
            }
        }

        connect();
        return () => {
            if (ws) ws.close();
            clearTimeout(reconnectTimer);
        };
    }, [qc, setOnlineOrderNotification, playNotificationSound, tenant?.id]);

    // ── Polling fallback: catch new orders even when WebSocket is down ───────
    useEffect(() => {
        if (!tenant?.id) return;

        const check = async () => {
            try {
                const res = await apiRequest("GET", "/api/online-orders");
                if (!res.ok) return;
                const orders: any[] = await res.json();
                // Find the newest pending order
                const pending = orders.filter((o: any) => o.status === "pending");
                if (pending.length === 0) return;
                const newest = pending.reduce((a: any, b: any) => (a.id > b.id ? a : b));
                // If this order wasn't already notified via WebSocket, fire now
                if (lastSeenOrderIdRef.current === null) {
                    lastSeenOrderIdRef.current = newest.id;
                    return; // First load — just record, don't notify
                }
                if (newest.id > (lastSeenOrderIdRef.current ?? 0)) {
                    lastSeenOrderIdRef.current = newest.id;
                    playNotificationSound();
                    setOnlineOrderNotification(newest);
                    qc.invalidateQueries({ queryKey: ["/api/online-orders"] });
                }
            } catch { }
        };

        check(); // Run immediately on mount
        const interval = setInterval(check, 20000); // Then every 20s
        return () => clearInterval(interval);
    }, [tenant?.id, playNotificationSound, setOnlineOrderNotification, qc]);

    return (
        <NotificationContext.Provider value={{
            onlineOrderNotification,
            setOnlineOrderNotification,
            incomingCalls,
            setIncomingCalls,
        }}>
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotifications() {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error("useNotifications must be used within a NotificationProvider");
    }
    return context;
}
