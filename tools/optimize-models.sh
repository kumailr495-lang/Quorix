#!/bin/sh
# LUMIERE v11 - lighter props for phones. The lobby drew 240,000 triangles of furniture (one chandelier: 60,000); a Mali-G57 wants the
# whole view under about 200,000. Each prop listed here is welded and simplified with meshoptimizer (gltf-transform simplify) to a share of
# its triangles within an error bound (a fraction of the prop's size): silhouettes, materials, part order and names stay as they are.
# A prop already done is skipped (tools/optimize-models.json keeps each result's checksum), so run it again after rebuilding any model:
#   sh tools/optimize-models.sh            needs tools/kiln/.kiln-install (the session hook installs it)
# Props made of many small hard-edged parts (cake case, candy wall, pendant cloud, planters, stools) gain nothing from this and are left alone.
# After it: node tools/dev/seethru.mjs OUT --assets (mesh check), and look at the props (tools/dev/view-glb.mjs).
cd "$(dirname "$0")/.." || exit 1
GT=tools/kiln/.kiln-install/node_modules/.bin/gltf-transform; DB=tools/optimize-models.json; [ -f "$DB" ] || echo '{}' > "$DB"; TMP=$(mktemp -d)
while read -r n r e; do
  [ -z "$n" ] && continue; f=www/models/$n.glb; [ -f "$f" ] || { echo "missing $f"; continue; }
  sum=$(sha1sum "$f" | cut -c1-16); if grep -q "\"$n\": \"$sum\"" "$DB"; then continue; fi
  "$GT" weld "$f" "$TMP/w.glb" > /dev/null 2>&1 && "$GT" simplify "$TMP/w.glb" "$TMP/s.glb" --ratio "$r" --error "$e" > /dev/null 2>&1 || { echo "FAILED $n"; continue; }
  b=$(stat -c %s "$f"); a=$(stat -c %s "$TMP/s.glb"); cp "$TMP/s.glb" "$f"; sum=$(sha1sum "$f" | cut -c1-16)
  python3 - "$DB" "$n" "$sum" <<'PY'
import json, sys
p, n, s = sys.argv[1:4]; d = json.load(open(p)); d[n] = s; json.dump(d, open(p, 'w'), indent=1, sort_keys=True)
PY
  echo "$n: $((b / 1024)) KB -> $((a / 1024)) KB"
done <<'LIST'
chandelier_cascade 0.25 0.004
sofa_curve 0.35 0.004
letters_lumiere_lit 0.25 0.002
letters_classic 0.3 0.002
letters_x270 0.3 0.002
letters_curve 0.3 0.002
letters_max 0.3 0.002
num_3 0.3 0.002
num_2 0.35 0.002
torchere_deco 0.4 0.004
fountain_tier 0.6 0.004
bistro_chair 0.55 0.004
bistro_table 0.5 0.004
rope_velvet 0.4 0.004
basin_vessel 0.5 0.004
urinal 0.5 0.004
tap_brass 0.55 0.004
bollard_light 0.5 0.004
lamp_post 0.55 0.004
table_lounge 0.5 0.004
taxi_cabin 0.6 0.0015
planter_hedge 0.3 0.004
hedge_block 0.5 0.004
bench_velvet 0.5 0.002
bin_brass 0.3 0.006
fountain_muse 0.35 0.003
popcorn_kettle 0.5 0.006
popcorn_cart 0.5 0.005
reel_wall 0.35 0.003
scan_armchair 0.4 0.003
scan_chesterfield 0.45 0.003
scan_cine_camera 0.4 0.003
scan_bust 0.45 0.003
pendant_cloud 0.5 0.006
planter_tall 0.5 0.006
LIST
rm -rf "$TMP"
