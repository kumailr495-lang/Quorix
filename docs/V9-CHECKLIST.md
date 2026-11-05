# v9 traceability checklist

One row per ask in the user's v8 feedback (verbatim text, 2026-11-05). State at the v9.00 build: 118 done, 47 partial, 16 not done. Status: `[ ]` not started, `[~]` partial (reason in the row),
`[x]` done (evidence in the row). The release notes are written from this file.

## NPCs
- [~] N1 Animations glitched; make real animations: same CC0 animation library; eye and jaw drift fixed, sitting drop and recline per seat type
- [x] N2 Eyes going round and round: eye and jaw bones start from their rest pose every frame (people.js Rig.reset), also in the GPU crowd bake
- [x] N3 NPCs rush the whole hall (everyone arrives at once): arrivals spread over the countdown, one at a time per door; a show that starts soon is mostly seated already (test: 56 seated, 1 walking, 13 due)
- [x] N4 Spawn like maniacs and kill the device: staggered arrivals; seated people far from you are the GPU crowd; full people capped by the graphics preset
- [~] N5 AI-sounding voices; better voices: English: Chatterbox (cloned from synthetic Kokoro voices); Spanish and Hindi: Kokoro
- [x] N6 NPC starts talking when I am far away: people speak only within 7 m of you
- [~] N7 NPCs walk inside and outside each other: walkers wait when someone is within 0.75 m ahead; no full avoidance
- [~] N8 Glitched when sitting: one person per seat, seat-type drop and recline; not seen on the phone
- [ ] N9 Weird-looking details on the bodies: same body models (Quaternius CC0)
- [~] N10 Rigging and model glitches: eye and jaw drift fixed; models unchanged
- [x] N11 Almost all wear the same dresses: every person gets their own seed (clothes, colours, hair)
- [x] N12 No clapping, screaming or excited sounds: recorded applause (40, 150, 300 people) and cheering, a recorded gasp; laughs and screams still synthesised, quieter
- [x] N13 No room to walk between rows of chairs: row lanes >= 0.52 m by calculation (hallmath, UNIC)
- [x] N14 NPCs go inside chairs: people sit onto their own seat only
- [x] N15 NPCs suddenly glow white / very bright: light on people capped and eased (orange faces gone in renders)
- [x] N16 Some look at me or at each other instead of the movie: the audience looks at the screen; others glance only when you are close and in front
- [~] N17 Natural body language and behaviour: reactions follow the film; lobby guests move between spots; chat lines
- [~] N18 Lag while NPCs enter the theatre: walking people are few at a time; not measured on the phone
- [x] N19 NPC setting applies at once (off removes the seated audience): density changes at once; Off also empties the halls
- [~] N20 NPCs optimised: GPU crowd and caps; not measured on the phone
- [x] N21 About 200 different, natural dialogue lines (not "Back already. Are you lost."): 233 lines in 4 languages (tools/dev/i18n/v9-dialogue.json)
- [~] N22 Voices clear, never confusing: clips levelled to -19 dB RMS; not judged on the phone
- [x] N23 Language switch also switches NPC lines and voices (Hindi...): switching the language reloads the voices; Urdu plays the Hindi clips
- [x] N24 Clapping must not sound like "mosquitos and an electric beater": applause is recorded crowd applause now
- [~] N25 NPCs glitch in confined spaces

## Server (seat service)
- [~] S1 Server has the same glitches as other NPCs: same fixes as the other people
- [x] S2 Server can't reach me past seated NPCs and comes another way: he comes down the side aisle and along your row (hallmath seat routes)
- [x] S3 Server starts talking from far away: speaks only near you; the conversation opens within 3.5 m
- [~] S4 No tablet and no hand-over animation: a give gesture; the tablet is the on-screen tablet, no 3D tablet
- [~] S5 UI slaps onto the face: conversation panel unchanged
- [~] S6 Tablet UI is poor: tablet: order tab, offline films, fixed film grid
- [x] S7 Server very slow: 1.6 m/s
- [x] S8 Bell while he walks away: he must turn back: he turns back along the way he came
- [ ] S9 Comes with a cart holding popcorn and drinks (instant service): no cart model
- [~] S10 Animation of handing over the order: gesture only
- [x] S11 A realistic route to every seat that never glitches: every seat has a computed route; walked in a test for one seat
- [x] S12 Space between seat rows too confined
- [x] S13 Handing the tablet back: he asks if you want anything else: handing the tablet back: "anything else?"
- [x] S14 Flow mode: hand your trash to the server: "Can you take this?" and the tablet bin button
- [ ] S15 An actual tablet is handed over and it powers on: no 3D tablet that powers on

## Guide (usher)
- [x] G1 Guide slower than me; I can outrun him: 1.75 m/s, walks up the moving escalator; waits only when you are more than 5.5 m behind
- [~] G2 Animation of handing the ticket to the guide; only then he lets you through: he reads and tears the ticket (gestures) and opens the gate; no 3D ticket
- [x] G3 Corridor reachable without showing the ticket: the gate leaf stays shut until he opens it; the lift needs a checked ticket
- [x] G4 First visit: the guide walks you; later visits: "locate my seat": escorts the first time; later "take me or I find it" with a glowing ring on your seat
- [x] G5 Remove the red arrow over the seat: no arrow

## Playback
- [x] P1 Scrub bar shows a preview of the film at that point: the tablet seek bar shows the frame under your finger
- [~] P2 The preview must be light (current one lags): still a second muted video for the preview
- [x] P3 In-app video list plays own videos without the file manager ("file could not be played"): "My videos" lists the phone's videos through the app's own server; the picker stays as fallback; not seen on the phone
- [~] P4 Own (YouTube-downloaded) videos lag a lot: WebGL picture at device resolution; not measured on the phone
- [x] P5 Player must not reduce the film's quality at all: full-resolution video texture, no tone curve
- [~] P6 Sound is noticeably behind the picture: low-latency audio; not measured on the phone
- [x] P7 Blurry, glitchy border around the picture: no video layer any more: the picture is part of the 3D screen
- [x] P8 Picture slightly cropped: letterbox fit, no crop
- [x] P9 After leaving the app: picture frozen 10-20 s while sound runs: pause on leaving, a seek nudge on return; not seen on the phone
- [x] P10 Turning left or right: picture goes blank: the picture is in the scene
- [x] P11 Close to the screen: picture goes black: the picture is in the scene
- [x] P12 New film while seated: curtain closes and reopens, old timer keeps running: a new film keeps the curtain open and starts a new countdown
- [~] P13 YouTube links don't play: YouTube's own player placed over the screen in perspective; not testable here
- [x] P14 Search bar in the video list: search in My videos
- [x] P15 Blender films in the tablet are glitched and tiny: film grid fixed (render)
- [~] P16 Clean titles from file names; never cut off: cleaned titles; long ones get an ellipsis
- [~] P17 Blender films stall on Wi-Fi (1 min play, 3 s pause): save a film offline from the tablet; streaming goes through the app; archive.org answered 503 here, so not verified
- [x] P18 Blender films: user left keep/remove for later (keep optional): films kept, with offline saving
- [x] P19 Video looks a bit blurry: show mode renders at the screen's full resolution while you watch
- [x] P20 Volume up to 250% without distortion: film volume to 250 % with a limiter
- [x] P21 Pre-show screen looks bad; make it interesting: title card, countdown, "silence your phone", "take your seats"
- [x] P22 10-second countdown; lights go down during those 10 s: a 10 s countdown ring; the lights go down within those 10 s (render)
- [x] P23 Lights a bit lower than v8 during the film: 2 % during the film (v8: 2.5 %)

## Light and sound
- [x] L1 Object-based 3D sound instead of stereo ("Atmos"): "Lumière Sphere": the film spread over virtual speakers in the hall, heard from your head
- [x] L2 Screen light on side walls, ceiling, floor and chairs: Cycles screen-light layer on every surface, tinted by the picture
- [x] L3 Spatial screen light (red at the bottom, green in the middle, yellow on top): the room samples a blurred copy of the picture by position (bottom lights low, top lights high)
- [~] L4 Wall spill only a little stronger: tuned on the software renderer only
- [x] L5 Big-screen (IMAX) hall has almost no spill: same system in MAX
- [x] L6 Curved hall spill poor
- [x] L7 Standard hall spill a little more defined
- [~] L8 Lighting not realistic: Cycles light maps with an exposure per room
- [~] L9 Reflections too strong: unchanged default (soft)
- [x] L10 Chandelier reflection looks like a clock (photo 13): no chandelier in the v9 lobby
- [x] L11 Male restroom mirror reflects, female doesn't: both restrooms built from the same fixtures and mirrors
- [x] L12 Curved hall lights not curved and placed wrong: the CURVE coves follow the screen curve
- [x] L13 Washing, urinal and restroom sounds don't make sense: recorded flush, tap, lid
- [x] L14 Taxi drop-off has no sounds: recorded car doors
- [x] L15 Seat shake only on the best scenes (detected): only on strong climax or scare cues
- [x] L16 Particles only on those scenes: sparks only on those cues
- [x] L17 Toggle crowd sounds: crowd volume (0 = off)
- [x] L18 Toggle dialogue: spoken voices switch
- [~] L19 Toggle clapping: through the crowd volume
- [x] L20 Toggle particles
- [x] L21 Toggle seat shake

## Architecture and models
- [x] A1 Corridors like Dolby: curves, rounds, triangles, diamonds, not cubes: diamond relief, light arches, rounded lit portals (tools/blender/arch/rooms.py)
- [x] A2 3-4 colours per theatre with dim variants and smooth transitions: 3-4 colour palettes per space (building.js PALETTE)
- [~] A3 LUMIERE brand mark: simple, 3-4 colours, light and texture: the LUMIÈRE wordmark in gold; no new logo
- [~] A4 App intro animation: the loader card; no new intro animation
- [x] A5 Taxi always there: the taxi waits at the kerb
- [ ] A6 Luxury taxi: same taxi model
- [ ] A7 Intro: car interior, the driver driving, getting out, door closing: no car interior or driver model (the driver speaks)
- [x] A8 Exterior texture coloured, not white (photo 10): sandstone, bronze and gold facade
- [~] A9 Curved and standard halls feel premium
- [~] A10 IMAX hall looks "off": rebuilt as MAX
- [~] A11 Lobby has a weird vibe: rebuilt lobby
- [~] A12 Every model rebuilt from scratch: detail, shadows, LODs: rooms rebuilt; props reused from v7 and v8
- [x] A13 Whole IMAX hall as one model: one baked model per hall
- [x] A14 Whole standard hall as one model
- [x] A15 Whole curved hall as one model
- [x] A16 Escalators separating the theatres, working, can't be skipped: the only way up is the gate and the escalator (or the lift with a checked ticket); walked in a test
- [x] A17 Working elevator with floor selection: lift with floor choice; walked in a test
- [x] A18 ScreenX-like hall: 270: the picture spreads onto the side walls in big scenes
- [x] A19 See-through empty spaces everywhere: see-through gate <= 0.05 % of rays in every room
- [ ] A20 Popcorn models glitched and grainy: same popcorn models
- [x] A21 Barriers / balcony rails through seats (photo 9): rebuilt halls (no rails through seats)
- [x] A23 Exit area barriers glitched: rebuilt exits
- [x] A24 Walking through doors: closed doors block
- [x] A25 Stairs glitched: aisle steps <= 0.18 m by calculation; exit stairs walked in a test
- [x] A26 Seats centred: a true middle seat (not 9 <- 1 -> 10): every row has a middle seat (test)
- [x] A27 Curved screen more curved: CURVE screen sag 11 % (1.98 m on 18 m)
- [x] A28 Connected premium sofas that cost more: Love Seat and Prime Sofa classes
- [x] A29 Dustbins in the theatres: a bin in every hall
- [x] A30 Seat LOD visibly pops two seats away: detailed seats within 7 m with hysteresis
- [~] A31 Photo 1-2: balcony front see-through: rebuilt; no photo-by-photo before/after renders
- [~] A32 Photo 3: IMAX screen sides empty: rebuilt
- [~] A33 Photo 4: standard hall doors: rebuilt
- [~] A34 Photo 5: exit stair makes no sense: rebuilt (raised-hall exit headroom fixed after a route test)
- [~] A35 Photo 6: standard entrance glitched: rebuilt
- [~] A36 Photo 7: curved entrance see-through: rebuilt
- [~] A37 Photo 8: curved hall aisles glitched: rebuilt
- [x] A38 Photo 12: stanchions floating: props stand on the floor (placed on their own base)
- [x] A39 Chairs, halls, corridors, doors, exits, entrances, lights, restrooms redesigned
- [x] A40 Screen placement makes sense
- [~] A41 Concession counter and machines: new counters, v7 machines

## Flow
- [x] F1 Real flow: reception, show tickets, waiting area, lobby, concessions, restrooms, corridors
- [x] F2 Once inside, can't leave through the entrance: one-way doors
- [x] F3 Can't come in through the exit door
- [x] F4 Can't enter the exit corridor from outside
- [x] F5 Entry feels slower, exit faster: in by escalator and a long dim corridor, out by a short bright spine with a travelator
- [x] F6 Exit placement logical (entrance is nearer than the exit today): exits beside the screen open straight onto the spine
- [x] F7 Rename "Story mode" (user: flow mode): Flow mode
- [x] F8 Quick Play spawns in the lobby, not in an IMAX seat
- [x] F9 Quick Play: sit on any seat
- [x] F10 Quick Play: order from the tablet
- [~] F11 Quick Play: change seat or swap with an NPC from the tablet: sit in another free seat; no swapping with people
- [x] F12 Quick Play: teleport-to-seat button
- [x] F13 Quick Play: throw trash away from the tablet
- [x] F14 Quick Play: pick any chair before playing a film

## Money
- [x] M1 Money system annoying ("remove it"): no wallet: a bill paid by card
- [x] M2 Realistic prices: Indian multiplex prices
- [x] M3 Pay extra at booking to get the tablet at the seat: ₹99 armrest tablet
- [x] M4 With the tablet, no bell button
- [x] M5 Premium (connected) sofas cost more
- [x] M6 No calling the server for every single thing: order from the tablet

## UI
- [x] U1 Crosshair / centre dot
- [x] U2 Options appear only when aimed at things
- [~] U3 Full screen; no blocked left strip (photo 11): the app reports the cutout to the page; not seen on the phone
- [ ] U4 Layout editor glitched: layout editor unchanged
- [ ] U5 Size control inside the layout editor: size stays in Settings
- [~] U6 Top row overlaps other UI: not reproduced in renders
- [~] U7 Settings not confusing
- [x] U8 Settings apply instantly: most switches apply at once (shadows on/off needs a restart)
- [~] U9 Tutorial makes you do things (fun): same steps, new text
- [x] U10 Tutorial skippable at any point
- [~] U11 Floating UI only where it makes sense
- [ ] U12 Tablet is a real 3D device with a main menu: no 3D tablet
- [x] U13 Tablet tiles not tiny or glitched

## Performance
- [~] X1 Performance "peak low": major optimisation: 13-55 draw calls per frame in renders; seat and arm culling, GPU crowd; not measured on the phone
- [x] X2 Low-lag toggles: graphics switches plus the new effect switches
- [x] X3 On-device diagnostics (FPS, decoder, errors) so the next report has evidence: How to play shows device, WebView, app server, hardware decoders, fps

## Process
- [x] R1 Research theatres: articles, standards, engineering, calculations: docs/V9-DESIGN.md
- [x] R2 How high or low seats are (rake, riser heights): docs/V9-DESIGN.md
- [x] R3 Real entrance workflow: docs/V9-DESIGN.md
- [x] R4 How a lobby looks and works: docs/V9-DESIGN.md
- [x] R5 Where people sit (preferred seats): docs/V9-DESIGN.md
- [x] R6 Corridor designs: docs/V9-DESIGN.md
- [x] R7 3-4 colour palettes with dim variants: docs/V9-DESIGN.md
- [x] R8 Light bounce: docs/V9-DESIGN.md
- [x] R9 Premium seats: docs/V9-DESIGN.md
- [ ] R10 What people like most
- [ ] R11 Why Irusu feels better; perception "psychology tricks"
- [ ] R12 Licences: every font, image, package, model, sound, voice
- [ ] R13 Review and use the linked skills safely
- [ ] R14 Surprise bundle (implemented, not described)
- [ ] R15 Diagrams and layouts before models, models before core
- [ ] R16 Finish in one pass
