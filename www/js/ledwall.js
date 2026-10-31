// LUMIERE v5 - the LED video wall over the way to the screens: a slow marquee of what is on (posters, titles, screen, live status).
// v8: the real films' posters; an idle screen advertises its featured film.
import { SANS } from './textures.js';
import { filmById, FEATURED, posterURL } from './films.js';
export function makeLedWall(wall, shows, t, fmt) {
  const c = wall.canvas, g = c.getContext('2d'), W = c.width, H = c.height, posters = {};
  for (const id of Object.values(FEATURED).concat(['hero', 'wingit', 'agent327', 'llamigos', 'glasshalf', 'coffeerun'])) { const im = new Image(); im.src = posterURL(id); posters[id] = im; }
  const items = [{ hall: 'I' }, { hall: 'II' }, { hall: 'III' }, { logo: true }], seg = 520;
  let last = 0;
  return function draw(now) {
    if (now - last < 90) return; last = now;
    const bg = g.createLinearGradient(0, 0, W, 0); bg.addColorStop(0, '#0d0d14'); bg.addColorStop(1, '#151020'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
    const off = (now * 0.035) % (seg * items.length);
    for (let k = -1; k < 3; k++) for (let i = 0; i < items.length; i++) { const x = i * seg - off + k * seg * items.length; if (x > W || x + seg < 0) continue; const it = items[i];
      if (it.logo) { g.fillStyle = '#fff'; g.font = `500 ${H * 0.34}px ${SANS}`; g.textBaseline = 'middle'; g.textAlign = 'center'; if ('letterSpacing' in g) g.letterSpacing = `${H * 0.08}px`; g.fillText('LUMIÈRE', x + seg / 2, H * 0.46); g.fillStyle = '#ff4d5a'; g.fillRect(x + seg / 2 - 60, H * 0.72, 120, 4); if ('letterSpacing' in g) g.letterSpacing = '0px'; continue; }
      const s = shows.get(it.hall), fid = s.state !== 'idle' && s.src === 'film' ? s.filmId : FEATURED[it.hall], F = filmById(fid), pi = posters[fid];
      if (pi && pi.complete && pi.naturalWidth) g.drawImage(pi, x + 24, 8, 96, 144); g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillStyle = '#fff'; g.font = `500 ${H * 0.2}px ${SANS}`; g.fillText(s.state !== 'idle' ? shows.title(it.hall) : (F.short || F.title), x + 138, H * 0.4);
      const status = s.state === 'pending' ? t('show.pending', { time: fmt(shows.countdown(it.hall)) }) : s.state === 'playing' || s.state === 'dimming' || s.state === 'preshow' ? t('show.playing') : t('show.idle');
      g.font = `400 ${H * 0.13}px ${SANS}`; g.fillStyle = 'rgba(255,255,255,.72)'; g.fillText(`${['SCREEN 1', 'SCREEN 2', 'SCREEN 3'][['I', 'II', 'III'].indexOf(it.hall)]} · ${t('genre.' + F.genre)}`, x + 138, H * 0.62);
      g.fillStyle = s.state === 'pending' ? '#ffb547' : s.state === 'playing' || s.state === 'dimming' ? '#ff4d5a' : 'rgba(255,255,255,.5)'; g.font = `500 ${H * 0.13}px ${SANS}`; g.fillText(status, x + 138, H * 0.82); }
    wall.texture.needsUpdate = true;
  };
}
