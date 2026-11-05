# LUMIERE v9 design: research, calculations, layouts

Written before any model or code, as asked ("research first, models second, core third"). Every number here comes from the
sources in section 1 or from the spec code (`www/js/hallmath.js`, `www/js/building.js`), which the Blender builder and the game both
read. Drawings: `docs/v9/plan-G.svg`, `docs/v9/plan-L1.svg`, `docs/v9/section-*.svg` (regenerate with `node tools/dev/plan.mjs`).
Ask-by-ask status lives in `docs/V9-CHECKLIST.md`.

## 1. Research

### Auditorium geometry (UNIC, "How to design a cinema auditorium", Gjestland, 2nd ed.)
- First row: eye at least 0.6 x picture width (2.39:1) and never under 0.5 x; for 1.85:1 the height decides.
- Row 1 eye to picture centre at most 25 deg (we allow up to 30); to the picture top at most 45 deg; wheelchair places at most 35 deg.
- Any seat to the picture centre at most 45 deg sideways; the comfortable cone is +-15 deg.
- Sightline clearance c: 200 mm or more is "good", 150-200 acceptable, under 120 unacceptable. Individual riser per row:
  `Y_n = X_n (Y_1 / X_1 + c * sum 1/X_m) - c` (formula 4.7). Eye height 1.2 m for tip-up seats.
- Row distance 1.2 m or more lets people pass a seated person without standing up; recliners need far more (we use 1.92 m).
- Aisle steps: risers under 0.4 m get 2 steps, under 0.6 m get 3 (we cap each step at 0.18 m, treads 0.30 m).
- Walls from the first row to the screen should be black; side speakers every 1-2.5 m at 2.5-3.5 m height; room height about
  0.85 x width.

### Formats
- **Giant screen (IMAX-like, "LUMIERE MAX").** The screen fills the field of view: wall to wall, close to the floor, with a steep
  rake. Seats sit within about 1-1.4 picture widths. The inspiration photos show balcony pods with curved walnut shells and warm
  underglow (Theatre Pods), blue accent light and a black star ceiling.
- **Panoramic side walls (ScreenX-like, "LUMIERE 270").** Five projectors extend the picture onto both side walls for 270 deg
  (Wikipedia; Regal; Cinemark). Side walls are light matte panels; the middle seats are the best.
- **Premium large format, Dolby Cinema style.** Dark, black interior, a curved video-wall entrance tunnel, recliners, object-based
  sound (Wikipedia: Dolby Cinema). The user's point: Dolby separates its halls with escalators so the halls can be big.
- We use our own names (MAX, CURVE, CLASSIC, 270, "Lumiere Sphere" sound). IMAX, Dolby, Atmos and ScreenX are trademarks of their
  owners and appear nowhere in the app.

### Real visit flow
Kerb drop-off, door host, box office (or app ticket), concessions, waiting lounge, restrooms, ticket check by an usher at the
gate, corridor to the hall, light lock at the hall door, seat. After the film: the exits beside the screen lead out by a separate
route, so the outgoing crowd never meets the incoming one. Luxury halls add seat service with a call button (in India: PVR
Director's Cut, INOX Insignia).

### Prices (India, 2025-26)
- PVR INOX average ticket ₹273 and average food spend ₹161 per head (Apr-Jun 2026 results, as reported).
- A regular popcorn at PVR costs about ₹430 next to a ₹340 ticket (Reddit, r/IndianCinema).
- Unlimited popcorn offer: ₹390. Weekday food offers: ₹99.
- Convenience fees are charged per ticket online (Reddit, r/indiasocial).
- Our table is in section 6.

### Why Irusu feels better
Irusu VR Cinema is a VR movie player (Play Store: "transforms your smartphone into an immersive Imax theater", rated 3.5 from 2,824
reviews). It does one thing: your file plays on a huge screen, smoothly, instantly, at full quality, with nothing else moving. Lessons
for us:
1. Protect the film above everything: native decode, full resolution, no stutter, no A/V drift.
2. Two taps to a playing film in Quick Play.
3. Nothing may glitch on screen, ever: one visible glitch costs more trust than ten features earn.
4. A steady frame rate beats a high one: cap it (30 or 60) and keep it flat.

### Perception ("psychology") techniques used
- **Response.** Under 100 ms on every tap: press state, sound tick, haptic. Nielsen's limits: 0.1 s feels instant, 1 s keeps flow,
  10 s loses attention. Loads show progress with words, never a frozen frame.
- **Peak-end rule.** People judge an experience by its peak and its end. The peak is the dim-down, countdown and curtain. The end is
  the house lights rising slowly, applause and a keepsake.
- **Anticipation.** The pre-show screen, a 10 s countdown with the lights going down in those 10 s, and a sound swell.
- **Diegetic UI.** The tablet, the ticket, the signs and the screen are things in the world; the HUD shows only a dot and what you
  aim at.
- **Goal gradient.** Signs with distances ("Screen 2, 40 m") and a guide who walks with you.
- **Continuity.** No pop-in: LOD crossfades and distances beyond notice. No hitch: shaders and textures are warmed at load.
- **Social presence.** Lobby murmur, queues, people arriving gradually rather than all at once.
- **Entry slow, exit fast.** Entry is a ritual: escalator up, a long, dim, curved corridor, a light lock, the room opening up.
  Exit is level, bright and short, with a travelator. That matches the user's request (F5) and real crowd-flow design.

### Licensed resources found
- **Crowd and room sounds.** BigSoundBank (Joseph Sardin), CC0 1.0:
  - applause from 40, 150, 300 and 600 people, and cheering;
  - a crowd murmur;
  - toilet flushes, a urinal flush, an electric hand dryer, a running tap;
  - car doors, a car interior at 50 and 80 km/h, an engine start;
  - escalator and lift, popcorn popping, a till beep, a ticket printer, night city.
  - Freesound CC0 laughter was found, but its CDN refuses scripted downloads.
- **Voices.** Chatterbox Multilingual V3 (Resemble AI, MIT; en, es, hi, among 23 languages). It ran here at about 5.7x real time
  on 4 CPU cores. Every clip carries Resemble's inaudible PerTh watermark. Voice prompts come from Kokoro's own (synthetic,
  Apache-2.0) voices, so no real person's voice is cloned.

## 2. What went wrong in v8 (photos 1-13) and the rule that prevents it
| Photo | Fault | v9 rule |
|---|---|---|
| 1, 2 | balcony front was a single plane; seats floated, see-through | every barrier is a closed solid with a cap; the see-through gate (section 8) |
| 3 | big screen's sides empty | masking wall to the side walls, speaker fabric, frame; screen-wall check in the gate |
| 4, 6, 7 | doors and entrances were zero-thickness or back-face-culled planes | walls are solids with real reveals; doors are leaves in frames |
| 5 | exit stair ran into the back of a glass rail | exits are level (front floor = G); stairs only at the entry, along the rear wall |
| 8, 9 | LED lines and rails crossed seats; curved rows vs straight rails | lights only on aisle step nosings and the cross aisle edge; rails follow row arcs; intrusion gate |
| 10 | white chevron facade | sandstone, dark bronze and gold, warm light |
| 11 | display cutout strip; layout editor | full screen with cutout insets; editor rebuilt with size controls |
| 12 | stanchions floating | grounding gate |
| 13 | floor mirrored the chandelier as a red ring and a white blob | reflection strength cut and roughness raised; no planar mirror on the lobby floor |

## 3. Hall calculations
Output of `node tools/dev/hall-calc.mjs` (UNIC formula, c = 0.20 m in every hall):

| | MAX | CURVE | CLASSIC | 270 |
|---|---|---|---|---|
| picture | 22.8 x 12.0 m, 1.90:1, slight curve (0.57 m) | 18.0 x 7.53 m, 2.39:1, curve depth 1.98 m (R 21.4 m) | 12.6 x 6.81 m, 1.85:1 | 13.6 x 7.16 m, 1.90:1 + side panels |
| seats | 347 (11 rows x 29 + 2 rows of 7 pods) | 102 (6 rows x 15 recliners + 6 love seats) | 224 (10 x 21 + 7 sofas) | 190 (10 x 19) |
| centre seat | yes (29 odd) | yes (15) | yes (21) | yes (19) |
| D1 / W | 0.55 | 0.61 | 0.63 | 0.63 |
| row 1: centre / top / field | 24.6 / 43.0 / 84.3 deg | 19.1 / 34.6 / 79.1 deg | 22.0 / 39.7 / 76.4 deg | 23.0 / 40.0 / 76.7 deg |
| row 1 end seat to centre | 36.1 deg | 34.0 deg | 39.7 deg | 32.8 deg |
| last row / W | 1.40 | 1.25 | 1.70 | 1.49 |
| total rise | 5.01 m (pod tier +0.55 m parapet lift) | 1.83 m | 3.82 m | 2.73 m |
| row pitch | 1.32 m, pods 2.25 m | 1.92 m | 1.30 m, sofas 1.75 m | 1.30 m |
| narrowest lane in front of a row | 0.54 m | 0.84 m | 0.52 m | 0.52 m |
| inner depth / ceiling | 34.7 m / 14.6 m | 25.0 m / 10.2 m | 23.9 m / 9.4 m | 22.6 m / 10.0 m |

- The rows of the curved hall are arcs around a point 9 m behind the picture, and MAX's are arcs around a point 34 m behind it, so
  every seat faces the screen. CLASSIC and 270 have straight rows.
- The lanes (0.52-0.84 m) are where walkers go: the server, ushers and guests walk along a row's lane, never through the seats.

## 4. Building
Two levels (`docs/v9/plan-G.svg`, `docs/v9/plan-L1.svg`):
- **G (y = 0).**
  - Street with a kerbside drop-off bay; the luxury taxi always waits there with its driver.
  - Plaza and canopy.
  - Lobby, 44 x 32 m, double height 9.6 m:
    - box office on the west wall;
    - concessions on the west wall, back half;
    - waiting lounge in the middle;
    - ticket gate and usher at the foot of the escalators;
    - escalators and a lift on the east side;
    - restrooms (men, women; the same fixtures and mirrors) beyond the east wall.
  - The exit spine runs between the halls' screen walls: 8.4 m wide, bright, with a travelator towards the lobby.
- **L1 (y = 5.01 m, the MAX hall's rake top).**
  - Mezzanine over the back of the lobby.
  - The bridge corridor west and east.
  - Flank corridors along the halls' rear walls.
  - A service pantry over the spine, where the server's cart waits.
- **Halls** sit in two pairs either side of the spine, screens towards it:
  - you enter at the top, through a light lock in the rear wall, and walk down;
  - you leave at the bottom, beside the screen, straight onto the level spine.
  - CURVE, CLASSIC and 270 have their rake tops below L1, so the entry continues down a lit stair along the rear wall (19, 7 and
    14 steps of 0.16-0.17 m).
- **One-way rules.**
  - The ticket gate only lets ticket holders through.
  - The up escalator only goes up.
  - Hall entry doors open inward only, and exit doors outward only.
  - The spine's lobby door opens outward only.
  - Nothing on L1 opens into the spine.
- **Distances (MAX).**
  - Entry: about 70 m of walking plus a 14 s escalator ride.
  - Exit: about 30 m, half of it on the travelator.

## 5. Look: palettes and light
Each space uses 3-4 colours plus dimmed versions of the same hues (no new colours in shadow), as asked:

| Space | Colours |
|---|---|
| brand | ink #14162e, gold #e3b25f, ivory #f2ebdd, ember #b8452f |
| lobby | warm stone #cdbfa8, charcoal #1f1d22, champagne #c9a66b, velvet #5e1c2a |
| corridor (way in) | indigo #161a3c, black #0b0b12, gold light lines #e3b25f, smoke #3a3d55: diamond relief panels, curved corners (R 3 m), stepped light coves |
| spine (way out) | light oak #c49a6c, warm white #ece6dc, exit green #2bb673, concrete #7d7a76 |
| MAX | black #0b0d12, blue-black #121826, electric blue #2f7cff accents, walnut #5b3a24 pods with warm underglow |
| CURVE | navy #141b33, cognac leather #7a3f1d, champagne #c9a86a, warm light #ffd59e; light coves follow the screen's curve |
| CLASSIC | burgundy #5a1a24, charcoal #1c1c21, brass #b08d57, cream #e6d9c2 |
| 270 | graphite #1f2227, light panels #9a9da3, teal #1f8a8a, coral seats #b8513a |
| facade | dark bronze #3b2f25, sandstone #b9a68a, gold #c9a35e, glass #1d2a33 |

**Light.**
- Baked in Cycles per room, in three layers: house lights (dimmable), fixed lights (steps, signs, LED lines) and the screen. The
  engine mixes them live.
- During a film the house lights go to 2% (v8: 2.5%; "a bit lower").
- **Screen light.** The picture is sampled on the GPU into an 8 x 4 grid every frame, with no readback. Each wall, seat and person
  takes the light of the part of the screen it faces: bottom rows light the floor and the front seats, top rows light the
  ceiling, and the left of the picture lights the left wall. It is a little stronger than v8 on walls, as asked. MAX gets a real
  share: v8's tracks gave it almost none.
- **Reflections.** Weaker (roughness up). The lobby floor has no mirror-like reflection of the chandelier.

## 6. Prices and booking (no wallet, no ATM)
The money system is a bill, as in a real booking app. There is no wallet, ATM, or running out of money (v8 feedback M1). Prices
are in INR with GST included, as Indian tickets are:
- **Tickets.**
  - CLASSIC: 260 (Classic), 320 (Prime), 420 per place (Prime Sofa).
  - MAX: 520, 600 (MAX Prime), 950 per place (Balcony Pod for two).
  - CURVE: 690 (Recliner), 790 (Recliner Plus), 850 per place (Love Seat, connected sofa).
  - 270: 480, 560 (Prime).
- **Fees and add-ons.**
  - Convenience fee: 30 per ticket, plus 18% GST on the fee.
  - Seat-service tablet: 99. With it, the tablet waits in your seat's armrest and there is no bell button (M3, M4).
- **Food.**
  - Popcorn: salted 330 / 460, caramel or cheese 390 / 520.
  - Cola: 280 / 350. Nachos: 360. Coffee: 240. Water: 90.
  - Combo (large popcorn, 2 colas): 890.
- The bill runs for the evening and is shown on the ticket and at the end. Quick Play shows prices but never asks for payment.

## 7. Systems
- **Film.**
  - The picture is a WebGL texture on the real screen mesh (curved where the screen is curved), so it never blanks when you turn.
    It needs no cut-out hole, so there is no border blur and no crop.
  - New frames are uploaded only when the video has one. While you are seated at a show, the canvas runs at the display's native
    resolution and the hall uses a cheap shader.
  - The picture is drawn with exact colours: no tone mapping, no lighting.
  - YouTube links play in YouTube's own player, placed on the screen with a true CSS 3D perspective (its terms forbid extracting
    the video).
- **Android wrapper.**
  - A loopback HTTP server (127.0.0.1, fixed port, random token on media URLs, cleartext allowed for loopback only) serves the app,
    your videos (byte ranges), frame thumbnails for the scrub bar, and downloaded films. It was tested here with headless
    Chromium playing and seeking MP4 and WebM.
  - The file picker stays as an automatic fallback.
  - Immersive full screen with cutout insets.
  - Pause on leaving, and a seek nudge on return, so the picture never freezes while the sound runs.
  - A diagnostics page (decoder list, last media error, dropped frames, FPS).
- **Sound.**
  - Low-latency audio context.
  - The film is upmixed to 11 virtual speakers (screen L C R, sides, rears, 4 heights) through panners that follow your head
    ("Lumiere Sphere").
  - A compressor and limiter allow up to 250% volume without clipping.
  - Real CC0 recordings for crowds and rooms; a room tone per space.
- **People.**
  - Arrivals spread over the pre-show (at most 6 walking at once). Seated audiences are GPU-instanced.
  - Gaze goes to the screen. The eye saccade fix stops the spinning, and light is clamped so nobody flashes white.
  - The NPC setting applies at once.
- **Staff.**
  - The usher walks faster than you and checks your ticket with a hand-off animation; the gate stays shut until then.
  - The server brings a cart, takes the row lane to your seat, and hands over the order or a real tablet that powers on. He turns
    back if you ring while he leaves, and asks "anything else?" when the tablet comes back.
- **Modes.**
  - Flow Mode: the full evening, from the taxi.
  - Quick Play: start in the lobby, sit anywhere, tablet always on hand (order, change or swap seats, bin, teleport to seat).

## 8. Gates (run on every room, every build)
- **See-through.** From a grid of standing (1.6 m) and seated (1.1 m) eye points, rays in many directions must hit a front face
  inside the room's bounds. A ray that escapes, or hits a back face, fails.
- **Intrusion.** Rails, parapets, LED strips and step lights against seat and occupant volumes.
- **Grounding.** Every prop's lowest point against the floor under it, within 1 cm.
- **Thickness.** Every barrier, door and wall closes into a solid (manifold) with real thickness.
- **Coplanar overlaps and nav reachability.** `check-world.mjs`, as before.
- **Photo viewpoints.** Renders from the 13 photo viewpoints, before and after.

## 9. Licences
- Every font, image, model, sound, voice, film and package is listed with its licence in `docs/LICENSES.md`.
- The app shows the same list under Settings, Credits.
- No paid service, and no non-commercial asset.
