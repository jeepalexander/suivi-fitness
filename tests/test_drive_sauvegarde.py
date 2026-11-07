"""Google Drive : une NOUVELLE sauvegarde complète (fitness-backup-AAAA-MM-JJ-HH-MM-SS.json) à chaque modification,
jamais envoyée en double, 5 versions gardées ; protection contre l'écrasement d'une sauvegarde plus complète ;
restauration depuis Drive (liste des dernières sauvegardes).
Google Identity et l'API Drive sont simulés (aucun appel réseau réel)."""
import json, re, sys
from harness import *
from drive_mock import FakeDrive

res = []


def check(name, ok, extra=''):
    ok = bool(ok)
    res.append(ok)
    print(('OK   ' if ok else 'ÉCHEC'), name, str(extra)[:230])


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
NAME_RE = re.compile(r'^fitness-backup-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}\.json$')


def restore_pick(pg, i=0, wait=2500):
    """« Restaurer depuis Drive » puis « Restaurer » sur la i-ème sauvegarde de la liste."""
    pg.evaluate("restoreFromDrive()"); pg.wait_for_timeout(1200)
    n = pg.evaluate("document.querySelectorAll('#drive-backups .drive-backup-row button').length")
    if n > i:
        pg.evaluate("i=>document.querySelectorAll('#drive-backups .drive-backup-row button')[i].click()", i)
        pg.wait_for_timeout(wait)
    return n


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


def save_form(pg):
    pg.evaluate("switchTab('seance')"); pg.wait_for_timeout(200)
    pg.evaluate("document.querySelectorAll('.exercise-item')[0].querySelector('.ex-toggle').click()")
    pg.evaluate("document.querySelectorAll('.set-row')[0].querySelector('.btn-check-set').click()")
    pg.evaluate("document.getElementById('workout-form').requestSubmit()")


def remote_with_extra():
    """Sauvegarde Drive plus complète : tout l'historique local + une séance qu'il n'a pas."""
    st = json.loads(json.dumps(DATA))
    st['history'].append(dict(DATA['history'][-1], id=999999, date='2026-11-02'))
    return st


with Srv() as base, sync_playwright() as p:
    br = p.chromium.launch()

    # 1) dossier absent, accès valide : dossier créé, UN fichier de sauvegarde complète (tout l'historique)
    d = FakeDrive()
    ctx, pg, dlg = run(br, base, d, seeds=[VALID])
    pg.wait_for_timeout(3000)
    c = d.content() or {}
    uploads = [u for (m, u) in d.calls if m == 'POST' and '/upload/' in u]
    check("dossier absent : créé une seule fois", d.folders_created == 1, d.folders_created)
    check("UN seul fichier créé, nommé fitness-backup-AAAA-MM-JJ-HH-MM-SS.json", d.posts == 1 and len(uploads) == 1 and NAME_RE.match(d.post_names[0]), f'{len(uploads)} création(s) {d.post_names}')
    check(f"le fichier contient tout l'état : {N} séances, poids, dernières charges, prochaine séance",
          len(c.get('history', [])) == N and len(c.get('weights', [])) == len(DATA['weights']) and c.get('lastWeights') == DATA['lastWeights'] and c.get('nextType') == local_state(pg)['nextType'], f"{len(c.get('history', []))} séances")
    check("identifiant du fichier et empreinte retenus, date de dernière sauvegarde affichée", ls(pg, 'h49_drive_backup_id') == 'BK1' and ls(pg, 'h49_drive_last_hash') and 'Dernière sauvegarde' in pg.evaluate(STATUS), pg.evaluate(STATUS))
    # 2) rien n'a changé : rien n'est renvoyé
    n0 = len(d.calls)
    r = pg.evaluate("syncDriveBackup()")
    check("données inchangées : aucun envoi, aucune requête", r.get('unchanged') and len(d.calls) == n0, str(r))
    # 3) une modification (poids corporel) : mise à jour du MÊME fichier
    pg.evaluate("state.weights.push({date:'2026-11-04', weight:81}); saveState()"); pg.wait_for_timeout(2800)
    check("modification des données : NOUVEAU fichier créé (l'ancien n'est pas écrasé)", d.patches == 0 and d.posts == 2 and len(d.live()) == 2 and len((d.content() or {}).get('weights', [])) == len(DATA['weights']) + 1, f'patch={d.patches} post={d.posts}')
    # 4) plusieurs modifications rapprochées : un seul envoi
    p0 = d.posts
    for i in range(3):
        pg.evaluate("i=>{state.weights.push({date:'2026-11-05', weight:82+i}); saveState()}", i)
    pg.wait_for_timeout(3000)
    check("3 modifications rapprochées : un seul envoi", d.posts == p0 + 1, f'{d.posts - p0} envoi(s)')
    # 5) vrai formulaire : séance enregistrée
    p0, h0 = d.posts, len(local_state(pg)['history'])
    save_form(pg); pg.wait_for_timeout(2500)
    saved = [m for m in pg.evaluate("window.__toastLog||[]") if 'Séance enregistrée' in m]
    check("séance enregistrée (vrai formulaire) : sauvegarde mise à jour avec la nouvelle séance, sans mention de Drive", d.posts == p0 + 1 and len((d.content() or {}).get('history', [])) == h0 + 1 and saved and 'Drive' not in saved[-1], f'post={d.posts}')
    # 6) séance modifiée : une nouvelle version
    p0 = d.posts
    pg.evaluate("state.history[3].tonnage += 7; saveState(); backupToDrive()"); pg.wait_for_timeout(2500)
    check("séance modifiée : une seule nouvelle version, toujours un seul dossier", d.posts == p0 + 1 and d.patches == 0 and d.folders_created == 1)
    # 7) deux enregistrements simultanés : pas de doublon
    p0 = d.posts
    pg.evaluate("state.history[4].tonnage += 1; saveState(); Promise.all([backupToDrive(), backupToDrive()])"); pg.wait_for_timeout(2500)
    check("deux sauvegardes simultanées : une seule nouvelle version (pas de doublon)", d.posts == p0 + 1, f'{d.posts - p0} création(s)')
    live = d.live()
    check("6 sauvegardes envoyées : les 5 plus récentes gardées, la plus ancienne mise à la corbeille",
          d.posts == 6 and len(live) == 5 and d.trashes == 1 and all(f['id'] != 'BK1' for f in live) and (d.content() or {}).get('history', [{}])[4].get('tonnage') == local_state(pg)['history'][4]['tonnage'], f'posts={d.posts} présents={len(live)} corbeille={d.trashes}')
    # 8) déconnexion : tout est oublié, accès révoqué
    pg.evaluate("disconnectGoogleDrive()"); pg.wait_for_timeout(200)
    check("« Déconnecter » : jeton, dossier, fichier, empreinte, conflit effacés ; accès révoqué",
          all(ls(pg, k) is None for k in ('h49_drive_token', 'h49_drive_folder_id', 'h49_drive_backup_id', 'h49_drive_last_hash', 'h49_drive_last_backup', 'h49_drive_conflict', 'h49_drive_wanted')) and pg.evaluate("window.__revoked") == 'tok1')
    ctx.close()

    # 9) accès expiré dans le navigateur : renouvellement silencieux (fenêtre) puis envoi
    d = FakeDrive(folder=True)
    ctx, pg, dlg = run(br, base, d, seeds=[EXPIRED, FOLDER])
    pg.wait_for_timeout(1200)
    save_form(pg); pg.wait_for_timeout(3000)
    r = pg.evaluate("window.__reqs")
    check("navigateur + accès expiré : renouvellement par la fenêtre (prompt vide + adresse), puis envoi", len(r) == 1 and r[0].get('prompt') == '' and r[0].get('hint') == 'jean@example.com' and d.posts == 1, f'{r} post={d.posts}')
    ctx.close()

    # 10) accès expiré : les modifications restent « en attente » et le disent
    d = FakeDrive(folder=True)
    ctx, pg, dlg = run(br, base, d, seeds=[EXPIRED, FOLDER])
    pg.wait_for_timeout(1200)
    pg.evaluate("state.weights.push({date:'2026-11-06', weight:83}); saveState()"); pg.wait_for_timeout(2000)
    check("accès expiré : aucune requête, Réglages indique « modifications en attente d'envoi »", d.uploads() == 0 and "odifications en attente d'envoi" in pg.evaluate(STATUS), pg.evaluate(STATUS))
    ctx.close()

    # 11) jamais connecté : aucune requête Drive, aucun message
    d = FakeDrive()
    ctx, pg, dlg = run(br, base, d)
    pg.wait_for_timeout(1500)
    save_form(pg); pg.wait_for_timeout(1500)
    saved = [m for m in pg.evaluate("window.__toastLog||[]") if 'Séance enregistrée' in m]
    check("jamais connecté : aucune requête Drive, aucune mention de Drive", not d.calls and saved and 'Drive' not in saved[-1], d.calls[:2])
    ctx.close()

    # 12) première connexion par le bouton : dossier + sauvegarde complète créés
    d = FakeDrive()
    ctx, pg, dlg = run(br, base, d)
    pg.wait_for_timeout(1200)
    pg.evaluate("connectGoogleDrive()"); pg.wait_for_timeout(3500)
    check("première connexion (bouton) : dossier créé, sauvegarde complète créée", d.folders_created == 1 and d.posts == 1 and len((d.content() or {}).get('history', [])) == N, f'dossier={d.folders_created} post={d.posts}')
    ctx.close()

    # ---------- protection : une sauvegarde plus complète existe déjà sur le Drive ----------
    d = FakeDrive(folder=True, backup=remote_with_extra())
    ctx, pg, dlg = run(br, base, d, seeds=[VALID, FOLDER])
    pg.wait_for_timeout(3000)
    txt = pg.evaluate(STATUS)
    vis = lambda i: pg.evaluate("i=>document.getElementById(i).style.display!=='none'", i)
    check("sauvegarde Drive plus complète : rien n'est écrasé (aucun envoi)", d.uploads() == 0, f'post={d.posts} patch={d.patches}')
    check("le conflit est expliqué (nombre de séances) avec les deux choix proposés",
          'plus complète existe déjà' in txt and f'{N + 1} séances' in txt and vis('drive-restore-btn') and vis('drive-replace-btn'), txt)
    check("aucun nouvel envoi tant que le conflit n'est pas résolu (modification locale)", (pg.evaluate("state.weights.push({date:'2026-11-07',weight:84}); saveState()") or True) and (pg.wait_for_timeout(2500) or d.uploads() == 0))
    # remplacer par cet appareil
    pg.evaluate("replaceDriveBackupWithThisDevice()"); pg.wait_for_timeout(2500)
    ids = {h['id'] for h in (d.content() or {}).get('history', [])}
    check("« Remplacer par cet appareil » (confirmé) : nouvelle version envoyée, l'ancienne reste restaurable, conflit levé", d.patches == 0 and d.posts == 1 and len(d.live()) == 2 and 999999 not in ids and ls(pg, 'h49_drive_conflict') is None, f'patch={d.patches} post={d.posts}')
    ctx.close()

    # restaurer depuis Drive
    d = FakeDrive(folder=True, backup=remote_with_extra())
    ctx, pg, dlg = run(br, base, d, seeds=[VALID, FOLDER])
    pg.wait_for_timeout(2500)
    rows = restore_pick(pg, 0)
    conf = [m for (t, m) in dlg if t == 'confirm' and 'Restaurer la sauvegarde Drive' in m]
    check("« Restaurer depuis Drive » : liste des sauvegardes affichée avant toute restauration", rows == 1, rows)
    check("« Restaurer depuis Drive » : confirmation avec le nombre de séances et l'avertissement de remplacement", conf and f'({N + 1} séances)' in conf[-1] and f'cet appareil ({N} séances)' in conf[-1], conf[-1:] )
    st = local_state(pg)
    check("restauration : les données de l'appareil deviennent celles du Drive (séance en plus incluse), conflit levé", len(st['history']) == N + 1 and any(h['id'] == 999999 for h in st['history']) and ls(pg, 'h49_drive_conflict') is None and ls(pg, 'h49_drive_backup_id') in {f['id'] for f in d.live()})
    check("restauration : message « Sauvegarde importée avec succès »", any('importée avec succès' in m for (t, m) in dlg))
    check("restauration : la sauvegarde restaurée reste sur le Drive, la plus récente version = données restaurées", any(f['id'] == 'BK1' for f in d.live()) and len((d.content() or {}).get('history', [])) == N + 1)
    check("restauration : la liste des sauvegardes se referme", pg.evaluate("document.getElementById('drive-backups').hidden"))
    ctx.close()

    # restauration refusée
    d = FakeDrive(folder=True, backup=remote_with_extra())
    ctx, pg, dlg = run(br, base, d, seeds=[VALID, FOLDER], confirm=False)
    pg.wait_for_timeout(2500)
    restore_pick(pg, 0, 1500)
    check("restauration refusée (annuler) : rien ne change", len(local_state(pg)['history']) == N and d.uploads() == 0)
    ctx.close()

    # aucune sauvegarde sur le Drive
    d = FakeDrive(folder=True)
    ctx, pg, dlg = run(br, base, d, seeds=[VALID, FOLDER, BKID])
    pg.wait_for_timeout(2500)
    d.backup = None
    restore_pick(pg, 0, 1500)
    check("restauration sans fichier sur le Drive : message clair, rien ne change", any('Aucune sauvegarde complète trouvée' in m for (t, m) in dlg) and len(local_state(pg)['history']) == N)
    ctx.close()

    # fichier illisible
    d = FakeDrive(folder=True, backup='ceci n\'est pas du JSON')
    ctx, pg, dlg = run(br, base, d, seeds=[VALID, FOLDER])
    pg.wait_for_timeout(2500)
    check("fichier Drive illisible : jamais écrasé (conflit)", d.uploads() == 0 and ls(pg, 'h49_drive_conflict'))
    restore_pick(pg, 0, 1500)
    check("fichier Drive illisible : restauration refusée avec un message, données intactes", any('illisible ou invalide' in m for (t, m) in dlg) and len(local_state(pg)['history']) == N)
    ctx.close()

    # restauration assainie (security.js)
    evil = remote_with_extra(); evil['history'][-1]['type'] = '<img src=x onerror=window.__x=1>A'
    d = FakeDrive(folder=True, backup=evil)
    ctx, pg, dlg = run(br, base, d, seeds=[VALID, FOLDER])
    pg.wait_for_timeout(2500)
    restore_pick(pg, 0)
    check("restauration depuis Drive : contenu assaini (aucun « < » conservé), comme l'import manuel", len(local_state(pg)['history']) == N + 1 and '<' not in ls(pg, 'h49_state'))
    ctx.close()

    # sauvegarde du Drive contenue dans l'appareil (ancienne version) : mise à jour sans conflit
    old = json.loads(json.dumps(DATA)); old['history'] = old['history'][:-3]
    d = FakeDrive(folder=True, backup=old)
    ctx, pg, dlg = run(br, base, d, seeds=[VALID, FOLDER])
    pg.wait_for_timeout(3000)
    check("sauvegarde Drive plus ancienne (séances toutes présentes ici) : nouvelle version sans conflit", d.patches == 0 and d.posts == 1 and len((d.content() or {}).get('history', [])) == N and ls(pg, 'h49_drive_conflict') is None)
    ctx.close()

    # ---------- erreurs ----------
    d = FakeDrive(folder=True, fail={'folder': 403})
    ctx, pg, dlg = run(br, base, d, seeds=[VALID])
    pg.wait_for_timeout(2500)
    txt = pg.evaluate(STATUS)
    check("Google refuse l'accès (403) : raison affichée, aucune boucle de requêtes", 'Google refuse' in txt and len(d.calls) < 12, f'{len(d.calls)} requêtes')
    ctx.close()

    d = FakeDrive(folder=True, backup=DATA, fail={'post': 401})
    ctx, pg, dlg = run(br, base, d, seeds=[VALID, FOLDER, BKID])
    pg.wait_for_timeout(2500)
    check("accès refusé par Google (401) : jeton oublié, souhait et fichier retenus", ls(pg, 'h49_drive_token') is None and ls(pg, 'h49_drive_wanted') == '1' and ls(pg, 'h49_drive_backup_id') == 'BK1')
    ctx.close()

    d = FakeDrive(folder=True)
    ctx, pg, dlg = run(br, base, d, seeds=[VALID, FOLDER, BKID])
    pg.wait_for_timeout(2500)
    check("dernière sauvegarde connue supprimée du Drive : nouvelle sauvegarde créée", d.posts == 1 and d.patches == 0 and len((d.content() or {}).get('history', [])) == N)
    ctx.close()

    # ---------- nettoyage des anciennes versions ----------
    d = FakeDrive()
    ctx, pg, dlg = run(br, base, d, seeds=["['h49_drive_queue','h49_drive_uploaded','h49_drive_files','h49_drive_history_todo'].forEach(k=>localStorage.setItem(k,'[]'));"])
    pg.wait_for_timeout(1500)
    check("anciens repères (file d'attente, fichiers par séance) supprimés au démarrage", all(ls(pg, k) is None for k in ('h49_drive_queue', 'h49_drive_uploaded', 'h49_drive_files', 'h49_drive_history_todo')))
    ctx.close()
    br.close()

print(f"\n {sum(res)} / {len(res)} contrôles OK")
sys.exit(0 if all(res) else 1)
