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
  "Oiseau (Arrière d'épaule)": "icons/reverse_fly.png",
  "Leg Curl": "icons/leg_curl.png"
};

const PROGRAM = {
  'A': {
    badge: "badge-A",
    title: "Presse/Développé",
    exercises: [
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
      { name: "Fentes marchées", seriesCount: 4, defaultWeight: 25, defaultReps: 10 },
      { name: "Dips", seriesCount: 4, defaultWeight: 80, defaultReps: 10 },
      { name: "Rowing unilatéral", seriesCount: 3, defaultWeight: 20, defaultReps: 12 },
      { name: "Oiseau (Arrière d'épaule)", seriesCount: 3, defaultWeight: 20, defaultReps: 12 },
      { name: "Mollets", seriesCount: 3, defaultWeight: 40, defaultReps: 12 },
      { name: "Leg Curl", seriesCount: 3, defaultWeight: 40, defaultReps: 12 }
    ]
  }
};

let state = null;
let restTimerInterval = null;
const REST_DURATION = 120;
let workoutTimerInterval = null;
let workoutSeconds = 0;
let tonnageChart, exerciseChart, weightChart;
let currentVolumeFilter = 'all'; // 'all' (séances), 'month' (par mois) ou 'type' (séance A/B/C)
const SESSION_TYPES = ['A', 'B', 'C'];
const SESSION_TYPE_COLORS = { A: '#1B6FD8', B: '#C2570C', C: '#C62B35' };
// Couleurs des graphiques : valeurs de repli (thème clair). Elles sont relues depuis
// les variables --chart-* de style.css à chaque changement de thème (voir readChartColors).
const CHART_COLORS = { primary: '#3730E3', success: '#0B7A43', volume: '#C2570C', tick: '#5B6577', grid: '#E3E7ED', band: 'rgba(246, 213, 139, 0.45)' };
if (typeof Chart !== 'undefined') {
  Chart.defaults.font.family = "'Figtree', system-ui, sans-serif";
  Chart.defaults.font.size = 13; // 12 par défaut, +1 comme le reste de l'interface
  Chart.defaults.color = CHART_COLORS.tick;
}

// --- Thème clair / sombre / auto ---
// La préférence est stockée sur l'appareil (h49_theme), hors de l'état exporté.
// Clair par défaut. Le script de index.html pose data-theme avant le premier affichage.
const THEME_KEY = 'h49_theme';
const THEME_BAR_COLORS = { light: '#F2F4F7', dark: '#0B0F1A' };
let themeMediaQuery = null;

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
let currentSessionTypeFilter = SESSION_TYPES[0];
let currentExMetricMode = 'max';

// Variables pour la modification de séance
let selectedSessionIndex = null;
let editingOriginalDate = null;
let editingOriginalId = null;
let editingOriginalDuration = null;
let editingOriginalIsDeload = false;

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

async function initApp() {
  initTheme();
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
    const titleEl = document.getElementById('app-title');
    if (titleEl && m.version) titleEl.innerText = 'SUIVI FITNESS ' + m.version;
  }).catch(() => {});

  renderProgramOverview();
  populateExerciseSelect();
  initWorkoutForm();
  renderHistory();
  injectSessionModalHtml();

  // Ajout de la vérification du déload au chargement
  displayDeloadNotificationIfNeeded();
}

function saveState() {
  if (state && state.history) {
    state.history.sort((a, b) => new Date(a.date) - new Date(b.date));
  }
  localStorage.setItem('h49_state', JSON.stringify(state));
}

function getIcon(exName, decorative = false) {
  const path = EXERCISE_ICONS[exName] || "icons/bench_press.png";
  return `<img src="${path}" alt="${decorative ? '' : exName}" onerror="this.src='icons/bench_press.png'">`;
}

function programTilesHtml(prog) {
  return prog.exercises.map(ex => `
    <div class="ex-tile">
      <div class="ex-icon-badge">${getIcon(ex.name)}</div>
      <span>${ex.name}</span>
    </div>
  `).join('');
}

const SESSION_ORDER = ['A', 'B', 'C'];
const CHEVRON_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';

function renderProgramOverview() {
  const container = document.getElementById('program-overview');
  if (!container) return;

  const nextType = PROGRAM[state.nextType] ? state.nextType : 'A';
  const next = PROGRAM[nextType];
  const startIdx = SESSION_ORDER.indexOf(nextType);
  const others = [1, 2].map(i => SESSION_ORDER[(startIdx + i) % SESSION_ORDER.length]);

  const deloadHtml = checkDeloadStatus()
    ? `<span class="deload-pill"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 3L5 14h6l-1 7 8-11h-6z"/></svg>Déload actif · −20 %</span>`
    : '';

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
    <div class="card next-card">
      <div class="session-head">
        <span class="type-pill type-pill-${nextType}">${nextType}</span>
        <div class="session-head-text">
          <span class="overline">Prochaine séance</span>
          <span class="session-name">${next.title.replace('/', ' / ')}</span>
        </div>
      </div>
      ${deloadHtml}
      <button type="button" class="btn btn-start" onclick="switchTab('seance')">
        Démarrer la séance
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
      </button>
      <p class="warmup-note">🚣 Échauffement : Rameur 1000 m + 2 séries légères uniquement sur le 1er exercice.</p>
    </div>

    <div class="section-block">
      <h2 class="section-label">Au programme · ${next.exercises.length} exercices</h2>
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

function isPerformedSet(set) {
  return !!set && (parseFloat(set.weight) || 0) > 0 && (parseFloat(set.reps) || 0) > 0;
}

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

  if (btn) btn.className = 'timer-btn running';

  restTimerInterval = setInterval(() => {
    const now = Date.now();
    const secondsRemaining = Math.max(0, Math.floor((endTime - now) / 1000));

    updateTimerDisplay(secondsRemaining);

    if (secondsRemaining <= 0) {
      clearInterval(restTimerInterval);
      restTimerInterval = null;
      localStorage.removeItem('rest_end_time');
      if (btn) btn.className = 'timer-btn finished';
      const display = document.getElementById('timer-display');
      if(display) display.innerText = 'GO !';
      playBeep();
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    }
  }, 1000);
}

// Retour à l'état initial du timer de repos (affichage « PAUSE »)
function resetRestTimerUi() {
  const btn = document.getElementById('timer-btn');
  const display = document.getElementById('timer-display');
  if (btn) btn.className = 'timer-btn';
  if (display) display.innerText = 'PAUSE';
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
    const endTime = Date.now() + (REST_DURATION * 1000);
    localStorage.setItem('rest_end_time', endTime);
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

const CHECK_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const MINUS_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12h12"/></svg>';
const PLUS_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6v12M6 12h12"/></svg>';

// Exercice ouvert à la main : undefined = automatique (premier exercice non terminé),
// un index = ouvert par l'utilisateur, -1 = tout replié.
let manualOpenExercise;
let scrollOnNextRefresh = false;
let lastOpenExerciseIdx = null;

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
  saveDraft();
}

function markInputActive(input) {
  startWorkoutTimer();
  input.classList.add('active-input');
  saveDraft();
}

// ==========================================
// AJOUT / SUPPRESSION DE SÉRIES (ONGLET SÉANCE)
// ==========================================
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
function setRowHtml(exName, number, weightVal, repsVal) {
  return `
    <div class="set-row">
      <span class="set-label">${number}</span>
      <input type="number" step="0.5" inputmode="decimal" class="set-input weight-input" data-ex="${exName}" aria-label="Série ${number}, poids en kg" placeholder="kg" value="${weightVal}" oninput="markInputActive(this)">
      <input type="number" inputmode="numeric" class="set-input reps-input" data-ex="${exName}" aria-label="Série ${number}, répétitions" placeholder="reps" value="${repsVal}" oninput="markInputActive(this)">
      <button type="button" class="btn-check-set" aria-pressed="false" aria-label="Valider la série ${number}" onclick="toggleSetDone(this)">${CHECK_SVG}</button>
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
function exerciseSummaryText(item) {
  const rows = Array.from(item.querySelectorAll('.set-row'));
  const n = rows.length;
  const plural = n > 1 ? 'séries' : 'série';
  if (isExerciseComplete(item)) return `Terminé · ${n} ${plural}`;
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
    item.querySelector('.ex-controls').hidden = !open;

    rows.forEach(r => r.classList.remove('current'));
    if (open) {
      const current = rows.find(r => !r.classList.contains('done'));
      if (current) current.classList.add('current');
    }
    item.querySelector('.ex-sub').textContent = open ? exerciseLastTimeText(item.dataset.ex) : exerciseSummaryText(item);
  });

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

// ==========================================
// GESTION DU DÉLOAD (SEMAINE DE RELÂCHE)
// ==========================================
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

// ==========================================
// BROUILLON DE SÉANCE
// La saisie en cours (poids, reps, séries validées, nombre de séries, exercice ouvert, chrono)
// est copiée dans localStorage à chaque action et restaurée au rechargement de l'application
// (tirer pour rafraîchir, application fermée par le système...). Elle est effacée à l'enregistrement
// de la séance et abandonnée au bout de 24 h.
// ==========================================
const DRAFT_KEY = 'h49_draft';
const DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000;
let draftRestoring = false;

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
      grid.innerHTML = saved.sets.map((s, i) => setRowHtml(item.dataset.ex, i + 1, clean(s.w), clean(s.r))).join('');
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
    for (let s = 1; s <= ex.seriesCount; s++) {
      let weightVal = ex.defaultWeight;
      let repsVal = ex.defaultReps;

      if (existingEx && existingEx.sets && existingEx.sets[s - 1]) {
        weightVal = existingEx.sets[s - 1].weight;
        repsVal = existingEx.sets[s - 1].reps;
      } else {
        const lastSet = getSuggestedSetValues(ex.name, s - 1, ex.defaultWeight, ex.defaultReps);
        weightVal = lastSet.weight;
        repsVal = lastSet.reps;
      }

      rowsHtml += setRowHtml(ex.name, s, weightVal, repsVal);
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
        <div class="sets-head" aria-hidden="true"><span>Série</span><span>Kg</span><span>Réps</span><span></span></div>
        <div class="sets-grid" data-ex="${ex.name}">${rowsHtml}</div>
      </div>
    `;
    container.appendChild(div);
  });

  // Saisie en cours retrouvée après un rechargement (jamais en modification d'une ancienne séance)
  if (!customSession && editingOriginalId === null) restoreDraft(type);

  updateSetsProgress(); 
}

document.addEventListener('submit', function(e) {
  if(e.target && e.target.id === 'workout-form') {
    e.preventDefault();
    let totalTonnage = 0;
    let exerciseLogs = [];

    if (!state.lastWeights) state.lastWeights = {};
    const isEditing = editingOriginalId !== null;

    const weights = document.querySelectorAll('.weight-input');
    const reps = document.querySelectorAll('.reps-input');

    weights.forEach((wInput, idx) => {
      const w = parseFloat(wInput.value) || 0;
      const r = parseFloat(reps[idx].value) || 0;
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
      // et on ne mémorise pas les séries non faites (0 kg / 0 rép.)
      if (!isEditing && w > 0 && r > 0) state.lastWeights[exName] = w;
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

    // Actualise la bannière de déload en temps réel
    displayDeloadNotificationIfNeeded();

    alert(`${isEditing ? 'Séance modifiée' : 'Séance enregistrée'} !\n• Temps : ${sessionDuration || 'N/A'}\n• Tonnage réel : ${Math.round(totalTonnage).toLocaleString()} kg`);
    
    initWorkoutForm();
    renderHistory();
    renderCharts();
    switchTab('seance');
  }
});

function populateExerciseSelect() {
  const select = document.getElementById('exercise-filter');
  if(!select) return;
  select.innerHTML = '';
  
  let allExercises = [];
  Object.values(PROGRAM).forEach(p => {
    p.exercises.forEach(e => {
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

function formatDate(dateStr) {
  if(!dateStr) return '';
  const parts = dateStr.split('-');
  if(parts.length === 3) return `${parts[2]}/${parts[1]}`;
  return dateStr;
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

const HISTORY_MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const HISTORY_DAYS = ['Dim.','Lun.','Mar.','Mer.','Jeu.','Ven.','Sam.'];
const HISTORY_MONTHS_SHORT = ['janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'];

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
          <span class="history-date">${formatHistoryDate(h.date)}${h.isDeload ? ' <span class="deload-tag">Déload</span>' : ''}</span>
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

function injectSessionModalHtml() {
  if (document.getElementById('session-modal')) return;
  const modalHtml = `
    <div id="session-modal" class="modal-overlay" style="display:none;" onclick="if(event.target===this) closeSessionModal()">
      <div class="modal-sheet" role="dialog" aria-modal="true" aria-labelledby="modal-session-title">
        <div id="modal-session-pill"></div>
        <h3 id="modal-session-title" class="modal-title">Séance</h3>
        <p id="modal-session-meta" class="modal-meta"></p>
        <button id="modal-edit-btn" class="btn">Modifier la séance</button>
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

      alert(`Séance ${sessionToEdit.type} du ${formatDate(sessionToEdit.date)} chargée dans le formulaire. Corrigez-la puis validez, ou annulez : l'originale reste intacte tant que vous n'avez pas validé.`);
    }
  });
}

function cancelEditSession() {
  clearEditState();
  initWorkoutForm();
  switchTab('historique');
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
    renderCharts();
  }
}

// ============================================
// ANALYSE MENSUELLE DE PROGRESSION
// ============================================

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

function renderCharts() {
  renderTonnageChart();
  renderExerciseChart();
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

// Titre affiché en haut de chaque onglet
const PAGE_TITLES = { programme: 'Programme', seance: 'Séance', progression: 'Graphiques', historique: 'Historique' };

function switchTab(tabName) {
  document.querySelectorAll('.container').forEach(c => c.classList.remove('active'));
  document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));

  const targetContainer = document.getElementById(`tab-${tabName}`);
  const targetNav = document.getElementById(`nav-${tabName}`);
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
  updateStickyOffsets();
  const pageTitle = document.getElementById('page-title');
  if (pageTitle) pageTitle.innerText = PAGE_TITLES[tabName] || '';

  if (tabName === 'programme') renderProgramOverview();
  if (tabName === 'progression') renderCharts();
  if (tabName === 'progression') renderProgressAnalysis();
}

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

document.addEventListener('DOMContentLoaded', initApp);
