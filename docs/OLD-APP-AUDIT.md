# LUMIERE: what went wrong in the old build, and how v3/v4 prevent it
Sources: the four Cinema-project briefs, the uploaded lumiere-app APK (v1.28, code 29), and the screen recordings (see VIDEO-ANALYSIS-NOTES.md).

| # | Old problem (evidence) | Answer | Status in v4 |
|---|---|---|---|
| 1 | Furniture and seats were cream placeholder boxes; seat rows read as slabs (recording 1, 0:44-3:37) | Every prop is ONE fused SDF solid with smooth fillets and 3 LODs. The seat is a plush quilted sofa-recliner with cupholders. | Done: 35 props |
| 2 | Characters were featureless mannequins (0:04-0:11) | 9 skinned characters: procedural animation, painted faces, hair, clothes and accessories | Done. Faces are painted, hands simple. |
| 3 | z-fighting and shimmer from stacked boxes | Single meshes; decals use polygonOffset; no coplanar overlaps | Done. v4 also removed glow parts hidden behind posters, which showed through at angles. |
| 4 | Cyan colour garbage from wrapped 8-bit atlas maths | Float32 linear vertex colours, no 8-bit atlas | Done |
| 5 | Material identity lost after boolean union | Colour zones evaluated from the SDF parts at every vertex, with per-zone bias | Done. v4 fixed the cap and hat zones. |
| 6 | Floating parts and wrong anchoring | Pipeline health checks (pieces, open edges, minY); `docs/MODEL-HEALTH.md` is read back from the shipped GLBs | Done. The exceptions are listed in MODEL-HEALTH.md. |
| 7 | Hall almost black, corridor too dark (0:23-0:43, 1:52-3:08) | Brighter materials, recessed aisle lights, LED bars, wall washers, house-light states, screen spill | Done (headless check). Phone check pending. |
| 8 | Toast "Your tape is rolling..." never disappeared (0:18-3:20) | Toasts auto-dismiss | Done |
| 9 | Cream placeholder shown as the screen until the video decodes (0:41-0:46) | Black glass plus idle slate; the picture appears only after the first decoded frame | Done (headless with a real WebM). Phone check pending. |
| 10 | No ambience; the second clip was about 14 dB louder (audio analysis) | Procedural ambience per room, crowd sounds, film audio through a room filter, automatic level control and a limiter | Done. Audibility on the phone is untested. |
| 11 | 62 MB APK (one atlas plus a GLB per model) | 5.2 MB APK (44 models share vertex colours plus one 128 px detail texture) | Done |
| 12 | 122 KB monolithic world.js | Small modules (engine, materials, world builders, nav, crowd, talk, shows, sound, ui, main) | Done |
| 13 | The spec asked for "decompose() == 1" with Manifold-3d in Termux | Replaced by SDF + surface nets + colour-aware quadric decimation (pure JS, runs in Termux) | Deviation; see RESEARCH-NOTES |

## v3 problems seen on your phone (recording 2) and their v4 status
- Empty lobby: fully dressed, with people.
- Orange wedge in the hall: removed.
- Dark corners: more light sources.
- Washed-out coffer: replaced.
- Bright floor-lamp shade: still a glow part. **Check it on the phone.**

## Honest list of what is still imperfect
See "Known limitations" in `V4-RELEASE-NOTES.md`.

**Nothing in v4 has run on a phone yet.**
