"""LUMIERE v9 - the non-hall rooms (lobby, corridor, spine, restrooms, street): filled in by build_<room> functions."""
from geo import Acc, Glow, Lights

def build(key, S):
    fn = globals().get('build_' + key)
    if not fn: raise SystemExit(f'no builder for room {key}')
    return fn(S)
