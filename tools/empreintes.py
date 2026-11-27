# Copyright (c) 2026 Jean-Philippe Alexander. Mon Carnet de Salle.
# SPDX-License-Identifier: PolyForm-Strict-1.0.0 (voir LICENSE et NOTICE)
"""Empreintes des fichiers mis en cache (1.8.102, co-auteur : Claude).

Écrit dans sw.js, entre les deux lignes repères, l'empreinte (SHA-256 tronqué) de chaque fichier de ASSETS.
À une mise à jour, le nouveau service worker reprend de l'ancien cache tout fichier dont l'empreinte
n'a pas changé, et ne télécharge que les fichiers nouveaux ou modifiés.

release.py l'appelle à chaque publication. À la main :
  python3 tools/empreintes.py            écrit les empreintes dans sw.js
  python3 tools/empreintes.py --verifier  échoue si une empreinte ne correspond plus au fichier
"""
import hashlib, json, re, sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
SW = REPO / 'sw.js'
DEBUT = '// EMPREINTES (écrites par tools/empreintes.py à chaque release : ne pas modifier à la main)'
FIN = '// FIN DES EMPREINTES'


def calculer(sw_texte):
    bloc = re.search(r'const ASSETS = \[(.*?)\];', sw_texte, re.S).group(1)
    urls = re.findall(r"'(\./[^']*)'", bloc)
    emp = {}
    for u in urls:
        chemin = REPO / ('index.html' if u == './' else u[2:])
        emp[u] = hashlib.sha256(chemin.read_bytes()).hexdigest()[:12]
    return emp


def bloc(emp):
    return DEBUT + '\nconst EMPREINTES = ' + json.dumps(emp, ensure_ascii=False, separators=(',', ':')) + ';\n' + FIN


def lire(sw_texte):
    m = re.search(re.escape(DEBUT) + r'\nconst EMPREINTES = (\{.*?\});\n' + re.escape(FIN), sw_texte, re.S)
    return json.loads(m.group(1)) if m else None


def ecrire():
    s = SW.read_text(encoding='utf-8')
    neuf = bloc(calculer(s))
    s2, n = re.subn(re.escape(DEBUT) + r'.*?' + re.escape(FIN), lambda _: neuf, s, flags=re.S)
    if n != 1:
        sys.exit('ÉCHEC : repères des empreintes introuvables dans sw.js')
    if s2 != s:
        SW.write_text(s2, encoding='utf-8')
    return s2 != s


def ecarts():
    s = SW.read_text(encoding='utf-8')
    attendu, ecrit = calculer(s), lire(s) or {}
    return sorted(u for u in set(attendu) | set(ecrit) if attendu.get(u) != ecrit.get(u))


if __name__ == '__main__':
    if '--verifier' in sys.argv:
        e = ecarts()
        print('empreintes à jour' if not e else 'empreintes périmées : ' + ', '.join(e))
        sys.exit(1 if e else 0)
    print('sw.js : empreintes ' + ('mises à jour' if ecrire() else 'déjà à jour'))
