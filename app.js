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
//
// Fichiers associés (1.7.0) : js/catalogue.js (catalogue des exercices, chargé avant ce fichier) et
// js/programmes.js (onglet Programme : programmes sur mesure et séances libres, chargé après).

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
  "Mollets / Finition": "Mollets"
};
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
  A: { title: "Presse / Développé", exercises: [["Rameur", 1], ["Presse à cuisses", 4], ["Développé couché", 4], ["Tirage horizontal", 4], ["Développé militaire", 3], ["Curl biceps", 3], ["Mollets", 3]] },
  B: { title: "Soulevé / Développé", exercises: [["Rameur", 1], ["Soulevé de terre", 4], ["Développé incliné", 4], ["Tirage vertical", 4], ["Tractions", 3], ["Élévations latérales", 3], ["Extension triceps", 3], ["Leg extension", 3]] },
  C: { title: "Fentes / Dips", exercises: [["Rameur", 1], ["Fentes marchées", 4], ["Dips", 4], ["Rowing unilatéral", 3], ["Oiseau", 3], ["Mollets", 3], ["Leg curl", 3]] }
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

// Fond d'écran (1.7.7) : préférence de l'appareil (h49_wallpaper), hors des données exportées, comme le thème.
// Aucun par défaut. Le script de index.html pose data-wallpaper avant le premier affichage.
const WALLPAPER_KEY = 'h49_wallpaper';
const WALLPAPERS = [
  { id: 'course', name: 'Course', pos: 'center 30%' },
  { id: 'barre', name: 'Barre', pos: 'center 55%' },
  { id: 'halteres', name: 'Haltères', pos: 'center 45%' },
  { id: 'kettlebell', name: 'Kettlebell', pos: 'center 45%' },
  { id: 'studio', name: 'Studio', pos: 'center 40%' },
  { id: 'ratelier', name: 'Râtelier', pos: 'center 60%' },
  { id: 'squat', name: 'Squat', pos: 'center 40%' },
  { id: 'poigne', name: 'Poigne', pos: 'center 40%' },
  { id: 'disques', name: 'Disques', pos: 'center 50%' },
  { id: 'none', name: 'Aucun' }
];

function getWallpaper() {
  let v = null;
  try { v = localStorage.getItem(WALLPAPER_KEY); } catch (e) {}
  return WALLPAPERS.some(w => w.id === v && w.id !== 'none') ? v : 'none';
}

function wallpaperThumb(id) { return 'wallpapers/' + id + '-mini.jpg'; }

function applyWallpaper() {
  const id = getWallpaper();
  if (id === 'none') document.documentElement.removeAttribute('data-wallpaper');
  else document.documentElement.setAttribute('data-wallpaper', id);
  const cur = WALLPAPERS.find(w => w.id === id);
  const name = document.getElementById('wallpaper-row-name');
  if (name) name.textContent = cur.name;
  const row = document.getElementById('wallpaper-row');
  if (row) row.setAttribute('aria-label', 'Fond d\'écran : ' + cur.name + '. Changer');
  const img = document.getElementById('wallpaper-row-img');
  if (img) {
    if (id === 'none') { img.hidden = true; img.removeAttribute('src'); }
    else { img.src = wallpaperThumb(id); img.style.objectPosition = cur.pos; img.hidden = false; }
  }
  document.querySelectorAll('#wallpaper-grid .wallpaper-opt').forEach(btn => {
    btn.setAttribute('aria-checked', btn.dataset.wallpaper === id ? 'true' : 'false');
  });
}

function setWallpaper(id) {
  if (!WALLPAPERS.some(w => w.id === id)) return;
  try {
    if (id === 'none') localStorage.removeItem(WALLPAPER_KEY);
    else localStorage.setItem(WALLPAPER_KEY, id);
  } catch (e) {}
  applyWallpaper();
}

function renderWallpaperGrid() {
  const grid = document.getElementById('wallpaper-grid');
  if (!grid) return;
  const cur = getWallpaper();
  grid.innerHTML = WALLPAPERS.map(w => `
    <li><button type="button" class="wallpaper-opt" role="radio" data-wallpaper="${w.id}" aria-checked="${w.id === cur}" onclick="setWallpaper('${w.id}')">
      <span class="wallpaper-thumb">${w.id === 'none' ? '' : `<img src="${wallpaperThumb(w.id)}" alt="" loading="lazy" style="object-position:${w.pos}">`}<span class="wallpaper-check">${CHECK_SVG}</span></span>
      <span class="wallpaper-name">${w.name}</span>
    </button></li>`).join('');
  // Bande sur une ligne (1.7.18) : on la fait défiler jusqu'au fond choisi
  const sel = grid.querySelector('.wallpaper-opt[aria-checked="true"]');
  if (sel) { const li = sel.parentElement; grid.scrollLeft = Math.max(0, li.offsetLeft - grid.offsetLeft - parseFloat(getComputedStyle(grid).paddingLeft || 0)); }
}

// Inviter quelqu'un (1.7.21) : QR code vers l'adresse de l'application (celle de cette page : dev ou production).
// La personne installe l'app sur son téléphone et la connecte à son propre Google Drive.
function appShareUrl() {
  return new URL('./', location.href).href;
}

function inviteQrSvg(url) {
  if (typeof qrcode !== 'function') return '';
  const qr = qrcode(0, 'M');
  qr.addData(url);
  qr.make();
  return qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true, alt: 'QR code vers ' + url });
}

function openInviteSheet() {
  // 1.7.37 : QR code et adresse seulement. Le bouton « Partager le lien » est retiré : sous Firefox pour Android,
  // un partage abandonné restait en attente et bloquait ensuite les menus de choix et le choix de fichier.
  const url = appShareUrl();
  openSheet(`
    <h3 class="sheet-title small">Inviter quelqu'un</h3>
    <p class="sheet-text center">Scanne ce QR code avec l'appareil photo de son téléphone pour ouvrir l'application.</p>
    <div class="invite-qr">${inviteQrSvg(url)}</div>
    <p class="invite-link">${escapeHtml(url)}</p>
    <button type="button" class="btn btn-secondary" onclick="closeSheet()">Fermer</button>`);
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

// --- Exercices du catalogue ---
function canonicalExerciseName(name) {
  return EXERCISE_ALIASES[name] || name;
}

// Fiche d'un exercice (par identifiant ou par nom) ; un nom hors catalogue reçoit des réglages neutres
function exInfo(ref) {
  if (typeof ref === 'number' && CATALOGUE_BY_ID[ref]) return CATALOGUE_BY_ID[ref];
  const name = canonicalExerciseName(String(ref == null ? '' : ref));
  return CATALOGUE_BY_NAME[name] || { id: null, name, group: '', mode: 'weight', sets: 3, reps: '8–12', rest: REST_DURATION };
}

function exMode(name) { return exInfo(name).mode; }
function isCardioName(name) { return !!exInfo(name).cardio; }
function isCardioDistName(name) { const e = exInfo(name); return !!e.cardio && e.mode === 'dist'; }

// Valeur proposée la première fois, dans la fourchette du catalogue (« 6–10 » -> 8, « 8–12 » -> 10…) ;
// pour un exercice en durée (gainage « 20–45 s »), une durée en secondes.
const DEFAULT_REPS = { '6–10': 8, '8–12': 10, '10–15': 12, '12–15': 12, '8–15': 10, '15–20': 15, '20–30': 20, '20–45 s': 30 };
function defaultRepsFor(name) {
  const r = exInfo(name).reps || '';
  if (DEFAULT_REPS[r] !== undefined) return DEFAULT_REPS[r];
  const m = /^(\d+)/.exec(r);
  return m ? +m[1] : '';
}

// Icône d'un exercice : PNG de l'application, sinon pictogramme générique (pouls pour le cardio, haltère sinon)
const GENERIC_CARDIO_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12h4l2.5-6 4 12 2.5-6H21"/></svg>';
const GENERIC_STRENGTH_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11"/></svg>';
function getIcon(exName, decorative = false) {
  const e = exInfo(exName);
  if (e.icon) return `<img src="${e.icon}" alt="${decorative ? '' : escapeHtml(e.name)}">`;
  const cardio = e.group === 'Cardio';
  return `<span class="ex-generic${cardio ? ' cardio' : ''}"${decorative ? ' aria-hidden="true"' : ` role="img" aria-label="${escapeHtml(e.name)}"`}>${cardio ? GENERIC_CARDIO_SVG : GENERIC_STRENGTH_SVG}</span>`;
}

function escapeHtml(str) {
  return String(str == null ? '' : str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// --- Programmes et séances libres ---
// state.programs : [{ id, name, kind: 'program' | 'libre', status: 'active' | 'paused' | 'new', createdAt, activatedAt,
//   pausedAt, savedAt, nextKey, sessions: [{ key: 'A'..'F' ('' pour une séance libre), name, exercises: [{ exId, sets }] }] }]
// Un seul élément est actif à la fois. Chaque séance de l'historique garde une copie du nom de son programme.
function getPrograms() { return (state && Array.isArray(state.programs)) ? state.programs : []; }
function getProgram(id) { return getPrograms().find(p => p.id === id) || null; }
function getActiveProgram() { return getPrograms().find(p => p.status === 'active') || null; }
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
function nextKeyFromHistory(p) {
  if (!p || isLibre(p) || !p.sessions.length) return p && p.sessions[0] ? p.sessions[0].key : '';
  const keys = p.sessions.map(s => s.key);
  const hist = (state.history || []).filter(h => h.programId === p.id && keys.includes(h.sessionKey));
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
function syncNextType() {
  const p = getActiveProgram();
  state.nextType = p && !isLibre(p) && p.nextKey ? p.nextKey : 'A';
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
function normalizePrograms() {
  if (!state) return;
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
  const pace = row.nextElementSibling;
  const rEl = row.querySelector('.reps-input');
  if (pace && pace.classList.contains('cardio-pace')) pace.querySelector('b').textContent = cardioRowText(dEl.dataset.ex, dEl.value, rEl ? rEl.value : '');
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
  const btn = document.getElementById('timer-btn');
  if (btn) btn.removeAttribute('aria-label'); // le décompte affiché suffit
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
// (repos du catalogue : 3:00 polyarticulaire lourd, 2:00 polyarticulaire, 1:30 isolation, 1:00 abdos / gainage)
function restDurationFor(exName) {
  return exInfo(exName).rest || REST_DURATION;
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

// Texte du chrono au repos (1.7.18) : « PAUSE / ADAPTATIVE » sur 2 lignes, sans la durée tant que le
// décompte n'est pas lancé ; la durée qui sera lancée (celle de l'exercice ouvert) reste dans l'aria-label.
function restIdleLabel() {
  return 'PAUSE\nADAPTATIVE';
}

function setRestIdleUi(btn, display) {
  if (display) display.innerText = restIdleLabel();
  if (btn) btn.setAttribute('aria-label', `Lancer la pause adaptative (${formatRestDuration(currentRestDuration())})`);
}

// Met à jour le texte du chrono quand l'exercice ouvert change, seulement s'il est au repos
// (jamais pendant un décompte ni sur « GO ! »)
function refreshRestTimerIdle() {
  const btn = document.getElementById('timer-btn');
  const display = document.getElementById('timer-display');
  if (!btn || !display || restTimerInterval) return;
  if (btn.classList.contains('running') || btn.classList.contains('finished')) return;
  setRestIdleUi(btn, display);
}

// Retour à l'état initial du timer de repos (affichage « PAUSE / ADAPTATIVE »)
function resetRestTimerUi() {
  const btn = document.getElementById('timer-btn');
  const display = document.getElementById('timer-display');
  if (btn) {
    btn.className = 'timer-btn';
    btn.style.setProperty('--progress', '0%');
  }
  setRestIdleUi(btn, display);
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
  if (draftRestoring || editingOriginalId !== null || !state || !workoutDef) return;
  const items = Array.from(document.querySelectorAll('#exercises-list .exercise-item'));
  if (!items.length) return;

  let dirty = false;
  const exercises = items.map(item => {
    const rows = Array.from(item.querySelectorAll('.set-row'));
    const defEx = workoutDef.exercises.find(e => e.name === item.dataset.ex);
    if (defEx && rows.length !== defEx.seriesCount) dirty = true;
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
    type: workoutDef.draftKey,
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
  const clean = v => String(v == null ? '' : v).replace(/[^0-9.,\-+]/g, '');
  const cleanDuration = v => String(v == null ? '' : v).replace(/[^0-9:.,]/g, '');
  draftRestoring = true;
  try {
    document.querySelectorAll('#exercises-list .exercise-item').forEach(item => {
      const saved = d.exercises.find(e => e.name === item.dataset.ex);
      if (!saved || !Array.isArray(saved.sets) || !saved.sets.length) return;
      const grid = item.querySelector('.sets-grid');
      const mode = exMode(item.dataset.ex);
      const durFirst = mode === 'dist' || mode === 'floors' || mode === 'time';
      grid.innerHTML = saved.sets.map((s, i) => setRowHtml(item.dataset.ex, i + 1, durFirst ? cleanDuration(s.w) : clean(s.w), clean(s.r))).join('');
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

// --- Poids corporel (champ de l'onglet Progression) : brouillon séparé de celui de la séance ---
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
// Mode de saisie (catalogue) -> contenu des deux champs d'une ligne de série :
//   weight : kg · réps          bw : lest (kg, vide = PDC) · réps        reps : réps seules
//   time : durée (min:ss)        dist : durée · distance (m ou km)        floors : durée · étages
function sameExercise(a, b) { return canonicalExerciseName(a) === canonicalExerciseName(b); }

function getSuggestedSetValues(exName, setIndex, fallbackWeight, fallbackReps) {
  const mode = exMode(exName);
  let foundSet = null;

  // On parcourt l'historique du plus récent au plus ancien, en ignorant les séances de déload
  // (on va chercher la dernière vraie charge normale)
  for (let i = state.history.length - 1; i >= 0; i--) {
    const h = state.history[i];
    if (h.isDeload || !h.exercises) continue;
    const foundEx = h.exercises.find(e => sameExercise(e.name, exName));
    // On ne reprend qu'une série réellement faite : les séries non faites sont ignorées
    // et on remonte à la dernière séance où cette série a vraiment été réalisée.
    if (foundEx && foundEx.sets && isPerformedSet(foundEx.sets[setIndex])) {
      foundSet = { ...foundEx.sets[setIndex] };
      break;
    }
  }

  if (mode === 'bw') {
    let lest = 0;
    if (foundSet) {
      if (foundSet.lest !== undefined) lest = parseFloat(foundSet.lest) || 0;
      else {
        // Ancienne séance (charge totale saisie) : lest = charge − poids corporel, jamais négatif
        const bwKg = latestBodyWeight();
        lest = bwKg ? Math.max(0, Math.round(((parseFloat(foundSet.weight) || 0) - bwKg) / 2.5) * 2.5) : 0;
      }
    }
    if (isDeloadActive() && lest > 0) lest = Math.round((lest * 0.8) / 2.5) * 2.5;
    return { weight: lest, reps: foundSet ? foundSet.reps : fallbackReps };
  }
  if (mode === 'time') return { weight: foundSet && foundSet.seconds ? foundSet.seconds : fallbackReps, reps: '' };
  if (mode === 'reps') return { weight: '', reps: foundSet ? foundSet.reps : fallbackReps };

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

// Valeurs proposées pour un cardio : la dernière séance où il a été fait, sinon les valeurs par défaut
// (rameur : 4:30 et 1 000 m ; autres appareils : champs vides la première fois)
function getSuggestedCardioValues(exName, defSeconds, defMeters) {
  for (let i = state.history.length - 1; i >= 0; i--) {
    const ex = (state.history[i].exercises || []).find(e => sameExercise(e.name, exName));
    const set = ex && Array.isArray(ex.sets) ? ex.sets.find(isPerformedCardioSet) : null;
    if (set) return { seconds: set.seconds, meters: set.meters, floors: set.floors };
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
  return workoutDef ? workoutDef.exercises.find(e => e.name === name) || null : null;
}

function renumberSets(grid) {
  grid.querySelectorAll('.set-row').forEach((row, i) => {
    const label = row.querySelector('.set-label');
    if (label) label.innerText = String(i + 1);
  });
}

// En-têtes de colonnes selon le mode de saisie
function setsHeadHtml(exName) {
  const e = exInfo(exName);
  let cols;
  switch (e.mode) {
    case 'bw': cols = ['Lest (kg)', 'Réps']; break;
    case 'reps': cols = ['Réps']; break;
    case 'time': cols = ['Durée']; break;
    case 'dist': cols = ['Durée', distanceInKm(exName) ? 'Distance (km)' : 'Distance (m)']; break;
    case 'floors': cols = ['Durée', 'Étages']; break;
    default: cols = ['Kg', 'Réps'];
  }
  return `<div class="sets-head${cols.length === 1 ? ' single' : ''}" aria-hidden="true"><span>Série</span>${cols.map(c => `<span>${c}</span>`).join('')}<span></span></div>`;
}

// Gabarit d'une ligne de série (utilisé à la création du formulaire et par le bouton +)
function setRowHtml(exName, number, weightVal, repsVal, done = false) {
  const e = exInfo(exName);
  const ex = escapeHtml(exName);
  const check = (label) => `<button type="button" class="btn-check-set" aria-pressed="${done ? 'true' : 'false'}" aria-label="${label}" onclick="toggleSetDone(this)">${CHECK_SVG}</button>`;
  const dur = v => (typeof v === 'number' ? formatDurationMS(v) : (v == null ? '' : v));
  if (e.mode === 'dist' || e.mode === 'floors') {
    // Cardio : « weight-input » = durée (min:ss), « reps-input » = distance ou étages. Nombre = secondes, texte = saisie telle quelle.
    const d = dur(weightVal);
    const km = distanceInKm(exName);
    const amountLabel = e.mode === 'floors' ? 'Étages montés' : (km ? 'Distance en kilomètres' : 'Distance en mètres');
    const u = cardioUnit(exName);
    return `
    <div class="set-row${done ? ' done' : ''}">
      <span class="set-label">${number}</span>
      <input type="text" inputmode="numeric" class="set-input weight-input" data-ex="${ex}" aria-label="Durée en minutes et secondes" placeholder="min:ss" value="${escapeHtml(d)}" oninput="onCardioInput(this); markInputActive(this)">
      <input type="text" inputmode="${km ? 'decimal' : 'numeric'}" class="set-input reps-input" data-ex="${ex}" aria-label="${amountLabel}" placeholder="${e.mode === 'floors' ? 'étages' : (km ? 'km' : 'm')}" value="${escapeHtml(repsVal)}" oninput="onCardioInput(this); markInputActive(this)">
      ${check(`Valider : ${ex}`)}
    </div>
    ${u ? `<div class="cardio-pace"><span>${u.label}</span><b>${cardioRowText(exName, d, repsVal)}</b></div>` : ''}
  `;
  }
  if (e.mode === 'time') {
    return `
    <div class="set-row single${done ? ' done' : ''}">
      <span class="set-label">${number}</span>
      <input type="text" inputmode="numeric" class="set-input weight-input" data-ex="${ex}" aria-label="Série ${number}, durée en minutes et secondes" placeholder="min:ss" value="${escapeHtml(dur(weightVal))}" oninput="onDurationInput(this); markInputActive(this)">
      <input type="hidden" class="reps-input" data-ex="${ex}" value="">
      ${check(`Valider la série ${number}`)}
    </div>
  `;
  }
  if (e.mode === 'reps') {
    return `
    <div class="set-row single${done ? ' done' : ''}">
      <span class="set-label">${number}</span>
      <input type="hidden" class="weight-input" data-ex="${ex}" value="">
      <input type="number" inputmode="numeric" class="set-input reps-input" data-ex="${ex}" aria-label="Série ${number}, répétitions" placeholder="reps" value="${escapeHtml(repsVal)}" oninput="markInputActive(this)">
      ${check(`Valider la série ${number}`)}
    </div>
  `;
  }
  if (e.mode === 'bw') {
    const l = parseFloat(String(weightVal).replace(',', '.').replace('−', '-'));
    const lestVal = !l ? '' : (l > 0 ? '+' + l : String(l));
    return `
    <div class="set-row${done ? ' done' : ''}">
      <span class="set-label">${number}</span>
      <input type="text" class="set-input weight-input lest-input" data-ex="${ex}" aria-label="Série ${number}, lest en kg (vide = poids du corps, négatif = assistance)" placeholder="PDC" value="${escapeHtml(lestVal)}" oninput="markInputActive(this)">
      <input type="number" inputmode="numeric" class="set-input reps-input" data-ex="${ex}" aria-label="Série ${number}, répétitions" placeholder="reps" value="${escapeHtml(repsVal)}" oninput="markInputActive(this)">
      ${check(`Valider la série ${number}`)}
    </div>
  `;
  }
  return `
    <div class="set-row${done ? ' done' : ''}">
      <span class="set-label">${number}</span>
      <input type="number" step="0.5" inputmode="decimal" class="set-input weight-input" data-ex="${ex}" aria-label="Série ${number}, poids en kg" placeholder="kg" value="${escapeHtml(weightVal)}" oninput="markInputActive(this)">
      <input type="number" inputmode="numeric" class="set-input reps-input" data-ex="${ex}" aria-label="Série ${number}, répétitions" placeholder="reps" value="${escapeHtml(repsVal)}" oninput="markInputActive(this)">
      ${check(`Valider la série ${number}`)}
    </div>
  `;
}

// Lest saisi : « +10 », « 10 », « -20 », « −20 », vide = 0 (poids du corps)
function parseLest(str) {
  const t = String(str == null ? '' : str).trim().replace(',', '.').replace('−', '-');
  if (t === '' || t === '+' || t === '-') return 0;
  return /^[+-]?\d+(\.\d+)?$/.test(t) ? parseFloat(t) : NaN;
}

function addSet(btn) {
  const grid = btn.closest('.exercise-item').querySelector('.sets-grid');
  const rows = grid.querySelectorAll('.set-row');
  const last = rows[rows.length - 1];
  const exName = btn.closest('.exercise-item').dataset.ex;

  // La nouvelle série reprend les valeurs de la dernière ;
  // à défaut (aucune série), on utilise la suggestion du programme.
  let weightVal, repsVal;
  if (last) {
    weightVal = last.querySelector('.weight-input').value;
    repsVal = last.querySelector('.reps-input').value;
  } else {
    const suggested = getSuggestedSetValues(exName, 0, '', defaultRepsFor(exName));
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
  const totalRows = document.querySelectorAll('#exercises-list .set-row').length;
  const doneRows = document.querySelectorAll('#exercises-list .set-row.done').length;
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
  const name = item.dataset.ex;
  const mode = exMode(name);
  if (mode === 'dist' || mode === 'floors') {
    const r0 = rows[0];
    const d = r0 ? r0.querySelector('.weight-input').value : '', m = r0 ? r0.querySelector('.reps-input').value : '';
    const unit = mode === 'floors' ? 'étages' : (distanceInKm(name) ? 'km' : 'm');
    return d && m ? `${m} ${unit} en ${d}${done0(rows)}` : `${n} ${plural}`;
  }
  const done = rows.filter(r => r.classList.contains('done')).length;
  const doneText = done > 0 ? ` · ${done}/${n} faites` : '';
  if (mode === 'weight') {
    const weights = rows.map(r => r.querySelector('.weight-input').value).filter(v => v !== '');
    let range = '';
    if (weights.length) {
      const first = weights[0], last = weights[weights.length - 1];
      range = first === last ? ` · ${first} kg` : ` · ${first} → ${last} kg`;
    }
    return `${n} ${plural}${range}${doneText}`;
  }
  if (mode === 'bw') {
    const l = parseLest(rows[0] ? rows[0].querySelector('.weight-input').value : '');
    return `${n} ${plural} · ${lestText(Number.isNaN(l) ? 0 : l)}${doneText}`;
  }
  return `${n} ${plural}${doneText}`;
}

// Ligne de l'exercice ouvert : « Dernière fois · 86 kg max », « Dernière fois · PDC +10 kg »,
// ou la première fois « Première fois · 3 × 6–10 réps »
function exerciseLastTimeText(exName) {
  const info = exInfo(exName);
  const history = (state && state.history) ? state.history : [];
  for (let i = history.length - 1; i >= 0; i--) {
    const h = history[i];
    if (editingOriginalId !== null && h.id === editingOriginalId) continue; // pas la séance en cours de modification
    const ex = (h.exercises || []).find(e => sameExercise(e.name, exName));
    if (!ex || !Array.isArray(ex.sets)) continue;
    if (info.cardio) {
      const cs = ex.sets.find(isPerformedCardioSet);
      if (!cs) continue;
      if (info.mode === 'floors') return `Dernière fois · ${cs.floors} étages en ${formatDurationMS(cs.seconds)}`;
      if (info.mode === 'time') return `Dernière fois · ${formatDurationMS(cs.seconds)}`;
      const dist = distanceInKm(exName)
        ? `${(Number(cs.meters) / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} km`
        : `${Number(cs.meters).toLocaleString('fr-FR')} m`;
      return `Dernière fois · ${dist} en ${formatDurationMS(cs.seconds)}`;
    }
    const performed = ex.sets.filter(isPerformedSet);
    if (!performed.length) continue;
    if (info.mode === 'bw') {
      const withLest = performed.filter(s => s.lest !== undefined);
      if (withLest.length) return `Dernière fois · ${lestText(Math.max(...withLest.map(s => parseFloat(s.lest) || 0)))}`;
      return `Dernière fois · ${Math.max(...performed.map(s => parseFloat(s.weight) || 0))} kg max`;
    }
    if (info.mode === 'reps') return `Dernière fois · ${Math.max(...performed.map(s => parseFloat(s.reps) || 0))} réps max`;
    if (info.mode === 'time') return `Dernière fois · ${formatDurationMS(Math.max(...performed.map(s => parseFloat(s.seconds) || 0)))} max`;
    return `Dernière fois · ${Math.max(...performed.map(s => parseFloat(s.weight) || 0))} kg max`;
  }
  if (info.cardio || !info.reps) return 'Première fois';
  const defEx = findProgramExercise(exName);
  const n = defEx ? defEx.seriesCount : (info.sets || 3);
  return `Première fois · ${n} × ${info.reps}${info.mode === 'time' ? '' : ' réps'}`;
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
function defExercise(exId, sets) {
  const info = exInfo(exId);
  return { name: info.name, exId: info.id, seriesCount: info.cardio ? 1 : Math.max(1, sets || info.sets || 3) };
}

// Séance de l'élément actif (programme : séance de la rotation ; séance libre : elle-même)
function buildWorkoutDef() {
  const cur = currentSessionDef();
  if (!cur) return null;
  const p = cur.program;
  return {
    programId: p.id, programName: p.name, kind: p.kind, key: cur.key,
    sessionName: sessionLabel(p, cur.session),
    draftKey: `${p.id}:${cur.key}`,
    exercises: (cur.session.exercises || []).map(e => defExercise(e.exId, e.sets))
  };
}

// Modification d'une ancienne séance : sa séance d'origine (si le programme existe encore) + ses exercices
function workoutDefFromHistory(h) {
  const p = h.programId ? getProgram(h.programId) : null;
  const session = p ? (isLibre(p) ? p.sessions[0] : p.sessions.find(s => s.key === h.sessionKey)) : null;
  const list = session ? (session.exercises || []).map(e => defExercise(e.exId, e.sets)) : [];
  (h.exercises || []).forEach(ex => {
    const name = canonicalExerciseName(ex.name);
    const n = Array.isArray(ex.sets) ? ex.sets.length : 0;
    const found = list.find(e => e.name === name);
    if (found) { if (!exInfo(name).cardio) found.seriesCount = Math.max(found.seriesCount, n); }
    else list.push({ name, exId: exInfo(name).id, seriesCount: exInfo(name).cardio ? 1 : Math.max(1, n) });
  });
  return {
    programId: h.programId || null, programName: h.programName || '', kind: h.kind === 'libre' ? 'libre' : 'program',
    key: h.kind === 'libre' ? '' : (h.sessionKey || h.type || 'A'),
    sessionName: h.sessionName || h.programName || 'Séance',
    draftKey: null,
    exercises: list
  };
}

// 1.7.40 (co-auteur : Claude) : titre de la page Séance = nom du programme ou de la séance libre
// (« Séance » quand rien n'est prévu)
function updateSeancePageTitle() {
  if (document.body.dataset.tab !== 'seance') return;
  const pageTitle = document.getElementById('page-title');
  if (!pageTitle) return;
  pageTitle.innerText = (workoutDef && workoutDef.programName) || PAGE_TITLES.seance;
  // 1.7.41 : icône du type de programme devant le nom (cycle pour un programme, 1× pour une séance libre)
  const ico = document.getElementById('seance-prog-ico');
  if (ico) {
    const libre = !!workoutDef && workoutDef.kind === 'libre';
    ico.className = 'prog-ico' + (libre ? ' libre' : ' dark') + (workoutDef ? ' on' : '');
    ico.innerHTML = workoutDef ? (libre ? '1×' : SWAP_SVG) : '';
  }
  // 1.7.48 : le bouton de pause est descendu près du compteur de séries : le titre reste à sa hauteur normale
  updateStickyOffsets();
}

// En-tête de l'onglet Séance : pastille, nom de la séance, déload et report
function renderSeanceHead(def, customSession) {
  const badge = document.getElementById('seance-badge');
  if (badge) {
    const libre = def.kind === 'libre';
    badge.innerText = libre ? '1×' : def.key;
    badge.className = `type-pill type-pill-${libre ? 'libre' : def.key}`;
  }
  const titleEl = document.getElementById('seance-type-title');
  if (titleEl) titleEl.innerText = def.sessionName;
  // 1.7.41 : séance libre = seulement l'icône 1× et le nom dans le titre de la page ;
  // en modification d'une ancienne séance libre, seule la ligne « Modification · date » reste
  const libreHead = def.kind === 'libre';
  if (badge) badge.hidden = libreHead;
  if (titleEl) titleEl.hidden = libreHead;
  const headEl = document.getElementById('seance-head');
  if (headEl) headEl.hidden = libreHead && !customSession;
  updateSeancePageTitle();
  // Ligne au-dessus du nom : seulement en modification d'une ancienne séance (1.7.27)
  const overlineEl = document.getElementById('seance-overline');
  if (overlineEl) {
    overlineEl.innerText = customSession ? `Modification · ${formatDate(customSession.date)}` : '';
    overlineEl.hidden = !customSession;
  }

  const deloadSubEl = document.getElementById('deload-subtitle');
  const actionsEl = document.getElementById('deload-actions');
  const BOLT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 3L5 14h6l-1 7 8-11h-6z"/></svg>';
  if (deloadSubEl) {
    if (isDeloadActive()) {
      deloadSubEl.innerHTML = BOLT + 'Déload actif · −20 % sur les charges';
      deloadSubEl.style.display = 'inline-flex';
    } else {
      deloadSubEl.innerHTML = '';
      deloadSubEl.style.display = 'none';
    }
  }
  if (actionsEl) {
    if (customSession) actionsEl.innerHTML = '';
    else if (isDeloadActive()) actionsEl.innerHTML = '<button type="button" class="link-btn deload-link" onclick="postponeDeload()">Reporter à la prochaine séance</button>';
    else if (isDeloadPostponed()) actionsEl.innerHTML = '<span class="deload-postponed">Déload reporté à la prochaine séance</span> <button type="button" class="link-btn deload-link" onclick="cancelDeloadPostpone()">Annuler</button>';
    else actionsEl.innerHTML = '';
    actionsEl.hidden = !actionsEl.innerHTML;
  }
}

function initWorkoutForm(customSession = null) {
  resetWorkoutTimer();
  if(!state) return;

  const def = customSession ? workoutDefFromHistory(customSession) : buildWorkoutDef();
  workoutDef = def;

  manualOpenExercise = undefined;
  lastOpenExerciseIdx = null;
  scrollOnNextRefresh = false;

  // Rien d'actif : écran « Aucune séance prévue » (écran 24)
  const empty = !def;
  document.body.dataset.seance = empty ? 'empty' : 'ready';
  const emptyEl = document.getElementById('seance-empty');
  if (emptyEl) emptyEl.hidden = !empty;
  const form = document.getElementById('workout-form');
  if (form) form.hidden = empty;
  const container = document.getElementById('exercises-list');
  if (empty) {
    const warmNote = document.getElementById('warmup-note'); // 1.7.42 : la sortir de la liste avant de la vider
    if (warmNote && container && container.contains(warmNote)) { container.parentElement.insertBefore(warmNote, container); warmNote.hidden = true; }
    if (container) container.innerHTML = '';
    updateSeancePageTitle();
    updateSetsProgress();
    updateStickyOffsets();
    return;
  }

  renderSeanceHead(def, customSession);
  // 1.7.42 : la phrase d'échauffement est replacée à chaque affichage, juste avant le 1er exercice de force
  const warm = document.getElementById('warmup-note');
  if (warm && container && warm.parentElement !== container.parentElement) container.parentElement.insertBefore(warm, container);

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

  if(!container) return;
  container.innerHTML = '';

  def.exercises.forEach((ex) => {
    const info = exInfo(ex.name);
    const div = document.createElement('div');
    div.className = 'exercise-item';

    let existingEx = null;
    if (customSession && customSession.exercises) {
      existingEx = customSession.exercises.find(e => sameExercise(e.name, ex.name));
    }

    let rowsHtml = '';
    if (info.cardio) {
      let secVal, amtVal = '', preChecked = false;
      const saved = existingEx && existingEx.sets && existingEx.sets[0];
      if (saved && isPerformedCardioSet(saved)) {
        secVal = saved.seconds; amtVal = formatCardioAmountInput(ex.name, saved); preChecked = true;
      } else {
        const isRower = ex.name === ROWER_NAME;
        const sg = getSuggestedCardioValues(ex.name, isRower ? ROWER_DEFAULTS.seconds : '', isRower ? ROWER_DEFAULTS.meters : undefined);
        secVal = sg.seconds; amtVal = formatCardioAmountInput(ex.name, sg);
      }
      if (info.mode === 'time') rowsHtml = setRowHtml(ex.name, 1, secVal, '', preChecked);
      else rowsHtml = setRowHtml(ex.name, 1, secVal, amtVal, preChecked);
    } else {
      for (let s = 1; s <= ex.seriesCount; s++) {
        let weightVal, repsVal, preChecked = false;
        const saved = existingEx && existingEx.sets && existingEx.sets[s - 1];
        if (saved) {
          // En modification : une série déjà enregistrée revient cochée
          preChecked = isPerformedSet(saved);
          if (info.mode === 'bw') weightVal = saved.lest !== undefined ? saved.lest : saved.weight;
          else if (info.mode === 'time') weightVal = saved.seconds || '';
          else if (info.mode === 'reps') weightVal = '';
          else weightVal = saved.weight;
          repsVal = info.mode === 'time' ? '' : saved.reps;
        } else {
          const lastSet = getSuggestedSetValues(ex.name, s - 1, '', defaultRepsFor(ex.name));
          weightVal = lastSet.weight;
          repsVal = lastSet.reps;
        }
        rowsHtml += setRowHtml(ex.name, s, weightVal, repsVal, preChecked);
      }
    }

    div.dataset.ex = ex.name;
    div.innerHTML = `
      <div class="ex-header">
        <button type="button" class="ex-toggle" aria-expanded="false" onclick="toggleExercise(this)">
          <span class="ex-icon-badge">${getIcon(ex.name, true)}</span>
          <span class="ex-text">
            <span class="ex-name">${escapeHtml(ex.name)}</span>
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
        ${setsHeadHtml(ex.name)}
        <div class="sets-grid" data-ex="${escapeHtml(ex.name)}">${rowsHtml}</div>
      </div>
    `;
    container.appendChild(div);
  });

  // 1.7.42 (co-auteur : Claude) : phrase d'échauffement juste avant le premier exercice de force
  // (cardio éventuel au-dessus), cachée si la séance n'a que du cardio
  if (warm) {
    const firstStrength = [...container.querySelectorAll('.exercise-item')].find(el => !exInfo(el.dataset.ex).cardio);
    if (firstStrength) container.insertBefore(warm, firstStrength);
    warm.hidden = !firstStrength;
  }

  // Saisie en cours retrouvée après un rechargement (jamais en modification d'une ancienne séance)
  if (!customSession && editingOriginalId === null) restoreDraft(def.draftKey);

  updateSetsProgress();
  updateStickyOffsets();
}

// Enregistrement de la séance (formulaire de l'onglet Séance) : seules les séries cochées sont conservées
async function submitWorkout(e) {
  e.preventDefault();
  if (!workoutDef) return;
  let totalTonnage = 0;
  let exerciseLogs = [];

  if (!state.lastWeights) state.lastWeights = {};
  const isEditing = editingOriginalId !== null;
  const bodyKg = latestBodyWeight();

  // Seules les séries cochées sont enregistrées (v1.4.3)
  const setRows = Array.from(document.querySelectorAll('#exercises-list .set-row'));
  const validatedRows = setRows.filter(row => row.classList.contains('done'));

  if (validatedRows.length === 0) {
    appAlert('Aucune série cochée', "Valide au moins une série avec la coche avant d'enregistrer la séance.");
    return;
  }

  const items = Array.from(document.querySelectorAll('#exercises-list .exercise-item'));
  const refuse = (row, input, message) => {
    manualOpenExercise = items.indexOf(row.closest('.exercise-item'));
    refreshExerciseStates();
    appAlert('Série à corriger', message, 'warn').then(() => { if (input) input.focus(); });
  };

  // Une série cochée doit avoir des valeurs valides (selon le mode de saisie de l'exercice)
  for (const row of validatedRows) {
    const wInput = row.querySelector('.weight-input');
    const rInput = row.querySelector('.reps-input');
    const exName = wInput.dataset.ex;
    const mode = exMode(exName);
    const number = Array.from(row.parentElement.querySelectorAll('.set-row')).indexOf(row) + 1;
    if (mode === 'dist' || mode === 'floors') {
      const sec = parseDurationInput(wInput.value), amt = parseCardioAmount(exName, rInput.value);
      if (!(sec > 0) || !(amt > 0)) {
        const what = mode === 'floors' ? 'son nombre d\'étages' : `sa distance (en ${distanceInKm(exName) ? 'kilomètres' : 'mètres'})`;
        refuse(row, !(sec > 0) ? wInput : rInput, `« ${exName} » est coché, mais sa durée (format min:ss, ex. 4:30) ou ${what} n'est pas valide.`);
        return;
      }
      continue;
    }
    if (mode === 'time') {
      if (!(parseDurationInput(wInput.value) > 0)) { refuse(row, wInput, `La série ${number} de « ${exName} » est cochée, mais sa durée (format min:ss, ex. 0:45) n'est pas valide.`); return; }
      continue;
    }
    const r = Number(rInput.value);
    const repsOk = rInput.value !== '' && Number.isInteger(r) && r > 0;
    if (mode === 'reps') {
      if (!repsOk) { refuse(row, rInput, `La série ${number} de « ${exName} » est cochée, mais ses répétitions ne sont pas valides.`); return; }
      continue;
    }
    if (mode === 'bw') {
      const l = parseLest(wInput.value);
      if (Number.isNaN(l) || !repsOk) { refuse(row, Number.isNaN(l) ? wInput : rInput, `La série ${number} de « ${exName} » est cochée, mais son lest (ex. +10, vide = poids du corps) ou ses répétitions ne sont pas valides.`); return; }
      continue;
    }
    const w = Number(wInput.value);
    if (wInput.value === '' || !Number.isFinite(w) || w <= 0 || !repsOk) {
      refuse(row, (wInput.value === '' || !Number.isFinite(w) || w <= 0) ? wInput : rInput, `La série ${number} de « ${exName} » est cochée, mais son poids ou ses répétitions ne sont pas valides.`);
      return;
    }
  }

  // Séance partielle : confirmation avant d'ignorer les séries non cochées
  const uncheckedCount = setRows.length - validatedRows.length;
  if (uncheckedCount > 0) {
    const okS = validatedRows.length > 1 ? 's' : '';
    const noS = uncheckedCount > 1 ? 's' : '';
    const ignored = uncheckedCount > 1 ? 'seront ignorées' : 'sera ignorée';
    const willS = validatedRows.length > 1 ? 'seront enregistrées' : 'sera enregistrée';
    if (!await askSheet({ tone: 'warn', title: 'Séries non cochées',
      text: `${validatedRows.length} série${okS} cochée${okS} ${willS}. ${uncheckedCount} série${noS} non cochée${noS} ${ignored}.`,
      ok: 'Enregistrer', cancel: 'Revenir à la séance' })) return;
    if (!workoutDef) return;
  }

  const logFor = (exName, cardio) => {
    let exLog = exerciseLogs.find(x => x.name === exName);
    if (!exLog) {
      exLog = { name: exName, sets: [], maxWeight: 0, totalVolume: 0 };
      const id = exInfo(exName).id;
      if (id) exLog.exId = id;
      if (cardio) exLog.cardio = true;
      exerciseLogs.push(exLog);
    }
    return exLog;
  };

  validatedRows.forEach((row) => {
    const wInput = row.querySelector('.weight-input');
    const rInput = row.querySelector('.reps-input');
    const exName = wInput.dataset.ex;
    const mode = exMode(exName);
    if (mode === 'dist' || mode === 'floors' || (mode === 'time' && isCardioName(exName))) {
      const set = { weight: 0, reps: 0, seconds: parseDurationInput(wInput.value) };
      if (mode === 'dist') set.meters = parseCardioAmount(exName, rInput.value);
      if (mode === 'floors') set.floors = parseCardioAmount(exName, rInput.value);
      logFor(exName, true).sets.push(set);
      return;
    }
    if (mode === 'time') { logFor(exName).sets.push({ weight: 0, reps: 0, seconds: parseDurationInput(wInput.value), hold: true }); return; }
    const r = Number(rInput.value);
    if (mode === 'reps') { logFor(exName).sets.push({ weight: 0, reps: r, free: true }); return; }

    let w, set;
    if (mode === 'bw') {
      // Charge réelle = dernière pesée + lest (sans pesée : le lest seul)
      const lest = parseLest(wInput.value);
      w = Math.max(0, Math.round(((bodyKg || 0) + lest) * 10) / 10);
      set = { weight: w, reps: r, lest };
    } else {
      w = Number(wInput.value);
      set = { weight: w, reps: r };
    }
    const setVolume = w * r;
    totalTonnage += setVolume;
    const exLog = logFor(exName);
    exLog.sets.push(set);
    exLog.totalVolume += setVolume;
    if (w > exLog.maxWeight) exLog.maxWeight = w;

    // On ne touche pas aux dernières charges quand on corrige une ancienne séance
    if (!isEditing && mode === 'weight') state.lastWeights[exName] = w;
  });

  // En modification sans chrono lancé, on garde la durée d'origine (même si elle n'était pas renseignée)
  const keepOriginalDuration = isEditing && workoutSeconds === 0;
  const sessionDuration = keepOriginalDuration
    ? (editingOriginalDuration || undefined)
    : getFormattedWorkoutDuration();

  const def = workoutDef;
  const sessionDate = editingOriginalDate || new Date().toISOString().slice(0, 10);
  const sessionId = editingOriginalId || Date.now();
  const original = isEditing ? state.history.find(h => h.id === editingOriginalId) : null;

  const entry = {
    id: sessionId,
    date: sessionDate,
    type: def.kind === 'libre' ? '1×' : def.key,
    isDeload: isDeloadActive(),
    tonnage: Math.round(totalTonnage),
    duration: sessionDuration,
    programId: def.programId,
    programName: def.programName,
    kind: def.kind,
    sessionKey: def.key,
    sessionName: def.sessionName,
    exercises: exerciseLogs
  };
  if (original) ['programId', 'programName', 'kind', 'sessionKey', 'sessionName', 'type'].forEach(k => { if (original[k] !== undefined) entry[k] = original[k]; });

  // Avant d'ajouter la séance : précédente du même type et records battus (fenêtre de fin)
  const previousEntry = isEditing ? null : previousSameSession(entry);
  const records = isEditing ? [] : sessionRecords(entry);

  // En modification, la séance d'origine est encore dans l'historique : on la remplace
  if (isEditing) {
    const originalIdx = state.history.findIndex(h => h.id === editingOriginalId);
    if (originalIdx !== -1) state.history.splice(originalIdx, 1);
  }

  state.history.push(entry);
  state.history.sort((a, b) => new Date(a.date) - new Date(b.date));

  // Programme : le nombre de séries fait devient la référence ; la rotation passe à la séance suivante.
  // Une séance libre reste active.
  const p = def.programId ? getProgram(def.programId) : null;
  if (p && !isEditing) {
    const session = isLibre(p) ? p.sessions[0] : p.sessions.find(s => s.key === def.key);
    if (session) {
      items.forEach(item => {
        const info = exInfo(item.dataset.ex);
        if (info.cardio) return;
        const pe = session.exercises.find(x => x.exId === info.id);
        if (pe) pe.sets = item.querySelectorAll('.set-row').length;
      });
    }
  }
  getPrograms().forEach(pr => { if (!isLibre(pr)) pr.nextKey = nextKeyFromHistory(pr); });
  if (state.deload && !isEditing) state.deload.postponedAt = null; // le report est consommé par cette séance
  syncNextType();

  clearEditState();
  localStorage.removeItem('workout_start_time');
  // Une séance enregistrée vide le brouillon ; une modification d'ancienne séance le laisse intact
  if (!isEditing) clearDraft();

  saveState();

  // Sauvegarde automatique Google Drive (si connecté) : fichier de sauvegarde complète mis à jour
  backupToDrive();

  // Actualise la bannière de déload en temps réel
  displayDeloadNotificationIfNeeded();

  const usedBodyweight = exerciseLogs.some(x => x.sets.some(st => st.lest !== undefined));
  const weighNotice = usedBodyweight && !bodyKg ? '\n• Poids du corps non renseigné : seul le lest est compté (ajoute ta pesée dans Progression)' : '';
  if (isEditing) {
    showToast(`Séance modifiée !\n• Temps : ${sessionDuration || 'N/A'}\n• Séries enregistrées : ${validatedRows.length}\n• Tonnage réel : ${Math.round(totalTonnage).toLocaleString()} kg${weighNotice}${driveSaveNotice()}`);
  } else {
    // Fin de séance (1.7.27) : fenêtre « Bravo ! » ; les éventuels avertissements suivent en message
    openFinishDialog(entry, previousEntry, records);
    const notes = (weighNotice + driveSaveNotice()).replace(/^\n• /, '').replace(/\n• /g, '\n');
    if (notes) showToast(notes);
  }

  initWorkoutForm();
  renderHistory();
  renderCharts();
  switchTab('seance');
}

// ============================================================
// FENÊTRE DE FIN DE SÉANCE (1.7.27)
// ============================================================
const TROPHY_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M9 20h6"/></svg>';

// Dernière séance enregistrée du même programme et de la même séance (A, B…, ou la séance libre)
function previousSameSession(entry) {
  const same = h => entry.programId
    ? h.programId === entry.programId && (entry.kind === 'libre' || h.sessionKey === entry.sessionKey)
    : !h.programId && h.type === entry.type;
  const list = (state.history || []).filter(h => h.id !== entry.id && same(h));
  list.sort((a, b) => (new Date(a.date) - new Date(b.date)) || (a.id - b.id));
  return list.length ? list[list.length - 1] : null;
}

// Records battus par cette séance : charge maximale (exercices à charge) ou durée maximale (cardio, gainage),
// comparées à toutes les séances précédentes. Un exercice jamais fait auparavant ne compte pas.
function sessionRecords(entry) {
  const others = (state.history || []).filter(h => h.id !== entry.id);
  const out = [];
  entry.exercises.forEach(ex => {
    const mode = exMode(ex.name);
    const byTime = ex.cardio || mode === 'time';
    if (!byTime && mode !== 'weight') return;
    const val = st => byTime ? (Number(st.seconds) || 0) : (Number(st.weight) || 0);
    const cur = Math.max(0, ...ex.sets.map(val));
    if (!cur) return;
    let prev = 0, seen = false;
    others.forEach(h => (h.exercises || []).forEach(x => {
      if (x.name !== ex.name && !(ex.exId && x.exId === ex.exId)) return;
      seen = true;
      (x.sets || []).forEach(st => { prev = Math.max(prev, val(st)); });
    }));
    if (seen && cur > prev) out.push({ name: ex.name, value: byTime ? formatDurationMS(cur) : `${cur.toLocaleString('fr-FR')} kg` });
  });
  return out;
}

function openFinishDialog(entry, previous, records) {
  closeFinishDialog();
  const libre = entry.kind === 'libre';
  const pill = libre ? '' : `<span class="type-pill type-pill-${escapeHtml(entry.sessionKey)} finish-pill" aria-label="${escapeHtml(entry.sessionKey)}">${escapeHtml(entry.sessionKey)}</span>`;
  const kg = n => `${Math.round(n).toLocaleString('fr-FR')} kg`;
  let html = `<p class="finish-bravo">Bravo !</p>
    <h2 class="finish-title" id="finish-title"><span>Séance</span>${pill}<span>terminée</span></h2>`;
  if (entry.tonnage > 0) {
    html += `<p class="finish-tonnage">Tonnage : <b>${kg(entry.tonnage)}</b></p>`;
    if (previous && previous.tonnage > 0) {
      const d = entry.tonnage - previous.tonnage;
      html += `<p class="finish-compare${d > 0 ? ' up' : ''}">${d > 0 ? '+' : d < 0 ? '−' : '±'}${kg(Math.abs(d))} / précédente</p>`;
    }
  }
  if (records.length) {
    html += `<div class="finish-sep" aria-hidden="true"></div>
      <p class="finish-rec-title"><span>Nouveau record</span>${TROPHY_SVG}</p>
      ${records.map(r => `<p class="finish-rec">${escapeHtml(r.name)}, <b>${escapeHtml(r.value)}</b></p>`).join('')}`;
  }
  html += `<button type="button" class="btn finish-ok" onclick="closeFinishDialog()">OK</button>`;
  const overlay = document.createElement('div');
  overlay.id = 'finish-overlay';
  overlay.className = 'finish-overlay';
  overlay.innerHTML = `<div class="finish-sheet" role="dialog" aria-modal="true" aria-labelledby="finish-title">${html}</div>`;
  document.body.appendChild(overlay);
  const ok = overlay.querySelector('.finish-ok');
  if (ok) ok.focus();
}

function closeFinishDialog() {
  const overlay = document.getElementById('finish-overlay');
  if (overlay) overlay.remove();
}

document.addEventListener('submit', function(e) {
  if (e.target && e.target.id === 'workout-form') submitWorkout(e);
});

// ============================================================
// 11. ÉCRAN HISTORIQUE ET MODIFICATION D'UNE SÉANCE
// ============================================================
// Filtre par programme (« Tout » ou un programme / une séance libre ayant des séances, même supprimé)
let historyFilter = 'all';

// Programmes présents dans l'historique, dans l'ordre de leur dernière séance (le plus récent d'abord)
function historyProgramList() {
  const seen = new Map();
  (state.history || []).forEach(h => {
    if (!h.programId) return;
    const p = getProgram(h.programId);
    seen.set(h.programId, { id: h.programId, name: p ? p.name : (h.programName || 'Programme'), last: h.date || '' });
  });
  return Array.from(seen.values()).sort((a, b) => (a.last < b.last ? 1 : a.last > b.last ? -1 : 0));
}

function setHistoryFilter(id) {
  historyFilter = id;
  renderHistory();
}

function renderHistoryFilters() {
  const box = document.getElementById('history-filters');
  if (!box) return;
  const list = historyProgramList();
  if (historyFilter !== 'all' && !list.some(p => p.id === historyFilter)) historyFilter = 'all';
  if (list.length < 2) { box.hidden = true; box.innerHTML = ''; historyFilter = 'all'; return; }
  box.hidden = false;
  box.innerHTML = [{ id: 'all', name: 'Tout' }].concat(list).map(p =>
    `<button type="button" class="filter-btn${historyFilter === p.id ? ' active' : ''}" onclick="setHistoryFilter('${escapeHtml(p.id)}')">${escapeHtml(p.name)}</button>`).join('');
}

// Nom du programme d'une séance de l'historique (nom actuel s'il existe encore, sinon le nom recopié)
function historyProgramName(h) {
  const p = h.programId ? getProgram(h.programId) : null;
  return p ? p.name : (h.programName || '');
}

function renderHistory() {
  const container = document.getElementById('history-list');
  if(!container) return;
  container.innerHTML = '';
  renderHistoryFilters();

  const history = state.history || [];
  const visible = i => historyFilter === 'all' || history[i].programId === historyFilter;
  const shownCount = history.filter((h, i) => visible(i)).length;
  const countEl = document.getElementById('history-count');
  if (countEl) countEl.textContent = `${shownCount} séance${shownCount > 1 ? 's' : ''} enregistrée${shownCount > 1 ? 's' : ''}`;

  // Index réels triés du plus récent au plus ancien, regroupés par mois
  const order = history.map((h, i) => i).filter(visible).sort((x, y) => {
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
      const origin = historyProgramName(h);
      const sub = [origin, hasDuration ? h.duration : 'Durée non enregistrée'].filter(Boolean).join(' · ');
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'history-item';
      row.setAttribute('aria-label', `${historySessionTitle(h)} : modifier`);
      row.onclick = () => openSessionModal(realIndex);
      row.innerHTML = `
        ${sessionPillHtml(h)}
        <span class="history-main">
          <span class="history-date">${formatHistoryDate(h.date)}${h.isDeload ? ' <span class="deload-tag"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 3L5 14h6l-1 7 8-11h-6z"/></svg>Déload</span>' : ''}</span>
          <span class="history-duration">${escapeHtml(sub)}</span>
        </span>
        <span class="history-tonnage">${historyTonnes(h.tonnage)} T</span>
        <span class="history-chevron">${CHEVRON_SVG}</span>`;
      card.appendChild(row);
    });
    section.appendChild(card);
    container.appendChild(section);
  });
}

// « Séance C du 04/11 » ou « Dorsaux du 05/11 » (séance libre)
function historySessionTitle(h) {
  if (h.kind === 'libre') return `${historyProgramName(h) || h.sessionName || 'Séance libre'} du ${formatDate(h.date)}`;
  return `Séance ${h.sessionKey || h.type} du ${formatDate(h.date)}`;
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
        <p id="modal-session-origin" class="modal-origin"></p>
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

      showToast(`${historySessionTitle(sessionToEdit)} chargée dans le formulaire. Corrigez-la puis validez, ou annulez : l'originale reste intacte tant que vous n'avez pas validé.`);
    }
  });
}

// Suppression d'une séance de l'historique (essai de validation, saisie par erreur...).
// Les dernières charges sont recalculées, la prochaine séance repart de l'historique restant, et la
// sauvegarde Google Drive est mise à jour : la séance supprimée y est retirée (voir DRIVE_DELETED_KEY).
async function deleteSelectedSession() {
  if (selectedSessionIndex === null) return;
  const idx = selectedSessionIndex;
  const session = state.history[idx];
  if (!session) return;
  const driveOn = isDriveWanted() || !!getDriveToken();
  if (!await askSheet({ tone: 'danger', danger: true, title: `Supprimer la ${historySessionTitle(session).replace(/^Séance /, 'séance ')} ?`,
    text: 'Suppression définitive.' + (driveOn ? ' Elle sera aussi retirée de la sauvegarde Google Drive.' : ''), ok: 'Supprimer la séance', cancel: 'Annuler' })) return;
  if (state.history[idx] !== session) return;

  state.history.splice(idx, 1);
  if (session.id !== undefined && session.id !== null) rememberDeletedSessionId(session.id);

  // Dernières charges : on repart de l'historique restant pour les exercices de la séance supprimée
  if (!state.lastWeights) state.lastWeights = {};
  (session.exercises || []).forEach(ex => {
    if (exMode(ex.name) !== 'weight') return;
    delete state.lastWeights[ex.name];
    state.history.forEach(h => {
      const e = (h.exercises || []).find(x => x.name === ex.name);
      if (e && Array.isArray(e.sets)) e.sets.filter(isPerformedSet).forEach(st => { state.lastWeights[ex.name] = st.weight; });
    });
  });

  getPrograms().forEach(p => { if (!isLibre(p)) p.nextKey = nextKeyFromHistory(p); });
  syncNextType();
  saveState();
  backupToDrive({ autoReconnect: false });
  closeSessionModal();
  initWorkoutForm();
  renderHistory();
  renderCharts();
  displayDeloadNotificationIfNeeded();
}

function openSessionModal(index) {
  selectedSessionIndex = index;
  const session = state.history[index];
  const titleEl = document.getElementById('modal-session-title');
  if (titleEl) titleEl.innerText = historySessionTitle(session);
  const pillEl = document.getElementById('modal-session-pill');
  if (pillEl) pillEl.innerHTML = sessionPillHtml(session, false);
  // Ligne d'origine : « Prise de masse · Jambes · mollets » ou « Séance libre »
  const originEl = document.getElementById('modal-session-origin');
  if (originEl) {
    const name = historyProgramName(session);
    originEl.textContent = session.kind === 'libre' ? 'Séance libre' : [name, session.sessionName].filter(Boolean).join(' · ');
    originEl.hidden = !originEl.textContent;
  }
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
async function cancelNewSession() {
  if (!await askSheet({ tone: 'danger', danger: true, title: 'Annuler la séance ?',
    text: "Les séries saisies et le chrono seront supprimés. Rien n'est enregistré.", ok: 'Annuler la séance', cancel: 'Continuer la séance' })) return;
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
// --- Périmètre des statistiques (écrans 25 et 26) ---
// null = élément actif par défaut ; sinon l'identifiant d'un programme / d'une séance libre, ou 'all'
let statsScope = null;

function currentStatsScope() {
  if (statsScope === 'all') return 'all';
  if (statsScope && (getProgram(statsScope) || (state.history || []).some(h => h.programId === statsScope))) return statsScope;
  const active = getActiveProgram();
  return active ? active.id : 'all';
}
function statsHistory(scope = currentStatsScope()) {
  const hist = state.history || [];
  return scope === 'all' ? hist : hist.filter(h => h.programId === scope);
}
function statsScopeIsLibre(scope = currentStatsScope()) {
  if (scope === 'all') return false;
  const p = getProgram(scope);
  if (p) return isLibre(p);
  const h = (state.history || []).find(x => x.programId === scope);
  return !!h && h.kind === 'libre';
}
function statsScopeName(scope = currentStatsScope()) {
  if (scope === 'all') return 'Tous les programmes';
  const p = getProgram(scope);
  if (p) return p.name;
  const h = (state.history || []).slice().reverse().find(x => x.programId === scope);
  return h ? h.programName || 'Programme' : 'Programme';
}
// Lettres de séance du périmètre choisi (A / B, A / … / F) ; aucune pour une séance libre ou « Tous »
function statsLetters(scope = currentStatsScope()) {
  if (scope === 'all' || statsScopeIsLibre(scope)) return [];
  const p = getProgram(scope);
  const keys = new Set(p ? p.sessions.map(x => x.key) : []);
  statsHistory(scope).forEach(h => { if (SESSION_KEYS.includes(h.sessionKey)) keys.add(h.sessionKey); });
  return SESSION_KEYS.filter(k => keys.has(k));
}

function statsScopeStatusText(scope) {
  if (scope === 'all') return 'Programmes et séances libres';
  const p = getProgram(scope);
  if (!p) return 'Supprimé · séances conservées';
  if (p.status === 'active') return 'En cours';
  if (isLibre(p)) return 'Séance libre';
  if (p.status === 'new') return 'Pas encore de séance';
  return p.pausedAt ? `En pause depuis le ${formatShortDate(p.pausedAt)}` : 'En pause';
}

function renderStatsScopeButton() {
  const btn = document.getElementById('stats-scope-btn');
  if (!btn) return;
  const scope = currentStatsScope();
  const libre = statsScopeIsLibre(scope);
  const active = scope !== 'all' && getProgram(scope) && getProgram(scope).status === 'active';
  btn.innerHTML = `
    <span class="mem-ico${libre ? ' libre' : ''}${scope === 'all' ? ' grid' : ''}">${scope === 'all' ? GRID_SVG : (libre ? '1×' : SWAP_SVG)}</span>
    <span class="scope-text"><span class="scope-name">${escapeHtml(statsScopeName(scope))}</span><span class="scope-sub">${active ? '<span class="prog-dot on"></span>' : ''}${escapeHtml(statsScopeStatusText(scope))}</span></span>
    <span class="scope-chevron">${CHEVRON_SVG}</span>`;
  const label = document.querySelector('#tab-progression .hero-label');
  if (label) label.textContent = 'Indice de progression';   // 1.7.29 : même titre quel que soit le programme
  const typeBtn = document.getElementById('btn-vol-type');
  if (typeBtn) typeBtn.hidden = statsLetters(scope).length === 0;
}

function openStatsScopeSheet() {
  const scope = currentStatsScope();
  const items = [];
  getPrograms().forEach(p => items.push({ id: p.id, name: p.name, libre: isLibre(p), has: statsHistory(p.id).length > 0 }));
  historyProgramList().forEach(x => { if (!getProgram(x.id)) items.push({ id: x.id, name: x.name, libre: statsScopeIsLibre(x.id), has: true }); });
  const row = (it) => {
    const on = it.id === scope;
    return `
      <button type="button" class="restore-item scope-item${on ? ' on' : ''}${it.libre ? ' libre' : ''}" ${it.has ? '' : 'disabled'} onclick="setStatsScope('${escapeHtml(it.id)}')">
        <span class="mem-ico${it.id === 'all' ? ' grid' : ''}">${it.id === 'all' ? GRID_SVG : (it.libre ? '1×' : SWAP_SVG)}</span>
        <span class="restore-text"><span class="restore-name"><b>${escapeHtml(it.name)}</b></span><span class="restore-when">${it.has ? escapeHtml(statsScopeStatusText(it.id)) : 'Pas encore de séance'}</span></span>
        <span class="restore-box round">${on ? CHECK_SVG : ''}</span>
      </button>`;
  };
  openSheet(`<h3 class="sheet-title">Voir les statistiques de</h3><div class="restore-list">${items.map(row).join('')}${row({ id: 'all', name: 'Tous les programmes', has: true })}</div>`, { tall: true });
}

function setStatsScope(id) {
  statsScope = id;
  currentVolumeFilter = 'all';
  const first = document.querySelector('.hero-card .filter-group .filter-btn');
  if (first) highlightVolumeButton(first);
  updateSessionTypeButton();
  closeSheet();
  renderCharts();
}

// Exercices à charge (catalogue + historique, hors cardio), ceux du programme actif d'abord
function populateExerciseSelect() {
  const select = document.getElementById('exercise-filter');
  if(!select) return;
  const previous = select.value;
  select.innerHTML = '';

  const names = [];
  const add = name => {
    const n = canonicalExerciseName(name);
    const m = exMode(n);
    if ((m === 'weight' || m === 'bw') && !names.includes(n)) names.push(n);
  };
  const active = getActiveProgram();
  if (active) active.sessions.forEach(s => (s.exercises || []).forEach(e => add(exInfo(e.exId).name)));
  const others = [];
  getPrograms().forEach(p => p.sessions.forEach(s => (s.exercises || []).forEach(e => others.push(exInfo(e.exId).name))));
  (state.history || []).forEach(h => (h.exercises || []).forEach(ex => { if (!ex.cardio) others.push(ex.name); }));
  others.map(canonicalExerciseName).sort((a, b) => a.localeCompare(b, 'fr')).forEach(add);

  names.forEach(exName => {
    const opt = document.createElement('option');
    opt.value = exName;
    opt.innerText = exName;
    select.appendChild(opt);
  });
  if (names.includes(previous)) select.value = previous;
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
  const letters = statsLetters();
  typeBtn.innerText = currentVolumeFilter === 'type' ? `Séance ${currentSessionTypeFilter}` : (letters.length > 3 ? `${letters[0]} / … / ${letters[letters.length - 1]}` : letters.join(' / ') || 'A / B / C');
}

// Bascule entre « un point par séance » et « chaque jour écoulé » (écart entre les séances)
function toggleVolumeCalendar() {
  volumeCalendarMode = !volumeCalendarMode;
  if (volumeCalendarMode && currentVolumeFilter === 'month') {
    // la vue par jour n'a pas de sens pour des totaux mensuels : retour à la vue par séance
    currentVolumeFilter = 'all';
    const first = document.querySelector('.hero-card .filter-group .filter-btn');
    if (first) highlightVolumeButton(first);
    updateSessionTypeButton();
  }
  renderTonnageChart();
}

function updateVolumeCalendarButton() {
  const b = document.getElementById('btn-vol-calendar');
  if (!b) return;
  const label = volumeCalendarMode ? 'Revenir à un point par séance' : 'Afficher chaque jour écoulé pour voir l\'écart entre les séances';
  b.setAttribute('aria-pressed', volumeCalendarMode ? 'true' : 'false');
  b.setAttribute('aria-label', label);
  b.title = label;
}

function setVolumeFilter(filter, btn) {
  if (filter === 'month') volumeCalendarMode = false;
  currentVolumeFilter = filter;
  highlightVolumeButton(btn);
  updateSessionTypeButton();
  renderTonnageChart();
}

// Chaque appui fait défiler les séances : A, puis B, puis C, puis A...
// (le premier appui, depuis un autre filtre, démarre toujours sur A)
function cycleSessionTypeFilter(btn) {
  const letters = statsLetters();
  if (!letters.length) return;
  if (currentVolumeFilter === 'type' && letters.includes(currentSessionTypeFilter)) {
    const idx = letters.indexOf(currentSessionTypeFilter);
    currentSessionTypeFilter = letters[(idx + 1) % letters.length];
  } else {
    currentVolumeFilter = 'type';
    currentSessionTypeFilter = letters[0];
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

// Axe vertical fixe de la vue « par jour » : le graphique défile, pas les graduations.
// Les graduations sont celles de Chart.js, repositionnées dans une colonne à gauche qui ne défile pas.
function renderFixedYAxis(chart) {
  const box = document.getElementById('hero-yaxis');
  if (!box) return;
  box.innerHTML = '';
  box.classList.toggle('on', !!chart);
  if (!chart) return;
  const y = chart.scales.y;
  y.ticks.forEach(t => {
    const span = document.createElement('span');
    span.textContent = Number(t.value).toLocaleString('fr-FR');
    span.style.top = y.getPixelForValue(t.value) + 'px';
    box.appendChild(span);
  });
}

function renderTonnageChart() {
  const canvas = document.getElementById('tonnageChart');
  if (!canvas) return;
  const ctx1 = canvas.getContext('2d');
  if (tonnageChart) tonnageChart.destroy();

  let labels = [];
  let data = [];
  const hist = statsHistory();
  if (currentVolumeFilter === 'type' && !statsLetters().includes(currentSessionTypeFilter)) { currentVolumeFilter = 'all'; updateSessionTypeButton(); }
  const keyOf = e => e.sessionKey || e.type;

  if (hist.length === 0) {
    labels = ['Aucune donnée'];
    data = [0];
  } else if (currentVolumeFilter === 'month') {
    // --- VUE PAR MOIS ---
    let monthlyData = {};
    hist.forEach(e => {
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
    const typedHistory = [...hist]
      .filter(e => keyOf(e) === currentSessionTypeFilter)
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
    const sortedHistory = [...hist].sort((a, b) => new Date(a.date) - new Date(b.date));

    labels = sortedHistory.map(e => `${e.type} (${formatDate(e.date)})`);
    data = sortedHistory.map(e => parseFloat(e.tonnage) || 0);
  }

  // Courbe blanche sur le bloc héros indigo
  const lineLabel = currentVolumeFilter === 'type' ? `Tonnage séance ${currentSessionTypeFilter} (kg)` : 'Tonnage (kg)';
  const onHero = 'rgba(255, 255, 255, 0.8)';

  // --- Mode « par jour » : une colonne par jour entre la 1re séance et aujourd'hui, défilement horizontal ---
  const wrap = document.getElementById('hero-scroll');
  const inner = document.getElementById('hero-scroll-inner');
  const calendar = volumeCalendarMode && currentVolumeFilter !== 'month' && hist.length > 0;
  updateVolumeCalendarButton();
  let dayDetails = null;
  if (calendar) {
    const sessions = hist.filter(e => e.date && (currentVolumeFilter !== 'type' || keyOf(e) === currentSessionTypeFilter));
    const byDay = {};
    sessions.forEach(e => {
      const d = byDay[e.date] || (byDay[e.date] = { tonnage: 0, types: [] });
      d.tonnage += parseFloat(e.tonnage) || 0; d.types.push(e.type);
    });
    const keys = Object.keys(byDay).sort();
    if (keys.length > 0) {
      const toUtc = k => { const [y, m, d] = k.split('-').map(Number); return Date.UTC(y, m - 1, d); };
      const iso = t => new Date(t).toISOString().slice(0, 10);
      const now = new Date();
      const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
      const start = toUtc(keys[0]);
      const end = Math.max(today, toUtc(keys[keys.length - 1]));
      labels = []; data = []; dayDetails = [];
      for (let t = start; t <= end; t += 86400000) {
        const k = iso(t);
        labels.push(k);
        data.push(byDay[k] ? byDay[k].tonnage : null);
        dayDetails.push(byDay[k] || null);
      }
    }
  }
  const dayMode = !!dayDetails;
  const PX_PER_DAY = 9; // ~3 fois plus serré qu'à 26 px : plusieurs semaines visibles d'un coup
  if (wrap && inner) {
    wrap.classList.toggle('scrollable', dayMode);
    inner.style.width = dayMode ? Math.max(labels.length * PX_PER_DAY, wrap.clientWidth || 0) + 'px' : '';
  }

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
        tension: dayMode ? 0 : 0.3,
        spanGaps: true, // relie les séances à travers les jours sans séance
        pointBackgroundColor: '#fff',
        pointRadius: dayMode ? 4 : 3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false, // hauteur fixe (210 px, voir .hero-scroll-inner) : identique en vue par séance, par mois et par jour
      layout: dayMode ? { padding: { left: 14, right: 22, top: 11 } } : {}, // top : compense les graduations Y (déportées dans l'axe fixe) pour garder la même zone de tracé // les dates des extrémités ne sont plus rognées
      plugins: {
        legend: { display: false },
        tooltip: dayMode ? { callbacks: {
          title: items => { const k = labels[items[0].dataIndex]; const [y, m, d] = k.split('-'); return `${d}/${m}/${y}`; },
          label: c => { const det = dayDetails[c.dataIndex]; return `${det ? det.types.join(' + ') + ' · ' : ''}${Math.round(c.parsed.y).toLocaleString('fr-FR')} kg`; }
        } } : {}
      },
      scales: {
        x: dayMode
          ? { ticks: { color: onHero, font: { size: 10 }, maxRotation: 0, minRotation: 0, autoSkip: false, padding: 4.5,
                callback: (v, i) => (i % 7 === 0 ? formatDate(labels[i]) : '') },
              grid: { display: true, color: c => (c.index % 7 === 0 ? 'rgba(255, 255, 255, 0.16)' : 'transparent'),
                      drawTicks: true, tickLength: 5, tickColor: c => (c.index % 7 === 0 ? 'rgba(255, 255, 255, 0.7)' : 'rgba(255, 255, 255, 0.35)') }, border: { display: false } }
          : { ticks: { color: onHero, font: { size: 10 }, maxTicksLimit: 6, maxRotation: 0, minRotation: 0, autoSkip: true }, grid: { display: false }, border: { display: false } },
        y: { ticks: { color: onHero, maxTicksLimit: 5, display: !dayMode }, grid: { color: 'rgba(255, 255, 255, 0.15)' }, border: { display: false } }
      }
    }
  });
  renderFixedYAxis(dayMode ? tonnageChart : null);
  // vue par jour : on arrive sur les séances les plus récentes, on remonte le temps en défilant vers la gauche
  if (dayMode && wrap) wrap.scrollLeft = wrap.scrollWidth;
}

// 1RM estimé d'une séance (formule d'Epley) : meilleure série faite en 10 répétitions ou moins ; null si aucune
function estimateOneRepMax(sets) {
  let best = null;
  (sets || []).forEach(s => {
    const w = parseFloat(s.weight) || 0, r = Math.round(parseFloat(s.reps) || 0);
    if (w <= 0 || r < 1 || r > 10) return;
    const rm = r === 1 ? w : w * (1 + r / 30);
    if (best === null || rm > best) best = rm;
  });
  return best === null ? null : Math.round(best * 2) / 2;
}

// Exercice au poids du corps : meilleure série d'une séance = plus fort lest, puis le plus de répétitions à ce lest.
// Une ancienne série sans « lest » (charge totale saisie) compte comme poids du corps seul (lest 0).
function bestBodyweightSet(sets) {
  let best = null;
  (sets || []).forEach(s => {
    const reps = Math.round(parseFloat(s.reps) || 0);
    if (reps <= 0) return;
    const lest = s.lest !== undefined ? (parseFloat(s.lest) || 0) : 0;
    if (!best || lest > best.lest || (lest === best.lest && reps > best.reps)) best = { lest, reps };
  });
  return best;
}

function repsText(n) { return `${n} rép.`; }

function formatKgHalf(v) {
  return (Math.round((Number(v) || 0) * 2) / 2).toLocaleString('fr-FR') + ' kg';
}

function renderExerciseChart() {
  const canvas = document.getElementById('exerciseChart');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  if (exerciseChart) exerciseChart.destroy();

  const selectEl = document.getElementById('exercise-filter');
  const selectedEx = selectEl ? selectEl.value : '';
  const isSelected = name => canonicalExerciseName(name) === selectedEx;
  let labels = [];
  let chartData = [];
  let dates = [];
  // 1.7.34 : 1RM estimé (Epley : charge × (1 + reps / 30)), meilleure série de 10 répétitions ou moins de la séance ;
  // seulement en « Charge max » et pour les exercices saisis en kg × répétitions
  const showRm = currentExMetricMode !== 'volume' && exInfo(selectedEx).mode === 'weight';
  const rmData = [];
  // 1.7.35 : exercice au poids du corps → « Répétitions » (meilleure série de la séance) au lieu d'une charge plate
  const isBw = exInfo(selectedEx).mode === 'bw';
  const repsMode = isBw && currentExMetricMode !== 'volume';
  const lestData = [];
  const maxBtn = document.getElementById('btn-mode-max');
  if (maxBtn) maxBtn.textContent = isBw ? 'Répétitions' : 'Charge max';

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
        } else if (repsMode) {
          const best = bestBodyweightSet(performedSets || []);
          chartData.push(best ? best.reps : 0);
          lestData.push(best ? best.lest : 0);
        } else {
          // Charge max calculée sur les séries réellement faites uniquement
          chartData.push(performedSets
            ? Math.max(...performedSets.map(s => parseFloat(s.weight) || 0))
            : (exData.maxWeight || 0));
          if (showRm) rmData.push(estimateOneRepMax(performedSets));
        }
      }
    }
  });

  // Bande ambre : séances du palier en cours pour cet exercice (règle des 4 dernières séances)
  let plateauStart = -1;
  try {
    const plateau = analyzeMonthlyProgress(state.history).plateaus.find(p => isSelected(p.exercise));
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

  const hasRm = showRm && rmData.some(v => v !== null);
  const hasReps = repsMode && chartData.length > 0;
  const legend = document.getElementById('exercise-legend');
  const rmNote = document.getElementById('exercise-rm-note');
  const bwNote = document.getElementById('exercise-bw-note');
  if (legend) {
    legend.hidden = !(hasRm || hasReps);
    legend.classList.toggle('reps', hasReps);
    if (hasRm) {
      const lastRm = [...rmData].reverse().find(v => v !== null);
      document.getElementById('exercise-legend-max-label').textContent = 'Charge max';
      document.getElementById('exercise-legend-rm-label').textContent = '1RM estimé';
      document.getElementById('exercise-legend-max').textContent = formatKgHalf(chartData[chartData.length - 1]);
      document.getElementById('exercise-legend-rm').textContent = formatKgHalf(lastRm);
    } else if (hasReps) {
      document.getElementById('exercise-legend-max-label').textContent = 'Meilleure série';
      document.getElementById('exercise-legend-rm-label').textContent = 'Record';
      document.getElementById('exercise-legend-max').textContent = repsText(chartData[chartData.length - 1]);
      document.getElementById('exercise-legend-rm').textContent = repsText(Math.max(...chartData));
    }
  }
  if (rmNote) rmNote.hidden = !hasRm;
  if (bwNote) bwNote.hidden = !hasReps;

  const labelTitle = currentExMetricMode === 'volume' ? 'Volume Cumulé (kg)' : (repsMode ? 'Répétitions' : 'Charge Max (kg)');
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
      }].concat(hasRm ? [{
        label: '1RM estimé (kg)',
        data: rmData,
        borderColor: color,
        borderDash: [5, 5],
        borderWidth: 2,
        fill: false,
        tension: 0.2,
        pointRadius: 0,
        pointHitRadius: 8,
        spanGaps: true
      }] : [])
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        // Poids du corps : « 12 rép. », et le lest quand il y en a un (« 12 rép. · PDC +5 kg »)
        tooltip: repsMode ? { callbacks: { label: c => repsText(c.parsed.y) + (lestData[c.dataIndex] ? ' · ' + lestText(lestData[c.dataIndex]) : '') } } : {}
      },
      scales: {
        x: { ticks: { color: CHART_COLORS.tick, font: { size: 10 }, maxTicksLimit: 6, maxRotation: 0, minRotation: 0, autoSkip: true }, grid: { display: false } },
        y: { beginAtZero: repsMode, ticks: { color: CHART_COLORS.tick, maxTicksLimit: 5, precision: repsMode ? 0 : undefined }, grid: { color: CHART_COLORS.grid }, border: { display: false } }
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

// Suivi cardio : exercices cardio du périmètre choisi (menu), valeur selon l'appareil (allure, vitesse, rythme)
function statsCardioNames(scope = currentStatsScope()) {
  const names = [];
  const add = n => { n = canonicalExerciseName(n); const e = exInfo(n); if (e.cardio && cardioUnit(n) && !names.includes(n)) names.push(n); };
  const progs = scope === 'all' ? getPrograms() : [getProgram(scope)].filter(Boolean);
  progs.forEach(p => p.sessions.forEach(s => (s.exercises || []).forEach(e => add(exInfo(e.exId).name))));
  statsHistory(scope).forEach(h => (h.exercises || []).forEach(ex => add(ex.name)));
  return names;
}

function renderCardioChart() {
  const canvas = document.getElementById('cardioChart');
  if (!canvas) return;
  if (cardioChart) { cardioChart.destroy(); cardioChart = null; }
  const card = document.getElementById('cardio-card');
  const select = document.getElementById('cardio-filter');
  const names = statsCardioNames();
  if (card) card.hidden = names.length === 0;
  if (!names.length) return;
  if (select) {
    const prev = select.value;
    select.innerHTML = names.map(n => `<option value="${escapeHtml(n)}">${escapeHtml(n)} · ${cardioUnit(n).suffix}</option>`).join('');
    select.value = names.includes(prev) ? prev : names[0];
    select.hidden = names.length < 2;
  }
  const name = select && select.value ? select.value : names[0];
  const unit = cardioUnit(name);
  const points = [];
  statsHistory().forEach(h => {
    const ex = (h.exercises || []).find(e => sameExercise(e.name, name));
    const set = ex && Array.isArray(ex.sets) ? ex.sets.find(isPerformedCardioSet) : null;
    if (set && h.date) points.push({ date: h.date, v: cardioMetric(name, set) });
  });
  points.sort((a, b) => new Date(a.date) - new Date(b.date));
  const empty = document.getElementById('cardio-empty');
  if (empty) {
    empty.hidden = points.length > 0;
    empty.textContent = `Pas encore de séance avec « ${name} ». ${unit.label === 'Allure' ? `L'allure ${unit.suffix} s'affichera ici (plus bas = plus rapide).` : `${unit.label === 'Vitesse' ? 'La vitesse' : 'Le rythme'} (${unit.suffix}) s'affichera ici.`}`;
  }
  canvas.hidden = points.length === 0;
  const cur = document.getElementById('cardio-current');
  if (cur) cur.textContent = points.length ? unit.fmt(points[points.length - 1].v) : '–';
  const unitEl = document.getElementById('cardio-unit');
  if (unitEl) unitEl.textContent = `${unit.suffix} · ${name}`;
  if (!points.length) return;
  cardioChart = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: {
      labels: points.map(p => formatDate(p.date)),
      datasets: [{
        label: `${unit.label} (${unit.suffix})`,
        data: points.map(p => Math.round(p.v * 10) / 10),
        borderColor: CHART_COLORS.success,
        backgroundColor: CHART_COLORS.success + '22',
        borderWidth: 2.5, pointRadius: 3, fill: true, tension: 0.2
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => `${unit.fmt(c.parsed.y)} ${unit.suffix}` } } },
      scales: {
        x: { ticks: { color: CHART_COLORS.tick, maxTicksLimit: 6, maxRotation: 0, minRotation: 0, autoSkip: true }, grid: { display: false } },
        y: { ticks: { color: CHART_COLORS.tick, maxTicksLimit: 5, callback: v => unit.fmt(v) }, grid: { color: CHART_COLORS.grid }, border: { display: false } }
      }
    }
  });
}

function renderCharts() {
  renderStatsScopeButton();
  updateSessionTypeButton();
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
// hist : séances du périmètre choisi (par défaut celui de l'onglet Progression) ; scope : son identifiant
function analyzeMonthlyProgress(hist = statsHistory(), scope = currentStatsScope()) {
  if (!hist || hist.length === 0) {
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

  hist.forEach(session => {
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
        sessionTypes: {}
      };
    }
    monthlyData[monthKey].totalTonnage += parseFloat(session.tonnage) || 0;
    monthlyData[monthKey].sessionCount++;
    monthlyData[monthKey].sessions.push(session);
    const sKey = session.sessionKey || session.type;
    if (session.kind !== 'libre' && SESSION_KEYS.includes(sKey)) {
      monthlyData[monthKey].sessionTypes[sKey] = (monthlyData[monthKey].sessionTypes[sKey] || 0) + 1;
    }

    if (session.exercises) {
      session.exercises.forEach(ex => {
        const exName = ex.name ? canonicalExerciseName(ex.name) : '';
        if (exName) {
          allExercises.add(exName);
          if (!monthlyData[monthKey].exercises[exName]) {
            monthlyData[monthKey].exercises[exName] = { maxWeights: [], volumes: [], bwBest: [] };
          }
          // 1.7.35 : poids du corps → meilleure série (lest puis répétitions) pour les records
          if (exInfo(exName).mode === 'bw' && Array.isArray(ex.sets)) {
            const b = bestBodyweightSet(ex.sets.filter(isPerformedSet));
            if (b) monthlyData[monthKey].exercises[exName].bwBest.push(b);
          }
          if (ex.maxWeight) {
            monthlyData[monthKey].exercises[exName].maxWeights.push(parseFloat(ex.maxWeight) || 0);
          }
          if (ex.totalVolume) {
            monthlyData[monthKey].exercises[exName].volumes.push(parseFloat(ex.totalVolume) || 0);
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
      sessionTypes: {}
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
    const betterBw = (x, y) => !y || x.lest > y.lest || (x.lest === y.lest && x.reps > y.reps);
    allExercises.forEach(exName => {
      const thisEx = thisMonthData.exercises[exName];
      // Poids du corps : record si la meilleure série du mois bat celle d'avant (plus de lest, ou plus de répétitions au même lest)
      if (thisEx && exInfo(exName).mode === 'bw' && thisEx.bwBest && thisEx.bwBest.length) {
        const cur = thisEx.bwBest.reduce((m, b) => (betterBw(b, m) ? b : m), null);
        let prev = null;
        earlierMonths.forEach(key => {
          const p = monthlyData[key].exercises[exName];
          if (p && p.bwBest) p.bwBest.forEach(b => { if (betterBw(b, prev)) prev = b; });
        });
        if (prev && betterBw(cur, prev)) {
          const byLest = cur.lest > prev.lest;
          currentMonthRecords.push({
            exercise: exName,
            newMax: byLest ? cur.lest : cur.reps,
            improvement: byLest ? cur.lest - prev.lest : cur.reps - prev.reps,
            valueText: byLest ? lestText(cur.lest) : repsText(cur.reps),
            improvementText: byLest ? `+${String(cur.lest - prev.lest).replace('.', ',')} kg` : `+${cur.reps - prev.reps} rép.`
          });
        }
        return;
      }
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

  hist
    .filter(session => session.date && session.exercises)
    .slice()
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : (a.id || 0) - (b.id || 0)))
    .forEach(session => {
      const perExercise = {};
      session.exercises.forEach(ex => {
        const maxWeight = parseFloat(ex.maxWeight) || 0;
        const exName = ex.name ? canonicalExerciseName(ex.name) : '';
        if (!exName || maxWeight <= 0) return; // exercice non réalisé
        if (!perExercise[exName]) {
          perExercise[exName] = { date: session.date, maxWeight: 0, totalVolume: 0 };
        }
        perExercise[exName].maxWeight = Math.max(perExercise[exName].maxWeight, maxWeight);
        perExercise[exName].totalVolume += parseFloat(ex.totalVolume) || 0;
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

  // 5b. Progression par séance (A, B…) sur l'ensemble de l'historique de l'élément, sans tenir compte des mois :
  // médiane du tonnage des (jusqu'à) 3 dernières séances vs les 3 premières, séances de décharge exclues.
  // Séance libre : sur ses propres occurrences. « Tous » : une ligne par programme, l'indice est la moyenne des programmes.
  const median = values => {
    const sorted = values.slice().sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  };
  const progressOf = sessions => {
    const tonnages = sessions
      .filter(session => session.date && !session.isDeload && (parseFloat(session.tonnage) || 0) > 0)
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : (a.id || 0) - (b.id || 0)))
      .map(session => parseFloat(session.tonnage));
    let percent = null;
    if (tonnages.length >= 2) {
      const n = Math.min(3, Math.floor(tonnages.length / 2));
      const first = median(tonnages.slice(0, n));
      const last = median(tonnages.slice(-n));
      if (first > 0) percent = Math.round(((last - first) / first) * 100);
    }
    return { percent, sessions: tonnages.length };
  };
  const average = list => (list.length ? Math.round(list.reduce((sum, v) => sum + v, 0) / list.length) : null);
  // Indice d'un programme (moyenne de ses séances) ou d'une séance libre (ses occurrences)
  const programIndex = (sessions, libre) => {
    if (libre) return progressOf(sessions).percent;
    const keys = SESSION_KEYS.filter(k => sessions.some(x => (x.sessionKey || x.type) === k));
    return average(keys.map(k => progressOf(sessions.filter(x => (x.sessionKey || x.type) === k)).percent).filter(v => v !== null));
  };

  const sessionProgress = {};
  const programProgress = [];
  let globalProgressIndex = null;
  if (scope === 'all') {
    const ids = [];
    hist.forEach(h => { if (h.programId && !ids.includes(h.programId)) ids.push(h.programId); });
    ids.forEach(id => {
      const sessions = hist.filter(h => h.programId === id);
      const libre = sessions[0] && sessions[0].kind === 'libre';
      const p = getProgram(id);
      programProgress.push({ id, name: p ? p.name : (sessions[sessions.length - 1].programName || 'Programme'), libre, percent: programIndex(sessions, libre) });
    });
    globalProgressIndex = average(programProgress.filter(x => !x.libre && x.percent !== null).map(x => x.percent));
  } else if (statsScopeIsLibre(scope)) {
    globalProgressIndex = programIndex(hist, true);
  } else {
    statsLetters(scope).forEach(k => { sessionProgress[k] = progressOf(hist.filter(x => (x.sessionKey || x.type) === k)); });
    globalProgressIndex = average(Object.values(sessionProgress).map(x => x.percent).filter(v => v !== null));
  }

  const overallStats = {
    lastVsPreviousDiffPercent: lastVsPreviousDiffPercent,
    globalProgressIndex: globalProgressIndex,
    sessionProgress: sessionProgress,
    programProgress: programProgress
  };

  // 6. Conseils personnalisés
  const advice = [];

  // Détecter un déséquilibre entre les séances du programme (A, B…)
  const letters = scope === 'all' ? [] : statsLetters(scope);
  if (letters.length >= 2 && currentMonthData) {
    const counts = letters.map(k => currentMonthData.sessionTypes[k] || 0);
    const totalSessions = counts.reduce((a, b) => a + b, 0);
    if (totalSessions >= letters.length) {
      const avg = totalSessions / letters.length;
      const maxType = Math.max(...counts);
      if (maxType > avg * 1.5) {
        const maxTypeName = letters[counts.indexOf(maxType)];
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
        <p class="analysis-empty-hint">Enregistre des séances pour voir ta progression !</p>
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
    // 1.7.50 : un mois terminé avec des séances ouvre son bilan
    const monthKey = month.year + '-' + String(month.month).padStart(2, '0');
    const link = !isCurrentMonth && month.sessionCount > 0;
    html += `
      <div${link ? ` class="bar-row-link" role="button" tabindex="0" onclick="openBilan('${monthKey}', false)" onkeydown="if(event.key==='Enter')openBilan('${monthKey}', false)" aria-label="Bilan ${bilanDeMois(monthKey)} ${month.year}"` : ''}>
        <div class="bar-row-head">
          <span><span class="bar-label">${monthLabel}</span> <span class="bar-meta">· ${month.sessionCount} séance${month.sessionCount > 1 ? 's' : ''}</span></span>
          <span class="bar-value">${tonnageInTonnes} T${link ? `<span class="bar-chevron">${BILAN_CHEVRON}</span>` : ''}</span>
        </div>
        <div class="bar-track"><div class="bar-fill${isCurrentMonth ? ' current' : ''}" style="width:${width}%"></div></div>
      </div>`;
  });
  html += `</div>`;
  if (bilanDoneKeys(true).length) html += `<div class="bilan-all"><button type="button" class="link-btn" onclick="openAllBilans()">Tous les bilans</button></div>`; // 1.7.50
  html += `</div>`;

  // 2. Records battus ce mois-ci
  if (analysis.currentMonthRecords.length > 0) {
    html += `<div class="card"><h3 class="analysis-section-title">Records battus ce mois-ci</h3><div class="records-list">`;
    analysis.currentMonthRecords.forEach(record => {
      html += `
        <div class="record-item">
          <span class="record-exercise">${record.exercise}</span>
          <span class="record-value">${record.valueText || record.newMax + ' kg'}</span>
          <span class="record-improvement">${record.improvementText || '+' + record.improvement + ' kg'}</span>
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
          <span class="plateau-text">
            <span class="plateau-exercise">${plateau.exercise}</span>
            <span class="plateau-duration">sans progression depuis ${plateau.sessionsCount} séance${plateau.sessionsCount > 1 ? 's' : ''}</span>
          </span>
          <span class="plateau-value">${plateau.currentMax} kg</span>
        </div>`;
    });
    html += `</div>`;
  } else {
    html += `<p class="analysis-none">Aucun palier détecté</p>`;
  }
  html += `</div>`;

  // 4. Progression par séance (A, B…) du programme, ou par programme pour « Tous »
  if (stats) {
    const rows = [];
    if (stats.programProgress && stats.programProgress.length) {
      stats.programProgress.filter(x => x.percent !== null).forEach(x => rows.push({ pill: x.libre ? '<span class="type-pill type-pill-libre small">1×</span>' : `<span class="mem-ico small">${SWAP_SVG}</span>`, label: x.name, cls: 'neutral', percent: x.percent }));
    } else {
      Object.keys(stats.sessionProgress).filter(t => stats.sessionProgress[t].percent !== null && stats.sessionProgress[t].percent !== undefined)
        .forEach(t => rows.push({ pill: `<span class="type-pill type-pill-${t} small">${t}</span>`, cls: `type-${t}`, percent: stats.sessionProgress[t].percent }));
    }
    if (rows.length > 0) {
      const byProgram = !!(stats.programProgress && stats.programProgress.length);
      const maxAbs = Math.max(...rows.map(r => Math.abs(r.percent)), 1);
      html += `<div class="card"><h3 class="analysis-section-title">${byProgram ? 'Progression par programme' : 'Progression par séance'}</h3>`;
      rows.forEach(r => {
        const cls = r.percent >= 0 ? 'positive' : 'negative';
        const symbol = r.percent >= 0 ? '\u25b2' : '\u25bc';
        const width = Math.max(3, Math.round((Math.abs(r.percent) / maxAbs) * 100));
        html += `
          <div class="progress-row${r.label ? ' named' : ''}">
            ${r.pill}
            ${r.label ? `<span class="progress-name">${escapeHtml(r.label)}</span>` : ''}
            <div class="bar-track"><div class="bar-fill ${r.cls}" style="width:${width}%"></div></div>
            <span class="stat-value ${cls}">${symbol} ${Math.abs(r.percent)} %</span>
          </div>`;
      });
      html += `<p class="analysis-note">${byProgram
        ? 'Indice de chaque programme ou séance libre sur tout son historique. L\'indice global est la moyenne des programmes.'
        : 'Tonnage médian des 3 dernières séances vs les 3 premières, sur tout l\'historique (sans tenir compte des mois). L\'indice est la moyenne des séances du programme.'}</p></div>`;
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
  const targetNav = document.getElementById(`nav-${(tabName === 'reglages' || tabName === 'fond') ? 'historique' : tabName}`);
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
  const settingsBtn = document.getElementById('settings-btn');
  if (settingsBtn) settingsBtn.style.display = tabName === 'historique' ? 'flex' : 'none';
  const settingsBack = document.getElementById('settings-back');
  if (settingsBack) settingsBack.style.display = tabName === 'reglages' ? 'flex' : 'none';
  updateStickyOffsets();
  const pageTitle = document.getElementById('page-title');
  if (pageTitle) pageTitle.innerText = PAGE_TITLES[tabName] || '';
  if (tabName === 'seance') updateSeancePageTitle();

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

// Statut Drive sur plusieurs lignes (texte seul, séparé par des retours à la ligne <br>).
function setDriveStatusLines(el, lines, live = false) {
  el.textContent = '';
  lines.forEach((t, i) => {
    if (i) el.appendChild(document.createElement('br'));
    if (i === 0 && live) {
      const head = document.createElement('span');
      head.className = 'drive-live';
      const dot = document.createElement('span');
      dot.className = 'prog-dot on';
      dot.setAttribute('aria-hidden', 'true');
      head.appendChild(dot);
      head.appendChild(document.createTextNode(t));
      el.appendChild(head);
    } else el.appendChild(document.createTextNode(t));
  });
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
  // « Restaurer » n'apparaît dans les Réglages qu'en cas de conflit ; sinon on restaure depuis l'Historique
  // (bouton « Restaurer » : fenêtre « Restaurer une sauvegarde », Drive ou fichier).
  if (restoreBtn) restoreBtn.style.display = isDriveConnected() && conflict ? '' : 'none';
  if (!(isDriveConnected() || isDriveWanted())) hideDriveBackupList();
  if (replaceBtn) replaceBtn.style.display = 'none';
  if (isDriveConnected() && conflict) {
    // Une sauvegarde existe déjà sur le Drive et contient des séances que cet appareil n'a pas : on ne l'écrase pas.
    const empty = isDeviceEmpty();
    const detail = '(' + (conflict.sessions != null ? conflict.sessions + ' séances, ' : '') + 'modifiée le ' + (formatDriveDate(conflict.modified) || 'date inconnue') + ')';
    statusEl.textContent = (account ? 'Compte ' + account.email + ' : ' : '')
      + (empty ? 'cet appareil ne contient aucune séance, alors que ta sauvegarde Drive en contient ' + detail + ' : l\'envoi est suspendu pour ne rien effacer. '
               + 'Touche « Restaurer » pour les récupérer, ou « Effacer la sauvegarde Drive » pour la vider définitivement.'
               : 'une sauvegarde plus complète existe déjà sur ton Drive ' + detail + ' : l\'envoi est suspendu pour ne rien écraser. '
               + 'Touche « Restaurer » pour la récupérer, ou « Remplacer par cet appareil » pour la remplacer.');
    if (replaceBtn) { replaceBtn.textContent = empty ? 'Effacer définitivement la sauvegarde Drive' : 'Remplacer par cet appareil'; replaceBtn.classList.toggle('btn-danger-text', empty); }
    refreshDriveConflictDate();
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
    // Une information par ligne : état (avec la date de la dernière sauvegarde), compte.
    // 1.7.7 : « Sauvegarde automatique : date et heure » sur la première ligne, le compte dessous.
    let head = 'Sauvegarde automatique';
    if (driveSyncing) head += ' : envoi en cours…';
    else if (driveNeedsBackup()) head += ' : modifications en attente d\'envoi';
    else if (last && formatDriveDate(last)) head += ' : ' + formatDriveDate(last);
    const lines = [head];
    if (account) lines.push(account.email);
    else if (driveAccountError) lines.push('Adresse du compte indisponible (' + driveAccountError + ')');
    setDriveStatusLines(statusEl, lines, true);
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
        appAlert('Connexion annulée', 'La connexion à Google Drive a été annulée ou a échoué.', 'cloud');
        return;
      }
      setDriveToken(resp);
      driveFullConnectNext = false;
      localStorage.setItem(DRIVE_WANTED_KEY, '1');
      updateDriveUI();
      if (!getDriveAccount()) fetchDriveAccount();
      probeDriveAccess();
      if (driveRenewPending) { driveRenewPending.finish(true); return; } // l'appelant envoie lui-même la file d'attente
      // accès obtenu : crée le dossier et envoie la sauvegarde complète si besoin
      syncDriveBackup();
      resumeProgramRestoreIfPending();
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
  catch (e) { appAlert('Connexion impossible', "Le stockage de l'appareil est indisponible.", 'warn'); return; }
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
  openGoogleAuth('https://accounts.google.com/o/oauth2/v2/auth?' + p.toString());
}

// Application installée sur Android : la page de connexion Google ouverte depuis l'application plein écran
// (onglet intégré) reste blanche. On l'ouvre donc dans le vrai Chrome (intent), qui renvoie vers l'application ;
// le jeton est mémorisé dans le stockage partagé et repris au retour dans l'application (voir storage / visibilitychange).
function isAndroid() { return /Android/i.test(navigator.userAgent || ''); }
function chromeIntentUrl(url) {
  return 'intent://' + url.replace(/^https:\/\//, '').split('#')[0]
    + '#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=' + encodeURIComponent(url) + ';end';
}
// L'application installée partage son stockage avec le navigateur qui l'a installée, et SEULEMENT avec lui :
// le jeton doit donc être obtenu dans ce même navigateur (1.6.34, co-auteur : Claude). Chrome : intent vers le vrai
// Chrome (inchangé). Firefox et les autres navigateurs : nouvel onglet de ce navigateur (un jeton obtenu dans Chrome
// resterait invisible pour une application installée avec Firefox).
function isChromeAndroid() {
  const ua = navigator.userAgent || '';
  return isAndroid() && /Chrome\//.test(ua) && !/SamsungBrowser|EdgA|OPR\/|YaBrowser|Firefox|; wv\)/.test(ua);
}
function openGoogleAuth(url) {
  if (!isInstalledApp() || !isAndroid()) { navigateTo(url); return; }
  if (isChromeAndroid()) { navigateTo(chromeIntentUrl(url)); return; }
  if (!openBrowserTab(url)) {
    // ouverture refusée (fenêtres bloquées, ex. reconnexion automatique sans appui) : rien n'est perdu
    showToast('Connexion Google non ouverte : touche « Reconnecter maintenant » dans Réglages.', 6000);
    updateDriveUI();
  }
}
function navigateTo(url) { location.assign(url); }
function openBrowserTab(url) {
  try {
    const w = window.open(url, '_blank');
    if (!w) return false;
    try { w.opener = null; } catch (e) { /* ignoré */ }
    return true;
  } catch (e) { return false; }
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
    // Retour dans un onglet Chrome (et non dans l'application plein écran) : on l'indique, l'application reprendra le jeton.
    if (!isInstalledApp()) setTimeout(() => showToast('Connexion à Google Drive réussie ✅\nTu peux fermer cet onglet et revenir à l\'application plein écran.', 15000), 1200);
    return 'ok';
  } catch (e) { return null; }
}

// Application installée : même enchaînement que la reconnexion automatique après l'enregistrement d'une séance
// (connexion par redirection lancée ~0,4 s après l'appui), le seul qui reste dans l'application avec Firefox (1.7.4) :
// lancée directement depuis l'appui, la page Google s'ouvrait dans un onglet Firefox séparé et l'application ne
// récupérait pas l'accès.
const DRIVE_CONNECT_DELAY_MS = 400;
let driveFullConnectNext = false; // 1.7.39 : renouvellement silencieux déjà tenté sans succès
function connectGoogleDrive() {
  if (isInstalledApp()) { setTimeout(connectDriveByRedirect, DRIVE_CONNECT_DELAY_MS); return; }
  initDriveTokenClient();
  if (!driveTokenClient) {
    appAlert('Google indisponible', 'La bibliothèque Google ne s\'est pas chargée. Vérifie ta connexion et réessaie.', 'cloud');
    return;
  }
  // 1.7.39 (co-auteur : Claude) : RECONNEXION (Drive déjà autorisé, accès expiré) = même mécanisme que
  // « Enregistrer la séance » : renouvellement silencieux (prompt '' + adresse connue). Avant, le bouton forçait
  // « prompt: 'consent' » : Google redemandait les autorisations dans un onglet Firefox qui finissait sur une
  // page blanche (Firefox ne se déclare pas toujours comme application installée). Si le renouvellement
  // silencieux échoue, l'appui suivant ouvre la connexion complète.
  const t = getDriveToken();
  if (!t && isDriveWanted() && !driveFullConnectNext) {
    renewDriveToken().then((ok) => {
      if (ok) {
        syncDriveBackup().then(updateDriveUI, updateDriveUI);
        resumeProgramRestoreIfPending();
        return;
      }
      driveFullConnectNext = true;
      updateDriveUI();
      showToast('Reconnexion automatique impossible : touche à nouveau « Reconnecter maintenant ».', 6000);
    });
    return;
  }
  driveFullConnectNext = false;
  // première connexion (ou échec du renouvellement silencieux) : écran d'autorisation Google
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

// Renomme le dossier de l'application en « MON CARNET DE SALLE » (une fois par dossier et par appareil).
// Jamais bloquant : en cas d'échec, les sauvegardes continuent dans le dossier tel qu'il est.
async function renameDriveFolderIfNeeded(accessToken, folderId, currentName) {
  try {
    if (!folderId || currentName === DRIVE_FOLDER_NAME || localStorage.getItem(DRIVE_FOLDER_RENAMED_KEY) === folderId) return;
    const res = await fetch('https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(folderId) + '?fields=id,name', {
      method: 'PATCH',
      headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: DRIVE_FOLDER_NAME })
    });
    if (res.ok) localStorage.setItem(DRIVE_FOLDER_RENAMED_KEY, folderId);
    else console.warn('Drive : renommage du dossier impossible', res.status);
  } catch (e) { console.warn('Drive : renommage du dossier impossible', e); }
}

async function ensureDriveFolderOnce(accessToken) {
  let folderId = localStorage.getItem(DRIVE_FOLDER_ID_KEY);
  if (folderId) { await renameDriveFolderIfNeeded(accessToken, folderId); return folderId; }

  // Search existing folder (nouveau nom ou ancien nom)
  const names = [DRIVE_FOLDER_NAME].concat(DRIVE_FOLDER_LEGACY_NAMES).map(n => `name='${n}'`).join(' or ');
  const q = encodeURIComponent(`(${names}) and mimeType='application/vnd.google-apps.folder' and trashed=false`);
  const search = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`, {
    headers: { Authorization: 'Bearer ' + accessToken }
  });
  if (!search.ok) throw await driveFolderError('Recherche dossier Drive échouée', search);
  const data = await search.json();
  clearDriveError(); // Google a répondu : l'accès au dossier fonctionne
  if (data.files && data.files.length > 0) {
    const found = data.files.find(f => f.name === DRIVE_FOLDER_NAME) || data.files[0];
    folderId = found.id;
    localStorage.setItem(DRIVE_FOLDER_ID_KEY, folderId);
    await renameDriveFolderIfNeeded(accessToken, folderId, found.name);
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
  localStorage.setItem(DRIVE_FOLDER_RENAMED_KEY, folderId);
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

// Versions (1.6.33) : le contenu et le format JSON ne changent pas ; seul le stockage change. Chaque envoi crée un
// nouveau fichier horodaté, puis seuls les DRIVE_BACKUP_KEEP plus récents sont gardés (l'ancien fichier unique
// « sauvegarde_complete.json » compte comme une version tant qu'il fait partie des plus récentes).

// Nom d'une nouvelle sauvegarde : fitness-backup-AAAA-MM-JJ-HH-MM-SS.json (heure de l'appareil).
function driveBackupFileName(date) {
  const d = date || new Date();
  const p = (n) => String(n).padStart(2, '0');
  return DRIVE_BACKUP_PREFIX + d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
    + '-' + p(d.getHours()) + '-' + p(d.getMinutes()) + '-' + p(d.getSeconds()) + '.json';
}

function isDriveBackupName(name) {
  return typeof name === 'string' && (name === DRIVE_BACKUP_NAME || DRIVE_BACKUP_NAME_RE.test(name));
}

// Toutes les sauvegardes du dossier, de la plus récente à la plus ancienne : [{ id, name, modifiedTime }].
// quiet : en cas d'échec, ne pas afficher d'erreur dans Réglages (nettoyage des anciennes versions).
async function listDriveBackups(accessToken, folderId, quiet) {
  const q = encodeURIComponent(`'${folderId}' in parents and trashed=false and (name contains '${DRIVE_BACKUP_PREFIX}' or name='${DRIVE_BACKUP_NAME}')`);
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,modifiedTime)&orderBy=modifiedTime%20desc&pageSize=100`, {
    headers: { Authorization: 'Bearer ' + accessToken }
  });
  if (!res.ok) {
    if (quiet) throw new Error('Recherche des sauvegardes Drive échouée (' + res.status + ')');
    throw await driveFolderError('Recherche de la sauvegarde Drive échouée', res);
  }
  const files = ((await res.json()).files || []).filter(f => f && typeof f.id === 'string' && isDriveBackupName(f.name));
  const time = (f) => { const t = new Date(f.modifiedTime || 0).getTime(); return isNaN(t) ? 0 : t; };
  return files.sort((a, b) => time(b) - time(a) || String(b.name).localeCompare(String(a.name)));
}

// Sauvegarde la plus récente du dossier ; null s'il n'y en a aucune.
async function findDriveBackup(accessToken, folderId) {
  return (await listDriveBackups(accessToken, folderId))[0] || null;
}

// Après un envoi réussi : met à la corbeille les sauvegardes au-delà des DRIVE_BACKUP_KEEP plus récentes.
// Un échec (liste ou suppression) est seulement noté dans la console : la sauvegarde principale reste réussie.
async function pruneDriveBackups(accessToken, folderId) {
  let files;
  try { files = await listDriveBackups(accessToken, folderId, true); }
  catch (e) { console.warn('Drive : liste des anciennes sauvegardes impossible', e); return; }
  for (const f of files.slice(DRIVE_BACKUP_KEEP)) {
    try {
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(f.id)}?fields=id`, {
        method: 'PATCH',
        headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ trashed: true })
      });
      if (!res.ok) console.warn('Drive : suppression de l\'ancienne sauvegarde ' + f.name + ' échouée (' + res.status + ')');
    } catch (e) {
      console.warn('Drive : suppression de l\'ancienne sauvegarde ' + f.name + ' échouée', e);
    }
  }
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

// Écrit la sauvegarde dans un NOUVEAU fichier horodaté (jamais d'écrasement) ; renvoie la réponse de Google.
async function writeDriveBackup(accessToken, folderId, payload) {
  const metadata = { name: driveBackupFileName(), parents: [folderId], mimeType: 'application/json' };
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
let driveForceOverwrite = false; // « Remplacer la sauvegarde Drive » : contourne la protection contre l'écrasement par des données vides
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
    } else if (!driveForceOverwrite && state && Array.isArray(state.history) && state.history.length === 0) {
      // Protection : cet appareil n'a plus aucune séance (réinitialisation, données effacées). On n'envoie pas une
      // sauvegarde vide par-dessus la plus récente du Drive si elle en contient : l'utilisateur choisit de la
      // restaurer ou de la remplacer (sinon quelques envois vides chasseraient les bonnes versions).
      let latest = null;
      try { latest = await findDriveBackup(token.access_token, folderId); } catch (e) { latest = null; }
      const remote = latest ? await downloadDriveBackup(token.access_token, latest.id) : { ok: false };
      if (remote.ok && !driveRemoteIsContainedInLocal(remote.data)) {
        const n = remote.data && Array.isArray(remote.data.history) ? remote.data.history.length : null;
        setDriveConflict({ id: latest.id, modified: latest.modifiedTime || '', sessions: n });
        return { reason: 'conflict' };
      }
    }
    driveForceOverwrite = false;
    const res = await writeDriveBackup(token.access_token, folderId, payload);
    if (res.status === 401) { expireDriveToken(); return { reason: 'token' }; }
    if (!res.ok) { setDriveError(await driveErrorText(res)); return { reason: 'error' }; }
    clearDriveError();
    localStorage.setItem(DRIVE_LAST_HASH_KEY, driveHash(snapshot));
    localStorage.setItem(DRIVE_LAST_BACKUP_KEY, new Date().toISOString());
    try { localStorage.removeItem(DRIVE_DELETED_KEY); } catch (e) { /* ignoré */ }
    // Versions : ne garder que les plus récentes. Jamais bloquant : un échec est seulement noté dans la console.
    try { await pruneDriveBackups(token.access_token, folderId); } catch (e) { console.warn('Drive : nettoyage des anciennes sauvegardes impossible', e); }
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
function isDeviceEmpty() { return !!state && Array.isArray(state.history) && state.history.length === 0; }

// Conflit enregistré sans date (versions antérieures) : on la lit une fois sur le Drive.
let driveConflictDateAsked = false;
async function refreshDriveConflictDate() {
  const c = getDriveConflict(), token = getDriveToken();
  if (!c || c.modified || !token || driveConflictDateAsked) return;
  driveConflictDateAsked = true;
  try {
    const folderId = await ensureDriveFolder(token.access_token);
    const f = await findDriveBackup(token.access_token, folderId);
    if (f && f.modifiedTime && getDriveConflict()) { setDriveConflict({ ...getDriveConflict(), modified: f.modifiedTime }); updateDriveUI(); }
  } catch (e) { /* date facultative */ }
}

async function replaceDriveBackupWithThisDevice() {
  const c = getDriveConflict();
  if (!c) return;
  const when = formatDriveDate(c.modified) || 'date inconnue';
  const what = '(' + (c.sessions != null ? c.sessions + ' séances, ' : '') + 'modifiée le ' + when + ')';
  const ok = isDeviceEmpty()
    ? await askSheet({ tone: 'danger', danger: true, title: 'Effacer la sauvegarde Drive ?',
        text: 'La sauvegarde ' + what + ' sera vidée : cet appareil ne contient aucune séance. Ses séances seront perdues (irréversible depuis l\'application).', ok: 'Effacer', cancel: 'Annuler' })
    : await askSheet({ tone: 'danger', danger: true, title: 'Remplacer la sauvegarde Drive ?',
        text: 'La sauvegarde ' + what + ' sera remplacée par les données de cet appareil. Les séances qu\'elle seule contient seront perdues.', ok: 'Remplacer', cancel: 'Annuler' });
  if (!ok) return;
  setDriveBackupId(c.id);
  setDriveConflict(null);
  localStorage.removeItem(DRIVE_LAST_HASH_KEY);
  driveForceOverwrite = true;
  syncDriveBackup();
}

// Date et heure complètes d'une sauvegarde (liste de restauration) : « 07/11/2026 à 15:47:12 ».
function formatDriveBackupDate(iso) {
  try {
    const d = new Date(iso);
    if (!iso || isNaN(d.getTime())) return 'date inconnue';
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
      + ' à ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch (e) { return 'date inconnue'; }
}

// Fenêtre de restauration : « Aujourd'hui à 18:42:00 », « Hier à 19:15:00 », sinon « 05/11/2026 à 19:15:00 »
function formatBackupDayLabel(iso, now = new Date()) {
  const d = new Date(iso);
  if (!iso || isNaN(d.getTime())) return 'date inconnue';
  const dayKey = x => x.getFullYear() * 10000 + (x.getMonth() + 1) * 100 + x.getDate();
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  if (dayKey(d) === dayKey(now)) return "Aujourd'hui à " + time;
  if (dayKey(d) === dayKey(yesterday)) return 'Hier à ' + time;
  return formatDriveBackupDate(iso);
}

// --- Fenêtre « Restaurer une sauvegarde » (Historique, et Réglages en cas de conflit) ---------------------
// Les 5 dernières sauvegardes Google Drive (si connecté) et un fichier de cet appareil ; un seul choix.
// Rien n'est remplacé avant la confirmation de restoreDriveBackup / le choix du fichier.
let backupRestore = null; // { files: [...] | null (chargement), error, sel: index (0..n-1 Drive, -2 fichier, -1 rien) }

function hideDriveBackupList() {
  if (backupRestore) { backupRestore = null; closeSheet(); }
}

function backupRestoreRow(i, title, sub, drive) {
  const on = backupRestore.sel === i;
  const ico = drive ? CLOUD_SVG : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>';
  return `
    <button type="button" role="radio" aria-checked="${on}" class="restore-item backup-item${on ? ' on' : ''}${drive ? ' drive' : ' file'}" data-i="${i}" onclick="pickBackupRestore(${i})">
      <span class="mem-ico${drive ? '' : ' grid'}">${ico}</span>
      <span class="restore-text"><span class="restore-name"><b>${escapeHtml(title)}</b></span><span class="restore-when">${escapeHtml(sub)}</span></span>
      <span class="restore-box round">${on ? CHECK_SVG : ''}</span>
    </button>`;
}

function renderBackupRestoreSheet() {
  if (!backupRestore) return;
  const st = backupRestore;
  let drive = '';
  if (getDriveToken()) {
    drive = `<div class="sheet-section">Google Drive · ${DRIVE_BACKUP_KEEP} dernières</div>`;
    if (st.files === null) drive += `<p class="sheet-text">Recherche de tes sauvegardes…</p>`;
    else if (st.error) drive += `<p class="sheet-text">${escapeHtml(st.error)}</p>`;
    else if (!st.files.length) drive += `<p class="sheet-text">Aucune sauvegarde dans le dossier « ${escapeHtml(DRIVE_FOLDER_NAME)} » de ton Drive.</p>`;
    else drive += `<div class="restore-list" role="radiogroup" aria-label="Sauvegardes Google Drive">` + st.files.map((f, i) =>
      backupRestoreRow(i, formatBackupDayLabel(f.modifiedTime), i === 0 ? 'La plus récente' : (f.name === DRIVE_BACKUP_NAME ? 'Ancienne sauvegarde unique' : 'Version précédente'), true)).join('') + `</div>`;
  }
  const file = `<div class="sheet-section">Sur cet appareil</div><div class="restore-list">${backupRestoreRow(-2, 'Choisir un fichier…', 'Fichier créé avec « Sauvegarder »', false)}</div>`;
  const connect = getDriveToken() ? '' : `<p class="sheet-text small">Tes sauvegardes Google Drive apparaîtront ici. <button type="button" class="link-btn" onclick="closeSheet(); backupRestore = null; connectGoogleDrive()">${isDriveWanted() ? 'Reconnecter Google Drive' : 'Se connecter à Google Drive'}</button></p>`;
  const action = st.sel === -1 ? '' : `<button type="button" class="btn" id="backup-restore-go" onclick="confirmBackupRestore()">${st.sel === -2 ? 'Choisir le fichier' : 'Restaurer cette sauvegarde'}</button>`;
  openSheet(`
    <h3 class="sheet-title">Restaurer une sauvegarde</h3>
    <p class="sheet-text">Choisis la sauvegarde à reprendre. Elle remplacera toutes les données de cet appareil : séances, programmes et pesées.</p>
    <div class="backup-scroll">${drive}${file}${connect}</div>
    <div class="sheet-actions">${action}<button type="button" class="btn btn-secondary" onclick="hideDriveBackupList()">Annuler</button></div>`,
    { update: true, onClose: () => { backupRestore = null; } });
}

function pickBackupRestore(i) {
  if (!backupRestore) return;
  backupRestore.sel = backupRestore.sel === i ? -1 : i;
  renderBackupRestoreSheet();
}

function confirmBackupRestore() {
  if (!backupRestore) return;
  const st = backupRestore;
  if (st.sel === -2) {
    hideDriveBackupList();
    const input = document.getElementById('import-file');
    if (input) input.click();
    return;
  }
  const f = st.files && st.files[st.sel];
  hideDriveBackupList();
  if (f) restoreDriveBackup(f);
}

// Ouvre la fenêtre ; avec Google Drive connecté, la liste des sauvegardes se charge dedans
async function restoreFromDrive() {
  backupRestore = { files: getDriveToken() ? null : [], error: '', sel: -1 };
  renderBackupRestoreSheet();
  const token = getDriveToken();
  if (!token) return;
  try {
    const folderId = await ensureDriveFolder(token.access_token);
    const files = (await listDriveBackups(token.access_token, folderId)).slice(0, DRIVE_BACKUP_KEEP);
    if (!backupRestore) return;
    backupRestore.files = files;
    if (files.length) backupRestore.sel = 0; // la plus récente proposée par défaut
  } catch (e) {
    if (!backupRestore) return;
    backupRestore.files = [];
    backupRestore.error = 'Sauvegardes Drive indisponibles : ' + (e && e.message ? e.message : 'erreur réseau') + '.';
  }
  renderBackupRestoreSheet();
}
function openBackupRestore() { restoreFromDrive(); }

// Restaure les données depuis une sauvegarde du Drive (n'importe laquelle de la liste), par le même chemin que
// le bouton « Restaurer » de l'Historique (importData, avec l'assainissement de security.js).
async function restoreDriveBackup(file) {
  const token = getDriveToken();
  if (!token) {
    appAlert('Google Drive', isInstalledApp() ? 'Accès Google expiré : touche d\'abord « Reconnecter maintenant ».' : 'Connecte-toi d\'abord à Google Drive.', 'cloud');
    return;
  }
  if (!file || typeof file.id !== 'string') return;
  try {
    const dl = await downloadDriveBackup(token.access_token, file.id);
    if (!dl.ok && dl.status === 404) {
      appAlert('Sauvegarde introuvable', 'Cette sauvegarde n\'existe plus sur le Drive : la liste a été mise à jour, rien n\'a été modifié.', 'warn');
      restoreFromDrive();
      return;
    }
    if (!dl.ok || !dl.data || !Array.isArray(dl.data.history)) {
      appAlert('Restauration impossible', 'La sauvegarde Drive est illisible ou invalide : rien n\'a été modifié.', 'warn');
      return;
    }
    const when = formatDriveBackupDate(file.modifiedTime);
    const n = dl.data.history.length;
    if (n === 0) {
      appAlert('Sauvegarde vide', 'La sauvegarde Drive du ' + when + ' ne contient aucune séance : rien à restaurer, tes données n\'ont pas été modifiées.\n\nSi tu as un fichier de sauvegarde manuel, utilise « Restaurer » dans l\'Historique.', 'cloud');
      return;
    }
    const local = state && Array.isArray(state.history) ? state.history.length : 0;
    if (!await askSheet({ tone: 'cloud', title: 'Restaurer la sauvegarde du ' + when + ' ?',
      text: 'Elle contient ' + n + ' séance' + (n > 1 ? 's' : '') + ' et remplace les données de cet appareil (' + local + ' séance' + (local > 1 ? 's' : '') + ').',
      ok: 'Restaurer', cancel: 'Annuler' })) return;
    setDriveBackupId(file.id);
    setDriveConflict(null);
    const f = new File([dl.text], file.name || DRIVE_BACKUP_NAME, { type: 'application/json' });
    await window.importData({ target: { files: [f], value: '' } });
    hideDriveBackupList();
    updateDriveUI();
  } catch (e) {
    appAlert('Restauration impossible', 'Restauration impossible : ' + (e && e.message ? e.message : 'erreur réseau') + '.', 'warn');
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
  setTimeout(connectDriveByRedirect, DRIVE_CONNECT_DELAY_MS);
}

// Appelée par « Enregistrer la séance » / « Enregistrer les modifications » (geste de l'utilisateur) :
// envoie tout de suite la sauvegarde complète. Accès expiré : dans le navigateur il est renouvelé en
// silence par la fenêtre Google ; dans l'application installée (pas de renouvellement silencieux possible)
// l'application se reconnecte toute seule par redirection et la sauvegarde part au retour.
// 1.7.11 : la reconnexion automatique (qui quitte l'application, et ouvre le navigateur avec Firefox) est
// réservée à l'enregistrement d'une séance. Programmes (création, modification, activation, suppression) :
// { autoReconnect: false } — la sauvegarde reste en attente et part avec la prochaine séance enregistrée
// (ou « Reconnecter maintenant » dans Réglages).
async function backupToDrive(opts) {
  const autoReconnect = !(opts && opts.autoReconnect === false);
  try {
    if (!isDriveWanted() && !getDriveToken()) return; // Drive n'a jamais été connecté : rien à faire
    let token = getDriveToken();
    // 1.7.26 : pas de fenêtre Google non plus pour les programmes — le renouvellement passe par une fenêtre
    // qui, avec Firefox (même installé, Firefox ne se déclare pas toujours comme application), ouvre le navigateur.
    if (!token && autoReconnect && await renewDriveToken()) token = getDriveToken();
    if (!token) { updateDriveUI(); if (autoReconnect) autoReconnectDriveIfNeeded(); return; }
    const r = await syncDriveBackup();
    if (r && r.reason === 'token' && autoReconnect) autoReconnectDriveIfNeeded();
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
        title: 'Sauvegarde Mon Carnet de Salle',
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
      if (importedState && Array.isArray(importedState.history)) {
        // Ancienne sauvegarde (sans programmes) : migration « Hypertrophie » comme au premier lancement
        const mig = migrateState(importedState);
        if (mig.error) { appAlert('Import impossible', "La sauvegarde importée ne peut pas être convertie au format des programmes : rien n'a été modifié.", 'warn'); return; }
        state = mig.state;
        normalizePrograms();
        programDraft = null; programView = 'home';
        clearEditState();
        clearDraft();
        discardWeightInput();
        saveState();
        populateExerciseSelect();
        initWorkoutForm();
        renderHistory();
        renderCharts();
        renderProgramOverview();
        appAlert('Sauvegarde importée', 'Tes données ont été restaurées.');
      } else {
        appAlert('Fichier invalide', 'Ce fichier de sauvegarde a une structure incorrecte.', 'warn');
      }
    } catch (err) {
      appAlert('Fichier illisible', 'Erreur lors de la lecture du fichier de sauvegarde.', 'warn');
    } finally {
      event.target.value = '';
    }
  };
  reader.readAsText(file);
}

async function resetData() {
  const confirm1 = await askSheet({ tone: 'danger', danger: true, title: 'Réinitialiser les données ?',
    text: "Tes séances, pesées et programmes seront remplacés par les données d'origine.", ok: 'Réinitialiser', cancel: 'Annuler' });
  if (confirm1) {
    fetch('data.json').then(res => res.json()).then(defaultData => {
      state = migrateState(defaultData).state;
      normalizePrograms();
      programDraft = null; programView = 'home';
      clearEditState();
      clearDraft();
      discardWeightInput();
      saveState();
      populateExerciseSelect();
      initWorkoutForm();
      renderHistory();
      renderCharts();
      renderProgramOverview();
      appAlert('Données réinitialisées', "Les données d'origine ont été rechargées.");
    }).catch(() => {
      appAlert('Réinitialisation impossible', 'Erreur lors de la réinitialisation.', 'warn');
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
  if (!document.body.dataset.tab) document.body.dataset.tab = 'programme';
  initTheme();
  applyWallpaper();
  initUpdateIndicator();
  // Google Drive : retour d'une connexion par redirection (application installée), puis statut + sauvegarde à envoyer
  cleanupLegacyDriveKeys();
  const driveReturn = handleDriveRedirectReturn();
  setTimeout(() => {
    initDriveTokenClient(); updateDriveUI();
    syncDriveBackup();
    if (isDriveConnected() && !getDriveAccount()) fetchDriveAccount();
    // on revient sur Réglages pour voir le résultat de la connexion (ou on reprend la restauration de programmes demandée)
    if (driveReturn && !(driveReturn === 'ok' && resumeProgramRestoreIfPending())) switchTab('reglages');
  }, 800);
  // Jeton écrit par un autre onglet (connexion faite dans Chrome pendant que l'application plein écran attend)
  window.addEventListener('storage', (e) => {
    if (e.key === DRIVE_TOKEN_KEY || e.key === DRIVE_WANTED_KEY) { updateDriveUI(); if (isDriveConnected()) { syncDriveBackup(); if (!getDriveAccount()) fetchDriveAccount(); } }
  });
  // Retour dans l'application (ex. après une connexion faite dans un onglet voisin) : on relit l'état de Drive
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return;
    updateDriveUI();
    if (isDriveConnected()) { syncDriveBackup(); if (!getDriveAccount()) fetchDriveAccount(); }
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
