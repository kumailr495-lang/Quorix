#!/bin/sh
# run a dev script with `three` resolvable in Node: sh tools/run-dev.sh tools/dev/<script>.mjs [args...]
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; T="${TMPDIR:-/tmp}/lumiere-dev"; rm -rf "$T"; mkdir -p "$T/node_modules/three"
cp -r "$ROOT/www" "$T/www"; echo '{"name":"three","type":"module","main":"./three.module.js"}' > "$T/node_modules/three/package.json"; ln -s "$T/www/vendor/three.module.js" "$T/node_modules/three/three.module.js"
S="$1"; shift; cp "$ROOT/$S" "$T/script.mjs"; cd "$T"; LUM_WWW="$T/www" LUM_OUT="${LUM_OUT:-$T}" node script.mjs "$@"
