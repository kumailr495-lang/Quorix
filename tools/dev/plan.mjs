// v9 drawings from the spec (docs/V9-DESIGN.md): floor plans of both levels and a long section of every hall with its sightlines.
// usage: node tools/dev/plan.mjs [outDir=docs/v9]   (pure Node, no browser)
import fs from 'node:fs';
import { HALL, L1, LOBBY, MEZZ, SPINE, BRIDGE, FLANK_W, LINK_W, FLANK_E, LINK_E, PANTRY, WC, STREET, ESC, escProfile, LIFT, TRAVELATOR, GATE, DOORS, COUNTERS, POSTS, PALETTE } from '../../www/js/building.js';
import { hallSeats, hallReport } from '../../www/js/hallmath.js';
const out = process.argv[2] || 'docs/v9'; fs.mkdirSync(out, { recursive: true });
const S = 9, X0 = -50, Z0 = -76;   // px per metre; plan origin (north = -z at the top)
const px = (x) => ((x - X0) * S).toFixed(1), pz = (z) => ((z - Z0) * S).toFixed(1);
const rect = (r, fill, stroke = '#222', sw = 1, extra = '') => `<rect x="${px(r.x0)}" y="${pz(r.z0)}" width="${((r.x1 - r.x0) * S).toFixed(1)}" height="${((r.z1 - r.z0) * S).toFixed(1)}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" ${extra}/>`;
const text = (x, z, s, size = 11, fill = '#111', anchor = 'middle', w = 600) => `<text x="${px(x)}" y="${pz(z)}" font-family="Inter, Arial, sans-serif" font-size="${size}" font-weight="${w}" fill="${fill}" text-anchor="${anchor}">${s}</text>`;
const line = (x0, z0, x1, z1, c, w = 1.5, dash = '') => `<line x1="${px(x0)}" y1="${pz(z0)}" x2="${px(x1)}" y2="${pz(z1)}" stroke="${c}" stroke-width="${w}" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`;
const arrow = (pts, c, w = 3) => `<polyline points="${pts.map(([x, z]) => `${px(x)},${pz(z)}`).join(' ')}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linejoin="round" marker-end="url(#a${c.slice(1)})"/>`;
const defs = (cols) => `<defs>${cols.map((c) => `<marker id="a${c.slice(1)}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${c}"/></marker>`).join('')}</defs>`;
const W = (STREET.x1 - X0) * S, Hh = (STREET.z1 - Z0) * S;
function hallBox(h, level) {
  const a = h.toWorld(-h.width / 2, -1.25), b = h.toWorld(h.width / 2, h.depthIn), r = { x0: Math.min(a.x, b.x), z0: Math.min(a.z, b.z), x1: Math.max(a.x, b.x), z1: Math.max(a.z, b.z) };
  const col = PALETTE[h.id] ? Object.values(PALETTE[h.id])[1] : '#333';
  let s = rect(r, level === 0 ? '#e9e4dc' : '#f4f1ec', col, 2);
  // screen arc and seats
  const pts = []; for (let i = 0; i <= 24; i++) { const u = -h.W / 2 + h.W * i / 24, w = h.toWorld(u, h.screenD(u)); pts.push(`${px(w.x)},${pz(w.z)}`); }
  s += `<polyline points="${pts.join(' ')}" fill="none" stroke="${PALETTE.brand.gold}" stroke-width="4"/>`;
  for (const st of hallSeats(h)) s += `<circle cx="${px(st.x)}" cy="${pz(st.z)}" r="${st.kind === 'rocker' ? 1.6 : 2.3}" fill="${st.kind === 'pod' ? '#7a4a2a' : st.kind === 'sofa' ? '#8a2a3a' : st.kind === 'recliner' ? '#7a3f1d' : '#3a4256'}"/>`;
  // side aisles
  for (const sg of [-1, 1]) { const p0 = h.fromRow(sg * (h.aisle[0] + h.aisle[1]) / 2, h.rows[0].dHip - 0.6), p1 = h.fromRow(sg * (h.aisle[0] + h.aisle[1]) / 2, h.rearD), w0 = h.toWorld(p0.u, p0.d), w1 = h.toWorld(p1.u, p1.d); s += line(w0.x, w0.z, w1.x, w1.z, '#c9a35e', 2, '4 3'); }
  const c = h.toWorld(0, h.depthIn * 0.55); s += text(c.x, c.z, `${h.name.replace('LUMIERE ', '')}`, 15, '#111', 'middle', 800);
  s += text(c.x, c.z + 1.8, `${hallSeats(h).length} seats`, 10, '#444', 'middle', 500);
  return s;
}
function door(d) {
  const col = d.oneWay ? (d.id.includes('Out') || d.id === 'spineOut' ? '#2bb673' : '#e3b25f') : '#555';
  return d.axis === 'z' ? line(d.x, d.z - d.w / 2, d.x, d.z + d.w / 2, col, 5) : line(d.x - d.w / 2, d.z, d.x + d.w / 2, d.z, col, 5);
}
function plan(level) {
  const G = level === 0; let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${Hh}" viewBox="0 0 ${W} ${Hh}">${defs(['#e3b25f', '#2bb673'])}<rect width="100%" height="100%" fill="#fbfaf7"/>`;
  s += text(X0 + 1, Z0 + 2.5, G ? 'LUMIERE v9 - ground floor (G, y = 0)' : `LUMIERE v9 - first floor (L1, y = ${L1} m)`, 18, '#14162e', 'start', 800);
  for (const h of Object.values(HALL)) s += hallBox(h, level);
  if (G) {
    s += rect({ x0: STREET.x0, z0: STREET.z0, x1: STREET.x1, z1: STREET.kerb }, '#d9d2c6', '#999'); s += rect({ x0: STREET.x0, z0: STREET.road[0], x1: STREET.x1, z1: STREET.road[1] }, '#55565a', '#333');
    s += rect({ x0: STREET.x0, z0: STREET.kerb, x1: STREET.x1, z1: STREET.road[0] }, '#77787c', '#333'); s += text(-6, 28.2, 'TAXI DROP-OFF (luxury taxi waits here)', 10, '#fff');
    s += rect({ x0: -10.6, z0: 26.6, x1: -1.4, z1: 29.2 }, '#14162e', '#e3b25f', 1.5);
    s += rect(LOBBY, '#efe7da', '#1f1d22', 3); s += text(0, 12, 'LOBBY (double height 9.6 m)', 14, '#1f1d22', 'middle', 800);
    s += rect({ x0: COUNTERS.boxOffice.x0, z0: COUNTERS.boxOffice.z0, x1: COUNTERS.boxOffice.x1, z1: COUNTERS.boxOffice.z1 }, '#c9a66b', '#1f1d22'); s += text(-18.5, 15.2, 'BOX OFFICE', 10);
    s += rect({ x0: COUNTERS.concessions.x0, z0: COUNTERS.concessions.z0, x1: COUNTERS.concessions.x1, z1: COUNTERS.concessions.z1 }, '#5e1c2a', '#1f1d22'); s += text(-18.5, 2.4, 'CONCESSIONS', 10);
    s += rect({ x0: -7, z0: -4, x1: 5, z1: 6 }, '#e2d6c2', '#bbb', 1, 'rx="12"'); s += text(-1, 1.6, 'WAITING LOUNGE', 10, '#5e1c2a');
    s += rect(WC, '#e6edf0', '#556', 2); s += line(WC.x0, -4, WC.x1, -4, '#556', 2); s += text(27, -9, 'MEN', 11); s += text(27, 1, 'WOMEN', 11);
    s += rect({ x0: SPINE.x0, z0: SPINE.z0, x1: SPINE.x1, z1: SPINE.z1 }, '#f6f2ea', '#2bb673', 2); s += rect({ x0: TRAVELATOR.x0, z0: TRAVELATOR.z0, x1: TRAVELATOR.x1, z1: TRAVELATOR.z1 }, '#bfe8d2', '#2bb673');
    s += `<text transform="translate(${px(2.9)},${pz(-44)}) rotate(-90)" font-family="Inter, Arial" font-size="12" font-weight="800" fill="#2bb673" text-anchor="middle">EXIT SPINE + TRAVELATOR</text>`;
    s += line(GATE.x0, GATE.z, GATE.gate[0], GATE.z, '#14162e', 3) + line(GATE.gate[1], GATE.z, GATE.x1, GATE.z, '#14162e', 3); s += text(7.0, 5.6, 'TICKET GATE', 9, '#14162e');
    s += `<circle cx="${px(POSTS.greeter.x)}" cy="${pz(POSTS.greeter.z)}" r="4" fill="#e3b25f"/>` + text(POSTS.greeter.x + 3.6, POSTS.greeter.z + 0.4, 'host', 9, '#7a5a20');
    s += arrow([[-4, 25], [0, 19], [2, 12], [9.7, 5], [9.7, 1.2]], '#e3b25f');
    s += arrow([[-2.4, -23.3], [0, -30], [0, -16], [-1, -9]], '#2bb673');
  } else {
    s += rect({ x0: LOBBY.x0, z0: MEZZ.z0, x1: LOBBY.x1, z1: MEZZ.z1 }, '#efe7da', '#1f1d22', 2); s += text(0, -11.2, 'MEZZANINE (over the lobby)', 11, '#1f1d22');
    for (const r of [BRIDGE, FLANK_W, LINK_W, FLANK_E, LINK_E]) s += rect(r, '#d8d9ee', '#161a3c', 2);
    s += text(-20, -17.6, 'BRIDGE - the long, dim Dolby-style way in', 12, '#161a3c', 'middle', 800);
    s += arrow([[9.7, -11.5], [10, -18], [-44, -18], [-44, -23.5], [-40.6, -23.7]], '#e3b25f'); s += arrow([[-44, -24], [-44, -48], [-38, -53.2], [-31.4, -51.5]], '#e3b25f');
    s += arrow([[11, -18], [33.2, -18], [33.2, -23.4], [29.9, -23.6]], '#e3b25f'); s += arrow([[33.2, -24], [33.2, -43.1], [28.9, -43.1]], '#e3b25f');
    s += rect(PANTRY, '#c9a66b', '#14162e'); s += text(0, -24, 'service pantry', 8);
  }
  // escalators, lift
  for (const e of Object.values(ESC)) { const p = escProfile(e); s += rect({ x0: e.x0, z0: p.zTop, x1: e.x1, z1: e.zBot }, '#cfd3da', '#333'); for (let z = p.incline[1]; z < p.incline[0]; z += 0.4) s += line(e.x0, z, e.x1, z, '#888', 0.6); }
  s += text(10.7, G ? -5 : -5, G ? 'ESCALATORS (30 deg, 0.62 m/s)' : '', 9, '#333');
  s += rect({ x0: LIFT.x0, z0: LIFT.z0, x1: LIFT.x1, z1: LIFT.z1 }, '#8a8f99', '#222'); s += text(14.6, -11.2, 'LIFT', 9, '#fff');
  for (const d of DOORS) if ((G && d.y < 1) || (!G && d.y > 1)) s += door(d);
  s += `<g transform="translate(${W - 330},${Hh - 92})"><rect width="318" height="80" fill="#fff" stroke="#ccc"/>` +
    `<line x1="12" y1="20" x2="44" y2="20" stroke="#e3b25f" stroke-width="4"/><text x="52" y="24" font-family="Inter, Arial" font-size="11">entry route / entry-only door</text>` +
    `<line x1="12" y1="42" x2="44" y2="42" stroke="#2bb673" stroke-width="4"/><text x="52" y="46" font-family="Inter, Arial" font-size="11">exit route / exit-only door</text>` +
    `<circle cx="20" cy="64" r="2" fill="#3a4256"/><circle cx="32" cy="64" r="2.5" fill="#7a3f1d"/><circle cx="44" cy="64" r="2.5" fill="#8a2a3a"/><text x="52" y="68" font-family="Inter, Arial" font-size="11">seat / recliner / sofa (1 grid square = 1 m at 9 px)</text></g>`;
  return s + '</svg>';
}
// long section of a hall along its centre line: floor steps, rows, eyes, sightlines to the picture's bottom edge, the picture, the ceiling
function section(h) {
  const k = 22, pad = 40, Wd = (h.depthIn + 3) * k + pad * 2, Hd = (h.ceil + 1.5) * k + pad * 2, X = (d) => (pad + (d + 1.5) * k).toFixed(1), Y = (y) => (Hd - pad - y * k).toFixed(1);
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${Wd}" height="${Hd}" viewBox="0 0 ${Wd} ${Hd}"><rect width="100%" height="100%" fill="#fbfaf7"/>`;
  s += `<text x="${pad}" y="24" font-family="Inter, Arial" font-size="16" font-weight="800" fill="#14162e">${h.name} - long section (rows ${h.rows.length}, rise ${h.total.toFixed(2)} m, c = ${h.c} m)</text>`;
  let fl = `${X(-1.25)},${Y(0)}`;
  for (const r of h.rows) { const d0 = r.r ? r.pf : -1.25; fl += ` ${X(d0)},${Y(r.r ? h.rows[r.r - 1].y : 0)} ${X(d0)},${Y(r.y)}`; }
  fl += ` ${X(h.depthIn)},${Y(h.total)} ${X(h.depthIn)},${Y(0)}`;
  s += `<polygon points="${fl}" fill="#d9d4cc" stroke="#555"/>`;
  s += `<line x1="${X(0)}" y1="${Y(h.hB)}" x2="${X(0)}" y2="${Y(h.topY)}" stroke="#e3b25f" stroke-width="5"/>`;
  s += `<line x1="${X(-1.25)}" y1="${Y(h.ceil)}" x2="${X(h.depthIn)}" y2="${Y(h.ceil)}" stroke="#555" stroke-width="2"/>`;
  for (const r of h.rows) {
    const ey = r.y + r.sd.eye; s += `<line x1="${X(r.X)}" y1="${Y(ey)}" x2="${X(0)}" y2="${Y(h.hB)}" stroke="#2f7cff" stroke-width="0.8" opacity="0.7"/>`;
    s += `<rect x="${X(r.dHip - r.sd.fr)}" y="${Y(r.y + r.sd.h)}" width="${((r.sd.fr + r.sd.bk) * k).toFixed(1)}" height="${(r.sd.h * k).toFixed(1)}" fill="${r.seat === 'rocker' ? '#3a4256' : '#7a3f1d'}" opacity="0.85"/>`;
    s += `<circle cx="${X(r.X)}" cy="${Y(ey)}" r="3" fill="#b8452f"/><text x="${X(r.dHip)}" y="${Number(Y(r.y)) + 14}" font-family="Inter, Arial" font-size="10" text-anchor="middle">${r.letter}</text>`;
  }
  return s + '</svg>';
}
fs.writeFileSync(`${out}/plan-G.svg`, plan(0)); fs.writeFileSync(`${out}/plan-L1.svg`, plan(1));
for (const h of Object.values(HALL)) fs.writeFileSync(`${out}/section-${h.id}.svg`, section(h));
fs.writeFileSync(`${out}/halls.json`, JSON.stringify(Object.values(HALL).map(hallReport), null, 1));
console.log('drawings written to', out);
