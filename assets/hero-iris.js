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

  var dpr, W, H, cx, cy, R, rp, layer, flow, dust, fray;
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

    // the collarette: a jagged ring about a third of the way out that splits the pupillary zone
    // (fine radial texture, greenish) from the ciliary zone (crypts, furrows, blue to grey)
    var cph1 = rand() * 6.2832, cph2 = rand() * 6.2832, cph3 = rand() * 6.2832;
    function collar(a) {
      return 0.34 + 0.045 * Math.sin(5 * a + cph1) + 0.03 * Math.sin(11 * a + cph2) + 0.018 * Math.sin(23 * a + cph3);
    }

    // crypts of Fuchs: irregular lozenge-shaped hollows, most of them just outside the collarette;
    // their outline is a circle bent by a few random harmonics, stretched along the radius
    var crypts = [], k;
    for (k = 0; k < 10; k++) {
      var near = rand() < 0.7;
      var ca = rand() * 6.2832;
      crypts.push({ a: ca, u: near ? collar(ca) + 0.04 + rand() * 0.12 : 0.55 + rand() * 0.3,
                    da: 0.025 + rand() * 0.05, du: 0.05 + rand() * 0.11,
                    h: [rand() * 0.35, rand() * 6.28, rand() * 0.25, rand() * 6.28, rand() * 0.15, rand() * 6.28],
                    tilt: (rand() - 0.5) * 0.8 });
    }
    // contraction furrows: broken, wavy dark arcs near the edge
    var furrows = [];
    for (k = 0; k < 0; k++) {
      furrows.push({ u: 0.7 + rand() * 0.22, a0: rand() * 6.2832, len: 0.5 + rand() * 1.8, ph: rand() * 6.28 });
    }
    function feature(u, a) {
      for (var i = 0; i < crypts.length; i++) {
        var c = crypts[i];
        var da = Math.atan2(Math.sin(a - c.a), Math.cos(a - c.a)) / c.da, du = (u - c.u) / c.du;
        var x = da + c.tilt * du, y = du;                 // a slight slant, like real ones
        var th = Math.atan2(y, x), rr = Math.hypot(x, y);
        var edge = 1 + c.h[0] * Math.sin(2 * th + c.h[1]) + c.h[2] * Math.sin(3 * th + c.h[3]) + c.h[4] * Math.sin(5 * th + c.h[5]);
        if (rr < edge) return rr < edge * 0.75 ? 0 : 2;   // inside: dark; on the rim: brighter
      }
      for (i = 0; i < furrows.length; i++) {
        var f = furrows[i], rel = ((a - f.a0) % 6.2832 + 6.2832) % 6.2832;
        if (rel < f.len && Math.sin(a * 31 + f.ph) > -0.3 && Math.abs(u - f.u - 0.01 * Math.sin(a * 9 + f.ph)) < 0.006) return 0;
      }
      return 1;
    }

    // fine speckle over the whole iris, never on a grid
    var n = Math.round(R * R * 0.7), i, u, a, r, q, fe;
    for (i = 0; i < n; i++) {
      u = Math.sqrt(rand()); a = rand() * 6.2832; r = rp + u * (R - rp);
      fe = feature(u, a);
      if (fe === 0 && rand() < 0.35) continue;
      q = at(r, a);
      dot(g, q[0], q[1], 0.35 + rand() * 0.45, tint(u), (0.05 + 0.2 * rand()) * light(q[0], q[1]) * (fe === 2 ? 1.1 : 1));
    }
    // fibres: wavy curves from the pupil outwards, crossing each other; every dot is nudged off
    // the curve and the steps vary, so no regular pattern appears
    var fibres = Math.round(R * 4.2);
    for (var fi = 0; fi < fibres; fi++) {
      var a0 = rand() * 6.2832, turn = (rand() < 0.5 ? -1 : 1) * (0.2 + rand() * 0.45), br = 0.3 + rand() * 0.7;
      var wph = rand() * 6.28, wamp = 0.01 + rand() * 0.03;
      for (r = rp + 2 + rand() * 3; r < R * 0.98; r += 1.4 + rand() * 1.6) {
        u = (r - rp) / (R - rp);
        a = a0 + turn * Math.sin(u * Math.PI * 0.5) + wamp * Math.sin(u * 14 + wph);
        fe = feature(u, a);
        if ((fe === 0 && rand() < 0.45) || rand() < 0.3) continue;
        var inner = u < collar(a);
        q = at(r + (rand() - 0.5) * 1.2, a + (rand() - 0.5) * 0.0008);
        dot(g, q[0], q[1], 0.4 + rand() * 0.25, inner ? '#cfe5cc' : (u > 0.82 ? '#c4cad2' : '#cfe1f3'),
            (0.09 + 0.34 * br) * (inner ? 0.85 : 1 - 0.3 * u) * light(q[0], q[1]) * (fe === 2 ? 1.15 : 1));
      }
    }
    // the collarette itself: a bright, ragged band along the jagged line
    var gph = rand() * 6.28;
    for (i = 0; i < R * 26; i++) {
      a = rand() * 6.2832; u = collar(a) + (rand() + rand() + rand() - 1.5) * 0.035;
      var gap = 0.5 + 0.5 * Math.sin(a * 17 + gph) * Math.sin(a * 5 + 1);   // a broken, uneven ridge
      r = rp + u * (R - rp); q = at(r, a);
      dot(g, q[0], q[1], 0.4 + rand() * 0.4, '#d3e6cc', (0.03 + 0.14 * rand()) * (0.35 + 0.65 * gap) * light(q[0], q[1]));
    }
    // a few faint, uneven light streaks inside the collarette
    for (var sp = 0; sp < 22; sp++) {
      var ac = rand() * 6.2832, len = collar(ac) * (0.4 + rand() * 0.6), w0 = 0.01 + rand() * 0.025;
      for (var j = 0; j < 90; j++) {
        var tt = rand();
        q = at(rp + 1 + tt * len * (R - rp), ac + (rand() * 2 - 1) * w0 * (1 - tt));
        dot(g, q[0], q[1], 0.4 + rand() * 0.3, '#e1eedb', (0.05 + 0.18 * (1 - tt)) * light(q[0], q[1]));
      }
    }
    // dark crypt floors and furrows: shade them a little, so they read as hollows
    for (i = 0; i < R * R * 0.35; i++) {
      u = Math.sqrt(rand()); a = rand() * 6.2832;
      if (feature(u, a) !== 0) continue;
      q = at(rp + u * (R - rp), a);
      dot(g, q[0], q[1], 0.9, '#0a131c', 0.1);
    }
    // radial furrows: thin dark streaks in the ciliary zone
    for (var d = 0; d < 34; d++) {
      var ad = rand() * 6.2832, from = 0.45 + rand() * 0.25, to = from + 0.15 + rand() * 0.3, wob = rand() * 6.28;
      for (r = rp + from * (R - rp); r < rp + Math.min(to, 0.97) * (R - rp); r += 1.3 + rand()) {
        q = at(r, ad + 0.01 * Math.sin(r * 0.08 + wob) + (rand() - 0.5) * 0.01);
        dot(g, q[0], q[1], 0.7 + rand() * 0.4, '#0c1520', 0.22 + rand() * 0.15);
      }
    }
    // a few pigment freckles of uneven shape
    for (var pf = 0; pf < 4; pf++) {
      var pa = rand() * 6.2832, pu = 0.5 + rand() * 0.38, pr = R * (0.012 + rand() * 0.02), pc = at(rp + pu * (R - rp), pa);
      var e1 = rand() * 0.6, e2 = rand() * 6.28;
      for (j = 0; j < 140; j++) {
        var t2 = rand() * 6.2832, d2 = Math.sqrt(rand()) * pr * (1 + e1 * Math.sin(2 * t2 + e2));
        dot(g, pc[0] + d2 * Math.cos(t2), pc[1] + d2 * Math.sin(t2), 0.5, '#7d6440', 0.12 + 0.2 * rand());
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
    shade.addColorStop(0, 'rgba(10,14,20,0)'); shade.addColorStop(0.6, 'rgba(10,14,20,0.18)'); shade.addColorStop(1, 'rgba(10,14,20,0.5)');
    g.save(); g.beginPath(); g.arc(cx, cy, R, 0, 6.2832); g.clip();
    g.fillStyle = shade; g.fillRect(cx - R, cy - R, 2 * R, 2 * R);
    g.restore();
    var lim = g.createRadialGradient(cx, cy, R * 0.84, cx, cy, R * 1.01);
    lim.addColorStop(0, 'rgba(14,18,24,0)'); lim.addColorStop(0.75, 'rgba(14,18,24,0.6)'); lim.addColorStop(1, 'rgba(14,18,24,0)');
    g.fillStyle = lim; g.beginPath(); g.arc(cx, cy, R * 1.01, 0, 6.2832); g.fill();
    // the pupil
    var pup = g.createRadialGradient(cx, cy, rp * 0.86, cx, cy, rp * 1.08);
    pup.addColorStop(0, '#05070a'); pup.addColorStop(1, 'rgba(5,7,10,0)');
    g.fillStyle = pup; g.beginPath(); g.arc(cx, cy, rp * 1.08, 0, 6.2832); g.fill();
    g.globalAlpha = 1;
  }

  // the stream: dots on straight spokes from the centre; past the edge each one turns a little
  // off its spoke and drifts away, fading
  function buildFlow() {
    // gold dust in two diagonal plumes through the iris, from the upper left to the lower right
    dust = [];
    var ddx = Math.cos(0.5), ddy = Math.sin(0.5);
    for (var di = 0; di < 650; di++) {
      var side = rand() < 0.5 ? -1 : 1;
      var along = (rand() - 0.5) * R * 5;
      var spread = (Math.pow(rand(), 1.8) * R * 1.1 + R * 0.6) * side * (rand() < 0.2 ? 0.45 : 1);
      var flake = rand() < 0.05;
      dust.push({ x: cx + ddx * along - ddy * spread * 0.55, y: cy + ddy * along + ddx * spread * 0.55,
                  r: flake ? 1.3 + rand() * 1.3 : 0.35 + rand() * 0.75, a: flake ? 0.3 + rand() * 0.25 : 0.12 + rand() * 0.38,
                  v: 1.5 + rand() * 3.5, tw: 6 + rand() * 10, ph: rand() * 6.2832 });
    }
    dust.dx = ddx; dust.dy = ddy; dust.span = R * 5;
    // the frayed edge: loose dots just outside the limbus, thinning out; each sways very slowly
    // around its place (a pixel or two, over 10 to 30 seconds)
    fray = [];
    for (var fi2 = 0; fi2 < R * 22; fi2++) {
      var fa = rand() * 6.2832, fo = Math.pow(rand(), 2.2) * 0.09, fr = R * (0.99 + fo);
      var fx = cx + fr * Math.cos(fa), fy = cy + fr * Math.sin(fa);
      fray.push({ x: fx, y: fy, ux: Math.cos(fa), uy: Math.sin(fa),
                  r: 0.4 + rand() * 0.4, c: rand() < 0.5 ? '#8fb3d6' : '#a9b0b9',
                  a: Math.max(0, (0.35 - fo * 3) * light(fx, fy)),
                  amp: 0.6 + rand() * 1.6, per: 10 + rand() * 20, ph: rand() * 6.2832, ph2: rand() * 6.2832 });
    }
    flow = [];
    var spokes = 180, perSpoke = 18;
    for (var sIdx = 0; sIdx < spokes; sIdx++) {
      for (var k = 0; k < perSpoke; k++) {
        flow.push({
          a: (sIdx + rand() * 0.6) / spokes * 6.2832,
          t0: rand(),                                   // where in its life it starts
          life: 50 + rand() * 50,                       // seconds from the edge to vanishing
          off: (rand() - 0.5) * 0.9,                    // how far it turns away from its spoke
          size: 0.45 + rand() * 0.55,
          blue: rand() < 0.45
        });
      }
    }
  }

  function frame(t) {
    var s = t / 1000;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // the stream goes behind the iris and is seen only where it frays off the edge: the dots
    // have the colour and size of the iris edge, they linger there and then drift away faster,
    // turning off their spokes and fading
    for (var i = 0; i < flow.length; i++) {
      var p = flow[i];
      var life = ((p.t0 + s / p.life) % 1);             // 0 at the edge, 1 gone
      var out = life * life;                            // slow to leave, faster later
      var r = R * (0.985 + 1.3 * out);
      var a = p.a + p.off * out;
      var x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
      ctx.globalAlpha = 0.55 * Math.pow(1 - life, 1.4);
      ctx.fillStyle = p.blue ? '#8fb3d6' : '#a9b0b9';
      ctx.beginPath(); ctx.arc(x, y, p.size, 0, 6.2832); ctx.fill();
    }

    // gold dust, drifting along its plumes, behind the iris too
    ctx.fillStyle = '#d6b46a';
    for (i = 0; i < dust.length; i++) {
      var d = dust[i], m = (d.v * s) % dust.span;
      var gx = d.x + dust.dx * m, gy = d.y + dust.dy * m;
      if ((gx - cx) * dust.dx + (gy - cy) * dust.dy > dust.span / 2) { gx -= dust.dx * dust.span; gy -= dust.dy * dust.span; }
      ctx.globalAlpha = d.a * (0.55 + 0.45 * Math.sin(s * 6.2832 / d.tw + d.ph));
      ctx.beginPath(); ctx.arc(gx, gy, d.r, 0, 6.2832); ctx.fill();
    }

    // the iris in front: an opaque disc in the page colour, then the painted iris, muted
    ctx.globalAlpha = 1; ctx.fillStyle = BG;
    ctx.beginPath(); ctx.arc(cx, cy, R * 0.995, 0, 6.2832); ctx.fill();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 0.9;
    ctx.drawImage(layer, 0, 0);
    // the frayed edge over it, swaying slowly: mostly in and out, a little sideways
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (i = 0; i < fray.length; i++) {
      var e = fray[i], w = s * 6.2832 / e.per;
      var radial = e.amp * Math.sin(w + e.ph), side = e.amp * 0.5 * Math.sin(w * 0.7 + e.ph2);
      ctx.globalAlpha = e.a * 0.9; ctx.fillStyle = e.c;
      ctx.beginPath(); ctx.arc(e.x + e.ux * radial - e.uy * side, e.y + e.uy * radial + e.ux * side, e.r, 0, 6.2832); ctx.fill();
    }
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
