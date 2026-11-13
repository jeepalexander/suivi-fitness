"""1.7.28 : éditeur — « Enregistrer » dès le 1er exercice, résumé si des séances sont vides ;
Réglages — liens vers les règles de confidentialité et les conditions d'utilisation."""
import json, sys
from harness import *

res = []
def ok(n, c, extra=''):
    res.append(bool(c)); print(('OK   ' if c else 'FAIL ') + n, '' if c else extra)

SHOTS = '--captures' in sys.argv

with Srv() as url, sync_playwright() as p:
    br = p.chromium.launch()
    for w, theme in ((390, 'light'), (360, 'light'), (390, 'dark')):
        ctx, pg, errs = newpage(br, w=w, pref=theme)
        pg.goto(url); pg.wait_for_timeout(600)
        tag = f'{w} px {theme} : '
        progs = lambda: len(json.loads(pg.evaluate("localStorage.getItem('h49_state')")).get('programs', []))

        pg.evaluate("switchTab('programme'); openProgramChooser()"); pg.wait_for_timeout(150)
        pg.click('.choose-card:not(.libre)'); pg.wait_for_timeout(200)
        ok(tag + "éditeur vide : pas de bouton Enregistrer, pas de phrase « Ajoute au moins… »",
           not pg.locator('#ed-save').count() and 'Ajoute au moins' not in pg.inner_text('#program-overview'))
        pg.fill('#ed-sname', 'Pectoraux · épaules · triceps')
        pg.evaluate("programDraft.sessions[0].exercises.push({exId: programDraft.sessions[0].exercises.length ? 1 : 39, sets: 3}, {exId: 26, sets: 4}); renderProgramOverview()")
        pg.wait_for_timeout(150)
        ok(tag + "1er exercice choisi : « Enregistrer le programme » visible et actif",
           pg.is_visible('#ed-save') and pg.is_enabled('#ed-save') and pg.inner_text('#ed-save') == 'Enregistrer le programme')
        n0 = progs()
        pg.click('#ed-save'); pg.wait_for_timeout(300)
        sheet = pg.inner_text('#sheet-overlay')
        ok(tag + "B et C vides : « Presque prêt », « 2 séances n'ont encore aucun exercice »",
           'Presque prêt' in sheet and "2 séances n'ont encore aucun exercice" in sheet, sheet)
        rows = pg.evaluate("[...document.querySelectorAll('.miss-row')].map(r=>[r.querySelector('.type-pill').textContent,r.querySelector('.miss-name').textContent,r.querySelector('.miss-sub').textContent,r.classList.contains('empty')])")
        ok(tag + "résumé par séance : A nommée (2 exercices · 7 séries ✓), B et C « Aucun exercice »",
           rows == [['A', 'Pectoraux · épaules · triceps', '2 exercices · 7 séries', False], ['B', 'Séance B', 'Aucun exercice', True], ['C', 'Séance C', 'Aucun exercice', True]]
           and pg.locator('.miss-ok').count() == 1 and pg.locator('.miss-todo').count() == 2, rows)
        ok(tag + "boutons « Compléter la séance B » et « Fermer » ; rien d'enregistré", pg.inner_text('#miss-go') == 'Compléter la séance B'
           and 'Fermer' in sheet and progs() == n0)
        ov = pg.evaluate(OVERFLOW_JS)
        ok(tag + "résumé : rien ne déborde", ov['docW'] <= ov['vw'] and not ov['out'], ov)
        if SHOTS: pg.wait_for_timeout(300); pg.screenshot(path=f'/tmp/claude-0/editeur_incomplet_{w}_{theme}.png')
        pg.click('#sheet-overlay .btn-secondary'); pg.wait_for_timeout(200)
        ok(tag + "« Fermer » : retour à l'éditeur sur la séance A", pg.evaluate("programDraft.idx") == 0 and not pg.evaluate("document.getElementById('sheet-overlay').classList.contains('open')"))
        pg.click('#ed-save'); pg.wait_for_timeout(200); pg.click('#miss-go'); pg.wait_for_timeout(200)
        ok(tag + "« Compléter la séance B » : séance B ouverte", pg.evaluate("programDraft.idx") == 1 and 'Nomme la séance B' in (pg.get_attribute('#ed-sname', 'placeholder') or ''))
        pg.evaluate("programDraft.sessions[1].exercises.push({exId: 86, sets: 2}); renderProgramOverview()"); pg.wait_for_timeout(100)
        pg.click('#ed-save'); pg.wait_for_timeout(200)
        ok(tag + "seule C vide : « La séance C n'a encore aucun exercice », bouton « Compléter la séance C »",
           "La séance C n'a encore aucun exercice" in pg.inner_text('#sheet-overlay') and pg.inner_text('#miss-go') == 'Compléter la séance C')
        pg.click('#miss-go'); pg.wait_for_timeout(150)
        pg.click('.ed-seg-op:not(.plus)'); pg.wait_for_timeout(150)  # retire la séance C (vide)
        pg.click('#ed-save'); pg.wait_for_timeout(300)
        ok(tag + "toutes les séances remplies : enregistrement direct, retour à la page de départ",
           progs() == n0 + 1 and pg.evaluate("programView") == 'home' and not pg.evaluate("document.getElementById('sheet-overlay').classList.contains('open')"))

        # Réglages : liens légaux
        pg.evaluate("switchTab('reglages')"); pg.wait_for_timeout(200)
        links = pg.evaluate("[...document.querySelectorAll('#update-card .legal-links a')].map(a=>[a.textContent,a.getAttribute('href'),a.target])")
        ok(tag + "Réglages › Application : liens « Règles de confidentialité » et « Conditions d'utilisation » (nouvel onglet)",
           links == [['Règles de confidentialité', 'confidentialite.html', '_blank'], ["Conditions d'utilisation", 'conditions.html', '_blank']], links)
        for href in ('confidentialite.html', 'conditions.html'):
            r = pg.request.get(url + href)
            ok(tag + f"{href} servie avec l'app", r.ok and '<title>' in r.text())
        pg.evaluate("document.querySelector('#update-card .legal-links').scrollIntoView({block:'center'})"); pg.wait_for_timeout(200)
        if SHOTS: pg.screenshot(path=f'/tmp/claude-0/reglages_liens_{w}_{theme}.png')
        ok(tag + "aucune erreur JavaScript", not errs, errs)
        ctx.close()
    br.close()

print(f"\n {sum(res)} / {len(res)} contrôles OK")
sys.exit(0 if all(res) else 1)
