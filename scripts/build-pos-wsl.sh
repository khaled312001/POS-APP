#!/usr/bin/env bash
set -e
source /etc/profile.d/android.sh
export EXPO_PUBLIC_API_URL="https://kassenta.com"; export EXPO_PUBLIC_DOMAIN="kassenta.com"
echo "JAVA_HOME=$JAVA_HOME  ANDROID_HOME=$ANDROID_HOME"

SRC=/mnt/f/POS-APP
DST=/root/pos
KS=/mnt/f/POS-APP/upload-keystore.jks

echo "=== [1] Sync project source to Linux fs (exclude heavy/platform dirs) ==="
mkdir -p "$DST"
rsync -a --delete \
  --exclude 'node_modules' --exclude 'android' --exclude 'ios' \
  --exclude '.git' --exclude 'dist' --exclude 'server_dist' \
  --exclude 'customer-app/node_modules' --exclude 'customer-app/android' \
  --exclude 'brochure_screenshots' --exclude 'attached_assets' \
  --exclude 'backups' --exclude 'uploads' --exclude '*.aab' --exclude '*.apk' \
  "$SRC/" "$DST/"
echo "synced. size: $(du -sh $DST | cut -f1)"

echo "=== [2] npm install (Linux native) ==="
cd "$DST"
npm install --no-audit --no-fund 2>&1 | tail -3

echo "=== [3] prebuild android ==="
npx expo prebuild --platform android --clean 2>&1 | tail -5
echo "package: $(grep applicationId android/app/build.gradle | head -1)"

echo "=== [4] inject release signing ==="
cp "$KS" android/app/upload-keystore.jks
cat >> android/gradle.properties <<'PROPS'

BARMAGLY_UPLOAD_STORE_FILE=upload-keystore.jks
BARMAGLY_UPLOAD_STORE_PASSWORD=2d7274cd8622745f633e30c8a9f8f3f5
BARMAGLY_UPLOAD_KEY_ALIAS=534fe00c431cca34b5dd50b1be72b8fd
BARMAGLY_UPLOAD_KEY_PASSWORD=c1f26c4d7009713af47c2733b41f604a

# R8. Play Console flags an unoptimised app under "Technical quality".
# Expo SDK 54's template reads these exact names (see the generated
# android/app/build.gradle, `enableMinifyInReleaseBuilds` / `enableShrinkResources`).
# The older `android.enableProguardInReleaseBuilds` name no longer does anything,
# so setting it instead would look like a fix and change nothing.
android.enableMinifyInReleaseBuilds=true
android.enableShrinkResourcesInReleaseBuilds=true
PROPS
# Wire release signingConfig into app/build.gradle
python3 - <<'PY'
import re
p='android/app/build.gradle'
s=open(p).read()
s=s.replace(
"""        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
    }""",
"""        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
        release {
            if (project.hasProperty('BARMAGLY_UPLOAD_STORE_FILE')) {
                storeFile file(BARMAGLY_UPLOAD_STORE_FILE)
                storePassword BARMAGLY_UPLOAD_STORE_PASSWORD
                keyAlias BARMAGLY_UPLOAD_KEY_ALIAS
                keyPassword BARMAGLY_UPLOAD_KEY_PASSWORD
            }
        }
    }""",1)
s=s.replace("signingConfig signingConfigs.debug\n            def enableShrinkResources",
            "signingConfig project.hasProperty('BARMAGLY_UPLOAD_STORE_FILE') ? signingConfigs.release : signingConfigs.debug\n            def enableShrinkResources",1)
open(p,'w').write(s)
print('signing wired:', 'signingConfigs.release' in s)
PY

echo "=== [4b] proguard keep rules for R8 ==="
# R8 strips anything it cannot see referenced. Expo instantiates its modules by
# reflection from a generated list, React Native resolves native modules and
# view managers by name, and Play Services / ML Kit look their own internals up
# the same way. None of that is a visible reference, so without these keeps the
# build succeeds and then crashes on launch.
#
# Most of these libraries do ship consumer rules; these are deliberately
# redundant. A slightly larger APK is the right trade against a till that opens
# to a blank screen in a shop.
cat >> android/app/proguard-rules.pro <<'PRO'

# --- added by scripts/build-pos-wsl.sh ---

# Expo module registry is built by reflection over generated class names.
-keep class expo.modules.** { *; }
-keep class ** implements expo.modules.core.interfaces.Package { *; }

# React Native resolves native modules / view managers by string name.
-keep class com.facebook.react.** { *; }
-keep class com.facebook.jni.** { *; }
-keep @com.facebook.proguard.annotations.DoNotStrip class * { *; }
-keepclassmembers class * { @com.facebook.proguard.annotations.DoNotStrip *; }
-keepclassmembers class * { @com.facebook.react.uimanager.annotations.ReactProp <methods>; }

# Hermes.
-keep class com.facebook.hermes.** { *; }

# Google sign-in and the Code Scanner both reflect internally.
-keep class com.google.android.gms.** { *; }
-keep class com.google.mlkit.** { *; }
-dontwarn com.google.android.gms.**

# Our own entry points, named in the manifest.
-keep class tech.barmagly.pos.** { *; }

# Kotlin metadata is read at runtime by expo-modules-core.
-keep class kotlin.Metadata { *; }
-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod
PRO
echo "keep rules appended: $(grep -c '^-keep' android/app/proguard-rules.pro) total"

echo "=== [5] gradle build (AAB + APK) ==="
cd android
./gradlew :app:bundleRelease :app:assembleRelease --no-daemon --console=plain 2>&1 | tail -20
echo "=== outputs ==="
ls -la app/build/outputs/bundle/release/*.aab app/build/outputs/apk/release/*.apk 2>/dev/null
echo "POS_BUILD_DONE"
