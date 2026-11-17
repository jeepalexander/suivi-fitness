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
    # Écran de premier lancement (1.8.29) : texte en bas, couleur pleine, icône + dans le texte, petite flèche vers le bouton + (1.8.30)
    for sch, (w, h) in (('light', (390, 844)), ('dark', (360, 667))):
        ctx, pg, errs = newpage(br, w=w, h=h, seed=False, pref=sch)
        pg.goto(base + 'index.html'); pg.wait_for_timeout(1000)
        m = pg.evaluate("""() => { const r = s => document.querySelector(s).getBoundingClientRect();
          const sc = document.getElementById('app-scroll'), cs = s => getComputedStyle(document.querySelector(s)).color;
          return { gap: r('nav').top - r('.prog-empty-restore').bottom, scroll: sc.scrollHeight - sc.clientHeight,
            sub: cs('.prog-empty-sub'), restore: cs('.prog-empty-restore'), title: cs('.prog-empty-title'),
            icon: !!document.querySelector('.prog-empty-sub .prog-empty-plus svg'),
            arrow: r('.prog-empty-arrow'), greet: r('.prog-greet-welcome').bottom, titleTop: r('.prog-empty-title').top,
            btn: r('#add-program-btn') }; }""")
        check(f'{sch} {w}×{h} : texte en bas (moins de 60 px au-dessus du menu), sans défilement', 0 <= m['gap'] < 60 and m['scroll'] <= 0, m)
        check(f'{sch} : sous-titre et « Restaurer » de la couleur du titre (noir / blanc)', m['sub'] == m['title'] == m['restore'], m)
        check(f'{sch} : icône + dans le texte', m['icon'])
        a = m['arrow']
        check(f'{sch} : petite flèche (≈ 3 cm) juste au-dessus du titre, sous « Bienvenue ! »',
              120 <= a['height'] <= 180 and 0 <= m['titleTop'] - a['bottom'] <= 20 and a['top'] > m['greet'], a)
        check(f'{sch} : flèche alignée sous le bouton +', a['left'] < m['btn']['left'] + m['btn']['width'] / 2 < a['right'] + 10, (a, m['btn']))
        check(f'{sch} : aucune erreur', not errs, errs)
        ctx.close()
    br.close()

print(f'\n {sum(res)} / {len(res)} contrôles OK')
sys.exit(0 if all(res) else 1)
