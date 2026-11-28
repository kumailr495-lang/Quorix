# LUMIERE v5.11
A first-person cinema for Android: a static three.js app (`www/`) in a WebView wrapper APK.

What's in it:
- A warm modern-deco lobby (tickets, bar-café, snacks), a concourse, two passages and three screens: Standard, Curved Premium
  with recliners, and a giant screen.
- Props modelled with Kiln, textured with a generated PBR material library, lit with baked light and room reflections.
- People with animation, staff who serve and guide you, audiences that react to the film; house films or your own video.
- English, हिन्दी, اردو, Español.

Where to look:
- **What changed, how it was tested, limitations, rollback:** `docs/V5-RELEASE-NOTES.md`.
- **Why it looks the way it does:** `docs/V5-ART-DIRECTION.md`; hall maths: `docs/V5-DESIGN.md`.
- **Phone checklist and Termux build:** `docs/BUILD-PLAN.md`.
- **Working on the code:** read `CLAUDE.md` first.

Quick commands:
- `sh tools/run-tests.sh`: Node checks (logic, syntax, comment lint).
- `node tools/dev/check-world.mjs www`: z-fighting and navigation check in headless Chromium (desktop/cloud only).
- `python tools/make-apk.py lumiere-v4.apk www out.apk 512 5.12`: repack and sign.
- `python -m http.server 3000 -d www`, then open http://127.0.0.1:3000/index.html?play=1 in a browser.

Screenshots in `docs/screens-v5/` are real engine renders from headless Chromium with SwiftShader (a software GPU), not phone captures.
