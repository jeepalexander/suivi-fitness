// ============================================================
// PETIT BONHOMME PIXEL (1.8.97, co-auteur : Claude)
// ============================================================
// Un petit sportif en pixels se promène sur l'accueil Programmes, entre l'accueil manuscrit et « Programme actif ».
// Choix validés (prototypes v1 à v12 du 26 nov. 2026) :
// - une seule couleur, celle du texte (--text), détourée de la couleur du fond (--bg) ; dessin « B · Affiné » ;
// - 13 exercices, jamais deux fois le même de suite ; sieste, corde ou curl pendant un déload ; saut de joie, squat ou
//   soulevé de terre le jour d'un record ;
// - il arrive et repart par une porte, seulement aux bords de l'écran : bloc plein qui apparaît en fondu, s'ouvre en clair ;
// - il fait demi-tour avant le post-it du bilan (la porte n'apparaît alors qu'à gauche) ;
// - absent si le téléphone demande moins d'animations ; interrupteur « Petit bonhomme » dans les Réglages.
// Rien n'est enregistré dans les données exportées : préférences de l'appareil seulement (comme le thème).

const BONHOMME_KEY = 'h49_bonhomme';            // 'off' = masqué ; sinon affiché
const BONHOMME_RECORD_KEY = 'h49_bonhomme_record'; // jour (AAAA-MM-JJ) du dernier record battu

function bonhommeEnabled() {
  try { return localStorage.getItem(BONHOMME_KEY) !== 'off'; } catch (e) { return true; }
}
function bonhommeReducedMotion() {
  return !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
}
function bonhommeToday() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
// Appelé par la fin de séance quand un record est battu
function bonhommeNoteRecord() {
  try { localStorage.setItem(BONHOMME_RECORD_KEY, bonhommeToday()); } catch (e) {}
}
function syncBonhommeChoice() {
  const on = bonhommeEnabled();
  document.querySelectorAll('#bonhomme-choice [data-bh-choice]').forEach(btn => {
    const sel = (btn.dataset.bhChoice === 'on') === on;
    btn.classList.toggle('active', sel);
    btn.setAttribute('aria-checked', sel ? 'true' : 'false');
  });
}
function setBonhommePreference(v) {
  try { localStorage.setItem(BONHOMME_KEY, v === 'off' ? 'off' : 'on'); } catch (e) {}
  syncBonhommeChoice();
  if (typeof renderProgramOverview === 'function') renderProgramOverview();
}

// Zone de promenade : entoure le post-it du bilan (même hauteur), le bonhomme marche sur son bas
function bonhommeZoneHtml(inner) {
  const on = bonhommeEnabled() && !bonhommeReducedMotion();
  return `<div class="bh-zone${on ? ' on' : ''}">${inner || ''}</div>`;
}

// ---------- Poses (grille de 24 × 20, sol à 19, tourné vers la droite) ----------
const BH = (() => {
  const m = (b, o) => Object.assign({}, b, o);
  const sh = (b, dx, dy) => { const q = {}; for (const k in b) q[k] = Array.isArray(b[k]) ? [b[k][0] + dx, b[k][1] + dy] : (k === 'rope' ? b[k] + dy : b[k]); return q; };
  const lerp = (a, b) => { const q = {}; for (const k in a) q[k] = Array.isArray(a[k]) ? [Math.round((a[k][0] + b[k][0]) / 2), Math.round((a[k][1] + b[k][1]) / 2)] : a[k]; return q; };
  const S = { h: [12, 2], n: [12, 4], p: [12, 11], eL: [11, 8], hL: [11, 11], eR: [13, 8], hR: [13, 11], kL: [12, 15], fL: [12, 19], kR: [12, 15], fR: [12, 19] };
  const W1 = m(S, { kL: [11, 15], fL: [9, 19], kR: [13, 15], fR: [15, 19], eL: [13, 8], hL: [15, 10], eR: [11, 8], hR: [9, 10] });
  const W3 = m(S, { kL: [13, 15], fL: [15, 19], kR: [11, 15], fR: [9, 19], eL: [11, 8], hL: [9, 10], eR: [13, 8], hR: [15, 10] });
  const Q = m(S, { h: [14, 7], n: [13, 9], p: [10, 14], kL: [14, 15], fL: [12, 19], kR: [14, 15], fR: [12, 19], eL: [14, 13], hL: [15, 18], eR: [14, 13], hR: [15, 18] });
  const P = { h: [18, 13], n: [16, 15], p: [9, 16], eL: [16, 17], hL: [16, 19], eR: [16, 17], hR: [16, 19], kL: [6, 17], fL: [3, 19], kR: [6, 17], fR: [3, 19], flat: 1 };
  const PL = { h: [18, 15], n: [16, 17], p: [9, 17], eL: [14, 17], hL: [16, 19], eR: [14, 17], hR: [16, 19], kL: [6, 18], fL: [3, 19], kR: [6, 18], fR: [3, 19], flat: 1 };
  const J = sh(m(S, { eL: [10, 2], hL: [9, 0], eR: [14, 2], hR: [15, 0] }), 0, -3);
  const UP = m(S, { eL: [10, 2], hL: [9, 0], eR: [14, 2], hR: [15, 0] });
  const SB = m(S, { eL: [10, 6], hL: [11, 4], eR: [10, 6], hR: [11, 4], bar: 1 });
  const SQ = m(S, { h: [14, 7], n: [13, 9], p: [9, 14], kL: [14, 15], fL: [12, 19], kR: [14, 15], fR: [12, 19], eL: [11, 11], hL: [12, 9], eR: [11, 11], hR: [12, 9], bar: 1 });
  const SM = lerp(SB, SQ);
  const RA = sh(m(S, { eL: [10, 7], hL: [8, 9], eR: [14, 7], hR: [16, 9], kL: [12, 14], fL: [12, 17], kR: [12, 14], fR: [12, 17], rope: 33 }), 0, -2);
  const RB = m(S, { eL: [10, 7], hL: [8, 9], eR: [14, 7], hR: [16, 9], rope: -14 });
  const Z1 = { h: [3, 18], n: [6, 18], p: [13, 18], eL: [9, 19], hL: [12, 19], eR: [8, 16], hR: [11, 17], kL: [16, 15], fL: [19, 19], kR: [16, 15], fR: [19, 19], zz: 1, flat: 1 };
  const Z2 = m(Z1, { n: [6, 17], eR: [8, 15], hR: [11, 16] });
  const DLb = { h: [17, 9], n: [15, 10], p: [10, 12], kL: [13, 15], fL: [11, 19], kR: [13, 15], fR: [11, 19], eL: [15, 13], hL: [15, 16], eR: [15, 13], hR: [15, 16], bp: 1 };
  const DLt = m(S, { eL: [12, 8], hL: [12, 12], eR: [12, 8], hR: [12, 12], bp: 1 });
  const DLm = lerp(DLb, DLt);
  const C1 = m(S, { eL: [12, 8], hL: [12, 12], eR: [12, 8], hR: [12, 12], db: 1 });
  const C3 = m(C1, { hL: [14, 6], hR: [14, 6] }), C2 = m(C1, { hL: [15, 10], hR: [15, 10] });
  const R1 = { h: [17, 7], n: [15, 8], p: [10, 11], kL: [12, 15], fL: [11, 19], kR: [12, 15], fR: [11, 19], eL: [15, 12], hL: [15, 15], eR: [15, 12], hR: [15, 15], db: 1 };
  const R2 = m(R1, { eL: [12, 8], hL: [13, 11], eR: [12, 8], hR: [13, 11] });
  const Rm = lerp(R1, R2);
  const TH = { h: [13, 3], n: [12, 5], p: [12, 12], eL: [12, 2], hL: [12, -1], eR: [12, 2], hR: [12, -1], kL: [11, 15], fL: [8, 16], kR: [11, 15], fR: [8, 16], pull: 1 };
  const TU = { h: [13, -2], n: [12, 1], p: [12, 8], eL: [14, 1], hL: [12, -1], eR: [14, 1], hR: [12, -1], kL: [11, 11], fL: [8, 12], kR: [11, 11], fR: [8, 12], pull: 1 };
  const TM = lerp(TH, TU);
  const CR1 = { h: [3, 18], n: [6, 18], p: [13, 18], eL: [5, 15], hL: [3, 17], eR: [5, 15], hR: [3, 17], kL: [16, 14], fL: [19, 19], kR: [16, 14], fR: [19, 19], flat: 1 };
  const CR2 = { h: [7, 14], n: [8, 16], p: [13, 18], eL: [9, 12], hL: [6, 13], eR: [9, 12], hR: [6, 13], kL: [16, 14], fL: [19, 19], kR: [16, 14], fR: [19, 19] };
  const CRm = m(lerp(CR1, CR2), { flat: 1 });
  // Course (traîneau poussé) et marche arrière (traîneau tiré) sur 4 images
  const LA = { kL: [7, 15], fL: [5, 19], kR: [13, 14], fR: [12, 19] }, LB = { kL: [12, 13], fL: [10, 16], kR: [11, 15], fR: [9, 19] };
  const LC = { kR: [7, 15], fR: [5, 19], kL: [13, 14], fL: [12, 19] }, LD = { kR: [12, 13], fR: [10, 16], kL: [11, 15], fL: [9, 19] };
  const PB = { h: [18, 7], n: [16, 8], p: [10, 12], push: 1 };
  const EXT = { eL: [19, 9], hL: [22, 9], eR: [19, 9], hR: [22, 9] }, FLX = { eL: [17, 11], hL: [20, 9], eR: [17, 11], hR: [20, 9] };
  const PU = [m(m(PB, LA), EXT), m(m(PB, LB), FLX), m(m(PB, LC), EXT), m(m(PB, LD), FLX)];
  const BA = { kL: [10, 15], fL: [8, 19], kR: [15, 15], fR: [16, 19] }, BBk = { kL: [13, 13], fL: [12, 16], kR: [14, 15], fR: [13, 19] };
  const BC = { kR: [10, 15], fR: [8, 19], kL: [15, 15], fL: [16, 19] }, BD = { kR: [13, 13], fR: [12, 16], kL: [14, 15], fL: [13, 19] };
  const TW = { h: [10, 4], n: [11, 6], p: [13, 12], tow: 1 };
  const AX = { eL: [14, 8], hL: [17, 9], eR: [14, 8], hR: [17, 9] }, AF = { eL: [12, 10], hL: [15, 9], eR: [12, 10], hR: [15, 9] };
  const TI = [m(m(TW, BA), AX), m(m(TW, BBk), AF), m(m(TW, BC), AX), m(m(TW, BD), AF)];
  const BR = { h: [13, 4], n: [12, 6], p: [10, 12], kL: [14, 15], fL: [11, 19], kR: [14, 15], fR: [14, 19], eL: [14, 9], hL: [17, 9], eR: [14, 9], hR: [17, 9], ropes: 1 };
  const BRa = m(BR, { ph: 0 }), BRb = m(BR, { eL: [14, 10], hL: [17, 12], eR: [14, 10], hR: [17, 12], ph: 1 }), BRc = m(BRa, { ph: 2 }), BRd = m(BRb, { ph: 3 });
  return {
    S, WALK: [W1, S, W3, S],
    ACT: {
      'Squat barre': { f: [SB, SM, SQ, SQ, SM], n: 3 },
      'Soulevé de terre': { f: [DLb, DLm, DLt, DLt, DLm], n: 3 },
      'Curl biceps': { f: [C1, C2, C3, C3, C2], n: 3 },
      'Rowing haltères': { f: [R1, Rm, R2, R2, Rm], n: 3 },
      'Tractions': { f: [TH, TM, TU, TU, TM], n: 3 },
      'Relevé de buste': { f: [CR1, CRm, CR2, CR2, CRm], n: 3 },
      'Traîneau poussé': { f: PU, n: 4, mv: 3 },
      'Traîneau tiré': { f: TI, n: 4, mv: -3 },
      'Battle ropes': { f: [BRa, BRb, BRc, BRd], n: 6, fast: 1, at: 70 },
      'Burpees': { f: [S, Q, P, Q, J], n: 3 },
      'Pompes': { f: [P, PL], n: 5 },
      'Corde': { f: [RA, RB], n: 8, fast: 1 },
      'Sieste': { f: [Z1, Z1, Z2, Z2], n: 5, slow: 1 },
      'Fête': { f: [J, UP], n: 6, sp: 1 },
    },
    ALL: ['Squat barre', 'Soulevé de terre', 'Curl biceps', 'Rowing haltères', 'Tractions', 'Relevé de buste', 'Traîneau poussé', 'Traîneau tiré', 'Battle ropes', 'Burpees', 'Pompes', 'Corde', 'Sieste'],
  };
})();

// ---------- Dessin ----------
const bonhomme = {
  lane: null, cv: null, c: null, dv: null, d: null, rc: null, r: null,
  ink: '#111114', bg: '#ffffff', W: 390,
  cx: 60, dir: 1, mode: 'q', left: 0, act: null, last: null, step: 0, queue: [], hidden: true, fi: 0,
  ropes: null, door: { x: 18, side: -1, open: 0, on: false }, timer: null, started: false, zone: null,
};
const BH_K = 1.2, BHX = x => Math.round(32 + (x - 12) * BH_K), BHY = y => Math.round(30 - (19 - y) * BH_K);

function bhRect(x, y, w, h, col) { const c = bonhomme.c; c.fillStyle = col; c.fillRect(x, y, w, h); }
function bhBox(x, y, t, col) { const o = t >> 1; bhRect(Math.round(x) - o, Math.round(y) - o, t, t, col); }
function bhLine(a, b, t, col) {
  let [x0, y0] = a.map(Math.round); const [x1, y1] = b.map(Math.round);
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx - dy;
  for (let guard = 0; guard < 200; guard++) {
    bhBox(x0, y0, t, col); if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * e; if (e2 > -dy) { e -= dy; x0 += sx; } if (e2 < dx) { e += dx; y0 += sy; }
  }
}
function bhQuad(a, cy, b) { const cx = (a[0] + b[0]) / 2; for (let i = 0; i <= 40; i++) { const t = i / 40, u = 1 - t; bhBox(u * u * a[0] + 2 * u * t * cx + t * t * b[0], u * u * a[1] + 2 * u * t * cy + t * t * b[1], 1, bonhomme.ink); } }
function bhCurve(a, b, sag) { let prev = a; for (let i = 1; i <= 20; i++) { const t = i / 20, pt = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t + sag * Math.sin(Math.PI * t)]; bhLine(prev, pt, 1, bonhomme.ink); prev = pt; } }
const bhAnk = f => [f[0], f[1] - 2];
function bhLeg(hp, kn, ft, front) {
  const { ink, bg } = bonhomme, a = bhAnk(ft);
  if (front) { bhLine(hp, kn, 5, bg); bhLine(kn, a, 4, bg); bhRect(ft[0] - 2, ft[1] - 2, 6, 4, bg); }
  bhRect(ft[0] - 1, ft[1] - 1, 4, 2, ink); bhLine(hp, kn, 3, ink); bhLine(kn, a, 2, ink);
}
function bhArm(s, e, h, front) {
  const { ink, bg } = bonhomme;
  if (front) { bhLine(s, e, 4, bg); bhLine(e, h, 3, bg); }
  bhRect(h[0] - 2, h[1] - 2, 4, 4, bg); bhLine(s, e, 2, ink); bhLine(e, h, 1, ink); bhRect(h[0] - 1, h[1] - 1, 2, 2, ink);
}
function bhHead(p, p0) {
  const { ink, bg } = bonhomme;
  let hx = p.h[0], hy = p.h[1];
  if (p0.flat) hx -= 1; else hy -= 1;
  bhRect(hx - 3, hy - 3, 7, 7, bg);
  bhLine(p.n, p0.flat ? [hx + 2, hy] : [hx, hy + 2], 2, ink);   // cou
  bhRect(hx - 2, hy - 2, 5, 5, ink);
  if (p0.zz) bhRect(hx, hy, 2, 1, bg); else bhRect(hx + 1, hy - 1, 1, 1, bg); // œil
}
function bhPlate(pt, big) {
  const { ink, bg } = bonhomme, [x, y] = pt;
  if (big) { bhRect(x - 5, y - 5, 11, 11, bg); bhRect(x - 3, y - 4, 7, 9, ink); bhRect(x - 4, y - 3, 9, 7, ink); }
  else { bhRect(x - 3, y - 3, 7, 7, bg); bhRect(x - 2, y - 1, 5, 3, ink); bhRect(x - 1, y - 2, 3, 5, ink); }
  bhRect(x, y, 1, 1, bg);
}
function bhSled(x0) { const g = BHY(19), ink = bonhomme.ink; bhRect(x0, g - 1, 13, 2, ink); bhRect(x0 + 1, g - 3, 11, 2, ink); bhPlate([x0 + 6, g - 8], 1); }
function bhZz(x, y) { [[0, 0], [1, 0], [2, 0], [1, 1], [0, 2], [1, 2], [2, 2]].forEach(([i, j]) => bhBox(x + i, y + j, 1, bonhomme.ink)); }

function bhDraw(p0, sparkle) {
  const B = bonhomme, ink = B.ink, bg = B.bg;
  const p = {}; for (const k in p0) p[k] = Array.isArray(p0[k]) ? [BHX(p0[k][0]), BHY(p0[k][1])] : (k === 'rope' ? 30 - (19 - p0[k]) * BH_K : p0[k]);
  B.c.clearRect(0, 0, 64, 32);
  B.ropes = p0.ropes ? { ph: p0.ph, h: p.hR } : null;
  if (p0.pull) { const by = BHY(-1); bhRect(BHX(4), by, BHX(20) - BHX(4), 1, ink); bhRect(BHX(4), by, 1, 31 - by, ink); bhRect(BHX(20), by, 1, 31 - by, ink); }
  if (p0.push) { const hx = p.hR[0]; bhSled(hx + 1); bhLine([hx + 1, p.hR[1]], [hx + 2, BHY(19) - 3], 2, ink); }
  if (p0.tow) bhSled(50);
  // silhouette détourée de la couleur du fond
  [[p.p, p.kL], [p.kL, bhAnk(p.fL)], [p.n, p.eL], [p.eL, p.hL], [p.p, p.kR], [p.kR, bhAnk(p.fR)], [p.n, p.eR], [p.eR, p.hR]].forEach(([a, b]) => bhLine(a, b, 4, bg));
  bhLine(p.n, p.p, 6, bg);
  if (p.rope && p0.rope > 0) bhQuad(p.hL, p.rope, p.hR);
  bhLeg(p.p, p.kL, p.fL, 0); bhArm(p.n, p.eL, p.hL, 0);
  const mid = [Math.round((p.n[0] * 2 + p.p[0]) / 3), Math.round((p.n[1] * 2 + p.p[1]) / 3)];
  bhLine(p.n, mid, 4, ink); bhLine(mid, p.p, 3, ink);
  const w = [Math.round(p.p[0] * 0.75 + p.n[0] * 0.25), Math.round(p.p[1] * 0.75 + p.n[1] * 0.25)];   // taille marquée
  if (p0.flat) bhRect(w[0], w[1] - 2, 1, 4, bg); else bhRect(w[0] - 2, w[1], 4, 1, bg);
  bhLeg(p.p, p.kR, p.fR, 1); bhArm(p.n, p.eR, p.hR, 1);
  if (p0.tow) bhCurve([p.hR[0] + 1, p.hR[1]], [50, BHY(16)], 1);
  if (p0.bar) { const x = p.n[0] - 2, y = p.n[1]; bhRect(x - 4, y - 4, 9, 9, bg); bhRect(x - 3, y - 2, 7, 5, ink); bhRect(x - 2, y - 3, 5, 7, ink); bhRect(x, y, 1, 1, bg); }
  bhHead(p, p0);
  if (p0.bp) bhPlate(p.hR, 1); if (p0.db) bhPlate(p.hR, 0);
  if (p.rope && p0.rope < 0) bhQuad(p.hL, p.rope, p.hR);
  if (p0.zz) { const k = B.fi % 6; bhZz(25 + k, 13 - k * 2); if (k > 2) bhZz(21 + k, 16 - k); }
  if (sparkle) { const o = B.fi % 2; [[20, 6 - o], [43, 8 + o], [22, 14 + o], [41, 3 + o]].forEach(([x, y]) => { bhBox(x, y, 1, ink); bhBox(x - 1, y + 1, 1, ink); bhBox(x + 1, y + 1, 1, ink); bhBox(x, y + 2, 1, ink); }); }
}

function bhDrawRopes() {
  const B = bonhomme, r = B.r, gw = B.rc.width;
  r.clearRect(0, 0, gw, 32);
  if (!B.ropes || B.hidden) return;
  const hx = (B.cx - 64 + B.ropes.h[0] * 2) / 2 + 1, hy = B.ropes.h[1];
  const ax = Math.round(bhMaxAnchor() / 2) - 3, ay = BHY(18);
  r.fillStyle = B.ink; r.fillRect(ax, ay - 5, 3, BHY(19) - ay + 6);
  const waves = Math.max(2, Math.round((ax - hx) / 30));
  [0, Math.PI].forEach((off, j) => {
    let prev = null;
    for (let i = 0; i <= 160; i++) {
      const t = i / 160, x = hx + (ax - hx) * t, y = hy + j + (ay - hy) * t + 5 * (1 - t * 0.7) * Math.sin(t * Math.PI * waves - B.ropes.ph * Math.PI / 2 + off);
      if (prev) { const n = Math.max(Math.abs(x - prev[0]), Math.abs(y - prev[1])) || 1; for (let s = 0; s <= n; s++) r.fillRect(Math.round(prev[0] + (x - prev[0]) * s / n), Math.round(prev[1] + (y - prev[1]) * s / n), 1, 1); }
      prev = [x, y];
    }
  });
}

function bhDrawDoor(open) {
  const B = bonhomme, d = B.d; B.door.open = open;
  d.clearRect(0, 0, 16, 30); d.fillStyle = B.ink; d.fillRect(0, 0, 16, 30);
  if (open === 0) { d.fillStyle = B.bg; d.fillRect(B.door.side > 0 ? 3 : 11, 16, 2, 2); return; }
  d.fillStyle = B.bg; d.fillRect(2, 2, 12, 28);
  const w = [8, 5, 3][open - 1]; d.fillStyle = B.ink;
  if (B.door.side > 0) d.fillRect(2, 2, w, 28); else d.fillRect(14 - w, 2, w, 28);
}
function bhFade(on) { bonhomme.door.on = on; bonhomme.dv.style.opacity = on ? '1' : '0'; }

// ---------- Place disponible ----------
function bhPostitLeft() {
  const pi = document.querySelector('#program-overview .bilan-postit');
  if (!pi || !bonhomme.lane) return null;
  return pi.getBoundingClientRect().left - bonhomme.lane.getBoundingClientRect().left;
}
function bhMaxX() { const pl = bhPostitLeft(); return pl !== null ? pl - 44 : bonhomme.W - 60; }
function bhMaxAnchor() { const pl = bhPostitLeft(); return pl !== null ? pl - 4 : bonhomme.W - 4; }
const BH_MIN = 60;

// ---------- Chorégraphie ----------
function bhMood() {
  try { if (localStorage.getItem(BONHOMME_RECORD_KEY) === bonhommeToday()) return 'R'; } catch (e) {}
  if (typeof isDeloadActive === 'function') { try { if (isDeloadActive()) return 'D'; } catch (e) {} }
  return 'N';
}
function bhPick() {
  const mood = bhMood();
  let pool = mood === 'D' ? ['Sieste', 'Corde', 'Curl biceps'] : mood === 'R' ? ['Fête', 'Squat barre', 'Soulevé de terre'] : BH.ALL;
  pool = pool.filter(a => a !== bonhomme.last);
  return pool[Math.floor(Math.random() * pool.length)];
}
function bhSetSide(right) {
  const B = bonhomme;
  if (bhPostitLeft() !== null) right = false;
  // 1.8.98 : la porte garde la marge de la page (26 px, 20 sous 380 px) entre elle et le bord de l'écran
  const g = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--gutter')) || 26;
  B.door.side = right ? 1 : -1; B.door.x = right ? B.W - g - 16 : g + 16;
  B.dv.style.left = (B.door.x - 16) + 'px';
  bhDrawDoor(0);
  return right;
}
function bhDoorIn() { const q = bonhomme.queue; q.push(() => bhFade(true)); q.push(() => {}, () => {}, () => {}); [1, 2, 3].forEach(o => q.push(() => bhDrawDoor(o))); }
function bhDoorOut() { const q = bonhomme.queue; [2, 1, 0].forEach(o => q.push(() => bhDrawDoor(o))); q.push(() => bhFade(false)); q.push(() => {}, () => {}, () => {}); }
function bhWalkTo(target, then) {
  const B = bonhomme; B.mode = 'q'; let k = 0;
  const f = () => {
    const x = typeof target === 'function' ? target() : target, rem = x - B.cx;
    if (Math.abs(rem) > 3) { B.dir = Math.sign(rem); B.cx += 3 * B.dir; bhDraw(BH.WALK[k++ % 4]); B.queue.unshift(f); }
    else { B.cx = x; if (then) then(); }
  };
  B.queue.push(f);
}
function bhLeave() {
  const B = bonhomme; B.mode = 'q'; let right = B.dir > 0;
  B.queue.push(() => { right = bhSetSide(right); bhDraw(BH.S); });
  bhDoorIn();
  bhWalkTo(() => B.door.x, () => { B.hidden = true; });
  bhDoorOut();
  for (let i = 0; i < 12; i++) B.queue.push(() => {});
  bhComeBack();
}
function bhComeBack() {
  const B = bonhomme; B.mode = 'q'; let right = Math.random() < 0.5;
  B.queue.push(() => { right = bhSetSide(right); });
  bhDoorIn();
  B.queue.push(() => { B.cx = B.door.x; B.dir = right ? -1 : 1; B.hidden = false; bhDraw(BH.S); });
  for (let i = 0; i < 10; i++) B.queue.push(() => { B.cx += 3 * B.dir; bhDraw(BH.WALK[i % 4]); });
  bhDoorOut();
  B.queue.push(() => { B.mode = 'walk'; B.left = 6; B.step = 0; });
}
function bhBegin(a) { const B = bonhomme; B.mode = 'act'; B.act = a; B.last = a; B.step = 0; B.left = BH.ACT[a].f.length * BH.ACT[a].n; }
function bhStart(a) {
  const B = bonhomme, at = BH.ACT[a].at; B.last = a;
  if (at !== undefined && Math.abs(B.cx - at) > 3) bhWalkTo(at, () => { B.dir = 1; bhBegin(a); });
  else { if (at !== undefined) B.dir = 1; bhBegin(a); }
}

function bhVisible() {
  const B = bonhomme, b = document.body;
  return !!(B.lane && B.lane.isConnected && B.zone && B.zone.isConnected && bonhommeEnabled() && !bonhommeReducedMotion()
    && (b.dataset.tab || 'programme') === 'programme' && b.dataset.pview === 'home'
    && !b.classList.contains('onboarding') && document.visibilityState !== 'hidden');
}
function bhColors() {
  const cs = getComputedStyle(document.documentElement);
  const B = bonhomme, ink = cs.getPropertyValue('--text').trim() || '#111114', bg = cs.getPropertyValue('--bg').trim() || '#ffffff';
  if (ink !== B.ink || bg !== B.bg) { B.ink = ink; B.bg = bg; bhDrawDoor(B.door.open); }
}
function bhResize() {
  const B = bonhomme, W = Math.round(B.lane.clientWidth) || 390;
  if (W === B.W && B.rc.width === Math.ceil(W / 2)) return;
  B.W = W; B.rc.width = Math.ceil(W / 2); B.rc.style.width = (B.rc.width * 2) + 'px';
}
// La piste est posée dans l'onglet (bord à bord), calée sur le bas de la zone
function bhPlaceLane() {
  const B = bonhomme, host = B.lane && B.lane.parentNode;
  if (!host || !B.zone) return;
  const pad = parseFloat(getComputedStyle(B.zone).paddingBottom) || 0;
  const top = Math.round(B.zone.getBoundingClientRect().bottom - pad - host.getBoundingClientRect().top - 64);
  if (B.lane.style.top !== top + 'px') B.lane.style.top = top + 'px';
}
function bhPlace() {
  const B = bonhomme;
  bhPlaceLane();
  B.cv.style.left = Math.round(B.cx - 64) + 'px';
  B.cv.style.transform = B.dir < 0 ? 'scaleX(-1)' : 'none';
  B.cv.style.visibility = B.hidden ? 'hidden' : 'visible';
  bhDrawRopes();
}
function bhTick() {
  const B = bonhomme;
  B.timer = null;
  if (!bhVisible()) { if (B.lane) B.lane.style.visibility = 'hidden'; B.timer = setTimeout(bhTick, 1000); return; }
  B.lane.style.visibility = 'visible';
  bhResize(); bhColors();
  if (!B.started) { B.started = true; B.hidden = true; B.cx = 60; B.queue = []; bhComeBack(); }
  B.fi++;
  let delay = 260;
  if (B.mode === 'q' && B.queue.length) { B.queue.shift()(); delay = 200; }
  else if (B.mode === 'walk') {
    bhDraw(BH.WALK[B.step % 4]); B.step++; B.cx += 3 * B.dir;
    const mx = bhMaxX();
    if (B.cx > mx) { B.cx = mx; B.dir = -1; } if (B.cx < BH_MIN) { B.cx = BH_MIN; B.dir = 1; }
    if (--B.left <= 0) bhStart(bhPick());
  } else if (B.mode === 'act') {
    const a = BH.ACT[B.act], i = B.step % a.f.length;
    bhDraw(a.f[i], a.sp);
    if (a.mv) { B.cx += a.mv * B.dir; const mx = bhMaxX(); if (B.cx > mx || B.cx < BH_MIN) { B.dir = -B.dir; B.cx = Math.max(BH_MIN, Math.min(mx, B.cx)); } }
    B.step++;
    if (a.slow) delay = 420; if (a.fast) delay = 180;
    if (--B.left <= 0) { B.ropes = null; if (Math.random() < 0.3) bhLeave(); else { B.mode = 'walk'; B.step = 0; B.left = 8 + Math.floor(Math.random() * 10); } }
  } else { B.mode = 'walk'; B.left = 6; }
  bhPlace();
  B.timer = setTimeout(bhTick, delay);
}

// Appelé après chaque affichage de l'accueil : la piste (toujours la même, pour ne pas couper l'animation) va dans la zone
function bonhommeAttach() {
  const zone = document.querySelector('#program-overview .bh-zone.on');
  const host = document.getElementById('tab-programme');
  const B = bonhomme;
  B.zone = zone;
  if (!zone || !host) { if (B.lane && B.lane.parentNode) B.lane.remove(); return; }
  if (!B.lane) {
    const lane = document.createElement('div');
    lane.className = 'bh-lane'; lane.setAttribute('aria-hidden', 'true');
    lane.innerHTML = '<canvas class="bh-ropes" width="195" height="32"></canvas><canvas class="bh-door" width="16" height="30"></canvas><canvas class="bh-man" width="64" height="32"></canvas>';
    B.lane = lane;
    B.rc = lane.querySelector('.bh-ropes'); B.r = B.rc.getContext('2d');
    B.dv = lane.querySelector('.bh-door'); B.d = B.dv.getContext('2d');
    B.cv = lane.querySelector('.bh-man'); B.c = B.cv.getContext('2d');
  }
  if (B.lane.parentNode !== host) host.appendChild(B.lane);
  bhPlaceLane();
  if (!B.timer) B.timer = setTimeout(bhTick, 60);
}

syncBonhommeChoice();
if (window.matchMedia) {
  const mq = matchMedia('(prefers-reduced-motion: reduce)');
  const onChange = () => { if (typeof renderProgramOverview === 'function') renderProgramOverview(); };
  if (mq.addEventListener) mq.addEventListener('change', onChange); else if (mq.addListener) mq.addListener(onChange);
}
