#!/usr/bin/env bash
# Prints the permissions and feature requirements of one or more APKs side by
# side, so a "did this build change what Play filters on?" question can be
# answered from the artifacts rather than from the config.
AAPT=/opt/android-sdk/build-tools/36.0.0/aapt2

for APK in "$@"; do
  echo "############ $(basename "$APK") ############"
  "$AAPT" dump badging "$APK" 2>/dev/null | grep -E "^package:" | sed 's/^/  /'
  echo "  --- permissions ---"
  "$AAPT" dump badging "$APK" 2>/dev/null | grep "^uses-permission" | sed 's/^/    /'
  echo "  --- features ---"
  "$AAPT" dump badging "$APK" 2>/dev/null | grep -E "feature" | sed 's/^/    /'
  echo
done
