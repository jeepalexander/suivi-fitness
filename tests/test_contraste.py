"""1.7.46 (co-auteur : Claude) : lisibilité de tout l'écran, en clair et en sombre, sur 18 écrans.
Textes : contraste >= 4,5:1 (>= 3:1 à partir de 24 px ou 18,7 px gras). Icônes : >= 3:1.
Non mesurés : la tuile de progression (dégradé) et les valeurs suggérées pâles (« todo », voulues).
Exception décidée le 11/11/2026 : le « 1× » doré des pastilles non remplies en sombre (4,36:1) est gardé tel quel."""
import sys, json
from harness import *

TXT = r"""(screen)=>{
const parse=s=>{const m=s.match(/rgba?\(([^)]+)\)/);if(!m)return null;const p=m[1].split(/[ ,\/]+/).filter(Boolean).map(Number);return [p[0],p[1],p[2],p.length>3?p[3]:1]};
const L=c=>{const[r,g,b]=c.slice(0,3).map(v=>{v/=255;return v<=0.03928?v/12.92:((v+0.055)/1.055)**2.4});return 0.2126*r+0.7152*g+0.0722*b};
const blend=(top,bot)=>{const a=top[3];return [top[0]*a+bot[0]*(1-a),top[1]*a+bot[1]*(1-a),top[2]*a+bot[2]*(1-a),1]};
const out=[];const seen=new Set();
const els=[...document.querySelectorAll('body *')].filter(e=>{if(!e.getClientRects().length)return false;const t=[...e.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join('').trim();return t.length>0});
for(const e of els){
  const cs=getComputedStyle(e); if(cs.visibility==='hidden'||+cs.opacity===0)continue;
  const r=e.getBoundingClientRect(); if(r.bottom<0||r.top>innerHeight||r.width<2)continue;
  // élément réellement visible au premier plan ?
  const cx=Math.min(Math.max(r.left+r.width/2,0),innerWidth-1), cy=Math.min(Math.max(r.top+r.height/2,0),innerHeight-1);
  const hit=document.elementFromPoint(cx,cy); if(!hit||!(hit===e||e.contains(hit)||hit.contains(e)))continue;
  if(e.closest('[disabled],.todo,.is-todo')||cs.color===cs.backgroundColor)continue;
  let layers=[],img=false,b=e,op=1;
  while(b){const s=getComputedStyle(b);op*=+s.opacity;if(s.backgroundImage&&s.backgroundImage!=='none'&&!b.matches('html,body'))img=s.backgroundImage.slice(0,40);
    const c=parse(s.backgroundColor);if(c&&c[3]>0){layers.push(c);if(c[3]>=1)break}b=b.parentElement}
  let bg=[255,255,255,1];if(document.documentElement.dataset.theme==='dark')bg=parse(getComputedStyle(document.body).backgroundColor)||[14,14,17,1];
  for(let i=layers.length-1;i>=0;i--)bg=blend(layers[i],bg);
  let fg=parse(cs.color); fg=blend([fg[0],fg[1],fg[2],fg[3]*op],bg);
  const l1=L(fg),l2=L(bg),cr=(Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05);
  const size=parseFloat(cs.fontSize),bold=+cs.fontWeight>=700,large=size>=24||(size>=18.6&&bold);
  const need=large?3:4.5;
  if(cr<need){const txt=[...e.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join('').trim().slice(0,40);
    const k=txt+'|'+cs.color;if(seen.has(k))continue;seen.add(k);
    out.push({screen,txt,cls:(e.id?'#'+e.id+' ':'')+(typeof e.className==='string'?e.className:''),fg:cs.color,cr:Math.round(cr*100)/100,need,img,op:Math.round(op*100)/100})}
}return out}"""
ICO = r"""(screen)=>{
const parse=s=>{const m=(s||'').match(/rgba?\(([^)]+)\)/);if(!m)return null;const p=m[1].split(/[ ,\/]+/).filter(Boolean).map(Number);return [p[0],p[1],p[2],p.length>3?p[3]:1]};
const L=c=>{const[r,g,b]=c.slice(0,3).map(v=>{v/=255;return v<=0.03928?v/12.92:((v+0.055)/1.055)**2.4});return 0.2126*r+0.7152*g+0.0722*b};
const blend=(top,bot)=>{const a=top[3];return [top[0]*a+bot[0]*(1-a),top[1]*a+bot[1]*(1-a),top[2]*a+bot[2]*(1-a),1]};
const out=[];const seen=new Set();
for(const svg of document.querySelectorAll('svg')){
  const r=svg.getBoundingClientRect(); if(!svg.getClientRects().length||r.width<8||r.bottom<0||r.top>innerHeight)continue;
  const hit=document.elementFromPoint(Math.min(Math.max(r.left+r.width/2,0),innerWidth-1),Math.min(Math.max(r.top+r.height/2,0),innerHeight-1));
  if(!hit||!(hit===svg||svg.contains(hit)||hit.contains(svg)||(hit.closest&&hit.closest('button,a,span,div')&&hit.closest('button,a,span,div').contains(svg))))continue;
  if(svg.closest('#hero, .hero, .progress-hero, [class*=hero]'))continue; // dégradé : non mesurable ici
  const shape=svg.querySelector('path,circle,rect,line,polyline,polygon')||svg; const cs=getComputedStyle(shape);
  let col=null; if(cs.stroke&&cs.stroke!=='none'&&parse(cs.stroke))col=parse(cs.stroke); else if(cs.fill&&cs.fill!=='none'&&parse(cs.fill))col=parse(cs.fill);
  if(!col)continue;
  let layers=[],b=svg.parentElement,op=+getComputedStyle(svg).opacity;
  while(b){const s=getComputedStyle(b);op*=+s.opacity;const c=parse(s.backgroundColor);if(c&&c[3]>0){layers.push(c);if(c[3]>=1)break}b=b.parentElement}
  let bg=document.documentElement.dataset.theme==='dark'?(parse(getComputedStyle(document.body).backgroundColor)||[14,14,17,1]):[255,255,255,1];
  for(let k=layers.length-1;k>=0;k--)bg=blend(layers[k],bg);
  const fg=blend([col[0],col[1],col[2],col[3]*op],bg);
  const l1=L(fg),l2=L(bg),cr=(Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05);
  if(cr<3){const host=svg.closest('button,a,[class]');const lab=(host&&(host.getAttribute('aria-label')||host.className&&String(host.className.baseVal??host.className)))||'';
    const k=lab+'|'+cs.stroke+cs.fill;if(seen.has(k))continue;seen.add(k);
    out.push({screen,txt:(host&&host.textContent||'').trim().slice(0,30),cls:String(lab).slice(0,60)+' > '+(svg.getAttribute('class')||''),fg:'rgb('+col.slice(0,3).join(',')+')',cr:Math.round(cr*100)/100,need:3,img:false,op:Math.round(op*100)/100})}
}return out}"""
STEPS = [
 ('Programmes', "closeSheet&&closeSheet(); switchTab('programme')"),
 ('Programmes · détail', "toggleProgramDetail&&toggleProgramDetail()"),
 ('Choix créer', "openProgramChooser()"),
 ('Éditeur', "closeSheet(); editProgram(getActiveProgram().id)"),
 ('Ajout exercice', "openAddExercise()"),
 ('Séance', "cancelAddExercise&&cancelAddExercise(); programEditorBack&&0; switchTab('seance')"),
 ('Séance libre', "switchTab('programme'); activateProgram('lt'); switchTab('seance')"),
 ('Progression', "activateProgram(state.programs[0].id); statsScope=null; switchTab('progression')"),
 ('Progression · bas', "window.scrollTo(0, document.body.scrollHeight/2)"),
 ('Choix périmètre', "window.scrollTo(0,0); openStatsScopeSheet()"),
 ('Historique', "closeSheet(); switchTab('historique')"),
 ('Détail séance', "openSessionModal(state.history.length-1)"),
 ('Réglages', "closeSessionModal&&closeSessionModal(); document.querySelectorAll('.modal').forEach(m=>m.style.display='none'); switchTab('reglages')"),
 ('Fond d\'écran', "switchTab('fond')"),
 ('Restauration', "switchTab('programme'); restoreCandidates=[JSON.parse(JSON.stringify(getProgram('lt')))].map(p=>{p.id='zz';p.savedAt=new Date().toISOString();return p}); restoreSelected=new Set(); renderProgramRestoreList()"),
 ('Volet suppression', "closeSheet(); askSheet({tone:'danger',title:'Supprimer la séance A du 08/11 ?',text:'Cette séance sera retirée de ton historique.',ok:'Supprimer la séance',cancel:'Annuler',danger:true})"),
 ('Volet attention', "document.querySelectorAll('.ask-sheet .btn-secondary, #ask-sheet .btn-secondary').forEach(b=>b.click()); askSheet({tone:'warn',title:'Attention',text:'Revenir en arrière annulera la saisie. Continuer ?',ok:'Revenir en arrière',cancel:'Annuler'})"),
 ('Fin de séance', "document.querySelectorAll('.ask-sheet .btn-secondary, #ask-sheet .btn-secondary').forEach(b=>b.click()); const h=state.history[state.history.length-1]; openFinishDialog(h, state.history[state.history.length-2], [{name:'Presse à cuisses', text:'90 kg'}])"),
]
# Exceptions validées : (thème, texte, couleur)
EXCEPTIONS = {('dark', '1×', 'rgb(168, 118, 31)')}

res = []
def check(name, ok, extra=''):
    ok = bool(ok); res.append(ok)
    print(('OK   ' if ok else 'ÉCHEC'), name, extra)

with Srv() as base, sync_playwright() as p:
    br = p.chromium.launch()
    for scheme in ('light', 'dark'):
        ctx, pg, errs = newpage(br, 390, 844, pref=scheme, native_dialogs=False)
        pg.goto(base + 'index.html'); pg.wait_for_timeout(900)
        pg.evaluate("""(()=>{const p=JSON.parse(JSON.stringify(state.programs[0]));p.id='lt';p.kind='libre';p.status='paused';p.name='Test';p.sessions=[Object.assign(p.sessions[0],{key:'',name:'Test'})];state.programs.push(p);
          const h=JSON.parse(JSON.stringify(state.history[state.history.length-1]));h.id=Date.now();h.programId='lt';h.kind='libre';h.programName='Test';state.history.push(h);renderProgramOverview();})()""")
        for name, js in STEPS:
            pg.evaluate(f"(()=>{{{js}}})()"); pg.wait_for_timeout(450)
            faibles = [x for x in pg.evaluate(f"({TXT})({json.dumps(name)})") if not x['img'] and (scheme, x['txt'], x['fg']) not in EXCEPTIONS]
            check(f'[{scheme}] {name} : textes lisibles', not faibles, json.dumps(faibles, ensure_ascii=False)[:600])
            ico = pg.evaluate(f"({ICO})({json.dumps(name)})")
            check(f'[{scheme}] {name} : icônes lisibles', not ico, json.dumps(ico, ensure_ascii=False)[:600])
        check(f'[{scheme}] aucune erreur JavaScript', not errs, str(errs))
        ctx.close()
    br.close()

print(f"\n{sum(res)}/{len(res)} contrôles OK")
sys.exit(0 if all(res) else 1)
