# LUMIERE v5.1: art direction

Why this exists: your v5.00 screenshots read as an airport (white plaster, terrazzo, flat boxes) and v4 read as medieval/spooky.
This page records the research behind the replacement look, the rules the code now follows, and where each rule lives.

## Research: what makes a cinema feel premium

Reference photos were downloaded and compared side by side (sources below). The pattern is consistent:

| Seen in the references | What it means for LUMIERE |
|---|---|
| Warm 2700 K light in pools, not even ceiling light (Everyman bars, Dolby entrance) | Low ambient, strong downlight cones, wall-wash and grazing light; dark ceilings |
| Herringbone / chevron wood floors, patterned geometric tile at bars (Everyman Broadgate: Havwoods "Cocoa" + "Dalga Rustic") | Chevron oak parquet in the lobby, black / cream / terracotta tile at the bar and the entrance |
| Fluted and slatted walnut, brass trims, marble bar tops (Everyman Altrincham: walnut + marble + brass) | Fluted walnut wainscot with brass caps, walnut-slat counter fronts, Nero Marquina tops, brass rails |
| Velvet seating in strong colours (teal, mustard, red), brass dish pendants, neon signage ("BAR & SCREENS") | Velvet banquette and deco armchairs, dish pendants over the bar, neon TICKETS / Bar & Café / POPCORN |
| Classic cinema carpet with a fan / deco motif in corridors | Burgundy carpet with gold fans in the concourse |
| Dolby Cinema: black faceted walls, a continuous blue light line, lit steps, a dramatic entrance | Screen 3 is black with blue light lines along the walls and blue step lights |
| Luxury auditoria: red/orange velvet recliners, fluted side walls with warm vertical light slots | Screen 2: burgundy recliners, walnut slat walls, warm slots |
| Bright Scandinavian foyers (Cinemateket Oslo) are beautiful in daylight but read as "airport" at night in a game | Avoided: no white walls, no grey terrazzo fields |

Mobile environment-art practice (trim sheets, bevelled edges catching highlights, baked lighting, reflection probes) shaped the
renderer: every surface has a texture and a normal map, edges are bevelled in the Kiln models, light is baked per vertex and
each room has its own reflection capture.

Sources:
- Everyman Broadgate case study (Havwoods): https://havwoods.com/ie/case-studies/everyman-broadgate-london
- Everyman venues (Altrincham, Glasgow, Clitheroe, Manchester St John's) via venue and design-firm pages; Lyndon Design seating:
  https://www.designinsiderlive.com/lyndon-design-a-box-office-hit-at-everyman-cinemas/
- Cinemateket Oslo, SAAHA AS (ArchDaily): https://www.archdaily.com/1016023/cinemateket-saaha-as
- Dolby Cinema entrance and auditorium: https://en.wikipedia.org/wiki/Dolby_Cinema , https://www.pritchardpeck.com/portfolio/dolby-cinema/ ,
  https://arstechnica.com/gadgets/2015/12/dolby-cinema-laser-powered-projection-object-based-3d-audio-awesome-2/
- UNIC "How to design a cinema auditorium" (walls near the screen black, step and guide lights, decorative wall light shielded):
  https://www.unic-cinemas.org/fileadmin/user_upload/Publications/UNIC_handbook_online_02_20__1_.pdf
- Trim sheets and modular kits: https://www.beyondextent.com/articles/balancing-modularity-and-uniqueness-in-environment-art
- three.js environment maps for interiors: https://discourse.threejs.org/t/live-envmaps-and-getting-realistic-studio-lighting-almost-for-free/35627

## Palette and materials (www/js/library.js)

Every surface is one of 28 library materials: a tileable albedo + normal map from `tools/textures/gen.py`, a roughness, a
metalness, optional velvet sheen and a reflection strength. Room shells get world-metre UVs; Kiln props carry their own metre UVs
and name their materials (`velvet_teal`, `walnut`, `brass`, `marble_nero` ...), which the engine maps to the library.

| Zone | Floor | Walls | Accents |
|---|---|---|---|
| Lobby | chevron oak; geometric tile at bar and entrance; deco rug under the island | dark plum plaster over fluted walnut wainscot, brass cap and rail | brass, teal velvet, neon, dish pendants |
| Concourse | burgundy deco carpet | as lobby | brass poster cases with grazing light |
| Passages | dark carpet, red runner | warm fabric over walnut wainscot | LED floor lines, poster cases |
| Screen 1 | burgundy carpet | deep teal acoustic fabric | teal velvet seats, walnut shells, red curtain |
| Screen 2 | burgundy carpet | walnut slats, warm light slots | burgundy velvet recliners, star ceiling |
| Screen 3 | charcoal-blue carpet | black acoustic | blue light lines, navy seats |

## Interface: "Noir & Brass" (www/css/app.css)

The same materials drive the UI so it belongs to the building:
- Near-black glass panels, warm ivory text (#f5ede3), muted text (#b3a597, about 7:1 on the panels).
- One brass-gradient action per screen; cinema red only for live shows and errors.
- Cormorant Garamond for titles (cinema-poster feel), Inter for anything you read or tap. Both are SIL Open Font License,
  bundled in `www/fonts/`. Devanagari and Urdu fall back to Noto with no letter-spacing.
- Panels slide in from the right and stop short of the left edge so the world stays visible; one decision per screen
  (booking is three steps). Touch targets are 40 to 56 px.
- The tokens, type ramp and effect styles are in the Figma file "LUMIÈRE — Noir & Brass UI"
  (https://www.figma.com/design/3yx8BipYO0L2VteZJFCNby). The Starter plan's MCP call limit stopped the Figma work after the
  foundations, so the screens were designed and reviewed directly in the running app.
