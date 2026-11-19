"""Fin de séance → Historique (1.8.50, planche 27d variante C) : après « OK », l'Historique s'ouvre ; si un compte
Drive est configuré, une fine barre verte se déploie sous la nouvelle séance pendant l'envoi, puis « Sauvegardée sur
le Drive » et la ligne redevient normale. Sans Drive : Historique sans barre. Échec : « Sauvegarde en attente ».
Accès expiré dans l'application installée : reconnexion forcée, la séance est gardée pour le retour de Google."""
import os, sys, tempfile
from harness import Srv, newpage, sync_playwright

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
        ok(tag + "aucune erreur JS", not [e for e in errs if 'TUNNEL' not in e], errs)
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

print(f"\n{sum(res)}/{len(res)} contrôles OK")
sys.exit(0 if all(res) else 1)
