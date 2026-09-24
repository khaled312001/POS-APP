import { Platform } from "react-native";
import * as Print from "expo-print";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApiUrl } from "@/lib/query-client";
import { getDisplayNumber } from "@/lib/api-config";
import { formatAmount, formatMoney, currencyLabel, getCurrency, getMoneyLanguage } from "@/lib/currency";

// ── Receipt printer preferences (Settings → Receipt Printer) ────────────────
// Per device: each till has its own printer. Kept in a module cache so the
// print templates (plain functions) can read it synchronously; loaded from
// storage once at import, long before the first sale is printed.
export type ReceiptPaperSize = "58mm" | "80mm";
export interface ReceiptPrinterPrefs {
  paperSize: ReceiptPaperSize;
  /** Print the receipt copies automatically when a sale completes. */
  autoPrint: boolean;
}
const PRINTER_PREFS_KEY = "kassenta_receipt_printer";
let printerPrefs: ReceiptPrinterPrefs = { paperSize: "80mm", autoPrint: true };

AsyncStorage.getItem(PRINTER_PREFS_KEY)
  .then((raw) => {
    if (!raw) return;
    const saved = JSON.parse(raw);
    printerPrefs = {
      paperSize: saved?.paperSize === "58mm" ? "58mm" : "80mm",
      autoPrint: saved?.autoPrint !== false,
    };
  })
  .catch(() => { /* keep the defaults */ });

export function getReceiptPrinterPrefs(): ReceiptPrinterPrefs {
  return printerPrefs;
}

export function setReceiptPrinterPrefs(next: Partial<ReceiptPrinterPrefs>): ReceiptPrinterPrefs {
  printerPrefs = { ...printerPrefs, ...next };
  AsyncStorage.setItem(PRINTER_PREFS_KEY, JSON.stringify(printerPrefs)).catch(() => {});
  return printerPrefs;
}

/**
 * Every receipt template is laid out for 80mm rolls (@page 80mm, 72mm body).
 * On a 58mm printer the same markup is narrowed here, in one place, rather
 * than in each template.
 */
function fitPaper(html: string): string {
  if (printerPrefs.paperSize !== "58mm") return html;
  return html
    .replace(/size:\s*80mm auto/g, "size: 58mm auto")
    .replace(/width:\s*72mm/g, "width: 50mm");
}

// ── Native receipt printing via expo-print ──────────────────────────────────
// On iOS/Android there is no window.print(); the old iframe path silently did
// nothing in the app. Route native printing through the OS print dialog, which
// lets the user pick a printer OR "Save as PDF" / "Share".
async function printHtmlNative(html: string, onDone?: () => void) {
  try {
    await Print.printAsync({ html: fitPaper(html) });
  } catch (e) {
    // Fallback: generate a PDF file the user can open/share.
    try {
      await Print.printToFileAsync({ html: fitPaper(html) });
    } catch (_) { /* ignore */ }
  } finally {
    onDone?.();
  }
}

// ── Web receipt printing via hidden iframe (no popup-blocking) ──────────────
// onDone fires after the print dialog is dismissed (afterprint event).
// Use it to chain sequential jobs so each job ends with an auto-cut.
export function printHtmlViaIframe(html: string, onDone?: () => void) {
  // Native platforms: use expo-print (the OS print / Save-as-PDF sheet).
  if (Platform.OS !== "web") {
    void printHtmlNative(html, onDone);
    return;
  }
  if (typeof document === "undefined") return;
  const frameId = `_rp_${Date.now()}`;
  const iframe = document.createElement("iframe");
  iframe.id = frameId;
  Object.assign(iframe.style, {
    position: "fixed", right: "0", bottom: "0",
    width: "1px", height: "1px",
    border: "none", opacity: "0",
    pointerEvents: "none", zIndex: "-1",
  });
  document.body.appendChild(iframe);

  const cleanup = (url: string) => {
    URL.revokeObjectURL(url);
    setTimeout(() => iframe?.remove(), 1000);
  };

  try {
    const blob = new Blob([fitPaper(html)], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    iframe.src = url;
    iframe.onload = () => {
      setTimeout(() => {
        try {
          const win = iframe.contentWindow;
          if (!win) return;
          win.focus();
          if (onDone) {
            let fired = false;
            const once = () => { if (fired) return; fired = true; cleanup(url); setTimeout(onDone, 1000); };
            win.addEventListener("afterprint", once, { once: true });
            setTimeout(once, 8000);
          } else {
            let cleaned = false;
            const doClean = () => { if (cleaned) return; cleaned = true; cleanup(url); };
            win.addEventListener("afterprint", doClean, { once: true });
            setTimeout(doClean, 8000);
          }
          win.print();
        } catch (_) { onDone?.(); }
      }, 400);
    };
  } catch (_) {
    iframe.remove();
    onDone?.();
  }
}

// ── Receipt language ────────────────────────────────────────────────────────
// Swiss stores have always printed German receipts, whatever the till's UI
// language — that stays. Arabic stores (Arabic UI, or a Syrian-pound store)
// print Arabic, right-to-left; other English stores print English.
type ReceiptLang = "de" | "en" | "ar";

const RECEIPT_COPY: Record<ReceiptLang, Record<string, string>> = {
  de: {
    cashier: "Kassierer", invoice: "Rechnung", item: "Artikel", price: "Preis", total: "Total",
    discount: "Rabatt", thanks: "Vielen Dank für Ihren Einkauf!", tel: "Tel",
    homeDelivery: "Hauslieferung ohne Service und Zubereitung",
    driverOrder: "Fahrerauftrag", driver: "FAHRER", deliveryTime: "LIEFERZEIT", note: "NOTIZ",
    kitchen: "AENDERUNG", items: "ARTIKEL",
    cash: "BAR", card: "KARTE", wallet: "WALLET", shamcash: "SHAM CASH", credit: "AUF RECHNUNG",
  },
  en: {
    cashier: "Cashier", invoice: "Receipt", item: "Item", price: "Price", total: "Total",
    discount: "Discount", thanks: "Thank you for your purchase!", tel: "Tel",
    homeDelivery: "Home delivery",
    driverOrder: "Delivery order", driver: "DRIVER", deliveryTime: "DELIVERY TIME", note: "NOTE",
    kitchen: "KITCHEN", items: "ITEMS",
    cash: "CASH", card: "CARD", wallet: "WALLET", shamcash: "SHAM CASH", credit: "ON CREDIT",
  },
  ar: {
    cashier: "الكاشير", invoice: "فاتورة", item: "الصنف", price: "السعر", total: "المجموع",
    discount: "الخصم", thanks: "شكراً لتسوقكم معنا!", tel: "هاتف",
    homeDelivery: "توصيل إلى المنزل",
    driverOrder: "طلب توصيل", driver: "السائق", deliveryTime: "وقت التوصيل", note: "ملاحظة",
    kitchen: "طلب المطبخ", items: "أصناف",
    cash: "نقداً", card: "بطاقة", wallet: "محفظة", shamcash: "شام كاش", credit: "آجل",
  },
};

/** Every label a till uses for "no customer" — none of them is printed as a name. */
const WALK_IN_NAMES = new Set(["laufkunde", "walk-in", "walk-in customer", "زبون عابر", "عميل عابر", "زائر", "بدون عميل"]);

function receiptLanguage(): ReceiptLang {
  const ui = getMoneyLanguage();
  const currency = getCurrency();
  if (ui === "ar" || currency === "SYP") return "ar";
  if (ui === "en" && currency !== "CHF") return "en";
  return "de";
}

function receiptLocale(lang: ReceiptLang): string {
  // Latin digits in Arabic too: the amounts on the same receipt use them.
  return lang === "ar" ? "ar-SY-u-nu-latn" : lang === "en" ? "en-GB" : "de-CH";
}

/** Names come from staff/customer input — never inject them as markup. */
function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function safeDate(d: Date, lang: ReceiptLang, opts: Intl.DateTimeFormatOptions, time = false): string {
  try {
    return time ? d.toLocaleTimeString(receiptLocale(lang), opts) : d.toLocaleDateString(receiptLocale(lang), opts);
  } catch {
    return time ? d.toLocaleTimeString() : d.toLocaleDateString();
  }
}

// ── Print 3 copies: customer receipt / driver copy / kitchen copy ───────────
export function autoPrint3Copies(
  saleData: any,
  cartItems: { name: string; quantity: number; price: number; categoryId?: number }[],
  cartSubtotal: number,
  cartTax: number,
  cartDiscount: number,
  cartServiceFee: number,
  cartTotal: number,
  cartDeliveryFee: number,
  pmMethod: string,
  cashAmt: number,
  custName: string,
  empName: string,
  custObj?: any,
  vehicleObj?: any,
  cartMinOrderSurcharge: number = 0,
  storeSettings?: any,
  tenant?: any,
  categories?: any[],
) {
  if (Platform.OS !== "web") return;

  const lang = receiptLanguage();
  const L = RECEIPT_COPY[lang];
  const rtl = lang === "ar";
  const dirAttr = rtl ? ` dir="rtl"` : "";
  // Start/end sides follow the reading direction of the receipt.
  const end = rtl ? "left" : "right";
  const startPad = rtl ? "padding-right" : "padding-left";
  const money = (v: unknown) => formatAmount(v);
  const currencyText = lang === "de" && getCurrency() === "CHF" ? "Fr" : currencyLabel();

  const pm = String(pmMethod || "cash").toLowerCase();
  const pmLabel = L[pm] || String(pmMethod || "").toUpperCase();
  const isWalkIn = !custName || WALK_IN_NAMES.has(String(custName).trim().toLowerCase());
  const custAddress = custObj?.address ||
    [custObj?.street, custObj?.streetNr || custObj?.houseNr, custObj?.postalCode, custObj?.city]
      .filter(Boolean).join(" ") || "";
  const custPhone = custObj?.phone || "";
  const mapsUrl = custAddress ? `https://maps.google.com/?q=${encodeURIComponent(custAddress)}` : "";

  const fullItems = cartItems.map(i => {
    const cat = (categories || []).find((c: any) => c.id === (i as any).categoryId);
    return {
      productName: String(i.name ?? ""),
      quantity: i.quantity,
      unitPrice: i.price,
      total: i.price * i.quantity,
      categoryName: cat?.name ? String(cat.name).toUpperCase() : "",
    };
  });

  const buildAndPrint = async () => {
    let printQrDataUrl: string | null = null;
    try {
      const QRCode = require("qrcode");
      const qrContent = mapsUrl || `barmagly:receipt:${saleData?.receiptNumber || saleData?.id}`;
      printQrDataUrl = await QRCode.toDataURL(qrContent, { width: 200, margin: 1, color: { dark: "#000000", light: "#ffffff" } });
    } catch { }

    const storeName = esc(storeSettings?.name || tenant?.name || "POS System");
    const storeAddr = esc(storeSettings?.address || "");
    const storePhone = esc(storeSettings?.phone || "");
    const logoPath = storeSettings?.logo || "";
    const logoUrl = logoPath ? (logoPath.startsWith("http") || logoPath.startsWith("data:") ? logoPath : `${getApiUrl().replace(/\/$/, "")}${logoPath}`) : "";

    const receiptNum = esc(getDisplayNumber(saleData?.receiptNumber || saleData?.orderNumber) || `#${saleData?.id}`);
    const saleDate = new Date(saleData?.createdAt || Date.now());
    const timeStr = safeDate(saleDate, lang, { hour: "2-digit", minute: "2-digit" }, true);
    const dateStr = safeDate(saleDate, lang, {});
    const isDelivery = !!custAddress;
    const itemCount = fullItems.reduce((s, i) => s + i.quantity, 0);
    const cust = esc(custName);
    const addr = esc(custAddress);
    const phone = esc(custPhone);
    // The Swiss layout has always printed the word "Kassierer" here.
    const cashierLine = lang === "de" ? L.cashier : (esc(empName) || L.cashier);

    const css = `<style>
      @page { size: 80mm auto; margin: 2mm 4mm; }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: Arial, Helvetica, "Segoe UI", Tahoma, sans-serif; font-size: 13px; color: #000; background: #fff; width: 72mm; -webkit-print-color-adjust: exact; print-color-adjust: exact; line-height: 1.35; }
      hr { border: none; border-top: 1px solid #000; margin: 3px 0; }
      .num { direction: ltr; unicode-bidi: embed; }
    </style>`;
    const head = `<!DOCTYPE html><html lang="${lang}"${dirAttr}><head><meta charset="UTF-8">${css}</head><body>`;

    const hLeft = `<div style="flex:0 0 auto;min-width:72px;">
      <div style="font-size:10px;" class="num">${receiptNum}</div>
      <div style="font-size:10px;">${cashierLine}</div>
      <div style="font-size:26px;font-weight:700;line-height:1.05;" class="num">${timeStr}</div>
      <div style="font-size:10px;" class="num">${dateStr}</div>
    </div>`;

    const hRight = `<div style="flex:1;${startPad}:6px;">
      ${!isWalkIn ? `<div style="font-weight:700;font-size:13px;">${cust}</div>` : ""}
      ${addr ? `<div style="font-size:12px;">${addr}</div>` : ""}
      ${isDelivery ? `<div style="font-size:10px;font-style:italic;">${L.homeDelivery}</div>` : ""}
      ${phone ? `<div style="margin-top:2px;font-size:12px;"><b>${L.tel}</b>&nbsp;&nbsp;<span class="num">${phone}</span></div>` : ""}
    </div>`;

    // Grouped Syrian-pound amounts ("1,250,000") need wider columns.
    const colW = getCurrency() === "SYP" ? 62 : 40;
    const itemRows = (showPrice: boolean) => fullItems.map(i => `
      <div style="display:flex;padding:2px 0;font-size:13px;">
        <span style="width:18px;" class="num">${i.quantity}</span>
        <span style="flex:1;overflow:hidden;">${esc(i.productName)}</span>
        ${showPrice ? `<span style="width:${colW}px;text-align:${end};font-size:11px;" class="num">${money(i.unitPrice)}</span><span style="width:${colW}px;text-align:${end};" class="num">${money(i.total)}</span>` : ""}
      </div>`).join("");

    const itemHeader = `<div style="display:flex;font-size:10px;font-weight:700;padding:2px 0;">
        <span style="width:18px;"></span><span style="flex:1;">${L.item}</span>
        <span style="width:${colW}px;text-align:${end};">${L.price}</span>
        <span style="width:${colW}px;text-align:${end};">${L.total}</span>
      </div>`;

    const totalBox = `<div style="display:flex;border:1px solid #000;padding:4px 6px;margin:5px 0;">
      <span style="font-weight:700;font-size:13px;" class="num">${itemCount}</span>
      <span style="flex:1;"></span>
      <span style="font-size:11px;align-self:center;">${esc(currencyText)}</span>
      <span style="font-weight:700;font-size:20px;margin-${rtl ? "right" : "left"}:5px;" class="num">${money(cartTotal)}</span>
    </div>`;

    const devFooter = `<div style="text-align:center;font-size:9px;color:#000;margin-top:5px;">Powered by Kassenta · kassenta.com</div>`;

    // ── JOB 1: customer receipt ──────────────────────────────────────────────
    const job1 = `${head}
      ${logoUrl
        ? `<div style="text-align:center;margin-bottom:3px;"><img src="${esc(logoUrl)}" style="max-height:52px;max-width:180px;object-fit:contain;"></div>`
        : `<div style="font-size:16px;font-weight:700;text-align:center;margin-bottom:2px;">${storeName}</div>`}
      <div style="text-align:center;font-size:12px;margin-bottom:3px;">${L.invoice}</div>
      <div style="display:flex;margin-bottom:3px;">${hLeft}${hRight}</div>
      <hr>
      ${itemHeader}
      <hr>
      ${itemRows(true)}
      <hr>
      ${totalBox}
      ${Number(cartDiscount) > 0 ? `<div style="display:flex;font-size:11px;padding:1px 0;"><span style="flex:1;">${L.discount}:</span><span class="num">-${esc(formatMoney(cartDiscount))}</span></div>` : ""}
      <div style="text-align:center;font-size:11px;margin-top:5px;">${L.thanks}</div>
      ${storeAddr ? `<div style="text-align:center;font-size:10px;margin-top:1px;">${storeName} · ${storeAddr}${storePhone ? ` · ${L.tel}: <span class="num">${storePhone}</span>` : ""}</div>` : ""}
      ${printQrDataUrl ? `<div style="text-align:center;margin-top:5px;"><img src="${printQrDataUrl}" style="width:80px;height:80px;"></div>` : ""}
      ${devFooter}
    </body></html>`;

    // ── JOB 2: driver copy ───────────────────────────────────────────────────
    const job2 = `${head}
      <div style="font-size:20px;font-weight:700;margin-bottom:4px;">${L.driverOrder} <span class="num">${receiptNum}</span></div>
      <div style="display:flex;margin-bottom:3px;">${hLeft}${hRight}</div>
      <hr>
      ${itemHeader}
      <hr>
      ${itemRows(true)}
      <hr>
      ${totalBox}
      <div style="border:1px solid #000;margin-top:3px;">
        <div style="display:flex;border-bottom:1px solid #000;padding:8px 8px;">
          <span style="font-weight:700;font-size:13px;width:95px;">${L.driver}</span><span style="flex:1;">${esc(vehicleObj?.driverName || "")}</span>
        </div>
        <div style="display:flex;border-bottom:1px solid #000;padding:8px 8px;">
          <span style="font-weight:700;font-size:13px;width:95px;">${L.deliveryTime}</span><span style="flex:1;"></span>
        </div>
        <div style="display:flex;padding:8px 8px;">
          <span style="font-weight:700;font-size:13px;width:95px;">${L.note}</span>
          <span style="flex:1;font-style:italic;">${esc(pmLabel)}</span>
        </div>
      </div>
      ${devFooter}
    </body></html>`;

    // ── JOB 3: kitchen copy ──────────────────────────────────────────────────
    const grouped: Record<string, typeof fullItems> = {};
    fullItems.forEach(i => {
      const key = i.categoryName || L.items;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(i);
    });
    const cats = Object.keys(grouped);
    const kitchenLine = (i: (typeof fullItems)[number]) => `<div style="display:flex;padding:3px 4px;font-size:14px;font-weight:700;">
            <span style="width:22px;" class="num">${i.quantity}</span>
            <span style="flex:1;">${esc(i.productName.toUpperCase())}</span>
          </div>`;
    const kitchenItems = (cats.length > 1 || cats[0] !== L.items)
      ? cats.map(cat => `
          <div style="background:#000;color:#fff;font-weight:700;padding:3px 5px;font-size:12px;margin-top:4px;">${esc(cat)}</div>
          ${grouped[cat].map(kitchenLine).join("")}`).join("")
      : fullItems.map(kitchenLine).join("");

    const job3 = `${head}
      <div style="font-size:20px;font-weight:700;font-style:italic;text-align:center;margin-bottom:3px;">${L.kitchen}</div>
      <div style="font-size:12px;font-weight:700;">${storeName} <span class="num">${receiptNum}</span></div>
      <div style="font-size:10px;">${cashierLine}</div>
      <hr style="margin:3px 0;">
      <div style="display:flex;margin:3px 0;">
        <div style="flex:0 0 auto;min-width:72px;">
          <div style="font-size:26px;font-weight:700;line-height:1.05;" class="num">${timeStr}</div>
          <div style="font-size:10px;">${safeDate(saleDate, lang, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</div>
        </div>
        <div style="flex:1;${startPad}:6px;">
          ${!isWalkIn ? `<div style="font-weight:700;font-size:13px;">${cust}</div>` : ""}
          ${addr ? `<div style="font-size:11px;">${addr}</div>` : ""}
          ${phone ? `<div style="font-size:11px;"><b>${L.tel}</b>&nbsp;<span class="num">${phone}</span></div>` : ""}
        </div>
      </div>
      <hr>
      ${kitchenItems}
      <hr style="margin-top:5px;">
      <div style="font-size:14px;font-weight:700;" class="num">${itemCount}</div>
      ${devFooter}
    </body></html>`;

    printHtmlViaIframe(job1, () =>
      printHtmlViaIframe(job2, () =>
        printHtmlViaIframe(job3)
      )
    );
  };

  void buildAndPrint();
}

