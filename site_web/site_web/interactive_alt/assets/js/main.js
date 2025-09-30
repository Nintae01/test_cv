// Alternative interactive proposal JS
const $ = (s, c=document) => c.querySelector(s);
const $$ = (s, c=document) => Array.from(c.querySelectorAll(s));

// Typing effect
(function typing(){
  const el = $('#tw'); if (!el) return;
  let strings = [];
  try { strings = JSON.parse(el.getAttribute('data-strings')||'[]'); } catch {}
  let si=0, ci=0, del=false;
  function tick(){
    const str = strings[si] || '';
    if (!del){ ci++; el.textContent = str.slice(0,ci); if (ci>=str.length){ del=true; setTimeout(tick, 1000); return; } }
    else { ci--; el.textContent = str.slice(0,ci); if (ci<=0){ del=false; si=(si+1)%strings.length; } }
    setTimeout(tick, del?28:48);
  }
  tick();
})();

// Progress bar
(function progress(){
  const bar = document.querySelector('.progress-top .bar'); if (!bar) return;
  function onScroll(){
    const h = document.documentElement; const max = h.scrollHeight - h.clientHeight; const p = max>0 ? (h.scrollTop/max)*100 : 0;
    bar.style.width = p + '%';
  }
  document.addEventListener('scroll', onScroll, {passive:true}); onScroll();
})();

// Rail-alt scroll spy
(function rail(){
  const links = $$('.rail-alt a'); if (!links.length) return;
  const sections = links.map(a=>({ id:a.getAttribute('data-section'), el: document.getElementById(a.getAttribute('data-section')||'') })).filter(x=>x.el);
  const io = new IntersectionObserver(es=>{
    es.forEach(en=>{
      if (!en.isIntersecting) return;
      const id = en.target.id;
      links.forEach(a=> a.classList.toggle('active', a.getAttribute('data-section')===id));
    });
  }, {threshold:0.6});
  sections.forEach(s=> io.observe(s.el));
})();

// Copy to clipboard (Signal)
(function copy(){
  const status = $('#copyStatus');
  $$('[data-copy]').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      try { await navigator.clipboard.writeText(btn.getAttribute('data-copy')||''); if(status){ status.textContent='Copied!'; setTimeout(()=> status.textContent='',1200);} }
      catch(e){ if(status){ status.textContent='Copy failed'; setTimeout(()=> status.textContent='',1200);} }
    });
  });
})();

// Footer year
(function year(){ const y = document.getElementById('year'); if (y) y.textContent = String(new Date().getFullYear()); })();
