# Release Notes 1.0.0

## Play Store release notes (max 500 chars per language, ready to paste)

- <en-GB>Welcome to Barmagly POS - our first public release! A complete Point of Sale and mini-ERP built for pharmacies, retail, cafes and restaurants. Includes full POS with cart and discounts, product and inventory management, customer CRM, sales and finance reports, QR online orders, delivery zones, multi-branch support, and receipt printing. Accept TWINT, cards (Stripe) and cash. Tablet-optimised, dark-mode UI, available in English, German and Arabic. Activate with a Barmagly licence key.</en-GB>

- <de-DE>Willkommen bei Barmagly POS - unsere erste offentliche Version! Ein komplettes Kassensystem und Mini-ERP fur Apotheken, Einzelhandel, Cafes und Restaurants. Mit vollem POS, Warenkorb und Rabatten, Produkt- und Lagerverwaltung, Kunden-CRM, Verkaufs- und Finanzberichten, QR-Online-Bestellungen, Lieferzonen, Multi-Filial-Unterstutzung und Belegdruck. Zahlungen per TWINT, Karte (Stripe) und Bargeld. Tablet-optimiert, Dark Mode, in Deutsch, Englisch und Arabisch. Aktivierung per Barmagly-Lizenzschlussel.</de-DE>

- <ar-EG>اهلا بكم في Barmagly POS - اول اصدار رسمي لنا! نظام نقاط بيع متكامل و ERP مصغر للصيدليات والمحلات والكافيهات والمطاعم. يشمل واجهة بيع كاملة مع سلة وخصومات، وادارة المنتجات والمخزون، وادارة علاقات العملاء، وتقارير مبيعات ومالية، وطلبات اونلاين عبر QR، ومناطق توصيل، ودعم فروع متعددة، وطباعة الفواتير. يقبل TWINT والبطاقات (Stripe) والكاش. مهيا للتابلت بوضع داكن، ويدعم العربية والانجليزية والالمانية. التفعيل بمفتاح ترخيص Barmagly.</ar-EG>

- <fr-FR>Bienvenue sur Barmagly POS - notre premiere version publique ! Un systeme de caisse complet et mini-ERP pour pharmacies, commerces, cafes et restaurants. Inclut une caisse complete avec panier et remises, gestion des produits et du stock, CRM client, rapports de ventes et finances, commandes en ligne par QR, zones de livraison, multi-succursales et impression de tickets. Paiements TWINT, carte (Stripe) et especes. Optimise tablette, mode sombre, disponible en francais, anglais, allemand et arabe.</fr-FR>

## Internal long-form changelog

### Barmagly POS 1.0.0 (build 7) - First production release

This is the inaugural public release of Barmagly POS (also marketed as Barmagly Smart POS) on the Google Play Store. The application is a production-ready, tablet-optimised Point of Sale and mini-ERP platform targeting pharmacies, retail stores, cafes, restaurants and small businesses, with primary market focus on Switzerland (default currency CHF, TWINT support).

### What's included

**Core POS**
- Full POS screen with cart, line-item modifiers, item notes, and order-level discounts
- Barcode scanning via device camera
- Cash drawer / receipt printing flow
- Hold / resume orders
- Quick-add categories and product grid optimised for tablet touch targets

**Inventory and catalogue**
- Product management with categories, add-ons, and size variants
- Stock tracking with low-stock indicators
- Bulk image upload (server-side via Google Cloud Storage)
- Multi-branch stock visibility

**Customer relationship management (CRM)**
- Customer profiles with name, phone, delivery address
- Per-customer order history
- Customer search from the POS screen

**Reports and analytics**
- Sales reports (by day, product, category, cashier)
- Inventory reports
- Returns reports
- Finance reports (revenue, cost, margin, tax)
- Activity log per employee

**Online ordering and delivery**
- QR-based table ordering for restaurants and cafes
- Table management
- Delivery zones with configurable fees
- Promo codes
- Basic driver management (assignment and status)

**Payments**
- Cash
- Card (via Stripe, optional - only if the merchant configures it)
- TWINT (Swiss mobile payment)
- Split payments

**Multi-tenancy and access control**
- License-key activation in the format BARMAGLY-XXXX-XXXX-XXXX-XXXX
- Full data isolation between stores
- Roles: Admin / Owner, Manager, Cashier (PIN-protected)
- Multi-branch support per tenant

**Notifications and localisation**
- WhatsApp and email notifications (order confirmations, receipts)
- Multi-language UI: English, German, Arabic (RTL supported)
- Multi-currency, defaulting to CHF

**UI / UX**
- Dark-mode-first interface
- Brand accent teal (#2FD3C6)
- Blue to purple to teal gradient accents
- Tablet-first layouts

### Known limitations in 1.0.0

- French (fr-FR) translations for the in-app UI are not yet shipped; only the store listing is localised to French. Full in-app French support is planned for a follow-up release.
- Offline mode is limited; the device requires connectivity to sync with the backend at pos.barmagly.tech for most operations.
- Bluetooth thermal printer support is currently configured per-device; auto-discovery on first launch is not yet bundled.
- Apple / Google Pay are not supported in this build; card payments require a Stripe-configured account.
- The Android-only release - no iOS build is published in this cycle.
- Phone-form-factor layouts work but are not the primary supported configuration; tablets are recommended.
- No third-party analytics or advertising SDKs are bundled, so usage telemetry is intentionally minimal.

### Compatibility

- **Platform:** Android only
- **Minimum OS:** Android 8.0 (API level 26)
- **Target SDK:** Android 15 (API level 35)
- **Form factor:** Tablet-optimised (7" and larger recommended); phone supported but not primary
- **Architecture:** Distributed as an Android App Bundle (.aab); Play Store will deliver the correct ABI
- **Network:** HTTPS connectivity to pos.barmagly.tech required for activation and sync
- **Permissions requested:** INTERNET, ACCESS_NETWORK_STATE, CAMERA (barcode scanning), VIBRATE (haptics), ACCESS_FINE_LOCATION / ACCESS_COARSE_LOCATION (runtime, optional, only used for delivery zones)
- **Framework:** Expo SDK 54 on React Native
- **Backend:** Node.js + Express + PostgreSQL, hosted on Barmagly infrastructure
- **Audience:** Business users aged 18+

### Activation

The app is free to download. A valid Barmagly licence key is required to unlock a store. Keys are issued via www.barmagly.tech.