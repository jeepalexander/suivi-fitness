"""Choix automatique des tests selon ce qui a changé (1.8.87, co-auteur : Claude).

Compare le dépôt à une référence (par défaut origin/dev, sinon HEAD) : fichiers modifiés et, pour app.js, les
sections touchées (« // 9. ÉCRAN SÉANCE … »). Chaque fichier ou section renvoie à des groupes ou des tests de
run_tests.py. test_ecrans.py (tour rapide des écrans) et test_decoupage.py (garde-fou du découpage en fichiers) sont
toujours ajoutés dès que le code de l'app change.

  python3 tests/run_tests.py --auto            lance les tests choisis
  python3 tests/run_tests.py --auto --quoi     affiche seulement le choix et sa raison
"""
import re, subprocess
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
BASE = 'test_ecrans.py'
DECOUPAGE = 'test_decoupage.py'  # 1.8.90 : garde-fou du découpage en fichiers, quelques secondes
TOUT = '*'

# Sections de app.js : mot-clé du titre -> tests (ordre : le premier mot-clé trouvé l'emporte)
SECTIONS = [
    ('FIN DE SÉANCE', ['test_fin_seance.py', 'test_sauvegarde_historique.py']),
    ('GOOGLE DRIVE', ['drive']),
    ('SAUVEGARDE, IMPORT', ['historique', 'test_drive_reset.py']),
    ('CONSTANTES', ['seance', 'programmes']),
    ("ÉTAT DE L'APPLICATION", ['seance', 'programmes']),
    ('THÈME', ['style']),
    ('DONNÉES', ['historique', 'drive']),
    ('DÉLOAD', ['test_programmes.py']),
    ('ÉCRAN PROGRAMME', ['programmes']),
    ('CHRONOS', ['test_chrono.py', 'test_titre_seance.py', 'test_pause_actif.py']),
    ('BROUILLON', ['test_brouillon.py', 'test_poids_brouillon.py']),
    ('ÉCRAN SÉANCE', ['seance']),
    ('HISTORIQUE', ['historique']),
    ('GRAPHIQUES', ['progression']),
    ('ANALYSE MENSUELLE', ['test_bilan.py', 'test_trophees.py']),
    ('NAVIGATION', ['style', 'test_reglages.py', 'test_fond_ecran.py']),
    ('MISES À JOUR', ['test_mise_a_jour.py', 'test_telechargements.py', 'test_reglages.py']),
    ('DÉMARRAGE', ['test_premier_lancement.py', 'test_accueil.py', 'test_fond_defaut.py', 'test_stockage_persistant.py']),
]

# Fichier (ou début de chemin) -> tests. None = ne demande aucun test (documentation).
FICHIERS = [
    ('js/aide.js', ['test_aide.py']),
    ('js/drive.js', ['drive']),
    ('js/theme.js', ['style', 'test_fond_ecran.py', 'test_fond_defaut.py', 'test_credits.py']),
    ('js/chronos.js', ['test_chrono.py', 'test_titre_seance.py', 'test_pause_actif.py', 'test_brouillon.py', 'test_poids_brouillon.py']),
    ('js/mises-a-jour.js', ['test_mise_a_jour.py', 'test_reglages.py']),
    ('js/seance.js', ['seance', 'test_fin_seance.py', 'test_sauvegarde_historique.py']),
    ('js/quick_logic.js', ['test_saisie_logique.py', 'test_saisie_rapide.py']),
    ('js/quick_input.js', ['test_saisie_rapide.py']),
    ('tests/quick_logic.test.mjs', ['test_saisie_logique.py']),
    ('js/historique.js', ['historique']),
    ('js/sauvegarde.js', ['historique', 'test_drive_reset.py']),
    ('js/graphiques.js', ['progression']),
    ('js/analyse.js', ['test_bilan.py', 'test_trophees.py']),
    ('js/programmes.js', ['programmes']),
    ('js/bonhomme.js', ['test_bonhomme.py', 'test_programmes.py']),
    ('js/partage.js', ['test_partage.py', 'test_scanner_jsqr.py', 'test_recu_seance.py']),
    ('js/bilan.js', ['test_bilan.py', 'test_trophees.py']),
    ('js/catalogue.js', ['seance', 'test_aide.py', 'test_programmes.py']),
    ('js/fiches.js', ['test_fiches.py']),
    ('js/qrcode.js', ['test_invitation.py', 'test_partage.py']),
    ('js/jsqr.min.js', ['test_scanner_jsqr.py']),
    ('js/security.js', ['test_programmes.py', 'test_sauvegarde_fichier.py', 'test_drive_sauvegarde.py']),
    ('js/chart.umd.min.js', ['progression']),
    ('style.css', ['style']), ('css/', ['style']), ('fonts/', ['style']),
    ('index.html', ['style', 'test_reglages.py']),
    ('sw.js', ['test_mise_a_jour.py', 'test_telechargements.py', 'test_fond_ecran.py', 'test_scanner_jsqr.py']),
    ('manifest.json', ['test_prod_test.py']),
    ('conditions.html', ['test_soutien.py', 'test_credits.py', 'test_editeur_incomplet.py']),
    ('confidentialite.html', ['test_credits.py', 'test_editeur_incomplet.py']),
    ('credits.html', ['test_credits.py']), ('NOTICE', ['test_credits.py']),
    ('presentation.html', ['test_presentation.py', 'test_prod_test.py']),
    ('wallpapers/', ['test_fond_ecran.py', 'test_fond_defaut.py', 'test_credits.py']),
    ('icons/', ['test_fiches.py', 'test_contraste.py', 'test_exercice_retire.py', 'test_rameur.py']),
    ('tools/assembler_site.py', ['test_prod_test.py']), ('.github/', ['test_prod_test.py']),
    ('tests/drive_mock.py', ['drive']), ('tests/test_drive_sauvegarde_helpers.py', ['drive']),
    ('tests/harness.py', [TOUT]), ('tests/fixture_data.json', [TOUT]),
    ('tests/selection.py', []), ('tests/run_tests.py', []), ('tools/', []),
    ('data.json', [TOUT]),
]
DOC = re.compile(r'(\.md|LICENSE|\.txt)$')


def _git(*args):
    return subprocess.run(['git', *args], cwd=REPO, capture_output=True, text=True).stdout


def reference():
    return 'origin/dev' if _git('rev-parse', '--verify', '--quiet', 'origin/dev').strip() else 'HEAD'


def fichiers_modifies(ref):
    """Fichiers modifiés depuis ref (envoyés ou non), plus les nouveaux fichiers pas encore suivis par git."""
    f = set(_git('diff', '--name-only', ref).split())
    f |= set(_git('ls-files', '--others', '--exclude-standard').split())
    return sorted(f)


def sections_app(ref):
    """Titres des sections de app.js touchées par les modifications."""
    lignes = Path(REPO / 'app.js').read_text(encoding='utf-8').splitlines()
    titres, cour = [], None
    for l in lignes:  # titre = ligne « // N. TITRE » juste après une ligne « // ==== »
        if re.match(r'// (\d+b?\.|FENÊTRE) ', l):
            cour = l[3:].strip()
        titres.append(cour)
    touchees = set()
    for m in re.finditer(r'^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@', _git('diff', '-U0', ref, '--', 'app.js'), re.M):
        debut, n = int(m.group(1)), int(m.group(2) or 1)
        for i in range(max(1, debut), debut + max(n, 1)):
            if i - 1 < len(titres) and titres[i - 1]:
                touchees.add(titres[i - 1])
    return sorted(touchees)


def choisir(ref=None):
    """Renvoie (liste de groupes / tests, raisons). Liste vide = aucun test utile (documentation seulement)."""
    ref = ref or reference()
    choix, raisons, code = [], [], False

    def ajoute(cibles, pourquoi):
        nonlocal code
        if cibles:
            code = True
        for c in cibles:
            if c not in choix:
                choix.append(c)
        raisons.append(f'{pourquoi} -> {", ".join(cibles) or "aucun test"}')

    for f in fichiers_modifies(ref):
        if f == 'app.js':
            for s in sections_app(ref) or ['(section inconnue)']:
                cib = next((c for k, c in SECTIONS if k in s), ['seance', 'programmes'])
                ajoute(cib, f'app.js « {s} »')
        elif re.match(r'tests/test_\w+\.py$', f) and not f.endswith('_helpers.py'):
            ajoute([f[6:]], f)
        elif DOC.search(f):
            raisons.append(f'{f} -> documentation, aucun test')
        else:
            cib = next((c for k, c in FICHIERS if f == k or (k.endswith('/') and f.startswith(k))), None)
            ajoute(cib if cib is not None else [BASE], f)
    if TOUT in choix:
        return [], raisons, True
    if code and BASE not in choix:
        choix.append(BASE)
    if code and DECOUPAGE not in choix:
        choix.append(DECOUPAGE)
    return choix, raisons, False
