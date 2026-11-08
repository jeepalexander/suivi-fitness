"""Réglages › Fond d'écran (1.7.7) : choix d'une image, appliquée partout, mémorisée sur l'appareil, sans flash au lancement."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from harness import Srv, newpage, sync_playwright, OVERFLOW_JS, REPO

OK = True
def check(label, cond, detail=''):
    global OK
    print(('  OK  ' if cond else '  ÉCHEC ') + label + ('' if cond else f'  -> {detail}'))
    OK = OK and bool(cond)

SHOTS = REPO / 'tests' / 'captures'

def main():
    shots = '--captures' in sys.argv
    if shots: SHOTS.mkdir(exist_ok=True)
    with Srv() as base, sync_playwright() as p:
        br = p.chromium.launch()
        ctx, pg, errs = newpage(br)
        pg.goto(base + 'index.html'); pg.wait_for_timeout(600)
        check("par défaut : aucun fond d'écran", pg.evaluate("document.documentElement.getAttribute('data-wallpaper')") is None
              and pg.evaluate("getComputedStyle(document.getElementById('app-wallpaper')).display") == 'none')

        pg.evaluate("switchTab('reglages')"); pg.wait_for_timeout(200)
        check("Réglages : ligne « Fond d'écran » sous Apparence, valeur « Aucun »",
              pg.evaluate("document.getElementById('wallpaper-row-name').textContent") == 'Aucun'
              and pg.evaluate("(()=>{const c=[...document.querySelectorAll('#tab-reglages .card-title')].map(e=>e.textContent);return c.indexOf(\"Fond d'écran\")===c.indexOf('Apparence')+1})()"))
        pg.click('#wallpaper-row'); pg.wait_for_timeout(300)
        check("la ligne ouvre la page « Fond d'écran », bouton retour visible, Historique allumé dans la barre",
              pg.evaluate("document.body.dataset.tab") == 'fond'
              and pg.evaluate("document.getElementById('page-title').textContent") == "Fond d'écran"
              and pg.is_visible('#fond-back') and not pg.is_visible('#settings-back')
              and pg.evaluate("document.getElementById('nav-historique').classList.contains('active')"))
        opts = pg.evaluate("[...document.querySelectorAll('#wallpaper-grid .wallpaper-opt')].map(b=>[b.dataset.wallpaper,b.getAttribute('aria-checked'),b.textContent.trim()])")
        check("6 choix (5 images + Aucun), « Aucun » coché", len(opts) == 6 and [o[0] for o in opts] == ['course', 'barre', 'halteres', 'kettlebell', 'studio', 'none']
              and opts[5][1] == 'true' and sum(o[1] == 'true' for o in opts) == 1, opts)
        pg.wait_for_function("[...document.querySelectorAll('#wallpaper-grid img')].every(i=>i.complete&&i.naturalWidth>0)", timeout=5000)
        check("les 5 vignettes se chargent", True)
        if shots: pg.screenshot(path=str(SHOTS / 'fond_grille_aucun.png'))

        pg.click('.wallpaper-opt[data-wallpaper="barre"]'); pg.wait_for_timeout(300)
        check("choisir « Barre » : appliqué tout de suite, coché, mémorisé",
              pg.evaluate("document.documentElement.getAttribute('data-wallpaper')") == 'barre'
              and pg.get_attribute('.wallpaper-opt[data-wallpaper="barre"]', 'aria-checked') == 'true'
              and pg.get_attribute('.wallpaper-opt[data-wallpaper="none"]', 'aria-checked') == 'false'
              and pg.evaluate("localStorage.getItem('h49_wallpaper')") == 'barre')
        bg = pg.evaluate("getComputedStyle(document.getElementById('app-wallpaper')).backgroundImage")
        check("image de fond posée derrière l'app, en-tête transparent", 'wallpapers/barre.jpg' in bg
              and pg.evaluate("getComputedStyle(document.querySelector('header')).backgroundColor") == 'rgba(0, 0, 0, 0)', bg)
        pg.wait_for_function("(()=>{const i=new Image();i.src='wallpapers/barre.jpg';return i.complete})()", timeout=5000)
        pg.wait_for_timeout(300)
        if shots: pg.screenshot(path=str(SHOTS / 'fond_grille_barre.png'))
        ov = pg.evaluate(OVERFLOW_JS)
        check("page Fond d'écran : rien ne déborde", ov['docW'] <= ov['vw'] and not ov['out'], ov)

        pg.click('#fond-back'); pg.wait_for_timeout(200)
        check("retour : Réglages, la ligne affiche « Barre » et sa vignette",
              pg.evaluate("document.body.dataset.tab") == 'reglages'
              and pg.evaluate("document.getElementById('wallpaper-row-name').textContent") == 'Barre'
              and 'barre-mini.jpg' in (pg.get_attribute('#wallpaper-row-img', 'src') or '') and pg.is_visible('#wallpaper-row-img'))
        if shots: pg.screenshot(path=str(SHOTS / 'fond_reglages.png'))

        for tab in ['programme', 'seance', 'progression', 'historique']:
            pg.evaluate(f"switchTab('{tab}')"); pg.wait_for_timeout(250)
            vis = pg.evaluate("getComputedStyle(document.getElementById('app-wallpaper')).display")
            check(f"onglet {tab} : le fond reste affiché", vis == 'block', vis)
            if shots: pg.screenshot(path=str(SHOTS / f'fond_{tab}.png'))

        pg.reload(); pg.wait_for_timeout(100)
        check("au relancement : le fond est posé avant le premier affichage", pg.evaluate("document.documentElement.getAttribute('data-wallpaper')") == 'barre')

        pg.evaluate("setThemePreference('dark')"); pg.evaluate("switchTab('programme')"); pg.wait_for_timeout(300)
        veil = pg.evaluate("getComputedStyle(document.getElementById('app-wallpaper'),'::after').backgroundImage")
        check("thème sombre : voile sombre sur l'image", 'rgba(14, 14, 17' in veil, veil)
        if shots: pg.screenshot(path=str(SHOTS / 'fond_programme_sombre.png'))
        pg.evaluate("setThemePreference('light')")

        pg.evaluate("switchTab('fond')"); pg.click('.wallpaper-opt[data-wallpaper="none"]'); pg.wait_for_timeout(200)
        check("« Aucun » : retour au fond blanc, préférence effacée",
              pg.evaluate("document.documentElement.getAttribute('data-wallpaper')") is None
              and pg.evaluate("localStorage.getItem('h49_wallpaper')") is None
              and pg.evaluate("getComputedStyle(document.getElementById('app-wallpaper')).display") == 'none')

        pg.evaluate("localStorage.setItem('h49_wallpaper','inconnu')"); pg.reload(); pg.wait_for_timeout(300)
        check("valeur inconnue ignorée", pg.evaluate("document.documentElement.getAttribute('data-wallpaper')") is None
              and pg.evaluate("getWallpaper()") == 'none')
        exported = pg.evaluate("JSON.stringify(state)")
        check("le fond d'écran ne fait pas partie des données sauvegardées", 'wallpaper' not in exported)

        sw = (REPO / 'sw.js').read_text(encoding='utf-8')
        check("les 10 images sont mises en cache par le service worker (hors connexion)",
              all(f"'./wallpapers/{k}{s}.jpg'" in sw for k in ['course', 'barre', 'halteres', 'kettlebell', 'studio'] for s in ['', '-mini'])
              and all((REPO / 'wallpapers' / f'{k}{s}.jpg').exists() for k in ['course', 'barre', 'halteres', 'kettlebell', 'studio'] for s in ['', '-mini']))
        check("aucune erreur JavaScript", not errs, errs)
        ctx.close(); br.close()
    print('\nTOUS LES TESTS PASSENT' if OK else '\nÉCHECS')
    sys.exit(0 if OK else 1)

if __name__ == '__main__':
    main()
