"""1.8.28 : un programme reçu sur un téléphone sans programme actif devient actif ET l'onglet Séance le charge
(avant : « Aucune séance prévue » jusqu'au redémarrage de l'app). Reçu à côté d'un programme actif : rien ne change."""
import sys
from harness import *

res = []


def check(name, ok, extra=''):
    res.append(bool(ok))
    print(('OK   ' if ok else 'ÉCHEC'), name, extra)


PROG = {'name': 'Full body test', 'kind': 'program', 'sessions': [
    {'key': 'A', 'name': 'Haut', 'exercises': [{'exId': 26, 'sets': 3}, {'exId': 1, 'sets': 3}]},
    {'key': 'B', 'name': 'Bas', 'exercises': [{'exId': 2, 'sets': 3}]}]}
LIBRE = {'name': 'Dorsaux', 'kind': 'libre', 'sessions': [{'key': '', 'name': 'Dorsaux', 'exercises': [{'exId': 26, 'sets': 4}]}]}


def receive(pg, base, prog):
    code = pg.evaluate("p => encodeProgram(p)", prog)
    pg.goto(base + 'index.html#prog=' + code); pg.wait_for_timeout(1300)
    pg.click('#recv-add'); pg.wait_for_timeout(700)
    pg.evaluate("switchTab('seance')"); pg.wait_for_timeout(600)
    return pg.inner_text('#tab-seance')


with Srv() as base, sync_playwright() as p:
    br = p.chromium.launch()
    # 1. Téléphone neuf : programme reçu
    ctx, pg, errs = newpage(br, seed=False)
    pg.goto(base + 'index.html'); pg.wait_for_timeout(900)
    txt = receive(pg, base, PROG)
    check('téléphone neuf : le programme reçu devient actif', pg.evaluate("(getActiveProgram()||{}).name") == 'Full body test')
    check('onglet Séance : séance A chargée, plus « Aucune séance prévue »',
          'Aucune séance prévue' not in txt and 'Tractions' in txt, txt[:120])
    check('titre de la Séance = nom du programme', 'Full body test' in pg.inner_text('#page-title'), pg.inner_text('#page-title'))
    check('aucune erreur', not errs, errs)
    ctx.close()
    # 2. Téléphone neuf : séance libre reçue
    ctx, pg, errs = newpage(br, seed=False)
    pg.goto(base + 'index.html'); pg.wait_for_timeout(900)
    txt = receive(pg, base, LIBRE)
    check('séance libre reçue : chargée dans Séance (titre « Dorsaux », Tractions)',
          'Aucune séance prévue' not in txt and 'Tractions' in txt and 'Dorsaux' in pg.inner_text('#page-title'), pg.inner_text('#page-title'))
    ctx.close()
    # 3. Avec un programme actif : le reçu reste en mémoire, la séance en cours ne change pas
    ctx, pg, errs = newpage(br)
    pg.goto(base + 'index.html'); pg.wait_for_timeout(900)
    before = pg.evaluate("getActiveProgram().name")
    txt = receive(pg, base, PROG)
    check('programme actif existant : inchangé', pg.evaluate("getActiveProgram().name") == before)
    check('le programme reçu reste « Reçu » en mémoire',
          pg.evaluate("getPrograms().some(p => p.receivedAt && p.status === 'new')"))
    check('aucune erreur', not errs, errs)
    ctx.close()
    br.close()

print(f'\n {sum(res)} / {len(res)} contrôles OK')
sys.exit(0 if all(res) else 1)
