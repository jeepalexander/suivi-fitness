"""1.7.29 : toutes les boîtes système (confirm / alert) sont remplacées par le volet du bas de l'app (askSheet / appAlert).
Vrais volets ici (native_dialogs=False) : aucune boîte native ne doit apparaître."""
import json, sys
from harness import *

res = []
def ok(n, c, extra=''):
    res.append(bool(c)); print(('OK   ' if c else 'FAIL ') + n, '' if c else extra)

SHOTS = '--captures' in sys.argv

def ask(pg):
    """Contenu du volet ouvert, ou None."""
    return pg.evaluate("""(()=>{const o=document.getElementById('ask-overlay');if(!o||!o.classList.contains('open'))return null;
      const ic=o.querySelector('.sheet-icon');const ok=o.querySelector('#ask-ok');const c=o.querySelector('#ask-cancel');
      const r=ok.getBoundingClientRect();const top=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
      return {tone:[...ic.classList].filter(x=>x!=='sheet-icon')[0]||'',title:o.querySelector('#ask-title').textContent,
        text:[...o.querySelectorAll('.sheet-text')].map(p=>p.textContent).join(' | '),ok:ok.textContent,cancel:c?c.textContent:null,
        danger:ok.classList.contains('btn-delete'),onTop:top===ok||ok.contains(top)}})()""")

with Srv() as url, sync_playwright() as p:
    br = p.chromium.launch()
    for w, theme in ((390, 'light'), (360, 'dark')):
        ctx, pg, errs = newpage(br, w=w, pref=theme, native_dialogs=False)
        native = []
        pg.on('dialog', lambda d: (native.append(d.message), d.dismiss()))
        pg.goto(url); pg.wait_for_timeout(700)
        tag = f'{w} px {theme} : '

        # ---------- Éditeur : retour sans enregistrer ----------
        pg.evaluate("switchTab('programme'); editProgram(getActiveProgram().id)"); pg.wait_for_timeout(200)
        pg.evaluate("programDraft.name='Changé'")
        pg.click('#program-overview .ed-back'); pg.wait_for_timeout(250)
        a = ask(pg)
        ok(tag + "retour avec saisie : volet « Attention », texte court, Revenir / Rester",
           a and a['tone'] == 'warn' and a['title'] == 'Attention' and a['text'] == 'Revenir en arrière annulera la saisie. Continuer ?'
           and a['ok'] == 'Revenir en arrière' and a['cancel'] == 'Rester sur le programme' and a['onTop'], a)
        if SHOTS: pg.wait_for_timeout(250); pg.screenshot(path=f'/tmp/claude-0/fen_retour_{w}_{theme}.png')
        ov = pg.evaluate(OVERFLOW_JS)
        ok(tag + "volet : rien ne déborde", ov['docW'] <= ov['vw'] and not ov['out'], ov)
        pg.click('#ask-cancel'); pg.wait_for_timeout(200)
        ok(tag + "« Rester sur le programme » : éditeur conservé", ask(pg) is None and pg.evaluate("programView") == 'editor' and pg.evaluate("programDraft.name") == 'Changé')
        pg.click('#program-overview .ed-back'); pg.wait_for_timeout(200)
        pg.mouse.click(w / 2, 40); pg.wait_for_timeout(200)
        ok(tag + "toucher le fond = renoncer", ask(pg) is None and pg.evaluate("programView") == 'editor')
        pg.click('#nav-programme'); pg.wait_for_timeout(200)
        ok(tag + "bouton Programmes avec saisie : même volet", (ask(pg) or {}).get('title') == 'Attention')
        pg.click('#ask-ok'); pg.wait_for_timeout(250)
        ok(tag + "« Revenir en arrière » : page de départ, rien d'enregistré", pg.evaluate("programView") == 'home' and pg.evaluate("getActiveProgram().name") != 'Changé')

        # ---------- Éditeur : retirer une séance remplie ; abandonner une sélection ----------
        pg.evaluate("editProgram(getActiveProgram().id)"); pg.wait_for_timeout(200)
        pg.evaluate("programDraft.sessions.push({key:'Z',name:'',exercises:[{exId:39,sets:3},{exId:26,sets:3}]}); programDraft.sessions.forEach((x,i)=>x.key=SESSION_KEYS[i]); programDraft.idx=programDraft.sessions.length-1; renderProgramOverview()")
        pg.wait_for_timeout(150)
        k = pg.evaluate("draftSession().key"); n0 = pg.evaluate("programDraft.sessions.length")
        pg.click('.ed-seg-op:not(.plus)'); pg.wait_for_timeout(200)
        a = ask(pg)
        ok(tag + f"retirer la séance {k} remplie : volet rouge « Retirer la séance {k} ? », 2 exercices",
           a and a['tone'] == 'danger' and a['danger'] and a['title'] == f'Retirer la séance {k} ?' and 'Ses 2 exercices seront retirés du programme.' in a['text'] and a['cancel'] == 'Annuler', a)
        pg.click('#ask-cancel'); pg.wait_for_timeout(150)
        ok(tag + "« Annuler » : séance gardée", pg.evaluate("programDraft.sessions.length") == n0)
        pg.click('.ed-seg-op:not(.plus)'); pg.wait_for_timeout(150); pg.click('#ask-ok'); pg.wait_for_timeout(150)
        ok(tag + "« Retirer la séance » : séance retirée", pg.evaluate("programDraft.sessions.length") == n0 - 1)
        pg.evaluate('openAddExercise()'); pg.wait_for_timeout(250)
        pg.evaluate("(()=>{const b=[...document.querySelectorAll('#sheet-overlay .add-item, #sheet-overlay [data-id]')].slice(0,3);b.forEach(x=>x.click())})()"); pg.wait_for_timeout(150)
        nsel = pg.evaluate("addSheet.selected.size")
        pg.evaluate("void cancelAddExercise()"); pg.wait_for_timeout(200)
        a = ask(pg)
        ok(tag + f"fermer l'ajout avec {nsel} exercices cochés : volet au-dessus de la liste",
           nsel > 0 and a and a['title'] == 'Abandonner la sélection ?' and a['cancel'] == 'Continuer la sélection' and a['onTop'], (nsel, a))
        if SHOTS: pg.wait_for_timeout(250); pg.screenshot(path=f'/tmp/claude-0/fen_selection_{w}_{theme}.png')
        pg.click('#ask-cancel'); pg.wait_for_timeout(150)
        ok(tag + "« Continuer la sélection » : liste toujours ouverte, sélection gardée", pg.evaluate("!!addSheet && addSheet.selected.size") == nsel
           and pg.evaluate("document.getElementById('sheet-overlay').classList.contains('open')"))
        pg.evaluate("void cancelAddExercise()"); pg.wait_for_timeout(150); pg.click('#ask-ok'); pg.wait_for_timeout(150)
        ok(tag + "« Abandonner » : liste fermée", not pg.evaluate("document.getElementById('sheet-overlay').classList.contains('open')"))
        pg.evaluate("programDraft.start = draftSnapshot(programDraft); void programEditorBack()"); pg.wait_for_timeout(200)

        # ---------- Séance : aucune série cochée, séries non cochées, annuler la séance ----------
        pg.evaluate("switchTab('seance')"); pg.wait_for_timeout(250)
        h0 = pg.evaluate("state.history.length")
        pg.evaluate("document.getElementById('workout-form').requestSubmit()"); pg.wait_for_timeout(250)
        a = ask(pg)
        ok(tag + "aucune série cochée : message bleu « Aucune série cochée », un seul bouton OK",
           a and a['tone'] == 'info' and a['title'] == 'Aucune série cochée' and a['ok'] == 'OK' and a['cancel'] is None, a)
        if SHOTS: pg.wait_for_timeout(250); pg.screenshot(path=f'/tmp/claude-0/fen_info_{w}_{theme}.png')
        pg.click('#ask-ok'); pg.wait_for_timeout(150)
        pg.evaluate("""(()=>{const it=[...document.querySelectorAll('#exercises-list .exercise-item')].find(i=>exMode(i.dataset.ex)==='weight');
            if(!it.classList.contains('open'))it.querySelector('.ex-toggle').click();const row=it.querySelector('.set-row');
            row.querySelector('.weight-input').value='40';row.querySelector('.reps-input').value='8';row.querySelector('.btn-check-set').click()})()""")
        pg.wait_for_timeout(150)
        pg.evaluate("document.getElementById('workout-form').requestSubmit()"); pg.wait_for_timeout(250)
        a = ask(pg)
        ok(tag + "séries non cochées : volet « Séries non cochées », « 1 série cochée sera enregistrée »",
           a and a['title'] == 'Séries non cochées' and a['text'].startswith('1 série cochée sera enregistrée.') and a['ok'] == 'Enregistrer' and a['cancel'] == 'Revenir à la séance', a)
        pg.click('#ask-cancel'); pg.wait_for_timeout(200)
        ok(tag + "« Revenir à la séance » : rien d'enregistré", pg.evaluate("state.history.length") == h0 and not pg.evaluate("!!document.getElementById('finish-overlay')"))
        pg.evaluate("document.getElementById('workout-form').requestSubmit()"); pg.wait_for_timeout(200); pg.click('#ask-ok'); pg.wait_for_timeout(400)
        ok(tag + "« Enregistrer » : séance enregistrée, fenêtre de fin", pg.evaluate("state.history.length") == h0 + 1 and pg.evaluate("!!document.getElementById('finish-overlay')"))
        pg.evaluate("closeFinishDialog()")
        pg.evaluate("""(()=>{const it=document.querySelector('#exercises-list .exercise-item');if(!it.classList.contains('open'))it.querySelector('.ex-toggle').click()})()""")
        pg.fill('#exercises-list .exercise-item.open .weight-input', '30'); pg.wait_for_timeout(2300)
        pg.click('#cancel-session-btn'); pg.wait_for_timeout(200)
        a = ask(pg)
        ok(tag + "annuler la séance : volet rouge « Annuler la séance ? », « Continuer la séance »",
           a and a['danger'] and a['title'] == 'Annuler la séance ?' and a['cancel'] == 'Continuer la séance', a)
        pg.click('#ask-cancel'); pg.wait_for_timeout(150)
        ok(tag + "« Continuer la séance » : chrono gardé", pg.evaluate("localStorage.getItem('workout_start_time')!==null"))
        pg.click('#cancel-session-btn'); pg.wait_for_timeout(150); pg.click('#ask-ok'); pg.wait_for_timeout(250)
        ok(tag + "« Annuler la séance » : chrono remis à zéro", pg.evaluate("localStorage.getItem('workout_start_time')===null"))

        # ---------- Historique : supprimer une séance (volet au-dessus de la fenêtre de détail) ----------
        pg.evaluate("switchTab('historique'); openSessionModal(state.history.length-1)"); pg.wait_for_timeout(200)
        h1 = pg.evaluate("state.history.length")
        pg.click('#modal-delete-btn'); pg.wait_for_timeout(200)
        a = ask(pg)
        ok(tag + "supprimer une séance : volet rouge au-dessus du détail, « Suppression définitive. »",
           a and a['danger'] and a['title'].startswith('Supprimer la séance') and a['text'].startswith('Suppression définitive.') and a['onTop'], a)
        if SHOTS: pg.wait_for_timeout(250); pg.screenshot(path=f'/tmp/claude-0/fen_supprimer_{w}_{theme}.png')
        pg.click('#ask-cancel'); pg.wait_for_timeout(150)
        ok(tag + "« Annuler » : séance gardée", pg.evaluate("state.history.length") == h1)
        pg.click('#modal-delete-btn'); pg.wait_for_timeout(150); pg.click('#ask-ok'); pg.wait_for_timeout(400)
        ok(tag + "« Supprimer la séance » : séance supprimée", pg.evaluate("state.history.length") == h1 - 1)

        # ---------- Réinitialiser les données : seulement « Annuler » ----------
        pg.evaluate("void resetData()"); pg.wait_for_timeout(200)
        a = ask(pg)
        ok(tag + "réinitialiser : volet rouge « Réinitialiser les données ? »", a and a['danger'] and a['title'] == 'Réinitialiser les données ?', a)
        pg.click('#ask-cancel'); pg.wait_for_timeout(150)
        ok(tag + "« Annuler » : rien de touché", pg.evaluate("state.history.length") == h1 - 1)

        ok(tag + "aucune boîte système affichée", not native, native)
        ok(tag + "aucune erreur JavaScript", not errs, errs)
        ctx.close()
    br.close()

src = '\n'.join((REPO / f).read_text(encoding='utf-8') for f in ['app.js', 'js/programmes.js', 'js/security.js'])
import re
code = re.sub(r'//[^\n]*', '', src)  # commentaires ignorés
left = [m.group(0) for m in re.finditer(r'(?<![\w.])(confirm|alert)\(', code)]
ok("code : plus aucun appel à confirm() ou alert()", not left, left)
print(f"\n {sum(res)} / {len(res)} contrôles OK")
sys.exit(0 if all(res) else 1)
