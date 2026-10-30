#!/bin/bash
# LUMIERE cloud-session setup (docs/SKILLS.md):
#  * Node tools in tools/kiln/.kiln-install: Kiln 1.6.0 (procedural GLB authoring, tools/kiln/) and its workspace, acorn (comment
#    lint), gltf-transform 4.5.1 (GLB inspect / validate / optimise)
#  * Blender 5.2.3 LTS in /opt (headless modelling, Cycles renders and light bakes, GLB export; the blender-web-3d skill), checksum
#    verified, plus Mesa's software OpenGL/EGL so EEVEE previews render without a GPU
#  * SciPy and headless OpenCV for the cc-blender skills' image-analysis scripts
# Exports KILN_WS, ACORN and BLENDER so `node tools/kiln/build.mjs`, `sh tools/run-tests.sh` and the Blender tools work.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-.}"
K=tools/kiln/.kiln-install
WS=tools/kiln/.kiln-ws

# Node tools: install only if this script changed since the install last succeeded
hashes=$K/node_modules/.session-start.sha256
if ! sha256sum --check --status "$hashes" 2>/dev/null || [ ! -f "$WS/kiln.mjs" ]; then
  rm -f "$hashes"
  mkdir -p "$K"
  [ -f "$K/package.json" ] || printf '{ "name": "kiln-install", "private": true }\n' > "$K/package.json"
  # pinned: Kiln is the version the v5.1x props were built and reviewed with
  (cd "$K" && npm install --no-audit --no-fund @instruktlabs/kiln@1.6.0 acorn@8.15.0 @gltf-transform/cli@4.5.1)
  rm -rf "$WS"
  (cd "$K" && npx --offline --no -- kiln-init "../.kiln-ws" --harness claude)
  sha256sum .claude/hooks/session-start.sh > "$hashes"
fi

# Blender (outside the repo; skipped when present). A failure here leaves the Node tools working.
BV=5.2.3; BDIR=/opt/blender-$BV-linux-x64; BSHA=78486c018b4443efe5e75ab54c290ed8c15abafd249b862c2c9ce2530a918eec
setup_blender() {
  if [ ! -x "$BDIR/blender" ]; then
    curl -sSfL --retry 3 --max-time 900 -o /tmp/blender.tar.xz "https://download.blender.org/release/Blender5.2/blender-$BV-linux-x64.tar.xz"
    echo "$BSHA  /tmp/blender.tar.xz" | sha256sum --check --status
    tar -xf /tmp/blender.tar.xz -C /opt
    rm -f /tmp/blender.tar.xz
  fi
  ln -sfn "$BDIR/blender" /usr/local/bin/blender
  if [ ! -e /usr/lib/x86_64-linux-gnu/libEGL.so.1 ]; then
    apt-get update -qq && apt-get install -y -qq --no-install-recommends libegl1 libgl1-mesa-dri libglx-mesa0 libegl-mesa0 > /dev/null
  fi
}
setup_blender || echo "session-start: Blender setup failed; Blender tools are unavailable this session" >&2

# Python packages for the cc-blender reference-analysis scripts (OpenCV, SciPy); numpy and Pillow are already present
python3 -c "import cv2, scipy" 2>/dev/null || pip3 install -q --break-system-packages scipy opencv-python-headless > /dev/null 2>&1 || echo "session-start: pip install of scipy/opencv failed" >&2

if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
  echo "export KILN_WS=\"$PWD/$WS\"" >> "$CLAUDE_ENV_FILE"
  echo "export ACORN=\"$PWD/$K/node_modules/acorn/dist/acorn.mjs\"" >> "$CLAUDE_ENV_FILE"
  echo "export BLENDER=\"$BDIR/blender\"" >> "$CLAUDE_ENV_FILE"
  echo "export PATH=\"$PWD/$K/node_modules/.bin:\$PATH\"" >> "$CLAUDE_ENV_FILE"
fi
