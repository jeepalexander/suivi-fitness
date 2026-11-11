"""1.7.40-1.7.48 : titre de la page Séance = nom du programme ou de la séance libre ; allure cardio remontée sous l'ombre de la saisie."""
import sys
from harness import *

res = []


def check(name, ok, extra=''):
    ok = bool(ok); res.append(ok)
    print(('OK   ' if ok else 'ÉCHEC'), name, extra)


RECT = "s=>{const r=document.querySelector(s).getBoundingClientRect();return {l:r.left,t:r.top,r:r.right,b:r.bottom}}"

with Srv() as base, sync_playwright() as p:
    br = p.chromium.launch()
    for w, scheme in ((390, 'light'), (360, 'dark')):
        tag = f'[{w} px {scheme}] '
        ctx, pg, errs = newpage(br, w, 844, pref=scheme)
        pg.goto(base + 'index.html'); pg.wait_for_timeout(800)
        pg.evaluate("switchTab('seance')"); pg.wait_for_timeout(400)
        check(tag + 'titre = nom du programme actif', pg.inner_text('#page-title') == 'Hypertrophie', pg.inner_text('#page-title'))
        check(tag + 'nom de la séance toujours sous le titre', pg.inner_text('#seance-type-title') == 'Presse / Développé')
        check(tag + "icône du type (cycle, pastille sombre) devant le titre (1.7.41)", pg.is_visible('#seance-prog-ico svg') and 'dark' in pg.get_attribute('#seance-prog-ico', 'class')
              and pg.evaluate("document.querySelector('#seance-prog-ico').getBoundingClientRect().right") < pg.evaluate("document.querySelector('#page-title').getBoundingClientRect().left"))
        t, b = pg.evaluate(f"({RECT})('#page-title')"), pg.evaluate(f"({RECT})('#timer-btn')")
        t_prog, ico_prog = t, pg.evaluate(f"({RECT})('#seance-prog-ico')")
        check(tag + 'titre sans chevauchement avec le bouton PAUSE', t['r'] <= b['l'] - 8 or t['t'] >= b['b'] - 4 or t['b'] <= b['t'], f'{t} {b}')
        c = pg.evaluate("(()=>{const r=s=>{const x=s.getBoundingClientRect();return [x.top,x.bottom]};const k=document.querySelector('.workout-counts');return {row:document.getElementById('timer-btn').parentElement.className,a:r(k.children[0]),d:r(k.children[1]),b:r(document.getElementById('timer-btn'))}})()")
        check(tag + "1.7.48 : bouton de pause à droite du compteur ; séries et durée empilées dans sa hauteur, titre en haut (pas de décalage)",
              c['row'] == 'workout-progress-row' and c['a'][0] >= c['b'][0] - 0.5 and c['d'][1] <= c['b'][1] + 0.5 and c['a'][1] <= c['d'][0] and t['t'] < 50, c)

        # allure : remontée sous la ligne en cours, qui passe au-dessus (ombre)
        row = pg.evaluate(f"({RECT})('#exercises-list .exercise-item .set-row')")
        pace = pg.evaluate(f"({RECT})('#exercises-list .exercise-item .cardio-pace')")
        z = pg.evaluate("[...document.querySelectorAll('#exercises-list .exercise-item:first-of-type .set-row, #exercises-list .exercise-item:first-of-type .cardio-pace')].map(e=>getComputedStyle(e).zIndex).join(',')")
        check(tag + "allure glissée sous la ligne de saisie (chevauchement) et dessous à l'empilement", pace['t'] < row['b'] - 10 and z == '1,0', f'{row} {pace} {z}')
        check(tag + "texte de l'allure sous la ligne, lisible", pg.evaluate("(()=>{const b=document.querySelector('#exercises-list .exercise-item .cardio-pace span').getBoundingClientRect();return b.top})()") >= row['b'], '')
        pg.evaluate("document.querySelector('#exercises-list .exercise-item .set-row').classList.remove('current')"); pg.wait_for_timeout(100)
        pace2 = pg.evaluate(f"({RECT})('#exercises-list .exercise-item .cardio-pace')")
        row2 = pg.evaluate(f"({RECT})('#exercises-list .exercise-item .set-row')")
        check(tag + "ligne qui n'est plus en cours : allure de nouveau détachée", pace2['t'] >= row2['b'], f'{row2} {pace2}')

        # nom long : le titre descend sous le bouton
        pg.evaluate("switchTab('seance'); getProgram('hypertrophie').name='Force printemps haut du corps'; initWorkoutForm()"); pg.wait_for_timeout(300)
        t, b = pg.evaluate(f"({RECT})('#page-title')"), pg.evaluate(f"({RECT})('#timer-btn')")
        check(tag + 'nom long : titre affiché sur deux lignes, à sa hauteur normale, sans débordement',
              pg.inner_text('#page-title') == 'Force printemps haut du corps' and t['t'] == t_prog['t'] and not pg.evaluate(OVERFLOW_JS)['out'], f'{t} {t_prog}')
        # séance libre : icône 1× + nom, rien d'autre
        pg.evaluate("""(()=>{const p=JSON.parse(JSON.stringify(state.programs[0]));p.id='lib1';p.kind='libre';p.name='Dorsaux';p.sessions=[Object.assign(p.sessions[0],{key:'',name:'Dorsaux'})];state.programs.push(p);activateProgram('lib1');})()"""); pg.wait_for_timeout(300)
        pg.evaluate("switchTab('seance')"); pg.wait_for_timeout(300)
        check(tag + 'séance libre (1.7.42) : échauffement avant son 1er exercice de force', pg.evaluate("document.getElementById('warmup-note').nextElementSibling.dataset.ex") == pg.evaluate("[...document.querySelectorAll('#exercises-list .exercise-item')].map(e=>e.dataset.ex).find(n=>!exInfo(n).cardio)") and pg.is_visible('#warmup-note'))
        check(tag + 'séance libre (1.7.42) : titre et icône à la même hauteur que pour un programme', pg.evaluate(f"({RECT})('#page-title')")['t'] == t_prog['t'] and pg.evaluate(f"({RECT})('#seance-prog-ico')")['t'] == ico_prog['t'] and pg.evaluate(f"({RECT})('#seance-prog-ico')")['b'] == ico_prog['b'], f"{t_prog} {ico_prog}")
        col = pg.evaluate("getComputedStyle(document.getElementById('seance-prog-ico')).color")
        check(tag + "séance libre (1.7.43) : « 1× » brun en clair, doré en sombre", col == ('rgb(168, 118, 31)' if scheme == 'dark' else 'rgb(74, 56, 24)'), col)
        check(tag + 'séance libre : icône 1× + nom en titre, plus de ligne pastille / nom (1.7.41)', pg.inner_text('#page-title') == 'Dorsaux'
              and pg.inner_text('#seance-prog-ico') == '1×' and not pg.is_visible('#seance-head') and not pg.evaluate(OVERFLOW_JS)['out'])
        pg.evaluate("switchTab('programme')"); pg.wait_for_timeout(200)
        hauteurs = {}
        for tab in ('programme', 'progression', 'historique', 'reglages', 'seance'):
            pg.evaluate(f"switchTab('{tab}')"); pg.wait_for_timeout(150)
            hauteurs[tab] = pg.evaluate(f"({RECT})('#page-title')")['t']
        check(tag + "1.7.48 : titre de Séance à la même hauteur que celui des autres onglets", len(set(hauteurs.values())) == 1, hauteurs)
        pg.evaluate("switchTab('programme')"); pg.wait_for_timeout(200)
        check(tag + 'retour sur Programmes : titre « Programmes », en-tête à sa place',
              pg.inner_text('#page-title') == 'Programmes' and not pg.is_visible('#seance-prog-ico') and pg.evaluate("document.querySelector('.page-title-row').getBoundingClientRect().top") < 50)

        # rien de prévu : « Séance »
        pg.evaluate("workoutDef=null; buildWorkoutDef=()=>null; switchTab('seance'); initWorkoutForm()"); pg.wait_for_timeout(300)
        check(tag + "aucune séance prévue : échauffement caché et remis hors de la liste (1.7.42)", not pg.is_visible('#warmup-note') and pg.evaluate("document.getElementById('warmup-note').parentElement.id") == 'workout-form')
        check(tag + 'aucune séance prévue : titre « Séance », sans icône', pg.inner_text('#page-title') == 'Séance' and not pg.is_visible('#seance-prog-ico'), pg.inner_text('#page-title'))
        check(tag + 'aucune erreur JavaScript', not errs, str(errs))
        ctx.close()
    br.close()

print(f"\n{sum(res)}/{len(res)} contrôles OK")
sys.exit(0 if all(res) else 1)
