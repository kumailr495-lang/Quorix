// LUMIERE v5 - player settings, saved on the device (localStorage may be unavailable: then they just last for the session).
const KEY = 'lumiere.settings.v5';
export const DEFAULTS = { lang: null, graphics: 'medium', autoRes: true, sensitivity: 1.0, invertY: false, brightness: 1.0, master: 0.9, film: 1.0, crowd: 0.85, showFps: false, bubbles: true };
export function loadSettings() {
  let s = {}; try { s = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { s = {}; }
  const out = { ...DEFAULTS, ...s };
  if (!s.graphics) { const mem = navigator.deviceMemory || 4, cores = navigator.hardwareConcurrency || 4; out.graphics = mem <= 3 || cores <= 4 ? 'low' : 'medium'; }   // first launch: guess from the device (High only when chosen)
  return out;
}
export function saveSettings(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }
