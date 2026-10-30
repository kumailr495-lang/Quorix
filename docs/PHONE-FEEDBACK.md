# Feedback on the v5.20 renders and 20 reference photos (2026-10-30, later): status in v7

The user judged the v5.20 renders and sent 20 photos (Allu Cinemas Kokapet, a Dolby corridor, Dubai/India IMAX halls, a VIP
hall, a curved panorama room, a seat map). Plan and research: docs/V7-DESIGN.md. Nothing below has been seen on the phone yet.
- [x] Lobby "literally the same", weird feeling: rebuilt from zero after Allu (v7, software renders only).
- [x] Bar covered, bad floor: canopy and triangle tile removed; onyx back bar, stadium counter, ring pendants (v7).
- [x] Corridors not Dolby: limestone panels, LED slots, fluted number totems, blue-grey carpet, light trough (v7).
- [x] Outside area fake and cheap: plaza with lit perforated facade, canopy on bronze columns, gold letters, carpet, totems (v7).
- [x] Entrance is a direct spawn: you start at the kerb and walk in through the sliding doors (v7).
- [x] IMAX entrance cheap: IMAX portal, gateway hall with a curved panorama wall, side entrances into the hall (v7).
- [x] NPCs sitting in theatres with no film; "Velvet" playing by itself: no automatic shows, audiences only for your booking (v7).
- [x] No middle seat: the IMAX centre trench is gone (all 416 seats), 6 + 20 + 6 aisles; Screen 1 has a lit centre aisle (v7).
- [x] Restroom looks empty: dryers, towel dispensers, bins, soap pumps, baby change, print, plant, cove light (v7).
- [~] Kiln "crazy good" models: 11 new Kiln props (chandelier, sofa, bar, totems, planters...) and Blender 3D letters; hall seats are
  still the v5.20 Blender families.
- [~] Performance techniques: mipmaps and seat LODs were already in; distance fog added outside; foveated rendering is not
  available to WebGL in a WebView (the resolution governor is the equivalent). New single props have no LOD tiers.

# Phone feedback on v5.10 (2026-10-30) and its status

The user ran v5.10 on their Android phone and sent 10 screenshots. They also approved every idea listed in CLAUDE.md.
`[ ]` open, `[x]` done (with the version), `[~]` partly done. Never tick an item as "verified on the phone" without the user's report.

What the screenshots showed (HUD counters): 24 to 43 fps, 37 to 142 draw calls (142 in a passage that sees two halls and their
audiences), render scale jumping between 0.90x, 1.05x and 1.13x, a posterised film picture with wrong colours, and a mojibake
file name ("BrahmÄ_stra.Part.One...").

## Performance and rendering
- [ ] Lag. The phone runs PUBG and Minecraft smoothly; check performance on every change.
- [ ] Black flicker for 0.1 to 0.9 s (likely the resolution governor resizing the canvas).
- [ ] LOD and distance-loading pops.
- [ ] Some NPCs flash brighter in the theatre.
- [ ] Film picture posterised and wrong colours; play at full quality.
- [ ] Screen light spilling onto models and NPCs needs to be better.
- [ ] Option to hide or disable NPCs.
- [ ] Camera clips slightly into the seat when sitting.

## Layout and theatres
- [ ] Corridors too close together, theatres too small, still claustrophobic.
- [ ] Left/right doors from the middle made it look like 4 theatres.
- [~] Screens in order: 1 = a great curved screen, 2 = a big IMAX screen with its vibe, 3 = standard. Each must feel like its type. (v5.20: own seats, walls, carpet, lighting per hall; not seen on the phone yet)
- [~] Show screens by number with good pictures; remove the fake film titles ("Velvet Hour" etc.). (v7: lit number totems at the doors; idle halls name no film; house films still exist when you book one)
- [ ] Sliding doors are blank black: texture them or build the planned corridor.
- [ ] Research cinema engineering (structure, entry/exit, riser heights); seats placed oddly.
- [~] Real male and female restrooms (only a door now). (v5.20: full rooms with vanities, basins, mirrors, cubicles, urinals; not seen on the phone yet)
- [~] Approved: Dolby-style video-wall entrance tunnel; balcony in the IMAX screen. (v7: the tunnel became the IMAX gateway hall with a panorama wall; the balcony has curved walnut pods)

## People
- [ ] Glitchy walk, tweaky animations.
- [ ] Speaking sounds (gibberish voices).
- [ ] Faster dialogue text.
- [ ] Easy names; many more lines.
- [ ] Receptionist and staff walk too slowly.
- [ ] Feet go into the sofa before sitting.
- [ ] NPCs appear in theatres with no film playing.
- [ ] Smarter crowd: scream, throw popcorn and money (particles that vanish smoothly), stand and clap, jump on seats, at the right scenes.
- [ ] Approved: Kiln-modelled people with better faces and outfits.

## Usher
- [ ] Remove the glowing route to the seat.
- [ ] Point the player to the guide: "You have a ticket?" -> "Show ticket" -> hand-over and check animation -> "Here, this way" -> guides you.

## Food and drink
- [ ] Sip and eat models and animations are poor; coffee and cola look the same.
- [ ] Approved: carry popcorn and drinks to the seat, with refill.

## Seat service and money
- [ ] Seat button calls a waiter: "How can I help you?"
- [ ] Playback controls: seek, speed (2x), stop, change film.
- [ ] Order from a separate menu with icons and good item models.
- [ ] Wallet balance that can run out; an ATM inside the cinema for withdrawals.

## Show presentation
- [ ] Better curtain animation.
- [ ] Custom icon instead of the "silence your phones" emoji.
- [ ] On curtain open: "LUMIÈRE Cinema - Now Playing: <film>", with the name read from the file name (fix the mojibake).
- [ ] Approved: trailers before the film.

## Building
- [~] Outside looks bad. Approved: rain and night street. (v5.20: rain and wet paving; buildings unchanged)
- [~] Lobby grand but unfinished; barriers and sofas poor; bar should be better and feel connected. (v5.20: torchere, open bar screens, brass now reflects; sofas and barriers not remodelled yet)
- [~] Approved: photo spot with a poster frame; seat-number brass plates; Kiln cup stacks, menu boards, guide sign. (v5.20: Screen 3 seats carry brass plates, without numbers yet)

## Sound
- [ ] Sounds repetitive and bad; transitions sound bad.
