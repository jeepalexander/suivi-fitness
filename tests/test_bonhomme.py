"""Petit bonhomme pixel (1.8.97, co-auteur : Claude) : sur l'accueil Programmes seulement, entre l'accueil manuscrit et
« Programme actif » ; piste d'un bord de l'écran à l'autre, sans débordement ; couleur du texte ; interrupteur
« Petit bonhomme » des Réglages (Affiché / Masqué) ; absent si le téléphone demande moins d'animations ; demi-tour avant
le post-it du bilan (porte seulement à gauche) ; porte à la marge de la page ; jamais deux fois la même animation ; humeur déload et record.
390 et 360 px, clair et sombre. Captures dans /tmp/bonhomme."""
import os, sys
from harness import Srv, sync_playwright, newpage, ouvrir, debordements, Bilan, variantes

OUT = '/tmp/bonhomme'
os.makedirs(OUT, exist_ok=True)
b = Bilan()
VISIBLE = "(()=>{const l=document.querySelector('.bh-lane');return !!(l&&l.isConnected&&getComputedStyle(l).display!=='none'&&l.style.visibility!=='hidden'&&l.getBoundingClientRect().height>0)})()"
# Couleur la plus présente parmi les pixels opaques du bonhomme, comparée à --text
ENCRE = """(()=>{const c=document.querySelector('.bh-man');const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
const cnt={};for(let i=0;i<d.length;i+=4){if(d[i+3]<255)continue;const k=d[i]+','+d[i+1]+','+d[i+2];cnt[k]=(cnt[k]||0)+1}
const t=getComputedStyle(document.documentElement).getPropertyValue('--text').trim();const x=document.createElement('canvas').getContext('2d');x.fillStyle=t;x.fillRect(0,0,1,1);
const v=x.getImageData(0,0,1,1).data;return {ink:(cnt[v[0]+','+v[1]+','+v[2]]||0)}})()"""
# 1.8.100 : caché = ni la piste ni le dessin du bonhomme à l'écran (le dessin forçait sa visibilité et restait figé)
CACHE = "(()=>{const l=document.querySelector('.bh-lane'),m=document.querySelector('.bh-man');if(!l||!l.isConnected||getComputedStyle(l).display==='none')return true;return getComputedStyle(m).visibility!=='visible'})()"
POSTIT = ("bilanPostitHtml=()=>'<div class=\"bilan-postit-row\"><button type=\"button\" class=\"bilan-postit\">"
          "<span class=\"bilan-postit-text\">Ton bilan<br>du mois<br>d\\'octobre</span></button></div>';renderProgramOverview()")

with Srv() as url, sync_playwright() as p:
    br = p.chromium.launch()
    for w, theme in variantes():
        tag = f'[{w} {theme}] '
        ctx, pg, errs = newpage(br, w, 844, pref=theme, scheme=theme)
        pg.goto(url + 'index.html'); pg.wait_for_timeout(800)
        ouvrir(pg, 'programmes', 300)
        pg.wait_for_timeout(2600)
        b.ok(tag + 'accueil : le bonhomme est là, piste bord à bord', pg.evaluate(VISIBLE)
             and pg.evaluate("document.querySelector('.bh-lane').getBoundingClientRect().width") == w)
        b.ok(tag + 'piste entre l\'accueil manuscrit et « Programme actif »',
             pg.evaluate("(()=>{const l=document.querySelector('.bh-lane').getBoundingClientRect(),s=document.querySelector('.prog-status').getBoundingClientRect();return l.bottom<=s.top+1})()"))
        pg.wait_for_timeout(2000)
        b.ok(tag + 'dessiné à la couleur du texte', pg.evaluate(ENCRE)['ink'] > 30, pg.evaluate(ENCRE))
        b.ok(tag + 'sans débordement ni erreur', not debordements(pg) and not errs, (debordements(pg), errs))
        pg.screenshot(path=f'{OUT}/{w}_{theme}_accueil.png')
        # 1.8.100 : écran « Ajouter » (bouton +) : plus de bonhomme figé par-dessus les cartes, puis il revient sur l'accueil
        pg.evaluate("openProgramChooser()"); pg.wait_for_timeout(300)
        b.ok(tag + 'caché sur « Ajouter » dès l\'ouverture (1.8.100)', pg.evaluate(CACHE))
        pg.wait_for_timeout(1300)
        b.ok(tag + 'toujours caché sur « Ajouter » (1.8.100)', pg.evaluate(CACHE))
        pg.evaluate("setProgramView('home')"); pg.wait_for_timeout(2600)
        b.ok(tag + 'de retour sur l\'accueil, la piste reprend sa place au-dessus de « Programme actif » (1.8.100)', pg.evaluate(VISIBLE)
             and pg.evaluate("(()=>{const l=document.querySelector('.bh-lane').getBoundingClientRect(),s=document.querySelector('.prog-status').getBoundingClientRect();return l.bottom<=s.top+1})()"))
        # Autres écrans : caché
        ouvrir(pg, 'progression', 1300)
        b.ok(tag + 'caché sur Progression', pg.evaluate(CACHE))
        ouvrir(pg, 'seance', 1300)
        b.ok(tag + 'caché pendant la séance', pg.evaluate(CACHE))
        ouvrir(pg, 'programmes', 1300)
        b.ok(tag + 'revient sur l\'accueil', pg.evaluate(VISIBLE))
        # Réglages : Affiché / Masqué
        ouvrir(pg, 'reglages', 300)
        b.ok(tag + 'Réglages : carte « Petit bonhomme », Affiché choisi',
             pg.locator('#bonhomme-choice [data-bh-choice="on"].active').count() == 1 and pg.is_visible('.bonhomme-card'))
        b.ok(tag + 'Réglages sans débordement', not debordements(pg), debordements(pg))
        pg.screenshot(path=f'{OUT}/{w}_{theme}_reglages.png')
        pg.click('#bonhomme-choice [data-bh-choice="off"]'); pg.wait_for_timeout(200)
        ouvrir(pg, 'programmes', 1300)
        b.ok(tag + 'Masqué : plus de bonhomme ni de zone réservée',
             pg.evaluate(CACHE) and pg.locator('.bh-zone.on').count() == 0 and pg.evaluate("localStorage.getItem('h49_bonhomme')") == 'off')
        ouvrir(pg, 'reglages', 200); pg.click('#bonhomme-choice [data-bh-choice="on"]'); ouvrir(pg, 'programmes', 1300)
        b.ok(tag + 'Affiché : il revient', pg.evaluate(VISIBLE))
        # Moins d'animations : absent
        pg.emulate_media(reduced_motion='reduce'); pg.wait_for_timeout(1300)
        b.ok(tag + 'moins d\'animations : absent, sans zone réservée',
             pg.evaluate(CACHE) and pg.evaluate("document.querySelector('.bh-zone').getBoundingClientRect().height") < 66)
        pg.emulate_media(reduced_motion='no-preference'); pg.wait_for_timeout(1300)
        b.ok(tag + 'animations rétablies : il revient', pg.evaluate(VISIBLE))
        ctx.close()

    # Post-it du bilan, humeurs, pas de répétition (390, clair)
    ctx, pg, errs = newpage(br, 390, 844)
    pg.goto(url + 'index.html'); pg.wait_for_timeout(800)
    ouvrir(pg, 'programmes', 300); pg.evaluate(POSTIT); pg.wait_for_timeout(600)
    pl = pg.evaluate("bhPostitLeft()")
    b.ok('post-it : limite de la promenade avant le post-it', pl is not None and pg.evaluate("bhMaxX()") <= pl - 40, (pl, pg.evaluate("bhMaxX()")))
    pg.evaluate("bonhomme.queue=[];bonhomme.hidden=false;bonhomme.mode='walk';bonhomme.left=40;bonhomme.dir=1;bonhomme.cx=bhMaxX()-9")
    pg.wait_for_timeout(2000)
    b.ok('post-it : il fait demi-tour sans passer dessous', pg.evaluate("bonhomme.cx<=bhMaxX()&&bonhomme.dir===-1"), pg.evaluate("[bonhomme.cx,bonhomme.dir,bhMaxX()]"))
    b.ok('post-it : la porte n\'apparaît qu\'à gauche', pg.evaluate("[bhSetSide(true),bonhomme.door.side]") == [False, -1])
    b.ok('porte à gauche : la marge de la page entre la porte et le bord (1.8.98)', pg.evaluate("bonhomme.door.x-16") == 26)
    pg.evaluate("bilanPostitHtml=()=>'';renderProgramOverview()"); pg.wait_for_timeout(300)
    b.ok('porte à droite : la marge de la page entre la porte et le bord (1.8.98)', pg.evaluate("[bhSetSide(true),bonhomme.W-(bonhomme.door.x+16)]") == [True, 26])
    b.ok('post-it au-dessus de la piste, sans débordement (1.8.98 : le post-it penché ne dépasse plus)', not debordements(pg), debordements(pg))
    pg.screenshot(path=f'{OUT}/postit.png')
    b.ok('jamais deux fois la même animation de suite',
         pg.evaluate("(()=>{for(let i=0;i<200;i++){const a=bhPick();if(a===bonhomme.last)return false;bonhomme.last=a}return true})()"))
    b.ok('les 13 exercices existent', pg.evaluate("BH.ALL.length===13&&BH.ALL.every(a=>BH.ACT[a])"))
    b.ok('déload : sieste, corde ou curl',
         pg.evaluate("(()=>{const o=isDeloadActive;isDeloadActive=()=>true;localStorage.removeItem('h49_bonhomme_record');let ok=true;for(let i=0;i<50;i++){const a=bhPick();bonhomme.last=a;if(!['Sieste','Corde','Curl biceps'].includes(a))ok=false}isDeloadActive=o;return ok})()"))
    b.ok('record du jour : saut de joie, squat ou soulevé de terre',
         pg.evaluate("(()=>{bonhommeNoteRecord();let ok=true;for(let i=0;i<50;i++){const a=bhPick();bonhomme.last=a;if(!['Fête','Squat barre','Soulevé de terre'].includes(a))ok=false}localStorage.removeItem('h49_bonhomme_record');return ok})()"))
    b.ok('toutes les animations se dessinent sans erreur',
         pg.evaluate("(()=>{try{Object.values(BH.ACT).forEach(a=>a.f.forEach(f=>bhDraw(f,a.sp)));return true}catch(e){return String(e)}})()") is True and not errs, errs)
    ctx.close()
    br.close()
sys.exit(b.fin())
