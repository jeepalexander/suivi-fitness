"""Même exercice plusieurs fois dans une séance (1.7.59) : éditeur, saisie par passage, brouillon,
historique (rang « occ »), charges reprises du même passage, Progression et records additionnés."""
import json, sys
from harness import Srv, newpage, sync_playwright

res = []


def ok(n, c, extra=''):
    res.append(bool(c)); print(('OK   ' if c else 'FAIL ') + n, '' if c else extra)


SUBMIT = "document.getElementById('workout-form').requestSubmit()"
# Le jeu d'essai est en semaine de déload : on la coupe pour comparer des charges pleines
NODELOAD = "checkDeloadStatus = () => false; initWorkoutForm()"

with Srv() as url, sync_playwright() as p:
    br = p.chromium.launch()
    for scheme in ('light', 'dark'):
        ctx, pg, errs = newpage(br, pref=scheme, scheme=scheme)
        pg.on('dialog', lambda d: d.accept())
        pg.goto(url + 'index.html'); pg.wait_for_timeout(500)
        hist = lambda: json.loads(pg.evaluate("localStorage.getItem('h49_state')"))['history']

        # --- Éditeur : un exercice déjà présent reste choisissable
        pid = pg.evaluate("getActiveProgram().id")
        pg.evaluate("id=>startProgramEditor('program', id)", pid); pg.wait_for_timeout(300)
        first = pg.evaluate("draftSession().exercises.find(e=>!exInfo(e.exId).cardio).exId")
        n0 = pg.evaluate("draftSession().exercises.length")
        pg.evaluate("openAddExercise()"); pg.wait_for_timeout(300)
        item = f'.add-item[data-id="{first}"]'
        meta = pg.evaluate(f"(()=>{{const b=document.querySelector('{item}');return b?[b.disabled,b.querySelector('.add-meta').textContent]:null}})()")
        ok(f'[{scheme}] liste : exercice présent non grisé, « Déjà dans la séance · ajouter encore »',
           meta and meta[0] is False and meta[1] == 'Déjà dans la séance · ajouter encore', meta)
        pg.click(item); pg.wait_for_timeout(150)
        ok(f'[{scheme}] liste : il se coche', pg.get_attribute(item, 'aria-pressed') == 'true')
        pg.evaluate("confirmAddExercise()"); pg.wait_for_timeout(300)
        ids = pg.evaluate("draftSession().exercises.map(e=>e.exId)")
        ok(f'[{scheme}] éditeur : ajouté une seconde fois en fin de séance', len(ids) == n0 + 1 and ids[-1] == first and ids.count(first) == 2, ids)
        if scheme == 'light':
            pg.screenshot(path='/home/claude/shots/doublon-editeur.png')
        # Rameur (cardio) en double aussi
        rower = pg.evaluate("exInfo('Rameur').id")
        pg.evaluate("openAddExercise()"); pg.wait_for_timeout(300)
        pg.click(f'.add-item[data-id="{rower}"]'); pg.wait_for_timeout(100)
        pg.evaluate("confirmAddExercise()"); pg.wait_for_timeout(200)
        pg.evaluate("openAddExercise()"); pg.wait_for_timeout(300)
        pg.click(f'.add-item[data-id="{rower}"]'); pg.wait_for_timeout(100)
        pg.evaluate("confirmAddExercise()"); pg.wait_for_timeout(200)
        ids = pg.evaluate("draftSession().exercises.map(e=>e.exId)")
        ok(f'[{scheme}] cardio : rameur ajouté deux fois', ids.count(rower) >= 2, ids)
        # Enregistrer le programme directement dans l'état (le bouton dépend du parcours de l'éditeur)
        pg.evaluate("""()=>{const d=programDraft;const p=getProgram(d.id||getActiveProgram().id);
            p.sessions[d.idx].exercises=JSON.parse(JSON.stringify(draftSession().exercises));saveState();}""")
        key = pg.evaluate("programDraft.sessions[programDraft.idx].key")
        pg.evaluate("k=>{const p=getActiveProgram();p.nextKey=k;saveState();}", key)
        pg.reload(); pg.wait_for_timeout(600); pg.evaluate(NODELOAD); pg.wait_for_timeout(200)

        # --- Séance : deux passages, chacun sa ligne et son rang
        pg.evaluate("switchTab('seance')"); pg.wait_for_timeout(300)
        name = pg.evaluate("n=>exInfo(n).name", first)
        occ = pg.evaluate("n=>[...document.querySelectorAll('.exercise-item')].filter(e=>e.dataset.ex===n).map(e=>e.dataset.occ)", name)
        ok(f'[{scheme}] séance : deux lignes « {name} », rangs 0 et 1', occ == ['0', '1'], occ)
        rocc = pg.evaluate("[...document.querySelectorAll('.exercise-item')].filter(e=>e.dataset.ex==='Rameur').map(e=>e.dataset.occ)")
        ok(f'[{scheme}] séance : rameur en deux passages', len(rocc) >= 2 and rocc[:2] == ['0', '1'], rocc)

        # Saisie : passage 1 à 50 kg, passage 2 à 30 kg, toutes les séries de ces deux lignes cochées
        pg.evaluate("""n=>{const its=[...document.querySelectorAll('.exercise-item')].filter(e=>e.dataset.ex===n);
            its.forEach((it,k)=>it.querySelectorAll('.set-row').forEach(r=>{r.querySelector('.weight-input').value=k?'30':'50';
              r.querySelector('.reps-input').value='8';r.querySelector('.btn-check-set').click();}));}""", name)
        # Rameur passage 1 : 5:00 et 1200 m ; passage 2 : 3:00 et 700 m
        pg.evaluate("""()=>{const its=[...document.querySelectorAll('.exercise-item')].filter(e=>e.dataset.ex==='Rameur');
            its.slice(0,2).forEach((it,k)=>{const r=it.querySelector('.set-row');r.querySelector('.weight-input').value=k?'3:00':'5:00';
              r.querySelector('.reps-input').value=k?'700':'1200';r.querySelector('.btn-check-set').click();});}""")
        # Brouillon : chaque passage retrouve ses valeurs après un rechargement
        pg.reload(); pg.wait_for_timeout(700); pg.evaluate(NODELOAD); pg.evaluate("switchTab('seance')"); pg.wait_for_timeout(300)
        w = pg.evaluate("n=>[...document.querySelectorAll('.exercise-item')].filter(e=>e.dataset.ex===n).map(it=>it.querySelector('.weight-input').value)", name)
        ok(f'[{scheme}] brouillon : chaque passage garde sa charge (50 / 30)', w == ['50', '30'], w)
        n_before = len(hist())
        pg.evaluate(SUBMIT); pg.wait_for_timeout(500)
        h = hist()
        ok(f'[{scheme}] séance enregistrée', len(h) == n_before + 1)
        last = max(h, key=lambda x: x.get('id') or 0)
        logs = [e for e in last['exercises'] if e['name'] == name]
        ok(f'[{scheme}] historique : deux passages séparés, rang 1 sur le second',
           len(logs) == 2 and 'occ' not in logs[0] and logs[1].get('occ') == 1
           and logs[0]['sets'][0]['weight'] == 50 and logs[1]['sets'][0]['weight'] == 30, json.dumps(logs)[:200])
        rl = [e for e in last['exercises'] if e['name'] == 'Rameur']
        ok(f'[{scheme}] historique : rameur en deux passages', len(rl) == 2 and rl[1].get('occ') == 1 and rl[1]['sets'][0]['meters'] == 700, json.dumps(rl)[:200])
        ok(f'[{scheme}] fin de séance : un seul record par exercice',
           pg.evaluate("n=>[...document.querySelectorAll('#finish-overlay *')].filter(e=>e.children.length===0&&e.textContent.trim()===n).length<=1", name))
        if pg.evaluate("!!document.querySelector('.finish-ok')"): pg.click('.finish-ok'); pg.wait_for_timeout(100)

        # Séance suivante (la rotation passe à la séance d'après : on lui donne les mêmes exercices)
        pg.evaluate("k=>{const p=getActiveProgram();const src=p.sessions.find(s=>s.key===k);p.sessions.forEach(s=>{s.exercises=JSON.parse(JSON.stringify(src.exercises))});saveState();}", key)
        pg.reload(); pg.wait_for_timeout(600); pg.evaluate(NODELOAD); pg.evaluate("switchTab('seance')"); pg.wait_for_timeout(300)
        w = pg.evaluate("n=>[...document.querySelectorAll('.exercise-item')].filter(e=>e.dataset.ex===n).map(it=>it.querySelector('.weight-input').value)", name)
        ok(f'[{scheme}] séance suivante : passage 1 à 50 kg, passage 2 à 30 kg', w == ['50', '30'], w)
        rv = pg.evaluate("()=>[...document.querySelectorAll('.exercise-item')].filter(e=>e.dataset.ex==='Rameur').slice(0,2).map(it=>it.querySelector('.reps-input').value)")
        ok(f'[{scheme}] séance suivante : rameur 1 200 m puis 700 m', rv == ['1200', '700'], rv)
        if scheme == 'light':
            pg.evaluate("n=>{const its=[...document.querySelectorAll('.exercise-item')].filter(e=>e.dataset.ex===n);its[1].querySelector('.ex-toggle').click();its[1].scrollIntoView({block:'center'})}", name)
            pg.wait_for_timeout(300); pg.screenshot(path='/home/claude/shots/doublon-seance.png')
        sub = pg.evaluate("n=>{const it=[...document.querySelectorAll('.exercise-item')].filter(e=>e.dataset.ex===n)[1];if(!it.classList.contains('open'))it.querySelector('.ex-toggle').click();return it.querySelector('.ex-sub').textContent}", name)
        ok(f'[{scheme}] passage 2 ouvert : « Dernière fois · 30 kg max »', sub == 'Dernière fois · 30 kg max', sub)

        # Progression : les passages sont additionnés (une seule courbe, tonnage de la séance entière)
        m = pg.evaluate("""n=>{const h=state.history.reduce((a,b)=>(b.id||0)>(a.id||0)?b:a);const e=mergeExercises(h.exercises).filter(x=>x.name===n);
            return e.length===1?[e[0].sets.length,e[0].maxWeight,e[0].totalVolume]:e.length}""", name)
        sets_total = sum(len(l['sets']) for l in logs)
        ok(f'[{scheme}] Progression : passages fusionnés (séries, charge max 50, tonnage additionné)',
           isinstance(m, list) and m[0] == sets_total and m[1] == 50 and m[2] == sum(l['totalVolume'] for l in logs), m)
        pg.evaluate("switchTab('progression')"); pg.wait_for_timeout(400)
        ok(f'[{scheme}] Progression s\'affiche sans erreur', not errs, errs)
        # Modification d'une ancienne séance : les deux passages reviennent, cochés
        idx = pg.evaluate("state.history.indexOf(state.history.reduce((a,b)=>(b.id||0)>(a.id||0)?b:a))")
        pg.evaluate("i=>{switchTab('historique');openSessionModal(i)}", idx); pg.wait_for_timeout(200)
        pg.evaluate("document.getElementById('modal-edit-btn').click()"); pg.wait_for_timeout(400)
        e = pg.evaluate("n=>[...document.querySelectorAll('.exercise-item')].filter(e=>e.dataset.ex===n).map(it=>[it.querySelector('.weight-input').value,it.querySelectorAll('.set-row.done').length])", name)
        ok(f'[{scheme}] modification : deux passages, charges 50 / 30, séries cochées', len(e) == 2 and e[0][0] == '50' and e[1][0] == '30' and e[0][1] > 0 and e[1][1] > 0, e)
        ok(f'[{scheme}] aucune erreur JavaScript', not errs, errs)
        ctx.close()
    br.close()
print(f"\n {sum(res)} / {len(res)} contrôles OK")
sys.exit(0 if all(res) else 1)
