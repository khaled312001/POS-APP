import React, { useRef, useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { themedStyles } from "@/lib/themed-styles";
import { Ionicons } from '@expo/vector-icons';
import { useLicense } from '@/lib/license-context';
import { useLanguage } from '@/lib/language-context';
import { router } from 'expo-router';
import { apiRequest } from '@/lib/query-client';
import { showAlert, describeError } from '@/lib/alert';
import { parseAmountInput, roundMoney, moneyString, toLatinDigits } from '@/lib/money-input';
import { currencyLabel, formatAmount, getCurrency, isZeroDecimalCurrency } from '@/lib/currency';

const STORE_TYPES = ['restaurant', 'supermarket', 'pharmacy', 'others'] as const;

const COPY = {
    en: {
        types: { restaurant: 'Restaurant', supermarket: 'Supermarket', pharmacy: 'Pharmacy', others: 'Other' } as Record<string, string>,
        namePh: 'My Store',
        phonePh: 'Phone number',
        categoryPh: 'e.g. Drinks',
        productPh: 'e.g. Espresso',
        nameRequired: 'Please enter the business name.',
        priceRequired: 'Enter a valid price for the first product, or leave the product name empty.',
        optional: 'Optional — you can add products later in Products.',
        general: 'General',
        success: 'Setup complete. Welcome to Kassenta POS!',
        failed: 'Setup could not be completed. Your entries are kept — please try again.',
        step: (n: number) => `Step ${n} of 3`,
    },
    de: {
        types: { restaurant: 'Restaurant', supermarket: 'Supermarkt', pharmacy: 'Apotheke', others: 'Andere' } as Record<string, string>,
        namePh: 'Mein Geschäft',
        phonePh: 'Telefonnummer',
        categoryPh: 'z.B. Getränke',
        productPh: 'z.B. Espresso',
        nameRequired: 'Bitte den Geschäftsnamen eingeben.',
        priceRequired: 'Bitte einen gültigen Preis für das erste Produkt eingeben oder den Produktnamen leer lassen.',
        optional: 'Optional – Produkte können später unter Produkte erfasst werden.',
        general: 'Allgemein',
        success: 'Einrichtung abgeschlossen. Willkommen bei Kassenta POS!',
        failed: 'Die Einrichtung konnte nicht abgeschlossen werden. Ihre Eingaben bleiben erhalten – bitte erneut versuchen.',
        step: (n: number) => `Schritt ${n} von 3`,
    },
    ar: {
        types: { restaurant: 'مطعم', supermarket: 'سوبر ماركت', pharmacy: 'صيدلية', others: 'أخرى' } as Record<string, string>,
        namePh: 'متجري',
        phonePh: 'رقم الهاتف',
        categoryPh: 'مثال: مشروبات',
        productPh: 'مثال: قهوة',
        nameRequired: 'يرجى إدخال اسم المتجر.',
        priceRequired: 'أدخل سعراً صحيحاً للمنتج الأول، أو اترك اسم المنتج فارغاً.',
        optional: 'اختياري — يمكنك إضافة المنتجات لاحقاً من صفحة المنتجات.',
        general: 'عام',
        success: 'اكتمل الإعداد. مرحباً بك في Kassenta POS!',
        failed: 'تعذّر إكمال الإعداد. بياناتك محفوظة — حاول مرة أخرى.',
        step: (n: number) => `الخطوة ${n} من 3`,
    },
};

export default function OnboardingScreen() {
    const { tenant, validateLicense } = useLicense();
    const { t, language, isRTL } = useLanguage();
    const c = (COPY as any)[language] ?? COPY.en;
    const textAlign = isRTL ? ('right' as const) : ('left' as const);
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Step 1: Identity
    const [businessName, setBusinessName] = useState(tenant?.name || "");
    const [ownerPhone, setOwnerPhone] = useState("");
    const [storeType, setStoreType] = useState<string>(
        STORE_TYPES.includes((tenant?.storeType || "") as any) ? String(tenant?.storeType) : "restaurant",
    );

    // Step 2: Product & Category
    const [categoryName, setCategoryName] = useState("");
    const [productName, setProductName] = useState("");
    const [productPrice, setProductPrice] = useState("");

    // Step 3: Terms
    const [acceptedTerms, setAcceptedTerms] = useState(false);

    // A retry after a partial failure must not create the category/product twice.
    const createdCategoryId = useRef<number | null>(null);
    const createdProduct = useRef(false);

    const handleNext = () => {
        if (step === 1 && !businessName.trim()) {
            showAlert(t('error'), c.nameRequired);
            return;
        }
        if (step === 2 && productName.trim()) {
            const price = parseAmountInput(productPrice, getCurrency());
            if (!Number.isFinite(price) || price < 0) {
                showAlert(t('error'), c.priceRequired);
                return;
            }
        }
        setStep(step + 1);
    };
    const handleBack = () => setStep(step - 1);

    const handleComplete = async () => {
        if (loading) return;
        if (!acceptedTerms) {
            showAlert(t('error'), t('agreeTerms'));
            return;
        }
        if (!businessName.trim()) {
            setStep(1);
            showAlert(t('error'), c.nameRequired);
            return;
        }

        setLoading(true);
        try {
            const currency = getCurrency();
            // 1. Create Category
            if (createdCategoryId.current == null) {
                const catRes = await apiRequest("POST", "/api/categories", {
                    name: categoryName.trim() || c.general,
                    tenantId: tenant?.id
                });
                const category = await catRes.json();
                createdCategoryId.current = category?.id ?? null;
            }

            // 2. Create the first product — only when the owner named one.
            if (productName.trim() && !createdProduct.current && createdCategoryId.current != null) {
                const price = parseAmountInput(productPrice, currency);
                await apiRequest("POST", "/api/products", {
                    name: productName.trim(),
                    categoryId: createdCategoryId.current,
                    price: moneyString(Number.isFinite(price) ? roundMoney(price, currency) : 0, currency),
                    tenantId: tenant?.id
                });
                createdProduct.current = true;
            }

            // 3. Complete Onboarding
            await apiRequest("POST", "/api/tenant/onboarding-complete", {
                tenantId: tenant?.id,
                businessName: businessName.trim(),
                ownerPhone: toLatinDigits(ownerPhone).trim(),
                storeType,
            });

            // 4. Refresh license/tenant info
            const storedKey = await AsyncStorage.getItem("barmagly_license_key");
            if (storedKey) await validateLicense(storedKey);

            showAlert(t('success'), c.success);
            router.replace("/(tabs)/products");
        } catch (err: any) {
            console.error("Onboarding error:", err);
            showAlert(t('error'), describeError(err, language, c.failed));
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View style={styles.progressTrack}>
                    <View style={[styles.progressBar, { width: `${(step / 3) * 100}%` }]} />
                </View>
                <Text style={[styles.stepCounter, { textAlign }]}>{c.step(step)}</Text>
                <Text style={[styles.stepTitle, { textAlign }]}>
                    {step === 1 ? t('onboardingTitle1') : step === 2 ? t('onboardingTitle2') : t('onboardingTitle3')}
                </Text>
            </View>

            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                {step === 1 && (
                    <View style={styles.stepContent}>
                        <View>
                            <Text style={[styles.label, { textAlign }]}>{t('businessName')} *</Text>
                            <TextInput
                                style={[styles.input, { textAlign }]}
                                value={businessName}
                                onChangeText={setBusinessName}
                                placeholder={c.namePh}
                                placeholderTextColor={Colors.textMuted}
                                maxLength={80}
                            />
                        </View>

                        <View>
                            <Text style={[styles.label, { textAlign }]}>{t('ownerPhone')}</Text>
                            <TextInput
                                style={[styles.input, { textAlign }]}
                                value={ownerPhone}
                                onChangeText={(v) => setOwnerPhone(toLatinDigits(v))}
                                placeholder={c.phonePh}
                                keyboardType="phone-pad"
                                placeholderTextColor={Colors.textMuted}
                            />
                        </View>

                        <View>
                            <Text style={[styles.label, { textAlign }]}>{t('storeType')}</Text>
                            <View style={styles.typeGrid}>
                                {STORE_TYPES.map(type => (
                                    <TouchableOpacity
                                        key={type}
                                        style={[styles.typeBtn, storeType === type && styles.typeBtnActive]}
                                        onPress={() => setStoreType(type)}
                                        accessibilityRole="radio"
                                        accessibilityState={{ checked: storeType === type }}
                                    >
                                        <Text style={[styles.typeText, storeType === type && styles.typeTextActive]}>{c.types[type] || type}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    </View>
                )}

                {step === 2 && (
                    <View style={styles.stepContent}>
                        <Text style={[styles.hint, { textAlign }]}>{c.optional}</Text>
                        <View>
                            <Text style={[styles.label, { textAlign }]}>{t('firstCategory')}</Text>
                            <TextInput
                                style={[styles.input, { textAlign }]}
                                value={categoryName}
                                onChangeText={setCategoryName}
                                placeholder={c.categoryPh}
                                placeholderTextColor={Colors.textMuted}
                            />
                        </View>

                        <View>
                            <Text style={[styles.label, { textAlign }]}>{t('firstProduct')}</Text>
                            <TextInput
                                style={[styles.input, { textAlign }]}
                                value={productName}
                                onChangeText={setProductName}
                                placeholder={c.productPh}
                                placeholderTextColor={Colors.textMuted}
                            />
                        </View>

                        <View>
                            <Text style={[styles.label, { textAlign }]}>{t('productPrice')} ({currencyLabel()})</Text>
                            <TextInput
                                style={[styles.input, { textAlign }]}
                                value={productPrice}
                                onChangeText={setProductPrice}
                                placeholder={formatAmount(0)}
                                keyboardType={isZeroDecimalCurrency() ? "number-pad" : "decimal-pad"}
                                placeholderTextColor={Colors.textMuted}
                            />
                        </View>
                    </View>
                )}

                {step === 3 && (
                    <View style={styles.stepContent}>
                        <TouchableOpacity
                            style={styles.row}
                            onPress={() => setAcceptedTerms(!acceptedTerms)}
                            accessibilityRole="checkbox"
                            accessibilityState={{ checked: acceptedTerms }}
                        >
                            <Ionicons name={acceptedTerms ? "checkbox" : "square-outline"} size={26} color={Colors.accent} />
                            <Text style={[styles.rowText, { textAlign }]}>{t('agreeTerms')}</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>

            <View style={styles.footer}>
                {step > 1 && (
                    <TouchableOpacity style={styles.backBtn} onPress={handleBack} disabled={loading} accessibilityRole="button">
                        <Text style={styles.backBtnText}>{t('back')}</Text>
                    </TouchableOpacity>
                )}

                <TouchableOpacity
                    style={[styles.nextBtn, (loading || (step === 3 && !acceptedTerms)) && { opacity: 0.6 }]}
                    onPress={step === 3 ? handleComplete : handleNext}
                    disabled={loading}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: loading, busy: loading }}
                >
                    {loading ? <ActivityIndicator color={Colors.textDark} /> : (
                        <Text style={styles.nextBtnText}>{step === 3 ? t('launchStore') : t('continue')}</Text>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = themedStyles((Colors) => ({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        padding: 24,
        paddingBottom: 8,
        width: '100%',
        maxWidth: 640,
        alignSelf: 'center',
    },
    progressTrack: {
        height: 6,
        backgroundColor: Colors.surfaceLight,
        borderRadius: 3,
        marginBottom: 16,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        backgroundColor: Colors.accent,
        borderRadius: 3,
    },
    stepCounter: {
        color: Colors.textMuted,
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 4,
    },
    stepTitle: {
        fontSize: 24,
        fontWeight: '900',
        color: Colors.text,
    },
    content: {
        padding: 24,
        width: '100%',
        maxWidth: 640,
        alignSelf: 'center',
    },
    stepContent: {
        gap: 20,
    },
    hint: {
        color: Colors.textMuted,
        fontSize: 13,
        lineHeight: 19,
    },
    label: {
        color: Colors.textSecondary,
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    input: {
        backgroundColor: Colors.inputBg,
        borderRadius: 12,
        padding: 16,
        color: Colors.text,
        fontSize: 16,
        borderWidth: 1,
        borderColor: Colors.inputBorder,
    },
    typeGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    typeBtn: {
        minHeight: 44,
        justifyContent: 'center',
        paddingHorizontal: 20,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: Colors.cardBorder,
        backgroundColor: Colors.surface,
    },
    typeBtnActive: {
        backgroundColor: Colors.accent,
        borderColor: Colors.accent,
    },
    typeText: {
        color: Colors.textSecondary,
        fontWeight: '600',
    },
    typeTextActive: {
        color: Colors.textDark,
        fontWeight: '700',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
    },
    rowText: {
        flex: 1,
        color: Colors.text,
        fontSize: 16,
    },
    footer: {
        flexDirection: 'row',
        padding: 24,
        gap: 12,
        width: '100%',
        maxWidth: 640,
        alignSelf: 'center',
    },
    backBtn: {
        flex: 1,
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.cardBorder,
        backgroundColor: Colors.surface,
    },
    backBtnText: {
        color: Colors.text,
        fontSize: 16,
        fontWeight: '700',
    },
    nextBtn: {
        flex: 2,
        height: 56,
        borderRadius: 16,
        backgroundColor: Colors.accent,
        justifyContent: 'center',
        alignItems: 'center',
    },
    nextBtnText: {
        color: Colors.textDark,
        fontSize: 16,
        fontWeight: '900',
    }
}));
