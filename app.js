// Suivi Fitness : logique de l'application (JavaScript natif, aucune dépendance sauf Chart.js local).
// Toutes les fonctions et variables sont globales : les boutons de index.html les appellent par leur nom (onclick).
// L'ordre des sections ci-dessous n'a pas d'importance pour les fonctions, mais les constantes (1) et les
// variables d'état (2) doivent rester en tête, car certaines s'initialisent à partir des constantes.
//
// SOMMAIRE
//   1. CONSTANTES ET DONNÉES DU PROGRAMME
//   2. ÉTAT DE L'APPLICATION (variables globales)
//   3. THÈME CLAIR / SOMBRE / AUTO
//   4. DONNÉES : SAUVEGARDE ET OUTILS COMMUNS
//   5. DÉLOAD (SEMAINE DE RELÂCHE)
//   6. ÉCRAN PROGRAMME
//   7. CHRONOS : REPOS ET DURÉE DE SÉANCE
//   8. BROUILLON DE SÉANCE
//   9. ÉCRAN SÉANCE : SÉRIES ET EXERCICES
//  10. ÉCRAN SÉANCE : FORMULAIRE ET ENREGISTREMENT
//  11. ÉCRAN HISTORIQUE ET MODIFICATION D'UNE SÉANCE
//  12. ÉCRAN GRAPHIQUES : FILTRES ET COURBES
//  13. ANALYSE MENSUELLE DE PROGRESSION
//  14. NAVIGATION ET DISPOSITION
//  15. SAUVEGARDE, IMPORT ET RÉINITIALISATION
//  16. MISES À JOUR DE L'APPLICATION
//  17. DÉMARRAGE

// ============================================================
// 1. CONSTANTES ET DONNÉES DU PROGRAMME
// ============================================================
const EXERCISE_ICONS = {
  "Presse à cuisses": "icons/leg_press.png",
  "Développé couché": "icons/bench_press.png",
  "Tirage horizontal": "icons/seated_row.png",
  "Développé militaire": "icons/overhead_press.png",
  "Curl biceps": "icons/biceps_curl.png",
  "Mollets": "icons/calf_raise.png",
  "Soulevé de terre": "icons/deadlift.png",
  "Développé incliné": "icons/incline_bench.png",
  "Tirage vertical": "icons/lat_pulldown.png",
  "Tractions": "icons/pull_up.png",
  "Élévations latérales": "icons/lateral_raise.png",
  "Extension triceps": "icons/triceps_extension.png",
  "Leg Extension": "icons/leg_extension.png",
  "Fentes marchées": "icons/walking_lunge.png",
  "Dips": "icons/dips.png",
  "Rowing unilatéral": "icons/dumbbell_row.png",
  "Rameur": "icons/rower.png",
  "Oiseau (Arrière d'épaule)": "icons/reverse_fly.png",
  "Leg Curl": "icons/leg_curl.png"
};

// Rameur : exercice « cardio » (durée + distance, une seule ligne). Il est stocké avec weight/reps à 0
// (donc ignoré par tonnage, charges et records) et ses valeurs propres : seconds / meters.
const ROWER_NAME = 'Rameur';
const ROWER_EXERCISE = { name: ROWER_NAME, cardio: true, seriesCount: 1, defaultSeconds: 270, defaultMeters: 1000 };

const PROGRAM = {
  'A': {
    badge: "badge-A",
    title: "Presse/Développé",
    exercises: [
      ROWER_EXERCISE,
      { name: "Presse à cuisses", seriesCount: 4, defaultWeight: 93, defaultReps: 10 },
      { name: "Développé couché", seriesCount: 4, defaultWeight: 75, defaultReps: 8 },
      { name: "Tirage horizontal", seriesCount: 4, defaultWeight: 59, defaultReps: 10 },
      { name: "Développé militaire", seriesCount: 3, defaultWeight: 32, defaultReps: 10 },
      { name: "Curl biceps", seriesCount: 3, defaultWeight: 28, defaultReps: 10 },
      { name: "Mollets", seriesCount: 3, defaultWeight: 40, defaultReps: 12 }
    ]
  },
  'B': {
    badge: "badge-B",
    title: "Soulevé/Développé",
    exercises: [
      ROWER_EXERCISE,
      { name: "Soulevé de terre", seriesCount: 4, defaultWeight: 70, defaultReps: 10 },
      { name: "Développé incliné", seriesCount: 4, defaultWeight: 60, defaultReps: 10 },
      { name: "Tirage vertical", seriesCount: 4, defaultWeight: 50, defaultReps: 10 },
      { name: "Tractions", seriesCount: 3, defaultWeight: 80, defaultReps: 8 },
      { name: "Élévations latérales", seriesCount: 3, defaultWeight: 20, defaultReps: 12 },
      { name: "Extension triceps", seriesCount: 3, defaultWeight: 27, defaultReps: 10 },
      { name: "Leg Extension", seriesCount: 3, defaultWeight: 40, defaultReps: 12 }
    ]
  },
  'C': {
    badge: "badge-C",
    title: "Fentes/Dips",
    exercises: [
      ROWER_EXERCISE,
      { name: "Fentes marchées", seriesCount: 4, defaultWeight: 25, defaultReps: 10 },
      { name: "Dips", seriesCount: 4, defaultWeight: 80, defaultReps: 10 },
      { name: "Rowing unilatéral", seriesCount: 3, defaultWeight: 20, defaultReps: 12 },
      { name: "Oiseau (Arrière d'épaule)", seriesCount: 3, defaultWeight: 20, defaultReps: 12 },
      { name: "Mollets", seriesCount: 3, defaultWeight: 40, defaultReps: 12 },
      { name: "Leg Curl", seriesCount: 3, defaultWeight: 40, defaultReps: 12 }
    ]
  }
};

const SESSION_TYPES = ['A', 'B', 'C'];
const SESSION_TYPE_COLORS = { A: '#1B6FD8', B: '#C2570C', C: '#C62B35' };
const SESSION_ORDER = ['A', 'B', 'C'];
const REST_DURATION = 90; // repos par défaut (s), pour un exercice absent de la liste ci-dessous

// Repos (en secondes) proposé par le chrono selon l'exercice ouvert dans la Séance :
// 150 s pour les mouvements lourds, 90 s pour les autres mouvements polyarticulaires, 60 s pour l'isolation.
// Pour ajuster un temps : modifier la valeur ici (aucun autre fichier à toucher).
const REST_BY_EXERCISE = {
  "Soulevé de terre": 150,
  "Presse à cuisses": 150,
  "Développé couché": 150,
  "Développé incliné": 150,
  "Développé militaire": 90,
  "Tirage horizontal": 90,
  "Tirage vertical": 90,
  "Tractions": 90,
  "Dips": 90,
  "Rowing unilatéral": 90,
  "Fentes marchées": 90,
  "Curl biceps": 60,
  "Extension triceps": 60,
  "Élévations latérales": 60,
  "Oiseau (Arrière d'épaule)": 60,
  "Leg Extension": 60,
  "Leg Curl": 60,
  "Mollets": 60
};

// Couleurs des graphiques : valeurs de repli (thème clair). Elles sont relues depuis
// les variables --chart-* de style.css à chaque changement de thème (voir readChartColors).
const CHART_COLORS = { primary: '#111114', success: '#0B7A43', volume: '#C2570C', tick: '#6B6B73', grid: '#EEEEF1', band: 'rgba(246, 213, 139, 0.45)' };

if (typeof Chart !== 'undefined') {
  Chart.defaults.font.family = "'Figtree', system-ui, sans-serif";
  Chart.defaults.font.size = 13; // 12 par défaut, +1 comme le reste de l'interface
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

const HISTORY_MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const HISTORY_DAYS = ['Dim.','Lun.','Mar.','Mer.','Jeu.','Ven.','Sam.'];
const HISTORY_MONTHS_SHORT = ['janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'];

// Titre affiché en haut de chaque onglet
const PAGE_TITLES = { programme: 'Programme', seance: 'Séance', progression: 'Graphiques', historique: 'Historique', reglages: 'Réglages' };

// La saisie en cours (poids, reps, séries validées, nombre de séries, exercice ouvert, chrono)
// est copiée dans localStorage à chaque action et restaurée au rechargement de l'application
// (tirer pour rafraîchir, application fermée par le système...). Elle est effacée à l'enregistrement
// de la séance et abandonnée au bout de 24 h.
const DRAFT_KEY = 'h49_draft';
const DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

// Le poids corporel saisi (onglet Graphiques) a son propre brouillon, indépendant de la séance :
// enregistrer une séance ne doit pas l'effacer. Même durée de validité (24 h).
const WEIGHT_DRAFT_KEY = 'h49_draft_weight';

// Google Drive backup (co-auteur : Grok)
const GOOGLE_CLIENT_ID = '903120094308-phdlfg1rug8v6hn231n8b4uu7vfj65uf.apps.googleusercontent.com';
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const DRIVE_FOLDER_NAME = 'FITNESS AAP – Séances';
const DRIVE_BACKUP_NAME = 'sauvegarde_complete.json';      // UN seul fichier : tout l'état de l'application
const DRIVE_BACKUP_ID_KEY = 'h49_drive_backup_id';         // identifiant de ce fichier sur le Drive
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
let currentVolumeFilter = 'all'; // 'all' (séances), 'month' (par mois) ou 'type' (séance A/B/C)
let currentSessionTypeFilter = SESSION_TYPES[0];
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

// Brouillon : verrou posé pendant la restauration (évite d'écrire un brouillon en le relisant)
let draftRestoring = false;

// Mises à jour : version exécutée par cette page (lue au démarrage), dernière version annoncée
// par le service worker, et heure de la dernière vérification
let runningVersion = null;
let activeVersion = null;
let lastUpdateCheck = 0;

// ============================================================
// 3. THÈME CLAIR / SOMBRE / AUTO
// ============================================================
function getThemePreference() {
  try {
    const v = localStorage.getItem(THEME_KEY);
    if (v === 'light' || v === 'dark' || v === 'auto') return v;
  } catch (e) {}
  return 'light';
}

function resolveTheme(pref) {
  if (pref === 'auto') {
    return (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
  }
  return pref === 'dark' ? 'dark' : 'light';
}

function readChartColors() {
  const cs = getComputedStyle(document.documentElement);
  const read = (name, fallback) => cs.getPropertyValue(name).trim() || fallback;
  CHART_COLORS.primary = read('--chart-primary', CHART_COLORS.primary);
  CHART_COLORS.success = read('--chart-success', CHART_COLORS.success);
  CHART_COLORS.volume = read('--chart-volume', CHART_COLORS.volume);
  CHART_COLORS.tick = read('--chart-tick', CHART_COLORS.tick);
  CHART_COLORS.grid = read('--chart-grid', CHART_COLORS.grid);
  CHART_COLORS.band = read('--chart-band', CHART_COLORS.band);
  if (typeof Chart !== 'undefined') Chart.defaults.color = CHART_COLORS.tick;
}

function applyTheme() {
  const pref = getThemePreference();
  const theme = resolveTheme(pref);
  document.documentElement.setAttribute('data-theme', theme);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', THEME_BAR_COLORS[theme]);
  document.querySelectorAll('#theme-choice [data-theme-choice]').forEach(btn => {
    const on = btn.dataset.themeChoice === pref;
    btn.classList.toggle('active', on);
    btn.setAttribute('aria-checked', on ? 'true' : 'false');
  });
  readChartColors();
  // Les graphiques sont déjà construits avec les anciennes couleurs : on les redessine.
  if (typeof state !== 'undefined' && state && document.body.dataset.tab === 'progression') renderCharts();
}

function setThemePreference(pref) {
  try { localStorage.setItem(THEME_KEY, pref); } catch (e) {}
  applyTheme();
}

function initTheme() {
  applyTheme();
  if (window.matchMedia) {
    themeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => { if (getThemePreference() === 'auto') applyTheme(); };
    if (themeMediaQuery.addEventListener) themeMediaQuery.addEventListener('change', onChange);
    else if (themeMediaQuery.addListener) themeMediaQuery.addListener(onChange);
  }
}

// ============================================================
// 4. DONNÉES : SAUVEGARDE ET OUTILS COMMUNS
// ============================================================
function saveState() {
  if (state && state.history) {
    state.history.sort((a, b) => new Date(a.date) - new Date(b.date));
  }
  localStorage.setItem('h49_state', JSON.stringify(state));
  scheduleDriveSync(); // Google Drive : la sauvegarde complète suit les modifications (si l'accès est valide)
}

function clearEditState() {
  editingOriginalDate = null;
  editingOriginalId = null;
  editingOriginalDuration = null;
  editingOriginalIsDeload = false;
  selectedSessionIndex = null;
}

function recalculateHistoryTonnages() {
  if (!state || !state.history) return;

  state.history.forEach(session => {
    let sessionTonnage = 0;

    if (session.exercises) {
      session.exercises.forEach(ex => {
        let exVolume = 0;
        let maxW = 0;

        if (ex.sets && Array.isArray(ex.sets)) {
          ex.sets.forEach(set => {
            const w = parseFloat(set.weight) || 0;
            const r = parseFloat(set.reps) || 0;
            const setVol = w * r;

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
  saveState();
}

function updateNextTypeFromHistory() {
  if (state.history && state.history.length > 0) {
    const lastSession = state.history[state.history.length - 1];
    if (lastSession.type === 'A') {
      state.nextType = 'B';
    } else if (lastSession.type === 'B') {
      state.nextType = 'C';
    } else if (lastSession.type === 'C') {
      state.nextType = 'A';
    }
  } else {
    state.nextType = 'A';
  }
}

function getIcon(exName, decorative = false) {
  const path = EXERCISE_ICONS[exName] || "icons/bench_press.png";
  return `<img src="${path}" alt="${decorative ? '' : exName}" onerror="this.src='icons/bench_press.png'">`;
}

function formatDate(dateStr) {
  if(!dateStr) return '';
  const parts = dateStr.split('-');
  if(parts.length === 3) return `${parts[2]}/${parts[1]}`;
  return dateStr;
}

function isCardioName(name) { return name === ROWER_NAME; }

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

function cardioPaceText(durationStr, meters) {
  const p = paceSecPerKm(parseDurationInput(durationStr), meters);
  return p > 0 ? `${formatDurationMS(p)} /km` : '–';
}

// Saisie de la durée au pavé numérique (pas de « : » dessus) : « 430 » -> « 4:30 », « 1015 » -> « 10:15 »
function onCardioInput(el) {
  const row = el.closest('.set-row');
  const dEl = row.querySelector('.weight-input');
  if (el === dEl) {
    const digits = dEl.value.replace(/\D/g, '').slice(-5).replace(/^0+(?=\d)/, '');
    dEl.value = digits === '' ? '' : (digits.length <= 2 ? `0:${digits.padStart(2, '0')}` : `${digits.slice(0, -2)}:${digits.slice(-2)}`);
  }
  const pace = row.nextElementSibling;
  if (pace && pace.classList.contains('cardio-pace')) pace.querySelector('b').textContent = cardioPaceText(dEl.value, row.querySelector('.reps-input').value);
}

function isPerformedCardioSet(set) {
  return !!set && (parseFloat(set.seconds) || 0) > 0 && (parseFloat(set.meters) || 0) > 0;
}

function isPerformedSet(set) {
  return !!set && (parseFloat(set.weight) || 0) > 0 && (parseFloat(set.reps) || 0) > 0;
}

// ============================================================
// 5. DÉLOAD (SEMAINE DE RELÂCHE)
// ============================================================
function checkDeloadStatus() {
  if (!state || !state.history) return false;
  // On se base sur le numéro de la PROCHAINE séance à venir
  const nextSessionNumber = state.history.length + 1;
  return nextSessionNumber > 0 && (nextSessionNumber % 12 === 0 || (nextSessionNumber % 12 >= 10));
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
function programTilesHtml(prog) {
  return prog.exercises.map(ex => `
    <div class="ex-tile">
      <div class="ex-icon-badge">${getIcon(ex.name)}</div>
      <span>${ex.name}</span>
    </div>
  `).join('');
}

function renderProgramOverview() {
  const container = document.getElementById('program-overview');
  if (!container) return;

  const nextType = PROGRAM[state.nextType] ? state.nextType : 'A';
  const next = PROGRAM[nextType];
  const startIdx = SESSION_ORDER.indexOf(nextType);
  const others = [1, 2].map(i => SESSION_ORDER[(startIdx + i) % SESSION_ORDER.length]);

  const BOLT_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 3L5 14h6l-1 7 8-11h-6z"/></svg>';
  const deloadHtml = checkDeloadStatus()
    ? `<span class="deload-pill">${BOLT_SVG}Déload actif · −20 %</span>`
    : '';
  const totalSets = next.exercises.reduce((n, ex) => n + ex.seriesCount, 0);

  const othersHtml = others.map(type => `
    <div class="next-row-wrap">
      <button type="button" class="next-row" aria-expanded="false" onclick="toggleProgramRow(this)">
        <span class="type-pill type-pill-${type} small">${type}</span>
        <span class="next-row-name">${PROGRAM[type].title.replace('/', ' / ')}</span>
        <span class="next-row-chevron">${CHEVRON_SVG}</span>
      </button>
      <div class="tile-grid next-row-panel" hidden>${programTilesHtml(PROGRAM[type])}</div>
    </div>
  `).join('');

  container.innerHTML = `
    <div class="next-card">
      <span class="overline">Prochaine séance · <span class="type-letter type-letter-${nextType}">${nextType}</span></span>
      <span class="session-name">${next.title.replace('/', ' / ')}</span>
      <div class="next-card-row">
        <div class="next-card-info">
          <span class="next-card-count">${next.exercises.length} exercices · ${totalSets} séries</span>
          ${deloadHtml}
        </div>
        <button type="button" class="btn-start" aria-label="Démarrer la séance" onclick="switchTab('seance')">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
        </button>
      </div>
    </div>
    <div class="section-block">
      <div class="tile-grid">${programTilesHtml(next)}</div>
    </div>

    <div class="section-block">
      <h2 class="section-label">Ensuite</h2>
      ${othersHtml}
    </div>
  `;
}

// Déplie / replie la liste des exercices d'une séance dans « Ensuite »
function toggleProgramRow(btn) {
  const panel = btn.nextElementSibling;
  const open = btn.getAttribute('aria-expanded') === 'true';
  btn.setAttribute('aria-expanded', open ? 'false' : 'true');
  if (panel) panel.hidden = open;
}

// ============================================================
// 7. CHRONOS : REPOS ET DURÉE DE SÉANCE
// ============================================================
function playBeep() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = 'sine';
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.15);
      }, i * 250);
    }
  } catch (e) {
    console.log("Audio non supporté");
  }
}

function updateTimerDisplay(seconds) {
  const display = document.getElementById('timer-display');
  if(!display) return;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  display.innerText = `${m}:${s < 10 ? '0' : ''}${s}`;
}

function runRestTimer(endTime) {
  const btn = document.getElementById('timer-btn');
  if (restTimerInterval) clearInterval(restTimerInterval);

  if (btn) {
    btn.className = 'timer-btn running';
    btn.style.setProperty('--progress', '100%');
  }

  const startTime = Date.now();
  const totalDuration = endTime - startTime;

  restTimerInterval = setInterval(() => {
    const now = Date.now();
    const elapsed = now - startTime;
    const secondsRemaining = Math.max(0, Math.floor((endTime - now) / 1000));
    const progressPercent = totalDuration > 0 ? ((totalDuration - elapsed) / totalDuration * 100) : 0;

    updateTimerDisplay(secondsRemaining);
    if (btn) btn.style.setProperty('--progress', `${Math.max(0, progressPercent)}%`);

    if (secondsRemaining <= 0) {
      clearInterval(restTimerInterval);
      restTimerInterval = null;
      localStorage.removeItem('rest_end_time');
      if (btn) {
        btn.className = 'timer-btn finished';
        btn.style.setProperty('--progress', '0%');
      }
      const display = document.getElementById('timer-display');
      if(display) display.innerText = 'GO !';
      playBeep();
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    }
  }, 100);
}

// Repos adapté à l'exercice : durée (s) associée à un exercice, ou repos par défaut
function restDurationFor(exName) {
  return REST_BY_EXERCISE[exName] || REST_DURATION;
}

// Durée du prochain repos : celle de l'exercice actuellement ouvert dans la Séance
function currentRestDuration() {
  const open = document.querySelector('#exercises-list .exercise-item.open');
  return open ? restDurationFor(open.dataset.ex) : REST_DURATION;
}

function formatRestDuration(seconds) {
  const s = seconds % 60;
  return `${Math.floor(seconds / 60)}:${s < 10 ? '0' : ''}${s}`;
}

// Texte du chrono au repos : « PAUSE 1:30 » (la durée qui sera lancée)
function restIdleLabel() {
  return `PAUSE ${formatRestDuration(currentRestDuration())}`;
}

// Met à jour le texte du chrono quand l'exercice ouvert change, seulement s'il est au repos
// (jamais pendant un décompte ni sur « GO ! »)
function refreshRestTimerIdle() {
  const btn = document.getElementById('timer-btn');
  const display = document.getElementById('timer-display');
  if (!btn || !display || restTimerInterval) return;
  if (btn.classList.contains('running') || btn.classList.contains('finished')) return;
  display.innerText = restIdleLabel();
}

// Retour à l'état initial du timer de repos (affichage « PAUSE m:ss »)
function resetRestTimerUi() {
  const btn = document.getElementById('timer-btn');
  const display = document.getElementById('timer-display');
  if (btn) {
    btn.className = 'timer-btn';
    btn.style.setProperty('--progress', '0%');
  }
  if (display) display.innerText = restIdleLabel();
}

function toggleRestTimer() {
  const btn = document.getElementById('timer-btn');
  if (restTimerInterval) {
    // En cours : arrêt et retour à l'état initial
    clearInterval(restTimerInterval);
    restTimerInterval = null;
    localStorage.removeItem('rest_end_time');
    resetRestTimerUi();
  } else if (btn && btn.classList.contains('finished')) {
    // Terminé (« GO ! ») : retour à l'état initial SANS relancer le chrono
    resetRestTimerUi();
  } else {
    const duration = currentRestDuration();
    const endTime = Date.now() + (duration * 1000);
    localStorage.setItem('rest_end_time', endTime);
    updateTimerDisplay(duration);
    runRestTimer(endTime);
  }
}

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    const savedRestEnd = localStorage.getItem('rest_end_time');
    if (savedRestEnd) {
      const endTime = parseInt(savedRestEnd, 10);
      const now = Date.now();
      
      if (now >= endTime) {
        localStorage.removeItem('rest_end_time');
        updateTimerDisplay(0);
        const btn = document.getElementById('timer-btn');
        if(btn) btn.className = 'timer-btn finished';
        const display = document.getElementById('timer-display');
        if(display) display.innerText = 'GO !';
        playBeep();
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      } else {
        runRestTimer(endTime);
      }
    }
  }
});

function startWorkoutTimer() {
  // En modification d'une séance passée, le chrono ne démarre pas :
  // la durée enregistrée est conservée telle quelle.
  if (editingOriginalId !== null) return;
  if (!workoutTimerInterval) {
    let startTime = localStorage.getItem('workout_start_time');
    if (!startTime) {
      startTime = Date.now();
      localStorage.setItem('workout_start_time', startTime);
    } else {
      startTime = parseInt(startTime, 10);
    }

    const tick = () => {
      const now = Date.now();
      workoutSeconds = Math.max(0, Math.floor((now - startTime) / 1000));

      const m = Math.floor(workoutSeconds / 60);
      const s = workoutSeconds % 60;
      const el = document.getElementById('workout-duration-display');
      if(el) {
        el.innerText = `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
      }
    };
    tick();
    workoutTimerInterval = setInterval(tick, 1000);
  }
}

function resetWorkoutTimer() {
  if (workoutTimerInterval) {
    clearInterval(workoutTimerInterval);
    workoutTimerInterval = null;
  }
  workoutSeconds = 0;
  localStorage.removeItem('workout_start_time');
  const el = document.getElementById('workout-duration-display');
  if(el) el.innerText = "00:00";
}

function toggleWorkoutTimer() {
  if (workoutTimerInterval) {
    clearInterval(workoutTimerInterval);
    workoutTimerInterval = null;
  } else {
    startWorkoutTimer();
  }
}

function getFormattedWorkoutDuration() {
  const m = Math.floor(workoutSeconds / 60);
  if (m === 0) return "< 1 min";
  return `${m} min`;
}

// ============================================================
// 8. BROUILLON DE SÉANCE
// ============================================================
function readDraft() {
  try {
    const d = JSON.parse(localStorage.getItem(DRAFT_KEY));
    if (d && d.v === 1 && Array.isArray(d.exercises) && (Date.now() - d.updatedAt) < DRAFT_MAX_AGE_MS) return d;
  } catch (e) {}
  return null;
}

function clearDraft() {
  try { localStorage.removeItem(DRAFT_KEY); } catch (e) {}
}

function saveDraft() {
  if (draftRestoring || editingOriginalId !== null || !state) return;
  const items = Array.from(document.querySelectorAll('#exercises-list .exercise-item'));
  if (!items.length) return;

  const type = (document.getElementById('seance-badge') || {}).innerText;
  const prog = PROGRAM[(type || '').trim()];
  let dirty = false;
  const exercises = items.map(item => {
    const rows = Array.from(item.querySelectorAll('.set-row'));
    const progEx = prog ? prog.exercises.find(e => e.name === item.dataset.ex) : null;
    if (progEx && rows.length !== progEx.seriesCount) dirty = true;
    return {
      name: item.dataset.ex,
      sets: rows.map(row => {
        const w = row.querySelector('.weight-input'), r = row.querySelector('.reps-input');
        const done = row.classList.contains('done');
        const aw = w.classList.contains('active-input'), ar = r.classList.contains('active-input');
        if (done || aw || ar) dirty = true;
        return { w: w.value, r: r.value, done, aw, ar };
      })
    };
  });

  // Formulaire intact : rien à conserver (et on n'écrase pas d'éventuelles nouvelles suggestions)
  if (!dirty) { clearDraft(); return; }

  const draft = {
    v: 1,
    type: (type || '').trim(),
    updatedAt: Date.now(),
    startedAt: parseInt(localStorage.getItem('workout_start_time'), 10) || null,
    manualOpen: manualOpenExercise === undefined ? null : manualOpenExercise,
    exercises
  };
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch (e) {}
}

function restoreDraft(type) {
  const d = readDraft();
  if (!d || d.type !== type) return false;
  const clean = v => String(v == null ? '' : v).replace(/[^0-9.,\-]/g, '');
  draftRestoring = true;
  try {
    document.querySelectorAll('#exercises-list .exercise-item').forEach(item => {
      const saved = d.exercises.find(e => e.name === item.dataset.ex);
      if (!saved || !Array.isArray(saved.sets) || !saved.sets.length) return;
      const grid = item.querySelector('.sets-grid');
      const cardio = isCardioName(item.dataset.ex);
      grid.innerHTML = saved.sets.map((s, i) => setRowHtml(item.dataset.ex, i + 1, cardio ? String(s.w == null ? '' : s.w).replace(/[^0-9:.,]/g, '') : clean(s.w), clean(s.r))).join('');
      grid.querySelectorAll('.set-row').forEach((row, i) => {
        const s = saved.sets[i];
        const w = row.querySelector('.weight-input'), r = row.querySelector('.reps-input');
        if (s.aw) w.classList.add('active-input');
        if (s.ar) r.classList.add('active-input');
        if (s.done) {
          row.classList.add('done');
          row.querySelector('.btn-check-set').setAttribute('aria-pressed', 'true');
        }
      });
    });
    if (Number.isInteger(d.manualOpen)) manualOpenExercise = d.manualOpen;
    if (d.startedAt) {
      localStorage.setItem('workout_start_time', String(d.startedAt));
      startWorkoutTimer();
    }
  } finally {
    draftRestoring = false;
  }
  return true;
}

// --- Poids corporel (champ de l'onglet Graphiques) : brouillon séparé de celui de la séance ---
function clearWeightDraft() {
  try { localStorage.removeItem(WEIGHT_DRAFT_KEY); } catch (e) {}
}

// Vide le champ et son brouillon (import d'une sauvegarde, réinitialisation)
function discardWeightInput() {
  const input = document.getElementById('new-weight');
  if (input) input.value = '';
  clearWeightDraft();
}

function saveWeightDraft() {
  const input = document.getElementById('new-weight');
  if (!input) return;
  try {
    if (input.value !== '') {
      localStorage.setItem(WEIGHT_DRAFT_KEY, JSON.stringify({ v: 1, value: input.value, updatedAt: Date.now() }));
    } else if (!(input.validity && input.validity.badInput)) {
      // Champ réellement vidé (et non simple saisie incomplète comme « 72, ») : plus rien à conserver
      localStorage.removeItem(WEIGHT_DRAFT_KEY);
    }
  } catch (e) {}
}

function restoreWeightDraft() {
  const input = document.getElementById('new-weight');
  if (!input || input.value !== '') return;
  try {
    const d = JSON.parse(localStorage.getItem(WEIGHT_DRAFT_KEY));
    if (!d || d.v !== 1 || !((Date.now() - d.updatedAt) < DRAFT_MAX_AGE_MS)) return;
    // Valeur stricte : 1 à 3 chiffres, 2 décimales au plus (virgule → point). Tout le reste est ignoré,
    // jamais « réparé » : un brouillon altéré ne doit rien injecter dans le champ.
    const raw = String(d.value == null ? '' : d.value).trim().replace(',', '.');
    if (/^\d{1,3}(\.\d{1,2})?$/.test(raw) && parseFloat(raw) > 0) input.value = raw;
  } catch (e) {}
}

// ============================================================
// 9. ÉCRAN SÉANCE : SÉRIES ET EXERCICES
// ============================================================
function getSuggestedSetValues(exName, setIndex, fallbackWeight, fallbackReps) {
  let foundSet = null;

  // On parcourt l'historique du plus récent au plus ancien
  for (let i = state.history.length - 1; i >= 0; i--) {
    const h = state.history[i];
    
    // Détermine mathématiquement si cette séance historique était une séance de déload
    const sessionNum = i + 1;
    const wasDeload = (sessionNum % 12 === 0 || (sessionNum % 12 >= 10));
    
    // On ignore les séances de déload pour aller chercher la dernière vraie charge normale
    if (!wasDeload && h.exercises) {
      const foundEx = h.exercises.find(e => e.name === exName);
      // On ne reprend qu'une série réellement faite : les séries non faites sont ignorées
      // et on remonte à la dernière séance où cette série a vraiment été réalisée.
      if (foundEx && foundEx.sets && isPerformedSet(foundEx.sets[setIndex])) {
        foundSet = { ...foundEx.sets[setIndex] };
        break;
      }
    }
  }
  
  if (!foundSet) {
    if (state.lastWeights && state.lastWeights[exName]) {
      foundSet = { weight: state.lastWeights[exName], reps: fallbackReps };
    } else {
      foundSet = { weight: fallbackWeight, reps: fallbackReps };
    }
  }
  
  // Si le déload est actif pour la prochaine séance, on applique la réduction de 20%
  if (isDeloadActive() && foundSet.weight) {
    foundSet.weight = Math.round((foundSet.weight * 0.8) / 2.5) * 2.5; // Arrondi au palier de 2.5kg
  }
  
  return foundSet;
}

// Valeurs proposées pour le rameur : la dernière séance où il a été fait, sinon les valeurs par défaut
function getSuggestedCardioValues(exName, defSeconds, defMeters) {
  for (let i = state.history.length - 1; i >= 0; i--) {
    const ex = (state.history[i].exercises || []).find(e => e.name === exName);
    const set = ex && Array.isArray(ex.sets) ? ex.sets.find(isPerformedCardioSet) : null;
    if (set) return { seconds: set.seconds, meters: set.meters };
  }
  return { seconds: defSeconds, meters: defMeters };
}

function isExerciseComplete(item) {
  const rows = item.querySelectorAll('.set-row');
  return rows.length > 0 && Array.from(rows).every(r => r.classList.contains('done'));
}

function toggleSetDone(btn) {
  startWorkoutTimer();
  const row = btn.closest('.set-row');
  row.classList.toggle('done');
  const done = row.classList.contains('done');
  btn.setAttribute('aria-pressed', done ? 'true' : 'false');

  // Exercice ouvert à la main et terminé : on repasse en automatique (passage au suivant)
  if (done) {
    const items = Array.from(document.querySelectorAll('#exercises-list .exercise-item'));
    const item = row.closest('.exercise-item');
    if (manualOpenExercise === items.indexOf(item) && isExerciseComplete(item)) manualOpenExercise = undefined;
    scrollOnNextRefresh = true;
  }
  updateSetsProgress();

  // Si on a validé une série, relancer le timer de repos automatiquement
  if (done) {
    const timerBtn = document.getElementById('timer-btn');
    if (timerBtn) {
      const duration = currentRestDuration();
      const endTime = Date.now() + (duration * 1000);
      localStorage.setItem('rest_end_time', endTime);
      updateTimerDisplay(duration);
      runRestTimer(endTime);
    }
  }

  saveDraft();
}

function markInputActive(input) {
  startWorkoutTimer();
  input.classList.add('active-input');
  saveDraft();
}

function findProgramExercise(name) {
  for (const t of Object.keys(PROGRAM)) {
    const found = PROGRAM[t].exercises.find(e => e.name === name);
    if (found) return found;
  }
  return null;
}

function renumberSets(grid) {
  grid.querySelectorAll('.set-row').forEach((row, i) => {
    const label = row.querySelector('.set-label');
    if (label) label.innerText = String(i + 1);
  });
}

// Gabarit d'une ligne de série (utilisé à la création du formulaire et par le bouton +)
function setRowHtml(exName, number, weightVal, repsVal, done = false) {
  if (isCardioName(exName)) {
    // Rameur : « weight-input » = durée (min:ss), « reps-input » = distance (m). Nombre = secondes, texte = saisie telle quelle.
    const dur = typeof weightVal === 'number' ? formatDurationMS(weightVal) : weightVal;
    return `
    <div class="set-row${done ? ' done' : ''}">
      <span class="set-label">${number}</span>
      <input type="text" inputmode="numeric" class="set-input weight-input" data-ex="${exName}" aria-label="Durée en minutes et secondes" placeholder="min:ss" value="${dur}" oninput="onCardioInput(this); markInputActive(this)">
      <input type="number" inputmode="numeric" class="set-input reps-input" data-ex="${exName}" aria-label="Distance en mètres" placeholder="m" value="${repsVal}" oninput="onCardioInput(this); markInputActive(this)">
      <button type="button" class="btn-check-set" aria-pressed="${done ? 'true' : 'false'}" aria-label="Valider le rameur" onclick="toggleSetDone(this)">${CHECK_SVG}</button>
    </div>
    <div class="cardio-pace"><span>Allure</span><b>${cardioPaceText(dur, repsVal)}</b></div>
  `;
  }
  return `
    <div class="set-row${done ? ' done' : ''}">
      <span class="set-label">${number}</span>
      <input type="number" step="0.5" inputmode="decimal" class="set-input weight-input" data-ex="${exName}" aria-label="Série ${number}, poids en kg" placeholder="kg" value="${weightVal}" oninput="markInputActive(this)">
      <input type="number" inputmode="numeric" class="set-input reps-input" data-ex="${exName}" aria-label="Série ${number}, répétitions" placeholder="reps" value="${repsVal}" oninput="markInputActive(this)">
      <button type="button" class="btn-check-set" aria-pressed="${done ? 'true' : 'false'}" aria-label="Valider la série ${number}" onclick="toggleSetDone(this)">${CHECK_SVG}</button>
    </div>
  `;
}

function addSet(btn) {
  const grid = btn.closest('.exercise-item').querySelector('.sets-grid');
  const rows = grid.querySelectorAll('.set-row');
  const last = rows[rows.length - 1];
  const exName = grid.dataset.ex || (last ? last.querySelector('.weight-input').dataset.ex : '');

  // La nouvelle série reprend les valeurs de la dernière ;
  // à défaut (aucune série), on utilise la suggestion du programme.
  let weightVal, repsVal;
  if (last) {
    weightVal = last.querySelector('.weight-input').value;
    repsVal = last.querySelector('.reps-input').value;
  } else {
    const progEx = findProgramExercise(exName);
    const suggested = getSuggestedSetValues(exName, 0, progEx ? progEx.defaultWeight : 0, progEx ? progEx.defaultReps : 0);
    weightVal = suggested.weight;
    repsVal = suggested.reps;
  }

  // insertAdjacentHTML insère directement l'élément : avec un conteneur temporaire,
  // firstChild renvoyait le texte blanc précédant la balise et aucune ligne n'apparaissait.
  grid.insertAdjacentHTML('beforeend', setRowHtml(exName, rows.length + 1, weightVal, repsVal));
  updateSetsProgress();
  saveDraft();
}

function removeSet(btn) {
  const grid = btn.closest('.exercise-item').querySelector('.sets-grid');
  const rows = grid.querySelectorAll('.set-row');
  if (rows.length <= 1) return; // toujours au moins une série
  rows[rows.length - 1].remove();
  renumberSets(grid);
  updateSetsProgress();
  saveDraft();
}

function updateSetsProgress() {
  const totalRows = document.querySelectorAll('.set-row').length;
  const doneRows = document.querySelectorAll('.set-row.done').length;
  const textEl = document.getElementById('sets-progress-text');
  if(textEl) textEl.innerText = `${doneRows} / ${totalRows}`;
  const barEl = document.getElementById('sets-progress-bar');
  if (barEl) barEl.style.width = totalRows ? `${Math.round((doneRows / totalRows) * 100)}%` : '0%';
  refreshExerciseStates();
}

// Texte de la ligne repliée : « 4 séries · 32.5 → 55 kg · 2/4 faites » (ou « Terminé · 4 séries »)
function done0(rows) { return rows.some(r => r.classList.contains('done')) ? ' · faite' : ''; }

function exerciseSummaryText(item) {
  const rows = Array.from(item.querySelectorAll('.set-row'));
  const n = rows.length;
  const plural = n > 1 ? 'séries' : 'série';
  if (isExerciseComplete(item)) return `Terminé · ${n} ${plural}`;
  if (isCardioName(item.dataset.ex)) {
    const r0 = rows[0];
    const d = r0 ? r0.querySelector('.weight-input').value : '', m = r0 ? r0.querySelector('.reps-input').value : '';
    return d && m ? `${m} m en ${d}${done0(rows)}` : `${n} ${plural}`;
  }
  const weights = rows.map(r => r.querySelector('.weight-input').value).filter(v => v !== '');
  let range = '';
  if (weights.length) {
    const first = weights[0], last = weights[weights.length - 1];
    range = first === last ? ` · ${first} kg` : ` · ${first} → ${last} kg`;
  }
  const done = rows.filter(r => r.classList.contains('done')).length;
  return `${n} ${plural}${range}${done > 0 ? ` · ${done}/${n} faites` : ''}`;
}

// Ligne de l'exercice ouvert : « Dernière fois · 86 kg max » (charge max de la dernière séance où il a été fait)
function exerciseLastTimeText(exName) {
  const history = (state && state.history) ? state.history : [];
  for (let i = history.length - 1; i >= 0; i--) {
    const h = history[i];
    if (editingOriginalId !== null && h.id === editingOriginalId) continue; // pas la séance en cours de modification
    const ex = (h.exercises || []).find(e => e.name === exName);
    if (isCardioName(exName)) {
      const cs = ex && Array.isArray(ex.sets) ? ex.sets.find(isPerformedCardioSet) : null;
      if (cs) return `Dernière fois · ${Number(cs.meters).toLocaleString('fr-FR')} m en ${formatDurationMS(cs.seconds)}`;
      continue;
    }
    const performed = ex && Array.isArray(ex.sets) ? ex.sets.filter(isPerformedSet) : [];
    if (performed.length > 0) {
      const max = Math.max(...performed.map(s => parseFloat(s.weight) || 0));
      return `Dernière fois · ${max} kg max`;
    }
  }
  return 'Première fois';
}

// Ouvre un seul exercice à la fois, met en évidence la série en cours et met à jour les libellés
function refreshExerciseStates() {
  const items = Array.from(document.querySelectorAll('#exercises-list .exercise-item'));
  if (!items.length) return;

  let openIdx;
  if (manualOpenExercise === undefined) {
    openIdx = items.findIndex(it => !isExerciseComplete(it)); // -1 si tout est terminé
  } else {
    openIdx = items[manualOpenExercise] ? manualOpenExercise : -1;
  }

  items.forEach((item, i) => {
    const open = i === openIdx;
    const rows = Array.from(item.querySelectorAll('.set-row'));
    item.classList.toggle('open', open);
    item.classList.toggle('complete', isExerciseComplete(item));
    item.querySelector('.ex-toggle').setAttribute('aria-expanded', open ? 'true' : 'false');
    item.querySelector('.ex-body').hidden = !open;
    item.querySelector('.ex-controls').hidden = !open || isCardioName(item.dataset.ex);

    rows.forEach(r => r.classList.remove('current'));
    if (open) {
      const current = rows.find(r => !r.classList.contains('done'));
      if (current) current.classList.add('current');
    }
    item.querySelector('.ex-sub').textContent = open ? exerciseLastTimeText(item.dataset.ex) : exerciseSummaryText(item);
  });

  // Le chrono de repos suit l'exercice ouvert
  refreshRestTimerIdle();

  // Passage automatique à l'exercice suivant : on le ramène dans l'écran
  if (scrollOnNextRefresh && openIdx !== -1 && openIdx !== lastOpenExerciseIdx) {
    items[openIdx].scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  scrollOnNextRefresh = false;
  lastOpenExerciseIdx = openIdx;
}

// Appui sur l'en-tête d'un exercice : l'ouvre (en repliant l'autre) ou le replie
function toggleExercise(btn) {
  const items = Array.from(document.querySelectorAll('#exercises-list .exercise-item'));
  const item = btn.closest('.exercise-item');
  const idx = items.indexOf(item);
  const wasOpen = item.classList.contains('open');
  manualOpenExercise = wasOpen ? -1 : idx;
  refreshExerciseStates();
  if (!wasOpen) item.scrollIntoView({ behavior: 'smooth', block: 'start' });
  saveDraft();
}

// ============================================================
// 10. ÉCRAN SÉANCE : FORMULAIRE ET ENREGISTREMENT
// ============================================================
function initWorkoutForm(customSession = null) { 
  resetWorkoutTimer(); 
  if(!state) return;

  const type = customSession ? customSession.type : state.nextType; 
  const prog = PROGRAM[type];

  // Le titre principal reste simple (ex: "Séance A (Presse / Couché)")
  manualOpenExercise = undefined;
  lastOpenExerciseIdx = null;
  scrollOnNextRefresh = false;

  const titleEl = document.getElementById('seance-type-title'); 
  if(titleEl) {
    titleEl.innerText = prog.title.replace('/', ' / ');
  }
  const overlineEl = document.getElementById('seance-overline');
  if (overlineEl) overlineEl.innerText = customSession ? `Modification · ${formatDate(customSession.date)}` : 'Séance du jour';

  // --- GESTION DU SOUS-TITRE DELOAD ---
  const deloadSubEl = document.getElementById('deload-subtitle');
  if (deloadSubEl) {
    if (isDeloadActive()) {
      deloadSubEl.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 3L5 14h6l-1 7 8-11h-6z"/></svg>Déload actif · −20 % sur les charges';
      deloadSubEl.style.display = "inline-flex";
    } else {
      deloadSubEl.innerHTML = "";
      deloadSubEl.style.display = "none";
    }
  }

  const badge = document.getElementById('seance-badge');
  if(badge) {
    badge.innerText = type;
    badge.className = `type-pill type-pill-${type}`;
  }

  // Bouton Annuler + libellé du bouton de validation selon le mode (création / modification)
  const isEditing = editingOriginalId !== null;
  const cancelBtn = document.getElementById('cancel-edit-btn');
  if (cancelBtn) cancelBtn.style.display = isEditing ? 'block' : 'none';
  const cancelSessionBtn = document.getElementById('cancel-session-btn');
  if (cancelSessionBtn) cancelSessionBtn.style.display = isEditing ? 'none' : 'block';
  const submitBtn = document.getElementById('submit-workout-btn');
  if (submitBtn) submitBtn.innerText = isEditing ? 'Enregistrer les modifications' : 'Valider & Enregistrer la séance';

  // Compteur de durée : en modification, on affiche la durée enregistrée de la séance
  // (et non un 00:00 trompeur) ; en création, on retrouve le chrono classique.
  const durationLabel = document.getElementById('workout-duration-label');
  const durationDisplay = document.getElementById('workout-duration-display');
  if (durationLabel) durationLabel.innerText = isEditing ? 'Durée enregistrée :' : 'Durée :';
  if (durationDisplay) {
    if (isEditing) {
      durationDisplay.innerText = editingOriginalDuration || 'N/A';
      durationDisplay.style.cursor = 'default';
      durationDisplay.title = "Durée d'origine conservée (le chrono est désactivé en modification)";
    } else {
      durationDisplay.innerText = '00:00';
      durationDisplay.style.cursor = 'pointer';
      durationDisplay.title = '';
    }
  }

  const container = document.getElementById('exercises-list'); 
  if(!container) return; 
  container.innerHTML = '';

  prog.exercises.forEach((ex) => { 
    const div = document.createElement('div'); 
    div.className = 'exercise-item';

    let existingEx = null;
    if (customSession && customSession.exercises) {
      existingEx = customSession.exercises.find(e => e.name === ex.name);
    }

    let rowsHtml = '';
    if (ex.cardio) {
      let secVal, mVal, preChecked = false;
      const saved = existingEx && existingEx.sets && existingEx.sets[0];
      if (saved && isPerformedCardioSet(saved)) { secVal = saved.seconds; mVal = saved.meters; preChecked = true; }
      else { const sg = getSuggestedCardioValues(ex.name, ex.defaultSeconds, ex.defaultMeters); secVal = sg.seconds; mVal = sg.meters; }
      rowsHtml = setRowHtml(ex.name, 1, secVal, mVal, preChecked);
    } else
    for (let s = 1; s <= ex.seriesCount; s++) {
      let weightVal = ex.defaultWeight;
      let repsVal = ex.defaultReps;

      let preChecked = false;
      if (existingEx && existingEx.sets && existingEx.sets[s - 1]) {
        weightVal = existingEx.sets[s - 1].weight;
        repsVal = existingEx.sets[s - 1].reps;
        // En modification : une série déjà enregistrée (valeurs positives) revient cochée
        preChecked = Number(weightVal) > 0 && Number(repsVal) > 0;
      } else {
        const lastSet = getSuggestedSetValues(ex.name, s - 1, ex.defaultWeight, ex.defaultReps);
        weightVal = lastSet.weight;
        repsVal = lastSet.reps;
      }

      rowsHtml += setRowHtml(ex.name, s, weightVal, repsVal, preChecked);
    }

    div.dataset.ex = ex.name;
    div.innerHTML = `
      <div class="ex-header">
        <button type="button" class="ex-toggle" aria-expanded="false" onclick="toggleExercise(this)">
          <span class="ex-icon-badge">${getIcon(ex.name, true)}</span>
          <span class="ex-text">
            <span class="ex-name">${ex.name}</span>
            <span class="ex-sub"></span>
          </span>
          <span class="ex-chevron">${CHEVRON_SVG}</span>
        </button>
        <span class="ex-controls" hidden>
          <button type="button" class="btn-set-count" onclick="removeSet(this)" aria-label="Supprimer la dernière série" title="Supprimer la dernière série">${MINUS_SVG}</button>
          <button type="button" class="btn-set-count" onclick="addSet(this)" aria-label="Ajouter une série" title="Ajouter une série">${PLUS_SVG}</button>
        </span>
      </div>
      <div class="ex-body" hidden>
        <div class="sets-head" aria-hidden="true"><span>Série</span><span>${ex.cardio ? 'Durée' : 'Kg'}</span><span>${ex.cardio ? 'Distance' : 'Réps'}</span><span></span></div>
        <div class="sets-grid" data-ex="${ex.name}">${rowsHtml}</div>
      </div>
    `;
    container.appendChild(div);
  });

  // Saisie en cours retrouvée après un rechargement (jamais en modification d'une ancienne séance)
  if (!customSession && editingOriginalId === null) restoreDraft(type);

  updateSetsProgress(); 
}

// Enregistrement de la séance (formulaire de l'onglet Séance) : seules les séries cochées sont conservées
function submitWorkout(e) {
  e.preventDefault();
  let totalTonnage = 0;
  let exerciseLogs = [];

  if (!state.lastWeights) state.lastWeights = {};
  const isEditing = editingOriginalId !== null;

  // Seules les séries cochées sont enregistrées (v1.4.3)
  const setRows = Array.from(document.querySelectorAll('#exercises-list .set-row'));
  const validatedRows = setRows.filter(row => row.classList.contains('done'));

  if (validatedRows.length === 0) {
    alert("Aucune série n'est cochée. Valide au moins une série avec la coche avant d'enregistrer la séance.");
    return;
  }

  // Une série cochée doit avoir un poids et un nombre de répétitions valides
  for (const row of validatedRows) {
    const wInput = row.querySelector('.weight-input');
    const rInput = row.querySelector('.reps-input');
    if (isCardioName(wInput.dataset.ex)) {
      const sec = parseDurationInput(wInput.value), m = Number(rInput.value);
      if (!(sec > 0) || rInput.value === '' || !Number.isInteger(m) || m <= 0) {
        const items = Array.from(document.querySelectorAll('#exercises-list .exercise-item'));
        manualOpenExercise = items.indexOf(row.closest('.exercise-item'));
        refreshExerciseStates();
        alert(`Le rameur est coché, mais sa durée (format min:ss, ex. 4:30) ou sa distance (en mètres) n'est pas valide.`);
        (!(sec > 0) ? wInput : rInput).focus();
        return;
      }
      continue;
    }
    const w = Number(wInput.value);
    const r = Number(rInput.value);
    if (wInput.value === '' || !Number.isFinite(w) || w <= 0 || rInput.value === '' || !Number.isInteger(r) || r <= 0) {
      const item = row.closest('.exercise-item');
      const items = Array.from(document.querySelectorAll('#exercises-list .exercise-item'));
      const number = Array.from(row.parentElement.children).indexOf(row) + 1;
      manualOpenExercise = items.indexOf(item);
      refreshExerciseStates();
      alert(`La série ${number} de « ${item.dataset.ex} » est cochée, mais son poids ou ses répétitions ne sont pas valides.`);
      (wInput.value === '' || !Number.isFinite(w) || w <= 0 ? wInput : rInput).focus();
      return;
    }
  }

  // Séance partielle : confirmation avant d'ignorer les séries non cochées
  const uncheckedCount = setRows.length - validatedRows.length;
  if (uncheckedCount > 0) {
    const okS = validatedRows.length > 1 ? 's' : '';
    const noS = uncheckedCount > 1 ? 's' : '';
    const ignored = uncheckedCount > 1 ? 'seront ignorées' : 'sera ignorée';
    if (!confirm(`Enregistrer ${validatedRows.length} série${okS} cochée${okS} ?\n\n${uncheckedCount} série${noS} non cochée${noS} ${ignored}.`)) return;
  }

  validatedRows.forEach((row) => {
    const wInput = row.querySelector('.weight-input');
    if (isCardioName(wInput.dataset.ex)) {
      const exName = wInput.dataset.ex;
      let exLog = exerciseLogs.find(e => e.name === exName);
      if (!exLog) { exLog = { name: exName, cardio: true, sets: [], maxWeight: 0, totalVolume: 0 }; exerciseLogs.push(exLog); }
      exLog.sets.push({ weight: 0, reps: 0, seconds: parseDurationInput(wInput.value), meters: Number(row.querySelector('.reps-input').value) });
      return;
    }
    const w = Number(wInput.value);
    const r = Number(row.querySelector('.reps-input').value);
    const exName = wInput.dataset.ex;
    const setVolume = w * r;

    totalTonnage += setVolume;

    let exLog = exerciseLogs.find(e => e.name === exName);
    if(!exLog) {
      exLog = { name: exName, sets: [], maxWeight: 0, totalVolume: 0 };
      exerciseLogs.push(exLog);
    }

    exLog.sets.push({ weight: w, reps: r });
    exLog.totalVolume += setVolume;
    if(w > exLog.maxWeight) {
      exLog.maxWeight = w;
    }

    // On ne touche pas aux dernières charges quand on corrige une ancienne séance
    if (!isEditing) state.lastWeights[exName] = w;
  });

  // En modification sans chrono lancé, on garde la durée d'origine (même si elle n'était pas renseignée)
  const keepOriginalDuration = isEditing && workoutSeconds === 0;
  const sessionDuration = keepOriginalDuration
    ? (editingOriginalDuration || undefined)
    : getFormattedWorkoutDuration();
  const typeBadgeEl = document.getElementById('seance-badge');
  const type = typeBadgeEl ? typeBadgeEl.innerText.trim().slice(-1) : state.nextType;

  const sessionDate = editingOriginalDate || new Date().toISOString().slice(0, 10);
  const sessionId = editingOriginalId || Date.now();

  const entry = {
    id: sessionId,
    date: sessionDate,
    type: type,
    isDeload: isDeloadActive(),
    tonnage: Math.round(totalTonnage),
    duration: sessionDuration,
    exercises: exerciseLogs
  };

  // En modification, la séance d'origine est encore dans l'historique : on la remplace
  if (isEditing) {
    const originalIdx = state.history.findIndex(h => h.id === editingOriginalId);
    if (originalIdx !== -1) state.history.splice(originalIdx, 1);
  }

  state.history.push(entry);
  state.history.sort((a, b) => new Date(a.date) - new Date(b.date));
  updateNextTypeFromHistory();

  clearEditState();
  localStorage.removeItem('workout_start_time');
  // Une séance enregistrée vide le brouillon ; une modification d'ancienne séance le laisse intact
  if (!isEditing) clearDraft();

  saveState();

  // Sauvegarde automatique Google Drive (si connecté) : fichier de sauvegarde complète mis à jour
  backupToDrive();

  // Actualise la bannière de déload en temps réel
  displayDeloadNotificationIfNeeded();

  showToast(`${isEditing ? 'Séance modifiée' : 'Séance enregistrée'} !\n• Temps : ${sessionDuration || 'N/A'}\n• Séries enregistrées : ${validatedRows.length}\n• Tonnage réel : ${Math.round(totalTonnage).toLocaleString()} kg${driveSaveNotice()}`);

  initWorkoutForm();
  renderHistory();
  renderCharts();
  switchTab('seance');
}

document.addEventListener('submit', function(e) {
  if (e.target && e.target.id === 'workout-form') submitWorkout(e);
});

// ============================================================
// 11. ÉCRAN HISTORIQUE ET MODIFICATION D'UNE SÉANCE
// ============================================================
function renderHistory() {
  const container = document.getElementById('history-list');
  if(!container) return;
  container.innerHTML = '';

  const history = state.history || [];
  const countEl = document.getElementById('history-count');
  if (countEl) countEl.textContent = `${history.length} séance${history.length > 1 ? 's' : ''} enregistrée${history.length > 1 ? 's' : ''}`;

  // Index réels triés du plus récent au plus ancien, regroupés par mois
  const order = history.map((h, i) => i).sort((x, y) => {
    const a = history[x], b = history[y];
    return a.date < b.date ? 1 : a.date > b.date ? -1 : (b.id || 0) - (a.id || 0);
  });
  const groups = [];
  order.forEach(i => {
    const key = (history[i].date || '').substring(0, 7);
    let g = groups[groups.length - 1];
    if (!g || g.key !== key) { g = { key, items: [], tonnage: 0 }; groups.push(g); }
    g.items.push(i);
    g.tonnage += parseFloat(history[i].tonnage) || 0;
  });

  groups.forEach(g => {
    const [y, mm] = g.key.split('-');
    const section = document.createElement('section');
    section.className = 'history-month';
    section.innerHTML = `
      <div class="history-month-head">
        <h3 class="history-month-title">${HISTORY_MONTHS[(+mm || 1) - 1]} ${y}</h3>
        <span class="history-month-meta">${g.items.length} séance${g.items.length > 1 ? 's' : ''} · ${historyTonnes(g.tonnage)} T</span>
      </div>`;
    const card = document.createElement('div');
    card.className = 'card history-card';

    g.items.forEach(realIndex => {
      const h = history[realIndex];
      const hasDuration = h.duration && h.duration !== 'N/A';
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'history-item';
      row.setAttribute('aria-label', `Séance ${h.type} du ${formatDate(h.date)} : modifier`);
      row.onclick = () => openSessionModal(realIndex);
      row.innerHTML = `
        <span class="type-pill type-pill-${h.type} small">${h.type}</span>
        <span class="history-main">
          <span class="history-date">${formatHistoryDate(h.date)}${h.isDeload ? ' <span class="deload-tag"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 3L5 14h6l-1 7 8-11h-6z"/></svg>Déload</span>' : ''}</span>
          <span class="history-duration">${hasDuration ? h.duration : 'Durée non enregistrée'}</span>
        </span>
        <span class="history-tonnage">${historyTonnes(h.tonnage)} T</span>
        <span class="history-chevron">${CHEVRON_SVG}</span>`;
      card.appendChild(row);
    });
    section.appendChild(card);
    container.appendChild(section);
  });
}

// « Sam. 10 oct. »
function formatHistoryDate(dateStr) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr || '');
  if (!m) return dateStr || '';
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return `${HISTORY_DAYS[d.getUTCDay()]} ${+m[3]} ${HISTORY_MONTHS_SHORT[+m[2] - 1]}`;
}

function historyTonnes(kg) {
  return (parseFloat(kg || 0) / 1000).toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

// Message d'information non bloquant (remplace alert() pour les confirmations : pas de case
// « Empêcher cette page d'ouvrir des dialogues » de Chrome, aucun clic requis). Touche pour fermer.
let toastTimer = null;
function showToast(message, ms = 6000) {
  try { (window.__toastLog = window.__toastLog || []).push(String(message)); window.__toastLog = window.__toastLog.slice(-20); } catch (e) { /* ignoré */ }
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast'; el.className = 'toast'; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite');
    el.addEventListener('click', () => { el.classList.remove('show'); });
    document.body.appendChild(el);
  }
  const lines = String(message).split('\n');
  el.innerHTML = '';
  const title = document.createElement('strong'); title.textContent = lines[0]; el.appendChild(title);
  lines.slice(1).forEach(l => { const d = document.createElement('div'); d.textContent = l; el.appendChild(d); });
  // redémarre l'animation si un message est déjà affiché
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}

function injectSessionModalHtml() {
  if (document.getElementById('session-modal')) return;
  const modalHtml = `
    <div id="session-modal" class="modal-overlay" style="display:none;" onclick="if(event.target===this) closeSessionModal()">
      <div class="modal-sheet" role="dialog" aria-modal="true" aria-labelledby="modal-session-title">
        <div id="modal-session-pill"></div>
        <h3 id="modal-session-title" class="modal-title">Séance</h3>
        <p id="modal-session-meta" class="modal-meta"></p>
        <button id="modal-edit-btn" class="btn">Modifier la séance</button>
        <button id="modal-delete-btn" class="btn btn-danger" onclick="deleteSelectedSession()">Supprimer la séance</button>
        <button onclick="closeSessionModal()" class="btn btn-secondary">Fermer</button>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);

  document.getElementById('modal-edit-btn').addEventListener('click', () => {
    if (selectedSessionIndex !== null) {
      const sessionToEdit = state.history[selectedSessionIndex];
      
      // La séance reste dans l'historique tant que la modification n'est pas validée :
      // rien n'est perdu si on quitte ou si on annule.
      editingOriginalDate = sessionToEdit.date;
      editingOriginalId = sessionToEdit.id;
      editingOriginalDuration = sessionToEdit.duration || null;
      editingOriginalIsDeload = !!sessionToEdit.isDeload;

      initWorkoutForm(sessionToEdit);

      closeSessionModal();
      switchTab('seance');

      showToast(`Séance ${sessionToEdit.type} du ${formatDate(sessionToEdit.date)} chargée dans le formulaire. Corrigez-la puis validez, ou annulez : l'originale reste intacte tant que vous n'avez pas validé.`);
    }
  });
}

// Suppression d'une séance de l'historique (essai de validation, saisie par erreur...).
// Les dernières charges sont recalculées, la prochaine séance repart de l'historique restant, et la
// sauvegarde Google Drive est mise à jour : la séance supprimée y est retirée (voir DRIVE_DELETED_KEY).
function deleteSelectedSession() {
  if (selectedSessionIndex === null) return;
  const idx = selectedSessionIndex;
  const session = state.history[idx];
  if (!session) return;
  const driveOn = isDriveWanted() || !!getDriveToken();
  if (!confirm(`Supprimer définitivement la séance ${session.type} du ${formatDate(session.date)} ?` + (driveOn ? '\nElle sera aussi retirée de la sauvegarde Google Drive.' : ''))) return;

  state.history.splice(idx, 1);
  if (session.id !== undefined && session.id !== null) rememberDeletedSessionId(session.id);

  // Dernières charges : on repart de l'historique restant pour les exercices de la séance supprimée
  if (!state.lastWeights) state.lastWeights = {};
  (session.exercises || []).forEach(ex => {
    if (isCardioName(ex.name)) return;
    delete state.lastWeights[ex.name];
    state.history.forEach(h => {
      const e = (h.exercises || []).find(x => x.name === ex.name);
      if (e && Array.isArray(e.sets)) e.sets.filter(isPerformedSet).forEach(st => { state.lastWeights[ex.name] = st.weight; });
    });
  });

  updateNextTypeFromHistory();
  saveState();
  backupToDrive();
  closeSessionModal();
  renderHistory();
  renderCharts();
  displayDeloadNotificationIfNeeded();
}

function openSessionModal(index) {
  selectedSessionIndex = index;
  const session = state.history[index];
  const titleEl = document.getElementById('modal-session-title');
  if (titleEl) {
    titleEl.innerText = `Séance ${session.type} du ${formatDate(session.date)}`;
  }
  const pillEl = document.getElementById('modal-session-pill');
  if (pillEl) pillEl.innerHTML = `<span class="type-pill type-pill-${session.type}">${session.type}</span>`;
  const metaEl = document.getElementById('modal-session-meta');
  if (metaEl) {
    const hasDuration = session.duration && session.duration !== 'N/A';
    metaEl.textContent = `${formatHistoryDate(session.date)} · ${historyTonnes(session.tonnage)} T · ${hasDuration ? session.duration : 'durée non enregistrée'}`;
  }
  const modal = document.getElementById('session-modal');
  if (modal) {
    modal.style.display = 'flex';
  }
}

function closeSessionModal() {
  const modal = document.getElementById('session-modal');
  if (modal) {
    modal.style.display = 'none';
  }
  selectedSessionIndex = null;
}

// Annule la séance en cours de saisie : arrête et remet à zéro le chrono, supprime le brouillon,
// recrée un formulaire vide. Rien n'est enregistré dans l'historique.
function cancelNewSession() {
  if (!confirm("Annuler la séance en cours ? Les séries saisies et le chrono seront supprimés (rien n'est enregistré).")) return;
  resetWorkoutTimer();
  // Chrono de pause : arrêté lui aussi (sinon le décompte et le « GO ! » continuent)
  if (restTimerInterval) { clearInterval(restTimerInterval); restTimerInterval = null; }
  try { localStorage.removeItem('rest_end_time'); } catch (e) {}
  clearDraft();
  initWorkoutForm();
  resetRestTimerUi();
  switchTab('programme');
}

function cancelEditSession() {
  clearEditState();
  initWorkoutForm();
  switchTab('historique');
}

// ============================================================
// 12. ÉCRAN GRAPHIQUES : FILTRES ET COURBES
// ============================================================
function populateExerciseSelect() {
  const select = document.getElementById('exercise-filter');
  if(!select) return;
  select.innerHTML = '';
  
  let allExercises = [];
  Object.values(PROGRAM).forEach(p => {
    p.exercises.forEach(e => {
      if (e.cardio) return; // le rameur n'a pas de charge à suivre
      let exName = e.name;
      if (exName === "Mollets / Finition") {
        exName = "Mollets";
      }
      if(!allExercises.find(x => x === exName)) {
        allExercises.push(exName);
      }
    });
  });

  allExercises.forEach(exName => {
    const opt = document.createElement('option');
    opt.value = exName;
    opt.innerText = exName;
    select.appendChild(opt);
  });
}

// Met en surbrillance le bouton choisi parmi les filtres du graphique de volume
// (les boutons du graphique par exercice ne sont pas concernés)
function highlightVolumeButton(btn) {
  document.querySelectorAll('#tab-progression .filter-btn').forEach(b => {
    if(b.id !== 'btn-mode-max' && b.id !== 'btn-mode-vol') b.classList.remove('active');
  });
  if (btn) btn.classList.add('active');
}

// Le bouton "par séance" affiche "A / B / C" au repos, puis la séance affichée (Séance A, B ou C)
function updateSessionTypeButton() {
  const typeBtn = document.getElementById('btn-vol-type');
  if (!typeBtn) return;
  typeBtn.innerText = currentVolumeFilter === 'type' ? `Séance ${currentSessionTypeFilter}` : 'A / B / C';
}

function setVolumeFilter(filter, btn) {
  currentVolumeFilter = filter;
  highlightVolumeButton(btn);
  updateSessionTypeButton();
  renderTonnageChart();
}

// Chaque appui fait défiler les séances : A, puis B, puis C, puis A...
// (le premier appui, depuis un autre filtre, démarre toujours sur A)
function cycleSessionTypeFilter(btn) {
  if (currentVolumeFilter === 'type') {
    const idx = SESSION_TYPES.indexOf(currentSessionTypeFilter);
    currentSessionTypeFilter = SESSION_TYPES[(idx + 1) % SESSION_TYPES.length];
  } else {
    currentVolumeFilter = 'type';
    currentSessionTypeFilter = SESSION_TYPES[0];
  }
  highlightVolumeButton(btn);
  updateSessionTypeButton();
  renderTonnageChart();
}

function setExMetricMode(mode, btn) {
  currentExMetricMode = mode;
  document.getElementById('btn-mode-max').classList.remove('active');
  document.getElementById('btn-mode-vol').classList.remove('active');
  btn.classList.add('active');
  renderExerciseChart();
}

function renderTonnageChart() {
  const canvas = document.getElementById('tonnageChart');
  if (!canvas) return;
  const ctx1 = canvas.getContext('2d');
  if (tonnageChart) tonnageChart.destroy();

  let labels = [];
  let data = [];

  if (!state.history || state.history.length === 0) {
    labels = ['Aucune donnée'];
    data = [0];
  } else if (currentVolumeFilter === 'month') {
    // --- VUE PAR MOIS ---
    let monthlyData = {};
    state.history.forEach(e => {
      if (!e.date) return;
      const monthKey = e.date.substring(0, 7); // Format 'AAAA-MM'
      if (!monthlyData[monthKey]) monthlyData[monthKey] = 0;
      monthlyData[monthKey] += (parseFloat(e.tonnage) || 0);
    });

    // Tri chronologique strict des mois
    const sortedMonths = Object.keys(monthlyData).sort((a, b) => a.localeCompare(b));

    const monthNames = {
      "01": "Janvier", "02": "Février", "03": "Mars", "04": "Avril",
      "05": "Mai", "06": "Juin", "07": "Juillet", "08": "Août",
      "09": "Septembre", "10": "Octobre", "11": "Novembre", "12": "Décembre"
    };

    sortedMonths.forEach(m => {
      const [y, mm] = m.split('-');
      const monthLabel = monthNames[mm] || mm;
      labels.push(`${monthLabel} ${y}`);
      data.push(monthlyData[m]);
    });
  } else if (currentVolumeFilter === 'type') {
    // --- VUE PAR TYPE DE SÉANCE (A, B ou C) ---
    const typedHistory = [...state.history]
      .filter(e => e.type === currentSessionTypeFilter)
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    if (typedHistory.length === 0) {
      labels = ['Aucune donnée'];
      data = [0];
    } else {
      labels = typedHistory.map(e => `${e.type} (${formatDate(e.date)})`);
      data = typedHistory.map(e => parseFloat(e.tonnage) || 0);
    }
  } else {
    // --- VUE PAR SÉANCE (toutes les séances) ---
    const sortedHistory = [...state.history].sort((a, b) => new Date(a.date) - new Date(b.date));

    labels = sortedHistory.map(e => `${e.type} (${formatDate(e.date)})`);
    data = sortedHistory.map(e => parseFloat(e.tonnage) || 0);
  }

  // Courbe blanche sur le bloc héros indigo
  const lineLabel = currentVolumeFilter === 'type' ? `Tonnage séance ${currentSessionTypeFilter} (kg)` : 'Tonnage (kg)';
  const onHero = 'rgba(255, 255, 255, 0.8)';

  tonnageChart = new Chart(ctx1, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: lineLabel,
        data: data,
        borderColor: '#fff',
        backgroundColor: 'rgba(255, 255, 255, 0.18)',
        borderWidth: 2.5,
        fill: true,
        tension: 0.3,
        pointBackgroundColor: '#fff',
        pointRadius: 3
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: onHero, font: { size: 10 }, maxTicksLimit: 6, maxRotation: 0, minRotation: 0, autoSkip: true }, grid: { display: false }, border: { display: false } },
        y: { ticks: { color: onHero, maxTicksLimit: 5 }, grid: { color: 'rgba(255, 255, 255, 0.15)' }, border: { display: false } }
      }
    }
  });
}

function renderExerciseChart() {
  const canvas = document.getElementById('exerciseChart');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  if (exerciseChart) exerciseChart.destroy();

  const selectEl = document.getElementById('exercise-filter');
  const selectedEx = selectEl ? selectEl.value : '';
  const isSelected = name => selectedEx === "Mollets"
    ? (name === "Mollets" || name === "Mollets / Finition")
    : name === selectedEx;
  let labels = [];
  let chartData = [];
  let dates = [];

  state.history.forEach(h => {
    if (h.exercises) {
      const exData = h.exercises.find(e => isSelected(e.name));

      // On ignore les séances où l'exercice n'a pas été réellement fait (séries à 0 kg / 0 rép.)
      // pour ne pas tracer de faux creux à 0 dans la progression.
      const performedSets = (exData && Array.isArray(exData.sets)) ? exData.sets.filter(isPerformedSet) : null;
      const wasPerformed = performedSets ? performedSets.length > 0 : !!(exData && (exData.maxWeight || 0) > 0);

      if (exData && wasPerformed) {
        labels.push(`${h.type} (${formatDate(h.date)})`);
        dates.push(h.date);
        if (currentExMetricMode === 'volume') {
          chartData.push(exData.totalVolume || 0);
        } else {
          // Charge max calculée sur les séries réellement faites uniquement
          chartData.push(performedSets
            ? Math.max(...performedSets.map(s => parseFloat(s.weight) || 0))
            : (exData.maxWeight || 0));
        }
      }
    }
  });

  // Bande ambre : séances du palier en cours pour cet exercice (règle des 4 dernières séances)
  let plateauStart = -1;
  try {
    const plateau = analyzeMonthlyProgress().plateaus.find(p => isSelected(p.exercise));
    if (plateau) plateauStart = dates.findIndex(d => d >= plateau.sinceDate);
  } catch (e) { plateauStart = -1; }
  const note = document.getElementById('exercise-plateau-note');
  if (note) note.hidden = plateauStart < 0;

  const bandPlugin = {
    id: 'plateauBand',
    beforeDatasetsDraw(chart) {
      if (plateauStart < 0 || chartData.length === 0) return;
      const { ctx: c, chartArea, scales } = chart;
      const step = chartData.length > 1 ? (scales.x.getPixelForValue(1) - scales.x.getPixelForValue(0)) : 0;
      const left = Math.max(chartArea.left, scales.x.getPixelForValue(plateauStart) - step / 2);
      c.save();
      c.fillStyle = CHART_COLORS.band;
      c.fillRect(left, chartArea.top, chartArea.right - left, chartArea.bottom - chartArea.top);
      c.restore();
    }
  };

  const labelTitle = currentExMetricMode === 'volume' ? 'Volume Cumulé (kg)' : 'Charge Max (kg)';
  const color = currentExMetricMode === 'volume' ? CHART_COLORS.volume : CHART_COLORS.primary;

  exerciseChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels.length ? labels : ['Aucune donnée'],
      datasets: [{
        label: labelTitle,
        data: chartData.length ? chartData : [0],
        borderColor: color,
        backgroundColor: `${color}22`,
        borderWidth: 2.5,
        fill: true,
        tension: 0.2,
        pointRadius: 3
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: CHART_COLORS.tick, font: { size: 10 }, maxTicksLimit: 6, maxRotation: 0, minRotation: 0, autoSkip: true }, grid: { display: false } },
        y: { ticks: { color: CHART_COLORS.tick, maxTicksLimit: 5 }, grid: { color: CHART_COLORS.grid }, border: { display: false } }
      }
    },
    plugins: [bandPlugin]
  });
}

function addWeight() {
  const input = document.getElementById('new-weight');
  const val = parseFloat(input.value);
  if (val) {
    state.weights.push({
      date: new Date().toISOString().slice(0,10),
      weight: val
    });
    saveState();
    input.value = '';
    clearWeightDraft();
    renderCharts();
  }
}

// Suivi cardio : allure au km (rameur) par date
function renderCardioChart() {
  const canvas = document.getElementById('cardioChart');
  if (!canvas) return;
  if (cardioChart) { cardioChart.destroy(); cardioChart = null; }
  const points = [];
  (state.history || []).forEach(h => {
    const ex = (h.exercises || []).find(e => isCardioName(e.name));
    const set = ex && Array.isArray(ex.sets) ? ex.sets.find(isPerformedCardioSet) : null;
    if (set && h.date) points.push({ date: h.date, pace: paceSecPerKm(set.seconds, set.meters) });
  });
  points.sort((a, b) => new Date(a.date) - new Date(b.date));
  const empty = document.getElementById('cardio-empty');
  if (empty) empty.hidden = points.length > 0;
  canvas.hidden = points.length === 0;
  const cur = document.getElementById('cardio-current');
  if (cur) cur.textContent = points.length ? formatDurationMS(points[points.length - 1].pace) : '–';
  if (!points.length) return;
  cardioChart = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: {
      labels: points.map(p => formatDate(p.date)),
      datasets: [{
        label: 'Allure (min/km)',
        data: points.map(p => p.pace),
        borderColor: CHART_COLORS.success,
        backgroundColor: CHART_COLORS.success + '22',
        borderWidth: 2.5, pointRadius: 3, fill: true, tension: 0.2
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => `${formatDurationMS(c.parsed.y)} /km` } } },
      scales: {
        x: { ticks: { color: CHART_COLORS.tick, maxTicksLimit: 6, maxRotation: 0, minRotation: 0, autoSkip: true }, grid: { display: false } },
        y: { ticks: { color: CHART_COLORS.tick, maxTicksLimit: 5, callback: v => formatDurationMS(v) }, grid: { color: CHART_COLORS.grid }, border: { display: false } }
      }
    }
  });
}

function renderCharts() {
  renderTonnageChart();
  renderExerciseChart();
  renderCardioChart();
  renderProgressAnalysis();

  const canvas = document.getElementById('weightChart');
  if(!canvas) return;
  const ctx2 = canvas.getContext('2d');
  if (weightChart) weightChart.destroy();

  const wcur = document.getElementById('weight-current');
  if (wcur) {
    const last = state.weights && state.weights.length ? state.weights[state.weights.length - 1].weight : null;
    wcur.textContent = last === null ? '–' : last;
  }

  weightChart = new Chart(ctx2, {
    type: 'line',
    data: {
      labels: state.weights.map(w => formatDate(w.date)),
      datasets: [{
        label: 'Poids (kg)',
        data: state.weights.map(w => w.weight),
        borderColor: CHART_COLORS.success,
        backgroundColor: CHART_COLORS.success + '22',
        borderWidth: 2.5,
        pointRadius: 3,
        fill: true,
        tension: 0.2
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: CHART_COLORS.tick, maxTicksLimit: 6, maxRotation: 0, minRotation: 0, autoSkip: true }, grid: { display: false } },
        y: { ticks: { color: CHART_COLORS.tick, maxTicksLimit: 5 }, grid: { color: CHART_COLORS.grid }, border: { display: false } }
      }
    }
  });
}

// ============================================================
// 13. ANALYSE MENSUELLE DE PROGRESSION
// ============================================================
function analyzeMonthlyProgress() {
  if (!state.history || state.history.length === 0) {
    return {
      monthlyData: [],
      currentMonthRecords: [],
      plateaus: [],
      overallStats: null,
      advice: []
    };
  }

  const monthNames = {
    "01": "Janvier", "02": "Février", "03": "Mars", "04": "Avril",
    "05": "Mai", "06": "Juin", "07": "Juillet", "08": "Août",
    "09": "Septembre", "10": "Octobre", "11": "Novembre", "12": "Décembre"
  };

  // 1. Regrouper les données par mois
  const monthlyData = {};
  const allExercises = new Set();

  state.history.forEach(session => {
    if (!session.date) return;
    const monthKey = session.date.substring(0, 7);
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = {
        year: session.date.substring(0, 4),
        month: session.date.substring(5, 7),
        monthName: monthNames[session.date.substring(5, 7)] || session.date.substring(5, 7),
        totalTonnage: 0,
        sessionCount: 0,
        sessions: [],
        exercises: {},
        sessionTypes: { A: 0, B: 0, C: 0 }
      };
    }
    monthlyData[monthKey].totalTonnage += parseFloat(session.tonnage) || 0;
    monthlyData[monthKey].sessionCount++;
    monthlyData[monthKey].sessions.push(session);
    if (session.type && ['A', 'B', 'C'].includes(session.type)) {
      monthlyData[monthKey].sessionTypes[session.type]++;
    }

    if (session.exercises) {
      session.exercises.forEach(ex => {
        if (ex.name) {
          allExercises.add(ex.name);
          if (!monthlyData[monthKey].exercises[ex.name]) {
            monthlyData[monthKey].exercises[ex.name] = { maxWeights: [], volumes: [] };
          }
          if (ex.maxWeight) {
            monthlyData[monthKey].exercises[ex.name].maxWeights.push(parseFloat(ex.maxWeight) || 0);
          }
          if (ex.totalVolume) {
            monthlyData[monthKey].exercises[ex.name].volumes.push(parseFloat(ex.totalVolume) || 0);
          }
        }
      });
    }
  });

  const sortedMonths = Object.keys(monthlyData).sort();
  const monthlyArray = sortedMonths.map(key => monthlyData[key]);

  // 2. Les 4 derniers mois calendaires (mois en cours inclus), même sans séance.
  // On ne remonte pas avant le premier mois contenant des séances.
  const now = new Date();
  const monthKeyFromOffset = offset => {
    const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  };
  const realMonthKey = monthKeyFromOffset(0);
  const firstMonthKey = sortedMonths[0];

  const last4MonthlyData = [];
  for (let offset = 3; offset >= 0; offset--) {
    const key = monthKeyFromOffset(offset);
    if (key < firstMonthKey) continue;
    const [year, month] = key.split('-');
    last4MonthlyData.push(monthlyData[key] || {
      year: year,
      month: month,
      monthName: monthNames[month] || month,
      totalTonnage: 0,
      sessionCount: 0,
      sessions: [],
      exercises: {},
      sessionTypes: { A: 0, B: 0, C: 0 }
    });
  }

  // 3. Records battus ce mois-ci (mois calendaire réel, comparés à tout l'historique antérieur)
  const lastDataMonthKey = sortedMonths[sortedMonths.length - 1];
  // Dernier mois ayant des séances (sert aux conseils ci-dessous)
  const currentMonthData = monthlyData[lastDataMonthKey];
  const thisMonthData = monthlyData[realMonthKey];
  const currentMonthRecords = [];

  if (thisMonthData) {
    const earlierMonths = sortedMonths.filter(key => key < realMonthKey);
    allExercises.forEach(exName => {
      const thisEx = thisMonthData.exercises[exName];
      if (!thisEx || thisEx.maxWeights.length === 0) return;
      const currentMax = Math.max(...thisEx.maxWeights);

      // Meilleure charge avant ce mois-ci pour cet exercice
      let previousMax = 0;
      earlierMonths.forEach(key => {
        const prevEx = monthlyData[key].exercises[exName];
        if (prevEx && prevEx.maxWeights.length > 0) {
          previousMax = Math.max(previousMax, ...prevEx.maxWeights);
        }
      });

      if (currentMax > previousMax) {
        currentMonthRecords.push({
          exercise: exName,
          newMax: currentMax,
          improvement: currentMax - previousMax
        });
      }
    });
  }

  // 4. Détecter les paliers : pour chaque exercice, sur ses 4 dernières séances réalisées
  // (indépendamment des mois). Il y a palier quand aucune des 3 séances suivantes ne dépasse la plus
  // ancienne des 4, ni en charge max ni en volume. La série est prolongée tant que c'est vrai.
  const PLATEAU_WINDOW = 4;
  const exerciseSessions = {};

  state.history
    .filter(session => session.date && session.exercises)
    .slice()
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : (a.id || 0) - (b.id || 0)))
    .forEach(session => {
      const perExercise = {};
      session.exercises.forEach(ex => {
        const maxWeight = parseFloat(ex.maxWeight) || 0;
        if (!ex.name || maxWeight <= 0) return; // exercice non réalisé
        if (!perExercise[ex.name]) {
          perExercise[ex.name] = { date: session.date, maxWeight: 0, totalVolume: 0 };
        }
        perExercise[ex.name].maxWeight = Math.max(perExercise[ex.name].maxWeight, maxWeight);
        perExercise[ex.name].totalVolume += parseFloat(ex.totalVolume) || 0;
      });
      Object.keys(perExercise).forEach(name => {
        if (!exerciseSessions[name]) exerciseSessions[name] = [];
        exerciseSessions[name].push(perExercise[name]);
      });
    });

  const plateaus = [];
  Object.keys(exerciseSessions).forEach(exName => {
    const sessions = exerciseSessions[exName];
    const total = sessions.length;
    if (total < PLATEAU_WINDOW) return;

    // La plus ancienne des `length` dernières séances n'est battue par aucune des suivantes
    const holdsOver = length => {
      const recent = sessions.slice(total - length);
      const reference = recent[0];
      return recent.slice(1).every(s =>
        s.maxWeight <= reference.maxWeight && s.totalVolume <= reference.totalVolume
      );
    };
    if (!holdsOver(PLATEAU_WINDOW)) return;

    let length = PLATEAU_WINDOW;
    while (length < total && holdsOver(length + 1)) length++;

    const latest = sessions[total - 1];
    plateaus.push({
      exercise: exName,
      currentMax: latest.maxWeight,
      currentVolume: latest.totalVolume,
      sinceDate: sessions[total - length].date,
      sessionsCount: length
    });
  });
  plateaus.sort((a, b) => b.sessionsCount - a.sessionsCount);

  // 5. Progression
  // 5a. Mois dernier vs mois précédent (mois calendaires ; le mois en cours, incomplet, est exclu)
  let lastVsPreviousDiffPercent = null;
  const lastMonthKey = monthKeyFromOffset(1);
  const previousMonthKey = monthKeyFromOffset(2);

  if (previousMonthKey >= firstMonthKey) {
    const lastTonnage = monthlyData[lastMonthKey] ? monthlyData[lastMonthKey].totalTonnage : 0;
    const previousTonnage = monthlyData[previousMonthKey] ? monthlyData[previousMonthKey].totalTonnage : 0;
    if (previousTonnage > 0) {
      lastVsPreviousDiffPercent = Math.round(((lastTonnage - previousTonnage) / previousTonnage) * 100);
    }
  }

  // 5b. Progression par séance (A/B/C) sur l'ensemble de l'historique, sans tenir compte des mois :
  // médiane du tonnage des (jusqu'à) 3 dernières séances vs les 3 premières, séances de décharge exclues.
  const median = values => {
    const sorted = values.slice().sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  };

  const sessionProgress = {};
  const typePercents = [];
  ['A', 'B', 'C'].forEach(type => {
    const tonnages = state.history
      .filter(session => session.date && session.type === type && !session.isDeload && (parseFloat(session.tonnage) || 0) > 0)
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : (a.id || 0) - (b.id || 0)))
      .map(session => parseFloat(session.tonnage));

    let percent = null;
    if (tonnages.length >= 2) {
      const n = Math.min(3, Math.floor(tonnages.length / 2));
      const first = median(tonnages.slice(0, n));
      const last = median(tonnages.slice(-n));
      if (first > 0) {
        percent = Math.round(((last - first) / first) * 100);
        typePercents.push(percent);
      }
    }
    sessionProgress[type] = { percent: percent, sessions: tonnages.length };
  });

  // 5c. Indice de progression global : moyenne des progressions A, B et C disponibles
  const globalProgressIndex = typePercents.length > 0
    ? Math.round(typePercents.reduce((sum, value) => sum + value, 0) / typePercents.length)
    : null;

  const overallStats = {
    lastVsPreviousDiffPercent: lastVsPreviousDiffPercent,
    globalProgressIndex: globalProgressIndex,
    sessionProgress: sessionProgress
  };

  // 6. Conseils personnalisés
  const advice = [];

  // Détecter déséquilibre entre séances A/B/C
  if (currentMonthData.sessionTypes.A > 0 || currentMonthData.sessionTypes.B > 0 || currentMonthData.sessionTypes.C > 0) {
    const totalSessions = currentMonthData.sessionTypes.A + currentMonthData.sessionTypes.B + currentMonthData.sessionTypes.C;
    if (totalSessions >= 3) {
      const avg = totalSessions / 3;
      const maxType = Math.max(currentMonthData.sessionTypes.A, currentMonthData.sessionTypes.B, currentMonthData.sessionTypes.C);
      const minType = Math.min(currentMonthData.sessionTypes.A, currentMonthData.sessionTypes.B, currentMonthData.sessionTypes.C);
      
      if (maxType > avg * 1.5) {
        const maxTypeName = currentMonthData.sessionTypes.A === maxType ? 'A' : 
                           currentMonthData.sessionTypes.B === maxType ? 'B' : 'C';
        advice.push({
          type: 'info',
          text: `Déséquilibre : Tu fais plus de séances ${maxTypeName} (${maxType}) que des autres`
        });
      }
    }
  }

  // Si pas de données
  if (last4MonthlyData.length === 0) {
    advice.push({
      type: 'info',
      text: 'Aucune donnée disponible. Commence par enregistrer quelques séances !'
    });
  }

  return {
    monthlyData: last4MonthlyData,
    currentMonthKey: realMonthKey,
    currentMonthRecords: currentMonthRecords,
    plateaus: plateaus,
    overallStats: overallStats,
    advice: advice
  };
}

// Bloc héros : indice de progression global + pastille « X % vs mois précédent »
function renderHero(stats) {
  const idx = document.getElementById('hero-index');
  const pill = document.getElementById('hero-pill');
  if (idx) {
    const g = stats ? stats.globalProgressIndex : null;
    idx.textContent = (g === null || g === undefined) ? '–' : `${g > 0 ? '+' : ''}${g} %`;
  }
  if (pill) {
    const d = stats ? stats.lastVsPreviousDiffPercent : null;
    if (d === null || d === undefined) {
      pill.hidden = true;
    } else {
      pill.hidden = false;
      pill.textContent = `${d > 0 ? '▲ +' : d < 0 ? '▼ ' : ''}${d} % vs mois précédent`;
    }
  }
}

function renderProgressAnalysis() {
  const container = document.getElementById('monthly-analysis');
  if (!container) return;

  const analysis = analyzeMonthlyProgress();
  const stats = analysis.overallStats;
  renderHero(stats);
  let html = '';

  // Si pas de données
  if (analysis.monthlyData.length === 0) {
    container.innerHTML = `
      <div class="card analysis-empty">
        <p>\ud83d\udcca Aucune donnée disponible.</p>
        <p style="font-size: 0.9125rem; margin-top: 8px;">Enregistre des séances pour voir ta progression !</p>
      </div>`;
    return;
  }

  // 1. 4 derniers mois : barres horizontales (le mois courant en indigo)
  const maxTonnage = Math.max(...analysis.monthlyData.map(m => m.totalTonnage), 1);
  html += `<div class="card"><h3 class="analysis-section-title">4 derniers mois</h3><div class="bar-list">`;
  analysis.monthlyData.forEach(month => {
    const tonnageInTonnes = (month.totalTonnage / 1000).toFixed(1);
    const isCurrentMonth = month.year + '-' + month.month === analysis.currentMonthKey;
    const monthLabel = isCurrentMonth ? 'Ce mois-ci' : `${month.monthName} ${month.year}`;
    const width = Math.round((month.totalTonnage / maxTonnage) * 100);
    html += `
      <div>
        <div class="bar-row-head">
          <span><span class="bar-label">${monthLabel}</span> <span class="bar-meta">· ${month.sessionCount} séance${month.sessionCount > 1 ? 's' : ''}</span></span>
          <span class="bar-value">${tonnageInTonnes} T</span>
        </div>
        <div class="bar-track"><div class="bar-fill${isCurrentMonth ? ' current' : ''}" style="width:${width}%"></div></div>
      </div>`;
  });
  html += `</div></div>`;

  // 2. Records battus ce mois-ci
  if (analysis.currentMonthRecords.length > 0) {
    html += `<div class="card"><h3 class="analysis-section-title">Records battus ce mois-ci</h3><div class="records-list">`;
    analysis.currentMonthRecords.forEach(record => {
      html += `
        <div class="record-item">
          <span class="record-exercise">${record.exercise}</span>
          <span class="record-value">${record.newMax} kg</span>
          <span class="record-improvement">+${record.improvement} kg</span>
        </div>`;
    });
    html += `</div></div>`;
  }

  // 3. Paliers détectés
  html += `<div class="card"><h3 class="analysis-section-title">Paliers détectés</h3>`;
  if (analysis.plateaus.length > 0) {
    html += `<div class="plateaus-list">`;
    analysis.plateaus.forEach(plateau => {
      html += `
        <div class="plateau-item">
          <span class="plateau-exercise">${plateau.exercise}</span>
          <span class="plateau-value">${plateau.currentMax} kg</span>
          <span class="plateau-duration">sans progression depuis le ${plateau.sinceDate.substring(8, 10)}/${plateau.sinceDate.substring(5, 7)} (${plateau.sessionsCount} séances)</span>
        </div>`;
    });
    html += `</div>`;
  } else {
    html += `<p class="analysis-none">Aucun palier détecté</p>`;
  }
  html += `</div>`;

  // 4. Progression par séance (A/B/C), sur tout l'historique
  if (stats) {
    const types = ['A', 'B', 'C'].filter(t => stats.sessionProgress[t].percent !== null && stats.sessionProgress[t].percent !== undefined);
    if (types.length > 0) {
      const maxAbs = Math.max(...types.map(t => Math.abs(stats.sessionProgress[t].percent)), 1);
      html += `<div class="card"><h3 class="analysis-section-title">Progression par séance</h3>`;
      types.forEach(t => {
        const percent = stats.sessionProgress[t].percent;
        const cls = percent >= 0 ? 'positive' : 'negative';
        const symbol = percent >= 0 ? '\u25b2' : '\u25bc';
        const width = Math.max(3, Math.round((Math.abs(percent) / maxAbs) * 100));
        html += `
          <div class="progress-row">
            <span class="type-pill type-pill-${t} small">${t}</span>
            <div class="bar-track"><div class="bar-fill type-${t}" style="width:${width}%"></div></div>
            <span class="stat-value ${cls}">${symbol} ${Math.abs(percent)} %</span>
          </div>`;
      });
      html += `<p class="analysis-note">Tonnage médian des 3 dernières séances vs les 3 premières, sur tout l'historique (sans tenir compte des mois). L'indice global est la moyenne des séances A, B et C.</p></div>`;
    }
  }

  // 5. Conseils
  if (analysis.advice.length > 0) {
    html += `<div class="card"><div class="advice-list">`;
    analysis.advice.forEach(adviceItem => {
      const icon = adviceItem.type === 'success' ? '\u2705' :
                   adviceItem.type === 'warning' ? '\u26a0\ufe0f' :
                   adviceItem.type === 'info' ? '\u2139\ufe0f' : '\ud83d\udcad';
      html += `
        <div class="advice-item advice-${adviceItem.type}">
          <span class="advice-icon">${icon}</span>
          <span class="advice-text">${adviceItem.text}</span>
        </div>`;
    });
    html += `</div></div>`;
  }

  container.innerHTML = html;
}

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

function switchTab(tabName) {
  document.querySelectorAll('.container').forEach(c => c.classList.remove('active'));
  document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));

  const targetContainer = document.getElementById(`tab-${tabName}`);
  // « Réglages » est une page secondaire de l'Historique : c'est l'icône Historique qui reste allumée
  const targetNav = document.getElementById(`nav-${tabName === 'reglages' ? 'historique' : tabName}`);
  if(targetContainer) targetContainer.classList.add('active');
  const scroller = document.getElementById('app-scroll');
  if (scroller) scroller.scrollTop = 0;
  if(targetNav) targetNav.classList.add('active');

  const timerBtn = document.getElementById('timer-btn');
  if (timerBtn) {
    if (tabName === 'seance') {
      timerBtn.style.display = 'flex';
    } else {
      timerBtn.style.display = 'none';
    }
  }

  document.body.dataset.tab = tabName;
  const settingsBtn = document.getElementById('settings-btn');
  if (settingsBtn) settingsBtn.style.display = tabName === 'historique' ? 'flex' : 'none';
  const settingsBack = document.getElementById('settings-back');
  if (settingsBack) settingsBack.style.display = tabName === 'reglages' ? 'flex' : 'none';
  updateStickyOffsets();
  const pageTitle = document.getElementById('page-title');
  if (pageTitle) pageTitle.innerText = PAGE_TITLES[tabName] || '';

  if (tabName === 'programme') renderProgramOverview();
  if (tabName === 'progression') renderCharts();
  if (tabName === 'progression') renderProgressAnalysis();
  if (tabName === 'reglages') {
    updateDriveUI(); // le jeton Drive a pu expirer depuis l'ouverture de l'appli
    if (isDriveConnected() && !getDriveAccount()) fetchDriveAccount(); // nouvel essai de lecture de l'adresse
    if (isDriveConnected()) {
      probeDriveAccess(); // vérifie que Google autorise bien l'accès à Drive
      syncDriveBackup();  // crée le dossier / envoie la sauvegarde complète si ce n'est pas encore fait
    }
  }
}


// ============================================================
// 15b. SAUVEGARDE GOOGLE DRIVE (co-auteur : Grok)
// ============================================================
let driveTokenClient = null;

function getDriveToken() {
  try {
    const raw = localStorage.getItem(DRIVE_TOKEN_KEY);
    if (!raw) return null;
    const t = JSON.parse(raw);
    if (!t || !t.access_token) return null;
    // token still usable if expires in > 60 s
    if (t.expires_at && Date.now() > t.expires_at - 60000) return null;
    return t;
  } catch (e) { return null; }
}

function setDriveToken(tokenResponse) {
  const t = {
    access_token: tokenResponse.access_token,
    expires_at: Date.now() + (Number(tokenResponse.expires_in || 3600) * 1000)
  };
  localStorage.setItem(DRIVE_TOKEN_KEY, JSON.stringify(t));
  return t;
}

// Déconnexion voulue par l'utilisateur : tout est oublié (jeton, dossier, compte, souhait de sauvegarde).
function clearDriveToken() {
  localStorage.removeItem(DRIVE_TOKEN_KEY);
  localStorage.removeItem(DRIVE_FOLDER_ID_KEY);
  localStorage.removeItem(DRIVE_ACCOUNT_KEY);
  localStorage.removeItem(DRIVE_WANTED_KEY);
  localStorage.removeItem(DRIVE_ERROR_KEY);
  localStorage.removeItem(DRIVE_BACKUP_ID_KEY);
  localStorage.removeItem(DRIVE_LAST_HASH_KEY);
  localStorage.removeItem(DRIVE_LAST_BACKUP_KEY);
  localStorage.removeItem(DRIVE_CONFLICT_KEY);
}

// Raison courte d'une réponse d'erreur Google (« 403 accessNotConfigured »), pour l'afficher dans Réglages.
async function driveErrorText(res) {
  let reason = '';
  try {
    const e = (await res.json()).error;
    reason = (e && ((e.errors && e.errors[0] && e.errors[0].reason) || (e.details && e.details[0] && e.details[0].reason) || e.status)) || '';
  } catch (err) { /* corps illisible : on garde le code seul */ }
  return res.status + (reason ? ' ' + String(reason).slice(0, 60) : '');
}

// Empreinte légère (FNV-1a) des données : sert à savoir si elles ont changé depuis le dernier envoi.
function driveHash(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16) + '.' + str.length;
}
function getDriveBackupId() {
  try { return localStorage.getItem(DRIVE_BACKUP_ID_KEY) || null; } catch (e) { return null; }
}
function setDriveBackupId(id) {
  try { if (id) localStorage.setItem(DRIVE_BACKUP_ID_KEY, id); else localStorage.removeItem(DRIVE_BACKUP_ID_KEY); } catch (e) { /* ignoré */ }
}
function getDriveConflict() {
  try {
    const c = JSON.parse(localStorage.getItem(DRIVE_CONFLICT_KEY) || 'null');
    return c && typeof c.id === 'string' ? c : null;
  } catch (e) { return null; }
}
function setDriveConflict(c) {
  try { if (c) localStorage.setItem(DRIVE_CONFLICT_KEY, JSON.stringify(c)); else localStorage.removeItem(DRIVE_CONFLICT_KEY); } catch (e) { /* ignoré */ }
}
function formatDriveDate(iso) {
  try {
    const d = new Date(iso);
    if (!iso || isNaN(d.getTime())) return '';
    return d.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch (e) { return ''; }
}
// Anciennes versions (1.6.0 à 1.6.11) : fichiers par séance, file d'attente, historique à envoyer.
// Tout est contenu dans les données de l'application : ces repères ne servent plus.
function cleanupLegacyDriveKeys() {
  ['h49_drive_queue', 'h49_drive_uploaded', 'h49_drive_files', 'h49_drive_history_todo'].forEach(k => {
    try { localStorage.removeItem(k); } catch (e) { /* ignoré */ }
  });
}

function getDriveError() {
  try { return localStorage.getItem(DRIVE_ERROR_KEY) || ''; } catch (e) { return ''; }
}
function setDriveError(text) {
  try { localStorage.setItem(DRIVE_ERROR_KEY, text); } catch (e) { /* ignoré */ }
}
function clearDriveError() {
  try { localStorage.removeItem(DRIVE_ERROR_KEY); } catch (e) { /* ignoré */ }
}

// Jeton expiré ou refusé par Google (il ne dure qu'environ 1 h) : on n'oublie que le jeton ;
// le compte, le dossier et le souhait de sauvegarde restent, pour renouveler le jeton tout seul.
function expireDriveToken() {
  localStorage.removeItem(DRIVE_TOKEN_KEY);
}

function isDriveWanted() {
  return localStorage.getItem(DRIVE_WANTED_KEY) === '1';
}

function isDriveConnected() {
  return !!getDriveToken();
}

// Compte Google connecté (adresse affichée dans Réglages). Stocké sur l'appareil seulement,
// jamais injecté en HTML (textContent) ; hors sauvegarde exportée.
function getDriveAccount() {
  try {
    const a = JSON.parse(localStorage.getItem(DRIVE_ACCOUNT_KEY) || 'null');
    if (a && typeof a.email === 'string' && a.email) return a;
  } catch (e) { /* ignoré */ }
  return null;
}

// Lecture de l'adresse du compte connecté, sans permission supplémentaire :
//  1) API Drive « about » ; 2) à défaut, propriétaire du dossier de sauvegarde créé par l'application.
// Si aucune des deux ne répond, la raison est affichée dans Réglages (driveAccountError).
let driveAccountError = '';
let driveAccountFetching = false;

async function fetchDriveAccount() {
  const t = getDriveToken();
  if (!t || driveAccountFetching) return;
  driveAccountFetching = true;
  const headers = { Authorization: 'Bearer ' + t.access_token };
  const reasons = [];
  let found = null;
  try {
    try {
      const res = await fetch('https://www.googleapis.com/drive/v3/about?fields=user(displayName,emailAddress)', { headers });
      if (res.ok) {
        const u = (await res.json()).user;
        if (u && typeof u.emailAddress === 'string' && u.emailAddress) found = { email: u.emailAddress, name: u.displayName };
        else reasons.push('about : sans adresse');
      } else reasons.push('about : ' + await driveErrorText(res));
    } catch (e) { reasons.push('about : réseau'); }

    if (!found) {
      try {
        const folderId = await ensureDriveFolder(t.access_token);
        const res = await fetch('https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(folderId) + '?fields=owners(displayName,emailAddress)', { headers });
        if (res.ok) {
          const o = ((await res.json()).owners || [])[0];
          if (o && typeof o.emailAddress === 'string' && o.emailAddress) found = { email: o.emailAddress, name: o.displayName };
          else reasons.push('dossier : sans adresse');
        } else reasons.push('dossier : ' + await driveErrorText(res));
      } catch (e) { reasons.push('dossier : ' + (e && e.driveReason ? e.driveReason : 'indisponible')); }
    }

    if (found) {
      localStorage.setItem(DRIVE_ACCOUNT_KEY, JSON.stringify({
        email: found.email,
        name: typeof found.name === 'string' ? found.name : ''
      }));
      driveAccountError = '';
    } else {
      driveAccountError = reasons.join(' ; ');
    }
  } finally {
    driveAccountFetching = false;
    updateDriveUI();
  }
}

// Test léger de l'accès à Drive (liste d'un seul fichier) : met à jour la raison d'erreur affichée,
// pour que le message disparaisse dès que le problème est réglé (nouvelle connexion, API activée...).
let driveProbing = false;
async function probeDriveAccess() {
  const t = getDriveToken();
  if (!t || driveProbing) return;
  driveProbing = true;
  try {
    const res = await fetch('https://www.googleapis.com/drive/v3/files?pageSize=1&fields=files(id)', {
      headers: { Authorization: 'Bearer ' + t.access_token }
    });
    if (res.ok) clearDriveError(); else setDriveError(await driveErrorText(res));
  } catch (e) { /* hors-ligne : on garde l'état précédent */ }
  finally { driveProbing = false; updateDriveUI(); }
}

function updateDriveUI() {
  const statusEl = document.getElementById('drive-status');
  const connectBtn = document.getElementById('drive-connect-btn');
  const disconnectBtn = document.getElementById('drive-disconnect-btn');
  const restoreBtn = document.getElementById('drive-restore-btn');
  const replaceBtn = document.getElementById('drive-replace-btn');
  if (!statusEl) return;
  const account = getDriveAccount();
  const conflict = getDriveConflict();
  const last = localStorage.getItem(DRIVE_LAST_BACKUP_KEY);
  let pendingText = '';
  if (driveSyncing) pendingText = ' · envoi en cours…';
  else if ((isDriveConnected() || isDriveWanted()) && !conflict && driveNeedsBackup()) pendingText = ' · modifications en attente d\'envoi';
  else if (last) pendingText = ' · dernière sauvegarde : ' + formatDriveDate(last);
  const driveError = getDriveError();
  const showRestore = isDriveConnected() || isDriveWanted();
  if (restoreBtn) restoreBtn.style.display = showRestore ? '' : 'none';
  if (replaceBtn) replaceBtn.style.display = 'none';
  if (isDriveConnected() && conflict) {
    // Une sauvegarde existe déjà sur le Drive et contient des séances que cet appareil n'a pas : on ne l'écrase pas.
    statusEl.textContent = (account ? 'Compte ' + account.email + ' : ' : '')
      + 'une sauvegarde plus complète existe déjà sur ton Drive (' + (conflict.sessions != null ? conflict.sessions + ' séances, ' : '')
      + 'modifiée le ' + (formatDriveDate(conflict.modified) || 'date inconnue') + ') : l\'envoi est suspendu pour ne rien écraser. '
      + 'Touche « Restaurer depuis Drive » pour la récupérer, ou « Remplacer par cet appareil » pour la remplacer.';
    if (connectBtn) connectBtn.style.display = 'none';
    if (disconnectBtn) disconnectBtn.style.display = '';
    if (replaceBtn) replaceBtn.style.display = '';
  } else if (isDriveConnected() && driveError) {
    // Google refuse l'accès au dossier / à l'envoi : on ne prétend pas que la sauvegarde fonctionne.
    let hint = ' Touche « Déconnecter », puis reconnecte-toi ; si cela persiste, envoie ce message à Claude.';
    if (/accessNotConfigured|SERVICE_DISABLED/i.test(driveError)) {
      hint = ' L\'API Google Drive n\'est pas activée pour le projet Google de l\'application (Google Cloud, « API et services »).';
    } else if (/insufficient|SCOPE/i.test(driveError)) {
      hint = ' Autorisation Drive non accordée : touche « Déconnecter », puis reconnecte-toi en acceptant l\'accès à Drive.';
    }
    statusEl.textContent = (account ? 'Compte ' + account.email + ' : ' : '')
      + 'Google refuse l\'accès à Drive (' + driveError + ') — les séances ne sont pas sauvegardées.' + hint + pendingText;
    if (connectBtn) connectBtn.style.display = 'none';
    if (disconnectBtn) disconnectBtn.style.display = '';
  } else if (isDriveConnected()) {
    const accountIssue = !account && driveAccountError ? ' · adresse du compte indisponible (' + driveAccountError + ')' : '';
    statusEl.textContent = (account
      ? 'Connecté : ' + account.email + ' — sauvegarde automatique active'
      : 'Connecté — sauvegarde automatique active') + accountIssue + pendingText;
    if (connectBtn) connectBtn.style.display = 'none';
    if (disconnectBtn) disconnectBtn.style.display = '';
  } else if (isDriveWanted()) {
    // Accès expiré (≈ 1 h) : renouvelé tout seul au prochain « Enregistrer la séance » (navigateur : fenêtre
    // silencieuse ; application installée : reconnexion automatique par redirection).
    statusEl.textContent = (driveRedirectError ? 'Connexion Google refusée (' + driveRedirectError + ') · ' : '')
      + (account ? 'Compte ' + account.email + ' : ' : '')
      + (isInstalledApp()
        ? 'accès Google expiré : reconnexion automatique à la prochaine séance enregistrée (ou touche « Reconnecter maintenant »)'
        : 'sauvegarde renouvelée automatiquement à la prochaine séance enregistrée') + pendingText;
    if (connectBtn) { connectBtn.style.display = ''; connectBtn.textContent = 'Reconnecter maintenant'; }
    if (disconnectBtn) disconnectBtn.style.display = '';
  } else {
    statusEl.textContent = (driveRedirectError ? 'Connexion Google refusée (' + driveRedirectError + ') · ' : '') + 'Non connecté';
    if (connectBtn) { connectBtn.style.display = ''; connectBtn.textContent = 'Connecter Google Drive'; }
    if (disconnectBtn) disconnectBtn.style.display = 'none';
  }
}

// Renouvelle le jeton Google (≈ 1 h de validité) sans que l'utilisateur ait à se reconnecter :
// « prompt: '' » + l'adresse déjà connue (« hint ») évitent l'écran de choix de compte. À appeler
// depuis un geste de l'utilisateur (ex. « Enregistrer la séance »), sinon le navigateur peut bloquer
// la petite fenêtre Google. Répond true si un jeton valide a été obtenu, false sinon (jamais d'alerte).
let driveRenewPending = null;
function renewDriveToken() {
  if (driveRenewPending) return driveRenewPending.promise;
  // Application installée (écran d'accueil) : la petite fenêtre Google ne peut pas rendre la main à
  // l'application. Pas de renouvellement silencieux possible : la séance reste en file d'attente et
  // Réglages propose « Reconnecter maintenant » (connexion par redirection, voir connectDriveByRedirect).
  if (isInstalledApp()) return Promise.resolve(false);
  initDriveTokenClient();
  if (!driveTokenClient) return Promise.resolve(false);
  let resolveFn;
  const promise = new Promise((resolve) => { resolveFn = resolve; });
  const pending = {
    promise,
    finish(ok) {
      clearTimeout(pending.timer);
      if (driveRenewPending === pending) driveRenewPending = null;
      resolveFn(ok);
    }
  };
  pending.timer = setTimeout(() => pending.finish(false), 30000);
  driveRenewPending = pending;
  const account = getDriveAccount();
  const options = { prompt: '' };
  if (account) options.hint = account.email;
  try { driveTokenClient.requestAccessToken(options); } catch (e) { pending.finish(false); }
  return promise;
}

function initDriveTokenClient() {
  if (typeof google === 'undefined' || !google.accounts || !google.accounts.oauth2) return;
  if (driveTokenClient) return;
  driveTokenClient = google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: DRIVE_SCOPE,
    callback: (resp) => {
      if (resp.error) {
        console.warn('Drive auth error', resp);
        if (driveRenewPending) { driveRenewPending.finish(false); updateDriveUI(); return; } // renouvellement silencieux : pas d'alerte
        alert('Connexion Google Drive annulée ou échouée.');
        return;
      }
      setDriveToken(resp);
      localStorage.setItem(DRIVE_WANTED_KEY, '1');
      updateDriveUI();
      if (!getDriveAccount()) fetchDriveAccount();
      probeDriveAccess();
      if (driveRenewPending) { driveRenewPending.finish(true); return; } // l'appelant envoie lui-même la file d'attente
      // accès obtenu : crée le dossier et envoie la sauvegarde complète si besoin
      syncDriveBackup();
    },
    // Fenêtre Google bloquée ou fermée
    error_callback: (err) => {
      console.warn('Drive auth popup', err);
      if (driveRenewPending) { driveRenewPending.finish(false); updateDriveUI(); }
    }
  });
}

// --- Application installée sur l'écran d'accueil : connexion par redirection ---------------------
// Dans une application installée (affichage « plein écran »), la fenêtre de connexion de la
// bibliothèque Google s'ouvre dans un onglet séparé et reste sur une page blanche : elle ne peut pas
// renvoyer le résultat à l'application. On passe donc par une redirection : la page va chez Google
// puis revient avec le jeton dans l'adresse (« #access_token=... »), lu au démarrage.
// L'adresse de retour (driveRedirectUri) doit être déclarée dans Google Cloud (identifiant client OAuth,
// « URI de redirection autorisés »).
let driveRedirectError = '';

function isInstalledApp() {
  try {
    if (window.navigator.standalone === true) return true;
    return ['fullscreen', 'standalone', 'minimal-ui'].some(m => window.matchMedia('(display-mode: ' + m + ')').matches);
  } catch (e) { return false; }
}

function driveRedirectUri() {
  return location.origin + location.pathname.replace(/index\.html$/, '');
}

function connectDriveByRedirect() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const state = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  try { localStorage.setItem(DRIVE_OAUTH_STATE_KEY, state); }
  catch (e) { alert('Stockage indisponible : connexion impossible.'); return; }
  const p = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: driveRedirectUri(),
    response_type: 'token',
    scope: DRIVE_SCOPE,
    include_granted_scopes: 'true',
    state: state
  });
  const account = getDriveAccount();
  if (account) p.set('login_hint', account.email);
  location.assign('https://accounts.google.com/o/oauth2/v2/auth?' + p.toString());
}

// Au démarrage : récupère le jeton renvoyé par Google dans l'adresse. Renvoie 'ok', 'error' ou null
// (rien à faire). L'adresse est nettoyée ; un retour dont le « state » ne correspond pas est ignoré.
function handleDriveRedirectReturn() {
  try {
    const h = location.hash;
    if (!h || h.length < 2) return null;
    const params = new URLSearchParams(h.slice(1));
    if (!params.has('access_token') && !params.has('error')) return null;
    history.replaceState(null, '', location.pathname + location.search);
    const expected = localStorage.getItem(DRIVE_OAUTH_STATE_KEY);
    if (!expected || params.get('state') !== expected) return null;
    localStorage.removeItem(DRIVE_OAUTH_STATE_KEY);
    if (params.get('error') || !params.get('access_token')) {
      driveRedirectError = params.get('error') || 'réponse vide';
      return 'error';
    }
    setDriveToken({ access_token: params.get('access_token'), expires_in: params.get('expires_in') });
    localStorage.setItem(DRIVE_WANTED_KEY, '1');
    clearDriveError();
    driveRedirectError = '';
    return 'ok';
  } catch (e) { return null; }
}

function connectGoogleDrive() {
  if (isInstalledApp()) { connectDriveByRedirect(); return; }
  initDriveTokenClient();
  if (!driveTokenClient) {
    alert('Bibliothèque Google non chargée. Vérifie ta connexion et réessaie.');
    return;
  }
  // prompt only if we have no token
  const t = getDriveToken();
  driveTokenClient.requestAccessToken({ prompt: t ? '' : 'consent' });
}

function disconnectGoogleDrive() {
  const t = getDriveToken();
  if (t && t.access_token && typeof google !== 'undefined' && google.accounts && google.accounts.oauth2) {
    try { google.accounts.oauth2.revoke(t.access_token, () => {}); } catch (e) {}
  }
  clearDriveToken();
  updateDriveUI();
}

// Erreur de dossier Drive : la raison de Google est mémorisée (affichée dans Réglages) et jointe à l'erreur.
async function driveFolderError(message, res) {
  const reason = await driveErrorText(res);
  setDriveError(reason);
  const err = new Error(message + ' (' + reason + ')');
  err.driveReason = reason;
  return err;
}

// Une seule recherche / création de dossier à la fois (évite deux dossiers créés en parallèle).
let driveFolderLock = null;
function ensureDriveFolder(accessToken) {
  if (!driveFolderLock) {
    driveFolderLock = ensureDriveFolderOnce(accessToken).finally(() => { driveFolderLock = null; });
  }
  return driveFolderLock;
}

async function ensureDriveFolderOnce(accessToken) {
  let folderId = localStorage.getItem(DRIVE_FOLDER_ID_KEY);
  if (folderId) return folderId;

  // Search existing folder
  const q = encodeURIComponent(`name='${DRIVE_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
  const search = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`, {
    headers: { Authorization: 'Bearer ' + accessToken }
  });
  if (!search.ok) throw await driveFolderError('Recherche dossier Drive échouée', search);
  const data = await search.json();
  clearDriveError(); // Google a répondu : l'accès au dossier fonctionne
  if (data.files && data.files.length > 0) {
    folderId = data.files[0].id;
    localStorage.setItem(DRIVE_FOLDER_ID_KEY, folderId);
    return folderId;
  }

  // Create folder
  const create = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + accessToken,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: DRIVE_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder'
    })
  });
  if (!create.ok) throw await driveFolderError('Création dossier Drive échouée', create);
  const created = await create.json();
  folderId = created.id;
  localStorage.setItem(DRIVE_FOLDER_ID_KEY, folderId);
  // Le dossier n'existait pas : il vient d'être créé vide, la sauvegarde complète doit y être (re)créée.
  localStorage.removeItem(DRIVE_BACKUP_ID_KEY);
  localStorage.removeItem(DRIVE_LAST_HASH_KEY);
  return folderId;
}

// --- Sauvegarde complète unique ------------------------------------------------------------------
// UN seul fichier, « sauvegarde_complete.json », contient tout l'état de l'application (historique,
// poids corporel, dernières charges) : c'est exactement le format du bouton « Restaurer » de l'Historique.
// Il est créé à la première connexion (avec tout l'historique déjà présent) puis mis à jour, jamais dupliqué,
// dès que les données changent. L'application retient l'empreinte des données envoyées : rien n'est renvoyé
// si rien n'a changé, et les modifications faites sans accès valide partent dès que l'accès revient.

// Cherche le fichier de sauvegarde dans le dossier (le plus récent) ; null s'il n'existe pas.
async function findDriveBackup(accessToken, folderId) {
  const q = encodeURIComponent(`name='${DRIVE_BACKUP_NAME}' and '${folderId}' in parents and trashed=false`);
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,modifiedTime)&orderBy=modifiedTime%20desc&pageSize=1`, {
    headers: { Authorization: 'Bearer ' + accessToken }
  });
  if (!res.ok) throw await driveFolderError('Recherche de la sauvegarde Drive échouée', res);
  const f = ((await res.json()).files || [])[0];
  return f && typeof f.id === 'string' ? f : null;
}

// Télécharge la sauvegarde : { ok, text, data } (data = null si le contenu n'est pas du JSON).
async function downloadDriveBackup(accessToken, fileId) {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`, {
    headers: { Authorization: 'Bearer ' + accessToken }
  });
  if (!res.ok) return { ok: false, status: res.status, text: '', data: null };
  const text = await res.text();
  let data = null;
  try { data = JSON.parse(text); } catch (e) { /* contenu illisible */ }
  return { ok: true, text, data };
}

// Vrai si la sauvegarde du Drive ne contient aucune séance absente de cet appareil (on peut alors l'écraser sans rien perdre).
// Séances supprimées volontairement dans l'historique et pas encore retirées de la sauvegarde Drive.
const DRIVE_DELETED_KEY = 'h49_drive_deleted_ids';
function getDeletedSessionIds() {
  try { const a = JSON.parse(localStorage.getItem(DRIVE_DELETED_KEY) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; }
}
function rememberDeletedSessionId(id) {
  try { const a = getDeletedSessionIds(); if (!a.includes(id)) a.push(id); localStorage.setItem(DRIVE_DELETED_KEY, JSON.stringify(a)); } catch (e) { /* ignoré */ }
}

function driveRemoteIsContainedInLocal(remote) {
  if (!remote || !Array.isArray(remote.history) || !state || !Array.isArray(state.history)) return false;
  const local = new Set(state.history.map(h => h && h.id));
  const deleted = new Set(getDeletedSessionIds()); // supprimées exprès : ce n'est pas un conflit, la sauvegarde doit les purger
  return remote.history.every(h => h && (local.has(h.id) || deleted.has(h.id)));
}

// Écrit la sauvegarde : met à jour le fichier existant (fileId) ou le crée ; renvoie la réponse de Google.
async function writeDriveBackup(accessToken, folderId, payload, fileId) {
  if (fileId) {
    const upd = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(fileId)}?uploadType=media&fields=id,name`, {
      method: 'PATCH',
      headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
      body: payload
    });
    if (upd.ok) { setDriveBackupId(fileId); return upd; }
    if (upd.status !== 404) return upd; // 401, 403... : traités par l'appelant
    setDriveBackupId(null);             // fichier supprimé du Drive : on le recrée ci-dessous
  }
  const metadata = { name: DRIVE_BACKUP_NAME, parents: [folderId], mimeType: 'application/json' };
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', new Blob([payload], { type: 'application/json' }));
  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + accessToken },
    body: form
  });
  if (res.ok) {
    try { const f = await res.clone().json(); if (f && typeof f.id === 'string') setDriveBackupId(f.id); } catch (e) { /* ignoré */ }
  }
  return res;
}

// Vrai si les données ont changé depuis le dernier envoi réussi (ou si aucun envoi n'a encore eu lieu).
function driveNeedsBackup() {
  if (!state) return false;
  return !getDriveBackupId() || driveHash(JSON.stringify(state)) !== localStorage.getItem(DRIVE_LAST_HASH_KEY);
}

let driveSyncing = false;
let driveSyncAgain = false;

// Envoie la sauvegarde complète si elle est à envoyer. Renvoie { ok } ou { reason } :
// 'no-token' (accès expiré), 'token' (refusé par Google), 'conflict', 'error', 'busy'.
async function syncDriveBackup() {
  if (!state || !getDriveToken()) return { reason: 'no-token' };
  if (getDriveConflict()) return { reason: 'conflict' };
  if (!driveNeedsBackup()) return { ok: true, unchanged: true };
  if (driveSyncing) { driveSyncAgain = true; return { reason: 'busy' }; }
  driveSyncing = true;
  updateDriveUI();
  try {
    const token = getDriveToken();
    const folderId = await ensureDriveFolder(token.access_token);
    const snapshot = JSON.stringify(state);
    const payload = JSON.stringify(state, null, 2);
    let fileId = getDriveBackupId();
    if (!fileId) {
      const found = await findDriveBackup(token.access_token, folderId);
      if (found) {
        // Une sauvegarde existe déjà sur le Drive sans que cet appareil l'ait écrite (réinstallation, autre
        // appareil...) : on ne l'écrase que si elle ne contient aucune séance de plus que cet appareil.
        const remote = await downloadDriveBackup(token.access_token, found.id);
        if (!remote.ok) {
          if (remote.status === 401) { expireDriveToken(); return { reason: 'token' }; }
          setDriveError(String(remote.status));
          return { reason: 'error' };
        }
        if (!driveRemoteIsContainedInLocal(remote.data)) {
          const n = remote.data && Array.isArray(remote.data.history) ? remote.data.history.length : null;
          setDriveConflict({ id: found.id, modified: found.modifiedTime || '', sessions: n });
          return { reason: 'conflict' };
        }
        fileId = found.id;
      }
    }
    const res = await writeDriveBackup(token.access_token, folderId, payload, fileId);
    if (res.status === 401) { expireDriveToken(); return { reason: 'token' }; }
    if (!res.ok) { setDriveError(await driveErrorText(res)); return { reason: 'error' }; }
    clearDriveError();
    localStorage.setItem(DRIVE_LAST_HASH_KEY, driveHash(snapshot));
    localStorage.setItem(DRIVE_LAST_BACKUP_KEY, new Date().toISOString());
    try { localStorage.removeItem(DRIVE_DELETED_KEY); } catch (e) { /* ignoré */ }
    return { ok: true };
  } catch (e) {
    console.warn('Drive : envoi de la sauvegarde interrompu', e);
    return { reason: 'error', error: e };
  } finally {
    driveSyncing = false;
    updateDriveUI();
    if (driveSyncAgain) { driveSyncAgain = false; setTimeout(syncDriveBackup, 0); }
  }
}

// Envoi différé après toute modification des données (saveState) : sans effet si l'accès a expiré.
let driveSyncTimer = null;
function scheduleDriveSync() {
  if (!getDriveToken()) return;
  clearTimeout(driveSyncTimer);
  driveSyncTimer = setTimeout(syncDriveBackup, 1500);
}

// Conflit : la sauvegarde du Drive contient des séances absentes de cet appareil. L'utilisateur choisit de
// la remplacer par les données de cet appareil (ce bouton) ou de la restaurer (restoreFromDrive).
function replaceDriveBackupWithThisDevice() {
  const c = getDriveConflict();
  if (!c) return;
  const when = formatDriveDate(c.modified) || 'date inconnue';
  if (!confirm('Remplacer la sauvegarde Drive (' + (c.sessions != null ? c.sessions + ' séances, ' : '') + 'modifiée le ' + when
    + ') par les données de cet appareil ?\n\nLes séances qu\'elle contient et que cet appareil n\'a pas seront perdues.')) return;
  setDriveBackupId(c.id);
  setDriveConflict(null);
  localStorage.removeItem(DRIVE_LAST_HASH_KEY);
  syncDriveBackup();
}

// Restaure les données depuis la sauvegarde complète du Drive, par le même chemin que le bouton « Restaurer »
// de l'Historique (importData, avec l'assainissement de security.js).
async function restoreFromDrive() {
  const token = getDriveToken();
  if (!token) {
    alert(isInstalledApp() ? 'Accès Google expiré : touche d\'abord « Reconnecter maintenant ».' : 'Connecte-toi d\'abord à Google Drive.');
    return;
  }
  try {
    const folderId = await ensureDriveFolder(token.access_token);
    const file = await findDriveBackup(token.access_token, folderId);
    if (!file) { alert('Aucune sauvegarde complète trouvée dans le dossier « ' + DRIVE_FOLDER_NAME + ' » de ton Drive.'); return; }
    const dl = await downloadDriveBackup(token.access_token, file.id);
    if (!dl.ok || !dl.data || !Array.isArray(dl.data.history) || !dl.data.nextType) {
      alert('La sauvegarde Drive est illisible ou invalide : rien n\'a été modifié.');
      return;
    }
    const when = formatDriveDate(file.modifiedTime) || 'date inconnue';
    const n = dl.data.history.length;
    const local = state && Array.isArray(state.history) ? state.history.length : 0;
    if (!confirm('Restaurer la sauvegarde Drive du ' + when + ' (' + n + ' séance' + (n > 1 ? 's' : '') + ') ?\n\n'
      + 'Cela remplace les données de cet appareil (' + local + ' séance' + (local > 1 ? 's' : '') + ').')) return;
    setDriveBackupId(file.id);
    setDriveConflict(null);
    const f = new File([dl.text], DRIVE_BACKUP_NAME, { type: 'application/json' });
    await window.importData({ target: { files: [f], value: '' } });
    updateDriveUI();
  } catch (e) {
    alert('Restauration impossible : ' + (e && e.message ? e.message : 'erreur réseau') + '.');
  }
}

// Ligne ajoutée au message « Séance enregistrée » quand l'accès Google a expiré dans l'application
// installée : la reconnexion se lance toute seule juste après (voir backupToDrive).
function driveSaveNotice() {
  if (isDriveWanted() && !getDriveToken() && isInstalledApp()) {
    return '\n• Google Drive : accès expiré, reconnexion automatique…';
  }
  return '';
}

// Dernière reconnexion automatique (redirection) : au plus une toutes les 2 minutes, pour ne jamais
// enchaîner les allers-retours chez Google si quelque chose échoue.
const DRIVE_AUTO_RECONNECT_KEY = 'h49_drive_auto_reconnect';
function autoReconnectDriveIfNeeded() {
  if (!isInstalledApp() || !isDriveWanted() || getDriveToken()) return;
  try {
    const last = Number(localStorage.getItem(DRIVE_AUTO_RECONNECT_KEY) || 0);
    if (Date.now() - last < 120000) return;
    localStorage.setItem(DRIVE_AUTO_RECONNECT_KEY, String(Date.now()));
  } catch (e) { return; }
  // petit délai : la page a fini d'afficher la confirmation de la séance avant de partir chez Google
  setTimeout(connectDriveByRedirect, 400);
}

// Appelée par « Enregistrer la séance » / « Enregistrer les modifications » (geste de l'utilisateur) :
// envoie tout de suite la sauvegarde complète. Accès expiré : dans le navigateur il est renouvelé en
// silence par la fenêtre Google ; dans l'application installée (pas de renouvellement silencieux possible)
// l'application se reconnecte toute seule par redirection et la sauvegarde part au retour.
async function backupToDrive() {
  try {
    if (!isDriveWanted() && !getDriveToken()) return; // Drive n'a jamais été connecté : rien à faire
    let token = getDriveToken();
    if (!token && await renewDriveToken()) token = getDriveToken();
    if (!token) { updateDriveUI(); autoReconnectDriveIfNeeded(); return; }
    const r = await syncDriveBackup();
    if (r && r.reason === 'token') autoReconnectDriveIfNeeded();
    updateDriveUI();
  } catch (e) { /* ne jamais gêner l'enregistrement */ }
}


// ============================================================
// 15. SAUVEGARDE, IMPORT ET RÉINITIALISATION
// ============================================================
async function exportData() {
  const dataStr = JSON.stringify(state, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const file = new File([blob], `${new Date().toISOString().slice(0, 10)}.json`, { type: 'application/json' });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        title: 'Sauvegarde Suivi Fitness',
        text: 'Sauvegarde du ' + new Date().toLocaleDateString('fr-FR') + '.',
        files: [file],
      });
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.log("Partage annulé ou non disponible", error);
      }
    }
  } else {
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", URL.createObjectURL(blob));
    downloadAnchor.setAttribute("download", `${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const importedState = JSON.parse(e.target.result);
      if (importedState.history && importedState.nextType) {
        state = importedState;
        clearEditState();
        clearDraft();
        discardWeightInput();
        saveState();
        populateExerciseSelect();
        initWorkoutForm();
        renderHistory();
        renderCharts();
        alert("Sauvegarde importée avec succès !");
      } else {
        alert("Fichier de sauvegarde invalide (structure incorrecte).");
      }
    } catch (err) {
      alert("Erreur lors de la lecture du fichier JSON.");
    } finally {
      event.target.value = '';
    }
  };
  reader.readAsText(file);
}

function resetData() {
  const confirm1 = confirm("⚠️ ATTENTION : Êtes-vous SÛR de vouloir effacer vos saisies récentes ?");
  if (confirm1) {
    fetch('data.json').then(res => res.json()).then(defaultData => {
      state = defaultData;
      clearEditState();
      clearDraft();
      discardWeightInput();
      saveState();
      populateExerciseSelect();
      initWorkoutForm();
      renderHistory();
      renderCharts();
      alert("Données réinitialisées avec succès.");
    }).catch(() => {
      alert("Erreur lors de la réinitialisation.");
    });
  }
}

// ============================================================
// 16. MISES À JOUR DE L'APPLICATION
// ============================================================
// Le service worker (sw.js) installe et active tout seul une nouvelle version, mais la page déjà
// ouverte continue d'exécuter l'ancien code jusqu'au prochain lancement : on ne la recharge JAMAIS
// automatiquement (la saisie en cours serait perdue). À la place, sw.js prévient la page
// (message SW_ACTIVATED) ; si sa version diffère de celle exécutée, la page Réglages affiche
// « nouvelle version prête » (+ un point sur son icône) et un bouton pour relancer quand on veut.
function isUpdateReady() {
  return !!(runningVersion && activeVersion && activeVersion !== runningVersion);
}

function renderUpdateStatus() {
  const ready = isUpdateReady();
  const versionEl = document.getElementById('update-version');
  if (versionEl) versionEl.textContent = runningVersion ? `Version ${runningVersion}` : 'Version …';
  const banner = document.getElementById('update-banner');
  if (banner) banner.hidden = !ready;
  const bannerText = document.getElementById('update-banner-text');
  if (bannerText && ready) bannerText.textContent = `La version ${activeVersion} est prête. Relancez l'application pour l'utiliser.`;
  const statusEl = document.getElementById('update-status');
  if (statusEl && ready) statusEl.textContent = 'Mise à jour téléchargée.';
  const nav = document.getElementById('nav-historique');
  if (nav) {
    nav.classList.toggle('has-update', ready);
    nav.setAttribute('aria-label', ready ? 'Historique, mise à jour disponible' : 'Historique');
  }
  // La pastille suit aussi le bouton Réglages (là où se trouve l'avis)
  const gear = document.getElementById('settings-btn');
  if (gear) {
    gear.classList.toggle('has-update', ready);
    gear.setAttribute('aria-label', ready ? 'Réglages, mise à jour disponible' : 'Réglages');
  }
}

function setUpdateStatusText(text) {
  const statusEl = document.getElementById('update-status');
  if (statusEl && !isUpdateReady()) statusEl.textContent = text;
}

function onServiceWorkerMessage(event) {
  const d = event.data;
  if (!d || d.type !== 'SW_ACTIVATED' || typeof d.version !== 'string') return;
  activeVersion = d.version;
  renderUpdateStatus();
}

// Bouton « Vérifier » : cherche une nouvelle version maintenant
async function checkForUpdate() {
  if (!('serviceWorker' in navigator)) {
    setUpdateStatusText('Mises à jour automatiques indisponibles sur ce navigateur.');
    return;
  }
  setUpdateStatusText('Vérification…');
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) { setUpdateStatusText('Mode hors-ligne pas encore installé : relancez l\'application.'); return; }
    lastUpdateCheck = Date.now();
    await reg.update();
    if (reg.installing || reg.waiting) {
      setUpdateStatusText('Téléchargement de la mise à jour…'); // SW_ACTIVATED suivra
    } else {
      const t = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      setUpdateStatusText(`À jour · vérifié à ${t}`);
    }
  } catch (e) {
    const errorMsg = e.message ? e.message : (e.name ? e.name : 'erreur inconnue');
    console.error('checkForUpdate error:', e);
    setUpdateStatusText('Vérification impossible : ' + errorMsg);
  }
}

// Bouton « Relancer maintenant » : la saisie en cours est d'abord enregistrée dans le brouillon
function applyUpdate() {
  try { saveDraft(); saveWeightDraft(); } catch (e) {}
  location.reload();
}

// Vérification silencieuse quand l'application revient au premier plan (au plus toutes les 30 min)
function initUpdateIndicator() {
  renderUpdateStatus();
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.addEventListener('message', onServiceWorkerMessage);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden || Date.now() - lastUpdateCheck < UPDATE_CHECK_MIN_INTERVAL_MS) return;
    lastUpdateCheck = Date.now();
    navigator.serviceWorker.getRegistration().then(reg => reg && reg.update()).catch(() => {});
  });
}

// ============================================================
// 17. DÉMARRAGE
// ============================================================
async function initApp() {
  initTheme();
  initUpdateIndicator();
  // Google Drive : retour d'une connexion par redirection (application installée), puis statut + sauvegarde à envoyer
  cleanupLegacyDriveKeys();
  const driveReturn = handleDriveRedirectReturn();
  setTimeout(() => {
    initDriveTokenClient(); updateDriveUI();
    syncDriveBackup();
    if (isDriveConnected() && !getDriveAccount()) fetchDriveAccount();
    if (driveReturn) switchTab('reglages'); // on revient sur Réglages pour voir le résultat de la connexion
  }, 800);
  // Retour dans l'application (ex. après une connexion faite dans un onglet voisin) : on relit l'état de Drive
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return;
    updateDriveUI();
    if (isDriveConnected()) syncDriveBackup();
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

  recalculateHistoryTonnages();
  updateNextTypeFromHistory();
  saveState();

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
}

document.addEventListener('DOMContentLoaded', initApp);
