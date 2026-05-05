# Building APKs for Barmagly

This project ships **two** Android apps from the same Expo source:

| App | Audience | Entry point |
|---|---|---|
| **Barmagly POS** | Restaurant cashiers / managers | `/app/` — full POS dashboard |
| **Barmagly Customer** | Diners — order, track, chat | `/customer/` — unified SPA |

The simplest path is to wrap each entry point as a tiny WebView APK that
points at production. Below are both options.

---

## Prerequisites

1. Expo account → https://expo.dev/signup (free)
2. EAS CLI installed: `npm i -g eas-cli`
3. Authenticate: `eas login`
4. Initialize the project on EAS (one-time):
   ```bash
   eas init
   ```
   This will write a `projectId` into `app.json`.

---

## Option A — Pre-installable APK (recommended)

The `eas.json` in this repo already has `preview-pos` and `preview-customer`
profiles wired. They produce installable `.apk` files (not the Play Store `.aab`).

**POS APK** (loads the Expo POS app):
```bash
eas build --profile preview-pos --platform android
```

**Customer APK** (uses the SPA at /customer):
```bash
eas build --profile preview-customer --platform android
```

Each command takes 10–25 minutes, prints a download URL when done, and
publishes the `.apk` to https://expo.dev/accounts/<you>/projects/expo-app/builds .

> The two builds **share the same `app.json` package name** by default. If
> you want to install both APKs on the same phone, change the package
> name for one of them by adding `EXPO_PUBLIC_APP_VARIANT` handling in
> `app.json` (see step "Variant package names" below).

---

## Option B — Tiny WebView wrapper (fastest)

If you don't want native code paths and just want a "shortcut to the web
app" on the home screen, generate a TWA (Trusted Web Activity) instead:

```bash
npx @bubblewrap/cli init --manifest=https://pos.barmagly.tech/customer/manifest.json
npx @bubblewrap/cli build
```

This produces a customer APK that opens `https://pos.barmagly.tech/customer/`
full-screen and is **40 KB** instead of 30+ MB. No EAS account needed.

---

## Variant package names (so both APKs install side-by-side)

In `app.json`, replace the static android package with this snippet to
make POS and Customer install as different apps:

```jsonc
"android": {
  "package":
    process.env.EXPO_PUBLIC_APP_VARIANT === "customer"
      ? "tech.barmagly.customer"
      : "tech.barmagly.pos",
  "permissions": ["INTERNET", "VIBRATE", "ACCESS_FINE_LOCATION"]
}
```

(Expo evaluates `app.config.js` if present, so for full conditional logic
rename `app.json` → `app.config.js` and convert it to a function that
reads `process.env`.)

---

## Signing keys

EAS handles keystore generation automatically the first time you run
`eas build`. To download / inspect:

```bash
eas credentials
```

If publishing to Play Store later you must keep this keystore — losing it
means you can't ship updates.

---

## Smoke-testing the APK

1. Download the `.apk` URL EAS prints.
2. On Android: enable "Install from unknown sources" for your browser.
3. Tap the file. Install.
4. POS APK: log in with PIN. Customer APK: works as guest immediately.

---

## Troubleshooting

- **"projectId required"** → run `eas init` once.
- **"Keystore not found"** → answer "yes" when EAS asks to generate one
  during the first `eas build`.
- **Customer APK shows white screen** → it points at
  `https://pos.barmagly.tech/customer/`; ensure the server is up
  (`curl -I https://pos.barmagly.tech/customer/` should return 200).
- **APK too large (~40 MB)** → that's the Hermes JS engine + assets; size
  is normal for an Expo build. The TWA option (Bubblewrap) is much
  smaller if size matters.
