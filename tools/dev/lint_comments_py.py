"""Python twin of lint-comments.mjs: a '#' comment that holds code (";" then a call) means a comment was put in front of a statement on
the same line and swallowed it (v9.1: it hid the restrooms' ceiling). usage: python3 tools/dev/lint_comments_py.py [files...]"""
import tokenize, glob, re, io, sys
files = sys.argv[1:] or glob.glob('tools/**/*.py', recursive=True)
bad = 0
for f in files:
    try: toks = list(tokenize.generate_tokens(io.StringIO(open(f).read()).readline))
    except (SyntaxError, tokenize.TokenError, UnicodeDecodeError) as e: print(f'{f}: cannot tokenize ({e})'); bad += 1; continue
    for t in toks:
        if t.type == tokenize.COMMENT and re.search(r';\s*[A-Za-z_][\w.]*\s*\(', t.string): bad += 1; print(f'{f}:{t.start[0]}: {t.string[:140]}')
print(f'lint-comments-py: {len(files)} files, comments that look like swallowed code: {bad}')
sys.exit(1 if bad else 0)
