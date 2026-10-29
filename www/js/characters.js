// Runtime NPC bodies: SkinnedMesh built from the generated GLBs (skin weights baked in, skeleton JSON in the GLB extras) + procedural pose layer.
import * as THREE from 'three';
import { makePose, compose, applyLook, BONE_NAMES } from './anim.js';
import { FACE_IDS } from './faces.js';
export const NPC_IDS = ['receptionist', 'usher', 'bartender', 'patron-m1', 'patron-m2', 'patron-f1', 'patron-f2', 'patron-f3', 'patron-m3'];
export function parseNPC(gltf, id) {
  const geoms = [null, null, null]; gltf.scene.traverse((o) => { if (o.isMesh) for (let i = 0; i < 3; i++) if (o.name === `lumiere-npc-${id}_LOD${i}`) geoms[i] = o.geometry; });
  if (!geoms[0] || !gltf.userData.skeleton) throw new Error('bad NPC model ' + id);
  const fi = FACE_IDS.indexOf(id), sc = gltf.userData.skeleton.scale || 1;   // painted face: atlas cell + bind-pose scale for the people shader
  for (const g of geoms) if (g) { const n = g.attributes.position.count, a = new Float32Array(n * 2); for (let k = 0; k < n; k++) { a[2 * k] = fi; a[2 * k + 1] = fi >= 0 ? sc : 0; } g.setAttribute('faceinfo', new THREE.BufferAttribute(a, 2)); }
  return { id, geoms, skeleton: gltf.userData.skeleton };
}
export class Character {
  constructor(def, material) {
    this.def = def; this.group = new THREE.Group(); const sk = def.skeleton, sc = this.scale = sk.scale, k = sc * 0.01;
    this.bones = sk.bones.map((b) => { const bone = new THREE.Bone(); bone.name = b.name; return bone; }); this.by = {};
    sk.bones.forEach((b, i) => { const pp = b.parent >= 0 ? sk.bones[b.parent].pos : [0, 0, 0]; this.bones[i].position.set((b.pos[0] - pp[0]) * k, (b.pos[1] - pp[1]) * k, (b.pos[2] - pp[2]) * k); if (b.parent >= 0) this.bones[b.parent].add(this.bones[i]); this.by[b.name] = this.bones[i]; });
    this.hipsBase = this.by.hips.position.clone();
    this.mesh = new THREE.SkinnedMesh(def.geoms[0], material); this.mesh.add(this.bones[0]); this.group.add(this.mesh); this.group.updateMatrixWorld(true);
    this.skeleton = new THREE.Skeleton(this.bones); this.mesh.bind(this.skeleton); this.mesh.frustumCulled = true;
    this.pose = makePose(); this.cur = {}; for (const n of BONE_NAMES) this.cur[n] = [0, 0, 0]; this.hy = 0; this.hz = 0; this.lod = 0; this.t = Math.random() * 100; this.seed = Math.random() * 6.28;
    this.sitDrop = 0.36; this.base = 'stand'; this.gesture = 'none'; this.phase = 0; this.speed = 0; this.lookYaw = 0; this.lookPitch = 0; this.lookAmt = 0; this.snap = true;
  }
  setLOD(i) { if (i !== this.lod && this.def.geoms[i]) { this.lod = i; this.mesh.geometry = this.def.geoms[i]; } }
  update(dt) {
    this.t += dt; compose(this.pose, this.base, this.gesture, this.t, this.phase, this.seed, this.speed); if (this.base === 'sit') this.pose.hipsY += 0.36 - this.sitDrop; if (this.lookAmt > 0) applyLook(this.pose, this.lookYaw, this.lookPitch, this.lookAmt);
    const a = this.snap ? 1 : 1 - Math.exp(-dt * 9); this.snap = false;
    for (let i = 0; i < BONE_NAMES.length; i++) { const n = BONE_NAMES[i], g = this.pose.b[n], c = this.cur[n]; c[0] += (g[0] - c[0]) * a; c[1] += (g[1] - c[1]) * a; c[2] += (g[2] - c[2]) * a; this.by[n].rotation.set(c[0], c[1], c[2]); }
    this.hy += (this.pose.hipsY - this.hy) * a; this.hz += (this.pose.hipsZ - this.hz) * a; this.by.hips.position.set(this.hipsBase.x, this.hipsBase.y + this.hy * this.scale, this.hipsBase.z + this.hz * this.scale);
  }
}
