"""Hauteur visible (1.7.57) : la page prend la hauteur réellement visible (--app-h = window.innerHeight),
la même que celle du menu du bas fixé ; « Recevoir un programme » garde 56 px au-dessus du menu."""
import sys
from harness import Srv, newpage, sync_playwright

FAILS = []


def check(label, cond, detail=''):
    print(('  OK  ' if cond else '  ÉCHEC ') + label + ('' if cond else f'  -> {detail}'))
    if not cond: FAILS.append(label)


GAP_JS = """(()=>{const s=document.getElementById('app-scroll');s.scrollTop=99999;
  return Math.round(document.querySelector('nav').getBoundingClientRect().top - document.querySelector('.choose-recv').getBoundingClientRect().bottom)})()"""


def main():
    with Srv() as base, sync_playwright() as p:
        br = p.chromium.launch()
        for w, h, scheme in ((390, 844, 'light'), (360, 780, 'dark'), (412, 915, 'light')):
            ctx, pg, errs = newpage(br, w=w, h=h, scheme=scheme, pref=scheme)
            pg.goto(base + 'index.html'); pg.wait_for_timeout(600)
            v = pg.evaluate("[getComputedStyle(document.documentElement).getPropertyValue('--app-h').trim(), innerHeight, Math.round(document.body.getBoundingClientRect().height)]")
            check(f"{w}×{h} : --app-h = hauteur visible, le corps de page la suit", v[0] == f'{h}px' and v[1] == h and v[2] == h, v)
            pg.evaluate("openProgramChooser()"); pg.wait_for_timeout(400)
            gap = pg.evaluate(GAP_JS)
            check(f"{w}×{h} ({scheme}) : « Recevoir un programme » à 56 px au-dessus du menu", gap == 56, gap)
            check(f"{w}×{h} : aucune erreur JavaScript", not errs, errs)
            ctx.close()
        # La hauteur suit un changement de taille (rotation, clavier)
        ctx, pg, errs = newpage(br, w=390, h=844)
        pg.goto(base + 'index.html'); pg.wait_for_timeout(500)
        pg.set_viewport_size({'width': 390, 'height': 700}); pg.wait_for_timeout(300)
        v = pg.evaluate("[getComputedStyle(document.documentElement).getPropertyValue('--app-h').trim(), Math.round(document.body.getBoundingClientRect().height)]")
        check("hauteur réduite à 700 px : --app-h et le corps de page suivent", v == ['700px', 700], v)
        pg.evaluate("openProgramChooser()"); pg.wait_for_timeout(400)
        gap = pg.evaluate(GAP_JS)
        check("à 700 px (la page défile) : toujours 56 px au-dessus du menu", gap == 56, gap)
        ctx.close(); br.close()
    print('\nÉCHECS' if FAILS else '\nTOUS LES TESTS PASSENT')
    sys.exit(1 if FAILS else 0)


if __name__ == '__main__':
    main()
