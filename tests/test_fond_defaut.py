"""1.8.29 : fond « Râtelier » par défaut pour un nouvel usager ; les usagers existants gardent leur fond (blanc compris) ;
« Aucun » est retenu."""
import sys
from harness import *

res = []


def check(name, ok, extra=''):
    res.append(bool(ok))
    print(('OK   ' if ok else 'ÉCHEC'), name, extra)


WP = "document.documentElement.getAttribute('data-wallpaper')"

with Srv() as base, sync_playwright() as p:
    br = p.chromium.launch()
    # 1. Nouvel usager : ni données ni fond
    ctx, pg, errs = newpage(br, seed=False)
    pg.goto(base + 'index.html'); pg.wait_for_timeout(900)
    check('nouvel usager : fond Râtelier', pg.evaluate("getWallpaper()") == 'ratelier' and pg.evaluate(WP) == 'ratelier',
          (pg.evaluate("getWallpaper()"), pg.evaluate(WP)))
    check('image affichée', pg.evaluate("getComputedStyle(document.getElementById('app-wallpaper')).display") != 'none')
    pg.evaluate("switchTab('fond')"); pg.wait_for_timeout(200)
    check('Réglages › Fond d\'écran : Râtelier coché',
          pg.get_attribute('.wallpaper-opt[data-wallpaper="ratelier"]', 'aria-checked') == 'true')
    # « Aucun » choisi : retenu après relance
    pg.click('.wallpaper-opt[data-wallpaper="none"]'); pg.wait_for_timeout(200)
    pg.reload(); pg.wait_for_timeout(700)
    check('« Aucun » choisi : retenu après relance', pg.evaluate("getWallpaper()") == 'none' and pg.evaluate(WP) is None)
    check('aucune erreur', not errs, errs)
    ctx.close()
    # 2. Usager existant au fond blanc (données, pas de fond enregistré) : reste blanc
    ctx, pg, errs = newpage(br)
    pg.goto(base + 'index.html'); pg.wait_for_timeout(900)
    check('usager existant sans fond : reste blanc', pg.evaluate("getWallpaper()") == 'none' and pg.evaluate(WP) is None)
    ctx.close()
    # 3. Usager existant avec un fond choisi : inchangé
    ctx, pg, errs = newpage(br)
    pg.add_init_script("localStorage.setItem('h49_wallpaper','barre')")
    pg.goto(base + 'index.html'); pg.wait_for_timeout(900)
    check('usager existant avec Barre : inchangé', pg.evaluate("getWallpaper()") == 'barre')
    ctx.close()
    # Écran d'aide après le prénom (1.8.62) : texte en bas, couleur pleine, icône + dans le texte
    for sch, (w, h) in (('light', (390, 844)), ('dark', (360, 667))):
        ctx, pg, errs = newpage(br, w=w, h=h, seed=False, pref=sch)
        pg.add_init_script("localStorage.setItem('h49_user_name','Carine')")
        pg.goto(base + 'index.html'); pg.wait_for_timeout(1000)
        m = pg.evaluate("""() => { const r = s => document.querySelector(s).getBoundingClientRect();
          const sc = document.getElementById('app-scroll');
          return { gap: r('nav').top - r('.prog-empty-sub').bottom, scroll: sc.scrollHeight - sc.clientHeight,
            sub: getComputedStyle(document.querySelector('.prog-empty-sub')).color, text: getComputedStyle(document.body).color,
            icon: !!document.querySelector('.prog-empty-sub .prog-empty-plus svg') }; }""")
        check(f'{sch} {w}×{h} : texte en bas (moins de 60 px au-dessus du menu), sans défilement', 0 <= m['gap'] < 60 and m['scroll'] <= 0, m)
        check(f'{sch} : texte d\'aide de la couleur du texte', m['sub'] == m['text'], m)
        check(f'{sch} : icône + dans le texte', m['icon'])
        check(f'{sch} : aucune erreur', not errs, errs)
        ctx.close()
    br.close()

print(f'\n {sum(res)} / {len(res)} contrôles OK')
sys.exit(0 if all(res) else 1)
