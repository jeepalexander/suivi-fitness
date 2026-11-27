// Copyright (c) 2026 Jean-Philippe Alexander. Mon Carnet de Salle.
// SPDX-License-Identifier: PolyForm-Strict-1.0.0 (voir LICENSE et NOTICE)
// Suivi Fitness : logique de l'application (JavaScript natif, aucune dépendance sauf Chart.js local).
// Toutes les fonctions et variables sont globales : les boutons de index.html les appellent par leur nom (onclick).
// L'ordre des sections ci-dessous n'a pas d'importance pour les fonctions, mais les constantes (1) et les
// variables d'état (2) doivent rester en tête, car certaines s'initialisent à partir des constantes.
//
// SOMMAIRE
//   1. CONSTANTES ET DONNÉES DU PROGRAMME
//   2. ÉTAT DE L'APPLICATION (variables globales)
//   3. THÈME CLAIR / SOMBRE / AUTO               → js/theme.js (1.8.90)
//   4. DONNÉES : SAUVEGARDE ET OUTILS COMMUNS
//   5. DÉLOAD (SEMAINE DE RELÂCHE)
//   6. ÉCRAN PROGRAMME
//   7. CHRONOS : REPOS ET DURÉE DE SÉANCE        → js/chronos.js (1.8.90)
//   8. BROUILLON DE SÉANCE                       → js/chronos.js (1.8.90)
//   9. ÉCRAN SÉANCE : SÉRIES ET EXERCICES        → js/seance.js (1.8.90)
//  10. ÉCRAN SÉANCE : FORMULAIRE ET ENREGISTREMENT → js/seance.js (1.8.90)
//  11. ÉCRAN HISTORIQUE ET MODIFICATION D'UNE SÉANCE → js/historique.js (1.8.90)
//  12. ÉCRAN GRAPHIQUES : FILTRES ET COURBES      → js/graphiques.js (1.8.90)
//  13. ANALYSE MENSUELLE DE PROGRESSION          → js/analyse.js (1.8.90)
//  14. NAVIGATION ET DISPOSITION
//  15b. SAUVEGARDE GOOGLE DRIVE                  → js/drive.js (1.8.90)
//  15. SAUVEGARDE, IMPORT ET RÉINITIALISATION    → js/sauvegarde.js (1.8.90)
//  16. MISES À JOUR DE L'APPLICATION            → js/mises-a-jour.js (1.8.90)
//  17. DÉMARRAGE
//
// Fichiers associés (1.7.0) : js/catalogue.js (catalogue des exercices, chargé avant ce fichier) et
// js/programmes.js (onglet Programme : programmes sur mesure et séances libres, chargé après).
// Découpage (1.8.90, co-auteur : Claude) : les sections marquées « → » vivent dans leur propre fichier, chargé juste
// après celui-ci, dans l'ordre du sommaire (index.html). Tout reste global ; le démarrage (17) attend DOMContentLoaded,
// donc tous les fichiers sont lus avant qu'une fonction soit appelée. Ici restent les sections 1, 2, 4, 5, 6, 14 et 17.
// Garde-fou : tests/test_decoupage.py (ordre de chargement, cache hors ligne, noms en double, boutons).
// Saisie rapide (1.8.92) : js/quick_logic.js (calculs, chargé avant ce fichier : tonnageMultiplier s'en sert) et
// js/quick_input.js (volet du bas sur téléphone, chargé après js/seance.js).

// ============================================================
// 1. CONSTANTES ET DONNÉES DU PROGRAMME
// ============================================================
// Exercices : le catalogue (js/catalogue.js, chargé avant ce fichier) fait référence. Chaque exercice a un
// identifiant stable (exId), un mode de saisie et ses réglages par défaut (séries, répétitions, repos).
// Anciens noms de l'application (jusqu'à 1.6.36) -> nom du catalogue, utilisés par la migration et l'import.
const EXERCISE_ALIASES = {
  "Leg Extension": "Leg extension",
  "Leg Curl": "Leg curl",
  "Oiseau (Arrière d'épaule)": "Oiseau",
  "Mollets / Finition": "Mollets machine",
  "Mollets": "Mollets machine",                          // 1.8.93 : son exercice se fait à la machine chargée de disques
  "Développé militaire": "Militaire haltères",           // 1.8.93 : son exercice se fait avec deux haltères
  "Développé militaire haltères": "Militaire haltères",  // 1.8.94 : nom de la 1.8.93, trop long pour tenir sur une ligne
  "Extension triceps à la poulie": "Extension triceps" // 1.7.76 : exercice retiré, déjà couvert par « Extension triceps »
};
// Identifiants retirés du catalogue -> identifiant qui les remplace (1.7.76 : 67 « Extension triceps à la poulie » -> 66)
const EXERCISE_ID_ALIASES = { 67: 66 };
const CATALOGUE_BY_ID = {};
const CATALOGUE_BY_NAME = {};
(typeof CATALOGUE !== 'undefined' ? CATALOGUE : []).forEach(e => { CATALOGUE_BY_ID[e.id] = e; CATALOGUE_BY_NAME[e.name] = e; });

// Rameur : exercice « cardio » (durée + distance, une seule ligne). Il est stocké avec weight/reps à 0
// (donc ignoré par tonnage, charges et records) et ses valeurs propres : seconds / meters.
const ROWER_NAME = 'Rameur';
const ROWER_DEFAULTS = { seconds: 270, meters: 1000 }; // proposés au tout premier rameur

// Programme fixe A/B/C de l'application jusqu'à 1.6.36 : sert uniquement à créer le programme
// « Hypertrophie » lors de la migration (voir migrateState), avec le même nombre de séries par exercice.
const LEGACY_PROGRAM = {
  A: { title: "Presse / Développé", exercises: [["Rameur", 1], ["Presse à cuisses", 4], ["Développé couché", 4], ["Tirage horizontal", 4], ["Militaire haltères", 3], ["Curl biceps", 3], ["Mollets machine", 3]] },
  B: { title: "Soulevé / Développé", exercises: [["Rameur", 1], ["Soulevé de terre", 4], ["Développé incliné", 4], ["Tirage vertical", 4], ["Tractions", 3], ["Élévations latérales", 3], ["Extension triceps", 3], ["Leg extension", 3]] },
  C: { title: "Fentes / Dips", exercises: [["Rameur", 1], ["Fentes marchées", 4], ["Dips", 4], ["Rowing unilatéral", 3], ["Oiseau", 3], ["Mollets machine", 3], ["Leg curl", 3]] }
};
const LEGACY_PROGRAM_ID = 'hypertrophie';
const LEGACY_PROGRAM_NAME = 'Hypertrophie';

// Séances d'un programme : 2 à 6, lettres A à F, chacune sa couleur (pastilles, graphiques)
const SESSION_KEYS = ['A', 'B', 'C', 'D', 'E', 'F'];
const SESSION_MIN = 2;
const SESSION_MAX = 6;
const SESSION_TYPE_COLORS = { A: '#1B6FD8', B: '#C2570C', C: '#C62B35', D: '#2E8B5E', E: '#6D5BD0', F: '#B8327A' };
const REST_DURATION = 90; // repos par défaut (s), pour un exercice hors catalogue

// Groupes proposés en filtre dans « Ajouter un exercice »
const EXERCISE_FILTERS = ['Tous', 'Polyarticulaires', 'Cardio', 'Pectoraux', 'Dos', 'Épaules', 'Jambes', 'Bras', 'Abdos'];

// Couleurs des graphiques : valeurs de repli (thème clair). Elles sont relues depuis
// les variables --chart-* de style.css à chaque changement de thème (voir readChartColors).
const CHART_COLORS = { primary: '#111114', success: '#0B7A43', volume: '#C2570C', tick: '#6B6B73', grid: '#EEEEF1', band: 'rgba(246, 213, 139, 0.45)', warn: '#92400E', trophy: '#E0A800' };

// 1.8.0 : petite plume (pictogramme du déload) sous les points des séances de déload, dans les graphiques
const DELOAD_PATHS = ['M20.2 12.2a6 6 0 0 0-8.5-8.5L5 10.5V19h8.5z', 'M16 8L2 22', 'M17.5 15H9'];
// 1.8.11 : badge (1.8.12, à la place du trophée réservé aux records) au-dessus du point de la charge max, étoile au-dessus du meilleur 1RM estimé
// 1.8.13 : médaille dorée « 1 » à rubans (dessin maison), en couleurs
const MEDAL_RIBBON = '#E0582C', MEDAL_RIBBON_DARK = '#B8401C', MEDAL_RIM = '#C99300', MEDAL_INK = '#7A5600';
const BADGE_SVG = '<svg class="medal" viewBox="0 0 24 24" aria-hidden="true">'
  + '<path d="M7.2 12.5 5 21.5l3.2-1.6 1.8 2.6 2-8.3z" fill="' + MEDAL_RIBBON + '"/>'
  + '<path d="M16.8 12.5 19 21.5l-3.2-1.6-1.8 2.6-2-8.3z" fill="' + MEDAL_RIBBON_DARK + '"/>'
  + '<circle cx="12" cy="9" r="7.5" fill="' + MEDAL_RIM + '"/><circle cx="12" cy="9" r="5.8" fill="var(--trophy)"/>'
  + '<path d="M10.6 7.2 12.6 5.8V12.4" fill="none" stroke="' + MEDAL_INK + '" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
// 1.8.14 : étoile à facettes (bordée, deux tons dorés)
const STAR_PATH = 'M12.00 3.00 L14.35 9.26 L21.04 9.56 L15.80 13.74 L17.58 20.19 L12.00 16.50 L6.42 20.19 L8.20 13.74 L2.96 9.56 L9.65 9.26Z';
const STAR_FACETS_LIGHT = ['M12.00 12.50 L9.65 9.26 L12.00 3.00Z', 'M12.00 12.50 L14.35 9.26 L21.04 9.56Z', 'M12.00 12.50 L15.80 13.74 L17.58 20.19Z', 'M12.00 12.50 L12.00 16.50 L6.42 20.19Z', 'M12.00 12.50 L8.20 13.74 L2.96 9.56Z'];
const STAR_FACETS_DARK = ['M12.00 12.50 L12.00 3.00 L14.35 9.26Z', 'M12.00 12.50 L21.04 9.56 L15.80 13.74Z', 'M12.00 12.50 L17.58 20.19 L12.00 16.50Z', 'M12.00 12.50 L6.42 20.19 L8.20 13.74Z', 'M12.00 12.50 L2.96 9.56 L9.65 9.26Z'];
const STAR_LIGHT = '#FFE08A', STAR_DARK = '#D9A21B', STAR_RIM = '#B88600';
const STAR_SVG = '<svg class="star3d" viewBox="0 0 24 24" aria-hidden="true"><path d="' + STAR_PATH + '" fill="' + STAR_RIM + '" stroke="' + STAR_RIM + '" stroke-width="1.6" stroke-linejoin="round"/>'
  + STAR_FACETS_LIGHT.map(p => '<path d="' + p + '" fill="' + STAR_LIGHT + '"/>').join('')
  + STAR_FACETS_DARK.map(p => '<path d="' + p + '" fill="' + STAR_DARK + '"/>').join('') + '</svg>';
function recordMarksPlugin(maxIdx, rmIdx, color) {
  return {
    id: 'recordMarks',
    afterDatasetsDraw(chart) {
      if (typeof Path2D === 'undefined') return;
      const { ctx: c, chartArea } = chart;
      const S = 20, k = S / 24, gap = 5;
      const at = (ds, i) => {
        const meta = chart.getDatasetMeta(ds);
        const pt = meta && meta.data ? meta.data[i] : null;
        if (i < 0 || !pt || pt.skip || !isFinite(pt.x) || !isFinite(pt.y)) return null;
        return { x: pt.x - S / 2, y: Math.max(pt.y - gap - S, chartArea.top - S) };
      };
      const draw = (p, fn) => { if (!p) return; c.save(); c.translate(p.x, p.y); c.scale(k, k); fn(); c.restore(); };
      c.save();
      c.strokeStyle = color; c.fillStyle = color; c.lineWidth = 2.2 / k; c.lineCap = 'round'; c.lineJoin = 'round';
      draw(at(0, maxIdx), () => {
        c.fillStyle = MEDAL_RIBBON; c.fill(new Path2D('M7.2 12.5 5 21.5l3.2-1.6 1.8 2.6 2-8.3z'));
        c.fillStyle = MEDAL_RIBBON_DARK; c.fill(new Path2D('M16.8 12.5 19 21.5l-3.2-1.6-1.8 2.6-2-8.3z'));
        c.fillStyle = MEDAL_RIM; c.beginPath(); c.arc(12, 9, 7.5, 0, 2 * Math.PI); c.fill();
        c.fillStyle = color; c.beginPath(); c.arc(12, 9, 5.8, 0, 2 * Math.PI); c.fill();
        c.strokeStyle = MEDAL_INK; c.lineWidth = 1.8; c.stroke(new Path2D('M10.6 7.2 12.6 5.8V12.4'));
        c.fillStyle = color; c.strokeStyle = color; c.lineWidth = 2.2 / k;
      });
      draw(at(1, rmIdx), () => {
        const st = new Path2D(STAR_PATH);
        c.fillStyle = STAR_RIM; c.strokeStyle = STAR_RIM; c.lineWidth = 1.6; c.lineJoin = 'round'; c.fill(st); c.stroke(st);
        c.fillStyle = STAR_LIGHT; STAR_FACETS_LIGHT.forEach(p => c.fill(new Path2D(p)));
        c.fillStyle = STAR_DARK; STAR_FACETS_DARK.forEach(p => c.fill(new Path2D(p)));
      });
      c.restore();
    }
  };
}

function deloadMarksPlugin(flags, color) {
  return {
    id: 'deloadMarks',
    afterDatasetsDraw(chart) {
      if (!flags || !flags.some(Boolean) || typeof Path2D === 'undefined') return;
      const meta = chart.getDatasetMeta(0);
      if (!meta || !meta.data) return;
      const { ctx: c, chartArea } = chart;
      const S = 14, k = S / 24, gap = 6; // 1.8.16 : 12 → 14 px
      const paths = DELOAD_PATHS.map(d => new Path2D(d));
      c.save();
      c.strokeStyle = color; c.lineWidth = 1.3 / k; c.lineCap = 'round'; c.lineJoin = 'round'; // 1.8.16 : trait 2,2 → 1,3 px, le trait intérieur se distingue
      meta.data.forEach((pt, i) => {
        if (!flags[i] || !pt || pt.skip || !isFinite(pt.x) || !isFinite(pt.y)) return;
        // à l'aplomb du point, en bas de la zone du graphique (ne chevauche pas la courbe) ;
        // au-dessus du point seulement si celui-ci est tout en bas
        let y = chartArea.bottom - S - 4;
        if (pt.y > y - gap) y = pt.y - gap - S;
        c.save(); c.translate(pt.x - S / 2, y); c.scale(k, k);
        paths.forEach(p => c.stroke(p));
        c.restore();
      });
      c.restore();
    }
  };
}

if (typeof Chart !== 'undefined') {
  Chart.defaults.font.family = "'Figtree', system-ui, sans-serif";
  Chart.defaults.font.size = 13; // 12 par défaut, +1 comme le reste de l'interface
  // 1.8.34 : l'interface est agrandie par un zoom CSS (--ui-zoom) : les graphiques sont dessinés d'autant plus finement,
  // sinon ils seraient agrandis comme une image (légèrement flous).
  try {
    const z = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ui-zoom')) || 1;
    Chart.defaults.devicePixelRatio = (window.devicePixelRatio || 1) * z;
  } catch (e) {}
  // 1.8.34 : avec ce zoom, Chart.js lit la position d'un appui en pixels agrandis : on la ramène à l'échelle du graphique
  // (écart mesuré sur le canevas lui-même), sinon la valeur affichée est celle d'un point voisin.
  Chart.register({
    id: 'uiZoomEvents',
    beforeEvent(chart, args) {
      const e = args.event, c = chart.canvas;
      if (!e || e.x == null || !c || !chart.width) return;
      const k = c.getBoundingClientRect().width / chart.width;
      if (!(k > 0) || Math.abs(k - 1) < 0.001) return;
      e.x /= k; e.y /= k;
      const a = chart.chartArea;
      if (a) args.inChartArea = e.x >= a.left && e.x <= a.right && e.y >= a.top && e.y <= a.bottom;
    }
  });
  Chart.defaults.color = CHART_COLORS.tick;
}

// La préférence est stockée sur l'appareil (h49_theme), hors de l'état exporté.
// Clair par défaut. Le script de index.html pose data-theme avant le premier affichage.
const THEME_KEY = 'h49_theme';

const THEME_BAR_COLORS = { light: '#FFFFFF', dark: '#0E0E11' };

const CHECK_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const MINUS_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12h12"/></svg>';
const PLUS_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6v12M6 12h12"/></svg>';
const CHEVRON_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';
// 1.7.96 : plume (semaine légère) à la place de l'éclair, partout où le déload apparaît
const DELOAD_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.2 12.2a6 6 0 0 0-8.5-8.5L5 10.5V19h8.5z"/><path d="M16 8L2 22"/><path d="M17.5 15H9"/></svg>';

const HISTORY_MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const HISTORY_DAYS = ['Dim.','Lun.','Mar.','Mer.','Jeu.','Ven.','Sam.'];
const HISTORY_MONTHS_SHORT = ['janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'];

// Titre affiché en haut de chaque onglet
const PAGE_TITLES = { programme: 'Programmes', seance: 'Séance', progression: 'Progression', historique: 'Historique', reglages: 'Réglages', fond: 'Fond d\'écran' };

// La saisie en cours (poids, reps, séries validées, nombre de séries, exercice ouvert, chrono)
// est copiée dans localStorage à chaque action et restaurée au rechargement de l'application
// (tirer pour rafraîchir, application fermée par le système...). Elle est effacée à l'enregistrement
// de la séance et abandonnée au bout de 24 h.
const DRAFT_KEY = 'h49_draft';
const DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

// Le poids corporel saisi (onglet Progression) a son propre brouillon, indépendant de la séance :
// enregistrer une séance ne doit pas l'effacer. Même durée de validité (24 h).
const WEIGHT_DRAFT_KEY = 'h49_draft_weight';

// Google Drive backup (co-auteur : Grok)
const GOOGLE_CLIENT_ID = '903120094308-phdlfg1rug8v6hn231n8b4uu7vfj65uf.apps.googleusercontent.com';
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const DRIVE_FOLDER_NAME = 'MON CARNET DE SALLE';
// Ancien nom du dossier (jusqu'à 1.7.5) : le dossier existant est renommé, ses sauvegardes restent dedans (1.7.6)
const DRIVE_FOLDER_LEGACY_NAMES = ['FITNESS AAP – Séances'];
const DRIVE_FOLDER_RENAMED_KEY = 'h49_drive_folder_renamed'; // identifiant du dossier déjà renommé sur cet appareil
const DRIVE_BACKUP_NAME = 'sauvegarde_complete.json';      // ancien fichier unique (jusqu'à 1.6.32) : encore lu et restaurable
// Versions (1.6.33, co-auteur : Claude) : chaque envoi crée un NOUVEAU fichier fitness-backup-AAAA-MM-JJ-HH-MM-SS.json,
// les DRIVE_BACKUP_KEEP plus récents sont conservés, les plus anciens sont mis à la corbeille du Drive.
const DRIVE_BACKUP_PREFIX = 'fitness-backup-';
const DRIVE_BACKUP_NAME_RE = /^fitness-backup-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}\.json$/;
const DRIVE_BACKUP_KEEP = 5;
const DRIVE_BACKUP_ID_KEY = 'h49_drive_backup_id';         // identifiant de la dernière sauvegarde connue de cet appareil
const DRIVE_LAST_HASH_KEY = 'h49_drive_last_hash';         // empreinte des données au dernier envoi réussi
const DRIVE_LAST_BACKUP_KEY = 'h49_drive_last_backup';     // date du dernier envoi réussi
const DRIVE_CONFLICT_KEY = 'h49_drive_conflict';           // une sauvegarde plus complète existe déjà sur le Drive
const DRIVE_TOKEN_KEY = 'h49_drive_token';
const DRIVE_FOLDER_ID_KEY = 'h49_drive_folder_id';
const DRIVE_ACCOUNT_KEY = 'h49_drive_account';
const DRIVE_WANTED_KEY = 'h49_drive_wanted'; // '1' tant que l'utilisateur n'a pas cliqué « Déconnecter »
const DRIVE_OAUTH_STATE_KEY = 'h49_drive_oauth_state';   // anti-falsification de la connexion par redirection (appli installée)
const DRIVE_ERROR_KEY = 'h49_drive_error';   // dernière réponse d'erreur de Google pour le dossier / l'envoi (ex. « 403 accessNotConfigured »)

// Mises à jour : délai minimal entre deux vérifications automatiques (retour au premier plan)
const UPDATE_CHECK_MIN_INTERVAL_MS = 30 * 60 * 1000;

// ============================================================
// 2. ÉTAT DE L'APPLICATION (variables globales)
// ============================================================
// Données de l'application (historique, poids, dernières charges) : remplacées seulement par initApp, importData et resetData
let state = null;

// Chronos : minuteries en cours et secondes écoulées de la séance
let restTimerInterval = null;
let workoutTimerInterval = null;
let workoutSeconds = 0;

// Graphiques : instances Chart.js (gardées pour les détruire avant de redessiner) et état des boutons de filtre
let tonnageChart, exerciseChart, weightChart, cardioChart;
let volumeCalendarMode = false; // false : un point par séance ; true : une colonne par jour (écarts visibles, défilement horizontal)
let currentVolumeFilter = 'all'; // 'all' (séances), 'month' (par mois) ou 'type' (séance A/B/C)
let currentSessionTypeFilter = 'A';
let currentExMetricMode = 'max';

// Thème : écouteur du réglage clair/sombre du téléphone
let themeMediaQuery = null;

// Modification d'une séance : editingOriginalId est l'interrupteur (null = création) ; clearEditState() remet le tout à zéro
let selectedSessionIndex = null;
let editingOriginalDate = null;
let editingOriginalId = null;
let editingOriginalDuration = null;
let editingOriginalIsDeload = false;

// Accordéon des exercices de la Séance
// Exercice ouvert à la main : undefined = automatique (premier exercice non terminé),
// un index = ouvert par l'utilisateur, -1 = tout replié.
let manualOpenExercise;
let scrollOnNextRefresh = false;
let lastOpenExerciseIdx = null;

// Séance affichée dans l'onglet Séance : { programId, programName, kind, key, sessionName, draftKey,
// exercises: [{ name, exId, seriesCount }] } ; null = rien d'actif (écran « Aucune séance prévue »)
let workoutDef = null;

// Brouillon : verrou posé pendant la restauration (évite d'écrire un brouillon en le relisant)
let draftRestoring = false;

// Mises à jour : version exécutée par cette page (lue au démarrage), dernière version annoncée
// par le service worker, et heure de la dernière vérification
let runningVersion = null;
let activeVersion = null;
let lastUpdateCheck = 0;

// ============================================================
// 4. DONNÉES : SAUVEGARDE ET OUTILS COMMUNS
// ============================================================
function writeLocalState(data) {
  localStorage.setItem('h49_state', JSON.stringify(data));
}

function saveState() {
  if (state && state.history) {
    state.history.sort((a, b) => new Date(a.date) - new Date(b.date));
  }
  writeLocalState(state);
  scheduleDriveSync(); // Google Drive : la sauvegarde complète suit les modifications (si l'accès est valide)
}

function clearEditState() {
  editingOriginalDate = null;
  editingOriginalId = null;
  editingOriginalDuration = null;
  editingOriginalIsDeload = false;
  selectedSessionIndex = null;
}

// 1.8.92 (co-auteur : Claude) : tonnage juste avec deux haltères. La série garde le poids d'un haltère (comme sur
// l'haltère en salle : records et courbes inchangés) ; le tonnage compte les deux (× 2), anciennes séances comprises.
function tonnageMultiplier(name) { return typeof QuickLogic !== 'undefined' ? QuickLogic.weightMultiplierFor(canonicalExerciseName(String(name || ''))) : 1; }

function recalculateHistoryTonnages() {
  if (!state || !state.history) return;

  state.history.forEach(session => {
    let sessionTonnage = 0;

    if (session.exercises) {
      session.exercises.forEach(ex => {
        let exVolume = 0;
        let maxW = 0;
        const mult = tonnageMultiplier(ex.name);

        if (ex.sets && Array.isArray(ex.sets)) {
          ex.sets.forEach(set => {
            const w = parseFloat(set.weight) || 0;
            const r = parseFloat(set.reps) || 0;
            const setVol = w * r * mult;

            exVolume += setVol;
            if (w > maxW) maxW = w;
          });
        }

        ex.totalVolume = Math.round(exVolume * 10) / 10;
        ex.maxWeight = maxW;
        sessionTonnage += exVolume;
      });
    }

    session.tonnage = Math.round(sessionTonnage);
  });

  state.history.sort((a, b) => new Date(a.date) - new Date(b.date));
}

// --- Exercices du catalogue ---
function canonicalExerciseName(name) {
  return EXERCISE_ALIASES[name] || name;
}

// Fiche d'un exercice (par identifiant ou par nom) ; un nom hors catalogue reçoit des réglages neutres
function exInfo(ref) {
  if (typeof ref === 'number' && EXERCISE_ID_ALIASES[ref]) ref = EXERCISE_ID_ALIASES[ref];
  if (typeof ref === 'number' && CATALOGUE_BY_ID[ref]) return CATALOGUE_BY_ID[ref];
  const name = canonicalExerciseName(String(ref == null ? '' : ref));
  return CATALOGUE_BY_NAME[name] || { id: null, name, group: '', mode: 'weight', sets: 3, reps: '8–12', rest: REST_DURATION };
}

// 1.8.78 (co-auteur : Claude) : objectif d'un programme (« Avec notre aide »). La force et l'endurance ont leurs propres
// répétitions et repos ; sans objectif (programmes faits à la main) ou pour les autres objectifs, ceux du catalogue.
//   force : polyarticulaires lourds 3–6 réps, 3:00 ; autres polyarticulaires 6–8 réps, 2:30 (ACSM 2009 et 2026)
//   endurance : 15–20 réps, 1:00 sur les polyarticulaires, 0:45 sur l'isolation (ACSM 2009)
// Abdos, gainage, exercices en durée et cardio gardent toujours les réglages du catalogue.
const PROGRAM_GOALS = ['masse', 'force', 'forme', 'endurance', 'gras'];
function goalPrescription(ref, goal) {
  const info = typeof ref === 'object' && ref ? ref : exInfo(ref);
  const base = { reps: info.reps, rest: info.rest };
  if (!goal || info.cardio || info.mode === 'time' || info.group === 'Abdos' || info.group === 'Cardio') return base;
  if (goal === 'force') {
    if (!info.poly) return base;
    return (info.rest || 0) >= 180 ? { reps: '3–6', rest: 180 } : { reps: '6–8', rest: 150 };
  }
  if (goal === 'endurance') return { reps: '15–20', rest: info.poly ? 60 : 45 };
  return base;
}
function activePrescription(name) {
  const p = typeof getActiveProgram === 'function' ? getActiveProgram() : null;
  return goalPrescription(exInfo(name), p && p.goal);
}

function exMode(name) { return exInfo(name).mode; }
function isCardioName(name) { return !!exInfo(name).cardio; }
function isCardioDistName(name) { const e = exInfo(name); return !!e.cardio && e.mode === 'dist'; }

// Valeur proposée la première fois, dans la fourchette du catalogue (« 6–10 » -> 8, « 8–12 » -> 10…) ;
// pour un exercice en durée (gainage « 20–45 s »), une durée en secondes.
const DEFAULT_REPS = { '3–6': 5, '6–8': 7, '6–10': 8, '8–12': 10, '10–15': 12, '12–15': 12, '8–15': 10, '15–20': 15, '20–30': 20, '20–45 s': 30 };
function defaultRepsFor(name) {
  const r = activePrescription(name).reps || '';
  if (DEFAULT_REPS[r] !== undefined) return DEFAULT_REPS[r];
  const m = /^(\d+)/.exec(r);
  return m ? +m[1] : '';
}

// Icône d'un exercice : PNG de l'application, sinon pictogramme générique (pouls pour le cardio, haltère sinon)
const GENERIC_CARDIO_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12h4l2.5-6 4 12 2.5-6H21"/></svg>';
const GENERIC_STRENGTH_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11"/></svg>';
function getIcon(exName, decorative = false) {
  const e = exInfo(exName);
  // 1.7.84 : data-ex = l'exercice, pour ouvrir sa fiche par un appui long (js/fiches.js)
  const ref = escapeHtml(e.name || String(exName));
  if (e.icon) return `<img src="${e.icon}" alt="${decorative ? '' : escapeHtml(e.name)}" data-ex="${ref}" draggable="false">`;
  const cardio = e.group === 'Cardio';
  return `<span class="ex-generic${cardio ? ' cardio' : ''}" data-ex="${ref}"${decorative ? ' aria-hidden="true"' : ` role="img" aria-label="${escapeHtml(e.name)}"`}>${cardio ? GENERIC_CARDIO_SVG : GENERIC_STRENGTH_SVG}</span>`;
}

function escapeHtml(str) {
  return String(str == null ? '' : str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// --- Programmes et séances libres ---
// state.programs : [{ id, name, kind: 'program' | 'libre', status: 'active' | 'paused' | 'new', createdAt, activatedAt,
//   pausedAt, savedAt, nextKey, sessions: [{ key: 'A'..'F' ('' pour une séance libre), name, exercises: [{ exId, sets }] }] }]
// Un seul élément est actif à la fois. Chaque séance de l'historique garde une copie du nom de son programme.
function getPrograms(data = state) { return (data && Array.isArray(data.programs)) ? data.programs : []; }
function getProgram(id) { return getPrograms().find(p => p.id === id) || null; }
function getActiveProgram(data = state) { return getPrograms(data).find(p => p.status === 'active') || null; }
function newProgramId() { return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function isLibre(p) { return !!p && p.kind === 'libre'; }

function programExerciseCount(p) {
  return (p.sessions || []).reduce((n, s) => n + (s.exercises || []).length, 0);
}
function sessionSetCount(session) {
  return (session.exercises || []).reduce((n, e) => n + (exInfo(e.exId).cardio ? 1 : (e.sets || 1)), 0);
}

function sessionLabel(p, session) {
  if (!session) return '';
  if (isLibre(p)) return p.name;
  return session.name && session.name.trim() ? session.name.trim() : `Séance ${session.key}`;
}

// Séance suivante de la rotation : celle qui suit la dernière séance faite de ce programme
function nextKeyFromHistory(p, history = state && state.history) {
  if (!p || isLibre(p) || !p.sessions.length) return p && p.sessions[0] ? p.sessions[0].key : '';
  const keys = p.sessions.map(s => s.key);
  const hist = (history || []).filter(h => h.programId === p.id && keys.includes(h.sessionKey));
  if (!hist.length) return keys.includes(p.nextKey) ? p.nextKey : keys[0];
  const last = hist.slice().sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : (a.id || 0) - (b.id || 0))).pop();
  return keys[(keys.indexOf(last.sessionKey) + 1) % keys.length];
}

// Séance que l'onglet Séance doit charger : celle de l'élément actif (null si rien n'est actif)
function currentSessionDef() {
  const p = getActiveProgram();
  if (!p || !p.sessions || !p.sessions.length) return null;
  const session = isLibre(p) ? p.sessions[0] : (p.sessions.find(s => s.key === p.nextKey) || p.sessions[0]);
  return { program: p, session, key: isLibre(p) ? '' : session.key };
}

// Compatibilité : nextType reste renseigné (anciennes sauvegardes, import) avec la séance suivante du programme actif
function syncNextType(data = state) {
  const p = getActiveProgram(data);
  data.nextType = p && !isLibre(p) && p.nextKey ? p.nextKey : 'A';
}

// Pastille d'une séance de l'historique (lettre de couleur ou « 1× » sable)
function sessionPillHtml(h, small = true) {
  if (h && h.kind === 'libre') return `<span class="type-pill type-pill-libre${small ? ' small' : ''}">1×</span>`;
  const k = h && SESSION_KEYS.includes(h.sessionKey || h.type) ? (h.sessionKey || h.type) : 'A';
  return `<span class="type-pill type-pill-${k}${small ? ' small' : ''}">${k}</span>`;
}
function programPillHtml(p, key, cls = '') {
  if (isLibre(p)) return `<span class="type-pill type-pill-libre ${cls}">1×</span>`;
  return `<span class="type-pill type-pill-${key} ${cls}">${key}</span>`;
}

// --- Migration (une seule fois, à l'ouverture de la nouvelle version ou à l'import d'une ancienne sauvegarde) ---
// L'historique existant est rattaché au programme « Hypertrophie » (séances A, B, C du programme fixe), les noms
// d'exercices passent à ceux du catalogue (avec leur exId). Contrôle : nombre de séances, tonnage total et records
// identiques avant et après ; sinon on revient à la copie d'origine et l'erreur est signalée.
function historyFingerprint(s) {
  const hist = Array.isArray(s.history) ? s.history : [];
  let tonnage = 0;
  const records = {};
  hist.forEach(h => {
    (h.exercises || []).forEach(ex => {
      const name = canonicalExerciseName(ex.name);
      (ex.sets || []).forEach(set => {
        const w = parseFloat(set.weight) || 0, r = parseFloat(set.reps) || 0;
        tonnage += w * r;
        if (w > (records[name] || 0)) records[name] = w;
      });
    });
  });
  return JSON.stringify({ n: hist.length, t: Math.round(tonnage), r: Object.keys(records).sort().map(k => k + ':' + records[k]) });
}

function legacyProgramFromHistory(s) {
  const sessions = SESSION_KEYS.slice(0, 3).map(k => ({
    key: k,
    name: LEGACY_PROGRAM[k].title,
    exercises: LEGACY_PROGRAM[k].exercises.map(([name, sets]) => ({ exId: exInfo(name).id, sets }))
  }));
  const now = new Date().toISOString();
  return {
    id: LEGACY_PROGRAM_ID, name: LEGACY_PROGRAM_NAME, kind: 'program', status: 'active',
    createdAt: now, activatedAt: now, pausedAt: null, savedAt: now,
    nextKey: ['A', 'B', 'C'].includes(s.nextType) ? s.nextType : 'A',
    sessions
  };
}

// Renvoie { state, migrated, error }. Ne touche pas à localStorage.
function migrateState(s) {
  if (!s || typeof s !== 'object') return { state: s, migrated: false };
  if (!Array.isArray(s.history)) s.history = [];
  if (!Array.isArray(s.weights)) s.weights = [];
  if (!s.lastWeights || typeof s.lastWeights !== 'object') s.lastWeights = {};
  if (s.schema >= 2 && Array.isArray(s.programs)) return { state: s, migrated: false };

  const original = JSON.stringify(s);
  const before = historyFingerprint(s);
  try {
    const m = JSON.parse(original);
    const hasHistory = m.history.length > 0;
    m.programs = Array.isArray(m.programs) ? m.programs : [];
    if (hasHistory && !m.programs.some(p => p.id === LEGACY_PROGRAM_ID)) m.programs.push(legacyProgramFromHistory(m));
    m.history.forEach(h => {
      const key = ['A', 'B', 'C'].includes(h.type) ? h.type : 'A';
      if (!h.programId) {
        h.programId = LEGACY_PROGRAM_ID; h.programName = LEGACY_PROGRAM_NAME; h.kind = 'program';
        h.sessionKey = key; h.sessionName = LEGACY_PROGRAM[key].title;
      }
      (h.exercises || []).forEach(ex => {
        ex.name = canonicalExerciseName(ex.name);
        const info = exInfo(ex.name);
        if (info.id) ex.exId = info.id;
      });
    });
    const lw = {};
    Object.keys(m.lastWeights).forEach(k => { lw[canonicalExerciseName(k)] = m.lastWeights[k]; });
    m.lastWeights = lw;
    if (!m.deload || typeof m.deload !== 'object') m.deload = { shift: 0, postponedAt: null };
    m.schema = 2;
    const after = historyFingerprint(m);
    if (after !== before) throw new Error('contrôle après migration différent : ' + before + ' / ' + after);
    return { state: m, migrated: true };
  } catch (e) {
    console.error('Migration des programmes annulée', e);
    return { state: JSON.parse(original), migrated: false, error: e };
  }
}

// Programmes cohérents : un seul actif, rotation valide, séances libres avec une seule séance
// Exercices retirés du catalogue (1.7.76) : programmes, historique et dernières charges passent à l'exercice
// qui les remplace (« Extension triceps à la poulie » -> « Extension triceps »). Sans effet s'il n'y a rien à changer.
function mergeRemovedExercises() {
  if (!state) return;
  (state.programs || []).forEach(p => (p.sessions || []).forEach(se => (se.exercises || []).forEach(e => {
    if (EXERCISE_ID_ALIASES[e.exId]) e.exId = EXERCISE_ID_ALIASES[e.exId];
  })));
  (state.history || []).forEach(h => (h.exercises || []).forEach(ex => {
    const name = canonicalExerciseName(ex.name);
    if (name !== ex.name) ex.name = name;
    if (EXERCISE_ID_ALIASES[ex.exId]) ex.exId = EXERCISE_ID_ALIASES[ex.exId];
  }));
  const lw = state.lastWeights;
  if (lw && typeof lw === 'object') Object.keys(lw).forEach(k => {
    const name = canonicalExerciseName(k);
    if (name !== k) { if (lw[name] === undefined) lw[name] = lw[k]; delete lw[k]; }
  });
}

function normalizePrograms() {
  if (!state) return;
  mergeRemovedExercises();
  if (!Array.isArray(state.programs)) state.programs = [];
  if (!state.deload || typeof state.deload !== 'object') state.deload = { shift: 0, postponedAt: null };
  let seenActive = false;
  state.programs.forEach(p => {
    if (!Array.isArray(p.sessions)) p.sessions = [];
    if (p.status === 'active') { if (seenActive) p.status = 'paused'; seenActive = true; }
    if (!['active', 'paused', 'new'].includes(p.status)) p.status = 'paused';
    if (!isLibre(p)) {
      p.sessions.forEach((s, i) => { s.key = SESSION_KEYS[i]; });
      if (!p.sessions.some(s => s.key === p.nextKey)) p.nextKey = p.sessions[0] ? p.sessions[0].key : 'A';
    }
  });
  syncNextType();
}

function formatDate(dateStr) {
  if(!dateStr) return '';
  const parts = dateStr.split('-');
  if(parts.length === 3) return `${parts[2]}/${parts[1]}`;
  return dateStr;
}

// 270 -> « 4:30 »
function formatDurationMS(sec) {
  sec = Math.max(0, Math.round(Number(sec) || 0));
  const s = sec % 60;
  return `${Math.floor(sec / 60)}:${s < 10 ? '0' : ''}${s}`;
}

// « 4:30 » -> 270 ; un nombre seul est lu en minutes (« 5 » -> 300) ; sinon NaN
function parseDurationInput(str) {
  const t = String(str == null ? '' : str).trim();
  let m = t.match(/^(\d{1,3}):([0-5]\d)$/);
  if (m) return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  m = t.match(/^(\d{1,3})([.,]\d+)?$/);
  if (m) return Math.round(parseFloat(t.replace(',', '.')) * 60);
  return NaN;
}

// Allure au km (secondes) : 255 s pour 1 050 m -> 243 s/km
function paceSecPerKm(seconds, meters) {
  const sec = Number(seconds), m = Number(meters);
  return sec > 0 && m > 0 ? Math.round(sec * 1000 / m) : 0;
}

// Cardio : valeur calculée sous la saisie, selon l'usage courant de l'appareil
//   pace500 : allure /500 m (rameur, ski trainer) · pacekm : allure /km (tapis) · kmh : vitesse (vélos) · floorsmin : étages/min
// Le nombre renvoyé sert aux graphiques (plus bas = mieux pour une allure, plus haut = mieux pour une vitesse).
const CARDIO_UNITS = {
  pace500: { label: 'Allure', suffix: '/500 m', lowerIsBetter: true, value: (sec, amt) => (sec > 0 && amt > 0 ? sec * 500 / amt : 0), fmt: v => formatDurationMS(v) },
  pacekm: { label: 'Allure', suffix: '/km', lowerIsBetter: true, value: (sec, amt) => (sec > 0 && amt > 0 ? sec * 1000 / amt : 0), fmt: v => formatDurationMS(v) },
  kmh: { label: 'Vitesse', suffix: 'km/h', lowerIsBetter: false, value: (sec, amt) => (sec > 0 && amt > 0 ? (amt / 1000) / (sec / 3600) : 0), fmt: v => v.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) },
  floorsmin: { label: 'Rythme', suffix: 'étages/min', lowerIsBetter: false, value: (sec, amt) => (sec > 0 && amt > 0 ? amt / (sec / 60) : 0), fmt: v => v.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) }
};
function cardioUnit(name) { return CARDIO_UNITS[exInfo(name).unit] || null; }
// Distance saisie en kilomètres pour le tapis et les vélos, en mètres pour le rameur et le ski trainer
function distanceInKm(name) { const u = exInfo(name).unit; return u === 'pacekm' || u === 'kmh'; }
function cardioAmount(name, set) { return exInfo(name).mode === 'floors' ? Number(set.floors) || 0 : Number(set.meters) || 0; }
function cardioMetric(name, set) {
  const u = cardioUnit(name);
  return u ? u.value(Number(set.seconds) || 0, cardioAmount(name, set)) : 0;
}
function cardioMetricText(name, v) {
  const u = cardioUnit(name);
  return u && v > 0 ? `${u.fmt(v)} ${u.suffix}` : '–';
}

// 1.7.89 : ce qui fait un record, par exercice. Cardio avec distance ou étages : la meilleure allure (rameur, ski,
// tapis : plus bas = mieux) ou la meilleure vitesse / le meilleur rythme (vélos, stair climber : plus haut = mieux),
// jamais la durée (plus long ≠ record). Durée seule (planche, corde à sauter) : la plus longue. Charge : la plus lourde.
// Le poids du corps a sa propre règle (lest puis répétitions, bestBodyweightSet). null = pas de record pour cet exercice.
function recordRule(name, cardio) {
  const e = exInfo(name), mode = exMode(name);
  const u = (cardio || e.cardio) ? cardioUnit(name) : null;
  if (u) return { kind: 'pace', lower: !!u.lowerIsBetter, val: st => cardioMetric(name, st) };
  if (cardio || e.cardio || mode === 'time') return { kind: 'time', lower: false, val: st => Number(st.seconds) || 0 };
  if (mode === 'weight') return { kind: 'weight', lower: false, val: st => Number(st.weight) || 0 };
  return null;
}
// Meilleure valeur d'une liste de séries selon la règle (0 = aucune valeur exploitable)
function recordBest(rule, sets) {
  const vals = (sets || []).map(rule.val).filter(v => v > 0);
  if (!vals.length) return 0;
  return rule.lower ? Math.min(...vals) : Math.max(...vals);
}
function recordBeats(rule, cur, prev) { return cur > 0 && (rule.lower ? (prev > 0 && cur < prev) : cur > prev); }
// Textes d'un record : valeur et gain (« 2:05 /500 m » et « −0:03 », « 85 kg » et « +2,5 kg »)
function recordTexts(name, rule, cur, prev) {
  const kg = v => `${String(Math.round(v * 100) / 100).replace('.', ',')} kg`;
  if (rule.kind === 'pace') {
    const u = cardioUnit(name);
    const d = Math.abs(cur - prev);
    return { value: cardioMetricText(name, cur), gain: rule.lower ? `−${u.fmt(d)}` : `+${u.fmt(d)}` };
  }
  if (rule.kind === 'time') return { value: formatDurationMS(cur), gain: '+' + formatDurationMS(cur - prev) };
  return { value: kg(cur), gain: '+' + kg(cur - prev) };
}
// Montant saisi (champ de droite) -> mètres ou étages
function parseCardioAmount(name, str) {
  const v = parseFloat(String(str == null ? '' : str).replace(',', '.'));
  if (!(v > 0)) return NaN;
  if (exInfo(name).mode === 'floors') return Math.round(v);
  return distanceInKm(name) ? Math.round(v * 1000) : Math.round(v);
}
function formatCardioAmountInput(name, set) {
  if (exInfo(name).mode === 'floors') return set.floors != null ? String(set.floors) : '';
  if (set.meters == null || set.meters === '') return '';
  return distanceInKm(name) ? String(Math.round(Number(set.meters) / 10) / 100) : String(set.meters);
}
function cardioRowText(name, durationStr, amountStr) {
  const sec = parseDurationInput(durationStr), amt = parseCardioAmount(name, amountStr);
  const u = cardioUnit(name);
  return u ? cardioMetricText(name, u.value(sec, amt)) : '–';
}
function cardioPaceText(durationStr, meters) {
  return cardioRowText(ROWER_NAME, durationStr, meters);
}

// Saisie de la durée au pavé numérique (pas de « : » dessus) : « 430 » -> « 4:30 », « 1015 » -> « 10:15 »
function formatDurationDigits(value) {
  const digits = String(value).replace(/\D/g, '').slice(-5).replace(/^0+(?=\d)/, '');
  return digits === '' ? '' : (digits.length <= 2 ? `0:${digits.padStart(2, '0')}` : `${digits.slice(0, -2)}:${digits.slice(-2)}`);
}
function onDurationInput(el) { el.value = formatDurationDigits(el.value); }
function onCardioInput(el) {
  const row = el.closest('.set-row');
  const dEl = row.querySelector('.weight-input');
  if (el === dEl) dEl.value = formatDurationDigits(dEl.value);
  // 1.8.104 : la pastille sous la ligne porte le chronomètre, puis la cadence une fois la série validée (js/chronos.js)
  refreshCardioChrono();
}

function isPerformedCardioSet(set) {
  if (!set || !((parseFloat(set.seconds) || 0) > 0)) return false;
  if (set.meters !== undefined) return (parseFloat(set.meters) || 0) > 0;
  if (set.floors !== undefined) return (parseFloat(set.floors) || 0) > 0;
  return true; // durée seule (corde à sauter)
}

// Série réellement faite : poids × réps, poids du corps + lest (« lest » présent), réps seules (« free ») ou durée (« hold »)
function isPerformedSet(set) {
  if (!set) return false;
  const w = parseFloat(set.weight) || 0, r = parseFloat(set.reps) || 0;
  if (set.hold) return (parseFloat(set.seconds) || 0) > 0;
  if (set.free || set.lest !== undefined) return r > 0;
  return w > 0 && r > 0;
}

// Poids corporel le plus récent (onglet Progression), ou null
function latestBodyWeight() {
  const w = state && Array.isArray(state.weights) ? state.weights.filter(x => (parseFloat(x.weight) || 0) > 0) : [];
  return w.length ? parseFloat(w[w.length - 1].weight) : null;
}
// « PDC », « PDC +10 kg », « PDC −20 kg »
function lestText(lest) {
  const l = parseFloat(lest) || 0;
  if (l === 0) return 'PDC';
  return `PDC ${l > 0 ? '+' : '−'}${String(Math.abs(l)).replace('.', ',')} kg`;
}

// ============================================================
// 5. DÉLOAD (SEMAINE DE RELÂCHE)
// ============================================================
// Déload global (tous programmes confondus) : séances 10, 11 et 12 de chaque cycle de 12.
// « Reporter à la prochaine séance » décale le cycle d'une séance (state.deload.shift) ; tant que la séance en
// cours n'est pas enregistrée (postponedAt = nombre de séances au moment du report), le report peut être annulé.
function deloadCycleNumber() {
  const shift = state && state.deload ? (parseInt(state.deload.shift, 10) || 0) : 0;
  return (state && state.history ? state.history.length : 0) + 1 - shift;
}
function checkDeloadStatus() {
  if (!state || !state.history) return false;
  const n = deloadCycleNumber();
  return n > 0 && (n % 12 === 0 || (n % 12 >= 10));
}
function isDeloadPostponed() {
  return !!(state && state.deload && state.deload.postponedAt !== null && state.deload.postponedAt !== undefined
    && state.deload.postponedAt === state.history.length);
}
async function openDeloadInfo() { // 1.7.96
  if (!isDeloadActive() || editingOriginalId !== null) return;
  const choix = await askSheet({ tone: 'info', title: 'Déload −20 %',
    text: 'Le déload (appelé semaine de décharge) est automatiquement proposé toutes les 12 séances. Il permet aux muscles de récupérer. Si tu te sens vraiment bien, tu peux le reporter à la prochaine séance.',
    ok: 'Suivre le conseil de déload', cancel: 'Reporter', cancelValue: 'reporter' });
  if (choix === 'reporter') postponeDeload(); // « Suivre le conseil » ou fermer : le déload reste
}
function postponeDeload() {
  if (!state || !checkDeloadStatus() || editingOriginalId !== null) return;
  if (!state.deload) state.deload = { shift: 0, postponedAt: null };
  state.deload.shift = (parseInt(state.deload.shift, 10) || 0) + 1;
  state.deload.postponedAt = state.history.length;
  saveState();
  refreshDeloadUi();
}
function cancelDeloadPostpone() {
  if (!isDeloadPostponed()) return;
  state.deload.shift = Math.max(0, (parseInt(state.deload.shift, 10) || 0) - 1);
  state.deload.postponedAt = null;
  saveState();
  refreshDeloadUi();
}
// Les charges proposées dépendent du déload : on recrée le formulaire (le brouillon garde la saisie déjà faite)
function refreshDeloadUi() {
  saveDraft();
  initWorkoutForm();
  if (document.body.dataset.tab === 'programme') renderProgramOverview();
}

function isDeloadActive() {
  // En modification, on conserve le statut de déload d'origine de la séance
  if (editingOriginalId !== null) return !!editingOriginalIsDeload;
  return checkDeloadStatus();
}

// Affiche une bannière d'alerte en haut de l'application si on est en semaine de déload
function displayDeloadNotificationIfNeeded() {
  // Supprimé ou vidé car la mention est maintenant intégrée directement au titre de la séance (seance-type-title)
  const existingBanner = document.getElementById('deload-banner');
  if (existingBanner) existingBanner.remove();
}

// ============================================================
// 6. ÉCRAN PROGRAMME
// ============================================================
// L'écran Programme (programmes sur mesure, séances libres) est dans js/programmes.js.

// ============================================================
// 14. NAVIGATION ET DISPOSITION
// ============================================================
// Hauteurs de l'en-tête et du bloc fixe de l'onglet Séance (positionnement collant + marge de défilement)
function updateStickyOffsets() {
  const header = document.querySelector('header');
  const sticky = document.getElementById('seance-sticky');
  if (!header || !sticky) return;
  const hh = header.offsetHeight;
  const root = document.documentElement.style;
  root.setProperty('--header-h', hh + 'px');
  root.setProperty('--sticky-total', hh + 'px'); // l'en-tête contient désormais la bannière
}

window.addEventListener('resize', updateStickyOffsets);

if (typeof ResizeObserver !== 'undefined') {
  const stickyObserver = new ResizeObserver(updateStickyOffsets);
  const h0 = document.querySelector('header'), s0 = document.getElementById('seance-sticky');
  if (h0) stickyObserver.observe(h0);
  if (s0) stickyObserver.observe(s0);
}

// 1.8.36 : Réglages s'ouvre depuis l'Historique ou la Progression (roue dentée en haut à droite) ;
// on retient l'onglet d'origine pour l'icône allumée dans la barre du bas et pour « Retour ».
// 1.8.95 (co-auteur : Claude) : la Séance n'a plus d'onglet ; elle s'ouvre depuis Programmes (« C'est parti ») ou depuis
// l'Historique (modifier une séance), et c'est l'onglet d'origine qui reste allumé. Réglages a son propre onglet.
let seanceFrom = 'programme';
function switchTab(tabName) {
  if (tabName === 'seance') seanceFrom = editingOriginalId !== null ? 'historique' : 'programme';
  if (tabName === 'reglages') loadGoogleIdentity(); // 1.7.65 : préchargé avant un appui sur « Se connecter »
  if (tabName === 'reglages') { const n = document.getElementById('settings-name'); if (n && typeof userName === 'function') n.value = userName(); } // 1.8.62
  document.querySelectorAll('.container').forEach(c => c.classList.remove('active'));
  document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));

  const targetContainer = document.getElementById(`tab-${tabName}`);
  // Fond d'écran est une page de Réglages ; la Séance garde allumé l'onglet d'où elle a été ouverte
  const navName = tabName === 'fond' ? 'reglages' : tabName === 'seance' ? seanceFrom : tabName;
  const targetNav = document.getElementById(`nav-${navName}`);
  if(targetContainer) targetContainer.classList.add('active');
  const scroller = document.getElementById('app-scroll');
  if (scroller) scroller.scrollTop = 0;
  if(targetNav) targetNav.classList.add('active');

  const timerBtn = document.getElementById('timer-btn');
  if (timerBtn) {
    if (tabName === 'seance' && workoutDef) {
      timerBtn.style.display = 'flex';
    } else {
      timerBtn.style.display = 'none';
    }
  }

  document.body.dataset.tab = tabName;
  const seanceBack = document.getElementById('seance-back');
  if (seanceBack) seanceBack.setAttribute('aria-label', seanceFrom === 'historique' ? "Retour à l'historique" : 'Retour aux programmes');
  updateStickyOffsets();
  const pageTitle = document.getElementById('page-title');
  if (pageTitle) pageTitle.innerText = PAGE_TITLES[tabName] || '';
  // 1.8.83 (co-auteur : Claude) : en modification d'une séance de l'historique, le formulaire déjà chargé est gardé
  // (sinon il était remplacé par la séance du programme en cours, cas d'un programme en pause)
  if (tabName === 'seance') { if (editingOriginalId === null) initWorkoutForm(); updateSeancePageTitle(); }
  if (tabName === 'historique' && pageTitle) pageTitle.innerText = historyTitle(); // 1.7.75

  if (tabName === 'programme') renderProgramOverview();
  updateProgramHeader();
  if (tabName === 'progression') { populateExerciseSelect(); renderCharts(); }
  if (tabName === 'fond') renderWallpaperGrid();
  if (tabName === 'reglages') {
    updateDriveUI(); // le jeton Drive a pu expirer depuis l'ouverture de l'appli
    if (isDriveConnected() && !getDriveAccount()) fetchDriveAccount(); // nouvel essai de lecture de l'adresse
    if (isDriveConnected()) {
      probeDriveAccess(); // vérifie que Google autorise bien l'accès à Drive
      syncDriveBackup();  // crée le dossier / envoie la sauvegarde complète si ce n'est pas encore fait
    }
  }
}

// 1.8.95 : flèche retour de la Séance. La séance en cours continue (chrono qui tourne) ; on y revient par la tuile.
function leaveSeance() {
  if (seanceFrom === 'historique') switchTab('historique'); else goProgramsHome();
}
// « C'est parti » : la séance s'ouvre et son chrono démarre tout de suite (déjà lancé : il continue).
function startSeance() {
  switchTab('seance');
  if (workoutDef) startWorkoutTimer();
}


// ============================================================
// 17. DÉMARRAGE
// ============================================================
// 1.8.26 (co-auteur : Claude) : demande à Chrome un stockage « persistant », pour qu'il ne vide pas de lui-même
// les données du site (programmes, historique…) quand le téléphone manque de place. Invisible : rien n'est affiché,
// Chrome accepte ou refuse seul ; sans l'API (vieux navigateur) ou déjà accordé, rien ne se passe.
function requestPersistentStorage() {
  try {
    const st = navigator.storage;
    if (!st || typeof st.persist !== 'function' || typeof st.persisted !== 'function') return Promise.resolve(null);
    return st.persisted().then((done) => done || st.persist()).catch(() => null);
  } catch (e) { return Promise.resolve(null); }
}

async function initApp() {
  if (!document.body.dataset.tab) document.body.dataset.tab = 'programme';
  requestPersistentStorage();
  initDefaultWallpaper();
  initTheme();
  applyWallpaper();
  markTestVersion();
  initUpdateIndicator();
  // Google Drive : retour d'une connexion par redirection (application installée), puis statut + sauvegarde à envoyer
  cleanupLegacyDriveKeys();
  const driveReturn = handleDriveRedirectReturn();
  // 1.8.23 (co-auteur : Claude) : l'onglet de destination s'affiche tout de suite, sans passer par Programme
  if (driveReturn) switchTab(driveReturnTab(driveReturn));
  document.documentElement.removeAttribute('data-drive-return');
  setTimeout(() => {
    if (isDriveWanted() && !isInstalledApp()) loadGoogleIdentity(); // 1.7.65 : seulement si le Drive sert
    initDriveTokenClient(); updateDriveUI();
    const forcedSave = driveSyncOnReturn(); // 1.7.62 : sauvegarde demandée par « Sauvegarder » avant la reconnexion
    if (isDriveConnected() && !getDriveAccount()) fetchDriveAccount();
    // on revient sur Réglages pour voir le résultat de la connexion (ou on reprend la restauration de programmes demandée ;
    // ou sur l'Historique quand la reconnexion venait de « Sauvegarder »)
    if (driveReturn && forcedSave) switchTab('historique');
    else if (driveReturn && !(driveReturn === 'ok' && resumeProgramRestoreIfPending())) switchTab('reglages');
  }, 800);
  // Jeton écrit par un autre onglet (connexion faite dans Chrome pendant que l'application plein écran attend)
  window.addEventListener('storage', (e) => {
    if (e.key === DRIVE_TOKEN_KEY || e.key === DRIVE_WANTED_KEY) { updateDriveUI(); if (isDriveConnected()) { driveSyncOnReturn(); if (!getDriveAccount()) fetchDriveAccount(); } }
  });
  // Retour dans l'application (ex. après une connexion faite dans un onglet voisin) : on relit l'état de Drive
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return;
    updateDriveUI();
    if (isDriveConnected()) { driveSyncOnReturn(); if (!getDriveAccount()) fetchDriveAccount(); }
  });
  const saved = localStorage.getItem('h49_state');
  if (saved) {
    try {
      state = JSON.parse(saved);
    } catch (e) {
      console.error("Sauvegarde locale corrompue, réinitialisation.", e);
      localStorage.removeItem('h49_state');
      state = { nextType: 'A', history: [], weights: [], lastWeights: {} };
    }
  } else {
    try {
      const response = await fetch('data.json');
      state = await response.json();
    } catch (e) {
      console.error("Impossible de charger data.json", e);
      state = { nextType: 'A', history: [], weights: [], lastWeights: {} };
    }
  }

  // Programmes sur mesure (1.7.0) : migration unique de l'historique vers le programme « Hypertrophie ».
  // Copie intégrale des données d'origine conservée sur l'appareil avant toute modification.
  if (!(state && state.schema >= 2)) {
    try { localStorage.setItem('h49_state_v1_backup', JSON.stringify(state)); } catch (e) { /* ignoré */ }
  }
  const mig = migrateState(state);
  state = mig.state;
  if (mig.error) setTimeout(() => appAlert('Conversion impossible', 'La conversion de tes séances au format des programmes a échoué : tes données d\'origine sont conservées telles quelles.\n\nDétail : ' + mig.error.message, 'warn'), 600);
  normalizePrograms();
  recalculateHistoryTonnages();
  getPrograms().forEach(p => { if (!isLibre(p)) p.nextKey = nextKeyFromHistory(p); });
  syncNextType();
  // Un stockage encore plein ne doit pas empêcher de rouvrir le brouillon déjà enregistré.
  try { saveState(); } catch (e) { console.warn('Écriture locale indisponible au démarrage.', e); }

  // Affichage de la version de l'application dans le titre
  fetch('manifest.json').then(r => r.json()).then(m => {
    // Version exécutée par cette page : sert à repérer qu'une version plus récente est prête
    if (m.version) { runningVersion = m.version; renderUpdateStatus(); }
  }).catch(() => {});

  renderProgramOverview();
  populateExerciseSelect();
  initWorkoutForm();
  renderHistory();
  injectSessionModalHtml();
  restoreWeightDraft();

  // Ajout de la vérification du déload au chargement
  displayDeloadNotificationIfNeeded();
  receiveProgramFromLocation(); // 1.7.52 : app ouverte par le lien d'un programme partagé
}

document.addEventListener('DOMContentLoaded', initApp);
