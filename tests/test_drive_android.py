"""Application installée sur Android : la connexion Google s'ouvre dans le vrai Chrome (intent) ; le jeton écrit
par Chrome est repris par l'application plein écran. Le reste (navigateur, bureau) est inchangé."""
import json, sys
from urllib.parse import unquote, urlparse, parse_qs
from harness import *

res = []


def check(name, ok, extra=''):
    ok = bool(ok); res.append(ok)
    print(('OK   ' if ok else 'ÉCHEC'), name, str(extra)[:230])


UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36'
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
    pg.evaluate("window.__nav=[]; navigateTo=u=>{window.__nav.push(u)}; 0")  # capture la navigation au lieu de quitter la page
    return ctx, pg, errs


with Srv() as base, sync_playwright() as p:
    br = p.chromium.launch()
    ctx, pg, errs = page(br, base, ua=UA, installed=True)
    pg.evaluate("switchTab('reglages')"); pg.wait_for_timeout(300)
    pg.evaluate("connectGoogleDrive()")
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
    check("jeton écrit par un autre onglet : l'application plein écran passe à « Connecté » sans rien faire", st.startswith('Connecté') or 'jean@example.com' in st, st)
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
