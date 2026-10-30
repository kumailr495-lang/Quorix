// LUMIERE v8 - the film is shown by the phone's own video layer, not by WebGL (phone feedback on v7: "the movie is not playing in its full quality").
// The <video> element sits under the 3D canvas; the screen's picture area is drawn into the canvas as a transparent hole (PIC_FRAG uHole), and
// every frame the element is moved with a CSS perspective transform (a homography) onto the four corners of that picture area. So:
//   * the picture is decoded and scaled once by the phone at its real resolution (no texture upload, no mipmaps, no tone curve on it);
//   * heads, seat backs and the curtain in front of the screen still cover it, because they are drawn opaque over the hole;
//   * streamed films without CORS headers (archive.org) can play: the picture never has to enter WebGL.
// On a curved screen the corners are joined by straight edges while the hole is curved: the video is a little larger than the hole at the top
// and bottom centre and that margin stays hidden under the canvas. When a corner is behind the camera (standing beside the screen) the
// layer hides and the hole closes (the screen shows dark) until the corners are in front again.
import * as THREE from 'three';
const P = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()], V = new THREE.Vector3();
export class VideoLayer {
  constructor(video) {
    this.v = video; this.on = false; this.W = 1600; this.H = 900; this.css = '';
    const s = video.style; s.display = 'block'; s.position = 'fixed'; s.left = '0'; s.top = '0'; s.transformOrigin = '0 0'; s.zIndex = '0'; s.pointerEvents = 'none'; s.background = '#000'; s.objectFit = 'fill'; s.visibility = 'hidden'; s.width = this.W + 'px'; s.height = this.H + 'px';
    video.addEventListener('loadedmetadata', () => { const a = (video.videoWidth / video.videoHeight) || 16 / 9; this.H = Math.round(this.W / a); s.height = this.H + 'px'; this.css = ''; });
  }
  hide() { if (this.on) { this.on = false; this.v.style.visibility = 'hidden'; } return false; }
  // corners: picture area in world space (top-left, top-right, bottom-right, bottom-left). Returns false when the layer cannot be shown.
  update(camera, corners, vw, vh) {
    camera.updateMatrixWorld(); const near = camera.near * 1.5;
    for (let i = 0; i < 4; i++) { V.copy(corners[i]).applyMatrix4(camera.matrixWorldInverse); if (-V.z < near) return this.hide(); P[i].copy(corners[i]).project(camera); P[i].x = (P[i].x + 1) * 0.5 * vw; P[i].y = (1 - P[i].y) * 0.5 * vh; }
    const m = homography(P, this.W, this.H); if (!m) return this.hide();
    const css = 'matrix3d(' + m.map((x) => x.toFixed(6)).join(',') + ')'; if (css !== this.css) { this.css = css; this.v.style.transform = css; }
    if (!this.on) { this.on = true; this.v.style.visibility = 'visible'; }
    return true;
  }
}
// maps the element's box (0,0)-(W,H) onto the quad p0..p3 (Heckbert's square-to-quad), returned as a CSS matrix3d (column-major)
function homography(p, W, H) {
  const [a0, a1, a2, a3] = p, dx1 = a1.x - a2.x, dx2 = a3.x - a2.x, dx3 = a0.x - a1.x + a2.x - a3.x, dy1 = a1.y - a2.y, dy2 = a3.y - a2.y, dy3 = a0.y - a1.y + a2.y - a3.y;
  const den = dx1 * dy2 - dx2 * dy1; if (Math.abs(den) < 1e-9) return null;
  const g = (dx3 * dy2 - dx2 * dy3) / den, h = (dx1 * dy3 - dx3 * dy1) / den;
  const a = a1.x - a0.x + g * a1.x, b = a3.x - a0.x + h * a3.x, c = a0.x, d = a1.y - a0.y + g * a1.y, e = a3.y - a0.y + h * a3.y, f = a0.y;
  return [a / W, d / W, 0, g / W, b / H, e / H, 0, h / H, 0, 0, 1, 0, c, f, 0, 1];
}
// the picture rectangle (uBox inside the screen) in world space, from the hall's screen surface function ptAt(t, y)
export function pictureCorners(hall, box, out = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()]) {
  const c = hall.cfg, y0 = c.centreY - c.H / 2, at = (u, v, o) => o.fromArray(hall.ptAt(u, y0 + v * c.H));
  at(box.x, box.y + box.w, out[0]); at(box.x + box.z, box.y + box.w, out[1]); at(box.x + box.z, box.y, out[2]); at(box.x, box.y, out[3]);
  return out;
}
