import { Platform } from 'react-native';

export function getApiUrl(): string {
  // Native: use env var or localhost fallback
  if (Platform.OS !== 'web') {
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

  // Web: use env var if set, otherwise derive from current origin
  if (typeof window !== 'undefined') {
    if (process.env.EXPO_PUBLIC_API_URL) {
      return process.env.EXPO_PUBLIC_API_URL;
    }
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:5000';
    }
    return window.location.origin;
  }

  return 'http://localhost:5000';
}
