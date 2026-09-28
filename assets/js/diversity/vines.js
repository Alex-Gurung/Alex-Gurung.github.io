/* Climbing margin vines.
   Two peepal creepers grow out of the hero banyan's outermost roots, creep
   along the ground, then turn down the left and right margins. They grow with
   the reader's scroll position, leaves unfurl once as the vine reaches them,
   and at each section heading one vine sends a curling tendril toward the text
   column (never into it). Same style on both sides, but each vine has its own
   seed and wave rhythm, so they are not mirror images. Deterministic.

   Cost:
   - The geometry is computed once per layout as plain data, in idle-time
     chunks after load, with all layout reads done up front.
   - Each vine is drawn in tall SVG tiles cropped to its margin, and a tile's
     DOM is created only when it comes within ~1.5 viewports of the screen.
   - A tile holds ~20 elements: its stem and strand, plus one merged <path>
     per style (all its settled leaves of one tint, their veins, stalks,
     flowers, buds, dots). Only the few pieces unfurling near the growing tip
     get elements of their own; when they settle they are merged back in.
   - Growth and unfurls run in one rAF loop that stops when caught up, so
     nothing runs at rest. No CSS transitions or animations.
   Wide screens get margin vines; narrow screens a creeper along the ground. */
(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var MIN_W = 1196;              // below this the margins are too narrow
  var MIN_MARGIN = 140;          // margin (px) each side needs for the climbing vines
  var COL = 900;                 // the page frame's width; re-measured on every build
  var CREEP_DELAY = 3000;        // ms after start: the banyan is grown by then
  var AHEAD = 1.1;               // grow to just past the bottom of the viewport
  var TILE = 800;                // tile height (px)
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var wide = window.matchMedia('(min-width: ' + MIN_W + 'px)');

  var PEEPAL = 'M0,0 C-0.45,-0.05 -0.62,-0.55 -0.3,-0.82 C-0.16,-0.94 -0.05,-1.0 0,-1.3 ' +
               'C0.05,-1.0 0.16,-0.94 0.3,-0.82 C0.62,-0.55 0.45,-0.05 0,0 Z';
  // Kachni line work: a midrib and three pairs of short veins.
  var VEINS = 'M0,-0.04 L0,-1.08 M0,-0.2 L-0.27,-0.38 M0,-0.2 L0.27,-0.38 M0,-0.44 L-0.3,-0.63 ' +
              'M0,-0.44 L0.3,-0.63 M0,-0.68 L-0.18,-0.85 M0,-0.68 L0.18,-0.85';
  var BUD = 'M0,0 C-1.6,-1 -1.5,-3.2 0,-4.4 C1.5,-3.2 1.6,-1 0,0Z';
  // Flat Madhubani fills: yellow-leaning greens, now and then turmeric.
  var TINTS = ['c1', 'c2', 'c3', 'c4'];
  // The merged static paths of a tile, in paint order: [key, class].
  var LAYERS = [['stalk', 'vxa-line vxa-stalk'], ['curl', 'vxa-line vxa-curl'], ['tendril', 'vxa-line vxa-tendril'],
    ['lf-c1', 'lf c1'], ['rib-c1', 'rib'], ['lf-c2', 'lf c2'], ['rib-c2', 'rib'], ['lf-c3', 'lf c3'], ['rib-c3', 'rib'],
    ['lf-c4', 'lf c4'], ['rib-c4', 'rib'], ['lf-ct', 'lf ct'], ['rib-ct', 'rib'], ['lf-end', 'lf end'], ['rib-end', 'rib end'],
    ['bud', 'bud'], ['pt', 'pt'], ['ctr', 'ctr'], ['dot', 'vxa-dot'], ['dot-tur', 'vxa-dot tur']];

  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function seeded(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = Math.imul(a ^ (a >>> 15), a | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function f(n) { return n.toFixed(1); }
  function polyD(pts) {
    var s = 'M' + f(pts[0][0]) + ',' + f(pts[0][1]);
    for (var i = 1; i < pts.length; i++) s += 'L' + f(pts[i][0]) + ',' + f(pts[i][1]);
    return s;
  }
  function cumLen(pts) {
    var c = [0];
    for (var i = 1; i < pts.length; i++) {
      var dx = pts[i][0] - pts[i - 1][0], dy = pts[i][1] - pts[i - 1][1];
      c.push(c[i - 1] + Math.sqrt(dx * dx + dy * dy));
    }
    return c;
  }
  function bez(p0, p1, p2, p3, n, out) {
    for (var i = 1; i <= n; i++) {
      var t = i / n, u = 1 - t;
      out.push([u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
                u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]);
    }
    return out;
  }
  // A curl: continues from `p` heading in direction `ang`, turning with sign
  // `turn` while the radius shrinks.
  function curl(p, ang, r0, turns, turn, out) {
    var n = Math.round(turns * 28), a = ang, x = p[0], y = p[1];
    var step = (turns * Math.PI * 2) / n;
    for (var i = 0; i < n; i++) {
      var r = r0 * (1 - 0.82 * i / n);
      x += Math.cos(a) * r * step; y += Math.sin(a) * r * step;
      a += turn * step;
      out.push([x, y]);
    }
    return out;
  }
  // Shapes are baked into path coordinates, so many can share one <path>.
  // The unit shapes are parsed once into number pairs.
  function parse(d) {
    var parts = [], re = /([A-Za-z])|(-?[\d.]+),(-?[\d.]+)/g, m;
    while ((m = re.exec(d))) parts.push(m[1] ? m[1] : [+m[2], +m[3]]);
    return parts;
  }
  var P_LEAF = parse(PEEPAL), P_VEIN = parse(VEINS), P_BUD = parse(BUD);
  function tpath(parts, tx, ty, rot, sc) {
    var c = Math.cos(rot) * sc, sn = Math.sin(rot) * sc, s = '';
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      if (typeof p === 'string') s += p;
      else s += (tx + p[0] * c - p[1] * sn).toFixed(2) + ',' + (ty + p[0] * sn + p[1] * c).toFixed(2) + ' ';
    }
    return s;
  }
  function circ(cx, cy, r) {
    return 'M' + (cx - r).toFixed(2) + ',' + cy.toFixed(2) + 'a' + r.toFixed(2) + ',' + r.toFixed(2) + ' 0 1,0 ' +
      (2 * r).toFixed(2) + ',0a' + r.toFixed(2) + ',' + r.toFixed(2) + ' 0 1,0 ' + (-2 * r).toFixed(2) + ',0';
  }
  function leafTint(r) { return r() < 0.06 ? 'ct' : TINTS[Math.floor(r() * 4)]; }

  var project = document.querySelector('.cd-project');
  if (!project) return;

  var state = null, timer = 0, started = false, raf = 0, buildToken = 0;
  var idle = window.requestIdleCallback
    ? function (fn) { return window.requestIdleCallback(fn, { timeout: 400 }); }
    : function (fn) { return setTimeout(fn, 16); };

  // ── Layout probes (all reads, done once per build) ─────────────────────

  // The hero banyan's ground, its outermost roots, and what to keep clear of
  // near it (hero text, legend, the dot row, the lede), in frame coordinates.
  function ground(pr) {
    var tree = project.querySelector('.cd-hero-tree');
    if (!tree) return null;
    // The tree is a box of stacked SVGs sharing one viewBox; measure against
    // its static base layer (the canopy layer may be mid-sway).
    var ref = tree.namespaceURI === NS ? tree : (tree.querySelector('svg.cd-tree-base') || tree.querySelector('svg'));
    var m = ref && ref.getScreenCTM && ref.getScreenCTM();
    if (!m || !m.a) return null;
    function P(x, y) { return [m.a * x + m.c * y + m.e - pr.left, m.b * x + m.d * y + m.f - pr.top]; }
    var xs = [];
    [].forEach.call(tree.querySelectorAll('.root'), function (p) {
      try { var e = p.getPointAtLength(p.getTotalLength()); if (e.y > 312) xs.push(e.x); } catch (err) { /* not rendered */ }
    });
    var lx = xs.length ? Math.min.apply(null, xs) : 40, rx = xs.length ? Math.max.apply(null, xs) : 273;
    // the dotted ground line under the tree (viewBox units)
    var gl = tree.querySelector('.ground');
    var gv = gl ? +gl.getAttribute('y1') : 319, gx0 = gl ? +gl.getAttribute('x1') : 30, gx1 = gl ? +gl.getAttribute('x2') : 290;
    var obst = [], gy = P(0, gv)[1], ledeTop = gy + 80, textBottom = -Infinity;
    function add(b) { if (b && b.width && b.height) obst.push([b.left - pr.left, b.top - pr.top, b.right - pr.left, b.bottom - pr.top]); }
    var hero = project.querySelector('.project-hero');
    if (hero) [].forEach.call(hero.children, function (c) {
      if (c === tree || c.namespaceURI === NS) return;
      var b = c.getBoundingClientRect();
      if (!b.height) return;
      add(b);
      textBottom = Math.max(textBottom, b.bottom - pr.top);
    });
    var lg = tree.querySelector('.legend');
    if (lg) add(lg.getBoundingClientRect());
    var d0 = P(gx0, gv + 3), d1 = P(gx1, gv + 13);
    obst.push([d0[0], d0[1], d1[0], d1[1]]);
    var lede = project.querySelector('.cd-lede');
    if (lede) { add(lede.getBoundingClientRect()); ledeTop = lede.getBoundingClientRect().top - pr.top; }
    var heroBottom = hero ? hero.getBoundingClientRect().bottom - pr.top : gy + 30;
    obst.push([0, heroBottom - 1, pr.width, heroBottom]);
    return { lineL: d0[0], l: P(lx, gv)[0], r: P(rx, gv)[0], y: gy, obst: obst, heroBottom: heroBottom, ledeTop: ledeTop, textBottom: textBottom };
  }

  function measure() {
    var pr = project.getBoundingClientRect();
    var vw = document.documentElement.clientWidth;
    return {
      pr: pr, ML: Math.floor(pr.left) - 8, MR: Math.floor(vw - pr.right) - 8,
      H: project.offsetHeight, top: pr.top + window.scrollY, g0: ground(pr),
      docH: document.documentElement.scrollHeight,
      heads: [].slice.call(project.querySelectorAll('.cd-page h2')).map(function (h) {
        return h.getBoundingClientRect().top - pr.top + 17;
      })
    };
  }

  // ── Build ──────────────────────────────────────────────────────────────

  function teardown() {
    if (!state) return;
    state.svgs.forEach(function (t) { t.remove(); });
    state = null;
    anims = [];
  }

  // Measure now, then compute each vine in its own idle slice, then show.
  function build() {
    var prevY = state ? state.shownY : -Infinity;
    var token = ++buildToken;
    var M = measure();
    COL = M.pr.width;
    if (!wide.matches || M.ML < MIN_MARGIN || M.MR < MIN_MARGIN) {
      teardown();
      if (M.g0) buildCompact(M.pr, M.top, M.g0, prevY);
      return;
    }
    var ctx = context(M), vines = [];
    idle(function () {
      if (token !== buildToken) return;
      vines.push(vineGeometry(ctx, 0));
      idle(function () {
        if (token !== buildToken) return;
        vines.push(vineGeometry(ctx, 1));
        teardown();
        state = { svgs: [], vines: vines, top: M.top, docH: M.docH, ML: M.ML, WW: ctx.WW,
                  shownY: -Infinity, targetY: -Infinity };
        state.targetY = targetY(window.scrollY);
        restore(prevY);
        ensureTiles();
      });
    });
  }

  // Shared, per-layout context for both vines.
  function context(M) {
    var ML = M.ML, MR = M.MR, H = M.H, g0 = M.g0;
    var gL = g0 ? g0.l : 470, gR = g0 ? g0.r : 703, gY = g0 ? g0.y : 319;
    var obst = g0 ? g0.obst : [], ledeTop = g0 ? g0.ledeTop : gY + 70;
    // The left creeper can run along the midline of the lane the hero leaves
    // between itself and the lede.
    var heroBottom = g0 ? g0.heroBottom : gY + 30, lane = ledeTop - heroBottom;
    return {
      ML: ML, MR: MR, H: H, g0: g0, gL: gL, gR: gR, gY: gY, obst: obst, heads: M.heads,
      WW: ML + COL + MR, nT: Math.max(1, Math.ceil(H / TILE)),
      hasLane: lane >= 24, yRun: heroBottom + lane / 2, wob: Math.max(0, Math.min(1.6, lane / 2 - 10)),
      // Preferred: the left creeper runs level along the tree's ground line, all
      // the way past the frame's left edge, if that stays 10px below the hero text.
      level: g0 && gY - g0.textBottom >= 10,
      headSide: seeded(99)() < 0.5 ? 0 : 1
    };
  }

  // Same style on both sides, but each vine has its own seed and its own
  // wave rhythm, so the two are never mirror images.
  var SIDES = [
    { name: 'L', seed: 7031, sign: -1, A1: [13, 5], L1: [150, 70], A2: [5, 3], L2: [55, 30], tw: 21 },
    { name: 'R', seed: 14164, sign: 1, A1: [10, 7], L1: [205, 90], A2: [4, 4], L2: [70, 34], tw: 17 }
  ];

  // One vine as data: its stem polyline, the tiles it spans, and every
  // ornament as a record (kind, tile, path data, when it appears).
  function vineGeometry(C, si) {
    var s = SIDES[si], margin = si ? C.MR : C.ML, ML = C.ML, H = C.H, nT = C.nT;
    var gY = C.gY, heads = C.heads, level = C.level, hasLane = C.hasLane, yRun = C.yRun;
    function blocked(x, y, pad) {
      pad = pad == null ? 5 : pad;
      for (var i = 0; i < C.obst.length; i++) {
        var o = C.obst[i];
        if (x > o[0] - pad && x < o[2] + pad && y > o[1] - pad && y < o[3] + pad) return true;
      }
      return false;
    }
    var r = seeded(s.seed);
    // Each run of ornaments draws from its own stream, and each node from its
    // own seed, so a late layout shift only moves what is near it.
    function reseed(tag, k) { r = seeded((s.seed * 131 + tag * 7919 + k * 104729) >>> 0); }
    var endY = H - (si ? 150 : 70);
    var X = function (d) { return s.sign < 0 ? ML - d : ML + COL + d; };
    var colX = function (d) { return s.sign < 0 ? -d : COL + d; };
    // Stem centreline: well outside the frame (and wide figures' 40px
    // overhang), with room for the outer leaves before the page edge.
    var base = Math.max(85, Math.min(150, margin * 0.45, margin - 57));
    var A1 = s.A1[0] + r() * s.A1[1], L1 = s.L1[0] + r() * s.L1[1], P1 = r() * 6.28;
    var A2 = s.A2[0] + r() * s.A2[1], L2 = s.L2[0] + r() * s.L2[1], P2 = r() * 6.28;
    var D = function (y) { return base + A1 * Math.sin(y / L1 + P1) + A2 * Math.sin(y / L2 + P2); };

    // 1. Out of the outermost root, along the ground, then down the margin.
    var pts = [], y0 = gY + 0.5;
    var toD = function (x) { return s.sign < 0 ? -x : x - COL; };
    var q, dropY;
    if (s.sign > 0) {
      dropY = gY + 95 + r() * 25;
      var sx = toD(C.gR);
      pts.push([sx, y0]);
      for (var xx = sx + 6; xx < 16; xx += 6) pts.push([xx, y0 - 0.8 * Math.sin(xx / 7)]);
      q = pts[pts.length - 1];
      bez(q, [q[0] + 55, q[1] - 2], [D(dropY) - 22, y0 + 10], [D(dropY), dropY], 44, pts);
    } else if (level) {
      dropY = gY + 95 + r() * 25;
      var sx3 = toD(C.gL);
      pts.push([sx3, y0]);
      var runLen3 = 16 - sx3, nRun3 = Math.ceil(runLen3 / 6);
      for (var i3 = 1; i3 <= nRun3; i3++) {
        var dd3 = sx3 + runLen3 * i3 / nRun3;
        // a slight sag only once clear of the tree's ground line
        pts.push([dd3, y0 + (dd3 > toD(C.g0.lineL) ? 1.2 * Math.sin(dd3 / 23) : 0)]);
      }
      q = pts[pts.length - 1];
      bez(q, [q[0] + 55, q[1] + 1], [D(dropY) + 20, y0 + 12], [D(dropY), dropY], 44, pts);
    } else if (hasLane) {
      dropY = yRun + 95 + r() * 25;
      var sx2 = toD(C.gL);
      pts.push([sx2, y0]);
      // ease down off the ground into the clear band
      bez([sx2, y0], [sx2 + 30, y0], [sx2 + 55, yRun], [sx2 + 90, yRun], 16, pts);
      q = pts[pts.length - 1];
      var runLen = 16 - q[0], nRun = Math.ceil(runLen / 6);
      for (var i = 1; i <= nRun; i++) {
        var dd = q[0] + runLen * i / nRun;
        pts.push([dd, yRun + C.wob * Math.sin(dd / 23)]);
      }
      q = pts[pts.length - 1];
      bez(q, [q[0] + 55, q[1] + 1], [D(dropY) + 20, yRun + 12], [D(dropY), dropY], 44, pts);
    } else {
      // no room under the hero: this vine simply starts at the top of its margin
      dropY = gY;
      pts.push([D(gY - 5), gY - 5]);
    }
    var iDrop = pts.length - 1;

    // 2. The hanging stem.
    for (var y = dropY + 5; y <= endY; y += 5) pts.push([D(y), y]);
    var iEnd = pts.length - 1;
    // 3. Final curl, turning back toward the margin's outer side.
    curl(pts[iEnd], Math.PI / 2 + 0.3, 13, 1.5, 1, pts);

    // Twining second strand: peels off after the drop and wraps the stem.
    var comp = pts.map(function (p, i) {
      if (i <= iDrop || i > iEnd) return p;
      var ramp = Math.min(1, (i - iDrop) / 30) * Math.min(1, (iEnd - i) / 30);
      return [p[0] + ramp * 4.2 * Math.sin(p[1] / s.tw + si * 2), p[1]];
    });

    var cum = cumLen(pts), ccum = cumLen(comp);
    var key = [], mx = -Infinity;
    pts.forEach(function (p) { mx = Math.max(mx, p[1]); key.push(mx); });
    function idxAtY(yy) {
      var a = 0, b = key.length - 1;
      while (a < b) { var md = (a + b + 1) >> 1; if (key[md] <= yy) a = md; else b = md - 1; }
      return a;
    }

    // ── Tiles (data only; DOM comes later, near the viewport) ──
    var mapPts = function (arr) { return arr.map(function (p) { return [X(p[0]), p[1]]; }); };
    var tiles = [];
    for (var ti = 0; ti < nT; ti++) {
      var st = {};
      LAYERS.forEach(function (L) { st[L[0]] = []; });
      tiles.push({ top: ti * TILE, h: Math.min(TILE, H - ti * TILE), x0: Infinity, x1: -Infinity,
                   name: s.name, chunk: null, settled: st, dirty: {}, svg: null });
    }
    function tileIdx(yy) { return Math.max(0, Math.min(nT - 1, Math.floor(yy / TILE))); }
    function touch(tIdx, xs, pad) {
      var t = tiles[tIdx];
      xs.forEach(function (x) { t.x0 = Math.min(t.x0, x - pad); t.x1 = Math.max(t.x1, x + pad); });
    }
    function layer(yy, d, pad) {
      var t = tileIdx(yy);
      if (d != null) touch(t, [X(d)], pad);
      return t;
    }
    // The stem and strand, one chunk per tile.
    var chunks = [], c0 = 0;
    for (var ci = 0; ci < nT; ci++) {
      var c1 = c0;
      while (c1 < pts.length - 1 && key[c1 + 1] < (ci + 1) * TILE) c1++;
      if (ci === nT - 1) c1 = pts.length - 1;
      if (c1 > c0) {
        var len = cum[c1] - cum[c0], clen = ccum[c1] - ccum[c0];
        var ch = { tile: tiles[ci], d: polyD(mapPts(pts.slice(c0, c1 + 1))), cd: polyD(mapPts(comp.slice(c0, c1 + 1))),
                   c0: cum[c0], len: len + 1, cc0: ccum[c0], clen: clen + 1, local: 0, clocal: 0, last: -1, clast: -1 };
        tiles[ci].chunk = ch;
        chunks.push(ch);
        touch(ci, pts.slice(c0, c1 + 1).map(function (p) { return X(p[0]); }), 10);
      }
      c0 = c1;
    }

    // ── Ornament records ──
    var items = [];
    function addGrow(dPts, cls, idx, delay) {
      var t = layer(dPts[0][1]);
      touch(t, dPts.map(function (qq) { return X(qq[0]); }), 4);
      items.push({ idx: idx, kind: 'grow', layer: cls, tile: tiles[t], d: polyD(mapPts(dPts)), delay: delay || 0,
                   dur: cls === 'tendril' ? 1600 : (cls === 'curl' ? 1000 : 500) });
    }
    function addLeaf(p, ang, size, idx, extra, delay) {
      // ang is in d/y space; mirror it for the left margin.
      var a = s.sign < 0 ? Math.PI - ang : ang, x = X(p[0]);
      var tint = leafTint(r), t = layer(p[1], p[0], size * 1.5 + 4);
      if (extra === 'vxa-end') tint = 'end';
      var rot = a + Math.PI / 2;
      items.push({ idx: idx, kind: 'leaf', tint: tint, tile: tiles[t], x: x, y: p[1], delay: delay || 0,
                   d: tpath(P_LEAF, x, p[1], rot, size), v: tpath(P_VEIN, x, p[1], rot, size) });
    }
    // A five-petal floret, radius ~k*3.9px.
    function addFloret(p, k, idx, delay) {
      var x = X(p[0]), y = p[1], rot = r() * 72 * Math.PI / 180, t = layer(y, p[0], 10), pd = '';
      for (var i = 0; i < 5; i++) {
        var a = rot + i * Math.PI * 2 / 5;
        pd += circ(x + Math.cos(a) * 2.3 * k, y + Math.sin(a) * 2.3 * k, 1.6 * k);
      }
      items.push({ idx: idx, kind: 'floret', tile: tiles[t], x: x, y: y, delay: delay || 0, d: pd, c: circ(x, y, 1.05 * k) });
    }
    function addBud(p, ang, k, idx, delay) {
      var a = s.sign < 0 ? Math.PI - ang : ang, x = X(p[0]), t = layer(p[1], p[0], 10);
      items.push({ idx: idx, kind: 'bud', tile: tiles[t], x: x, y: p[1], delay: delay || 0,
                   d: tpath(P_BUD, x, p[1], a + Math.PI / 2, k) });
    }
    // Short stalk from stem point p in direction ang, returns its tip.
    function stalk(p, ang, len, bendSign, idx) {
      var tip = [p[0] + Math.cos(ang) * len, p[1] + Math.sin(ang) * len];
      var mid = [p[0] + Math.cos(ang - 0.45 * bendSign) * len * 0.55, p[1] + Math.sin(ang - 0.45 * bendSign) * len * 0.55];
      var qq = [p]; bez(p, mid, mid, tip, 6, qq);
      addGrow(qq, 'stalk', idx);
      return { tip: tip, mid: mid };
    }
    // A leaf node on a drooping stalk: one, two or three leaves.
    function stalkLeaf(idx, out, size, droop, count) {
      var p = pts[idx];
      var ang = out > 0 ? droop : Math.PI - droop;   // 0 = away from column
      var st = stalk(p, ang, 5 + r() * 5, out, idx);
      addLeaf(st.tip, ang + (r() - 0.5) * 0.3, size, idx, null, 0.12);
      if (count >= 2) addLeaf(st.mid, ang - out * (0.75 + r() * 0.3), size * (0.55 + r() * 0.15), idx, null, 0.3);
      if (count >= 3) addLeaf(st.mid, ang + out * (0.8 + r() * 0.3), size * (0.45 + r() * 0.12), idx, null, 0.42);
    }
    function nearHead(yy, pad) { return heads.some(function (h) { return Math.abs(h - yy) < pad; }); }

    // Where the floret sprays go (drawn below); leaves on that side make room.
    var sprays = [], rs = seeded(s.seed + 1), ks = 0;
    for (var fy = dropY + 120 + rs() * 120; fy < endY - 60; fy += 190 + rs() * 170, ks++) {
      if (nearHead(fy, 50)) continue;
      reseed(1, ks);
      sprays.push({ y: fy, side: r() < 0.8 ? 1 : -1, k: ks });
    }

    // Foliage along the creeping run and the turn into the margin. Leaves
    // stand off either side of the stem wherever they clear the hero text,
    // the legend and the lede.
    function clear(p, ang, len, pad) {
      for (var t = 0; t <= 1.001; t += 0.25) {
        var x = colX(p[0] + Math.cos(ang) * len * t), yy = p[1] + Math.sin(ang) * len * t;
        if (blocked(x, yy, pad)) return false;
      }
      return true;
    }
    reseed(3, 0);
    var nextL = 8 + r() * 6, runSide = r() < 0.5 ? 1 : -1, nextCurl = 40 + r() * 40, sprayDone = false;
    for (var ri = 1; ri < iDrop - 3; ri++) {
      if (cum[ri] < nextL) continue;
      nextL = cum[ri] + 14 + r() * 12;
      var a0 = Math.atan2(pts[ri + 1][1] - pts[ri - 1][1], pts[ri + 1][0] - pts[ri - 1][0]);
      runSide = r() < 0.7 ? -runSide : runSide;
      // In the lane under the hero, leaves are small and lie close along the
      // stem, keeping 8px clear of the hero above and the lede below.
      var inLane = s.sign < 0 && !level && hasLane && pts[ri][0] < 6 && Math.abs(pts[ri][1] - yRun) < 4;
      var onLevel = s.sign < 0 && level && pts[ri][0] < 6 && Math.abs(pts[ri][1] - y0) < 3;
      var sz = inLane ? 4.6 + r() * 1.4 : 7 + r() * 3.5, sl = inLane ? 2 : 4 + r() * 3;
      var lean = inLane ? 1.1 : 0.5, pad = inLane ? 8 : (onLevel ? 10 : 5), reachL = sl + sz * 1.3;
      var ang = a0 + runSide * (Math.PI / 2 - lean);
      if (!clear(pts[ri], ang, reachL, pad)) {
        runSide = -runSide; ang = a0 + runSide * (Math.PI / 2 - lean);
        if (!clear(pts[ri], ang, reachL, pad)) continue;
      }
      var st0 = stalk(pts[ri], ang, sl, -runSide, ri);
      addLeaf(st0.tip, ang + (r() - 0.5) * 0.25, sz, ri, null, 0.1);
      if (!inLane && r() < 0.35) addLeaf(st0.mid, ang - runSide * 0.8, sz * 0.6, ri, null, 0.3);
      if (inLane) continue;
      var opp = a0 - runSide * (Math.PI / 2 - 0.3);
      if (r() < 0.22 && clear(pts[ri], opp, 9)) addBud(pts[ri], opp, 1, ri, 0.25);
      if (cum[ri] > nextCurl) {
        var up = a0 - Math.PI / 2 + 0.4;
        if (clear(pts[ri], up, 16)) {
          nextCurl = cum[ri] + 110 + r() * 90;
          var cp0 = pts[ri], cq = [cp0[0] + Math.cos(up) * 9, cp0[1] + Math.sin(up) * 9], cpts = [cp0];
          bez(cp0, [cp0[0] + Math.cos(up + 0.4) * 4, cp0[1] + Math.sin(up + 0.4) * 4], cq, cq, 6, cpts);
          curl(cq, up, 3.8, 2.2, -1, cpts);
          addGrow(cpts, 'curl', ri);
        }
      }
      // one small floret spray midway along the long run
      if (!sprayDone && cum[ri] > cum[iDrop] * 0.45) {
        var fa0 = a0 - Math.PI / 2;
        if (clear(pts[ri + 2], fa0, 20)) {
          sprayDone = true;
          [-0.55, 0.1, 0.65].forEach(function (off, j) {
            var sp = stalk(pts[ri + 2], fa0 + off, 10 + (j === 1 ? 5 : 0), 1, ri + 2);
            addFloret(sp.tip, 0.95 + r() * 0.2, ri + 2, 0.3 + j * 0.15);
          });
        }
      }
    }

    // Leaves along the stem: close-set, alternating, often in clusters.
    var rl = seeded(s.seed + 2), kl = 0, nextY = dropY + 12 + seeded(s.seed + 5)() * 16;
    for (var yy = nextY; yy < endY - 24; yy += 24 + rl() * 22, kl++) {
      // keep the heading tendrils' neighbourhood clear
      if (nearHead(yy, 30)) continue;
      reseed(2, kl);
      var idx = idxAtY(yy);
      var lastSide = (kl % 2 ? 1 : -1) * (r() < 0.25 ? -1 : 1);
      if (sprays.some(function (sp) { return sp.side === lastSide && Math.abs(sp.y - yy) < 22; })) lastSide = -lastSide;
      var outward = lastSide > 0, c = r();
      // leaves toward the column are smaller and droop more, so they stay compact
      stalkLeaf(idx, lastSide, outward ? 10 + r() * 6.5 : 8 + r() * 3,
                outward ? 0.4 + r() * 0.6 : 0.95 + r() * 0.3,
                c < 0.12 ? 3 : (c < 0.5 ? 2 : 1));
      if (r() < 0.22) {
        var bi = Math.min(iEnd, idx + 2);
        addBud(pts[bi], lastSide > 0 ? Math.PI - 0.9 : 0.9, 1 + r() * 0.4, bi, 0.25);
      }
    }

    // Floret sprays: two or three small five-petal flowers with a bud.
    sprays.forEach(function (sp) {
      reseed(7, sp.k);
      var fi = idxAtY(sp.y), fp = pts[fi], fo = sp.side;
      var n = r() < 0.55 ? 3 : 2, reach = fo > 0 ? 1 : 0.6;
      for (var j = 0; j < n; j++) {
        var fa = (fo > 0 ? 0 : Math.PI) + fo * (-0.8 + j * 0.75 + (r() - 0.5) * 0.2);
        var st = stalk(fp, fa, (14 + r() * 8 - (j === 1 ? 3 : 0)) * reach, fo, fi);
        addFloret(st.tip, (1.1 + r() * 0.3) * (fo > 0 ? 1 : 0.8), fi, 0.35 + j * 0.15);
      }
      var bs = stalk(fp, (fo > 0 ? 0 : Math.PI) + fo * 1.05, 8 * reach, fo, fi);
      addBud(bs.tip, fo > 0 ? 1.05 : Math.PI - 1.05, 1.1, fi, 0.7);
    });

    // Madhubani-style dot rows beside the stem.
    var rd = seeded(s.seed + 3), kd = 0;
    for (var dy = dropY + 260 + rd() * 200; dy < endY - 80; dy += 420 + rd() * 300, kd++) {
      if (nearHead(dy, 60)) continue;
      reseed(4, kd);
      var di = idxAtY(dy), side = r() < 0.7 ? 1 : -1, nd = 5 + Math.floor(r() * 3);
      if (sprays.some(function (sp) { return sp.y > dy - 40 && sp.y < dy + nd * 10 + 30; })) continue;
      var tur = r() < 0.3 ? Math.floor(nd / 2) : -1;   // now and then, one turmeric dot
      for (var k = 0; k < nd; k++) {
        var dp = pts[Math.min(iEnd, di + k * 2)], cx = X(dp[0] + side * 6.5);
        var rr = (k === 0 || k === nd - 1) ? 0.9 : (k === tur ? 1.6 : 1.2);
        var dt = layer(dp[1], dp[0] + side * 6.5, 4);
        items.push({ idx: di + k * 2, kind: 'dot', tile: tiles[dt], tur: k === tur, x: cx, y: dp[1], r: rr,
                     d: circ(cx, dp[1], rr), delay: k * 0.07 });
      }
    }

    // Small curling tendrils off the stem every so often.
    var rc = seeded(s.seed + 4), kc = 0;
    for (var cy = dropY + 90 + rc() * 100; cy < endY - 120; cy += 150 + rc() * 150, kc++) {
      if (nearHead(cy, 60)) continue;
      reseed(5, kc);
      var cix = idxAtY(cy), cp = pts[cix], out = r() < 0.65 ? 1 : -1;
      var reach2 = out > 0 ? 14 : 9;
      var cpts2 = [cp];
      var ang0 = out > 0 ? -0.35 : Math.PI + 0.35;
      var q2 = [cp[0] + Math.cos(ang0) * reach2, cp[1] + Math.sin(ang0) * reach2];
      bez(cp, [cp[0] + out * 5, cp[1] + 2], [q2[0] - out * 3, q2[1] + 3], q2, 8, cpts2);
      curl(q2, ang0 - 0.6 * out, out > 0 ? 4.6 : 3.6, 2.3, -out, cpts2);
      addGrow(cpts2, 'curl', cix);
    }

    // Heading tendrils: this side takes every other heading.
    heads.forEach(function (hy, hIdx) {
      if ((hIdx + C.headSide) % 2 !== si) return;
      reseed(6, hIdx);
      var y1 = hy - 22 - r() * 14, i1 = idxAtY(y1), p1 = pts[i1];
      var endD = 38 + r() * 8;
      var tp = [p1];
      // arch up and over toward the heading, then roll under in a curl
      bez(p1, [p1[0] - 30, p1[1] - 26], [endD + 34, hy - 22], [endD, hy - 6], 36, tp);
      curl(tp[tp.length - 1], Math.PI - 0.55, 9, 1.75, -1, tp);
      addGrow(tp, 'tendril', i1, 0.1);
      addLeaf(tp[Math.round(tp.length * 0.42)], -1.2 - r() * 0.3, 11, i1, null, 0.6);
      addLeaf(tp[Math.round(tp.length * 0.28)], 1.25 + r() * 0.2, 10.5, i1, null, 0.45);
      addLeaf(tp[Math.round(tp.length * 0.62)], 1.5 + r() * 0.3, 7.5, i1, null, 0.85);
    });

    // Terminal leaf: the end of this root-to-leaf path, inked in.
    reseed(8, 0);
    addLeaf(pts[iEnd - 2], Math.PI / 2 - 0.45, 15, iEnd, 'vxa-end', 0.2);
    addLeaf(pts[iEnd - 6], Math.PI / 2 + 1.0, 11, iEnd - 6, null, 0.1);
    addLeaf(pts[iEnd - 20], 0.5, 12, iEnd - 20);

    items.sort(function (a, b) { return a.idx - b.idx; });
    // Crop each tile to its contents.
    tiles.forEach(function (t) {
      if (t.x1 < t.x0) { t.dead = true; return; }
      t.vx0 = Math.max(0, Math.floor(t.x0 - 6));
      t.vx1 = Math.min(C.WW, Math.ceil(t.x1 + 6));
    });
    return { cum: cum, ccum: ccum, key: key, chunks: chunks, total: cum[cum.length - 1],
             tiles: tiles.filter(function (t) { return !t.dead; }),
             introLen: cum[iDrop] + 320, items: items, next: 0, idxAtY: idxAtY, shown: 0 };
  }

  // ── Tile DOM ───────────────────────────────────────────────────────────

  // Create the DOM of every tile within ~1.5 viewports of the screen.
  function ensureTiles() {
    if (!state || state.compact) return;
    var y = window.scrollY - state.top, lo = y - 1.5 * vh, hi = y + 2.5 * vh;
    state.vines.forEach(function (v) {
      v.tiles.forEach(function (t) {
        if (!t.svg && t.top + t.h > lo && t.top < hi) makeTile(t);
      });
    });
  }
  function makeTile(t) {
    var w = t.vx1 - t.vx0;
    var svg = el('svg', { class: 'vxa-vines vxa-tile', 'aria-hidden': 'true', focusable: 'false',
      width: w, height: t.h, viewBox: t.vx0 + ' ' + t.top + ' ' + w + ' ' + t.h });
    svg.style.left = (t.vx0 - state.ML) + 'px';
    svg.style.top = t.top + 'px';
    var g = el('g', { class: 'vxa-vine vxa-' + t.name }, svg);
    var ch = t.chunk;
    if (ch) {
      ch.stem = el('path', { d: ch.d, class: 'vxa-stem', 'stroke-dasharray': f(ch.len) + ' ' + f(ch.len + 11),
        'stroke-dashoffset': f(ch.len - ch.local) }, g);
      ch.strand = el('path', { d: ch.cd, class: 'vxa-strand', 'stroke-dasharray': f(ch.clen) + ' ' + f(ch.clen + 11),
        'stroke-dashoffset': f(ch.clen - ch.clocal) }, g);
      ch.last = ch.local; ch.clast = ch.clocal;
    }
    t.paths = {};
    LAYERS.forEach(function (L) {
      var d = t.settled[L[0]].join('');
      t.paths[L[0]] = el('path', { class: L[1], d: d }, g);
    });
    t.dirty = {};
    t.anim = el('g', null, g);
    t.svg = svg;
    state.svgs.push(svg);
    project.insertBefore(svg, project.firstChild);
  }
  // Settled records go into the tile's merged paths. Rewriting a merged path
  // is the costly part, so it happens at most every FLUSH_MS; a settled piece
  // keeps its own element until then.
  var FLUSH_MS = 220, lastFlush = 0, parked = [];
  function settleInto(it) {
    var t = it.tile, add = function (k, d) { t.settled[k].push(d); t.dirty[k] = true; };
    if (it.kind === 'leaf') { add('lf-' + it.tint, it.d); add('rib-' + it.tint, it.v); }
    else if (it.kind === 'grow') add(it.layer, it.d);
    else if (it.kind === 'floret') { add('pt', it.d); add('ctr', it.c); }
    else if (it.kind === 'bud') add('bud', it.d);
    else if (it.kind === 'dot') add(it.tur ? 'dot-tur' : 'dot', it.d);
    if (t.svg && dirtyTiles.indexOf(t) < 0) dirtyTiles.push(t);
  }
  var dirtyTiles = [];
  function flushTiles(now, force) {
    if (!dirtyTiles.length && !parked.length) return;
    if (!force && now - lastFlush < FLUSH_MS) return;
    lastFlush = now;
    for (var i = 0; i < dirtyTiles.length; i++) {
      var t = dirtyTiles[i];
      if (t.paths) for (var k in t.dirty) t.paths[k].setAttribute('d', t.settled[k].join(''));
      t.dirty = {};
    }
    dirtyTiles = [];
    for (var j = 0; j < parked.length; j++) parked[j].remove();
    parked = [];
  }

  // ── Small animations, driven from JS ───────────────────────────────────
  // Only the pieces unfurling near the growing tip have elements of their
  // own; each is merged into its tile's static paths when it settles.
  var anims = [];
  function about(it, inner) {
    return 'translate(' + it.x.toFixed(2) + ' ' + it.y.toFixed(2) + ') ' + inner + ' translate(' + (-it.x).toFixed(2) + ' ' + (-it.y).toFixed(2) + ')';
  }
  // At most this many pieces animate at once; when the vine races to catch
  // up with a fast scroll, the rest simply appear.
  var MAX_ANIMS = 40;
  function reveal(it, jump) {
    if (jump || reduce.matches || !it.tile.svg || anims.length >= MAX_ANIMS) { settleInto(it); return; }
    var parent = it.tile.anim, n;
    if (it.kind === 'leaf') {
      n = el('g', { transform: about(it, 'rotate(-50) scale(0)') }, parent);
      el('path', { class: 'lf ' + it.tint, d: it.d }, n);
      el('path', { class: 'rib' + (it.tint === 'end' ? ' end' : ''), d: it.v }, n);
      it.dur = 750;
    } else if (it.kind === 'floret' || it.kind === 'bud') {
      n = el('g', { transform: about(it, 'scale(0)') }, parent);
      if (it.kind === 'bud') el('path', { class: 'bud', d: it.d }, n);
      else { el('path', { class: 'pt', d: it.d }, n); el('path', { class: 'ctr', d: it.c }, n); }
      it.dur = 600;
    } else if (it.kind === 'dot') {
      n = el('circle', { class: 'vxa-dot' + (it.tur ? ' tur' : ''), cx: it.x.toFixed(2), cy: it.y.toFixed(2), r: 0 }, parent);
      it.dur = 450;
    } else {
      n = el('path', { class: 'vxa-grow vxa-' + it.layer, d: it.d, pathLength: 1, 'stroke-dashoffset': 1 }, parent);
    }
    it.node = n;
    it.t0 = performance.now() + (it.delay || 0) * 1000;
    anims.push(it);
  }
  // Final pose of a piece (it stays on screen until its tile path is rewritten).
  function finish(it) {
    if (it.kind === 'grow') it.node.setAttribute('stroke-dashoffset', 0);
    else if (it.kind === 'dot') it.node.setAttribute('r', it.r);
    else it.node.removeAttribute('transform');
  }
  function backOut(t) { var c = 1.9; t -= 1; return 1 + (c + 1) * t * t * t + c * t * t; }
  // Step every running animation; true while any is still running.
  function stepAnims(now) {
    if (!anims.length) return false;
    var keep = [];
    for (var i = 0; i < anims.length; i++) {
      var it = anims[i], t = (now - it.t0) / it.dur;
      if (t < 0) { keep.push(it); continue; }
      if (t >= 1) { finish(it); parked.push(it.node); it.node = null; settleInto(it); continue; }
      if (it.kind === 'leaf') {
        var e = backOut(t);
        it.node.setAttribute('transform', about(it, 'rotate(' + (-50 * (1 - e)).toFixed(1) + ') scale(' + Math.max(0, e).toFixed(3) + ')'));
      } else if (it.kind === 'floret' || it.kind === 'bud') {
        it.node.setAttribute('transform', about(it, 'scale(' + backOut(t).toFixed(3) + ')'));
      } else if (it.kind === 'grow') {
        it.node.setAttribute('stroke-dashoffset', Math.pow(1 - t, 2.2).toFixed(3));
      } else if (it.kind === 'dot') {
        it.node.setAttribute('r', (it.r * backOut(t)).toFixed(2));
      }
      keep.push(it);
    }
    anims = keep;
    flushTiles(now, !anims.length);
    return anims.length > 0 || parked.length > 0;
  }

  // ── Growth ─────────────────────────────────────────────────────────────

  // Show each vine up to vertical position y (frame coordinates).
  function render(y, jump) {
    var any = false, reached = Infinity;
    state.vines.forEach(function (v) {
      var targetIdx = y === Infinity ? v.cum.length - 1 : (y < v.key[0] ? -1 : v.idxAtY(y));
      var target = targetIdx < 0 ? 0 : v.cum[targetIdx];
      if (jump) v.shown = Math.max(v.shown, target);
      else if (v.shown < target) {
        // creep while leaving the tree, then keep pace with the reader
        // (it may lag the reader for a moment; it never rushes)
        var cap = v.shown < v.introLen ? 4 : 28;
        v.shown = Math.min(target, v.shown + Math.min(cap, Math.max(2.5, (target - v.shown) * 0.1)));
        if (v.shown < target) any = true;
      }
      var lo = 0, hi = v.cum.length - 1;
      while (lo < hi) { var mid = (lo + hi + 1) >> 1; if (v.cum[mid] <= v.shown) lo = mid; else hi = mid - 1; }
      // Only the chunks whose drawn length changed are touched.
      var cshown = v.ccum && v.shown > 0 ? v.ccum[lo] : 0;
      for (var i = 0; i < v.chunks.length; i++) {
        var c = v.chunks[i];
        c.local = Math.max(0, Math.min(c.len, v.shown - c.c0));
        if (c.stem && Math.abs(c.local - c.last) > 0.05) { c.last = c.local; c.stem.setAttribute('stroke-dashoffset', f(c.len - c.local)); }
        if (c.clen != null) {
          c.clocal = Math.max(0, Math.min(c.clen, cshown - c.cc0));
          if (c.strand && Math.abs(c.clocal - c.clast) > 0.05) { c.clast = c.clocal; c.strand.setAttribute('stroke-dashoffset', f(c.clen - c.clocal)); }
        }
      }
      while (v.next < v.items.length && v.shown > 0 && v.items[v.next].idx <= lo) {
        reveal(v.items[v.next], jump);
        v.next++;
      }
      reached = Math.min(reached, v.shown <= 0 ? -Infinity : (v.shown >= v.total ? Infinity : v.key[lo]));
    });
    state.shownY = reached;
    flushTiles(performance.now(), jump);
    return any;
  }

  // Restore progress instantly after a rebuild, without re-animating.
  function restore(prevY) {
    var instant = reduce.matches ? Infinity : prevY;
    if (instant > -Infinity) state.targetY = Math.max(state.targetY, instant);
    render(instant > -Infinity ? instant : -Infinity, true);
    schedule();
  }

  // Scroll handling reads only scrollY; sizes are cached per layout.
  var vh = window.innerHeight;
  function targetY(y) {
    if (state.compact) return Infinity;
    // At the foot of the page, let the vines finish.
    if (y + vh >= state.docH - 8) return Infinity;
    return y + vh * AHEAD - state.top;
  }
  var tilesDue = false;
  function onScroll() {
    if (!state) return;
    var t = targetY(window.scrollY);
    tilesDue = true;
    if (t > state.targetY) state.targetY = t;
    schedule(true);
  }

  // One rAF loop for tiles, growth and the unfurls; it stops as soon as all
  // have caught up, so nothing runs at rest.
  function tick(now) {
    raf = 0;
    if (!state) return;
    if (tilesDue) { tilesDue = false; ensureTiles(); }
    var more = started && render(state.targetY, false);
    if (stepAnims(now) || more) raf = requestAnimationFrame(tick);
  }
  function schedule(force) {
    if (!raf && state && (started || force)) raf = requestAnimationFrame(tick);
  }

  function rebuildSoon() {
    clearTimeout(timer);
    timer = setTimeout(build, 160);
  }

  // ── Narrow screens ─────────────────────────────────────────────────────

  // No margins to climb, so the creepers leave the outermost roots, run along
  // the ground to the frame edges and curl up there. (A few dozen elements.)
  function buildCompact(pr, top, g0, prevY) {
    var W = pr.width, y0 = g0.y + 0.5, h = Math.ceil(y0 + 30);
    var svg = el('svg', { class: 'vxa-vines vxa-compact', 'aria-hidden': 'true', focusable: 'false',
      width: W, height: h, viewBox: '0 0 ' + W + ' ' + h });
    svg.style.left = '0px';
    project.insertBefore(svg, project.firstChild);
    function blocked(x, y) {
      return g0.obst.some(function (o) { return x > o[0] - 3 && x < o[2] + 3 && y > o[1] - 3 && y < o[3] + 3; });
    }
    var tile = { svg: svg, settled: {}, dirty: {}, paths: {} };
    var vines = [[g0.l, 4, -1, 7031], [g0.r, W - 4, 1, 14164]].map(function (c) {
      var r = seeded(c[3]), dir = c[2], R = 6.5;
      var endX = dir > 0 ? Math.max(c[1] - 2 * R, c[0] + 36) : Math.min(c[1] + 2 * R, c[0] - 36);
      var pts = [[c[0], y0]], n = Math.max(2, Math.ceil(Math.abs(endX - c[0]) / 5));
      for (var i = 1; i <= n; i++) pts.push([c[0] + (endX - c[0]) * i / n, y0]);
      curl(pts[pts.length - 1], dir > 0 ? 0 : Math.PI, R, 1.5, -dir, pts);
      var cum = cumLen(pts), key = pts.map(function () { return 0; });
      var total = cum[cum.length - 1];
      var ch = { d: polyD(pts), c0: 0, len: total + 1, local: 0, last: -1 };
      ch.stem = el('path', { d: ch.d, class: 'vxa-stem', 'stroke-dasharray': f(ch.len) + ' ' + f(ch.len + 11),
        'stroke-dashoffset': f(ch.len) }, svg);
      var items = [];
      // upright leaves along the run, leaning outward
      var next = 8 + r() * 5, lean = 1;
      for (var k = 1; k < n - 1; k++) {
        var dist = Math.abs(pts[k][0] - c[0]);
        if (dist < next) continue;
        next = dist + 13 + r() * 8;
        lean = -lean;
        var ang = -Math.PI / 2 + dir * (0.35 + (lean > 0 ? 0.35 : 0)) + (r() - 0.5) * 0.2;
        var sz = 5.5 + r() * 2.5;
        var tip = [pts[k][0] + Math.cos(ang) * sz * 1.3, pts[k][1] + Math.sin(ang) * sz * 1.3];
        if (blocked(tip[0], tip[1])) continue;
        var tint = leafTint(r);
        items.push({ idx: k, kind: 'leaf', tint: tint, tile: tile, x: pts[k][0], y: pts[k][1], delay: 0.1,
                     d: tpath(P_LEAF, pts[k][0], pts[k][1], ang + Math.PI / 2, sz), v: tpath(P_VEIN, pts[k][0], pts[k][1], ang + Math.PI / 2, sz) });
      }
      // a crimson bud just before the curl
      var bi = Math.max(1, n - 3), bp = pts[bi];
      items.push({ idx: bi, kind: 'bud', tile: tile, x: bp[0], y: bp[1], delay: 0.2,
                   d: tpath(P_BUD, bp[0], bp[1], dir * 25 * Math.PI / 180, 1) });
      items.sort(function (a, b) { return a.idx - b.idx; });
      return { cum: cum, key: key, total: total, items: items, next: 0, shown: 0, introLen: Infinity,
               chunks: [ch], tiles: [], idxAtY: function () { return pts.length - 1; } };
    });
    var g = el('g', null, svg);
    LAYERS.forEach(function (L) { tile.settled[L[0]] = []; tile.paths[L[0]] = el('path', { class: L[1], d: '' }, g); });
    tile.anim = el('g', null, svg);
    teardown();
    state = { svgs: [svg], top: top, vines: vines, shownY: -Infinity, targetY: Infinity, compact: true, docH: 0 };
    restore(prevY === Infinity ? Infinity : -Infinity);
  }

  // ── Start ──────────────────────────────────────────────────────────────

  function init() {
    build();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', function () { vh = window.innerHeight; rebuildSoon(); });
    if (wide.addEventListener) wide.addEventListener('change', rebuildSoon);
    if (window.ResizeObserver) {
      // The vines are absolutely positioned, so they never change this height.
      var lastH = project.offsetHeight;
      new ResizeObserver(function () {
        var h = project.offsetHeight;
        if (Math.abs(h - lastH) > 2) { lastH = h; rebuildSoon(); }
      }).observe(project);
    }
    if (reduce.matches) { started = true; return; }
    // Follow the banyan: it is grown ~3s after it starts (on the same signal),
    // while its sampler paths keep drawing until ~6s. The creepers leave its
    // roots in between.
    setTimeout(function () { started = true; onScroll(); }, CREEP_DELAY);
  }

  // Start only once fonts and the window have loaded and a frame has passed,
  // and the banyan's roots exist in their final place, so nothing jumps.
  var loaded = new Promise(function (res) {
    if (document.readyState === 'complete') res(); else window.addEventListener('load', res);
  });
  Promise.all([loaded, document.fonts && document.fonts.ready ? document.fonts.ready : null]).then(function () {
    requestAnimationFrame(function () { requestAnimationFrame(function () { waitForTree(0); }); });
  });
  function waitForTree(n) {
    var t = project.querySelector('.cd-hero-tree');
    if ((t && t.querySelector('.root')) || n > 40) init();
    else setTimeout(function () { waitForTree(n + 1); }, 75);
  }
})();
