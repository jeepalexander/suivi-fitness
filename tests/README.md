# Tests automatiques

Ils ouvrent l'application dans un vrai navigateur (Chromium piloté par Playwright), avec le jeu d'essai `tests/fixture_data.json` (le `data.json` de l'application est vide), et vérifient les comportements qui ont déjà posé problème.

## Lancer
```bash
pip install playwright --break-system-packages   # une seule fois (ou dans un environnement virtuel)
playwright install chromium                      # une seule fois
python3 tests/run_tests.py                       # code de sortie 0 = tout est bon
```
Un test seul : `python3 tests/test_validation.py`.

## Ce qui est couvert
| Fichier | Contrôles | Vérifie |
|---|---|---|
| `test_validation.py` | 11 | Seules les séries cochées sont enregistrées ; refus sans coche ou avec valeurs invalides ; confirmation en séance partielle ; modification d'une séance (séries précochées) |
| `test_brouillon.py` | 17 | La saisie en cours survit au rechargement (valeurs, coches, chrono, exercice ouvert) ; brouillon périmé ou piégé ignoré ; « tirer pour rafraîchir » désactivé |
| `test_poids_brouillon.py` | 18 | Le poids corporel saisi (onglet Graphiques) survit au rechargement ; vidé à l'ajout, à la réinitialisation ; brouillon périmé, négatif, absurde ou piégé ignoré |
| `test_chrono.py` | 15 | Le chrono de repos suit l'exercice ouvert (repos du catalogue : 3:00 / 2:00 / 1:30), reste stable pendant le décompte et sur « GO ! », se lance sur l'exercice suivant |
| `test_mise_a_jour.py` | 17 | Avec un vrai service worker et une version simulée : avis « version prête » sans rechargement automatique, bouton « Relancer » (saisie conservée), réseau coupé |
| `test_reglages.py` | 20 | Bouton en haut à droite de l'Historique, page Réglages (Apparence + Application), retour, pastille de mise à jour |
| `test_drive_compte.py` | 19 | Google Drive : adresse du compte (API simulée), seconde méthode via le dossier, raison de l'échec affichée, Google qui refuse tout accès (403 : message + aide, disparaît une fois réglé), nouvel essai à la réouverture, déconnexion, texte brut (aucune injection) |
| `test_drive_sauvegarde.py` | 40 | Google Drive : sauvegarde complète créée à la première connexion avec tout l'état, une nouvelle version à chaque modification (jamais en double), 5 versions gardées, rien renvoyé si rien n'a changé ; accès expiré (fenêtre silencieuse, en attente) ; sauvegarde Drive plus complète jamais écrasée (conflit, « Remplacer par cet appareil ») ; « Restaurer depuis Drive » (confirmation, assainissement, fichier absent ou illisible) ; erreurs 401 / 403 / 404 ; nettoyage des anciennes versions |
| `test_drive_versions.py` | 29 | Google Drive, versions : nom `fitness-backup-AAAA-MM-JJ-HH-MM-SS.json` (heure locale), format JSON inchangé, 5 plus récentes gardées (corbeille au-delà, ancien `sauvegarde_complete.json` compris, autres fichiers intacts), échec de suppression ou de liste non bloquant et seulement journalisé, liste des 5 dernières sauvegardes et restauration de n'importe laquelle, sauvegarde disparue entre-temps, appareil vidé |
| `test_drive_installee.py` | 20 | Google Drive, application installée (plein écran) : connexion par redirection (paramètres, « state », retour, erreur, mauvais « state »), reconnexion **automatique** à l'enregistrement d'une séance (vrai formulaire : message, redirection, envoi au retour, une seule tentative si Google refuse), navigateur → fenêtre habituelle, jamais connecté → rien |
| `test_drive_android.py` | 14 | Application installée sur Android : la connexion Google s'ouvre dans le navigateur qui l'a installée — Chrome : intent vers le vrai Chrome (repli https) ; Firefox / Samsung Internet : nouvel onglet du même navigateur, jamais Chrome ; jeton repris par l'application plein écran ; onglet bloqué : message sans page blanche ; navigateur et bureau inchangés |
| `test_programmes.py` | 84 | Programmes sur mesure : migration « Hypertrophie » (tonnage identique, noms du catalogue, copie d'origine), création / activation / pause / « Nouveau », séances A à F, séance libre, appui long, suppression (historique conservé), poids du corps + lest, cardio km/h, durée, rotation, déload reporté, Séance vide, Progression par programme, filtres de l'Historique, restauration de programmes, import d'une sauvegarde 1.6, débordements 390 / 360 px clair et sombre |
| `test_fond_ecran.py` | 20 | Réglages › Fond d'écran : ligne sous Apparence, page avec 6 choix, application immédiate sur toutes les pages, mémorisé et posé avant le premier affichage, voile sombre en thème sombre, « Aucun », valeur inconnue ignorée, hors des données sauvegardées, images en cache |
| `test_mise_en_page.py` | 12 | À 360 et 390 px, thèmes clair et sombre : aucun débordement sur les 5 pages, noms d'exercice sur une ligne, aucune erreur JavaScript |

## Quand les lancer
Automatiquement : GitHub les exécute à chaque envoi de code et à chaque demande de fusion (`.github/workflows/tests.yml`, onglet **Actions** du dépôt) ; un échec apparaît en rouge sur le commit.

À la main, Avant chaque commit sur `dev` qui touche `app.js`, `index.html` ou `style.css`. Si un test échoue après une modification, le message dit lequel et pourquoi.

## Limites
- Chromium uniquement : pas de test sur Safari ni sur un vrai Android.
- Rien sur le rendu visuel fin (couleurs, ombres) : à regarder à l'œil.
- Ajouter un test : copier la structure d'un fichier existant (`Srv`, `newpage` dans `harness.py`) et l'ajouter à la liste de `run_tests.py`.
