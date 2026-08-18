# Kassenta Order (customer app) — versionCode 7

Built 17 Aug 2026 in WSL Ubuntu (Windows cannot build this project — MAX_PATH).

| File | Upload to | Size |
| ---- | --------- | ---- |
| `kassenta-order-v7.aab` | Google Play Console | 44 MB |
| `kassenta-order-v7.apk` | Sideload / manual testing only | 64 MB |

## What changed

The same class of bug the POS app had, from two different causes. Nothing in
the app's behaviour changed — only what Play is told about it.

**1. Location was a hard requirement.** Declaring `ACCESS_FINE_LOCATION` makes
Android *implicitly* require `android.hardware.location.gps`, and
`ACCESS_COARSE_LOCATION` requires `android.hardware.location.network`. Play
honours those and hides the listing from every device without them — most
Wi-Fi-only tablets and a lot of budget phones. Location here only pre-fills a
delivery address, which the customer can always type. Now optional.

**2. Portrait was a hard requirement.** `orientation: "portrait"` in `app.json`
puts `android:screenOrientation="portrait"` on MainActivity, and Android implies
a required `android.hardware.screen.portrait` from it. `plugins/withDeviceCompatibility.js`
now declares that feature `required="false"`.

> This does **not** let the app rotate. The activity keeps
> `screenOrientation=1` — verified in the shipped manifest below. It only stops
> Play filtering on it. Android 16 ignores orientation restrictions on large
> screens anyway, so the requirement bought nothing and cost reach.

## Verified against the shipped binary, not the config

```
package          com.barmagly.customer   versionCode 7
minSdkVersion    24  (Android 7.0)
targetSdkVersion 36  (Android 16)
native-code      arm64-v8a  armeabi-v7a  x86  x86_64
uses-feature     all 11 entries -> not-required
screenOrientation  still 1 (portrait) -> UX unchanged, as intended
signing SHA-1    9F:8D:45:96:46:AA:34:11:B7:37:EB:67:C0:AC:53:D4:FE:76:BE:9E
                 -> matches customer-upload.jks
```

Re-run on any future build:

```bash
wsl -d Ubuntu-22.04 -u root -- bash /mnt/f/POS-APP/scripts/verify-apk.sh <path-to.apk>
```

## Google sign-in

This app is a WebView over `kassenta.com/customer`, with a native bridge so the
Google account picker is drawn by Play Services in-app instead of opening a
browser. Both halves were confirmed live on 17 Aug 2026:

- `https://kassenta.com/customer/app.js` serves client ID
  `852311970344-8q8a01gm…` and carries `__KASSENTA_NATIVE__`,
  `__kassentaGoogleResult`, `isNativeApp` and `error_callback`.
- The deployed `server_dist/index.js` pins the audience:
  `googleClient.verifyIdToken({ idToken, audience: GOOGLE_WEB_CLIENT_ID })`.

Nothing server-side needs redeploying for this build.

## v6 was built and discarded

versionCode 6 was built first and verified; it fixed the location filtering but
still carried the implied portrait requirement. It was never copied out of the
build tree. Start from v7.

## Note on app.json

`android.minSdkVersion` and `android.targetSdkVersion` are **not** read by Expo
without the `expo-build-properties` plugin. The 24/36 range above is Expo SDK
54's default — wider than the values written in the file, so nothing needs
fixing, but do not trust those keys if you ever need a specific range.
