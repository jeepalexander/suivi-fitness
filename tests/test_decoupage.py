"""Garde-fou du découpage du code en plusieurs fichiers (1.8.90, co-auteur : Claude).

Tous les scripts de l'app partagent les mêmes noms globaux. Après un déplacement de code d'un fichier à l'autre,
on vérifie :
  1. que chaque script de index.html est mis en cache par sw.js (sinon l'app ne s'ouvre plus hors ligne) ;
  2. qu'aucun nom global (fonction, const, let, var) n'est défini dans deux fichiers (le dernier chargé gagnerait) ;
  3. qu'à l'ouverture de l'app, aucune erreur JavaScript n'apparaît (un nom utilisé avant d'être chargé en donnerait) ;
  4. que chaque fonction appelée par un bouton (onclick, onchange…, dans index.html ou dans le HTML écrit par le
     JavaScript) existe bien une fois l'app ouverte."""
import re, sys
from harness import REPO, Srv, newpage, sync_playwright

res = []


def ok(nom, cond, extra=''):
    res.append(bool(cond))
    print(('OK   ' if cond else 'FAIL ') + nom, extra if not cond else '')


html = (REPO / 'index.html').read_text(encoding='utf-8')
sw = (REPO / 'sw.js').read_text(encoding='utf-8')
scripts = [s for s in re.findall(r'<script src="([^"]+)"', html) if not s.startswith('http')]
assets = set(re.findall(r"'\./([^']+)'", sw))

# 1. Cache hors ligne
manquants = [s for s in scripts if s not in assets]
ok(f"les {len(scripts)} scripts de index.html sont dans le cache hors ligne (sw.js)", not manquants, manquants)
js_dossier = sorted('js/' + p.name for p in (REPO / 'js').glob('*.js'))
ok("chaque fichier de js/ est dans le cache hors ligne", all(f in assets for f in js_dossier),
   [f for f in js_dossier if f not in assets])

# 2. Noms globaux en double (déclarations en début de ligne, hors bibliothèques minifiées)
propres = [s for s in scripts if not s.endswith('.min.js') and s != 'js/qrcode.js']
vus, doublons = {}, []
for f in propres:
    src = (REPO / f).read_text(encoding='utf-8')
    for m in re.finditer(r'^(?:async\s+)?function\s*\*?\s*([\w$]+)|^(?:const|let|var)\s+([\w$]+)', src, re.M):
        nom = m.group(1) or m.group(2)
        if nom in vus and vus[nom] != f:
            doublons.append(f'{nom} ({vus[nom]} et {f})')
        vus.setdefault(nom, f)
ok(f"aucun nom global défini dans deux fichiers ({len(vus)} noms, {len(propres)} fichiers)", not doublons, doublons)

# 4 (préparation). Fonctions appelées par les attributs on…="…" de index.html et du HTML écrit par le JavaScript
MOTS = {'if', 'return', 'function', 'typeof', 'new', 'void', 'await'}
appels = set()
for f in ['index.html'] + propres:
    src = (REPO / f).read_text(encoding='utf-8')
    for val in re.findall(r'\bon[a-z]+=\\?["\']([^"\'\\]*)', src):
        appels |= {n for n in re.findall(r'(?<![\w.$])([A-Za-z_$][\w$]*)\s*\(', val) if n not in MOTS}

with Srv() as base, sync_playwright() as p:
    br = p.chromium.launch()
    for scheme in ('light', 'dark'):
        ctx, pg, errs = newpage(br, scheme=scheme, pref=scheme)
        pg.goto(base + 'index.html'); pg.wait_for_timeout(1200)
        # 3. Ouverture sans erreur
        ok(f"[{scheme}] ouverture de l'app sans erreur JavaScript", not errs, errs[:3])
        ok(f"[{scheme}] l'app a démarré (données chargées, Programmes affiché)",
           pg.evaluate("typeof state === 'object' && state !== null && document.body.dataset.tab === 'programme'"))
        if scheme == 'light':
            # 4. Fonctions des boutons
            absentes = pg.evaluate("(noms) => noms.filter(n => typeof window[n] !== 'function')", sorted(appels))
            ok(f"les {len(appels)} fonctions appelées par les boutons existent", not absentes, absentes)
        ctx.close()
    br.close()

print(f"\n{sum(res)} / {len(res)} contrôles OK")
sys.exit(0 if all(res) else 1)
