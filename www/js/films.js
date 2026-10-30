// LUMIERE v8 - what the cinema shows: Blender Studio's open movies (Creative Commons, credited), streamed from the Internet Archive at their
// full resolution, plus your own videos. v8 removes the three drawn "house films" (Velvet Hour, The Long Night, A Quiet Room): phone feedback,
// "the Velvet or whatever movies are still available as cards".
// Each film has a track made offline from the real film (tools/films/analyse.py -> www/films/<id>.json):
//   light: the screen's colour every 1/4 s in three bands (left, centre, right), so the room is lit by what is really on screen;
//   cues:  moments the audience reacts to (laugh, gasp, scare, tension, climax, aww, end), placed on the film's own sound and picture.
// The picture itself never enters WebGL (archive.org sends no CORS headers): videolayer.js shows it through a hole in the screen.
import * as THREE from 'three';
import { makeCanvas, SANS } from './textures.js';
const IA = 'https://archive.org/download/';
export const CATALOG = [
  { id: 'sintel', title: 'Sintel', year: 2010, mins: 15, genre: 'fantasy', url: IA + 'Sintel_201809/Sintel.MP4', by: 'Blender Foundation', lic: 'CC BY 3.0', tag: 'A girl. A dragon. A long way home.' },
  { id: 'cosmos', title: 'Cosmos Laundromat', year: 2015, mins: 12, genre: 'drama', url: IA + 'CosmosLaundromatFirstCycle/Cosmos%20Laundromat%20-%20First%20Cycle%20(1080p).mp4', by: 'Blender Institute', lic: 'CC BY 4.0', tag: 'One sheep. Infinite lives.' },
  { id: 'bunny', title: 'Big Buck Bunny', year: 2008, mins: 10, genre: 'comedy', url: IA + 'big-buck-bunny-720p-h264_202403/big%20buck%20bunny%20720p%20h264.mp4', by: 'Blender Foundation', lic: 'CC BY 3.0', tag: 'Payback has never been this fluffy.' },
  { id: 'hero', title: 'Hero', year: 2018, mins: 4, genre: 'action', url: IA + 'hero_20260106/hero.mp4', by: 'Blender Animation Studio', lic: 'CC BY 4.0', tag: 'Two rivals. One last stand.' },
  { id: 'wingit', title: 'Wing It!', year: 2023, mins: 4, genre: 'comedy', url: IA + 'wing_it/wing_it.mp4', by: 'Blender Studio', lic: 'CC BY 4.0', tag: 'A dog. A rocket. No plan.' },
  { id: 'agent327', title: 'Agent 327: Operation Barbershop', short: 'Agent 327', year: 2017, mins: 4, genre: 'action', url: IA + 'agent327operationbarbershop/agent327-1080.mp4', by: 'Blender Animation Studio', lic: 'CC BY', tag: 'Licensed to trim.' },
  { id: 'llamigos', title: 'Caminandes: Llamigos', short: 'Llamigos', year: 2016, mins: 3, genre: 'comedy', url: IA + 'CaminandesLlamigos/Caminandes_%20Llamigos-1080p.mp4', by: 'Blender Institute', lic: 'CC BY 3.0', tag: 'Winter is hungry.' },
  { id: 'glasshalf', title: 'Glass Half', year: 2015, mins: 3, genre: 'comedy', url: IA + 'GlassHalf1080p/Glass%20Half-1080p.mp4', by: 'Blender Institute', lic: 'CC BY', tag: 'Art is in the eye of the beholder.' },
  { id: 'coffeerun', title: 'Coffee Run', year: 2020, mins: 3, genre: 'drama', url: IA + 'coffee-run/Coffee%20Run.mp4', by: 'Blender Studio', lic: 'CC BY 4.0', tag: 'Fuelled by caffeine. Running from the past.' },
];
export const filmById = (id) => CATALOG.find((f) => f.id === id) || null;
// what the lobby screens and posters advertise for each hall when nothing is booked
export const FEATURED = { I: 'cosmos', II: 'sintel', III: 'bunny' };
export const posterURL = (id) => `films/${id}.jpg`;
// film tracks load on demand (a few KB each) and are cached
const TRACKS = {};
export function loadTrack(id) {
  if (!TRACKS[id]) TRACKS[id] = fetch(`films/${id}.json`).then((r) => (r.ok ? r.json() : null)).then((j) => j && decodeTrack(j)).catch(() => null);
  return TRACKS[id];
}
// light: base64 bytes, 9 per sample (rgb x left/centre/right, sRGB 0..255) at j.hz samples per second
function decodeTrack(j) {
  const bin = atob(j.light || ''), n = Math.floor(bin.length / 9), L = new Float32Array(n * 9), s2l = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  for (let i = 0; i < n * 9; i++) L[i] = s2l(bin.charCodeAt(i));
  return { hz: j.hz || 4, n, L, cues: (j.cues || []).slice().sort((a, b) => a.t - b.t), end: j.end || 0, aspect: j.aspect || 16 / 9, crop: j.crop || null };
}
// screen colour at film time t (seconds): the three bands (left, centre, right) and their light-weighted average, blended between samples
export function lightAt(tr, t, out) {
  const f = Math.max(0, Math.min(tr.n - 1.001, t * tr.hz)), i = Math.floor(f), k = f - i, L = tr.L, a = i * 9, b = Math.min(tr.n - 1, i + 1) * 9;
  for (let q = 0; q < 9; q++) out.band[q] = L[a + q] + (L[b + q] - L[a + q]) * k;
  const B = out.band; out.avg.r = (B[0] + B[3] * 2 + B[6]) / 4; out.avg.g = (B[1] + B[4] * 2 + B[7]) / 4; out.avg.b = (B[2] + B[5] * 2 + B[8]) / 4;
  out.avg.lum = 0.2126 * out.avg.r + 0.7152 * out.avg.g + 0.0722 * out.avg.b; return out;
}
// pre-show slide (pending shows): "please silence your phone", countdown
export function makePreshow(aspect = 1.85) {
  const w = 512, h = Math.round(512 / aspect), c = makeCanvas(w, h), g = c.getContext('2d', { alpha: false }), tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false;
  const draw = (title, secs, lines) => { const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#16141e'); gr.addColorStop(1, '#0a0a0f'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ff4d5a'; g.fillRect(w * 0.08, h * 0.2, 4, h * 0.5); g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillStyle = '#fff'; g.font = `600 ${Math.round(h * 0.09)}px ${SANS}`; g.fillText(title, w * 0.11, h * 0.34);
    g.font = `400 ${Math.round(h * 0.05)}px ${SANS}`; g.fillStyle = 'rgba(255,255,255,.75)'; (lines || []).forEach((l, i) => g.fillText(l, w * 0.11, h * (0.47 + i * 0.08)));
    if (secs != null) { g.textAlign = 'right'; g.font = `600 ${Math.round(h * 0.14)}px ${SANS}`; g.fillStyle = '#fff'; const m = Math.floor(secs / 60), s = Math.floor(secs % 60); g.fillText(`${m}:${String(s).padStart(2, '0')}`, w * 0.92, h * 0.86); }
    tex.needsUpdate = true; };
  // the opening cards before every film (v5's "LUMIÈRE PRESENTS", which you liked): a centred title fading in and out on black
  const card = (text, sub, a, big = 0.1) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); g.globalAlpha = Math.max(0, Math.min(1, a)); g.fillStyle = '#f4efe6'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `600 ${Math.round(h * big)}px ${SANS}`; if ('letterSpacing' in g) g.letterSpacing = `${Math.round(h * big * 0.12)}px`; g.fillText(text, w / 2, h * 0.48);
    if (sub) { g.font = `500 ${Math.round(h * 0.035)}px ${SANS}`; if ('letterSpacing' in g) g.letterSpacing = `${Math.round(h * 0.012)}px`; g.fillStyle = 'rgba(244,239,230,.7)'; g.fillText(sub, w / 2, h * 0.58); } if ('letterSpacing' in g) g.letterSpacing = '0px'; g.globalAlpha = 1; tex.needsUpdate = true; };
  return { tex, draw, card, aspect: w / h };
}
// clean title from a video file name: "BrahmÄ_stra.Part.One.Shiva.2022.1080p.WEB-DL.x264" -> "Brahmāstra Part One Shiva (2022)"
// (Android hands some names over as UTF-8 bytes read as Latin-1; the round trip below repairs them when it can)
export function cleanTitle(name) {
  let s = String(name || '').replace(/\.[a-z0-9]{2,4}$/i, '');
  try { const fixed = decodeURIComponent(escape(s)); if (fixed && fixed !== s && !/�/.test(fixed)) s = fixed; } catch (e) {}
  s = s.replace(/[\u0080-\u009f]/g, '').replace(/[._]+/g, ' ');
  const year = (s.match(/\b(19[2-9]\d|20[0-4]\d)\b/) || [])[1];
  s = s.replace(/\b(19[2-9]\d|20[0-4]\d)\b.*$/, '').replace(/\b(480p|720p|1080p|2160p|4k|uhd|hdr|web[- ]?dl|webrip|bluray|brrip|hdrip|x26[45]|h ?26[45]|hevc|aac|ddp?5 ?1|10bit|yts|rarbg)\b.*$/i, '');
  s = s.replace(/[\[\(\{][^\]\)\}]*[\]\)\}]/g, ' ').replace(/[-\s]+$/, '').replace(/\s{2,}/g, ' ').trim();
  if (!s) s = String(name || 'Video');
  return (s.length > 48 ? s.slice(0, 47) + '…' : s) + (year ? ` (${year})` : '');
}
