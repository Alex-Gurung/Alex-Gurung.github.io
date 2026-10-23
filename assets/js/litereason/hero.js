/* Compact illustrative inference: persistent 3D geometry and a rolling transcript. */
(function () {
  'use strict';
  var root = document.querySelector('.litereason-project');
  var scene = root && root.querySelector('.lr-hero-conversation');
  if (!scene) return;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var svgNS = 'http://www.w3.org/2000/svg';
  var input = Array.from(scene.querySelectorAll('.lr-stream-input path'));
  var model = scene.querySelector('.lr-model-turn');
  var pieces = Array.from(scene.querySelectorAll('.lr-model-piece'));
  var transcript = scene.querySelector('.lr-transcript');
  var button = scene.querySelector('.lr-conversation-play');
  var elapsed = 0, last = null, raf = 0, paused = false;
  var glyphs = ['M0 0h8m5-3v6h7', 'M0-3h7v6H0m13-3h8', 'M0-3v6h7m6-3h9', 'M0 0h10m6-3v6', 'M0-3h8v6m6-3h6', 'M0 0h6v-3m7 0v6h7'];
  var budgets = {
    short: { duration: 1200, turns: 1 },
    long: { duration: 2100, turns: 2 }
  };
  // Sample once per response, never per frame. These probabilities are purely
  // illustrative, not estimates of the paper's observed tool-use frequency.
  function makeResponse(id, start, staticExample) {
    var choice = staticExample ? .5 : Math.random();
    var count = choice < .15 ? 0 : choice < .65 ? 1 : 2;
    var firstBudget = staticExample || Math.random() < .5 ? 'short' : 'long';
    var response = { id: id, start: start, lines: [], calls: [] };
    var at = 1550;
    function line(kind, budget) {
      var entry = { at: at, kind: kind, seed: (id + response.lines.length) % glyphs.length };
      if (kind === 'tool') {
        entry.budget = budget;
        entry.duration = budgets[budget].duration;
        entry.callStart = at + 550;
        response.calls.push(entry);
        at = entry.callStart + entry.duration + 450;
      } else {
        at += kind === 'answer' ? 1450 : 1050;
      }
      response.lines.push(entry);
    }
    line('text');
    line(count ? 'tool' : 'text', firstBudget);
    // Two-call responses show both budgets, separated by resumed text.
    line(count === 2 ? 'tool' : 'text', firstBudget === 'short' ? 'long' : 'short');
    line('answer');
    response.end = start + at;
    return response;
  }
  var responses = [makeResponse(0, 0, reduced.matches)];
  var staticResponse = makeResponse(-1, 0, true);
  function responseAt(time) {
    var current = responses[responses.length - 1];
    while (time >= current.end) {
      current = makeResponse(current.id + 1, current.end, false);
      responses.push(current);
      if (responses.length > 2) responses.shift();
    }
    return current;
  }
  function ease(t) { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); }
  function element(tag, attrs, parent, text) {
    var node = document.createElementNS(svgNS, tag);
    Object.keys(attrs || {}).forEach(function (key) { node.setAttribute(key, attrs[key]); });
    if (text) node.textContent = text;
    if (parent) parent.appendChild(node);
    return node;
  }
  // Keep two complete responses so their lines retain normal reading order.
  var rows = Array.from({ length: 8 }, function () {
    return { node: element('g', { 'class': 'lr-transcript-row', opacity: '0' }, transcript), key: null, tokens: [] };
  });
  function buildLine(row, event) {
    row.node.replaceChildren(); row.tokens = []; row.key = event.ordinal;
    row.node.setAttribute('data-kind', event.line.kind);
    function glyph(x, delay, seed) {
      var node = element('path', { d: glyphs[seed % glyphs.length], transform: 'translate(' + x + ' 0)', 'class': 'lr-transcript-glyph' }, row.node);
      row.tokens.push({ node: node, delay: delay });
    }
    if (event.line.kind === 'answer') {
      ['Y', 'e', 's'].forEach(function (letter, index) {
        var node = element('text', { x: [0, 9, 16][index], y: 4, 'class': 'lr-transcript-answer' }, row.node, letter);
        row.tokens.push({ node: node, delay: index * 120 });
      });
    } else if (event.line.kind === 'tool') {
      glyph(0, 0, 1); glyph(32, 180, 3);
      var call = element('g', { transform: 'translate(64 0)', 'class': 'lr-tool-call', 'data-budget': event.line.budget }, row.node);
      element('rect', { x: 0, y: -11, width: 112, height: 22, rx: 3 }, call);
      element('text', { x: 56, y: 4, 'text-anchor': 'middle', 'class': 'lr-tool-label' }, call, 'Reasoning tool');
      row.tokens.push({ node: call, delay: 320, call: true });
      glyph(190, 550 + event.line.duration + 100, 4);
    } else {
      for (var i = 0; i < 6; i++) glyph(i * 34, i * 170, event.line.seed + i);
    }
  }
  function renderTranscript(time, history) {
    var events = [];
    history.forEach(function (response) {
      response.lines.forEach(function (line, index) {
        var at = response.start + line.at;
        if (at <= time) events.push({ at: at, line: line, ordinal: response.id * 4 + index,
          response: response.id, lineIndex: index, responseAt: response.start + response.lines[0].at });
      });
    });
    var latest = events[events.length - 1];
    var used = [];
    events.forEach(function (event, index) {
      var row = rows[((event.ordinal % rows.length) + rows.length) % rows.length];
      used.push(row);
      if (row.key !== event.ordinal) buildLine(row, event);
      var age = time - event.at;
      // Append within a response from top to bottom. Only a new response
      // pushes the preceding response down, preserving its reading order.
      var entering = ease((time - event.responseAt) / 420);
      var retiring = latest && event.response < latest.response;
      var push = retiring ? 112 * ease((time - latest.responseAt) / 600) : 0;
      var y = 140 + event.lineIndex * 26 + push - (1 - entering) * 26;
      row.node.setAttribute('data-order', event.ordinal);
      row.node.setAttribute('transform', 'translate(32 ' + y.toFixed(3) + ')');
      row.node.setAttribute('opacity', (ease(age / 180) * (retiring ? 1 - ease((time - latest.responseAt) / 600) : 1)).toFixed(3));
      row.tokens.forEach(function (token) {
        token.node.setAttribute('opacity', ease((age - token.delay) / 160).toFixed(3));
        if (token.call) token.node.setAttribute('data-active', age >= 550 && age < 550 + event.line.duration ? 'true' : 'false');
      });
    });
    rows.forEach(function (row) { if (used.indexOf(row) === -1) row.node.setAttribute('opacity', '0'); });
  }
  function draw(time) {
    var response = reduced.matches ? staticResponse : responseAt(time);
    var local = time - response.start;
    var call = response.calls.find(function (entry) { return local >= entry.callStart && local < entry.callStart + entry.duration; });
    var active = !!call;
    var age = active ? local - call.callStart : 0;
    var progress = active ? Math.max(0, Math.min(1, (age - 150) / (call.duration - 300))) : 0;
    var turn = progress * progress * progress * (progress * (progress * 6 - 15) + 10);
    var opening = active ? ease(age / 350) * (1 - ease((age - call.duration + 350) / 350)) : 0;
    scene.setAttribute('data-phase', active ? 'tool' : local < 1550 ? 'input' : 'writing');
    scene.setAttribute('data-uses-tool', String(response.calls.length > 0));
    scene.setAttribute('data-call-count', response.calls.length);
    scene.setAttribute('data-response', response.id);
    scene.setAttribute('data-budget', active ? call.budget : '');
    input.forEach(function (mark, index) {
      var travel = (local - index * 210) / 1100;
      mark.style.opacity = index < 3 && travel >= 0 && travel <= 1 ? '1' : '0';
      mark.setAttribute('transform', 'translate(' + (-24 + 132 * Math.max(0, Math.min(1, travel))).toFixed(3) + ' 65)');
    });
    // A full revolution lands at the exact starting pose; all eight parts close
    // before text resumes. Neither the model nor the transcript resets at a loop.
    model.style.transform = 'rotateX(-20deg) rotateY(' + (35 + turn * 360 * (active ? budgets[call.budget].turns : 1)).toFixed(4) + 'deg) rotateZ(-3deg)';
    var spread = 14 + 5 * opening;
    pieces.forEach(function (piece) {
      piece.style.transform = 'translate3d(' + (Number(piece.dataset.x) * spread).toFixed(4) + 'px,' + (Number(piece.dataset.y) * spread).toFixed(4) + 'px,' + (Number(piece.dataset.z) * spread).toFixed(4) + 'px)';
    });
    renderTranscript(time, reduced.matches ? [staticResponse] : responses);
    if (reduced.matches) {
      input.forEach(function (mark, index) {
        mark.style.opacity = index < 3 ? '1' : '0';
        mark.setAttribute('transform', 'translate(' + (8 + index * 27) + ' 65)');
      });
    }
  }
  function frame(now) {
    raf = 0;
    if (paused || reduced.matches || document.hidden) { last = null; return; }
    if (last !== null) elapsed += Math.min(now - last, 64);
    last = now; draw(elapsed); raf = requestAnimationFrame(frame);
  }
  function resume() {
    cancelAnimationFrame(raf); raf = 0; last = null;
    if (!paused && !reduced.matches && !document.hidden) raf = requestAnimationFrame(frame);
    button.textContent = paused ? '▶' : 'Ⅱ';
    button.setAttribute('aria-label', (paused ? 'Play' : 'Pause') + ' illustrative generation');
  }
  button.addEventListener('click', function () { paused = !paused; resume(); });
  document.addEventListener('visibilitychange', resume);
  reduced.addEventListener('change', function () { draw(reduced.matches ? staticResponse.end - 400 : elapsed); resume(); });
  root.querySelector('.lr-hero-art').setAttribute('aria-hidden', 'false');
  draw(reduced.matches ? staticResponse.end - 400 : 0); resume();
})();
