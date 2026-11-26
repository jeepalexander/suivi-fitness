"""Page RÉGLAGES : onglet du menu (1.8.95), contenu déplacé de l'Historique, pastille de mise à jour."""
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

    # 1.8.95 : Réglages est un onglet du menu (à la place de Séance) ; plus de roue dentée ni de « Retour »
    nav = pg.evaluate("[...document.querySelectorAll('nav button')].map(b=>b.id)")
    check('1.8.95 : menu Programmes · Progression · Historique · Réglages', nav == ['nav-programme', 'nav-progression', 'nav-historique', 'nav-reglages'], nav)
    check('1.8.95 : plus de roue dentée ni de « Retour » dans les en-têtes', not pg.evaluate("!!document.getElementById('settings-btn') || !!document.getElementById('settings-back')"))
    for t in ('programme', 'seance', 'progression', 'historique'):
        pg.evaluate(f"switchTab('{t}')"); pg.wait_for_timeout(150)
        check(f'aucun bouton en haut à droite sur « {t} » hors « + »', not pg.evaluate("[...document.querySelectorAll('header .hdr-btn')].some(b=>b.id!=='add-program-btn' && b.offsetParent!==null)"))

    pg.evaluate("switchTab('historique')"); pg.wait_for_timeout(300)
    check('Apparence et Application ne sont plus dans l\'Historique',
          not pg.evaluate(in_tab, ['theme-choice', 'historique']) and not pg.evaluate(in_tab, ['update-card', 'historique']))
    check('la carte Sauvegarder / Restaurer reste dans l\'Historique', pg.evaluate(in_tab, ['import-file', 'historique']))

    pg.click('#nav-reglages'); pg.wait_for_timeout(300)
    check('titre de la page : Réglages', pg.inner_text('#page-title') == 'Réglages', pg.inner_text('#page-title'))
    check('page Réglages affichée, Historique masqué',
          pg.evaluate("document.getElementById('tab-reglages').classList.contains('active') && !document.getElementById('tab-historique').classList.contains('active')"))
    check('Apparence et Application dans Réglages',
          pg.evaluate(in_tab, ['theme-choice', 'reglages']) and pg.evaluate(in_tab, ['update-card', 'reglages']))
    check('l\'onglet Réglages est allumé, Historique éteint', pg.evaluate("document.getElementById('nav-reglages').classList.contains('active') && !document.getElementById('nav-historique').classList.contains('active')"))
    pg.evaluate("switchTab('fond')"); pg.wait_for_timeout(250)
    check('Fond d\'écran : onglet Réglages toujours allumé', pg.evaluate("document.getElementById('nav-reglages').classList.contains('active')"))
    pg.evaluate("switchTab('reglages')"); pg.wait_for_timeout(250)

    pg.click('[data-theme-choice="dark"]'); pg.wait_for_timeout(200)
    check('le choix de thème fonctionne depuis Réglages', pg.evaluate("document.documentElement.getAttribute('data-theme')") == 'dark')
    pg.click('[data-theme-choice="light"]'); pg.wait_for_timeout(200)

    # pastille de mise à jour sur l'onglet Réglages
    pg.evaluate("runningVersion='1.5.1'; activeVersion='9.9.9'; renderUpdateStatus()"); pg.wait_for_timeout(100)
    check('pastille sur l\'onglet Réglages quand une version est prête',
          pg.evaluate("document.getElementById('nav-reglages').classList.contains('has-update')") and 'mise à jour' in pg.evaluate("document.getElementById('nav-reglages').getAttribute('aria-label')"))
    pg.evaluate("runningVersion='1.5.1'; activeVersion='1.5.1'; renderUpdateStatus()")
    check('pastille retirée quand tout est à jour', not pg.evaluate("document.getElementById('nav-reglages').classList.contains('has-update')"))
    # textes simplifiés (1.6.35)
    pg.evaluate("switchTab('reglages')"); pg.wait_for_timeout(300)
    hints = pg.evaluate("[...document.querySelectorAll('#tab-reglages .theme-hint, .theme-hint')].map(e=>e.textContent.trim())")
    check("Apparence : plus aucun texte d'explication", not any('suit le réglage clair/sombre' in h or 'propre à cet appareil' in h for h in hints), hints)
    check("Drive : texte simplifié (dossier « MON CARNET DE SALLE », renvoi à « Restaurer » de l'Historique)", "Chaque séance validée déclenche une sauvegarde dans le dossier « MON CARNET DE SALLE ». 5 sauvegardes y sont conservées. Pour en reprendre une, touche « Restaurer » dans l'Historique." in hints, hints)
    pg.reload(); pg.wait_for_timeout(800)
    check("Version : nouveau texte sur les mises à jour", pg.evaluate("document.getElementById('update-status').textContent").startswith("La vérification de la disponibilité d'une nouvelle mise à jour se fait à chaque lancement") and 'Tu peux néanmoins cliquer sur « Vérifier »' in pg.evaluate("document.getElementById('update-status').textContent"), pg.evaluate("document.getElementById('update-status').textContent"))
    check('aucune erreur JS', not errs, str(errs))
    ctx.close(); br.close()
print('\n', sum(res), '/', len(res), 'contrôles OK')
sys.exit(0 if all(res) else 1)
