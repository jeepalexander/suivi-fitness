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
    check('en-têtes Durée / Distance', pg.evaluate(f"[...{first}.querySelectorAll('.sets-head span')].map(s=>s.textContent).join('|')") == 'Série|Durée|Distance (m)|')
    check('une seule ligne, valeurs par défaut 4:30 et 1000', pg.evaluate(f"{first}.querySelectorAll('.set-row').length") == 1 and pg.input_value(f"{first.replace('document.querySelector(','').rstrip(')').strip(chr(39))} .weight-input") == '4:30' and pg.input_value("#exercises-list .exercise-item .reps-input") == '1000')
    check('pas de boutons + / − pour le rameur', pg.evaluate(f"{first}.querySelector('.ex-controls').hidden"))
    check('le rameur compte dans « x / n séries »', pg.inner_text('#sets-progress-text') == '0 / 22', pg.inner_text('#sets-progress-text'))
    check('les 3 séances du programme Hypertrophie ont le rameur en tête', pg.evaluate("getProgram('hypertrophie').sessions.every(s=>s.exercises[0].exId===80)"))

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
    check("enregistrement : plus d'alert() bloquante (seule la confirmation partielle reste), fenêtre de fin affichée", not [m for m in msgs if m[0] == 'alert'] and pg.is_visible('#finish-overlay') and 'Bravo' in pg.inner_text('#finish-overlay'), str(msgs))
    check("rameur seul : pas de ligne de tonnage dans la fenêtre de fin", 'Tonnage' not in pg.inner_text('#finish-overlay'))
    pg.click('.finish-ok'); pg.wait_for_timeout(100)
    pg.screenshot(path='/tmp/claude-0/toast.png', clip={'x':0,'y':560,'width':390,'height':284})
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
    # saisie au pavé numérique : les chiffres se rangent en min:ss, l'allure suit
    w = '#exercises-list .exercise-item .weight-input'
    pg.fill(w, ''); pg.type(w, '500'); pg.wait_for_timeout(100)
    check('saisie « 500 » -> 5:00', pg.input_value(w) == '5:00', pg.input_value(w))
    pg.fill(w, ''); pg.type(w, '1015'); pg.wait_for_timeout(100)
    check('saisie « 1015 » -> 10:15', pg.input_value(w) == '10:15', pg.input_value(w))
    pg.fill(w, ''); pg.type(w, '500'); pg.wait_for_timeout(100)
    pace = pg.inner_text('#exercises-list .exercise-item .cardio-pace')
    check('allure affichée sous la saisie, aux 500 m (5:00 pour 1 050 m = 2:23 /500 m)', '2:23 /500 m' in pace, repr(pace))
    pg.fill('#exercises-list .exercise-item .reps-input', '1000'); pg.wait_for_timeout(100)
    check('allure recalculée à la saisie de la distance (5:00 / 1 000 m = 2:30 /500 m)', '2:30 /500 m' in pg.inner_text('#exercises-list .exercise-item .cardio-pace'))
    pg.fill('#exercises-list .exercise-item .reps-input', '1050')
    msgs.clear(); pg.evaluate("document.getElementById('workout-form').requestSubmit()"); pg.wait_for_timeout(300)
    check('« 500 » enregistré = 300 s', hist()[-1]['exercises'][0]['sets'][0]['seconds'] == 300 and len(hist()) == n0 + 2, json.dumps(hist()[-1]['exercises'][0]['sets']))

    # modification d'une séance : rameur précoché
    idx = len(hist()) - 1
    pg.evaluate("i=>{switchTab('historique');openSessionModal(i)}", idx)
    pg.evaluate("document.getElementById('modal-edit-btn').click()"); pg.wait_for_timeout(300)
    check('modification : rameur précoché avec 5:00 et 1050', pg.evaluate("document.querySelector('.set-row').classList.contains('done')") and pg.input_value('#exercises-list .exercise-item .weight-input') == '5:00', pg.input_value('#exercises-list .exercise-item .weight-input'))
    pg.evaluate("cancelEditSession()")

    pg.evaluate("switchTab('progression')"); pg.wait_for_timeout(300)
    check('Progression : pas de « Rameur » dans la liste des exercices', 'Rameur' not in pg.evaluate("[...document.querySelectorAll('#exercise-filter option')].map(o=>o.value)"))
    pg.evaluate("switchTab('progression')"); pg.wait_for_timeout(500)
    check('Suivi cardio : graphique présent avec 2 points, allure courante 2:23 /500 m', pg.evaluate("cardioChart && cardioChart.data.datasets[0].data.length") == 2 and pg.inner_text('#cardio-current') == '2:23' and '/500 m' in pg.inner_text('#cardio-unit'), pg.inner_text('#cardio-current'))
    check('Suivi cardio : valeurs = allure aux 500 m (4:15 pour 1 050 m = 121,4 s)', pg.evaluate("cardioChart.data.datasets[0].data[0]") == 121.4, str(pg.evaluate("cardioChart.data.datasets[0].data")))
    pg.evaluate("switchTab('programme'); toggleProgramDetail()"); pg.wait_for_timeout(300)
    check('Programme : plus de mention « Au programme » ni d\'échauffement', 'Au programme' not in pg.inner_text('#tab-programme') and 'Échauffement' not in pg.inner_text('#tab-programme'))
    check('Programme : icône du rameur = fichier rower.png', pg.evaluate("[...document.querySelectorAll('#tab-programme .ex-tile img')].some(i=>i.getAttribute('src')==='icons/rower.png')"))
    check('aucune erreur JS', not errs, str(errs))
    br.close()

print(f"\n {sum(res)} / {len(res)} contrôles OK")
sys.exit(0 if all(res) else 1)
