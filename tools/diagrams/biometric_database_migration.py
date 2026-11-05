"""assets/img/biometric-database-migration.svg: python3 tools/diagrams/biometric_database_migration.py"""
import os, re, random, sys
sys.path.insert(0, os.path.dirname(__file__))
from svgtext import text

HERE = os.path.dirname(__file__)
ROOT = os.path.join(HERE, '..', '..')
W, H, BG = 2000, 1125, '#141416'
SALMON, GREEN, MUTED = '#f2a197', '#8fe0b0', '#c9c9cc'



out = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">',
       '<title>What moves to the new system and what does not: images and standard fingerprint templates move, '
       'proprietary templates are computed again from the images</title>',
       f'''<defs>
<linearGradient id="panel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2c2c2e"/><stop offset="1" stop-color="#1f1f21"/></linearGradient>
<linearGradient id="row" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b3b3e"/><stop offset="1" stop-color="#303033"/></linearGradient>
<filter id="sh" x="-10%" y="-20%" width="120%" height="150%"><feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#000" flood-opacity=".45"/></filter>
<marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="12" markerHeight="12" markerUnits="userSpaceOnUse" orient="auto"><path d="M0 1 L10 5 L0 9 z" fill="#fff"/></marker>
<marker id="ahs" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="12" markerHeight="12" markerUnits="userSpaceOnUse" orient="auto"><path d="M0 1 L10 5 L0 9 z" fill="{SALMON}"/></marker>
<marker id="ahg" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="12" markerHeight="12" markerUnits="userSpaceOnUse" orient="auto"><path d="M0 1 L10 5 L0 9 z" fill="{GREEN}"/></marker>
</defs>''',
       f'<rect width="{W}" height="{H}" fill="{BG}"/>',
       text('What moves to the new system, and what does not', W / 2, 115, 50, anchor='middle')]

S = 'fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"'


def eye(cx, cy, k=1):
    return (f'<path d="M{cx-34*k} {cy} Q{cx} {cy-32*k} {cx+34*k} {cy} Q{cx} {cy+32*k} {cx-34*k} {cy} Z" {S}/>'
            f'<circle cx="{cx}" cy="{cy}" r="{12*k}" {S}/><circle cx="{cx}" cy="{cy}" r="{4*k}" fill="#fff"/>')


def _arc(cx, cy, rx, ry, a0, a1, n=24):
    import math
    pts = [(cx + rx * math.cos(math.radians(a0 + (a1 - a0) * i / n)),
            cy - ry * math.sin(math.radians(a0 + (a1 - a0) * i / n))) for i in range(n + 1)]
    return 'M' + ' L'.join(f'{x:.1f} {y:.1f}' for x, y in pts), pts


def minutiae(cx, cy):
    """A fingerprint (whorl of broken ridges) with three minutiae marked:
    ridge endings and a bifurcation, each with its direction."""
    import math
    cy += 4
    st = 'fill="none" stroke="#fff" stroke-width="3.6" stroke-linecap="round"'
    # (rx, segments as angle ranges in degrees, counterclockwise from 3 o'clock)
    rings = [(5, [(20, 250)]),
             (11, [(-40, 120), (150, 300)]),
             (17, [(-60, 70), (95, 235), (255, 320)]),
             (23, [(-35, 150), (170, 290)]),
             (29, [(-20, 60), (80, 200), (215, 260)]),
             (35, [(5, 175)])]
    paths, ends = [], []
    for rx, segs in rings:
        for a0, a1 in segs:
            d, pts = _arc(cx, cy, rx, rx * 1.22, a0, a1)
            paths.append(f'<path d="{d}" {st}/>')
            ends.append((pts[0], pts[1]))
    # bifurcation: a short branch leaving ring 23 at 60 degrees
    d, pts = _arc(cx, cy, 23, 23 * 1.22, 60, 60)
    bx, by = pts[0]
    paths.append(f'<path d="M{bx:.1f} {by:.1f} L{bx+7:.1f} {by-9:.1f}" {st}/>')
    marks = []
    def mark(x, y, ang):
        tx, ty = x + 11 * math.cos(math.radians(ang)), y - 11 * math.sin(math.radians(ang))
        marks.append(f'<path d="M{x:.1f} {y:.1f} L{tx:.1f} {ty:.1f}" stroke="#5cc8ff" stroke-width="3" stroke-linecap="round"/>'
                     f'<circle cx="{x:.1f}" cy="{y:.1f}" r="5" fill="#5cc8ff"/>')
    (x, y), _ = ends[3]          # ridge ending on ring 17
    mark(x, y, -30)
    (x, y), _ = ends[8]          # ridge ending on ring 29
    mark(x, y, 160)
    mark(bx, by, 50)             # bifurcation
    clip = f'<clipPath id="fp{cx:.0f}{cy:.0f}"><ellipse cx="{cx}" cy="{cy}" rx="36" ry="44"/></clipPath>'
    return f'<defs>{clip}</defs><g clip-path="url(#fp{cx:.0f}{cy:.0f})">' + ''.join(paths) + '</g>' + ''.join(marks)


def key(cx, cy):
    return (f'<circle cx="{cx-14}" cy="{cy-10}" r="17" {S}/><circle cx="{cx-14}" cy="{cy-10}" r="4" fill="#fff"/>'
            f'<path d="M{cx-2} {cy+2} L{cx+30} {cy+34} M{cx+18} {cy+22} l-9 9 M{cx+26} {cy+30} l-7 7" {S}/>')


def id_card(cx, cy):
    return (f'<rect x="{cx-36}" y="{cy-25}" width="72" height="50" rx="7" {S}/>'
            f'<circle cx="{cx-16}" cy="{cy-5}" r="7" fill="#fff"/><path d="M{cx-28} {cy+15} Q{cx-16} {cy+1} {cx-4} {cy+15}" {S.replace("5","4",1)}/>'
            f'<path d="M{cx+5} {cy-8} H{cx+26} M{cx+5} {cy+3} H{cx+26} M{cx+5} {cy+14} H{cx+18}" {S.replace("5","4",1)}/>')


def database(cx, cy, lock=True):
    x0, x1, top, h = cx - 30, cx + 30, cy - 30, 60
    d = (f'<ellipse cx="{cx}" cy="{top}" rx="30" ry="10" {S}/>'
         f'<path d="M{x0} {top} V{top+h} A30 10 0 0 0 {x1} {top+h} V{top}" {S}/>'
         f'<path d="M{x0} {top+20} A30 10 0 0 0 {x1} {top+20} M{x0} {top+40} A30 10 0 0 0 {x1} {top+40}" {S}/>')
    if lock:
        lx, ly = cx + 30, cy + 26
        d += (f'<rect x="{lx-21}" y="{ly-22}" width="42" height="48" rx="8" fill="#303033"/>'
              f'<rect x="{lx-15}" y="{ly-6}" width="30" height="24" rx="4" fill="#fff"/>'
              f'<path d="M{lx-9} {ly-6} V{ly-12} A9 9 0 0 1 {lx+9} {ly-12} V{ly-6}" fill="none" stroke="#fff" stroke-width="4"/>'
              f'<rect x="{lx-2}" y="{ly+1}" width="4" height="9" rx="2" fill="#303033"/>')
    return d


def iris_code(cx, cy):
    # a few rows of an iris code: random bits, as in the encoding step
    rnd = random.Random(7)
    cell, cols, rows = 5, 18, 5
    x0, y0 = cx - cols * cell / 2, cy - rows * cell / 2
    bits = ''.join(f'<rect x="{x0+i*cell:.0f}" y="{y0+j*cell:.0f}" width="{cell}" height="{cell}" fill="#fff"/>'
                   for j in range(rows) for i in range(cols) if rnd.random() < .5)
    return (f'<rect x="{x0-5:.0f}" y="{y0-5:.0f}" width="{cols*cell+10}" height="{rows*cell+10}" rx="4" fill="none" stroke="{GREEN}" stroke-width="2"/>' + bits)


def papers(cx, cy):
    return ''.join(f'<rect x="{cx-34+i*8}" y="{cy-40+i*12}" width="60" height="74" rx="6" fill="#2c2c2e" stroke="#fff" stroke-width="4"/>' for i in range(3)) + \
        f'<path d="M{cx-4} {cy-2} H{cx+30} M{cx-4} {cy+10} H{cx+30} M{cx-4} {cy+22} H{cx+20}" {S.replace("5","3.5",1)}/>'


def cloud(x, y, w=150):
    """The cloud of the site's step icons (assets/img/steps/step-cloud.svg)."""
    src = open(os.path.join(ROOT, 'assets', 'img', 'steps', 'step-cloud.svg')).read()
    vb = re.search(r'viewBox="([^"]+)"', src).group(1)
    body = src[src.index('>') + 1:src.rindex('</svg>')]
    _, _, vw, vh = map(float, vb.split())
    return f'<svg x="{x}" y="{y}" width="{w}" height="{w*vh/vw:.1f}" viewBox="{vb}">{body}</svg>'


def panel(x, title, sub, icon, tx=175):
    out.append(f'<rect x="{x}" y="176" width="586" height="796" rx="30" fill="url(#panel)" stroke="#4a4a4e" stroke-width="2"/>')
    out.append(icon)
    out.append(text(title, x + tx, 276, 38))
    out.append(text(sub, x + tx, 316, 24, fill=MUTED))


def row(x, cy, icon, title, sub=None, stroke='#66666b', subfill=MUTED):
    out.append(f'<rect x="{x}" y="{cy-52}" width="510" height="104" rx="16" fill="url(#row)" stroke="{stroke}" stroke-width="2" filter="url(#sh)"/>')
    out.append(icon)
    if sub:
        out.append(text(title, x + 124, cy - 4, 28))
        out.append(text(sub, x + 124, cy + 30, 21, fill=subfill))
    else:
        out.append(text(title, x + 124, cy + 10, 28))


L, Rx, YS = 113, 1300, [452, 592, 732, 872]
panel(L, 'Old vendor', 'closed system', papers(L + 90, 270))
panel(Rx, 'New system', 'open standards', cloud(Rx + 52, 229), tx=255)
lx, rx = L + 38, Rx + 38
row(lx, YS[0], eye(lx + 60, YS[0]), 'Raw images')
row(lx, YS[1], minutiae(lx + 60, YS[1]), 'Fingerprint templates', 'standard minutiae (ISO, ANSI)')
row(lx, YS[2], key(lx + 60, YS[2]), 'Proprietary templates', 'iris codes, face vectors', stroke=SALMON, subfill=SALMON)
row(lx, YS[3], id_card(lx + 60, YS[3]), 'Biographic data in files')
row(rx, YS[0], database(rx + 60, YS[0]), 'Images, ISO containers')
row(rx, YS[1], minutiae(rx + 60, YS[1]), 'ISO / ANSI minutiae')
row(rx, YS[2], iris_code(rx + 60, YS[2]), 'New templates', 'computed again from the images', stroke=GREEN, subfill=GREEN)
row(rx, YS[3], database(rx + 60, YS[3]), 'Separate, encrypted store')

a0, a1 = lx + 524, rx - 10
for y, label in ((YS[0], 'converted to a standard container'), (YS[1], 'variants normalized'), (YS[3], 'separated and minimized')):
    out.append(f'<path d="M{a0} {y} H{a1}" stroke="#fff" stroke-width="3" marker-end="url(#ah)"/>')
    out.append(text(label, (a0 + a1) / 2, y - 22, 23, anchor='middle'))
y = YS[2]
out.append(f'<path d="M{a0} {y} H{a0+270}" stroke="{SALMON}" stroke-width="3" stroke-dasharray="14 10" marker-end="url(#ahs)"/>')
out.append(f'<path d="M{a0+290} {y-12} l24 24 M{a0+314} {y-12} l-24 24" stroke="{SALMON}" stroke-width="3.5" stroke-linecap="round"/>')
out.append(text('unreadable by another matcher', (a0 + a1) / 2 - 70, y - 34, 23, fill=SALMON, anchor='middle'))
# images feed the new templates
x = rx + 510
out.append(f'<path d="M{x+6} {YS[0]} C{x+80} {YS[0]+60} {x+80} {YS[2]-60} {x+12} {YS[2]-14}" fill="none" stroke="{GREEN}" stroke-width="3" stroke-dasharray="12 9" marker-end="url(#ahg)"/>')

out.append(text('Keep the original images: they are the only thing that makes the next migration possible.', W / 2, 1050, 27, fill='#e2e2e4', anchor='middle'))
out.append('</svg>')
dst = os.path.join(ROOT, 'assets', 'img', 'biometric-database-migration.svg')
open(dst, 'w').write('\n'.join(out))
print(dst, os.path.getsize(dst))
