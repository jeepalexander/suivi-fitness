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
// Couleurs des graphiques (jetons du thème clair, voir style.css)
const CHART_COLORS = { primary: '#3730E3', success: '#0B7A43', volume: '#C2570C', tick: '#5B6577' };
if (typeof Chart !== 'undefined') {
  Chart.defaults.font.family = "'Figtree', system-ui, sans-serif";
  Chart.defaults.color = CHART_COLORS.tick;
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

function getIcon(exName) {
  const path = EXERCISE_ICONS[exName] || "icons/bench_press.png";
  return `<img src="${path}" alt="${exName}" onerror="this.src='icons/bench_press.png'">`;
}

function renderProgramOverview() {
  const container = document.getElementById('program-overview');
  if (!container) return;
  container.innerHTML = '';

  Object.keys(PROGRAM).forEach(type => {
    const prog = PROGRAM[type];
    const card = document.createElement('div');
    card.className = 'card';

    let exListHtml = '';
    prog.exercises.forEach((ex) => {
      exListHtml += `
        <div class="program-ex-item" style="display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 12px 8px; background: var(--bg); border-radius: 14px; border: 1px solid var(--line);">
          <div class="ex-icon-badge" style="margin-bottom: 8px;">${getIcon(ex.name)}</div>
          <strong style="font-size: 0.8rem; line-height: 1.2;">${ex.name}</strong>
        </div>
      `;
    });

    card.innerHTML = `
      <div class="card-title" style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px;">
        <span class="badge ${prog.badge}">Séance ${type}</span>
        <span style="font-size: 1rem; font-weight: bold;">${prog.title}</span>
      </div>
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;">
        ${exListHtml}
      </div>
    `;
    container.appendChild(card);
  });
}

// ==========================================
// SUGGESTION DES POIDS (AVEC EXCLUSION DU DÉLOAD)
// ==========================================
// Une série est considérée comme réellement effectuée si elle a une charge ET des répétitions.
// Les séries à 0 kg / 0 rép. correspondent à des séries (ou exercices) non faits.
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

    workoutTimerInterval = setInterval(() => {
      const now = Date.now();
      workoutSeconds = Math.floor((now - startTime) / 1000);

      const m = Math.floor(workoutSeconds / 60);
      const s = workoutSeconds % 60;
      const el = document.getElementById('workout-duration-display');
      if(el) {
        el.innerText = `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
      }
    }, 1000);
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

function toggleSetDone(btn) {
  startWorkoutTimer();
  const row = btn.closest('.set-row');
  row.classList.toggle('done');
  if (row.classList.contains('done')) {
    btn.innerHTML = '✓';
  } else {
    btn.innerHTML = '○';
  }
  updateSetsProgress();
}

function markInputActive(input) {
  startWorkoutTimer();
  input.classList.add('active-input');
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
    if (label) label.innerText = 'Série ' + (i + 1);
  });
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
  grid.insertAdjacentHTML('beforeend', `
    <div class="set-row">
      <span class="set-label">Série ${rows.length + 1}</span>
      <input type="number" step="0.5" class="set-input weight-input" data-ex="${exName}" placeholder="kg" value="${weightVal}" oninput="markInputActive(this)">
      <input type="number" class="set-input reps-input" data-ex="${exName}" placeholder="reps" value="${repsVal}" oninput="markInputActive(this)">
      <button type="button" class="btn-check-set" onclick="toggleSetDone(this)">○</button>
    </div>
  `);
  updateSetsProgress();
}

function removeSet(btn) {
  const grid = btn.closest('.exercise-item').querySelector('.sets-grid');
  const rows = grid.querySelectorAll('.set-row');
  if (rows.length <= 1) return; // toujours au moins une série
  rows[rows.length - 1].remove();
  renumberSets(grid);
  updateSetsProgress();
}

function updateSetsProgress() {
  const totalRows = document.querySelectorAll('.set-row').length;
  const doneRows = document.querySelectorAll('.set-row.done').length;
  const textEl = document.getElementById('sets-progress-text');
  if(textEl) textEl.innerText = `${doneRows} / ${totalRows}`;
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

function initWorkoutForm(customSession = null) { 
  resetWorkoutTimer(); 
  if(!state) return;

  const type = customSession ? customSession.type : state.nextType; 
  const prog = PROGRAM[type];

  // Le titre principal reste simple (ex: "Séance A (Presse / Couché)")
  const titleEl = document.getElementById('seance-type-title'); 
  if(titleEl) {
    titleEl.innerText = prog.title;
    titleEl.style.color = ''; 
  }

  // --- GESTION DU SOUS-TITRE DELOAD ---
  const deloadSubEl = document.getElementById('deload-subtitle');
  if (deloadSubEl) {
    if (isDeloadActive()) {
      deloadSubEl.innerText = "⚡ SEMAINE DE DÉLOAD ACTIVE (-20% sur les charges)";
      deloadSubEl.style.display = "block";
    } else {
      deloadSubEl.innerText = "";
      deloadSubEl.style.display = "none";
    }
  }

  const badge = document.getElementById('seance-badge');
  if(badge) {
    badge.innerText = type;
    badge.className = `badge ${prog.badge}`;
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

  const subHeader = document.getElementById('sub-header'); 
  if(subHeader) { 
    subHeader.innerText = customSession ? `Modification de la séance du ${formatDate(customSession.date)}` : `Prochaine séance : ${type}`; 
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

      rowsHtml += `
        <div class="set-row">
          <span class="set-label">Série ${s}</span>
          <input type="number" step="0.5" class="set-input weight-input" data-ex="${ex.name}" placeholder="kg" value="${weightVal}" oninput="markInputActive(this)">
          <input type="number" class="set-input reps-input" data-ex="${ex.name}" placeholder="reps" value="${repsVal}" oninput="markInputActive(this)">
          <button type="button" class="btn-check-set" onclick="toggleSetDone(this)">○</button>
        </div>
      `;
    }

    div.innerHTML = `
      <div class="ex-header">
        <span class="ex-title">
          <div class="ex-icon-badge">${getIcon(ex.name)}</div>
          ${ex.name}
        </span>
        <span class="ex-controls">
          <button type="button" class="btn-set-count" onclick="removeSet(this)" title="Supprimer la dernière série">−</button>
          <button type="button" class="btn-set-count" onclick="addSet(this)" title="Ajouter une série">+</button>
        </span>
      </div>
      <div class="sets-grid" data-ex="${ex.name}">${rowsHtml}</div>
    `;
    container.appendChild(div);
  });

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

  // Couleur : celle de la séance affichée en mode A/B/C, bleu sinon
  const lineColor = currentVolumeFilter === 'type'
    ? (SESSION_TYPE_COLORS[currentSessionTypeFilter] || CHART_COLORS.primary)
    : CHART_COLORS.primary;
  const lineLabel = currentVolumeFilter === 'type' ? `Tonnage séance ${currentSessionTypeFilter} (kg)` : 'Tonnage (kg)';

  tonnageChart = new Chart(ctx1, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: lineLabel,
        data: data,
        borderColor: lineColor,
        backgroundColor: `${lineColor}22`,
        borderWidth: 2,
        fill: true,
        tension: 0.3,
        pointBackgroundColor: lineColor,
        pointRadius: 4
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: CHART_COLORS.tick, font: { size: 9 } } },
        y: { ticks: { color: CHART_COLORS.tick } }
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
  let labels = [];
  let chartData = [];

  state.history.forEach(h => {
    if (h.exercises) {
      const exData = h.exercises.find(e => {
        if (selectedEx === "Mollets") {
          return e.name === "Mollets" || e.name === "Mollets / Finition";
        }
        return e.name === selectedEx;
      });

      // On ignore les séances où l'exercice n'a pas été réellement fait (séries à 0 kg / 0 rép.)
      // pour ne pas tracer de faux creux à 0 dans la progression.
      const performedSets = (exData && Array.isArray(exData.sets)) ? exData.sets.filter(isPerformedSet) : null;
      const wasPerformed = performedSets ? performedSets.length > 0 : !!(exData && (exData.maxWeight || 0) > 0);

      if (exData && wasPerformed) {
        labels.push(`${h.type} (${formatDate(h.date)})`);
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

  const labelTitle = currentExMetricMode === 'volume' ? 'Volume Cumulé (kg)' : 'Charge Max (kg)';
  const color = currentExMetricMode === 'volume' ? CHART_COLORS.volume : CHART_COLORS.success;

  exerciseChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels.length ? labels : ['Aucune donnée'],
      datasets: [{
        label: labelTitle,
        data: chartData.length ? chartData : [0],
        borderColor: color,
        backgroundColor: `${color}22`,
        fill: true,
        tension: 0.2,
        pointRadius: 4
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: CHART_COLORS.tick, font: { size: 8 } } },
        y: { ticks: { color: CHART_COLORS.tick } }
      }
    }
  });
}

function renderHistory() {
  const container = document.getElementById('history-list');
  if(!container) return;
  container.innerHTML = '';

  [...state.history].reverse().forEach((h, originalIndexReversed) => {
    const realIndex = state.history.length - 1 - originalIndexReversed;
    const div = document.createElement('div');
    div.className = 'history-item';
    div.style.cursor = 'pointer';
    div.title = "Cliquez pour modifier cette séance";
    
    div.onclick = () => openSessionModal(realIndex);

    // 1. Définition du badge de déload
    const deloadBadgeHtml = h.isDeload ? `<span style="font-size:0.7rem; background:var(--warn-tint); color:var(--warn); padding:2px 8px; border-radius:8px; margin-left:6px;"> Deload</span>` : '';
    
    // Conversion du tonnage en Tonnes (division par 1000) et formatage
    const tonnageInTonnes = (parseFloat(h.tonnage || 0) / 1000).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1});

    // 2. Injection du badge dans le HTML de la ligne
    div.innerHTML = `
      <div>
        <span class="badge badge-${h.type}">${h.type}</span>
        <span style="font-weight:500; margin-left:8px;">${formatDate(h.date)}</span>
        <span style="font-size:0.75rem; color:var(--text-muted); margin-left:6px;">⏱️️ ${h.duration || 'N/A'}</span>
        ${deloadBadgeHtml}
      </div>
      <div style="font-family:var(--font-display); font-weight:700; color:var(--primary);"><strong>${tonnageInTonnes} T</strong></div>
    `;
    container.appendChild(div);
  });
}

function injectSessionModalHtml() {
  if (document.getElementById('session-modal')) return;
  const modalHtml = `
    <div id="session-modal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15,23,42,0.5); justify-content:center; align-items:center; z-index:1000;">
      <div style="background:var(--card-bg); padding:20px; border-radius:20px; width:90%; max-width:320px; text-align:center; color:var(--text); border: 1px solid var(--border); box-shadow: 0 12px 32px rgba(15,23,42,0.18);">
        <h3 id="modal-session-title" style="margin-bottom: 15px; font-size: 1.1rem;">Séance</h3>
        <button id="modal-edit-btn" style="background:var(--primary); border:none; color:white; padding:12px 20px; border-radius:14px; cursor:pointer; width:100%; font-size:1em; margin-bottom: 10px; font-weight:600;">Modifier la séance</button>
        <button onclick="closeSessionModal()" style="background:var(--bg); border:1px solid var(--border); color:var(--text); padding:12px 15px; border-radius:14px; cursor:pointer; width:100%;">Fermer</button>
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

function renderProgressAnalysis() {
  const container = document.getElementById('monthly-analysis');
  if (!container) return;

  const analysis = analyzeMonthlyProgress();
  let html = '';

  // Si pas de données
  if (analysis.monthlyData.length === 0) {
    html = `
      <div class="analysis-empty">
        <p>\ud83d\udcca Aucune donnée disponible.</p>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 8px;">
          Enregistre des séances pour voir ta progression !
        </p>
      </div>
    `;
    container.innerHTML = html;
    return;
  }

  // 1. Résumé mensuel (4 derniers mois max)
  html += `<div class="analysis-section">`;
  html += `<h3 class="analysis-section-title">4 derniers mois</h3>`;
  html += `<div class="monthly-summary">`;

  analysis.monthlyData.forEach(month => {
    const tonnageInTonnes = (month.totalTonnage / 1000).toFixed(1);
    const isCurrentMonth = month.year + '-' + month.month === analysis.currentMonthKey;
    const monthLabel = isCurrentMonth ? 'Ce mois-ci' : `${month.monthName} ${month.year}`;

    html += `
      <div class="month-card">
        <div class="month-header">
          <span class="month-name">${monthLabel}</span>
          <span class="month-sessions">${month.sessionCount} séance${month.sessionCount > 1 ? 's' : ''}</span>
        </div>
        <div class="month-tonnage">${tonnageInTonnes} T</div>
      </div>
    `;
  });

  html += `</div></div>`;

  // 2. Records battus ce mois-ci
  if (analysis.currentMonthRecords.length > 0) {
    html += `<div class="analysis-section">`;
    html += `<h3 class="analysis-section-title">Records battus ce mois-ci</h3>`;
    html += `<div class="records-list">`;

    analysis.currentMonthRecords.forEach(record => {
      html += `
        <div class="record-item">
          <span class="record-exercise">${record.exercise}</span>
          <span class="record-value">${record.newMax} kg</span>
          <span class="record-improvement">+${record.improvement} kg</span>
        </div>
      `;
    });

    html += `</div></div>`;
  }

  // 3. Paliers détectés
  html += `<div class="analysis-section">`;
  html += `<h3 class="analysis-section-title">Paliers détectés</h3>`;

  if (analysis.plateaus.length > 0) {
    html += `<div class="plateaus-list">`;

    analysis.plateaus.forEach(plateau => {
      html += `
        <div class="plateau-item">
          <span class="plateau-exercise">${plateau.exercise}</span>
          <span class="plateau-value">${plateau.currentMax} kg</span>
          <span class="plateau-duration">sans progression depuis le ${plateau.sinceDate.substring(8, 10)}/${plateau.sinceDate.substring(5, 7)} (${plateau.sessionsCount} séances)</span>
        </div>
      `;
    });

    html += `</div>`;
  } else {
    html += `<p class="analysis-none">Aucun palier détecté</p>`;
  }

  html += `</div>`;

  // 4. Progression
  const stats = analysis.overallStats;
  const progressItem = (label, percent) => {
    if (percent === null || percent === undefined) return '';
    const cls = percent >= 0 ? 'positive' : 'negative';
    const symbol = percent >= 0 ? '\u25b2' : '\u25bc';
    return `
      <div class="stat-item">
        <span class="stat-label">${label}</span>
        <span class="stat-value ${cls}">${symbol} ${Math.abs(percent)}%</span>
      </div>
    `;
  };

  if (stats) {
    const items =
      progressItem('Mois dernier vs précédent', stats.lastVsPreviousDiffPercent) +
      progressItem('Indice de progression global', stats.globalProgressIndex) +
      ['A', 'B', 'C'].map(type => progressItem(`Séance ${type}`, stats.sessionProgress[type].percent)).join('');

    if (items.trim() !== '') {
      html += `<div class="analysis-section">`;
      html += `<h3 class="analysis-section-title">Progression</h3>`;
      html += `<div class="overall-stats">${items}</div>`;
      html += `<p class="analysis-note">Indice global et séances : tonnage médian des 3 dernières séances vs les 3 premières, sur tout l'historique (sans tenir compte des mois). L'indice global est la moyenne des séances A, B et C.</p>`;
      html += `</div>`;
    }
  }

  // 5. Conseils
  if (analysis.advice.length > 0) {
    html += `<div class="advice-list">`;

    analysis.advice.forEach(adviceItem => {
      const icon = adviceItem.type === 'success' ? '\u2705' : 
                   adviceItem.type === 'warning' ? '\u26a0\ufe0f' : 
                   adviceItem.type === 'info' ? '\u2139\ufe0f' : '\ud83d\udcad';
      html += `
        <div class="advice-item advice-${adviceItem.type}">
          <span class="advice-icon">${icon}</span>
          <span class="advice-text">${adviceItem.text}</span>
        </div>
      `;
    });

    html += `</div>`;
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

  weightChart = new Chart(ctx2, {
    type: 'line',
    data: {
      labels: state.weights.map(w => formatDate(w.date)),
      datasets: [{
        label: 'Poids (kg)',
        data: state.weights.map(w => w.weight),
        borderColor: CHART_COLORS.success,
        backgroundColor: CHART_COLORS.success + '22',
        fill: true,
        tension: 0.2
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: CHART_COLORS.tick } },
        y: { ticks: { color: CHART_COLORS.tick } }
      }
    }
  });
}

// Titre affiché en haut de chaque onglet
const PAGE_TITLES = { programme: 'Programme', seance: 'Séance', progression: 'Graphiques', historique: 'Historique' };

function switchTab(tabName) {
  document.querySelectorAll('.container').forEach(c => c.classList.remove('active'));
  document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));

  const targetContainer = document.getElementById(`tab-${tabName}`);
  const targetNav = document.getElementById(`nav-${tabName}`);
  if(targetContainer) targetContainer.classList.add('active');
  if(targetNav) targetNav.classList.add('active');

  const timerBtn = document.getElementById('timer-btn');
  if (timerBtn) {
    if (tabName === 'seance') {
      timerBtn.style.display = 'flex';
    } else {
      timerBtn.style.display = 'none';
    }
  }

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
