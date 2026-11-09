"""Éditeur de programme (1.7.16) : plus de poignée de glisser-déposer ; menu ⋮ qui reste ouvert après Monter / Descendre ; « Fermer »."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from harness import Srv, newpage, sync_playwright, OVERFLOW_JS

OK = True
def check(label, cond, detail=''):
    global OK
    print(('  OK  ' if cond else '  ÉCHEC ') + label + ('' if cond else f'  -> {detail}'))
    OK = OK and bool(cond)

NAMES = "[...document.querySelectorAll('#ed-list .ed-row-name')].map(e=>e.textContent)"

with Srv() as base, sync_playwright() as p:
    br = p.chromium.launch()
    for w in (390, 360):
        ctx, pg, errs = newpage(br, w=w)
        pg.goto(base + 'index.html'); pg.wait_for_timeout(600)
        pid = pg.evaluate("getActiveProgram().id")
        pg.evaluate(f"editProgram('{pid}')"); pg.wait_for_timeout(400)
        start = pg.evaluate(NAMES)
        check(f"[{w}px] éditeur ouvert avec au moins 3 exercices", len(start) >= 3, start)
        check(f"[{w}px] aucune poignée de déplacement (6 points) sur les lignes", pg.evaluate("document.querySelectorAll('.ed-handle').length") == 0)
        check(f"[{w}px] la ligne commence par l'icône de l'exercice", pg.evaluate("document.querySelector('#ed-list .ed-row').firstElementChild.classList.contains('ex-icon-badge')"))
        pg.click('#ed-list .ed-row:nth-child(1) .ed-more'); pg.wait_for_timeout(300)
        btns = pg.evaluate("[...document.querySelectorAll('.sheet .btn')].map(b=>b.textContent.trim())")
        check(f"[{w}px] menu ⋮ : Monter, Descendre, Retirer, Fermer (plus « Annuler »)", btns == ['Monter', 'Descendre', 'Retirer de la séance', 'Fermer'], btns)
        check(f"[{w}px] 1er exercice : « Monter » désactivé", pg.evaluate("document.getElementById('ed-move-up').disabled"))
        pg.click('#ed-move-down'); pg.wait_for_timeout(250)
        after1 = pg.evaluate(NAMES)
        check(f"[{w}px] « Descendre » : l'exercice passe en 2e position et le menu reste ouvert", after1[1] == start[0] and after1[0] == start[1] and pg.is_visible('.sheet') and pg.inner_text('.sheet .sheet-title') == start[0], after1)
        check(f"[{w}px] … le menu suit l'exercice : « Monter » de nouveau actif", not pg.evaluate("document.getElementById('ed-move-up').disabled"))
        pg.click('#ed-move-down'); pg.wait_for_timeout(250)
        after2 = pg.evaluate(NAMES)
        check(f"[{w}px] 2e « Descendre » d'affilée : 3e position, menu toujours ouvert", after2[2] == start[0] and pg.is_visible('.sheet'), after2)
        pg.click('#ed-move-up'); pg.wait_for_timeout(250)
        check(f"[{w}px] « Monter » : retour en 2e position, menu ouvert", pg.evaluate(NAMES)[1] == start[0] and pg.is_visible('.sheet'))
        check(f"[{w}px] une seule feuille ouverte (pas d'empilement)", pg.evaluate("document.querySelectorAll('.sheet').length") == 1)
        pg.click('.sheet .btn:has-text("Fermer")'); pg.wait_for_timeout(300)
        check(f"[{w}px] « Fermer » referme le menu, l'ordre choisi est gardé", not pg.evaluate("!!document.querySelector('#sheet-overlay.open')") and pg.evaluate(NAMES)[1] == start[0])
        ov = pg.evaluate(OVERFLOW_JS)
        check(f"[{w}px] rien ne déborde", ov['docW'] <= ov['vw'] and not ov['out'], ov)
        check(f"[{w}px] aucune erreur JavaScript", not errs, errs)
        ctx.close()
    br.close()
print('\nTOUS LES TESTS PASSENT' if OK else '\nÉCHECS')
sys.exit(0 if OK else 1)
