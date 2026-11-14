"""Programmes (1.7.70) : entre la tuile active et « En mémoire », seulement section-gap (28 px),
détail fermé comme ouvert (et 28 px, inchangés, entre la tuile et son détail), programme comme séance libre, à 390 et 360 px, clair et sombre."""
import sys
from harness import Srv, newpage, sync_playwright

res = []


def ok(n, c, extra=''):
    res.append(bool(c)); print(('OK   ' if c else 'FAIL ') + n, '' if c else str(extra)[:200])


GAP = """(()=>{const t=document.querySelector('.prog-mem-title'),a=t.previousElementSibling;
  return Math.round(t.getBoundingClientRect().top-a.getBoundingClientRect().bottom)})()"""

with Srv() as url, sync_playwright() as p:
    br = p.chromium.launch()
    for scheme in ('light', 'dark'):
        for w in (390, 360):
            ctx, pg, errs = newpage(br, w=w, pref=scheme, scheme=scheme)
            pg.goto(url + 'index.html'); pg.wait_for_timeout(500)
            ok(f'[{scheme} {w}] détail fermé : 28 px', pg.evaluate(GAP) == 28, pg.evaluate(GAP))
            pg.evaluate("programDetailOpen=true; renderProgramOverview(); 0"); pg.wait_for_timeout(200)
            ok(f'[{scheme} {w}] détail ouvert : 28 px', pg.evaluate(GAP) == 28, pg.evaluate(GAP))
            g = pg.evaluate("Math.round(document.querySelector('.prog-detail').getBoundingClientRect().top-document.querySelector('.next-card.prog-tile').getBoundingClientRect().bottom)")
            ok(f'[{scheme} {w}] détail ouvert : 28 px entre la tuile et les exercices (inchangé)', g == 28, g)
            ok(f'[{scheme} {w}] aucune erreur JavaScript', not errs, errs)
            ctx.close()
    br.close()
print(f"\n {sum(res)} / {len(res)} contrôles OK")
sys.exit(0 if all(res) else 1)
