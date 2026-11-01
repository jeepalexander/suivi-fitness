"""Page RÉGLAGES : bouton en haut à droite de l'Historique, contenu déplacé, retour, pastille de mise à jour."""
import sys
from harness import *

res = []


def check(name, ok, extra=''):
    res.append(ok)
    print(('OK   ' if ok else 'ÉCHEC'), name, extra)


vis = "id=>{const e=document.getElementById(id);return !!e && e.offsetParent!==null && getComputedStyle(e).display!=='none'}"
in_tab = "([id,t])=>{const e=document.getElementById(id);return !!e && !!e.closest('#tab-'+t)}"

with Srv() as base, sync_playwright() as p:
    br = p.chromium.launch()
    ctx, pg, errs = newpage(br, 390, 844, pref='light')
    pg.goto(base + 'index.html'); pg.wait_for_timeout(800)

    for t in ('programme', 'seance', 'progression'):
        pg.evaluate("t=>switchTab(t)", t); pg.wait_for_timeout(200)
        check(f'bouton Réglages absent sur « {t} »', not pg.evaluate(vis, 'settings-btn'))

    pg.evaluate("switchTab('historique')"); pg.wait_for_timeout(300)
    check('bouton Réglages visible sur Historique', pg.evaluate(vis, 'settings-btn'))
    check('Apparence et Application ne sont plus dans l\'Historique',
          not pg.evaluate(in_tab, ['theme-choice', 'historique']) and not pg.evaluate(in_tab, ['update-card', 'historique']))
    check('la carte Sauvegarder / Restaurer reste dans l\'Historique', pg.evaluate(in_tab, ['import-file', 'historique']))
    box = pg.evaluate("(()=>{const r=document.getElementById('settings-btn').getBoundingClientRect();return [r.right,r.top,r.width,r.height]})()")
    check('bouton en haut à droite (≥ 44 px, collé au bord droit)', box[0] > 390 - 40 and box[1] < 60 and box[2] >= 44 and box[3] >= 44, str(box))

    pg.click('#settings-btn'); pg.wait_for_timeout(300)
    check('titre de la page : Réglages', pg.inner_text('#page-title') == 'Réglages', pg.inner_text('#page-title'))
    check('page Réglages affichée, Historique masqué',
          pg.evaluate("document.getElementById('tab-reglages').classList.contains('active') && !document.getElementById('tab-historique').classList.contains('active')"))
    check('Apparence et Application dans Réglages',
          pg.evaluate(in_tab, ['theme-choice', 'reglages']) and pg.evaluate(in_tab, ['update-card', 'reglages']))
    check('bouton Retour visible, roue dentée masquée', pg.evaluate(vis, 'settings-back') and not pg.evaluate(vis, 'settings-btn'))
    check('l\'icône Historique reste allumée dans la navigation', pg.evaluate("document.getElementById('nav-historique').classList.contains('active')"))

    pg.click('[data-theme-choice="dark"]'); pg.wait_for_timeout(200)
    check('le choix de thème fonctionne depuis Réglages', pg.evaluate("document.documentElement.getAttribute('data-theme')") == 'dark')
    pg.click('[data-theme-choice="light"]'); pg.wait_for_timeout(200)

    pg.click('#settings-back'); pg.wait_for_timeout(300)
    check('Retour ramène à l\'Historique', pg.inner_text('#page-title') == 'Historique' and pg.evaluate(vis, 'settings-btn'))

    # pastille de mise à jour sur la roue dentée
    pg.evaluate("runningVersion='1.5.1'; activeVersion='9.9.9'; renderUpdateStatus()"); pg.wait_for_timeout(100)
    check('pastille sur la roue dentée quand une version est prête',
          pg.evaluate("document.getElementById('settings-btn').classList.contains('has-update')") and 'mise à jour' in pg.evaluate("document.getElementById('settings-btn').getAttribute('aria-label')"))
    pg.evaluate("runningVersion='1.5.1'; activeVersion='1.5.1'; renderUpdateStatus()")
    check('pastille retirée quand tout est à jour', not pg.evaluate("document.getElementById('settings-btn').classList.contains('has-update')"))
    check('aucune erreur JS', not errs, str(errs))
    ctx.close(); br.close()
print('\n', sum(res), '/', len(res), 'contrôles OK')
sys.exit(0 if all(res) else 1)
