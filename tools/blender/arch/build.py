"""LUMIERE v9 architecture builder: spec.json -> one room file per room for the light-map bake (tools/bake/.work/<key>.json, the format
tools/bake/bake_room.py reads) plus the engine's per-room extras (www/bake/<key>_x.json: glow strips and the runtime light list).
usage: python3 tools/blender/arch/build.py [room ...]      (rooms: hallMax hallCurve hallClassic hall270 lobby corridor spine wc street)
then:  sh tools/bake/bake-all.sh --no-export <room ...>   (Cycles; see tools/bake/README.md)"""
import sys, os, json, time
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.normpath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, HERE)
from geo import export_room
import halls, rooms

def main():
    S = json.load(open(os.path.join(HERE, 'spec.json')))
    want = sys.argv[1:] or ['hallMax', 'hallCurve', 'hallClassic', 'hall270', 'lobby', 'corridor', 'spine', 'wc', 'street']
    work = os.path.join(ROOT, 'tools', 'bake', '.work'); outx = os.path.join(ROOT, 'www', 'bake'); os.makedirs(work, exist_ok=True); os.makedirs(outx, exist_ok=True)
    for key in want:
        t0 = time.time(); hall = next((h for h in S['halls'] if h['key'] == key), None)
        if hall:
            acc, glow, lit, occ, scr, probes, panels = halls.build_hall(hall, S['L1'])
            D, X, n = export_room(key, acc, lit, os.path.join(work, key + '.json'), glow=glow, occ=occ, screen=scr, probes=probes, is_hall=True,
                                  extra={'hall': hall['id'], 'y0': hall['y0'], 'panels': panels})
        else:
            acc, glow, lit, extra = rooms.build(key, S)
            D, X, n = export_room(key, acc, lit, os.path.join(work, key + '.json'), glow=glow, extra=extra)
        json.dump(X, open(os.path.join(outx, key + '_x.json'), 'w'), separators=(',', ':'))
        print(f'{key}: {n // 3} triangles, {len(lit.L) // 14} lights, {len(glow.P) // 3} glow triangles ({time.time() - t0:.1f}s)', flush=True)

main()
