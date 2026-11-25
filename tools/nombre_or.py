"""tools/nombre_or.py — 1.8.91. Usage : python3 tools/nombre_or.py style.css (ou components/bundle.css du design system).
Ne pas relancer sur un style.css déjà passé : les valeurs sont déjà sur les échelles (le script ne change alors presque rien).

Applique pour de bon le design system « nombre d'or, moins de tailles » à style.css (valeurs réécrites en place,
commentaires et ordre des règles conservés). Co-auteur : Claude.

Texte      13 · 15 · 17 · 22 · 28 · 44 · 72 ; 18 gardé ; 24 gardé pour .set-input ; 14 règles de 15 px passées à 17
Espaces    5 · 8 · 13 · 21 · 34 (marge de page 26 gardée ; au-delà de 36 px inchangé)
Contrôles  36 · 44 · 56 (hauteurs et largeurs de 34 à 62 px) ; icônes 16 · 20 · 24 (15 à 28 px)
Rayons     8 · 13 · 21 · 25 · 34 · pilule (25 gardé ; ≤ 3 px et ≥ 400 px inchangés)
Interligne 1,05 · 1,35 · 1,6 ; graisses 400 · 600 · 700 (500 → 600)
"""
import json, re, sys
from pathlib import Path

TXT = [13, 15, 17, 22, 28, 44, 72]
ESP = [0, 5, 8, 13, 21, 34]
CTRL = [36, 44, 56]
ICO = [16, 20, 24]
RAY = [8, 13, 21, 34]
ESPACE = re.compile(r'^(padding|margin|gap|row-gap|column-gap)(-(top|right|bottom|left|inline|block))*$')
RAYON = re.compile(r'^border(-(top|bottom)-(left|right))?-radius$')
OK15 = {'.hdr-btn-text', 'nav button.active', 'select.filter-select', '.filter-btn', '.seg-group .filter-btn', '.next-card-count', '.workout-progress-row', '.set-label', '.trophy-n', '.history-month-meta', '.prog-detail-btn', '.add-chips .filter-btn', '.deload-btn', '.wallpaper-lead'}   # 15 px -> 17 : ne déplacent rien (testé sur tous les écrans, 390 et 360 px)


def proche(v, s):
    sg = -1 if v < 0 else 1
    return sg * min(s, key=lambda f: (abs(f - abs(v)), -f))


FONC = re.compile(r'\b(max|min|env|clamp)\((?:[^()]|\([^()]*\))*\)')


def num(val, fn):
    # les valeurs dans max() / min() / env() / clamp() (en-tête calé sous la caméra, zones sûres) restent telles quelles
    proteges = [m.span() for m in FONC.finditer(val)]
    def rempl(m):
        if any(a <= m.start() < b for a, b in proteges):
            return m.group(0)
        return fn(float(m.group(1)) * (16 if m.group(2) == 'rem' else 1), m.group(0))
    return re.sub(r'(-?[0-9.]+)(px|rem)\b', rempl, val)


def fmt(v):
    return f'{v:g}px'


def regle(sel, prop, val):
    if prop == 'font-size':
        def f(n, o):
            if 17.5 < n < 18.5:
                return o                                   # 18 gardé
            if sel == '.set-input' and 23.5 < n < 24.5:
                return o                                   # chiffres des séries
            if 14.5 <= n < 15.5 and sel in OK15:
                return '17px'
            if n < 14.5:
                return '13px'
            if n < 15.5:
                return '15px'
            if n < 19:
                return '17px'
            return fmt(proche(n, TXT))
        return num(val, f)
    if ESPACE.match(prop):
        return num(val, lambda n, o: o if (abs(n) > 36 or abs(n) <= 3) else fmt(proche(n, ESP)))   # 1, 2, 3 : déjà dans la suite
    if RAYON.match(prop) or prop == '--radius-field':
        return num(val, lambda n, o: o if (n >= 400 or n <= 3 or 24 <= n <= 26) else fmt(proche(n, RAY)))
    if prop in ('height', 'width', 'min-height', 'min-width'):
        if sel in ('.exercise-item.open .btn-set-count',):
            return num(val, lambda n, o: '36px' if 38 <= n <= 42 else o)
        def f(n, o):
            if 34 <= n <= 62:
                return fmt(proche(n, CTRL))
            if 15 <= n <= 28:
                return fmt(proche(n, ICO))
            return o
        return num(val, f)
    if prop == 'line-height':
        m = re.match(r'(\s*)([0-9.]+)(\s*)$', val)
        if m:
            v = float(m.group(2))
            nv = '1.05' if v < 1.2 + 1e-9 else ('1.35' if v < 1.42 else '1.6')
            return m.group(1) + nv + m.group(3)
        return val
    if prop == 'font-weight' and val.strip() == '500':
        return val.replace('500', '600')
    return val


def appliquer(css):
    masque = re.sub(r'/\*.*?\*/', lambda m: ' ' * len(m.group(0)), css, flags=re.S)
    masque = re.sub(r'@keyframes[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}', lambda m: ' ' * len(m.group(0)), masque)
    morceaux, pos, n = [], 0, 0
    for b in re.finditer(r'([^{}]+)\{([^{}]*)\}', masque):
        sel = re.sub(r'\s+', ' ', b.group(1)).strip()
        if sel.startswith('@'):
            continue
        for d in re.finditer(r'([-a-zA-Z]+)\s*:\s*([^;]+)', b.group(2)):
            prop = d.group(1).lower()
            debut, fin = b.start(2) + d.start(2), b.start(2) + d.end(2)
            val = css[debut:fin]
            if '/*' in val:                                # valeur coupée par un commentaire : on n'y touche pas
                continue
            nv = regle(sel, prop, val)
            if nv != val:
                morceaux.append(css[pos:debut]); morceaux.append(nv); pos = fin; n += 1
    morceaux.append(css[pos:])
    return ''.join(morceaux), n


if __name__ == '__main__':
    p = Path(sys.argv[1])
    res, n = appliquer(p.read_text(encoding='utf-8'))
    p.write_text(res, encoding='utf-8')
    print(n, 'valeurs réécrites')
