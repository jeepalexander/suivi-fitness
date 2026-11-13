"""1.7.35 : exercice au poids du corps — graphique en répétitions (meilleure série), légende, records en répétitions ou en lest."""
import json, sys
from datetime import date, timedelta
from harness import *

res = []
def ok(n, c, extra=''):
    res.append(bool(c)); print(('OK   ' if c else 'FAIL ') + n, '' if c else str(extra)[:300])

SHOTS = '--captures' in sys.argv
today = date.today()
first = today.replace(day=1)
prev = (first - timedelta(days=1)).replace(day=10)
prev2 = (first - timedelta(days=40)).replace(day=10)
def sess(i, d, ex):
    return {"id": 300 + i, "date": d.isoformat(), "type": "C", "isDeload": False, "tonnage": 3000, "duration": "40 min", "exercises": ex}
dips = lambda reps, lest=None: {"name": "Dips", "sets": [dict({"weight": 80 + (lest or 0), "reps": r}, **({} if lest is None else {"lest": lest})) for r in reps],
                                "maxWeight": 80 + (lest or 0), "totalVolume": sum(reps) * (80 + (lest or 0))}
bench = {"name": "Développé couché", "sets": [{"weight": 70, "reps": 8}], "maxWeight": 70, "totalVolume": 560}
trac = lambda reps, lest: {"name": "Tractions", "sets": [{"weight": 80 + lest, "reps": r, "lest": lest} for r in reps], "maxWeight": 80 + lest, "totalVolume": sum(reps) * (80 + lest)}
seed = [
    sess(0, prev2, [dips([10, 10, 10]), bench, trac([8, 6], 0)]),       # ancienne saisie (pas de lest) : 10 rép.
    sess(1, prev, [dips([14, 12], 0), trac([8], 0)]),                    # 14 rép.
    sess(2, first + timedelta(days=1) if first + timedelta(days=1) <= today else today, [dips([22, 20, 15], 0), bench, trac([6, 5], 5)]),  # 22 rép. ; tractions lestées
]
with Srv() as url, sync_playwright() as p:
    br = p.chromium.launch()
    for w, theme in ((390, 'light'), (360, 'light'), (390, 'dark')):
        tag = f'{w} px {theme} : '
        ctx, pg, errs = newpage(br, w=w, pref=theme)
        pg.add_init_script("if(!localStorage.getItem('seeded')){localStorage.setItem('h49_state', %s);localStorage.setItem('seeded','1')}"
                           % json.dumps(json.dumps({"nextType": "A", "history": seed, "weights": [{"date": prev2.isoformat(), "weight": 80}], "lastWeights": {}})))
        pg.goto(url); pg.wait_for_timeout(700)
        pg.evaluate("switchTab('progression')"); pg.wait_for_timeout(500)
        pg.select_option('#exercise-filter', 'Dips'); pg.wait_for_timeout(300)
        ok(tag + "bouton « Répétitions » à la place de « Charge max »", pg.inner_text('#btn-mode-max') == 'Répétitions')
        data = pg.evaluate("exerciseChart.data.datasets[0].data")
        ok(tag + "courbe : meilleure série de chaque séance [10, 14, 22]", data == [10, 14, 22] and pg.evaluate("exerciseChart.data.datasets.length") == 1, data)
        leg = pg.inner_text('#exercise-legend').replace('\n', ' ')
        ok(tag + "légende « Meilleure série 22 rép. · Record 22 rép. », sans 1RM", pg.is_visible('#exercise-legend') and 'Meilleure série 22 rép.' in leg and 'Record 22 rép.' in leg and '1RM' not in leg, leg)
        ok(tag + "pas de trait devant « Record »", not pg.is_visible('#exercise-legend .rm-line'))
        ok(tag + "phrase poids du corps visible, pas celle du 1RM", pg.is_visible('#exercise-bw-note') and not pg.is_visible('#exercise-rm-note'))
        rec = pg.evaluate("[...document.querySelectorAll('.record-item')].map(r=>r.innerText.replace(/\\n/g,' | '))")
        ok(tag + "record du mois : « Dips | 22 rép. | +8 rép. »", 'Dips | 22 rép. | +8 rép.' in rec, rec)
        ok(tag + "record lesté : « Tractions | PDC +5 kg | +5 kg »", 'Tractions | PDC +5 kg | +5 kg' in rec, rec)
        pg.evaluate("document.getElementById('exerciseChart').scrollIntoView({block:'center'})"); pg.wait_for_timeout(300)
        ov = pg.evaluate(OVERFLOW_JS)
        ok(tag + "rien ne déborde", ov['docW'] <= ov['vw'] and not ov['out'], ov)
        if SHOTS: pg.screenshot(path=f'/tmp/claude-0/pdc_{w}_{theme}.png')
        pg.select_option('#exercise-filter', 'Tractions'); pg.wait_for_timeout(300)
        tip = pg.evaluate("exerciseChart.options.plugins.tooltip.callbacks.label({parsed:{y:6},dataIndex:2})")
        ok(tag + "info-bulle d'une séance lestée : « 6 rép. · PDC +5 kg »", tip == '6 rép. · PDC +5 kg', tip)
        pg.click('#btn-mode-vol'); pg.wait_for_timeout(300)
        ok(tag + "« Volume cumulé » : pas de légende ni de phrase poids du corps", not pg.is_visible('#exercise-legend') and not pg.is_visible('#exercise-bw-note'))
        pg.click('#btn-mode-max'); pg.wait_for_timeout(200)
        pg.select_option('#exercise-filter', 'Développé couché'); pg.wait_for_timeout(300)
        leg = pg.inner_text('#exercise-legend').replace('\n', ' ')
        ok(tag + "exercice en kg : « Charge max » revient, avec le 1RM estimé", pg.inner_text('#btn-mode-max') == 'Charge max' and 'Charge max' in leg and '1RM estimé' in leg and pg.is_visible('#exercise-legend .rm-line'), leg)
        ok(tag + "1.7.36 : restauration locale limitée aux sauvegardes .json (pas de caméra ni de micro sous Firefox Android)",
           pg.get_attribute('#import-file', 'accept') == '.json,application/json')
        ok(tag + "aucune erreur JavaScript", not errs, errs)
        ctx.close()
    br.close()
print(f"\n {sum(res)} / {len(res)} contrôles OK")
sys.exit(0 if all(res) else 1)
