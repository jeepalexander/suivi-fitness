"""Écran « Ajouter » du bouton + (1.7.58, 1.8.63) : tout tient au-dessus du menu sans défiler, la dernière option à 32 px au-dessus du menu,
« Ajouter » derrière la flèche, « Une séance » puis « Un programme », puis Restaurer, Recevoir et « Avec notre aide » (actif depuis la 1.8.78), dès 360 × 844."""
import sys
from harness import Srv, newpage, sync_playwright

FAILS = []


def check(label, cond, detail=''):
    print(('  OK  ' if cond else '  ÉCHEC ') + label + ('' if cond else f'  -> {detail}'))
    if not cond: FAILS.append(label)


def main():
    with Srv() as base, sync_playwright() as p:
        br = p.chromium.launch()
        for w, h, scheme in ((390, 844, 'light'), (412, 915, 'dark'), (412, 846, 'light'), (360, 844, 'dark')):
            ctx, pg, errs = newpage(br, w=w, h=h, scheme=scheme, pref=scheme)
            pg.goto(base + 'index.html'); pg.wait_for_timeout(500)
            pg.evaluate("openProgramChooser()"); pg.wait_for_timeout(400)
            r = pg.evaluate("""(()=>{const s=document.getElementById('app-scroll');
              return {scroll: s.scrollHeight - s.clientHeight, top: s.scrollTop,
                gap: Math.round(document.querySelector('nav').getBoundingClientRect().top - [...document.querySelectorAll('.choose-recv')].pop().getBoundingClientRect().bottom),
                ed: getComputedStyle(document.querySelector('#tab-programme .ed-top')).marginBottom, head: (document.querySelector('.ed-top .choose-head')||{}).innerText,
                cards: [...document.querySelectorAll('.choose-title')].map(e=>e.innerText), opts: [...document.querySelectorAll('.choose-options .choose-recv')].map(e=>[e.innerText.trim(), e.disabled])}})()""")
            check(f"{w}×{h} ({scheme}) : rien ne déborde, page non défilée", r['scroll'] <= 0 and r['top'] == 0, r)
            check(f"{w}×{h} : dernière option à 32 px au-dessus du menu", r['gap'] == 32, r)
            check(f"{w}×{h} : « Ajouter » derrière la flèche, plus de « Choisis comment t'entraîner »", r['head'] == 'Ajouter' and r['ed'] == '8px' and pg.locator('.choose-lead').count() == 0, r)
            check(f"{w}×{h} : « Une séance » puis « Un programme »", r['cards'] == ['Une séance', 'Un programme'], r)
            check(f"{w}×{h} : trois options, « Avec notre aide » active", [o[0].split('\n')[0].split(' (')[0] for o in r['opts']] == ['Restaurer un programme sauvegardé', 'Recevoir un programme', 'Avec notre aide'] and [o[1] for o in r['opts']] == [False, False, False], r)
            check(f"{w}×{h} : aucune erreur JavaScript", not errs, errs)
            ctx.close()
        br.close()
    print('\nÉCHECS' if FAILS else '\nTOUS LES TESTS PASSENT')
    sys.exit(1 if FAILS else 0)


if __name__ == '__main__':
    main()
