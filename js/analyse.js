// Copyright (c) 2026 Jean-Philippe Alexander. Mon Carnet de Salle.
// SPDX-License-Identifier: PolyForm-Strict-1.0.0 (voir LICENSE et NOTICE)
// Analyse mensuelle de progression (ancienne section 13 de app.js) — sorti de app.js tel quel en 1.8.90 (co-auteur : Claude), aucun changement de fonctionnement.
// Chargé juste après app.js (index.html) ; fonctions et variables globales, comme dans app.js.

// ============================================================
// 13. ANALYSE MENSUELLE DE PROGRESSION
// ============================================================
// hist : séances du périmètre choisi (par défaut celui de l'onglet Progression) ; scope : son identifiant
function analyzeMonthlyProgress(hist = statsHistory(), scope = currentStatsScope()) {
  if (!hist || hist.length === 0) {
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

  hist.forEach(session => {
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
        sessionTypes: {}
      };
    }
    monthlyData[monthKey].totalTonnage += parseFloat(session.tonnage) || 0;
    monthlyData[monthKey].sessionCount++;
    monthlyData[monthKey].sessions.push(session);
    const sKey = session.sessionKey || session.type;
    if (session.kind !== 'libre' && SESSION_KEYS.includes(sKey)) {
      monthlyData[monthKey].sessionTypes[sKey] = (monthlyData[monthKey].sessionTypes[sKey] || 0) + 1;
    }

    if (session.exercises) {
      mergeExercises(session.exercises).forEach(ex => {
        const exName = ex.name ? canonicalExerciseName(ex.name) : '';
        if (exName) {
          allExercises.add(exName);
          if (!monthlyData[monthKey].exercises[exName]) {
            monthlyData[monthKey].exercises[exName] = { maxWeights: [], volumes: [], bwBest: [] };
          }
          // 1.7.35 : poids du corps → meilleure série (lest puis répétitions) pour les records
          if (exInfo(exName).mode === 'bw' && Array.isArray(ex.sets)) {
            const b = bestBodyweightSet(ex.sets.filter(isPerformedSet));
            if (b) monthlyData[monthKey].exercises[exName].bwBest.push(b);
          }
          if (ex.maxWeight) {
            monthlyData[monthKey].exercises[exName].maxWeights.push(parseFloat(ex.maxWeight) || 0);
          }
          if (ex.totalVolume) {
            monthlyData[monthKey].exercises[exName].volumes.push(parseFloat(ex.totalVolume) || 0);
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
      sessionTypes: {}
    });
  }

  // 3. Records battus ce mois-ci (mois calendaire réel, comparés à tout l'historique antérieur)
  const lastDataMonthKey = sortedMonths[sortedMonths.length - 1];
  // Dernier mois ayant des séances (sert aux conseils ci-dessous)
  const currentMonthData = monthlyData[lastDataMonthKey];
  const thisMonthData = monthlyData[realMonthKey];
  // 1.7.67 : calcul des records d'un mois quelconque (liste « Records battus ce mois-ci »)
  const recordsForMonth = (monthKey) => {
    const out = [];
    const monthData = monthlyData[monthKey];
    if (!monthData) return out;
    const earlierMonths = sortedMonths.filter(key => key < monthKey);
    const betterBw = (x, y) => !y || x.lest > y.lest || (x.lest === y.lest && x.reps > y.reps);
    allExercises.forEach(exName => {
      const thisEx = monthData.exercises[exName];
      // Poids du corps : record si la meilleure série du mois bat celle d'avant (plus de lest, ou plus de répétitions au même lest)
      if (thisEx && exInfo(exName).mode === 'bw' && thisEx.bwBest && thisEx.bwBest.length) {
        const cur = thisEx.bwBest.reduce((m, b) => (betterBw(b, m) ? b : m), null);
        let prev = null;
        earlierMonths.forEach(key => {
          const p = monthlyData[key].exercises[exName];
          if (p && p.bwBest) p.bwBest.forEach(b => { if (betterBw(b, prev)) prev = b; });
        });
        if (prev && betterBw(cur, prev)) {
          const byLest = cur.lest > prev.lest;
          out.push({
            exercise: exName,
            newMax: byLest ? cur.lest : cur.reps,
            improvement: byLest ? cur.lest - prev.lest : cur.reps - prev.reps,
            valueText: byLest ? lestText(cur.lest) : repsText(cur.reps),
            improvementText: byLest ? `+${String(cur.lest - prev.lest).replace('.', ',')} kg` : `+${cur.reps - prev.reps} rép.`
          });
        }
        return;
      }
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
        out.push({
          exercise: exName,
          newMax: currentMax,
          improvement: currentMax - previousMax
        });
      }
    });
    return out;
  };
  // 1.7.69 : même règle que les bilans et les trophées (cardio et temps compris, pas de premier passage)
  const currentMonthRecords = !thisMonthData ? [] : typeof bilanRecordsIn !== 'function' ? recordsForMonth(realMonthKey)
    : bilanRecordsIn(hist, realMonthKey).map(r => r.bw
      ? (r.cur.lest > r.prevBw.lest
        ? { exercise: r.name, newMax: r.cur.lest, improvement: r.cur.lest - r.prevBw.lest, valueText: lestText(r.cur.lest), improvementText: `+${String(r.cur.lest - r.prevBw.lest).replace('.', ',')} kg` }
        : { exercise: r.name, newMax: r.cur.reps, improvement: r.cur.reps - r.prevBw.reps, valueText: repsText(r.cur.reps), improvementText: `+${r.cur.reps - r.prevBw.reps} rép.` })
      : r.rule && r.rule.kind !== 'weight'   // 1.7.89 : durée ou allure / vitesse (cardio)
      ? (t => ({ exercise: r.name, newMax: r.value, improvement: Math.abs(r.value - r.prev), valueText: t.value, improvementText: t.gain }))(recordTexts(r.name, r.rule, r.value, r.prev))
      : { exercise: r.name, newMax: r.value, improvement: r.value - r.prev });
  // 1.7.67–1.7.68 : trophées = records battus chaque mois, comptés comme les bilans du mois (bilanRecordCountIn,
  // même périmètre que la page), depuis le premier mois du périmètre jusqu'au mois en cours
  const SHORT_MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  const trophyMonths = [];
  const firstKey = hist.map(h => (h.date || '').slice(0, 7)).filter(k => /^\d{4}-\d{2}$/.test(k)).sort()[0];
  if (firstKey) {
    for (let off = 0; off < 600; off++) {
      const key = monthKeyFromOffset(off);
      if (key < firstKey) break;
      const count = typeof bilanRecordCountIn === 'function' ? bilanRecordCountIn(hist, key) : recordsForMonth(key).length;
      trophyMonths.unshift({ key, label: SHORT_MONTHS[Number(key.slice(5, 7)) - 1], count });
    }
  }

  // 4. Détecter les paliers : pour chaque exercice, sur ses 4 dernières séances réalisées
  // (indépendamment des mois). Il y a palier quand aucune des 3 séances suivantes ne dépasse la plus
  // ancienne des 4, ni en charge max ni en volume. La série est prolongée tant que c'est vrai.
  const PLATEAU_WINDOW = 4;
  const exerciseSessions = {};

  hist
    .filter(session => session.date && session.exercises)
    .slice()
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : (a.id || 0) - (b.id || 0)))
    .forEach(session => {
      const perExercise = {};
      session.exercises.forEach(ex => {
        const maxWeight = parseFloat(ex.maxWeight) || 0;
        const exName = ex.name ? canonicalExerciseName(ex.name) : '';
        if (!exName || maxWeight <= 0) return; // exercice non réalisé
        if (!perExercise[exName]) {
          perExercise[exName] = { date: session.date, maxWeight: 0, totalVolume: 0 };
        }
        perExercise[exName].maxWeight = Math.max(perExercise[exName].maxWeight, maxWeight);
        perExercise[exName].totalVolume += parseFloat(ex.totalVolume) || 0;
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

  // 5b. Progression par séance (A, B…) sur l'ensemble de l'historique de l'élément, sans tenir compte des mois :
  // médiane du tonnage des (jusqu'à) 3 dernières séances vs les 3 premières, séances de décharge exclues.
  // Séance libre : sur ses propres occurrences. « Tous » : une ligne par programme, l'indice est la moyenne des programmes.
  const median = values => {
    const sorted = values.slice().sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  };
  const progressOf = sessions => {
    const tonnages = sessions
      .filter(session => session.date && !session.isDeload && (parseFloat(session.tonnage) || 0) > 0)
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : (a.id || 0) - (b.id || 0)))
      .map(session => parseFloat(session.tonnage));
    let percent = null;
    if (tonnages.length >= 2) {
      const n = Math.min(3, Math.floor(tonnages.length / 2));
      const first = median(tonnages.slice(0, n));
      const last = median(tonnages.slice(-n));
      if (first > 0) percent = Math.round(((last - first) / first) * 100);
    }
    return { percent, sessions: tonnages.length };
  };
  const average = list => (list.length ? Math.round(list.reduce((sum, v) => sum + v, 0) / list.length) : null);
  // Indice d'un programme (moyenne de ses séances) ou d'une séance libre (ses occurrences)
  const programIndex = (sessions, libre) => {
    if (libre) return progressOf(sessions).percent;
    const keys = SESSION_KEYS.filter(k => sessions.some(x => (x.sessionKey || x.type) === k));
    return average(keys.map(k => progressOf(sessions.filter(x => (x.sessionKey || x.type) === k)).percent).filter(v => v !== null));
  };

  const sessionProgress = {};
  const programProgress = [];
  let globalProgressIndex = null;
  if (scope === 'all') {
    const ids = [];
    hist.forEach(h => { if (h.programId && !ids.includes(h.programId)) ids.push(h.programId); });
    ids.forEach(id => {
      const sessions = hist.filter(h => h.programId === id);
      const libre = sessions[0] && sessions[0].kind === 'libre';
      const p = getProgram(id);
      programProgress.push({ id, name: p ? p.name : (sessions[sessions.length - 1].programName || 'Programme'), libre, percent: programIndex(sessions, libre) });
    });
    globalProgressIndex = average(programProgress.filter(x => !x.libre && x.percent !== null).map(x => x.percent));
  } else if (statsScopeIsLibre(scope)) {
    globalProgressIndex = programIndex(hist, true);
  } else {
    statsLetters(scope).forEach(k => { sessionProgress[k] = progressOf(hist.filter(x => (x.sessionKey || x.type) === k)); });
    globalProgressIndex = average(Object.values(sessionProgress).map(x => x.percent).filter(v => v !== null));
  }

  const overallStats = {
    lastVsPreviousDiffPercent: lastVsPreviousDiffPercent,
    globalProgressIndex: globalProgressIndex,
    sessionProgress: sessionProgress,
    programProgress: programProgress
  };

  // 6. Conseils personnalisés
  const advice = [];

  // Détecter un déséquilibre entre les séances du programme (A, B…)
  const letters = scope === 'all' ? [] : statsLetters(scope);
  if (letters.length >= 2 && currentMonthData) {
    const counts = letters.map(k => currentMonthData.sessionTypes[k] || 0);
    const totalSessions = counts.reduce((a, b) => a + b, 0);
    if (totalSessions >= letters.length) {
      const avg = totalSessions / letters.length;
      const maxType = Math.max(...counts);
      if (maxType > avg * 1.5) {
        const maxTypeName = letters[counts.indexOf(maxType)];
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
    trophyMonths: trophyMonths,
    plateaus: plateaus,
    overallStats: overallStats,
    advice: advice
  };
}

// Bloc héros : indice de progression global + pastille « X % vs mois précédent »
// « juillet 2026 » (1.7.68 : « depuis juillet 2026 » sous le total de trophées)
function monthLabelLower(key) {
  const M = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  return M[Number(key.slice(5, 7)) - 1] + ' ' + key.slice(0, 4);
}

function renderHero(stats) {
  const idx = document.getElementById('hero-index');
  const pill = document.getElementById('hero-pill');
  if (idx) {
    const g = stats ? stats.globalProgressIndex : null;
    idx.textContent = (g === null || g === undefined) ? '–' : `${g > 0 ? '+' : ''}${g} %`;
  }
  if (pill) {
    const d = stats ? stats.lastVsPreviousDiffPercent : null;
    if (d === null || d === undefined) {
      pill.hidden = true;
    } else {
      pill.hidden = false;
      pill.textContent = `${d > 0 ? '▲ +' : d < 0 ? '▼ ' : ''}${d} % vs mois précédent`;
    }
  }
}

function renderProgressAnalysis() {
  const container = document.getElementById('monthly-analysis');
  if (!container) return;

  const analysis = analyzeMonthlyProgress();
  const stats = analysis.overallStats;
  renderHero(stats);
  let html = '';

  // Si pas de données
  if (analysis.monthlyData.length === 0) {
    container.innerHTML = `
      <div class="card analysis-empty">
        <p>\ud83d\udcca Aucune donnée disponible.</p>
        <p class="analysis-empty-hint">Enregistre des séances pour voir ta progression !</p>
      </div>`;
    return;
  }

  // 1. 4 derniers mois : barres horizontales (le mois courant en indigo)
  const maxTonnage = Math.max(...analysis.monthlyData.map(m => m.totalTonnage), 1);
  html += `<div class="card"><h3 class="analysis-section-title">4 derniers mois</h3><div class="bar-list">`;
  analysis.monthlyData.forEach(month => {
    const tonnageInTonnes = (month.totalTonnage / 1000).toFixed(1);
    const isCurrentMonth = month.year + '-' + month.month === analysis.currentMonthKey;
    const monthLabel = isCurrentMonth ? 'Ce mois-ci' : `${month.monthName} ${month.year}`;
    const width = Math.round((month.totalTonnage / maxTonnage) * 100);
    // 1.7.50 : un mois terminé avec des séances ouvre son bilan
    const monthKey = month.year + '-' + String(month.month).padStart(2, '0');
    const link = !isCurrentMonth && month.sessionCount > 0;
    html += `
      <div${link ? ` class="bar-row-link" role="button" tabindex="0" onclick="openBilan('${monthKey}', false)" onkeydown="if(event.key==='Enter')openBilan('${monthKey}', false)" aria-label="Bilan ${bilanDeMois(monthKey)} ${month.year}"` : ''}>
        <div class="bar-row-head">
          <span><span class="bar-label">${monthLabel}</span> <span class="bar-meta">· ${month.sessionCount} séance${month.sessionCount > 1 ? 's' : ''}</span></span>
          <span class="bar-value">${tonnageInTonnes} T${link ? `<span class="bar-chevron">${BILAN_CHEVRON}</span>` : ''}</span>
        </div>
        <div class="bar-track"><div class="bar-fill${isCurrentMonth ? ' current' : ''}" style="width:${width}%"></div></div>
      </div>`;
  });
  html += `</div>`;
  if (bilanDoneKeys(true).length) html += `<div class="bilan-all"><button type="button" class="link-btn" onclick="openAllBilans()">Tous les bilans</button></div>`; // 1.7.50
  html += `</div>`;

  // 1.7.67–1.7.68 : Trophées — records battus chaque mois depuis le début du périmètre (planche 25d) : total en grand, barres fines
  // dorées terminées par un trophée et le nombre au-dessus ; un mois sans record = petit rond gris et « 0 »
  if (analysis.trophyMonths && analysis.trophyMonths.length) {
    const tm = analysis.trophyMonths;
    const total = tm.reduce((n, m) => n + m.count, 0);
    const max = Math.max(1, ...tm.map(m => m.count));
    const aria = 'Trophées par mois : ' + tm.map(m => `${m.label} ${m.count}`).join(', ');
    html += `<div class="card trophy-card"><h3 class="analysis-section-title">Trophées</h3>
      <div class="weight-current"><span class="weight-value" id="trophy-total">${total}</span><span class="weight-unit" id="trophy-since">${currentStatsScope() === 'all' ? 'tous programmes confondus' : 'depuis ' + monthLabelLower(tm[0].key)}</span></div>
      <div class="trophy-chart" role="img" aria-label="${escapeHtml(aria)}"><div class="trophy-grid" aria-hidden="true"><span></span><span></span><span></span></div><div class="trophy-scroll" id="trophy-scroll"><div class="trophy-cols">`;
    tm.forEach(m => {
      const h = m.count ? Math.round(84 * m.count / max) : 0;
      html += `<div class="trophy-col${m.count ? '' : ' zero'}" data-month="${m.key}"><div class="trophy-bar">
        <span class="trophy-n">${m.count}</span>
        ${m.count ? `<span class="trophy-ico">${TROPHY_SVG}</span>` : '<span class="trophy-dot"></span>'}
        <span class="trophy-stem" style="height:${h}px"></span></div><span class="trophy-month">${m.label}</span></div>`;
    });
    html += `</div></div></div></div>`;
  }

  // 2. Records battus ce mois-ci
  if (analysis.currentMonthRecords.length > 0) {
    html += `<div class="card"><h3 class="analysis-section-title">Records battus ce mois-ci</h3><div class="records-list">`;
    analysis.currentMonthRecords.forEach(record => {
      html += `
        <div class="record-item">
          <span class="record-exercise">${record.exercise}</span>
          <span class="record-value">${record.valueText || record.newMax + ' kg'}</span>
          <span class="record-improvement">${record.improvementText || '+' + record.improvement + ' kg'}</span>
        </div>`;
    });
    html += `</div></div>`;
  }

  // 3. Paliers détectés (1.7.88 : une ligne par palier, nom et charge, dans un seul bloc ambré)
  html += `<div class="card"><h3 class="analysis-section-title">Paliers détectés</h3>`;
  if (analysis.plateaus.length > 0) {
    html += `<div class="plateaus-list">`;
    analysis.plateaus.forEach(plateau => {
      html += `
        <div class="plateau-item">
          <span class="plateau-exercise">${plateau.exercise}</span>
          <span class="plateau-value">${plateau.currentMax} kg</span>
        </div>`;
    });
    html += `</div>`;
  } else {
    html += `<p class="analysis-none">Aucun palier détecté</p>`;
  }
  html += `</div>`;

  // 4. Progression par séance (A, B…) du programme, ou par programme pour « Tous »
  if (stats) {
    const rows = [];
    if (stats.programProgress && stats.programProgress.length) {
      stats.programProgress.filter(x => x.percent !== null).forEach(x => rows.push({ pill: x.libre ? '<span class="type-pill type-pill-libre small">1×</span>' : `<span class="mem-ico small">${SWAP_SVG}</span>`, label: x.name, cls: 'neutral', percent: x.percent }));
    } else {
      Object.keys(stats.sessionProgress).filter(t => stats.sessionProgress[t].percent !== null && stats.sessionProgress[t].percent !== undefined)
        .forEach(t => rows.push({ pill: `<span class="type-pill type-pill-${t} small">${t}</span>`, cls: `type-${t}`, percent: stats.sessionProgress[t].percent }));
    }
    if (rows.length > 0) {
      const byProgram = !!(stats.programProgress && stats.programProgress.length);
      const maxAbs = Math.max(...rows.map(r => Math.abs(r.percent)), 1);
      html += `<div class="card"><h3 class="analysis-section-title">${byProgram ? 'Progression par programme' : 'Progression par séance'}</h3>`;
      rows.forEach(r => {
        const cls = r.percent >= 0 ? 'positive' : 'negative';
        const symbol = r.percent >= 0 ? '\u25b2' : '\u25bc';
        const width = Math.max(3, Math.round((Math.abs(r.percent) / maxAbs) * 100));
        html += `
          <div class="progress-row${r.label ? ' named' : ''}">
            ${r.pill}
            ${r.label ? `<span class="progress-name">${escapeHtml(r.label)}</span>` : ''}
            <div class="bar-track"><div class="bar-fill ${r.cls}" style="width:${width}%"></div></div>
            <span class="stat-value ${cls}">${symbol} ${Math.abs(r.percent)} %</span>
          </div>`;
      });
      html += `<p class="analysis-note">${byProgram
        ? 'Indice de chaque programme ou séance libre sur tout son historique. L\'indice global est la moyenne des programmes.'
        : 'Tonnage médian des 3 dernières séances vs les 3 premières, sur tout l\'historique (sans tenir compte des mois). L\'indice est la moyenne des séances du programme.'}</p></div>`;
    }
  }

  // 5. Conseils
  if (analysis.advice.length > 0) {
    html += `<div class="card"><div class="advice-list">`;
    analysis.advice.forEach(adviceItem => {
      const icon = adviceItem.type === 'success' ? '\u2705' :
                   adviceItem.type === 'warning' ? '\u26a0\ufe0f' :
                   adviceItem.type === 'info' ? '\u2139\ufe0f' : '\ud83d\udcad';
      html += `
        <div class="advice-item advice-${adviceItem.type}">
          <span class="advice-icon">${icon}</span>
          <span class="advice-text">${adviceItem.text}</span>
        </div>`;
    });
    html += `</div></div>`;
  }

  container.innerHTML = html;
  // 1.7.68 : si les mois débordent, on arrive sur le mois en cours (à droite)
  const ts = document.getElementById('trophy-scroll');
  if (ts) ts.scrollLeft = ts.scrollWidth;
}
