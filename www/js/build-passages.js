// LUMIERE v5 - light-lock passages between the concourse and the halls: dim, matte black, LED floor lines, a door on each side at the far end.
import * as THREE from 'three';
import { Room } from './room.js';
import { MAT } from './geom.js';
import { PASSAGES, DOOR_W, DOOR_H, hallById, CONC } from './layout.js';
import { signTexture } from './textures.js';
export function buildPassages(ctx) {
  return PASSAGES.map((p) => {
    const room = new Room(p.key, { ceil: p.h, rect: [p.x0, p.z0, p.x1, p.z1], soft: 0.4 }), L = room.lights, top = p.h, zIn = CONC.z0 - 0.3;   // zIn: inner face of the wall the door sits in
    room.flat(p.x0, p.z0, p.x1, zIn, 0, true, '#1b1b21', { mat: MAT.hallCarpet });
    room.flat(p.x0, p.z0, p.x1, zIn, top, false, '#0e0e11', { mat: MAT.paint });
    for (const [x, dir, hall] of [[p.x0, 1, p.doors.find((d) => d.x < (p.x0 + p.x1) / 2)], [p.x1, -1, p.doors.find((d) => d.x > (p.x0 + p.x1) / 2)]]) {
      const gaps = hall ? [[hall.z - DOOR_W / 2, hall.z + DOOR_W / 2, DOOR_H]] : [];
      room.wall('z', x, p.z0, zIn, 0, top, dir, '#17171b', gaps, { mat: MAT.acoustic, thick: 0.3, skirt: { h: 0.08, color: '#0b0b0d' } });
      // LED floor line along the wall (stops at the door), lights the carpet
      const segs = hall ? [[p.z0 + 0.1, hall.z - DOOR_W / 2 - 0.1], [hall.z + DOOR_W / 2 + 0.1, zIn - 0.1]] : [[p.z0 + 0.1, zIn - 0.1]];
      for (const [a, b] of segs) { if (b - a < 0.2) continue; room.glowBox(dir > 0 ? x + 0.015 : x - 0.03, 0.09, a, dir > 0 ? x + 0.03 : x - 0.015, 0.105, b, '#ffc690', 1.6, 0, dir > 0 ? 'px py' : 'nx py'); L.line(x + dir * 0.12, 0.12, a, x + dir * 0.12, 0.12, b, '#ffc690', 0.22, 1.6, 'f'); }
      if (hall) { const H = hallById(hall.hall); // number sign above the door, lit
        room.tex(signTexture(H.name, 512, 96, { color: '#ffffff', size: 0.5, weight: 600, spacing: 0.18 }), x + dir * 0.012, DOOR_H + 0.3, hall.z, dir > 0 ? Math.PI / 2 : -Math.PI / 2, 1.3, 0.24, { emit: 1.2, transparent: true });
        L.point(x + dir * 0.8, 2.4, hall.z, '#ffd9b0', 0.6, 3.5, 'f'); }
    }
    room.wall('x', p.z0, p.x0, p.x1, 0, top, 1, '#141418', [], { mat: MAT.acoustic, thick: 0.3 });
    for (let z = p.z0 + 1.6; z < zIn - 0.8; z += 2.6) { const x = (p.x0 + p.x1) / 2; room.box(x - 0.07, top - 0.01, z - 0.07, x + 0.07, top - 0.002, z + 0.07, '#fff0d8', { glow: true, grp: 0, faces: 'ny' }); L.spot(x, top - 0.1, z, '#ffd2a2', 1.6, 6, 'f', [0, -1, 0], 25, 60); }
    L.ambient('#8f8aa0', '#5c5866', 0.03, 'f');
    return room;
  });
}
