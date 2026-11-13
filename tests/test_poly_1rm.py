"""1.7.34 : puce « Polyarticulaires » dans « Ajouter un exercice » ; 1RM estimé (Epley) en pointillé sur le graphique par exercice."""
import json, sys
from datetime import date, timedelta
from harness import *

res = []
def ok(n, c, extra=''):
    res.append(bool(c)); print(('OK   ' if c else 'FAIL ') + n, '' if c else str(extra)[:300])

SHOTS = '--captures' in sys.argv
today = date.today()
# Développé couché : 3 séances ; la 2e n'a que des séries de 12 reps (pas d'estimation), la 3e a une série de 6
bench = [
    [{"weight": 70, "reps": 8}, {"weight": 72.5, "reps": 6}],
    [{"weight": 60, "reps": 12}],
    [{"weight": 80, "reps": 8}, {"weight": 82, "reps": 6}],
]
seed = [{"id": 200 + i, "date": (today - timedelta(days=30 - 7 * i)).isoformat(), "type": "A", "isDeload": False, "tonnage": 2000, "duration": "40 min",
         "exercises": [{"name": "Développé couché", "sets": s, "maxWeight": max(x["weight"] for x in s), "totalVolume": 1000},
                       {"name": "Tractions", "sets": [{"weight": 0, "lest": 5, "reps": 8, "free": True}], "maxWeight": 5, "totalVolume": 40}]}
        for i, s in enumerate(bench)]
POLY = {1,2,3,4,5,6,7,8,9,10,25,26,27,28,29,30,31,32,33,35,39,40,41,42,43,44,45,46,51,52,53,54,58,71}

with Srv() as url, sync_playwright() as p:
    br = p.chromium.launch()
    for w, theme in ((390, 'light'), (360, 'light'), (390, 'dark')):
        tag = f'{w} px {theme} : '
        ctx, pg, errs = newpage(br, w=w, pref=theme)
        pg.add_init_script("if(!localStorage.getItem('seeded')){localStorage.setItem('h49_state', %s);localStorage.setItem('seeded','1')}"
                           % json.dumps(json.dumps({"nextType": "A", "history": seed, "weights": [], "lastWeights": {}})))
        pg.goto(url); pg.wait_for_timeout(700)

        # --- Polyarticulaires
        ids = set(pg.evaluate("CATALOGUE.filter(e=>e.poly).map(e=>e.id)"))
        ok(tag + "catalogue : 34 exercices marqués polyarticulaires, les bons", ids == POLY, ids ^ POLY)
        pg.evaluate("switchTab('programme'); openProgramChooser()"); pg.wait_for_timeout(150)
        pg.click('.choose-card:not(.libre)'); pg.wait_for_timeout(200)
        pg.click(".ed-add"); pg.wait_for_timeout(300)
        chips = pg.evaluate("[...document.querySelectorAll('.add-chips .filter-btn')].map(b=>b.textContent)")
        ok(tag + "puce « Polyarticulaires » juste après « Tous »", chips[:3] == ['Tous', 'Polyarticulaires', 'Cardio'], chips)
        pg.click('.add-chips .filter-btn[data-f="Polyarticulaires"]'); pg.wait_for_timeout(200)
        shown = pg.evaluate("[...document.querySelectorAll('#add-list .add-item')].map(b=>+b.dataset.id)")
        ok(tag + "filtre : les 34 polyarticulaires, rien d'autre", set(shown) == POLY and len(shown) == 34, len(shown))
        names = pg.evaluate("[...document.querySelectorAll('#add-list .add-name')].map(x=>x.textContent)")
        ok(tag + "SDT roumain, SDT jambes tendues et hip thrust exclus", not ({'Soulevé de terre roumain', 'Soulevé de terre jambes tendues', 'Hip thrust', 'Hip thrust haltères'} & set(names)))
        ok(tag + "le groupe reste affiché sous le nom", pg.inner_text('#add-list .add-item .add-meta') in ('Jambes', 'Dos', 'Pectoraux', 'Épaules', 'Bras'))
        ov = pg.evaluate(OVERFLOW_JS)
        ok(tag + "volet : rien ne déborde", ov['docW'] <= ov['vw'] and not ov['out'], ov)
        if SHOTS: pg.screenshot(path=f'/tmp/claude-0/poly_{w}_{theme}.png')
        pg.click('.add-chips .filter-btn[data-f="Bras"]'); pg.wait_for_timeout(150)
        ok(tag + "les autres puces marchent toujours (Bras : 12)", pg.locator('#add-list .add-item').count() == 12)
        pg.evaluate("cancelAddExercise()"); pg.wait_for_timeout(200)

        # --- 1RM estimé
        pg.evaluate("switchTab('progression')"); pg.wait_for_timeout(500)
        pg.select_option('#exercise-filter', 'Développé couché'); pg.wait_for_timeout(300)
        ds = pg.evaluate("exerciseChart.data.datasets.map(d=>({l:d.label,data:d.data,dash:d.borderDash||null,fill:d.fill}))")
        exp = [round(max(70 * (1 + 8 / 30), 72.5 * (1 + 6 / 30)) * 2) / 2, None, round(max(80 * (1 + 8 / 30), 82 * (1 + 6 / 30)) * 2) / 2]  # [88.5, None, 101.5]
        ok(tag + "2 courbes : charge max + 1RM estimé en pointillé, sans remplissage", len(ds) == 2 and ds[1]['dash'] == [5, 5] and ds[1]['fill'] is False, ds)
        ok(tag + f"1RM Epley sur les séries ≤ 10 reps : {exp}", ds[1]['data'] == exp, ds[1]['data'])
        ok(tag + "charge max inchangée", ds[0]['data'] == [72.5, 60, 82], ds[0]['data'])
        leg = pg.inner_text('#exercise-legend')
        ok(tag + "légende visible : « Charge max 82 kg » et « 1RM estimé 101,5 kg »", pg.is_visible('#exercise-legend') and 'Charge max' in leg and '82 kg' in leg and '101,5 kg' in leg, leg)
        ok(tag + "phrase d'explication visible", pg.is_visible('#exercise-rm-note') and 'Epley' in pg.inner_text('#exercise-rm-note'))
        pg.evaluate("document.getElementById('exerciseChart').scrollIntoView({block:'center'})"); pg.wait_for_timeout(300)
        ov = pg.evaluate(OVERFLOW_JS)
        ok(tag + "Progression : rien ne déborde", ov['docW'] <= ov['vw'] and not ov['out'], ov)
        if SHOTS: pg.screenshot(path=f'/tmp/claude-0/rm_{w}_{theme}.png')
        pg.click('#btn-mode-vol'); pg.wait_for_timeout(300)
        ok(tag + "« Volume cumulé » : pas de pointillé, pas de légende",
           pg.evaluate("exerciseChart.data.datasets.length") == 1 and not pg.is_visible('#exercise-legend') and not pg.is_visible('#exercise-rm-note'))
        pg.click('#btn-mode-max'); pg.wait_for_timeout(200)
        pg.select_option('#exercise-filter', 'Tractions'); pg.wait_for_timeout(300)
        ok(tag + "exercice au poids du corps (tractions) : pas de 1RM estimé",
           pg.evaluate("exerciseChart.data.datasets.length") == 1 and '1RM' not in pg.inner_text('#exercise-legend'))  # 1.7.35 : légende en répétitions
        ok(tag + "aucune erreur JavaScript", not errs, errs)
        ctx.close()
    br.close()

print(f"\n {sum(res)} / {len(res)} contrôles OK")
sys.exit(0 if all(res) else 1)
