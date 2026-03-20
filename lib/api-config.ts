import { Platform } from 'react-native';

export function getApiUrl(): string {
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

  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:5000';
    }
    // On Replit dev, Expo Metro sometimes opens on a .replit.dev subdomain directly
    if (hostname.includes('.replit.dev')) {
      return `https://${hostname}:5000`;
    }
    // For all other web environments (production domain, workspace URL, etc.)
    // always use the current page origin so API calls go to the same server
    // that served the page — this works correctly for both dev and production.
    return window.location.origin;
  }

  return 'http://localhost:5000';
}
