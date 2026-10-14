/* =====================================================================
   Fonctions communes à toutes les pages — La Roux du Temps
   Panier (localStorage), formatage des prix, notifications, entête,
   curseur personnalisé, tiroir du panier.
   ===================================================================== */
(function () {
  "use strict";

  const CLE_PANIER = "laroux_panier_v1";
  const $ = (sel, racine) => (racine || document).querySelector(sel);
  const $$ = (sel, racine) => Array.from((racine || document).querySelectorAll(sel));

  /* ------------------------------------------------------------ utilitaires */
  const formateurPrix = new Intl.NumberFormat("fr-FR", { style: "currency", currency: (window.CONFIG && CONFIG.devise) || "EUR", minimumFractionDigits: 0, maximumFractionDigits: 2 });
  function formaterPrix(centimes) {
    const euros = centimes / 100;
    return formateurPrix.format(euros).replace(/,00/, "");
  }
  function echapper(texte) {
    return String(texte).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function trouverMontre(id) { return (window.MONTRES || []).find(m => m.id === id); }
  function trouverVariante(montre, idVariante) {
    if (!montre || !montre.variantes || !montre.variantes.length) return null;
    return montre.variantes.find(v => v.id === idVariante) || montre.variantes[0];
  }
  function prixUnitaire(montre, variante) { return montre.prix + ((variante && variante.supplement) || 0); }
  function visuelPour(montre, variante) {
    if (montre.images && montre.images.length) return null;
    const v = Object.assign({}, montre.visuel);
    if (variante) {
      if (variante.couleurBracelet) v.couleurBracelet = variante.couleurBracelet;
      if (variante.bracelet) v.bracelet = variante.bracelet;
    }
    return v;
  }
  function rendreVisuel(montre, variante, options) {
    if (montre.images && montre.images.length) {
      return `<img src="${echapper(montre.images[0])}" alt="${echapper(montre.nom + ' — ' + montre.sousTitre)}" loading="lazy">`;
    }
    return genererMontreSVG(visuelPour(montre, variante), Object.assign({ libelle: montre.nom + " — " + montre.sousTitre }, options || {}));
  }

  /* ----------------------------------------------------------------- panier */
  function lirePanier() {
    try { return JSON.parse(localStorage.getItem(CLE_PANIER)) || []; } catch (e) { return []; }
  }
  function ecrirePanier(panier) {
    localStorage.setItem(CLE_PANIER, JSON.stringify(panier));
    document.dispatchEvent(new CustomEvent("panier:modifie", { detail: panier }));
  }
  function ajouterAuPanier(idMontre, idVariante, quantite) {
    const montre = trouverMontre(idMontre);
    if (!montre) return;
    const variante = trouverVariante(montre, idVariante);
    const panier = lirePanier();
    const cle = montre.id + "::" + (variante ? variante.id : "");
    const existant = panier.find(a => a.cle === cle);
    const qte = Math.max(1, quantite || 1);
    if (existant) existant.quantite = Math.min(montre.stock, existant.quantite + qte);
    else panier.push({ cle, id: montre.id, variante: variante ? variante.id : null, quantite: Math.min(montre.stock, qte) });
    ecrirePanier(panier);
    notifier(`${montre.nom} ajoutée au panier`);
  }
  function modifierQuantite(cle, delta) {
    const panier = lirePanier();
    const article = panier.find(a => a.cle === cle);
    if (!article) return;
    const montre = trouverMontre(article.id);
    article.quantite = Math.min(montre ? montre.stock : 99, article.quantite + delta);
    if (article.quantite <= 0) panier.splice(panier.indexOf(article), 1);
    ecrirePanier(panier);
  }
  function retirerDuPanier(cle) {
    ecrirePanier(lirePanier().filter(a => a.cle !== cle));
  }
  function viderPanier() { ecrirePanier([]); }
  function detailsPanier() {
    const lignes = [];
    lirePanier().forEach(a => {
      const montre = trouverMontre(a.id);
      if (!montre) return;
      const variante = trouverVariante(montre, a.variante);
      const unitaire = prixUnitaire(montre, variante);
      lignes.push({ cle: a.cle, montre, variante, quantite: a.quantite, unitaire, total: unitaire * a.quantite });
    });
    const sousTotal = lignes.reduce((s, l) => s + l.total, 0);
    const nombre = lignes.reduce((s, l) => s + l.quantite, 0);
    return { lignes, sousTotal, nombre };
  }

  /* ----------------------------------------------------------- notifications */
  function notifier(message) {
    const zone = $("#toasts");
    if (!zone) return;
    const t = document.createElement("div");
    t.className = "toast";
    t.innerHTML = `<svg viewBox="0 0 24 24"><path d="M5 12l5 5L20 7"/></svg><span>${echapper(message)}</span>`;
    zone.appendChild(t);
    setTimeout(() => { t.classList.add("sortie"); setTimeout(() => t.remove(), 400); }, 2600);
  }

  /* ------------------------------------------------------------------ entête */
  function initEntete() {
    const entete = $("#entete");
    if (!entete) return;
    const majEntete = () => entete.classList.toggle("reduite", window.scrollY > 40);
    majEntete();
    window.addEventListener("scroll", majEntete, { passive: true });

    const burger = $("#burger"), navMobile = $("#nav-mobile");
    if (burger && navMobile) {
      const basculer = (ouvrir) => {
        const etat = ouvrir != null ? ouvrir : !navMobile.classList.contains("ouvert");
        navMobile.classList.toggle("ouvert", etat);
        burger.classList.toggle("ouvert", etat);
        burger.setAttribute("aria-expanded", String(etat));
        document.body.classList.toggle("sans-defilement", etat);
      };
      burger.addEventListener("click", () => basculer());
      $$("a", navMobile).forEach(a => a.addEventListener("click", () => basculer(false)));
    }

    const sections = $$("main section[id]");
    const liens = $$(".nav a");
    if (sections.length && liens.length && "IntersectionObserver" in window) {
      const obs = new IntersectionObserver(entries => {
        entries.forEach(e => {
          if (e.isIntersecting) liens.forEach(l => l.classList.toggle("active", l.getAttribute("href") === "#" + e.target.id));
        });
      }, { rootMargin: "-40% 0px -55% 0px" });
      sections.forEach(s => obs.observe(s));
    }
  }

  /* ----------------------------------------------------------------- curseur */
  function initCurseur() {
    const point = $(".curseur"), halo = $(".curseur-halo");
    if (!point || !halo || window.matchMedia("(hover: none)").matches) return;
    let x = window.innerWidth / 2, y = window.innerHeight / 2, hx = x, hy = y;
    window.addEventListener("mousemove", e => { x = e.clientX; y = e.clientY; point.style.transform = `translate(${x - 3}px, ${y - 3}px)`; }, { passive: true });
    (function suivre() { hx += (x - hx) * 0.16; hy += (y - hy) * 0.16; halo.style.transform = `translate(${hx - halo.offsetWidth / 2}px, ${hy - halo.offsetHeight / 2}px)`; requestAnimationFrame(suivre); })();
    point.style.transform = "translate(-100px,-100px)";
    document.addEventListener("mouseover", e => { if (e.target.closest("a, button, .produit-visuel, input, select, textarea, label")) document.body.classList.add("curseur-actif"); });
    document.addEventListener("mouseout", e => { if (e.target.closest("a, button, .produit-visuel, input, select, textarea, label")) document.body.classList.remove("curseur-actif"); });
  }

  /* -------------------------------------------------------- tiroir du panier */
  function initTiroirPanier() {
    const panier = $("#panier");
    if (!panier) return;
    const ouvrir = () => { panier.classList.add("ouvert"); panier.setAttribute("aria-hidden", "false"); document.body.classList.add("sans-defilement"); };
    const fermer = () => { panier.classList.remove("ouvert"); panier.setAttribute("aria-hidden", "true"); document.body.classList.remove("sans-defilement"); };
    $("#ouvrir-panier") && $("#ouvrir-panier").addEventListener("click", ouvrir);
    $$("[data-fermer-panier]").forEach(el => el.addEventListener("click", fermer));
    document.addEventListener("keydown", e => { if (e.key === "Escape" && panier.classList.contains("ouvert")) fermer(); });
    document.addEventListener("panier:ouvrir", ouvrir);

    const liste = $("#panier-liste");
    liste.addEventListener("click", e => {
      const btnQ = e.target.closest("[data-quantite]");
      const btnS = e.target.closest("[data-supprimer]");
      if (btnQ) modifierQuantite(btnQ.closest("[data-cle]").dataset.cle, Number(btnQ.dataset.quantite));
      if (btnS) retirerDuPanier(btnS.closest("[data-cle]").dataset.cle);
    });
    rendrePanier();
    document.addEventListener("panier:modifie", rendrePanier);
  }

  function rendrePanier() {
    const { lignes, sousTotal, nombre } = detailsPanier();
    const compteur = $("#panier-compteur");
    if (compteur) { compteur.textContent = nombre; compteur.classList.toggle("visible", nombre > 0); }
    const liste = $("#panier-liste");
    if (!liste) return;
    $("#panier-nombre").textContent = nombre + (nombre > 1 ? " articles" : " article");
    if (!lignes.length) {
      liste.innerHTML = `<div class="panier-vide"><div class="guillemet">◆</div><p>Votre panier est vide.</p><span>Le temps presse… un peu.</span></div>`;
    } else {
      liste.innerHTML = lignes.map(l => `
        <div class="article" data-cle="${echapper(l.cle)}">
          <div class="article-visuel">${rendreVisuel(l.montre, l.variante)}</div>
          <div>
            <h4>${echapper(l.montre.nom)}</h4>
            <div class="variante-nom">${echapper(l.montre.sousTitre)}${l.variante ? " · " + echapper(l.variante.nom) : ""}</div>
            <div class="quantite"><button data-quantite="-1" aria-label="Diminuer">−</button><span>${l.quantite}</span><button data-quantite="1" aria-label="Augmenter">+</button></div>
          </div>
          <div class="article-droite">
            <span class="prix">${formaterPrix(l.total)}</span>
            <button class="supprimer" data-supprimer>Retirer</button>
          </div>
        </div>`).join("");
    }
    $("#panier-sous-total").textContent = formaterPrix(sousTotal);
    $("#panier-total").textContent = formaterPrix(sousTotal);
    const commander = $("#panier-commander");
    if (commander) { commander.style.pointerEvents = lignes.length ? "" : "none"; commander.style.opacity = lignes.length ? "" : "0.4"; }
  }

  /* -------------------------------------------------------------- révélation */
  let observateurRevelation = null;
  function revelerNouveaux() {
    const elements = $$(".reveler:not([data-observe])");
    if (!elements.length) return;
    if (!("IntersectionObserver" in window)) { elements.forEach(e => e.classList.add("visible")); return; }
    if (!observateurRevelation) {
      observateurRevelation = new IntersectionObserver(entries => {
        entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("visible"); observateurRevelation.unobserve(e.target); } });
      }, { threshold: 0.12 });
    }
    elements.forEach(e => { e.setAttribute("data-observe", "1"); observateurRevelation.observe(e); });
  }
  function initRevelation() { revelerNouveaux(); }

  document.addEventListener("DOMContentLoaded", () => {
    initEntete();
    initCurseur();
    initTiroirPanier();
    initRevelation();
    const annee = $("#annee"); if (annee) annee.textContent = new Date().getFullYear();
  });

  window.LaRoux = { $, $$, formaterPrix, echapper, trouverMontre, trouverVariante, prixUnitaire, rendreVisuel, lirePanier, ecrirePanier, ajouterAuPanier, modifierQuantite, retirerDuPanier, viderPanier, detailsPanier, notifier, rendrePanier, revelerNouveaux };
})();
