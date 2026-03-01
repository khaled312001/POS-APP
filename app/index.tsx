import { useEffect, useState, useRef } from "react";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLicense } from "@/lib/license-context";
import { View, ActivityIndicator } from "react-native";
import { Colors } from "@/constants/colors";

export default function IndexScreen() {
    const router = useRouter();
    const { isValid, isValidating } = useLicense();
    const [hasSeenIntro, setHasSeenIntro] = useState<boolean | null>(null);
    const hasRouted = useRef(false);

    useEffect(() => {
        async function checkIntro() {
            try {
                const seen = await AsyncStorage.getItem("hasSeenIntro");
                setHasSeenIntro(seen === "true");
            } catch {
                setHasSeenIntro(false);
            }
        }
        checkIntro();
    }, []);

    useEffect(() => {
        if (isValidating || hasSeenIntro === null || hasRouted.current) return;

        setTimeout(async () => {
            hasRouted.current = true;

            if (!hasSeenIntro) {
                router.replace("/intro" as any);
                return;
            }

            if (isValid === false) {
                router.replace("/license-gate" as any);
                return;
            }

            // License is valid – check if an employee session is already saved
            try {
                const saved = await AsyncStorage.getItem("barmagly_employee");
                if (saved) {
                    router.replace("/(tabs)" as any);
                    return;
                }
            } catch {
                // ignore AsyncStorage errors
            }

            router.replace("/login" as any);
        }, 0);
    }, [isValidating, hasSeenIntro, isValid, router]);

    return (
        <View style={{ flex: 1, backgroundColor: Colors.surface, justifyContent: "center", alignItems: "center" }}>
            <ActivityIndicator size="large" color={Colors.primary} />
        </View>
    );
}
