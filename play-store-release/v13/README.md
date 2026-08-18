# Kassenta POS — versionCode 13

Built 17 Aug 2026 in WSL Ubuntu via `scripts/build-pos-wsl.sh`.

| File | Upload to | Size |
| ---- | --------- | ---- |
| `kassenta-pos-v13.aab` | Google Play Console | 70 MB |
| `kassenta-pos-v13.apk` | **Sideload and test this before promoting the AAB** | 106 MB |
| `mapping-v13.txt` | Nothing — kept only as a local copy | 38 MB |

## What changed from v12

Only one thing: **R8 is enabled.** Everything about device compatibility is
identical to v12 — same ten optional features, no orientation lock, same upload
signature.

Play Console flagged the app under "Technical quality" as not optimised. It was
genuinely off. Expo SDK 54's template reads these two property names:

```
android.enableMinifyInReleaseBuilds=true
android.enableShrinkResourcesInReleaseBuilds=true
```

Neither was set. Worth knowing: the older `android.enableProguardInReleaseBuilds`
name no longer does anything in SDK 54 — setting *that* one looks like a fix and
changes nothing.

### Result

```
dex     v11  4 files, 27.5 MB
        v12  4 files, 27.5 MB
        v13  2 files, 13.7 MB      <- half
apk     v12  116.6 MB  ->  v13  111.2 MB
aab     v12   74.0 MB  ->  v13   73.0 MB
```

The AAB carries `BUNDLE-METADATA/com.android.tools.build.obfuscation/proguard.map`,
so Play deobfuscates crash reports on its own. Do not upload the mapping by hand.

## Verified against the shipped binary

```
package          tech.barmagly.pos   versionCode 13
minSdkVersion    24  (Android 7.0)
targetSdkVersion 36  (Android 16)
native-code      arm64-v8a  armeabi-v7a  x86  x86_64
uses-feature     all 10 entries -> not-required
screenOrientation  one entry, value -1 (unspecified)
signing SHA-1    BE:C5:EA:81:78:22:08:61:43:65:B5:84:3B:25:18:0B:54:77:2E:B8
                 -> matches upload-keystore.jks

R8 ran          mapping.txt 427,403 lines / 360,922 renamed classes
entry points    MainActivity, MainApplication, ReactApplication,
                ReactActivityDelegateWrapper, GoogleSignIn, HermesExecutor
                -- all present in the dex after shrinking
```

Reproduce:

```bash
wsl -d Ubuntu-22.04 -u root -- bash /mnt/f/POS-APP/scripts/verify-apk.sh <apk>
wsl -d Ubuntu-22.04 -u root -- bash /mnt/f/POS-APP/scripts/verify-r8.sh  <apk>
```

## Test this on a device before promoting it

This is the one thing about v13 that is not settled by inspection.

R8 deletes code it cannot see referenced. Expo builds its module registry by
reflection, React Native resolves native modules and view managers by string
name, and Play Services and ML Kit look up their own internals the same way.
None of that is a visible reference. When R8 gets it wrong the build still
succeeds, the APK still installs, and the app dies on launch.

`scripts/build-pos-wsl.sh` appends 15 keep rules covering `expo.modules.**`,
`com.facebook.react.**`, Hermes, `com.google.android.gms.**`, `com.google.mlkit.**`,
`tech.barmagly.pos.**` and Kotlin metadata, and the six entry points above were
confirmed present in the shrunk dex. That is good evidence, not proof — there
is no attached device or emulator on this machine, so nothing was ever launched.

Sideload `kassenta-pos-v13.apk` and exercise:

- [ ] app opens past the splash screen
- [ ] licence-key activation
- [ ] Google sign-in
- [ ] open a till, add items, take a payment
- [ ] scan a barcode
- [ ] pick a product image from the gallery

If one of them crashes, the missing class name is in the logcat stack trace —
send it and the keep rule is a one-line fix. If you would rather not spend the
time, upload **v12** instead: it is identical apart from R8, and R8 is only a
recommendation, never a requirement.

## What v13 does not fix

The **edge-to-edge deprecation** notice stays. Every call Play listed comes from
inside a library — React Native's `StatusBarModule` and `WindowUtilKt`, Material
Components' `BottomSheetDialog` / `EdgeToEdgeUtils` / `SheetDialog`,
`react-native-screens`' `ScreenWindowTraits`, and `expo-image-picker`'s
`ExpoCropImageUtils`. Our own code makes none of them, and `edgeToEdgeEnabled=true`
is already set. It clears when those libraries ship updates, not before.

It is a "User experience" advisory. It does not gate release or availability.

## Still open

Whether the Install button returns is **not** answered by this build — see
[`../v12/WHY_NO_INSTALL_BUTTON.md`](../v12/WHY_NO_INSTALL_BUTTON.md). The two
Console pages named there (release status, and the Device catalog count for 11
vs 12) are what settle it.
