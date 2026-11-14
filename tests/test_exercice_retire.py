"""Exercice retiré du catalogue (1.7.76) : « Extension triceps à la poulie » (n° 67) n'est plus proposé ; un programme,
un historique et une dernière charge qui l'utilisaient passent à « Extension triceps » (n° 66) au chargement ;
toutes les icônes du catalogue existent et sont dans le cache du service worker."""
import json, re, sys
from harness import Srv, newpage, sync_playwright, REPO, DATA

res = []


def ok(n, c, extra=''):
    res.append(bool(c)); print(('OK   ' if c else 'FAIL ') + n, '' if c else str(extra)[:200])


cat = (REPO / 'js' / 'catalogue.js').read_text(encoding='utf-8')
sw = (REPO / 'sw.js').read_text(encoding='utf-8')
icons = re.findall(r'"icon": "(icons/[^"]+)"', cat)
ok('catalogue : plus d\'exercice n° 67', '"id": 67,' not in cat)
ok('icônes du catalogue : fichiers présents', all((REPO / i).exists() for i in icons), [i for i in icons if not (REPO / i).exists()])
ok('icônes du catalogue : toutes dans le cache du service worker', all("'./" + i + "'" in sw for i in icons), [i for i in icons if "'./" + i + "'" not in sw])
ok('cache du service worker : aucune icône disparue', all((REPO / f).exists() for f in re.findall(r"'\./(icons/[^']+)'", sw)))

with Srv() as url, sync_playwright() as p:
    br = p.chromium.launch()
    ctx, pg, errs = newpage(br)
    pg.goto(url + 'index.html'); pg.wait_for_timeout(800)
    # État d'avant : un programme et une séance avec l'exercice 67, une dernière charge à son nom
    pg.evaluate("""(()=>{const s=JSON.parse(localStorage.getItem('h49_state'));
      const p=s.programs.find(x=>x.status==='active')||s.programs[0];
      p.sessions[0].exercises.push({exId:67,sets:3});
      s.history.push({date:'2026-11-10T10:00:00.000Z',programId:p.id,programName:p.name,kind:p.kind,sessionKey:p.sessions[0].key,sessionName:p.sessions[0].name,type:p.sessions[0].key,
        exercises:[{name:'Extension triceps à la poulie',exId:67,sets:[{weight:20,reps:12}]}]});
      s.lastWeights=Object.assign(s.lastWeights||{},{'Extension triceps à la poulie':20});
      localStorage.setItem('h49_state',JSON.stringify(s))})()""")
    pg.reload(); pg.wait_for_timeout(900)
    st = pg.evaluate("JSON.parse(JSON.stringify(state))")
    ids = [e['exId'] for p_ in st['programs'] for s_ in p_['sessions'] for e in s_['exercises']]
    ok('programme : n° 67 remplacé par 66', 67 not in ids and 66 in ids, ids)
    names = [ex['name'] for h in st['history'] for ex in h['exercises']]
    ok('historique : séance rattachée à « Extension triceps »', 'Extension triceps à la poulie' not in names and 'Extension triceps' in names)
    ok('historique : identifiant 66', all(ex.get('exId') != 67 for h in st['history'] for ex in h['exercises']))
    ok('dernière charge reprise sous « Extension triceps »', 'Extension triceps à la poulie' not in st['lastWeights'] and 'Extension triceps' in st['lastWeights'], st['lastWeights'])
    ok('exInfo(67) renvoie « Extension triceps »', pg.evaluate("exInfo(67).name") == 'Extension triceps')
    pg.click('#add-program-btn'); pg.wait_for_timeout(200); pg.click('.choose-card.libre'); pg.wait_for_timeout(200)
    pg.click('.ed-add'); pg.wait_for_timeout(250)
    ok('« Ajouter un exercice » : plus d\'« Extension triceps à la poulie »', pg.locator('.add-item[data-id="67"]').count() == 0 and 'Extension triceps à la poulie' not in pg.inner_text('#add-list'))
    broken = pg.evaluate("[...document.images].filter(i=>i.complete&&i.naturalWidth===0&&i.src).map(i=>i.src)")
    ok('aucune image cassée', not broken, broken)
    ok('aucune erreur JavaScript', not errs, errs)
    br.close()

print(f"{sum(res)} / {len(res)} contrôles OK")
sys.exit(0 if all(res) else 1)
