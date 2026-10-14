/* =====================================================================
   Serveur de paiement — Maison Aurèle
   ---------------------------------------------------------------------
   Crée des sessions Stripe Checkout à partir du catalogue partagé avec
   le site (assets/data/montres.js). Les prix sont TOUJOURS recalculés
   ici, côté serveur : le navigateur n'envoie que des identifiants et des
   quantités, jamais de montants.

   Lancement :
     cd server
     cp .env.example .env     (puis renseigner STRIPE_CLE_SECRETE)
     npm install
     npm start
   ===================================================================== */
"use strict";
require("dotenv").config();
const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");

const { MONTRES } = require("../assets/data/montres.js");
const CONFIG = chargerConfigSite();

const cleStripe = process.env.STRIPE_CLE_SECRETE;
if (!cleStripe) {
  console.error("⚠  STRIPE_CLE_SECRETE manquante. Copiez server/.env.example vers server/.env et renseignez votre clé.");
  process.exit(1);
}
const stripe = require("stripe")(cleStripe);

const app = express();
const PORT = process.env.PORT || 4242;
const origines = (process.env.ORIGINES_AUTORISEES || "http://localhost:8080").split(",").map(s => s.trim()).filter(Boolean);
app.use(cors({ origin: (origine, cb) => cb(null, !origine || origines.includes(origine)) }));

/* Le webhook doit recevoir le corps brut pour vérifier la signature Stripe. */
app.post("/api/webhook", express.raw({ type: "application/json" }), (req, res) => {
  let evenement;
  try {
    const secret = process.env.STRIPE_SECRET_WEBHOOK;
    evenement = secret
      ? stripe.webhooks.constructEvent(req.body, req.headers["stripe-signature"], secret)
      : JSON.parse(req.body.toString());
  } catch (err) {
    console.error("Webhook invalide :", err.message);
    return res.status(400).send(`Webhook invalide : ${err.message}`);
  }
  if (evenement.type === "checkout.session.completed") {
    const session = evenement.data.object;
    enregistrerCommande(session);
    console.log(`✔ Commande ${session.metadata && session.metadata.numero} payée (${session.customer_details && session.customer_details.email}).`);
    /* Ici : envoi de l'e-mail de confirmation, mise à jour du stock, etc. */
  }
  res.json({ recu: true });
});

app.use(express.json());

/* ------------------------------------------------- création de la session */
app.post("/api/creer-session-paiement", async (req, res) => {
  try {
    const { articles, client, livraison, codePromo, urlRetour } = req.body || {};
    if (!Array.isArray(articles) || !articles.length) return res.status(400).json({ message: "Panier vide." });

    const lignes = [];
    let sousTotal = 0;
    for (const a of articles) {
      const montre = MONTRES.find(m => m.id === a.id);
      if (!montre) return res.status(400).json({ message: `Montre inconnue : ${a.id}` });
      const variante = (montre.variantes || []).find(v => v.id === a.variante) || (montre.variantes || [])[0];
      const quantite = Math.max(1, Math.min(Number(a.quantite) || 1, montre.stock));
      const unitaire = montre.prix + ((variante && variante.supplement) || 0);
      sousTotal += unitaire * quantite;
      lignes.push({
        quantity: quantite,
        price_data: {
          currency: (CONFIG.devise || "EUR").toLowerCase(),
          unit_amount: unitaire,
          product_data: {
            name: `${montre.nom} — ${montre.sousTitre}`,
            description: variante ? `Bracelet : ${variante.nom} · Réf. ${montre.reference}` : `Réf. ${montre.reference}`,
            metadata: { id: montre.id, variante: variante ? variante.id : "" }
          }
        }
      });
    }

    const optionLivraison = (CONFIG.livraison && CONFIG.livraison[livraison]) || CONFIG.livraison.standard;
    const remisePourcent = codePromo && CONFIG.codesPromo ? CONFIG.codesPromo[String(codePromo).toUpperCase()] : null;

    let coupon;
    if (remisePourcent) {
      coupon = await stripe.coupons.create({ percent_off: remisePourcent, duration: "once", name: `Code ${String(codePromo).toUpperCase()}` });
    }

    const numero = genererNumero();
    const base = (urlRetour && /^https?:\/\//.test(urlRetour)) ? urlRetour : origines[0] + "/";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      locale: "fr",
      line_items: lignes,
      customer_email: client && client.email ? client.email : undefined,
      shipping_options: [{
        shipping_rate_data: {
          type: "fixed_amount",
          display_name: optionLivraison.nom,
          fixed_amount: { amount: optionLivraison.prix, currency: (CONFIG.devise || "EUR").toLowerCase() }
        }
      }],
      discounts: coupon ? [{ coupon: coupon.id }] : undefined,
      metadata: {
        numero,
        client: client ? `${client.prenom} ${client.nom}` : "",
        telephone: client && client.telephone ? client.telephone : "",
        adresse: client && client.adresse ? `${client.adresse.ligne1} ${client.adresse.ligne2 || ""}, ${client.adresse.codePostal} ${client.adresse.ville}, ${client.adresse.pays}` : "",
        livraison: livraison || "standard"
      },
      success_url: `${base}confirmation.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}paiement.html`
    });

    res.json({ url: session.url, id: session.id, numero, sousTotal });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Impossible de créer la session de paiement." });
  }
});

/* ------------------------------------------- vérification après paiement */
app.get("/api/commande/:sessionId", async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.retrieve(req.params.sessionId);
    if (session.payment_status === "paid") enregistrerCommande(session);
    res.json({
      statut: session.payment_status,
      numero: session.metadata && session.metadata.numero,
      email: session.customer_details && session.customer_details.email,
      total: session.amount_total
    });
  } catch (err) {
    res.status(404).json({ message: "Session introuvable." });
  }
});

/* ----------------------------------------------------- catalogue (lecture) */
app.get("/api/montres", (req, res) => res.json(MONTRES));
app.get("/api/sante", (req, res) => res.json({ ok: true, boutique: CONFIG.nomBoutique }));

app.listen(PORT, () => console.log(`Serveur de paiement Maison Aurèle à l'écoute sur http://localhost:${PORT}`));

/* ------------------------------------------------------------- utilitaires */
function genererNumero() {
  const d = new Date();
  return `AUR-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

/* Lit config.js du site (fichier navigateur) sans l'exécuter dans un contexte DOM. */
function chargerConfigSite() {
  const source = fs.readFileSync(path.join(__dirname, "..", "assets", "js", "config.js"), "utf8");
  const bac = { window: {} };
  new Function("window", source)(bac.window);
  return bac.window.CONFIG || {};
}

/* Journal minimal des commandes payées (fichier JSON local). À remplacer par une base de données. */
function enregistrerCommande(session) {
  const fichier = path.join(__dirname, "commandes.json");
  let liste = [];
  try { liste = JSON.parse(fs.readFileSync(fichier, "utf8")); } catch (e) {}
  if (liste.some(c => c.sessionId === session.id)) return;
  liste.push({
    sessionId: session.id,
    numero: session.metadata && session.metadata.numero,
    date: new Date().toISOString(),
    email: session.customer_details && session.customer_details.email,
    total: session.amount_total,
    metadata: session.metadata
  });
  fs.writeFileSync(fichier, JSON.stringify(liste, null, 2));
}
