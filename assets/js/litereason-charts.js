(function () {
  'use strict';

  /* ── roundRect polyfill ──────────────────────────────────────────────────── */
  if (typeof CanvasRenderingContext2D !== 'undefined' &&
      !CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, radii) {
      var r = Array.isArray(radii) ? radii[0] || 0 : radii || 0;
      this.moveTo(x + r, y);
      this.lineTo(x + w - r, y); this.arcTo(x + w, y, x + w, y + r, r);
      this.lineTo(x + w, y + h); this.lineTo(x, y + h);
      this.lineTo(x, y + r); this.arcTo(x, y, x + r, y, r);
      this.closePath();
    };
  }

  /* ── Palette ─────────────────────────────────────────────────────────────── */

  var METHOD_COLORS = {
    'Qwen2.5-7B':    '#4F81BD',
    'MoI':           '#F79646',
    'Soft Thinking':  '#9BBB59',
    'COCONUT':        '#C0504D',
    'CoLaR':          '#9F4C7C',
    'LiteReason':     '#8B4513',
    'RL-Trained':     '#C04080'
  };

  var BAR_COLORS = {
    'Default':     '#bbb',
    'MoI':         '#F79646',
    'CoLaR':       '#9F4C7C',
    'COCONUT':     '#C0504D',
    'RL-Trained':  '#4F81BD',
    'LiteReason':  '#8B4513'
  };

  /* ── Canvas helper ───────────────────────────────────────────────────────── */

  function setupCanvas(canvas, height) {
    var dpr = window.devicePixelRatio || 1;
    var width = canvas.parentElement.clientWidth - 32;
    if (width < 200) width = canvas.parentElement.clientWidth;
    canvas.width  = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width  = width + 'px';
    canvas.style.height = height + 'px';
    var ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    return { ctx: ctx, w: width, h: height };
  }

  /* ── Scatter plot ────────────────────────────────────────────────────────── */

  function drawScatter(canvasId, data, opts) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) return;
    var s = setupCanvas(canvas, 360);
    var ctx = s.ctx, W = s.w, H = s.h;
    var pad = { t: 25, r: 30, b: 55, l: 65 };
    var dw = W - pad.l - pad.r, dh = H - pad.t - pad.b;

    var xMin = opts.xMin, xMax = opts.xMax, yMin = opts.yMin, yMax = opts.yMax;
    function xPx(v) { return pad.l + (v - xMin) / (xMax - xMin) * dw; }
    function yPx(v) { return pad.t + dh - (v - yMin) / (yMax - yMin) * dh; }

    // background
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, W, H);

    // grid
    ctx.strokeStyle = '#f0f0f0'; ctx.lineWidth = 1;
    var ticks = 5, i, v, p;
    for (i = 0; i <= ticks; i++) {
      v = yMin + (yMax - yMin) * i / ticks; p = yPx(v);
      ctx.beginPath(); ctx.moveTo(pad.l, p); ctx.lineTo(W - pad.r, p); ctx.stroke();
      ctx.fillStyle = '#888'; ctx.font = '11px -apple-system, sans-serif';
      ctx.textAlign = 'right'; ctx.fillText(Math.round(v), pad.l - 8, p + 4);
    }
    for (i = 0; i <= ticks; i++) {
      v = xMin + (xMax - xMin) * i / ticks; p = xPx(v);
      ctx.beginPath(); ctx.moveTo(p, pad.t); ctx.lineTo(p, H - pad.b); ctx.stroke();
      ctx.fillStyle = '#888'; ctx.font = '11px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(opts.xFmt ? opts.xFmt(v) : v.toFixed(1), p, H - pad.b + 18);
    }

    // axes
    ctx.strokeStyle = '#ccc'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(pad.l, pad.t);
    ctx.lineTo(pad.l, H - pad.b); ctx.lineTo(W - pad.r, H - pad.b); ctx.stroke();

    // axis labels
    ctx.fillStyle = '#555'; ctx.font = '13px -apple-system, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(opts.xLabel, pad.l + dw / 2, H - 8);
    ctx.save(); ctx.translate(16, pad.t + dh / 2); ctx.rotate(-Math.PI / 2);
    ctx.fillText(opts.yLabel, 0, 0); ctx.restore();

    // points
    data.forEach(function (d) {
      var px = xPx(d.x), py = yPx(d.y);
      var r = d.hl ? 8 : 6;
      var c = METHOD_COLORS[d.label] || '#999';

      ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fillStyle = c; ctx.fill();
      if (d.hl) {
        ctx.strokeStyle = c; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(px, py, r + 3, 0, Math.PI * 2); ctx.stroke();
      }

      ctx.fillStyle = '#333';
      ctx.font = (d.hl ? 'bold ' : '') + '11px -apple-system, sans-serif';
      ctx.textAlign = d.ta || 'center';
      ctx.fillText(d.label, px + (d.ox || 0), py + (d.oy || -14));
    });

    // Direction indicators
    ctx.save();
    ctx.fillStyle = '#999';
    ctx.font = 'italic 11px -apple-system, BlinkMacSystemFont, sans-serif';
    // "→ better" along x-axis
    ctx.textAlign = 'right';
    ctx.fillText('better \u2192', W - pad.r, H - pad.b + 36);
    // "↓ better" along y-axis (fewer tokens = better)
    ctx.textAlign = 'left';
    ctx.fillText('\u2193 better', pad.l + 2, pad.t - 6);
    ctx.restore();

    canvas._cd = { data: data, xPx: xPx, yPx: yPx };
  }

  /* ── Bar chart ───────────────────────────────────────────────────────────── */

  function drawBars(canvasId, data, opts) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) return;
    var s = setupCanvas(canvas, 320);
    var ctx = s.ctx, W = s.w, H = s.h;
    var pad = { t: 25, r: 20, b: 65, l: 55 };
    var dw = W - pad.l - pad.r, dh = H - pad.t - pad.b;

    var cats = data.categories, meths = data.methods;
    var nC = cats.length, nM = meths.length;
    var yMin = opts.yMin || 0, yMax = opts.yMax || 5;
    var gw = dw / nC, bw = (gw * 0.75) / nM, gPad = gw * 0.125;

    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);

    // y grid
    var ticks = 5, i, v, p;
    for (i = 0; i <= ticks; i++) {
      v = yMin + (yMax - yMin) * i / ticks; p = pad.t + dh - (v - yMin) / (yMax - yMin) * dh;
      ctx.strokeStyle = '#f0f0f0'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(pad.l, p); ctx.lineTo(W - pad.r, p); ctx.stroke();
      ctx.fillStyle = '#888'; ctx.font = '11px -apple-system, sans-serif';
      ctx.textAlign = 'right'; ctx.fillText(v.toFixed(1), pad.l - 8, p + 4);
    }

    // axes
    ctx.strokeStyle = '#ccc'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(pad.l, pad.t);
    ctx.lineTo(pad.l, H - pad.b); ctx.lineTo(W - pad.r, H - pad.b); ctx.stroke();

    // bars
    var baseline = pad.t + dh;
    meths.forEach(function (m, mi) {
      var c = BAR_COLORS[m.name] || '#999';
      cats.forEach(function (cat, ci) {
        var val = m.values[ci];
        var x = pad.l + ci * gw + gPad + mi * bw;
        var barH = (val - yMin) / (yMax - yMin) * dh;
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.roundRect(x, baseline - barH, bw - 1, barH, [3, 3, 0, 0]);
        ctx.fill();
      });
    });

    // category labels
    ctx.fillStyle = '#555'; ctx.font = '11px -apple-system, sans-serif'; ctx.textAlign = 'center';
    cats.forEach(function (c, ci) { ctx.fillText(c, pad.l + ci * gw + gw / 2, H - pad.b + 18); });

    // y label
    ctx.fillStyle = '#555'; ctx.font = '13px -apple-system, sans-serif';
    ctx.save(); ctx.translate(14, pad.t + dh / 2); ctx.rotate(-Math.PI / 2);
    ctx.fillText(opts.yLabel || '', 0, 0); ctx.restore();

    // legend
    var leg = document.getElementById(opts.legendId);
    if (leg) {
      leg.innerHTML = '';
      meths.forEach(function (m) {
        var el = document.createElement('span'); el.className = 'legend-item';
        el.innerHTML = '<span class="legend-swatch" style="background:' + (BAR_COLORS[m.name] || '#999') + '"></span>' + m.name;
        leg.appendChild(el);
      });
    }

    canvas._bd = { cats: cats, meths: meths, pad: pad, gw: gw, bw: bw, gPad: gPad, dh: dh, yMin: yMin, yMax: yMax };
  }

  /* ── Hover helpers ───────────────────────────────────────────────────────── */

  function hoverScatter(canvasId, tipId) {
    var c = document.getElementById(canvasId), t = document.getElementById(tipId);
    if (!c || !t) return;
    c.addEventListener('mousemove', function (e) {
      var r = c.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
      var cd = c._cd; if (!cd) return;
      var best = null, minD = 25;
      cd.data.forEach(function (d) {
        var dx = mx - cd.xPx(d.x), dy = my - cd.yPx(d.y), dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minD) { minD = dist; best = d; }
      });
      if (best) {
        t.textContent = best.label + ': (' + best.x + ', ' + best.y + ')';
        t.style.left = cd.xPx(best.x) + 'px'; t.style.top = (cd.yPx(best.y) - 35) + 'px';
        t.classList.add('visible');
      } else { t.classList.remove('visible'); }
    });
    c.addEventListener('mouseleave', function () { t.classList.remove('visible'); });
  }

  function hoverBars(canvasId, tipId) {
    var c = document.getElementById(canvasId), t = document.getElementById(tipId);
    if (!c || !t) return;
    c.addEventListener('mousemove', function (e) {
      var r = c.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
      var bd = c._bd; if (!bd) return;
      var ci = Math.floor((mx - bd.pad.l) / bd.gw);
      if (ci < 0 || ci >= bd.cats.length) { t.classList.remove('visible'); return; }
      var inG = mx - bd.pad.l - ci * bd.gw - bd.gPad;
      var mi = Math.floor(inG / bd.bw);
      if (mi < 0 || mi >= bd.meths.length) { t.classList.remove('visible'); return; }
      t.textContent = bd.meths[mi].name + ' \u2014 ' + bd.cats[ci] + ': ' + bd.meths[mi].values[ci].toFixed(2);
      t.style.left = mx + 'px'; t.style.top = (my - 35) + 'px';
      t.classList.add('visible');
    });
    c.addEventListener('mouseleave', function () { t.classList.remove('visible'); });
  }

  /* ── Generation animation ────────────────────────────────────────────────── */

  var animGen = 0; // generation counter for safe cancellation

  function initGenAnimation() {
    var output = document.getElementById('gen-output');
    if (!output) return;

    // Flawed Fictions-style reasoning trace with <implicit_thought> tags
    var seq = [
      { t: 'd', w: ['Let', 'me', 'analyze', 'the', 'story', 'for', 'continuity', 'errors.'] },
      { t: 'd', w: ['The', 'story', 'establishes', 'that', 'Marcus', 'works', 'as', 'a', 'carpenter', 'in', 'paragraph', '1.'] },
      { t: 'l', n: 3 },
      { t: 'd', w: ['In', 'paragraph', '4,', 'his', 'wife', 'refers', 'to', '"his', 'job', 'at', 'the', 'hospital."'] },
      { t: 'd', w: ['This', 'directly', 'contradicts', 'the', 'earlier', 'established', 'occupation.'] },
      { t: 'l', n: 2 },
      { t: 'a', text: '\\boxed{Yes}' }
    ];

    function run() {
      var thisGen = ++animGen;
      output.innerHTML = '';
      var delay = 0;
      var TOKEN_MS = 90;
      var TAG_MS = 60;
      var LATENT_STEP_MS = 400;

      function schedule(ms, fn) {
        delay += ms;
        setTimeout(function () {
          if (animGen !== thisGen) return;
          fn();
        }, delay);
      }

      seq.forEach(function (seg) {
        if (seg.t === 'd') {
          seg.w.forEach(function (word) {
            schedule(TOKEN_MS, function () {
              var s = document.createElement('span');
              s.className = 'gen-token discrete';
              s.textContent = (output.childNodes.length ? ' ' : '') + word;
              output.appendChild(s);
              requestAnimationFrame(function () { s.classList.add('visible'); });
            });
          });
        } else if (seg.t === 'l') {
          // Render the <implicit_thought> opening tag
          schedule(TOKEN_MS, function () {
            var tag = document.createElement('span');
            tag.className = 'gen-thought-tag';
            tag.textContent = ' <implicit_thought>';
            output.appendChild(tag);
            requestAnimationFrame(function () { tag.classList.add('visible'); });
          });
          // Render the number
          schedule(TAG_MS, function () {
            var num = document.createElement('span');
            num.className = 'gen-thought-tag';
            num.textContent = String(seg.n);
            output.appendChild(num);
            requestAnimationFrame(function () { num.classList.add('visible'); });
          });
          // Render closing tag
          schedule(TAG_MS, function () {
            var ctag = document.createElement('span');
            ctag.className = 'gen-thought-tag';
            ctag.textContent = '</implicit_thought>';
            output.appendChild(ctag);
            requestAnimationFrame(function () { ctag.classList.add('visible'); });
          });
          // Show pulsing latent dots
          schedule(100, function () {
            var indicator = document.createElement('span');
            indicator.className = 'gen-latent-indicator';
            for (var i = 0; i < seg.n; i++) {
              var dot = document.createElement('span');
              dot.className = 'gen-latent-dot';
              indicator.appendChild(dot);
            }
            output.appendChild(indicator);
          });
          // Wait for latent steps to "complete"
          delay += seg.n * LATENT_STEP_MS;
          schedule(0, function () {
            // Remove the pulsing dots after latent reasoning completes
            var dots = output.querySelector('.gen-latent-indicator:last-of-type');
            if (dots) dots.remove();
          });
        } else if (seg.t === 'a') {
          schedule(TOKEN_MS * 2, function () {
            var s = document.createElement('span');
            s.className = 'gen-token discrete';
            s.textContent = ' ' + seg.text;
            s.style.fontWeight = 'bold';
            output.appendChild(s);
            requestAnimationFrame(function () { s.classList.add('visible'); });
          });
        }
      });

      // Replay after pause
      schedule(3500, function () { run(); });
    }

    window.toggleAnimation = function () {
      var btn = document.getElementById('gen-play-pause');
      if (btn.dataset.paused === '1') {
        btn.dataset.paused = '0';
        btn.textContent = '\u23F8';
        run();
      } else {
        btn.dataset.paused = '1';
        btn.textContent = '\u25B6';
        animGen++; // invalidate all pending callbacks
      }
    };

    run();
  }

  /* ── Chart draw functions ────────────────────────────────────────────────── */

  function drawFF() {
    drawScatter('scatter-ff', [
      { label: 'Qwen2.5-7B',    x: 57.26, y: 400,    oy: -14 },
      { label: 'MoI',            x: 58.06, y: 401.73, oy: 18 },
      { label: 'Soft Thinking',  x: 57.42, y: 360.90, oy: -14 },
      { label: 'COCONUT',        x: 50.65, y: 268.07, oy: -14 },
      { label: 'CoLaR',          x: 53.71, y: 226.14, oy: -14 },
      { label: 'RL-Trained',     x: 88.71, y: 114.53, oy: -14 },
      { label: 'LiteReason',     x: 87.42, y: 34.01,  oy: -14, hl: true }
    ], {
      xLabel: 'Accuracy (%)', yLabel: 'Generated Tokens',
      xMin: 46, xMax: 94, yMin: 0, yMax: 450,
      xFmt: function (v) { return v.toFixed(0) + '%'; }
    });
    hoverScatter('scatter-ff', 'tooltip-ff');
  }

  function drawNCP() {
    drawScatter('scatter-ncp', [
      { label: 'Qwen2.5-7B',    x: 0.067, y: 831.85, oy: -14 },
      { label: 'MoI',            x: 0.045, y: 829.14, oy: 18 },
      { label: 'Soft Thinking',  x: 0.013, y: 966.73, oy: -14 },
      { label: 'COCONUT',        x: 0.083, y: 361.84, oy: -14 },
      { label: 'CoLaR',          x: 0.118, y: 218.40, oy: -14 },
      { label: 'RL-Trained',     x: 0.666, y: 721.33, oy: -14 },
      { label: 'LiteReason',     x: 0.478, y: 193.11, oy: -14, hl: true }
    ], {
      xLabel: 'Contrastive Improvement', yLabel: 'Generated Tokens',
      xMin: -0.05, xMax: 0.75, yMin: 0, yMax: 1050,
      xFmt: function (v) { return v.toFixed(2); }
    });
    hoverScatter('scatter-ncp', 'tooltip-ncp');
  }

  function drawHuman() {
    drawBars('bar-human', {
      categories: ['Plot', 'Characters', 'Creativity', 'Development', 'Language', 'Overall'],
      methods: [
        { name: 'Default',     values: [0.62, 0.58, 0.52, 0.55, 0.78, 0.58] },
        { name: 'MoI',         values: [0.68, 0.62, 0.58, 0.60, 0.82, 0.62] },
        { name: 'CoLaR',       values: [0.65, 0.60, 0.55, 0.58, 0.75, 0.60] },
        { name: 'COCONUT',     values: [0.72, 0.65, 0.62, 0.64, 0.85, 0.68] },
        { name: 'RL-Trained',  values: [1.90, 1.80, 1.72, 1.78, 1.85, 1.88] },
        { name: 'LiteReason',  values: [1.58, 1.48, 1.42, 1.45, 1.62, 1.55] }
      ]
    }, {
      yLabel: 'Bradley-Terry Relative Strength',
      yMin: 0, yMax: 2.2,
      legendId: 'legend-human'
    });
    hoverBars('bar-human', 'tooltip-human');
  }

  /* ── Scroll-triggered init ───────────────────────────────────────────────── */

  var drawn = {};

  function initObserver() {
    var handler = {
      'scatter-ff':     drawFF,
      'scatter-ncp':    drawNCP,
      'bar-human':      drawHuman,
      'gen-animation':  initGenAnimation
    };

    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting || drawn[e.target.id]) return;
        drawn[e.target.id] = true;
        var fn = handler[e.target.id];
        if (fn) fn();
      });
    }, { threshold: 0.15 });

    Object.keys(handler).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) obs.observe(el);
    });
  }

  /* ── Resize ──────────────────────────────────────────────────────────────── */

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      if (drawn['scatter-ff'])  drawFF();
      if (drawn['scatter-ncp']) drawNCP();
      if (drawn['bar-human'])   drawHuman();
    }, 200);
  });

  /* ── Boot ────────────────────────────────────────────────────────────────── */

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initObserver);
  } else {
    initObserver();
  }
})();
