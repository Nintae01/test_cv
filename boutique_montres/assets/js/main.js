/* =====================================================================
   Page d'accueil — La Roux du Temps
   Hero animé, collections, catalogue filtrable, fiche produit, FAQ,
   témoignages, compteurs, formulaires.
   ===================================================================== */
(function () {
  "use strict";
  const { $, $$, formaterPrix, echapper, trouverMontre, trouverVariante, prixUnitaire, rendreVisuel, ajouterAuPanier, notifier } = window.LaRoux;
  const MONTRES = window.MONTRES || [];
  const COLLECTIONS = window.COLLECTIONS || {};
  const reduireMouvement = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* -------------------------------------------------------------------- hero */
  function initHero() {
    const conteneur = $("#hero-montre");
    if (!conteneur) return;
    const montre = trouverMontre(conteneur.dataset.produit) || MONTRES[0];
    conteneur.innerHTML = rendreVisuel(montre, null, { anime: true });
    const zone = $("#hero-visuel");
    if (zone && !reduireMouvement && window.matchMedia("(hover: hover)").matches) {
      zone.addEventListener("mousemove", e => {
        const r = zone.getBoundingClientRect();
        const dx = (e.clientX - r.left) / r.width - 0.5, dy = (e.clientY - r.top) / r.height - 0.5;
        conteneur.style.transform = `perspective(1200px) rotateY(${dx * 14}deg) rotateX(${-dy * 14}deg) translateY(${-dy * 10}px)`;
      });
      zone.addEventListener("mouseleave", () => { conteneur.style.transform = ""; });
    }
    const piste = $("#bandeau-piste");
    if (piste) piste.innerHTML += piste.innerHTML;
  }

  /* ------------------------------------------------------------- collections */
  function initCollections() {
    const grille = $("#collections-grille");
    if (!grille) return;
    const ordre = ["heritage", "abysse", "chronographe"];
    grille.innerHTML = ordre.map((cle, i) => {
      const c = COLLECTIONS[cle];
      const vedette = MONTRES.find(m => m.collection === cle);
      return `<article class="collection reveler" data-delai="${i}">
        <div class="visuel">${vedette ? rendreVisuel(vedette) : ""}</div>
        <div class="voile"></div>
        <span class="numero">N° 0${i + 1}</span>
        <h3>${echapper(c.nom)}</h3>
        <p>${echapper(c.accroche)}</p>
        <a href="#catalogue" class="btn-texte" data-filtre="${cle}">Voir la collection <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M4 12h16M14 6l6 6-6 6"/></svg></a>
      </article>`;
    }).join("");
  }

  /* --------------------------------------------------------------- catalogue */
  const etat = { collection: "toutes", recherche: "", tri: "defaut" };
  function normaliser(t) { return t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }

  function montresFiltrees() {
    let liste = MONTRES.slice();
    if (etat.collection !== "toutes") liste = liste.filter(m => m.collection === etat.collection);
    if (etat.recherche) {
      const q = normaliser(etat.recherche);
      liste = liste.filter(m => normaliser([m.nom, m.sousTitre, m.description, COLLECTIONS[m.collection].nom, m.reference].join(" ")).includes(q));
    }
    if (etat.tri === "prix-asc") liste.sort((a, b) => a.prix - b.prix);
    if (etat.tri === "prix-desc") liste.sort((a, b) => b.prix - a.prix);
    if (etat.tri === "nouveautes") liste.sort((a, b) => Number(b.nouveaute) - Number(a.nouveaute));
    return liste;
  }

  function rendreCatalogue() {
    const grille = $("#grille-produits");
    if (!grille) return;
    const liste = montresFiltrees();
    if (!liste.length) {
      grille.innerHTML = `<div class="grille-vide">Aucune montre ne correspond à votre recherche.</div>`;
      return;
    }
    grille.innerHTML = liste.map((m, i) => `
      <article class="produit" data-id="${m.id}" style="animation-delay:${Math.min(i, 8) * 70}ms">
        ${m.nouveaute ? `<span class="badge">Nouveauté</span>` : (m.stock <= 3 ? `<span class="badge rare">Dernières pièces</span>` : "")}
        <div class="produit-visuel" data-ouvrir="${m.id}" role="button" tabindex="0" aria-label="Voir ${echapper(m.nom)}">
          ${rendreVisuel(m)}
          <span class="apercu btn-texte">Découvrir</span>
        </div>
        <div class="produit-info">
          <div>
            <div class="produit-collection">${echapper(COLLECTIONS[m.collection].nom)} · ${echapper(m.reference)}</div>
            <h3>${echapper(m.nom)}</h3>
            <p class="sous-titre">${echapper(m.sousTitre)}</p>
          </div>
          <span class="prix">${formaterPrix(m.prix)}</span>
        </div>
        <div class="produit-actions">
          <button class="btn-texte" data-ouvrir="${m.id}">Détails</button>
          <button class="btn-ajouter" data-ajouter="${m.id}"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg> Ajouter</button>
        </div>
      </article>`).join("");
  }

  function initCatalogue() {
    const grille = $("#grille-produits");
    if (!grille) return;
    rendreCatalogue();

    $$("#filtres-collections .puce").forEach(p => p.addEventListener("click", () => {
      $$("#filtres-collections .puce").forEach(x => x.classList.remove("active"));
      p.classList.add("active");
      etat.collection = p.dataset.collection;
      rendreCatalogue();
    }));
    document.addEventListener("click", e => {
      const lien = e.target.closest("[data-filtre]");
      if (!lien) return;
      const puce = $(`#filtres-collections .puce[data-collection="${lien.dataset.filtre}"]`);
      if (puce) puce.click();
    });
    const recherche = $("#recherche");
    let minuterie;
    recherche.addEventListener("input", () => { clearTimeout(minuterie); minuterie = setTimeout(() => { etat.recherche = recherche.value.trim(); rendreCatalogue(); }, 180); });
    $("#tri").addEventListener("change", e => { etat.tri = e.target.value; rendreCatalogue(); });
    const lienRecherche = $("[data-focus-recherche]");
    if (lienRecherche) lienRecherche.addEventListener("click", () => setTimeout(() => recherche.focus(), 600));

    grille.addEventListener("click", e => {
      const ouvrir = e.target.closest("[data-ouvrir]");
      const ajouter = e.target.closest("[data-ajouter]");
      if (ouvrir) ouvrirModale(ouvrir.dataset.ouvrir);
      if (ajouter) { ajouterAuPanier(ajouter.dataset.ajouter, null, 1); }
    });
    grille.addEventListener("keydown", e => {
      const cible = e.target.closest(".produit-visuel[data-ouvrir]");
      if (cible && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); ouvrirModale(cible.dataset.ouvrir); }
    });
  }

  /* ------------------------------------------------------------ fiche produit */
  const modale = { element: null, montre: null, variante: null, quantite: 1, declencheur: null };

  function rendreModale() {
    const m = modale.montre, v = modale.variante;
    $("#modale-visuel").innerHTML = rendreVisuel(m, v);
    $("#modale-collection").textContent = COLLECTIONS[m.collection].nom + " · " + m.reference;
    $("#modale-titre").textContent = m.nom;
    $("#modale-sous-titre").textContent = m.sousTitre;
    $("#modale-description").textContent = m.description;
    $("#modale-variante-nom").textContent = v ? v.nom : "";
    $("#modale-variantes").innerHTML = (m.variantes || []).map(x => `
      <button class="variante ${v && x.id === v.id ? "active" : ""}" data-variante="${x.id}">
        <i style="background:${x.couleurBracelet || "#444"}"></i>${echapper(x.nom)}
        ${x.supplement ? `<small>${x.supplement > 0 ? "+" : "−"}&nbsp;${formaterPrix(Math.abs(x.supplement))}</small>` : ""}
      </button>`).join("");
    $("#modale-carac").innerHTML = Object.entries(m.caracteristiques || {}).map(([k, val]) => `<li><span>${echapper(k)}</span><span>${echapper(val)}</span></li>`).join("");
    $("#modale-prix").innerHTML = `<small>Prix, TVA incluse</small>${formaterPrix(prixUnitaire(m, v) * modale.quantite)}`;
    const stock = $("#modale-stock");
    stock.textContent = m.stock <= 3 ? `Plus que ${m.stock} pièce${m.stock > 1 ? "s" : ""} en boutique` : "Disponible, expédiée sous 48 h";
    stock.classList.toggle("faible", m.stock <= 3);
    $("#modale-quantite").textContent = modale.quantite;
  }

  function ouvrirModale(id) {
    const m = trouverMontre(id);
    if (!m || !modale.element) return;
    modale.montre = m; modale.variante = trouverVariante(m, null); modale.quantite = 1;
    modale.declencheur = document.activeElement;
    rendreModale();
    modale.element.classList.add("ouverte");
    modale.element.setAttribute("aria-hidden", "false");
    document.body.classList.add("sans-defilement");
    setTimeout(() => $(".modale-fermer", modale.element).focus(), 50);
  }
  function fermerModale() {
    if (!modale.element) return;
    modale.element.classList.remove("ouverte");
    modale.element.setAttribute("aria-hidden", "true");
    document.body.classList.remove("sans-defilement");
    if (modale.declencheur && modale.declencheur.focus) modale.declencheur.focus();
  }

  function initModale() {
    modale.element = $("#modale-produit");
    if (!modale.element) return;
    $$("[data-fermer-modale]", modale.element).forEach(el => el.addEventListener("click", fermerModale));
    document.addEventListener("keydown", e => { if (e.key === "Escape" && modale.element.classList.contains("ouverte")) fermerModale(); });
    $("#modale-variantes").addEventListener("click", e => {
      const b = e.target.closest("[data-variante]");
      if (!b) return;
      modale.variante = trouverVariante(modale.montre, b.dataset.variante);
      rendreModale();
    });
    $$(".modale-pied [data-quantite]").forEach(b => b.addEventListener("click", () => {
      modale.quantite = Math.min(modale.montre.stock, Math.max(1, modale.quantite + Number(b.dataset.quantite)));
      rendreModale();
    }));
    $("#modale-ajouter").addEventListener("click", () => {
      ajouterAuPanier(modale.montre.id, modale.variante ? modale.variante.id : null, modale.quantite);
      fermerModale();
      setTimeout(() => document.dispatchEvent(new CustomEvent("panier:ouvrir")), 350);
    });
  }

  /* -------------------------------------------------------------- savoir-faire */
  function initSavoirFaire() {
    const visuel = $("#savoir-visuel");
    if (visuel) {
      const m = trouverMontre(visuel.dataset.produit) || MONTRES[0];
      visuel.innerHTML = rendreVisuel(m, null, { anime: true });
    }
    const compteurCatalogue = $("[data-compteur-catalogue]");
    if (compteurCatalogue) compteurCatalogue.dataset.compteur = MONTRES.length;
    const compteurs = $$("[data-compteur]");
    if (!compteurs.length || !("IntersectionObserver" in window)) { compteurs.forEach(c => c.textContent = c.dataset.compteur); return; }
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        obs.unobserve(e.target);
        const cible = Number(e.target.dataset.compteur), debut = performance.now(), duree = reduireMouvement ? 0 : 1800;
        (function anim(t) {
          const p = duree ? Math.min(1, (t - debut) / duree) : 1;
          const ease = 1 - Math.pow(1 - p, 3);
          e.target.textContent = Math.round(cible * ease);
          if (p < 1) requestAnimationFrame(anim);
        })(debut);
      });
    }, { threshold: 0.5 });
    compteurs.forEach(c => obs.observe(c));
  }

  /* --------------------------------------------------------------- témoignages */
  function initTemoignages() {
    const piste = $("#temoignages"), nav = $("#temoignages-nav");
    if (!piste || !nav) return;
    const items = $$(".temoignage", piste);
    let index = 0, minuterie;
    nav.innerHTML = items.map((_, i) => `<button role="tab" aria-label="Témoignage ${i + 1}" class="${i === 0 ? "actif" : ""}"></button>`).join("");
    const boutons = $$("button", nav);
    const aller = (i) => {
      index = (i + items.length) % items.length;
      items.forEach((el, k) => el.classList.toggle("actif", k === index));
      boutons.forEach((b, k) => b.classList.toggle("actif", k === index));
    };
    const relancer = () => { clearInterval(minuterie); if (!reduireMouvement) minuterie = setInterval(() => aller(index + 1), 6500); };
    boutons.forEach((b, i) => b.addEventListener("click", () => { aller(i); relancer(); }));
    relancer();
  }

  /* ----------------------------------------------------------------------- faq */
  function initFaq() {
    $$(".faq-item").forEach(item => {
      const q = $(".faq-question", item), r = $(".faq-reponse", item);
      q.addEventListener("click", () => {
        const ouvert = item.classList.toggle("ouvert");
        q.setAttribute("aria-expanded", String(ouvert));
        r.style.maxHeight = ouvert ? r.scrollHeight + "px" : "0px";
      });
    });
  }

  /* ----------------------------------------------------------------- formulaires */
  function emailValide(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); }
  function initFormulaires() {
    const news = $("#formulaire-newsletter");
    if (news) news.addEventListener("submit", e => {
      e.preventDefault();
      const champ = $("#newsletter-email"), statut = $("#newsletter-statut");
      if (!emailValide(champ.value.trim())) { statut.textContent = "Merci d'indiquer une adresse e-mail valide."; statut.style.color = "var(--erreur)"; return; }
      statut.textContent = "Merci. Vous recevrez notre prochaine lettre."; statut.style.color = "var(--succes)";
      champ.value = "";
      notifier("Inscription confirmée");
    });

    const contact = $("#formulaire-contact");
    if (contact) contact.addEventListener("submit", e => {
      e.preventDefault();
      let ok = true;
      $$(".champ", contact).forEach(c => {
        const champ = $("input, textarea, select", c);
        if (!champ.required) return;
        const valide = champ.type === "email" ? emailValide(champ.value.trim()) : champ.value.trim().length > 0;
        c.classList.toggle("invalide", !valide);
        champ.classList.toggle("invalide", !valide);
        if (!valide) ok = false;
      });
      const statut = $("#contact-statut");
      if (!ok) { statut.textContent = "Certains champs demandent votre attention."; statut.style.color = "var(--erreur)"; return; }
      statut.style.color = "var(--succes)";
      statut.textContent = "Votre message a bien été envoyé. Nous vous répondons sous 24 heures ouvrées.";
      contact.reset();
      notifier("Message envoyé");
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    initHero();
    initCollections();
    initCatalogue();
    initModale();
    initSavoirFaire();
    initTemoignages();
    initFaq();
    initFormulaires();
    window.LaRoux.revelerNouveaux();
  });
})();
