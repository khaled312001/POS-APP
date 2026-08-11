import { fetch } from "expo/fetch";
import { QueryClient, QueryFunction } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { getApiUrl } from "./api-config";
export { getApiUrl };

let cachedLicenseKey: string | null = null;
let cachedEmployeeToken: string | null = null;

export const EMPLOYEE_TOKEN_STORAGE_KEY = "kassenta_employee_token";

async function getLicenseKey(): Promise<string | null> {
  if (cachedLicenseKey) return cachedLicenseKey;
  try {
    cachedLicenseKey = await AsyncStorage.getItem("barmagly_license_key");
    return cachedLicenseKey;
  } catch {
    return null;
  }
}

export function clearCachedLicenseKey() {
  cachedLicenseKey = null;
}

export function setCachedLicenseKey(key: string) {
  cachedLicenseKey = key;
}

/**
 * SEC-01: the employee token proves *who* is acting, while the license key only
 * proves *which store*. The server derives role permissions from this token.
 */
async function getEmployeeToken(): Promise<string | null> {
  if (cachedEmployeeToken) return cachedEmployeeToken;
  try {
    cachedEmployeeToken = await AsyncStorage.getItem(EMPLOYEE_TOKEN_STORAGE_KEY);
    return cachedEmployeeToken;
  } catch {
    return null;
  }
}

export function setCachedEmployeeToken(token: string | null) {
  cachedEmployeeToken = token;
}

export function clearCachedEmployeeToken() {
  cachedEmployeeToken = null;
}

async function getAuthHeaders(extraHeaders?: Record<string, string>): Promise<Record<string, string>> {
  const headers: Record<string, string> = { ...extraHeaders };
  const licenseKey = await getLicenseKey();
  if (licenseKey) {
    headers["x-license-key"] = licenseKey;
  }
  const employeeToken = await getEmployeeToken();
  if (employeeToken) {
    headers["x-employee-token"] = employeeToken;
  }
  return headers;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  route: string,
  data?: unknown | undefined,
): Promise<Response> {
  const baseUrl = getApiUrl();
  const url = new URL(route, baseUrl);

  const headers = await getAuthHeaders(data ? { "Content-Type": "application/json" } : {});

  // Abort hung requests (checkout must never spin forever on a dead network).
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  let res: Response;
  try {
    res = await fetch(url.toString(), {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
    async ({ queryKey }) => {
      const baseUrl = getApiUrl();
      const url = new URL(queryKey.join("/") as string, baseUrl);

      const headers = await getAuthHeaders();

      const res = await fetch(url.toString(), {
        headers,
        credentials: "include",
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      return await res.json();
    };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      staleTime: 5 * 60 * 1000, // 5 min — stop serving stale prices/stock forever
      retry: (failureCount, error: any) => {
        // Don't retry auth/client errors; retry transient network/5xx up to 2×.
        const msg = String(error?.message || "");
        if (/^4\d\d:/.test(msg)) return false;
        return failureCount < 2;
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    },
    mutations: {
      retry: false,
    },
  },
});
