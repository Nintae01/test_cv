/* Générateur de montres en SVG — chaque modèle est dessiné procéduralement. */
(function () {
  const METAUX = {
    acier:   ['#f4f6f8', '#aeb4bc', '#6f7680'],
    'or-rose': ['#ffe2cf', '#e2a07c', '#9c5a3a'],
    or:      ['#fff1c2', '#e2b85c', '#9a7334'],
    bronze:  ['#f0d3a8', '#b8864f', '#6e4a22'],
    cuivre:  ['#ffd3b0', '#d4824f', '#7d3f1e'],
    noir:    ['#5a5a66', '#2a2a33', '#0d0d12']
  };

  let uid = 0;

  function strapPattern(id, type, color) {
    switch (type) {
      case 'maille':
        return `<pattern id="${id}" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="${color}"/><path d="M0 3h6M3 0v6" stroke="rgba(0,0,0,.25)" stroke-width="1"/><circle cx="3" cy="3" r="1" fill="rgba(255,255,255,.35)"/></pattern>`;
      case 'acier':
        return `<pattern id="${id}" width="60" height="12" patternUnits="userSpaceOnUse"><rect width="60" height="12" fill="${color}"/><rect x="0" y="0" width="60" height="1.5" fill="rgba(0,0,0,.35)"/><rect x="0" y="6" width="60" height="1" fill="rgba(255,255,255,.35)"/><rect x="20" y="0" width="1" height="12" fill="rgba(0,0,0,.2)"/><rect x="40" y="0" width="1" height="12" fill="rgba(0,0,0,.2)"/></pattern>`;
      case 'nato':
        return `<pattern id="${id}" width="60" height="10" patternUnits="userSpaceOnUse"><rect width="60" height="10" fill="${color}"/><rect x="0" y="2" width="60" height="1" fill="rgba(255,255,255,.4)"/><rect x="0" y="7" width="60" height="1" fill="rgba(255,255,255,.4)"/></pattern>`;
      case 'caoutchouc':
        return `<pattern id="${id}" width="60" height="8" patternUnits="userSpaceOnUse"><rect width="60" height="8" fill="${color}"/><rect x="0" y="3" width="60" height="2" rx="1" fill="rgba(0,0,0,.18)"/></pattern>`;
      default: // cuir
        return `<pattern id="${id}" width="60" height="60" patternUnits="userSpaceOnUse"><rect width="60" height="60" fill="${color}"/><path d="M0 0h60v60H0z" fill="rgba(0,0,0,.08)"/><path d="M8 0v60M52 0v60" stroke="rgba(255,255,255,.35)" stroke-width="1" stroke-dasharray="3 3"/></pattern>`;
    }
  }

  function indices(look, ux) {
    const cx = 100, cy = 130, r = 52;
    let out = '';
    const romains = ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2;
      const major = i % 5 === 0;
      const h = i / 5;
      if (major) {
        if (look.chrono && (h === 3 || h === 6 || h === 9)) continue;
        if (look.date && h === 3 && !look.chrono) continue;
        const x1 = cx + Math.sin(a) * (r - 1), y1 = cy - Math.cos(a) * (r - 1);
        if (look.index === 'romain') {
          out += `<text x="${cx + Math.sin(a) * (r - 7)}" y="${cy - Math.cos(a) * (r - 7) + 3.2}" text-anchor="middle" font-family="Georgia, serif" font-size="8" fill="${look.accent}">${romains[h]}</text>`;
        } else if (look.index === 'arabe') {
          out += `<text x="${cx + Math.sin(a) * (r - 7)}" y="${cy - Math.cos(a) * (r - 7) + 3.4}" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700" font-size="9" fill="${look.accent}">${h === 0 ? 12 : h}</text>`;
        } else if (look.index === 'points') {
          out += `<circle cx="${cx + Math.sin(a) * (r - 5)}" cy="${cy - Math.cos(a) * (r - 5)}" r="${h % 3 === 0 ? 3 : 2.2}" fill="${look.accent}"/>`;
        } else {
          const len = h % 3 === 0 ? 11 : 7;
          const x2 = cx + Math.sin(a) * (r - len), y2 = cy - Math.cos(a) * (r - len);
          out += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${look.accent}" stroke-width="${h % 3 === 0 ? 3 : 2}" stroke-linecap="round"/>`;
        }
      } else {
        const x1 = cx + Math.sin(a) * r, y1 = cy - Math.cos(a) * r;
        const x2 = cx + Math.sin(a) * (r - 2.5), y2 = cy - Math.cos(a) * (r - 2.5);
        out += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${look.aiguilles}" stroke-opacity=".55" stroke-width="1"/>`;
      }
    }
    return out;
  }

  function bezel(look, ux) {
    const cx = 100, cy = 130;
    if (look.gmt) {
      const [c1, c2] = look.lunette;
      let out = `<path d="M${cx - 62} ${cy} A62 62 0 0 1 ${cx + 62} ${cy} L${cx + 56} ${cy} A56 56 0 0 0 ${cx - 56} ${cy} Z" fill="${c1}"/>`;
      out += `<path d="M${cx + 62} ${cy} A62 62 0 0 1 ${cx - 62} ${cy} L${cx - 56} ${cy} A56 56 0 0 0 ${cx + 56} ${cy} Z" fill="${c2}"/>`;
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        const x = cx + Math.sin(a) * 59, y = cy - Math.cos(a) * 59 + 2.2;
        if (i % 2 === 0) out += `<text x="${x}" y="${y}" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700" font-size="6" fill="#fff">${i === 0 ? 24 : i}</text>`;
        else out += `<circle cx="${x}" cy="${y - 2.2}" r="1" fill="#fff"/>`;
      }
      return out;
    }
    if (look.plongee) {
      let out = `<circle cx="${cx}" cy="${cy}" r="62" fill="#1b1b24"/><circle cx="${cx}" cy="${cy}" r="56" fill="none" stroke="${look.accent}" stroke-width="1"/>`;
      out += `<path d="M${cx} ${cy - 62} A62 62 0 0 1 ${cx + 53.7} ${cy - 31} L${cx + 48.5} ${cy - 28} A56 56 0 0 0 ${cx} ${cy - 56} Z" fill="${look.accent}"/>`;
      for (let i = 0; i < 60; i++) {
        const a = (i / 60) * Math.PI * 2;
        const major = i % 5 === 0;
        const x1 = cx + Math.sin(a) * 61, y1 = cy - Math.cos(a) * 61;
        const x2 = cx + Math.sin(a) * (major ? 57 : 59.5), y2 = cy - Math.cos(a) * (major ? 57 : 59.5);
        out += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#fff" stroke-width="${major ? 2 : 1}"/>`;
      }
      out += `<polygon points="${cx},${cy - 61} ${cx - 3.5},${cy - 55} ${cx + 3.5},${cy - 55}" fill="#fff"/>`;
      return out;
    }
    if (look.tachy) {
      let out = `<circle cx="${cx}" cy="${cy}" r="62" fill="${look.cadran}"/><circle cx="${cx}" cy="${cy}" r="62" fill="rgba(0,0,0,.08)"/>`;
      for (let i = 0; i < 120; i++) {
        const a = (i / 120) * Math.PI * 2;
        const x1 = cx + Math.sin(a) * 61, y1 = cy - Math.cos(a) * 61;
        const x2 = cx + Math.sin(a) * (i % 10 === 0 ? 57.5 : 59.5), y2 = cy - Math.cos(a) * (i % 10 === 0 ? 57.5 : 59.5);
        out += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${look.aiguilles}" stroke-opacity=".7" stroke-width=".8"/>`;
      }
      return out;
    }
    return `<circle cx="${cx}" cy="${cy}" r="62" fill="url(#${ux}-metal)"/><circle cx="${cx}" cy="${cy}" r="62" fill="none" stroke="rgba(0,0,0,.25)" stroke-width="1"/>`;
  }

  function subdials(look) {
    if (!look.chrono) return '';
    const cx = 100, cy = 130, fill = look.sousCadran || 'rgba(0,0,0,.18)';
    const pos = [[cx - 27, cy], [cx, cy + 27], [cx + 27, cy]];
    let out = '';
    pos.forEach(([x, y], k) => {
      out += `<circle cx="${x}" cy="${y}" r="12" fill="${fill}" stroke="rgba(0,0,0,.3)" stroke-width=".8"/>`;
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        out += `<line x1="${x + Math.sin(a) * 11}" y1="${y - Math.cos(a) * 11}" x2="${x + Math.sin(a) * 9}" y2="${y - Math.cos(a) * 9}" stroke="${look.sousCadran ? '#fff' : look.aiguilles}" stroke-width=".8"/>`;
      }
      const ang = [200, 60, 320][k];
      out += `<line x1="${x}" y1="${y}" x2="${x + Math.sin(ang * Math.PI / 180) * 9}" y2="${y - Math.cos(ang * Math.PI / 180) * 9}" stroke="${look.sousCadran ? '#fff' : look.aiguilles}" stroke-width="1.4" stroke-linecap="round"/>`;
    });
    return out;
  }

  function hands(look, ux, live) {
    const cx = 100, cy = 130;
    const h = live ? 0 : 300, m = live ? 0 : 60, s = live ? 0 : 215;
    const hand = (name, len, w, angle, color, tail) =>
      `<g data-hand="${name}" transform="rotate(${angle} ${cx} ${cy})"><line x1="${cx}" y1="${cy + (tail || 0)}" x2="${cx}" y2="${cy - len}" stroke="${color}" stroke-width="${w}" stroke-linecap="round"/></g>`;
    let out = '';
    out += `<g data-hand="h" transform="rotate(${h} ${cx} ${cy})"><polygon points="${cx},${cy - 30} ${cx - 3},${cy - 6} ${cx},${cy + 6} ${cx + 3},${cy - 6}" fill="${look.aiguilles}" stroke="rgba(0,0,0,.35)" stroke-width=".6"/></g>`;
    out += `<g data-hand="m" transform="rotate(${m} ${cx} ${cy})"><polygon points="${cx},${cy - 46} ${cx - 2.6},${cy - 6} ${cx},${cy + 7} ${cx + 2.6},${cy - 6}" fill="${look.aiguilles}" stroke="rgba(0,0,0,.35)" stroke-width=".6"/></g>`;
    if (look.gmt) out += `<g data-hand="gmt" transform="rotate(${live ? 0 : 140} ${cx} ${cy})"><line x1="${cx}" y1="${cy}" x2="${cx}" y2="${cy - 40}" stroke="${look.accent}" stroke-width="2"/><polygon points="${cx},${cy - 50} ${cx - 4},${cy - 40} ${cx + 4},${cy - 40}" fill="${look.accent}"/></g>`;
    out += hand('s', 50, 1.2, s, look.accent, 12);
    out += `<circle cx="${cx}" cy="${cy}" r="3.2" fill="${look.accent}" stroke="rgba(0,0,0,.4)" stroke-width=".6"/>`;
    return out;
  }

  /**
   * Dessine une montre.
   * @param {object} look  apparence (cadran, boitier, index, …)
   * @param {object} variante { bracelet, type }
   * @param {object} opts { live: boolean, size: 'card'|'hero' }
   */
  function watchSVG(look, variante, opts = {}) {
    const ux = 'w' + (++uid);
    const metal = METAUX[look.boitier] || METAUX.acier;
    const strapId = `${ux}-strap`;
    const dial2 = look.cadran2 || look.cadran;
    const live = !!opts.live;

    return `
<svg class="watch-svg" viewBox="0 0 200 260" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${opts.label || 'Montre'}">
  <defs>
    <linearGradient id="${ux}-metal" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${metal[0]}"/><stop offset=".5" stop-color="${metal[1]}"/><stop offset="1" stop-color="${metal[2]}"/>
    </linearGradient>
    <radialGradient id="${ux}-dial" cx="35%" cy="30%" r="80%">
      <stop offset="0" stop-color="${look.cadran}"/><stop offset="1" stop-color="${dial2}"/>
    </radialGradient>
    ${look.soleil ? `<linearGradient id="${ux}-sun" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="rgba(255,255,255,.35)"/><stop offset=".5" stop-color="rgba(255,255,255,0)"/><stop offset="1" stop-color="rgba(0,0,0,.25)"/></linearGradient>` : ''}
    <linearGradient id="${ux}-glass" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="rgba(255,255,255,.55)"/><stop offset=".45" stop-color="rgba(255,255,255,0)"/>
    </linearGradient>
    <filter id="${ux}-shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#000" flood-opacity=".45"/></filter>
    ${strapPattern(strapId, variante.type, variante.bracelet)}
  </defs>

  <!-- bracelet -->
  <g filter="url(#${ux}-shadow)">
    <path d="M72 0 H128 V72 H72 Z" fill="url(#${strapId})"/>
    <path d="M72 188 H128 V260 H72 Z" fill="url(#${strapId})"/>
    <rect x="72" y="0" width="56" height="72" fill="rgba(0,0,0,.18)"/>
    <rect x="72" y="188" width="56" height="72" fill="rgba(0,0,0,.18)"/>
  </g>
  ${variante.type === 'cuir' || variante.type === 'caoutchouc' ? `<rect x="68" y="18" width="64" height="8" rx="2" fill="url(#${ux}-metal)"/>` : ''}

  <!-- boîtier -->
  <g filter="url(#${ux}-shadow)">
    <path d="M64 70 L136 70 L138 190 L62 190 Z" fill="url(#${ux}-metal)"/>
    <rect x="166" y="124" width="10" height="12" rx="2" fill="url(#${ux}-metal)"/>
    ${look.chrono ? `<rect x="164" y="104" width="10" height="9" rx="2" transform="rotate(-20 169 108)" fill="url(#${ux}-metal)"/><rect x="164" y="147" width="10" height="9" rx="2" transform="rotate(20 169 151)" fill="url(#${ux}-metal)"/>` : ''}
    <circle cx="100" cy="130" r="70" fill="url(#${ux}-metal)"/>
    <circle cx="100" cy="130" r="70" fill="none" stroke="rgba(0,0,0,.3)" stroke-width="1"/>
  </g>

  <!-- lunette -->
  ${bezel(look, ux)}

  <!-- cadran -->
  <circle cx="100" cy="130" r="56" fill="url(#${ux}-dial)"/>
  ${look.soleil ? `<circle cx="100" cy="130" r="56" fill="url(#${ux}-sun)"/>` : ''}
  <circle cx="100" cy="130" r="56" fill="none" stroke="rgba(0,0,0,.35)" stroke-width="1"/>
  ${indices(look, ux)}
  ${subdials(look)}
  ${look.date && !look.chrono ? `<rect x="138" y="125" width="12" height="10" rx="1.5" fill="#fff" stroke="rgba(0,0,0,.4)" stroke-width=".6"/><text x="144" y="133" text-anchor="middle" font-family="Arial, sans-serif" font-size="7.5" font-weight="700" fill="#111">${live ? new Date().getDate() : 14}</text>` : ''}
  <text x="100" y="${look.chrono ? 110 : 112}" text-anchor="middle" font-family="Georgia, serif" font-style="italic" font-size="6.5" fill="${look.aiguilles}" opacity=".9">La Roux du Temps</text>
  ${look.gmt ? `<text x="100" y="158" text-anchor="middle" font-family="Arial, sans-serif" font-size="5" fill="${look.aiguilles}" opacity=".8">GMT · AUTOMATIQUE</text>` : look.plongee ? `<text x="100" y="158" text-anchor="middle" font-family="Arial, sans-serif" font-size="5" fill="${look.aiguilles}" opacity=".8">300 m · AUTOMATIQUE</text>` : look.chrono ? '' : `<text x="100" y="158" text-anchor="middle" font-family="Arial, sans-serif" font-size="5" fill="${look.aiguilles}" opacity=".8">LYON · FRANCE</text>`}

  <!-- aiguilles -->
  ${hands(look, ux, live)}

  <!-- verre -->
  <ellipse cx="82" cy="104" rx="34" ry="22" fill="url(#${ux}-glass)" transform="rotate(-30 82 104)"/>
</svg>`;
  }

  window.watchSVG = watchSVG;
})();
