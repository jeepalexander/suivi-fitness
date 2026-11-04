"""Google Drive : (1) application installée (plein écran) → connexion par redirection, pas par fenêtre ;
(2) une séance modifiée met à jour SON fichier Drive au lieu d'en créer un second.
Google Identity et l'API Drive sont simulés (aucun appel réseau réel)."""
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


def run(br, base, seeds=(), installed=False, patch_status=200, goto='index.html', folder_exists=False, name_lookup=None):
    ctx, pg, errs = newpage(br, 390, 844, pref='light')
    pg.add_init_script(MOCK_GOOGLE)
    if installed:
        pg.add_init_script(INSTALLED)
    for s in seeds:
        # une graine ne s'applique qu'au premier chargement (la page peut être rechargée par la redirection)
        pg.add_init_script("if(!sessionStorage.getItem('seed_done')){%s}" % s)
    pg.add_init_script("sessionStorage.setItem('seed_done','1')")
    log = {'calls': [], 'auth': [], 'next_id': 0}

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
        if "in parents" in u:  # recherche d'un fichier par son nom
            files = [{'id': name_lookup}] if name_lookup else []
            return route.fulfill(status=200, content_type='application/json', body=json.dumps({'files': files}))
        return route.fulfill(status=200, content_type='application/json', body='{"files":[]}')
    pg.route('**/www.googleapis.com/**', api)

    def auth(route):
        u = route.request.url
        log['auth'].append(u)
        q = parse_qs(urlparse(u).query)
        back = q['redirect_uri'][0] + '#access_token=tokR&expires_in=3599&token_type=Bearer&scope=x&state=' + q['state'][0]
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
    check(f"retour : dossier créé et historique envoyé ({N} fichiers)", len(sent(log, 'POST', '/upload/drive/v3/files')) == N, f"{len(sent(log, 'POST', '/upload/drive/v3/files'))} envois")
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
    ctx, pg, log = run(br, base, seeds=[EXPIRED, FOLDER], installed=True)
    pg.wait_for_timeout(1200)
    pg.evaluate("backupSessionToDrive({id:701,date:'2026-11-04',type:'A',tonnage:1,exercises:[]})"); pg.wait_for_timeout(900)
    txt = pg.evaluate(STATUS)
    check("installée + accès expiré : aucune fenêtre Google, séance gardée en file d'attente", pg.evaluate("window.__reqs.length") == 0 and len(json.loads(ls(pg, 'h49_drive_queue') or '[]')) == 1)
    check("installée + accès expiré : Réglages propose « Reconnecter maintenant » et l'explique", 'Reconnecter maintenant' in txt and '1 séance en attente' in txt and pg.evaluate("document.getElementById('drive-connect-btn').textContent") == 'Reconnecter maintenant', txt)
    pg.evaluate("connectGoogleDrive()"); pg.wait_for_timeout(4500)
    check("« Reconnecter maintenant » : redirection avec l'adresse du compte (login_hint), puis séance en attente envoyée",
          parse_qs(urlparse(log['auth'][0]).query).get('login_hint') == ['jean@example.com'] and len(sent(log, 'POST', '/upload/drive/v3/files')) >= 1 and json.loads(ls(pg, 'h49_drive_queue') or '[]') == [], str(log['auth'][:1]))
    ctx.close()

    # ---------- (2) séance modifiée : le fichier existant est mis à jour ----------
    SESSION = "{id:%d,date:'2026-11-02',type:'A',tonnage:1000,exercises:[]}"
    seeds = [VALID, FOLDER]

    ctx, pg, log = run(br, base, seeds=seeds + ["localStorage.setItem('h49_drive_files', JSON.stringify({'501':'FILE9'}));localStorage.setItem('h49_drive_uploaded', JSON.stringify([501]));"])
    pg.wait_for_timeout(900)
    pg.evaluate("backupSessionToDrive(%s)" % (SESSION % 501)); pg.wait_for_timeout(900)
    check("séance déjà envoyée, modifiée : le fichier FILE9 est mis à jour (PATCH)", len(sent(log, 'PATCH', '/upload/drive/v3/files/FILE9')) == 1, str(sent(log, 'PATCH', 'FILE9')))
    check("séance modifiée : aucun second fichier créé", not sent(log, 'POST', '/upload/drive/v3/files'))
    ctx.close()

    ctx, pg, log = run(br, base, seeds=seeds + ["localStorage.setItem('h49_drive_uploaded', JSON.stringify([502]));"], name_lookup='FOUND1')
    pg.wait_for_timeout(900)
    pg.evaluate("backupSessionToDrive(%s)" % (SESSION % 502)); pg.wait_for_timeout(1100)
    check("envoyée avant les identifiants de fichier : retrouvée par son nom, puis mise à jour",
          len(sent(log, 'PATCH', '/upload/drive/v3/files/FOUND1')) == 1 and not sent(log, 'POST', '/upload/drive/v3/files') and any("name='seance_2026-11-02.json'" in u for (m, u) in log['calls']))
    ctx.close()

    ctx, pg, log = run(br, base, seeds=seeds + ["localStorage.setItem('h49_drive_files', JSON.stringify({'503':'GONE'}));localStorage.setItem('h49_drive_uploaded', JSON.stringify([503]));"], patch_status=404)
    pg.wait_for_timeout(900)
    pg.evaluate("backupSessionToDrive(%s)" % (SESSION % 503)); pg.wait_for_timeout(1100)
    mp = json.loads(ls(pg, 'h49_drive_files'))
    check("fichier supprimé du Drive (404) : la séance est recréée et le nouvel identifiant retenu", len(sent(log, 'POST', '/upload/drive/v3/files')) == 1 and mp.get('503', '').startswith('CREATED'), str(mp))
    ctx.close()

    ctx, pg, log = run(br, base, seeds=seeds)
    pg.wait_for_timeout(900)
    pg.evaluate("backupSessionToDrive(%s)" % (SESSION % 601)); pg.wait_for_timeout(900)
    first = json.loads(ls(pg, 'h49_drive_files') or '{}')
    check("nouvelle séance : fichier créé et identifiant retenu", len(sent(log, 'POST', '/upload/drive/v3/files')) == 1 and first.get('601', '').startswith('CREATED'), str(first))
    pg.evaluate("backupSessionToDrive(%s)" % (SESSION % 601)); pg.wait_for_timeout(900)
    check("la même séance modifiée ensuite : mise à jour du même fichier, toujours un seul fichier",
          len(sent(log, 'POST', '/upload/drive/v3/files')) == 1 and len(sent(log, 'PATCH', '/upload/drive/v3/files/' + first['601'])) == 1)
    ctx.close()
    br.close()

print(f"\n {sum(res)} / {len(res)} contrôles OK")
sys.exit(0 if all(res) else 1)
