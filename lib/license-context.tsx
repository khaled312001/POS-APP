import { createContext, useContext, useEffect, useState } from "react";
import React from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { getApiUrl } from "./api-config";
import { setCachedLicenseKey, clearCachedLicenseKey, apiRequest } from "./query-client";
import { setCurrency } from "./currency";
import * as Application from "expo-application";

interface SubscriptionStatus {
    active: boolean;
    plan: string;
    daysRemaining: number;
    requiresUpgrade: boolean;
}

interface TenantInfo {
    id: number;
    name: string;
    logo: string | null;
    storeType: string | null;
    setupCompleted: boolean;
}

/** A Google account whose store has no licence yet: it picks a plan. */
export interface PlanSignup {
    planToken: string;
    email: string;
    storeName: string;
}

interface LicenseContextType {
    isValidating: boolean;
    isValid: boolean | null;
    tenant: TenantInfo | null;
    subscription: SubscriptionStatus | null;
    errorReason: string | null;
    validateLicense: (key: string, email?: string, password?: string) => Promise<boolean>;
    validateGoogleLogin: (token: string, kind?: "id" | "access") => Promise<boolean>;
    logoutLicense: () => Promise<void>;
    deviceId: string;
    planSignup: PlanSignup | null;
    clearPlanSignup: () => void;
    /** After paying: true once the store's licence exists (then signs in). */
    checkPlanStatus: () => Promise<boolean>;
}

const LicenseContext = createContext<LicenseContextType | null>(null);

const CURRENCY_CACHE_KEY = "kassenta_store_currency";

/**
 * Applies the store currency (main branch's `branches.currency`, served by
 * /api/store-settings). The last known value is restored from storage first so
 * the POS grid never flashes the wrong currency on a warm start; the fresh value
 * then arrives in the background and re-renders every screen via useCurrency().
 */
async function syncStoreCurrency(tenantId: number | string | undefined | null) {
    if (!tenantId) return;
    const cacheKey = `${CURRENCY_CACHE_KEY}_${tenantId}`;
    try {
        const cached = await AsyncStorage.getItem(cacheKey);
        if (cached) setCurrency(cached);
    } catch { /* ignore */ }
    apiRequest("GET", `/api/store-settings?tenantId=${tenantId}`)
        .then((res) => res.json())
        .then((settings: any) => {
            if (settings?.currency) {
                setCurrency(settings.currency);
                AsyncStorage.setItem(cacheKey, String(settings.currency)).catch(() => {});
            }
        })
        .catch(() => { /* offline: keep cached/default currency */ });
}

async function parseJsonResponse(response: Response, context: string) {
    const contentType = response.headers.get("content-type") || "";
    const raw = await response.text();

    if (!contentType.toLowerCase().includes("application/json")) {
        const preview = raw.replace(/\s+/g, " ").trim().slice(0, 120);
        throw new Error(
            `${context} returned ${response.status} ${response.statusText || "response"} as ${contentType || "unknown content type"}${preview ? `: ${preview}` : ""}`
        );
    }

    try {
        return JSON.parse(raw);
    } catch {
        throw new Error(`${context} returned invalid JSON`);
    }
}

export function LicenseProvider({ children }: { children: React.ReactNode }) {
    const [isValidating, setIsValidating] = useState(true);
    const [isValid, setIsValid] = useState<boolean | null>(null);
    const [tenant, setTenant] = useState<TenantInfo | null>(null);
    const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
    const [planSignup, setPlanSignup] = useState<PlanSignup | null>(null);
    const [errorReason, setErrorReason] = useState<string | null>(null);
    const [deviceId, setDeviceId] = useState<string>("unknown-device");

    useEffect(() => {
        async function initDeviceAndCheckLicense() {
            // 1. Get or generate Device ID
            let id: string | null = await AsyncStorage.getItem("barmagly_device_id");
            if (!id) {
                if (Platform.OS === 'android') {
                    try {
                        id = Application.getAndroidId() || `android-${Date.now()}`;
                    } catch {
                        id = `android-${Date.now()}`;
                    }
                } else if (Platform.OS === 'ios') {
                    id = await Application.getIosIdForVendorAsync() || `ios-${Date.now()}`;
                } else {
                    id = `web-${Date.now()}`;
                }

                if (id) {
                    await AsyncStorage.setItem("barmagly_device_id", id);
                    setDeviceId(id);
                }
            } else {
                setDeviceId(id);
            }

            // 2. Check for existing license key
            const storedKey = await AsyncStorage.getItem("barmagly_license_key");

            if (storedKey) {
                // 3. Validate existing key
                await validateLicense(storedKey, undefined, undefined, id || undefined);
            } else {
                setIsValid(false);
            }
            setIsValidating(false);
        }

        initDeviceAndCheckLicense();
    }, []);

    const validateLicense = async (key: string, email?: string, password?: string, overrideDeviceId?: string): Promise<boolean> => {
        setErrorReason(null);
        const dId = overrideDeviceId || deviceId;

        try {
            let apiUrl = getApiUrl();


            const body: any = { licenseKey: key, deviceId: dId };
            if (email) body.email = email;
            if (password) body.password = password;

            const response = await fetch(`${apiUrl}/api/license/validate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            });

            const data = await parseJsonResponse(response, "Validation server");

            // Only an explicit verdict may sign the store out. A 429 (shared
            // IP / carrier NAT), 5xx or any other error body is an outage, not
            // an invalid key: it goes to the offline-grace path below instead
            // of wiping the licence off the device.
            if (!response.ok || typeof data?.isValid !== "boolean") {
                throw new Error(data?.error || `Validation server returned ${response.status}`);
            }

            if (data.isValid) {
                await AsyncStorage.setItem("barmagly_license_key", key);
                setCachedLicenseKey(key);
                if (email) await AsyncStorage.setItem("barmagly_store_email", email);
                if (data.tenant?.id) {
                    await AsyncStorage.setItem("barmagly_tenant_id", String(data.tenant.id));
                }

                // Cache the last successful validation so the POS keeps working
                // during a transient internet/server outage (offline grace).
                try {
                    await AsyncStorage.setItem("barmagly_last_valid", JSON.stringify({
                        at: Date.now(),
                        tenant: data.tenant,
                        subscription: data.subscription,
                    }));
                } catch { /* ignore */ }

                await syncStoreCurrency(data.tenant?.id);
                setIsValid(true);
                setTenant(data.tenant);
                setSubscription(data.subscription);
                return true;
            } else {
                await AsyncStorage.removeItem("barmagly_license_key");
                await AsyncStorage.removeItem("barmagly_tenant_id");
                clearCachedLicenseKey();
                setIsValid(false);
                setErrorReason(data.reason || "Invalid license key");
                setTenant(null);
                setSubscription(null);
                return false;
            }
        } catch (err: any) {
            // Network/server error (NOT an explicit isValid:false). If this device
            // validated successfully recently, keep the POS usable within a grace
            // window instead of locking the merchant out during an outage.
            console.error("License validation failed:", err);
            const GRACE_MS = 72 * 60 * 60 * 1000; // 72 hours
            try {
                const cachedRaw = await AsyncStorage.getItem("barmagly_last_valid");
                if (cachedRaw) {
                    const cached = JSON.parse(cachedRaw);
                    if (cached?.at && (Date.now() - cached.at) < GRACE_MS && cached.tenant) {
                        console.warn("[License] Offline grace active — using last successful validation.");
                        await syncStoreCurrency(cached.tenant?.id);
                        setIsValid(true);
                        setTenant(cached.tenant);
                        setSubscription(cached.subscription ?? null);
                        setErrorReason(null);
                        return true;
                    }
                }
            } catch { /* fall through to locked state */ }

            setIsValid(false);
            const targetUrl = getApiUrl();
            setErrorReason(`Could not connect to validation server (${targetUrl}). Check your internet connection or server status. Details: ${err.message}`);
            return false;
        }
    };

    const validateGoogleLogin = async (token: string, kind: "id" | "access" = "id"): Promise<boolean> => {
        setErrorReason(null);
        try {
            let apiUrl = getApiUrl();
            const response = await fetch(`${apiUrl}/api/auth/google`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(kind === "access" ? { accessToken: token, deviceId } : { idToken: token, deviceId })
            });

            const data = await parseJsonResponse(response, "Google authentication server");

            if (data.success && data.needsPlan && data.planToken) {
                setPlanSignup({
                    planToken: String(data.planToken),
                    email: String(data.tenant?.email || ""),
                    storeName: String(data.tenant?.name || ""),
                });
                // Handled: the gate now shows the plans page.
                return true;
            }

            if (data.success && data.licenseKey) {
                await AsyncStorage.setItem("barmagly_license_key", data.licenseKey);
                setCachedLicenseKey(data.licenseKey);
                if (data.tenant?.id) {
                    await AsyncStorage.setItem("barmagly_tenant_id", String(data.tenant.id));
                }

                setIsValid(true);
                setTenant(data.tenant);
                // After successful Google login, we should also fetch the full validation info
                return await validateLicense(data.licenseKey);
            } else {
                setErrorReason(data.error || "Google authentication failed");
                return false;
            }
        } catch (err: any) {
            console.error("Google login validation failed:", err);
            setErrorReason(`Connection error: ${err.message}`);
            return false;
        }
    };

    const clearPlanSignup = () => setPlanSignup(null);

    const checkPlanStatus = async (): Promise<boolean> => {
        if (!planSignup) return false;
        try {
            const response = await fetch(`${getApiUrl()}/api/auth/plan-status`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ planToken: planSignup.planToken }),
            });
            const data = await response.json().catch(() => ({}));
            if (!data?.active || !data.licenseKey) return false;
            const ok = await validateLicense(String(data.licenseKey));
            if (ok) setPlanSignup(null);
            return ok;
        } catch {
            return false;
        }
    };

    const logoutLicense = async () => {
        await AsyncStorage.removeItem("barmagly_license_key");
        await AsyncStorage.removeItem("barmagly_tenant_id");
        clearCachedLicenseKey();
        setCurrency(null);
        setIsValid(false);
        setTenant(null);
        setSubscription(null);
    };

    return (
        <LicenseContext.Provider
            value={{
                isValidating,
                isValid,
                tenant,
                subscription,
                errorReason,
                validateLicense,
                validateGoogleLogin,
                logoutLicense,
                deviceId,
                planSignup,
                clearPlanSignup,
                checkPlanStatus,
            }}
        >
            {children}
        </LicenseContext.Provider>
    );
}

export function useLicense() {
    const context = useContext(LicenseContext);
    if (!context) {
        throw new Error("useLicense must be used within a LicenseProvider");
    }
    return context;
}
