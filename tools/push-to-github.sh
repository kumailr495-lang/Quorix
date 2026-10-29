#!/data/data/com.termux/files/usr/bin/sh
# One-time: push this folder to a NEW EMPTY GitHub repo from Termux.
# usage: sh tools/push-to-github.sh https://github.com/<you>/lumiere.git
set -e
[ -n "$1" ] || { echo "usage: sh tools/push-to-github.sh <repo-url>"; exit 1; }
command -v git >/dev/null || pkg install -y git
git init -q 2>/dev/null || true
git add -A && git commit -qm "LUMIERE v4 handoff from claude.ai" || true
git branch -M main
git remote remove origin 2>/dev/null || true
git remote add origin "$1"
git push -u origin main
