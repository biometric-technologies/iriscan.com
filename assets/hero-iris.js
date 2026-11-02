/* Home hero background: an iris and a drift of gold dust, drawn in dots.
 *
 * The iris is built the way an illustrator paints one: a blue base, warmer towards the pupil, a
 * haze of warm dots around the pupil, curved fibres that cross each other into a lattice, a star
 * of light spikes (the collarette) around the pupil, dark radial streaks, and a dark limbus. All of
 * that is drawn once into an offscreen canvas.
 *
 * Only the gold dust moves, and barely: each grain drifts a few pixels a second along the plume
 * and slowly brightens and fades. It is a background, so it should be felt rather than watched.
 * The animation stops while the hero is off screen and is replaced by one still frame for people
 * who asked their system for reduced motion.
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

  // a small seeded generator, so the picture is the same on every visit
  var seed;
  function rand() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }

  var dpr, W, H, cx, cy, R, rp, layer, dust;

  function dot(g, x, y, r, color, a) {
    g.globalAlpha = a; g.fillStyle = color;
    g.beginPath(); g.arc(x, y, r, 0, 6.2832); g.fill();
  }

  function layout() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    W = host.clientWidth; H = host.clientHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    var wide = W > 900;
    var outer = wide ? Math.min(H * 0.37, W * 0.22) : Math.min(W * 0.6, H * 0.38);
    R = outer;                        // iris radius
    rp = R * 0.27;                    // pupil
    cx = wide ? W - outer - Math.max(60, W * 0.08) : W * 0.62;
    cy = wide ? H * 0.5 : H * 0.42;
    seed = 20261102;
    buildLayer();
    buildDust();
  }

  function buildLayer() {
    layer = document.createElement('canvas');
    layer.width = canvas.width; layer.height = canvas.height;
    var g = layer.getContext('2d');
    g.scale(dpr, dpr);

    // the iris: a smooth blue base, warmer towards the pupil, darker at the limbus
    var base = g.createRadialGradient(cx, cy, rp, cx, cy, R);
    base.addColorStop(0, '#5a4a2a'); base.addColorStop(0.3, '#3b4d55'); base.addColorStop(0.75, '#22476e');
    base.addColorStop(0.95, '#162c45'); base.addColorStop(1, '#0f1c2b');
    g.globalAlpha = 0.38; g.fillStyle = base;
    g.beginPath(); g.arc(cx, cy, R, 0, 6.2832); g.fill();

    function inIris(x, y) { var d = Math.hypot(x - cx, y - cy); return d > rp && d < R; }
    function at(r, a) { return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; }

    // a warm haze around the pupil, in fine dots
    for (var i = 0; i < R * R * 0.9; i++) {
      var u = Math.pow(rand(), 1.6) * 0.55, a = rand() * 6.2832, r = rp + u * (R - rp), q = at(r, a);
      dot(g, q[0], q[1], 0.45 + rand() * 0.35, '#d9b45e', 0.05 + 0.3 * (1 - u / 0.55));
    }
    // blue speckle over the whole iris
    for (i = 0; i < R * R * 1.2; i++) {
      u = Math.sqrt(rand()); a = rand() * 6.2832; r = rp + u * (R - rp); q = at(r, a);
      dot(g, q[0], q[1], 0.4 + rand() * 0.4, u < 0.35 ? '#9fb7a8' : '#6fa7dc', 0.08 + 0.26 * rand());
    }
    // crossing fibres: curves that leave the pupil and turn left or right on the way out, which
    // weaves the lattice of a real iris
    var fibres = Math.round(R * 3.2);
    for (var f = 0; f < fibres; f++) {
      var a0 = rand() * 6.2832, turn = (rand() < 0.5 ? -1 : 1) * (0.35 + rand() * 0.5), br = 0.4 + rand() * 0.6;
      for (r = rp + 2; r < R * 0.97; r += 1.9) {
        u = (r - rp) / (R - rp);
        q = at(r, a0 + turn * Math.sin(u * Math.PI * 0.5));
        if (rand() < 0.25) continue;
        dot(g, q[0], q[1], 0.5, u < 0.3 ? '#efdcaa' : '#cfe4f6', (0.1 + 0.32 * br) * (1 - 0.35 * u));
      }
    }
    // the collarette: a star of light spikes around the pupil
    var spikes = 30;
    for (var sp = 0; sp < spikes; sp++) {
      var ac = (sp + rand() * 0.6) / spikes * 6.2832, reach = 0.22 + rand() * 0.2, w0 = 0.07 + rand() * 0.05;
      for (var j = 0; j < 260; j++) {
        var tt = rand(), ww = (rand() * 2 - 1) * w0 * (1 - tt) * (1 - tt * 0.4);
        r = rp + 1 + tt * reach * (R - rp); q = at(r, ac + ww);
        dot(g, q[0], q[1], 0.45 + rand() * 0.35, tt < 0.6 ? '#f2dca0' : '#e8eef0', 0.12 + 0.45 * (1 - tt));
      }
    }
    // dark radial streaks in the outer iris
    for (var d = 0; d < 46; d++) {
      var ad = rand() * 6.2832, from = 0.35 + rand() * 0.3, to = from + 0.2 + rand() * 0.35;
      for (r = rp + from * (R - rp); r < rp + Math.min(to, 0.98) * (R - rp); r += 1.6) {
        q = at(r, ad + (rand() - 0.5) * 0.012);
        dot(g, q[0], q[1], 0.9, '#0d1826', 0.35);
      }
    }
    // the limbus: a dark ring at the edge of the iris
    var lim = g.createRadialGradient(cx, cy, R * 0.82, cx, cy, R * 1.01);
    lim.addColorStop(0, 'rgba(10,18,30,0)'); lim.addColorStop(0.8, 'rgba(10,18,30,0.7)'); lim.addColorStop(1, 'rgba(10,18,30,0)');
    g.globalAlpha = 1; g.fillStyle = lim;
    g.beginPath(); g.arc(cx, cy, R * 1.01, 0, 6.2832); g.fill();

    // the pupil, with a soft edge
    var pup = g.createRadialGradient(cx, cy, rp * 0.88, cx, cy, rp * 1.1);
    pup.addColorStop(0, '#05060a'); pup.addColorStop(1, 'rgba(5,6,10,0)');
    g.fillStyle = pup; g.beginPath(); g.arc(cx, cy, rp * 1.1, 0, 6.2832); g.fill();
    g.globalAlpha = 1;
  }

  // gold dust in two diagonal plumes through the flower, from the upper left to the lower right
  function buildDust() {
    dust = [];
    var dx = Math.cos(0.5), dy = Math.sin(0.5);                   // the plume direction
    for (var i = 0; i < 700; i++) {
      var side = rand() < 0.5 ? -1 : 1;
      var along = (rand() - 0.5) * R * 5.2;
      var spread = (Math.pow(rand(), 1.8) * R * 1.1 + R * 0.75) * side * (rand() < 0.2 ? 0.4 : 1);
      var flake = rand() < 0.05;
      dust.push({
        x: cx + dx * along - dy * spread * 0.55, y: cy + dy * along + dx * spread * 0.55,
        r: flake ? 1.4 + rand() * 1.4 : 0.35 + rand() * 0.8,
        a: flake ? 0.35 + rand() * 0.25 : 0.15 + rand() * 0.45,
        v: 1.5 + rand() * 3.5,                                    // pixels per second, along the plume
        tw: 6 + rand() * 10, ph: rand() * 6.2832
      });
    }
    dust.dx = dx; dust.dy = dy; dust.span = R * 5.2;
  }

  function frame(t) {
    var s = t / 1000;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 0.72;                 // a background: muted
    ctx.drawImage(layer, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#d6b46a';
    for (var i = 0; i < dust.length; i++) {
      var p = dust[i];
      // drift along the plume and wrap around, so the plume never empties
      var m = ((p.v * s) % dust.span);
      var x = p.x + dust.dx * m, y = p.y + dust.dy * m;
      if ((x - cx) * dust.dx + (y - cy) * dust.dy > dust.span / 2) { x -= dust.dx * dust.span; y -= dust.dy * dust.span; }
      if (x < -5 || y < -5 || x > W + 5 || y > H + 5) continue;
      ctx.globalAlpha = p.a * (0.55 + 0.45 * Math.sin(s * 6.2832 / p.tw + p.ph));
      ctx.beginPath(); ctx.arc(x, y, p.r, 0, 6.2832); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  var visible = true, raf = 0, last = -1e9;
  function loop(t) {
    // the dust moves a few pixels a second: 20 frames a second are plenty
    if (t - last > 48) { frame(t); last = t; }
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
