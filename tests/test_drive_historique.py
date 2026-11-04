"""Google Drive : à la première connexion, si le dossier n'existe pas, il est créé et tout l'historique y est envoyé.
Google Identity et l'API Drive sont simulés (aucun appel réseau réel)."""
import json, sys
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
    setTimeout(()=>cfg.callback({access_token:'tokNEW', expires_in:3600}),30); }}; },
  revoke(t,cb){ if(cb)cb(); }}}};
"""
TOKEN = "localStorage.setItem('h49_drive_token', JSON.stringify({access_token:'tok1', expires_at: Date.now()+3600000}));localStorage.setItem('h49_drive_wanted','1');"
STATUS = "switchTab('reglages'), document.getElementById('drive-status').textContent"


def run(br, base, folder_exists=False, connected=True, upload_plan=None, history=None, seed_extra=''):
    """upload_plan : fonction n -> statut HTTP pour le n-ième envoi (1, 2...) ; par défaut 200."""
    ctx, pg, errs = newpage(br, 390, 844, pref='light')
    pg.add_init_script(MOCK_GOOGLE)
    if connected:
        pg.add_init_script(TOKEN)
    if history is not None:
        data = dict(DATA); data['history'] = history
        pg.add_init_script("localStorage.setItem('h49_state', %s);" % json.dumps(json.dumps(data)))
    if seed_extra:
        pg.add_init_script(seed_extra)
    log = {'uploads': [], 'created': 0, 'searches': 0, 'plan': upload_plan or (lambda n: 200)}

    def api(route):
        r = route.request; u = r.url
        if '/upload/drive/v3/files' in u:
            log['uploads'].append(r.post_data_buffer.decode('utf-8', 'ignore') if r.post_data_buffer else '')
            st = log['plan'](len(log['uploads']))
            body = '{"id":"u","name":"n"}' if st == 200 else '{"error":{"errors":[{"reason":"x"}]}}'
            return route.fulfill(status=st, content_type='application/json', body=body)
        if '/drive/v3/about' in u:
            return route.fulfill(status=200, content_type='application/json', body='{"user":{"emailAddress":"jean@example.com"}}')
        if r.method == 'POST' and u.rstrip('/').endswith('/drive/v3/files'):
            log['created'] += 1
            return route.fulfill(status=200, content_type='application/json', body='{"id":"NEWF"}')
        if 'q=' in u:
            log['searches'] += 1
            files = [{'id': 'EXIST'}] if folder_exists else []
            return route.fulfill(status=200, content_type='application/json', body=json.dumps({'files': files}))
        return route.fulfill(status=200, content_type='application/json', body='{"files":[]}')
    pg.route('**/www.googleapis.com/**', api)
    pg.goto(base + 'index.html')
    return ctx, pg, log


names = lambda log: [json.loads(l.split('\r\n\r\n')[1].split('\r\n--')[0])['name'] if '\r\n\r\n' in l else '?' for l in log['uploads']]
ls = lambda pg, k: pg.evaluate("k=>localStorage.getItem(k)", k)
uploaded = lambda pg: json.loads(ls(pg, 'h49_drive_uploaded') or '[]')

with Srv() as base, sync_playwright() as p:
    br = p.chromium.launch()

    # 1) déjà connecté, dossier absent : il est créé et tout l'historique part
    ctx, pg, log = run(br, base)
    pg.wait_for_timeout(3500)
    check('dossier absent : créé une seule fois', log['created'] == 1, f"{log['created']} création(s)")
    check(f'tout l\'historique envoyé ({N} séances = {N} fichiers)', len(log['uploads']) == N, f"{len(log['uploads'])} envois")
    check('envoi terminé : marqueur « à envoyer » retiré, toutes les séances retenues', ls(pg, 'h49_drive_history_todo') is None and len(uploaded(pg)) == N)
    txt = pg.evaluate(STATUS)
    check('Réglages : « historique envoyé (N séances) »', f'historique envoyé ({N} séances)' in txt, txt)
    check('noms de fichier seance_AAAA-MM-JJ.json', all(n.startswith('seance_2026-') and n.endswith('.json') for n in names(log)), str(names(log)[:2]))
    check('noms tous différents', len(set(names(log))) == N)
    ctx.close()

    # 2) dossier déjà présent sur le Drive : rien n'est envoyé
    ctx, pg, log = run(br, base, folder_exists=True)
    pg.wait_for_timeout(2500)
    check('dossier déjà présent : aucun dossier créé, aucun envoi', log['created'] == 0 and not log['uploads'] and ls(pg, 'h49_drive_history_todo') is None, f"créé={log['created']} envois={len(log['uploads'])}")
    ctx.close()

    # 3) jamais connecté : rien ne part
    ctx, pg, log = run(br, base, connected=False)
    pg.wait_for_timeout(2000)
    check('non connecté : aucune requête Drive', not log['uploads'] and not log['created'] and not log['searches'])
    ctx.close()

    # 4) première connexion par le bouton : même résultat
    ctx, pg, log = run(br, base, connected=False)
    pg.wait_for_timeout(1500)
    pg.evaluate("connectGoogleDrive()"); pg.wait_for_timeout(4000)
    check('première connexion (bouton) : dossier créé + historique envoyé', log['created'] == 1 and len(log['uploads']) == N, f"créé={log['created']} envois={len(log['uploads'])}")
    ctx.close()

    # 5) plusieurs séances le même jour : noms distincts
    hist = [dict(DATA['history'][0], id=111, date='2026-11-01'), dict(DATA['history'][1], id=112, date='2026-11-01'), dict(DATA['history'][2], id=113, date='2026-11-02')]
    ctx, pg, log = run(br, base, history=hist)
    pg.wait_for_timeout(3000)
    nm = names(log)
    check('même jour : seance_2026-11-01_1.json / _2.json, jour seul sans suffixe', sorted(nm) == ['seance_2026-11-01_1.json', 'seance_2026-11-01_2.json', 'seance_2026-11-02.json'], str(nm))
    ctx.close()

    # 6) interruption (jeton refusé au 3e envoi) puis reprise sans doublon
    ctx, pg, log = run(br, base, upload_plan=lambda n: 401 if n == 3 else 200)
    pg.wait_for_timeout(3500)
    check('401 au 3e envoi : arrêt, 2 séances retenues, marqueur « à envoyer » conservé', len(uploaded(pg)) == 2 and ls(pg, 'h49_drive_history_todo') == '1' and ls(pg, 'h49_drive_token') is None, f'retenues={len(uploaded(pg))}')
    txt = pg.evaluate(STATUS)
    check('Réglages annonce « historique à envoyer »', 'historique à envoyer' in txt, txt)
    log['plan'] = lambda n: 200
    pg.evaluate("localStorage.setItem('h49_drive_token', JSON.stringify({access_token:'tok2', expires_at: Date.now()+3600000}))")
    pg.evaluate("switchTab('historique')"); pg.evaluate("switchTab('reglages')"); pg.wait_for_timeout(3500)
    check(f'reprise : les {N - 2} séances restantes envoyées, sans doublon', len(log['uploads']) == N + 1 and len(set(names(log)[:2] + names(log)[3:])) == N, f"{len(log['uploads'])} requêtes (dont 1 refusée) pour {N} fichiers")
    check('reprise terminée : marqueur retiré', ls(pg, 'h49_drive_history_todo') is None and len(uploaded(pg)) == N)
    ctx.close()

    # 7) envoi refusé (403) : arrêt net, raison affichée, rien d'oublié
    ctx, pg, log = run(br, base, upload_plan=lambda n: 403)
    pg.wait_for_timeout(3000)
    txt = pg.evaluate(STATUS)
    check('403 : un seul essai, marqueur conservé, raison affichée', len(log['uploads']) == 1 and ls(pg, 'h49_drive_history_todo') == '1' and 'Google refuse' in txt, txt)
    ctx.close()

    # 8) première séance enregistrée alors que le dossier n'existe pas : créé, puis pas de doublon pour cette séance
    ctx, pg, log = run(br, base, connected=False, seed_extra="localStorage.setItem('h49_drive_token', JSON.stringify({access_token:'tok1', expires_at: Date.now()+3600000}));")
    pg.wait_for_timeout(300)
    # la séance « du jour » est déjà dans l'historique au moment où elle est envoyée
    pg.evaluate("backupSessionToDrive(state.history[state.history.length-1])"); pg.wait_for_timeout(4500)
    check(f'enregistrement avec dossier absent : {N} fichiers au total (aucun doublon)', len(log['uploads']) == N and log['created'] == 1, f"{len(log['uploads'])} envois, {log['created']} création(s)")
    ctx.close()

    # 9) id de dossier déjà mémorisé sur l'appareil : on s'y fie
    ctx, pg, log = run(br, base, seed_extra="localStorage.setItem('h49_drive_folder_id','OLD');")
    pg.wait_for_timeout(2500)
    check('dossier connu localement (id mémorisé) : rien n\'est recréé ni renvoyé', log['created'] == 0 and not log['uploads'])
    ctx.close()
    br.close()

print(f"\n {sum(res)} / {len(res)} contrôles OK")
sys.exit(0 if all(res) else 1)
