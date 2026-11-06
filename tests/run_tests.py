"""Lance tous les tests : python3 tests/run_tests.py   (code de sortie 0 = tout est bon)."""
import subprocess, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
TESTS = ['test_validation.py', 'test_rameur.py', 'test_supprimer_seance.py', 'test_annuler_seance.py', 'test_brouillon.py', 'test_poids_brouillon.py', 'test_chrono.py', 'test_mise_a_jour.py', 'test_reglages.py', 'test_drive_compte.py', 'test_drive_sauvegarde.py', 'test_drive_installee.py', 'test_mise_en_page.py']

echecs = []
for t in TESTS:
    print(f'\n=== {t} ===', flush=True)
    r = subprocess.run([sys.executable, str(HERE / t)], cwd=HERE)
    if r.returncode != 0:
        echecs.append(t)
print('\n' + ('TOUS LES TESTS PASSENT' if not echecs else 'ÉCHECS : ' + ', '.join(echecs)))
sys.exit(1 if echecs else 0)
