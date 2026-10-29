// LUMIERE v5 - the film-event director: decides WHEN an audience reacts, so reactions follow the film instead of random timers.
//  * house films: their authored cue tracks (films.js)
//  * your own video: live analysis of its sound (and picture brightness): a sudden loud hit after a quiet stretch = jump scare,
//    a long loud passage that releases = climax, a sharp onset = gasp. Cool-downs keep it from firing every second.
export class Director {
  constructor(onEvent) { this.onEvent = onEvent; this.tracks = {}; this.live = null; }
  startHouse(hallId, film, now) { this.tracks[hallId] = { cues: film.cues.slice().sort((a, b) => a.t - b.t), i: 0, t0: now }; }
  startLive(hallId, now) { this.live = { hall: hallId, short: -90, long: -60, loudFor: 0, quietFor: 0, lastScare: now, lastGasp: now, lastClimax: now, peakRun: 0, lum: 0, lumT: now, t0: now }; }
  stop(hallId) { delete this.tracks[hallId]; if (this.live && this.live.hall === hallId) this.live = null; }
  // level(): current film loudness in dBFS; lum: picture brightness 0..1 (spill sampler)
  update(dt, now, level, lum) {
    for (const id in this.tracks) { const tr = this.tracks[id], k = (now - tr.t0) / 1000; while (tr.i < tr.cues.length && tr.cues[tr.i].t <= k) { const c = tr.cues[tr.i++]; this.onEvent(id, { type: c.type, k: c.k, sfx: c.sfx, t: k }); } }
    const L = this.live; if (!L || level == null) return;
    const db = Math.max(-90, level), aS = 1 - Math.exp(-dt / 0.12), aL = 1 - Math.exp(-dt / 5);
    const prevShort = L.short; L.short += (db - L.short) * aS; L.long += (db - L.long) * aL; const jump = L.short - L.long, t = (now - L.t0) / 1000;
    if (t < 3) return;   // let the levels settle
    if (L.short < -34) L.quietFor += dt; else L.quietFor = Math.max(0, L.quietFor - dt * 0.5);
    const flash = lum - L.lum > 0.28 && now - L.lumT < 700; if (now - L.lumT > 400) { L.lum = lum; L.lumT = now; }
    // jump scare: loud onset straight out of quiet (or a loud hit with a white flash)
    if (jump > 13 && L.short > -24 && (L.quietFor > 1.2 || flash) && now - L.lastScare > 18000) { L.lastScare = now; L.lastGasp = now; this.onEvent(L.hall, { type: 'scare', k: Math.min(1, 0.55 + (jump - 13) / 14 + (flash ? 0.2 : 0)), t }); }
    else if (jump > 8 && L.short > -28 && now - L.lastGasp > 9000 && L.short - prevShort > 1.5) { L.lastGasp = now; this.onEvent(L.hall, { type: 'gasp', k: Math.min(1, 0.4 + (jump - 8) / 12), t }); }
    // climax: a long loud stretch that then drops away
    if (L.short > Math.max(-20, L.long - 1)) L.loudFor += dt; else { if (L.loudFor > 7 && L.short < L.long - 5 && now - L.lastClimax > 40000) { L.lastClimax = now; this.onEvent(L.hall, { type: 'climax', k: Math.min(1, 0.5 + L.loudFor / 30), t }); } L.loudFor = Math.max(0, L.loudFor - dt * 2); }
    if (L.loudFor > 5 && L.loudFor - dt <= 5) this.onEvent(L.hall, { type: 'tension', k: 0.6, t });
  }
}
