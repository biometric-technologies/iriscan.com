/* Home hero background: an iris drawn in dots, slowly turning.
 *
 * The dots sit on a polar grid. Their brightness follows the patterns of a real iris, so the
 * picture reads as an eye and not as a random particle field: radial fibres, a zigzag collarette
 * a third of the way out, dark crypts in the outer zone, concentric contraction furrows near the
 * edge, and a darker limbus. The iris is cut into rings that turn at different speeds and in
 * alternating directions.
 *
 * Every ring is drawn once into its own offscreen canvas; a frame only rotates and copies those
 * few images, so the animation costs almost nothing. It stops while the hero is off screen, and
 * draws a single still frame for people who asked their system for reduced motion.
 */
(function () {
  var host = document.querySelector('.hero-iris');
  if (!host || !document.createElement('canvas').getContext) return;

  var canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%';
  host.appendChild(canvas);
  var ctx = canvas.getContext('2d');

  var BANDS = 7;            // rings that turn separately
  var STEP = 6.5;           // distance between dots, CSS pixels
  var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // a small seeded generator, so the iris looks the same on every visit
  function rng(seed) { return function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }

  var dpr, W, H, cx, cy, R, rp, bands, speeds, crypts, rand;

  function layout() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    W = host.clientWidth; H = host.clientHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    var wide = W > 900;
    R = wide ? Math.min(H * 0.47, W * 0.3) : Math.min(W * 0.62, H * 0.42);
    cx = wide ? W - R - Math.max(40, W * 0.06) : W * 0.62;
    cy = wide ? H * 0.5 : H * 0.42;
    rp = R * 0.22;          // pupil radius
    rand = rng(20261102);
    crypts = [];
    for (var i = 0; i < 26; i++) {
      crypts.push({ a: rand() * Math.PI * 2, u: 0.4 + rand() * 0.38,
                    da: 0.05 + rand() * 0.09, du: 0.04 + rand() * 0.08 });
    }
    build();
  }

  // brightness 0..1 of a dot at relative radius u (0 = pupil edge, 1 = limbus) and angle a
  function iris(u, a) {
    // collarette: a zigzag ring that splits the pupillary and the ciliary zone
    var uc = 0.3 + 0.03 * Math.sin(a * 9) + 0.015 * Math.sin(a * 23 + 1);
    var inner = u < uc;
    // radial fibres, finer and more regular near the pupil
    var twist = 1.4 * Math.sin(a * 3 + u * 4);
    var f1 = 0.5 + 0.5 * Math.sin(a * (inner ? 90 : 56) + twist);
    var f2 = 0.5 + 0.5 * Math.sin(a * 37 - twist * 0.7 + u * 6);
    var v = 0.15 + 0.85 * Math.pow(0.6 * f1 + 0.4 * f2, 2.6);
    if (Math.abs(u - uc) < 0.022) v = Math.max(v, 0.95);
    if (!inner) {
      for (var i = 0; i < crypts.length; i++) {
        var c = crypts[i];
        var da = Math.atan2(Math.sin(a - c.a), Math.cos(a - c.a)) / c.da, du = (u - c.u) / c.du;
        var d = da * da + du * du;
        if (d < 1) { v = d < 0.65 ? v * 0.05 : Math.min(1, v * 1.6); break; }   // a hole with a lighter rim
      }
      // contraction furrows: thin dark circles near the edge
      var w = 0.006 * Math.sin(a * 14);
      if (Math.abs(u - 0.8 - w) < 0.012 || Math.abs(u - 0.89 + w) < 0.01) v *= 0.25;
    }
    if (u > 0.93) v *= 0.55;                               // the darker limbus
    return v;
  }

  function build() {
    bands = []; speeds = [];
    var rings = [];
    for (var r = rp + STEP; r <= R; r += STEP) rings.push(r);
    var per = Math.ceil(rings.length / BANDS);
    for (var b = 0; b < BANDS; b++) {
      // each band only as big as its outer ring: copying the images is what a frame costs
      var outer = rings[Math.min(rings.length, (b + 1) * per) - 1] + 4;
      var off = document.createElement('canvas');
      off.width = off.height = Math.ceil(outer * 2 * dpr);
      var g = off.getContext('2d');
      g.scale(dpr, dpr);
      g.translate(outer, outer);
      for (var k = b * per; k < Math.min(rings.length, (b + 1) * per); k++) {
        var rr = rings[k], u = (rr - rp) / (R - rp);
        var n = Math.floor(2 * Math.PI * rr / STEP);
        var phase = rand() * 6.283;
        for (var j = 0; j < n; j++) {
          if (rand() < 0.12) continue;                     // gaps keep it organic
          var a = phase + 2 * Math.PI * j / n;
          var v = iris(u, a);
          var rad = 0.45 + 0.75 * v * (0.75 + 0.5 * u);     // CSS pixels
          var alpha = 0.07 + 0.6 * v * (1 - 0.3 * u);
          var rj = rr + (rand() - 0.5) * 2.2;
          g.fillStyle = u < 0.3 ? 'rgba(120,200,255,' + alpha.toFixed(3) + ')'
                                : 'rgba(70,150,220,' + alpha.toFixed(3) + ')';
          g.beginPath(); g.arc(rj * Math.cos(a), rj * Math.sin(a), rad, 0, 6.2832); g.fill();
        }
      }
      bands.push(off);
      // radians per second: one turn in 3 to 7 minutes, alternating directions
      speeds.push((b % 2 ? -1 : 1) * (2 * Math.PI) / (180 + b * 40));
    }
  }

  function frame(t) {
    var s = t / 1000;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    // a faint glow behind the iris
    var glow = ctx.createRadialGradient(cx, cy, rp, cx, cy, R * 1.25);
    glow.addColorStop(0, 'rgba(28,119,195,0.10)'); glow.addColorStop(1, 'rgba(10,50,143,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
    var breathe = 1 + 0.012 * Math.sin(s * 2 * Math.PI / 11);
    for (var b = 0; b < bands.length; b++) {
      ctx.save();
      ctx.translate(cx, cy); ctx.rotate(s * speeds[b]); ctx.scale(breathe / dpr, breathe / dpr);
      ctx.drawImage(bands[b], -bands[b].width / 2, -bands[b].height / 2);
      ctx.restore();
    }
    // pupil
    ctx.fillStyle = '#0b0c0f';
    ctx.beginPath(); ctx.arc(cx, cy, rp * breathe, 0, 6.2832); ctx.fill();
    ctx.strokeStyle = 'rgba(92,200,255,0.18)'; ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = 'rgba(232,246,255,0.35)';
    ctx.beginPath(); ctx.arc(cx - rp * 0.3, cy - rp * 0.34, Math.max(2.5, rp * 0.06), 0, 6.2832); ctx.fill();
  }

  var visible = true, raf = 0;
  var last = -1e9;
  function loop(t) {
    // about 30 frames a second is plenty for something that turns a degree or two a second
    if (t - last > 32) { frame(t); last = t; }
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
