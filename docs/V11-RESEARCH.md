# LUMIERE v11 research (2026-11-14)

The user asked (2026-11-14) for research before building: game-development craft (placement, models, glitches), cinemas, corridors,
lobbies, food, people, reviews, how escalator and lift areas work, licensed photos and models, the taxi at night and multiplayer that works on
any network. This file holds what was found, where it came from, and the decision each finding drives. The photos were downloaded for
reference only (they are not in the app or the APK).

## 1. The escalator and lift area: a hall of its own

What real cinemas do (photos below):
- The ticket check is the boundary between the public foyer (box office, food, lounge) and the screens. Behind it the vertical circulation is
  a space of its own: an escalator in a walled, lit shaft (Vue West End, London; Scotiabank Toronto), or escalators against a feature wall
  (Scotiabank Vancouver, Sundance Kabuki), never a pair of escalators floating in the middle of the foyer behind a low glass fence.
- Entry and exit flows are separated (people leave by another route than the one they came in by), and the box office and the food counter
  are apart, because those two queues are what jams a foyer ("From Chaos to Flow", IJEMT 11(8), 2025).
- A lift beside the escalators is normal (Premiere Cinemas, Orlando: a lift tower between two escalators).

Dimensions (standards):
- Escalators: 30 degree incline, 1000 mm step width, toughened or laminated glass balustrade 10-15 mm thick, handrail 70-100 mm wide (Otis
  public escalator brochure; Elevator World "Basic measurements"; EN 115-1 glossary, elevator.tr).
- Lift landing: hall call buttons centred about 1065 mm above the floor, at least 19 mm across, with a visible "call registered" light; up
  above down; hall lanterns at least 1830 mm high, one chime for up and two for down; car at least 1370 mm deep (ADA Standards 4.10 and
  407; US Access Board guide, chapter 4).

Decisions (v11, the "separate hall"):
- The escalators and the lift stand in one walled hall from the gate line back to the mezzanine edge, floor to ceiling. The lobby sees
  its walls (posters, signs), not the machinery.
- One portal in the hall's front wall frames the gates exactly: jambs at the leaves' hinges, a waist-high gate cabinet between the
  ticket leaf and the exit leaves (no pole in the opening). Every leaf has a hinge stile and pivots on its jamb or cabinet.
- No part stops a few centimetres short of another: the walls sit flush with the escalator side and embed the lift tower's posts; the
  former glass screens, the piers in the gate line and the court column in the hall's corner are replaced by the walls and one corner
  pier. A builder check refuses near misses (parts 1 mm to 30 mm apart) and parts that touch nothing.
- Inside, darker than the foyer, with light lines leading up and posters stepping up beside the escalator (a classic escalator run).
- The lift is operated with real buttons in the world (call station by each landing door, a car panel by each car door, a display in
  each landing header) at the heights above.

## 2. Game-development craft: placement, navigation, glitches

- Crowds: engines pair a path (nav graph or navmesh) with local avoidance (Unreal: RVO or the Detour crowd manager; Unity NavMeshAgent
  avoidance; A* Pathfinding Project local avoidance). Agents that only follow paths walk through each other and through anything the graph
  did not know about.
  - LUMIERE v11 does the same at small scale: lobby guests walk checked legs between checked spots, wait for anyone inside their corridor,
    and step back rather than push through.
  - tools/dev/npc-clear.mjs measures it: nobody inside a wall, a prop or anyone else, nobody stuck.
- Z-fighting: never put two faces in one plane. Give layered parts their own offset (at least a few millimetres at room scale, more at
  distance); embed a part into another instead of setting it flush. This is the project's rule already: seethru.mjs --zfight and the
  builder checks.
- Disconnection (the user's photo, 2026-11-14): a rail that stops short of a post, a post that stands beside another, a leaf frame with
  nothing to hang from. Rule: parts either overlap (one embeds into the other) or are clearly apart (more than 30 mm); joints get a
  real connector (a hinge stile, a shoe, a cap).

## 3. People, food and reviews (what makes a cinema feel real)

- Complaints people actually make: sound or picture problems, broken or uncomfortable seats, temperature, dirty auditoriums, phones and
  talking during the film, queues, food prices (tapsy.ai cinema complaints; a 2025 moviegoer poll: 41 % have told someone off during a film,
  81 % sneak food in, Roger's Movie Nation).
- Staff gripes: cleaning up after people, taking the blame for prices (Den of Geek).
- India: food often costs more than the ticket. A regular popcorn was ₹430 against a ₹340 ticket at PVR (r/IndianCinema, 2024). Chains
  answer with weekday combos from ₹99 (PVR INOX, Monday to Thursday, 9 am to 6 pm) and add-ons such as a Coke for ₹100 with any combo
  (Cinépolis).
- Used for: NPC lines (guests grumbling about prices, shushing phones, asking about the queue), menu boards with combos, a weekday deal.

## 4. The taxi at night

- From inside a car at night the light moves: streetlights pass overhead and sweep through the cabin in a steady rhythm (lamps every 30-40 m
  at 40 km/h is one sweep every 3 s), shop signs and neon throw coloured reflections that slide along the glass, wet roads mirror them,
  and the dashboard and meter glow (lighting tutorials for night car scenes: Litepanels, Aputure; POV references).
- Used for: the taxi intro (moving light sweeps, coloured reflections, rain on the windows, a lit meter and dash).

## 5. Multiplayer that works on any network

- Peer-to-peer (WebRTC) needs a relay (TURN) for roughly 15-25 % of consumer connections. Mobile carriers run symmetric carrier-grade
  NAT, so phones on mobile data often cannot connect directly at all (BlogGeek.me, Fora Soft 2026, ExpressTURN). That is why playing
  together only worked on one Wi-Fi.
- Relays cost money per gigabyte when hosted (Cloudflare Realtime TURN $0.05/GB, Twilio from $0.40/GB).
- A small game server can run on a free account: Cloudflare Workers with Durable Objects, free plan 100,000 requests a day, WebSocket
  messages counted 20:1 (Cloudflare docs, pricing). A room relayed by a server means no phone carries the room for the others.
- Options for the user's approval (free, no payment): see the reply in chat and docs/V11-SECURITY.md when that item is reached.

## Reference photos (Wikimedia Commons, reference only, not shipped)

| Photo | Licence | Author |
|---|---|---|
| Second floor of the Bow Tie Cinemas, Reston (2022) | CC BY-SA 4.0 | Famartin |
| Cinestar Jihlava | CC BY-SA 3.0 | Havel1997 |
| Escalator, Scotiabank Cinema, Toronto | CC0 | Geo Swan |
| Escalator in Vue West End cinema (2008) | CC BY 2.0 | Mark Hillary |
| Leeds Light VUE | CC BY-SA 3.0 | Mtaylor848 |
| Picturehouse Central, Piccadilly Circus | CC BY-SA 2.0 | Ewan Munro |
| Premiere Cinemas elevator, escalators and fountain, Orlando | CC BY 4.0 | Pokemonprime |
| 109 Cinemas Nagoya lobby (2019) | CC BY-SA 4.0 | Razgrad |
| Scotiabank Theatre Vancouver (2018) | CC BY-SA 4.0 | Wpcpey |
| Sundance Kabuki, interior, escalators and reception (2010) | CC BY 2.0 | kennejima |
| UA Galaxy Macao Cinema | CC BY 3.0 | Wing1990hk |

## Sources

- ADA Standards for Accessible Design (1991) 4.10, ada.gov; US Access Board, Guide to the ADA Standards, chapter 4 (elevators); UpCodes 407.2.1.
- Otis Public Escalator brochure (otis.com); Elevator World, "Basic measurements for escalators and moving walkways"; elevator.tr, "Escalator balustrade (EN 115-1)".
- "From Chaos to Flow: Architectural Design Strategies for Crowd Control in Multiplexes", IJEMT 11(8), 2025 (iiardjournals.org).
- Epic Games, "Using avoidance with the navigation system" (Unreal Engine docs); Aron Granberg, A* Pathfinding Project, local avoidance.
- BlogGeek.me, "TURN server"; Fora Soft, "WebRTC ICE, STUN and TURN explained" (2026); ExpressTURN blog; Cloudflare Workers and Durable Objects pricing.
- tapsy.ai, cinema customer complaints; Roger's Movie Nation poll (2025-09-11); Den of Geek, cinema staff; r/IndianCinema (PVR prices); PVR INOX and Cinépolis India posts on combos.
- Litepanels, "How to light a car scene at night"; Aputure rainy car scene tutorial.
