# LUMIERE v4.00
A first-person art-deco cinema for Android: a static three.js app (`www/`) in a WebView wrapper APK.

What's in it:
- A lobby, a corridor, two wings and three halls (386 seats).
- 9 animated characters with crowd AI.
- House films, or your own video, with procedural sound.

Where to look:
- **What changed, how it was tested, limitations, rollback:** `docs/V4-RELEASE-NOTES.md`.
- **Phone checklist and Termux build:** `docs/BUILD-PLAN.md`.
- **Working on the code:** read `CLAUDE.md` first.

Quick commands:
- `sh tools/run-tests.sh`: headless checks (Node only).
- `python tools/make-apk.py lumiere-v4.apk www out.apk 401 4.01`: repack and sign.
- `python -m http.server 3000 -d www`, then open http://127.0.0.1:3000/index.html?spawn=hall in a browser.

Screenshots in `docs/screens-v4/` are real engine renders from headless Chromium with SwiftShader (a software GPU), not phone captures.
