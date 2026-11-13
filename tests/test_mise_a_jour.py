"""Indicateur de mise à jour : avec un vrai service worker, une nouvelle version déclenche l'avis
« version prête » SANS recharger la page ; le bouton relance et la saisie en cours est conservée."""
import re, shutil, subprocess, sys, tempfile, time
from pathlib import Path
from harness import *

res = []


def check(name, ok, extra=''):
    res.append(ok)
    print(('OK   ' if ok else 'ÉCHEC'), name, extra)


def wait_for(pg, js, timeout=15000):
    """Interroge la page jusqu'à ce que l'expression soit vraie (wait_for_function est bloqué par la CSP de l'application)."""
    fin = time.time() + timeout / 1000
    while time.time() < fin:
        try:
            if pg.evaluate(js):
                return True
        except Exception:
            pass
        time.sleep(0.25)
    return False


# Copie jetable du dépôt : on y simule une nouvelle version en modifiant sw.js et manifest.json
tmp = Path(tempfile.mkdtemp(prefix='sf_maj_'))
for item in REPO.iterdir():
    if item.name in ('.git', '.github', 'tests', '__pycache__'):
        continue
    (shutil.copytree if item.is_dir() else shutil.copy2)(item, tmp / item.name)
version = re.search(r"APP_VERSION = '([^']+)'", (tmp / 'sw.js').read_text(encoding='utf-8')).group(1)

port = free_port = __import__('harness')._free_port()
srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(port), '--bind', '127.0.0.1'], cwd=tmp,
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
base = f'http://127.0.0.1:{port}/'
try:
    with sync_playwright() as p:
        br = p.chromium.launch()
        ctx, pg, errs = newpage(br, 390, 844, pref='light', sw='allow')
        pg.goto(base + 'index.html')
        ok = wait_for(pg, "navigator.serviceWorker.controller !== null")
        check('service worker installé et actif', ok)
        pg.wait_for_timeout(600)
        check(f'version exécutée affichée dans Historique ({version})', pg.inner_text('#update-version') == f'Version {version}', pg.inner_text('#update-version'))
        check('titre de l\'en-tête : sans numéro de version (il est dans Réglages)', pg.inner_text('#app-title').strip() == 'MON CARNET DE SALLE')
        check('première installation : aucun avis de mise à jour', pg.evaluate("document.getElementById('update-banner').hidden") is True and not pg.evaluate("document.getElementById('nav-historique').classList.contains('has-update')"))

        # vérification sans nouvelle version
        pg.evaluate("switchTab('reglages')"); pg.wait_for_timeout(300)
        pg.click('.update-check')
        ok = wait_for(pg, "document.getElementById('update-status').textContent.startsWith('À jour')", 8000)
        check('« Vérifier » sans nouvelle version : « À jour · vérifié à hh:mm »', ok, pg.inner_text('#update-status'))
        check('toujours aucun avis', pg.evaluate("document.getElementById('update-banner').hidden") is True)

        # saisie en cours + témoin pour prouver qu'aucun rechargement n'a lieu
        pg.evaluate("switchTab('progression')"); pg.fill('#new-weight', '70.2'); pg.wait_for_timeout(150)
        pg.evaluate("window.__temoin = 12345")

        # nouvelle version publiée : sw.js et manifest.json changent
        sw = (tmp / 'sw.js').read_text(encoding='utf-8').replace(f"APP_VERSION = '{version}'", "APP_VERSION = '9.9.9'")
        (tmp / 'sw.js').write_text(sw, encoding='utf-8')
        mf = (tmp / 'manifest.json').read_text(encoding='utf-8').replace(f'"version": "{version}"', '"version": "9.9.9"')
        (tmp / 'manifest.json').write_text(mf, encoding='utf-8')

        pg.evaluate("switchTab('reglages')"); pg.wait_for_timeout(200)
        pg.click('.update-check')
        ok = wait_for(pg, "document.getElementById('update-banner').hidden === false", 20000)
        check('nouvelle version installée : avis « prête » affiché', ok)
        txt = pg.inner_text('#update-banner-text')
        check('l\'avis cite la nouvelle version (9.9.9)', '9.9.9' in txt, txt)
        check('pastille sur l\'icône Historique + libellé d\'accessibilité', pg.evaluate("document.getElementById('nav-historique').classList.contains('has-update')") and 'mise à jour' in pg.evaluate("document.getElementById('nav-historique').getAttribute('aria-label')"))
        check('la page affiche toujours la version exécutée (pas 9.9.9)', pg.inner_text('#update-version') == f'Version {version}', pg.inner_text('#update-version'))
        check('AUCUN rechargement automatique (témoin conservé)', pg.evaluate("window.__temoin") == 12345)
        pg.evaluate("switchTab('progression')")
        check('saisie en cours intacte (poids corporel)', pg.input_value('#new-weight') == '70.2')

        # bouton « Relancer maintenant » : la page recharge, nouvelle version, saisie conservée par le brouillon
        pg.evaluate("switchTab('reglages')"); pg.wait_for_timeout(200)
        pg.click('.update-apply'); pg.wait_for_timeout(1800)
        check('après relance : version 9.9.9 en service', wait_for(pg, "document.getElementById('update-version').textContent==='Version 9.9.9'", 8000), pg.inner_text('#update-version'))
        check('après relance : plus d\'avis', pg.evaluate("document.getElementById('update-banner').hidden") is True and not pg.evaluate("document.getElementById('nav-historique').classList.contains('has-update')"))
        pg.evaluate("switchTab('progression')")
        check('après relance : poids saisi restauré par le brouillon', pg.input_value('#new-weight') == '70.2', pg.input_value('#new-weight'))
        check('aucune erreur JS', not errs, str(errs))

        # serveur injoignable (équivalent d'une coupure réseau) : message clair, pas de fausse alerte
        srv.terminate(); srv.wait(); time.sleep(0.5)
        pg.evaluate("switchTab('reglages')"); pg.click('.update-check'); pg.wait_for_timeout(1500)
        st = pg.inner_text('#update-status')
        check('réseau coupé : « Vérification impossible », sans fausse alerte', 'impossible' in st and pg.evaluate("document.getElementById('update-banner').hidden") is True, st)
        ctx.close(); br.close()
finally:
    srv.terminate()
    shutil.rmtree(tmp, ignore_errors=True)
print('\n', sum(res), '/', len(res), 'contrôles OK')
sys.exit(0 if all(res) else 1)
