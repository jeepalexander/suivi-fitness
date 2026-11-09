"""Réglages › Inviter quelqu'un (1.7.21) : QR code vers l'adresse de l'application ; astuce (i) et « En mémoire » vide centré."""
import sys, tempfile, os
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from harness import Srv, newpage, sync_playwright, OVERFLOW_JS

OK = True
def check(label, cond, detail=''):
    global OK
    print(('  OK  ' if cond else '  ÉCHEC ') + label + ('' if cond else f'  -> {detail}'))
    OK = OK and bool(cond)

def decode_qr(png):
    try:
        import cv2
    except ImportError:
        return None
    img = cv2.imread(png)
    txt, _, _ = cv2.QRCodeDetector().detectAndDecode(img)
    return txt

with Srv() as base, sync_playwright() as p:
    br = p.chromium.launch()
    for th in ('light', 'dark'):
        ctx, pg, errs = newpage(br, pref=th)
        pg.goto(base + 'index.html'); pg.wait_for_timeout(600)
        # Programmes : astuce et « En mémoire » vide
        check(f"[{th}] astuce : symbole (i) puis « Astuce : Reste appuyé… »", pg.locator('.prog-hint .prog-hint-ico svg').count() == 1 and pg.inner_text('.prog-hint').strip().startswith('Astuce : Reste appuyé sur un programme'))
        if pg.locator('.mem-empty').count():
            check(f"[{th}] « Tes autres programmes apparaîtront ici » centré", pg.evaluate("getComputedStyle(document.querySelector('.mem-empty')).textAlign") == 'center')
        # Réglages
        pg.evaluate("switchTab('reglages')"); pg.wait_for_timeout(200)
        titles = pg.evaluate("[...document.querySelectorAll('#tab-reglages .card-title')].map(e=>e.textContent)")
        check(f"[{th}] carte « Inviter quelqu'un » entre Google Drive et Application", titles.index("Inviter quelqu'un") == titles.index('Sauvegarde Google Drive') + 1 and titles.index('Application') == titles.index("Inviter quelqu'un") + 1, titles)
        pg.click('#invite-btn'); pg.wait_for_timeout(400)
        url = pg.evaluate("appShareUrl()")
        check(f"[{th}] la fenêtre s'ouvre : QR code, lien de l'application, Partager/Copier, Fermer",
              pg.locator('.sheet .invite-qr svg').count() == 1 and pg.inner_text('.sheet .invite-link') == url
              and [b.strip() for b in pg.evaluate("[...document.querySelectorAll('.sheet .btn')].map(b=>b.textContent)")][-1] == 'Fermer', url)
        check(f"[{th}] lien = dossier de l'application (sans index.html ni paramètres)", url == base and '?' not in url and '#' not in url, url)
        check(f"[{th}] QR noir sur fond blanc (lisible en thème sombre)", pg.evaluate("getComputedStyle(document.querySelector('.invite-qr')).backgroundColor") == 'rgb(255, 255, 255)')
        png = os.path.join(tempfile.gettempdir(), f'qr_{th}.png')
        pg.locator('.invite-qr').screenshot(path=png)
        dec = decode_qr(png)
        if dec is not None:
            check(f"[{th}] le QR code se lit et donne l'adresse de l'application", dec == url, dec)
        ov = pg.evaluate(OVERFLOW_JS)
        check(f"[{th}] rien ne déborde", ov['docW'] <= ov['vw'] and not ov['out'], ov)
        # Copie (pas de partage natif dans Chromium de test)
        pg.evaluate("navigator.share=undefined; navigator.clipboard.writeText=t=>{window.__copied=t;return Promise.resolve()}")
        pg.evaluate("shareAppLink()"); pg.wait_for_timeout(300)
        check(f"[{th}] sans partage natif : « Copier le lien » copie l'adresse", pg.evaluate("window.__copied") == url)
        pg.click('.sheet .btn:has-text("Fermer")'); pg.wait_for_timeout(300)
        check(f"[{th}] « Fermer » referme la fenêtre", not pg.evaluate("!!document.querySelector('#sheet-overlay.open')"))
        check(f"[{th}] aucune erreur JavaScript", not errs, errs)
        ctx.close()
    br.close()
sw = (Path(__file__).resolve().parent.parent / 'sw.js').read_text(encoding='utf-8')
check("bibliothèque QR mise en cache (hors connexion)", "'./js/qrcode.js'" in sw)
print('\nTOUS LES TESTS PASSENT' if OK else '\nÉCHECS')
sys.exit(0 if OK else 1)
