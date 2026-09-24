/**
 * The store's own WhatsApp: link it by QR, test it, read and answer chats,
 * edit the order messages customers get, and choose where new-order alerts
 * go. Server side: server/whatsappStoreRoutes.ts (sessions run in the
 * WhatsApp bridge process, so the link stays up after it is made).
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View, Text, Pressable, TextInput, ScrollView, FlatList, Image, Switch, ActivityIndicator,
  useWindowDimensions, KeyboardAvoidingView, Platform, Alert,
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
import { formatMoney, isZeroDecimalCurrency } from "@/lib/currency";
import { normalizeStorePhone, isValidStorePhone, storePhonePlaceholder, formatInStoreTz, storeYmd } from "@/components/store-locale";

type Tab = "connect" | "chats" | "templates" | "offers" | "alerts";

type ErrKey =
  | "notConnected" | "testNeedsPhone" | "queued" | "sendFailed" | "emptyMessage" | "phoneAndText"
  | "offerEmpty" | "linkFirst" | "noAudience" | "dailyCap" | "sessionRejected" | "unlinkedFromPhone"
  | "replaced" | "qrExpired" | "tooMany" | "timeout" | "slow" | "notOnWhatsApp";

const EN = {
  locale: "en-GB",
  title: "Store WhatsApp",
  tabs: { connect: "Connection", chats: "Chats", templates: "Order messages", offers: "Offers", alerts: "Alerts" } as Record<Tab, string>,
  connected: "Connected", connecting: "Connecting…", qr: "Waiting for scan", disconnected: "Not linked", offline: "Offline",
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
  noMessages: "No messages yet.",
  lang: "Message language", arabic: "العربية", english: "English",
  events: {
    order_new: "New order (to the store)", order_confirmed: "Order confirmation (customer)", status_accepted: "Order accepted",
    status_preparing: "Preparing", status_ready: "Order ready", status_on_way: "On the way",
    status_delivered: "Delivered", status_cancelled: "Cancelled",
  } as Record<string, string>,
  variables: "Variables — tap to insert", preview: "Preview", reset: "Restore default text", save: "Save", saved: "Saved",
  unsaved: "Unsaved changes",
  switchLangTitle: "Change message language?",
  switchLangMsg: "Your edited order messages will be replaced by the default texts in the new language.",
  switchLangOk: "Change",
  notifyOwner: "Send new orders to the store's number", notifyOwnerHint: "You get a WhatsApp message for every new order.",
  group: "Orders group", groupHint: "Pick a WhatsApp group (e.g. your staff group) that gets every new order.",
  noGroup: "No group", refresh: "Refresh list", members: "members", noGroups: "This number isn't in any group.",
  groupsNeedConnection: "Groups load only while WhatsApp is connected.",
  savedGroupMissing: "(no longer in the list)",
  offersIntro: "Send an offer or discount code to your customers from your store's number. Messages go out gradually (about one every 2 seconds) to protect your number, and any customer can stop them by replying STOP.",
  audience: "Send to", audAll: "All customers", audOnline: "Online-order customers", audWholesale: "Wholesale traders",
  optedOut: "opted out", remaining: "Left today",
  promo: "Discount code (optional)", noPromo: "No code", offerText: "Offer text", freeDelivery: "Free delivery",
  discount: (v: string) => `enjoy ${v} off your next order!`,
  discFree: "enjoy free delivery on your next order!",
  offerDefault: "🎁 Special offer from {{storeName}}!\n\nHi {{customerName}},\n\nOrder now: {{storeLink}}",
  offerWithCode: (d: string) => `🎁 Special offer from {{storeName}}!\n\nHi {{customerName}}, ${d}\n\nUse code: *{{promoCode}}*\nOrder now: {{storeLink}}`,
  sendOffer: (n: number) => `Send to ${n} customers`, confirmSend: (n: number) => `Tap again to send to ${n} customers`,
  offerSent: (n: number, m: number) => `✅ Sending the offer to ${n} customers — done in about ${m} min`,
  history: "Past offers", recipients: "recipients", optOutNote: "Added automatically: “Reply STOP to stop offers”",
  cancel: "Cancel", back: "Back", retry: "Retry",
  loadError: "Couldn't load this. Check the connection and try again.",
  phoneInvalid: "Enter the number with country code (at least 8 digits).",
  queuedNote: "Queued — it goes out as soon as WhatsApp is connected.",
  err: {
    notConnected: "The store's WhatsApp isn't connected right now.",
    testNeedsPhone: "Enter a number to send the test message to.",
    queued: "The message was queued and will be sent once WhatsApp is connected.",
    sendFailed: "Couldn't send the message.",
    emptyMessage: "The message is empty.",
    phoneAndText: "Enter the number with country code and the message text.",
    offerEmpty: "Write the offer text.",
    linkFirst: "Link the store's WhatsApp first.",
    noAudience: "No customers with a phone number in this group.",
    dailyCap: "Daily limit for offer messages reached — try again tomorrow.",
    sessionRejected: "WhatsApp rejected the session — retrying…",
    unlinkedFromPhone: "WhatsApp was unlinked from the phone — link it again.",
    replaced: "The session was opened somewhere else.",
    qrExpired: "The QR code expired — tap “Link WhatsApp” for a new one.",
    tooMany: "Too many attempts — please wait a moment and try again.",
    timeout: "WhatsApp is taking long to answer — the message may still go out. Check the chat in a moment.",
    slow: "No answer from the server — check the internet connection and try again.",
    notOnWhatsApp: "This number isn't registered on WhatsApp.",
  } as Record<ErrKey, string>,
  stuck: "This is taking longer than usual. Check the internet on this device and on the store's phone, then try again.",
  staleStatus: "Can't reach the server — the status shown may be out of date.",
};

type Copy = typeof EN;

const DE: Copy = {
  locale: "de-CH",
  title: "WhatsApp des Geschäfts",
  tabs: { connect: "Verbindung", chats: "Chats", templates: "Bestellnachrichten", offers: "Angebote", alerts: "Benachrichtigungen" },
  connected: "Verbunden", connecting: "Verbinde…", qr: "Warte auf Scan", disconnected: "Nicht verknüpft", offline: "Getrennt",
  linkedAs: "Verknüpft mit",
  intro: "Verknüpfe das WhatsApp deines Geschäfts einmalig: Bestellnachrichten gehen von deiner eigenen Nummer an die Kunden, und ihre Antworten kommen hier an. Die Verknüpfung bleibt aktiv, auch wenn die App geschlossen ist.",
  link: "WhatsApp verknüpfen", relink: "Neu verbinden", unlink: "Verknüpfung aufheben", unlinkConfirm: "Zum Bestätigen erneut tippen",
  steps: ["Öffne WhatsApp auf dem Telefon des Geschäfts", "Tippe auf ⋮ (oder Einstellungen) → Verknüpfte Geräte", "Tippe auf „Gerät hinzufügen“ und richte die Kamera auf den Code"],
  qrExpires: "Der Code erneuert sich automatisch – falls er abläuft, tippe erneut auf „WhatsApp verknüpfen“.",
  test: "Verbindungstest", testHint: "Sendet eine Testnachricht von der Nummer des Geschäfts. Leer lassen, um sie an die eigene Nummer des Geschäfts zu senden.",
  testPh: "Nummer mit Ländervorwahl (optional)", send: "Senden", testOk: "✅ Testnachricht gesendet – die Verbindung funktioniert",
  pending: "Nachrichten warten auf den Versand", activity: "Letzte Aktivität",
  search: "Chats durchsuchen", newChat: "Neue Nachricht", noChats: "Noch keine Chats. Kundennachrichten erscheinen hier, sobald sie eintreffen.",
  notLinkedChats: "Verknüpfe zuerst das WhatsApp des Geschäfts (Tab „Verbindung“).",
  pickChat: "Chat auswählen", typeMsg: "Nachricht schreiben…", phone: "Telefonnummer mit Ländervorwahl", message: "Nachricht",
  you: "Du", media: { image: "📷 Foto", video: "🎬 Video", audio: "🎤 Sprachnachricht", document: "📄 Datei", sticker: "Sticker", location: "📍 Standort", contact: "👤 Kontakt" },
  noMessages: "Noch keine Nachrichten.",
  lang: "Sprache der Nachrichten", arabic: "العربية", english: "English",
  events: {
    order_new: "Neue Bestellung (an das Geschäft)", order_confirmed: "Bestellbestätigung (Kunde)", status_accepted: "Bestellung angenommen",
    status_preparing: "In Zubereitung", status_ready: "Bestellung bereit", status_on_way: "Unterwegs",
    status_delivered: "Geliefert", status_cancelled: "Storniert",
  },
  variables: "Variablen – zum Einfügen tippen", preview: "Vorschau", reset: "Standardtext wiederherstellen", save: "Speichern", saved: "Gespeichert",
  unsaved: "Ungespeicherte Änderungen",
  switchLangTitle: "Sprache der Nachrichten ändern?",
  switchLangMsg: "Deine bearbeiteten Bestellnachrichten werden durch die Standardtexte der neuen Sprache ersetzt.",
  switchLangOk: "Ändern",
  notifyOwner: "Neue Bestellungen an die Nummer des Geschäfts senden", notifyOwnerHint: "Du erhältst für jede neue Bestellung eine WhatsApp-Nachricht.",
  group: "Bestellgruppe", groupHint: "Wähle eine WhatsApp-Gruppe (z. B. deine Mitarbeitergruppe), die jede neue Bestellung erhält.",
  noGroup: "Keine Gruppe", refresh: "Liste aktualisieren", members: "Mitglieder", noGroups: "Diese Nummer ist in keiner Gruppe.",
  groupsNeedConnection: "Gruppen werden nur geladen, solange WhatsApp verbunden ist.",
  savedGroupMissing: "(nicht mehr in der Liste)",
  offersIntro: "Sende ein Angebot oder einen Rabattcode von der Nummer deines Geschäfts an deine Kunden. Die Nachrichten gehen schrittweise raus (etwa eine alle 2 Sekunden), um deine Nummer zu schützen, und jeder Kunde kann sie mit der Antwort STOP abbestellen.",
  audience: "Senden an", audAll: "Alle Kunden", audOnline: "Kunden mit Online-Bestellungen", audWholesale: "Großhandelskunden",
  optedOut: "abgemeldet", remaining: "Heute noch möglich",
  promo: "Rabattcode (optional)", noPromo: "Kein Code", offerText: "Angebotstext", freeDelivery: "Kostenlose Lieferung",
  discount: (v: string) => `genieße ${v} Rabatt auf deine nächste Bestellung!`,
  discFree: "genieße kostenlose Lieferung bei deiner nächsten Bestellung!",
  offerDefault: "🎁 Sonderangebot von {{storeName}}!\n\nHallo {{customerName}},\n\nJetzt bestellen: {{storeLink}}",
  offerWithCode: (d: string) => `🎁 Sonderangebot von {{storeName}}!\n\nHallo {{customerName}}, ${d}\n\nCode: *{{promoCode}}*\nJetzt bestellen: {{storeLink}}`,
  sendOffer: (n: number) => `An ${n} Kunden senden`, confirmSend: (n: number) => `Erneut tippen, um an ${n} Kunden zu senden`,
  offerSent: (n: number, m: number) => `✅ Das Angebot wird an ${n} Kunden gesendet – fertig in etwa ${m} Min.`,
  history: "Frühere Angebote", recipients: "Empfänger", optOutNote: "Wird automatisch angehängt: „Reply STOP to stop offers“",
  cancel: "Abbrechen", back: "Zurück", retry: "Erneut versuchen",
  loadError: "Konnte nicht geladen werden. Prüfe die Verbindung und versuche es erneut.",
  phoneInvalid: "Gib die Nummer mit Ländervorwahl ein (mindestens 8 Ziffern).",
  queuedNote: "In der Warteschlange – wird gesendet, sobald WhatsApp verbunden ist.",
  err: {
    notConnected: "Das WhatsApp des Geschäfts ist gerade nicht verbunden.",
    testNeedsPhone: "Gib eine Nummer für die Testnachricht ein.",
    queued: "Die Nachricht wartet in der Warteschlange und wird gesendet, sobald WhatsApp verbunden ist.",
    sendFailed: "Die Nachricht konnte nicht gesendet werden.",
    emptyMessage: "Die Nachricht ist leer.",
    phoneAndText: "Gib die Nummer mit Ländervorwahl und den Nachrichtentext ein.",
    offerEmpty: "Schreibe den Angebotstext.",
    linkFirst: "Verknüpfe zuerst das WhatsApp des Geschäfts.",
    noAudience: "In dieser Gruppe gibt es keine Kunden mit Telefonnummer.",
    dailyCap: "Tageslimit für Angebotsnachrichten erreicht – versuche es morgen erneut.",
    sessionRejected: "WhatsApp hat die Sitzung abgelehnt – neuer Versuch…",
    unlinkedFromPhone: "WhatsApp wurde auf dem Telefon getrennt – bitte neu verknüpfen.",
    replaced: "Die Sitzung wurde an einem anderen Ort geöffnet.",
    qrExpired: "Der QR-Code ist abgelaufen – tippe auf „WhatsApp verknüpfen“ für einen neuen.",
    tooMany: "Zu viele Versuche – bitte kurz warten und erneut versuchen.",
    timeout: "WhatsApp antwortet langsam – die Nachricht wird eventuell trotzdem gesendet. Prüfe den Chat gleich.",
    slow: "Keine Antwort vom Server – prüfe die Internetverbindung und versuche es erneut.",
    notOnWhatsApp: "Diese Nummer ist nicht bei WhatsApp registriert.",
  },
  stuck: "Das dauert länger als üblich. Prüfe das Internet auf diesem Gerät und auf dem Telefon des Geschäfts und versuche es dann erneut.",
  staleStatus: "Server nicht erreichbar – der angezeigte Status ist eventuell veraltet.",
};

const AR: Copy = {
  locale: "ar-u-nu-latn",
  title: "واتساب المتجر",
  tabs: { connect: "الربط", chats: "المحادثات", templates: "رسائل الطلبات", offers: "العروض", alerts: "التنبيهات" },
  connected: "متصل", connecting: "جاري الاتصال…", qr: "بانتظار مسح الرمز", disconnected: "غير مربوط", offline: "غير متصل",
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
  you: "أنت", media: { image: "📷 صورة", video: "🎬 فيديو", audio: "🎤 رسالة صوتية", document: "📄 ملف", sticker: "ملصق", location: "📍 موقع", contact: "👤 جهة اتصال" },
  noMessages: "لا توجد رسائل بعد.",
  lang: "لغة الرسائل", arabic: "العربية", english: "English",
  events: {
    order_new: "طلب جديد (للمتجر)", order_confirmed: "تأكيد الطلب (للزبون)", status_accepted: "تم قبول الطلب",
    status_preparing: "قيد التحضير", status_ready: "الطلب جاهز", status_on_way: "في الطريق",
    status_delivered: "تم التوصيل", status_cancelled: "تم الإلغاء",
  },
  variables: "المتغيرات — اضغط لإضافتها", preview: "معاينة", reset: "استرجاع النص الأصلي", save: "حفظ", saved: "تم الحفظ",
  unsaved: "تغييرات غير محفوظة",
  switchLangTitle: "تغيير لغة الرسائل؟",
  switchLangMsg: "ستُستبدل رسائل الطلبات التي عدّلتها بالنصوص الافتراضية في اللغة الجديدة.",
  switchLangOk: "تغيير",
  notifyOwner: "إرسال الطلبات الجديدة إلى رقم المتجر", notifyOwnerHint: "تصلك رسالة بكل طلب جديد على واتساب المتجر.",
  group: "مجموعة الطلبات", groupHint: "اختر مجموعة واتساب (مثلاً مجموعة الموظفين) لتصلها كل الطلبات الجديدة.",
  noGroup: "بدون مجموعة", refresh: "تحديث القائمة", members: "عضو", noGroups: "هذا الرقم ليس عضواً في أي مجموعة.",
  groupsNeedConnection: "تظهر المجموعات فقط عندما يكون واتساب متصلاً.",
  savedGroupMissing: "(لم تعد في القائمة)",
  offersIntro: "أرسل عرضاً أو كود خصم لزبائنك من رقم متجرك. تُرسل الرسائل بالتدريج (رسالة كل ثانيتين تقريباً) لحماية رقمك، ويستطيع أي زبون إيقافها بالرد «إلغاء».",
  audience: "إلى من؟", audAll: "كل الزبائن", audOnline: "زبائن الطلبات الأونلاين", audWholesale: "تجار الجملة",
  optedOut: "أوقفوا العروض", remaining: "المتبقي اليوم",
  promo: "كود خصم (اختياري)", noPromo: "بدون كود", offerText: "نص العرض", freeDelivery: "توصيل مجاني",
  discount: (v: string) => `استمتع بخصم ${v} على طلبك القادم!`,
  discFree: "استمتع بتوصيل مجاني على طلبك القادم!",
  offerDefault: "🎁 عرض خاص من {{storeName}}!\n\nأهلاً {{customerName}}،\n\nاطلب الآن: {{storeLink}}",
  offerWithCode: (d: string) => `🎁 عرض خاص من {{storeName}}!\n\nأهلاً {{customerName}}، ${d}\n\nاستخدم الكود: *{{promoCode}}*\nاطلب الآن: {{storeLink}}`,
  sendOffer: (n: number) => `إرسال إلى ${n} زبون`, confirmSend: (n: number) => `اضغط مرة أخرى لتأكيد الإرسال إلى ${n} زبون`,
  offerSent: (n: number, m: number) => `✅ بدأ إرسال العرض إلى ${n} زبون — يكتمل خلال ${m} دقيقة تقريباً`,
  history: "العروض السابقة", recipients: "مستلم", optOutNote: "تُضاف تلقائياً: «لإيقاف رسائل العروض أرسل: إلغاء»",
  cancel: "إلغاء", back: "رجوع", retry: "إعادة المحاولة",
  loadError: "تعذّر التحميل. تحقّق من الاتصال وحاول مجدداً.",
  phoneInvalid: "اكتب الرقم مع رمز الدولة (8 أرقام على الأقل).",
  queuedNote: "وُضعت في الانتظار — ستُرسل فور اتصال واتساب.",
  err: {
    notConnected: "واتساب المتجر غير متصل حالياً",
    testNeedsPhone: "اكتب رقماً لإرسال رسالة الاختبار",
    queued: "تم وضع الرسالة في الانتظار — ستُرسل فور اتصال واتساب",
    sendFailed: "تعذّر الإرسال",
    emptyMessage: "الرسالة فارغة",
    phoneAndText: "اكتب الرقم مع رمز الدولة ونص الرسالة",
    offerEmpty: "اكتب نص العرض",
    linkFirst: "اربط واتساب المتجر أولاً",
    noAudience: "لا يوجد زبائن بأرقام هواتف في هذه الفئة",
    dailyCap: "وصلت للحد اليومي لرسائل العروض، جرّب غداً",
    sessionRejected: "واتساب رفض الجلسة — إعادة المحاولة…",
    unlinkedFromPhone: "تم إلغاء ربط واتساب من الهاتف — اربطه من جديد",
    replaced: "الجلسة فُتحت من مكان آخر",
    qrExpired: "انتهت صلاحية رمز QR — اضغط «ربط واتساب» للحصول على رمز جديد",
    tooMany: "محاولات كثيرة — انتظر قليلاً ثم أعد المحاولة",
    timeout: "واتساب يتأخر في الرد — قد تُرسل الرسالة رغم ذلك. تحقّق من المحادثة بعد قليل.",
    slow: "لا يوجد رد من الخادم — تحقّق من اتصال الإنترنت ثم أعد المحاولة.",
    notOnWhatsApp: "هذا الرقم غير مسجّل على واتساب.",
  },
  stuck: "العملية تأخذ وقتاً أطول من المعتاد. تحقّق من الإنترنت على هذا الجهاز وعلى هاتف المتجر ثم أعد المحاولة.",
  staleStatus: "تعذّر الوصول إلى الخادم — قد تكون الحالة المعروضة قديمة.",
};

// The server and the WhatsApp bridge answer in Arabic; show those messages in
// the screen's language.
const SERVER_MSG: [RegExp, ErrKey][] = [
  [/غير متصل حالياً/, "notConnected"],
  [/اكتب رقماً لإرسال رسالة الاختبار/, "testNeedsPhone"],
  [/تم وضع الرسالة في الانتظار/, "queued"],
  [/تعذّر الإرسال/, "sendFailed"],
  [/الرسالة فارغة/, "emptyMessage"],
  [/اكتب الرقم مع رمز الدولة ونص الرسالة/, "phoneAndText"],
  [/اكتب نص العرض/, "offerEmpty"],
  [/اربط واتساب المتجر أولاً/, "linkFirst"],
  [/لا يوجد زبائن بأرقام/, "noAudience"],
  [/الحد اليومي/, "dailyCap"],
  [/رفض الجلسة/, "sessionRejected"],
  [/إلغاء ربط واتساب من الهاتف/, "unlinkedFromPhone"],
  [/فُتحت من مكان آخر/, "replaced"],
  [/انتهت صلاحية رمز QR/, "qrExpired"],
  [/غير مسجّل على واتساب/, "notOnWhatsApp"],
  [/^not linked$/i, "linkFirst"],
  [/too many requests/i, "tooMany"],
];

function localize(raw: string, c: Copy): string {
  for (const [re, k] of SERVER_MSG) if (re.test(raw)) return c.err[k];
  return raw;
}

/** `sending`: the request was a send, which may still go out after a timeout. */
function errText(e: unknown, c: Copy, sending = false): string {
  const name = String((e as any)?.name || "");
  const message = String((e as any)?.message || "");
  // apiRequest aborts after 20 s; sends wait on WhatsApp for up to 60 s.
  if (name === "AbortError" || /abort/i.test(message)) return sending ? c.err.timeout : c.err.slow;
  if (/network request failed|failed to fetch|load failed|networkerror/i.test(message)) return c.err.slow;
  return localize(apiErrorMessage(e), c);
}

/**
 * GET through apiRequest so every poll has its 20 s timeout: on a slow line a
 * hung request fails and is retried instead of leaving a spinner forever
 * (react-query never starts a second poll while one is still running).
 */
async function jsonQuery({ queryKey }: { queryKey: readonly unknown[] }): Promise<any> {
  const res = await apiRequest("GET", String(queryKey[0]));
  return res.json();
}

function confirmAction(title: string, message: string, okLabel: string, cancelLabel: string, onYes: () => void) {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    if (window.confirm(`${title}\n\n${message}`)) onYes();
    return;
  }
  Alert.alert(title, message, [
    { text: cancelLabel, style: "cancel" },
    { text: okLabel, style: "destructive", onPress: onYes },
  ]);
}

const digits = (v: string) => String(v || "").replace(/\D/g, "");

/** Store-format phone (SYP: 09… / +963… / 00963… → 9639…), digits only for the server. */
function phoneForServer(raw: string): string {
  return digits(normalizeStorePhone(raw));
}

function phoneOk(raw: string): boolean {
  return isValidStorePhone(raw) && phoneForServer(raw).length >= 8;
}

/** "+963 944 123 456" for Syrian mobiles, "+<digits>" otherwise; LRM keeps the "+" in place in Arabic text. */
function displayPhone(raw: string | null | undefined): string {
  const d = digits(String(raw || ""));
  if (!d) return "";
  const pretty = /^9639\d{8}$/.test(d) ? `+963 ${d.slice(3, 6)} ${d.slice(6, 9)} ${d.slice(9)}` : `+${d}`;
  return `‎${pretty}`;
}

/**
 * Preview values for the message templates, in the template language and the
 * store's currency / time zone (the server fills the real ones the same way).
 */
function sampleVars(lang: "ar" | "en"): Record<string, string> {
  const zero = isZeroDecimalCurrency();
  const m = (syp: number, other: number) => formatMoney(zero ? syp : other);
  const ar = lang === "ar";
  return {
    orderNumber: "DEL-1042",
    orderTime: formatInStoreTz(new Date(), "en-GB", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }),
    storeName: "Kassenta",
    customerName: ar ? "أحمد" : "Ahmad",
    customerPhone: zero ? "+963 944 123 456" : "+41 79 123 45 67",
    orderType: ar ? "🚚 توصيل" : "🚚 Delivery",
    table: "",
    address: ar ? "دمشق، المزة، الطابق 3" : "Main Street 12, Floor 3",
    scheduledAt: "",
    items: ar
      ? `▫️ 2 × شاورما (كبير) — ${m(30000, 24)}\n      + صلصة ثوم\n▫️ 2 × عيران — ${m(8000, 8)}`
      : `▫️ 2 × Shawarma (Large) — ${m(30000, 24)}\n      + Garlic sauce\n▫️ 2 × Ayran — ${m(8000, 8)}`,
    itemCount: "4",
    subtotal: m(38000, 32),
    discount: m(3000, 3),
    deliveryFee: m(5000, 5),
    total: m(40000, 34),
    paymentMethod: ar ? "نقداً عند الاستلام" : "Cash on delivery",
    notes: ar ? "الرجاء الرنّ مرتين" : "Please ring twice",
    eta: ar ? "35 دقيقة" : "35 min",
    trackingLink: "https://kassenta.com/track/…",
  };
}

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

/** Times are shown in the store's time zone (Asia/Damascus for SYP stores). */
function clock(v: string | number | Date, locale: string) {
  return formatInStoreTz(v, locale, { hour: "2-digit", minute: "2-digit" });
}

function timeLabel(v: string | null | undefined, locale: string) {
  if (!v) return "";
  const d = new Date(v);
  if (isNaN(d.getTime())) return "";
  return storeYmd(d) === storeYmd(new Date())
    ? clock(d, locale)
    : formatInStoreTz(d, locale, { day: "numeric", month: "short" });
}

function chatTitle(c: any) {
  return c.name || (c.phone ? displayPhone(c.phone) : String(c.jid || "").split("@")[0]);
}

function isLinked(session: any) {
  return session?.status === "connected" || !!session?.linked;
}

export default function WhatsAppScreen() {
  const { language } = useLanguage();
  const c: Copy = language === "ar" ? AR : language === "de" ? DE : EN;
  const rtl = language === "ar";
  const [tab, setTab] = useState<Tab>("connect");
  const { data: session, refetch, isLoading, error, isFetching } = useQuery<any>({
    queryKey: ["/api/whatsapp/session"],
    queryFn: jsonQuery,
    // Poll fast while a QR code is shown / the link is being made, so a new
    // code and the "connected" state show up without a manual refresh.
    refetchInterval: (q: any) => {
      const st = q?.state?.data?.status;
      return st === "qr_ready" || st === "connecting" ? 2000 : 15000;
    },
  });
  const status: string = session?.status || "disconnected";

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/settings" as any))} style={styles.iconBtn} hitSlop={8} accessibilityRole="button" accessibilityLabel={c.back}>
          <Ionicons name={rtl ? "arrow-forward" : "arrow-back"} size={22} color={Colors.text} />
        </Pressable>
        <Ionicons name="logo-whatsapp" size={22} color="#25D366" />
        <Text style={styles.headerTitle} numberOfLines={1}>{c.title}</Text>
        {!!session && <StatusPill status={status} linked={!!session?.linked} c={c} />}
      </View>
      <View style={styles.tabsBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {(["connect", "chats", "templates", "offers", "alerts"] as Tab[]).map((t) => (
            <Pressable key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabActive]} accessibilityRole="tab" accessibilityState={{ selected: tab === t }}>
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]} numberOfLines={1}>{c.tabs[t]}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
      <View style={{ flex: 1 }}>
        {!session ? (
          isLoading ? <ActivityIndicator style={{ marginTop: 40 }} color={Colors.accent} /> : (
            <View style={styles.centerBox}>
              <Ionicons name="cloud-offline-outline" size={44} color={Colors.textMuted} />
              <Text style={[styles.muted, { textAlign: "center" }]}>{error ? errText(error, c) : c.loadError}</Text>
              <Pressable onPress={() => refetch()} style={[styles.btn, styles.btnOutline]}>
                <Ionicons name="refresh" size={16} color={Colors.text} />
                <Text style={[styles.btnText, { color: Colors.text }]}>{c.retry}</Text>
              </Pressable>
            </View>
          )
        ) : (
          <>
            {!!error && (
              <Pressable onPress={() => refetch()} disabled={isFetching} style={styles.banner} accessibilityRole="button">
                <Ionicons name="cloud-offline-outline" size={16} color={Colors.warning} />
                <Text style={styles.bannerText}>{c.staleStatus}</Text>
                {isFetching ? <ActivityIndicator size="small" color={Colors.warning} /> : <Text style={styles.linkText}>{c.retry}</Text>}
              </Pressable>
            )}
            {tab === "connect" && <ConnectTab c={c} session={session} refetch={refetch} />}
            {tab === "chats" && <ChatsTab c={c} session={session} rtl={rtl} />}
            {tab === "templates" && <TemplatesTab c={c} rtl={rtl} />}
            {tab === "offers" && <OffersTab c={c} session={session} />}
            {tab === "alerts" && <AlertsTab c={c} session={session} />}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

function StatusPill({ status, linked, c }: { status: string; linked: boolean; c: Copy }) {
  const map: Record<string, [string, string]> = {
    connected: [c.connected, Colors.success],
    connecting: [c.connecting, Colors.warning],
    qr_ready: [c.qr, Colors.warning],
    // Linked but the socket is down (reconnecting / phone offline).
    offline: [c.offline, Colors.danger],
    disconnected: [c.disconnected, Colors.textMuted],
  };
  const key = status === "disconnected" && linked ? "offline" : status;
  const [label, color] = map[key] || map.disconnected;
  return (
    <View style={[styles.pill, { borderColor: color }]}>
      <View style={[styles.pillDot, { backgroundColor: color }]} />
      <Text style={[styles.pillText, { color }]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

// ── Connection ─────────────────────────────────────────────────────────────
function ConnectTab({ c, session, refetch }: { c: Copy; session: any; refetch: () => void }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState<null | "connect" | "logout" | "test">(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirmUnlink, setConfirmUnlink] = useState(false);
  const confirmTimer = useRef<any>(null);
  const [testPhone, setTestPhone] = useState("");
  const status: string = session?.status || "disconnected";
  const linked = !!session?.linked;
  const { width } = useWindowDimensions();
  const wide = width >= 820;

  useEffect(() => () => { if (confirmTimer.current) clearTimeout(confirmTimer.current); }, []);

  // Pairing that hangs in "connecting" (slow line, bridge busy): after 45 s
  // say so and offer a retry instead of an endless spinner.
  const [waitingSince, setWaitingSince] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const waiting = status === "connecting" || status === "qr_ready";
  useEffect(() => {
    if (!waiting) { setWaitingSince(null); return; }
    setWaitingSince((w) => w ?? Date.now());
    const t = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(t);
  }, [waiting]);
  const stuck = status === "connecting" && !session?.qrCode && !!waitingSince && now - waitingSince > 45000;

  const act = async (kind: "connect" | "logout" | "test", fn: () => Promise<any>) => {
    if (busy) return;
    setBusy(kind);
    setMsg(null);
    try { await fn(); } catch (e) { setMsg({ ok: false, text: errText(e, c, kind === "test") }); }
    finally { setBusy(null); qc.invalidateQueries({ queryKey: ["/api/whatsapp/session"] }); refetch(); }
  };

  const connect = () => {
    setWaitingSince(null);
    act("connect", () => apiRequest("POST", "/api/whatsapp/session/connect"));
  };
  const unlink = () => {
    if (!confirmUnlink) {
      setConfirmUnlink(true);
      if (confirmTimer.current) clearTimeout(confirmTimer.current);
      confirmTimer.current = setTimeout(() => setConfirmUnlink(false), 4000);
      return;
    }
    setConfirmUnlink(false);
    act("logout", async () => {
      await apiRequest("POST", "/api/whatsapp/session/logout");
      // Chats, groups and campaigns belong to the old number.
      qc.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith("/api/whatsapp/") && q.queryKey[0] !== "/api/whatsapp/session" });
    });
  };
  // Stop a pairing that was started but never scanned (nothing linked yet).
  const cancelPairing = () => act("logout", () => apiRequest("POST", "/api/whatsapp/session/logout"));
  const test = () => {
    // Empty = the store's own number; otherwise 09… / +963… / 00963… → 9639….
    if (testPhone.trim() && !phoneOk(testPhone)) { setMsg({ ok: false, text: c.phoneInvalid }); return; }
    const phone = testPhone.trim() ? phoneForServer(testPhone) : "";
    act("test", async () => {
      await apiRequest("POST", "/api/whatsapp/session/test", { phone });
      setMsg({ ok: true, text: c.testOk });
    });
  };

  const qrBox = status === "qr_ready" && session?.qrCode ? (
    <View style={styles.qrCard}>
      <View style={styles.qrFrame}>
        <Image source={{ uri: session.qrCode }} style={{ width: 240, height: 240 }} accessibilityLabel="QR" />
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
    <ScrollView contentContainerStyle={[styles.pad, styles.narrow]} keyboardShouldPersistTaps="handled">
      <View style={styles.card}>
        {status === "connected" ? (
          <View style={styles.linkedRow}>
            <View style={styles.bigIcon}><Ionicons name="checkmark-circle" size={34} color={Colors.success} /></View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.cardTitle} numberOfLines={1}>{c.linkedAs}{session?.phone ? ` ${displayPhone(session.phone)}` : ""}</Text>
              {!!session?.name && <Text style={styles.muted} numberOfLines={1}>{session.name}</Text>}
            </View>
          </View>
        ) : (
          <Text style={styles.body}>{c.intro}</Text>
        )}
        {qrBox}
        {status === "connecting" && !qrBox && !stuck && <ActivityIndicator style={{ marginTop: 16 }} color={Colors.accent} />}
        {stuck && <Text style={[styles.muted, { color: Colors.warning }]}>{c.stuck}</Text>}
        {!!session?.lastError && status !== "connected" && <Text style={styles.errorText}>{localize(String(session.lastError), c)}</Text>}
        <View style={[styles.btnRow, { marginTop: 16 }]}>
          {(status === "disconnected" || stuck) && (
            <Pressable onPress={connect} disabled={!!busy} style={[styles.btn, styles.btnGreen, !!busy && styles.disabled]}>
              {busy === "connect" ? <ActivityIndicator color="#fff" /> : <><Ionicons name="qr-code-outline" size={18} color="#fff" /><Text style={styles.btnText}>{linked ? c.relink : c.link}</Text></>}
            </Pressable>
          )}
          {!linked && (status === "qr_ready" || status === "connecting") && (
            <Pressable onPress={cancelPairing} disabled={!!busy} style={[styles.btn, styles.btnOutline, !!busy && styles.disabled]}>
              {busy === "logout" ? <ActivityIndicator color={Colors.text} /> : <Text style={[styles.btnText, { color: Colors.text }]}>{c.cancel}</Text>}
            </Pressable>
          )}
          {(status === "connected" || linked) && (
            <Pressable onPress={unlink} disabled={!!busy} style={[styles.btn, styles.btnDanger, confirmUnlink && { backgroundColor: Colors.danger }, !!busy && styles.disabled]}>
              {busy === "logout" ? <ActivityIndicator color={Colors.danger} /> : <>
                <Ionicons name="unlink-outline" size={18} color={confirmUnlink ? "#fff" : Colors.danger} />
                <Text style={[styles.btnText, { color: confirmUnlink ? "#fff" : Colors.danger }]}>{confirmUnlink ? c.unlinkConfirm : c.unlink}</Text>
              </>}
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
              keyboardType="phone-pad" style={[styles.input, { flex: 1, minWidth: 200 }]} onSubmitEditing={test} />
            <Pressable onPress={test} disabled={!!busy} style={[styles.btn, styles.btnGreen, !!busy && styles.disabled]}>
              {busy === "test" ? <ActivityIndicator color="#fff" /> : <><Ionicons name="paper-plane-outline" size={18} color="#fff" /><Text style={styles.btnText}>{c.send}</Text></>}
            </Pressable>
          </View>
        </View>
      )}

      {!!msg && <Text style={[styles.flash, { color: msg.ok ? Colors.success : Colors.danger }]}>{msg.text}</Text>}

      {!!session?.pending && <Text style={[styles.muted, { textAlign: "center" }]}>{session.pending} {c.pending}</Text>}

      {!!session?.log?.length && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{c.activity}</Text>
          {session.log.slice(0, 8).map((l: any, i: number) => (
            <Text key={i} style={styles.logLine}>{formatInStoreTz(l.time, c.locale, { hour: "2-digit", minute: "2-digit", second: "2-digit" })}  {l.event}</Text>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

// ── Chats ──────────────────────────────────────────────────────────────────
function ChatsTab({ c, session, rtl }: { c: Copy; session: any; rtl: boolean }) {
  const { width } = useWindowDimensions();
  const wide = width >= 820;
  const [q, setQ] = useState("");
  const [active, setActive] = useState<any | null>(null);
  const [composeNew, setComposeNew] = useState(false);
  const linked = isLinked(session);
  const { data: chats, isLoading, error, refetch } = useQuery<any[]>({
    queryKey: [`/api/whatsapp/chats${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`],
    queryFn: jsonQuery,
    refetchInterval: 5000,
    enabled: linked,
    // Keep the last list while a new search runs (no spinner flash per keystroke).
    placeholderData: (prev) => prev,
  });

  if (!linked) {
    return <View style={styles.centerBox}><Ionicons name="chatbubbles-outline" size={48} color={Colors.textMuted} /><Text style={[styles.muted, { textAlign: "center" }]}>{c.notLinkedChats}</Text></View>;
  }

  const list = (
    <View style={[styles.chatList, wide && { width: 340, flex: 0, borderEndWidth: 1, borderEndColor: Colors.cardBorder }]}>
      <View style={styles.searchRow}>
        <Ionicons name="search" size={16} color={Colors.textMuted} />
        <TextInput value={q} onChangeText={setQ} placeholder={c.search} placeholderTextColor={Colors.textMuted} style={styles.searchInput} />
        {!!q && (
          <Pressable onPress={() => setQ("")} style={styles.iconBtn} hitSlop={6} accessibilityLabel={c.cancel}>
            <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
          </Pressable>
        )}
        <Pressable onPress={() => { setComposeNew(true); setActive(null); }} style={styles.iconBtn} hitSlop={6} accessibilityRole="button" accessibilityLabel={c.newChat}>
          <Ionicons name="create-outline" size={20} color={Colors.accent} />
        </Pressable>
      </View>
      {isLoading ? <ActivityIndicator style={{ marginTop: 24 }} color={Colors.accent} /> : error && !chats ? (
        <View style={[styles.centerBox, { flex: 0 }]}>
          <Text style={[styles.errorText, { textAlign: "center" }]}>{errText(error, c)}</Text>
          <Pressable onPress={() => refetch()} style={styles.linkBtn}><Ionicons name="refresh" size={14} color={Colors.accent} /><Text style={styles.linkText}>{c.retry}</Text></Pressable>
        </View>
      ) : (
        <FlatList
          data={chats || []}
          keyExtractor={(x) => x.jid}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={<Text style={[styles.muted, { padding: 20, textAlign: "center" }]}>{c.noChats}</Text>}
          renderItem={({ item }) => (
            <Pressable onPress={() => { setActive(item); setComposeNew(false); }} style={[styles.chatRow, active?.jid === item.jid && styles.chatRowActive]}>
              <View style={[styles.chatAvatar, item.isGroup && { backgroundColor: Colors.info + "33" }]}>
                <Ionicons name={item.isGroup ? "people" : "person"} size={18} color={item.isGroup ? Colors.info : Colors.success} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={styles.chatTop}>
                  <Text style={styles.chatName} numberOfLines={1}>{chatTitle(item)}</Text>
                  <Text style={styles.chatTime}>{timeLabel(item.lastAt, c.locale)}</Text>
                </View>
                <View style={styles.chatTop}>
                  <Text style={styles.chatLast} numberOfLines={1}>{item.lastFromMe ? `${c.you}: ` : ""}{item.lastMessage}</Text>
                  {item.unread > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{item.unread > 99 ? "99+" : item.unread}</Text></View>}
                </View>
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );

  const pane = composeNew
    ? <NewMessage c={c} rtl={rtl} onCancel={() => setComposeNew(false)} onDone={() => setComposeNew(false)} />
    : active
      ? <Conversation key={active.jid} c={c} chat={active} rtl={rtl} onBack={wide ? undefined : () => setActive(null)} />
      : wide ? <View style={styles.centerBox}><Ionicons name="logo-whatsapp" size={56} color={Colors.textMuted} /><Text style={styles.muted}>{c.pickChat}</Text></View> : null;

  if (wide) return <View style={{ flex: 1, flexDirection: "row" }}>{list}<View style={{ flex: 1, minWidth: 0 }}>{pane}</View></View>;
  return pane || list;
}

function Conversation({ c, chat, rtl, onBack }: { c: Copy; chat: any; rtl: boolean; onBack?: () => void }) {
  const qc = useQueryClient();
  const jid = encodeURIComponent(chat.jid);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const listRef = useRef<FlatList>(null);
  const { data: messages, isLoading } = useQuery<any[]>({
    queryKey: [`/api/whatsapp/chats/${jid}/messages`],
    queryFn: jsonQuery,
    refetchInterval: 4000,
  });

  useEffect(() => {
    apiRequest("POST", `/api/whatsapp/chats/${jid}/read`).then(() => qc.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith("/api/whatsapp/chats") && !String(q.queryKey[0]).includes("/messages") })).catch(() => { });
  }, [chat.jid, messages?.length]);

  const refreshAfterSend = () => {
    qc.invalidateQueries({ queryKey: [`/api/whatsapp/chats/${jid}/messages`] });
    qc.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith("/api/whatsapp/chats") && !String(q.queryKey[0]).includes("/messages") });
  };

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    setNotice(null);
    try {
      const res = await apiRequest("POST", `/api/whatsapp/chats/${jid}/send`, { text: body });
      const r = await res.json().catch(() => ({}));
      setText("");
      if (r && r.ok === false && r.queued) setNotice(c.queuedNote);
      // The bridge stores the outgoing message a moment after sending.
      setTimeout(refreshAfterSend, 600);
    } catch (e) {
      setError(errText(e, c, true));
      setTimeout(refreshAfterSend, 600);
    }
    finally { setSending(false); }
  };

  const canSend = !!text.trim() && !sending;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.convHeader}>
        {onBack && (
          <Pressable onPress={onBack} style={styles.iconBtn} hitSlop={8} accessibilityRole="button" accessibilityLabel={c.back}>
            <Ionicons name={rtl ? "chevron-forward" : "chevron-back"} size={22} color={Colors.text} />
          </Pressable>
        )}
        <View style={[styles.chatAvatar, chat.isGroup && { backgroundColor: Colors.info + "33" }]}>
          <Ionicons name={chat.isGroup ? "people" : "person"} size={18} color={chat.isGroup ? Colors.info : Colors.success} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.chatName} numberOfLines={1}>{chatTitle(chat)}</Text>
          {!!chat.phone && !!chat.name && <Text style={styles.chatTime}>{displayPhone(chat.phone)}</Text>}
        </View>
      </View>
      <FlatList
        ref={listRef}
        style={styles.convBody}
        contentContainerStyle={{ padding: 12, gap: 6, flexGrow: 1 }}
        data={messages || []}
        keyExtractor={(m) => String(m.id)}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={isLoading
          ? <ActivityIndicator style={{ marginTop: 24 }} color={Colors.accent} />
          : <Text style={[styles.muted, { textAlign: "center", marginTop: 24 }]}>{c.noMessages}</Text>}
        renderItem={({ item: m }) => (
          <View style={[styles.bubble, m.fromMe ? styles.bubbleMe : styles.bubbleThem]}>
            {chat.isGroup && !m.fromMe && !!m.senderName && <Text style={styles.bubbleSender}>{m.senderName}</Text>}
            {m.type !== "text" && <Text style={styles.bubbleMedia}>{c.media[m.type] || m.type}</Text>}
            {!!m.body && <Text style={styles.bubbleText} selectable>{m.body}</Text>}
            <View style={styles.bubbleMeta}>
              <Text style={styles.bubbleTime}>{clock(m.ts, c.locale)}</Text>
              {m.fromMe && <Ionicons name={m.status >= 3 ? "checkmark-done" : "checkmark"} size={14} color={m.status >= 4 ? "#34B7F1" : Colors.textMuted} />}
            </View>
          </View>
        )}
      />
      {!!error && <Text style={[styles.errorText, { paddingHorizontal: 12 }]}>{error}</Text>}
      {!!notice && <Text style={[styles.muted, { paddingHorizontal: 12 }]}>{notice}</Text>}
      <View style={styles.composer}>
        <TextInput value={text} onChangeText={(v) => { setText(v); if (error) setError(null); }} placeholder={c.typeMsg} placeholderTextColor={Colors.textMuted}
          style={[styles.input, { flex: 1, maxHeight: 120 }]} multiline maxLength={4000}
          onKeyPress={(e: any) => {
            if (Platform.OS === "web" && e.nativeEvent.key === "Enter" && !e.nativeEvent.shiftKey) { e.preventDefault?.(); send(); }
          }} />
        <Pressable onPress={send} disabled={!canSend} style={[styles.sendBtn, !canSend && styles.disabled]} accessibilityRole="button" accessibilityLabel={c.send}>
          {sending ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="send" size={18} color="#fff" style={rtl ? { transform: [{ scaleX: -1 }] } : undefined} />}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function NewMessage({ c, rtl, onDone, onCancel }: { c: Copy; rtl: boolean; onDone: () => void; onCancel: () => void }) {
  const qc = useQueryClient();
  const [phone, setPhone] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const send = async () => {
    if (busy) return;
    if (!phoneOk(phone)) { setErr(c.phoneInvalid); return; }
    if (!text.trim()) { setErr(c.err.emptyMessage); return; }
    setBusy(true);
    setErr(null);
    try {
      const res = await apiRequest("POST", "/api/whatsapp/send", { phone: phoneForServer(phone), text: text.trim() });
      const r = await res.json().catch(() => ({}));
      qc.invalidateQueries({ predicate: (q) => String(q.queryKey[0]).startsWith("/api/whatsapp/chats") });
      if (r && r.ok === false && r.queued) {
        // Keep the form open so the owner sees it has not gone out yet.
        setErr(c.err.queued);
        setPhone("");
        setText("");
        return;
      }
      onDone();
    } catch (e) { setErr(errText(e, c, true)); }
    finally { setBusy(false); }
  };
  const disabled = busy || !phone.trim() || !text.trim();
  return (
    <ScrollView contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
      <View style={styles.card}>
        <View style={styles.tplHead}>
          <Pressable onPress={onCancel} style={styles.iconBtn} hitSlop={8} accessibilityRole="button" accessibilityLabel={c.back}>
            <Ionicons name={rtl ? "chevron-forward" : "chevron-back"} size={22} color={Colors.text} />
          </Pressable>
          <Text style={[styles.cardTitle, { flex: 1 }]}>{c.newChat}</Text>
        </View>
        <Text style={styles.label}>{c.phone}</Text>
        <TextInput value={phone} onChangeText={(v) => { setPhone(v); if (err) setErr(null); }} keyboardType="phone-pad" placeholder={storePhonePlaceholder()} placeholderTextColor={Colors.textMuted} style={styles.input} />
        <Text style={styles.label}>{c.message}</Text>
        <TextInput value={text} onChangeText={(v) => { setText(v); if (err) setErr(null); }} multiline maxLength={4000} style={[styles.input, { minHeight: 100, textAlignVertical: "top" }]} />
        {!!err && <Text style={styles.errorText}>{err}</Text>}
        <View style={[styles.btnRow, { marginTop: 12 }]}>
          <Pressable onPress={send} disabled={disabled} style={[styles.btn, styles.btnGreen, disabled && styles.disabled]}>
            {busy ? <ActivityIndicator color="#fff" /> : <><Ionicons name="send" size={16} color="#fff" /><Text style={styles.btnText}>{c.send}</Text></>}
          </Pressable>
          <Pressable onPress={onCancel} disabled={busy} style={[styles.btn, styles.btnOutline]}>
            <Text style={[styles.btnText, { color: Colors.text }]}>{c.cancel}</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

// ── Templates ──────────────────────────────────────────────────────────────
function TemplatesTab({ c, rtl }: { c: Copy; rtl: boolean }) {
  const { data, refetch, error, isLoading } = useQuery<any>({ queryKey: ["/api/whatsapp/templates"], queryFn: jsonQuery });
  const [lang, setLang] = useState<"ar" | "en">("ar");
  const [events, setEvents] = useState<any[]>([]);
  const [open, setOpen] = useState<string | null>("order_confirmed");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!data) return;
    setLang(data.lang === "en" ? "en" : "ar");
    setEvents((data.events || []).map((e: any) => ({ ...e })));
  }, [data]);

  const dirty = useMemo(() => {
    const saved: any[] = data?.events || [];
    return events.some((e) => {
      const s = saved.find((x) => x.event === e.event);
      return !s || s.enabled !== e.enabled || s.text !== e.text;
    });
  }, [events, data]);

  const preview = useMemo(() => sampleVars(lang), [lang]);

  const update = (event: string, patch: any) => {
    setMsg(null);
    setEvents((list) => list.map((e) => (e.event === event ? { ...e, ...patch } : e)));
  };

  const save = async (nextLang = lang) => {
    if (busy) return;
    setBusy(true);
    setMsg(null);
    try {
      await apiRequest("PUT", "/api/whatsapp/templates", {
        lang: nextLang,
        // Switching language: keep only on/off, texts fall back to the new language's defaults.
        events: events.map((e) => ({ event: e.event, enabled: e.enabled, text: nextLang === lang && e.text !== e.defaultText ? e.text : "" })),
      });
      await refetch();
      setMsg({ ok: true, text: c.saved });
    } catch (e) { setMsg({ ok: false, text: errText(e, c) }); }
    finally { setBusy(false); }
  };

  const switchLang = (l: "ar" | "en") => {
    if (l === lang || busy) return;
    const customized = events.some((e) => e.text !== e.defaultText);
    if (!customized) { save(l); return; }
    confirmAction(c.switchLangTitle, c.switchLangMsg, c.switchLangOk, c.cancel, () => save(l));
  };

  if (!data) {
    if (isLoading) return <ActivityIndicator style={{ marginTop: 32 }} color={Colors.accent} />;
    return (
      <View style={styles.centerBox}>
        <Text style={[styles.errorText, { textAlign: "center" }]}>{error ? errText(error, c) : c.loadError}</Text>
        <Pressable onPress={() => refetch()} style={styles.linkBtn}><Ionicons name="refresh" size={14} color={Colors.accent} /><Text style={styles.linkText}>{c.retry}</Text></Pressable>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={[styles.pad, styles.narrow]} keyboardShouldPersistTaps="handled">
      <View style={[styles.card, styles.langRow]}>
        <Text style={styles.cardTitle}>{c.lang}</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {(["ar", "en"] as const).map((l) => (
            <Pressable key={l} onPress={() => switchLang(l)} disabled={busy} style={[styles.chip, lang === l && styles.chipActive]}>
              <Text style={[styles.chipText, lang === l && styles.chipTextActive]}>{l === "ar" ? c.arabic : c.english}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {events.map((e) => {
        const expanded = open === e.event;
        return (
          <View key={e.event} style={[styles.card, !e.enabled && { opacity: 0.75 }]}>
            <View style={styles.tplHead}>
              <Pressable onPress={() => setOpen(expanded ? null : e.event)} style={[styles.tplHead, { flex: 1, minHeight: 44 }]} accessibilityRole="button" accessibilityState={{ expanded }}>
                <Ionicons name={expanded ? "chevron-down" : rtl ? "chevron-back" : "chevron-forward"} size={18} color={Colors.textMuted} />
                <Text style={[styles.cardTitle, { flex: 1 }]} numberOfLines={2}>{c.events[e.event] || e.event}</Text>
              </Pressable>
              <Switch value={!!e.enabled} onValueChange={(v) => update(e.event, { enabled: v })} />
            </View>
            {expanded && (
              <View style={{ marginTop: 10, gap: 10 }}>
                <TextInput value={e.text} onChangeText={(v) => update(e.event, { text: v })} multiline maxLength={2000}
                  style={[styles.input, { minHeight: 140, textAlignVertical: "top" }]} />
                <Text style={styles.label}>{c.variables}</Text>
                <View style={styles.chips}>
                  {(e.variables || []).map((v: string) => (
                    <Pressable key={v} onPress={() => update(e.event, { text: `${e.text}${e.text.endsWith("\n") || !e.text ? "" : " "}{{${v}}}` })} style={styles.chip}>
                      <Text style={styles.chipText}>{`{{${v}}}`}</Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={styles.label}>{c.preview}</Text>
                <View style={[styles.bubble, styles.bubbleMe, { maxWidth: "100%" }]}>
                  <Text style={styles.bubbleText}>{render(e.text || e.defaultText || "", preview)}</Text>
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

      {dirty && !busy && <Text style={[styles.muted, { textAlign: "center", color: Colors.warning }]}>{c.unsaved}</Text>}
      <Pressable onPress={() => save()} disabled={busy || !dirty} style={[styles.btn, styles.btnGreen, { alignSelf: "stretch", justifyContent: "center" }, (busy || !dirty) && styles.disabled]}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{c.save}</Text>}
      </Pressable>
      {!!msg && <Text style={[styles.flash, { color: msg.ok ? Colors.success : Colors.danger }]}>{msg.text}</Text>}
    </ScrollView>
  );
}

// ── Offers ─────────────────────────────────────────────────────────────────
function OffersTab({ c, session }: { c: Copy; session: any }) {
  const qc = useQueryClient();
  const { tenant } = useLicense();
  const linked = isLinked(session);
  const { data, error, refetch } = useQuery<any>({ queryKey: ["/api/whatsapp/campaigns"], queryFn: jsonQuery, enabled: linked });
  const { data: promos } = useQuery<any[]>({
    queryKey: [`/api/delivery/promos?tenantId=${tenant?.id}`],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: linked && !!tenant?.id,
  });
  const [audience, setAudience] = useState<"all" | "online" | "wholesale">("all");
  const [promo, setPromo] = useState<any | null>(null);
  const [text, setText] = useState<string>(c.offerDefault);
  const [confirm, setConfirm] = useState(false);
  const confirmTimer = useRef<any>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => () => { if (confirmTimer.current) clearTimeout(confirmTimer.current); }, []);

  if (!linked) {
    return <View style={styles.centerBox}><Ionicons name="megaphone-outline" size={48} color={Colors.textMuted} /><Text style={[styles.muted, { textAlign: "center" }]}>{c.notLinkedChats}</Text></View>;
  }

  const counts = data?.audience || {};
  const target = Math.min(Number(counts[audience] || 0), Number(data?.remainingToday ?? 0));
  const activePromos = (Array.isArray(promos) ? promos : []).filter((p: any) => p.isActive !== false);

  const promoValue = (p: any) =>
    p.discountType === "percent" ? `${Number(p.discountValue)}%`
      : p.discountType === "free_delivery" ? c.freeDelivery
        : formatMoney(p.discountValue);

  const resetConfirm = () => { setConfirm(false); if (confirmTimer.current) clearTimeout(confirmTimer.current); };

  const pickPromo = (p: any | null) => {
    resetConfirm();
    setPromo(p);
    if (!p) { setText(c.offerDefault); return; }
    const d = String(p.description || "").trim()
      || (p.discountType === "free_delivery" ? c.discFree : c.discount(promoValue(p)));
    setText(c.offerWithCode(d));
  };

  const send = async () => {
    if (busy || !target || !text.trim()) return;
    if (!confirm) {
      setConfirm(true);
      if (confirmTimer.current) clearTimeout(confirmTimer.current);
      confirmTimer.current = setTimeout(() => setConfirm(false), 5000);
      return;
    }
    resetConfirm();
    setBusy(true);
    setMsg(null);
    try {
      const r = await (await apiRequest("POST", "/api/whatsapp/campaigns", { text: text.trim(), audience, promoCode: promo?.code || "" })).json();
      setMsg({ ok: true, text: c.offerSent(Number(r.recipients) || 0, Number(r.etaMinutes) || 1) });
    } catch (e) { setMsg({ ok: false, text: errText(e, c, true) }); }
    finally {
      setBusy(false);
      qc.invalidateQueries({ queryKey: ["/api/whatsapp/campaigns"] });
    }
  };

  const base = sampleVars(c.locale.startsWith("ar") ? "ar" : "en");
  const sample = { ...base, storeName: tenant?.name || base.storeName, promoCode: promo?.code || "", storeLink: "https://kassenta.com/order/…" };
  const audiences: ["all" | "online" | "wholesale", string][] = [["all", c.audAll], ["online", c.audOnline], ["wholesale", c.audWholesale]];
  const disabled = busy || !target || !text.trim();

  return (
    <ScrollView contentContainerStyle={[styles.pad, styles.narrow]} keyboardShouldPersistTaps="handled">
      <View style={styles.card}><Text style={styles.body}>{c.offersIntro}</Text></View>

      {!!error && !data && (
        <View style={styles.card}>
          <Text style={styles.errorText}>{errText(error, c)}</Text>
          <Pressable onPress={() => refetch()} style={styles.linkBtn}><Ionicons name="refresh" size={14} color={Colors.accent} /><Text style={styles.linkText}>{c.retry}</Text></Pressable>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{c.audience}</Text>
        <View style={[styles.chips, { marginTop: 10 }]}>
          {audiences.map(([k, label]) => (
            <Pressable key={k} onPress={() => { setAudience(k); resetConfirm(); }} style={[styles.chip, audience === k && styles.chipActive]}>
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
              <Text style={[styles.chipText, promo?.id === p.id && styles.chipTextActive]} numberOfLines={1}>
                {p.code} · {promoValue(p)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{c.offerText}</Text>
        <TextInput value={text} onChangeText={(v) => { setText(v); resetConfirm(); }} multiline maxLength={3000} style={[styles.input, { minHeight: 140, marginTop: 10, textAlignVertical: "top" }]} />
        <View style={[styles.chips, { marginTop: 8 }]}>
          {["customerName", "storeName", "storeLink", "promoCode"].map((v) => (
            <Pressable key={v} onPress={() => { resetConfirm(); setText((t) => `${t}${t.endsWith("\n") || !t ? "" : " "}{{${v}}}`); }} style={styles.chip}>
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

      <Pressable onPress={send} disabled={disabled}
        style={[styles.btn, styles.btnGreen, { alignSelf: "stretch", justifyContent: "center" }, confirm && { backgroundColor: Colors.warning }, disabled && styles.disabled]}>
        {busy ? <ActivityIndicator color="#fff" /> : <><Ionicons name="megaphone-outline" size={18} color="#fff" /><Text style={styles.btnText}>{confirm ? c.confirmSend(target) : c.sendOffer(target)}</Text></>}
      </Pressable>
      {!!msg && <Text style={[styles.flash, { color: msg.ok ? Colors.success : Colors.danger }]}>{msg.text}</Text>}

      {!!data?.campaigns?.length && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{c.history}</Text>
          {data.campaigns.map((k: any) => (
            <View key={k.id} style={styles.historyRow}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.body} numberOfLines={2}>{k.body}</Text>
                <Text style={styles.chatTime}>{formatInStoreTz(k.createdAt, c.locale, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}{k.promoCode ? `  ·  ${k.promoCode}` : ""}</Text>
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
function AlertsTab({ c, session }: { c: Copy; session: any }) {
  const qc = useQueryClient();
  const linked = isLinked(session);
  const connected = session?.status === "connected";
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const { data, refetch, isLoading, error } = useQuery<any>({
    queryKey: ["/api/whatsapp/groups"],
    queryFn: jsonQuery,
    enabled: connected,
  });
  const [alerts, setAlerts] = useState<any>({ notifyOwner: true, groupEnabled: true, groupJid: "", groupName: "" });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (saving) return;
    const a = data?.alerts || session?.alerts;
    if (a) setAlerts({ notifyOwner: a.notifyOwner !== false, groupEnabled: a.groupEnabled !== false, groupJid: a.groupJid || "", groupName: a.groupName || "" });
  }, [data, session?.alerts]);

  const save = async (next: any) => {
    if (saving) return;
    const prev = alerts;
    setAlerts(next);
    setMsg(null);
    setSaving(true);
    try {
      const r = await (await apiRequest("PUT", "/api/whatsapp/alerts", next)).json().catch(() => ({}));
      const stored = r?.alerts || next;
      // Both queries carry the saved alerts; keep them in step so switching
      // tabs doesn't show the old values from the cache.
      qc.setQueryData(["/api/whatsapp/groups"], (old: any) => (old ? { ...old, alerts: stored } : old));
      qc.setQueryData(["/api/whatsapp/session"], (old: any) => (old ? { ...old, alerts: stored } : old));
      setAlerts({ notifyOwner: stored.notifyOwner !== false, groupEnabled: stored.groupEnabled !== false, groupJid: stored.groupJid || "", groupName: stored.groupName || "" });
      setMsg({ ok: true, text: c.saved });
    } catch (e) {
      setAlerts(prev);
      setMsg({ ok: false, text: errText(e, c) });
    } finally { setSaving(false); }
  };

  const refresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    setMsg(null);
    try {
      const r = await (await apiRequest("GET", "/api/whatsapp/groups?refresh=1")).json();
      qc.setQueryData(["/api/whatsapp/groups"], r);
    } catch (e) {
      setMsg({ ok: false, text: errText(e, c) });
      refetch();
    } finally { setRefreshing(false); }
  };

  if (!linked) {
    return <View style={styles.centerBox}><Ionicons name="notifications-outline" size={48} color={Colors.textMuted} /><Text style={[styles.muted, { textAlign: "center" }]}>{c.notLinkedChats}</Text></View>;
  }

  const groups: any[] = data?.groups || [];
  const savedMissing = !!alerts.groupJid && !groups.some((g) => g.id === alerts.groupJid);
  return (
    <ScrollView contentContainerStyle={[styles.pad, styles.narrow]}>
      <View style={[styles.card, styles.tplHead]}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.cardTitle}>{c.notifyOwner}</Text>
          <Text style={styles.muted}>{c.notifyOwnerHint}</Text>
        </View>
        <Switch value={!!alerts.notifyOwner} disabled={saving} onValueChange={(v) => save({ ...alerts, notifyOwner: v })} />
      </View>

      <View style={styles.card}>
        <View style={styles.tplHead}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.cardTitle}>{c.group}</Text>
            <Text style={styles.muted}>{c.groupHint}</Text>
          </View>
          {connected && (
            <Pressable onPress={refresh} disabled={refreshing} style={[styles.linkBtn, { minHeight: 44 }]} hitSlop={6}>
              {refreshing ? <ActivityIndicator size="small" color={Colors.accent} /> : <Ionicons name="refresh" size={16} color={Colors.accent} />}
              <Text style={styles.linkText}>{c.refresh}</Text>
            </Pressable>
          )}
        </View>
        {connected && isLoading ? <ActivityIndicator style={{ marginTop: 12 }} color={Colors.accent} /> : (
          <View style={{ marginTop: 10, gap: 6 }}>
            <GroupRow label={c.noGroup} selected={!alerts.groupJid} disabled={saving} onPress={() => save({ ...alerts, groupJid: "", groupName: "" })} />
            {groups.map((g) => (
              <GroupRow key={g.id} label={g.name} sub={`${g.size} ${c.members}`} selected={alerts.groupJid === g.id} disabled={saving}
                onPress={() => save({ ...alerts, groupJid: g.id, groupName: g.name, groupEnabled: true })} />
            ))}
            {savedMissing && (
              <GroupRow label={alerts.groupName || alerts.groupJid} sub={connected && data ? c.savedGroupMissing : undefined} selected disabled={saving} onPress={() => { }} />
            )}
            {!connected
              ? <Text style={styles.muted}>{c.groupsNeedConnection}</Text>
              : error && !data
                ? <Text style={styles.errorText}>{errText(error, c)}</Text>
                : !groups.length && <Text style={styles.muted}>{c.noGroups}</Text>}
          </View>
        )}
      </View>
      {!!msg && <Text style={[styles.flash, { color: msg.ok ? Colors.success : Colors.danger }]}>{msg.text}</Text>}
    </ScrollView>
  );
}

function GroupRow({ label, sub, selected, disabled, onPress }: { label: string; sub?: string; selected: boolean; disabled?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[styles.groupRow, selected && styles.groupRowActive]} accessibilityRole="radio" accessibilityState={{ selected, disabled }}>
      <Ionicons name={selected ? "radio-button-on" : "radio-button-off"} size={20} color={selected ? Colors.success : Colors.textMuted} />
      <Text style={[styles.body, { flex: 1, minWidth: 0 }]} numberOfLines={1}>{label}</Text>
      {!!sub && <Text style={styles.chatTime} numberOfLines={1}>{sub}</Text>}
    </Pressable>
  );
}

const styles = themedStyles((Colors) => ({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 8, minHeight: 56, borderBottomWidth: 1, borderBottomColor: Colors.cardBorder, backgroundColor: Colors.surface },
  headerTitle: { flex: 1, minWidth: 0, fontSize: 18, fontWeight: "800", color: Colors.text },
  iconBtn: { minWidth: 40, minHeight: 40, alignItems: "center", justifyContent: "center", borderRadius: 20 },
  pill: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, flexShrink: 0, maxWidth: 170 },
  pillDot: { width: 8, height: 8, borderRadius: 4 },
  pillText: { fontSize: 12, fontWeight: "700" },
  tabsBar: { backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.cardBorder },
  tabs: { flexGrow: 1, flexDirection: "row" },
  tab: { flexGrow: 1, minHeight: 46, paddingHorizontal: 14, alignItems: "center", justifyContent: "center", borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabActive: { borderBottomColor: "#25D366" },
  tabText: { color: Colors.textMuted, fontWeight: "700", fontSize: 13 },
  tabTextActive: { color: Colors.text },
  banner: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 10, minHeight: 44, backgroundColor: Colors.warning + "1F", borderBottomWidth: 1, borderBottomColor: Colors.warning + "55" },
  bannerText: { flex: 1, minWidth: 0, color: Colors.text, fontSize: 13, fontWeight: "600" },
  pad: { padding: 16, gap: 14 },
  narrow: { maxWidth: 900, width: "100%", alignSelf: "center" },
  card: { backgroundColor: Colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.cardBorder },
  cardTitle: { color: Colors.text, fontSize: 15, fontWeight: "800" },
  body: { color: Colors.text, fontSize: 14, lineHeight: 21 },
  muted: { color: Colors.textMuted, fontSize: 13, lineHeight: 19, marginTop: 4 },
  label: { color: Colors.textSecondary, fontSize: 12, fontWeight: "700", marginTop: 6 },
  errorText: { color: Colors.danger, fontSize: 13, fontWeight: "600", marginTop: 8 },
  flash: { fontSize: 13, fontWeight: "700", textAlign: "center" },
  disabled: { opacity: 0.5 },
  linkedRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  bigIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.success + "1F", alignItems: "center", justifyContent: "center" },
  qrCard: { flexDirection: "row", flexWrap: "wrap", gap: 20, alignItems: "center", marginTop: 16 },
  qrFrame: { backgroundColor: "#fff", padding: 12, borderRadius: 16 },
  stepRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  stepNum: { width: 26, height: 26, borderRadius: 13, backgroundColor: "#25D366", alignItems: "center", justifyContent: "center" },
  stepNumText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  stepText: { color: Colors.text, fontSize: 14, flex: 1 },
  btnRow: { flexDirection: "row", gap: 10, alignItems: "center", flexWrap: "wrap" },
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12, minHeight: 46 },
  btnGreen: { backgroundColor: "#128C7E" },
  btnDanger: { borderWidth: 1, borderColor: Colors.danger },
  btnOutline: { borderWidth: 1, borderColor: Colors.cardBorder, backgroundColor: Colors.surfaceLight },
  btnText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  input: { borderWidth: 1, borderColor: Colors.cardBorder, backgroundColor: Colors.surfaceLight, color: Colors.text, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, minHeight: 44 },
  logLine: { color: Colors.textSecondary, fontSize: 12, marginTop: 6, fontFamily: Platform.OS === "web" ? "monospace" : undefined },
  centerBox: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 24 },
  chatList: { flex: 1, backgroundColor: Colors.surface },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 6, margin: 10, paddingStart: 12, paddingEnd: 4, borderRadius: 12, backgroundColor: Colors.surfaceLight, borderWidth: 1, borderColor: Colors.cardBorder },
  searchInput: { flex: 1, minWidth: 0, color: Colors.text, paddingVertical: 9, fontSize: 14 },
  chatRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 10, minHeight: 60, borderBottomWidth: 1, borderBottomColor: Colors.cardBorder },
  chatRowActive: { backgroundColor: Colors.surfaceLight },
  chatAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.success + "26", alignItems: "center", justifyContent: "center" },
  chatTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  chatName: { flex: 1, minWidth: 0, color: Colors.text, fontWeight: "700", fontSize: 14 },
  chatTime: { color: Colors.textMuted, fontSize: 11 },
  chatLast: { flex: 1, minWidth: 0, color: Colors.textSecondary, fontSize: 13, marginTop: 2 },
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
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderWidth: 1, borderColor: Colors.cardBorder, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, minHeight: 36, justifyContent: "center", backgroundColor: Colors.surfaceLight, maxWidth: "100%" },
  chipActive: { backgroundColor: "#128C7E", borderColor: "#128C7E" },
  chipText: { color: Colors.textSecondary, fontSize: 12, fontWeight: "700" },
  chipTextActive: { color: "#fff" },
  linkBtn: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", paddingVertical: 8, minHeight: 36 },
  linkText: { color: Colors.accent, fontSize: 13, fontWeight: "700" },
  groupRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: Colors.cardBorder },
  groupRowActive: { borderColor: Colors.success, backgroundColor: Colors.success + "14" },
  historyRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.cardBorder },
  historyCount: { color: Colors.success, fontWeight: "800", fontSize: 13 },
}));
