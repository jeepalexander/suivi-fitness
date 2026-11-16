"""1.8.31 (co-auteur : Claude) : Réglages › « Soutenir l'app » : carte entre « Inviter quelqu'un » et « Application »,
lien « Offrir un café » vers Buy Me a Coffee (nouvel onglet, aucun script tiers), même allure que le bouton
« Afficher le QR code » ; conditions d'utilisation : article « Propriété » (licence PolyForm Strict)."""
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
            pg.goto(base + 'index.html'); pg.wait_for_timeout(600)
            pg.evaluate("switchTab('reglages')"); pg.wait_for_timeout(250)
            t = f'[{th} {w}]'
            titles = pg.evaluate("[...document.querySelectorAll('#tab-reglages .card-title')].map(e=>e.textContent)")
            i = titles.index("Inviter quelqu'un") if "Inviter quelqu'un" in titles else -9
            check(f"{t} « Soutenir l'app » entre « Inviter quelqu'un » et « Application »",
                  titles[i + 1:i + 3] == ["Soutenir l'app", 'Application'], titles)
            a = pg.evaluate("(a=>({href:a.href,target:a.target,rel:a.rel,txt:a.textContent.trim(),svg:a.querySelectorAll('svg').length}))(document.getElementById('support-btn'))")
            check(f"{t} lien vers buymeacoffee.com/jeepalexander, nouvel onglet, noopener",
                  a['href'] == 'https://buymeacoffee.com/jeepalexander' and a['target'] == '_blank' and 'noopener' in a['rel'], a)
            check(f"{t} libellé « Offrir un café » avec l'icône tasse", a['txt'] == 'Offrir un café' and a['svg'] == 1, a)
            s1 = pg.evaluate(STYLE + "(document.getElementById('support-btn'))")
            s2 = pg.evaluate(STYLE + "(document.getElementById('invite-btn'))")
            check(f"{t} même allure que « Afficher le QR code » (hauteur, fond, couleur, rayon, police, ombre)", s1 == s2, (s1, s2))
            ali = pg.evaluate("(a=>{const s=a.querySelector('svg').getBoundingClientRect(),r=a.getBoundingClientRect();return Math.abs((s.top+s.bottom)/2-(r.top+r.bottom)/2)})(document.getElementById('support-btn'))")
            check(f"{t} icône centrée verticalement", ali <= 1, ali)
            ov = pg.evaluate(OVERFLOW_JS)
            check(f"{t} aucun débordement", ov['docW'] <= ov['vw'] and not ov['out'], ov)
            check(f"{t} aucun script tiers chargé", not pg.evaluate("[...document.scripts].some(s=>/buymeacoffee/.test(s.src))"))
            check(f"{t} aucune erreur", not errs, errs)
            if w == 390:
                pg.evaluate("document.querySelector('.support-card').scrollIntoView({block:'center'})"); pg.wait_for_timeout(150)
                pg.screenshot(path=f'/tmp/soutien_{th}.png')
            ctx.close()
    ctx, pg, errs = newpage(br)
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
