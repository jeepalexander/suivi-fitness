"""Suppression d'une séance de l'historique : l'historique, les dernières charges et la sauvegarde Google Drive suivent."""
import json, sys
from harness import *
from drive_mock import FakeDrive
import test_drive_sauvegarde_helpers as H
from test_drive_sauvegarde_helpers import run, VALID, FOLDER, BKID, N, DATA, local_state

res = []


def check(name, ok, extra=''):
    ok = bool(ok); res.append(ok)
    print(('OK   ' if ok else 'ÉCHEC'), name, str(extra)[:230])


with Srv() as base, sync_playwright() as p:
    br = p.chromium.launch()
    d0 = FakeDrive(folder=True, backup=DATA)
    ctx, pg, dlg = run(br, base, d0, seeds=[VALID, FOLDER, BKID], confirm=False)
    pg.wait_for_timeout(1500); up0 = d0.uploads()
    pg.evaluate("switchTab('historique'); openSessionModal(%d)" % (N - 1)); pg.click('#modal-delete-btn'); pg.wait_for_timeout(500)
    check('confirmation refusée : séance conservée, rien envoyé', len(local_state(pg)['history']) == N and d0.uploads() == up0)
    ctx.close()

    d = FakeDrive(folder=True, backup=DATA)
    ctx, pg, dlg = run(br, base, d, seeds=[VALID, FOLDER, BKID])
    pg.wait_for_timeout(1500)
    pg.evaluate("switchTab('historique')"); pg.wait_for_timeout(300)
    last_idx = N - 1
    sid = DATA['history'][-1]['id']; stype = DATA['history'][-1]['type']
    has_del = pg.evaluate("(i)=>{openSessionModal(i);return !!document.getElementById('modal-delete-btn')}", last_idx)
    check('la fiche séance propose « Supprimer la séance »', has_del)
    dlg.clear()
    pg.click('#modal-delete-btn'); pg.wait_for_timeout(3500)
    st = local_state(pg)
    check('confirmation mentionne la sauvegarde Drive', any('Drive' in m for t, m in dlg if t == 'confirm'), dlg)
    check(f'séance supprimée de l\'historique local ({N} -> {N-1})', len(st['history']) == N - 1 and all(h['id'] != sid for h in st['history']))
    c = d.content() or {}
    check('sauvegarde Drive mise à jour : la séance en a disparu', len(c.get('history', [])) == N - 1 and all(h['id'] != sid for h in c.get('history', [])), len(c.get('history', [])))
    check('toujours UN seul fichier (mise à jour, pas de doublon)', d.posts == 0 and d.patches >= 1, (d.posts, d.patches))
    check('prochaine séance recalculée depuis l\'historique restant', st['nextType'] == {'A': 'B', 'B': 'C', 'C': 'A'}[st['history'][-1]['type']], st['nextType'])
    check('l\'écran Historique est rafraîchi', f'{N-1} séance' in pg.inner_text('#history-count'), pg.inner_text('#history-count'))
    check('liste des suppressions en attente vidée après envoi réussi', pg.evaluate("localStorage.getItem('h49_drive_deleted_ids')") is None)
    check('aucune erreur JS', not (pg.evaluate("window.__err||null")))

    # conflit : une séance supprimée exprès n'est pas un « conflit » (appareil sans repère de fichier)
    r = pg.evaluate("""(sid)=>{
      const remote={history:[...state.history, {id:sid}]};
      const before=driveRemoteIsContainedInLocal(remote);
      rememberDeletedSessionId(sid);
      return [before, driveRemoteIsContainedInLocal(remote), driveRemoteIsContainedInLocal({history:[...state.history,{id:424242}]})];}""", sid)
    check('sauvegarde contenant la séance supprimée : conflit sans suppression, accepté avec', r == [False, True, False], r)
    ctx.close()

    # dernières charges : repartent de l'historique restant
    ctx, pg, errs = newpage(br, 390, 844, pref='light')
    pg.on('dialog', lambda x: x.accept())
    pg.goto(base + 'index.html'); pg.wait_for_timeout(800)
    pg.evaluate("""()=>{ state.history.push({id:777,date:'2026-11-05',type:'A',isDeload:false,tonnage:9999,duration:'10 min',
        exercises:[{name:'Presse à cuisses',sets:[{weight:300,reps:10}],maxWeight:300,totalVolume:3000}]});
        state.lastWeights['Presse à cuisses']=300; saveState(); renderHistory(); switchTab('historique'); }""")
    pg.wait_for_timeout(300)
    pg.evaluate("openSessionModal(state.history.length-1)"); pg.click('#modal-delete-btn'); pg.wait_for_timeout(500)
    lw = pg.evaluate("state.lastWeights['Presse à cuisses']")
    prev = [h for h in DATA['history'] if any(e['name'] == 'Presse à cuisses' and any(s['weight'] > 0 and s['reps'] > 0 for s in e['sets']) for e in h['exercises'])]
    exp = [s['weight'] for s in [e for e in prev[-1]['exercises'] if e['name'] == 'Presse à cuisses'][0]['sets'] if s['weight'] > 0 and s['reps'] > 0][-1] if prev else None
    check('dernières charges recalculées (plus les 300 kg de l\'essai)', lw != 300 and lw == exp, (lw, exp))
    check('aucune erreur JS (sans Drive)', not errs, errs)
    br.close()

print(f"\n {sum(res)} / {len(res)} contrôles OK")
sys.exit(0 if all(res) else 1)
