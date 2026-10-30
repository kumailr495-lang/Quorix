# LUMIERE props with Kiln

Every prop GLB in `www/models/` is built from a `*.kiln.js` file here with **Kiln** (https://github.com/instruktlabs/kiln,
MIT licence, free, no account, no model API key). Kiln runs the JavaScript, renders geometry views, runs structural QA and
writes the GLB.

## What each file is

| File | Prop | Notes |
|---|---|---|
| seat_standard | Screen 1 seat | channel-tufted velvet, walnut shell, brass edge; LOD0 + LOD1 |
| seat_giant | Screen 3 seat | same construction, taller navy back, black shell |
| arm_standard | arm standard between seats | n + 1 per row; LOD0 + LOD1 |
| recliner, console_recliner | Screen 2 recliner and the console between recliners | consoles have a warm LED underglow |
| column_fluted, column_fluted_5 | 7 m and 5 m columns | 24 real flutes, brass bands, uplight ring |
| counter_module | 2 m service counter | walnut slats, marble top, brass kick, LED line; used for tickets, bar, snacks |
| popcorn_machine | counter-top popcorn machine | lamp glows, popcorn heap |
| bar_stool, armchair_deco, side_table | bar and lounge furniture | |
| pendant_dish | brass dish pendant | hangs from Y = 0 |
| stanchion, rope_velvet | queue post and 1.8 m velvet rope | |
| poster_case | 1.2 x 1.8 m back-lit poster frame | the engine adds the poster texture |
| banquette_seg | 1/8 of the round lobby banquette | the engine places 8 |
| planter_tall, planter_tree | snake-plant pot, island tree planter | |
| facade_bay, shopfront | street building storey and ground-floor shop | windows lit/dark per placement (`glowMul`) |
| lamp_post, car_sedan | street lamp, parked sedan | car paint via `swap` |
| back_bar, drinks_fountain, candy_wall | bar and concession fittings | |
| kiosk, pos_terminal | ticket kiosk, counter card terminal | |
| bench_velvet, bin_brass, usher_podium, chandelier_ring, door_padded | lobby furniture and fittings | |
| chandelier_cascade | v7 lobby hero chandelier | 44 swept light ribbons from an elliptical brass halo into a stacked wavy core (sweepProfile) |
| sofa_curve, table_lounge | v7 lounge: curved channel-tufted sofa, fluted brass drum table | arc sweeps, alternating channel depth |
| pendant_ring | v7 bar pendant, 5.2 m drop | brass ring with a glowing inner band |
| back_bar_onyx, bar_counter | v7 bar: backlit onyx panels, shelves, turned bottles; stadium counter with fluted front | lathe bottles, extrudeProfile plan |
| poster_totem, number_totem | v7 double-sided poster lightbox; Dolby-style fluted-glass screen-number totem | the engine lays the poster / number on them |
| planter_hedge, bollard_light | v7 plaza planter with a clipped hedge (leaf clumps), turned bronze bollard light | |
| restroom_set | v7 restroom fittings in one GLB (Dryer, Towel, Bin, Baby, Soap) | the engine stamps one fitting with placeAsset `only` + `shift` |

v7 3D signage letters (LUMIÈRE, CINEMAS, IMAX) are made in Blender from OFL fonts: `tools/blender/letters.py`.

Conventions: metres; Kiln's +X is the front of the prop (the engine turns it to face +Z); floor at Y = 0. Materials are named
after `www/js/library.js` `NAMED` keys and carry no textures (the engine supplies them). Names starting with `glow` are emitters.
UVs come from `projectUV(..., { metersPerUnit: 1 })` so the library textures tile at real-world size.

## Build

Kiln needs Node 22 or newer.

```sh
mkdir kiln-install && cd kiln-install && npm init -y && npm install @instruktlabs/kiln
npx --offline --no -- kiln-init ../kiln-ws --harness claude
cd ../Quorix   # this repo
KILN_WS=../kiln-ws node tools/kiln/build.mjs                    # every prop
KILN_WS=../kiln-ws REVIEW=/tmp/review node tools/kiln/build.mjs seat_standard   # one prop + Kiln's geometry sheet
```

In Termux, Node 22 works (`pkg install nodejs`). Kiln's CPU geometry views work everywhere. Its material-faithful GPU views need
a WebGPU adapter; neither Termux nor the cloud machine used for v5.1 has one, so material review was done with
`LIB=1 node tools/dev/view-glb.mjs out.png www/models/<name>.glb` (three.js in headless Chromium with the real library textures;
needs Playwright, so desktop/cloud only).

## Checks

- `node tools/dev/check-world.mjs www` reports coplanar overlapping triangles (z-fighting) inside each Kiln asset and in each room.
- Kiln's own QA warnings for these files are duplicate node names across LOD tiers (harmless).
