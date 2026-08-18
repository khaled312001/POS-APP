# The missing Install button — what was actually wrong

## Correction to the earlier diagnosis

I first said the camera permission was filtering devices. That was wrong, and
comparing the two artifacts side by side is what showed it. `android.permission.CAMERA`
is not in the built manifest at all — the POS scans barcodes through Play
Services' Google Code Scanner, which runs in *its own* process and does not
require this app to hold the permission.

The real filters in **v11**, read out of `kassenta-pos-v11.apk`:

```
uses-feature: android.hardware.location
  reason: requested ACCESS_COARSE_LOCATION, and requested ACCESS_FINE_LOCATION
uses-feature: android.hardware.screen.portrait
  reason: one or more activities have specified a portrait orientation
```

Both were **required**. Play honours that literally:

- `android.hardware.location` excludes every device without location hardware —
  most Wi-Fi-only tablets, which is exactly the hardware a shop puts on a
  counter.
- `android.hardware.screen.portrait` excludes devices that cannot present a
  portrait screen.

Neither permission was written by us. They arrive through a dependency, and
Android converts them into hard hardware requirements silently.

**v12 requires nothing.** Verified from the shipped APK:

```
uses-feature-not-required: android.hardware.camera
uses-feature-not-required: android.hardware.camera.any
uses-feature-not-required: android.hardware.camera.autofocus
uses-feature-not-required: android.hardware.camera.flash
uses-feature-not-required: android.hardware.location
uses-feature-not-required: android.hardware.location.gps
uses-feature-not-required: android.hardware.location.network
uses-feature-not-required: android.hardware.telephony
uses-feature-not-required: android.hardware.touchscreen
uses-feature-not-required: android.hardware.wifi
```

and `screen.portrait` is gone entirely, because the plugin strips the portrait
lock from ML Kit's scanner activity.

Reproduce the comparison at any time:

```bash
wsl -d Ubuntu-22.04 -u root -- bash /mnt/f/POS-APP/scripts/compare-apk.sh \
  /mnt/f/POS-APP/play-store-release/kassenta-pos-v11.apk \
  /mnt/f/POS-APP/play-store-release/v12/kassenta-pos-v12.apk
```

## Why the button can still be missing after uploading v12

Checked from outside on 17 Aug 2026 — the listing itself is healthy:

- `play.google.com/store/apps/details?id=tech.barmagly.pos` returns 200 and
  renders an Install button.
- "Updated on Aug 17, 2026".
- Same result with `gl=CH`, `EG`, `DE`, `US`, `AE`, `SA` — so this is **not** a
  country restriction.

So the listing is published. What remains is which *binary* Play is serving to
your device, and that is decided in two places only you can see:

### 1. Release status — Production → Releases

If the v12 release says **In review** rather than **Available on Google Play**,
Play is still serving **v11** to devices. v11 filters on location and portrait,
so the button stays missing until review finishes. This is the explanation that
best fits "uploaded, published, still no button".

Review for an app that was previously rejected typically takes longer than a
routine update.

### 2. Device catalog — Reach and devices → Device catalog

Switch the version selector to **12** and read "supported devices". Compare it
with **11**.

- v12 much higher than v11 -> the fix landed; what you are seeing is the Play
  Store app on your device caching the old verdict. On the device: Settings →
  Apps → Google Play Store → Storage → Clear cache, then reopen the listing.
  The catalog also takes a few hours to propagate.
- v12 the same as v11 -> the filter is somewhere I have not looked, and the
  Device catalog page will name the excluded device and the reason. Send me
  that reason and I will fix it.

### 3. Trivial causes worth ruling out first

- The app is already installed on that device — the button reads **Open** or
  **Update**, not Install.
- The Google account on the device is a tester on a closed track, so Play offers
  the test build instead of production.

## The two Console recommendations

Neither one hides the Install button. They are advisory: "User experience" and
"Technical quality" notes never gate availability.

**Edge-to-edge deprecated APIs — cannot be fixed from this codebase.** Every
listed call is inside a library:

```
com.facebook.react.modules.statusbar.StatusBarModule    React Native
com.facebook.react.views.view.WindowUtilKt              React Native
com.google.android.material.bottomsheet.BottomSheetDialog   Material Components
com.google.android.material.internal.EdgeToEdgeUtils        Material Components
com.google.android.material.sidesheet.SheetDialog           Material Components
com.swmansion.rnscreens.ScreenWindowTraits              react-native-screens
expo.modules.imagepicker.ExpoCropImageUtils             expo-image-picker
```

Our own code makes none of these calls — searched for `StatusBar`,
`setBackgroundColor` and `NavigationBar` across `app/`, `components/` and
`lib/`, with no hits. `edgeToEdgeEnabled=true` is already set in the generated
`gradle.properties`. Clearing this note requires new upstream releases of React
Native, Material Components, react-native-screens and expo-image-picker.

**R8 — fixed in v13.** It was genuinely off. Expo SDK 54's template reads
`android.enableMinifyInReleaseBuilds` and `android.enableShrinkResourcesInReleaseBuilds`,
and neither was set. Note that the older `android.enableProguardInReleaseBuilds`
name no longer does anything in SDK 54 — setting that one looks like a fix and
changes nothing.

Both are now set in `scripts/build-pos-wsl.sh`, along with keep rules for the
reflection-driven parts (Expo's module registry, React Native's name-based
module resolution, Play Services, ML Kit, Kotlin metadata).

> **R8 must be tested on a device before you promote v13.** R8 removes code it
> cannot see referenced; anything resolved by reflection can vanish and the
> build still succeeds. There is no emulator or attached device here, so I could
> only verify v13 statically. Sideload `kassenta-pos-v13.apk`, then exercise:
> open a till and take a payment, scan a barcode, sign in with Google, and pick
> a product image. If any of those crash, tell me which and I will add the keep
> rule — or we ship v13 with R8 off, since it is only a recommendation.
