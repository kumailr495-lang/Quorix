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
const small = (l) => (l && typeof l === 'object' ? { o: clip(Math.round(num(l.o)), 0, 15), h: clip(Math.round(num(l.h)), 0, 15), s: clip(Math.round(num(l.s, 2)), 0, 15) } : null);

export class Multi {
  constructor(hooks = {}) { this.hooks = hooks; this.room = null; this.peers = new Map(); this.code = null; this.host = false; this.me = null; this.lastShow = null; this.offset = 0; this.t = 0; }
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
      Object.assign(p, { name: String(h.name || 'Guest').slice(0, 18), avatar: String(h.avatar || '').slice(0, 40), look: small(h.look), host: !!h.host, since: num(h.since, Date.now()) });
      if (p.host && this.host && p.since < this.since) { this.host = false; this.hooks.onHost && this.hooks.onHost(false); }   // two hosts (both opened it): the earlier one keeps it
      if (p.host && h.now) this.offset = num(h.now) - Date.now();   // the host's clock, to start shows together (good to a fraction of a second)
      if (fresh && this.hooks.onJoin) this.hooks.onJoin(p);
      if (this.early && this.early.id === id) { const e = this.early; this.early = null; this.takeShow(e.s, p); }
      if (this.host && this.lastShow && (!this.hooks.live || this.hooks.live(this.lastShow))) this.sShow(this.lastShow, id);   // a show still on: the newcomer joins it
      this.hooks.onCount && this.hooks.onCount(this.count);
    });
    const sState = act('st', (s, id) => { const p = this.peers.get(id); if (!p || !s || typeof s !== 'object') return;
      p.st = { x: num(s.x), y: num(s.y), z: num(s.z), yaw: num(s.yaw), sit: clip(num(s.sit), 0, 1), seat: s.seat ? String(s.seat).slice(0, 24) : null, room: String(s.room || '').slice(0, 16), v: clip(num(s.v), 0, 6) }; p.at = performance.now();
      this.hooks.onState && this.hooks.onState(p); });
    const sShow = act('show', (s, id) => { if (!s || typeof s !== 'object') return; const p = this.peers.get(id); if (!p) { this.early = { s, id }; return; } this.takeShow(s, p); });
    const sChat = act('chat', (m, id) => { const p = this.peers.get(id); if (p && this.hooks.onChat) this.hooks.onChat(p, String(m || '').slice(0, 140)); });
    const sEmote = act('emote', (e, id) => { const p = this.peers.get(id); if (p && this.hooks.onEmote) this.hooks.onEmote(p, String(e || '').slice(0, 12)); });
    Object.assign(this, { sHello, sState, sShow, sChat, sEmote });
    room.onPeerJoin = (id) => { sHello(this.hello(), id); this.hooks.onCount && this.hooks.onCount(this.count); };
    room.onPeerLeave = (id) => { const p = this.peers.get(id); this.peers.delete(id); if (p && this.hooks.onLeave) this.hooks.onLeave(p); this.elect(); this.hooks.onCount && this.hooks.onCount(this.count); };
    this.hooks.onCount && this.hooks.onCount(this.count);
  }
  takeShow(s, p) { if (!p.host) return; this.lastShow = s; this.hooks.onShow && this.hooks.onShow(s, p); }
  hello() { return { name: this.me.name, avatar: this.me.avatar, look: this.me.look, host: this.host, since: this.since, now: this.host ? Date.now() : 0 }; }
  // the host left: the one who has been in the room longest takes over (every phone reaches the same answer from the same list)
  elect() {
    if (!this.room || this.host || [...this.peers.values()].some((p) => p.host)) return;
    const all = [{ since: this.since, id: selfId, me: true }, ...this.peers.values()].sort((a, b) => a.since - b.since || (a.id < b.id ? -1 : 1));
    if (all[0].me) { if (this.lastShow) this.lastShow = { ...this.lastShow, startAt: num(this.lastShow.startAt) - this.offset }; this.offset = 0; this.host = true; this.sHello(this.hello()); this.hooks.onHost && this.hooks.onHost(true); }
  }
  // per frame: my player, at most ten times a second (each phone sends only its own: the load is shared by everyone in the room)
  tick(dt, s) {
    if (!this.room) return; this.t += dt; if (this.t < 0.1) return; this.t = 0;
    this.sState({ x: +s.x.toFixed(2), y: +s.y.toFixed(2), z: +s.z.toFixed(2), yaw: +s.yaw.toFixed(2), sit: +(s.sit || 0).toFixed(2), seat: s.seat || null, room: s.room || '', v: +(s.v || 0).toFixed(2) });
  }
  // the host's show: { hall, film (house film id) | link (a YouTube link), title, startAt (host clock ms) }; guests start it in step
  show(s) { if (!this.room || !this.host) return; this.lastShow = s; this.sShow(s); }
  hostNow() { return Date.now() + (this.host ? 0 : this.offset); }
  chat(m) { if (this.room) this.sChat(String(m).slice(0, 140)); }
  emote(e) { if (this.room) this.sEmote(e); }
  leave() { if (!this.room) return; try { this.room.leave(); } catch (e) { /* already gone */ } this.room = null; for (const p of this.peers.values()) if (this.hooks.onLeave) this.hooks.onLeave(p); this.peers.clear(); this.lastShow = null; this.early = null; this.offset = 0; this.host = false; this.hooks.onCount && this.hooks.onCount(0); }
}
