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
  var holdNav = 0;
  function scrollToEl(el) {
    holdNav = Date.now() + 1800;
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
    if (nav) nav.classList.toggle('hidden', y > 120 && y > lastY && Date.now() > holdNav && !document.body.classList.contains('menu-open'));
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
  // Every tile shows a static state without JS / with reduced motion. With motion, each runs its own
  // randomised event loop — only while it is on screen — so the dashboard never repeats exactly.
  function whenVisible(el, start, stop) {
    if (!el || !('IntersectionObserver' in window)) return;
    new IntersectionObserver(function (en) { en[0].isIntersecting ? start() : stop(); }, { threshold: .2 }).observe(el);
  }
  function later(fn, ms) {
    var id = setTimeout(function () { var i = timers.indexOf(id); if (i > -1) timers.splice(i, 1); fn(); }, ms);
    timers.push(id); return id;
  }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function ri(a, b) { return Math.floor(rnd(a, b + 1)); }
  function pick(a) { return a[(Math.random() * a.length) | 0]; }
  function chance(p) { return Math.random() < p; }
  function esc(s) { return String(s).replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); }
  function pad(s, n) { s = String(s); while (s.length < n) s += ' '; return s; }
  function hhmm() { var d = new Date(); return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }
  // <ok>…</ok> = blue, <w>…</w> = gold warning
  function fmt(s) { return esc(s).replace(/&lt;(\/?)(ok|w)&gt;/g, function (_, c, t) { return c ? '</span>' : '<span class="' + (t === 'ok' ? 'ok' : 'p') + '">'; }); }

  // ── Terminal: random commands with live-looking output ──
  var term = $('#termOut'), termStaticHTML = term ? term.innerHTML : '';
  var VMS = ['llm-vm', 'librechat', 'docker-apps', 'n8n', 'pbs', 'win11-lab', 'pihole', 'bookstack'];
  var SESS = [
    function () {
      var rows = VMS.slice().sort(function () { return Math.random() - .5; }).slice(0, 4).map(function (n, i) {
        var up = chance(.85);
        return '  ' + pad(100 + ri(1, 30), 5) + pad(n, 14) + (up ? '<ok>running</ok>' : '<w>stopped</w>');
      });
      return ['qm list', '  VMID NAME          STATUS'].concat(rows);
    },
    function () {
      var ch = ri(0, 9), un = chance(.2);
      return ['ansible-playbook win11-updates.yml', 'TASK [win_updates] ' + '*'.repeat(10),
        'PLAY RECAP  <ok>ok=' + ri(10, 18) + '</ok>  changed=' + ch + '  ' + (un ? '<w>unreachable=1</w>' : 'failed=0')];
    },
    function () {
      return ['systemctl status llama-swap --no-pager', '● llama-swap.service - LLM proxy',
        '   Active: <ok>active (running)</ok> since ' + ri(2, 19) + ' days', '   Memory: ' + rnd(12, 21).toFixed(1) + 'G'];
    },
    function () {
      var c = ['searxng', 'firecrawl', 'librechat', 'mongodb', 'meilisearch', 'rag-api', 'vaultwarden', 'paperless'];
      return ['docker ps --format "{{.Names}}  {{.Status}}"'].concat(c.sort(function () { return Math.random() - .5; }).slice(0, 4)
        .map(function (n) { return '  ' + pad(n, 13) + '<ok>Up ' + ri(1, 23) + (chance(.5) ? ' hours' : ' days') + '</ok>'; }));
    },
    function () {
      return ['wg show wg0 latest-handshakes', '  phone     <ok>' + ri(3, 59) + ' seconds ago</ok>', '  laptop    <ok>' + ri(1, 9) + ' minutes ago</ok>',
        '  tablet    ' + (chance(.3) ? '<w>' + ri(2, 6) + ' hours ago</w>' : '<ok>' + ri(10, 50) + ' seconds ago</ok>')];
    },
    function () {
      var t = function () { return rnd(.3, 2.4).toFixed(2); };
      return ['ping -c 3 10.0.10.1', '64 bytes: icmp_seq=1 ttl=64 time=' + t() + ' ms', '64 bytes: icmp_seq=2 ttl=64 time=' + t() + ' ms',
        '3 packets transmitted, 3 received, <ok>0% packet loss</ok>'];
    },
    function () {
      var u = ri(41, 93);
      return ['df -h /mnt/model-storage', 'Size  Used  Avail  Use%', ' 88G  ' + Math.round(88 * u / 100) + 'G   ' + Math.round(88 * (100 - u) / 100) + 'G  ' + (u > 85 ? '<w>' + u + '%</w>' : '<ok>' + u + '%</ok>')];
    },
    function () {
      return ['pvesh get /nodes --output-format text'].concat(['pve-edge', 'pve-compute', 'pve-apps'].map(function (n) {
        return '  ' + pad(n, 13) + '<ok>online</ok>  cpu ' + ri(3, 88) + '%';
      }));
    },
    function () {
      return ['nslookup github.com 10.0.10.53', 'Server:   10.0.10.53 (pi-hole)', 'Name:     github.com', 'Address:  <ok>140.82.121.' + ri(2, 6) + '</ok>'];
    },
    function () {
      return ['proxmox-backup-client snapshot list --repository pbs', '  vm/10' + ri(1, 9) + '  ' + new Date().toISOString().slice(0, 10) + 'T02:00  <ok>verified</ok>',
        '  ct/1' + ri(10, 30) + '  ' + new Date().toISOString().slice(0, 10) + 'T02:15  <ok>verified</ok>'];
    },
    function () {
      return ['journalctl -u pihole-FTL -n 2 --no-pager', 'query[A] ' + pick(['github.com', 'debian.org', 'proxmox.com', 'ollama.com']) + ' from 10.0.10.' + ri(20, 90),
        'gravity blocked <w>' + pick(['ads.tracker.net', 'telemetry.example', 'doubleclick.net']) + '</w>'];
    }
  ];
  if (term && MOTION) {
    var termOn = false, termGen = 0, lastS = -1, hist = '';
    var runTerm = function (gen) {
      if (!termOn || gen !== termGen || !MOTION) return;
      var si; do { si = (Math.random() * SESS.length) | 0; } while (si === lastS); lastS = si;
      var lines = SESS[si](), cmd = lines[0], out = lines.slice(1), ch = 0;
      var trim = function () { var parts = hist.split('\n'); if (parts.length > 40) hist = parts.slice(-40).join('\n'); };
      var show = function (tail) { term.innerHTML = hist + (tail || ''); term.scrollTop = term.scrollHeight; };
      (function typeCmd() {
        if (!termOn || gen !== termGen || !MOTION) return;
        ch++;
        show('<span class="p">$ </span><span class="c">' + esc(cmd.slice(0, ch)) + '</span><span class="cur"></span>');
        if (ch < cmd.length) { later(typeCmd, rnd(22, chance(.08) ? 260 : 70)); return; }   // occasional hesitation
        hist += '<span class="p">$ </span><span class="c">' + esc(cmd) + '</span>\n';
        var li = 0;
        later(function printOut() {
          if (!termOn || gen !== termGen || !MOTION) return;
          if (li < out.length) { hist += fmt(out[li++]) + '\n'; trim(); show('<span class="cur"></span>'); later(printOut, rnd(40, 160)); return; }
          if (chance(.12)) later(function () { hist = ''; show('<span class="cur"></span>'); later(function () { runTerm(gen); }, 500); }, rnd(1200, 2000));  // "clear"
          else later(function () { runTerm(gen); }, rnd(900, 2600));
        }, rnd(200, 650));
      })();
    };
    whenVisible(term, function () { if (!termOn && MOTION) { termOn = true; termGen++; hist = ''; runTerm(termGen); } },
      function () { termOn = false; termGen++; });
  }
  function termStatic() { if (term) { term.innerHTML = termStaticHTML; term.scrollTop = 0; } }

  // ── Proxmox: load drifts, random cluster events in the task log ──
  var pve = $('.pve'), pveEv = $('#pveEv'), pveProg = $('#pveProg');
  if (pve && MOTION) {
    var nodes = $$('.pve li'), pveOn = false, pveGen = 0;
    var setBar = function (li, which, v) { var b = $$('.bar i', li)[which]; if (b) b.style.width = Math.max(4, Math.min(97, v)).toFixed(0) + '%'; };
    var drift = function (gen) {
      if (!pveOn || gen !== pveGen) return;
      nodes.forEach(function (li) {
        if (li.classList.contains('hot')) return;
        $$('.bar i', li).forEach(function (b) { var w = parseFloat(b.style.width) || 40; b.style.width = Math.max(6, Math.min(90, w + rnd(-14, 14))).toFixed(0) + '%'; });
      });
      later(function () { drift(gen); }, rnd(900, 1800));
    };
    var say = function (html) {
      pveEv.classList.add('swap');
      later(function () { pveEv.innerHTML = html; pveEv.classList.remove('swap'); }, 300);
    };
    var node = function (n) { return pve.querySelector('[data-node="' + n + '"]'); };
    var progress = function (ms, done) {
      var t0 = performance.now();
      (function step() {
        var p = Math.min(1, (performance.now() - t0) / ms);
        pveProg.style.width = (p * 100).toFixed(1) + '%';
        if (p < 1 && pveOn) later(step, 120); else later(function () { pveProg.style.width = '0'; if (done) done(); }, 500);
      })();
    };
    var EVENTS = [
      function () { var v = 'vm/10' + ri(1, 9), gb = rnd(1.2, 9.8).toFixed(1); var n = node('pve-compute'); n.classList.add('busy');
        say('<span>PBS</span> backup ' + v + ' → pbs · running'); progress(rnd(2600, 4200), function () { n.classList.remove('busy'); say('<span>PBS</span> backup ' + v + ' · ' + gb + ' GB · <b class="ok">OK</b>'); }); },
      function () { var a = pick(['pve-apps', 'pve-edge']), b = a === 'pve-apps' ? 'pve-edge' : 'pve-apps', id = 'ct/1' + ri(10, 40);
        node(a).classList.add('busy'); node(b).classList.add('busy'); say('<span>HA</span> live migration ' + id + ' ' + a + ' → ' + b);
        progress(rnd(2200, 3600), function () { node(a).classList.remove('busy'); node(b).classList.remove('busy'); say('<span>HA</span> ' + id + ' migrated · <b class="ok">0 s downtime</b>'); }); },
      function () { var n = node('pve-compute'); n.classList.add('hot'); setBar(n, 0, rnd(88, 97));
        say('<span>LOAD</span> pve-compute ' + ri(88, 97) + '% · llm-vm inference');
        later(function () { n.classList.remove('hot'); setBar(n, 0, rnd(30, 55)); }, rnd(2400, 3800)); },
      function () { say('<span>VM</span> ' + (100 + ri(1, 30)) + ' (' + pick(VMS) + ') ' + pick(['started', 'snapshot "pre-update" created', 'resized disk +' + ri(4, 32) + 'G'])); },
      function () { var n = pick(nodes); n.classList.add('busy'); say('<span>APT</span> ' + n.dataset.node + ': ' + ri(2, 14) + ' updates installed');
        later(function () { n.classList.remove('busy'); }, 2000); },
      function () { say('<span>ZFS</span> scrub rpool · ' + ri(0, 0) + ' errors · <b class="ok">healthy</b>'); },
      function () { say('<span>REPL</span> job 1' + ri(10, 30) + '-0 finished · ' + hhmm()); }
    ];
    var lastE = -1;
    var eventLoop = function (gen) {
      if (!pveOn || gen !== pveGen) return;
      var e; do { e = (Math.random() * EVENTS.length) | 0; } while (e === lastE); lastE = e;
      EVENTS[e]();
      later(function () { eventLoop(gen); }, rnd(4200, 7000));
    };
    whenVisible(pve, function () { if (pveOn || !MOTION) return; pveOn = true; pveGen++; drift(pveGen); later(function () { eventLoop(pveGen); }, 1500); },
      function () { pveOn = false; pveGen++; });
  }

  // ── Firewall: random traffic, port-scan bursts, IDS alerts, live counters ──
  var fw = $('#fwLog'), fwCount = $('#fwCount');
  if (fw && MOTION) {
    var A = fw.dataset.allow, B = fw.dataset.block, okN = 1284, noN = 37, fwOn = false, fwGen = 0;
    var ZONES = { LAN: 1, VPN: 1, WG: 1, IoT: 0, Guest: 0, WAN: 0 };
    var DST = ['WAN', 'LAN', 'DNS', 'NAS', 'MGMT', 'DMZ'];
    var PORTS = ['443/tcp', '80/tcp', '53/udp', '22/tcp', '445/tcp', '3389/tcp', '8006/tcp', '51820/udp', '123/udp', '1883/tcp', '8443/tcp'];
    var fmtN = function (n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); };
    var count = function () { if (fwCount) fwCount.innerHTML = '<b class="ok">✓ ' + fmtN(okN) + '</b> <b class="no">✕ ' + fmtN(noN) + '</b>'; };
    var push = function (cls, act, rt, pt, liCls) {
      var li = document.createElement('li'); if (liCls) li.className = liCls;
      li.innerHTML = '<span class="act ' + cls + '">' + act + '</span><span class="rt">' + rt + '</span><span class="pt">' + pt + '</span>';
      fw.appendChild(li);
      while (fw.children.length > 6) fw.removeChild(fw.firstChild);
    };
    var normal = function () {
      var src = pick(Object.keys(ZONES)), dst = pick(DST.filter(function (d) { return d !== src; }));
      var trusted = ZONES[src] === 1, toInside = /LAN|MGMT|NAS/.test(dst);
      var allow = trusted || (!toInside && src !== 'WAN') || (src === 'WAN' && dst === 'DMZ');
      allow ? okN += ri(3, 40) : noN++;
      push(allow ? 'allow' : 'block', allow ? A : B, src + ' → ' + dst, pick(PORTS));
    };
    var scan = function (gen, left, port) {
      if (!fwOn || gen !== fwGen) return;
      noN++; push('block', B, 'WAN → LAN', port + '/tcp', 'scan'); count();
      if (left > 1) later(function () { scan(gen, left - 1, port + ri(1, 3)); }, rnd(110, 220));
    };
    var fwLoop = function (gen) {
      if (!fwOn || gen !== fwGen) return;
      var r = Math.random();
      if (r < .1) scan(gen, ri(3, 5), ri(20, 25));
      else if (r < .17) { noN++; push('alert', 'IDS', 'ET SCAN ' + pick(['Nmap', 'Masscan', 'SSH brute force']), 'WAN', 'ids'); }
      else normal();
      count();
      later(function () { fwLoop(gen); }, r < .1 ? rnd(1800, 2600) : rnd(550, 1700));
    };
    whenVisible(fw, function () { if (fwOn || !MOTION) return; fwOn = true; fwGen++; fwLoop(fwGen); }, function () { fwOn = false; fwGen++; });
  }

  // ── Active Directory: random admin events with matching tree changes ──
  var adTree = $('#adTree'), adEv = $('#adEv'), adCount = $('#adCount');
  if (adTree && MOTION) {
    var adOn = false, adGen = 0, row = function (k) { return adTree.querySelector('[data-k="' + k + '"]'); };
    var NAMES = ['j.mueller', 'l.schmidt', 'a.weber', 'm.fischer', 's.becker', 'n.wagner', 'k.hoffmann', 'p.schulz'];
    var flash = function (el, cls, ms) { if (!el) return; el.classList.add(cls); later(function () { el.classList.remove(cls); }, ms || 1800); };
    var toast = function (txt, warn) {
      adEv.classList.remove('show', 'warn');
      later(function () { adEv.textContent = txt; adEv.classList.toggle('warn', !!warn); adEv.classList.add('show'); }, 220);
    };
    var AD_EVENTS = [
      function () { var n = pick(NAMES), el = document.createElement('span'); el.className = 'new'; el.dataset.k = 'tmp';
        el.textContent = '  │   ├─ ▪ ' + n; row('user').after(el); toast('New-ADUser ' + n + ' → OU IT');
        later(function () { el.remove(); }, 3600); },
      function () { flash(row('user'), 'hot'); toast('Password reset · t.kayser · must change at logon'); },
      function () { var n = pick(NAMES); flash(row('ou-it'), 'warn', 2400); toast('Account locked · ' + n + ' (5 failed logins)', true); },
      function () { var c = parseInt(adCount.textContent, 10) + 1; adCount.textContent = c; flash(row('clients'), 'hot');
        toast('W11-' + ('00' + ri(1, 99)).slice(-3) + ' joined domain corp.local'); },
      function () { flash(row('gpo-drive'), 'hot'); toast('gpupdate /force · drive-mapping applied · ' + ri(18, 31) + ' clients'); },
      function () { flash(row('gpo-wu'), 'hot'); toast('GPO windows-update · ring "pilot" · ' + ri(3, 8) + ' devices'); },
      function () { var c = Math.max(20, parseInt(adCount.textContent, 10) - 1); adCount.textContent = c; flash(row('clients'), 'warn');
        toast('W11-' + ('00' + ri(1, 99)).slice(-3) + ' disabled · offboarding', true); },
      function () { flash(row('root'), 'hot'); toast('Replication DC01 ↔ DC02 · ' + ri(0, 0) + ' errors'); }
    ];
    var lastA = -1;
    var adLoop = function (gen) {
      if (!adOn || gen !== adGen) return;
      var e; do { e = (Math.random() * AD_EVENTS.length) | 0; } while (e === lastA); lastA = e;
      AD_EVENTS[e]();
      later(function () { adLoop(gen); }, rnd(2600, 4600));
    };
    whenVisible(adTree, function () { if (adOn || !MOTION) return; adOn = true; adGen++; later(function () { adLoop(adGen); }, 800); },
      function () { adOn = false; adGen++; });
  }

  // ── Local AI: random question, "typing…", answer streams at a varying speed ──
  var aiOut = $('#aiOut'), aiQ = $('#aiQ'), aiFoot = $('#aiFoot'), aiPairs = [];
  try { aiPairs = JSON.parse(aiOut.getAttribute('data-pairs')); } catch (e) {}
  var aiFirst = aiPairs[0] || null;
  if (aiOut && aiQ && aiPairs.length && MOTION) {
    var aiOn = false, aiGen = 0, lastQ = 0;
    var MODELS = ['glm-4.7-flash', 'qwen3.8-27b', 'mistral-small-3.2', 'devstral-small-2', 'phi-4-mini'];
    aiOut.style.minHeight = '4.6em';
    var ask = function (gen) {
      if (!aiOn || gen !== aiGen) return;
      var q; do { q = (Math.random() * aiPairs.length) | 0; } while (q === lastQ && aiPairs.length > 1); lastQ = q;
      var pair = aiPairs[q], words = pair.a.split(' '), model = pick(MODELS), tps = rnd(6.8, 9.4);
      aiQ.classList.add('out');
      later(function () {
        aiQ.textContent = pair.q; aiQ.classList.remove('out');
        aiOut.innerHTML = '<span class="dots"><i></i><i></i><i></i></span>';
        aiFoot.textContent = 'llama.cpp · ' + model + ' · thinking…';
        later(function () {
          var w = 0;
          (function tok() {
            if (!aiOn || gen !== aiGen) return;
            aiOut.textContent = words.slice(0, ++w).join(' ');
            aiFoot.textContent = 'llama.cpp · ' + model + ' · ' + (tps + rnd(-.4, .4)).toFixed(1) + ' tok/s';
            if (w < words.length) later(tok, rnd(45, chance(.06) ? 320 : 150));
            else later(function () { ask(gen); }, rnd(3800, 5600));
          })();
        }, rnd(600, 1500));
      }, 350);
    };
    whenVisible(aiOut, function () { if (aiOn || !MOTION) return; aiOn = true; aiGen++; later(function () { ask(aiGen); }, 2500); },
      function () { aiOn = false; aiGen++; });
  }
  function aiStatic() { if (aiOut && aiFirst) { aiQ.textContent = aiFirst.q; aiQ.classList.remove('out'); aiOut.textContent = aiFirst.a; } }

  // ── Marquee: a random tool lights up now and then ──
  var mq = $$('.marquee-track li:not([aria-hidden])');
  if (mq.length && MOTION) {
    var mqOn = false, mqGen = 0;
    var ping = function (gen) {
      if (!mqOn || gen !== mqGen) return;
      var li = pick(mq); li.classList.add('ping');
      later(function () { li.classList.remove('ping'); }, 1300);
      later(function () { ping(gen); }, rnd(700, 1900));
    };
    whenVisible($('.tile-marquee'), function () { if (mqOn || !MOTION) return; mqOn = true; mqGen++; ping(mqGen); }, function () { mqOn = false; mqGen++; });
  }

  // ─── COPY E-MAIL ─────────────────────────────────────────
  $$('.ct-copy').forEach(function (b) {
    b.addEventListener('click', function () {
      var live = $('#copyStatus');
      var done = function () { b.dataset.state = 'done'; b.dataset.tip = b.dataset.done; if (live) live.textContent = b.dataset.done; setTimeout(function () { b.dataset.state = ''; b.dataset.tip = ''; if (live) live.textContent = ''; }, 1600); };
      var fallback = function () { var a = b.parentNode.querySelector('.ct-link span'); var r = document.createRange(); r.selectNodeContents(a.lastChild); var sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(b.dataset.copy).then(done, fallback); else fallback();
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
        termStatic(); aiStatic();
        $$('.pve li, .adtree span, .marquee-track li').forEach(function (el) { el.classList.remove('busy', 'hot', 'warn', 'ping'); });
        $$('.adtree span.new').forEach(function (el) { el.remove(); });
        if (pveProg) pveProg.style.width = '0';
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
