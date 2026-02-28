import { Platform } from 'react-native';

export function getApiUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const hostname = window.location.hostname;

    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:5000';
    }

    if (hostname.includes('.replit.app')) {
      return window.location.origin;
    }

    if (hostname.includes('.worf.replit.dev') || hostname.includes('.kirk.replit.dev') || hostname.includes('.picard.replit.dev')) {
      return `https://${hostname}:5000`;
    }

    return window.location.origin;
  }

  if (process.env.EXPO_PUBLIC_DOMAIN) {
    const domain = process.env.EXPO_PUBLIC_DOMAIN;
    const protocol = domain.includes('localhost') ? 'http' : 'https';
    return `${protocol}://${domain}`;
  }

  return 'http://localhost:5000';
}
