globalThis.document = { createElement: () => ({ width: 0, height: 0, style: {}, getContext: () => new Proxy({}, { get: (t, p) => p === 'createImageData' ? (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }) : () => ({}) }) }) };
const T = await import('three');
const { patchShader } = await import('./www/js/materials.js');
const sh = { uniforms: {}, vertexShader: T.ShaderLib.lambert.vertexShader, fragmentShader: T.ShaderLib.lambert.fragmentShader };
patchShader(sh, { uNoise: { value: null }, uK: { value: 1 } });
const expand = (s) => s.replace(/#include <(\w+)>/g, (m, n) => T.ShaderChunk[n] ?? m);
const strip = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');   // comments must not count: a '//' that swallows real code once hid a broken people shader
const F = strip(expand(sh.fragmentShader)), V = strip(expand(sh.vertexShader));
const bal = (s) => { let d = 0; for (const ch of s) { if (ch === '{') d++; if (ch === '}') d--; if (d < 0) return false; } return d === 0; };
const prag = (s) => (s.match(/\(/g) || []).length === (s.match(/\)/g) || []).length;
console.log('patched ok | braces balanced F/V:', bal(F), bal(V), '| parens balanced F/V:', prag(F), prag(V));
console.log('vViewPosition declared before use:', F.indexOf('varying vec3 vViewPosition') < F.indexOf('normalize(vViewPosition)'), '| totalEmissiveRadiance declared before our use:', F.indexOf('vec3 totalEmissiveRadiance') < F.indexOf('totalEmissiveRadiance += extra'), '| normal declared before our use:', F.indexOf('vec3 normal = ') < F.indexOf('dot(normal, Vv)'));
console.log('vertex: matid attr + varyings present:', /attribute float matid/.test(V) && /varying float vMatId/.test(V) && /vWP = \(modelMatrix \* wp_\)\.xyz/.test(V), '| frag lines', F.split('\n').length);
// every identifier used in our block must be a GLSL builtin or a declared local
const block = sh.fragmentShader.slice(sh.fragmentShader.indexOf('float id = vMatId'), sh.fragmentShader.indexOf('totalEmissiveRadiance += extra * uK;') + 40);
const ids = new Set(block.match(/\b[a-zA-Z_]\w*\b/g)); const known = new Set('float vec2 vec3 vec4 if else id vMatId wp vWP nA nB texture2D uNoise xz y zy x z Vv normalize vViewPosition ndv clamp dot normal rim pow base extra diffuseColor rgb r g b a s t p q u v fr fract abs ln dt smoothstep length max min mix vv sin floor mod step cell chk fq grout col gr key totalEmissiveRadiance uK distance'.split(' '));
for (const m of block.matchAll(/\b(?:float|int|bool|vec[234])\s+([a-zA-Z_]\w*)/g)) known.add(m[1]);   // locals declared anywhere in the block
const unknown = [...ids].filter((i) => !known.has(i) && !/^[0-9]/.test(i));
console.log('unknown identifiers in material block:', unknown.length ? unknown : 'none');
const people = F.slice(F.indexOf('#ifdef LUM_PEOPLE\nif'), F.indexOf('#endif', F.indexOf('#ifdef LUM_PEOPLE\nif')));
console.log('people (face paint) block present:', people.length > 100, '| braces balanced:', bal(people), '| parens balanced:', prag(people), '| writes diffuseColor:', /diffuseColor\.rgb = mix\(diffuseColor\.rgb, fc\.rgb, fc\.a\)/.test(people));
