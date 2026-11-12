// ============================================================
// BILAN DU MOIS (1.7.50)
// Le 1er du mois, un post-it sur l'écran Programmes annonce le bilan du mois précédent
// (s'il y a eu au moins une séance). Le toucher ouvre un pop-up centré ; « OK » l'archive
// et retire le post-it (sinon il disparaît seul après le 10 du mois).
// Les bilans des mois terminés restent consultables depuis Progression :
// mois cliquables dans « 4 derniers mois » et lien « Tous les bilans ».
// Maquette : planches 35 (BilanMois) et 25 (Progression).
// ============================================================
const BILAN_MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const BILAN_JOURS_POSTIT = 10;
const BILAN_CHEVRON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';

// Date du jour (window.__bilanNow permet aux tests de fixer la date)
function bilanNow() { return window.__bilanNow ? new Date(window.__bilanNow) : new Date(); }
function bilanKeyOf(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); }
function bilanPrevKey(key) { const [y, m] = key.split('-').map(Number); return bilanKeyOf(new Date(y, m - 2, 1)); }
function bilanMonthName(key) { return BILAN_MOIS[Number(key.slice(5)) - 1]; }
function bilanDeMois(key) { const n = bilanMonthName(key); return (/^[aeiouéo]/.test(n) ? "d'" : 'de ') + n; }
function bilanMonthLabel(key) { const n = bilanMonthName(key); return n.charAt(0).toUpperCase() + n.slice(1) + ' ' + key.slice(0, 4); }
function bilanSessions(key, scoped) { return bilanHist(scoped).filter(h => (h.date || '').startsWith(key)); }

// Séances prises en compte : toutes (post-it), ou le périmètre choisi dans Progression (1.7.51)
function bilanHist(scoped) {
  if (scoped && typeof statsHistory === 'function') return statsHistory();
  return (state && state.history) || [];
}

// Mois terminés ayant au moins une séance, du plus récent au plus ancien
function bilanDoneKeys(scoped) {
  const cur = bilanKeyOf(bilanNow());
  return [...new Set(bilanHist(scoped).map(h => (h.date || '').slice(0, 7)))]
    .filter(k => /^\d{4}-\d{2}$/.test(k) && k < cur).sort().reverse();
}

// Records du mois : exercices dont la meilleure valeur du mois bat tout l'historique antérieur
// (même règle que la fenêtre de fin de séance : charge, ou durée pour le cardio et les exercices au temps)
function bilanRecordCount(key, scoped) {
  const H = bilanHist(scoped);
  const before = H.filter(h => (h.date || '') < key + '-01');
  const best = {};
  bilanSessions(key, scoped).forEach(h => (h.exercises || []).forEach(ex => {
    const mode = exMode(ex.name);
    const byTime = ex.cardio || mode === 'time';
    if (!byTime && mode !== 'weight') return;
    const val = st => byTime ? (Number(st.seconds) || 0) : (Number(st.weight) || 0);
    const v = Math.max(0, ...(ex.sets || []).map(val));
    if (v > (best[ex.name] ? best[ex.name].v : 0)) best[ex.name] = { v, byTime, exId: ex.exId };
  }));
  let n = 0;
  Object.keys(best).forEach(name => {
    const b = best[name];
    const val = st => b.byTime ? (Number(st.seconds) || 0) : (Number(st.weight) || 0);
    let prev = 0, seen = false;
    before.forEach(h => (h.exercises || []).forEach(x => {
      if (x.name !== name && !(b.exId && x.exId === b.exId)) return;
      seen = true;
      (x.sets || []).forEach(st => { prev = Math.max(prev, val(st)); });
    }));
    if (seen && b.v > prev) n++;
  });
  return n;
}

function bilanData(key, scoped) {
  const cur = bilanSessions(key, scoped), prev = bilanSessions(bilanPrevKey(key), scoped);
  const sum = (a, f) => a.reduce((s, x) => s + (f(x) || 0), 0);
  const minutes = h => { const m = /(\d+)\s*min/.exec(h.duration || ''); return m ? Number(m[1]) : 0; };
  const [y, m] = key.split('-').map(Number);
  const days = new Date(y, m, 0).getDate();
  let cs = 0, cm = 0;
  cur.forEach(h => (h.exercises || []).forEach(e => {
    if (!exInfo(e.name).cardio) return;
    (e.sets || []).filter(isPerformedCardioSet).forEach(st => { cs += Number(st.seconds) || 0; cm += Number(st.meters) || 0; });
  }));
  return {
    key, n: cur.length, nPrev: prev.length,
    ton: sum(cur, h => Number(h.tonnage)), tonPrev: sum(prev, h => Number(h.tonnage)),
    minutes: sum(cur, minutes), perWeek: cur.length / (days / 7),
    cardio: cs || cm ? { s: cs, m: cm } : null,
    records: bilanRecordCount(key, scoped)
  };
}

function bilanHM(min) { const h = Math.floor(min / 60), m = min % 60; return h ? `${h} h ${String(m).padStart(2, '0')}` : `${m} min`; }

function bilanBodyHtml(key, scoped) {
  const b = bilanData(key, scoped);
  const fr = n => Math.round(n).toLocaleString('fr-FR');
  const up = (a, p, pct) => {
    if (!p || a <= p) return '';
    return `<span class="bilan-delta">+${pct ? Math.round((a - p) / p * 100) + ' %' : fr(a - p)}</span>`;
  };
  const row = (label, value, extra = '') => `<div class="bilan-row"><span class="bilan-label">${label}</span><span class="bilan-val"><b>${value}</b>${extra}</span></div>`;
  let html = `<h2 class="modal-title bilan-title" id="bilan-title">Bilan ${bilanDeMois(key)}</h2>
    <p class="modal-meta bilan-sub">${scoped && typeof statsScopeName === 'function' ? escapeHtml(statsScopeName()) + ' · comparé' : 'Comparé'} à ${bilanMonthName(bilanPrevKey(key))}.</p><div class="bilan-rows">`;
  html += row('Séances', b.n, up(b.n, b.nPrev));
  html += row('Tonnage', fr(b.ton) + ' kg', up(b.ton, b.tonPrev, true));
  html += row('Régularité', b.perWeek.toFixed(1).replace('.', ',') + ' / semaine');
  if (b.minutes) html += row("Temps d'entraînement", bilanHM(b.minutes));
  if (b.cardio) {
    const km = (b.cardio.m / 1000).toFixed(1).replace('.', ',');
    html += row('Cardio', (b.cardio.m ? km + ' km · ' : '') + bilanHM(Math.round(b.cardio.s / 60)));
  }
  html += row('Records battus', b.records ? String(b.records) : 'aucun');
  return html + '</div>';
}

// ---------- Pop-up centré (style de la fenêtre d'une séance de l'Historique) ----------
// Depuis le post-it : toutes les séances ; depuis Progression : le périmètre choisi (programme ou tous)
function openBilan(key, fromPostit) {
  closeBilan();
  const ov = document.createElement('div');
  ov.id = 'bilan-modal';
  ov.className = 'modal-overlay bilan-overlay';
  ov.innerHTML = `<div class="modal-sheet bilan-sheet" role="dialog" aria-modal="true" aria-labelledby="bilan-title">${bilanBodyHtml(key, !fromPostit)}
    <button type="button" class="btn bilan-ok">OK</button></div>`;
  const done = () => { closeBilan(); if (fromPostit) archiveBilan(key); };
  ov.addEventListener('click', ev => { if (ev.target === ov) done(); });
  ov.querySelector('.bilan-ok').addEventListener('click', done);
  document.body.appendChild(ov);
  ov.querySelector('.bilan-ok').focus({ preventScroll: true });
}
function closeBilan() { const ov = document.getElementById('bilan-modal'); if (ov) ov.remove(); }
document.addEventListener('keydown', ev => { if (ev.key === 'Escape' && document.getElementById('bilan-modal')) document.querySelector('#bilan-modal .bilan-ok').click(); });

// « OK » depuis le post-it : le bilan est archivé, le post-it ne revient plus pour ce mois
function archiveBilan(key) {
  if (!state) return;
  state.bilanVu = key;
  saveState();
  if (typeof renderProgramOverview === 'function') renderProgramOverview();
}

// ---------- Post-it de l'écran Programmes ----------
function bilanPostitKey() {
  const now = bilanNow();
  if (now.getDate() > BILAN_JOURS_POSTIT) return null;
  const key = bilanPrevKey(bilanKeyOf(now));
  if (!bilanSessions(key).length) return null;
  if (state && state.bilanVu && state.bilanVu >= key) return null;
  return key;
}
function bilanPostitHtml() {
  const key = bilanPostitKey();
  if (!key) return '';
  return `<div class="bilan-postit-row"><button type="button" class="bilan-postit" onclick="openBilan('${key}', true)" aria-label="Ouvrir ton bilan du mois ${bilanDeMois(key)}">
    <span class="bilan-postit-tape" aria-hidden="true"></span><span class="bilan-postit-text">Ton bilan<br>du mois<br>${bilanDeMois(key)}</span></button></div>`;
}

// ---------- Progression : « Tous les bilans » ----------
function openAllBilans() {
  const keys = bilanDoneKeys(true);
  const rows = keys.map(k => {
    const n = bilanSessions(k, true).length, r = bilanRecordCount(k, true);
    return `<button type="button" class="restore-item bilan-item" onclick="closeSheet();openBilan('${k}', false)">
      <span class="restore-text"><span class="restore-name"><b>${bilanMonthLabel(k)}</b></span><span class="restore-when">${n} séance${n > 1 ? 's' : ''} · ${r ? r + ' record' + (r > 1 ? 's' : '') : 'aucun record'}</span></span>
      <span class="bilan-chevron">${BILAN_CHEVRON}</span></button>`;
  }).join('');
  openSheet(`<h3 class="sheet-title">Tous les bilans</h3><p class="sheet-text bilan-scope">${escapeHtml(statsScopeName())}</p><div class="restore-list">${rows}</div>`, { tall: keys.length > 5 });
}
