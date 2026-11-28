# Asks ledger: every message since the v7/v8 build

The user (2026-11-17): "go back in this chat, see the previous project when you supplied and see every single message after that and why
I stopped you, and change everything". This file is that reading. Every ask from the v8 phone test (2026-11-01) to today, grouped, with
where it stands. **Done** means built and checked in the engine (headless Chromium, software GPU: not the phone). **Partly** means
something exists but not what was asked. **Open** means not built. Nothing here has been seen on the phone since v8.

## 11-27/28: the 14.2 phone test (one long message), the Dubai VIP photos, "premium seats in every theatre" (14.3)

| Ask (the user's words, shortened) | Status in 14.3 |
|---|---|
| "The app flickers like almost everywhere" | Done in the engine: textures and skinned-mesh bones uploaded before the frame instead of in the middle of it (three.js uploads them mid-pass under MSAA, Android Chromium's known flicker), and a Smooth edges switch in Settings. Needs the phone to confirm |
| "The home teleports you to an apartment ... the home should be in the theatre, rentable, not editable" | Done: the apartment Suite is gone. The private floor is in the cinema: a round lift in the lobby's east front corner, by the glass, rides (doors shut, about 4 s) up to a lounge with five themed screens, rented at their doors, not editable |
| "Where are the jungle and the others? Home, jungle, winter, drive-in, space" | Done: five private screens: Home (sofa, a bed on the riser, shelves, speakers), Jungle (timber beams, plants, fireflies), Winter (log cabin, fireplace, snow), Space (ribbed walls, violet light, stars, a planet), Drive-in (an 11 m night sky, parked cars in bays, string lights, a moon) |
| "The remote's buttons are glitched", "can't play videos in the home", "the remote stays in your hand after you leave" | Done: the face and keys no longer float (they sat 3 and 5 mm over the body), a tap picks the nearest key (overlapping hit areas pressed the neighbour), its Films key opens your videos and they play at once in your own screen or box; leaving the box or room puts it back |
| "VIP areas should be actual VIP seats in the same theatre" (Dubai photos), "somewhat premium seats in every theatre" | Done: every hall has a VIP gallery over its back rows, a stair up past the entrance, and five walnut boxes with LED edges, leather club recliners and crimson carpet, rented at their velvet rope or from the phone |
| "The tablet teleports me to the MAX", "choose which theatre to play in", "teleport to other theatres quickly" | Done: the tablet's films, streams and your videos have a Play in row (your hall is picked when you are in one; elsewhere you pick); nothing ever falls back to the MAX. The phone's screens row works in Story too once you are past the ticket gate |
| "The app is laggy" | Partly: far seat rows use a third, lighter model (about 30 % of the second); the VIP boxes' arms use their light model. Frame rate needs the phone |
| "The escalators' starting point is glitched" | Done: the steps dropped 6 cm at each comb plate while still in sight; they now slide under the plates at the landing's height |
| "The intro's sounds have a huge delay", "the tyres don't move or turn" | Done: the sounds decode while the game loads (they waited for the first tap); the taxi's wheels roll with its speed and the front pair steers with its turning |
| "The multiplayer host/join UI is bad, 1000 errors" | Done: Host and Join as two cards, a room view with the code big (Copy, Share, QR), who is here and the connection's state with Try again; the room bar is Chat, Mic and Emote; six public relays that answer instead of Trystero's list (several were gone: 404/502 errors in the console) |
| "Improve the layout, remove the emptiness", "you ignored the pics you took" | Partly: every hero view was rendered and reviewed; the private floor and the VIP galleries add five rooms and a level in each hall; the lift was moved out of the waiting area it first stood in. The lobby itself was not refurnished in this build |
| 11-28 (last message, 20 % usage left): "make the home actually feel like home" | Done: bedside tables and lamps, a rug, an armchair corner, plants, two framed paintings added to the sofa, bed, shelves and speakers |
| "The rooms and the big custom theatre should be at the same places the other ones are, in corridors" (11-28, later) | Done: the wing (lounge, four rooms, the Drive-in) moved behind the halls to the far end of the spine corridor, walked to from the lobby; the lift is gone |
| "Not a packed room with some particles called space ... like it's in Irusu" (a VR headset) | Done: Space's walls and ceiling are open space (stars, nebula, sun, a turning planet) drawn by direction; a black deck, the screen floating |
| "Fix the Home, you placed something wrongly" | Done: table lamps floated 30 cm over their tables; the rug overhung the bed platform; a plant pot sat in the platform. Measured and fixed |
| "The armrest tablet should come from the seat upward" | Done: it rises out of the armrest of any seat you sit in (it needed your ticket's seat before) |
| "Hide controls should be an option without pausing" | Done: an eye button in the HUD |
| "Movies sometimes have no sound" | Partly: the hand-over to the phone's own player for Dolby/DTS sound checked once at 4 s and missed slow starts; it now retries for a minute. Phones with no Dolby/DTS decoder stay silent on those files |
| "Sit in cars, front or back seat, detailed interiors, collisions" | Open: not built in 14.3 |
| "ScreenX much more good" | Open: unchanged in 14.3 |

## 11-27: the 14.1 phone test (17 points) and the 11-26 lists repeated (14.2)

| Ask (the user's words, shortened) | Status in 14.2 |
|---|---|
| "The whole app flickers, the buildings, the road, everywhere" | Done as far as the headless engine can show: MSAA on every preset, no mid-game resolution changes after the first 45 s, the neon flicker removed, fine window patterns filtered, a deeper near plane on 16-bit depth phones; the FPS line now shows AA and depth bits. Needs the phone to confirm |
| Trash pick-up (and everything) only when I look at it | Done: every prompt follows the crosshair (litter, bins, seats, sofas, people, fixtures, kiosks, shifts, the Suite) |
| Songs: custom UI with their own pictures | Done: the cover (embedded or Android's album art), title, artist, progress on the big screen and a Now Playing card |
| Z-Archiver / a late song: the app closes and starts from the beginning | Done: songs listed in the app (no outside picker needed), the WebView rebuilt if Android kills it, a snapshot puts you back where you were |
| The car interior / the whole taxi intro | Done: filmed from outside (crane, tracking shot, the kerb), no cabin |
| The app lags a lot | Done in part: lobby 899k -> 495k triangles, halls 1M -> 235-413k, street draws 291 -> about 219; not measured on the phone |
| The song glitches and duplicates itself | Done: a song never starts the native player; the page's copy is muted while the native player plays |
| The theatres are not premium | Partly: brass nosings and lit strips on every aisle step, lights that really go down in the film, a soft screen spill |
| Upstairs seats, sofas: I go through them | Done: everything on the mezzanine and the corridor collides |
| NPCs hold items wrongly; they just sit | Done: gripped by the side; seated people eat, drink, read their tickets, check phones |
| Music Night: they dance at the stage, throw popcorn and money | Done: a party walks down and dances in front of the screen, throws popcorn and bank notes on the big beats, goes back |
| Lift in multiplayer goes up only for the one who clicks | Done: the host's phone runs the one lift, everyone else follows its state |
| Multiplayer quit glitch, a quit option | Done: Leave on the room bar and in the pause menu; leaving ends the room's show and lift |
| Recline only on my side | Done: the seat reclines on every phone and the player leans back with it |
| Light bounce too strong; lights not dimming in the film | Done: spill 1.1 (was 3.6), the fixed lights go down to a third |
| Aisle lights not placed properly | Done: on every step's edge, built from the step geometry (halls re-baked) |
| "Not a single new thing" | New: the LUMIÈRE Suite with a 3D remote, separate restrooms, room QR codes, Music Night with covers, the new arrival |
| 11-26: private theatres (custom, home with remote, jungle, drive-in, panorama, space) | Partly: My Theatre (custom), the Suite (home, TV and projector, 3D remote), X-270 (panorama); jungle, drive-in and space are not built |
| 11-26: washrooms not separated | Done: two doors, two vestibules, MEN and WOMEN signs |
| 11-26: room code, QR | Done: the code as a QR in the room panel; a scan button where the phone allows it |
| 11-26: host transfer | There since v10: Make host in the host's room list; if the host leaves, the longest-present player takes over |
| Netflix-style streaming | Not possible legally; public-domain films, your own videos and songs, links |
| IMAX name | Stays MAX (trademark) |
| (found in the 14.2 checks) | Fixed: the host role jumped to a guest after a connection blip (shared shows stopped), the Suite's models were left out of the APK, the corridor's banquettes never loaded (planters in the air), hall bins refused cups |

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
| Halls: "the inside sucks" | Done 11-17: folded MAX walls, CURVE sound-wave fins, 270 acoustic clouds, poster pre-show screen |
| Curve hall: seats not following the curve | Checked 11-17: a top-down render shows every row on an arc round the screen; waiting for a screenshot if one spot still looks off |
| Street buildings: curves, triangles, "an illusion" that looks real | In progress: gables, Deco crown, curved gable, sawtooth, drum, wavy balconies; windows interior-mapped |
| Trees that look real | Done 11-17: crowns of leaf cards (a drawn leaf atlas, alpha cut, both faces, wind) on the street trees and the olives; the olive's ball-shaped knot is now a trunk; the blob planter trees in front of the cinema are potted olives |
| Premium recliners that really recline, with sound; cup holders that take your drink or popcorn | Done 11-17: your seat's back and footrest move with a motor sound, two buttons when seated; the console holders take and give back what you hold |
| Exits off the screen wall, the screen wall to wall | In progress 11-18: the screens run wall to wall; each hall's exits are in its side walls, onto passages that step down to the spine (built, baking) |
| The street's shop names: no glow, simple (11-18) | Done 11-18: flat lettering on dark fascias, no halos, no flicker; the hotel blade plain |
| The cinema had no design outside, just a front; extensions; the street buildings to suit (11-18) | Done 11-18: an east corner tower with lit slots and a mast, a stepped crown with a gold sunburst over the name, set-back lit upper storeys on both wings, glass-block windows and portholes on the wings, a canopy across the glass; the tall glass block opposite lost a floor so the cinema leads the skyline |
| Premium, big, comfortable seats and their detailing (11-18) | In progress: recliner, rocker, classic seat and console rebuilt (thicker cushions, rolled fronts, seams, walnut back panels, brass number plates, padded arms, lit cup holders); wider centres come with the hall rebuild |
| Light bounce, laser projection look, Dolby Atmos, corridors | Open |
| Taxi interior, glitches, premium lighting | Open |
| LODs for every object (asked 6-12) | Open: levels for what is drawn separately (people, cars, trees, seats); merged room props stay one mesh |
| Lobby much better or from scratch; outside better still | Open. Noted for it: the florist's window (white wall, blob flowers, box pots), the box hedges and balcony planters still look blocky |

## The 11-19 list (in the order it is being worked)

| Ask | Status |
|---|---|
| The gold ceiling "looks shit" | Replaced 11-19 by the picked noir coffers: black lacquer beams on the court's grid, brass inlays, a downlight per coffer, the crimson dome rim, a new chandelier (lit glass rods on three brass rings) in the starry dome |
| The pillars | Replaced 11-19 by the picked backlit honey onyx (a real CC0 scan) with brass fins and bases |
| Reception, bar and popcorn as dedicated areas with a much better design | Done 11-19, restyled in place (picked): onyx ticket desk with four tills; popcorn parlour with a bulb marquee, checker floor, a red counter, two cabinet poppers, soda towers, tub stacks, heated cases; the bar with a bottle wall, slatted ceiling, a fluted walnut bar, a lever espresso machine. Engine renders only, not seen on the phone |
| Models and textures "lazy": more 3D detail | Partly 11-19: eight new detailed props for the three counters and the dome; the statue now reads as gold; the parlour's machines no longer stand half inside the wall. Street props and the older Kiln props are next |
| Animations: popcorn popping, fountain water, bar and cafe life, marquee and menus (picked) | Done 11-19 in the engine (anim12.js): kernels pop in batches, the fountain's drops, splashes and rings, steam when the barista makes a hot drink, chasing bulbs, a sheen over the menus. NPC bar routines (a barista working the machine) still open |

## The 11-20 list (photos, two master prompts; plan and audit: docs/V13-PLAN.md)

| Ask | Status |
|---|---|
| NPCs walk with their feet inside the ground | Fixed 11-20: the clips' hip height came from a pelvis the loader never found (soles 7-9 cm under the floor, now within 4 mm). Engine test, not seen on the phone |
| The LUMIÈRE name stuck and cropped (behind the ticket canopy's showtimes board) | Fixed 11-20: the lit letters stand 24 cm over the board, centred on the desk |
| The pillars and the ceiling still bad, "cubic lights" on the ceiling; make variants, choose the best | Variants rendered (docs/v13/variants-columns-ceilings.jpg). I picked P3 + C3 first; the user picked **P2 + C1b**. Built 11-20 (lobby12.py): square Nero Marquina columns with lit brass corners; a dropped field with a lit shadow gap and a round halo over the court that steps up twice behind brass bands with hidden coves, pinpoints and stars; no grid of lit cans (black-baffle apertures light the floor). Baked 11-20; zcheck 0 visible coplanar / 0 close, walks 30/30, crowd test clean. Engine renders only |
| Carpets cut in the middle, not continuing | The entrance runner stopped 0.22 m short of the brand ring: it is floor now, its end cut to the ring's arc (in the same bake) |
| Kiosks like the Cineplex photo | Modelled 11-20 (zones12.py ticket_kiosk: portrait touch screen in a brass frame, tilted card terminal, lit ticket slot, scanner, shelf, bronze pedestal, toe light); three stand between the counters (props: no re-bake); their screens are engine panels. Engine renders only |
| Reception and the areas separated and much more defined | Done 11-20 in the engine: marble fins with lit brass noses between the ticket bay, the popcorn bay and the bar; a 0.8 m TICKETS fascia, a SELF CHECK-IN sign over the kiosks, a POPCORN marquee sign standing on the popcorn canopy's front edge (first built on the wall behind it, where the deep canopy hid it; moved and re-baked), a BAR · CAFÉ header. Engine renders only |
| "The ceiling is glitched" | The first C1b bake had overlapping triangles round the halo (zcheck: 90 places); rebuilt as a radial mesh (area checked exactly), re-baked; the dome's blotchy paint replaced by a flat finish |
| Corridor like the dark corridor photo (lit portal frames, hall numbers, seat plan) | Built 11-20: lit frames on every portal's face, a blade roundel with the hall's number, a seat-plan board (the hall's real seats) under a picture light; corridor re-baked 11-20. Engine renders only |
| An in-game phone (the two phone photos) | Built 11-20 (phone.js): time, next show, tab; Ticket, Map, Tab, Camera, Photos, Stubs, Friends, Settings. The camera's screen is see-through and the HUD buttons behind it hide while you frame; a clash with the old `.ticket` style that stretched the Ticket app is fixed. Engine screenshots only |
| Seat-layout editor (the green-seat photo) | Planned (V13 stage 4, theatre editor) |
| "Tell me how to download the app" | APK 13.0 built and sent 11-20 (docs/V13-RELEASE-NOTES.md): installs over the old app, same key. Not run on the phone by me |
| Money: from jobs, and option A (earning by watching house films) "could be a good option"; no loyalty tiers; things to buy later: customisable theatres, avatars, houses, cars; "it's not a simulator, I want it grand" | Plan listed for approval 11-20 (jobs in the cinema + watch-to-earn; never for YouTube); not built yet |
| Everything in the master prompts (economy, rooms, voice, NPC lives, settings that apply at once, licences, security) | Audited in docs/V13-PLAN.md with what exists and what is missing; worked in its stages |

## The 11-20 phone test of 13.0 (11 screenshots; "add every single feature I have said ... cook it this time")

The user installed 13.0 and played it. Every point, in their words where short. Worked in docs/V14-PLAN.md's order.

| Ask | Status |
|---|---|
| No difference between the player and the NPCs; picking a red outfit turns both red | Open (N7) |
| Multiplayer UI confusing; emoji instead of icons; options unclear; chat in the middle instead of the side | Open (N7) |
| The phone UI is bad | Open (N7) |
| Popcorn staff stand too far back; no option to buy | Open (N1) |
| 15-20 fps on high (21-26 fps in the hall and upstairs, 42-47 in the lobby) | Open (N2) |
| The projector light beam: "I told you not to do that" | Open (N1) |
| ScreenX nowhere near the photo; its side walls bad | Open (N4) |
| NPCs walk through walls | Open (N1/N2) |
| The wall at the hall entrance; research real entrances and exits | Open (N3) |
| The theatres are too small | Open (N3) |
| Long loading: GTA 5/6 style loading screens | Open (N7) |
| The taxi driver's hands and wheel don't move; no door-open and get-out animation; the car's interior looks bad | Open (N8) |
| The sky looks boxy | Open (N6) |
| Models look bad and are not animated (all of them) | Open (N9) |
| NPCs are rude (they were better before); they don't clap, cry or talk | Open (N1) |
| The camera zooms too much into the screen | Open (N1) |
| No way to know where my seat is | Open (N3) |
| Reflections bad and heavy (a bin like a mirror) | Open (N1) |
| The finger icon on the crosshair instead of a button to tap | Open (N6) |
| Z-fighting in the lift | Open (N6) |
| Carpets placed badly; glass and borders done badly | Open (N6) |
| Can't sit on most sofas outside the halls | Open (N6) |
| The exit teleports you outside | Open (N3) |
| No transition or animation on the play button | Open (N7) |
| The guide is too slow, waits until you step back, and stays put if you seat yourself | Open (N1) |
| Sounds glitch and distort at some points | Open (N6) |
| "Do everything yourself, don't ask me every single thing" | Standing rule from 11-20: no more approval questions; decide, build, show |
| Corridors smaller and full of decoration | Open (N5) |
| Every feature asked in the whole chat | Open (N10): money from jobs + watching, outfits, own hall, multiplayer extras, open world, NPC life |
| Seen in the screenshots: fps readout over the phone button; status and navigation bars showing; a film title shown as "BrahmÄ stra"; the LED wall's text cut off | Open (N1) |

## The 11-20 v14 push ("finish every feature ... GTA level models ... the lobby feels so open ... multiplayer performance ... money systems, jobs, missions, tasks ... actual in-app streaming ... customizable theatres ... cars, motorcycles")

| Ask | Status (v14.0) |
|---|---|
| GTA-level models, every one | Partly: 10 CC0 photoscanned props (Poly Haven) in the lobby as texture layers (no extra draw calls); bin, tufted bench, poster lightbox, snake plant, popcorn wagon, plinth, motorbike rebuilt (glb_check clean). The rest of the ~110 models are the v10-v13 builds |
| The lobby feels so open; placements that make sense, no stupid filler | Done for this pass: a second lounge island west of the court, the NE lounge in scanned leather, busts on plinths at the doors, a longcase clock, the exhibit's scanned 8 mm projector and cine camera; props-overlap and npc-clear pass |
| Bins not in random places | Done: only at counter ends, the spine's mouth, the gate exit and walls (research: exits, concessions, restrooms) |
| Multiplayer performance | Done: compact change-only state (12.5 Hz moving, 1 Hz idle), seat/room meta on change, 110 ms interpolation, real players drawn first, compositor-only name tags |
| Money system (Lumiere Credits), no YouTube rewards | Done: wallet, history, daily cap 2,500 LC, house films pay per minute watched and on finishing (never YouTube or your own videos), purchases refused when short |
| Jobs, missions, tasks | Done: popcorn counter, ticket gate and hall cleaning shifts (playable), three mission chains, three daily tasks |
| Shop, cosmetics, emotes, waiter priority | Done: dance emote (Dance_Loop clip on every phone), three outfit colours, three hall themes, waiter priority pass |
| Actual in-app streaming | Done: tablet Stream tab: house films and the Internet Archive's public-domain films in genre rows, search, detail sheet, play in your hall |
| Customizable theatres, presets, sharing | Done within the baked halls: My Theatre recolours seats, walls, carpet and curtains live, presets saved, shared and imported by code. Rows, spacing and screen size stay as built (light maps) |
| Cars, motorcycles | Done on the cinema's street: drive the parked car (chase camera) or ride the motorbike (rider's view); traffic yields |
| Taxi driver's hands and wheel | Done: the wheel turns with the taxi's turning, his hands go round with the rim |
| LUMIERE name cropped | Done: the place pill shows the hall's short name and wraps its second line |
| Houses with interiors, beaches, skydiving, swimming, a whole enterable city, voice chat, public room browser | Open: beyond one session and a phone WebView's memory; listed for later stages |

## The 11-26 phone test (13 + 6 + 5 screenshots; "scrap the city ... an indie game where people watch movies together"; "first fix the seats")

Engine renders (headless Chromium + SwiftShader), not the phone. Commits 0f7cdcd, b8ad169 (v14b), 4767251, e5786a9, 610b851, 0e2147b (v14c).

| Ask | Status |
|---|---|
| CURVE seats "not placed in curved manner" (a seat plan with arcs round the stage) | Done: the cause was a sign error (hallmath yawOf) that turned every seat of the west halls away from the screen; every seat now faces the arcs' centre (a logic test reads all of them, 0.5 deg limit). Rows curve round a point 3 m behind the picture; past the aisles the floor steps straight to the walls (exits stay on the front floor); re-baked; walks pass |
| Only CURVE curved, the others straight | Done (v14b) |
| Loading screen is a screenshot (with the HUD in it) and a weird transition; "like GTA 6 artworks" | Done: four painted key-art pieces from our own scenes (Kuwahara paint, ink, grade), title per piece, staged fade to black then the menu; the menu camera no longer flies through the statue |
| Phone UI does not fit (last row cut, gold bar) | Done: home page fits 740x340 to 915x412 with no scroll; status bar fixed |
| "E" key badge on the phone | Done: volume/power keys and mouse-type presses on a touch screen no longer switch to the keyboard HUD |
| Food looks bad (popcorn, nachos, churros, chocolate) | Done: vertex-painted models, a full popcorn heap with no gaps, new icons |
| NPCs hand things over properly; ticket in the usher's hand | Done (v14b/c): items in the palm, hand-offs at the counters, the usher holds a ticket |
| Surprise bundle; MP3 on the screen, NPCs dance, throw popcorn or money | Done: Music Night (a song as your show: a light show on the screen, the hall claps and cheers on the beat, popcorn and confetti thrown from the seats) |
| Names in the chosen language | Done for the staff (Clara, Rahul ... in Devanagari and Urdu script) |
| Seated audiences missing far away | Fixed: the far crowd's shader did not link since the outfit-colour change |
| Exits: walk out fast, come back by the entrance | Done (v14b light-lock, two-way entrances); walks expect the one fade |
| Proximity voice, voice notes, mute; host-only tablet; MP fixes; lift sync | Done (v14b) |
| Scrap the flat, vehicles, phone Order app | Done (v14b) |
| Private theatres (custom, home with a 3D remote, jungle, drive-in, panorama, space) | Open: each is a new baked room; not in this build |
| Separate washrooms, lobby/corridor restructure | Open: builder and bake work beyond this build |
| Loans | Done: Wallet, 500 LC now, 550 back from 40 % of earnings or at once |
| Room QR codes, host transfer | Open (room codes work: type or share the code) |
| Netflix/Prime films | Not possible legally: the app streams public-domain and CC films, your own videos and links |
| "IMAX is named MAX" | Kept: IMAX is a trademark; MAX is our own format name |

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
