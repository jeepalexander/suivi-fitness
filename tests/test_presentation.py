"""1.7.47 : page de présentation publique (presentation.html), page d'accueil déclarée à Google pour la vérification de la marque."""
import sys
from harness import *

res = []
def ok(n, c, extra=''):
    res.append(bool(c)); print(('OK   ' if c else 'FAIL ') + n, '' if c else str(extra)[:300])

with Srv() as url, sync_playwright() as p:
    br = p.chromium.launch()
    for w, scheme in ((390, 'light'), (360, 'light'), (390, 'dark'), (1280, 'light')):
        tag = f'{w} px {scheme} : '
        ctx = br.new_context(viewport={'width': w, 'height': 844}, color_scheme=scheme)
        pg = ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        r = pg.goto(url + 'presentation.html'); pg.wait_for_timeout(400)
        ok(tag + "page servie, titre « Mon Carnet de Salle »", r.ok and pg.title() == 'Mon Carnet de Salle')
        ok(tag + "nom exact en titre et description de l'app", pg.inner_text('h1') == 'Mon Carnet de Salle' and "carnet d'entraînement" in pg.inner_text('.lead'))
        ok(tag + "usage de Google Drive expliqué (dossier MON CARNET DE SALLE, drive.file)", 'MON CARNET DE SALLE' in pg.inner_text('.summary') and 'drive.file' in pg.inner_text('footer'))
        links = pg.evaluate("[...document.querySelectorAll('a')].map(a=>[a.textContent.trim(),a.getAttribute('href')])")
        hrefs = [h for _, h in links]
        ok(tag + "liens visibles : Ouvrir l'application, confidentialité, conditions", ["Ouvrir l'application", './'] in links
           and 'confidentialite.html' in hrefs and 'conditions.html' in hrefs and pg.is_visible('footer a[href="confidentialite.html"]'))
        ok(tag + "pages liées et icône servies", all(pg.request.get(url + h).ok for h in ('confidentialite.html', 'conditions.html', 'icons/app-icon.png'))
           and pg.evaluate("document.querySelector('.app-icon').naturalWidth > 0"))
        bg = pg.evaluate("getComputedStyle(document.body).backgroundColor")
        ok(tag + "thème suivi (fond clair ou sombre)", bg == ('rgb(255, 255, 255)' if scheme == 'light' else 'rgb(14, 14, 17)'), bg)
        ov = pg.evaluate(OVERFLOW_JS)
        ok(tag + "rien ne déborde", ov['docW'] <= ov['vw'] and not ov['out'], ov)
        ok(tag + "aucune erreur JavaScript", not errs, errs)
        ctx.close()
    br.close()
print(f"\n {sum(res)} / {len(res)} contrôles OK")
sys.exit(0 if all(res) else 1)
