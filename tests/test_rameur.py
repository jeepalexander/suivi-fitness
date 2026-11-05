"""Rameur : exercice durée + distance (une seule ligne) en tête de chaque séance."""
import json, sys
from harness import *

res = []


def check(name, ok, extra=''):
    ok = bool(ok); res.append(ok)
    print(('OK   ' if ok else 'ÉCHEC'), name, extra)


with Srv() as base, sync_playwright() as p:
    br = p.chromium.launch()
    ctx, pg, errs = newpage(br, 390, 844, pref='light')
    msgs = []
    pg.on('dialog', lambda d: (msgs.append((d.type, d.message)), d.accept()))
    pg.goto(base + 'index.html'); pg.wait_for_timeout(800)
    pg.evaluate("switchTab('seance')"); pg.wait_for_timeout(400)
    hist = lambda: json.loads(pg.evaluate("localStorage.getItem('h49_state')"))['history']
    first = "document.querySelector('#exercises-list .exercise-item')"

    check('Rameur en première position, ouvert', pg.evaluate(f"{first}.dataset.ex") == 'Rameur' and pg.evaluate(f"{first}.classList.contains('open')"))
    check('en-têtes Durée / Distance', pg.evaluate(f"[...{first}.querySelectorAll('.sets-head span')].map(s=>s.textContent).join('|')") == 'Série|Durée|Distance|')
    check('une seule ligne, valeurs par défaut 4:30 et 1000', pg.evaluate(f"{first}.querySelectorAll('.set-row').length") == 1 and pg.input_value(f"{first.replace('document.querySelector(','').rstrip(')').strip(chr(39))} .weight-input") == '4:30' and pg.input_value("#exercises-list .exercise-item .reps-input") == '1000')
    check('pas de boutons + / − pour le rameur', pg.evaluate(f"{first}.querySelector('.ex-controls').hidden"))
    check('le rameur compte dans « x / n séries »', pg.inner_text('#sets-progress-text') == '0 / 22', pg.inner_text('#sets-progress-text'))
    check('les 3 séances ont le rameur en tête', pg.evaluate("['A','B','C'].every(t=>PROGRAM[t].exercises[0].name==='Rameur')"))

    # saisie à la main + coche : chrono de pause lancé
    pg.fill('#exercises-list .exercise-item .weight-input', '4:15'); pg.fill('#exercises-list .exercise-item .reps-input', '1050')
    pg.wait_for_timeout(200)
    # brouillon : la valeur « 4:15 » est conservée
    pg.reload(); pg.wait_for_timeout(800); pg.evaluate("switchTab('seance')"); pg.wait_for_timeout(300)
    check('brouillon : durée « 4:15 » et distance conservées', pg.input_value('#exercises-list .exercise-item .weight-input') == '4:15' and pg.input_value('#exercises-list .exercise-item .reps-input') == '1050')
    pg.click('#exercises-list .exercise-item .btn-check-set'); pg.wait_for_timeout(300)
    check('rameur coché : chrono de pause lancé', pg.evaluate("document.getElementById('timer-btn').classList.contains('running')"))
    check('rameur coché : exercice suivant ouvert', pg.evaluate("document.querySelector('#exercises-list .exercise-item.open').dataset.ex") == 'Presse à cuisses')

    n0 = len(hist()); msgs.clear()
    pg.evaluate("document.getElementById('workout-form').requestSubmit()"); pg.wait_for_timeout(300)
    h = hist(); last = h[-1]
    ex = last['exercises'][0]
    check('enregistré : seconds=255, meters=1050, poids/reps à 0', len(h) == n0 + 1 and ex['name'] == 'Rameur' and ex['sets'] == [{'weight': 0, 'reps': 0, 'seconds': 255, 'meters': 1050}], json.dumps(ex))
    check('tonnage non affecté par le rameur', last['tonnage'] == 0 and ex['totalVolume'] == 0 and ex['maxWeight'] == 0)

    # séance suivante : valeurs reprises
    pg.evaluate("switchTab('seance')"); pg.wait_for_timeout(400)
    check('séance suivante : dernière durée/distance reprises', pg.input_value('#exercises-list .exercise-item .weight-input') == '4:15' and pg.input_value('#exercises-list .exercise-item .reps-input') == '1050')
    check('« Dernière fois · 1 050 m en 4:15 »', 'Dernière fois' in pg.inner_text('#exercises-list .exercise-item .ex-sub') and '4:15' in pg.inner_text('#exercises-list .exercise-item .ex-sub'), pg.inner_text('#exercises-list .exercise-item .ex-sub'))

    # durée invalide refusée
    pg.fill('#exercises-list .exercise-item .weight-input', '4:75')
    pg.click('#exercises-list .exercise-item .btn-check-set'); msgs.clear()
    pg.evaluate("document.getElementById('workout-form').requestSubmit()"); pg.wait_for_timeout(200)
    check('durée invalide (4:75) : refus, rien enregistré', len(hist()) == n0 + 1 and msgs and 'rameur' in msgs[-1][1].lower(), str(msgs[-1:]))
    # un nombre seul = minutes
    pg.fill('#exercises-list .exercise-item .weight-input', '5')
    msgs.clear(); pg.evaluate("document.getElementById('workout-form').requestSubmit()"); pg.wait_for_timeout(300)
    check('« 5 » = 5 minutes (300 s)', hist()[-1]['exercises'][0]['sets'][0]['seconds'] == 300 and len(hist()) == n0 + 2, json.dumps(hist()[-1]['exercises'][0]['sets']))

    # modification d'une séance : rameur précoché
    idx = len(hist()) - 1
    pg.evaluate("i=>{switchTab('historique');openSessionModal(i)}", idx)
    pg.evaluate("document.getElementById('modal-edit-btn').click()"); pg.wait_for_timeout(300)
    check('modification : rameur précoché avec 5:00 et 1050', pg.evaluate("document.querySelector('.set-row').classList.contains('done')") and pg.input_value('#exercises-list .exercise-item .weight-input') == '5:00', pg.input_value('#exercises-list .exercise-item .weight-input'))
    pg.evaluate("cancelEditSession()")

    pg.evaluate("switchTab('progression')"); pg.wait_for_timeout(300)
    check('Graphiques : pas de « Rameur » dans la liste des exercices', 'Rameur' not in pg.evaluate("[...document.querySelectorAll('#exercise-filter option')].map(o=>o.value)"))
    check('aucune erreur JS', not errs, str(errs))
    br.close()

print(f"\n {sum(res)} / {len(res)} contrôles OK")
sys.exit(0 if all(res) else 1)
