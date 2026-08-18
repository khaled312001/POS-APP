#!/usr/bin/env bash
# Lists every declaration in a merged release manifest that Google Play can use
# to hide the app from a device. Point it at the manifest gradle produced —
# both the AAB and the APK are built from this exact file.
#
#   bash scripts/dump-aab-manifest.sh /root/pos/android/app/build/intermediates/\
#     merged_manifest/release/processReleaseMainManifest/AndroidManifest.xml
M="${1:?path to merged AndroidManifest.xml}"

echo "manifest: $M  ($(wc -c < "$M") bytes)"
echo
echo "=== uses-feature (a missing required=false here hides the app) ==="
tr '>' '\n' < "$M" | grep -i "uses-feature" | sed 's/^[[:space:]]*/  /'

echo
echo "=== sdk / screens / gl (the other Play filters) ==="
tr '>' '\n' < "$M" \
  | grep -Ei "uses-sdk|supports-screens|compatible-screens|glEsVersion|uses-library" \
  | sed 's/^[[:space:]]*/  /'

echo
echo "=== permissions (each one can imply a required feature) ==="
grep -o 'android:name="android.permission.[A-Z_]*"' "$M" | sort -u | sed 's/^/  /'
