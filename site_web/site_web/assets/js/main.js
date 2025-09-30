// Utilities
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

// Theme toggle with persistence
(function themeToggle() {
  const root = document.documentElement;
  const toggle = document.getElementById('themeToggle');
  const saved = localStorage.getItem('theme');
  if (saved === 'light') root.classList.add('light');
  toggle?.addEventListener('click', () => {
    root.classList.toggle('light');
    localStorage.setItem('theme', root.classList.contains('light') ? 'light' : 'dark');
    toggle.innerHTML = root.classList.contains('light') ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
  });
  // set initial icon
  toggle.innerHTML = root.classList.contains('light') ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
})();

// Mobile nav toggle
(function navToggle() {
  const btn = document.querySelector('.nav-toggle');
  btn?.addEventListener('click', () => {
    const expanded = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', String(!expanded));
    document.body.classList.toggle('nav-open', !expanded);
  });
  // Close on link click (mobile)
  $$('.site-nav a').forEach(a => a.addEventListener('click', () => {
    document.body.classList.remove('nav-open');
    const btn = document.querySelector('.nav-toggle');
    btn?.setAttribute('aria-expanded', 'false');
  }));
})();

// Smooth scroll
(function smoothScroll() {
  $$('.site-nav a, .scroll-down').forEach(link => {
    link.addEventListener('click', e => {
      const href = link.getAttribute('href');
      if (href?.startsWith('#')) {
        e.preventDefault();
        document.querySelector(href)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
})();

// Back to top button
(function toTop() {
  const btn = document.getElementById('toTop');
  window.addEventListener('scroll', () => {
    const show = window.scrollY > 600;
    btn?.classList.toggle('visible', show);
  });
  btn?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
})();

// Intersection Observer reveals
(function reveals() {
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  $$('.reveal').forEach(el => io.observe(el));
})();

// Stats counter
(function statsCounter() {
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const end = parseInt(el.getAttribute('data-target') || '0', 10);
        let current = 0;
        const step = Math.max(1, Math.ceil(end / 60));
        const tick = () => {
          current = Math.min(end, current + step);
          el.textContent = String(current);
          if (current < end) requestAnimationFrame(tick);
        };
        tick();
        io.unobserve(el);
      }
    });
  }, { threshold: 0.6 });
  $$('.stat .num').forEach(el => io.observe(el));
})();

// Skills bars animation
(function skillsBars() {
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const spans = $$('.skill-bar span', entry.target);
        spans.forEach(sp => {
          const lvl = Number(sp.getAttribute('data-level')) || 0;
          sp.style.setProperty('--p', `${lvl}%`);
        });
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });
  $$('.skills-wrap').forEach(el => io.observe(el));
})();

// Tilt effect for profile card
(function tiltEffect() {
  const card = document.querySelector('.profile-card');
  const glow = card?.querySelector('.glow');
  if (!card || !glow) return;
  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const rx = ((y / rect.height) - 0.5) * -8;
    const ry = ((x / rect.width) - 0.5) * 8;
    card.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg)`;
    glow.style.setProperty('--mx', `${(x/rect.width)*100}%`);
    glow.style.setProperty('--my', `${(y/rect.height)*100}%`);
  });
  card.addEventListener('mouseleave', () => {
    card.style.transform = 'perspective(800px) rotateX(0) rotateY(0)';
  });
})();

// Canvas particles background
(function particles() {
  const canvas = document.getElementById('bgCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let dpr = Math.max(1, window.devicePixelRatio || 1);
  let w, h;

  const colors = [
    'rgba(34,197,94,0.55)', // emerald-500
    'rgba(74,222,128,0.5)', // emerald-400
    'rgba(255,255,255,0.14)'
  ];
  const particles = [];
  const NUM = 80;

  const resize = () => {
    w = canvas.width = Math.floor(innerWidth * dpr);
    h = canvas.height = Math.floor(innerHeight * dpr);
    canvas.style.width = innerWidth + 'px';
    canvas.style.height = innerHeight + 'px';
  };
  resize();
  window.addEventListener('resize', resize);

  function spawn(i) {
    const speed = 0.15 + Math.random() * 0.6;
    particles[i] = {
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() * 2 - 1) * speed,
      vy: (Math.random() * 2 - 1) * speed,
      r: (1 + Math.random() * 2) * dpr,
      c: colors[Math.floor(Math.random() * colors.length)]
    };
  }

  for (let i = 0; i < NUM; i++) spawn(i);

  function step() {
    ctx.clearRect(0, 0, w, h);

    // connect lines
    for (let i = 0; i < NUM; i++) {
      const p = particles[i];
      for (let j = i + 1; j < NUM; j++) {
        const q = particles[j];
        const dx = p.x - q.x; const dy = p.y - q.y; const dist2 = dx*dx + dy*dy;
        if (dist2 < (140 * dpr) ** 2) {
          ctx.strokeStyle = 'rgba(200,200,255,0.07)';
          ctx.lineWidth = 1 * dpr;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
        }
      }
    }

    // move and draw
    for (let i = 0; i < NUM; i++) {
      const p = particles[i];
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > w) p.vx *= -1;
      if (p.y < 0 || p.y > h) p.vy *= -1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
      ctx.fillStyle = p.c;
      ctx.fill();
    }

    requestAnimationFrame(step);
  }
  step();
})();

// Footer year
(function year() {
  const y = document.getElementById('year');
  if (y) y.textContent = String(new Date().getFullYear());
})();

// Fake contact submit
(function contactForm() {
  const form = document.querySelector('.contact-form');
  const status = document.querySelector('.form-status');
  form?.addEventListener('submit', () => {
    if (!status) return;
    status.textContent = 'Sending...';
    setTimeout(() => { status.textContent = 'Thanks! I\'ll get back to you shortly.'; }, 900);
  });
})();
