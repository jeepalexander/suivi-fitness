"""1.7.44 : chaque pastille « 1× » de séance libre est lisible (contraste texte / fond >= 4.4), en clair et en sombre."""
import sys
from harness import *

res = []
def check(name, ok, extra=''):
    ok = bool(ok); res.append(ok)
    print(('OK   ' if ok else 'ÉCHEC'), name, extra)

SCAN = """(()=>{const out=[];const all=[...document.querySelectorAll('body *')].filter(e=>e.childElementCount===0&&e.textContent.trim()==='1×'&&e.getClientRects().length);
for(const e of all){let b=e,bg='';while(b){const c=getComputedStyle(b).backgroundColor;if(c&&c!=='rgba(0, 0, 0, 0)'&&!c.endsWith(', 0)')){bg=c;break}b=b.parentElement}
const parse=s=>s.match(/[\\d.]+/g).slice(0,3).map(Number);const L=c=>{const[r,g,bb]=c.map(v=>{v/=255;return v<=0.03928?v/12.92:((v+0.055)/1.055)**2.4});return 0.2126*r+0.7152*g+0.0722*bb};
const fg=parse(getComputedStyle(e).color),bk=bg?parse(bg):[0,0,0];const l1=L(fg),l2=L(bk);const cr=(Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05);
out.push([e.className||e.parentElement.className, getComputedStyle(e).color, bg, Math.round(cr*10)/10])}return out})()"""

with Srv() as base, sync_playwright() as p:
    br = p.chromium.launch()
    for scheme in ('light', 'dark'):
        ctx, pg, errs = newpage(br, 390, 844, pref=scheme)
        pg.goto(base + 'index.html'); pg.wait_for_timeout(800)
        pg.evaluate("""(()=>{const p=JSON.parse(JSON.stringify(state.programs[0]));p.id='lt';p.kind='libre';p.status='paused';p.name='Test';p.sessions=[Object.assign(p.sessions[0],{key:'',name:'Test'})];state.programs.push(p);
          const h=JSON.parse(JSON.stringify(state.history[state.history.length-1]));h.id=Date.now();h.programId='lt';h.kind='libre';h.programName='Test';state.history.push(h);renderProgramOverview();})()""")
        views = [('Programmes', "switchTab('programme')"),
                 ('Progression (périmètre séance libre)', "statsScope='lt'; switchTab('progression')"),
                 ('Choix du périmètre', "openStatsScopeSheet()"),
                 ('Restauration', "closeSheet(); restoreCandidates=[JSON.parse(JSON.stringify(getProgram('lt')))].map(p=>{p.id='zz';p.savedAt=new Date().toISOString();return p}); restoreSelected=new Set(); renderProgramRestoreList()"),
                 ('Créer (choix)', "closeSheet(); openProgramChooser()"),
                 ('Séance (titre)', "closeSheet(); activateProgram('lt'); switchTab('seance')")]
        for name, js in views:
            pg.evaluate(js); pg.wait_for_timeout(400)
            r = pg.evaluate(SCAN)
            check(f'[{scheme}] {name} : « 1× » lisible', r and all(x[3] >= 4.4 for x in r), str(r))
        check(f'[{scheme}] aucune erreur JavaScript', not errs, str(errs))
        ctx.close()
    br.close()

print(f"\n{sum(res)}/{len(res)} contrôles OK")
sys.exit(0 if all(res) else 1)
