"""Nouvelle navigation (1.8.95, co-auteur : Claude) : la Séance se range sous Programmes.
Menu Programmes · Progression · Historique · Réglages ; « C'est parti » ouvre la séance et lance son chrono ; la flèche retour
ramène à l'accueil (Programmes reste allumé) ; pendant la séance, le bouton vert de la tuile montre la durée et une flèche
et ramène dans la séance ; modifier une séance de l'Historique : Historique allumé, la flèche y ramène ; mise en mémoire
avec la boîte d'archive. 390 et 360 px, clair et sombre. Captures dans /tmp/navigation."""
import os, re, sys
from harness import Srv, sync_playwright, newpage, ouvrir, debordements, Bilan, variantes

OUT = '/tmp/navigation'
os.makedirs(OUT, exist_ok=True)
actif = "[...document.querySelectorAll('nav button.active')].map(b=>b.id).join()"
b = Bilan()
with Srv() as url, sync_playwright() as p:
    br = p.chromium.launch()
    for w, theme in variantes():
        tag = f'[{w} {theme}] '
        ctx, pg, errs = newpage(br, w, 844, pref=theme, scheme=theme)
        pg.goto(url + 'index.html'); pg.wait_for_timeout(800)
        pg.evaluate("localStorage.removeItem('workout_start_time'); localStorage.removeItem('h49_draft'); goProgramsHome()"); pg.wait_for_timeout(300)
        b.ok(tag + 'menu : Programmes · Progression · Historique · Réglages', pg.evaluate("[...document.querySelectorAll('nav button')].map(b=>b.textContent.trim()).join(' · ')") == 'Programmes · Progression · Historique · Réglages')
        b.ok(tag + 'tuile : « C\'est parti », bouton de mise en mémoire avec la boîte d\'archive',
             pg.inner_text('.prog-tile .btn-start') == "C'est parti" and pg.locator('.prog-tile .prog-pause-btn svg.archive-ico').count() == 1
             and pg.locator('.prog-mem-title svg.archive-ico').count() == 1)
        pg.screenshot(path=f'{OUT}/{w}_{theme}_1_accueil.png')
        pg.click('.prog-tile .btn-start'); pg.wait_for_timeout(1300)
        b.ok(tag + '« C\'est parti » : séance ouverte, chrono lancé, Programmes allumé',
             pg.evaluate("document.body.dataset.tab") == 'seance' and pg.evaluate("localStorage.getItem('workout_start_time')") is not None
             and pg.inner_text('#workout-duration-display') != '00:00' and pg.evaluate(actif) == 'nav-programme', (pg.inner_text('#workout-duration-display'), pg.evaluate(actif)))
        b.ok(tag + 'flèche retour à la place de l\'icône du programme, sans débordement',
             pg.is_visible('#seance-back') and not pg.is_visible('#seance-prog-ico') and not debordements(pg), debordements(pg))
        pg.screenshot(path=f'{OUT}/{w}_{theme}_2_seance.png')
        pg.click('#seance-back'); pg.wait_for_timeout(1200)
        txt = pg.inner_text('.prog-tile .btn-start')
        b.ok(tag + 'retour : accueil, la tuile montre la durée et une flèche (séance qui continue)',
             pg.evaluate("document.body.dataset.tab") == 'programme' and re.fullmatch(r'\d\d:\d\d', txt.strip()) and pg.locator('.prog-tile .btn-start.running svg').count() == 1
             and pg.evaluate("localStorage.getItem('workout_start_time')") is not None, txt)
        t1 = txt.strip(); pg.wait_for_timeout(1500)
        b.ok(tag + 'la durée de la tuile avance', pg.inner_text('.prog-tile .btn-start').strip() != t1)
        b.ok(tag + 'accueil sans débordement avec la durée', not debordements(pg), debordements(pg))
        pg.screenshot(path=f'{OUT}/{w}_{theme}_3_accueil_en_cours.png')
        pg.click('.prog-tile .btn-start'); pg.wait_for_timeout(400)
        b.ok(tag + 'la tuile ramène dans la séance', pg.evaluate("document.body.dataset.tab") == 'seance')
        pg.click('#nav-programme'); pg.wait_for_timeout(300)
        b.ok(tag + 'le bouton Programmes du menu ramène aussi à l\'accueil', pg.evaluate("document.body.dataset.tab") == 'programme' and pg.evaluate("programView") == 'home')
        # Réglages : onglet allumé, pas de « Retour »
        pg.click('#nav-reglages'); pg.wait_for_timeout(300)
        b.ok(tag + 'Réglages : onglet allumé, aucun « Retour »', pg.evaluate(actif) == 'nav-reglages' and not pg.evaluate("!!document.getElementById('settings-back')"))
        pg.screenshot(path=f'{OUT}/{w}_{theme}_4_reglages.png')
        # Modifier une séance de l'Historique
        pg.click('#nav-historique'); pg.wait_for_timeout(300)
        pg.evaluate("openSessionModal(state.history.length - 1)"); pg.wait_for_timeout(300)
        pg.evaluate("editSession()") if pg.evaluate("typeof editSession === 'function'") else pg.click('#modal-edit-btn')
        pg.wait_for_timeout(500)
        b.ok(tag + 'modifier une séance : Historique allumé', pg.evaluate("document.body.dataset.tab") == 'seance' and pg.evaluate(actif) == 'nav-historique', pg.evaluate(actif))
        pg.click('#seance-back'); pg.wait_for_timeout(300)
        b.ok(tag + 'la flèche ramène à l\'Historique', pg.evaluate("document.body.dataset.tab") == 'historique')
        b.ok(tag + 'aucune erreur JavaScript', not errs, errs)
        ctx.close()
    br.close()
sys.exit(b.fin())
