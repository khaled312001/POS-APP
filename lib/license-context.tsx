import { createContext, useContext, useEffect, useState } from "react";
import React from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { getApiUrl } from "./api-config";
import { setCachedLicenseKey, clearCachedLicenseKey } from "./query-client";
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

interface LicenseContextType {
    isValidating: boolean;
    isValid: boolean | null;
    tenant: TenantInfo | null;
    subscription: SubscriptionStatus | null;
    errorReason: string | null;
    validateLicense: (key: string, email?: string, password?: string) => Promise<boolean>;
    validateGoogleLogin: (idToken: string) => Promise<boolean>;
    logoutLicense: () => Promise<void>;
    deviceId: string;
}

const LicenseContext = createContext<LicenseContextType | null>(null);

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

            if (data.isValid) {
                await AsyncStorage.setItem("barmagly_license_key", key);
                setCachedLicenseKey(key);
                if (email) await AsyncStorage.setItem("barmagly_store_email", email);
                if (data.tenant?.id) {
                    await AsyncStorage.setItem("barmagly_tenant_id", String(data.tenant.id));
                }

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
            console.error("License validation failed:", err);
            setIsValid(false);

            let targetUrl = getApiUrl();

            setErrorReason(`Could not connect to validation server (${targetUrl}). Check your internet connection or server status. Details: ${err.message}`);
            return false;
        }
    };

    const validateGoogleLogin = async (idToken: string): Promise<boolean> => {
        setErrorReason(null);
        try {
            let apiUrl = getApiUrl();
            const response = await fetch(`${apiUrl}/api/auth/google`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ idToken, deviceId })
            });

            const data = await parseJsonResponse(response, "Google authentication server");

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

    const logoutLicense = async () => {
        await AsyncStorage.removeItem("barmagly_license_key");
        await AsyncStorage.removeItem("barmagly_tenant_id");
        clearCachedLicenseKey();
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
                deviceId
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
