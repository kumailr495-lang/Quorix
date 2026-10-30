#!/usr/bin/env python3
"""Add (or replace) i18n keys in all four language files at once.
usage: i18n_add.py KEYS.json   with {"key": {"en": "...", "es": "...", "hi": "...", "ur": "..."}, ...}; a value may be a list (barks).
Keys are inserted before the closing `};` of each www/js/lang/<code>.js; an existing key is replaced in place."""
import json, re, sys, os
ROOT = os.path.join(os.path.dirname(__file__), '..', '..', 'www', 'js', 'lang')
data = json.load(open(sys.argv[1], encoding='utf8'))
for code in ('en', 'es', 'hi', 'ur'):
    p = os.path.join(ROOT, code + '.js'); s = open(p, encoding='utf8').read(); add = []
    for key, vals in data.items():
        v = vals.get(code, vals['en']); lit = json.dumps(v, ensure_ascii=False)
        pat = re.compile(r"'" + re.escape(key) + r"':\s*(\[[^\]]*\]|'(?:[^'\\]|\\.)*'|\"(?:[^\"\\]|\\.)*\")")
        if pat.search(s): s = pat.sub(lambda m: f"'{key}': {lit}", s, count=1)
        else: add.append(f"'{key}': {lit}")
    if add:
        i = s.rstrip().rfind('};'); s = s[:i].rstrip() + '\n  ' + ', '.join(add) + ',\n' + s[i:]
    open(p, 'w', encoding='utf8').write(s)
    print(code, 'added', len(add))
