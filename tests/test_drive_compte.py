"""Sauvegarde Google Drive : le compte connecté s'affiche dans Réglages.
Adresse lue via l'API Drive « about », à défaut via le propriétaire du dossier de sauvegarde ;
si rien ne répond, la raison s'affiche. API simulée (aucun appel réseau réel)."""
import json, sys
from harness import *

res = []


def check(name, ok, extra=''):
    ok = bool(ok)
    res.append(ok)
    print(('OK   ' if ok else 'ÉCHEC'), name, extra)


TOKEN = "localStorage.setItem('h49_drive_token', JSON.stringify({access_token:'tok123', expires_at: Date.now()+3600000}));"
STATUS = "document.getElementById('drive-status').textContent"
OK_USER = (200, {'user': {'displayName': 'Jean', 'emailAddress': 'jean@example.com'}})
OWNER_OK = (200, {'owners': [{'displayName': 'Proprio', 'emailAddress': 'owner@example.com'}]})


def scenario(br, base, about, owner=(404, {}), connected=True, files=(200, {'files': [{'id': 'F1'}]})):
    """about = (statut, corps) ou liste de réponses successives ; owner = réponse pour le propriétaire du dossier."""
    ctx, pg, errs = newpage(br, 390, 844, pref='light')
    if connected:
        pg.add_init_script(TOKEN)
    seen = []
    answers = list(about) if isinstance(about, list) else [about]
    file_answers = list(files) if isinstance(files, list) else [files]

    def handler(route):
        u = route.request.url
        if '/drive/v3/about' in u:
            seen.append(route.request.headers.get('authorization'))
            st, body = answers.pop(0) if len(answers) > 1 else answers[0]
        elif 'owners' in u:
            st, body = owner
        else:  # recherche du dossier de sauvegarde / test d'accès
            st, body = file_answers.pop(0) if len(file_answers) > 1 else file_answers[0]
        route.fulfill(status=st, content_type='application/json', body=json.dumps(body))
    pg.route('**/www.googleapis.com/**', handler)
    pg.goto(base + 'index.html'); pg.wait_for_timeout(2000)
    pg.evaluate("switchTab('reglages')"); pg.wait_for_timeout(500)
    return ctx, pg, seen


stored = lambda pg: pg.evaluate("localStorage.getItem('h49_drive_account')")

with Srv() as base, sync_playwright() as p:
    br = p.chromium.launch()

    ctx, pg, seen = scenario(br, base, OK_USER)
    txt = pg.evaluate(STATUS)
    check('connecté : adresse affichée', 'jean@example.com' in txt and txt.startswith('Connecté'), repr(txt))
    check("l'API Drive est appelée avec le jeton", seen[:1] == ['Bearer tok123'], str(seen[:1]))
    check("adresse mémorisée sur l'appareil", json.loads(stored(pg))['email'] == 'jean@example.com')
    check('bouton Déconnecter visible, Connecter masqué', pg.evaluate("document.getElementById('drive-disconnect-btn').style.display===''&&document.getElementById('drive-connect-btn').style.display==='none'"))
    pg.evaluate("disconnectGoogleDrive()"); pg.wait_for_timeout(200)
    check('déconnexion : « Non connecté » et adresse effacée', pg.evaluate(STATUS) == 'Non connecté' and stored(pg) is None, repr(pg.evaluate(STATUS)))
    ctx.close()

    evil = '<img src=x onerror=window.__x=1>@a.fr'
    ctx, pg, seen = scenario(br, base, (200, {'user': {'displayName': 'x', 'emailAddress': evil}}))
    check('adresse piégée : affichée en texte, aucun élément injecté', pg.evaluate("document.querySelectorAll('#drive-status *').length") == 0 and pg.evaluate("window.__x") is None)
    ctx.close()

    # « about » refusé : seconde méthode (propriétaire du dossier)
    ctx, pg, seen = scenario(br, base, (403, {'error': {'message': 'forbidden'}}), owner=OWNER_OK)
    txt = pg.evaluate(STATUS)
    check("« about » en erreur : l'adresse est lue via le propriétaire du dossier", 'owner@example.com' in txt and 'indisponible' not in txt, repr(txt))
    check('adresse mémorisée (seconde méthode)', stored(pg) and json.loads(stored(pg))['email'] == 'owner@example.com')
    ctx.close()

    # rien ne répond : la raison est affichée, rien n'est mémorisé
    ctx, pg, seen = scenario(br, base, (403, {'error': {}}), owner=(404, {}))
    txt = pg.evaluate(STATUS)
    check("les deux méthodes en erreur : raison affichée (about 403 + dossier 404), rien de mémorisé",
          txt.startswith('Connecté — sauvegarde automatique active') and 'adresse du compte indisponible' in txt and 'about : 403' in txt and 'dossier : 404' in txt and stored(pg) is None, repr(txt))
    ctx.close()

    ctx, pg, seen = scenario(br, base, (200, {'user': {}}), owner=(200, {'owners': [{}]}))
    txt = pg.evaluate(STATUS)
    check('réponses sans adresse : ignorées, raison affichée', stored(pg) is None and 'about : sans adresse' in txt and 'dossier : sans adresse' in txt, repr(txt))
    ctx.close()

    # nouvel essai à l'ouverture de Réglages
    ctx, pg, seen = scenario(br, base, [(500, {}), (500, {}), OK_USER], owner=(500, {}))
    first = pg.evaluate(STATUS)
    pg.evaluate("switchTab('historique')"); pg.evaluate("switchTab('reglages')"); pg.wait_for_timeout(700)
    check("1er essai en échec, 2e essai à la réouverture de Réglages : adresse affichée", 'indisponible' in first and 'jean@example.com' in pg.evaluate(STATUS), repr(first) + ' -> ' + repr(pg.evaluate(STATUS)))
    ctx.close()

    # Google refuse TOUT l'accès à Drive (cas réel : « about : erreur 403 ; dossier : indisponible »)
    API_OFF = (403, {'error': {'code': 403, 'errors': [{'reason': 'accessNotConfigured'}], 'status': 'PERMISSION_DENIED'}})
    ctx, pg, seen = scenario(br, base, API_OFF, files=API_OFF)
    txt = pg.evaluate(STATUS)
    check("Drive refusé (403 accessNotConfigured) : la raison de Google est affichée", 'Google refuse l\'accès à Drive (403 accessNotConfigured)' in txt, repr(txt))
    check("Drive refusé : on ne prétend plus que la sauvegarde automatique est active", 'sauvegarde automatique active' not in txt and 'ne sont pas sauvegardées' in txt, repr(txt))
    check("Drive refusé : l'aide indique d'activer l'API Google Drive", "API Google Drive n'est pas activée" in txt, repr(txt))
    check("Drive refusé : adresse non mémorisée, bouton Déconnecter proposé", stored(pg) is None and pg.evaluate("document.getElementById('drive-disconnect-btn').style.display===''"))
    # le problème est réglé côté Google : le message disparaît à la réouverture de Réglages
    pg.unroute('**/www.googleapis.com/**')
    pg.route('**/www.googleapis.com/**', lambda r: r.fulfill(status=200, content_type='application/json', body=json.dumps({'user': {'emailAddress': 'jean@example.com'}, 'files': [{'id': 'F1'}]})))
    pg.evaluate("switchTab('historique')"); pg.evaluate("switchTab('reglages')"); pg.wait_for_timeout(1000)
    txt = pg.evaluate(STATUS)
    check("accès rétabli : message d'erreur remplacé par « Connecté : adresse »", 'jean@example.com' in txt and 'refuse' not in txt, repr(txt))
    ctx.close()

    ctx, pg, seen = scenario(br, base, (403, {}), files=(403, {'error': {'errors': [{'reason': 'insufficientPermissions'}]}}))
    txt = pg.evaluate(STATUS)
    check("autorisation Drive non accordée : l'aide dit de se reconnecter en acceptant l'accès", 'insufficientPermissions' in txt and 'reconnecte-toi en acceptant' in txt, repr(txt))
    ctx.close()

    ctx, pg, seen = scenario(br, base, (200, {'user': {'emailAddress': 'x@y.z'}}), connected=False)
    check("non connecté : « Non connecté » et aucun appel à l'API", pg.evaluate(STATUS) == 'Non connecté' and not seen, repr(pg.evaluate(STATUS)))
    ctx.close()
    br.close()

print(f"\n {sum(res)} / {len(res)} contrôles OK")
sys.exit(0 if all(res) else 1)
