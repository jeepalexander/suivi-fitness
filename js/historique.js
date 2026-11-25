// Copyright (c) 2026 Jean-Philippe Alexander. Mon Carnet de Salle.
// SPDX-License-Identifier: PolyForm-Strict-1.0.0 (voir LICENSE et NOTICE)
// Onglet Historique et modification d'une séance (ancienne section 11 de app.js) — sorti de app.js tel quel en 1.8.90 (co-auteur : Claude), aucun changement de fonctionnement.
// Chargé juste après app.js (index.html) ; fonctions et variables globales, comme dans app.js.

// ============================================================
// 11. ÉCRAN HISTORIQUE ET MODIFICATION D'UNE SÉANCE
// ============================================================
// 1.7.75 : l'Historique est indépendant des programmes : toujours toutes les séances, sans filtre ;
// le titre de la page donne leur nombre, le sous-titre le mois de la première (« depuis juillet 2026 »)
function historyTitle() {
  const n = (state && state.history || []).length;
  return `${n} séance${n > 1 ? 's' : ''}`;
}

// Programmes présents dans l'historique, dans l'ordre de leur dernière séance (le plus récent d'abord) ;
// sert au choix du périmètre de Progression
function historyProgramList() {
  const seen = new Map();
  (state.history || []).forEach(h => {
    if (!h.programId) return;
    const p = getProgram(h.programId);
    seen.set(h.programId, { id: h.programId, name: p ? p.name : (h.programName || 'Programme'), last: h.date || '' });
  });
  return Array.from(seen.values()).sort((a, b) => (a.last < b.last ? 1 : a.last > b.last ? -1 : 0));
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

  const history = state.history || [];
  const visible = () => true;
  const countEl = document.getElementById('history-count');
  const first = history.map(h => (h.date || '').slice(0, 7)).filter(k => /^\d{4}-\d{2}$/.test(k)).sort()[0];
  if (countEl) countEl.textContent = first ? 'depuis ' + monthLabelLower(first) : '';
  if (document.body.dataset.tab === 'historique') {
    const pageTitle = document.getElementById('page-title');
    if (pageTitle) pageTitle.innerText = historyTitle();
  }

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
      row.dataset.id = String(h.id);
      row.setAttribute('aria-label', `${historySessionTitle(h)} : modifier`);
      row.onclick = () => openSessionModal(realIndex);
      row.innerHTML = `
        ${sessionPillHtml(h)}
        <span class="history-main">
          <span class="history-date">${formatHistoryDate(h.date)}${h.isDeload ? ` <span class="deload-tag">${DELOAD_SVG}Déload</span>` : ''}</span>
          <span class="history-duration">${escapeHtml(sub)}</span>
          <span class="history-save-label" aria-live="polite"></span>
        </span>
        <span class="history-tonnage">${historyTonnes(h.tonnage)} T</span>
        <span class="history-chevron">${CHEVRON_SVG}</span>
        <span class="history-save-bar" aria-hidden="true"><i></i></span>`;
      applyHistorySaveMark(row);
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

      showToast(`${historySessionTitle(sessionToEdit)} chargée dans le formulaire. Corrige-la puis valide, ou annule : l'originale reste intacte tant que tu n'as pas validé.`);
    }
  });
}

// 1.8.51 (co-auteur : Claude) : la ligne supprimée clignote 3 fois (0,9 s), puis se replie (0,3 s)
function animateHistoryRemoval(id) {
  const row = document.querySelector(`.history-item[data-id="${id}"]`);
  if (!row || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) return Promise.resolve();
  return new Promise(resolve => {
    row.style.height = row.offsetHeight + 'px';
    row.classList.add('removing');
    setTimeout(() => row.classList.add('collapsing'), 950);
    setTimeout(resolve, 1300);
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
  closeSessionModal();
  await animateHistoryRemoval(session.id); // 1.8.51 : clignote, puis s'en va
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
