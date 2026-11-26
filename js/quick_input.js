// Copyright (c) 2026 Jean-Philippe Alexander. Mon Carnet de Salle.
// SPDX-License-Identifier: PolyForm-Strict-1.0.0 (voir LICENSE et NOTICE)
// Saisie rapide, volet (1.8.92, co-auteur : Claude) : sur téléphone, un appui sur un champ de série de Séance ouvre ce volet
// au lieu du clavier. Barre, barre courte, machine chargée de disques, haltères, machine et poulie, poids du corps, répétitions,
// durée et cardio. « Remplir la série » remplit la ligne sans la cocher et recopie la charge sur les séries suivantes non cochées.
// Calculs dans js/quick_logic.js ; dessins repris de la maquette (planches 40 à 40j) ; spec : SPEC_SAISIE_RAPIDE.md du projet.
const QuickInput = (() => {
  const Q = QuickLogic;
  const ROWS = {"bar": [["0 0 132 40", "<rect x=\"42\" y=\"17.5\" width=\"54\" height=\"5\" fill=\"url(#qs-chr)\"></rect><rect x=\"48\" y=\"17.5\" width=\"42\" height=\"5\" fill=\"url(#qs-knurl)\"></rect><rect x=\"96\" y=\"12\" width=\"5\" height=\"16\" rx=\"1\" fill=\"url(#qs-chr)\"></rect><rect x=\"101\" y=\"13\" width=\"31\" height=\"14\" rx=\"2\" fill=\"url(#qs-chr)\"></rect>"], ["0 0 132 40", "<rect x=\"30\" y=\"17.5\" width=\"66\" height=\"5\" fill=\"url(#qs-chr)\"></rect><rect x=\"36\" y=\"17.5\" width=\"54\" height=\"5\" fill=\"url(#qs-knurl)\"></rect><rect x=\"96\" y=\"12\" width=\"5\" height=\"16\" rx=\"1\" fill=\"url(#qs-chr)\"></rect><rect x=\"101\" y=\"13\" width=\"31\" height=\"14\" rx=\"2\" fill=\"url(#qs-chr)\"></rect>"], ["0 0 132 40", "<rect x=\"18\" y=\"16.0\" width=\"78\" height=\"8\" fill=\"url(#qs-chr)\"></rect><rect x=\"24\" y=\"16.0\" width=\"66\" height=\"8\" fill=\"url(#qs-knurl)\"></rect><rect x=\"96\" y=\"12\" width=\"5\" height=\"16\" rx=\"1\" fill=\"url(#qs-chr)\"></rect><rect x=\"101\" y=\"13\" width=\"31\" height=\"14\" rx=\"2\" fill=\"url(#qs-chr)\"></rect>"], ["0 0 132 40", "<rect x=\"18\" y=\"14.5\" width=\"78\" height=\"11\" fill=\"url(#qs-chr)\"></rect><rect x=\"24\" y=\"14.5\" width=\"66\" height=\"11\" fill=\"url(#qs-knurl)\"></rect><rect x=\"96\" y=\"12\" width=\"5\" height=\"16\" rx=\"1\" fill=\"url(#qs-chr)\"></rect><rect x=\"101\" y=\"13\" width=\"31\" height=\"14\" rx=\"2\" fill=\"url(#qs-chr)\"></rect>"]], "short": [["0 0 132 46", "<rect x=\"26.0\" y=\"13\" width=\"80.0\" height=\"4\" fill=\"url(#qs-chr)\"></rect><rect x=\"40.0\" y=\"13\" width=\"52.0\" height=\"4\" fill=\"url(#qs-knurl)\"></rect><rect x=\"6.0\" y=\"11.5\" width=\"17\" height=\"7\" rx=\"1.5\" fill=\"url(#qs-chr)\"></rect><rect x=\"23.0\" y=\"9.5\" width=\"3\" height=\"11\" rx=\"1\" fill=\"url(#qs-chr)\"></rect><rect x=\"109.0\" y=\"11.5\" width=\"17\" height=\"7\" rx=\"1.5\" fill=\"url(#qs-chr)\"></rect><rect x=\"106.0\" y=\"9.5\" width=\"3\" height=\"11\" rx=\"1\" fill=\"url(#qs-chr)\"></rect><path d=\"M6.0 27 V39 M126.0 27 V39 M6.0 33 H45.0 M87.0 33 H126.0\" class=\"qs-cote\" stroke-width=\"1\" fill=\"none\"></path><path d=\"M6.0 33 l4 -2.5 v5 z M126.0 33 l-4 -2.5 v5 z\" class=\"qs-cote-f\"></path><text x=\"66.0\" y=\"37.5\" text-anchor=\"middle\" font-family=\"Figtree, sans-serif\" font-size=\"13\" font-weight=\"600\" class=\"qs-cote-f\">120 cm</text>"], ["0 0 132 46", "<path d=\"M26.0 15 L40.4 15 L46.8 10 L54.8 20 L61.2 15 L70.8 15 L77.2 20 L85.2 10 L91.6 15 L106.0 15\" fill=\"none\" stroke=\"#5C5C66\" stroke-width=\"4.6\" stroke-linejoin=\"round\"></path><path d=\"M26.0 15 L40.4 15 L46.8 10 L54.8 20 L61.2 15 L70.8 15 L77.2 20 L85.2 10 L91.6 15 L106.0 15\" fill=\"none\" stroke=\"#C9C9CF\" stroke-width=\"2.6\" stroke-linejoin=\"round\"></path><path d=\"M26.0 15 L40.4 15 L46.8 10 L54.8 20 L61.2 15 L70.8 15 L77.2 20 L85.2 10 L91.6 15 L106.0 15\" fill=\"none\" stroke=\"#FFFFFF\" stroke-width=\"0.8\" stroke-linejoin=\"round\" transform=\"translate(0 -0.8)\" opacity=\"0.8\"></path><rect x=\"6.0\" y=\"11.5\" width=\"17\" height=\"7\" rx=\"1.5\" fill=\"url(#qs-chr)\"></rect><rect x=\"23.0\" y=\"9.5\" width=\"3\" height=\"11\" rx=\"1\" fill=\"url(#qs-chr)\"></rect><rect x=\"109.0\" y=\"11.5\" width=\"17\" height=\"7\" rx=\"1.5\" fill=\"url(#qs-chr)\"></rect><rect x=\"106.0\" y=\"9.5\" width=\"3\" height=\"11\" rx=\"1\" fill=\"url(#qs-chr)\"></rect><path d=\"M6.0 27 V39 M126.0 27 V39 M6.0 33 H45.0 M87.0 33 H126.0\" class=\"qs-cote\" stroke-width=\"1\" fill=\"none\"></path><path d=\"M6.0 33 l4 -2.5 v5 z M126.0 33 l-4 -2.5 v5 z\" class=\"qs-cote-f\"></path><text x=\"66.0\" y=\"37.5\" text-anchor=\"middle\" font-family=\"Figtree, sans-serif\" font-size=\"13\" font-weight=\"600\" class=\"qs-cote-f\">120 cm</text>"], ["0 0 132 46", "<path d=\"M26.0 15 L40.4 15 L46.8 10 L54.8 20 L61.2 15 L70.8 15 L77.2 20 L85.2 10 L91.6 15 L106.0 15\" fill=\"none\" stroke=\"#5C5C66\" stroke-width=\"4.6\" stroke-linejoin=\"round\"></path><path d=\"M26.0 15 L40.4 15 L46.8 10 L54.8 20 L61.2 15 L70.8 15 L77.2 20 L85.2 10 L91.6 15 L106.0 15\" fill=\"none\" stroke=\"#C9C9CF\" stroke-width=\"2.6\" stroke-linejoin=\"round\"></path><path d=\"M26.0 15 L40.4 15 L46.8 10 L54.8 20 L61.2 15 L70.8 15 L77.2 20 L85.2 10 L91.6 15 L106.0 15\" fill=\"none\" stroke=\"#FFFFFF\" stroke-width=\"0.8\" stroke-linejoin=\"round\" transform=\"translate(0 -0.8)\" opacity=\"0.8\"></path><rect x=\"6.0\" y=\"9.0\" width=\"17\" height=\"12\" rx=\"1.5\" fill=\"url(#qs-chr)\"></rect><rect x=\"23.0\" y=\"7.0\" width=\"3\" height=\"16\" rx=\"1\" fill=\"url(#qs-chr)\"></rect><rect x=\"109.0\" y=\"9.0\" width=\"17\" height=\"12\" rx=\"1.5\" fill=\"url(#qs-chr)\"></rect><rect x=\"106.0\" y=\"7.0\" width=\"3\" height=\"16\" rx=\"1\" fill=\"url(#qs-chr)\"></rect><path d=\"M6.0 27 V39 M126.0 27 V39 M6.0 33 H45.0 M87.0 33 H126.0\" class=\"qs-cote\" stroke-width=\"1\" fill=\"none\"></path><path d=\"M6.0 33 l4 -2.5 v5 z M126.0 33 l-4 -2.5 v5 z\" class=\"qs-cote-f\"></path><text x=\"66.0\" y=\"37.5\" text-anchor=\"middle\" font-family=\"Figtree, sans-serif\" font-size=\"13\" font-weight=\"600\" class=\"qs-cote-f\">120 cm</text>"], ["0 0 132 46", "<rect x=\"43.0\" y=\"6\" width=\"46.0\" height=\"18\" rx=\"3\" fill=\"none\" stroke=\"#5C5C66\" stroke-width=\"3.6\"></rect><rect x=\"43.0\" y=\"6\" width=\"46.0\" height=\"18\" rx=\"3\" fill=\"none\" stroke=\"#C9C9CF\" stroke-width=\"1.8\"></rect><rect x=\"57.56\" y=\"6\" width=\"4\" height=\"18\" fill=\"url(#qs-chr)\"></rect><rect x=\"57.56\" y=\"9\" width=\"4\" height=\"12\" fill=\"url(#qs-knurl)\"></rect><rect x=\"70.44\" y=\"6\" width=\"4\" height=\"18\" fill=\"url(#qs-chr)\"></rect><rect x=\"70.44\" y=\"9\" width=\"4\" height=\"12\" fill=\"url(#qs-knurl)\"></rect><rect x=\"23.0\" y=\"11.5\" width=\"17\" height=\"7\" rx=\"1.5\" fill=\"url(#qs-chr)\"></rect><rect x=\"40.0\" y=\"9.5\" width=\"3\" height=\"11\" rx=\"1\" fill=\"url(#qs-chr)\"></rect><rect x=\"92.0\" y=\"11.5\" width=\"17\" height=\"7\" rx=\"1.5\" fill=\"url(#qs-chr)\"></rect><rect x=\"89.0\" y=\"9.5\" width=\"3\" height=\"11\" rx=\"1\" fill=\"url(#qs-chr)\"></rect><path d=\"M23.0 27 V39 M109.0 27 V39 M23.0 33 H45.0 M87.0 33 H109.0\" class=\"qs-cote\" stroke-width=\"1\" fill=\"none\"></path><path d=\"M23.0 33 l4 -2.5 v5 z M109.0 33 l-4 -2.5 v5 z\" class=\"qs-cote-f\"></path><text x=\"66.0\" y=\"37.5\" text-anchor=\"middle\" font-family=\"Figtree, sans-serif\" font-size=\"13\" font-weight=\"600\" class=\"qs-cote-f\">86 cm</text>"]]};
  let st = null;                       // état du volet ouvert
  const $ = id => document.getElementById(id);
  const fr = v => Q.fmtKg(v);
  const touch = () => typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;

  // ── Dessins ───────────────────────────────────────────────────────────────
  const DEFS = `<defs><linearGradient id="qs-chr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6B6B73"/><stop offset="0.18" stop-color="#F7F7F9"/><stop offset="0.32" stop-color="#FFFFFF"/><stop offset="0.55" stop-color="#9A9AA3"/><stop offset="0.78" stop-color="#4A4A52"/><stop offset="0.9" stop-color="#8C8C96"/><stop offset="1" stop-color="#3A3A42"/></linearGradient><linearGradient id="qs-brass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7A5A1E"/><stop offset="0.25" stop-color="#F2D58A"/><stop offset="0.6" stop-color="#B8862E"/><stop offset="1" stop-color="#5E4314"/></linearGradient><pattern id="qs-knurl" width="3" height="3" patternUnits="userSpaceOnUse"><path d="M0 0l3 3M3 0L0 3" stroke="#3A3A42" stroke-width="0.5" opacity="0.8"/></pattern><linearGradient id="qs-cyl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0.45"/><stop offset="0.12" stop-color="#fff" stop-opacity="0.28"/><stop offset="0.3" stop-color="#fff" stop-opacity="0.08"/><stop offset="0.7" stop-color="#000" stop-opacity="0.08"/><stop offset="0.92" stop-color="#000" stop-opacity="0.4"/><stop offset="1" stop-color="#000" stop-opacity="0.6"/></linearGradient><filter id="qs-blur" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="2.5"/></filter><linearGradient id="qs-frame" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1A1A1F"/><stop offset="0.6" stop-color="#3A3A42"/><stop offset="1" stop-color="#202026"/></linearGradient><linearGradient id="qs-dhx" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity="0.25"/><stop offset="0.3" stop-color="#fff" stop-opacity="0.1"/><stop offset="0.7" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.3"/></linearGradient><radialGradient id="qs-bolt" cx="0.4" cy="0.35" r="0.7"><stop offset="0" stop-color="#FFFFFF"/><stop offset="0.5" stop-color="#A8A8B0"/><stop offset="1" stop-color="#4A4A52"/></radialGradient>`;
  // Disques : couleur, épaisseur et hauteur (barre olympique) ; plus petits sur la barre courte
  const PLATE = { 25: ['#C62B35', 17, 104], 20: ['#1B6FD8', 15, 104], 15: ['#E0A800', 13, 104], 10: ['#2E8B5E', 11, 104], 5: ['#E9E9EC', 9, 70], 2.5: ['#2E2E35', 7, 54], 1: ['#B9B9C1', 5, 40] };
  const hex2 = n => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const shade = (h, f) => '#' + rgb(h).map(c => hex2(c * f)).join('');
  const tint = (h, f) => '#' + rgb(h).map(c => hex2(c + (255 - c) * f)).join('');
  function plateGrad(kg) {
    const c = PLATE[kg][0];
    return `<linearGradient id="qs-pg${String(kg).replace('.', '_')}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${shade(c, 0.55)}"/><stop offset="0.25" stop-color="${tint(c, 0.25)}"/><stop offset="0.5" stop-color="${c}"/><stop offset="0.85" stop-color="${shade(c, 0.7)}"/><stop offset="1" stop-color="${shade(c, 0.45)}"/></linearGradient>`;
  }
  function plateSvg(kg, x, w, h, i) {
    const y = 59.5 - h / 2, id = `qs-pg${String(kg).replace('.', '_')}`;
    let s = `<g class="qs-plate" data-act="plate-at" data-i="${i}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2.5" fill="url(#${id})"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2.5" fill="url(#qs-cyl)"/>`;
    if (h >= 60) s += `<rect x="${x + 0.5}" y="${y + 1}" width="${w - 1}" height="5" rx="2" fill="#fff" opacity="0.12"/><rect x="${x + 0.5}" y="${y + h - 6}" width="${w - 1}" height="5" rx="2" fill="#000" opacity="0.18"/><rect x="${x + w * 0.3}" y="${y + 18}" width="${w * 0.18}" height="${h - 36}" rx="1" fill="#fff" opacity="0.14"/>`;
    return s + `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2.5" fill="none" stroke="#000" stroke-opacity="0.35" stroke-width="0.8"/></g>`;
  }
  // Disques posés, du plus lourd au plus léger ; resserrés s'ils dépassent le manchon
  function platesSvg(plates, x0, room, small) {
    const sorted = Q.sortedPlates(plates);
    const dims = sorted.map(p => { const [, w, h] = PLATE[p]; return small ? [w - 1, Math.round(h * 0.8)] : [w, h]; });
    const total = dims.reduce((s, d) => s + d[0] + 0.8, 0);
    const k = total > room ? room / total : 1;
    let x = x0, out = '';
    sorted.forEach((p, i) => { const w = dims[i][0] * k; out += plateSvg(p, Math.round(x * 10) / 10, Math.round(w * 10) / 10, dims[i][1], i); x += w + 0.8 * k; });
    return { svg: out, end: x };
  }
  const grads = plates => [...new Set(plates)].map(plateGrad).join('');
  const SPRING = '<path d="M70.4 49.5 L70.4 69.5" stroke="#1E1E23" stroke-width="1.6" stroke-linecap="round"/><path d="M73.0 49.5 L73.0 69.5" stroke="#1E1E23" stroke-width="1.6" stroke-linecap="round"/><path d="M75.6 49.5 L75.6 69.5" stroke="#1E1E23" stroke-width="1.6" stroke-linecap="round"/><path d="M78.2 49.5 L78.2 69.5" stroke="#1E1E23" stroke-width="1.6" stroke-linecap="round"/><path d="M80.8 49.5 L80.8 69.5" stroke="#1E1E23" stroke-width="1.6" stroke-linecap="round"/><path d="M83.4 49.5 L83.4 69.5" stroke="#1E1E23" stroke-width="1.6" stroke-linecap="round"/>'
    + [69.1, 71.7, 74.3, 76.9, 79.5, 82.1].map(x => `<path d="M${x} 69.5 Q${(x - 1.2).toFixed(1)} 59.5 ${x} 49.5" fill="none" stroke="#2A2A30" stroke-width="2.4" stroke-linecap="round"/><path d="M${(x - 0.5).toFixed(1)} 66.5 Q${(x - 1.4).toFixed(1)} 59.5 ${(x - 0.5).toFixed(1)} 52.5" fill="none" stroke="#9A9AA3" stroke-width="0.7" stroke-linecap="round" opacity="0.9"/>`).join('')
    + '<path d="M69.1 49.5 L83.6 30.5 M82.1 49.5 L67.6 30.5" stroke="#2A2A30" stroke-width="2.2" stroke-linecap="round"/><path d="M69.1 49.5 L83.6 30.5 M82.1 49.5 L67.6 30.5" stroke="#9A9AA3" stroke-width="0.6" stroke-linecap="round" opacity="0.8" transform="translate(-0.5 0)"/><rect x="80.6" y="20.5" width="6" height="12" rx="3" fill="#C62B35" transform="rotate(37.3 83.6 30.5)"/><rect x="81.6" y="22.0" width="1.6" height="8" rx="0.8" fill="#FFFFFF" opacity="0.35" transform="rotate(37.3 83.6 30.5)"/><rect x="64.6" y="20.5" width="6" height="12" rx="3" fill="#C62B35" transform="rotate(-37.3 67.6 30.5)"/><rect x="65.6" y="22.0" width="1.6" height="8" rx="0.8" fill="#FFFFFF" opacity="0.35" transform="rotate(-37.3 67.6 30.5)"/>';

  function loadSvg() {
    const { mode, plates } = st;
    let body;
    if (mode === 'barbell') {
      const grooves = Array.from({ length: 14 }, (_, i) => `<rect x="${134 + i * 3}" y="50" width="0.8" height="19" fill="#3A3A42" opacity="0.35"/>`).join('');
      const p = platesSvg(plates, 60, 113, false);
      body = `<ellipse cx="100" cy="114" rx="80" ry="3.5" fill="#000" opacity="0.18" filter="url(#qs-blur)"/><rect x="-96" y="55" width="136" height="9" fill="url(#qs-chr)"/><rect x="-96" y="55" width="134" height="9" fill="url(#qs-knurl)"/><rect x="40" y="51" width="6" height="17" rx="1" fill="url(#qs-chr)"/><rect x="46" y="47" width="4" height="25" rx="1" fill="url(#qs-brass)"/><rect x="50" y="45" width="7" height="29" rx="1.5" fill="url(#qs-chr)"/><rect x="57" y="50" width="118" height="19" rx="2.5" fill="url(#qs-chr)"/>${grooves}<rect x="173" y="51.5" width="7" height="16" rx="3" fill="url(#qs-chr)"/>${p.svg}`;
    } else if (mode === 'shortbar') {
      const ez = st.bar === 'ez' || st.bar === 'ez_olympique';
      const d = ez ? 'M-96 59.5 L-4 59.5 L6 52.5 L18 66.5 L28 59.5 L42 59.5' : 'M-96 59.5 L42 59.5';
      const p = platesSvg(plates, 50, 66, true);
      const clamp = plates.length ? `<g transform="translate(${(p.end - 43.77).toFixed(2)} 19.83) scale(0.6667)">${SPRING}</g>` : '';
      body = `<ellipse cx="80" cy="108" rx="60" ry="3.2" fill="#000" opacity="0.18" filter="url(#qs-blur)"/><path d="${d}" fill="none" stroke="#4A4A52" stroke-width="9" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="#B9B9C1" stroke-width="6.5" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="#FFFFFF" stroke-width="1.6" stroke-linejoin="round" opacity="0.85" transform="translate(0 -1.6)"/><rect x="-96" y="55" width="88" height="9" fill="url(#qs-knurl)" opacity="0.8"/><rect x="40" y="48.5" width="7" height="22" rx="1.5" fill="url(#qs-chr)"/><rect x="47" y="53" width="74" height="13" rx="2" fill="url(#qs-chr)"/><rect x="119" y="54.5" width="6" height="10" rx="2.5" fill="url(#qs-chr)"/>${p.svg}${clamp}`;
    } else {
      const p = platesSvg(plates, 61, 134, false);
      body = `<ellipse cx="40" cy="114" rx="110" ry="3.5" fill="#000" opacity="0.18" filter="url(#qs-blur)"/><rect x="-96" y="8" width="143" height="104" rx="4" fill="url(#qs-frame)"/><rect x="-96" y="8" width="143" height="104" rx="4" fill="url(#qs-cyl)" opacity="0.5"/><circle cx="33" cy="20" r="2.6" fill="#8C8C96"/><circle cx="33" cy="100" r="2.6" fill="#8C8C96"/><rect x="47" y="47" width="10" height="25" rx="2" fill="url(#qs-chr)"/><rect x="57" y="50" width="140" height="19" rx="2.5" fill="url(#qs-chr)"/><rect x="195" y="51.5" width="7" height="16" rx="3" fill="url(#qs-chr)"/>${p.svg}`;
    }
    const dim = st.override != null && st.override < st.base ? ' style="opacity:0.55"' : '';
    return `<svg class="qs-load-svg" viewBox="-96 0 300 120" width="274" height="109" aria-hidden="true"${dim}>${DEFS}${grads(plates)}</defs>${body}</svg>`;
  }

  function dumbbellSvg(kg) {
    const c = Q.dumbbellColorFor(kg).background, h = Math.min(70, Q.dumbbellTierFor(kg)), w = Math.round(h * 132 / 70);   // 84 px ne tient pas entre les ronds −1 / +1
    const dh = `<linearGradient id="qs-dh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${shade(c, 0.5)}"/><stop offset="0.14" stop-color="${tint(c, 0.35)}"/><stop offset="0.24" stop-color="${tint(c, 0.15)}"/><stop offset="0.55" stop-color="${c}"/><stop offset="0.86" stop-color="${shade(c, 0.65)}"/><stop offset="1" stop-color="${shade(c, 0.42)}"/></linearGradient>`;
    const head = x => `<rect x="${x}" y="6" width="28" height="66" rx="9" fill="url(#qs-dh)"/><rect x="${x}" y="6" width="28" height="66" rx="9" fill="url(#qs-dhx)"/><rect x="${x}" y="6" width="28" height="66" rx="9" fill="none" stroke="#000" stroke-opacity="0.35" stroke-width="0.8"/><rect x="${x + 6}" y="9" width="16" height="3" rx="1.5" fill="#fff" opacity="0.22"/>`;
    return `<svg viewBox="0 0 150 80" width="${w}" height="${h}" aria-hidden="true">${DEFS}${dh}</defs><ellipse cx="75" cy="76" rx="66" ry="3" fill="#000" opacity="0.2" filter="url(#qs-blur)"/><rect x="44" y="33" width="62" height="12" rx="2" fill="url(#qs-chr)"/><rect x="50" y="33" width="50" height="12" fill="url(#qs-knurl)"/><rect x="36" y="29" width="8" height="20" rx="2" fill="url(#qs-chr)"/><rect x="106" y="29" width="8" height="20" rx="2" fill="url(#qs-chr)"/>${head(12)}${head(110)}<rect x="5" y="22" width="7" height="34" rx="2.5" fill="url(#qs-chr)"/><circle cx="8.5" cy="39" r="2.6" fill="url(#qs-bolt)" stroke="#2E2E35" stroke-width="0.5"/><rect x="138" y="22" width="7" height="34" rx="2.5" fill="url(#qs-chr)"/><circle cx="141.5" cy="39" r="2.6" fill="url(#qs-bolt)" stroke="#2E2E35" stroke-width="0.5"/></svg>`;
  }

  // ── Icônes et boutons ─────────────────────────────────────────────────────
  const ico = d => `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const I = {
    kb: ico('<rect x="2.5" y="6" width="19" height="12" rx="2.5"/><path d="M6.5 10h.01M10 10h.01M13.5 10h.01M17 10h.01M7.5 14h9"/>'),
    close: ico('<path d="M6 6l12 12M18 6L6 18"/>'), down: ico('<path d="M12 5v14M6 13l6 6 6-6"/>'),
    left: ico('<path d="M15 6l-6 6 6 6"/>'), right: ico('<path d="M9 6l6 6-6 6"/>'),
  };
  const MINUS = '−';
  const sign = v => (v > 0 ? '+' : MINUS);
  const rb = (act, val, label, opts = {}) => `<button type="button" class="qs-rb${opts.sm ? ' sm' : ''}" data-act="${act}" data-v="${val}"${opts.dis ? ' disabled' : ''}${opts.aria ? ` aria-label="${opts.aria}"` : ''}${opts.style ? ` style="${opts.style}"` : ''}>${label}</button>`;
  const head = (label, num, unit) => `<div class="qs-zh"><span class="qs-lbl">${label}</span><span class="qs-w"><span class="qs-num">${num}</span>${unit ? `<span class="qs-unit">${unit}</span>` : ''}</span></div>`;
  const repsCol = () => `<div class="qs-zone c">${head('Réps', st.reps)}<div class="qs-col">${[5, 1, -1, -5].map(d => rb('reps', d, sign(d) + Math.abs(d), { dis: d < 0 && st.reps <= 0 })).join('')}</div></div>`;
  const zones = (left, right) => `<div class="qs-zones${right ? '' : ' one'}">${left}${right ? `<span class="qs-sep" aria-hidden="true"></span>${right}` : ''}</div>`;

  // ── Valeurs ───────────────────────────────────────────────────────────────
  const loadTotal = () => (st.override != null ? st.override : Q.totalFromBarPlates(st.base, st.plates, st.sides));
  function chargeText() {
    switch (st.mode) {
      case 'barbell': case 'shortbar': case 'platemachine': return [fr(loadTotal()), 'kg'];
      case 'dumbbell': return [fr(Q.toSetWeightValue(st.unit, st.mult)), 'kg'];
      case 'machine': return [fr(st.weight), 'kg'];
      case 'bw': return st.lest === 0 ? ['PDC', ''] : [`PDC ${st.lest > 0 ? '+' : MINUS} ${fr(Math.abs(st.lest))}`, 'kg'];
      default: return ['', ''];
    }
  }

  // ── Rendu ─────────────────────────────────────────────────────────────────
  function render() {
    const sheet = $('quick-sheet');
    const name = st.exName;
    let main;
    const [num, unit] = chargeText();
    const label = st.mode === 'bw' ? 'Lest' : 'Charge';
    if (st.chooser) main = zones(`<div class="qs-zone">${head(label, num, unit)}${chooserHtml()}</div>`, repsCol());
    else if (['barbell', 'shortbar', 'platemachine'].includes(st.mode)) main = zones(`<div class="qs-zone">${head(label, num, unit)}${loadHtml()}</div>`, repsCol());
    else if (st.mode === 'dumbbell') main = zones(`<div class="qs-zone">${head(label, num, unit)}${dumbbellHtml()}</div>`, repsCol());
    else if (st.mode === 'machine') main = zones(`<div class="qs-zone c">${head(label, num, unit)}<div class="qs-g2">${[-10, 10, -5, 5, -2.5, 2.5, -1, 1].map(d => rb('w', d, sign(d) + fr(Math.abs(d)), { dis: d < 0 && st.weight <= 0 })).join('')}</div></div>`, repsCol());
    else if (st.mode === 'bw') main = zones(`<div class="qs-zone c">${head(label, num, unit)}<div class="qs-g2">${[-5, 5, -2.5, 2.5, -1, 1].map(d => rb('lest', d, sign(d) + fr(Math.abs(d)))).join('')}</div><button type="button" class="qs-pdc${st.lest === 0 ? ' on' : ''}" data-act="pdc">POIDS DU CORPS<br>SEUL</button></div>`, repsCol());
    else if (st.mode === 'reps') main = zones(`<div class="qs-zone c">${head('Réps', st.reps)}<div class="qs-row4">${[-5, -1, 1, 5].map(d => rb('reps', d, sign(d) + Math.abs(d), { dis: d < 0 && st.reps <= 0 })).join('')}</div></div>`);
    else if (st.mode === 'time') main = zones(`<div class="qs-zone c">${head('Durée', formatDurationMS(st.sec))}<div class="qs-g2">${[-30, 30, -15, 15, -5, 5].map(d => rb('sec', d, `${sign(d)}${Math.abs(d)} s`, { dis: d < 0 && st.sec <= 0 })).join('')}</div></div>`);
    else main = zones(cardioDur(), cardioDist());
    sheet.innerHTML = `<div class="qs-head"><span class="ex-icon-badge">${getIcon(name, true)}</span><b class="qs-name">${escapeHtml(name)}</b></div>${main}
      <div class="qs-act">${rb('kb', 0, I.kb, { aria: 'Passer au clavier' })}<button type="button" class="btn qs-fill" data-act="fill">Remplir la série</button>${rb('close', 0, I.close, { aria: 'Fermer' })}</div>`;
    sheet.setAttribute('aria-label', `Saisie rapide : ${name}`);
  }
  function loadHtml() {
    const machine = st.mode === 'platemachine';
    const lever = machine
      ? `<label class="qs-empty"><input type="text" inputmode="decimal" placeholder="À vide" aria-label="Poids de la machine à vide, en kg" value="${st.empty != null ? fr(st.empty) : ''}"><span>kg</span></label>`
      : `<button type="button" class="qs-bar-btn" data-act="chooser" aria-label="Poids de la barre : ${fr(st.base)} kg">${fr(st.base)} kg</button>`;
    const rack = Q.rackFor(st.mode).map(p => rb('plate', p, fr(p), { style: `box-shadow:inset 0 0 0 3px ${PLATE[p][0]}`, dis: st.plates.length >= Q.MAX_PLATES })).join('');
    const hint = st.sides === 2 ? 'Ajouter un disque de chaque côté' : 'Ajouter un disque';
    return `<div class="qs-col"><div class="qs-load">${loadSvg()}${lever}</div><div class="qs-lbl">${hint}</div><div class="qs-g4">${rack}${rb('unplate', 0, I.down, { aria: 'Retirer le dernier disque', dis: !st.plates.length })}</div></div>`;
  }
  function chooserHtml() {
    const short = st.mode === 'shortbar';
    const list = short ? Q.SHORT_BARS : Q.BAR_WEIGHTS;
    const names = { droite: 'Droite', ez: 'EZ', ez_olympique: 'EZ olympique', triceps: 'Triceps' };
    const rows = list.map((b, i) => {
      const [vb, svg] = ROWS[short ? 'short' : 'bar'][i];
      const on = short ? st.bar === b.id : st.bar === b.kg;
      const sub = short ? names[b.id] : `Ø ${b.mm} mm`;
      const hgt = vb.split(' ')[3];
      return `<button type="button" class="qs-choice${short ? ' tall' : ''}${on ? ' on' : ''}" data-act="pick-bar" data-v="${short ? b.id : b.kg}" aria-pressed="${on}"><span class="qs-choice-t"><span class="qs-choice-kg">${fr(b.kg)} kg</span><span class="qs-choice-sub">${sub}</span></span><svg viewBox="${vb}" width="132" height="${hgt}" aria-hidden="true">${DEFS}</defs>${svg}</svg></button>`;
    }).join('');
    return `<div class="qs-col qs-choices"><div class="qs-lbl">Poids de la barre</div>${rows}</div>`;
  }
  function dumbbellHtml() {
    const u = st.unit, rack = Q.buildDumbbellRack(st.rackStart);
    const keys = rack.map(kg => { const c = Q.dumbbellColorFor(kg); return rb('db-set', kg, kg, { style: `background:${c.background};color:${c.text}${kg === u ? ';box-shadow:0 0 0 3px var(--card-bg),0 0 0 5px var(--text)' : ''}` }); }).join('');
    return `<div class="qs-col"><div class="qs-db">${rb('db', -1, MINUS + '1', { aria: 'Moins 1 kg', dis: u <= 0 })}<div class="qs-db-pic">${dumbbellSvg(Math.max(u, 2))}${st.mult === 2 ? '<span class="qs-x2">× 2</span>' : ''}</div>${rb('db', 1, '+1', { aria: 'Plus 1 kg', dis: u >= Q.DUMBBELL_MAX_KG })}</div>
      <div class="qs-lbl">Poids d'un haltère</div><div class="qs-rack">${rb('rack', -1, I.left, { aria: 'Plus léger', dis: st.rackStart <= 2 })}<div class="qs-g2">${keys}</div>${rb('rack', 1, I.right, { aria: 'Plus lourd', dis: st.rackStart >= Q.DUMBBELL_MAX_KG - 6 })}</div></div>`;
  }
  function cardioDur() {
    return `<div class="qs-zone c">${head('Durée', formatDurationMS(st.sec))}<div class="qs-g2">${[-300, 300, -60, 60, -30, 30].map(d => rb('sec', d, `${sign(d)}${Math.abs(d) >= 60 ? Math.abs(d) / 60 + ' min' : Math.abs(d) + ' s'}`, { sm: true, dis: d < 0 && st.sec <= 0 })).join('')}</div></div>`;
  }
  function cardioDist() {
    const p = st.profile, floors = p.kind === 'floors';
    const lab = (s, i) => (floors ? String(s) : p.labels[i]);
    const keys = [];
    p.steps.forEach((s, i) => { keys.push(rb('dist', -s, MINUS + lab(s, i), { sm: true, dis: st.dist <= 0 })); keys.push(rb('dist', s, '+' + lab(s, i), { sm: true })); });
    // rameur et ski trainer : distance en mètres, comme le champ de la série ; tapis et vélos : en km
    const num = floors ? String(st.dist) : st.km ? Math.round(st.dist * 1000).toLocaleString('fr-FR') : fr(st.dist);
    return `<div class="qs-zone c">${head(floors ? 'Étages' : 'Distance', num, floors ? '' : st.km ? 'm' : 'km')}<div class="qs-g2">${keys.join('')}</div></div>`;
  }

  // ── Ouverture ─────────────────────────────────────────────────────────────
  function ensureDom() {
    if ($('quick-overlay')) return;
    const ov = document.createElement('div');
    ov.id = 'quick-overlay'; ov.className = 'sheet-overlay';
    ov.innerHTML = '<div id="quick-sheet" class="sheet qs" role="dialog" aria-modal="true"></div>';
    document.body.appendChild(ov);
    ov.addEventListener('click', e => { if (e.target === ov) close(); });
    ov.querySelector('#quick-sheet').addEventListener('click', onClick);
    ov.querySelector('#quick-sheet').addEventListener('input', onEmptyInput);
  }
  function open(input) {
    const row = input.closest('.set-row'), item = input.closest('.exercise-item');
    if (!row || !item) return;
    ensureDom();
    const exName = item.dataset.ex || input.dataset.ex;
    const info = exInfo(exName), mode = Q.quickMode(exName, info);
    const wIn = row.querySelector('.weight-input'), rIn = row.querySelector('.reps-input');
    const num = v => Q.parseQuickNum(v);
    st = { row, item, exName, info, mode, chooser: false, reps: Math.max(0, Math.round(num(rIn && rIn.value) || 0)) };
    const w = Math.max(0, num(wIn && wIn.value) || 0);
    if (mode === 'barbell' || mode === 'shortbar' || mode === 'platemachine') {
      st.sides = mode === 'platemachine' ? Q.plateMachineSides(exName) : 2;
      if (mode === 'platemachine') { st.empty = Q.machineEmptyFor(localStorage, exName); st.base = st.empty || 0; }
      else { st.bar = Q.barWeightFor(localStorage, exName); st.base = Q.baseWeightFor(localStorage, exName, mode); }
      const d = w > 0 ? Q.computeBarbellLoad(w, st.base, Q.rackFor(mode), st.sides) : { plates: [], rest: 0 };
      st.plates = d.plates;
      st.override = w > 0 && (d.belowBar || Math.abs(d.rest) > 0.001) ? w : null;
    } else if (mode === 'dumbbell') {
      st.mult = Q.weightMultiplierFor(exName);
      st.unit = Math.min(Q.DUMBBELL_MAX_KG, w);                       // la série garde le poids d'un haltère
      st.rackStart = Q.computeDumbbellRackStart(st.unit, (state && state.lastWeights || {})[exName]);
    } else if (mode === 'machine') st.weight = w;
    else if (mode === 'bw') { const l = parseLest(wIn.value); st.lest = Number.isFinite(l) ? l : 0; }
    else if (mode === 'time') st.sec = Math.max(0, parseDurationInput(wIn.value) || 0);
    else if (mode === 'cardio') {
      st.sec = Math.max(0, parseDurationInput(wIn.value) || 0);
      st.profile = Q.cardioDistanceProfile(exName, info);
      const a = num(rIn.value) || 0;
      st.km = info.mode !== 'floors' && !distanceInKm(exName);       // champ en mètres : volet en km
      st.dist = st.km ? Math.round(a) / 1000 : a;
    }
    render();
    $('quick-overlay').classList.add('open');
    document.body.classList.add('qs-open');
  }
  function close() {
    const ov = $('quick-overlay');
    if (ov) ov.classList.remove('open');
    document.body.classList.remove('qs-open');
    st = null;
  }

  // ── Actions ───────────────────────────────────────────────────────────────
  function onEmptyInput(e) {
    if (!st || !e.target.closest('.qs-empty')) return;
    const n = Q.parseQuickNum(e.target.value);
    Q.rememberMachineEmpty(localStorage, st.exName, e.target.value);
    st.empty = n != null && n >= 0 ? n : null; st.base = st.empty || 0; st.override = null;
    $('quick-sheet').querySelector('.qs-num').textContent = fr(loadTotal());
  }
  function onClick(e) {
    const b = e.target.closest('[data-act]');
    if (!b || !st || b.disabled) return;
    const act = b.dataset.act, v = b.dataset.v;
    const n = parseFloat(v);
    const plateTouch = () => { st.override = null; };
    switch (act) {
      case 'reps': st.reps = Q.step(st.reps, n, 'reps'); break;
      case 'w': st.weight = Q.step(st.weight, n, 'weight'); break;
      case 'lest': st.lest = Q.step(st.lest, n, 'bw'); break;
      case 'pdc': st.lest = 0; break;
      case 'sec': st.sec = Q.step(st.sec, n, 'time'); break;
      case 'dist': st.dist = Math.max(0, Math.round((st.dist + n) * 1000) / 1000); break;
      case 'plate': plateTouch(); st.plates = Q.addPlate(st.plates, n); break;
      case 'unplate': plateTouch(); st.plates = Q.removeLastPlate(st.plates); break;
      case 'plate-at': {
        plateTouch();
        const kg = Q.sortedPlates(st.plates)[Number(b.dataset.i)], j = st.plates.lastIndexOf(kg);
        if (j >= 0) st.plates = Q.removePlateAt(st.plates, j);
        break;
      }
      case 'chooser': st.chooser = true; break;
      case 'pick-bar': {
        const val = st.mode === 'shortbar' ? v : n;
        Q.rememberBarWeight(localStorage, st.exName, val);
        st.bar = val; st.base = Q.baseWeightFor(localStorage, st.exName, st.mode); st.chooser = false;
        if (st.override != null) { const d = Q.computeBarbellLoad(st.override, st.base, Q.rackFor(st.mode), st.sides); if (!d.belowBar && !(Math.abs(d.rest) > 0.001)) { st.plates = d.plates; st.override = null; } }
        break;
      }
      case 'db': st.unit = Math.min(Q.DUMBBELL_MAX_KG, Math.max(0, st.unit + n)); st.rackStart = Q.computeDumbbellRackStart(st.unit); break;
      case 'db-set': st.unit = n; break;
      case 'rack': st.rackStart = Q.shiftDumbbellRackStart(st.rackStart, n); break;
      case 'kb': return keyboard();
      case 'close': return close();
      case 'fill': return fill();
      default: return;
    }
    render();
  }

  // Remplit la ligne (sans la cocher) et recopie la charge sur les séries suivantes non cochées
  function setVal(input, value) {
    if (!input || input.type === 'hidden' || input.value === value) return;
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }
  function fill() {
    const { row, mode } = st;
    const wIn = row.querySelector('.weight-input'), rIn = row.querySelector('.reps-input');
    let w = null;
    if (mode === 'barbell' || mode === 'shortbar' || mode === 'platemachine') w = String(loadTotal());
    else if (mode === 'dumbbell') w = String(st.unit);
    else if (mode === 'machine') w = String(st.weight);
    else if (mode === 'bw') w = st.lest === 0 ? '' : (st.lest > 0 ? '+' : '-') + Math.abs(st.lest);
    else if (mode === 'time' || mode === 'cardio') w = formatDurationMS(st.sec);
    if (w !== null) setVal(wIn, w);
    if (mode === 'cardio') setVal(rIn, String(st.km ? Math.round(st.dist * 1000) : st.dist).replace('.', ','));
    else if (mode !== 'time') setVal(rIn, String(st.reps));
    if (w !== null && mode !== 'cardio') {
      let next = row.nextElementSibling;
      for (; next; next = next.nextElementSibling) {
        if (!next.classList.contains('set-row') || next.classList.contains('done')) continue;
        setVal(next.querySelector('.weight-input'), w);
      }
    }
    close();
  }
  function keyboard() {
    const input = st.input;
    close();
    if (!input) return;
    input.readOnly = false;
    input.dataset.allowKeyboard = '1';
    input.focus();
    input.addEventListener('blur', () => { delete input.dataset.allowKeyboard; arm(input); }, { once: true });
  }

  // ── Champs de Séance ──────────────────────────────────────────────────────
  function arm(input) {
    if (input.type === 'hidden' || input.dataset.allowKeyboard) return;
    input.readOnly = true;
    input.setAttribute('aria-haspopup', 'dialog');
  }
  function armAll(root) { if (touch()) (root || document).querySelectorAll('#exercises-list .set-input').forEach(arm); }
  function onTap(e) {
    const input = e.target.closest && e.target.closest('#exercises-list .set-input');
    if (!input || !touch() || input.dataset.allowKeyboard || input.type === 'hidden') return;
    e.preventDefault();
    open(input);
    if (st) st.input = input;
  }
  function init() {
    if (typeof document === 'undefined') return;
    document.addEventListener('click', onTap);
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && st) close();
      const input = e.target.closest && e.target.closest('#exercises-list .set-input');
      if (input && input.readOnly && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); open(input); if (st) st.input = input; }
    });
    const list = $('exercises-list');
    if (list) { armAll(); new MutationObserver(() => armAll()).observe(list, { childList: true, subtree: true }); }
  }
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  }
  return { open, close, fill, armAll, state: () => st };
})();
