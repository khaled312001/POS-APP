# Barmagly Customer — Delivery Complete ✅

**App:** Barmagly Customer (`com.barmagly.customer`)
**Version:** 1.0.0 (APK build 1 · AAB build 2)
**Date:** 2026-06-06
**Connected to:** Barmagly POS via shared backend `pos.barmagly.tech`

---

## 📦 What you got

```
customer-app/play-store/
├── 📱 barmagly-customer-1.0.0-1.apk        67 MB  ← Sideload / internal testing
├── 📲 barmagly-customer-1.0.0-2.aab        46 MB  ← Upload to Play Store
├── 🎨 play-store-icon-512x512.png                 ← App icon
├── 🖼️ play-store-feature-graphic-1024x500.png    ← Feature graphic
├── 📸 screenshots/
│   ├── phone/      8 PNGs · 1082×2402 (Pixel 7 mobile layout)
│   ├── tablet7/    8 PNGs · 1200×1920 (7-inch tablet portrait)
│   └── tablet10/   8 PNGs · 1600×2560 (10-inch tablet portrait)
├── 📝 listing-en.txt                       ← Store listing (English)
├── 📝 listing-ar.txt                       ← Store listing (Arabic)
├── 🛡️ data-safety.md                       ← Data Safety form answers
├── 🎯 content-rating.md                    ← IARC + target audience
├── 🚀 release-notes.md                     ← EN/DE/AR/FR launch notes
├── 📖 publishing-guide.md                  ← Step-by-step Play Console walkthrough
└── 🔒 privacy-addendum.html                ← Privacy section for the customer flow
```

---

## 🎬 Screenshots — what each shows

| # | Screen | Used for marketing |
|---|---|---|
| 01 | Welcome / signup landing | Brand intro |
| 02 | Pizza Lemon storefront with hero image | Hook — beautiful restaurant pages |
| 03 | Menu browse with stats (156 dishes, 5.0★, 35 min) | Trust signals |
| 04 | Menu items grid | Variety |
| 05 | Categories navigation | Easy discovery |
| 06 | Item detail (Lemon Pizza — sizes, addons, CHF 21) | Conversion-focused UI |
| 07 | Cart / checkout flow | Order completion |
| 08 | Back-to-signup | Account creation |

All screenshots captured at **proper mobile CSS dimensions** (412 CSS px on phone, 600 on 7", 800 on 10") with high DPR so they fill the device screen properly — not centered desktop layouts.

---

## 🚀 Submit to Play Store (3 steps)

### 1. Create a new app entry
- Play Console → **All apps** → **Create app**
- Name: `Barmagly Customer`
- Package: `com.barmagly.customer` (different from POS — both can coexist)

### 2. Upload the AAB
- Test and release → **Production** → **Create new release**
- Upload `play-store/barmagly-customer-1.0.0-2.aab`
- Release name: `1.0.0 (2)`
- Release notes: copy from `release-notes.md`

### 3. Fill the tiles
Use the prepared docs:

| Play Console tile | Use this file |
|---|---|
| Short / Full description | `listing-en.txt` (+ `listing-ar.txt` for AR locale) |
| App icon | `play-store-icon-512x512.png` |
| Feature graphic | `play-store-feature-graphic-1024x500.png` |
| Screenshots | All 24 from `screenshots/{phone,tablet7,tablet10}/` |
| Privacy Policy URL | `https://www.barmagly.tech/en/privacy` |
| Delete account URL | `https://pos.barmagly.tech/delete-account` |
| Data Safety | Answers in `data-safety.md` |
| Content Rating | Answers in `content-rating.md` |
| Target audience | 13+ (consumer) |
| App access | Guest browsing supported — no demo credentials needed |
| Ads | No |
| Financial features | "Receives or makes payments" → Yes (real food purchases) |

---

## 🔗 Connection to Barmagly POS

| Customer Action | POS Sees |
|---|---|
| Browse menu | Reads same product data from POS database |
| Place online order | Order appears in POS **Online Orders** tab instantly |
| Add delivery address | Stored in shared `customers` table |
| Pay (Stripe / TWINT) | Same payment pipeline as in-store sales |
| Restaurant updates menu | Customer sees update on next refresh |

Same backend (`pos.barmagly.tech`), same database, same multi-tenant license model. No additional integration work needed.

---

## ⚙️ Tech facts

| | |
|---|---|
| Shell | Expo SDK 54 / React Native 0.81.5 |
| WebView target | `https://pos.barmagly.tech/customer/` |
| Min Android | 8.0 (API 26) |
| Target Android | 35 |
| JS engine | Hermes |
| Keystore | EAS-managed (Build Credentials `kc8QHeyAn9`) — **save it, you'll need the same one for all future updates** |
| versionCode | Auto-increments via EAS (`autoIncrement: true`) |

---

## 🔁 Future updates

```powershell
# UI changes deploy via server (no app store re-submission)
python deploy_update.py

# Native changes (rare) require a new build + upload
cd customer-app
$env:EAS_NO_VCS=1
npx eas-cli build --profile production --platform android
npx eas-cli submit --profile production --platform android
```

Since the app is a WebView wrapper, **most updates happen server-side** — just deploy the SPA and customers see changes immediately. Only native dep changes require a Play Store update.

---

## ⚠️ Known limitations & next steps

- **Push notifications:** not wired up yet. Add `expo-notifications` + FCM later if you want order status pings.
- **TWA assetlinks:** if you'd like to deep-link `https://pos.barmagly.tech/customer/*` directly into the installed APK, host `.well-known/assetlinks.json` with the keystore SHA-256 (run `eas credentials` to fetch).
- **iOS:** same project can build for iOS via `eas build --platform ios` ($99/yr Apple Developer account required).
