#!/bin/sh
# Light-map pipeline, all steps (tools/bake/README.md): export rooms from the game, bake each in Blender Cycles, write www/bake/.
# usage: sh tools/bake/bake-all.sh [room ...]      (cloud session: needs Playwright and Blender; not Termux)
# env: SAMPLES (default 96), DENSITY (texels per metre, default 22)
set -eu
cd "$(dirname "$0")/../.."
B=${BLENDER:-blender}
node tools/bake/export.mjs "$@"
ROOMS=${*:-$(ls tools/bake/.work/*.json | xargs -n1 basename | sed 's/\.json$//')}
for r in $ROOMS; do
  echo "== bake $r"
  "$B" --background --factory-startup --python tools/bake/bake_room.py -- --room "tools/bake/.work/$r.json" --out www/bake \
    --samples "${SAMPLES:-96}" --density "${DENSITY:-22}" 2>&1 | grep -E '^\[bake|BAKE_DONE|Error|Traceback' || true
done
ls -la www/bake
