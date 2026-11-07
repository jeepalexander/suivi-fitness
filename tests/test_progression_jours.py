"""Progression : onglet renommé ; bascule « par jour » du graphique global (écarts entre séances, défilement horizontal)."""
import json, sys
from datetime import date, timedelta
from harness import *

res = []


def check(name, ok, extra=''):
    ok = bool(ok); res.append(ok)
    print(('OK   ' if ok else 'ÉCHEC'), name, str(extra)[:230])


today = date.today()
days = [today - timedelta(days=d) for d in (70, 66, 59, 52, 40, 12)]  # 6 séances, grands écarts
seed = [{"id": 100 + i, "date": d.isoformat(), "type": 'ABC'[i % 3], "isDeload": False, "tonnage": 1000 + 100 * i, "duration": "40 min",
         "exercises": [{"name": "Presse à cuisses", "sets": [{"weight": 100, "reps": 10}], "maxWeight": 100, "totalVolume": 1000}]} for i, d in enumerate(days)]
N_DAYS = 70 + 1  # de la 1re séance à aujourd'hui inclus

with Srv() as base, sync_playwright() as p:
    br = p.chromium.launch()
    ctx, pg, errs = newpage(br, 390, 844, pref='light')
    pg.add_init_script("if(!localStorage.getItem('seeded')){localStorage.setItem('h49_state', %s);localStorage.setItem('seeded','1')}" % json.dumps(json.dumps({"nextType": "A", "history": seed, "weights": [], "lastWeights": {}})))
    pg.goto(base + 'index.html'); pg.wait_for_timeout(900)
    check("onglet renommé « Progression » (barre de navigation)", 'Progression' in pg.inner_text('#nav-progression') and 'Graphiques' not in pg.inner_text('#nav-progression'))
    pg.evaluate("switchTab('progression')"); pg.wait_for_timeout(600)
    check("titre de l'écran : « Progression »", pg.inner_text('h1, #page-title, .page-title').strip().lower().startswith('progression') if pg.evaluate("!!document.querySelector('h1, #page-title, .page-title')") else True)
    check("bouton-icône (courbe sur règle graduée) en haut à droite de la tuile", pg.evaluate("document.querySelectorAll('#btn-vol-calendar svg').length") == 1 and pg.inner_text('#btn-vol-calendar').strip() == '' and pg.evaluate("(()=>{const b=document.getElementById('btn-vol-calendar').getBoundingClientRect(),c=document.querySelector('.hero-card').getBoundingClientRect();return b.right<=c.right&&b.top-c.top<30&&c.right-b.right<30})()"))
    n = lambda: pg.evaluate("tonnageChart.data.labels.length")
    check("vue actuelle : un point par séance (6)", n() == 6, n())

    pg.click('#btn-vol-calendar'); pg.wait_for_timeout(500)
    ds = pg.evaluate("tonnageChart.data.datasets[0].data")
    check(f"vue « par jour » : {N_DAYS} jours (1re séance -> aujourd'hui)", n() == N_DAYS, n())
    check("6 jours avec séance, les autres vides (null)", sum(v is not None for v in ds) == 6 and sum(v is None for v in ds) == N_DAYS - 6, str(ds[:12]))
    check("jours reliés entre eux (spanGaps)", pg.evaluate("tonnageChart.data.datasets[0].spanGaps") is True)
    check("bouton pressé en vue par jour (libellé accessible « Revenir… »)", pg.get_attribute('#btn-vol-calendar', 'aria-pressed') == 'true' and 'Revenir' in pg.get_attribute('#btn-vol-calendar', 'aria-label'))
    sc = pg.evaluate("(()=>{const w=document.getElementById('hero-scroll');return [w.scrollWidth,w.clientWidth,w.scrollLeft]})()")
    check("graphique défilable horizontalement, ouvert sur les séances les plus récentes", sc[0] > sc[1] + 200 and abs(sc[2] - (sc[0] - sc[1])) <= 2, sc)
    pg.evaluate("document.getElementById('hero-scroll').scrollLeft = 0"); pg.wait_for_timeout(200)
    check("on remonte dans le temps en défilant vers la gauche", pg.evaluate("document.getElementById('hero-scroll').scrollLeft") == 0)
    pg.screenshot(path='/tmp/claude-0/prog_jours.png', clip={'x': 0, 'y': 80, 'width': 390, 'height': 480})
    ya = lambda: pg.evaluate("(()=>{const r=document.getElementById('hero-yaxis').getBoundingClientRect();return [Math.round(r.left),Math.round(r.top),document.getElementById('hero-yaxis').classList.contains('on'),[...document.querySelectorAll('#hero-yaxis span')].map(x=>x.textContent)]})()")
    a0 = ya()
    nt = pg.evaluate("tonnageChart.scales.y.ticks.length")
    check("axe vertical fixe affiché avec ses graduations (≥ 3, une par graduation du graphique)", a0[2] and len(a0[3]) >= 3 and len(a0[3]) == nt, (a0, nt))
    check("graduations calées dans la hauteur du graphique", pg.evaluate("[...document.querySelectorAll('#hero-yaxis span')].every(s=>parseFloat(s.style.top)>=0&&parseFloat(s.style.top)<=210)"))
    pg.evaluate("document.getElementById('hero-scroll').scrollLeft = 300"); pg.wait_for_timeout(200)
    check("l'axe vertical ne bouge pas quand le graphique défile", ya() == a0, (a0, ya()))
    pg.evaluate("document.getElementById('hero-scroll').scrollLeft = 0")
    px = pg.evaluate("document.getElementById('hero-scroll-inner').offsetWidth") / N_DAYS
    check("échelle resserrée : ~9 px par jour (au lieu de 26)", 8 <= px <= 10, px)
    check("aucune erreur JS", not errs, errs)

    # filtres : séance A seule en vue par jour
    pg.click('#btn-vol-type'); pg.wait_for_timeout(400)
    ds = pg.evaluate("tonnageChart.data.datasets[0].data")
    check("filtre A/B/C en vue par jour : seulement les séances A (2) avec les mêmes jours", sum(v is not None for v in ds) == 2 and pg.get_attribute('#btn-vol-calendar', 'aria-pressed') == 'true', sum(v is not None for v in ds))
    # « Par mois » quitte la vue par jour
    pg.click('.hero-card .filter-group .filter-btn:nth-child(3)'); pg.wait_for_timeout(400)
    check("« Par mois » : retour à la vue par séance/mois (pas de défilement)", pg.get_attribute('#btn-vol-calendar', 'aria-pressed') == 'false' and not pg.evaluate("document.getElementById('hero-scroll').classList.contains('scrollable')"))
    # bascule depuis « Par mois » : repasse en vue par séance puis par jour
    pg.click('#btn-vol-calendar'); pg.wait_for_timeout(400)
    check("« Par jour » depuis « Par mois » : bascule en vue par jour", n() == N_DAYS and pg.evaluate("document.querySelector('.hero-card .filter-btn.active').textContent.trim()") == 'Séances', pg.evaluate("document.querySelector('.hero-card .filter-btn.active').textContent"))
    pg.click('#btn-vol-calendar'); pg.wait_for_timeout(400)
    check("retour « Par séance » : axe vertical fixe masqué, graduations du graphique visibles", not pg.evaluate("document.getElementById('hero-yaxis').classList.contains('on')") and pg.evaluate("tonnageChart.options.scales.y.ticks.display") is True)
    check("retour « Par séance » : graphique d'origine (6 points) sans défilement", n() == 6 and not pg.evaluate("document.getElementById('hero-scroll').classList.contains('scrollable')") and pg.evaluate("document.getElementById('hero-scroll-inner').style.width") == '')
    # boutons : ordre Séances, A / B / C, Mois (renommé)
    check("boutons dans l'ordre « Séances », « A / B / C », « Mois »", pg.evaluate("[...document.querySelectorAll('.hero-card .filter-group .filter-btn')].map(b=>b.textContent.trim()).join('|')") == 'Séances|A / B / C|Mois')

    # hauteur du graphique et de l'axe identiques dans tous les modes
    geo = lambda: pg.evaluate("(()=>{const c=tonnageChart,a=c.chartArea;return [Math.round(c.canvas.getBoundingClientRect().height),Math.round(a.top),Math.round(a.bottom)]})()")
    pg.click('.hero-card .filter-group .filter-btn:nth-child(1)'); pg.wait_for_timeout(300)
    g_seances = geo()
    pg.click('#btn-vol-calendar'); pg.wait_for_timeout(500)
    g_jour = geo()
    yb = pg.evaluate("[...document.querySelectorAll('#hero-yaxis span')].map(s=>Math.round(s.getBoundingClientRect().top))")
    pg.click('#btn-vol-calendar'); pg.wait_for_timeout(300)
    pg.click('.hero-card .filter-group .filter-btn:nth-child(3)'); pg.wait_for_timeout(300)
    g_mois = geo()
    check("hauteur et zone de tracé identiques : séances / jour / mois", g_seances == g_jour == g_mois and g_seances[0] == 210, (g_seances, g_jour, g_mois))
    pg.click('.hero-card .filter-group .filter-btn:nth-child(1)'); pg.wait_for_timeout(300)
    pg.click('#btn-vol-calendar'); pg.wait_for_timeout(500)
    pg.evaluate("document.getElementById('hero-scroll').scrollLeft=0"); pg.wait_for_timeout(200)
    pg.screenshot(path='/tmp/claude-0/prog_jours2.png', clip={'x': 0, 'y': 80, 'width': 390, 'height': 520})
    check("aucune erreur JS", not errs, errs)
    br.close()

print(f"\n {sum(res)} / {len(res)} contrôles OK")
sys.exit(0 if all(res) else 1)
