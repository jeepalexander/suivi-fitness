"""Tour rapide de tous les écrans (1.8.87, co-auteur : Claude) : chaque écran de harness.ECRANS s'ouvre, n'a rien
qui déborde et ne produit aucune erreur JavaScript, à 390 et 360 px, en clair et en sombre.

C'est le test de base lancé à chaque modification du code (run_tests.py --auto) ; il vérifie aussi que la liste
des écrans utilisée par les autres tests et par tools/captures.py reste à jour."""
import sys
from harness import Srv, newpage, sync_playwright, ECRANS, ouvrir, debordements, Bilan, variantes

b = Bilan()
with Srv() as url, sync_playwright() as p:
    br = p.chromium.launch()
    for w, th in variantes():
        ctx, pg, errs = newpage(br, w=w, scheme=th, pref=th)
        pg.goto(url); pg.wait_for_timeout(600)
        for nom in ECRANS:
            avant = len(errs)
            try:
                ouvrir(pg, nom)
            except Exception as e:  # un écran qui ne s'ouvre plus : la liste ECRANS est à mettre à jour
                b.ok(f'{w} px, {th} : « {nom} » s\'ouvre', False, e); continue
            pb = debordements(pg)
            b.ok(f'{w} px, {th} : « {nom} » sans débordement ni erreur', not pb and len(errs) == avant, pb + errs[avant:])
        ctx.close()
    br.close()
sys.exit(b.fin())
