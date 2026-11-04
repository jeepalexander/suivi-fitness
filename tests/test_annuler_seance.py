"""Annulation d'une séance en cours de saisie : chrono remis à zéro, brouillon supprimé, rien d'enregistré."""
import sys
from harness import *

res = []


def check(name, ok, extra=''):
    ok = bool(ok)
    res.append(ok)
    print(('OK   ' if ok else 'ÉCHEC'), name, extra)


with Srv() as base, sync_playwright() as p:
    br = p.chromium.launch()
    ctx, pg, errs = newpage(br, 390, 844, pref='light')
    dialogs = []
    answers = [False, True]
    def on_dialog(d):
        dialogs.append(d.message)
        d.accept() if answers.pop(0) else d.dismiss()
    pg.on('dialog', on_dialog)
    pg.goto(base + 'index.html'); pg.wait_for_timeout(800)
    pg.evaluate("switchTab('seance')"); pg.wait_for_timeout(400)
    visible = lambda: pg.evaluate("getComputedStyle(document.getElementById('cancel-session-btn')).display!=='none'")
    check("séance neuve : bouton « Annuler la séance » visible", visible())
    check("séance neuve : bouton « Annuler la modification » masqué", pg.evaluate("getComputedStyle(document.getElementById('cancel-edit-btn')).display==='none'"))

    hist0 = pg.evaluate("state.history.length")
    pg.evaluate("""()=>{const it=document.querySelector('#exercises-list .exercise-item');
      if(!it.classList.contains('open'))it.querySelector('.ex-toggle').click()}"""); pg.wait_for_timeout(300)
    pg.fill('#exercises-list .exercise-item.open .weight-input', '50'); pg.fill('#exercises-list .exercise-item.open .reps-input', '10')
    pg.wait_for_timeout(2500)
    check("saisie : chrono lancé et brouillon créé", pg.evaluate("localStorage.getItem('workout_start_time')!==null") and pg.evaluate("Object.keys(localStorage).some(k=>k.indexOf('draft')>=0)"))

    pg.click('#cancel-session-btn'); pg.wait_for_timeout(300)
    check("confirmation demandée ; « Annuler » dans la boîte : rien ne change", len(dialogs) == 1 and pg.evaluate("localStorage.getItem('workout_start_time')!==null"), str(dialogs))
    pg.click('#cancel-session-btn'); pg.wait_for_timeout(500)
    check("confirmé : chrono arrêté et supprimé", pg.evaluate("localStorage.getItem('workout_start_time')") is None and pg.inner_text('#workout-duration-display') == '00:00')
    check("confirmé : brouillon supprimé", pg.evaluate("!Object.keys(localStorage).some(k=>k.indexOf('draft')>=0)"))
    check("confirmé : historique inchangé", pg.evaluate("state.history.length") == hist0)
    check("confirmé : retour à l'écran Programme", pg.evaluate("document.getElementById('tab-programme').classList.contains('active')"))
    pg.evaluate("switchTab('seance')"); pg.wait_for_timeout(300)
    check("nouvelle ouverture : champ vide, chrono à 0", pg.evaluate("document.querySelector('#exercises-list .weight-input').value") != '50' and pg.inner_text('#workout-duration-display') == '00:00', pg.input_value('#exercises-list .weight-input'))
    pg.wait_for_timeout(2200)
    check("le chrono ne tourne plus tout seul", pg.inner_text('#workout-duration-display') == '00:00', pg.inner_text('#workout-duration-display'))
    check("aucune erreur JavaScript", not errs, str(errs))
    br.close()

print(f"\n {sum(res)} / {len(res)} contrôles OK")
sys.exit(0 if all(res) else 1)
