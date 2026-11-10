/* =====================================================================
   AI-governance review triggers: demo behaviour (welcomeadvice.nl)
   Plain JavaScript, no dependencies. Nothing is stored or sent anywhere.

   Routes   #/<module>[/<record>[/<tab>]][?at=<element id>][&s=<scenario>]
   Scenario elements carry data-only / data-hide-in / data-flags; the active
            simulated change switches them. Change records list everything
            flagged, plus the records that need no review.
   Tour     guided tour defined in tour.toml (passed in #ar-config).
   ===================================================================== */
(function () {
  'use strict';

  var root = document.getElementById('ar-demo');
  var configNode = document.getElementById('ar-config');
  if (!root || !configNode) { return; }
  var CFG;
  try { CFG = JSON.parse(configNode.textContent); } catch (err) { return; }

  var SCEN = {};
  CFG.scenarios.forEach(function (s) { SCEN[s.id] = s; });

  function $(sel, ctx) { return (ctx || root).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || root).querySelectorAll(sel)); }
  function tokens(el, attr) { return (el.getAttribute(attr) || '').split(/\s+/).filter(Boolean); }
  function has(el, attr, value) { return tokens(el, attr).indexOf(value) >= 0; }
  function shown(el) { return !el.hidden; }

  var views = $$('.ar-view');
  var viewByKey = {};
  views.forEach(function (v) { viewByKey[v.getAttribute('data-view')] = v; });

  /* ---------------------------------------------------------------- Dates */
  var now = new Date();
  var TODAY = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  function addDays(n) { return new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() + n); }
  function fmt(d) { return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); }
  function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  $$('time[data-offset]').forEach(function (t) {
    var d = addDays(parseInt(t.getAttribute('data-offset'), 10) || 0);
    t.textContent = fmt(d);
    t.setAttribute('datetime', iso(d));
  });
  // A regulation change takes effect on the first day of a month, at least 120 days out.
  var effective = addDays(120);
  if (effective.getDate() !== 1) { effective = new Date(effective.getFullYear(), effective.getMonth() + 1, 1); }
  var effectiveDays = Math.round((effective - TODAY) / 86400000);
  $$('[data-effective]').forEach(function (t) { t.textContent = fmt(effective); t.setAttribute('datetime', iso(effective)); });
  $$('[data-days-to-effective]').forEach(function (t) { t.textContent = 'in ' + effectiveDays + ' days'; });

  /* ---------------------------------------------------------------- Links carry the scenario */
  var links = $$('a[href^="#/"]');
  links.forEach(function (a) { a.setAttribute('data-href0', a.getAttribute('href')); });
  function withScenario(href, s) {
    return s ? href + (href.indexOf('?') >= 0 ? '&' : '?') + 's=' + encodeURIComponent(s) : href;
  }
  function updateLinks(s) {
    links.forEach(function (a) { a.setAttribute('href', withScenario(a.getAttribute('data-href0'), s)); });
  }

  /* ---------------------------------------------------------------- Routing */
  var state = { scenario: undefined, viewKey: null, tab: null };

  function parse() {
    var h = location.hash.replace(/^#\/?/, '');
    var query = '';
    var i = h.indexOf('?');
    if (i >= 0) { query = h.slice(i + 1); h = h.slice(0, i); }
    var params = {};
    query.split('&').forEach(function (p) {
      if (!p) { return; }
      var kv = p.split('=');
      params[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || '');
    });
    var parts = h.split('/').filter(Boolean);
    return { parts: parts.length ? parts : ['dashboard'], s: params.s || null, at: params.at || null };
  }
  function hashFor(parts, s, at) {
    var q = [];
    if (at) { q.push('at=' + encodeURIComponent(at)); }
    if (s) { q.push('s=' + encodeURIComponent(s)); }
    return '#/' + parts.join('/') + (q.length ? '?' + q.join('&') : '');
  }
  function viewFor(parts) {
    return viewByKey[parts.slice(0, 2).join('/')] || viewByKey[parts[0]] || null;
  }

  function route() {
    var r = parse();
    var view = viewFor(r.parts);
    if (!view) { r.parts = ['dashboard']; view = viewByKey.dashboard; }
    var key = view.getAttribute('data-view');
    var forced = view.getAttribute('data-scenario-view');
    if (forced && r.s !== forced) { location.replace(hashFor(r.parts, forced, r.at)); return; }

    var previous = state.scenario;
    var s = r.s && SCEN[r.s] ? r.s : null;
    applyScenario(s);
    if (previous !== undefined && previous !== s) { announceScenario(s); }

    var tab = activateTab(view, key.indexOf('/') >= 0 ? r.parts[2] : null);
    var moved = key !== state.viewKey || tab !== state.tab;
    views.forEach(function (v) { v.hidden = v !== view; });
    state.viewKey = key;
    state.tab = tab;
    setNav(r.parts[0]);
    document.title = view.getAttribute('data-title') + ' · ' + CFG.product;
    closeNav();

    var target = r.at ? document.getElementById(r.at) : null;
    if (target) { target.scrollIntoView({ block: 'start' }); }
    else if (moved) { window.scrollTo(0, 0); }
    if (moved && !tour.active) {
      var h1 = $('h1', view);
      if (h1) { h1.focus({ preventScroll: true }); }
    }
    markScrollers();
    tour.onRoute();
  }

  /* Tables that scroll sideways on narrow screens must be reachable by keyboard */
  function markScrollers() {
    $$('.ar-tablewrap').forEach(function (w) {
      var scrolls = w.scrollWidth > w.clientWidth + 1;
      if (scrolls && !w.hasAttribute('tabindex')) {
        var table = w.querySelector('table[aria-label]');
        var box = w.closest('section');
        var heading = box && box.querySelector('h2, h3');
        w.setAttribute('tabindex', '0');
        w.setAttribute('role', 'group');
        w.setAttribute('aria-label', table ? table.getAttribute('aria-label') : heading ? heading.textContent.trim() : 'Table');
      } else if (!scrolls && w.hasAttribute('tabindex')) {
        w.removeAttribute('tabindex');
        w.removeAttribute('role');
        w.removeAttribute('aria-label');
      }
    });
  }
  var scrollerFrame = 0;
  window.addEventListener('resize', function () {
    window.cancelAnimationFrame(scrollerFrame);
    scrollerFrame = window.requestAnimationFrame(markScrollers);
  });

  function activateTab(view, tab) {
    var panels = $$('.ar-tabpanel', view);
    if (!panels.length) { return null; }
    var names = panels.map(function (p) { return p.getAttribute('data-tab'); });
    if (names.indexOf(tab) < 0) { tab = names[0]; }
    panels.forEach(function (p) { p.hidden = p.getAttribute('data-tab') !== tab; });
    $$('[data-tab-link]', view).forEach(function (a) {
      if (a.getAttribute('data-tab-link') === tab) { a.setAttribute('aria-current', 'page'); }
      else { a.removeAttribute('aria-current'); }
    });
    return tab;
  }

  function setNav(module) {
    $$('[data-nav]').forEach(function (a) {
      var on = a.getAttribute('data-nav') === module;
      a.classList.toggle('is-active', on);
      if (on) { a.setAttribute('aria-current', 'page'); } else { a.removeAttribute('aria-current'); }
    });
  }

  /* ---------------------------------------------------------------- Scenarios */
  function applyScenario(s) {
    if (s === state.scenario) { return; }
    state.scenario = s;
    root.setAttribute('data-scenario', s || '');
    $$('[data-only]').forEach(function (el) { el.hidden = !(s && has(el, 'data-only', s)); });
    $$('[data-hide-in]').forEach(function (el) { el.hidden = !!(s && has(el, 'data-hide-in', s)); });
    $$('[data-flags]').forEach(function (el) { el.classList.toggle('is-flagged', !!(s && has(el, 'data-flags', s))); });

    // Inside a record with flagged items, everything not flagged gets "No review needed".
    $$('[data-clear]').forEach(function (t) { t.hidden = true; });
    if (s) {
      $$('[data-record]').forEach(function (record) {
        if (!record.querySelector('[data-reviewable].is-flagged')) { return; }
        $$('[data-reviewable]', record).forEach(function (item) {
          if (item.classList.contains('is-flagged')) { return; }
          var tag = item.querySelector('[data-clear]');
          if (tag && tag.closest('[data-reviewable]') === item) { tag.hidden = false; }
        });
      });
    }
    updateLinks(s);
    updateCounts();
    buildImpact();
    updateDemoBar();
  }

  function setCount(name, n) {
    $$('[data-count="' + name + '"]').forEach(function (c) { c.textContent = String(n); });
  }

  function updateCounts() {
    var s = state.scenario;
    setCount('open-tasks', $$('[data-view="tasks"] [data-task-row][data-open]').filter(shown).length);
    var risks = $$('[data-view="risks"] [data-risk-row]').filter(shown);
    setCount('risks', risks.length);
    setCount('high-risks', risks.filter(function (r) { return r.hasAttribute('data-high'); }).length);
    setCount('measures', $$('[data-view="measures"] [data-measure-row]').filter(shown).length);
    setCount('asm-action', $$('[data-asm-row]').filter(function (r) {
      return r.hasAttribute('data-needs-action') || (s && has(r, 'data-action-in', s));
    }).length);
    $$('[data-count="changes"]').forEach(function (c) { c.hidden = !s; });
    $$('[data-bell]').forEach(function (b) { b.hidden = !s; });

    // Record tabs count the rows that are visible in their subgrid.
    $$('[data-count-rows]').forEach(function (c) {
      var panel = document.getElementById(c.getAttribute('data-count-rows'));
      c.textContent = panel ? String($$('tbody tr', panel).filter(function (tr) { return shown(tr) && !tr.hasAttribute('data-empty'); }).length) : '0';
    });
    $$('tbody').forEach(function (tb) {
      var empty = tb.querySelector('tr[data-empty]');
      if (!empty) { return; }
      empty.hidden = $$('tr', tb).some(function (tr) { return tr !== empty && shown(tr); });
    });

    CFG.scenarios.forEach(function (sc) {
      var n = $$('[data-view="tasks"] [data-task-row]').filter(function (tr) { return has(tr, 'data-only', sc.id); }).length;
      $$('[data-task-count="' + sc.id + '"]').forEach(function (c) { c.textContent = String(n); });
    });

    var visibleDeadlines = 0;
    $$('[data-deadlines] > li').forEach(function (li) {
      li.classList.remove('is-overflow');
      if (shown(li)) { visibleDeadlines += 1; if (visibleDeadlines > 6) { li.classList.add('is-overflow'); } }
    });
  }

  var KIND_ORDER = ['AI system', 'Vendor', 'Policy', 'Policy section', 'Assessment answer', 'Approval', 'Risk', 'Measure'];
  function buildImpact() {
    var s = state.scenario;
    $$('[data-impact-rows]').forEach(function (tb) { tb.textContent = ''; });
    $$('[data-clear-list]').forEach(function (p) { p.textContent = ''; });
    if (!s) { return; }

    var items = $$('[data-reviewable]').filter(function (el) { return has(el, 'data-flags', s); });
    items.sort(function (a, b) { return KIND_ORDER.indexOf(a.getAttribute('data-kind')) - KIND_ORDER.indexOf(b.getAttribute('data-kind')); });
    $$('[data-impact-count="' + s + '"]').forEach(function (c) { c.textContent = String(items.length); });

    var tbody = $('[data-impact-rows="' + s + '"]');
    if (tbody) {
      items.forEach(function (el) {
        var tag = el.querySelector('.ar-tag--review[data-only~="' + s + '"]');
        var tr = document.createElement('tr');
        tr.className = 'is-flagged';
        tr.setAttribute('data-flags', s);
        var td1 = document.createElement('td');
        td1.className = 'ar-cell-main';
        var a = document.createElement('a');
        a.className = 'ar-rowlink';
        a.href = withScenario(el.getAttribute('data-href'), s);
        a.textContent = el.getAttribute('data-label');
        td1.appendChild(a);
        var td2 = document.createElement('td');
        td2.textContent = el.getAttribute('data-kind');
        var td3 = document.createElement('td');
        td3.textContent = tag ? tag.textContent : '';
        tr.appendChild(td1); tr.appendChild(td2); tr.appendChild(td3);
        tbody.appendChild(tr);
      });
    }

    // Records that need no review: AI systems, policies and assessments without anything flagged.
    var clearList = $('[data-clear-list="' + s + '"]');
    if (clearList) {
      ['ai-systems/', 'policies/', 'assessments/'].forEach(function (prefix) {
        views.forEach(function (v) {
          var key = v.getAttribute('data-view');
          if (key.indexOf(prefix) !== 0 || !v.hasAttribute('data-record')) { return; }
          var flagged = $$('[data-reviewable]', v).some(function (el) { return has(el, 'data-flags', s); });
          if (flagged) { return; }
          var link = document.createElement('a');
          link.className = 'ar-ref';
          link.href = withScenario('#/' + key, s);
          link.textContent = v.getAttribute('data-title');
          clearList.appendChild(link);
          clearList.appendChild(document.createTextNode(' '));
        });
      });
    }
    $$('[data-impact-count]').forEach(function (c) {
      if (c.getAttribute('data-impact-count') !== s) { c.textContent = '0'; }
    });
  }

  function updateDemoBar() {
    var s = state.scenario;
    var sc = s ? SCEN[s] : null;
    $('#ar-status').hidden = !sc;
    if (sc) {
      var a = $('#ar-active-link');
      a.textContent = sc.name;
      a.setAttribute('data-href0', '#/triggers/' + sc.change);
      a.setAttribute('href', withScenario('#/triggers/' + sc.change, s));
    }
    $$('.ar-choice').forEach(function (b) {
      var on = b.getAttribute('data-scenario') === s;
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      var badge = b.querySelector('.ar-choice__active');
      if (badge) { badge.hidden = !on; }
    });
  }

  var live = $('#ar-live');
  function announce(message) {
    live.textContent = '';
    window.setTimeout(function () { live.textContent = message; }, 60);
  }
  function announceScenario(s) {
    if (!s) { announce('Back to the baseline: no simulated change.'); return; }
    var n = $$('[data-reviewable]').filter(function (el) { return has(el, 'data-flags', s); }).length;
    var t = $$('[data-view="tasks"] [data-task-row]').filter(function (tr) { return has(tr, 'data-only', s); }).length;
    announce('Simulating: ' + SCEN[s].name + '. ' + n + ' items flagged for review, ' + t + ' tasks created.');
  }

  /* ---------------------------------------------------------------- Scenario chooser */
  var dialog = document.getElementById('ar-scenarios');
  function openScenarios() {
    if (!dialog || dialog.open) { return; }
    if (tour.active || typeof dialog.showModal !== 'function') {
      dialog.classList.add('is-nonmodal');
      dialog.show();
    } else {
      dialog.classList.remove('is-nonmodal');
      dialog.showModal();
    }
  }
  function closeScenarios() { if (dialog && dialog.open) { dialog.close(); } }
  function choose(id) {
    var sc = SCEN[id];
    if (!sc) { return; }
    closeScenarios();
    location.hash = hashFor(['triggers', sc.change], id);
  }
  if (dialog) {
    dialog.addEventListener('click', function (e) { if (e.target === dialog) { closeScenarios(); } });
  }

  $('#ar-reset').addEventListener('click', function () {
    var r = parse();
    var view = viewFor(r.parts);
    var parts = view && view.hasAttribute('data-scenario-view') ? ['triggers'] : r.parts;
    location.hash = hashFor(parts, null, null);
  });

  root.addEventListener('click', function (e) {
    var opener = e.target.closest('[data-open-scenarios]');
    if (opener) {
      // Outside the tour's own "Simulate a change" step, the visitor takes over: the tour switches off.
      if (tour.active && !tour.isTarget(opener)) { tour.off(); }
      openScenarios();
      return;
    }
    var choice = e.target.closest('.ar-choice');
    if (choice) { choose(choice.getAttribute('data-scenario')); return; }
    if (e.target.closest('[data-close-dialog]')) { closeScenarios(); return; }
    if (e.target.closest('[data-start-tour]')) { tour.restart(); }
  });

  /* ---------------------------------------------------------------- Tour controls in the demo bar */
  var tourToggle = $('#ar-tour-toggle');
  tourToggle.addEventListener('click', function () { if (tour.active) { tour.off(); } else { tour.on(); } });
  $('#ar-tour-restart').addEventListener('click', function () { tour.restart(); });

  /* ---------------------------------------------------------------- Pinned demo bar height (wide screens) */
  var demoBar = $('#ar-demobar');
  var appTop = $('.ar-top');
  function measureBar() {
    var pinned = window.getComputedStyle(demoBar).position === 'sticky';
    root.style.setProperty('--demo-h', (pinned ? demoBar.offsetHeight : 0) + 'px');
  }
  measureBar();
  if (window.ResizeObserver) { new ResizeObserver(measureBar).observe(demoBar); }
  window.addEventListener('resize', measureBar);

  /* ---------------------------------------------------------------- Navigation drawer (narrow screens) */
  var menuButton = $('#ar-menu');
  var scrim = $('#ar-scrim');
  function openNav() {
    root.classList.add('is-nav-open');
    menuButton.setAttribute('aria-expanded', 'true');
    scrim.hidden = false;
    var first = $('.ar-side .ar-nav__item');
    if (first) { first.focus(); }
  }
  function closeNav() {
    if (!root.classList.contains('is-nav-open')) { return; }
    root.classList.remove('is-nav-open');
    menuButton.setAttribute('aria-expanded', 'false');
    scrim.hidden = true;
  }
  menuButton.addEventListener('click', function () {
    if (root.classList.contains('is-nav-open')) { closeNav(); menuButton.focus(); } else { openNav(); }
  });
  scrim.addEventListener('click', closeNav);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && root.classList.contains('is-nav-open')) { closeNav(); menuButton.focus(); }
  });

  /* ---------------------------------------------------------------- Guided tour
     An overlay over the whole page. The switch in the demo bar turns it off and
     on again (it resumes where it was); Restart starts from the welcome card.
     Steps come from tour.toml: modal (centred card), tooltip (highlight + Next)
     and hotspot (the visitor clicks the highlighted element, or presses Next). */
  var tour = (function () {
    var steps = CFG.tour || [];
    var last = steps.length - 1;
    var index = -1;
    var resumeAt = 0;
    var ui = null;
    var pendingAdvance = false;
    var clickTarget = null;
    var narrowQuery = window.matchMedia('(max-width: 599.98px)');
    var RESTART_ICON = '<svg class="ar-ico ar-ico--xs" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3L4.5 9"/><path d="M4.5 4.5V9H9"/></svg>';
    var api = { active: false };

    function stepRoute(step) {
      return { parts: (step.route || 'dashboard').split('/'), s: step.scenario || null, at: step.at || null };
    }
    function matches(step) {
      var r = parse();
      var want = stepRoute(step);
      return r.parts.join('/') === want.parts.join('/') && (r.s || null) === want.s;
    }
    function inDialog(step) { return !!step.target && step.target.indexOf('.ar-choice') === 0; }

    function build() {
      ui = {};
      ui.layer = document.createElement('div');
      ui.layer.className = 'ar-tour';
      ui.layer.hidden = true;
      ui.shades = [0, 1, 2, 3].map(function () {
        var d = document.createElement('div');
        d.className = 'ar-tour__shade';
        ui.layer.appendChild(d);
        return d;
      });
      ui.ring = document.createElement('div');
      ui.ring.className = 'ar-tour__ring';
      ui.beacon = document.createElement('div');
      ui.beacon.className = 'ar-tour__beacon';
      ui.card = document.createElement('div');
      ui.card.className = 'ar-tour__card';
      ui.card.setAttribute('role', 'dialog');
      ui.card.setAttribute('aria-labelledby', 'ar-tour-title');
      ui.layer.appendChild(ui.ring);
      ui.layer.appendChild(ui.beacon);
      ui.layer.appendChild(ui.card);
      root.appendChild(ui.layer);

      ui.card.addEventListener('click', function (e) {
        var b = e.target.closest('[data-tour-action]');
        if (!b) { return; }
        var action = b.getAttribute('data-tour-action');
        if (action === 'next') { next(); }
        else if (action === 'back') { go(index - 1); }
        else if (action === 'off') { off(true); }
        else if (action === 'restart') { restart(); }
      });
      window.addEventListener('resize', place);
      window.addEventListener('scroll', place, { passive: true });
      if (dialog) { dialog.addEventListener('scroll', place, { passive: true }); }
      document.addEventListener('keydown', function (e) {
        if (!api.active) { return; }
        if (e.key === 'Escape') { e.preventDefault(); off(true); return; }
        var a = document.activeElement;
        if (a && a !== document.body && !ui.card.contains(a)) { return; }
        if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
        else if (e.key === 'ArrowLeft' && index > 0) { e.preventDefault(); go(index - 1); }
      });
    }

    /* ---- on, off, restart */
    function show() {
      if (!ui) { build(); }
      closeNav();
      api.active = true;
      ui.layer.hidden = false;
      root.classList.add('is-touring');
      tourToggle.setAttribute('aria-checked', 'true');
    }
    function on() {
      if (api.active) { return; }
      show();
      go(resumeAt);
    }
    function restart() {
      closeScenarios();
      show();
      go(0);
    }
    function off(moveFocus) {
      if (!api.active) { return; }
      api.active = false;
      resumeAt = index > 0 && index < last ? index : 0;
      index = -1;
      pendingAdvance = false;
      detachClick();
      ui.layer.hidden = true;
      root.classList.remove('is-touring');
      tourToggle.setAttribute('aria-checked', 'false');
      closeScenarios();
      // Without a route in the URL a reload would start the tour again.
      if (!location.hash || location.hash === '#' || location.hash === '#/') {
        try { history.replaceState(null, '', '#/dashboard'); } catch (err) { /* not available */ }
      }
      announce('Guided tour turned off. Use the switch in the demo bar to turn it on again.');
      if (moveFocus) { tourToggle.focus({ preventScroll: true }); }
    }

    /* ---- moving through the steps */
    function next() {
      var step = steps[index];
      if (!step) { return; }
      if (step.mode === 'hotspot' && step.target) {
        // "Next" on a click step does the click for the visitor.
        var el = root.querySelector(step.target);
        if (el) { pendingAdvance = true; el.click(); armFallback(); return; }
      }
      if (index >= last) { off(true); return; }
      go(index + 1);
    }
    function go(i) {
      if (i < 0 || i > last) { return; }
      index = i;
      pendingAdvance = false;
      detachClick();
      var step = steps[index];
      if (!inDialog(step)) { closeScenarios(); }
      if (!matches(step)) {
        var want = stepRoute(step);
        location.hash = hashFor(want.parts, want.s, want.at);
        return; // route() calls onRoute(), which draws the step
      }
      draw();
    }
    function onRoute() {
      if (!api.active || index < 0) { return; }
      if (pendingAdvance) {
        pendingAdvance = false;
        if (index < last) { go(index + 1); } else { off(); }
        return;
      }
      if (matches(steps[index])) { draw(); }
      else { off(); } // the visitor went somewhere else (Back button, Reset, a link): hand over
    }
    function armFallback() {
      // A click that does not change the route (opening the change chooser) advances here.
      window.setTimeout(function () {
        if (pendingAdvance && api.active) {
          pendingAdvance = false;
          if (index < last) { go(index + 1); }
        }
      }, 80);
    }
    function detachClick() {
      if (clickTarget) { clickTarget.removeEventListener('click', onTargetClick, true); clickTarget = null; }
    }
    function onTargetClick() {
      pendingAdvance = true;
      detachClick();
      armFallback();
    }
    function isTarget(el) {
      var step = steps[index];
      return !!(api.active && step && step.mode === 'hotspot' && step.target && root.querySelector(step.target) === el);
    }

    /* ---- drawing */
    function targetOf(step) {
      if (!step || !step.target || step.mode === 'modal') { return null; }
      var el = root.querySelector(step.target);
      if (!el) { return null; }
      var rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0 || window.getComputedStyle(el).visibility === 'hidden') { return null; }
      return el;
    }
    function draw() {
      var step = steps[index];
      if (inDialog(step)) { openScenarios(); }
      var el = targetOf(step);
      renderCard(step, !!el);
      root.style.setProperty('--tour-card-h', ui.card.offsetHeight + 'px');
      if (el) { reveal(el); }
      detachClick();
      if (el && step.mode === 'hotspot') {
        clickTarget = el;
        clickTarget.addEventListener('click', onTargetClick, true);
      }
      place();
      window.requestAnimationFrame(function () { place(); window.requestAnimationFrame(place); });
      var title = ui.card.querySelector('.ar-tour__title');
      if (title) { title.focus({ preventScroll: true }); }
    }

    function renderCard(step, hasTarget) {
      var numbered = step.mode !== 'modal';
      var total = steps.filter(function (s) { return s.mode !== 'modal'; }).length;
      var n = steps.slice(0, index + 1).filter(function (s) { return s.mode !== 'modal'; }).length;
      var html = '<div class="ar-tour__head"><p class="ar-tour__chapter">' + esc(step.chapter || '') + '</p>';
      if (numbered) {
        html += '<div class="ar-tour__tools">' +
          '<button type="button" class="ar-tour__tool" data-tour-action="restart">' + RESTART_ICON + 'Restart</button>' +
          '<button type="button" class="ar-tour__tool" data-tour-action="off">Turn off</button></div>';
      }
      html += '</div>';
      html += '<h2 class="ar-tour__title" id="ar-tour-title" tabindex="-1">' + esc(step.title || '') + '</h2>';
      html += '<div class="ar-tour__text">' + (step.text || '') + '</div>';
      if (step.mode === 'hotspot' && step.hint) {
        var hint = hasTarget ? step.hint : 'Press Next to open ' + step.hint.replace(/^(Click|Open) /, '');
        html += '<p class="ar-tour__hint"><span class="ar-dot" aria-hidden="true"></span>' + esc(hint) + '</p>';
      }
      html += '<div class="ar-tour__foot">';
      if (numbered) {
        html += '<div class="ar-tour__progress"><span>Step ' + n + ' of ' + total + '</span>' +
          '<span class="ar-tour__bar"><span style="width:' + Math.round(n / total * 100) + '%"></span></span></div>';
        html += '<div class="ar-tour__actions">';
        if (index > 0) { html += '<button type="button" class="ar-btn" data-tour-action="back">Back</button>'; }
        html += '<button type="button" class="ar-btn ar-btn--primary" data-tour-action="next">Next</button></div>';
      } else {
        var first = index === 0;
        html += '<span></span><div class="ar-tour__actions">';
        html += '<button type="button" class="ar-btn" data-tour-action="' + (first ? 'off' : 'restart') + '">' + esc(step.secondary || (first ? 'Explore on my own' : 'Restart the tour')) + '</button>';
        html += '<button type="button" class="ar-btn ar-btn--primary" data-tour-action="' + (first ? 'next' : 'off') + '">' + esc(step.cta || (first ? 'Start the tour' : 'Done')) + '</button></div>';
      }
      html += '</div>';
      ui.card.innerHTML = html;
      ui.card.classList.toggle('ar-tour__card--modal', !numbered);
    }
    function esc(t) {
      return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
    }

    /* Height of the bars pinned at the top (demo bar, app header) */
    function pinnedTop() {
      var h = 0;
      [demoBar, appTop].forEach(function (el) {
        if (window.getComputedStyle(el).position === 'sticky') { h += el.offsetHeight; }
      });
      return h;
    }
    function inPinned(el) {
      var box = el.closest('.ar-demo, .ar-side, .ar-top, .ar-dialog');
      if (!box) { return false; }
      var p = window.getComputedStyle(box).position;
      return p === 'sticky' || p === 'fixed';
    }
    /* Scroll so the target and the card fit between the pinned bars and the bottom edge */
    function reveal(el) {
      var box = el.closest('.ar-dialog');
      if (box) {
        // inside the change chooser: scroll the chooser, not the page
        var br = box.getBoundingClientRect();
        var er = el.getBoundingClientRect();
        if (er.bottom > br.bottom - 8) { box.scrollTop += er.bottom - br.bottom + 8; }
        else if (er.top < br.top + 8) { box.scrollTop -= br.top + 8 - er.top; }
        return;
      }
      if (inPinned(el)) { return; }
      var r = el.getBoundingClientRect();
      var vh = window.innerHeight;
      var top = pinnedTop() + 12;
      var bottom = vh - 12;
      var cardH = ui.card.offsetHeight + 14;
      if (narrowQuery.matches) { bottom = vh - ui.card.offsetHeight - 24; cardH = 0; }
      var room = bottom - top;
      var delta;
      if (r.height + cardH <= room) { delta = r.top - (top + (room - r.height - cardH) / 2); }
      else if (r.height <= room) { delta = r.top - (top + (room - r.height) / 2); }
      else { delta = r.top - top; }
      if (Math.abs(delta) > 1) { window.scrollBy(0, delta); }
    }

    function place() {
      if (!api.active || !ui || index < 0) { return; }
      var step = steps[index];
      var el = targetOf(step);
      var vw = document.documentElement.clientWidth;
      var vh = window.innerHeight;
      var card = ui.card;
      var cw = card.offsetWidth;
      var ch = card.offsetHeight;

      if (!el) {
        setBox(ui.shades[0], 0, 0, vw, vh);
        setBox(ui.shades[1], 0, 0, 0, 0);
        setBox(ui.shades[2], 0, 0, 0, 0);
        setBox(ui.shades[3], 0, 0, 0, 0);
        ui.ring.hidden = true;
        ui.beacon.hidden = true;
        card.style.left = Math.max(12, (vw - cw) / 2) + 'px';
        card.style.top = Math.max(12, (vh - ch) / 2) + 'px';
        return;
      }
      var r = el.getBoundingClientRect();
      var pad = 6;
      var floor = inPinned(el) ? 0 : pinnedTop();
      var x1 = Math.max(0, r.left - pad);
      var y1 = Math.min(vh, Math.max(floor, r.top - pad));
      var x2 = Math.min(vw, r.right + pad);
      var y2 = Math.max(y1, Math.min(vh, r.bottom + pad));
      setBox(ui.shades[0], 0, 0, vw, y1);
      setBox(ui.shades[1], 0, y2, vw, Math.max(0, vh - y2));
      setBox(ui.shades[2], 0, y1, x1, y2 - y1);
      setBox(ui.shades[3], x2, y1, Math.max(0, vw - x2), y2 - y1);
      ui.ring.hidden = false;
      setBox(ui.ring, x1, y1, x2 - x1, y2 - y1);
      ui.ring.classList.toggle('is-passive', step.mode !== 'hotspot');
      ui.beacon.hidden = step.mode !== 'hotspot';
      if (step.mode === 'hotspot') {
        // pulsing dot on the top-right corner of the highlight, clear of the label
        ui.beacon.style.left = (x2 - 3) + 'px';
        ui.beacon.style.top = (y1 + 3) + 'px';
      }
      if (narrowQuery.matches) {
        card.style.left = '';
        card.style.top = '';
        root.style.setProperty('--tour-card-h', ch + 'px');
        return;
      }

      var gap = 14;
      var safeTop = pinnedTop() + 12;
      var below = y2 + gap + ch <= vh - 12;
      var above = y1 - gap - ch >= safeTop;
      var right = x2 + gap + cw <= vw - 12;
      var left = x1 - gap - cw >= 12;
      var cx = Math.min(Math.max(12, x1), vw - cw - 12);
      var cy;
      if (el.closest('.ar-side') && right) { cx = x2 + gap; cy = clamp(y1 - 8, safeTop, vh - ch - 12); }
      else if (below) { cy = y2 + gap; }
      else if (above) { cy = y1 - gap - ch; }
      else if (right) { cx = x2 + gap; cy = clamp(y1, safeTop, vh - ch - 12); }
      else if (left) { cx = x1 - gap - cw; cy = clamp(y1, safeTop, vh - ch - 12); }
      else { cx = vw - cw - 16; cy = vh - ch - 16; }
      card.style.left = cx + 'px';
      card.style.top = cy + 'px';
    }
    function clamp(v, lo, hi) { return Math.max(lo, Math.min(v, Math.max(lo, hi))); }
    function setBox(node, x, y, w, h) {
      node.style.left = x + 'px';
      node.style.top = y + 'px';
      node.style.width = w + 'px';
      node.style.height = h + 'px';
    }

    api.on = on;
    api.off = off;
    api.restart = restart;
    api.onRoute = onRoute;
    api.isTarget = isTarget;
    return api;
  })();

  /* ---------------------------------------------------------------- Start */
  window.addEventListener('hashchange', route);
  var firstVisit = !location.hash || location.hash === '#' || location.hash === '#/';
  route();
  if (firstVisit && (CFG.tour || []).length) { tour.restart(); }
})();
