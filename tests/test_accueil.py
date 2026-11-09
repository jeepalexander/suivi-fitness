"""Accueil Programmes (1.7.24) : message manuscrit selon l'heure et le contexte ; tuile active compacte (−25 %), mêmes informations."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from harness import Srv, newpage, sync_playwright, OVERFLOW_JS

OK = True
def check(label, cond, detail=''):
    global OK
    print(('  OK  ' if cond else '  ÉCHEC ') + label + ('' if cond else f'  -> {detail}'))
    OK = OK and bool(cond)

G = "(d, hist, act) => { state.history = hist; const g = programGreeting(act === 'none' ? null : getActiveProgram(), new Date(d)); return g.hello + ' | ' + g.line; }"
with Srv() as base, sync_playwright() as p:
    br = p.chromium.launch()
    for w in (390, 360):
        ctx, pg, errs = newpage(br, w=w)
        pg.goto(base + 'index.html'); pg.wait_for_timeout(1200)
        check(f"[{w}px] message manuscrit (Caveat) en haut de l'accueil", pg.locator('#tab-programme .prog-greet').count() == 1
              and 'Caveat' in pg.evaluate("getComputedStyle(document.querySelector('.prog-greet-hello')).fontFamily")
              and pg.evaluate("[...document.fonts].some(f=>f.family.includes('Caveat')&&f.status==='loaded')"))
        tile = pg.evaluate("""(()=>{const t=document.querySelector('.prog-tile');return {h:Math.round(t.getBoundingClientRect().height), txt:t.innerText,
            start:!!t.querySelector('.prog-tile-top .btn-start'), det:!!t.querySelector('.prog-tile-foot .prog-detail-btn'), next:!!t.querySelector('.prog-tile-next .prog-tile-session'),
            deload:!!t.querySelector('.deload-inline')}})()""")
        check(f"[{w}px] tuile active ≤ 75 % de l'ancienne hauteur (278 px), déload compris", tile['h'] <= 209, tile['h'])
        check(f"[{w}px] mêmes informations : nom, démarrer, prochaine séance, exercices · séries, + de détail, déload",
              tile['start'] and tile['det'] and tile['next'] and 'exercice' in tile['txt'] and 'série' in tile['txt'] and ('Déload' in tile['txt']) == tile['deload'], tile)
        ov = pg.evaluate(OVERFLOW_JS)
        check(f"[{w}px] rien ne déborde", ov['docW'] <= ov['vw'] and not ov['out'], ov)
        check(f"[{w}px] aucune erreur JavaScript", not errs, errs)
        if w == 390:
            today = pg.evaluate("new Date().toISOString().slice(0,10)")
            def g(d, hist, act='on'): return pg.evaluate(f"([d,h,a]) => ({G})(d,h,a)", [d, hist, act])
            check("9 h : « Bonjour »", g('2026-11-09T09:00:00', [{'date': '2026-11-07'}]).startswith('Bonjour |'))
            check("20 h : « Bonsoir »", g('2026-11-09T20:00:00', [{'date': '2026-11-07'}]).startswith('Bonsoir |'))
            check("2 h du matin : « Bonsoir »", g('2026-11-09T02:00:00', [{'date': '2026-11-07'}]).startswith('Bonsoir |'))
            check("séance déjà faite aujourd'hui : récup", 'récup' in g('2026-11-09T12:00:00', [{'date': '2026-11-09'}]))
            check("10 jours sans séance : « Content de te revoir »", 'revoir' in g('2026-11-20T12:00:00', [{'date': '2026-11-09'}]))
            check("aucune séance encore : « première séance »", 'première séance' in g('2026-11-09T12:00:00', []))
            check("pas de programme actif : « Choisis ton programme »", 'Choisis ton programme' in g('2026-11-09T12:00:00', [{'date': '2026-11-07'}], 'none'))
            l = g('2026-11-09T12:00:00', [{'date': '2026-11-07'}])
            check("sinon : « Prêt à te dépasser » (ou semaine légère en déload)", ('dépasser' in l) or ('Semaine légère' in l), l)
        ctx.close()
    br.close()
from PIL import Image
im = Image.open(Path(__file__).resolve().parent.parent / 'wallpapers' / 'poigne.jpg')
check("Poigne recadrée (logo du short hors cadre)", im.size[0] / im.size[1] < 0.5, im.size)
print('\nTOUS LES TESTS PASSENT' if OK else '\nÉCHECS')
sys.exit(0 if OK else 1)
