"""Assemble le site publié (1.7.64, co-auteur : Claude) : la production (main) à la racine, la version de
test (dev) dans dev/. Les tests et fichiers de travail ne sont pas publiés. Dans dev/, le manifeste prend
le nom « Mon Carnet TEST » pour distinguer les deux icônes sur l'écran d'accueil.

Usage : python3 tools/assembler_site.py <dossier main> <dossier dev> <dossier site>
"""
import json, os, shutil, sys

IGNORE = shutil.ignore_patterns('.git', '.github', 'tests', 'tools', '__pycache__', '*.pyc', '.gitignore')


def copy(src, dst):
    shutil.copytree(src, dst, ignore=IGNORE, dirs_exist_ok=True)


def main(prod, test, site):
    if os.path.exists(site):
        shutil.rmtree(site)
    copy(prod, site)
    shutil.rmtree(os.path.join(site, 'dev'), ignore_errors=True)
    copy(test, os.path.join(site, 'dev'))
    man = os.path.join(site, 'dev', 'manifest.json')
    with open(man, encoding='utf-8') as f:
        m = json.load(f)
    m['name'] = m.get('name', 'Mon Carnet de Salle') + ' (TEST)'
    m['short_name'] = 'Carnet TEST'
    with open(man, 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent=2)
        f.write('\n')
    # 1.8.25 : la version de test n'est pas indexée par les moteurs de recherche (sinon Google la voit
    # comme un doublon de la production : « Page en double sans URL canonique sélectionnée »).
    noindex = '<meta name="robots" content="noindex, nofollow">'
    for root, _, files in os.walk(os.path.join(site, 'dev')):
        for name in files:
            if not name.endswith('.html'):
                continue
            path = os.path.join(root, name)
            with open(path, encoding='utf-8') as f:
                html = f.read()
            if 'name="robots"' in html or '<head>' not in html:
                continue
            with open(path, 'w', encoding='utf-8') as f:
                f.write(html.replace('<head>', '<head>\n  ' + noindex, 1))
    open(os.path.join(site, '.nojekyll'), 'w').close()
    print('site assemblé :', site)


if __name__ == '__main__':
    main(*sys.argv[1:4])
