"""1.7.30 : bouton pause en haut à droite de la tuile active → le programme passe « En mémoire »."""
import json, sys
from harness import *

res = []
def ok(n, c, extra=''):
    res.append(bool(c)); print(('OK   ' if c else 'FAIL ') + n, '' if c else extra)

with Srv() as url, sync_playwright() as p:
    br = p.chromium.launch()
    for w, theme in ((390, 'light'), (360, 'dark')):
        ctx, pg, errs = newpage(br, w=w, pref=theme, native_dialogs=False)
        pg.goto(url); pg.wait_for_timeout(700)
        tag = f'{w} px {theme} : '
        pg.evaluate("switchTab('programme')"); pg.wait_for_timeout(250)
        name = pg.evaluate("getActiveProgram().name")
        g = pg.evaluate("""(()=>{const t=document.querySelector('.prog-tile');const b=t.querySelector('.prog-pause-btn');const tr=t.getBoundingClientRect(),br=b.getBoundingClientRect();
            const ico=t.querySelector('.prog-ico').getBoundingClientRect();return {right:tr.right-br.right,top:br.top-tr.top,w:br.width,h:br.height,icoMid:ico.top+ico.height/2,btnMid:br.top+br.height/2,label:b.getAttribute('aria-label')}})()""")
        ok(tag + "bouton pause 40 px en haut à droite de la tuile active, aligné sur l'icône", g['w'] == 40 and g['h'] == 40 and 10 <= g['right'] <= 14 and abs(g['icoMid'] - g['btnMid']) < 1 and name in g['label'], g)
        ov = pg.evaluate(OVERFLOW_JS)
        ok(tag + "rien ne déborde", ov['docW'] <= ov['vw'] and not ov['out'], ov)
        pg.screenshot(path=f'/tmp/claude-0/pause_actif_{w}_{theme}.png')
        pg.click('.prog-tile .prog-pause-btn'); pg.wait_for_timeout(300)
        st = json.loads(pg.evaluate("localStorage.getItem('h49_state')"))
        prog = next(x for x in st['programs'] if x['name'] == name)
        ok(tag + "pause sans séance en cours : directement en mémoire, « En pause depuis le … »",
           prog['status'] == 'paused' and prog.get('pausedAt') and pg.evaluate("getActiveProgram()") is None
           and 'Aucun programme actif' in pg.inner_text('#program-overview') and 'En pause depuis le' in pg.inner_text('.mem-list'))
        pg.screenshot(path=f'/tmp/claude-0/pause_apres_{w}_{theme}.png')
        pg.evaluate("switchTab('seance')"); pg.wait_for_timeout(300)
        pg.evaluate("switchTab('programme')"); pg.wait_for_timeout(200)
        pg.click(f".mem-tile:has-text('{name}') .mem-btn"); pg.wait_for_timeout(300)
        ok(tag + "« Réactiver » : redevient actif", (pg.evaluate("getActiveProgram()") or {}).get('name') == name)
        # séance en cours : confirmation
        pg.evaluate("switchTab('seance')"); pg.wait_for_timeout(250)
        pg.evaluate("""(()=>{const it=document.querySelector('#exercises-list .exercise-item');if(!it.classList.contains('open'))it.querySelector('.ex-toggle').click()})()""")
        pg.fill('#exercises-list .exercise-item.open .weight-input', '30'); pg.wait_for_timeout(2300)
        pg.evaluate("switchTab('programme')"); pg.wait_for_timeout(200)
        pg.click('.prog-tile .prog-pause-btn'); pg.wait_for_timeout(250)
        t = pg.evaluate("(()=>{const o=document.getElementById('ask-overlay');return o&&o.classList.contains('open')?o.innerText:''})()")
        ok(tag + "séance en cours : volet de confirmation", f'Mettre en pause « {name} » ?' in t and 'Continuer la séance' in t, t)
        pg.click('#ask-cancel'); pg.wait_for_timeout(200)
        ok(tag + "« Continuer la séance » : programme toujours actif, chrono gardé", (pg.evaluate("getActiveProgram()") or {}).get('name') == name and pg.evaluate("localStorage.getItem('workout_start_time')!==null"))
        pg.click('.prog-tile .prog-pause-btn'); pg.wait_for_timeout(200); pg.click('#ask-ok'); pg.wait_for_timeout(300)
        ok(tag + "« Mettre en pause » : en mémoire, chrono remis à zéro", pg.evaluate("getActiveProgram()") is None and pg.evaluate("localStorage.getItem('workout_start_time')===null"))
        pg.evaluate("switchTab('seance')"); pg.wait_for_timeout(300)
        ok(tag + "onglet Séance sans programme actif : pas d'erreur", not errs, errs)
        # séance libre active : bouton aussi
        lib = pg.evaluate("(getPrograms().find(p=>isLibre(p))||{}).id")
        if lib:
            pg.evaluate(f"switchTab('programme'); activateProgram('{lib}')"); pg.wait_for_timeout(250)
            ok(tag + "séance libre active : bouton pause présent", pg.is_visible('.prog-tile.libre .prog-pause-btn'))
        ok(tag + "aucune erreur JavaScript", not errs, errs)
        ctx.close()
    br.close()
print(f"\n {sum(res)} / {len(res)} contrôles OK")
sys.exit(0 if all(res) else 1)
