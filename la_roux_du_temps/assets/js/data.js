/* Catalogue de La Roux du Temps — données statiques (aucun serveur requis). */
window.LRT_DATA = {
  categories: {
    automatique: 'Automatique',
    chronographe: 'Chronographe',
    quartz: 'Quartz',
    vintage: 'Vintage'
  },

  produits: [
    {
      id: 'braise',
      nom: 'Braise Automatique',
      categorie: 'automatique',
      prix: 890,
      note: 4.8,
      avis: 124,
      badge: 'Coup de cœur',
      nouveau: false,
      ordre: 1,
      description: 'Notre best-seller : un cadran prune profond, des index appliqués cuivrés et un calibre automatique à remontage manuel possible. La montre que Roux porte presque tous les jours.',
      look: { cadran: '#2a1445', boitier: 'or-rose', index: 'baton', date: true, aiguilles: '#ffd9a8', accent: '#ff7a1f' },
      variantes: [
        { nom: 'Cuir cognac', bracelet: '#b5652a', type: 'cuir' },
        { nom: 'Cuir noir', bracelet: '#1c1c22', type: 'cuir' },
        { nom: 'Maille milanaise', bracelet: '#c9b48a', type: 'maille' }
      ],
      specs: { Mouvement: 'Automatique, calibre NH35, 41 h de réserve', Boîtier: 'Acier PVD or rose, 40 mm', Étanchéité: '10 ATM (100 m)', Verre: 'Saphir bombé anti-reflets', Garantie: '2 ans atelier' }
    },
    {
      id: 'aurore',
      nom: 'Aurore Ambrée',
      categorie: 'quartz',
      prix: 320,
      note: 4.6,
      avis: 58,
      badge: 'Nouveau',
      nouveau: true,
      ordre: 6,
      description: 'Un cadran dégradé ambre qui change avec la lumière, un boîtier fin de 36 mm et un mouvement quartz suisse précis à 10 secondes par an. Légère comme une promesse.',
      look: { cadran: '#ffb347', cadran2: '#c43c0c', boitier: 'acier', index: 'points', date: false, aiguilles: '#2a1445', accent: '#2a1445' },
      variantes: [
        { nom: 'Maille milanaise', bracelet: '#b8bcc4', type: 'maille' },
        { nom: 'Cuir blanc cassé', bracelet: '#efe6d8', type: 'cuir' },
        { nom: 'Cuir bordeaux', bracelet: '#6e1b2e', type: 'cuir' }
      ],
      specs: { Mouvement: 'Quartz suisse Ronda 763', Boîtier: 'Acier 316L, 36 mm', Étanchéité: '5 ATM (50 m)', Verre: 'Saphir plat', Garantie: '2 ans atelier' }
    },
    {
      id: 'cannelle',
      nom: 'Cannelle Chrono',
      categorie: 'chronographe',
      prix: 1290,
      note: 4.7,
      avis: 76,
      badge: '',
      nouveau: false,
      ordre: 4,
      description: 'Cadran crème, trois compteurs et tachymètre : un chronographe méca-quartz au déclenchement franc et net. Le compagnon des amateurs de belles mécaniques (et de cannelle).',
      look: { cadran: '#f3e6cf', boitier: 'acier', index: 'baton', date: false, chrono: true, aiguilles: '#1b1b24', accent: '#d9541f', tachy: true },
      variantes: [
        { nom: 'Cuir brun', bracelet: '#6b3a1e', type: 'cuir' },
        { nom: 'Cuir noir', bracelet: '#1c1c22', type: 'cuir' },
        { nom: 'Acier brossé', bracelet: '#b8bcc4', type: 'acier' }
      ],
      specs: { Mouvement: 'Méca-quartz Seiko VK64', Boîtier: 'Acier 316L, 41 mm', Étanchéité: '10 ATM (100 m)', Verre: 'Saphir double dôme', Garantie: '2 ans atelier' }
    },
    {
      id: 'safran',
      nom: 'Safran GMT',
      categorie: 'automatique',
      prix: 1490,
      note: 4.9,
      avis: 41,
      badge: 'Édition limitée',
      nouveau: true,
      ordre: 2,
      description: 'Deux fuseaux horaires, une lunette bicolore orange et sarcelle, un cadran bleu nuit. Limitée à 150 exemplaires numérotés. Pour celles et ceux qui ont un pied à Lyon et l\'autre ailleurs.',
      look: { cadran: '#0f1f3d', boitier: 'acier', index: 'baton', date: true, gmt: true, aiguilles: '#ffffff', accent: '#ff7a1f', lunette: ['#ff7a1f', '#0fbfae'] },
      variantes: [
        { nom: 'Acier brossé', bracelet: '#b8bcc4', type: 'acier' },
        { nom: 'Caoutchouc sarcelle', bracelet: '#0fbfae', type: 'caoutchouc' },
        { nom: 'Cuir cognac', bracelet: '#b5652a', type: 'cuir' }
      ],
      specs: { Mouvement: 'Automatique GMT, calibre NH34', Boîtier: 'Acier 316L, 40 mm', Étanchéité: '20 ATM (200 m)', Verre: 'Saphir bombé', Garantie: '2 ans atelier', Série: '150 exemplaires numérotés' }
    },
    {
      id: 'rouille',
      nom: 'Rouille Noble',
      categorie: 'vintage',
      prix: 640,
      note: 4.5,
      avis: 33,
      badge: '',
      nouveau: false,
      ordre: 8,
      description: 'Boîtier bronze patiné, cadran brun tropical : une pièce des années 70 entièrement révisée dans notre atelier. La rouille, ici, c\'est de la noblesse.',
      look: { cadran: '#5a2d14', cadran2: '#8c4a22', boitier: 'bronze', index: 'arabe', date: false, aiguilles: '#f3e6cf', accent: '#f3e6cf' },
      variantes: [
        { nom: 'Cuir vert olive', bracelet: '#4c5a2a', type: 'cuir' },
        { nom: 'Cuir brun', bracelet: '#6b3a1e', type: 'cuir' },
        { nom: 'NATO sable', bracelet: '#c9b48a', type: 'nato' }
      ],
      specs: { Mouvement: 'Mécanique à remontage manuel, révisé 2026', Boîtier: 'Bronze, 38 mm', Étanchéité: '3 ATM (éclaboussures)', Verre: 'Hésalite d\'origine', Garantie: '2 ans atelier', Année: '1974' }
    },
    {
      id: 'feufollet',
      nom: 'Feu Follet',
      categorie: 'quartz',
      prix: 240,
      note: 4.4,
      avis: 97,
      badge: 'Nouveau',
      nouveau: true,
      ordre: 9,
      description: 'Sarcelle électrique, boîtier noir et bracelet caoutchouc orange : la montre qui réveille une tenue. Quartz, légère, increvable. Le feu follet qu\'on suit avec plaisir.',
      look: { cadran: '#0fbfae', cadran2: '#087f74', boitier: 'noir', index: 'points', date: false, aiguilles: '#ffffff', accent: '#ff7a1f' },
      variantes: [
        { nom: 'Caoutchouc orange', bracelet: '#ff7a1f', type: 'caoutchouc' },
        { nom: 'Caoutchouc noir', bracelet: '#1c1c22', type: 'caoutchouc' },
        { nom: 'NATO rayé', bracelet: '#ff3d81', type: 'nato' }
      ],
      specs: { Mouvement: 'Quartz Miyota 2035', Boîtier: 'Acier PVD noir, 38 mm', Étanchéité: '10 ATM (100 m)', Verre: 'Minéral durci', Garantie: '2 ans atelier' }
    },
    {
      id: 'ambre',
      nom: 'Ambre Solaire',
      categorie: 'automatique',
      prix: 760,
      note: 4.7,
      avis: 64,
      badge: '',
      nouveau: false,
      ordre: 5,
      description: 'Cadran soleillé orange flamboyant, boîtier or jaune et aiguilles dauphines : la montre qui ressemble le plus à un coucher de soleil sur la Saône.',
      look: { cadran: '#ff8a3d', cadran2: '#b8420e', boitier: 'or', index: 'baton', date: true, aiguilles: '#fff4e0', accent: '#2a1445', soleil: true },
      variantes: [
        { nom: 'Cuir noir', bracelet: '#1c1c22', type: 'cuir' },
        { nom: 'Cuir cognac', bracelet: '#b5652a', type: 'cuir' },
        { nom: 'Maille dorée', bracelet: '#d8b26a', type: 'maille' }
      ],
      specs: { Mouvement: 'Automatique Miyota 9015, 42 h de réserve', Boîtier: 'Acier PVD or jaune, 39 mm', Étanchéité: '5 ATM (50 m)', Verre: 'Saphir bombé', Garantie: '2 ans atelier' }
    },
    {
      id: 'sienne',
      nom: 'Terre de Sienne',
      categorie: 'vintage',
      prix: 580,
      note: 4.6,
      avis: 27,
      badge: '',
      nouveau: false,
      ordre: 10,
      description: 'Cadran doré « gilt » à chiffres romains, boîtier acier poli : une montre habillée des années 60, révisée, étanchéifiée et prête pour cinquante années de plus.',
      look: { cadran: '#d9b36a', cadran2: '#9a7334', boitier: 'acier', index: 'romain', date: false, aiguilles: '#2a1445', accent: '#2a1445' },
      variantes: [
        { nom: 'Cuir brun', bracelet: '#6b3a1e', type: 'cuir' },
        { nom: 'Cuir noir', bracelet: '#1c1c22', type: 'cuir' }
      ],
      specs: { Mouvement: 'Mécanique à remontage manuel, révisé 2025', Boîtier: 'Acier, 35 mm', Étanchéité: '3 ATM (éclaboussures)', Verre: 'Hésalite', Garantie: '2 ans atelier', Année: '1966' }
    },
    {
      id: 'eclat',
      nom: 'Éclat de Roux',
      categorie: 'chronographe',
      prix: 1890,
      note: 4.9,
      avis: 52,
      badge: 'Coup de cœur',
      nouveau: false,
      ordre: 3,
      description: 'Le chronographe signature de la maison : cadran blanc « panda » à compteurs orange, calibre automatique et bracelet acier intégré. Notre montre la plus rousse, et la plus fière.',
      look: { cadran: '#f7f3ea', boitier: 'acier', index: 'baton', date: true, chrono: true, sousCadran: '#ff7a1f', aiguilles: '#1b1b24', accent: '#ff7a1f', tachy: true },
      variantes: [
        { nom: 'Acier intégré', bracelet: '#b8bcc4', type: 'acier' },
        { nom: 'Cuir noir', bracelet: '#1c1c22', type: 'cuir' },
        { nom: 'Caoutchouc orange', bracelet: '#ff7a1f', type: 'caoutchouc' }
      ],
      specs: { Mouvement: 'Chronographe automatique Sellita SW510', Boîtier: 'Acier 316L, 42 mm', Étanchéité: '10 ATM (100 m)', Verre: 'Saphir bombé anti-reflets', Garantie: '2 ans atelier' }
    },
    {
      id: 'minuit',
      nom: 'Minuit Cuivre',
      categorie: 'automatique',
      prix: 980,
      note: 4.8,
      avis: 88,
      badge: '',
      nouveau: false,
      ordre: 7,
      description: 'Cadran noir mat, index et aiguilles cuivre : sobre le jour, incandescente le soir grâce à son Super-LumiNova orangé. Une montre de nuit pour gens discrets.',
      look: { cadran: '#121218', boitier: 'cuivre', index: 'baton', date: true, aiguilles: '#e8955f', accent: '#e8955f' },
      variantes: [
        { nom: 'Cuir noir', bracelet: '#1c1c22', type: 'cuir' },
        { nom: 'Cuir gris anthracite', bracelet: '#4a4a55', type: 'cuir' },
        { nom: 'Maille cuivrée', bracelet: '#c97a4a', type: 'maille' }
      ],
      specs: { Mouvement: 'Automatique Sellita SW200-1, 38 h de réserve', Boîtier: 'Acier PVD cuivre, 40 mm', Étanchéité: '10 ATM (100 m)', Verre: 'Saphir plat anti-reflets', Garantie: '2 ans atelier' }
    },
    {
      id: 'flamme',
      nom: 'Flamme Vintage',
      categorie: 'vintage',
      prix: 450,
      note: 4.3,
      avis: 19,
      badge: '',
      nouveau: false,
      ordre: 12,
      description: 'Cadran rouge-orangé rarissime, boîtier plaqué or, mouvement mécanique de 1978. Une montre de collection qui n\'a pas froid aux yeux. Ni au poignet.',
      look: { cadran: '#e3461b', cadran2: '#8c1f0c', boitier: 'or', index: 'baton', date: true, aiguilles: '#fff4e0', accent: '#fff4e0' },
      variantes: [
        { nom: 'Cuir fauve', bracelet: '#c48a4a', type: 'cuir' },
        { nom: 'Cuir noir', bracelet: '#1c1c22', type: 'cuir' }
      ],
      specs: { Mouvement: 'Mécanique à remontage manuel, révisé 2026', Boîtier: 'Plaqué or, 36 mm', Étanchéité: 'Non étanche', Verre: 'Hésalite', Garantie: '2 ans atelier', Année: '1978' }
    },
    {
      id: 'magma',
      nom: 'Magma Plongeuse',
      categorie: 'automatique',
      prix: 1150,
      note: 4.7,
      avis: 45,
      badge: 'Nouveau',
      nouveau: true,
      ordre: 11,
      description: 'Lunette tournante unidirectionnelle, cadran noir, index luminescents sarcelle et 30 ATM : notre plongeuse descend plus bas que la plupart des gens n\'oseront jamais aller.',
      look: { cadran: '#101014', boitier: 'acier', index: 'points', date: true, plongee: true, aiguilles: '#ffffff', accent: '#0fbfae', lunette: ['#1b1b24', '#1b1b24'] },
      variantes: [
        { nom: 'Caoutchouc sarcelle', bracelet: '#0fbfae', type: 'caoutchouc' },
        { nom: 'Acier brossé', bracelet: '#b8bcc4', type: 'acier' },
        { nom: 'NATO orange', bracelet: '#ff7a1f', type: 'nato' }
      ],
      specs: { Mouvement: 'Automatique Seiko NH36, 41 h de réserve', Boîtier: 'Acier 316L, 42 mm', Étanchéité: '30 ATM (300 m)', Verre: 'Saphir bombé', Garantie: '2 ans atelier' }
    }
  ],

  avis: [
    { nom: 'Camille D.', ville: 'Lyon', note: 5, texte: 'J\'ai acheté la Braise pour mon compagnon, il ne l\'enlève plus. Roux a pris le temps de régler le bracelet et d\'expliquer le mouvement. Un vrai passionné.' },
    { nom: 'Mehdi B.', ville: 'Villeurbanne', note: 5, texte: 'Service de révision impeccable sur la montre de mon grand-père. Elle marche mieux qu\'en 1980 ! Et le rapport de révision détaillé est un vrai plus.' },
    { nom: 'Élise R.', ville: 'Grenoble', note: 4, texte: 'La Feu Follet est aussi vibrante qu\'en photo. Livraison en deux jours, emballage soigné. J\'enlève une étoile parce que je veux maintenant toutes les autres.' },
    { nom: 'Thomas L.', ville: 'Paris', note: 5, texte: 'Enfin un horloger qui répond au téléphone et qui dit la vérité sur les délais. La Safran GMT est magnifique, la lunette bicolore est encore plus belle en vrai.' },
    { nom: 'Inès M.', ville: 'Annecy', note: 5, texte: 'Gravure parfaite, en 48 h, pour l\'anniversaire de ma mère. Elle a pleuré. Moi aussi, un peu.' }
  ],

  legal: {
    cgv: { titre: 'Conditions générales de vente', html: '<p><strong>Site de démonstration.</strong> Les commandes passées sur cette boutique sont fictives : aucun paiement n\'est débité et aucune montre n\'est expédiée.</p><p>Dans la vraie vie, La Roux du Temps appliquerait : droit de rétractation de 30 jours, garantie commerciale de 2 ans, livraison en France métropolitaine, prix TTC en euros.</p>' },
    mentions: { titre: 'Mentions légales', html: '<p>La Roux du Temps — SAS au capital de 12 000 € (fictif).<br>14 rue des Capucins, 69001 Lyon.<br>Directeur de la publication : Roux.<br>Hébergement : serveur maison, quelque part en 192.168.1.x.</p>' },
    confidentialite: { titre: 'Politique de confidentialité', html: '<p>Ce site ne dépose aucun cookie tiers et n\'envoie aucune donnée à un serveur. Votre panier, vos favoris et vos préférences sont stockés uniquement dans votre navigateur (localStorage) et peuvent être effacés à tout moment.</p>' }
  }
};
