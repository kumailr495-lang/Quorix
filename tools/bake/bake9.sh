#!/bin/sh
# v9 light maps: the rooms come from the Blender architecture builder (tools/blender/arch/build.py), not from the game, then Cycles bakes
# each one (bake_room.py, unchanged) and compress.py turns the PNG maps into JPEGs.
# usage: sh tools/bake/bake9.sh [room ...]   env: SAMPLES (48), DENSITY (texels per metre, 20), THREADS (Cycles threads, 0 = all)
set -eu
cd "$(dirname "$0")/../.."
B=${BLENDER:-blender}
python3 tools/blender/arch/build.py "$@"
ROOMS=${*:-hallMax hallCurve hallClassic hall270 lobby corridor spine wc street}
for r in $ROOMS; do
  echo "== bake $r"
  "$B" --background --factory-startup -t "${THREADS:-0}" --python tools/bake/bake_room.py -- --room "tools/bake/.work/$r.json" --out www/bake \
    --samples "${SAMPLES:-48}" --density "${DENSITY:-20}" 2>&1 | grep -E '^\[bake|BAKE_DONE|Error|Traceback' || true
done
python3 tools/bake/compress.py www/bake
