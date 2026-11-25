"""Modification depuis l'Historique d'une séance d'un programme en pause (1.8.83) : le formulaire
garde la séance choisie (son programme, sa séance, ses valeurs) et non la séance du programme en cours."""
import sys
from harness import *

res = []


def check(name, ok, extra=''):
    ok = bool(ok)
    res.append(ok)
    print(('OK   ' if ok else 'ÉCHEC'), name, extra)


SETUP = """() => {
  const act = getActiveProgram();
  const p2 = JSON.parse(JSON.stringify(act));
  p2.id = 'prog-pause-test'; p2.name = 'Ancien programme'; p2.status = 'paused'; p2.pausedAt = '2026-10-01';
  state.programs.push(p2);
  const last = state.history[state.history.length - 1];
  const h = JSON.parse(JSON.stringify(last));
  h.id = 123456789; h.programId = p2.id; h.programName = p2.name; h.kind = 'program';
  h.sessionKey = p2.sessions[p2.sessions.length - 1].key; h.sessionName = p2.sessions[p2.sessions.length - 1].name || '';
  h.date = '2026-09-15';
  state.history.push(h);
  saveState(); renderHistory();
  const idx = state.history.findIndex(x => x.programId === p2.id);
  const ex = state.history[idx].exercises.find(e => exMode(e.name) === 'weight');
  return { idx, w: ex.sets[0].weight, name: ex.name, active: act.name, key: h.sessionKey };
}"""

with Srv() as base, sync_playwright() as p:
    br = p.chromium.launch()
    ctx, pg, errs = newpage(br, 390, 844, pref='light')
    pg.goto(base + 'index.html'); pg.wait_for_timeout(800)
    info = pg.evaluate(SETUP)
    pg.evaluate("switchTab('historique')"); pg.wait_for_timeout(300)
    pg.evaluate(f"openSessionModal({info['idx']})"); pg.wait_for_timeout(200)
    pg.click('#modal-edit-btn'); pg.wait_for_timeout(500)
    check("onglet Séance ouvert", pg.evaluate("document.body.dataset.tab") == 'seance')
    check("titre = programme en pause, pas le programme en cours",
          pg.inner_text('#page-title') == 'Ancien programme', f"{pg.inner_text('#page-title')!r} (en cours : {info['active']!r})")
    check("workoutDef = le programme de la séance", pg.evaluate("workoutDef && workoutDef.programId") == 'prog-pause-test')
    check("pastille = séance d'origine", pg.inner_text('#seance-badge') == info['key'], pg.inner_text('#seance-badge'))
    check("ligne « Modification · date » visible", pg.evaluate("!document.getElementById('seance-overline').hidden"))
    val = pg.evaluate("""(n) => { const it = [...document.querySelectorAll('#exercises-list .exercise-item')]
      .find(e => e.textContent.includes(n)); const i = it && it.querySelector('.weight-input'); return i ? i.value : null; }""", info['name'])
    check("valeurs de la séance reprises", val == str(info['w']), f"{info['name']} : {val!r} / {info['w']!r}")
    toast = pg.evaluate("(window.__toastLog || []).slice(-1)[0] || ''")
    check("message au tutoiement", 'Corrige-la puis valide' in toast and 'tu n' in toast and 'vous' not in toast, toast)
    check("bouton « Enregistrer les modifications »", pg.inner_text('#submit-workout-btn') == 'Enregistrer les modifications')
    # Aller-retour vers un autre onglet : la modification reste en place
    pg.evaluate("switchTab('progression')"); pg.wait_for_timeout(300)
    pg.evaluate("switchTab('seance')"); pg.wait_for_timeout(300)
    check("après un aller-retour : toujours la séance en modification", pg.evaluate("workoutDef && workoutDef.programId") == 'prog-pause-test'
          and pg.inner_text('#page-title') == 'Ancien programme')
    # Annuler la modification : retour à la séance du programme en cours
    pg.evaluate("cancelEditSession()"); pg.wait_for_timeout(300)
    pg.evaluate("switchTab('seance')"); pg.wait_for_timeout(300)
    check("après « Annuler » : séance du programme en cours", pg.inner_text('#page-title') == info['active'], pg.inner_text('#page-title'))
    check("aucune erreur JavaScript", not errs, str(errs))
    br.close()

print(f"\n {sum(res)} / {len(res)} contrôles OK")
sys.exit(0 if all(res) else 1)
