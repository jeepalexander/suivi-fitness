"""Lance les tests (code de sortie 0 = tout est bon).

  python3 tests/run_tests.py                  tous les tests
  python3 tests/run_tests.py seance           seulement un groupe (plusieurs possibles : seance programmes)
  python3 tests/run_tests.py test_rameur.py   un ou plusieurs fichiers précis
  python3 tests/run_tests.py -j 3 seance      3 tests en parallèle (par défaut : 2)
  python3 tests/run_tests.py --liste          affiche les groupes

1.7.45 (co-auteur : Claude) : groupes par onglet et exécution en parallèle, pour ne lancer que les tests
concernés par une modification. Chaque test démarre son propre serveur sur un port libre : ils peuvent
tourner en même temps.
"""
import subprocess, sys, time, os
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

HERE = Path(__file__).resolve().parent
TESTS = ['test_validation.py', 'test_rameur.py', 'test_drive_reset.py', 'test_progression_jours.py', 'test_supprimer_seance.py', 'test_annuler_seance.py', 'test_brouillon.py', 'test_poids_brouillon.py', 'test_chrono.py', 'test_mise_a_jour.py', 'test_reglages.py', 'test_drive_compte.py', 'test_drive_sauvegarde.py', 'test_drive_versions.py', 'test_drive_installee.py', 'test_drive_android.py', 'test_drive_reconnexion.py', 'test_programmes.py', 'test_editeur_deplacer.py', 'test_fond_ecran.py', 'test_invitation.py', 'test_accueil.py', 'test_fin_seance.py', 'test_editeur_incomplet.py', 'test_fenetres.py', 'test_pause_actif.py', 'test_mise_en_page.py', 'test_poly_1rm.py', 'test_poids_du_corps.py', 'test_titre_seance.py', 'test_pastille_1x.py', 'test_contraste.py', 'test_presentation.py', 'test_bilan.py', 'test_partage.py', 'test_choix_espace.py', 'test_doublons.py']

# Un test peut appartenir à plusieurs groupes.
GROUPES = {
    'seance': ['test_validation.py', 'test_rameur.py', 'test_annuler_seance.py', 'test_brouillon.py', 'test_poids_brouillon.py',
               'test_chrono.py', 'test_fin_seance.py', 'test_titre_seance.py', 'test_poids_du_corps.py', 'test_doublons.py'],
    'programmes': ['test_partage.py', 'test_bilan.py', 'test_programmes.py', 'test_editeur_deplacer.py', 'test_editeur_incomplet.py', 'test_pause_actif.py',
                   'test_accueil.py', 'test_pastille_1x.py', 'test_doublons.py'],
    'progression': ['test_progression_jours.py', 'test_poly_1rm.py', 'test_poids_du_corps.py', 'test_pastille_1x.py', 'test_bilan.py'],
    'historique': ['test_supprimer_seance.py', 'test_progression_jours.py'],
    'reglages': ['test_reglages.py', 'test_fond_ecran.py', 'test_invitation.py', 'test_mise_a_jour.py', 'test_presentation.py'],
    'drive': ['test_drive_reset.py', 'test_drive_compte.py', 'test_drive_sauvegarde.py', 'test_drive_versions.py',
              'test_drive_installee.py', 'test_drive_android.py', 'test_drive_reconnexion.py'],
    'style': ['test_fenetres.py', 'test_mise_en_page.py', 'test_choix_espace.py', 'test_pastille_1x.py', 'test_titre_seance.py', 'test_contraste.py'],
}


def lancer(t):
    debut = time.time()
    r = subprocess.run([sys.executable, str(HERE / t)], cwd=HERE, capture_output=True, text=True)
    return t, r.returncode, time.time() - debut, r.stdout + r.stderr


def main(args):
    jobs = 2
    if '-j' in args:
        i = args.index('-j'); jobs = max(1, int(args[i + 1])); del args[i:i + 2]
    if '--liste' in args:
        for g, ts in GROUPES.items(): print(f'{g:12} {len(ts):2} tests  ' + ', '.join(t[5:-3] for t in ts))
        return 0
    choisis = []
    for a in args:
        lot = GROUPES.get(a) or ([a] if a in TESTS else [a + '.py'] if a + '.py' in TESTS else ['test_' + a + '.py'] if 'test_' + a + '.py' in TESTS else None)
        if lot is None:
            print(f'Groupe ou test inconnu : {a} (voir --liste)'); return 2
        choisis += [t for t in lot if t not in choisis]
    choisis = choisis or TESTS
    print(f'{len(choisis)} test(s), {jobs} en parallèle', flush=True)
    debut = time.time(); echecs = []
    with ThreadPoolExecutor(max_workers=jobs) as ex:
        for t, code, duree, sortie in ex.map(lancer, choisis):
            dernier = [l for l in sortie.strip().splitlines() if l.strip()][-1:] or ['']
            print(f"{'OK   ' if code == 0 else 'ÉCHEC'} {t:30} {duree:5.0f} s  {dernier[0].strip()[:60]}", flush=True)
            if code != 0:
                echecs.append(t); print(sortie[-3000:])
    print(f"\n{'TOUS LES TESTS PASSENT' if not echecs else 'ÉCHECS : ' + ', '.join(echecs)}  ({time.time() - debut:.0f} s)")
    return 1 if echecs else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
