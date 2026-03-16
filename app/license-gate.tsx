import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Animated, Platform, Linking, ScrollView, Dimensions, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLicense } from '@/lib/license-context';
import { Colors } from '@/constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';

import { useLanguage } from '@/lib/language-context';
import { makeRedirectUri } from 'expo-auth-session';



const WEBSITE_URL = 'https://pos.barmagly.tech/';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function LicenseGate() {
    const { isValidating, isValid, validateLicense, validateGoogleLogin, errorReason, deviceId } = useLicense();
    const [email, setEmail] = useState('');
    const [key, setKey] = useState('');
    const [loading, setLoading] = useState(false);
    const [focusedField, setFocusedField] = useState<string | null>(null);
    const router = useRouter();

    // Google Sign-In
    const [request, response, promptAsync] = Google.useAuthRequest({
        androidClientId: "852311970344-8q8a01gm3jip4k9vooljk8ttjpd30802.apps.googleusercontent.com",
        webClientId: "852311970344-8q8a01gm3jip4k9vooljk8ttjpd30802.apps.googleusercontent.com",
        redirectUri: Platform.OS === 'web'
            ? "https://pos.barmagly.tech/app"
            : makeRedirectUri({ scheme: 'barmagly' }),
    });

    const { t } = useLanguage();

    useEffect(() => {
        if (response?.type === 'success') {
            const { id_token } = response.params;
            if (id_token) {
                setLoading(true);
                validateGoogleLogin(id_token).finally(() => setLoading(false));
            }
        } else if (response?.type === 'error' || response?.type === 'cancel') {
            const details = (response as any).error?.message || response?.type;
            if (response?.type === 'error') {
                Alert.alert(t('error'), `Google Sign-In failed: ${details}`);
            }
        }
    }, [response]);

    // Animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;
    const iconScale = useRef(new Animated.Value(0.5)).current;
    const iconRotate = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: Platform.OS !== 'web',
            }),
            Animated.spring(slideAnim, {
                toValue: 0,
                tension: 60,
                friction: 12,
                useNativeDriver: Platform.OS !== 'web',
            }),
            Animated.spring(iconScale, {
                toValue: 1,
                tension: 80,
                friction: 8,
                useNativeDriver: Platform.OS !== 'web',
            }),
        ]).start();

        // Subtle pulse animation for the icon
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.05,
                    duration: 2000,
                    useNativeDriver: Platform.OS !== 'web',
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 2000,
                    useNativeDriver: Platform.OS !== 'web',
                }),
            ])
        ).start();
    }, []);

    const handleValidate = async () => {
        const cleanEmail = email.trim();
        const cleanKey = key.replace(/\s+/g, '').toUpperCase();

        if (!cleanEmail || !cleanKey) return;
        setLoading(true);
        await validateLicense(cleanKey, cleanEmail);
        setLoading(false);
    };

    useEffect(() => {
        if (isValid && !isValidating) {
            router.replace('/login');
        }
    }, [isValid, isValidating, router]);

    if (isValidating) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color={Colors.accent} />
                    <Text style={styles.loadingText}>Verifying Store Activation...</Text>
                </View>
            </View>
        );
    }

    // Wait for effect to route
    if (isValid) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <Animated.View style={[styles.successContainer, { transform: [{ scale: iconScale }] }]}>
                    <View style={styles.successIconBg}>
                        <Ionicons name="shield-checkmark" size={64} color={Colors.success} />
                    </View>
                    <Text style={styles.successText}>{t('success')}</Text>
                    <Text style={styles.successSubtext}>Redirecting to login...</Text>
                </Animated.View>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <Animated.View style={[
                    styles.content,
                    {
                        opacity: fadeAnim,
                        transform: [{ translateY: slideAnim }],
                    }
                ]}>
                    {/* Glowing Icon */}
                    <Animated.View style={[
                        styles.iconContainer,
                        { transform: [{ scale: pulseAnim }] }
                    ]}>
                        <View style={styles.iconGlow} />
                        <View style={styles.iconInner}>
                            <Ionicons name="key" size={40} color={Colors.accent} />
                        </View>
                    </Animated.View>

                    {/* Header */}
                    <Text style={styles.title}>{t('activateStore')}</Text>
                    <Text style={styles.subtitle}>
                        {t('activateStoreSubtitle').split(t('fourteenDayTrial'))[0]}
                        <Text style={styles.trialHighlight}>{t('fourteenDayTrial')}</Text>
                        {t('activateStoreSubtitle').split(t('fourteenDayTrial'))[1]}
                    </Text>

                    {/* Google Login Button */}
                    <TouchableOpacity
                        style={styles.googleButton}
                        onPress={() => promptAsync()}
                        disabled={!request || loading}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="logo-google" size={20} color="#fff" />
                        <Text style={styles.googleButtonText}>{t('signInWithGoogle')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.subscribeButton}
                        onPress={() => Linking.openURL(WEBSITE_URL)}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="star" size={20} color="#fff" />
                        <Text style={styles.subscribeButtonText}>{t('subscribeNow')}</Text>
                    </TouchableOpacity>

                    <View style={styles.orDivider}>
                        <View style={styles.orLine} />
                        <Text style={styles.orText}>{t('orUseLicenseKey')}</Text>
                        <View style={styles.orLine} />
                    </View>

                    {/* Error */}
                    {errorReason && (
                        <View style={styles.errorContainer}>
                            <Ionicons name="alert-circle" size={18} color={Colors.danger} />
                            <Text style={styles.errorText}>{errorReason}</Text>
                        </View>
                    )}

                    {/* Card Container */}
                    <View style={styles.formCard}>
                        {/* Email Input */}
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>
                                <Ionicons name="mail-outline" size={13} color={Colors.accent} /> {t('storeEmail')}
                            </Text>
                            <View style={[
                                styles.inputWrapper,
                                focusedField === 'email' && styles.inputWrapperFocused
                            ]}>
                                <TextInput
                                    style={styles.input}
                                    placeholder="store@example.com"
                                    placeholderTextColor={Colors.textMuted}
                                    value={email}
                                    onChangeText={setEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    onFocus={() => setFocusedField('email')}
                                    onBlur={() => setFocusedField(null)}
                                />
                            </View>
                        </View>

                        {/* License Key Input */}
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>
                                <Ionicons name="key-outline" size={13} color={Colors.accent} /> {t('licenseKey')}
                            </Text>
                            <View style={[
                                styles.inputWrapper,
                                focusedField === 'key' && styles.inputWrapperFocused
                            ]}>
                                <TextInput
                                    style={[styles.input, styles.inputKey]}
                                    placeholder="BARMAGLY-XXXX-XXXX-XXXX-XXXX"
                                    placeholderTextColor={Colors.textMuted}
                                    value={key}
                                    onChangeText={setKey}
                                    autoCapitalize="characters"
                                    autoCorrect={false}
                                    onFocus={() => setFocusedField('key')}
                                    onBlur={() => setFocusedField(null)}
                                />
                            </View>
                        </View>

                        {/* Activate Button */}
                        <TouchableOpacity
                            style={[
                                styles.button,
                                (!key.trim() || !email.trim() || loading) && styles.buttonDisabled
                            ]}
                            onPress={handleValidate}
                            disabled={!key.trim() || !email.trim() || loading}
                            activeOpacity={0.85}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <View style={styles.buttonContent}>
                                    <Ionicons name="rocket-outline" size={20} color="#fff" />
                                    <Text style={styles.buttonText}>{t('activateButton') || 'Activate Store'}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Device ID Info */}
                    <View style={styles.deviceInfo}>
                        <Ionicons name="finger-print-outline" size={14} color={Colors.textMuted} />
                        <Text style={styles.deviceInfoText}>
                            Device: {deviceId ? deviceId.substring(0, 12) + '...' : 'Detecting...'}
                        </Text>
                    </View>

                    {/* Help */}
                    <View style={styles.footer}>
                        <Ionicons name="help-circle-outline" size={14} color={Colors.textMuted} />
                        <Text style={styles.footerText}>Need help? Contact your store administrator.</Text>
                    </View>

                    {/* ── Subscription Instructions Section ── */}
                    <View style={styles.plansSection}>
                        <View style={styles.plansDivider}>
                            <View style={styles.plansDividerLine} />
                            <Text style={styles.plansDividerText}>{t('howToSubscribe')}</Text>
                            <View style={styles.plansDividerLine} />
                        </View>

                        <Text style={styles.plansSubheading}>
                            {t('howToSubscribeDesc')}
                        </Text>

                        <TouchableOpacity
                            style={styles.subscribeLink}
                            onPress={() => Linking.openURL(WEBSITE_URL)}
                        >
                            <Text style={styles.subscribeLinkText}>{WEBSITE_URL}</Text>
                            <Ionicons name="open-outline" size={16} color={Colors.accent} />
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
    },
    content: {
        width: '100%',
        maxWidth: 460,
        paddingHorizontal: 24,
        alignItems: 'center',
    },

    // ── Loader ──
    loaderContainer: {
        alignItems: 'center',
        gap: 16,
    },
    loadingText: {
        marginTop: 8,
        fontSize: 16,
        color: Colors.textSecondary,
        fontWeight: '500',
    },

    // ── Success ──
    successContainer: {
        alignItems: 'center',
        gap: 12,
    },
    successIconBg: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: `${Colors.success}15`,
        borderWidth: 2,
        borderColor: `${Colors.success}30`,
        justifyContent: 'center',
        alignItems: 'center',
    },
    successText: {
        marginTop: 8,
        fontSize: 28,
        fontWeight: '800',
        color: Colors.success,
        letterSpacing: -0.5,
    },
    successSubtext: {
        fontSize: 14,
        color: Colors.textMuted,
    },

    // ── Icon Container ──
    iconContainer: {
        width: 100,
        height: 100,
        marginBottom: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconGlow: {
        position: 'absolute',
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: `${Colors.accent}15`,
        ...(Platform.OS === 'web' ? {
            boxShadow: `0 0 40px ${Colors.accent}25, 0 0 80px ${Colors.accent}10`,
        } : {
            shadowColor: Colors.accent,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.3,
            shadowRadius: 30,
        }),
    },
    iconInner: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: `${Colors.accent}12`,
        borderWidth: 1.5,
        borderColor: `${Colors.accent}30`,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // ── Header ──
    title: {
        fontSize: 30,
        fontWeight: '800',
        color: Colors.text,
        marginBottom: 10,
        textAlign: 'center',
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 15,
        color: Colors.textMuted,
        marginBottom: 32,
        textAlign: 'center',
        lineHeight: 22,
        maxWidth: 360,
    },

    // ── Error ──
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: `${Colors.danger}12`,
        padding: 14,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: `${Colors.danger}25`,
        marginBottom: 24,
        width: '100%',
    },
    errorText: {
        color: Colors.danger,
        fontSize: 13,
        flex: 1,
        fontWeight: '500',
        lineHeight: 18,
    },
    trialHighlight: {
        color: Colors.accent,
        fontWeight: '700',
    },
    googleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        backgroundColor: '#4285F4',
        width: '100%',
        paddingVertical: 14,
        borderRadius: 14,
        marginBottom: 20,
        ...(Platform.OS === 'web' ? {
            boxShadow: '0 4px 12px rgba(66, 133, 244, 0.3)',
        } : {
            shadowColor: '#4285F4',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 4,
        }),
    },
    googleButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    orDivider: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        marginBottom: 20,
    },
    orLine: {
        flex: 1,
        height: 1,
        backgroundColor: Colors.cardBorder,
        opacity: 0.5,
    },
    orText: {
        fontSize: 11,
        fontWeight: '700',
        color: Colors.textMuted,
        letterSpacing: 1,
    },

    // ── Form Card ──
    formCard: {
        width: '100%',
        backgroundColor: `${Colors.surface}`,
        borderRadius: 20,
        padding: 24,
        borderWidth: 1,
        borderColor: Colors.cardBorder,
        ...(Platform.OS === 'web' ? {
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        } : {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.3,
            shadowRadius: 24,
            elevation: 8,
        }),
    },

    // ── Input ──
    inputContainer: {
        width: '100%',
        marginBottom: 20,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.textSecondary,
        marginBottom: 8,
        letterSpacing: 0.3,
    },
    inputWrapper: {
        borderWidth: 1.5,
        borderColor: Colors.inputBorder,
        borderRadius: 14,
        backgroundColor: Colors.inputBg,
        overflow: 'hidden',
    },
    inputWrapperFocused: {
        borderColor: Colors.accent,
        backgroundColor: `${Colors.accent}08`,
        ...(Platform.OS === 'web' ? {
            boxShadow: `0 0 0 3px ${Colors.accent}15`,
        } : {}),
    },
    input: {
        padding: 15,
        fontSize: 15,
        color: Colors.text,
        textAlign: 'left',
    },
    inputKey: {
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
        textAlign: 'center',
        letterSpacing: 2,
        fontSize: 14,
    },

    // ── Button ──
    button: {
        width: '100%',
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 4,
        backgroundColor: Colors.accent,
        ...(Platform.OS === 'web' ? {
            boxShadow: `0 8px 24px ${Colors.accent}30`,
        } : {
            shadowColor: Colors.accent,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.3,
            shadowRadius: 12,
            elevation: 6,
        }),
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.3,
    },

    // ── Device Info ──
    deviceInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 20,
        paddingVertical: 8,
        paddingHorizontal: 14,
        backgroundColor: `${Colors.surface}80`,
        borderRadius: 100,
        borderWidth: 1,
        borderColor: Colors.cardBorder,
    },
    deviceInfoText: {
        fontSize: 11,
        color: Colors.textMuted,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },

    // ── Footer ──
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 16,
    },
    footerText: {
        color: Colors.textMuted,
        fontSize: 12,
    },

    // ── Plans Section ──
    plansSection: {
        width: '100%',
        marginTop: 16,
        paddingBottom: 24,
    },
    plansDivider: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginVertical: 32,
        width: '100%',
    },
    plansDividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: Colors.cardBorder,
    },
    plansDividerText: {
        fontSize: 12,
        fontWeight: '700',
        color: Colors.textMuted,
        letterSpacing: 2,
    },
    plansHeading: {
        fontSize: 20,
        fontWeight: '800',
        color: Colors.text,
        textAlign: 'center',
        marginBottom: 8,
        letterSpacing: -0.3,
    },
    plansSubheading: {
        fontSize: 13,
        color: Colors.textMuted,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 19,
    },
    planCards: {
        flexDirection: SCREEN_WIDTH > 600 ? 'row' : 'column',
        gap: 14,
        marginBottom: 24,
    },
    planCard: {
        flex: 1,
        backgroundColor: Colors.surface,
        borderRadius: 18,
        padding: 20,
        borderWidth: 1,
        borderColor: Colors.cardBorder,
    },
    planCardAdvanced: {
        borderColor: Colors.primary + '50',
        backgroundColor: Colors.primary + '08',
    },
    planBadge: {
        backgroundColor: Colors.success + '18',
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 4,
        alignSelf: 'flex-start',
        marginBottom: 12,
    },
    planBadgeAdvanced: {
        backgroundColor: Colors.primary + '18',
    },
    planBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: Colors.text,
    },
    planName: {
        fontSize: 14,
        fontWeight: '800',
        color: Colors.text,
        marginBottom: 8,
    },
    planPrice: {
        marginBottom: 14,
    },
    planPriceCurrency: {
        fontSize: 12,
        color: Colors.textMuted,
        fontWeight: '600',
    },
    planPriceAmount: {
        fontSize: 28,
        fontWeight: '900',
        color: Colors.accent,
    },
    planPricePeriod: {
        fontSize: 12,
        color: Colors.textMuted,
    },
    planFeatures: {
        gap: 8,
    },
    planFeatureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    planFeatureText: {
        fontSize: 12,
        color: Colors.textMuted,
        flex: 1,
    },
    subscribeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.primary,
        borderRadius: 14,
        paddingVertical: 16,
        paddingHorizontal: 24,
        width: '100%',
        marginBottom: 14,
        ...(Platform.OS === 'web' ? {
            boxShadow: `0 8px 24px ${Colors.primary}30`,
        } : {
            shadowColor: Colors.primary,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.3,
            shadowRadius: 12,
            elevation: 4,
        }),
    },
    subscribeButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: 0.3,
    },
    plansNote: {
        fontSize: 12,
        color: Colors.textMuted,
        textAlign: 'center',
        lineHeight: 18,
    },
    subscribeLink: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 12,
        padding: 12,
        backgroundColor: `${Colors.accent}15`,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: `${Colors.accent}30`,
    },
    subscribeLinkText: {
        color: Colors.accent,
        fontSize: 14,
        fontWeight: '700',
        textDecorationLine: 'underline',
    },
});
