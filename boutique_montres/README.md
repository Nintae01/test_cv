# La Roux du Temps — Boutique de montres en ligne

Site vitrine et boutique pour une maison d'horlogerie, entièrement en français. Aucune étape de compilation : le site est constitué de pages HTML, d'une feuille de style et de quelques scripts, et peut être hébergé tel quel sur GitHub Pages.

## Aperçu

- **Accueil** : hero avec montre vectorielle, bandeau défilant (avec l'offre d'ouverture), collections, catalogue filtrable (collection, recherche, tri), présentation de la maison avec compteurs animés, services, mot du fondateur, questions fréquentes, newsletter, contact.
- **Montres toujours à l'heure** : chaque montre affichée (accueil, catalogue, fiche, panier) indique l'heure réelle du visiteur, à la seconde, et le guichet de date affiche le jour du mois. Le mouvement est fluide, ou tic par seconde si le visiteur a demandé à réduire les animations.
- **Fiche produit** (modale) : description, choix du bracelet avec supplément éventuel, caractéristiques, quantité, ajout au panier.
- **Panier** (tiroir latéral) : persistant sur l'appareil (stockage local), quantités, suppression, totaux.
- **Paiement** (`paiement.html`) : coordonnées, adresse, mode de livraison, moyen de paiement, code promotionnel, TVA, validation des champs, puis paiement.
- **Confirmation** (`confirmation.html`) : numéro de commande et récapitulatif.
- **Informations** (`informations.html`) : livraison, CGV, mentions légales, confidentialité (textes d'exemple à remplacer).

Typographie : *Cormorant Garamond* pour les titres et *Jost* pour le texte (Google Fonts). Palette noir profond et or champagne, angles chanfreinés, grain subtil, curseur personnalisé, animations à l'apparition. Les animations respectent la préférence système « réduire les animations ».

## Checklist avant l'ouverture

Les textes du site sont écrits pour une jeune boutique qui vient d'ouvrir. Avant la mise en ligne, relisez et adaptez :

1. **Le mot du fondateur** et la section « La maison » dans `index.html` : mettez-y vos mots, votre prénom, votre histoire.
2. **Les coordonnées** (adresse, horaires, téléphone, e-mail) dans `index.html` et `informations.html`.
3. **Les mentions légales** dans `informations.html` : forme juridique, RCS, TVA, nom du directeur de la publication.
4. **Les montres** dans `assets/data/montres.js` : les neuf modèles fournis sont des exemples à remplacer par vos vraies références, prix et stocks. Ajoutez vos photos avec le champ `images`.
5. **L'offre d'ouverture** : le bandeau annonce « −5 % avec le code BIENVENUE ». Le code se règle dans `assets/js/config.js` (`codesPromo`) ; supprimez la ligne du bandeau dans `index.html` pour retirer l'offre.
6. **La garantie et les délais** annoncés (deux ans, expédition sous 48 h, retour sous trente jours) : vérifiez qu'ils correspondent à ce que vous pouvez tenir.
7. **Le paiement** : laissez `modePaiement: "demo"` tant que Stripe n'est pas configuré (voir plus bas).

## Structure

```
boutique_montres/
├── index.html               Accueil et catalogue
├── paiement.html            Passage en caisse
├── confirmation.html        Confirmation de commande
├── informations.html        Livraison, CGV, mentions légales
├── assets/
│   ├── css/style.css        Feuille de style
│   ├── data/montres.js      ⭐ Catalogue (source unique, partagée avec le serveur)
│   ├── js/config.js         ⭐ Configuration (mode de paiement, livraison, codes promo)
│   ├── js/montre-svg.js     Rendu vectoriel des montres
│   ├── js/commun.js         Panier, entête, notifications (toutes pages)
│   ├── js/main.js           Logique de l'accueil
│   └── js/paiement.js       Logique du passage en caisse
└── server/                  Serveur de paiement Stripe (Node.js, facultatif)
    ├── server.js
    ├── package.json
    └── .env.example
```

## Lancer le site en local

Ouvrez simplement `index.html` dans un navigateur, ou servez le dossier :

```bash
cd boutique_montres
python3 -m http.server 8080
# puis http://localhost:8080
```

## Ajouter ou modifier des montres

Tout se passe dans `assets/data/montres.js`. Chaque montre est un objet :

```js
{
  id: "heritage-38-ivoire",          // identifiant unique, sans espace
  nom: "Héritage 38",
  sousTitre: "Cadran ivoire, boîtier or jaune",
  collection: "heritage",            // heritage | abysse | chronographe
  prix: 489000,                      // en centimes : 4 890 €
  nouveaute: true,
  stock: 6,
  reference: "LRT-H38-IV",
  description: "…",
  caracteristiques: { "Diamètre": "38 mm", … },
  variantes: [ { id: "alligator-noir", nom: "Alligator noir", supplement: 0, couleurBracelet: "#1c1a19" } ],
  visuel: { boitier: "or", cadran: "#efe6d2", bracelet: "cuir", couleurBracelet: "#7a4b2a", style: "classique" }
}
```

- `visuel` pilote le rendu vectoriel : `boitier` (`or`, `orRose`, `acier`, `bronze`, `noir`), `bracelet` (`cuir`, `acier`, `caoutchouc`), `style` (`classique`, `plongee`, `chrono`).
- Pour utiliser de vraies photos, ajoutez `images: ["assets/img/ma-montre.jpg"]` : elles remplacent le rendu vectoriel.
- Les collections (nom, accroche) sont définies au bas du même fichier.

## Paiement

Le site est **prêt pour Stripe Checkout**. Deux modes, choisis dans `assets/js/config.js` :

| `modePaiement` | Comportement |
| --- | --- |
| `"demo"` (par défaut) | Aucun paiement réel. Le passage en caisse simule la transaction et affiche la confirmation. Parfait pour une démonstration sur GitHub Pages. |
| `"stripe"` | Le site appelle le serveur du dossier `server/`, qui crée une session Stripe Checkout. Le client paie sur la page sécurisée hébergée par Stripe (carte, Apple Pay, Google Pay), puis revient sur `confirmation.html`. |

Le virement bancaire est proposé comme option manuelle dans les deux modes (commande enregistrée, coordonnées envoyées par e-mail).

### Mettre en service Stripe

1. Créez un compte sur [stripe.com](https://stripe.com) et récupérez votre **clé secrète** (`sk_test_…` pour les essais).
2. Lancez le serveur :
   ```bash
   cd boutique_montres/server
   cp .env.example .env        # renseignez STRIPE_CLE_SECRETE et ORIGINES_AUTORISEES
   npm install
   npm start                   # http://localhost:4242
   ```
3. Dans `assets/js/config.js`, passez `modePaiement` à `"stripe"` et renseignez `apiUrl` avec l'adresse publique du serveur (ex. une instance Render, Railway, Fly.io ou un VPS). GitHub Pages ne pouvant pas exécuter de code serveur, le serveur doit être hébergé séparément.
4. (Recommandé) Dans le tableau de bord Stripe, créez un webhook pointant vers `https://votre-serveur/api/webhook` pour l'événement `checkout.session.completed`, et copiez son secret dans `STRIPE_SECRET_WEBHOOK`. C'est là que vous brancherez l'envoi d'e-mails et la gestion du stock.

Les prix sont recalculés côté serveur à partir du catalogue : le navigateur n'envoie que des identifiants et des quantités. Les commandes payées sont journalisées dans `server/commandes.json` (à remplacer par une base de données en production).

Carte de test Stripe : `4242 4242 4242 4242`, date future, CVC quelconque.

## Déployer sur GitHub Pages

1. Dans le dépôt GitHub : **Settings → Pages → Build and deployment**.
2. Source : *Deploy from a branch*, branche `main`, dossier `/ (root)`.
3. Le site sera disponible à `https://<utilisateur>.github.io/<dépôt>/boutique_montres/`.

Pour servir la boutique à la racine du domaine, déplacez le contenu de `boutique_montres/` à la racine du dépôt ou publiez ce dossier dans une branche `gh-pages`.

## Personnalisation rapide

- **Couleurs et chanfreins** : variables en tête de `assets/css/style.css` (`--or`, `--noir`, `--chanfrein`…).
- **Polices** : balise `<link>` Google Fonts dans chaque page et variables `--serif` / `--sans`.
- **Livraison, codes promo, TVA** : `assets/js/config.js`.
- **Textes légaux** : `informations.html`.
