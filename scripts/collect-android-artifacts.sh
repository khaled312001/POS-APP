#!/usr/bin/env bash
# Copies the release artifacts out of WSL and verifies them before upload.
#
#   wsl -d Ubuntu-22.04 -u root -- bash /mnt/f/POS-APP/scripts/collect-android-artifacts.sh
#
# Checks that matter for a Play upload: the package name and version code have
# to match what the Console expects, and the signing certificate has to be the
# upload key — a mismatch is rejected after the upload finishes, not before.
set -u
source /etc/profile.d/android.sh

BT="$(ls -d "$ANDROID_HOME"/build-tools/* | sort -V | tail -1)"
WIN=/mnt/f/POS-APP

copy_and_check() {
  local src_dir="$1" out_dir="$2" base="$3" keystore="$4" storepass="$5"

  mkdir -p "$out_dir"
  cp "$src_dir/bundle/release/app-release.aab" "$out_dir/$base.aab" || return 1
  cp "$src_dir/apk/release/app-release.apk"    "$out_dir/$base.apk" || return 1

  echo "=== $base"
  echo "  built:  $(date -r "$out_dir/$base.aab" '+%Y-%m-%d %H:%M')"
  echo "  aab:    $(( $(stat -c%s "$out_dir/$base.aab") / 1024 / 1024 )) MB"
  echo "  apk:    $(( $(stat -c%s "$out_dir/$base.apk") / 1024 / 1024 )) MB"
  "$BT/aapt2" dump badging "$out_dir/$base.apk" 2>/dev/null \
    | grep -E "^package:|^application-label:|^targetSdkVersion" \
    | sed 's/^/  /'

  local apk_sha ks_sha
  apk_sha="$("$BT/apksigner" verify --print-certs "$out_dir/$base.apk" 2>/dev/null \
    | grep -m1 'Signer #1 certificate SHA-256' | awk '{print $NF}')"
  ks_sha="$("$JAVA_HOME/bin/keytool" -list -v -keystore "$keystore" -storepass "$storepass" 2>/dev/null \
    | grep -m1 'SHA256:' | awk '{print $2}' | tr -d ':' | tr 'A-F' 'a-f')"

  if [ -n "$apk_sha" ] && [ "$apk_sha" = "$ks_sha" ]; then
    echo "  signing: matches the upload key ✓"
  else
    echo "  signing: MISMATCH — Play will reject this upload"
    echo "           apk      $apk_sha"
    echo "           keystore $ks_sha"
    return 1
  fi
  echo
}

fail=0
copy_and_check /root/pos/android/app/build/outputs \
  "$WIN/play-store-release" kassenta-pos-v10 \
  "$WIN/upload-keystore.jks" 2d7274cd8622745f633e30c8a9f8f3f5 || fail=1

copy_and_check /root/customer/android/app/build/outputs \
  "$WIN/customer-app/play-store" kassenta-order-v4 \
  /mnt/f/android-toolchain/customer-upload.jks a75f9cd0c7b9cf1ca65a08803aa4879c || fail=1

[ "$fail" -eq 0 ] && echo "both artifacts ready to upload" || echo "one or more checks failed"
exit "$fail"
