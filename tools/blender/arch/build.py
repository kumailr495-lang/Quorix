"""LUMIERE v9 architecture builder: spec.json -> one room file per room for the light-map bake (tools/bake/.work/<key>.json, the format
tools/bake/bake_room.py reads) plus the engine's per-room extras (www/bake/<key>_x.json: glow strips and the runtime light list).
usage: python3 tools/blender/arch/build.py [room ...]      (rooms: hallMax hallCurve hallClassic hall270 lobby corridor spine wc street)
then:  sh tools/bake/bake9.sh <room ...>   (Cycles; see tools/bake/README.md)
check: python3 tools/blender/arch/build.py --check [--spec FILE]   builds every room in memory, writes nothing, and fails when a room's
       geometry differs from its bake (www/bake/index.json): a room whose spec changed (a hall grew, a door moved) but was not rebuilt and
       re-baked (v9.2: the corridor kept the X-270 hall's old door jambs inside the hall after the hall grew 0.9 m), or when two of a
       room's parts are held 1-30 mm off each other (v11, connect.py)"""
import sys, os, json, time
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.normpath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, HERE)
from geo import export_room
import halls, rooms
from connect import near_misses

def main():
    args = sys.argv[1:]; check = '--check' in args; spec = os.path.join(HERE, 'spec.json')
    if '--spec' in args: spec = args[args.index('--spec') + 1]; args = [a for a in args if a != spec]
    args = [a for a in args if not a.startswith('--')]
    S = json.load(open(spec))
    want = args or ['hallMax', 'hallCurve', 'hallClassic', 'hall270', 'lobby', 'corridor', 'spine', 'wc', 'street', 'vip', 'pvHome', 'pvJungle', 'pvWinter', 'pvSpace', 'pvDrive']
    work = os.path.join(ROOT, 'tools', 'bake', '.work'); outx = os.path.join(ROOT, 'www', 'bake')
    if check:
        idx = json.load(open(os.path.join(outx, 'index.json')))['rooms']; bad = []; miss = []
        for key in want:
            hall = next((h for h in S['halls'] if h['key'] == key), None)
            if hall: acc, glow, lit, occ, scr, probes, panels = halls.build_hall(hall, S['L1']); _, X, _ = export_room(key, acc, lit, None, is_hall=True)
            else: acc, glow, lit, extra = rooms.build(key, S); _, X, _ = export_room(key, acc, lit, None, is_hall='screen' in (extra or {}))
            if X['hash'] != (idx.get(key) or {}).get('hash'): bad.append(f"{key} (spec builds {X['hash']}, baked {(idx.get(key) or {}).get('hash')})")
            nm = near_misses(acc.boxes, skip_mats=(10,), fill=acc.fill)   # v11 (the user's photo: parts that nearly met): tools/blender/arch/connect.py
            if nm: miss.append(f'{key}: {len(nm)} (python3 tools/blender/arch/connect.py {key})')
        if miss: print('parts held 1-30 mm off each other (set one into the other, or apart by more):\n  ' + '\n  '.join(miss)); sys.exit(1)
        if bad: print('rooms out of date with the spec, rebuild and re-bake them (sh tools/bake/bake9.sh <room>):\n  ' + '\n  '.join(bad)); sys.exit(1)
        print(f'spec: {len(want)} rooms built from the current spec match their bakes'); return
    os.makedirs(work, exist_ok=True); os.makedirs(outx, exist_ok=True)
    for key in want:
        t0 = time.time(); hall = next((h for h in S['halls'] if h['key'] == key), None)
        if hall:
            acc, glow, lit, occ, scr, probes, panels = halls.build_hall(hall, S['L1'])
            D, X, n = export_room(key, acc, lit, os.path.join(work, key + '.json'), glow=glow, occ=occ, screen=scr, probes=probes, is_hall=True,
                                  extra={'hall': hall['id'], 'y0': hall['y0'], 'panels': panels})
        else:
            acc, glow, lit, extra = rooms.build(key, S); extra = dict(extra or {}); scr = extra.pop('screen', None)   # v14e a private screen's picture bakes as a light layer, as a hall's
            D, X, n = export_room(key, acc, lit, os.path.join(work, key + '.json'), glow=glow, extra=extra, screen=scr, is_hall=scr is not None)
        json.dump(X, open(os.path.join(outx, key + '_x.json'), 'w'), separators=(',', ':'))
        print(f'{key}: {n // 3} triangles, {len(lit.L) // 14} lights, {len(glow.P) // 3} glow triangles ({time.time() - t0:.1f}s)', flush=True)

main()
