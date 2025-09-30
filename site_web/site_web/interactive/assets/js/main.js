// Interactive variant JS
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

// Theme toggle
(function themeToggle(){
  const root = document.documentElement;
  const toggle = $('#themeToggle');
  const saved = localStorage.getItem('theme');
  if (saved === 'light') root.classList.add('light');
  const setIcon = () => toggle && (toggle.innerHTML = root.classList.contains('light') ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>');
  setIcon();
  toggle?.addEventListener('click', ()=>{
    root.classList.toggle('light');
    localStorage.setItem('theme', root.classList.contains('light') ? 'light' : 'dark');
    setIcon();
  });
})();

// Storytelling chapter card + side elements emphasis
(function storytelling(){
  const card = document.querySelector('.chapter-card');
  if (!card) return;
  const title = card.querySelector('h3');
  const text = card.querySelector('p');
  const sideEls = {
    rockLeft: document.getElementById('rockLeft'),
    rockRight: document.getElementById('rockRight'),
    runesLeft: document.getElementById('runesLeft'),
    runesRight: document.getElementById('runesRight'),
    swordRight: document.getElementById('swordRight'),
    shieldSide: document.getElementById('shieldSide'),
  };
  const entries = [
    { id: 'about', title: 'Chapter: About', text: 'Security student and builder. Lantern in hand, reading systems and signals.' , focus: ['shieldSide','runesLeft'] },
    { id: 'projects', title: 'Chapter: Operations', text: 'From automation to endpoints: concrete missions with measurable outcomes.', focus: ['swordRight','rockLeft'] },
    { id: 'skills', title: 'Chapter: Arsenal', text: 'Tools, frameworks, and techniques sharpened for defense and response.', focus: ['runesRight','rockRight'] },
    { id: 'contact', title: 'Chapter: Contact', text: 'Signal sent. Reach out for collaborations and security projects.', focus: ['runesLeft','runesRight'] },
  ];

  function setFocus(ids){
    Object.values(sideEls).forEach(el => el && el.classList.add('dim'));
    ids.forEach(id => sideEls[id] && sideEls[id].classList.remove('dim'));
  }

  const observer = new IntersectionObserver((obsEntries)=>{
    obsEntries.forEach(en => {
      if (!en.isIntersecting) return;
      const id = en.target.id;
      const e = entries.find(x => x.id === id);
      if (!e) return;
      if (title) title.textContent = e.title;
      if (text) text.textContent = e.text;
      setFocus(e.focus);
    });
  }, { threshold: 0.55 });

  entries.forEach(e => { const sec = document.getElementById(e.id); if (sec) observer.observe(sec); });
})();

// Mobile nav toggle
(function navToggle(){
  const btn = document.querySelector('.nav-toggle');
  btn?.addEventListener('click', ()=>{
    const expanded = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', String(!expanded));
    document.body.classList.toggle('nav-open', !expanded);
  });
  $$('.site-nav a').forEach(a=>a.addEventListener('click', ()=>{
    document.body.classList.remove('nav-open');
    btn?.setAttribute('aria-expanded','false');
  }));
})();

// Smooth scroll and back to top
(function scrolling(){
  $$('.site-nav a, .scroll-down').forEach(link=>{
    link.addEventListener('click', e=>{
      const href = link.getAttribute('href');
      if (href?.startsWith('#')) { e.preventDefault(); $(href)?.scrollIntoView({behavior:'smooth', block:'start'}); }
    });
  });
  const toTop = $('#toTop');
  window.addEventListener('scroll', ()=>{ toTop?.classList.toggle('visible', window.scrollY>600); });
  toTop?.addEventListener('click', ()=> window.scrollTo({top:0, behavior:'smooth'}));
})();

// Matrix rain background
(function matrixRain(){
  const canvas = $('#matrixCanvas'); if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let dpr = Math.max(1, window.devicePixelRatio||1);
  let w, h, cols, drops;
  const charset = 'アァカサタナハマヤャラワガザダバパ0123456789abcdefABCDEF$#@!*%&{}[]<>/\\|';

  function resize(){
    w = canvas.width = Math.floor(innerWidth * dpr);
    h = canvas.height = Math.floor(innerHeight * dpr);
    canvas.style.width = innerWidth + 'px';
    canvas.style.height = innerHeight + 'px';
    const fontSize = Math.max(12, Math.round(14 * dpr));
    ctx.font = fontSize + 'px "Share Tech Mono", monospace';
    cols = Math.floor(w / (fontSize + 2));
    drops = new Array(cols).fill(0).map(()=> Math.floor(Math.random()*h));
  }
  resize();
  window.addEventListener('resize', resize);

  function step(){
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.fillRect(0,0,w,h);
    for (let i=0;i<drops.length;i++){
      const text = charset[Math.floor(Math.random()*charset.length)];
      const x = i * 16 * dpr;
      const y = drops[i] * 16;
      ctx.fillStyle = Math.random()>0.975 ? 'rgba(255,255,255,0.9)' : 'rgba(34,197,94,0.85)';
      ctx.fillText(text, x, y);
      if (y > h && Math.random() > 0.975) drops[i] = 0; else drops[i]++;
    }
    requestAnimationFrame(step);
  }
  step();
})();

// Custom cursor
(function customCursor(){
  const dot = $('.cursor-dot');
  const ring = $('.cursor-ring');
  const spot = $('.spotlight');
  if (!dot || !ring) return;
  let x=0,y=0, rx=0, ry=0;
  const lerp = (a,b,t)=> a+(b-a)*t;
  window.addEventListener('mousemove', (e)=>{ x=e.clientX; y=e.clientY; dot.style.transform=`translate(${x}px,${y}px)`; });
  function loop(){
    rx = lerp(rx, x, 0.2); ry = lerp(ry, y, 0.2);
    ring.style.transform = `translate(${rx}px,${ry}px)`;
    // Lantern spotlight follows via CSS vars to avoid transform conflicts
    if (spot) {
      spot.style.setProperty('--x', `${rx}px`);
      spot.style.setProperty('--y', `${ry}px`);
    }
    requestAnimationFrame(loop);
  }
  loop();
  window.addEventListener('mousedown', ()=> ring.classList.add('active'));
  window.addEventListener('mouseup', ()=> ring.classList.remove('active'));
  // Hover states
  ['a','button','.btn','.card.project','.magnetic'].forEach(sel=>{
    $$(sel).forEach(el=>{
      el.addEventListener('mouseenter', ()=> ring.classList.add('active'));
      el.addEventListener('mouseleave', ()=> ring.classList.remove('active'));
    });
  });
})();

// Magnetic hover
(function magnetic(){
  const strength = 18;
  function calc(e, el){
    const rect = el.getBoundingClientRect();
    const dx = e.clientX - (rect.left + rect.width/2);
    const dy = e.clientY - (rect.top + rect.height/2);
    return { x: (dx/rect.width)*strength, y: (dy/rect.height)*strength };
  }
  $$('.magnetic').forEach(el=>{
    el.style.transform = 'translate3d(0,0,0)';
    el.addEventListener('mousemove', (e)=>{
      const {x,y} = calc(e, el);
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    });
    el.addEventListener('mouseleave', ()=>{ el.style.transform = 'translate3d(0,0,0)'; });
  });
})();

// Tilt effect
(function tilt(){
  $$('.tilt').forEach(card=>{
    const glow = card.querySelector('.glow');
    card.addEventListener('mousemove', (e)=>{
      const r = card.getBoundingClientRect();
      const x = e.clientX - r.left; const y = e.clientY - r.top;
      const rx = ((y / r.height) - 0.5) * -10;
      const ry = ((x / r.width) - 0.5) * 10;
      card.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg)`;
      glow?.style.setProperty('--mx', `${(x/r.width)*100}%`);
      glow?.style.setProperty('--my', `${(y/r.height)*100}%`);
    });
    card.addEventListener('mouseleave', ()=>{ card.style.transform = 'perspective(900px) rotateX(0) rotateY(0)'; });
  });
})();

// Stats & skills animations (reuse IO)
(function ioAnims(){
  const ioReveal = new IntersectionObserver(entries=>{
    entries.forEach(en=>{ if(en.isIntersecting){ en.target.classList.add('revealed'); ioReveal.unobserve(en.target);} });
  }, {threshold:0.15});
  $$('.project, .tl-item, .stat').forEach(el=> ioReveal.observe(el));

  const ioStats = new IntersectionObserver(entries=>{
    entries.forEach(en=>{
      if(!en.isIntersecting) return;
      const el = en.target; const end = parseInt(el.getAttribute('data-target')||'0',10);
      let cur=0; const step = Math.max(1, Math.ceil(end/60));
      const tick=()=>{ cur=Math.min(end, cur+step); el.textContent=String(cur); if(cur<end) requestAnimationFrame(tick); };
      tick(); ioStats.unobserve(el);
    });
  }, {threshold:0.6});
  $$('.stat .num').forEach(el=> ioStats.observe(el));

  const ioSkills = new IntersectionObserver(entries=>{
    entries.forEach(en=>{
      if(!en.isIntersecting) return;
      $$('.skill-bar span', en.target).forEach(sp=>{ const lvl = Number(sp.getAttribute('data-level')) || 0; sp.style.setProperty('--p', `${lvl}%`); });
      ioSkills.unobserve(en.target);
    });
  }, {threshold:0.3});
  $$('.skills-wrap').forEach(el=> ioSkills.observe(el));
})();

// Modals
(function modals(){
  const openers = $$('[data-open]');
  const closeModal = (m)=>{ m.setAttribute('hidden',''); document.body.style.overflow = ''; };
  openers.forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const id = btn.getAttribute('data-open');
      const m = id && document.getElementById(id);
      if (!m) return;
      m.removeAttribute('hidden');
      document.body.style.overflow = 'hidden';
      const dlg = m.querySelector('.modal-dialog');
      dlg?.focus();
    });
  });
  $$('.modal').forEach(m=>{
    m.addEventListener('click', (e)=>{ if (e.target === m || (e.target instanceof HTMLElement && e.target.matches('[data-close]'))) closeModal(m); });
    document.addEventListener('keydown', (e)=>{ if (e.key === 'Escape' && !m.hasAttribute('hidden')) closeModal(m); });
  });
})();

// Copy to clipboard
(function copyToClipboard(){
  const status = $('.copy-status');
  $$('.contact-list li[data-copy]').forEach(li=>{
    li.addEventListener('click', async ()=>{
      const text = li.getAttribute('data-copy');
      try {
        await navigator.clipboard.writeText(text||'');
        if (status) { status.textContent = `Copied: ${text}`; setTimeout(()=> status.textContent = '', 1500); }
      } catch(e){
        if (status) { status.textContent = 'Copy failed'; setTimeout(()=> status.textContent = '', 1500); }
      }
    });
  });
})();

// Proximity-based lighting and spotlight
(function proximityLighting(){
  const spotlight = document.querySelector('.spotlight');
  const targets = () => $$('.btn, .site-nav a, .card.project, .section-title, .profile-card, .tags span');
  let rects = [];
  let mx = innerWidth/2, my = innerHeight/2, rx = mx, ry = my;
  const lerp = (a,b,t)=> a+(b-a)*t;

  function computeRects(){
    rects = targets().map(el => {
      const r = el.getBoundingClientRect();
      // effective radius based on element size
      const rad = Math.min(280, Math.max(120, Math.hypot(r.width, r.height))) * (window.devicePixelRatio||1);
      return { el, left: r.left, top: r.top, width: r.width, height: r.height, cx: r.left + r.width/2, cy: r.top + r.height/2, radius: rad };
    });
  }

  computeRects();
  window.addEventListener('resize', computeRects);
  window.addEventListener('scroll', computeRects, { passive: true });
  window.addEventListener('orientationchange', computeRects);

  window.addEventListener('mousemove', (e)=>{ mx = e.clientX; my = e.clientY; }, { passive: true });

  function frame(){
    // Smooth spotlight follow
    rx = lerp(rx, mx, 0.18); ry = lerp(ry, my, 0.18);
    if (spotlight) spotlight.style.transform = `translate(${rx}px, ${ry}px)`;

    // Update intensities for each target
    for (let i=0;i<rects.length;i++){
      const r = rects[i];
      // distance from mouse to element center
      const dx = mx - r.cx; const dy = my - r.cy; const dist = Math.hypot(dx, dy);
      const raw = Math.max(0, 1 - dist / r.radius);
      // non-linear falloff for punchier center glow
      const intensity = Math.pow(raw, 1.6);
      r.el.style.setProperty('--intensity', intensity.toFixed(3));
      // Slight transform for nav items
      if (r.el.matches('.site-nav a')){
        const scale = 1 + intensity * 0.06;
        const ty = -intensity * 2;
        r.el.style.transform = `translateY(${ty}px) scale(${scale})`;
      }
    }
    requestAnimationFrame(frame);
  }
  frame();
})();

// Parallax layers (scroll + mouse depth)
(function parallax(){
  const container = document.querySelector('.parallax');
  if (!container) return;
  const layers = $$('.parallax .layer');
  let mx = innerWidth/2, my = innerHeight/2;
  let sx = 0, sy = 0; // smoothed mouse offset
  const lerp = (a,b,t)=> a+(b-a)*t;
  window.addEventListener('mousemove', (e)=>{ mx = e.clientX; my = e.clientY; }, { passive: true });
  function frame(){
    const cx = innerWidth/2, cy = innerHeight/2;
    sx = lerp(sx, (mx - cx)/cx, 0.06);
    sy = lerp(sy, (my - cy)/cy, 0.06);
    const sc = window.scrollY || document.documentElement.scrollTop || 0;
    layers.forEach(el => {
      const depth = parseFloat(el.getAttribute('data-depth') || '0.08');
      const y = sc * depth;
      const x = sx * 20 * depth;
      const myoff = sy * 20 * depth;
      el.style.transform = `translate3d(${x}px, ${y + myoff}px, 0)`;
    });
    requestAnimationFrame(frame);
  }
  frame();
})();

// Footer year
(function year(){ const y=$('#year'); if (y) y.textContent = String(new Date().getFullYear()); })();

// Typing hero effect
(function typing(){
  const el = document.getElementById('typewriter');
  if (!el) return;
  let strings = [];
  try { strings = JSON.parse(el.getAttribute('data-strings')||'[]'); } catch {}
  let si = 0, ci = 0, deleting = false;
  function tick(){
    const str = strings[si] || '';
    if (!deleting) {
      ci++;
      el.textContent = str.slice(0, ci);
      if (ci >= str.length) { deleting = true; setTimeout(tick, 1000); return; }
    } else {
      ci--;
      el.textContent = str.slice(0, ci);
      if (ci <= 0) { deleting = false; si = (si+1) % strings.length; }
    }
    const delay = deleting ? 30 : 50;
    setTimeout(tick, delay);
  }
  tick();
})();

// Scroll progress bar
(function progressBar(){
  const bar = document.querySelector('.progress-top .bar');
  if (!bar) return;
  function onScroll(){
    const h = document.documentElement;
    const max = h.scrollHeight - h.clientHeight;
    const p = max > 0 ? (h.scrollTop / max) * 100 : 0;
    bar.style.width = p + '%';
  }
  document.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

// Left rail scroll-spy
(function rail(){
  const links = $$('.rail a'); if (!links.length) return;
  const sections = links.map(a => ({ id: a.getAttribute('data-section'), el: document.getElementById(a.getAttribute('data-section')||'') })).filter(x=>x.el);
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      const id = en.target.getAttribute('id');
      if (en.isIntersecting) {
        links.forEach(a => a.classList.toggle('active', a.getAttribute('data-section') === id));
      }
    });
  }, { threshold: 0.5 });
  sections.forEach(s => io.observe(s.el));
})();

// Project chapters expand/collapse
(function chapters(){
  $$('.card.project [data-expand]').forEach(btn => {
    btn.setAttribute('aria-expanded', 'false');
    btn.addEventListener('click', () => {
      const card = btn.closest('.card.project');
      const chap = card?.querySelector('.chapter');
      if (!chap) return;
      const isOpen = !chap.hasAttribute('hidden');
      if (isOpen) { chap.setAttribute('hidden', ''); btn.setAttribute('aria-expanded', 'false'); }
      else { chap.removeAttribute('hidden'); btn.setAttribute('aria-expanded', 'true'); }
    });
  });
})();
