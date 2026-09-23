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
    title: "Séance A (Presse / Couché)",
    badge: "badge-A",
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
    title: "Séance B (Soulevé / Incliné)",
    badge: "badge-B",
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
    title: "Séance C (Fentes / Dips)",
    badge: "badge-C",
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
let currentVolumeFilter = 'all';
let currentExMetricMode = 'max';

// Variables pour la modification de séance
let selectedSessionIndex = null;
let editingOriginalDate = null;
let editingOriginalId = null;

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
    state = JSON.parse(saved);
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

  renderProgramOverview();
  populateExerciseSelect();
  initWorkoutForm();
  renderHistory();
  injectSessionModalHtml();
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
    prog.exercises.forEach((ex, idx) => {
      const warmupBadge = idx === 0 ? '<span style="font-size:0.68rem; background:#ff7f0e33; color:#ff9f43; padding:2px 6px; border-radius:4px; margin-left:6px;">🔥 Échauffement</span>' : '';
      exListHtml += `
        <div class="program-ex-row">
          <span class="ex-title">
            <div class="ex-icon-badge">${getIcon(ex.name)}</div>
            <strong>${ex.name}</strong>${warmupBadge}
          </span>
          <span style="color:var(--text-muted); font-size:0.8rem;">${ex.seriesCount} × ${ex.defaultReps} reps</span>
        </div>
      `;
    });

    card.innerHTML = `
      <div class="card-title">
        <span>${prog.title}</span>
        <span class="badge ${prog.badge}">Séance ${type}</span>
      </div>
      <div style="margin-top:10px;">${exListHtml}</div>
    `;
    container.appendChild(card);
  });
}

function getSuggestedSetValues(exName, setIndex, fallbackWeight, fallbackReps) {
  for (let i = state.history.length - 1; i >= 0; i--) {
    const h = state.history[i];
    if (h.exercises) {
      const foundEx = h.exercises.find(e => e.name === exName);
      if (foundEx && foundEx.sets && foundEx.sets[setIndex]) {
        return foundEx.sets[setIndex];
      }
    }
  }
  if (state.lastWeights && state.lastWeights[exName]) {
    return { weight: state.lastWeights[exName], reps: fallbackReps };
  }
  return { weight: fallbackWeight, reps: fallbackReps };
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

function toggleRestTimer() {
  const btn = document.getElementById('timer-btn');
  if (restTimerInterval) {
    clearInterval(restTimerInterval);
    restTimerInterval = null;
    localStorage.removeItem('rest_end_time');
    if (btn) btn.className = 'timer-btn running';
    updateTimerDisplay(REST_DURATION);
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

function updateSetsProgress() {
  const totalRows = document.querySelectorAll('.set-row').length;
  const doneRows = document.querySelectorAll('.set-row.done').length;
  const textEl = document.getElementById('sets-progress-text');
  if(textEl) textEl.innerText = `${doneRows} / ${totalRows}`;
}

function initWorkoutForm(customSession = null) {
  resetWorkoutTimer();
  if(!state) return;

  const type = customSession ? customSession.type : state.nextType;
  const prog = PROGRAM[type];

  const titleEl = document.getElementById('seance-type-title');
  if(titleEl) titleEl.innerText = prog.title;
  
  const badge = document.getElementById('seance-badge');
  if(badge) {
    badge.innerText = type;
    badge.className = `badge ${prog.badge}`;
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
        <span style="font-size:0.75rem; color:var(--text-muted);">${ex.seriesCount} séries</span>
      </div>
      <div class="sets-grid">${rowsHtml}</div>
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

      state.lastWeights[exName] = w;
    });

    const sessionDuration = getFormattedWorkoutDuration();
    const typeBadgeEl = document.getElementById('seance-badge');
    const type = typeBadgeEl ? typeBadgeEl.innerText : state.nextType;

    const sessionDate = editingOriginalDate || new Date().toISOString().slice(0, 10);
    const sessionId = editingOriginalId || Date.now();

    const entry = {
      id: sessionId,
      date: sessionDate,
      type: type,
      tonnage: Math.round(totalTonnage),
      duration: sessionDuration,
      exercises: exerciseLogs
    };

    state.history.push(entry);
    state.history.sort((a, b) => new Date(a.date) - new Date(b.date));
    updateNextTypeFromHistory();

    editingOriginalDate = null;
    editingOriginalId = null;
    selectedSessionIndex = null;
    localStorage.removeItem('workout_start_time');

    saveState();

    alert(`Séance enregistrée !\n• Temps : ${sessionDuration}\n• Tonnage réel : ${Math.round(totalTonnage).toLocaleString()} kg`);
    
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

function setVolumeFilter(filter, btn) {
  currentVolumeFilter = filter;
  document.querySelectorAll('#tab-progression .filter-btn').forEach(b => {
    if(b.id !== 'btn-mode-max' && b.id !== 'btn-mode-vol') b.classList.remove('active');
  });
  btn.classList.add('active');
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
  if(!canvas) return;
  const ctx1 = canvas.getContext('2d');
  if (tonnageChart) tonnageChart.destroy();

  let labels = [];
  let data = [];

  if (currentVolumeFilter === 'month') {
    let monthlyData = {};
    state.history.forEach(e => {
      const monthKey = e.date.substring(0, 7);
      if (!monthlyData[monthKey]) monthlyData[monthKey] = 0;
      monthlyData[monthKey] += e.tonnage;
    });
    labels = Object.keys(monthlyData).map(m => {
      const [y, mm] = m.split('-');
      return `${mm}/${y.slice(2)}`;
    });
    data = Object.values(monthlyData);
  } else {
    labels = state.history.map(e => `${e.type} (${formatDate(e.date)})`);
    data = state.history.map(e => e.tonnage);
  }

  tonnageChart = new Chart(ctx1, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Tonnage (kg)',
        data: data,
        borderColor: '#1f77b4',
        backgroundColor: '#1f77b422',
        borderWidth: 2,
        fill: true,
        tension: 0.3,
        pointBackgroundColor: '#1f77b4',
        pointRadius: 4
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#a0a0a0', font: { size: 9 } } },
        y: { ticks: { color: '#a0a0a0' } }
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

      if (exData) {
        labels.push(`${h.type} (${formatDate(h.date)})`);
        if (currentExMetricMode === 'volume') {
          chartData.push(exData.totalVolume || 0);
        } else {
          chartData.push(exData.maxWeight || 0);
        }
      }
    }
  });

  const labelTitle = currentExMetricMode === 'volume' ? 'Volume Cumulé (kg)' : 'Charge Max (kg)';
  const color = currentExMetricMode === 'volume' ? '#ff7f0e' : '#2ca02c';

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
        x: { ticks: { color: '#a0a0a0', font: { size: 8 } } },
        y: { ticks: { color: '#a0a0a0' } }
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

    div.innerHTML = `
      <div>
        <span class="badge badge-${h.type}">Séance ${h.type}</span>
        <span style="font-weight:600; margin-left:8px;">${formatDate(h.date)}</span>
        <span style="font-size:0.75rem; color:var(--text-muted); margin-left:6px;">⏱️ ${h.duration || 'N/A'}</span>
      </div>
      <div style="font-weight:700; color:#1f77b4;">${h.tonnage.toLocaleString()} kg</div>
    `;
    container.appendChild(div);
  });
}

function injectSessionModalHtml() {
  if (document.getElementById('session-modal')) return;
  const modalHtml = `
    <div id="session-modal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); justify-content:center; align-items:center; z-index:1000;">
      <div style="background:#222; padding:20px; border-radius:8px; width:90%; max-width:300px; text-align:center; color:#fff; border: 1px solid #444;">
        <h3 id="modal-session-title" style="margin-bottom: 15px; font-size: 1.1rem;">Séance</h3>
        <button id="modal-edit-btn" style="background:#ff7f0e; border:none; color:white; padding:10px 20px; border-radius:5px; cursor:pointer; width:100%; font-size:1em; margin-bottom: 10px; font-weight:600;">Modifier la séance</button>
        <button onclick="closeSessionModal()" style="background:#444; border:none; color:white; padding:8px 15px; border-radius:5px; cursor:pointer; width:100%;">Fermer</button>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);

  document.getElementById('modal-edit-btn').addEventListener('click', () => {
    if (selectedSessionIndex !== null) {
      const sessionToEdit = state.history[selectedSessionIndex];
      
      editingOriginalDate = sessionToEdit.date;
      editingOriginalId = sessionToEdit.id;
      
      initWorkoutForm(sessionToEdit);

      state.history.splice(selectedSessionIndex, 1);
      saveState();
      
      closeSessionModal();
      renderHistory();
      renderCharts();
      switchTab('seance');

      alert(`Séance ${sessionToEdit.type} du ${formatDate(sessionToEdit.date)} chargée dans le formulaire. Vous pouvez la corriger et valider.`);
    }
  });
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

function renderCharts() {
  renderTonnageChart();
  renderExerciseChart();

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
        borderColor: '#ff7f0e',
        backgroundColor: '#ff7f0e22',
        fill: true,
        tension: 0.2
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#a0a0a0' } },
        y: { ticks: { color: '#a0a0a0' } }
      }
    }
  });
}

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

  if (tabName === 'programme') renderProgramOverview();
  if (tabName === 'progression') renderCharts();
}

async function exportData() {
  const dataStr = JSON.stringify(state, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const file = new File([blob], `sauvegarde_fitness_${new Date().toISOString().slice(0, 10)}.json`, { type: 'application/json' });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        title: 'Sauvegarde de vos entraînements',
        text: 'Voici votre fichier de sauvegarde à stocker sur le Drive.',
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
    downloadAnchor.setAttribute("download", `sauvegarde_fitness_${new Date().toISOString().slice(0, 10)}.json`);
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