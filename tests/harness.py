"""Outils communs aux tests : serveur local, page Playwright prête à l'emploi, détecteur de débordement."""
import json, socket, subprocess, sys, time
from pathlib import Path
from playwright.sync_api import sync_playwright  # noqa: F401  (réexporté pour les tests)

REPO = Path(__file__).resolve().parent.parent
DATA = json.load(open(REPO / 'tests' / 'fixture_data.json', encoding='utf-8'))  # jeu d'essai (le data.json de l'app est vide)

# Éléments dont le texte déborde de leur boîte (hors graphiques et SVG) : doit rester vide
OVERFLOW_JS = """()=>{const out=[];document.querySelectorAll('body *').forEach(e=>{const r=e.getBoundingClientRect();if(r.width&&e.offsetParent!==null&&(e.scrollWidth>e.clientWidth+1)&&getComputedStyle(e).overflow==='visible'&&e.tagName!=='svg'&&!e.closest('svg')&&!e.closest('canvas'))out.push(e.tagName+'.'+e.className+' '+e.scrollWidth+'>'+e.clientWidth+' '+(e.textContent||'').trim().slice(0,30))});return {docW:document.documentElement.scrollWidth,vw:innerWidth,out:out.slice(0,10)}}"""


def _free_port():
    with socket.socket() as s:
        s.bind(('127.0.0.1', 0))
        return s.getsockname()[1]


class Srv:
    """Serveur HTTP local sur le dépôt ; renvoie l'URL de base (avec « / » final)."""
    def __enter__(self):
        port = _free_port()
        self.p = subprocess.Popen([sys.executable, '-m', 'http.server', str(port), '--bind', '127.0.0.1'],
                                  cwd=REPO, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        time.sleep(1)
        return f'http://127.0.0.1:{port}/'

    def __exit__(self, *a):
        self.p.terminate()


def newpage(br, w=390, h=844, scheme='light', sw='block', pref=None, seed=True, native_dialogs=True, zoom=1):
    """Page neuve avec les données du jeu d'essai (tests/fixture_data.json) dans localStorage ; pref = thème forcé ('light' / 'dark' / 'auto')."""
    ctx = br.new_context(viewport={'width': w, 'height': h}, device_scale_factor=2, service_workers=sw, color_scheme=scheme)
    # Le script Google Identity (sauvegarde Drive) n'est jamais chargé pour de vrai dans les tests.
    ctx.route('**/accounts.google.com/**', lambda r: r.fulfill(status=200, content_type='application/javascript', body=''))
    pg = ctx.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    # 1.8.34 : l'interface est agrandie selon la largeur de l'écran ; les tests historiques mesurent la mise en page
    # à 100 % (zoom=1). zoom=None : agrandissement réel de l'app (test_agrandissement.py).
    init = '' if zoom is None else 'window.__uiZoom=%s;' % zoom
    if seed:
        init += "if(!localStorage.getItem('h49_state'))localStorage.setItem('h49_state', %s);" % json.dumps(json.dumps(DATA))
    if pref:
        init += "if(!sessionStorage.getItem('seeded')){localStorage.setItem('h49_theme','%s');sessionStorage.setItem('seeded','1')}" % pref
    if native_dialogs:
        # 1.7.29 : les volets de confirmation de l'app (askSheet) passent par les boîtes natives dans les tests
        # historiques, pour garder leurs réponses automatiques ; test_fenetres.py vérifie les vrais volets.
        init += "window.__askHook=function(o){var m=[o.title,o.text].filter(Boolean).join('\\n\\n');if(o.cancel)return confirm(m);alert(m);return true};"
    pg.add_init_script(init)
    return ctx, pg, errs


# ---------------------------------------------------------------------------------------------------------------
# 1.8.87 (co-auteur : Claude) : briques réutilisables, pour ne plus réécrire les mêmes lignes dans chaque test
# et dans les prototypes (tools/captures.py s'en sert aussi).
# ---------------------------------------------------------------------------------------------------------------

# Écrans de l'app : nom court -> JavaScript qui l'ouvre depuis n'importe quel autre écran (jeu d'essai chargé).
_RAZ = ("document.querySelectorAll('.modal-overlay').forEach(m=>m.style.display='none');"
        "if(typeof closeSheet==='function')closeSheet();if(typeof closeFiche==='function')closeFiche();"
        "if(typeof closeBilan==='function')closeBilan();")
ECRANS = {
    'programmes':  "switchTab('programme'); setProgramView('home')",
    'plus':        "switchTab('programme'); setProgramView('home'); openProgramChooser()",
    'editeur':     "switchTab('programme'); editProgram(state.programs[0].id)",
    'ajout':       "switchTab('programme'); editProgram(state.programs[0].id); openAddExercise()",
    'aide':        "switchTab('programme'); openAide()",
    'seance':      "switchTab('programme'); setProgramView('home'); switchTab('seance')",
    'seance-ouverte': "switchTab('programme'); setProgramView('home'); switchTab('seance');"
                      "document.querySelectorAll('.ex-toggle').forEach(b=>{if(b.getAttribute('aria-expanded')!=='true')toggleExercise(b)})",
    'fiche':       "switchTab('seance'); openFiche(document.querySelector('#tab-seance [data-ex], [data-ex]').dataset.ex)",
    'progression': "switchTab('progression')",
    'perimetre':   "switchTab('progression'); openStatsScopeSheet()",
    'historique':  "switchTab('historique')",
    'detail':      "switchTab('historique'); openSessionModal(state.history.length-1)",
    'reglages':    "switchTab('reglages')",
    'fond':        "switchTab('fond')",
    'invitation':  "switchTab('reglages'); openInviteSheet()",
}


def ouvrir(pg, ecran, attente=400):
    """Ouvre un écran de ECRANS (ou exécute le JavaScript donné) après avoir fermé fenêtres et volets."""
    js = ECRANS.get(ecran, ecran)
    pg.evaluate("(()=>{" + _RAZ + js + "})()")
    pg.wait_for_timeout(attente)


def debordements(pg):
    """Liste des problèmes de mise en page de l'écran affiché (vide = rien ne déborde)."""
    o = pg.evaluate(OVERFLOW_JS)
    return o['out'] + (['page plus large que l\'écran (%s > %s px)' % (o['docW'], o['vw'])] if o['docW'] > o['vw'] else [])


class Bilan:
    """Compteur de contrôles commun : b = Bilan(); b.ok('nom', condition, détail); sys.exit(b.fin())."""
    def __init__(self):
        self.res = []

    def ok(self, nom, cond, extra=''):
        self.res.append(bool(cond))
        print(('OK   ' if cond else 'ÉCHEC'), nom, '' if cond else str(extra)[:300], flush=True)
        return bool(cond)

    def fin(self):
        print('\n', sum(self.res), '/', len(self.res), 'contrôles OK')
        return 0 if self.res and all(self.res) else 1


def variantes(largeurs=(390, 360), themes=('light', 'dark')):
    """Les combinaisons habituelles : [(390, 'light'), (390, 'dark'), (360, 'light'), (360, 'dark')]."""
    return [(w, t) for w in largeurs for t in themes]
