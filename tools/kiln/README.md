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
