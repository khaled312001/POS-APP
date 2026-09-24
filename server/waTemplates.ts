/**
 * Per-store WhatsApp message templates. The store can switch each message on
 * or off and edit its text with {{variables}}; only overrides are saved (in
 * tenants.metadata.whatsappTemplates), so saving the default text back is the
 * same as "reset". A line whose variables all came out empty is dropped, so
 * optional fields ("Notes: {{notes}}") vanish cleanly.
 */
export type TemplateLang = "ar" | "en";

export const TEMPLATE_EVENTS = [
  "order_new",
  "order_confirmed",
  "status_accepted",
  "status_preparing",
  "status_ready",
  "status_on_way",
  "status_delivered",
  "status_cancelled",
] as const;
export type TemplateEvent = (typeof TEMPLATE_EVENTS)[number];

// Every order message can show the whole order; a line whose variables are
// all empty is dropped, so a pickup order simply has no address line.
const ORDER_VARIABLES = [
  "orderNumber", "orderTime", "storeName", "customerName", "customerPhone", "orderType", "table", "address",
  "scheduledAt", "items", "itemCount", "subtotal", "discount", "deliveryFee", "total", "paymentMethod",
  "notes", "eta", "trackingLink",
];
export const TEMPLATE_VARIABLES: Record<TemplateEvent, string[]> = Object.fromEntries(
  TEMPLATE_EVENTS.map((e) => [e, ORDER_VARIABLES]),
) as Record<TemplateEvent, string[]>;

// The order itself, shared by every message. The store's copy carries the
// customer's phone; the customer's copy doesn't need it.
const DETAILS = {
  ar: (forStore: boolean) => [
    "🧾 رقم الطلب: {{orderNumber}}",
    "🕒 الوقت: {{orderTime}}",
    "👤 الاسم: {{customerName}}",
    ...(forStore ? ["📞 الهاتف: {{customerPhone}}"] : []),
    "📦 النوع: {{orderType}}",
    "🪑 الطاولة: {{table}}",
    "📍 العنوان: {{address}}",
    "📅 موعد الاستلام: {{scheduledAt}}",
    "",
    "🛍 الأصناف ({{itemCount}}):",
    "{{items}}",
    "",
    "المجموع الفرعي: {{subtotal}}",
    "الخصم: −{{discount}}",
    "التوصيل: {{deliveryFee}}",
    "💰 *الإجمالي: {{total}}*",
    "💳 الدفع: {{paymentMethod}}",
    "📝 ملاحظات: {{notes}}",
  ],
  en: (forStore: boolean) => [
    "🧾 Order: {{orderNumber}}",
    "🕒 Time: {{orderTime}}",
    "👤 Name: {{customerName}}",
    ...(forStore ? ["📞 Phone: {{customerPhone}}"] : []),
    "📦 Type: {{orderType}}",
    "🪑 Table: {{table}}",
    "📍 Address: {{address}}",
    "📅 Scheduled for: {{scheduledAt}}",
    "",
    "🛍 Items ({{itemCount}}):",
    "{{items}}",
    "",
    "Subtotal: {{subtotal}}",
    "Discount: −{{discount}}",
    "Delivery: {{deliveryFee}}",
    "💰 *Total: {{total}}*",
    "💳 Payment: {{paymentMethod}}",
    "📝 Notes: {{notes}}",
  ],
};

function customerMessage(lang: TemplateLang, head: string[], tail: string[]): string {
  return [...head, "", ...DETAILS[lang](false), "", ...tail].join("\n");
}

const DEFAULTS: Record<TemplateLang, Record<TemplateEvent, string>> = {
  ar: {
    order_new: ["🛒 *طلب جديد — {{storeName}}*", "", ...DETAILS.ar(true), "", "🔗 {{trackingLink}}"].join("\n"),
    order_confirmed: customerMessage("ar",
      ["✅ *تم استلام طلبك — {{storeName}}*", "شكراً {{customerName}}! وصلنا طلبك وسنبدأ بتجهيزه."],
      ["⏱ الوقت المتوقع: {{eta}}", "🔗 تابع طلبك: {{trackingLink}}", "", "لأي استفسار ردّ على هذه الرسالة."]),
    status_accepted: customerMessage("ar",
      ["✅ *تم قبول طلبك — {{storeName}}*"],
      ["⏱ الوقت المتوقع: {{eta}}", "🔗 تابع طلبك: {{trackingLink}}"]),
    status_preparing: customerMessage("ar",
      ["👨‍🍳 *طلبك قيد التحضير — {{storeName}}*"],
      ["⏱ الوقت المتوقع: {{eta}}", "🔗 تابع طلبك: {{trackingLink}}"]),
    status_ready: customerMessage("ar",
      ["🎉 *طلبك جاهز — {{storeName}}*"],
      ["🔗 تابع طلبك: {{trackingLink}}"]),
    status_on_way: customerMessage("ar",
      ["🛵 *طلبك في الطريق إليك — {{storeName}}*"],
      ["🔗 تتبّع المندوب مباشرة: {{trackingLink}}"]),
    status_delivered: customerMessage("ar",
      ["🚀 *تم توصيل طلبك — {{storeName}}*", "بالهناء والشفاء! شكراً لاختيارك لنا."],
      ["⭐ قيّم طلبك: {{trackingLink}}"]),
    status_cancelled: customerMessage("ar",
      ["❌ *تم إلغاء طلبك — {{storeName}}*", "نأسف لذلك. لأي مساعدة ردّ على هذه الرسالة."],
      []),
  },
  en: {
    order_new: ["🛒 *New order — {{storeName}}*", "", ...DETAILS.en(true), "", "🔗 {{trackingLink}}"].join("\n"),
    order_confirmed: customerMessage("en",
      ["✅ *We got your order — {{storeName}}*", "Thank you {{customerName}}! We'll start on it right away."],
      ["⏱ Estimated time: {{eta}}", "🔗 Follow your order: {{trackingLink}}", "", "Questions? Just reply to this message."]),
    status_accepted: customerMessage("en",
      ["✅ *Your order has been accepted — {{storeName}}*"],
      ["⏱ Estimated time: {{eta}}", "🔗 Follow your order: {{trackingLink}}"]),
    status_preparing: customerMessage("en",
      ["👨‍🍳 *Your order is being prepared — {{storeName}}*"],
      ["⏱ Estimated time: {{eta}}", "🔗 Follow your order: {{trackingLink}}"]),
    status_ready: customerMessage("en",
      ["🎉 *Your order is ready — {{storeName}}*"],
      ["🔗 Follow your order: {{trackingLink}}"]),
    status_on_way: customerMessage("en",
      ["🛵 *Your order is on the way — {{storeName}}*"],
      ["🔗 Track the driver live: {{trackingLink}}"]),
    status_delivered: customerMessage("en",
      ["🚀 *Your order has been delivered — {{storeName}}*", "Enjoy, and thank you for choosing us!"],
      ["⭐ Rate your order: {{trackingLink}}"]),
    status_cancelled: customerMessage("en",
      ["❌ *Your order has been cancelled — {{storeName}}*", "We're sorry. Reply to this message if you need help."],
      []),
  },
};

export interface TemplateSettings {
  lang?: TemplateLang;
  overrides?: Partial<Record<TemplateEvent, { enabled?: boolean; text?: string }>>;
}

export function defaultTemplate(event: TemplateEvent, lang: TemplateLang): string {
  return DEFAULTS[lang]?.[event] ?? DEFAULTS.en[event];
}

export function resolveTemplate(settings: TemplateSettings | undefined, event: TemplateEvent, fallbackLang: TemplateLang) {
  const lang = settings?.lang || fallbackLang;
  const o = settings?.overrides?.[event] || {};
  return {
    enabled: o.enabled !== false,
    text: (o.text && o.text.trim()) || defaultTemplate(event, lang),
    isDefault: !(o.text && o.text.trim()),
  };
}

export function renderTemplate(text: string, vars: Record<string, string | number | null | undefined>): string {
  return text
    .split("\n")
    .map((line) => {
      const names = [...line.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1]);
      if (names.length && names.every((n) => vars[n] == null || String(vars[n]).trim() === "")) return null;
      return line.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, n) => (vars[n] == null ? "" : String(vars[n])));
    })
    .filter((l) => l !== null)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Status name used by the order screens → template event. */
export function statusEvent(status: string): TemplateEvent | null {
  const map: Record<string, TemplateEvent> = {
    accepted: "status_accepted",
    confirmed: "status_accepted",
    preparing: "status_preparing",
    ready: "status_ready",
    on_way: "status_on_way",
    out_for_delivery: "status_on_way",
    delivered: "status_delivered",
    completed: "status_delivered",
    cancelled: "status_cancelled",
  };
  return map[status] || null;
}
