// Finds `//` comments that swallowed real code: a comment appended mid-line in the dense one-line style of this codebase silently disables
// everything after it (this bit three times in v4: a broken people shader, an undefined screen-spill that froze the picture during your own
// film, and missing cap/hat colours). Checks JS comments and GLSL comments inside template strings.
// usage: node tools/dev/lint-comments.mjs www/js/*.js tools/*.js tools/lib/*.js tools/models/*.js tools/dev/*.mjs
// needs acorn once: npm i --no-save acorn   (or set ACORN=/path/to/acorn/dist/acorn.mjs)
import fs from 'node:fs';
let acorn; try { acorn = await import(process.env.ACORN || 'acorn'); } catch (e) { console.log('lint-comments: acorn not installed (npm i --no-save acorn) - skipped'); process.exit(0); }
const CODE = /(\bthis\.\w+\s*=[^=]|\b(const|let|var)\s+\w+\s*=|\b(if|for|while)\s*\(.*\)\s*[\w{]|[\w\]]\([^)]*\)\s*;|\}\s*\}|diffuseColor\.\w+\s*=|gl_\w+\s*=)/;
let hits = 0;
for (const f of process.argv.slice(2)) {
  const src = fs.readFileSync(f, 'utf8'), comments = []; let ast;
  try { ast = acorn.parse(src, { ecmaVersion: 2023, sourceType: 'module', onComment: comments, locations: true }); } catch (e) { console.log(`${f}: PARSE ERROR ${e.message}`); hits++; continue; }
  for (const c of comments) if (c.type === 'Line' && CODE.test(c.value)) { console.log(`${f}:${c.loc.start.line}: //${c.value.slice(0, 150)}`); hits++; }
  const walk = (n) => { if (!n || typeof n !== 'object') return;
    if (n.type === 'TemplateLiteral') for (const q of n.quasis) q.value.raw.split('\n').forEach((l, k) => { const i = l.indexOf('//'); if (i >= 0 && CODE.test(l.slice(i + 2))) { console.log(`${f}:${q.loc.start.line + k}: GLSL //${l.slice(i + 2, i + 150)}`); hits++; } });
    for (const k in n) { const v = n[k]; if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v.type === 'string') walk(v); } };
  walk(ast);
}
console.log(`lint-comments: ${process.argv.length - 2} files, comments that look like swallowed code: ${hits}`); process.exit(hits ? 1 : 0);
