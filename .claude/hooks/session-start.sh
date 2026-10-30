#!/bin/bash
# LUMIERE cloud-session setup: installs Kiln (procedural GLB authoring, tools/kiln/) and a Kiln workspace,
# plus acorn for the comment lint, then exports KILN_WS and ACORN so `node tools/kiln/build.mjs` and `sh tools/run-tests.sh` work.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-.}"
K=tools/kiln/.kiln-install
WS=tools/kiln/.kiln-ws

# Run the install only if this script changed since the install last succeeded
hashes=$K/node_modules/.session-start.sha256
if ! sha256sum --check --status "$hashes" 2>/dev/null || [ ! -f "$WS/kiln.mjs" ]; then
  rm -f "$hashes"
  mkdir -p "$K"
  [ -f "$K/package.json" ] || printf '{ "name": "kiln-install", "private": true }\n' > "$K/package.json"
  # pinned: the version the v5.1x props were built and reviewed with
  (cd "$K" && npm install --no-audit --no-fund @instruktlabs/kiln@1.6.0 acorn@8.15.0)
  rm -rf "$WS"
  (cd "$K" && npx --offline --no -- kiln-init "../.kiln-ws" --harness claude)
  sha256sum .claude/hooks/session-start.sh > "$hashes"
fi

if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
  echo "export KILN_WS=\"$PWD/$WS\"" >> "$CLAUDE_ENV_FILE"
  echo "export ACORN=\"$PWD/$K/node_modules/acorn/dist/acorn.mjs\"" >> "$CLAUDE_ENV_FILE"
fi
