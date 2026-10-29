#!/usr/bin/env python3
"""Dev-only software preview of a GLB (painter's algorithm, vertex colours + smooth normals). NOT an engine render."""
import sys, json, struct, math, numpy as np
import matplotlib; matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.collections import PolyCollection
def load(path):
    b = open(path, "rb").read(); L = struct.unpack("<I", b[12:16])[0]; j = json.loads(b[20:20+L]); off = 20 + L + 8; bin_ = b[off:]
    def acc(i):
        a = j["accessors"][i]; v = j["bufferViews"][a["bufferView"]]; ct = {5126: "<f4", 5121: "u1", 5123: "<u2", 5125: "<u4"}[a["componentType"]]
        n = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4}[a["type"]]
        return np.frombuffer(bin_, dtype=ct, count=a["count"] * n, offset=v["byteOffset"]).reshape(-1, n)
    out = []
    for m in j["meshes"]:
        p = m["primitives"][0]; at = p["attributes"]
        out.append(dict(name=m["name"], pos=acc(at["POSITION"]).astype(float), nrm=acc(at["NORMAL"]).astype(float), col=acc(at["COLOR_0"]).astype(float)[:, :3], idx=acc(p["indices"]).reshape(-1, 3).astype(int)))
    return out
def view(P, az, pitch):
    """camera at azimuth az (0 = in front of the model on +Z), elevated by pitch degrees; returns screen x, screen y, depth(far=larger)"""
    a = math.radians(az); t = math.radians(pitch)
    xs = P[:, 0]*math.cos(a) - P[:, 2]*math.sin(a); zd = -(P[:, 0]*math.sin(a) + P[:, 2]*math.cos(a))
    ys = P[:, 1]*math.cos(t) + zd*math.sin(t); dp = zd*math.cos(t) - P[:, 1]*math.sin(t)
    return np.stack([xs, ys, dp], 1)
def draw(ax, ms, yaw, pitch, lim):
    L = np.array([0.5, 0.8, 0.6]); L /= np.linalg.norm(L); Lv = view(L[None], yaw, pitch)[0]
    polys, cols, dep = [], [], []
    for m in ms:
        V = view(m["pos"], yaw, pitch); N = view(m["nrm"], yaw, pitch)
        for t in m["idx"]:
            n = N[t].mean(0); n /= np.linalg.norm(n) + 1e-9
            if n[2] > 0.15: continue
            lam = max(0, n @ Lv); c = np.clip(m["col"][t].mean(0) * (0.35 + 0.95 * lam), 0, 1) ** (1/2.2)
            polys.append(V[t][:, :2]); cols.append(c); dep.append(V[t][:, 2].mean())
    o = np.argsort(dep)[::-1]
    ax.add_collection(PolyCollection([polys[i] for i in o], facecolors=[cols[i] for i in o], edgecolors=[cols[i] for i in o], linewidths=0.3, antialiaseds=False))
    ax.set_xlim(-lim[0], lim[0]); ax.set_ylim(lim[1], lim[2]); ax.set_aspect("equal"); ax.axis("off")
if __name__ == "__main__":
    path, out = sys.argv[1], sys.argv[2]; lim = (float(sys.argv[3]), float(sys.argv[4]), float(sys.argv[5])) if len(sys.argv) > 5 else (0.75, -0.02, 1.25)
    ms = load(path); lods = [m for m in ms if "_LOD" in m["name"]] or ms
    fig, axs = plt.subplots(2, len(lods), figsize=(4.2*len(lods), 8.4), facecolor="#cfd0d6", squeeze=False)
    for i, m in enumerate(lods):
        draw(axs[0][i], [m], 32, 14, lim); axs[0][i].set_title(f"{m['name']}  {len(m['idx'])} tris", fontsize=9)
        draw(axs[1][i], [m], 100, 6, lim)
    plt.tight_layout(); plt.savefig(out, dpi=100)
