"""Réinitialisation locale : la sauvegarde Google Drive n'est JAMAIS écrasée par des données vides."""
import json, sys
from harness import *
from drive_mock import FakeDrive
from test_drive_sauvegarde_helpers import run, restore_pick, VALID, FOLDER, BKID, N, DATA, local_state

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
    check("conflit signalé avec choix « Restaurer » / « Effacer »", vis(pg, 'drive-restore-btn') and vis(pg, 'drive-replace-btn') and f'{N} séances' in txt and 'aucune séance' in txt, txt)
    check("bouton intitulé « Effacer définitivement la sauvegarde Drive » (appareil vide)", pg.inner_text('#drive-replace-btn').strip() == 'Effacer définitivement la sauvegarde Drive', pg.inner_text('#drive-replace-btn'))
    check("date de la sauvegarde Drive affichée (plus de « date inconnue »)", 'date inconnue' not in txt and 'modifiée le' in txt, txt)
    # conflit déjà enregistré sans date (ancienne version) : la date est lue sur le Drive
    pg.evaluate("driveConflictDateAsked=false; setDriveConflict({id:'BK1',modified:'',sessions:42}); updateDriveUI();"); pg.wait_for_timeout(1500)
    check("conflit ancien sans date : la date est récupérée et affichée", 'date inconnue' not in pg.inner_text('#drive-status'), pg.inner_text('#drive-status'))
    # restauration depuis Drive : tout revient
    restore_pick(pg, 0)
    check(f"« Restaurer » : les {N} séances reviennent", len(local_state(pg)['history']) == N, len(local_state(pg)['history']))
    ctx.close()

    # remplacement volontaire : la sauvegarde est bien vidée
    d = FakeDrive(folder=True, backup=DATA)
    ctx, pg, dlg = run(br, base, d, seeds=[VALID, FOLDER, BKID])
    pg.wait_for_timeout(1500)
    pg.evaluate(EMPTY); pg.wait_for_timeout(3500)
    pg.evaluate("switchTab('reglages')"); pg.wait_for_timeout(300)
    pg.once('dialog', lambda x: None) if False else None
    dlg.clear(); pg.evaluate("replaceDriveBackupWithThisDevice()"); pg.wait_for_timeout(3000)
    check("confirmation « Effacer la sauvegarde Drive ? » affichée", any('Effacer la sauvegarde Drive' in m and 'irréversible' in m for t, m in dlg), dlg)
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
    restore_pick(pg, 0, 2000)
    check("sauvegarde Drive vide : « Restaurer » refuse et ne touche pas aux données locales", len(local_state(pg)['history']) == n0 and any('aucune séance' in m for t, m in dlg), dlg)
    ctx.close(); br.close()

print(f"\n {sum(res)} / {len(res)} contrôles OK")
sys.exit(0 if all(res) else 1)
