// Fantasy interactive variant JS
const $ = (s, c=document) => c.querySelector(s);
const $$ = (s, c=document) => Array.from(c.querySelectorAll(s));

// Progress bar
(function progress(){
  const bar = document.querySelector('.progress-top .bar'); if (!bar) return;
  function onScroll(){ const h = document.documentElement; const max = h.scrollHeight - h.clientHeight; const p = max>0 ? (h.scrollTop/max)*100 : 0; bar.style.width = p + '%'; }
  document.addEventListener('scroll', onScroll, {passive:true}); onScroll();
})();

// Rail scroll spy
(function rail(){
  const links = $$('.rail a'); if (!links.length) return;
  const sections = links.map(a=>({ id:a.getAttribute('data-section'), el: document.getElementById(a.getAttribute('data-section')||'') })).filter(x=>x.el);
  const io = new IntersectionObserver(es=>{
    es.forEach(en=>{ if(!en.isIntersecting) return; const id=en.target.id; links.forEach(a=> a.classList.toggle('active', a.getAttribute('data-section')===id)); });
  }, {threshold:0.6});
  sections.forEach(s=> io.observe(s.el));
})();

// Typing effect
(function typing(){
  const el = document.getElementById('tw'); if(!el) return;
  let strings=[]; try{ strings = JSON.parse(el.getAttribute('data-strings')||'[]'); }catch{}
  let si=0, ci=0, del=false;
  function tick(){ const str=strings[si]||''; if(!del){ ci++; el.textContent=str.slice(0,ci); if(ci>=str.length){ del=true; setTimeout(tick,1000); return; } } else { ci--; el.textContent=str.slice(0,ci); if(ci<=0){ del=false; si=(si+1)%strings.length; } } setTimeout(tick, del?30:50); }
  tick();
})();

// Accordion entries
(function accordion(){
  $$('.entry .toggle').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const body = btn.closest('.entry')?.querySelector('.entry-body');
      const expanded = btn.getAttribute('aria-expanded')==='true';
      btn.setAttribute('aria-expanded', String(!expanded));
      if(body){ if(expanded) body.setAttribute('hidden',''); else body.removeAttribute('hidden'); }
    });
  });
})();

// Contacts copy
(function copy(){
  const status = document.querySelector('.status');
  $$('.copy').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      try{ await navigator.clipboard.writeText(btn.getAttribute('data-copy')||''); if(status){ status.textContent='Copied!'; setTimeout(()=> status.textContent='', 1200);} }
      catch(e){ if(status){ status.textContent='Failed to copy'; setTimeout(()=> status.textContent='',1200);} }
    });
  });
})();

// Year
(function year(){ const y=document.getElementById('year'); if(y) y.textContent=String(new Date().getFullYear()); })();

// Parallax scene (moon, castle, hills, fog) - REDUCED horizontal movement for better centering
(function parallax(){
  const layers = $$('.scene .layer');
  if (!layers.length) return;
  let mx = innerWidth/2, my = innerHeight/2, sx = 0, sy = 0;
  const lerp = (a,b,t)=> a + (b-a)*t;
  window.addEventListener('mousemove', (e)=>{ mx = e.clientX; my = e.clientY; }, { passive: true });
  function frame(){
    const cx = innerWidth/2, cy = innerHeight/2;
    sx = lerp(sx, (mx - cx)/cx, 0.03);
    sy = lerp(sy, (my - cy)/cy, 0.03);
    const sc = window.scrollY || document.documentElement.scrollTop || 0;
    layers.forEach(el => {
      const depth = parseFloat(el.getAttribute('data-depth')||'0.1');
      const grounded = el.classList.contains('grounded');
      const rising = el.classList.contains('rise');
      // REDUCED horizontal parallax from 30 to 15 for better centering
      const x = Math.round(sx * 15 * depth);
      // Keep grounded layers vertically anchored to the ground; only subtle mouse Y if desired
      let y;
      if (grounded) {
        y = 0;
      } else if (rising) {
        // Start lower (positive offset) then rise to settle near base as page scrolls down
        const start = parseFloat(el.getAttribute('data-rise') || '220'); // px
        y = Math.round(start - sc * depth * 0.6 + sy * 15 * depth);
      } else {
        y = Math.round(sc * depth + sy * 15 * depth);
      }
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    });
    requestAnimationFrame(frame);
  }
  frame();
})();

// Stars — subtle twinkle
(function stars(){
  const c = document.getElementById('stars'); if (!c) return; const ctx = c.getContext('2d');
  let dpr=1, w=0, h=0, stars=[];
  function resize(){ dpr = window.devicePixelRatio||1; w = c.clientWidth; h = c.clientHeight; c.width = w*dpr; c.height = h*dpr; ctx.setTransform(dpr,0,0,dpr,0,0); build(); }
  function build(){ const count = Math.round((w*h)/14000); stars = new Array(count).fill(0).map(()=>({ x: Math.random()*w, y: Math.random()*h, r: Math.random()*1.4+0.2, a: Math.random(), s: Math.random()*0.002+0.001 })); }
  function draw(){ ctx.clearRect(0,0,w,h); ctx.fillStyle = '#ffffff'; stars.forEach(s=>{ s.a += s.s; const alpha = 0.35 + 0.65*(0.5+0.5*Math.sin(s.a*6.283)); ctx.globalAlpha = alpha; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI*2); ctx.fill(); }); requestAnimationFrame(draw); }
  resize(); window.addEventListener('resize', resize); draw();
})();

// Fireflies — warm drifting lights
(function fireflies(){
  const c = document.getElementById('fireflies'); if (!c) return; const ctx = c.getContext('2d');
  let dpr=1, w=0, h=0, bugs=[];
  function resize(){ dpr = window.devicePixelRatio||1; w = c.clientWidth; h = c.clientHeight; c.width = w*dpr; c.height = h*dpr; ctx.setTransform(dpr,0,0,dpr,0,0); build(); }
  function build(){ const count = Math.max(14, Math.round(Math.sqrt(w*h)/40)); bugs = new Array(count).fill(0).map(()=>({ x: Math.random()*w, y: Math.random()*h*0.6 + h*0.2, a: Math.random()*Math.PI*2, v: 0.3 + Math.random()*0.6, r: 1.2 + Math.random()*1.6, t: Math.random()*6 })); }
  function step(){ ctx.clearRect(0,0,w,h); bugs.forEach(b=>{ b.a += (Math.random()-0.5)*0.2; b.x += Math.cos(b.a)*b.v; b.y += Math.sin(b.a)*b.v*0.6; b.t += 0.03; const glow = 0.4 + 0.6*(0.5+0.5*Math.sin(b.t)); ctx.shadowBlur = 8 + 22*glow; ctx.shadowColor = `rgba(230,208,156,${0.5+0.5*glow})`; ctx.fillStyle = `rgba(230,208,156,${0.6+0.4*glow})`; ctx.beginPath(); ctx.arc(b.x,b.y,b.r,0,Math.PI*2); ctx.fill(); if (b.x<-10) b.x=w+10; if (b.x>w+10) b.x=-10; if (b.y<0) b.y=h*0.9; if (b.y>h) b.y=h*0.2; }); requestAnimationFrame(step); }
  resize(); window.addEventListener('resize', resize); step();
})();

// Reveal on scroll
(function reveal(){
  const els = $$('.reveal');
  if (!els.length) return;
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(en=>{
      if (en.isIntersecting) {
        en.target.classList.add('in', 'revealed');
        io.unobserve(en.target);
      }
    });
  }, { threshold: 0.2, rootMargin: '0px 0px -10% 0px' });
  els.forEach(el=> io.observe(el));
})();

// Scene switcher: when Skills (and beyond) is in view, fade to inside courtyard
(function sceneSwitch(){
  const body = document.body;
  const sections = ['prologue','about','experience','cv','timeline','skills','contact']
    .map(id => document.getElementById(id))
    .filter(Boolean);
  if (!sections.length) return;
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      const id = en.target.id;
      const inside = (id === 'skills' || id === 'contact');
      body.classList.toggle('is-inside', inside);
    });
  }, { threshold: 0.55 });
  sections.forEach(sec => io.observe(sec));
})();

// Scroll-driven zoom towards the courtyard gate while in the Skills chapter
(function innerZoom(){
  const root = document.documentElement;
  const body = document.body;
  const arsenal = document.getElementById('skills');
  if (!arsenal) return;
  const maxZoom = 1.18; // target zoom factor at end of section
  function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }
  function onScroll(){
    // Only zoom when inside scene is active
    if (!body.classList.contains('is-inside')) { root.style.setProperty('--inner-zoom', '1'); return; }
    const st = root.scrollTop || window.pageYOffset || 0;
    const top = arsenal.offsetTop;
    const h = arsenal.offsetHeight || 1;
    const p = clamp((st - top) / h, 0, 1); // 0 at start of arsenal, 1 at end
    const z = 1 + (maxZoom - 1) * p;
    root.style.setProperty('--inner-zoom', z.toFixed(4));
  }
  document.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();
})();

// Courtyard fireflies for inner scene
(function innerFireflies(){
  const c = document.getElementById('fireflies-inner'); if (!c) return; const ctx = c.getContext('2d');
  let dpr=1, w=0, h=0, bugs=[];
  function resize(){ dpr = window.devicePixelRatio||1; w = c.clientWidth; h = c.clientHeight; c.width = w*dpr; c.height = h*dpr; ctx.setTransform(dpr,0,0,dpr,0,0); build(); }
  function build(){ const count = Math.max(10, Math.round(Math.sqrt(w*h)/50)); bugs = new Array(count).fill(0).map(()=>({ x: Math.random()*w, y: Math.random()*h*0.5 + h*0.35, a: Math.random()*Math.PI*2, v: 0.25 + Math.random()*0.45, r: 1.0 + Math.random()*1.4, t: Math.random()*6 })); }
  function step(){ ctx.clearRect(0,0,w,h); bugs.forEach(b=>{ b.a += (Math.random()-0.5)*0.18; b.x += Math.cos(b.a)*b.v; b.y += Math.sin(b.a)*b.v*0.5; b.t += 0.03; const glow = 0.4 + 0.6*(0.5+0.5*Math.sin(b.t)); ctx.shadowBlur = 8 + 18*glow; ctx.shadowColor = `rgba(230,208,156,${0.5+0.5*glow})`; ctx.fillStyle = `rgba(230,208,156,${0.6+0.4*glow})`; ctx.beginPath(); ctx.arc(b.x,b.y,b.r,0,Math.PI*2); ctx.fill(); if (b.x<-10) b.x=w+10; if (b.x>w+10) b.x=-10; if (b.y< h*0.30) b.y = h*0.8; if (b.y>h) b.y=h*0.4; }); requestAnimationFrame(step); }
  function parallaxDrift(){ // gentle horizontal drift tied to scroll
    const sc = window.scrollY || document.documentElement.scrollTop || 0; const drift = (sc%2000)/2000; c.style.transform = `translateX(${(drift-0.5)*8}px)`; requestAnimationFrame(parallaxDrift); }
  resize(); window.addEventListener('resize', resize); step(); parallaxDrift();
})();

// Randomize armory card shapes for visual variety
(function randomizeArmory(){
  const cards = document.querySelectorAll('.armory .weapon');
  if (!cards.length) return;
  const variants = ['weapon--ribbon','weapon--diagonal','weapon--notch'];
  cards.forEach(el => {
    // Respect explicit override via data-shape (values: ribbon, diagonal, notch)
    const explicit = el.getAttribute('data-shape');
    const remove = ()=> el.classList.remove('weapon--ribbon','weapon--diagonal','weapon--notch');
    if (explicit) {
      remove();
      el.classList.add(`weapon--${explicit}`);
      return;
    }
    // Otherwise randomize each load
    remove();
    const pick = variants[Math.floor(Math.random()*variants.length)];
    el.classList.add(pick);
  });
})();
