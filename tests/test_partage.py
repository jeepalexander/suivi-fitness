"""1.7.52 : partager un programme (lien, QR code) et le recevoir (lien, menu +, scanner)."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from harness import *

ok = 0
def check(cond, msg):
    global ok
    assert cond, msg
    ok += 1

def run(br, base, scheme):
    ctx, pg, errs = newpage(br, 390, 844, pref=scheme)
    dialogs = []
    pg.on('dialog', lambda d: (dialogs.append(d.message), d.accept()))
    pg.goto(base + 'index.html'); pg.wait_for_timeout(900)
    pid = pg.evaluate("getActiveProgram().id")
    # Envoi : bouton dans l'éditeur d'un programme enregistré, absent à la création
    pg.evaluate("startProgramEditor('program')"); pg.wait_for_timeout(300)
    check(pg.locator('.ed-share').count() == 0, 'Partager visible à la création')
    pg.evaluate("setProgramView('home')")
    pg.evaluate(f"startProgramEditor('program','{pid}')"); pg.wait_for_timeout(400)
    check(pg.locator('.ed-share').count() == 1, 'bouton Partager absent')
    order = pg.evaluate("[...document.querySelector('.ed-footer').children].map(e=>e.className)")
    check(order.index('ed-share') < order.index('ed-delete'), order)
    pg.locator('.ed-share').scroll_into_view_if_needed(); pg.click('.ed-share'); pg.wait_for_timeout(300)
    check(pg.locator('.sheet .share-item').count() == 2, 'deux choix attendus')
    check('Carte' not in pg.locator('.sheet').inner_text(), 'carte image encore là')
    if scheme == 'light': pg.screenshot(path='/tmp/partage/t_choix.png')
    pg.click('.sheet .share-item >> nth=1'); pg.wait_for_timeout(400)
    url = pg.get_attribute('.sheet .invite-qr', 'data-url')
    check(url and '#prog=' in url and len(url) < 600, url)
    check(pg.locator('.sheet .invite-qr svg').count() == 1, 'QR absent')
    if scheme == 'light': pg.screenshot(path='/tmp/partage/t_qr.png')
    # Aller-retour : le programme décodé = le programme d'origine (séances, exercices, séries)
    same = pg.evaluate("""async (u) => { const p = getProgram('%s'); const d = await decodeProgram(shareCodeFrom(u));
      return d.name === p.name && JSON.stringify(d.sessions.map(s => [s.key, s.name, s.exercises.map(e => [e.exId, e.sets])])) ===
        JSON.stringify(p.sessions.map(s => [s.key, s.name, s.exercises.map(e => [e.exId, e.sets || 3])])); }""" % pid, url)
    check(same, 'aller-retour différent')
    # Codes refusés : abîmé, exercice inconnu, trop long
    bad = pg.evaluate("""async () => [await decodeProgram('abc'), await decodeProgram('x'.repeat(5000)),
      await decodeProgram(await encodeProgram({ name: 'X', kind: 'program', sessions: [{ key: 'A', name: 'A', exercises: [{ exId: 99999, sets: 3 }] }] }))]""")
    check(bad == [None, None, None], bad)
    pg.evaluate("closeSheet(); setProgramView('home')")
    # Réception par le lien : ouverture de l'app avec #prog=
    n0 = pg.evaluate("getPrograms().length")
    pg.goto(url); pg.wait_for_timeout(1300)
    check(pg.locator('.sheet .sheet-title').inner_text() == 'Programme reçu', 'fenêtre de réception absente')
    check('#prog=' not in pg.evaluate("location.href"), 'code resté dans l’adresse')
    check(pg.locator('.sheet .miss-row').count() == pg.evaluate(f"getProgram('{pid}').sessions.length"), 'séances')
    if scheme == 'light': pg.screenshot(path='/tmp/partage/t_recu.png')
    pg.click('#recv-add'); pg.wait_for_timeout(500)
    progs = pg.evaluate("getPrograms().map(p => [p.name, p.status, !!p.receivedAt])")
    check(len(progs) == n0 + 1 and progs[-1][1] == 'new' and progs[-1][2] and progs[-1][0].endswith('(2)'), progs)
    check(pg.evaluate(f"getActiveProgram().id") == pid, 'programme actif changé')
    check('Reçu' in pg.locator('.mem-tile').last.inner_text(), 'mention Reçu absente')
    if scheme == 'light': pg.screenshot(path='/tmp/partage/t_memoire.png')
    # Menu + : Recevoir un programme (coller le lien)
    pg.evaluate("openProgramChooser()"); pg.wait_for_timeout(300)
    check(pg.locator('.choose-recv').count() == 1, 'Recevoir absent du menu +')
    pg.locator('.choose-recv').scroll_into_view_if_needed(); pg.click('.choose-recv'); pg.wait_for_timeout(300)
    check(pg.locator('#recv-url').count() == 1, 'champ du lien absent')
    check(pg.locator('.sheet').get_by_text('Scanner un QR code').count() == 0, 'scanner proposé sans lecteur')
    pg.fill('#recv-url', 'bonjour'); pg.click('.sheet .btn >> nth=0'); pg.wait_for_timeout(300)
    check(any('Lien illisible' in d for d in dialogs), dialogs)
    pg.fill('#recv-url', 'Regarde mon programme : ' + url); pg.click('.sheet .btn >> nth=0'); pg.wait_for_timeout(500)
    check(pg.locator('.sheet .sheet-title').inner_text() == 'Programme reçu', 'collage refusé')
    pg.evaluate("closeSheet()")
    # Scanner : lecteur de Chrome simulé (caméra et BarcodeDetector)
    pg.evaluate("""(u) => { window.__stopped = 0;
      window.BarcodeDetector = class { constructor() {} async detect() { return window.__seen ? [{ rawValue: u }] : []; } };
      navigator.mediaDevices.getUserMedia = async () => { const c = document.createElement('canvas'); c.width = 64; c.height = 64; c.getContext('2d').fillRect(0,0,64,64);
        const s = c.captureStream(5); s.getTracks().forEach(t => { const o = t.stop.bind(t); t.stop = () => { window.__stopped++; o(); }; }); return s; }; }""", url)
    pg.evaluate("openReceiveProgram()"); pg.wait_for_timeout(200)
    check(pg.locator('.sheet .btn-secondary').inner_text() == 'Scanner un QR code', 'bouton Scanner absent'); pg.click('.sheet .btn-secondary'); pg.wait_for_timeout(600)
    check(pg.locator('#qr-video').count() == 1, 'vidéo absente')
    if scheme == 'dark': pg.screenshot(path='/tmp/partage/t_scan.png')
    pg.evaluate("window.__seen = true"); pg.wait_for_timeout(700)
    check(pg.locator('.sheet .sheet-title').inner_text() == 'Programme reçu', 'QR non lu')
    check(pg.evaluate("window.__stopped") >= 1, 'caméra pas arrêtée')
    pg.evaluate("closeSheet()")
    # Annuler le scanner arrête la caméra
    pg.evaluate("window.__seen = false; window.__stopped = 0; openQrScanner()"); pg.wait_for_timeout(500)
    pg.evaluate("closeSheet()"); pg.wait_for_timeout(100)
    check(pg.evaluate("window.__stopped") >= 1, 'caméra active après Annuler')
    # Séance libre : aller-retour
    lib = pg.evaluate("""async () => { const p = { name: 'Dorsaux', kind: 'libre', sessions: [{ key: '', name: 'Dorsaux', exercises: [{ exId: getProgram('%s').sessions[0].exercises[0].exId, sets: 4 }] }] };
      const d = await decodeProgram(await encodeProgram(p)); return [d.kind, d.sessions.length, d.sessions[0].exercises[0].sets]; }""" % pid)
    check(lib == ['libre', 1, 4], lib)
    over = pg.evaluate(OVERFLOW_JS)
    check(not over['out'], over)
    check(not errs, errs)
    ctx.close()

if __name__ == '__main__':
    os.makedirs('/tmp/partage', exist_ok=True)
    with Srv() as base, sync_playwright() as p:
        br = p.chromium.launch()
        for s in ('light', 'dark'): run(br, base, s)
    print(f'{ok} / {ok} contrôles OK')
