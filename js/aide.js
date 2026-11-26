// Copyright (c) 2026 Jean-Philippe Alexander. Mon Carnet de Salle.
// SPDX-License-Identifier: PolyForm-Strict-1.0.0 (voir LICENSE et NOTICE)
// « Avec notre aide » (1.8.78, co-auteur : Claude) : questionnaire de 5 questions, puis une séance ou un programme
// proposé, expliqué et sourcé, ouvert ensuite dans l'éditeur. Tout est calculé sur le téléphone ; les réponses ne sont
// pas gardées. Règles et sources : claude/ACCOMPAGNEMENT_CREATION.md du projet.

// Icône « pointer » de Lucide (licence ISC, voir NOTICE)
const HAND_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 14a8 8 0 0 1-8 8"/><path d="M18 11v-1a2 2 0 0 0-2-2a2 2 0 0 0-2 2"/><path d="M14 10V9a2 2 0 0 0-2-2a2 2 0 0 0-2 2v1"/><path d="M10 9.5V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v10"/><path d="M18 11a2 2 0 1 1 4 0v3a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/></svg>';

const AIDE_STEPS = 5;
let aide = null;

const AIDE_GOALS = [
  ['masse', 'Prendre de la masse', 'Faire grossir tes muscles'],
  ['force', 'Développer ma force', 'Soulever plus lourd, à la barre surtout'],
  ['forme', 'Rester en forme', 'Tout le corps, avec un peu de cardio'],
  ['endurance', 'Travailler mon endurance', 'Plus de répétitions, des repos courts'],
  ['gras', 'Perdre du gras', 'Musculation et cardio à chaque séance']
];
const AIDE_LEVELS = [
  ['debut', 'Je débute ou je reprends', 'Aucune habitude sportive, ou une longue pause'],
  ['mois', 'Je pratique depuis quelques mois', 'Environ 6 mois de pratique régulière'],
  ['annees', "Je m'entraîne depuis des années", 'Plusieurs années de pratique régulière']
];
const AIDE_TIMES = [
  [20, '20 min', "L'essentiel : les grands mouvements"],
  [30, '30 min', 'Les grands mouvements et un peu plus'],
  [45, '45 min', 'Une séance complète'],
  [60, '1 h', "Plus d'exercices pour chaque muscle"],
  [90, '1 h 30 et plus', 'Le volume le plus complet']
];
// Séances conseillées selon le niveau (ACSM 2009) et ligne grise sous chaque nombre
const AIDE_RECO = { debut: [2, 3], mois: [3, 4], annees: [4, 5] };
const AIDE_FREQ_SUB = {
  debut: ['Possible, mais les progrès peuvent être lents', 'Recommandé pour toi', 'Recommandé pour toi', 'Un peu plus que conseillé', 'Beaucoup pour commencer', 'À éviter'],
  mois: ['Possible, mais les progrès peuvent être lents', 'Suffisant pour progresser', 'Recommandé pour toi', 'Recommandé pour toi', 'Un peu plus que conseillé', 'Beaucoup, veille à bien récupérer'],
  annees: ['Possible, mais les progrès peuvent être lents', 'Pour entretenir ton niveau', 'Suffisant pour progresser', 'Recommandé pour toi', 'Recommandé pour toi', 'Possible si tu récupères bien']
};
const AIDE_GEAR_ITEMS = [['halteres', 'Haltères'], ['banc', 'Banc'], ['barre_traction', 'Barre de traction'], ['elastique', 'Élastique']];
const AIDE_NAMES = { masse: 'Prise de masse', force: 'Force', forme: 'Forme', endurance: 'Endurance', gras: 'Perte de gras' };

function openAide() {
  // 1.8.89 : l'écran « Avant de commencer » (step 0) s'affiche à chaque ouverture ; l'accord n'est pas gardé
  aide = { step: 0, accepted: false, goal: null, level: null, time: null, freq: null, gear: null, items: [], detail: false, result: null };
  setProgramView('aide');
}

function aideBack() {
  if (!aide) return setProgramView('choose');
  if (aide.step === 'result') { aide.step = AIDE_STEPS; aide.result = null; }
  else if (aide.step > 0) aide.step--;
  else { aide = null; setProgramView('choose'); return; }
  renderAide();
}

function aideNext() {
  if (!aide || !aideAnswered()) return;
  if (aide.step < AIDE_STEPS) aide.step++;
  else { aide.result = aideBuild(aide); aide.step = 'result'; aide.detail = false; }
  renderAide();
}

function aideAnswered() {
  switch (aide.step) {
    case 0: return !!aide.accepted;
    case 1: return !!aide.goal;
    case 2: return !!aide.level;
    case 3: return !!aide.time;
    case 4: return !!aide.freq;
    case 5: return aide.gear === 'salle' || aide.gear === 'none' || (aide.gear === 'some' && aide.items.length > 0);
    default: return true;
  }
}

function aideToggleAccept() {
  if (!aide) return;
  aide.accepted = !aide.accepted;
  renderAide();
}

function aidePick(field, value) {
  if (!aide) return;
  aide[field] = value;
  if (field === 'gear' && value !== 'some') aide.items = [];
  renderAide();
}

function aideToggleItem(id) {
  if (!aide) return;
  aide.gear = 'some';
  const i = aide.items.indexOf(id);
  if (i >= 0) aide.items.splice(i, 1); else aide.items.push(id);
  renderAide();
}

function aideToggleDetail() {
  if (!aide) return;
  aide.detail = !aide.detail;
  renderAide();
}

function aideOpenEditor() {
  if (!aide || !aide.result) return;
  const r = aide.result;
  startProgramEditor(r.kind, null, { name: r.name, goal: r.goal, sessions: r.sessions.map(s => ({ key: s.key, name: s.name, exercises: s.exercises })) });
}

function renderAide() {
  const container = document.getElementById('program-overview');
  if (container && programView === 'aide') container.innerHTML = aideHtml();
  const scroller = document.getElementById('app-scroll');
  if (scroller) scroller.scrollTop = 0;
}

// --- Écrans ---
function aideOptHtml({ title, sub, on, multi, onclick }) {
  return `<button type="button" class="aide-row${on ? ' on' : ''}" role="${multi ? 'checkbox' : 'radio'}" aria-checked="${on ? 'true' : 'false'}" onclick="${onclick}">
    <span class="aide-tick${multi ? ' sq' : ''}" aria-hidden="true">${on ? CHECK_SVG : '<i></i>'}</span>
    <span class="aide-row-t"><b>${escapeHtml(title)}</b>${sub ? `<span>${escapeHtml(sub)}</span>` : ''}</span>
  </button>`;
}

function aideNavHtml(label, ok, next) {
  return `<div class="prog-spacer" aria-hidden="true"></div>
    <div class="aide-nav"><button type="button" class="btn btn-secondary" onclick="aideBack()">Retour</button>
    <button type="button" class="btn" id="aide-next" onclick="${next || 'aideNext()'}"${ok ? '' : ' disabled'}>${label}</button></div>`;
}

function aideAmberHtml(icon, text, cls = '') {
  return `<div class="advice-item advice-warning aide-amber ${cls}"><span class="aide-amber-ico" aria-hidden="true">${icon}</span><span class="advice-text">${text}</span></div>`;
}

// 1.8.89 : « Avant de commencer » (planches 38e et 38f) ; « Continuer » reste inactif tant que la case n'est pas cochée
function aideDisclaimerHtml() {
  return `<div class="aide-head"><span class="choose-head">Ton programme sur mesure</span><h2 class="aide-q">Avant de commencer</h2></div>
    <div class="aide-disc">
      <p>Ce questionnaire t'aide à créer un programme. La proposition qui en découle est purement informative : elle ne constitue pas un avis professionnel.</p>
      <p>Toute pratique physique comporte un risque de blessure. Il est conseillé de consulter un médecin avant de commencer un programme, en particulier si tu as des antécédents médicaux ou des douleurs.</p>
      <p>Tu utilises ces suggestions sous ta seule responsabilité. Arrête immédiatement un exercice en cas de douleur ou de malaise. Respecte tes sensations et ton rythme, progresse doucement, et n'oublie pas de bien t'échauffer.</p>
    </div>
    <div class="aide-rows">${aideOptHtml({ title: "J'ai lu et j'accepte", on: aide.accepted, multi: true, onclick: 'aideToggleAccept()' })}</div>
    ${aideNavHtml('Continuer', aide.accepted)}`;
}

function aideHtml() {
  if (!aide) aide = { step: 0, accepted: false, goal: null, level: null, time: null, freq: null, gear: null, items: [], detail: false, result: null };
  if (aide.step === 'result') return aideResultHtml();
  if (aide.step === 0) return aideDisclaimerHtml();
  const n = aide.step;
  const bar = Array.from({ length: AIDE_STEPS }, (_, i) => `<span class="${i < n ? 'on' : ''}"></span>`).join('');
  const QUESTIONS = ['Ton objectif ?', 'Où en es-tu ?', 'Combien de temps es-tu prêt à passer par séance ?',
    'Combien de séances par semaine peux-tu réaliser ?', 'De quel matériel disposes-tu ?'];
  let body = '';
  if (n === 1) body = AIDE_GOALS.map(([v, t, s]) => aideOptHtml({ title: t, sub: s, on: aide.goal === v, onclick: `aidePick('goal','${v}')` })).join('');
  if (n === 2) body = AIDE_LEVELS.map(([v, t, s]) => aideOptHtml({ title: t, sub: s, on: aide.level === v, onclick: `aidePick('level','${v}')` })).join('');
  if (n === 3) body = AIDE_TIMES.map(([v, t, s]) => aideOptHtml({ title: t, sub: s, on: aide.time === v, onclick: `aidePick('time',${v})` })).join('');
  let before = '';
  if (n === 4) {
    const lv = aide.level || 'debut';
    const [a, b] = AIDE_RECO[lv];
    before = aideAmberHtml(HAND_SVG, `Selon tes premières réponses, il est recommandé de faire ${a} ou ${b} séances par semaine. Choisis ce que tu es prêt à réaliser.`, 'aide-reco');
    body = [1, 2, 3, 4, 5, 6].map(k => aideOptHtml({ title: `${k} séance${k > 1 ? 's' : ''}`, sub: AIDE_FREQ_SUB[lv][k - 1], on: aide.freq === k, onclick: `aidePick('freq',${k})` })).join('');
  }
  if (n === 5) {
    body = aideOptHtml({ title: 'Salle complète', sub: 'Barres, machines et poulies', on: aide.gear === 'salle', onclick: "aidePick('gear','salle')" })
      + aideOptHtml({ title: 'Un peu de matériel', sub: 'Coche ce que tu as', on: aide.gear === 'some', onclick: "aidePick('gear','some')" })
      + `<div class="aide-sub" role="group" aria-label="Ton matériel">${AIDE_GEAR_ITEMS.map(([v, t]) =>
        aideOptHtml({ title: t, on: aide.items.includes(v), multi: true, onclick: `aideToggleItem('${v}')` })).join('')}</div>`
      + aideOptHtml({ title: 'Aucun', sub: 'Juste le poids du corps', on: aide.gear === 'none', onclick: "aidePick('gear','none')" });
  }
  return `<div class="aide-head"><span class="choose-head">Ton programme sur mesure</span>
      <div class="aide-bar" role="progressbar" aria-valuemin="1" aria-valuemax="${AIDE_STEPS}" aria-valuenow="${n}" aria-label="Question ${n} sur ${AIDE_STEPS}">${bar}</div>
      <span class="aide-step">Question ${n} sur ${AIDE_STEPS}</span><h2 class="aide-q">${QUESTIONS[n - 1]}</h2></div>
    ${before}<div class="aide-rows" role="${n === 5 ? 'group' : 'radiogroup'}">${body}</div>
    ${aideNavHtml(n === AIDE_STEPS ? 'Voir ma proposition' : 'Suivant', aideAnswered())}`;
}

function aideExRowHtml(e, goal) {
  const info = exInfo(e.exId);
  let sub;
  if (info.cardio) sub = info.mode === 'floors' ? 'Cardio · durée, étages' : info.mode === 'time' ? 'Cardio · durée' : `Cardio · environ ${e.minutes || 10} min`;
  else {
    const reps = goalPrescription(info, goal).reps;
    sub = `${e.sets} série${e.sets > 1 ? 's' : ''} · ${reps}${info.mode === 'time' ? '' : ' reps'}`;
  }
  return `<div class="ed-row"><span class="ex-icon-badge">${getIcon(e.exId, true)}</span><span class="ed-row-text"><span class="ed-row-name">${escapeHtml(info.name)}</span><span class="ed-row-sub">${escapeHtml(sub)}</span></span></div>`;
}

function aideSessionStats(s) {
  const ne = s.exercises.length;
  const ns = s.exercises.reduce((t, e) => t + (exInfo(e.exId).cardio ? 0 : e.sets), 0);
  return `${ne} exercice${ne > 1 ? 's' : ''} · ${ns} série${ns > 1 ? 's' : ''}`;
}

function aideResultHtml() {
  const r = aide.result;
  const libre = r.kind === 'libre';
  const ico = libre ? '<span class="type-pill type-pill-libre">1×</span>' : `<span class="prog-ico dark">${SWAP_SVG}</span>`;
  let content = '';
  if (libre) {
    content = `<div class="ed-list">${r.sessions[0].exercises.map(e => aideExRowHtml(e, r.goal)).join('')}</div>`;
  } else {
    content = `<div class="aide-sessions"><span class="aide-line" aria-hidden="true"></span>
      ${r.sessions.map(s => `<div class="aide-sess"><span class="type-pill type-pill-${s.key}">${s.key}</span><span class="aide-sess-t"><b>${escapeHtml(s.name)}</b><span>${aideSessionStats(s)}</span></span></div>
        ${aide.detail ? `<div class="ed-list aide-sess-ex">${s.exercises.map(e => aideExRowHtml(e, r.goal)).join('')}</div>` : ''}`).join('')}
      <button type="button" class="aide-detail-btn" aria-expanded="${aide.detail}" onclick="aideToggleDetail()">${aide.detail ? '- de détail' : '+ de détail'}</button></div>`;
  }
  const why = `<div class="advice-item advice-info aide-why"><span class="aide-why-h">Pourquoi ce choix ?</span>
    ${r.reasons.map(([t, src]) => `<p>${escapeHtml(t)}<small>${escapeHtml(src)}</small></p>`).join('')}</div>`;
  const end = libre
    ? "Cette séance te plaît ? Ouvre-la dans l'éditeur pour terminer de l'ajuster et lui donner un nom. Enregistre-la, et bonne pratique !"
    : "Ce programme te plaît ? Ouvre-le dans l'éditeur pour terminer de l'ajuster et lui donner un nom. Enregistre-le, et bonne pratique !";
  return `<div class="aide-head"><span class="choose-head">Voici ta proposition</span></div>
    <div class="ed-kind">${ico}<div><div class="ed-kind-title">${escapeHtml(r.name)}</div><div class="ed-kind-sub">${escapeHtml(r.sub)}</div></div></div>
    ${content}${why}${aideAmberHtml(PEN_SVG, end, 'aide-end')}
    <p class="aide-recall">Conseil général, sans valeur d'avis professionnel : tu l'utilises sous ta responsabilité. Arrête en cas de douleur et, au moindre doute, demande l'avis d'un médecin.</p>
    ${aideNavHtml("Ouvrir dans l'éditeur", true, 'aideOpenEditor()')}`;
}

// --- Règles (claude/ACCOMPAGNEMENT_CREATION.md) ---
// Familles de mouvements : gros groupes avant petits, polyarticulaires avant monoarticulaires (ACSM 2009).
// Chaque liste est rangée « machines et haltères d'abord » ; BARBELL fait passer la barre devant quand le niveau le permet.
const AIDE_FAM = {
  knee: [1, 6, 4, 3, 2, 5, 8, 7, 9],
  hip: [11, 13, 17, 14, 18, 10, 12],
  pushH: [40, 39, 42, 41, 44, 46, 45, 43],
  pullV: [25, 27, 26, 28],
  pullH: [32, 30, 31, 33, 29],
  pushV: [54, 52, 51, 53],
  lat: [55, 56],
  rear: [57, 35],
  biceps: [59, 63, 64, 62, 65, 60],
  triceps: [66, 68, 69, 70, 71],
  calves: [21, 23, 22],
  quads: [15, 16],
  abs: [76, 73, 74, 75, 72, 77, 78, 79],
  cardio: [80, 81, 82, 86, 85, 87, 24, 84, 83]
};
const AIDE_BARBELL = new Set([2, 10, 11, 12, 13, 29, 38, 39, 41, 43, 58, 60, 69]);   // 1.8.93 : 51 se fait aux haltères
const AIDE_EASY = { knee: [4, 2], hip: [13, 11], pushH: [40, 39], pullH: [30, 29], pushV: [52, 51] }; // force, débutant
const AIDE_ISO = new Set(['lat', 'rear', 'biceps', 'triceps', 'calves', 'quads']);
// Séances : [famille, variante] dans l'ordre ; la variante choisit le n-ième exercice possible de la famille
const AIDE_TEMPLATES = {
  ce: [
    { name: 'Jambes et pectoraux', slots: [['knee', 0], ['pushH', 0], ['pullV', 0], ['pushV', 0], ['biceps', 0], ['lat', 0], ['abs', 0], ['calves', 0]] },
    { name: 'Dos et ischios', slots: [['hip', 0], ['pullH', 0], ['pushH', 1], ['knee', 1], ['triceps', 0], ['rear', 0], ['abs', 1], ['calves', 1]] },
    { name: 'Épaules et fessiers', slots: [['hip', 1], ['pushV', 1], ['pullV', 1], ['knee', 2], ['lat', 0], ['rear', 1], ['abs', 2], ['biceps', 1]] },
    { name: 'Jambes et dos', slots: [['knee', 3], ['pullH', 1], ['pushH', 2], ['hip', 2], ['biceps', 1], ['triceps', 1], ['abs', 3], ['calves', 0]] }
  ],
  haut: { name: 'Haut du corps', slots: [['pushH', 0], ['pullV', 0], ['pullH', 0], ['pushV', 0], ['lat', 0], ['biceps', 0], ['triceps', 0], ['rear', 0]] },
  haut2: { name: 'Haut du corps', slots: [['pushH', 1], ['pullH', 1], ['pullV', 1], ['pushV', 1], ['rear', 0], ['triceps', 1], ['biceps', 1], ['lat', 1]] },
  bas: { name: 'Bas du corps', slots: [['knee', 0], ['hip', 0], ['knee', 1], ['hip', 2], ['calves', 0], ['abs', 0], ['quads', 0]] },
  bas2: { name: 'Bas du corps', slots: [['hip', 1], ['knee', 2], ['hip', 3], ['knee', 3], ['calves', 1], ['abs', 1], ['quads', 0]] },
  poussee: { name: 'Poussée', slots: [['pushH', 0], ['pushV', 0], ['pushH', 1], ['triceps', 0], ['lat', 0], ['triceps', 1], ['abs', 0]] },
  tirage: { name: 'Tirage', slots: [['pullV', 0], ['pullH', 0], ['pullH', 1], ['rear', 0], ['biceps', 0], ['biceps', 1], ['abs', 1]] },
  jambes: { name: 'Jambes', slots: [['knee', 0], ['hip', 0], ['knee', 1], ['hip', 2], ['calves', 0], ['quads', 0], ['abs', 2]] }
};
const AIDE_FALLBACK = { pullV: ['pullH'], pullH: ['pullV'], pushV: ['pushH'], pushH: ['pushV'], hip: ['knee'], knee: ['hip'] };

function aideGearOk(id, ans) {
  const g = exInfo(id).gear || ['salle'];
  if (ans.gear === 'salle') return true;
  const have = ans.gear === 'some' ? ans.items : [];
  return g.every(x => x !== 'salle' && have.includes(x));
}

function aideOrder(fam, ans) {
  let list = AIDE_FAM[fam].filter(id => CATALOGUE_BY_ID[id] && aideGearOk(id, ans));
  const barbellFirst = ans.goal === 'force' ? ans.level !== 'debut'
    : ans.level === 'annees' || (ans.level === 'mois' && (fam === 'knee' || fam === 'pushH'));
  if (barbellFirst) list = list.filter(id => AIDE_BARBELL.has(id)).concat(list.filter(id => !AIDE_BARBELL.has(id)));
  else if (ans.level === 'debut' && ans.goal !== 'force') list = list.filter(id => !AIDE_BARBELL.has(id)).concat(list.filter(id => AIDE_BARBELL.has(id)));
  else if (ans.goal === 'force' && AIDE_EASY[fam]) list = AIDE_EASY[fam].filter(id => list.includes(id)).concat(list.filter(id => !AIDE_EASY[fam].includes(id)));
  return list;
}

function aidePickEx(fam, variant, ans, used, depth = 0) {
  const list = aideOrder(fam, ans).filter(id => !used.has(id));
  if (list.length) return list[variant % list.length];
  if (depth === 0) for (const f of AIDE_FALLBACK[fam] || []) { const id = aidePickEx(f, variant, ans, used, 1); if (id) return id; }
  return null;
}

function aideExSeconds(id, sets, goal) {
  const rest = goalPrescription(exInfo(id), goal).rest || 90;
  return sets * (30 + rest) + 30; // environ 30 s d'effort par série et 30 s pour changer de poste
}

function aideCardioMinutes(ans, sessionIndex) {
  if (ans.goal === 'gras') return ans.time <= 30 ? 10 : 20;
  if (ans.goal === 'forme') return sessionIndex < 2 ? (ans.time <= 30 ? 10 : 15) : 0;
  if (ans.goal === 'endurance') return ans.time <= 20 ? 0 : 10;
  return 0;
}

function aideBuildSession(tpl, key, idx, ans) {
  const used = new Set();
  const exercises = [];
  let budget = ans.time * 60 - (ans.time <= 20 ? 180 : 300);
  const cardioMin = aideCardioMinutes(ans, idx);
  budget -= cardioMin * 60;
  for (const [fam, variant] of tpl.slots) {
    if (ans.goal === 'force' && AIDE_ISO.has(fam)) continue; // force : plus de polyarticulaires, moins d'isolation
    const id = aidePickEx(fam, variant, ans, used);
    if (!id) continue;
    const sets = 3;
    const cost = aideExSeconds(id, sets, ans.goal);
    if (exercises.length >= 2 && cost > budget) continue; // un exercice plus court (isolation) peut encore tenir
    used.add(id);
    exercises.push({ exId: id, sets });
    budget -= cost;
  }
  if (cardioMin) {
    const c = aideOrder('cardio', ans).find(id => !used.has(id));
    if (c) exercises.push({ exId: c, sets: exInfo(c).sets || 1, minutes: cardioMin });
  }
  return { key, name: tpl.name, exercises };
}

function aideForm(ans) {
  if (ans.freq === 1) return 'libre';
  if (ans.level === 'debut' && ans.freq <= 3) return 'libre';
  if ((ans.goal === 'forme' || ans.goal === 'gras') && ans.freq === 2) return 'libre';
  return 'program';
}

function aideTemplates(ans) {
  const n = ans.freq;
  const ceOnly = ['forme', 'endurance', 'gras'].includes(ans.goal);
  if (n <= 3 || (ceOnly && n === 4)) return AIDE_TEMPLATES.ce.slice(0, n);
  const T = AIDE_TEMPLATES;
  if (n === 4) return [T.haut, T.bas, T.haut2, T.bas2];
  if (n === 5) return [T.haut, T.bas, T.poussee, T.tirage, T.jambes];
  return [T.poussee, T.tirage, T.jambes, T.poussee, T.tirage, T.jambes];
}

function aideTimesPerWeek(ans) {
  if (aideForm(ans) === 'libre') return ans.freq;
  const ceOnly = ['forme', 'endurance', 'gras'].includes(ans.goal);
  if (ans.freq <= 3 || (ceOnly && ans.freq === 4)) return ans.freq;
  return 2;
}

function aideReasons(ans, kind) {
  const R = {
    debut: ["Tu débutes : tout le corps, 2 à 3 fois par semaine, c'est ce que recommandent les spécialistes.", 'ACSM, position officielle, 2009'],
    meme: ["Refaire la même séance t'aide à apprendre les gestes et à monter les charges. Trop changer d'exercices au début freine les progrès.", 'Kassiano et al., J Strength Cond Res, 2022'],
    machines: ["Des machines et des haltères pour commencer : plus simples à apprendre, et autant de progrès qu'avec une barre.", 'Haugen et al., Sports Medicine Open, 2023'],
    oms: ["Tout le corps 2 fois par semaine : c'est le minimum conseillé pour la santé.", 'OMS, 2020'],
    une: ['Une seule séance par semaine fait déjà progresser, mais 2 font mieux grossir le muscle.', 'Schoenfeld et al., Sports Medicine, 2016'],
    masse: ["Environ 10 séries par muscle et par semaine : c'est ce qu'il faut pour prendre de la masse.", 'ACSM, position officielle, 2026 · Schoenfeld et al., J Sports Sci, 2017'],
    force: ["Peu de répétitions avec des charges lourdes et de longs repos : c'est ce qui fait gagner le plus de force.", 'ACSM, position officielle, 2026'],
    endurance: ["Beaucoup de répétitions avec des charges légères et des repos courts : c'est ce qui entraîne l'endurance des muscles.", 'ACSM, position officielle, 2009'],
    gras: ['La musculation fait perdre du gras et garde ton muscle. La balance peut peu bouger : ton corps change quand même.', 'Wewege et al., Sports Medicine, 2022'],
    forme: ['Le cardio vient après la musculation : fait avant, il te ferait perdre de la force.', 'Sports Medicine, 2022'],
    ordre: ["Les grands mouvements d'abord, les petits ensuite, et des séances qui varient : tu progresses mieux qu'en changeant au hasard.", 'ACSM, 2009 · Kassiano et al., J Strength Cond Res, 2022'],
    court: ['Peu de temps : on garde les grands mouvements, qui font travailler le plus de muscles.', 'Iversen et al., Sports Medicine, 2021']
  };
  const out = [];
  if (kind === 'libre') {
    if (ans.freq === 1) out.push(R.une);
    else if (ans.level === 'debut') out.push(R.debut, R.meme);
    else out.push(R.oms);
  } else {
    const k = aideTimesPerWeek(ans);
    const ce = ans.freq <= 3 || (['forme', 'endurance', 'gras'].includes(ans.goal) && ans.freq === 4);
    out.push([`${ans.freq} séances${ce ? ' pour tout le corps' : ''} : chaque muscle travaille ${k} fois par semaine. Le travailler au moins 2 fois le fait mieux grossir qu'une seule.`,
      'Schoenfeld et al., Sports Medicine, 2016']);
  }
  out.push(R[ans.goal]);
  if (ans.time <= 30) out.push(R.court);
  else if (ans.level === 'debut' && ans.goal !== 'force') out.push(R.machines);
  else if (kind !== 'libre') out.push(R.ordre);
  const seen = new Set();
  return out.filter(r => r && !seen.has(r[0]) && seen.add(r[0])).slice(0, 3);
}

function aideBuild(ans) {
  const kind = aideForm(ans);
  const tpls = kind === 'libre' ? [AIDE_TEMPLATES.ce[0]] : aideTemplates(ans);
  const sessions = tpls.map((t, i) => aideBuildSession(t, kind === 'libre' ? '' : SESSION_KEYS[i], i, ans));
  const name = kind === 'libre' && ans.level === 'debut' && ans.freq > 1 ? 'Premiers pas' : AIDE_NAMES[ans.goal];
  if (kind === 'libre') sessions[0].name = name;
  const timeTxt = ans.time >= 90 ? 'environ 1 h 30' : ans.time === 60 ? 'environ 1 h' : `environ ${ans.time} min`;
  const sub = kind === 'libre'
    ? `Tout le corps · une séance à refaire ${ans.freq} fois par semaine · ${timeTxt}`.replace('1 fois par semaine', 'chaque semaine')
    : `${ans.freq} séances qui tournent en boucle${aideTimesPerWeek(ans) === ans.freq ? ', tout le corps à chaque fois' : ''} · ${timeTxt} chacune`;
  return { kind, name, goal: ans.goal, sessions, sub, reasons: aideReasons(ans, kind) };
}
