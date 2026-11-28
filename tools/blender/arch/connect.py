"""LUMIERE v11 - near misses between the builder's boxes (the user's photo, 2026-11-14: a marble pier, a rail that stopped beside it, two posts
side by side: "the model disconnected"). Two parts either overlap (one is set into the other) or stand clearly apart; a face held 1 to 30 mm
off a neighbour's face reads as a part that failed to reach it. geo.Acc.box records every axis-aligned box it builds (in world space);
near_misses() finds pairs of boxes that face each other across such a gap: apart along exactly one axis by lo..hi metres, overlapping by at
least min_overlap metres along both others.
usage: python3 tools/blender/arch/connect.py [room ...]   (prints the near misses per room; exit 1 when any are found)"""
import math

MIN_OVERLAP = 0.02


def near_misses(boxes, lo=0.001, hi=0.03, min_overlap=MIN_OVERLAP, region=None, skip_mats=(), fill=()):
    """boxes: [(x0, y0, z0, x1, y1, z1, mat)]; region: (x0, y0, z0, x1, y1, z1) to keep only pairs with a box inside it (centre); fill: the
    envelopes of other solids (prisms, cylinders). A gap another part fills is a joint, not a miss; two panels of one material with the same
    thickness on the same plane are a reveal (a designed shadow joint, backed by the wall behind them)."""
    solids = list(boxes) + list(fill)
    cell = 1.0; grid = {}
    def keep(b):
        if b[6] in skip_mats: return False
        if not region: return True
        cx, cy, cz = (b[0] + b[3]) / 2, (b[1] + b[4]) / 2, (b[2] + b[5]) / 2
        return region[0] <= cx <= region[3] and region[1] <= cy <= region[4] and region[2] <= cz <= region[5]
    for i, b in enumerate(boxes):
        if b[6] in skip_mats: continue
        for gx in range(math.floor((b[0] - hi) / cell), math.floor((b[3] + hi) / cell) + 1):
            for gz in range(math.floor((b[2] - hi) / cell), math.floor((b[5] + hi) / cell) + 1):
                grid.setdefault((gx, gz), []).append(i)
    seen, out = set(), []
    for lst in grid.values():
        for p in range(len(lst)):
            for q in range(p + 1, len(lst)):
                i, j = lst[p], lst[q]
                if (i, j) in seen: continue
                seen.add((i, j)); a, b = boxes[i], boxes[j]
                if not (keep(a) or keep(b)): continue
                gap, over = [], []
                for k in range(3):
                    g = max(a[k] - b[k + 3], b[k] - a[k + 3]); gap.append(g); over.append(min(a[k + 3], b[k + 3]) - max(a[k], b[k]))
                apart = [k for k in range(3) if gap[k] > 0]
                if len(apart) != 1: continue
                k = apart[0]
                if lo < gap[k] <= hi and all(over[m] >= min_overlap for m in range(3) if m != k):
                    th = min(range(3), key=lambda m: min(a[m + 3] - a[m], b[m + 3] - b[m]))   # the thin axis: a reveal between panels
                    if a[6] == b[6] and th != k and abs(a[th] - b[th]) < 0.001 and abs(a[th + 3] - b[th + 3]) < 0.001: continue
                    thin = lambda q: q[th + 3] - q[th] <= 0.08
                    if th != k and thin(a) and thin(b) and gap[k] <= 0.013 and (abs(a[th] - b[th]) < 0.011 or abs(a[th + 3] - b[th + 3]) < 0.011): continue   # a shadow reveal: thin claddings on one backing plane
                    c = [0.0] * 3   # the middle of the gap: filled by some other solid means a joint
                    for m in range(3): c[m] = (min(a[m + 3], b[m + 3]) + max(a[m], b[m])) / 2 if m != k else ((a[k + 3] + b[k]) / 2 if a[k + 3] <= b[k] else (b[k + 3] + a[k]) / 2)
                    if any(s_ is not a and s_ is not b and all(s_[m] - 1e-6 <= c[m] <= s_[m + 3] + 1e-6 for m in range(3)) for s_ in solids): continue
                    out.append((a, b, 'xyz'[k], gap[k]))
    return out


def report(key, boxes, **kw):
    hits = near_misses(boxes, **kw)
    for a, b, ax, g in hits[:40]:
        fa = ', '.join(f'{v:.3f}' for v in a[:6]); fb = ', '.join(f'{v:.3f}' for v in b[:6])
        print(f'  {key}: {g * 1000:.0f} mm along {ax} between box ({fa}) mat {a[6]} and box ({fb}) mat {b[6]}')
    return hits


if __name__ == '__main__':
    import sys, os, json
    HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
    import rooms, halls
    S = json.load(open(os.path.join(HERE, 'spec.json'))); want = sys.argv[1:] or ['hallMax', 'hallCurve', 'hallClassic', 'hall270', 'lobby', 'corridor', 'spine', 'wc', 'street', 'vip', 'pvHome', 'pvJungle', 'pvWinter', 'pvSpace', 'pvDrive']; total = 0
    for key in want:
        hall = next((h for h in S['halls'] if h['key'] == key), None)
        acc = halls.build_hall(hall, S['L1'])[0] if hall else rooms.build(key, S)[0]; hits = report(key, acc.boxes, skip_mats=(10,), fill=acc.fill); total += len(hits)
        print(f'{key}: {len(acc.boxes)} boxes, {len(hits)} near misses (1-30 mm, glass left out)')
    sys.exit(1 if total else 0)
