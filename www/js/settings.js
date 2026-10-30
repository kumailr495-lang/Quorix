// LUMIERE v8 - player settings, saved on the device (localStorage may be unavailable: then they just last for the session).
// v8 adds the switches the phone feedback asked for (baked shadows, reflections, LOD distance, render distance, NPC count, voices,
// subtitles, controls layout) and picks them from the device on the first v8 launch: the GPU name (WebGL), memory and cores decide a tier.
const KEY = 'lumiere.settings.v5';
export const DEFAULTS = { lang: null, graphics: 'medium', autoRes: true, sensitivity: 1.0, invertY: false, brightness: 1.0, master: 0.9, film: 1.0, crowd: 0.85, showFps: false, bubbles: true,
  shadows: 'on', reflections: 'soft', lod: 'normal', viewDist: 'medium', npcs: 'normal', voices: true, subtitles: true, lefty: false, hudScale: 1, layout: null,
  skipSeen: true, tutorialDone: false, tutorialAsked: false, seen: {}, deviceNote: '' };
// GPU tiers (WebGL renderer string). Mali-G57 MP1 (the user's itel P65) is "mid": medium preset with the per-pixel extras off.
export function deviceTier() {
  let gpu = ''; try { const c = document.createElement('canvas'), gl = c.getContext('webgl2') || c.getContext('webgl'); const ext = gl && gl.getExtension('WEBGL_debug_renderer_info'); gpu = gl ? String(gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER) || '') : ''; const lose = gl && gl.getExtension('WEBGL_lose_context'); lose && lose.loseContext(); } catch (e) {}
  const mem = navigator.deviceMemory || 4, cores = navigator.hardwareConcurrency || 4, g = gpu.toLowerCase(); let tier = 'mid';
  if (/adreno.{0,6}(6[4-9]\d|7\d\d|8\d\d)|mali-g(7[1-9]|7\d\d|6[1-9]\d|9\d\d)|immortalis|apple|nvidia|geforce|radeon|intel|angle \((nvidia|amd|intel)/.test(g)) tier = 'high';
  else if (/adreno.{0,6}([3-5]\d\d)|mali-(4\d\d|t\d+|g31|g51|g52)|powervr|ge83|sgx/.test(g)) tier = 'low';
  if (mem <= 3 || cores <= 4) tier = tier === 'high' ? 'mid' : 'low';
  return { tier, gpu, mem, cores };
}
const TIER_SET = {
  low: { graphics: 'low', shadows: 'off', reflections: 'off', lod: 'aggressive', viewDist: 'near', npcs: 'few' },
  mid: { graphics: 'medium', shadows: 'on', reflections: 'off', lod: 'aggressive', viewDist: 'medium', npcs: 'normal' },
  high: { graphics: 'high', shadows: 'on', reflections: 'soft', lod: 'normal', viewDist: 'far', npcs: 'many' },
};
export function loadSettings() {
  let s = {}; try { s = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { s = {}; }
  const out = { ...DEFAULTS, ...s };
  if (!s.v8) { const d = deviceTier(); Object.assign(out, TIER_SET[d.tier]); out.v8 = true; out.deviceNote = `${d.gpu || 'GPU ?'} · ${d.mem} GB · ${d.cores} cores · ${d.tier}`; out.seen = s.seen || {}; }   // first v8 launch: defaults from the device
  return out;
}
export function presetFor(graphics) { return graphics === 'low' ? TIER_SET.low : graphics === 'high' ? TIER_SET.high : TIER_SET.mid; }
export function saveSettings(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }
