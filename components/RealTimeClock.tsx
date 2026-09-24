import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useLanguage } from "@/lib/language-context";

export default function RealTimeClock() {
    const { language } = useLanguage();
    const locale = language === "ar" ? "ar-SY-u-nu-latn" : language === "de" ? "de-CH" : "en-GB";
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const formatDate = (date: Date) => {
        // Expected output: 21. Mar. 26 (month name in the UI language; the
        // device clock/timezone is the store's own, e.g. Asia/Damascus)
        const day = date.getDate().toString().padStart(2, '0');
        let month: string;
        try { month = date.toLocaleString(locale, { month: 'short' }); }
        catch { month = date.toLocaleString('en-GB', { month: 'short' }); }
        const year = date.getFullYear().toString().slice(-2);
        return language === "ar" ? `${day} ${month} ${year}` : `${day}. ${month.replace(/\.$/, "")}. ${year}`;
    };

    const formatTime = (date: Date) => {
        // Expected output: 19:32:26
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    };

    return (
        <View style={styles.container}>
            <View style={styles.displayRow}>
                <Text style={styles.dateText}>{formatDate(time)}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.displayRow}>
                <Text style={styles.timeText}>{formatTime(time)}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#000000',
        borderWidth: 2,
        borderColor: '#7a858e',
        borderRadius: 4,
        paddingVertical: 4,
        paddingHorizontal: 8,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.8,
        shadowRadius: 2,
        elevation: 3,
    },
    displayRow: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    divider: {
        height: 1,
        width: '100%',
        backgroundColor: '#333333',
        marginVertical: 2,
    },
    dateText: {
        color: '#ff0000',
        fontSize: 14,
        fontWeight: 'bold',
        fontFamily: 'Courier New', // Using a monospace font to look like digital clock
    },
    timeText: {
        color: '#ffff00',
        fontSize: 15,
        fontWeight: 'bold',
        fontFamily: 'Courier New',
    },
});
