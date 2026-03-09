import { fetch } from "expo/fetch";
import { QueryClient, QueryFunction } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { getApiUrl } from "./api-config";
export { getApiUrl };

let cachedLicenseKey: string | null = null;

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

async function getAuthHeaders(extraHeaders?: Record<string, string>): Promise<Record<string, string>> {
  const headers: Record<string, string> = { ...extraHeaders };
  const licenseKey = await getLicenseKey();
  if (licenseKey) {
    headers["x-license-key"] = licenseKey;
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

  const res = await fetch(url.toString(), {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

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
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
