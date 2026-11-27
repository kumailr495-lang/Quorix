// LUMIERE v14d - a song's own words and picture (the user, 11-27: "when I play songs it does not show custom UI for them with them having
// their own pics (if they have one)"). Reads the title, artist, album and the embedded cover from a file the player picked: ID3v2 (MP3 and
// ADTS AAC), MP4 / M4A ('ilst' in 'moov'), FLAC (Vorbis comment and PICTURE blocks). The picture comes back as a blob: URL of the
// file's own bytes, so it shows on the big screen and the Now Playing card. Songs from the phone's library come with their cover from the
// app (MainActivity /c/). Anything unreadable gives an empty result; nothing here throws.
const dec = (bytes, enc) => {
  try {
    if (enc === 1 || enc === 2) { let le = enc === 1; let i = 0; if (enc === 1 && bytes.length >= 2) { if (bytes[0] === 0xff && bytes[1] === 0xfe) { le = true; i = 2; } else if (bytes[0] === 0xfe && bytes[1] === 0xff) { le = false; i = 2; } }
      return new TextDecoder(le ? 'utf-16le' : 'utf-16be').decode(bytes.subarray(i)).replace(/\0+$/, ''); }
    return new TextDecoder(enc === 3 ? 'utf-8' : 'latin1').decode(bytes).replace(/\0+$/, '');
  } catch (e) { return ''; }
};
const clean = (s) => String(s || '').replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120);
const img = (bytes, mime) => { try { if (!bytes || bytes.length < 64 || bytes.length > 4e6) return null; const m = /png/i.test(mime) || (bytes[0] === 0x89 && bytes[1] === 0x50) ? 'image/png' : 'image/jpeg'; return URL.createObjectURL(new Blob([bytes], { type: m })); } catch (e) { return null; } };

function id3(b) {
  const out = {}; if (b.length < 10 || b[0] !== 0x49 || b[1] !== 0x44 || b[2] !== 0x33) return null;
  const v = b[3], size = ((b[6] & 127) << 21) | ((b[7] & 127) << 14) | ((b[8] & 127) << 7) | (b[9] & 127); let p = 10; const end = Math.min(b.length, 10 + size);
  if (b[5] & 0x40 && v >= 3) { const ex = v === 4 ? ((b[10] & 127) << 21) | ((b[11] & 127) << 14) | ((b[12] & 127) << 7) | (b[13] & 127) : ((b[10] << 24) | (b[11] << 16) | (b[12] << 8) | b[13]) + 4; p += ex; }
  while (p + (v === 2 ? 6 : 10) <= end) {
    let id, fs; if (v === 2) { id = String.fromCharCode(b[p], b[p + 1], b[p + 2]); fs = (b[p + 3] << 16) | (b[p + 4] << 8) | b[p + 5]; p += 6; }
    else { id = String.fromCharCode(b[p], b[p + 1], b[p + 2], b[p + 3]); fs = v === 4 ? ((b[p + 4] & 127) << 21) | ((b[p + 5] & 127) << 14) | ((b[p + 6] & 127) << 7) | (b[p + 7] & 127) : (b[p + 4] << 24) | (b[p + 5] << 16) | (b[p + 6] << 8) | b[p + 7]; p += 10; }
    if (!/^[A-Z0-9]{3,4}$/.test(id) || fs <= 0 || p + fs > end) break;
    const f = b.subarray(p, p + fs); p += fs;
    if (id === 'TIT2' || id === 'TT2') out.title = clean(dec(f.subarray(1), f[0]));
    else if (id === 'TPE1' || id === 'TP1') out.artist = clean(dec(f.subarray(1), f[0]));
    else if (id === 'TALB' || id === 'TAL') out.album = clean(dec(f.subarray(1), f[0]));
    else if ((id === 'APIC' || id === 'PIC') && !out.art) {
      const enc = f[0]; let q = 1, mime = '';
      if (id === 'PIC') { mime = 'image/' + String.fromCharCode(f[1], f[2], f[3]).toLowerCase(); q = 4; } else { while (q < f.length && f[q]) q++; mime = dec(f.subarray(1, q), 0); q++; }
      q++;   /* the picture type */
      if (enc === 1 || enc === 2) { while (q + 1 < f.length && (f[q] || f[q + 1])) q += 2; q += 2; } else { while (q < f.length && f[q]) q++; q++; }
      out.art = img(f.subarray(q), mime);
    }
  }
  return out;
}

function flac(b) {
  if (b.length < 8 || b[0] !== 0x66 || b[1] !== 0x4c || b[2] !== 0x61 || b[3] !== 0x43) return null; const out = {}; let p = 4;
  for (let n = 0; n < 64 && p + 4 <= b.length; n++) {
    const last = b[p] & 0x80, type = b[p] & 127, len = (b[p + 1] << 16) | (b[p + 2] << 8) | b[p + 3]; p += 4; if (p + len > b.length) break; const d = b.subarray(p, p + len); p += len;
    const u32le = (o) => d[o] | (d[o + 1] << 8) | (d[o + 2] << 16) | (d[o + 3] << 24), u32be = (o) => ((d[o] << 24) | (d[o + 1] << 16) | (d[o + 2] << 8) | d[o + 3]) >>> 0;
    if (type === 4) { let o = 4 + u32le(0); const k = u32le(o); o += 4; for (let i = 0; i < k && o + 4 <= d.length; i++) { const l = u32le(o); o += 4; const s = dec(d.subarray(o, o + l), 3); o += l; const e = s.indexOf('='); if (e < 0) continue; const key = s.slice(0, e).toUpperCase(), val = clean(s.slice(e + 1));
      if (key === 'TITLE') out.title = val; else if (key === 'ARTIST') out.artist = val; else if (key === 'ALBUM') out.album = val; } }
    else if (type === 6 && !out.art) { let o = 4; const ml = u32be(o); o += 4; const mime = dec(d.subarray(o, o + ml), 0); o += ml; const dl = u32be(o); o += 4 + dl + 16; const pl = u32be(o); o += 4; out.art = img(d.subarray(o, o + pl), mime); }
    if (last) break;
  }
  return out;
}

async function mp4(file) {
  const rd = async (a, n) => new Uint8Array(await file.slice(a, a + n).arrayBuffer()), u32 = (d, o) => ((d[o] << 24) | (d[o + 1] << 16) | (d[o + 2] << 8) | d[o + 3]) >>> 0, tag = (d, o) => String.fromCharCode(d[o], d[o + 1], d[o + 2], d[o + 3]);
  let p = 0, moov = null; for (let n = 0; n < 64 && p + 8 <= file.size; n++) { const h = await rd(p, 16); let sz = u32(h, 0); const ty = tag(h, 4); if (sz === 1) sz = u32(h, 12) + u32(h, 8) * 4294967296; if (sz < 8) break; if (ty === 'moov') { if (sz > 24e6) return null; moov = await rd(p, sz); break; } p += sz; }
  if (!moov) return null; const out = {};
  const walk = (d, a, b, depth) => { let o = a; while (o + 8 <= b) { const sz = u32(d, o), ty = tag(d, o + 4); if (sz < 8 || o + sz > b) break;
      if (ty === 'udta' || ty === 'ilst' || ty === 'trak') walk(d, o + 8, o + sz, depth + 1); else if (ty === 'meta') walk(d, o + 12, o + sz, depth + 1);
      else if (['©nam', '©ART', '©alb', 'covr'].includes(ty)) { const da = o + 8; if (tag(d, da + 4) === 'data') { const dl = u32(d, da), kind = u32(d, da + 8) & 0xffffff, body = d.subarray(da + 16, da + dl);
          if (ty === 'covr') { if (!out.art) out.art = img(body, kind === 14 ? 'image/png' : 'image/jpeg'); } else { const s = clean(dec(body, 3)); if (ty === '©nam') out.title = s; else if (ty === '©ART') out.artist = s; else out.album = s; } } }
      o += sz; } };
  walk(moov, 8, moov.length, 0); return out;
}

export const isSong = (file) => !!file && (/^audio\//.test(file.type || '') || /\.(mp3|m4a|aac|flac|ogg|oga|opus|wav|wma|amr)$/i.test(file.name || ''));
export async function readTags(file) {
  try {
    let head = new Uint8Array(await file.slice(0, Math.min(file.size, 3 * 1024 * 1024)).arrayBuffer());
    if (head[0] === 0x49 && head[1] === 0x44 && head[2] === 0x33) { const n = 10 + (((head[6] & 127) << 21) | ((head[7] & 127) << 14) | ((head[8] & 127) << 7) | (head[9] & 127)); if (n > head.length && n < 12e6) head = new Uint8Array(await file.slice(0, n).arrayBuffer()); }
    return id3(head) || flac(head) || (String.fromCharCode(head[4], head[5], head[6], head[7]) === 'ftyp' ? await mp4(file) : null) || {};
  } catch (e) { return {}; }
}
