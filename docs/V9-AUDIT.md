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

**Built in v9.3 (2026-11-06), with no account, no key and no server of ours.** The user asked for hosting, a player selector,
avatar choice, "my API key must not leak" and "every player shares some usage". Trystero 0.26 (MIT, `www/vendor/trystero.mjs`)
finds the other phones through public Nostr relays, which carry only the WebRTC handshake; after that the phones talk to each other
directly. Nothing in the app is a secret: there is no key to leak.
- *Rooms.* "Play together" on the menu: your name, your look (23 photographed people, portraits in `www/models/rb/portraits/`), host
  (a six-letter code without 0/O/1/I) or join with a code. A badge in the game shows the room and the number of players; the room panel
  lists them, the host starred.
- *Sharing the load.* Each phone sends only its own player, ten times a second (position, facing, walking speed, seat, room). The host
  keeps the shows in step; when the host leaves, the player who has been in the room longest takes over (every phone reaches the same
  answer from the same list), and keeps the show going for anyone who joins later.
- *Your look.* Besides the person, an outfit colour (8 + as photographed), a hair colour (7 + as photographed) and a height (5 steps),
  shown on a live turning preview in the panel (drawn by the game's own renderer: no second GPU context). The dye keeps the photo's
  shading and leaves skin alone (each person's skin tone is sampled from their face texture). Others see your look.
- *Other players* are drawn by the people renderer with their AI switched off: they walk, sit in the seat their phone reports, wave,
  clap, cheer, and their chat appears as a toast and a speech bubble. Names float over their heads.
- *Shows together.* When the host books a house film, a YouTube video or a web link, every phone books the same hall and starts at the
  same moment of the host's clock. A late joiner starts where the room is. While a shared film plays, each phone nudges its picture
  (up to 10 % faster or slower) towards the room's clock; more than 1.5 s off jumps straight there. Your own gallery videos stay on
  your phone (the others see a note).
- *Safety.* Everything a peer sends is checked before use: names and chat are text only (never HTML), avatars must be one of the 23,
  a shared show must be a house film id, an 11-character YouTube id or an https link, start times must be sane. A link played through
  this phone's own media server is never sent (the original web address is). Privacy note in the panel: as in any peer-to-peer game,
  the phones in a room can see each other's IP address.
- *Not built:* voice chat (needs a paid relay on many mobile networks), moderation beyond leaving the room, shared popcorn orders.
- *Tested here* with two and three headless Chromium pages on this machine through the real public relays (connect, see each other,
  chat, emotes, show start, drift, host hand-over, late join). Not tested on two phones yet.

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
- **2026-11-06, v9.3 (the user's 12 photos: "entrances are not like that", "everything feels empty", "ScreenX is connected", "fix the
  curved screens", "add multiplayer, hosting, a player selector, avatars; my API key must not leak").**
  - *People.* Microsoft Rocketbox (MIT): 23 photographed avatars and 22 motion clips converted in Blender (`tools/blender/rocketbox.py`:
    bones renamed to the engine's names, root travel removed at the source, one atlas per avatar, three LODs with the hair protected).
    Staff, guests and the seated audience all use them; the GPU crowd uses one bake per gender.
  - *ScreenX.* One band: the side screens continue the front picture at its own scale from the corner and fade into spill light
    further back (it was split into separate pictures). *CURVE* has a deeper screen curve and an LED line under the screen.
  - *Entrances and corridor (photos 1, 3).* Bronze diamond portals with lit letters and hall numbers, red LED coves, haloed lightbox
    posters, square ring lights, showtime headers, velvet ropes and red armchairs. *Lobby (8-12).* Star ceiling, arched mirrors, a
    blue velvet ring sofa, boucle chairs and palms. *Street (4).* A curved black canopy with light bands and a blue diamond wall.
  - *Playing together.* See section 7. Tested with three headless pages (`tools/dev/mp-sync.mjs`): start 0 ms apart, playback within
    0.02 s, a late joiner within 0.02 s, host hand-over; names over heads, chat and emotes (renders `docs/v9/renders/v93-together.jpg`).
    Found on the way: a shared YouTube video sent no video id and a shared link would have sent this phone's private media-server
    address; both fixed. Not tested on two phones.
- **2026-11-07, v10 (the user, after a film on the phone: "the lighting is too hard, the light bounces too much", "the diamond wall looks
  bad", "the halls, corridors and lobby are empty", "players can reach the lift without a ticket", "make the escalator and lift one area",
  "define the reception, concessions and café, with sounds", "restrooms you can tell by looking", "an unequal entrance door", "a better
  outside", "make the UIs more defined", "the itel P65 and lower").** Research: docs/V10-RESEARCH.md (11 photo sources).
  - *Film playback.* Border lines, freeze after Continue, blank when looking left, sound delay and frame stutter (playcheck.mjs 6/6).
  - *Lighting.* A soft-light curve per room (materials.js `uSoft`), continuous wall washes instead of spot scallops, less screen spill.
  - *Light maps.* The rooms are triangle soups, so every triangle was its own UV island: the lobby used 10% of its map (6 texels/m) and
    thin trims had no texel at all (the brand ring's brass edge baked black in 65 of 96 triangles). bake_room.py now unwraps a welded copy
    and stretches islands under 3 texels: 59% used, 14 texels/m, 7 dark triangles left on that edge.
  - *Ticket zone.* Glass screens put both escalators and the lift behind the usher's leaf; free-exit half leaves let you out. walk.mjs:
    7 ways in all blocked with the gate shut, out by the down escalator and by the lift, 25/25 walks.
  - *Lobby.* Fountain on the entrance axis with light columns, a café kiosk with a barista (latte, cappuccino, espresso, hot chocolate)
    and its own sounds, pendant clouds, rugs, a popcorn cart, standees, a mural, café art, two-metre restroom pictograms, a seating corner.
  - *Corridor.* Fluted walnut portals with brass inlays and a lit reveal (no diamonds), benches, palms, standees.
  - *Outside.* Symmetric facade bays round the doors, gold fins on navy instead of blue diamonds, a lit cornice, a red carpet, light
    columns at the doors.
  - *Inputs and together.* Keyboard and mouse, controller, phone VR; host hand-over, one server queue, hide names, quiet chat.
  - *UI.* Crisper surfaces and contrast; the menu fits the phone's 360 px height (it cut off the wordmark and Credits).
  - Not tested on a phone. Renders are headless SwiftShader.
- **2026-11-15 (v11, the user: "Fix this issue of the board not being in middle ... i wont accept disconnected models ... neither will i
  accept z FIGHTNING").**
  - *The way-out board* in the escalator hall is centred on the portal (it was centred over the exit leaves).
  - *Z-fighting, measured instead of sampled.* New gate `sh tools/dev/zcheck.sh`: the engine writes every reachable eye point (8,682) and
    its own meshes as triangles; `tools/blender/arch/zcheck.py` builds the nine rooms, finds every same-facing face pair under 5 mm apart
    (`coplanar.py`) and keeps those a player can see (BVH rays, glass see-through) from far enough for the 24-bit depth buffer (near
    0.1 m) to merge them. The render scan had sampled about 40 pairs; the exhaustive count was 299 visible places in the rooms and 130 in
    the engine's meshes. Rooms now: 0. Fixed in the builder: corridor portal trims (end caps 1 cm past the panels, no edges on the lintel
    panels, inlays 6 mm proud), hall side walls between the end walls, curtain pelmet bars, ceiling ring seams (`geo.sweep` welds closed
    loops), star fields with no two stars on one spot, the canopy's mitred band, the core hall's east wall end, the gallery beam, kiosk
    base, lift architraves, zone inlay and its brass line, floor inlays 5 mm proud, the restroom portal base, the arrival video wall,
    the exit landings (the frame hung 7 cm past them; building.js `lh`, world9.js stairY).
  - *Nothing floats.* `tools/blender/glb_check.py` checks every prop model's parts for contact and coplanar faces; 18 placed models had
    parts standing 1.5-14 mm off their neighbours or hanging free. Remade at the source: hall seats (cushions 5-7.5 mm over their pans, a
    headrest 10 mm over its back, a pan 10 mm over its pedestal, a tip-up seat 23 mm from its back now 30 mm), armrests (4-12.5 mm over
    their standards), the chandelier (its core hung on nothing: a centre rod and spokes), the fountain (water slab 15 cm over the basin
    floor, finial 8 cm over its bowl, streams short of the water), the cake case (every cake 1-2 mm over its shelf, the shelf clear of the
    posts), the espresso machine (body 4 cm over the counter), the popcorn cart (wheels 2 cm off the body: axles), the poster totems (frame
    5 mm off the box and 7 cm over its top; real posters now), the candy wall, the bench, the bistro chair ring, the hall number 4.
    Moved as node offsets (`tools/dev/glb-offsets.mjs`): lamp posts and bollards (5 mm over their collars), bin slats, the popcorn machine's
    top. Door pulls and push bars got posts; vision panels sit in bead rings; the lift has two-speed doors, returns between its walls,
    handrails on brackets and display faces that are their plates' fronts; the restroom cubicles stand on feet with a head rail.
  - *The lift's landing doors* close on a dark nosing (12 mm wide, 5 mm back from both faces): closed, the middle reads as two doors
    (same material, a dark tint: no extra draw).
  - *Every model in www/models checked, not only the placed ones* (85 files): the round mirror's stand-off stood 4 mm off the wall (now on
    it, 2 mm into the glass; glb_check measures wall fixtures from the wall). Three models were loaded at boot but never placed since v9
    (sconce_deco, mirror_round, restroom_set): no longer loaded or packed. Still open: the taxi (rims 3 mm inside their tyres, a body
    with nothing under it), the next item (W5).
  - *Guests keep clear of the staff.* The crowd test caught a guest walking 0.24 m past the greeter: guest spots and walking legs now keep
    1.0 m and 0.8 m from the greeter and the usher, as from another guest's spot (npc9.js `millNet`).
  - *The last eight spots in the engine's meshes.* The hedge planters were a core and 105 clumps whose facets lay 0.2-3 mm apart: the
    hedge is now one closed surface meshed from a field (Kiln `implicitSurface`, 10k triangles as before). Hall numbers and two lit
    signs had folded triangles (an outline doubling back): drawn from both sides (TWO_SIDED) each fought its own back copy, the sliver on
    the hall number 3. `tools/dev/glb-unfold.mjs` removes the folded face of each such pair (7 in 5 models) and keeps everything else in
    the file; glb_check now counts folds. The torchere's bowl had its inner face written mirrored, across the outer one (48 folded
    faces): fixed in fixtures.py.
  - *Validation (headless):* `zcheck.sh` TOTAL visible coplanar 0, visible close 0 (nine rooms and the engine's meshes, 8,692 eye
    points); `build.py --check` and `run-tests.sh` pass (nine bakes current); walk.mjs 26/26; npc-clear 600 s: nobody inside a wall, a
    prop or another person, nobody walked through anyone; props-overlap 0 of 166; the lift's 3D controls check passes; renders of the
    centred way-out board, the lift doors, the totems, the cafe, the fountain, the chandelier, the restrooms, the hedge and the torchere.
  - Known and left: four chandelier ribbons turn back on themselves at a small angle (a twist, not coincident faces: nothing fights).
  - Not tested on a phone. Renders and checks are headless SwiftShader and Blender.
- **2026-11-15 (v11 W5, the taxi at night; the same day's rule: no poorly made models).**
  - *The cabin is modelled* (`tools/blender/cabin.py` -> `taxi_cabin.glb`, 17.6k triangles, 113 parts in one connected group, no
    coplanar faces, no folds): a dashboard lofted from one section with a binnacle pod, a piano-black screen bezel, vents with chrome
    slats, the meter on a stand; a steering wheel (a true torus rim, three spokes, hub, column, stalks); a console with the gear selector,
    two cup holders and an armrest; leather seats from subdivided cages (bolsters, wings, rounded headrests on chrome posts, upholstered
    backs with map pockets); door cards with ledges, armrests, pulls and speakers; pillars, roof rails, grab handles, headliner, visors,
    a rear-view mirror, the scuttle with the wiper pivots and the yellow bonnet on the taxi's own lines. The box-built cabin with its
    ball-headed driver is only the fallback if the model fails to load.
  - *A real driver*: a seated Rocketbox avatar (people.js `STAFF.driver`) with his hands at ten to two (`GEST.drive`, aimed from his
    measured skeleton: they had landed 7 cm past the rim), lit like the cabin.
  - *Night light*: the cabin's own fill drops to a night level, and the strongest street light near the taxi (from the street's own light
    list: lamps, canopy spots, signs) lights the cabin along its real direction, so it slides across the seats and doors as you pass it
    (intro9.js `_sweep`: iLs with the street's screen-light uniforms, which no street surface uses; restored when you get out).
  - *Wet glass*: the windscreen and four door windows draw raindrops (a 2.2 cm grid, each drop its own size and landing time) that catch
    the passing light; the wipers clear the windscreen in step with the blades and the drops come back over 1.4 s; on the side glass the
    drops stretch back with the speed (intro9.js `wetGlass`).
  - *Sound*: rain on the roof from inside the car (BigSoundBank 1293, CC0) and the interior ride recording (`car_ride`, loaded but never
    played until now) while you ride; both stop as the door opens; the synthesised engine drops to 55 % inside.
  - *The taxi's body*: the rims sit 2 mm into the tyres (they stood 3 mm clear), knuckles and struts hold the wheels to the body (it stood
    on nothing), the TAXI letters are one solid each (crossing strokes stepped 1.2 mm in depth), one folded triangle removed from the far
    LOD: 69 parts, one group, no coplanar faces, no folds.
  - *Validation (headless):* glb_check on both models (one group each, no floating parts, coplanar faces or folds). The z-fighting gate
    did not see the taxi at first (quick play never shows it): zcheck.sh now parks the taxi at the kerb for the world pass (262,364 engine
    triangles) and checks the cabin in a second pass from seven eye points round the back seat; both print TOTAL visible coplanar 0,
    visible close 0. run-tests.sh passes; the Story arrival runs through to control on the pavement at (0.6, 25.2) with the cabin hidden
    and the taxi shown; ride renders at 1, 2.6, 4.6 and 7.4 s. The light sweep cannot tint the street: its shell's screen-light factor
    is 0 (`uLmK.z`), and no street surface carries screen light per vertex.
  - Fixed after review: the driver is seated as soon as the avatars are ready (he could stay missing if they loaded after the ride began);
    the cabin went through the optimiser (32,346 -> 20,680 triangles, 942 -> 710 KB, still one group, no fights or folds).
  - Limits: the cabin model loads at boot in every mode, Quick included (710 KB); the five glass panes run a per-pixel drop shader over
    much of the screen, a fill-rate cost not measured on a Mali GPU; the Low preset's ride was not rendered.
  - Not tested on a phone. Renders are headless SwiftShader (the light sweep and the drops move; stills show one moment).
