/* =====================================================================
   Page de paiement — La Roux du Temps
   Récapitulatif, livraison, code promotionnel, validation du formulaire
   et déclenchement du paiement (mode démo ou Stripe Checkout).
   ===================================================================== */
(function () {
  "use strict";
  const { $, $$, formaterPrix, echapper, rendreVisuel, detailsPanier, viderPanier, notifier } = window.LaRoux;
  const CONFIG = window.CONFIG || {};
  const CLE_COMMANDE = "laroux_commande_en_cours";

  const etat = { livraison: "standard", moyen: "carte", promo: null };

  const TEXTES_PAIEMENT = {
    carte: "Vous serez redirigé vers notre page de paiement sécurisée (Stripe). Aucune donnée bancaire n'est stockée par La Roux du Temps.",
    wallet: "Apple Pay et Google Pay sont proposés automatiquement sur la page de paiement sécurisée si votre appareil les prend en charge.",
    virement: "Nos coordonnées bancaires vous seront communiquées par e-mail. La montre est réservée 5 jours ouvrés, puis expédiée dès réception du virement."
  };

  /* ---------------------------------------------------------------- calculs */
  function calculer() {
    const { lignes, sousTotal, nombre } = detailsPanier();
    const livraison = (CONFIG.livraison && CONFIG.livraison[etat.livraison]) || { prix: 0 };
    const remise = etat.promo ? Math.round(sousTotal * etat.promo.pourcentage / 100) : 0;
    const total = sousTotal - remise + livraison.prix;
    const taux = (CONFIG.seuilTVA || 20) / 100;
    const tva = Math.round(total - total / (1 + taux));
    return { lignes, sousTotal, nombre, livraison, remise, total, tva };
  }

  /* ------------------------------------------------------------------ rendu */
  function rendreLivraison() {
    const zone = $("#options-livraison");
    zone.innerHTML = Object.entries(CONFIG.livraison || {}).map(([cle, l]) => `
      <label class="option ${cle === etat.livraison ? "active" : ""}" data-livraison="${cle}">
        <input type="radio" name="livraison" value="${cle}" ${cle === etat.livraison ? "checked" : ""}>
        <span><strong>${echapper(l.nom)}</strong><small>${echapper(l.delai)}</small></span>
        <span class="prix">${l.prix ? formaterPrix(l.prix) : "Offerte"}</span>
      </label>`).join("");
    $$("input[name=livraison]", zone).forEach(r => r.addEventListener("change", () => {
      etat.livraison = r.value;
      $$(".option", zone).forEach(o => o.classList.toggle("active", o.dataset.livraison === r.value));
      rendreRecap();
    }));
  }

  function rendreRecap() {
    const c = calculer();
    if (!c.lignes.length) {
      $("#paiement-grille").hidden = true;
      $("#panier-vide-message").hidden = false;
      return;
    }
    $("#recap-articles").innerHTML = c.lignes.map(l => `
      <div class="article">
        <div class="article-visuel">${rendreVisuel(l.montre, l.variante)}</div>
        <div><h4>${echapper(l.montre.nom)}</h4><div class="variante-nom">${echapper(l.montre.sousTitre)}${l.variante ? " · " + echapper(l.variante.nom) : ""} · × ${l.quantite}</div></div>
        <span class="prix" style="font-size:1.05rem">${formaterPrix(l.total)}</span>
      </div>`).join("");
    $("#recap-sous-total").textContent = formaterPrix(c.sousTotal);
    $("#ligne-remise").hidden = !c.remise;
    $("#recap-remise").textContent = "− " + formaterPrix(c.remise);
    $("#recap-livraison").textContent = c.livraison.prix ? formaterPrix(c.livraison.prix) : "Offerte";
    $("#recap-tva").textContent = formaterPrix(c.tva);
    $("#recap-total").textContent = formaterPrix(c.total);
    $("#bouton-montant").textContent = formaterPrix(c.total);
  }

  /* ------------------------------------------------------------------ promo */
  function initPromo() {
    $("#appliquer-promo").addEventListener("click", () => {
      const code = $("#code-promo").value.trim().toUpperCase();
      const statut = $("#promo-statut");
      const codes = CONFIG.codesPromo || {};
      if (codes[code]) {
        etat.promo = { code, pourcentage: codes[code] };
        statut.classList.remove("erreur");
        statut.textContent = `Code ${code} appliqué : − ${codes[code]} %`;
      } else {
        etat.promo = null;
        statut.classList.add("erreur");
        statut.textContent = code ? "Ce code n'est pas valide." : "";
      }
      rendreRecap();
    });
  }

  /* --------------------------------------------------------- moyen de paiement */
  function initMoyens() {
    const zone = $("#moyens-paiement");
    const maj = () => { $("#info-paiement-texte").textContent = TEXTES_PAIEMENT[etat.moyen]; };
    $$("input[name=moyen]", zone).forEach(r => r.addEventListener("change", () => {
      etat.moyen = r.value;
      $$(".moyen", zone).forEach(m => m.classList.toggle("active", m.dataset.moyen === r.value));
      maj();
    }));
    maj();
  }

  /* -------------------------------------------------------------- validation */
  function emailValide(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); }
  function validerFormulaire(form) {
    let ok = true, premier = null;
    $$(".champ", form).forEach(c => {
      const champ = $("input, select, textarea", c);
      if (!champ || !champ.required) return;
      const valide = champ.type === "email" ? emailValide(champ.value.trim()) : champ.value.trim().length > 0;
      c.classList.toggle("invalide", !valide);
      champ.classList.toggle("invalide", !valide);
      if (!valide) { ok = false; premier = premier || champ; }
    });
    const cgv = $("#cgv");
    const erreurCgv = $("#erreur-cgv");
    erreurCgv.style.display = cgv.checked ? "none" : "block";
    if (!cgv.checked) { ok = false; premier = premier || cgv; }
    if (premier) premier.scrollIntoView({ behavior: "smooth", block: "center" });
    return ok;
  }

  function lireClient(form) {
    const d = new FormData(form);
    return {
      prenom: d.get("prenom"), nom: d.get("nom"), email: d.get("email"), telephone: d.get("telephone"),
      adresse: { ligne1: d.get("adresse"), ligne2: d.get("complement") || "", codePostal: d.get("codePostal"), ville: d.get("ville"), pays: d.get("pays") }
    };
  }

  function numeroCommande() {
    const d = new Date();
    const aleatoire = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `LRT-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}-${aleatoire}`;
  }

  /* ------------------------------------------------------------- paiement */
  const FOURNISSEURS = {
    /* Mode démonstration : aucune transaction, confirmation immédiate. */
    demo: async function (commande) {
      await new Promise(r => setTimeout(r, 1600));
      commande.numero = numeroCommande();
      commande.statut = etat.moyen === "virement" ? "en attente de virement" : "payée (démonstration)";
      sessionStorage.setItem(CLE_COMMANDE, JSON.stringify(commande));
      viderPanier();
      window.location.href = "confirmation.html";
    },
    /* Stripe Checkout : le serveur crée la session et renvoie l'URL de paiement. */
    stripe: async function (commande) {
      if (etat.moyen === "virement") return FOURNISSEURS.demo(commande);
      sessionStorage.setItem(CLE_COMMANDE, JSON.stringify(commande));
      const reponse = await fetch(`${CONFIG.apiUrl}/api/creer-session-paiement`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articles: commande.articles.map(a => ({ id: a.id, variante: a.variante, quantite: a.quantite })),
          client: commande.client,
          livraison: etat.livraison,
          codePromo: etat.promo ? etat.promo.code : null,
          urlRetour: window.location.origin + window.location.pathname.replace(/[^/]*$/, "")
        })
      });
      if (!reponse.ok) {
        const err = await reponse.json().catch(() => ({}));
        throw new Error(err.message || "Le serveur de paiement est indisponible.");
      }
      const { url } = await reponse.json();
      if (!url) throw new Error("Réponse inattendue du serveur de paiement.");
      window.location.href = url;
    }
  };

  function initFormulaire() {
    const form = $("#formulaire-paiement");
    const bouton = $("#bouton-payer");
    form.addEventListener("submit", async e => {
      e.preventDefault();
      if (!validerFormulaire(form)) return;
      const c = calculer();
      if (!c.lignes.length) return;
      const commande = {
        client: lireClient(form),
        articles: c.lignes.map(l => ({ id: l.montre.id, nom: l.montre.nom, sousTitre: l.montre.sousTitre, variante: l.variante ? l.variante.id : null, varianteNom: l.variante ? l.variante.nom : "", quantite: l.quantite, unitaire: l.unitaire, total: l.total })),
        livraison: Object.assign({ cle: etat.livraison }, c.livraison),
        moyen: etat.moyen, promo: etat.promo, sousTotal: c.sousTotal, remise: c.remise, tva: c.tva, total: c.total,
        date: new Date().toISOString()
      };
      const texteInitial = bouton.innerHTML;
      bouton.disabled = true;
      bouton.innerHTML = `<span class="chargement"></span> Redirection sécurisée…`;
      try {
        const fournisseur = FOURNISSEURS[CONFIG.modePaiement] || FOURNISSEURS.demo;
        await fournisseur(commande);
      } catch (err) {
        console.error(err);
        notifier(err.message || "Le paiement n'a pas pu être initié.");
        bouton.disabled = false;
        bouton.innerHTML = texteInitial;
      }
    });
    $$("input, select", form).forEach(ch => ch.addEventListener("input", () => { ch.classList.remove("invalide"); ch.closest(".champ") && ch.closest(".champ").classList.remove("invalide"); }));
  }

  document.addEventListener("DOMContentLoaded", () => {
    rendreLivraison();
    initPromo();
    initMoyens();
    initFormulaire();
    rendreRecap();
    document.addEventListener("panier:modifie", rendreRecap);
    if (CONFIG.modePaiement === "demo") {
      const info = document.createElement("p");
      info.className = "texte-gris";
      info.style.cssText = "font-size:0.78rem;text-align:center;margin-top:14px";
      info.textContent = "Site en mode démonstration : aucun paiement réel ne sera effectué.";
      $(".recap-boite").appendChild(info);
    }
  });
})();
