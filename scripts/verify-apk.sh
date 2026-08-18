#!/usr/bin/env bash
# Opens a shipped APK and reports what decides Play acceptance and reach.
APK="$1"
AAPT=/opt/android-sdk/build-tools/36.0.0/aapt2
SIGNER=/opt/android-sdk/build-tools/36.0.0/apksigner

echo "=== file ==="
ls -la "$APK"

echo
echo "=== identity + sdk range ==="
"$AAPT" dump badging "$APK" 2>/dev/null | grep -Ei "^package:|sdkversion|^native-code"

echo
echo "=== device filtering (what Play reads) ==="
"$AAPT" dump badging "$APK" 2>/dev/null | grep -Ei "feature" | sort

echo
echo "=== orientation locks (-1 = unspecified, 1 = portrait, 0 = landscape) ==="
"$AAPT" dump xmltree "$APK" --file AndroidManifest.xml 2>/dev/null \
  | grep "screenOrientation" | sort | uniq -c

echo
echo "=== signing certificate ==="
"$SIGNER" verify --print-certs "$APK" 2>/dev/null | grep -Ei "SHA-1|certificate DN"
