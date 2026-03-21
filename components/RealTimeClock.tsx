import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colors } from "@/constants/colors";

export default function RealTimeClock() {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const formatDate = (date: Date) => {
        // Expected output: 21. Mar. 26
        const day = date.getDate().toString().padStart(2, '0');
        const month = date.toLocaleString('en-US', { month: 'short' });
        const year = date.getFullYear().toString().slice(-2);
        return `${day}. ${month}. ${year}`;
    };

    const formatTime = (date: Date) => {
        // Expected output: 19:32:26
        return date.toTimeString().split(' ')[0];
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
        marginRight: 10,
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
