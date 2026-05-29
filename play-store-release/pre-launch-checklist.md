# Pre-Launch Checklist — Barmagly POS

Final operational checklist before submitting **Barmagly POS** (com.barmagly.pos, v1.0.0 build 7) to the Google Play Console. Use this as the last gate before pressing **Submit for review**.

---

## Section 1: Verify BEFORE pressing "Submit for review"

### Build & signing
- [ ] `.aab` matches `app.json` package `com.barmagly.pos`
- [ ] Version 1.0.0 build 7 (versionCode 7) confirmed in `app.json` and inside the `.aab`
- [ ] Keystore SHA-1 matches EAS credentials (`eas credentials` — Android → production)
- [ ] Upload key fingerprint registered with Play App Signing
- [ ] `.aab` size under 150 MB (dynamic delivery if exceeded)
- [ ] Release build tested with `--variant=release` locally before upload

### Listing & legal
- [ ] Privacy URL https://barmagly.tech/privacy LIVE returns HTTP 200
- [ ] Terms URL (if used) also returns 200
- [ ] Demo credentials filled into the "App access" tile (License key + Admin PIN + at least one Cashier PIN)
- [ ] App category set to **Business** (secondary: Productivity)
- [ ] Contact email = support@barmagly.tech
- [ ] Website = https://barmagly.tech
- [ ] Developer name = Barmagly

### Graphics
- [ ] Icon 512x512 PNG (32-bit, no alpha edge) uploaded
- [ ] Feature graphic 1024x500 PNG/JPG uploaded
- [ ] Minimum 4 screenshots **per device type** uploaded (phone, 7" tablet, 10" tablet)
- [ ] Screenshots show real POS UI in dark mode, brand teal #2FD3C6 visible
- [ ] No placeholder text, no "Lorem ipsum", no debug overlays in screenshots

### Copy
- [ ] Short description (≤80 chars) EN finalized
- [ ] Full description (≤4000 chars) EN finalized
- [ ] AR localization added (optional but recommended for MENA reach)
- [ ] DE localization considered (primary market is Switzerland)
- [ ] No mentions of "beta", "test", "WIP" in production listing

### Policies
- [ ] Content rating questionnaire completed → expected **PEGI 3 / Everyone**
- [ ] Data safety form completed (matches `data-safety.md`)
- [ ] Target audience set to **18+** (business-users-only)
- [ ] Ads declaration: **No ads**
- [ ] Government app: **No**
- [ ] Financial features declared (handles payment data via Stripe/TWINT — declare under "Financial features")
- [ ] Permission justifications written for CAMERA + Location (runtime)

### Functional smoke test
- [ ] Installed APK from Internal Testing link on a real Android phone (SDK ≥ 26)
- [ ] Installed on real Android tablet (10")
- [ ] License activation flow works with a real `BARMAGLY-XXXX-XXXX-XXXX-XXXX` key
- [ ] POS cart → checkout → receipt print path works end-to-end
- [ ] Camera barcode scan grants permission and reads an EAN-13
- [ ] Online order via QR table flow reachable
- [ ] Multi-language switch (EN → DE → AR with RTL) renders correctly
- [ ] Offline behavior gracefully degrades (no crash on airplane mode)

### Backend & cleanup
- [ ] Backend pos.barmagly.tech `/health` returns 200
- [ ] Database backups scheduled (daily, ≥7 day retention)
- [ ] Stripe webhook endpoints in **live** mode (not test)
- [ ] No leftover dev URLs (`localhost`, `ngrok`, `*.eas.dev`) in code — `git grep`
- [ ] No `console.log` of PII or tokens in release bundle
- [ ] Sentry / crash reporting DSN points to production project (if enabled)
- [ ] `.env.production` committed values audited; secrets only on server

---

## Section 2: Asset locations

| Asset | Path |
|---|---|
| App bundle (.aab) | `play-store-release/barmagly-pos-1.0.0-7.aab` |
| App icon 512x512 | `assets/images/play-store-icon.png` |
| Feature graphic 1024x500 | `assets/images/play-store-feature-graphic.png` |
| Phone screenshots | `play-store-release/screenshots/phone/*.png` |
| Tablet 7" screenshots | `play-store-release/screenshots/tablet7/*.png` |
| Tablet 10" screenshots | `play-store-release/screenshots/tablet10/*.png` |
| Privacy policy HTML | `play-store-release/privacy-policy.html` |
| Listing copy (EN) | `play-store-release/listing-en.txt` |
| Listing copy (AR) | `play-store-release/listing-ar.txt` |
| Data safety answers | `play-store-release/data-safety.md` |
| Content rating answers | `play-store-release/content-rating.md` |
| Release notes | `play-store-release/release-notes.md` |
| Publishing guide | `play-store-release/publishing-guide.md` |

---

## Section 3: Internal testers — opt-in template

Send to your closed beta group (staff, pilot merchants, family devices). Internal testing in Play Console requires testers to **accept the opt-in link** before they can install.

### English (short message — paste to WhatsApp / Email)

> **Subject:** Help us test Barmagly POS before launch
>
> Hi,
>
> We're about to launch **Barmagly POS** on the Google Play Store and would love your help to test it on your Android phone or tablet first.
>
> **What to do:**
> 1. Open this link on your Android device: `https://play.google.com/apps/internaltest/<TRACK_ID>`
> 2. Tap **Become a tester**
> 3. Install **Barmagly POS** from the Play Store on the same device
> 4. Use license key: `BARMAGLY-DEMO-XXXX-XXXX-XXXX` (demo store)
> 5. Try: log in → add product to cart → checkout → print receipt → scan a barcode
>
> Send any bugs, crashes, or weird behavior to **support@barmagly.tech** or reply here.
>
> Thanks — your feedback ships the launch.
> — The Barmagly Team

### Arabic (short message — RTL)

> **الموضوع:** ساعدنا في اختبار برمجلي POS قبل الإطلاق
>
> أهلاً،
>
> هنطلق تطبيق **برمجلي POS** قريب على Google Play، ومحتاجين مساعدتك تجربه على هاتفك أو تابلت Android.
>
> **الخطوات:**
> 1. افتح اللينك ده من جهاز Android: `https://play.google.com/apps/internaltest/<TRACK_ID>`
> 2. اضغط **Become a tester** (انضم كمختبر)
> 3. نزّل **Barmagly POS** من Google Play على نفس الجهاز
> 4. استخدم مفتاح التفعيل التجريبي: `BARMAGLY-DEMO-XXXX-XXXX-XXXX`
> 5. جرّب: تسجيل الدخول ← إضافة منتج للسلة ← إتمام الدفع ← طباعة الفاتورة ← مسح باركود
>
> ابعت أي مشاكل أو اقتراحات على **support@barmagly.tech** أو رد على الرسالة دي.
>
> شكراً — ملاحظاتك هي اللي بتجهز الإطلاق.
> — فريق برمجلي

---

## Section 4: Post-launch monitoring

### Day 0 → Day 7 (hyper-care)

| Metric | Source | Threshold | Action |
|---|---|---|---|
| Crash-free users | Play Console → Android vitals | ≥ 99.0% | Investigate any cluster ≥ 3 reports |
| ANR rate | Play Console → Android vitals | ≤ 0.47% (Play bad-behavior threshold) | Profile main thread, hotfix |
| 1-star reviews | Play Console → Ratings | 0 unanswered > 24h | Reply within 24h, route bug to dev |
| Backend 5xx | pos.barmagly.tech logs / uptime monitor | < 0.5% of requests | Page on-call, rollback if persistent |
| License activations | Backend admin dashboard | Track baseline | Investigate drop > 30% day-over-day |
| Stripe / TWINT failures | Stripe Dashboard → Disputes | 0 fraud disputes | Manually review any disputed charge |

### Review SLA

- **Critical (1★ + crash report):** respond within **4 hours**, ack + ETA
- **Negative (1–2★, no crash):** respond within **24 hours**
- **Neutral/Positive (3★+):** respond within **72 hours**, thank + ask for feature requests
- **Template language:** EN, DE, AR — match the reviewer's language

### Crash & ANR flow

1. Crash spike detected (Vitals or Sentry alert)
2. Triage in #incidents — assign owner within 30 min
3. Reproduce on `expo run:android --variant release`
4. Patch on `hotfix/<issue>` branch off `main`
5. Bump versionCode (8, 9, …), keep versionName 1.0.0
6. `eas build --platform android --profile production`
7. Upload to **internal track** first → smoke test → promote to **production** with **staged rollout 10% → 50% → 100%**
8. Document the fix in `play-store-release/release-notes.md`

### Hotfix release notes (template)

> **v1.0.1 (build 8)**
> - Fixed: <user-facing one-liner>
> - Improved: <if any>
> Thank you for the reports. Keep them coming at support@barmagly.tech.

### Operational alerts to set up before launch

- [ ] UptimeRobot / Better Stack monitor on `https://pos.barmagly.tech/health` (1 min interval, alert via email + WhatsApp)
- [ ] Postgres disk-usage alert at 80%
- [ ] Stripe webhook failure alert
- [ ] Daily backup verification (test restore monthly)
- [ ] Email forward `support@barmagly.tech` → on-call inbox + ticketing

---

## Section 5: iOS submission note

iOS launch is a separate track (App Store Connect ≠ Play Console). Brief checklist:

- **Apple Developer Program:** $99 USD / year — required, register under **Barmagly** legal entity (consider DUNS number if registering as organization)
- **Build:** `eas build --platform ios --profile production` (managed credentials via `eas credentials`)
- **Bundle ID:** `com.barmagly.pos` (match Android package for brand consistency)
- **App Store Connect:** create app record → upload via Transporter or `eas submit -p ios`
- **TestFlight:** internal testing (up to 100 testers, no review) → external testing (up to 10,000, requires Beta App Review, ~24h)
- **Review:** typical 24–48h, stricter than Play — expect questions on:
  - License key activation flow (Apple may ask for demo account)
  - In-app purchases vs external billing (Stripe/TWINT is allowed for **physical goods / services**, not digital — POS qualifies)
  - Camera permission usage string in `Info.plist` (must explain barcode scanning explicitly)
- **Assets needed:** 1024x1024 marketing icon (no alpha, no rounded corners), iPhone 6.7"/6.5"/5.5" screenshots, iPad 12.9" / 11" screenshots, App Privacy nutrition label (mirror `data-safety.md`)
- **Target SDK:** iOS 15.1+ minimum (Expo SDK 54 baseline)
- **First submission timeline:** budget **5–10 business days** including review iterations

Plan iOS submission for **2 weeks after Android stable production rollout** to absorb learnings from Play reviews first.