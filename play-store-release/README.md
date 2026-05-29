# Barmagly POS — Google Play Release Package

**Version:** 1.0.0 (build 7)
**Package:** `com.barmagly.pos`
**Generated:** 2026-05-29
**Status:** ✅ Ready to upload

---

## 📦 What's in this folder

```
play-store-release/
├── barmagly-pos-1.0.0-7.aab              ← 74 MB | Upload this to Play Console
├── play-store-icon-512x512.png           ← App icon (Play Console "Main store listing")
├── play-store-feature-graphic-1024x500.png ← Feature graphic
├── screenshots/
│   ├── phone/        (8 PNGs, 1920×1080)  ← Phone screenshots
│   ├── tablet7/      (8 PNGs, 2400×1350)  ← 7-inch tablet screenshots
│   └── tablet10/     (8 PNGs, 2880×1620)  ← 10-inch tablet screenshots
│
├── listing-en.txt              ← English store listing (name, short desc, full desc)
├── listing-ar.txt              ← Arabic store listing
├── privacy-policy.html         ← Standalone HTML — host at https://barmagly.tech/privacy
├── data-safety.md              ← Fill-in answers for Data Safety form
├── content-rating.md           ← Fill-in answers for IARC questionnaire
├── release-notes.md            ← Release notes in EN/DE/AR/FR (ready to paste)
├── publishing-guide.md         ← Complete step-by-step Play Console walkthrough
├── pre-launch-checklist.md     ← Verify-before-submit checklist
└── README.md                   ← This file
```

---

## 🚀 Quick start (3 steps)

### 1. Host the privacy policy
Upload `privacy-policy.html` to your site so it's reachable at:
```
https://barmagly.tech/privacy
```
Google Play **will reject** submission without a live privacy URL.

### 2. Upload `.aab` to Internal Testing
On the screen you already have open in Play Console:
- Click **Upload** → choose `barmagly-pos-1.0.0-7.aab`
- **Release name:** `1.0.0 (7)`
- **Release notes:** copy from `release-notes.md`
- Click **Next** → **Save and publish**

### 3. Fill the "Set up your app" tiles
Use the prepared docs to fill each tile in Play Console:

| Play Console tile | Use this file |
|---|---|
| App access | See `publishing-guide.md` → Phase 3 (demo credentials) |
| Ads | "No, my app does not contain ads" |
| Content rating | `content-rating.md` |
| Target audience | 18+ (business users) |
| Data safety | `data-safety.md` |
| Store listing → Short/Full description | `listing-en.txt` |
| Store listing → Graphics | `play-store-icon-512x512.png`, `play-store-feature-graphic-1024x500.png` |
| Store listing → Screenshots | All 24 files from `screenshots/` |
| Store listing → Privacy policy | `https://barmagly.tech/privacy` |

Then follow `publishing-guide.md` end-to-end for the full walkthrough.

---

## ✅ Verification — confirmed before delivery

- [x] `.aab` downloaded from EAS build 7 — 74 MB, SHA matches keystore Build Credentials Zi1XH54I_3
- [x] App icon present at 512×512 (Google's required size)
- [x] Feature graphic present at 1024×500 (Google's required size)
- [x] 8 phone screenshots — real authenticated UI (POS, cart, checkout, products, customers, reports, online orders, settings)
- [x] 8 tablet 7" screenshots — same content, larger resolution
- [x] 8 tablet 10" screenshots — same content, largest resolution
- [x] All screenshots in 16:9 aspect ratio (within Play Store's 9:16 ↔ 16:9 range)
- [x] All 8 documents generated and saved
- [x] Privacy policy is full standalone HTML (no placeholders)
- [x] Release notes in 4 languages (EN, DE, AR, FR)

---

## ⚠️ What still requires manual work (only YOU can do these)

These need to happen in the **Google Play Console web UI** (no API access):

1. **Host the privacy policy HTML** at `https://barmagly.tech/privacy` and verify it returns HTTP 200.
2. **Click through the Play Console tiles** using the prepared answers above.
3. **Submit for review** — first review takes 1–7 days.
4. **Respond to any review feedback** if Google flags something.

---

## 🔁 Updating the app later

For the next version (e.g. 1.0.1):

```powershell
# 1. Make code changes, commit
# 2. Build (versionCode auto-increments via eas.json)
npx eas-cli build --profile production --platform android

# 3. Either auto-submit:
npx eas-cli submit --profile production --platform android
# (requires Google Service Account JSON — see publishing-guide.md Phase 6)

# 4. Or download new .aab and upload manually
```

---

## 📞 Support

- App questions: support@barmagly.tech
- Privacy questions: privacy@barmagly.tech
- Website: https://barmagly.tech
