"""Progression : une séance choisie dans la tuile (filtre « A / B / C », 1.8.46) filtre aussi
« Progression par exercice » (exercices de cette séance seulement, carte cachée pour une séance de cardio seul)
et « Suivi cardio » (cardio de cette séance, carte cachée s'il n'y en a pas)."""
import os, sys, tempfile
from harness import Srv, newpage, sync_playwright

SHOTS = os.environ.get('SHOTS_DIR') or tempfile.gettempdir()
os.makedirs(SHOTS, exist_ok=True)
res = []


def ok(n, c, extra=''):
    res.append(bool(c)); print(('OK   ' if c else 'FAIL ') + n, '' if c else str(extra)[:200])


INFO = """()=>({letter: statsSessionFilterLetter(),
  ex: [...document.getElementById('exercise-filter').options].map(o=>o.value),
  exHidden: getComputedStyle(document.getElementById('exercise-card')).display === 'none',
  cardio: [...document.getElementById('cardio-filter').options].map(o=>o.value),
  cardioHidden: getComputedStyle(document.getElementById('cardio-card')).display === 'none',
  labels: exerciseChart ? exerciseChart.data.labels.slice() : []})"""

with Srv() as url, sync_playwright() as p:
    br = p.chromium.launch()
    ctx, pg, errs = newpage(br)
    pg.goto(url + 'index.html'); pg.wait_for_timeout(500)
    # séance D : cardio seul ; séance E : sans cardio (ajoutées au programme actif)
    pg.evaluate("""()=>{const p=getActiveProgram();const id=n=>CATALOGUE.find(e=>e.name===n).id;
      p.sessions.push({key:'D',name:'Cardio',exercises:[{exId:id('Rameur'),sets:1}]});
      p.sessions.push({key:'E',name:'Bras',exercises:[{exId:id('Curl biceps'),sets:3},{exId:id('Dips'),sets:3}]});
      p.sessions.push({key:'F',name:'Jamais faite',exercises:[{exId:id('Curl biceps'),sets:3}]});
      const base={programId:p.id,programName:p.name,kind:'program',isDeload:false,duration:1800};
      state.history.push(Object.assign({id:'hD',date:'2026-11-10',type:'D',sessionKey:'D',sessionName:'Cardio',tonnage:0,
        exercises:[{name:'Rameur',exId:id('Rameur'),cardio:true,sets:[{weight:0,reps:0,seconds:480,meters:2000}]}]},base));
      state.history.push(Object.assign({id:'hE',date:'2026-11-12',type:'E',sessionKey:'E',sessionName:'Bras',tonnage:600,
        exercises:[{name:'Curl biceps',exId:id('Curl biceps'),sets:[{weight:20,reps:10},{weight:20,reps:10},{weight:20,reps:10}],maxWeight:20,totalVolume:600}]},base));
      }""")
    pg.evaluate("switchTab('progression')"); pg.wait_for_timeout(700)
    i = pg.evaluate(INFO)
    ok('sans filtre : tous les exercices, cardio affiché', len(i['ex']) > 8 and not i['exHidden'] and not i['cardioHidden'], i)
    seen = {}
    for _ in range(6):
        pg.click('#btn-vol-type'); pg.wait_for_timeout(300)
        i = pg.evaluate(INFO); seen[i['letter']] = i
    a = seen.get('A', {})
    defA = pg.evaluate("getActiveProgram().sessions.find(s=>s.key==='A').exercises.map(e=>exInfo(e.exId).name).filter(n=>!exInfo(n).cardio)")
    ok('séance A : les exercices de la séance A d\'abord, aucun exercice des autres séances seulement',
       a and a['ex'][:len(defA)] == defA and 'Soulevé de terre' not in a['ex'], a)
    ok('séance A : cardio = Rameur', a and a['cardio'] == ['Rameur'] and not a['cardioHidden'], a)
    ok('séance A : les points des courbes sont tous des séances A', a and a.get('labels') and all(l.startswith('A') for l in a['labels']), a.get('labels'))
    d = seen.get('D', {})
    ok('séance D (cardio seul) : « Progression par exercice » cachée, cardio affiché', d and d['exHidden'] and not d['cardioHidden'], d)
    e = seen.get('E', {})
    ok('séance E (sans cardio) : « Suivi cardio » caché, exercices Curl biceps et Dips', e and e['cardioHidden'] and e['ex'][:2] == ['Curl biceps', 'Dips'] and not e['exHidden'], e)
    ok('séance E : la courbe du Curl biceps ne garde que son passage en séance E', e and len(e['labels']) == 1 and e['labels'][0].startswith('E'), e.get('labels'))
    ok('séance F jamais faite : absente du filtre « A / B / C »', 'F' not in seen and pg.evaluate("statsFilterLetters()") == ['A','B','C','D','E'], (list(seen), pg.evaluate("statsFilterLetters()")))
    # retour à « Séances » (tous) : tout revient
    pg.click('.hero-card .filter-group .filter-btn'); pg.wait_for_timeout(300)
    i = pg.evaluate(INFO)
    ok('retour au filtre « Séances » : liste complète et deux cartes affichées', i['letter'] is None and len(i['ex']) > 8 and not i['exHidden'] and not i['cardioHidden'], i)
    ok('aucune erreur JS', not errs, errs)
    ctx.close()

print(f"\n{sum(res)}/{len(res)} contrôles OK")
sys.exit(0 if all(res) else 1)
