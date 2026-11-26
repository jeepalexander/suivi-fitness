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
        check(f'[{scheme}] pastille de la fiche d\'exercice inversée (1.8.53)', fb == INV[scheme], fb)
        pg.evaluate("closeFiche && closeFiche(); switchTab('reglages'); 0"); pg.wait_for_timeout(300)
        wr = pg.evaluate("(()=>{const r=document.getElementById('wallpaper-row');const t=r.querySelector('.wallpaper-row-thumb');return [r.offsetHeight,getComputedStyle(r).borderRadius,t.offsetWidth,t.offsetHeight,getComputedStyle(t).borderRadius]})()")
        check(f'[{scheme}] Fond d\'écran : gélule de 56 px, vignette ronde de 44 px (1.8.54 ; 44 px depuis le nombre d\'or, 1.8.91)', wr[0] == 56 and wr[1] == '999px' and wr[2] == 44 and wr[3] == 44 and wr[4] == '50%', wr)
        g = pg.evaluate("[...document.querySelectorAll('#tab-reglages .seg-group, #tab-reglages .wallpaper-row')].map(e=>getComputedStyle(e).backgroundColor)")
        b2 = pg.evaluate("[...document.querySelectorAll('#tab-reglages .btn-secondary:not(.support-btn)')].filter(e=>e.offsetParent).map(e=>getComputedStyle(e).backgroundColor)")
        check(f'[{scheme}] Réglages : Clair / Sombre / Auto et Fond d\'écran au gris inversé (1.8.53)', g and all(x == INV[scheme] for x in g), g)
        pg.evaluate("switchTab('progression'); 0"); pg.wait_for_timeout(400)
        sc = pg.evaluate("getComputedStyle(document.querySelector('#tab-progression .stats-scope')).backgroundColor")
        pg.evaluate("document.getElementById('exercise-filter').scrollIntoView({block:'center'})"); pg.click('#exercise-filter'); pg.keyboard.press('Escape'); pg.wait_for_timeout(150)
        ol = pg.evaluate("(()=>{const e=document.getElementById('exercise-filter');return [document.activeElement===e, getComputedStyle(e).outlineStyle]})()")
        check(f'[{scheme}] choix de l\'exercice : pas de liseré rouge au focus (1.8.58)', ol == [True, 'none'], ol)
        fl = pg.evaluate("[...document.querySelectorAll('select.filter-select')].map(e=>{const c=getComputedStyle(e);const m=c.backgroundImage.match(/stroke='%23([0-9A-Fa-f]{6})'/);return [c.appearance,c.backgroundSize,m&&('#'+m[1]).toUpperCase(),c.color]})")
        hexrgb = lambda h: 'rgb(%d, %d, %d)' % tuple(int(h[i:i+2], 16) for i in (1, 3, 5))
        check(f'[{scheme}] choix d\'exercice et cardio : chevron de 20 px, couleur du texte de la gélule (1.8.86)', len(fl) == 2 and all(x[0] == 'none' and x[1] == '20px 20px' and x[2] and hexrgb(x[2]) == x[3] for x in fl), fl)
        check(f'[{scheme}] Progression : choix du programme au gris inversé (1.8.53)', sc == INV[scheme], sc)
        bt = pg.evaluate("[...document.querySelectorAll('#tab-historique .btn:not(.btn-secondary), #tab-reglages .btn:not(.support-btn):not(.install):not(#drive-disconnect-btn)')].filter(e=>!e.classList.contains('btn-delete')).map(e=>getComputedStyle(e).backgroundColor)")
        gs = pg.evaluate("[...document.querySelectorAll('#tab-historique .btn-secondary, #drive-disconnect-btn')].map(e=>getComputedStyle(e).backgroundColor)")
        check(f'[{scheme}] « Restaurer » (Historique) et « Déconnecter » gris clair en clair, anthracite en sombre (1.8.55)', len(gs) == 2 and all(x == ('rgb(46, 46, 53)' if scheme == 'dark' else 'rgb(243, 243, 245)') for x in gs), gs)
        check(f'[{scheme}] boutons de Progression, Historique et Réglages au gris inversé (1.8.54)', bt and all(x == INV[scheme] for x in bt), set(bt))
        check(f'[{scheme}] flèche retour de la Séance au gris inversé (1.8.95)', pg.evaluate("getComputedStyle(document.getElementById('seance-back')).backgroundColor") == INV[scheme])
        pg.evaluate("switchTab('programme'); startProgramEditor('program'); 0"); pg.wait_for_timeout(400)
        ed = pg.evaluate("[...document.querySelectorAll('button.ed-back, .ed-field, .ed-seg')].filter(e=>e.offsetParent).map(e=>getComputedStyle(e).backgroundColor)")
        check(f'[{scheme}] éditeur : retour et gélules au gris inversé (1.8.54)', len(ed) >= 3 and all(x == INV[scheme] for x in ed), ed)
        ad = pg.evaluate("(()=>{const b=document.querySelector('.ed-add');const c=getComputedStyle(b);return [c.backgroundColor,c.color]})()")
        check(f'[{scheme}] « Ajouter un exercice » sans fond, texte {"blanc" if scheme=="dark" else "foncé"} (1.8.54)', ad[0] == 'rgba(0, 0, 0, 0)' and ad[1] == ('rgb(255, 255, 255)' if scheme == 'dark' else 'rgb(17, 17, 20)'), ad)
        pg.evaluate("setProgramView('home'); switchTab('seance'); openFiche('Développé couché'); 0"); pg.wait_for_timeout(400)
        ch = pg.evaluate("[...document.querySelectorAll('.exf-chip')].map(e=>getComputedStyle(e).backgroundColor)")
        check(f'[{scheme}] fiche : gélules sous le nom au gris inversé (1.8.54)', ch and all(x == INV[scheme] for x in ch), ch)
        check(f'[{scheme}] aucune erreur JS', not errs, errs)
        ctx.close()
    br.close()
print(f"\n {sum(res)} / {len(res)} contrôles OK")
sys.exit(0 if all(res) else 1)
