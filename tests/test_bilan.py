"""1.7.50 : bilan du mois (post-it, pop-up centré, archives dans Progression)."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from harness import *

def run(br, base, scheme):
    ctx, pg, errs = newpage(br, 390, 844, pref=scheme)
    pg.add_init_script("window.__bilanNow = '2026-10-04T10:00:00';")
    pg.goto(base + 'index.html'); pg.wait_for_timeout(900)
    n_sept = pg.evaluate("state.history.filter(h => h.date.startsWith('2026-09')).length")
    assert n_sept > 0, 'données de test sans séance en septembre'
    pg.evaluate("delete state.bilanVu; renderProgramOverview()")
    # Post-it entre l'accueil et « Actif », carré de 100 px
    pi = pg.locator('.bilan-postit')
    assert pi.count() == 1, 'post-it absent le 4 octobre'
    box = pi.bounding_box()
    assert 95 <= box['width'] <= 115 and 95 <= box['height'] <= 115, box
    assert 'septembre' in pi.inner_text()
    order = pg.evaluate("""(() => { const g = document.querySelector('.prog-greet').getBoundingClientRect().bottom;
      const p = document.querySelector('.bilan-postit').getBoundingClientRect(); const s = document.querySelector('.prog-status').getBoundingClientRect().top;
      return [g <= p.top + 12, p.bottom <= s + 12, p.right <= innerWidth]; })()""")
    assert all(order), order
    if scheme == 'light': pg.screenshot(path='/tmp/bilan/t_postit.png')
    # Pop-up centré, une ligne par donnée, un seul bouton OK
    pi.click(); pg.wait_for_timeout(300)
    sheet = pg.locator('#bilan-modal .bilan-sheet')
    assert sheet.count() == 1
    sb = sheet.bounding_box()
    assert abs((sb['x'] + sb['width'] / 2) - 195) < 3 and abs((sb['y'] + sb['height'] / 2) - 422) < 40, sb
    labels = pg.locator('#bilan-modal .bilan-label').all_inner_texts()
    assert labels[:3] == ['Séances', 'Tonnage', 'Régularité'] and labels[-1] == 'Records battus', labels
    assert 'Poids du corps' not in labels and 'Répartition' not in labels
    assert pg.locator('#bilan-modal button').count() == 1
    assert pg.locator('#bilan-modal .bilan-label').first.inner_text() == 'Séances'
    seances = pg.locator('#bilan-modal .bilan-val b').first.inner_text()
    assert seances == str(n_sept), (seances, n_sept)
    if scheme == 'light': pg.screenshot(path='/tmp/bilan/t_modal.png')
    # OK : archive et retire le post-it, même après rechargement
    pg.click('#bilan-modal .bilan-ok'); pg.wait_for_timeout(300)
    assert pg.locator('#bilan-modal').count() == 0
    assert pg.locator('.bilan-postit').count() == 0
    assert pg.evaluate("JSON.parse(localStorage.getItem('h49_state')).bilanVu") == '2026-09'
    pg.reload(); pg.wait_for_timeout(900)
    assert pg.locator('.bilan-postit').count() == 0, 'post-it revenu après archivage'
    # Après le 10 du mois, plus de post-it
    pg.evaluate("delete state.bilanVu; window.__bilanNow = '2026-10-11T10:00:00'; renderProgramOverview()")
    assert pg.locator('.bilan-postit').count() == 0, 'post-it encore là le 11'
    # Progression : mois terminés cliquables, lien « Tous les bilans »
    pg.evaluate("window.__bilanNow = '2026-10-04T10:00:00'; switchTab('progression')"); pg.wait_for_timeout(800)
    links = pg.locator('#monthly-analysis .bar-row-link')
    assert links.count() >= 1
    assert pg.locator('#monthly-analysis .bar-row-link .bar-chevron').count() == links.count()
    links.last.click(); pg.wait_for_timeout(300)
    assert pg.locator('#bilan-modal').count() == 1
    pg.click('#bilan-modal .bilan-ok'); pg.wait_for_timeout(200)
    pg.click('#monthly-analysis .bilan-all .link-btn'); pg.wait_for_timeout(400)
    items = pg.locator('.sheet .bilan-item')
    assert items.count() >= links.count(), items.count()
    if scheme == 'dark': pg.screenshot(path='/tmp/bilan/t_tous.png')
    items.first.click(); pg.wait_for_timeout(300)
    assert pg.locator('#bilan-modal').count() == 1 and pg.locator('.sheet-overlay.open').count() == 0
    pg.keyboard.press('Escape'); pg.wait_for_timeout(200)
    assert pg.locator('#bilan-modal').count() == 0
    over = pg.evaluate(OVERFLOW_JS)
    assert not over['out'], over
    assert not errs, errs
    ctx.close()
    print('ok', scheme)

if __name__ == '__main__':
    with Srv() as base, sync_playwright() as p:
        br = p.chromium.launch()
        for s in ('light', 'dark'): run(br, base, s)
