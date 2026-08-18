# Kassenta POS — versionCode 12

Built 17 Aug 2026 in WSL Ubuntu (Windows cannot build this project — MAX_PATH).

| File | Upload to | Size |
| ---- | --------- | ---- |
| `kassenta-pos-v12.aab` | Google Play Console | 71 MB |
| `kassenta-pos-v12.apk` | Sideload / manual testing only | 111 MB |

## What changed in this build

The install button was not appearing on Play even though the release was in
production. The release was fine; the manifest was quietly excluding devices.

Declaring `android.permission.CAMERA` makes Android **implicitly** add a *hard*
requirement for `android.hardware.camera` and `android.hardware.camera.autofocus`.
Play honours that and hides the listing from every device without them. For a
till that runs on whatever tablet the shop already owns, that is the wrong
trade — barcode scanning is one feature, not a reason to refuse the whole app.
The code already handles a missing camera.

`plugins/withDeviceCompatibility.js` now declares those features, and every
other implied one, as `required="false"`. It also strips the
`screenOrientation="portrait"` that ML Kit's barcode-scanner activity ships
with, which Android 16 ignores on large screens and Play flags.

## Verified against the shipped binary, not the config

```
package         tech.barmagly.pos   versionCode 12
minSdkVersion   24  (Android 7.0)
targetSdkVersion 36 (Android 16)
native-code     arm64-v8a  armeabi-v7a  x86  x86_64
uses-feature    all 10 entries -> not-required
screenOrientation  one entry in the whole manifest, value -1 (unspecified)
signing SHA-1   BE:C5:EA:81:78:22:08:61:43:65:B5:84:3B:25:18:0B:54:77:2E:B8
                -> matches upload-keystore.jks
```

Re-run that check on any future build with:

```bash
wsl -d Ubuntu-22.04 -u root -- bash /mnt/f/POS-APP/verify_apk.sh <path-to.apk>
```

## Note on app.json

`android.minSdkVersion` and `android.targetSdkVersion` in `app.json` are **not**
read by Expo without the `expo-build-properties` plugin. The 24/36 range above
is Expo SDK 54's default. It is wider than the values in the file, so nothing
needs fixing — but do not trust those keys if you ever need a specific range.

## Still needs doing by hand in Play Console

The sign-in details on the app content form have to be corrected and the
release resubmitted. Reviewers could not get past the licence-key gate.
