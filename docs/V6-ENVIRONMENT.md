# LUMIERE v5.20: building plan and environment brief

Why a new plan: on the phone (v5.10) the corridors were narrow and close together, the middle hall's doors on both sides made
it look like four screens, the halls felt small, and the restrooms were only doors. This plan fixes the circulation first, then
the rooms are art-directed one by one and reviewed in renders from several angles.

## Sources
- UNIC, *How to design a cinema auditorium* (Gjestland, 2020): crossing aisle at entrance level, light-lock vestibule (8.1.2),
  walls from the screen to row A matte black (6.4), side masking S >= 0.3 + 0.05 W, row pitch >= 1.2 m (recliners 1.6 to 1.8 m),
  aisle >= 1.2 m, no more than 10 seats between a wall and an aisle, room height about 0.85 W for L/W 1.5, house light 150 lux
  full / 50 lux half, dimmable stair lights, exit signs shielded from the screen, balconies "make the room look magnificent".
- Dolby Cinema: signature curved video-wall entrance showing content from the film playing inside.
- Britannica, *Theatre design*: house and front of house (entrances, lobbies, ticketing, restrooms) exist to serve audience comfort,
  safety, seeing and hearing; end-stage (proscenium/cinema) form focuses all attention on the picture.
- Architizer, *Theater plans*: plans organised around the hall, with a public sequence street -> lobby -> foyer -> house.

## Circulation (the sequence a guest walks)
street -> glass vestibule -> **lobby** (box office west, bar-cafe north-west, concessions east, lounge island centre)
-> **ticket check** (usher podium and stanchions at the gallery mouth) -> **gallery** (7 m wide, 32 m long, the spine)
-> restrooms off its south end (men west, women east) -> **Screen 1** door on the left, **Screen 3** door on the right, both at
their crossing aisles -> straight ahead, the **Dolby-style video tunnel** -> **Screen 2 (IMAX)**, entered through a vomitory
trench to its crossing aisle. Exit doors near each screen open back into the north end of the gallery (in and out never cross).

## Plan (metres; +z = street/south, screens face north, -z)
| Space | x | z | Height | Notes |
|---|---|---|---|---|
| Street | -40..40 | 20..44 | open | night, wet pavement, buildings opposite |
| Lobby | -16..16 | 0..20 | 8.0 | glass front at z = 20 |
| Gallery | -3.5..3.5 | -32..0 | 4.6 | coffered ceiling, pilasters every 6 m |
| Restroom, men | -12..-3.8 | -8..-0.3 | 3.2 | urinals, stalls, vanity |
| Restroom, women | 3.8..12 | -8..-0.3 | 3.2 | stalls, vanity, powder shelf |
| Screen 1, curved premium | -21..-3.8 | about -31..-8.3 | 9+ | 14 m curved scope screen, recliners |
| Screen 3, standard | 3.8..19 | about -31..-8.3 | 9+ | 12 m flat screen, 11 rows |
| Video tunnel | -3..3 | -40..-32 | 3.2 | curved LED walls both sides |
| Screen 2, IMAX | -14..14 | about -74..-40.3 | 15+ | 22 m screen 1.90:1, steep rake, vomitory, balcony tier |

## Rules for every room (from the user's brief)
- Every space has a purpose and believable construction: wall thickness, reveals at openings, skirting, thresholds where
  floor materials change, ceilings with a structure (coffers, bulkheads, cove pockets), lights that come from fixtures.
- Materials at real scale with joints: floor tile 600 mm, parquet chevron 90 mm boards, carpet repeat about 1 m, restroom tile
  300 x 600 mm with grout, wall panels on a 1.2 m module.
- No floating or intersecting objects: `check-world.mjs` for coplanar faces, Kiln QA for floating parts, renders from several
  angles before anything is called done.
- Phone: itel P65 (Unisoc T615, Mali-G57 MP1, 720 x 1600). Medium is the default; quality is not traded away, but one draw per room
  (texture arrays) and portal culling keep the GPU work in budget.

## Each hall has its own identity (the user: "the models for the screens don't match the theatre's vibe")
Sources: UNIC handbook (stray light 6.2, house lighting 7.1, recliner sizes 5.2: seat depth 900-1400 mm at rest, width 650-900 mm,
recliners stand on four legs; tip-up seats hang between arm standards on the riser); IMAX (Wikipedia: GT screens up to 18 x 24 m,
steep stadium seating, IMAX with Laser adds overhead and side speakers); Dolby Cinema (signature video-wall entrance);
AMC / Cinemark / ODEON Luxe recliner halls (power recliners, side tables, reserved premium rows).

| | SCREEN 1 · Curved Premium | SCREEN 2 · IMAX | SCREEN 3 · Standard |
|---|---|---|---|
| Feeling | a private members' club: warm, intimate, crafted | spectacle and precision: you disappear into the picture | the classic picture palace, modernised |
| Screen | 14 m scope, curved (8 % chord), velvet curtain | 22 m, 1.90:1, wall to wall and nearly floor to ceiling, slight curve, no curtain (a cool wash light on the screen between shows) | 12 m flat, red velvet curtain |
| Seats | power recliners in cognac / oxblood leather, chaise footrest, headrest; walnut side tables with brass trim and a reading light between pairs; warm LED under-glow | high-back rocker seats in black leather, slim steel arms with blue cup-holder rings; blue step lights | tip-up seats in teal velvet with walnut back shells, classic arm standards with cup holders |
| Walls | walnut slats with recessed warm light lines, black near the screen (stray light) | charcoal acoustic panels on a 1.2 m module with shadow gaps, thin blue light lines, black near the screen | teal fabric panels over a dark wood dado, deco wall sconces shielded from the screen |
| Ceiling | matte black with a star field | matte black, visible overhead speaker arrays (IMAX with Laser) | matte black with recessed house lights |
| Floor | thick deco carpet, walnut-edged steps | dark charcoal carpet, black risers, blue nosing lights | burgundy carpet with gold nosing lights |
| Signature | curved screen + curtain reveal, star ceiling | the vomitory entrance from the video tunnel, the balcony tier | the curtain, the sconces, symmetry |

## Lighting is the biggest lever (blender-pro-workflow: "a great model under bad lighting renders worse than a mediocre model under great lighting")
The v5 renderer lights the building per vertex: no real shadows, no bounce light, blotchy where walls are coarse. v5.20 bakes light in
Blender Cycles into per-room light maps (real soft shadows, bounce colour, contact shadows under seats and furniture), in separate
layers the game mixes live: house lights (dimmed for the film), fixed lights (step lights, signs, LED lines) and the screen's own light
(tinted live by the picture). Rooms without a bake fall back to the vertex lighting.

## What v5.20 built (2026-10-30)
- **Light maps** (tools/bake/README.md): every room's shell is baked in Blender Cycles (house / fixed / screen layers, real soft shadows
  and bounce); placed props are baked per vertex (fine flutes and cushions are too small for light-map texels); hall seats and arms get
  Cycles-baked light probes. A geometry fingerprint makes a stale bake fall back to the old per-vertex light instead of lighting the wrong place.
- **Hall seating** (tools/blender/seats.py): Screen 1 chocolate-leather power recliners with walnut-topped consoles and brass cup holders;
  IMAX winged black-leather rockers with blue-ringed cup holders; Screen 3 teal velvet tip-up seats with moulded walnut shells, brass caps
  and number plates.
- **Hall identities**: Screen 1 deco carpet; IMAX acoustic panels on a 1.2 m module with shadow gaps, overhead speaker arrays, blue nosing;
  Screen 3 stepped walnut dado with deco sconces (shielded: up and down light only), gold nosing; round downlights everywhere.
- **Restrooms**: 600 x 1200 stone floor tiles with real joints, glazed wall tile under a brass trim, floating walnut vanity with vessel basins,
  brass taps, round back-lit mirrors, walnut cubicles, urinals behind glass screens. Gentlemen's: bottle green over dark stone; ladies':
  blush over calacatta.
- **Lobby**: deco torchere centrepiece (replaces the low-poly tree), bar screens lowered to 1.1 m so the bar opens onto the lobby.
- **Street**: night rain (one instanced draw) and wet, glossy paving with puddles reflecting the shop windows.
- **Fixes found on the way**: room reflection probes were never captured since v5.1 (metal and mirrors rendered black); stadium risers and
  aisle step sides were wound backwards (culled from the front); texture scales now follow each CC0 scan's physical size.

