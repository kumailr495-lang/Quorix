// Minimal GLB writer: meshes with POSITION, NORMAL, TEXCOORD_0, COLOR_0 (u8 normalized). Units: input cm -> output metres.
// Front of a model is +Z (glTF convention), floor at y=0.
export function writeGLB(items, extras = {}) {
  const chunks = []; const bv = [], acc = [], meshes = [], nodes = []; let len = 0;
  const add = (buf, target) => { const pad = (4 - len % 4) % 4; if (pad) { chunks.push(Buffer.alloc(pad)); len += pad; } bv.push({ buffer: 0, byteOffset: len, byteLength: buf.length, ...(target ? { target } : {}) }); chunks.push(buf); len += buf.length; return bv.length - 1; };
  for (const it of items) {
    const { pos, normals, colors, uvs, indices, name, matid, joints, weights } = it; const n = pos.length / 3; const sc = (it.scale || 1) * 0.01;
    const p = new Float32Array(pos.length); for (let i = 0; i < pos.length; i++) p[i] = pos[i] * sc;
    let mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9]; for (let v = 0; v < n; v++) for (let a = 0; a < 3; a++) { mn[a] = Math.min(mn[a], p[3*v+a]); mx[a] = Math.max(mx[a], p[3*v+a]); }
    const big = n > 65535; const idx = big ? Uint32Array.from(indices) : Uint16Array.from(indices);
    const A = {}; const mk = (arr, type, ct, norm, extra = {}) => { const b = add(Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength), 34962); acc.push({ bufferView: b, componentType: ct, count: n, type, ...(norm ? { normalized: true } : {}), ...extra }); return acc.length - 1; };
    A.POSITION = mk(p, 'VEC3', 5126, false, { min: mn, max: mx }); A.NORMAL = mk(normals, 'VEC3', 5126); A.TEXCOORD_0 = mk(uvs, 'VEC2', 5126); A.COLOR_0 = mk(colors, 'VEC4', 5126, false); if (matid) A._MATID = mk(matid, 'SCALAR', 5126, false); if (joints) { A.JOINTS_0 = mk(joints, 'VEC4', 5121, false); A.WEIGHTS_0 = mk(weights, 'VEC4', 5126, false); }
    const ib = add(Buffer.from(idx.buffer, idx.byteOffset, idx.byteLength), 34963); acc.push({ bufferView: ib, componentType: big ? 5125 : 5123, count: idx.length, type: 'SCALAR' });
    meshes.push({ name, primitives: [{ attributes: A, indices: acc.length - 1, material: 0, mode: 4 }], extras: it.extras || {} }); nodes.push({ name, mesh: meshes.length - 1 });
  }
  const root = { name: extras.name || 'model', children: nodes.map((_, i) => i) }; nodes.push(root);
  const json = { asset: { version: '2.0', generator: 'LUMIERE v3 model factory' }, scene: 0, scenes: [{ nodes: [nodes.length - 1] }], nodes, meshes,
    materials: [{ name: 'vertex-colour', pbrMetallicRoughness: { baseColorFactor: [1, 1, 1, 1], metallicFactor: 0, roughnessFactor: 0.9 }, doubleSided: false }],
    accessors: acc, bufferViews: bv, buffers: [{ byteLength: len }], extras: extras.meta || {} }; if (extras.skeleton) json.extras = { ...(json.extras || {}), skeleton: extras.skeleton };
  let js = Buffer.from(JSON.stringify(json)); js = Buffer.concat([js, Buffer.alloc((4 - js.length % 4) % 4, 0x20)]);
  const bin = Buffer.concat(chunks); const binPad = Buffer.concat([bin, Buffer.alloc((4 - bin.length % 4) % 4)]);
  const head = Buffer.alloc(12); head.write('glTF', 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(12 + 8 + js.length + 8 + binPad.length, 8);
  const jh = Buffer.alloc(8); jh.writeUInt32LE(js.length, 0); jh.write('JSON', 4); const bh = Buffer.alloc(8); bh.writeUInt32LE(binPad.length, 0); bh.write('BIN\0', 4);
  return Buffer.concat([head, jh, js, bh, binPad]);
}
