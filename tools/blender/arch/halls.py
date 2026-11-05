"""LUMIERE v9 - one complete auditorium as a model, from the hall spec (www/js/hallmath.js via tools/dev/export-spec.mjs).
Modelled in the hall's own frame: u across (+u = the viewer's right), y up from the front floor, d from the picture's centre line
towards the rear; geo.frame_y places it. Everything is a closed solid: walls with door reveals, a stepped rake with real aisle steps,
the masking wall that wraps the screen to both side walls (no empty sides, photo 3), exit portals at the front corners, a light-lock
baffle at the entrance, and lights only where nothing crosses a seat: step nosings in the aisles, the walls and the ceiling."""
import math, random
from geo import Acc, Glow, Lights, MAT, lin, mix, frame_y

WALL, GAP = 0.4, 1.25   # wall thickness; picture plane -> screen wall

THEME = {
  'max': dict(wall='#121826', wall2='#0b0d12', ceil='#07080b', carpet='#1a2030', riser='#141824', accent='#2f7cff', warm='#ffb46b', wood='#5b3a24', mask='#050608', trim='#2a3140', step='#4d8dff'),
  'curve': dict(wall='#141b33', wall2='#0d1224', ceil='#0a0e1c', carpet='#232a44', riser='#1a2038', accent='#c9a86a', warm='#ffd59e', wood='#6a4428', mask='#06070c', trim='#c9a86a', step='#ffcf8a'),
  'classic': dict(wall='#5a1a24', wall2='#3a1118', ceil='#1c1c21', carpet='#3b1a20', riser='#2a1216', accent='#b08d57', warm='#ffd2a0', wood='#4a2a1a', mask='#080506', trim='#b08d57', step='#ffcf8a', cream='#e6d9c2'),
  'x270': dict(wall='#1f2227', wall2='#16181c', ceil='#0d0f12', carpet='#26292e', riser='#1c1e22', accent='#1f8a8a', warm='#ffe2bf', wood='#3a3a3a', mask='#06070a', trim='#1f8a8a', step='#5fe0d8', panel='#9a9da3'),
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
    def nosing(sg, e, y):
        p, q = P(sg * (a0w + 0.12), e), P(sg * (aW - 0.12), e)
        up_quad(glow, p, q, 0.012, 0.042, y + 0.004, th['step'], 1.6)
    nC = 18 if k else 1
    carpet, rcol = th['carpet'], th['riser']
    # ---------------------------------------------------------------- structure (closed solids)
    acc.box(-W2 - WALL, -0.35, Dw - WALL, W2 + WALL, 0.0, depth + WALL, MAT['hallCarpet'], carpet)
    acc.box(-W2 - WALL, ceil, Dw - WALL, W2 + WALL, ceil + 0.36, depth + WALL, MAT['paint'], th['ceil'])
    exitU, ent = W2 - 0.85, h['entryU']
    acc.wall((W2 + WALL, Dw - WALL / 2), (-W2 - WALL, Dw - WALL / 2), -0.35, ceil + 0.36, WALL, MAT['paint'], th['wall2'],
             openings=[(WALL + W2 - exitU - 0.9, WALL + W2 - exitU + 0.9, 2.4, 0.0), (WALL + W2 + exitU - 0.9, WALL + W2 + exitU + 0.9, 2.4, 0.0)])
    acc.wall((-W2 - WALL, depth + WALL / 2), (W2 + WALL, depth + WALL / 2), -0.35, ceil + 0.36, WALL, MAT['paint'], th['wall2'],
             openings=[(WALL + W2 + ent - 0.95, WALL + W2 + ent + 0.95, top + 2.5, top)])
    for sg in (-1, 1):
        acc.wall((sg * (W2 + WALL / 2), Dw - WALL), (sg * (W2 + WALL / 2), depth + WALL), -0.35, ceil + 0.36, WALL, MAT['acoustic'], th['wall'])
    # ---------------------------------------------------------------- the rake
    n = len(rows)
    for r in range(1, n):
        y, yp, e0 = rows[r]['y'], rows[r - 1]['y'], rows[r]['pf']
        e1 = rows[r + 1]['pf'] if r + 1 < n else depth + 0.05
        nx = rows[r + 1] if r + 1 < n else None
        kst = nx['steps'] if nx else 0; tr = nx['tread'] if nx else 0.3
        flat_end = (e1 - (kst - 1) * tr) if kst > 1 else e1
        if r == n - 1 and k:
            # last row + rear aisle of a curved-row hall: from the row's arc to the straight rear wall in one polygon, so the rear corners
            # (outside the last arc) are floor too (the see-through gate found a 4.7 m pit there)
            ea = a_wall(e0); arc = [P(-ea + 2 * ea * i / 48, e0) for i in range(49)]
            pg = arc + [(W2 + 0.06, depth + 0.05), (-W2 - 0.06, depth + 0.05)]
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
            nosing(sg, ea, yy)
    # ---------------------------------------------------------------- pod tier parapet (MAX): solid walnut wall with warm underglow
    for r in range(1, n):
        if rows[r]['lift'] > 0:
            e0 = rows[r]['pf']; yb = rows[r - 1]['y']; ytop = rows[r]['y'] + 0.82; segs = 24 if k else 1
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
    # ---------------------------------------------------------------- masking wall: wraps the screen to both side walls (photo 3)
    Wp, hB, Hp, Rs = h['W'] / 2, h['hB'], h['H'], h['R']
    def sd(u): return (Rs - math.sqrt(max(0.0, Rs * Rs - u * u))) if Rs else 0.0
    md = lambda u: sd(u) + 0.04
    PU = W2 - 1.75   # exit portals: |u| > PU, below 2.55 m
    us = sorted(set([-W2 - 0.05, W2 + 0.05, -Wp, Wp, -PU, PU] + [(-Wp + 2 * Wp * i / 24) for i in range(25)] + [-W2 + (W2 - Wp) * i / 8 for i in range(9)] + [Wp + (W2 - Wp) * i / 8 for i in range(9)]))
    us = [u for u in us if -W2 - 0.06 <= u <= W2 + 0.06]
    ys = sorted(set([0.0, 2.55, hB, hB + Hp, ceil]))
    for i in range(len(us) - 1):
        ua, ub = us[i], us[i + 1]; um = (ua + ub) / 2; da, db = md(ua), md(ub)
        for j in range(len(ys) - 1):
            ya, yb = ys[j], ys[j + 1]; ym = (ya + yb) / 2
            if abs(um) < Wp and hB <= ym <= hB + Hp: continue
            if abs(um) > PU and ym < 2.55: continue
            acc.quad((ub, ya, db), (ub, yb, db), (ua, yb, da), (ua, ya, da), MAT['velvet'], th['mask'])
            acc.quad((ua, ya, da - 0.06), (ua, yb, da - 0.06), (ub, yb, db - 0.06), (ub, ya, db - 0.06), MAT['velvet'], th['mask'])
        if abs(um) < Wp:   # picture sill (faces up) and head (faces down)
            acc.quad((ua, hB, da), (ub, hB, db), (ub, hB, db - 0.06), (ua, hB, da - 0.06), MAT['velvet'], th['mask'])
            acc.quad((ua, hB + Hp, da - 0.06), (ub, hB + Hp, db - 0.06), (ub, hB + Hp, db), (ua, hB + Hp, da), MAT['velvet'], th['mask'])
        if abs(um) > PU:   # portal head (faces down)
            acc.quad((ua, 2.55, da - 0.06), (ub, 2.55, db - 0.06), (ub, 2.55, db), (ua, 2.55, da), MAT['velvet'], th['mask'])
    def jamb(u, ya, yb, face):   # vertical reveal at u facing +u (face 1) or -u (face -1)
        d = md(u)
        if face > 0: acc.quad((u, ya, d - 0.06), (u, yb, d - 0.06), (u, yb, d), (u, ya, d), MAT['velvet'], th['mask'])
        else: acc.quad((u, ya, d), (u, yb, d), (u, yb, d - 0.06), (u, ya, d - 0.06), MAT['velvet'], th['mask'])
    jamb(-Wp, hB, hB + Hp, 1); jamb(Wp, hB, hB + Hp, -1); jamb(-PU, 0, 2.55, -1); jamb(PU, 0, 2.55, 1)
    for i in range(24):   # brass line under and over the picture ("a little more defined")
        ua, ub = -Wp + 2 * Wp * i / 24, -Wp + 2 * Wp * (i + 1) / 24; da, db = md(ua) + 0.004, md(ub) + 0.004
        for yy in (hB - 0.05, hB + Hp + 0.01):
            acc.quad((ua, yy, da), (ub, yy, db), (ub, yy + 0.04, db), (ua, yy + 0.04, da), MAT['brass'], th['trim'])
        scr.quad((ua, hB, sd(ua)), (ub, hB, sd(ub)), (ub, hB + Hp, sd(ub)), (ua, hB + Hp, sd(ua)), 0, (1, 1, 1))
    if h['curtain']:   # curtain pelmet over the picture (the curtains themselves move: the engine draws them)
        for i in range(24):
            ua, ub = -Wp - 0.4 + (2 * Wp + 0.8) * i / 24, -Wp - 0.4 + (2 * Wp + 0.8) * (i + 1) / 24
            pa, pb = (ua, md(ua) + 0.45), (ub, md(ub) + 0.45)
            acc.prism([(ua, md(ua) + 0.05), (ub, md(ub) + 0.05), (ub, md(ub) + 0.5), (ua, md(ua) + 0.5)], hB + Hp + 0.12, hB + Hp + 0.62, MAT['velvet'], th['mask'])
            acc.quad((ub, hB + Hp + 0.5, pb[1] + 0.051), (ub, hB + Hp + 0.54, pb[1] + 0.051), (ua, hB + Hp + 0.54, pa[1] + 0.051), (ua, hB + Hp + 0.5, pa[1] + 0.051), MAT['brass'], th['trim'])
    for sg in (-1, 1):   # exit signs over the portals, a light in each backstage passage
        u0, u1 = sorted((sg * PU, sg * W2)); dm = md(sg * (W2 - 0.9)) + 0.012
        glow.quad((u0 + 0.35, 2.68, dm), (u1 - 0.35, 2.68, dm), (u1 - 0.35, 2.92, dm), (u0 + 0.35, 2.92, dm), lin('#20d070'), 2.2)
        lit.point((sg * (W2 - 0.9), 2.8, dm + 0.3), lin('#3dff86'), 0.25, 3.0, 'f')
        lit.point((sg * (W2 - 0.9), 2.3, (Dw + md(sg * (W2 - 0.9))) / 2), lin('#ffd2a0'), 0.35, 3.0, 'h')
    # ---------------------------------------------------------------- walls: fabric panels, sconces, speakers, all above the local floor
    rnd = random.Random(h['no']); step, dd = 2.4, 0.6
    while dd < depth - 1.4:
        for sg in (-1, 1):
            u_in = sg * W2; fy = max(floor_at(sg * (W2 - 0.3), dd), floor_at(sg * (W2 - 0.3), min(depth - 0.1, dd + step)))
            panel_zone = not (h['format'] == 'x270' and dd < depth * 0.72)
            if panel_zone and ceil - 0.7 - (fy + 0.35) > 1.0:
                x0, x1 = (u_in - 0.03, u_in) if sg > 0 else (u_in, u_in + 0.03)
                acc.box(x0, fy + 0.35, dd + 0.02, x1, ceil - 0.7, dd + step - 0.02, MAT['acoustic'], mix(th['wall'], th['wall2'], 0.35 * rnd.random()))
            ys_ = fy + 2.35; xs = u_in - sg * 0.035
            if sg > 0: glow.quad((xs, ys_, dd + 0.02), (xs, ys_ + 0.5, dd + 0.02), (xs, ys_ + 0.5, dd), (xs, ys_, dd), th['warm'], 1.2)
            else: glow.quad((xs, ys_, dd), (xs, ys_ + 0.5, dd), (xs, ys_ + 0.5, dd + 0.02), (xs, ys_, dd + 0.02), th['warm'], 1.2)
            lit.spot((u_in - sg * 0.25, ys_ + 0.5, dd), th['warm'], 0.7, 4.5, 'h', (-sg * 0.3, 1, 0), 25, 70)
            lit.spot((u_in - sg * 0.25, ys_ - 0.05, dd), th['warm'], 0.5, 3.5, 'h', (-sg * 0.3, -1, 0), 25, 70)
            x0, x1 = (u_in - 0.36, u_in - 0.03) if sg > 0 else (u_in + 0.03, u_in + 0.36)
            if ys_ + 1.5 < ceil - 0.6: acc.box(x0, ys_ + 0.9, dd - 0.28, x1, ys_ + 1.5, dd + 0.28, MAT['fabric'], lin('#0c0c0e'))
            if h['format'] == 'max':   # vertical blue light lines (inspiration photo 1)
                xg, D1 = u_in - sg * 0.035, dd + step - 0.01
                if sg > 0: glow.quad((xg, fy + 0.3, D1), (xg, ceil - 0.8, D1), (xg, ceil - 0.8, D1 - 0.02), (xg, fy + 0.3, D1 - 0.02), th['accent'], 1.4)
                else: glow.quad((xg, fy + 0.3, D1 - 0.02), (xg, ceil - 0.8, D1 - 0.02), (xg, ceil - 0.8, D1), (xg, fy + 0.3, D1), th['accent'], 1.4)
        dd += step
    if h['format'] == 'x270':   # the two side projection panels (light matte; the engine projects the picture's edges onto them)
        for sg in (-1, 1):
            u_in = sg * W2; x0, x1 = (u_in - 0.05, u_in) if sg > 0 else (u_in, u_in + 0.05); d1 = depth * 0.72
            acc.box(x0, 1.4, 0.4, x1, ceil - 0.9, d1, MAT['paint'], th['panel'])
            acc.box(x0 - 0.01, 1.32, 0.35, x1 + 0.01, 1.4, d1 + 0.05, MAT['metal'], th['trim'])
    # ---------------------------------------------------------------- ceilings and house lights
    cy = ceil - 0.01
    if h['format'] == 'max':
        for i in range(260):   # tiny warm points in the black ceiling (inspiration: "IMAX 70mm all to yourself")
            u, d = rnd.uniform(-W2 + 0.8, W2 - 0.8), rnd.uniform(1.0, depth - 1.0); s_ = rnd.uniform(0.025, 0.05)
            glow.quad((u - s_, cy, d - s_), (u + s_, cy, d - s_), (u + s_, cy, d + s_), (u - s_, cy, d + s_), th['warm'], rnd.uniform(0.6, 1.6))
        for dd in [3 + 4.2 * i for i in range(int((depth - 4) / 4.2) + 1)]:
            acc.box(-W2 + 1.0, ceil - 0.9, dd, W2 - 1.0, ceil - 0.02, dd + 0.12, MAT['acoustic'], lin('#0a0c10'))
        lit.ambient(lin('#3a5aa0'), lin('#1a2440'), 0.004, 'f')
    elif h['format'] == 'curve':
        for e in (6.5, 10.5, 14.5, 18.5, 22.5):   # coves that follow the screen's curve (photo 9: lights not curved, placed wrong)
            if e > depth - 0.8: continue
            pts = [(u, e + sd(u)) for u in [(-W2 + 0.6) + (2 * W2 - 1.2) * i / 30 for i in range(31)]]
            acc.sweep(pts, [(-0.18, ceil - 0.02), (-0.18, ceil - 0.3), (0.18, ceil - 0.3), (0.18, ceil - 0.02)], MAT['paint'], lin('#10162a'), closed=True)
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
                    acc.box(b[0], ceil - 0.28, b[1], b[2], ceil - 0.02, b[3], MAT['paint'], th['cream'])
                lit.line((u - 1.2, ceil - 0.3, d - 1.45), (u + 1.2, ceil - 0.3, d - 1.45), th['warm'], 0.12, 3, 'h', (0, 1, 0.3))
    else:
        for u in (-W2 * 0.5, 0.0, W2 * 0.5):
            glow.quad((u - 0.03, cy, 2.0), (u + 0.03, cy, 2.0), (u + 0.03, cy, depth - 1.5), (u - 0.03, cy, depth - 1.5), th['accent'], 1.0)
    nu = max(1, int(round((2 * W2 - 4.4) / 4.4)))
    for u in [(-W2 + 2.2) + i * (2 * W2 - 4.4) / nu for i in range(nu + 1)]:
        for d in [2.5 + j * 4.5 for j in range(int((depth - 3) / 4.5) + 1)]:
            lit.spot((u, ceil - 0.05, d), th['warm'], 2.2 if h['format'] == 'max' else 2.6, ceil + 3, 'h', (0, -1, 0), 25, 60)
            acc.cyl(u, d, 0.09, ceil - 0.025, ceil - 0.002, MAT['metal'], lin('#2a2a2e'), n=12)
            glow.quad((u - 0.06, ceil - 0.027, d - 0.06), (u + 0.06, ceil - 0.027, d - 0.06), (u + 0.06, ceil - 0.027, d + 0.06), (u - 0.06, ceil - 0.027, d + 0.06), th['warm'], 2.0)
    for sg in (-1, 1):   # aisle step light as light (fixed layer)
        pA, pB = P(sg * (a0w + aW) / 2, rows[1]['pf']), P(sg * (a0w + aW) / 2, depth - 0.4)
        lit.line((pA[0], 0.25, pA[1]), (pB[0], top + 0.25, pB[1]), th['step'], 0.06, 2.0, 'f')
    lit.ambient(mix(th['warm'], (1, 1, 1), 0.5), mix(th['wall2'], (0, 0, 0), 0.3), 0.03, 'h')
    # ---------------------------------------------------------------- entrance light lock: a baffle in front of the door
    s_ = 1 if ent > 0 else -1; dz = depth - 1.25
    acc.box(min(ent - s_ * 1.2, s_ * W2), top, dz - 0.06, max(ent - s_ * 1.2, s_ * W2), top + 2.35, dz + 0.06, MAT['acoustic'], th['wall2'])
    acc.box(min(ent - s_ * 1.2, s_ * W2), top + 2.35, dz - 0.08, max(ent - s_ * 1.2, s_ * W2), top + 2.42, dz + 0.08, MAT['wood'], th['wood'])
    lit.point((ent, top + 2.2, depth - 0.6), th['warm'], 0.25, 2.5, 'h')
    # ---------------------------------------------------------------- occluders (seats) and probes for the bake
    probes = []
    for s in h['seats']:
        hw, dep, ht = {'rocker': (0.31, 0.62, 1.04), 'recliner': (0.47, 0.98, 1.08), 'sofa': (0.41, 0.94, 1.0), 'pod': (0.43, 1.0, 1.06)}[s['kind']]
        u, d, y = s['u'], s['d'], s['y'] - y0
        occ.box(u - hw, y, d - dep * 0.45, u + hw, y + ht, d + dep * 0.55, 0, (0.18, 0.16, 0.15))
        probes.append((s['x'], s['y'] + 0.75, s['z']))
    c = [T((-W2, 0, Dw)), T((W2, 0, depth))]
    lit.rect = [min(c[0][0], c[1][0]), min(c[0][2], c[1][2]), max(c[0][0], c[1][0]), max(c[0][2], c[1][2])]
    return acc, glow, lit, occ, scr, probes
