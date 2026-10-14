/* =====================================================================
   Catalogue des montres — La Roux du Temps
   ---------------------------------------------------------------------
   Ce fichier est la source unique du catalogue. Il est lu à la fois par
   le site (navigateur) et par le serveur de paiement (Node.js) afin que
   les prix facturés soient toujours ceux affichés.

   Pour ajouter une montre : copiez un objet existant, donnez-lui un
   identifiant unique (« id »), et renseignez ses champs.
   Les prix sont exprimés en centimes d'euro (ex. 489000 = 4 890,00 €).

   « visuel » décrit le rendu vectoriel généré automatiquement.
   Si vous disposez de photos, renseignez « images » : ["chemin/photo.jpg"]
   et elles remplaceront le rendu vectoriel.
   ===================================================================== */
(function (racine) {
  const MONTRES = [
    {
      id: "heritage-38-ivoire",
      nom: "Héritage 38",
      sousTitre: "Cadran ivoire, boîtier or jaune",
      collection: "heritage",
      prix: 489000,
      nouveaute: true,
      stock: 6,
      reference: "LRT-H38-IV",
      description:
        "Une montre habillée d'une sobriété absolue. Le cadran ivoire grené reçoit des index appliqués en or et des aiguilles feuille polies à la main. Le mouvement manufacture à remontage manuel se dévoile à travers le fond saphir.",
      caracteristiques: {
        "Diamètre": "38 mm",
        "Boîtier": "Or jaune 18 carats",
        "Mouvement": "Manufacture, remontage manuel, 65 h de réserve de marche",
        "Verre": "Saphir bombé, traitement antireflet",
        "Étanchéité": "50 m",
        "Bracelet": "Alligator cognac, boucle ardillon en or"
      },
      variantes: [
        { id: "alligator-cognac", nom: "Alligator cognac", supplement: 0, couleurBracelet: "#7a4b2a" },
        { id: "alligator-noir", nom: "Alligator noir", supplement: 0, couleurBracelet: "#1c1a19" }
      ],
      visuel: { boitier: "or", cadran: "#efe6d2", bracelet: "cuir", couleurBracelet: "#7a4b2a", style: "classique", aiguilles: "#3a2d14" }
    },
    {
      id: "heritage-38-ardoise",
      nom: "Héritage 38",
      sousTitre: "Cadran ardoise, boîtier acier",
      collection: "heritage",
      prix: 279000,
      nouveaute: false,
      stock: 9,
      reference: "LRT-H38-AR",
      description:
        "La même architecture épurée, dans une expression plus contemporaine. Le cadran ardoise soleillé change de ton avec la lumière, du gris profond à l'anthracite bleuté.",
      caracteristiques: {
        "Diamètre": "38 mm",
        "Boîtier": "Acier 316L poli et brossé",
        "Mouvement": "Manufacture, remontage manuel, 65 h de réserve de marche",
        "Verre": "Saphir bombé, traitement antireflet",
        "Étanchéité": "50 m",
        "Bracelet": "Veau gris anthracite, boucle ardillon acier"
      },
      variantes: [
        { id: "veau-anthracite", nom: "Veau anthracite", supplement: 0, couleurBracelet: "#3b3b3d" },
        { id: "veau-bleu-nuit", nom: "Veau bleu nuit", supplement: 0, couleurBracelet: "#1f2a44" }
      ],
      visuel: { boitier: "acier", cadran: "#474a50", bracelet: "cuir", couleurBracelet: "#3b3b3d", style: "classique", aiguilles: "#e8e4da" }
    },
    {
      id: "heritage-36-rose",
      nom: "Héritage 36",
      sousTitre: "Cadran nacre, boîtier or rose",
      collection: "heritage",
      prix: 529000,
      nouveaute: true,
      stock: 3,
      reference: "LRT-H36-NA",
      description:
        "Un format intime, un cadran en nacre naturelle dont chaque pièce est unique. Les index sont sertis de diamants taille brillant, posés un à un.",
      caracteristiques: {
        "Diamètre": "36 mm",
        "Boîtier": "Or rose 18 carats",
        "Mouvement": "Manufacture, remontage automatique, 48 h de réserve de marche",
        "Verre": "Saphir bombé, traitement antireflet",
        "Étanchéité": "50 m",
        "Bracelet": "Alligator rose poudré, boucle déployante en or rose"
      },
      variantes: [
        { id: "alligator-poudre", nom: "Alligator rose poudré", supplement: 0, couleurBracelet: "#b58d87" },
        { id: "alligator-bordeaux", nom: "Alligator bordeaux", supplement: 0, couleurBracelet: "#5a1f28" }
      ],
      visuel: { boitier: "orRose", cadran: "#f4ece6", bracelet: "cuir", couleurBracelet: "#b58d87", style: "classique", aiguilles: "#6b4a3a" }
    },
    {
      id: "abysse-42-noir",
      nom: "Abysse 42",
      sousTitre: "Plongeuse, lunette céramique noire",
      collection: "abysse",
      prix: 349000,
      nouveaute: false,
      stock: 12,
      reference: "LRT-A42-NR",
      description:
        "Conçue pour les profondeurs, portée en ville. Lunette unidirectionnelle en céramique, index luminescents généreux et couronne vissée protégée par des épaulements.",
      caracteristiques: {
        "Diamètre": "42 mm",
        "Boîtier": "Acier 316L brossé",
        "Mouvement": "Manufacture, remontage automatique, 70 h de réserve de marche",
        "Verre": "Saphir plat, traitement antireflet",
        "Étanchéité": "300 m",
        "Bracelet": "Acier à maillons, boucle déployante avec extension de plongée"
      },
      variantes: [
        { id: "acier", nom: "Bracelet acier", supplement: 0, bracelet: "acier", couleurBracelet: "#9a9ca3" },
        { id: "caoutchouc-noir", nom: "Caoutchouc noir", supplement: -15000, bracelet: "caoutchouc", couleurBracelet: "#17181a" }
      ],
      visuel: { boitier: "acier", cadran: "#101214", bracelet: "acier", couleurBracelet: "#9a9ca3", style: "plongee", lunette: "#0b0c0e", aiguilles: "#f1efe8" }
    },
    {
      id: "abysse-42-bleu",
      nom: "Abysse 42",
      sousTitre: "Plongeuse, cadran bleu océan",
      collection: "abysse",
      prix: 359000,
      nouveaute: true,
      stock: 7,
      reference: "LRT-A42-BL",
      description:
        "Le bleu profond du cadran, obtenu par dépôt galvanique, s'assombrit vers les bords comme la lumière qui s'éteint sous la surface.",
      caracteristiques: {
        "Diamètre": "42 mm",
        "Boîtier": "Acier 316L brossé",
        "Mouvement": "Manufacture, remontage automatique, 70 h de réserve de marche",
        "Verre": "Saphir plat, traitement antireflet",
        "Étanchéité": "300 m",
        "Bracelet": "Acier à maillons, boucle déployante avec extension de plongée"
      },
      variantes: [
        { id: "acier", nom: "Bracelet acier", supplement: 0, bracelet: "acier", couleurBracelet: "#9a9ca3" },
        { id: "caoutchouc-bleu", nom: "Caoutchouc bleu", supplement: -15000, bracelet: "caoutchouc", couleurBracelet: "#19304f" }
      ],
      visuel: { boitier: "acier", cadran: "#14365c", bracelet: "acier", couleurBracelet: "#9a9ca3", style: "plongee", lunette: "#0f2440", aiguilles: "#f1efe8" }
    },
    {
      id: "abysse-40-bronze",
      nom: "Abysse 40 Bronze",
      sousTitre: "Boîtier bronze, cadran vert forêt",
      collection: "abysse",
      prix: 399000,
      nouveaute: false,
      stock: 4,
      reference: "LRT-A40-BZ",
      description:
        "Le bronze vit avec vous : sa patine évolue au fil des années et rend chaque pièce singulière. Le cadran vert forêt s'accorde à un bracelet en cuir de veau huilé.",
      caracteristiques: {
        "Diamètre": "40 mm",
        "Boîtier": "Bronze CuSn8, fond acier",
        "Mouvement": "Manufacture, remontage automatique, 70 h de réserve de marche",
        "Verre": "Saphir plat, traitement antireflet",
        "Étanchéité": "200 m",
        "Bracelet": "Veau huilé brun, boucle ardillon bronze"
      },
      variantes: [
        { id: "veau-brun", nom: "Veau huilé brun", supplement: 0, bracelet: "cuir", couleurBracelet: "#5c3b22" },
        { id: "caoutchouc-vert", nom: "Caoutchouc vert", supplement: -10000, bracelet: "caoutchouc", couleurBracelet: "#1e3a2b" }
      ],
      visuel: { boitier: "bronze", cadran: "#1f3d2e", bracelet: "cuir", couleurBracelet: "#5c3b22", style: "plongee", lunette: "#2a2117", aiguilles: "#f0e6c9" }
    },
    {
      id: "chrono-41-panda",
      nom: "Chronographe 41",
      sousTitre: "Cadran panda, boîtier acier",
      collection: "chronographe",
      prix: 649000,
      nouveaute: false,
      stock: 5,
      reference: "LRT-C41-PA",
      description:
        "Un chronographe à roue à colonnes et embrayage vertical, pour une mise en marche sans à-coup. Le cadran argenté contraste avec deux compteurs noirs au dessin classique.",
      caracteristiques: {
        "Diamètre": "41 mm",
        "Boîtier": "Acier 316L poli et brossé",
        "Mouvement": "Chronographe manufacture, roue à colonnes, 60 h de réserve de marche",
        "Verre": "Saphir bombé, traitement antireflet",
        "Étanchéité": "100 m",
        "Bracelet": "Veau noir perforé, boucle déployante acier"
      },
      variantes: [
        { id: "veau-noir", nom: "Veau noir perforé", supplement: 0, bracelet: "cuir", couleurBracelet: "#1c1a19" },
        { id: "acier", nom: "Bracelet acier", supplement: 35000, bracelet: "acier", couleurBracelet: "#9a9ca3" }
      ],
      visuel: { boitier: "acier", cadran: "#e9e4d6", bracelet: "cuir", couleurBracelet: "#1c1a19", style: "chrono", compteurs: "#1a1a1c", aiguilles: "#1a1a1c" }
    },
    {
      id: "chrono-41-or",
      nom: "Chronographe 41",
      sousTitre: "Cadran noir, boîtier or jaune",
      collection: "chronographe",
      prix: 1290000,
      nouveaute: true,
      stock: 2,
      reference: "LRT-C41-OR",
      description:
        "La pièce maîtresse de la collection. Boîtier or jaune massif, cadran laqué noir à compteurs dorés, et un mouvement chronographe décoré selon les codes de la haute horlogerie : anglage à la main, côtes de Genève, perlage.",
      caracteristiques: {
        "Diamètre": "41 mm",
        "Boîtier": "Or jaune 18 carats",
        "Mouvement": "Chronographe manufacture, roue à colonnes, 60 h de réserve de marche",
        "Verre": "Saphir bombé, traitement antireflet",
        "Étanchéité": "100 m",
        "Bracelet": "Alligator noir, boucle déployante en or"
      },
      variantes: [
        { id: "alligator-noir", nom: "Alligator noir", supplement: 0, bracelet: "cuir", couleurBracelet: "#1c1a19" },
        { id: "alligator-brun", nom: "Alligator brun", supplement: 0, bracelet: "cuir", couleurBracelet: "#4a2e1c" }
      ],
      visuel: { boitier: "or", cadran: "#121212", bracelet: "cuir", couleurBracelet: "#1c1a19", style: "chrono", compteurs: "#2a2415", aiguilles: "#e6cf8e" }
    },
    {
      id: "chrono-39-bleu",
      nom: "Chronographe 39",
      sousTitre: "Cadran bleu glacier, boîtier acier",
      collection: "chronographe",
      prix: 589000,
      nouveaute: false,
      stock: 8,
      reference: "LRT-C39-GL",
      description:
        "Un format plus contenu et un cadran bleu glacier aux compteurs argentés. La lisibilité est totale, l'élégance aussi.",
      caracteristiques: {
        "Diamètre": "39 mm",
        "Boîtier": "Acier 316L poli et brossé",
        "Mouvement": "Chronographe manufacture, roue à colonnes, 60 h de réserve de marche",
        "Verre": "Saphir bombé, traitement antireflet",
        "Étanchéité": "100 m",
        "Bracelet": "Veau bleu marine, boucle déployante acier"
      },
      variantes: [
        { id: "veau-marine", nom: "Veau bleu marine", supplement: 0, bracelet: "cuir", couleurBracelet: "#1f2a44" },
        { id: "acier", nom: "Bracelet acier", supplement: 35000, bracelet: "acier", couleurBracelet: "#9a9ca3" }
      ],
      visuel: { boitier: "acier", cadran: "#6f93b4", bracelet: "cuir", couleurBracelet: "#1f2a44", style: "chrono", compteurs: "#dfe5ea", aiguilles: "#1a1a1c" }
    }
  ];

  const COLLECTIONS = {
    heritage: {
      nom: "Héritage",
      accroche: "La montre habillée dans sa forme la plus pure.",
      description: "Des boîtiers fins, des cadrans dépouillés, des mouvements que l'on prend plaisir à remonter chaque matin."
    },
    abysse: {
      nom: "Abysse",
      accroche: "L'instrument de plongée, réinterprété.",
      description: "Étanches jusqu'à 300 mètres, lisibles dans l'obscurité, construites pour durer bien au-delà d'une vie."
    },
    chronographe: {
      nom: "Chronographe",
      accroche: "La mesure du temps court, à la main.",
      description: "Roue à colonnes, embrayage vertical, finitions soignées : des chronographes choisis pour leur mécanique autant que pour leur dessin."
    }
  };

  const exporte = { MONTRES, COLLECTIONS };
  if (typeof module !== "undefined" && module.exports) {
    module.exports = exporte;
  } else {
    racine.MONTRES = MONTRES;
    racine.COLLECTIONS = COLLECTIONS;
  }
})(typeof window !== "undefined" ? window : globalThis);
