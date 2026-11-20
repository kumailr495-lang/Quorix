"""LUMIERE v14 - CC0 photoscanned models from Poly Haven (polyhaven.com, every asset CC0 1.0: no attribution needed, commercial use allowed;
the authors are credited in tools/polyhaven/SOURCES.md all the same). Downloads one glTF package per model (1k textures) into OUT/<id>/,
checking every file's md5 against the API's list. Nothing here runs the downloaded files: tools/blender/scans14.py reads them as data.

    python3 -I tools/polyhaven/fetch.py OUT id [id ...]
"""
import hashlib, json, os, sys, urllib.request

API = 'https://api.polyhaven.com'


def get(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'lumiere-asset-fetch/1.0'})
    with urllib.request.urlopen(req, timeout=60) as r: return r.read()


def fetch(out, aid, res='1k'):
    files = json.loads(get(f'{API}/files/{aid}')); info = json.loads(get(f'{API}/info/{aid}'))
    pkg = files['gltf'][res]['gltf']; d = os.path.join(out, aid); os.makedirs(d, exist_ok=True)
    todo = [(os.path.basename(pkg['url']), pkg)] + list(pkg.get('include', {}).items())
    for rel, f in todo:
        rel = os.path.normpath(rel)
        if rel.startswith('..') or os.path.isabs(rel): raise ValueError('bad path ' + rel)
        p = os.path.join(d, rel); os.makedirs(os.path.dirname(p), exist_ok=True)
        if os.path.exists(p) and hashlib.md5(open(p, 'rb').read()).hexdigest() == f.get('md5'): continue
        b = get(f['url'])
        if f.get('md5') and hashlib.md5(b).hexdigest() != f['md5']: raise ValueError('md5 mismatch ' + rel)
        open(p, 'wb').write(b)
    meta = {'id': aid, 'name': info.get('name'), 'authors': list((info.get('authors') or {}).keys()), 'licence': 'CC0 1.0 (polyhaven.com/license)',
            'url': f'https://polyhaven.com/a/{aid}', 'gltf': os.path.basename(pkg['url']), 'dimensions_mm': info.get('dimensions'), 'polycount': info.get('polycount')}
    json.dump(meta, open(os.path.join(d, 'meta.json'), 'w'), indent=1)
    return meta


if __name__ == '__main__':
    out = sys.argv[1]
    for aid in sys.argv[2:]:
        m = fetch(out, aid); print('FETCH', aid, m['name'], m['authors'], m['polycount'])
