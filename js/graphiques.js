// Copyright (c) 2026 Jean-Philippe Alexander. Mon Carnet de Salle.
// SPDX-License-Identifier: PolyForm-Strict-1.0.0 (voir LICENSE et NOTICE)
// Onglet Progression : filtres et courbes (ancienne section 12 de app.js) — sorti de app.js tel quel en 1.8.90 (co-auteur : Claude), aucun changement de fonctionnement.
// Chargé juste après app.js (index.html) ; fonctions et variables globales, comme dans app.js.

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

// 1.8.46 : le filtre « A / B / C » de la tuile ne propose que les séances déjà faites au moins une fois
function statsFilterLetters(scope = currentStatsScope()) {
  const done = new Set(statsHistory(scope).map(h => h.sessionKey || h.type));
  return statsLetters(scope).filter(k => done.has(k));
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

// 1.8.69 : statut d'un périmètre en HTML : point vert devant « En cours », « En pause depuis… » en ambre
function statsScopeStatusHtml(scope) {
  const p = scope !== 'all' && getProgram(scope);
  const txt = escapeHtml(statsScopeStatusText(scope));
  if (p && p.status === 'active') return `<span class="prog-dot on"></span>${txt}`;
  if (p && !isLibre(p) && p.status !== 'active' && p.status !== 'new') return `<span class="scope-pause">${txt}</span>`;
  return txt;
}

function renderStatsScopeButton() {
  const btn = document.getElementById('stats-scope-btn');
  if (!btn) return;
  const scope = currentStatsScope();
  const libre = statsScopeIsLibre(scope);
  const active = scope !== 'all' && getProgram(scope) && getProgram(scope).status === 'active';
  btn.innerHTML = `
    <span class="mem-ico${libre ? ' libre' : ''}${scope === 'all' ? ' grid' : ''}">${scope === 'all' ? GRID_SVG : (libre ? '1×' : SWAP_SVG)}</span>
    <span class="scope-text"><span class="scope-name">${escapeHtml(statsScopeName(scope))}</span><span class="scope-sub">${statsScopeStatusHtml(scope)}</span></span>
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
        <span class="restore-text"><span class="restore-name"><b>${escapeHtml(it.name)}</b></span><span class="restore-when">${it.has ? statsScopeStatusHtml(it.id) : 'Pas encore de séance'}</span></span>
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
  populateExerciseSelect();
  renderCharts();
}

// 1.8.46 : séance choisie dans la tuile de progression (filtre « A / B / C ») → ses exercices seulement
function statsSessionFilterLetter() {
  return currentVolumeFilter === 'type' && statsFilterLetters().includes(currentSessionTypeFilter) ? currentSessionTypeFilter : null;
}
function statsSessionExerciseNames(letter, scope = currentStatsScope()) {
  const names = [];
  const add = n => { n = canonicalExerciseName(n); if (!names.includes(n)) names.push(n); };
  const any = letter === '*'; // '*' : toute la séance libre choisie
  const progs = scope === 'all' ? getPrograms() : [getProgram(scope)].filter(Boolean);
  progs.forEach(p => p.sessions.forEach(s => { if (any || s.key === letter) (s.exercises || []).forEach(e => add(exInfo(e.exId).name)); }));
  statsHistory(scope).forEach(h => { if (any || (h.sessionKey || h.type) === letter) (h.exercises || []).forEach(ex => add(ex.name)); });
  return names;
}
// 1.8.48 : séance libre choisie dans « Voir les statistiques de » → ses exercices et ses passages seulement,
// comme une séance choisie dans la tuile ('*' = toute la séance libre)
function statsFocusLetter() {
  const l = statsSessionFilterLetter();
  if (l) return l;
  return statsScopeIsLibre() ? '*' : null;
}
function statsFocusHistory() {
  const l = statsFocusLetter();
  if (!l) return null;
  return statsHistory().filter(h => l === '*' || (h.sessionKey || h.type) === l);
}
// Après un changement de séance filtrée : listes et graphiques par exercice et cardio suivent
function refreshSessionFilteredCharts() {
  populateExerciseSelect();
  renderExerciseChart();
  renderCardioChart();
}

// Exercices à charge (filtrés selon le scope statistique sélectionné), ceux du programme actif d'abord
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
  const letter = statsFocusLetter();
  const card = document.getElementById('exercise-card');
  if (letter) {
    statsSessionExerciseNames(letter).forEach(add);
    names.forEach(exName => { const opt = document.createElement('option'); opt.value = exName; opt.innerText = exName; select.appendChild(opt); });
    if (names.includes(previous)) select.value = previous;
    if (card) card.hidden = names.length === 0; // séance de cardio seul : pas de graphique par exercice
    return;
  }
  if (card) card.hidden = false;
  
  const scope = currentStatsScope();
  if (scope === 'all') {
    // Mode "Tous les programmes" : afficher uniquement les exercices déjà réalisés dans l'historique
    (state.history || []).forEach(h => (h.exercises || []).forEach(ex => { if (!ex.cardio) add(ex.name); }));
  } else {
    // Mode programme/séance spécifique : afficher uniquement les exercices déjà réalisés dans ce scope
    const hist = statsHistory(scope);
    hist.forEach(h => (h.exercises || []).forEach(ex => { if (!ex.cardio) add(ex.name); }));
  }

  names.sort((a, b) => a.localeCompare(b, 'fr'));
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
  const letters = statsFilterLetters();
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
  refreshSessionFilteredCharts();
}

// Chaque appui fait défiler les séances : A, puis B, puis C, puis A...
// (le premier appui, depuis un autre filtre, démarre toujours sur A)
function cycleSessionTypeFilter(btn) {
  const letters = statsFilterLetters();
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
  refreshSessionFilteredCharts();
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
  let deloadFlags = []; // 1.8.0 : séances de déload (plume sous le point)
  const hist = statsHistory();
  if (currentVolumeFilter === 'type' && !statsFilterLetters().includes(currentSessionTypeFilter)) { currentVolumeFilter = 'all'; updateSessionTypeButton(); }
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
      deloadFlags = typedHistory.map(e => !!e.isDeload);
    }
  } else {
    // --- VUE PAR SÉANCE (toutes les séances) ---
    const sortedHistory = [...hist].sort((a, b) => new Date(a.date) - new Date(b.date));

    labels = sortedHistory.map(e => `${e.type} (${formatDate(e.date)})`);
    data = sortedHistory.map(e => parseFloat(e.tonnage) || 0);
    deloadFlags = sortedHistory.map(e => !!e.isDeload);
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
      if (e.isDeload) d.deload = true;
    });
    const keys = Object.keys(byDay).sort();
    if (keys.length > 0) {
      const toUtc = k => { const [y, m, d] = k.split('-').map(Number); return Date.UTC(y, m - 1, d); };
      const iso = t => new Date(t).toISOString().slice(0, 10);
      const now = new Date();
      const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
      const start = toUtc(keys[0]);
      const end = Math.max(today, toUtc(keys[keys.length - 1]));
      labels = []; data = []; dayDetails = []; deloadFlags = [];
      for (let t = start; t <= end; t += 86400000) {
        const k = iso(t);
        labels.push(k);
        data.push(byDay[k] ? byDay[k].tonnage : null);
        dayDetails.push(byDay[k] || null);
        deloadFlags.push(!!(byDay[k] && byDay[k].deload));
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
    },
    plugins: [deloadMarksPlugin(deloadFlags, '#fff')]
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
  // 1.7.34 : 1RM estimé (Epley : charge × (1 + reps / 30)), meilleure série de 10 répétitions ou moins de la séance ;
  // seulement en « Charge max » et pour les exercices saisis en kg × répétitions
  const showRm = currentExMetricMode !== 'volume' && exInfo(selectedEx).mode === 'weight';
  // 1.7.35 : exercice au poids du corps → « Répétitions » (meilleure série de la séance) au lieu d'une charge plate
  const isBw = exInfo(selectedEx).mode === 'bw';
  const repsMode = isBw && currentExMetricMode !== 'volume';
  // 1.8.111 (co-auteur : Claude) : la courbe ne montre que les séances du programme (ou de la séance) choisi,
  // mais les records (coupe, étoile, légende) se calculent sur tout l'historique, tous programmes confondus.
  const lestData = [];
  const exDeload = []; // 1.8.0 : séances de déload (plume sous le point)
  const maxBtn = document.getElementById('btn-mode-max');
  if (maxBtn) maxBtn.textContent = isBw ? 'Répétitions' : 'Charge max';

  const exSeries = (list, full) => {
    const out = { labels: [], dates: [], ids: [], data: [], rm: [] };
    (list || []).forEach(h => {
      if (!h.exercises) return;
      const exData = mergeExercises(h.exercises).find(e => isSelected(e.name));
      // On ignore les séances où l'exercice n'a pas été réellement fait (séries à 0 kg / 0 rép.)
      // pour ne pas tracer de faux creux à 0 dans la progression.
      const performedSets = (exData && Array.isArray(exData.sets)) ? exData.sets.filter(isPerformedSet) : null;
      const wasPerformed = performedSets ? performedSets.length > 0 : !!(exData && (exData.maxWeight || 0) > 0);
      if (!exData || !wasPerformed) return;
      out.ids.push(h.id);
      if (full) {
        out.labels.push(`${h.type} (${formatDate(h.date)})`);
        out.dates.push(h.date);
        exDeload.push(!!h.isDeload);
      }
      if (currentExMetricMode === 'volume') {
        out.data.push(exData.totalVolume || 0);
      } else if (repsMode) {
        const best = bestBodyweightSet(performedSets || []);
        out.data.push(best ? best.reps : 0);
        if (full) lestData.push(best ? best.lest : 0);
      } else {
        // Charge max calculée sur les séries réellement faites uniquement
        out.data.push(performedSets
          ? Math.max(...performedSets.map(s => parseFloat(s.weight) || 0))
          : (exData.maxWeight || 0));
        if (showRm) out.rm.push(estimateOneRepMax(performedSets));
      }
    });
    return out;
  };
  // 1.8.46 : séance choisie dans la tuile → seulement ses passages ; 1.8.111 : sinon le programme choisi
  const shown = exSeries(statsFocusHistory() || statsHistory(), true);
  const whole = exSeries(state.history, false);
  const labels = shown.labels, chartData = shown.data, dates = shown.dates, rmData = shown.rm;

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
  // 1.8.11 : records de l'exercice (charge max et meilleur 1RM estimé de tout l'historique), dernier en date si égalité
  // 1.8.111 : records de tout l'historique ; la marque ne se pose que si la séance du record est affichée
  const recMaxW = whole.data.length ? Math.max(...whole.data) : null;
  const recMaxIdx = hasRm ? shown.ids.indexOf(whole.ids[whole.data.lastIndexOf(recMaxW)]) : -1;
  const recRmAll = whole.rm.filter(v => v !== null);
  const recRm = recRmAll.length ? Math.max(...recRmAll) : null;
  const recRmIdx = hasRm ? shown.ids.indexOf(whole.ids[whole.rm.lastIndexOf(recRm)]) : -1;
  const hasReps = repsMode && chartData.length > 0;
  const legend = document.getElementById('exercise-legend');
  const rmNote = document.getElementById('exercise-rm-note');
  const bwNote = document.getElementById('exercise-bw-note');
  if (legend) {
    legend.hidden = !(hasRm || hasReps);
    legend.classList.toggle('reps', hasReps);
    if (hasRm) {
      // 1.8.11 : deux records indépendants : charge max (trophée) et meilleur 1RM estimé (étoile).
      // Le 1RM ne se calcule que sur des séries de 10 rép. ou moins : il ne peut pas toujours venir de la charge max.
      document.getElementById('exercise-legend-max-label').textContent = 'Charge max';
      document.getElementById('exercise-legend-rm-label').textContent = '1RM estimé';
      document.getElementById('exercise-legend-max').innerHTML = escapeHtml(formatKgHalf(recMaxW)) + '<span class="ex-legend-mark">' + BADGE_SVG + '</span>';
      document.getElementById('exercise-legend-rm').innerHTML = escapeHtml(formatKgHalf(recRm)) + '<span class="ex-legend-mark star">' + STAR_SVG + '</span>';
    } else if (hasReps) {
      document.getElementById('exercise-legend-max-label').textContent = 'Meilleure série';
      document.getElementById('exercise-legend-rm-label').textContent = 'Record';
      document.getElementById('exercise-legend-max').textContent = repsText(chartData[chartData.length - 1]);
      document.getElementById('exercise-legend-rm').textContent = repsText(Math.max(...whole.data)); // 1.8.111 : record de tout l'historique
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
      layout: { padding: { top: hasRm ? 24 : 0 } }, // 1.8.11 : place pour le trophée et l'étoile
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
    plugins: [bandPlugin, deloadMarksPlugin(exDeload, CHART_COLORS.warn), recordMarksPlugin(recMaxIdx, recRmIdx, CHART_COLORS.trophy)]
  });
  exerciseChart.recordIdx = { max: recMaxIdx, rm: recRmIdx }; // 1.8.111 : pour les tests
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
  const letter = statsFocusLetter();
  if (letter) { statsSessionExerciseNames(letter, scope).forEach(add); return names; } // 1.8.46–1.8.48
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
  (statsFocusHistory() || statsHistory()).forEach(h => { // 1.8.46–1.8.48 : séance choisie → ses passages seulement
    const ex = (h.exercises || []).find(e => sameExercise(e.name, name));
    const set = ex && Array.isArray(ex.sets) ? ex.sets.find(isPerformedCardioSet) : null;
    if (set && h.date) points.push({ date: h.date, v: cardioMetric(name, set), deload: !!h.isDeload });
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
    },
    plugins: [deloadMarksPlugin(points.map(p => p.deload), CHART_COLORS.warn)]
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
