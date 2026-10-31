#!/bin/sh
# LUMIERE v8: build the wrapper's base APK (code, manifest, icon; no game files) from tools/android. make-apk.py then adds www/ and signs.
#   sh tools/android/build.sh BUILD_TOOLS_DIR ANDROID_JAR OUT_BASE.apk
# Needs a JDK (javac) and Android build-tools 35 + platform 35 (android.jar) from https://dl.google.com/android/repository/
set -e
BT=$1; JAR=$2; OUT=$3; D=$(cd "$(dirname "$0")" && pwd); W=$(mktemp -d)
mkdir -p "$W/classes"
javac -source 8 -target 8 -bootclasspath "$JAR" -classpath "$JAR" -encoding UTF-8 -nowarn -Xlint:-options -d "$W/classes" $(find "$D/src" -name '*.java')
"$BT/d8" --release --min-api 26 --lib "$JAR" --output "$W" $(find "$W/classes" -name '*.class')
"$BT/aapt2" compile --dir "$D/res" -o "$W/res.zip"
"$BT/aapt2" link -o "$W/base.apk" -I "$JAR" --manifest "$D/AndroidManifest.xml" "$W/res.zip" --min-sdk-version 26 --target-sdk-version 35
(cd "$W" && zip -q base.apk classes.dex)
cp "$W/base.apk" "$OUT"; rm -rf "$W"; echo "base wrapper: $OUT"
