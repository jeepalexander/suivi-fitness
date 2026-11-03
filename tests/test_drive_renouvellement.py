"""Google Drive : le jeton (≈ 1 h) est renouvelé tout seul à « Enregistrer la séance » ; rien n'est perdu si Google refuse.
Google Identity et l'API Drive sont simulés (aucun appel réseau réel)."""
import json, sys
from harness import *

res = []


def check(name, ok, extra=''):
    ok = bool(ok)
    res.append(ok)
    print(('OK   ' if ok else 'ÉCHEC'), name, extra)


MOCK_GOOGLE = """
window.__reqs=[]; window.__mode='ok'; window.__n=0; window.__revoked=null;
window.google={accounts:{oauth2:{
  initTokenClient(cfg){ return {requestAccessToken(o){ window.__reqs.push(o||{}); const m=window.__mode;
    setTimeout(()=>{ if(m==='ok'){window.__n++; cfg.callback({access_token:'new'+window.__n, expires_in:3600});}
      else if(m==='popup'){cfg.error_callback({type:'popup_closed'});}
      else if(m==='error'){cfg.callback({error:'interaction_required'});} },30); }}; },
  revoke(t,cb){ window.__revoked=t; if(cb)cb(); }}}};
"""
SEED = """(()=>{const s=%s; const now=Date.now();
 if(s.token==='expired')localStorage.setItem('h49_drive_token',JSON.stringify({access_token:'old',expires_at:now-1000}));
 if(s.token==='valid')localStorage.setItem('h49_drive_token',JSON.stringify({access_token:'valid',expires_at:now+3600000}));
 if(s.wanted)localStorage.setItem('h49_drive_wanted','1');
 if(s.account)localStorage.setItem('h49_drive_account',JSON.stringify({email:'jean@example.com',name:'Jean'}));
 if(s.folder)localStorage.setItem('h49_drive_folder_id','F1');
 if(s.queue)localStorage.setItem('h49_drive_queue',JSON.stringify(s.queue));
})();"""
SESSION = "{id:%d,date:'2026-11-03',type:'A',tonnage:1000,exercises:[]}"


def run(br, base, seed, mode='ok', upload_status=200):
    ctx, pg, errs = newpage(br, 390, 844, pref='light')
    pg.add_init_script(MOCK_GOOGLE + "window.__mode=%s;" % json.dumps(mode))
    pg.add_init_script(SEED % json.dumps(seed))
    uploads, dialogs = [], []
    pg.on('dialog', lambda d: (dialogs.append(d.message), d.accept()))

    def api(route):
        u, m = route.request.url, route.request.method
        if '/upload/drive/v3/files' in u:
            uploads.append(route.request.headers.get('authorization'))
            if upload_status != 200:
                return route.fulfill(status=upload_status, content_type='application/json', body='{}')
            return route.fulfill(status=200, content_type='application/json', body='{"id":"u","name":"n"}')
        if '/drive/v3/about' in u:
            return route.fulfill(status=200, content_type='application/json', body='{"user":{"displayName":"Jean","emailAddress":"jean@example.com"}}')
        return route.fulfill(status=200, content_type='application/json', body='{"files":[{"id":"F1"}]}')
    pg.route('**/www.googleapis.com/**', api)
    pg.goto(base + 'index.html'); pg.wait_for_timeout(1500)
    return ctx, pg, uploads, dialogs


ls = lambda pg, k: pg.evaluate("k=>localStorage.getItem(k)", k)
qlen = lambda pg: len(json.loads(ls(pg, 'h49_drive_queue') or '[]'))
reqs = lambda pg: pg.evaluate("window.__reqs")
save = lambda pg, i=101: pg.evaluate("backupSessionToDrive(%s)" % (SESSION % i))
status = lambda pg: pg.evaluate("switchTab('reglages'), document.getElementById('drive-status').textContent")
BASE = {'token': 'expired', 'wanted': True, 'account': True, 'folder': True}

with Srv() as base, sync_playwright() as p:
    br = p.chromium.launch()

    # 1) jeton expiré + renouvellement accepté : la séance part, sans reconnexion manuelle
    ctx, pg, up, dl = run(br, base, BASE)
    save(pg); pg.wait_for_timeout(900)
    r = reqs(pg)
    check('renouvellement demandé une seule fois, sans écran de choix (prompt vide + adresse connue)', len(r) == 1 and r[0].get('prompt') == '' and r[0].get('hint') == 'jean@example.com', str(r))
    check('la séance est envoyée avec le NOUVEAU jeton', up == ['Bearer new1'], str(up))
    check("file d'attente vide, aucune alerte", qlen(pg) == 0 and not dl, str(dl))
    check('statut « Connecté » et souhait de sauvegarde conservé', status(pg).startswith('Connecté : jean@example.com') and ls(pg, 'h49_drive_wanted') == '1', status(pg))
    ctx.close()

    # 2) les séances restées en attente partent aussi
    ctx, pg, up, dl = run(br, base, dict(BASE, queue=[json.loads('{"id":1,"date":"2026-11-01"}'), json.loads('{"id":2,"date":"2026-11-02"}')]))
    save(pg); pg.wait_for_timeout(1200)
    check("séance du jour + 2 séances en attente envoyées, file vide", len(up) == 3 and qlen(pg) == 0, f'{len(up)} envois, file={qlen(pg)}')
    ctx.close()

    # 3) fenêtre Google fermée / bloquée : rien n'est perdu, message clair, aucune alerte
    for mode in ('popup', 'error'):
        ctx, pg, up, dl = run(br, base, BASE, mode=mode)
        save(pg); pg.wait_for_timeout(900)
        txt = status(pg)
        check(f"[{mode}] séance gardée en file d'attente, aucun envoi, aucune alerte", qlen(pg) == 1 and not up and not dl, f'file={qlen(pg)} dialogs={dl}')
        check(f"[{mode}] Réglages : 1 séance en attente + renouvellement annoncé", '1 séance en attente' in txt and 'renouvelée automatiquement' in txt, txt)
        check(f"[{mode}] bouton « Reconnecter maintenant » proposé", pg.evaluate("document.getElementById('drive-connect-btn').textContent") == 'Reconnecter maintenant')
        ctx.close()

    # 4) jamais connecté : aucune demande à Google
    ctx, pg, up, dl = run(br, base, {'token': None, 'wanted': False})
    save(pg); pg.wait_for_timeout(500)
    check('jamais connecté : aucun renouvellement demandé, statut « Non connecté »', not reqs(pg) and not up and status(pg).startswith('Non connecté'), status(pg))
    ctx.close()

    # 5) jeton encore valide : pas de demande inutile
    ctx, pg, up, dl = run(br, base, dict(BASE, token='valid'))
    save(pg); pg.wait_for_timeout(600)
    check('jeton valide : envoi direct, aucune demande à Google', not reqs(pg) and up == ['Bearer valid'], str(up))
    ctx.close()

    # 6) jeton refusé par Google (401) : on garde compte, dossier et souhait
    ctx, pg, up, dl = run(br, base, dict(BASE, token='valid'), upload_status=401)
    save(pg); pg.wait_for_timeout(600)
    check('401 : jeton oublié, compte + dossier + souhait conservés, séance en file',
          ls(pg, 'h49_drive_token') is None and ls(pg, 'h49_drive_wanted') == '1' and ls(pg, 'h49_drive_account') and ls(pg, 'h49_drive_folder_id') == 'F1' and qlen(pg) == 1)
    ctx.close()

    # 7) deux enregistrements rapprochés : une seule demande à Google
    ctx, pg, up, dl = run(br, base, BASE)
    pg.evaluate("backupSessionToDrive(%s); backupSessionToDrive(%s)" % (SESSION % 201, SESSION % 202)); pg.wait_for_timeout(1200)
    check('2 enregistrements d\'affilée : 1 seule demande, 2 envois', len(reqs(pg)) == 1 and len(up) == 2, f'{len(reqs(pg))} demande(s), {len(up)} envoi(s)')
    ctx.close()

    # 8) déconnexion voulue : tout est oublié et le jeton est révoqué
    ctx, pg, up, dl = run(br, base, dict(BASE, token='valid'))
    pg.evaluate("disconnectGoogleDrive()"); pg.wait_for_timeout(200)
    check('« Déconnecter » : jeton, compte, dossier et souhait effacés, jeton révoqué',
          all(ls(pg, k) is None for k in ('h49_drive_token', 'h49_drive_account', 'h49_drive_folder_id', 'h49_drive_wanted')) and pg.evaluate("window.__revoked") == 'valid')
    ctx.close()

    # 9) première connexion (bouton) : souhait retenu + adresse lue
    ctx, pg, up, dl = run(br, base, {'token': None, 'wanted': False})
    pg.evaluate("connectGoogleDrive()"); pg.wait_for_timeout(900)
    check('première connexion : souhait retenu, jeton stocké, adresse affichée',
          ls(pg, 'h49_drive_wanted') == '1' and 'jean@example.com' in status(pg), status(pg))
    ctx.close()
    br.close()

print(f"\n {sum(res)} / {len(res)} contrôles OK")
sys.exit(0 if all(res) else 1)
