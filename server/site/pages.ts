import { icons, shot, t, tAttrs, esc, type PageMeta, type T3 } from "./shell";

// ── Small builders ──────────────────────────────────────────────────────────
const head = (eyebrow: T3, title: T3, lead?: T3, center = false) => `
      <div class="section-head${center ? " section-head--center" : ""} reveal">
        <span class="eyebrow" ${tAttrs(eyebrow)}>${esc(eyebrow.en)}</span>
        <h2 ${tAttrs(title)}>${esc(title.en)}</h2>
        ${lead ? `<p class="lead"${center ? ' style="margin-inline:auto"' : ""} ${tAttrs(lead)}>${esc(lead.en)}</p>` : ""}
      </div>`;

const card = (icon: string, title: T3, body: T3) => `
        <article class="card card--hover reveal">
          <div class="card-icon">${icon}</div>
          <h3 ${tAttrs(title)}>${esc(title.en)}</h3>
          <p ${tAttrs(body)}>${esc(body.en)}</p>
        </article>`;

const ticks = (items: T3[]) =>
  `<ul class="tick-list">${items
    .map((i) => `<li>${icons.check}<span ${tAttrs(i)}>${esc(i.en)}</span></li>`)
    .join("")}</ul>`;

const faq = (items: { q: T3; a: T3 }[]) => `
      <div class="faq reveal">
        ${items
          .map(
            (i) => `<details>
          <summary><span ${tAttrs(i.q)}>${esc(i.q.en)}</span></summary>
          <div class="answer" ${tAttrs(i.a)}>${esc(i.a.en)}</div>
        </details>`
          )
          .join("")}
      </div>`;

const ctaBand = (title: T3, body: T3) => `
  <section class="section">
    <div class="wrap">
      <div class="cta-band reveal">
        <h2 ${tAttrs(title)}>${esc(title.en)}</h2>
        <p ${tAttrs(body)}>${esc(body.en)}</p>
        <div class="btn-row">
          <a class="btn btn-primary" href="/contact/" ${tAttrs({ en: "Book a demo", de: "Demo buchen", ar: "احجز عرضًا توضيحيًا" })}>Book a demo</a>
          <a class="btn btn-ghost" href="/pricing/" ${tAttrs({ en: "See pricing", de: "Preise ansehen", ar: "شاهد الأسعار" })}>See pricing</a>
        </div>
      </div>
    </div>
  </section>`;

const pageHead = (title: T3, lead: T3, crumb: T3) => `
  <section class="page-head">
    <div class="wrap">
      <div class="crumbs"><a href="/" ${tAttrs({ en: "Home", de: "Start", ar: "الرئيسية" })}>Home</a><span>/</span><span ${tAttrs(crumb)}>${esc(crumb.en)}</span></div>
      <h1 ${tAttrs(title)}>${esc(title.en)}</h1>
      <p class="lead" ${tAttrs(lead)}>${esc(lead.en)}</p>
    </div>
  </section>`;

// ════════════════════════════════════════════════════════════════════════════
// HOME
// ════════════════════════════════════════════════════════════════════════════
export const home: { meta: PageMeta; body: string } = {
  meta: {
    path: "/",
    title: {
      en: "Kassenta POS — Point of sale, online ordering and delivery in one system",
      de: "Kassenta POS — Kasse, Online-Bestellung und Lieferung in einem System",
      ar: "Kassenta POS — نقطة بيع وطلب أونلاين وتوصيل في نظام واحد",
    },
    description: {
      en: "Kassenta runs the till, the online shop, the kitchen and the delivery fleet from one place. Swiss VAT, CHF rounding and TWINT built in. Works on phone, tablet and desktop.",
      de: "Kassenta betreibt Kasse, Online-Shop, Küche und Lieferflotte an einem Ort. Schweizer MwSt., CHF-Rundung und TWINT integriert. Für Smartphone, Tablet und Desktop.",
      ar: "يدير Kassenta الكاشير والمتجر الإلكتروني والمطبخ وأسطول التوصيل من مكان واحد. ضريبة سويسرية وتقريب CHF وTWINT مدمجة. يعمل على الهاتف والتابلت والكمبيوتر.",
    },
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "Kassenta POS",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web, Android, iOS",
        offers: { "@type": "Offer", price: "49", priceCurrency: "CHF" },
        description:
          "Point of sale, online ordering and delivery management for hospitality and retail in Switzerland and Europe.",
      },
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "Kassenta",
        url: "https://kassenta.com",
        logo: "https://kassenta.com/brand/logo-mark.png",
        email: "info@kassenta.com",
      },
    ],
  },
  body: `
  <section class="hero">
    <div class="wrap">
      <div class="split split--wide-left">
        <div>
          <span class="badge" ${tAttrs({ en: "Built for Switzerland and the EU", de: "Für die Schweiz und die EU gebaut", ar: "مصمَّم لسويسرا والاتحاد الأوروبي" })}>Built for Switzerland and the EU</span>
          <h1 style="margin-top:18px" ${tAttrs({
            en: "One system for the till, the shop and the road",
            de: "Ein System für Kasse, Shop und Lieferung",
            ar: "نظام واحد للكاشير والمتجر والتوصيل",
          })}>One system for the till, the shop and the road</h1>
          <p class="lead" ${tAttrs({
            en: "Kassenta replaces the patchwork of a POS terminal, an ordering website, a delivery app and a spreadsheet. Every order — counter, table QR, phone or online — lands in the same queue, with the same stock and the same reports.",
            de: "Kassenta ersetzt das Flickwerk aus Kassenterminal, Bestellwebsite, Liefer-App und Tabellenkalkulation. Jede Bestellung — Theke, Tisch-QR, Telefon oder online — landet in derselben Warteschlange, mit demselben Bestand und denselben Berichten.",
            ar: "يستبدل Kassenta خليط أجهزة الكاشير وموقع الطلبات وتطبيق التوصيل وجداول البيانات. كل طلب — من الكاشير أو QR الطاولة أو الهاتف أو الإنترنت — يصل إلى القائمة نفسها، بالمخزون نفسه والتقارير نفسها.",
          })}>Kassenta replaces the patchwork of a POS terminal, an ordering website, a delivery app and a spreadsheet. Every order — counter, table QR, phone or online — lands in the same queue, with the same stock and the same reports.</p>
          <div class="btn-row">
            <a class="btn btn-primary" href="/contact/">${icons.arrowRight}<span ${tAttrs({ en: "Book a live demo", de: "Live-Demo buchen", ar: "احجز عرضًا مباشرًا" })}>Book a live demo</span></a>
            <a class="btn btn-ghost" href="/features/" ${tAttrs({ en: "Explore the platform", de: "Plattform ansehen", ar: "استكشف المنصة" })}>Explore the platform</a>
          </div>
          <div class="hero-meta">
            <div><b>3</b><span ${tAttrs({ en: "Languages: EN / DE / AR", de: "Sprachen: EN / DE / AR", ar: "لغات: EN / DE / AR" })}>Languages: EN / DE / AR</span></div>
            <div><b>8.1%</b><span ${tAttrs({ en: "Swiss VAT handled", de: "Schweizer MwSt. berücksichtigt", ar: "ضريبة سويسرا مدعومة" })}>Swiss VAT handled</span></div>
            <div><b>0.05</b><span ${tAttrs({ en: "CHF cash rounding", de: "CHF-Rappenrundung", ar: "تقريب نقدي CHF" })}>CHF cash rounding</span></div>
            <div><b>24/7</b><span ${tAttrs({ en: "Cloud availability", de: "Cloud-Verfügbarkeit", ar: "توافر سحابي" })}>Cloud availability</span></div>
          </div>
        </div>
        <div class="reveal">
          ${shot({ id: "hero-pos-tablet", ratio: "4 / 5", size: "1200 × 1500", alt: { en: "Kassenta POS running on a tablet at a restaurant counter", de: "Kassenta POS auf einem Tablet an der Theke eines Restaurants", ar: "Kassenta POS يعمل على تابلت عند كاشير مطعم" } })}
        </div>
      </div>
    </div>
  </section>

  <section class="section--tight">
    <div class="wrap">
      <div class="stat-strip reveal">
        <div><b ${tAttrs({ en: "Counter", de: "Theke", ar: "الكاشير" })}>Counter</b><span ${tAttrs({ en: "Touch POS on any screen", de: "Touch-Kasse auf jedem Bildschirm", ar: "كاشير لمسي على أي شاشة" })}>Touch POS on any screen</span></div>
        <div><b ${tAttrs({ en: "Online", de: "Online", ar: "أونلاين" })}>Online</b><span ${tAttrs({ en: "Your own branded storefront", de: "Eigener Shop im Branding", ar: "متجرك بهويتك الخاصة" })}>Your own branded storefront</span></div>
        <div><b ${tAttrs({ en: "Tables", de: "Tische", ar: "الطاولات" })}>Tables</b><span ${tAttrs({ en: "QR ordering per seat", de: "QR-Bestellung pro Platz", ar: "طلب بـQR لكل طاولة" })}>QR ordering per seat</span></div>
        <div><b ${tAttrs({ en: "Delivery", de: "Lieferung", ar: "التوصيل" })}>Delivery</b><span ${tAttrs({ en: "Drivers, zones and tracking", de: "Fahrer, Zonen und Tracking", ar: "سائقون ومناطق وتتبّع" })}>Drivers, zones and tracking</span></div>
      </div>
    </div>
  </section>

  <section class="section section--alt">
    <div class="wrap">
      ${head(
        { en: "The platform", de: "Die Plattform", ar: "المنصة" },
        { en: "Four products, one database", de: "Vier Produkte, eine Datenbank", ar: "أربعة منتجات، قاعدة بيانات واحدة" },
        {
          en: "Stock, prices, customers and taxes are defined once. Every surface reads from the same place, so a sold-out item disappears from the online menu the second the counter sells the last one.",
          de: "Bestand, Preise, Kunden und Steuern werden einmal definiert. Jede Oberfläche liest aus derselben Quelle — ein ausverkaufter Artikel verschwindet in dem Moment aus der Online-Karte, in dem die Theke den letzten verkauft.",
          ar: "يُعرَّف المخزون والأسعار والعملاء والضرائب مرة واحدة. كل الواجهات تقرأ من المصدر نفسه، فيختفي الصنف المنتهي من القائمة الإلكترونية لحظة بيع آخر قطعة على الكاشير.",
        },
        true
      )}
      <div class="grid grid-4">
        ${card(icons.register, { en: "POS application", de: "Kassen-App", ar: "تطبيق الكاشير" }, {
          en: "Touch-first ordering, split payments, discounts, shift handover and end-of-day cash-up. Runs in the browser and as a native Android and iOS app.",
          de: "Touch-orientierte Bestellung, Teilzahlungen, Rabatte, Schichtübergabe und Tagesabschluss. Läuft im Browser sowie als native Android- und iOS-App.",
          ar: "طلب باللمس، ودفع مقسَّم، وخصومات، وتسليم الورديات، وتقفيل اليوم. يعمل في المتصفح وكتطبيق أندرويد وiOS أصلي.",
        })}
        ${card(icons.cart, { en: "Customer storefront", de: "Kunden-Shop", ar: "متجر العملاء" }, {
          en: "A branded ordering page per business, with menus, options, promo codes, scheduled orders and delivery-zone pricing.",
          de: "Eine gebrandete Bestellseite pro Betrieb, mit Karte, Optionen, Gutscheinen, Vorbestellungen und Zonenpreisen.",
          ar: "صفحة طلب بهوية كل متجر، مع القوائم والخيارات وأكواد الخصم والطلبات المجدولة وتسعير مناطق التوصيل.",
        })}
        ${card(icons.truck, { en: "Delivery operations", de: "Lieferbetrieb", ar: "إدارة التوصيل" }, {
          en: "Assign drivers, broadcast open orders, follow the status pipeline and send customers a live tracking link.",
          de: "Fahrer zuweisen, offene Aufträge ausschreiben, Statusverlauf verfolgen und Kunden einen Live-Tracking-Link senden.",
          ar: "إسناد السائقين، وبثّ الطلبات المفتوحة، ومتابعة مراحل الحالة، وإرسال رابط تتبّع مباشر للعميل.",
        })}
        ${card(icons.layers, { en: "Owner console", de: "Betreiber-Konsole", ar: "لوحة المالك" }, {
          en: "Multi-branch overview, licences, staff roles and reporting across every location from one login.",
          de: "Filialübersicht, Lizenzen, Mitarbeiterrollen und Auswertungen über alle Standorte mit einem Login.",
          ar: "نظرة شاملة على الفروع، والتراخيص، وأدوار الموظفين، والتقارير لكل المواقع من حساب واحد.",
        })}
      </div>
    </div>
  </section>

  <section class="section">
    <div class="wrap">
      <div class="split">
        <div class="reveal">
          ${shot({ id: "home-order-flow", ratio: "16 / 11", size: "1600 × 1100", alt: { en: "Order flow from customer to kitchen to driver", de: "Bestellablauf vom Kunden über die Küche zum Fahrer", ar: "مسار الطلب من العميل إلى المطبخ إلى السائق" } })}
        </div>
        <div>
          ${head(
            { en: "How it flows", de: "Der Ablauf", ar: "كيف يسير العمل" },
            { en: "From tap to doorstep without re-typing anything", de: "Vom Tippen bis zur Haustür — ohne Doppelerfassung", ar: "من الضغطة إلى باب العميل دون إعادة إدخال" }
          )}
          <div class="steps">
            <div class="step reveal"><div><h3 ${tAttrs({ en: "The order arrives", de: "Die Bestellung trifft ein", ar: "يصل الطلب" })}>The order arrives</h3><p ${tAttrs({
              en: "From the counter, a table QR code, an inbound phone call with caller ID, or your online storefront.",
              de: "Von der Theke, per Tisch-QR-Code, über einen Anruf mit Rufnummernerkennung oder aus Ihrem Online-Shop.",
              ar: "من الكاشير، أو QR الطاولة، أو مكالمة واردة مع تعريف المتصل، أو متجرك الإلكتروني.",
            })}>From the counter, a table QR code, an inbound phone call with caller ID, or your online storefront.</p></div></div>
            <div class="step reveal"><div><h3 ${tAttrs({ en: "The kitchen sees it", de: "Die Küche sieht sie", ar: "يراه المطبخ" })}>The kitchen sees it</h3><p ${tAttrs({
              en: "It appears in the live queue with modifiers, allergen notes and the promised time. Print a ticket or work from the screen.",
              de: "Sie erscheint in der Live-Warteschlange mit Optionen, Allergenhinweisen und Zusagezeit. Bon drucken oder direkt am Bildschirm arbeiten.",
              ar: "يظهر في القائمة الحيّة مع الإضافات وملاحظات الحساسية والوقت المتوقع. اطبع تذكرة أو اعمل من الشاشة.",
            })}>It appears in the live queue with modifiers, allergen notes and the promised time. Print a ticket or work from the screen.</p></div></div>
            <div class="step reveal"><div><h3 ${tAttrs({ en: "A driver takes it", de: "Ein Fahrer übernimmt", ar: "يستلمه السائق" })}>A driver takes it</h3><p ${tAttrs({
              en: "Assign directly or broadcast to available drivers. The customer gets a tracking link; you get the timestamps.",
              de: "Direkt zuweisen oder an verfügbare Fahrer ausschreiben. Der Kunde erhält einen Tracking-Link, Sie die Zeitstempel.",
              ar: "أسنِده مباشرة أو ابثّه للسائقين المتاحين. يحصل العميل على رابط تتبّع، وتحصل أنت على الأوقات.",
            })}>Assign directly or broadcast to available drivers. The customer gets a tracking link; you get the timestamps.</p></div></div>
            <div class="step reveal"><div><h3 ${tAttrs({ en: "The books close themselves", de: "Der Abschluss läuft von selbst", ar: "تُقفل الحسابات تلقائيًا" })}>The books close themselves</h3><p ${tAttrs({
              en: "Cash-up compares counted cash to expected, files the shift, and pushes the day into your VAT-ready reports.",
              de: "Der Kassensturz vergleicht Ist- mit Sollbestand, schliesst die Schicht ab und überträgt den Tag in Ihre MwSt.-fähigen Berichte.",
              ar: "يقارن التقفيل النقد المعدود بالمتوقع، ويغلق الوردية، ويضيف اليوم إلى تقارير جاهزة للضريبة.",
            })}>Cash-up compares counted cash to expected, files the shift, and pushes the day into your VAT-ready reports.</p></div></div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section class="section section--inset">
    <div class="wrap">
      ${head(
        { en: "Industries", de: "Branchen", ar: "المجالات" },
        { en: "Configured for how your trade actually works", de: "Auf Ihre Branche zugeschnitten", ar: "مهيَّأ حسب طبيعة نشاطك" },
        {
          en: "A pharmacy needs batch numbers; a bakery needs scale integration; a café needs a two-tap flat white. Kassenta ships a preset per vertical and lets you adjust every part of it.",
          de: "Eine Apotheke braucht Chargennummern, eine Bäckerei Waagenanbindung, ein Café einen Flat White in zwei Taps. Kassenta liefert je Branche eine Vorlage — und lässt Sie alles daran anpassen.",
          ar: "الصيدلية تحتاج أرقام تشغيلات، والمخبز يحتاج ميزانًا، والكافيه يحتاج طلبًا بضغطتين. يوفّر Kassenta إعدادًا جاهزًا لكل نشاط مع إمكانية تعديل كل تفصيلة.",
        },
        true
      )}
      <div class="grid grid-3">
        ${card(icons.coffee, { en: "Cafés and bars", de: "Cafés und Bars", ar: "المقاهي والبارات" }, {
          en: "Fast repeat orders, cup sizes and milk options as modifiers, tab handling and a tip line on the receipt.",
          de: "Schnelle Wiederholbestellungen, Grössen und Milchoptionen als Optionen, Deckel-Verwaltung und Trinkgeldzeile auf dem Bon.",
          ar: "طلبات متكررة سريعة، وأحجام وخيارات حليب كإضافات، وإدارة الحساب المفتوح، وسطر بقشيش في الفاتورة.",
        })}
        ${card(icons.register, { en: "Restaurants", de: "Restaurants", ar: "المطاعم" }, {
          en: "Table plan, course timing, dine-in versus takeaway VAT, split bills and QR ordering from the table.",
          de: "Tischplan, Gangsteuerung, MwSt. für Vor-Ort und Takeaway, Rechnungsteilung und QR-Bestellung am Tisch.",
          ar: "مخطط الطاولات، وتوقيت الأطباق، وضريبة تناول بالمكان مقابل تيك أواي، وتقسيم الفواتير، وطلب QR من الطاولة.",
        })}
        ${card(icons.cart, { en: "Supermarkets", de: "Supermärkte", ar: "السوبر ماركت" }, {
          en: "Barcode scanning, weighed goods, deposit handling and fast multi-item checkout with a customer display.",
          de: "Barcode-Scanning, Gewichtsware, Pfandverwaltung und schneller Multi-Artikel-Checkout mit Kundendisplay.",
          ar: "مسح الباركود، والسلع بالوزن، وإدارة التأمين المسترد، ودفع سريع لأصناف متعددة مع شاشة عميل.",
        })}
        ${card(icons.pill, { en: "Pharmacies", de: "Apotheken", ar: "الصيدليات" }, {
          en: "Reduced VAT categories, batch and expiry tracking, restricted-item prompts and per-operator audit trails.",
          de: "Reduzierte MwSt.-Kategorien, Chargen- und Verfallsverfolgung, Hinweise bei rezeptpflichtigen Artikeln und Audit-Trails je Mitarbeiter.",
          ar: "فئات ضريبة مخفَّضة، وتتبّع التشغيلات وتواريخ الصلاحية، وتنبيهات الأصناف المقيَّدة، وسجل تدقيق لكل مستخدم.",
        })}
        ${card(icons.box, { en: "Bakeries", de: "Bäckereien", ar: "المخابز" }, {
          en: "Weight-based pricing, morning pre-orders, production planning and waste recording at close.",
          de: "Preis nach Gewicht, Vorbestellungen am Morgen, Produktionsplanung und Retourenerfassung beim Abschluss.",
          ar: "تسعير بالوزن، وطلبات مسبقة صباحية، وتخطيط الإنتاج، وتسجيل الهدر عند الإغلاق.",
        })}
        ${card(icons.tag, { en: "Retail", de: "Einzelhandel", ar: "التجزئة" }, {
          en: "Variants by size and colour, stock counts, returns with reason codes and supplier purchase records.",
          de: "Varianten nach Grösse und Farbe, Inventuren, Retouren mit Grundcodes und Lieferantenbelege.",
          ar: "متغيّرات بالمقاس واللون، وجرد المخزون، ومرتجعات بأسباب محدَّدة، وسجلات مشتريات الموردين.",
        })}
      </div>
      <div class="btn-row" style="justify-content:center">
        <a class="btn btn-ghost" href="/solutions/" ${tAttrs({ en: "Compare all industry presets", de: "Alle Branchenvorlagen vergleichen", ar: "قارن كل إعدادات المجالات" })}>Compare all industry presets</a>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="wrap">
      <div class="split">
        <div>
          ${head(
            { en: "Built in, not bolted on", de: "Eingebaut, nicht angeflanscht", ar: "مدمج لا مضاف" },
            { en: "The Swiss details that usually cost extra", de: "Die Schweizer Details, die sonst extra kosten", ar: "تفاصيل سويسرية عادةً ما تُكلّف إضافيًا" }
          )}
          ${ticks([
            { en: "8.1% standard and 2.6% reduced VAT, with the dine-in versus takeaway distinction applied per line.", de: "8,1 % Normal- und 2,6 % reduzierter MwSt.-Satz, mit Unterscheidung Vor-Ort/Takeaway pro Position.", ar: "ضريبة 8.1% عادية و2.6% مخفَّضة، مع التفرقة بين التناول بالمكان والتيك أواي لكل بند." },
            { en: "Cash totals rounded to the nearest CHF 0.05 while card and TWINT keep the exact amount.", de: "Barbeträge auf 5 Rappen gerundet, Karte und TWINT bleiben exakt.", ar: "تقريب النقد لأقرب 0.05 فرنك مع إبقاء المبلغ الدقيق للبطاقة وTWINT." },
            { en: "TWINT, card, cash and invoice as first-class payment methods on the receipt and in reports.", de: "TWINT, Karte, Bar und Rechnung als gleichwertige Zahlungsarten auf Bon und in Berichten.", ar: "TWINT والبطاقة والنقد والفاتورة كوسائل دفع أساسية في الإيصال والتقارير." },
            { en: "German, English and Arabic across the whole product, including right-to-left layout.", de: "Deutsch, Englisch und Arabisch im gesamten Produkt, inklusive Rechts-nach-links-Layout.", ar: "الألمانية والإنجليزية والعربية في كل المنتج، بما في ذلك التخطيط من اليمين لليسار." },
            { en: "Data hosted in Europe, with GDPR and nDSG deletion and export requests handled from the console.", de: "Daten in Europa gehostet, DSGVO- und nDSG-Lösch- sowie Exportanfragen direkt in der Konsole.", ar: "استضافة البيانات في أوروبا، مع معالجة طلبات الحذف والتصدير وفق GDPR وnDSG من اللوحة." },
          ])}
          <div class="btn-row">
            <a class="btn btn-ghost" href="/compliance/" ${tAttrs({ en: "Read the compliance detail", de: "Compliance-Details lesen", ar: "اقرأ تفاصيل الامتثال" })}>Read the compliance detail</a>
          </div>
        </div>
        <div class="reveal">
          ${shot({ id: "home-swiss-receipt", ratio: "5 / 6", size: "1250 × 1500", alt: { en: "Receipt showing Swiss VAT split and cash rounding", de: "Bon mit Schweizer MwSt.-Aufteilung und Rappenrundung", ar: "إيصال يوضّح تقسيم الضريبة السويسرية والتقريب النقدي" } })}
        </div>
      </div>
    </div>
  </section>

  <section class="section section--alt">
    <div class="wrap">
      ${head(
        { en: "Everywhere you work", de: "Überall im Einsatz", ar: "أينما تعمل" },
        { en: "Phone in the aisle, tablet at the counter, browser in the office", de: "Handy im Gang, Tablet an der Theke, Browser im Büro", ar: "هاتف بين الرفوف، تابلت على الكاشير، متصفح في المكتب" },
        {
          en: "One codebase, three form factors. The layout adapts rather than shrinking: the cart becomes a sheet on a phone, a sidebar on a tablet and a fixed panel on a desktop.",
          de: "Eine Codebasis, drei Formate. Das Layout passt sich an, statt nur zu schrumpfen: Der Warenkorb wird zum Sheet am Handy, zur Seitenleiste am Tablet und zum festen Panel am Desktop.",
          ar: "قاعدة كود واحدة وثلاثة أحجام. التخطيط يتكيّف بدل أن ينكمش: السلة تصبح لوحًا في الهاتف، وشريطًا جانبيًا في التابلت، ولوحة ثابتة في الكمبيوتر.",
        },
        true
      )}
      <div class="reveal">
        ${shot({ id: "home-devices", ratio: "16 / 8", size: "1920 × 960", contain: true, alt: { en: "Kassenta shown on a phone, a tablet and a desktop browser", de: "Kassenta auf Smartphone, Tablet und Desktop-Browser", ar: "Kassenta على هاتف وتابلت ومتصفح كمبيوتر" } })}
      </div>
    </div>
  </section>

  <section class="section">
    <div class="wrap" style="max-width:860px">
      ${head({ en: "Questions", de: "Fragen", ar: "أسئلة" }, { en: "Frequently asked", de: "Häufig gefragt", ar: "الأكثر تكرارًا" }, undefined, true)}
      ${faq([
        {
          q: { en: "Do I need to buy special hardware?", de: "Brauche ich spezielle Hardware?", ar: "هل أحتاج أجهزة خاصة؟" },
          a: {
            en: "No. Kassenta runs in any modern browser and as an app on Android and iOS, so an existing tablet or laptop is enough to start. Receipt printers, cash drawers and barcode scanners are supported but optional.",
            de: "Nein. Kassenta läuft in jedem modernen Browser sowie als App unter Android und iOS — ein vorhandenes Tablet oder Notebook genügt für den Start. Bondrucker, Kassenladen und Barcodescanner werden unterstützt, sind aber optional.",
            ar: "لا. يعمل Kassenta في أي متصفح حديث وكتطبيق على أندرويد وiOS، لذا يكفي تابلت أو لابتوب لديك للبدء. الطابعات وأدراج النقد وقارئات الباركود مدعومة لكنها اختيارية.",
          },
        },
        {
          q: { en: "What happens if the internet drops?", de: "Was passiert bei Internetausfall?", ar: "ماذا لو انقطع الإنترنت؟" },
          a: {
            en: "The POS keeps taking orders and payments from its local cache and syncs the queue once the connection returns. Online ordering and driver tracking need connectivity, since they involve people outside the building.",
            de: "Die Kasse nimmt weiterhin Bestellungen und Zahlungen aus dem lokalen Cache entgegen und synchronisiert die Warteschlange, sobald die Verbindung zurück ist. Online-Bestellung und Fahrer-Tracking benötigen eine Verbindung, da Personen ausserhalb beteiligt sind.",
            ar: "يواصل الكاشير استقبال الطلبات والمدفوعات من الذاكرة المحلية ثم يزامن القائمة فور عودة الاتصال. أما الطلب الإلكتروني وتتبّع السائقين فيحتاجان اتصالًا لأنهما يشملان أشخاصًا خارج المحل.",
          },
        },
        {
          q: { en: "Can I move my existing products and customers in?", de: "Kann ich bestehende Artikel und Kunden übernehmen?", ar: "هل يمكن نقل منتجاتي وعملائي الحاليين؟" },
          a: {
            en: "Yes. Products, categories and customers import from CSV, and we do the first import with you during onboarding so the mapping is right before you go live.",
            de: "Ja. Artikel, Kategorien und Kunden werden per CSV importiert; den ersten Import machen wir beim Onboarding gemeinsam, damit die Zuordnung vor dem Livegang stimmt.",
            ar: "نعم. تُستورد المنتجات والفئات والعملاء من ملف CSV، ونقوم بأول استيراد معك أثناء التهيئة لضمان صحة الربط قبل التشغيل.",
          },
        },
        {
          q: { en: "How many branches can one account hold?", de: "Wie viele Filialen kann ein Konto haben?", ar: "كم فرعًا يستوعب الحساب الواحد؟" },
          a: {
            en: "As many as you need. Each branch keeps its own stock, staff and prices while the owner console reports across all of them together.",
            de: "So viele wie nötig. Jede Filiale führt eigenen Bestand, Personal und Preise, während die Betreiber-Konsole filialübergreifend auswertet.",
            ar: "بلا حد. لكل فرع مخزونه وموظفوه وأسعاره، بينما تعرض لوحة المالك تقارير مجمّعة لكل الفروع.",
          },
        },
        {
          q: { en: "Is my data locked in?", de: "Sind meine Daten eingeschlossen?", ar: "هل بياناتي محتجزة؟" },
          a: {
            en: "No. Sales, products and customers can be exported to CSV at any time from the reporting screens, and a full export can be requested from support.",
            de: "Nein. Umsätze, Artikel und Kunden lassen sich jederzeit aus den Berichten als CSV exportieren; einen Vollexport erhalten Sie über den Support.",
            ar: "لا. يمكن تصدير المبيعات والمنتجات والعملاء إلى CSV في أي وقت من شاشات التقارير، وطلب تصدير كامل عبر الدعم.",
          },
        },
      ])}
    </div>
  </section>

  ${ctaBand(
    { en: "See it running on your own menu", de: "Sehen Sie es mit Ihrer eigenen Karte", ar: "شاهده يعمل على قائمتك أنت" },
    {
      en: "Send us your current menu or product list. We load it into a demo account and walk you through a normal service — counter, online order and delivery — in about 30 minutes.",
      de: "Senden Sie uns Ihre aktuelle Karte oder Artikelliste. Wir laden sie in ein Demo-Konto und zeigen Ihnen in rund 30 Minuten einen normalen Serviceablauf — Theke, Online-Bestellung und Lieferung.",
      ar: "أرسل لنا قائمتك أو قائمة منتجاتك الحالية. نحمّلها في حساب تجريبي ونعرض لك دورة عمل كاملة — كاشير وطلب إلكتروني وتوصيل — في نحو 30 دقيقة.",
    }
  )}`,
};

// ════════════════════════════════════════════════════════════════════════════
// FEATURES
// ════════════════════════════════════════════════════════════════════════════
export const features: { meta: PageMeta; body: string } = {
  meta: {
    path: "/features",
    title: {
      en: "Features — Kassenta POS",
      de: "Funktionen — Kassenta POS",
      ar: "المميزات — Kassenta POS",
    },
    description: {
      en: "Touch POS, table QR ordering, delivery dispatch, inventory, CRM and loyalty, staff shifts and VAT-ready reporting — every module in the Kassenta platform.",
      de: "Touch-Kasse, Tisch-QR-Bestellung, Lieferdisposition, Lagerhaltung, CRM und Treueprogramm, Schichten und MwSt.-fähige Auswertungen — alle Module der Kassenta-Plattform.",
      ar: "كاشير لمسي، وطلب QR للطاولات، وإدارة التوصيل، والمخزون، وإدارة العملاء والولاء، وورديات الموظفين، وتقارير جاهزة للضريبة — كل وحدات منصة Kassenta.",
    },
  },
  body: `
  ${pageHead(
    { en: "Everything the floor, the kitchen and the office need", de: "Alles für Verkaufsfläche, Küche und Büro", ar: "كل ما تحتاجه الصالة والمطبخ والإدارة" },
    {
      en: "Kassenta is one application with modules you switch on as you grow. Nothing here is a separate purchase or a separate login.",
      de: "Kassenta ist eine Anwendung mit Modulen, die Sie beim Wachsen zuschalten. Nichts davon ist ein separater Kauf oder ein separates Login.",
      ar: "Kassenta تطبيق واحد بوحدات تفعّلها مع نموّك. لا شيء هنا شراء منفصل أو حساب منفصل.",
    },
    { en: "Features", de: "Funktionen", ar: "المميزات" }
  )}

  <section class="section">
    <div class="wrap">
      <div class="split">
        <div>
          ${head({ en: "Selling", de: "Verkauf", ar: "البيع" }, { en: "A till that keeps up with a queue", de: "Eine Kasse, die mit der Schlange mithält", ar: "كاشير يواكب الطابور" })}
          ${ticks([
            { en: "Category and search-first product grid, tuned so a regular order takes three taps.", de: "Raster nach Kategorie und Suche, so abgestimmt, dass eine Standardbestellung drei Taps braucht.", ar: "شبكة منتجات بالفئات والبحث، مضبوطة ليتم الطلب المعتاد بثلاث ضغطات." },
            { en: "Variants and modifiers with price deltas — sizes, extras, removals and free-text kitchen notes.", de: "Varianten und Optionen mit Preisdifferenz — Grössen, Extras, Abwahl und freie Küchennotizen.", ar: "متغيّرات وإضافات بفروق سعرية — أحجام وإضافات وحذف وملاحظات مطبخ حرة." },
            { en: "Percentage or fixed discounts per line or per ticket, with a reason recorded against the operator.", de: "Prozentuale oder feste Rabatte je Position oder Bon, mit Begründung und Zuordnung zum Mitarbeiter.", ar: "خصومات نسبية أو ثابتة لكل بند أو فاتورة، مع تسجيل السبب باسم الموظف." },
            { en: "Split payments across cash, card, TWINT and wallet on a single ticket.", de: "Teilzahlungen über Bar, Karte, TWINT und Guthaben auf einem Bon.", ar: "دفع مقسَّم بين النقد والبطاقة وTWINT والمحفظة في فاتورة واحدة." },
            { en: "Held tickets, quick reprint and a searchable invoice history with a 24-hour and full-range view.", de: "Geparkte Bons, Schnell-Nachdruck und durchsuchbare Beleghistorie mit 24-Stunden- und Gesamtansicht.", ar: "فواتير معلَّقة، وإعادة طباعة سريعة، وسجل فواتير قابل للبحث بعرض 24 ساعة أو كامل المدة." },
            { en: "Barcode scanning from the device camera or a USB or Bluetooth scanner.", de: "Barcode-Scan über Gerätekamera oder USB-/Bluetooth-Scanner.", ar: "مسح الباركود من كاميرا الجهاز أو ماسح USB أو بلوتوث." },
          ])}
        </div>
        <div class="reveal">${shot({ id: "feature-pos-grid", ratio: "16 / 11", size: "1600 × 1100", alt: { en: "The Kassenta product grid and cart during a busy service", de: "Artikelraster und Warenkorb von Kassenta im laufenden Betrieb", ar: "شبكة المنتجات وسلة Kassenta أثناء الخدمة" } })}</div>
      </div>
    </div>
  </section>

  <section class="section section--alt">
    <div class="wrap">
      <div class="split">
        <div class="reveal">${shot({ id: "feature-online-store", ratio: "16 / 11", size: "1600 × 1100", alt: { en: "A branded Kassenta online storefront on a phone", de: "Gebrandeter Kassenta-Onlineshop auf dem Smartphone", ar: "متجر Kassenta الإلكتروني بهوية المتجر على الهاتف" } })}</div>
        <div>
          ${head({ en: "Online and tables", de: "Online und Tische", ar: "أونلاين والطاولات" }, { en: "Your own ordering channel, not a marketplace listing", de: "Ihr eigener Bestellkanal statt eines Marktplatz-Eintrags", ar: "قناة طلب خاصة بك لا مجرد إدراج في تطبيق وسيط" })}
          ${ticks([
            { en: "A storefront at your own address, with your logo, colours, opening hours and promo banner.", de: "Ein Shop unter Ihrer eigenen Adresse, mit Logo, Farben, Öffnungszeiten und Aktionsbanner.", ar: "متجر على عنوانك الخاص، بشعارك وألوانك ومواعيدك وشريط عروضك." },
            { en: "Per-table QR codes that open the menu with the table already attached to the order.", de: "QR-Codes je Tisch, die die Karte mit bereits zugeordnetem Tisch öffnen.", ar: "أكواد QR لكل طاولة تفتح القائمة والطاولة مرتبطة بالطلب تلقائيًا." },
            { en: "Delivery, pickup and dine-in as separate flows, each with its own fee, minimum and VAT treatment.", de: "Lieferung, Abholung und Vor-Ort als getrennte Abläufe mit eigener Gebühr, Mindestbestellwert und MwSt.-Behandlung.", ar: "توصيل واستلام وتناول بالمكان كمسارات منفصلة، لكل منها رسوم وحد أدنى ومعالجة ضريبية خاصة." },
            { en: "Scheduled orders for a later slot, with the kitchen queue ordering itself by promised time.", de: "Vorbestellungen für ein späteres Zeitfenster; die Küchenwarteschlange sortiert sich nach Zusagezeit.", ar: "طلبات مجدولة لوقت لاحق، مع ترتيب قائمة المطبخ تلقائيًا حسب الوقت المتفق عليه." },
            { en: "Promo codes with usage limits, validity windows and per-code reporting.", de: "Gutscheincodes mit Nutzungslimits, Gültigkeitszeiträumen und Auswertung je Code.", ar: "أكواد خصم بحدود استخدام وفترات صلاحية وتقارير لكل كود." },
          ])}
        </div>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="wrap">
      ${head(
        { en: "Modules", de: "Module", ar: "الوحدات" },
        { en: "The rest of the operation", de: "Der Rest des Betriebs", ar: "بقية العمليات" },
        undefined,
        true
      )}
      <div class="grid grid-3">
        ${card(icons.truck, { en: "Delivery dispatch", de: "Lieferdisposition", ar: "إدارة التوصيل" }, {
          en: "Driver roster with online, busy and offline states. Assign an order to a driver or broadcast it to everyone free and let the first to accept take it.",
          de: "Fahrerübersicht mit Status online, beschäftigt und offline. Auftrag direkt zuweisen oder an alle freien Fahrer ausschreiben — wer zuerst annimmt, fährt.",
          ar: "قائمة سائقين بحالات متاح ومشغول وغير متصل. أسنِد الطلب لسائق أو ابثّه لكل المتاحين ليأخذه أول من يقبله.",
        })}
        ${card(icons.pin, { en: "Delivery zones", de: "Lieferzonen", ar: "مناطق التوصيل" }, {
          en: "Draw zones by postcode or radius, each with its own fee, minimum order value and estimated time shown to the customer.",
          de: "Zonen nach Postleitzahl oder Radius festlegen, je mit eigener Gebühr, Mindestbestellwert und angezeigter Lieferzeit.",
          ar: "حدِّد المناطق بالرمز البريدي أو نصف القطر، لكل منها رسوم وحد أدنى ووقت متوقع يظهر للعميل.",
        })}
        ${card(icons.box, { en: "Inventory", de: "Lagerhaltung", ar: "المخزون" }, {
          en: "Stock levels per branch, low-stock alerts, stock counts with variance, returns with reason codes and supplier records.",
          de: "Bestände je Filiale, Warnungen bei Mindestbestand, Inventuren mit Abweichung, Retouren mit Grundcodes und Lieferantenbelege.",
          ar: "أرصدة لكل فرع، وتنبيهات نقص، وجرد مع فروقات، ومرتجعات بأسباب، وسجلات موردين.",
        })}
        ${card(icons.users, { en: "Customers and loyalty", de: "Kunden und Treue", ar: "العملاء والولاء" }, {
          en: "Full customer records with addresses and order history, a store wallet, referral codes and bronze to platinum loyalty tiers.",
          de: "Vollständige Kundenakten mit Adressen und Bestellhistorie, Guthabenkonto, Empfehlungscodes und Treuestufen von Bronze bis Platin.",
          ar: "سجلات عملاء كاملة بالعناوين وسجل الطلبات، ومحفظة داخل المتجر، وأكواد إحالة، ومستويات ولاء من البرونزي للبلاتيني.",
        })}
        ${card(icons.clock, { en: "Staff and shifts", de: "Personal und Schichten", ar: "الموظفون والورديات" }, {
          en: "PIN login per employee, role-based permissions, attendance, cash drawer opening and closing floats and a per-shift audit trail.",
          de: "PIN-Login je Mitarbeiter, rollenbasierte Rechte, Anwesenheit, Kassenbestand bei Öffnung und Abschluss sowie Audit-Trail je Schicht.",
          ar: "دخول برقم سري لكل موظف، وصلاحيات حسب الدور، وحضور، ورصيد درج النقد عند الفتح والإغلاق، وسجل تدقيق لكل وردية.",
        })}
        ${card(icons.chart, { en: "Reporting", de: "Auswertungen", ar: "التقارير" }, {
          en: "Sales, inventory, returns, delivery, finance and activity views, filterable by date, branch and operator, exportable to CSV.",
          de: "Ansichten für Umsatz, Bestand, Retouren, Lieferung, Finanzen und Aktivität — filterbar nach Datum, Filiale und Mitarbeiter, als CSV exportierbar.",
          ar: "عروض للمبيعات والمخزون والمرتجعات والتوصيل والمالية والنشاط، بفلاتر للتاريخ والفرع والموظف، وتصدير إلى CSV.",
        })}
        ${card(icons.phone, { en: "Caller ID", de: "Rufnummernerkennung", ar: "تعريف المتصل" }, {
          en: "Incoming calls match against the customer database and open the record with the last order ready to repeat.",
          de: "Eingehende Anrufe werden mit der Kundendatenbank abgeglichen und öffnen den Datensatz samt letzter Bestellung zum Wiederholen.",
          ar: "تُطابَق المكالمات الواردة مع قاعدة العملاء وتفتح السجل مع آخر طلب جاهز للتكرار.",
        })}
        ${card(icons.bell, { en: "Notifications", de: "Benachrichtigungen", ar: "الإشعارات" }, {
          en: "Web push to the counter, email confirmations to the customer and WhatsApp messages for order and delivery updates.",
          de: "Web-Push an die Theke, E-Mail-Bestätigungen an Kunden und WhatsApp-Nachrichten zu Bestell- und Lieferstatus.",
          ar: "إشعارات فورية للكاشير، وتأكيدات بالبريد للعميل، ورسائل واتساب لتحديثات الطلب والتوصيل.",
        })}
        ${card(icons.printer, { en: "Printing", de: "Druck", ar: "الطباعة" }, {
          en: "Thermal receipts, kitchen tickets and A4 PDF invoices, with a printer profile per station.",
          de: "Thermobons, Küchenbons und A4-PDF-Rechnungen, mit Druckerprofil je Station.",
          ar: "إيصالات حرارية وتذاكر مطبخ وفواتير PDF بحجم A4، مع ملف طابعة لكل محطة.",
        })}
      </div>
    </div>
  </section>

  <section class="section section--inset">
    <div class="wrap">
      <div class="split">
        <div>
          ${head({ en: "Platform", de: "Plattform", ar: "المنصة" }, { en: "Made to be extended", de: "Für Erweiterung gebaut", ar: "مبنيّ للتوسّع" })}
          ${ticks([
            { en: "Modules are switched on per business, so a café never sees pharmacy fields and a pharmacy never sees table plans.", de: "Module werden je Betrieb aktiviert — ein Café sieht nie Apothekenfelder, eine Apotheke nie Tischpläne.", ar: "تُفعَّل الوحدات لكل نشاط، فلا يرى الكافيه حقول الصيدلية ولا ترى الصيدلية مخطط الطاولات." },
            { en: "A documented REST API for stock, orders and customers, so accounting and ERP tools can read and write.", de: "Dokumentierte REST-API für Bestand, Bestellungen und Kunden, damit Buchhaltung und ERP lesen und schreiben können.", ar: "واجهة REST موثّقة للمخزون والطلبات والعملاء، لتقرأ وتكتب أدوات المحاسبة وERP." },
            { en: "Webhooks on order created, paid, dispatched and delivered.", de: "Webhooks bei Bestellung erstellt, bezahlt, versendet und geliefert.", ar: "Webhooks عند إنشاء الطلب ودفعه وإرساله وتسليمه." },
            { en: "Role and permission model that also governs the API, not just the screens.", de: "Rollen- und Rechtemodell, das auch die API steuert, nicht nur die Oberflächen.", ar: "نموذج أدوار وصلاحيات يحكم الواجهة البرمجية أيضًا لا الشاشات فقط." },
          ])}
        </div>
        <div class="reveal">${shot({ id: "feature-modules", ratio: "4 / 3", size: "1400 × 1050", alt: { en: "Module switches in the Kassenta owner console", de: "Modulschalter in der Kassenta-Betreiberkonsole", ar: "مفاتيح الوحدات في لوحة مالك Kassenta" } })}</div>
      </div>
    </div>
  </section>

  ${ctaBand(
    { en: "Want a module we have not listed?", de: "Fehlt Ihnen ein Modul?", ar: "تحتاج وحدة غير مذكورة؟" },
    {
      en: "Tell us what your trade needs. The platform is built so a new vertical module is a configuration, not a rewrite.",
      de: "Sagen Sie uns, was Ihre Branche braucht. Die Plattform ist so gebaut, dass ein neues Branchenmodul eine Konfiguration ist — kein Neubau.",
      ar: "أخبرنا بما يحتاجه نشاطك. المنصة مبنية بحيث تكون الوحدة الجديدة إعدادًا لا إعادة بناء.",
    }
  )}`,
};

// ════════════════════════════════════════════════════════════════════════════
// SOLUTIONS / INDUSTRIES
// ════════════════════════════════════════════════════════════════════════════
const vertical = (
  id: string,
  icon: string,
  name: T3,
  intro: T3,
  points: T3[],
  alt: T3
) => `
  <section class="section" id="${id}">
    <div class="wrap">
      <div class="split">
        <div>
          <div class="card-icon">${icon}</div>
          <h2 ${tAttrs(name)}>${esc(name.en)}</h2>
          <p class="lead" style="margin:14px 0 24px" ${tAttrs(intro)}>${esc(intro.en)}</p>
          ${ticks(points)}
        </div>
        <div class="reveal">${shot({ id, ratio: "4 / 3", size: "1400 × 1050", alt })}</div>
      </div>
    </div>
  </section>`;

export const solutions: { meta: PageMeta; body: string } = {
  meta: {
    path: "/solutions",
    title: { en: "Industries — Kassenta POS", de: "Branchen — Kassenta POS", ar: "المجالات — Kassenta POS" },
    description: {
      en: "Ready-made configurations for cafés, restaurants, supermarkets, pharmacies, bakeries and retail — each with the fields, taxes and workflows that trade actually uses.",
      de: "Fertige Konfigurationen für Cafés, Restaurants, Supermärkte, Apotheken, Bäckereien und Einzelhandel — je mit den Feldern, Steuersätzen und Abläufen der Branche.",
      ar: "إعدادات جاهزة للمقاهي والمطاعم والسوبر ماركت والصيدليات والمخابز والتجزئة — لكل منها الحقول والضرائب وسير العمل المناسب.",
    },
  },
  body: `
  ${pageHead(
    { en: "One platform, six ready-made shapes", de: "Eine Plattform, sechs fertige Ausprägungen", ar: "منصة واحدة، ستة إعدادات جاهزة" },
    {
      en: "Choosing your industry at setup switches on the right modules, tax categories, product fields and receipt layout. Everything stays editable afterwards.",
      de: "Die Branchenwahl bei der Einrichtung aktiviert die passenden Module, Steuerkategorien, Artikelfelder und das Bonlayout. Alles bleibt danach änderbar.",
      ar: "اختيار مجالك عند التهيئة يفعّل الوحدات وفئات الضريبة وحقول المنتجات وتنسيق الإيصال المناسبة. ويبقى كل شيء قابلًا للتعديل بعدها.",
    },
    { en: "Industries", de: "Branchen", ar: "المجالات" }
  )}

  ${vertical(
    "industry-cafe",
    icons.coffee,
    { en: "Cafés and bars", de: "Cafés und Bars", ar: "المقاهي والبارات" },
    {
      en: "Speed is the whole product. The preset puts the twelve items that make up most of the day on the first screen and turns everything else into a modifier.",
      de: "Tempo ist das Produkt. Die Vorlage legt die zwölf Artikel, die den Grossteil des Tages ausmachen, auf den ersten Bildschirm und macht den Rest zur Option.",
      ar: "السرعة هي المنتج كله. يضع الإعداد الجاهز الأصناف الاثني عشر الأكثر مبيعًا في الشاشة الأولى ويحوّل الباقي إلى إضافات.",
    },
    [
      { en: "Size and milk options as one-tap modifiers with automatic price deltas.", de: "Grössen und Milchoptionen als Ein-Tap-Optionen mit automatischer Preisdifferenz.", ar: "أحجام وخيارات حليب بضغطة واحدة مع فروق سعر تلقائية." },
      { en: "Open tabs per table or per guest name, settled at the end of the visit.", de: "Offene Deckel je Tisch oder Gastname, am Ende des Besuchs abgerechnet.", ar: "حسابات مفتوحة لكل طاولة أو باسم الضيف، تُسدَّد نهاية الزيارة." },
      { en: "Tip line on the receipt and a tip report per employee per shift.", de: "Trinkgeldzeile auf dem Bon und Trinkgeldbericht je Mitarbeiter und Schicht.", ar: "سطر بقشيش في الإيصال وتقرير بقشيش لكل موظف في كل وردية." },
      { en: "Loyalty stamps that convert into a free item automatically at the till.", de: "Treuestempel, die an der Kasse automatisch zu einem Gratisartikel werden.", ar: "أختام ولاء تتحوّل تلقائيًا إلى صنف مجاني عند الكاشير." },
    ],
    { en: "Kassenta on a café counter with a fast-order grid", de: "Kassenta an der Café-Theke mit Schnellbestellraster", ar: "Kassenta على كاشير كافيه بشبكة طلب سريع" }
  )}

  ${vertical(
    "industry-restaurant",
    icons.register,
    { en: "Restaurants", de: "Restaurants", ar: "المطاعم" },
    {
      en: "Service happens in parallel: tables, phone orders, walk-ins and delivery all at once. The preset keeps them in one queue with clear promised times.",
      de: "Service läuft parallel: Tische, Telefonbestellungen, Laufkundschaft und Lieferung gleichzeitig. Die Vorlage hält alles in einer Warteschlange mit klaren Zusagezeiten.",
      ar: "الخدمة تسير بالتوازي: طاولات ومكالمات وزبائن عابرون وتوصيل في آن واحد. يبقيها الإعداد في قائمة واحدة بأوقات واضحة.",
    },
    [
      { en: "Table plan with availability, occupancy and reservation states.", de: "Tischplan mit Verfügbarkeit, Belegung und Reservierungsstatus.", ar: "مخطط طاولات بحالات الإتاحة والإشغال والحجز." },
      { en: "Dine-in and takeaway VAT applied per line, so a mixed ticket is still correct.", de: "MwSt. für Vor-Ort und Takeaway je Position — auch ein gemischter Bon bleibt korrekt.", ar: "ضريبة التناول بالمكان والتيك أواي لكل بند، فتبقى الفاتورة المختلطة صحيحة." },
      { en: "Split a bill by guest, by item or evenly, with separate receipts.", de: "Rechnung nach Gast, nach Artikel oder gleichmässig teilen, mit separaten Bons.", ar: "تقسيم الفاتورة حسب الضيف أو الصنف أو بالتساوي، مع إيصالات منفصلة." },
      { en: "Kitchen tickets grouped by course, printed or shown on a screen.", de: "Küchenbons nach Gang gruppiert, gedruckt oder auf dem Bildschirm.", ar: "تذاكر مطبخ مجمَّعة حسب الطبق، مطبوعة أو معروضة على شاشة." },
    ],
    { en: "Restaurant table plan and live order queue in Kassenta", de: "Restaurant-Tischplan und Live-Bestellliste in Kassenta", ar: "مخطط طاولات المطعم وقائمة الطلبات الحيّة في Kassenta" }
  )}

  ${vertical(
    "industry-supermarket",
    icons.cart,
    { en: "Supermarkets and grocers", de: "Supermärkte und Lebensmittelhandel", ar: "السوبر ماركت والبقالة" },
    {
      en: "High item counts and low margins mean the checkout has to be exact and fast. The preset optimises for scanning rather than browsing.",
      de: "Viele Artikel und schmale Margen verlangen eine exakte und schnelle Kasse. Die Vorlage optimiert auf Scannen statt Blättern.",
      ar: "كثرة الأصناف وضآلة الهامش تتطلبان دفعًا دقيقًا وسريعًا. يركّز الإعداد على المسح لا التصفّح.",
    },
    [
      { en: "Continuous barcode scanning with quantity multipliers and instant subtotal.", de: "Durchgehendes Barcode-Scannen mit Mengenmultiplikatoren und sofortiger Zwischensumme.", ar: "مسح باركود متواصل مع مضاعِفات الكمية ومجموع فوري." },
      { en: "Weighed goods priced per kilogram, from a connected scale or manual entry.", de: "Gewichtsware mit Kilopreis, von angeschlossener Waage oder manueller Eingabe.", ar: "سلع بالوزن مسعَّرة بالكيلو، من ميزان متصل أو بإدخال يدوي." },
      { en: "Reduced VAT for food handled separately from standard-rate non-food.", de: "Reduzierte MwSt. für Lebensmittel getrennt vom Normalsatz für Non-Food.", ar: "ضريبة مخفَّضة للأغذية منفصلة عن النسبة العادية لغير الأغذية." },
      { en: "Deposit and return handling as a distinct line, not a discount.", de: "Pfand und Rückgabe als eigene Position, nicht als Rabatt.", ar: "التأمين المسترد كسطر مستقل لا كخصم." },
    ],
    { en: "Supermarket checkout with barcode scanning in Kassenta", de: "Supermarktkasse mit Barcode-Scan in Kassenta", ar: "كاشير سوبر ماركت مع مسح باركود في Kassenta" }
  )}

  ${vertical(
    "industry-pharmacy",
    icons.pill,
    { en: "Pharmacies", de: "Apotheken", ar: "الصيدليات" },
    {
      en: "Traceability matters more than speed. The preset adds the fields a regulator asks for and records who did what.",
      de: "Nachvollziehbarkeit zählt mehr als Tempo. Die Vorlage ergänzt die von Behörden geforderten Felder und protokolliert, wer was getan hat.",
      ar: "التتبّع أهم من السرعة. يضيف الإعداد الحقول التي تطلبها الجهات الرقابية ويسجّل من فعل ماذا.",
    },
    [
      { en: "Batch number and expiry date per item, with an alert before stock expires.", de: "Chargennummer und Verfallsdatum je Artikel, mit Warnung vor Ablauf.", ar: "رقم التشغيلة وتاريخ الصلاحية لكل صنف، مع تنبيه قبل الانتهاء." },
      { en: "Restricted-item prompts that require a supervisor PIN before the sale completes.", de: "Hinweise bei eingeschränkten Artikeln, die vor Abschluss eine Vorgesetzten-PIN verlangen.", ar: "تنبيهات الأصناف المقيَّدة تتطلب رقم مشرف قبل إتمام البيع." },
      { en: "Per-operator audit trail on every sale, void, discount and price override.", de: "Audit-Trail je Mitarbeiter für jeden Verkauf, Storno, Rabatt und jede Preisänderung.", ar: "سجل تدقيق لكل موظف على كل بيع وإلغاء وخصم وتعديل سعر." },
      { en: "Reduced VAT categories separated from standard-rate cosmetics and accessories.", de: "Reduzierte MwSt.-Kategorien getrennt von Kosmetik und Zubehör zum Normalsatz.", ar: "فئات ضريبة مخفَّضة منفصلة عن مستحضرات التجميل والملحقات بالنسبة العادية." },
    ],
    { en: "Pharmacy counter with batch and expiry fields in Kassenta", de: "Apothekentresen mit Chargen- und Verfallsfeldern in Kassenta", ar: "كاشير صيدلية مع حقول التشغيلة والصلاحية في Kassenta" }
  )}

  ${vertical(
    "industry-bakery",
    icons.scale,
    { en: "Bakeries", de: "Bäckereien", ar: "المخابز" },
    {
      en: "Everything sells in four hours and what is left is waste. The preset ties pre-orders, production and end-of-day waste into one number.",
      de: "Alles verkauft sich in vier Stunden, der Rest ist Ausschuss. Die Vorlage verbindet Vorbestellungen, Produktion und Tagesende-Retouren zu einer Kennzahl.",
      ar: "كل شيء يُباع في أربع ساعات وما يتبقّى هدر. يربط الإعداد الطلبات المسبقة والإنتاج وهدر نهاية اليوم في رقم واحد.",
    },
    [
      { en: "Price by weight or by piece on the same product, chosen at the till.", de: "Preis nach Gewicht oder Stück beim selben Artikel, an der Kasse wählbar.", ar: "تسعير بالوزن أو بالقطعة للمنتج نفسه، يُختار عند الكاشير." },
      { en: "Pre-orders for a named pickup time, listed for the morning shift.", de: "Vorbestellungen mit fester Abholzeit, für die Frühschicht aufgelistet.", ar: "طلبات مسبقة بوقت استلام محدَّد، تظهر لوردية الصباح." },
      { en: "Production plan generated from yesterday's sales and today's pre-orders.", de: "Produktionsplan aus den gestrigen Verkäufen und heutigen Vorbestellungen.", ar: "خطة إنتاج تُبنى من مبيعات الأمس وطلبات اليوم المسبقة." },
      { en: "Waste recorded at close as a separate figure so margin stays honest.", de: "Retouren beim Abschluss separat erfasst, damit die Marge ehrlich bleibt.", ar: "تسجيل الهدر عند الإغلاق كرقم منفصل ليبقى الهامش صادقًا." },
    ],
    { en: "Bakery counter with weight-based pricing in Kassenta", de: "Bäckereitheke mit Preis nach Gewicht in Kassenta", ar: "كاشير مخبز مع تسعير بالوزن في Kassenta" }
  )}

  ${vertical(
    "industry-retail",
    icons.tag,
    { en: "Retail", de: "Einzelhandel", ar: "التجزئة" },
    {
      en: "The same shirt in five sizes and three colours is fifteen stock lines. The preset keeps that manageable at the counter.",
      de: "Dasselbe Hemd in fünf Grössen und drei Farben sind fünfzehn Bestandszeilen. Die Vorlage hält das an der Kasse handhabbar.",
      ar: "القميص نفسه بخمسة مقاسات وثلاثة ألوان يعني خمسة عشر سطر مخزون. يبقيها الإعداد سهلة عند الكاشير.",
    },
    [
      { en: "Variant matrix by size and colour with per-variant stock and barcode.", de: "Variantenmatrix nach Grösse und Farbe mit Bestand und Barcode je Variante.", ar: "مصفوفة متغيّرات بالمقاس واللون مع مخزون وباركود لكل متغيّر." },
      { en: "Returns and exchanges with reason codes that feed the returns report.", de: "Retouren und Umtausch mit Grundcodes, die in den Retourenbericht fliessen.", ar: "مرتجعات واستبدال بأسباب محدَّدة تغذّي تقرير المرتجعات." },
      { en: "Customer records that show past purchases when a return has no receipt.", de: "Kundenakten mit früheren Käufen, wenn eine Retoure ohne Beleg kommt.", ar: "سجلات عملاء تُظهر المشتريات السابقة عند مرتجع بلا إيصال." },
      { en: "Seasonal price lists scheduled to start and end on set dates.", de: "Saisonale Preislisten mit geplantem Start- und Enddatum.", ar: "قوائم أسعار موسمية تبدأ وتنتهي في تواريخ محدَّدة." },
    ],
    { en: "Retail counter with size and colour variants in Kassenta", de: "Einzelhandelskasse mit Grössen- und Farbvarianten in Kassenta", ar: "كاشير تجزئة مع متغيّرات المقاس واللون في Kassenta" }
  )}

  ${ctaBand(
    { en: "Not on the list?", de: "Nicht dabei?", ar: "مجالك غير مذكور؟" },
    {
      en: "Butchers, florists, kiosks and salons all run on Kassenta today with a custom preset. Tell us the fields and rules your trade needs.",
      de: "Metzgereien, Floristen, Kioske und Salons arbeiten heute mit einer eigenen Vorlage auf Kassenta. Nennen Sie uns die Felder und Regeln Ihrer Branche.",
      ar: "الجزارون وبائعو الزهور والأكشاك والصالونات يعملون اليوم على Kassenta بإعداد مخصَّص. أخبرنا بالحقول والقواعد التي يحتاجها نشاطك.",
    }
  )}`,
};

// ════════════════════════════════════════════════════════════════════════════
// PRICING
// ════════════════════════════════════════════════════════════════════════════
const plan = (
  name: T3,
  monthly: number,
  blurb: T3,
  points: T3[],
  featured = false,
  tag?: T3
) => `
        <article class="card price-card${featured ? " featured" : ""} reveal">
          ${tag ? `<span class="badge price-tag" ${tAttrs(tag)}>${esc(tag.en)}</span>` : ""}
          <h3 ${tAttrs(name)}>${esc(name.en)}</h3>
          <p style="font-size:.9rem" ${tAttrs(blurb)}>${esc(blurb.en)}</p>
          <div class="price"><span data-monthly="${monthly}" data-yearly="${Math.round(monthly * 0.8)}" class="price-value">${monthly}</span> <small>CHF <span ${tAttrs({ en: "per month", de: "pro Monat", ar: "شهريًا" })}>per month</span></small></div>
          <p class="form-note" ${tAttrs({ en: "Per location. VAT excluded.", de: "Pro Standort. Exkl. MwSt.", ar: "لكل فرع. غير شامل الضريبة." })}>Per location. VAT excluded.</p>
          ${ticks(points)}
          <a class="btn ${featured ? "btn-primary" : "btn-ghost"}" href="/contact/" ${tAttrs({ en: "Start with this plan", de: "Mit diesem Plan starten", ar: "ابدأ بهذه الباقة" })}>Start with this plan</a>
        </article>`;

export const pricing: { meta: PageMeta; body: string } = {
  meta: {
    path: "/pricing",
    title: { en: "Pricing — Kassenta POS", de: "Preise — Kassenta POS", ar: "الأسعار — Kassenta POS" },
    description: {
      en: "Transparent per-location pricing in CHF. No commission on your own orders, no setup fee, and every plan includes onboarding and support.",
      de: "Transparente Preise je Standort in CHF. Keine Provision auf eigene Bestellungen, keine Einrichtungsgebühr, Onboarding und Support in jedem Plan.",
      ar: "أسعار شفافة لكل فرع بالفرنك السويسري. بلا عمولة على طلباتك، وبلا رسوم تأسيس، ومع تهيئة ودعم في كل الباقات.",
    },
  },
  body: `
  ${pageHead(
    { en: "Pay for locations, not for orders", de: "Zahlen Sie für Standorte, nicht für Bestellungen", ar: "ادفع مقابل الفروع لا مقابل الطلبات" },
    {
      en: "Delivery marketplaces take a share of every order. Kassenta charges a flat fee per location, so the more you sell through your own channel, the less each order costs you.",
      de: "Lieferplattformen behalten einen Anteil jeder Bestellung. Kassenta berechnet eine Pauschale je Standort — je mehr Sie über den eigenen Kanal verkaufen, desto günstiger wird jede Bestellung.",
      ar: "تأخذ منصات التوصيل نسبة من كل طلب. يفرض Kassenta رسمًا ثابتًا لكل فرع، فكلما بعت أكثر عبر قناتك الخاصة قلّت تكلفة الطلب.",
    },
    { en: "Pricing", de: "Preise", ar: "الأسعار" }
  )}

  <section class="section">
    <div class="wrap">
      <div style="text-align:center">
        <div class="billing-toggle" role="group" aria-label="Billing period">
          <button type="button" class="active" data-cycle="monthly" onclick="KassentaPricing.set('monthly')" ${tAttrs({ en: "Monthly", de: "Monatlich", ar: "شهري" })}>Monthly</button>
          <button type="button" data-cycle="yearly" onclick="KassentaPricing.set('yearly')" ${tAttrs({ en: "Yearly — save 20%", de: "Jährlich — 20% sparen", ar: "سنوي — وفّر 20%" })}>Yearly — save 20%</button>
        </div>
      </div>
      <div class="grid grid-3">
        ${plan(
          { en: "Starter", de: "Starter", ar: "المبتدئة" },
          49,
          { en: "One counter, one screen. For a single café, kiosk or small shop finding its feet.", de: "Eine Kasse, ein Bildschirm. Für ein einzelnes Café, einen Kiosk oder kleinen Laden.", ar: "كاشير واحد وشاشة واحدة. لكافيه أو كشك أو محل صغير في بدايته." },
          [
            { en: "POS on one device, unlimited products and staff PINs", de: "Kasse auf einem Gerät, unbegrenzte Artikel und Mitarbeiter-PINs", ar: "كاشير على جهاز واحد، ومنتجات وأرقام موظفين بلا حد" },
            { en: "Swiss VAT, cash rounding and TWINT", de: "Schweizer MwSt., Rappenrundung und TWINT", ar: "الضريبة السويسرية والتقريب النقدي وTWINT" },
            { en: "Sales and inventory reports with CSV export", de: "Umsatz- und Bestandsberichte mit CSV-Export", ar: "تقارير مبيعات ومخزون مع تصدير CSV" },
            { en: "Email support, next business day", de: "E-Mail-Support am nächsten Werktag", ar: "دعم بالبريد في يوم العمل التالي" },
          ]
        )}
        ${plan(
          { en: "Professional", de: "Professional", ar: "الاحترافية" },
          99,
          { en: "Counter plus your own online channel. For restaurants that deliver and take table orders.", de: "Kasse plus eigener Online-Kanal. Für Restaurants mit Lieferung und Tischbestellung.", ar: "كاشير مع قناتك الإلكترونية. للمطاعم التي توصّل وتستقبل طلبات الطاولات." },
          [
            { en: "Everything in Starter, on up to five devices", de: "Alles aus Starter, auf bis zu fünf Geräten", ar: "كل ما في المبتدئة، على خمسة أجهزة" },
            { en: "Branded online storefront and table QR ordering", de: "Gebrandeter Onlineshop und Tisch-QR-Bestellung", ar: "متجر إلكتروني بهويتك وطلب QR للطاولات" },
            { en: "Delivery zones, drivers and customer tracking links", de: "Lieferzonen, Fahrer und Tracking-Links für Kunden", ar: "مناطق توصيل وسائقون وروابط تتبّع للعملاء" },
            { en: "Loyalty tiers, wallet, promo codes and referrals", de: "Treuestufen, Guthaben, Gutscheincodes und Empfehlungen", ar: "مستويات ولاء ومحفظة وأكواد خصم وإحالات" },
            { en: "WhatsApp and email order notifications", de: "Bestellbenachrichtigungen per WhatsApp und E-Mail", ar: "إشعارات طلبات عبر واتساب والبريد" },
            { en: "Phone and chat support during business hours", de: "Telefon- und Chat-Support zu Geschäftszeiten", ar: "دعم هاتفي ومحادثة خلال ساعات العمل" },
          ],
          true,
          { en: "Most chosen", de: "Am häufigsten", ar: "الأكثر اختيارًا" }
        )}
        ${plan(
          { en: "Enterprise", de: "Enterprise", ar: "المؤسسات" },
          199,
          { en: "Several branches under one roof, with the API and the reporting to match.", de: "Mehrere Filialen unter einem Dach, mit passender API und Auswertung.", ar: "عدة فروع تحت مظلة واحدة، مع واجهة برمجية وتقارير مناسبة." },
          [
            { en: "Everything in Professional, unlimited devices", de: "Alles aus Professional, unbegrenzte Geräte", ar: "كل ما في الاحترافية، وأجهزة بلا حد" },
            { en: "Multi-branch console with consolidated reporting", de: "Filialkonsole mit konsolidierter Auswertung", ar: "لوحة متعددة الفروع بتقارير مجمّعة" },
            { en: "REST API, webhooks and accounting export", de: "REST-API, Webhooks und Buchhaltungsexport", ar: "واجهة REST وWebhooks وتصدير محاسبي" },
            { en: "Caller ID integration and custom vertical modules", de: "Rufnummernerkennung und eigene Branchenmodule", ar: "تعريف المتصل ووحدات مخصَّصة لمجالك" },
            { en: "Named contact, priority response and on-site onboarding", de: "Fester Ansprechpartner, priorisierte Reaktion und Onboarding vor Ort", ar: "مسؤول مخصَّص واستجابة ذات أولوية وتهيئة في الموقع" },
          ]
        )}
      </div>
      <p class="form-note" style="text-align:center;margin-top:24px" ${tAttrs({
        en: "Prices are per location in CHF, excluding VAT. Yearly billing is charged once for twelve months.",
        de: "Preise je Standort in CHF, exkl. MwSt. Die Jahresabrechnung erfolgt einmalig für zwölf Monate.",
        ar: "الأسعار لكل فرع بالفرنك السويسري وغير شاملة الضريبة. تُحصَّل الفوترة السنوية مرة واحدة لاثني عشر شهرًا.",
      })}>Prices are per location in CHF, excluding VAT. Yearly billing is charged once for twelve months.</p>
    </div>
  </section>

  <section class="section section--alt">
    <div class="wrap">
      ${head(
        { en: "Included everywhere", de: "Überall enthalten", ar: "مشمول في كل الباقات" },
        { en: "Things other vendors invoice separately", de: "Was andere Anbieter separat berechnen", ar: "أمور يفوترها آخرون منفصلة" },
        undefined,
        true
      )}
      <div class="grid grid-4">
        ${card(icons.refresh, { en: "Updates", de: "Updates", ar: "التحديثات" }, { en: "Every release, including new modules, at no extra cost.", de: "Jede Version, inklusive neuer Module, ohne Aufpreis.", ar: "كل إصدار، بما فيه الوحدات الجديدة، دون تكلفة إضافية." })}
        ${card(icons.cloud, { en: "Hosting and backups", de: "Hosting und Backups", ar: "الاستضافة والنسخ الاحتياطي" }, { en: "European hosting with daily backups and point-in-time restore.", de: "Europäisches Hosting mit täglichen Backups und Point-in-Time-Restore.", ar: "استضافة أوروبية مع نسخ يومي واستعادة لأي لحظة." })}
        ${card(icons.users, { en: "Onboarding", de: "Onboarding", ar: "التهيئة" }, { en: "We import your menu and train your team before you go live.", de: "Wir importieren Ihre Karte und schulen Ihr Team vor dem Livegang.", ar: "نستورد قائمتك وندرّب فريقك قبل التشغيل." })}
        ${card(icons.key, { en: "No commission", de: "Keine Provision", ar: "بلا عمولة" }, { en: "Orders through your own storefront cost you nothing per order.", de: "Bestellungen über Ihren eigenen Shop kosten pro Bestellung nichts.", ar: "الطلبات عبر متجرك لا تكلّفك شيئًا لكل طلب." })}
      </div>
    </div>
  </section>

  <section class="section">
    <div class="wrap" style="max-width:860px">
      ${head({ en: "Billing", de: "Abrechnung", ar: "الفوترة" }, { en: "Common questions", de: "Häufige Fragen", ar: "أسئلة شائعة" }, undefined, true)}
      ${faq([
        {
          q: { en: "Is there a minimum contract?", de: "Gibt es eine Mindestlaufzeit?", ar: "هل هناك حد أدنى للتعاقد؟" },
          a: { en: "Monthly plans run month to month and can be cancelled at the end of any period. Yearly plans run for twelve months and are billed once.", de: "Monatspläne laufen monatlich und können zum Periodenende gekündigt werden. Jahrespläne laufen zwölf Monate und werden einmalig abgerechnet.", ar: "الباقات الشهرية تُجدَّد شهريًا ويمكن إلغاؤها نهاية أي فترة. الباقات السنوية لاثني عشر شهرًا وتُحصَّل مرة واحدة." },
        },
        {
          q: { en: "What counts as a location?", de: "Was zählt als Standort?", ar: "ما الذي يُحتسب فرعًا؟" },
          a: { en: "One physical address. Devices inside that address are covered by the plan's device limit; a second shop needs a second location.", de: "Eine physische Adresse. Geräte an dieser Adresse fallen unter das Gerätelimit des Plans; ein zweites Geschäft benötigt einen zweiten Standort.", ar: "عنوان فعلي واحد. الأجهزة داخل هذا العنوان تدخل ضمن حد الباقة؛ والمحل الثاني يحتاج فرعًا ثانيًا." },
        },
        {
          q: { en: "Do you take a cut of card or TWINT payments?", de: "Behalten Sie einen Anteil an Karten- oder TWINT-Zahlungen?", ar: "هل تأخذون نسبة من مدفوعات البطاقة أو TWINT؟" },
          a: { en: "No. You keep your own acquirer contract and its rates. Kassenta records the payment and never sits between you and the money.", de: "Nein. Sie behalten Ihren eigenen Acquirer-Vertrag und dessen Konditionen. Kassenta erfasst die Zahlung und steht nie zwischen Ihnen und dem Geld.", ar: "لا. تحتفظ بعقد مزوّد الدفع الخاص بك وأسعاره. يسجّل Kassenta الدفعة ولا يقف أبدًا بينك وبين أموالك." },
        },
        {
          q: { en: "Can I change plan later?", de: "Kann ich den Plan später wechseln?", ar: "هل يمكنني تغيير الباقة لاحقًا؟" },
          a: { en: "Yes, in both directions, effective from the next billing period. Your data and settings are untouched by a plan change.", de: "Ja, in beide Richtungen, wirksam ab der nächsten Abrechnungsperiode. Daten und Einstellungen bleiben unverändert.", ar: "نعم، في الاتجاهين، اعتبارًا من فترة الفوترة التالية. لا يمسّ تغيير الباقة بياناتك وإعداداتك." },
        },
      ])}
    </div>
  </section>

  ${ctaBand(
    { en: "Run the numbers with us", de: "Rechnen wir gemeinsam", ar: "لنحسب الأرقام معًا" },
    {
      en: "Send your current monthly order volume and platform commission. We will show you the break-even point in writing before you commit to anything.",
      de: "Senden Sie uns Ihr monatliches Bestellvolumen und die Plattformprovision. Wir zeigen Ihnen den Break-even schriftlich, bevor Sie sich festlegen.",
      ar: "أرسل حجم طلباتك الشهري وعمولة المنصة الحالية. سنعرض لك نقطة التعادل كتابيًا قبل أي التزام.",
    }
  )}

  <script>
    window.KassentaPricing = (function () {
      function set(cycle) {
        document.querySelectorAll('.billing-toggle button').forEach(function (b) {
          b.classList.toggle('active', b.dataset.cycle === cycle);
        });
        document.querySelectorAll('.price-value').forEach(function (el) {
          el.textContent = el.getAttribute(cycle === 'yearly' ? 'data-yearly' : 'data-monthly');
        });
      }
      return { set: set };
    })();
  </script>`,
};

// ════════════════════════════════════════════════════════════════════════════
// COMPLIANCE
// ════════════════════════════════════════════════════════════════════════════
export const compliance: { meta: PageMeta; body: string } = {
  meta: {
    path: "/compliance",
    title: { en: "Compliance and data protection — Kassenta POS", de: "Compliance und Datenschutz — Kassenta POS", ar: "الامتثال وحماية البيانات — Kassenta POS" },
    description: {
      en: "Swiss VAT rates and cash rounding, GDPR and nDSG handling, audit trails, and our roadmap for German, Austrian, French and Italian fiscalisation.",
      de: "Schweizer MwSt.-Sätze und Rappenrundung, DSGVO- und nDSG-Umsetzung, Audit-Trails und unsere Roadmap zur Fiskalisierung in Deutschland, Österreich, Frankreich und Italien.",
      ar: "نسب الضريبة السويسرية والتقريب النقدي، والتزام GDPR وnDSG، وسجلات التدقيق، وخطتنا للأنظمة الضريبية في ألمانيا والنمسا وفرنسا وإيطاليا.",
    },
  },
  body: `
  ${pageHead(
    { en: "What we handle, and what is still on the roadmap", de: "Was wir abdecken — und was noch aussteht", ar: "ما نغطّيه وما لا يزال في الخطة" },
    {
      en: "Fiscal rules differ in every market and vendors are often vague about which ones they actually implement. This page states our position plainly so you can check it against your accountant's list.",
      de: "Steuerliche Vorgaben unterscheiden sich je Markt, und Anbieter bleiben oft vage, was sie tatsächlich umsetzen. Diese Seite nennt unsere Position klar, damit Sie sie mit der Liste Ihrer Treuhand abgleichen können.",
      ar: "تختلف القواعد الضريبية بين الأسواق وكثيرًا ما يكون الموردون غامضين بشأن ما ينفّذونه فعليًا. تعرض هذه الصفحة موقفنا بوضوح لتقارنه بقائمة محاسبك.",
    },
    { en: "Compliance", de: "Compliance", ar: "الامتثال" }
  )}

  <section class="section">
    <div class="wrap">
      ${head(
        { en: "Switzerland", de: "Schweiz", ar: "سويسرا" },
        { en: "The home market, implemented in full", de: "Der Heimatmarkt, vollständig umgesetzt", ar: "السوق الأساسي، منفَّذ بالكامل" }
      )}
      <div class="grid grid-2">
        ${card(icons.scale, { en: "VAT rates", de: "MwSt.-Sätze", ar: "نسب الضريبة" }, {
          en: "8.1% standard, 2.6% reduced and 3.8% accommodation, applied per product category. Dine-in and takeaway are treated separately on the same ticket.",
          de: "8,1 % Normalsatz, 2,6 % reduziert und 3,8 % Beherbergung, je Artikelkategorie angewendet. Vor-Ort und Takeaway werden auf demselben Bon getrennt behandelt.",
          ar: "8.1% عادية و2.6% مخفَّضة و3.8% إقامة، تُطبَّق حسب فئة المنتج. ويُعالَج التناول بالمكان والتيك أواي بشكل منفصل في الفاتورة نفسها.",
        })}
        ${card(icons.register, { en: "Cash rounding", de: "Rappenrundung", ar: "التقريب النقدي" }, {
          en: "Cash totals round to the nearest CHF 0.05 at the ticket level. Card, TWINT and invoice keep the exact amount, and the difference is posted as a rounding line.",
          de: "Barbeträge runden auf 5 Rappen je Bon. Karte, TWINT und Rechnung behalten den exakten Betrag; die Differenz wird als Rundungsposition gebucht.",
          ar: "تُقرَّب مبالغ النقد لأقرب 0.05 فرنك على مستوى الفاتورة. وتحتفظ البطاقة وTWINT والفاتورة بالمبلغ الدقيق، ويُقيَّد الفرق كسطر تقريب.",
        })}
        ${card(icons.lock, { en: "nDSG and GDPR", de: "nDSG und DSGVO", ar: "nDSG وGDPR" }, {
          en: "Data is hosted in Europe. Customers can request export or deletion, and both are executed from the console with a record of who approved them.",
          de: "Daten werden in Europa gehostet. Kunden können Export oder Löschung verlangen; beides wird in der Konsole ausgeführt und protokolliert.",
          ar: "تُستضاف البيانات في أوروبا. ويمكن للعملاء طلب التصدير أو الحذف، ويُنفَّذان من اللوحة مع تسجيل من وافق عليهما.",
        })}
        ${card(icons.shield, { en: "Audit trail", de: "Audit-Trail", ar: "سجل التدقيق" }, {
          en: "Every sale, void, discount, price override and cash movement records the operator, the device and the timestamp. Records are append-only.",
          de: "Jeder Verkauf, Storno, Rabatt, jede Preisänderung und Kassenbewegung erfasst Mitarbeiter, Gerät und Zeitstempel. Einträge sind nur anfügbar.",
          ar: "كل بيع وإلغاء وخصم وتعديل سعر وحركة نقدية يسجّل الموظف والجهاز والوقت. والسجلات إضافية فقط لا تُعدَّل.",
        })}
      </div>
    </div>
  </section>

  <section class="section section--alt">
    <div class="wrap">
      ${head(
        { en: "European Union", de: "Europäische Union", ar: "الاتحاد الأوروبي" },
        { en: "Where each market stands today", de: "Wo jeder Markt heute steht", ar: "وضع كل سوق اليوم" },
        {
          en: "Fiscalisation means certified hardware or software signatures in several EU countries. We list the exact requirement and our current status rather than a single claim of European compliance.",
          de: "Fiskalisierung bedeutet in mehreren EU-Ländern zertifizierte Hardware oder Software-Signaturen. Wir nennen die konkrete Anforderung und unseren aktuellen Stand statt einer pauschalen Compliance-Aussage.",
          ar: "تعني الفوترة الضريبية في عدة دول أوروبية أجهزة معتمدة أو توقيعات برمجية. نعرض المتطلَّب بدقة ووضعنا الحالي بدل ادعاء امتثال أوروبي عام.",
        }
      )}
      <div class="table-wrap reveal">
        <table>
          <thead>
            <tr>
              <th ${tAttrs({ en: "Market", de: "Markt", ar: "السوق" })}>Market</th>
              <th ${tAttrs({ en: "Requirement", de: "Anforderung", ar: "المتطلَّب" })}>Requirement</th>
              <th ${tAttrs({ en: "Status", de: "Status", ar: "الحالة" })}>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Switzerland</strong></td>
              <td ${tAttrs({ en: "VAT rates, cash rounding, retention of records", de: "MwSt.-Sätze, Rappenrundung, Aufbewahrung", ar: "نسب الضريبة والتقريب النقدي وحفظ السجلات" })}>VAT rates, cash rounding, retention of records</td>
              <td><span class="badge" ${tAttrs({ en: "Available", de: "Verfügbar", ar: "متاح" })}>Available</span></td>
            </tr>
            <tr>
              <td><strong>Germany</strong></td>
              <td ${tAttrs({ en: "KassenSichV with a certified TSE, DSFinV-K export", de: "KassenSichV mit zertifizierter TSE, DSFinV-K-Export", ar: "KassenSichV مع TSE معتمد وتصدير DSFinV-K" })}>KassenSichV with a certified TSE, DSFinV-K export</td>
              <td><span class="badge badge--neutral" ${tAttrs({ en: "In progress", de: "In Arbeit", ar: "قيد التنفيذ" })}>In progress</span></td>
            </tr>
            <tr>
              <td><strong>Austria</strong></td>
              <td ${tAttrs({ en: "RKSV signature device and receipt QR chain", de: "RKSV-Signatureinheit und Beleg-QR-Kette", ar: "جهاز توقيع RKSV وسلسلة QR للإيصالات" })}>RKSV signature device and receipt QR chain</td>
              <td><span class="badge badge--neutral" ${tAttrs({ en: "In progress", de: "In Arbeit", ar: "قيد التنفيذ" })}>In progress</span></td>
            </tr>
            <tr>
              <td><strong>France</strong></td>
              <td ${tAttrs({ en: "NF525 certification for cash register software", de: "NF525-Zertifizierung für Kassensoftware", ar: "شهادة NF525 لبرامج الكاشير" })}>NF525 certification for cash register software</td>
              <td><span class="badge badge--neutral" ${tAttrs({ en: "Planned", de: "Geplant", ar: "مخطَّط" })}>Planned</span></td>
            </tr>
            <tr>
              <td><strong>Italy</strong></td>
              <td ${tAttrs({ en: "Registratore Telematico daily transmission", de: "Registratore Telematico mit Tagesübermittlung", ar: "Registratore Telematico بإرسال يومي" })}>Registratore Telematico daily transmission</td>
              <td><span class="badge badge--neutral" ${tAttrs({ en: "Planned", de: "Geplant", ar: "مخطَّط" })}>Planned</span></td>
            </tr>
            <tr>
              <td><strong>EU-wide</strong></td>
              <td ${tAttrs({ en: "GDPR: lawful basis, export, deletion, processor agreement", de: "DSGVO: Rechtsgrundlage, Export, Löschung, AV-Vertrag", ar: "GDPR: الأساس القانوني والتصدير والحذف واتفاقية المعالجة" })}>GDPR: lawful basis, export, deletion, processor agreement</td>
              <td><span class="badge" ${tAttrs({ en: "Available", de: "Verfügbar", ar: "متاح" })}>Available</span></td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="form-note" style="margin-top:16px" ${tAttrs({
        en: "If your market requires certification we have not completed, we will say so before you sign rather than after.",
        de: "Wenn Ihr Markt eine Zertifizierung verlangt, die wir noch nicht abgeschlossen haben, sagen wir das vor Vertragsabschluss — nicht danach.",
        ar: "إذا كان سوقك يتطلب شهادة لم نكملها بعد، فسنخبرك قبل التوقيع لا بعده.",
      })}>If your market requires certification we have not completed, we will say so before you sign rather than after.</p>
    </div>
  </section>

  <section class="section">
    <div class="wrap">
      <div class="split">
        <div>
          ${head({ en: "Security", de: "Sicherheit", ar: "الأمان" }, { en: "How the system protects the data", de: "Wie das System die Daten schützt", ar: "كيف يحمي النظام البيانات" })}
          ${ticks([
            { en: "Traffic is encrypted in transit with TLS; passwords and staff PINs are stored as bcrypt hashes, never in plain text.", de: "Datenverkehr wird per TLS verschlüsselt; Passwörter und Mitarbeiter-PINs werden als bcrypt-Hashes gespeichert, nie im Klartext.", ar: "تُشفَّر البيانات أثناء النقل بـTLS، وتُخزَّن كلمات المرور وأرقام الموظفين كتجزئات bcrypt لا كنص صريح." },
            { en: "Each business is isolated by tenant, and every request is checked against both the licence and the employee's role.", de: "Jeder Betrieb ist mandantengetrennt; jede Anfrage wird gegen Lizenz und Mitarbeiterrolle geprüft.", ar: "كل نشاط معزول كمستأجر مستقل، وكل طلب يُفحص مقابل الترخيص ودور الموظف معًا." },
            { en: "Sessions expire and can be revoked centrally when a device is lost or an employee leaves.", de: "Sitzungen laufen ab und können zentral widerrufen werden, wenn ein Gerät verloren geht oder jemand ausscheidet.", ar: "تنتهي الجلسات ويمكن إبطالها مركزيًا عند فقد جهاز أو مغادرة موظف." },
            { en: "Daily encrypted backups with point-in-time restore, tested on a schedule rather than assumed to work.", de: "Täglich verschlüsselte Backups mit Point-in-Time-Restore, planmässig getestet statt nur angenommen.", ar: "نسخ احتياطي يومي مشفَّر مع استعادة لأي لحظة، تُختبر دوريًا لا يُفترض نجاحها." },
          ])}
        </div>
        <div class="reveal">${shot({ id: "compliance-audit", ratio: "4 / 3", size: "1400 × 1050", alt: { en: "Audit trail and permission settings in the Kassenta console", de: "Audit-Trail und Berechtigungen in der Kassenta-Konsole", ar: "سجل التدقيق وإعدادات الصلاحيات في لوحة Kassenta" } })}</div>
      </div>
    </div>
  </section>

  ${ctaBand(
    { en: "Send this page to your accountant", de: "Senden Sie diese Seite Ihrer Treuhand", ar: "أرسل هذه الصفحة إلى محاسبك" },
    {
      en: "We are happy to answer their questions directly, in writing, before you make a decision. Compliance is not a sales conversation.",
      de: "Wir beantworten deren Fragen gerne direkt und schriftlich, bevor Sie entscheiden. Compliance ist kein Verkaufsgespräch.",
      ar: "يسعدنا الإجابة على أسئلته مباشرة وكتابيًا قبل أن تقرر. الامتثال ليس حديث مبيعات.",
    }
  )}`,
};

// ════════════════════════════════════════════════════════════════════════════
// ABOUT
// ════════════════════════════════════════════════════════════════════════════
export const about: { meta: PageMeta; body: string } = {
  meta: {
    path: "/about",
    title: { en: "About Kassenta", de: "Über Kassenta", ar: "عن Kassenta" },
    description: {
      en: "Kassenta was built inside working restaurants rather than in a boardroom. Our approach to product, pricing and support, and how to reach us.",
      de: "Kassenta entstand in laufenden Restaurants, nicht im Sitzungszimmer. Unser Ansatz zu Produkt, Preisen und Support — und wie Sie uns erreichen.",
      ar: "وُلد Kassenta داخل مطاعم عاملة لا في قاعة اجتماعات. نهجنا في المنتج والتسعير والدعم، وكيفية التواصل معنا.",
    },
  },
  body: `
  ${pageHead(
    { en: "Built behind the counter", de: "Hinter der Theke entstanden", ar: "وُلد خلف الكاشير" },
    {
      en: "Kassenta started because a restaurant we worked with was paying three vendors for tools that refused to talk to each other, and a commission on top of that to a delivery platform.",
      de: "Kassenta entstand, weil ein Restaurant, mit dem wir arbeiteten, drei Anbieter für Werkzeuge bezahlte, die nicht miteinander sprachen — plus Provision an eine Lieferplattform.",
      ar: "بدأ Kassenta لأن مطعمًا عملنا معه كان يدفع لثلاثة موردين لأدوات لا تتحدث مع بعضها، وعمولة فوق ذلك لمنصة توصيل.",
    },
    { en: "About", de: "Über uns", ar: "من نحن" }
  )}

  <section class="section">
    <div class="wrap">
      <div class="split">
        <div>
          ${head({ en: "Our approach", de: "Unser Ansatz", ar: "نهجنا" }, { en: "Three rules we hold to", de: "Drei Regeln, an die wir uns halten", ar: "ثلاث قواعد نلتزم بها" })}
          <div class="steps">
            <div class="step reveal"><div><h3 ${tAttrs({ en: "Ship what we can demonstrate", de: "Nur liefern, was wir zeigen können", ar: "نطرح ما نستطيع عرضه" })}>Ship what we can demonstrate</h3><p ${tAttrs({
              en: "If a feature is on this site, you can see it working in a demo the same week. Anything still on the roadmap is labelled as such, including on the compliance page.",
              de: "Steht eine Funktion auf dieser Seite, sehen Sie sie in derselben Woche in einer Demo. Was noch auf der Roadmap ist, kennzeichnen wir als solches — auch auf der Compliance-Seite.",
              ar: "إن ذُكرت ميزة على هذا الموقع فيمكنك رؤيتها تعمل في عرض خلال الأسبوع نفسه. وما زال في الخطة نضع عليه علامة واضحة، بما في ذلك في صفحة الامتثال.",
            })}>If a feature is on this site, you can see it working in a demo the same week. Anything still on the roadmap is labelled as such, including on the compliance page.</p></div></div>
            <div class="step reveal"><div><h3 ${tAttrs({ en: "Never charge per order", de: "Niemals pro Bestellung abrechnen", ar: "لا نحاسب على كل طلب" })}>Never charge per order</h3><p ${tAttrs({
              en: "A percentage of revenue punishes you for growing. A flat fee per location means our incentive is to keep you running, not to take a slice of every ticket.",
              de: "Ein Umsatzanteil bestraft Wachstum. Eine Pauschale je Standort bedeutet: Unser Anreiz ist, dass Sie laufen — nicht ein Anteil an jedem Bon.",
              ar: "النسبة من الإيراد تعاقبك على النمو. الرسم الثابت لكل فرع يجعل مصلحتنا أن تستمر بنجاح لا أن نقتطع من كل فاتورة.",
            })}>A percentage of revenue punishes you for growing. A flat fee per location means our incentive is to keep you running, not to take a slice of every ticket.</p></div></div>
            <div class="step reveal"><div><h3 ${tAttrs({ en: "Your data stays yours", de: "Ihre Daten bleiben Ihre", ar: "بياناتك تبقى ملكك" })}>Your data stays yours</h3><p ${tAttrs({
              en: "Customers, recipes and sales history export to CSV whenever you want. We do not resell aggregated data, and we do not market to your customers.",
              de: "Kunden, Rezepturen und Verkaufshistorie exportieren Sie jederzeit als CSV. Wir verkaufen keine aggregierten Daten weiter und bewerben Ihre Kunden nicht.",
              ar: "يمكنك تصدير العملاء والوصفات وسجل المبيعات إلى CSV متى شئت. لا نبيع بيانات مجمَّعة ولا نسوّق لعملائك.",
            })}>Customers, recipes and sales history export to CSV whenever you want. We do not resell aggregated data, and we do not market to your customers.</p></div></div>
          </div>
        </div>
        <div class="reveal">${shot({ id: "about-team", ratio: "4 / 5", size: "1200 × 1500", alt: { en: "The Kassenta team working alongside restaurant staff", de: "Das Kassenta-Team arbeitet mit Restaurantmitarbeitenden", ar: "فريق Kassenta يعمل مع طاقم المطعم" } })}</div>
      </div>
    </div>
  </section>

  <section class="section section--alt">
    <div class="wrap">
      ${head({ en: "Support", de: "Support", ar: "الدعم" }, { en: "What happens when something breaks at 19:00", de: "Was passiert, wenn um 19:00 etwas ausfällt", ar: "ماذا يحدث إن تعطّل شيء الساعة 19:00" }, undefined, true)}
      <div class="grid grid-3">
        ${card(icons.phone, { en: "Reach a person", de: "Erreichen Sie einen Menschen", ar: "تصل إلى إنسان" }, {
          en: "Phone and WhatsApp during business hours on Professional and above, with a named contact on Enterprise.",
          de: "Telefon und WhatsApp zu Geschäftszeiten ab Professional, mit festem Ansprechpartner bei Enterprise.",
          ar: "هاتف وواتساب خلال ساعات العمل في الاحترافية فما فوق، مع مسؤول مخصَّص في باقة المؤسسات.",
        })}
        ${card(icons.wifiOff, { en: "Keep selling meanwhile", de: "Weiterverkaufen in der Zwischenzeit", ar: "استمر في البيع أثناء ذلك" }, {
          en: "The POS holds orders locally when the connection drops, so a network problem is an inconvenience rather than a closed till.",
          de: "Die Kasse hält Bestellungen lokal, wenn die Verbindung abbricht — ein Netzproblem ist lästig, aber keine geschlossene Kasse.",
          ar: "يحتفظ الكاشير بالطلبات محليًا عند انقطاع الاتصال، فتصبح مشكلة الشبكة إزعاجًا لا توقفًا عن البيع.",
        })}
        ${card(icons.refresh, { en: "Fix, then explain", de: "Erst beheben, dann erklären", ar: "نُصلح ثم نشرح" }, {
          en: "We restore service first and send a written explanation afterwards, including what we changed so it does not recur.",
          de: "Wir stellen zuerst den Betrieb wieder her und senden danach eine schriftliche Erklärung inklusive der Änderungen, damit es nicht wieder passiert.",
          ar: "نعيد الخدمة أولًا ثم نرسل شرحًا مكتوبًا يشمل ما غيّرناه كي لا يتكرر.",
        })}
      </div>
    </div>
  </section>

  ${ctaBand(
    { en: "Come and take it apart", de: "Nehmen Sie es auseinander", ar: "تعال وافحصه بنفسك" },
    {
      en: "The fastest way to judge a POS is to run a real service on it. Bring your busiest hour and we will set it up.",
      de: "Am schnellsten beurteilen Sie eine Kasse, indem Sie einen echten Service darauf fahren. Bringen Sie Ihre Stosszeit mit — wir richten es ein.",
      ar: "أسرع طريقة للحكم على نظام كاشير هي تشغيل خدمة حقيقية عليه. أحضر أكثر ساعاتك ازدحامًا وسنجهّزه.",
    }
  )}`,
};

// ════════════════════════════════════════════════════════════════════════════
// CONTACT
// ════════════════════════════════════════════════════════════════════════════
export const contact: { meta: PageMeta; body: string } = {
  meta: {
    path: "/contact",
    title: { en: "Contact and demo — Kassenta POS", de: "Kontakt und Demo — Kassenta POS", ar: "التواصل والعرض التوضيحي — Kassenta POS" },
    description: {
      en: "Book a 30-minute demo on your own menu, or email info@kassenta.com. We answer every message from a real person, usually within one business day.",
      de: "Buchen Sie eine 30-minütige Demo mit Ihrer eigenen Karte oder schreiben Sie an info@kassenta.com. Jede Nachricht wird von einem Menschen beantwortet, meist innerhalb eines Werktags.",
      ar: "احجز عرضًا لمدة 30 دقيقة على قائمتك، أو راسلنا على info@kassenta.com. نردّ على كل رسالة بشكل شخصي، غالبًا خلال يوم عمل.",
    },
  },
  body: `
  ${pageHead(
    { en: "Talk to us", de: "Sprechen Sie mit uns", ar: "تحدّث إلينا" },
    {
      en: "Send your menu or product list with the form and we will load it into a demo account before the call, so you see your own business rather than a sample restaurant.",
      de: "Senden Sie Ihre Karte oder Artikelliste über das Formular; wir laden sie vor dem Termin in ein Demo-Konto, damit Sie Ihren eigenen Betrieb sehen — kein Musterrestaurant.",
      ar: "أرسل قائمتك أو منتجاتك عبر النموذج وسنحمّلها في حساب تجريبي قبل المكالمة، لترى نشاطك أنت لا مطعمًا نموذجيًا.",
    },
    { en: "Contact", de: "Kontakt", ar: "تواصل معنا" }
  )}

  <section class="section">
    <div class="wrap">
      <div class="split">
        <div>
          <form class="card" id="contactForm" novalidate style="display:grid;gap:18px">
            <div class="grid grid-2" style="gap:16px">
              <div class="field">
                <label for="cf-name" ${tAttrs({ en: "Your name", de: "Ihr Name", ar: "اسمك" })}>Your name</label>
                <input id="cf-name" name="name" type="text" required autocomplete="name">
              </div>
              <div class="field">
                <label for="cf-business" ${tAttrs({ en: "Business name", de: "Betriebsname", ar: "اسم النشاط" })}>Business name</label>
                <input id="cf-business" name="business" type="text" autocomplete="organization">
              </div>
            </div>
            <div class="grid grid-2" style="gap:16px">
              <div class="field">
                <label for="cf-email" ${tAttrs({ en: "Email", de: "E-Mail", ar: "البريد الإلكتروني" })}>Email</label>
                <input id="cf-email" name="email" type="email" required autocomplete="email" inputmode="email">
              </div>
              <div class="field">
                <label for="cf-phone" ${tAttrs({ en: "Phone or WhatsApp", de: "Telefon oder WhatsApp", ar: "الهاتف أو واتساب" })}>Phone or WhatsApp</label>
                <input id="cf-phone" name="phone" type="tel" autocomplete="tel" inputmode="tel">
              </div>
            </div>
            <div class="field">
              <label for="cf-industry" ${tAttrs({ en: "Industry", de: "Branche", ar: "المجال" })}>Industry</label>
              <select id="cf-industry" name="industry">
                <option value="restaurant" ${tAttrs({ en: "Restaurant", de: "Restaurant", ar: "مطعم" })}>Restaurant</option>
                <option value="cafe" ${tAttrs({ en: "Café or bar", de: "Café oder Bar", ar: "كافيه أو بار" })}>Café or bar</option>
                <option value="supermarket" ${tAttrs({ en: "Supermarket or grocer", de: "Supermarkt oder Lebensmittel", ar: "سوبر ماركت أو بقالة" })}>Supermarket or grocer</option>
                <option value="pharmacy" ${tAttrs({ en: "Pharmacy", de: "Apotheke", ar: "صيدلية" })}>Pharmacy</option>
                <option value="bakery" ${tAttrs({ en: "Bakery", de: "Bäckerei", ar: "مخبز" })}>Bakery</option>
                <option value="retail" ${tAttrs({ en: "Retail", de: "Einzelhandel", ar: "تجزئة" })}>Retail</option>
                <option value="other" ${tAttrs({ en: "Something else", de: "Etwas anderes", ar: "شيء آخر" })}>Something else</option>
              </select>
            </div>
            <div class="field">
              <label for="cf-message" ${tAttrs({ en: "What would you like to see?", de: "Was möchten Sie sehen?", ar: "ما الذي تودّ رؤيته؟" })}>What would you like to see?</label>
              <textarea id="cf-message" name="message" placeholder="e.g. we run two branches, take phone orders and deliver in a 5 km radius"></textarea>
            </div>
            <div class="form-status" id="cf-status" role="status" aria-live="polite"></div>
            <button class="btn btn-primary" type="submit" id="cf-submit" ${tAttrs({ en: "Request a demo", de: "Demo anfragen", ar: "اطلب عرضًا توضيحيًا" })}>Request a demo</button>
            <p class="form-note" ${tAttrs({
              en: "We use your details only to answer this enquiry. No newsletter, no third parties.",
              de: "Wir verwenden Ihre Angaben nur zur Beantwortung dieser Anfrage. Kein Newsletter, keine Dritten.",
              ar: "نستخدم بياناتك للردّ على هذا الطلب فقط. بلا نشرات بريدية وبلا أطراف ثالثة.",
            })}>We use your details only to answer this enquiry. No newsletter, no third parties.</p>
          </form>
        </div>
        <div>
          ${head({ en: "Direct", de: "Direkt", ar: "مباشرة" }, { en: "Or skip the form", de: "Oder ohne Formular", ar: "أو تجاوز النموذج" })}
          <div class="grid" style="gap:16px">
            <article class="card">
              <div class="card-icon">${icons.mail}</div>
              <h3 ${tAttrs({ en: "Email", de: "E-Mail", ar: "البريد الإلكتروني" })}>Email</h3>
              <p><a href="mailto:info@kassenta.com" style="color:var(--accent);font-weight:700">info@kassenta.com</a></p>
            </article>
            <article class="card">
              <div class="card-icon">${icons.building}</div>
              <h3 ${tAttrs({ en: "Existing customer?", de: "Bestandskunde?", ar: "عميل حالي؟" })}>Existing customer?</h3>
              <p ${tAttrs({
                en: "Open the POS and use the support entry in Settings so your licence and branch come through with the message.",
                de: "Öffnen Sie die Kasse und nutzen Sie den Support-Eintrag in den Einstellungen, damit Lizenz und Filiale mitgesendet werden.",
                ar: "افتح الكاشير واستخدم مدخل الدعم في الإعدادات ليصلنا الترخيص والفرع مع الرسالة.",
              })}>Open the POS and use the support entry in Settings so your licence and branch come through with the message.</p>
              <p style="margin-top:12px"><a class="btn-quiet" href="/app" ${tAttrs({ en: "Open the POS", de: "Kasse öffnen", ar: "افتح الكاشير" })}>Open the POS</a></p>
            </article>
            <article class="card">
              <div class="card-icon">${icons.clock}</div>
              <h3 ${tAttrs({ en: "Response time", de: "Antwortzeit", ar: "زمن الاستجابة" })}>Response time</h3>
              <p ${tAttrs({
                en: "Enquiries are answered within one business day. Support tickets from live customers are answered the same day during business hours.",
                de: "Anfragen beantworten wir innerhalb eines Werktags. Support-Tickets aktiver Kunden am selben Tag zu Geschäftszeiten.",
                ar: "نردّ على الاستفسارات خلال يوم عمل. وتُجاب تذاكر دعم العملاء النشطين في اليوم نفسه خلال ساعات العمل.",
              })}>Enquiries are answered within one business day. Support tickets from live customers are answered the same day during business hours.</p>
            </article>
          </div>
        </div>
      </div>
    </div>
  </section>

  <script>
    (function () {
      var form = document.getElementById('contactForm');
      var status = document.getElementById('cf-status');
      var btn = document.getElementById('cf-submit');
      if (!form) return;
      var MSG = {
        sending: { en: 'Sending…', de: 'Wird gesendet…', ar: 'جارٍ الإرسال…' },
        ok: { en: 'Thank you. We will reply within one business day.', de: 'Danke. Wir antworten innerhalb eines Werktags.', ar: 'شكرًا لك. سنردّ خلال يوم عمل.' },
        err: { en: 'Could not send. Please email info@kassenta.com instead.', de: 'Senden fehlgeschlagen. Bitte schreiben Sie an info@kassenta.com.', ar: 'تعذّر الإرسال. يرجى المراسلة على info@kassenta.com.' },
        invalid: { en: 'Please fill in your name and a valid email address.', de: 'Bitte Name und eine gültige E-Mail-Adresse angeben.', ar: 'يرجى إدخال الاسم وبريد إلكتروني صحيح.' }
      };
      function say(kind, cls) {
        var lang = document.documentElement.lang || 'en';
        status.textContent = MSG[kind][lang] || MSG[kind].en;
        status.className = 'form-status ' + cls;
      }
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var data = Object.fromEntries(new FormData(form).entries());
        if (!data.name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(data.email || ''))) {
          return say('invalid', 'err');
        }
        btn.disabled = true;
        say('sending', 'ok');
        fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        }).then(function (r) {
          if (!r.ok) throw new Error(String(r.status));
          form.reset();
          say('ok', 'ok');
        }).catch(function () {
          say('err', 'err');
        }).finally(function () { btn.disabled = false; });
      });
    })();
  </script>`,
};

export const PAGES = [home, features, solutions, pricing, compliance, about, contact];
