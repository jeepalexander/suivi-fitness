"""Brouillon de séance : la saisie en cours survit à un rechargement (17 contrôles)."""
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
    pg.once('dialog',lambda d:d.accept()); pg.click('#modal-edit-btn'); pg.wait_for_timeout(400)
    e=snap(pg); check('en modification : formulaire de l\'ancienne séance (pas le brouillon)',e['rows']!=a['rows'])
    pg.evaluate("document.querySelector('.exercise-item .ex-toggle').getAttribute('aria-expanded')==='false'&&document.querySelector('.exercise-item .ex-toggle').click()"); pg.wait_for_timeout(150)
    pg.fill('#exercises-list .exercise-item .weight-input','99'); pg.wait_for_timeout(200)
    check('saisie en modification : n\'écrase pas le brouillon',json.loads(pg.evaluate("localStorage.getItem('h49_draft')"))['exercises'][1]['sets'][0]['w']=='61.5')
    pg.evaluate("cancelEditSession()"); pg.wait_for_timeout(500); pg.evaluate("switchTab('seance')")
    f=snap(pg); check('après annulation : saisie en cours retrouvée',[(r['n'],r['sets']) for r in f['rows']]==[(r['n'],r['sets']) for r in a['rows']])
    # enregistrement : brouillon effacé, formulaire neuf
    pg.on('dialog',lambda d:d.accept()); pg.click('#submit-workout-btn'); pg.wait_for_timeout(700)
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
