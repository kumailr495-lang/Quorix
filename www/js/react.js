// LUMIERE v5 - the film-event director: decides WHEN an audience reacts, so reactions follow the film instead of random timers.
//  * the open films: their offline cue tracks (films.js, tools/films/analyse.py), timed on the video's own clock (buffering and seeking safe)
//  * your own video: live analysis of its sound (and picture brightness): a sudden loud hit after a quiet stretch = jump scare,
//    a long loud passage that releases = climax, a sharp onset = gasp. Cool-downs keep it from firing every second.
export class Director {
  constructor(onEvent) { this.onEvent = onEvent; this.tracks = {}; this.live = null; }
  startTrack(hallId, cues, clock) { const tr = { cues: cues.filter((c) => c.type !== 'end'), i: 0, clock }; this.tracks[hallId] = tr; this.seek(hallId); }
  seek(hallId) { const tr = this.tracks[hallId]; if (!tr) return; const k = tr.clock(); tr.i = 0; while (tr.i < tr.cues.length && tr.cues[tr.i].t <= k) tr.i++; }   // after a jump nobody reacts to what was skipped
  startLive(hallId, now) { this.live = { hall: hallId, short: -90, long: -60, loudFor: 0, quietFor: 0, loudFrom: -90, lastScare: -1e9, lastGasp: -1e9, lastClimax: -1e9, lum: 0, lumT: now, t0: now }; }   // the first 3 s settle the meters; cool-downs start open
  stop(hallId) { delete this.tracks[hallId]; if (this.live && this.live.hall === hallId) this.live = null; }
  // level(): current film loudness in dBFS; lum: picture brightness 0..1 (spill sampler)
  update(dt, now, level, lum) {
    for (const id in this.tracks) { const tr = this.tracks[id], k = tr.clock(); while (tr.i < tr.cues.length && tr.cues[tr.i].t <= k) { const c = tr.cues[tr.i++]; if (k - c.t < 2) this.onEvent(id, { type: c.type, k: c.k, t: k }); } }
    const L = this.live; if (!L || level == null) return;
    const db = Math.max(-90, level); if (!L.primed) { L.primed = true; L.short = L.mid = L.long = db; }   // meters start at the film's own level, not at silence
    const aS = 1 - Math.exp(-dt / 0.12), aL = 1 - Math.exp(-dt / 5);
    L.short += (db - L.short) * aS; L.mid += (db - L.mid) * (1 - Math.exp(-dt / 1)); L.long += (db - L.long) * aL; const jump = L.short - L.long, t = (now - L.t0) / 1000;
    if (t < 3) return;   // let the levels settle
    if (L.short < -34) L.quietFor += dt; else L.quietFor = Math.max(0, L.quietFor - dt * 0.5);
    const flash = lum - L.lum > 0.28 && now - L.lumT < 700; if (now - L.lumT > 400) { L.lum = lum; L.lumT = now; }
    // jump scare: loud onset straight out of quiet (or a loud hit with a white flash)
    if (jump > 13 && L.short > -24 && (L.quietFor > 1.2 || flash) && now - L.lastScare > 18000) { L.lastScare = now; L.lastGasp = now; L.gasp = null; this.onEvent(L.hall, { type: 'scare', k: Math.min(1, 0.55 + (jump - 13) / 14 + (flash ? 0.2 : 0)), t }); }
    else if (jump > 8 && L.short > -28 && now - L.lastGasp > 9000 && L.short - L.mid > 5) { L.lastGasp = now; L.gasp = { at: now, k: Math.min(1, 0.4 + (jump - 8) / 12), t }; }
    if (L.gasp && now - L.gasp.at > 250) { this.onEvent(L.hall, { type: 'gasp', k: L.gasp.k, t: L.gasp.t }); L.gasp = null; }   // held 1/4 s: if the onset grows into a scare, only the scare plays
    // climax: a long loud stretch that then drops away
    const was = L.loudFor;
    if (L.short > Math.max(-20, L.long - 1)) { if (was === 0) L.loudFrom = L.long; L.loudFor += dt; } else { if (L.loudFor > 7 && L.short < L.long - 5 && now - L.lastClimax > 40000) { L.lastClimax = now; this.onEvent(L.hall, { type: 'climax', k: Math.min(1, 0.5 + L.loudFor / 30), t }); } L.loudFor = Math.max(0, L.loudFor - dt * 2); }
    // tension: the film has been building for 5 s from clearly quieter than this (steady loud music is not suspense)
    if (was <= 5 && L.loudFor > 5 && L.short - L.loudFrom > 8) this.onEvent(L.hall, { type: 'tension', k: 0.6, t });
  }
}
