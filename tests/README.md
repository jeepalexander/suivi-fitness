# Tests automatiques

Ils ouvrent l'application dans un vrai navigateur (Chromium piloté par Playwright), avec le jeu d'essai `tests/fixture_data.json` (le `data.json` de l'application est vide), et vérifient les comportements qui ont déjà posé problème.

## Lancer
```bash
pip install playwright --break-system-packages   # une seule fois (ou dans un environnement virtuel)
playwright install chromium                      # une seule fois
python3 tests/run_tests.py                       # tous les tests ; code de sortie 0 = tout est bon
python3 tests/run_tests.py seance                # seulement les tests d'un groupe (plusieurs possibles)
python3 tests/run_tests.py -j 3 seance style     # 3 tests en parallèle (par défaut : 2)
python3 tests/run_tests.py --liste               # les groupes et leurs tests
```
Un test seul : `python3 tests/test_validation.py` ou `python3 tests/run_tests.py rameur`.

**Groupes (1.7.45)** : `seance`, `programmes`, `progression`, `historique`, `reglages`, `drive`, `style`. Avant un déploiement, on lance les groupes touchés par la modification ; la suite complète reste disponible. En parallèle (2 à la fois), un groupe va environ deux fois plus vite (groupe `programmes` : 45 s au lieu de 80 s).

## Ce qui est couvert
| Fichier | Contrôles | Vérifie |
|---|---|---|
| `test_validation.py` | 11 | Seules les séries cochées sont enregistrées ; refus sans coche ou avec valeurs invalides ; confirmation en séance partielle ; modification d'une séance (séries précochées) |
| `test_brouillon.py` | 17 | La saisie en cours survit au rechargement (valeurs, coches, chrono, exercice ouvert) ; brouillon périmé ou piégé ignoré ; « tirer pour rafraîchir » désactivé |
| `test_poids_brouillon.py` | 18 | Le poids corporel saisi (onglet Progression) survit au rechargement ; vidé à l'ajout, à la réinitialisation ; brouillon périmé, négatif, absurde ou piégé ignoré |
| `test_chrono.py` | 15 | Le chrono de repos suit l'exercice ouvert (repos du catalogue : 3:00 / 2:00 / 1:30), reste stable pendant le décompte et sur « GO ! », se lance sur l'exercice suivant |
| `test_mise_a_jour.py` | 17 | Avec un vrai service worker et une version simulée : avis « version prête » sans rechargement automatique, bouton « Relancer » (saisie conservée), réseau coupé |
| `test_reglages.py` | 20 | Bouton en haut à droite de l'Historique, page Réglages (Apparence + Application), retour, pastille de mise à jour |
| `test_drive_compte.py` | 19 | Google Drive : adresse du compte (API simulée), seconde méthode via le dossier, raison de l'échec affichée, Google qui refuse tout accès (403 : message + aide, disparaît une fois réglé), nouvel essai à la réouverture, déconnexion, texte brut (aucune injection) |
| `test_drive_sauvegarde.py` | 40 | Google Drive : sauvegarde complète créée à la première connexion avec tout l'état, une nouvelle version à chaque modification (jamais en double), 5 versions gardées, rien renvoyé si rien n'a changé ; accès expiré (fenêtre silencieuse, en attente) ; sauvegarde Drive plus complète jamais écrasée (conflit, « Remplacer par cet appareil ») ; « Restaurer depuis Drive » (confirmation, assainissement, fichier absent ou illisible) ; erreurs 401 / 403 / 404 ; nettoyage des anciennes versions |
| `test_drive_versions.py` | 29 | Google Drive, versions : nom `fitness-backup-AAAA-MM-JJ-HH-MM-SS.json` (heure locale), format JSON inchangé, 5 plus récentes gardées (corbeille au-delà, ancien `sauvegarde_complete.json` compris, autres fichiers intacts), échec de suppression ou de liste non bloquant et seulement journalisé, liste des 5 dernières sauvegardes et restauration de n'importe laquelle, sauvegarde disparue entre-temps, appareil vidé |
| `test_drive_installee.py` | 20 | Google Drive, application installée (plein écran) : connexion par redirection (paramètres, « state », retour, erreur, mauvais « state »), reconnexion **automatique** à l'enregistrement d'une séance (vrai formulaire : message, redirection, envoi au retour, une seule tentative si Google refuse), navigateur → fenêtre habituelle, jamais connecté → rien |
| `test_drive_android.py` | 21 | Application installée sur Android : la connexion Google s'ouvre dans le navigateur qui l'a installée — Chrome : intent vers le vrai Chrome (repli https) ; Firefox / Samsung Internet : nouvel onglet du même navigateur, jamais Chrome ; jeton repris par l'application plein écran ; onglet bloqué : message sans page blanche ; navigateur et bureau inchangés |
| `test_drive_reconnexion.py` | 10 | « Reconnecter maintenant », accès expiré (Firefox non reconnu comme installé) : renouvellement silencieux comme à l'enregistrement d'une séance (jamais d'écran d'autorisation forcé, aucun onglet) ; échec -> message, l'appui suivant ouvre la connexion complète ; première connexion inchangée |
| `test_programmes.py` | 89 | Programmes sur mesure : migration « Hypertrophie » (tonnage identique, noms du catalogue, copie d'origine), création / activation / pause / « Nouveau », séances A à F, séance libre, appui long, suppression (historique conservé), poids du corps + lest, cardio km/h, durée, rotation, déload reporté, Séance vide, Progression par programme, filtres de l'Historique, restauration de programmes, import d'une sauvegarde 1.6, débordements 390 / 360 px clair et sombre |
| `test_editeur_deplacer.py` | 26 | Éditeur : plus de poignée de glisser-déposer ; menu ⋮ ouvert après Monter / Descendre, qui suit l'exercice ; « Fermer » ; 390 et 360 px |
| `test_accueil.py` | 31 | Accueil Programmes : message manuscrit (Bonjour / Bonsoir, phrase selon le contexte) ; tuile active compacte avec les mêmes informations, pastille de séance et textes alignés, trait pointillé, alignement avec les programmes en mémoire, « Actif » aligné sur « En mémoire » ; 390 et 360 px ; fond Poigne recadré |
| `test_invitation.py` | 23 | Réglages › Inviter quelqu'un : carte, fenêtre avec QR code lisible (décodé), adresse de l'application, un seul bouton « Fermer » (plus de partage depuis la 1.7.37), clair et sombre ; astuce (i) ; « En mémoire » vide centré |
| `test_choix_espace.py` | 16 | Écran du bouton + : rien ne déborde dès 360 × 820, « Recevoir un programme » à 32 px au-dessus du menu, espace réduit sous la flèche retour (clair et sombre) |
| `test_fond_ecran.py` | 20 | Réglages › Fond d'écran : ligne sous Apparence, page avec 18 choix (17 images + « Aucun », vignettes chargées au défilement), application immédiate sur toutes les pages, mémorisé et posé avant le premier affichage, voile sombre en thème sombre, « Aucun », valeur inconnue ignorée, hors des données sauvegardées, images en cache |
| `test_mise_en_page.py` | 12 | À 360 et 390 px, thèmes clair et sombre : aucun débordement sur les 5 pages, noms d'exercice sur une ligne, aucune erreur JavaScript |
| `test_rameur.py` | 28 | Rameur : exercice durée + distance sur une ligne en tête de séance, allure /500 m |
| `test_drive_reset.py` | 10 | Réinitialisation locale : la sauvegarde Google Drive n'est jamais écrasée par des données vides |
| `test_progression_jours.py` | 23 | Progression : bascule « par jour » du graphique global (écarts entre séances, défilement horizontal) |
| `test_supprimer_seance.py` | 13 | Suppression d'une séance : l'historique, les dernières charges et la sauvegarde Google Drive suivent |
| `test_annuler_seance.py` | 14 | Annulation d'une séance en cours : chrono remis à zéro, brouillon supprimé, rien d'enregistré |
| `test_fin_seance.py` | 56 | Séance (1.7.27) : bouton Programmes → page de départ, en-tête allégé, échauffement, noms sur une ligne, fenêtre de fin (« Bravo ! », tonnage, écart, records) ; 390 / 360 px, clair et sombre |
| `test_titre_seance.py` | 36 | Séance (1.7.40-48) : titre = nom du programme précédé de l'icône du type, à la hauteur des autres onglets, séance libre = icône 1× + nom seuls, « Séance » si rien n'est prévu ; bouton de pause à droite des séries et de la durée ; allure cardio sous l'ombre de la ligne en cours ; 390 / 360 px, clair et sombre |
| `test_pastille_1x.py` | 14 | Pastille « 1× » de séance libre lisible partout (Programmes, Progression, choix du périmètre, restauration, création, Séance) en clair et en sombre (1.7.44) |
| `test_contraste.py` | 74 | Lisibilité de 18 écrans en clair et en sombre : textes ≥ 4,5:1 (≥ 3:1 en grand), icônes ≥ 3:1 ; exception : « 1× » doré en sombre (choix du 11/11/2026) (1.7.46) |
| `test_editeur_incomplet.py` | 42 | Éditeur (1.7.28) : « Enregistrer » dès le 1er exercice, volet « Presque prêt » si des séances sont vides ; liens légaux des Réglages |
| `test_fenetres.py` | 53 | Fenêtres (1.7.29) : tous les volets de l'app au lieu des boîtes système, plus aucun `confirm()` / `alert()` dans le code |
| `test_pause_actif.py` | 18 | Bouton pause de la tuile active (1.7.30) : passage « En mémoire », confirmation si une séance est en cours |
| `test_poly_1rm.py` | 48 | Filtre « Polyarticulaires » (34 exercices) et 1RM estimé en pointillé, légende et phrase (1.7.34) |
| `test_poids_du_corps.py` | 39 | Poids du corps (1.7.35) : graphique en répétitions, légende, info-bulle avec le lest, records en répétitions ou en lest ; restauration limitée aux `.json` (1.7.36) |
| `test_presentation.py` | 32 | Page de présentation publique (1.7.47) : nom exact, description, usage de Drive, liens visibles vers la confidentialité et les conditions, thème clair et sombre, 390 / 360 px et ordinateur |
| `test_bilan.py` | 2 × 20 | Bilan du mois (1.7.50) : post-it carré entre l'accueil et « Actif » du 1er au 10, pop-up centré (lignes, un seul bouton OK), archivage qui retire le post-it même après rechargement, mois cliquables et « Tous les bilans » dans Progression, Échap ; clair et sombre |
| `test_partage.py` | 56 | Partage d'un programme (1.7.52) : bouton en bas de l'éditeur, volet lien / QR code, aller-retour du code, codes refusés, ouverture par le lien (« Programme reçu », ajout « Reçu » en mémoire, nom « (2) »), menu + (coller, lien illisible), scanner simulé et arrêt de la caméra, séance libre ; clair et sombre |

## Quand les lancer
Automatiquement : GitHub les exécute à chaque envoi de code et à chaque demande de fusion (`.github/workflows/tests.yml`, onglet **Actions** du dépôt) ; un échec apparaît en rouge sur le commit.

À la main, avant chaque commit sur `dev` qui touche `app.js`, `index.html` ou `style.css`. Si un test échoue après une modification, le message dit lequel et pourquoi.

## Limites
- Chromium uniquement : pas de test sur Safari ni sur un vrai Android (Chrome ou Firefox), où certains comportements du système (fenêtre de partage, choix de fichier, permissions) diffèrent.
- Rien sur le rendu visuel fin (couleurs, ombres) : à regarder à l'œil.
- Ajouter un test : copier la structure d'un fichier existant (`Srv`, `newpage` dans `harness.py`) et l'ajouter à la liste `TESTS` de `run_tests.py`, ainsi qu'au(x) groupe(s) de `GROUPES` qui le concernent.
