"""1.8.27 : scanner de QR code sans le lecteur de Chrome (iPhone, Safari…) : jsQR, rangé dans l'app et chargé
seulement à l'ouverture du scanner. Une caméra simulée filme un vrai QR code (dessiné par qrcode.js) ; BarcodeDetector
est retiré pour forcer jsQR."""
import os, sys
from harness import *

res = []


def check(name, ok, extra=''):
    res.append(bool(ok))
    print(('OK   ' if ok else 'ÉCHEC'), name, extra)


# Caméra simulée : un canvas qui affiche le QR code de window.__qrText (ou rien), dans un cadre de 480 x 360
CAMERA = """(()=>{ delete window.BarcodeDetector; window.__stopped = 0;
  navigator.mediaDevices.getUserMedia = async () => {
    const c = document.createElement('canvas'); c.width = 480; c.height = 360; const g = c.getContext('2d');
    const draw = () => { g.fillStyle = '#fff'; g.fillRect(0, 0, 480, 360);
      if (window.__qrText) { const q = qrcode(0, 'M'); q.addData(window.__qrText); q.make();
        const n = q.getModuleCount(), cell = Math.floor(300 / (n + 8)), x0 = (480 - cell * n) / 2, y0 = (360 - cell * n) / 2;
        g.fillStyle = '#000';
        for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) if (q.isDark(r, k)) g.fillRect(x0 + k * cell, y0 + r * cell, cell, cell); }
      requestAnimationFrame(draw); };
    draw();
    const s = c.captureStream(10);
    s.getTracks().forEach(t => { const o = t.stop.bind(t); t.stop = () => { window.__stopped++; o(); }; });
    return s; }; })();"""

with Srv() as base, sync_playwright() as p:
    br = p.chromium.launch()
    ctx, pg, errs = newpage(br, pref='light')
    jsqr_reqs = []
    pg.on('request', lambda r: jsqr_reqs.append(r.url) if 'jsqr' in r.url else None)
    pg.goto(base + 'index.html'); pg.wait_for_timeout(900)
    check('jsQR pas chargé au lancement', not jsqr_reqs and pg.evaluate("typeof window.jsQR") == 'undefined', jsqr_reqs)
    sw = open(os.path.join(REPO, 'sw.js'), encoding='utf-8').read()
    check('jsQR mis en cache par le service worker (hors connexion)', "'./js/jsqr.min.js'" in sw)

    url = pg.evaluate("(async () => programShareUrl(getActiveProgram()))()")
    pg.evaluate(CAMERA)
    pg.evaluate("delete window.BarcodeDetector")
    check('sans lecteur de Chrome : « Scanner un QR code » proposé', pg.evaluate("canScanQr()"))
    pg.evaluate("openReceiveProgram()"); pg.wait_for_timeout(300)
    check('bouton Scanner présent dans « Recevoir un programme »',
          pg.locator('.sheet').get_by_text('Scanner un QR code').count() == 1)

    # QR code qui n'est pas un programme : message, la caméra continue
    pg.evaluate("window.__qrText = 'https://example.com/pas-un-programme'")
    pg.click('.sheet .btn-secondary'); pg.wait_for_timeout(2500)
    check('jsQR chargé à l\'ouverture du scanner', len(jsqr_reqs) == 1 and pg.evaluate("typeof window.jsQR") == 'function', jsqr_reqs)
    check('QR étranger : « Ce QR code n\'est pas un programme. »',
          pg.inner_text('#qr-msg') == "Ce QR code n'est pas un programme.", pg.inner_text('#qr-msg') if pg.locator('#qr-msg').count() else '')

    # Le QR du programme est lu par jsQR
    pg.evaluate("u => { window.__qrText = u; }", url); pg.wait_for_timeout(2500)
    check('QR du programme lu par jsQR : « Programme reçu »',
          pg.locator('.sheet .sheet-title').count() and pg.inner_text('.sheet .sheet-title') == 'Programme reçu')
    check('caméra arrêtée après la lecture', pg.evaluate("window.__stopped") >= 1)
    pg.evaluate("closeSheet()"); pg.wait_for_timeout(200)

    # Deuxième ouverture : jsQR n'est pas rechargé
    pg.evaluate("window.__qrText = ''; window.__stopped = 0; openQrScanner()"); pg.wait_for_timeout(800)
    check('deuxième ouverture : jsQR non rechargé', len(jsqr_reqs) == 1, jsqr_reqs)
    pg.evaluate("closeSheet()"); pg.wait_for_timeout(200)
    check('Annuler arrête la caméra', pg.evaluate("window.__stopped") >= 1)

    # Caméra refusée : message, pas d'erreur
    pg.evaluate("navigator.mediaDevices.getUserMedia = async () => { throw new DOMException('refus', 'NotAllowedError'); }; openQrScanner()")
    pg.wait_for_timeout(600)
    check('caméra refusée : message « réglages du navigateur »', 'réglages du navigateur' in pg.inner_text('#qr-msg'))
    pg.evaluate("closeSheet()")
    check('aucune erreur JavaScript', not errs, errs)
    ctx.close()
    br.close()

print(f'\n {sum(res)} / {len(res)} contrôles OK')
sys.exit(0 if all(res) else 1)
