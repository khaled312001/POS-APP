const { withAndroidManifest } = require("expo/config-plugins");

/**
 * Widens the set of devices Google Play will offer this app to.
 *
 * Declaring ACCESS_FINE_LOCATION / ACCESS_COARSE_LOCATION makes Android
 * *implicitly* require android.hardware.location.gps and
 * android.hardware.location.network. Play then hides the app from every device
 * without them — most Wi-Fi-only tablets, and a fair number of budget phones.
 *
 * Location here only pre-fills a delivery address; the user can always type it.
 * Losing the whole install over a convenience feature is the wrong trade, so
 * the features are declared optional. The rest of the list is defensive: a
 * transitive dependency can add a permission later and silently narrow reach
 * again.
 */

const OPTIONAL_FEATURES = [
  "android.hardware.location",
  "android.hardware.location.gps",
  "android.hardware.location.network",
  "android.hardware.camera",
  "android.hardware.camera.any",
  "android.hardware.camera.autofocus",
  "android.hardware.telephony",
  "android.hardware.touchscreen",
  "android.hardware.wifi",
];

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

    return cfg;
  });
};
