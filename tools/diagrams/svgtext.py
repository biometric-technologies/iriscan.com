"""Text as SVG paths in Poppins, so diagrams look the same when the browser
loads them as <img> (which cannot use web fonts)."""
import os
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

FONT_DIRS = [os.environ.get('POPPINS_DIR', ''), '/usr/share/fonts/truetype/google-fonts']
_fonts = {}


def _font(weight):
    if weight not in _fonts:
        for d in FONT_DIRS:
            p = os.path.join(d, f'Poppins-{weight}.ttf')
            if d and os.path.exists(p):
                f = TTFont(p)
                _fonts[weight] = (f, f.getGlyphSet(), f.getBestCmap(), f['head'].unitsPerEm, f['hmtx'])
                break
        else:
            raise SystemExit(f'Poppins-{weight}.ttf not found; set POPPINS_DIR')
    return _fonts[weight]


def width(text, size, weight='Light'):
    f, gs, cmap, upm, hmtx = _font(weight)
    return sum(hmtx[cmap[ord(c)]][0] for c in text) * size / upm


def text(s, x, y, size, fill='#fff', weight='Light', anchor='start', opacity=None):
    """One line of text as a <path>; y is the baseline."""
    f, gs, cmap, upm, hmtx = _font(weight)
    sc = size / upm
    w = width(s, size, weight)
    x0 = x - w / 2 if anchor == 'middle' else x - w if anchor == 'end' else x
    pen = SVGPathPen(gs, ntos=lambda v: ('%.1f' % v).rstrip('0').rstrip('.'))
    cx = x0
    for c in s:
        g = cmap[ord(c)]
        gs[g].draw(TransformPen(pen, (sc, 0, 0, -sc, cx, y)))
        cx += hmtx[g][0] * sc
    op = f' opacity="{opacity}"' if opacity is not None else ''
    return f'<path d="{pen.getCommands()}" fill="{fill}"{op}/>'
