import { Platform } from 'react-native';

// Extracts the daily sequential number from stored format "{scopeId}-{YYYYMMDD}-{N}"
// e.g. "5-20260328-7" -> "7", old format "RCP-xxx" -> "RCP-xxx"
export function getDisplayNumber(receiptOrOrderNumber: string | undefined | null): string {
  if (!receiptOrOrderNumber) return "";
  const match = receiptOrOrderNumber.match(/-(\d+)$/);
  return match ? match[1] : receiptOrOrderNumber;
}

export function getApiUrl(): string {
  // Always respect an explicitly set API URL across all platforms
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // Handle mobile platform logic
  if (Platform.OS !== 'web') {
    if (process.env.EXPO_PUBLIC_DOMAIN) {
      const domain = process.env.EXPO_PUBLIC_DOMAIN;
      const protocol = domain.includes('localhost') ? 'http' : 'https';
      return `${protocol}://${domain}`;
    }
    return 'http://localhost:5000';
  }

  // Handle web platform logic
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    // Local dev
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:5000';
    }
    // Replit dev
    if (hostname.includes('.replit.dev')) {
      return `https://${hostname}:5000`;
    }
    // For production where the frontend is static (e.g. Vercel), 
    // window.location.origin would point back to Vercel (which returns index.html on API routes).
    // So if process.env.EXPO_PUBLIC_API_URL wasn't set, we fall back to the origin.
    // Ensure you add EXPO_PUBLIC_API_URL in your Vercel Environment Variables pointing to your backend!
    return window.location.origin;
  }

  return 'http://localhost:5000';
}
