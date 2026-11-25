// Copyright (c) 2026 Jean-Philippe Alexander. Mon Carnet de Salle.
// SPDX-License-Identifier: PolyForm-Strict-1.0.0 (voir LICENSE et NOTICE)
// Onglet Séance : séries, exercices, formulaire, enregistrement et fenêtre de fin de séance (anciennes sections 9 et 10 de app.js) — sorti de app.js tel quel en 1.8.90 (co-auteur : Claude), aucun changement de fonctionnement.
// Chargé juste après app.js (index.html) ; fonctions et variables globales, comme dans app.js.

// ============================================================
// 9. ÉCRAN SÉANCE : SÉRIES ET EXERCICES
// ============================================================
// Mode de saisie (catalogue) -> contenu des deux champs d'une ligne de série :
//   weight : kg · réps          bw : lest (kg, vide = PDC) · réps        reps : réps seules
//   time : durée (min:ss)        dist : durée · distance (m ou km)        floors : durée · étages
function sameExercise(a, b) { return canonicalExerciseName(a) === canonicalExerciseName(b); }

// 1.7.59 (co-auteur : Claude) : un même exercice peut revenir plusieurs fois dans une séance.
// Chaque passage a son rang « occ » (0 = premier, absent dans les anciennes données) : il est enregistré
// dans l'historique pour que chaque passage reprenne ses propres charges la fois suivante.
function exOccOf(e) { return Number(e && e.occ) || 0; }
function findExerciseOcc(list, name, occ) {
  return (list || []).find(e => e && sameExercise(e.name, name) && exOccOf(e) === (occ || 0)) || null;
}
// Pour les calculs (Progression, records, paliers) : les passages d'un même exercice sont additionnés
// (séries mises bout à bout, tonnage additionné, charge max = la meilleure).
function mergeExercises(list) {
  const out = [], byName = new Map();
  (list || []).forEach(ex => {
    if (!ex) return;
    const key = ex.name ? canonicalExerciseName(ex.name) : '';
    const prev = key ? byName.get(key) : null;
    if (!prev) {
      const copy = Object.assign({}, ex, { sets: Array.isArray(ex.sets) ? ex.sets.slice() : ex.sets });
      delete copy.occ;
      out.push(copy);
      if (key) byName.set(key, copy);
      return;
    }
    if (Array.isArray(ex.sets)) prev.sets = (Array.isArray(prev.sets) ? prev.sets : []).concat(ex.sets);
    prev.totalVolume = (Number(prev.totalVolume) || 0) + (Number(ex.totalVolume) || 0);
    prev.maxWeight = Math.max(Number(prev.maxWeight) || 0, Number(ex.maxWeight) || 0);
  });
  return out;
}

function getSuggestedSetValues(exName, setIndex, fallbackWeight, fallbackReps, occ = 0) {
  const mode = exMode(exName);
  let foundSet = null;

  // On parcourt l'historique du plus récent au plus ancien, en ignorant les séances de déload
  // (on va chercher la dernière vraie charge normale)
  for (let i = state.history.length - 1; i >= 0; i--) {
    const h = state.history[i];
    if (h.isDeload || !h.exercises) continue;
    const foundEx = findExerciseOcc(h.exercises, exName, occ);
    // On ne reprend qu'une série réellement faite : les séries non faites sont ignorées
    // et on remonte à la dernière séance où cette série a vraiment été réalisée.
    if (foundEx && foundEx.sets && isPerformedSet(foundEx.sets[setIndex])) {
      foundSet = { ...foundEx.sets[setIndex] };
      break;
    }
  }
  // Passage suivant jamais fait : on reprend les charges du premier passage
  if (!foundSet && occ > 0) return getSuggestedSetValues(exName, setIndex, fallbackWeight, fallbackReps, 0);

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
function getSuggestedCardioValues(exName, defSeconds, defMeters, occ = 0) {
  for (let i = state.history.length - 1; i >= 0; i--) {
    const ex = findExerciseOcc(state.history[i].exercises, exName, occ);
    const set = ex && Array.isArray(ex.sets) ? ex.sets.find(isPerformedCardioSet) : null;
    if (set) return { seconds: set.seconds, meters: set.meters, floors: set.floors };
  }
  if (occ > 0) return getSuggestedCardioValues(exName, defSeconds, defMeters, 0);
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
  const occ = exOccOf(btn.closest('.exercise-item').dataset);

  // La nouvelle série reprend les valeurs de la dernière ;
  // à défaut (aucune série), on utilise la suggestion du programme.
  let weightVal, repsVal;
  if (last) {
    weightVal = last.querySelector('.weight-input').value;
    repsVal = last.querySelector('.reps-input').value;
  } else {
    const suggested = getSuggestedSetValues(exName, 0, '', defaultRepsFor(exName), occ);
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
function exerciseLastTimeText(exName, occ = 0) {
  const info = exInfo(exName);
  const history = (state && state.history) ? state.history : [];
  if (occ && !history.some(h => findExerciseOcc(h.exercises, exName, occ))) occ = 0; // passage jamais fait : le premier
  for (let i = history.length - 1; i >= 0; i--) {
    const h = history[i];
    if (editingOriginalId !== null && h.id === editingOriginalId) continue; // pas la séance en cours de modification
    const ex = findExerciseOcc(h.exercises, exName, occ);
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
  return `Première fois · ${n} × ${activePrescription(exName).reps}${info.mode === 'time' ? '' : ' réps'}`;
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
    item.querySelector('.ex-sub').textContent = open ? exerciseLastTimeText(item.dataset.ex, exOccOf(item.dataset)) : exerciseSummaryText(item);
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
    // 1.7.59 : le passage de même rang (un exercice peut revenir plusieurs fois dans la séance)
    const found = list.filter(e => e.name === name)[exOccOf(ex)];
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
  if (deloadSubEl) {
    if (isDeloadActive()) {
      // 1.7.96 : bouton pleine largeur, ouvre l'explication avec « Reporter »
      deloadSubEl.innerHTML = DELOAD_SVG + '<span class="deload-btn-label">Déload −20 %</span><span class="deload-btn-chevron">' + INFO_SVG + '</span>'; // 1.8.2 : (i) au lieu du chevron (INFO_SVG : js/programmes.js)
      deloadSubEl.disabled = !!customSession;
      deloadSubEl.style.display = 'flex';
    } else {
      deloadSubEl.innerHTML = '';
      deloadSubEl.style.display = 'none';
    }
  }
  if (actionsEl) {
    if (customSession) actionsEl.innerHTML = '';
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

  const occSeen = {};
  def.exercises.forEach((ex) => {
    const info = exInfo(ex.name);
    const div = document.createElement('div');
    div.className = 'exercise-item';
    // 1.7.59 : rang du passage quand l'exercice revient plusieurs fois dans la séance
    const occ = occSeen[ex.name] = occSeen[ex.name] === undefined ? 0 : occSeen[ex.name] + 1;

    let existingEx = null;
    if (customSession && customSession.exercises) {
      existingEx = findExerciseOcc(customSession.exercises, ex.name, occ);
    }

    let rowsHtml = '';
    if (info.cardio) {
      let secVal, amtVal = '', preChecked = false;
      const saved = existingEx && existingEx.sets && existingEx.sets[0];
      if (saved && isPerformedCardioSet(saved)) {
        secVal = saved.seconds; amtVal = formatCardioAmountInput(ex.name, saved); preChecked = true;
      } else {
        const isRower = ex.name === ROWER_NAME;
        const sg = getSuggestedCardioValues(ex.name, isRower ? ROWER_DEFAULTS.seconds : '', isRower ? ROWER_DEFAULTS.meters : undefined, occ);
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
          const lastSet = getSuggestedSetValues(ex.name, s - 1, '', defaultRepsFor(ex.name), occ);
          weightVal = lastSet.weight;
          repsVal = lastSet.reps;
        }
        rowsHtml += setRowHtml(ex.name, s, weightVal, repsVal, preChecked);
      }
    }

    div.dataset.ex = ex.name;
    div.dataset.occ = occ;
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

  // 1.7.42 (co-auteur : Claude) : phrase d'échauffement du premier exercice de force (dans son corps depuis 1.8.18)
  // (cardio éventuel au-dessus), cachée si la séance n'a que du cardio
  if (warm) {
    const firstStrength = [...container.querySelectorAll('.exercise-item')].find(el => !exInfo(el.dataset.ex).cardio);
    // 1.8.18 : dans le premier exercice de force, entre sa ligne (icône, nom) et les intitulés Série / Kg / Réps :
    // elle n'apparaît qu'à son ouverture
    if (firstStrength) { const body = firstStrength.querySelector('.ex-body'); body.insertBefore(warm, body.firstChild); }
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

  // 1.8.79 : préparer la séance sans modifier l'état courant tant que l'écriture locale peut échouer.
  const nextState = { ...state, history: state.history.slice(), lastWeights: { ...state.lastWeights } };
  if (Array.isArray(state.programs)) nextState.programs = JSON.parse(JSON.stringify(state.programs));

  // 1.7.59 : un journal par passage (un exercice peut revenir plusieurs fois dans la séance)
  const logFor = (exName, cardio, occ = 0) => {
    let exLog = exerciseLogs.find(x => x.name === exName && exOccOf(x) === occ);
    if (!exLog) {
      exLog = { name: exName, sets: [], maxWeight: 0, totalVolume: 0 };
      const id = exInfo(exName).id;
      if (id) exLog.exId = id;
      if (cardio) exLog.cardio = true;
      if (occ) exLog.occ = occ;
      exerciseLogs.push(exLog);
    }
    return exLog;
  };

  validatedRows.forEach((row) => {
    const wInput = row.querySelector('.weight-input');
    const rInput = row.querySelector('.reps-input');
    const exName = wInput.dataset.ex;
    const occ = exOccOf(row.closest('.exercise-item').dataset);
    const mode = exMode(exName);
    if (mode === 'dist' || mode === 'floors' || (mode === 'time' && isCardioName(exName))) {
      const set = { weight: 0, reps: 0, seconds: parseDurationInput(wInput.value) };
      if (mode === 'dist') set.meters = parseCardioAmount(exName, rInput.value);
      if (mode === 'floors') set.floors = parseCardioAmount(exName, rInput.value);
      logFor(exName, true, occ).sets.push(set);
      return;
    }
    if (mode === 'time') { logFor(exName, false, occ).sets.push({ weight: 0, reps: 0, seconds: parseDurationInput(wInput.value), hold: true }); return; }
    const r = Number(rInput.value);
    if (mode === 'reps') { logFor(exName, false, occ).sets.push({ weight: 0, reps: r, free: true }); return; }

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
    const exLog = logFor(exName, false, occ);
    exLog.sets.push(set);
    exLog.totalVolume += setVolume;
    if (w > exLog.maxWeight) exLog.maxWeight = w;

    // On ne touche pas aux dernières charges quand on corrige une ancienne séance
    if (!isEditing && mode === 'weight') nextState.lastWeights[exName] = w;
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
    const originalIdx = nextState.history.findIndex(h => h.id === editingOriginalId);
    if (originalIdx !== -1) nextState.history.splice(originalIdx, 1);
  }

  nextState.history.push(entry);
  nextState.history.sort((a, b) => new Date(a.date) - new Date(b.date));

  // Programme : le nombre de séries fait devient la référence ; la rotation passe à la séance suivante.
  // Une séance libre reste active.
  const programs = getPrograms(nextState);
  const p = def.programId ? programs.find(pr => pr.id === def.programId) : null;
  if (p && !isEditing) {
    const session = isLibre(p) ? p.sessions[0] : p.sessions.find(s => s.key === def.key);
    if (session) {
      items.forEach((item, idx) => {
        const info = exInfo(item.dataset.ex);
        if (info.cardio) return;
        // 1.7.59 : par position (un exercice peut revenir plusieurs fois), le premier du même nom à défaut
        const atIdx = session.exercises[idx];
        const pe = atIdx && atIdx.exId === info.id ? atIdx : session.exercises.find(x => x.exId === info.id);
        if (pe) pe.sets = item.querySelectorAll('.set-row').length;
      });
    }
  }
  programs.forEach(pr => { if (!isLibre(pr)) pr.nextKey = nextKeyFromHistory(pr, nextState.history); });
  if (state.deload && !isEditing) nextState.deload = { ...state.deload, postponedAt: null };
  syncNextType(nextState);

  try {
    writeLocalState(nextState);
  } catch (e) {
    appAlert('Séance non enregistrée', "Impossible d'écrire dans le stockage de cet appareil. Ta saisie est toujours à l'écran. Vérifie l'espace disponible, puis réessaie.", 'warn');
    return;
  }
  state = nextState;

  clearEditState();
  localStorage.removeItem('workout_start_time');
  // Une séance enregistrée vide le brouillon ; une modification d'ancienne séance le laisse intact
  if (!isEditing) clearDraft();

  scheduleDriveSync();

  // Sauvegarde automatique Google Drive (si connecté) : fichier de sauvegarde complète mis à jour.
  // 1.7.63 : après une nouvelle séance, l'envoi (et une éventuelle reconnexion à Google, qui quitte l'application)
  // attend le « OK » de la fenêtre de fin de séance, pour ne pas la faire disparaître avant qu'on l'ait lue.
  // 1.8.84 : en modification, l'envoi part tout de suite, avec la barre de l'Historique (voir plus bas)
  if (!isEditing) { finishPendingBackup = true; finishSavedId = entry.id; }

  // Actualise la bannière de déload en temps réel
  displayDeloadNotificationIfNeeded();

  const usedBodyweight = exerciseLogs.some(x => x.sets.some(st => st.lest !== undefined));
  const weighNotice = usedBodyweight && !bodyKg ? '\n• Poids du corps non renseigné : seul le lest est compté (ajoute ta pesée dans Progression)' : '';
  if (isEditing) {
    // 1.8.84 (co-auteur : Claude) : retour à l'Historique, avec la même barre de sauvegarde qu'en fin de séance,
    // sur la ligne de la séance modifiée ; sans compte Drive, un court message « Séance modifiée »
    initWorkoutForm();
    renderHistory();
    renderCharts();
    switchTab('historique');
    const row = document.querySelector(`.history-item[data-id="${entry.id}"]`);
    if (row && row.scrollIntoView) row.scrollIntoView({ block: 'center' });
    const driveOn = isDriveWanted() || !!getDriveToken();
    const notes = weighNotice.replace(/^\n• /, '');
    if (driveOn) {
      trackHistorySave(entry.id, () => backupToDrive({ forceReconnect: true, historyId: entry.id }));
      if (notes) showToast(notes);
    } else {
      showToast('Séance modifiée' + (notes ? '\n' + notes : ''));
    }
    return;
  } else {
    // Fin de séance (1.7.27) : fenêtre « Bravo ! » ; les éventuels avertissements suivent en message
    openFinishDialog(entry, previousEntry, records);
    const notes = (weighNotice + driveSaveNotice(true)).replace(/^\n• /, '').replace(/\n• /g, '\n');
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
  mergeExercises(entry.exercises).forEach(ex => {
    const rule = recordRule(ex.name, ex.cardio);   // 1.7.89 : allure ou vitesse pour le cardio, pas la durée
    if (!rule) return;
    const cur = recordBest(rule, ex.sets);
    if (!cur) return;
    let prevSets = [], seen = false;
    others.forEach(h => (h.exercises || []).forEach(x => {
      if (x.name !== ex.name && !(ex.exId && x.exId === ex.exId)) return;
      seen = true;
      prevSets = prevSets.concat(x.sets || []);
    }));
    const prev = recordBest(rule, prevSets);
    if (seen && recordBeats(rule, cur, prev)) out.push({ name: ex.name, value: rule.kind === 'weight' ? `${cur.toLocaleString('fr-FR')} kg` : recordTexts(ex.name, rule, cur, prev).value });
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
  html += `<button type="button" class="btn finish-ok" onclick="finishDialogOk()">OK</button>`;
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

// 1.7.63 : « OK » de la fenêtre de fin de séance → la sauvegarde Drive de la séance part maintenant
// (reconnexion à Google comprise si l'accès a expiré). Sans « OK » (application fermée), elle part au
// prochain lancement ou avec la prochaine séance, comme une sauvegarde en attente.
let finishPendingBackup = false;
let finishSavedId = null;
// 1.8.50 (co-auteur : Claude) : après « OK », l'Historique s'ouvre ; si un compte Drive est configuré, une fine barre
// verte se déploie sous la nouvelle séance pendant l'envoi (reconnexion forcée si l'accès a expiré), puis
// « Sauvegardée sur le Drive » et la ligne redevient normale (planche 27d, variante C).
function finishDialogOk() {
  closeFinishDialog();
  const id = finishSavedId;
  finishSavedId = null;
  if (!finishPendingBackup) return;
  finishPendingBackup = false;
  switchTab('historique');
  const scroller = document.getElementById('app-scroll');
  if (scroller) scroller.scrollTop = 0;
  if (!isDriveWanted() && !getDriveToken()) return; // pas de compte Drive : l'Historique s'ouvre, sans barre
  trackHistorySave(id, () => backupToDrive({ forceReconnect: true, historyId: id }));
}

// Barre de sauvegarde sur une ligne de l'Historique : { id, status: 'saving' | 'done' | 'wait' }
let historySaveMark = null;
let historySaveTimer = null;
const HIST_SAVE_MARK_KEY = 'h49_hist_save_mark'; // séance dont la sauvegarde attend le retour de Google (10 min)
function setHistorySaveMark(id, status) {
  clearTimeout(historySaveTimer);
  historySaveMark = id == null ? null : { id, status };
  const row = document.querySelector(`.history-item[data-id="${id}"]`);
  if (row) applyHistorySaveMark(row); else if (document.body.dataset.tab === 'historique') renderHistory();
  if (status === 'done' || status === 'wait') {
    historySaveTimer = setTimeout(() => {
      const prev = historySaveMark && historySaveMark.id;
      historySaveMark = null;
      const r = document.querySelector(`.history-item[data-id="${prev}"]`);
      if (r) applyHistorySaveMark(r);
    }, status === 'done' ? 1800 : 3500);
  }
}
function applyHistorySaveMark(row) {
  const on = historySaveMark && String(historySaveMark.id) === row.dataset.id ? historySaveMark.status : '';
  row.classList.toggle('saving', on === 'saving');
  row.classList.toggle('saved', on === 'done');
  row.classList.toggle('save-wait', on === 'wait');
  row.classList.toggle('save-mark', !!on);
  const lab = row.querySelector('.history-save-label');
  if (lab) lab.innerHTML = on === 'saving' ? 'Sauvegarde sur le Drive…' : on === 'done' ? `${CHECK_SVG}Sauvegardée sur le Drive` : on === 'wait' ? 'Sauvegarde en attente' : '';
}
async function trackHistorySave(id, run) {
  setHistorySaveMark(id, 'saving');
  let res = 'fail';
  try { res = await run(); } catch (e) { res = 'fail'; }
  if (res === 'redirect') return; // l'application part chez Google ; la barre reprend au retour
  setHistorySaveMark(id, res === 'ok' ? 'done' : 'wait');
}

document.addEventListener('submit', function(e) {
  if (e.target && e.target.id === 'workout-form') submitWorkout(e);
});
