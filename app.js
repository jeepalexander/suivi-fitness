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
  "Mollets / Finition": "icons/calf_raise.png",
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
      { name: "Mollets / Finition", seriesCount: 3, defaultWeight: 40, defaultReps: 12 },
      { name: "Leg Curl", seriesCount: 3, defaultWeight: 40, defaultReps: 12 }
    ]
  }
};

let state = null;
let restTimerInterval = null;
let restTimerSeconds = 120;
const REST_DURATION = 120;
let workoutTimerInterval = null;
let workoutSeconds = 0;
let tonnageChart, exerciseChart, weightChart;
let currentVolumeFilter = 'all';
let currentExMetricMode = 'max';

async function initApp() {
  const saved = localStorage.getItem('h49_state');
  if (saved) {
    state = JSON.parse(saved);
  } else {
    try {
      const response = await fetch('data.json');
      state = await response.json();
      saveState();
    } catch (e) {
      console.error("Impossible de charger data.json", e);
      state = { nextType: 'A', history: [], weights: [], lastWeights: {} };
    }
  }

  renderProgramOverview();
  populateExerciseSelect();
  initWorkoutForm();
  renderHistory();
}

function saveState() {
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

function getLastWeightForExercise(exName, fallbackDefault) {
  if (state.lastWeights && state.lastWeights[exName]) {
    return state.lastWeights[exName];
  }
  for (let i = state.history.length - 1; i >= 0; i--) {
    const h = state.history[i];
    if (h.exercises) {
      const found = h.exercises.find(e => e.name === exName);
      if (found && found.maxWeight) return found.maxWeight;
    }
  }
  return fallbackDefault;
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

function updateTimerDisplay() {
  const display = document.getElementById('timer-display');
  if(!display) return;
  const m = Math.floor(restTimerSeconds / 60);
  const s = restTimerSeconds % 60;
  display.innerText = `${m}:${s < 10 ? '0' : ''}${s}`;
}

function toggleRestTimer() {
  const btn = document.getElementById('timer-btn');
  if (restTimerInterval) {
    clearInterval(restTimerInterval);
    restTimerInterval = null;
    restTimerSeconds = REST_DURATION;
    btn.className = 'timer-btn running';
    updateTimerDisplay();
  } else {
    restTimerSeconds = REST_DURATION;
    btn.className = 'timer-btn running';
    updateTimerDisplay();

    restTimerInterval = setInterval(() => {
      restTimerSeconds--;
      updateTimerDisplay();

      if (restTimerSeconds <= 0) {
        clearInterval(restTimerInterval);
        restTimerInterval = null;
        btn.className = 'timer-btn finished';
        document.getElementById('timer-display').innerText = 'GO !';
        playBeep();
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      }
    }, 1000);
  }
}

function startWorkoutTimer() {
  if (!workoutTimerInterval) {
    workoutTimerInterval = setInterval(() => {
      workoutSeconds++;
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

function initWorkoutForm() {
  resetWorkoutTimer();
  if(!state) return;

  const type = state.nextType;
  const prog = PROGRAM[type];

  const titleEl = document.getElementById('seance-type-title');
  if(titleEl) titleEl.innerText = prog.title;
  
  const badge = document.getElementById('seance-badge');
  if(badge) {
    badge.innerText = type;
    badge.className = `badge ${prog.badge}`;
  }

  const subHeader = document.getElementById('sub-header');
  if(subHeader) subHeader.innerText = `Prochaine séance : ${type}`;

  const container = document.getElementById('exercises-list');
  if(!container) return;
  container.innerHTML = '';

  prog.exercises.forEach((ex) => {
    const div = document.createElement('div');
    div.className = 'exercise-item';

    const suggestedWeight = getLastWeightForExercise(ex.name, ex.defaultWeight);

    let rowsHtml = '';
    for (let s = 1; s <= ex.seriesCount; s++) {
      rowsHtml += `
        <div class="set-row">
          <span class="set-label">Série ${s}</span>
          <input type="number" step="0.5" class="set-input weight-input" data-ex="${ex.name}" placeholder="kg" value="${suggestedWeight}" oninput="markInputActive(this)">
          <input type="number" class="set-input reps-input" data-ex="${ex.name}" placeholder="reps" value="${ex.defaultReps}" oninput="markInputActive(this)">
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
        exLog = { name: exName, maxWeight: w, totalVolume: 0 };
        exerciseLogs.push(exLog);
      }
      if(w > exLog.maxWeight) exLog.maxWeight = w;
      exLog.totalVolume += setVolume;

      state.lastWeights[exName] = w;
    });

    const sessionDuration = getFormattedWorkoutDuration();
    const type = state.nextType;
    const today = new Date().toISOString().slice(0,10);
    const entry = {
      id: Date.now(),
      date: today,
      type: type,
      tonnage: Math.round(totalTonnage),
      duration: sessionDuration,
      exercises: exerciseLogs
    };

    state.history.push(entry);
    state.nextType = type === 'A' ? 'B' : (type === 'B' ? 'C' : 'A');
    saveState();

    alert(`Séance enregistrée !\n• Temps : ${sessionDuration}\n• Tonnage : ${entry.tonnage.toLocaleString()} kg\n\n⌚ Pense à couper le suivi de ta montre !`);
    initWorkoutForm();
    renderHistory();
    renderCharts();
  }
});

function populateExerciseSelect() {
  const select = document.getElementById('exercise-filter');
  if(!select) return;
  select.innerHTML = '';
  
  let allExercises = [];
  Object.values(PROGRAM).forEach(p => {
    p.exercises.forEach(e => {
      if(!allExercises.find(x => x.name === e.name)) {
        allExercises.push(e);
      }
    });
  });

  allExercises.forEach(ex => {
    const opt = document.createElement('option');
    opt.value = ex.name;
    opt.innerText = ex.name;
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
      const exData = h.exercises.find(e => e.name === selectedEx);
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

  [...state.history].reverse().forEach(h => {
    const div = document.createElement('div');
    div.className = 'history-item';
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
    // Fallback pour PC ou navigateurs non compatibles
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
      // Réinitialise l'input pour permettre de réimporter le même fichier si nécessaire
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