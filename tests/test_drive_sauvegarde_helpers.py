"""Google Drive : UNE sauvegarde complète (sauvegarde_complete.json) mise à jour à chaque modification, jamais dupliquée ;
protection contre l'écrasement d'une sauvegarde plus complète ; restauration depuis Drive.
Google Identity et l'API Drive sont simulés (aucun appel réseau réel)."""
import json, sys
from harness import *
from drive_mock import FakeDrive





N = len(DATA['history'])
MOCK_GOOGLE = """
window.__reqs=[]; window.__revoked=null;
window.google={accounts:{oauth2:{
  initTokenClient(cfg){ return {requestAccessToken(o){ window.__reqs.push(o||{});
    setTimeout(()=>cfg.callback({access_token:'tokPOPUP', expires_in:3600}),30); }}; },
  revoke(t,cb){ window.__revoked=t; if(cb)cb(); }}}};
"""
VALID = "localStorage.setItem('h49_drive_token', JSON.stringify({access_token:'tok1', expires_at: Date.now()+3600000}));localStorage.setItem('h49_drive_wanted','1');"
EXPIRED = "localStorage.setItem('h49_drive_token', JSON.stringify({access_token:'old', expires_at: Date.now()-1000}));localStorage.setItem('h49_drive_wanted','1');localStorage.setItem('h49_drive_account', JSON.stringify({email:'jean@example.com',name:'J'}));"
FOLDER = "localStorage.setItem('h49_drive_folder_id','F1');"
BKID = "localStorage.setItem('h49_drive_backup_id','BK1');"
STATUS = "switchTab('reglages'), document.getElementById('drive-status').textContent"
ls = lambda pg, k: pg.evaluate("k=>localStorage.getItem(k)", k)
local_state = lambda pg: json.loads(ls(pg, 'h49_state'))


def run(br, base, drive, seeds=(), confirm=True, history=None):
    ctx, pg, errs = newpage(br, 390, 844, pref='light')
    pg.add_init_script(MOCK_GOOGLE)
    if history is not None:
        data = dict(DATA); data['history'] = history
        pg.add_init_script("if(!localStorage.getItem('seeded_state')){localStorage.setItem('h49_state', %s);localStorage.setItem('seeded_state','1')}" % json.dumps(json.dumps(data)))
    for sd in seeds:
        pg.add_init_script("if(!sessionStorage.getItem('seed_done')){%s}" % sd)
    pg.add_init_script("sessionStorage.setItem('seed_done','1')")
    dialogs = []

    def on_dialog(d):
        dialogs.append((d.type, d.message))
        d.accept() if (d.type != 'confirm' or confirm) else d.dismiss()
    pg.on('dialog', on_dialog)
    pg.route('**/www.googleapis.com/**', drive.handle)
    pg.goto(base + 'index.html')
    return ctx, pg, dialogs


