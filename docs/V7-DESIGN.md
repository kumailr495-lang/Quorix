# LUMIERE v7: rebuild plan (arrival, lobby, corridor, IMAX gateway, halls, shows)

Written 2026-10-30 after your 20 reference pictures and feedback. Research used: your pictures (Allu Cinemas Kokapet,
Dolby corridor, Dubai IMAX, VIP Premier hall, IMAX halls, seat map), Dolby Cinema's design brief (Eight Inc.: "a long, curved
hallway immersed in full-height projected imagery... a transition from the bright lobby into the auditorium"), the UNIC
auditorium handbook, and four environment-art skills installed for this (`environment-art`, `level-design`,
`lighting-design`, `3d-modeling`; see docs/SKILLS.md).

## 1. Your feedback and the answer to each point

| You said | What changes |
|---|---|
| Lobby literally the same, weird feeling, not a theatre lobby | Rebuilt from zero after Allu: black marble floor with flowing brass lines, oval coffer with a ribbon chandelier, red-marble columns with brass fins, marble feature wall with gold LUMIÈRE letters, red-carpet path with stanchions to a lit portal |
| Bar area covered, floor texture bad | Canopy removed (open to the 7.5 m ceiling), triangle tile removed (same black marble as the lobby), new back bar with backlit onyx, pendant rings, fluted counter |
| Corridors not Dolby | Rebuilt to your Dolby picture: light warm-grey stone panels with shadow gaps, vertical LED slots, backlit fluted-glass number totems, blue-grey patterned carpet, linear ceiling light |
| Outside area fake and cheap | Rebuilt after Allu's front: deep canopy on four giant bronze columns, gold letters on the fascia, wood-slat soffit with downlights, perforated metal facade lit from behind, red carpet with stanchions, poster lightboxes, planters, drop-off lane with taxis |
| Entrance feels like a direct spawn | You start outside at the kerb and walk in: red carpet, sliding glass doors, then the chandelier reveal |
| IMAX entrance cheap and fake | The blue tunnel and the trench are gone. New: a big IMAX portal at the corridor end, then a dark gateway hall with a giant curved panorama wall (like your curved-screen picture), then side entrances into the hall where the IMAX screen reveals itself as you walk down |
| NPCs sitting in theatres with no movie | Audiences exist only for your booked show. Empty halls stay empty |
| "Velvet" plays by itself, NPCs go there for no reason | No automatic shows any more. A film plays only when you book it |
| No middle seat | The IMAX trench that took the middle seats is removed: every row is complete again, and the IMAX gets two aisles splitting 6 + 20 + 6 seats, so the 20-seat centre block has true middle seats. Screen 1 becomes a VIP hall with lit centre stairs like your VIP picture |
| Restroom looks empty | Dressed: blade hand dryers, soap and towel dispensers, bins, backlit mirrors, stone vanity, framed art, plants, cubicle indicators, cove light |
| Use Kiln, crazy good models | Hero props modelled in Kiln with its curve tools (sweeps, lofts, lathes, CSG, subdivision) and level-of-detail tiers, reviewed from several angles before use |

## 2. Site plan (metres; +z = south, toward the street; screens to the north)

```
 z 48  +------------------- opposite buildings (shops, lit windows) -------------------+
 z 44  |  far pavement                                                               |
 z 41  |  road (2 lanes)                                                             |
 z 34  |  drop-off lane: taxis stop at x 0, z 33  (YOU START HERE, facing the cinema)  |
 z 31  |==kerb== lamps ========= planters ==|  red  |== planters ========= lamps ====|
       |  poster lightboxes   (O) column    | carpet|    column (O)  poster lightboxes|
 z 27  |..........canopy fascia: L U M I E R E  (gold, lit) x -16..16 .................|
 z 20  |  wing (perforated) | GLASS FRONT x -14..14, sliding doors x -1.6..1.6 | wing   |
       |                    |                                                |        |
 z 18  |   BOX OFFICE       |  * brass star inlay                  LOUNGE    |        |
       |   (marble feature  |                                     (sofa)     |        |
 z 15  |   wall, LUMIERE)  [C]          .-~~~~~~~~-.             [C]  CANDY  |        |
 z 10  |                    |        ( coffer + ribbon )               BAR   |        |
       |   BAR (open,       |         `- chandelier -'                (menu  |        |
 z 5   |   onyx back bar)  [C]   stanchions | red carpet |   [C]     screens)|        |
 z 0   +-------- marble ------[ PORTAL "SCREENS" + LED wall ]------ marble ---+--------+
 z 0..-32   DOLBY CORRIDOR (7 m wide): restrooms z -2.2 both sides; SCREEN 1 door west and
            SCREEN 3 door east at z -17 (number totems); exits at z -26/-27
 z -32      IMAX PORTAL (IMAX letters, blue light blades)
 z -32..-40 IMAX GATEWAY HALL 28 x 8.3 m: curved panorama wall on the south side, black
            glossy floor with blue guide lines to two side doors at x -12.8 and +12.8
 z -40..-72 SCREEN 2 IMAX: side voms (level walkways) along both walls down to the crossing
            aisle; seats 6 + 20 + 6 per row; balcony pods at the back
```
[C] = red-marble column with brass fins and a poster screen.

## 3. Colour script (3 to 4 hues per zone; each zone has its own mood)

| Zone | Base | Accent | Light | Mood |
|---|---|---|---|---|
| Plaza (night, light rain) | charcoal granite, perforated silver | gold letters, red carpet | warm canopy soffit against blue night | arrival, anticipation |
| Lobby | black marble | brass/gold, deep red (columns, carpet, coffer band) | warm 2700 K chandelier, amber cove | glamour, the show-off space |
| Corridor | warm light-grey stone, blue-grey carpet | black steel totems | neutral-warm vertical slots | calm transition (Dolby: "separation from the bright lobby") |
| IMAX gateway | black | IMAX blue, panorama imagery | the panorama is the light | immersion before the hall |
| Screen 1 VIP | charcoal grey leather, walnut | warm lamp glow | low warm wall-washers | private, intimate |
| Screen 2 IMAX | navy/black | blue seats, warm yellow light bars | cool | scale, spectacle |
| Screen 3 | dark acoustic panels | gold trim lines, red curtains | starfield ceiling | classic cinema |
| Restrooms | pale stone, porcelain | brass | soft cove + mirror backlight | clean, hotel-like |

## 4. Models (hero / unique / modular / dressing)

Kiln (curve tools, LOD tiers, multi-angle QA) unless noted. Blender only for 3D letters (it reads fonts) and the seat families.

- **Hero**: ribbon chandelier (flowing emissive ribbons swept along 3D curves, wave core); IMAX portal with 3D letters;
  canopy with LUMIÈRE letters; curved panorama wall.
- **Unique**: back bar with backlit onyx and bottle shelves; candy-bar counter; box-office counter; usher podium;
  number totems (fluted glass); VIP pod recliners with walnut lamp tables (Blender seats.py); IMAX balcony pod fronts.
- **Modular** (built in code, light-mapped): marble wall panels with brass strips; stone corridor panels with LED slots;
  red-marble column cladding; perforated facade panels; coffer; floor inlay lines.
- **Dressing**: stanchion post + velvet rope (lathe + catenary sweep); lounge sofa and armchairs; bar stools; pendant rings;
  poster lightbox totems; planters with clipped hedges; restroom fixtures (blade dryer, dispensers, bins, baby change).

## 5. Halls

- **Screen 1 → VIP**: grey leather recliners in pairs with walnut lamp tables between pairs, lit centre staircase,
  3D acoustic wall panels with wood strips and warm wall-washers. Curved 2.39 screen stays.
- **Screen 2 IMAX**: trench removed; side voms; 6 + 20 + 6 seats per row with two stepped aisles (lit nosings, X-pattern carpet);
  large IMAX letters on the side walls with staggered warm light bars (your IMAX pictures); balcony pods with curved wood
  fronts and LED lines (Dubai IMAX picture).
- **Screen 3 standard**: red curtains framing the screen, dark panels with gold trim lines, starfield ceiling.

## 6. Shows and people

- No automatic shows. A hall plays only the show you book (house film or your own video).
- Audiences: only for your show; they walk in from the lobby during the countdown, react, applaud, leave.
- Lobby life: people arrive from taxis and the pavement, queue at the box office, buy snacks, sit at the bar and lounge,
  look at posters, use the restrooms, then leave by the doors.

## 7. Performance (your list)

1. **LOD**: every new Kiln prop has LOD tiers; seats already have two; far audience is one instanced draw.
2. **Mipmapping**: all material textures are mipmapped with 4x anisotropic filtering on Medium/High (sharp floors at
   grazing angles); light maps are smooth so they skip mipmaps (less memory).
3. **Foveated rendering**: needs Vulkan/OpenXR variable-rate shading, which a WebView's WebGL cannot use. The equivalent
   here is the dynamic resolution governor (drops 3D resolution when the frame rate falls, UI stays sharp).
4. **Distance fog / depth of field**: a light height fog on the plaza (rain haze) and in the gateway hall, computed in the
   material shader (no extra pass). Full depth of field is a second full-screen pass: too slow for a Mali-G57, not used.

## 8. New ideas: need your approval (not built yet)

1. **Taxi arrival intro**: the first launch opens inside a taxi pulling up to the kerb; the door opens and you step out.
2. **Real films instead of the drawn house films**: open films by the Blender Foundation (Sintel, Spring, Tears of Steel,
   Big Buck Bunny, Cosmos Laundromat; free licence CC-BY, credited) streamed by link when online.
3. **IMAX countdown**: before an IMAX show the lights drop in steps with a deep sound sweep and a "3-2-1" on the screen.
4. **Real panorama in the IMAX gateway**: a night-city panorama photo (free CC0 from Poly Haven) drifting slowly across the wall.
5. **Greeter at the doors**: a staff member who welcomes you by time of day and points to the box office.

## 9. Build order, checks, rollback

Order: textures → Kiln models → plaza + entrance → lobby → corridor → IMAX gateway + IMAX layout → VIP + Screen 3 →
shows/NPC logic → restrooms → light-map re-bake of every room → renders → APK.
Checks per step: `tools/run-tests.sh`, `check-world.mjs` (z-fights, reachability), `shoot.mjs` renders (software GPU,
not the phone), comment lint. Rollback: every step is its own commit on `ccr-7bb5aa6a-upup1u`; `git revert <commit>`.
