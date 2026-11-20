// LUMIERE v14 - My Theatre (the master prompt: "customizable theatres ... saved presets ... share presets with friends"). Each hall can wear
// a theme: the colour of its seats, walls, carpet and curtains (world9.js themeHall recolours them live, nothing reloads). Four themes are
// ready-made (Noir is free, Crimson, Emerald and Gold come from the shop), any part can take its own colour, and a look can be saved as a
// preset, applied to any hall, shared as a short code and imported from one. Kept on this device (localStorage).
// What a theme cannot change: the halls' shapes, rows, steps and screens are built and light-baked offline (tools/blender/arch), so seat
// counts, spacing and screen size stay as designed.
import { themeHall } from './world9.js';

const KEY = 'lumiere.theatres.v1', HEX = /^#[0-9a-f]{6}$/i, PARTS = ['seat', 'wall', 'carpet', 'curtain'];
export const THEMES = {
  noir: { seat: '#141416', wall: '#121214', carpet: '#17171b', curtain: '#0e0e10' },
  crimson: { seat: '#7a0f18', wall: '#360a10', carpet: '#2a0a0e', curtain: '#6e0d1b', shop: 'theme_crimson' },
  emerald: { seat: '#0f4a33', wall: '#0e2a20', carpet: '#0c1f18', curtain: '#0f3d2b', shop: 'theme_emerald' },
  gold: { seat: '#a8844e', wall: '#2a2218', carpet: '#3a2a18', curtain: '#8a6a2e', shop: 'theme_gold' },
};
export const SWATCH = {
  seat: ['#7a0f18', '#3b2216', '#1e2846', '#0f4a33', '#141416', '#a8844e', '#4d2b6e', '#8a5430'],
  wall: ['#121214', '#360a10', '#1a2236', '#0e2a20', '#2a2218', '#2d2f36', '#3a2a40', '#4a3a2e'],
  carpet: ['#17171b', '#2a0a0e', '#141b33', '#0c1f18', '#3a2a18', '#2c2c30', '#3a1f2e', '#22262e'],
  curtain: ['#6e0d1b', '#0e0e10', '#2a2f4a', '#0f3d2b', '#8a6a2e', '#5a1a24', '#4d2b6e', '#d9cfbf'],
};
const clean = (th) => { const o = {}; if (th && typeof th === 'object') for (const p of PARTS) if (typeof th[p] === 'string' && HEX.test(th[p])) o[p] = th[p].toLowerCase(); return o; };

export class Theatres {
  constructor(world) {
    this.world = world; let s = null; try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { s = null; }
    this.s = s && typeof s === 'object' ? s : {}; this.s.applied = this.s.applied && typeof this.s.applied === 'object' ? this.s.applied : {}; this.s.presets = Array.isArray(this.s.presets) ? this.s.presets.slice(0, 24) : [];
  }
  _save() { try { localStorage.setItem(KEY, JSON.stringify(this.s)); } catch (e) { /* storage off: the session keeps it */ } }
  get(hallId) { return clean(this.s.applied[hallId]); }
  // put a look on a hall (parts left out keep the hall's own colours) and remember it
  apply(hallId, th) { const c = clean(th); if (Object.keys(c).length) this.s.applied[hallId] = c; else delete this.s.applied[hallId]; this._save(); return themeHall(this.world, hallId, { seat: c.seat || null, wall: c.wall || null, carpet: c.carpet || null, curtain: c.curtain || null }); }
  applyAll() { for (const h of this.world.halls) { const c = this.get(h.id); if (Object.keys(c).length) themeHall(this.world, h.id, c); } }
  setPart(hallId, part, hex) { const c = this.get(hallId); if (hex) c[part] = hex; else delete c[part]; return this.apply(hallId, c); }
  presets() { return this.s.presets; }
  savePreset(name, th) { const p = { id: Date.now().toString(36), name: String(name || 'My theatre').slice(0, 24), th: clean(th) }; this.s.presets.unshift(p); this.s.presets = this.s.presets.slice(0, 24); this._save(); return p; }
  deletePreset(id) { this.s.presets = this.s.presets.filter((p) => p.id !== id); this._save(); }
  // a share code: the look as base64 JSON, checked on the way in (only the four parts, only #rrggbb colours)
  code(th) { return 'LT1.' + btoa(JSON.stringify(clean(th))); }
  fromCode(code) { try { const m = /^LT1\.([A-Za-z0-9+/=]{4,400})$/.exec(String(code || '').trim()); if (!m) return null; const c = clean(JSON.parse(atob(m[1]))); return Object.keys(c).length ? c : null; } catch (e) { return null; } }
}
