/* tristankayser.com — interactions
   Content is always visible without JS; effects are layered on top.
   Respects prefers-reduced-motion and the footer "pause animations" toggle. */
(function () {
  'use strict';
  var root = document.documentElement;
  var MOTION = root.classList.contains('motion');
  var hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  // libraries blocked/failed → fall back to the static, always-visible version
  if (MOTION && !hasGsap) { root.classList.remove('motion'); root.classList.add('no-motion'); MOTION = false; }
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var timers = [];   // every looping tile animation registers here so "pause" can stop it

  // ─── LOADER + HERO INTRO ─────────────────────────────────
  var loader = $('#loader'), introDone = false;
  function intro() {
    if (introDone) return; introDone = true;
    if (loader) loader.classList.add('hidden');
    if (MOTION) {
      gsap.timeline({ defaults: { ease: 'expo.out' } })
        .from('.name-line', { yPercent: 115, duration: 1.4, stagger: .12 }, .1)
        .from('.hero-badge', { opacity: 0, y: 14, duration: 1 }, .15)
        .from('.hero-sub, .hero-line', { opacity: 0, y: 18, duration: 1.1, stagger: .08 }, .5)
        .from('.hero-ctas', { opacity: 0, y: 18, duration: 1.1 }, .7)
        .from('.hero-stats > div', { opacity: 0, x: 24, duration: 1, stagger: .1 }, .8)
        .from('.scroll-hint', { opacity: 0, duration: .8 }, 1.2);
    }
    setTimeout(function () { $$('.count').forEach(animateCounter); }, MOTION ? 800 : 0);
  }
  if (MOTION && loader) {
    window.addEventListener('load', function () { setTimeout(intro, 450); });
    setTimeout(intro, 2500);
  } else { if (loader) loader.remove(); intro(); }

  // ─── LENIS SMOOTH SCROLL ─────────────────────────────────
  var lenis = null;
  if (MOTION && typeof window.Lenis !== 'undefined') {
    lenis = new Lenis({ duration: 1.15, easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); }, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }
  function navH() { return parseInt(getComputedStyle(root).getPropertyValue('--nav-h'), 10) || 68; }
  function scrollToEl(el) {
    if (lenis) lenis.scrollTo(el, { offset: -navH() - 12, duration: 1.4 });
    else el.scrollIntoView({ behavior: MOTION ? 'smooth' : 'auto' });
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
    el.focus({ preventScroll: true });
  }

  // ─── SCROLL-DRIVEN MOTION ────────────────────────────────
  if (MOTION) {
    gsap.registerPlugin(ScrollTrigger);
    $$('.sec-header').forEach(function (el) {
      ScrollTrigger.create({ trigger: el, start: 'top 88%', once: true, onEnter: function () { el.classList.add('vis'); } });
    });
    ScrollTrigger.batch('.gs-reveal', {
      start: 'top 90%', once: true,
      onEnter: function (els) { gsap.to(els, { opacity: 1, y: 0, duration: 1.1, ease: 'expo.out', stagger: .08 }); }
    });
    // images: wipe in, then gentle parallax inside the frame
    $$('.reveal-img').forEach(function (box) {
      gsap.to(box, { clipPath: 'inset(0% 0 0 0)', duration: 1.4, ease: 'expo.inOut', scrollTrigger: { trigger: box, start: 'top 88%', once: true } });
      var img = $('img', box);
      if (img) gsap.fromTo(img, { yPercent: -8 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: box, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    // tiles rise in as a group
    ScrollTrigger.batch('.tile', {
      start: 'top 92%', once: true,
      onEnter: function (els) { gsap.from(els, { y: 40, opacity: 0, duration: 1.1, ease: 'expo.out', stagger: .08 }); }
    });
    ScrollTrigger.batch('.hl-stat, .hl-nodes li, .path-item, .interests li', {
      start: 'top 94%', once: true,
      onEnter: function (els) { gsap.from(els, { y: 18, opacity: 0, duration: .9, ease: 'expo.out', stagger: .06 }); }
    });
    // timeline line draws with scroll
    var pl = $('.path-line i');
    if (pl) gsap.to(pl, { scaleX: 1, scaleY: 1, ease: 'none', scrollTrigger: { trigger: '.path', start: 'top 80%', end: 'bottom 55%', scrub: .6 } });
    // background parallax: hero dunes and contact drone
    gsap.to('#heroBg', { yPercent: 12, ease: 'none', scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.fromTo('#contactBg', { yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: '#contact', start: 'top bottom', end: 'bottom top', scrub: true } });
  }

  // ─── NAV: hide on scroll down, highlight current section ─
  var nav = $('#navbar'), topBtn = $('#scrollTop'), lastY = 0;
  window.addEventListener('scroll', function () {
    var y = window.scrollY;
    if (nav) nav.classList.toggle('hidden', y > 120 && y > lastY && !document.body.classList.contains('menu-open'));
    lastY = y;
    if (topBtn) topBtn.classList.toggle('show', y > 700);
  }, { passive: true });
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
      var id = a.getAttribute('href'); if (id.length < 2) return;
      var t = document.getElementById(id.slice(1)); if (!t) return;
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
    if (e.key === 'Tab' && mnav && mnav.classList.contains('open')) {
      var items = [ham].concat($$('a', mnav)), first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  // ─── BLINK CURSOR + TEXT SCRAMBLE (nav links) ────────────
  var CHARS = '.,·-─~+:;=*π┐┌┘┴┬╗╔╝╚╬╠╣╩╦║░▒▓█▄▀▌▐■!?&#$@0123456789';
  $$('.nav-links a, .mobile-nav > a').forEach(function (a) {
    var label = $('.lbl', a); if (!label) return;
    if (a.closest('.nav-links')) { var cur = document.createElement('span'); cur.className = 'blink-cur'; cur.setAttribute('aria-hidden', 'true'); a.appendChild(cur); }
    if (!MOTION) return;
    var original = label.textContent, raf = null;
    a.setAttribute('aria-label', original); label.setAttribute('aria-hidden', 'true');
    function run() {
      if (!MOTION) return;
      cancelAnimationFrame(raf);
      var start = null, len = original.length;
      (function tick(now) {
        if (!start) start = now;
        var p = Math.min((now - start) / 480, 1), out = '';
        for (var i = 0; i < len; i++) { var ch = original[i]; out += (ch === ' ' || p * (len + 3) - i > 2) ? ch : CHARS[(Math.random() * CHARS.length) | 0]; }
        label.textContent = out;
        if (p < 1) raf = requestAnimationFrame(tick); else label.textContent = original;
      })(performance.now());
    }
    function reset() { cancelAnimationFrame(raf); label.textContent = original; }
    a.addEventListener('mouseenter', run); a.addEventListener('focus', run);
    a.addEventListener('mouseleave', reset); a.addEventListener('blur', reset);
  });

  // ─── MAGNETIC BUTTONS + TILE SPOTLIGHT ───────────────────
  if (MOTION && window.matchMedia('(hover:hover)').matches) {
    $$('.magnetic').forEach(function (btn) {
      btn.addEventListener('mousemove', function (e) {
        var r = btn.getBoundingClientRect();
        gsap.to(btn, { x: (e.clientX - r.left - r.width / 2) * .3, y: (e.clientY - r.top - r.height / 2) * .3, duration: .5, ease: 'power3.out' });
      });
      btn.addEventListener('mouseleave', function () { gsap.to(btn, { x: 0, y: 0, duration: .8, ease: 'elastic.out(1,0.4)' }); });
    });
    $$('.tile').forEach(function (t) {
      t.addEventListener('mousemove', function (e) {
        var r = t.getBoundingClientRect();
        t.style.setProperty('--mx', (e.clientX - r.left) + 'px'); t.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });
  }

  // ─── COUNTERS ────────────────────────────────────────────
  function animateCounter(el) {
    var target = parseInt(el.getAttribute('data-target'), 10) || 0;
    if (!MOTION) { el.textContent = target; return; }
    var start = performance.now();
    (function tick(now) {
      var t = Math.min((now - start) / 1600, 1);
      el.textContent = Math.round((1 - Math.pow(1 - t, 4)) * target);
      if (t < 1) requestAnimationFrame(tick);
    })(start);
  }

  // ─── APP TILES ───────────────────────────────────────────
  // Each tile has a static final state (no JS / reduced motion) and a loop that only runs while visible.
  function whenVisible(el, start, stop) {
    if (!el || !('IntersectionObserver' in window)) return;
    new IntersectionObserver(function (en) { en[0].isIntersecting ? start() : stop(); }, { threshold: .25 }).observe(el);
  }
  function loop(fn, ms) { var id = setInterval(fn, ms); timers.push(id); return id; }
  function esc(s) { return s.replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); }

  // Terminal: types commands, prints output
  var term = $('#termOut');
  var SCRIPT = [
    ['$ ', 'qm list'],
    ['', '  VMID NAME          STATUS\n  101  llm-vm        <ok>running</ok>\n  102  librechat     <ok>running</ok>\n  110  docker-apps   <ok>running</ok>'],
    ['$ ', 'ansible-playbook win11-updates.yml'],
    ['', 'PLAY RECAP  <ok>ok=14</ok>  changed=4  failed=0'],
    ['$ ', 'proxmox-backup-client snapshot list'],
    ['', '  vm/101  2026-10-10T02:00  <ok>verified</ok>']
  ];
  function termStatic() {
    if (!term) return;
    term.innerHTML = SCRIPT.map(function (l) { return l[0] ? '<span class="p">$ </span><span class="c">' + esc(l[1]) + '</span>' : fmt(l[1]); }).join('\n');
  }
  function fmt(s) { return esc(s).replace(/&lt;ok&gt;/g, '<span class="ok">').replace(/&lt;\/ok&gt;/g, '</span>'); }
  if (term) {
    termStatic();
    if (MOTION) {
      var tRun = null;
      var typeTerm = function () {
        var html = '', i = 0, ch = 0;
        clearInterval(tRun);
        tRun = setInterval(function () {
          if (!MOTION) { clearInterval(tRun); termStatic(); return; }
          var line = SCRIPT[i];
          if (!line) { clearInterval(tRun); setTimeout(function () { if (MOTION && termOn) typeTerm(); }, 2600); return; }
          if (line[0]) {             // typed command
            ch++;
            term.innerHTML = html + '<span class="p">$ </span><span class="c">' + esc(line[1].slice(0, ch)) + '</span><span class="cur"></span>';
            term.scrollTop = term.scrollHeight;
            if (ch >= line[1].length) { html += '<span class="p">$ </span><span class="c">' + esc(line[1]) + '</span>\n'; i++; ch = 0; }
          } else {                    // output appears at once
            html += fmt(line[1]) + '\n'; i++;
            term.innerHTML = html + '<span class="cur"></span>';
            term.scrollTop = term.scrollHeight;
          }
        }, 45);
        timers.push(tRun);
      };
      var termOn = false;
      whenVisible(term, function () { if (!termOn && MOTION) { termOn = true; typeTerm(); } }, function () { termOn = false; clearInterval(tRun); termStatic(); });
    }
  }

  // Proxmox: CPU / RAM bars drift like a live dashboard
  var pveBars = $$('.pve .bar i');
  if (pveBars.length && MOTION) {
    var pveId = null;
    whenVisible($('.pve'), function () {
      if (pveId) return;
      pveId = loop(function () {
        pveBars.forEach(function (b) {
          var w = parseFloat(b.style.width) || 40;
          b.style.width = Math.max(8, Math.min(92, w + (Math.random() * 24 - 12))).toFixed(0) + '%';
        });
      }, 1400);
    }, function () { clearInterval(pveId); pveId = null; });
  }

  // Firewall: live log of allowed / blocked connections
  var fw = $('#fwLog');
  if (fw) {
    var A = fw.dataset.allow, B = fw.dataset.block;
    var RULES = [[1, 'LAN → WAN', '443/tcp'], [0, 'IoT → LAN', '22/tcp'], [1, 'VPN → MGMT', '8006/tcp'], [1, 'LAN → DNS', '53/udp'],
                 [0, 'WAN → LAN', '3389/tcp'], [1, 'LAN → NAS', '445/tcp'], [0, 'Guest → MGMT', '443/tcp'], [1, 'WG → LAN', '51820/udp']];
    var k = 0;
    var addRow = function () {
      var r = RULES[k++ % RULES.length], li = document.createElement('li');
      li.innerHTML = '<span class="act ' + (r[0] ? 'allow' : 'block') + '">' + (r[0] ? A : B) + '</span><span class="rt">' + r[1] + '</span><span class="pt">' + r[2] + '</span>';
      fw.appendChild(li);
      while (fw.children.length > 6) fw.removeChild(fw.firstChild);
    };
    for (var f0 = 0; f0 < 6; f0++) addRow();
    if (MOTION) { var fwId = null; whenVisible(fw, function () { if (!fwId) fwId = loop(addRow, 1300); }, function () { clearInterval(fwId); fwId = null; }); }
  }

  // AD tree: a highlight walks through the OUs and policies
  var adRows = $$('.adtree span');
  if (adRows.length && MOTION) {
    var ai0 = 0, adId = null;
    whenVisible($('.adtree'), function () {
      if (adId) return;
      adId = loop(function () {
        adRows.forEach(function (r) { r.classList.remove('hot'); });
        adRows[ai0++ % adRows.length].classList.add('hot');
      }, 900);
    }, function () { clearInterval(adId); adId = null; });
  }

  // Local AI: answer streams in token by token
  var aiOut = $('#aiOut');
  if (aiOut && MOTION) {
    var full = aiOut.dataset.text, words = full.split(' '), aiId = null, aiBusy = false;
    var stream = function () {
      if (aiBusy) return; aiBusy = true;
      var w = 0; aiOut.textContent = '';
      aiId = setInterval(function () {
        if (!MOTION) { clearInterval(aiId); aiOut.textContent = full; return; }
        aiOut.textContent = words.slice(0, ++w).join(' ');
        if (w >= words.length) { clearInterval(aiId); setTimeout(function () { aiBusy = false; if (aiOn) stream(); }, 3200); }
      }, 110);
      timers.push(aiId);
    };
    var aiOn = false;
    whenVisible(aiOut, function () { aiOn = true; stream(); }, function () { aiOn = false; });
  }

  // ─── COPY E-MAIL ─────────────────────────────────────────
  $$('.ct-copy').forEach(function (b) {
    b.addEventListener('click', function () {
      var done = function () { b.dataset.state = 'done'; b.dataset.tip = b.dataset.done; setTimeout(function () { b.dataset.state = ''; }, 1600); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(b.dataset.copy).then(done, function () {});
    });
  });

  // ─── BACK TO TOP ─────────────────────────────────────────
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
        if (hasGsap) {
          ScrollTrigger.getAll().forEach(function (t) { t.kill(); }); gsap.globalTimeline.clear();
          gsap.set('.gs-reveal,.tile,.hl-stat,.hl-nodes li,.path-item,.interests li,.reveal-img,.reveal-img img,.name-line,.hero-badge,.hero-sub,.hero-line,.hero-ctas,.hero-stats > div,.scroll-hint,#heroBg,#contactBg,.path-line i,.magnetic', { clearProps: 'all' });
        }
        $$('.sec-header').forEach(function (h) { h.classList.add('vis'); });
        timers.forEach(clearInterval);
        termStatic(); if (aiOut) aiOut.textContent = aiOut.dataset.text;
        pauseSvg();
        MOTION = false;
        toggle.textContent = toggle.dataset.play; toggle.setAttribute('aria-pressed', 'true');
      } else {
        try { localStorage.setItem('tk-motion', 'on'); } catch (e) {}
        location.reload();
      }
    });
  }

  $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
