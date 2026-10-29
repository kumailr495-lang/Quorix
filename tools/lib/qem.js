// Colour-aware quadric-error edge-collapse decimation (Garland-Heckbert 1998, position + attribute quadrics)
// for closed manifold triangle meshes, with link-condition and normal-flip checks.
// opts: attr (Float64Array nv*attrDim, e.g. zone colour), attrDim, attrWeight, maxCost
export function decimate(P0, F0, targetTris, opts = {}) {
  const ad = opts.attr ? (opts.attrDim ?? 3) : 0, D = 3 + ad, w = opts.attrWeight ?? 6, maxCost = opts.maxCost ?? Infinity;
  const nv = P0.length / 3, nf = F0.length / 3, F = Int32Array.from(F0);
  const X = new Float64Array(nv * D);
  for (let v = 0; v < nv; v++) { X[v*D] = P0[3*v]; X[v*D+1] = P0[3*v+1]; X[v*D+2] = P0[3*v+2]; for (let i = 0; i < ad; i++) X[v*D+3+i] = w * opts.attr[v*ad+i]; }
  const alive = new Uint8Array(nf).fill(1), vdead = new Uint8Array(nv), ver = new Int32Array(nv);
  const vf = Array.from({ length: nv }, () => new Set());
  for (let t = 0; t < nf; t++) for (let k = 0; k < 3; k++) vf[F[3*t+k]].add(t);
  const QS = D * D + D + 1, Q = new Float64Array(nv * QS);
  const e1 = new Float64Array(D), e2 = new Float64Array(D), p0 = new Float64Array(D);
  for (let t = 0; t < nf; t++) {
    const a = F[3*t], b = F[3*t+1], c = F[3*t+2];
    let l1 = 0; for (let i = 0; i < D; i++) { p0[i] = X[a*D+i]; e1[i] = X[b*D+i] - p0[i]; l1 += e1[i]*e1[i]; }
    l1 = Math.sqrt(l1); if (l1 < 1e-12) continue; for (let i = 0; i < D; i++) e1[i] /= l1;
    let dot = 0; for (let i = 0; i < D; i++) { e2[i] = X[c*D+i] - p0[i]; dot += e2[i]*e1[i]; }
    let l2 = 0; for (let i = 0; i < D; i++) { e2[i] -= dot*e1[i]; l2 += e2[i]*e2[i]; }
    l2 = Math.sqrt(l2); if (l2 < 1e-12) continue; for (let i = 0; i < D; i++) e2[i] /= l2;
    const ux = P0[3*b]-P0[3*a], uy = P0[3*b+1]-P0[3*a+1], uz = P0[3*b+2]-P0[3*a+2], vx = P0[3*c]-P0[3*a], vy = P0[3*c+1]-P0[3*a+1], vz = P0[3*c+2]-P0[3*a+2];
    const imp = opts.importance ? (opts.importance[a] + opts.importance[b] + opts.importance[c]) / 3 : 1;
    const area = imp * 0.5 * Math.hypot(uy*vz-uz*vy, uz*vx-ux*vz, ux*vy-uy*vx); if (area < 1e-12) continue;
    let pe1 = 0, pe2 = 0, pp = 0; for (let i = 0; i < D; i++) { pe1 += p0[i]*e1[i]; pe2 += p0[i]*e2[i]; pp += p0[i]*p0[i]; }
    for (const vtx of [a, b, c]) {
      const o = vtx * QS;
      for (let i = 0; i < D; i++) { for (let j = 0; j < D; j++) Q[o+i*D+j] += area * ((i === j ? 1 : 0) - e1[i]*e1[j] - e2[i]*e2[j]); Q[o+D*D+i] += area * (pe1*e1[i] + pe2*e2[i] - p0[i]); }
      Q[o+D*D+D] += area * (pp - pe1*pe1 - pe2*pe2);
    }
  }
  const heap = [];
  const push = (e) => { heap.push(e); let i = heap.length - 1; while (i > 0) { const p = (i-1) >> 1; if (heap[p].c <= heap[i].c) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2*i+1, r = l+1; let s = i; if (l < heap.length && heap[l].c < heap[s].c) s = l; if (r < heap.length && heap[r].c < heap[s].c) s = r; if (s === i) break; [heap[s], heap[i]] = [heap[i], heap[s]]; i = s; } } return top; };
  const q = new Float64Array(QS), M = new Float64Array(D * (D + 1)), xs = new Float64Array(D), cand = new Float64Array(D);
  const err = (x) => { let e = q[D*D+D]; for (let i = 0; i < D; i++) { let s = 0; for (let j = 0; j < D; j++) s += q[i*D+j]*x[j]; e += x[i]*s + 2*q[D*D+i]*x[i]; } return e; };
  const edgeCost = (u, v) => {
    for (let i = 0; i < QS; i++) q[i] = Q[u*QS+i] + Q[v*QS+i];
    const mid = new Float64Array(D); for (let i = 0; i < D; i++) mid[i] = (X[u*D+i] + X[v*D+i]) / 2;
    let tr = 0; for (let i = 0; i < D; i++) tr += q[i*D+i]; const eps = 1e-5 * tr / D + 1e-12;
    for (let i = 0; i < D; i++) { for (let j = 0; j < D; j++) M[i*(D+1)+j] = q[i*D+j] + (i === j ? eps : 0); M[i*(D+1)+D] = -q[D*D+i] + eps * mid[i]; }
    let ok = true;
    for (let c = 0; c < D && ok; c++) {
      let piv = c, best = Math.abs(M[c*(D+1)+c]); for (let r = c + 1; r < D; r++) { const a = Math.abs(M[r*(D+1)+c]); if (a > best) { best = a; piv = r; } }
      if (best < 1e-14) { ok = false; break; }
      if (piv !== c) for (let j = 0; j <= D; j++) { const t = M[c*(D+1)+j]; M[c*(D+1)+j] = M[piv*(D+1)+j]; M[piv*(D+1)+j] = t; }
      for (let r = 0; r < D; r++) { if (r === c) continue; const f = M[r*(D+1)+c] / M[c*(D+1)+c]; if (f !== 0) for (let j = c; j <= D; j++) M[r*(D+1)+j] -= f * M[c*(D+1)+j]; }
    }
    let bestX = null, bc = Infinity;
    if (ok) { for (let i = 0; i < D; i++) xs[i] = M[i*(D+1)+D] / M[i*(D+1)+i];
      const el = Math.hypot(X[u*D]-X[v*D], X[u*D+1]-X[v*D+1], X[u*D+2]-X[v*D+2]);
      if (Math.hypot(xs[0]-mid[0], xs[1]-mid[1], xs[2]-mid[2]) <= el * 1.5 && xs.every(Number.isFinite)) { bc = err(xs); bestX = Float64Array.from(xs); } }
    for (const which of [0, 1, 2]) { for (let i = 0; i < D; i++) cand[i] = which === 0 ? X[u*D+i] : which === 1 ? X[v*D+i] : mid[i]; const ec = err(cand); if (ec < bc - 1e-12) { bc = ec; bestX = Float64Array.from(cand); } }
    return { c: Math.max(0, bc), x: bestX };
  };
  const nbrs = (v) => { const s = new Set(); for (const t of vf[v]) for (let k = 0; k < 3; k++) { const o = F[3*t+k]; if (o !== v) s.add(o); } return s; };
  const seen = new Set();
  for (let t = 0; t < nf; t++) for (let k = 0; k < 3; k++) { const u = F[3*t+k], v = F[3*t+(k+1)%3]; const a = Math.min(u, v), b = Math.max(u, v), key = a * nv + b; if (seen.has(key)) continue; seen.add(key); const ec = edgeCost(a, b); push({ c: ec.c, u: a, v: b, vu: ver[a], vv: ver[b] }); }
  const pos = (v, ov, p) => v === ov ? p : [X[v*D], X[v*D+1], X[v*D+2]];
  const triN = (t, ov, p) => { const a = pos(F[3*t], ov, p), b = pos(F[3*t+1], ov, p), c = pos(F[3*t+2], ov, p); const ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2]; return [uy*vz-uz*vy, uz*vx-ux*vz, ux*vy-uy*vx]; };
  let tris = nf, rejected = 0;
  const valid = (u, v, p) => {
    const nu = nbrs(u), nvv = nbrs(v); let common = 0; for (const o of nu) if (nvv.has(o)) common++;
    let shared = 0; for (const t of vf[u]) if (vf[v].has(t)) shared++;
    if (shared !== 2 || common !== 2) return false;
    for (const [src, ov] of [[vf[u], u], [vf[v], v]]) for (const t of src) {
      if (vf[u].has(t) && vf[v].has(t)) continue;
      const a = triN(t, -1, null), b = triN(t, ov, p); const la = Math.hypot(a[0], a[1], a[2]), lb = Math.hypot(b[0], b[1], b[2]);
      if (lb < 1e-10 || la < 1e-12) return false; if ((a[0]*b[0]+a[1]*b[1]+a[2]*b[2]) / (la*lb) < 0.2) return false;
    }
    return true;
  };
  while (tris > targetTris && heap.length) {
    const e = pop(); if (vdead[e.u] || vdead[e.v] || ver[e.u] !== e.vu || ver[e.v] !== e.vv) continue; if (e.c > maxCost) break;
    const ec = edgeCost(e.u, e.v); if (Math.abs(ec.c - e.c) > 1e-9 * (1 + e.c)) { push({ c: ec.c, u: e.u, v: e.v, vu: ver[e.u], vv: ver[e.v] }); continue; }
    if (!valid(e.u, e.v, [ec.x[0], ec.x[1], ec.x[2]])) { rejected++; continue; }
    const { u, v } = e;
    for (const t of [...vf[u]]) if (vf[v].has(t)) { alive[t] = 0; tris--; for (let k = 0; k < 3; k++) vf[F[3*t+k]].delete(t); }
    for (const t of [...vf[v]]) { for (let k = 0; k < 3; k++) if (F[3*t+k] === v) F[3*t+k] = u; vf[u].add(t); }
    vf[v].clear(); vdead[v] = 1; for (let i = 0; i < D; i++) X[u*D+i] = ec.x[i];
    for (let i = 0; i < QS; i++) Q[u*QS+i] += Q[v*QS+i]; ver[u]++;
    for (const o of nbrs(u)) { const a = Math.min(u, o), b = Math.max(u, o); const c2 = edgeCost(a, b); push({ c: c2.c, u: a, v: b, vu: ver[a], vv: ver[b] }); }
  }
  const remap = new Int32Array(nv).fill(-1); const outP = [], outF = [];
  for (let t = 0; t < nf; t++) { if (!alive[t]) continue; for (let k = 0; k < 3; k++) { const v = F[3*t+k]; if (remap[v] < 0) { remap[v] = outP.length / 3; outP.push(X[v*D], X[v*D+1], X[v*D+2]); } outF.push(remap[v]); } }
  return { P: Float64Array.from(outP), F: Int32Array.from(outF), rejected };
}
