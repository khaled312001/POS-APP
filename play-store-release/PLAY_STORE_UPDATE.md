# Google Play — update pack

Everything needed to publish the rebranded update for both apps.
Generated 12 August 2026.

> **The two listings already exist.** This is an *update*, so the package name,
> the signing key and the Expo slug must not change — they are what Play uses to
> match the upload to the listing. Only the display name, graphics, screenshots
> and description change.

---

## 1. What to upload

| | Kassenta POS | Kassenta Order (customer) |
|---|---|---|
| Package name | `tech.barmagly.pos` | `com.barmagly.customer` |
| Play Console app | the existing POS listing | the existing customer listing |
| New version code | **10** (was 9) | **4** (was 3) |
| Version name | 1.0.0 | 1.0.0 |
| Upload file | `play-store-release/kassenta-pos-v10.aab` | `customer-app/play-store/kassenta-order-v4.aab` |
| Test APK | `play-store-release/kassenta-pos-v10.apk` | `customer-app/play-store/kassenta-order-v4.apk` |
| Signing key alias | `534fe00c431cca34b5dd50b1be72b8fd` | `dba25bca872c13f4f468e0fc92357100` |

The `.aab` goes to **Production → Create new release**. The `.apk` is for
installing on a device to check before you publish — Play does not accept it.

---

## 2. Store listing — Kassenta POS

### App name (30 characters max)

```
Kassenta POS
```

### Short description (80 characters max)

| Language | Text | Length |
|---|---|---|
| English | `Point of sale, online ordering and delivery in one system.` | 58 |
| Deutsch | `Kasse, Online-Bestellung und Lieferung in einem System.` | 55 |
| العربية | `كاشير وطلب أونلاين وتوصيل في نظام واحد.` | 39 |

### Full description (4000 characters max)

<details open>
<summary><b>English</b></summary>

```
Kassenta replaces the patchwork of a POS terminal, an ordering website, a delivery app and a spreadsheet. Every order — counter, table QR, phone or online — lands in the same queue, with the same stock and the same reports.

BUILT FOR THE COUNTER
• Category and search-first product grid, tuned so a regular order takes three taps
• Variants and modifiers with price deltas — sizes, extras, removals and kitchen notes
• Percentage or fixed discounts per line or per ticket, recorded against the operator
• Split payments across cash, card, TWINT and store wallet on a single ticket
• Held tickets, quick reprint and a searchable invoice history
• Barcode scanning from the device camera or a USB or Bluetooth scanner

YOUR OWN ORDERING CHANNEL
• A branded storefront at your own address, with your logo, hours and promo banner
• Per-table QR codes that open the menu with the table already attached
• Delivery, pickup and dine-in as separate flows, each with its own fee and minimum
• Scheduled orders, promo codes with usage limits, and per-code reporting

DELIVERY THAT RUNS ITSELF
• Driver roster with online, busy and offline states
• Assign an order to a driver or broadcast it to everyone free
• Delivery zones by postcode or radius, each with its own fee and estimated time
• A live tracking link for the customer and timestamps for you

THE REST OF THE OPERATION
• Stock levels per branch, low-stock alerts, stock counts and returns with reasons
• Customer records with addresses, order history, a store wallet and loyalty tiers
• PIN login per employee, role-based permissions, attendance and cash-drawer counts
• Sales, inventory, returns, delivery, finance and activity reports, exportable to CSV
• Thermal receipts, kitchen tickets and A4 PDF invoices

BUILT FOR SWITZERLAND
• 8.1% standard and 2.6% reduced VAT, with dine-in versus takeaway applied per line
• Cash totals rounded to the nearest CHF 0.05 while card and TWINT keep the exact amount
• TWINT, card, cash and invoice as first-class payment methods
• German, English and Arabic throughout, including right-to-left layout
• Data hosted in Europe, with GDPR and nDSG export and deletion handled in the console

WORKS ON EVERY SCREEN
Designed for a tablet at the counter, and it adapts rather than shrinks: the cart is a
sheet on a phone, a sidebar on a tablet and a fixed panel on a desktop browser. Light
and dark themes, switchable in one tap.

A licence key is required. Start a 14-day free trial from the app, or contact us at
info@kassenta.com for a demo on your own menu.
```
</details>

<details>
<summary><b>Deutsch</b></summary>

```
Kassenta ersetzt das Flickwerk aus Kassenterminal, Bestellwebsite, Liefer-App und Tabellenkalkulation. Jede Bestellung — Theke, Tisch-QR, Telefon oder online — landet in derselben Warteschlange, mit demselben Bestand und denselben Berichten.

FÜR DIE THEKE GEBAUT
• Artikelraster nach Kategorie und Suche — eine Standardbestellung braucht drei Taps
• Varianten und Optionen mit Preisdifferenz: Grössen, Extras, Abwahl, Küchennotizen
• Prozentuale oder feste Rabatte je Position oder Bon, dem Mitarbeiter zugeordnet
• Teilzahlungen über Bar, Karte, TWINT und Guthaben auf einem Bon
• Geparkte Bons, Schnell-Nachdruck und durchsuchbare Beleghistorie
• Barcode-Scan über Gerätekamera oder USB-/Bluetooth-Scanner

IHR EIGENER BESTELLKANAL
• Gebrandeter Shop unter Ihrer eigenen Adresse, mit Logo, Öffnungszeiten und Aktionsbanner
• QR-Codes je Tisch, die die Karte mit bereits zugeordnetem Tisch öffnen
• Lieferung, Abholung und Vor-Ort als getrennte Abläufe mit eigener Gebühr und Mindestwert
• Vorbestellungen, Gutscheincodes mit Limits und Auswertung je Code

LIEFERUNG, DIE SICH SELBST ORGANISIERT
• Fahrerübersicht mit Status online, beschäftigt und offline
• Auftrag direkt zuweisen oder an alle freien Fahrer ausschreiben
• Lieferzonen nach Postleitzahl oder Radius, je mit Gebühr und Lieferzeit
• Live-Tracking-Link für den Kunden, Zeitstempel für Sie

DER REST DES BETRIEBS
• Bestände je Filiale, Warnungen bei Mindestbestand, Inventuren und Retouren mit Grund
• Kundenakten mit Adressen, Bestellhistorie, Guthaben und Treuestufen
• PIN-Login je Mitarbeiter, rollenbasierte Rechte, Anwesenheit und Kassensturz
• Berichte zu Umsatz, Bestand, Retouren, Lieferung, Finanzen und Aktivität, als CSV
• Thermobons, Küchenbons und A4-PDF-Rechnungen

FÜR DIE SCHWEIZ GEBAUT
• 8,1 % Normalsatz und 2,6 % reduziert, Vor-Ort und Takeaway je Position unterschieden
• Barbeträge auf 5 Rappen gerundet, Karte und TWINT bleiben exakt
• TWINT, Karte, Bar und Rechnung als gleichwertige Zahlungsarten
• Deutsch, Englisch und Arabisch durchgängig, inklusive Rechts-nach-links-Layout
• Daten in Europa gehostet, DSGVO- und nDSG-Anfragen direkt in der Konsole

AUF JEDEM BILDSCHIRM
Für das Tablet an der Theke entworfen, und es passt sich an statt zu schrumpfen: Der
Warenkorb ist ein Sheet am Handy, eine Seitenleiste am Tablet und ein festes Panel im
Desktop-Browser. Heller und dunkler Modus, mit einem Tap umschaltbar.

Ein Lizenzschlüssel ist erforderlich. Starten Sie eine 14-tägige Testphase in der App
oder schreiben Sie an info@kassenta.com für eine Demo mit Ihrer eigenen Karte.
```
</details>

<details>
<summary><b>العربية</b></summary>

```
يستبدل Kassenta خليط أجهزة الكاشير وموقع الطلبات وتطبيق التوصيل وجداول البيانات. كل طلب — من الكاشير أو QR الطاولة أو الهاتف أو الإنترنت — يصل إلى القائمة نفسها، بالمخزون نفسه والتقارير نفسها.

مصمَّم للكاشير
• شبكة منتجات بالفئات والبحث، مضبوطة ليتم الطلب المعتاد بثلاث ضغطات
• متغيّرات وإضافات بفروق سعرية: أحجام وإضافات وحذف وملاحظات للمطبخ
• خصومات نسبية أو ثابتة لكل بند أو فاتورة، مسجَّلة باسم الموظف
• دفع مقسَّم بين النقد والبطاقة وTWINT ومحفظة المتجر في فاتورة واحدة
• فواتير معلَّقة وإعادة طباعة سريعة وسجل فواتير قابل للبحث
• مسح الباركود من كاميرا الجهاز أو ماسح USB أو بلوتوث

قناة طلب خاصة بك
• متجر بهويتك على عنوانك الخاص، بشعارك ومواعيدك وشريط عروضك
• أكواد QR لكل طاولة تفتح القائمة والطاولة مرتبطة بالطلب
• توصيل واستلام وتناول بالمكان كمسارات منفصلة، لكل منها رسوم وحد أدنى
• طلبات مجدولة وأكواد خصم بحدود استخدام وتقارير لكل كود

توصيل يدير نفسه
• قائمة سائقين بحالات متاح ومشغول وغير متصل
• إسناد الطلب لسائق أو بثّه لكل المتاحين
• مناطق توصيل بالرمز البريدي أو نصف القطر، لكل منها رسوم ووقت متوقع
• رابط تتبّع مباشر للعميل وأوقات مسجَّلة لك

بقية العمليات
• أرصدة لكل فرع وتنبيهات نقص وجرد ومرتجعات بأسباب محدَّدة
• سجلات عملاء بالعناوين وسجل الطلبات ومحفظة ومستويات ولاء
• دخول برقم سري لكل موظف وصلاحيات حسب الدور وحضور وتقفيل درج النقد
• تقارير للمبيعات والمخزون والمرتجعات والتوصيل والمالية والنشاط، وتصدير CSV
• إيصالات حرارية وتذاكر مطبخ وفواتير PDF بحجم A4

مصمَّم لسويسرا
• ضريبة 8.1% عادية و2.6% مخفَّضة، مع تفرقة التناول بالمكان والتيك أواي لكل بند
• تقريب النقد لأقرب 0.05 فرنك مع إبقاء المبلغ الدقيق للبطاقة وTWINT
• TWINT والبطاقة والنقد والفاتورة كوسائل دفع أساسية
• الألمانية والإنجليزية والعربية في كل التطبيق، مع تخطيط من اليمين لليسار
• استضافة البيانات في أوروبا ومعالجة طلبات GDPR وnDSG من اللوحة

يعمل على كل الشاشات
مصمَّم للتابلت على الكاشير، ويتكيّف بدل أن ينكمش: السلة لوح في الهاتف، وشريط جانبي في
التابلت، ولوحة ثابتة في متصفح الكمبيوتر. وضع فاتح وداكن، يتبدّل بضغطة واحدة.

يتطلب مفتاح ترخيص. ابدأ تجربة 14 يومًا من داخل التطبيق، أو راسلنا على
info@kassenta.com لعرض توضيحي على قائمتك أنت.
```
</details>

### Release notes / What's new (500 characters max per language)

| Language | Text |
|---|---|
| English | `New name and look: Barmagly POS is now Kassenta POS.`<br>`• Light mode is now the default, with a one-tap switch to dark`<br>`• Every colour re-checked for readability on both themes`<br>`• Swiss VAT updated to the current 8.1% standard rate`<br>`• Moved to kassenta.com — no action needed, your data is unchanged`<br>`• Faster startup and clearer typography throughout` |
| Deutsch | `Neuer Name und neues Aussehen: aus Barmagly POS wird Kassenta POS.`<br>`• Heller Modus ist neu die Vorgabe, Umschalten auf Dunkel mit einem Tap`<br>`• Alle Farben auf Lesbarkeit in beiden Modi geprüft`<br>`• Schweizer MwSt. auf den aktuellen Satz von 8,1 % aktualisiert`<br>`• Umzug auf kassenta.com — nichts zu tun, Ihre Daten bleiben unverändert`<br>`• Schnellerer Start und klarere Typografie` |
| العربية | `اسم وهوية جديدة: Barmagly POS أصبح Kassenta POS.`<br>`• الوضع الفاتح صار الافتراضي، والتبديل للداكن بضغطة واحدة`<br>`• مراجعة كل الألوان للتأكد من وضوحها في الوضعين`<br>`• تحديث الضريبة السويسرية إلى النسبة الحالية 8.1%`<br>`• الانتقال إلى kassenta.com — لا يلزمك أي إجراء، بياناتك كما هي`<br>`• بدء تشغيل أسرع وخطوط أوضح` |

---

## 3. Store listing — Kassenta Order (customer app)

### App name

```
Kassenta Order
```

### Short description

| Language | Text | Length |
|---|---|---|
| English | `Order from your favourite local places and follow it to your door.` | 65 |
| Deutsch | `Bestellen Sie bei Ihren Lieblingslokalen und verfolgen Sie die Lieferung.` | 72 |
| العربية | `اطلب من أماكنك المفضّلة وتابع طلبك حتى باب بيتك.` | 47 |

### Full description

<details open>
<summary><b>English</b></summary>

```
Browse the menu, order in a few taps, and watch your order move from the kitchen to your door.

• Real menus from real local places, with photos, prices and options
• Delivery, pickup or ordering from your table with a QR code
• Live order tracking with a map and a driver you can call
• Save addresses so the next order takes seconds
• Promo codes, loyalty points and a store wallet
• Pay with card, TWINT or cash on delivery
• Schedule an order for later
• English, German and Arabic, with full right-to-left support

No account is needed to browse. Create one at checkout to keep your addresses and
order history.

Questions: info@kassenta.com
```
</details>

<details>
<summary><b>Deutsch</b></summary>

```
Karte ansehen, mit wenigen Taps bestellen und die Lieferung von der Küche bis zur Haustür verfolgen.

• Echte Karten echter lokaler Betriebe, mit Fotos, Preisen und Optionen
• Lieferung, Abholung oder Bestellung am Tisch per QR-Code
• Live-Tracking mit Karte und Fahrer, den Sie anrufen können
• Adressen speichern, damit die nächste Bestellung Sekunden dauert
• Gutscheincodes, Treuepunkte und ein Guthabenkonto
• Zahlung per Karte, TWINT oder bar bei Lieferung
• Bestellung für später planen
• Deutsch, Englisch und Arabisch, mit vollständiger Rechts-nach-links-Unterstützung

Zum Stöbern ist kein Konto nötig. Erstellen Sie eines an der Kasse, um Adressen und
Bestellhistorie zu behalten.

Fragen: info@kassenta.com
```
</details>

<details>
<summary><b>العربية</b></summary>

```
تصفّح القائمة، اطلب بضغطات قليلة، وتابع طلبك من المطبخ حتى باب بيتك.

• قوائم حقيقية من أماكن قريبة منك، بالصور والأسعار والخيارات
• توصيل أو استلام أو طلب من طاولتك بكود QR
• تتبّع مباشر بخريطة وسائق تقدر تكلّمه
• احفظ عناوينك عشان الطلب الجاي يقعد ثواني
• أكواد خصم ونقاط ولاء ومحفظة داخل المتجر
• الدفع بالبطاقة أو TWINT أو نقدًا عند الاستلام
• جدولة الطلب لوقت لاحق
• العربية والإنجليزية والألمانية، مع دعم كامل لليمين لليسار

مش محتاج حساب عشان تتصفّح. اعمل واحد عند الدفع عشان تحتفظ بعناوينك وسجل طلباتك.

للاستفسار: info@kassenta.com
```
</details>

### Release notes

| Language | Text |
|---|---|
| English | `New name and look: we are now Kassenta Order.`<br>`• Refreshed design that matches the storefront`<br>`• Moved to kassenta.com — your saved addresses and orders are unchanged`<br>`• Faster menu loading` |
| Deutsch | `Neuer Name und neues Aussehen: wir heissen jetzt Kassenta Order.`<br>`• Aufgefrischtes Design passend zum Shop`<br>`• Umzug auf kassenta.com — Ihre Adressen und Bestellungen bleiben erhalten`<br>`• Schnelleres Laden der Karte` |
| العربية | `اسم وهوية جديدة: بقينا Kassenta Order.`<br>`• تصميم مجدَّد مطابق للمتجر`<br>`• الانتقال إلى kassenta.com — عناوينك وطلباتك المحفوظة كما هي`<br>`• تحميل أسرع للقوائم` |

---

## 4. Graphics

| Asset | Requirement | File |
|---|---|---|
| App icon | 512 × 512 PNG, **no transparency** | `play-store-release/play-store-icon-512x512.png`<br>`customer-app/play-store/play-store-icon-512x512.png` |
| Feature graphic | 1024 × 500 PNG | `play-store-release/play-store-feature-graphic-1024x500.png`<br>`customer-app/play-store/play-store-feature-graphic-1024x500.png` |

Both are regenerated from the brand mark by
`scripts/generate-play-store-assets.py`, so they match the launcher icons and the
website.

---

## 5. Screenshots

**The POS is a tablet product.** Upload the 10-inch set first and make it the
richest — that is the set Play shows on tablets, on the web listing, and in the
large-screen quality tier. Phone screenshots are required (minimum two) but
should be treated as secondary.

All shots are captured from the live app in **light mode, English**, with real
data, by `scripts/capture-store-screenshots.js`.

### Kassenta POS — `play-store-release/screenshots/`

| Play tab | Folder | Size | Count | Priority |
|---|---|---|---|---|
| **10-inch tablet** | `tablet10/` | 2560 × 1440 | 7 | **primary — upload all 7** |
| 7-inch tablet | `tablet7/` | 1920 × 1080 | 7 | upload all 7 |
| Phone | `phone/` | 1080 × 1920 | 7 | upload 4–5 |

Order to upload (the first two are what most people see):

1. `01_pos` — the selling screen: product grid, categories, cart and totals
2. `04_reports` — the reporting dashboard
3. `03_online_orders` — the live order queue
4. `02_products` — the catalogue with stock levels
5. `06_table_qr` — QR codes per table
6. `05_customers` — customer records
7. `07_settings` — the settings hub

### Kassenta Order — `customer-app/play-store/screenshots/`

| Play tab | Folder | Size | Count |
|---|---|---|---|
| **10-inch tablet** | `tablet10/` | 2560 × 1440 | 3 |
| 7-inch tablet | `tablet7/` | 1920 × 1080 | 3 |
| Phone | `phone/` | 1080 × 1920 | 3 |

1. `02_menu` — a real restaurant menu
2. `01_restaurants` — the browse screen
3. `03_storefront` — the ordering flow

---

## 6. Everything else in the Console

These carry over from the existing listings and need no change unless Play asks:

- **Category** — POS: Business. Customer: Food & Drink.
- **Content rating** — unchanged; the questionnaire answers are in `content-rating.md`.
- **Data safety** — unchanged; answers in `data-safety.md` and
  `data-safety-step4-answers.md`.
- **Privacy policy URL** — `https://kassenta.com/privacy`
- **Account deletion URL** — `https://kassenta.com/delete-account`
- **Support email** — `info@kassenta.com`
- **Website** — `https://kassenta.com`

### Two things to check before you publish

1. **Target API level.** Play raises the minimum every August. If the Console
   rejects the upload for `targetSdkVersion`, raise it in `app.json` under
   `expo.android` and rebuild.
2. **The old domain.** These builds point at `kassenta.com`. Once this update is
   live and installs have moved over, `pos.barmagly.tech` can be removed from
   the hosting account — not before, because the currently published apps still
   call it.

---

## 7. Rebuilding

```bash
# from Windows — the build runs in WSL, see the wsl-android-build note
wsl -d Ubuntu-22.04 -u root -- bash -lc "bash /root/build_pos.sh > /root/pos_build.log 2>&1"
wsl -d Ubuntu-22.04 -u root -- bash -lc "bash /root/build_customer.sh > /root/customer_build.log 2>&1"
```

Outputs land in `/root/{pos,customer}/android/app/build/outputs/`. Raise
`versionCode` in `app.json` / `customer-app/app.json` before every upload — Play
rejects a duplicate.
