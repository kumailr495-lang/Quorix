// LUMIERE v5 - every visible word, in English, Español, हिन्दी and اردو (Urdu is right-to-left).
// t(key, vars) for one string, lines(key) for a list (barks, chats). Missing keys fall back to English.
import { EN } from './lang/en.js';
import { ES } from './lang/es.js';
import { HI } from './lang/hi.js';
import { UR } from './lang/ur.js';
export const LANGS = [{ code: 'en', name: 'English' }, { code: 'hi', name: 'हिन्दी' }, { code: 'ur', name: 'اردو' }, { code: 'es', name: 'Español' }];
const TABLE = { en: EN, es: ES, hi: HI, ur: UR };
let cur = 'en';
export const lang = () => cur;
export const isRTL = () => cur === 'ur';
export function setLang(code) {
  cur = TABLE[code] ? code : 'en'; const d = document.documentElement; d.lang = cur; d.dir = isRTL() ? 'rtl' : 'ltr';
  for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
  for (const el of document.querySelectorAll('[data-i18n-aria]')) el.setAttribute('aria-label', t(el.dataset.i18nAria));
  for (const el of document.querySelectorAll('[data-i18n-ph]')) el.setAttribute('placeholder', t(el.dataset.i18nPh));
}
export function t(key, vars) {
  let s = TABLE[cur][key]; if (s === undefined) s = EN[key]; if (s === undefined) return key; if (Array.isArray(s)) s = s[Math.floor(Math.random() * s.length)];
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m)); return s;
}
export function lines(key) { const s = TABLE[cur][key] ?? EN[key]; return Array.isArray(s) ? s : s ? [s] : []; }
export const pickLine = (key, vars) => { const a = lines(key); if (!a.length) return ''; let s = a[Math.floor(Math.random() * a.length)]; if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m)); return s; };
// numbers and clock text stay Western digits everywhere (they read fine in all four languages)
export const fmtTime = (sec) => { const s = Math.max(0, Math.ceil(sec)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
