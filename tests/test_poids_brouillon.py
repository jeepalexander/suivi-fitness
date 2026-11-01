"""Brouillon du poids corporel (onglet Graphiques) : la saisie survit au rechargement."""
import json, sys
from harness import *

res = []


def check(name, ok, extra=''):
    res.append(ok)
    print(('OK   ' if ok else 'ÉCHEC'), name, extra)


KEY = 'h49_draft_weight'
with Srv() as base, sync_playwright() as p:
    br = p.chromium.launch()
    ctx, pg, errs = newpage(br, 390, 844, pref='light')
    pg.goto(base + 'index.html'); pg.wait_for_timeout(800); pg.evaluate("switchTab('progression')"); pg.wait_for_timeout(400)
    check('champ vide : aucun brouillon écrit', pg.evaluate(f"localStorage.getItem('{KEY}')") is None)
    pg.fill('#new-weight', '81.4'); pg.wait_for_timeout(150)
    d = json.loads(pg.evaluate(f"localStorage.getItem('{KEY}')"))
    check('saisie : brouillon écrit', d['value'] == '81.4' and d['v'] == 1, str(d))

    pg.reload(); pg.wait_for_timeout(1000); pg.evaluate("switchTab('progression')"); pg.wait_for_timeout(300)
    check('après rechargement : poids restauré dans le champ', pg.input_value('#new-weight') == '81.4', pg.input_value('#new-weight'))
    n0 = pg.evaluate("state.weights.length")
    check('la restauration n\'ajoute rien à l\'historique des poids', n0 == pg.evaluate("JSON.parse(localStorage.getItem('h49_state')).weights.length"))

    # indépendance vis-à-vis du brouillon de séance
    pg.evaluate("switchTab('seance')"); pg.evaluate("clearDraft(); saveDraft()"); pg.wait_for_timeout(100)
    check('effacer / réécrire le brouillon de séance ne touche pas au poids', pg.evaluate(f"localStorage.getItem('{KEY}')") is not None)

    # champ vidé à la main : brouillon supprimé
    pg.evaluate("switchTab('progression')")
    pg.fill('#new-weight', ''); pg.wait_for_timeout(150)
    check('champ vidé : brouillon supprimé', pg.evaluate(f"localStorage.getItem('{KEY}')") is None)

    # validation : poids ajouté, champ et brouillon vidés, rien ne revient au rechargement
    pg.fill('#new-weight', '80.6'); pg.wait_for_timeout(100); pg.click('.weight-add'); pg.wait_for_timeout(400)
    check('« Ajouter » : poids enregistré', pg.evaluate("state.weights.length") == n0 + 1 and pg.evaluate("state.weights[state.weights.length-1].weight") == 80.6)
    check('« Ajouter » : champ et brouillon vidés', pg.input_value('#new-weight') == '' and pg.evaluate(f"localStorage.getItem('{KEY}')") is None)
    pg.reload(); pg.wait_for_timeout(900); pg.evaluate("switchTab('progression')")
    check('rechargement après ajout : champ vide (pas de fantôme)', pg.input_value('#new-weight') == '')
    check('le brouillon n\'est pas dans la sauvegarde exportée (state)', 'draft' not in json.dumps(pg.evaluate("state")).lower())

    # réinitialisation : brouillon et champ vidés
    pg.fill('#new-weight', '77.7'); pg.wait_for_timeout(100)
    pg.on('dialog', lambda dlg: dlg.accept())
    pg.evaluate("resetData()"); pg.wait_for_timeout(900)
    check('réinitialisation des données : champ et brouillon vidés', pg.input_value('#new-weight') == '' and pg.evaluate(f"localStorage.getItem('{KEY}')") is None)
    ctx.close()

    # brouillons à ignorer ou à assainir
    cas = (('périmé (> 24 h)', {'v': 1, 'value': '75.5', 'age': 25 * 3600 * 1000}, ''),
           ('virgule décimale « 72,5 »', {'v': 1, 'value': '72,5', 'age': 1000}, '72.5'),
           ('valeur négative', {'v': 1, 'value': '-5', 'age': 1000}, ''),
           ('valeur absurde (5000)', {'v': 1, 'value': '5000', 'age': 1000}, ''),
           ('mauvaise version', {'v': 2, 'value': '70', 'age': 1000}, ''),
           ('balise HTML piégée', {'v': 1, 'value': '"><img src=x onerror=window.__xss=1>', 'age': 1000}, ''),
           ('contenu illisible', 'pas du json', ''))
    for label, draft, attendu in cas:
        ctx, pg, errs = newpage(br, 390, 844)
        pg.goto(base + 'index.html'); pg.wait_for_timeout(500)
        if isinstance(draft, dict):
            js = f"localStorage.setItem('{KEY}',JSON.stringify({{v:{draft['v']},value:{json.dumps(draft['value'])},updatedAt:Date.now()-{draft['age']}}}))"
        else:
            js = f"localStorage.setItem('{KEY}','{draft}')"
        pg.evaluate(js); pg.reload(); pg.wait_for_timeout(900); pg.evaluate("switchTab('progression')")
        v = pg.input_value('#new-weight'); xss = pg.evaluate("window.__xss===1")
        check(f'brouillon {label} : {"restauré en " + attendu if attendu else "ignoré"}', v == attendu and not xss and not errs, f'valeur={v!r} xss={xss} erreurs={errs}')
        ctx.close()
    br.close()
print('\n', sum(res), '/', len(res), 'contrôles OK')
sys.exit(0 if all(res) else 1)
