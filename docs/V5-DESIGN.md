# LUMIERE v5: design and calculations

v5 answers the phone test of v4 (the user's 18 screenshots and notes, 2026-10-29). This file records the research, the numbers and the decisions **before** the build. Every hall number below is produced by `node tools/dev/hall-calc.mjs`.

## 1. What the phone test showed (v4 problems → v5 answer)

| v4 problem (user report) | Cause found in the v4 code | v5 answer |
|---|---|---|
| Z-fighting, worst on doors | Door leaves overlap glass/frames; coplanar trims; `stencil:false` can give a 16-bit depth buffer on phones; near plane 0.12 | `stencil:true` (packed 24-bit depth), near 0.1 / far 140, builder never emits coplanar overlaps, decals offset ≥ 8 mm |
| NPCs have no walking animation; seated NPCs look standing | LOD1/LOD2 people geometry swapped onto the SkinnedMesh; poses barely visible at a distance | New characters: every LOD rigid-skinned to the same skeleton; new pose library with real walk / sit / stand transitions |
| Player stands up instantly | `standUp()` teleports | Animated stand: rise 0.9 s then step out 0.6 s; sitting slowed to 1.3 s with a lean |
| Loading screen, UI, colours look "vibe-coded"; no main menu | Gold-on-brown art-deco everywhere | Clean UI: dark glass panels, white text, one accent (coral red `#FF4D5A`), Inter; real loading screen → main menu → game |
| Medieval / spooky environment, cheap lighting | Brown plaster, heavy gold, 8 per-pixel point lights, near-black fog | Modern premium multiplex: bright open double-height lobby, glass street front, terrazzo, oak, white ceilings; baked lighting |
| Hall architecture wrong, "no middle" | Shallow 0.2 m rake, centre aisle, door at the back | Stadium halls computed to UNIC rules, **crossing aisle in the middle at entrance level**, side aisles with steps, light-lock passages |
| Audience not reactive, no sounds, screams at random | Random timers | Film-event detector (authored cues for house films, live audio analysis for your own video) + crowd contagion |
| NPCs sit in other halls for no reason | All halls primed at boot | Halls are empty until a show is booked/starts; viewers materialise only when you come near |
| Faces/clothes scary | Painted realistic faces on SDF bodies | Friendly stylised people (Two Point Hospital-like proportions), expressive faces (blink, smile, O-mouth scream) |
| Lines are sloppy | Generic text | Rewritten dialogue with sarcasm, in English, हिन्दी, اردو, Español |
| Bar / popcorn don't feel like places; no popcorn handed out | Counters against one wall | Separate bar-café zone and a concession stand; the vendor scoops, hands you the bucket, you hold and eat it |
| Curved / IMAX screens don't feel curved / huge | 7.5% curve hidden by flat masking; IMAX 19 m wide but shallow rake | Curved: 8% chord depth + curved masking, valance, stage and **curved seat rows**; Giant: 20 × 10.5 m, 1.90:1, steep stadium, floor-to-ceiling |
| Reserve card covers half the screen | Big centred card | Removed; the receptionist's prompt and a compact sheet |
| App doesn't rotate to landscape | Manifest `screenOrientation = unspecified` | Manifest patched to `sensorLandscape` (6) |
| Audio transitions late | Film level switched per room | Continuous occlusion from distance, passage and door openness |
| LOD bad; turns pitch black | Light slots fade to 0 on every room change; black fog; rooms hidden | No light slots (baked), coloured fog, wider portal visibility |
| Lags although small | 8 per-pixel lights × complex shader × 1.5 render scale; 9 × 6,500-triangle skinned people | Baked per-vertex light (no runtime lights for the building), instanced far audience (1 draw call), quality presets |
| Walking into pillars and paintings | Pilasters / wall props without colliders | Every protruding prop gets a collider |
| Projector beam ugly | Huge additive cone | Removed; only the porthole glows |
| Usher wanders and teleports | Random patrol | Stands at a lit "Ask me" guide stand, walks you to your row, walks back |
| No settings, no language, no hide-UI, fullscreen button useless | — | Settings (sensitivity, invert, graphics, brightness, volumes, language, FPS), hide-UI button; fullscreen button removed (the wrapper is already immersive) |

## 2. Research (sources)
- R. Gjestland, *How to design a cinema auditorium*, UNIC 2nd ed. ([PDF](https://www.unic-cinemas.org/fileadmin/user_upload/Publications/UNIC_handbook_online_02_20__1_.pdf)). Used rules:
  - First row: D1 ≥ 0.6 W (80° field, comfortable), never < 0.5 W (90°).
  - Row 1 eye (1.2 m above floor) to picture centre ≤ 25°, to picture top ≤ 45°.
  - Horizontal angle from any seat to screen centre < 45°.
  - Sightline clearance c: ≥ 0.20 m good, 0.15–0.20 acceptable. Riser formula Yₙ = Xₙ(Y₁/X₁ + c Σ 1/Xₘ) − c.
  - Row distance ≥ 1.2 m; recliners 1.6–1.8 m. Steps ≤ 0.20 m; one deep step at row level then short steps.
  - Curved screens: about 5% chord depth. ≤ 10 seats between a wall and an aisle is "comfortable"; up to 30–50 between two aisles.
  - Crossing aisle at entrance level: discreet entrance, wheelchair access, extended-legroom row behind it.
  - Vestibule (light lock), matte black; walls from row 1 to the screen black; house light 150 lux full / 50 lux pre-show / 0.
  - Stair lights: LED under the nosing. Depth behind the screen ≥ 1.0 m.
- EDCF best-practice guide (row distance definition) ([PDF](https://edcf.net/edcf_docs/EDCF_ABestPracticesGuide_Architecture_Seating.pdf)).
- SMPTE ≥ 30° / THX ≈ 36° viewing angle from the last row ([Sound & Vision](https://www.soundandvision.com/content/screen-size-and-seating-distance)).
- Giant-screen practice: IMAX conversion patent quoted at ≥ 55° horizontal field; GSCA last row ≤ screen width; steep rake ([Cinema Treasures discussion](https://www.cinematreasures.org/theaters/13786/comments)); laser IMAX at 1.90:1 ([kinonow.de](https://kinonow.de/en/imax)).
- Premium large format rooms: black, curved screen, recliners ([What Hi-Fi](https://www.whathifi.com/features/6-things-we-learned-brand-new-dolby-cinema)).
- Lobby planning: queues must stay inside, free-roaming concessions, lounge-like waiting, separate café-bar ([Georgia Tech Fox Theatre study](https://capstone.isye.gatech.edu/node/5881), [Design Clarity: Cinestar](https://designclarity.net/projects/cinestar-dortmund), [Architizer: INOX PVR Prism](https://architizer.com/projects/inox-prism/)).
- Crowd reactions: context-driven reactions at the right moment, never cheer and boo at once, subtlety and intensity levels ([US 11341689](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/11341689), [Antfood US Open](https://antfood.com/work/ibm-espn-usta)).
- Phones: ask for a stencil buffer to get a packed 24-bit depth buffer ([Khronos public_webgl](https://www.khronos.org/webgl/public-mailing-list/public_webgl/1103/msg00033.php)); bake static light, keep runtime lights ≤ 3 ([Unity mobile tips](https://unity.com/how-to/mobile-game-optimization-tips-part-2)).

## 3. Hall calculations (`node tools/dev/hall-calc.mjs`)
Entrance level (crossing aisle, concourse, lobby) is y = 0. X = eye-to-screen distance.

| | SCREEN 1 Standard | SCREEN 2 Curved Premium | SCREEN 3 Giant (IMAX format) |
|---|---|---|---|
| Picture | 12.0 × 6.49 m, 1.85:1, flat | 14.0 × 5.86 m, 2.39:1, chord depth 1.12 m (8%), R 22.4 m, arc 36.4° | 20.0 × 10.53 m, 1.90:1, chord depth 0.5 m (2.5%) |
| Seats | 11 rows × 18 = 198, row 1.2 m | 7 rows × 14 recliners = 98, row 1.7 m, rows curved R 24 m | 9 rows × 30 = 270, row 1.2 m |
| First row X, D1/W | 7.4 m, 0.62 ✓ | 8.4 m, 0.60 ✓ | 9.0 m, 0.45 (giant-screen practice) |
| Row 1 → centre / top | 22.4° ✓ / 40.3° ✓ | 19.2° ✓ / 34.9° ✓ | 27.4° / 47.8° (front rows of a giant screen) |
| Field of view first / last row | 78° / 32° (SMPTE ✓) | 80° / 39° (THX ✓) | 96° / 53° (last row ≈ W) |
| Clearance c | 0.18 m, every row | 0.18 m | 0.18 m |
| Floors (front … last) | −1.98 … 0 (row G = crossing aisle) … +1.49 | −1.12 … 0 (row E) … +0.65 | −1.47 … 0 (row E) … +1.50 |
| Risers / steps | 0.24–0.39 (2 steps), 0.55 at the aisle (3) | 0.22–0.38 | 0.28–0.39, 0.56 at the aisle |
| Room (inside) | 14 × 24 m, ceiling 6.8 m over entrance | 16 × 24 m, 7.1 m | 22 × 24 m, 11 m |

## 4. Building plan (metres; +z = street/south, screens north)
- **Lobby** x −14…14, z 0…20, 7 m high, glass street front with sliding doors and a night street outside.
  - West: box office counter (Éloïse) and two ticket kiosks.
  - NW corner: **bar-café** behind an oak slat screen, dark oak floor, pendants, backlit bottle wall, stools, lounge chairs (Odette).
  - East: **concession stand** 8 m long, popcorn machines, drinks fountain, menu screens, queue barriers (Gaston, Priya).
  - Centre: round sofa island under a ring light; LED video wall over the opening to the concourse; slim white columns.
- **Concourse** x −15…15, z −6…0, 5 m high, bright, wide; usher's guide stand at the opening; poster light boxes; screen signs.
- **Light-lock passages** west (x −13.7…−11.3) and east (11.3…13.7) run north from the concourse; each has a door at each end of its run into two halls at their crossing aisles.
- **Halls** side by side, back walls at z = −6.3: SCREEN 1 x −28…−14, SCREEN 3 x −11…11, SCREEN 2 x 14…30.

## 5. Rendering
- **Baked vertex light.** Every static vertex gets three light terms at load:
  - `house` (dimmable room lights: downlights, coves, washers);
  - `fixed` (always-on: step lights, exit signs, LED strips, menu screens, street);
  - `screen` (form factor to the picture, tinted live by the film colour).
  - The fragment shader is just albedo × light + a cheap material pattern and sheen. No runtime point lights for the building. Surfaces are subdivided (≤ 1 m) so light gradients are smooth. Floors get contact shadows under furniture.
- **People and moving things** use a probe: ambient + one key light evaluated on the CPU at their position every few frames.
- **Audience tiers.** Near viewers are skinned characters. Far seated viewers are one InstancedMesh per hall whose vertex shader animates clap / cheer / gasp / scream / laugh / bounce, with per-instance clothes colours.
- **Quality presets** (Low / Medium / High) set render scale, people LOD distances, max skinned people, blob shadows and texture detail. An optional auto-resolution governor runs on top.

## 6. Crowd AI
- **Film events.** `react.js` turns the film into events:
  - House films carry authored cue tracks (laugh, gasp, scare, tension, climax, sad, end), with matching synthesised SFX.
  - Your own video is analysed live from its audio: short-term vs long-term loudness, onsets, sustained energy, silence. Plus picture flashes from the 8×4 spill sampler.
  - Events: `scare` (sudden +15 dB onset after quiet), `climax` (sustained loud passage that releases), `tension` (rising quiet), `end`.
- **Per-viewer personality:** excitability, delay 0.1–0.7 s, and contagion (neighbours reacting raise the probability).
  - Reactions: scream + hands to face, gasp + lean back, cheer + arms up, applause, laugh, "aww", shush.
  - They never fire without an event; cheers and boos are never mixed.
- **Shows.** Halls are empty when idle. Booking a show creates the audience plan; viewers walk in from the street during the pre-show. Anyone you can't see is simulated abstractly and appears seated when you come near.

## 7. UI
- **Flow:** loading screen → main menu (live lobby flythrough behind it) → play. Pause menu with resume, settings and quit to menu.
- **Settings** (saved): look sensitivity, invert Y, graphics preset, auto resolution, brightness, master / film / crowd volume, language (EN / HI / UR right-to-left / ES), show FPS.
- **HUD:** location chip, ticket chip, hide-UI, menu, joystick, sprint, context action. No fullscreen button.
