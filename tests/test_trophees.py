"""Progression › carte « Trophées » (1.7.67, planche 25d) : records battus chaque mois sur 6 mois,
total en grand + « en 6 mois », barres fines dorées terminées par un trophée et le nombre au-dessus,
mois en abscisse ; le mois en cours compte autant que « Records battus ce mois-ci »."""
import os, sys, tempfile
from harness import Srv, newpage, sync_playwright

SHOTS = os.environ.get('SHOTS_DIR') or tempfile.gettempdir()
os.makedirs(SHOTS, exist_ok=True)
res = []


def ok(n, c, extra=''):
    res.append(bool(c)); print(('OK   ' if c else 'FAIL ') + n, '' if c else str(extra)[:200])


with Srv() as url, sync_playwright() as p:
    br = p.chromium.launch()
    for scheme in ('light', 'dark'):
        for w in (390, 360):
            ctx, pg, errs = newpage(br, w=w, pref=scheme, scheme=scheme)
            pg.goto(url + 'index.html'); pg.wait_for_timeout(500)
            pg.evaluate("switchTab('progression')"); pg.wait_for_timeout(700)
            card = pg.query_selector('.trophy-card')
            ok(f'[{scheme} {w}] carte « Trophées » affichée', card is not None)
            if not card:
                ctx.close(); continue
            data = pg.evaluate("""()=>{const c=document.querySelector('.trophy-card');
              return {title:c.querySelector('.analysis-section-title').textContent,total:c.querySelector('#trophy-total').textContent,
                unit:c.querySelector('.weight-unit').textContent,
                cols:[...c.querySelectorAll('.trophy-col')].map(x=>({n:x.querySelector('.trophy-n').textContent,m:x.querySelector('.trophy-month').textContent,
                  ico:!!x.querySelector('.trophy-ico svg'),dot:!!x.querySelector('.trophy-dot'),h:x.querySelector('.trophy-stem').getBoundingClientRect().height})),
                cur:analyzeMonthlyProgress().currentMonthRecords.length, months:analyzeMonthlyProgress().trophyMonths}}""")
            cols = data['cols']
            ok(f'[{scheme} {w}] titre « Trophées », total en grand, « en 6 mois »', data['title'] == 'Trophées' and data['unit'] == 'en 6 mois' and data['total'] == str(sum(int(c['n']) for c in cols)), data)
            ok(f'[{scheme} {w}] 6 mois, du plus ancien au mois en cours', len(cols) == 6 and data['months'][-1]['key'] == pg.evaluate("new Date().toISOString().slice(0,7)"), [c['m'] for c in cols])
            ok(f'[{scheme} {w}] trophée sur les mois avec records, rond gris sinon', all((int(c['n']) > 0) == c['ico'] and (int(c['n']) == 0) == c['dot'] for c in cols), cols)
            mx = max(int(c['n']) for c in cols) or 1
            ok(f'[{scheme} {w}] hauteur des barres proportionnelle', all(abs(c['h'] - round(84 * int(c['n']) / mx)) <= 1 for c in cols), [(c['n'], c['h']) for c in cols])
            ok(f'[{scheme} {w}] mois en cours = « Records battus ce mois-ci »', int(cols[-1]['n']) == data['cur'], (cols[-1]['n'], data['cur']))
            over = pg.evaluate("(()=>{const c=document.querySelector('.trophy-card').getBoundingClientRect();return [...document.querySelectorAll('.trophy-card *')].some(e=>{const r=e.getBoundingClientRect();return r.width&&(r.right>c.right+0.5||r.left<c.left-0.5)})})()")
            ok(f'[{scheme} {w}] rien ne déborde de la carte', not over)
            if w == 390:
                card.scroll_into_view_if_needed(); pg.wait_for_timeout(200)
                card.screenshot(path=os.path.join(SHOTS, f'trophees-{scheme}.png'))
            ok(f'[{scheme} {w}] aucune erreur JavaScript', not errs, errs)
            ctx.close()
    # Données construites : 2 records en mois -2, aucun en mois -1, 1 au mois en cours
    ctx, pg, errs = newpage(br, seed=False)
    pg.add_init_script("""(()=>{const d=new Date();const iso=(m,day)=>{const x=new Date(d.getFullYear(),d.getMonth()-m,day);return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0')};
      const s=(m,day,a,b)=>({id:Date.now()-m*1e7-day,date:iso(m,day),type:'A',isDeload:false,tonnage:0,exercises:[{name:'Développé couché',sets:[{weight:a,reps:8}],maxWeight:a,totalVolume:a*8},{name:'Squat',sets:[{weight:b,reps:8}],maxWeight:b,totalVolume:b*8}]});
      if(!localStorage.getItem('h49_state'))localStorage.setItem('h49_state',JSON.stringify({history:[s(3,5,50,80),s(2,5,55,85),s(1,5,50,80),s(0,1,60,80)],weights:[]}));})()""")
    pg.goto(url + 'index.html'); pg.wait_for_timeout(500)
    pg.evaluate("switchTab('progression')"); pg.wait_for_timeout(600)
    ns = pg.evaluate("[...document.querySelectorAll('.trophy-col .trophy-n')].map(e=>+e.textContent)")
    ok('données construites : 2 premiers records (mois -3), 2 (mois -2), 0 (mois -1), 1 (mois en cours)', ns[-4:] == [2, 2, 0, 1], ns)
    ok('données construites : total 5', pg.evaluate("document.getElementById('trophy-total').textContent") == '5')
    ok('aucune erreur JavaScript (données construites)', not errs, errs)
    ctx.close()
    br.close()
print(f"\n {sum(res)} / {len(res)} contrôles OK")
sys.exit(0 if all(res) else 1)
