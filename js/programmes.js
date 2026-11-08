// Suivi Fitness : onglet Programme (programmes sur mesure et séances libres, écrans 1 à 21 de la maquette).
// Co-auteur : Claude. Chargé après app.js : utilise ses fonctions et son état global (state, saveState, switchTab…).
//
// SOMMAIRE
//   1. ÉTAT DE L'ÉCRAN
//   2. ACCUEIL : ÉLÉMENT ACTIF ET « EN MÉMOIRE »
//   3. ACTIVATION
//   4. CHOIX : PROGRAMME OU SÉANCE LIBRE
//   5. ÉDITEUR (création et modification)
//   6. AJOUTER UN EXERCICE
//   7. SUPPRIMER
//   8. RESTAURER DES PROGRAMMES DEPUIS GOOGLE DRIVE
//   9. APPUI LONG ET FEUILLES DU BAS

// ============================================================
// 1. ÉTAT DE L'ÉCRAN
// ============================================================
// view : 'home' (accueil), 'choose' (écran 4), 'editor' (écrans 5, 6, 9, 17, 20)
let programView = 'home';
let programDetailOpen = false;
// Brouillon de l'éditeur : { id (null = création), kind, name, sessions: [{ key, name, exercises: [{ exId, sets }] }], idx, start }
let programDraft = null;

const SWAP_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 2l3 3-3 3"/><path d="M20 5H8a5 5 0 0 0-5 5"/><path d="M7 22l-3-3 3-3"/><path d="M4 19h12a5 5 0 0 0 5-5"/></svg>';
const BACK_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
const PEN_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg>';
const ARROW_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
const DOTS_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/></svg>';
const HANDLE_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="6" r="1.4"/><circle cx="15" cy="6" r="1.4"/><circle cx="9" cy="12" r="1.4"/><circle cx="15" cy="12" r="1.4"/><circle cx="9" cy="18" r="1.4"/><circle cx="15" cy="18" r="1.4"/></svg>';
const TRASH_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>';
const CLOSE_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
const SEARCH_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>';
const CLOUD_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 18a5 5 0 1 1 1-9.9A6 6 0 0 1 19.5 10 4 4 0 0 1 18 18"/><path d="M12 12v8M9 17l3 3 3-3"/></svg>';
const GRID_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="6.5" height="6.5" rx="2"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="2"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="2"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="2"/></svg>';

function setProgramView(view) {
  programView = view;
  document.body.dataset.pview = view;
  updateProgramHeader();
  renderProgramOverview();
  const scroller = document.getElementById('app-scroll');
  if (scroller) scroller.scrollTop = 0;
}

// Bouton + de l'en-tête : seulement sur l'accueil de l'onglet Programme
function updateProgramHeader() {
  const add = document.getElementById('add-program-btn');
  if (add) add.style.display = (document.body.dataset.tab || 'programme') === 'programme' && programView === 'home' ? 'flex' : 'none';
}

// ============================================================
// 2. ACCUEIL : ÉLÉMENT ACTIF ET « EN MÉMOIRE »
// ============================================================
function programTilesHtml(exercises) {
  return exercises.map(e => {
    const name = exInfo(e.exId).name;
    return `
    <div class="ex-tile">
      <div class="ex-icon-badge">${getIcon(name)}</div>
      <span>${escapeHtml(name)}</span>
    </div>`;
  }).join('');
}

function renderProgramOverview() {
  const container = document.getElementById('program-overview');
  if (!container || !state) return;
  document.body.dataset.pview = programView;
  updateProgramHeader();
  if (programView === 'choose') { container.innerHTML = chooserHtml(); return; }
  if (programView === 'editor' && programDraft) { container.innerHTML = editorHtml(); bindEditor(); return; }
  programView = 'home';
  document.body.dataset.pview = 'home';
  updateProgramHeader();

  const programs = getPrograms();
  if (!programs.length) { container.innerHTML = emptyProgramsHtml(); return; }

  const active = getActiveProgram();
  const others = programs.filter(p => p !== active);
  // Les tuiles sont alignées vers le bas de l'écran, au-dessus de la barre de navigation (maquette)
  let html = '<div class="prog-spacer" aria-hidden="true"></div>';
  if (active) {
    html += `<div class="prog-status"><span class="prog-dot on"></span>${isLibre(active) ? 'Séance libre active' : 'Programme actif'}</div>`;
    html += activeTileHtml(active);
    if (programDetailOpen) html += activeDetailHtml(active);
  } else {
    html += `<div class="prog-status"><span class="prog-dot"></span>Aucun programme actif</div>`;
  }
  if (others.length) {
    html += `<h2 class="section-label prog-mem-title">En mémoire</h2><div class="mem-list">`;
    others.forEach(p => { html += memTileHtml(p); });
    html += `</div>`;
  }
  html += `<p class="prog-hint">Reste appuyé sur un programme pour entrer en mode édition</p>`;
  container.innerHTML = html;
  bindLongPress(container);
}

function emptyProgramsHtml() {
  return `
    <div class="prog-empty">
      <svg class="prog-empty-arrow" viewBox="0 0 200 230" aria-hidden="true"><path d="M8 214 C 48 210, 94 196, 120 166 C 144 138, 130 110, 112 118 C 96 126, 108 154, 134 142 C 162 128, 164 76, 154 20"/><path d="M141 36 L 154 18 L 165 37"/></svg>
      <p class="prog-empty-title">Tu n'as pour l'instant rien de prévu au programme.</p>
      <p class="prog-empty-sub">Clique sur le bouton + pour en créer un !</p>
      <p class="prog-empty-restore">Tu as déjà un programme sauvegardé ? <button type="button" class="link-btn" onclick="openProgramRestore()">Restaurer</button></p>
    </div>`;
}

function activeTileHtml(p) {
  const def = currentSessionDef();
  const session = def ? def.session : p.sessions[0];
  const libre = isLibre(p);
  const nEx = (session.exercises || []).length;
  const nSets = sessionSetCount(session);
  const BOLT_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 3L5 14h6l-1 7 8-11h-6z"/></svg>';
  const deloadHtml = checkDeloadStatus() ? `<span class="deload-pill">${BOLT_SVG}Déload actif · −20 %</span>` : '';
  // Tuile : pictogramme du type + nom du programme (ou de la séance libre) en grand ; pastille et nom de la
  // prochaine séance en petit (programme seulement) ; exercices et séries ; « + de détail » et démarrer.
  const nextLine = libre ? '' : `
      <div class="prog-tile-next">${programPillHtml(p, session.key, 'tiny')}<span>${escapeHtml(sessionLabel(p, session))}</span></div>`;
  return `
    <div class="next-card prog-tile${libre ? ' libre' : ''}" data-lp="${escapeHtml(p.id)}">
      <div class="prog-tile-top">
        ${libre ? '<span class="prog-ico libre">1×</span>' : `<span class="prog-ico">${SWAP_SVG}</span>`}
        <span class="session-name prog-tile-name">${escapeHtml(p.name)}</span>
      </div>${nextLine}
      <span class="next-card-count">${nEx} exercice${nEx > 1 ? 's' : ''} · ${nSets} série${nSets > 1 ? 's' : ''}</span>
      ${deloadHtml}
      <div class="next-card-row">
        <button type="button" class="prog-detail-btn" aria-expanded="${programDetailOpen}" onclick="toggleProgramDetail()">${programDetailOpen ? '- de détail' : '+ de détail'}</button>
        <button type="button" class="btn-start${libre ? ' libre' : ''}" aria-label="Démarrer la séance" onclick="switchTab('seance')">${ARROW_SVG}</button>
      </div>
    </div>`;
}

function activeDetailHtml(p) {
  const def = currentSessionDef();
  const session = def ? def.session : p.sessions[0];
  let html = `<div class="section-block prog-detail"><div class="tile-grid">${programTilesHtml(session.exercises || [])}</div></div>`;
  if (!isLibre(p) && p.sessions.length > 1) {
    const start = p.sessions.indexOf(session);
    const rest = [];
    for (let i = 1; i < p.sessions.length; i++) rest.push(p.sessions[(start + i) % p.sessions.length]);
    html += `<div class="section-block"><h2 class="section-label">Ensuite</h2>` + rest.map(s => `
      <div class="next-row-wrap">
        <button type="button" class="next-row" aria-expanded="false" onclick="toggleProgramRow(this)">
          <span class="type-pill type-pill-${s.key} small">${s.key}</span>
          <span class="next-row-name">${escapeHtml(sessionLabel(p, s))}</span>
          <span class="next-row-chevron">${CHEVRON_SVG}</span>
        </button>
        <div class="tile-grid next-row-panel" hidden>${programTilesHtml(s.exercises || [])}</div>
      </div>`).join('') + `</div>`;
  }
  return html;
}

function toggleProgramDetail() {
  programDetailOpen = !programDetailOpen;
  renderProgramOverview();
}

// Déplie / replie la liste des exercices d'une séance dans « Ensuite »
function toggleProgramRow(btn) {
  const panel = btn.nextElementSibling;
  const open = btn.getAttribute('aria-expanded') === 'true';
  btn.setAttribute('aria-expanded', open ? 'false' : 'true');
  if (panel) panel.hidden = open;
}

function formatShortDate(iso) {
  const d = iso ? new Date(iso) : null;
  if (!d || isNaN(d)) return '';
  return `${d.getDate()} ${HISTORY_MONTHS_SHORT[d.getMonth()]}`;
}

// Sous-titre d'une mini-tuile : « Nouveau · 18 exercices », « En pause depuis le 12 oct. », « 3 exercices »
function memSubHtml(p) {
  const n = programExerciseCount(p);
  const count = `${n} exercice${n > 1 ? 's' : ''}`;
  if (p.status === 'new') return `<span class="mem-flag">Nouveau</span> · ${count}`;
  if (!isLibre(p) && p.pausedAt) return `<span class="mem-flag">En pause depuis le ${formatShortDate(p.pausedAt)}</span>`;
  return count;
}

function memTileHtml(p) {
  const libre = isLibre(p);
  const label = !libre && p.status === 'paused' ? 'Réactiver' : 'Activer';
  return `
    <div class="mem-tile${libre ? ' libre' : ''}" data-lp="${escapeHtml(p.id)}">
      <span class="mem-ico">${libre ? '1×' : SWAP_SVG}</span>
      <div class="mem-text"><div class="mem-name">${escapeHtml(p.name)}</div><div class="mem-sub">${memSubHtml(p)}</div></div>
      <button type="button" class="mem-btn" onclick="activateProgram('${escapeHtml(p.id)}')">${label}</button>
    </div>`;
}

// ============================================================
// 3. ACTIVATION
// ============================================================
// Activer / Réactiver : l'élément devient actif, l'ancien actif passe en pause sans confirmation
function activateProgram(id) {
  const p = getProgram(id);
  if (!p) return;
  const now = new Date().toISOString();
  getPrograms().forEach(o => {
    if (o !== p && o.status === 'active') { o.status = 'paused'; o.pausedAt = now; }
  });
  p.status = 'active';
  p.activatedAt = now;
  p.pausedAt = null;
  if (!isLibre(p)) p.nextKey = nextKeyFromHistory(p);
  syncNextType();
  saveState();
  backupToDrive();
  programDetailOpen = false;
  clearDraft();
  initWorkoutForm();
  renderProgramOverview();
}

// ============================================================
// 4. CHOIX : PROGRAMME OU SÉANCE LIBRE (écran 4)
// ============================================================
function openProgramChooser() {
  setProgramView('choose');
}

function chooserHtml() {
  return `
    <div class="ed-top"><button type="button" class="ed-back" aria-label="Retour" onclick="setProgramView('home')">${BACK_SVG}</button></div>
    <div class="prog-spacer" aria-hidden="true"></div>
    <p class="choose-lead">Choisis comment t'entraîner</p>
    <button type="button" class="choose-card" onclick="startProgramEditor('program')">
      <span class="choose-over">Séances qui reviennent</span>
      <span class="choose-title">Créer un programme</span>
      <span class="choose-text">Tes séances tournent en boucle. L'app te propose toujours la suivante.</span>
      <span class="choose-foot">
        <span class="choose-pills"><span class="type-pill type-pill-A small">A</span><span class="type-pill type-pill-B small">B</span><span class="type-pill choose-more small">···</span><span class="choose-swap">${SWAP_SVG}</span></span>
        <span class="btn-start" aria-hidden="true">${ARROW_SVG}</span>
      </span>
    </button>
    <button type="button" class="choose-card libre" onclick="startProgramEditor('libre')">
      <span class="choose-over">Une seule fois</span>
      <span class="choose-title">Séance libre</span>
      <span class="choose-text">Une séance isolée, sans récurrence. Elle rejoint l'historique, rien de plus.</span>
      <span class="choose-foot">
        <span class="type-pill type-pill-libre">1×</span>
        <span class="btn-start libre" aria-hidden="true">${ARROW_SVG}</span>
      </span>
    </button>`;
}

// ============================================================
// 5. ÉDITEUR (création et modification)
// ============================================================
function draftSnapshot(d) { return JSON.stringify({ n: d.name, s: d.sessions }); }

function startProgramEditor(kind, id) {
  const p = id ? getProgram(id) : null;
  const sessions = p
    ? JSON.parse(JSON.stringify(p.sessions))
    : (kind === 'libre' ? [{ key: '', name: '', exercises: [] }] : SESSION_KEYS.slice(0, 3).map(k => ({ key: k, name: '', exercises: [] })));
  programDraft = { id: p ? p.id : null, kind: p ? p.kind : kind, name: p ? p.name : '', sessions, idx: 0 };
  if (p && !isLibre(p)) {
    const i = p.sessions.findIndex(s => s.key === p.nextKey);
    programDraft.idx = i >= 0 ? i : 0;
  }
  programDraft.start = draftSnapshot(programDraft);
  setProgramView('editor');
}

function editProgram(id) {
  const p = getProgram(id);
  if (p) startProgramEditor(p.kind, id);
}

function draftSession() { return programDraft.sessions[programDraft.idx] || programDraft.sessions[0]; }
function draftIsLibre() { return programDraft.kind === 'libre'; }

function exerciseSubText(e) {
  const info = exInfo(e.exId);
  if (info.cardio) {
    if (info.mode === 'time') return 'Cardio · durée';
    if (info.name === ROWER_NAME) {
      const sg = getSuggestedCardioValues(info.name, ROWER_DEFAULTS.seconds, ROWER_DEFAULTS.meters);
      return `Cardio · ${formatDurationMS(sg.seconds)} · ${Number(sg.meters).toLocaleString('fr-FR')} m`;
    }
    return info.mode === 'floors' ? 'Cardio · durée, étages' : 'Cardio · durée, distance';
  }
  const n = e.sets || info.sets || 3;
  return `${n} série${n > 1 ? 's' : ''} · ${info.mode === 'time' ? info.reps : (info.reps || '') + ' reps'}`;
}

function editorHtml() {
  const d = programDraft;
  const libre = draftIsLibre();
  const s = draftSession();
  const isNew = !d.id;
  const nEx = s.exercises.length;
  const nSets = sessionSetCount(s);
  let html = `
    <div class="ed-top">
      <button type="button" class="ed-back" aria-label="Retour" onclick="programEditorBack()">${BACK_SVG}</button>
      <label class="ed-field ed-name">
        <input id="ed-name" type="text" maxlength="40" autocomplete="off" placeholder="${libre ? 'Nomme ta séance' : 'Mon programme'}" value="${escapeHtml(d.name)}" aria-label="${libre ? 'Nom de la séance libre' : 'Nom du programme'}">
        <span class="ed-pen">${PEN_SVG}</span>
      </label>
    </div>`;
  if (libre) {
    html += `
    <div class="ed-kind"><span class="type-pill type-pill-libre">1×</span><div><div class="ed-kind-title">Séance libre</div><div class="ed-kind-sub">Sans récurrence</div></div></div>`;
  } else {
    html += `
    <div class="ed-kind"><span class="prog-ico dark">${SWAP_SVG}</span><div><div class="ed-kind-title">Séances A, B…</div><div class="ed-kind-sub">Elles tournent en boucle (${SESSION_MIN} minimum)</div></div></div>
    <div class="ed-seg" role="tablist" aria-label="Séances du programme">
      ${d.sessions.map((x, i) => `<button type="button" role="tab" class="ed-seg-btn${i === d.idx ? ' active' : ''}" aria-selected="${i === d.idx}" onclick="selectDraftSession(${i})">${x.key}</button>`).join('')}
      <span class="ed-seg-gap"></span>
      <button type="button" class="ed-seg-btn ed-seg-op" aria-label="Retirer la séance ${s.key}" onclick="removeDraftSession()" ${d.sessions.length <= SESSION_MIN ? 'disabled' : ''}>${MINUS_SVG}</button>
      <button type="button" class="ed-seg-btn ed-seg-op plus" aria-label="Ajouter une séance" onclick="addDraftSession()" ${d.sessions.length >= SESSION_MAX ? 'disabled' : ''}>${PLUS_SVG}</button>
    </div>
    <div class="ed-session">
      <span class="type-pill type-pill-${s.key}">${s.key}</span>
      <label class="ed-field ed-sname">
        <input id="ed-sname" type="text" maxlength="40" autocomplete="off" placeholder="Nomme la séance ${s.key}" value="${escapeHtml(s.name)}" aria-label="Nom de la séance ${s.key}">
        <span class="ed-pen">${PEN_SVG}</span>
      </label>
    </div>`;
  }
  html += nEx
    ? `<p class="ed-count">${nEx} exercice${nEx > 1 ? 's' : ''} · ${nSets} série${nSets > 1 ? 's' : ''}</p>`
    : `<p class="ed-count">Aucun exercice dans cette séance pour l'instant.</p>`;
  html += `<div class="ed-list" id="ed-list">` + s.exercises.map((e, i) => {
    const name = exInfo(e.exId).name;
    return `
      <div class="ed-row" data-i="${i}">
        <span class="ed-handle" aria-hidden="true">${HANDLE_SVG}</span>
        <span class="ex-icon-badge">${getIcon(name, true)}</span>
        <span class="ed-row-text"><span class="ed-row-name">${escapeHtml(name)}</span><span class="ed-row-sub">${exerciseSubText(e)}</span></span>
        <button type="button" class="ed-more" aria-label="Options de ${escapeHtml(name)}" onclick="openExerciseMenu(${i})">${DOTS_SVG}</button>
      </div>`;
  }).join('') + `</div>`;
  html += `<button type="button" class="ed-add" onclick="openAddExercise()"><span class="ed-add-plus">${PLUS_SVG}</span>Ajouter un exercice</button>`;

  const complete = d.sessions.every(x => x.exercises.length > 0);
  html += `<div class="ed-footer">`;
  if (!isNew) html += `<button type="button" class="ed-delete" onclick="openDeleteProgram()">${TRASH_SVG}${libre ? 'Supprimer la séance libre' : 'Supprimer le programme'}</button>`;
  if (complete) {
    let label;
    if (!isNew) label = 'Enregistrer';
    else if (libre) label = getActiveProgram() ? 'Enregistrer la séance libre' : 'Démarrer la séance';
    else label = 'Enregistrer le programme';
    if (isNew && !libre) html += `<p class="ed-note">Tu pourras tout modifier plus tard, dans Programme.</p>`;
    html += `<button type="button" class="btn${libre ? ' btn-sand' : ''}" id="ed-save" onclick="saveProgramDraft()">${label}</button>`;
  } else if (!libre && nEx > 0) {
    html += `<p class="ed-note">Ajoute au moins un exercice dans chaque séance pour enregistrer.</p>`;
  }
  html += `</div>`;
  return html;
}

function bindEditor() {
  const name = document.getElementById('ed-name');
  if (name) name.addEventListener('input', () => { programDraft.name = name.value; });
  const sname = document.getElementById('ed-sname');
  if (sname) sname.addEventListener('input', () => { draftSession().name = sname.value; });
  bindDragReorder(document.getElementById('ed-list'));
}

function selectDraftSession(i) {
  programDraft.idx = i;
  renderProgramOverview();
}

function addDraftSession() {
  const d = programDraft;
  if (d.sessions.length >= SESSION_MAX) return;
  d.sessions.push({ key: SESSION_KEYS[d.sessions.length], name: '', exercises: [] });
  d.idx = d.sessions.length - 1;
  renderProgramOverview();
}

function removeDraftSession() {
  const d = programDraft;
  if (d.sessions.length <= SESSION_MIN) return;
  const s = draftSession();
  if (s.exercises.length && !confirm(`Retirer la séance ${s.key} et ses ${s.exercises.length} exercice${s.exercises.length > 1 ? 's' : ''} ?`)) return;
  d.sessions.splice(d.idx, 1);
  d.sessions.forEach((x, i) => { x.key = SESSION_KEYS[i]; });
  d.idx = Math.min(d.idx, d.sessions.length - 1);
  renderProgramOverview();
}

function programEditorBack() {
  if (programDraft && draftSnapshot(programDraft) !== programDraft.start
      && !confirm('Quitter sans enregistrer ? Ta saisie sera perdue.')) return;
  const wasNew = programDraft && !programDraft.id;
  programDraft = null;
  setProgramView(wasNew ? 'choose' : 'home');
}

function saveProgramDraft() {
  const d = programDraft;
  if (!d || !d.sessions.every(x => x.exercises.length > 0)) return;
  const libre = d.kind === 'libre';
  const name = (d.name || '').replace(/[<>]/g, '').trim() || (libre ? 'Séance libre' : 'Mon programme');
  const now = new Date().toISOString();
  const sessions = d.sessions.map((s, i) => ({
    key: libre ? '' : SESSION_KEYS[i],
    name: libre ? name : (s.name || '').replace(/[<>]/g, '').trim(),
    exercises: s.exercises.map(e => ({ exId: e.exId, sets: e.sets || exInfo(e.exId).sets || 3 }))
  }));
  if (!Array.isArray(state.programs)) state.programs = [];
  let startNow = false;
  if (d.id) {
    const p = getProgram(d.id);
    if (!p) return;
    p.name = name;
    p.sessions = sessions;
    p.savedAt = now;
    if (!libre && !sessions.some(s => s.key === p.nextKey)) p.nextKey = sessions[0].key;
  } else {
    const active = getActiveProgram();
    const p = {
      id: newProgramId(), name, kind: libre ? 'libre' : 'program', status: active ? 'new' : 'active',
      createdAt: now, activatedAt: active ? null : now, pausedAt: null, savedAt: now,
      nextKey: libre ? '' : 'A', sessions
    };
    state.programs.push(p);
    startNow = libre && !active;
  }
  normalizePrograms();
  saveState();
  backupToDrive(); // la sauvegarde complète Drive contient désormais ce programme
  programDraft = null;
  programDetailOpen = false;
  clearDraft();
  initWorkoutForm();
  setProgramView('home');
  if (startNow) switchTab('seance');
}

// --- Menu d'un exercice (⋮) : monter, descendre, retirer ---
function openExerciseMenu(i) {
  const s = draftSession();
  const e = s.exercises[i];
  if (!e) return;
  const name = exInfo(e.exId).name;
  openSheet(`
    <h3 class="sheet-title small">${escapeHtml(name)}</h3>
    <button type="button" class="btn btn-secondary" ${i === 0 ? 'disabled' : ''} onclick="moveDraftExercise(${i}, -1)">Monter</button>
    <button type="button" class="btn btn-secondary" ${i === s.exercises.length - 1 ? 'disabled' : ''} onclick="moveDraftExercise(${i}, 1)">Descendre</button>
    <button type="button" class="btn btn-danger" onclick="removeDraftExercise(${i})">Retirer de la séance</button>
    <button type="button" class="btn btn-secondary" onclick="closeSheet()">Annuler</button>`);
}

function moveDraftExercise(i, dir) {
  const list = draftSession().exercises;
  const j = i + dir;
  if (j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  closeSheet();
  renderProgramOverview();
}

function removeDraftExercise(i) {
  draftSession().exercises.splice(i, 1);
  closeSheet();
  renderProgramOverview();
}

// Glisser-déposer par la poignée (⋮⋮) pour réordonner les exercices
function bindDragReorder(list) {
  if (!list) return;
  list.querySelectorAll('.ed-handle').forEach(handle => {
    handle.addEventListener('pointerdown', ev => {
      const row = handle.closest('.ed-row');
      if (!row) return;
      ev.preventDefault();
      handle.setPointerCapture(ev.pointerId);
      row.classList.add('dragging');
      const move = e2 => {
        const rows = Array.from(list.querySelectorAll('.ed-row'));
        const y = e2.clientY;
        for (const other of rows) {
          if (other === row) continue;
          const r = other.getBoundingClientRect();
          const mid = r.top + r.height / 2;
          const idx = rows.indexOf(row), oIdx = rows.indexOf(other);
          if (oIdx < idx && y < mid) { list.insertBefore(row, other); break; }
          if (oIdx > idx && y > mid) { list.insertBefore(row, other.nextSibling); break; }
        }
      };
      const up = () => {
        handle.removeEventListener('pointermove', move);
        handle.removeEventListener('pointerup', up);
        handle.removeEventListener('pointercancel', up);
        row.classList.remove('dragging');
        const order = Array.from(list.querySelectorAll('.ed-row')).map(r => +r.dataset.i);
        const s = draftSession();
        const before = s.exercises.slice();
        s.exercises = order.map(i => before[i]);
        renderProgramOverview();
      };
      handle.addEventListener('pointermove', move);
      handle.addEventListener('pointerup', up);
      handle.addEventListener('pointercancel', up);
    });
  });
}

// ============================================================
// 6. AJOUTER UN EXERCICE (écrans 7, 8, 10, 18)
// ============================================================
let addSheet = null; // { filter, query, selected: Set(exId) }

function openAddExercise() {
  addSheet = { filter: 'Tous', query: '', selected: new Set() };
  openSheet(addSheetHtml(), { tall: true, onClose: () => { addSheet = null; } });
  bindAddSheet();
}

function addSheetHtml() {
  const s = draftSession();
  const title = draftIsLibre() ? 'Ajouter à la séance' : `Ajouter à la séance ${s.key}`;
  return `
    <div class="sheet-head">
      <h3 class="sheet-title">${title}</h3>
      <button type="button" class="sheet-close" aria-label="Fermer" onclick="cancelAddExercise()">${CLOSE_SVG}</button>
    </div>
    <label class="add-search">${SEARCH_SVG}<input id="add-search" type="search" placeholder="Rechercher un exercice" autocomplete="off" aria-label="Rechercher un exercice"></label>
    <div class="add-chips" role="tablist">${EXERCISE_FILTERS.map(f => `<button type="button" class="filter-btn${f === 'Tous' ? ' active' : ''}" data-f="${f}">${f}</button>`).join('')}</div>
    <div class="add-list" id="add-list">${addListHtml()}</div>
    <div class="sheet-actions" id="add-actions">${addActionsHtml()}</div>`;
}

function normalizeSearch(t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }

function addMetaText(e) {
  if (e.cardio) {
    const u = CARDIO_UNITS[e.unit];
    if (e.mode === 'time') return 'Cardio · Durée';
    return `Cardio · Durée, ${e.mode === 'floors' ? 'étages' : 'distance'}${u ? ' · ' + u.suffix : ''}`;
  }
  return e.group;
}

function addListHtml() {
  const s = draftSession();
  const inSession = new Set(s.exercises.map(e => e.exId));
  const q = normalizeSearch(addSheet.query);
  const items = CATALOGUE.filter(e => (addSheet.filter === 'Tous' || e.group === addSheet.filter) && (!q || normalizeSearch(e.name).includes(q)));
  if (!items.length) return `<p class="add-empty">Aucun exercice trouvé.</p>`;
  return items.map(e => {
    const already = inSession.has(e.id);
    const on = addSheet.selected.has(e.id);
    return `
      <button type="button" class="add-item${already ? ' already' : ''}${on ? ' on' : ''}" ${already ? 'disabled' : ''} data-id="${e.id}" aria-pressed="${on}">
        <span class="ex-icon-badge">${getIcon(e.name, true)}</span>
        <span class="add-text"><span class="add-name">${escapeHtml(e.name)}</span><span class="add-meta">${already ? 'Déjà dans la séance' : addMetaText(e)}</span></span>
        <span class="add-check">${already || on ? CHECK_SVG : PLUS_SVG}</span>
      </button>`;
  }).join('');
}

function addActionsHtml() {
  const n = addSheet ? addSheet.selected.size : 0;
  return (n ? `<button type="button" class="btn" onclick="confirmAddExercise()">${n === 1 ? 'Ajouter l’exercice' : `Ajouter les ${n} exercices`}</button>` : '')
    + `<button type="button" class="btn btn-secondary" onclick="cancelAddExercise()">Annuler</button>`;
}

function refreshAddSheet() {
  const list = document.getElementById('add-list');
  if (list) list.innerHTML = addListHtml();
  const actions = document.getElementById('add-actions');
  if (actions) actions.innerHTML = addActionsHtml();
}

function bindAddSheet() {
  const search = document.getElementById('add-search');
  if (search) search.addEventListener('input', () => { addSheet.query = search.value; refreshAddSheet(); });
  document.querySelectorAll('.add-chips .filter-btn').forEach(b => b.addEventListener('click', () => {
    addSheet.filter = b.dataset.f;
    document.querySelectorAll('.add-chips .filter-btn').forEach(x => x.classList.toggle('active', x === b));
    refreshAddSheet();
  }));
  const list = document.getElementById('add-list');
  if (list) list.addEventListener('click', ev => {
    const item = ev.target.closest('.add-item');
    if (!item || item.disabled) return;
    const id = +item.dataset.id;
    if (addSheet.selected.has(id)) addSheet.selected.delete(id); else addSheet.selected.add(id);
    refreshAddSheet();
  });
}

function confirmAddExercise() {
  if (!addSheet || !addSheet.selected.size) return;
  const s = draftSession();
  // Ajoutés dans l'ordre où ils ont été cochés (réordonnables ensuite par la poignée ou le menu ⋮)
  Array.from(addSheet.selected).forEach(id => {
    const e = exInfo(id);
    s.exercises.push({ exId: e.id, sets: e.cardio ? 1 : (e.sets || 3) });
  });
  closeSheet();
  renderProgramOverview();
}

function cancelAddExercise() {
  if (addSheet && addSheet.selected.size && !confirm('Abandonner les exercices sélectionnés ?')) return;
  closeSheet();
}

// ============================================================
// 7. SUPPRIMER (écrans 19 et 21)
// ============================================================
function openDeleteProgram() {
  const d = programDraft;
  if (!d || !d.id) return;
  const p = getProgram(d.id);
  if (!p) return;
  const libre = isLibre(p);
  const keys = p.sessions.map(s => s.key);
  const text = libre
    ? 'La séance libre sera supprimée. Les séances déjà faites restent dans l’historique et les graphiques.'
    : `Les ${keys.length} séances ${keys.slice(0, -1).join(', ')} et ${keys[keys.length - 1]} seront supprimées. Les séances déjà faites restent dans l’historique et les graphiques.`;
  openSheet(`
    <div class="sheet-icon danger">${TRASH_SVG}</div>
    <h3 class="sheet-title center">Supprimer « ${escapeHtml(p.name)} » ?</h3>
    <p class="sheet-text center">${text}</p>
    <button type="button" class="btn btn-delete" onclick="deleteProgram('${escapeHtml(p.id)}')">${libre ? 'Supprimer la séance libre' : 'Supprimer le programme'}</button>
    <button type="button" class="btn btn-secondary" onclick="closeSheet()">Annuler</button>`);
}

// L'historique et les graphiques ne sont jamais touchés : les séances gardent le nom recopié du programme
function deleteProgram(id) {
  state.programs = getPrograms().filter(p => p.id !== id);
  normalizePrograms();
  saveState();
  backupToDrive();
  closeSheet();
  programDraft = null;
  programDetailOpen = false;
  clearDraft();
  initWorkoutForm();
  setProgramView('home');
}

// ============================================================
// 8. RESTAURER DES PROGRAMMES DEPUIS GOOGLE DRIVE (écrans 2 et 3)
// ============================================================
// Lit la sauvegarde complète la plus récente du Drive et propose ses programmes et séances libres à cocher.
// Les éléments cochés arrivent en pause ; un élément déjà présent (même identifiant) n'est pas dupliqué ;
// l'historique n'est pas concerné.
const PROGRAM_RESTORE_PENDING_KEY = 'h49_program_restore_pending';
let restoreCandidates = [];
let restoreSelected = new Set();

function openProgramRestore() {
  if (!getDriveToken()) {
    openSheet(`
      <div class="sheet-icon">${CLOUD_SVG}</div>
      <h3 class="sheet-title center">Restaurer un programme</h3>
      <p class="sheet-text center">Connecte ton compte Google pour retrouver tes programmes sauvegardés.</p>
      <button type="button" class="btn" onclick="connectDriveForRestore()">Se connecter à Google Drive</button>
      <button type="button" class="btn btn-secondary" onclick="closeSheet()">Annuler</button>`);
    return;
  }
  loadProgramRestoreList();
}

function connectDriveForRestore() {
  try { localStorage.setItem(PROGRAM_RESTORE_PENDING_KEY, '1'); } catch (e) { /* ignoré */ }
  closeSheet();
  connectGoogleDrive();
}

// Appelée quand l'accès Drive vient d'être obtenu : reprend la restauration demandée avant la connexion
function resumeProgramRestoreIfPending() {
  let pending = false;
  try { pending = localStorage.getItem(PROGRAM_RESTORE_PENDING_KEY) === '1'; localStorage.removeItem(PROGRAM_RESTORE_PENDING_KEY); } catch (e) { /* ignoré */ }
  if (!pending || !getDriveToken()) return false;
  switchTab('programme');
  loadProgramRestoreList();
  return true;
}

async function loadProgramRestoreList() {
  const token = getDriveToken();
  if (!token) return;
  openSheet(`<h3 class="sheet-title">Restaurer un programme</h3><p class="sheet-text">Recherche de tes programmes sur Google Drive…</p>`);
  try {
    const folderId = await ensureDriveFolder(token.access_token);
    const files = await listDriveBackups(token.access_token, folderId);
    if (!files.length) throw new Error('aucune sauvegarde');
    const dl = await downloadDriveBackup(token.access_token, files[0].id);
    if (!dl.ok || !dl.data) throw new Error('sauvegarde illisible');
    const data = migrateState(sanitizeImported(dl.data)).state;
    restoreCandidates = (data.programs || []).filter(p => p && p.id && Array.isArray(p.sessions) && p.sessions.length);
    restoreSelected = new Set();
    if (!restoreCandidates.length) {
      openSheet(`<h3 class="sheet-title">Restaurer un programme</h3><p class="sheet-text">La dernière sauvegarde de ton Drive ne contient aucun programme.</p><button type="button" class="btn btn-secondary" onclick="closeSheet()">Fermer</button>`);
      return;
    }
    renderProgramRestoreList();
  } catch (e) {
    openSheet(`<h3 class="sheet-title">Restaurer un programme</h3><p class="sheet-text">Aucun programme trouvé sur ton Drive (${escapeHtml(e && e.message ? e.message : 'erreur réseau')}).</p><button type="button" class="btn btn-secondary" onclick="closeSheet()">Fermer</button>`);
  }
}

function renderProgramRestoreList() {
  const n = restoreSelected.size;
  const rows = restoreCandidates.map((p, i) => {
    const libre = isLibre(p);
    const on = restoreSelected.has(i);
    const meta = libre ? 'Séance libre' : `${p.sessions.length} séances`;
    const when = p.savedAt ? new Date(p.savedAt) : null;
    const whenText = when && !isNaN(when) ? `Enregistré le ${when.getDate()} ${HISTORY_MONTHS_SHORT[when.getMonth()]} · ${String(when.getHours()).padStart(2, '0')}:${String(when.getMinutes()).padStart(2, '0')}` : '';
    const present = !!getProgram(p.id);
    return `
      <button type="button" class="restore-item${on ? ' on' : ''}${libre ? ' libre' : ''}" ${present ? 'disabled' : ''} aria-pressed="${on}" onclick="toggleRestoreItem(${i})">
        <span class="mem-ico">${libre ? '1×' : SWAP_SVG}</span>
        <span class="restore-text"><span class="restore-name"><b>${escapeHtml(p.name)}</b> · ${meta}</span><span class="restore-when">${present ? 'Déjà sur cet appareil' : whenText}</span></span>
        <span class="restore-box">${on ? CHECK_SVG : ''}</span>
      </button>`;
  }).join('');
  openSheet(`
    <h3 class="sheet-title">Restaurer un programme</h3>
    <p class="sheet-text">Coche les programmes à reprendre. Ils arriveront en pause, à toi de réactiver celui de ton choix. Ton historique de séances n'est pas concerné.</p>
    <div class="restore-list">${rows}</div>
    ${n ? `<button type="button" class="btn" onclick="restoreSelectedPrograms()">${n > 1 ? `Restaurer les ${n} programmes` : 'Restaurer le programme'}</button>` : ''}
    <button type="button" class="btn btn-secondary" onclick="closeSheet()">Annuler</button>`, { tall: true });
}

function toggleRestoreItem(i) {
  if (restoreSelected.has(i)) restoreSelected.delete(i); else restoreSelected.add(i);
  renderProgramRestoreList();
}

function restoreSelectedPrograms() {
  if (!Array.isArray(state.programs)) state.programs = [];
  const now = new Date().toISOString();
  restoreCandidates.forEach((p, i) => {
    if (!restoreSelected.has(i) || getProgram(p.id)) return;
    const copy = JSON.parse(JSON.stringify(p));
    copy.status = 'paused';
    copy.pausedAt = now;
    state.programs.push(copy);
  });
  normalizePrograms();
  saveState();
  closeSheet();
  setProgramView('home');
}

// Même assainissement que l'import (security.js) : aucun « < » ni « > » dans les chaînes
function sanitizeImported(value) {
  if (typeof value === 'string') return value.replace(/[<>]/g, '');
  if (Array.isArray(value)) return value.map(sanitizeImported);
  if (value && typeof value === 'object') {
    const clean = {};
    Object.keys(value).forEach(k => { clean[k] = sanitizeImported(value[k]); });
    return clean;
  }
  return value;
}

// ============================================================
// 9. APPUI LONG ET FEUILLES DU BAS
// ============================================================
// Appui long (≈ 0,5 s, légère vibration) sur une tuile : ouvre l'éditeur du programme ou de la séance libre
const LONG_PRESS_MS = 550;
function bindLongPress(root) {
  root.querySelectorAll('[data-lp]').forEach(el => {
    let timer = null, x0 = 0, y0 = 0, fired = false;
    const cancel = () => { clearTimeout(timer); timer = null; el.classList.remove('pressing'); };
    el.addEventListener('pointerdown', ev => {
      if (ev.target.closest('button')) return; // boutons de la tuile : comportement normal
      fired = false; x0 = ev.clientX; y0 = ev.clientY;
      el.classList.add('pressing');
      timer = setTimeout(() => {
        fired = true;
        el.classList.remove('pressing');
        try { if (navigator.vibrate) navigator.vibrate(15); } catch (e) { /* ignoré */ }
        editProgram(el.dataset.lp);
      }, LONG_PRESS_MS);
    });
    el.addEventListener('pointermove', ev => { if (timer && (Math.abs(ev.clientX - x0) > 10 || Math.abs(ev.clientY - y0) > 10)) cancel(); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(t => el.addEventListener(t, cancel));
    el.addEventListener('contextmenu', ev => ev.preventDefault());
    el.addEventListener('click', ev => { if (fired) { ev.preventDefault(); ev.stopPropagation(); } }, true);
  });
}

// Feuille du bas (un seul à la fois) : contenu HTML libre ; touche sur le fond = fermer
let sheetOnClose = null;
function openSheet(html, opts = {}) {
  let overlay = document.getElementById('sheet-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'sheet-overlay';
    overlay.className = 'sheet-overlay';
    overlay.addEventListener('click', ev => { if (ev.target === overlay) { if (addSheet) cancelAddExercise(); else closeSheet(); } });
    document.body.appendChild(overlay);
  }
  if (opts.onClose) sheetOnClose = opts.onClose;
  // update : la feuille déjà ouverte est mise à jour sur place (pas de nouvelle animation, défilement conservé)
  const current = overlay.classList.contains('open') ? overlay.querySelector('.sheet') : null;
  if (opts.update && current) {
    const scroller = current.querySelector('.backup-scroll');
    const top = scroller ? scroller.scrollTop : 0;
    current.innerHTML = `<span class="sheet-grip" aria-hidden="true"></span>${html}`;
    const again = current.querySelector('.backup-scroll');
    if (again) again.scrollTop = top;
    return;
  }
  overlay.innerHTML = `<div class="sheet${opts.tall ? ' tall' : ''}" role="dialog" aria-modal="true"><span class="sheet-grip" aria-hidden="true"></span>${html}</div>`;
  overlay.classList.add('open');
}

function closeSheet() {
  const overlay = document.getElementById('sheet-overlay');
  if (overlay) { overlay.classList.remove('open'); overlay.innerHTML = ''; }
  const cb = sheetOnClose;
  sheetOnClose = null;
  if (cb) cb();
}
