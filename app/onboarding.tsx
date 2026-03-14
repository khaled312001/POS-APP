import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { useLicense } from '@/lib/license-context';
import { router } from 'expo-router';
import { apiRequest } from '@/lib/query-client';

export default function OnboardingScreen() {
    const { tenant, validateLicense } = useLicense();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Step 1: Identity
    const [businessName, setBusinessName] = useState(tenant?.name || "");
    const [ownerPhone, setOwnerPhone] = useState("");
    const [storeType, setStoreType] = useState(tenant?.storeType || "restaurant");

    // Step 2: Product & Category
    const [categoryName, setCategoryName] = useState("");
    const [productName, setProductName] = useState("");
    const [productPrice, setProductPrice] = useState("");

    // Step 3: Payments & Terms
    const [acceptedCash, setAcceptedCash] = useState(true);
    const [acceptedCard, setAcceptedCard] = useState(false);
    const [acceptedTerms, setAcceptedTerms] = useState(false);

    const handleNext = () => setStep(step + 1);
    const handleBack = () => setStep(step - 1);

    const handleComplete = async () => {
        if (!acceptedTerms) {
            Alert.alert("Error", "You must agree to the terms and conditions.");
            return;
        }

        setLoading(true);
        try {
            // 1. Create Category
            const catRes = await apiRequest("POST", "/api/categories", {
                name: categoryName || "General",
                tenantId: tenant?.id
            });
            const category = await catRes.json();

            // 2. Create First Product
            await apiRequest("POST", "/api/products", {
                name: productName || "Sample Product",
                categoryId: category.id,
                price: productPrice || "10",
                tenantId: tenant?.id
            });

            // 3. Complete Onboarding
            await apiRequest("POST", "/api/tenant/onboarding-complete", {
                tenantId: tenant?.id,
                businessName,
                ownerPhone,
                storeType,
            });

            // 4. Refresh license/tenant info
            const storedKey = await AsyncStorage.getItem("barmagly_license_key");
            if (storedKey) await validateLicense(storedKey);

            Alert.alert("Success", "Onboarding completed! Welcome to Barmagly POS.");
            router.replace("/(tabs)/products");
        } catch (err: any) {
            console.error("Onboarding error:", err);
            Alert.alert("Error", "Failed to complete onboarding: " + err.message);
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
                <Text style={styles.stepTitle}>
                    {step === 1 ? "Store Information" : step === 2 ? "Inventory Setup" : "Final Steps"}
                </Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {step === 1 && (
                    <View style={styles.stepContent}>
                        <Text style={styles.label}>Business Name</Text>
                        <TextInput
                            style={styles.input}
                            value={businessName}
                            onChangeText={setBusinessName}
                            placeholder="My Store"
                            placeholderTextColor={Colors.textMuted}
                        />

                        <Text style={styles.label}>Owner Phone</Text>
                        <TextInput
                            style={styles.input}
                            value={ownerPhone}
                            onChangeText={setOwnerPhone}
                            placeholder="+249..."
                            keyboardType="phone-pad"
                            placeholderTextColor={Colors.textMuted}
                        />

                        <Text style={styles.label}>Store Type</Text>
                        <View style={styles.typeGrid}>
                            {['restaurant', 'supermarket', 'pharmacy', 'others'].map(type => (
                                <TouchableOpacity
                                    key={type}
                                    style={[styles.typeBtn, storeType === type && styles.typeBtnActive]}
                                    onPress={() => setStoreType(type)}
                                >
                                    <Text style={[styles.typeText, storeType === type && styles.typeTextActive]}>{type}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                )}

                {step === 2 && (
                    <View style={styles.stepContent}>
                        <Text style={styles.label}>First Category</Text>
                        <TextInput
                            style={styles.input}
                            value={categoryName}
                            onChangeText={setCategoryName}
                            placeholder="e.g. Pizza, Drinks"
                            placeholderTextColor={Colors.textMuted}
                        />

                        <Text style={styles.label}>First Product Name</Text>
                        <TextInput
                            style={styles.input}
                            value={productName}
                            onChangeText={setProductName}
                            placeholder="e.g. Margherita Pizza"
                            placeholderTextColor={Colors.textMuted}
                        />

                        <Text style={styles.label}>Price</Text>
                        <TextInput
                            style={styles.input}
                            value={productPrice}
                            onChangeText={setProductPrice}
                            placeholder="0.00"
                            keyboardType="decimal-pad"
                            placeholderTextColor={Colors.textMuted}
                        />
                    </View>
                )}

                {step === 3 && (
                    <View style={styles.stepContent}>
                        <Text style={styles.label}>Payment Methods</Text>
                        <TouchableOpacity style={styles.row} onPress={() => setAcceptedCash(!acceptedCash)}>
                            <Ionicons name={acceptedCash ? "checkbox" : "square-outline"} size={24} color={Colors.accent} />
                            <Text style={styles.rowText}>Accept Cash</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.row} onPress={() => setAcceptedCard(!acceptedCard)}>
                            <Ionicons name={acceptedCard ? "checkbox" : "square-outline"} size={24} color={Colors.accent} />
                            <Text style={styles.rowText}>Accept Card (Online)</Text>
                        </TouchableOpacity>

                        <View style={styles.divider} />

                        <TouchableOpacity style={styles.row} onPress={() => setAcceptedTerms(!acceptedTerms)}>
                            <Ionicons name={acceptedTerms ? "checkbox" : "square-outline"} size={24} color={Colors.accent} />
                            <Text style={styles.rowText}>I agree to the Terms and Conditions</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>

            <View style={styles.footer}>
                {step > 1 && (
                    <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
                        <Text style={styles.backBtnText}>Back</Text>
                    </TouchableOpacity>
                )}

                <TouchableOpacity
                    style={styles.nextBtn}
                    onPress={step === 3 ? handleComplete : handleNext}
                    disabled={loading}
                >
                    {loading ? <ActivityIndicator color="#000" /> : (
                        <Text style={styles.nextBtnText}>{step === 3 ? "Launch Store" : "Continue"}</Text>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        padding: 24,
    },
    progressTrack: {
        height: 6,
        backgroundColor: Colors.surface,
        borderRadius: 3,
        marginBottom: 16,
    },
    progressBar: {
        height: '100%',
        backgroundColor: Colors.accent,
        borderRadius: 3,
    },
    stepTitle: {
        fontSize: 24,
        fontWeight: '900',
        color: Colors.white,
    },
    content: {
        padding: 24,
    },
    stepContent: {
        gap: 20,
    },
    label: {
        color: Colors.textSecondary,
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    input: {
        backgroundColor: Colors.surface,
        borderRadius: 12,
        padding: 16,
        color: Colors.white,
        fontSize: 16,
        borderWidth: 1,
        borderColor: Colors.cardBorder,
    },
    typeGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    typeBtn: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: Colors.cardBorder,
    },
    typeBtnActive: {
        backgroundColor: Colors.accent,
        borderColor: Colors.accent,
    },
    typeText: {
        color: Colors.textSecondary,
        textTransform: 'capitalize',
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
        color: Colors.white,
        fontSize: 16,
    },
    divider: {
        height: 1,
        backgroundColor: Colors.cardBorder,
        marginVertical: 10,
    },
    footer: {
        flexDirection: 'row',
        padding: 24,
        gap: 12,
    },
    backBtn: {
        flex: 1,
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.cardBorder,
    },
    backBtnText: {
        color: Colors.white,
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
});
