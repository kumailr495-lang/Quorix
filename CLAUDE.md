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
  - `lightmap.js` (v5.20): loads `www/bake/` (index, per-room GLB + PNG light maps + props vertex light + seat probes), checks each bake's
    geometry fingerprint against the room as built, falls back to vertex light when stale. `room.js` keeps three accumulators: `acc`
    (shell, light-mapped), `pacc` (placed props, per-vertex light), `gacc` (emitters). `rain.js`: street rain.
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
- `bake/` (cloud only): `bake-all.sh` exports rooms from the game (`export.mjs` + `www/js/bake-export.js`) and bakes them in Blender
  Cycles (`bake_room.py`) into `www/bake/`. Re-bake a room after changing its geometry or lights. See `tools/bake/README.md`.
- `blender/` (cloud only): `seats.py` (the three hall seating families), `fixtures.py` (sconce, downlight, speaker array, torchere, urinal,
  basin, tap, mirror), shared helpers in `lbl.py`. `blender --background --factory-startup --python tools/blender/seats.py -- --out www/models`.
- `make-apk.py`: repacks the wrapper with `www/`, patches versionCode/Name and screenOrientation, signs v2 with `tools/keys/`.
  **Keep that key.** versionName must be 4 characters.
- `run-tests.sh` (Node): `dev/test-logic.mjs` (hall maths, layout, director, i18n), syntax, `dev/lint-comments.mjs`.
- Browser tools (need Playwright, not in Termux): `dev/shoot.mjs` (posed screenshots + console errors),
  `dev/check-world.mjs` (coplanar overlaps per room and per asset, nav reachability), `dev/view-glb.mjs` (multi-angle GLB review;
  `LIB=1` applies library textures). Playwright lives at `/opt/node-tools/node_modules/playwright` in the cloud machine.

## Skills (use them on every task)
- Project skills are checked in under `.claude/skills/` (Kiln, img2threejs, three.js workflows `threejs-*`, three.js API references
  `threejs-api-*`, `animation-forge`). Sources, licences, why chosen and which skill for which job: `docs/SKILLS.md`.
- `.claude/hooks/session-start.sh` installs Kiln 1.6.0, acorn and gltf-transform, Blender 5.2.3 (headless, with software EGL for EEVEE) and
  graphify 0.9.99 in cloud sessions, builds the code graph, and exports `KILN_WS`, `ACORN`, `BLENDER`.
- Blender: start at `blender-core` (18 `blender-*` skills for Blender 5.2 with headless scripts; `blender-asset-qa` before any model is
  done; the people, hair, clothing, weather and terrain ones were removed on 2026-11-15: docs/SKILLS.md), plus `blender-web-3d` and the
  kept cc-blender recipes (modeling, materials, lighting, cameras, export, uv-texturing, pro-workflow). No Blender MCP here: run them as
  `blender --background --python` scripts.
- Code graph: `graphify-out/` is rebuilt at session start (code only, `.graphifyignore`). Before grepping for a codebase question run
  `graphify query "<question>"`, `graphify explain "<symbol>"` (callers and callees) or `graphify path "<A>" "<B>"`; read only the lines it
  locates. After code changes: `graphify update .` (AST only, no model calls). No graphify hooks are installed.
- Writing or reviewing code: `karpathy-guidelines` (simplest change, surgical diffs, verifiable goals).
- Unity, Sanity and model-builder plugins are disabled for this project in `.claude/settings.json` (about 8k tokens a session, no use here).
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
- Shader defines are present-but-empty strings: test `'USE_ENV' in defines`, never `defines.USE_ENV` (that check hid reflections v5.1-v5.20).
- Quads built by hand: wind them so the normal faces the viewer (risers face the screen); back-face culling hides the rest.
- After changing a room's geometry or lights, re-bake it (`sh tools/bake/bake-all.sh <room>`); the console warns about stale bakes.
- Blender lathes: put axis points on a centre vertex (lbl.py does), or parts sharing the axis overlap coplanar faces.

## Current state (2026-11-06): sequential phases, Phase 1 (architecture and geometry) in progress
- **Read `docs/V9-AUDIT.md` first.** The user asked (2026-11-05) for an audit, then sequential phases: finish one system completely before
  the next, no APK until all phases are done, a phase closes only with test evidence AND the phone check (`?bench=1` in Chrome on the
  phone from Termux). Multiplayer (Phase 7) needs a free provider account from the user; list options for approval first.
- **Geometry tests** (all in the real engine, headless): `node tools/dev/seethru.mjs OUT` (see-through from every reachable eye point,
  `--zfight` visible z-fighting, `--assets` prop winding and open parts, `--shots standard` multi-angle named views with depth masks),
  `node tools/dev/walk.mjs OUT` (16 scripted walks: entrances to seats, exits to the lobby, escalator, lift, street, restrooms),
  `tools/dev/check-bakes.mjs` (in run-tests: a stale bake leaves a room undrawn, never commit one).
- **Builder rules learned in Phase 1**: a room is not drawn while its doors are shut, so each side of a door needs its own reveal back to the
  leaf (`door_reveal` in rooms.py); a wall opening at floor level goes down to the wall's foot (a sill piece in the floor's plane
  z-fights); slabs stop at the room's edges (no overhang under a neighbour); walls meeting at a corner use `trim` instead of overlapping;
  glow quads use `glow_facing(... direction)`; in `rooms.py` corridor walls, `face` is the side the corridor is on (check with
  `tools/blender/arch/preview.py`); swept shapes cap their ends with explicit normals. Props: `assets.js` repairs winding at load and
  draws the parts listed in `TWO_SIDED` from both sides (`seethru.mjs --assets` says when the list is out of date).

## v14d (2026-11-27: the user's 14.1 phone test, 17 complaints; APK 14.2, docs/V14-RELEASE-NOTES.md)
- **Flicker**: MSAA on every preset (low too), the resolution governor searches only in the first 45 s then steps down at most twice
  (20 s apart), no intentional neon flicker (street12 ATLAS_FRAG fx 1 gone, chases smoothed), window blinds/curtains filtered by fwidth,
  near plane 0.2 when the phone reports < 24 depth bits; the FPS line shows `AA<samples> · Z<depth bits>` (the next phone screenshot says
  which). Meter: `$S/t/flicker.js` (second temporal difference under a 0.3 px/frame pan); SwiftShader showed no shader flicker.
- **Perf**: halls draw the rooms behind a door only near that door (world9 setVisibility doorNear: 7 m from inside a hall, 25/15 m into
  one); props in cells (lobby 2 x 2, street and corridor 3) so the camera culls them; heavy props simplified (tools/optimize-models.sh,
  glb_check clean); the trolley one draw; people LOD 6.5/14.5 m with hysteresis; seat LOD0 3.5/4.5/6 m.
- **Look to interact**: main.js `lookAt(x, y, z, r, reach)`: the crosshair ray within the thing's radius; every prompt uses it
  (career.js prompt takes it, npc9 talkTarget takes a filter). Upstairs furniture collides (assets.js solidProp floorY).
- **Music**: wrapper `listAudio`, routes /a/ (songs) and /c/ (covers), READ_MEDIA_AUDIO; tablet Songs tab; tags.js (ID3/MP4/FLAC
  covers); party.js MusicScreen draws the cover, a turning record, title, artist, progress; #nowPlaying card. No native audio for
  songs, and the page's copy is muted while the native player plays (sound.nativeMute). Renderer death: MainActivity
  onRenderProcessGone rebuilds the WebView (resume=1); main.js snapshot (lumiere.snap.v1, 30 min) puts you back.
- **People**: npc9 `stage(hallId, on)`: Music Night dancers walk down to the front floor (exitRoute minus the door), dance (Dance_Loop),
  go back; a dancer held up 1.2 s dances where it is; pastimes (eat, drink, read, phone); held things gripped by their side (people.js
  attach measures the item).
- **Play together**: the host owns the lift (lift9 snapshot/applyState, mp 'lfs' 5 Hz while busy); Leave on the room bar and in pause;
  leave() ends synced shows and the slave lift; recline as bit 7 of the state packet, a Recliner per remote seat; room QR
  (www/vendor/qrcode.mjs, MIT) and a BarcodeDetector scan (wrapper grants the camera to our origin only).
- **Halls**: brass nosing + top strip on every aisle step and a strip at the top of each riser (halls.py nosing; re-baked); fixed layer
  dims to a third in the film; screen spill gain 1.1 playing (was 3.6), eased.
- **Restrooms**: two doors (women's z -1, men's z -7), the vestibule split at z -4 (rooms.py, re-baked lobby + wc), MEN/WOMEN signs,
  NAV wcDoorM/wcInM/wcMid, walk.mjs men's walk.
- **The LUMIÈRE Suite**: the v14 flat restored as a private apartment (home.js, home14.py, bake home); phone app "Suite" and the host's
  option go up (300 LC, free in Quick); models load on the first visit (SUITE_ASSETS); remote.js: a 3D remote in the vm scene, keys
  tapped by raycast (player.onTap first), REMOTES on the coffee table and the cinema console.
- **Intro**: the taxi filmed from outside (crane, tracking, kerb), no cabin; then the old step-out POV.
- **Lessons**: since props above 0.5 m collide (solidProp floorY), a test path that crossed a prop now sticks: walk.mjs walked through the
  bin beside each hall door on the old baffle detour (removed); a lobby guest spot stood on the way to the men's door (moved to 18.0, -0.6).
  Before blaming walls, `world.collide(p, r, y)` along the leg and `crowd.millNet().spots` say what blocks a walker.

## v14b/v14c (2026-11-26: the user's phone test; "scrap the city: an indie game where people watch movies together"; APK 14.1, docs/V14-RELEASE-NOTES.md)
- **Scrapped**: the flat, the vehicles, the phone's Order app (orders come from the armrest tablet and the counters). Story starts with the taxi.
- **Seat yaw**: hallmath `yawOf(t) = (f > 0 ? -PI/2 : PI/2) + t` (the old `- f * t` turned the west halls' seats away from the screen). test-logic
  fails when any seat faces > 0.5 deg away from the picture (the arcs' centre on curved rows). A seat's front is (-sin yaw, -cos yaw).
- **Curved rows (CURVE only, rowK 3)**: past each side aisle's outer edge the floor steps straight to the wall (hallmath `edgeD`/`edgeE`,
  `hallFloor`; halls.py `band`, `side_riser`, the last-row polygon), so the side exits stay on the front floor; routes walk curved aisles and
  lanes in short chords (seatRoute, npc9 exitRoute). Curved-row seats are narrowed by fr x pitch / radius (world9 buildHall).
- **Loader**: four painted key-art pieces in www/load (tools/art: engine stills at 2400 px -> paint.py anisotropic Kuwahara in Blender's compositor
  -> grade.py ink, grade, vignette, grain); titles `load.art`; the art fades to black, then the black lifts off the menu. Never put a screenshot
  with the HUD in the loader. Menu camera: an arc 6.4 m round the statue, 3 m up.
- **Music Night** (party.js, film9 `_music`): an audio-only own show turns the screen into a canvas light show (MusicScreen) driven by
  sound.an; beats -> npc9 onFilmEvent 'beat' (clap) / 'drop' (cheer, every 4th) and Confetti bursts from seated viewers. The file input and the
  Android chooser accept audio.
- **Far crowd shader**: VERT_CROWD_RB must declare every varying FRAG_RB reads (vH); a link failure there hides every seated audience.
- **Food**: vertex-painted models (lbl.py MAT_VC, export colors=True; held.js multiplies tint by COLOR_0); popcorn heap = a closed dome + kernels.
- **Other**: loans (credits.js LOAN), staff names per language (`staff.<id>`, talk.js nm), ticket row letter, phone home fits 340-412 px tall,
  no E badge from mouse-type presses on touch screens, Sound9.setHead ignores non-finite values, walk.mjs exit walks expect the light-lock's jump.
- **Probe lessons**: hall height is `H.cfg.y0` (world halls have no y0); `L.pose` puts the player at camera y - 1.62, keep it above the floor;
  long scripts outlive a 40 s test film (its show ends and idles); a scanned plant's leaf cards can lie in one plane (zcheck engine pass).

## v14 (2026-11-20: the 13.0 phone test, then "finish every feature ... GTA level models ... money, jobs, missions, tasks, streaming, customizable theatres, cars, motorcycles"; docs/ASKS-LEDGER.md "v14 push")
- **Halls**: hallmath.js HALLS bigger with curved rows (rowK), building.js `L1` constant 4.662 (every hall lifted: y0 = L1 - total); halls.py: no
  baffle, 270's ceiling a light grid. Exits are walked (no fast exit; walk.mjs expects tele 0). Seats named (world9.js seatLabels), seat finder.
- **Scanned props** (CC0, Poly Haven): `tools/polyhaven/fetch.py RAW id...` (md5-checked) -> `tools/blender/scans14.py` (turn front to +X,
  stand on Z 0, materials `scan_<name>_<a,b>`, no Decimate: it smeared UV seams) -> gltf-transform weld + simplify (meshoptimizer keeps
  seams) -> `tools/textures/scans.py` (albedo x AO, normal, roughness at 512 px into www/tex, writes www/js/scans.js SCAN_LIB/SCAN_NAMED).
  library.js merges them from id 48 up (NUM_IDS; materials.js uP[NUM_IDS*3]; keep NUM_IDS <= 72 for 256 vertex vectors). Alpha leaves
  (LEAF_IDS) split into their own draw (world9.js splitIds, materials.js leafRoom: ALPHA_LEAF, double-sided). Sources: tools/polyhaven/SOURCES.md.
- **props14.py** (Blender): bin_brass (dome-top push-door), bench_velvet (diamond tufted), poster_totem, planter_tall, popcorn_cart,
  plinth_marble, motorcycle. glb_check clean. Bins stand only at counter ends, the spine's mouth, the gate exit and walls.
- **Credits** (credits.js): LC, 1 LC = the old rupee price, start 1,500, daily earn cap 2,500, history, inventory, checksum with a device salt
  (client-side only: say so). Bill pays in LC (refused when short; Quick play free). House films pay 6 LC a minute seated/visible/playing
  (max 300 a film) and 150 on finishing once a day (main.js filmMeter, onEnd); never YouTube or own videos.
- **Career** (career.js): MISSIONS (3 chains), daily tasks (date-seeded), SHOP; Jobs: counter (order mini-game), gate (ticket checks), clean
  (litter in a hall's rows -> bin). Events: tut.event wrapper + career.event calls (photo, lift, flush, chat, emote, mpJoin, watchMin, filmEnd).
  Wayfinding: wayfind.js `st.job` and `toHall`. Phone apps Wallet, Jobs, Tasks, Shop, My Theatre.
- **Streaming** (tablet.js stream): Internet Archive advancedsearch + metadata (CORS ok), only `licenseurl:*publicdomain*`, h.264/MPEG4, no
  adult titles; plays as a link (film9.js loadURL) in your hall.
- **My Theatre** (theatres.js, world9.js themeHall): recolours seats (mat 8/1), shell walls (9), carpet (16), drapes/curtains (1) live; presets,
  share codes `LT1.<base64 json>` (whitelisted parts, #rrggbb only).
- **Vehicles** (vehicles.js): the parked car (car_sedan, black) and the motorbike on the kerb; bicycle model, kerbs and traffic hold them;
  chase cam (car), rider's view (bike); traffic treats you as an obstacle.
- **Multiplayer** (mp.js): state as 5 ints, change-only (12.5 Hz / 1 Hz heartbeat), 'mt' meta on change, `sample()` 110 ms interpolation;
  npc9 draws remote players first; name tags move by transform.
- **Taxi**: the wheel is its own instance turning with the heading rate; the drive gesture's hand targets turn with it (intro9.js STEER).
- Lessons: Blender Decimate (collapse) smears UV seams on scans: use meshoptimizer; view-glb.mjs flips scan textures (TextureLoader flipY),
  judge scans in the engine; a probe's synthetic pointer events switch the HUD to keyboard mode (the stick hides): not a bug.

## v13 (2026-11-20: the user's photos and two master prompts; docs/V13-PLAN.md is the audit and the stages)
- **Design choices go to the user as a board first.** tools/blender/variants13.py renders column and ceiling variants as Cycles vignettes
  (docs/v13/variants-columns-ceilings.jpg). I built my own pick (P3 + C3) before asking and had to rebuild: the user picked **P2 + C1b**.
- **Lobby ceiling (C1b, lobby12.py `field`, `halo`)**: a dropped field 0.75 m under the roof (`FIELD_DROP`), 0.3 m clear of the walls (a
  lit shadow gap; the walls' washers sit in it), cut round the escalator hall (the field runs 2 cm into its walls; the hall keeps the roof
  as its ceiling). Over the court a round opening (R 6.6) steps up twice (`STEP` 0.32 m): a brass band 19 cm tall round each opening hides a
  cove LED (`lit.line` rings facing up and in) that washes the step above; pinpoints on each level, stars in the step and the dome, the
  statue's cans under the dome. The roof slab has no underside except in the gaps and over the escalator hall. The field is built as cells
  on cut lines through every corner and four strips stitched by angle to the circle: no T-junctions. Elsewhere the floor light comes from
  black-baffle apertures with no glow (`apertures`). world9.js `LOBBY_FIELD`, `LOBBY_DOME`: the chandelier hangs from the dome, the pendant
  cloud from the field.
- **Lobby columns (P2, `marble_column`)**: square Nero Marquina shafts on black bases, a brass post on each corner (6 cm proud) with its
  outer edge cut at 45 degrees and an LED strip in the cut, a brass band 0.3 m under the ceiling; the mezzanine's five are the same, smaller.
- **Entrance runner**: floor now (`runner_to_ring`): crimson carpet in a brass frame, its end cut to the brand ring's arc (the prop stopped
  0.22 m short). **Ticket kiosks**: zones12.py `ticket_kiosk` (the user's kiosk photo) on the walnut panel between the counters; their
  screens are rooms.py's `kiosk_*` panels at `KIOSK_SCREEN`.
- **Zones** (the user, 11-20: "make the reception and the areas separated and much more defined"): Nero Marquina fins with lit brass noses
  (lobby12.py `zone_fin`) between the ticket bay (desk + kiosks), the popcorn bay and the bar (that one under the mezzanine, up into its
  slab); the ticket canopy has a 0.8 m fascia for its name; the popcorn's marquee sign stands on its canopy's front edge (on the wall behind it, the 5.7 m deep canopy hid it from the lobby); a walnut header with the
  bar's name. The names are engine panels `zone_<tickets|kiosk|popcorn|bar>` (world9.js PANEL_DRAW `zone`).
- **Ceiling paint**: the field, the halo's step, dome and pocket walls use library 13 (`lobby12.PAINT`: flat, no tone blotches); the wall
  paint's macro blotches read as stains on the evenly lit dome.
- **Corridor** (the user's dark-corridor photo): each portal's face framed in light (strips on the jambs' brass edges and under the head),
  a blade roundel with the hall's number over the pier (rooms.py `corridor_signs`, panels `roundel_<hall>_a/b`; the flat numerals are
  gone), a seat-plan board under a brass picture light (panel `seatplan_<hall>`: hallmath.js `hallSeats`, the real seats, premium in gold).
- **The phone** (www/js/phone.js; the user's two phone photos): HUD button `#bPhone` or F; it slides up at the end side and never stops the
  game (only the device takes taps). Home: the time, your next show, your tab; apps Ticket, Map (building.js ROOMS, the corridor as its legs),
  Tab, Camera (the screen is see-through as a viewfinder; main.js `snapCb` grabs the frame after the next render, 960 px JPEG), Photos
  (localStorage `lumiere.photos`, the last 12; "Save file" only outside the Android app), Stubs, Friends (mpui), Settings. Its views carry
  `ph-k-<app>` classes (a bare `.ticket` or `.tab` picked up the old global styles and stretched the Ticket app); the camera hides the HUD
  buttons behind the see-through screen (body `ph-cam`).
- **APK 13.0** (versionCode 1300, docs/V13-RELEASE-NOTES.md): `sh tools/android/build.sh BT JAR OUT` (build-tools 35 and android.jar 35
  are cached in the scratchpad's `sdk/bt/android-15` and `sdk/pf/android-35`), `python3 tools/stage-www.py OUT`, `python3 tools/make-apk.py
  WRAPPER OUT APK 1300 13.0`; sent with SendUserFile. The user asked for the app on 11-20 (it overrides "no APK until all phases").
- **Props are not in the v9 bake** (geo.py writes `'props': None`): adding or moving a prop needs no re-bake; only the builder's geometry does.
- Rules learned: a light above a dropped ceiling lights nothing below it (rooms.py check: no lobby light over the field outside the halo, the
  escalator hall and the gaps); measure the floor before and after a lighting change (fixed views, mean of the floor's pixels) instead of
  judging by eye; a triangulation that fans from one corner of a square round a circle overlaps itself (zcheck found 90 places): stitch by
  angle with a point per ray on each side, and check a mesh's area against the expected area.

## v12c (2026-11-19: the user, "the textures and models ... lazy, make them better 3d detailed and animations", dedicated zones, the ceiling, the pillars)
- **Lobby look** (tools/blender/arch/lobby12.py, the user picked each; the ceiling and columns were replaced in v13): noir coffered ceiling,
  backlit honey-onyx columns (library 35 = the ambientCG Onyx007 scan now, emissive; still the ticket desk's front and backdrop), the three
  counters restyled in place (ticket desk, popcorn parlour with a bulb marquee, bar with a bottle wall). The statue reads gold: its material
  is `gilt` (library id 25, part metal; pure metals only reflect the room's dark cube) under three spots in brass cans.
- **Zone props** (tools/blender/zones12.py, original): popcorn_kettle, drinks_tower, espresso_lever, till_pos, tub_stack, bar_walnut,
  chandelier_deco, popcorn_case; world9.js `LIFE` holds where the living ones stand. The parlour's back counter is 0.75 m deep in front of the
  wall's face (x -21.6); the v10 machines stood half inside the wall. The lobby's prop glass is drawn see-through (world9.js `propGlass`;
  the street's cars keep dark glass: no cabins).
- **Animation** (www/js/anim12.js `LobbyLife`, ticked in main.js): every particle moves in its vertex shader from a seed and one clock (no
  uploads): the marquee's chasing bulbs, fountain drops, splashes and rings, popcorn popping in batches (the popcorn sound follows
  `popRate`), steam at the bar (an order starts it: `steam()`), a sheen across the menu boards. Particles live in each prop's Blender
  frame (Blender X -> engine Z, Y -> X, Z -> Y, then the yaw), so change a prop's geometry and its numbers in anim12.js together.
- **Rules learned in v12c**: tubes along bent polylines use `lbl.ptube` (rotation-minimizing frames); the old builders switched their
  side vector where a tube turned near vertical and folded faces onto each other (the bike stand's hoops). zcheck's engine pass also flags
  2-5 mm pairs that glb_check does not: labels, rims and knobs on lathed or faceted parts need 7 mm (5 mm along a tapered or faceted
  surface measures under 5). index.html's CSP refuses injected inline scripts: test harnesses that inject one (seethru.mjs) create their
  context with `bypassCSP: true`; the app keeps its CSP.

## v12 (2026-11-17; docs/V12-PLAN.md)
- **Street** (tools/blender/arch/street12.py, www/js/street12.js): seven lots of buildings across the road, framed shopfronts (most shut at
  midnight: `ground()` shop tuples take a fifth 'closed'), a side street north at each end (`side_spans`, `side_street`, `end_block`; the
  hidden legs behind the corner blocks are where traffic appears and leaves). Midnight grade: rooms.py `LED` street lamps, a low blue
  ambient, world9.js LEVEL street 0.15, fog 0x090c14, the sky drawn at the far plane (`p.xyww`). Re-bake the street after any change.
- **Traffic** (www/js/traffic.js): routes are polylines from `extras.traffic` (left-hand traffic), a speed profile from curvature, braking
  to a centimetre-exact distance from the player and other cars (`clearAhead`), `carFloor` keeps roofs readable between lamps. intro9.js
  drives the taxi on the same routes: down the west lane, stop at the TAXI bay (x 9), leave round the east corner after you get out.
  sound9.js `vehicle()` is the synthesized engine + tyre hiss per car.
- **Cars** (tools/blender/taxi.py builds `car_taxi` and `car_sedan`; cars.py is retired for cars): cage body, Subsurf 1, shut lines as
  painted plane cuts (booleans only for the arches), lamps, plates and lettering (Inter, OFL). The cabin (cabin.py) is unchanged apart from
  the bonnet. LOD0 about 18.5k / 17.4k triangles.
- **Lobby dressing** (tools/blender/decor12.py; world9.js DRESS): film-heritage exhibit on the escalator hall's west wall (projector,
  reel wall, two framed bills `vintage_a/b`, a rope), a photo spot (`photowall` panel, director's chairs, ring light, backdrop stand),
  a merchandise shelf. world9.js `KEEP_OUT` rectangles keep guests (npc9.js `millNet`) out of the exhibit and the set.
- **Lobby props are split**: small props and those on the upper level go into `lobby-propsdeep` (hidden from the street), the rest stay in
  `lobby-props` (seen through the glass). `captureReflections` only renders hero rooms and restores the visibility it found.
- glb_check.py prints each fold's position; `reel_wall` hangs on a wall.
- **No cropped text** (the user, 2026-11-13 and 11-17): textures.js patches `fillText`/`strokeText` once: a line that would run past its
  canvas (or `ctx.__fit = [x0, x1]`: an atlas cell, a poster's border) is drawn in a smaller font that fits; `ctx.__noFit` opts out (the
  LED wall slides posters past its edges). `?textcheck=1` logs every fit in `window.__textFit`. Small 3D lettering is avoided (font
  T-junctions): captions are engine panels (`plaque_proj`).
- **docs/ASKS-LEDGER.md**: every ask since the v8 phone test, grouped, with its status. Update it when an ask moves.
- **Lobby look (Y3, the user's v8 photos are the benchmark)**: Nero Marquina floor (id 33, soft gloss), red marble (id 34 is the
  `rosso` scan again; rooms.py `ROSSO` tint) for the border, the brand disc and every column, dark walnut flutes behind the counters,
  darker stone panels on the east wall, a crimson lacquer outer cove. No patterned rugs: world9.js `CRIMSON` swap on the remaining carpets
  and a runner from the doors to the brand ring (floor only, no ropes on the door axis).
- **Paintings**: www/art/*.jpg, public-domain works from the Art Institute of Chicago (CC0; docs/LICENSES.md); world9.js `ARTWORK`
  (file, width/height) and `fitArt` size each frame to its painting, so nothing is cropped.
- **What a room may hide** is measured: `blender ... --python tools/blender/arch/pvs.py -- --eyes OUT/eyes.json --engine OUT/engine.json`
  (from zcheck.sh's dump) prints which rooms see each prop mesh. world9.js setVisibility hides a mesh only from rooms that never see it.

## v11 (2026-11-14; docs/V11-RESEARCH.md)
- **Escalator and lift hall** (the user: "make the escalator and the elevator area one and a separate area"): building.js `CORE`, rooms.py
  `core_hall`. Walls from the floor to the roof slab, from the gate line back to the mezzanine; one portal frames the gates (ticket leaf on
  the west jamb, a gate cabinet, exit leaves); the NW corner is a marble pier (it replaced a court column). The glass screens, the gate-line
  piers and the header beam are gone.
- **No near misses** (the user's photo: a pier, a rail stopping short of it, two posts side by side): parts either embed into each other or
  stand more than 30 mm apart. geo.Acc records every box (and prism/cylinder envelopes); `tools/blender/arch/connect.py [room]` lists pairs
  held 1-30 mm apart; `build.py --check` (in run-tests.sh) fails on any. Reveals (thin claddings on one backing plane, up to 13 mm) and gaps
  another part fills are allowed.
- **Lift** (www/js/lift9.js): two-speed centre-opening landing doors (a fast and a slow panel each side, 3 cm apart, both inside the jamb
  when open: one 0.7 m leaf a side stuck out of the tower's post; a dark nosing where they meet), call stations, car panels and header displays are real objects; pressed by tapping them or with the crosshair +
  E/A/click (main.js `aimBtn`, `pressLift`, player.js `onTap`). Doors open on a call, the open button or an arrival; a safety edge holds them.
  `lift.call(k)` = a landing call (walk.mjs). No HUD prompt for the lift.
- **Crowd**: lobby guests stand at checked spots and walk checked legs between neighbouring spots (npc9.js `millNet`, `mill`, `millBack`;
  legs keep 0.8 m from other spots and from standing staff); `node tools/dev/npc-clear.mjs [seconds]` fails on anyone inside a wall, a prop
  or another person, or stuck.
- **QA skill**: `.claude/skills/lumiere-qa` (which gate for which change, commands, pass lines, pitfalls). Use it before calling geometry,
  models, placement, NPC routes or the taxi done.
- **Taxi arrival (W5)**: the cabin is `tools/blender/cabin.py` -> `taxi_cabin.glb` in the car's frame (Blender +X the nose, +Y the kerb;
  the eye, wheel, screen, meter and dial glows sit where intro9.js expects them); the driver is a seated Person (people.js `STAFF.driver`,
  `GEST.drive`, intro9.js `DRV`); the passing light is intro9.js `_sweep` (the street's light list -> iLs and the street's `uScreen`,
  `uScreenN`, restored in `_ride(false)`); wet glass is intro9.js `wetGlass` (drops, wipers in step with the blades); sound9.js `carRain`.
- Comment lint now also catches member assignments swallowed by a comment (it found `a.walkT = ...` and `this.camera.far = ...`).
- **Zero z-fighting, nothing floating** (the user, 2026-11-15: "i wont accept disconnected models ... neither will i accept z FIGHTNING").
  The gate is `sh tools/dev/zcheck.sh OUT` (cloud: Playwright + Blender): the engine dumps every reachable eye point and its own meshes, then
  `tools/blender/arch/zcheck.py` builds all nine rooms (the Story taxi parked at the kerb; its cabin in a second pass from the back seat)
  and lists every pair of same-facing faces under 5 mm apart that a player can see
  (BVH rays to the eye points; glass is see-through) from far enough for the depth buffer to merge them (`fight_from`: one plane at any
  distance, 0.5 mm from 20 m, 2 mm from 41 m, 5 mm from 65 m; near 0.1 m, 24-bit). It must print `TOTAL visible coplanar 0, visible close 0`.
  Props: `blender ... --python tools/blender/glb_check.py -- www/models/*.glb` (parts must touch: within 1.5 mm or into each other, and reach
  the floor, the ceiling for hung models or the wall for letters and wall fixtures; no coplanar faces between parts). `--fix OFFS.json` +
  `node tools/dev/glb-offsets.mjs OFFS.json` move small floating parts into their neighbours as node offsets (check the moves: diagonal ones
  are wrong, fix those in the source). Rebuild order for a prop: build (Kiln / Blender), `sh tools/optimize-models.sh`, then glb_check.
  glb_check also counts folds (two faces of a part in one plane facing opposite ways): a TWO_SIDED part's fold fights its own back copy;
  fix the source, or `node tools/dev/glb-unfold.mjs FILE.glb` removes the folded face (`--dry` lists them).
- Layering rules that came out of it: parallel layers 5 mm or more apart (floor inlays, borders, brass lines, panel beds, frames); a part set
  into another goes at least 2 mm in and its faces never end in the other's planes (end caps 1 cm past, jambs under heads, rails between
  stiles); closed loops in `geo.sweep` and decor10 `ctube` are welded (first point = last point); a tip-up seat stands 30 mm clear of its
  back and hangs on pivots from the arm standards; a 3D glyph with overlapping strokes gets a self union (letters.py); panels that show a
  canvas are the front of their plate (lift9.js `FACE = PLATE`, plates without a front face).

## v10 (2026-11-07; docs/V10-RESEARCH.md, the last entry of docs/V9-AUDIT.md "Development record")
- **Ticket zone**: both escalators and the lift sit behind one check (building.js `GATE`, `ZONE`; rooms.py glass screens; world9.js
  `world.gate` and `world.exitGate`). The usher's pass (`gate.pass`) or Quick play (`gate.always`) lets the player through the ticket leaf;
  walkers swing it but never let you in behind them (`gate.letsPlayer`). The free-exit half leaves only open outwards. walk.mjs proves it:
  seven "zone shut" walks must stay out, two must get out by the exit leaves.
- **Light maps**: bake_room.py unwraps a welded copy of the room (the rooms are triangle soups: every triangle was its own island) and
  stretches islands thinner than 3 texels (they baked black: the brand ring's brass edge). The lobby went from 10% to 59% of its map used,
  6 to 14 texels a metre. Re-bake a room to get this.
- **Lobby dressing** (world9.js DRESS, tools/blender/decor10.py): fountain on the brand ring (round collider `o.round`; NAV parts round it:
  foyerW/foyerE), four light columns, pendant clouds (`detail: 1`: the low preset skips them), cafe kiosk (rooms.py walnut wall, back
  counter, shelves; props; barista NPC 'cafe' with dialogue9.js `cafe`), rugs, popcorn cart, standees, NE seating corner.
- **Framed pictures** (world9.js `FRAMED`, `framePanel`, `addPanel`): engine-side panels with a board and frame, no re-bake: restroom
  pictograms, the east-wall mural (3 panels, one picture), art, standee boards. Artwork is drawn in PANEL_DRAW (original, no images).
- **Sounds**: cafe room tone, fountain, espresso pump and cup (BigSoundBank 2561, 913, 3049, 410; CC0) by distance (sound9.js).
- **UI**: app.css v10 block (crisper glass, brighter secondary text, the menu fits 360 px tall screens). `tools/dev/uishots.mjs OUT` shoots
  every screen at the itel P65's 806 x 360 CSS px.

## v9.3 (2026-11-06; the last entry of docs/V9-AUDIT.md "Development record")
- People are Microsoft Rocketbox avatars (`www/models/rb/`, built by `tools/blender/rocketbox.py`; people.js `RB`, `rbAvatar`). Staff
  avatars are fixed in people.js STAFF `over.rb`; guests are a seeded pick (Business_* excluded).
- ScreenX is one continuous band (film9.js WALL_FRAG `uWall`, PIC_FRAG `uExt`); never split the picture into separate wall images.
- Playing together: `www/js/mp.js` (Trystero over public Nostr relays; no account, no key, nothing secret in the app) and
  `www/js/mpui.js` (room panel, avatars, names over heads, chat, emotes, shared shows). Every value a peer sends goes through a check
  (mpui.js `cleanShow`, mp.js clamps); keep it that way. Shared shows carry `orig` (the web address), never this phone's media-server
  URL. A shared show (`s.sync`) is kept on the room's clock in film9.js update. Test: `node tools/dev/mp-sync.mjs OUT` (10 min).

## v9.2 halls (2026-11-06; the last entry of docs/V9-AUDIT.md "Development record")
- The user rejected v9.1b's look as "no change", then said fix it rather than revert. Don't ask them questions mid-fix; act and show
  renders. v9.1b (bigger pictures, exits in the screen wall behind portals in the masking, watch zoom) is the base.
- Seats: `tools/blender/seats.py` seat_rocker/arm_rocker/seat_club/arm_club use `lbl.py` `pillow()` (subdivided cage: crown, creases,
  shape callback; `levels=0` gives the LOD1 cage). Per-hall colour swaps: world9.js `SEAT_SWAP` -> `assetGeometry(..., over)`.
- Instanced seats take screen light along `uScreenN` (set per hall in buildHall); never hard-code a screen direction.
- ScreenX (film9.js `_fit`): wrap (ordinary film: front = middle 80 %, walls = outer bands), split (>= 2.8:1: front filled at full height,
  walls = outer bands), YouTube = walls off. Check with `node tools/dev/showshot.mjs OUT X270 960x540` and `... X270 1440x480`.
- Fast exit: main.js `fastExit()` (hall -> spine = fade + place at the spine mouth in the lobby). walk.mjs counts these (`tele`).
- **After changing hallmath.js or building.js, rebuild and re-bake every room whose geometry changed**: `python3 tools/blender/arch/build.py
  --check` lists them (run-tests.sh runs it); then `sh tools/bake/bake9.sh <room ...>`. v9.1b grew two halls and left the corridor stale.

## v9.1 realism pass (2026-11-06, Phase 1 continued; see the last entry of docs/V9-AUDIT.md "Development record")
- The user's complaints this pass: empty spaces, flat one-colour textures, unrealistic lighting, exits that make no sense, theatres too
  small ("no one would see it"), no ScreenX, sofas placed the wrong way. Their numbered photos and inspiration photos are in the
  transcript (recover them to the scratchpad if needed); keep working from them.
- Halls: pictures nearly wall to wall (hallmath.js HALLS; `BAY` = 2.3 m exit bay at each front corner, `h.bay`, exits at the bay's
  centre). Hall widths changed, so building.js now derives FLANK/LINK/SPINE/TRAVELATOR and the NAV nodes behind the halls from them.
  X-270 has `h.sideScreen` (side projection surfaces) read by halls.py and film9.js.
- Materials: library.js LIB ids 41-47 (travertine, oak, neroGold, wcWall, wcFloor, microcement, lobbyMarble); per id `macro` (tone and
  gloss blotches, materials.js USE_MACRO, medium+high) and `detile` (1: random offsets for organic scans, USE_DETILE, high; 2: tile
  shuffle for a 2 x 2 designed tile layout). Roughness maps `<tex>_r.jpg` ride in the albedo array's alpha (library.js ROUGH). New scans
  come from tools/textures/fetch_cc0.py (it merges rows into SOURCES.md when run on named slots).
- Panels: `exitsign_*`, `wayfind_<screens|wc|tickets|food>`, `noentry_*`, `poster_<film>[_n]` (world9.js PANEL_DRAW). Restroom fittings
  are placed from the builder's fixture points in dressRooms.
- Tests: walk.mjs also fails when a NAV edge passes within 0.25 m of a wall or prop (props collide with axis-aligned boxes: keep rotated
  furniture square to the axes or off the paths). tools/dev/showshot.mjs plays a generated test film in a hall and photographs it (the
  only way to see screen light and the 270 side screens). tools/dev/views.mjs = the fixed hero views for before/after renders.

## Earlier state (2026-11-05, v9.00)
- v9 on branch `ccr-7bb5aa6a-upup1u`: design and calculations `docs/V9-DESIGN.md` (+ `docs/v9/` drawings), per-ask status `docs/V9-CHECKLIST.md`,
  release notes `docs/V9-RELEASE-NOTES.md`, licences `docs/LICENSES.md`. Not yet seen on the phone.
- **The building is data**: `www/js/hallmath.js` (UNIC hall maths) and `www/js/building.js` (rooms, doors, escalators, lift, nav graph,
  palettes). `tools/dev/export-spec.mjs` -> `tools/blender/arch/build.py` builds every room in Python (`geo.py`, `halls.py`, `rooms.py`),
  `tools/blender/arch/gate.py` ray-tests for see-through gaps, `sh tools/bake/bake9.sh [room]` bakes in Cycles to `www/bake/`. After
  changing a room's geometry: re-run build + bake for it (the engine warns about a stale bake by hash).
- **Engine**: `world9.js` (rooms from the bakes, glass split out, props, doors one-way, escalators, lift, travelator, gate, seats, picture,
  collisions from the model's faces in 0.5 m bands, multi-level floors), `npc9.js` (crowd), `film9.js` (shows, WebGL picture, spill,
  YouTube layer), `sound9.js`, `booking9.js`, `panels9.js`, `intro9.js`, `dialogue9.js`, `main.js` (flow). The v8 world/layout/npc/film
  modules are retired (git history).
- **Tests**: `sh tools/run-tests.sh` (Node: halls, building, nav, director, i18n). Browser: `node tools/dev/shoot9.mjs OUT shots.json`
  (cams, evals; walking routes via a scripted autopilot, see the scratch tests described in the release notes).
- **Voices**: English `tools/tts/make_voices9.py` (Chatterbox), Spanish/Hindi `tools/tts/make_voices9_kokoro.py` (Kokoro).
- **APK**: `python3 tools/stage-www.py OUT` (only what the game loads, light maps for soft layers at 1024) then `tools/make-apk.py`.
- Lessons from v9: never append a `//` comment to a line that continues (it happened twice in tests); doorways must belong to a room
  (floor); check headroom of every door against the ceiling it opens under; walk every route in a scripted test before shipping.

## Earlier state (2026-10-31, v8.00)
- v8 on branch `ccr-7bb5aa6a-upup1u` (plan with honest ticks: docs/V8-PLAN.md; status per feedback point at the top of docs/PHONE-FEEDBACK.md;
  release: docs/V8-RELEASE-NOTES.md). Not yet seen on the phone.
- New pipelines: people (`tools/blender/people.py`, PEOPLE.md), voices (`tools/tts/make_voices.py`: Kokoro, Opus clips + mouth envelopes in
  `www/voice/<lang>/`; Urdu plays the Hindi clips, so `hi` and `ur` lines must stay the same Hindustani sentences), cars
  (`tools/blender/cars.py`), Android wrapper (`tools/android/`: Java source, `build.sh` with javac + build-tools 35 + android.jar 35;
  make-apk.py then adds www and signs).
- Dialogue lines live in `tools/dev/i18n/v8-*.json` and are applied with `tools/dev/i18n_add.py` (handles nested lists). After changing a
  spoken line, re-run make_voices.py (it only re-records changed clips).
- Story mode starts with the taxi arrival (`www/js/intro.js`); Screen 1 is 22.6 m wide with 140 recliners; Screens 1 and 3 are entered
  along a side vomitory from their rear corner (`entry: 'vom'` in hallmath SPECS).

## Earlier state (2026-10-30, v7.00 built)
- v7 on branch `ccr-7bb5aa6a-upup1u` (docs/V7-DESIGN.md; feedback status at the top of docs/PHONE-FEEDBACK.md): lobby and plaza rebuilt after
  Allu Cinemas, Dolby-style corridor, IMAX gateway hall with a panorama wall, IMAX trench removed (side vomitories, 6 + 20 + 6 aisles), Screen 1
  centre aisle, restrooms dressed, no automatic shows (audiences only for your booking), you start outside at the kerb, outdoor distance fog.
  New Kiln props in `tools/kiln/` (chandelier_cascade, sofa_curve, table_lounge, pendant_ring, back_bar_onyx, bar_counter, poster_totem,
  number_totem, planter_hedge, bollard_light, restroom_set), 3D letters from `tools/blender/letters.py`. APK v7.00 (versionCode 700) built and
  sent (docs/V7-RELEASE-NOTES.md); not yet seen on the phone.

## Earlier state (2026-10-30, later)
- v5.20 in progress on branch `ccr-7bb5aa6a-upup1u`: Cycles light maps for every room, new per-hall seating and hall identities, real
  restrooms, rain and wet street, reflections fixed (docs/V6-ENVIRONMENT.md, "What v5.20 built"). Not yet built into an APK; not seen on the phone.

## State before v5.20 (2026-10-30)
- v5.11 built (33 Kiln models, street rebuilt): v2 verified, same certificate as v4. See `docs/V5-RELEASE-NOTES.md`.
- The user tested v5.10 on the phone (10 screenshots) and approved every idea listed below. Their full feedback and the status of
  each item: `docs/PHONE-FEEDBACK.md`. Work it in that file's order and tick items there.

## Next steps
0. Get the user's phone feedback on v8.00 (both APKs), then work the open items at the top of docs/PHONE-FEEDBACK.md
   (lobby stairs and escalators, concession machines, curtain, loading hitches, screen light, the remaining screenshot fixes).
1. Work through `docs/PHONE-FEEDBACK.md` (performance first, then layout, NPCs, services, presentation).
2. Approved ideas (build them): Kiln-modelled people with better faces and outfits; a Dolby-style video-wall entrance tunnel;
   Kiln versions of the last box props (cup stacks, menu boards, guide sign); popcorn and drinks carried to the seat with refill;
   trailers before the film; a photo spot with a poster frame; seat-number brass plates; rain/night street views through the
   glass; a balcony in the IMAX screen.
3. New ideas still need the user's approval: list them first.
