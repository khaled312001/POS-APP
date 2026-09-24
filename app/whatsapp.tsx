/**
 * The store's own WhatsApp: link it by QR, test it, read and answer chats,
 * edit the order messages customers get, and choose where new-order alerts
 * go. Server side: server/whatsappStoreRoutes.ts (sessions run in the
 * WhatsApp bridge process, so the link stays up after it is made).
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View, Text, Pressable, TextInput, ScrollView, FlatList, Image, Switch, ActivityIndicator,
  useWindowDimensions, KeyboardAvoidingView, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { Colors } from "@/constants/colors";
import { themedStyles } from "@/lib/themed-styles";
import { useLanguage } from "@/lib/language-context";
import { apiRequest, apiErrorMessage, getQueryFn } from "@/lib/query-client";
import { useLicense } from "@/lib/license-context";

type Tab = "connect" | "chats" | "templates" | "offers" | "alerts";

const COPY = {
  ar: {
    title: "واتساب المتجر",
    tabs: { connect: "الربط", chats: "المحادثات", templates: "رسائل الطلبات", offers: "العروض", alerts: "التنبيهات" } as Record<Tab, string>,
    connected: "متصل", connecting: "جاري الاتصال…", qr: "بانتظار مسح الرمز", disconnected: "غير مربوط",
    linkedAs: "مربوط بالرقم",
    intro: "اربط رقم واتساب متجرك مرة واحدة، وستُرسل رسائل الطلبات للزبائن من رقمك أنت، وتصلك رسائلهم هنا. يبقى الربط شغّالاً دائماً حتى لو أغلقت التطبيق.",
    link: "ربط واتساب", relink: "إعادة الاتصال", unlink: "إلغاء الربط", unlinkConfirm: "اضغط مرة أخرى للتأكيد",
    steps: ["افتح واتساب على هاتف المتجر", "اضغط ⋮ (أو الإعدادات) ← الأجهزة المرتبطة", "اضغط «ربط جهاز» ووجّه الكاميرا نحو الرمز"],
    qrExpires: "الرمز يتجدد تلقائياً — إن انتهى اضغط «ربط واتساب» مرة أخرى.",
    test: "اختبار الاتصال", testHint: "يرسل رسالة اختبار من رقم المتجر. اتركه فارغاً لإرسالها إلى رقم المتجر نفسه.",
    testPh: "رقم مع رمز الدولة (اختياري)", send: "إرسال", testOk: "✅ وصلت رسالة الاختبار — الاتصال يعمل",
    pending: "رسائل بانتظار الإرسال", activity: "آخر الأحداث",
    search: "بحث في المحادثات", newChat: "رسالة جديدة", noChats: "لا توجد محادثات بعد. ستظهر هنا رسائل الزبائن فور وصولها.",
    notLinkedChats: "اربط واتساب المتجر أولاً من تبويب «الربط».",
    pickChat: "اختر محادثة", typeMsg: "اكتب رسالة…", phone: "رقم الهاتف مع رمز الدولة", message: "نص الرسالة",
    you: "أنت", media: { image: "📷 صورة", video: "🎬 فيديو", audio: "🎤 رسالة صوتية", document: "📄 ملف", sticker: "ملصق", location: "📍 موقع", contact: "👤 جهة اتصال" } as Record<string, string>,
    lang: "لغة الرسائل", arabic: "العربية", english: "English",
    events: {
      order_new: "طلب جديد (للمتجر)", order_confirmed: "تأكيد الطلب (للزبون)", status_accepted: "تم قبول الطلب",
      status_preparing: "قيد التحضير", status_ready: "الطلب جاهز", status_on_way: "في الطريق",
      status_delivered: "تم التوصيل", status_cancelled: "تم الإلغاء",
    } as Record<string, string>,
    variables: "المتغيرات — اضغط لإضافتها", preview: "معاينة", reset: "استرجاع النص الأصلي", save: "حفظ", saved: "تم الحفظ",
    notifyOwner: "إرسال الطلبات الجديدة إلى رقم المتجر", notifyOwnerHint: "تصلك رسالة بكل طلب جديد على واتساب المتجر.",
    group: "مجموعة الطلبات", groupHint: "اختر مجموعة واتساب (مثلاً مجموعة الموظفين) لتصلها كل الطلبات الجديدة.",
    noGroup: "بدون مجموعة", refresh: "تحديث القائمة", members: "عضو", noGroups: "هذا الرقم ليس عضواً في أي مجموعة.",
    offersIntro: "أرسل عرضاً أو كود خصم لزبائنك من رقم متجرك. تُرسل الرسائل بالتدريج (رسالة كل ثانيتين تقريباً) لحماية رقمك، ويستطيع أي زبون إيقافها بالرد «إلغاء».",
    audience: "إلى من؟", audAll: "كل الزبائن", audOnline: "زبائن الطلبات الأونلاين", audWholesale: "تجار الجملة",
    optedOut: "أوقفوا العروض", remaining: "المتبقي اليوم",
    promo: "كود خصم (اختياري)", noPromo: "بدون كود", offerText: "نص العرض",
    offerDefault: "🎁 عرض خاص من {{storeName}}!\n\nأهلاً {{customerName}}،\n\nاطلب الآن: {{storeLink}}",
    offerWithCode: (d: string) => `🎁 عرض خاص من {{storeName}}!\n\nأهلاً {{customerName}}، ${d}\n\nاستخدم الكود: *{{promoCode}}*\nاطلب الآن: {{storeLink}}`,
    sendOffer: (n: number) => `إرسال إلى ${n} زبون`, confirmSend: (n: number) => `اضغط مرة أخرى لتأكيد الإرسال إلى ${n} زبون`,
    offerSent: (n: number, m: number) => `✅ بدأ إرسال العرض إلى ${n} زبون — يكتمل خلال ${m} دقيقة تقريباً`,
    history: "العروض السابقة", recipients: "مستلم", optOutNote: "تُضاف تلقائياً: «لإيقاف رسائل العروض أرسل: إلغاء»",
  },
  en: {
    title: "Store WhatsApp",
    tabs: { connect: "Connection", chats: "Chats", templates: "Order messages", offers: "Offers", alerts: "Alerts" } as Record<Tab, string>,
    connected: "Connected", connecting: "Connecting…", qr: "Waiting for scan", disconnected: "Not linked",
    linkedAs: "Linked to",
    intro: "Link your store's WhatsApp once: order messages go to customers from your own number, and their replies arrive here. The link stays up even when the app is closed.",
    link: "Link WhatsApp", relink: "Reconnect", unlink: "Unlink", unlinkConfirm: "Tap again to confirm",
    steps: ["Open WhatsApp on the store's phone", "Tap ⋮ (or Settings) → Linked devices", "Tap “Link a device” and point the camera at the code"],
    qrExpires: "The code refreshes by itself — if it expires, tap “Link WhatsApp” again.",
    test: "Connection test", testHint: "Sends a test message from the store's number. Leave empty to send it to the store's own number.",
    testPh: "Number with country code (optional)", send: "Send", testOk: "✅ Test message sent — the connection works",
    pending: "messages waiting to send", activity: "Recent activity",
    search: "Search chats", newChat: "New message", noChats: "No chats yet. Customer messages show up here as they arrive.",
    notLinkedChats: "Link the store's WhatsApp first (Connection tab).",
    pickChat: "Choose a chat", typeMsg: "Type a message…", phone: "Phone number with country code", message: "Message",
    you: "You", media: { image: "📷 Photo", video: "🎬 Video", audio: "🎤 Voice message", document: "📄 File", sticker: "Sticker", location: "📍 Location", contact: "👤 Contact" } as Record<string, string>,
    lang: "Message language", arabic: "العربية", english: "English",
    events: {
      order_new: "New order (to the store)", order_confirmed: "Order confirmation (customer)", status_accepted: "Order accepted",
      status_preparing: "Preparing", status_ready: "Order ready", status_on_way: "On the way",
      status_delivered: "Delivered", status_cancelled: "Cancelled",
    } as Record<string, string>,
    variables: "Variables — tap to insert", preview: "Preview", reset: "Restore default text", save: "Save", saved: "Saved",
    notifyOwner: "Send new orders to the store's number", notifyOwnerHint: "You get a WhatsApp message for every new order.",
    group: "Orders group", groupHint: "Pick a WhatsApp group (e.g. your staff group) that gets every new order.",
    noGroup: "No group", refresh: "Refresh list", members: "members", noGroups: "This number isn't in any group.",
    offersIntro: "Send an offer or discount code to your customers from your store's number. Messages go out gradually (about one every 2 seconds) to protect your number, and any customer can stop them by replying STOP.",
    audience: "Send to", audAll: "All customers", audOnline: "Online-order customers", audWholesale: "Wholesale traders",
    optedOut: "opted out", remaining: "left today",
    promo: "Discount code (optional)", noPromo: "No code", offerText: "Offer text",
    offerDefault: "🎁 Special offer from {{storeName}}!\n\nHi {{customerName}},\n\nOrder now: {{storeLink}}",
    offerWithCode: (d: string) => `🎁 Special offer from {{storeName}}!\n\nHi {{customerName}}, ${d}\n\nUse code: *{{promoCode}}*\nOrder now: {{storeLink}}`,
    sendOffer: (n: number) => `Send to ${n} customers`, confirmSend: (n: number) => `Tap again to send to ${n} customers`,
    offerSent: (n: number, m: number) => `✅ Sending the offer to ${n} customers — done in about ${m} min`,
    history: "Past offers", recipients: "recipients", optOutNote: "Added automatically: “Reply STOP to stop offers”",
  },
};

const SAMPLE: Record<string, string> = {
  orderNumber: "#1042", storeName: "Kassenta", customerName: "Ahmad", customerPhone: "+963 944 123 456",
  address: "Damascus, Mazzeh", items: "  1. Shawarma × 2 — 30,000\n  2. Ayran × 2 — 8,000", subtotal: "38,000",
  deliveryFee: "5,000", total: "43,000", orderType: "🚚 Delivery", paymentMethod: "Cash", notes: "",
};

function render(text: string, vars: Record<string, string>) {
  return text
    .split("\n")
    .map((line) => {
      const names = [...line.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1]);
      if (names.length && names.every((n) => !vars[n])) return null;
      return line.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, n) => vars[n] ?? "");
    })
    .filter((l) => l !== null)
    .join("\n")
    .trim();
}

function timeLabel(v: string | null | undefined) {
  if (!v) return "";
  const d = new Date(v);
  const now = new Date();
  return d.toDateString() === now.toDateString()
    ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString([], { day: "numeric", month: "short" });
}

function chatTitle(c: any) {
  return c.name || (c.phone ? `+${c.phone}` : c.jid.split("@")[0]);
}

export default function WhatsAppScreen() {
  const { language } = useLanguage();
  const c = language === "ar" ? COPY.ar : COPY.en;
  const [tab, setTab] = useState<Tab>("connect");
  const { data: session, refetch } = useQuery<any>({
    queryKey: ["/api/whatsapp/session"],
    queryFn: getQueryFn({ on401: "throw" }),
    refetchInterval: (q: any) => {
      const st = q?.state?.data?.status;
      return st === "qr_ready" || st === "connecting" ? 2000 : 15000;
    },
  });
  const status: string = session?.status || "disconnected";

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/settings" as any))} style={styles.iconBtn} hitSlop={8}>
          <Ionicons name={language === "ar" ? "arrow-forward" : "arrow-back"} size={22} color={Colors.text} />
        </Pressable>
        <Ionicons name="logo-whatsapp" size={22} color="#25D366" />
        <Text style={styles.headerTitle}>{c.title}</Text>
        <StatusPill status={status} c={c} />
      </View>
      <View style={styles.tabs}>
        {(["connect", "chats", "templates", "offers", "alerts"] as Tab[]).map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabActive]}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]} numberOfLines={1}>{c.tabs[t]}</Text>
          </Pressable>
        ))}
      </View>
      <View style={{ flex: 1 }}>
        {tab === "connect" && <ConnectTab c={c} session={session} refetch={refetch} />}
        {tab === "chats" && <ChatsTab c={c} session={session} />}
        {tab === "templates" && <TemplatesTab c={c} />}
        {tab === "offers" && <OffersTab c={c} session={session} />}
        {tab === "alerts" && <AlertsTab c={c} session={session} />}
      </View>
    </SafeAreaView>
  );
}

function StatusPill({ status, c }: { status: string; c: any }) {
  const map: Record<string, [string, string]> = {
    connected: [c.connected, Colors.success],
    connecting: [c.connecting, Colors.warning],
    qr_ready: [c.qr, Colors.warning],
    disconnected: [c.disconnected, Colors.textMuted],
  };
  const [label, color] = map[status] || map.disconnected;
  return (
    <View style={[styles.pill, { borderColor: color }]}>
      <View style={[styles.pillDot, { backgroundColor: color }]} />
      <Text style={[styles.pillText, { color }]}>{label}</Text>
    </View>
  );
}

// ── Connection ─────────────────────────────────────────────────────────────
function ConnectTab({ c, session, refetch }: { c: any; session: any; refetch: () => void }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirmUnlink, setConfirmUnlink] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const status: string = session?.status || "disconnected";
  const { width } = useWindowDimensions();
  const wide = width >= 820;

  const act = async (fn: () => Promise<any>) => {
    setBusy(true);
    setMsg(null);
    try { await fn(); } catch (e) { setMsg({ ok: false, text: apiErrorMessage(e) }); }
    finally { setBusy(false); qc.invalidateQueries({ queryKey: ["/api/whatsapp/session"] }); refetch(); }
  };

  const connect = () => act(() => apiRequest("POST", "/api/whatsapp/session/connect"));
  const unlink = () => {
    if (!confirmUnlink) { setConfirmUnlink(true); setTimeout(() => setConfirmUnlink(false), 4000); return; }
    setConfirmUnlink(false);
    act(() => apiRequest("POST", "/api/whatsapp/session/logout"));
  };
  const test = () => act(async () => {
    await apiRequest("POST", "/api/whatsapp/session/test", { phone: testPhone });
    setMsg({ ok: true, text: c.testOk });
  });

  const qrBox = status === "qr_ready" && session?.qrCode ? (
    <View style={styles.qrCard}>
      <View style={styles.qrFrame}>
        <Image source={{ uri: session.qrCode }} style={{ width: 240, height: 240 }} />
      </View>
      <View style={{ flex: 1, minWidth: 220, gap: 10 }}>
        {c.steps.map((s: string, i: number) => (
          <View key={i} style={styles.stepRow}>
            <View style={styles.stepNum}><Text style={styles.stepNumText}>{i + 1}</Text></View>
            <Text style={styles.stepText}>{s}</Text>
          </View>
        ))}
        <Text style={styles.muted}>{c.qrExpires}</Text>
      </View>
    </View>
  ) : null;

  return (
    <ScrollView contentContainerStyle={[styles.pad, { maxWidth: 900, width: "100%", alignSelf: "center" }]}>
      <View style={styles.card}>
        {status === "connected" ? (
          <View style={styles.linkedRow}>
            <View style={styles.bigIcon}><Ionicons name="checkmark-circle" size={34} color={Colors.success} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{c.linkedAs} +{session?.phone}</Text>
              {!!session?.name && <Text style={styles.muted}>{session.name}</Text>}
            </View>
          </View>
        ) : (
          <Text style={styles.body}>{c.intro}</Text>
        )}
        {qrBox}
        {status === "connecting" && !qrBox && <ActivityIndicator style={{ marginTop: 16 }} color={Colors.accent} />}
        {!!session?.lastError && status !== "connected" && <Text style={styles.errorText}>{session.lastError}</Text>}
        <View style={[styles.btnRow, { marginTop: 16 }]}>
          {status === "disconnected" && (
            <Pressable onPress={connect} disabled={busy} style={[styles.btn, styles.btnGreen]}>
              {busy ? <ActivityIndicator color="#fff" /> : <><Ionicons name="qr-code-outline" size={18} color="#fff" /><Text style={styles.btnText}>{session?.linked ? c.relink : c.link}</Text></>}
            </Pressable>
          )}
          {(status === "connected" || session?.linked) && (
            <Pressable onPress={unlink} disabled={busy} style={[styles.btn, styles.btnDanger, confirmUnlink && { backgroundColor: Colors.danger }]}>
              <Ionicons name="unlink-outline" size={18} color={confirmUnlink ? "#fff" : Colors.danger} />
              <Text style={[styles.btnText, { color: confirmUnlink ? "#fff" : Colors.danger }]}>{confirmUnlink ? c.unlinkConfirm : c.unlink}</Text>
            </Pressable>
          )}
        </View>
      </View>

      {status === "connected" && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{c.test}</Text>
          <Text style={styles.muted}>{c.testHint}</Text>
          <View style={[styles.btnRow, { marginTop: 12, flexWrap: wide ? "nowrap" : "wrap" }]}>
            <TextInput value={testPhone} onChangeText={setTestPhone} placeholder={c.testPh} placeholderTextColor={Colors.textMuted}
              keyboardType="phone-pad" style={[styles.input, { flex: 1, minWidth: 200 }]} />
            <Pressable onPress={test} disabled={busy} style={[styles.btn, styles.btnGreen]}>
              {busy ? <ActivityIndicator color="#fff" /> : <><Ionicons name="paper-plane-outline" size={18} color="#fff" /><Text style={styles.btnText}>{c.send}</Text></>}
            </Pressable>
          </View>
        </View>
      )}

      {!!msg && <Text style={[styles.flash, { color: msg.ok ? Colors.success : Colors.danger }]}>{msg.text}</Text>}

      {!!session?.pending && <Text style={styles.muted}>{session.pending} {c.pending}</Text>}

      {!!session?.log?.length && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{c.activity}</Text>
          {session.log.slice(0, 8).map((l: any, i: number) => (
            <Text key={i} style={styles.logLine}>{new Date(l.time).toLocaleTimeString()}  {l.event}</Text>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

// ── Chats ──────────────────────────────────────────────────────────────────
function ChatsTab({ c, session }: { c: any; session: any }) {
  const { width } = useWindowDimensions();
  const wide = width >= 820;
  const [q, setQ] = useState("");
  const [active, setActive] = useState<any | null>(null);
  const [composeNew, setComposeNew] = useState(false);
  const linked = session?.status === "connected" || session?.linked;
  const { data: chats, isLoading } = useQuery<any[]>({
    queryKey: [`/api/whatsapp/chats${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`],
    queryFn: getQueryFn({ on401: "throw" }),
    refetchInterval: 5000,
    enabled: !!linked,
  });

  if (!linked) {
    return <View style={styles.centerBox}><Ionicons name="chatbubbles-outline" size={48} color={Colors.textMuted} /><Text style={styles.muted}>{c.notLinkedChats}</Text></View>;
  }

  const list = (
    <View style={[styles.chatList, wide && { width: 340, borderEndWidth: 1, borderEndColor: Colors.cardBorder }]}>
      <View style={styles.searchRow}>
        <Ionicons name="search" size={16} color={Colors.textMuted} />
        <TextInput value={q} onChangeText={setQ} placeholder={c.search} placeholderTextColor={Colors.textMuted} style={styles.searchInput} />
        <Pressable onPress={() => { setComposeNew(true); setActive(null); }} style={styles.iconBtn} hitSlop={6}>
          <Ionicons name="create-outline" size={20} color={Colors.accent} />
        </Pressable>
      </View>
      {isLoading ? <ActivityIndicator style={{ marginTop: 24 }} color={Colors.accent} /> : (
        <FlatList
          data={chats || []}
          keyExtractor={(x) => x.jid}
          ListEmptyComponent={<Text style={[styles.muted, { padding: 20, textAlign: "center" }]}>{c.noChats}</Text>}
          renderItem={({ item }) => (
            <Pressable onPress={() => { setActive(item); setComposeNew(false); }} style={[styles.chatRow, active?.jid === item.jid && styles.chatRowActive]}>
              <View style={[styles.chatAvatar, item.isGroup && { backgroundColor: Colors.info + "33" }]}>
                <Ionicons name={item.isGroup ? "people" : "person"} size={18} color={item.isGroup ? Colors.info : Colors.success} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={styles.chatTop}>
                  <Text style={styles.chatName} numberOfLines={1}>{chatTitle(item)}</Text>
                  <Text style={styles.chatTime}>{timeLabel(item.lastAt)}</Text>
                </View>
                <View style={styles.chatTop}>
                  <Text style={styles.chatLast} numberOfLines={1}>{item.lastFromMe ? `${c.you}: ` : ""}{item.lastMessage}</Text>
                  {item.unread > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{item.unread}</Text></View>}
                </View>
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );

  const pane = composeNew
    ? <NewMessage c={c} onDone={() => setComposeNew(false)} />
    : active
      ? <Conversation key={active.jid} c={c} chat={active} onBack={wide ? undefined : () => setActive(null)} />
      : wide ? <View style={styles.centerBox}><Ionicons name="logo-whatsapp" size={56} color={Colors.textMuted} /><Text style={styles.muted}>{c.pickChat}</Text></View> : null;

  if (wide) return <View style={{ flex: 1, flexDirection: "row" }}>{list}<View style={{ flex: 1 }}>{pane}</View></View>;
  return pane || list;
}

function Conversation({ c, chat, onBack }: { c: any; chat: any; onBack?: () => void }) {
  const qc = useQueryClient();
  const jid = encodeURIComponent(chat.jid);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<FlatList>(null);
  const { data: messages } = useQuery<any[]>({
    queryKey: [`/api/whatsapp/chats/${jid}/messages`],
    queryFn: getQueryFn({ on401: "throw" }),
    refetchInterval: 4000,
  });

  useEffect(() => {
    apiRequest("POST", `/api/whatsapp/chats/${jid}/read`).then(() => qc.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith("/api/whatsapp/chats") && !String(q.queryKey[0]).includes("/messages") })).catch(() => { });
  }, [chat.jid, messages?.length]);

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    try {
      await apiRequest("POST", `/api/whatsapp/chats/${jid}/send`, { text: body });
      setText("");
      setTimeout(() => qc.invalidateQueries({ queryKey: [`/api/whatsapp/chats/${jid}/messages`] }), 600);
    } catch (e) { setError(apiErrorMessage(e)); }
    finally { setSending(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.convHeader}>
        {onBack && (
          <Pressable onPress={onBack} style={styles.iconBtn} hitSlop={8}>
            <Ionicons name="chevron-back" size={22} color={Colors.text} />
          </Pressable>
        )}
        <View style={styles.chatAvatar}><Ionicons name={chat.isGroup ? "people" : "person"} size={18} color={Colors.success} /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.chatName} numberOfLines={1}>{chatTitle(chat)}</Text>
          {!!chat.phone && !!chat.name && <Text style={styles.chatTime}>+{chat.phone}</Text>}
        </View>
      </View>
      <FlatList
        ref={listRef}
        style={styles.convBody}
        contentContainerStyle={{ padding: 12, gap: 6 }}
        data={messages || []}
        keyExtractor={(m) => String(m.id)}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        renderItem={({ item: m }) => (
          <View style={[styles.bubble, m.fromMe ? styles.bubbleMe : styles.bubbleThem]}>
            {chat.isGroup && !m.fromMe && !!m.senderName && <Text style={styles.bubbleSender}>{m.senderName}</Text>}
            {m.type !== "text" && <Text style={styles.bubbleMedia}>{c.media[m.type] || m.type}</Text>}
            {!!m.body && <Text style={styles.bubbleText} selectable>{m.body}</Text>}
            <View style={styles.bubbleMeta}>
              <Text style={styles.bubbleTime}>{new Date(m.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Text>
              {m.fromMe && <Ionicons name={m.status >= 3 ? "checkmark-done" : "checkmark"} size={14} color={m.status >= 4 ? "#34B7F1" : Colors.textMuted} />}
            </View>
          </View>
        )}
      />
      {!!error && <Text style={[styles.errorText, { paddingHorizontal: 12 }]}>{error}</Text>}
      <View style={styles.composer}>
        <TextInput value={text} onChangeText={setText} placeholder={c.typeMsg} placeholderTextColor={Colors.textMuted}
          style={[styles.input, { flex: 1, maxHeight: 120 }]} multiline
          onKeyPress={(e: any) => {
            if (Platform.OS === "web" && e.nativeEvent.key === "Enter" && !e.nativeEvent.shiftKey) { e.preventDefault?.(); send(); }
          }} />
        <Pressable onPress={send} disabled={sending || !text.trim()} style={[styles.sendBtn, (!text.trim() || sending) && { opacity: 0.5 }]}>
          {sending ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="send" size={18} color="#fff" />}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function NewMessage({ c, onDone }: { c: any; onDone: () => void }) {
  const qc = useQueryClient();
  const [phone, setPhone] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const send = async () => {
    setBusy(true);
    setErr(null);
    try {
      await apiRequest("POST", "/api/whatsapp/send", { phone, text });
      qc.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith("/api/whatsapp/chats") });
      onDone();
    } catch (e) { setErr(apiErrorMessage(e)); }
    finally { setBusy(false); }
  };
  return (
    <ScrollView contentContainerStyle={styles.pad}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{c.newChat}</Text>
        <Text style={styles.label}>{c.phone}</Text>
        <TextInput value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="963944123456" placeholderTextColor={Colors.textMuted} style={styles.input} />
        <Text style={styles.label}>{c.message}</Text>
        <TextInput value={text} onChangeText={setText} multiline style={[styles.input, { minHeight: 100, textAlignVertical: "top" }]} />
        {!!err && <Text style={styles.errorText}>{err}</Text>}
        <View style={[styles.btnRow, { marginTop: 12 }]}>
          <Pressable onPress={send} disabled={busy || !phone.trim() || !text.trim()} style={[styles.btn, styles.btnGreen, (busy || !phone.trim() || !text.trim()) && { opacity: 0.5 }]}>
            {busy ? <ActivityIndicator color="#fff" /> : <><Ionicons name="send" size={16} color="#fff" /><Text style={styles.btnText}>{c.send}</Text></>}
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

// ── Templates ──────────────────────────────────────────────────────────────
function TemplatesTab({ c }: { c: any }) {
  const { data, refetch } = useQuery<any>({ queryKey: ["/api/whatsapp/templates"], queryFn: getQueryFn({ on401: "throw" }) });
  const [lang, setLang] = useState<"ar" | "en">("ar");
  const [events, setEvents] = useState<any[]>([]);
  const [open, setOpen] = useState<string | null>("order_confirmed");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!data) return;
    setLang(data.lang);
    setEvents(data.events.map((e: any) => ({ ...e })));
  }, [data]);

  const update = (event: string, patch: any) => setEvents((list) => list.map((e) => (e.event === event ? { ...e, ...patch } : e)));

  const save = async (nextLang = lang) => {
    setBusy(true);
    setMsg(null);
    try {
      await apiRequest("PUT", "/api/whatsapp/templates", {
        lang: nextLang,
        // Switching language: keep only on/off, texts fall back to the new language's defaults.
        events: events.map((e) => ({ event: e.event, enabled: e.enabled, text: nextLang === lang && e.text !== e.defaultText ? e.text : "" })),
      });
      await refetch();
      setMsg(c.saved);
    } catch (e) { setMsg(apiErrorMessage(e)); }
    finally { setBusy(false); }
  };

  if (!data) return <ActivityIndicator style={{ marginTop: 32 }} color={Colors.accent} />;

  return (
    <ScrollView contentContainerStyle={[styles.pad, { maxWidth: 900, width: "100%", alignSelf: "center" }]}>
      <View style={[styles.card, styles.langRow]}>
        <Text style={styles.cardTitle}>{c.lang}</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {(["ar", "en"] as const).map((l) => (
            <Pressable key={l} onPress={() => { if (l !== lang) save(l); }} style={[styles.chip, lang === l && styles.chipActive]}>
              <Text style={[styles.chipText, lang === l && styles.chipTextActive]}>{l === "ar" ? c.arabic : c.english}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {events.map((e) => {
        const expanded = open === e.event;
        return (
          <View key={e.event} style={styles.card}>
            <Pressable onPress={() => setOpen(expanded ? null : e.event)} style={styles.tplHead}>
              <Ionicons name={expanded ? "chevron-down" : "chevron-forward"} size={18} color={Colors.textMuted} />
              <Text style={[styles.cardTitle, { flex: 1 }]}>{c.events[e.event] || e.event}</Text>
              <Switch value={e.enabled} onValueChange={(v) => update(e.event, { enabled: v })} />
            </Pressable>
            {expanded && (
              <View style={{ marginTop: 10, gap: 10 }}>
                <TextInput value={e.text} onChangeText={(v) => update(e.event, { text: v })} multiline
                  style={[styles.input, { minHeight: 140, textAlignVertical: "top" }]} />
                <Text style={styles.label}>{c.variables}</Text>
                <View style={styles.chips}>
                  {e.variables.map((v: string) => (
                    <Pressable key={v} onPress={() => update(e.event, { text: `${e.text}${e.text.endsWith("\n") || !e.text ? "" : " "}{{${v}}}` })} style={styles.chip}>
                      <Text style={styles.chipText}>{`{{${v}}}`}</Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={styles.label}>{c.preview}</Text>
                <View style={[styles.bubble, styles.bubbleMe, { maxWidth: "100%" }]}>
                  <Text style={styles.bubbleText}>{render(e.text, SAMPLE)}</Text>
                </View>
                {e.text !== e.defaultText && (
                  <Pressable onPress={() => update(e.event, { text: e.defaultText })} style={styles.linkBtn}>
                    <Ionicons name="refresh" size={14} color={Colors.accent} />
                    <Text style={styles.linkText}>{c.reset}</Text>
                  </Pressable>
                )}
              </View>
            )}
          </View>
        );
      })}

      <Pressable onPress={() => save()} disabled={busy} style={[styles.btn, styles.btnGreen, { alignSelf: "stretch", justifyContent: "center" }]}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{c.save}</Text>}
      </Pressable>
      {!!msg && <Text style={[styles.flash, { color: Colors.textMuted }]}>{msg}</Text>}
    </ScrollView>
  );
}

// ── Offers ─────────────────────────────────────────────────────────────────
function OffersTab({ c, session }: { c: any; session: any }) {
  const qc = useQueryClient();
  const { tenant } = useLicense();
  const linked = session?.status === "connected" || session?.linked;
  const { data } = useQuery<any>({ queryKey: ["/api/whatsapp/campaigns"], queryFn: getQueryFn({ on401: "throw" }), enabled: !!linked });
  const { data: promos } = useQuery<any[]>({
    queryKey: [`/api/delivery/promos?tenantId=${tenant?.id}`],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!linked && !!tenant?.id,
  });
  const [audience, setAudience] = useState<"all" | "online" | "wholesale">("all");
  const [promo, setPromo] = useState<any | null>(null);
  const [text, setText] = useState<string>(c.offerDefault);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  if (!linked) {
    return <View style={styles.centerBox}><Ionicons name="megaphone-outline" size={48} color={Colors.textMuted} /><Text style={styles.muted}>{c.notLinkedChats}</Text></View>;
  }

  const counts = data?.audience || {};
  const target = Math.min(Number(counts[audience] || 0), Number(data?.remainingToday ?? 0));
  const activePromos = (promos || []).filter((p: any) => p.isActive !== false);

  const pickPromo = (p: any | null) => {
    setPromo(p);
    if (!p) { setText(c.offerDefault); return; }
    const d = p.description || (p.discountType === "percent" ? `${Number(p.discountValue)}%` : String(p.discountValue));
    setText(c.offerWithCode(d));
  };

  const send = async () => {
    if (!confirm) { setConfirm(true); setTimeout(() => setConfirm(false), 5000); return; }
    setConfirm(false);
    setBusy(true);
    setMsg(null);
    try {
      const r = await (await apiRequest("POST", "/api/whatsapp/campaigns", { text, audience, promoCode: promo?.code || "" })).json();
      setMsg({ ok: true, text: c.offerSent(r.recipients, r.etaMinutes) });
      qc.invalidateQueries({ queryKey: ["/api/whatsapp/campaigns"] });
    } catch (e) { setMsg({ ok: false, text: apiErrorMessage(e) }); }
    finally { setBusy(false); }
  };

  const sample = { ...SAMPLE, storeName: tenant?.name || SAMPLE.storeName, promoCode: promo?.code || "", storeLink: "https://kassenta.com/order/…" };
  const audiences: ["all" | "online" | "wholesale", string][] = [["all", c.audAll], ["online", c.audOnline], ["wholesale", c.audWholesale]];

  return (
    <ScrollView contentContainerStyle={[styles.pad, { maxWidth: 900, width: "100%", alignSelf: "center" }]}>
      <View style={styles.card}><Text style={styles.body}>{c.offersIntro}</Text></View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{c.audience}</Text>
        <View style={[styles.chips, { marginTop: 10 }]}>
          {audiences.map(([k, label]) => (
            <Pressable key={k} onPress={() => setAudience(k)} style={[styles.chip, audience === k && styles.chipActive]}>
              <Text style={[styles.chipText, audience === k && styles.chipTextActive]}>{label} · {counts[k] ?? "…"}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.muted}>
          {c.remaining}: {data?.remainingToday ?? "…"}{counts.optedOut ? `  ·  ${counts.optedOut} ${c.optedOut}` : ""}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{c.promo}</Text>
        <View style={[styles.chips, { marginTop: 10 }]}>
          <Pressable onPress={() => pickPromo(null)} style={[styles.chip, !promo && styles.chipActive]}>
            <Text style={[styles.chipText, !promo && styles.chipTextActive]}>{c.noPromo}</Text>
          </Pressable>
          {activePromos.map((p: any) => (
            <Pressable key={p.id} onPress={() => pickPromo(p)} style={[styles.chip, promo?.id === p.id && styles.chipActive]}>
              <Text style={[styles.chipText, promo?.id === p.id && styles.chipTextActive]}>
                {p.code} · {p.discountType === "percent" ? `${Number(p.discountValue)}%` : p.discountType === "free_delivery" ? "🚚" : Number(p.discountValue)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{c.offerText}</Text>
        <TextInput value={text} onChangeText={setText} multiline style={[styles.input, { minHeight: 140, marginTop: 10, textAlignVertical: "top" }]} />
        <View style={[styles.chips, { marginTop: 8 }]}>
          {["customerName", "storeName", "storeLink", "promoCode"].map((v) => (
            <Pressable key={v} onPress={() => setText((t) => `${t}${t.endsWith("\n") || !t ? "" : " "}{{${v}}}`)} style={styles.chip}>
              <Text style={styles.chipText}>{`{{${v}}}`}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.label}>{c.preview}</Text>
        <View style={[styles.bubble, styles.bubbleMe, { maxWidth: "100%", marginTop: 6 }]}>
          <Text style={styles.bubbleText}>{render(text, sample)}</Text>
        </View>
        <Text style={styles.muted}>{c.optOutNote}</Text>
      </View>

      <Pressable onPress={send} disabled={busy || !target || !text.trim()}
        style={[styles.btn, styles.btnGreen, { alignSelf: "stretch", justifyContent: "center" }, confirm && { backgroundColor: Colors.warning }, (busy || !target || !text.trim()) && { opacity: 0.5 }]}>
        {busy ? <ActivityIndicator color="#fff" /> : <><Ionicons name="megaphone-outline" size={18} color="#fff" /><Text style={styles.btnText}>{confirm ? c.confirmSend(target) : c.sendOffer(target)}</Text></>}
      </Pressable>
      {!!msg && <Text style={[styles.flash, { color: msg.ok ? Colors.success : Colors.danger }]}>{msg.text}</Text>}

      {!!data?.campaigns?.length && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{c.history}</Text>
          {data.campaigns.map((k: any) => (
            <View key={k.id} style={styles.historyRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.body} numberOfLines={2}>{k.body}</Text>
                <Text style={styles.chatTime}>{new Date(k.createdAt).toLocaleString()}{k.promoCode ? `  ·  ${k.promoCode}` : ""}</Text>
              </View>
              <Text style={styles.historyCount}>{k.recipients} {c.recipients}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

// ── Alerts ─────────────────────────────────────────────────────────────────
function AlertsTab({ c, session }: { c: any; session: any }) {
  const connected = session?.status === "connected";
  const [refreshing, setRefreshing] = useState(false);
  const { data, refetch, isLoading } = useQuery<any>({
    queryKey: ["/api/whatsapp/groups"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: connected,
  });
  const [alerts, setAlerts] = useState<any>({ notifyOwner: true, groupEnabled: true, groupJid: "" });
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const a = data?.alerts || session?.alerts;
    if (a) setAlerts({ notifyOwner: a.notifyOwner !== false, groupEnabled: a.groupEnabled !== false, groupJid: a.groupJid || "", groupName: a.groupName || "" });
  }, [data, session?.alerts]);

  const save = async (next: any) => {
    setAlerts(next);
    setMsg(null);
    try { await apiRequest("PUT", "/api/whatsapp/alerts", next); setMsg(c.saved); }
    catch (e) { setMsg(apiErrorMessage(e)); }
  };

  const refresh = async () => {
    setRefreshing(true);
    try { await apiRequest("GET", "/api/whatsapp/groups?refresh=1"); await refetch(); } catch { }
    setRefreshing(false);
  };

  if (!connected) {
    return <View style={styles.centerBox}><Ionicons name="notifications-outline" size={48} color={Colors.textMuted} /><Text style={styles.muted}>{c.notLinkedChats}</Text></View>;
  }

  const groups: any[] = data?.groups || [];
  return (
    <ScrollView contentContainerStyle={[styles.pad, { maxWidth: 900, width: "100%", alignSelf: "center" }]}>
      <View style={[styles.card, styles.tplHead]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{c.notifyOwner}</Text>
          <Text style={styles.muted}>{c.notifyOwnerHint}</Text>
        </View>
        <Switch value={alerts.notifyOwner} onValueChange={(v) => save({ ...alerts, notifyOwner: v })} />
      </View>

      <View style={styles.card}>
        <View style={styles.tplHead}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{c.group}</Text>
            <Text style={styles.muted}>{c.groupHint}</Text>
          </View>
          <Pressable onPress={refresh} disabled={refreshing} style={styles.linkBtn}>
            {refreshing ? <ActivityIndicator size="small" color={Colors.accent} /> : <Ionicons name="refresh" size={16} color={Colors.accent} />}
            <Text style={styles.linkText}>{c.refresh}</Text>
          </Pressable>
        </View>
        {isLoading ? <ActivityIndicator style={{ marginTop: 12 }} color={Colors.accent} /> : (
          <View style={{ marginTop: 10, gap: 6 }}>
            <GroupRow label={c.noGroup} selected={!alerts.groupJid} onPress={() => save({ ...alerts, groupJid: "", groupName: "" })} />
            {groups.map((g) => (
              <GroupRow key={g.id} label={g.name} sub={`${g.size} ${c.members}`} selected={alerts.groupJid === g.id}
                onPress={() => save({ ...alerts, groupJid: g.id, groupName: g.name, groupEnabled: true })} />
            ))}
            {!groups.length && <Text style={styles.muted}>{c.noGroups}</Text>}
          </View>
        )}
      </View>
      {!!msg && <Text style={[styles.flash, { color: Colors.textMuted }]}>{msg}</Text>}
    </ScrollView>
  );
}

function GroupRow({ label, sub, selected, onPress }: { label: string; sub?: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.groupRow, selected && styles.groupRowActive]}>
      <Ionicons name={selected ? "radio-button-on" : "radio-button-off"} size={20} color={selected ? Colors.success : Colors.textMuted} />
      <Text style={[styles.body, { flex: 1 }]} numberOfLines={1}>{label}</Text>
      {!!sub && <Text style={styles.chatTime}>{sub}</Text>}
    </Pressable>
  );
}

const styles = themedStyles((Colors) => ({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.cardBorder, backgroundColor: Colors.surface },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: "800", color: Colors.text },
  iconBtn: { padding: 4 },
  pill: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  pillDot: { width: 8, height: 8, borderRadius: 4 },
  pillText: { fontSize: 12, fontWeight: "700" },
  tabs: { flexDirection: "row", backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.cardBorder },
  tab: { flex: 1, paddingVertical: 12, alignItems: "center", borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabActive: { borderBottomColor: "#25D366" },
  tabText: { color: Colors.textMuted, fontWeight: "700", fontSize: 12 },
  tabTextActive: { color: Colors.text },
  pad: { padding: 16, gap: 14 },
  card: { backgroundColor: Colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.cardBorder },
  cardTitle: { color: Colors.text, fontSize: 15, fontWeight: "800" },
  body: { color: Colors.text, fontSize: 14, lineHeight: 21 },
  muted: { color: Colors.textMuted, fontSize: 13, lineHeight: 19, marginTop: 4 },
  label: { color: Colors.textSecondary, fontSize: 12, fontWeight: "700", marginTop: 6 },
  errorText: { color: Colors.danger, fontSize: 13, fontWeight: "600", marginTop: 8 },
  flash: { fontSize: 13, fontWeight: "700", textAlign: "center" },
  linkedRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  bigIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.success + "1F", alignItems: "center", justifyContent: "center" },
  qrCard: { flexDirection: "row", flexWrap: "wrap", gap: 20, alignItems: "center", marginTop: 16 },
  qrFrame: { backgroundColor: "#fff", padding: 12, borderRadius: 16 },
  stepRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  stepNum: { width: 26, height: 26, borderRadius: 13, backgroundColor: "#25D366", alignItems: "center", justifyContent: "center" },
  stepNumText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  stepText: { color: Colors.text, fontSize: 14, flex: 1 },
  btnRow: { flexDirection: "row", gap: 10, alignItems: "center", flexWrap: "wrap" },
  btn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12, minHeight: 46 },
  btnGreen: { backgroundColor: "#128C7E" },
  btnDanger: { borderWidth: 1, borderColor: Colors.danger },
  btnText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  input: { borderWidth: 1, borderColor: Colors.cardBorder, backgroundColor: Colors.surfaceLight, color: Colors.text, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  logLine: { color: Colors.textSecondary, fontSize: 12, marginTop: 6, fontFamily: Platform.OS === "web" ? "monospace" : undefined },
  centerBox: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 24 },
  chatList: { flex: 1, backgroundColor: Colors.surface },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 8, margin: 10, paddingHorizontal: 12, borderRadius: 12, backgroundColor: Colors.surfaceLight, borderWidth: 1, borderColor: Colors.cardBorder },
  searchInput: { flex: 1, color: Colors.text, paddingVertical: 9, fontSize: 14 },
  chatRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.cardBorder },
  chatRowActive: { backgroundColor: Colors.surfaceLight },
  chatAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.success + "26", alignItems: "center", justifyContent: "center" },
  chatTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  chatName: { flex: 1, color: Colors.text, fontWeight: "700", fontSize: 14 },
  chatTime: { color: Colors.textMuted, fontSize: 11 },
  chatLast: { flex: 1, color: Colors.textSecondary, fontSize: 13, marginTop: 2 },
  badge: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: "#25D366", alignItems: "center", justifyContent: "center", paddingHorizontal: 5 },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  convHeader: { flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderBottomWidth: 1, borderBottomColor: Colors.cardBorder, backgroundColor: Colors.surface },
  convBody: { flex: 1, backgroundColor: Colors.background },
  bubble: { maxWidth: "80%", borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8 },
  bubbleMe: { alignSelf: "flex-end", backgroundColor: "#128C7E33", borderWidth: 1, borderColor: "#128C7E55" },
  bubbleThem: { alignSelf: "flex-start", backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.cardBorder },
  bubbleSender: { color: Colors.info, fontSize: 12, fontWeight: "700", marginBottom: 2 },
  bubbleMedia: { color: Colors.textSecondary, fontSize: 13, fontWeight: "700" },
  bubbleText: { color: Colors.text, fontSize: 14, lineHeight: 20 },
  bubbleMeta: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-end", marginTop: 2 },
  bubbleTime: { color: Colors.textMuted, fontSize: 10 },
  composer: { flexDirection: "row", alignItems: "flex-end", gap: 8, padding: 10, borderTopWidth: 1, borderTopColor: Colors.cardBorder, backgroundColor: Colors.surface },
  sendBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: "#128C7E", alignItems: "center", justifyContent: "center" },
  langRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" },
  tplHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: Colors.surfaceLight },
  chipActive: { backgroundColor: "#128C7E", borderColor: "#128C7E" },
  chipText: { color: Colors.textSecondary, fontSize: 12, fontWeight: "700" },
  chipTextActive: { color: "#fff" },
  linkBtn: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", paddingVertical: 4 },
  linkText: { color: Colors.accent, fontSize: 13, fontWeight: "700" },
  groupRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: Colors.cardBorder },
  groupRowActive: { borderColor: Colors.success, backgroundColor: Colors.success + "14" },
  historyRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.cardBorder },
  historyCount: { color: Colors.success, fontWeight: "800", fontSize: 13 },
}));
