"""Validation des séries : seules les séries cochées sont enregistrées (11 contrôles)."""
import json, sys
from harness import *
res=[]
def ok(n,c,extra=''): res.append(c); print(('OK   ' if c else 'FAIL ')+n,extra)
with Srv() as url, sync_playwright() as p:
    br=p.chromium.launch()
    ctx,pg,errs=newpage(br,pref='light'); msgs=[]; resp={'confirm':True}
    def on(d):
        msgs.append((d.type,d.message))
        d.accept() if (d.type!='confirm' or resp['confirm']) else d.dismiss()
    pg.on('dialog',on)
    pg.goto(url); pg.wait_for_timeout(500); pg.evaluate("switchTab('seance')"); pg.wait_for_timeout(200)
    hist=lambda: json.loads(pg.evaluate("localStorage.getItem('h49_state')"))['history']
    n0=len(hist())
    submit="document.getElementById('workout-form').requestSubmit()"
    # 1 aucune série cochée
    pg.evaluate(submit); ok('aucune série cochée : refus',len(hist())==n0 and msgs and 'Aucune série' in msgs[-1][1])
    # 2 deux séries cochées de l'exercice 1, confirmation annulée
    pg.evaluate("document.querySelectorAll('.exercise-item')[0].querySelector('.ex-toggle').click()")
    pg.evaluate("document.querySelectorAll('.set-row')[0].querySelector('.btn-check-set').click();document.querySelectorAll('.set-row')[1].querySelector('.btn-check-set').click()")
    total=pg.evaluate("document.querySelectorAll('.set-row').length")
    msgs.clear(); resp['confirm']=False; pg.evaluate(submit)
    ok('séance partielle : confirmation demandée',msgs and msgs[-1][0]=='confirm' and '2 séries cochées' in msgs[-1][1] and f'{total-2} séries non cochées' in msgs[-1][1],msgs[-1][1].replace('\n',' | ') if msgs else '')
    ok('confirmation refusée : rien enregistré',len(hist())==n0)
    # 3 série cochée avec poids 0
    pg.evaluate("document.querySelectorAll('.set-row')[1].querySelector('.weight-input').value='0'")
    msgs.clear(); resp['confirm']=True; pg.evaluate(submit)
    foc=pg.evaluate("document.activeElement.className+'|'+(document.activeElement.closest('.set-row')===document.querySelectorAll('.set-row')[1])")
    ok('série cochée invalide : refus + focus',len(hist())==n0 and msgs and 'pas valides' in msgs[-1][1] and 'weight-input' in foc,foc)
    pg.evaluate("document.querySelectorAll('.set-row')[1].querySelector('.weight-input').value='62.5'")
    # 4 enregistrement partiel accepté
    msgs.clear(); pg.evaluate(submit); pg.wait_for_timeout(300)
    h=hist(); last=h[-1] if h else None
    ok('séance partielle enregistrée',len(h)==n0+1 and last and len(last['exercises'])==1 and len(last['exercises'][0]['sets'])==2,json.dumps(last['exercises'])[:120] if last else '')
    ok('tonnage = séries cochées seulement',last and last['tonnage']==round(sum(s['weight']*s['reps'] for s in last['exercises'][0]['sets'])))
    ok('message : séries enregistrées',any('Séries enregistrées : 2' in m[1] for m in msgs))
    # 5 modification : seules les séries enregistrées sont précochées
    idx=len(h)-1
    pg.evaluate("i=>{switchTab('historique');openSessionModal(i)}",idx)
    pg.evaluate("document.getElementById('modal-edit-btn').click()"); pg.wait_for_timeout(300)
    done=pg.evaluate("[...document.querySelectorAll('.set-row')].map(r=>r.classList.contains('done'))")
    ok('modification : 2 séries précochées seulement',sum(done)==2 and done[0] and done[1] and len(done)==total,str(sum(done)))
    ok('compteur de progression',pg.evaluate("document.getElementById('sets-progress-text').innerText")==f'2 / {total}')
    # 6 tout coché : pas de confirmation
    pg.evaluate("document.querySelectorAll('.set-row:not(.done) .btn-check-set').forEach(b=>b.click())")
    msgs.clear(); pg.evaluate(submit); pg.wait_for_timeout(300)
    ok('tout coché : aucune confirmation',not any(m[0]=='confirm' for m in msgs) and len(hist())==n0+1 and sum(len(e['sets']) for e in hist()[idx]['exercises'])==total,str([m[0] for m in msgs]))
    ok('aucune erreur JS',not errs,str(errs))
    br.close()
print(f"\n {sum(res)} / {len(res)} contrôles OK")
sys.exit(0 if all(res) else 1)
