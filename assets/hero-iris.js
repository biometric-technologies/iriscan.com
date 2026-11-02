/* Home hero background: an iris drawn in dots, with dots streaming out of it.
 *
 * The iris is painted once into an offscreen canvas, in layers like an illustrated iris: a base
 * that is greenish around the pupil, blue in the middle and greyish at the edge; crossing fibres;
 * a star of light spikes around the pupil (the collarette); and, placed at random as on a real
 * eye, crypts (dark hollows with a lighter rim), contraction furrows (broken dark arcs near the
 * edge), radial furrows and a few pigment spots. Light from the upper left and a darker limbus
 * make it look round rather than flat.
 *
 * The motion: dots travel out from the centre along straight spokes, so the stream looks
 * geometric. They pass behind the iris, which is drawn in front of them, so they appear only at
 * its edge, where they come loose and drift away in all directions, fading out. It moves a few pixels a
 * second: a background, felt rather than watched. The animation stops while the hero is off
 * screen and becomes one still frame for people who asked their system for reduced motion.
 */
(function () {
  var host = document.querySelector('.hero-iris');
  if (!host || !document.createElement('canvas').getContext) return;

  var canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%';
  host.appendChild(canvas);
  var ctx = canvas.getContext('2d');
  var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // a small seeded generator, so the iris is the same on every visit
  var seed;
  function rand() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }

  var dpr, W, H, cx, cy, R, rp, layer, flow;
  var BG = '#141416';                 // the page background
  var LIGHT = -2.3;                   // direction the light comes from (upper left), radians

  function dot(g, x, y, r, color, a) {
    if (a <= 0.004) return;
    g.globalAlpha = Math.min(a, 1); g.fillStyle = color;
    g.beginPath(); g.arc(x, y, r, 0, 6.2832); g.fill();
  }

  function layout() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    W = host.clientWidth; H = host.clientHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    var wide = W > 900;
    R = wide ? Math.min(H * 0.41, W * 0.24) : Math.min(W * 0.62, H * 0.38);
    rp = R * 0.27;
    cx = wide ? W - R * 0.86 : W * 0.62;   // a little cut by the right edge, clear of the text
    cy = wide ? H * 0.5 : H * 0.42;
    seed = 20261102;
    buildLayer();
    buildFlow();
  }

  // colour of the iris at relative radius u (0 at the pupil, 1 at the limbus)
  function tint(u) {
    if (u < 0.28) return '#9cc7a4';       // greenish around the pupil
    if (u < 0.36) return '#86b2b4';       // the change from green to blue
    if (u < 0.82) return '#86b6e2';       // blue
    return '#a3aab3';                     // greyish edge
  }

  // light from the upper left: brighter on that side, darker on the other, as on a curved surface
  function light(x, y) {
    var a = Math.atan2(y - cy, x - cx), u = Math.hypot(x - cx, y - cy) / R;
    return 0.78 + 0.3 * Math.cos(a - LIGHT) * Math.min(1, u * 1.2);
  }

  function buildLayer() {
    layer = document.createElement('canvas');
    layer.width = canvas.width; layer.height = canvas.height;
    var g = layer.getContext('2d');
    g.scale(dpr, dpr);
    function at(r, a) { return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; }

    // base
    var base = g.createRadialGradient(cx, cy, rp, cx, cy, R);
    base.addColorStop(0, '#2c4a3c'); base.addColorStop(0.32, '#2c4d5c'); base.addColorStop(0.7, '#21466c');
    base.addColorStop(0.9, '#2a3441'); base.addColorStop(1, '#151b22');
    g.globalAlpha = 0.42; g.fillStyle = base;
    g.beginPath(); g.arc(cx, cy, R, 0, 6.2832); g.fill();

    // the random features of this iris
    var crypts = [], k;
    for (k = 0; k < 11; k++) {
      crypts.push({ a: rand() * 6.2832, u: 0.38 + rand() * 0.4, da: 0.03 + rand() * 0.05, du: 0.06 + rand() * 0.1 });
    }
    var furrows = [];
    for (k = 0; k < 5; k++) {
      furrows.push({ u: 0.66 + rand() * 0.26, a0: rand() * 6.2832, len: 0.8 + rand() * 2.4 });
    }
    function feature(u, a) {
      for (var i = 0; i < crypts.length; i++) {
        var c = crypts[i];
        var da = Math.atan2(Math.sin(a - c.a), Math.cos(a - c.a)) / c.da, du = (u - c.u) / c.du;
        var d = da * da + du * du;
        if (d < 1) return d < 0.55 ? 0 : 2;   // inside a crypt: nothing; on its rim: brighter
      }
      for (i = 0; i < furrows.length; i++) {
        var f = furrows[i], rel = ((a - f.a0) % 6.2832 + 6.2832) % 6.2832;
        if (rel < f.len && Math.sin(a * 37 + i) > -0.2 && Math.abs(u - f.u - 0.008 * Math.sin(a * 11)) < 0.007) return 0;
      }
      return 1;
    }

    // fine speckle over the whole iris
    var n = Math.round(R * R * 1.3), i, u, a, r, q;
    for (i = 0; i < n; i++) {
      u = Math.sqrt(rand()); a = rand() * 6.2832; r = rp + u * (R - rp);
      var fe = feature(u, a);
      if (fe === 0 && rand() < 0.55) continue;
      q = at(r, a);
      dot(g, q[0], q[1], 0.4 + rand() * 0.4, tint(u), (0.06 + 0.22 * rand()) * light(q[0], q[1]) * (fe === 2 ? 1.25 : 1));
    }
    // crossing fibres: curves that turn left or right on the way out and weave a lattice
    var fibres = Math.round(R * 3.4);
    for (var f = 0; f < fibres; f++) {
      var a0 = rand() * 6.2832, turn = (rand() < 0.5 ? -1 : 1) * (0.3 + rand() * 0.5), br = 0.4 + rand() * 0.6;
      for (r = rp + 2; r < R * 0.97; r += 1.9) {
        u = (r - rp) / (R - rp);
        a = a0 + turn * Math.sin(u * Math.PI * 0.5);
        fe = feature(u, a);
        if ((fe === 0 && rand() < 0.6) || rand() < 0.25) continue;
        q = at(r, a);
        dot(g, q[0], q[1], 0.5, u < 0.3 ? '#d8ecd2' : (u > 0.82 ? '#c9ced5' : '#d4e6f6'),
            (0.09 + 0.3 * br) * (1 - 0.3 * u) * light(q[0], q[1]) * (fe === 2 ? 1.2 : 1));
      }
    }
    // the collarette: a star of pale green spikes around the pupil
    var spikes = 28 + Math.floor(rand() * 8);
    for (var sp = 0; sp < spikes; sp++) {
      var ac = (sp + rand() * 0.6) / spikes * 6.2832, reach = 0.2 + rand() * 0.22, w0 = 0.06 + rand() * 0.05;
      for (var j = 0; j < 240; j++) {
        var tt = rand(), ww = (rand() * 2 - 1) * w0 * (1 - tt) * (1 - tt * 0.4);
        r = rp + 1 + tt * reach * (R - rp); q = at(r, ac + ww);
        dot(g, q[0], q[1], 0.45 + rand() * 0.35, tt < 0.6 ? '#d9efcf' : '#e6eef0', (0.1 + 0.42 * (1 - tt)) * light(q[0], q[1]));
      }
    }
    // radial furrows: dark streaks in the outer iris
    for (var d = 0; d < 40; d++) {
      var ad = rand() * 6.2832, from = 0.36 + rand() * 0.3, to = from + 0.2 + rand() * 0.35;
      for (r = rp + from * (R - rp); r < rp + Math.min(to, 0.98) * (R - rp); r += 1.6) {
        q = at(r, ad + (rand() - 0.5) * 0.012);
        dot(g, q[0], q[1], 0.9, '#0c1520', 0.32);
      }
    }
    // a few pigment spots
    for (var p = 0; p < 4; p++) {
      var pa = rand() * 6.2832, pu = 0.45 + rand() * 0.4, pr = R * (0.015 + rand() * 0.025), pc = at(rp + pu * (R - rp), pa);
      for (j = 0; j < 120; j++) {
        var t2 = rand() * 6.2832, d2 = Math.sqrt(rand()) * pr;
        dot(g, pc[0] + d2 * Math.cos(t2), pc[1] + d2 * Math.sin(t2), 0.5, '#8a6a3c', 0.18 + 0.2 * rand());
      }
    }
    // a dark ruff right at the pupil's edge
    var ruff = g.createRadialGradient(cx, cy, rp, cx, cy, rp * 1.25);
    ruff.addColorStop(0, 'rgba(12,16,14,0.75)'); ruff.addColorStop(1, 'rgba(12,16,14,0)');
    g.globalAlpha = 1; g.fillStyle = ruff;
    g.beginPath(); g.arc(cx, cy, rp * 1.25, 0, 6.2832); g.fill();

    // volume: shade the side away from the light, then a dark limbus all round
    var lx = cx + Math.cos(LIGHT) * R * 0.5, ly = cy + Math.sin(LIGHT) * R * 0.5;
    var shade = g.createRadialGradient(lx, ly, R * 0.2, lx, ly, R * 1.6);
    shade.addColorStop(0, 'rgba(10,14,20,0)'); shade.addColorStop(1, 'rgba(10,14,20,0.32)');
    g.save(); g.beginPath(); g.arc(cx, cy, R, 0, 6.2832); g.clip();
    g.fillStyle = shade; g.fillRect(cx - R, cy - R, 2 * R, 2 * R);
    g.restore();
    var lim = g.createRadialGradient(cx, cy, R * 0.84, cx, cy, R * 1.01);
    lim.addColorStop(0, 'rgba(14,18,24,0)'); lim.addColorStop(0.75, 'rgba(14,18,24,0.6)'); lim.addColorStop(1, 'rgba(14,18,24,0)');
    g.fillStyle = lim; g.beginPath(); g.arc(cx, cy, R * 1.01, 0, 6.2832); g.fill();
    // the cornea catches a soft light on the lit side
    var hx = cx + Math.cos(LIGHT) * R * 0.45, hy = cy + Math.sin(LIGHT) * R * 0.45;
    var hl = g.createRadialGradient(hx, hy, 0, hx, hy, R * 0.45);
    hl.addColorStop(0, 'rgba(220,235,255,0.07)'); hl.addColorStop(1, 'rgba(220,235,255,0)');
    g.fillStyle = hl; g.beginPath(); g.arc(hx, hy, R * 0.45, 0, 6.2832); g.fill();
    // the pupil
    var pup = g.createRadialGradient(cx, cy, rp * 0.86, cx, cy, rp * 1.08);
    pup.addColorStop(0, '#05070a'); pup.addColorStop(1, 'rgba(5,7,10,0)');
    g.fillStyle = pup; g.beginPath(); g.arc(cx, cy, rp * 1.08, 0, 6.2832); g.fill();
    g.globalAlpha = 1;
  }

  // the stream: dots on straight spokes from the centre; past the edge each one turns a little
  // off its spoke and drifts away, fading
  function buildFlow() {
    flow = [];
    var spokes = 120, perSpoke = 14;
    for (var sIdx = 0; sIdx < spokes; sIdx++) {
      for (var k = 0; k < perSpoke; k++) {
        flow.push({
          a: sIdx / spokes * 6.2832,
          r0: rand(),                                   // where in its life it starts
          v: 6 + rand() * 5,                            // pixels per second while on the spoke
          off: (rand() - 0.5) * 1.2,                    // how far it turns once it leaves the iris
          size: 0.55 + rand() * 0.7,
          gold: rand() < 0.35
        });
      }
    }
  }

  function frame(t) {
    var s = t / 1000;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // the stream goes behind the iris: only the part that has left it is seen
    var reach = R * 2.3, span = reach - rp;
    for (var i = 0; i < flow.length; i++) {
      var p = flow[i];
      // distance travelled, wrapped so the stream never empties
      var r = rp + ((p.r0 * span + p.v * s) % span);
      if (r < R * 0.96) continue;                       // still behind the iris
      var out = Math.max(0, (r - R) / (reach - R));     // 0 at the edge, 1 where it vanishes
      var a = p.a + p.off * out * out;
      r += out * out * R * 0.4;                         // loose dots speed up a little
      var x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
      ctx.globalAlpha = 0.75 * (1 - out) * Math.min(1, out * 12 + 0.3);
      ctx.fillStyle = p.gold ? '#d8bb7a' : '#aab4c0';
      ctx.beginPath(); ctx.arc(x, y, p.size, 0, 6.2832); ctx.fill();
    }

    // the iris in front: an opaque disc in the page colour, then the painted iris, muted
    ctx.globalAlpha = 1; ctx.fillStyle = BG;
    ctx.beginPath(); ctx.arc(cx, cy, R * 0.995, 0, 6.2832); ctx.fill();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 0.85;
    ctx.drawImage(layer, 0, 0);
    ctx.globalAlpha = 1;
  }

  var visible = true, raf = 0, last = -1e9;
  function loop(t) {
    // the dots move a few pixels a second: 24 frames a second are plenty
    if (t - last > 40) { frame(t); last = t; }
    raf = visible ? requestAnimationFrame(loop) : 0;
  }
  function start() { if (still) { frame(0); return; } if (!raf) raf = requestAnimationFrame(loop); }

  layout();
  start();
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (e) { visible = e[0].isIntersecting; if (visible) start(); }).observe(host);
  }
  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { layout(); if (still) frame(0); }, 150);
  });
})();
