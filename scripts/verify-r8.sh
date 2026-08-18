#!/usr/bin/env bash
# Confirms R8 actually ran on a release build, and that it did not delete the
# entry points Android and Expo look up by name.
#
# R8 failures are silent: the build succeeds, the APK installs, and the app
# dies on launch with ClassNotFoundException. These checks are the closest
# thing to a smoke test available without a device.
APK="${1:?path to release apk}"
MAPPING="${2:-/root/pos/android/app/build/outputs/mapping/release/mapping.txt}"
DEXDUMP=/opt/android-sdk/cmdline-tools/latest/bin/apkanalyzer

echo "=== did R8 run at all? ==="
if [ -f "$MAPPING" ]; then
  echo "  mapping.txt   $(wc -l < "$MAPPING") lines, $(du -h "$MAPPING" | cut -f1)"
  echo "  renamed classes: $(grep -c ' -> ' "$MAPPING")"
else
  echo "  !! no mapping.txt -> R8 did NOT run"
fi

echo
echo "=== entry points that must survive ==="
for CLASS in \
  tech.barmagly.pos.MainActivity \
  tech.barmagly.pos.MainApplication \
  com.facebook.react.ReactApplication \
  expo.modules.ReactActivityDelegateWrapper \
  com.google.android.gms.auth.api.signin.GoogleSignIn \
  com.facebook.hermes.reactexecutor.HermesExecutor
do
  if "$DEXDUMP" dex packages --defined-only "$APK" 2>/dev/null | grep -q "${CLASS}$"; then
    echo "  OK      $CLASS"
  else
    echo "  MISSING $CLASS"
  fi
done

echo
echo "=== dex size (R8 should have reduced this) ==="
unzip -l "$APK" 2>/dev/null | grep -E "classes[0-9]*\.dex" | awk '{s+=$1; n++} END {printf "  %d dex files, %.1f MB total\n", n, s/1048576}'
