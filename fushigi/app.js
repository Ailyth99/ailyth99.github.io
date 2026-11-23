/* =========================================================
   不可思议汉化组 / FUSHIGI  —  首屏
   背景特效（星云 / 星屑 / 散景 / 鼠标霓虹尾迹）
   ========================================================= */
(function () {
  'use strict';

  const $ = (s, r) => (r || document).querySelector(s);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* 主色パレット（青 #7bebec / 珊瑚 #f39080 とその中間色） */
  const PALETTE = [
    '123,235,236', '243,144,128', '170,244,246', '255,186,174',
    '208,255,255', '255,124,150', '86,206,218'
  ];

  /* ---------------------------------------------------------
     1. ローディング
     --------------------------------------------------------- */
  const loader = $('#loader');
  const ldrBar = $('#ldrBar');
  const ldrPct = $('#ldrPct');
  let booted = false;

  function revealHero() {
    if (booted) return;
    booted = true;
    if (loader) loader.classList.add('done');
    document.body.classList.add('ready');
    popStart();
  }

  function bootProgress() {
    const total = reduced ? 4 : 46;
    let f = 0;
    function tick() {
      f++;
      const p = Math.min(1, f / total);
      const v = Math.round((1 - Math.pow(1 - p, 3)) * 100);
      if (ldrBar) ldrBar.style.width = v + '%';
      if (ldrPct) ldrPct.textContent = v;
      if (p < 1) requestAnimationFrame(tick);
      else revealHero();
    }
    requestAnimationFrame(tick);
    setTimeout(revealHero, 2600);
  }

  /* ---------------------------------------------------------
     2. キャンバス（星屑 + ボケ）
     --------------------------------------------------------- */
  const bokeh = $('#bokeh');
  const starCanvas = $('#stars');
  const trailCanvas = $('#trail');
  const bctx = bokeh && bokeh.getContext('2d');
  const sctx = starCanvas && starCanvas.getContext('2d');
  const tctx = trailCanvas && trailCanvas.getContext('2d');

  let W = 0, H = 0, DPR = 1;
  let parts = [], stars = [], trailPts = [];
  let pointer = { x: 0.5, y: 0.5 };

  const SPRITE = 128;
  const sprites = PALETTE.map(rgb => {
    const c = document.createElement('canvas');
    c.width = c.height = SPRITE;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(SPRITE / 2, SPRITE / 2, 0, SPRITE / 2, SPRITE / 2, SPRITE / 2);
    grad.addColorStop(0, 'rgba(' + rgb + ',1)');
    grad.addColorStop(.35, 'rgba(' + rgb + ',.6)');
    grad.addColorStop(.7, 'rgba(' + rgb + ',.15)');
    grad.addColorStop(1, 'rgba(' + rgb + ',0)');
    g.fillStyle = grad;
    g.beginPath(); g.arc(SPRITE / 2, SPRITE / 2, SPRITE / 2, 0, Math.PI * 2); g.fill();
    return c;
  });

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.floor(innerWidth * DPR);
    H = Math.floor(innerHeight * DPR);
    [bokeh, starCanvas, trailCanvas].forEach(c => {
      if (!c) return;
      c.width = W; c.height = H;
      c.style.width = innerWidth + 'px';
      c.style.height = innerHeight + 'px';
    });
  }

  function seed() {
    /* 星屑 */
    const sn = Math.max(120, Math.round(innerWidth * innerHeight / 3400));
    stars = [];
    for (let i = 0; i < sn; i++) {
      const t = Math.random();
      stars.push({
        x: Math.random() * W, y: Math.random() * H,
        r: (0.55 + Math.random() * 1.35) * DPR,
        a: 0.25 + Math.random() * 0.72,
        sp: 0.6 + Math.random() * 2.4,
        ph: Math.random() * Math.PI * 2,
        c: t > .88 ? '255,196,184' : t > .74 ? '176,244,246' : '255,255,255'
      });
    }

    /* ボケ玉 */
    const bn = innerWidth < 640 ? 54 : innerWidth < 1100 ? 82 : 108;
    parts = [];
    for (let i = 0; i < bn; i++) {
      const r = (8 + Math.random() * 30) * DPR;
      parts.push({
        x: Math.random() * W, y: Math.random() * H,
        r,
        vy: (0.20 + Math.random() * 0.60) * DPR,
        vx: (Math.random() - 0.5) * 0.24 * DPR,
        sway: 0.3 + Math.random() * 1.4,
        ph: Math.random() * Math.PI * 2,
        a: 0.16 + Math.random() * 0.42,
        ci: (Math.random() * PALETTE.length) | 0,
        depth: 0.3 + Math.random() * 1.4
      });
    }
  }

  let last = performance.now();
  let visible = true;

  function frame(now) {
    const dt = Math.min(3, (now - last) / 16.67);
    last = now;

    /* 星屑 */
    if (sctx) {
      sctx.clearRect(0, 0, W, H);
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        const tw = 0.55 + 0.45 * Math.sin(now * 0.001 * s.sp + s.ph);
        sctx.globalAlpha = Math.max(0, s.a * tw);
        sctx.fillStyle = 'rgb(' + s.c + ')';
        sctx.beginPath(); sctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); sctx.fill();
        if (s.r > 1.35 * DPR) {
          sctx.globalAlpha = Math.max(0, s.a * tw * 0.32);
          sctx.fillRect(s.x - s.r * 3, s.y - 0.4 * DPR, s.r * 6, 0.8 * DPR);
          sctx.fillRect(s.x - 0.4 * DPR, s.y - s.r * 3, 0.8 * DPR, s.r * 6);
        }
      }
      sctx.globalAlpha = 1;
    }

    /* ボケ */
    if (bctx) {
      bctx.clearRect(0, 0, W, H);
      const ox = (pointer.x - 0.5) * 26 * DPR;
      const oy = (pointer.y - 0.5) * 18 * DPR;
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        p.y -= p.vy * dt;
        p.x += p.vx * dt;
        p.ph += 0.010 * dt;
        if (p.y < -p.r * 2) {
          p.y = H + p.r;
          p.x = Math.random() * W;
          p.ci = (Math.random() * PALETTE.length) | 0;
          continue;
        }
        const tw = 0.72 + 0.28 * Math.sin(p.ph * 1.7 + i);
        const px = p.x + Math.sin(p.ph) * p.sway * 6 * DPR + ox * p.depth;
        const py = p.y + oy * p.depth;
        const size = p.r * 2 * (0.94 + 0.06 * Math.sin(p.ph * 1.3));
        bctx.globalAlpha = Math.max(0, Math.min(1, p.a * tw));
        bctx.drawImage(sprites[p.ci], px - size / 2, py - size / 2, size, size);
      }
      bctx.globalAlpha = 1;
    }

    /* カーソル軌跡 */
    if (tctx) {
      tctx.clearRect(0, 0, W, H);
      for (let i = trailPts.length - 1; i >= 0; i--) {
        const pt = trailPts[i];
        pt.life -= 0.028 * dt;
        if (pt.life <= 0) { trailPts.splice(i, 1); continue; }
        const r = (2 + (1 - pt.life) * 15) * DPR;
        const g = tctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, r);
        g.addColorStop(0, 'rgba(' + pt.c + ',' + (pt.life * 0.45) + ')');
        g.addColorStop(.55, 'rgba(' + pt.c + ',' + (pt.life * 0.13) + ')');
        g.addColorStop(1, 'rgba(' + pt.c + ',0)');
        tctx.fillStyle = g;
        tctx.beginPath(); tctx.arc(pt.x, pt.y, r, 0, Math.PI * 2); tctx.fill();
      }
    }

    if (visible) requestAnimationFrame(frame);
  }

  function initCanvas() {
    if (reduced) return;
    resize();
    seed();
    requestAnimationFrame(frame);
  }

  /* ---------------------------------------------------------
     3. インタラクション
     --------------------------------------------------------- */
  const header = $('#siteHeader');
  addEventListener('scroll', () => {
    if (header) header.classList.toggle('scrolled', scrollY > 40);
  }, { passive: true });

  /* 上部ニュース：入りきらない時だけ左右に流す */
  const news = $('#news');
  function fitNews() {
    if (!news) return;
    const inner = news.firstElementChild;
    if (!inner) return;
    news.classList.remove('scroll');
    inner.style.removeProperty('--sx');
    const over = inner.getBoundingClientRect().width - news.clientWidth;
    if (over > 4) {
      inner.style.setProperty('--sx', (-over - 8) + 'px');
      news.classList.add('scroll');
    }
  }

  /* 見出しの文字ポップ（1文字ずつ跳ねて登場） */
  let popWait = [];
  let heroPop = [];

  /* テキストノードだけを1文字ずつ span に包む（<b> などの装飾は残す） */
  function splitChars(el) {
    let i = 0;
    const walk = node => {
      Array.from(node.childNodes).forEach(n => {
        if (n.nodeType === 3) {
          const txt = n.nodeValue;
          if (!txt) return;
          const frag = document.createDocumentFragment();
          Array.from(txt).forEach(c => {
            const s = document.createElement('span');
            s.className = 'ch';
            s.style.setProperty('--i', i++);
            s.textContent = c === ' ' ? '\u00a0' : c;
            frag.appendChild(s);
          });
          n.parentNode.replaceChild(frag, n);
        } else if (n.nodeType === 1) {
          walk(n);
        }
      });
    };
    walk(el);
    el.classList.add('pop');
  }

  function charPop() {
    if (reduced) return;

    /* 首屏两个入口框的大标题：跟着框一起入场 */
    document.querySelectorAll('.lnk-h').forEach((t, k) => {
      if (!t.textContent.trim() || t.classList.contains('pop')) return;
      splitChars(t);
      t.style.setProperty('--d', (0.34 + k * 0.14).toFixed(2) + 's');
      heroPop.push(t);
    });

    /* 补丁区 / 支持游戏列表 / 攻略区的标题：滚到视口才播 */
    document.querySelectorAll('.p-title, .g-title, .gd-h, .gd-title').forEach(t => {
      if (!t.textContent.trim() || t.classList.contains('pop')) return;
      splitChars(t);
      t.setAttribute('aria-label', t.textContent);
      popWait.push(t);
    });
  }

  function popStart() {
    if (heroPop.length) {
      heroPop.forEach(t => t.classList.add('in'));
      heroPop = [];
    }
    if (!popWait.length) return;
    const list = popWait;
    popWait = [];
    if (!('IntersectionObserver' in window)) {
      list.forEach(t => t.classList.add('in'));
      return;
    }
    const io = new IntersectionObserver(es => {
      es.forEach(e => {
        if (!e.isIntersecting) return;
        e.target.classList.add('in');
        io.unobserve(e.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    list.forEach(t => io.observe(t));
  }

  /* ---------------------------------------------------------
     フッター：スクロールして到達したら表示
     --------------------------------------------------------- */
  function footReveal() {
    const f = $('#foot');
    if (!f) return;
    if (reduced || !('IntersectionObserver' in window)) {
      f.classList.add('in');
      return;
    }
    const io = new IntersectionObserver(es => {
      es.forEach(e => {
        if (!e.isIntersecting) return;
        e.target.classList.add('in');
        io.unobserve(e.target);
      });
    }, { threshold: 0.2 });
    io.observe(f);
  }

  addEventListener('pointermove', e => {
    pointer.x = e.clientX / innerWidth;
    pointer.y = e.clientY / innerHeight;
    if (tctx && !reduced && e.pointerType === 'mouse') {
      trailPts.push({ x: e.clientX * DPR, y: e.clientY * DPR, life: 1, c: '243,144,128' });
      if (trailPts.length > 22) trailPts.shift();
    }
  }, { passive: true });

  /* タブが裏に回ったら描画停止 */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      visible = false;
    } else if (!visible) {
      visible = true;
      last = performance.now();
      requestAnimationFrame(frame);
    }
  });

  let rz;
  addEventListener('resize', () => {
    clearTimeout(rz);
    rz = setTimeout(() => { fitNews(); if (!reduced) { resize(); seed(); } }, 200);
  });

  /* ---------------------------------------------------------
     4. 起動
     --------------------------------------------------------- */
  document.addEventListener('fushigi:content-ready', () => {
    fitNews();
    charPop();
    if (booted) popStart();
  });
  fitNews();
  charPop();
  footReveal();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitNews);
  initCanvas();
  if (document.readyState === 'complete') bootProgress();
  else addEventListener('load', bootProgress);
  setTimeout(() => { if (!booted) bootProgress(); }, 3000);
})();
