"""1.8.31 (co-auteur : Claude) : Réglages › « Soutenir l'app » : carte entre « Inviter quelqu'un » et « Application »,
lien « Offrir un café » vers Buy Me a Coffee (nouvel onglet, aucun script tiers), même allure que le bouton
« Afficher le QR code » ; conditions d'utilisation : article « Propriété » (licence PolyForm Strict).
1.8.35 : bouton jaune Buy Me a Coffee, tasse officielle hébergée dans l'app, fumée animée (3 « S » décalés),
même forme et taille que les autres boutons ; aucune connexion à Buy Me a Coffee avant l'appui ; fumée retirée si
le téléphone demande de réduire les animations."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from harness import Srv, newpage, sync_playwright, OVERFLOW_JS

OK = True
def check(label, cond, detail=''):
    global OK
    print(('  OK  ' if cond else '  ÉCHEC ') + label + ('' if cond else f'  -> {detail}'))
    OK = OK and bool(cond)

STYLE = "(s=>{const c=getComputedStyle(s);return [c.height,c.backgroundColor,c.color,c.borderRadius,c.fontSize,c.fontWeight,c.textDecorationLine,c.boxShadow]})"

with Srv() as base, sync_playwright() as p:
    br = p.chromium.launch()
    for th in ('light', 'dark'):
        for w in (390, 360):
            ctx, pg, errs = newpage(br, w=w, pref=th)
            reqs = []; pg.on('request', lambda r: reqs.append(r.url))
            pg.goto(base + 'index.html'); pg.wait_for_timeout(600)
            pg.evaluate("switchTab('reglages')"); pg.wait_for_timeout(250)
            t = f'[{th} {w}]'
            titles = pg.evaluate("[...document.querySelectorAll('#tab-reglages .card-title')].map(e=>e.textContent)")
            i = titles.index("Inviter quelqu'un") if "Inviter quelqu'un" in titles else -9
            check(f"{t} « Soutenir l'app » entre « Inviter quelqu'un » et « Application »",
                  titles[i + 1:i + 3] == ["Soutenir l'app", 'Application'], titles)
            a = pg.evaluate("(a=>({href:a.href,target:a.target,rel:a.rel,txt:a.textContent.trim(),img:(a.querySelector('.bmc-cup img')||{}).naturalWidth||0,steam:a.querySelectorAll('.bmc-steam svg').length}))(document.getElementById('support-btn'))")
            check(f"{t} lien vers buymeacoffee.com/jeepalexander, nouvel onglet, noopener",
                  a['href'] == 'https://buymeacoffee.com/jeepalexander' and a['target'] == '_blank' and 'noopener' in a['rel'], a)
            check(f"{t} libellé « Offrir un café », tasse officielle chargée, 3 volutes de fumée", a['txt'] == 'Offrir un café' and a['img'] > 0 and a['steam'] == 3, a)
            s1 = pg.evaluate(STYLE + "(document.getElementById('support-btn'))")
            s2 = pg.evaluate(STYLE + "(document.getElementById('invite-btn'))")
            same = [0, 3, 4, 6, 7]  # hauteur, rayon, taille de police, soulignement, ombre
            check(f"{t} même forme que « Afficher le QR code » (hauteur, rayon, police, ombre)", [s1[i] for i in same] == [s2[i] for i in same], (s1, s2))
            check(f"{t} jaune Buy Me a Coffee, texte presque noir, gras", s1[1] == 'rgb(255, 221, 0)' and s1[2] == 'rgb(13, 12, 34)' and s1[5] == '700', s1)
            ali = pg.evaluate("(a=>{const s=a.querySelector('.bmc-cup img').getBoundingClientRect(),r=a.getBoundingClientRect();return Math.abs((s.top+s.bottom)/2-(r.top+r.bottom)/2)})(document.getElementById('support-btn'))")
            check(f"{t} tasse centrée verticalement", ali <= 1, ali)
            an = pg.evaluate("[...document.querySelectorAll('#support-btn .bmc-steam svg')].map(e=>[getComputedStyle(e).animationName,getComputedStyle(e).animationDelay])")
            check(f"{t} fumée animée, volutes décalées (0 / 0,7 / 1,4 s)", [x[0] for x in an] == ['bmc-steam'] * 3 and [x[1] for x in an] == ['0s', '0.7s', '1.4s'], an)
            check(f"{t} aucune connexion à Buy Me a Coffee à l'affichage", not [u for u in reqs if 'buymeacoffee' in u], reqs)
            ov = pg.evaluate(OVERFLOW_JS)
            check(f"{t} aucun débordement", ov['docW'] <= ov['vw'] and not ov['out'], ov)
            check(f"{t} aucun script tiers chargé", not pg.evaluate("[...document.scripts].some(s=>/buymeacoffee/.test(s.src))"))
            check(f"{t} aucune erreur", not errs, errs)
            if w == 390:
                pg.evaluate("document.querySelector('.support-card').scrollIntoView({block:'center'})"); pg.wait_for_timeout(150)
                pg.screenshot(path=f'/tmp/soutien_{th}.png')
            ctx.close()
    ctx, pg, errs = newpage(br)
    pg.emulate_media(reduced_motion='reduce')
    pg.goto(base + 'index.html'); pg.wait_for_timeout(500); pg.evaluate("switchTab('reglages')"); pg.wait_for_timeout(200)
    check("réduire les animations : pas de fumée, tasse affichée",
          pg.evaluate("(a=>getComputedStyle(a.querySelector('.bmc-steam')).display==='none'&&a.querySelector('.bmc-cup img').naturalWidth>0)(document.getElementById('support-btn'))"))
    pg.goto(base + 'conditions.html'); pg.wait_for_timeout(300)
    h2 = pg.evaluate("[...document.querySelectorAll('h2')].map(e=>e.textContent)")
    check("conditions : article « Propriété » avant « Évolutions »", 'Propriété' in h2 and h2.index('Propriété') + 1 == h2.index('Évolutions'), h2)
    txt = pg.inner_text('body')
    check("conditions : PolyForm Strict, date du 16 novembre 2026, soutien facultatif",
          'PolyForm Strict 1.0.0' in txt and '16 novembre 2026' in txt and 'Offrir un café' in txt)
    check("conditions : aucune erreur", not errs, errs)
    br.close()

print('\n' + ('TOUS LES TESTS PASSENT' if OK else 'DES TESTS ÉCHOUENT'))
sys.exit(0 if OK else 1)
