"""assets/img/health-insurance-claim-flow.svg: python3 tools/diagrams/health_insurance_claim_flow.py"""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from svgtext import text

W, H, BG = 2000, 1125, '#141416'
CY, R = 405, 155
XS = [306, 768, 1230, 1692]
out = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">',
       '<title>Biometric check at the point of care: enroll, visit, claim, review and pay</title>',
       '''<defs>
<radialGradient id="g" cx="50%" cy="45%" r="55%"><stop offset="0" stop-color="#232325"/><stop offset=".8" stop-color="#0e0e0f"/><stop offset="1" stop-color="#060607"/></radialGradient>
<filter id="glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5"/></filter>
<marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="10" markerHeight="10" markerUnits="userSpaceOnUse" orient="auto"><path d="M0 1 L10 5 L0 9 z" fill="#fff"/></marker>
</defs>''',
       f'<rect width="{W}" height="{H}" fill="{BG}"/>',
       text('Biometric check at the point of care', W / 2, 115, 50, anchor='middle')]


def person(cx, cy):
    return (f'<circle cx="{cx}" cy="{cy-46}" r="27" fill="#fff"/>'
            f'<path d="M{cx-54} {cy+66} C{cx-54} {cy+6} {cx-30} {cy-8} {cx} {cy-8} C{cx+30} {cy-8} {cx+54} {cy+6} {cx+54} {cy+66} Q{cx} {cy+80} {cx-54} {cy+66} Z" fill="#fff"/>')


def eye(cx, cy):
    return (f'<path d="M{cx-68} {cy} Q{cx} {cy-64} {cx+68} {cy} Q{cx} {cy+64} {cx-68} {cy} Z" fill="none" stroke="#fff" stroke-width="10" stroke-linejoin="round"/>'
            f'<circle cx="{cx}" cy="{cy}" r="25" fill="none" stroke="#fff" stroke-width="10"/>')


def shield_lock(cx, cy):
    shield = (f'M{cx} {cy-68} L{cx+60} {cy-46} V{cy+4} C{cx+60} {cy+40} {cx+32} {cy+60} {cx} {cy+72} '
              f'C{cx-32} {cy+60} {cx-60} {cy+40} {cx-60} {cy+4} V{cy-46} Z')
    return (f'<path d="{shield}" fill="none" stroke="#fff" stroke-width="6" stroke-linejoin="round"/>'
            f'<path d="M{cx-17} {cy-4} V{cy-19} A17 17 0 0 1 {cx+17} {cy-19} V{cy-4}" fill="none" stroke="#fff" stroke-width="6"/>'
            f'<rect x="{cx-27}" y="{cy-5}" width="54" height="42" rx="6" fill="none" stroke="#fff" stroke-width="6"/>'
            f'<circle cx="{cx}" cy="{cy+12}" r="5" fill="#fff"/><path d="M{cx} {cy+14} V{cy+25}" stroke="#fff" stroke-width="5" stroke-linecap="round"/>')


def review_pay(cx, cy):
    x, y = cx - 58, cy - 70
    lines = ''.join(f'<path d="M{x+20} {y+34+i*22} H{x+70}" stroke="#fff" stroke-width="6" stroke-linecap="round"/>' for i in range(3))
    return (f'<rect x="{x}" y="{y}" width="92" height="120" rx="10" fill="none" stroke="#fff" stroke-width="6"/>{lines}'
            f'<path d="M{x+18} {y+102} l10 10 l20 -22" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>'
            f'<circle cx="{cx+36}" cy="{cy+40}" r="34" fill="{BG}" stroke="#fff" stroke-width="6"/>'
            + text('$', cx + 36, cy + 54, 40, weight='Regular', anchor='middle'))


ICONS = [person, eye, shield_lock, review_pay]
STEPS = [('Enroll', ['member and dependants', 'scanned once']),
         ('Visit', ['clinic scans the member', 'at the point of care']),
         ('Claim', ['carries the result', 'of the member check']),
         ('Review & pay', ['coverage and clinical checks', 'as usual, then payment'])]

for i, (cx, icon, (title, sub)) in enumerate(zip(XS, ICONS, STEPS)):
    out.append(f'<circle cx="{cx}" cy="{CY}" r="{R}" fill="url(#g)"/>')
    out.append(f'<circle cx="{cx}" cy="{CY}" r="{R-3}" fill="none" stroke="#fff" stroke-opacity=".75" stroke-width="5" filter="url(#glow)"/>')
    out.append(f'<circle cx="{cx}" cy="{CY}" r="{R-1}" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="1.5"/>')
    out.append(icon(cx, CY))
    if i < 3:
        out.append(f'<path d="M{cx+R+15} {CY} H{XS[i+1]-R-15}" stroke="#fff" stroke-width="2.5" marker-end="url(#ah)"/>')
    out.append(f'<circle cx="{cx}" cy="620" r="25" fill="#fff"/>')
    out.append(text(str(i + 1), cx, 630, 27, fill='#265b8f', weight='Regular', anchor='middle'))
    out.append(text(title, cx, 703, 40, weight='Regular', anchor='middle'))
    for j, line in enumerate(sub):
        out.append(text(line, cx, 752 + j * 34, 24, fill='#cfcfd2', anchor='middle'))

foot = ['Borrowed cards, ghost patients and visits that never happened fail at step 2.',
        'The check confirms who was treated; whether the treatment was needed is reviewed as before.',
        'Offline devices store the check and synchronize when the connection is back.']
for j, line in enumerate(foot):
    out.append(text(line, W / 2, 965 + j * 38, 24, fill='#e2e2e4', anchor='middle'))
out.append('</svg>')
dst = os.path.join(os.path.dirname(__file__), '..', '..', 'assets', 'img', 'health-insurance-claim-flow.svg')
open(dst, 'w').write('\n'.join(out))
print(dst, os.path.getsize(dst))
