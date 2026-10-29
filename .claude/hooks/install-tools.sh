#!/bin/sh
# Cloud containers start fresh each session: reinstall the CLIs that the
# code-review-graph and graphify hooks/MCP server depend on.
[ "${CLAUDE_CODE_REMOTE:-}" = "true" ] || exit 0
command -v uv >/dev/null 2>&1 || exit 0
command -v code-review-graph >/dev/null 2>&1 || uv tool install -q code-review-graph >/dev/null 2>&1
command -v graphify >/dev/null 2>&1 || uv tool install -q graphifyy >/dev/null 2>&1
exit 0
