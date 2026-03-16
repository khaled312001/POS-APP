import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
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
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const [onlineOrderNotification, setOnlineOrderNotificationState] = useState<any | null>(null);
    const [incomingCalls, setIncomingCalls] = useState<any[]>([]);
    const { tenant } = useLicense();
    const qc = useQueryClient();

    const setOnlineOrderNotification = useCallback((order: any | null) => {
        setOnlineOrderNotificationState(order);
        if (order) {
            // Auto-hide after 5 seconds
            setTimeout(() => {
                setOnlineOrderNotificationState((current: any) => (current?.id === order.id ? null : current));
            }, 5000);
        }
    }, []);

    const playNotificationSound = useCallback(() => {
        if (Platform.OS === "web") {
            try {
                const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
                if (AudioContextClass) {
                    const ctx = new AudioContextClass();
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.connect(gain);
                    gain.connect(ctx.destination);

                    // Sound pattern: Two beeps (880Hz -> 1100Hz)
                    osc.frequency.setValueAtTime(880, ctx.currentTime);
                    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);

                    gain.gain.setValueAtTime(0.3, ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);

                    osc.start(ctx.currentTime);
                    osc.stop(ctx.currentTime + 0.6);
                }
            } catch (e) {
                console.error("Failed to play sound:", e);
            }
        } else {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
    }, []);

    useEffect(() => {
        if (!tenant?.id) return;

        const wsUrl = `${getApiUrl().replace("http", "ws")}/api/ws/caller-id`;
        let ws: WebSocket;
        let reconnectTimer: any;

        function connect() {
            try {
                ws = new WebSocket(wsUrl);

                ws.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);

                        if (data.type === "new_online_order") {
                            setOnlineOrderNotification(data.order);
                            playNotificationSound();
                            qc.invalidateQueries({ queryKey: ["/api/online-orders"] });
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

                ws.onerror = (e) => {
                    console.error("WS Error:", e);
                    ws.close();
                };
            } catch (e) {
                console.error("WS Connection Error:", e);
                reconnectTimer = setTimeout(connect, 5000);
            }
        }

        connect();
        return () => {
            if (ws) ws.close();
            clearTimeout(reconnectTimer);
        };
    }, [qc, setOnlineOrderNotification, playNotificationSound, tenant?.id]);

    return (
        <NotificationContext.Provider value={{
            onlineOrderNotification,
            setOnlineOrderNotification,
            incomingCalls,
            setIncomingCalls
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
