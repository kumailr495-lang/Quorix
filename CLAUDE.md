# LUMIERE: handoff brief for Claude Code

Read this whole file before doing anything.

## What this is
LUMIERE is a first-person 3D cinema for Android (package `com.buddyapps.lumiere`): a static three.js app (`www/`) shipped
inside a small WebView wrapper APK. The player walks a lobby, a concourse, two passages and three screens, talks to staff,
books a seat, and watches a house film or **their own video** (gallery file or link) among an audience that reacts.

## The user
- Works **only on an Android phone** with Termux. Anything they must run has to work in Termux; give exact commands.
- Wants premium, genuine results: realistic models, a lobby that feels like a real modern cinema (not an airport, not medieval),
  premium game UI (not a website), smart NPCs, crowd reactions at the right moments, smooth transitions.
- **List fresh ideas before implementing new features**, so they can approve them. Research thoroughly first.
- Expects you to use the available skills, connectors and plugins (Kiln, Figma, Firecrawl search, design skills).
- Every deliverable states exact changes, validation performed, limitations, and a rollback path.
- Never claim device, APK-install, audio or in-game tests passed without evidence. Headless Chromium + SwiftShader
  renders are the real engine on a software GPU: say so; they are not the phone.
- Never ask them to pay for a service. The Figma Starter plan has a small MCP call limit (it ran out during v5.1).
- Terse replies preferred: short sentences, results first.

## History
1. v3/v4: SDF-modelled GLBs, art-deco. Feedback on v4 (18 screenshots): z-fighting, spooky/medieval, no NPC walk/sit
   animation, cheap lighting, bad UI, no menu, wrong cinema architecture, no languages. See `docs/V4-RELEASE-NOTES.md`.
2. v5.00: rebuilt engine (computed hall geometry, baked vertex light, new crowd AI, sound, i18n, UI). Never shipped.
3. v5.00 screenshots were judged "airport / jail, flat models, website UI". v5.10 answers that: researched art direction,
   Kiln-modelled props, textured PBR material library, Noir & Brass UI. **v5.10 has not been installed on the phone yet.**

## Architecture
### `www/js/`
- **Engine and look**
  - `engine.js`: renderer (stencil:true for 24-bit depth), presets low/medium/high, resolution governor, FOV zoom when seated.
  - `library.js`: material library. `MAT` ids -> texture set (`www/tex/<tex>_a.jpg` albedo, `_n.jpg` normal), metres per tile,
    roughness, metalness, sheen, reflection strength. `NAMED` maps Kiln material names (`velvet_teal`, `walnut`, `brass`...) to ids + tints.
    'rel' textures are mid-grey detail times the vertex tint x2; 'abs' textures carry their own colours.
  - `materials.js`: `litMat(U, id, inst)` is the main shader: albedo + normal map (derivative TBN), baked light, per-room cube
    reflection (textureLod by roughness, scaled by local light), velvet sheen. Defines `USE_NMAP`, `USE_ENV` (off on Low).
    Also glow, textured panels (posters/signs), picture, glass, people, hand props, instanced far crowd.
  - `geom.js`: `Acc` vertex soup with world-planar metre UVs (or the mesh's own UVs with `uv: 'mesh'`); `toGeometry` sorts
    triangles into one group per material id (one draw each). `room.js`: rooms with walls as inward panels, kits, panels.
  - `bake.js`: per-vertex house / fixed / screen light, AO heuristics, contact shadows, light probes.
  - `assets.js`: loads Kiln GLBs (`ASSET_LIST`), `placeAsset(room, name, x, y, z, yaw, opts)` stamps an asset into a room
    (Kiln +X becomes engine +Z), `assetGeometry` builds instancing geometry (hall seats and arms, two LODs).
  - `world.js`: builds rooms, bakes, sliding doors, nav grid, visibility, `captureReflections` (one 128 px cube per room).
- **Building**: `hallmath.js` (UNIC auditorium maths), `layout.js`, `build-lobby.js` (lobby, concourse, street),
  `build-passages.js`, `build-halls.js` (themes per screen, instanced seats/arms, curtains, screen, rails), `props.js` (older box kits
  still used for small items), `textures.js` (posters, signs, neon, menus, facades).
- **People**: `characters.js`, `faces.js`, `anim.js`, `npc.js` (staff, guests, usher guiding, audiences, instanced far crowd),
  `react.js` (film-event director), `dialogue.js`, `talk.js` (subtitle bar + bubbles).
- **Shows, sound, UI**: `film.js`, `films.js`, `sound.js`, `ui.js` (menu, HUD, 3-step booking, ticket, tabbed settings),
  `i18n.js` + `lang/{en,es,hi,ur}.js`, `settings.js`, `player.js`, `main.js` (boot, frame loop, debug handle `window.__lumiere`).
- **CSS**: `www/css/app.css` holds the Noir & Brass tokens. Fonts in `www/fonts/` (Inter, Cormorant Garamond; OFL).

### `tools/`
- `kiln/*.kiln.js` + `kiln/build.mjs`: prop sources for Kiln (https://github.com/instruktlabs/kiln). See `tools/kiln/README.md`.
- `textures/gen.py`: the texture library (numpy + Pillow).
- `make-apk.py`: repacks the wrapper with `www/`, patches versionCode/Name and screenOrientation, signs v2 with `tools/keys/`.
  **Keep that key.** versionName must be 4 characters.
- `run-tests.sh` (Node): `dev/test-logic.mjs` (hall maths, layout, director, i18n), syntax, `dev/lint-comments.mjs`.
- Browser tools (need Playwright, not in Termux): `dev/shoot.mjs` (posed screenshots + console errors),
  `dev/check-world.mjs` (coplanar overlaps per room and per asset, nav reachability), `dev/view-glb.mjs` (multi-angle GLB review;
  `LIB=1` applies library textures). Playwright lives at `/opt/node-tools/node_modules/playwright` in the cloud machine.

## Skills (use them on every task)
- Project skills are checked in under `.claude/skills/` (Kiln, img2threejs, three.js workflows `threejs-*`, three.js API references
  `threejs-api-*`, `animation-forge`). Sources, licences, why chosen and which skill for which job: `docs/SKILLS.md`.
- `.claude/hooks/session-start.sh` installs Kiln 1.6.0, acorn and gltf-transform, Blender 5.2.3 (headless, with software EGL for EEVEE), SciPy and
  OpenCV in cloud sessions, and exports `KILN_WS`, `ACORN`, `BLENDER`.
- Blender: `blender-web-3d` and the 30 `cc-blender` skills. No Blender MCP here: run their recipes as `blender --background --python` scripts.
- Textures are real CC0 scans (Poly Haven, ambientCG) converted by `tools/textures/fetch_cc0.py` over the `gen.py` baseline; sources in
  `tools/textures/SOURCES.md`. Metres-per-tile in `www/js/library.js` must match each scan's physical size.
- Before a feature: `superpowers:brainstorming`; before a fix: `superpowers:systematic-debugging` plus the matching `threejs-*`
  skill; before saying done: `superpowers:verification-before-completion`.

## Rules learned the hard way
- Never put a `//` comment mid-line in the dense one-line code or inside GLSL strings: it swallows the rest. Run the lint.
- Kiln GLBs load with **interleaved** position attributes: read them with `getX/getY/getZ`, not `.array`.
- Every Kiln part needs `projectUV(..., { metersPerUnit: 1 })` (roundedBoxGeo has no UVs). Use box projection for tori and
  pipes (cylindrical projection fails on geometry crossing the axis). `seededRandom(seed)` returns an object (`.range(a, b)`).
- Parts that end on the same plane z-fight at seams: give each layered part its own end angle / offset. Run `check-world.mjs`.
- Modal scrims must sit above the menu (z-index 50 vs 40).
- Colours in shaders are linear; tone mapping is `1 - exp(-c * exposure)`.
- Keep total draw calls under about 100: each library material per room is one draw.
- Never read pixels back synchronously from video frames on phones.

## Current state (2026-10-30)
- v5.11 built (33 Kiln models, street rebuilt): v2 verified, same certificate as v4. See `docs/V5-RELEASE-NOTES.md`.
- The user tested v5.10 on the phone (10 screenshots) and approved every idea listed below. Their full feedback and the status of
  each item: `docs/PHONE-FEEDBACK.md`. Work it in that file's order and tick items there.

## Next steps
1. Work through `docs/PHONE-FEEDBACK.md` (performance first, then layout, NPCs, services, presentation).
2. Approved ideas (build them): Kiln-modelled people with better faces and outfits; a Dolby-style video-wall entrance tunnel;
   Kiln versions of the last box props (cup stacks, menu boards, guide sign); popcorn and drinks carried to the seat with refill;
   trailers before the film; a photo spot with a poster frame; seat-number brass plates; rain/night street views through the
   glass; a balcony in the IMAX screen.
3. New ideas still need the user's approval: list them first.
