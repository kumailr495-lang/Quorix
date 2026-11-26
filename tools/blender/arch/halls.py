"""LUMIERE v9 - one complete auditorium as a model, from the hall spec (www/js/hallmath.js via tools/dev/export-spec.mjs).
Modelled in the hall's own frame: u across (+u = the viewer's right), y up from the front floor, d from the picture's centre line
towards the rear; geo.frame_y places it. Everything is a closed solid: walls with door reveals, a stepped rake with real aisle steps,
the masking wall that wraps the screen to both side walls (no empty sides, photo 3; v12b: the screen runs wall to wall, the exits are in the side walls), a light-lock
baffle at the entrance, and lights only where nothing crosses a seat: step nosings in the aisles, the walls and the ceiling."""
import math, random
from geo import Acc, Glow, Lights, MAT, lin, mix, frame_y, cross, sub

WALL, GAP = 0.4, 1.25   # wall thickness; picture plane -> screen wall

THEME = {
  'max': dict(wall='#121826', wall2='#0b0d12', ceil='#07080b', carpet='#1a2030', riser='#141824', accent='#2f7cff', warm='#ffb46b', wood='#5b3a24', mask='#050608', trim='#2a3140', step='#4d8dff', bay='#3d4556', frame='#8a8f99'),
  'curve': dict(wall='#141b33', wall2='#0d1224', ceil='#0a0e1c', carpet='#232a44', riser='#1a2038', accent='#c9a86a', warm='#ffd59e', wood='#6a4428', mask='#06070c', trim='#c9a86a', step='#ffcf8a', bay='#4b4660', frame='#c9a86a'),
  'classic': dict(wall='#5a1a24', wall2='#3a1118', ceil='#1c1c21', carpet='#3b1a20', riser='#2a1216', accent='#b08d57', warm='#ffd2a0', wood='#4a2a1a', mask='#080506', trim='#b08d57', step='#ffcf8a', cream='#e6d9c2', bay='#c7b597', frame='#b08d57'),
  # v14 after the user's ScreenX photo: black room, black ceiling with small lights, dark patterned carpet, red leather recliners, red accents
  'x270': dict(wall='#101115', wall2='#0b0c0f', ceil='#050506', carpet='#1b1e2a', riser='#15171d', accent='#a3242c', warm='#ffe2bf', wood='#2a2a2a', mask='#06070a', trim='#a3242c', step='#ff7a5c', panel='#2a2c31', bay='#3a3d44', frame='#6a6d73', screen='#c9ccd1'),
}

def up_quad(g, a, b, z0, z1, y, col, k):
    """glow strip lying flat (facing up) from a to b (points (u, d)), d-width z0..z1 relative to the line"""
    (ua, da), (ub, db) = (a, b) if a[0] > b[0] else (b, a)   # run towards -u so the face points up
    g.quad((ua, y, da + z0), (ub, y, db + z0), (ub, y, db + z1), (ua, y, da + z1), col, k)

def build_hall(h, L1):
    th = {k: lin(v) for k, v in THEME[h['format']].items()}
    f, W2, ceil, y0 = h['dir'], h['width'] / 2, h['ceil'], h['y0']
    T, R = frame_y(h['xPic'], y0, h['zc'], -f * math.pi / 2)
    acc, glow, occ, scr = Acc(), Glow(), Acc(), Acc()
    for o in (acc, glow, occ, scr): o.frame(T, R)
    lit = Lights([0, 0, 0, 0], y0 + ceil); lit.frame(T, R)
    rows, k = h['rows'], h['rowK'] or 0.0
    a0w, aW = h['aisle'][0], h['aisle'][1]
    depth, Dw, top = h['depthIn'], -GAP, h['total']
    def P(a, e):
        if not k: return (a, e)
        rr = e + k; t = a / rr; return (rr * math.sin(t), rr * math.cos(t) - k)
    def a_wall(e):
        if not k: return W2 + 0.06
        rr = e + k; return rr * math.asin(min(1.0, (W2 + 0.06) / rr))
    def floor_at(u, d):
        if k: rr = math.hypot(u, d + k); e = rr - k; a = rr * math.atan2(u, d + k)
        else: e, a = d, u
        r = 0
        while r < len(rows) - 1 and e >= rows[r + 1]['pf']: r += 1
        y = rows[r]['y']
        if abs(a) < a0w - 0.05 or r == len(rows) - 1: return y
        nx = rows[r + 1]; t = nx['pf'] - e
        if not nx['steps'] or t >= (nx['steps'] - 1) * nx['tread']: return y
        return y + (nx['steps'] - 1 - math.floor(t / nx['tread'])) * nx['riser'] / nx['steps']
    def flat(a_0, a_1, e_0, e_1, y, mat, col, nseg=1):
        """horizontal patch (facing up) between arcs e_0 < e_1 and arc lengths a_0 < a_1"""
        for i in range(nseg):
            aa, ab = a_0 + (a_1 - a_0) * i / nseg, a_0 + (a_1 - a_0) * (i + 1) / nseg
            p = [P(aa, e_0), P(ab, e_0), P(ab, e_1), P(aa, e_1)]
            acc.quad((p[0][0], y, p[0][1]), (p[3][0], y, p[3][1]), (p[2][0], y, p[2][1]), (p[1][0], y, p[1][1]), mat, col)
    def riser(a_0, a_1, e, ya, yb, mat, col, nseg=1):
        """vertical face along arc e, a_0 < a_1, facing the screen (towards smaller e)"""
        if yb - ya < 1e-4: return
        for i in range(nseg):
            aa, ab = a_0 + (a_1 - a_0) * i / nseg, a_0 + (a_1 - a_0) * (i + 1) / nseg
            p, q = P(aa, e), P(ab, e)
            acc.quad((q[0], ya, q[1]), (p[0], ya, p[1]), (p[0], yb, p[1]), (q[0], yb, q[1]), mat, col)
    def band(sg, e_0, e_1, y, mat, col):
        """aisle band from the aisle's inner edge to the side wall, flat at y, facing up"""
        pA, pB = P(sg * a0w, e_0), P(sg * a0w, e_1); pC, pD = P(sg * a_wall(e_0), e_0), P(sg * a_wall(e_1), e_1)
        pts = [(pA[0], y, pA[1]), (pC[0], y, pC[1]), (pD[0], y, pD[1]), (pB[0], y, pB[1])]
        if sg > 0: acc.quad(pts[0], pts[3], pts[2], pts[1], mat, col)
        else: acc.quad(pts[0], pts[1], pts[2], pts[3], mat, col)
    def side(a, e_0, e_1, ya, yb, face, mat, col):
        """vertical face along a = const (an aisle edge) from arc e_0 to e_1, facing +a (face 1) or -a (face -1): the side of an aisle step
        that stands above the seat platform beside it (v9 see-through test: without it you looked under the step from the seats)"""
        if yb - ya < 1e-4: return
        p, q = P(a, e_0), P(a, e_1); m0, m1 = P(a, (e_0 + e_1) / 2), P(a + 0.01, (e_0 + e_1) / 2); ndu, ndd = (m1[0] - m0[0]) * face, (m1[1] - m0[1]) * face
        A, B, C, D = (p[0], ya, p[1]), (q[0], ya, q[1]), (q[0], yb, q[1]), (p[0], yb, p[1])
        nu_, nd_ = (B[1] - A[1]) * (D[2] - A[2]) - (B[2] - A[2]) * (D[1] - A[1]), (B[0] - A[0]) * (D[1] - A[1]) - (B[1] - A[1]) * (D[0] - A[0])
        if nu_ * ndu + nd_ * ndd < 0: acc.quad(A, D, C, B, mat, col)
        else: acc.quad(A, B, C, D, mat, col)
    def nosing(sg, e, y):
        p, q = P(sg * (a0w + 0.12), e), P(sg * (aW - 0.12), e)
        up_quad(glow, p, q, 0.012, 0.042, y + 0.004, th['step'], 1.6)
    nC = 18 if k else 1
    carpet, rcol = th['carpet'], th['riser']
    # ---------------------------------------------------------------- structure (closed solids)
    acc.box(-W2 - WALL, -0.35, Dw - WALL, W2 + WALL, 0.0, depth + WALL, MAT['hallCarpet'], carpet)
    acc.box(-W2 - WALL, ceil, Dw - WALL, W2 + WALL, ceil + 0.36, depth + WALL, MAT['paint'], th['ceil'])
    ent = h['entryU']
    # v12b (the user, 11-18: "move the exit door to not on the front of the screen"): the screen wall is closed; the exits are in the side
    # walls (building.js h.exits: d0..d1 along the wall), each opening the door's width + 2 x 12 cm of frame, 2.52 m high (door 2.4 + head)
    acc.wall((W2 + WALL, Dw - WALL / 2), (-W2 - WALL, Dw - WALL / 2), -0.35, ceil + 0.36, WALL, MAT['paint'], th['wall2'])
    EX = {e['sg']: e for e in h['exits']}
    acc.wall((-W2 - WALL, depth + WALL / 2), (W2 + WALL, depth + WALL / 2), -0.35, ceil + 0.36, WALL, MAT['paint'], th['wall2'],
             openings=[(WALL + W2 + ent - 0.95, WALL + W2 + ent + 0.95, top + 2.5, top)])
    for sg in (-1, 1):
        e_ = EX[sg]; o0 = e_['d0'] - 0.12 - (Dw - WALL)
        acc.wall((sg * (W2 + WALL / 2), Dw - WALL), (sg * (W2 + WALL / 2), depth + WALL), -0.35, ceil + 0.36, WALL, MAT['acoustic'], th['wall'], trim=(WALL, WALL),
                 openings=[(o0, o0 + 1.8 + 0.24, 2.52, -0.35)])   # v11: between the end walls (over their corners they shared their faces); v12b: the exit
    # ---------------------------------------------------------------- the rake
    n = len(rows)
    for r in range(1, n):
        y, yp, e0 = rows[r]['y'], rows[r - 1]['y'], rows[r]['pf']
        e1 = rows[r + 1]['pf'] if r + 1 < n else depth
        nx = rows[r + 1] if r + 1 < n else None
        kst = nx['steps'] if nx else 0; tr = nx['tread'] if nx else 0.3
        flat_end = (e1 - (kst - 1) * tr) if kst > 1 else e1
        if r == n - 1 and k:
            # last row + rear aisle of a curved-row hall: from the row's arc to the straight rear wall in one polygon, so the rear corners
            # (outside the last arc) are floor too (the see-through gate found a 4.7 m pit there)
            # v14 its front edge runs exactly along the risers below it (the aisle risers are one chord, the middle one nC chords): an arc
            # there left a sliver over the chords that showed the risers' backs (see-through test, top step of CURVE and X-270)
            ea = a_wall(e0); arc = [P(-ea, e0)] + [P(-a0w + 2 * a0w * i / nC, e0) for i in range(nC + 1)] + [P(ea, e0)]
            pg = arc + [(W2 + 0.06, depth), (-W2 - 0.06, depth)]
            ar = sum(pg[i][0] * pg[(i + 1) % len(pg)][1] - pg[(i + 1) % len(pg)][0] * pg[i][1] for i in range(len(pg)))
            if ar > 0: pg = pg[::-1]
            acc.poly([(u, y, d) for u, d in pg], MAT['hallCarpet'], carpet)
        else:
            flat(-a0w, a0w, e0, e1, y, MAT['hallCarpet'], carpet, nC)
        for sg in (-1, 1):
            if not (r == n - 1 and k): band(sg, e0, flat_end, y, MAT['hallCarpet'], carpet)
            for j in range(1, kst):
                ea, eb = e1 - (kst - j) * tr, e1 - (kst - j - 1) * tr; yy = y + j * nx['riser'] / kst
                band(sg, ea, eb, yy, MAT['hallCarpet'], carpet)
                aa, ab = (a0w, a_wall(ea)) if sg > 0 else (-a_wall(ea), -a0w)
                riser(aa, ab, ea, yy - nx['riser'] / kst, yy, MAT['hallCarpet'], rcol)
                side(sg * a0w, ea, eb, y, yy, -sg, MAT['hallCarpet'], rcol)
                nosing(sg, ea, yy)
        kk = rows[r]['steps']
        riser(-a0w, a0w, e0, yp, y, MAT['hallCarpet'], rcol, nC)
        for sg in (-1, 1):
            ya = y - rows[r]['riser'] / kk if kk > 1 else yp
            aa, ab = (a0w, a_wall(e0)) if sg > 0 else (-a_wall(e0), -a0w)
            riser(aa, ab, e0, ya, y, MAT['hallCarpet'], rcol)
            nosing(sg, e0, y)
    # aisle steps up to row B, carved out of the front floor
    r1 = rows[1]; kk = r1['steps']; tr = r1['tread']
    for sg in (-1, 1):
        for j in range(1, kk):
            ea, eb = r1['pf'] - (kk - j) * tr, r1['pf'] - (kk - j - 1) * tr; yy = j * r1['riser'] / kk
            band(sg, ea, eb, yy, MAT['hallCarpet'], carpet)
            aa, ab = (a0w, a_wall(ea)) if sg > 0 else (-a_wall(ea), -a0w)
            riser(aa, ab, ea, yy - r1['riser'] / kk, yy, MAT['hallCarpet'], rcol)
            side(sg * a0w, ea, eb, 0.0, yy, -sg, MAT['hallCarpet'], rcol)
            nosing(sg, ea, yy)
    # ---------------------------------------------------------------- pod tier parapet (MAX): solid walnut wall with warm underglow
    for r in range(1, n):
        if rows[r]['lift'] > 0:
            e0 = rows[r]['pf']; yb = rows[r - 1]['y']; ytop = rows[r]['y'] + 0.6; segs = 24 if k else 1   # v14 0.6 (was 0.82): a reclined eye in the pods saw its top over the picture
            for i in range(segs):
                aa, ab = -a0w + 2 * a0w * i / segs, -a0w + 2 * a0w * (i + 1) / segs
                p0, p1, p2, p3 = P(aa, e0 - 0.02), P(ab, e0 - 0.02), P(ab, e0 + 0.16), P(aa, e0 + 0.16)
                acc.prism([(p0[0], p0[1]), (p1[0], p1[1]), (p2[0], p2[1]), (p3[0], p3[1])], yb, ytop, MAT['wood'], th['wood'])
                q0, q1, q2, q3 = P(aa, e0 - 0.05), P(ab, e0 - 0.05), P(ab, e0 + 0.19), P(aa, e0 + 0.19)
                acc.prism([(q0[0], q0[1]), (q1[0], q1[1]), (q2[0], q2[1]), (q3[0], q3[1])], ytop, ytop + 0.05, MAT['leather'], lin('#2a1a12'))
            for sg in (-1, 1):
                p, q = P(sg * 0.2, e0 - 0.03), P(sg * (a0w - 0.2), e0 - 0.03)
                g0, g1 = (q, p) if sg > 0 else (p, q)   # runs towards -u: the strip faces the screen (-d)
                glow.quad((g0[0], yb + 0.06, g0[1]), (g1[0], yb + 0.06, g1[1]), (g1[0], yb + 0.1, g1[1]), (g0[0], yb + 0.1, g0[1]), th['warm'], 1.3)
                lit.line((p[0], yb + 0.1, p[1] - 0.1), (q[0], yb + 0.1, q[1] - 0.1), th['warm'], 0.35, 3.5, 'f')
    # ---------------------------------------------------------------- the front (v9.1b). The picture runs nearly wall to wall (the user: "the
    # screens are so small"); the masking wraps it to both side walls, with an exit portal at each front corner beside the picture (the
    # user preferred these older exits to v9.1's open bays): a lit EXIT sign over the portal, the push-bar door in the screen wall behind it
    Wp, hB, Hp, Rs = h['W'] / 2, h['hB'], h['H'], h['R']; fmt0 = h['format']
    def sd(u): return (Rs - math.sqrt(max(0.0, Rs * Rs - u * u))) if Rs else 0.0
    def sd1(u): return (u / math.sqrt(max(1e-6, Rs * Rs - u * u))) if Rs else 0.0   # slope of the curve, d(sd)/du
    md = lambda u: sd(u) + 0.04
    PU, BAY_H = W2 + 1.0, 0.0   # v12b: no portals in the masking any more (the exits are in the side walls): the picture runs wall to wall
    us = sorted(set([-W2 - 0.05, W2 + 0.05, -Wp, Wp, -PU, PU] + [(-Wp + 2 * Wp * i / 24) for i in range(25)]
                    + [sg * (Wp + (PU - Wp) * i / 4) for i in range(5) for sg in (-1, 1)] + [sg * (PU + (W2 - PU) * i / 6) for i in range(7) for sg in (-1, 1)]))
    us = [u for u in us if -W2 - 0.06 <= u <= W2 + 0.06]
    ys = sorted(set([0.0, BAY_H, hB, hB + Hp, ceil]))
    for i in range(len(us) - 1):
        ua, ub = us[i], us[i + 1]; um = (ua + ub) / 2; da, db = md(ua), md(ub)
        if ub - ua < 1e-4: continue
        for j in range(len(ys) - 1):
            ya, yb = ys[j], ys[j + 1]; ym = (ya + yb) / 2
            if abs(um) < Wp and hB <= ym <= hB + Hp: continue
            if abs(um) > PU and ym < BAY_H: continue
            acc.quad((ub, ya, db), (ub, yb, db), (ua, yb, da), (ua, ya, da), MAT['velvet'], th['mask'])
            acc.quad((ua, ya, da - 0.06), (ua, yb, da - 0.06), (ub, yb, db - 0.06), (ub, ya, db - 0.06), MAT['velvet'], th['mask'])
        if abs(um) < Wp:   # picture sill (faces up) and head (faces down)
            acc.quad((ua, hB, da), (ub, hB, db), (ub, hB, db - 0.06), (ua, hB, da - 0.06), MAT['velvet'], th['mask'])
            acc.quad((ua, hB + Hp, da - 0.06), (ub, hB + Hp, db - 0.06), (ub, hB + Hp, db), (ua, hB + Hp, da), MAT['velvet'], th['mask'])
        if abs(um) > PU:   # the bay mouth's head (faces down)
            acc.quad((ua, BAY_H, da - 0.06), (ub, BAY_H, db - 0.06), (ub, BAY_H, db), (ua, BAY_H, da), MAT['velvet'], th['mask'])
    def jamb(u, ya, yb, face):   # vertical reveal at u facing +u (face 1) or -u (face -1)
        d = md(u)
        if face > 0: acc.quad((u, ya, d - 0.06), (u, yb, d - 0.06), (u, yb, d), (u, ya, d), MAT['velvet'], th['mask'])
        else: acc.quad((u, ya, d), (u, yb, d), (u, yb, d - 0.06), (u, ya, d - 0.06), MAT['velvet'], th['mask'])
    jamb(-Wp, hB, hB + Hp, 1); jamb(Wp, hB, hB + Hp, -1)
    for i in range(24):   # brass line under and over the picture ("a little more defined")
        ua, ub = -Wp + 2 * Wp * i / 24, -Wp + 2 * Wp * (i + 1) / 24; da, db = md(ua) + 0.01, md(ub) + 0.01   # 1 cm proud (4 mm z-fought at a distance)
        for yy in (hB - 0.05, hB + Hp + 0.01):
            acc.quad((ua, yy, da), (ub, yy, db), (ub, yy + 0.04, db), (ua, yy + 0.04, da), MAT['brass'], th['trim'])
        scr.quad((ua, hB, sd(ua)), (ub, hB, sd(ub)), (ub, hB + Hp, sd(ub)), (ua, hB + Hp, sd(ua)), 0, (1, 1, 1))
    if h['curtain']:   # curtain pelmet over the picture (the curtains themselves move: the engine draws them)
        for i in range(24):
            ua, ub = -Wp - 0.4 + (2 * Wp + 0.8) * i / 24, -Wp - 0.4 + (2 * Wp + 0.8) * (i + 1) / 24
            pa, pb = (ua, md(ua) + 0.45), (ub, md(ub) + 0.45)
            acc.prism([(ua, md(ua) + 0.05), (ub, md(ub) + 0.05), (ub, md(ub) + 0.5), (ua, md(ua) + 0.5)], hB + Hp + 0.12, hB + Hp + 0.62, MAT['velvet'], th['mask'])
            qa, qb = max(ua, -Wp - 0.39), min(ub, Wp + 0.39)   # v11: a bar set 1 cm into the pelmet, 8 mm proud, ending 1 cm inside its ends (a sheet 1 mm off it fought)
            acc.prism([(qa, md(qa) + 0.49), (qb, md(qb) + 0.49), (qb, md(qb) + 0.508), (qa, md(qa) + 0.508)], hB + Hp + 0.5, hB + Hp + 0.54, MAT['brass'], th['trim'])
    # ---- the exit bays
    yaw0 = -f * math.pi / 2   # three.js yaw of something in the hall that faces the audience (+d)
    def gq(a, b, c, d_, want, col, k):   # a glow quad facing `want` whatever its corner order
        n = cross(sub(b, a), sub(c, a)); glow.quad(*((a, b, c, d_) if n[0] * want[0] + n[1] * want[1] + n[2] * want[2] >= 0 else (d_, c, b, a)), col, k)
    def sign_on_mask(uc, yc, w_, h_, pid):
        """an EXIT box on the masking's face (tangent to it where the screen is curved) and its lit face (an engine panel)"""
        k_ = sd1(uc); L_ = math.hypot(1.0, k_); tu, td = 1.0 / L_, k_ / L_; nu, nd = -td, tu; c = (uc, md(uc))
        pts = [(c[0] + s1 * tu * w_ / 2 + o * nu, c[1] + s1 * td * w_ / 2 + o * nd) for s1, o in ((-1, -0.01), (1, -0.01), (1, 0.035), (-1, 0.035))]
        acc.prism(pts, yc - h_ / 2 - 0.03, yc + h_ / 2 + 0.03, MAT['powder'], lin('#16181b'))
        p = T((c[0] + nu * 0.04, yc, c[1] + nd * 0.04)); panels.append({'id': pid, 'x': p[0], 'y': p[1], 'z': p[2], 'yaw': yaw0 + math.atan2(nu, nd), 'w': w_, 'h': h_, 'emit': 1})
        lit.point((c[0] + nu * 0.35, yc, c[1] + nd * 0.35), lin('#2bd07a'), 0.3, 3.5, 'f')
    panels = []
    for sg in (-1, 1):   # v12b each side exit: a bronze frame round the opening on the hall's face, a lit EXIT sign over it (on X-270: beside it,
        e_ = EX[sg]; i_ = 0 if sg < 0 else 1; dA, dB = e_['d0'], e_['d1']; fu0, fu1 = sorted((sg * W2, sg * (W2 - 0.035)))   # under the side screen's bottom edge)
        for (da_, db_, ya_, yb_) in ((dA - 0.12, dA, 0.0, 2.4), (dB, dB + 0.12, 0.0, 2.4), (dA - 0.12, dB + 0.12, 2.4, 2.52)):   # jambs under the head (zcheck: over it they shared its faces)
            acc.box(fu0, ya_, da_, fu1, yb_, db_, MAT['metal'], lin('#2a2c30'))
        ds, ys = ((dA + dB) / 2, 2.72) if not h.get('panels') else (dA - 0.62, 2.12)
        su0, su1 = sorted((sg * W2, sg * (W2 - 0.05)))
        acc.box(su0, ys - 0.13, ds - 0.36, su1, ys + 0.13, ds + 0.36, MAT['powder'], lin('#16181b'))
        p = T((sg * (W2 - 0.056), ys, ds)); panels.append({'id': f"exitsign_{h['id']}_{i_}", 'x': p[0], 'y': p[1], 'z': p[2], 'yaw': yaw0 - sg * math.pi / 2, 'w': 0.6, 'h': 0.22, 'emit': 1})
        lit.point((sg * (W2 - 0.4), ys, ds), lin('#2bd07a'), 0.3, 3.5, 'f')
        lit.point((sg * (W2 - 0.5), 2.2, (dA + dB) / 2), lin('#ffd2a0'), 0.12, 2.5, 'f')   # a little light on the doors (it stays on in the film)
    if fmt0 == 'curve':   # v9.3 (the user's photo of a curved hall): a lit line along the screen's foot that draws the curve in the dark
        for i in range(48):
            ua, ub = -Wp + 2 * Wp * i / 48, -Wp + 2 * Wp * (i + 1) / 48; da, db = md(ua) + 0.03, md(ub) + 0.03
            gq((ua, hB - 0.16, da), (ub, hB - 0.16, db), (ub, hB - 0.12, db), (ua, hB - 0.12, da), (0, 0, 1), lin('#e8ecff'), 1.6)
        lit.line((-Wp, hB - 0.2, md(0) + 0.3), (Wp, hB - 0.2, md(0) + 0.3), lin('#e8ecff'), 0.25, 4.0, 'f')
    # ---------------------------------------------------------------- side walls: each hall's own wall system, above the local floor
    rnd = random.Random(h['no']); fmt = h['format']; step = 2.4
    SS = h.get('sideScreen'); x_end = SS['d1'] if SS else -1.0
    d_start = max(0.6, md(W2) + 0.2, max(e['d1'] for e in h['exits']) + 0.4)   # v12b: from behind the exit doors
    def on_wall(sg, off0, off1, y_a, y_b, d_a, d_b, mat, col):
        """a box standing on a side wall's face, from off0 to off1 metres in from it"""
        a, b = sorted((sg * (W2 - off0), sg * (W2 - off1))); acc.box(a, y_a, d_a, b, y_b, d_b, mat, col)
    def wall_glow(sg, y_a, y_b, d_a, d_b, col, k, off=0.006):   # a light strip on a side wall's face (or on a box off metres in)
        xs_ = sg * (W2 - off); gq((xs_, y_a, d_a), (xs_, y_b, d_a), (xs_, y_b, d_b), (xs_, y_a, d_b), (-sg, 0, 0), col, k)
    dd = d_start
    while dd < depth - 1.4:
        d1 = min(dd + step, depth - 0.25)
        for sg in (-1, 1):
            fy = max(floor_at(sg * (W2 - 0.3), dd), floor_at(sg * (W2 - 0.3), d1 - 0.01))
            if dd < x_end or ceil - 0.7 - fy < 2.2: continue
            da, db = dd + 0.03, d1 - 0.03; wtop = ceil - 0.7
            if fmt == 'max':      # walnut wainscot with a brass cap, dark fabric above, a blue light line in every joint
                on_wall(sg, 0.0, 0.04, fy, fy + 1.1, da, db, MAT['wood'], th['wood'])
                on_wall(sg, 0.0, 0.055, fy + 1.1, fy + 1.14, da - 0.01, db + 0.01, MAT['brass'], lin('#b58a4c'))
                on_wall(sg, 0.0, 0.03, fy + 1.2, wtop, da, db, MAT['acoustic'], mix(th['wall'], th['wall2'], 0.3 * rnd.random()))
                wall_glow(sg, fy + 1.25, wtop - 0.1, dd - 0.012, dd + 0.012, th['accent'], 1.4)
                # v12 (the user: "the inside of the theatre sucks"; "curves, triangles"): the fabric folded into vertical triangular ridges,
                # 30 cm wide, 9 cm proud, 2 cm into the panel, so the wall washers rake light and shade down every fold
                nr = int((db - da - 0.1) / 0.3)
                for q in range(nr):
                    r0 = da + 0.05 + q * (db - da - 0.1) / nr; r1 = r0 + (db - da - 0.1) / nr
                    acc.prism([(sg * (W2 - 0.01), r0 + 0.01), (sg * (W2 - 0.12), (r0 + r1) / 2), (sg * (W2 - 0.01), r1 - 0.01)], fy + 1.3, wtop - 0.06, MAT['acoustic'], mix(th['wall'], th['frame'], 0.18))
            elif fmt == 'curve':  # cognac leather wainscot, navy fabric panels between slim champagne pilasters, warm up-lights
                on_wall(sg, 0.0, 0.05, fy, fy + 1.15, da, db, MAT['leather'], th['wood'])
                on_wall(sg, 0.0, 0.06, fy + 1.15, fy + 1.19, da - 0.01, db + 0.01, MAT['brass'], th['trim'])
                on_wall(sg, 0.0, 0.03, fy + 1.3, wtop, da + 0.04, db - 0.04, MAT['acoustic'], mix(th['wall'], th['wall2'], 0.3 * rnd.random()))
                on_wall(sg, 0.0, 0.05, fy + 1.19, wtop, dd - 0.035, dd + 0.035, MAT['brass'], th['trim'])
                wall_glow(sg, fy + 1.21, fy + 1.27, da + 0.05, db - 0.05, th['warm'], 1.2, off=0.007)
                # v12 a sound wave in brass across each fabric panel: fins 4 cm wide every 25 cm, 2 cm into the fabric and 5 cm proud,
                # their heights an audio envelope that runs on from panel to panel down the hall
                ym, yh = (fy + 1.45 + wtop - 0.2) / 2, (wtop - 0.2 - fy - 1.45) / 2
                dq = da + 0.25
                while dq < db - 0.22:
                    amp = yh * (0.18 + 0.82 * abs(math.sin(dq * 0.83 + h['no'])) * (0.55 + 0.45 * math.sin(dq * 2.71)))
                    on_wall(sg, 0.01, 0.08, ym - amp, ym + amp, dq - 0.02, dq + 0.02, MAT['brass'], th['trim']); dq += 0.25
                lit.line((sg * (W2 - 0.12), fy + 1.3, da + 0.1), (sg * (W2 - 0.12), fy + 1.3, db - 0.1), th['warm'], 0.25, 3.5, 'h', (0, 1, 0))
            elif fmt == 'classic':  # charcoal dado and brass rail, burgundy fabric panels in cream mouldings, brass sconces
                on_wall(sg, 0.0, 0.03, fy, fy + 0.95, da, db, MAT['paint'], th['ceil'])
                on_wall(sg, 0.0, 0.06, fy + 0.95, fy + 1.01, da - 0.01, db + 0.01, MAT['brass'], th['trim'])
                ptop = wtop - 0.1
                on_wall(sg, 0.0, 0.03, fy + 1.2, ptop, da + 0.12, db - 0.12, MAT['acoustic'], mix(th['wall'], th['wall2'], 0.25 * rnd.random()))
                for (y_a, y_b, e_a, e_b) in ((fy + 1.12, fy + 1.2, da + 0.04, db - 0.04), (ptop, ptop + 0.08, da + 0.04, db - 0.04), (fy + 1.2, ptop, da + 0.04, da + 0.12), (fy + 1.2, ptop, db - 0.12, db - 0.04)):
                    on_wall(sg, 0.0, 0.05, y_a, y_b, e_a, e_b, MAT['paint'], th['cream'])
            else:                 # 270, behind its side screens: graphite panels, a teal line at the base
                on_wall(sg, 0.0, 0.03, fy + 0.4, wtop, da, db, MAT['acoustic'], mix(th['wall'], th['wall2'], 0.3 * rnd.random()))
                wall_glow(sg, fy + 0.3, fy + 0.34, da, db, th['accent'], 1.3)
            # wall washer: a ceiling spot near the wall grazing the panel (house light), scallops of light down the wall
            lit.spot((sg * (W2 - 0.55), ceil - 0.15, (dd + d1) / 2), th['warm'], 1.0, ceil + 2, 'h', (sg * 0.2, -1, 0), 18, 42)
            # in the joint: a sconce (classic), a surround speaker every other joint (all)
            if fmt == 'classic':
                ys_ = fy + 2.5; on_wall(sg, 0.0, 0.03, ys_ - 0.3, ys_ + 0.3, dd - 0.07, dd + 0.07, MAT['brass'], th['trim'])
                on_wall(sg, 0.03, 0.17, ys_ - 0.12, ys_ + 0.18, dd - 0.09, dd + 0.09, MAT['matte'], lin('#f3e2c0'))
                wall_glow(sg, ys_ - 0.1, ys_ + 0.16, dd - 0.07, dd + 0.07, th['warm'], 1.8, off=0.172)
                lit.spot((sg * (W2 - 0.25), ys_ + 0.2, dd), th['warm'], 0.7, 4.5, 'h', (-sg * 0.25, 1, 0), 25, 70)
                lit.spot((sg * (W2 - 0.25), ys_ - 0.15, dd), th['warm'], 0.45, 3.5, 'h', (-sg * 0.25, -1, 0), 25, 70)
            if int(round((dd - d_start) / step)) % 2 == 1 and fy + 4.4 < ceil - 0.8:
                on_wall(sg, 0.0, 0.32, fy + 3.7, fy + 4.3, dd - 0.27, dd + 0.27, MAT['fabric'], lin('#0c0c0e'))
        dd += step
    # ---------------------------------------------------------------- the 270 hall's side screens (ScreenX-style) and their projectors
    if SS:
        d0s, d1s, yb0, yb1, yt = SS['d0'], SS['d1'], SS['yb0'], SS['yb1'], SS['yt']
        for sg in (-1, 1):
            xa, xb = sorted((sg * (W2 - 0.03), sg * W2)); acc.prism_x([(d0s - 0.1, yb0 - 0.1), (d1s + 0.1, yb1 - 0.1), (d1s + 0.1, yt + 0.1), (d0s - 0.1, yt + 0.1)], xa, xb, MAT['velvet'], th['mask'])   # black border
            xa, xb = sorted((sg * (W2 - 0.045), sg * (W2 - 0.03))); acc.prism_x([(d0s, yb0), (d1s, yb1), (d1s, yt), (d0s, yt)], xa, xb, MAT['matte'], th['screen'])        # the projection surface
            xa, xb = sorted((sg * (W2 - 0.02), sg * W2)); e_ = EX[sg]; yb_at = lambda d_: yb0 + (yb1 - yb0) * (d_ - d0s) / (d1s - d0s)
            ga, gb = e_['d0'] - 0.16, e_['d1'] + 0.16   # v12b: the wainscot stops round the exit's frame and spans over its head
            acc.prism_x([(d0s - 0.1, -0.3), (ga, -0.3), (ga, yb_at(ga) - 0.12), (d0s - 0.1, yb0 - 0.12)], xa, xb, MAT['acoustic'], th['wall2'])
            acc.prism_x([(gb, -0.3), (d1s + 0.1, -0.3), (d1s + 0.1, yb1 - 0.12), (gb, yb_at(gb) - 0.12)], xa, xb, MAT['acoustic'], th['wall2'])
            acc.prism_x([(ga, 2.56), (gb, 2.56), (gb, yb_at(gb) - 0.12), (ga, yb_at(ga) - 0.12)], xa, xb, MAT['acoustic'], th['wall2'])
            xs_ = sg * (W2 - 0.026); gq((xs_, yb0 - 0.16, d0s), (xs_, yb1 - 0.16, d1s), (xs_, yb1 - 0.13, d1s), (xs_, yb0 - 0.13, d0s), (-sg, 0, 0), th['accent'], 1.6)
            for i in range(4):   # projectors hung under the ceiling near this wall, each throwing onto the opposite wall
                pd = d0s + (d1s - d0s) * (i + 0.5) / 4; pu = sg * (W2 - 1.3)
                acc.box(pu - 0.36, ceil - 0.95, pd - 0.3, pu + 0.36, ceil - 0.55, pd + 0.3, MAT['powder'], lin('#1a1c20'))
                acc.box(pu - 0.03, ceil - 0.55, pd - 0.03, pu + 0.03, ceil, pd + 0.03, MAT['metal'], lin('#30333a'))
                lx = pu - sg * 0.362; gq((lx, ceil - 0.83, pd - 0.07), (lx, ceil - 0.69, pd - 0.07), (lx, ceil - 0.69, pd + 0.07), (lx, ceil - 0.83, pd + 0.07), (-sg, 0, 0), lin('#bcd8ff'), 2.2)
    # ---------------------------------------------------------------- the projection port in the rear wall, over the rear aisle
    py_ = min(top + 3.4, ceil - 0.6)
    acc.box(-0.7, py_ - 0.45, depth - 0.02, 0.7, py_ + 0.05, depth, MAT['glass'], lin('#0a0f16'))
    gq((-0.62, py_ - 0.38, depth - 0.025), (0.62, py_ - 0.38, depth - 0.025), (0.62, py_ - 0.02, depth - 0.025), (-0.62, py_ - 0.02, depth - 0.025), (0, 0, -1), lin('#9fc2ff'), 0.5)
    # ---------------------------------------------------------------- ceilings and house lights
    cy = ceil - 0.01
    if h['format'] == 'max':
        stars = []
        for i in range(260):   # tiny warm points in the black ceiling (inspiration: "IMAX 70mm all to yourself")
            u, d = rnd.uniform(-W2 + 0.8, W2 - 0.8), rnd.uniform(1.0, depth - 1.0); s_ = rnd.uniform(0.025, 0.05); k_ = rnd.uniform(0.6, 1.6)
            if any(abs(u - qu) < s_ + qs + 0.02 and abs(d - qd) < s_ + qs + 0.02 for qu, qd, qs in stars): continue   # v11: two on one spot fought
            stars.append((u, d, s_))
            glow.quad((u - s_, cy, d - s_), (u + s_, cy, d - s_), (u + s_, cy, d + s_), (u - s_, cy, d + s_), th['warm'], k_)
        for dd in [3 + 4.2 * i for i in range(int((depth - 4) / 4.2) + 1)]:
            acc.box(-W2 + 1.0, ceil - 0.9, dd, W2 - 1.0, ceil + 0.01, dd + 0.12, MAT['acoustic'], lin('#0a0c10'))   # v11: 1 cm into the ceiling (they hung 2 cm under it)
            # v14 (the user: the ceilings looked bad): each baffle's underside is a line of light, blue to the room, a warm wash up its face
            glow.quad((-W2 + 1.05, ceil - 0.906, dd + 0.03), (W2 - 1.05, ceil - 0.906, dd + 0.03), (W2 - 1.05, ceil - 0.906, dd + 0.09), (-W2 + 1.05, ceil - 0.906, dd + 0.09), th['accent'], 1.1)   # facing down, as the stars
            lit.line((-W2 + 1.5, ceil - 1.0, dd + 0.06), (W2 - 1.5, ceil - 1.0, dd + 0.06), th['accent'], 0.06, 3.0, 'h', (0, -1, 0))
        lit.ambient(lin('#3a5aa0'), lin('#1a2440'), 0.004, 'f')
    elif h['format'] == 'curve':
        for e in (6.5, 10.5, 14.5, 18.5, 22.5):   # coves that follow the screen's curve (photo 9: lights not curved, placed wrong)
            if e > depth - 0.8: continue
            pts = [(u, e + sd(u)) for u in [(-W2 + 0.6) + (2 * W2 - 1.2) * i / 30 for i in range(31)]]
            acc.sweep(pts, [(-0.18, ceil + 0.01), (-0.18, ceil - 0.3), (0.18, ceil - 0.3), (0.18, ceil + 0.01)], MAT['paint'], lin('#10162a'), closed=True)   # v11: into the ceiling (2 cm under it)
            for i in range(len(pts) - 1):
                (ua, da), (ub, db) = pts[i], pts[i + 1]
                glow.quad((ua, ceil - 0.302, da + 0.1), (ub, ceil - 0.302, db + 0.1), (ub, ceil - 0.302, db + 0.16), (ua, ceil - 0.302, da + 0.16), th['warm'], 1.3)
            lit.line((pts[0][0], ceil - 0.35, pts[0][1] + 0.2), (pts[15][0], ceil - 0.35, pts[15][1] + 0.2), th['warm'], 0.5, 7, 'h', (0, -0.6, 0.8))
            lit.line((pts[15][0], ceil - 0.35, pts[15][1] + 0.2), (pts[30][0], ceil - 0.35, pts[30][1] + 0.2), th['warm'], 0.5, 7, 'h', (0, -0.6, 0.8))
    elif h['format'] == 'classic':
        for i in range(-2, 3):
            for j in range(int((depth - 4) / 4.0)):
                u, d = i * 3.2, 4.0 + j * 4.0
                for b in ((u - 1.35, d - 1.6, u + 1.35, d - 1.5), (u - 1.35, d + 1.5, u + 1.35, d + 1.6), (u - 1.45, d - 1.6, u - 1.35, d + 1.6), (u + 1.35, d - 1.6, u + 1.45, d + 1.6)):
                    acc.box(b[0], ceil - 0.28, b[1], b[2], ceil + 0.01, b[3], MAT['paint'], th['cream'])   # v11: into the ceiling (2 cm under it)
                lit.line((u - 1.2, ceil - 0.3, d - 1.45), (u + 1.2, ceil - 0.3, d - 1.45), th['warm'], 0.12, 3, 'h', (0, 1, 0.3))
    else:
        # v14 X-270 (the user's ScreenX photo): a black ceiling with a regular grid of small lights, nothing hanging into the projectors' throw
        for u in [-W2 + 1.2 + 1.5 * k for k in range(int((2 * W2 - 2.4) / 1.5) + 1)]:
            for d in [1.5 + 1.5 * k for k in range(int((depth - 2.5) / 1.5) + 1)]:
                s_ = 0.022
                glow.quad((u - s_, cy, d - s_), (u + s_, cy, d - s_), (u + s_, cy, d + s_), (u - s_, cy, d + s_), th['warm'], 1.1)
        # v14 flush light lines across the ceiling every 4.5 m (red to the room's accent), nothing hanging into the projectors' throw
        for d in [2.25 + 4.5 * k for k in range(int((depth - 3.0) / 4.5) + 1)]:
            glow.quad((-W2 + 0.8, cy, d - 0.025), (W2 - 0.8, cy, d - 0.025), (W2 - 0.8, cy, d + 0.025), (-W2 + 0.8, cy, d + 0.025), th['accent'], 1.0)   # facing down
        lit.ambient(lin('#3a2a2a'), lin('#120c0c'), 0.004, 'f')
    # downlights over the seats only (the walls have their washers): fewer and softer than v9's grid
    nu = max(1, int(round((2 * h['blockHalf']) / 4.4)))
    for u in [-h['blockHalf'] + 1.0 + i * (2 * h['blockHalf'] - 2.0) / nu for i in range(nu + 1)]:
        for d in [h['rows'][0]['X'] + j * 4.5 for j in range(int((depth - h['rows'][0]['X'] - 1.0) / 4.5) + 1)]:
            lit.spot((u, ceil - 0.05, d), th['warm'], 1.6 if h['format'] == 'max' else 1.9, ceil + 3, 'h', (0, -1, 0), 25, 60)
            acc.cyl(u, d, 0.09, ceil - 0.025, ceil + 0.005, MAT['metal'], lin('#2a2a2e'), n=12)   # v11: into the ceiling (2 mm under it)
            glow.quad((u - 0.06, ceil - 0.027, d - 0.06), (u + 0.06, ceil - 0.027, d - 0.06), (u + 0.06, ceil - 0.027, d + 0.06), (u - 0.06, ceil - 0.027, d + 0.06), th['warm'], 2.0)
    for sg in (-1, 1):   # aisle step light as light (fixed layer)
        pA, pB = P(sg * (a0w + aW) / 2, rows[1]['pf']), P(sg * (a0w + aW) / 2, depth - 0.4)
        lit.line((pA[0], 0.25, pA[1]), (pB[0], top + 0.25, pB[1]), th['step'], 0.06, 2.0, 'f')
    lit.ambient(mix(th['warm'], (1, 1, 1), 0.5), mix(th['wall2'], (0, 0, 0), 0.3), 0.03, 'h')
    # v14 (the user, 11-20: "idk why you have this shit wall on entrance of the theatre"; UNIC 8.1.2: a dark vestibule or the door itself
    # keeps the light out): no baffle, the door opens straight onto the rear aisle and the whole hall; a soft light over the door
    lit.point((ent, top + 2.2, depth - 0.6), th['warm'], 0.25, 2.5, 'h')
    # ---------------------------------------------------------------- occluders (seats) and probes for the bake
    probes = []
    for s in h['seats']:
        hw, dep, ht = {'rocker': (0.35, 0.62, 1.04), 'recliner': (0.5, 0.98, 1.08), 'sofa': (0.45, 0.94, 1.0), 'pod': (0.46, 1.0, 1.06)}[s['kind']]   # v12b wider seats
        u, d, y = s['u'], s['d'], s['y'] - y0
        occ.box(u - hw, y, d - dep * 0.45, u + hw, y + ht, d + dep * 0.55, 0, (0.18, 0.16, 0.15))
        # bake_room.py probe: point above the seat back, normal A up and back (house light on what you see of a seat), normal B
        # toward the screen (its light). three.js yaw: local +z is the seat's back
        sn, cs = math.sin(s['yaw']), math.cos(s['yaw']); bk = dep * 0.33
        probes.append((s['x'] + sn * bk, s['y'] + ht + 0.04, s['z'] + cs * bk, 0.7 * sn, 0.7, 0.7 * cs, -0.96 * sn, 0.29, -0.96 * cs))
    c = [T((-W2, 0, Dw)), T((W2, 0, depth))]
    lit.rect = [min(c[0][0], c[1][0]), min(c[0][2], c[1][2]), max(c[0][0], c[1][0]), max(c[0][2], c[1][2])]
    return acc, glow, lit, occ, scr, probes, panels
