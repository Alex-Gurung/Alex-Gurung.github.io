/* Existing illustrative generation preview, preserved from litereason-charts.js. */
(function () {
  'use strict';
  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var animGen = 0; // generation counter for safe cancellation

  function initGenAnimation() {
    var output = document.getElementById('gen-output');
    if (!output) return;
    var cursor = document.getElementById('gen-cursor');

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

    function resetOutput() {
      output.innerHTML = '';
      cursor = document.createElement('span');
      cursor.id = 'gen-cursor';
      cursor.className = 'gen-cursor';
      output.appendChild(cursor);
    }

    function appendBeforeCursor(node) {
      output.insertBefore(node, cursor);
    }

    function hasGeneratedText() {
      return output.textContent.length > 0;
    }

    function setButtonPaused(paused) {
      var btn = document.getElementById('gen-play-pause');
      if (!btn) return;
      btn.dataset.paused = paused ? '1' : '0';
      btn.textContent = paused ? '▶' : '⏸';
      btn.setAttribute('aria-label', paused ? 'Replay generation preview' : 'Pause generation preview');
    }

    // Static render of the full trace for prefers-reduced-motion.
    function renderStatic() {
      animGen++;
      resetOutput();
      seq.forEach(function (seg) {
        var s = document.createElement('span');
        if (seg.t === 'd') {
          s.className = 'gen-token discrete visible';
          s.textContent = (hasGeneratedText() ? ' ' : '') + seg.w.join(' ');
        } else if (seg.t === 'l') {
          s.className = 'gen-thought-tag visible';
          s.textContent = ' <implicit_thought>' + seg.n + '</implicit_thought>';
        } else {
          s.className = 'gen-token discrete visible';
          s.textContent = ' ' + seg.text;
          s.style.fontWeight = 'bold';
        }
        appendBeforeCursor(s);
      });
      cursor.classList.add('is-hidden');
    }

    function run() {
      setButtonPaused(false);
      var thisGen = ++animGen;
      resetOutput();
      var delay = 0;
      var SPEED_SCALE = 1.1;
      var TOKEN_MS = 90 * SPEED_SCALE;
      var TAG_MS = 60 * SPEED_SCALE;
      var LATENT_STEP_MS = 400 * SPEED_SCALE;

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
              s.textContent = (hasGeneratedText() ? ' ' : '') + word;
              appendBeforeCursor(s);
              requestAnimationFrame(function () { s.classList.add('visible'); });
            });
          });
        } else if (seg.t === 'l') {
          var latentIndicator = null;
          // Render the <implicit_thought> opening tag
          schedule(TOKEN_MS, function () {
            var tag = document.createElement('span');
            tag.className = 'gen-thought-tag';
            tag.textContent = ' <implicit_thought>';
            appendBeforeCursor(tag);
            requestAnimationFrame(function () { tag.classList.add('visible'); });
          });
          // Render the number
          schedule(TAG_MS, function () {
            var num = document.createElement('span');
            num.className = 'gen-thought-tag';
            num.textContent = String(seg.n);
            appendBeforeCursor(num);
            requestAnimationFrame(function () { num.classList.add('visible'); });
          });
          // Render closing tag
          schedule(TAG_MS, function () {
            var ctag = document.createElement('span');
            ctag.className = 'gen-thought-tag';
            ctag.textContent = '</implicit_thought>';
            appendBeforeCursor(ctag);
            requestAnimationFrame(function () { ctag.classList.add('visible'); });
          });
          // Show pulsing latent dots
          schedule(100 * SPEED_SCALE, function () {
            var indicator = document.createElement('span');
            indicator.className = 'gen-latent-indicator';
            for (var i = 0; i < seg.n; i++) {
              var dot = document.createElement('span');
              dot.className = 'gen-latent-dot';
              indicator.appendChild(dot);
            }
            latentIndicator = indicator;
            appendBeforeCursor(indicator);
          });
          // Wait for latent steps to "complete"
          delay += seg.n * LATENT_STEP_MS;
          schedule(0, function () {
            // Remove the pulsing dots after latent reasoning completes
            if (latentIndicator && latentIndicator.parentNode) latentIndicator.remove();
          });
        } else if (seg.t === 'a') {
          schedule(TOKEN_MS * 2, function () {
            var s = document.createElement('span');
            s.className = 'gen-token discrete';
            s.textContent = ' ' + seg.text;
            s.style.fontWeight = 'bold';
            appendBeforeCursor(s);
            requestAnimationFrame(function () { s.classList.add('visible'); });
          });
        }
      });

      // Finish: hide the cursor and offer replay instead of looping forever.
      schedule(900 * SPEED_SCALE, function () {
        cursor.classList.add('is-hidden');
        setButtonPaused(true);
      });
    }

    window.toggleAnimation = function () {
      if (prefersReducedMotion) {
        renderStatic();
        setButtonPaused(true);
        return;
      }
      var btn = document.getElementById('gen-play-pause');
      if (btn.dataset.paused === '1') {
        setButtonPaused(false);
        run();
      } else {
        setButtonPaused(true);
        animGen++; // invalidate all pending callbacks
        if (cursor) cursor.classList.add('is-hidden');
      }
    };

    if (prefersReducedMotion) {
      renderStatic();
      setButtonPaused(true);
    } else if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function (entries) {
        if (entries.some(function (entry) { return entry.isIntersecting; })) {
          observer.disconnect();
          run();
        }
      }, { threshold: 0.3 });
      observer.observe(output);
    } else {
      run();
    }
  }


  initGenAnimation();
})();
