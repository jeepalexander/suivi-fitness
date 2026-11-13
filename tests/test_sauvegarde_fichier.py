"""Historique › Sauvegarder (1.7.60) : le fichier part en téléchargement quand le partage n'accepte pas
les .json (Chrome Android) ou échoue, avec un message qui le dit ; un partage fermé ne télécharge rien."""
import json, sys
from harness import Srv, newpage, sync_playwright

res = []


def ok(n, c, extra=''):
    res.append(bool(c)); print(('OK   ' if c else 'FAIL ') + n, '' if c else extra)


with Srv() as url, sync_playwright() as p:
    br = p.chromium.launch()
    for scheme in ('light', 'dark'):
        ctx, pg, errs = newpage(br, pref=scheme, scheme=scheme)
        pg.goto(url + 'index.html'); pg.wait_for_timeout(500)
        pg.evaluate("switchTab('historique')"); pg.wait_for_timeout(200)
        # 1. pas de partage de fichiers (cas de Chrome Android avec un .json) : téléchargement + message
        pg.evaluate("navigator.canShare = () => false")
        with pg.expect_download() as d:
            pg.click('button[onclick="exportData()"]')
        dl = d.value
        name = dl.suggested_filename
        ok(f'[{scheme}] téléchargement « mon-carnet-de-salle-AAAA-MM-JJ.json »', name.startswith('mon-carnet-de-salle-') and name.endswith('.json'), name)
        data = json.load(open(dl.path(), encoding='utf-8'))
        ok(f'[{scheme}] le fichier contient tout l\'état (historique, programmes)', isinstance(data.get('history'), list) and isinstance(data.get('programs'), list))
        pg.wait_for_timeout(300)
        toast = pg.evaluate("(document.querySelector('.toast.show')||{}).textContent||''")
        ok(f'[{scheme}] message : téléchargée, dossier Téléchargements, comment la remettre', 'Sauvegarde téléchargée' in toast and name in toast and 'Téléchargements' in toast and 'Restaurer' in toast, toast)
        if scheme == 'light': pg.screenshot(path='/home/claude/shots/sauvegarde-toast.png')
        # 2. partage proposé mais refusé : téléchargement quand même
        pg.evaluate("navigator.canShare = () => true; navigator.share = () => Promise.reject(Object.assign(new Error('x'), {name: 'NotAllowedError'})); 0")
        with pg.expect_download() as d2:
            pg.click('button[onclick="exportData()"]')
        ok(f'[{scheme}] partage refusé : téléchargement à la place', d2.value.suggested_filename.endswith('.json'))
        # 3. partage fermé par l'usager : rien d'autre
        pg.evaluate("navigator.share = () => Promise.reject(Object.assign(new Error('x'), {name: 'AbortError'})); 0")
        got = []
        pg.on('download', lambda x: got.append(x))
        pg.click('button[onclick="exportData()"]'); pg.wait_for_timeout(600)
        ok(f'[{scheme}] partage fermé : aucun téléchargement', not got)
        # 4. partage réussi : pas de téléchargement
        pg.evaluate("navigator.share = () => Promise.resolve(); 0")
        pg.click('button[onclick="exportData()"]'); pg.wait_for_timeout(600)
        ok(f'[{scheme}] partage réussi : aucun téléchargement', not got)
        ok(f'[{scheme}] aucune erreur JavaScript', not errs, errs)
        ctx.close()
    br.close()
print(f"\n {sum(res)} / {len(res)} contrôles OK")
sys.exit(0 if all(res) else 1)
