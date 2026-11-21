// LUMIERE v11 - the Android wrapper's native bridge (tools/android MainActivity.java, class Media), with its per-launch key.
// The wrapper makes window.LumiereMedia visible to every frame in the page, a video site's embed included, so each of its methods
// wants a key that only the game's own page is given: the wrapper opens index.html with #k=<32 hex digits>. This module reads the key
// once, takes it out of the address (sessionStorage keeps it for this tab), and hands out `media`: the same methods with the key added.
// In a browser, or in an older wrapper with no bridge, `media` is null and the game uses the browser's own file picker and links.
const N = typeof window !== 'undefined' ? window.LumiereMedia : null;
let K = '';
try {
  const m = /[#&]k=([0-9a-f]{32})\b/.exec(location.hash);
  if (m) { K = m[1]; sessionStorage.setItem('lumiere.k', K); history.replaceState(history.state, '', location.pathname + location.search); }
  else K = sessionStorage.getItem('lumiere.k') || '';
} catch (e) { /* no storage: the key lives only in this module */ }
const NAMES = ['hasPermission', 'requestPermission', 'base', 'proxyBase', 'serverError', 'list', 'frameUrl', 'codecs', 'info', 'vibrate', 'stopVibrate', 'download', 'cancelDownload', 'downloaded', 'removeDownload'];
export const media = N ? Object.fromEntries(NAMES.filter((n) => typeof N[n] === 'function').map((n) => [n, (...a) => N[n](K, ...a)])) : null;
