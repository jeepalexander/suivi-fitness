"""Progression › carte « Trophées » (1.7.67–1.7.68, planche 25d) : records battus chaque mois, comptés
comme les bilans du mois (même périmètre), depuis le premier mois du périmètre ; total en grand +
« depuis <mois> » (ou « tous programmes confondus »), barres fines dorées terminées par un trophée et le
nombre au-dessus, mois en abscisse ; au-delà de la largeur, la rangée défile et s'ouvre sur le mois en cours."""
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
                months:analyzeMonthlyProgress().trophyMonths, scope:currentStatsScope(),
                bilan:analyzeMonthlyProgress().trophyMonths.map(m=>bilanRecordCount(m.key,true)),
                first:statsHistory().map(h=>h.date.slice(0,7)).sort()[0]}}""")
            cols = data['cols']
            unit = 'tous programmes confondus' if data['scope'] == 'all' else 'depuis ' + pg.evaluate(f"monthLabelLower('{data['first']}')")
            ok(f'[{scheme} {w}] titre « Trophées », total en grand, « {unit} »', data['title'] == 'Trophées' and data['unit'] == unit and data['total'] == str(sum(int(c['n']) for c in cols)), data['unit'])
            ok(f'[{scheme} {w}] du premier mois du périmètre au mois en cours', data['months'][0]['key'] == data['first'] and data['months'][-1]['key'] == pg.evaluate("(()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')})()"), [c['m'] for c in cols])
            ok(f'[{scheme} {w}] chaque mois = nombre de records du bilan du mois', [int(c['n']) for c in cols] == data['bilan'], ([c['n'] for c in cols], data['bilan']))
            ok(f'[{scheme} {w}] trophée sur les mois avec records, rond gris sinon', all((int(c['n']) > 0) == c['ico'] and (int(c['n']) == 0) == c['dot'] for c in cols), cols)
            mx = max(int(c['n']) for c in cols) or 1
            ok(f'[{scheme} {w}] hauteur des barres proportionnelle', all(abs(c['h'] - round(84 * int(c['n']) / mx)) <= 1 for c in cols), [(c['n'], c['h']) for c in cols])
            over = pg.evaluate("(()=>{const c=document.querySelector('.trophy-card').getBoundingClientRect();return [...document.querySelectorAll('.trophy-card *')].some(e=>{const r=e.getBoundingClientRect();return r.width&&(r.right>c.right+0.5||r.left<c.left-0.5)})})()")
            ok(f'[{scheme} {w}] rien ne déborde de la carte', not over)
            if w == 390:
                card.scroll_into_view_if_needed(); pg.wait_for_timeout(200)
                card.screenshot(path=os.path.join(SHOTS, f'trophees-{scheme}.png'))
            ok(f'[{scheme} {w}] aucune erreur JavaScript', not errs, errs)
            ctx.close()
    # Données construites (règle des bilans : un 1er passage n'est pas un record) : 0, 2, 0, 1
    ctx, pg, errs = newpage(br, seed=False)
    pg.add_init_script("""(()=>{const d=new Date();const iso=(m,day)=>{const x=new Date(d.getFullYear(),d.getMonth()-m,day);return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0')};
      const s=(m,day,a,b)=>({id:Date.now()-m*1e7-day,date:iso(m,day),type:'A',isDeload:false,tonnage:0,exercises:[{name:'Développé couché',sets:[{weight:a,reps:8}],maxWeight:a,totalVolume:a*8},{name:'Squat',sets:[{weight:b,reps:8}],maxWeight:b,totalVolume:b*8}]});
      if(!localStorage.getItem('h49_state'))localStorage.setItem('h49_state',JSON.stringify({history:[s(3,5,50,80),s(2,5,55,85),s(1,5,50,80),s(0,1,60,80)],weights:[]}));})()""")
    pg.goto(url + 'index.html'); pg.wait_for_timeout(500)
    pg.evaluate("switchTab('progression')"); pg.wait_for_timeout(600)
    ns = pg.evaluate("[...document.querySelectorAll('.trophy-col .trophy-n')].map(e=>+e.textContent)")
    ok('données construites : 4 mois — 0 (1er passage), 2, 0, 1', ns == [0, 2, 0, 1], ns)
    ok('données construites : total 3', pg.evaluate("document.getElementById('trophy-total').textContent") == '3')
    ok('données construites : « tous programmes confondus » ou « depuis <1er mois> »', pg.evaluate("document.getElementById('trophy-since').textContent") == pg.evaluate("currentStatsScope()==='all'?'tous programmes confondus':'depuis '+monthLabelLower(analyzeMonthlyProgress().trophyMonths[0].key)"))
    ok('données construites : identique aux bilans', ns == pg.evaluate("analyzeMonthlyProgress().trophyMonths.map(m=>bilanRecordCount(m.key,true))"))
    ok('aucune erreur JavaScript (données construites)', not errs, errs)
    ctx.close()
    # 1.7.69 : la liste « Records battus ce mois-ci » suit la règle des bilans (cardio compris, pas de 1er passage)
    ctx, pg, errs = newpage(br, seed=False)
    pg.add_init_script("""(()=>{const d=new Date();const iso=(m,day)=>{const x=new Date(d.getFullYear(),d.getMonth()-m,day);return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0')};
      const s=(m,day,w,sec,extra)=>({id:Date.now()-m*1e7-day,date:iso(m,day),type:'A',isDeload:false,tonnage:0,exercises:[{name:'Squat',sets:[{weight:w,reps:8}],maxWeight:w,totalVolume:w*8},{name:'Rameur',cardio:true,sets:[{seconds:sec}]}].concat(extra||[])});
      if(!localStorage.getItem('h49_state'))localStorage.setItem('h49_state',JSON.stringify({history:[s(1,5,80,600),s(0,1,85,720,[{name:'Développé couché',sets:[{weight:60,reps:8}],maxWeight:60,totalVolume:480}])],weights:[]}));})()""")
    pg.goto(url + 'index.html'); pg.wait_for_timeout(500)
    pg.evaluate("switchTab('progression')"); pg.wait_for_timeout(600)
    r = pg.evaluate("""(()=>{const items=[...document.querySelectorAll('.records-list .record-item')].map(e=>[e.querySelector('.record-exercise').textContent,e.querySelector('.record-value').textContent,e.querySelector('.record-improvement').textContent]);
      const n=[...document.querySelectorAll('.trophy-col .trophy-n')].map(e=>+e.textContent);return {items,last:n[n.length-1]}})()""")
    names = sorted(i[0] for i in r['items'])
    ok('liste du mois = trophées du mois (2)', len(r['items']) == r['last'] == 2, r)
    ok('liste : Squat et Rameur, pas le 1er passage au développé couché', names == ['Rameur', 'Squat'], names)
    ok('liste : record de cardio affiché en temps (12:00, +2:00)', ['Rameur', '12:00', '+2:00'] in r['items'], r['items'])
    ok('liste : record de charge inchangé (85 kg, +5 kg)', ['Squat', '85 kg', '+5 kg'] in r['items'], r['items'])
    ok('aucune erreur JavaScript (liste alignée)', not errs, errs)
    ctx.close()
    # Historique long (14 mois) : la rangée défile et s'ouvre sur le mois en cours, sans déborder de la carte
    ctx, pg, errs = newpage(br, w=360, seed=False)
    pg.add_init_script("""(()=>{const d=new Date();const iso=m=>{const x=new Date(d.getFullYear(),d.getMonth()-m,3);return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-03'};
      const h=[];for(let m=13;m>=0;m--)h.push({id:1e12-m,date:iso(m),type:'A',isDeload:false,tonnage:0,exercises:[{name:'Squat',sets:[{weight:60+(13-m)*2.5,reps:8}],maxWeight:60,totalVolume:480}]});
      if(!localStorage.getItem('h49_state'))localStorage.setItem('h49_state',JSON.stringify({history:h,weights:[]}));})()""")
    pg.goto(url + 'index.html'); pg.wait_for_timeout(500)
    pg.evaluate("switchTab('progression')"); pg.wait_for_timeout(600)
    r = pg.evaluate("""(()=>{const s=document.getElementById('trophy-scroll'),c=document.querySelector('.trophy-card').getBoundingClientRect();
      return {n:s.querySelectorAll('.trophy-col').length,scrolls:s.scrollWidth>s.clientWidth,atEnd:Math.abs(s.scrollLeft+s.clientWidth-s.scrollWidth)<=1,
        out:document.querySelector('.trophy-chart').getBoundingClientRect().right>c.right+0.5,total:document.getElementById('trophy-total').textContent}})()""")
    ok('historique long : 14 mois, 13 records (pas le 1er passage)', r['n'] == 14 and r['total'] == '13', r)
    ok('historique long : la rangée défile et s\'ouvre sur le mois en cours', r['scrolls'] and r['atEnd'], r)
    ok('historique long : le graphique reste dans la carte', not r['out'], r)
    pg.locator('.trophy-card').screenshot(path=os.path.join(SHOTS, 'trophees-long.png'))
    ok('aucune erreur JavaScript (historique long)', not errs, errs)
    ctx.close()
    br.close()
print(f"\n {sum(res)} / {len(res)} contrôles OK")
sys.exit(0 if all(res) else 1)
