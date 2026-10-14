/* =====================================================================
   Configuration du site — La Roux du Temps
   ---------------------------------------------------------------------
   modePaiement :
     "demo"   → aucun paiement réel. Le passage en caisse simule un
                paiement et affiche la page de confirmation. Idéal pour
                présenter le site sur GitHub Pages sans serveur.
     "stripe" → le site appelle le serveur (dossier /server) qui crée une
                session Stripe Checkout sécurisée. Le client est redirigé
                vers la page de paiement hébergée par Stripe.
   ===================================================================== */
window.CONFIG = {
  nomBoutique: "La Roux du Temps",
  devise: "EUR",
  modePaiement: "demo",
  // Adresse du serveur de paiement (sans barre oblique finale)
  apiUrl: "http://localhost:4242",
  livraison: {
    standard: { nom: "Livraison assurée", delai: "3 à 5 jours ouvrés", prix: 0 },
    express: { nom: "Coursier sécurisé", delai: "24 h, remise en main propre", prix: 4900 }
  },
  // Codes promotionnels : { code: pourcentage de remise }
  codesPromo: { BIENVENUE: 5, LAROUX10: 10 },
  seuilTVA: 20
};
