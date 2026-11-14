"""Plein écran avec Chrome (1.7.79) : l'application installée monte jusqu'en haut de l'écran (viewport-fit=cover)
et rien ne passe sous la caméra : le nom de l'app commence juste sous la zone réservée (--safe-top), 1.7.82.
Sans encoche (--safe-top = 0) ou avec une petite zone, l'en-tête reste à 28 px (390 et 360 px, clair et sombre)."""
import sys
from harness import Srv, newpage, sync_playwright

res = []


def ok(n, c, extra=''):
    res.append(bool(c)); print(('OK   ' if c else 'FAIL ') + n, '' if c else str(extra)[:200])


TOPS = """() => ['#app-title', '#page-title', '#settings-btn'].map(s => Math.round(document.querySelector(s).getBoundingClientRect().top))"""
SAFE = 40

with Srv() as url, sync_playwright() as p:
    br = p.chromium.launch()
    for scheme in ('light', 'dark'):
        for w in (390, 360):
            ctx, pg, errs = newpage(br, w=w, pref=scheme, scheme=scheme)
            pg.goto(url + 'index.html'); pg.wait_for_timeout(500)
            vp = pg.evaluate("document.querySelector('meta[name=viewport]').content")
            ok(f'[{scheme} {w}] viewport-fit=cover', 'viewport-fit=cover' in vp, vp)
            pg.evaluate("switchTab('historique'); 0"); pg.wait_for_timeout(300)
            a = pg.evaluate(TOPS)
            ok(f'[{scheme} {w}] sans encoche : en-tête à sa place (nom de l\'app à 28 px, bouton Réglages à 24 px)', a[0] == 28 and a[2] == 24, a)
            pg.evaluate("document.documentElement.style.setProperty('--safe-top', '10px'); 0"); pg.wait_for_timeout(200)
            c = pg.evaluate(TOPS)
            ok(f'[{scheme} {w}] petite zone (10 px) : l\'en-tête ne remonte pas au-dessus de 28 px', c == a, (a, c))
            pg.evaluate("document.documentElement.style.setProperty('--safe-top', '%dpx'); 0" % SAFE); pg.wait_for_timeout(200)
            b = pg.evaluate(TOPS)
            ok(f'[{scheme} {w}] caméra de {SAFE} px : nom de l\'app juste dessous, bouton 4 px plus haut (comme sans encoche), titre décalé d\'autant',
               b[0] == SAFE and b[2] == SAFE - 4 and b[1] - a[1] == SAFE - 28, (a, b))
            hb = pg.evaluate("Math.round(document.querySelector('header').getBoundingClientRect().top)")
            ok(f'[{scheme} {w}] le fond de l\'en-tête part du bord haut de l\'écran', hb == 0, hb)
            ok(f'[{scheme} {w}] aucune erreur JavaScript', not errs, errs)
            ctx.close()
    br.close()
print(f"\n {sum(res)} / {len(res)} contrôles OK")
sys.exit(0 if all(res) else 1)
