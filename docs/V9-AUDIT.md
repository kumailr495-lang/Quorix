# LUMIÈRE: implementation audit, phase plan and development record

Started 2026-11-05, after your request to audit the whole project, fix the geometry and rendering problems, add multiplayer and work
in sequential phases. This file holds the audit, the phases and their state, and a dated log at the end.

## How to read this

**What was audited.** The v9 request: your v8 phone feedback, one row per ask in `docs/V9-CHECKLIST.md` (IDs N1, S1, G1 and so on).
Then the addendum of 2026-11-05: geometry and rendering, multiplayer, audit, phases, no premature completion, optimisation.

**Evidence types.**
- **T**: an automated test in this repository (`sh tools/run-tests.sh`, `tools/dev/seethru.mjs`, `tools/blender/arch/gate.py`).
- **W**: a scripted walk through the game with its own controls (headless).
- **J**: a desktop JVM test of the Android wrapper.
- **R**: a headless render. Chromium with SwiftShader runs the real engine on a CPU renderer: it shows what is drawn, not the speed or
  the phone GPU's look.
- **C**: code reading only.

**The rule used.** Behaviour counts as tested only with T, W or J. A render is evidence only for something purely visual, such as
colours or a model's shape. Code reading alone is never "tested".

**The phone.** Nothing has run on the phone (itel P65, Mali-G57 MP1) since v8. "Tested" below always means tested here. The phone
check of each phase is a separate gate (see "Device check").

**Categories.**
1. **Implemented and tested** (evidence as above).
2. **Implemented but defective or incomplete**: a known defect, a partial implementation, or no test yet. Each row says which.
3. **Not implemented.**
4. **Blocked**: needs the phone, a network service or an account. Each row says what unblocks it.

## Summary

| System | 1 | 2 | 3 | 4 |
|---|---|---|---|---|
| Architecture, geometry, props (Phase 1) | 22 | 19 | 4 | 1 |
| NPCs (Phase 2) | 7 | 13 | 1 | 4 |
| Usher, server, flow, money (Phase 3) | 13 | 25 | 3 | 0 |
| Media player and shows (Phase 4) | 10 | 7 | 0 | 6 |
| Light, sound and voices (Phase 4, 6) | 12 | 7 | 1 | 1 |
| UI and tablet (Phase 5) | 2 | 6 | 3 | 2 |
| Performance and Android | 1 | 2 | 0 | 1 |
| Multiplayer (Phase 7) | 0 | 0 | 9 sections | 1 (account) |
| Process asks | 15 | 1 | 0 | 0 |

## 1. Architecture, environments, geometry, props (Phase 1)

### What the new geometry tests found (2026-11-05)

`tools/dev/seethru.mjs` draws the game's own meshes from every place a player can stand. A flood fill finds those places by moving
like the player: the game's wall bands, steps of at most 0.42 m, doors, the lift. From each place it draws six 90° views twice in
depth: front faces only (what the game draws) and both sides. A pixel where a back face is nearer than every front face is
see-through. A pixel with nothing drawn shows the void. A second pass draws every view twice with the draw order reversed: a pixel
whose nearest face changes is visible z-fighting. Before the fixes, 4,615 eye points were checked for see-through and 2,573 for
z-fighting.

| Defect | Where | Cause |
|---|---|---|
| Void round every closed hall door (jambs, head, sill) | spine (exits), corridor (entrances) | the 0.2 m between the wall face and the door leaf belonged to the hall's model, which is not drawn while its door is shut |
| 2 cm slit between the two leaves of every pair of doors | all hall doors | each leaf 1 cm short of the centre |
| Void under raised exit doors and in 3 cm slots beside them | spine | the wall lining was cut wider than the door frame and not below the sill |
| Corridor walls on the wrong side of their line | east corridor (CLASSIC, 270), west outer walls | a reversed side flag: the diamond relief and gold light lines faced into the halls' walls (invisible), and the CLASSIC and 270 linings shared the halls' outer faces (flicker at those entrances) |
| No side face on the aisle steps where they rise above the seat platform | all four halls | the builder made treads and risers only, so from a seat you looked under the step |
| Floors overlapping at doorways | lobby floor 0.4 m into the restrooms, the spine and the plaza; plaza over the kerb | slab overhangs |
| Threshold strips z-fighting | every hall exit and entrance | the wall's sill piece in the floor's plane; the rear floor 5 cm into the rear wall |
| Corner faces z-fighting | lobby facade corners, lift shaft corners | walls overlapping at corners |
| Facade slots 0.4 m wide | both ends of the lobby facade | the street's cladding stopped 0.4 m short |
| Drop-off bay at the kerb's height | street | the bay's top was at 0 m, the game's floor at -0.15 m: the taxi's wheels sank into it |
| Lift cab floor flickering | lift at ground level | cab floor and shaft floor in one plane |
| Screen seen from behind is a hole | the passages beside each screen | the picture is one-sided |
| Curtain backs invisible | CURVE, CLASSIC | one-sided cloth |
| Camera inside the escalator truss | under both escalators | you could walk in under the truss where its underside is below head height |
| Glow strips z-fighting at a distance | corridor ceiling channels | 2 mm offsets |
| EXIT signs invisible | spine | the green signs faced the wall |
| 270 side panels black when no film plays | 270 | the projection layer was opaque |
| Hedge planters half see-through | street, lobby | Kiln wound about half of each leaf clump's faces inwards (the normals were right) |
| Holes in the taxi, rope ends, bollard rings, lamp arm, sofa roll, tree trunk | street, lobby | open shells drawn one-sided (the GLBs mark them double-sided; the engine ignored it) |

The Blender gate (`gate.py`) passed most of these, because it ray-tests one room's model against itself. Doors and the visibility
between rooms only show up in the engine.

### Rows

**1, tested:** A2 palettes (R), A5 taxi always there (R), A8 coloured exterior (R), A13-A15 each hall one model (T bake hash, R), A16
escalators can't be skipped (W), A17 working lift (W), A21 no rails through seats (R), A23 exit barriers (R), A24 closed doors block
(W), A26 middle seat in every row (T), A27 curve sag 11 % (T), A28 sofas and classes (R), A29 bins (R), A38 stanchions on the floor
(R), A39 spaces redesigned (R), A40 screen placement (R); new: every non-opaque material listed and checked (T, static report:
glass, rain, seat ring, sparks, 270 layer); new: a stale bake can't be committed (T, `check-bakes.mjs`); new: rooms have no faces
wound against their normals (T); new: no prop part wound against its normals, open parts drawn two-sided (T, `seethru.mjs --assets`).

**2, defective or incomplete:**
- A1 Dolby corridors: the bridge is right (R). The east legs and west outer walls lost their relief and light lines (wrong side).
  Fixed in the builder; re-bake running.
- A3 brand mark: the gold wordmark only, no new logo.
- A9-A11 halls and lobby feel premium: rebuilt; needs your eye on the phone.
- A12 every model rebuilt: rooms rebuilt, props reused from v7/v8.
- A18 270 hall: side panels black without a film. Fixed in the engine; re-test pending.
- A19 no see-through spaces: see the table above. Fixes in, re-test after the bake.
- A25 stairs: the aisle steps had no side faces. Fixed in the builder; re-bake running.
- A30 seat LOD popping: hysteresis in code, no test of switching while moving.
- A31-A37 photos 1-7: rebuilt, no before/after renders of the photos yet (7 rows).
- A41 concession machines: v7 machines.
- Collision matches the model: walls come from the model (W); the escalator underside was missing (fixed, re-walk pending).

**3, not implemented:** A4 app intro animation, A6 luxury taxi, A7 car interior and driver, A20 new popcorn models.

**4, blocked:** look and frame rate on the phone (device check).

## 2. NPCs (Phase 2)

**1, tested:** N3 arrivals spread over the countdown (eval: 56 seated, 1 walking, 13 due), N11 different clothes (R), N13 row lanes
(T), N15 no glowing faces (R), N16 audience faces the screen (R), N21 233 lines in four languages (T), N24 applause is a real recording
(the file).

**2, defective or incomplete:** N1 animations (same library, fixes only), N2 eye drift (fixed in code, no test over time), N5 voices
(English 285 of 355 clips, 70 missing; still synthetic), N6 speech radius (code only), N7 walkers pass through each other (they only
wait), N8 sitting (partial), N10 rigging (partial), N12 laughs and screams synthesised, N14 own seat only (code only), N17 body
language (partial), N19 density switch (code only), N23 voices follow the language (code only), N25 tight spaces.

**3, not implemented:** N9 new bodies.

**4, blocked (phone):** N4 device cost of spawning, N18 lag when the audience enters, N20 crowd cost, N22 voice clarity.

## 3. Usher, server, flow, money (Phase 3)

**1, tested:** G5 no arrow (R), S2 and S11 server route down the side aisle and along the row (one seat walked, W), S12 room between
rows (T), F2-F4 one-way doors (T nav graph, W), F5 slower way in, quicker way out (W), F6 exits beside the screen (W), F7 Flow mode
name (R), F8 Quick play starts in the lobby (R), M2 Indian prices and M5 sofa prices (R, booking sheet).

**2, defective or incomplete:** G1 usher speed and waiting, G3 gate and lift need the ticket, G4 escort then "locate my seat" (code
only, not walked); G2 ticket hand-over (gestures, no 3D ticket); S1 server inherits the NPC defects; S3 speaks only near you, S7 speed,
S8 turns back for the bell, S13 "anything else?", S14 takes your trash (code only); S4 and S10 no hand-over animation; S6 tablet
improved, not reviewed by you; S9 a plain cart, nothing on it; F1 the full flow never walked end to end; F9 sit on any seat, F10 order
from the tablet, F12 jump to your seat, F13 bin from the tablet, F14 pick a chair before the film (code only); F11 no seat swapping;
M1 no wallet, M3 ₹99 tablet, M4 no bell with the tablet, M6 order instead of calling (code only).

**3, not implemented:** S5 conversation panel unchanged, S15 a 3D tablet handed over that powers on, A7 taxi interior and driver
(also in section 1).

## 4. Media player and shows (Phase 4)

**1, tested:** P3 your videos through the app's server (J: full file and byte ranges; Chromium played WebM, MKV and MP4 through it),
P7 no blurred border, P10 no blank picture when turning, P11 no black picture up close (R: the picture is part of the scene), P8 no
crop (R), P15 film grid (R), P18 open films kept (R), P21 pre-show card (R), P22 10 s countdown with the lights going down (R), P23 2 %
during the film (R).

**2, defective or incomplete:** P1 scrub preview (no test), P2 the preview is still a second video (heavy), P12 a new film keeps the
curtain open (code only), P14 search (code only), P16 long titles get an ellipsis, P19 full resolution while watching (code only), P20
250 % with a limiter (distortion not measured).

**4, blocked:** P4 lag and P5 quality (phone), P6 sound sync (phone), P9 frozen picture after leaving the app (phone lifecycle), P13
YouTube (not reachable from this machine), P17 Blender films over Wi-Fi (archive.org answered 503 here; tested only against a local
server).

## 5. Light, sound and voices (Phases 4 and 6)

**1, tested:** L2 screen light on every surface, L3 light by position on the screen, L5-L7 spill in MAX, CURVE and CLASSIC, L10 no
chandelier, L11 both restrooms the same, L12 curved coves (R); L13 restroom and L14 taxi sounds are real recordings (the files); L15
seat shake and L16 sparks only on strong cues (T, director).

**2, defective or incomplete:** L4 wall spill strength (tuned on SwiftShader only), L8 realistic light (partial), L17 crowd volume, L18
voices switch, L20 particles switch, L21 shake switch (code only), L19 clapping only through the crowd volume.

**3, not implemented:** L9 reflections still at the old default.

**4, blocked:** L1 the spatial "Lumière Sphere" sound needs listening on the phone.

## 6. UI and tablet (Phase 5)

**1, tested:** U1 centre dot (R), U13 tablet tiles (R).

**2, defective or incomplete:** U2 actions when aiming (code only), U7 settings clarity, U8 instant settings (code only), U9 tutorial
(same steps, new text), U10 skippable (code only), U11 floating UI.

**3, not implemented:** U4 and U5 layout editor and its size control, U12 a 3D tablet with a main menu.

**4, blocked (phone):** U3 cutout insets, U6 top row overlapping.

## 7. Multiplayer (Phase 7)

Nothing in the multiplayer addendum exists yet. Not implemented: (1) hosting through a managed free tier, (2) lobby and rooms, (3)
avatars, (4) text chat and moderation, (5) proximity voice, (6) cinema sync, (7) network performance, (8) the QA list, (9) the
architecture review.

**What it needs from you (no payment).** Every managed service with a free tier needs an account and an app key that only the owner
can create; Photon, Firebase, Supabase, Ably and LiveKit all work this way. That is the one step this machine cannot do. Before any
code you get a short list of options with their trade-offs, for your approval. Each option is judged on three tests:
1. Can two or more real clients be tested here, for example against a local emulator of the service?
2. Is the free tier unable to send a bill (no card on file, hard limits)?
3. Will voice work on Indian mobile networks without a paid relay server?

## 8. Performance and Android

**1, tested:** X3 diagnostics in How to play (R).

**2, defective or incomplete:** X1 "peak low" optimisation (13-55 draw calls in renders; never measured on the phone), X2 low-lag
switches (code only).

**4, blocked:** frame rate, memory and heat on the phone (device check).

Measured here: the prop fixes cost little at startup. The scan for open parts runs offline (`TWO_SIDED` in `assets.js`, checked by
`seethru.mjs --assets`).

## 9. Process asks

**1, tested (documents exist):** R1-R9 research (docs/V9-DESIGN.md), R10 what people like most and R11 Irusu and perception (same
file), R12 licences (docs/LICENSES.md), R13 skills reviewed (docs/SKILLS.md), R14 surprise bundle (rain, your film on the marquee,
ticket stubs; R), R15 drawings before models before code.

**2:** R16 "finish in one pass" (47 rows were partial).

Security, still open: the APK signing key is in this public repository (`tools/keys/`). Rotating it means uninstalling the app once,
so it waits for your decision.

## Phase plan

Each phase is finished before the next starts: models, function, interface, animation, sound, integration, optimisation, tests and
fixes. A phase closes only with test evidence here **and** the phone check below. Until then it is "complete pending device check".

| Phase | Scope | Depends on | Done when |
|---|---|---|---|
| 1 Architecture and environments | every room, door, stair, floor and prop: see-through, z-fighting, normals, culling, transparency, collision, LOD; popcorn models (A20), machines (A41), photo renders (A31-A37) | none | see-through, z-fight, gate and prop checks clean; walking routes pass; multi-angle renders; device bench run |
| 2 NPCs | bodies, rigs, animations, avoidance, sitting, tight spaces, crowd cost | 1 (seats, routes) | N rows in category 1; crowd profiled |
| 3 Service workflow | taxi interior and driver, usher, server and cart, tablet hand-over, modes, money | 1, 2 | every step of Flow and Quick play walked in a test |
| 4 Media player and shows | playback, previews, YouTube, offline films, show states, spill | 1 | P and L rows; sync and resume measured on the phone |
| 5 UI and tablet | layout editor, 3D tablet, settings, tutorial | 3, 4 | U rows |
| 6 Audio | the 70 English clips, laughs and screams, room sound, mix | 2, 4 | listening check |
| 7 Multiplayer | provider choice (your approval first), lobby, rooms, avatars, chat, moderation, proximity voice, cinema sync | 2, 3, 4, 5 | the addendum's QA list with two or more real clients |
| 8 Remaining | logo and intro animation (A3, A4), luxury taxi (A6) | 1, 3 | rows closed |
| 9 Performance audit and release | profiling on the phone, memory, loading, the final APK | all | device numbers; APK built once, at the end |

## Device check (needed to close a phase)

You asked for no APK per phase, and for each phase to be checked on the phone. Both work if you run the game in Chrome on the phone
from Termux. Phase 1 adds a `?bench=1` route: it flies a fixed camera path through every room and shows the frame rate, the slowest
frames, draw calls and triangles, with a short code to paste back. The exact commands come with the Phase 1 report.

## Development record

- **2026-11-05.** Committed the pending v9 fixes (6378102). Built the geometry test tools: `seethru.mjs` (see-through, z-fighting,
  props, player reachability) and `check-bakes.mjs` (stale bakes, now part of `run-tests.sh`). Ran them on the whole building (table
  in section 1).
- **2026-11-06.** Fixed in the builder: corridor wall sides, door reveals in the spine and corridor, aisle step side faces, slab
  overhangs, wall corners, thresholds, facade slots, the drop-off bay, rail posts, lift shaft corners, EXIT sign direction. Fixed in
  the engine: door astragal, screen back, two-sided curtains, lift floor, escalator underside, 270 projection layer, glow depth offset,
  prop winding and open parts. Re-bake of all nine rooms started (Cycles, about 30 minutes a room on this machine).
- **2026-11-06, later (v9.1 realism pass, after the user's message on empty spaces, textures, lighting, exits, theatre size and
  ScreenX).** Rollback point committed first (87ac84e, walks 16/16). Then:
  - *Theatre size.* Every picture is now nearly wall to wall; the halls grew to keep their seats (hallmath.js HALLS: MAX 29.2 m wide,
    24.0 x 12.6 m picture, 443 seats; CURVE 25.2 m, 20.0 x 10.0 m at 2.0:1, curve deepened to 13 %; CLASSIC 20.8 m, 15.6 x 8.4 m;
    X-270 21.2 m, 16.0 x 8.4 m). Middle row, horizontal angle of the picture: MAX 56.7 degrees (was 54.4), CURVE 61.9 (a 16:9 film 56.2, was 43.7), CLASSIC
    54.6 (was 47.0), X-270 54.6 (was 48.5). UNIC row-1 top angle stays under 45 degrees (42.5-44.5).
  - *Exits.* An open, lit bay at each front corner, beside the picture, with the push-bar door in the screen wall at its back, a light
    lining, a downlight plus a dim egress light that stays on through the film, a floor light line leading in, and an illuminated EXIT
    sign (ISO 7010-style running figure) over the bay's mouth and over the door. v9 hid the door in a black slot behind the masking.
    The corridor and spine extents follow the new hall sizes (building.js derives them now).
  - *ScreenX-style hall (X-270).* Plain light grey projection surfaces on both side walls from the bay to 74 % of the depth (bottom edge
    following the rake), four ceiling-hung projectors per side, a teal line under each surface; during a show the film's edge bands are
    mirrored onto them from a 256 x 128 copy of the picture (sharp near the screen, softer towards the back). Checked playing a test
    film (tools/dev/showshot.mjs): both walls carry the picture.
  - *Hall walls.* Per hall: MAX walnut wainscot, dark fabric, blue light joints; CURVE cognac leather wainscot, navy fabric between
    champagne pilasters, warm up-light; CLASSIC charcoal dado, brass rail, burgundy fabric in cream mouldings, brass sconces; 270 graphite
    behind its side screens. Wall washers on every panel, surround speakers every other joint, a projection port in the rear wall.
  - *Textures.* Ten new CC0 scans with roughness maps (ambientCG, Poly Haven; tools/textures/SOURCES.md, docs/LICENSES.md): painted
    plaster on every painted surface (was a flat colour), travertine, oak, black-and-gold marble, microcement, powder-coated metal,
    restroom wall and floor tiles, light stone; composites: the lobby floor in crema marble tiles cut from different parts of the scan,
    the corridor carpet's diamond lattice. Unused layers dropped (35 layers, net +2). Shader: roughness from the scan, large-scale tone and
    gloss variation (medium, high), de-tiling of organic scans (high) and tile shuffle for designed tile layouts (medium, high).
  - *Lobby.* Marble floor with a black-and-gold border, travertine poster wall with five lit poster cases, marble columns, a teal lounge
    rug, wayfinding (screens, restrooms, tickets, food), "exit only" over the spine door, waiting areas with tub chairs, side tables
    and torcheres, the ribbon chandelier, LUMIERE letters over the counters; lounge sofas now face their table (they stood radially).
    NPC paths go round the lounge (four nodes), and walk.mjs now fails if any NAV edge passes within 0.25 m of a wall or a prop.
  - *Corridor, spine, restrooms, street.* Patterned corridor carpet, grazing wash on the diamond walls, a "coming soon" poster gallery;
    spine in light terrazzo with a poster gallery between the exit doors; restrooms with large-format tiles, walnut vanities, vessel
    basins and brass taps, urinals, hand dryers and closed cubicle doors (v9 had only interaction points); facade poster cases,
    stone uplighting, brand letters over the canopy, more trees.
  - *Light.* Reflections softer (0.32 from 0.45), screen light on the walls stronger (6.5 from 5.5); house lights in a film stay at 2 %.
- **2026-11-06, v9.2 halls (after the user rejected v9.1b: "did not change anything", then "fix it rather than revert").** v9.1b
  (bigger pictures, exits in the screen wall, ScreenX modes, watch zoom) is the base again (ac344af). Then:
  - *Seats.* Four new models in `tools/blender/seats.py` (stadium rocker + armrest, club recliner + console) built from subdivided
    pillow forms (`lbl.py` `pillow`, `grid_box`, `subd`): crowned cushions, piped welts, stitched back channels, wings and lumbar, a
    moulded shell, cup holders with a glow ring; LOD1 cages for far rows. Per-hall upholstery (world9.js `SEAT_SWAP`): MAX navy-black,
    X-270 deep red, CURVE espresso; CLASSIC keeps its seats.
  - *Seat light.* The instanced seats took screen light with a fixed screen direction (-z); the halls face +-x, so seats facing their
    screen got almost none. Each hall now passes its own direction (`uScreenN`, materials.js).
  - *ScreenX (X-270).* An ordinary film wraps the three walls: the front shows its middle 80 %, each side screen the outer band at the
    front's vertical scale, softening towards the back. A panoramic film (2.8:1 and wider) fills the front screen at full height and each
    side screen carries one outer band (it was a pillar-boxed middle third). A YouTube video keeps the walls dark (no frame access).
  - *Fast exit.* Stepping from a hall into the spine fades out and puts you at the spine's mouth in the lobby (main.js `fastExit`).
  - *Tests.* MAX row A may look up 35 degrees (IMAX-shaped picture). walk.mjs expects exactly one fast exit on the exit walks and none
    elsewhere. The corridor was stale: X-270 and CLASSIC grew 0.9 and 0.8 m deeper in v9.1b and their entrance doors moved, but the
    corridor was never rebuilt, so its old door jambs stood inside both halls (walkers stuck at the X-270 entrance). Rebuilt and
    re-baked; new check `build.py --check` (in run-tests.sh) builds every room from the current spec in memory and fails when one
    differs from its bake.
