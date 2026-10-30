// Analyse fine de stagnation - Suivi Fitness
// Compare, pour chaque exercice, les 3 dernières séances réellement effectuées
// hors déload aux 3 séances précédentes, en charge maximale et en volume.
(function () {
  'use strict';

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (character) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[character];
    });
  }

  function readState() {
    try {
      return JSON.parse(localStorage.getItem('h49_state'));
    } catch (error) {
      return null;
    }
  }

  function isDeloadSession(index) {
    const sessionNumber = index + 1;
    return sessionNumber % 12 === 0 || sessionNumber % 12 >= 10;
  }

  function isPerformedSet(set) {
    return !!set && (parseFloat(set.weight) || 0) > 0 && (parseFloat(set.reps) || 0) > 0;
  }

  function formatDate(value) {
    const date = new Date(value);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  }

  function collectExerciseSessions(state) {
    const history = (state && Array.isArray(state.history)) ? state.history : [];
    const byExercise = {};

    history.forEach(function (session, index) {
      const deload = session.isDeload === true || isDeloadSession(index);
      if (deload || !Array.isArray(session.exercises)) return;

      session.exercises.forEach(function (exercise) {
        if (!exercise || !exercise.name || !Array.isArray(exercise.sets)) return;

        const performed = exercise.sets.filter(isPerformedSet);
        if (!performed.length) return;

        const maxWeight = Math.max.apply(null, performed.map(function (set) {
          return parseFloat(set.weight) || 0;
        }));
        const volume = performed.reduce(function (total, set) {
          return total + (parseFloat(set.weight) || 0) * (parseFloat(set.reps) || 0);
        }, 0);

        if (!byExercise[exercise.name]) byExercise[exercise.name] = [];
        byExercise[exercise.name].push({
          date: session.date,
          maxWeight: maxWeight,
          volume: Math.round(volume * 10) / 10
        });
      });
    });

    return byExercise;
  }

  function analyseExercise(sessions) {
    if (!sessions || sessions.length < 4) {
      return { status: 'insufficient', sessions: sessions ? sessions.length : 0 };
    }

    const recent = sessions.slice(-3);
    const previous = sessions.slice(-6, -3);

    const best = function (items, key) {
      return Math.max.apply(null, items.map(function (item) { return item[key]; }));
    };

    const recentMax = best(recent, 'maxWeight');
    const previousMax = best(previous, 'maxWeight');
    const recentVolume = best(recent, 'volume');
    const previousVolume = best(previous, 'volume');

    const improved = recentMax > previousMax || recentVolume > previousVolume;
    const regressed = recentMax < previousMax * 0.97 && recentVolume < previousVolume * 0.97;

    let status = 'stagnation';
    if (improved) status = 'progress';
    else if (regressed) status = 'regression';

    const bestSession = sessions.reduce(function (bestItem, item) {
      return item.maxWeight > bestItem.maxWeight ? item : bestItem;
    }, sessions[0]);

    return {
      status: status,
      sessions: sessions.length,
      recentMax: recentMax,
      previousMax: previousMax,
      recentVolume: recentVolume,
      previousVolume: previousVolume,
      lastBestDate: bestSession.date
    };
  }

  function statusLabel(status) {
    if (status === 'progress') return 'Progression';
    if (status === 'regression') return 'Régression';
    if (status === 'stagnation') return 'Stagnation';
    return 'Données insuffisantes';
  }

  function statusClass(status) {
    if (status === 'progress') return 'fine-status fine-status-progress';
    if (status === 'regression') return 'fine-status fine-status-regression';
    if (status === 'stagnation') return 'fine-status fine-status-stagnation';
    return 'fine-status fine-status-insufficient';
  }

  function render() {
    const container = document.getElementById('fine-plateau-list');
    if (!container) return;

    const state = readState();
    const byExercise = collectExerciseSessions(state);
    const names = Object.keys(byExercise).sort(function (a, b) {
      return a.localeCompare(b, 'fr');
    });

    if (!names.length) {
      container.innerHTML = '<p class="analysis-note">Aucune séance suffisante pour l\'analyse.</p>';
      return;
    }

    const rows = names.map(function (name) {
      const analysis = analyseExercise(byExercise[name]);
      let detail = '';

      if (analysis.status === 'insufficient') {
        detail = analysis.sessions + ' séance(s) effectuée(s) · 4 minimum requises';
      } else {
        detail = '3 dernières : ' + analysis.recentMax + ' kg · ' + analysis.recentVolume + ' kg de volume' +
          ' · 3 précédentes : ' + analysis.previousMax + ' kg · ' + analysis.previousVolume + ' kg' +
          ' · dernier record : ' + escapeHtml(formatDate(analysis.lastBestDate));
      }

      return [
        '<div class="fine-plateau-row">',
        '<div class="fine-plateau-head">',
        '<strong>' + escapeHtml(name) + '</strong>',
        '<span class="' + statusClass(analysis.status) + '">' + statusLabel(analysis.status) + '</span>',
        '</div>',
        '<p class="analysis-note">' + detail + '</p>',
        '</div>'
      ].join('');
    }).join('');

    container.innerHTML = rows;
  }

  function scheduleRender() {
    requestAnimationFrame(render);
  }

  document.addEventListener('click', function (event) {
    const button = event.target.closest('nav button');
    if (button) scheduleRender();
  });

  const historyList = document.getElementById('history-list');
  if (historyList && window.MutationObserver) {
    let scheduled = false;
    new MutationObserver(function () {
      if (scheduled) return;
      scheduled = true;
      setTimeout(function () {
        scheduled = false;
        scheduleRender();
      }, 250);
    }).observe(historyList, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scheduleRender);
  } else {
    scheduleRender();
  }
})();
