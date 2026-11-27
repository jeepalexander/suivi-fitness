"""Téléchargements plus courts (1.8.102) : avec un vrai service worker et un serveur qui note chaque fichier demandé.
1. Première installation : l'app est prête avant la fin du téléchargement des icônes (arrière-plan),
   puis tout finit dans le cache (hors ligne complet).
2. Mise à jour : seuls les fichiers modifiés sont téléchargés, les autres sont repris de l'ancien cache.
3. Les empreintes écrites dans sw.js correspondent aux fichiers."""
import http.server, re, shutil, subprocess, sys, tempfile, threading, time
from pathlib import Path
from harness import *

res = []


def check(name, ok, extra=''):
    res.append(bool(ok))
    print(('OK   ' if ok else 'ÉCHEC'), name, extra)


def wait_for(pg, js, timeout=20000):
    fin = time.time() + timeout / 1000
    while time.time() < fin:
        try:
            if pg.evaluate(js):
                return True
        except Exception:
            pass
        time.sleep(0.25)
    return False


r = subprocess.run([sys.executable, str(REPO / 'tools' / 'empreintes.py'), '--verifier'], capture_output=True, text=True)
check('empreintes de sw.js à jour (sinon : python3 tools/empreintes.py)', r.returncode == 0, r.stdout.strip())

tmp = Path(tempfile.mkdtemp(prefix='sf_tel_'))
for item in REPO.iterdir():
    if item.name in ('.git', '.github', 'tests', '__pycache__'):
        continue
    (shutil.copytree if item.is_dir() else shutil.copy2)(item, tmp / item.name)
sw_txt = (tmp / 'sw.js').read_text(encoding='utf-8')
version = re.search(r"APP_VERSION = '([^']+)'", sw_txt).group(1)
assets = re.findall(r"'\./([^']*)'", re.search(r'const ASSETS = \[(.*?)\];', sw_txt, re.S).group(1))
icones = [a for a in assets if re.match(r'icons/(?!icon-192|apple-touch|bmc-tasse)', a)]

demandes, lent = [], {'on': True}


class Serveur(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=str(tmp), **k)

    def log_message(self, *a):
        pass

    def do_GET(self):
        chemin = self.path.split('?')[0].lstrip('/')
        demandes.append(chemin)
        if lent['on'] and chemin.startswith('icons/') and chemin.endswith('.webp'):
            time.sleep(0.15)  # réseau lent pour les icônes : l'app doit être prête avant elles
        return super().do_GET()


srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), Serveur)
threading.Thread(target=srv.serve_forever, daemon=True).start()
base = f'http://127.0.0.1:{srv.server_address[1]}/'
EN_CACHE = """(async()=>{const k=(await caches.keys()).find(n=>n.endsWith(':%s'));if(!k)return -1;const c=await caches.open(k);
let n=0;for(const u of %s){if(await c.match(u))n++;}return n;})()"""
liste = '[' + ','.join("'./%s'" % a for a in assets) + ']'
liste_icones = '[' + ','.join("'./%s'" % a for a in icones) + ']'
try:
    with sync_playwright() as p:
        br = p.chromium.launch()
        ctx, pg, errs = newpage(br, 390, 844, pref='light', sw='allow')
        pg.goto(base + 'index.html')
        pret = wait_for(pg, "navigator.serviceWorker.controller !== null")
        check('1re installation : service worker actif', pret)
        n_icones = pg.evaluate(EN_CACHE % (version, liste_icones))
        check(f'1re installation : prête avant la fin des icônes (arrière-plan) — {n_icones}/{len(icones)} au départ', 0 <= n_icones < len(icones))
        essentiels = [a for a in assets if not re.match(r'(icons/(?!icon-192|apple-touch|bmc-tasse)|wallpapers/(?!bienvenue|intro-debut))', a)]
        n_ess = pg.evaluate(EN_CACHE % (version, '[' + ','.join("'./%s'" % a for a in essentiels) + ']'))
        check(f'1re installation : tout l\'essentiel en cache dès le départ ({n_ess}/{len(essentiels)})', n_ess == len(essentiels))
        complet = wait_for(pg, (EN_CACHE % (version, liste)) + f" .then(n=>n==={len(assets)})", 60000)
        check(f'1re installation : les {len(assets)} fichiers finissent en cache (hors ligne complet)', complet,
              pg.evaluate(EN_CACHE % (version, liste)))
        check('1re installation : liste des empreintes rangée avec le cache',
              pg.evaluate(f"(async()=>{{const k=(await caches.keys()).find(n=>n.endsWith(':{version}'));return !!(await (await caches.open(k)).match('./__empreintes__.json'))}})()"))

        # --- Mise à jour : seul app.js change (plus sw.js, qui porte la version)
        lent['on'] = False
        (tmp / 'app.js').write_text((tmp / 'app.js').read_text(encoding='utf-8') + '\n// modif de test\n', encoding='utf-8')
        s = (tmp / 'sw.js').read_text(encoding='utf-8').replace(f"APP_VERSION = '{version}'", "APP_VERSION = '9.9.9'")
        (tmp / 'sw.js').write_text(s, encoding='utf-8')
        subprocess.run([sys.executable, str(tmp / 'tools' / 'empreintes.py')], check=True, capture_output=True)
        demandes.clear()
        pg.evaluate("navigator.serviceWorker.getRegistration().then(r=>r.update())")
        maj = wait_for(pg, "caches.keys().then(k=>k.some(n=>n.endsWith(':9.9.9')) && !k.some(n=>n.endsWith(':%s')))" % version, 30000)
        check('mise à jour : nouvelle version installée, ancien cache supprimé', maj)
        pg.wait_for_timeout(800)
        fichiers = sorted(set(d for d in demandes if d))
        check('mise à jour : seuls sw.js et app.js téléchargés', fichiers == ['app.js', 'sw.js'], fichiers)
        n = pg.evaluate(EN_CACHE % ('9.9.9', liste))
        check(f'mise à jour : les {len(assets)} fichiers sont dans le nouveau cache', n == len(assets), n)
        neuf = pg.evaluate("(async()=>{const k=(await caches.keys()).find(n=>n.endsWith(':9.9.9'));return (await (await (await caches.open(k)).match('./app.js')).text()).includes('modif de test')})()")
        check('mise à jour : app.js du cache = la version modifiée', neuf)
        check('aucune erreur JavaScript', not errs, errs[:3])
        br.close()
finally:
    srv.shutdown()
    shutil.rmtree(tmp, ignore_errors=True)

print(f"\n{sum(res)}/{len(res)} contrôles OK")
sys.exit(0 if all(res) else 1)
