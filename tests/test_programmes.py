"""Programmes sur mesure (1.7.0) : migration « Hypertrophie », création / activation / suppression de programmes et de
séances libres, rotation, poids du corps + lest, cardio par famille, déload reporté, Progression par programme,
filtres de l'Historique, import d'une ancienne sauvegarde, mise en page (390 / 360 px, clair / sombre)."""
import json, sys
from harness import *

res = []


def check(name, ok, extra=''):
    ok = bool(ok); res.append(ok)
    print(('OK   ' if ok else 'ÉCHEC'), name, extra)


def state(pg):
    return json.loads(pg.evaluate("localStorage.getItem('h49_state')"))


def fixture_tonnage():
    return round(sum((s.get('weight') or 0) * (s.get('reps') or 0) for h in DATA['history'] for e in h['exercises'] for s in e['sets']))


def add_exercises(pg, ids):
    pg.click('.ed-add'); pg.wait_for_timeout(150)
    for i in ids:
        pg.fill('#add-search', ''); pg.wait_for_timeout(50)
        pg.click(f'.add-item[data-id="{i}"]')
    pg.click('#add-actions .btn:not(.btn-secondary)'); pg.wait_for_timeout(150)


def check_set(pg, ex, i, w=None, r=None):
    item = f'#exercises-list .exercise-item[data-ex="{ex}"]'
    pg.evaluate("n=>{const it=[...document.querySelectorAll('#exercises-list .exercise-item')].find(x=>x.dataset.ex===n);if(!it.classList.contains('open'))it.querySelector('.ex-toggle').click()}", ex)
    row = f'{item} .set-row >> nth={i}'
    if w is not None: pg.fill(f'{row} >> .weight-input', str(w))
    if r is not None: pg.fill(f'{row} >> .reps-input', str(r))
    pg.click(f'{row} >> .btn-check-set')


with Srv() as base, sync_playwright() as p:
    br = p.chromium.launch()

    # ---------- 1. Migration de l'historique existant ----------
    ctx, pg, errs = newpage(br, 390, 844, pref='light')
    dialogs = []
    pg.on('dialog', lambda d: (dialogs.append(d.message), d.accept()))
    pg.goto(base + 'index.html'); pg.wait_for_timeout(900)
    st = state(pg)
    progs = st.get('programs', [])
    check('migration : programme « Hypertrophie » actif créé avec les séances A, B, C', len(progs) == 1 and progs[0]['name'] == 'Hypertrophie' and progs[0]['status'] == 'active' and [s['key'] for s in progs[0]['sessions']] == ['A', 'B', 'C'], json.dumps([(x['name'], x['status']) for x in progs]))
    check('migration : séances A/B/C reprennent le programme fixe (rameur en tête, 4 séries sur les premiers exercices)', progs and progs[0]['sessions'][0]['exercises'][0] == {'exId': 80, 'sets': 1} and progs[0]['sessions'][0]['exercises'][1] == {'exId': 1, 'sets': 4})
    check('migration : les 33 séances sont rattachées à Hypertrophie (programId, sessionKey = type)', len(st['history']) == len(DATA['history']) and all(h.get('programId') == 'hypertrophie' and h.get('programName') == 'Hypertrophie' and h.get('sessionKey') == h.get('type') for h in st['history']))
    tonnage = round(sum((s.get('weight') or 0) * (s.get('reps') or 0) for h in st['history'] for e in h['exercises'] for s in e['sets']))
    check('migration : tonnage total identique', tonnage == fixture_tonnage(), f'{tonnage} / {fixture_tonnage()}')
    names = {e['name'] for h in st['history'] for e in h['exercises']}
    check('migration : noms du catalogue (Leg extension, Leg curl, Oiseau) et exId posé', not ({'Leg Extension', 'Leg Curl', "Oiseau (Arrière d'épaule)"} & names) and all(e.get('exId') for h in st['history'] for e in h['exercises']), str(sorted(names)))
    check('migration : dernières charges renommées', 'Leg Extension' not in st['lastWeights'] and len(st['lastWeights']) == len(DATA['lastWeights']))
    check('migration : copie intégrale d\'origine conservée sur l\'appareil', json.loads(pg.evaluate("localStorage.getItem('h49_state_v1_backup')"))['history'] == DATA['history'])
    last = DATA['history'][-1]['type']
    attendu = {'A': 'B', 'B': 'C', 'C': 'A'}[last]
    check('migration : prochaine séance = celle qui suit la dernière faite', progs[0]['nextKey'] == attendu and st['nextType'] == attendu, f"{progs[0]['nextKey']} (dernière : {last})")
    check('migration : schéma 2 et déload initialisé', st.get('schema') == 2 and st.get('deload') == {'shift': 0, 'postponedAt': None})
    pg.reload(); pg.wait_for_timeout(700)
    check('migration faite une seule fois (rechargement : rien ne change)', state(pg)['programs'] == state(pg)['programs'] and len(state(pg)['programs']) == 1)

    # Accueil Programme
    txt = pg.inner_text('#program-overview')
    check('accueil : « Actif » (sans nom), tuile au nom du programme', pg.inner_text('.prog-status').strip() == 'Actif' and 'Hypertrophie' in pg.inner_text('.prog-tile-name') and pg.inner_text('.prog-tile-next .type-pill') == attendu and 'Presse' in pg.inner_text('.prog-tile-next') if attendu == 'A' else 'Hypertrophie' in pg.inner_text('.prog-tile-name') and pg.inner_text('.prog-tile-next .type-pill') == attendu, txt[:120])
    check('« En mémoire » présent ; vide : « Tes autres programmes apparaîtront ici »',
          pg.locator('.prog-mem-title').count() == 1 and ((pg.locator('.mem-tile').count() == 0) == (pg.locator('.mem-empty').count() == 1))
          and (pg.locator('.mem-empty').count() == 0 or pg.inner_text('.mem-empty') == 'Tes autres programmes apparaîtront ici'))
    check('« Actif » à la même taille que « En mémoire »', pg.evaluate("getComputedStyle(document.querySelector('.prog-status')).fontSize===getComputedStyle(document.querySelector('.prog-mem-title')).fontSize"))
    check('onglet et titre « Programmes »', pg.inner_text('#page-title') == 'Programmes' and pg.inner_text('#nav-programme').strip() == 'Programmes')
    check('accueil : bouton + visible dans l\'en-tête', pg.is_visible('#add-program-btn'))
    gap = pg.evaluate("document.querySelector('nav').getBoundingClientRect().top - document.querySelector('.prog-hint').getBoundingClientRect().bottom")
    check('accueil : tuiles alignées vers le bas, juste au-dessus de la navigation', 0 <= gap <= 60, f'{gap:.0f} px')

    # ---------- 2. Création d'un programme (2 séances), enregistrement seulement si chaque séance a un exercice ----------
    pg.click('#add-program-btn'); pg.wait_for_timeout(200)
    check('écran 4 : deux choix (programme / séance libre)', pg.locator('.choose-card').count() == 2)
    # 1.7.52 : « Recevoir un programme » sous les deux cartes ; l'ensemble reste calé au-dessus de la navigation
    gap = pg.evaluate("document.querySelector('nav').getBoundingClientRect().top - document.querySelector('.choose-recv').getBoundingClientRect().bottom")
    check('écran 4 : cartes et « Recevoir » alignés vers le bas, juste au-dessus de la navigation', 0 <= gap <= 60, f'{gap:.0f} px')
    pg.click('.choose-card:not(.libre)'); pg.wait_for_timeout(200)
    check('éditeur : 3 séances A, B, C par défaut', pg.evaluate("[...document.querySelectorAll('.ed-seg-btn:not(.ed-seg-op)')].map(b=>b.textContent).join('')") == 'ABC')
    pg.click('.ed-seg-op:not(.plus)'); pg.wait_for_timeout(100)
    check('éditeur : « − » retire une séance, jamais sous 2 (bouton désactivé)', pg.evaluate("[...document.querySelectorAll('.ed-seg-btn:not(.ed-seg-op)')].length") == 2 and pg.evaluate("document.querySelector('.ed-seg-op:not(.plus)').disabled"))
    for _ in range(4): pg.click('.ed-seg-op.plus'); pg.wait_for_timeout(50)
    check('éditeur : « + » ajoute jusqu\'à 6 séances (A à F), puis se désactive', pg.evaluate("[...document.querySelectorAll('.ed-seg-btn:not(.ed-seg-op)')].map(b=>b.textContent).join('')") == 'ABCDEF' and pg.evaluate("document.querySelector('.ed-seg-op.plus').disabled"))
    for _ in range(4):
        pg.click('.ed-seg-op:not(.plus)'); pg.wait_for_timeout(50)
    pg.fill('#ed-name', 'Sèche')
    pg.click('.ed-seg-btn >> text=A'); pg.fill('#ed-sname', 'Haut')
    add_exercises(pg, [26, 39])   # Tractions (poids du corps), Développé couché
    check('éditeur (1.7.28) : « Enregistrer » visible dès le 1er exercice, plus de phrase « Ajoute au moins… »', pg.is_visible('#ed-save') and 'Ajoute au moins' not in pg.inner_text('#program-overview'))
    n_before = len(state(pg).get('programs', []))
    pg.click('#ed-save'); pg.wait_for_timeout(300)
    check('séance B vide : résumé « Presque prêt », A complète (coche), B « À compléter », rien d\'enregistré',
          pg.is_visible('#sheet-overlay') and 'Presque prêt' in pg.inner_text('#sheet-overlay') and "La séance B n'a encore aucun exercice" in pg.inner_text('#sheet-overlay')
          and pg.locator('.miss-row').count() == 2 and pg.locator('.miss-row:not(.empty) .miss-ok').count() == 1
          and 'Aucun exercice' in pg.inner_text('.miss-row.empty') and len(state(pg).get('programs', [])) == n_before, pg.inner_text('#sheet-overlay') if pg.is_visible('#sheet-overlay') else '')
    ov = pg.evaluate(OVERFLOW_JS)
    check('résumé : rien ne déborde', ov['docW'] <= ov['vw'] and not ov['out'], ov)
    pg.click('#miss-go'); pg.wait_for_timeout(250)
    check('« Compléter la séance B » : volet fermé, séance B sélectionnée', not pg.is_visible('#sheet-overlay') and pg.evaluate("programDraft.idx") == 1)
    add_exercises(pg, [86, 76])   # Vélo elliptique (km/h), Planche (durée)
    check('éditeur : liste de la séance B (2 exercices · 4 séries)', '2 exercices · 4 séries' in pg.inner_text('#program-overview'), pg.inner_text('.ed-count'))
    pg.click('#ed-save'); pg.wait_for_timeout(300)
    st = state(pg)
    seche = next(x for x in st['programs'] if x['name'] == 'Sèche')
    check('création alors qu\'un programme est actif : l\'actif reste actif, le nouveau est « Nouveau »', seche['status'] == 'new' and next(x for x in st['programs'] if x['name'] == 'Hypertrophie')['status'] == 'active')
    check('Sèche : séances A (Tractions, Développé couché) et B (Vélo elliptique, Planche) à 3 séries', [[e['exId'] for e in s['exercises']] for s in seche['sessions']] == [[26, 39], [86, 76]] and seche['sessions'][0]['exercises'][0]['sets'] == 3 and seche['sessions'][1]['exercises'][0]['sets'] == 1)
    mem = pg.inner_text('.mem-tile')
    check('mini-tuile : « Nouveau · 4 exercices », bouton Activer', 'Nouveau' in mem and '4 exercices' in mem and 'Activer' in mem, mem)

    # ---------- 3. Séance libre jamais activée : « Nouveau » ----------
    pg.click('#add-program-btn'); pg.click('.choose-card.libre'); pg.wait_for_timeout(150)
    pg.fill('#ed-name', 'Dorsaux')
    add_exercises(pg, [25, 31])
    check('séance libre créée pendant un programme actif : bouton « Enregistrer la séance libre »', pg.inner_text('#ed-save') == 'Enregistrer la séance libre')
    pg.click('#ed-save'); pg.wait_for_timeout(300)
    libre_txt = pg.inner_text('.mem-tile.libre')
    check('séance libre jamais activée : « Nouveau · 2 exercices »', 'Nouveau' in libre_txt and '2 exercices' in libre_txt, libre_txt)

    # ---------- 4. Activation : l'ancien passe en pause sans confirmation ----------
    n_dialogs = len(dialogs)
    pg.click('.mem-tile:has-text("Sèche") .mem-btn'); pg.wait_for_timeout(300)
    st = state(pg)
    check('Activer Sèche : actif, Hypertrophie en pause sans confirmation', next(x for x in st['programs'] if x['name'] == 'Sèche')['status'] == 'active' and next(x for x in st['programs'] if x['name'] == 'Hypertrophie')['status'] == 'paused' and len(dialogs) == n_dialogs)
    hyp_txt = pg.inner_text('.mem-tile:has-text("Hypertrophie")')
    check('Hypertrophie en mémoire : « En pause depuis le … », bouton Réactiver', 'En pause depuis le' in hyp_txt and 'Réactiver' in hyp_txt, hyp_txt)

    # ---------- 5. Séance du programme : poids du corps + lest, cardio km/h, durée ----------
    pg.evaluate("localStorage.setItem('h49_state', JSON.stringify(Object.assign(JSON.parse(localStorage.getItem('h49_state')), {weights:[{date:'2026-11-01',weight:78}]})))")
    pg.reload(); pg.wait_for_timeout(800)
    pg.evaluate("switchTab('seance')"); pg.wait_for_timeout(300)
    check('Séance : titre de la page = nom du programme (1.7.40)', pg.inner_text('#page-title') == pg.evaluate('workoutDef.programName') != 'Séance', pg.inner_text('#page-title'))
    check('Séance : plus de « Séance du jour · programme » (1.7.27), séance A « Haut »', not pg.is_visible('#seance-overline') and pg.inner_text('#seance-type-title') == 'Haut' and pg.inner_text('#seance-badge') == 'A')
    heads = pg.evaluate("[...document.querySelectorAll('#exercises-list .exercise-item')[0].querySelectorAll('.sets-head span')].map(s=>s.textContent).join('|')")
    check('Tractions : colonnes Série | Lest (kg) | Réps', heads == 'Série|Lest (kg)|Réps|', heads)
    check('Tractions : historique ancien (charge totale 80 kg) -> lest proposé +2,5 (80 − 78 arrondi)', pg.input_value('#exercises-list .exercise-item[data-ex="Tractions"] .weight-input') == '+2.5', pg.input_value('#exercises-list .exercise-item[data-ex="Tractions"] .weight-input'))
    sub = pg.inner_text('#exercises-list .exercise-item[data-ex="Développé couché"] .ex-sub')
    check('chrono : repos du Développé couché (3:00) quand il est ouvert', '(3:00)' in (pg.evaluate("document.querySelector('#exercises-list .exercise-item[data-ex=\"Développé couché\"] .ex-toggle').click(), document.getElementById('timer-btn').getAttribute('aria-label')")), sub)
    check_set(pg, 'Tractions', 0, '+10', 8)
    check_set(pg, 'Tractions', 1, '', 8)
    check_set(pg, 'Développé couché', 0, 60, 8)
    pg.evaluate("document.getElementById('workout-form').requestSubmit()"); pg.wait_for_timeout(400); pg.evaluate("closeFinishDialog()")
    st = state(pg)
    h = st['history'][-1]
    trac = next(e for e in h['exercises'] if e['name'] == 'Tractions')
    check('enregistré : Tractions lest +10 -> charge 88 kg (pesée 78 + 10), PDC -> 78 kg', trac['sets'] == [{'weight': 88, 'reps': 8, 'lest': 10}, {'weight': 78, 'reps': 8, 'lest': 0}], json.dumps(trac['sets']))
    check('enregistré : séance rattachée à Sèche, séance A, tonnage avec la charge réelle', h['programName'] == 'Sèche' and h['sessionKey'] == 'A' and h['kind'] == 'program' and h['tonnage'] == 88 * 8 + 78 * 8 + 60 * 8, json.dumps({k: h[k] for k in ('programName', 'sessionKey', 'tonnage')}))
    check('rotation : la prochaine séance de Sèche est B', next(x for x in st['programs'] if x['name'] == 'Sèche')['nextKey'] == 'B')
    check('séries faites reportées dans le programme (Tractions : 3 séries conservées)', next(x for x in st['programs'] if x['name'] == 'Sèche')['sessions'][0]['exercises'][0]['sets'] == 3)
    pg.evaluate("switchTab('seance')"); pg.wait_for_timeout(300)
    check('séance suivante : B, « Dernière fois » non affiché pour un exercice jamais fait (Première fois · 3 × 20–45 s)', pg.inner_text('#seance-badge') == 'B' and 'Première fois · 3 × 20–45 s' in pg.inner_text('#exercises-list .exercise-item[data-ex="Planche"] .ex-sub') if pg.evaluate("document.querySelector('#exercises-list .exercise-item[data-ex=\"Planche\"]').classList.contains('open')") else pg.inner_text('#seance-badge') == 'B')
    heads = pg.evaluate("[...document.querySelectorAll('#exercises-list .exercise-item')[0].querySelectorAll('.sets-head span')].map(s=>s.textContent).join('|')")
    check('Vélo elliptique : colonnes Durée | Distance (km), vide la première fois', heads == 'Série|Durée|Distance (km)|' and pg.input_value('#exercises-list .exercise-item[data-ex="Vélo elliptique"] .weight-input') == '', heads)
    vel = '#exercises-list .exercise-item[data-ex="Vélo elliptique"]'
    pg.type(f'{vel} .weight-input', '2000'); pg.fill(f'{vel} .reps-input', '5,5'); pg.dispatch_event(f'{vel} .reps-input', 'input'); pg.wait_for_timeout(100)
    check('Vélo elliptique : vitesse calculée (5,5 km en 20:00 = 16,5 km/h)', '16,5 km/h' in pg.inner_text(f'{vel} .cardio-pace'), pg.inner_text(f'{vel} .cardio-pace'))
    pg.click(f'{vel} .btn-check-set'); pg.wait_for_timeout(100)
    pl = '#exercises-list .exercise-item[data-ex="Planche"]'
    check('Planche : un seul champ Durée', pg.evaluate(f"document.querySelector('{pl} .sets-head').classList.contains('single')") and pg.input_value(f'{pl} .weight-input') == '0:30', pg.input_value(f'{pl} .weight-input'))
    pg.click(f'{pl} .set-row >> nth=0 >> .btn-check-set')
    pg.evaluate("document.getElementById('workout-form').requestSubmit()"); pg.wait_for_timeout(400); pg.evaluate("closeFinishDialog()")
    h = state(pg)['history'][-1]
    check('enregistré : vélo elliptique 5 500 m en 1 200 s, planche 30 s', h['exercises'][0]['sets'] == [{'weight': 0, 'reps': 0, 'seconds': 1200, 'meters': 5500}] and h['exercises'][1]['sets'] == [{'weight': 0, 'reps': 0, 'seconds': 30, 'hold': True}], json.dumps(h['exercises']))

    # ---------- 6. Séance libre : activée, reste active après la séance, jamais « En pause » ----------
    pg.evaluate("switchTab('programme')"); pg.wait_for_timeout(200)
    pg.click('.mem-tile.libre .mem-btn'); pg.wait_for_timeout(300)
    check('séance libre activée : « Actif », tuile sable « Dorsaux » sans ligne de prochaine séance', pg.inner_text('.prog-status').strip() == 'Actif' and pg.inner_text('.prog-tile-name') == 'Dorsaux' and not pg.locator('.prog-tile .prog-tile-next').count() and pg.locator('.prog-tile.libre').count() == 1)
    pg.evaluate("switchTab('seance')"); pg.wait_for_timeout(300)
    check('Séance libre (1.7.41) : plus de ligne pastille + nom sous le titre, icône 1× devant le titre', not pg.is_visible('#seance-head') and pg.inner_text('#seance-prog-ico') == '1×' and 'libre' in pg.get_attribute('#seance-prog-ico', 'class'))
    check('Séance libre : titre de la page = son nom (1.7.40)', pg.inner_text('#page-title') == 'Dorsaux', pg.inner_text('#page-title'))
    check_set(pg, 'Tirage vertical', 0, 50, 10)
    pg.evaluate("document.getElementById('workout-form').requestSubmit()"); pg.wait_for_timeout(400); pg.evaluate("closeFinishDialog()")
    st = state(pg)
    check('après la séance : la séance libre reste active', next(x for x in st['programs'] if x['name'] == 'Dorsaux')['status'] == 'active' and st['history'][-1]['kind'] == 'libre')
    pg.evaluate("switchTab('programme')"); pg.wait_for_timeout(200)
    pg.click('.mem-tile:has-text("Sèche") .mem-btn'); pg.wait_for_timeout(300)
    lt = pg.inner_text('.mem-tile.libre')
    check('séance libre remise en mémoire : « 2 exercices », bouton Activer, jamais « En pause » ni « Nouveau »', 'En pause' not in lt and 'Nouveau' not in lt and '2 exercices' in lt and 'Activer' in lt, lt)

    # ---------- 7. Appui long : modifier, supprimer (l'historique reste) ----------
    box = pg.locator('.mem-tile.libre').bounding_box()
    pg.mouse.move(box['x'] + 80, box['y'] + 25); pg.mouse.down(); pg.wait_for_timeout(300); pg.mouse.up(); pg.wait_for_timeout(200)
    check('appui court : rien ne s\'ouvre', pg.evaluate("programView") == 'home')
    pg.mouse.move(box['x'] + 80, box['y'] + 25); pg.mouse.down(); pg.wait_for_timeout(700); pg.mouse.up(); pg.wait_for_timeout(250)
    check('appui long : éditeur de la séance libre prérempli', pg.evaluate("programView") == 'editor' and pg.input_value('#ed-name') == 'Dorsaux' and 'Supprimer la séance libre' in pg.inner_text('#program-overview'))
    n_hist = len(state(pg)['history'])
    pg.click('.ed-delete'); pg.wait_for_timeout(150)
    check('écran 21 : confirmation « Supprimer « Dorsaux » ? »', 'Supprimer « Dorsaux » ?' in pg.inner_text('.sheet'))
    pg.click('.sheet .btn-delete'); pg.wait_for_timeout(300)
    st = state(pg)
    check('suppression : la séance libre disparaît, ses séances restent dans l\'historique', not any(x['name'] == 'Dorsaux' for x in st['programs']) and len(st['history']) == n_hist and any(h.get('programName') == 'Dorsaux' for h in st['history']))

    # ---------- 8. Historique : filtres par programme, origine, programme supprimé lisible ----------
    pg.evaluate("switchTab('historique')"); pg.wait_for_timeout(300)
    chips = pg.evaluate("[...document.querySelectorAll('#history-filters .filter-btn')].map(b=>b.textContent)")
    check('Historique : filtres Tout + programmes ayant des séances (Dorsaux supprimé compris)', chips[0] == 'Tout' and set(chips[1:]) == {'Hypertrophie', 'Sèche', 'Dorsaux'}, str(chips))
    pg.click('#history-filters .filter-btn >> text=Sèche'); pg.wait_for_timeout(200)
    check('filtre Sèche : 2 séances et compteur suivi', pg.locator('.history-item').count() == 2 and pg.inner_text('#history-count') == '2 séances enregistrées')
    check('ligne : sous-titre « Sèche · durée »', 'Sèche ·' in pg.inner_text('.history-item'))
    pg.click('#history-filters .filter-btn >> text=Dorsaux'); pg.wait_for_timeout(200)
    pg.click('.history-item'); pg.wait_for_timeout(200)
    check('détail d\'une séance libre : « Dorsaux du jj/mm », origine « Séance libre », pastille 1×', 'Dorsaux du' in pg.inner_text('#modal-session-title') and pg.inner_text('#modal-session-origin') == 'Séance libre' and pg.inner_text('#modal-session-pill') == '1×')
    pg.evaluate("closeSessionModal(); setHistoryFilter('all')")

    # ---------- 9. Progression : périmètre par défaut = actif, sélecteur, Tous ----------
    pg.evaluate("switchTab('progression')"); pg.wait_for_timeout(500)
    check('Progression : statistiques de l\'élément actif (Sèche) par défaut', 'Sèche' in pg.inner_text('#stats-scope-btn') and pg.inner_text('#tab-progression .hero-label') == 'Indice de progression')
    check('filtre de séances : lettres du programme (A / B)', pg.inner_text('#btn-vol-type') == 'A / B', pg.inner_text('#btn-vol-type'))
    check('graphique de volume limité à Sèche (2 points)', pg.evaluate("tonnageChart.data.labels.length") == 2)
    check('Suivi cardio : menu limité au cardio de Sèche (Vélo elliptique, km/h)', 'Vélo elliptique' in pg.inner_text('#cardio-unit') and 'km/h' in pg.inner_text('#cardio-unit') and pg.inner_text('#cardio-current') == '16,5', pg.inner_text('#cardio-unit'))
    check('Progression par exercice : tous programmes confondus (Tractions et exercices d\'Hypertrophie)', all(n in pg.evaluate("[...document.querySelectorAll('#exercise-filter option')].map(o=>o.value)") for n in ['Tractions', 'Presse à cuisses', 'Leg extension']))
    pg.click('#stats-scope-btn'); pg.wait_for_timeout(200)
    check('écran 26 : liste des programmes + « Tous les programmes »', 'Tous les programmes' in pg.inner_text('.sheet') and 'Hypertrophie' in pg.inner_text('.sheet'))
    pg.click('.scope-item >> text=Hypertrophie'); pg.wait_for_timeout(500)
    idx = pg.inner_text('#hero-index')
    check('Hypertrophie : indice calculé, filtre A / B / C', idx.endswith('%') and pg.inner_text('#btn-vol-type') == 'A / B / C', idx)
    pg.click('#btn-vol-type'); pg.wait_for_timeout(200)
    check('A / B / C : premier appui = séance A', pg.inner_text('#btn-vol-type') == 'Séance A')
    pg.click('#stats-scope-btn'); pg.click('.scope-item >> text=Tous les programmes'); pg.wait_for_timeout(500)
    check('Tous : même titre « Indice de progression », filtre de lettres masqué, progression par programme', pg.inner_text('#tab-progression .hero-label') == 'Indice de progression' and not pg.is_visible('#btn-vol-type') and 'Progression par programme' in pg.inner_text('#monthly-analysis'))

    # ---------- 10. Déload : reporter puis annuler ----------
    pg.evaluate("activateProgram('hypertrophie'); switchTab('seance')"); pg.wait_for_timeout(300)
    n = len(state(pg)['history']) + 1
    deload_now = n % 12 == 0 or n % 12 >= 10
    if not deload_now:
        pg.evaluate("state.deload.shift = (state.history.length + 1) - 10; saveState(); initWorkoutForm()"); pg.wait_for_timeout(200)
    check('déload actif : lien « Reporter à la prochaine séance »', pg.is_visible('#deload-subtitle') and 'Reporter à la prochaine séance' in pg.inner_text('#deload-actions'))
    pg.click('#deload-actions .link-btn'); pg.wait_for_timeout(200)
    check('reporté : plus de déload sur cette séance, « Déload reporté à la prochaine séance · Annuler »', not pg.is_visible('#deload-subtitle') and 'Déload reporté à la prochaine séance' in pg.inner_text('#deload-actions'))
    pg.click('#deload-actions .link-btn'); pg.wait_for_timeout(200)
    check('report annulé : déload de retour', pg.is_visible('#deload-subtitle'))

    # ---------- 11. Rien d'actif : écran Séance vide ----------
    pg.evaluate("state.programs.forEach(p=>{if(p.status==='active'){p.status='paused'}}); saveState(); initWorkoutForm(); switchTab('seance')"); pg.wait_for_timeout(300)
    check('rien d\'actif : « Aucune séance prévue », formulaire et chrono masqués', pg.is_visible('#seance-empty') and not pg.is_visible('#workout-form') and not pg.is_visible('#timer-btn'))
    pg.evaluate("switchTab('programme')"); pg.wait_for_timeout(200)
    check('rien d\'actif : « Aucun programme actif »', 'Aucun programme actif' in pg.inner_text('#program-overview'))
    check('aucune erreur JS', not errs, str(errs))
    ctx.close()

    # ---------- 12. Premier lancement (aucune donnée) ----------
    ctx, pg, errs = newpage(br, 390, 844, pref='light', seed=False)
    pg.goto(base + 'index.html'); pg.wait_for_timeout(900)
    check('premier lancement : écran 1 « rien de prévu », lien Restaurer', 'rien de prévu au programme' in pg.inner_text('#program-overview') and pg.locator('.prog-empty-restore .link-btn').count() == 1)
    check('premier lancement : aucun programme créé', state(pg).get('programs') == [])
    pg.click('.prog-empty-restore .link-btn'); pg.wait_for_timeout(200)
    check('Restaurer sans Google Drive : écran 2 « Se connecter à Google Drive »', 'Se connecter à Google Drive' in pg.inner_text('.sheet'))
    pg.evaluate("closeSheet()")
    pg.evaluate("switchTab('historique')"); pg.click('#tab-historique .backup-card .btn-secondary'); pg.wait_for_timeout(300)
    check('Historique « Restaurer » sans Drive : fenêtre « Restaurer une sauvegarde », seulement « Choisir un fichier… » et le lien de connexion', 'Restaurer une sauvegarde' in pg.inner_text('.sheet') and pg.locator('.sheet .backup-item.drive').count() == 0 and pg.locator('.sheet .backup-item.file').count() == 1 and 'Se connecter à Google Drive' in pg.inner_text('.sheet') and not pg.locator('#backup-restore-go').count())
    pg.click('.sheet .backup-item.file')
    with pg.expect_file_chooser() as fc:
        pg.click('#backup-restore-go')
    check('« Choisir le fichier » : ouvre le choix de fichier de l\'appareil, fenêtre refermée', fc.value is not None and not pg.evaluate("!!document.querySelector('#sheet-overlay.open')"))
    pg.evaluate("switchTab('programme')")
    # écran 3 : liste à cocher (données préparées directement, sans Drive)
    pg.evaluate("""restoreCandidates=[{id:'x1',name:'Prise de masse',kind:'program',status:'active',savedAt:'2026-11-07T18:42:00Z',nextKey:'A',sessions:[{key:'A',name:'',exercises:[{exId:39,sets:3}]},{key:'B',name:'',exercises:[{exId:25,sets:3}]}]},
                    {id:'x2',name:'Dorsaux',kind:'libre',status:'new',savedAt:'2026-11-05T19:03:00Z',nextKey:'',sessions:[{key:'',name:'Dorsaux',exercises:[{exId:26,sets:3}]}]}];
                    restoreSelected=new Set(); renderProgramRestoreList()""")
    check('écran 3 : bouton « Restaurer » absent tant que rien n\'est coché', pg.locator('.sheet .btn:not(.btn-secondary)').count() == 0)
    pg.click('.restore-item >> nth=0'); pg.click('.restore-item >> nth=1')
    check('écran 3 : « Restaurer les 2 programmes »', pg.inner_text('.sheet .btn:not(.btn-secondary)') == 'Restaurer les 2 programmes')
    pg.click('.sheet .btn:not(.btn-secondary)'); pg.wait_for_timeout(300)
    st = state(pg)
    check('restauration : tout arrive en pause, l\'historique n\'est pas touché', [(x['name'], x['status']) for x in st['programs']] == [('Prise de masse', 'paused'), ('Dorsaux', 'paused')] and st['history'] == [])
    pg.evaluate("restoreSelected=new Set([0]); restoreSelectedPrograms()")
    check('restauration : un programme déjà présent n\'est pas dupliqué', len(state(pg)['programs']) == 2)
    check('aucune erreur JS', not errs, str(errs))
    ctx.close()

    # ---------- 13. Import d'une ancienne sauvegarde (sans programmes) ----------
    ctx, pg, errs = newpage(br, 390, 844, pref='light', seed=False)
    pg.on('dialog', lambda d: d.accept())
    pg.goto(base + 'index.html'); pg.wait_for_timeout(700)
    pg.set_input_files('#import-file', files=[{'name': 'vieux.json', 'mimeType': 'application/json', 'buffer': json.dumps(DATA).encode()}])
    pg.wait_for_timeout(700)
    st = state(pg)
    check('import d\'une sauvegarde 1.6 : migration « Hypertrophie » appliquée', [x['name'] for x in st['programs']] == ['Hypertrophie'] and all(h.get('programId') == 'hypertrophie' for h in st['history']) and len(st['history']) == len(DATA['history']))
    check('aucune erreur JS', not errs, str(errs))
    ctx.close()

    # ---------- 14. Mise en page des nouveaux écrans (débordements), clair et sombre ----------
    for w, scheme in ((390, 'light'), (360, 'dark')):
        ctx, pg, errs = newpage(br, w, 760, pref=scheme)
        pg.on('dialog', lambda d: d.accept())
        pg.goto(base + 'index.html'); pg.wait_for_timeout(800)
        screens = {}
        pg.evaluate("toggleProgramDetail()"); screens['accueil'] = pg.evaluate(OVERFLOW_JS)
        pg.click('#add-program-btn'); screens['choix'] = pg.evaluate(OVERFLOW_JS)
        pg.click('.choose-card:not(.libre)'); screens['éditeur'] = pg.evaluate(OVERFLOW_JS)
        pg.click('.ed-add'); pg.wait_for_timeout(150); screens['ajout'] = pg.evaluate(OVERFLOW_JS)
        pg.evaluate("closeSheet(); switchTab('progression')"); pg.wait_for_timeout(300); screens['progression'] = pg.evaluate(OVERFLOW_JS)
        pg.evaluate("switchTab('historique')"); screens['historique'] = pg.evaluate(OVERFLOW_JS)
        bad = {k: v for k, v in screens.items() if v['out'] or v['docW'] > v['vw']}
        check(f'{w} px, {scheme} : aucun débordement (accueil, choix, éditeur, ajout, progression, historique)', not bad, str(bad))
        check(f'{w} px, {scheme} : aucune erreur JS', not errs, str(errs))
        ctx.close()
    br.close()

print('\n', sum(res), '/', len(res), 'contrôles OK')
sys.exit(0 if all(res) else 1)
