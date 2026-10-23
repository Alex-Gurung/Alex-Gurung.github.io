/* LiteReason section bar, following the diversity page's navigation pattern. */
(function () {
  'use strict';
  var root = document.querySelector('.litereason-project');
  if (!root) return;
  var hero = root.querySelector('.project-hero');
  var targets = Array.from(root.querySelectorAll('.project-content > h2'));
  var citation = root.querySelector('#citation');
  if (citation) targets.push(citation);
  var labels = ['TL;DR', 'Framework', 'Narrative Steps', 'Results', 'Efficiency', 'Reward Shaping', 'General Capabilities', 'Model Families', 'Takeaways', 'Citation'];
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  function html(tag, attrs, parent, text) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (key) { node.setAttribute(key, attrs[key]); });
    if (text != null) node.textContent = text;
    if (parent) parent.appendChild(node);
    return node;
  }
  var bar = html('nav', { 'class': 'lr-secnav', 'aria-label': 'On this page' }, root);
  var inner = html('div', { 'class': 'lr-secnav-inner' }, bar);
  var links = targets.map(function (target, index) {
    if (!target.id) target.id = 'lr-section-' + index;
    var label = labels[index] || target.textContent;
    var link = html('a', { href: '#' + target.id }, inner, label);
    link.addEventListener('click', function (event) {
      // Preserve open-in-new-tab and other native modified-click behavior.
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
      target.scrollIntoView({ behavior: reduced.matches ? 'auto' : 'smooth', block: 'start' });
      history.replaceState(null, '', '#' + target.id);
    });
    return link;
  });
  var header = document.getElementById('navbar');
  var current = -1, ticking = false, tops = [], heroBottom = 0, headerBottom = 0;
  function measure() {
    headerBottom = header ? Math.max(0, Math.ceil(header.getBoundingClientRect().bottom)) : 0;
    bar.style.top = headerBottom + 'px';
    root.style.setProperty('--lr-secnav-offset', (headerBottom + bar.getBoundingClientRect().height + 20) + 'px');
    tops = targets.map(function (target) { return target.getBoundingClientRect().top + window.scrollY; });
    heroBottom = hero.getBoundingClientRect().bottom + window.scrollY;
    spy();
  }
  function spy() {
    ticking = false;
    var shown = window.scrollY + headerBottom >= heroBottom;
    bar.classList.toggle('is-shown', shown);
    bar.inert = !shown;
    bar.setAttribute('aria-hidden', String(!shown));
    var line = window.scrollY + headerBottom + Math.min(200, window.innerHeight * .25), index = 0;
    tops.forEach(function (top, i) { if (top <= line) index = i; });
    if (index === current) return;
    current = index;
    links.forEach(function (link, i) {
      if (i === index) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    var on = links[index];
    if (on && inner.scrollWidth > inner.clientWidth) {
      inner.scrollTo({ left: on.offsetLeft - inner.clientWidth / 2 + on.offsetWidth / 2, behavior: reduced.matches ? 'auto' : 'smooth' });
    }
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(spy); }
  }, { passive: true });
  window.addEventListener('resize', measure);
  window.addEventListener('load', measure);
  if ('ResizeObserver' in window) {
    var observer = new ResizeObserver(measure);
    observer.observe(root);
    if (header) observer.observe(header);
  }
  measure();
})();
