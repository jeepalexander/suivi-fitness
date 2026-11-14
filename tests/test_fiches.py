"""Fiches d'exercice (1.7.84) : appui long sur n'importe quelle image d'exercice → fiche (grande image, groupe,
séries, « Bien faire », « À éviter », « Muscles », Fermer). Une fiche par exercice du catalogue. Le toucher simple
garde son effet ; la fiche s'ouvre au-dessus d'un volet (Ajouter un exercice) sans le fermer. 390 et 360 px, clair et sombre."""
import sys
from harness import Srv, newpage, sync_playwright, OVERFLOW_JS

res = []


def ok(n, c, extra=''):
    res.append(bool(c)); print(('OK   ' if c else 'FAIL ') + n, '' if c else str(extra)[:300])


def long_press(pg, sel, ms=650):
    b = pg.locator(sel).first.bounding_box()
    x, y = b['x'] + b['width'] / 2, b['y'] + b['height'] / 2
    pg.mouse.move(x, y); pg.mouse.down(); pg.wait_for_timeout(ms); pg.mouse.up(); pg.wait_for_timeout(250)


FICHE_OPEN = "!!document.querySelector('#fiche-overlay.open .fiche-sheet')"

with Srv() as url, sync_playwright() as p:
    br = p.chromium.launch()
    for scheme in ('light', 'dark'):
        for w in (390, 360):
            tag = f'[{scheme} {w}] '
            ctx, pg, errs = newpage(br, w=w, pref=scheme, scheme=scheme)
            pg.goto(url + 'index.html'); pg.wait_for_timeout(500)
            if scheme == 'light' and w == 390:
                miss = pg.evaluate("CATALOGUE.filter(e => !FICHES[e.id] || !FICHES[e.id].f.length || !FICHES[e.id].m).map(e => e.name)")
                ok('une fiche complète pour chaque exercice du catalogue', not miss, miss)
            # Séance : toucher simple = ouvre la ligne ; appui long = fiche, sans ouvrir la ligne
            pg.evaluate("switchTab('seance'); 0"); pg.wait_for_timeout(400)
            badge = '#exercises-list .exercise-item .ex-icon-badge'
            open_before = pg.evaluate("[...document.querySelectorAll('#exercises-list .exercise-item.open')].length")
            long_press(pg, badge)
            ok(tag + 'Séance : appui long sur l\'image → fiche', pg.evaluate(FICHE_OPEN))
            name = pg.evaluate("document.querySelector('#exercises-list .exercise-item .ex-icon-badge [data-ex]').dataset.ex")
            ok(tag + 'fiche au nom de l\'exercice, avec Bien faire / À éviter / Muscles',
               pg.inner_text('#fiche-title') == name and pg.locator('.fiche-sheet .exf-h').count() == 3 and pg.locator('.fiche-sheet ol.exf-list li').count() >= 4, name)
            ok(tag + 'l\'appui long n\'a pas ouvert ni fermé la ligne', pg.evaluate("[...document.querySelectorAll('#exercises-list .exercise-item.open')].length") == open_before)
            ov = pg.evaluate(OVERFLOW_JS)
            ok(tag + 'fiche : rien ne déborde', ov['docW'] <= ov['vw'], ov)
            pg.screenshot(path=f"{__import__('os').environ.get('SHOTS_DIR', '/tmp')}/fiche-{scheme}-{w}.png")
            pg.click('.fiche-sheet .btn-secondary'); pg.wait_for_timeout(200)
            ok(tag + 'Fermer referme la fiche', not pg.evaluate(FICHE_OPEN))
            long_press(pg, badge); pg.keyboard.press('Escape'); pg.wait_for_timeout(150)
            ok(tag + 'Échap referme la fiche', not pg.evaluate(FICHE_OPEN))
            # Toucher court : pas de fiche
            pg.locator(badge).first.click(); pg.wait_for_timeout(250)
            ok(tag + 'toucher court : pas de fiche', not pg.evaluate(FICHE_OPEN))
            # Volet « Ajouter un exercice » : la fiche s'ouvre au-dessus, le volet reste, rien n'est coché
            pg.evaluate("editProgram(getActiveProgram().id); 0"); pg.wait_for_timeout(300)
            pg.evaluate("openAddExercise(); 0"); pg.wait_for_timeout(300)
            sel_before = pg.evaluate("addSheet ? addSheet.selected.size : -1")
            long_press(pg, '#sheet-overlay .ex-icon-badge')
            ok(tag + 'Ajouter un exercice : fiche au-dessus du volet', pg.evaluate(FICHE_OPEN) and pg.evaluate("document.getElementById('sheet-overlay').classList.contains('open')"))
            ok(tag + 'Ajouter un exercice : l\'appui long ne coche pas l\'exercice', pg.evaluate("addSheet ? addSheet.selected.size : -1") == sel_before)
            pg.mouse.click(5, 5); pg.wait_for_timeout(200)
            ok(tag + 'toucher à côté : la fiche se ferme, le volet reste', not pg.evaluate(FICHE_OPEN) and pg.evaluate("document.getElementById('sheet-overlay').classList.contains('open')"))
            ok(tag + 'aucune erreur JavaScript', not errs, errs)
            ctx.close()
    # Exercice sans image : pictogramme générique, fiche quand même
    ctx, pg, errs = newpage(br)
    pg.goto(url + 'index.html'); pg.wait_for_timeout(400)
    noimg = pg.evaluate("(CATALOGUE.find(e => !e.icon) || {}).name || ''")
    if noimg:
        pg.evaluate("n => { openFiche(n); return 0 }", noimg); pg.wait_for_timeout(200)
        ok('exercice sans image : fiche avec pictogramme générique', pg.inner_text('#fiche-title') == noimg and pg.locator('.fiche-sheet .ex-generic').count() == 1, noimg)
    ok('aucune erreur JavaScript (sans image)', not errs, errs)
    ctx.close()
    br.close()
print(f"\n {sum(res)} / {len(res)} contrôles OK")
sys.exit(0 if all(res) else 1)
