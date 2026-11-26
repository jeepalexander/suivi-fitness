"""Saisie rapide, volet (1.8.92, co-auteur : Claude) : sur un écran tactile, un appui sur un champ de série de Séance ouvre
le volet ; chaque mode à 390 et 360 px, en clair et en sombre, sans débordement ; « Remplir la série » remplit sans cocher
et recopie la charge sur les séries suivantes non cochées ; poids de la barre et poids à vide gardés par exercice ;
bouton clavier ; tonnage × 2 avec deux haltères. Captures dans /tmp/saisie_rapide."""
import json, os, sys
from harness import Srv, sync_playwright, DATA, ouvrir, debordements, Bilan, variantes

OUT = '/tmp/saisie_rapide'
os.makedirs(OUT, exist_ok=True)
EXOS = ['Développé couché', 'Curl barre EZ', 'Presse à cuisses', 'Mollets assis', 'Curl biceps', 'Tirage horizontal',
        'Tractions', 'Pompes', 'Planche', 'Rameur']
MODES = {'Développé couché': 'barbell', 'Curl barre EZ': 'shortbar', 'Presse à cuisses': 'platemachine', 'Mollets assis': 'platemachine',
         'Curl biceps': 'dumbbell', 'Tirage horizontal': 'machine', 'Tractions': 'bw', 'Pompes': 'reps', 'Planche': 'time', 'Rameur': 'cardio'}
SEANCE = """(names => {
  const s = state.programs[0].sessions[0];
  s.exercises = names.map(n => ({ exId: CATALOGUE_BY_NAME[n].id, sets: 3 }));
  localStorage.removeItem('h49_draft'); saveState();
  switchTab('programme'); setProgramView('home'); switchTab('seance');
  document.querySelectorAll('.ex-toggle').forEach(b => { if (b.getAttribute('aria-expanded') !== 'true') toggleExercise(b); });
})(%s)""" % json.dumps(EXOS)


def page(br, url, w, theme, touch=True):
    ctx = br.new_context(viewport={'width': w, 'height': 844}, device_scale_factor=2, service_workers='block', color_scheme=theme,
                         has_touch=touch, is_mobile=touch)
    ctx.route('**/accounts.google.com/**', lambda r: r.fulfill(status=200, content_type='application/javascript', body=''))
    pg = ctx.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.add_init_script("window.__uiZoom=1;if(!localStorage.getItem('h49_state'))localStorage.setItem('h49_state', %s);"
                       "localStorage.setItem('h49_theme','%s');" % (json.dumps(json.dumps(DATA)), theme))
    pg.goto(url + 'index.html')
    pg.wait_for_timeout(1200)
    ouvrir(pg, SEANCE, 600)
    return ctx, pg, errs


def champ(pg, ex, rang=0, quoi='weight'):
    return pg.locator(f'#exercises-list .exercise-item[data-ex="{ex}"] .set-row').nth(rang).locator(f'.{quoi}-input')


def ouvre(pg, ex, rang=0, quoi=None):
    q = quoi or ('reps' if MODES[ex] == 'reps' else 'weight')
    pg.evaluate("ex => { const i = document.querySelector(`#exercises-list .exercise-item[data-ex=\"${ex}\"]`); if (!i.classList.contains('open')) toggleExercise(i.querySelector('.ex-toggle')); }", ex)
    pg.wait_for_timeout(150)
    c = champ(pg, ex, rang, q)
    c.scroll_into_view_if_needed()
    c.click()
    pg.wait_for_timeout(250)


def act(pg, a, v=None):
    sel = f'#quick-sheet [data-act="{a}"]' + (f'[data-v="{v}"]' if v is not None else '')
    pg.locator(sel).first.click()
    pg.wait_for_timeout(80)


def entete(pg):
    return pg.evaluate("document.querySelector('#quick-sheet .qs-zh .qs-w').textContent.replace(/\\s+/g,' ').trim()")


b = Bilan()
with Srv() as url, sync_playwright() as p:
    br = p.chromium.launch()
    # 1. Chaque mode, 2 largeurs, 2 thèmes : volet ouvert, bon mode, rien ne déborde
    for w, theme in variantes():
        ctx, pg, errs = page(br, url, w, theme)
        b.ok(f'{w} {theme} : champs de série en lecture seule (pas de clavier)', pg.evaluate(
            "[...document.querySelectorAll('#exercises-list .set-input')].every(i => i.type === 'hidden' || i.readOnly)"))
        for ex in EXOS:
            ouvre(pg, ex)
            st = pg.evaluate("QuickInput.state() && QuickInput.state().mode")
            vis = pg.evaluate("getComputedStyle(document.getElementById('quick-overlay')).display !== 'none'")
            pb = debordements(pg)
            sheet = pg.evaluate("(() => { const r = document.getElementById('quick-sheet').getBoundingClientRect(); return [r.top, r.bottom, innerHeight]; })()")
            b.ok(f'{w} {theme} {ex} : volet « {MODES[ex]} » ouvert, sans débordement, tient à l\'écran',
                 vis and st == MODES[ex] and not pb and sheet[0] >= 0, (st, pb, sheet))
            pg.screenshot(path=f'{OUT}/{w}_{theme}_{MODES[ex]}_{ex.replace(" ", "_")}.png')
            if MODES[ex] in ('barbell', 'shortbar'):
                act(pg, 'chooser')
                b.ok(f'{w} {theme} {ex} : choix de la barre sans débordement', not debordements(pg), debordements(pg))
                pg.screenshot(path=f'{OUT}/{w}_{theme}_{MODES[ex]}_choix.png')
            act(pg, 'close')
        b.ok(f'{w} {theme} : aucune erreur JavaScript', not errs, errs)
        ctx.close()

    # 2. Fonctionnement (390, clair)
    ctx, pg, errs = page(br, url, 390, 'light')
    # Barre : 2 × 20 sur une barre de 20 kg = 60 kg ; ne coche pas ; recopie sur les séries suivantes non cochées
    pg.evaluate("document.querySelector('#exercises-list .exercise-item[data-ex=\"Développé couché\"] .set-row:nth-of-type(3) .btn-check-set') && 0")
    rows = "#exercises-list .exercise-item[data-ex='Développé couché'] .set-row"
    pg.evaluate(f"document.querySelectorAll(\"{rows}\")[2].querySelector('.btn-check-set').click()")   # 3ᵉ série cochée
    ouvre(pg, 'Développé couché')
    while pg.locator('#quick-sheet [data-act="unplate"]:not([disabled])').count():
        act(pg, 'unplate')
    act(pg, 'plate', 20)
    b.ok('barre : 20 + 2 × 20 = 60 kg en tête, total seul', entete(pg) == '60kg', entete(pg))
    act(pg, 'reps', 5); act(pg, 'reps', 1)
    reps0 = pg.evaluate("QuickInput.state().reps")
    act(pg, 'fill')
    vals = pg.evaluate(f"[...document.querySelectorAll(\"{rows}\")].map(r => [r.querySelector('.weight-input').value, r.querySelector('.reps-input').value, r.classList.contains('done')])")
    b.ok('« Remplir la série » remplit la ligne sans la cocher', vals[0][0] == '60' and vals[0][1] == str(reps0) and not vals[0][2], vals)
    b.ok('charge recopiée sur la série suivante non cochée, pas sur la série cochée', vals[1][0] == '60' and vals[2][0] != '60', vals)
    b.ok('volet fermé après « Remplir la série »', not pg.evaluate("QuickInput.state()"))
    # Réouverture : disques retrouvés ; choix de la barre de 15 kg gardé pour l'exercice
    ouvre(pg, 'Développé couché')
    b.ok('réouverture : 60 kg décomposés en 2 × 20', pg.evaluate("JSON.stringify(QuickInput.state().plates)") == '[20]', pg.evaluate("QuickInput.state().plates"))
    act(pg, 'chooser'); act(pg, 'pick-bar', 15)
    b.ok('barre de 15 kg : 15 + 2 × 20 = 55 kg', entete(pg) == '55kg', entete(pg))
    b.ok('poids de la barre gardé pour l\'exercice', pg.evaluate("JSON.parse(localStorage.getItem('h49_bar_weights'))['Développé couché']") == 15)
    act(pg, 'close')
    # Haltères : × 2 sous l'haltère, 24 kg en tête, la série garde 12
    ouvre(pg, 'Curl biceps')
    act(pg, 'db-set', 12) if pg.locator('#quick-sheet [data-act="db-set"][data-v="12"]').count() else None
    if pg.evaluate("QuickInput.state().unit") != 12:
        pg.evaluate("(() => { const s = QuickInput.state(); s.unit = 12; s.rackStart = 10; })()"); act(pg, 'rack', 1); act(pg, 'rack', -1); act(pg, 'db-set', 12)
    b.ok('haltères : « × 2 » affiché et 24 kg en tête', pg.locator('#quick-sheet .qs-x2').count() == 1 and entete(pg) == '24kg', entete(pg))
    act(pg, 'fill')
    b.ok('haltères : la série garde le poids d\'un haltère (12)', champ(pg, 'Curl biceps').input_value() == '12', champ(pg, 'Curl biceps').input_value())
    # Machine chargée de disques : poids à vide gardé, inclus dans le total ; Mollets assis d'un seul côté
    ouvre(pg, 'Presse à cuisses')
    while pg.locator('#quick-sheet [data-act="unplate"]:not([disabled])').count():
        act(pg, 'unplate')
    pg.locator('#quick-sheet .qs-empty input').fill('40')
    act(pg, 'plate', 25)
    b.ok('presse : 40 à vide + 2 × 25 = 90 kg', entete(pg) == '90kg', entete(pg))
    act(pg, 'fill')
    ouvre(pg, 'Presse à cuisses', 1)
    b.ok('poids à vide retrouvé sur une autre série', pg.locator('#quick-sheet .qs-empty input').input_value() == '40')
    act(pg, 'close')
    ouvre(pg, 'Mollets assis')
    while pg.locator('#quick-sheet [data-act="unplate"]:not([disabled])').count():
        act(pg, 'unplate')
    act(pg, 'plate', 25)
    lbl = pg.evaluate("[...document.querySelectorAll('#quick-sheet .qs-lbl')].map(e => e.textContent)")
    b.ok('mollets assis : « Ajouter un disque », un seul côté (25 kg)', 'Ajouter un disque' in lbl and entete(pg) == '25kg', (lbl, entete(pg)))
    act(pg, 'close')
    # Poids du corps, durée, cardio
    ouvre(pg, 'Tractions')
    act(pg, 'lest', 5)
    b.ok('poids du corps : « PDC + 5 kg »', entete(pg) == 'PDC + 5kg', entete(pg))
    act(pg, 'pdc')
    b.ok('« POIDS DU CORPS SEUL » remet à PDC', entete(pg) == 'PDC', entete(pg))
    act(pg, 'close')
    ouvre(pg, 'Planche')
    s0 = pg.evaluate("QuickInput.state().sec")
    act(pg, 'sec', 30); act(pg, 'fill')
    b.ok('durée : + 30 s reporté dans la série (min:ss)', champ(pg, 'Planche').input_value() == '%d:%02d' % divmod(s0 + 30, 60), champ(pg, 'Planche').input_value())
    ouvre(pg, 'Rameur')
    s0, d0 = pg.evaluate("[QuickInput.state().sec, QuickInput.state().dist]")
    act(pg, 'sec', 300); act(pg, 'dist', 0.5); act(pg, 'fill')
    b.ok('cardio : + 5 min et + 500 m reportés (mètres pour le rameur)',
         champ(pg, 'Rameur').input_value() == '%d:%02d' % divmod(s0 + 300, 60) and champ(pg, 'Rameur', 0, 'reps').input_value() == str(round((d0 + 0.5) * 1000)),
         (champ(pg, 'Rameur').input_value(), champ(pg, 'Rameur', 0, 'reps').input_value()))
    # Bouton clavier : le champ redevient modifiable et prend le focus
    ouvre(pg, 'Tirage horizontal')
    act(pg, 'kb')
    b.ok('bouton clavier : champ modifiable et actif', pg.evaluate(
        "(() => { const a = document.activeElement; return a.classList.contains('weight-input') && !a.readOnly; })()"))
    # Tonnage : × 2 avec deux haltères, × 1 avec un seul
    b.ok('tonnage : × 2 pour Curl biceps, × 1 pour Rowing unilatéral et Développé couché',
         pg.evaluate("[tonnageMultiplier('Curl biceps'), tonnageMultiplier('Rowing unilatéral'), tonnageMultiplier('Développé couché')].join()") == '2,1,1')
    t = pg.evaluate("""(() => { state.history.push({ id: 'qs', date: new Date().toISOString(), exercises: [{ name: 'Curl biceps', sets: [{ weight: 12, reps: 10 }] }] });
        recalculateHistoryTonnages(); const h = state.history.find(x => x.id === 'qs'); state.history = state.history.filter(x => x.id !== 'qs'); return h.tonnage; })()""")
    b.ok('tonnage recalculé : 12 kg × 10 réps avec deux haltères = 240 kg', t == 240, t)
    b.ok('aucune erreur JavaScript', not errs, errs)
    ctx.close()

    # 3. Sans écran tactile (ordinateur) : clavier comme avant
    ctx, pg, errs = page(br, url, 390, 'light', touch=False)
    b.ok('sans écran tactile : champs modifiables, pas de volet', pg.evaluate(
        "[...document.querySelectorAll('#exercises-list .set-input')].every(i => !i.readOnly)"))
    ctx.close()
    br.close()
sys.exit(b.fin())
