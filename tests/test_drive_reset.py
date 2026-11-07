"""Réinitialisation locale : la sauvegarde Google Drive n'est JAMAIS écrasée par des données vides."""
import json, sys
from harness import *
from drive_mock import FakeDrive
from test_drive_sauvegarde_helpers import run, VALID, FOLDER, BKID, N, DATA, local_state

res = []


def check(name, ok, extra=''):
    ok = bool(ok); res.append(ok)
    print(('OK   ' if ok else 'ÉCHEC'), name, str(extra)[:230])


EMPTY = "state = {nextType:'A', history:[], weights:[], lastWeights:{}}; saveState();"
vis = lambda pg, i: pg.evaluate(f"(()=>{{const e=document.getElementById('{i}');return !!e&&e.style.display!=='none'&&e.offsetParent!==null}})()")

with Srv() as base, sync_playwright() as p:
    br = p.chromium.launch()
    d = FakeDrive(folder=True, backup=DATA)
    ctx, pg, dlg = run(br, base, d, seeds=[VALID, FOLDER, BKID])
    pg.wait_for_timeout(1500); up0 = d.uploads()
    pg.evaluate(EMPTY); pg.wait_for_timeout(3500)
    check("réinitialisation : la sauvegarde Drive n'est pas écrasée (aucun envoi)", d.uploads() == up0 and len((d.content() or {}).get('history', [])) == N, (d.uploads(), up0))
    pg.evaluate("switchTab('reglages')"); pg.wait_for_timeout(500)
    txt = pg.inner_text('#drive-status')
    check("conflit signalé avec choix « Restaurer » / « Remplacer »", vis(pg, 'drive-restore-btn') and vis(pg, 'drive-replace-btn') and f'{N} séances' in txt, txt)
    # restauration depuis Drive : tout revient
    pg.evaluate("restoreFromDrive()"); pg.wait_for_timeout(2500)
    check(f"« Restaurer » : les {N} séances reviennent", len(local_state(pg)['history']) == N, len(local_state(pg)['history']))
    ctx.close()

    # remplacement volontaire : la sauvegarde est bien vidée
    d = FakeDrive(folder=True, backup=DATA)
    ctx, pg, dlg = run(br, base, d, seeds=[VALID, FOLDER, BKID])
    pg.wait_for_timeout(1500)
    pg.evaluate(EMPTY); pg.wait_for_timeout(3500)
    pg.evaluate("switchTab('reglages')"); pg.wait_for_timeout(300)
    pg.evaluate("replaceDriveBackupWithThisDevice()"); pg.wait_for_timeout(3000)
    check("« Remplacer » (choix explicite) : la sauvegarde Drive est vidée", len((d.content() or {}).get('history', ['x'])) == 0, len((d.content() or {}).get('history', ['x'])))
    pg.evaluate("state.history.push(%s); saveState();" % json.dumps(DATA['history'][0])); pg.wait_for_timeout(3000)
    check("ensuite, les nouvelles séances se sauvegardent normalement", len((d.content() or {}).get('history', [])) == 1)

    # sauvegarde Drive vide : « Restaurer » ne vide pas l'appareil
    ctx.close()
    d2 = FakeDrive(folder=True, backup={'nextType': 'A', 'history': [], 'weights': [], 'lastWeights': {}})
    ctx, pg, dlg = run(br, base, d2, seeds=[VALID, FOLDER, BKID])
    pg.wait_for_timeout(1500)
    d2.backup = json.dumps({'nextType': 'A', 'history': [], 'weights': [], 'lastWeights': {}})  # la sauvegarde Drive est (devenue) vide
    n0 = len(local_state(pg)['history']); dlg.clear()
    pg.evaluate("restoreFromDrive()"); pg.wait_for_timeout(2000)
    check("sauvegarde Drive vide : « Restaurer » refuse et ne touche pas aux données locales", len(local_state(pg)['history']) == n0 and any('aucune séance' in m for t, m in dlg), dlg)
    ctx.close(); br.close()

print(f"\n {sum(res)} / {len(res)} contrôles OK")
sys.exit(0 if all(res) else 1)
