"""Agrandissement de l'interface (1.8.34) : 110 % dès 412 px de large (comme le zoom 110 % du navigateur), juste assez
en dessous pour garder 375 px utiles, jamais moins de 100 %. Vérifie, avec l'agrandissement réel de l'app :
  - la valeur appliquée selon la largeur (360, 384, 390, 412, 430 px) et après rotation ;
  - la page fait exactement la hauteur de l'écran (rien de coupé en bas), barre du bas à sa place ;
  - les zones de la caméra et de la barre système gardent leur taille réelle ;
  - aucun texte coupé ni débordement dans les écrans et fenêtres, barre du bas complète ;
  - graphiques nets (dessinés à la résolution agrandie) et appui sur une barre : la bonne valeur s'affiche ;
  - clair et sombre, aucune erreur JavaScript."""
import sys
from harness import Srv, newpage, sync_playwright, OVERFLOW_JS

res = []


def ok(n, c, extra=''):
    res.append(bool(c)); print(('OK   ' if c else 'FAIL ') + n, '' if c else str(extra)[:300])


ZOOM = "parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ui-zoom'))"
CUT = """()=>{const out=[];document.querySelectorAll('body *').forEach(e=>{if(e.offsetParent===null)return;
  if(getComputedStyle(e).textOverflow==='ellipsis'&&e.scrollWidth>e.clientWidth+1)out.push((e.textContent||'').trim().slice(0,30))});return out}"""
NAV = """()=>{const n=document.querySelector('nav').getBoundingClientRect();return [...document.querySelectorAll('nav button')]
  .filter(b=>{const r=b.getBoundingClientRect();return r.right>n.right-2||r.left<n.left+2}).map(b=>b.getAttribute('aria-label'))}"""
VIEWS = [('Programmes', "switchTab('programme')"),
         ('Éditeur', "editProgram(state.programs[0].id)"),
         ('Ajouter un exercice', "openAddExercise()"),
         ('Bouton +', "closeSheet(); setProgramView('home'); openProgramChooser()"),
         ('Séance', "closeSheet(); setProgramView('home'); switchTab('seance')"),
         ('Séance, exercices ouverts', "document.querySelectorAll('.ex-toggle').forEach(b=>{if(b.getAttribute('aria-expanded')!=='true')toggleExercise(b)})"),
         ('Progression', "switchTab('progression')"),
         ('Historique', "switchTab('historique')"),
         ("Détail d'une séance", "openSessionModal(state.history.length-1)"),
         ('Réglages', "document.querySelectorAll('.modal-overlay').forEach(m=>m.style.display='none'); switchTab('reglages')"),
         ('Invitation', "openInviteSheet()")]
ATTENDU = {360: 1, 384: 1.02, 390: 1.04, 412: 1.1, 430: 1.1}  # min(1,1 ; largeur / 374,5), arrondi au centième inférieur

with Srv() as url, sync_playwright() as p:
    br = p.chromium.launch()
    for scheme in ('light', 'dark'):
        for w, z in ATTENDU.items():
            h = 860
            ctx, pg, errs = newpage(br, w=w, h=h, pref=scheme, scheme=scheme, zoom=None)
            pg.goto(url + 'index.html'); pg.wait_for_timeout(700)
            t = f'[{scheme} {w}]'
            got = pg.evaluate(ZOOM)
            ok(f'{t} agrandissement {got}', abs(got - z) < 0.001, (got, z))
            g = pg.evaluate("""()=>{const b=document.body.getBoundingClientRect(),n=document.querySelector('nav').getBoundingClientRect();
                return [Math.round(b.height), innerHeight, Math.round(innerHeight-n.bottom)]}""")
            ok(f'{t} page à la hauteur exacte de l\'écran, barre du bas à {round(16*z)} px du bord', g[0] == g[1] and abs(g[2] - 16 * z) <= 1, g)
            safe = pg.evaluate("""()=>{const d=document.createElement('div');d.style.cssText='position:absolute;height:calc(40px / var(--ui-zoom))';
                document.body.appendChild(d);const r=d.getBoundingClientRect().height;d.remove();return Math.round(r)}""")
            ok(f'{t} zone de la caméra (40 px) gardée à sa taille réelle', safe == 40, safe)
            bad = []
            for n, js in VIEWS:
                pg.evaluate("(()=>{" + js + "})()"); pg.wait_for_timeout(350)
                bad += [n + ' : coupé ' + c for c in pg.evaluate(CUT)]
                o = pg.evaluate(OVERFLOW_JS)
                bad += [n + ' : déborde ' + c for c in o['out']] + ([n + ' : page plus large'] if o['docW'] > o['vw'] else [])
                if w * 1.0 / z >= 375:  # à 360 px, l'icône Historique dépasse déjà de la barre sans agrandissement (défaut connu, hors 1.8.34)
                    bad += [n + ' : barre du bas, sort : ' + c for c in pg.evaluate(NAV)]
            ok(f'{t} aucun texte coupé ni débordement ({len(VIEWS)} écrans), barre du bas complète', not bad, bad)
            if w == 412:
                pg.evaluate("closeSheet(); document.querySelectorAll('.modal-overlay').forEach(m=>m.style.display='none'); switchTab('progression')")
                pg.wait_for_timeout(700)
                c = pg.evaluate("""z=>{const ch=Chart.getChart('exerciseChart');const cv=ch.canvas;
                    return [cv.width, Math.round(cv.clientWidth*devicePixelRatio*z)]}""", got)
                ok(f'{t} graphique dessiné à la résolution agrandie (net)', abs(c[0] - c[1]) <= 2, c)
                pg.evaluate("document.getElementById('exerciseChart').scrollIntoView({block:'center'})"); pg.wait_for_timeout(300)
                pt = pg.evaluate("""z=>{const ch=Chart.getChart('exerciseChart');const m=ch.getDatasetMeta(0).data;const i=Math.floor(m.length/2);
                    const r=ch.canvas.getBoundingClientRect();return [i, r.left+m[i].x*z, r.top+m[i].y*z, m.length]}""", got)
                acts = []
                for k in (pt[0], 1, pt[3] - 2):  # milieu, début et fin du graphique (l'écart grandissait vers la droite)
                    q = pg.evaluate("""([z,i])=>{const ch=Chart.getChart('exerciseChart');const m=ch.getDatasetMeta(0).data[i];
                        const r=ch.canvas.getBoundingClientRect();return [r.left+m.x*z, r.top+m.y*z]}""", [got, k])
                    pg.mouse.click(q[0], q[1]); pg.wait_for_timeout(250)
                    acts.append((k, pg.evaluate("(Chart.getChart('exerciseChart').tooltip.getActiveElements()||[]).map(a=>a.index)")))
                ok(f'{t} appui sur un point du graphique (début, milieu, fin) : sa valeur s\'affiche', pt[3] > 3 and all(a and a[0] == k for k, a in acts), acts)
                pg.set_viewport_size({'width': h, 'height': w}); pg.wait_for_timeout(400)
                r = pg.evaluate("[" + ZOOM + ", Math.round(document.body.getBoundingClientRect().height), innerHeight]")
                ok(f'{t} rotation en paysage : 110 % et page à la hauteur de l\'écran', r[0] == 1.1 and r[1] == r[2], r)
            ok(f'{t} aucune erreur JavaScript', not errs, errs)
            ctx.close()
    br.close()
print(f"\n {sum(res)} / {len(res)} contrôles OK")
sys.exit(0 if all(res) else 1)
