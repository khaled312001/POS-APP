# Barmagly Customer App

## What This Is

This folder contains the native shell for the **Barmagly Customer** mobile app (`com.barmagly.customer`) — the diner-facing companion to the Barmagly POS platform. It is a thin Expo SDK 54 React Native wrapper that loads the customer-facing single-page application at `https://pos.barmagly.tech/customer/` inside a hardened WebView.

End customers use this app to browse restaurant menus, place pickup and delivery orders, track deliveries in real time, view order history, chat with the restaurant, sign in with Google, and save delivery addresses. The shell provides only what a browser cannot: geolocation for delivery addresses, camera/storage access for the optional profile photo, push-notification plumbing, native splash/launch behaviour, and the dark `#070A12` / `#FF5722` orange-themed chrome that distinguishes it from the teal merchant POS.

## Architecture Decision: Why a WebView Wrapper

The customer experience is already a production-grade SPA running on `pos.barmagly.tech`. A WebView shell is the deliberate, cost-aware choice for several reasons:

- **Single source of truth.** The web app, the mobile app, and the merchant POS all consume the same backend, the same menu data, the same auth, and the same order pipeline. Rewriting the customer UI natively would duplicate every screen, every i18n string, every business rule.
- **Instant updates.** Menu changes, bug fixes, promo banners, and feature rollouts ship the moment `server/index.ts` redeploys — no store review, no forced upgrade, no version fragmentation across diners.
- **Small team, broad surface.** Customer-facing UX changes frequently (menus, checkout flows, payment integrations). The web stack iterates faster than a parallel native codebase ever could.
- **Native where it matters.** The wrapper grants exactly the native capabilities the web cannot deliver: precise geolocation, camera, push notifications, secure storage for the auth token, and Google Sign-In via the native SDK rather than an OAuth redirect dance.

This is the same architectural choice used by the merchant POS shell; the two apps differ only in the URL they load, their package id, and their theming.

## Local Development

Prerequisites: Node 20+, the Expo CLI, and an EAS account linked to the Barmagly organisation.

```bash
npm install
npx expo start
```

Scan the QR code with the Expo Go app (for quick iteration on JS-only changes) or run on a connected device / emulator:

```bash
npx expo run:android
npx expo run:ios
```

Note that Expo Go cannot exercise the Google Sign-In native module, push notifications, or any custom native config — for those, a development build is required:

```bash
eas build --profile development --platform android
```

By default the WebView points at the production SPA. To develop against a local backend, run `server/index.ts` (the same server that serves `delivery-app/customer.html`), expose it via tunnel or LAN IP, and override the `WEBVIEW_URL` constant in `app.json`'s `extra` block.

## Building for Release

Builds run on EAS Build; profiles live in `eas.json`.

**Android preview APK** — for internal testing, sideloading, or sharing a build link:

```bash
eas build --profile preview --platform android
```

**Android production AAB** — the artefact uploaded to Google Play:

```bash
eas build --profile production --platform android
```

The resulting `.aab` is downloaded into `play-store-release/` and uploaded to the Play Console (Internal testing → Closed → Production).

## Where the Actual SPA Lives

This Expo project contains **none** of the customer UI. The screens, business logic, styling, and i18n live in:

- `delivery-app/customer.html` — the SPA shell, mount point, and meta tags.
- `delivery-app/customer.app.js` — the application bundle (menu browsing, cart, checkout, tracking, chat, address management, auth).
- `server/index.ts` — serves both files under `/customer/`, alongside the merchant POS at `/`, the driver app at `/driver/`, and the shared API endpoints.

To change anything a customer sees, edit those files and redeploy the server. The mobile shell does not need to be rebuilt or resubmitted for SPA changes.

## Connection to the POS Backend

The customer app and the merchant POS share one backend and one database:

- Auth tokens are issued by the same `server/index.ts` endpoints used by the web POS.
- An order placed in this app is written to the same `orders` collection the merchant's POS reads.
- New orders surface in the merchant's POS in real time via the same socket channel the kitchen display uses.
- Menu items, availability flags, modifiers, prices, opening hours, and delivery zones are authored in the merchant POS and consumed read-only here.
- Chat messages flow through the same conversation thread the merchant sees in their POS inbox.

There is no separate customer database, no sync job, no eventual consistency layer — just one server, one Mongo instance, and two front-ends pointed at it.

## Package Coexistence

The customer app and the merchant POS are deliberately published under **different package ids** so they can be installed side-by-side on the same device (useful for restaurant owners who also order as customers, and essential for QA):

| App                | Package id              | Theme accent | URL loaded                              |
| ------------------ | ----------------------- | ------------ | --------------------------------------- |
| Barmagly POS       | `com.barmagly.pos`      | Teal         | `https://pos.barmagly.tech/`            |
| Barmagly Customer  | `com.barmagly.customer` | Orange       | `https://pos.barmagly.tech/customer/`   |
| Barmagly Driver    | `com.barmagly.driver`   | (driver)     | `https://pos.barmagly.tech/driver/`     |

Because the package ids differ, each app has its own Play Console listing, its own signing key, its own crash reporting, and its own install/uninstall lifecycle.

## Versioning and Updates

Version bumps are handled automatically by EAS Build. In `eas.json`, the production profile sets `"autoIncrement": true`, which increments the Android `versionCode` on every production build. The human-readable `version` string in `app.json` is bumped manually when shipping a release worth flagging (typically a minor or major change).

Because the SPA is served from the web, the vast majority of "updates" reach customers without any new APK or AAB — only changes that touch the native shell (new permissions, new native modules, Expo SDK upgrades, splash/icon assets, or the bundled JS that wraps the WebView) require a new store submission.

## Keystore Note

The Android upload keystore is generated by EAS the **first time** a production build runs for `com.barmagly.customer`, and is then stored in the EAS project credentials. Subsequent builds reuse it automatically — do not regenerate it, and do not check it into the repo. Losing the keystore means losing the ability to ship updates to the same Play Store listing, so if you ever need to rotate or back it up, use `eas credentials` to download and store it somewhere durable (a password manager or the team's secrets vault).

The customer app's keystore is **distinct** from the POS app's keystore — they sign different artefacts under different package ids.

## iOS Submission (Later)

The shell is already Expo-managed and iOS-compatible; an iOS build is gated on Apple Developer Program enrolment and a few Info.plist privacy strings (camera, photo library, location-when-in-use) that are already declared in `app.json`. When the time comes:

```bash
eas build --profile production --platform ios
eas submit --platform ios
```

EAS will provision the iOS distribution certificate and provisioning profile on first run, in the same way it handled the Android keystore. The same WebView, the same SPA, and the same backend serve the iOS build with no code changes.