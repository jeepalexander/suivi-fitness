// Copyright (c) 2026 Jean-Philippe Alexander. Mon Carnet de Salle.
// SPDX-License-Identifier: PolyForm-Strict-1.0.0 (voir LICENSE et NOTICE)
// Chronos (repos, durée de séance) et brouillon de séance (anciennes sections 7 et 8 de app.js) — sorti de app.js tel quel en 1.8.90 (co-auteur : Claude), aucun changement de fonctionnement.
// Chargé juste après app.js (index.html) ; fonctions et variables globales, comme dans app.js.

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
  return activePrescription(exName).rest || REST_DURATION;
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
  const exercises = items.map((item, idx) => {
    const rows = Array.from(item.querySelectorAll('.set-row'));
    const defEx = workoutDef.exercises[idx]; // même ordre que l'écran (un exercice peut revenir plusieurs fois)
    if (defEx && rows.length !== defEx.seriesCount) dirty = true;
    return {
      name: item.dataset.ex,
      occ: exOccOf(item.dataset),
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
      const saved = d.exercises.find(e => e.name === item.dataset.ex && exOccOf(e) === exOccOf(item.dataset));
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
