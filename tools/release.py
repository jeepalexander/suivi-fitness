"""Release automatique (1.8.87, co-auteur : Claude) : une commande fait tout le rituel d'une version.

  python3 tools/release.py --titre "Texte court" --notes notes.md
      1. récupère dev sur GitHub ; si une autre conversation a publié entre-temps, repart de sa version
      2. vérifie que chaque test est déclaré (run_tests.py, tests/README.md)
      3. lance les tests concernés (--tests auto par défaut ; « aucun », ou des groupes / tests : --tests seance,rameur)
      4. version suivante dans manifest.json, sw.js (APP_VERSION) et le badge du README
      5. ajoute l'entrée du CHANGELOG (les rubriques « ### » reçoivent « (co-auteur : Claude) »)
      6. commit « Claude <version> : <titre> » signé co-auteur, envoi sur dev
      7. suit la publication GitHub (site de test) et donne l'état des tests GitHub

  python3 tools/release.py --etat                   versions de dev et de main, dernières publications
  python3 tools/release.py --production --confirme  dev -> main (seulement avec son accord explicite)

Options : --essai (montre sans rien écrire ni envoyer), --sans-envoi (commit local seulement), --version 1.9.0,
--rubrique "Séance" (si les notes n'ont pas de ligne « ### »), --session <URL de la conversation>,
--coauteur "Claude Opus 5.5 <noreply@anthropic.com>", -j 3 (tests en parallèle).

Le fichier de notes est du Markdown : des lignes « - … », éventuellement sous des rubriques « ### Séance ».
"""
import argparse, datetime, json, os, re, subprocess, sys, time
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
GH_REPO = 'jeepalexander/suivi-fitness'
sys.path.insert(0, str(REPO / 'tests'))
REFS = {b: f'+refs/heads/{b}:refs/remotes/origin/{b}' for b in ('dev', 'main')}


def sh(*cmd, check=True, capture=True):
    r = subprocess.run(cmd, cwd=REPO, text=True, capture_output=capture)
    if check and r.returncode:
        sys.exit(f'ÉCHEC : {" ".join(cmd)}\n{(r.stdout or "") + (r.stderr or "")}')
    return (r.stdout or '').strip()


def git(*a, check=True):
    return sh('git', *a, check=check)


def etape(t):
    print(f'\n== {t}', flush=True)


def version_de(texte):
    return tuple(int(x) for x in json.loads(texte)['version'].split('.'))


def vstr(v):
    return '.'.join(map(str, v))


def recuperer_dev():
    git('fetch', '--depth=50', 'origin', REFS['dev'])
    if subprocess.run(['git', 'merge-base', '--is-ancestor', 'origin/dev', 'HEAD'], cwd=REPO).returncode == 0:
        return 'à jour'
    # Une autre conversation a publié : on se place après sa version, en gardant nos modifications.
    if subprocess.run(['git', 'merge-base', '--is-ancestor', 'HEAD', 'origin/dev'], cwd=REPO).returncode == 0:
        r = subprocess.run(['git', 'rebase', '--autostash', 'origin/dev'], cwd=REPO, text=True, capture_output=True)
        if r.returncode:
            sys.exit('ÉCHEC : dev a changé sur GitHub et nos modifications entrent en conflit avec les siennes.\n'
                     'Résoudre le conflit (git status), puis relancer.\n' + r.stdout + r.stderr)
        return 'rattrapé (' + git('log', '-1', '--format=%s', 'origin/dev') + ')'
    sys.exit('ÉCHEC : la branche locale et dev sur GitHub ont divergé (commits locaux non envoyés ?). '
             'Faire « git rebase origin/dev » puis relancer.')


def verifier_declarations():
    import run_tests
    fichiers = sorted(p.name for p in (REPO / 'tests').glob('test_*.py') if not p.name.endswith('_helpers.py'))
    lisez = (REPO / 'tests' / 'README.md').read_text(encoding='utf-8')
    groupes = {t for v in run_tests.GROUPES.values() for t in v}
    absents = [f for f in fichiers if f not in run_tests.TESTS]
    if absents:
        sys.exit('ÉCHEC : tests absents de TESTS dans tests/run_tests.py : ' + ', '.join(absents))
    for f in fichiers:
        if f'`{f}`' not in lisez:
            print(f'  attention : {f} n\'est pas décrit dans tests/README.md')
        if f not in groupes:
            print(f'  attention : {f} n\'appartient à aucun groupe de run_tests.py')


def lancer_tests(choix, jobs, essai):
    if choix == 'aucun':
        print('  aucun test demandé'); return
    args = ['--auto'] if choix == 'auto' else [c.strip() for c in choix.split(',') if c.strip()]
    if essai:
        args = args + (['--quoi'] if choix == 'auto' else [])
        if choix != 'auto':
            print('  tests prévus : ' + ', '.join(args)); return
    r = subprocess.run([sys.executable, str(REPO / 'tests' / 'run_tests.py'), '-j', str(jobs), *args], cwd=REPO / 'tests')
    if r.returncode:
        sys.exit('ÉCHEC : des tests échouent, rien n\'est publié.')


def entree_changelog(version, notes, rubrique):
    lignes = notes.strip().splitlines()
    if not any(l.startswith('### ') for l in lignes):
        if not rubrique:
            sys.exit('ÉCHEC : les notes n\'ont pas de rubrique « ### … » : ajouter --rubrique "Séance" (par exemple).')
        lignes = [f'### {rubrique}'] + lignes
    lignes = [l + ' (co-auteur : Claude)' if l.startswith('### ') and 'co-auteur' not in l else l for l in lignes]
    return f'## [{version}] - {datetime.date.today().isoformat()}\n' + '\n'.join(lignes) + '\n\n---\n\n'


def ecrire_versions(nouvelle, ancienne, notes_md, rubrique):
    v, a = vstr(nouvelle), vstr(ancienne)
    man = REPO / 'manifest.json'
    t = man.read_text(encoding='utf-8')
    t2 = re.sub(r'("version"\s*:\s*")[\d.]+(")', r'\g<1>' + v + r'\g<2>', t, count=1)
    sw = REPO / 'sw.js'
    s = sw.read_text(encoding='utf-8')
    s2, n = re.subn(r"const APP_VERSION = '[\d.]+';", f"const APP_VERSION = '{v}';", s)
    if t2 == t or n != 1:
        sys.exit('ÉCHEC : version introuvable dans manifest.json ou sw.js')
    man.write_text(t2, encoding='utf-8'); sw.write_text(s2, encoding='utf-8')
    rd = REPO / 'README.md'
    r = rd.read_text(encoding='utf-8')
    rd.write_text(re.sub(r'badge/version-[\d.]+-', f'badge/version-{v}-', r, count=1), encoding='utf-8')
    cl = REPO / 'CHANGELOG.md'
    c = cl.read_text(encoding='utf-8')
    if f'## [{v}]' in c:
        sys.exit(f'ÉCHEC : le CHANGELOG a déjà une entrée {v}')
    i = c.index('## [')
    cl.write_text(c[:i] + entree_changelog(v, notes_md, rubrique) + c[i:], encoding='utf-8')
    print(f'  {a} -> {v} : manifest.json, sw.js, badge du README, CHANGELOG')


def suivre_publication(sha, depart, minutes=6):
    """Attend la publication du site (workflow « Publier le site ») lancée après l'envoi ; donne l'état des tests."""
    fin = time.time() + minutes * 60
    pub = tests = None
    while time.time() < fin:
        time.sleep(20)
        try:
            runs = json.loads(sh('gh', 'run', 'list', '--repo', GH_REPO, '--limit', '10', '--json',
                                 'name,status,conclusion,headSha,createdAt,url', check=False) or '[]')
        except ValueError:
            runs = []
        tests = next((r for r in runs if r['name'] == 'Tests' and r['headSha'] == sha), tests)
        pub = next((r for r in runs if r['name'].startswith('Publier le site') and r['createdAt'] >= depart), None)
        if pub and pub['status'] == 'completed':
            break
    if not pub:
        print('  publication pas encore lancée : vérifier avec « python3 tools/release.py --etat »')
    elif pub['status'] != 'completed':
        print('  publication en cours :', pub['url'])
    else:
        print(f"  publication du site : {'réussie' if pub['conclusion'] == 'success' else 'ÉCHEC ' + str(pub['conclusion'])} ({pub['url']})")
        if pub['conclusion'] != 'success':
            print('  (un échec au démarrage de GitHub Pages se corrige souvent en relançant : gh run rerun <id>)')
    if tests:
        etat = tests['conclusion'] if tests['status'] == 'completed' else 'en cours (environ 10 min)'
        print(f'  tests GitHub : {etat} ({tests["url"]})')


def etat():
    git('fetch', '--depth=50', 'origin', REFS['dev'], REFS['main'])
    for b in ('dev', 'main'):
        v = vstr(version_de(git('show', f'origin/{b}:manifest.json')))
        print(f'{b:5} {v:8} {git("log", "-1", "--format=%cd  %s", "--date=format:%d/%m %H:%M", f"origin/{b}")}')
    print(sh('gh', 'run', 'list', '--repo', GH_REPO, '--limit', '4', check=False))


def production(args):
    if not args.confirme:
        sys.exit('La production demande son accord explicite : relancer avec --confirme une fois qu\'elle a dit oui.')
    if git('status', '--porcelain'):
        sys.exit('ÉCHEC : des modifications ne sont pas enregistrées ; publier d\'abord sur dev.')
    git('fetch', '--depth=200', 'origin', REFS['dev'], REFS['main'])
    v = vstr(version_de(git('show', 'origin/dev:manifest.json')))
    vm = vstr(version_de(git('show', 'origin/main:manifest.json')))
    print(f'production : {vm} -> {v}')
    if args.essai:
        return
    avant = git('rev-parse', '--abbrev-ref', 'HEAD')
    git('checkout', '-B', 'main', 'origin/main')
    msg = f'Production {v}\n\n' + trailers(args)
    r = subprocess.run(['git', 'merge', '--no-ff', 'origin/dev', '-m', msg], cwd=REPO, text=True, capture_output=True)
    if r.returncode:
        git('merge', '--abort', check=False); git('checkout', avant, check=False)
        sys.exit('ÉCHEC de la fusion dev -> main :\n' + r.stdout + r.stderr)
    depart = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    sh('git', '-c', 'push.negotiate=true', 'push', 'origin', 'main', check=True)
    git('checkout', avant)
    print(f'main est en {v}')
    suivre_publication(git('rev-parse', 'origin/main'), depart)


def trailers(args):
    t = f'Co-Authored-By: {args.coauteur}'
    session = args.session or os.environ.get('CLAUDE_SESSION_URL', '')
    return t + (f'\nClaude-Session: {session}' if session else '')


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--titre'); ap.add_argument('--notes'); ap.add_argument('--rubrique')
    ap.add_argument('--tests', default='auto'); ap.add_argument('-j', type=int, default=3)
    ap.add_argument('--version'); ap.add_argument('--session')
    ap.add_argument('--coauteur', default='Claude <noreply@anthropic.com>')
    ap.add_argument('--essai', action='store_true'); ap.add_argument('--sans-envoi', action='store_true')
    ap.add_argument('--etat', action='store_true')
    ap.add_argument('--production', action='store_true'); ap.add_argument('--confirme', action='store_true')
    args = ap.parse_args()
    if args.etat:
        return etat()
    if args.production:
        return production(args)
    if not args.titre or not args.notes:
        ap.error('--titre et --notes sont nécessaires (voir --help)')
    notes = Path(args.notes).read_text(encoding='utf-8')

    etape('Récupération de dev sur GitHub')
    if git('rev-parse', '--abbrev-ref', 'HEAD') != 'dev':
        sys.exit('ÉCHEC : se placer sur la branche dev (git checkout dev).')
    print('  ' + recuperer_dev())
    ancienne = max(version_de((REPO / 'manifest.json').read_text(encoding='utf-8')),
                   version_de(git('show', 'origin/dev:manifest.json')))
    nouvelle = tuple(int(x) for x in args.version.split('.')) if args.version else ancienne[:2] + (ancienne[2] + 1,)
    if nouvelle <= ancienne:
        sys.exit(f'ÉCHEC : {vstr(nouvelle)} n\'est pas après {vstr(ancienne)}')
    print(f'  nouvelle version : {vstr(nouvelle)}')

    etape('Déclaration des tests')
    verifier_declarations()

    etape('Tests')
    lancer_tests(args.tests, args.j, args.essai)

    etape('Versions et CHANGELOG')
    if args.essai:
        print(entree_changelog(vstr(nouvelle), notes, args.rubrique))
        print('Essai seulement : rien n\'a été écrit ni envoyé.'); return 0
    ecrire_versions(nouvelle, ancienne, notes, args.rubrique)

    etape('Commit')
    auteur = git('log', '-1', '--format=%an <%ae>', 'origin/dev')
    git('add', '-A')
    msg = f'Claude {vstr(nouvelle)} : {args.titre}\n\n' + trailers(args)
    git('commit', '-q', '--author', auteur, '-m', msg)
    sha = git('rev-parse', 'HEAD')
    print('  ' + git('log', '-1', '--format=%h %s'))
    if args.sans_envoi:
        print('Commit local seulement (--sans-envoi).'); return 0

    etape('Envoi sur dev')
    depart = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    r = subprocess.run(['git', '-c', 'push.negotiate=true', 'push', 'origin', 'HEAD:dev'], cwd=REPO, text=True, capture_output=True)
    if r.returncode:
        sys.exit('ÉCHEC de l\'envoi :\n' + r.stdout + r.stderr)
    print(f'  {vstr(nouvelle)} envoyée sur dev')

    etape('Publication')
    suivre_publication(sha, depart)
    print(f'\nVersion de test : https://jeepalexander.github.io/suivi-fitness/dev/  ({vstr(nouvelle)})')
    return 0


if __name__ == '__main__':
    sys.exit(main())
