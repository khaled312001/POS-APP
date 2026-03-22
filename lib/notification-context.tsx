import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { Platform } from "react-native";
import * as Haptics from "expo-haptics";
import { useQueryClient } from "@tanstack/react-query";
import { getApiUrl } from "./query-client";
import { useLicense } from "./license-context";

interface NotificationContextType {
    onlineOrderNotification: any | null;
    setOnlineOrderNotification: (order: any | null) => void;
    incomingCalls: any[];
    setIncomingCalls: React.Dispatch<React.SetStateAction<any[]>>;
    dismissCall: (callId: string, slot: number) => void;
    playNotificationSound: () => void;
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

// Preloaded Audio element for phone ring — much more reliable than Web Audio API
let ringAudioEl: HTMLAudioElement | null = null;
function getRingAudio(): HTMLAudioElement | null {
    if (Platform.OS !== "web" || typeof window === "undefined") return null;
    if (!ringAudioEl) {
        ringAudioEl = new Audio("/sounds/ring.wav");
        ringAudioEl.loop = false;
        ringAudioEl.volume = 0.8;
        ringAudioEl.load();
    }
    return ringAudioEl;
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

    const play = () => {
        const t = ctx.currentTime;
        playBellStrike(ctx, 659.25, t, 0.55);
        playBellStrike(ctx, 523.25, t + 0.35, 0.45);
        playBellStrike(ctx, 659.25, t + 0.70, 0.40);
    };

    if (ctx.state === "suspended") {
        ctx.resume().then(play).catch(() => { });
    } else {
        play();
    }
}

/**
 * Phone ring sound using a preloaded WAV file — far more reliable than
 * Web Audio API which is blocked by browser autoplay policies.
 * Returns a `stop()` function.
 */
function startPhoneRing(): () => void {
    if (Platform.OS !== "web") return () => { };

    let stopped = false;
    let timers: ReturnType<typeof setTimeout>[] = [];
    const audio = getRingAudio();

    function playOnce() {
        if (stopped || !audio) return;
        try {
            audio.currentTime = 0;
            const p = audio.play();
            if (p) p.catch(() => { });
        } catch { }
    }

    function ring(count = 0) {
        if (stopped || count > 8) return;
        playOnce();
        // ring.wav is ~1 second — wait 2 s between repeats
        timers.push(setTimeout(() => ring(count + 1), 2000));
    }

    ring();

    return () => {
        stopped = true;
        timers.forEach(clearTimeout);
        timers = [];
        if (audio && !audio.paused) {
            audio.pause();
            audio.currentTime = 0;
        }
    };
}

// Session-scoped dismissed call IDs (cleared on tab/window close, not on navigation)
function getSeenCallIds(): Set<string> {
    try {
        const raw = sessionStorage.getItem("pos_seen_calls");
        return new Set(raw ? JSON.parse(raw) : []);
    } catch { return new Set(); }
}
function markCallSeen(id: string) {
    try {
        const ids = getSeenCallIds();
        ids.add(id);
        sessionStorage.setItem("pos_seen_calls", JSON.stringify([...ids]));
    } catch { }
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const [onlineOrderNotification, setOnlineOrderNotificationState] = useState<any | null>(null);
    const [incomingCalls, setIncomingCalls] = useState<any[]>([]);
    const { tenant } = useLicense();
    const qc = useQueryClient();
    const wsRef = useRef<WebSocket | null>(null);

    const audioUnlockedRef = useRef(false);
    // Holds the stop function for the currently playing ring
    const stopRingRef = useRef<(() => void) | null>(null);
    // Native haptic pulse interval
    const hapticIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

    /** Start a repeating phone ring.  Safe to call multiple times — won't double-ring. */
    const startCallRing = useCallback(() => {
        // Don't start a new ring if one is already running
        if (stopRingRef.current) return;

        if (Platform.OS === "web") {
            stopRingRef.current = startPhoneRing();
        } else {
            // Native: rapid haptic pulse every 800 ms
            const pulse = () => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            };
            pulse();
            hapticIntervalRef.current = setInterval(pulse, 1800);
            stopRingRef.current = () => { /* handled in stopCallRing */ };
        }
    }, []);

    /** Stop the ring immediately. */
    const stopCallRing = useCallback(() => {
        if (stopRingRef.current) {
            stopRingRef.current();
            stopRingRef.current = null;
        }
        if (hapticIntervalRef.current) {
            clearInterval(hapticIntervalRef.current);
            hapticIntervalRef.current = null;
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
        let retryCount = 0;

        function getReconnectDelay(): number {
            // Exponential backoff: 1s, 2s, 4s, 8s, 16s... capped at 30s, with jitter
            const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);
            retryCount = Math.min(retryCount + 1, 10);
            return delay + Math.random() * 500;
        }

        function connect() {
            try {
                ws = new WebSocket(wsUrl);
                wsRef.current = ws;

                ws.onopen = () => {
                    retryCount = 0; // Reset backoff on successful connection
                    // Register tenantId for isolated notifications
                    if (tenant?.id) {
                        ws.send(JSON.stringify({ type: "register", tenantId: tenant.id }));
                    }
                };

                ws.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);

                        if (data.type === "new_online_order") {
                            playNotificationSound();
                            setOnlineOrderNotification(data.order);
                            qc.invalidateQueries({ queryKey: ["/api/online-orders"] });
                        } else if (data.type === "incoming_call") {
                            const callId = `${data.slot}-${data.timestamp}`;
                            // Don't re-show calls already dismissed this session
                            if (getSeenCallIds().has(callId)) return;
                            setIncomingCalls((prev) => {
                                const filtered = prev.filter((c) => c.slot !== data.slot);
                                return [...filtered, { ...data, id: callId }].slice(0, 4);
                            });
                            // 🔔 Start phone ring sound
                            startCallRing();
                        } else if (data.type === "active_calls" || data.type === "calls_update") {
                            const seen = getSeenCallIds();
                            const calls = (data.calls || data.allActiveCalls || [])
                                .map((c: any) => ({ ...c, id: `${c.slot}-${c.timestamp}` }))
                                // Filter out calls already dismissed this browser session
                                .filter((c: any) => !seen.has(c.id));
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
                    clearTimeout(reconnectTimer);
                    reconnectTimer = setTimeout(connect, getReconnectDelay());
                };

                ws.onerror = () => {
                    // onclose will fire after this and schedule reconnect
                    ws.close();
                };
            } catch {
                clearTimeout(reconnectTimer);
                reconnectTimer = setTimeout(connect, getReconnectDelay());
            }
        }

        connect();
        return () => {
            if (ws) ws.close();
            clearTimeout(reconnectTimer);
        };
    }, [qc, setOnlineOrderNotification, playNotificationSound, startCallRing, tenant?.id]);

    // Safety: stop ring if all calls are cleared externally (e.g. auto-dismiss timeout)
    useEffect(() => {
        if (incomingCalls.length === 0) stopCallRing();
    }, [incomingCalls.length, stopCallRing]);

    // ── HTTP polling fallback — catches calls missed by WebSocket ──────────────
    const incomingCallsRef = useRef<any[]>(incomingCalls);
    useEffect(() => { incomingCallsRef.current = incomingCalls; }, [incomingCalls]);

    useEffect(() => {
        if (!tenant?.id) return;
        const pollUrl = `${getApiUrl()}/api/caller-id/active-calls?tenantId=${tenant.id}`;
        const interval = setInterval(async () => {
            try {
                const res = await fetch(pollUrl, { credentials: "include" });
                if (!res.ok) return;
                const data = await res.json();
                const remoteCalls: any[] = data.calls || [];
                if (remoteCalls.length === 0) return;
                const seen = getSeenCallIds();
                const prev = incomingCallsRef.current;
                const prevIds = new Set(prev.map((c: any) => c.id));
                const newCalls: any[] = [];
                for (const rc of remoteCalls) {
                    const id = `${rc.slot}-${rc.timestamp}`;
                    if (seen.has(id) || prevIds.has(id)) continue;
                    newCalls.push({ ...rc, id });
                }
                if (newCalls.length === 0) return;
                startCallRing();
                setIncomingCalls((prev) => {
                    let next = [...prev];
                    for (const nc of newCalls) {
                        next = next.filter((c: any) => c.slot !== nc.slot);
                        next.push(nc);
                    }
                    return next.slice(0, 4);
                });
            } catch { /* network error — ignore */ }
        }, 4000);
        return () => clearInterval(interval);
    }, [tenant?.id, startCallRing]);

    const dismissCall = useCallback((callId: string, slot: number) => {
        // Mark as seen so it won't re-appear after page refresh
        markCallSeen(callId);
        // Remove from local state — stop ring when all calls are gone
        setIncomingCalls((prev) => {
            const remaining = prev.filter((c) => c.id !== callId);
            if (remaining.length === 0) stopCallRing();
            return remaining;
        });
        // Tell server to free the slot
        try {
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({ type: "call_answered", slot }));
            }
        } catch { }
    }, [stopCallRing]);

    return (
        <NotificationContext.Provider value={{
            onlineOrderNotification,
            setOnlineOrderNotification,
            incomingCalls,
            setIncomingCalls,
            dismissCall,
            playNotificationSound,
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
