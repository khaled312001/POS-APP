# Google Play Publishing Guide — Barmagly POS

> **Audience:** This guide assumes you have never published to Google Play before. Every click is spelled out.
> **App:** Barmagly POS — `com.barmagly.pos` — v1.0.0 (versionCode 7)
> **Artifact:** Android App Bundle (`.aab`) located in `play-store-release/`
> **Current state:** You are inside Google Play Console with the **Internal testing → Create new release** screen open.

---

## Phase 0 — Prerequisites checklist

Before you click anything in the Console, confirm every item below. If even one is missing, **stop and fix it first** — re-uploading later is a 24-48h round-trip.

### 0.1 Google Play Developer account
- [ ] Google Play Console account is active (one-time **$25 USD** fee paid).
- [ ] Account type is correct: **Organization** for Barmagly (company), not Personal.
- [ ] Identity verification completed (D-U-N-S number or business documents accepted by Google).
- [ ] Payments profile linked (required even for free apps if you ever add IAPs).
- [ ] Two-factor authentication enabled on the Google account (mandatory since 2023).

### 0.2 Files & assets in `play-store-release/`
- [ ] `app-release.aab` — exactly **v1.0.0, versionCode 7**, signed with the **upload key**.
- [ ] `app-release.aab.sha256` (optional but recommended — verify integrity after upload).
- [ ] `content-rating.md` — answers for the IARC questionnaire.
- [ ] `data-safety.md` — answers for the Data safety form.
- [ ] `listing-en.txt` — English short + full description.
- [ ] `listing-ar.txt` — Arabic short + full description.
- [ ] `listing-de.txt` — German short + full description (recommended for Switzerland market).
- [ ] `assets/images/play-store-icon.png` — **512 × 512 px**, 32-bit PNG, **under 1 MB**, no alpha bleed.
- [ ] `assets/images/play-store-feature-graphic.png` — **1024 × 500 px** JPG or 24-bit PNG, no alpha.
- [ ] `play-store-release/screenshots/phone/` — minimum **2**, maximum 8. PNG/JPG, 16:9 or 9:16, between 320 px and 3840 px on each side.
- [ ] `play-store-release/screenshots/tablet7/` — minimum 1 for 7-inch tablets (recommended since POS is tablet-first).
- [ ] `play-store-release/screenshots/tablet10/` — minimum 1 for 10-inch tablets (**critical** — primary form factor).

### 0.3 Backend & legal
- [ ] `https://pos.barmagly.tech` returns HTTP 200 and serves valid TLS (run `curl -I https://pos.barmagly.tech`).
- [ ] `https://barmagly.tech/privacy` is **live, public, and not behind login**. Google's crawler will fetch it.
- [ ] `https://barmagly.tech/terms` is live (linked from privacy policy).
- [ ] Privacy policy explicitly mentions: camera use, location use, customer PII storage, payment data handling (Stripe, TWINT), and Google Cloud Storage for images.
- [ ] Demo account works end-to-end on a fresh device: license `BARMAGLY-DEMO-XXXX-XXXX-XXXX`, PIN `1234`. Test it now on a real Android tablet.

### 0.4 Signing keys (one-time, do not skip)
- [ ] **Play App Signing** is enabled (recommended — Google holds the signing key, you keep an upload key).
- [ ] Upload keystore (`.jks`) is backed up in **two** locations (cloud + offline). Losing it = you can never update the app.
- [ ] Keystore passwords stored in a password manager (1Password / Bitwarden), not in plain text in the repo.

### 0.5 Compliance pre-flight
- [ ] Target SDK is **35** (Android 15) — Google's deadline for new apps in 2025+.
- [ ] Min SDK is **26** (Android 8) — fine, well above Google's 21 floor.
- [ ] All third-party SDKs disclosed (Stripe SDK, Expo modules, RN libs). If you bundle any analytics, list them in Data Safety.
- [ ] App contains no debug code paths reachable in production (`__DEV__` branches stripped).

---

## Phase 1 — Upload the .aab to Internal Testing

You are already on the **Internal testing → Create new release** page. Follow these clicks **exactly**.

### Step 1.1 — Confirm Play App Signing
1. If this is the very first release for `com.barmagly.pos`, a banner appears: **"Let Google manage and protect your app signing key (recommended)"**.
2. Click **Use Play App Signing** → **Continue**.
3. On the next dialog, choose **Export and upload a key from Java Keystore** if you have an existing upload key, **or** **Let Google create and manage the app signing key for you** if this is brand new.
   - For Barmagly POS first publish: pick **"Use Google-generated key"** unless your EAS build was signed with a custom upload keystore — in which case upload that.

### Step 1.2 — Upload the bundle
1. Scroll to **App bundles**.
2. Click the large **Upload** button (cloud icon with up arrow).
3. In the file picker, navigate to `F:\POS-APP\play-store-release\` and select `app-release.aab`.
4. Wait for the upload progress bar to reach 100% (file is ~30-80 MB; takes 30s-3min depending on connection).
5. Google validates the bundle. Watch for:
   - ✅ **Green check** → bundle accepted. Continue.
   - ⚠️ **Yellow warnings** → read each one. Common: "uses deprecated API" — usually safe to proceed. Click **Show details** for specifics.
   - ❌ **Red error** → upload rejected. Common causes: wrong signing key, versionCode already used (must increment), missing target SDK 35. Fix locally, rebuild, re-upload.

### Step 1.3 — Verify bundle metadata
After upload, a card appears showing:
- **Version code:** 7
- **Version name:** 1.0.0
- **Target SDK:** 35
- **Min SDK:** 26
- **Permissions:** `INTERNET`, `ACCESS_NETWORK_STATE`, `CAMERA`, `VIBRATE`, `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`
- **Size:** Install size estimate

Click **View bundle explorer** → confirm `arm64-v8a`, `armeabi-v7a`, `x86_64` split APKs are present (Expo SDK 54 default). If only `arm64-v8a`, that's still fine for modern tablets but reduces device reach.

### Step 1.4 — Release name & notes
1. **Release name** field: auto-filled as `7 (1.0.0)`. Leave it.
2. **Release notes** field: paste this exact block (you can edit the language tags as you add localizations):

   ```xml
   <en-US>
   First public release of Barmagly POS.
   - Multi-tenant POS with license activation
   - Inventory, customers, orders, reports
   - TWINT, card, and cash payments
   - Tablet-optimized for retail, cafe, restaurant, pharmacy
   </en-US>
   <de-DE>
   Erste Veröffentlichung von Barmagly POS.
   - Multi-Tenant-Kassensystem mit Lizenzaktivierung
   - Inventar, Kunden, Bestellungen, Berichte
   - TWINT-, Karten- und Barzahlung
   </de-DE>
   <ar>
   الإصدار الأول من برمجلي POS.
   - نقطة بيع متعددة المتاجر مع تفعيل بالترخيص
   - إدارة المخزون، العملاء، الطلبات، التقارير
   </ar>
   ```

3. Click **Next** (bottom right).

### Step 1.5 — Review & save (do NOT roll out yet)
1. Review screen appears with all warnings/errors.
2. Click **Save** (not "Save and publish") — this stores the release as a draft.
3. You'll bounce to a screen that says **Release ready to review**. **Do not click "Start rollout to Internal testing" yet** — finish the rest of the setup first, otherwise testers get a half-broken store listing.

---

## Phase 2 — Add internal testers

Internal testing supports up to **100 testers** and pushes builds in **minutes** (not the 1-3 hours that closed/open testing take).

### Step 2.1 — Create a tester list
1. Left sidebar → **Testing** → **Internal testing**.
2. Click the **Testers** tab (top of the page).
3. Under **Testers**, click **Create email list**.
4. **List name:** `Barmagly Internal QA`
5. **Add email addresses:** paste comma-separated or one-per-line. Recommended initial list:
   - `barmaglyy@gmail.com` (you)
   - Your QA lead's Google account
   - One Egypt-based tester (Arabic UI check)
   - One Switzerland-based tester (TWINT + CHF check)
   - One non-technical store owner (real-world UX check)
6. Click **Save changes**.

### Step 2.2 — Assign list to this track
1. Back on the **Testers** tab, check the box next to `Barmagly Internal QA`.
2. Click **Save changes** at the bottom.

### Step 2.3 — Configure feedback channel (optional but smart)
1. Scroll to **Feedback URL or email address**.
2. Enter: `support@barmagly.tech` (or a Telegram/WhatsApp link).
3. Click **Save**.

### Step 2.4 — Generate the opt-in URL
1. Still on the **Testers** tab, scroll to **How testers join your test**.
2. Copy the **Copy link** URL — it looks like `https://play.google.com/apps/internaltest/4701234567890123456`.
3. Send this URL to each tester via email/WhatsApp. They must:
   1. Open the link on their Android device.
   2. Tap **Become a tester**.
   3. Wait ~5 minutes after rollout, then install from Play Store as normal.

**Common tester gotcha:** the tester's Google account on the device must be the **same** email you added to the list. Multi-account devices: pull down notification shade in Play Store → switch account.

---

## Phase 3 — Complete "Set up your app" tasks

Left sidebar → **Dashboard**. Find the **"Set up your app"** card with a checklist. Each row is mandatory; the app **cannot** progress past Internal testing until all are green.

### 3.1 App access
1. Click **App access** → **Manage**.
2. Choose: **All or some functionality is restricted**.
3. Click **Add new instructions**.
4. Fill in:
   - **Name:** `Demo store login`
   - **Username:** `BARMAGLY-DEMO-XXXX-XXXX-XXXX`
   - **Password:** `1234`
   - **Any other information:** paste this:
     ```
     1. Launch app.
     2. On the activation screen, paste the license key above.
     3. Tap "Activate". You will land on the employee PIN screen.
     4. Enter PIN 1234 to log in as the demo Admin.
     5. The demo store has pre-loaded products, customers, and orders.
        Test the POS, reports, inventory, and online ordering QR flow.
     ```
5. Click **Save** → **Save** again at the bottom.

### 3.2 Ads
1. Click **Ads** → **Manage**.
2. Select **No, my app does not contain ads**.
3. Click **Save**.

### 3.3 Content rating
1. Click **Content rating** → **Start questionnaire**.
2. **Email:** `barmaglyy@gmail.com`
3. **Category:** select **Utility, Productivity, Communication, or Other**.
4. Answer every question using the values in `play-store-release/content-rating.md`. For Barmagly POS (a business tool with no game content), the answers are essentially **No** to all violence/sex/gambling/drugs/etc. questions.
5. Click **Save questionnaire** → **Calculate rating** → **Apply rating**.
6. Expected result: **Everyone (PEGI 3 / ESRB Everyone / IARC 3+)**. But your Target audience (Phase 3.4) overrides this to 18+.

### 3.4 Target audience
1. Click **Target audience** → **Manage**.
2. **Target age groups:** check **only** the box for **18 and over**.
3. Confirmation dialog: "Are you sure your app is not designed for children?" → **Yes**.
4. **Appeals to children?** → **No**.
5. Click **Next** → **Save**.

> Barmagly POS is a B2B tool. Marking it 18+ avoids the entire **Designed for Families** compliance program, which is irrelevant to a POS.

### 3.5 News app
1. Click **News app** → **Manage**.
2. Select **No, it's not a news app**.
3. Click **Save**.

### 3.6 COVID-19 contact tracing and status apps
1. Click **COVID-19 contact tracing and status apps** → **Manage**.
2. Select **My app is not a publicly available COVID-19 contact tracing or status app**.
3. Click **Save**.

### 3.7 Data safety
This is the **most-rejected section** for new apps. Take it slowly.

1. Click **Data safety** → **Start** (or **Manage** if already started).
2. Open `play-store-release/data-safety.md` in another tab — copy answers verbatim.
3. Section flow:
   - **Data collection and security**
     - Does your app collect or share any of the required user data types? → **Yes**
     - Is all of the user data collected by your app encrypted in transit? → **Yes** (HTTPS to pos.barmagly.tech)
     - Do you provide a way for users to request that their data be deleted? → **Yes**, link: `https://barmagly.tech/privacy#data-deletion`
   - **Data types** — check each item that applies. For Barmagly POS:
     - **Personal info:** Name, Email address, Phone number, Address (all entered by merchant about their customers) — **Collected, not shared**, **Required**, Purpose: **App functionality, Account management**.
     - **Financial info:** Purchase history, Other financial info (license/subscription) — **Collected, not shared**, Purpose: **App functionality**.
     - **App activity:** App interactions, Other actions (POS transactions) — **Collected**, Purpose: **Analytics, App functionality**.
     - **Device or other identifiers:** Device or other IDs — **Collected**, Purpose: **App functionality, Fraud prevention**.
     - **Photos and videos:** **Not collected** (camera is used for barcode scanning only — frames are not stored or transmitted; declare this in the camera question below).
     - **Location:** Approximate location — **Collected, not shared**, Purpose: **App functionality (delivery zones)**, **Optional**.
4. Click through each data type's detail page and check **App functionality** and any other accurate purposes.
5. Final review screen → **Save** → **Submit** at top.

### 3.8 Government apps
1. Click **Government apps** → **Manage**.
2. Select **My app is not made by or on behalf of a government**.
3. Click **Save**.

### 3.9 Financial features
1. Click **Financial features** → **Manage**.
2. Check the box: **Receives or makes payments**.
   - Rationale: Barmagly POS receives payment from customers on behalf of the merchant (cash, card, TWINT). This is merchant-acquiring, not consumer money transmission, but Google still wants it disclosed.
3. Leave **all other boxes unchecked** — Barmagly POS is not:
   - A loan app
   - A crypto exchange
   - An insurance product
   - A personal banking app
   - A debt management service
4. Click **Next**.
5. **Country availability for financial features:** select **Switzerland** (primary), and optionally **Egypt, Germany, Austria, France** if you plan to market there.
6. Upload required documentation if Google prompts (usually: merchant agreement template, Stripe Connect proof). For Switzerland, no FINMA license is required for a POS app — you are software, not a payment institution.
7. Click **Save**.

### 3.10 Health
1. Click **Health** → **Manage**.
2. Select **My app does not provide health features**.
   - Even though pharmacies use it, Barmagly POS sells **products** — it does not diagnose, dispense advice, or track health metrics.
3. Click **Save**.

---

## Phase 4 — Store listing

Left sidebar → **Grow** → **Store presence** → **Main store listing**.

### 4.1 App details
1. **App name:** `Barmagly POS` (30-char max — you have plenty of room).
2. **Short description:** open `play-store-release/listing-en.txt`, copy the **short description** block (max 80 chars), paste.
3. **Full description:** from the same file, copy the **full description** (max 4000 chars), paste.
   - Use line breaks and bullets (Play renders Markdown-style asterisks as bullets).
   - Include keywords naturally: *POS, point of sale, pharmacy, retail, cafe, restaurant, TWINT, Switzerland, inventory, ERP*.

### 4.2 Graphic assets

| Asset | Spec | Source path |
|---|---|---|
| **App icon** | 512×512, 32-bit PNG, <1 MB | `F:\POS-APP\assets\images\play-store-icon.png` |
| **Feature graphic** | 1024×500, JPG or 24-bit PNG | `F:\POS-APP\assets\images\play-store-feature-graphic.png` |
| **Phone screenshots** | 2-8 images, 16:9 or 9:16, 320-3840px | `F:\POS-APP\play-store-release\screenshots\phone\` |
| **7-inch tablet screenshots** | 1-8 images | `F:\POS-APP\play-store-release\screenshots\tablet7\` |
| **10-inch tablet screenshots** | 1-8 images | `F:\POS-APP\play-store-release\screenshots\tablet10\` |

**Upload order matters** — the first screenshot is what appears in search results. Lead with the **POS cart screen on a 10" tablet** (your strongest visual).

For each upload zone:
1. Click the upload tile.
2. Multi-select all files for that category.
3. Wait for thumbnails to render.
4. Drag to reorder so the strongest shot is first.

### 4.3 Video (optional but boosts conversion)
- Skip on initial launch. Add a 30-120s YouTube demo later as an update.

### 4.4 Localized listings
1. At the top of the page, click **Manage translations** → **Add your own translations**.
2. Add **German (de-DE)** — paste from `listing-de.txt`.
3. Add **Arabic (ar)** — paste from `listing-ar.txt`.
4. Save each translation. The default (English) is the fallback for any locale you don't translate.

### 4.5 Categorization & contact
Left sidebar → **Grow** → **Store presence** → **Store settings**.

- **App category:** **Business** (primary). Tags: `Point of Sale`, `Inventory`, `Productivity`.
- **Email:** `support@barmagly.tech`
- **Phone:** your business support number (optional but recommended).
- **Website:** `https://barmagly.tech`
- **Privacy Policy:** `https://barmagly.tech/privacy` ← **this URL is fetched by Google's crawler; must return 200 with the policy visible**.

Click **Save** at the bottom of every page before navigating away — Play Console **does not auto-save**.

---

## Phase 5 — Internal → Closed → Open → Production rollout

This is a **staged release**. Skipping stages is the #1 cause of post-launch fires.

### Stage A — Roll out to Internal testing (you are here)

1. Left sidebar → **Testing** → **Internal testing** → **Releases** tab.
2. Your draft release from Phase 1 is at the top.
3. Click **Review release**.
4. Resolve any final warnings (yellow). Errors (red) must be zero.
5. Click **Start rollout to Internal testing**.
6. Confirm dialog → **Rollout**.
7. **Wait 5-15 minutes**, then have testers install via the opt-in URL.

**What to test in this stage (minimum 48 hours):**
- License activation with real production license keys
- POS transaction → receipt print → backend sync
- Camera barcode scan
- TWINT payment (Switzerland tester)
- Arabic RTL layout (Egypt tester)
- German strings (Switzerland tester)
- Offline mode → resync when network returns
- Multi-branch switching
- Crash-free rate in **Quality → Android vitals** must be ≥ 99.5% over 50+ sessions before promoting.

### Stage B — Promote to Closed testing (Alpha)

1. Left sidebar → **Testing** → **Closed testing** → **Create track**.
2. **Track name:** `alpha-pilots`
3. Click **Create**.
4. **Create new release** → **Use existing release** dropdown → pick the v1.0.0 (7) bundle from Internal (saves re-uploading).
5. Add a tester list of **10-50 real pilot stores** (your earliest paying customers, NDA'd).
6. Roll out. **Wait 2-7 days** for real-world transaction volume.

### Stage C — Promote to Open testing (Beta)

1. Left sidebar → **Testing** → **Open testing** → **Create new release**.
2. Promote the same bundle.
3. Open testing is **publicly listed** on Play Store with a "Beta" badge. Anyone can join.
4. Use this stage for **2-4 weeks** to build social proof (ratings count!) and stress-test backend scaling.
5. Monitor **Statistics → Acquisition** and **Quality → Android vitals** daily.

### Stage D — Promote to Production

1. Left sidebar → **Production** → **Create new release**.
2. Promote the same bundle (still v1.0.0 build 7 — same artifact).
3. **Rollout percentage:** set to **20%** initially (staged rollout).
4. Click **Start rollout to Production**.
5. **Google review takes 1-7 days** (typically 24-48h for new apps, faster for updates).
6. Once approved and live, monitor for **72 hours** at 20%.
7. If crash-free rate stays ≥ 99.5% and 1-star reviews don't spike: increase to **50%**, then **100%** over the following week.

To increase rollout %: **Production** → **Releases** → current release → **Manage rollout** → enter new percentage → **Update**.

### Halt rollout (emergency brake)
If you see a critical bug post-launch:
1. **Production** → **Manage rollout** → **Halt rollout**.
2. New installs are blocked; existing installs keep working.
3. Ship a fix as v1.0.1 (versionCode 8) through the same Internal → Closed → Open → Production pipeline (fast-track allowed if critical).

---

## Phase 6 — After publication

### 6.1 Monitor (daily for first 2 weeks, then weekly)
- **Quality → Android vitals → Overview:** crash-free user rate, ANR rate, slow rendering. Targets:
  - Crash rate < 0.5%
  - ANR rate < 0.1%
  - If either exceeds the "bad behavior threshold," Google demotes your search ranking.
- **Quality → Crashes & ANRs:** click each new cluster, look at stack trace, file a bug.
- **Ratings & reviews:** reply to every 1-2 star review within 24h. Be empathetic, never defensive. Reviews on Play are public reputation.
- **Statistics:** installs, uninstalls, conversion rate (store listing → install).
- **Policy status:** check weekly. Google emails warnings to `barmaglyy@gmail.com` — set up a filter that **never** sends Play Console emails to spam.

### 6.2 Shipping updates
Every update follows the same flow:
1. Increment `versionCode` (8, 9, 10...) and `versionName` (1.0.1, 1.0.2, 1.1.0...) in `app.config.ts` / `build.gradle`.
2. Build new `.aab` (EAS Build or local Gradle).
3. Upload to **Internal testing** → soak 24h → promote through Closed → Open → Production.
4. **Never** skip Internal for a "small fix" — that's how you ship a regression to 100% of users.

### 6.3 Compliance maintenance
- **Target SDK:** Google bumps the required target SDK every August. You have ~12 months to comply or your app becomes uninstallable for new users. Re-check `targetSdkVersion` every January.
- **Data Safety:** any new SDK or data type added requires a Data Safety update **before** the build is rolled out.
- **Privacy Policy:** keep `https://barmagly.tech/privacy` in sync with what the app actually does. Mismatches are the #1 policy-violation cause.

### 6.4 Reviews and ratings hygiene
- After a successful transaction milestone (e.g., merchant's 100th sale), trigger Google's in-app review API (`expo-store-review`). Do **not** prompt on first launch — that's banned.

---

## Common rejection reasons + fixes

| # | Rejection reason | Why it happens | Fix |
|---|---|---|---|
| 1 | **"Broken functionality" — reviewer couldn't log in** | App access instructions unclear or demo credentials expired | Re-test the demo flow yourself on a freshly installed APK. Update App access (Phase 3.1) with **exact** screenshots-worth of steps. Confirm `BARMAGLY-DEMO-XXXX` license is permanent and not auto-expiring. |
| 2 | **"Privacy policy missing or inaccessible"** | URL 404s, redirects, requires login, or doesn't mention all collected data | Make `https://barmagly.tech/privacy` a public static page. Use a tool like `https://app-privacy-policy-generator.firebaseapp.com` as a starting template, then customize for: camera, location, customer PII, Stripe, TWINT, GCS image storage. |
| 3 | **"Data safety form inaccurate"** | You said "no location collected" but `ACCESS_FINE_LOCATION` is in the manifest | Audit the `AndroidManifest.xml` permissions against your Data Safety answers line by line. Every permission must map to a disclosed data type. |
| 4 | **"Financial features — missing documentation"** | You checked "Receives or makes payments" without providing merchant agreement | Upload a sample Barmagly merchant terms PDF in Phase 3.9. State clearly: "Barmagly POS is software that records payments collected by the merchant. Barmagly does not hold or transmit funds." |
| 5 | **"Deceptive app name / impersonation"** | Title contains a brand you don't own (e.g., "Square POS clone") | Use only `Barmagly POS`. Never reference competitor brand names in title, short, or full description. |
| 6 | **"Permissions request without justification"** | Camera or Location permission requested but use case unclear from listing | In the full description, explicitly say: *"Camera permission is used to scan product barcodes. Location is used to validate delivery zones — both are optional."* |
| 7 | **"Background location use"** | RN library pulled in background location permission silently | Run `aapt dump permissions app-release.aab` — if `ACCESS_BACKGROUND_LOCATION` appears, remove it from `app.config.ts → android.permissions`. Barmagly POS uses location only in foreground. |
| 8 | **"App crashes on launch"** | Reviewer's test device is an older Android 8/9 tablet where a native dep crashed | Test on a real Android 8 device or use Firebase Test Lab Robo test before rollout. |
| 9 | **"Target audience and content"** — children mismatch | You marked Everyone rating + 18+ audience without filter | This combo is **fine** as long as Target audience says 18+ only (Phase 3.4). Re-check that box. |
| 10 | **"Repeated 'I am not a robot' / spam appearance"** | Generic icon, screenshots are emulator chrome | Use real device screenshots (Pixel Tablet or Galaxy Tab). Icon must be the brand-accent teal `#2FD3C6` Barmagly mark on dark background — no stock imagery. |
| 11 | **"versionCode already exists"** | You uploaded build 7, then tried to upload another build 7 | Increment versionCode in every single new build, no exceptions. Even for cosmetic rebuilds. |
| 12 | **"Unsigned or wrongly signed bundle"** | EAS used a different upload key than Play has registered | Match the upload keystore fingerprint to Play Console → **Setup → App integrity → Upload key certificate**. |

---

## Estimated timeline

| Phase | Optimistic | Realistic | Notes |
|---|---|---|---|
| Phase 0 — Prerequisites | 0.5 day | 1-2 days | Most time goes into privacy policy + identity verification |
| Phase 1 — Upload bundle | 30 min | 1 hour | Includes troubleshooting first-upload warnings |
| Phase 2 — Add testers | 15 min | 30 min | |
| Phase 3 — Set up app tasks | 1 hour | 3-4 hours | Data Safety + Content Rating eat most of this |
| Phase 4 — Store listing | 1 hour | 2-3 hours | Especially with three languages |
| Phase 5A — Internal testing soak | 1 day | 2-3 days | |
| Phase 5B — Closed testing soak | 2 days | 1 week | Real merchant transaction volume needed |
| Phase 5C — Open testing soak | 1 week | 2-4 weeks | Builds rating count + uncovers edge cases |
| Phase 5D — Production review | 24 hours | 1-7 days | Google's queue; first apps take longer |
| **Total to 100% production** | **~2 weeks** | **5-7 weeks** | |

If you need to launch faster: **skip Open testing** and go Internal → Closed → Production. You'll get to market in ~10 days but with less safety margin.

---

## "You're done when..." checklist

Tick all eight boxes — only then is Barmagly POS truly live.

- [ ] **Box 1 — Bundle accepted.** v1.0.0 (versionCode 7) `.aab` is on the **Production** track with status **Available on Google Play**.
- [ ] **Box 2 — All policies green.** **Policy → App content** dashboard shows ✅ on every row (App access, Ads, Content rating, Target audience, News, COVID, Data safety, Government, Financial, Health).
- [ ] **Box 3 — Store listing complete.** Main store listing has icon, feature graphic, ≥2 phone + ≥1 tablet7 + ≥1 tablet10 screenshots, short + full description, and **EN/DE/AR** translations live.
- [ ] **Box 4 — Public install works.** From a phone with a Google account **not** on any tester list, search **"Barmagly POS"** on the Play Store, find it, install, and complete demo activation with `BARMAGLY-DEMO-XXXX` / PIN `1234`.
- [ ] **Box 5 — Crash-free rate ≥ 99.5%** over the most recent 1,000 sessions in **Quality → Android vitals**.
- [ ] **Box 6 — Privacy policy lives at `https://barmagly.tech/privacy`** and accurately describes every data type listed in Data Safety. Test in incognito browser.
- [ ] **Box 7 — Rollout at 100%.** **Production → Releases** shows the current release at **100% rollout**, no halts active.
- [ ] **Box 8 — Monitoring in place.** Daily alerts configured for: new crashes, new 1-star reviews, policy emails. Reviews are being replied to within 24h.

When all eight are checked: Barmagly POS is officially shipping. Next step is v1.0.1 — start the cycle again from Phase 5A with the next versionCode.