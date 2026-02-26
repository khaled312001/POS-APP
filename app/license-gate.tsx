import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Image, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLicense } from '@/lib/license-context';
import { Colors } from '@/constants/colors';
import { ShieldAlert, ShieldCheck } from 'lucide-react-native';

export default function LicenseGate() {
    const { isValidating, isValid, validateLicense, errorReason, deviceId } = useLicense();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [key, setKey] = useState('');
    const [loading, setLoading] = useState(false);

    const handleValidate = async () => {
        if (!email.trim() || !password.trim() || !key.trim()) return;
        setLoading(true);
        await validateLicense(key.trim(), email.trim(), password.trim());
        setLoading(false);
    };

    if (isValidating) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.loadingText}>Verifying Store Activation...</Text>
            </View>
        );
    }

    // If valid, the router will handle redirect in _layout.tsx, but just in case:
    if (isValid) {
        return (
            <View style={styles.container}>
                <ShieldCheck size={64} color={Colors.success} />
                <Text style={styles.successText}>Store Activated</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <View style={styles.iconContainer}>
                    <ShieldAlert size={64} color={Colors.primary} />
                </View>

                <Text style={styles.title}>Barmagly Activation</Text>
                <Text style={styles.subtitle}>Enter your store credentials and license key.</Text>

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
                    <Text style={styles.footerText}>Device ID: {deviceId}</Text>
                    <Text style={styles.footerText}>Need help? Contact support.</Text>
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
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
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
