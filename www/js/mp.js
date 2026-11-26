// LUMIERE v9.3 - playing together (the user: "multiplayer, hosting, a player selector, avatar editing; my API key must not leak; every
// player shares some of the load"). A room is a six-letter code. Trystero (MIT, www/vendor/trystero.mjs) finds the other phones through
// public Nostr relays, which only carry the WebRTC handshake; after that every phone talks straight to the others. There is no server of
// ours, no account and no key anywhere in the app. Each phone sends its own player ten times a second; the host (whoever opened the room,
// or the earliest one left if they go) keeps the shows in step. Privacy: as in any peer-to-peer game, the phones in a room can see each
// other's IP address; the settings panel says so.
import { joinRoom, selfId } from '../vendor/trystero.mjs';

const APP = 'lumiere-cinema-9';
const ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // no 0/O or 1/I: codes are read aloud and typed on phones
export const newCode = () => { let s = ''; const r = crypto.getRandomValues(new Uint8Array(6)); for (const v of r) s += ABC[v % ABC.length]; return s; };
export const cleanCode = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
const clip = (v, a, b) => Math.max(a, Math.min(b, v));
const num = (v, d = 0) => (Number.isFinite(+v) ? +v : d);
const small = (l) => (l && typeof l === 'object' ? { o: clip(Math.round(num(l.o)), 0, 15), b: clip(Math.round(num(l.b)), 0, 15), h: clip(Math.round(num(l.h)), 0, 15), s: clip(Math.round(num(l.s, 2)), 0, 15) } : null);

export class Multi {
  constructor(hooks = {}) { this.hooks = hooks; this.room = null; this.peers = new Map(); this.code = null; this.host = false; this.me = null; this.lastShow = null; this.offset = 0; this.t = 0; this.term = 0; }
  get active() { return !!this.room; }
  get count() { return this.room ? this.peers.size + 1 : 0; }
  // profile: { name, avatar, look } (avatar: a Rocketbox person's name, people.js RB; look: outfit, hair and height indices, people.js LOOK)
  start(code, profile, asHost) {
    this.leave(); this.code = cleanCode(code); if (this.code.length < 4) throw new Error('bad code');
    this.host = !!asHost; this.me = { name: String(profile.name || 'Guest').slice(0, 18), avatar: String(profile.avatar || '').slice(0, 40), look: small(profile.look) }; this.since = Date.now();
    const room = this.room = joinRoom({ appId: APP }, this.code);
    // Trystero 0.26: makeAction gives an object with send and an onMessage callback that gets the peer id; peer join and leave are properties
    const act = (n, on) => { const a = room.makeAction(n, { onMessage: (d, c) => { try { on(d, c && c.peerId); } catch (e) { console.warn('[mp]', n, e); } } }); return (d, to) => a.send(d, to ? { target: to } : undefined).catch(() => {}); };
    const sHello = act('hello', (h, id) => {
      if (!h || typeof h !== 'object' || !id) return; let p = this.peers.get(id); const fresh = !p;
      if (!p) { p = { id, st: null, at: 0 }; this.peers.set(id, p); }
      Object.assign(p, { name: String(h.name || 'Guest').slice(0, 18), avatar: String(h.avatar || '').slice(0, 40), look: small(h.look), host: !!h.host, since: num(h.since, Date.now()), term: Math.max(0, Math.round(num(h.term))) });
      if (p.host) { if (this.host && (p.term > this.term || (p.term === this.term && p.since < this.since))) { this.host = false; this.hooks.onHost && this.hooks.onHost(false); }   // two claims: the newer term wins, then the earlier arrival
        if (p.term >= this.term) this.term = p.term; for (const q of this.peers.values()) if (q !== p && q.host && q.term <= p.term) q.host = false; }
      if (p.host && h.now) this.offset = num(h.now) - Date.now();   // the host's clock, to start shows together (good to a fraction of a second)
      if (fresh && this.hooks.onJoin) this.hooks.onJoin(p);
      if (this.early && this.early.id === id) { const e = this.early; this.early = null; this.takeShow(e.s, p); }
      if (this.host && this.lastShow && (!this.hooks.live || this.hooks.live(this.lastShow))) this.sShow(this.lastShow, id);   // a show still on: the newcomer joins it
      this.hooks.onCount && this.hooks.onCount(this.count);
    });
    // v14 (the user, 11-20: "make the multiplayer work better performance-wise"): a player's state is five integers (cm, milliradians, sit +
    // speed), sent only when it changed (at most 12.5 a second) with a heartbeat each second when still; the seat and room ('mt') go only
    // when they change (and every 30th packet). Each arrival is kept with its time, so mpui.js draws the others 110 ms in the past,
    // between two real positions, instead of chasing the last one (no jitter when packets bunch up). The old object form is still read.
    const sState = act('st', (s, id) => { const p = this.peers.get(id); if (!p || !s || typeof s !== 'object') return; let st;
      if (Array.isArray(s)) { if (s.length < 5) return; const f = Math.round(num(s[4])); st = { x: clip(num(s[0]) / 100, -900, 900), y: clip(num(s[1]) / 100, -60, 60), z: clip(num(s[2]) / 100, -900, 900), yaw: clip(num(s[3]) / 1000, -100, 100), sit: f & 1, v: clip((f >> 1) / 10, 0, 6) }; }
      else st = { x: clip(num(s.x), -900, 900), y: clip(num(s.y), -60, 60), z: clip(num(s.z), -900, 900), yaw: num(s.yaw), sit: clip(num(s.sit), 0, 1), v: clip(num(s.v), 0, 6), seat: s.seat ? String(s.seat).slice(0, 24) : null, room: String(s.room || '').slice(0, 16) };
      if (p.meta && Array.isArray(s)) { st.seat = p.meta.seat; st.room = p.meta.room; }
      const now = performance.now(), S = p.snaps || (p.snaps = []); S.push({ t: now, x: st.x, y: st.y, z: st.z, yaw: st.yaw }); if (S.length > 8) S.shift();
      p.st = st; p.at = now; this.hooks.onState && this.hooks.onState(p); });
    const sMeta = act('mt', (m, id) => { const p = this.peers.get(id); if (!p || !m || typeof m !== 'object') return;
      p.meta = { seat: m.seat ? String(m.seat).slice(0, 24) : null, room: String(m.room || '').slice(0, 16), held: typeof m.held === 'string' && /^[a-z]{2,16}$/.test(m.held) ? m.held : null, tab: !!m.tab };
      if (p.st) { p.st.seat = p.meta.seat; p.st.room = p.meta.room; } });
    // v14 the lobby's guests from the host (npc9.js guestRoster, guestState): only the host's messages count
    const sCrowd = act('cr', (c, id) => { const p = this.peers.get(id); if (p && p.host && Array.isArray(c) && this.hooks.onCrowd) this.hooks.onCrowd(c); });
    const sRoster = act('crr', (c, id) => { const p = this.peers.get(id); if (p && p.host && Array.isArray(c) && this.hooks.onRoster) this.hooks.onRoster(c); });
    // v14b (the user, 11-26: "i click button in multiplayer, the I player go up, but the other player in same elevator is down"): a lift button
    // pressed on any phone is pressed on every phone, so the one car moves for everyone and whoever stands in it rides it
    const sLift = act('lift', (b, id) => { if (this.peers.get(id) && typeof b === 'string' && /^(hall|car)[01]$|^(open|close|alarm)$/.test(b) && this.hooks.onLift) this.hooks.onLift(b); });
    const sShow = act('show', (s, id) => { if (!s || typeof s !== 'object') return; const p = this.peers.get(id); if (!p) { this.early = { s, id }; return; } this.takeShow(s, p); });
    const sChat = act('chat', (m, id) => { const p = this.peers.get(id); if (p && this.hooks.onChat) this.hooks.onChat(p, String(m || '').slice(0, 140)); });
    // the host hands the role to another player: the new term, and the current show's start as time from now (each phone's own clock)
    const sHost = act('host', (h, id) => { const p = this.peers.get(id); if (!p || !p.host || !h || typeof h !== 'object' || Math.round(num(h.term)) <= this.term) return;
      this.term = Math.round(num(h.term)); this.host = true; this.offset = 0; p.host = false;
      this.lastShow = h.show && typeof h.show === 'object' ? { ...h.show, startAt: Date.now() + clip(num(h.show.left), -6 * 3600000, 600000) } : null; delete (this.lastShow || {}).left;
      this.sHello(this.hello()); this.hooks.onHost && this.hooks.onHost(true); });
    // the host's remote control (pause, play, seek, stop) reaches every phone; only the host's own messages count
    const sCtl = act('ctl', (c, id) => { const p = this.peers.get(id); if (p && p.host && c && typeof c === 'object' && this.hooks.onCtl) this.hooks.onCtl(c, p); });
    // an order: the cinema has one server, who serves every seat that called him in turn
    const sOrder = act('order', (o, id) => { const p = this.peers.get(id); if (p && o && typeof o === 'object' && this.hooks.onOrder) this.hooks.onOrder(p, String(o.seat || '').slice(0, 40)); });
    const sEmote = act('emote', (e, id) => { const p = this.peers.get(id); if (p && this.hooks.onEmote) this.hooks.onEmote(p, String(e || '').slice(0, 12)); });
    // v14b voice (the user, 11-26: "do the proximity chat ... the voice thing like in insta you record and send voice in chat, do the mute and
    // unmute"): your microphone as an audio stream to every phone in the room (peer to peer, like the rest), voice notes as small Opus files
    room.onPeerStream = (stream, id) => { if (this.peers.has(id) && this.hooks.onVoice) this.hooks.onVoice(id, stream); };
    const sNote = act('vn', (d, id) => { const p = this.peers.get(id); if (!p || !d || typeof d !== 'object' || typeof d.b !== 'string' || d.b.length > 600000 || !/^[A-Za-z0-9+/=]+$/.test(d.b)) return; if (this.hooks.onNote) this.hooks.onNote(p, d.b, Math.max(1, Math.min(60, Math.round(+d.s || 1)))); });
    Object.assign(this, { sHello, sState, sMeta, sShow, sChat, sEmote, sHost, sCtl, sOrder, sCrowd, sRoster, sLift, sNote });
    room.onPeerJoin = (id) => { sHello(this.hello(), id); if (this.mic) { try { room.addStream(this.mic, { target: id }); } catch (e) { /* the peer went */ } } if (this._metaObj) sMeta(this._metaObj, id); this._q = null; this._roster = null; this.hooks.onCount && this.hooks.onCount(this.count); };
    room.onPeerLeave = (id) => { const p = this.peers.get(id); this.peers.delete(id); if (p && this.hooks.onLeave) this.hooks.onLeave(p); this.elect(); this.hooks.onCount && this.hooks.onCount(this.count); };
    this.hooks.onCount && this.hooks.onCount(this.count);
  }
  takeShow(s, p) { if (!p.host) return; this.lastShow = s; this.hooks.onShow && this.hooks.onShow(s, p); }
  hello() { return { name: this.me.name, avatar: this.me.avatar, look: this.me.look, host: this.host, term: this.term, since: this.since, now: this.host ? Date.now() : 0 }; }
  // the host left: the one who has been in the room longest takes over (every phone reaches the same answer from the same list)
  elect() {
    if (!this.room || this.host || [...this.peers.values()].some((p) => p.host)) return;
    const all = [{ since: this.since, id: selfId, me: true }, ...this.peers.values()].sort((a, b) => a.since - b.since || (a.id < b.id ? -1 : 1));
    if (all[0].me) { if (this.lastShow) this.lastShow = { ...this.lastShow, startAt: num(this.lastShow.startAt) - this.offset }; this.offset = 0; this.host = true; this.term += 1; this.sHello(this.hello()); this.hooks.onHost && this.hooks.onHost(true); }
  }
  // per frame: my player, at most ten times a second (each phone sends only its own: the load is shared by everyone in the room)
  tick(dt, s) {
    if (!this.room) return; this.t += dt; this.hb = (this.hb || 0) + dt;
    const q = [Math.round(s.x * 100), Math.round(s.y * 100), Math.round(s.z * 100), Math.round(s.yaw * 1000), ((s.sit || 0) > 0.5 ? 1 : 0) + 2 * Math.round(clip(s.v || 0, 0, 6) * 10)], L = this._q;
    const moved = !L || Math.abs(q[0] - L[0]) > 2 || Math.abs(q[1] - L[1]) > 2 || Math.abs(q[2] - L[2]) > 2 || Math.abs(q[3] - L[3]) > 15 || q[4] !== L[4];
    const mkNow = (s.seat || '') + '|' + (s.room || '') + '|' + (s.held || '') + '|' + (s.tab ? 1 : 0); if (this.t < 0.08 || (!moved && this.hb < 1 && mkNow === this._meta)) return;
    this.t = 0; this.hb = 0; this._q = q; this.sState(q); this.sent = (this.sent || 0) + 1;
    const mk = (s.seat || '') + '|' + (s.room || '') + '|' + (s.held || '') + '|' + (s.tab ? 1 : 0); if (mk !== this._meta || this.sent % 30 === 0) { this._meta = mk; this._metaObj = { seat: s.seat || null, room: s.room || '', held: s.held || null, tab: !!s.tab }; this.sMeta(this._metaObj); }
  }
  // the host: the guests' roster when it changes (and every 5 s, for newcomers), their places four times a second
  crowd(roster, state, dt) { if (!this.room || !this.host || !this.peers.size) return; this.ct = (this.ct || 0) + dt; this.rt = (this.rt || 0) + dt;
    const key = roster.map((r) => r[0]).join(','); if (key !== this._roster || this.rt > 5) { this._roster = key; this.rt = 0; this.sRoster(roster); }
    if (this.ct >= 0.25) { this.ct = 0; this.sCrowd(state); } }
  // v14 a peer's position as of 140 ms ago, between the two packets either side of that moment; when packets stop (a stall on the network),
  // it carries on along their last motion for up to 0.4 s instead of freezing and then jumping (the user, 11-21: "the player teleported")
  sample(p, now = performance.now()) {
    const S = p.snaps; if (!S || !S.length) return p.st; const tt = now - 140; let b = S.length - 1;
    if (S[b].t <= tt || S.length < 2) { const B = S[b], A = S[b - 1]; if (!A || B.t - A.t > 1200 || B.t - A.t < 1) return B; const k = Math.min(400, tt - B.t) / (B.t - A.t);
      const o = this._smp || (this._smp = {}); o.x = B.x + (B.x - A.x) * k; o.y = B.y; o.z = B.z + (B.z - A.z) * k; o.yaw = B.yaw; return o; }
    while (b > 0 && S[b - 1].t > tt) b--; if (b === 0) return S[0]; const a = S[b - 1], B = S[b], k = (tt - a.t) / Math.max(1, B.t - a.t), dy = Math.atan2(Math.sin(B.yaw - a.yaw), Math.cos(B.yaw - a.yaw));
    const o = this._smp || (this._smp = {}); o.x = a.x + (B.x - a.x) * k; o.y = a.y + (B.y - a.y) * k; o.z = a.z + (B.z - a.z) * k; o.yaw = a.yaw + dy * k; return o;
  }
  // the host's show: { hall, film (house film id) | link (a YouTube link), title, startAt (host clock ms) }; guests start it in step
  show(s) { if (!this.room || !this.host) return; this.lastShow = s; this.sShow(s); }
  hostNow() { return Date.now() + (this.host ? 0 : this.offset); }
  chat(m) { if (this.room) this.sChat(String(m).slice(0, 140)); }
  // hand the host role to a player in the room
  giveHost(id) { const p = this.peers.get(id); if (!this.room || !this.host || !p) return false; this.term += 1; const L = this.lastShow;
    this.sHost({ term: this.term, show: L ? { ...L, left: num(L.startAt) - Date.now() } : null }, id); this.host = false; p.host = true; this.sHello(this.hello()); this.hooks.onHost && this.hooks.onHost(false); return true; }
  control(c) { if (this.room && this.host) { this.sCtl(c); if (this.lastShow && c && Number.isFinite(c.startAt)) this.lastShow = { ...this.lastShow, startAt: c.startAt }; if (c && c.cmd === 'stop') this.lastShow = null; } }
  order(seatKey) { if (this.room) this.sOrder({ seat: seatKey }); }
  lift(b) { if (this.room) this.sLift(b); }
  micOn(stream) { this.micOff(); this.mic = stream; if (this.room) { try { this.room.addStream(stream, {}); } catch (e) { console.warn('[mp] voice', e); } } }
  micOff() { const s = this.mic; this.mic = null; if (!s) return; try { if (this.room) this.room.removeStream(s); } catch (e) { /* the room went */ } for (const tr of s.getTracks()) tr.stop(); }
  note(b64, sec) { if (this.room) this.sNote({ b: b64, s: sec }); }
  emote(e) { if (this.room) this.sEmote(e); }
  leave() { if (!this.room) return; this.micOff(); try { this.room.leave(); } catch (e) { /* already gone */ } this.room = null; for (const p of this.peers.values()) if (this.hooks.onLeave) this.hooks.onLeave(p); this.peers.clear(); this.lastShow = null; this.early = null; this.offset = 0; this.host = false; this.hooks.onCount && this.hooks.onCount(0); }
}
