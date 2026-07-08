# Publishing Guide — Barmagly Customer

This guide walks you through publishing **Barmagly Customer** (`com.barmagly.customer`) to the Google Play Store. It assumes you already have the signed `.apk` or `.aab` artifact from your EAS build and access to the Barmagly Google Play Console account.

> Barmagly Customer is the diner-facing companion to **Barmagly POS**. Both apps share the same backend (`pos.barmagly.tech`), but they are **separate Play Console listings** with different package names, icons, and audiences.

---

## Phase 1 — Create new app in Play Console

1. Sign in to the [Google Play Console](https://play.google.com/console) with the Barmagly developer account.
2. From the **All apps** dashboard, click **Create app** (top-right).
3. Fill in the basic info:

   | Field | Value |
   |---|---|
   | App name | `Barmagly Customer` |
   | Default language | `English (United States) – en-US` |
   | App or game | `App` |
   | Free or paid | `Free` |
   | Declarations | Tick both: Developer Program Policies + US export laws |

4. Click **Create app**. You will land on the app's dashboard.
5. Confirm the package name is reserved as **`com.barmagly.customer`** — this is set on first upload (Phase 2) and is **permanent**. Double-check it is *not* the existing POS package (`com.barmagly.pos` or similar).

> **Important:** This is a **new, separate listing** from Barmagly POS. Do not reuse the POS app entry. The two apps will coexist as two independent products under the same developer account.

---

## Phase 2 — Upload APK / AAB

Use **Internal testing** first to validate the build, then promote to Production once smoke-tested.

### 2a. Create the internal testing release

1. Left nav → **Testing → Internal testing → Create new release**.
2. Under **App bundles**, click **Upload** and select your artifact:
   - **`.apk`** — fine for early preview / sideload validation.
   - **`.aab`** — required for production rollout (Play Store mandates AAB for new apps).
3. App signing by Google Play will be enabled automatically on first upload — accept it.
4. **Release name**: auto-fills from `versionName` in `app.json` (e.g. `1.0.0 (1)`). Leave as-is.
5. **Release notes**: paste the contents of `release-notes.md` inside the language tags:

   ```xml
   <en-US>
   First public release of Barmagly Customer.
   Browse menus, order online, track delivery, and chat with your favourite restaurants.
   </en-US>
   <ar>
   ...
   </ar>
   ```

6. Click **Next → Save → Review release → Start rollout to Internal testing**.

### 2b. Add internal testers

- **Testing → Internal testing → Testers tab** → create an email list (add the dev team + 2–3 pilot diners).
- Share the opt-in URL Google generates. Testers install via Play Store within ~15 minutes.

### 2c. Promote to Production

Once internal testing passes:

- **Internal testing → Releases** → click the release → **Promote release → Production**.
- Re-confirm release notes and roll out at **20% staged rollout** initially.

---

## Phase 3 — Complete app content tiles

Navigate to **Policy → App content**. Every tile below must show a green check before submission.

### 3.1 Privacy policy
- URL: `https://www.barmagly.tech/en/privacy`

### 3.2 App access
- Select **All functionality is available without special access**.
- Justification: guest browsing of restaurant menus works without login. Login (Google Sign-In) is only required when placing an order — Google can place a test order using their own credentials, so no test account is needed.

### 3.3 Ads
- **Does your app contain ads?** → **No**
- Barmagly Customer contains no advertising SDKs or third-party ad networks.

### 3.4 Content rating
- Launch the questionnaire and answer per `content-rating.md`.
- Expected result: **PEGI 3 / ESRB Everyone / IARC: 3+**.
- Category: **Food & Drink — Reference, News, or Educational**.

### 3.5 Target audience and content
- **Target age group:** `13+` (consumer audience, payment flows present).
- **Appeals to children?** → **No**.
- This avoids Families policy obligations while still allowing teens to use the app under parental supervision.

### 3.6 News app
- **Is your app a news app?** → **No**.

### 3.7 COVID-19 contact tracing and status apps
- **No**.

### 3.8 Data safety
- Open `data-safety.md` and fill the form section by section. Summary of declarations:

   | Data type | Collected | Shared | Purpose | Optional |
   |---|---|---|---|---|
   | Name | Yes | No | Account, Fulfilment | No |
   | Phone number | Yes | No | Account, Fulfilment, Communications | No |
   | Email address | Yes | No | Account, Communications | No |
   | Approximate location | Yes | No | App functionality | Yes |
   | Precise location | Yes | No | Delivery routing | Yes |
   | Delivery address | Yes | No | Fulfilment | No |
   | Purchase history | Yes | No | Account, App functionality | No |
   | Photos (profile) | Yes | No | Account | Yes |
   | App interactions | Yes | No | Analytics | Yes |

- **Data is encrypted in transit:** **Yes** (HTTPS/TLS to `pos.barmagly.tech`).
- **Users can request data deletion:** **Yes** — link to `https://www.barmagly.tech/delete-account` (delete-account.html).
- **Independent security review:** No.

### 3.9 Government apps
- **No**.

### 3.10 Financial features
- **Does your app contain financial features?** → **YES**.
- Tick: **Facilitates the purchase of goods or services** (food orders).
- Tick: **Processes payments** (the app collects payment for food delivery on behalf of restaurants).
- You will be asked for **proof of business registration** and a **financial-services disclosure** — upload the Barmagly Sàrl business registration certificate.

### 3.11 Health
- **Not a health app** → leave blank.

### 3.12 Actions on Google / Google Sign-In verification
- Because the app uses **Google Sign-In**, complete the **OAuth brand verification** under `https://console.cloud.google.com/apis/credentials/consent`. The OAuth client must list `com.barmagly.customer` and the SHA-1 of the Play signing key.

---

## Phase 4 — Store listing

Navigate to **Grow → Store presence → Main store listing**.

### 4.1 Text content (per language)

Paste from the prepared listing files:

- **English (en-US)** ← `listing-en.txt`
   - **App name** (max 30 chars): `Barmagly Customer`
   - **Short description** (max 80 chars): from file
   - **Full description** (max 4000 chars): from file
- **Arabic (ar)** ← `listing-ar.txt` (add via **Add translations**)

### 4.2 Graphic assets

| Asset | Spec | Source |
|---|---|---|
| **App icon** | 512 × 512 PNG, 32-bit, < 1 MB, no alpha | Resize `customer-app/assets/icon.png` to 512×512 |
| **Feature graphic** | 1024 × 500 PNG/JPG | Create from brand template — dark `#070A12` background, orange `#FF5722` accent, app icon + tagline “Order. Track. Enjoy.” |
| **Phone screenshots** | 2–8 images, 16:9 or 9:16, min 320 px, max 3840 px | Capture from `https://pos.barmagly.tech/customer/` |
| **7-inch tablet screenshots** | Optional but recommended | Capture in tablet emulator |
| **10-inch tablet screenshots** | Optional but recommended | Capture in tablet emulator |

### 4.3 Capturing screenshots from the live web app

1. Open Chrome DevTools → Device toolbar → **Pixel 7** (1080×2400).
2. Navigate to `https://pos.barmagly.tech/customer/`.
3. Capture these flows (8 screens recommended):
   1. **Home** — restaurant list / hero banner
   2. **Restaurant detail** — menu with categories
   3. **Item detail** — product with add-to-cart
   4. **Cart** — order summary
   5. **Checkout** — delivery address + payment
   6. **Order tracking** — live driver map
   7. **Order history** — past orders list
   8. **Chat** — conversation with restaurant
4. Use `Ctrl+Shift+P → Capture full size screenshot`.
5. Save as `screenshot-01.png` ... `screenshot-08.png` (PNG, no device frame — Play Console adds one).

### 4.4 Categorisation and contact

- **App category:** `Food & Drink`
- **Tags:** `Food Delivery`, `Restaurants`, `Online Ordering`
- **Email:** `support@barmagly.tech`
- **Phone:** (optional, but improves trust)
- **Website:** `https://www.barmagly.tech`
- **Privacy policy:** `https://www.barmagly.tech/en/privacy`

### 4.5 Countries and translations

- **Production → Countries / regions → Add countries:** Switzerland, Germany, Austria, Liechtenstein, Egypt, Saudi Arabia, United Arab Emirates.
- Do **not** roll out worldwide on day one — restrict to the markets your restaurants operate in.

---

## Phase 5 — Submit & monitor

1. Verify every tile under **Dashboard → Publishing overview** is green.
2. **Publishing overview → Send changes for review**.
3. Initial review: typically **2–7 days** for a new developer or new app with financial features.
4. While in review:
   - Watch the email tied to the developer account for policy questions from Google.
   - Be ready to provide **proof of relationship with restaurants** (sample merchant agreement) — Google often asks this for food-ordering apps.
5. After approval & staged rollout starts:
   - **Statistics** → monitor installs, uninstalls, crashes.
   - **Android vitals** → keep ANR rate < 0.47% and crash rate < 1.09%.
   - **Pre-launch report** → review any flagged accessibility / security issues.
   - **Ratings & reviews** → respond to early reviews within 24 hours; first reviews disproportionately affect ranking.
6. Once stable at 20% for 48–72 hours with no spike in crashes, increase staged rollout to 50% → 100%.

---

## Pre-launch checklist

Run through these **before** clicking *Send changes for review*:

1. **Package name** is `com.barmagly.customer` (not the POS package).
2. **Version code & name** in `app.json` are incremented from any previous internal upload.
3. **App icon** is 512×512, no alpha channel, < 1 MB, matches the in-app launcher icon.
4. **Feature graphic** is exactly 1024×500 and contains no screenshots of devices or trademarked logos.
5. **At least 4 phone screenshots** uploaded, all 9:16 portrait, showing real customer flows from `pos.barmagly.tech/customer/`.
6. **Privacy policy URL** loads successfully on mobile and covers all data types declared in Data Safety.
7. **Data safety form** matches what the app actually does — especially precise location and payment data.
8. **Financial features** declared YES with business registration uploaded.
9. **Google Sign-In OAuth consent screen** verified, with `com.barmagly.customer` and Play-signing SHA-1 registered.
10. **Internal testing build** installed on at least one real Android device; verified: guest browse, Google Sign-In, place order, live tracking, chat, profile photo upload, geolocation prompt, push notification receipt.

---

> **Note:** After launch, customers can install both **Barmagly POS** (merchants) and **Barmagly Customer** (diners) on the same device — they share the same backend.