import { Link, Stack } from "expo-router";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { useLanguage } from "@/lib/language-context";
import { themedStyles } from "@/lib/themed-styles";

const COPY = {
  en: { title: "Page not found", subtitle: "The screen you're looking for doesn't exist.", home: "Go to home" },
  de: { title: "Seite nicht gefunden", subtitle: "Die gesuchte Seite existiert nicht.", home: "Zur Startseite" },
  ar: { title: "الصفحة غير موجودة", subtitle: "الصفحة التي تبحث عنها غير موجودة.", home: "العودة إلى الرئيسية" },
};

export default function NotFoundScreen() {
  const { language } = useLanguage();
  const c = (COPY as any)[language] ?? COPY.en;
  return (
    <>
      <Stack.Screen options={{ title: c.title, headerShown: false }} />
      <View style={styles.container}>
        <View style={styles.iconWrap}>
          <Ionicons name="alert-circle-outline" size={64} color={Colors.warning} />
        </View>
        <Text style={styles.title}>{c.title}</Text>
        <Text style={styles.subtitle}>{c.subtitle}</Text>

        <Link href="/" style={styles.link}>
          <View style={styles.button}>
            <Ionicons name="home-outline" size={18} color={Colors.textDark} />
            <Text style={styles.buttonText}>{c.home}</Text>
          </View>
        </Link>
      </View>
    </>
  );
}

const styles = themedStyles((Colors) => ({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: Colors.background,
  },
  iconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.warning + "15",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: "center",
    marginBottom: 24,
  },
  link: {
    marginTop: 8,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.accent,
    paddingHorizontal: 24,
    minHeight: 48,
    borderRadius: 12,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.textDark,
  },
}));
