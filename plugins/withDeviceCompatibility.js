const { withAndroidManifest } = require("expo/config-plugins");

/**
 * Widens the set of devices Google Play will offer this app to.
 *
 * Two things were narrowing it, neither of them written by us:
 *
 * 1. Declaring android.permission.CAMERA makes Android *implicitly* require
 *    android.hardware.camera and android.hardware.camera.autofocus. Play then
 *    hides the app from every device without them. For a till that runs on
 *    whatever tablet the shop already owns, that is the wrong trade: the
 *    barcode scanner is one feature, not a reason to refuse the whole app.
 *    The code already handles a missing camera, so these are marked optional.
 *
 * 2. ML Kit's barcode-scanner activity ships with screenOrientation="portrait".
 *    From Android 16 large screens ignore that anyway, and Play flags it, so
 *    the attribute is stripped from the merged manifest.
 */

const OPTIONAL_FEATURES = [
  "android.hardware.camera",
  "android.hardware.camera.any",
  "android.hardware.camera.autofocus",
  "android.hardware.camera.flash",
  // Implied by ACCESS_FINE_LOCATION on some devices; a counter is not mobile.
  "android.hardware.location",
  "android.hardware.location.gps",
  "android.hardware.location.network",
  // Implied by permissions some dependency drags in.
  "android.hardware.telephony",
  "android.hardware.touchscreen",
  "android.hardware.wifi",
];

const ML_KIT_SCANNER =
  "com.google.mlkit.vision.codescanner.internal.GmsBarcodeScanningDelegateActivity";

module.exports = function withDeviceCompatibility(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;

    manifest["uses-feature"] = manifest["uses-feature"] || [];
    const existing = manifest["uses-feature"];

    for (const name of OPTIONAL_FEATURES) {
      const found = existing.find((f) => f?.$?.["android:name"] === name);
      if (found) {
        found.$["android:required"] = "false";
      } else {
        existing.push({ $: { "android:name": name, "android:required": "false" } });
      }
    }

    // tools:remove is the only way to drop an attribute a library set: the
    // activity itself belongs to ML Kit, so it cannot simply be redeclared.
    manifest.$["xmlns:tools"] = manifest.$["xmlns:tools"] || "http://schemas.android.com/tools";
    const app = manifest.application?.[0];
    if (app) {
      app.activity = app.activity || [];
      const scanner = app.activity.find((a) => a?.$?.["android:name"] === ML_KIT_SCANNER);
      if (scanner) {
        delete scanner.$["android:screenOrientation"];
        scanner.$["tools:remove"] = "android:screenOrientation";
      } else {
        app.activity.push({
          $: { "android:name": ML_KIT_SCANNER, "tools:remove": "android:screenOrientation" },
        });
      }
    }

    return cfg;
  });
};
