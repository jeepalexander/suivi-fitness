"""Chrono de repos adapté à l'exercice ouvert : durée proposée, lancement, stabilité pendant le décompte."""
import sys
from harness import *

res = []


def check(name, ok, extra=''):
    res.append(ok)
    print(('OK   ' if ok else 'ÉCHEC'), name, extra)


def open_ex(pg, name):
    """Ouvre l'exercice nommé (s'il ne l'est pas déjà) et renvoie le texte du chrono."""
    pg.evaluate("""n=>{const it=[...document.querySelectorAll('#exercises-list .exercise-item')].find(i=>i.dataset.ex===n);
      if(!it.classList.contains('open'))it.querySelector('.ex-toggle').click()}""", name)
    pg.wait_for_timeout(150)
    return pg.inner_text('#timer-display')


with Srv() as base, sync_playwright() as p:
    br = p.chromium.launch()
    ctx, pg, errs = newpage(br, 390, 844, pref='light')
    pg.goto(base + 'index.html'); pg.wait_for_timeout(800)
    pg.evaluate("switchTab('seance')"); pg.wait_for_timeout(400)
    names = pg.evaluate("[...document.querySelectorAll('#exercises-list .exercise-item')].map(i=>i.dataset.ex)")
    print('  exercices de la séance :', names)

    check('au chargement : le chrono annonce la durée de l\'exercice ouvert (le rameur ouvre la séance : repos par défaut 1:30)', pg.inner_text('#timer-display') == 'PAUSE 1:30', pg.inner_text('#timer-display'))

    # durées attendues (écrites en dur, indépendantes du code)
    # (catalogue 1.7.0 : polyarticulaire lourd 3:00, polyarticulaire 2:00, isolation 1:30)
    attendu = {'Presse à cuisses': 'PAUSE 2:00', 'Développé couché': 'PAUSE 3:00', 'Développé militaire': 'PAUSE 3:00',
               'Tirage horizontal': 'PAUSE 2:00', 'Curl biceps': 'PAUSE 1:30', 'Mollets': 'PAUSE 1:30'}
    vus = {}
    for n in names:
        vus[n] = open_ex(pg, n)
    ecarts = {n: (vus[n], a) for n, a in attendu.items() if n in vus and vus[n] != a}
    check('chaque exercice ouvert tour à tour : durée du catalogue (lourd 3:00, polyarticulaire 2:00, isolation 1:30)', not ecarts, str(ecarts))
    check('les durées diffèrent selon les exercices', len(set(vus.values())) >= 3, str(sorted(set(vus.values()))))

    check('exercice inconnu : repos par défaut 1:30', pg.evaluate("restDurationFor('Exercice inconnu')") == 90)

    # replier tous les exercices : repos par défaut
    pg.evaluate("document.querySelector('#exercises-list .exercise-item.open .ex-toggle').click()"); pg.wait_for_timeout(150)
    check('aucun exercice ouvert : repos par défaut', pg.inner_text('#timer-display') == 'PAUSE 1:30', pg.inner_text('#timer-display'))

    # lancement sur un exercice d'isolation
    open_ex(pg, 'Curl biceps')
    pg.click('#timer-btn'); pg.wait_for_timeout(100)
    fin = int(pg.evaluate("localStorage.getItem('rest_end_time')"))
    reste = (fin - pg.evaluate("Date.now()")) / 1000
    check('lancement sur Curl biceps : décompte de 90 s', 88 <= reste <= 91, f'{reste:.1f} s')
    txt = pg.inner_text('#timer-display')
    check('affichage immédiat du décompte (pas « PAUSE »)', txt in ('1:30', '1:29'), txt)

    # changer d'exercice pendant le décompte : rien ne bouge
    open_ex(pg, 'Presse à cuisses'); pg.wait_for_timeout(1100)
    txt2 = pg.inner_text('#timer-display')
    fin2 = int(pg.evaluate("localStorage.getItem('rest_end_time')"))
    check('exercice changé pendant le décompte : le décompte continue, fin inchangée', txt2.startswith('1:2') and fin2 == fin, f'{txt2} fin identique={fin2 == fin}')

    # arrêt : retour à « PAUSE » avec la durée de l'exercice ouvert (Presse = 2:00)
    pg.click('#timer-btn'); pg.wait_for_timeout(100)
    check('arrêt : retour à PAUSE avec la durée de l\'exercice ouvert', pg.inner_text('#timer-display') == 'PAUSE 2:00', pg.inner_text('#timer-display'))
    check('arrêt : plus d\'heure de fin mémorisée', pg.evaluate("localStorage.getItem('rest_end_time')") is None)

    # fin de décompte : « GO ! » reste affiché si on change d'exercice, puis un appui remet « PAUSE »
    open_ex(pg, 'Mollets')
    pg.evaluate("(()=>{const e=Date.now()+1100;localStorage.setItem('rest_end_time',e);updateTimerDisplay(1);runRestTimer(e)})()")
    pg.wait_for_timeout(1700)
    check('fin de repos : « GO ! » affiché', pg.inner_text('#timer-display') == 'GO !', pg.inner_text('#timer-display'))
    open_ex(pg, 'Développé couché')
    check('« GO ! » conservé quand on change d\'exercice', pg.inner_text('#timer-display') == 'GO !', pg.inner_text('#timer-display'))
    pg.evaluate("document.getElementById('timer-btn').click()"); pg.wait_for_timeout(100)  # la puce « GO ! » pulse : clic par script
    check('appui sur « GO ! » : retour à PAUSE adapté, sans relancer le chrono', pg.inner_text('#timer-display') == 'PAUSE 3:00' and pg.evaluate("localStorage.getItem('rest_end_time')") is None, pg.inner_text('#timer-display'))

    # progression automatique : valider toutes les séries du 1er exercice → l'exercice suivant s'ouvre et le repos
    # se lance avec la durée de cet exercice (une série cochée lance toujours le chrono, voir test_rameur)
    pg.evaluate("switchTab('seance')")
    pg.reload(); pg.wait_for_timeout(900); pg.evaluate("switchTab('seance')"); pg.wait_for_timeout(300)
    pg.evaluate("document.querySelectorAll('#exercises-list .exercise-item')[0].querySelectorAll('.set-row .btn-check-set').forEach(b=>b.click())"); pg.wait_for_timeout(400)
    ouvert = pg.evaluate("document.querySelector('#exercises-list .exercise-item.open').dataset.ex")
    lance = attendu.get(names[1], 'PAUSE 1:30').replace('PAUSE ', '')
    m, s_ = lance.split(':'); avant = f"{int(m) - (1 if s_ == '00' else 0)}:{'59' if s_ == '00' else str(int(s_) - 1).zfill(2)}"
    check('exercice terminé : l\'exercice suivant s\'ouvre et le repos se lance avec sa durée',
          ouvert == names[1] and pg.inner_text('#timer-display') in (lance, avant) and pg.evaluate("document.getElementById('timer-btn').classList.contains('running')"), f'{ouvert} → {pg.inner_text("#timer-display")}')
    check('aucune erreur JS', not errs, str(errs))
    ctx.close(); br.close()
print('\n', sum(res), '/', len(res), 'contrôles OK')
sys.exit(0 if all(res) else 1)
