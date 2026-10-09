/* tristankayser.com — interactions
   Works without GSAP/Lenis (content is always visible); effects are layered on top.
   Respects prefers-reduced-motion and the footer "pause animations" toggle. */
(function () {
  'use strict';
  var root = document.documentElement;
  var MOTION = root.classList.contains('motion');
  var hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  // libraries blocked/failed → fall back to the static (always visible) version
  if (MOTION && !hasGsap) { root.classList.remove('motion'); root.classList.add('no-motion'); MOTION = false; }
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  // ─── LOADER + HERO INTRO ─────────────────────────────────
  var loader = $('#loader');
  var introDone = false;
  function intro() {
    if (introDone) return; introDone = true;
    if (loader) loader.classList.add('hidden');
    var bg = $('#heroBg'); if (bg) bg.classList.add('loaded');
    if (MOTION && hasGsap) {
      gsap.timeline({ defaults: { ease: 'power3.out' } })
        .from('.name-line', { yPercent: 110, duration: 1.1, stagger: .1 }, .15)
        .from('.hero-badge', { opacity: 0, y: 12, duration: .7 }, .1)
        .from('.hero-sub, .hero-sub2', { opacity: 0, y: 14, duration: .8, stagger: .08 }, .55)
        .from('.hero-ctas', { opacity: 0, y: 14, duration: .8 }, .75)
        .from('.hero-stats', { opacity: 0, duration: .8 }, .95)
        .from('.scroll-hint', { opacity: 0, duration: .7 }, 1.2);
    }
    setTimeout(function () { $$('.count').forEach(animateCounter); }, MOTION ? 900 : 0);
  }
  if (MOTION && loader) {
    window.addEventListener('load', function () { setTimeout(intro, 600); });
    setTimeout(intro, 2500); // never trap the visitor behind the loader
  } else {
    if (loader) loader.remove();
    intro();
  }

  // ─── LENIS SMOOTH SCROLL ─────────────────────────────────
  var lenis = null;
  if (MOTION && typeof window.Lenis !== 'undefined') {
    lenis = new Lenis({ lerp: .09, smoothWheel: true });
    if (hasGsap) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
    } else {
      (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(0);
    }
  }
  function scrollToEl(el) {
    var off = -(parseInt(getComputedStyle(root).getPropertyValue('--nav-h'), 10) || 68) - 12;
    if (lenis) lenis.scrollTo(el, { offset: off, duration: 1.4 });
    else el.scrollIntoView({ behavior: MOTION ? 'smooth' : 'auto' });
    // move focus for keyboard / screen-reader users
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
    el.focus({ preventScroll: true });
  }

  // ─── SCROLL REVEALS ──────────────────────────────────────
  if (MOTION && hasGsap) {
    gsap.registerPlugin(ScrollTrigger);
    $$('.sec-header').forEach(function (el) {
      ScrollTrigger.create({ trigger: el, start: 'top 88%', once: true, onEnter: function () { el.classList.add('vis'); } });
    });
    ScrollTrigger.batch('.gs-reveal', {
      start: 'top 90%', once: true,
      onEnter: function (els) { gsap.to(els, { opacity: 1, y: 0, duration: .8, ease: 'power2.out', stagger: .07 }); }
    });
    ScrollTrigger.batch('.tl-item', {
      start: 'top 90%', once: true,
      onEnter: function (els) { gsap.to(els, { opacity: 1, x: 0, duration: .7, ease: 'power2.out', stagger: .1 }); }
    });
    // Training log: cells "boot" one after another like log lines
    ScrollTrigger.batch('.log-cell', {
      start: 'top 92%', once: true,
      onEnter: function (els) { gsap.from(els, { opacity: 0, y: 18, duration: .6, ease: 'power2.out', stagger: .06 }); }
    });
    ScrollTrigger.batch('.hl-node, .hl-svc, .hl-stat, .tb-group', {
      start: 'top 92%', once: true,
      onEnter: function (els) { gsap.from(els, { opacity: 0, y: 14, duration: .55, ease: 'power2.out', stagger: .05 }); }
    });
  }

  // ─── NAV: hide on scroll down, highlight current section ─
  var nav = $('#navbar'), lastY = 0;
  window.addEventListener('scroll', function () {
    var y = window.scrollY;
    if (nav) nav.classList.toggle('hidden', y > 120 && y > lastY && !document.body.classList.contains('menu-open'));
    lastY = y;
    if (topBtn) topBtn.classList.toggle('show', y > 700);
  }, { passive: true });
  // show nav again when keyboard focus lands in it
  if (nav) nav.addEventListener('focusin', function () { nav.classList.remove('hidden'); });

  var navMap = {};
  $$('.nav-links a[href^="#"]').forEach(function (a) { navMap[a.getAttribute('href').slice(1)] = a; });
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        Object.keys(navMap).forEach(function (k) { navMap[k].removeAttribute('aria-current'); });
        if (navMap[e.target.id]) navMap[e.target.id].setAttribute('aria-current', 'true');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    $$('main section[id]').forEach(function (s) { io.observe(s); });
  }

  // ─── IN-PAGE LINKS ───────────────────────────────────────
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href');
      if (id.length < 2) return;
      var t = document.getElementById(id.slice(1));
      if (!t) return;
      e.preventDefault();
      var delay = document.body.classList.contains('menu-open') ? 320 : 0;
      closeMenu();
      setTimeout(function () { scrollToEl(t); history.replaceState(null, '', id); }, delay);
    });
  });

  // ─── MOBILE MENU ─────────────────────────────────────────
  var ham = $('#hamburger'), mnav = $('#mobileNav');
  function setMenu(open) {
    if (!ham || !mnav) return;
    ham.setAttribute('aria-expanded', open ? 'true' : 'false');
    ham.setAttribute('aria-label', open ? ham.dataset.close : ham.dataset.open);
    mnav.classList.toggle('open', open);
    if (open) mnav.removeAttribute('inert'); else mnav.setAttribute('inert', '');
    document.body.classList.toggle('menu-open', open);
    document.body.style.overflow = open ? 'hidden' : '';
    if (lenis) { open ? lenis.stop() : lenis.start(); }
    $$('a', mnav).forEach(function (a, i) { a.style.transitionDelay = open ? (i * .05 + .08) + 's' : '0s'; });
    if (open) { var f = $('a', mnav); if (f) setTimeout(function () { f.focus(); }, 60); }
  }
  function closeMenu() { if (mnav && mnav.classList.contains('open')) { setMenu(false); ham.focus(); } }
  if (ham) ham.addEventListener('click', function () { setMenu(ham.getAttribute('aria-expanded') !== 'true'); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeMenu();
    // keep Tab inside the open menu (menu + hamburger)
    if (e.key === 'Tab' && mnav && mnav.classList.contains('open')) {
      var items = [ham].concat($$('a', mnav)), first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  // ─── BLINK CURSOR + TEXT SCRAMBLE (nav links) ────────────
  var CHARS = '.,·-─~+:;=*π┐┌┘┴┬╗╔╝╚╬╠╣╩╦║░▒▓█▄▀▌▐■!?&#$@0123456789';
  $$('.nav-links a, .mobile-nav > a').forEach(function (a) {
    var label = a.querySelector('.lbl');
    if (!label) return;
    if (a.closest('.nav-links')) {
      var cur = document.createElement('span'); cur.className = 'blink-cur'; cur.setAttribute('aria-hidden', 'true'); a.appendChild(cur);
    }
    if (!MOTION) return;
    var original = label.textContent, raf = null;
    a.setAttribute('aria-label', original);          // screen readers always get the real word
    label.setAttribute('aria-hidden', 'true');
    function run() {
      if (!MOTION) return;
      cancelAnimationFrame(raf);
      var start = null, len = original.length;
      (function tick(now) {
        if (!start) start = now;
        var p = Math.min((now - start) / 480, 1), out = '';
        for (var i = 0; i < len; i++) {
          var ch = original[i];
          out += (ch === ' ' || p * (len + 3) - i > 2) ? ch : CHARS[(Math.random() * CHARS.length) | 0];
        }
        label.textContent = out;
        if (p < 1) raf = requestAnimationFrame(tick); else label.textContent = original;
      })(performance.now());
    }
    function reset() { cancelAnimationFrame(raf); label.textContent = original; }
    a.addEventListener('mouseenter', run); a.addEventListener('focus', run);
    a.addEventListener('mouseleave', reset); a.addEventListener('blur', reset);
  });

  // ─── MAGNETIC BUTTONS ────────────────────────────────────
  if (MOTION && hasGsap && window.matchMedia('(hover:hover)').matches) {
    $$('.magnetic').forEach(function (btn) {
      btn.addEventListener('mousemove', function (e) {
        var r = btn.getBoundingClientRect();
        gsap.to(btn, { x: (e.clientX - r.left - r.width / 2) * .3, y: (e.clientY - r.top - r.height / 2) * .3, duration: .4, ease: 'power3.out' });
      });
      btn.addEventListener('mouseleave', function () { gsap.to(btn, { x: 0, y: 0, duration: .7, ease: 'elastic.out(1,0.4)' }); });
    });
  }

  // ─── COUNTERS ────────────────────────────────────────────
  function animateCounter(el) {
    var target = parseInt(el.getAttribute('data-target'), 10) || 0;
    if (!MOTION) { el.textContent = target; return; }
    var start = performance.now();
    (function tick(now) {
      var t = Math.min((now - start) / 1400, 1);
      el.textContent = Math.round((1 - Math.pow(1 - t, 3)) * target);
      if (t < 1) requestAnimationFrame(tick);
    })(start);
  }

  // ─── LANGUAGE PIPS (CEFR) ────────────────────────────────
  $$('.pips').forEach(function (row) {
    var pips = $$('.pip.on', row);
    if (!MOTION || !('IntersectionObserver' in window)) { pips.forEach(function (p) { p.classList.add('lit'); }); return; }
    var ob = new IntersectionObserver(function (en) {
      if (!en[0].isIntersecting) return;
      pips.forEach(function (p, i) { setTimeout(function () { p.classList.add('lit'); }, i * 90 + 120); });
      ob.disconnect();
    }, { threshold: .5 });
    ob.observe(row);
  });

  // ─── BACK TO TOP ─────────────────────────────────────────
  var topBtn = $('#scrollTop');
  if (topBtn) topBtn.addEventListener('click', function () {
    if (lenis) lenis.scrollTo(0, { duration: 1.6 }); else window.scrollTo({ top: 0, behavior: MOTION ? 'smooth' : 'auto' });
    var h1 = $('#hero-title'); if (h1) { h1.setAttribute('tabindex', '-1'); h1.focus({ preventScroll: true }); }
  });

  // ─── PAUSE / PLAY ANIMATIONS (WCAG 2.2.2) ────────────────
  var toggle = $('#motionToggle');
  function pauseSvg() { $$('svg.flow').forEach(function (s) { if (s.pauseAnimations) s.pauseAnimations(); }); }
  if (!MOTION) pauseSvg();
  if (toggle) {
    toggle.textContent = MOTION ? toggle.dataset.pause : toggle.dataset.play;
    toggle.setAttribute('aria-pressed', MOTION ? 'false' : 'true');
    toggle.addEventListener('click', function () {
      if (MOTION) {
        try { localStorage.setItem('tk-motion', 'off'); } catch (e) {}
        root.classList.remove('motion'); root.classList.add('no-motion');
        if (lenis) lenis.destroy();
        if (hasGsap) { ScrollTrigger.getAll().forEach(function (t) { t.kill(); }); gsap.globalTimeline.clear(); gsap.set('.gs-reveal,.tl-item,.log-cell,.hl-node,.hl-svc,.hl-stat,.tb-group,.name-line,.hero-badge,.hero-sub,.hero-sub2,.hero-ctas,.hero-stats,.scroll-hint', { clearProps: 'all' }); }
        $$('.sec-header').forEach(function (h) { h.classList.add('vis'); });
        $$('.pip.on').forEach(function (p) { p.classList.add('lit'); });
        pauseSvg();
        MOTION = false;
        toggle.textContent = toggle.dataset.play; toggle.setAttribute('aria-pressed', 'true');
      } else {
        try { localStorage.setItem('tk-motion', 'on'); } catch (e) {}
        location.reload();
      }
    });
  }

  // ─── FOOTER YEAR ─────────────────────────────────────────
  $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
