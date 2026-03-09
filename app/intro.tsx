import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TouchableOpacity, Animated, ScrollView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '@/lib/language-context';

type Lang = 'en' | 'ar' | 'de';

const LANGUAGES: { code: Lang; flag: string; label: string; nativeLabel: string }[] = [
    { code: 'en', flag: '🇬🇧', label: 'English', nativeLabel: 'English' },
    { code: 'ar', flag: '🇸🇦', label: 'Arabic', nativeLabel: 'العربية' },
    { code: 'de', flag: '🇩🇪', label: 'German', nativeLabel: 'Deutsch' },
];

const CONTENT: Record<Lang, { welcome: string; brand: string; subtitle: string; start: string; features: { icon: string; text: string }[] }> = {
    en: {
        welcome: 'Welcome to',
        brand: 'Barmagly POS',
        subtitle: 'Smart point-of-sale for modern businesses.',
        start: 'Get Started',
        features: [
            { icon: 'cart-outline', text: 'Fast Checkout' },
            { icon: 'people-outline', text: 'Multi-Staff' },
            { icon: 'stats-chart-outline', text: 'Live Reports' },
        ],
    },
    ar: {
        welcome: 'مرحباً بك في',
        brand: 'برمجلي POS',
        subtitle: 'نقطة بيع ذكية للأعمال الحديثة.',
        start: 'ابدأ الآن',
        features: [
            { icon: 'cart-outline', text: 'دفع سريع' },
            { icon: 'people-outline', text: 'متعدد الموظفين' },
            { icon: 'stats-chart-outline', text: 'تقارير مباشرة' },
        ],
    },
    de: {
        welcome: 'Willkommen bei',
        brand: 'Barmagly POS',
        subtitle: 'Smartes Kassensystem für moderne Unternehmen.',
        start: 'Loslegen',
        features: [
            { icon: 'cart-outline', text: 'Schneller Checkout' },
            { icon: 'people-outline', text: 'Multi-Personal' },
            { icon: 'stats-chart-outline', text: 'Live-Berichte' },
        ],
    },
};

export default function IntroScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { language, setLanguage, isRTL, rtlText } = useLanguage();

    const handleStart = async () => {
        await AsyncStorage.setItem('hasSeenIntro', 'true');
        router.replace('/license-gate');
    };

    const content = CONTENT[language as Lang] ?? CONTENT.en;

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#0A0E27', '#1a1060', '#0f2a60']}
                style={styles.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                {/* Decorative circles */}
                <View style={styles.circle1} />
                <View style={styles.circle2} />
                <View style={styles.circle3} />

                <ScrollView
                    contentContainerStyle={[styles.scrollContent, { paddingTop: Math.max(insets.top + 16, 32), paddingBottom: Math.max(insets.bottom + 24, 32) }]}
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                >
                    {/* Header area */}
                    <View style={styles.header}>
                        <View style={styles.logoRow}>
                            <LinearGradient
                                colors={[Colors.primary, Colors.secondary]}
                                style={styles.logoBadge}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            >
                                <Ionicons name="storefront" size={24} color={Colors.white} />
                            </LinearGradient>
                            <Text style={styles.logoName}>Barmagly</Text>
                        </View>
                    </View>

                    {/* Hero icon */}
                    <View style={styles.heroIconContainer}>
                        <LinearGradient
                            colors={[Colors.primary, Colors.secondary, Colors.accent]}
                            style={styles.heroIconGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <Ionicons name="storefront" size={56} color={Colors.white} />
                        </LinearGradient>
                        <View style={styles.heroIconGlow} />
                    </View>

                    {/* Hero text */}
                    <Text style={[styles.welcomeText, rtlText]}>{content.welcome}</Text>
                    <Text style={[styles.brandText, rtlText]}>{content.brand}</Text>
                    <Text style={[styles.subtitle, rtlText]}>{content.subtitle}</Text>

                    {/* Feature pills */}
                    <View style={[styles.featuresRow, isRTL && { flexDirection: 'row-reverse' }]}>
                        {content.features.map((f, i) => (
                            <View key={i} style={styles.featurePill}>
                                <Ionicons name={f.icon as any} size={14} color={Colors.accent} />
                                <Text style={styles.featurePillText}>{f.text}</Text>
                            </View>
                        ))}
                    </View>

                    {/* Divider */}
                    <View style={styles.divider} />

                    {/* Language switcher */}
                    <View style={styles.languageSection}>
                        <Text style={styles.languageSectionLabel}>
                            {language === 'ar' ? 'اختر اللغة' : language === 'de' ? 'Sprache wählen' : 'Select Language'}
                        </Text>
                        <View style={styles.languageList}>
                            {LANGUAGES.map((lang) => {
                                const selected = language === lang.code;
                                return (
                                    <TouchableOpacity
                                        key={lang.code}
                                        onPress={() => setLanguage(lang.code)}
                                        style={[styles.languageOption, selected && styles.languageOptionSelected]}
                                        activeOpacity={0.7}
                                    >
                                        {selected && (
                                            <LinearGradient
                                                colors={[Colors.primary, Colors.secondary]}
                                                style={StyleSheet.absoluteFillObject}
                                                start={{ x: 0, y: 0 }}
                                                end={{ x: 1, y: 1 }}
                                                borderRadius={14}
                                            />
                                        )}
                                        <Text style={styles.languageFlag}>{lang.flag}</Text>
                                        <Text style={[styles.languageNativeLabel, selected && styles.languageNativeLabelSelected]}>
                                            {lang.nativeLabel}
                                        </Text>
                                        {selected && (
                                            <View style={styles.languageCheck}>
                                                <Ionicons name="checkmark-circle" size={16} color={Colors.white} />
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>

                    {/* Get Started button */}
                    <Pressable
                        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
                        onPress={handleStart}
                    >
                        <LinearGradient
                            colors={[Colors.primary, Colors.secondary]}
                            style={styles.buttonGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        >
                            {isRTL ? (
                                <>
                                    <Ionicons name="arrow-back" size={22} color={Colors.white} style={{ marginLeft: 10 }} />
                                    <Text style={[styles.buttonText, rtlText]}>{content.start}</Text>
                                </>
                            ) : (
                                <>
                                    <Text style={styles.buttonText}>{content.start}</Text>
                                    <Ionicons name="arrow-forward" size={22} color={Colors.white} style={{ marginLeft: 10 }} />
                                </>
                            )}
                        </LinearGradient>
                    </Pressable>

                    <Text style={styles.footerNote}>© 2025 Barmagly · v1.0</Text>
                </ScrollView>
            </LinearGradient>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0A0E27',
    },
    gradient: {
        flex: 1,
        overflow: 'hidden',
    },
    scrollContent: {
        alignItems: 'center',
        paddingHorizontal: 24,
    },

    /* Decorative background circles */
    circle1: {
        position: 'absolute',
        width: 340,
        height: 340,
        borderRadius: 170,
        backgroundColor: 'rgba(30, 64, 175, 0.18)',
        top: -80,
        right: -80,
    },
    circle2: {
        position: 'absolute',
        width: 260,
        height: 260,
        borderRadius: 130,
        backgroundColor: 'rgba(124, 58, 237, 0.14)',
        bottom: 200,
        left: -60,
    },
    circle3: {
        position: 'absolute',
        width: 180,
        height: 180,
        borderRadius: 90,
        backgroundColor: 'rgba(47, 211, 198, 0.10)',
        bottom: 40,
        right: 20,
    },

    /* Header */
    header: {
        width: '100%',
        marginBottom: 28,
    },
    logoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    logoBadge: {
        width: 42,
        height: 42,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoName: {
        fontSize: 22,
        fontWeight: '800',
        color: Colors.white,
        letterSpacing: 0.5,
    },

    /* Hero */
    heroIconContainer: {
        position: 'relative',
        marginBottom: 24,
    },
    heroIconGradient: {
        width: 110,
        height: 110,
        borderRadius: 34,
        justifyContent: 'center',
        alignItems: 'center',
    },
    heroIconGlow: {
        position: 'absolute',
        width: 110,
        height: 110,
        borderRadius: 34,
        backgroundColor: Colors.primary,
        opacity: 0.25,
        top: 8,
        left: 0,
        zIndex: -1,
    },
    welcomeText: {
        fontSize: 17,
        fontWeight: '400',
        color: 'rgba(255,255,255,0.65)',
        textAlign: 'center',
        marginBottom: 4,
    },
    brandText: {
        fontSize: 34,
        fontWeight: '900',
        color: Colors.white,
        textAlign: 'center',
        marginBottom: 10,
        letterSpacing: 0.5,
    },
    subtitle: {
        fontSize: 14,
        lineHeight: 21,
        color: 'rgba(255,255,255,0.6)',
        textAlign: 'center',
        marginBottom: 20,
        maxWidth: 300,
    },
    featuresRow: {
        flexDirection: 'row',
        gap: 8,
        flexWrap: 'wrap',
        justifyContent: 'center',
        marginBottom: 8,
    },
    featurePill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: 'rgba(47, 211, 198, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(47, 211, 198, 0.25)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    featurePillText: {
        color: Colors.accent,
        fontSize: 12,
        fontWeight: '600',
    },

    /* Divider */
    divider: {
        width: '80%',
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.08)',
        marginVertical: 24,
    },

    /* Language switcher */
    languageSection: {
        width: '100%',
        marginBottom: 24,
    },
    languageSectionLabel: {
        color: 'rgba(255,255,255,0.45)',
        fontSize: 11,
        fontWeight: '600',
        textAlign: 'center',
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        marginBottom: 14,
    },
    languageList: {
        flexDirection: 'row',
        gap: 10,
        justifyContent: 'center',
    },
    languageOption: {
        flex: 1,
        maxWidth: 120,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 10,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.12)',
        backgroundColor: 'rgba(255,255,255,0.05)',
        gap: 6,
        position: 'relative',
        overflow: 'hidden',
    },
    languageOptionSelected: {
        borderColor: Colors.primary,
    },
    languageFlag: {
        fontSize: 26,
    },
    languageNativeLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.55)',
    },
    languageNativeLabelSelected: {
        color: Colors.white,
        fontWeight: '700',
    },
    languageCheck: {
        position: 'absolute',
        top: 8,
        right: 8,
    },

    /* Button */
    button: {
        width: '100%',
        maxWidth: 420,
        borderRadius: 16,
        overflow: 'hidden',
        elevation: 12,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.5,
        shadowRadius: 16,
        marginBottom: 16,
    },
    buttonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 17,
        paddingHorizontal: 32,
    },
    buttonPressed: {
        opacity: 0.85,
        transform: [{ scale: 0.98 }],
    },
    buttonText: {
        color: Colors.white,
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    footerNote: {
        color: 'rgba(255,255,255,0.25)',
        fontSize: 12,
    },
});
