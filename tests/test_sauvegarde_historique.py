"""Fin de séance → Historique (1.8.50, planche 27d variante C) : après « OK », l'Historique s'ouvre ; si un compte
Drive est configuré, une fine barre verte se déploie sous la nouvelle séance pendant l'envoi, puis « Sauvegardée sur
le Drive » et la ligne redevient normale. Sans Drive : Historique sans barre. Échec : « Sauvegarde en attente ».
Accès expiré dans l'application installée : reconnexion forcée, la séance est gardée pour le retour de Google.
1.8.84 : après « Enregistrer les modifications », même parcours sur la ligne de la séance modifiée.
1.8.90 : l'API Google Drive est simulée (le nom du compte demandé par l'app ne part plus sur le réseau)."""
import json, os, sys, tempfile
from harness import Srv, newpage as _newpage, sync_playwright


def newpage(*a, **k):
    """Page du harness + réponse factice de l'API Drive : le jeton factice « tok » pousse l'app à demander le compte."""
    ctx, pg, errs = _newpage(*a, **k)
    pg.route('**/www.googleapis.com/**', lambda r: r.fulfill(status=200, content_type='application/json',
             body=json.dumps({'user': {'emailAddress': 'jean@example.com'}, 'files': []})))
    return ctx, pg, errs

SHOTS = os.environ.get('SHOTS_DIR') or tempfile.gettempdir()
res = []


def ok(n, c, extra=''):
    res.append(bool(c)); print(('OK   ' if c else 'FAIL ') + n, '' if c else str(extra)[:300])


ROW = """()=>{const r=document.querySelector('.history-item');return {tab:document.body.dataset.tab,id:r.dataset.id,cls:r.className,
  label:r.querySelector('.history-save-label').textContent.trim(),dur:getComputedStyle(r.querySelector('.history-duration')).display,
  tonVis:getComputedStyle(r.querySelector('.history-tonnage')).visibility, chevVis:getComputedStyle(r.querySelector('.history-chevron')).visibility,
  bar:parseFloat(getComputedStyle(r.querySelector('.history-save-bar i')).width),barOp:getComputedStyle(r.querySelector('.history-save-bar')).opacity}}"""


def finish(pg, drive):
    pg.evaluate(drive)
    pg.evaluate("switchTab('seance')"); pg.wait_for_timeout(250)
    pg.evaluate("""(()=>{const it=[...document.querySelectorAll('#exercises-list .exercise-item')].find(i=>i.querySelector('.weight-input')&&exMode(i.dataset.ex)==='weight');
        it.querySelector('.ex-toggle').click(); const row=it.querySelector('.set-row'); row.querySelector('.weight-input').value='60'; row.querySelector('.reps-input').value='10'; row.querySelector('.btn-check-set').click();})()""")
    pg.evaluate("document.getElementById('workout-form').requestSubmit()"); pg.wait_for_timeout(400)
    newest = pg.evaluate("String(Math.max(...state.history.map(h=>h.id)))")
    pg.click('.finish-ok')
    return newest


with Srv() as url, sync_playwright() as p:
    br = p.chromium.launch()
    for scheme in ('light', 'dark'):
        tag = f'[{scheme}] '
        # 1. Drive connecté, envoi de 1,5 s réussi
        ctx, pg, errs = newpage(br, 390, 844, scheme=scheme, pref=scheme); pg.on('dialog', lambda d: d.accept())
        pg.goto(url + 'index.html'); pg.wait_for_timeout(500)
        newest = finish(pg, """()=>{window.isDriveWanted=()=>true; window.getDriveToken=()=>'tok'; window.updateDriveUI=()=>{};
          window.syncDriveBackup=()=>new Promise(r=>setTimeout(()=>r({ok:true}),1500));}""")
        pg.wait_for_timeout(700)
        r = pg.evaluate(ROW)
        ok(tag + "après « OK » : Historique, la nouvelle séance en tête", r['tab'] == 'historique' and r['id'] == newest, r)
        ok(tag + "envoi en cours : « Sauvegarde sur le Drive… », barre visible qui avance, durée masquée",
           'saving' in r['cls'] and r['label'] == 'Sauvegarde sur le Drive…' and r['barOp'] == '1' and 20 < r['bar'] < 300 and r['dur'] == 'none', r)
        ok(tag + "pendant la sauvegarde : ni tonnage ni flèche", r['tonVis'] == 'hidden' and r['chevVis'] == 'hidden', r)
        pg.wait_for_timeout(1100)
        r = pg.evaluate(ROW)
        ok(tag + "envoi réussi : « Sauvegardée sur le Drive », barre pleine", 'saved' in r['cls'] and r['label'] == 'Sauvegardée sur le Drive', r)
        pg.wait_for_timeout(2300)
        r = pg.evaluate(ROW)
        ok(tag + "puis ligne normale (durée, tonnage et flèche revenus, barre cachée)", 'save-mark' not in r['cls'] and r['dur'] != 'none' and r['barOp'] == '0'
           and r['tonVis'] == 'visible' and r['chevVis'] == 'visible', r)
        ok(tag + "aucune erreur JS", not [e for e in errs if 'TUNNEL' not in e and 'Failed to load resource' not in e], errs)
        ctx.close()

    # 2. Pas de compte Drive : l'Historique s'ouvre sans barre
    ctx, pg, errs = newpage(br); pg.on('dialog', lambda d: d.accept()); pg.goto(url + 'index.html'); pg.wait_for_timeout(500)
    finish(pg, "()=>{window.isDriveWanted=()=>false; window.getDriveToken=()=>null;}")
    pg.wait_for_timeout(500); r = pg.evaluate(ROW)
    ok("sans Drive : Historique ouvert, aucune barre", r['tab'] == 'historique' and 'save-mark' not in r['cls'], r)
    ctx.close()

    # 3. Envoi en échec : « Sauvegarde en attente »
    ctx, pg, errs = newpage(br); pg.on('dialog', lambda d: d.accept()); pg.goto(url + 'index.html'); pg.wait_for_timeout(500)
    finish(pg, """()=>{window.isDriveWanted=()=>true; window.getDriveToken=()=>'tok'; window.updateDriveUI=()=>{};
      window.syncDriveBackup=()=>Promise.resolve({reason:'conflict'});}""")
    pg.wait_for_timeout(500); r = pg.evaluate(ROW)
    ok("envoi impossible : « Sauvegarde en attente », en gris", 'save-wait' in r['cls'] and r['label'] == 'Sauvegarde en attente', r)
    ctx.close()

    # 4. Application installée, accès expiré : reconnexion forcée, séance gardée pour le retour
    ctx, pg, errs = newpage(br); pg.on('dialog', lambda d: d.accept()); pg.goto(url + 'index.html'); pg.wait_for_timeout(500)
    newest = finish(pg, """()=>{window.isDriveWanted=()=>true; window.getDriveToken=()=>null; window.updateDriveUI=()=>{};
      window.renewDriveToken=()=>Promise.resolve(false); window.isInstalledApp=()=>true; window.__redir=0; window.connectDriveByRedirect=()=>{window.__redir++};
      localStorage.setItem(DRIVE_AUTO_RECONNECT_KEY, String(Date.now()));}""")
    pg.wait_for_timeout(1500)
    m = pg.evaluate("JSON.parse(localStorage.getItem('h49_hist_save_mark')||'null')")
    ok("accès expiré : reconnexion lancée même juste après une autre (forcée)", pg.evaluate("window.__redir") == 1)
    ok("la séance est gardée pour le retour de Google", m and str(m['id']) == newest, m)
    ok("au retour, l'onglet de destination est l'Historique", pg.evaluate("(()=>{window.getDriveToken=()=>'tok';return driveReturnTab('ok')})()") == 'historique')
    pg.evaluate("window.syncDriveBackup=()=>new Promise(r=>setTimeout(()=>r({ok:true}),400))")
    pg.evaluate("driveSyncOnReturn()"); pg.wait_for_timeout(150); r = pg.evaluate(ROW)
    ok("au retour : la barre reprend sous la séance", 'saving' in r['cls'] and r['id'] == newest, r)
    pg.wait_for_timeout(500); r = pg.evaluate(ROW)
    ok("au retour : « Sauvegardée sur le Drive »", 'saved' in r['cls'], r)
    ok("marque consommée", pg.evaluate("localStorage.getItem('h49_hist_save_mark')") is None)
    ctx.close()

    # 5. 1.8.84 : modification d'une ancienne séance → Historique, même barre sur la ligne modifiée
    EDITROW = """(id)=>{const r=document.querySelector(`.history-item[data-id="${id}"]`); const b=r.getBoundingClientRect();
      return {tab:document.body.dataset.tab, cls:r.className, label:r.querySelector('.history-save-label').textContent.trim(),
      visible: b.top >= 0 && b.bottom <= innerHeight}}"""
    def edit_old(pg, drive):
        pg.evaluate(drive)
        pg.evaluate("switchTab('historique')"); pg.wait_for_timeout(200)
        idx = pg.evaluate("Math.min(15, state.history.length - 1)")
        hid = pg.evaluate(f"String(state.history[{idx}].id)")
        pg.evaluate(f"openSessionModal({idx})"); pg.click('#modal-edit-btn'); pg.wait_for_timeout(300)
        pg.evaluate("document.getElementById('workout-form').requestSubmit()"); pg.wait_for_timeout(400)
        return hid
    for scheme in ('light', 'dark'):
        tag = f'[{scheme}] modification : '
        ctx, pg, errs = newpage(br, 390, 844, scheme=scheme, pref=scheme); pg.on('dialog', lambda d: d.accept())
        pg.goto(url + 'index.html'); pg.wait_for_timeout(500)
        hid = edit_old(pg, """()=>{window.isDriveWanted=()=>true; window.getDriveToken=()=>'tok'; window.updateDriveUI=()=>{};
          window.__sync=0; window.syncDriveBackup=()=>{window.__sync++; return new Promise(r=>setTimeout(()=>r({ok:true}),1500))};}""")
        r = pg.evaluate(EDITROW, hid)
        ok(tag + "Historique ouvert, barre « Sauvegarde sur le Drive… » sur la séance modifiée, visible à l'écran",
           r['tab'] == 'historique' and 'saving' in r['cls'] and r['label'] == 'Sauvegarde sur le Drive…' and r['visible'], r)
        ok(tag + "une seule barre", pg.locator('.history-item.save-mark').count() == 1)
        pg.wait_for_timeout(1400); r = pg.evaluate(EDITROW, hid)
        ok(tag + "puis « Sauvegardée sur le Drive »", 'saved' in r['cls'] and r['label'] == 'Sauvegardée sur le Drive', r)
        ok(tag + "l'envoi vers le Drive est bien parti", pg.evaluate("window.__sync") >= 1, pg.evaluate("window.__sync"))
        pg.wait_for_timeout(2200); r = pg.evaluate(EDITROW, hid)
        ok(tag + "puis ligne normale", 'save-mark' not in r['cls'], r)
        pg.evaluate("switchTab('seance')"); pg.wait_for_timeout(200)
        ok(tag + "l'onglet Séance revient à la séance du programme en cours", pg.evaluate("editingOriginalId === null") and pg.evaluate("document.getElementById('seance-overline').hidden"))
        if scheme == 'light': pg.evaluate("switchTab('historique')"); pg.wait_for_timeout(100)
        ok(tag + "aucune erreur JS", not [e for e in errs if 'TUNNEL' not in e and 'Failed to load resource' not in e], errs)
        ctx.close()
    ctx, pg, errs = newpage(br); pg.on('dialog', lambda d: d.accept()); pg.goto(url + 'index.html'); pg.wait_for_timeout(500)
    hid = edit_old(pg, "()=>{window.isDriveWanted=()=>false; window.getDriveToken=()=>null;}")
    r = pg.evaluate(EDITROW, hid)
    ok("modification sans Drive : Historique, aucune barre, message « Séance modifiée »", r['tab'] == 'historique' and 'save-mark' not in r['cls']
       and pg.evaluate("(window.__toastLog||[]).slice(-1)[0]") == 'Séance modifiée', (r, pg.evaluate("(window.__toastLog||[]).slice(-1)[0]")))
    ctx.close()

print(f"\n{sum(res)}/{len(res)} contrôles OK")
sys.exit(0 if all(res) else 1)
