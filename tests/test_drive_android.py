"""Application installée sur Android : la connexion Google s'ouvre dans le navigateur qui a installé l'application
(Chrome : intent vers le vrai Chrome ; Firefox et autres : nouvel onglet du même navigateur, 1.6.34) ; le jeton écrit
par cet onglet est repris par l'application plein écran. Le reste (navigateur, bureau) est inchangé."""
import json, sys
from urllib.parse import unquote, urlparse, parse_qs
from harness import *

res = []


def check(name, ok, extra=''):
    ok = bool(ok); res.append(ok)
    print(('OK   ' if ok else 'ÉCHEC'), name, str(extra)[:230])


UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36'
UA_FF = 'Mozilla/5.0 (Android 14; Mobile; rv:132.0) Gecko/132.0 Firefox/132.0'
UA_SAMSUNG = 'Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0.0.0 Mobile Safari/537.36'
INSTALLED = "const _m=window.matchMedia.bind(window);window.matchMedia=q=>/display-mode: *(fullscreen|standalone)/.test(q)?{matches:true,media:q,addEventListener(){},removeEventListener(){},addListener(){},removeListener(){}}:_m(q);"
GOOGLE = "window.google={accounts:{oauth2:{initTokenClient:()=>({requestAccessToken(){}}),revoke(){}}}};"


def page(br, base, ua=None, installed=True):
    ctx = br.new_context(viewport={'width': 390, 'height': 844}, user_agent=ua) if ua else br.new_context(viewport={'width': 390, 'height': 844})
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.route('**/accounts.google.com/**', lambda r: r.abort())
    pg.route('**/www.googleapis.com/**', lambda r: r.fulfill(status=200, content_type='application/json', body=json.dumps({'user': {'emailAddress': 'jean@example.com'}, 'files': [{'id': 'F1'}]})))
    pg.add_init_script(GOOGLE)
    if installed:
        pg.add_init_script(INSTALLED)
    pg.goto(base + 'index.html'); pg.wait_for_timeout(1200)
    pg.evaluate("window.__nav=[]; navigateTo=u=>{window.__nav.push(u)}; window.__tabs=[]; window.open=(u,t)=>{window.__tabs.push([u,t]); return window.__blockTabs ? null : {}}; 0")  # capture la navigation au lieu de quitter la page
    return ctx, pg, errs


with Srv() as base, sync_playwright() as p:
    br = p.chromium.launch()
    ctx, pg, errs = page(br, base, ua=UA, installed=True)
    pg.evaluate("switchTab('reglages')"); pg.wait_for_timeout(300)
    pg.evaluate("connectGoogleDrive()"); pg.wait_for_timeout(700)  # lancée ~0,4 s après l'appui (1.7.4), comme la reconnexion automatique
    nav = pg.evaluate("window.__nav")
    u = nav[0] if nav else ''
    check("Android + application installée : la connexion part vers le vrai Chrome (intent://)", len(nav) == 1 and u.startswith('intent://accounts.google.com/o/oauth2/v2/auth?') and 'package=com.android.chrome' in u, u[:120])
    fb = parse_qs(u.split('S.browser_fallback_url=')[1].split(';end')[0]) if 'S.browser_fallback_url=' in u else {}
    fb_url = unquote(u.split('S.browser_fallback_url=')[1].split(';end')[0]) if 'S.browser_fallback_url=' in u else ''
    q = parse_qs(urlparse(fb_url).query)
    check("repli (Chrome absent) : même adresse Google en https, redirect_uri de l'application, jeton demandé", fb_url.startswith('https://accounts.google.com/o/oauth2/v2/auth?') and q.get('response_type') == ['token'] and q.get('redirect_uri', [''])[0].endswith('/') and 'drive.file' in q.get('scope', [''])[0], fb_url[:140])
    check("l'état anti-falsification est mémorisé et présent dans l'adresse", pg.evaluate("localStorage.getItem('h49_drive_oauth_state')") in q.get('state', []))

    # retour : un autre onglet (Chrome) écrit le jeton -> l'application plein écran le reprend
    pg.evaluate("switchTab('reglages')")
    tok = {'access_token': 'tokA', 'expires_at': 9999999999999}
    pg2 = ctx.new_page()
    pg2.route('**/accounts.google.com/**', lambda r: r.abort()); pg2.route('**/www.googleapis.com/**', lambda r: r.fulfill(status=200, content_type='application/json', body='{"files":[]}'))
    pg2.goto(base + 'index.html'); pg2.wait_for_timeout(500)
    pg2.evaluate("t=>{localStorage.setItem('h49_drive_token', JSON.stringify(t)); localStorage.setItem('h49_drive_wanted','1')}", tok)
    pg.wait_for_timeout(2500)
    st = pg.inner_text('#drive-status')
    check("jeton écrit par un autre onglet : l'application plein écran passe à « Connecté » sans rien faire", st.startswith('Sauvegarde automatique') or 'jean@example.com' in st, st)
    ctx.close()

    # retour dans un onglet Chrome (hors plein écran) : message explicite
    ctx = br.new_context(viewport={'width': 390, 'height': 844}, user_agent=UA)
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.route('**/accounts.google.com/**', lambda r: r.abort()); pg.route('**/www.googleapis.com/**', lambda r: r.fulfill(status=200, content_type='application/json', body='{"user":{"emailAddress":"jean@example.com"},"files":[{"id":"F1"}]}'))
    pg.add_init_script(GOOGLE)
    pg.add_init_script("localStorage.setItem('h49_drive_oauth_state','abc')")
    pg.goto(base + 'index.html#access_token=tokB&expires_in=3599&state=abc&token_type=Bearer'); pg.wait_for_timeout(2500)
    check("retour OAuth dans un onglet Chrome : jeton mémorisé et message « fermer cet onglet »", pg.evaluate("JSON.parse(localStorage.getItem('h49_drive_token')).access_token") == 'tokB' and 'fermer cet onglet' in pg.inner_text('#toast'), pg.inner_text('#toast') if pg.evaluate("!!document.getElementById('toast')") else 'pas de toast')
    ctx.close()

    # Firefox (cas réel : application installée avec Firefox) : la connexion s'ouvre dans un onglet Firefox, jamais dans Chrome
    ctx, pg, errs = page(br, base, ua=UA_FF, installed=True)
    pg.evaluate("switchTab('reglages')"); pg.wait_for_timeout(300)
    pg.evaluate("connectGoogleDrive()"); pg.wait_for_timeout(700)  # lancée ~0,4 s après l'appui (1.7.4), comme la reconnexion automatique
    nav, tabs = pg.evaluate("window.__nav"), pg.evaluate("window.__tabs")
    tu = tabs[0][0] if tabs else ''
    q = parse_qs(urlparse(tu).query)
    check("Firefox + application installée : aucun intent vers Chrome, la page de l'application ne part pas", nav == [] and 'intent://' not in json.dumps(tabs), (nav, tabs))
    check("Firefox : connexion Google ouverte dans un nouvel onglet Firefox (https, jeton demandé, state mémorisé)", len(tabs) == 1 and tabs[0][1] == '_blank' and tu.startswith('https://accounts.google.com/o/oauth2/v2/auth?') and q.get('response_type') == ['token'] and pg.evaluate("localStorage.getItem('h49_drive_oauth_state')") in q.get('state', []), tu[:120])
    # l'onglet Firefox revient avec le jeton dans le stockage partagé -> l'application le reprend
    pg2 = ctx.new_page()
    pg2.route('**/accounts.google.com/**', lambda r: r.abort()); pg2.route('**/www.googleapis.com/**', lambda r: r.fulfill(status=200, content_type='application/json', body='{"user":{"emailAddress":"jean@example.com"},"files":[]}'))
    pg2.add_init_script(GOOGLE)
    pg2.goto(base + 'index.html#access_token=tokF&expires_in=3599&state=' + q.get('state', [''])[0] + '&token_type=Bearer'); pg2.wait_for_timeout(2500)
    check("retour OAuth dans l'onglet Firefox : jeton mémorisé, message « fermer cet onglet »", pg2.evaluate("(JSON.parse(localStorage.getItem('h49_drive_token'))||{}).access_token") == 'tokF' and 'fermer cet onglet' in pg2.inner_text('#toast'))
    pg.wait_for_timeout(1500)
    st = pg.inner_text('#drive-status')
    check("Firefox : l'application plein écran reprend le jeton et passe à « Connecté »", st.startswith('Sauvegarde automatique') or 'jean@example.com' in st, st)
    ctx.close()
    # onglet refusé par Firefox (ex. reconnexion automatique sans appui) : pas de page blanche, message clair
    ctx, pg, errs = page(br, base, ua=UA_FF, installed=True)
    pg.evaluate("window.__blockTabs=true; connectDriveByRedirect()"); pg.wait_for_timeout(400)
    check("Firefox, onglet bloqué : l'application reste affichée et invite à « Reconnecter maintenant »", pg.evaluate("window.__nav") == [] and 'Reconnecter maintenant' in pg.inner_text('#toast'), pg.inner_text('#toast'))
    check("aucune erreur JavaScript (Firefox)", not errs, errs)
    ctx.close()
    # 1.7.11 : accès expiré, Firefox installé -> valider un programme ne quitte pas l'application (pas d'onglet Firefox) ;
    # la sauvegarde attend, l'enregistrement d'une séance garde la reconnexion automatique
    ctx, pg, errs = page(br, base, ua=UA_FF, installed=True)
    pg.evaluate("localStorage.setItem('h49_drive_wanted','1'); localStorage.removeItem('h49_drive_token'); localStorage.removeItem('h49_drive_auto_reconnect'); window.__tabs=[]; window.__nav=[]")
    pg.evaluate("programDraft={id:null,kind:'program',name:'Test FF',sessions:[{name:'Haut',exercises:[{exId:exInfo('Dips').id,sets:3}]}],idx:0}; saveProgramDraft()")
    pg.wait_for_timeout(900)
    check("Firefox installé, accès expiré : valider un programme n'ouvre pas Firefox (aucun onglet, aucune navigation)", pg.evaluate("window.__tabs") == [] and pg.evaluate("window.__nav") == [] and any(x.get('name') == 'Test FF' for x in pg.evaluate("state.programs")), pg.evaluate("window.__tabs"))
    pg.evaluate("activateProgram(state.programs.find(x=>x.name==='Test FF').id)"); pg.wait_for_timeout(900)
    check("… ni activer un programme", pg.evaluate("window.__tabs") == [] and pg.evaluate("window.__nav") == [])
    pg.evaluate("backupToDrive()"); pg.wait_for_timeout(900)
    check("l'enregistrement d'une séance garde la reconnexion automatique (onglet Google)", len(pg.evaluate("window.__tabs")) == 1, pg.evaluate("window.__tabs"))
    check("aucune erreur JavaScript (programme + Firefox)", not errs, errs)
    ctx.close()
    # Samsung Internet : même principe que Firefox (son propre onglet, pas Chrome)
    ctx, pg, errs = page(br, base, ua=UA_SAMSUNG, installed=True)
    pg.evaluate("connectDriveByRedirect()")
    check("Samsung Internet + installé : onglet du même navigateur, pas d'intent Chrome", pg.evaluate("window.__nav") == [] and len(pg.evaluate("window.__tabs")) == 1)
    ctx.close()

    # inchangé : Android dans le navigateur (non installé) et bureau installé -> pas d'intent
    ctx, pg, errs = page(br, base, ua=UA, installed=False)
    pg.evaluate("connectDriveByRedirect()")
    check("Android dans le navigateur (non installé) : pas d'intent", not pg.evaluate("window.__nav")[0].startswith('intent://'))
    ctx.close()
    ctx, pg, errs = page(br, base, installed=True)
    pg.evaluate("connectDriveByRedirect()")
    n = pg.evaluate("window.__nav")
    check("bureau + installé : connexion Google directe en https (pas d'intent)", n and n[0].startswith('https://accounts.google.com/'), n)
    ctx.close(); br.close()

print(f"\n {sum(res)} / {len(res)} contrôles OK")
sys.exit(0 if all(res) else 1)
