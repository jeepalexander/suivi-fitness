"""Captures d'écran et prototypes rapides (1.8.87, co-auteur : Claude).

Photographie un ou plusieurs écrans de l'app dans Chromium, en clair et en sombre, à 390 et 360 px, et assemble
une planche par écran (toutes les variantes côte à côte). Signale aussi ce qui déborde et les erreurs JavaScript.

Pour prototyper sans modifier le code : --css et --js injectent un fichier dans la page avant la capture ;
--avant ajoute les captures sans l'injection, pour comparer.

  python3 tools/captures.py --liste                         les écrans connus (tests/harness.py, ECRANS)
  python3 tools/captures.py seance progression              2 écrans, 4 variantes chacun
  python3 tools/captures.py reglages --largeurs 390 --themes clair
  python3 tools/captures.py seance --css proto.css --avant  prototype comparé à l'existant
  python3 tools/captures.py "openBilan('2026-10')"          n'importe quel JavaScript à la place d'un nom d'écran
  python3 tools/captures.py fond --zoom-reel                agrandissement réel du téléphone (110 % dès 412 px)

Les images vont dans /tmp/captures (--sortie pour changer) ; planche : <écran>.png.
"""
import argparse, re, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / 'tests'))
from harness import Srv, newpage, sync_playwright, ECRANS, ouvrir, debordements  # noqa: E402

THEMES = {'clair': 'light', 'sombre': 'dark', 'light': 'light', 'dark': 'dark'}


def nom_fichier(ecran):
    return re.sub(r'[^a-zA-Z0-9_-]+', '_', ecran).strip('_')[:40] or 'ecran'


def planche(images, titres, sortie):
    """Assemble les captures côte à côte avec un titre au-dessus de chacune."""
    from PIL import Image, ImageDraw
    ims = [Image.open(i) for i in images]
    h = max(i.height for i in ims) + 50
    out = Image.new('RGB', (sum(i.width for i in ims) + 30 * (len(ims) - 1), h), 'white')
    d = ImageDraw.Draw(out); x = 0
    for im, t in zip(ims, titres):
        out.paste(im, (x, 50)); d.text((x + 8, 14), t, fill='black', font_size=28); x += im.width + 30
    out.save(sortie)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('ecrans', nargs='*')
    ap.add_argument('--liste', action='store_true')
    ap.add_argument('--largeurs', default='390,360')
    ap.add_argument('--hauteur', type=int, default=844)
    ap.add_argument('--themes', default='clair,sombre')
    ap.add_argument('--css'); ap.add_argument('--js')
    ap.add_argument('--avant', action='store_true', help='ajoute les captures sans --css/--js')
    ap.add_argument('--zoom-reel', action='store_true')
    ap.add_argument('--pleine-page', action='store_true', help='toute la hauteur de la page, pas seulement l\'écran')
    ap.add_argument('--sortie', default='/tmp/captures')
    a = ap.parse_args()
    if a.liste or not a.ecrans:
        for n, js in ECRANS.items():
            print(f'{n:15} {js[:90]}')
        return 0
    out = Path(a.sortie); out.mkdir(parents=True, exist_ok=True)
    css = Path(a.css).read_text(encoding='utf-8') if a.css else ''
    js = Path(a.js).read_text(encoding='utf-8') if a.js else ''
    proto = bool(css or js)
    passes = [False, True] if (proto and a.avant) else [proto]
    largeurs = [int(x) for x in a.largeurs.split(',')]
    themes = [THEMES[t] for t in a.themes.split(',')]
    problemes = 0
    with Srv() as url, sync_playwright() as p:
        br = p.chromium.launch()
        for ecran in a.ecrans:
            images, titres = [], []
            for injecte in passes:
                for w in largeurs:
                    for th in themes:
                        ctx, pg, errs = newpage(br, w=w, h=a.hauteur, scheme=th, pref=th, zoom=None if a.zoom_reel else 1)
                        pg.goto(url); pg.wait_for_timeout(600)
                        ouvrir(pg, ecran, 500)
                        if injecte:
                            if css:
                                pg.add_style_tag(content=css)
                            if js:
                                pg.evaluate('(()=>{' + js + '})()')
                            pg.wait_for_timeout(300)
                        etiquette = f"{'proto ' if injecte else ''}{w} {'clair' if th == 'light' else 'sombre'}"
                        f = out / f"{nom_fichier(ecran)}_{etiquette.replace(' ', '_')}.png"
                        pg.screenshot(path=str(f), full_page=a.pleine_page)
                        images.append(f); titres.append(etiquette)
                        pb = debordements(pg) + errs
                        if pb:
                            problemes += 1
                            print(f'  ! {ecran} [{etiquette}] : ' + ' | '.join(map(str, pb))[:400])
                        ctx.close()
            pl = out / f'{nom_fichier(ecran)}.png'
            planche(images, titres, pl)
            print('planche :', pl)
        br.close()
    print('aucun débordement ni erreur' if not problemes else f'{problemes} capture(s) avec un problème (voir ci-dessus)')
    return 0


if __name__ == '__main__':
    sys.exit(main())
