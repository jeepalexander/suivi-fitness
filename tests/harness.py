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


def newpage(br, w=390, h=844, scheme='light', sw='block', pref=None, seed=True, native_dialogs=True):
    """Page neuve avec les données du jeu d'essai (tests/fixture_data.json) dans localStorage ; pref = thème forcé ('light' / 'dark' / 'auto')."""
    ctx = br.new_context(viewport={'width': w, 'height': h}, device_scale_factor=2, service_workers=sw, color_scheme=scheme)
    # Le script Google Identity (sauvegarde Drive) n'est jamais chargé pour de vrai dans les tests.
    ctx.route('**/accounts.google.com/**', lambda r: r.fulfill(status=200, content_type='application/javascript', body=''))
    pg = ctx.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    init = ''
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
