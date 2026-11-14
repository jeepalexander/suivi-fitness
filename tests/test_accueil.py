"""Accueil Programmes (1.7.24) : message manuscrit selon l'heure et le contexte ; tuile active compacte (−25 %), mêmes informations."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from harness import Srv, newpage, sync_playwright, OVERFLOW_JS

OK = True
def check(label, cond, detail=''):
    global OK
    print(('  OK  ' if cond else '  ÉCHEC ') + label + ('' if cond else f'  -> {detail}'))
    OK = OK and bool(cond)

G = "(d, hist, act) => { state.history = hist; const g = programGreeting(act === 'none' ? null : getActiveProgram(), new Date(d)); return g.hello + ' | ' + g.line; }"
with Srv() as base, sync_playwright() as p:
    br = p.chromium.launch()
    for w in (390, 360):
        ctx, pg, errs = newpage(br, w=w)
        pg.goto(base + 'index.html'); pg.wait_for_timeout(1200)
        check(f"[{w}px] message manuscrit (Caveat) en haut de l'accueil", pg.locator('#tab-programme .prog-greet').count() == 1
              and 'Caveat' in pg.evaluate("getComputedStyle(document.querySelector('.prog-greet-hello')).fontFamily")
              and pg.evaluate("[...document.fonts].some(f=>f.family.includes('Caveat')&&f.status==='loaded')"))
        tile = pg.evaluate("""(()=>{const t=document.querySelector('.prog-tile');const r=e=>{const b=e.getBoundingClientRect();return [Math.round(b.left),Math.round(b.right),Math.round(b.top),Math.round(b.bottom)]};
            return {h:Math.round(t.getBoundingClientRect().height), txt:t.innerText, tile:r(t), ico:r(t.querySelector('.prog-ico')), pill:r(t.querySelector('.prog-tile-next .type-pill')),
            name:r(t.querySelector('.prog-tile-name')), sess:r(t.querySelector('.prog-tile-session')), det:r(t.querySelector('.prog-tile-foot .prog-detail-btn')), start:r(t.querySelector('.prog-tile-foot .btn-start')),
            line:r(t.querySelector('.prog-tile-line')), deload:!!t.querySelector('.prog-tile-sum .deload-inline')}})()""")
        check(f"[{w}px] tuile active compacte (≤ 215 px avec la pastille déload, 278 px avant)", tile['h'] <= 215, tile['h'])
        check(f"[{w}px] mêmes informations : nom, séance, exercices · séries, + de détail, démarrer, déload",
              'exercice' in tile['txt'] and 'série' in tile['txt'] and ('Déload' in tile['txt']) == tile['deload'], tile['txt'])
        check(f"[{w}px] pastille de séance de la taille de l'icône du programme, dans la même colonne", tile['pill'][1] - tile['pill'][0] == 40 and tile['pill'][0] == tile['ico'][0])
        check(f"[{w}px] nom de la séance aligné sur le nom du programme", tile['sess'][0] == tile['name'][0])
        check(f"[{w}px] « + de détail » en bas à gauche, démarrer en bas à droite, alignés sur le bas", tile['det'][0] == tile['ico'][0] and tile['start'][1] == tile['tile'][1] - 12 and tile['det'][3] == tile['start'][3])
        check(f"[{w}px] trait pointillé : de sous l'icône jusqu'à « + de détail », sur l'axe de l'icône", tile['line'][2] == tile['ico'][3] and tile['line'][3] == tile['det'][2] and abs((tile['line'][0] + tile['line'][1]) / 2 - (tile['ico'][0] + tile['ico'][1]) / 2) <= 1, tile)
        st = pg.evaluate("""(()=>{const tx=sel=>{const e=document.querySelector(sel);const n=[...e.childNodes].reverse().find(n=>n.nodeType===3&&n.textContent.trim());const R=document.createRange();R.selectNodeContents(n);return [Math.round(R.getBoundingClientRect().left), n.textContent.trim()]};
            return {actif:tx('.prog-status'), mem:tx('.prog-mem-title')}})()""")
        check(f"[{w}px] « Programme actif » aligné sur « En mémoire »", st['actif'][1] == 'Programme actif' and st['actif'][0] == st['mem'][0], st)
        pg.evaluate("programDraft={id:null,kind:'program',name:'Force',sessions:[{name:'Haut',exercises:[{exId:exInfo('Dips').id,sets:3}]},{name:'Bas',exercises:[{exId:exInfo('Mollets').id,sets:3}]}],idx:0}; saveProgramDraft(false)"); pg.wait_for_timeout(400)
        al = pg.evaluate("(()=>{const r=e=>{const b=e.getBoundingClientRect();return [Math.round(b.left),Math.round(b.right)]};return {ico:r(document.querySelector('.prog-tile .prog-ico')), start:r(document.querySelector('.prog-tile .btn-start')), mi:r(document.querySelector('.mem-tile .mem-ico')), mb:r(document.querySelector('.mem-tile button'))}})()")
        check(f"[{w}px] tuile active alignée sur les programmes en mémoire (icônes à gauche, boutons à droite)", al['ico'][0] == al['mi'][0] and al['start'][1] == al['mb'][1], al)
        ov = pg.evaluate(OVERFLOW_JS)
        check(f"[{w}px] rien ne déborde", ov['docW'] <= ov['vw'] and not ov['out'], ov)
        check(f"[{w}px] aucune erreur JavaScript", not errs, errs)
        if w == 390:
            today = pg.evaluate("new Date().toISOString().slice(0,10)")
            def g(d, hist, act='on'): return pg.evaluate(f"([d,h,a]) => ({G})(d,h,a)", [d, hist, act])
            check("9 h : « Bonjour »", g('2026-11-09T09:00:00', [{'date': '2026-11-07'}]).startswith('Bonjour |'))
            check("20 h : « Bonsoir »", g('2026-11-09T20:00:00', [{'date': '2026-11-07'}]).startswith('Bonsoir |'))
            check("2 h du matin : « Bonsoir »", g('2026-11-09T02:00:00', [{'date': '2026-11-07'}]).startswith('Bonsoir |'))
            check("séance déjà faite aujourd'hui : récup", 'récup' in g('2026-11-09T12:00:00', [{'date': '2026-11-09'}]))
            check("10 jours sans séance : « Content de te revoir »", 'revoir' in g('2026-11-20T12:00:00', [{'date': '2026-11-09'}]))
            check("aucune séance encore : « première séance »", 'première séance' in g('2026-11-09T12:00:00', []))
            check("pas de programme actif : « Choisis ton programme »", 'Choisis ton programme' in g('2026-11-09T12:00:00', [{'date': '2026-11-07'}], 'none'))
            l = g('2026-11-09T12:00:00', [{'date': '2026-11-07'}])
            check("sinon : « Prêt à te dépasser » (ou semaine légère en déload)", ('dépasser' in l) or ('Semaine légère' in l), l)
        ctx.close()
    br.close()
from PIL import Image
im = Image.open(Path(__file__).resolve().parent.parent / 'wallpapers' / 'poigne.jpg')
check("Poigne recadrée (logo du short hors cadre)", im.size[0] / im.size[1] < 0.5, im.size)
print('\nTOUS LES TESTS PASSENT' if OK else '\nÉCHECS')
sys.exit(0 if OK else 1)
