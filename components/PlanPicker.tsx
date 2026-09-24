import React, { useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, Platform, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { themedStyles } from "@/lib/themed-styles";
import { getApiUrl } from "@/lib/query-client";
import { useLanguage } from "@/lib/language-context";
import { useLicense, type PlanSignup } from "@/lib/license-context";

/**
 * Shown after Google sign-in when the store has no licence (a new account, or
 * one whose licence ran out): buy a plan in Stripe's checkout, or enter a
 * licence key. After paying, the licence is created by the webhook and this
 * screen signs the store in on its own.
 */

interface PlanRow { slug: string; name: string; monthly?: { planId: number; price: number }; yearly?: { planId: number; price: number } }

const CONTACT_URL = "https://kassenta.com/contact/";

export default function PlanPicker({ signup, onUseKey }: { signup: PlanSignup; onUseKey: () => void }) {
  const { language, isRTL } = useLanguage();
  const tr = (en: string, de: string, ar: string) => (language === "ar" ? ar : language === "de" ? de : en);
  const { checkPlanStatus, clearPlanSignup } = useLicense();
  const align = { textAlign: isRTL ? ("right" as const) : ("left" as const) };
  const flipRow = isRTL && Platform.OS !== "web";

  const [plans, setPlans] = useState<PlanRow[] | null>(null);
  const [currency, setCurrency] = useState("CHF");
  const [checkoutOn, setCheckoutOn] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [cycle, setCycle] = useState<"monthly" | "yearly">("monthly");
  const [opening, setOpening] = useState<string | null>(null);
  const [waiting, setWaiting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = () => {
    setLoadFailed(false);
    fetch(`${getApiUrl()}/api/landing/plans`, { headers: { Accept: "application/json" } })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data) => {
        setPlans(Array.isArray(data?.plans) ? data.plans : []);
        setCurrency(String(data?.currency || "CHF"));
        setCheckoutOn(data?.checkout !== false);
      })
      .catch(() => setLoadFailed(true));
  };
  useEffect(load, []);

  // After the checkout opened, look for the new licence every 5 s (30 min).
  useEffect(() => {
    if (!waiting) return;
    const started = Date.now();
    pollRef.current = setInterval(async () => {
      if (Date.now() - started > 30 * 60 * 1000) { if (pollRef.current) clearInterval(pollRef.current); return; }
      if (await checkPlanStatus()) { if (pollRef.current) clearInterval(pollRef.current); }
    }, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waiting]);

  const subscribe = async (plan: PlanRow) => {
    const entry = plan[cycle];
    if (!entry?.planId || opening) return;
    setOpening(plan.slug);
    setMessage(null);
    try {
      const res = await fetch(`${getApiUrl()}/api/payments/checkout-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: entry.planId, planToken: signup.planToken, email: signup.email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.url) throw new Error(data?.error || "checkout");
      if (Platform.OS === "web") window.open(String(data.url), "_blank", "noopener");
      else await Linking.openURL(String(data.url));
      setWaiting(true);
    } catch {
      setMessage(tr(
        "The checkout could not be opened. Nothing was charged — try again or contact us.",
        "Die Zahlung konnte nicht geöffnet werden. Es wurde nichts belastet — erneut versuchen oder uns kontaktieren.",
        "تعذّر فتح صفحة الدفع ولم يُخصم أي مبلغ — حاول مجدداً أو تواصل معنا.",
      ));
    } finally {
      setOpening(null);
    }
  };

  const checkNow = async () => {
    setChecking(true);
    setMessage(null);
    const ok = await checkPlanStatus();
    setChecking(false);
    if (!ok) {
      setMessage(tr(
        "No payment received yet. It can take a minute after paying.",
        "Noch keine Zahlung eingegangen. Nach dem Bezahlen kann es eine Minute dauern.",
        "لم يصل الدفع بعد. قد يستغرق الأمر دقيقة بعد الدفع.",
      ));
    }
  };

  const money = (n: number) => `${currency} ${Number(n).toLocaleString(language === "de" ? "de-CH" : "en-US")}`;

  return (
    <View style={styles.card}>
      <View style={styles.headIcon}>
        <Ionicons name="storefront-outline" size={28} color={Colors.accent} />
      </View>
      <Text style={[styles.title, { textAlign: "center" }]}>{tr("Choose a plan", "Plan wählen", "اختر باقتك")}</Text>
      <Text style={[styles.sub, { textAlign: "center" }]}>
        {tr(
          `${signup.storeName || "Your store"} is ready. Pick a plan to activate it, or enter a licence key.`,
          `${signup.storeName || "Ihr Geschäft"} ist bereit. Wählen Sie einen Plan oder geben Sie einen Lizenzschlüssel ein.`,
          `متجر ${signup.storeName || ""} جاهز. اختر باقة لتفعيله، أو أدخل مفتاح الترخيص.`,
        )}
      </Text>
      {signup.email ? <Text style={[styles.email, { textAlign: "center" }]}>{signup.email}</Text> : null}

      <View style={[styles.toggle, flipRow && { flexDirection: "row-reverse" }]}>
        {(["monthly", "yearly"] as const).map((k) => (
          <TouchableOpacity
            key={k}
            onPress={() => setCycle(k)}
            style={[styles.toggleBtn, cycle === k && styles.toggleOn]}
            accessibilityRole="button"
            accessibilityState={{ selected: cycle === k }}
          >
            <Text style={[styles.toggleText, cycle === k && styles.toggleTextOn]}>
              {k === "monthly" ? tr("Monthly", "Monatlich", "شهري") : tr("Yearly", "Jährlich", "سنوي")}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {plans === null && !loadFailed ? (
        <ActivityIndicator color={Colors.accent} style={{ marginVertical: 24 }} />
      ) : loadFailed ? (
        <View style={{ alignItems: "center", marginVertical: 16, gap: 10 }}>
          <Text style={[styles.sub, { textAlign: "center" }]}>{tr("Plans could not be loaded.", "Pläne konnten nicht geladen werden.", "تعذّر تحميل الباقات.")}</Text>
          <TouchableOpacity onPress={load} style={styles.outlineBtn}>
            <Text style={styles.outlineText}>{tr("Try again", "Erneut versuchen", "إعادة المحاولة")}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ gap: 10, marginTop: 4 }}>
          {(plans || []).filter((p) => p[cycle]).map((p) => {
            const e = p[cycle]!;
            const popular = p.slug === "professional";
            return (
              <View key={p.slug} style={[styles.plan, popular && styles.planPopular, flipRow && { flexDirection: "row-reverse" }]}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.planName, align]}>{p.name}</Text>
                  <Text style={[styles.planPrice, align]}>
                    {money(e.price)}
                    <Text style={styles.planPer}>{cycle === "monthly" ? tr(" / month", " / Monat", " / شهر") : tr(" / year", " / Jahr", " / سنة")}</Text>
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => subscribe(p)}
                  disabled={!checkoutOn || !!opening}
                  style={[styles.buyBtn, (!checkoutOn || (!!opening && opening !== p.slug)) && { opacity: 0.5 }]}
                  accessibilityRole="button"
                >
                  {opening === p.slug
                    ? <ActivityIndicator color={Colors.textDark} size="small" />
                    : <Text style={styles.buyText}>{tr("Subscribe", "Abonnieren", "اشترك")}</Text>}
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}

      {waiting ? (
        <View style={styles.waitBox}>
          <Text style={[styles.sub, { textAlign: "center", marginBottom: 8 }]}>
            {tr(
              "Finish the payment in the window that opened. This screen continues by itself once it is paid.",
              "Schließen Sie die Zahlung im geöffneten Fenster ab. Danach geht es hier automatisch weiter.",
              "أكمل الدفع في النافذة التي فُتحت. ستتابع هذه الشاشة تلقائياً بعد الدفع.",
            )}
          </Text>
          <TouchableOpacity onPress={checkNow} disabled={checking} style={styles.primaryBtn}>
            {checking ? <ActivityIndicator color={Colors.textDark} /> : (
              <Text style={styles.buyText}>{tr("I have paid — continue", "Bezahlt — weiter", "أكملت الدفع — متابعة")}</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : null}

      {message ? <Text style={styles.message}>{message}</Text> : null}

      <TouchableOpacity onPress={onUseKey} style={[styles.linkRow, flipRow && { flexDirection: "row-reverse" }]} accessibilityRole="button">
        <Ionicons name="key-outline" size={16} color={Colors.accent} />
        <Text style={styles.linkText}>{tr("I have a licence key", "Ich habe einen Lizenzschlüssel", "لدي مفتاح ترخيص")}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => Linking.openURL(CONTACT_URL)} style={[styles.linkRow, flipRow && { flexDirection: "row-reverse" }]} accessibilityRole="link">
        <Ionicons name="chatbubbles-outline" size={16} color={Colors.textMuted} />
        <Text style={[styles.linkText, { color: Colors.textMuted }]}>
          {tr("Can't pay by card? Contact us to activate", "Keine Kartenzahlung möglich? Kontaktieren Sie uns", "لا يمكنك الدفع بالبطاقة؟ تواصل معنا للتفعيل")}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={clearPlanSignup} style={styles.linkRow} accessibilityRole="button">
        <Text style={[styles.linkText, { color: Colors.textMuted }]}>{tr("Use another account", "Anderes Konto verwenden", "استخدام حساب آخر")}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = themedStyles((Colors) => ({
  card: {
    width: "100%",
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  headIcon: {
    alignSelf: "center", width: 56, height: 56, borderRadius: 16, marginBottom: 10,
    alignItems: "center", justifyContent: "center", backgroundColor: `${Colors.accent}1F`,
  },
  title: { color: Colors.text, fontSize: 22, fontWeight: "800", marginBottom: 6 },
  sub: { color: Colors.textSecondary, fontSize: 14, lineHeight: 21 },
  email: { color: Colors.textMuted, fontSize: 13, marginTop: 4 },
  toggle: {
    flexDirection: "row", alignSelf: "center", marginVertical: 16, padding: 4, borderRadius: 12,
    backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.cardBorder,
  },
  toggleBtn: { paddingHorizontal: 18, minHeight: 36, justifyContent: "center", borderRadius: 9 },
  toggleOn: { backgroundColor: Colors.accent },
  toggleText: { color: Colors.textMuted, fontWeight: "700", fontSize: 14 },
  toggleTextOn: { color: Colors.textDark },
  plan: {
    flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.cardBorder, backgroundColor: Colors.background,
  },
  planPopular: { borderColor: Colors.accent, borderWidth: 2 },
  planName: { color: Colors.text, fontSize: 16, fontWeight: "800" },
  planPrice: { color: Colors.text, fontSize: 18, fontWeight: "800", marginTop: 2 },
  planPer: { color: Colors.textMuted, fontSize: 13, fontWeight: "600" },
  buyBtn: {
    minHeight: 44, minWidth: 96, paddingHorizontal: 16, borderRadius: 12,
    alignItems: "center", justifyContent: "center", backgroundColor: Colors.accent,
  },
  buyText: { color: Colors.textDark, fontWeight: "800", fontSize: 15 },
  primaryBtn: {
    minHeight: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: Colors.accent,
  },
  outlineBtn: { minHeight: 44, paddingHorizontal: 18, borderRadius: 12, borderWidth: 1, borderColor: Colors.accent, justifyContent: "center" },
  outlineText: { color: Colors.accent, fontWeight: "700" },
  waitBox: { marginTop: 16, padding: 14, borderRadius: 14, backgroundColor: `${Colors.accent}14` },
  message: { color: Colors.danger, fontSize: 13, textAlign: "center", marginTop: 12 },
  linkRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, minHeight: 44, marginTop: 6 },
  linkText: { color: Colors.accent, fontSize: 14, fontWeight: "700" },
}));
