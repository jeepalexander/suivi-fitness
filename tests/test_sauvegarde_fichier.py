"""Historique › Sauvegarder (1.7.60–1.7.61) : un volet demande où enregistrer.
- Sur Google Drive : une nouvelle version tout de suite, même sans changement (nom fitness-backup-AAAA-MM-JJ-HH-MM-SS.json),
  avec un message ; accès expiré ou conflit : rien n'est envoyé et le message le dit.
- Sur ce téléphone : le fichier, au même nom que sur le Drive, avec un message ; un partage refusé télécharge aussi,
  un partage fermé ou réussi ne télécharge rien.
Google Identity et l'API Drive sont simulés (aucun appel réseau réel)."""
import json, re, sys
from harness import Srv, newpage, sync_playwright
from drive_mock import FakeDrive

res = []
NAME_RE = re.compile(r'^fitness-backup-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}\.json$')
VALID = "if(!sessionStorage.getItem('seed')){localStorage.setItem('h49_drive_token', JSON.stringify({access_token:'tok1', expires_at: Date.now()+3600000}));localStorage.setItem('h49_drive_wanted','1');localStorage.setItem('h49_drive_folder_id','F1');sessionStorage.setItem('seed','1')}"
EXPIRED = "if(!sessionStorage.getItem('seed')){localStorage.setItem('h49_drive_token', JSON.stringify({access_token:'old', expires_at: Date.now()-1000}));localStorage.setItem('h49_drive_wanted','1');sessionStorage.setItem('seed','1')}"
INSTALLED = """(()=>{const mm=window.matchMedia.bind(window);
window.matchMedia=q=>/display-mode:\\s*fullscreen/.test(q)?{matches:true,media:q,addEventListener(){},removeEventListener(){},addListener(){},removeListener(){}}:mm(q);})();"""
NO_GOOGLE = "window.google={accounts:{oauth2:{initTokenClient(cfg){return {requestAccessToken(){ setTimeout(()=>cfg.error_callback&&cfg.error_callback({type:'popup_closed'}),20); }};},revoke(t,cb){if(cb)cb();}}}};"


def ok(n, c, extra=''):
    res.append(bool(c)); print(('OK   ' if c else 'FAIL ') + n, '' if c else str(extra)[:220])


def toast(pg):
    return pg.evaluate("(document.querySelector('.toast.show')||{}).textContent||''")


def open_save(pg):
    pg.evaluate("switchTab('historique')"); pg.wait_for_timeout(150)
    pg.click('button[onclick="openBackupSave()"]'); pg.wait_for_timeout(250)
    return pg.evaluate("[...document.querySelectorAll('.sheet .backup-item')].map(b=>[b.dataset.k,b.getAttribute('aria-checked'),b.querySelector('.restore-name').textContent])")


with Srv() as url, sync_playwright() as p:
    br = p.chromium.launch()
    for scheme in ('light', 'dark'):
        # --- Pas de Drive : seulement « Sur ce téléphone », lien pour se connecter
        ctx, pg, errs = newpage(br, pref=scheme, scheme=scheme)
        pg.goto(url + 'index.html'); pg.wait_for_timeout(500)
        rows = open_save(pg)
        ok(f'[{scheme}] sans Drive : volet « Sauvegarder », seul « Sur ce téléphone », déjà choisi', rows == [['file', 'true', 'Sur ce téléphone']], rows)
        ok(f'[{scheme}] sans Drive : lien « Se connecter à Google Drive »', pg.evaluate("!!document.querySelector('.sheet .link-btn')"))
        ok(f'[{scheme}] bouton « Télécharger le fichier »', pg.inner_text('#backup-save-go') == 'Télécharger le fichier')
        pg.evaluate("navigator.canShare = () => false")
        with pg.expect_download() as d:
            pg.click('#backup-save-go')
        dl = d.value; name = dl.suggested_filename
        ok(f'[{scheme}] fichier au nom du Drive (fitness-backup-AAAA-MM-JJ-HH-MM-SS.json)', NAME_RE.match(name), name)
        data = json.load(open(dl.path(), encoding='utf-8'))
        ok(f'[{scheme}] le fichier contient tout l\'état', isinstance(data.get('history'), list) and isinstance(data.get('programs'), list))
        pg.wait_for_timeout(300); t = toast(pg)
        ok(f'[{scheme}] message : téléchargée, Téléchargements, comment la remettre', 'Sauvegarde téléchargée' in t and name in t and 'Téléchargements' in t and 'Restaurer' in t, t)
        ok(f'[{scheme}] volet refermé', not pg.evaluate("!!document.querySelector('.sheet.open, .sheet-backdrop.open')"))
        # partage refusé -> téléchargement ; fermé ou réussi -> rien
        pg.evaluate("navigator.canShare = () => true; navigator.share = () => Promise.reject(Object.assign(new Error('x'), {name: 'NotAllowedError'})); 0")
        with pg.expect_download() as d2:
            pg.evaluate("exportData()")
        ok(f'[{scheme}] partage refusé : téléchargement à la place', NAME_RE.match(d2.value.suggested_filename))
        got = []; pg.on('download', lambda x: got.append(x))
        pg.evaluate("navigator.share = () => Promise.reject(Object.assign(new Error('x'), {name: 'AbortError'})); 0")
        pg.evaluate("exportData()"); pg.wait_for_timeout(500)
        pg.evaluate("navigator.share = () => Promise.resolve(); 0")
        pg.evaluate("exportData()"); pg.wait_for_timeout(500)
        ok(f'[{scheme}] partage fermé ou réussi : aucun téléchargement', not got)
        # Annuler ne fait rien
        open_save(pg); pg.click('.sheet .btn-secondary'); pg.wait_for_timeout(300)
        ok(f'[{scheme}] Annuler : aucun téléchargement', not got)
        ok(f'[{scheme}] aucune erreur JavaScript (sans Drive)', not errs, errs)
        ctx.close()

        # --- Drive connecté : nouvelle version, même sans changement
        drive = FakeDrive(folder=True)
        ctx, pg, errs = newpage(br, pref=scheme, scheme=scheme)
        pg.add_init_script(VALID)
        pg.route('**/www.googleapis.com/**', drive.handle)
        pg.goto(url + 'index.html'); pg.wait_for_timeout(500)
        pg.evaluate("syncDriveBackup()"); pg.wait_for_timeout(1200)
        before = drive.posts
        rows = open_save(pg)
        ok(f'[{scheme}] Drive : deux choix, « Sur Google Drive » choisi par défaut',
           [r[0] for r in rows] == ['drive', 'file'] and rows[0][1] == 'true', rows)
        if scheme == 'light': pg.screenshot(path='/home/claude/shots/sauvegarder-volet.png')
        ok(f'[{scheme}] bouton « Sauvegarder sur le Drive »', pg.inner_text('#backup-save-go') == 'Sauvegarder sur le Drive')
        pg.click('#backup-save-go'); pg.wait_for_timeout(1500)
        ok(f'[{scheme}] Drive : une nouvelle version envoyée alors que rien n\'a changé', drive.posts == before + 1, (before, drive.posts))
        ok(f'[{scheme}] Drive : nom fitness-backup-AAAA-MM-JJ-HH-MM-SS.json', drive.post_names and NAME_RE.match(drive.post_names[-1]), drive.post_names)
        t = toast(pg)
        ok(f'[{scheme}] message : envoyée sur Google Drive, nom et dossier', 'Sauvegarde envoyée sur Google Drive' in t and drive.post_names[-1] in t and 'MON CARNET DE SALLE' in t, t)
        if scheme == 'light': pg.screenshot(path='/home/claude/shots/sauvegarder-drive.png')
        # choix « Sur ce téléphone » avec Drive connecté
        open_save(pg); pg.click('.sheet .backup-item.file'); pg.wait_for_timeout(150)
        ok(f'[{scheme}] choisir « Sur ce téléphone » : bouton « Télécharger le fichier »', pg.inner_text('#backup-save-go') == 'Télécharger le fichier')
        pg.evaluate("navigator.canShare = () => false")
        n_posts = drive.posts
        with pg.expect_download() as d3:
            pg.click('#backup-save-go')
        ok(f'[{scheme}] téléchargement, rien envoyé sur le Drive', NAME_RE.match(d3.value.suggested_filename) and drive.posts == n_posts)
        ok(f'[{scheme}] aucune erreur JavaScript (Drive)', not errs, errs)
        ctx.close()

        # --- Drive voulu mais accès expiré (application installée : pas de renouvellement silencieux)
        drive = FakeDrive(folder=True)
        ctx, pg, errs = newpage(br, pref=scheme, scheme=scheme)
        pg.add_init_script(NO_GOOGLE); pg.add_init_script(EXPIRED)
        pg.route('**/www.googleapis.com/**', drive.handle)
        pg.goto(url + 'index.html'); pg.wait_for_timeout(500)
        rows = open_save(pg)
        ok(f'[{scheme}] accès expiré : « Sur Google Drive » reste proposé', rows and rows[0][0] == 'drive', rows)
        pg.click('#backup-save-go'); pg.wait_for_timeout(1500)
        t = toast(pg)
        ok(f'[{scheme}] accès expiré : rien envoyé, message « Reconnecter maintenant »', drive.posts == 0 and 'Connexion Google expirée' in t and 'Reconnecter maintenant' in t, (drive.posts, t))
        ok(f'[{scheme}] aucune erreur JavaScript (accès expiré)', not errs, errs)
        ctx.close()

        # --- Application installée, accès expiré : reconnexion forcée, la sauvegarde part au retour (1.7.62)
        drive = FakeDrive(folder=True)
        ctx, pg, errs = newpage(br, pref=scheme, scheme=scheme)
        pg.add_init_script(INSTALLED); pg.add_init_script(NO_GOOGLE); pg.add_init_script(EXPIRED)
        pg.route('**/www.googleapis.com/**', drive.handle)
        pg.goto(url + 'index.html'); pg.wait_for_timeout(600)
        pg.evaluate("connectDriveByRedirect = () => { window.__redir = (window.__redir || 0) + 1; }; 0")
        open_save(pg)
        pg.click('#backup-save-go'); pg.wait_for_timeout(1200)
        t = toast(pg)
        ok(f'[{scheme}] installée, accès expiré : reconnexion lancée tout de suite', pg.evaluate("window.__redir") == 1 and drive.posts == 0, pg.evaluate("window.__redir"))
        ok(f'[{scheme}] installée : message « reconnexion en cours »', 'reconnexion en cours' in t, t)
        ok(f'[{scheme}] installée : demande de sauvegarde gardée', bool(pg.evaluate("localStorage.getItem('h49_drive_force_pending')")))
        # Retour de Google : jeton valide, l'application se recharge
        pg.evaluate("localStorage.setItem('h49_drive_token', JSON.stringify({access_token:'tok2', expires_at: Date.now()+3600000})); localStorage.setItem('h49_drive_folder_id','F1')")
        pg.reload(); pg.wait_for_timeout(2500)
        t = toast(pg)
        ok(f'[{scheme}] au retour : nouvelle version envoyée, même sans changement', drive.posts == 1 and NAME_RE.match(drive.post_names[-1]), drive.post_names)
        ok(f'[{scheme}] au retour : message « Sauvegarde envoyée sur Google Drive »', 'Sauvegarde envoyée sur Google Drive' in t, t)
        ok(f'[{scheme}] au retour : demande effacée', not pg.evaluate("localStorage.getItem('h49_drive_force_pending')"))
        pg.reload(); pg.wait_for_timeout(2000)
        ok(f'[{scheme}] rechargement suivant : pas d\'envoi en double', drive.posts == 1, drive.posts)
        ok(f'[{scheme}] aucune erreur JavaScript (installée)', not errs, errs)
        ctx.close()
    br.close()
print(f"\n {sum(res)} / {len(res)} contrôles OK")
sys.exit(0 if all(res) else 1)
