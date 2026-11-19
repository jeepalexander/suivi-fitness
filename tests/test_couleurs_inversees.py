"""1.8.52 : menu, série en cours, boutons − / +, allure cardio et pastilles d'exercice en couleurs inversées
(clairs en sombre, foncés en clair) ; séries à venir, séries faites et fiche d'exercice inchangées."""
import sys
from harness import *

res = []
def check(name, ok, extra=''):
    ok = bool(ok); res.append(ok); print(('OK   ' if ok else 'ÉCHEC'), name, str(extra)[:200])

INV = {'dark': 'rgb(228, 228, 233)', 'light': 'rgb(46, 46, 53)'}
FIELD = {'dark': 'rgb(42, 42, 50)', 'light': 'rgb(255, 255, 255)'}
PAST = {'dark': 'rgb(44, 44, 51)', 'light': 'rgb(228, 228, 233)'}
JS = """()=>{const bg=(el,p)=>el?getComputedStyle(el,p||null).backgroundColor:null;
 const cur=document.querySelector('.exercise-item.open .set-row.current');
 const todo=document.querySelector('.exercise-item.open .set-row:not(.current):not(.done) .set-input');
 return {nav:bg(document.querySelector('nav')), cur:bg(cur), curTxt:getComputedStyle(cur.querySelector('.set-input')).color,
  count:bg(document.querySelector('.exercise-item.open .btn-set-count')), todo:bg(todo),
  badge:bg(document.querySelector('.exercise-item .ex-icon-badge'),'::before')};}"""
with Srv() as base, sync_playwright() as p:
    br = p.chromium.launch()
    for scheme in ('light', 'dark'):
        ctx, pg, errs = newpage(br, 390, 844, pref=scheme)
        pg.goto(base + 'index.html'); pg.wait_for_timeout(800)
        pg.evaluate("switchTab('seance'); 0"); pg.wait_for_timeout(400)
        pg.locator('.exercise-item .ex-toggle').nth(1).click(); pg.wait_for_timeout(300)
        r = pg.evaluate(JS)
        check(f'[{scheme}] menu en gris inversé', r['nav'] == INV[scheme], r['nav'])
        check(f'[{scheme}] série en cours et boutons − / + au même gris que le menu', r['cur'] == INV[scheme] and r['count'] == INV[scheme], r)
        check(f'[{scheme}] texte de la série en cours lisible (inversé)', r['curTxt'] == ('rgb(17, 17, 20)' if scheme == 'dark' else 'rgb(242, 242, 244)'), r['curTxt'])
        check(f'[{scheme}] séries à venir inchangées', r['todo'] == FIELD[scheme], r['todo'])
        check(f'[{scheme}] pastille d\'exercice inversée', r['badge'] == INV[scheme], r['badge'])
        pg.evaluate("openFiche('Développé couché'); 0"); pg.wait_for_timeout(300)
        fb = pg.evaluate("getComputedStyle(document.querySelector('.exf-hero .ex-icon-badge'),'::before').backgroundColor")
        check(f'[{scheme}] fiche d\'exercice inchangée', fb == PAST[scheme], fb)
        check(f'[{scheme}] aucune erreur JS', not errs, errs)
        ctx.close()
    br.close()
print(f"\n {sum(res)} / {len(res)} contrôles OK")
sys.exit(0 if all(res) else 1)
