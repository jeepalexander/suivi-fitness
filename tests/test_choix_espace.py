"""Écran du bouton + (1.7.58) : moins d'espace en haut ; tout tient au-dessus du menu sans défiler,
« Recevoir un programme » à 32 px au-dessus du menu (écart d'origine), dès 360 × 820."""
import sys
from harness import Srv, newpage, sync_playwright

FAILS = []


def check(label, cond, detail=''):
    print(('  OK  ' if cond else '  ÉCHEC ') + label + ('' if cond else f'  -> {detail}'))
    if not cond: FAILS.append(label)


def main():
    with Srv() as base, sync_playwright() as p:
        br = p.chromium.launch()
        for w, h, scheme in ((390, 844, 'light'), (412, 915, 'dark'), (412, 846, 'light'), (360, 820, 'dark')):
            ctx, pg, errs = newpage(br, w=w, h=h, scheme=scheme, pref=scheme)
            pg.goto(base + 'index.html'); pg.wait_for_timeout(500)
            pg.evaluate("openProgramChooser()"); pg.wait_for_timeout(400)
            r = pg.evaluate("""(()=>{const s=document.getElementById('app-scroll');
              return {scroll: s.scrollHeight - s.clientHeight, top: s.scrollTop,
                gap: Math.round(document.querySelector('nav').getBoundingClientRect().top - document.querySelector('.choose-recv').getBoundingClientRect().bottom),
                ed: getComputedStyle(document.querySelector('#tab-programme .ed-top')).marginBottom}})()""")
            check(f"{w}×{h} ({scheme}) : rien ne déborde, page non défilée", r['scroll'] <= 0 and r['top'] == 0, r)
            check(f"{w}×{h} : « Recevoir un programme » à 32 px au-dessus du menu", r['gap'] == 32, r)
            check(f"{w}×{h} : flèche retour à 4 px de « Choisis comment t'entraîner »", r['ed'] == '4px', r)
            check(f"{w}×{h} : aucune erreur JavaScript", not errs, errs)
            ctx.close()
        br.close()
    print('\nÉCHECS' if FAILS else '\nTOUS LES TESTS PASSENT')
    sys.exit(1 if FAILS else 0)


if __name__ == '__main__':
    main()
