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

  var prefersReducedMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var scatterStates = {};
  var DEFAULT_LATENT_LABELS = ['MoI', 'Soft Thinking', 'COCONUT', 'CoLaR'];

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

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function easeOutBack(t) {
    var c1 = 1.70158;
    var c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  function wrapTextLines(ctx, text, maxWidth) {
    if (!text) return [];
    if (!maxWidth) return [text];

    var words = text.split(/\s+/).filter(Boolean);
    if (!words.length) return [];

    var lines = [];
    var current = words[0];

    for (var i = 1; i < words.length; i++) {
      var candidate = current + ' ' + words[i];
      if (ctx.measureText(candidate).width <= maxWidth) {
        current = candidate;
      } else {
        lines.push(current);
        current = words[i];
      }
    }

    lines.push(current);
    return lines;
  }

  function getScatterState(canvasId) {
    if (!scatterStates[canvasId]) {
      scatterStates[canvasId] = {
        ready: false,
        playing: false,
        hasAutoPlayed: false,
        raf: 0,
        button: null
      };
    }
    return scatterStates[canvasId];
  }

  function findDatum(data, label) {
    return data.find(function (d) { return d.label === label; }) || null;
  }

  function normalizeTooltipMeta(value) {
    if (!value) return null;
    if (typeof value === 'string') return { detail: value };
    return value;
  }

  function projectScatterPoint(canvas, opts, x, y) {
    var W = canvas.clientWidth || Math.max(canvas.parentElement.clientWidth - 32, 200);
    var H = 360;
    var pad = { t: 25, r: 30, b: 55, l: 65 };
    var dw = W - pad.l - pad.r;
    var dh = H - pad.t - pad.b;
    return {
      px: pad.l + (x - opts.xMin) / (opts.xMax - opts.xMin) * dw,
      py: pad.t + dh - (y - opts.yMin) / (opts.yMax - opts.yMin) * dh
    };
  }

  function routePoint(start, end, progress) {
    var p = clamp(progress, 0, 1);
    var split = 0.48;

    if (p <= split) {
      return {
        x: lerp(start.x, end.x, easeInOutCubic(p / split)),
        y: start.y
      };
    }

    return {
      x: end.x,
      y: lerp(start.y, end.y, easeInOutCubic((p - split) / (1 - split)))
    };
  }

  function routeGuidePoints(start, end, progress) {
    var p = clamp(progress, 0, 1);
    var split = 0.48;

    if (p <= split) {
      return [
        { x: start.x, y: start.y },
        { x: lerp(start.x, end.x, easeInOutCubic(p / split)), y: start.y }
      ];
    }

    return [
      { x: start.x, y: start.y },
      { x: end.x, y: start.y },
      { x: end.x, y: lerp(start.y, end.y, easeInOutCubic((p - split) / (1 - split))) }
    ];
  }

  function stageAlpha(elapsed, start, fadeIn, hold, fadeOut) {
    var t = elapsed - start;
    var total = fadeIn + hold + fadeOut;
    if (t < 0 || t > total) return 0;
    if (t < fadeIn) return t / fadeIn;
    if (t < fadeIn + hold) return 1;
    return 1 - (t - fadeIn - hold) / fadeOut;
  }

  function getGroupEllipse(points, group) {
    if (!points || !points.length) return null;

    var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    points.forEach(function (point) {
      minX = Math.min(minX, point.px);
      maxX = Math.max(maxX, point.px);
      minY = Math.min(minY, point.py);
      maxY = Math.max(maxY, point.py);
    });

    return {
      cx: (minX + maxX) / 2,
      cy: (minY + maxY) / 2,
      rx: (maxX - minX) / 2 + ((group && group.padX) || 24),
      ry: (maxY - minY) / 2 + ((group && group.padY) || 30),
      rotation: (group && group.rotation) || -0.22
    };
  }

  function resolveCalloutPlacement(anchorX, anchorY, bounds, boxW, boxH, meta) {
    if (meta && meta.slotX != null && meta.slotY != null) {
      return {
        left: clamp(
          bounds.left + clamp(meta.slotX, 0, 1) * Math.max(bounds.right - bounds.left - boxW, 0) + (meta.dx || 0),
          bounds.left + 8,
          bounds.right - boxW - 8
        ),
        top: clamp(
          bounds.top + clamp(meta.slotY, 0, 1) * Math.max(bounds.bottom - bounds.top - boxH, 0) + (meta.dy || 0),
          bounds.top + 8,
          bounds.bottom - boxH - 8
        ),
        side: meta.side || 'slot'
      };
    }

    var side = meta && meta.side ? meta.side : 'left';
    var gap = meta && meta.gap != null ? meta.gap : 28;
    var dx = meta && meta.dx != null ? meta.dx : 0;
    var dy = meta && meta.dy != null ? meta.dy : 0;
    var left;
    var top;

    if (side === 'right') {
      left = anchorX + gap;
      top = anchorY - boxH / 2;
    } else if (side === 'top') {
      left = anchorX - boxW / 2;
      top = anchorY - boxH - gap;
    } else if (side === 'bottom') {
      left = anchorX - boxW / 2;
      top = anchorY + gap;
    } else {
      side = 'left';
      left = anchorX - boxW - gap;
      top = anchorY - boxH / 2;
    }

    left = clamp(left + dx, bounds.left + 8, bounds.right - boxW - 8);
    top = clamp(top + dy, bounds.top + 8, bounds.bottom - boxH - 8);

    return {
      left: left,
      top: top,
      side: side
    };
  }

  function renderTooltipHtml(container, meta) {
    container.innerHTML = '';
    if (!meta) return;

    var title = meta.title;
    var detail = meta.detail || meta.text;
    var accent = meta.accent;

    if (title) {
      var titleEl = document.createElement('div');
      titleEl.className = 'chart-tooltip-title';
      titleEl.textContent = title;
      container.appendChild(titleEl);
    }

    if (detail) {
      var detailEl = document.createElement('div');
      detailEl.className = 'chart-tooltip-detail';
      detailEl.textContent = detail;
      container.appendChild(detailEl);
    }

    if (accent) {
      var accentEl = document.createElement('div');
      accentEl.className = 'chart-tooltip-accent';
      accentEl.textContent = accent;
      container.appendChild(accentEl);
    }
  }

  /* ── Scatter plot ────────────────────────────────────────────────────────── */

  function drawScatterCallout(ctx, point, bounds, note) {
    if (!note || !note.title || note.alpha <= 0) return;

    var rows = [];
    var boxPadX = 15;
    var boxPadY = 13;
    var lineHeight = 17;
    var blockGap = 4;
    var wrapWidth = note.maxWidth || 230;

    function pushWrappedLines(text, font, fill, alpha, rise) {
      if (!text || alpha <= 0) return;
      ctx.font = font;
      wrapTextLines(ctx, text, wrapWidth).forEach(function (line) {
        rows.push({
          text: line,
          font: font,
          fill: fill,
          alpha: alpha,
          rise: rise
        });
      });
    }

    pushWrappedLines(note.title, '600 13.5px -apple-system, BlinkMacSystemFont, sans-serif', '#16212b', note.alpha, 0);
    if (note.detail) {
      var detailProgress = clamp(note.detailProgress == null ? 1 : note.detailProgress, 0, 1);
      if (rows.length) rows.push({ spacer: true, size: blockGap });
      pushWrappedLines(
        note.detail,
        '12px -apple-system, BlinkMacSystemFont, sans-serif',
        'rgba(22, 33, 43, 0.78)',
        note.alpha * detailProgress,
        6 * (1 - detailProgress)
      );
    }

    if (note.accent) {
      var accentProgress = clamp(note.accentProgress == null ? 1 : note.accentProgress, 0, 1);
      if (rows.length) rows.push({ spacer: true, size: blockGap });
      pushWrappedLines(
        note.accent,
        '700 12px -apple-system, BlinkMacSystemFont, sans-serif',
        note.accentColor || '#8B4513',
        note.alpha * accentProgress,
        6 * (1 - accentProgress)
      );
    }

    ctx.save();
    var maxWidth = 0;
    var contentHeight = 0;
    rows.forEach(function (line) {
      if (line.spacer) {
        contentHeight += line.size;
        return;
      }
      ctx.font = line.font;
      maxWidth = Math.max(maxWidth, ctx.measureText(line.text).width);
      contentHeight += lineHeight;
    });

    var boxW = maxWidth + boxPadX * 2;
    var boxH = boxPadY * 2 + Math.max(contentHeight, lineHeight);
    var placement = resolveCalloutPlacement(point.px, point.py, bounds, boxW, boxH, note);
    var bx = placement.left;
    var by = placement.top;
    ctx.globalAlpha = note.alpha;
    ctx.shadowColor = 'rgba(27, 39, 51, 0.08)';
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 10;
    ctx.beginPath();
    ctx.roundRect(bx, by, boxW, boxH, [13]);
    ctx.fillStyle = 'rgba(255, 255, 252, 0.985)';
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(27, 39, 51, 0.1)';
    ctx.stroke();

    ctx.textAlign = 'left';
    var cursorY = by + boxPadY + 12;
    rows.forEach(function (line) {
      if (line.spacer) {
        cursorY += line.size;
        return;
      }
      if (line.alpha <= 0) return;
      ctx.globalAlpha = line.alpha;
      ctx.fillStyle = line.fill;
      ctx.font = line.font;
      ctx.fillText(line.text, bx + boxPadX, cursorY - line.rise);
      cursorY += lineHeight;
    });

    ctx.restore();
  }

  function drawScatterGroupHighlight(ctx, points, group) {
    if (!group || !points || !points.length) return;
    var ellipse = getGroupEllipse(points, group);
    if (!ellipse) return;

    ctx.save();
    ctx.globalAlpha = group.alpha == null ? 0.14 : group.alpha;
    ctx.beginPath();
    ctx.ellipse(ellipse.cx, ellipse.cy, ellipse.rx, ellipse.ry, ellipse.rotation, 0, Math.PI * 2);
    ctx.fillStyle = group.fill || '#ecdcc9';
    ctx.fill();
    ctx.globalAlpha = group.strokeAlpha == null ? 0.24 : group.strokeAlpha;
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = group.stroke || '#8B4513';
    ctx.stroke();
    ctx.restore();
  }

  function resolveGuidePoint(point, pointStates, xPx, yPx) {
    if (!point) return null;
    if (point.label && pointStates[point.label]) {
      return { px: pointStates[point.label].px, py: pointStates[point.label].py };
    }
    return { px: xPx(point.x), py: yPx(point.y) };
  }

  function drawScatterGuide(ctx, guide, pointStates, xPx, yPx) {
    if (!guide || !guide.points || guide.points.length < 2) return;

    var points = guide.points.map(function (point) {
      return resolveGuidePoint(point, pointStates, xPx, yPx);
    }).filter(Boolean);
    if (points.length < 2) return;

    var progress = clamp(guide.progress == null ? 1 : guide.progress, 0, 1);
    if (progress <= 0) return;

    var segLengths = [];
    var totalLength = 0;
    for (var i = 1; i < points.length; i++) {
      var dx = points[i].px - points[i - 1].px;
      var dy = points[i].py - points[i - 1].py;
      var len = Math.sqrt(dx * dx + dy * dy);
      segLengths.push(len);
      totalLength += len;
    }
    if (totalLength === 0) return;

    var remaining = totalLength * progress;
    var endPoint = points[0];

    ctx.save();
    ctx.globalAlpha = guide.alpha == null ? 0.5 : guide.alpha;
    ctx.strokeStyle = guide.color || '#8B4513';
    ctx.lineWidth = guide.width || 1.5;
    ctx.setLineDash(guide.dash || [5, 5]);
    ctx.beginPath();
    ctx.moveTo(points[0].px, points[0].py);

    for (var j = 1; j < points.length; j++) {
      var segLen = segLengths[j - 1];
      if (remaining >= segLen) {
        ctx.lineTo(points[j].px, points[j].py);
        endPoint = points[j];
        remaining -= segLen;
      } else {
        var ratio = segLen ? remaining / segLen : 0;
        endPoint = {
          px: lerp(points[j - 1].px, points[j].px, ratio),
          py: lerp(points[j - 1].py, points[j].py, ratio)
        };
        ctx.lineTo(endPoint.px, endPoint.py);
        remaining = 0;
        break;
      }
    }
    ctx.stroke();
    ctx.setLineDash([]);

    if (guide.label && progress > 0.72) {
      var labelAlpha = (guide.labelAlpha == null ? 1 : guide.labelAlpha) * clamp((progress - 0.72) / 0.28, 0, 1);
      var start = points[0];
      var midX = (start.px + endPoint.px) / 2 + (guide.labelDx || 0);
      var midY = (start.py + endPoint.py) / 2 + (guide.labelDy || 0);
      ctx.globalAlpha = labelAlpha;
      ctx.font = '700 10.5px -apple-system, BlinkMacSystemFont, sans-serif';
      var labelWidth = ctx.measureText(guide.label).width;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
      ctx.beginPath();
      ctx.roundRect(midX - labelWidth / 2 - 7, midY - 11, labelWidth + 14, 20, [8]);
      ctx.fill();
      ctx.strokeStyle = 'rgba(139, 69, 19, 0.16)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = guide.labelColor || '#8B4513';
      ctx.textAlign = 'center';
      ctx.fillText(guide.label, midX, midY + 3);
    }

    ctx.restore();
  }

  function renderScatter(canvasId, data, opts, scene) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) return null;
    var activeHighlight = canvas._scatterSpec && canvas._scatterSpec.highlight;
    var hoverTextMap = activeHighlight && activeHighlight.hoverText ? activeHighlight.hoverText : {};
    var latentRegionMeta = normalizeTooltipMeta(hoverTextMap['latent-cluster']);
    var activeLatentLabels = activeHighlight && activeHighlight.latentLabels ? activeHighlight.latentLabels : DEFAULT_LATENT_LABELS;
    var latentLabelSet = {};
    activeLatentLabels.forEach(function (label) { latentLabelSet[label] = true; });
    var s = setupCanvas(canvas, 360);
    var ctx = s.ctx, W = s.w, H = s.h;
    var pad = { t: 25, r: 30, b: 55, l: 65 };
    var dw = W - pad.l - pad.r, dh = H - pad.t - pad.b;

    var xMin = opts.xMin, xMax = opts.xMax, yMin = opts.yMin, yMax = opts.yMax;
    function xPx(v) { return pad.l + (v - xMin) / (xMax - xMin) * dw; }
    function yPx(v) { return pad.t + dh - (v - yMin) / (yMax - yMin) * dh; }

    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = '#f0f0f0';
    ctx.lineWidth = 1;
    var ticks = 5, i, v, p;
    for (i = 0; i <= ticks; i++) {
      v = yMin + (yMax - yMin) * i / ticks;
      p = yPx(v);
      ctx.beginPath();
      ctx.moveTo(pad.l, p);
      ctx.lineTo(W - pad.r, p);
      ctx.stroke();
      ctx.fillStyle = '#888';
      ctx.font = '12.5px -apple-system, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(Math.round(v), pad.l - 8, p + 4);
    }
    for (i = 0; i <= ticks; i++) {
      v = xMin + (xMax - xMin) * i / ticks;
      p = xPx(v);
      ctx.beginPath();
      ctx.moveTo(p, pad.t);
      ctx.lineTo(p, H - pad.b);
      ctx.stroke();
      ctx.fillStyle = '#888';
      ctx.font = '12.5px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(opts.xFmt ? opts.xFmt(v) : v.toFixed(1), p, H - pad.b + 18);
    }

    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(pad.l, pad.t);
    ctx.lineTo(pad.l, H - pad.b);
    ctx.lineTo(W - pad.r, H - pad.b);
    ctx.stroke();

    ctx.fillStyle = '#555';
    ctx.font = '14.5px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(opts.xLabel, pad.l + dw / 2, H - 8);
    ctx.save();
    ctx.translate(16, pad.t + dh / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(opts.yLabel, 0, 0);
    ctx.restore();

    var hoverPoints = [];
    var hoverRegions = [];
    var pointStates = {};

    data.forEach(function (d) {
      var override = scene && scene.pointOverrides ? scene.pointOverrides[d.label] : null;
      var pointX = override && override.x != null ? override.x : d.x;
      var pointY = override && override.y != null ? override.y : d.y;
      var alpha = override && override.alpha != null ? override.alpha :
        (scene && scene.dimOthers ? (scene.otherAlpha == null ? 0.92 : scene.otherAlpha) : 1);
      var showLabel = override && override.showLabel != null ? override.showLabel : true;
      var showRing = override && override.showRing != null ? override.showRing : !!d.hl;
      var labelAlpha = override && override.labelAlpha != null ? override.labelAlpha : alpha;
      var haloAlpha = override && override.haloAlpha != null ? override.haloAlpha : 0;
      var haloRadius = override && override.haloRadius != null ? override.haloRadius : 0;
      var haloWidth = override && override.haloWidth != null ? override.haloWidth : 1.5;
      var px = xPx(pointX);
      var py = yPx(pointY);
      pointStates[d.label] = {
        datum: d,
        x: pointX,
        y: pointY,
        alpha: alpha,
        showLabel: showLabel,
        showRing: showRing,
        labelAlpha: labelAlpha,
        haloAlpha: haloAlpha,
        haloRadius: haloRadius,
        haloWidth: haloWidth,
        px: px,
        py: py
      };
    });

    if (scene && scene.groupHighlight) {
      drawScatterGroupHighlight(ctx, scene.groupHighlight.labels.map(function (label) {
        return pointStates[label];
      }).filter(Boolean), scene.groupHighlight);
    }

    if (scene && scene.guides) {
      scene.guides.forEach(function (guide) {
        drawScatterGuide(ctx, guide, pointStates, xPx, yPx);
      });
    }

    data.forEach(function (d) {
      var pointState = pointStates[d.label];
      var r = d.hl ? 8 : 6;
      var c = METHOD_COLORS[d.label] || '#999';

      hoverPoints.push({
        label: d.label,
        x: d.x,
        y: d.y,
        hitX: pointState.px,
        hitY: pointState.py,
        hoverText: normalizeTooltipMeta(hoverTextMap[d.label] || d.hoverText || ''),
        regionId: latentLabelSet[d.label] ? 'latent-cluster' : null
      });

      ctx.save();
      ctx.globalAlpha = pointState.alpha;
      ctx.beginPath();
      ctx.arc(pointState.px, pointState.py, r, 0, Math.PI * 2);
      ctx.fillStyle = c;
      ctx.fill();
      if (pointState.haloAlpha > 0 && pointState.haloRadius > 0) {
        ctx.globalAlpha = pointState.haloAlpha;
        ctx.strokeStyle = c;
        ctx.lineWidth = pointState.haloWidth;
        ctx.beginPath();
        ctx.arc(pointState.px, pointState.py, r + pointState.haloRadius, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (pointState.showRing) {
        ctx.strokeStyle = c;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(pointState.px, pointState.py, r + 3, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (pointState.showLabel) {
        ctx.globalAlpha = pointState.labelAlpha;
        ctx.fillStyle = '#333';
        ctx.font = (d.hl ? 'bold ' : '') + '12.5px -apple-system, sans-serif';
        ctx.textAlign = d.ta || 'center';
        ctx.fillText(d.label, pointState.px + (d.ox || 0), pointState.py + (d.oy || -14));
      }
      ctx.restore();
    });

    if (scene && scene.callout) {
      var calloutPoint = scene.callout.point;
      if (!calloutPoint && scene.callout.anchor) {
        if (scene.callout.anchor.label && pointStates[scene.callout.anchor.label]) {
          calloutPoint = {
            px: pointStates[scene.callout.anchor.label].px,
            py: pointStates[scene.callout.anchor.label].py
          };
        } else if (scene.callout.anchor.x != null && scene.callout.anchor.y != null) {
          calloutPoint = {
            px: xPx(scene.callout.anchor.x),
            py: yPx(scene.callout.anchor.y)
          };
        }
      }
      if (calloutPoint) {
        drawScatterCallout(ctx, calloutPoint, {
        left: pad.l,
        right: W - pad.r,
        top: pad.t,
        bottom: H - pad.b
        }, scene.callout);
      }
    }

    if (activeHighlight && latentRegionMeta) {
      var clusterPoints = activeLatentLabels.map(function (label) {
        return pointStates[label];
      }).filter(Boolean);
      var clusterEllipse = getGroupEllipse(clusterPoints, { padX: 38, padY: 44 });
      if (clusterEllipse) {
        hoverRegions.push({
          id: 'latent-cluster',
          type: 'ellipse',
          cx: clusterEllipse.cx,
          cy: clusterEllipse.cy,
          rx: clusterEllipse.rx,
          ry: clusterEllipse.ry,
          rotation: clusterEllipse.rotation,
          tooltip: latentRegionMeta
        });
      }
    }

    ctx.save();
    ctx.fillStyle = '#999';
    ctx.font = 'italic 12px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('better \u2192', W - pad.r, H - pad.b + 36);
    ctx.textAlign = 'left';
    ctx.fillText('\u2193 better', pad.l + 2, pad.t - 6);
    ctx.restore();

    canvas._cd = { points: hoverPoints, regions: hoverRegions };
    canvas._scatterSpec = {
      data: data,
      opts: opts,
      highlight: canvas._scatterSpec && canvas._scatterSpec.highlight
    };
    return canvas;
  }

  function setReplayReady(canvasId, ready) {
    var state = getScatterState(canvasId);
    state.ready = !!ready;
    if (state.button) {
      state.button.disabled = !ready;
      state.button.classList.toggle('is-ready', !!ready);
    }
  }

  function ensureReplayButton(canvasId) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) return null;

    var state = getScatterState(canvasId);
    var wrapper = canvas.parentElement;
    var button = state.button;

    if (!button || !button.isConnected) {
      button = wrapper.querySelector('.chart-replay');
      if (!button) {
        button = document.createElement('button');
        button.type = 'button';
        button.className = 'chart-replay';
        button.textContent = 'Replay';
        button.setAttribute('aria-label', 'Replay LiteReason highlight animation');
        wrapper.appendChild(button);
      }
      if (!button.dataset.boundReplay) {
        button.dataset.boundReplay = '1';
        button.addEventListener('click', function () {
          startScatterHighlight(canvasId, true);
        });
      }
      state.button = button;
    }

    setReplayReady(canvasId, state.ready);
    return button;
  }

  function drawScatter(canvasId, data, opts) {
    return renderScatter(canvasId, data, opts, null);
  }

  function buildScatterPreviewScene(data, highlight) {
    if (!highlight) return null;

    var base = findDatum(data, highlight.baseLabel || 'Qwen2.5-7B');
    var rl = findDatum(data, highlight.rlLabel || 'RL-Trained');
    var lite = findDatum(data, highlight.focusLabel || 'LiteReason');
    var latentLabels = highlight.latentLabels || DEFAULT_LATENT_LABELS;
    var latentPoints = latentLabels.map(function (label) {
      return findDatum(data, label);
    }).filter(Boolean);

    if (!base) return null;

    var overrides = {};
    overrides[base.label] = {
      alpha: 1,
      showLabel: true,
      showRing: true,
      labelAlpha: 1,
      haloAlpha: 0.16,
      haloRadius: 5,
      haloWidth: 1.2
    };

    if (rl) {
      overrides[rl.label] = {
        alpha: 0,
        showLabel: false,
        showRing: false,
        labelAlpha: 0
      };
    }

    if (lite) {
      overrides[lite.label] = {
        alpha: 0,
        showLabel: false,
        showRing: false,
        labelAlpha: 0
      };
    }

    return {
      dimOthers: true,
      otherAlpha: 0.84,
      pointOverrides: overrides,
      groupHighlight: latentPoints.length ? {
        labels: latentLabels,
        alpha: 0.072,
        strokeAlpha: 0.132,
        padX: 38,
        padY: 44,
        fill: 'rgba(236, 220, 201, 0.92)',
        stroke: 'rgba(139, 69, 19, 0.28)'
      } : null
    };
  }

  function drawScatterWithHighlight(canvasId, data, opts, highlight) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) return;

    var state = getScatterState(canvasId);
    canvas._scatterSpec = { data: data, opts: opts, highlight: highlight };
    canvas = renderScatter(canvasId, data, opts, buildScatterPreviewScene(data, highlight));

    if (!highlight || prefersReducedMotion) {
      state.ready = false;
      return;
    }

    ensureReplayButton(canvasId);
    if (state.playing) return;

    if (!state.hasAutoPlayed) {
      state.hasAutoPlayed = true;
      startScatterHighlight(canvasId, false);
    } else {
      setReplayReady(canvasId, true);
    }
  }

  function startScatterHighlight(canvasId, force) {
    var canvas = document.getElementById(canvasId);
    if (!canvas || !canvas._scatterSpec || !canvas._scatterSpec.highlight) return;

    var state = getScatterState(canvasId);
    var spec = canvas._scatterSpec;
    var highlight = spec.highlight;
    var base = findDatum(spec.data, highlight.baseLabel || 'Qwen2.5-7B');
    var rl = findDatum(spec.data, highlight.rlLabel || 'RL-Trained');
    var lite = findDatum(spec.data, highlight.focusLabel || 'LiteReason');
    var latentLabels = highlight.latentLabels || DEFAULT_LATENT_LABELS;
    var latentPoints = latentLabels.map(function (label) {
      return findDatum(spec.data, label);
    }).filter(Boolean);

    if (!base || !rl || !lite) {
      drawScatter(canvasId, spec.data, spec.opts);
      return;
    }

    if (!force && prefersReducedMotion) {
      drawScatter(canvasId, spec.data, spec.opts);
      return;
    }

    cancelAnimationFrame(state.raf);
    state.playing = true;
    setReplayReady(canvasId, false);

    var startTime = 0;
    var readingScale = highlight.readingScale || 1.44;
    var introHold = 300;
    var baseFadeIn = 190;
    var baseHold = 1500 * readingScale;
    var baseFadeOut = 170;
    var latentFadeIn = 200;
    var latentHold = 1450 * readingScale;
    var latentFadeOut = 170;
    var rlMoveMs = 1400;
    var rlHoldMs = 1400;
    var rlCalloutFadeIn = 200;
    var rlCalloutHold = 1400 * readingScale;
    var rlCalloutFadeOut = 180;
    var liteMoveMs = 1550;
    var finalFadeIn = 210;
    var finalHold = 1900 * readingScale;
    var finalFadeOut = 220;
    var tokenReduction = Math.round((1 - lite.y / rl.y) * 100);
    var tokenText = highlight.tokenText || (tokenReduction + '% fewer tokens');
    var latentAnchor = latentPoints.length ? {
      x: latentPoints.reduce(function (sum, point) { return sum + point.x; }, 0) / latentPoints.length,
      y: latentPoints.reduce(function (sum, point) { return sum + point.y; }, 0) / latentPoints.length
    } : { x: lite.x, y: lite.y };
    var baseDetail = highlight.baseDetail || ((spec.opts.xFmt ? spec.opts.xFmt(base.x) : String(base.x)) + ', ' + Math.round(base.y) + ' tokens');
    var persistentHull = latentPoints.length ? {
      labels: latentLabels,
      alpha: 0.072,
      strokeAlpha: 0.132,
      padX: 38,
      padY: 44,
      fill: 'rgba(236, 220, 201, 0.92)',
      stroke: 'rgba(139, 69, 19, 0.28)'
    } : null;
    var baseStart = introHold;
    var latentStart = baseStart + baseFadeIn + baseHold + baseFadeOut;
    var rlStart = latentStart + latentFadeIn + latentHold + latentFadeOut;
    var liteStart = rlStart + rlMoveMs + rlHoldMs;
    var finalStart = liteStart + liteMoveMs + 40;
    var totalMs = finalStart + finalFadeIn + finalHold + finalFadeOut;

    function makeBaseOverride() {
      var override = {};
      override[base.label] = {
        alpha: 1,
        showLabel: true,
        showRing: true,
        labelAlpha: 1,
        haloAlpha: 0.26,
        haloRadius: 7,
        haloWidth: 1.3
      };
      return override;
    }

    function hidePoint(label) {
      return {
        alpha: 0,
        showLabel: false,
        showRing: false,
        labelAlpha: 0
      };
    }

    function settledScene() {
      var overrides = makeBaseOverride();
      overrides[rl.label] = {
        x: rl.x,
        y: rl.y,
        alpha: 1,
        showLabel: true,
        showRing: true,
        haloAlpha: 0.2,
        haloRadius: 7,
        haloWidth: 1.3
      };
      overrides[lite.label] = {
        x: lite.x,
        y: lite.y,
        alpha: 1,
        showLabel: true,
        showRing: true,
        haloAlpha: 0.28,
        haloRadius: 9,
        haloWidth: 1.35
      };

      return {
        dimOthers: true,
        otherAlpha: 0.82,
        pointOverrides: overrides,
        groupHighlight: persistentHull
      };
    }

    function frame(ts) {
      if (!startTime) startTime = ts;
      var elapsed = ts - startTime;
      var scene;

      if (elapsed < introHold) {
        var introOverrides = makeBaseOverride();
        introOverrides[rl.label] = hidePoint(rl.label);
        introOverrides[lite.label] = hidePoint(lite.label);
        scene = {
          dimOthers: true,
          otherAlpha: 0.84,
          pointOverrides: introOverrides,
          groupHighlight: persistentHull
        };
      } else if (elapsed < latentStart) {
        var baseOverrides = makeBaseOverride();
        baseOverrides[rl.label] = hidePoint(rl.label);
        baseOverrides[lite.label] = hidePoint(lite.label);
        var baseAlpha = stageAlpha(elapsed, baseStart, baseFadeIn, baseHold, baseFadeOut);
        scene = {
          dimOthers: true,
          otherAlpha: 0.84,
          pointOverrides: baseOverrides,
          groupHighlight: persistentHull,
          callout: baseAlpha > 0.01 ? {
            anchor: { x: base.x, y: base.y },
            title: highlight.baseTitle || 'Base model',
            detail: baseDetail,
            alpha: baseAlpha,
            detailProgress: clamp((elapsed - baseStart - 70) / 220, 0, 1),
            side: highlight.baseSide || 'top',
            gap: highlight.baseGap,
            dx: highlight.baseDx,
            dy: highlight.baseDy,
            slotX: highlight.baseSlotX,
            slotY: highlight.baseSlotY,
            maxWidth: highlight.baseMaxWidth
          } : null
        };
      } else if (elapsed < rlStart) {
        var latentAlpha = stageAlpha(elapsed, latentStart, latentFadeIn, latentHold, latentFadeOut);
        var latentOverrides = makeBaseOverride();
        latentOverrides[rl.label] = hidePoint(rl.label);
        latentOverrides[lite.label] = hidePoint(lite.label);

        latentLabels.forEach(function (label) {
          latentOverrides[label] = { alpha: 1, showRing: true, labelAlpha: 1 };
        });

        scene = {
          dimOthers: true,
          otherAlpha: 0.5,
          pointOverrides: latentOverrides,
          groupHighlight: latentPoints.length ? {
            labels: latentLabels,
            alpha: 0.096 + 0.12 * latentAlpha,
            strokeAlpha: 0.096 + 0.144 * latentAlpha,
            padX: 38,
            padY: 44,
            fill: 'rgba(236, 220, 201, 0.92)',
            stroke: 'rgba(139, 69, 19, 0.22)'
          } : null,
          callout: latentAlpha > 0.01 ? {
            anchor: latentAnchor,
            title: highlight.latentTitle || 'Prior latent methods reduce tokens',
            detail: highlight.latentDetail || 'but don\'t significantly change model behaviour',
            alpha: latentAlpha,
            detailProgress: clamp((elapsed - latentStart - 80) / 220, 0, 1),
            side: highlight.latentSide || 'right',
            gap: highlight.latentGap,
            dx: highlight.latentDx,
            dy: highlight.latentDy,
            slotX: highlight.latentSlotX,
            slotY: highlight.latentSlotY,
            maxWidth: highlight.latentMaxWidth
          } : null
        };
      } else if (elapsed < liteStart) {
        var rlElapsed = clamp(elapsed - rlStart, 0, rlMoveMs);
        var rlProgress = clamp(rlElapsed / rlMoveMs, 0, 1);
        var rlPoint = routePoint(base, rl, rlProgress);
        var rlAlpha = stageAlpha(elapsed, rlStart + rlMoveMs - 40, rlCalloutFadeIn, rlCalloutHold, rlCalloutFadeOut);
        var rlPointOverrides = makeBaseOverride();
        rlPointOverrides[rl.label] = {
          x: rlPoint.x,
          y: rlPoint.y,
          alpha: 1,
          showRing: true,
          haloAlpha: 0.2,
          haloRadius: 7,
          haloWidth: 1.3,
          showLabel: rlProgress > 0.82,
          labelAlpha: clamp((rlProgress - 0.58) / 0.42, 0, 1)
        };
        rlPointOverrides[lite.label] = hidePoint(lite.label);

        scene = {
          dimOthers: true,
          otherAlpha: 0.58,
          pointOverrides: rlPointOverrides,
          groupHighlight: persistentHull,
          guides: [{
            points: routeGuidePoints(base, rl, rlProgress),
            alpha: 0.62,
            color: METHOD_COLORS[rl.label],
            dash: [6, 5]
          }],
          callout: rlAlpha > 0.01 ? {
            anchor: { x: rl.x, y: rl.y },
            title: highlight.rlTitle || 'RL training improves task performance',
            detail: highlight.rlDetail || 'but at higher token cost',
            alpha: rlAlpha,
            detailProgress: clamp((elapsed - rlStart - rlMoveMs + 40) / 220, 0, 1),
            side: highlight.rlSide || 'top',
            gap: highlight.rlGap,
            dx: highlight.rlDx,
            dy: highlight.rlDy,
            slotX: highlight.rlSlotX,
            slotY: highlight.rlSlotY,
            maxWidth: highlight.rlMaxWidth
          } : null
        };
      } else {
        var liteElapsed = clamp(elapsed - liteStart, 0, liteMoveMs);
        var liteProgress = clamp(liteElapsed / liteMoveMs, 0, 1);
        var litePoint = routePoint(base, lite, liteProgress);
        var finalAlpha = stageAlpha(elapsed, finalStart, finalFadeIn, finalHold, finalFadeOut);
        var connectorAlpha = finalAlpha * clamp((elapsed - finalStart + 40) / 180, 0, 1);
        var litePointOverrides = makeBaseOverride();
        litePointOverrides[rl.label] = {
          x: rl.x,
          y: rl.y,
          alpha: 1,
          showRing: true,
          haloAlpha: 0.2,
          haloRadius: 7,
          haloWidth: 1.3,
          showLabel: true,
          labelAlpha: 1
        };
        litePointOverrides[lite.label] = {
          x: litePoint.x,
          y: litePoint.y,
          alpha: 1,
          showRing: true,
          haloAlpha: 0.28,
          haloRadius: 9,
          haloWidth: 1.35,
          showLabel: liteProgress > 0.84,
          labelAlpha: clamp((liteProgress - 0.54) / 0.46, 0, 1)
        };

        scene = {
          dimOthers: true,
          otherAlpha: 0.62,
          pointOverrides: litePointOverrides,
          groupHighlight: persistentHull,
          guides: [
            {
              points: routeGuidePoints(base, rl, 1),
              alpha: 0.2,
              color: METHOD_COLORS[rl.label],
              dash: [6, 5]
            },
            {
              points: routeGuidePoints(base, lite, liteProgress),
              alpha: 0.58,
              color: METHOD_COLORS[lite.label],
              dash: [6, 5]
            },
            {
              points: [
                { x: rl.x, y: rl.y },
                { x: litePoint.x, y: litePoint.y }
              ],
              alpha: 0.45 * connectorAlpha,
              color: METHOD_COLORS[lite.label],
              dash: [4, 4]
            }
          ],
          callout: finalAlpha > 0.01 ? {
            anchor: { x: litePoint.x, y: litePoint.y },
            title: highlight.finalTitle || 'Near RL performance',
            detail: highlight.finalDetail || 'LiteReason brings latent reasoning into RL',
            accent: tokenText,
            alpha: finalAlpha,
            detailProgress: clamp((elapsed - finalStart - 70) / 220, 0, 1),
            accentProgress: clamp((elapsed - finalStart - 260) / 220, 0, 1),
            accentColor: highlight.accentColor || '#8B4513',
            side: highlight.finalSide || 'left',
            gap: highlight.finalGap,
            dx: highlight.finalDx,
            dy: highlight.finalDy,
            slotX: highlight.finalSlotX,
            slotY: highlight.finalSlotY,
            maxWidth: highlight.finalMaxWidth
          } : null
        };
      }

      renderScatter(canvasId, spec.data, spec.opts, scene);

      if (elapsed < totalMs) {
        state.raf = requestAnimationFrame(frame);
        return;
      }

      state.playing = false;
      state.raf = 0;
      renderScatter(canvasId, spec.data, spec.opts, settledScene());
      setReplayReady(canvasId, true);
    }

    state.raf = requestAnimationFrame(frame);
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
      ctx.fillStyle = '#888'; ctx.font = '12px -apple-system, sans-serif';
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
    ctx.fillStyle = '#555'; ctx.font = '12px -apple-system, sans-serif'; ctx.textAlign = 'center';
    cats.forEach(function (c, ci) { ctx.fillText(c, pad.l + ci * gw + gw / 2, H - pad.b + 18); });

    // y label
    ctx.fillStyle = '#555'; ctx.font = '14.5px -apple-system, sans-serif';
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
    if (!c || !t || c._scatterHoverBound) return;
    c._scatterHoverBound = true;
    var hideTimer = 0;

    function placeTooltip(anchorX, anchorY, meta) {
      var spec = meta || {};
      var width = t.offsetWidth || 220;
      var height = t.offsetHeight || 72;
      var placement = resolveCalloutPlacement(anchorX, anchorY, {
        left: 0,
        top: 0,
        right: c.clientWidth,
        bottom: c.clientHeight
      }, width, height, spec);
      t.style.left = placement.left + 'px';
      t.style.top = placement.top + 'px';
    }

    function showTooltip(meta, anchorX, anchorY) {
      clearTimeout(hideTimer);
      renderTooltipHtml(t, meta);
      placeTooltip(anchorX, anchorY, meta);
      t.classList.add('visible');
    }

    function hideTooltip() {
      clearTimeout(hideTimer);
      hideTimer = setTimeout(function () {
        t.classList.remove('visible');
      }, 90);
    }

    c.addEventListener('mousemove', function (e) {
      var r = c.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
      var cd = c._cd; if (!cd) return;
      var best = null, minD = 18;
      cd.points.forEach(function (p) {
        var dx = mx - p.hitX, dy = my - p.hitY, dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minD) { minD = dist; best = p; }
      });

      var regionHit = null;
      (cd.regions || []).forEach(function (region) {
        if (region.type !== 'ellipse' || regionHit) return;
        var rot = region.rotation || 0;
        var cos = Math.cos(-rot);
        var sin = Math.sin(-rot);
        var rx = mx - region.cx;
        var ry = my - region.cy;
        var localX = rx * cos - ry * sin;
        var localY = rx * sin + ry * cos;
        var nx = localX / region.rx;
        var ny = localY / region.ry;
        if (nx * nx + ny * ny <= 1) regionHit = region;
      });

      if (best) {
        var pointMeta = normalizeTooltipMeta(best.hoverText) || {
          title: best.label,
          detail: '(' + best.x + ', ' + best.y + ')'
        };
        showTooltip(pointMeta, best.hitX, best.hitY);
      } else if (regionHit) {
        showTooltip(regionHit.tooltip, regionHit.cx, regionHit.cy);
      } else {
        hideTooltip();
      }
    });
    c.addEventListener('mouseleave', function () { hideTooltip(); });
  }

  function hoverBars(canvasId, tipId) {
    var c = document.getElementById(canvasId), t = document.getElementById(tipId);
    if (!c || !t || c._barHoverBound) return;
    c._barHoverBound = true;
    c.addEventListener('mousemove', function (e) {
      var r = c.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
      var bd = c._bd; if (!bd) return;
      var ci = Math.floor((mx - bd.pad.l) / bd.gw);
      if (ci < 0 || ci >= bd.cats.length) { t.classList.remove('visible'); return; }
      var inG = mx - bd.pad.l - ci * bd.gw - bd.gPad;
      var mi = Math.floor(inG / bd.bw);
      if (mi < 0 || mi >= bd.meths.length) { t.classList.remove('visible'); return; }
      renderTooltipHtml(t, {
        title: bd.meths[mi].name,
        detail: bd.cats[ci] + ': ' + bd.meths[mi].values[ci].toFixed(2)
      });
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


  /* ── Architecture diagram animation ─────────────────────────────────────── */

  function initArchAnimation() {
    var glow = document.getElementById('arch-glow');
    if (!glow) return;

    // Gather all interactive SVG elements
    var lmBar   = document.getElementById('lm-bar');
    var answer  = document.getElementById('answer-box');
    var heads   = [
      document.getElementById('lmhead1'), document.getElementById('proj1'),
      document.getElementById('lmhead2'), document.getElementById('proj2'),
      document.getElementById('lmhead3')
    ];
    var embeds = [], hiddens = [];
    for (var i = 0; i <= 12; i++) {
      embeds[i]  = document.getElementById('embed-' + i);
      hiddens[i] = document.getElementById('hidden-' + i);
    }

    // Column -> head/projector mapping
    // 0,1->lmhead1(0) | 2,3->proj1(1) | 4,5->lmhead2(2) | 6,7,8->proj2(3) | 9+->lmhead3(4)
    var colHead = [0, 0, 1, 1, 2, 2, 3, 3, 3, 4, 4, 4, 4];
    var isProj  = [false, false, true, true, false, false, true, true, true, false, false, false, false];

    // Colors
    var FILLS = {
      lmDef: '#93A4BD',   lmLit: '#D0E0F8',
      pjDef: '#E88080',   pjLit: '#FF6060',
      anDef: '#F0F4FF',   anLit: '#90B8FF',
      hdDef: '#DDD4EA',   hdLit: '#C8B8E8',
      disDef: '#F5E6A3',  disLit: '#FFEC80',
      conDef: '#F5A3B5',  conLit: '#FF90A8',
      barDef: '#93A4BD',  barLit: '#D0E0F8',
      lmFlash: '#FFFFFF', pjFlash: '#FFAAAA'
    };
    var colDiscrete = [true, true, true, false, false, true, true, false, false, false, true, true, true];

    function light(el, fill) {
      if (el) { el.setAttribute('fill', fill); el.setAttribute('filter', 'url(#glow)'); }
    }
    function dim(el, fill) {
      if (el) { el.setAttribute('fill', fill); el.setAttribute('filter', 'none'); }
    }
    function flash(el, flashFill, settleFill) {
      if (!el) return;
      el.style.transition = 'none';
      el.setAttribute('fill', flashFill);
      el.setAttribute('filter', 'url(#glow)');
      el.getBoundingClientRect();
      el.style.transition = 'fill 0.3s ease, filter 0.3s ease';
      el.setAttribute('fill', settleFill);
    }
    function headDef(col) { return isProj[col] ? FILLS.pjDef : FILLS.lmDef; }
    function headLit(col) { return isProj[col] ? FILLS.pjLit : FILLS.lmLit; }
    function headFlash(col) { return isProj[col] ? FILLS.pjFlash : FILLS.lmFlash; }
    function embedDef(col) { return colDiscrete[col] ? FILLS.disDef : FILLS.conDef; }
    function embedLit(col) { return colDiscrete[col] ? FILLS.disLit : FILLS.conLit; }

    // Column geometry
    var cols = [74, 134, 194, 254, 314, 374, 434, 494, 554, 614];
    var outY = [30, 30, 38, 38, 30, 30, 38, 38, 38];
    var topY = [4, 1, 46, 46, -2, -5, 46, 46, 46];

    var gen = 0; // generation counter for cancellation

    function dimAll() {
      dim(lmBar, FILLS.barDef);
      dim(answer, FILLS.anDef);
      heads.forEach(function (h, i) { dim(h, i === 1 || i === 3 ? FILLS.pjDef : FILLS.lmDef); });
      embeds.forEach(function (e, i) { dim(e, embedDef(i)); });
      hiddens.forEach(function (h) { dim(h, FILLS.hdDef); });
      glow.setAttribute('opacity', '0');
    }

    // Smooth animation between two points
    function glide(x0, y0, x1, y1, dur, thisGen, cb) {
      var start = null;
      function step(ts) {
        if (gen !== thisGen) return;
        if (!start) start = ts;
        var t = Math.min(1, (ts - start) / dur);
        var et = easeOutCubic(t);
        glow.setAttribute('cx', x0 + (x1 - x0) * et);
        glow.setAttribute('cy', y0 + (y1 - y0) * et);
        if (t < 1) requestAnimationFrame(step);
        else cb();
      }
      requestAnimationFrame(step);
    }

    // Animate along a polyline path
    function glidePath(pts, speed, thisGen, cb) {
      var segs = [], total = 0;
      for (var i = 0; i < pts.length - 1; i++) {
        var dx = pts[i+1][0] - pts[i][0], dy = pts[i+1][1] - pts[i][1];
        var len = Math.sqrt(dx * dx + dy * dy);
        segs.push(len); total += len;
      }
      var dur = total / speed * 1000;
      var start = null;
      function step(ts) {
        if (gen !== thisGen) return;
        if (!start) start = ts;
        var elapsed = ts - start;
        var rawT = Math.min(1, elapsed / dur);
        var dist = easeInOutCubic(rawT) * total;
        if (rawT >= 1) {
          glow.setAttribute('cx', pts[pts.length-1][0]);
          glow.setAttribute('cy', pts[pts.length-1][1]);
          cb(); return;
        }
        var acc = 0;
        for (var j = 0; j < segs.length; j++) {
          if (acc + segs[j] >= dist) {
            var t = (dist - acc) / segs[j];
            glow.setAttribute('cx', pts[j][0] + (pts[j+1][0] - pts[j][0]) * t);
            glow.setAttribute('cy', pts[j][1] + (pts[j+1][1] - pts[j][1]) * t);
            break;
          }
          acc += segs[j];
        }
        requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }

    function wait(ms, thisGen, cb) {
      setTimeout(function () { if (gen === thisGen) cb(); }, ms);
    }

    // Animate one column traversal, then call onDone
    function doColumn(col, thisGen, onDone) {
      var cx = cols[col];
      var head = heads[colHead[col]];

      // 1. Glow appears at input embedding bottom
      glow.setAttribute('cx', cx);
      glow.setAttribute('cy', 212);
      glow.setAttribute('opacity', '1');
      light(embeds[col], embedLit(col));

      // 2. Glide up through embed toward LM bar
      wait(200, thisGen, function () {
        glide(cx, 212, cx, 176, 300, thisGen, function () {
          // Glow reaches LM bar
          light(lmBar, FILLS.barLit);
          glide(cx, 176, cx, 130, 320, thisGen, function () {
            // 3. At hidden state
            light(hiddens[col], FILLS.hdLit);
            dim(embeds[col], embedDef(col));
            dim(lmBar, FILLS.barDef);

            wait(200, thisGen, function () {
              // 4. Glide up to head/projector entrance (y=96)
              glide(cx, 130, cx, 96, 400, thisGen, function () {
                // 5. Glow disappears into the module
                glow.setAttribute('opacity', '0');
                dim(hiddens[col], FILLS.hdDef);

                // 6. Head flashes (instant) then settles via CSS transition
                flash(head, headFlash(col), headLit(col));

                // Wait for CSS transition to settle, then glow emerges
                wait(450, thisGen, function () {
                  // 7. Glow emerges from head top and glides to output
                  glow.setAttribute('cx', cx);
                  glow.setAttribute('cy', 60);
                  glow.setAttribute('opacity', '1');
                  glide(cx, 60, cx, outY[col], 300, thisGen, function () {
                    dim(head, headDef(col));
                    wait(120, thisGen, function () {
                      onDone();
                    });
                  });
                });
              });
            });
          });
        });
      });
    }

    // Animate one feedback arrow (from col output to col+1 input)
    function doArrow(col, thisGen, onDone) {
      var cx = cols[col], nx = cols[col + 1];
      var mid = (cx + nx) / 2;
      var ty = topY[col];
      var pts = [
        [cx, outY[col]], [cx, ty], [mid, ty], [mid, 220], [nx - 10, 220], [nx, 220], [nx, 212]
      ];
      glidePath(pts, 180, thisGen, onDone);
    }

    // Animate the final approach to Answer
    function doFinal(thisGen) {
      var cx = 614;
      var head = heads[4]; // lmhead3

      glow.setAttribute('cx', cx);
      glow.setAttribute('cy', 212);
      glow.setAttribute('opacity', '1');
      light(embeds[9], embedLit(9));

      wait(200, thisGen, function () {
        glide(cx, 212, cx, 176, 300, thisGen, function () {
          light(lmBar, FILLS.barLit);
          glide(cx, 176, cx, 130, 320, thisGen, function () {
            light(hiddens[9], FILLS.hdLit);
            dim(embeds[9], embedDef(9));
            dim(lmBar, FILLS.barDef);

            wait(200, thisGen, function () {
              glide(cx, 130, cx, 96, 400, thisGen, function () {
                glow.setAttribute('opacity', '0');
                dim(hiddens[9], FILLS.hdDef);

                flash(head, headFlash(9), headLit(9));

                wait(450, thisGen, function () {
                  // Emerge and travel to answer
                  glow.setAttribute('cx', 704);
                  glow.setAttribute('cy', 60);
                  glow.setAttribute('opacity', '1');

                  glide(704, 60, 704, 24, 350, thisGen, function () {
                    dim(head, headDef(9));
                    light(answer, FILLS.anLit);

                    // Hold answer lit
                    wait(2000, thisGen, function () {
                      glow.setAttribute('opacity', '0');
                      dimAll();
                      wait(1500, thisGen, function () {
                        runCycle();
                      });
                    });
                  });
                });
              });
            });
          });
        });
      });
    }

    function runCycle() {
      var thisGen = ++gen;
      dimAll();
      var col = 0;

      function nextCol() {
        if (gen !== thisGen) return;
        if (col >= 9) {
          doFinal(thisGen);
          return;
        }
        doColumn(col, thisGen, function () {
          if (gen !== thisGen) return;
          doArrow(col, thisGen, function () {
            if (gen !== thisGen) return;
            col++;
            nextCol();
          });
        });
      }

      nextCol();
    }

    runCycle();
  }

  /* ── Chart draw functions ────────────────────────────────────────────────── */

  function drawFF() {
    drawScatterWithHighlight('scatter-ff', [
      { label: 'Qwen2.5-7B',    x: 57.26, y: 400,    oy: -14 },
      { label: 'MoI',            x: 58.06, y: 401.73, oy: 18 },
      { label: 'Soft Thinking',  x: 57.42, y: 360.90, oy: -14 },
      { label: 'COCONUT',        x: 50.65, y: 268.07, oy: -14 },
      { label: 'CoLaR',          x: 53.71, y: 226.14, oy: -14 },
      { label: 'RL-Trained',     x: 88.71, y: 114.53, oy: -14 },
      { label: 'LiteReason',     x: 87.42, y: 34.01,  oy: -14, hl: true }
    ], {
      xLabel: 'Accuracy (%) →', yLabel: '← Generated Tokens',
      xMin: 40, xMax: 100, yMin: 0, yMax: 450,
      xFmt: function (v) { return v.toFixed(0) + '%'; }
    }, {
      readingScale: 1.728,
      baseTitle: 'Base model',
      baseDetail: 'Models frequently output many more tokens than should be necessary to solve a task.',
      baseSlotX: 0.52,
      baseSlotY: 0.06,
      baseMaxWidth: 230,
      latentTitle: 'Prior latent methods reduce tokens',
      latentDetail: 'but don\'t significantly change model behaviour',
      latentSlotX: 0.70,
      latentSlotY: 0.22,
      latentMaxWidth: 228,
      rlTitle: 'RL training improves task performance',
      rlDetail: 'but still uses tokens inefficiently',
      rlSlotX: 0.78,
      rlSlotY: 0.24,
      rlMaxWidth: 220,
      finalTitle: 'LiteReason achieves near RL performance',
      finalDetail: 'using latent reasoning during RL',
      finalSlotX: 0.6,
      finalSlotY: 0.6,
      finalMaxWidth: 220,
      hoverText: {
        'latent-cluster': {
          title: 'Prior latent methods reduce token usage',
          detail: 'but don\'t significantly change model behaviour',
          slotX: 0.70,
          slotY: 0.22
        },
        'Qwen2.5-7B': {
          title: 'Base model',
          detail: 'Models frequently output many more tokens than should be necessary to solve a task.',
          slotX: 0.52,
          slotY: 0.06
        },
        'RL-Trained': {
          title: 'RL-Trained',
          detail: 'Improves task performance, but still uses tokens inefficiently.',
          slotX: 0.78,
          slotY: 0.24
        },
        'LiteReason': {
          title: 'LiteReason achieves near RL performance',
          detail: 'using latent reasoning during RL',
          accent: '70% fewer tokens',
          slotX: 0.6,
          slotY: 0.6
        }
      }
    });
    hoverScatter('scatter-ff', 'tooltip-ff');
  }

  function drawNCP() {
    drawScatterWithHighlight('scatter-ncp', [
      { label: 'Qwen2.5-7B',    x: 0.067, y: 831.85, oy: -14 },
      { label: 'MoI',            x: 0.045, y: 829.14, oy: 18 },
      { label: 'Soft Thinking',  x: 0.013, y: 966.73, oy: -14 },
      { label: 'COCONUT',        x: 0.083, y: 361.84, oy: -14 },
      { label: 'CoLaR',          x: 0.118, y: 218.40, oy: -14 },
      { label: 'RL-Trained',     x: 0.666, y: 721.33, oy: -14 },
      { label: 'LiteReason',     x: 0.478, y: 193.11, oy: -14, hl: true }
    ], {
      xLabel: 'Contrastive Improvement →', yLabel: '← Generated Tokens',
      xMin: -0.05, xMax: 0.75, yMin: 0, yMax: 1050,
      xFmt: function (v) { return v.toFixed(2); }
    }, {
      readingScale: 1.728,
      baseTitle: 'Base model',
      baseDetail: 'Models frequently output many more tokens than should be necessary to solve a task.',
      baseSlotX: 0.54,
      baseSlotY: 0.06,
      baseMaxWidth: 230,
      latentTitle: 'Prior latent methods reduce tokens',
      latentDetail: 'but don\'t significantly change model behaviour',
      latentSlotX: 0.71,
      latentSlotY: 0.19,
      latentMaxWidth: 228,
      rlTitle: 'RL training improves task performance',
      rlDetail: 'but still uses tokens inefficiently',
      rlSlotX: 0.74,
      rlSlotY: 0.16,
      rlMaxWidth: 220,
      finalTitle: 'LiteReason achieves most RL gains',
      finalDetail: 'using latent reasoning during RL',
      finalSlotX: 0.5,
      finalSlotY: 0.5,
      finalMaxWidth: 220,
      hoverText: {
        'latent-cluster': {
          title: 'Prior latent methods reduce token usage',
          detail: 'but don\'t significantly change model behaviour',
          slotX: 0.71,
          slotY: 0.19
        },
        'Qwen2.5-7B': {
          title: 'Base model',
          detail: 'Models frequently output many more tokens than should be necessary to solve a task.',
          slotX: 0.54,
          slotY: 0.06
        },
        'RL-Trained': {
          title: 'RL-Trained',
          detail: 'Improves task performance, but still uses tokens inefficiently.',
          slotX: 0.74,
          slotY: 0.16
        },
        'LiteReason': {
          title: 'LiteReason achieves most RL gains',
          detail: 'using latent reasoning during RL',
          accent: '73% fewer tokens',
          slotX: 0.5,
          slotY: 0.5
        }
      }
    });
    hoverScatter('scatter-ncp', 'tooltip-ncp');
  }

  function drawHuman() {
    drawBars('bar-human', {
      categories: ['Plot', 'Characters', 'Creativity', 'Development', 'Language', 'Overall'],
      methods: [
        { name: 'Default',     values: [0.963, 0.893, 0.929, 1.053, 1.081, 0.877] },
        { name: 'MoI',         values: [0.805, 0.859, 0.787, 0.628, 0.896, 0.832] },
        { name: 'CoLaR',       values: [0.733, 0.787, 0.906, 0.752, 0.879, 0.753] },
        { name: 'LiteReason',  values: [1.095, 1.342, 1.066, 1.071, 1.080, 1.233] },
        { name: 'RL-Trained',  values: [1.608, 1.235, 1.415, 1.878, 1.086, 1.475] }
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
      'gen-animation':  initGenAnimation,
      'arch-svg':       initArchAnimation
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
      Object.keys(scatterStates).forEach(function (id) {
        var state = scatterStates[id];
        if (state && state.raf) {
          cancelAnimationFrame(state.raf);
          state.raf = 0;
          state.playing = false;
        }
      });
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
