// LUMIERE v14 - your flat in the Astor, across the road from the cinema (the user, 11-20: "you should spawn in the house na, like you have a
// house where you can expand, buy plot, buy houses ... dresses ... buy furniture, colors"). The shell is a baked room (building.js HOME,
// tools/blender/arch/home14.py); everything standing in it is placed here from what you own, so changing a sofa rebuilds one mesh and
// never needs a re-bake. Kept on this device (localStorage lumiere.home.v1); prices are Lumiere Credits (credits.js).
//   furniture  slots (sofa, armchair, coffee table, rug, lamp, dining, stools, pendants, sideboard, shelves, bed, plants), each with options:
//              the first is yours from the start, the others are bought once and can be swapped back and forth for free
//   colours    the walls, the kitchen's fronts, the floor (vertex tints on the baked shell by material id: world9.js tintShell)
//   rooms      the home cinema behind the hallway door: 6,000 LC opens it (two rows of club recliners, tower speakers, a popcorn cart; films
//              from the house catalogue play on its screen, your own and streamed ones too)
//   life       the front door (out to the Astor's entrance on the far pavement), the light switch by it (evening light), the TV (the LUMIERE
//              channel: tonight's shows, your ticket, the time), the wardrobe (your outfit), the espresso machine, the bed and sofas to sit on
// Models: tools/blender/home14.py (original) and Poly Haven CC0 scans (tools/polyhaven/SOURCES.md).
import * as THREE from 'three';
import { HOME } from './building.js';
import { ASSETS, placeAsset } from './assets.js';
import { Acc, toGeometry } from './geom.js';
import { LEAF_IDS, named } from './library.js';
import { splitIds, splitGlass, tintShell, framePanel, addPanel, fitArt, SIT_ON } from './world9.js';
import { CATALOG as FILMS } from './films.js';
import { filmURL } from './film9.js';
import { t } from './i18n.js';

const KEY = 'lumiere.home.v1', H2 = Math.PI / 2, HEX = /^#[0-9a-f]{6}$/i;
const P = (name, x, z, yaw = 0, o = {}) => ({ name, x, y: o.y ?? 0, z, yaw, o });
const lin = (hex) => new THREE.Color(hex).toArray();   // THREE.Color takes sRGB hex to linear (ColorManagement)
const sw = (mat, hex, id) => ({ [mat]: [id ?? (named(mat) || { id: 0 }).id, lin(hex)] });
const RUG = { sand: { ...sw('rug_field', '#b8a88f', 5), ...sw('rug_border', '#3a2e26', 5) }, charcoal: { ...sw('rug_field', '#4a4a4e', 5), ...sw('rug_border', '#1c1c1e', 5) },
  crimson: { ...sw('rug_field', '#6e1a22', 5), ...sw('rug_border', '#c9a35e', 5) }, teal: { ...sw('rug_field', '#1d4a48', 5), ...sw('rug_border', '#d8cdb8', 5) } };
const HEAD = (hex) => sw('velvet_charcoal', hex, 1);
// the island, the dining table and the bedside tables (tools/blender/arch/home14.py and the scans' sizes)
const ISL = { x: 302.75, z: [6.55, 7.3, 8.05] }, DIN = { x: 302.9, z: 2.6 }, BED = { x: 314.735, z: 4.2 };
const SIDE_Z = [2.82, 5.58];
export const SLOTS = [
  { id: 'sofa', opts: [{ id: 'chester', price: 0, items: [P('scan_chesterfield', 308.5, 5.8, H2)] },
    { id: 'curve', price: 2200, items: [P('sofa_curve', 308.62, 5.8, H2)] }] },
  { id: 'chair', opts: [{ id: 'modern', price: 0, items: [P('scan_armchair', 310.45, 3.75, -0.17)] },
    { id: 'lounge', price: 1400, items: [P('scan_lounge_chair', 310.45, 3.7, -0.17)] },
    { id: 'deco', price: 900, items: [P('armchair_deco', 310.45, 3.8, -0.17)] }, { id: 'none', price: 0, items: [] }] },
  { id: 'table', opts: [{ id: 'round', price: 0, items: [P('scan_coffee_table', 310.05, 5.8)] }, { id: 'concrete', price: 700, items: [P('scan_concrete_table', 310.0, 5.8)] }] },
  { id: 'rug', opts: [{ id: 'sand', price: 0, items: [P('rug_rect', 310.0, 5.8, H2, { swap: RUG.sand })] }, { id: 'charcoal', price: 350, items: [P('rug_rect', 310.0, 5.8, H2, { swap: RUG.charcoal })] },
    { id: 'crimson', price: 450, items: [P('rug_rect', 310.0, 5.8, H2, { swap: RUG.crimson })] }, { id: 'teal', price: 450, items: [P('rug_rect', 310.0, 5.8, H2, { swap: RUG.teal })] }, { id: 'none', price: 0, items: [] }] },
  { id: 'lamp', opts: [{ id: 'torch', price: 0, items: [P('torchere_deco', 308.2, 3.4, 0, { scale: 0.55 })] }, { id: 'none', price: 0, items: [] }] },
  { id: 'dining', opts: [{ id: 'walnut', price: 0, items: [P('dining_table', DIN.x, DIN.z), ...[-0.65, 0, 0.65].flatMap((d) => [P('scan_dining_chair', DIN.x + d, DIN.z - 0.85, 0), P('scan_dining_chair', DIN.x + d, DIN.z + 0.85, Math.PI)])] },
    { id: 'none', price: 0, items: [] }] },
  { id: 'stools', opts: [{ id: 'bar', price: 0, items: ISL.z.map((z) => P('bar_stool', 303.75, z, -H2)) }, { id: 'none', price: 0, items: [] }] },
  { id: 'pendants', opts: [{ id: 'globe', price: 0, items: [...ISL.z.map((z) => P('scan_pendant', ISL.x, z, 0, { y: 3.2 - 0.95, ground: false, collide: false })), P('scan_pendant', DIN.x, DIN.z, 0, { y: 3.2 - 0.95, ground: false, collide: false })] },
    { id: 'dish', price: 600, items: [...ISL.z.map((z) => P('pendant_dish', ISL.x, z, 0, { y: 3.2 - 0.56, ground: false, collide: false })), P('pendant_dish', DIN.x, DIN.z, 0, { y: 3.2 - 0.56, ground: false, collide: false })] }] },
  { id: 'sideboard', opts: [{ id: 'walnut', price: 0, items: [P('scan_sideboard', 306.42, 10.535, Math.PI), P('scan_books', 305.75, 10.6, Math.PI, { y: 0.68, ground: false, collide: false }),
    P('scan_ceramic_vase', 307.25, 10.6, 0, { y: 0.68, ground: false, collide: false }), P('mirror_round', 306.42, 10.798, Math.PI, { y: 1.55, ground: false, collide: false })] }, { id: 'none', price: 0, items: [] }] },
  { id: 'shelf', opts: [{ id: 'open', price: 0, items: [P('shelf_unit', 313.0, 10.615, Math.PI), ...[0.926, 1.346].map((y, i) => P('scan_books', 313.0 + (i - 0.5) * 0.4, 10.64, Math.PI, { y, ground: false, collide: false })),
    P('scan_ceramic_vase', 313.3, 10.62, 0, { y: 1.766, ground: false, collide: false }), P('fruit_bowl', 312.75, 10.62, 0, { y: 0.086, ground: false, collide: false })] }, { id: 'none', price: 0, items: [] }] },
  { id: 'bed', opts: ['charcoal', 'navy', 'mustard', 'rose'].map((c, i) => ({ id: c, price: i ? 400 : 0, items: [P('bed_modern', BED.x, BED.z, -H2, { swap: HEAD({ charcoal: '#2d2f36', navy: '#1e2c4a', mustard: '#a77a25', rose: '#9a5a62' }[c]) }),
    ...SIDE_Z.map((z) => P('scan_side_table', 315.6, z, -H2)), ...SIDE_Z.map((z) => P('table_lamp', 315.6, z, 0, { y: 0.55, ground: false, collide: false }))] })) },
  { id: 'plants', opts: [{ id: 'green', price: 0, items: [P('planter_tall', 311.55, 0.95), P('planter_tall', 313.1, 0.95), P('scan_plant_stand', 306.9, 0.85), P('scan_plant', 306.9, 0.85, 0, { y: 0.76, ground: false, collide: false })] },
    { id: 'none', price: 0, items: [] }] },
];
// always there: the kitchen's things, the clock, the TV on its wall, the art (the flat's own)
const FIXED = [P('espresso_machine', 300.4, 7.75, H2, { y: 0.94, ground: false, scale: 0.7, collide: false }), P('tap_brass', 300.27, 8.75, H2, { y: 0.94, ground: false, collide: false }),
  P('fruit_bowl', 302.45, 7.3, 0, { y: 0.94, ground: false, collide: false }), P('scan_wall_clock', 300.198, 4.6, H2, { y: 2.35, ground: false, collide: false }),
  P('tv_slim', 312.097, 5.8, -H2, { y: 1.45, ground: false, collide: false })];
const ART = [{ id: 'art_6', x: 300.2 + 0.034, y: 1.65, z: 2.6, yaw: H2, mw: 1.9, mh: 1.2 }, { id: 'art_7', x: 315.9 - 0.034, y: 1.85, z: 4.2, yaw: -H2, mw: 1.5, mh: 0.9 },
  { id: 'art_5', x: 312.25 + 0.034, y: 1.75, z: 7.2, yaw: H2, mw: 1.0, mh: 0.75 }];
// the home cinema's furniture (two rows of club recliners, tower speakers, the popcorn cart); seats' centres and the riser (HOME.riser)
const CX = 318.9, PITCH = 1.04, ROWS = [{ z: 4.2, y: 0 }, { z: 7.55, y: HOME.riser.y }];
const CINEMA = [...ROWS.flatMap((r) => [-1, 0, 1].map((k) => P('seat_club', CX + k * PITCH, r.z, Math.PI, { y: r.y, lod: 0, seat: 1 }))),
  ...ROWS.flatMap((r) => [-1.5, -0.5, 0.5, 1.5].map((k) => P('arm_club', CX + k * PITCH, r.z, Math.PI, { y: r.y, lod: 0 }))),
  P('speaker_tower', 316.6, 0.78, 0), P('speaker_tower', 321.2, 0.78, 0), P('popcorn_cart', 321.0, 10.0, -H2, { collide: 0.05 })];
export const PAINT = {
  walls: ['#d9d1c6', '#ece7de', '#c9b9a6', '#a9b4ae', '#8e9aa8', '#6b5a50', '#34363b', '#8a4a3f'],
  kitchen: ['#23302b', '#1e2840', '#e3dccf', '#151517', '#5a1a20'],
  floor: ['#b3906a', '#6b4a34', '#d8c4a4'],
};
const PAINT_PRICE = { walls: 150, kitchen: 400, floor: 500 }, PAINT_IDS = { walls: [0], kitchen: [15], floor: [42] };
export const CINEMA_PRICE = 6000;
const DOOR = HOME.door, CDOOR = HOME.cinemaDoor;

export class Home {
  constructor(world, mats, credits, sound, hooks = {}) {
    this.world = world; this.mats = mats; this.credits = credits; this.sound = sound; this.hooks = hooks; this.room = world.rooms.home; this.meshes = []; this.cols = [0, 0]; this.listeners = new Set();
    let s = null; try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { s = null; }
    this.s = this._clean(s); this.lightK = this.s.lights ? 1 : 0.35; this.lightNow = this.lightK; this._lit = -1; this.tvOn = false; this.doorA = 0; this._tvT = 0;
    if (!this.room) return;
    this.U = this.room.U;
    this._door(); this._tv(); this.rebuild(); this.applyColours();
  }
  _clean(s) {
    const o = { v: 1, pick: {}, own: {}, col: {}, cinema: false, lights: 1 }; if (!s || typeof s !== 'object') return o;
    for (const sl of SLOTS) { const p = s.pick && s.pick[sl.id]; if (typeof p === 'string' && sl.opts.some((q) => q.id === p)) o.pick[sl.id] = p; }
    if (s.own && typeof s.own === 'object') for (const k of Object.keys(s.own)) if (/^[a-z]+\.[a-z#0-9]+$/i.test(k)) o.own[k] = 1;
    if (s.col && typeof s.col === 'object') for (const k of Object.keys(PAINT)) if (typeof s.col[k] === 'string' && HEX.test(s.col[k]) && PAINT[k].includes(s.col[k].toLowerCase())) o.col[k] = s.col[k].toLowerCase();
    o.cinema = !!s.cinema; o.lights = s.lights === 0 ? 0 : 1; return o;
  }
  _save() { try { localStorage.setItem(KEY, JSON.stringify(this.s)); } catch (e) { /* storage off: the session keeps it */ } for (const f of this.listeners) { try { f(this); } catch (e) { console.warn('[home]', e); } } }
  onChange(f) { this.listeners.add(f); return () => this.listeners.delete(f); }
  // ---------------------------------------------------------------- the catalogue (the phone's Home app reads these)
  pick(slot) { const sl = SLOTS.find((q) => q.id === slot); return (sl && this.s.pick[slot]) || (sl ? sl.opts[0].id : null); }
  owns(slot, opt) { const sl = SLOTS.find((q) => q.id === slot), o = sl && sl.opts.find((q) => q.id === opt); return !!o && (!o.price || !!this.s.own[slot + '.' + opt]); }
  price(slot, opt) { const sl = SLOTS.find((q) => q.id === slot), o = sl && sl.opts.find((q) => q.id === opt); return o ? o.price : 0; }
  // choose an option: bought first when it costs and is not yours (false when you are short); free to swap back to anything you own
  choose(slot, opt) {
    const sl = SLOTS.find((q) => q.id === slot), o = sl && sl.opts.find((q) => q.id === opt); if (!o) return false;
    if (!this.owns(slot, opt)) { if (!this.credits.spend(o.price, 'home:' + slot + '.' + opt)) return false; this.s.own[slot + '.' + opt] = 1; }
    this.s.pick[slot] = opt; this._save(); this.rebuild(); if (this.sound.click) this.sound.click(); return true;
  }
  colour(part) { return this.s.col[part] || PAINT[part][0]; }
  ownsColour(part, hex) { return hex === PAINT[part][0] || !!this.s.own[part + '.' + hex]; }
  paint(part, hex) {
    if (!PAINT[part] || !PAINT[part].includes(hex)) return false;
    if (!this.ownsColour(part, hex)) { if (!this.credits.spend(PAINT_PRICE[part], 'home:' + part)) return false; this.s.own[part + '.' + hex] = 1; }
    this.s.col[part] = hex; this._save(); this.applyColours(); return true;
  }
  paintPrice(part) { return PAINT_PRICE[part]; }
  applyColours() { if (!this.room) return; for (const part of Object.keys(PAINT)) { const hex = this.s.col[part]; tintShell(this.room, PAINT_IDS[part], hex && hex !== PAINT[part][0] ? hex : null); } }
  get cinemaOwned() { return this.s.cinema; }
  buyCinema() { if (this.s.cinema) return true; if (!this.credits.spend(CINEMA_PRICE, 'home:cinema')) return false; this.s.cinema = true; this._save(); this.rebuild(); this.hooks.event && this.hooks.event('homeCinema'); return true; }
  // ---------------------------------------------------------------- the furniture as one mesh (one draw per library material), its colliders and seats
  rebuild() {
    const w = this.world, room = this.room; if (!room) return;
    for (const m of this.meshes) { room.group.remove(m); m.geometry.dispose(); } this.meshes = [];
    w.walls.off(this.cols[0], this.cols[1]); w.sitSpots = w.sitSpots.filter((sp) => !sp.home);
    const c0 = w.walls.S.length / 6, host = { pacc: new Acc(), gacc: new Acc(), facc: new Acc(), bins: [],
      col: (x0, z0, x1, z1, y0, y1) => { for (const [ax, az, bx, bz] of [[x0, z0, x1, z0], [x1, z0, x1, z1], [x1, z1, x0, z1], [x0, z1, x0, z0]]) w.walls.add(ax, az, bx, bz, y0, y1); },
      poly: (pts, y0, y1) => { for (let k = 0; k < pts.length; k++) { const a = pts[k], b = pts[(k + 1) % pts.length]; w.walls.add(a[0], a[1], b[0], b[1], y0, y1); } },
      ring: (cx, cz, r, y0, y1, n = 16) => { const R = r / Math.cos(Math.PI / n); for (let k = 0; k < n; k++) { const a0 = 2 * Math.PI * k / n, a1 = 2 * Math.PI * (k + 1) / n; w.walls.add(cx + R * Math.cos(a0), cz + R * Math.sin(a0), cx + R * Math.cos(a1), cz + R * Math.sin(a1), y0, y1); } } };
    const items = [...FIXED, ...SLOTS.flatMap((sl) => (sl.opts.find((o) => o.id === this.pick(sl.id)) || sl.opts[0]).items), ...(this.s.cinema ? CINEMA : [])];
    // two meshes: the flat's furniture and the home cinema's (the partition hides one from the other while the door is shut: home.update)
    const hostC = { ...host, pacc: new Acc(), gacc: new Acc(), facc: new Acc() };
    for (const p of items) {
      const tgt = p.x > HOME.split ? hostC : host;
      const A = ASSETS[p.name]; if (!A) continue; const sc = typeof p.o.scale === 'number' ? p.o.scale : 1, lift = p.o.ground === false ? 0 : -A.box.min.y * sc;
      placeAsset(tgt, p.name, p.x, p.y + lift, p.z, p.yaw, p.o);
      const sd = p.o.seat ? { h: 0.47, n: 1 } : SIT_ON[p.name] || (p.name === 'bed_modern' ? { h: 0.6, w: 0.9 } : null);
      if (sd) { const bx = A.box, wx = (bx.max.x - bx.min.x) * sc, cx = (bx.max.x + bx.min.x) / 2 * sc, cz = ((bx.max.z + bx.min.z) / 2 + (bx.max.z - bx.min.z) * 0.06) * sc, n = sd.n || Math.max(1, Math.round(wx / sd.w)), cs = Math.cos(p.yaw), sn = Math.sin(p.yaw);
        for (let i = 0; i < n; i++) { const lx = cx + (i - (n - 1) / 2) * (wx / n), x = p.x + lx * cs + cz * sn, z = p.z - lx * sn + cz * cs;
          w.sitSpots.push({ x, y: p.y + sd.h, z, face: p.yaw + Math.PI, stand: { x: x + sn * 0.62, z: z + cs * 0.62 }, room: 'home', taken: null, home: true, cinema: !!p.o.seat }); } }
    }
    for (const a of ART) { const f = { ...a, ...fitArt(a.id, a.mw, a.mh), emit: 0.12, frameCol: '#c9a35e' }; framePanel(host.pacc, f); if (!w.panels[a.id + '_h']) addPanel(w, room, { ...f, id: a.id + '_h' }); }   // world9.js PANEL_DRAW art: the _h copies
    this.cols = [c0, w.walls.S.length / 6];
    this.part = { flat: [], cinema: [] };
    const add = (m, nm, k) => { m.matrixAutoUpdate = false; m.name = nm; room.group.add(m); this.meshes.push(m); this.part[k].push(m); };
    for (const [h, k] of [[host, 'flat'], [hostC, 'cinema']]) {
      if (h.pacc.count) { const g = toGeometry(h.pacc); room.lights.bake(g);
        const lf = splitIds(g, LEAF_IDS); if (lf) add(new THREE.Mesh(lf, this.mats.leafRoom(room.U)), 'home-leaves-' + k, k);
        const gl = splitGlass(g); if (gl) { const gm = new THREE.Mesh(gl, this.mats.glassMat()); gm.renderOrder = 3; add(gm, 'home-propglass-' + k, k); }
        add(new THREE.Mesh(g, this.mats.litFor(room.U, g)), 'home-props-' + k, k); }
      if (h.gacc.count) { const g = toGeometry(h.gacc, false); add(new THREE.Mesh(g, this.mats.glowMat(room.U)), 'home-propglow-' + k, k); } }
    this._doorShut = !this.s.cinema; this._place();
  }
  // ---------------------------------------------------------------- the home cinema's door: a walnut leaf on hinges, locked till the room is yours
  _door() {
    const room = this.room, acc = new Acc(), hz = CDOOR.z - CDOOR.w / 2 + 0.03, x = HOME.split, h = 2.12, w = CDOOR.w - 0.06;
    const box = new THREE.BoxGeometry(0.04, h, w); box.translate(x, h / 2 + 0.005, hz + w / 2);
    const id = (named('walnut') || { id: 2 }).id; acc.add(box, new THREE.Matrix4(), lin('#6a4a34'), { mat: id });
    for (const s of [-1, 1]) { const k = new THREE.BoxGeometry(0.05, 0.02, 0.13); k.translate(x + s * 0.045, 1.04, hz + w - 0.14); acc.add(k, new THREE.Matrix4(), lin('#c9a35e'), { mat: (named('brass') || { id: 24 }).id }); }
    const g = toGeometry(acc); room.lights.bake(g); g.translate(-x, 0, -hz);
    const m = new THREE.Mesh(g, this.mats.litFor(room.U, g)); m.position.set(x, 0, hz); m.name = 'home-cinema-door'; room.group.add(m); this.leaf = m;
    this.seg = this.world.addSegment(x, CDOOR.z - CDOOR.w / 2, x, CDOOR.z + CDOOR.w / 2, 0, 2.2);
  }
  _place() { if (!this.leaf) return; this.leaf.rotation.y = -this.doorA * 1.75; this.world.segmentOn(this.seg, this.doorA < 0.5); }
  // ---------------------------------------------------------------- the TV: the LUMIERE channel on a canvas 6 mm in front of the glass
  _tv() {
    const c = document.createElement('canvas'); c.width = 512; c.height = 288; this.tvC = c; this.tvG = c.getContext('2d'); const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; this.tvTex = tex;
    const mat = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }), m = new THREE.Mesh(new THREE.PlaneGeometry(1.44, 0.81), mat);
    m.position.set(312.097 - 0.09, 1.45, 5.8); m.rotation.y = -H2; m.visible = false; m.name = 'home-tv'; this.room.group.add(m); this.tvMesh = m;
  }
  _drawTv(now) {
    const g = this.tvG, W = 512, H = 288, info = this.hooks.tvInfo ? this.hooks.tvInfo() : {};
    const bg = g.createLinearGradient(0, 0, W, H); bg.addColorStop(0, '#16121e'); bg.addColorStop(1, '#2a1a12'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
    g.fillStyle = '#c9a35e'; g.fillRect(0, 0, W, 4); g.textBaseline = 'middle'; g.textAlign = 'left';
    g.font = '600 26px "Cormorant Garamond", serif'; g.fillStyle = '#f0e2c4'; g.fillText('LUMIÈRE  TV', 22, 34);
    const d = new Date(); g.textAlign = 'right'; g.font = '500 22px Inter, sans-serif'; g.fillStyle = '#e8dcc6'; g.fillText(d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), W - 22, 34);
    g.textAlign = 'left'; g.font = '500 15px Inter, sans-serif'; g.fillStyle = '#c9a35e'; g.fillText((t('home.tvTonight') || 'TONIGHT').toUpperCase(), 22, 76);
    const rows = (info.shows || []).slice(0, 4); g.font = '500 19px Inter, sans-serif';
    rows.forEach((r, i) => { g.fillStyle = i % 2 ? '#e8dcc6' : '#ffffff'; g.fillText(r, 22, 106 + i * 30); });
    if (info.ticket) { g.fillStyle = 'rgba(201,163,94,0.18)'; g.fillRect(16, 222, W - 32, 46); g.fillStyle = '#f0e2c4'; g.font = '600 17px Inter, sans-serif'; g.fillText(info.ticket, 28, 245); }
    else { g.fillStyle = '#9a8f80'; g.font = '400 16px Inter, sans-serif'; g.fillText(t('home.tvHint') || 'Book a seat on your phone, then walk across the road.', 22, 245); }
    const x = (now / 40) % (W + 400); g.fillStyle = 'rgba(255,255,255,0.05)'; g.fillRect(W - x, 0, 60, H);
    this.tvTex.needsUpdate = true;
  }
  // ---------------------------------------------------------------- per frame (only while the flat is drawn)
  update(dt, now, player) {
    if (!this.room || !this.room.group.visible) return;
    // the light switch fades the flat's house lights (the city's glow through the glass stays)
    if (Math.abs(this.lightNow - this.lightK) > 0.002 || this._lit !== this.lightNow) { this.lightNow += (this.lightK - this.lightNow) * Math.min(1, dt * 3); this._lit = this.lightNow; this.U.uHouse.value = this.lightNow; if (this.U.uGlow) this.U.uGlow.value = 0.35 + 0.65 * Math.min(1, this.lightNow * 2.5); }
    // the cinema door opens as you come to it (when the room is yours) and closes behind you
    const near = this.s.cinema && Math.abs(player.x - HOME.split) < 1.6 && Math.abs(player.z - CDOOR.z) < 1.2;
    const want = near ? 1 : 0; if (this.doorA !== want) { const was = this.doorA; this.doorA = Math.max(0, Math.min(1, this.doorA + Math.sign(want - this.doorA) * dt / 0.7)); if (was === 0 && this.sound.door) this.sound.door(); this._place(); }
    if (this.tvOn) { this._tvT -= dt; if (this._tvT <= 0) { this._tvT = 0.5; this._drawTv(now); } }
    // what the partition hides: the home cinema's furniture from the flat and the flat's from the cinema, unless the door stands open
    if (this.part) { const open = this.doorA > 0.02, inC = player.x > HOME.split; for (const m of this.part.cinema) m.visible = inC || open; for (const m of this.part.flat) m.visible = !inC || open; }
    if (this.film) this._filmTick(player);
  }
  // ---------------------------------------------------------------- what the action button does here (main.js prompts)
  prompt(r, p, ahead) {
    if (r === 'street') { const dx = p.x - HOME.outDoor.x, dz = p.z - HOME.outDoor.z; if (Math.hypot(dx, dz) < 1.3 && ahead(HOME.outDoor.x, HOME.outDoor.z + 0.5, 0.2)) return { label: t('home.in'), fn: () => this.goIn() }; return null; }
    if (r !== 'home') return null;
    const d = (x, z) => Math.hypot(p.x - x, p.z - z);
    if (d(DOOR.x, DOOR.z - 0.45) < 0.95 && ahead(DOOR.x, DOOR.z, 0.3)) return { label: t('home.out'), fn: () => this.goOut() };
    if (d(DOOR.x + 0.76, DOOR.z - 0.5) < 0.75 && ahead(DOOR.x + 0.76, DOOR.z, 0.2)) return { label: t(this.s.lights ? 'home.dim' : 'home.bright'), fn: () => this.toggleLights() };
    if (!this.s.cinema && p.x < HOME.split && d(HOME.split - 0.4, CDOOR.z) < 1.0 && ahead(HOME.split, CDOOR.z, 0.3)) return { label: t('home.cinemaLocked', { price: this.credits.fmt(CINEMA_PRICE) }), fn: () => this.hooks.openApp && this.hooks.openApp('home', 'rooms') };
    if (d(313.25, 4.5) < 1.0 && ahead(312.9, 4.5, 0.3)) return { label: t('home.wardrobe'), fn: () => this.hooks.wardrobe && this.hooks.wardrobe() };
    if (d(301.05, 7.75) < 0.95 && ahead(300.6, 7.75, 0.3)) return { label: t('home.coffee'), fn: () => this.hooks.coffee && this.hooks.coffee() };
    if (p.x > 307.5 && p.x < 312 && p.z > 3 && p.z < 8.6 && ahead(312.0, 5.8, 0.75)) return { label: t(this.tvOn ? 'home.tvOff' : 'home.tvOn'), fn: () => this.toggleTv() };
    return null;
  }
  // when you sit in the home cinema: play a film here (main.js asks while you are seated)
  seatPrompt(sp) { if (!sp || !sp.cinema) return null; return this.film ? { label: t('home.stopFilm'), fn: () => this.stopFilm() } : { label: t('home.playFilm'), fn: () => this.hooks.pickFilm && this.hooks.pickFilm() }; }
  toggleLights() { this.s.lights = this.s.lights ? 0 : 1; this.lightK = this.s.lights ? 1 : 0.35; this._save(); if (this.sound.click) this.sound.click(); }
  toggleTv() { this.tvOn = !this.tvOn; this.tvMesh.visible = this.tvOn; this._tvT = 0; if (this.sound.click) this.sound.click(); if (this.tvOn) this.hooks.event && this.hooks.event('tv'); }
  // ---------------------------------------------------------------- going out and coming home (a fade: the flat is upstairs in the Astor)
  goOut() { this.hooks.travel && this.hooks.travel(HOME.out.x, HOME.out.z, 0, () => { if (this.sound.door) this.sound.door(); this.stopFilm(); }); }
  goIn() { this.hooks.travel && this.hooks.travel(HOME.inside.x, HOME.inside.z, 0, () => { if (this.sound.door) this.sound.door(); }); }
  spawn(player) { player.place(HOME.inside.x, HOME.inside.z - 1.2, 0, -0.05, 0); }
  // the way out when you have somewhere to be (wayfind.js plan: in the flat, the front door)
  goal() { return { key: 'goal.home', pts: [{ x: DOOR.x, y: 0, z: DOOR.z - 0.4 }] }; }
  // ---------------------------------------------------------------- films in the home cinema: a video of its own on the screen's panel
  playFilm(src) {
    const pan = this.world.panels.homescreen; if (!pan || !src || !src.url) return false; this.stopFilm();
    const v = document.createElement('video'); v.crossOrigin = 'anonymous'; v.playsInline = true; v.setAttribute('playsinline', ''); v.src = src.url; v.volume = 0.85;
    Object.assign(v.style, { position: 'fixed', left: '0', top: '0', width: '2px', height: '2px', opacity: '0.01', zIndex: '-1', pointerEvents: 'none' }); document.body.appendChild(v);
    const tex = new THREE.VideoTexture(v); tex.colorSpace = THREE.SRGBColorSpace; tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false;
    this.film = { v, tex, src, map0: pan.mat.uniforms ? pan.mat.uniforms.map.value : pan.mat.map }; this._setScreen(tex);
    v.play().catch(() => { this.hooks.toast && this.hooks.toast(t('toast.videoError')); this.stopFilm(); });
    v.addEventListener('ended', () => this.stopFilm()); this.lightK = 0.12; this.hooks.event && this.hooks.event('homeFilm'); return true;
  }
  _setScreen(tex) { const pan = this.world.panels.homescreen; if (!pan) return; if (pan.mat.uniforms && pan.mat.uniforms.map) pan.mat.uniforms.map.value = tex; else { pan.mat.map = tex; pan.mat.needsUpdate = true; } }
  _filmTick(p) { const f = this.film; if (!f) return; const here = this.world.roomAt(p.x, p.y, p.z) === 'home' && p.x > HOME.split; f.v.muted = !here; }
  stopFilm() { const f = this.film; if (!f) return; this.film = null; try { f.v.pause(); } catch (e) { /* gone */ } f.v.removeAttribute('src'); f.v.load(); f.v.remove(); f.tex.dispose(); this._setScreen(f.map0); this.lightK = this.s.lights ? 1 : 0.35; }
  films() { return FILMS.map((f) => ({ id: f.id, title: f.short || f.title, mins: f.mins, url: filmURL(f).url })); }
}
