// LUMIERE v9.3 - playing together, on screen: the "Play together" button on the menu, the room panel (your name, your look from the
// photographed people, host a room or join with a code), the room badge and chat in the game, the other players in the cinema (the
// people renderer with its AI switched off: they walk, sit, wave and talk as their phones say), their names over their heads, and the
// host's shows started on every phone at the same moment. mp.js carries the messages.
import * as THREE from 'three';
import { Multi, newCode, cleanCode } from './mp.js';
import { RB, Person, LOOK, cleanLook, applyLook } from './people.js';
import { filmById } from './films.js';
import { t } from './i18n.js';

const el = (tag, attrs = {}, kids = []) => { const e = document.createElement(tag); for (const k in attrs) { if (k === 'text') e.textContent = attrs[k]; else if (k === 'cls') e.className = attrs[k]; else e.setAttribute(k, attrs[k]); } for (const c of kids) e.appendChild(c); return e; };
// a show another phone sends is checked here before it reaches the screen: a house film by id, a YouTube video by its 11-character id,
// or an https link; anything else is dropped (a link through this phone's own media server is never sent: orig is the web address)
export function cleanShow(s) {
  if (!s || typeof s !== 'object') return null; const title = String(s.title || '').replace(/[\u0000-\u001f]/g, '').slice(0, 60);
  if (s.kind === 'film') return filmById(String(s.filmId)) ? { kind: 'film', filmId: String(s.filmId) } : null;
  if (s.kind === 'youtube') { const id = String(s.ytId || ''); return /^[A-Za-z0-9_-]{11}$/.test(id) ? { kind: 'youtube', ytId: id, url: 'https://www.youtube.com/watch?v=' + id, title: title || 'YouTube', label: title || 'YouTube' } : null; }
  if (s.kind === 'link') { const url = String(s.url || ''); return /^https:\/\/[^\s]{4,600}$/i.test(url) ? { kind: 'link', url, title: title || 'Link', label: title || 'Link' } : null; }
  return null;
}
const hashSeed = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) % 2147483646 + 1; };

export class Together {
  // ctx: { world, crowd, shows, player, engine, settings, save(), toast(msg, ms), sound, onModal(open), enterPlay(), room(), mySeat() }
  constructor(ctx) {
    this.c = ctx; this.remotes = new Map(); this.tags = new Map(); this._v = new THREE.Vector3(); this.last = { x: 0, z: 0 }; this.speed = 0;
    this.mp = new Multi({ onJoin: (p) => this.join_(p), onLeave: (p) => this.leave_(p), onState: () => {}, onShow: (s, p) => this.applyShow(s, p), onChat: (p, m) => this.chat_(p, m),
      onEmote: (p, e) => { const a = this.remotes.get(p.id); if (a && ['wave', 'clap', 'cheer'].includes(e)) a.gesture(e, 2.6); }, onCount: () => this.badge(), live: (sh) => { const s = this.c.shows.get(sh.hall); return !!s && !!s.booked && s.state !== 'idle' && s.state !== 'ended'; }, onHost: (on) => { if (on) this.note(t('mp.newHost')); this.badge(); },
      onCtl: (c, p) => this.applyCtl(c, p), onOrder: (p, key) => { const f = this.seatByKey(key); if (f && this.c.order) this.c.order(f.s, p.name); } });
    this.log = []; this.unread = 0;
    // the menu button, after Quick play
    const q = document.querySelector('#mnQuick');
    if (q) { this.menuBtn = el('button', { cls: 'mi', id: 'mnTogether' }); q.after(this.menuBtn); this.menuBtn.addEventListener('click', () => { this.c.sound && this.c.sound.click(); this.open(); }); }
    this.tagLayer = el('div', { id: 'mpTags' }); document.body.appendChild(this.tagLayer);
    this.text();
  }
  text() { if (this.menuBtn) this.menuBtn.textContent = t('menu.together'); }
  get active() { return this.mp.active; }
  // ---------------------------------------------------------------- the room panel
  open() {
    if (this.panel) this.panel.remove(); const S = this.c.settings, guests = RB.ready ? Object.keys(RB.avatars).filter((n) => !/^Business_/.test(n)) : [];
    if (!S.mpAvatar || !guests.includes(S.mpAvatar)) S.mpAvatar = guests[0] || '';
    const name = el('input', { id: 'mpName', maxlength: '18', autocomplete: 'off', value: S.mpName || '' }), code = el('input', { id: 'mpCode', maxlength: '6', autocomplete: 'off', placeholder: 'ABC123' }), grid = el('div', { id: 'mpAv' });
    S.mpLook = cleanLook(S.mpLook); const look = S.mpLook;
    for (const n of guests) { const b = el('button', { cls: n === S.mpAvatar ? 'on' : '', 'aria-label': n.replace(/_/g, ' ') }, [el('img', { src: 'models/rb/portraits/' + n + '.webp', alt: '' })]);
      b.addEventListener('click', () => { S.mpAvatar = n; for (const x of grid.children) x.classList.toggle('on', x === b); this.previewSet(); this.c.save(); }); grid.appendChild(b); }
    // the look: outfit and hair colour swatches (the first keeps the photo's own colours) and a height slider, shown live on the preview
    const swatches = (id, list, key) => { const row = el('div', { cls: 'mpSw', id });
      list.forEach((hex, i) => { const b = el('button', { cls: (i === look[key] ? 'on ' : '') + (hex ? '' : 'orig'), 'aria-label': hex ? hex : t('mp.asPhoto') }); if (hex) b.style.background = hex;
        b.addEventListener('click', () => { look[key] = i; for (const x of row.children) x.classList.toggle('on', x === b); this.previewSet(); this.c.save(); }); row.appendChild(b); });
      return row; };
    const size = el('input', { id: 'mpSize', type: 'range', min: '0', max: String(LOOK.height.length - 1), step: '1', value: String(look.s) });
    const fill = () => size.style.setProperty('--p', (look.s / (LOOK.height.length - 1) * 100).toFixed(1) + '%'); fill();
    size.addEventListener('input', () => { look.s = +size.value; fill(); this.previewSet(); }); size.addEventListener('change', () => this.c.save());
    const prev = el('canvas', { id: 'mpPrev', width: '240', height: '340' });
    name.setAttribute('placeholder', t('mp.name')); name.setAttribute('aria-label', t('mp.name')); code.setAttribute('aria-label', t('mp.code'));
    const status = el('div', { id: 'mpStatus' }), hostB = el('button', { cls: 'btn primary', id: 'mpHost', text: t('mp.host') }), joinB = el('button', { cls: 'btn secondary', id: 'mpJoin', text: t('mp.join') }), close = el('button', { cls: 'icon x', id: 'mpClose', 'aria-label': t('book.back') });
    close.innerHTML = '<svg class="ic"><use href="#i-close"/></svg>';
    const leaveB = el('button', { cls: 'btn ghost sm', id: 'mpLeave', text: t('mp.leave') }); leaveB.hidden = !this.active;
    const list = el('div', { id: 'mpList' });
    // v11: the panel is your name, Host, or a code and Join; how you look waits behind one line (your last look is kept)
    const lookB = el('button', { cls: 'adv-toggle', text: t('mp.look') }), lookBox = el('div', { cls: 'adv' }, [grid, el('label', { text: t('mp.outfit') }), swatches('mpOutfit', LOOK.outfit, 'o'), el('label', { text: t('mp.bottom') }), swatches('mpBottom', LOOK.bottom, 'b'), el('label', { text: t('mp.hair') }), swatches('mpHair', LOOK.hair, 'h'), el('label', { text: t('mp.height') }), size]);
    lookBox.hidden = true; lookB.addEventListener('click', () => { lookBox.hidden = !lookBox.hidden; lookB.classList.toggle('on', !lookBox.hidden); });
    const side = el('div', { cls: 'mpEdit' }, [name, el('div', { cls: 'row' }, [hostB, code, joinB]), status, list, lookB, lookBox, leaveB]);
    const d = el('div', { cls: 'dialog' }, [el('div', { cls: 'mpHead' }, [el('h2', { text: t('mp.title') }), close]), el('div', { cls: 'mpTop' }, [prev, side]), el('div', { cls: 'note', text: t('mp.privacy') })]);
    this.panel = el('div', { id: 'mpPanel', cls: 'scrim center' }, [d]); document.body.appendChild(this.panel); this.c.onModal(true); this.list();
    this.pv = { canvas: prev, ctx: prev.getContext('2d'), scene: new THREE.Scene(), cam: new THREE.PerspectiveCamera(30, 120 / 170, 0.1, 20), p: null, av: null, yaw: 0.5,
      light: { amb: new THREE.Color(0.62, 0.58, 0.55), key: new THREE.Color(0.7, 0.66, 0.6), dir: new THREE.Vector3(0.45, 0.75, 0.5).normalize(), screen: new THREE.Color(0, 0, 0) } };
    this.pv.cam.position.set(0, 1.05, 3.6); this.pv.cam.lookAt(0, 0.92, 0); this.previewSet();
    const profile = () => { S.mpName = (name.value || '').trim().slice(0, 18) || 'Guest'; this.c.save(); return { name: S.mpName, avatar: S.mpAvatar, look: { ...S.mpLook } }; };
    hostB.addEventListener('click', () => { const k = newCode(); this.go(k, profile(), true, status); });
    joinB.addEventListener('click', () => { const k = cleanCode(code.value); if (k.length !== 6) { status.textContent = t('mp.badCode'); return; } this.go(k, profile(), false, status); });
    code.addEventListener('input', () => { code.value = cleanCode(code.value); });
    leaveB.addEventListener('click', () => { this.leave(); this.close(); });
    close.addEventListener('click', () => this.close());
  }
  close() { if (this.panel) { this.panel.remove(); this.panel = null; } if (this.pv) { if (this.pv.p) this.pv.p.dispose(); this.pv = null; } this.c.onModal(false); }
  // the preview: the chosen person with the chosen look, turning slowly; drawn by the game's own renderer (no second GPU context) into the
  // part of the screen under the panel's preview box, then copied into that box in the same frame
  previewSet() {
    const v = this.pv, S = this.c.settings; if (!v || !RB.ready) return; const av = S.mpAvatar;
    if (v.av !== av) { if (v.p) { v.scene.remove(v.p.group); v.p.dispose(); } v.p = null; v.av = av; const A = RB.avatars[av];
      if (A) { v.p = new Person({ kind: A.kind, seed: 7, rb: av, height: 1 }, { idle: 'Idle_Loop' }); v.scene.add(v.p.group); } }
    if (v.p) applyLook(v.p, S.mpLook);
  }
  preview(R, dt) {
    const v = this.pv; if (!v || !v.p || !this.panel) return; const r = v.canvas.getBoundingClientRect(), sz = R.getSize(this._sz || (this._sz = new THREE.Vector2()));
    if (r.width < 8 || r.bottom <= 0 || r.top >= sz.y || r.right <= 0 || r.left >= sz.x || r.left < 0 || r.right > sz.x || r.top < 0 || r.bottom > sz.y) return;
    v.yaw += dt * 0.45; v.p.group.rotation.y = 0.35 * Math.sin(v.yaw); v.scene.updateMatrixWorld(); v.p.update(dt, v.light);
    const vp = R.getViewport(this._vp || (this._vp = new THREE.Vector4())).clone(), sc = R.getScissor(this._sc || (this._sc = new THREE.Vector4())).clone(), st = R.getScissorTest(), cc = R.getClearColor(this._cc || (this._cc = new THREE.Color())).clone(), ca = R.getClearAlpha(), rt = R.getRenderTarget();
    const x = r.left, y = sz.y - r.bottom; R.setRenderTarget(null); R.setViewport(x, y, r.width, r.height); R.setScissor(x, y, r.width, r.height); R.setScissorTest(true); R.setClearColor(0x16161b, 1); R.clear(true, true, false);
    v.cam.aspect = r.width / r.height; v.cam.updateProjectionMatrix(); R.render(v.scene, v.cam);
    const pr = R.domElement.width / sz.x; try { v.ctx.drawImage(R.domElement, r.left * pr, r.top * pr, r.width * pr, r.height * pr, 0, 0, v.canvas.width, v.canvas.height); } catch (e) { /* canvas busy */ }
    R.setViewport(vp); R.setScissor(sc); R.setScissorTest(st); R.setClearColor(cc, ca); R.setRenderTarget(rt);
  }
  isOpen() { return !!this.panel; }
  list() { const L = this.panel && this.panel.querySelector('#mpList'); if (!L) return; L.textContent = ''; if (!this.active) return;
    L.appendChild(el('div', { text: `${t('mp.players')} · ${t('mp.badge', { code: this.mp.code, n: this.mp.count })}` }));
    L.appendChild(el('div', { text: `• ${this.mp.me.name}${this.mp.host ? ' ★' : ''}` }));
    for (const p of this.mp.peers.values()) { const row = el('div', { cls: 'mpRow' }, [el('span', { text: `• ${p.name}${p.host ? ' ★' : ''}` })]);
      if (this.mp.host) { const b = el('button', { cls: 'btn ghost mini', text: t('mp.makeHost') }); b.addEventListener('click', () => { if (this.mp.giveHost(p.id)) this.note(t('mp.gaveHost', { name: p.name })); this.list(); }); row.appendChild(b); }
      L.appendChild(row); }
    const tg = (key, label) => { const S = this.c.settings, b = el('button', { cls: 'btn ghost mini' + (S[key] === false ? '' : ' on'), text: label }); b.addEventListener('click', () => { S[key] = S[key] === false; this.c.save(); this.list(); this.badge(); }); return b; };
    L.appendChild(el('div', { cls: 'mpRow' }, [tg('mpNames', t('mp.names')), tg('mpMsgs', t('mp.msgs'))])); }
  go(code, profile, asHost, status) {
    status.textContent = t('mp.connecting');
    try { this.mp.start(code, profile, asHost); } catch (e) { console.warn('[mp]', e); status.textContent = t('mp.failed'); return; }
    status.textContent = asHost ? t('mp.waiting', { code }) : t('mp.badge', { code, n: this.mp.count });
    this.badge(); this.list();
    if (!asHost) setTimeout(() => { if (this.active && this.mp.peers.size === 0 && this.panel) status.textContent = t('mp.failed'); }, 20000);
    setTimeout(() => { this.close(); this.c.enterPlay(); }, asHost ? 2200 : 900);
  }
  leave() { this.mp.leave(); this.badge(); }
  // ---------------------------------------------------------------- in the game: the badge, the bar (chat, emotes), the other players
  badge() {
    if (!this.active) { if (this.bdg) { this.bdg.remove(); this.bar.remove(); this.bdg = this.bar = null; } return; }
    if (!this.bdg) {
      this.bdg = el('button', { id: 'mpBadge' }, [el('i'), el('span')]); this.bdg.addEventListener('click', () => this.open());
      // v14 (the user, 11-20: "instead of making icons you have built this shit emoji thing, I don't even understand the options"): drawn
      // icons, each with its word under it
      const btn = (iconId, label) => { const b = el('button', { 'aria-label': label }); b.innerHTML = `<svg class="ic"><use href="#i-${iconId}"/></svg><small>${label}</small>`; return b; };
      const chatB = this.chatB = btn('chat', t('mp.chatB')); chatB.appendChild(el('i', { cls: 'dot' })); chatB.addEventListener('click', () => this.chatBox());
      const namesB = this.namesB = btn('tag', t('mp.names')); namesB.addEventListener('click', () => { const S = this.c.settings; S.mpNames = S.mpNames === false; this.c.save(); this.badge(); });
      this.bar = el('div', { id: 'mpBar' }, [chatB, namesB]);
      for (const [e, ic] of [['wave', 'wave'], ['clap', 'clap'], ['cheer', 'party']]) { const b = btn(ic, t('mp.emote.' + e)); b.addEventListener('click', () => { this.mp.emote(e); this.c.sound && this.c.sound.click(); b.classList.add('pop'); setTimeout(() => b.classList.remove('pop'), 300); }); this.bar.appendChild(b); }
      const hud = document.querySelector('#hudTL') || document.querySelector('#hud') || document.body; hud.appendChild(this.bdg); hud.appendChild(this.bar);
    }
    this.bdg.classList.toggle('host', this.mp.host); this.bdg.querySelector('span').textContent = t('mp.badge', { code: this.mp.code, n: this.mp.count }); this.list();
    const S = this.c.settings; this.namesB.classList.toggle('off', S.mpNames === false); this.chatB.classList.toggle('unread', this.unread > 0 && S.mpMsgs !== false); this.chatB.hidden = false;
  }
  chatBox() {
    if (this.chatEl) { this.chatEl.remove(); this.chatEl = null; this.c.onModal(false); return; }
    const inp = el('input', { maxlength: '140', placeholder: t('mp.chatPh'), autocomplete: 'off' }), send = el('button', { cls: 'btn primary', 'aria-label': t('mp.send') }), logEl = el('div', { cls: 'mpLog' });
    const close = () => { this.chatEl.remove(); this.chatEl = null; this.c.onModal(false); };
    const go = () => { const m = inp.value.trim(); if (m) { this.mp.chat(m); this.addLog(this.mp.me.name, m, true); } inp.value = ''; this.renderLog(); };
    send.addEventListener('click', go); inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); if (e.key === 'Escape') close(); });
    send.innerHTML = '<svg class="ic"><use href="#i-send"/></svg>'; const head = el('div', { cls: 'mpChatHead' }, [el('b', { text: t('mp.chatB') }), el('button', { cls: 'icon x', 'aria-label': t('mp.close') })]); head.lastChild.innerHTML = '<svg class="ic"><use href="#i-close"/></svg>'; head.lastChild.addEventListener('click', () => close());
    this.chatEl = el('div', { id: 'mpChat' }, [head, logEl, el('div', { cls: 'mpIn' }, [inp, send])]); document.body.appendChild(this.chatEl); this.c.onModal(true);
    this.unread = 0; this.badge(); this.renderLog(); setTimeout(() => inp.focus(), 50);
  }
  addLog(who, text, mine = false, sys = false) { this.log.push({ who, text, mine, sys }); if (this.log.length > 40) this.log.shift(); if (!this.chatEl && !mine && !sys) this.unread++; this.renderLog(); this.badge(); }
  note(text) { this.addLog('', text, false, true); }
  renderLog() { const L = this.chatEl && this.chatEl.querySelector('.mpLog'); if (!L) return; L.textContent = ''; const hide = this.c.settings.mpMsgs === false;
    for (const m of this.log) { if (hide && !m.sys && !m.mine) continue; L.appendChild(el('div', { cls: m.sys ? 'sys' : m.mine ? 'me' : '' }, m.sys ? [el('span', { text: m.text })] : [el('b', { text: m.who }), el('span', { text: ' ' + m.text })])); }
    L.scrollTop = L.scrollHeight; }
  chat_(p, m) { if (!m) return; this.addLog(p.name, m); if (this.c.settings.mpMsgs === false) return; const a = this.remotes.get(p.id); if (a) a.say({ text: m }, Math.max(2.5, m.length * 0.07)); }
  join_(p) {
    const av = RB.avatars[p.avatar] ? p.avatar : null, kind = av ? RB.avatars[av].kind : 'm';
    const a = this.c.crowd.spawn({ id: 'mp_' + p.id, rec: { kind, seed: hashSeed(p.id), rb: av, height: 1, look: cleanLook(p.look) }, role: 'remote', name: p.name, x: 0, y: 0, z: 14, yaw: 0, state: 'remote' });
    a.hidden = true; this.remotes.set(p.id, a); this.note(t('mp.joined', { name: p.name }));
    const tag = el('b', { text: p.name }); this.tagLayer.appendChild(tag); this.tags.set(p.id, tag);
  }
  leave_(p) { const a = this.remotes.get(p.id); if (a) { this.freeSeat(a); this.c.crowd.remove(a); this.remotes.delete(p.id); if (a.ring) { a.ring.removeFromParent(); a.ring.geometry.dispose(); a.ring.material.dispose(); a.ring = null; } } const tg = this.tags.get(p.id); if (tg) { tg.remove(); this.tags.delete(p.id); } if (p.name) this.note(t('mp.left', { name: p.name })); }
  freeSeat(a) { if (a.viewer && a.viewer.seat && a.viewer.seat.npc === 'remote') { a.viewer.seat.npc = null; a.viewer.seat.taken = false; } a.viewer = null; }
  seatByKey(key) { if (!key) return null; const [hk, id] = key.split(':'); const h = this.c.world.hallByKey(hk); if (!h) return null; const s = h.seats.find((q) => q.id === id); return s ? { s, h } : null; }
  // per frame: send me, move them, place their names
  frame(dt) {
    if (!this.active) { if (this.tags.size) for (const tg of this.tags.values()) tg.style.display = 'none'; return; }
    const P = this.c.player, d = Math.hypot(P.x - this.last.x, P.z - this.last.z); this.speed += ((dt > 0 ? d / dt : 0) - this.speed) * Math.min(1, dt * 6); this.last.x = P.x; this.last.z = P.z;
    const seat = this.c.mySeat(); this.mp.tick(dt, { x: P.x, y: P.y, z: P.z, yaw: P.yaw, sit: P.seated ? 1 : 0, seat: seat ? `${seat.hallKey}:${seat.id}` : null, room: this.c.room(), v: Math.min(5, this.speed) });
    const cam = this.c.engine.camera, W = innerWidth, H = innerHeight, k = Math.min(1, dt * 10);
    for (const [id, a] of this.remotes) {
      const p = this.mp.peers.get(id), st = p && p.st, tag = this.tags.get(id); if (!st) { if (tag) tag.style.display = 'none'; continue; }
      if (st.sit > 0.5 && st.seat) { const f = this.seatByKey(st.seat);
        if (f && (!a.viewer || a.viewer.seat !== f.s)) { this.freeSeat(a); if (f.s.npc && f.s.npc !== 'player' && f.s.npc !== 'remote' && this.c.crowd.dropViewer) this.c.crowd.dropViewer(f.s.npc); f.s.npc = 'remote'; f.s.taken = true; a.viewer = { seat: f.s, hall: f.h }; }
        if (a.viewer) { const s = a.viewer.seat; a.x = s.x; a.y = s.y; a.z = s.z; a.yaw = s.yaw + Math.PI; a.sit = Math.min(1, (a.sit || 0) + dt * 1.5); a.remoteWalk = 0; } }
      else { if (a.viewer) { this.freeSeat(a); a.sit = 0; }
        // their camera yaw faces -z at 0; a person faces +z at 0
        a.x += (st.x - a.x) * k; a.y += (st.y - a.y) * k; a.z += (st.z - a.z) * k; const want = st.yaw + Math.PI; a.yaw += Math.atan2(Math.sin(want - a.yaw), Math.cos(want - a.yaw)) * k; a.remoteWalk = st.v > 0.25 ? st.v : 0; }
      // v14 (the user, 11-20: "there's no difference between the player and the NPCs"): a player stands in a soft gold ring; NPCs never do
      if (a.ch && !a.ring) { const rg = new THREE.Mesh(new THREE.RingGeometry(0.34, 0.46, 40), new THREE.MeshBasicMaterial({ color: p && p.host ? 0x7fd2ff : 0xe3b25f, transparent: true, opacity: 0.75, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
        rg.rotation.x = -Math.PI / 2; rg.renderOrder = 3; a.ring = rg; this.c.engine.scene.add(rg); }
      if (a.ring) { a.ring.visible = !!(a.ch && a.ch.group.visible) && !a.viewer; a.ring.position.set(a.x, a.y + 0.02, a.z); a.ring.material.opacity = 0.55 + 0.2 * Math.sin(performance.now() * 0.004); }
      if (!tag) continue; const vis = a.ch && a.ch.group.visible && this.c.settings.mpNames !== false; if (!vis) { tag.style.display = 'none'; continue; }
      this._v.set(a.x, a.y + (a.viewer ? 1.45 : 2.0), a.z).project(cam); const near = Math.hypot(a.x - cam.position.x, a.z - cam.position.z) < 22;
      if (this._v.z > 1 || !near) { tag.style.display = 'none'; continue; }
      tag.style.display = ''; tag.style.left = ((this._v.x + 1) / 2 * W).toFixed(0) + 'px'; tag.style.top = ((1 - this._v.y) / 2 * H).toFixed(0) + 'px'; tag.classList.toggle('host', !!p.host);
    }
  }
  // ---------------------------------------------------------------- the film's controls belong to the host (the user: "only the host has
  // the tablet to change the movie, stop it"); guests watch what the host plays
  canControl() { return !this.active || this.mp.host; }
  onControl(cmd, arg) {
    if (!this.active || !this.mp.host) return; const v = this.c.shows.video, id = this.c.shows.active; if (!id) return;
    if (cmd === 'pause') this.mp.control({ hall: id, cmd: 'pause', pos: v.currentTime });
    else if (cmd === 'play' || cmd === 'seek') { const pos = cmd === 'seek' ? Math.max(0, +arg || 0) : v.currentTime, s = this.c.shows.get(id);
      if (s) { s.startAt = performance.now() - pos * 1000; s.seek = 0; }   // the host's own film keeps to the re-based room clock too (it was paused)
      this.mp.control({ hall: id, cmd: v.paused && cmd === 'seek' ? 'seekPaused' : 'play', pos, startAt: this.mp.hostNow() - pos * 1000 }); }
    else if (cmd === 'stop') this.mp.control({ hall: id, cmd: 'stop' });
  }
  applyCtl(c, p) {
    const S = this.c.shows, s = S.get(String(c.hall || '')); if (!s || !s.src || s.state !== 'playing') return; const v = S.video, pos = Math.max(0, Math.min(6 * 3600, +c.pos || 0));
    if (c.cmd === 'pause') { v.pause(); try { v.currentTime = pos; } catch (e) { /* not seekable */ } }
    else if (c.cmd === 'play' || c.cmd === 'seekPaused') { if (Number.isFinite(+c.startAt)) { s.startAt = performance.now() + (+c.startAt - this.mp.hostNow()); s.seek = 0; } try { v.currentTime = pos; } catch (e) { /* not seekable */ } if (c.cmd === 'play') v.play().catch(() => {}); }
    else if (c.cmd === 'stop') S.control.call(S, 'stop');
  }
  // the server: one for the whole cinema; an order from any phone joins his queue on every phone
  sendOrder(seat, hallKey) { if (this.active && seat && hallKey) this.mp.order(`${hallKey}:${seat.id}`); }
  // ---------------------------------------------------------------- shows: the host books, every phone starts it at the same moment
  onBooked(id) {
    if (!this.active || !this.mp.host) return; const s = this.c.shows.get(id); if (!s || !s.src) return; const src = s.src;
    const share = cleanShow(src.kind === 'film' ? src : { kind: src.kind, ytId: src.ytId, url: src.orig || src.url, title: src.title }); if (share) s.sync = true;
    this.mp.show({ hall: id, src: share, title: src.title || '', local: !share, startAt: this.mp.hostNow() + Math.max(0, (s.startAt || 0) - performance.now()) });
  }
  applyShow(sh, p) {
    const H = this.c.world.hallById(sh.hall); if (!H) return; const hall = H.name.replace('LUMIERE ', '');
    const src = cleanShow(sh.src); if (sh.local || !src) { this.c.toast(t('mp.hostOwn', { name: p.name, hall }), 3600); return; }
    // shows.now is the last frame's time: add the time since then, so a slow frame does not shift the start
    const d = Math.round(sh.startAt - this.mp.hostNow()), lag = Math.max(0, performance.now() - this.c.shows.now);
    if (!Number.isFinite(d) || d > 600000 || d < -6 * 3600000) return;
    this.c.shows.book(sh.hall, src, Math.max(d, 1500) + lag, null, { minDelay: 1500, seekMs: d < 1500 ? 1500 - d : 0, sync: true });
    this.c.toast(t('mp.hostStarted', { name: p.name, title: String(sh.title || '').slice(0, 60), hall }), 3600);
  }
}
