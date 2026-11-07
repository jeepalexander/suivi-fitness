"""Google Drive, versions (1.6.33) : chaque sauvegarde crée fitness-backup-AAAA-MM-JJ-HH-MM-SS.json, seules les 5 plus
récentes sont gardées (les autres vont à la corbeille), un échec de suppression ne fait pas échouer la sauvegarde,
et « Restaurer depuis Drive » liste les 5 dernières sauvegardes pour restaurer n'importe laquelle."""
import json, re, sys
from datetime import datetime
from harness import *
from drive_mock import FakeDrive
from test_drive_sauvegarde_helpers import MOCK_GOOGLE, VALID, FOLDER, BKID, N, DATA, local_state

res = []


def check(name, ok, extra=''):
    ok = bool(ok); res.append(ok)
    print(('OK   ' if ok else 'ÉCHEC'), name, str(extra)[:230])


NAME_RE = re.compile(r'^fitness-backup-(\d{4})-(\d{2})-(\d{2})-(\d{2})-(\d{2})-(\d{2})\.json$')
ls = lambda pg, k: pg.evaluate("k=>localStorage.getItem(k)", k)
STATUS = "switchTab('reglages'), document.getElementById('drive-status').textContent"


def state_with(n):
    """État complet avec les n premières séances du jeu d'essai (même format que l'application)."""
    st = json.loads(json.dumps(DATA)); st['history'] = st['history'][:n]
    return st


def versions(k, start_day=1):
    """k anciennes versions (plus récente = la dernière), contenant de plus en plus de séances (toutes présentes ici)."""
    return [('fitness-backup-2026-10-%02d-08-00-00.json' % (start_day + i), '2026-10-%02dT08:00:00.000Z' % (start_day + i), state_with(N - k + i)) for i in range(k)]


def run(br, base, drive, seeds=(), confirm=True):
    ctx, pg, errs = newpage(br, 390, 844, pref='light')
    logs = []
    pg.on('console', lambda m: logs.append((m.type, m.text)))
    pg.add_init_script(MOCK_GOOGLE)
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
    return ctx, pg, dialogs, logs, errs


with Srv() as base, sync_playwright() as p:
    br = p.chromium.launch()

    # 1) nom du fichier : fitness-backup-AAAA-MM-JJ-HH-MM-SS.json à l'heure de l'appareil, contenu au format habituel
    d = FakeDrive(folder=True)
    ctx, pg, dlg, logs, errs = run(br, base, d, seeds=[VALID, FOLDER])
    pg.wait_for_timeout(3000)
    name = d.post_names[0] if d.post_names else ''
    m = NAME_RE.match(name)
    now = datetime.fromisoformat(pg.evaluate("(()=>{const d=new Date();const p=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+'T'+p(d.getHours())+':'+p(d.getMinutes())+':'+p(d.getSeconds())})()"))
    stamp = datetime(*map(int, m.groups())) if m else None
    check("nom fitness-backup-AAAA-MM-JJ-HH-MM-SS.json, heure locale de l'appareil", m and abs((now - stamp).total_seconds()) < 30, name)
    check("format JSON inchangé : exactement l'état de l'application (indentation 2)", d.last_body == json.dumps(json.loads(ls(pg, 'h49_state')), indent=2, ensure_ascii=False), (d.last_body or '')[:60])
    ctx.close()

    # 2) 6 anciennes versions + fichiers étrangers : après l'envoi, 5 sauvegardes gardées, les autres fichiers intacts
    extra = [('notes.txt', '2026-09-01T08:00:00.000Z', 'x'), ('fitness-backup-notes.json', '2026-09-02T08:00:00.000Z', 'x')]
    d = FakeDrive(folder=True, versions=versions(6) + extra)
    ctx, pg, dlg, logs, errs = run(br, base, d, seeds=[VALID, FOLDER])
    pg.wait_for_timeout(3500)
    live = [f['name'] for f in d.live()]
    backups = [n for n in live if NAME_RE.match(n)]
    check("après l'envoi : 5 sauvegardes gardées (la nouvelle + les 4 plus récentes)", d.posts == 1 and len(backups) == 5 and d.post_names[0] in backups and 'fitness-backup-2026-10-06-08-00-00.json' in backups and 'fitness-backup-2026-10-03-08-00-00.json' in backups, backups)
    check("les 2 plus anciennes mises à la corbeille (pas supprimées définitivement)", d.trashes == 2 and 'fitness-backup-2026-10-01-08-00-00.json' not in live and 'fitness-backup-2026-10-02-08-00-00.json' not in live and len(d.files) == 9, d.trashes)
    check("fichiers étrangers au format de sauvegarde jamais touchés", 'notes.txt' in live and 'fitness-backup-notes.json' in live)
    # l'ancien fichier unique compte comme une version
    d = FakeDrive(folder=True, backup=state_with(N - 6), versions=versions(5, 10))
    d.files[0]['modifiedTime'] = '2026-09-01T08:00:00.000Z'  # l'ancien fichier unique est le plus ancien
    ctx.close()
    ctx, pg, dlg, logs, errs = run(br, base, d, seeds=[VALID, FOLDER])
    pg.wait_for_timeout(3500)
    check("ancien sauvegarde_complete.json (le plus ancien) mis à la corbeille au-delà de 5 versions", d.posts == 1 and all(f['id'] != 'BK1' for f in d.live()) and len(d.live()) == 5, [f['name'] for f in d.live()])
    ctx.close()

    # 3) la suppression d'une vieille sauvegarde échoue : la sauvegarde principale reste réussie, erreur seulement journalisée
    d = FakeDrive(folder=True, versions=versions(5), fail={'trash': 500})
    ctx, pg, dlg, logs, errs = run(br, base, d, seeds=[VALID, FOLDER])
    pg.wait_for_timeout(3500)
    st = pg.evaluate(STATUS)
    warn = [t for (ty, t) in logs if ty == 'warning' and 'ancienne sauvegarde' in t]
    check("suppression refusée (500) : nouvelle sauvegarde envoyée et enregistrée comme réussie", d.posts == 1 and d.trash_attempts == 1 and ls(pg, 'h49_drive_last_hash') and ls(pg, 'h49_drive_last_backup'), (d.posts, d.trash_attempts))
    check("suppression refusée : aucune erreur affichée dans Réglages, juste « dernière sauvegarde »", 'Dernière sauvegarde' in st and 'Google refuse' not in st and not ls(pg, 'h49_drive_error'), st)
    check("suppression refusée : l'erreur est journalisée dans la console", warn, warn)
    r = pg.evaluate("state.weights.push({date:'2026-11-07', weight:79}); syncDriveBackup()")
    check("suppression refusée : les sauvegardes suivantes continuent de partir", r.get('ok') and d.posts == 2, r)
    ctx.close()

    d = FakeDrive(folder=True, versions=versions(5), fail={'list_after_post': 500})
    ctx, pg, dlg, logs, errs = run(br, base, d, seeds=[VALID, FOLDER])
    pg.wait_for_timeout(3500)
    st = pg.evaluate(STATUS)
    check("liste des anciennes sauvegardes impossible après l'envoi : sauvegarde réussie, rien d'affiché", d.posts == 1 and ls(pg, 'h49_drive_last_hash') and 'Google refuse' not in st and not ls(pg, 'h49_drive_error') and any('anciennes sauvegardes' in t for (ty, t) in logs if ty == 'warning'), st)
    ctx.close()

    # 4) écran de restauration : les 5 dernières sauvegardes, n'importe laquelle restaurable
    vs = [('fitness-backup-2026-10-%02d-08-00-00.json' % (i + 1), '2026-10-%02dT08:%02d:%02d.000Z' % (i + 1, i, i * 7), state_with(10 + i)) for i in range(7)]
    d = FakeDrive(folder=True, versions=vs, fail={'post': 503})  # aucune nouvelle version pendant ce test : la liste reste celle du Drive
    ctx, pg, dlg, logs, errs = run(br, base, d, seeds=[VALID, FOLDER, BKID])
    pg.wait_for_timeout(1500)
    pg.evaluate("switchTab('reglages')"); pg.wait_for_timeout(300)
    hidden0 = pg.evaluate("document.getElementById('drive-backups').hidden")
    pg.click('#drive-restore-btn'); pg.wait_for_timeout(1500)
    rows = pg.evaluate("[...document.querySelectorAll('#drive-backups .drive-backup-row')].map(r=>({t:r.querySelector('.ex-name').textContent,s:r.querySelector('.ex-sub').textContent,b:r.querySelector('button').textContent}))")
    check("liste fermée par défaut ; « Restaurer depuis Drive » affiche les 5 dernières sauvegardes (sur 7)", hidden0 and len(rows) == 5 and not pg.evaluate("document.getElementById('drive-backups').hidden"), len(rows))
    exp = [datetime.fromisoformat(vs[i][1].replace('Z', '+00:00')) for i in (6, 5, 4, 3, 2)]
    shown = pg.evaluate("isos=>isos.map(formatDriveBackupDate)", [vs[i][1] for i in (6, 5, 4, 3, 2)])
    check("triées de la plus récente à la plus ancienne, avec date et heure (secondes comprises)", [r['t'] for r in rows] == shown and all(re.match(r'^\d{2}/\d{2}/2026 à \d{2}:\d{2}:\d{2}$', r['t']) for r in rows), [r['t'] for r in rows])
    check("chaque ligne a son bouton « Restaurer », la première est marquée « La plus récente »", all(r['b'] == 'Restaurer' for r in rows) and rows[0]['s'] == 'La plus récente' and rows[1]['s'] == 'Version précédente', rows[:2])
    dlg.clear()
    pg.evaluate("document.querySelectorAll('#drive-backups .drive-backup-row button')[2].click()"); pg.wait_for_timeout(2500)
    conf = [mm for (t, mm) in dlg if t == 'confirm']
    check("restaurer la 3e sauvegarde : confirmation avec SA date et SON nombre de séances", conf and rows[2]['t'] in conf[-1] and '(14 séances)' in conf[-1], conf[-1:])
    check("restaurer la 3e sauvegarde : l'appareil contient exactement cette version", len(local_state(pg)['history']) == 14 and ls(pg, 'h49_drive_backup_id') == 'V5', len(local_state(pg)['history']))
    check("après restauration : liste refermée", pg.evaluate("document.getElementById('drive-backups').hidden"))
    # restaurer la plus ancienne de la liste (5e)
    restore = lambda i: (pg.evaluate("restoreFromDrive()"), pg.wait_for_timeout(1200), pg.evaluate("i=>document.querySelectorAll('#drive-backups .drive-backup-row button')[i].click()", i), pg.wait_for_timeout(2500))
    restore(4)
    check("restaurer la 5e (la plus ancienne affichée) : 12 séances", len(local_state(pg)['history']) == 12, len(local_state(pg)['history']))
    # sauvegarde disparue entre l'affichage et le choix
    pg.evaluate("restoreFromDrive()"); pg.wait_for_timeout(1200)
    for f in d.files:
        if f['id'] == 'V7': f['trashed'] = True
    dlg.clear(); n0 = len(local_state(pg)['history'])
    pg.evaluate("document.querySelectorAll('#drive-backups .drive-backup-row button')[0].click()"); pg.wait_for_timeout(2500)
    check("sauvegarde supprimée entre-temps : message, données intactes, liste rafraîchie", any("n'existe plus" in mm for (t, mm) in dlg) and len(local_state(pg)['history']) == n0 and pg.evaluate("document.querySelectorAll('#drive-backups .drive-backup-row').length") == 5, dlg[-1:])
    check("aucune erreur JavaScript", not [e for e in errs if 'Failed to load resource' not in e], errs[:3])
    # déconnexion : la liste disparaît
    pg.evaluate("disconnectGoogleDrive()"); pg.wait_for_timeout(300)
    check("« Déconnecter » : la liste des sauvegardes est masquée", pg.evaluate("document.getElementById('drive-backups').hidden"))
    ctx.close()

    # 5) appareil vidé : aucune version vide n'est envoyée par-dessus la plus récente (protection inchangée)
    d = FakeDrive(folder=True, versions=versions(3))
    ctx, pg, dlg, logs, errs = run(br, base, d, seeds=[VALID, FOLDER, "localStorage.setItem('h49_drive_backup_id','GONE');"])
    pg.wait_for_timeout(1500); p0 = d.posts
    pg.evaluate("state = {nextType:'A', history:[], weights:[], lastWeights:{}}; saveState();"); pg.wait_for_timeout(3500)
    check("appareil vidé, dernière sauvegarde connue disparue : conflit sur la plus récente, rien envoyé", d.posts == p0 and json.loads(ls(pg, 'h49_drive_conflict') or '{}').get('id') == d.live()[0]['id'] and len(d.live()) == 4, ls(pg, 'h49_drive_conflict'))
    ctx.close()
    br.close()

print(f"\n {sum(res)} / {len(res)} contrôles OK")
sys.exit(0 if all(res) else 1)
