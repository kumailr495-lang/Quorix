// LUMIERE v9 - the lobby's screens: the big LED wall over the way out (a slow film reel of what is on), the showtimes board over the box
// office (each screen, its film and when it starts), the menu boards over the concession counter (prices as on the bill).
import { CATALOG, filmById, posterURL, FEATURED } from './films.js';
import { SANS, SERIF, readerBoard } from './textures.js';
import { HALL } from './building.js';
const HALL_IDS = ['MAX', 'CURVE', 'CLASSIC', 'X270'], FEAT = { MAX: 'sintel', CURVE: 'cosmos', CLASSIC: 'bunny', X270: 'hero' };
const posters = {}; for (const f of CATALOG) { const im = new Image(); im.src = posterURL(f.id); posters[f.id] = im; }
const ok = (im) => im && im.complete && im.naturalWidth > 0;
function sp(g, px) { if ('letterSpacing' in g) g.letterSpacing = px + 'px'; }
// the LED wall: posters sliding past, each with its screen and status; a brand card between them
export function ledWall(P, shows, t, fmt) {
  if (!P) return () => {}; const { g, canvas: c, tex } = P, W = c.width, H = c.height, seg = Math.round(H * 0.95), items = [...HALL_IDS.map((id) => ({ id })), { logo: true }]; let last = 0; g.__noFit = true;
  return (now) => {
    if (now - last < 80) return; last = now;
    const bg = g.createLinearGradient(0, 0, W, H); bg.addColorStop(0, '#0b0a14'); bg.addColorStop(1, '#1a1026'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
    const L = seg * 1.55, off = (now * 0.04) % (L * items.length);
    for (let k = -1; k < 2; k++) for (let i = 0; i < items.length; i++) { const x = i * L - off + k * L * items.length; if (x > W || x + L < 0) continue; const it = items[i];
      if (it.logo) { g.fillStyle = '#f2ebdd'; g.font = `500 ${H * 0.2}px ${SERIF}`; g.textAlign = 'center'; g.textBaseline = 'middle'; sp(g, H * 0.05); g.fillText('LUMIÈRE', x + L / 2, H * 0.45); sp(g, 0); g.fillStyle = '#e3b25f'; g.fillRect(x + L / 2 - H * 0.2, H * 0.62, H * 0.4, H * 0.012); continue; }
      const s = shows.get(it.id), fid = s && s.src && s.src.kind === 'film' ? s.src.filmId : FEAT[it.id], F = filmById(fid), pi = posters[fid], ph = H * 0.78, pw = ph * 2 / 3;
      if (ok(pi)) g.drawImage(pi, x + H * 0.06, H * 0.11, pw, ph); g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      const tx = x + H * 0.1 + pw; g.fillStyle = '#e3b25f'; g.font = `600 ${H * 0.07}px ${SANS}`; sp(g, H * 0.02); g.fillText(HALL[it.id].name.replace('LUMIERE ', ''), tx, H * 0.26); sp(g, 0);
      g.fillStyle = '#fff'; g.font = `500 ${H * 0.11}px ${SERIF}`; g.fillText(s && s.src ? s.src.title : F.short || F.title, tx, H * 0.43);
      const st = !s ? '' : s.state === 'pending' ? t('show.pending', { time: fmt(shows.countdown(it.id) - 10) }) : s.state === 'playing' || s.state === 'countdown' ? t('show.playing') : t('panel9.book');
      g.font = `500 ${H * 0.065}px ${SANS}`; g.fillStyle = s && (s.state === 'playing' || s.state === 'countdown') ? '#ff6a5a' : s && s.state === 'pending' ? '#ffcf7a' : 'rgba(255,255,255,.65)'; g.fillText(st, tx, H * 0.58);
      g.fillStyle = 'rgba(255,255,255,.55)'; g.font = `400 ${H * 0.055}px ${SANS}`; g.fillText(t('fmt9.' + it.id), tx, H * 0.7); }
    tex.needsUpdate = true;
  };
}
// the showtimes board: one line per screen
export function showtimes(P, shows, t, fmt) {
  if (!P) return () => {}; const { g, canvas: c, tex } = P, W = c.width, H = c.height; let last = 0;
  return (now) => {
    if (now - last < 1000) return; last = now; g.fillStyle = '#08080b'; g.fillRect(0, 0, W, H); const rowH = H / 4.6;
    g.fillStyle = '#e3b25f'; g.font = `600 ${rowH * 0.42}px ${SANS}`; g.textBaseline = 'middle'; g.textAlign = 'left'; sp(g, rowH * 0.1); g.fillText(t('panel9.showtimes').toUpperCase(), W * 0.02, rowH * 0.45); sp(g, 0);
    HALL_IDS.forEach((id, i) => { const s = shows.get(id), y = rowH * (1.2 + i * 0.85), F = filmById(s && s.src && s.src.kind === 'film' ? s.src.filmId : FEAT[id]);
      g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(W * 0.02, y - rowH * 0.36, W * 0.96, rowH * 0.72);
      g.fillStyle = '#fff'; g.font = `600 ${rowH * 0.38}px ${SANS}`; g.fillText(HALL[id].name.replace('LUMIERE ', ''), W * 0.035, y);
      g.font = `400 ${rowH * 0.38}px ${SANS}`; g.fillStyle = 'rgba(255,255,255,.85)'; g.fillText(s && s.src ? s.src.title : F.title, W * 0.2, y);
      const st = s && s.state === 'pending' ? fmt(shows.countdown(id) - 10) : s && (s.state === 'playing' || s.state === 'countdown') ? t('show.playing') : t('panel9.book');
      g.textAlign = 'right'; g.fillStyle = s && s.state === 'pending' ? '#ffcf7a' : 'rgba(227,178,95,.9)'; g.fillText(st, W * 0.965, y); g.textAlign = 'left'; });
    tex.needsUpdate = true;
  };
}
// v12 the marquee's front board: what each screen plays tonight; once you hold a ticket, your film on the top row and the rest under it
export function attraction(P, shows) {
  if (!P) return { update() {}, own() {} }; let mine = '', sig = '', last = 0;
  const title = (id) => { const s = shows.get(id), f = filmById(s && s.src && s.src.kind === 'film' ? s.src.filmId : FEAT[id]); return String(s && s.src ? s.src.title : f ? f.short || f.title : '').toUpperCase(); };
  return {
    update(now) {
      if (now - last < 2000) return; last = now; const ts = HALL_IDS.map(title), k = mine + '|' + ts.join('|'); if (k === sig) return; sig = k;
      readerBoard(P.g, P.canvas.width, P.canvas.height, mine ? [mine.toUpperCase(), 'ALSO TONIGHT · ' + ts.filter((x) => x !== mine.toUpperCase()).slice(0, 3).join(' · ')] : [ts.join(' · '), 'MAX · CURVE · CLASSIC · 270']); P.tex.needsUpdate = true;
    },
    own(t) { mine = String(t || '').replace(/·/g, '-').slice(0, 60); last = 0; },
  };
}
// the menu boards (drawn once; the prices are the bill's)
export function menuBoard(P, t, fmt, prices) {
  if (!P) return; const { g, canvas: c, tex } = P, W = c.width, H = c.height; g.fillStyle = '#0a0809'; g.fillRect(0, 0, W, H);
  const cols = [['cat.popcorn', [['food.salted', prices.salted], ['food.caramel', prices.caramel], ['food.cheese', prices.cheese]]], ['cat.cold', [['food.cola', prices.cola], ['food.lemonade', prices.lemonade], ['food.shake', prices.shake]]], ['cat.hot', [['food.nachos', prices.nachos], ['food.hotdog', prices.hotdog], ['food.combo', prices.combo]]]];   // v14b the menu (menu.js)
  // v14b one size for every line (each long name used to shrink on its own, so the columns read in three sizes)
  const cw = W / cols.length, base = H * 0.13; g.font = `500 ${base}px ${SANS}`; let fit = 1;
  for (const [, items] of cols) for (const [lab, p] of items) fit = Math.min(fit, (cw * 0.78 - g.measureText(fmt(p)).width) / Math.max(1, g.measureText(t(lab)).width));
  const fs = Math.max(H * 0.07, base * Math.min(1, fit));
  cols.forEach(([title, items], k) => { const x = k * cw + cw * 0.08; g.fillStyle = '#e3b25f'; g.font = `600 ${H * 0.16}px ${SANS}`; g.textAlign = 'left'; g.textBaseline = 'middle'; sp(g, H * 0.03); g.fillText(t(title).toUpperCase(), x, H * 0.17); sp(g, 0);
    items.forEach(([lab, p], i) => { const y = H * (0.42 + i * 0.2); g.fillStyle = '#f2ebdd'; g.font = `500 ${fs}px ${SANS}`; g.textAlign = 'left'; g.fillText(t(lab), x, y); g.textAlign = 'right'; g.fillStyle = 'rgba(242,235,221,.8)'; g.fillText(fmt(p), (k + 1) * cw - cw * 0.08, y); });
    if (k) { g.fillStyle = 'rgba(227,178,95,.25)'; g.fillRect(k * cw, H * 0.1, 2, H * 0.8); } });
  tex.needsUpdate = true;
}
