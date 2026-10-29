// LUMIERE v5 - passages between the concourse and the halls: warm fabric walls over a walnut wainscot, LED floor lines, poster cases, a door on each side at the far end.
import * as THREE from 'three';
import { Room } from './room.js';
import { MAT } from './geom.js';
import { PASSAGES, DOOR_W, DOOR_H, hallById, CONC } from './layout.js';
import { signTexture, posterTexture, FILMS } from './textures.js';
import * as P from './props.js';
export function buildPassages(ctx) {
  return PASSAGES.map((p) => {
    const room = new Room(p.key, { ceil: p.h, rect: [p.x0, p.z0, p.x1, p.z1], soft: 0.4 }), L = room.lights, top = p.h, zIn = CONC.z0 - 0.3;   // zIn: inner face of the wall the door sits in
    const cx = (p.x0 + p.x1) / 2; room.flat(p.x0, p.z0, cx - 0.7, zIn, 0, true, '#2a2328', { mat: MAT.hallCarpet }); room.flat(cx + 0.7, p.z0, p.x1, zIn, 0, true, '#2a2328', { mat: MAT.hallCarpet }); room.flat(cx - 0.7, p.z0, cx + 0.7, zIn, 0, true, '#5a2430', { mat: MAT.carpet });
    room.flat(p.x0, p.z0, p.x1, zIn, top, false, '#1c191b', { mat: MAT.paint });
    for (const [x, dir, hall] of [[p.x0, 1, p.doors.find((d) => d.x < (p.x0 + p.x1) / 2)], [p.x1, -1, p.doors.find((d) => d.x > (p.x0 + p.x1) / 2)]]) {
      const gaps = hall ? [[hall.z - DOOR_W / 2, hall.z + DOOR_W / 2, DOOR_H]] : [];
      room.wall('z', x, p.z0, zIn, 0, top, dir, '#4a3f3e', gaps, { mat: MAT.acoustic, thick: 0.3, skirt: { h: 0.08, color: '#0b0b0d' } });
      // walnut wainscot with a brass cap; the LED floor line hides under its lip. Ends against the end wall / concourse wall have no face (no coplanar overlap)
      const wsegs = hall ? [[p.z0, hall.z - DOOR_W / 2 - 0.12, 'z0'], [hall.z + DOOR_W / 2 + 0.12, zIn, 'z1']] : [[p.z0, zIn, '']];
      for (const [a, b, open] of wsegs) { if (b - a < 0.2) continue; const ends = (open === 'z0' ? 'pz' : open === 'z1' ? 'nz' : ''), xa = dir > 0 ? x : x - 0.04, xb = dir > 0 ? x + 0.04 : x;
        room.box(xa, 0.12, a, xb, 1.05, b, '#5b3a28', { mat: MAT.wood, faces: `${dir > 0 ? 'px' : 'nx'} ny ${ends}`.trim() });
        room.box(dir > 0 ? x : x - 0.05, 1.05, a, dir > 0 ? x + 0.05 : x, 1.07, b, '#c09050', { mat: MAT.metal, faces: `${dir > 0 ? 'px' : 'nx'} py ny ${ends}`.trim() }); }
      L.line(x + dir * 0.25, top - 0.15, p.z0 + 0.3, x + dir * 0.25, top - 0.15, zIn - 0.3, '#ffd2a2', 0.9, 4.5, 'f', [dir * 0.4, -0.9, 0]); room.glowBox(dir > 0 ? x + 0.005 : x - 0.04, top - 0.12, p.z0 + 0.2, dir > 0 ? x + 0.04 : x - 0.005, top - 0.1, zIn - 0.2, '#ffd9b0', 1.8, 0, dir > 0 ? 'px ny' : 'nx ny');
      // LED floor line along the wall (stops at the door), lights the carpet
      const segs = hall ? [[p.z0 + 0.1, hall.z - DOOR_W / 2 - 0.1], [hall.z + DOOR_W / 2 + 0.1, zIn - 0.1]] : [[p.z0 + 0.1, zIn - 0.1]];
      for (const [a, b] of segs) { if (b - a < 0.2) continue; room.glowBox(dir > 0 ? x + 0.015 : x - 0.03, 0.09, a, dir > 0 ? x + 0.03 : x - 0.015, 0.105, b, '#ffc690', 1.6, 0, dir > 0 ? 'px py' : 'nx py'); L.line(x + dir * 0.12, 0.12, a, x + dir * 0.12, 0.12, b, '#ffc690', 0.22, 1.6, 'f'); }
      if (hall) { const H = hallById(hall.hall); // number sign above the door, lit
        room.tex(signTexture(H.name, 512, 96, { color: '#ffffff', size: 0.5, weight: 600, spacing: 0.18 }), x + dir * 0.012, DOOR_H + 0.3, hall.z, dir > 0 ? Math.PI / 2 : -Math.PI / 2, 1.3, 0.24, { emit: 1.2, transparent: true });
        L.point(x + dir * 0.8, 2.4, hall.z, '#ffd9b0', 0.6, 3.5, 'f'); }
    }
    for (const [x, dir] of [[p.x0, 1], [p.x1, -1]]) { const fi = (p.key === 'passW' ? 0 : 3) + (dir > 0 ? 0 : 1), z = zIn - 2.4; room.kit(P.lightboxKit(0.9, 1.35), x + dir * 0.001, 1.2, z, dir > 0 ? Math.PI / 2 : -Math.PI / 2); room.tex(posterTexture(FILMS[fi % 6]), x + dir * 0.07, 1.875, z, dir > 0 ? Math.PI / 2 : -Math.PI / 2, 0.9, 1.35, { emit: 1.2 }); L.area(x + dir * 0.3, 1.85, z, [0, 0, 0.45], [0, 0.65, 0], [dir, 0, 0], '#fff0e0', 0.8, 3.5, 'f', 2, 2); }
    room.wall('x', p.z0, p.x0, p.x1, 0, top, 1, '#4a3f3e', [], { mat: MAT.acoustic, thick: 0.3, skirt: { h: 0.08, color: '#0b0b0d' } });
    { const fe = p.key === 'passW' ? 2 : 5; room.kit(P.lightboxKit(1.0, 1.5), cx, 0.9, p.z0 + 0.001, 0); room.tex(posterTexture(FILMS[fe]), cx, 1.65, p.z0 + 0.07, 0, 1.0, 1.5, { emit: 1.2 }); L.area(cx, 1.65, p.z0 + 0.3, [0.5, 0, 0], [0, 0.75, 0], [0, 0, 1], '#fff0e0', 0.8, 3.5, 'f', 2, 2); }   // end-of-corridor poster case
    for (let z = p.z0 + 1.6; z < zIn - 0.8; z += 2.6) { const x = (p.x0 + p.x1) / 2; room.box(x - 0.07, top - 0.01, z - 0.07, x + 0.07, top - 0.002, z + 0.07, '#fff0d8', { glow: true, grp: 0, faces: 'ny' }); L.spot(x, top - 0.1, z, '#ffd2a2', 3.2, 7, 'f', [0, -1, 0], 28, 65); }
    L.ambient('#ffe2c8', '#a08a7c', 0.15, 'f');
    return room;
  });
}
