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

export const TEMPLATE_VARIABLES: Record<TemplateEvent, string[]> = {
  order_new: ["orderNumber", "storeName", "customerName", "customerPhone", "address", "items", "subtotal", "deliveryFee", "total", "orderType", "paymentMethod", "notes"],
  order_confirmed: ["orderNumber", "storeName", "customerName", "total"],
  status_accepted: ["orderNumber", "storeName", "customerName"],
  status_preparing: ["orderNumber", "storeName", "customerName"],
  status_ready: ["orderNumber", "storeName", "customerName"],
  status_on_way: ["orderNumber", "storeName", "customerName"],
  status_delivered: ["orderNumber", "storeName", "customerName"],
  status_cancelled: ["orderNumber", "storeName", "customerName"],
};

const DEFAULTS: Record<TemplateLang, Record<TemplateEvent, string>> = {
  ar: {
    order_new: [
      "🛒 طلب جديد {{orderNumber}}",
      "👤 {{customerName}}",
      "📞 {{customerPhone}}",
      "📍 {{address}}",
      "",
      "الأصناف:",
      "{{items}}",
      "",
      "المجموع الفرعي: {{subtotal}}",
      "التوصيل: {{deliveryFee}}",
      "الإجمالي: {{total}}",
      "",
      "النوع: {{orderType}}",
      "الدفع: {{paymentMethod}}",
      "ملاحظات: {{notes}}",
    ].join("\n"),
    order_confirmed: [
      "✅ تم تأكيد طلبك {{orderNumber}}",
      "",
      "شكراً لطلبك من {{storeName}}!",
      "الإجمالي: {{total}}",
      "",
      "سنرسل لك تحديثاً عند تجهيز طلبك. لأي استفسار ردّ على هذه الرسالة.",
    ].join("\n"),
    status_accepted: "{{storeName}} — الطلب {{orderNumber}}\n\n✅ تم قبول طلبك!",
    status_preparing: "{{storeName}} — الطلب {{orderNumber}}\n\n👨‍🍳 طلبك قيد التحضير…",
    status_ready: "{{storeName}} — الطلب {{orderNumber}}\n\n🎉 طلبك جاهز!",
    status_on_way: "{{storeName}} — الطلب {{orderNumber}}\n\n🛵 طلبك في الطريق إليك.",
    status_delivered: "{{storeName}} — الطلب {{orderNumber}}\n\n🚀 تم توصيل طلبك. بالهناء والشفاء!",
    status_cancelled: "{{storeName}} — الطلب {{orderNumber}}\n\n❌ نأسف، تم إلغاء طلبك. تواصل معنا لأي مساعدة.",
  },
  en: {
    order_new: [
      "🛒 New Order {{orderNumber}}",
      "👤 {{customerName}}",
      "📞 {{customerPhone}}",
      "📍 {{address}}",
      "",
      "Items:",
      "{{items}}",
      "",
      "Subtotal: {{subtotal}}",
      "Delivery: {{deliveryFee}}",
      "Total: {{total}}",
      "",
      "Type: {{orderType}}",
      "Payment: {{paymentMethod}}",
      "Notes: {{notes}}",
    ].join("\n"),
    order_confirmed: [
      "✅ Order Confirmed — {{orderNumber}}",
      "",
      "Thank you for ordering from {{storeName}}!",
      "Total: {{total}}",
      "",
      "We'll update you when your order is being prepared. If you have questions, reply to this message.",
    ].join("\n"),
    status_accepted: "{{storeName}} — Order {{orderNumber}}\n\n✅ Your order has been accepted!",
    status_preparing: "{{storeName}} — Order {{orderNumber}}\n\n👨‍🍳 Your order is being prepared…",
    status_ready: "{{storeName}} — Order {{orderNumber}}\n\n🎉 Your order is ready!",
    status_on_way: "{{storeName}} — Order {{orderNumber}}\n\n🛵 Your order is on the way.",
    status_delivered: "{{storeName}} — Order {{orderNumber}}\n\n🚀 Your order has been delivered. Enjoy!",
    status_cancelled: "{{storeName}} — Order {{orderNumber}}\n\n❌ Unfortunately your order has been cancelled.",
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
