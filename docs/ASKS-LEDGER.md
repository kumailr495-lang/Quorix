# Asks ledger: every message since the v7/v8 build

The user (2026-11-17): "go back in this chat, see the previous project when you supplied and see every single message after that and why
I stopped you, and change everything". This file is that reading. Every ask from the v8 phone test (2026-11-01) to today, grouped, with
where it stands. **Done** means built and checked in the engine (headless Chromium, software GPU: not the phone). **Partly** means
something exists but not what was asked. **Open** means not built. Nothing here has been seen on the phone since v8.

## Why the user kept stopping me (the pattern)

1. Asks ignored or done by a fraction ("you ignored 75 %", 2026-11-01, and again on 11-06, 11-13, 11-14).
2. Things that make no sense: sofas facing the wrong way, exits nonsense, a lamp post blocking the view, a board off centre, decorations
   blocking the entrance, a carpet that "extends so badly".
3. Emptiness: "empty as fuck", "lonely", "claustrophobia" in the corridors (11-06, 11-07, 11-13).
4. Cheap look: one-colour textures, boxes "like Minecraft", hard light, too-strong reflections, low-poly props, UI "cheap and blocky".
5. Glitches: z-fighting, see-through faces, disconnected parts, things inside each other, text cropped in pictures (11-13, 11-17).
6. Research not shown in the result: ScreenX split instead of connected, entrances unlike real ones, small screens.
7. The look went backwards: "I would prefer the previous app" (11-06); today's photos of the v8 lobby are the benchmark for premium:
   a dark polished floor with inlay lines, red marble columns, a red runner between stanchions, a ribbon chandelier in a red ring,
   glowing type over the counters, a starry IMAX tunnel.

## Look and feel

| Ask | Status |
|---|---|
| Premium, like the v8 lobby (dark, red, brass, glowing type) | Done for the lobby 11-17 (black marble, red marble, crimson cove, runner); corridor and halls next |
| Midnight, not evening (street) | Done 11-17 (X2g) |
| No emptiness anywhere, decorations that make sense | Partly: lobby dressed (exhibit, photo spot, cafe, fountain); corridor and halls next |
| Carpets, an old tree, a statue, paintings (11-17) | Partly: carpets and seven real paintings done; the statue and the tree are next |
| Good textures, not one colour; real scans | Done for floors and walls (CC0 scans); props partly |
| Lighting not hard, accents, less bounce | Partly: Cycles bakes; to be re-graded in Y3 |
| Reflections not too strong | Partly: soft by default; re-check in Y3 |
| Brand mark for LUMIÈRE, simple, 3-4 colours | Partly: gold wordmark only |

## Geometry and rendering

| Ask | Status |
|---|---|
| No z-fighting, no see-through, nothing floating or disconnected | Done for the built rooms and checked props: zcheck 0/0, glb_check, connect |
| Nothing disappearing while in sight (11-17) | Done for furniture: visibility rules now come from a ray test (pvs.py); LOD audit open |
| Text never cropped in pictures (11-13, 11-17) | Done 11-17 (Y1): every canvas line fits its picture; photo wall redesigned |
| Full screen, no blocked strip | Partly: cutout handled; not seen on the phone |

## Street and taxi

| Ask | Status |
|---|---|
| The outside judged first: buildings, details, visible | Done (X2) |
| Billboards out; balconies, shop extensions, people, crosswalks, lamps, trees, plants (11-17) | Partly: billboards out, balconies, shop fronts, people, crossings, cafe tables in; trees still blobby |
| The outside from scratch: styling, curves, triangles, not boxes; the cinema front and the street buildings (11-17) | Open: three night concepts sent (A Bombay Deco, B Streamline, C Crystal) and a street concept; building the one picked |
| Taxi comes from somewhere and leaves; not blocking the doors | Done (X2b) |
| Car model 10x, night feeling in the cab, driver's head inside the roof | Done (X2d, W5, X1) |

## The 11-17 evening list (in the order it is being worked)

| Ask | Status |
|---|---|
| Outside: Streamline front (concept B picked) | Done 11-17: curved band, speed lines, round corners, fin, round marquee |
| Lobby lounge: curved sofas not on one circle | Done 11-17: three sofas on the table's own circle, two chairs close the C |
| Halls: "the inside sucks" | In progress: folded MAX walls, CURVE sound-wave fins, 270 acoustic clouds, poster pre-show screen |
| Curve hall: seats not following the curve | Open: check after its bake |
| Street buildings: curves, triangles, "an illusion" that looks real | In progress: gables, Deco crown, curved gable, sawtooth, drum, wavy balconies; windows interior-mapped |
| Trees that look real | Open: leaf cards |
| Premium recliners that really recline, with sound; cup holders that take your drink or popcorn | Open |
| Exits off the screen wall, the screen wall to wall | Open (moves doors, nav and exit routes) |
| Light bounce, laser projection look, Dolby Atmos, corridors | Open |
| Taxi interior, glitches, premium lighting | Open |
| LODs for every object (asked 6-12) | Open: levels for what is drawn separately (people, cars, trees, seats); merged room props stay one mesh |
| Lobby much better or from scratch; outside better still | Open |

## Theatres

| Ask | Status |
|---|---|
| Big screens, real proportions, ScreenX one connected picture | Done (v9.1, v9.2) |
| Exits that make sense and feel faster; no going back out of the entrance | Done (v9: exits beside the screen to the spine, one-way doors, fast exit) |
| Curved hall lights and curve; barriers through seats | Done in v9 rebuild |
| Halls and corridors premium, not empty | Partly: next after the lobby in Y3 |

## People and service

| Ask | Status |
|---|---|
| Real-looking people, no floating, no glitchy rigs | Partly: Rocketbox avatars; not seen on the phone |
| 200 natural lines, personalities, not over-friendly; voices clear in each language | Partly: lines rewritten; voices not judged on the phone |
| No NPC rush; they never walk through things or each other | Done in the engine tests (npc-clear) |
| Server with a cart, comes back when called, hands the order | Partly: cart and queue exist; hand-over is a gesture, no 3D tablet |
| Hand the ticket to the guide, he reads and tears it; guide fast enough | Partly: read and tear gestures, no 3D ticket |
| Eating and drinking animations, consumables | Open (X6) |

## Playback and sound

| Ask | Status |
|---|---|
| Picture blank when looking left; freeze after leaving the app; borders glitch; sync | Done in v10/v11 fixes; not seen on the phone |
| Own videos without the file manager; YouTube links | Partly: native picker and YouTube player exist; not seen on the phone |
| Dolby-Atmos-like sound, crowd sounds that sound real, toggles | Partly: spatial film sound and CC0 crowd; toggles exist |
| Seat rumble and particles only on the best scenes, with switches | Done (main.js: strong cues only, haptics and particles switches) |

## UI

| Ask | Status |
|---|---|
| Compact, not confusing, no AI-slop copy, not cheap or blocky | Partly: v11 compact UI; full redesign is X4 |
| Layout editor works; size inside the editor | Open |
| Crosshair dot that hides with the hide button | Done (v11) |
| Tutorial you do, skippable | Partly |
| A 3D tablet that is handed over and powers on | Open |

## Multiplayer

| Ask | Status |
|---|---|
| Any network, no same Wi-Fi, no phone carrying the room, no paid server, nothing leaks | Partly: direct links work; relay fallback is X3 (relays tested 11-17: 7 public relays carry 4 events a second) |
| A lobby: room code, players, ready, how each is connected, host picks, start together (11-16) | Open: X3 |
| Host transfer, hide names, hide messages, no chat pop-ups, one server queue | Done (v10) |
| Public rooms, matchmaking, kick, block, report, proximity voice | Open |

## Platforms, security, release

| Ask | Status |
|---|---|
| VR, keyboard and mouse, controller, auto-detected | Done (v10 input.js); iOS, PC and tablets as a web app: X5 |
| Security, anti-tamper, piracy, privacy, licences checked | Partly: licences tracked (docs/LICENSES.md); hardening is X7 |
| Works on 4 GB phones, smooth on the itel P65 | Not measured on the phone; optimisation is X9 |
| Surprise bundle | Open (X6) |
