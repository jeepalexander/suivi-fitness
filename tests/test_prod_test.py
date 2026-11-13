"""Production (main, à la racine) et version de test (dev, dans dev/) publiées ensemble (1.7.64) :
site assemblé par tools/assembler_site.py, invitations et programmes partagés depuis la version de test
dirigés vers la production, manifeste « TEST », caches des service workers séparés par dossier."""
import os, subprocess, sys, tempfile, time
from harness import REPO, _free_port, newpage, sync_playwright

res = []


def ok(n, c, extra=''):
    res.append(bool(c)); print(('OK   ' if c else 'FAIL ') + n, '' if c else str(extra)[:200])


site = os.path.join(tempfile.mkdtemp(), 'site')
subprocess.run([sys.executable, os.path.join(REPO, 'tools', 'assembler_site.py'), REPO, REPO, site], check=True, capture_output=True)
ok('site assemblé : production à la racine, test dans dev/, sans les tests',
   os.path.exists(os.path.join(site, 'index.html')) and os.path.exists(os.path.join(site, 'dev', 'index.html'))
   and not os.path.exists(os.path.join(site, 'tests')) and not os.path.exists(os.path.join(site, 'dev', 'tests'))
   and os.path.exists(os.path.join(site, '.nojekyll')))
port = _free_port()
srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(port), '--bind', '127.0.0.1'], cwd=site,
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
base = f'http://127.0.0.1:{port}/'
try:
    with sync_playwright() as p:
        br = p.chromium.launch()
        # --- Liens
        ctx, pg, errs = newpage(br)
        pg.goto(base + 'index.html'); pg.wait_for_timeout(500)
        ok('production : pas de mention de test, invitation vers la production', pg.evaluate("!isTestVersion() && appShareUrl()") == base)
        pg.goto(base + 'dev/index.html'); pg.wait_for_timeout(500)
        ok('test : reconnue comme version de test', pg.evaluate("isTestVersion()"))
        ok('test : « Inviter quelqu\'un » mène à la production', pg.evaluate("appShareUrl()") == base, pg.evaluate("appShareUrl()"))
        link = pg.evaluate("programShareUrl(getActiveProgram())")
        ok('test : un programme partagé s\'ouvre dans la production', link.startswith(base + '#prog='), link[:80])
        pg.goto(base + 'dev/'); pg.wait_for_timeout(400)
        ok('test (adresse sans index.html) : reconnue, liens vers la production', pg.evaluate("isTestVersion() && appShareUrl()") == base)
        m1 = pg.evaluate("fetch('%smanifest.json').then(r=>r.json())" % base)
        m2 = pg.evaluate("fetch('%sdev/manifest.json').then(r=>r.json())" % base)
        ok('manifestes : « Mon Carnet » en production, « Carnet TEST » pour le test, même version',
           m1['short_name'] == 'Mon Carnet' and m2['short_name'] == 'Carnet TEST' and m2['name'].endswith('(TEST)') and m1['version'] == m2['version'], (m1['short_name'], m2['short_name']))
        ok('aucune erreur JavaScript (liens)', not errs, errs)
        ctx.close()

        # --- Service workers : un par dossier, caches séparés, anciens caches sans dossier supprimés
        ctx, pg, errs = newpage(br, sw='allow')
        pg.goto(base + 'index.html'); pg.wait_for_timeout(300)
        pg.evaluate("caches.open('suivi-fitness-1.7.50').then(c=>c.put('/x', new Response('x')))")
        pg.evaluate("navigator.serviceWorker.ready"); pg.wait_for_timeout(1500)
        pg.goto(base + 'dev/index.html'); pg.wait_for_timeout(300)
        pg.evaluate("navigator.serviceWorker.ready"); pg.wait_for_timeout(1500)
        pg.reload(); pg.wait_for_timeout(800)
        sw_dev = pg.evaluate("navigator.serviceWorker.controller && navigator.serviceWorker.controller.scriptURL")
        ok('test : contrôlée par son propre service worker (dev/sw.js)', sw_dev == base + 'dev/sw.js', sw_dev)
        pg.goto(base + 'index.html'); pg.wait_for_timeout(800)
        sw_prod = pg.evaluate("navigator.serviceWorker.controller && navigator.serviceWorker.controller.scriptURL")
        ok('production : contrôlée par sw.js à la racine', sw_prod == base + 'sw.js', sw_prod)
        keys = pg.evaluate("caches.keys()")
        prod_c = [k for k in keys if k.startswith('suivi-fitness:/:')]
        dev_c = [k for k in keys if k.startswith('suivi-fitness:/dev/:')]
        ok('deux caches, un par dossier, qui coexistent', len(prod_c) == 1 and len(dev_c) == 1, keys)
        ok('ancien cache sans dossier (avant 1.7.64) supprimé', 'suivi-fitness-1.7.50' not in keys, keys)
        n = pg.evaluate("caches.open(%r).then(c=>c.keys()).then(k=>k.filter(r=>new URL(r.url).pathname.startsWith('/dev/')).length)" % prod_c[0]) if prod_c else -1
        ok('le cache de la production ne contient aucun fichier de dev/', n == 0, n)
        ok('aucune erreur JavaScript (service workers)', not errs, errs)
        ctx.close()
        br.close()
finally:
    srv.terminate()
print(f"\n {sum(res)} / {len(res)} contrôles OK")
sys.exit(0 if all(res) else 1)
