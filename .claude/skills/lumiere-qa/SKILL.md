---
name: lumiere-qa
description: LUMIERE's quality gates for geometry, prop models, placement, people and routes, with the exact commands, pass criteria and pitfalls. Use before calling any change done to rooms or halls (tools/blender/arch, building.js, hallmath.js), prop models (Kiln or Blender builds in www/models), dressing (world9.js), NPC spots and routes (npc9.js), the lift, doors and gates, or the taxi arrival (intro9.js); and whenever the user reports z-fighting, flicker, floating or disconnected parts, see-through gaps, people walking through things or each other, or wrong placement.
---

# LUMIERE QA gates

Every gate runs the real engine headless (Chromium + SwiftShader) or Blender. None of them is a phone test: say so in every report.
Cloud only (Playwright and Blender): `BLENDER=/opt/blender-5.2.3-linux-x64/blender`.

## Which gate for which change

| Change | Gates, in order |
|---|---|
| Room or hall geometry (tools/blender/arch, building.js, hallmath.js) | `python3 tools/blender/arch/build.py --check`, then `sh tools/bake/bake9.sh <rooms>`, then zcheck |
| A prop model (Kiln or Blender build) | build, `sh tools/optimize-models.sh`, glb_check, `glb-unfold --dry`, then zcheck |
| Placing or moving props (world9.js DRESS) | props-overlap, walk (NAV clearance), zcheck |
| Guest spots, legs, staff posts (npc9.js) | npc-clear 600 |
| Doors, the ticket gate, the lift, escalators | walk (26 walks), the lift controls probe |
| The taxi arrival (intro9.js, cabin.py, cars.py) | glb_check on both models, zcheck (its cabin pass), a ride render |
| Anything | `sh tools/run-tests.sh` (logic, i18n, syntax, bakes current, near misses, comment lint) |

## The gates

- **zcheck** (z-fighting, the user's hard rule): `BLENDER=... sh tools/dev/zcheck.sh OUT`, about 20 minutes. It dumps every reachable
  eye point and the engine's meshes (with the Story taxi parked at the kerb), builds the nine rooms in Blender and keeps every pair of
  same-facing faces under 5 mm apart that a player can see from far enough for the 24-bit depth buffer to merge them; then a second pass
  checks the taxi's cabin from the back seat. Pass: both `TOTAL visible coplanar 0, visible close 0` lines. Details per pair: `OUT/z.json`,
  `OUT/zcab.json`.
- **glb_check** (parts touching, mounting, coplanar faces between parts, folds): `$BLENDER --background --factory-startup --python
  tools/blender/glb_check.py -- www/models/X.glb [--long]`. Pass: `1 groups, 0 floating, 0 coplanar pairs, 0 folds` (hall seats may show
  a second group: the tip-up seat hangs on pivots from the arms). `--fix OFFS.json` then `node tools/dev/glb-offsets.mjs OFFS.json` moves
  small floating parts into their neighbours as node offsets: read every move, diagonal ones are wrong, fix those in the source.
- **glb-unfold** (coincident folded faces: an outline doubling back, a simplifier's collapse): `node tools/dev/glb-unfold.mjs X.glb --dry`
  lists them; without `--dry` it removes the folded face of each pair and keeps the rest of the file. It only acts within 0.5 mm: a sharper
  turn is a shape, fix the source (the torchere's bowl profile was mirrored).
- **build.py --check**: every room built from the current spec must match its bake (a stale bake leaves the room undrawn, with no
  collisions) and no two parts may stand 1-30 mm apart (`tools/blender/arch/connect.py [room]` lists them).
- **walk**: `node tools/dev/walk.mjs OUT`, 26 scripted routes (entrances to seats, exits, escalators, lift, street, restrooms, the ticket
  zone kept shut). Pass: `walks: 26/26 passed`; it also fails when a NAV edge passes within 0.25 m of a wall or prop.
- **npc-clear**: `node tools/dev/npc-clear.mjs 600`. Pass: nobody inside a wall or prop, nobody walked through anyone, nobody standing
  inside anyone, no walker stuck. Guest legs keep 0.8 m from other spots and from standing staff.
- **props-overlap**: `node tools/dev/props-overlap.mjs [--rooms lobby,street]`. Pass: `0 overlapping pairs`.

## House rules the gates enforce

- Parallel layers stand 5 mm or more apart (inlays, borders, brass lines, panel beds, frames, vent slats).
- A part set into another goes at least 2 mm in, and its faces never end in the other's planes (end caps 1 cm past, legs ending inside a bar,
  not at its ends or sides).
- Parts either embed or stand more than 30 mm apart; nothing floats: every part reaches the floor, the ceiling (hung) or the wall (letters,
  mirrors, sconces) through its neighbours. A body on wheels needs what holds it (knuckles, struts).
- Closed sweeps are welded (first point = last point); a 3D glyph with overlapping strokes gets a self union.
- Two models never drawn together (the taxi's outside and its cabin) are checked in separate passes.

## Pitfalls

- Run zcheck only after every bake has finished: while a room's bake is stale the room is undrawn, its collisions are off and the eye
  points spill into places nobody can stand (2026-11-15: 103 false findings from the street).
- Waiting on a job: `pgrep -f NAME` inside a shell whose own command line contains NAME matches itself and waits for ever. Wait on the PID
  (`while kill -0 PID`) or on the job's own log line.
- Kiln writes level-of-detail copies as `Part` and `Part.001`; glb_check keeps the first. Blender-built models name them `_LOD1`.
- Placement helpers: a lathe placed along an axis needs a side hint that is not that axis, or the shape collapses to a line (cabin.py
  `frame`).
- Report evidence, not hope: quote the pass lines; if a gate did not cover a change, say so.
