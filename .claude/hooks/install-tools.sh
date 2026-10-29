#!/bin/sh
# Cloud containers start fresh each session: reinstall the CLIs that the
# code-review-graph and graphify hooks/MCP server depend on, and the Python
# creative libraries listed in CLAUDE.md.
[ "${CLAUDE_CODE_REMOTE:-}" = "true" ] || exit 0
command -v uv >/dev/null 2>&1 || exit 0
command -v code-review-graph >/dev/null 2>&1 || uv tool install -q code-review-graph >/dev/null 2>&1
command -v graphify >/dev/null 2>&1 || uv tool install -q graphifyy >/dev/null 2>&1

# Python libs take ~1 min; install in the background so startup isn't blocked.
if ! python3 -c "import playwright, imageio, skimage, cv2, trimesh, opensimplex" >/dev/null 2>&1; then
  nohup pip3 install -q playwright imageio scikit-image opencv-python-headless trimesh opensimplex \
    >/tmp/creative-libs-install.log 2>&1 &
fi
exit 0
