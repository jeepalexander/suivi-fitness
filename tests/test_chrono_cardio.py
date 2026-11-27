"""1.8.103 : chronomètre dans la pastille sous un cardio (rameur), temps reporté dans Durée à la validation."""
import json
from harness import *

res = []


def check(name, ok, extra=''):
    ok = bool(ok); res.append(ok)
    print(('OK   ' if ok else 'ÉCHEC'), name, extra)


with Srv() as base, sync_playwright() as p:
    br = p.chromium.launch()
    for scheme in ('light', 'dark'):
        ctx, pg, errs = newpage(br, 390, 844, scheme=scheme, pref=scheme)
        pg.on('dialog', lambda d: d.accept())
        pg.goto(base + 'index.html'); pg.wait_for_timeout(800)
        pg.evaluate("switchTab('seance')"); pg.wait_for_timeout(400)
        tag = f'[{scheme}] '
        it = '#exercises-list .exercise-item[data-ex="Rameur"]'
        btn, dur = f'{it} .cardio-chrono', f'{it} .weight-input'
        # pastille : pas plus large que le bord du champ Distance, sans allure
        r = pg.evaluate(f"(()=>{{const p=document.querySelector('{it} .cardio-pace').getBoundingClientRect(),d=document.querySelector('{it} .reps-input').getBoundingClientRect();return [p.right,d.right]}})()")
        check(tag + 'pastille pas plus large que le champ Distance', r[0] <= r[1] + 0.5, r)
        check(tag + "pastille sans l'allure, chrono à 0:00", '/500 m' not in pg.inner_text(f'{it} .cardio-pace') and pg.inner_text(f'{btn} b') == '0:00')
        check(tag + 'bouton de 44 px de haut au moins', pg.evaluate(f"document.querySelector('{btn}').getBoundingClientRect().height") >= 44)
        # lancer, temps simulé (start reculé de 95 s)
        pg.click(btn); pg.wait_for_timeout(100)
        check(tag + 'lancé : bouton « en marche », chrono de séance lancé', pg.get_attribute(btn, 'aria-pressed') == 'true' and pg.evaluate("!!localStorage.getItem('workout_start_time')"))
        pg.evaluate("(()=>{const c=JSON.parse(localStorage.getItem('cardio_chrono'));c.start-=95000;localStorage.setItem('cardio_chrono',JSON.stringify(c))})()")
        pg.wait_for_timeout(700)
        check(tag + 'le temps défile (1:35)', pg.inner_text(f'{btn} b') == '1:35', pg.inner_text(f'{btn} b'))
        # pause puis reprise
        pg.click(btn); pg.wait_for_timeout(1200)
        check(tag + 'pause : le temps ne bouge plus', pg.get_attribute(btn, 'aria-pressed') == 'false' and pg.inner_text(f'{btn} b') == '1:35', pg.inner_text(f'{btn} b'))
        # rechargement : le chrono est retrouvé
        pg.reload(); pg.wait_for_timeout(800); pg.evaluate("switchTab('seance')"); pg.wait_for_timeout(400)
        check(tag + 'rechargement : 1:35 retrouvé', pg.inner_text(f'{btn} b') == '1:35', pg.inner_text(f'{btn} b'))
        pg.click(btn); pg.wait_for_timeout(100)
        pg.evaluate("(()=>{const c=JSON.parse(localStorage.getItem('cardio_chrono'));c.start-=10000;localStorage.setItem('cardio_chrono',JSON.stringify(c))})()")
        # validation : temps reporté dans Durée, chrono remis à zéro
        pg.click(f'{it} .btn-check-set'); pg.wait_for_timeout(300)
        check(tag + 'validation : 1:45 reporté dans Durée', pg.input_value(dur) == '1:45', pg.input_value(dur))
        check(tag + 'validation : chrono effacé, retour à 0:00', pg.evaluate("localStorage.getItem('cardio_chrono')") is None and pg.inner_text(f'{btn} b') == '0:00')
        # enregistrement : 105 s
        pg.evaluate("document.getElementById('workout-form').requestSubmit()"); pg.wait_for_timeout(400)
        if pg.is_visible('.finish-ok'): pg.click('.finish-ok')
        h = json.loads(pg.evaluate("localStorage.getItem('h49_state')"))['history']
        row = next((e for e in h[-1]['exercises'] if e['name'] == 'Rameur'), {'sets': [{}]})
        check(tag + 'séance enregistrée avec 105 s de rameur', row['sets'][0].get('seconds') == 105, json.dumps(row['sets']))
        # chrono jamais lancé : la durée saisie reste
        pg.evaluate("switchTab('seance')"); pg.wait_for_timeout(400)
        pg.fill(dur, '4:10'); pg.click(f'{it} .btn-check-set'); pg.wait_for_timeout(200)
        check(tag + 'sans chrono : la durée saisie (4:10) est gardée', pg.input_value(dur) == '4:10')
        check(tag + 'aucune erreur JavaScript', not errs, errs)
        ctx.close()
    br.close()

print(f'\n{sum(res)}/{len(res)} contrôles réussis')
sys.exit(0 if all(res) else 1)
