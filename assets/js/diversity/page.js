/* Figures for /diversity/. Plain JS + SVG, no dependencies.
   Data: window.CD_EXAMPLES (examples.js), window.CD_FIGDATA (figdata.js),
   and the paper's tables inlined below. Figures render statically and
   re-render when their container width changes. */
(function () {
  'use strict';

  var COLOR = {
    // The paper's palette (Okabe-Ito, paper/figures/paper_style.py)
    base: '#999999', iid: '#0072b2', iidhot: '#56b4e9', iid64: '#7b3294', groot: '#d55e00', vs: '#009e73',
    pass: '#16823c', fail: '#be372d', ink: '#1b1f24', ink2: '#454b54', muted: '#6b7280',
    grid: '#eeeeee', rule: '#d4d4d4', soft: '#f4f4f4'
  };
  var NS = 'http://www.w3.org/2000/svg';

  // ── Helpers ──────────────────────────────────────────────────────────────

  function svg(tag, attrs, parent, text) {
    var n = document.createElementNS(NS, tag);
    if (attrs) for (var k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    if (parent) parent.appendChild(n);
    return n;
  }

  function html(tag, attrs, parent, text) {
    var n = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (k === 'class') n.className = attrs[k];
      else if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    }
    if (text != null) n.textContent = text;
    if (parent) parent.appendChild(n);
    return n;
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function fmt(v, d) { return v.toFixed(d); }

  function segmented(root, attr, cb) {
    var btns = root.querySelectorAll('[' + attr + ']');
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        btns.forEach(function (o) {
          o.classList.toggle('is-on', o === b);
          if (o.hasAttribute('aria-selected')) o.setAttribute('aria-selected', o === b ? 'true' : 'false');
        });
        cb(b.getAttribute(attr), b);
      });
    });
  }

  var tip = document.querySelector('.cd-tooltip');
  function showTip(content, evt) {
    if (!tip) return;
    tip.innerHTML = content;
    tip.hidden = false;
    var x = evt.clientX + 14, y = evt.clientY + 14, r = tip.getBoundingClientRect();
    if (x + r.width > window.innerWidth - 8) x = evt.clientX - r.width - 14;
    if (y + r.height > window.innerHeight - 8) y = evt.clientY - r.height - 14;
    tip.style.left = x + 'px';
    tip.style.top = y + 'px';
  }
  function hideTip() { if (tip) tip.hidden = true; }
  function sw(color) { return '<span class="sw" style="background:' + color + '"></span>'; }
  function hover(el, fn) {
    el.addEventListener('mousemove', function (e) { showTip(fn(), e); });
    el.addEventListener('mouseleave', hideTip);
  }

  function wrapText(textEl, str, maxChars, lineH, maxLines) {
    var words = str.split(/\s+/), lines = [], cur = '';
    words.forEach(function (w) {
      if ((cur + ' ' + w).trim().length > maxChars && cur) { lines.push(cur); cur = w; }
      else cur = (cur + ' ' + w).trim();
    });
    if (cur) lines.push(cur);
    if (maxLines && lines.length > maxLines) {
      lines = lines.slice(0, maxLines);
      lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, '') + '…';
    }
    var x = textEl.getAttribute('x');
    lines.forEach(function (l, i) { svg('tspan', { x: x, dy: i === 0 ? 0 : lineH }, textEl, l); });
    return lines.length;
  }

  // ── Entrance animation: draw once, when the figure first scrolls into view ──
  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function easeInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function tween(ms, delay, fn) {
    setTimeout(function () {
      var t0 = performance.now();
      (function step(now) {
        var t = Math.max(0, Math.min(1, (now - t0) / ms));
        fn(easeInOut(t));
        if (t < 1) requestAnimationFrame(step);
      })(t0);
    }, delay);
  }
  function whenSeen(node, fn) {
    if (REDUCED || !('IntersectionObserver' in window)) return false;
    var io = new IntersectionObserver(function (es) {
      if (es.some(function (e) { return e.isIntersecting; })) { io.disconnect(); fn(); }
    }, { threshold: 0.35 });
    io.observe(node);
    return true;
  }
  function fadeIn(el, delay) {
    el.style.opacity = 0;
    el.style.transition = 'opacity 0.35s ease ' + delay + 'ms';
    requestAnimationFrame(function () { requestAnimationFrame(function () { el.style.opacity = 1; }); });
  }

  // Shared k-axis scale for every pass@k chart: 'log' or 'linear'.
  var KSCALE = 'log', kscaleHooks = [];
  function onKScale(fn) { kscaleHooks.push(fn); }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-kscale]');
    if (!b) return;
    var v = b.getAttribute('data-kscale');
    if (v === KSCALE) return;
    KSCALE = v;
    document.querySelectorAll('[data-kscale]').forEach(function (o) { o.classList.toggle('is-on', o.getAttribute('data-kscale') === v); });
    kscaleHooks.forEach(function (f) { f(); });
  });

  function widthOf(host) { return Math.round(Math.max(320, Math.min(900, host.clientWidth || 720))); }

  function legend(host, items) {
    var box = html('div', { class: 'cd-legend' }, host);
    items.forEach(function (it) {
      var s = html('span', null, box);
      html('i', { class: 'cd-key ' + (it.kind || 'dot'), style: '--kc:' + it.color }, s);
      s.appendChild(document.createTextNode(it.label));
    });
  }

  // Paper markers: IID o, GROOT square, VS triangle, IID-64 down-triangle; T=1.5 and IID-64 hollow.
  var SHAPE = { base: 'circle', iid: 'circle', iidhot: 'circle', iid64: 'down', groot: 'square', vs: 'up' };
  function marker(parent, id, x, y, r) {
    var c = COLOR[id], hollow = id === 'iidhot' || id === 'iid64', shape = SHAPE[id] || 'circle';
    var a = { fill: hollow ? '#fff' : c, stroke: hollow ? c : '#fff', 'stroke-width': hollow ? 1.6 : 1.2 };
    if (shape === 'square') { a.x = x - r * 0.9; a.y = y - r * 0.9; a.width = a.height = r * 1.8; return svg('rect', a, parent); }
    if (shape === 'up' || shape === 'down') {
      var s = shape === 'up' ? 1 : -1, h = r * 1.15;
      a.points = [x, y - s * h, x - h, y + s * h * 0.8, x + h, y + s * h * 0.8].join(',');
      return svg('polygon', a, parent);
    }
    a.cx = x; a.cy = y; a.r = r;
    return svg('circle', a, parent);
  }

  function hatch(defs, id, color) {
    var p = svg('pattern', { id: id, patternUnits: 'userSpaceOnUse', width: 5, height: 5, patternTransform: 'rotate(45)' }, defs);
    svg('line', { x1: 0, y1: 0, x2: 0, y2: 5, stroke: color, 'stroke-width': 2 }, p);
  }

  // Re-render registered figures when their width changes.
  var renderers = [];
  // Charts render lazily so none of them competes with the first paint: each one is
  // drawn in its own idle slot after load, or straight away if it scrolls near the
  // viewport first. Re-renders on resize or toggles are immediate.
  var idleQueue = [], idleScheduled = false;
  var ric = window.requestIdleCallback || function (f) { return setTimeout(function () { f({ timeRemaining: function () { return 8; } }); }, 60); };
  function drainIdle() {
    idleScheduled = false;
    var job = idleQueue.shift();
    if (job) job();
    if (idleQueue.length) { idleScheduled = true; ric(drainIdle, { timeout: 1500 }); }
  }
  function whenReady(f) {
    if (document.readyState === 'complete') f(); else window.addEventListener('load', f);
  }
  function responsive(host, render) {
    var last = 0, started = false;
    function run() {
      var w = widthOf(host);
      if (w === last) return;
      last = w;
      host.innerHTML = '';
      render(w);
    }
    function start() {
      if (started) return;
      started = true;
      renderers.push(run);
      run();
    }
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) {
        if (es.some(function (e) { return e.isIntersecting; })) { io.disconnect(); start(); }
      }, { rootMargin: '100% 0px' });
      io.observe(host);
      idleQueue.push(function () { io.disconnect(); start(); });
      whenReady(function () { if (!idleScheduled && idleQueue.length) { idleScheduled = true; ric(drainIdle, { timeout: 1500 }); } });
    } else start();
    return function () { if (!started) { start(); return; } last = 0; run(); };
  }
  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { renderers.forEach(function (r) { r(); }); }, 120);
  });

  // Horizontal axis with gridlines for bar-style charts.
  function xAxis(g, sx, ticks, y0, y1, label, labelX) {
    ticks.forEach(function (t) {
      svg('line', { x1: sx(t), x2: sx(t), y1: y0, y2: y1, class: 'cd-gridline' }, g);
      svg('text', { x: sx(t), y: y1 + 16, 'text-anchor': 'middle', class: 'cd-lab-muted' }, g, t);
    });
    if (label) svg('text', { x: labelX, y: y1 + 16, 'text-anchor': 'end', class: 'cd-lab-muted' }, g, label);
  }

  // ── Line chart (log or linear x), bands, crosshair tooltip ───────────────

  // Monotone cubic through the points (Fritsch-Carlson): smooth, passes through every
  // measured value, and never overshoots between them.
  function smoothPath(pts) {
    var n = pts.length;
    if (n < 3) return pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ');
    var d = [], m = [];
    for (var i = 0; i < n - 1; i++) d.push((pts[i + 1][1] - pts[i][1]) / (pts[i + 1][0] - pts[i][0]));
    m[0] = d[0]; m[n - 1] = d[n - 2];
    for (i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
    for (i = 0; i < n - 1; i++) {
      if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
      var a = m[i] / d[i], b = m[i + 1] / d[i], h = a * a + b * b;
      if (h > 9) { var t = 3 / Math.sqrt(h); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; }
    }
    var out = 'M' + pts[0][0].toFixed(1) + ',' + pts[0][1].toFixed(1);
    for (i = 0; i < n - 1; i++) {
      var dx = (pts[i + 1][0] - pts[i][0]) / 3;
      out += ' C' + (pts[i][0] + dx).toFixed(1) + ',' + (pts[i][1] + m[i] * dx).toFixed(1) + ' ' +
        (pts[i + 1][0] - dx).toFixed(1) + ',' + (pts[i + 1][1] - m[i + 1] * dx).toFixed(1) + ' ' +
        pts[i + 1][0].toFixed(1) + ',' + pts[i + 1][1].toFixed(1);
    }
    return out;
  }

  function lineChart(host, W, opts) {
    var wide = W >= 600, H = opts.height || 320;
    var M = { l: 46, r: wide ? (opts.rightPad || 110) : 12, t: 12, b: 42 };
    legend(host, opts.series.map(function (s) {
      return { label: s.name, color: COLOR[s.id], kind: s.dotted ? 'dot-line' : (s.dash ? 'dash' : 'line') };
    }));
    var root = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': opts.aria }, host);
    var useLog = opts.log2 && KSCALE === 'log';
    var tx = useLog ? Math.log2 : function (x) { return x; };
    var xTicks = !useLog && opts.xTicksLinear ? opts.xTicksLinear : opts.xTicks;
    var xLabel = opts.log2 && !useLog ? opts.xLabel.replace(' (log scale)', '') : opts.xLabel;
    var x0 = tx(opts.xDomain[0]), x1 = tx(opts.xDomain[1]);
    var yDom = opts.yDomain.slice(), yTicks = opts.yTicks.slice();
    var sx = function (x) { return M.l + (tx(x) - x0) / (x1 - x0) * (W - M.l - M.r); };
    var sy = function (y) { return H - M.b - (y - yDom[0]) / (yDom[1] - yDom[0]) * (H - M.t - M.b); };

    // Static parts: x axis and labels
    var ax = svg('g', { class: 'cd-ax' }, root);
    var yAx = svg('g', null, ax);
    xTicks.forEach(function (t) {
      svg('text', { x: sx(t), y: H - M.b + 18, 'text-anchor': 'middle' }, ax, t);
      if (opts.xMinor) svg('line', { x1: sx(t), x2: sx(t), y1: H - M.b, y2: H - M.b + 6, stroke: '#8a8a8a' }, ax);
    });
    if (opts.xMinor) for (var xm = Math.ceil(opts.xDomain[0] / opts.xMinor) * opts.xMinor; xm <= opts.xDomain[1]; xm += opts.xMinor) {
      if (xTicks.indexOf(xm) < 0) svg('line', { x1: sx(xm), x2: sx(xm), y1: H - M.b, y2: H - M.b + 3.5, stroke: '#a8a8a8' }, ax);
    }
    svg('line', { x1: M.l, x2: W - M.r, y1: H - M.b, y2: H - M.b }, ax);
    svg('text', { x: (M.l + W - M.r) / 2, y: H - 4, 'text-anchor': 'middle' }, ax, xLabel);
    svg('text', { transform: 'translate(12,' + ((M.t + H - M.b) / 2) + ') rotate(-90)', 'text-anchor': 'middle' }, ax, opts.yLabel);
    if (opts.annotate) opts.annotate(root, sx, sy, W, H, M, wide);

    // Draw back-to-front: the reference series first, the highlighted ones last.
    // Each series sits in its own group so it can be swept in from the left.
    var defsEl = svg('defs', null, root), groups = {};
    var els = opts.series.map(function () { return {}; });
    opts.series.slice().reverse().forEach(function (s) {
      var k = opts.series.indexOf(s), c = COLOR[s.id];
      var sg = svg('g', null, root);
      groups[s.key || s.id] = sg;
      if (s.band) els[k].band = svg(opts.smooth ? 'path' : 'polygon', { fill: c, opacity: 0.13 }, sg);
      els[k].path = svg('path', { fill: 'none', stroke: c, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-dasharray': s.dash || null }, sg);
      els[k].marks = svg('g', null, sg);
    });
    var labG = svg('g', null, root);
    opts.series.forEach(function (s, k) {
      if (!wide) return;
      var t = svg('text', { x: W - M.r + 8, class: 'cd-lab' }, labG);
      svg('tspan', null, t, (s.endName || s.name) + ' ');
      els[k].val = svg('tspan', { fill: COLOR.muted }, t);
      els[k].label = t;
      s.endLabel = t;
    });

    // Everything that depends on the data values; redrawn during transitions.
    function drawValues(series) {
      yAx.innerHTML = '';
      yTicks.forEach(function (t) {
        if (t > yDom[1] + 1e-9) return;
        svg('line', { x1: M.l, x2: W - M.r, y1: sy(t), y2: sy(t), class: 'cd-gridline' }, yAx);
        svg('text', { x: M.l - (opts.yMinor ? 10 : 8), y: sy(t) + 4, 'text-anchor': 'end' }, yAx, t);
        if (opts.yMinor) svg('line', { x1: M.l - 6, x2: M.l, y1: sy(t), y2: sy(t), stroke: '#8a8a8a' }, yAx);
      });
      if (opts.yMinor) {
        svg('line', { x1: M.l, x2: M.l, y1: sy(yDom[1]), y2: sy(yDom[0]), stroke: '#bbbbbb' }, yAx);
        for (var ym = Math.ceil(yDom[0] / opts.yMinor) * opts.yMinor; ym <= yDom[1] + 1e-9; ym += opts.yMinor) {
          if (yTicks.indexOf(ym) < 0) svg('line', { x1: M.l - 3.5, x2: M.l, y1: sy(ym), y2: sy(ym), stroke: '#a8a8a8' }, yAx);
        }
      }
      series.forEach(function (s, k) {
        var e = els[k];
        if (e.band && s.band) {
          if (opts.smooth) {
            // Band as two smooth edges joined into one closed shape
            var upP = s.band.map(function (b) { return [sx(b[0]), sy(b[2])]; });
            var loP = s.band.slice().reverse().map(function (b) { return [sx(b[0]), sy(b[1])]; });
            e.band.setAttribute('d', smoothPath(upP) + ' L' + loP[0][0].toFixed(1) + ',' + loP[0][1].toFixed(1) + ' ' + smoothPath(loP).slice(1) + ' Z');
          } else {
            var up = s.band.map(function (b) { return sx(b[0]) + ',' + sy(b[2]); });
            var lo = s.band.slice().reverse().map(function (b) { return sx(b[0]) + ',' + sy(b[1]); });
            e.band.setAttribute('points', up.concat(lo).join(' '));
          }
        }
        e.path.setAttribute('d', opts.smooth
          ? smoothPath(s.points.map(function (p) { return [sx(p[0]), sy(p[1])]; }))
          : s.points.map(function (p, i) { return (i ? 'L' : 'M') + sx(p[0]).toFixed(1) + ',' + sy(p[1]).toFixed(1); }).join(' '));
        e.marks.innerHTML = '';
        if (opts.markers && !s.noMarkers) s.points.forEach(function (p) {
          if (!opts.markerAt || opts.markerAt.indexOf(p[0]) >= 0) marker(e.marks, s.id, sx(p[0]), sy(p[1]), 3.6);
        });
      });
      if (wide) {
        var ends = series.map(function (s, k) {
          var p = s.points[s.points.length - 1];
          return { k: k, y: sy(p[1]), v: p[1] };
        }).sort(function (a, b) { return a.y - b.y; });
        for (var i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 15) ends[i].y = ends[i - 1].y + 15;
        ends.forEach(function (e) {
          els[e.k].label.setAttribute('y', e.y + 4);
          els[e.k].val.textContent = fmt(e.v, opts.dec || 1);
        });
      }
    }
    var current = opts.series;
    drawValues(current);

    // Entrance: sweep series in, in drawing order; labels appear as each finishes.
    var animIds = opts.animate === true ? opts.series.map(function (s) { return s.key || s.id; }) : (opts.animate || []);
    var order = opts.series.slice().reverse().filter(function (s) { return animIds.indexOf(s.key || s.id) >= 0; });
    if (order.length && !REDUCED) {
      var clips = order.map(function (s) {
        var cp = svg('clipPath', { id: 'cd-sweep-' + Math.random().toString(36).slice(2) }, defsEl);
        var rect = svg('rect', { x: 0, y: -20, width: M.l - 2, height: H + 40 }, cp);
        groups[s.key || s.id].setAttribute('clip-path', 'url(#' + cp.id + ')');
        if (s.endLabel) s.endLabel.style.opacity = 0;
        return rect;
      });
      var play = function () {
        order.forEach(function (s, i) {
          var delay = i * 550;
          tween(900, delay, function (t) { clips[i].setAttribute('width', M.l - 2 + t * (W - M.l + 2)); });
          if (s.endLabel) fadeIn(s.endLabel, delay + 800);
        });
      };
      if (opts.immediate) play(); else if (!whenSeen(host, play)) play();
    }

    var xs = opts.series[0].points.map(function (p) { return p[0]; });
    var cross = svg('line', { y1: M.t, y2: H - M.b, stroke: COLOR.ink, 'stroke-width': 1, opacity: 0 }, root);
    var dots = opts.series.map(function (s) { return svg('circle', { r: 4.5, fill: COLOR[s.id], stroke: '#fff', 'stroke-width': 2, opacity: 0 }, root); });
    var hit = svg('rect', { x: M.l, y: M.t, width: W - M.l - M.r, height: H - M.t - M.b, fill: 'transparent' }, root);
    hit.addEventListener('mousemove', function (e) {
      var box = root.getBoundingClientRect(), px = (e.clientX - box.left) / box.width * W, best = 0;
      xs.forEach(function (x, i) { if (Math.abs(sx(x) - px) < Math.abs(sx(xs[best]) - px)) best = i; });
      cross.setAttribute('x1', sx(xs[best])); cross.setAttribute('x2', sx(xs[best])); cross.setAttribute('opacity', 0.2);
      var rows = current.map(function (s, i) {
        var p = s.points[best];
        dots[i].setAttribute('cx', sx(p[0])); dots[i].setAttribute('cy', sy(p[1])); dots[i].setAttribute('opacity', 1);
        return { s: s, v: p[1], b: s.band && s.band[best] };
      }).sort(function (a, b) { return b.v - a.v; });
      showTip('<b>' + opts.xName + ' ' + xs[best] + '</b><br>' + rows.map(function (r) {
        return sw(COLOR[r.s.id]) + esc(r.s.name) + ': ' + fmt(r.v, opts.dec || 1) +
          (r.b ? ' <span style="color:#6b7280">± ' + fmt((r.b[2] - r.b[1]) / 2, opts.dec || 1) + '</span>' : '');
      }).join('<br>'), e);
    });
    hit.addEventListener('mouseleave', function () {
      hideTip(); cross.setAttribute('opacity', 0);
      dots.forEach(function (d) { d.setAttribute('opacity', 0); });
    });

    // Glide to new values (same series and x positions), rescaling the y axis.
    var anim = 0;
    return {
      update: function (next, nextDomain, nextTicks, ms) {
        var from = current, fromDom = yDom.slice(), id = ++anim;
        yTicks = nextTicks || yTicks;
        function mix(t) {
          return next.map(function (s, k) {
            var a = from[k];
            return {
              id: s.id, name: s.name,
              points: s.points.map(function (p, i) { return [p[0], a.points[i][1] + (p[1] - a.points[i][1]) * t]; }),
              band: s.band && a.band ? s.band.map(function (b, i) { var o = a.band[i]; return [b[0], o[1] + (b[1] - o[1]) * t, o[2] + (b[2] - o[2]) * t]; }) : s.band
            };
          });
        }
        if (REDUCED) { yDom = nextDomain.slice(); current = next; drawValues(next); return; }
        tween(ms || 650, 0, function (t) {
          if (id !== anim) return;
          yDom = [fromDom[0] + (nextDomain[0] - fromDom[0]) * t, fromDom[1] + (nextDomain[1] - fromDom[1]) * t];
          drawValues(t < 1 ? mix(t) : next);
          if (t >= 1) current = next;
        });
      }
    };
  }

  // ── Paper tables ─────────────────────────────────────────────────────────

  // Table 2: frontier pass@[1, 8, 64] after RFT (Qwen3-4B-Instruct)
  var PASSK = {
    rows: [
      { name: 'Base', s: 'base' },
      { name: 'IID-4', s: 'iid' },
      { name: 'IID-4 (T=1.5)', s: 'iidhot' },
      { name: 'IID-64', s: 'iid64' },
      { name: 'IID-64 (T=1.5)', s: 'iidhot' },
      { name: 'GROOT-4 ANTI', s: 'groot', anti: true },
      { name: 'GROOT-4', s: 'groot' },
      { name: 'VS-4 ANTI', s: 'vs', anti: true },
      { name: 'VS-4', s: 'vs' }
    ],
    cobalt: [[0.5, 3.6, 21.9], [0.7, 4.9, 19.8], [1.0, 6.5, 22.4], [1.0, 6.3, 21.5], [1.5, 7.4, 23.0], [3.1, 11.8, 26.4], [3.5, 14.1, 30.5], [3.3, 12.5, 29.1], [4.1, 14.3, 30.2]],
    lcb: [[0.2, 1.3, 7.4], [0.2, 1.5, 7.0], [0.5, 3.2, 10.8], [0.4, 2.5, 8.7], [0.4, 2.8, 10.7], [1.2, 6.3, 17.1], [1.5, 8.0, 19.5], [1.2, 7.0, 20.3], [2.0, 9.6, 23.1]],
    ojb: [[0.1, 0.5, 2.9], [0.1, 0.7, 3.5], [0.1, 1.0, 5.2], [0.1, 1.0, 4.4], [0.2, 1.4, 5.2], [1.0, 3.7, 8.4], [1.2, 5.3, 11.5], [0.9, 3.8, 9.2], [1.5, 5.6, 11.9]],
    macro: [[0.2, 0.9, 5.2], [0.2, 1.1, 5.2], [0.3, 2.1, 8.0], [0.2, 1.8, 6.5], [0.3, 2.1, 7.9], [1.1, 5.0, 12.8], [1.4, 6.7, 15.5], [1.1, 5.4, 14.8], [1.8, 7.6, 17.5]]
  };
  function passkRow(name) {
    for (var i = 0; i < PASSK.rows.length; i++) if (PASSK.rows[i].name === name) return PASSK.macro[i];
  }

  // ── Figure 1: held-out pass@k ────────────────────────────────────────────

  (function fig1() {
    var fig = document.getElementById('fig-passk');
    if (!fig) return;
    var host = fig.querySelector('.cd-chart'), show = 'iid', model = 'qwen', bench = 'macro', first = true, fresh = null, chart = null;
    var YMAX = { qwen: { macro: 20, cobalt: 35, lcb: 25, ojbench: 15 }, n3n: { macro: 25, cobalt: 40, lcb: 25, ojbench: 20 } };
    function ymax() { return YMAX[model][bench]; }
    function ticks() { var m = ymax(), st = m > 25 ? 10 : 5, out = []; for (var t = 0; t <= m; t += st) out.push(t); return out; }
    // Listed front to back; drawn and animated back to front: Base, IID, GROOT, then VS.
    var defs = [
      { id: 'vs', name: 'VS-4', row: 'VS-4', strategic: true },
      { id: 'groot', name: 'GROOT-4', row: 'GROOT-4', strategic: true },
      { id: 'iidhot', name: 'IID-64 (T=1.5)', row: 'IID-64 (T=1.5)' },
      { id: 'iid', name: 'IID-4', row: 'IID-4' },
      { id: 'base', name: 'Base', row: 'Base', dash: '5 4' }
    ];
    // Qwen3-4B: Table 2 curves. Nemotron-3-Nano-4B: its own frontier (Table 7 curves);
    // arms without a full curve there are left out rather than drawn from 3 points.
    function seriesFor() {
      var C = window.CD_PASSK, N = window.CD_N3N_PRE;
      return defs.filter(function (d) { return show === 'all' || !d.strategic; }).map(function (d) {
        var pts = null;
        if (model === 'qwen') {
          if (C) pts = C.ks.map(function (kk, i) { return [kk, C.table2[d.row][bench][i]]; });
          else if (bench === 'macro') { var v = passkRow(d.row); pts = [[1, v[0]], [8, v[1]], [64, v[2]]]; }
        } else {
          var arm = d.row === 'IID-64 (T=1.5)' ? 'IID-64' : d.row;
          if (N && N[arm]) pts = N[arm][bench].map(function (y, i) { return [i + 1, y]; });
        }
        return pts && { id: model === 'n3n' && d.id === 'iidhot' ? 'iid64' : d.id, name: model === 'n3n' && d.row === 'IID-64 (T=1.5)' ? 'IID-64' : d.name, dash: d.dash, points: pts };
      }).filter(Boolean);
    }
    var rerender = responsive(host, function (W) {
      chart = lineChart(host, W, {
        series: seriesFor(), log2: true, xDomain: [1, 64], yDomain: [0, ymax()], yTicks: ticks(),
        xTicks: [1, 2, 4, 8, 16, 32, 64], xTicksLinear: [1, 16, 32, 48, 64], xLabel: 'samples k (log scale)', yLabel: 'pass@k (%)', xName: 'k =', markers: true,
        markerAt: [1, 2, 4, 8, 16, 32, 64],
        rightPad: 130, height: 300, aria: 'Frontier pass@k for the base model and self-trained models',
        animate: first ? true : (fresh || []), immediate: !first
      });
      first = false; fresh = null;
    });
    onKScale(function () { fresh = []; rerender(); });
    segmented(fig, 'data-model', function (m) {
      if (m === model) return;
      model = m; fresh = show === 'all' ? ['base', 'iid', 'iid64', 'iidhot', 'groot', 'vs'] : ['base', 'iid', 'iid64', 'iidhot'];
      rerender();
    });
    segmented(fig, 'data-show', function (v) {
      if (v === show) return;
      fresh = v === 'all' ? ['groot', 'vs'] : [];
      show = v; rerender();
    });
    segmented(fig, 'data-bench', function (b) {
      if (b === bench) return;
      bench = b;
      if (!chart) { rerender(); return; }   // not drawn yet
      chart.update(seriesFor(), [0, ymax()], ticks(), 700);
    });
  })();

  // ── Figure 2: pipeline diagram ───────────────────────────────────────────

  (function fig2() {
    var root = document.querySelector('#fig-pipeline svg');
    if (!root) return;
    var defs = svg('defs', null, root);
    var mk = svg('marker', { id: 'cd-ah', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto' }, defs);
    svg('path', { d: 'M0,1 L10,5 L0,9 z', fill: '#6b6b6b' }, mk);

    function arrow(x1, y1, x2, y2, label) {
      svg('line', { x1: x1, y1: y1, x2: x2, y2: y2, stroke: '#6b6b6b', 'stroke-width': 1.3, 'marker-end': 'url(#cd-ah)' }, root);
      if (label) svg('text', { x: (x1 + x2) / 2, y: y1 - 8, 'text-anchor': 'middle', 'font-size': 13, 'font-style': 'italic', fill: COLOR.ink2 }, root, label);
    }
    function box(x, y, w, h, label, sub) {
      svg('rect', { x: x, y: y, width: w, height: h, fill: '#fff', stroke: COLOR.ink, 'stroke-width': 1.2 }, root);
      svg('text', { x: x + w / 2, y: y + h / 2 + (sub ? -2 : 5), 'text-anchor': 'middle', 'font-size': 15, fill: COLOR.ink }, root, label);
      if (sub) svg('text', { x: x + w / 2, y: y + h / 2 + 15, 'text-anchor': 'middle', 'font-size': 12, fill: COLOR.muted }, root, sub);
    }

    var rows = [
      { y: 60, name: 'IID', sub: 'baseline', c: COLOR.iid },
      { y: 186, name: 'GROOT', sub: 'structured', c: COLOR.groot },
      { y: 322, name: 'VS', sub: 'unstructured', c: COLOR.vs }
    ];
    rows.forEach(function (r) {
      svg('text', { x: 8, y: r.y - 2, 'font-size': 17, 'font-weight': 'bold', fill: r.c }, root, r.name);
      svg('text', { x: 8, y: r.y + 16, 'font-size': 13, 'font-style': 'italic', fill: COLOR.muted }, root, r.sub);
      box(104, r.y - 20, 78, 40, 'problem');
    });

    // IID: n samples that cluster on one strategy, then a correctness filter
    var y = rows[0].y, iidC = [[0, 0], [-9, -6], [8, -8], [-6, 8], [10, 5], [2, -14], [-13, 2], [4, 12]];
    arrow(182, y, 232, y, 'sample n');
    svg('ellipse', { cx: 290, cy: y, rx: 40, ry: 28, fill: 'none', stroke: COLOR.rule, 'stroke-dasharray': '3 3' }, root);
    iidC.forEach(function (p) { svg('circle', { cx: 290 + p[0], cy: y + p[1], r: 4.2, fill: COLOR.iid, stroke: '#fff', 'stroke-width': 1 }, root); });
    svg('text', { x: 290, y: y + 44, 'text-anchor': 'middle', 'font-size': 12.5, 'font-style': 'italic', fill: COLOR.muted }, root, 'mostly one strategy');
    arrow(334, y, 470, y, 'keep correct');
    ['✓', '✗', '✗', '✓'].forEach(function (m, i) {
      svg('text', { x: 492 + i * 16, y: y + 5, 'text-anchor': 'middle', 'font-size': 15, fill: m === '✓' ? COLOR.pass : COLOR.fail }, root, m);
    });

    // GROOT: a tree, one path per top-level branch
    y = rows[1].y;
    arrow(182, y, 226, y, 'plan');
    var kids = [-42, -14, 14, 42];
    svg('circle', { cx: 236, cy: y, r: 4, fill: COLOR.ink }, root);
    kids.forEach(function (dy, i) {
      svg('line', { x1: 236, y1: y, x2: 280, y2: y + dy, stroke: COLOR.groot, 'stroke-width': 1.6 }, root);
      svg('circle', { cx: 280, cy: y + dy, r: 3.5, fill: COLOR.groot }, root);
      [-6, 6].forEach(function (off, j) {
        var on = (i + j) % 2 === 0;
        svg('line', { x1: 280, y1: y + dy, x2: 320, y2: y + dy + off, stroke: on ? COLOR.groot : COLOR.rule, 'stroke-width': on ? 1.6 : 1 }, root);
        svg('circle', { cx: 320, cy: y + dy + off, r: on ? 3.5 : 2.5, fill: on ? COLOR.groot : COLOR.rule }, root);
      });
    });
    svg('text', { x: 278, y: y + 64, 'text-anchor': 'middle', 'font-size': 12.5, 'font-style': 'italic', fill: COLOR.muted }, root, 'tree of strategies, n paths');

    // VS: a list of approaches with probabilities
    y = rows[2].y;
    arrow(182, y, 226, y, 'plan');
    [[0.6, '.60'], [0.2, '.20'], [0.1, '.10'], [0.1, '.10']].forEach(function (a, i) {
      var yy = y - 33 + i * 22;
      svg('text', { x: 236, y: yy + 5, 'font-size': 13, fill: COLOR.ink2 }, root, 'p=' + a[1]);
      svg('rect', { x: 276, y: yy - 3, width: 60 * a[0] + 4, height: 7, fill: COLOR.vs }, root);
    });
    svg('text', { x: 280, y: y + 56, 'text-anchor': 'middle', 'font-size': 12.5, 'font-style': 'italic', fill: COLOR.muted }, root, 'n approaches with probabilities');

    // Strategic rows: solve once per approach, as a hidden instruction
    [rows[1], rows[2]].forEach(function (r) {
      arrow(346, r.y, 470, r.y, 'solve each approach');
      svg('text', { x: 408, y: r.y + 18, 'text-anchor': 'middle', 'font-size': 12, 'font-style': 'italic', fill: COLOR.muted }, root, '(approach hidden)');
      [-27, -9, 9, 27].forEach(function (dy, i) {
        svg('rect', { x: 480, y: r.y + dy - 7, width: 42, height: 14, fill: '#fff', stroke: r.c, 'stroke-width': 1.2 }, root);
        svg('text', { x: 501, y: r.y + dy + 4, 'text-anchor': 'middle', 'font-size': 11, fill: r.c }, root, 'ABCD'[i]);
      });
    });

    // Fine-tune, then all three models go to the same evaluation
    var midY = (rows[0].y + rows[2].y) / 2;
    rows.forEach(function (r) {
      arrow(r === rows[0] ? 548 : 530, r.y, 590, r.y);
      box(592, r.y - 20, 92, 40, 'fine-tune');
      svg('line', { x1: 684, x2: 706, y1: r.y, y2: r.y, stroke: '#6b6b6b', 'stroke-width': 1.3 }, root);
    });
    svg('line', { x1: 706, x2: 706, y1: rows[0].y, y2: rows[2].y, stroke: '#6b6b6b', 'stroke-width': 1.3 }, root);
    arrow(706, midY, 726, midY);
    var bx = 728, bw = 168, by = midY - 118, bh = 236, cx = bx + bw / 2;
    svg('rect', { x: bx, y: by, width: bw, height: bh, fill: COLOR.soft, stroke: COLOR.ink, 'stroke-width': 1.2 }, root);
    svg('text', { x: cx, y: by + 28, 'text-anchor': 'middle', 'font-size': 15, 'font-weight': 'bold', fill: COLOR.ink }, root, 'Evaluate in three ways:');
    [['pass@k', ['plain prompt, k samples']], ['test-time scaling', ['RSA (Venkatraman et al., 2025)']], ['RL', ['MaxRL (Tajwar et al., 2026)', 'for code; GRPO for NCP']]].forEach(function (e, i) {
      var y0 = by + 74 + i * 56;
      svg('text', { x: cx, y: y0, 'text-anchor': 'middle', 'font-size': 14.5, fill: COLOR.ink }, root, e[0]);
      e[1].forEach(function (line, k) {
        svg('text', { x: cx, y: y0 + 17 + k * 14, 'text-anchor': 'middle', 'font-size': 11.5, 'font-style': 'italic', fill: COLOR.muted }, root, line);
      });
    });
  })();

  // ── Figure 3: example explorer ───────────────────────────────────────────

  (function fig3() {
    var fig = document.getElementById('fig-example'), EX = window.CD_EXAMPLES;
    if (!fig || !EX) return;
    var code = EX.code;
    var panels = fig.querySelectorAll('.cd-tabpanel');
    segmented(fig, 'data-tab', function (t) {
      panels.forEach(function (p) { p.hidden = p.getAttribute('data-panel') !== t; });
    });

    // What the solver actually wrote for each approach, summarised from its response.
    // The solver may deviate from (or fix) the approach it is given.
    var SOLVER = {
      groot: {
        'A → A1': 'Noticed the per-query scan would be too slow and wrote an offline sweep with a Fenwick tree instead.',
        'C → C1': 'Implemented the offline sweep, keeping sorted endpoints and counting with binary search.',
        'B → B1': 'Built a 2D prefix-sum table over city pairs, but the program failed the tests.',
        'D → D2': 'Dropped the binary search on the answer and wrote an offline sweep with binary search instead.'
      },
      vs: [
        'Grouped trains by left endpoint and scanned them per query; the program failed the tests.',
        'Switched to a 2D prefix-sum table over city pairs (N ≤ 500), which passes.',
        'Implemented the table over all intervals; the program failed the tests.',
        'Fell back to checking every train for every query; the program failed the tests.'
      ]
    };
    function approach(boxEl, title, text, passed, color, solverNote) {
      boxEl.style.setProperty('--ac', color);
      boxEl.innerHTML = '<header>' + esc(title) + ' &nbsp;<span class="cd-mark ' + (passed ? 'pass">✓ solver passed' : 'fail">✗ solver failed') +
        '</span></header><p>' + esc(text) + '</p>' +
        (solverNote ? '<p class="cd-solver"><b>What the solver did:</b> ' + esc(solverNote) + '</p>' : '');
    }

    // GROOT tree
    (function () {
      var panel = fig.querySelector('[data-panel="groot"]');
      var root = panel.querySelector('svg'), boxEl = panel.querySelector('.cd-approach');
      var nodes = [], cur = null;
      code.tree.split('\n').forEach(function (line) {
        var m = line.match(/^\s*([A-Z])(\d*)\.\s*(.*)$/);
        if (!m) return;
        if (!m[2]) { cur = { id: m[1], text: m[3], kids: [] }; nodes.push(cur); }
        else if (cur) cur.kids.push({ id: m[1] + m[2], text: m[3] });
      });
      var chosen = {};
      code.groot.forEach(function (g, i) { chosen[g.path.split('→').pop().trim()] = { idx: i, g: g }; });

      var rowH = 48, top = 6, leaves = 0;
      nodes.forEach(function (n) { leaves += Math.max(1, n.kids.length); });
      var W = 900, H = top * 2 + leaves * rowH;
      root.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      var X0 = 0, W0 = 96, X1 = 130, W1 = 320, X2 = 488, W2 = 360;
      var edges = svg('g', null, root), boxes = svg('g', null, root);
      var rootY = H / 2;
      svg('rect', { x: X0, y: rootY - 20, width: W0, height: 40, fill: '#fff', stroke: COLOR.ink, 'stroke-width': 1.2 }, boxes);
      svg('text', { x: W0 / 2, y: rootY + 5, 'text-anchor': 'middle', 'font-size': 15, fill: COLOR.ink }, boxes, 'problem');

      function curve(x1, y1, x2, y2, on) {
        var mx = (x1 + x2) / 2;
        svg('path', { d: 'M' + x1 + ',' + y1 + ' C' + mx + ',' + y1 + ' ' + mx + ',' + y2 + ' ' + x2 + ',' + y2,
          fill: 'none', stroke: on ? COLOR.groot : COLOR.rule, 'stroke-width': on ? 1.8 : 1.2 }, edges);
      }

      var rects = [], row = 0;
      nodes.forEach(function (n) {
        var y0 = top + row * rowH, cy = y0 + n.kids.length * rowH / 2;
        var any = n.kids.some(function (k) { return chosen[k.id]; });
        curve(X0 + W0, rootY, X1, cy, any);
        svg('rect', { x: X1, y: cy - 19, width: W1, height: 38, fill: '#fff', stroke: any ? COLOR.groot : COLOR.rule, 'stroke-width': 1.2 }, boxes);
        var t1 = svg('text', { x: X1 + 10, y: cy - 3, 'font-size': 13.5, fill: COLOR.ink }, boxes);
        if (wrapText(t1, n.id + '. ' + n.text, 44, 15, 2) === 1) t1.setAttribute('y', cy + 5);
        n.kids.forEach(function (k, j) {
          var ky = y0 + j * rowH + rowH / 2, pick = chosen[k.id];
          curve(X1 + W1, cy, X2, ky, !!pick);
          var g = svg('g', pick ? { class: 'leaf', tabindex: 0, role: 'button' } : null, boxes);
          var rect = svg('rect', { x: X2, y: ky - 19, width: W2, height: 38, fill: pick ? '#fcefe6' : '#fff', stroke: pick ? COLOR.groot : COLOR.rule, 'stroke-width': 1.2 }, g);
          var t2 = svg('text', { x: X2 + 10, y: ky - 3, 'font-size': 13, fill: pick ? COLOR.ink : COLOR.muted }, g);
          if (wrapText(t2, k.id + '. ' + k.text, 50, 15, 2) === 1) t2.setAttribute('y', ky + 5);
          if (!pick) return;
          var ok = pick.g.passed;
          svg('text', { x: X2 + W2 + 14, y: ky + 6, 'font-size': 17, fill: ok ? COLOR.pass : COLOR.fail }, g, ok ? '✓' : '✗');
          function select() {
            rects.forEach(function (r) { r.setAttribute('stroke-width', 1.2); });
            rect.setAttribute('stroke-width', 2.6);
            approach(boxEl, 'Path ' + pick.g.path, pick.g.text, ok, COLOR.groot, SOLVER.groot[pick.g.path]);
          }
          g.addEventListener('click', select);
          g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(); } });
          rects.push(rect);
          if (pick.idx === 1) select();
        });
        row += Math.max(1, n.kids.length);
      });
    })();

    // VS list
    (function () {
      var panel = fig.querySelector('[data-panel="vs"]');
      var list = panel.querySelector('.cd-vs'), boxEl = panel.querySelector('.cd-approach');
      var names = [
        'Bucket trains by left endpoint, scan O(N) per query',
        'Offline sweep line with a Fenwick tree',
        'Precompute a count table over all O(N²) intervals',
        'Mo’s algorithm'
      ];
      var btns = code.vs.map(function (a, i) {
        var b = html('button', { type: 'button' }, list);
        html('span', { class: 'p' }, b, 'p = ' + a.p.toFixed(2));
        var mid = html('span', null, b, names[i]);
        html('span', { class: 'bar', style: 'width:' + (a.p * 100) + '%' }, mid);
        html('span', { class: 'cd-mark ' + (a.passed ? 'pass' : 'fail') }, b, a.passed ? '✓' : '✗');
        b.addEventListener('click', function () {
          btns.forEach(function (o) { o.classList.toggle('is-on', o === b); });
          approach(boxEl, 'p = ' + a.p.toFixed(2) + ': ' + names[i], a.text, a.passed, COLOR.vs, SOLVER.vs[i]);
        });
        return b;
      });
      var win = code.vs.findIndex(function (a) { return a.passed; });
      if (btns[win]) btns[win].click();
    })();

    // IID
    (function () {
      var panel = fig.querySelector('[data-panel="iid"]');
      var row = panel.querySelector('.cd-iid');
      code.iid_flags.forEach(function (f, i) { html('span', null, row, '#' + (i + 1) + ' ' + (f ? '✓' : '✗')); });
      panel.querySelector('code').textContent = code.iid_code;
    })();
  })();

  // ── Figure 4: training data vs trained model ─────────────────────────────

  (function fig4() {
    var fig = document.getElementById('fig-data');
    if (!fig) return;
    var host = fig.querySelector('.cd-chart');
    // Table 1 (problems with >= 1 correct sample, of 1,833) and Table 2 (held-out pass@64)
    // Problems with >= 1 correct sample while sampling (Table 1 / Table 10) and held-out
    // frontier pass@64 of the trained model (Table 2 / Table 7).
    var DATA = { qwen: { total: '1,833', rows: [
      { name: 'IID-4', s: 'iid', solved: 42, p64: 5.2 },
      { name: 'IID-4 (T=1.5)', s: 'iidhot', solved: 60, p64: 8.0 },
      { name: 'IID-64', s: 'iid64', solved: 312, p64: 6.5 },
      { name: 'IID-64 (T=1.5)', s: 'iidhot', solved: 379, p64: 7.9, hl: true, note: ['most correct data', 'weak model'] },
      { name: 'VS-4', s: 'vs', solved: 137, p64: 17.5 },
      { name: 'GROOT-4', s: 'groot', solved: 155, p64: 15.5, hl: true, note: ['less correct data', 'strong model'] }
    ] }, n3n: { total: null, rows: [
      { name: 'IID-4', s: 'iid', solved: 52, p64: 8.8 },
      { name: 'IID-8', s: 'iid', solved: 97, p64: 14.9 },
      { name: 'IID-64', s: 'iid64', solved: 424, p64: 11.9, hl: true, note: ['most correct data', 'weak model'] },
      { name: 'VS-4', s: 'vs', solved: 137, p64: 20.8 },
      { name: 'GROOT-4', s: 'groot', solved: 115, p64: 19.9, hl: true, note: ['less correct data', 'strong model'] }
    ] } };
    var model = 'qwen', rows = DATA.qwen.rows;
    var drawn4 = false;
    var rerender4 = responsive(host, function (W) {
      var grow = [];
      rows = DATA[model].rows;
      var narrow = W < 600, L = narrow ? 98 : 122, gap = narrow ? 18 : 34, R = narrow ? 34 : 64;
      var pw = (W - L - gap - R) / 2, rowH = 30, top = narrow ? 46 : 34, H = top + rows.length * rowH + 28;
      var root = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': 'Paired bars: training problems solved while sampling, and held-out pass@64 after training' }, host);
      var panels = [
        { x: L, key: 'solved', max: model === 'qwen' ? 450 : 500, ticks: [0, 200, 400], title: narrow ? ['training problems', 'with a correct sample'] : ['training problems with a correct sample'], d: 0 },
        { x: L + pw + gap, key: 'p64', max: model === 'qwen' ? 21 : 25, ticks: model === 'qwen' ? [0, 10, 20] : [0, 10, 20], title: narrow ? ['model after training:', 'held-out pass@64 (%)'] : ['model after training: held-out pass@64 (%)'], d: 1 }
      ];
      panels.forEach(function (p) {
        var sx = function (v) { return p.x + v / p.max * pw; };
        p.title.forEach(function (line, i) {
          svg('text', { x: p.x, y: 14 + i * 16, class: 'cd-lab', 'font-weight': 'bold' }, root, line);
        });
        xAxis(svg('g', null, root), sx, p.ticks, top - 6, H - 26);
        rows.forEach(function (r, i) {
          var y = top + i * rowH, w = Math.max(2, sx(r[p.key]) - p.x);
          // The two rows that carry the point stay strong; the rest step back.
          var rowG = svg('g', { class: 'cd-f4row' + (r.hl ? ' is-hl' : '') }, root);
          var rect = svg('rect', { x: p.x, y: y + 7, width: w, height: rowH - 14, fill: COLOR[r.s] }, rowG);
          var val = svg('text', { x: p.x + w + 5, y: y + rowH / 2 + 4, class: 'cd-val' }, rowG, fmt(r[p.key], p.d));
          if (r.note && !narrow) {
            var txt = r.note[p.d], tw = txt.length * 6.4 + 14, vx = p.x + w + 5 + (p.d ? 26 : 30);
            if (vx + tw > p.x + pw + (p.d ? R : gap - 4)) {
              // No room after the bar: write the note inside it
              svg('text', { x: p.x + w - 8, y: y + rowH / 2 + 4, 'text-anchor': 'end', class: 'cd-f4note', fill: '#fff', style: 'fill:#fff' }, rowG, txt);
            } else {
              svg('text', { x: vx, y: y + rowH / 2 + 4, class: 'cd-f4note' }, rowG, '← ' + txt);
            }
          }
          grow.push({ rect: rect, val: val, w: w, panel: p.d, i: i });
        });
      });
      rows.forEach(function (r, i) {
        var y = top + i * rowH;
        svg('text', { x: L - 10, y: y + rowH / 2 + 4, 'text-anchor': 'end', class: 'cd-lab' + (r.hl ? '' : ' cd-f4dim') }, root, r.name);
        var hit = svg('rect', { x: 0, y: y, width: W, height: rowH, fill: 'transparent' }, root);
        hover(hit, function () {
          return sw(COLOR[r.s]) + '<b>' + r.name + '</b><br>' + r.solved + (DATA[model].total ? ' / ' + DATA[model].total : '') + ' training problems solved<br>held-out pass@64 after RFT: ' + r.p64.toFixed(1);
        });
      });
      if (!drawn4 && !REDUCED) {
        // Training data first (left), then what the trained model scores (right)
        grow.forEach(function (g) { g.rect.setAttribute('width', 0); g.val.style.opacity = 0; });
        whenSeen(host, function () {
          grow.forEach(function (g) {
            var delay = g.panel * 1300 + g.i * 70;
            tween(650, delay, function (t) { g.rect.setAttribute('width', g.w * t); });
            fadeIn(g.val, delay + 550);
          });
        });
      }
      drawn4 = true;
    });
    segmented(fig, 'data-model', function (m) { if (m === model) return; model = m; drawn4 = true; rerender4(); });
  })();

  // ── Figure 5: training on incorrect samples only, as pass@k curves ───────

  (function fig5() {
    var fig = document.getElementById('fig-anti'), C = window.CD_PASSK;
    if (!fig || !C) return;
    var host = fig.querySelector('.cd-chart'), bench = 'macro', drawn = false;
    var BKEY = { macro: 'macro', lcb: 'lcb', ojb: 'ojbench', cobalt: 'cobalt' };
    // Listed front to back; drawn (and animated) back to front: Base, IID, ANTI, then full data
    var DEFS = [
      { key: 'vs', id: 'vs', arm: 'VS-4', name: 'VS-4' },
      { key: 'groot', id: 'groot', arm: 'GROOT-4', name: 'GROOT-4' },
      { key: 'vs-anti', id: 'vs', arm: 'VS-4 (ANTI)', name: 'VS-4, incorrect only', endName: 'VS-4 incorrect', dash: '1.5 3', dotted: true, noMarkers: true },
      { key: 'groot-anti', id: 'groot', arm: 'GROOT-4 (ANTI)', name: 'GROOT-4, incorrect only', endName: 'GROOT-4 incorrect', dash: '1.5 3', dotted: true, noMarkers: true },
      { key: 'iidhot', id: 'iidhot', arm: 'IID-64 (T=1.5)', name: 'IID-64 (T=1.5)' },
      { key: 'iid', id: 'iid', arm: 'IID-4', name: 'IID-4' },
      { key: 'base', id: 'base', arm: 'Base', name: 'Base', dash: '5 4' }
    ];
    var YMAX = { macro: 20, lcb: 25, ojb: 15, cobalt: 35 }, chart = null;
    function seriesFor(b) {
      return DEFS.map(function (d) {
        return { key: d.key, id: d.id, name: d.name, endName: d.endName, dash: d.dash, dotted: d.dotted, noMarkers: d.noMarkers,
          points: C.ks.map(function (k, i) { return [k, C.table2[d.arm][BKEY[b]][i]]; }) };
      });
    }
    function ticksFor(b) {
      var ymax = YMAX[b], step = ymax > 20 ? 10 : 5, out = [];
      for (var t = 0; t <= ymax; t += step) out.push(t);
      return out;
    }
    var rerender5 = responsive(host, function (W) {
      var series = seriesFor(bench), ymax = YMAX[bench], yTicks = ticksFor(bench);
      chart = lineChart(host, W, {
        series: series, log2: true, xDomain: [1, 64], yDomain: [0, ymax], yTicks: yTicks,
        xTicks: [1, 2, 4, 8, 16, 32, 64], xTicksLinear: [1, 16, 32, 48, 64], xLabel: 'samples k (log scale)', yLabel: 'pass@k (%)', xName: 'k =',
        markers: true, markerAt: [1, 2, 4, 8, 16, 32, 64], rightPad: 178, height: 320,
        aria: 'pass@k curves for models trained on all samples, only incorrect strategic samples, and IID samples',
        animate: !drawn
      });
      drawn = true;
    });
    onKScale(rerender5);
    segmented(fig, 'data-bench', function (b) {
      if (b === bench) return;
      bench = b;
      if (!chart) { rerender5(); return; }   // not drawn yet: draw it for the new benchmark
      chart.update(seriesFor(b), [0, YMAX[b]], ticksFor(b), 700);
    });
  })();

  // ── Figure 6: self vs teacher ────────────────────────────────────────────

  (function fig6() {
    var fig = document.getElementById('fig-teacher');
    if (!fig) return;
    var host = fig.querySelector('.cd-chart');
    // Held-out frontier macro [p@1, p@8, p@64]. Qwen3-4B: Table 3 (16k cap), teacher
    // Qwen3-235B-A22B. Nemotron-3-Nano-4B: Table 12, teacher Nemotron-3-Super-120B-A12B.
    var DATA = {
      qwen: { teacher: '235B', xmax: 25, rows: [
        { name: 'IID-4', s: 'iid', self: [0.2, 1.3, 5.8], teach: [0.7, 4.5, 13.4] },
        { name: 'GROOT-4', s: 'groot', self: [2.1, 9.3, 20.1], teach: [1.6, 8.0, 17.8] },
        { name: 'VS-4', s: 'vs', self: [2.6, 10.6, 22.8], teach: [1.5, 7.8, 17.7] } ] },
      n3n: { teacher: '120B', xmax: 30, rows: [
        { name: 'IID-4', s: 'iid', self: [0.3, 2.1, 8.8], teach: [0.5, 3.5, 13.8] },
        { name: 'GROOT-4', s: 'groot', self: [1.1, 6.4, 19.9], teach: [2.2, 11.1, 25.7] },
        { name: 'VS-4', s: 'vs', self: [1.6, 8.2, 20.8], teach: [2.6, 12.3, 27.4] } ] }
    };
    var model = 'qwen', drawn6 = false, replay6 = false;
    var rerender6 = responsive(host, function (W) {
      var moves = [], rows = DATA[model].rows;
      legend(host, [{ label: 'self-generated (4B)', color: COLOR.ink2 }, { label: 'teacher-generated (' + DATA[model].teacher + ')', color: COLOR.ink2, kind: 'ring' }]);
      var L = W < 600 ? 76 : 100, R = 24, rowH = 50, top = 4, H = top + rows.length * rowH + 30, xmax = DATA[model].xmax;
      var sx = function (v) { return L + v / xmax * (W - L - R); };
      var root = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': 'Held-out pass@64 for self-generated and teacher-generated data' }, host);
      var tk = []; for (var q = 0; q <= xmax; q += 5) tk.push(q);
      xAxis(svg('g', null, root), sx, tk, top, H - 26, 'pass@64 (%)', L - 10);
      rows.forEach(function (r, i) {
        var y = top + i * rowH + rowH / 2 + 4, c = COLOR[r.s], a = sx(r.self[2]), b = sx(r.teach[2]);
        svg('text', { x: L - 10, y: y + 5, 'text-anchor': 'end', class: 'cd-lab' }, root, r.name);
        var ln = svg('line', { x1: Math.min(a, b), x2: Math.max(a, b), y1: y, y2: y, stroke: c, 'stroke-width': 2, opacity: 0.45 }, root);
        svg('circle', { cx: a, cy: y, r: 6.5, fill: c }, root);
        var ring = svg('circle', { cx: b, cy: y, r: 6.5, fill: '#fff', stroke: c, 'stroke-width': 2 }, root);
        var close = Math.abs(a - b) < 44;
        svg('text', { x: a, y: y - 12, 'text-anchor': 'middle', class: 'cd-val' }, root, r.self[2].toFixed(1));
        var tv = svg('text', { x: b, y: close ? y + 23 : y - 12, 'text-anchor': 'middle', class: 'cd-lab-muted' }, root, r.teach[2].toFixed(1));
        moves.push({ ln: ln, ring: ring, tv: tv, a: a, b: b, i: i });
        var hit = svg('rect', { x: 0, y: y - rowH / 2, width: W, height: rowH, fill: 'transparent' }, root);
        hover(hit, function () {
          return sw(c) + '<b>' + r.name + '</b> (pass@1 / 8 / 64)<br>self: ' + r.self.join(' / ') + '<br>teacher: ' + r.teach.join(' / ');
        });
      });
      if ((!drawn6 || replay6) && !REDUCED) {
        moves.forEach(function (m) {
          m.ring.setAttribute('cx', m.a); m.ring.style.opacity = 0; m.ln.setAttribute('x1', m.a); m.ln.setAttribute('x2', m.a); m.tv.style.opacity = 0;
        });
        (replay6 ? function (f) { f(); } : function (f) { whenSeen(host, f); })(function () {
          moves.forEach(function (m) {
            var delay = (replay6 ? 0 : 300) + m.i * 350;
            // the teacher's point leaves the student's and slides to where teacher data lands
            tween(800, delay, function (t) {
              var x = m.a + (m.b - m.a) * t;
              m.ring.setAttribute('cx', x);
              m.ring.style.opacity = Math.min(1, t * 5);
              m.ln.setAttribute('x1', Math.min(x, m.a)); m.ln.setAttribute('x2', Math.max(x, m.a));
            });
            fadeIn(m.tv, delay + 700);
          });
        });
      }
      drawn6 = true;
    });
    segmented(fig, 'data-model', function (m) { if (m === model) return; model = m; replay6 = true; rerender6(); replay6 = false; });
  })();

  // ── Figure 7: RL curves ──────────────────────────────────────────────────

  (function fig7() {
    var fig = document.getElementById('fig-rl'), FD = window.CD_FIGDATA;
    if (!fig || !FD) return;
    var order = ['groot', 'vs', 'iidhot', 'iid64', 'iid', 'base'], model = 'qwen', drawn7 = false;
    var CFG = {
      qwen: { data: FD.rl, xDomain: [8, 84], xTicks: [20, 40, 60, 80], yDomain: [6, 24], yTicks: [8, 12, 16, 20, 24], yMinor: 1 },
      n3n: { data: FD.rl_n3n, xDomain: [4, 76], xTicks: [20, 40, 60], yDomain: [0, 55], yTicks: [0, 10, 20, 30, 40, 50], yMinor: 5 }
    };
    var host = fig.querySelector('.cd-chart'), note = fig.querySelector('.cd-gap-note');
    var rerender = responsive(host, function (W) {
      var cfg = CFG[model];
      var series = (cfg.data || []).slice().sort(function (a, b) { return order.indexOf(a.id) - order.indexOf(b.id); })
        .map(function (s) { return { id: s.id, name: s.name, points: s.points, band: s.band, dash: s.id === 'base' ? '5 4' : null }; });
      // Largest head start. For each level reached by a strategic run (GROOT-4 / VS-4)
      // and an IID run, find where each curve crosses that level (interpolated between
      // evaluations), and keep the widest gap whose connecting segment no other curve crosses.
      function crossAt(sr, y) {
        var p = sr.points;
        if (p[0][1] >= y - 1e-9) return p[0][0];
        for (var i = 1; i < p.length; i++) if (p[i][1] >= y - 1e-9) {
          var a = p[i - 1], b = p[i];
          return a[0] + (b[0] - a[0]) * (y - a[1]) / ((b[1] - a[1]) || 1);
        }
        return null;
      }
      function valAt(sr, x) {
        var p = sr.points;
        if (x <= p[0][0]) return p[0][1];
        for (var i = 1; i < p.length; i++) if (p[i][0] >= x) {
          var a = p[i - 1], b = p[i];
          return a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]);
        }
        return p[p.length - 1][1];
      }
      var strat = series.filter(function (s) { return s.id === 'groot' || s.id === 'vs'; });
      var iids = series.filter(function (s) { return /^iid/.test(s.id); });
      // Only whole-number levels, so the marked pass@8 reads cleanly (e.g. 19%, not 18.8%)
      var levels = [], lo = Infinity, hi = -Infinity;
      series.forEach(function (s) { s.points.forEach(function (p) { lo = Math.min(lo, p[1]); hi = Math.max(hi, p[1]); }); });
      for (var lv = Math.ceil(lo); lv <= Math.floor(hi); lv++) levels.push(lv);
      var best = null;
      levels.forEach(function (y) {
        strat.forEach(function (sa) {
          var a = crossAt(sa, y);
          if (a === null) return;
          iids.forEach(function (ib) {
            var b = crossAt(ib, y);
            if (b === null || b <= a + 4) return;
            var clear = series.every(function (o) {
              if (o === sa || o === ib) return true;
              var c = crossAt(o, y);
              return c === null || c <= a || c >= b;
            });
            if (!clear) return;
            if (!best || b - a > best.gap) best = { y: y, gap: b - a, a: { s: sa, x: a }, b: { s: ib, x: b } };
          });
        });
      });
      lineChart(host, W, {
        series: series, xDomain: cfg.xDomain, yDomain: cfg.yDomain, yTicks: cfg.yTicks,
        xTicks: cfg.xTicks, xMinor: 10, yMinor: cfg.yMinor, xLabel: 'RL step', yLabel: 'val. pass@8 (%)', xName: 'step', smooth: true,
        rightPad: 128, aria: 'Best-so-far validation pass@8 during RL from each fine-tuned model', animate: !drawn7 ? true : series.map(function (s) { return s.id; }),
        immediate: drawn7,
        annotate: function (root, sx, sy, W, H, M) {
          if (!best) { if (note) note.innerHTML = ''; return; }
          var RED = '#c0392b', y = sy(best.y), xa = sx(best.a.x), xb = sx(best.b.x), steps = Math.round(best.gap);
          var g = svg('g', { class: 'cd-gap', 'pointer-events': 'none' }, root);
          // Drawn early by lineChart, so lift it above the curves once they exist
          setTimeout(function () { root.appendChild(g); }, 0);
          var defsA = svg('defs', null, g), mk = svg('marker', { id: 'cd-gap-ah', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto-start-reverse' }, defsA);
          svg('path', { d: 'M0,1 L10,5 L0,9 z', fill: RED }, mk);
          // Faint guide back to the y axis, with the level marked there
          svg('line', { x1: M.l, x2: xa, y1: y, y2: y, stroke: RED, 'stroke-width': 1, 'stroke-dasharray': '2 3', opacity: 0.5 }, g);
          svg('text', { x: M.l - 8, y: y + 4, 'text-anchor': 'end', 'font-size': 12, 'font-weight': 600, fill: RED, stroke: '#fff', 'stroke-width': 4, 'paint-order': 'stroke' }, g, String(best.y));
          // Arrow between the two crossings
          svg('line', { x1: xa + 6, x2: xb - 6, y1: y, y2: y, stroke: RED, 'stroke-width': 1.6, 'marker-start': 'url(#cd-gap-ah)', 'marker-end': 'url(#cd-gap-ah)' }, g);
          [[xa, best.a.s], [xb, best.b.s]].forEach(function (e) {
            svg('circle', { cx: e[0], cy: y, r: 4.6, fill: '#fff', stroke: COLOR[e[1].id], 'stroke-width': 2.2 }, g);
          });
          // Label sits on the arrow itself, like a dimension line: |<-- 41 steps sooner -->|
          var label = steps + ' steps sooner', lw = label.length * 6.6 + 14, lh = 18, mx = (xa + xb) / 2;
          if (lw > (xb - xa) - 24) label = steps + ' steps', lw = label.length * 6.6 + 14;
          svg('rect', { x: mx - lw / 2, y: y - lh / 2, width: lw, height: lh, rx: 9, fill: '#fff', stroke: RED, 'stroke-width': 1 }, g);
          svg('text', { x: mx, y: y + 4.3, 'text-anchor': 'middle', 'font-size': 12.5, 'font-weight': 600, fill: RED }, g, label);
          if (note) note.innerHTML = esc(best.a.s.name) + ' reaches ' + best.y + '% validation pass@8 about <b>' + steps + ' RL steps</b> before ' + esc(best.b.s.name) + '.';
          if (!drawn7 && !REDUCED) { g.style.opacity = 0; whenSeen(host, function () { fadeIn(g, 2600); }); }
        }
      });
      drawn7 = true;
    });
        segmented(fig, 'data-model', function (m) { if (m === model) return; model = m; rerender(); });
  })();

  // ── Figure 8: before and after RL, one panel per starting point ─────────

  (function figPrePost() {
    var fig = document.getElementById('fig-prepost');
    if (!fig) return;
    var host = fig.querySelector('.cd-chart'), bench = 'macro', model = 'qwen', drawn = false, replay = false;
    // Frontier [pass@1, pass@8, pass@64] before and after RL. Qwen3-4B: Table 6.
    // Nemotron-3-Nano-4B: Table 8 (frontier defined on Nemotron's own base model).
    var N3N = {
      'Base':    { s: 'base',  before: { macro: [0.3, 2.0, 9.8],  lcb: [0.5, 3.5, 15.7], cobalt: [0.8, 5.3, 22.4] },  after: { macro: [6.1, 17.8, 30.3], lcb: [7.0, 20.3, 35.7], cobalt: [11.7, 35.9, 57.4] } },
      'IID-4':   { s: 'iid',   before: { macro: [0.3, 2.1, 8.8],  lcb: [0.5, 3.2, 12.7], cobalt: [0.9, 6.0, 23.0] },  after: { macro: [7.5, 20.9, 33.3], lcb: [8.9, 24.5, 40.3], cobalt: [13.0, 37.0, 57.4] } },
      'GROOT-4': { s: 'groot', before: { macro: [1.1, 6.4, 19.9], lcb: [0.9, 6.1, 23.5], cobalt: [1.5, 9.5, 29.8] },  after: { macro: [6.5, 19.1, 31.0], lcb: [7.1, 21.9, 36.6], cobalt: [12.2, 36.3, 57.6] } },
      'VS-4':    { s: 'vs',    before: { macro: [1.6, 8.2, 20.8], lcb: [1.3, 7.7, 22.9], cobalt: [2.1, 12.5, 34.2] }, after: { macro: [7.0, 20.4, 33.6], lcb: [8.2, 24.2, 41.3], cobalt: [12.3, 35.1, 56.8] } }
    };
    var QWEN = {
      'Base':    { s: 'base',  before: { macro: [0.2, 0.9, 5.2],  lcb: [0.2, 1.3, 7.4], cobalt: [0.5, 3.6, 21.9] }, after: { macro: [0.8, 4.1, 11.4], lcb: [1.1, 5.9, 15.3], cobalt: [4.5, 13.9, 29.3] } },
      'IID-4':   { s: 'iid',   before: { macro: [0.2, 1.1, 5.2],  lcb: [0.2, 1.5, 7.0], cobalt: [0.7, 4.9, 19.8] }, after: { macro: [0.7, 4.0, 10.9], lcb: [1.1, 6.0, 15.4], cobalt: [5.5, 17.3, 36.6] } },
      'GROOT-4': { s: 'groot', before: { macro: [1.4, 6.7, 15.5], lcb: [1.5, 8.0, 19.5], cobalt: [3.5, 14.1, 30.5] }, after: { macro: [2.0, 8.1, 18.0], lcb: [2.2, 9.5, 22.2], cobalt: [7.2, 20.9, 39.0] } },
      'VS-4':    { s: 'vs',    before: { macro: [1.8, 7.6, 17.5], lcb: [2.0, 9.6, 23.1], cobalt: [4.1, 14.3, 30.2] }, after: { macro: [1.7, 7.2, 16.0], lcb: [2.1, 8.9, 20.5], cobalt: [6.2, 19.4, 37.8] } }
    };
    var ARMS = ['Base', 'IID-4', 'GROOT-4', 'VS-4'];
    function T() { return model === 'qwen' ? QWEN : N3N; }
    // Full curves when available: pre-RL from CD_PASSK, post-RL from CD_RLCURVES
    // Full per-k curves: pre-RL from CD_PASSK (Qwen) or CD_N3N_PRE (Nemotron), post-RL
    // means from CD_RLCURVES; falls back to the paper's k = 1, 8, 64 values.
    function curve(arm, when) {
      var RLC = window.CD_RLCURVES && window.CD_RLCURVES[model];
      var C = when === 'before'
        ? (model === 'qwen' ? window.CD_PASSK && window.CD_PASSK.table2[arm] : window.CD_N3N_PRE && window.CD_N3N_PRE[arm])
        : RLC && RLC[arm];
      if (C && C[bench]) {
        var ys = C[bench].mean || C[bench];
        return ys.map(function (y, i) { return [i + 1, y]; });
      }
      var v = T()[arm][when][bench];
      return [[1, v[0]], [8, v[1]], [64, v[2]]];
    }

    var rerender = responsive(host, function (W) {
      legend(host, [{ label: 'before RL', color: COLOR.ink2, kind: 'dash' }, { label: 'after RL', color: COLOR.ink2, kind: 'line' }]);
      var cols = W < 600 ? 2 : 4, rows = Math.ceil(ARMS.length / cols);
      var gapX = 22, padL = 34, padR = 12, pw = (W - padL - padR - gapX * (cols - 1)) / cols, ph = 170, titleH = 34, axH = 40;
      var H = rows * (titleH + ph + axH) + (rows - 1) * 14;
      var YMAX = { qwen: { macro: 20, lcb: 25, ojbench: 15, cobalt: 45 }, n3n: { macro: 40, lcb: 45, ojbench: 35, cobalt: 60 } };
      var ymax = YMAX[model][bench], yStep = ymax >= 40 ? 20 : ymax > 15 ? 10 : 5, yTicks = [];
      for (var yt = 0; yt <= ymax; yt += yStep) yTicks.push(yt);
      var root = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': 'pass@k before and after RL for each starting model' }, host);
      var defsEl = svg('defs', null, root), sweeps = [];
      var lp = svg('pattern', { id: 'cd-loss', patternUnits: 'userSpaceOnUse', width: 4, height: 4, patternTransform: 'rotate(45)' }, defsEl);
      svg('line', { x1: 0, y1: 0, x2: 0, y2: 4, stroke: '#9a9a9a', 'stroke-width': 1 }, lp);
      ARMS.forEach(function (arm, j) {
        var c = COLOR[T()[arm].s], col = j % cols, row = Math.floor(j / cols);
        var x0 = padL + col * (pw + gapX), y0 = row * (titleH + ph + axH + 14) + titleH;
        var sx = KSCALE === 'log' ? function (k) { return x0 + Math.log2(k) / 6 * pw; } : function (k) { return x0 + (k - 1) / 63 * pw; };
        var sy = function (v) { return y0 + ph - v / ymax * ph; };
        var pre = curve(arm, 'before'), post = curve(arm, 'after');
        var g = svg('g', null, root);
        // Title: name and pass@64 change
        var tt = svg('text', { x: x0, y: y0 - 16, class: 'cd-lab', 'font-weight': 'bold', fill: c }, g, arm);
        var a64 = pre[pre.length - 1][1], b64 = post[post.length - 1][1];
        svg('text', { x: x0, y: y0 - 2, class: 'cd-lab-muted' }, g, 'pass@64 ' + a64.toFixed(1) + ' → ' + b64.toFixed(1));
        yTicks.forEach(function (t) {
          svg('line', { x1: x0, x2: x0 + pw, y1: sy(t), y2: sy(t), class: 'cd-gridline' }, g);
          if (col === 0) svg('text', { x: x0 - 6, y: sy(t) + 4, 'text-anchor': 'end', class: 'cd-lab-muted' }, g, t);
        });
        (KSCALE === 'log' ? [1, 2, 4, 8, 16, 32, 64] : [1, 16, 32, 48, 64]).forEach(function (k) { svg('text', { x: sx(k), y: y0 + ph + 16, 'text-anchor': 'middle', class: 'cd-lab-muted' }, g, k); });
        svg('line', { x1: x0, x2: x0 + pw, y1: y0 + ph, y2: y0 + ph, stroke: '#bbbbbb' }, g);
        if (col === 0) svg('text', { x: padL + (W - padL - padR) / 2, y: y0 + ph + 36, 'text-anchor': 'middle' }, svg('g', { class: 'cd-ax' }, g), KSCALE === 'log' ? 'samples k (log scale)' : 'samples k');
        // Gain area between the curves (sampled at the post-RL ks), then the two lines
        function lineD(pts) { return pts.map(function (p, i) { return (i ? 'L' : 'M') + sx(p[0]).toFixed(1) + ',' + sy(p[1]).toFixed(1); }).join(' '); }
        function interp(pts, k) {
          for (var i = 1; i < pts.length; i++) if (pts[i][0] >= k) {
            var a = pts[i - 1], b = pts[i], t = (Math.log2(k) - Math.log2(a[0])) / (Math.log2(b[0]) - Math.log2(a[0]) || 1);
            return a[1] + (b[1] - a[1]) * t;
          }
          return pts[pts.length - 1][1];
        }
        var cp = svg('clipPath', { id: 'cd-pp-' + j + '-' + Math.random().toString(36).slice(2) }, defsEl);
        var clipRect = svg('rect', { x: x0 - 6, y: y0 - 8, width: pw + 12, height: ph + 16 }, cp);
        var gainG = svg('g', { 'clip-path': 'url(#' + cp.id + ')' }, g);
        // After-RL: ± one standard error across the three RL seeds. With three seeds,
        // min, max and mean determine every seed: the third is 3*mean - min - max.
        var RC = window.CD_RLCURVES && window.CD_RLCURVES[model] && window.CD_RLCURVES[model][arm] && window.CD_RLCURVES[model][arm][bench];
        var sem = null;
        if (RC && RC.min) {
          sem = RC.mean.map(function (m, i) {
            var a = RC.min[i], b = RC.max[i], c3 = 3 * m - a - b;
            var v = ((a - m) * (a - m) + (b - m) * (b - m) + (c3 - m) * (c3 - m)) / 2;
            return Math.sqrt(v / 3);
          });
          var up = RC.mean.map(function (m, i) { return sx(i + 1).toFixed(1) + ',' + sy(m + sem[i]).toFixed(1); });
          var dn = RC.mean.map(function (m, i) { return sx(i + 1).toFixed(1) + ',' + sy(Math.max(0, m - sem[i])).toFixed(1); }).reverse();
          svg('polygon', { points: up.concat(dn).join(' '), fill: c, opacity: 0.2 }, gainG);
        }
        svg('path', { d: lineD(pre), fill: 'none', stroke: c, 'stroke-width': 1.6, 'stroke-dasharray': '4 3', opacity: 0.8 }, g);
        var RC = model === 'qwen' && window.CD_RLCURVES && window.CD_RLCURVES[arm] && window.CD_RLCURVES[arm][bench];
        svg('path', { d: lineD(post), fill: 'none', stroke: c, 'stroke-width': 2.2 }, gainG);
        // Markers at k = 1, 4, 8, 32, 64 where the full curves exist (else the paper's 1, 8, 64)
        var mk = post.length > 3 ? [1, 4, 8, 32, 64] : [1, 8, 64];
        mk.forEach(function (k) { marker(gainG, T()[arm].s, sx(k), sy(interp(post, k)), 3.4); });
        (pre.length > 3 ? [1, 4, 8, 32, 64] : [1, 8, 64]).forEach(function (k) {
          svg('circle', { cx: sx(k), cy: sy(interp(pre, k)), r: 2.6, fill: '#fff', stroke: c, 'stroke-width': 1.3 }, g);
        });
        sweeps.push({ rect: clipRect, x0: x0 - 6, w: pw + 12, j: j });
        // Hover: values at the nearest k
        var hit = svg('rect', { x: x0, y: y0, width: pw, height: ph, fill: 'transparent' }, g);
        hit.addEventListener('mousemove', function (e) {
          var box = root.getBoundingClientRect(), px = (e.clientX - box.left) / box.width * W;
          var f = (px - x0) / pw, k = Math.max(1, Math.min(64, Math.round(KSCALE === 'log' ? Math.pow(2, f * 6) : 1 + f * 63)));
          var se = sem ? ' ± ' + sem[k - 1].toFixed(1) : '';
          showTip(sw(c) + '<b>' + arm + '</b> · pass@' + k + '<br>before RL ' + interp(pre, k).toFixed(1) + '<br>after RL ' + interp(post, k).toFixed(1) + se, e);
        });
        hit.addEventListener('mouseleave', hideTip);
      });
      if ((!drawn || replay) && !REDUCED) {
        sweeps.forEach(function (s) { s.rect.setAttribute('width', 0); });
        var go = function () { sweeps.forEach(function (s) { tween(900, s.j * 250, function (t) { s.rect.setAttribute('width', s.w * t); }); }); };
        if (replay) go(); else whenSeen(host, go);
      }
    });
    drawn = true;
    segmented(fig, 'data-bench', function (b) { bench = b; replay = true; rerender(); replay = false; });
    onKScale(function () { rerender(); });
    segmented(fig, 'data-model', function (m) { model = m; replay = true; rerender(); replay = false; if (tSlider) tSlider.dataset.set = ''; drawTTT(); });

    // ── RL steps to reach a validation pass@8 threshold ──
    var ttt = fig.querySelector('.cd-ttt'), tHost = ttt && ttt.querySelector('.cd-chart');
    var tSlider = ttt && ttt.querySelector('input'), tOut = ttt && ttt.querySelector('.cd-slider span');
    var ORDER = ['base', 'iid', 'iid64', 'iidhot', 'groot', 'vs'];
    function rlSeries() {
      var FD = window.CD_FIGDATA || {};
      var list = model === 'qwen' ? FD.rl : FD.rl_n3n;
      return (list || []).slice().sort(function (a, b) { return ORDER.indexOf(a.id) - ORDER.indexOf(b.id); });
    }
    function drawTTT() {
      if (!ttt) return;
      var series = rlSeries();
      ttt.hidden = !series.length;
      if (!series.length) return;
      var lo = Infinity, hi = -Infinity;
      series.forEach(function (sr) { sr.points.forEach(function (p) { lo = Math.min(lo, p[1]); hi = Math.max(hi, p[1]); }); });
      tSlider.min = Math.floor(lo); tSlider.max = Math.floor(hi * 2) / 2; tSlider.step = 0.5;
      if (!tSlider.dataset.set || +tSlider.value > +tSlider.max) { tSlider.value = model === 'qwen' ? 18 : 40; tSlider.dataset.set = 1; }
      tHost.innerHTML = '';
      var th = parseFloat(tSlider.value);
      tOut.textContent = th.toFixed(1) + '%';
      var mins = ttt.querySelectorAll('.cd-slider .end');
      if (mins.length === 2) { mins[0].textContent = (+tSlider.min).toFixed(0) + '%'; mins[1].textContent = (+tSlider.max).toFixed(0) + '%'; }
      var W = widthOf(tHost), L = W < 600 ? 110 : 130, R = 110, rowH = 28, H = series.length * rowH + 30;
      var steps = series[0].points.map(function (p) { return p[0]; }), maxStep = steps[steps.length - 1];
      var sx = function (st) { return L + st / maxStep * (W - L - R); };
      var root = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': 'RL steps needed to reach the chosen validation pass@8' }, tHost);
      var ticks = []; for (var t = 0; t <= maxStep; t += 20) ticks.push(t);
      xAxis(svg('g', null, root), sx, ticks, 0, H - 26, 'RL steps', L - 10);
      svg('line', { x1: L, x2: sx(maxStep), y1: H - 26, y2: H - 26, stroke: '#9a9a9a', 'stroke-width': 1 }, root);
      series.forEach(function (sr, i) {
        var y = i * rowH, c = COLOR[sr.id], hit = null;
        for (var k = 0; k < sr.points.length; k++) if (sr.points[k][1] >= th) { hit = sr.points[k][0]; break; }
        svg('text', { x: L - 10, y: y + rowH / 2 + 4, 'text-anchor': 'end', class: 'cd-lab' }, root, sr.name);
        if (hit === null) {
          svg('rect', { x: L, y: y + 7, width: sx(maxStep) - L, height: rowH - 14, fill: 'url(#cd-loss-t)', stroke: '#bbbbbb', 'stroke-width': 0.8 }, root);
          svg('text', { x: sx(maxStep) + 6, y: y + rowH / 2 + 4, class: 'cd-lab-muted' }, root, 'not reached');
        } else if (hit === steps[0]) {
          marker(root, sr.id, L + 5, y + rowH / 2, 4.5);
          svg('text', { x: L + 16, y: y + rowH / 2 + 4, class: 'cd-val' }, root, 'already there at the start');
        } else {
          svg('rect', { x: L, y: y + 7, width: sx(hit) - L, height: rowH - 14, fill: c }, root);
          svg('text', { x: sx(hit) + 6, y: y + rowH / 2 + 4, class: 'cd-val' }, root, hit + ' steps');
        }
      });
      var d = svg('defs', null, root), lp = svg('pattern', { id: 'cd-loss-t', patternUnits: 'userSpaceOnUse', width: 4, height: 4, patternTransform: 'rotate(45)' }, d);
      svg('line', { x1: 0, y1: 0, x2: 0, y2: 4, stroke: '#c4c4c4', 'stroke-width': 1 }, lp);
    }
    if (tSlider) tSlider.addEventListener('input', drawTTT);
    drawTTT();
    var tttTimer; window.addEventListener('resize', function () { clearTimeout(tttTimer); tttTimer = setTimeout(drawTTT, 150); });
  })();

  // ── Figure 9: RSA before → after ─────────────────────────────────────────

  (function fig8() {
    var fig = document.getElementById('fig-rsa');
    if (!fig) return;
    var host = fig.querySelector('.cd-chart'), bench = 0, drawn8 = false, replay = false;
    // Qwen3-4B-Instruct, Table 4: frontier pass@1 before -> after, [Cobalt, LCB, OJBench]
    var rows = [
      { name: 'Base', s: 'base', v: [[0.8, 3.1], [0.5, 2.3], [0.1, 0.8]] },
      { name: 'IID-4', s: 'iid', v: [[0.9, 3.8], [0.6, 2.1], [0.1, 0.7]] },
      { name: 'IID-64 (T=1.5)', s: 'iidhot', v: [[1.4, 7.4], [0.6, 4.0], [0.2, 1.8]] },
      { name: 'GROOT-4', s: 'groot', v: [[3.5, 10.4], [2.1, 7.0], [1.5, 4.5]] },
      { name: 'VS-4', s: 'vs', v: [[4.2, 10.6], [2.3, 7.9], [1.5, 5.3]] }
    ];
    // Held-out is the macro-average (mean) of LCB and OJBench, as elsewhere on the page
    rows.forEach(function (r) { r.v[3] = [0, 1].map(function (j) { return Math.round((r.v[1][j] + r.v[2][j]) * 5 + 1e-9) / 10; }); });
    var rerender = responsive(host, function (W) {
      var xmax = [12, 10, 6, 8][bench], step = [2, 2, 1, 2][bench], ticks = [];
      for (var t = 0; t <= xmax; t += step) ticks.push(t);
      var L = W < 600 ? 100 : 120, R = 70, rowH = 38, top = 4, H = top + rows.length * rowH + 30;
      var sx = function (v) { return L + v / xmax * (W - L - R); };
      var root = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': 'RSA pass@1 before and after aggregation' }, host);
      xAxis(svg('g', null, root), sx, ticks, top, H - 26, 'pass@1 (%)', L - 10);
      rows.forEach(function (r, i) {
        var y = top + i * rowH + rowH / 2 + 2, c = COLOR[r.s], v = r.v[bench];
        svg('text', { x: L - 10, y: y + 5, 'text-anchor': 'end', class: 'cd-lab' }, root, r.name);
        var ln = svg('line', { x1: sx(v[0]), x2: sx(v[1]), y1: y, y2: y, stroke: c, 'stroke-width': 2 }, root);
        svg('circle', { cx: sx(v[0]), cy: y, r: 5.5, fill: '#fff', stroke: c, 'stroke-width': 2 }, root);
        var end = svg('circle', { cx: sx(v[1]), cy: y, r: 5.5, fill: c }, root);
        var lab = svg('text', { x: sx(v[1]) + 10, y: y + 5, class: 'cd-val' }, root, v[0].toFixed(1) + ' → ' + v[1].toFixed(1));
        if ((!drawn8 || replay) && !REDUCED) {
          var x0 = sx(v[0]), x1 = sx(v[1]);
          ln.setAttribute('x2', x0); end.setAttribute('cx', x0); lab.style.opacity = 0;
          var go = function () {
            tween(750, i * 120, function (t) { var x = x0 + (x1 - x0) * t; ln.setAttribute('x2', x); end.setAttribute('cx', x); });
            fadeIn(lab, i * 120 + 650);
          };
          if (replay) go(); else whenSeen(host, go);
        }
        var hit = svg('rect', { x: 0, y: y - rowH / 2, width: W, height: rowH, fill: 'transparent' }, root);
        hover(hit, function () {
          return sw(c) + '<b>' + r.name + '</b><br>' + ['Cobalt', 'LiveCodeBench', 'OJBench', 'Held-out'][bench] + ' frontier pass@1<br>' + v[0] + ' → ' + v[1];
        });
      });
    });
    drawn8 = true;
    segmented(fig, 'data-bench', function (b) { bench = parseInt(b, 10); replay = true; rerender(); replay = false; });
  })();

  // ── Figure 9: NCP plans ──────────────────────────────────────────────────

  (function fig9() {
    var fig = document.getElementById('fig-ncp'), EX = window.CD_EXAMPLES;
    if (!fig || !EX) return;
    var N = EX.ncp, host = fig.querySelector('.cd-chart');
    var slider = fig.querySelector('input[type="range"]'), sliderVal = fig.querySelector('.cd-slider span');
    var arms = [
      { id: 'groot', name: 'GROOT', a: N.arms.groot },
      { id: 'vs', name: 'VS', a: N.arms.vs },
      { id: 'iid', name: 'IID', a: N.arms.iid }
    ];
    var all = [];
    arms.forEach(function (r) { all = all.concat(r.a.scores); });
    var lo = Math.floor(Math.min.apply(null, all)) - 1, hi = Math.ceil(Math.max.apply(null, all)) + 1;
    var update = function () {};

    responsive(host, function (W) {
      var narrow = W < 600, L = narrow ? 54 : 64, R = narrow ? 58 : 70, rowH = 62, top = 6, H = top + arms.length * rowH + 30;
      var sx = function (v) { return L + (v - lo) / (hi - lo) * (W - L - R); };
      var root = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': 'Perplexity improvement of 32 plans per sampler, with an adjustable bar' }, host);
      var ticks = [];
      for (var t = Math.ceil(lo / 2) * 2; t <= hi; t += (narrow ? 4 : 2)) ticks.push(t);
      xAxis(svg('g', null, root), sx, ticks, top, H - 26, '%', L - 10);
      var shade = svg('rect', { y: top, height: H - 26 - top, fill: COLOR.ink, opacity: 0.04 }, root);
      var bar = svg('line', { y1: top, y2: H - 26, stroke: COLOR.ink, 'stroke-width': 1.2, 'stroke-dasharray': '4 3' }, root);
      var rowEls = arms.map(function (r, i) {
        var cy = top + i * rowH + rowH / 2, c = COLOR[r.id];
        svg('text', { x: L - 10, y: cy + 5, 'text-anchor': 'end', class: 'cd-lab' }, root, r.name);
        var sorted = r.a.scores.slice().sort(function (a, b) { return a - b; }), placed = [], dots = [];
        sorted.forEach(function (v) {
          var x = sx(v), off = 0, tries = [0, -1, 1, -2, 2, -3, 3];
          for (var q = 0; q < tries.length; q++) {
            off = tries[q] * 8;
            if (!placed.some(function (p) { return Math.abs(p.x - x) < 8 && Math.abs(p.y - off) < 8; })) break;
          }
          placed.push({ x: x, y: off });
          var best = Math.abs(v - r.a.best_pct) < 0.006;
          var dot = svg('circle', { cx: x, cy: cy + off, r: best ? 5.5 : 4, stroke: c, 'stroke-width': best ? 2.2 : 1.3, fill: '#fff' }, root);
          if (best) svg('circle', { cx: x, cy: cy + off, r: 9, fill: 'none', stroke: c, 'stroke-width': 1 }, root);
          hover(dot, function () {
            return sw(c) + '<b>' + r.name + ' plan</b>: ' + (v >= 0 ? '+' : '') + v.toFixed(1) + '%' + (best ? '<br>best of 32' : '');
          });
          dots.push({ el: dot, v: v });
        });
        return { dots: dots, c: c, count: svg('text', { x: W - R + 12, y: cy + 5, class: 'cd-val' }, root) };
      });
      update = function () {
        var th = parseFloat(slider.value);
        sliderVal.textContent = th + '%';
        bar.setAttribute('x1', sx(th)); bar.setAttribute('x2', sx(th));
        shade.setAttribute('x', sx(th)); shade.setAttribute('width', Math.max(0, W - R - sx(th)));
        rowEls.forEach(function (row) {
          var n = 0;
          row.dots.forEach(function (d) { var on = d.v >= th; if (on) n++; d.el.setAttribute('fill', on ? row.c : '#fff'); });
          row.count.textContent = n + '/32';
        });
      };
      update();
    });
    slider.addEventListener('input', function () { update(); });
  })();

  // ── Figure 10: NCP coverage ──────────────────────────────────────────────

  (function fig10() {
    var fig = document.getElementById('fig-coverage'), FD = window.CD_FIGDATA;
    if (!fig || !FD) return;
    var order = ['vs', 'groot', 'iid', 'base'], model = 'qwen', drawn10 = false;
    // Qwen stops at k = 32 like the paper: its trained arms have ~64 draws per section, so
    // near k = 64 sections drop out of the estimate. Nemotron's design fixes 64 per section.
    var CFG = {
      qwen: { data: FD.coverage, kmax: 32, yDomain: [0, 4.5], yTicks: [0, 1, 2, 3, 4],
              xTicks: [1, 2, 4, 8, 16, 32], xTicksLinear: [1, 8, 16, 24, 32], dec: 2 },
      n3n: { data: FD.coverage_n3n, kmax: 64, yDomain: [0, 25], yTicks: [0, 5, 10, 15, 20, 25],
             xTicks: [1, 2, 4, 8, 16, 32, 64], xTicksLinear: [1, 16, 32, 48, 64], dec: 1 }
    };
    var host = fig.querySelector('.cd-chart');
    var rerender10 = responsive(host, function (W) {
      var cfg = CFG[model];
      var keep = function (arr) { return arr && arr.filter(function (p) { return p[0] <= cfg.kmax; }); };
      var series = (cfg.data || []).map(function (s) {
        return { id: s.id, name: s.name.replace('-16', ''), points: keep(s.points), band: keep(s.band), dash: s.id === 'base' ? '5 4' : null };
      }).sort(function (a, b) { return order.indexOf(a.id) - order.indexOf(b.id); });
      lineChart(host, W, {
        series: series, log2: true, xDomain: [1, cfg.kmax], yDomain: cfg.yDomain, yTicks: cfg.yTicks,
        xTicks: cfg.xTicks, xTicksLinear: cfg.xTicksLinear, markerAt: cfg.xTicks,
        xLabel: 'plans sampled per section, k (log scale)', yLabel: 'coverage (%)', xName: 'k =',
        markers: true, rightPad: 96, dec: cfg.dec, height: 290,
        aria: 'NCP coverage at the 15% bar versus number of sampled plans',
        animate: !drawn10 ? true : series.map(function (s) { return s.id; }), immediate: drawn10
      });
      drawn10 = true;
    });
    onKScale(function () { drawn10 = false; rerender10(); drawn10 = true; });
    segmented(fig, 'data-model', function (m) { if (m === model) return; model = m; rerender10(); });
  })();
  // ── Video: a slim control bar under the video (so the burned-in captions stay
  // visible), click to play/pause, and space / k / arrows when the video is in view.
  (function videoPlayer() {
    var fig = document.querySelector('.cd-video'), v = fig && fig.querySelector('video');
    if (!v) return;
    v.removeAttribute('controls');
    var bar = html('div', { class: 'cd-vbar' });
    fig.insertBefore(bar, v.nextSibling);
    var play = html('button', { type: 'button', class: 'cd-vbtn', 'aria-label': 'Play' }, bar);
    var track = html('div', { class: 'cd-vtrack', role: 'slider', 'aria-label': 'Seek', tabindex: 0 }, bar);
    var fill = html('div', { class: 'cd-vfill' }, track);
    var time = html('span', { class: 'cd-vtime' }, bar, '0:00');
    var full = html('button', { type: 'button', class: 'cd-vbtn', 'aria-label': 'Full screen' }, bar);
    full.innerHTML = '<svg viewBox="0 0 16 16" width="15" height="15"><path d="M1 5V1h4M11 1h4v4M15 11v4h-4M5 15H1v-4" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';
    var PLAY = '<svg viewBox="0 0 16 16" width="14" height="14"><path d="M4 2l10 6-10 6z" fill="currentColor"/></svg>';
    var PAUSE = '<svg viewBox="0 0 16 16" width="14" height="14"><path d="M3 2h3.5v12H3zM9.5 2H13v12H9.5z" fill="currentColor"/></svg>';
    function mmss(x) { x = Math.max(0, Math.floor(x || 0)); return Math.floor(x / 60) + ':' + ('0' + x % 60).slice(-2); }
    function sync() {
      play.innerHTML = v.paused ? PLAY : PAUSE;
      play.setAttribute('aria-label', v.paused ? 'Play' : 'Pause');
      fig.classList.toggle('is-playing', !v.paused);
    }
    function tick() {
      var d = v.duration || parseFloat(v.getAttribute('data-duration')) || 0;
      fill.style.width = d ? (v.currentTime / d * 100) + '%' : '0';
      time.textContent = mmss(v.currentTime) + ' / ' + mmss(d);
    }
    function toggle() { if (v.paused) v.play(); else v.pause(); }
    play.addEventListener('click', toggle);
    v.addEventListener('click', toggle);
    ['play', 'pause', 'ended'].forEach(function (e) { v.addEventListener(e, sync); });
    ['timeupdate', 'loadedmetadata', 'seeked'].forEach(function (e) { v.addEventListener(e, tick); });
    function seekTo(ev) {
      var r = track.getBoundingClientRect(), f = Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width));
      if (v.duration) v.currentTime = f * v.duration;
    }
    track.addEventListener('pointerdown', function (ev) {
      seekTo(ev);
      track.setPointerCapture(ev.pointerId);
      function move(e) { seekTo(e); }
      function up() { track.removeEventListener('pointermove', move); track.removeEventListener('pointerup', up); }
      track.addEventListener('pointermove', move);
      track.addEventListener('pointerup', up);
    });
    full.addEventListener('click', function () {
      if (document.fullscreenElement) document.exitFullscreen();
      else if (v.requestFullscreen) v.requestFullscreen();
    });
    // Keyboard: space or k toggles, arrows seek 5 s, while the video is mostly in view
    var inView = false;
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { inView = es[0].intersectionRatio >= 0.5; }, { threshold: [0, 0.5, 1] }).observe(v);
    document.addEventListener('keydown', function (e) {
      if (!inView || e.metaKey || e.ctrlKey || e.altKey) return;
      var tag = (document.activeElement && document.activeElement.tagName) || '';
      if (/INPUT|TEXTAREA|SELECT/.test(tag) || (document.activeElement && document.activeElement.isContentEditable)) return;
      if (e.key === ' ' || e.key === 'k') { e.preventDefault(); toggle(); }
      else if (e.key === 'ArrowRight' && document.activeElement === track) { v.currentTime = Math.min(v.duration || 0, v.currentTime + 5); }
      else if (e.key === 'ArrowLeft' && document.activeElement === track) { v.currentTime = Math.max(0, v.currentTime - 5); }
    });
    sync(); tick();
  })();

  // ── Section bar: sticky links to each section, current one underlined ──

  (function sectionNav() {
    var targets = Array.prototype.slice.call(document.querySelectorAll('.cd-page [data-nav]'));
    var hero = document.querySelector('.cd-project .project-hero');
    if (targets.length < 3 || !hero) return;
    var bar = html('nav', { class: 'cd-secnav', 'aria-label': 'Sections' }, document.body);
    var inner = html('div', { class: 'cd-secnav-inner' }, bar);
    var links = targets.map(function (el) {
      var a = html('a', { href: '#' + el.id }, inner, el.getAttribute('data-nav'));
      a.addEventListener('click', function (e) {
        e.preventDefault();
        el.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'start' });
        history.replaceState(null, '', '#' + el.id);
      });
      return a;
    });
    // Sit just below the site's fixed navbar
    function place() {
      var nav = document.querySelector('.navbar.fixed-top, header .navbar, .navbar');
      var h = nav ? nav.getBoundingClientRect().height : 56;
      bar.style.top = h + 'px';
      document.documentElement.style.setProperty('--cd-secnav-offset', (h + 44) + 'px');
    }
    place();
    window.addEventListener('resize', place);
    // Show once the header has scrolled away
    new IntersectionObserver(function (es) { bar.classList.toggle('is-shown', !es[0].isIntersecting); }, { threshold: 0 }).observe(hero);
    // Scrollspy: the last section whose top has passed ~35% of the viewport. Section
    // positions are cached and only re-measured when the page's height changes, so
    // scrolling itself never forces a layout.
    var current = -1, ticking = false, tops = [];
    function measure() { tops = targets.map(function (t) { return t.getBoundingClientRect().top + window.scrollY; }); }
    measure();
    if ('ResizeObserver' in window) new ResizeObserver(function () { measure(); spy(); }).observe(document.querySelector('.cd-page'));
    window.addEventListener('load', measure);
    function spy() {
      ticking = false;
      var line = window.scrollY + window.innerHeight * 0.35, idx = 0;
      for (var i = 0; i < tops.length; i++) if (tops[i] <= line) idx = i;
      if (idx === current) return;
      current = idx;
      links.forEach(function (a, i) { a.classList.toggle('is-on', i === idx); });
      var on = links[idx];
      if (inner.scrollWidth > inner.clientWidth) inner.scrollTo({ left: on.offsetLeft - inner.clientWidth / 2 + on.offsetWidth / 2, behavior: 'smooth' });
    }
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(spy); } }, { passive: true });
    spy();
  })();

  // ── Ornament: peepal leaf ────────────────────────────────────────────────

  // Heart-shaped leaf with a drawn-out tip, base at (0,0), tip along -y.
  var PEEPAL = 'M0,0 C-0.45,-0.05 -0.62,-0.55 -0.3,-0.82 C-0.16,-0.94 -0.05,-1.0 0,-1.3 ' +
               'C0.05,-1.0 0.16,-0.94 0.3,-0.82 C0.62,-0.55 0.45,-0.05 0,0 Z';
  function leaf(parent, x, y, angle, size, cls) {
    // Outer group places the leaf; the inner group is free for CSS transforms.
    var outer = svg('g', { transform: 'translate(' + x.toFixed(1) + ',' + y.toFixed(1) + ') rotate(' + (angle * 180 / Math.PI + 90).toFixed(1) + ') scale(' + size + ')' }, parent);
    var g = svg('g', null, outer);
    svg('path', { d: PEEPAL, class: cls || 'lf', style: 'stroke-width:' + (0.8 / size).toFixed(3) }, g);
    // Midrib plus short paired veins, as in Madhubani kachni line work
    svg('path', { d: 'M0,-0.05 L0,-1.05 M0,-0.36 L-0.26,-0.56 M0,-0.36 L0.26,-0.56 M0,-0.66 L-0.17,-0.82 M0,-0.66 L0.17,-0.82',
      class: 'rib', style: 'stroke-width:' + (0.5 / size).toFixed(3) }, g);
    return g;
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

  // ── Hero: a banyan; IID samples stay in one corner, GROOT and VS spread ──

  (function heroTree() {
    var hero = document.querySelector('.cd-project .project-hero');
    if (!hero) return;
    // Keep "Self-Training" on one line
    var title = hero.querySelector('.project-title');
    if (title) title.innerHTML = title.innerHTML.replace('Self-Training', '<span style="white-space:nowrap">Self-Training</span>');
    var REDUCE = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Two stacked layers: the canopy (its own compositor layer, so swaying never
    // repaints hundreds of leaves) and a static base with the ground and legend.
    var root = html('div', { class: 'cd-hero-tree cd-grow', 'aria-hidden': 'true' }, hero);
    var gust = html('div', { class: 'cd-tree-gust' }, root);
    var canopySvg = svg('svg', { class: 'cd-tree-canopy', viewBox: '0 0 320 372' }, gust);
    var baseSvg = svg('svg', { class: 'cd-tree-base', viewBox: '0 0 320 372' }, root);
    var r = seeded(14164), GROUND = 318, MAXD = 5, BASEX = 160;
    var LEN = [74, 54, 40, 30, 22, 16], SPREAD = [0, 1.0, 0.74, 0.62, 0.54, 0.46];
    var TINTS = ['t1', 't2', 't3', 't4'];
    var canopy = svg('g', { class: 'canopy' }, canopySvg);
    var roots = svg('g', null, canopy), branches = svg('g', null, canopy), leaves = svg('g', null, canopy), paths = svg('g', null, canopy), topLeaves = svg('g', null, canopy);
    var terminals = [], nodeId = 0, rootSpots = [];

    var SPEED = 170;   // px of branch per second: children start exactly when the parent arrives
    var tEnd = 0;
    function sprout(x, y, ang, size, delay, cls) {
      var g = leaf(leaves, x, y, ang, size, 'lf ' + (cls || (r() < 0.06 ? 't5' : TINTS[Math.floor(r() * TINTS.length)])));
      g.classList.add('pop');
      g.style.transitionDelay = delay.toFixed(2) + 's';
      return g;
    }

    function grow(x, y, ang, depth, trail, anc, t0) {
      var len = LEN[depth] * (0.85 + r() * 0.3), dur = len / SPEED;
      var ex = x + Math.cos(ang) * len, ey = y + Math.sin(ang) * len;
      var bend = (r() - 0.5) * 0.35 * len;
      var cx = (x + ex) / 2 - Math.sin(ang) * bend, cy = (y + ey) / 2 + Math.cos(ang) * bend;
      var seg = 'Q' + cx.toFixed(1) + ',' + cy.toFixed(1) + ' ' + ex.toFixed(1) + ',' + ey.toFixed(1);
      var el = svg('path', { d: 'M' + x.toFixed(1) + ',' + y.toFixed(1) + ' ' + seg, class: 'br gr', pathLength: 1,
        'stroke-width': Math.max(0.8, 7.5 * Math.pow(0.6, depth)).toFixed(2) }, branches);
      el.style.transition = 'stroke-dashoffset ' + dur.toFixed(2) + 's linear ' + t0.toFixed(2) + 's';
      var t1 = t0 + dur;
      tEnd = Math.max(tEnd, t1);
      var id = nodeId++;
      trail = trail.concat([seg]);
      anc = anc.concat([id]);
      if (depth >= 1 && depth <= 3 && Math.abs(ex - BASEX) > 26) rootSpots.push({ x: ex, y: ey, depth: depth, t: t1 });
      // Extra foliage along the outer limbs
      if (depth >= 3 && r() < 0.2) {
        var t = 0.55;
        sprout(x + (ex - x) * t, y + (ey - y) * t, ang + (r() < 0.5 ? -1 : 1) * (0.9 + r() * 0.4), 8.5 + r() * 2.5, t0 + dur * t);
      }
      if (depth === MAXD) {
        terminals.push({ x: ex, y: ey, ang: ang, trail: trail, anc: anc, t: t1 });
        return;
      }
      var n = depth === 0 ? 3 : (r() < 0.3 ? 3 : 2);
      for (var i = 0; i < n; i++) {
        var a = ang + SPREAD[depth + 1] * (i - (n - 1) / 2) + (r() - 0.5) * 0.25;
        grow(ex, ey, a, depth + 1, trail, anc, t1);
      }
    }
    grow(BASEX, GROUND, -Math.PI / 2, 0, ['M' + BASEX + ',' + GROUND], [], 0);

    // Aerial roots: many thin strands, a few thickening into pillar trunks.
    rootSpots.sort(function (a, b) { return Math.abs(b.x - BASEX) - Math.abs(a.x - BASEX); });
    rootSpots.forEach(function (sp, k) {
      if (k > 13 || (k > 5 && r() < 0.35)) return;
      var strands = sp.depth === 1 ? 1 : (r() < 0.5 ? 2 : 1);
      for (var s2 = 0; s2 < strands; s2++) {
        var ox = sp.x + (s2 ? 3 : 0) + (r() - 0.5) * 3, sway = (r() - 0.5) * 12;
        var pillar = false;
        var end = pillar ? GROUND : GROUND - (r() < 0.45 ? 30 + r() * 60 : 0);
        var d = 'M' + ox.toFixed(1) + ',' + sp.y.toFixed(1) + ' C' + (ox + sway).toFixed(1) + ',' + ((sp.y + end) / 2).toFixed(1) + ' ' +
          (ox - sway).toFixed(1) + ',' + ((sp.y + end) / 2 + 18).toFixed(1) + ' ' + (ox + sway / 3).toFixed(1) + ',' + end.toFixed(1);
        var rt = svg('path', { d: d, class: 'root gr' + (pillar ? ' pillar' : ''), pathLength: 1 }, roots);
        rt.style.transition = 'stroke-dashoffset ' + (pillar ? 1.3 : 1.0) + 's ease-in ' + (sp.t + 0.1 + r() * 0.4).toFixed(2) + 's';
      }
    });

    // Leaves at every branch tip
    terminals.forEach(function (t) {
      var k = r() < 0.4 ? 2 : 1;
      for (var j2 = 0; j2 < k; j2++) {
        var off = (j2 - (k - 1) / 2) * 0.7 + (r() - 0.5) * 0.2;
        t.leaves = (t.leaves || []).concat([sprout(t.x, t.y, t.ang + off, 10.5 + r() * 3, t.t + j2 * 0.06)]);
      }
    });

    // Ground line with a row of dots
    svg('line', { x1: 30, x2: 290, y1: GROUND + 1, y2: GROUND + 1, class: 'ground' }, baseSvg);
    for (var x = 38; x <= 282; x += 9) svg('circle', { cx: x, cy: GROUND + 8, r: 1.2, class: 'dot' }, baseSvg);

    // ── Samples through the tree ──
    // IID: every sample ends in the same small subtree. GROOT and VS: spread
    // across different top-level subtrees.
    function groupBy(level) {
      var g = {};
      terminals.forEach(function (t) { var key = t.anc[level]; (g[key] = g[key] || []).push(t); });
      return g;
    }
    var byD3 = groupBy(3), keys3 = Object.keys(byD3);
    var iidKey = keys3.sort(function (a, b) { return byD3[b].length - byD3[a].length; })[0];
    var iidSet = byD3[iidKey].slice(0, 6);
    // Each spread sampler takes paths from different depth-2 subtrees, never IID's
    // subtree, and never a tip another sampler already used.
    var iidSub = iidSet[0].anc[2], taken = [];
    function spread(qs) {
      var used = {};
      used[iidSub] = true;
      return qs.map(function (q) {
        var cand = terminals.filter(function (t) { return !used[t.anc[2]] && taken.indexOf(t) < 0; })
          .sort(function (a, b) { return a.x - b.x; });
        if (!cand.length) cand = terminals.filter(function (t) { return t.anc[2] !== iidSub && taken.indexOf(t) < 0; });
        var t = cand[Math.round(q * (cand.length - 1))];
        used[t.anc[2]] = true;
        taken.push(t);
        return t;
      });
    }
    var grootSet = spread([0.0, 0.34, 0.66, 1.0]);
    var vsSet = spread([0.12, 0.45, 0.58, 0.9]);

    var METHODS = [
      { key: 'iid', label: 'IID', set: iidSet, dx: -1.6, at: tEnd + 0.6 },
      { key: 'groot', label: 'GROOT', set: grootSet, dx: 0, at: tEnd + 1.7 },
      { key: 'vs', label: 'VS', set: vsSet, dx: 1.6, at: tEnd + 2.8 }
    ];
    METHODS.forEach(function (m) {
      m.els = [];
      m.set.forEach(function (t, i) {
        var el = svg('path', { d: t.trail.join(' '), class: 'path gr p-' + m.key, pathLength: 1, transform: 'translate(' + m.dx + ',0)' }, paths);
        el.style.transition = 'stroke-dashoffset 0.9s ease-in-out ' + (m.at + i * 0.14).toFixed(2) + 's, opacity 0.25s';
        m.els.push(el);
        (t.leaves || []).forEach(function (lg) {
          // Lift sampled leaves above everything else and make them a little larger
          var outer = lg.parentNode;
          outer.setAttribute('transform', outer.getAttribute('transform').replace(/scale\(([\d.]+)\)/, function (_, v) { return 'scale(' + (parseFloat(v) * 1.3).toFixed(2) + ')'; }));
          topLeaves.appendChild(outer);
          var p = lg.querySelector('.lf');
          p.classList.add('m-' + m.key);
          p.style.transitionDelay = (m.at + 0.8) + 's';
        });
      });
    });

    // Legend: hover to isolate a method, click to replay its paths
    var legendG = svg('g', { class: 'legend' }, baseSvg);
    var lx = 160 - (3 * 40 + 10 * 9.6 + 20) / 2;
    METHODS.forEach(function (m) {
      var w = m.label.length * 9.6 + 40;
      var g = svg('g', { class: 'item', transform: 'translate(' + lx + ',330)', tabindex: 0, 'aria-label': 'Show ' + m.label + ' paths' }, legendG);
      svg('rect', { x: 0, y: 0, width: w, height: 25, rx: 12.5, class: 'lchip' }, g);
      svg('line', { x1: 11, x2: 25, y1: 12.5, y2: 12.5, class: 'p-' + m.key, 'stroke-width': 3 }, g);
      svg('text', { x: 31, y: 17.5 }, g, m.label);
      g.addEventListener('focus', function () { root.setAttribute('data-focus', m.key); });
      g.addEventListener('blur', function () { root.removeAttribute('data-focus'); });
      g.addEventListener('mouseenter', function () { root.setAttribute('data-focus', m.key); });
      g.addEventListener('mouseleave', function () { root.removeAttribute('data-focus'); });
      g.addEventListener('click', function () {
        m.els.forEach(function (el, i) {
          el.style.transition = 'none';
          el.style.strokeDashoffset = '1';
          el.getBoundingClientRect();
          el.style.transition = 'stroke-dashoffset 0.9s ease-in-out ' + (i * 0.14) + 's, opacity 0.25s';
          el.style.strokeDashoffset = '0';
        });
      });
      lx += w + 10;
    });

    // Start only once fonts and layout have settled, so nothing jumps mid-growth.
    var loaded = new Promise(function (res) { if (document.readyState === 'complete') res(); else window.addEventListener('load', res); });
    var fonts = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    Promise.all([loaded, fonts]).then(function () {
      requestAnimationFrame(function () { requestAnimationFrame(function () {
        root.classList.add('is-grown');
        document.documentElement.dispatchEvent(new CustomEvent('cd-tree-start', { detail: { duration: tEnd + 3.8 } }));
        // After the reveal, drop the staggered delays so hover changes respond instantly.
        setTimeout(function () {
          root.querySelectorAll('.lf, .path').forEach(function (el) { el.style.transitionDelay = '0s'; });
          root.classList.add('is-settled');
        }, (tEnd + 4.2) * 1000);
        if (!REDUCE) setTimeout(function gustLoop() {
          if (visible && !document.hidden) blow();
          setTimeout(gustLoop, 10000 + Math.random() * 7000);
        }, (tEnd + 11) * 1000);
      }); });
    });
    if (REDUCE) return;

    // Only animate while the tree is on screen.
    var visible = true;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        visible = es[0].isIntersecting;
        root.classList.toggle('is-paused', !visible);
        if (!visible) rest();
      }).observe(root);
    }

    // Wind: a gust of a few drawn strokes blows across now and then; the canopy
    // leans with it and wiggles back to rest.
    // One rAF loop, running only while the canopy is moving.
    var wind = svg('svg', { class: 'cd-tree-wind', viewBox: '0 0 320 372' }, root);
    [
      'M-40,118 C20,106 70,130 130,116 S205,102 236,114 C258,123 258,98 242,102 C231,105 236,118 252,117 S320,110 362,113',
      'M-40,186 C30,176 92,198 152,186 S252,174 362,182',
      'M-40,236 C12,229 60,243 108,233 C134,228 138,209 122,211 C110,213 116,229 134,229 S250,225 362,229'
    ].forEach(function (d, i) {
      var st = svg('path', { d: d, class: 'streak', pathLength: 1 }, wind);
      st.style.animationDelay = (i * 0.18) + 's';
    });
    function blow() {
      root.classList.remove('is-windy');
      void wind.getBoundingClientRect();
      root.classList.add('is-windy');
      setTimeout(function () { kick(0.42); }, 450);
      setTimeout(function () { kick(0.22); }, 850);
      setTimeout(function () { root.classList.remove('is-windy'); }, 2400);
    }
    // Damped spring in real time (degrees, seconds), so its motion doesn't depend
    // on frame rate or dropped frames. The tilt is hard-limited to a few degrees.
    var angle = 0, vel = 0, raf = 0, lastT = 0, MAX_TILT = 3;
    function rest() { angle = 0; vel = 0; lastT = 0; if (raf) cancelAnimationFrame(raf); raf = 0; gust.style.transform = ''; }
    function kick(v) {
      if (document.hidden || !visible) return;
      vel += v * 60;                          // impulse, in degrees per second
      if (!raf) { lastT = 0; raf = requestAnimationFrame(step); }
    }
    function step(now) {
      var dt = lastT ? Math.min(0.05, (now - lastT) / 1000) : 1 / 60;
      lastT = now;
      // Sub-step so large frame gaps stay stable
      for (var n = 0; n < 4; n++) {
        var h = dt / 4;
        vel += (-angle * 160 - vel * 4.2) * h;   // stiffness, damping
        angle += vel * h;
      }
      angle = Math.max(-MAX_TILT, Math.min(MAX_TILT, angle));
      gust.style.transform = 'rotate(' + angle.toFixed(3) + 'deg)';
      if (Math.abs(angle) > 0.01 || Math.abs(vel) > 0.05) raf = requestAnimationFrame(step);
      else rest();
    }
    document.addEventListener('visibilitychange', function () { if (document.hidden) rest(); });

  })();

  // ── Vine dividers between sections ───────────────────────────────────────

  (function vines() {
    var heads = document.querySelectorAll('.cd-page h2');
    function curl(g, x, y, dir) {
      // A small spiral tendril at the end of the stem
      svg('path', { d: 'M' + x + ',' + y + ' c' + (-5 * dir) + ',-1 ' + (-8 * dir) + ',-6 ' + (-4 * dir) + ',-9 c' + (3 * dir) + ',-2 ' + (6 * dir) + ',1 ' + (4 * dir) + ',4 c' + (-1 * dir) + ',2 ' + (-3 * dir) + ',1 ' + (-3 * dir) + ',0', class: 'tendril' }, g);
    }
    heads.forEach(function (h, i) {
      if (i === 0) return;
      var v = svg('svg', { class: 'cd-vine', viewBox: '0 0 240 34', 'aria-hidden': 'true' });
      svg('path', { d: 'M14,18 C44,9 74,27 120,18 S196,9 226,18', class: 'stem' }, v);
      curl(v, 14, 18, 1); curl(v, 226, 18, -1);
      // Leaves in pairs and singles, mirrored about the centre
      [[36, 14, -2.2, 6.5, 't2'], [52, 19, 2.0, 6, 't1'], [80, 22, 1.2, 7, 't3'], [94, 20, -1.0, 5.5, 't4']].forEach(function (l) {
        leaf(v, l[0], l[1], l[2], l[3], 'lf ' + l[4]);
        leaf(v, 240 - l[0], l[1], Math.PI - l[2], l[3], 'lf ' + l[4]);
      });
      // Buds and a dot row
      [[64, 14], [176, 14], [44, 24], [196, 24]].forEach(function (d) { svg('circle', { cx: d[0], cy: d[1], r: 1.7, class: 'bud' }, v); });
      [112, 120, 128].forEach(function (x) { svg('circle', { cx: x, cy: 29, r: 1.1, class: 'dotrow' }, v); });
      // Centre: a peepal leaf flanked by two small ones
      leaf(v, 120, 18, -Math.PI / 2, 9.5, 'lf t2');
      leaf(v, 117, 19, -2.5, 5.5, 'lf t3');
      leaf(v, 123, 19, -0.64, 5.5, 'lf t3');
      h.parentNode.insertBefore(v, h);
    });
  })();
})();
