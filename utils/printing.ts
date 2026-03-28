import { Platform } from "react-native";
import { getApiUrl } from "@/lib/query-client";

// ── Web receipt printing via hidden iframe (no popup-blocking) ──────────────
// onDone fires after the print dialog is dismissed (afterprint event).
// Use it to chain sequential jobs so each job ends with an auto-cut.
export function printHtmlViaIframe(html: string, onDone?: () => void) {
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
    const blob = new Blob([html], { type: "text/html" });
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

// ── Print 3 copies: KUNDENBELEG / FAHRERAUFTRAG / KÜCHENBON ─────────────────
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

  const pmLabel = pmMethod === "cash" ? "BAR" : pmMethod === "card" ? "KARTE" : pmMethod.toUpperCase();
  const custAddress = custObj?.address ||
    [custObj?.street, custObj?.streetNr || custObj?.houseNr, custObj?.postalCode, custObj?.city]
      .filter(Boolean).join(" ") || "";
  const custPhone = custObj?.phone || "";
  const mapsUrl = custAddress ? `https://maps.google.com/?q=${encodeURIComponent(custAddress)}` : "";

  const fullItems = cartItems.map(i => {
    const cat = (categories || []).find((c: any) => c.id === (i as any).categoryId);
    return {
      productName: i.name,
      quantity: i.quantity,
      unitPrice: i.price,
      total: i.price * i.quantity,
      categoryName: (cat?.name || "ARTIKEL").toUpperCase(),
    };
  });

  const buildAndPrint = async () => {
    let printQrDataUrl: string | null = null;
    try {
      const QRCode = require("qrcode");
      const qrContent = mapsUrl || `barmagly:receipt:${saleData?.receiptNumber || saleData?.id}`;
      printQrDataUrl = await QRCode.toDataURL(qrContent, { width: 200, margin: 1, color: { dark: "#000000", light: "#ffffff" } });
    } catch { }

    const storeName = storeSettings?.name || tenant?.name || "POS System";
    const storeAddr = storeSettings?.address || "";
    const storePhone = storeSettings?.phone || "";
    const logoPath = storeSettings?.logo || "";
    const logoUrl = logoPath ? (logoPath.startsWith("http") || logoPath.startsWith("data:") ? logoPath : `${getApiUrl().replace(/\/$/, "")}${logoPath}`) : "";

    const receiptNum = saleData?.receiptNumber || saleData?.orderNumber || `#${saleData?.id}`;
    const saleDate = new Date(saleData?.createdAt || Date.now());
    const timeStr = saleDate.toLocaleTimeString("de-CH", { hour: "2-digit", minute: "2-digit" });
    const dateStr = saleDate.toLocaleDateString("de-CH");
    const isDelivery = !!custAddress;
    const itemCount = fullItems.reduce((s, i) => s + i.quantity, 0);

    const css = `<style>
      @page { size: 80mm auto; margin: 2mm 4mm; }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #000; background: #fff; width: 72mm; -webkit-print-color-adjust: exact; print-color-adjust: exact; line-height: 1.35; }
      hr { border: none; border-top: 1px solid #000; margin: 3px 0; }
    </style>`;

    const hLeft = `<div style="flex:0 0 auto;min-width:72px;">
      <div style="font-size:10px;">${receiptNum}</div>
      <div style="font-size:10px;">Kassierer</div>
      <div style="font-size:26px;font-weight:700;line-height:1.05;">${timeStr}</div>
      <div style="font-size:10px;">${dateStr}</div>
    </div>`;

    const hRight = `<div style="flex:1;padding-left:6px;">
      ${custName && custName !== "Laufkunde" ? `<div style="font-weight:700;font-size:13px;">${custName}</div>` : ""}
      ${custAddress ? `<div style="font-size:12px;">${custAddress}</div>` : ""}
      ${isDelivery ? `<div style="font-size:10px;font-style:italic;">Hauslieferung ohne Service und Zubereitung</div>` : ""}
      ${custPhone ? `<div style="margin-top:2px;font-size:12px;"><b>Tel</b>&nbsp;&nbsp;${custPhone}</div>` : ""}
    </div>`;

    const itemRows = (showPrice: boolean) => fullItems.map(i => `
      <div style="display:flex;padding:2px 0;font-size:13px;">
        <span style="width:16px;">${i.quantity}</span>
        <span style="flex:1;overflow:hidden;">${i.productName}</span>
        ${showPrice ? `<span style="width:40px;text-align:right;font-size:11px;">${Number(i.unitPrice).toFixed(2)}</span><span style="width:40px;text-align:right;">${Number(i.total).toFixed(2)}</span>` : ""}
      </div>`).join("");

    const totalBox = `<div style="display:flex;border:1px solid #000;padding:4px 6px;margin:5px 0;">
      <span style="font-weight:700;font-size:13px;">${itemCount}</span>
      <span style="flex:1;"></span>
      <span style="font-size:11px;align-self:center;">Fr</span>
      <span style="font-weight:700;font-size:20px;margin-left:5px;">${Number(cartTotal).toFixed(2)}</span>
    </div>`;

    // ── JOB 1: KUNDENBELEG (نسخة العميل / المطعم) ──────────────
    const job1 = `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8">${css}</head><body>
      ${logoUrl
        ? `<div style="text-align:center;margin-bottom:3px;"><img src="${logoUrl}" style="max-height:52px;max-width:180px;object-fit:contain;"></div>`
        : `<div style="font-size:16px;font-weight:700;text-align:center;margin-bottom:2px;">${storeName}</div>`}
      <div style="text-align:center;font-size:12px;margin-bottom:3px;">Rechnung</div>
      <div style="display:flex;margin-bottom:3px;">${hLeft}${hRight}</div>
      <hr>
      <div style="display:flex;font-size:10px;font-weight:700;padding:2px 0;">
        <span style="width:16px;"></span><span style="flex:1;">Artikel</span>
        <span style="width:40px;text-align:right;">Preis</span>
        <span style="width:40px;text-align:right;">Total</span>
      </div>
      <hr>
      ${itemRows(true)}
      <hr>
      ${totalBox}
      ${Number(cartDiscount) > 0 ? `<div style="display:flex;font-size:11px;padding:1px 0;"><span style="flex:1;">Rabatt:</span><span>-CHF ${Number(cartDiscount).toFixed(2)}</span></div>` : ""}
      <div style="text-align:center;font-size:11px;margin-top:5px;">Vielen Dank für Ihren Einkauf!</div>
      ${storeAddr ? `<div style="text-align:center;font-size:10px;margin-top:1px;">${storeName} · ${storeAddr}${storePhone ? " · Tel: " + storePhone : ""}</div>` : ""}
      ${printQrDataUrl ? `<div style="text-align:center;margin-top:5px;"><img src="${printQrDataUrl}" style="width:80px;height:80px;"></div>` : ""}
      <div style="text-align:center;font-size:9px;color:#000;margin-top:5px;">Developed by Barmagly · www.barmagly.tech</div>
    </body></html>`;

    const devFooter = `<div style="text-align:center;font-size:9px;color:#000;margin-top:5px;">Developed by Barmagly · www.barmagly.tech</div>`;

    // ── JOB 2: FAHRERAUFTRAG (نسخة السائق / التوصيل) ──────────
    const job2 = `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8">${css}</head><body>
      <div style="font-size:20px;font-weight:700;margin-bottom:4px;">Fahrerauftrag ${receiptNum}</div>
      <div style="display:flex;margin-bottom:3px;">${hLeft}${hRight}</div>
      <hr>
      <div style="display:flex;font-size:10px;font-weight:700;padding:2px 0;">
        <span style="width:16px;"></span><span style="flex:1;">Artikel</span>
        <span style="width:40px;text-align:right;">Preis</span>
        <span style="width:40px;text-align:right;">Total</span>
      </div>
      <hr>
      ${itemRows(true)}
      <hr>
      ${totalBox}
      <div style="border:1px solid #000;margin-top:3px;">
        <div style="display:flex;border-bottom:1px solid #000;padding:8px 8px;">
          <span style="font-weight:700;font-size:13px;width:85px;">FAHRER</span><span style="flex:1;"></span>
        </div>
        <div style="display:flex;border-bottom:1px solid #000;padding:8px 8px;">
          <span style="font-weight:700;font-size:13px;width:85px;">LIEFERZEIT</span><span style="flex:1;"></span>
        </div>
        <div style="display:flex;padding:8px 8px;">
          <span style="font-weight:700;font-size:13px;width:85px;">NOTIZ</span>
          <span style="flex:1;font-style:italic;">${pmLabel}</span>
        </div>
      </div>
      ${devFooter}
    </body></html>`;

    // ── JOB 3: KÜCHENBON (نسخة المطبخ) ─────────────────────────
    const grouped: Record<string, typeof fullItems> = {};
    fullItems.forEach(i => {
      if (!grouped[i.categoryName]) grouped[i.categoryName] = [];
      grouped[i.categoryName].push(i);
    });
    const cats = Object.keys(grouped);
    const kitchenItems = (cats.length > 1 || cats[0] !== "ARTIKEL")
      ? cats.map(cat => `
          <div style="background:#000;color:#fff;font-weight:700;padding:3px 5px;font-size:12px;margin-top:4px;">${cat}</div>
          ${grouped[cat].map(i => `<div style="display:flex;padding:3px 4px;font-size:14px;font-weight:700;">
            <span style="width:20px;">${i.quantity}</span>
            <span style="flex:1;">${i.productName.toUpperCase()}</span>
          </div>`).join("")}`).join("")
      : fullItems.map(i => `<div style="display:flex;padding:3px 4px;font-size:14px;font-weight:700;">
          <span style="width:20px;">${i.quantity}</span>
          <span style="flex:1;">${i.productName.toUpperCase()}</span>
        </div>`).join("");

    const job3 = `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8">${css}</head><body>
      <div style="font-size:20px;font-weight:700;font-style:italic;text-align:center;margin-bottom:3px;">AENDERUNG</div>
      <div style="font-size:12px;font-weight:700;">${storeName} ${receiptNum}</div>
      <div style="font-size:10px;">Kassierer</div>
      <hr style="margin:3px 0;">
      <div style="display:flex;margin:3px 0;">
        <div style="flex:0 0 auto;min-width:72px;">
          <div style="font-size:26px;font-weight:700;line-height:1.05;">${timeStr}</div>
          <div style="font-size:10px;">${saleDate.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</div>
        </div>
        <div style="flex:1;padding-left:6px;">
          ${custName && custName !== "Laufkunde" ? `<div style="font-weight:700;font-size:13px;">${custName}</div>` : ""}
          ${custAddress ? `<div style="font-size:11px;">${custAddress}</div>` : ""}
          ${custPhone ? `<div style="font-size:11px;"><b>Tel</b>&nbsp;${custPhone}</div>` : ""}
        </div>
      </div>
      <hr>
      ${kitchenItems}
      <hr style="margin-top:5px;">
      <div style="font-size:14px;font-weight:700;">${itemCount}</div>
      ${devFooter}
    </body></html>`;

    printHtmlViaIframe(job1, () =>
      printHtmlViaIframe(job2, () =>
        printHtmlViaIframe(job3)
      )
    );
  };

  buildAndPrint();
}
