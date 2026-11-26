"""Brouillon de séance : la saisie survit à un rechargement et à un échec d'écriture locale."""
import json, sys
from harness import *
def snap(pg):
    return pg.evaluate("""()=>({
      rows:[...document.querySelectorAll('#exercises-list .exercise-item')].map(it=>({n:it.dataset.ex,open:it.classList.contains('open'),
        sets:[...it.querySelectorAll('.set-row')].map(r=>[r.querySelector('.weight-input').value,r.querySelector('.reps-input').value,r.classList.contains('done'),r.querySelector('.weight-input').classList.contains('active-input')])})),
      progress:document.getElementById('sets-progress-text').innerText, timer:document.getElementById('workout-duration-display').innerText,
      type:document.getElementById('seance-badge').innerText, draft:!!localStorage.getItem('h49_draft')})""")
res=[]
def check(name,ok,extra=''):
    res.append(ok); print(('OK   ' if ok else 'ÉCHEC'),name,extra)

def accept_once(d):
    # 1.7.42 : la boîte peut déjà avoir été acceptée par l'autre gestionnaire (once + on sur la même boîte)
    try: d.accept()
    except Exception: pass

with Srv() as base, sync_playwright() as p:
    br=p.chromium.launch()
    ctx,pg,errs=newpage(br,390,844,pref='light')
    pg.goto(base+'index.html'); pg.wait_for_timeout(800); pg.evaluate("switchTab('seance')"); pg.wait_for_timeout(400)
    s0=snap(pg); check('formulaire neuf : aucun brouillon écrit',not s0['draft'])
    pg.evaluate("document.querySelectorAll('#exercises-list .ex-toggle')[2].click()"); pg.wait_for_timeout(200)
    check('ouvrir un exercice sans rien saisir : toujours aucun brouillon',not snap(pg)['draft'])
    pg.evaluate("document.querySelectorAll('#exercises-list .ex-toggle')[1].click()"); pg.wait_for_timeout(300)
    # saisie : poids/reps de la série 1, validation, ajout d'une série, 2e exercice ouvert à la main
    pg.fill('#exercises-list .exercise-item:nth-of-type(2) .set-row:nth-child(1) .weight-input','61.5')
    pg.fill('#exercises-list .exercise-item:nth-of-type(2) .set-row:nth-child(1) .reps-input','11')
    pg.click('#exercises-list .exercise-item:nth-of-type(2) .set-row:nth-child(1) .btn-check-set'); pg.wait_for_timeout(300)
    pg.evaluate("document.querySelector('#exercises-list .exercise-item.open .btn-set-count:last-child').click()"); pg.wait_for_timeout(200)
    pg.fill('#exercises-list .exercise-item.open .set-row:nth-child(2) .weight-input','67.5')
    pg.wait_for_timeout(2300)
    a=snap(pg); print('  avant rechargement :',a['progress'],a['timer'],[ (r['n'],len(r['sets'])) for r in a['rows']][:3])
    check('brouillon écrit après saisie',a['draft'])
    pg.reload(); pg.wait_for_timeout(1200); pg.evaluate("switchTab('seance')"); pg.wait_for_timeout(400)
    b=snap(pg)
    same=[ (r['n'],r['sets']) for r in a['rows']]==[ (r['n'],r['sets']) for r in b['rows']]
    check('après rechargement : toutes les valeurs, séries validées et séries ajoutées sont revenues',same)
    check('progression identique',a['progress']==b['progress'],f"{a['progress']} → {b['progress']}")
    ta=sum(int(x)*m for x,m in zip(a['timer'].split(':'),(60,1))); tb=sum(int(x)*m for x,m in zip(b['timer'].split(':'),(60,1)))
    check('chrono conservé (continue, ne repart pas de 00:00)',tb>=ta and tb<ta+8,f"{a['timer']} → {b['timer']}")
    check('exercice ouvert conservé',[r['open'] for r in a['rows']]==[r['open'] for r in b['rows']])
    # second rechargement : toujours là
    pg.reload(); pg.wait_for_timeout(1000); pg.evaluate("switchTab('seance')"); c=snap(pg)
    check('2e rechargement : toujours restauré',[(r['n'],r['sets']) for r in c['rows']]==[(r['n'],r['sets']) for r in a['rows']])
    # modification d'une ancienne séance puis annulation : le brouillon revient
    pg.evaluate("switchTab('historique')"); pg.wait_for_timeout(300)
    pg.evaluate("document.querySelector('.history-item').click()"); pg.wait_for_timeout(300)
    pg.once('dialog',accept_once); pg.click('#modal-edit-btn'); pg.wait_for_timeout(400)
    e=snap(pg); check('en modification : formulaire de l\'ancienne séance (pas le brouillon)',e['rows']!=a['rows'])
    pg.evaluate("document.querySelector('.exercise-item .ex-toggle').getAttribute('aria-expanded')==='false'&&document.querySelector('.exercise-item .ex-toggle').click()"); pg.wait_for_timeout(150)
    pg.fill('#exercises-list .exercise-item .weight-input','99'); pg.wait_for_timeout(200)
    check('saisie en modification : n\'écrase pas le brouillon',json.loads(pg.evaluate("localStorage.getItem('h49_draft')"))['exercises'][1]['sets'][0]['w']=='61.5')
    pg.evaluate("cancelEditSession()"); pg.wait_for_timeout(500); pg.evaluate("switchTab('seance')")
    f=snap(pg); check('après annulation : saisie en cours retrouvée',[(r['n'],r['sets']) for r in f['rows']]==[(r['n'],r['sets']) for r in a['rows']])
    # L'écriture de la séance échoue, mais les autres clés restent accessibles.
    fail_write = """(() => {
      const setItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function(key, value) {
        if (this === localStorage && key === 'h49_state' && sessionStorage.getItem('failWorkoutWrite')) {
          throw new DOMException('Stockage plein', 'QuotaExceededError');
        }
        return setItem.call(this, key, value);
      };
    })()"""
    pg.add_init_script(fail_write)
    pg.evaluate(fail_write)
    pg.evaluate("sessionStorage.setItem('failWorkoutWrite', '1')")
    before = pg.evaluate("() => [JSON.stringify(state), localStorage.getItem('h49_state'), localStorage.getItem('h49_draft'), localStorage.getItem('workout_start_time')]")
    dialogs = []
    def capture(d):
        dialogs.append(d.message)
        accept_once(d)
    pg.on('dialog', capture)
    pg.click('#submit-workout-btn')
    after = pg.evaluate("() => [JSON.stringify(state), localStorage.getItem('h49_state'), localStorage.getItem('h49_draft'), localStorage.getItem('workout_start_time')]")
    check('échec signalé, sans confirmation de succès', any('Séance non enregistrée' in msg for msg in dialogs) and pg.locator('.finish-ok').count()==0)
    check('échec : état, historique, brouillon et chrono inchangés', before==after and bool(after[2]) and bool(after[3]))
    pg.reload()
    pg.locator('#exercises-list .set-row.done').first.wait_for(state='attached')
    pg.evaluate("startSeance()")   # 1.8.95 : la séance se reprend depuis la tuile
    pg.wait_for_timeout(300)
    restored=snap(pg)
    check('stockage toujours plein après rechargement : formulaire et séries restaurés', [(r['n'],r['sets']) for r in restored['rows']]==[(r['n'],r['sets']) for r in a['rows']])
    pg.evaluate("sessionStorage.removeItem('failWorkoutWrite')")
    # nouvel essai : une seule séance ajoutée, brouillon effacé
    pg.click('#submit-workout-btn')
    pg.wait_for_selector('.finish-ok')
    pg.click('.finish-ok')
    check('nouvel essai : une seule nouvelle séance enregistrée', pg.evaluate("JSON.parse(localStorage.getItem('h49_state')).history.length")==len(json.loads(before[1])['history'])+1)
    g=snap(pg); check('séance enregistrée : brouillon effacé',not g['draft'])
    pg.reload(); pg.wait_for_timeout(900); pg.evaluate("switchTab('seance')"); h=snap(pg)
    check('rechargement après enregistrement : formulaire neuf (pas de fantôme)',not any(s[2] or s[3] for r in h['rows'] for s in r['sets']))
    ctx.close()
    # brouillon périmé / autre type / valeurs piégées
    for label,mut in (('périmé (> 24 h)',"d.updatedAt=Date.now()-25*3600*1000"),('autre séance (type différent)',"d.type=(d.type==='A'?'B':'A')"),('valeurs piégées (balise HTML)',"d.exercises[1].sets[0].w='\"><img src=x onerror=window.__xss=1>'")):
        ctx,pg,errs=newpage(br,390,844); pg.goto(base+'index.html'); pg.wait_for_timeout(700); pg.evaluate("switchTab('seance')"); pg.evaluate("document.querySelectorAll('#exercises-list .ex-toggle')[1].click()")
        pg.fill('#exercises-list .exercise-item:nth-of-type(2) .set-row:nth-child(1) .weight-input','77'); pg.wait_for_timeout(200)
        pg.evaluate(f"(()=>{{const d=JSON.parse(localStorage.getItem('h49_draft'));{mut};localStorage.setItem('h49_draft',JSON.stringify(d))}})()")
        pg.reload(); pg.wait_for_timeout(900); pg.evaluate("switchTab('seance')")
        v=pg.evaluate("document.querySelector('#exercises-list .exercise-item:nth-of-type(2) .weight-input').value"); xss=pg.evaluate("window.__xss===1")
        if 'piégées' in label: check(f'brouillon {label} : aucun code exécuté',not xss,f'valeur={v!r}')
        else: check(f'brouillon {label} : ignoré',v!='77',f'valeur={v!r}')
        ctx.close()
    ctx,pg,errs=newpage(br); pg.goto(base+'index.html'); pg.wait_for_timeout(500)
    ob=pg.evaluate("[getComputedStyle(document.documentElement).overscrollBehaviorY,getComputedStyle(document.body).overscrollBehaviorY]")
    check('« tirer pour rafraîchir » désactivé (overscroll-behavior-y)',ob==['none','none'],str(ob)); ctx.close()
    br.close()
print('\n',sum(res),'/',len(res),'contrôles OK')
sys.exit(0 if all(res) else 1)
