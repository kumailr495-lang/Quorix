#!/bin/sh
# LUMIERE v11 - the z-fighting gate (the user, 2026-11-15: "i wont accept z FIGHTNING"). Cloud only: needs Playwright and Blender.
#   1. the real engine writes every eye point a player can reach (seated, on the escalators, in the lift, the taxi) and its own meshes
#      (props, panels, signs, the lift, doors, gates, escalators, seats) as world triangles
#   2. Blender builds every room from spec.json, finds every pair of same-facing faces under 5 mm apart (coplanar.py) and keeps those a
#      player can see (BVH ray casts to the eye points; glass is see-through), for the rooms and for the engine's meshes
# usage: sh tools/dev/zcheck.sh [OUT_DIR]   (exit 1 when a visible pair under 2 mm is left; OUT_DIR/z.json lists every pair)
set -eu
cd "$(dirname "$0")/../.."
OUT=${1:-/tmp/lumiere-zcheck}; B=${BLENDER:-blender}; mkdir -p "$OUT"
node tools/dev/export-spec.mjs > /dev/null
node tools/dev/seethru.mjs "$OUT" --no-static --step 1.0 --dump-points "$OUT/eyes.json"
node tools/dev/seethru.mjs "$OUT" --no-static --grid --dump-tris "$OUT/engine.json"
"$B" --background --factory-startup --python tools/blender/arch/zcheck.py -- --eyes "$OUT/eyes.json" --engine "$OUT/engine.json" --json "$OUT/z.json" \
  2>&1 | grep -vE '^(Blender|Read |$)'
