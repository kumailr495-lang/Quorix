#!/bin/sh
# LUMIERE v5 checks. Termux: pkg install nodejs
#   logic : hall maths (seats, aisle steps, sightlines), layout (doors on walls, no overlapping rooms), the film-event director
#           (no reactions on steady sound, one scare on a real jump, cool-downs), every language covers every English key
#   bakes : every room's baked model matches the room as built (a stale bake leaves the room undrawn), and every room built from the
#           current spec matches its bake (a room not rebuilt after a spec change; python3 + numpy)
#   lint  : finds // comments that swallowed code in the dense one-line style (needs acorn once: npm i --no-save acorn; skipped if missing)
# Browser checks (desktop/cloud only, need Playwright + Chromium):
#   node tools/dev/check-world.mjs www        z-fight (coplanar overlaps) per room and per Kiln asset, navigation reachability
#   node tools/dev/shoot.mjs www <out> <shots.json>   posed screenshots + console errors
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
echo "== logic"; sh "$ROOT/tools/run-dev.sh" tools/dev/test-logic.mjs
for f in "$ROOT"/www/js/*.js "$ROOT"/www/js/lang/*.js; do node --check "$f"; done; echo "== syntax ok"
echo "== bakes"; node "$ROOT/tools/dev/check-bakes.mjs" "$ROOT/www"
# every room built from the current building.js/hallmath.js must match its bake (needs python3 + numpy; skipped where missing, e.g. Termux)
if python3 -c "import numpy" 2>/dev/null; then T="$(mktemp -d)"; node "$ROOT/tools/dev/export-spec.mjs" "$T/spec.json" >/dev/null && python3 "$ROOT/tools/blender/arch/build.py" --check --spec "$T/spec.json"; rm -rf "$T"; else echo "spec check skipped (python3 + numpy missing)"; fi
echo "== lint-comments"; cd "$ROOT" && node tools/dev/lint-comments.mjs www/js/*.js tools/kiln/build.mjs tools/dev/*.mjs
python3 "$ROOT/tools/dev/lint_comments_py.py"
