import { Platform } from 'react-native';

// Extracts the daily sequential number from stored format "{scopeId}-{YYYYMMDD}-{N}"
// e.g. "5-20260328-7" -> "7", old format "RCP-xxx" -> "RCP-xxx"
export function getDisplayNumber(receiptOrOrderNumber: string | undefined | null): string {
  if (!receiptOrOrderNumber) return "";
  const match = receiptOrOrderNumber.match(/-(\d+)$/);
  return match ? match[1] : receiptOrOrderNumber;
}

export function getApiUrl(): string {
  // Web platform: determine API URL at runtime
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const hostname = window.location.hostname;

    // Local dev
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';
    }
    // Replit dev
    if (hostname.includes('.replit.dev')) {
      return `https://${hostname}:5000`;
    }
    // Production web: use the same origin so API calls reach the backend at the same domain.
    // If your backend is on a different domain, set EXPO_PUBLIC_API_URL in
    // Vercel Dashboard → Settings → Environment Variables (it's baked in at build time).
    return process.env.EXPO_PUBLIC_API_URL || window.location.origin;
  }

  // Native (iOS/Android): rely on build-time env vars
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  if (process.env.EXPO_PUBLIC_DOMAIN) {
    const domain = process.env.EXPO_PUBLIC_DOMAIN;
    const protocol = domain.includes('localhost') ? 'http' : 'https';
    return `${protocol}://${domain}`;
  }
  return 'http://localhost:5000';
}
