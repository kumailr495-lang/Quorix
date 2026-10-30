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
