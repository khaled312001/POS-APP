import React from 'react';
import { View, Text, StyleSheet, Pressable, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '@/lib/language-context';

export default function IntroScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { language, setLanguage, isRTL, rtlText } = useLanguage();

    const handleStart = async () => {
        await AsyncStorage.setItem('hasSeenIntro', 'true');
        router.replace('/license-gate');
    };

    const toggleLanguage = () => {
        setLanguage(language === 'en' ? 'ar' : 'en');
    };

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]}
                style={[styles.gradient, { paddingBottom: insets.bottom }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <TouchableOpacity
                    onPress={toggleLanguage}
                    style={[styles.langButton, { top: Math.max(insets.top + 16, 40) }]}
                >
                    <Ionicons name="language" size={20} color={Colors.white} />
                    <Text style={styles.langText}>{language === 'en' ? 'عربي' : 'English'}</Text>
                </TouchableOpacity>

                <View style={styles.content}>
                    <View style={styles.iconContainer}>
                        <Ionicons name="storefront" size={80} color={Colors.white} />
                    </View>
                    <Text style={[styles.title, rtlText]}>
                        {language === 'en' ? 'Welcome' : 'مرحباً'}
                    </Text>
                    <Text style={[styles.subtitle, rtlText]}>
                        {language === 'en'
                            ? 'Activate your store to get started.'
                            : 'قم بتفعيل متجرك للبدء.'}
                    </Text>
                </View>

                <View style={styles.footer}>
                    <Pressable
                        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed, isRTL ? { flexDirection: 'row-reverse' } : {}]}
                        onPress={handleStart}
                    >
                        <Text style={[styles.buttonText, rtlText, isRTL ? { marginLeft: 8 } : { marginRight: 8 }]}>
                            {language === 'en' ? 'Get Started' : 'البدء'}
                        </Text>
                        <Ionicons name={isRTL ? "arrow-back" : "arrow-forward"} size={20} color={Colors.background} />
                    </Pressable>
                </View>
            </LinearGradient>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.surface,
    },
    gradient: {
        flex: 1,
        justifyContent: 'space-between',
    },
    langButton: {
        position: 'absolute',
        right: 24,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        zIndex: 10,
    },
    langText: {
        color: Colors.white,
        marginLeft: 8,
        fontWeight: '600',
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
        paddingTop: 40,
    },
    iconContainer: {
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 40,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    title: {
        fontSize: 40,
        fontWeight: '800',
        color: Colors.white,
        marginBottom: 16,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        lineHeight: 24,
        color: 'rgba(255,255,255,0.8)',
        textAlign: 'center',
    },
    footer: {
        paddingHorizontal: 32,
        paddingBottom: 40,
        alignItems: 'center',
    },
    button: {
        backgroundColor: Colors.white,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        maxWidth: 400,
        paddingVertical: 18,
        borderRadius: 16,
        elevation: 8,
    },
    buttonPressed: {
        opacity: 0.8,
        transform: [{ scale: 0.98 }],
    },
    buttonText: {
        color: Colors.background,
        fontSize: 18,
        fontWeight: '700',
    },
});
