import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Image, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLicense } from '@/lib/license-context';
import { Colors } from '@/constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function LicenseGate() {
    const { isValidating, isValid, validateLicense, errorReason, deviceId } = useLicense();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [key, setKey] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleValidate = async () => {
        const cleanEmail = email.trim();
        const cleanPassword = password.trim();
        const cleanKey = key.replace(/\s+/g, '').toUpperCase();

        if (!cleanEmail || !cleanPassword || !cleanKey) return;
        setLoading(true);
        await validateLicense(cleanKey, cleanEmail, cleanPassword);
        setLoading(false);
    };

    useEffect(() => {
        if (isValid && !isValidating) {
            router.replace('/login');
        }
    }, [isValid, isValidating, router]);

    if (isValidating) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.loadingText}>Verifying Store Activation...</Text>
            </View>
        );
    }

    // Wait for effect to route
    if (isValid) {
        return (
            <View style={styles.container}>
                <Ionicons name="shield-checkmark" size={64} color={Colors.success} />
                <Text style={styles.successText}>Store Activated. Redirecting...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <View style={styles.iconContainer}>
                    <Ionicons name="shield-outline" size={64} color={Colors.primary} />
                </View>

                <Text style={styles.title}>Store Activation</Text>
                <Text style={styles.subtitle}>Enter your store credentials and license key to get started.</Text>

                {errorReason && (
                    <View style={styles.errorContainer}>
                        <Text style={styles.errorText}>{errorReason}</Text>
                    </View>
                )}

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Store Email</Text>
                    <TextInput
                        style={styles.inputRegular}
                        placeholder="store@example.com"
                        placeholderTextColor={Colors.textMuted}
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Store Password</Text>
                    <TextInput
                        style={styles.inputRegular}
                        placeholder="••••••••"
                        placeholderTextColor={Colors.textMuted}
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>License Key</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="BARMAGLY-XXXX-XXXX-XXXX-XXXX"
                        placeholderTextColor={Colors.textMuted}
                        value={key}
                        onChangeText={setKey}
                        autoCapitalize="characters"
                        autoCorrect={false}
                    />
                </View>

                <TouchableOpacity
                    style={[styles.button, (!key.trim() || !email.trim() || !password.trim() || loading) && styles.buttonDisabled]}
                    onPress={handleValidate}
                    disabled={!key.trim() || !email.trim() || !password.trim() || loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.buttonText}>Activate Store</Text>
                    )}
                </TouchableOpacity>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>Need help? Contact your store administrator.</Text>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        width: '100%',
        maxWidth: 400,
        padding: 24,
        alignItems: 'center',
    },
    iconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: `${Colors.primary}15`,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: Colors.textMuted,
        marginBottom: 32,
        textAlign: 'center',
    },
    errorContainer: {
        backgroundColor: `${Colors.danger}15`,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: `${Colors.danger}30`,
        marginBottom: 24,
        width: '100%',
    },
    errorText: {
        color: Colors.danger,
        fontSize: 14,
        textAlign: 'center',
        fontWeight: '500',
    },
    inputContainer: {
        width: '100%',
        marginBottom: 24,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: 8,
    },
    input: {
        backgroundColor: Colors.card,
        borderWidth: 1,
        borderColor: Colors.inputBorder,
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: Colors.text,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
        textAlign: 'center',
        letterSpacing: 2,
    },
    inputRegular: {
        backgroundColor: Colors.card,
        borderWidth: 1,
        borderColor: Colors.inputBorder,
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: Colors.text,
        textAlign: 'left',
    },
    button: {
        backgroundColor: Colors.primary,
        width: '100%',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: "0px 4px 8px rgba(124, 58, 237, 0.2)",
        elevation: 4,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    footer: {
        marginTop: 48,
        alignItems: 'center',
    },
    footerText: {
        color: Colors.textMuted,
        fontSize: 12,
        marginBottom: 4,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: Colors.text,
    },
    successText: {
        marginTop: 16,
        fontSize: 24,
        fontWeight: '700',
        color: Colors.success,
    }
});
