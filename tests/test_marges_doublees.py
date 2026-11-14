"""Mise en page (1.7.70–1.7.71) : nulle part deux marges qui s'additionnent entre deux éléments voisins
(marge du bas de l'un + marge du haut de l'autre dans une colonne flex). Un écart se règle par UNE marge,
pour qu'on sache toujours d'où il vient. Onglets, écran du +, éditeur, bilans, volets (390 px)."""
import sys
from harness import Srv, newpage, sync_playwright

res = []


def ok(n, c, extra=''):
    res.append(bool(c)); print(('OK   ' if c else 'FAIL ') + n, '' if c else str(extra)[:300])


JS = r"""(()=>{const out=[];const vis=e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(e).visibility!=='hidden'};
 const name=e=>e.tagName.toLowerCase()+(e.id?'#'+e.id:'')+(e.className&&typeof e.className==='string'?'.'+e.className.trim().split(/\s+/).slice(0,2).join('.'):'');
 document.querySelectorAll('body *').forEach(p=>{if(!vis(p))return;const ps=getComputedStyle(p);
  const flex=/flex|grid/.test(ps.display)&&(ps.flexDirection||'').startsWith('column')||ps.display.includes('grid');
  const kids=[...p.children].filter(vis);
  for(let i=1;i<kids.length;i++){const a=kids[i-1],b=kids[i];const mb=parseFloat(getComputedStyle(a).marginBottom)||0,mt=parseFloat(getComputedStyle(b).marginTop)||0;
   const ra=a.getBoundingClientRect(),rb=b.getBoundingClientRect(); if(rb.top<ra.bottom-1) continue;
   if(mb>0&&mt>0){const gap=Math.round(rb.top-ra.bottom);if(gap>=Math.max(mb,mt)+1) out.push([name(a),mb,name(b),mt,gap]);}}});
 return out})()"""
SETUPS = {
 'programmes': "0", 'programmes-detail': "programDetailOpen=true; renderProgramOverview(); 0",
 'seance': "switchTab('seance'); 0", 'progression': "switchTab('progression'); 0",
 'historique': "switchTab('historique'); 0", 'reglages': "switchTab('reglages'); 0",
 'choix': "setProgramView('choose'); 0", 'editeur': "editProgram(getActiveProgram().id); 0",
 'bilan': "openBilan(statsHistory()[0].date.slice(0,7), false); 0", 'tous-bilans': "switchTab('progression'); openAllBilans(); 0",
 'sauvegarder': "switchTab('historique'); openBackupSave(); 0", 'restaurer': "switchTab('historique'); openBackupRestore(); 0",
 'inviter': "switchTab('reglages'); openInviteSheet(); 0", 'recevoir': "openReceiveProgram(); 0",
 'ask': "askSheet({tone:'warn',title:'Titre ?',text:'Texte.',ok:'Continuer',cancel:'Annuler'}); 0",
}

with Srv() as url, sync_playwright() as p:
    br = p.chromium.launch()
    for k, s in SETUPS.items():
        ctx, pg, errs = newpage(br)
        pg.goto(url + 'index.html'); pg.wait_for_timeout(500)
        pg.evaluate(s); pg.wait_for_timeout(700)
        found = pg.evaluate(JS)
        ok(f'{k} : aucune marge doublée', not found, found)
        ok(f'{k} : aucune erreur JavaScript', not errs, errs)
        ctx.close()
    br.close()
print(f"\n {sum(res)} / {len(res)} contrôles OK")
sys.exit(0 if all(res) else 1)
