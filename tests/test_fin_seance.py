"""Séance (1.7.27) : bouton Programmes → page de départ, en-tête sans « Séance du jour », échauffement (flamme),
noms d'exercice sur une ligne, fenêtre de fin de séance (Bravo, tonnage, comparaison, records)."""
import json, sys
from harness import *

res = []
def ok(n, c, extra=''):
    res.append(bool(c)); print(('OK   ' if c else 'FAIL ') + n, '' if c else extra)

SHOTS = '--captures' in sys.argv

with Srv() as url, sync_playwright() as p:
    br = p.chromium.launch()
    for w in (390, 360):
        ctx, pg, errs = newpage(br, w=w, pref='light'); msgs = []; resp = {'confirm': True}
        def on(d):
            msgs.append((d.type, d.message))
            d.accept() if (d.type != 'confirm' or resp['confirm']) else d.dismiss()
        pg.on('dialog', on)
        pg.goto(url); pg.wait_for_timeout(600)
        tag = f'{w} px : '

        # ---------- En-tête et échauffement ----------
        pg.evaluate("switchTab('seance')"); pg.wait_for_timeout(250)
        ok(tag + "en-tête sans « Séance du jour » ni nom du programme", not pg.is_visible('#seance-overline')
           and 'Séance du jour' not in pg.inner_text('#seance-sticky'), pg.inner_text('#seance-sticky'))
        first = pg.evaluate("workoutDef.exercises[0].name")
        warm_vis = pg.is_visible('#warmup-note')
        place = pg.evaluate("""(()=>{const n=document.getElementById('warmup-note');const nx=n.nextElementSibling;return [n.parentElement.id, nx&&nx.dataset.ex]})()""")
        first_force = pg.evaluate("[...document.querySelectorAll('#exercises-list .exercise-item')].map(e=>e.dataset.ex).find(n=>!exInfo(n).cardio)")
        ok(tag + "échauffement (1.7.42) : visible, juste avant le premier exercice de force", warm_vis and place == ['exercises-list', first_force], f'{place} {first_force}')
        pg.evaluate("document.getElementById('warmup-note').hidden=false")
        ok(tag + "échauffement (1.7.41) : (i), texte, picto poids après « force », flamme orange après « t'échauffer », plus d'emoji",
           pg.inner_text('#warmup-note').strip() == "Ajoute 2 séries légères au premier exercice de force  pour t'échauffer"
           and pg.evaluate("[...document.querySelectorAll('#warmup-note svg')].map(e=>e.getAttribute('class')).join(',')") == 'warmup-info,warmup-weight,warmup-flame'
           and pg.evaluate("getComputedStyle(document.querySelector('.warmup-flame')).fill") == 'rgb(234, 88, 12)'
           and pg.is_visible('.warmup-weight') and pg.is_visible('.warmup-info') and '🚣' not in pg.inner_html('#warmup-note'), repr(pg.inner_text('#warmup-note')))
        if SHOTS: pg.screenshot(path=f'/tmp/claude-0/fin_entete_{w}.png')
        pg.evaluate(f"document.getElementById('warmup-note').hidden={'false' if warm_vis else 'true'}")

        # ---------- Nom d'exercice long : une seule ligne, tronqué ----------
        pg.evaluate("document.querySelector('#exercises-list .ex-name').textContent='Développé couché prise serrée à la barre guidée avec élastiques'")
        r = pg.evaluate("(()=>{const e=document.querySelector('#exercises-list .ex-name');const cs=getComputedStyle(e);return {h:e.getBoundingClientRect().height,lh:parseFloat(cs.lineHeight)||e.getBoundingClientRect().height,to:cs.textOverflow,ws:cs.whiteSpace,sw:e.scrollWidth,cw:e.clientWidth}})()")
        ok(tag + "nom d'exercice long : une seule ligne terminée par « … »", r['to'] == 'ellipsis' and r['ws'] == 'nowrap' and r['sw'] > r['cw'] and r['h'] < 30, r)
        pg.evaluate("(()=>{const it=document.querySelector('#exercises-list .exercise-item');if(!it.classList.contains('open'))it.querySelector('.ex-toggle').click()})()"); pg.wait_for_timeout(150)
        r2 = pg.evaluate("(()=>{const e=document.querySelector('#exercises-list .exercise-item.open .ex-name');return e?{to:getComputedStyle(e).textOverflow,right:e.getBoundingClientRect().right,vw:innerWidth}:null})()")
        ok(tag + "nom long, exercice ouvert : tronqué aussi, ne sort pas de l'écran", r2 and r2['to'] == 'ellipsis' and r2['right'] <= r2['vw'], r2)
        ok(tag + "exercice fermé : flèche en bout de ligne ; ouvert : pas de flèche",
           pg.evaluate("[...document.querySelectorAll('#exercises-list .exercise-item:not(.open) .ex-chevron')].every(c=>getComputedStyle(c).display!=='none')")
           and pg.evaluate("getComputedStyle(document.querySelector('#exercises-list .exercise-item.open .ex-chevron')).display") == 'none')
        pg.evaluate("initWorkoutForm()"); pg.wait_for_timeout(150)

        # ---------- Bouton Programmes : page de départ ----------
        pg.evaluate("switchTab('programme')"); pg.wait_for_timeout(200)
        pg.evaluate("toggleProgramDetail()"); pg.wait_for_timeout(150)
        ok(tag + "détail du programme ouvert", pg.evaluate("programDetailOpen") is True)
        pg.evaluate("switchTab('seance')"); pg.click('#nav-programme'); pg.wait_for_timeout(200)
        ok(tag + "Programmes depuis Séance : page de départ, détail refermé", pg.evaluate("document.body.dataset.tab") == 'programme'
           and pg.evaluate("programView") == 'home' and pg.evaluate("programDetailOpen") is False)
        pg.evaluate("openProgramChooser()"); pg.wait_for_timeout(150)
        pg.click('#nav-programme'); pg.wait_for_timeout(200)
        ok(tag + "Programmes depuis le choix d'un nouveau programme : page de départ", pg.evaluate("programView") == 'home'
           and pg.evaluate("document.body.dataset.pview") == 'home')
        pg.evaluate("editProgram(getActiveProgram().id)"); pg.wait_for_timeout(200)
        ok(tag + "éditeur ouvert", pg.evaluate("programView") == 'editor')
        pg.click('#nav-programme'); pg.wait_for_timeout(200)
        ok(tag + "Programmes depuis l'éditeur sans modification : page de départ sans question", pg.evaluate("programView") == 'home' and not msgs)
        pg.evaluate("editProgram(getActiveProgram().id)"); pg.wait_for_timeout(200)
        pg.evaluate("programDraft.name='Changé'")
        resp['confirm'] = False; pg.click('#nav-programme'); pg.wait_for_timeout(200)
        ok(tag + "éditeur modifié, « Annuler » : on reste dans l'éditeur", pg.evaluate("programView") == 'editor' and msgs and 'Revenir en arrière annulera la saisie' in msgs[-1][1])
        resp['confirm'] = True; pg.click('#nav-programme'); pg.wait_for_timeout(200)
        ok(tag + "éditeur modifié, « OK » : page de départ, rien d'enregistré", pg.evaluate("programView") == 'home' and pg.evaluate("getActiveProgram().name") != 'Changé')
        msgs.clear()

        # ---------- Fenêtre de fin : vraie séance enregistrée ----------
        pg.evaluate("switchTab('seance')"); pg.wait_for_timeout(200)
        key = pg.evaluate("workoutDef.key")
        pg.evaluate("""(()=>{const it=[...document.querySelectorAll('#exercises-list .exercise-item')].find(i=>i.querySelector('.weight-input')&&exMode(i.dataset.ex)==='weight');
            it.querySelector('.ex-toggle').click(); const row=it.querySelector('.set-row'); row.querySelector('.weight-input').value='500'; row.querySelector('.reps-input').value='1'; row.querySelector('.btn-check-set').click(); window.__recEx=it.dataset.ex})()""")
        pg.evaluate("document.getElementById('workout-form').requestSubmit()"); pg.wait_for_timeout(400)
        ov = '#finish-overlay'
        ok(tag + "après « Enregistrer » : fenêtre de fin affichée, centrée", pg.is_visible(ov)
           and abs(pg.evaluate("(()=>{const r=document.querySelector('.finish-sheet').getBoundingClientRect();return (r.top+r.bottom)/2-innerHeight/2})()")) < 2)
        ok(tag + "« Bravo ! » en haut, en manuscrit", pg.evaluate("document.querySelector('.finish-sheet').firstElementChild.className") == 'finish-bravo'
           and pg.inner_text('.finish-bravo') == 'Bravo !' and 'Caveat' in pg.evaluate("getComputedStyle(document.querySelector('.finish-bravo')).fontFamily"))
        ok(tag + f"titre « Séance {key} terminée » avec la pastille entre les deux mots",
           pg.evaluate("[...document.querySelector('#finish-title').children].map(c=>c.textContent).join('|')") == f'Séance|{key}|terminée'
           and pg.evaluate("document.querySelector('#finish-title .type-pill').className").startswith(f'type-pill type-pill-{key}'))
        ok(tag + "tonnage affiché (500 kg)", 'Tonnage : 500 kg' in pg.inner_text('.finish-tonnage').replace(' ', ' ').replace('\xa0', ' '), pg.inner_text('.finish-tonnage'))
        rec_ex = pg.evaluate("window.__recEx")
        ok(tag + "record : bloc « Nouveau record » + coupe, puis « exercice, 500 kg »", pg.is_visible('.finish-rec-title svg') and 'Nouveau record' in pg.inner_text('.finish-rec-title')
           and pg.evaluate("[...document.querySelectorAll('.finish-rec')].map(e=>e.textContent.replace(/\\s/g,' '))") == [f'{rec_ex}, 500 kg'],
           pg.evaluate("[...document.querySelectorAll('.finish-rec')].map(e=>e.textContent)"))
        ov_r = pg.evaluate(OVERFLOW_JS)
        ok(tag + "fenêtre de fin : rien ne déborde", ov_r['docW'] <= ov_r['vw'] and not ov_r['out'], ov_r)
        if SHOTS: pg.wait_for_timeout(400); pg.screenshot(path=f'/tmp/claude-0/fin_popup_{w}.png')
        pg.click('.finish-ok'); pg.wait_for_timeout(150)
        ok(tag + "OK : fenêtre fermée, retour à la séance suivante", not pg.evaluate("!!document.getElementById('finish-overlay')") and pg.evaluate("document.body.dataset.tab") == 'seance')

        # ---------- Règles de la fenêtre (données construites) ----------
        base = "{id:1,date:'2026-11-09',type:'A',kind:'program',programId:'p1',sessionKey:'A',tonnage:8400,exercises:[{name:'Développé couché',sets:[{weight:72.5,reps:5}],maxWeight:72.5},{name:'Rameur',cardio:true,sets:[{weight:0,reps:0,seconds:750,meters:3000}]}]}"
        pg.evaluate(f"""(()=>{{state.history=[
            {{id:-3,date:'2026-11-01',type:'A',kind:'program',programId:'p1',sessionKey:'A',tonnage:7000,exercises:[{{name:'Développé couché',sets:[{{weight:70,reps:5}}]}},{{name:'Rameur',cardio:true,sets:[{{weight:0,reps:0,seconds:600,meters:2000}}]}}]}},
            {{id:-2,date:'2026-11-05',type:'A',kind:'program',programId:'p1',sessionKey:'A',tonnage:8100,exercises:[{{name:'Développé couché',sets:[{{weight:70,reps:5}}]}}]}},
            {{id:-1,date:'2026-11-07',type:'B',kind:'program',programId:'p1',sessionKey:'B',tonnage:9999,exercises:[]}}]}})()""")
        e = pg.evaluate(f"(()=>{{const e={base};const p=previousSameSession(e);return {{prev:p&&p.id,recs:sessionRecords(e)}}}})()")
        ok(tag + "précédente = dernière séance A du même programme (pas la B)", e['prev'] == -2, e)
        ok(tag + "records : charge (72,5 kg) et allure du rameur (2:05 /500 m, 1.7.89)", e['recs'] == [{'name': 'Développé couché', 'value': '72,5 kg'}, {'name': 'Rameur', 'value': '2:05 /500 m'}], e['recs'])
        pg.evaluate(f"(()=>{{const e={base};openFinishDialog(e,previousSameSession(e),sessionRecords(e))}})()")
        txt = pg.inner_text(ov).replace(' ', ' ').replace('\xa0', ' ')
        ok(tag + "hausse : « +300 kg / précédente » en vert", pg.inner_text('.finish-compare').replace(' ', ' ').replace('\xa0', ' ') == '+300 kg / précédente'
           and pg.evaluate("getComputedStyle(document.querySelector('.finish-compare')).color") == 'rgb(11, 122, 67)', txt)
        if SHOTS and w == 390: pg.wait_for_timeout(400); pg.screenshot(path='/tmp/claude-0/fin_popup_maquette.png')
        pg.evaluate("closeFinishDialog()")
        pg.evaluate(f"(()=>{{const e={base};e.tonnage=7900;e.exercises=[{{name:'Développé couché',sets:[{{weight:70,reps:5}}]}}];openFinishDialog(e,previousSameSession(e),sessionRecords(e))}})()")
        ok(tag + "baisse : « −200 kg / précédente » en gris ; aucun record : pas de bloc ni de séparateur",
           pg.inner_text('.finish-compare').replace(' ', ' ').replace('\xa0', ' ') == '−200 kg / précédente'
           and pg.evaluate("getComputedStyle(document.querySelector('.finish-compare')).color") == 'rgb(107, 107, 115)'
           and not pg.evaluate("!!document.querySelector('.finish-rec-title,.finish-sep')"), pg.inner_text(ov))
        pg.evaluate("closeFinishDialog()")
        pg.evaluate(f"(()=>{{const e={base};e.sessionKey='C';e.type='C';openFinishDialog(e,previousSameSession(e),[])}})()")
        ok(tag + "pas de séance précédente : pas de ligne de comparaison", not pg.evaluate("!!document.querySelector('.finish-compare')") and pg.is_visible('.finish-tonnage'))
        pg.evaluate("closeFinishDialog()")
        pg.evaluate("openFinishDialog({id:2,kind:'libre',type:'1×',sessionKey:'',tonnage:0,exercises:[]},null,[])")
        ok(tag + "séance libre : « Séance terminée » sans pastille ; sans tonnage, pas de ligne tonnage",
           pg.inner_text('#finish-title').replace('\n', ' ').strip() == 'Séance terminée' and not pg.evaluate("!!document.querySelector('#finish-title .type-pill,.finish-tonnage')"), pg.inner_text('#finish-title'))
        pg.evaluate("closeFinishDialog()")

        # thème sombre : la fenêtre reste lisible
        pg.evaluate("setThemePreference('dark')")
        pg.evaluate(f"(()=>{{const e={base};openFinishDialog(e,previousSameSession(e),sessionRecords(e))}})()")
        ok(tag + "thème sombre : fond de fenêtre sombre, texte clair", pg.evaluate("getComputedStyle(document.querySelector('.finish-sheet')).backgroundColor") != 'rgb(255, 255, 255)'
           and pg.evaluate("getComputedStyle(document.querySelector('.finish-bravo')).color") != 'rgb(17, 17, 20)')
        if SHOTS and w == 390: pg.wait_for_timeout(400); pg.screenshot(path='/tmp/claude-0/fin_popup_sombre.png')
        pg.evaluate("closeFinishDialog(); setThemePreference('light')")

        ok(tag + "aucune erreur JavaScript", not errs, errs)
        ctx.close()
    br.close()

print(f"\n {sum(res)} / {len(res)} contrôles OK")
sys.exit(0 if all(res) else 1)
