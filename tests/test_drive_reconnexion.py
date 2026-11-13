"""1.7.39 : « Reconnecter maintenant » (Firefox non reconnu comme application installée, accès Google expiré) suit le même
mécanisme que l'enregistrement d'une séance : renouvellement silencieux (prompt '' + adresse connue), jamais l'écran
d'autorisation forcé (prompt 'consent') qui finissait sur une page blanche. Échec silencieux -> l'appui suivant
ouvre la connexion complète. Première connexion : inchangée (consent)."""
import json, sys
from harness import *

res = []
def check(name, ok, extra=''):
    ok = bool(ok); res.append(ok)
    print(('OK   ' if ok else 'ÉCHEC'), name, str(extra)[:230])

UA_FF = 'Mozilla/5.0 (Android 14; Mobile; rv:132.0) Gecko/132.0 Firefox/132.0'
# Google simulé : chaque requestAccessToken est mémorisé ; window.__grant décide de la réponse
GOOGLE = """window.__req=[]; window.__grant=true; window.google={accounts:{oauth2:{initTokenClient:(cfg)=>({requestAccessToken(o){
  window.__req.push(o||{}); setTimeout(()=>{ if(window.__grant) cfg.callback({access_token:'tokR',expires_in:3599}); else cfg.callback({error:'interaction_required'}); },50); }}),revoke(){}}}};"""

def page(br, base, wanted=True):
    ctx = br.new_context(viewport={'width': 390, 'height': 844}, user_agent=UA_FF)
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.route('**/accounts.google.com/**', lambda r: r.abort())
    pg.route('**/www.googleapis.com/**', lambda r: r.fulfill(status=200, content_type='application/json', body=json.dumps({'user': {'emailAddress': 'jean@example.com'}, 'files': [{'id': 'F1'}]})))
    pg.add_init_script(GOOGLE)
    if wanted:
        pg.add_init_script("localStorage.setItem('h49_drive_wanted','1'); localStorage.setItem('h49_drive_account', JSON.stringify({email:'jean@example.com'})); localStorage.removeItem('h49_drive_token')")
    pg.goto(base + 'index.html'); pg.wait_for_timeout(1200)
    pg.evaluate("window.__tabs=[]; window.open=(u,t)=>{window.__tabs.push(u); return {}}; window.__nav=[]; navigateTo=u=>window.__nav.push(u); window.__req=[]; 0")
    pg.evaluate("switchTab('reglages')"); pg.wait_for_timeout(300)
    return ctx, pg, errs

with Srv() as base, sync_playwright() as p:
    br = p.chromium.launch()
    ctx, pg, errs = page(br, base)
    btn = pg.locator('#drive-connect-btn')
    check("accès expiré : le bouton « Reconnecter maintenant » est affiché", btn.is_visible() and 'Reconnecter' in btn.inner_text(), btn.inner_text())
    btn.click(); pg.wait_for_timeout(1500)
    req = pg.evaluate("window.__req")
    check("appui : une seule demande Google, silencieuse (prompt vide + adresse connue), jamais « consent »", len(req) == 1 and req[0].get('prompt') == '' and req[0].get('hint') == 'jean@example.com', req)
    check("aucun onglet ni navigation (pas d'ouverture de Firefox)", pg.evaluate("window.__tabs") == [] and pg.evaluate("window.__nav") == [])
    check("jeton renouvelé : Réglages passe à « Sauvegarde automatique »", pg.inner_text('#drive-status').startswith('Sauvegarde automatique'), pg.inner_text('#drive-status'))
    check("aucune erreur JavaScript", not errs, errs)
    ctx.close()

    # Google exige une interaction : 1er appui silencieux échoue -> message ; 2e appui -> connexion complète
    ctx, pg, errs = page(br, base)
    pg.evaluate("window.__grant=false")
    pg.locator('#drive-connect-btn').click(); pg.wait_for_timeout(800)
    req = pg.evaluate("window.__req")
    check("échec silencieux : pas d'alerte bloquante, message « touche à nouveau »", len(req) == 1 and req[0].get('prompt') == '' and 'touche à nouveau' in pg.inner_text('#toast'), pg.inner_text('#toast'))
    pg.evaluate("window.__grant=true"); pg.locator('#drive-connect-btn').click(); pg.wait_for_timeout(800)
    req = pg.evaluate("window.__req")
    check("2e appui : connexion complète (écran d'autorisation)", len(req) == 2 and req[1].get('prompt') == 'consent', req)
    check("puis connecté", pg.inner_text('#drive-status').startswith('Sauvegarde automatique'), pg.inner_text('#drive-status'))
    check("aucune erreur JavaScript (échec puis succès)", not errs, errs)
    ctx.close()

    # première connexion (jamais connecté) : inchangée
    ctx, pg, errs = page(br, base, wanted=False)
    pg.locator('#drive-connect-btn').click(); pg.wait_for_timeout(800)
    req = pg.evaluate("window.__req")
    check("première connexion : écran d'autorisation comme avant", len(req) == 1 and req[0].get('prompt') == 'consent', req)
    ctx.close(); br.close()

print(f"\n {sum(res)} / {len(res)} contrôles OK")
sys.exit(0 if all(res) else 1)
