#!/bin/sh
# LUMIERE v4 headless checks (no GPU needed). Termux: pkg install nodejs
#   world  : builds all 7 rooms from the real GLBs, counts triangles / draw calls per view, checks every seat and door is reachable
#   crowd  : 6 simulated minutes of NPC life - arrivals, film, usher guiding, applause, leaving; NaN / stuck / off-grid checks
#   npc    : loads a skinned character GLB, poses it, checks every skinned vertex is finite
#   lint   : flags // comments that swallowed code (the v4 bug class)
#   shader : patches the vendored three.js Lambert shader with the LUMIERE materials and sanity-checks the result
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
for t in test-world4 test-crowd test-npc test-shader; do echo "== $t"; sh "$ROOT/tools/run-dev.sh" "tools/dev/$t.mjs"; done
# comments that swallowed code (needs acorn once: npm i --no-save acorn ; skipped if missing)
echo "== lint-comments"; cd "$ROOT" && node tools/dev/lint-comments.mjs www/js/*.js tools/*.js tools/lib/*.js tools/models/*.js tools/dev/*.mjs
