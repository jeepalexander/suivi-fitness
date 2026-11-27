"""Touche Entrée en saisie manuelle (1.8.109, co-auteur : Claude) : la touche « → » du clavier du téléphone dans un champ
de série n'envoie plus la séance (plus de fenêtre « Séries non cochées ») ; elle passe de Kg à Réps, puis ferme le clavier.
Le bouton « Valider & Enregistrer la séance » marche toujours. Sur ordinateur et sur écran tactile (bouton clavier du volet)."""
import json, sys
from harness import Srv, sync_playwright, DATA, Bilan, ouvrir

# Repris de test_saisie_rapide.py
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



HOOK = "(() => { window.__asks = []; window.__askHook = a => { window.__asks.push(a.title); return 'cancel'; }; })()"

b = Bilan()
with Srv() as url, sync_playwright() as p:
    br = p.chromium.launch()
    # 1. Ordinateur (champs modifiables directement)
    ctx, pg, errs = page(br, url, 390, 'dark', touch=False)
    pg.evaluate(HOOK)
    kg, reps = champ(pg, 'Développé couché', 1), champ(pg, 'Développé couché', 1, 'reps')
    ouvre(pg, 'Développé couché', 1); kg.fill('107'); kg.press('Enter'); pg.wait_for_timeout(300)
    b.ok('ordinateur : Entrée dans Kg n\'ouvre aucune fenêtre', pg.evaluate('window.__asks.length') == 0, pg.evaluate('window.__asks'))
    b.ok('ordinateur : Entrée dans Kg passe à Réps', pg.evaluate("document.activeElement.classList.contains('reps-input')"))
    reps.fill('12'); reps.press('Enter'); pg.wait_for_timeout(300)
    b.ok('ordinateur : Entrée dans Réps n\'ouvre aucune fenêtre', pg.evaluate('window.__asks.length') == 0, pg.evaluate('window.__asks'))
    b.ok('ordinateur : Entrée dans Réps ferme la saisie', pg.evaluate("!document.activeElement.classList.contains('set-input')"))
    b.ok('ordinateur : valeurs gardées, série non cochée', kg.input_value() == '107' and reps.input_value() == '12' and
         not pg.evaluate("document.querySelectorAll('#exercises-list .exercise-item[data-ex=\"Développé couché\"] .set-row')[1].classList.contains('done')"))
    # Le vrai bouton marche toujours
    pg.locator('#submit-workout-btn').scroll_into_view_if_needed(); pg.locator('#submit-workout-btn').click(); pg.wait_for_timeout(400)
    b.ok('bouton « Valider & Enregistrer » : la séance est bien envoyée (fenêtre de confirmation)', len(pg.evaluate('window.__asks')) == 1,
         pg.evaluate('window.__asks'))
    b.ok('ordinateur : aucune erreur', not errs, errs)
    ctx.close()
    # 2. Écran tactile : volet puis bouton clavier (cas de la capture)
    ctx, pg, errs = page(br, url, 390, 'dark', touch=True)
    pg.evaluate(HOOK)
    ouvre(pg, 'Presse à cuisses', 1)
    act(pg, 'kb')
    a = pg.evaluate("document.activeElement.classList.contains('weight-input') && !document.activeElement.readOnly")
    b.ok('tactile : bouton clavier, champ Kg modifiable', a)
    pg.keyboard.press('Control+A'); pg.keyboard.type('107'); pg.keyboard.press('Enter'); pg.wait_for_timeout(300)
    b.ok('tactile : Entrée n\'ouvre aucune fenêtre', pg.evaluate('window.__asks.length') == 0, pg.evaluate('window.__asks'))
    b.ok('tactile : Kg gardé', champ(pg, 'Presse à cuisses', 1).input_value() == '107', champ(pg, 'Presse à cuisses', 1).input_value())
    b.ok('tactile : aucune erreur', not errs, errs)
    ctx.close()
    br.close()
sys.exit(b.fin())
