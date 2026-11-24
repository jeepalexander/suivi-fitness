"""1.8.78 : « Avec notre aide » : questionnaire de 5 questions, règles (séance ou programme, répartition, matériel,
objectif), proposition expliquée et sourcée, ouverture dans l'éditeur, objectif enregistré et partagé."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from harness import *

ok = 0
def check(cond, msg):
    global ok
    assert cond, msg
    ok += 1

def build(pg, **a):
    ans = dict(goal='masse', level='mois', time=45, freq=3, gear='salle', items=[])
    ans.update(a)
    return pg.evaluate("a => aideBuild(a)", ans)

def run(br, base, scheme, w):
    ctx, pg, errs = newpage(br, w, 844, pref=scheme, zoom=None)
    pg.goto(base + 'index.html'); pg.wait_for_timeout(900)
    nprog = pg.evaluate("getPrograms().length")
    pg.evaluate("openProgramChooser()"); pg.wait_for_timeout(200)
    btn = pg.locator('.choose-recv', has_text='Avec notre aide')
    check(btn.is_enabled(), 'bouton inactif')
    btn.click(); pg.wait_for_timeout(300)
    # 1.8.89 : « Avant de commencer », à chaque ouverture ; Continuer inactif tant que la case n'est pas cochée
    check(pg.inner_text('.aide-q') == 'Avant de commencer', pg.inner_text('.aide-q'))
    check('purement informative' in pg.inner_text('.aide-disc') and 'seule responsabilité' in pg.inner_text('.aide-disc'), 'texte de l\'avertissement')
    check(pg.locator('.aide-bar').count() == 0, 'barre de progression sur l\'avertissement')
    check(pg.locator('#aide-next').is_disabled(), 'Continuer actif sans accord')
    nav = pg.evaluate("document.querySelector('.aide-nav').getBoundingClientRect().bottom")
    check(nav <= 844 + 1, f'boutons hors écran (avertissement) {nav}')
    check(not pg.evaluate(OVERFLOW_JS)['out'], 'débordement (avertissement)')
    if scheme == 'light' and w == 390: pg.screenshot(path='/tmp/aide/q0.png')
    pg.locator('.aide-row', has_text="J'ai lu et j'accepte").click(); pg.wait_for_timeout(150)
    check(pg.locator('.aide-row.on .aide-tick svg').count() == 1 and not pg.locator('#aide-next').is_disabled(), 'accord')
    pg.click('#aide-next'); pg.wait_for_timeout(200)
    # Retour depuis la question 1 ramène à l'avertissement, toujours accepté
    pg.click('.aide-nav .btn-secondary'); pg.wait_for_timeout(150)
    check(pg.inner_text('.aide-q') == 'Avant de commencer' and not pg.locator('#aide-next').is_disabled(), 'Retour vers l\'avertissement')
    pg.click('#aide-next'); pg.wait_for_timeout(200)
    check(pg.evaluate("getComputedStyle(document.querySelector('nav')).display") == 'none', 'menu visible pendant le questionnaire')
    check(pg.locator('#program-overview .ed-back').count() == 0, 'flèche retour en haut')
    check(pg.locator('.aide-bar span').count() == 5 and pg.locator('.aide-bar span.on').count() == 1, 'barre de progression')
    check('Question 1 sur 5' in pg.inner_text('.aide-step'), 'repère')
    check(pg.locator('#aide-next').is_disabled(), 'Suivant actif sans réponse')
    shots = []
    for step, pick in [(1, 'Prendre de la masse'), (2, 'Je débute ou je reprends'), (3, '45 min'), (4, '3 séances')]:
        check(pg.locator('.aide-tick i').count() >= 3, f'cercles vides absents ({step})')
        pg.locator('.aide-row', has_text=pick).first.click(); pg.wait_for_timeout(150)
        check(pg.locator('.aide-row.on .aide-tick svg').count() == 1, f'coche absente ({step})')
        if step == 4:
            t = pg.inner_text('.aide-reco')
            check('2 ou 3 séances' in t, t)
            subs = pg.evaluate("[...document.querySelectorAll('.aide-rows .aide-row-t span')].map(e=>e.innerText)")
            check(len(subs) == 6 and subs[5] == 'À éviter' and subs[1] == 'Recommandé pour toi', subs)
        ov = pg.evaluate(OVERFLOW_JS)
        check(not ov['out'], ov)
        nav = pg.evaluate("document.querySelector('.aide-nav').getBoundingClientRect().bottom")
        check(nav <= 844 + 1, f'boutons hors écran ({step}) {nav}')
        if scheme == 'light' and w == 390: pg.screenshot(path=f'/tmp/aide/q{step}.png')
        pg.click('#aide-next'); pg.wait_for_timeout(150)
    # Question 5 : choix multiples
    check(pg.locator('.aide-tick.sq').count() == 4, 'carrés absents')
    pg.locator('.aide-sub .aide-row', has_text='Haltères').click(); pg.wait_for_timeout(100)
    pg.locator('.aide-sub .aide-row', has_text='Banc').click(); pg.wait_for_timeout(100)
    check(pg.evaluate("aide.gear") == 'some' and pg.evaluate("aide.items.length") == 2, 'cases multiples')
    check(not pg.locator('#aide-next').is_disabled(), 'Voir ma proposition inactif')
    if scheme == 'light' and w == 390: pg.screenshot(path='/tmp/aide/q5.png')
    pg.click('#aide-next'); pg.wait_for_timeout(300)
    # Débutant à 3 séances : une seule séance « Premiers pas », avec ses raisons et ses sources
    check(pg.inner_text('.ed-kind-title') == 'Premiers pas', pg.inner_text('.ed-kind-title'))
    check(pg.locator('.aide-why p').count() == 3 and pg.locator('.aide-why small').count() == 3, 'raisons')
    check('ACSM' in pg.inner_text('.aide-why'), 'source absente')
    check('Cette séance te plaît' in pg.inner_text('.aide-end'), 'texte de fin')
    check("sans valeur d'avis professionnel" in pg.inner_text('.aide-recall'), 'phrase de rappel')
    rc = pg.evaluate("[document.querySelector('.aide-end').getBoundingClientRect().bottom, document.querySelector('.aide-recall').getBoundingClientRect().top, document.querySelector('.aide-nav').getBoundingClientRect().top]")
    check(rc[0] <= rc[1] <= rc[2], rc)
    order = pg.evaluate("[...document.getElementById('program-overview').children].map(e=>e.className.split(' ')[0])")
    check(order.index('ed-list') < order.index('advice-item'), order)
    gear_ok = pg.evaluate("aide.result.sessions[0].exercises.every(e => aideGearOk(e.exId, aide))")
    check(gear_ok, 'exercice hors matériel')
    if scheme == 'light' and w == 390: pg.screenshot(path='/tmp/aide/res.png', full_page=True)
    # Retour revient à la question 5, puis on ouvre l'éditeur
    pg.click('.aide-nav .btn-secondary'); pg.wait_for_timeout(150)
    check('Question 5 sur 5' in pg.inner_text('.aide-step'), 'Retour depuis la proposition')
    pg.click('#aide-next'); pg.wait_for_timeout(200)
    pg.locator('.aide-nav .btn', has_text="Ouvrir dans l'éditeur").click(); pg.wait_for_timeout(300)
    check(pg.evaluate("programView") == 'editor' and pg.evaluate("programDraft.kind") == 'libre', 'éditeur')
    check(pg.evaluate("programDraft.name") == 'Premiers pas' and pg.evaluate("programDraft.goal") == 'masse', 'brouillon')
    check(pg.evaluate("getComputedStyle(document.querySelector('nav')).display") != 'none', 'menu absent dans l\'éditeur')
    pg.evaluate("saveProgramDraft()"); pg.wait_for_timeout(300)
    pg.evaluate("openAide()"); pg.wait_for_timeout(200)
    check(pg.inner_text('.aide-q') == 'Avant de commencer' and pg.locator('#aide-next').is_disabled(), 'avertissement non redemandé')
    check(pg.evaluate("Object.keys(localStorage).filter(k => /aide|accept/i.test(k)).length") == 0, 'accord gardé sur le téléphone')
    check(pg.evaluate("getPrograms().length") == nprog + 1, 'non enregistré')
    check(pg.evaluate("getPrograms().slice(-1)[0].goal") == 'masse', 'objectif non gardé')
    ctx.close()

def rules(br, base):
    ctx, pg, errs = newpage(br, 390, 844, pref='light')
    pg.goto(base + 'index.html'); pg.wait_for_timeout(800)
    r = build(pg)
    check(r['kind'] == 'program' and [s['key'] for s in r['sessions']] == ['A', 'B', 'C'], r['kind'])
    check(r['name'] == 'Prise de masse' and r['sessions'][1]['name'] == 'Dos et ischios', r['name'])
    check(all(len(s['exercises']) >= 4 for s in r['sessions']), 'séances trop courtes')
    check(r['sessions'][0]['exercises'][0]['exId'] == 2, r['sessions'][0]['exercises'][0])  # quelques mois : Squat à la barre
    check(build(pg, level='debut', freq=4)['sessions'][1]['exercises'][0]['exId'] == 1, 'débutant : Presse d\'abord')
    check(build(pg, level='annees')['sessions'][1]['exercises'][0]['exId'] == 11, 'barre d\'abord pour un avancé')
    # Séance unique : 1 séance, débutant à 2–3, forme ou gras à 2
    check(build(pg, freq=1)['kind'] == 'libre', '1 séance')
    check(build(pg, level='debut', freq=2)['name'] == 'Premiers pas', 'débutant')
    check(build(pg, goal='gras', freq=2)['kind'] == 'libre', 'gras à 2')
    check(build(pg, level='debut', freq=4)['kind'] == 'program', 'débutant à 4')
    # Répartitions
    check([s['name'] for s in build(pg, freq=4)['sessions']] == ['Haut du corps', 'Bas du corps'] * 2, '4 séances')
    check([s['name'] for s in build(pg, goal='forme', freq=4)['sessions']][3] == 'Jambes et dos', 'forme à 4')
    check([s['name'] for s in build(pg, freq=6)['sessions']] == ['Poussée', 'Tirage', 'Jambes'] * 2, '6 séances')
    check(len(build(pg, freq=5)['sessions']) == 5, '5 séances')
    # Durée : 20 min plus court que 1 h 30
    n20 = len(build(pg, time=20)['sessions'][0]['exercises']); n90 = len(build(pg, time=90)['sessions'][0]['exercises'])
    check(2 <= n20 < n90, (n20, n90))
    # Cardio : perte de gras à chaque séance, en dernier
    g = build(pg, goal='gras', freq=3)
    check(all(pg.evaluate("id => !!exInfo(id).cardio", s['exercises'][-1]['exId']) for s in g['sessions']), 'cardio absent')
    # Matériel : aucun -> seulement des exercices sans matériel ; élastique + barre -> tractions assistées possibles
    none = build(pg, gear='none')
    check(all(pg.evaluate("id => (exInfo(id).gear || ['salle']).length === 0", e['exId']) for s in none['sessions'] for e in s['exercises']), 'matériel')
    some = build(pg, gear='some', items=['barre_traction', 'elastique'], level='debut', freq=4)
    check(any(e['exId'] == 27 for s in some['sessions'] for e in s['exercises']), 'tractions assistées')
    # Force : pas d'isolation ; répétitions et repos propres
    f = build(pg, goal='force')
    check(all(pg.evaluate("id => { const i = exInfo(id); return !!i.poly || i.group === 'Abdos' || !!i.cardio || i.id === 13 || i.id === 11 || i.id === 17 || i.id === 14 || i.id === 18 }", e['exId']) for s in f['sessions'] for e in s['exercises']), 'isolation en force')
    check(pg.evaluate("JSON.stringify(goalPrescription(exInfo(2), 'force'))") == '{"reps":"3–6","rest":180}', 'force lourd')
    check(pg.evaluate("JSON.stringify(goalPrescription(exInfo(55), 'endurance'))") == '{"reps":"15–20","rest":45}', 'endurance iso')
    check(pg.evaluate("JSON.stringify(goalPrescription(exInfo(76), 'force'))") == '{"reps":"20–45 s","rest":60}', 'gainage inchangé')
    check(pg.evaluate("goalPrescription(exInfo(39), null).reps") == '6–10', 'sans objectif')
    # Raisons : au plus 3, chacune avec sa source
    for a in [dict(), dict(freq=1), dict(goal='force', time=20), dict(goal='gras', freq=2), dict(level='debut', freq=3)]:
        rs = build(pg, **a)['reasons']
        check(1 <= len(rs) <= 3 and all(len(x) == 2 and x[1] for x in rs), (a, rs))
    # Programme actif avec un objectif : repos et « Première fois » suivent l'objectif
    pg.evaluate("""() => { const p = getActiveProgram(); p.goal = 'force'; saveState(); }""")
    check(pg.evaluate("restDurationFor('Squat')") == 180 and pg.evaluate("activePrescription('Squat').reps") == '3–6', 'séance force')
    # Partage : l'objectif voyage dans le lien
    same = pg.evaluate("""async () => { const p = getActiveProgram(); const d = await decodeProgram((await encodeProgram(p))); return d.goal; }""")
    check(same == 'force', same)
    ctx.close()

os.makedirs('/tmp/aide', exist_ok=True)
with Srv() as base, sync_playwright() as p:
    br = p.chromium.launch()
    rules(br, base)
    for scheme in ['light', 'dark']:
        for w in [390, 360]:
            run(br, base, scheme, w)
    br.close()
print(f'test_aide : {ok} vérifications OK')
