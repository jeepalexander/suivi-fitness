"""En-têtes (1.7.74) : 12 px entre l'icône de 44 px (ou la flèche retour) et le titre. Dans Séance, le nom
du programme et celui de la séance commencent au même endroit ; la page Fond d'écran et l'éditeur suivent
la même règle (390 et 360 px, clair et sombre)."""
import sys
from harness import Srv, newpage, sync_playwright

res = []


def ok(n, c, extra=''):
    res.append(bool(c)); print(('OK   ' if c else 'FAIL ') + n, '' if c else str(extra)[:200])


GAP = """([sel, ico]) => { const t = document.querySelector(sel), i = document.querySelector(ico);
  return Math.round(t.getBoundingClientRect().left - i.getBoundingClientRect().right); }"""

with Srv() as url, sync_playwright() as p:
    br = p.chromium.launch()
    for scheme in ('light', 'dark'):
        for w in (390, 360):
            ctx, pg, errs = newpage(br, w=w, pref=scheme, scheme=scheme)
            pg.goto(url + 'index.html'); pg.wait_for_timeout(500)
            pg.evaluate("switchTab('seance'); 0"); pg.wait_for_timeout(500)
            a = pg.evaluate(GAP, ['#page-title', '#seance-prog-ico'])
            b = pg.evaluate(GAP, ['#seance-head .session-head-text', '#seance-head .type-pill'])
            x = pg.evaluate("[document.querySelector('#page-title').getBoundingClientRect().left, document.querySelector('#seance-head .session-head-text').getBoundingClientRect().left].map(Math.round)")
            ok(f'[{scheme} {w}] Séance : 12 px icône → programme, 12 px pastille → séance', a == 12 and b == 12, (a, b))
            ok(f'[{scheme} {w}] Séance : programme et séance alignés', x[0] == x[1], x)
            pg.evaluate("switchTab('fond'); 0"); pg.wait_for_timeout(400)
            f = pg.evaluate(GAP, ['#page-title', '#fond-back'])
            ok(f'[{scheme} {w}] Fond d\'écran : 12 px flèche → titre', f == 12, f)
            ok(f'[{scheme} {w}] aucune erreur JavaScript', not errs, errs)
            ctx.close()
    br.close()
print(f"\n {sum(res)} / {len(res)} contrôles OK")
sys.exit(0 if all(res) else 1)
