# LUMIERE people (v8)

Sources (all CC0 1.0, public domain, by Quaternius, https://quaternius.com), downloaded from the author's itch.io pages
("Download Now", no payment):
- Universal Base Characters [Standard]: 2 base bodies (superhero proportions), 5 hairstyles + beard, eyebrows, eyes, textures.
- Universal Animation Library [Standard] and Universal Animation Library 2 [Standard]: 85 animations on the same 65-bone rig.

What `people.py` adds: modern clothes generated from the body surface (tee, shirt, sweatshirt, zip jacket, capri trousers,
staff shirt + waistcoat, jeans, trousers, shoes, belt), part ids per vertex, jaw and eye bones, a mouth interior, hair fitted
to each head, three detail levels. `people_tex.py` downsizes the skin/hair/eye textures. The engine (`www/js/people.js`) colours
each person, plays the clips by bone name, adds IK gestures (clap, cheer, scream, gasp, laugh, aww, lean, eat, drink, shush,
wave, point, read, hold, type, give, pour, scoop) and bakes the seated clips into a bone texture for the GPU crowd.

Rebuild (cloud machine with Blender 5.2):
```sh
blender --background --factory-startup --python tools/blender/people.py -- --ubc "<UBC dir>" \
  --ual1 "<UAL1>/Unreal-Godot/UAL1_Standard.glb" --ual2 "<UAL2>/Unreal-Godot/UAL2_Standard.glb" --out /tmp/ppl
python3 tools/blender/people_tex.py "<UBC dir>" www/models/people
for f in people_male people_female anims; do gltf-transform meshopt /tmp/ppl/$f.glb www/models/$f.glb --level medium; done
```
