// Copyright (c) 2026 Jean-Philippe Alexander. Mon Carnet de Salle.
// SPDX-License-Identifier: PolyForm-Strict-1.0.0 (voir LICENSE et NOTICE)
// Saisie rapide, partie calcul (1.8.92, co-auteur : Claude) : classement des exercices par matériel, calcul des charges
// (barre, barre courte, machine chargée de disques, haltères), bornes, couleurs des haltères et mémoire par exercice.
// Aucun affichage ici : le volet lui-même viendra dans js/quick_input.js. Voir SPEC_SAISIE_RAPIDE.md du projet.
const QuickLogic = (() => {
  const norm = s => String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  const set = list => new Set(list.map(norm));

  // ── Classement ────────────────────────────────────────────────────────────
  const BARBELL_EXERCISES = ['Squat', 'Soulevé de terre', 'Soulevé de terre roumain', 'Soulevé de terre jambes tendues', 'Hip thrust',
    'Rowing barre', 'Shrugs barre', 'Développé couché', 'Développé incliné', 'Développé décliné', 'Développé militaire'];
  const SHORT_BAR_EXERCISES = ['Curl barre EZ', 'Extension triceps couché'];
  // côtés chargés : 2 = disques de chaque côté, 1 = une seule corne
  const PLATE_MACHINES = { 'presse a cuisses': 2, 'hack squat': 2, 'mollets assis': 1 };
  const SINGLE_DUMBBELL_EXERCISES = ['Squat goblet', 'Hip thrust haltères', 'Rowing unilatéral', 'Pull-over', 'Curl concentration',
    'Extension triceps haltère', 'Extension triceps en arrière'];
  const PAIR_DUMBBELL_EXERCISES = ['Développé haltères', 'Développé incliné haltères', 'Écarté haltère', 'Écarté incliné haltères',
    'Développé haltères assis', 'Développé rotatif haltères', 'Élévations latérales', 'Élévations frontales', 'Oiseau', 'Curl biceps',
    'Curl incliné', 'Curl marteau', 'Rowing haltères', 'Shrugs haltères', 'Squat haltères', 'Squat bulgare', 'Fentes', 'Fentes marchées',
    'Mollets haltères', 'Montées sur banc'];
  const DUMBBELL_EXERCISES = [...SINGLE_DUMBBELL_EXERCISES, ...PAIR_DUMBBELL_EXERCISES];
  const BARBELL = set(BARBELL_EXERCISES), SHORT = set(SHORT_BAR_EXERCISES), DB = set(DUMBBELL_EXERCISES), DB1 = set(SINGLE_DUMBBELL_EXERCISES);
  const SINGLE_WORDS = ['unilat', 'concentration', 'goblet', '1 bras', 'un bras', '1 main', 'une main', 'a deux mains'];

  const isShortBarExercise = n => SHORT.has(norm(n));
  const isBarbellExercise = n => {
    const k = norm(n);
    if (SHORT.has(k)) return false;
    return BARBELL.has(k) || (/\bbarre\b/.test(k) && !k.includes('barre ez'));
  };
  const plateMachineSides = n => PLATE_MACHINES[norm(n)] || 0;
  const isPlateMachineExercise = n => plateMachineSides(n) > 0;
  const isDumbbellExercise = n => {
    const k = norm(n);
    if (DB.has(k)) return true;
    return /haltere/.test(k) && !/poulie|machine/.test(k);
  };
  const isSingleDumbbell = n => {
    const k = norm(n);
    return DB1.has(k) || (!DB.has(k) && SINGLE_WORDS.some(w => k.includes(w)));
  };
  // Nombre d'unités comptées dans la charge de la série : × 2 pour deux haltères, × 1 pour un seul.
  const weightMultiplierFor = n => (isDumbbellExercise(n) && !isSingleDumbbell(n) ? 2 : 1);

  // Mode du volet d'après le nom et la fiche du catalogue ({ mode, cardio }).
  function quickMode(name, info) {
    const mode = (info && info.mode) || 'weight';
    if (mode === 'bw') return 'bw';
    if (mode === 'reps') return 'reps';
    if (mode === 'time') return 'time';
    if (mode === 'dist' || mode === 'floors') return 'cardio';
    if (isShortBarExercise(name)) return 'shortbar';
    if (isPlateMachineExercise(name)) return 'platemachine';
    if (isDumbbellExercise(name)) return 'dumbbell';
    if (isBarbellExercise(name)) return 'barbell';
    return 'machine';
  }

  // ── Nombres ───────────────────────────────────────────────────────────────
  const LIMITS = { weight: [0, 500], bw: [-150, 200], reps: [0, 999], time: [0, 359999], dist: [0, 999], floors: [0, 9999] };
  const round2 = v => Math.round(v * 100) / 100;
  const clamp = (v, kind) => { const [lo, hi] = LIMITS[kind] || [-Infinity, Infinity]; return Math.min(hi, Math.max(lo, v)); };
  // « 2,5 », « −5 », « +1 » → nombre ; vide ou illisible → null
  function parseQuickNum(s) {
    if (typeof s === 'number') return Number.isFinite(s) ? s : null;
    const t = String(s == null ? '' : s).trim().replace(/[−–—]/g, '-').replace(',', '.').replace(/\s/g, '');
    if (!t || !/^[+-]?\d*\.?\d+$/.test(t)) return null;
    return parseFloat(t);
  }
  const step = (value, delta, kind) => round2(clamp((parseQuickNum(value) || 0) + delta, kind));
  const fmtKg = v => String(round2(v)).replace('.', ',');
  const formatDuration = s => { s = Math.max(0, Math.round(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  function bwLabel(lest) {
    const v = round2(parseQuickNum(lest) || 0);
    return v === 0 ? 'PDC' : v > 0 ? `PDC + ${fmtKg(v)} kg` : `PDC − ${fmtKg(-v)} kg`;
  }

  // ── Barres et disques ─────────────────────────────────────────────────────
  const BAR_WEIGHTS = [{ kg: 10, mm: 25 }, { kg: 15, mm: 25 }, { kg: 20, mm: 28 }, { kg: 25, mm: 32 }];
  const DEFAULT_BAR = 20;
  const SHORT_BARS = [{ id: 'droite', kg: 7, cm: 120 }, { id: 'ez', kg: 8, cm: 120 }, { id: 'ez_olympique', kg: 10, cm: 120 }, { id: 'triceps', kg: 8, cm: 86 }];
  const DEFAULT_SHORT_BAR = 'ez';
  const OLYMPIC_RACK = [1, 2.5, 5, 10, 15, 20, 25];
  const SHORT_RACK = [1, 2.5, 5, 10, 15];
  const MAX_PLATES = 8;
  const rackFor = mode => (mode === 'shortbar' ? SHORT_RACK : OLYMPIC_RACK);
  const shortBar = id => SHORT_BARS.find(b => b.id === id) || SHORT_BARS.find(b => b.id === DEFAULT_SHORT_BAR);

  // Disques posés : gardés dans l'ordre d'ajout (le bouton « retirer » enlève le dernier) ; sortedPlates pour le dessin.
  const addPlate = (plates, p) => (plates.length >= MAX_PLATES ? plates.slice() : [...plates, p]);
  const removeLastPlate = plates => plates.slice(0, -1);
  const removePlateAt = (plates, i) => plates.filter((_, j) => j !== i);
  const sortedPlates = plates => plates.slice().sort((a, b) => b - a);
  const sum = a => a.reduce((s, x) => s + x, 0);
  // Total affiché : barre (ou machine à vide) + côtés × disques d'un côté
  const totalFromBarPlates = (base, plates, sides = 2) => round2((parseQuickNum(base) || 0) + sides * sum(plates));

  // Charge déjà saisie → disques d'un côté (du plus lourd au plus léger). rest > 0 : la charge ne tombe pas juste.
  function computeBarbellLoad(total, base, rack = OLYMPIC_RACK, sides = 2) {
    let side = round2(((parseQuickNum(total) || 0) - (parseQuickNum(base) || 0)) / sides);
    const plates = [];
    if (side < 0) return { plates, rest: side, belowBar: true };
    for (const p of rack.slice().sort((a, b) => b - a)) {
      while (side + 1e-9 >= p && plates.length < MAX_PLATES) { plates.push(p); side = round2(side - p); }
    }
    return { plates, rest: side, belowBar: false };
  }

  // ── Haltères ──────────────────────────────────────────────────────────────
  const DUMBBELL_MAX_KG = 60;
  const RACK_SIZE = 4, RACK_STEP = 2, RACK_SHIFT = 8;
  const evenFloor = v => Math.max(RACK_STEP, Math.floor(v / RACK_STEP) * RACK_STEP);
  const lastRackStart = DUMBBELL_MAX_KG - RACK_STEP * (RACK_SIZE - 1);
  // Râtelier ouvert sur la valeur saisie (ou la dernière charge connue), placée en 2ᵉ position quand c'est possible.
  function computeDumbbellRackStart(value, last) {
    const v = parseQuickNum(value) || parseQuickNum(last) || 0;
    if (v <= 0) return RACK_STEP;
    return Math.min(lastRackStart, Math.max(RACK_STEP, evenFloor(v) - RACK_STEP));
  }
  const shiftDumbbellRackStart = (start, dir) => Math.min(lastRackStart, Math.max(RACK_STEP, start + Math.sign(dir) * RACK_SHIFT));
  const buildDumbbellRack = start => Array.from({ length: RACK_SIZE }, (_, i) => start + i * RACK_STEP).filter(v => v <= DUMBBELL_MAX_KG);
  // Hauteur du dessin selon le poids
  function dumbbellTierFor(kg) {
    const v = parseQuickNum(kg) || 0;
    return v <= 6 ? 44 : v <= 14 ? 56 : v <= 24 ? 70 : 84;
  }
  // Vert (2 kg) → rouge (60 kg), une teinte par poids pair (teinte, saturation 62 %, luminosité 40 %, comme la maquette).
  function dumbbellColorFor(kg) {
    const v = Math.min(DUMBBELL_MAX_KG, Math.max(2, evenFloor(parseQuickNum(kg) || 2)));
    const h = 142 - ((v - 2) / (DUMBBELL_MAX_KG - 2)) * 142, hue = Math.round(h);
    const [r, g, b] = hslToRgb(h, 0.62, 0.40);
    const lum = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    const hex = '#' + [r, g, b].map(c => Math.round(c * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
    return { hue, background: hex, text: lum > 0.5 ? '#111114' : '#FFFFFF' };   // maquette : 12 kg = #2CA527, texte blanc
  }
  function hslToRgb(h, s, l) {
    const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
    const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
    return [f(0), f(8), f(4)];
  }
  const lin = c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

  // Valeur de la série ↔ poids d'un haltère (ou d'une unité)
  const toSetWeightValue = (unit, mult) => round2((parseQuickNum(unit) || 0) * (mult || 1));
  const fromSetWeightValue = (value, mult) => round2((parseQuickNum(value) || 0) / (mult || 1));

  // ── Cardio ────────────────────────────────────────────────────────────────
  const DURATION_STEPS = { time: [30, 15, 5], cardio: [300, 60, 30] };
  function cardioDistanceProfile(name, info) {
    if (info && info.mode === 'floors') return { unit: 'étages', steps: [10, 5, 1], kind: 'floors' };
    const k = norm(name);
    if (/rameur|elliptique|ski/.test(k)) return { unit: 'km', steps: [1, 0.5, 0.25], kind: 'dist', labels: ['1 km', '500 m', '250 m'] };
    return { unit: 'km', steps: [10, 5, 1], kind: 'dist', labels: ['10 km', '5 km', '1 km'] };
  }

  // ── Mémoire par exercice ──────────────────────────────────────────────────
  const BAR_KEY = 'h49_bar_weights', EMPTY_KEY = 'h49_machine_empty';
  const read = (store, key) => { try { return JSON.parse(store.getItem(key) || '{}') || {}; } catch (e) { return {}; } };
  const write = (store, key, obj) => { try { store.setItem(key, JSON.stringify(obj)); } catch (e) { /* stockage plein ou refusé */ } };
  function barWeightFor(store, name) {
    const v = read(store, BAR_KEY)[name];
    if (isShortBarExercise(name)) return shortBar(v).id;
    return BAR_WEIGHTS.some(b => b.kg === v) ? v : DEFAULT_BAR;
  }
  function rememberBarWeight(store, name, v) {
    const ok = isShortBarExercise(name) ? SHORT_BARS.some(b => b.id === v) : BAR_WEIGHTS.some(b => b.kg === v);
    if (!ok) return false;                                    // poids de barre : jamais saisi à la main
    const all = read(store, BAR_KEY); all[name] = v; write(store, BAR_KEY, all); return true;
  }
  function machineEmptyFor(store, name) {
    const v = read(store, EMPTY_KEY)[name];
    return typeof v === 'number' && v >= 0 ? v : null;
  }
  function rememberMachineEmpty(store, name, v) {
    const all = read(store, EMPTY_KEY), n = parseQuickNum(v);
    if (n == null || n < 0) delete all[name]; else all[name] = round2(Math.min(n, LIMITS.weight[1]));
    write(store, EMPTY_KEY, all);
  }
  // Poids de base sous les disques : barre olympique, barre courte ou machine à vide
  function baseWeightFor(store, name, mode) {
    if (mode === 'shortbar') return shortBar(barWeightFor(store, name)).kg;
    if (mode === 'platemachine') return machineEmptyFor(store, name) || 0;
    return barWeightFor(store, name);
  }

  return {
    norm, BARBELL_EXERCISES, SHORT_BAR_EXERCISES, DUMBBELL_EXERCISES, SINGLE_DUMBBELL_EXERCISES,
    isBarbellExercise, isShortBarExercise, isPlateMachineExercise, plateMachineSides, isDumbbellExercise, isSingleDumbbell,
    weightMultiplierFor, quickMode, LIMITS, clamp, parseQuickNum, step, fmtKg, formatDuration, bwLabel,
    BAR_WEIGHTS, DEFAULT_BAR, SHORT_BARS, DEFAULT_SHORT_BAR, OLYMPIC_RACK, SHORT_RACK, MAX_PLATES, rackFor, shortBar,
    addPlate, removeLastPlate, removePlateAt, sortedPlates, totalFromBarPlates, computeBarbellLoad,
    DUMBBELL_MAX_KG, computeDumbbellRackStart, shiftDumbbellRackStart, buildDumbbellRack, dumbbellTierFor, dumbbellColorFor,
    toSetWeightValue, fromSetWeightValue, DURATION_STEPS, cardioDistanceProfile,
    BAR_KEY, EMPTY_KEY, barWeightFor, rememberBarWeight, machineEmptyFor, rememberMachineEmpty, baseWeightFor,
  };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = QuickLogic;
