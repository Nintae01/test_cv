# La Roux du Temps — boutique de montres

Site vitrine et boutique interactive, entièrement en français, pour l'horloger roux
de la Croix-Rousse. Aucun build, aucune dépendance : HTML, CSS et JavaScript natifs.

## Fonctionnalités

- Horloge en direct dans le héros et dans le logo (aiguilles animées à l'heure réelle)
- 12 montres dessinées procéduralement en SVG, chacune en 2 ou 3 bracelets
- Recherche, filtres par catégorie, budget maximal et tri
- Fiche produit avec choix du bracelet (le rendu change en direct), quantité, favoris
- Panier persistant (localStorage), codes promo `ROUX10`, `ROUSSEUR`, `CANNELLE`,
  seuil de livraison offerte
- Tunnel de commande en 3 étapes avec validation (e-mail, téléphone, code postal,
  carte au format Luhn, date d'expiration) et confirmation animée
- Estimateur de devis pour l'atelier, carrousel d'avis, FAQ, formulaires de contact et
  newsletter, mentions légales, thème clair/sombre, version mobile

Tout est simulé côté navigateur : aucune donnée ne quitte le poste du visiteur.

## Lancer en local

Ouvrir `index.html` dans un navigateur, ou :

```bash
python3 -m http.server 8080
# puis http://localhost:8080
```

## Déployer sur le serveur maison (depuis WSL)

```bash
cd la_roux_du_temps
./deploy.sh                 # copie vers nintae@192.168.1.17 et sert sur :8080
./deploy.sh --nginx         # idem mais via nginx sur le port 80 (sudo requis)
./deploy.sh --port 3000     # autre port
./deploy.sh --host moi@autre-ip
```

Le script copie les fichiers (rsync, ou scp à défaut) puis exécute `deploy/serve.sh`
sur le serveur. Celui-ci crée un service systemd `la-roux-du-temps` si `sudo` est
disponible sans mot de passe, sinon lance un serveur Python en arrière-plan.

Commandes utiles sur le serveur :

```bash
systemctl status la-roux-du-temps     # état du service
sudo systemctl restart la-roux-du-temps
journalctl -u la-roux-du-temps -f     # journaux
```

## Personnaliser

- Catalogue, avis et textes légaux : `assets/js/data.js`
- Couleurs et thème : variables `:root` dans `assets/css/style.css`
- Rendu des montres : `assets/js/watch.js`
