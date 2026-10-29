import fs from 'node:fs'; import path from 'node:path';
globalThis.window = globalThis; globalThis.document = { createElement: () => ({ style: {}, getContext: () => ({}) }) };
globalThis.Request = class { constructor(u) { this.url = u; } };
globalThis.fetch = async (req) => { const buf = fs.readFileSync(path.join(process.env.LUM_WWW, req.url || req)); return { status: 200, ok: true, headers: { get: () => null }, body: undefined, arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), clone() { return this; } }; };
const THREE = await import('three'); const { GLTFLoader } = await import('./www/vendor/GLTFLoader.js'); const { Character, parseNPC } = await import('./www/js/characters.js');
const loader = new GLTFLoader(); const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
const ids = ['usher', 'patron-f1', 'receptionist', 'patron-m2']; const defs = {}; for (const id of ids) defs[id] = parseNPC(await loader.loadAsync(`models/lumiere-npc-${id}.glb`), id);
const u = defs.usher; console.log('usher: bones', u.skeleton.bones.length, 'scale', u.skeleton.scale.toFixed(3), 'LOD tris', u.geoms.map((g) => g.index.count / 3).join('/'), 'attrs', Object.keys(u.geoms[0].attributes).join(','));
const poses = [['stand', 'none', 0], ['walk', 'none', 0.5], ['walk', 'none', 2.2], ['sit', 'none', 0], ['stand', 'clap', 0], ['stand', 'cheer', 0], ['sit', 'cheer', 0], ['stand', 'wave', 0], ['stand', 'talk', 0], ['stand', 'point', 0]];
const P = [], C = [], Gl = []; const v = new THREE.Vector3(); let x = 0, bad = 0, minY = 9, maxY = -9;
poses.forEach(([base, gesture, phase], pi) => { const id = ids[pi % ids.length]; const ch = new Character(defs[id], mat); ch.base = base; ch.gesture = gesture; ch.phase = phase; ch.speed = 1.3; ch.t = 1.3; ch.snap = true; ch.update(0.016);
  ch.group.position.set(x - 4.3, 0, 0); ch.group.updateMatrixWorld(true); ch.skeleton.update();
  const g = ch.mesh.geometry, pos = g.attributes.position, col = g.attributes.color, idx = g.index;
  for (let t = 0; t < idx.count / 3; t++) { let r = 0, gg = 0, b = 0; for (let k = 0; k < 3; k++) { const i = idx.getX(t * 3 + k); v.fromBufferAttribute(pos, i); ch.mesh.applyBoneTransform(i, v); v.applyMatrix4(ch.mesh.matrixWorld); if (!Number.isFinite(v.x + v.y + v.z)) bad++; minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y); P.push(v.x, v.y, v.z); r += col.getX(i); gg += col.getY(i); b += col.getZ(i); } C.push(r / 3, gg / 3, b / 3); Gl.push(0); }
  x += 0.95; });
console.log('skinned vertices NaN:', bad, ' y-range', minY.toFixed(2), 'to', maxY.toFixed(2));
const name = 'npcposes'; fs.writeFileSync(`${process.env.LUM_OUT}/dump_${name}.bin`, Buffer.concat([Buffer.from(new Float32Array(P).buffer), Buffer.from(new Float32Array(C).buffer), Buffer.from(new Uint8Array(Gl))]));
fs.writeFileSync(`${process.env.LUM_OUT}/dump_${name}.json`, JSON.stringify({ n: Gl.length, cam: { x: 0.0, y: 1.0, z: 8.6, yaw: 0, pitch: 0 }, lights: [{ t: 'h', sky: [0.9, 0.8, 0.7], ground: [0.25, 0.2, 0.18], i: 1.4 }, { t: 'p', x: -2, y: 3, z: 4, c: [1, 0.9, 0.78], i: 28, d: 0 }] }));
