"""Sauvegarde Google Drive : le compte connecté s'affiche dans Réglages (adresse lue via l'API Drive, mockée)."""
import json, sys
from harness import *

res = []


def check(name, ok, extra=''):
    res.append(ok)
    print(('OK   ' if ok else 'ÉCHEC'), name, extra)


TOKEN = "localStorage.setItem('h49_drive_token', JSON.stringify({access_token:'tok123', expires_at: Date.now()+3600000}));"
STATUS = "document.getElementById('drive-status').textContent"


def scenario(br, base, about=None, connected=True):
    """Ouvre l'appli ; about = (statut, corps JSON) renvoyé par l'API Drive simulée, None = pas de réponse utile."""
    ctx, pg, errs = newpage(br, 390, 844, pref='light')
    if connected:
        pg.add_init_script(TOKEN)
    seen = []

    def handler(route):
        seen.append(route.request.headers.get('authorization'))
        st, body = about
        route.fulfill(status=st, content_type='application/json', body=json.dumps(body))
    if about:
        pg.route('**/www.googleapis.com/drive/v3/about*', handler)
    pg.goto(base + 'index.html'); pg.wait_for_timeout(2000)
    pg.evaluate("switchTab('reglages')"); pg.wait_for_timeout(300)
    return ctx, pg, seen


with Srv() as base, sync_playwright() as p:
    br = p.chromium.launch()

    ctx, pg, seen = scenario(br, base, (200, {'user': {'displayName': 'Jean', 'emailAddress': 'jean@example.com'}}))
    txt = pg.evaluate(STATUS)
    check('connecté : adresse affichée', 'jean@example.com' in txt and txt.startswith('Connecté'), repr(txt))
    check("l'API Drive est appelée avec le jeton", seen[:1] == ['Bearer tok123'], str(seen[:1]))
    check("adresse mémorisée sur l'appareil", json.loads(pg.evaluate("localStorage.getItem('h49_drive_account')"))['email'] == 'jean@example.com')
    check('bouton Déconnecter visible, Connecter masqué', pg.evaluate("document.getElementById('drive-disconnect-btn').style.display===''&&document.getElementById('drive-connect-btn').style.display==='none'"))
    pg.evaluate("disconnectGoogleDrive()"); pg.wait_for_timeout(200)
    check('déconnexion : « Non connecté » et adresse effacée', pg.evaluate(STATUS) == 'Non connecté' and pg.evaluate("localStorage.getItem('h49_drive_account')") is None, repr(pg.evaluate(STATUS)))
    ctx.close()

    evil = '<img src=x onerror=window.__x=1>@a.fr'
    ctx, pg, seen = scenario(br, base, (200, {'user': {'displayName': 'x', 'emailAddress': evil}}))
    check('adresse piégée : affichée en texte, aucun élément injecté', pg.evaluate("document.querySelectorAll('#drive-status *').length") == 0 and pg.evaluate("window.__x") is None)
    ctx.close()

    ctx, pg, seen = scenario(br, base, (403, {'error': {'message': 'forbidden'}}))
    check("API en erreur : statut « Connecté » sans adresse, rien de stocké", pg.evaluate(STATUS) == 'Connecté — sauvegarde automatique active' and pg.evaluate("localStorage.getItem('h49_drive_account')") is None, repr(pg.evaluate(STATUS)))
    ctx.close()

    ctx, pg, seen = scenario(br, base, (200, {'user': {}}))
    check('réponse sans adresse : ignorée', pg.evaluate("localStorage.getItem('h49_drive_account')") is None)
    ctx.close()

    ctx, pg, seen = scenario(br, base, (200, {'user': {'emailAddress': 'x@y.z'}}), connected=False)
    check('non connecté : « Non connecté » et aucun appel à l\'API', pg.evaluate(STATUS) == 'Non connecté' and not seen, repr(pg.evaluate(STATUS)))
    ctx.close()
    br.close()

print(f"\n {sum(res)} / {len(res)} contrôles OK")
sys.exit(0 if all(res) else 1)
