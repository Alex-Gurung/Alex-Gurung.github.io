// Dhaka frame for the Key-takeaways box (.cd-box).
// Replaces the double rule with a woven Dhaka border: a crimson ground with
// cream stepped diamonds, umber outlines and mustard eyes, framed by umber
// edge threads, with a separate motif in each corner. The pattern is built
// cell by cell as SVG, so it stays crisp at any size, and it is recomputed
// whenever the box resizes. Phones get the top and bottom bands only.
(function () {
  var boxes = document.querySelectorAll('.cd-box');
  if (!boxes.length) return;

  var NS = 'http://www.w3.org/2000/svg';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var INK = { d: '#3b2a20', r: '#962c2f', c: '#f6ecd6', m: '#c49a3a' };
  var ROWS = 9;          // cells across the band
  var TILE = 8;          // cells along the band per repeat

  // Band cross-section (y = 0..8 across, x = 0..7 along): umber edge threads,
  // crimson ground, a stepped diamond with a mustard eye, and small stepped
  // teeth reaching in from both edges between the diamonds.
  function band(x, y) {
    if (y === 0 || y === ROWS - 1) return 'd';
    var yy = y - 1;                        // 0..6 inside the edges
    var d = Math.abs(x - 3) + Math.abs(yy - 3);
    if (d === 3) return 'd';
    if (d === 2) return 'c';
    if (d === 1) return 'r';
    if (d === 0) return 'm';
    var dx = Math.min(Math.abs(x - 7), Math.abs(x + 1));   // distance to the tooth column (wraps)
    if (dx + yy <= 1 || dx + (6 - yy) <= 1) return 'd';
    return 'r';
  }
  // Corner square: an umber-edged block with a stepped cross.
  function corner(x, y) {
    if (x === 0 || y === 0 || x === ROWS - 1 || y === ROWS - 1) return 'd';
    var ax = Math.abs(x - 4), ay = Math.abs(y - 4), d = ax + ay;
    if (d === 0) return 'm';
    if (d <= 2 && (ax === 0 || ay === 0)) return 'c';
    if (d === 3) return 'd';
    if (x === 1 && y === 1 || x === 7 && y === 1 || x === 1 && y === 7 || x === 7 && y === 7) return 'c';
    return 'r';
  }

  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  // Paint a w x h bitmap into g, merging runs of equal colour into one rect.
  function paint(g, w, h, f, cell) {
    for (var y = 0; y < h; y++) {
      var run = null, start = 0;
      for (var x = 0; x <= w; x++) {
        var c = x < w ? f(x, y) : null;
        if (c !== run) {
          if (run) el('rect', { x: start * cell, y: y * cell, width: (x - start) * cell, height: cell, fill: INK[run] }, g);
          run = c; start = x;
        }
      }
    }
  }

  var defsSvg = el('svg', { 'aria-hidden': 'true', width: 0, height: 0, style: 'position:absolute;width:0;height:0;overflow:hidden' });
  var defs = el('defs', null, defsSvg);
  document.body.appendChild(defsSvg);
  var made = {};
  function patterns(cell) {
    var key = String(cell).replace('.', '_');
    if (!made[key]) {
      made[key] = true;
      var ph = el('pattern', { id: 'dkb-h-' + key, patternUnits: 'userSpaceOnUse', width: TILE * cell, height: ROWS * cell }, defs);
      paint(el('g', null, ph), TILE, ROWS, band, cell);
      var pv = el('pattern', { id: 'dkb-v-' + key, patternUnits: 'userSpaceOnUse', width: ROWS * cell, height: TILE * cell }, defs);
      paint(el('g', null, pv), ROWS, TILE, function (x, y) { return band(y, x); }, cell);
    }
    return key;
  }

  function Frame(box) {
    this.box = box;
    this.revealed = reduce;
    this.svg = el('svg', { class: 'dkb-frame', 'aria-hidden': 'true', 'shape-rendering': 'crispEdges' });
    box.insertBefore(this.svg, box.firstChild);
    box.classList.add('dkb');
    this.key = '';
  }

  Frame.prototype.build = function () {
    var box = this.box, W = box.offsetWidth, H = box.offsetHeight;
    var narrow = window.innerWidth < 500;
    var cell = narrow ? 1.5 : 2, F = ROWS * cell, T = TILE * cell;
    var key = [W, H, cell].join(',');
    if (key === this.key) return;
    this.key = key;
    box.style.setProperty('--dkb-f', F + 'px');
    box.classList.toggle('dkb-narrow', narrow);

    var svg = this.svg, id = patterns(cell);
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    svg.setAttribute('width', W);
    svg.setAttribute('height', H);
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);

    var clipId = 'dkb-clip-' + Math.random().toString(36).slice(2, 8);
    var cp = el('clipPath', { id: clipId }, el('defs', null, svg));
    var g = el('g', { 'clip-path': 'url(#' + clipId + ')' }, svg);

    // A band from a to b along one side. Tiles are centred, so both ends
    // meet the corners symmetrically; any remainder is plain ground.
    function run(horizontal, x0, y0, len) {
      var n = Math.max(1, Math.floor(len / T)), used = n * T, off = Math.floor((len - used) / 2 / cell) * cell;
      if (horizontal) {
        el('rect', { x: x0, y: y0, width: len, height: F, fill: INK.d }, g);
        el('rect', { x: x0, y: y0 + cell, width: len, height: F - 2 * cell, fill: INK.r }, g);
        el('rect', { width: used, height: F, fill: 'url(#dkb-h-' + id + ')', transform: 'translate(' + (x0 + off) + ',' + y0 + ')' }, g);
      } else {
        el('rect', { x: x0, y: y0, width: F, height: len, fill: INK.d }, g);
        el('rect', { x: x0 + cell, y: y0, width: F - 2 * cell, height: len, fill: INK.r }, g);
        el('rect', { width: F, height: used, fill: 'url(#dkb-v-' + id + ')', transform: 'translate(' + x0 + ',' + (y0 + off) + ')' }, g);
      }
    }
    function cornerAt(x, y) {
      paint(el('g', { transform: 'translate(' + x + ',' + y + ')' }, g), ROWS, ROWS, corner, cell);
    }

    var innerW = W - 2 * F, innerH = H - 2 * F, right = W - F, bottom = H - F, mid = W / 2;
    var sideW = narrow ? 1.5 : F;     // width of the side run (a thread on phones)
    if (narrow) {
      run(true, 0, 0, W);
      run(true, 0, H - F, W);
      // the sides keep a single umber thread
      el('rect', { x: 0, y: F, width: sideW, height: innerH, fill: INK.d }, g);
      el('rect', { x: W - sideW, y: F, width: sideW, height: innerH, fill: INK.d }, g);
    } else {
      cornerAt(0, 0);
      run(true, F, 0, innerW);
      cornerAt(right, 0);
      run(false, right, F, innerH);
      cornerAt(right, bottom);
      run(true, F, bottom, innerW);
      cornerAt(0, bottom);
      run(false, 0, F, innerH);
    }

    // Weave-in: two threads leave the title at the top centre, run out along
    // the top band, down the left and right sides together, and meet in the
    // middle of the bottom band. Each piece grows along one axis from `from`.
    var pieces = [];
    [-1, 1].forEach(function (side) {
      var left = side < 0;
      // top band: from the centre out to the edge (corner included)
      pieces.push({ x: left ? 0 : mid, y: 0, w: mid, h: F, axis: 'x', from: left ? 'end' : 'start', len: mid });
      // side: down from under the top band to the bottom band
      pieces.push({ x: left ? 0 : W - sideW, y: F, w: sideW, h: innerH, axis: 'y', from: 'start', len: innerH });
      // bottom band: from the edge (corner included) in to the centre
      pieces.push({ x: left ? 0 : mid, y: H - F, w: mid, h: F, axis: 'x', from: left ? 'start' : 'end', len: mid });
    });
    var perSide = mid + innerH + mid;
    pieces.forEach(function (pc, i) {
      var k = i % 3;
      pc.at = k === 0 ? 0 : k === 1 ? mid : mid + innerH;   // distance along the thread where it starts
      pc.r = el('rect', { x: pc.x, y: pc.y, width: 0, height: 0 }, cp);
    });
    function set(p) {
      var dist = p * perSide;
      pieces.forEach(function (pc) {
        var l = Math.max(0, Math.min(pc.len, dist - pc.at));
        l = p >= 1 ? pc.len : Math.round(l / cell) * cell;   // advance a cell at a time
        if (pc.axis === 'x') {
          pc.r.setAttribute('y', pc.y); pc.r.setAttribute('height', pc.h);
          pc.r.setAttribute('width', l);
          pc.r.setAttribute('x', pc.from === 'start' ? pc.x : pc.x + pc.w - l);
        } else {
          pc.r.setAttribute('x', pc.x); pc.r.setAttribute('width', pc.w);
          pc.r.setAttribute('height', l);
          pc.r.setAttribute('y', pc.from === 'start' ? pc.y : pc.y + pc.h - l);
        }
      });
    }
    this.set = set;
    set(this.revealed ? 1 : 0);
  };

  Frame.prototype.reveal = function () {
    if (this.revealed) return;
    this.revealed = true;
    var self = this, t0 = null, DUR = 1600;
    function tick(t) {
      if (t0 === null) t0 = t;
      var p = Math.min(1, (t - t0) / DUR);
      self.set(1 - Math.pow(1 - p, 2));
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  };

  var frames = Array.prototype.map.call(boxes, function (b) { return new Frame(b); });
  frames.forEach(function (f) { f.build(); });

  var timer = null;
  function rebuild() { clearTimeout(timer); timer = setTimeout(function () { frames.forEach(function (f) { f.build(); }); }, 80); }
  if ('ResizeObserver' in window) frames.forEach(function (f) { new ResizeObserver(rebuild).observe(f.box); });
  window.addEventListener('resize', rebuild);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(rebuild);

  if (reduce || !('IntersectionObserver' in window)) {
    frames.forEach(function (f) { f.revealed = true; f.set(1); });
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      frames.forEach(function (f) { if (f.box === e.target) f.reveal(); });
      io.unobserve(e.target);
    });
  }, { threshold: 0.35 });
  frames.forEach(function (f) { io.observe(f.box); });
})();
