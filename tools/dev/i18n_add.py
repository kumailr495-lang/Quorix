#!/usr/bin/env python3
"""Add (or replace) i18n keys in all four language files at once.
usage: i18n_add.py KEYS.json [--remove key1,key2]   with {"key": {"en": "...", "es": "...", "hi": "...", "ur": "..."}, ...}; a value may be
a list (barks) or a list of lists (chats). Keys are inserted before the closing `};` of each www/js/lang/<code>.js; an existing key is
replaced in place; --remove deletes keys."""
import json, sys, os
ROOT = os.path.join(os.path.dirname(__file__), '..', '..', 'www', 'js', 'lang')
args = sys.argv[1:]; remove = []
if '--remove' in args: i = args.index('--remove'); remove = args[i + 1].split(','); del args[i:i + 2]
data = json.load(open(args[0], encoding='utf8')) if args else {}

def value_end(s, i):
    """index just past the JS literal starting at s[i]: a quoted string or a (nested) list of them"""
    depth, q = 0, None
    while i < len(s):
        c = s[i]
        if q:
            if c == '\\': i += 2; continue
            if c == q: q = None
            if q is None and depth == 0: return i + 1
        elif c in '\'"': q = c
        elif c == '[': depth += 1
        elif c == ']':
            depth -= 1
            if depth == 0: return i + 1
        i += 1
    raise ValueError('unterminated value')

def find(s, key):
    """(start of the key, start of its value) or None"""
    k = s.find("'" + key + "':")
    if k < 0: return None
    v = k + len(key) + 3
    while s[v] in ' \t': v += 1
    return k, v

for code in ('en', 'es', 'hi', 'ur'):
    p = os.path.join(ROOT, code + '.js'); s = open(p, encoding='utf8').read(); add = []
    for key, vals in data.items():
        lit = json.dumps(vals.get(code, vals['en']), ensure_ascii=False); f = find(s, key)
        if f: e = value_end(s, f[1]); s = s[:f[1]] + lit + s[e:]
        else: add.append(f"'{key}': {lit}")
    for key in remove:
        f = find(s, key)
        if not f: continue
        e = value_end(s, f[1])
        while e < len(s) and s[e] in ' ,': e += 1
        s = s[:f[0]] + s[e:]
    if add:
        i = s.rstrip().rfind('};'); s = s[:i].rstrip() + '\n  ' + ', '.join(add) + ',\n' + s[i:]
    open(p, 'w', encoding='utf8').write(s)
    print(code, 'added', len(add), 'removed', len(remove))
