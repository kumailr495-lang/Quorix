#!/bin/sh
# LUMIERE v5 checks. Termux: pkg install nodejs
#   logic : hall maths (seats, aisle steps, sightlines), layout (doors on walls, no overlapping rooms), the film-event director
#           (no reactions on steady sound, one scare on a real jump, cool-downs), every language covers every English key
#   lint  : finds // comments that swallowed code in the dense one-line style (needs acorn once: npm i --no-save acorn; skipped if missing)
# Browser checks (desktop/cloud only, need Playwright + Chromium):
#   node tools/dev/check-world.mjs www        z-fight (coplanar overlaps) per room and per Kiln asset, navigation reachability
#   node tools/dev/shoot.mjs www <out> <shots.json>   posed screenshots + console errors
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
echo "== logic"; sh "$ROOT/tools/run-dev.sh" tools/dev/test-logic.mjs
for f in "$ROOT"/www/js/*.js "$ROOT"/www/js/lang/*.js; do node --check "$f"; done; echo "== syntax ok"
echo "== lint-comments"; cd "$ROOT" && node tools/dev/lint-comments.mjs www/js/*.js tools/kiln/build.mjs tools/dev/*.mjs
