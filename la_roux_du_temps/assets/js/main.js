/* La Roux du Temps — logique de la boutique (100 % côté navigateur). */
(function () {
  'use strict';

  const D = window.LRT_DATA;
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));

  /* ---------- Utilitaires ---------- */
  const euro = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 }).format(n);
  const stars = (note) => {
    const full = Math.round(note);
    return '★'.repeat(full) + '☆'.repeat(5 - full);
  };
  const store = {
    get(k, def) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch { return def; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* navigation privée */ } }
  };
  const byId = (id) => D.produits.find((p) => p.id === id);
  const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- Toasts ---------- */
  const toastStack = $('#toast-stack');
  function toast(msg, type = 'info', icon) {
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<span>${icon || (type === 'success' ? '✅' : type === 'error' ? '⚠️' : '🕰️')}</span><span>${msg}</span>`;
    toastStack.appendChild(el);
    setTimeout(() => { el.classList.add('is-leaving'); setTimeout(() => el.remove(), 300); }, 3200);
  }

  /* ---------- Thème ---------- */
  const root = document.documentElement;
  root.setAttribute('data-theme', store.get('lrt_theme', 'dark'));
  $('#theme-toggle').addEventListener('click', () => {
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    store.set('lrt_theme', next);
    toast(next === 'dark' ? 'Mode nuit activé. Les index luminescents vous remercient.' : 'Mode jour activé. Attention aux reflets.', 'info', next === 'dark' ? '🌙' : '☀️');
  });

  /* ---------- En-tête, menu, navigation active ---------- */
  const header = $('#header');
  const nav = $('#nav');
  const burger = $('#burger');
  window.addEventListener('scroll', () => {
    header.classList.toggle('is-scrolled', window.scrollY > 10);
  }, { passive: true });
  burger.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
  });
  $$('a', nav).forEach((a) => a.addEventListener('click', () => { nav.classList.remove('is-open'); burger.setAttribute('aria-expanded', 'false'); }));

  const sections = $$('main section[id]');
  const navLinks = $$('.nav a');
  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      navLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === `#${e.target.id}`));
    });
  }, { rootMargin: '-40% 0px -55% 0px' });
  sections.forEach((s) => sectionObserver.observe(s));

  $('#back-top').addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  $('#year').textContent = new Date().getFullYear();

  /* ---------- Apparition au défilement + compteurs ---------- */
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-visible');
      $$('[data-counter]', e.target).forEach(animateCounter);
      revealObserver.unobserve(e.target);
    });
  }, { threshold: 0.15 });
  $$('.reveal').forEach((el) => revealObserver.observe(el));

  function animateCounter(el) {
    if (el.dataset.done) return;
    el.dataset.done = '1';
    const target = Number(el.dataset.counter);
    const suffix = el.dataset.suffix || '';
    const start = performance.now();
    const dur = 1600;
    const tick = (now) => {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased).toLocaleString('fr-FR') + suffix;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /* ---------- Montres en direct (logo + héros) ---------- */
  const heroLook = byId('safran').look;
  $('#hero-watch').innerHTML = watchSVG(heroLook, { bracelet: '#b8bcc4', type: 'acier' }, { live: true, label: 'Horloge en direct de l\'atelier' });
  $('#brand-logo').innerHTML = `<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="30" fill="#1b0f2e"/><circle cx="32" cy="32" r="26" fill="none" stroke="#ff7a1f" stroke-width="4"/><g data-hand="h"><path d="M32 32V18" stroke="#ffc542" stroke-width="4" stroke-linecap="round"/></g><g data-hand="m"><path d="M32 32V12" stroke="#ffc542" stroke-width="3" stroke-linecap="round"/></g><circle cx="32" cy="32" r="3" fill="#ffc542"/></svg>`;

  const liveClocks = [
    { root: $('#hero-watch'), cx: 100, cy: 130 },
    { root: $('#brand-logo'), cx: 32, cy: 32 }
  ];
  function tickClocks() {
    const now = new Date();
    const s = now.getSeconds() + now.getMilliseconds() / 1000;
    const m = now.getMinutes() + s / 60;
    const h = (now.getHours() % 12) + m / 60;
    liveClocks.forEach(({ root, cx, cy }) => {
      const set = (name, deg) => { const el = root.querySelector(`[data-hand="${name}"]`); if (el) el.setAttribute('transform', `rotate(${deg} ${cx} ${cy})`); };
      set('h', h * 30);
      set('m', m * 6);
      set('s', Math.floor(s) * 6);
      set('gmt', ((now.getUTCHours() + now.getUTCMinutes() / 60) * 15));
    });
    $('#hero-time').textContent = now.toLocaleTimeString('fr-FR');
  }
  tickClocks();
  setInterval(tickClocks, 1000);

  /* ---------- État : panier & favoris ---------- */
  let cart = store.get('lrt_cart', []);        // [{ id, variante, qty }]
  let wishlist = store.get('lrt_wish', []);    // [id]
  let promo = store.get('lrt_promo', null);    // { code, type, valeur }
  const PROMOS = {
    ROUX10: { type: 'pct', valeur: 10, label: '-10 % sur votre commande' },
    ROUSSEUR: { type: 'fixe', valeur: 50, min: 500, label: '-50 € dès 500 € d\'achat' },
    CANNELLE: { type: 'pct', valeur: 5, label: '-5 % parfumés' }
  };
  const SHIPPING = { colissimo: 5.9, chronopost: 9.9, retrait: 0 };
  const FREE_SHIPPING_FROM = 150;

  const cartCount = () => cart.reduce((n, i) => n + i.qty, 0);
  const cartSubtotal = () => cart.reduce((n, i) => n + byId(i.id).prix * i.qty, 0);
  function cartDiscount(sub = cartSubtotal()) {
    if (!promo) return 0;
    const p = PROMOS[promo.code];
    if (!p) return 0;
    if (p.min && sub < p.min) return 0;
    return p.type === 'pct' ? Math.round(sub * p.valeur) / 100 : Math.min(p.valeur, sub);
  }
  function shippingCost(mode = 'colissimo', sub = cartSubtotal() - cartDiscount()) {
    if (mode === 'colissimo' && sub >= FREE_SHIPPING_FROM) return 0;
    return SHIPPING[mode] ?? 0;
  }
  function saveCart() { store.set('lrt_cart', cart); store.set('lrt_promo', promo); renderCartBadge(); renderCart(); }
  function saveWish() { store.set('lrt_wish', wishlist); renderWishBadge(); renderWishlist(); syncWishButtons(); }

  function renderCartBadge() {
    const n = cartCount();
    const b = $('#cart-count');
    b.hidden = n === 0;
    b.textContent = n;
    if (n) { b.style.animation = 'none'; void b.offsetWidth; b.style.animation = ''; }
  }
  function renderWishBadge() {
    const b = $('#wishlist-count');
    b.hidden = wishlist.length === 0;
    b.textContent = wishlist.length;
  }

  function addToCart(id, variante = 0, qty = 1, sourceEl) {
    const p = byId(id);
    const line = cart.find((i) => i.id === id && i.variante === variante);
    if (line) line.qty = Math.min(5, line.qty + qty); else cart.push({ id, variante, qty: Math.min(5, qty) });
    saveCart();
    if (sourceEl) flyToCart(sourceEl);
    toast(`<strong>${escapeHtml(p.nom)}</strong> ajoutée au panier`, 'success', '🛒');
  }
  function toggleWish(id) {
    const p = byId(id);
    if (wishlist.includes(id)) { wishlist = wishlist.filter((x) => x !== id); toast(`${escapeHtml(p.nom)} retirée des favoris`, 'info', '💔'); }
    else { wishlist.push(id); toast(`<strong>${escapeHtml(p.nom)}</strong> ajoutée aux favoris`, 'success', '❤️'); }
    saveWish();
  }

  function flyToCart(sourceEl) {
    const svg = sourceEl.closest('.product-card, .modal-card')?.querySelector('.watch-svg');
    if (!svg) return;
    const from = svg.getBoundingClientRect();
    const to = $('#cart-btn').getBoundingClientRect();
    const clone = svg.cloneNode(true);
    clone.classList.add('fly');
    clone.style.left = `${from.left + from.width / 2 - 30}px`;
    clone.style.top = `${from.top + from.height / 2 - 40}px`;
    document.body.appendChild(clone);
    requestAnimationFrame(() => {
      clone.style.transform = `translate(${to.left + to.width / 2 - (from.left + from.width / 2)}px, ${to.top + to.height / 2 - (from.top + from.height / 2)}px) scale(.15) rotate(360deg)`;
      clone.style.opacity = '0';
    });
    setTimeout(() => clone.remove(), 850);
  }

  /* ---------- Catalogue ---------- */
  const grid = $('#product-grid');
  const state = { cat: 'toutes', q: '', max: 2000, sort: 'pertinence' };

  function badgeClass(b) { return b === 'Nouveau' ? 'nouveau' : b === 'Édition limitée' ? 'limitee' : ''; }

  function filtered() {
    const q = state.q.trim().toLowerCase();
    let list = D.produits.filter((p) =>
      (state.cat === 'toutes' || p.categorie === state.cat) &&
      p.prix <= state.max &&
      (!q || `${p.nom} ${p.description} ${D.categories[p.categorie]} ${p.variantes.map((v) => v.nom).join(' ')}`.toLowerCase().includes(q))
    );
    const sorters = {
      pertinence: (a, b) => a.ordre - b.ordre,
      'prix-asc': (a, b) => a.prix - b.prix,
      'prix-desc': (a, b) => b.prix - a.prix,
      note: (a, b) => b.note - a.note || b.avis - a.avis,
      nouveau: (a, b) => Number(b.nouveau) - Number(a.nouveau) || a.ordre - b.ordre
    };
    return list.sort(sorters[state.sort]);
  }

  function renderProducts() {
    const list = filtered();
    grid.innerHTML = list.map((p, i) => {
      const v = p.variantes[0];
      return `
      <article class="product-card" data-id="${p.id}" style="--glow:${p.look.accent}55; animation-delay:${i * 40}ms">
        <div class="product-visual" role="button" tabindex="0" aria-label="Voir ${escapeHtml(p.nom)}">
          ${p.badge ? `<span class="product-badge ${badgeClass(p.badge)}">${p.badge}</span>` : ''}
          ${watchSVG(p.look, v, { label: p.nom })}
        </div>
        <button type="button" class="wish-btn ${wishlist.includes(p.id) ? 'is-active' : ''}" data-wish="${p.id}" aria-label="Ajouter ${escapeHtml(p.nom)} aux favoris" aria-pressed="${wishlist.includes(p.id)}">${wishlist.includes(p.id) ? '♥' : '♡'}</button>
        <div class="product-body">
          <span class="product-cat">${D.categories[p.categorie]}</span>
          <h3 class="product-name">${escapeHtml(p.nom)}</h3>
          <div class="rating"><span class="stars" aria-hidden="true">${stars(p.note)}</span><span>${p.note.toFixed(1).replace('.', ',')} · ${p.avis} avis</span></div>
          <div class="variant-dots" aria-label="${p.variantes.length} bracelets disponibles">${p.variantes.map((x) => `<span style="background:${x.bracelet}" title="${escapeHtml(x.nom)}"></span>`).join('')}</div>
          <div class="product-foot">
            <span class="price">${euro(p.prix)}</span>
            <button type="button" class="btn btn-primary" data-add="${p.id}">Ajouter</button>
          </div>
        </div>
      </article>`;
    }).join('');
    $('#empty-state').hidden = list.length > 0;
    $('#results-info').textContent = list.length === 0 ? '' : `${list.length} montre${list.length > 1 ? 's' : ''} ${state.cat === 'toutes' ? 'dans la collection' : 'dans cette catégorie'}${state.max < 2000 ? ` jusqu'à ${euro(state.max)}` : ''}`;
  }

  grid.addEventListener('click', (e) => {
    const add = e.target.closest('[data-add]');
    if (add) { addToCart(add.dataset.add, 0, 1, add); return; }
    const wish = e.target.closest('[data-wish]');
    if (wish) { toggleWish(wish.dataset.wish); return; }
    const visual = e.target.closest('.product-visual');
    if (visual) openProduct(visual.closest('.product-card').dataset.id);
  });
  grid.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('product-visual')) { e.preventDefault(); openProduct(e.target.closest('.product-card').dataset.id); }
  });

  $('#category-chips').addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    $$('.chip', $('#category-chips')).forEach((c) => c.classList.toggle('is-active', c === chip));
    state.cat = chip.dataset.cat;
    renderProducts();
  });
  $('#search').addEventListener('input', (e) => { state.q = e.target.value; renderProducts(); });
  const priceRange = $('#price-range');
  priceRange.addEventListener('input', (e) => { state.max = Number(e.target.value); $('#price-label').textContent = euro(state.max); renderProducts(); });
  $('#sort').addEventListener('change', (e) => { state.sort = e.target.value; renderProducts(); });
  $('#reset-filters').addEventListener('click', () => {
    state.cat = 'toutes'; state.q = ''; state.max = 2000; state.sort = 'pertinence';
    $('#search').value = ''; priceRange.value = 2000; $('#price-label').textContent = euro(2000); $('#sort').value = 'pertinence';
    $$('.chip').forEach((c) => c.classList.toggle('is-active', c.dataset.cat === 'toutes'));
    renderProducts();
  });

  function syncWishButtons() {
    $$('[data-wish]').forEach((b) => {
      const on = wishlist.includes(b.dataset.wish);
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', String(on));
      b.textContent = on ? '♥' : '♡';
    });
    if (modal.product) {
      const on = wishlist.includes(modal.product.id);
      $('#modal-wish').classList.toggle('is-active', on);
      $('#modal-wish').textContent = on ? '♥' : '♡';
    }
  }

  /* ---------- Gestion générique des modales ---------- */
  let lastFocus = null;
  function openModal(el) {
    lastFocus = document.activeElement;
    el.hidden = false;
    document.body.classList.add('no-scroll');
    const focusable = el.querySelector('input, button:not([data-close]), select, [tabindex]');
    (focusable || el.querySelector('[data-close]')).focus({ preventScroll: true });
  }
  function closeModal(el) {
    el.hidden = true;
    if (!$$('.modal:not([hidden])').length && !$('.drawer.is-open')) document.body.classList.remove('no-scroll');
    if (lastFocus) lastFocus.focus({ preventScroll: true });
  }
  $$('.modal').forEach((m) => {
    m.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) closeModal(m); });
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    $$('.modal:not([hidden])').forEach(closeModal);
    closeDrawers();
  });

  /* ---------- Modale produit ---------- */
  const modal = { el: $('#product-modal'), product: null, variante: 0 };
  function openProduct(id) {
    const p = byId(id);
    modal.product = p;
    modal.variante = 0;
    $('#modal-category').textContent = D.categories[p.categorie] + (p.badge ? ` · ${p.badge}` : '');
    $('#modal-title').textContent = p.nom;
    $('#modal-rating').innerHTML = `<span class="stars" aria-hidden="true">${stars(p.note)}</span><span>${p.note.toFixed(1).replace('.', ',')} / 5 · ${p.avis} avis vérifiés</span>`;
    $('#modal-desc').textContent = p.description;
    $('#modal-specs').innerHTML = Object.entries(p.specs).map(([k, v]) => `<dt>${k}</dt><dd>${escapeHtml(v)}</dd>`).join('');
    $('#modal-price').textContent = euro(p.prix);
    $('#qty-input').value = 1;
    $('.modal-visual').style.setProperty('--glow', p.look.accent + '66');
    $('#modal-swatches').innerHTML = p.variantes.map((v, i) => `<button type="button" class="swatch ${i === 0 ? 'is-active' : ''}" role="radio" aria-checked="${i === 0}" data-variante="${i}" style="background:${v.bracelet}" title="${escapeHtml(v.nom)}" aria-label="${escapeHtml(v.nom)}"></button>`).join('');
    renderModalWatch();
    syncWishButtons();
    openModal(modal.el);
  }
  function renderModalWatch() {
    const p = modal.product, v = p.variantes[modal.variante];
    $('#modal-visual').innerHTML = watchSVG(p.look, v, { label: `${p.nom}, bracelet ${v.nom}` });
    $('#modal-variant-name').textContent = v.nom;
    $$('.swatch').forEach((s) => { const on = Number(s.dataset.variante) === modal.variante; s.classList.toggle('is-active', on); s.setAttribute('aria-checked', String(on)); });
  }
  $('#modal-swatches').addEventListener('click', (e) => {
    const s = e.target.closest('.swatch');
    if (!s) return;
    modal.variante = Number(s.dataset.variante);
    renderModalWatch();
  });
  $('#qty-minus').addEventListener('click', () => { const i = $('#qty-input'); i.value = Math.max(1, Number(i.value) - 1); });
  $('#qty-plus').addEventListener('click', () => { const i = $('#qty-input'); i.value = Math.min(5, Number(i.value) + 1); });
  $('#modal-add').addEventListener('click', (e) => {
    addToCart(modal.product.id, modal.variante, Math.min(5, Math.max(1, Number($('#qty-input').value) || 1)), e.currentTarget);
    closeModal(modal.el);
    openDrawer('cart');
  });
  $('#modal-wish').addEventListener('click', () => toggleWish(modal.product.id));

  /* ---------- Tiroirs ---------- */
  const backdrop = $('#cart-backdrop');
  function openDrawer(which) {
    closeDrawers(true);
    const d = $(`#${which}-drawer`);
    d.classList.add('is-open');
    d.setAttribute('aria-hidden', 'false');
    backdrop.hidden = false;
    document.body.classList.add('no-scroll');
    if (which === 'cart') renderCart(); else renderWishlist();
  }
  function closeDrawers(keepScroll) {
    $$('.drawer').forEach((d) => { d.classList.remove('is-open'); d.setAttribute('aria-hidden', 'true'); });
    backdrop.hidden = true;
    if (!keepScroll && !$$('.modal:not([hidden])').length) document.body.classList.remove('no-scroll');
  }
  $('#cart-btn').addEventListener('click', () => openDrawer('cart'));
  $('#wishlist-btn').addEventListener('click', () => openDrawer('wishlist'));
  $('#cart-close').addEventListener('click', () => closeDrawers());
  $('#wishlist-close').addEventListener('click', () => closeDrawers());
  backdrop.addEventListener('click', () => closeDrawers());

  function renderCart() {
    const body = $('#cart-items');
    const n = cartCount();
    $('#cart-drawer-count').textContent = n ? `(${n})` : '';
    if (!cart.length) {
      body.innerHTML = `<div class="cart-empty"><span class="big">🕰️</span><p>Votre panier est vide.<br>Il est temps d'y remédier.</p><button type="button" class="btn btn-primary" id="cart-go-shop">Voir la collection</button></div>`;
      $('#cart-foot').hidden = true;
      $('#cart-go-shop').addEventListener('click', () => { closeDrawers(); $('#collection').scrollIntoView({ behavior: 'smooth' }); });
      return;
    }
    $('#cart-foot').hidden = false;
    body.innerHTML = cart.map((i, idx) => {
      const p = byId(i.id), v = p.variantes[i.variante];
      return `<div class="cart-item" data-idx="${idx}">
        <div class="thumb">${watchSVG(p.look, v, { label: p.nom })}</div>
        <div>
          <h4>${escapeHtml(p.nom)}</h4>
          <small>Bracelet ${escapeHtml(v.nom)} · ${euro(p.prix)}</small>
          <div class="qty"><button type="button" data-qty="-1" aria-label="Diminuer">−</button><input type="number" value="${i.qty}" min="1" max="5" aria-label="Quantité"><button type="button" data-qty="1" aria-label="Augmenter">+</button></div>
        </div>
        <div>
          <div class="line-price">${euro(p.prix * i.qty)}</div>
          <button type="button" class="remove" data-remove>Retirer</button>
        </div>
      </div>`;
    }).join('');

    const sub = cartSubtotal();
    const disc = cartDiscount(sub);
    const ship = shippingCost('colissimo', sub - disc);
    $('#cart-subtotal').textContent = euro(sub);
    $('#cart-discount-row').hidden = !disc;
    $('#cart-discount').textContent = `− ${euro(disc)}`;
    $('#cart-shipping').textContent = ship ? euro(ship) : 'Offerte';
    $('#cart-total').textContent = euro(sub - disc + ship);
    const hint = $('#free-shipping-hint');
    const reste = FREE_SHIPPING_FROM - (sub - disc);
    hint.innerHTML = reste > 0
      ? `Plus que <strong>${euro(reste)}</strong> pour la livraison offerte.<span class="bar"><i style="width:${Math.min(100, ((sub - disc) / FREE_SHIPPING_FROM) * 100)}%"></i></span>`
      : `🎉 Livraison Colissimo offerte !`;
    $('#promo-msg').textContent = promo ? `Code ${promo.code} appliqué : ${PROMOS[promo.code].label}${PROMOS[promo.code].min && sub < PROMOS[promo.code].min ? ` (valable dès ${euro(PROMOS[promo.code].min)})` : ''}` : '';
    $('#promo-msg').classList.remove('error');
    $('#promo-input').value = promo ? promo.code : '';
  }
  $('#cart-items').addEventListener('click', (e) => {
    const item = e.target.closest('.cart-item');
    if (!item) return;
    const idx = Number(item.dataset.idx);
    if (e.target.closest('[data-remove]')) {
      const p = byId(cart[idx].id);
      cart.splice(idx, 1); saveCart(); toast(`${escapeHtml(p.nom)} retirée du panier`, 'info', '🗑️'); return;
    }
    const q = e.target.closest('[data-qty]');
    if (q) { cart[idx].qty = Math.min(5, Math.max(1, cart[idx].qty + Number(q.dataset.qty))); saveCart(); }
  });
  $('#cart-items').addEventListener('change', (e) => {
    if (e.target.type !== 'number') return;
    const idx = Number(e.target.closest('.cart-item').dataset.idx);
    cart[idx].qty = Math.min(5, Math.max(1, Number(e.target.value) || 1));
    saveCart();
  });
  $('#promo-apply').addEventListener('click', applyPromo);
  $('#promo-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') applyPromo(); });
  function applyPromo() {
    const code = $('#promo-input').value.trim().toUpperCase();
    const msg = $('#promo-msg');
    if (!code) { promo = null; saveCart(); return; }
    if (!PROMOS[code]) { msg.textContent = 'Ce code ne nous dit rien… même pas « ROUX10 » ?'; msg.classList.add('error'); return; }
    promo = { code };
    saveCart();
    toast(`Code <strong>${code}</strong> appliqué`, 'success', '🎟️');
  }

  function renderWishlist() {
    const body = $('#wishlist-items');
    if (!wishlist.length) { body.innerHTML = `<div class="cart-empty"><span class="big">💛</span><p>Aucun favori pour l'instant.<br>Cliquez sur le cœur d'une montre pour la garder sous le coude.</p></div>`; return; }
    body.innerHTML = wishlist.map((id) => {
      const p = byId(id);
      return `<div class="wish-item">
        <div class="thumb">${watchSVG(p.look, p.variantes[0], { label: p.nom })}</div>
        <div><h4>${escapeHtml(p.nom)}</h4><small>${euro(p.prix)}</small></div>
        <div style="display:flex;flex-direction:column;gap:.4rem">
          <button type="button" class="btn btn-primary" data-wish-add="${id}">Ajouter</button>
          <button type="button" class="btn btn-ghost" data-wish-remove="${id}">Retirer</button>
        </div>
      </div>`;
    }).join('');
  }
  $('#wishlist-items').addEventListener('click', (e) => {
    const add = e.target.closest('[data-wish-add]');
    if (add) { addToCart(add.dataset.wishAdd); return; }
    const rm = e.target.closest('[data-wish-remove]');
    if (rm) toggleWish(rm.dataset.wishRemove);
  });

  /* ---------- Commande ---------- */
  const checkout = { el: $('#checkout-modal'), step: 1, form: $('#checkout-form') };
  $('#checkout-btn').addEventListener('click', () => {
    if (!cart.length) return;
    closeDrawers(true);
    checkout.step = 1;
    checkout.form.hidden = false;
    $('#order-success').hidden = true;
    $('#checkout-steps').hidden = false;
    $('#checkout-error').textContent = '';
    showStep();
    openModal(checkout.el);
  });
  function showStep() {
    $$('.step', checkout.form).forEach((f) => { f.hidden = Number(f.dataset.step) !== checkout.step; });
    $$('#checkout-steps li').forEach((li) => {
      const n = Number(li.dataset.step);
      li.classList.toggle('is-active', n === checkout.step);
      li.classList.toggle('is-done', n < checkout.step);
    });
    $('#checkout-prev').hidden = checkout.step === 1;
    $('#checkout-next').textContent = checkout.step === 3 ? 'Payer et commander' : 'Continuer';
    $('#checkout-error').textContent = '';
    updateCheckoutTotal();
  }
  function selectedShipping() { return checkout.form.livraison.value; }
  function updateCheckoutTotal() {
    const sub = cartSubtotal(), disc = cartDiscount(sub), ship = shippingCost(selectedShipping(), sub - disc);
    $('#checkout-total').textContent = euro(sub - disc + ship);
    $$('[data-ship-price]').forEach((b) => {
      const c = shippingCost(b.dataset.shipPrice, sub - disc);
      b.textContent = c ? euro(c) : 'Offert';
    });
  }
  $('#shipping-options').addEventListener('change', updateCheckoutTotal);
  $('#checkout-prev').addEventListener('click', () => { checkout.step = Math.max(1, checkout.step - 1); showStep(); });

  const validators = {
    email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) || 'Adresse e-mail invalide.',
    tel: (v) => /^(\+33|0)[1-9](?:[\s.-]?\d{2}){4}$/.test(v) || 'Numéro de téléphone invalide (ex. 06 12 34 56 78).',
    cp: (v) => /^\d{5}$/.test(v) || 'Le code postal doit contenir 5 chiffres.',
    carte: (v) => luhn(v.replace(/\s/g, '')) || 'Numéro de carte invalide.',
    exp: (v) => {
      const m = v.match(/^(\d{2})\/(\d{2})$/);
      if (!m) return 'Format attendu : MM/AA.';
      const mm = Number(m[1]), yy = 2000 + Number(m[2]);
      if (mm < 1 || mm > 12) return 'Mois invalide.';
      const now = new Date();
      if (yy < now.getFullYear() || (yy === now.getFullYear() && mm < now.getMonth() + 1)) return 'Cette carte est expirée.';
      return true;
    },
    cvc: (v) => /^\d{3,4}$/.test(v) || 'CVC invalide.'
  };
  function luhn(num) {
    if (!/^\d{13,19}$/.test(num)) return false;
    let sum = 0, dbl = false;
    for (let i = num.length - 1; i >= 0; i--) {
      let d = Number(num[i]);
      if (dbl) { d *= 2; if (d > 9) d -= 9; }
      sum += d; dbl = !dbl;
    }
    return sum % 10 === 0;
  }
  function validateFields(container, errorEl) {
    let firstError = null;
    $$('input, textarea', container).forEach((input) => {
      input.classList.remove('is-invalid');
      if (input.type === 'radio' || input.type === 'checkbox') return;
      const v = input.value.trim();
      let err = null;
      if (input.required && !v) err = 'Merci de remplir tous les champs.';
      else if (v && input.minLength > 0 && v.length < input.minLength) err = `Ce champ doit contenir au moins ${input.minLength} caractères.`;
      else if (v && validators[input.name]) { const r = validators[input.name](v); if (r !== true) err = r; }
      if (err) { input.classList.add('is-invalid'); if (!firstError) { firstError = err; input.focus({ preventScroll: true }); } }
    });
    errorEl.textContent = firstError || '';
    return !firstError;
  }

  // Mise en forme en direct de la carte de paiement
  checkout.form.carte.addEventListener('input', (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 16);
    e.target.value = digits.replace(/(\d{4})(?=\d)/g, '$1 ');
    $('#fake-card-number').textContent = (digits.padEnd(16, '•')).replace(/(.{4})(?=.)/g, '$1 ');
  });
  checkout.form.exp.addEventListener('input', (e) => {
    const d = e.target.value.replace(/\D/g, '').slice(0, 4);
    e.target.value = d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
    $('#fake-card-exp').textContent = e.target.value || 'MM/AA';
  });
  checkout.form.titulaire.addEventListener('input', (e) => { $('#fake-card-name').textContent = e.target.value.toUpperCase() || 'NOM DU TITULAIRE'; });
  checkout.form.cp.addEventListener('input', (e) => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 5); });

  checkout.form.addEventListener('submit', (e) => {
    e.preventDefault();
    const current = $(`.step[data-step="${checkout.step}"]`, checkout.form);
    if (!validateFields(current, $('#checkout-error'))) return;
    if (checkout.step < 3) { checkout.step++; showStep(); return; }
    placeOrder();
  });

  function placeOrder() {
    const btn = $('#checkout-next');
    btn.disabled = true; btn.textContent = 'Paiement en cours…';
    setTimeout(() => {
      const f = checkout.form;
      const sub = cartSubtotal(), disc = cartDiscount(sub), mode = selectedShipping(), ship = shippingCost(mode, sub - disc);
      const num = `LRT-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
      const order = {
        numero: num, date: new Date().toISOString(), client: { prenom: f.prenom.value, nom: f.nom.value, email: f.email.value },
        lignes: cart.map((i) => ({ id: i.id, nom: byId(i.id).nom, variante: byId(i.id).variantes[i.variante].nom, qty: i.qty, prix: byId(i.id).prix })),
        sousTotal: sub, remise: disc, livraison: { mode, cout: ship }, total: sub - disc + ship
      };
      const orders = store.get('lrt_orders', []); orders.push(order); store.set('lrt_orders', orders);

      const modes = { colissimo: 'Colissimo suivi', chronopost: 'Chronopost', retrait: 'Retrait en boutique' };
      $('#order-number').textContent = num;
      $('#order-recap').innerHTML = order.lignes.map((l) => `<div><span>${l.qty} × ${escapeHtml(l.nom)} <em>(${escapeHtml(l.variante)})</em></span><span>${euro(l.prix * l.qty)}</span></div>`).join('')
        + (disc ? `<div><span>Remise</span><span>− ${euro(disc)}</span></div>` : '')
        + `<div><span>${modes[mode]}</span><span>${ship ? euro(ship) : 'Offert'}</span></div>`
        + `<div class="total"><span>Total réglé</span><span>${euro(order.total)}</span></div>`;

      cart = []; promo = null; saveCart();
      f.reset(); $('#fake-card-number').textContent = '•••• •••• •••• ••••'; $('#fake-card-name').textContent = 'NOM DU TITULAIRE'; $('#fake-card-exp').textContent = 'MM/AA';
      f.hidden = true; $('#checkout-steps').hidden = true; $('#order-success').hidden = false;
      btn.disabled = false; btn.textContent = 'Continuer';
      confetti();
      toast(`Commande ${num} confirmée. Merci !`, 'success', '🎉');
    }, 1400);
  }

  function confetti() {
    const colors = ['#ff7a1f', '#ffc542', '#0fbfae', '#ff3d81', '#ffffff'];
    for (let i = 0; i < 70; i++) {
      const c = document.createElement('span');
      const size = 6 + Math.random() * 8;
      Object.assign(c.style, {
        position: 'fixed', zIndex: 600, left: `${50 + (Math.random() - .5) * 20}%`, top: '45%', width: `${size}px`, height: `${size * .6}px`,
        background: colors[i % colors.length], borderRadius: '2px', pointerEvents: 'none', transform: `rotate(${Math.random() * 360}deg)`,
        transition: 'transform 1.4s cubic-bezier(.2,.8,.3,1), opacity 1.4s', opacity: 1
      });
      document.body.appendChild(c);
      requestAnimationFrame(() => {
        c.style.transform = `translate(${(Math.random() - .5) * 600}px, ${300 + Math.random() * 400}px) rotate(${Math.random() * 720}deg)`;
        c.style.opacity = 0;
      });
      setTimeout(() => c.remove(), 1500);
    }
  }

  /* ---------- Estimateur de devis ---------- */
  const BASE = { revision: 120, pile: 15, bracelet: 45, gravure: 30 };
  const COEF = { quartz: 1, automatique: 1.5, chronographe: 1.9, vintage: 1.7 };
  const DELAIS = { revision: '10 à 15 jours', pile: 'immédiat, montre en main', bracelet: '3 à 5 jours', gravure: '48 h' };
  function estimate() {
    const s = $('#est-service').value, t = $('#est-type').value;
    let prix = BASE[s] * (s === 'revision' ? COEF[t] : s === 'pile' && t !== 'quartz' ? 0 : 1);
    if (s === 'pile' && t !== 'quartz') prix = 0;
    if ($('#est-urgent').checked) prix *= 1.4;
    if ($('#est-client').checked) prix *= 0.8;
    const el = $('#est-price');
    el.textContent = prix ? euro(Math.round(prix)) : 'Sans objet';
    el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
    $('#est-delay').textContent = s === 'pile' && t !== 'quartz' ? 'Une montre mécanique n\'a pas de pile : choisissez plutôt une révision.' : `Délai indicatif : ${$('#est-urgent').checked ? 'sous 48 h' : DELAIS[s]}`;
  }
  ['#est-service', '#est-type', '#est-urgent', '#est-client'].forEach((s) => $(s).addEventListener('change', estimate));
  $('#estimator').addEventListener('submit', (e) => {
    e.preventDefault();
    toast('Demande de rendez-vous envoyée. Roux vous rappelle sous 24 h.', 'success', '📅');
  });
  estimate();

  /* ---------- Carrousel des avis ---------- */
  const track = $('#carousel-track'), dots = $('#carousel-dots');
  let slide = 0, autoTimer;
  track.innerHTML = D.avis.map((a) => `<article class="avis-card"><span class="stars" aria-label="${a.note} étoiles sur 5">${stars(a.note)}</span><blockquote>« ${escapeHtml(a.texte)} »</blockquote><cite>${escapeHtml(a.nom)} <span>— ${escapeHtml(a.ville)}</span></cite></article>`).join('');
  dots.innerHTML = D.avis.map((_, i) => `<button type="button" role="tab" aria-label="Avis ${i + 1}" ${i === 0 ? 'class="is-active"' : ''}></button>`).join('');
  function goTo(i) {
    slide = (i + D.avis.length) % D.avis.length;
    track.style.transform = `translateX(-${slide * 100}%)`;
    $$('button', dots).forEach((b, k) => b.classList.toggle('is-active', k === slide));
  }
  function autoplay() { clearInterval(autoTimer); autoTimer = setInterval(() => goTo(slide + 1), 6000); }
  $('#carousel-prev').addEventListener('click', () => { goTo(slide - 1); autoplay(); });
  $('#carousel-next').addEventListener('click', () => { goTo(slide + 1); autoplay(); });
  dots.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { goTo($$('button', dots).indexOf(b)); autoplay(); } });
  let touchX = null;
  track.addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; }, { passive: true });
  track.addEventListener('touchend', (e) => { if (touchX === null) return; const dx = e.changedTouches[0].clientX - touchX; if (Math.abs(dx) > 40) { goTo(slide + (dx < 0 ? 1 : -1)); autoplay(); } touchX = null; });
  autoplay();

  /* ---------- Formulaires : newsletter & contact ---------- */
  $('#newsletter').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = $('#newsletter-email'), err = $('#newsletter-error');
    const r = validators.email(input.value.trim());
    input.classList.toggle('is-invalid', r !== true);
    err.textContent = r === true ? '' : r;
    if (r !== true) return;
    const subs = store.get('lrt_newsletter', []); if (!subs.includes(input.value.trim())) subs.push(input.value.trim()); store.set('lrt_newsletter', subs);
    input.value = '';
    toast('Bienvenue dans la gazette rousse !', 'success', '📬');
  });
  $('#contact-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.currentTarget;
    if (!validateFields(f, $('#contact-error'))) return;
    const msgs = store.get('lrt_messages', []); msgs.push({ date: new Date().toISOString(), prenom: f.prenom.value, nom: f.nom.value, email: f.email.value, sujet: f.sujet.value, message: f.message.value }); store.set('lrt_messages', msgs);
    f.reset();
    toast(`Message envoyé. Merci ${escapeHtml(msgs.at(-1).prenom)}, on vous répond vite !`, 'success', '✉️');
  });
  $$('input[required], textarea[required]').forEach((i) => i.addEventListener('input', () => i.classList.remove('is-invalid')));

  /* ---------- Pages légales ---------- */
  $$('[data-legal]').forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault();
    const l = D.legal[a.dataset.legal];
    $('#legal-title').textContent = l.titre;
    $('#legal-body').innerHTML = l.html;
    openModal($('#legal-modal'));
  }));

  /* ---------- Démarrage ---------- */
  renderProducts();
  renderCartBadge();
  renderWishBadge();
  renderCart();
})();
