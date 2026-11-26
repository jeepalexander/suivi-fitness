"""Saisie rapide, partie calcul (1.8.92, co-auteur : Claude) : lance tests/quick_logic.test.mjs avec node --test."""
import re, subprocess, sys, shutil
from pathlib import Path

HERE = Path(__file__).resolve().parent
if not shutil.which('node'):
    print('node absent : test impossible'); sys.exit(1)
r = subprocess.run(['node', '--test', str(HERE / 'quick_logic.test.mjs')], capture_output=True, text=True)
print(r.stdout[-4000:] + r.stderr[-2000:])
ok = [l for l in r.stdout.splitlines() if re.match(r'^(# |ℹ )pass \d+', l)]   # rapporteur tap ou spec selon la version de node
print(('saisie rapide : ' + ok[0][2:]) if r.returncode == 0 and ok else 'ÉCHEC saisie rapide')
sys.exit(r.returncode)
