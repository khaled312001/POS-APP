import { Platform } from 'react-native';

/**
 * Shared logic to determine the API URL for both license validation and general API requests.
 */
export function getApiUrl(): string {
    // If explicitly set in environment
    if (process.env.EXPO_PUBLIC_API_URL) {
        return process.env.EXPO_PUBLIC_API_URL;
    }

    if (process.env.EXPO_PUBLIC_DOMAIN) {
        const protocol = process.env.EXPO_PUBLIC_DOMAIN.includes('localhost') ? 'http' : 'https';
        return `${protocol}://${process.env.EXPO_PUBLIC_DOMAIN}`;
    }

    // Fallback for local development
    if (Platform.OS === 'web') {
        return "http://localhost:5000";
    }

    // Fallback for physical devices (updated with user's specific local IP if known, otherwise localhost)
    return "http://localhost:5000";
}
