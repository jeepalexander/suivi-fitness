"""Mise en page : aucun débordement, aucune erreur JS, titres d'exercice sur une ligne,
4 onglets x 2 largeurs (360 / 390 px) x 2 thèmes (clair / sombre)."""
import sys
from harness import *

res = []


def check(name, ok, extra=''):
    res.append(ok)
    print(('OK   ' if ok else 'ÉCHEC'), name, extra)


with Srv() as url, sync_playwright() as p:
    br = p.chromium.launch()
    for w in (390, 360):
        for th in ('light', 'dark'):
            ctx, pg, errs = newpage(br, w=w, scheme=th, pref=th)
            pg.goto(url); pg.wait_for_timeout(600)
            bad = []
            for tab in ('programme', 'seance', 'progression', 'historique'):
                pg.evaluate("t=>switchTab(t)", tab); pg.wait_for_timeout(400)
                o = pg.evaluate(OVERFLOW_JS)
                if o['docW'] > o['vw'] or o['out']:
                    bad.append((tab, o))
            check(f'{w} px, {th} : aucun débordement sur les 4 onglets', not bad, str(bad)[:200])
            # chaque exercice ouvert tour à tour : le nom tient sur une ligne
            pg.evaluate("switchTab('seance')"); pg.wait_for_timeout(300)
            n = pg.evaluate("document.querySelectorAll('.exercise-item').length")
            wrap = []
            for i in range(n):
                pg.evaluate("i=>{const t=document.querySelectorAll('.exercise-item')[i];if(!t.classList.contains('open'))t.querySelector('.ex-toggle').click()}", i)
                pg.wait_for_timeout(120)
                r = pg.evaluate("i=>{const nm=document.querySelectorAll('.exercise-item')[i].querySelector('.ex-name');return [nm.textContent,Math.round(nm.getBoundingClientRect().height),nm.scrollWidth>nm.clientWidth+1]}", i)
                if r[1] > 24 or r[2]:
                    wrap.append(r)
            check(f'{w} px, {th} : nom des {n} exercices sur une seule ligne', not wrap, str(wrap))
            check(f'{w} px, {th} : aucune erreur JavaScript', not errs, str(errs))
            ctx.close()
    br.close()
print('\n', sum(res), '/', len(res), 'contrôles OK')
sys.exit(0 if all(res) else 1)
