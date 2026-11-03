# Tests automatiques

Ils ouvrent l'application dans un vrai navigateur (Chromium piloté par Playwright), avec les données de `data.json`, et vérifient les comportements qui ont déjà posé problème.

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
| `test_chrono.py` | 15 | Le chrono de repos suit l'exercice ouvert (2:30 / 1:30 / 1:00), reste stable pendant le décompte et sur « GO ! », passe à l'exercice suivant |
| `test_mise_a_jour.py` | 17 | Avec un vrai service worker et une version simulée : avis « version prête » sans rechargement automatique, bouton « Relancer » (saisie conservée), réseau coupé |
| `test_reglages.py` | 17 | Bouton en haut à droite de l'Historique, page Réglages (Apparence + Application), retour, pastille de mise à jour |
| `test_drive_compte.py` | 12 | Google Drive : adresse du compte affichée dans Réglages (API simulée), seconde méthode via le propriétaire du dossier, raison de l'échec affichée, nouvel essai à la réouverture, effacée à la déconnexion, texte brut (aucune injection) |
| `test_drive_renouvellement.py` | 17 | Google Drive : jeton expiré (≈ 1 h) renouvelé tout seul à l'enregistrement d'une séance (sans écran de choix), séances en attente envoyées avec, rien de perdu si Google refuse (message dans Réglages, aucune alerte), 401, déconnexion, première connexion |
| `test_mise_en_page.py` | 12 | À 360 et 390 px, thèmes clair et sombre : aucun débordement sur les 5 pages, noms d'exercice sur une ligne, aucune erreur JavaScript |

## Quand les lancer
Automatiquement : GitHub les exécute à chaque envoi de code et à chaque demande de fusion (`.github/workflows/tests.yml`, onglet **Actions** du dépôt) ; un échec apparaît en rouge sur le commit.

À la main, Avant chaque commit sur `dev` qui touche `app.js`, `index.html` ou `style.css`. Si un test échoue après une modification, le message dit lequel et pourquoi.

## Limites
- Chromium uniquement : pas de test sur Safari ni sur un vrai Android.
- Rien sur le rendu visuel fin (couleurs, ombres) : à regarder à l'œil.
- Ajouter un test : copier la structure d'un fichier existant (`Srv`, `newpage` dans `harness.py`) et l'ajouter à la liste de `run_tests.py`.
