"""Google Drive, application installée (plein écran) : connexion par redirection (pas par fenêtre), reconnexion
automatique à l'enregistrement d'une séance quand l'accès a expiré. Google Identity et l'API Drive sont simulés."""
import json, re, sys
from urllib.parse import urlparse, parse_qs, unquote
from harness import *

res = []


def check(name, ok, extra=''):
    ok = bool(ok)
    res.append(ok)
    print(('OK   ' if ok else 'ÉCHEC'), name, extra)


N = len(DATA['history'])
MOCK_GOOGLE = """
window.__reqs=[];
window.google={accounts:{oauth2:{
  initTokenClient(cfg){ return {requestAccessToken(o){ window.__reqs.push(o||{});
    setTimeout(()=>cfg.callback({access_token:'tokPOPUP', expires_in:3600}),30); }}; },
  revoke(t,cb){ if(cb)cb(); }}}};
"""
INSTALLED = """(()=>{const mm=window.matchMedia.bind(window);
window.matchMedia=q=>/display-mode:\\s*fullscreen/.test(q)?{matches:true,media:q,addEventListener(){},removeEventListener(){},addListener(){},removeListener(){}}:mm(q);})();"""
VALID = "localStorage.setItem('h49_drive_token', JSON.stringify({access_token:'tok1', expires_at: Date.now()+3600000}));localStorage.setItem('h49_drive_wanted','1');"
EXPIRED = "localStorage.setItem('h49_drive_token', JSON.stringify({access_token:'old', expires_at: Date.now()-1000}));localStorage.setItem('h49_drive_wanted','1');localStorage.setItem('h49_drive_account', JSON.stringify({email:'jean@example.com',name:'J'}));"
FOLDER = "localStorage.setItem('h49_drive_folder_id','F1');"
STATUS = "switchTab('reglages'), document.getElementById('drive-status').textContent"
ls = lambda pg, k: pg.evaluate("k=>localStorage.getItem(k)", k)


def run(br, base, seeds=(), installed=False, patch_status=200, goto='index.html', folder_exists=False, name_lookup=None, auth_error=False):
    ctx, pg, errs = newpage(br, 390, 844, pref='light')
    pg.add_init_script(MOCK_GOOGLE)
    if installed:
        pg.add_init_script(INSTALLED)
    for s in seeds:
        # une graine ne s'applique qu'au premier chargement (la page peut être rechargée par la redirection)
        pg.add_init_script("if(!sessionStorage.getItem('seed_done')){%s}" % s)
    pg.add_init_script("sessionStorage.setItem('seed_done','1')")
    # journal des messages (toast) qui survit à la redirection OAuth : la page est quittée juste après l'enregistrement
    pg.add_init_script("""new MutationObserver(()=>{const t=document.getElementById('toast');if(t&&t.textContent){
      const a=JSON.parse(sessionStorage.getItem('__tl')||'[]');const m=[...t.childNodes].map(n=>n.textContent).join('\\n');
      if(a[a.length-1]!==m){a.push(m);sessionStorage.setItem('__tl',JSON.stringify(a));}}}).observe(document,{childList:true,subtree:true,characterData:true});""")
    log = {'calls': [], 'auth': [], 'next_id': 0, 'dialogs': []}
    pg.on('dialog', lambda d: (log['dialogs'].append(d.message), d.accept()))

    def api(route):
        r = route.request; u = unquote(r.url); m = r.method
        log['calls'].append((m, u))
        if '/upload/drive/v3/files/' in u and m == 'PATCH':
            st = patch_status
            return route.fulfill(status=st, content_type='application/json', body='{"id":"p"}' if st == 200 else '{"error":{}}')
        if '/upload/drive/v3/files' in u and m == 'POST':
            log['next_id'] += 1
            return route.fulfill(status=200, content_type='application/json', body=json.dumps({'id': 'CREATED%d' % log['next_id'], 'name': 'n'}))
        if '/drive/v3/about' in u:
            return route.fulfill(status=200, content_type='application/json', body='{"user":{"emailAddress":"jean@example.com"}}')
        if m == 'POST' and u.rstrip('/').endswith('/drive/v3/files'):
            return route.fulfill(status=200, content_type='application/json', body='{"id":"NEWF"}')
        if "mimeType='application/vnd.google-apps.folder'" in u:
            files = [{'id': 'EXIST'}] if folder_exists else []
            return route.fulfill(status=200, content_type='application/json', body=json.dumps({'files': files}))
        if 'sauvegarde_complete.json' in u:  # recherche de la sauvegarde complète : absente
            return route.fulfill(status=200, content_type='application/json', body='{"files":[]}')
        return route.fulfill(status=200, content_type='application/json', body='{"files":[]}')
    pg.route('**/www.googleapis.com/**', api)

    def auth(route):
        u = route.request.url
        log['auth'].append(u)
        q = parse_qs(urlparse(u).query)
        back = q['redirect_uri'][0] + ('#error=access_denied&state=' if auth_error else '#access_token=tokR&expires_in=3599&token_type=Bearer&scope=x&state=') + q['state'][0]
        route.fulfill(status=302, headers={'Location': back}, body='')
    pg.route('**/accounts.google.com/o/oauth2/v2/auth*', auth)
    pg.goto(base + goto)
    return ctx, pg, log


def sent(log, method, frag):
    return [u for (m, u) in log['calls'] if m == method and frag in u]


with Srv() as base, sync_playwright() as p:
    br = p.chromium.launch()

    # ---------- (1) application installée : connexion par redirection ----------
    ctx, pg, log = run(br, base, installed=True)
    pg.wait_for_timeout(1200)
    pg.evaluate("connectGoogleDrive()"); pg.wait_for_timeout(5000)
    q = parse_qs(urlparse(log['auth'][0]).query) if log['auth'] else {}
    check("installée : la page va chez Google par redirection (pas de fenêtre)", len(log['auth']) == 1)
    check("redirection : identifiant client, retour sur l'adresse de l'appli, jeton demandé, portée Drive",
          q.get('client_id', [''])[0].endswith('.apps.googleusercontent.com') and q.get('redirect_uri') == [base] and q.get('response_type') == ['token'] and 'auth/drive.file' in q.get('scope', [''])[0], str({k: v for k, v in q.items() if k != 'client_id'}))
    check("redirection : « state » aléatoire de 32 caractères", re.fullmatch(r'[0-9a-f]{32}', q.get('state', [''])[0]) is not None)
    check("retour : jeton lu et mémorisé, souhait de sauvegarde retenu", ls(pg, 'h49_drive_token') and json.loads(ls(pg, 'h49_drive_token'))['access_token'] == 'tokR' and ls(pg, 'h49_drive_wanted') == '1')
    check("retour : adresse nettoyée (plus de jeton dans l'URL), « state » consommé", '#' not in pg.url and 'access_token' not in pg.url and ls(pg, 'h49_drive_oauth_state') is None, pg.url)
    check("retour : l'application revient sur Réglages, « Connecté »", pg.evaluate("document.body.dataset.tab") == 'reglages' and pg.evaluate("document.getElementById('drive-status').textContent").startswith('Connecté'), pg.evaluate("document.getElementById('drive-status').textContent"))
    check("retour : dossier créé et UNE sauvegarde complète envoyée (tout l'historique dans un seul fichier)", len(sent(log, 'POST', '/upload/drive/v3/files')) == 1, f"{len(sent(log, 'POST', '/upload/drive/v3/files'))} envoi(s)")
    ctx.close()

    # retour avec un « state » inconnu : ignoré
    ctx, pg, log = run(br, base, seeds=["localStorage.setItem('h49_drive_oauth_state','GOOD');"], goto='index.html#access_token=evil&expires_in=3599&state=WRONG')
    pg.wait_for_timeout(1500)
    check("retour avec un mauvais « state » : jeton ignoré, adresse nettoyée", ls(pg, 'h49_drive_token') is None and '#' not in pg.url, pg.url)
    ctx.close()

    # retour avec une erreur de Google
    ctx, pg, log = run(br, base, seeds=["localStorage.setItem('h49_drive_oauth_state','S1');"], goto='index.html#error=access_denied&state=S1')
    pg.wait_for_timeout(1800)
    txt = pg.evaluate("document.getElementById('drive-status').textContent")
    check("retour en erreur (access_denied) : rien de mémorisé, raison affichée", ls(pg, 'h49_drive_token') is None and 'Connexion Google refusée (access_denied)' in txt and pg.evaluate("document.body.dataset.tab") == 'reglages', txt)
    ctx.close()

    # navigateur : la fenêtre habituelle est conservée
    ctx, pg, log = run(br, base, installed=False)
    pg.wait_for_timeout(1200)
    pg.evaluate("connectGoogleDrive()"); pg.wait_for_timeout(1500)
    check("navigateur : connexion par la fenêtre Google (comme avant), aucune redirection", pg.evaluate("window.__reqs.length") == 1 and not log['auth'])
    ctx.close()

    # installée + jeton expiré : pas de fenêtre, séance gardée, bouton « Reconnecter maintenant »
    NOAUTO = "localStorage.setItem('h49_drive_auto_reconnect', String(Date.now()));"  # reconnexion automatique déjà tentée à l'instant
    ctx, pg, log = run(br, base, seeds=[EXPIRED, FOLDER, NOAUTO], installed=True)
    pg.wait_for_timeout(1200)
    pg.evaluate("state.history[0].tonnage += 1; saveState(); backupToDrive()"); pg.wait_for_timeout(900)
    txt = pg.evaluate(STATUS)
    check("installée + accès expiré (reconnexion déjà tentée à l'instant) : aucune fenêtre Google, modifications gardées en attente", pg.evaluate("window.__reqs.length") == 0 and pg.evaluate("driveNeedsBackup()"))
    check("installée + accès expiré : Réglages propose « Reconnecter maintenant » et l'explique", 'reconnexion automatique' in txt and 'Reconnecter maintenant' in txt and "modifications en attente d'envoi" in txt and pg.evaluate("document.getElementById('drive-connect-btn').textContent") == 'Reconnecter maintenant', txt)
    pg.evaluate("connectGoogleDrive()"); pg.wait_for_timeout(4500)
    check("« Reconnecter maintenant » : redirection avec l'adresse du compte (login_hint), puis sauvegarde envoyée",
          parse_qs(urlparse(log['auth'][0]).query).get('login_hint') == ['jean@example.com'] and len(sent(log, 'POST', '/upload/drive/v3/files')) >= 1 and not pg.evaluate("driveNeedsBackup()"), str(log['auth'][:1]))
    ctx.close()

    # ---------- (3) reconnexion AUTOMATIQUE à l'enregistrement (vrai formulaire) ----------
    def save_form(pg):
        pg.evaluate("switchTab('seance')"); pg.wait_for_timeout(200)
        pg.evaluate("document.querySelectorAll('.exercise-item')[0].querySelector('.ex-toggle').click()")
        pg.evaluate("document.querySelectorAll('.set-row')[0].querySelector('.btn-check-set').click()")
        pg.evaluate("document.getElementById('workout-form').requestSubmit()")

    ctx, pg, log = run(br, base, seeds=[EXPIRED, FOLDER], installed=True)
    pg.wait_for_timeout(1200)
    n_before = len(json.loads(ls(pg, 'h49_state'))['history'])
    save_form(pg); pg.wait_for_timeout(6000)
    saved = [d for d in pg.evaluate("JSON.parse(sessionStorage.getItem('__tl')||'[]')") if 'Séance enregistrée' in d]
    check("installée + accès expiré : le message d'enregistrement annonce la reconnexion automatique", saved and 'Google Drive : accès expiré, reconnexion automatique' in saved[-1], str(saved[-1:])[:160])
    check("installée + accès expiré : la reconnexion part toute seule (aucune question, aucun appui)", len(log['auth']) == 1 and not any('Reconnecter' in d for d in log['dialogs']), f"{len(log['auth'])} redirection(s)")
    check("au retour : accès renouvelé, la sauvegarde (avec la séance enregistrée) part sur Drive, plus rien en attente",
          json.loads(ls(pg, 'h49_drive_token'))['access_token'] == 'tokR' and len(sent(log, 'POST', '/upload/drive/v3/files')) == 1 and not pg.evaluate("driveNeedsBackup()"), f"POST={len(sent(log, 'POST', '/upload/drive/v3/files'))}")
    check("la séance est bien dans l'historique de l'application", len(json.loads(ls(pg, 'h49_state'))['history']) == n_before + 1)
    ctx.close()

    # Google refuse au retour : une seule tentative, pas de boucle
    ctx, pg, log = run(br, base, seeds=[EXPIRED, FOLDER], installed=True, auth_error=True)
    pg.wait_for_timeout(1200)
    save_form(pg); pg.wait_for_timeout(5000)
    pg.evaluate("state.history[0].tonnage += 2; saveState(); backupToDrive()"); pg.wait_for_timeout(2500)
    check("Google refuse au retour : une seule redirection, modifications gardées en attente, raison affichée",
          len(log['auth']) == 1 and json.loads(ls(pg, 'h49_drive_token'))['access_token'] != 'tokR' and pg.evaluate("driveNeedsBackup()") and 'Connexion Google refusée' in pg.evaluate("document.getElementById('drive-status').textContent"),
          f"{len(log['auth'])} redirection(s)")
    ctx.close()

    # navigateur : renouvellement silencieux par la fenêtre, pas de redirection ni de mention dans le message
    ctx, pg, log = run(br, base, seeds=[EXPIRED, FOLDER], installed=False)
    pg.wait_for_timeout(1200)
    save_form(pg); pg.wait_for_timeout(3000)
    saved = [d for d in pg.evaluate("JSON.parse(sessionStorage.getItem('__tl')||'[]')") if 'Séance enregistrée' in d]
    check("navigateur + accès expiré : renouvellement par la fenêtre, aucune redirection, message inchangé, séance envoyée",
          not log['auth'] and pg.evaluate("window.__reqs.length") == 1 and saved and 'reconnexion' not in saved[-1] and len(sent(log, 'POST', '/upload/drive/v3/files')) == 1)
    ctx.close()

    # jamais connecté à Drive : aucune redirection, aucune mention
    ctx, pg, log = run(br, base, installed=True)
    pg.wait_for_timeout(1200)
    save_form(pg); pg.wait_for_timeout(2500)
    saved = [d for d in pg.evaluate("JSON.parse(sessionStorage.getItem('__tl')||'[]')") if 'Séance enregistrée' in d]
    check("jamais connecté à Drive (installée) : aucune redirection, aucune mention de Drive", not log['auth'] and saved and 'Drive' not in saved[-1] and not log['calls'])
    ctx.close()

    br.close()

print(f"\n {sum(res)} / {len(res)} contrôles OK")
sys.exit(0 if all(res) else 1)
