/* =====================================================================
   Rendu vectoriel des montres — Maison Aurèle
   ---------------------------------------------------------------------
   genererMontreSVG(visuel, options) retourne une chaîne SVG décrivant
   une montre à partir d'un simple descripteur (boîtier, cadran, bracelet,
   style). Chaque instance reçoit un identifiant unique pour ses dégradés
   afin de pouvoir coexister sur une même page.
   ===================================================================== */
(function (racine) {
  let compteur = 0;

  const MATERIAUX = {
    or: ["#f6e3a1", "#d4af4f", "#8f6d22", "#5c4411"],
    orRose: ["#f4d2c0", "#d39a7b", "#95603f", "#5a3826"],
    acier: ["#fafafa", "#c4c7cc", "#7c8087", "#3d4046"],
    bronze: ["#e5b77a", "#b57b3f", "#6e4a22", "#3d2912"],
    noir: ["#5a5a5e", "#2a2a2d", "#121214", "#050506"]
  };

  function polaire(cx, cy, r, deg) {
    const rad = (deg - 90) * Math.PI / 180;
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
  }

  function ligneRadiale(cx, cy, r1, r2, deg, attrs) {
    const [x1, y1] = polaire(cx, cy, r1, deg);
    const [x2, y2] = polaire(cx, cy, r2, deg);
    return `<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" ${attrs}/>`;
  }

  function assombrir(hex, facteur) {
    const n = parseInt(hex.replace("#", ""), 16);
    const r = Math.max(0, Math.round(((n >> 16) & 255) * facteur));
    const g = Math.max(0, Math.round(((n >> 8) & 255) * facteur));
    const b = Math.max(0, Math.round((n & 255) * facteur));
    return "#" + ((r << 16) | (g << 8) | b).toString(16).padStart(6, "0");
  }

  function estClair(hex) {
    const n = parseInt(hex.replace("#", ""), 16);
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return (0.299 * r + 0.587 * g + 0.114 * b) > 150;
  }

  function genererMontreSVG(visuel, options) {
    options = options || {};
    const uid = "m" + (++compteur) + "_" + Math.random().toString(36).slice(2, 7);
    const v = Object.assign({ boitier: "acier", cadran: "#111", bracelet: "cuir", couleurBracelet: "#222", style: "classique" }, visuel);
    const mat = MATERIAUX[v.boitier] || MATERIAUX.acier;
    const cx = 200, cy = 280;
    const rBoitier = 150;
    const rLunetteExt = 138;
    const rCadran = v.style === "plongee" ? 108 : 120;
    const texteCadranClair = estClair(v.cadran);
    const encre = texteCadranClair ? "#1b1a18" : "#f1ede3";
    const aiguilles = v.aiguilles || (texteCadranClair ? "#1b1a18" : "#f1ede3");
    const anime = options.anime ? ` data-montre-animee="true"` : "";
    const classe = options.classe ? ` class="${options.classe}"` : "";

    /* ------------------------------------------------------------ bracelet */
    let bracelet = "";
    if (v.bracelet === "acier") {
      const teinte = v.couleurBracelet || "#9a9ca3";
      let maillons = "";
      for (let i = 0; i < 5; i++) {
        const yh = 20 + i * 30, yb = 420 + i * 30;
        maillons += `<rect x="118" y="${yh}" width="164" height="26" fill="url(#${uid}-brac)" stroke="${assombrir(teinte, 0.55)}" stroke-width="1"/>
          <rect x="150" y="${yh}" width="100" height="26" fill="url(#${uid}-brac2)" stroke="${assombrir(teinte, 0.55)}" stroke-width="1"/>
          <rect x="118" y="${yb}" width="164" height="26" fill="url(#${uid}-brac)" stroke="${assombrir(teinte, 0.55)}" stroke-width="1"/>
          <rect x="150" y="${yb}" width="100" height="26" fill="url(#${uid}-brac2)" stroke="${assombrir(teinte, 0.55)}" stroke-width="1"/>`;
      }
      bracelet = `<g>${maillons}</g>`;
    } else {
      const teinte = v.couleurBracelet || "#333";
      const couture = v.bracelet === "caoutchouc" ? "none" : (estClair(teinte) ? assombrir(teinte, 0.7) : "rgba(255,255,255,0.22)");
      const texture = v.bracelet === "caoutchouc"
        ? `<g stroke="${assombrir(teinte, 0.8)}" stroke-width="1.5">${[...Array(7)].map((_, i) => `<line x1="140" y1="${18 + i * 18}" x2="260" y2="${18 + i * 18}"/><line x1="140" y1="${420 + i * 18}" x2="260" y2="${420 + i * 18}"/>`).join("")}</g>`
        : "";
      bracelet = `<g>
        <path d="M132 0 H268 L262 152 H138 Z" fill="url(#${uid}-cuir)"/>
        <path d="M138 408 H262 L268 560 H132 Z" fill="url(#${uid}-cuir)"/>
        ${texture}
        <path d="M140 6 H260 L254 150 H146 Z" fill="none" stroke="${couture}" stroke-width="1.2" stroke-dasharray="4 4"/>
        <path d="M146 410 H254 L260 554 H140 Z" fill="none" stroke="${couture}" stroke-width="1.2" stroke-dasharray="4 4"/>
        <rect x="150" y="470" width="100" height="14" fill="${assombrir(teinte, 0.75)}"/>
        <rect x="150" y="510" width="100" height="14" fill="${assombrir(teinte, 0.75)}"/>
      </g>`;
    }

    /* --------------------------------------------------------------- cornes */
    const cornes = `<g fill="url(#${uid}-metal)" stroke="${mat[3]}" stroke-width="1">
      <path d="M118 150 L140 110 L160 130 L150 180 Z"/>
      <path d="M282 150 L260 110 L240 130 L250 180 Z"/>
      <path d="M118 410 L140 450 L160 430 L150 380 Z"/>
      <path d="M282 410 L260 450 L240 430 L250 380 Z"/>
    </g>`;

    /* ------------------------------------------------------------- couronne */
    let couronne = `<g>
      <rect x="346" y="268" width="22" height="24" rx="3" fill="url(#${uid}-metalV)" stroke="${mat[3]}" stroke-width="1"/>
      ${[0, 1, 2, 3].map(i => `<line x1="${350 + i * 5}" y1="269" x2="${350 + i * 5}" y2="291" stroke="${mat[3]}" stroke-width="1" opacity="0.6"/>`).join("")}
    </g>`;
    if (v.style === "chrono") {
      couronne += `<g>
        <rect x="340" y="214" width="20" height="18" rx="2" transform="rotate(-30 350 223)" fill="url(#${uid}-metalV)" stroke="${mat[3]}" stroke-width="1"/>
        <rect x="340" y="328" width="20" height="18" rx="2" transform="rotate(30 350 337)" fill="url(#${uid}-metalV)" stroke="${mat[3]}" stroke-width="1"/>
      </g>`;
    }
    if (v.style === "plongee") {
      couronne = `<g>
        <path d="M330 258 L350 250 L350 310 L330 302 Z" fill="url(#${uid}-metal)" stroke="${mat[3]}" stroke-width="1"/>
        <rect x="348" y="266" width="22" height="28" rx="3" fill="url(#${uid}-metalV)" stroke="${mat[3]}" stroke-width="1"/>
        ${[0, 1, 2, 3].map(i => `<line x1="${352 + i * 5}" y1="267" x2="${352 + i * 5}" y2="293" stroke="${mat[3]}" stroke-width="1" opacity="0.6"/>`).join("")}
      </g>`;
    }

    /* -------------------------------------------------------------- boîtier */
    const boitier = `<g>
      <circle cx="${cx}" cy="${cy + 6}" r="${rBoitier + 2}" fill="rgba(0,0,0,0.45)"/>
      <circle cx="${cx}" cy="${cy}" r="${rBoitier}" fill="url(#${uid}-metal)" stroke="${mat[3]}" stroke-width="1.2"/>
      <circle cx="${cx}" cy="${cy}" r="${rBoitier - 6}" fill="none" stroke="${mat[0]}" stroke-width="1" opacity="0.5"/>
    </g>`;

    /* -------------------------------------------------------------- lunette */
    let lunette = "";
    if (v.style === "plongee") {
      const teinteLun = v.lunette || "#0b0c0e";
      let graduations = "";
      for (let i = 0; i < 60; i++) {
        const long = i % 5 === 0;
        graduations += ligneRadiale(cx, cy, rLunetteExt - (long ? 16 : 9), rLunetteExt - 4, i * 6, `stroke="${i < 15 ? '#f1ede3' : '#d9d4c6'}" stroke-width="${long ? 2.2 : 1}" opacity="${long ? 1 : 0.7}"`);
      }
      let chiffres = "";
      [10, 20, 30, 40, 50].forEach(n => {
        const [x, y] = polaire(cx, cy, rLunetteExt - 22, n * 6);
        chiffres += `<text x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="middle" font-family="Jost, Arial, sans-serif" font-size="11" font-weight="500" fill="#f1ede3">${n}</text>`;
      });
      const [tx, ty] = polaire(cx, cy, rLunetteExt - 12, 0);
      lunette = `<g>
        <circle cx="${cx}" cy="${cy}" r="${rLunetteExt + 2}" fill="url(#${uid}-metal)"/>
        <circle cx="${cx}" cy="${cy}" r="${rLunetteExt}" fill="${teinteLun}"/>
        <circle cx="${cx}" cy="${cy}" r="${rLunetteExt}" fill="url(#${uid}-reflet)"/>
        ${graduations}${chiffres}
        <polygon points="${tx - 7},${ty - 10} ${tx + 7},${ty - 10} ${tx},${ty + 4}" fill="#e8fbd0" stroke="#fff" stroke-width="0.8"/>
        <circle cx="${cx}" cy="${cy}" r="${rCadran + 2}" fill="${mat[2]}"/>
      </g>`;
    } else if (v.style === "chrono") {
      let tachy = "";
      for (let i = 0; i < 120; i++) {
        tachy += ligneRadiale(cx, cy, rLunetteExt - (i % 10 === 0 ? 10 : 5), rLunetteExt - 2, i * 3, `stroke="${encre}" stroke-width="${i % 10 === 0 ? 1.4 : 0.6}" opacity="${i % 10 === 0 ? 0.9 : 0.5}"`);
      }
      lunette = `<g>
        <circle cx="${cx}" cy="${cy}" r="${rLunetteExt + 2}" fill="url(#${uid}-metal)"/>
        <circle cx="${cx}" cy="${cy}" r="${rLunetteExt}" fill="${assombrir(v.cadran, texteCadranClair ? 0.94 : 1.25)}"/>
        ${tachy}
        <circle cx="${cx}" cy="${cy}" r="${rCadran}" fill="none" stroke="${encre}" stroke-width="0.8" opacity="0.5"/>
      </g>`;
    } else {
      lunette = `<g>
        <circle cx="${cx}" cy="${cy}" r="${rLunetteExt + 4}" fill="url(#${uid}-metal)"/>
        <circle cx="${cx}" cy="${cy}" r="${rLunetteExt - 4}" fill="${mat[2]}"/>
      </g>`;
    }

    /* --------------------------------------------------------------- cadran */
    let index = "";
    const rIndexExt = rCadran - 6;
    if (v.style === "plongee") {
      for (let i = 0; i < 12; i++) {
        const deg = i * 30;
        if (i === 0) {
          const [x, y] = polaire(cx, cy, rIndexExt - 12, deg);
          index += `<polygon points="${x - 11},${y + 12} ${x + 11},${y + 12} ${x},${y - 10}" fill="#eef6dc" stroke="${encre}" stroke-width="0.8"/>`;
        } else if (i % 3 === 0) {
          const [x, y] = polaire(cx, cy, rIndexExt - 12, deg);
          index += `<rect x="${x - 6}" y="${y - 13}" width="12" height="26" rx="2" transform="rotate(${deg} ${x} ${y})" fill="#eef6dc" stroke="${encre}" stroke-width="0.8"/>`;
        } else {
          const [x, y] = polaire(cx, cy, rIndexExt - 12, deg);
          index += `<circle cx="${x}" cy="${y}" r="7" fill="#eef6dc" stroke="${encre}" stroke-width="0.8"/>`;
        }
      }
      for (let i = 0; i < 60; i++) {
        if (i % 5 === 0) continue;
        index += ligneRadiale(cx, cy, rIndexExt - 6, rIndexExt, i * 6, `stroke="${encre}" stroke-width="1" opacity="0.7"`);
      }
    } else {
      for (let i = 0; i < 12; i++) {
        const deg = i * 30;
        const long = i % 3 === 0 ? 20 : 14;
        const [x, y] = polaire(cx, cy, rIndexExt - long / 2, deg);
        index += `<rect x="${x - (i % 3 === 0 ? 2.4 : 1.6)}" y="${y - long / 2}" width="${i % 3 === 0 ? 4.8 : 3.2}" height="${long}" transform="rotate(${deg} ${x} ${y})" fill="url(#${uid}-metalV)" stroke="${mat[3]}" stroke-width="0.5"/>`;
      }
      for (let i = 0; i < 60; i++) {
        index += ligneRadiale(cx, cy, rIndexExt - (i % 5 === 0 ? 0 : 3), rIndexExt + 2, i * 6, `stroke="${encre}" stroke-width="${i % 5 === 0 ? 1.2 : 0.6}" opacity="0.75"`);
      }
    }

    let compteurs = "";
    if (v.style === "chrono") {
      const teinte = v.compteurs || assombrir(v.cadran, 0.6);
      const encreC = estClair(teinte) ? "#1b1a18" : "#f1ede3";
      [[cx - 52, cy], [cx + 52, cy], [cx, cy + 52]].forEach(([sx, sy], k) => {
        let grad = "";
        for (let i = 0; i < 30; i++) grad += ligneRadiale(sx, sy, 22, 26, i * 12, `stroke="${encreC}" stroke-width="${i % 5 === 0 ? 1.2 : 0.6}"`);
        const [hx, hy] = polaire(sx, sy, 20, k === 0 ? 135 : k === 1 ? 300 : 0);
        compteurs += `<g>
          <circle cx="${sx}" cy="${sy}" r="30" fill="${teinte}" stroke="${mat[1]}" stroke-width="1"/>
          <circle cx="${sx}" cy="${sy}" r="30" fill="url(#${uid}-reflet)"/>
          ${grad}
          <line x1="${sx}" y1="${sy}" x2="${hx.toFixed(1)}" y2="${hy.toFixed(1)}" stroke="${encreC}" stroke-width="1.6" stroke-linecap="round"/>
          <circle cx="${sx}" cy="${sy}" r="2" fill="${encreC}"/>
        </g>`;
      });
    }

    const dateur = v.style !== "chrono" ? `<g>
      <rect x="${cx + rCadran - 40}" y="${cy - 9}" width="24" height="18" fill="${texteCadranClair ? '#fbfaf6' : '#f4efe4'}" stroke="${mat[1]}" stroke-width="1"/>
      <text x="${cx + rCadran - 28}" y="${cy + 5}" text-anchor="middle" font-family="Jost, Arial, sans-serif" font-size="12" font-weight="500" fill="#1b1a18">14</text>
    </g>` : "";

    const logo = `<g>
      <text x="${cx}" y="${cy - 52}" text-anchor="middle" font-family="'Cormorant Garamond', Georgia, serif" font-size="19" font-style="italic" letter-spacing="1" fill="${encre}">Aurèle</text>
      <text x="${cx}" y="${cy - 38}" text-anchor="middle" font-family="Jost, Arial, sans-serif" font-size="6.5" letter-spacing="2.4" fill="${encre}" opacity="0.8">PARIS</text>
      <text x="${cx}" y="${cy + (v.style === "chrono" ? 100 : 78)}" text-anchor="middle" font-family="Jost, Arial, sans-serif" font-size="6" letter-spacing="1.8" fill="${encre}" opacity="0.7">${v.style === "plongee" ? "AUTOMATIQUE · 300 M" : v.style === "chrono" ? "CHRONOGRAPHE" : "MANUFACTURE"}</text>
    </g>`;

    /* ------------------------------------------------------------- aiguilles */
    const angleH = options.angleH != null ? options.angleH : 305;
    const angleM = options.angleM != null ? options.angleM : 56;
    const angleS = options.angleS != null ? options.angleS : 212;
    const lumeFill = v.style === "plongee" ? "#eef6dc" : aiguilles;
    let formeH, formeM;
    if (v.style === "plongee") {
      formeH = `<path d="M${cx} ${cy + 14} L${cx - 7} ${cy - 10} L${cx} ${cy - 70} L${cx + 7} ${cy - 10} Z" fill="${aiguilles}"/><path d="M${cx} ${cy - 14} L${cx - 4} ${cy - 14} L${cx} ${cy - 62} L${cx + 4} ${cy - 14} Z" fill="${lumeFill}"/>`;
      formeM = `<path d="M${cx} ${cy + 16} L${cx - 5} ${cy - 10} L${cx} ${cy - 104} L${cx + 5} ${cy - 10} Z" fill="${aiguilles}"/><path d="M${cx} ${cy - 16} L${cx - 2.6} ${cy - 16} L${cx} ${cy - 96} L${cx + 2.6} ${cy - 16} Z" fill="${lumeFill}"/>`;
    } else {
      formeH = `<path d="M${cx} ${cy + 12} L${cx - 5} ${cy} L${cx} ${cy - 68} L${cx + 5} ${cy} Z" fill="${aiguilles}"/><path d="M${cx} ${cy} L${cx - 1.5} ${cy - 2} L${cx} ${cy - 62} L${cx + 1.5} ${cy - 2} Z" fill="${mat[0]}" opacity="0.5"/>`;
      formeM = `<path d="M${cx} ${cy + 14} L${cx - 4} ${cy} L${cx} ${cy - 104} L${cx + 4} ${cy} Z" fill="${aiguilles}"/><path d="M${cx} ${cy} L${cx - 1.2} ${cy - 2} L${cx} ${cy - 98} L${cx + 1.2} ${cy - 2} Z" fill="${mat[0]}" opacity="0.5"/>`;
    }
    const secondes = `<g data-aiguille="s" transform="rotate(${angleS} ${cx} ${cy})">
      <line x1="${cx}" y1="${cy + 26}" x2="${cx}" y2="${cy - 110}" stroke="${v.style === "classique" ? mat[1] : (v.style === "plongee" ? "#d97b5a" : mat[1])}" stroke-width="1.6" stroke-linecap="round"/>
      <circle cx="${cx}" cy="${cy + 18}" r="4" fill="${v.style === "plongee" ? "#d97b5a" : mat[1]}"/>
    </g>`;
    const aiguillesSvg = `<g>
      <g data-aiguille="h" transform="rotate(${angleH} ${cx} ${cy})">${formeH}</g>
      <g data-aiguille="m" transform="rotate(${angleM} ${cx} ${cy})">${formeM}</g>
      ${secondes}
      <circle cx="${cx}" cy="${cy}" r="5" fill="url(#${uid}-metalV)" stroke="${mat[3]}" stroke-width="0.8"/>
      <circle cx="${cx}" cy="${cy}" r="1.6" fill="${mat[3]}"/>
    </g>`;

    const cadran = `<g>
      <circle cx="${cx}" cy="${cy}" r="${rCadran}" fill="${v.cadran}"/>
      <circle cx="${cx}" cy="${cy}" r="${rCadran}" fill="url(#${uid}-soleil)"/>
      ${index}${compteurs}${dateur}${logo}${aiguillesSvg}
      <circle cx="${cx}" cy="${cy}" r="${rLunetteExt - 4}" fill="url(#${uid}-verre)" pointer-events="none"/>
    </g>`;

    /* ----------------------------------------------------------- définitions */
    const defs = `<defs>
      <linearGradient id="${uid}-metal" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${mat[0]}"/><stop offset="0.35" stop-color="${mat[1]}"/><stop offset="0.65" stop-color="${mat[2]}"/><stop offset="1" stop-color="${mat[1]}"/>
      </linearGradient>
      <linearGradient id="${uid}-metalV" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="${mat[2]}"/><stop offset="0.5" stop-color="${mat[0]}"/><stop offset="1" stop-color="${mat[2]}"/>
      </linearGradient>
      <linearGradient id="${uid}-brac" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="${assombrir(v.couleurBracelet || '#9a9ca3', 0.7)}"/><stop offset="0.5" stop-color="${v.couleurBracelet || '#9a9ca3'}"/><stop offset="1" stop-color="${assombrir(v.couleurBracelet || '#9a9ca3', 0.7)}"/>
      </linearGradient>
      <linearGradient id="${uid}-brac2" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="${assombrir(v.couleurBracelet || '#9a9ca3', 0.85)}"/><stop offset="0.5" stop-color="#ffffff" stop-opacity="0.75"/><stop offset="1" stop-color="${assombrir(v.couleurBracelet || '#9a9ca3', 0.85)}"/>
      </linearGradient>
      <linearGradient id="${uid}-cuir" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="${assombrir(v.couleurBracelet || '#333', 0.6)}"/><stop offset="0.5" stop-color="${v.couleurBracelet || '#333'}"/><stop offset="1" stop-color="${assombrir(v.couleurBracelet || '#333', 0.6)}"/>
      </linearGradient>
      <radialGradient id="${uid}-soleil" cx="0.5" cy="0.5" r="0.6">
        <stop offset="0" stop-color="#ffffff" stop-opacity="${texteCadranClair ? 0.35 : 0.14}"/><stop offset="0.7" stop-color="#ffffff" stop-opacity="0"/><stop offset="1" stop-color="#000000" stop-opacity="0.35"/>
      </radialGradient>
      <radialGradient id="${uid}-reflet" cx="0.35" cy="0.3" r="0.8">
        <stop offset="0" stop-color="#ffffff" stop-opacity="0.18"/><stop offset="0.6" stop-color="#ffffff" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="${uid}-verre" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#ffffff" stop-opacity="0.22"/><stop offset="0.38" stop-color="#ffffff" stop-opacity="0.04"/><stop offset="0.6" stop-color="#ffffff" stop-opacity="0"/><stop offset="1" stop-color="#ffffff" stop-opacity="0.08"/>
      </linearGradient>
    </defs>`;

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 560" role="img" aria-label="${options.libelle || 'Montre Maison Aurèle'}"${classe}${anime}>
      ${defs}${bracelet}${cornes}${couronne}${boitier}${lunette}${cadran}
    </svg>`;
  }

  /* Anime les aiguilles d'un SVG (attribut data-montre-animee) sur l'heure réelle. */
  function animerMontre(svg) {
    const h = svg.querySelector('[data-aiguille="h"]');
    const m = svg.querySelector('[data-aiguille="m"]');
    const s = svg.querySelector('[data-aiguille="s"]');
    if (!h || !m || !s) return;
    function tic() {
      const d = new Date();
      const ms = d.getMilliseconds();
      const sec = d.getSeconds() + ms / 1000;
      const min = d.getMinutes() + sec / 60;
      const hr = (d.getHours() % 12) + min / 60;
      s.setAttribute("transform", `rotate(${sec * 6} 200 280)`);
      m.setAttribute("transform", `rotate(${min * 6} 200 280)`);
      h.setAttribute("transform", `rotate(${hr * 30} 200 280)`);
      requestAnimationFrame(tic);
    }
    tic();
  }

  racine.genererMontreSVG = genererMontreSVG;
  racine.animerMontre = animerMontre;
})(typeof window !== "undefined" ? window : globalThis);
