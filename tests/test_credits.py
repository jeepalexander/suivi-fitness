"""1.8.70 (co-auteur : Claude) : page publique « Crédits des images » (credits.html) : une ligne par fond d'écran
proposé dans l'app (même liste et même ordre que WALLPAPERS), avec vignette et source ; illustrations des exercices ;
liens depuis les conditions d'utilisation et la confidentialité ; NOTICE cite chaque fond."""
import sys, re
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from harness import Srv, newpage, sync_playwright, OVERFLOW_JS

REPO = Path(__file__).resolve().parent.parent
OK = True
def check(label, cond, detail=''):
    global OK
    print(('  OK  ' if cond else '  ÉCHEC ') + label + ('' if cond else f'  -> {detail}'))
    OK = OK and bool(cond)

app = (REPO / 'js' / 'theme.js').read_text(encoding='utf-8')  # liste WALLPAPERS (dans app.js avant 1.8.90)
block = app[app.index('const WALLPAPERS = ['):]
block = block[:block.index('];')]
WP = [(i, n) for i, n in re.findall(r"\{ id: '([a-z]+)', name: '([^']+)'", block) if i != 'none']
notice = (REPO / 'NOTICE').read_text(encoding='utf-8')
check("NOTICE cite chacun des fonds proposés", all(n in notice for _, n in WP), [n for _, n in WP if n not in notice])
check("NOTICE : Meta AI pour les illustrations, plus de Pixabay ni de Magnific", 'Meta AI' in notice and 'Pixabay' not in notice and 'Magnific' not in notice)

with Srv() as base, sync_playwright() as p:
    br = p.chromium.launch()
    for th in ('light', 'dark'):
        for w in (390, 360):
            ctx, pg, errs = newpage(br, w=w, pref=th)
            pg.goto(base + 'credits.html'); pg.wait_for_timeout(400)
            t = f'[{th} {w}]'
            rows = pg.evaluate("[...document.querySelectorAll('.credits li')].map(li=>[li.querySelector('img').getAttribute('src'),li.querySelector('.nom').textContent,li.querySelector('.src').textContent])")
            check(f"{t} une ligne par fond, même ordre que l'app ({len(WP)})",
                  [(r[0], r[1]) for r in rows] == [(f'wallpapers/{i}-mini.jpg', n) for i, n in WP], rows)
            check(f"{t} chaque ligne a une source", all(r[2].strip() and 'compléter' not in r[2] for r in rows), rows)
            pg.evaluate("document.querySelectorAll('.credits img').forEach(i=>i.loading='eager')"); pg.wait_for_timeout(600)
            check(f"{t} toutes les vignettes se chargent", pg.evaluate("[...document.querySelectorAll('.credits img')].every(i=>i.complete&&i.naturalWidth>0)"))
            ov = pg.evaluate(OVERFLOW_JS)
            check(f"{t} aucun débordement", ov['docW'] <= ov['vw'] and not ov['out'], ov)
            check(f"{t} aucune erreur", not errs, errs)
            ctx.close()
    ctx, pg, errs = newpage(br)
    for page in ('conditions.html', 'confidentialite.html'):
        pg.goto(base + page); pg.wait_for_timeout(250)
        check(f"{page} renvoie vers credits.html", pg.evaluate("[...document.querySelectorAll('a')].some(a=>a.getAttribute('href')==='credits.html')"))
    pg.goto(base + 'index.html'); pg.wait_for_timeout(600)
    pg.evaluate("switchTab('reglages')"); pg.wait_for_timeout(250)
    lk = pg.evaluate("[...document.querySelectorAll('.legal-links a')].map(a=>[a.textContent,a.getAttribute('href'),a.target])")
    check("Réglages › Application : « Crédits des images » après Confidentialité et Conditions, nouvel onglet (1.8.71)",
          [l[0] for l in lk] == ['Règles de confidentialité', "Conditions d'utilisation", 'Crédits des images'] and lk[2][1:] == ['credits.html', '_blank'], lk)
    txt = pg.goto(base + 'conditions.html') and pg.inner_text('body')
    check("conditions : Pexels cité, plus de Pixabay ni de Magnific", 'Pexels' in txt and 'Pixabay' not in txt and 'Magnific' not in txt)
    check("aucune erreur", not errs, errs)
    br.close()

print('\n' + ('TOUS LES TESTS PASSENT' if OK else 'DES TESTS ÉCHOUENT'))
sys.exit(0 if OK else 1)
