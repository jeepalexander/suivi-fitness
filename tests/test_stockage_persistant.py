"""1.8.26 : au lancement, l'app demande à Chrome un stockage « persistant » (navigator.storage.persist), sans rien
afficher. Demande faite une seule fois si besoin, pas de demande si c'est déjà accordé, aucune erreur sans l'API,
données intactes, et rien de nouveau à l'écran dans les Réglages."""
import sys
from harness import *

res = []


def check(name, ok, extra=''):
    res.append(bool(ok))
    print(('OK   ' if ok else 'ÉCHEC'), name, extra)


# Remplace navigator.storage par un faux qui note les appels ; granted = déjà accordé avant le lancement
def fake(granted, persist_answer=True):
    return """(()=>{window.__persistCalls=0;window.__persistedCalls=0;
      const g=%s;
      Object.defineProperty(navigator,'storage',{configurable:true,value:{
        persisted(){window.__persistedCalls++;return Promise.resolve(g)},
        persist(){window.__persistCalls++;return Promise.resolve(%s)},
        estimate(){return Promise.resolve({usage:0,quota:1e9})}}});})();""" % (
        'true' if granted else 'false', 'true' if persist_answer else 'false')


with Srv() as base, sync_playwright() as p:
    br = p.chromium.launch()

    # 1. Pas encore accordé : une seule demande au lancement
    ctx, pg, errs = newpage(br, pref='light')
    pg.add_init_script(fake(False))
    pg.goto(base + 'index.html'); pg.wait_for_timeout(900)
    check('pas encore accordé : persist() demandé une fois au lancement',
          pg.evaluate("window.__persistedCalls") == 1 and pg.evaluate("window.__persistCalls") == 1,
          (pg.evaluate("window.__persistedCalls"), pg.evaluate("window.__persistCalls")))
    check('données de l\'usager intactes', pg.evaluate("state.history.length") > 0)
    pg.evaluate("switchTab('reglages')"); pg.wait_for_timeout(300)
    txt = pg.inner_text('#tab-reglages')
    check('rien d\'affiché dans les Réglages (ni « protégées » ni « persistant »)',
          'protég' not in txt and 'persistant' not in txt)
    check('aucune erreur JavaScript', not errs, errs)
    ctx.close()

    # 2. Déjà accordé : aucune nouvelle demande
    ctx, pg, errs = newpage(br, pref='light')
    pg.add_init_script(fake(True))
    pg.goto(base + 'index.html'); pg.wait_for_timeout(900)
    check('déjà accordé : aucune nouvelle demande', pg.evaluate("window.__persistCalls") == 0)
    ctx.close()

    # 3. Refusé par Chrome : rien ne casse
    ctx, pg, errs = newpage(br, pref='light')
    pg.add_init_script(fake(False, persist_answer=False))
    pg.goto(base + 'index.html'); pg.wait_for_timeout(900)
    check('refusé : l\'app démarre normalement, sans erreur',
          pg.evaluate("document.body.dataset.tab") == 'programme' and not errs, errs)
    ctx.close()

    # 4. Navigateur sans l'API : aucune erreur
    ctx, pg, errs = newpage(br, pref='light')
    pg.add_init_script("Object.defineProperty(navigator,'storage',{configurable:true,value:undefined});")
    pg.goto(base + 'index.html'); pg.wait_for_timeout(900)
    check('sans navigator.storage : l\'app démarre, aucune erreur',
          pg.evaluate("document.body.dataset.tab") == 'programme' and not errs, errs)
    check('sans navigator.storage : la fonction répond sans planter',
          pg.evaluate("requestPersistentStorage().then(r=>r===null)"))
    ctx.close()

    # 5. Vrai Chromium (sans faux) : l'appel aboutit
    ctx, pg, errs = newpage(br, pref='light')
    pg.goto(base + 'index.html'); pg.wait_for_timeout(900)
    r = pg.evaluate("requestPersistentStorage().then(v=>typeof v)")
    check('vrai Chromium : la demande aboutit (oui ou non, sans erreur)', r == 'boolean' and not errs, (r, errs))
    ctx.close()
    br.close()

print(f'\n {sum(res)} / {len(res)} contrôles OK')
sys.exit(0 if all(res) else 1)
