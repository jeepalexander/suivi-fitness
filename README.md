# 🏋 Mon Carnet de Salle

**Application PWA de suivi d'entraînement en salle de sport** (dépôt `suivi-fitness`)

[![Version](https://img.shields.io/badge/version-1.7.54-blue)](https://github.com/jeepalexander/suivi-fitness)
[![License](https://img.shields.io/badge/license-MIT-green)]

---

## ✨ Fonctionnalités

- ✅ **Programmes sur mesure** : 2 à 6 séances (A à F) qui tournent en boucle, ou **séances libres** ; un seul élément actif, les autres en mémoire (activation, appui long pour modifier)
- ✅ **Catalogue de 86 exercices** (`js/catalogue.js`) : séries, répétitions et repos par défaut issus de la littérature, modes de saisie (kg × réps, poids du corps + lest, réps, durée, cardio durée + distance ou étages), filtre « Polyarticulaires » (34 exercices)
- ✅ **Suivi des séances** : poids, répétitions, séries, tonnage, durée et historique détaillé
- ✅ **Brouillon de séance** : la saisie en cours est sauvegardée automatiquement et restaurée après un rechargement ou une fermeture de l’application
- ✅ **Progression** : indice de progression, volume total, progression par exercice (charge max avec **1RM estimé** en pointillé, ou répétitions pour le poids du corps) et poids corporel
- ✅ **Analyse mensuelle** : records, paliers détectés par exercice et progression par séance, par programme ou pour tous les programmes
- ✅ **Gestion automatique du deload** (séances 10 à 12 de chaque cycle), reportable d'une séance
- ✅ **Chronomètre de séance** et **timer de repos** propre à chaque exercice, avec notification sonore
- ✅ **Design « Blanc minimaliste »** : peu de couleurs, ombres légères, thème **clair, sombre ou automatique** et **fond d’écran** au choix (mémorisés sur l’appareil) ; fenêtres de l’app dans un seul style (aucune boîte système)
- ✅ **Fin de séance** : fenêtre « Bravo ! » avec le tonnage, l’écart avec la séance précédente et les nouveaux records
- ✅ **Interface mobile optimisée** : en-tête fixe, navigation basse stable et zone de contenu défilante
- ✅ **Mode hors-ligne complet** (PWA avec Service Worker)
- ✅ **Sauvegarde Google Drive automatique** avec versions : un fichier `fitness-backup-AAAA-MM-JJ-HH-MM-SS.json` par sauvegarde dans le dossier « MON CARNET DE SALLE », les 5 plus récentes conservées et restaurables au choix depuis l’Historique
- ✅ **Export / Import** des données au format JSON, avec assainissement des fichiers importés et Content-Security-Policy

---

## 🆕 Depuis la 1.7.0

- **1.7.0** : programmes sur mesure (2 à 6 séances A à F) et séances libres ; migration automatique de l’historique vers le programme « Hypertrophie » (nombre de séances, tonnage et records vérifiés identiques, copie des données d’origine conservée).
- **1.7.2 à 1.7.26** : nom « Mon Carnet de Salle », onglet « Programmes », fenêtre « Restaurer une sauvegarde », dossier Drive « MON CARNET DE SALLE », fonds d’écran et voiles, accueil manuscrit, tuile active compacte, « Inviter quelqu’un » (QR code), pages de confidentialité et de conditions d’utilisation.
- **1.7.27 à 1.7.30** : fenêtre de fin de séance, enregistrement d’un programme dès le premier exercice (résumé « Presque prêt » si des séances sont vides), fenêtres de l’app dans un seul style, tuile de progression en dégradé, bouton pause sur la tuile active.
- **1.7.31 à 1.7.33** : rationalisation de la feuille de style (tailles, rayons, espacements, variables) ; listes de Progression plus lisibles.
- **1.7.34 à 1.7.37** : filtre « Polyarticulaires », 1RM estimé, progression en répétitions pour le poids du corps, restauration locale limitée aux fichiers `.json`, « Inviter quelqu’un » sans partage (QR code et adresse seulement).
- **1.7.38 à 1.7.54** : « Reconnecter maintenant » silencieux ; onglet Séance titré au nom du programme avec l’icône de son type, phrase d’échauffement reformulée et placée avant le premier exercice de force, allure cardio sous la saisie, bouton de pause à côté du compteur de séries ; bilan du mois (post-it le 1er du mois, pop-up, archives dans Progression) ; partage d’un programme par lien ou QR code ; nouvelle icône (disque de 10 kg), agrandie en 1.7.54.

Le détail est dans [CHANGELOG.md](CHANGELOG.md).

---

## 🚀 Installation

1. **En ligne** : ouvrir [l’application](https://jeepalexander.github.io/suivi-fitness) dans un navigateur mobile.
2. **Installation PWA** : ajouter l’application à l’écran d’accueil depuis le navigateur.
3. **En local** : cloner le dépôt puis ouvrir `index.html` dans un navigateur.

---

## 📱 Utilisation

### Programmes

- Bouton + : créer un programme (séances A à F en boucle) ou une séance libre (sans récurrence).
- Message d’accueil manuscrit (« Bonjour, » ou « Bonsoir, » et une phrase selon le contexte).
- Grande tuile de l’élément actif (noire pour un programme, sable pour une séance libre) : prochaine séance, nombre d’exercices et de séries, détail, bouton pause (met en mémoire) et bouton de démarrage.
- « En mémoire » : programmes en pause ou nouveaux, séances libres ; « Activer » / « Réactiver » met l’actif en pause.
- Appui long sur une tuile : modifier ou supprimer (l’historique est toujours conservé).
- Éditeur : « Enregistrer le programme » dès le premier exercice ; si des séances sont vides, un résumé propose de les compléter. Ajout d’exercices avec recherche et filtres (Tous, Polyarticulaires, Cardio, Pectoraux, Dos, Épaules, Jambes, Bras, Abdos).
- Restauration des programmes depuis la dernière sauvegarde Google Drive (nouvel appareil).

### Séance

- Charge la prochaine séance de l’élément actif (ou « Aucune séance prévue »).
- Saisie des poids et répétitions pour chaque série (lest pour le poids du corps, durée et distance ou étages pour le cardio) : valeurs suggérées en pâle, série en cours surélevée, série validée en vert.
- Ajout ou suppression de séries par exercice.
- Suggestions basées sur les dernières charges réellement effectuées.
- Chronomètre de séance et timer de repos.
- Sauvegarde automatique du brouillon pendant la séance.
- Seules les séries cochées sont enregistrées ; une confirmation s’affiche si la séance est partielle.
- Après l’enregistrement, fenêtre de fin de séance : « Bravo ! », tonnage, écart avec la séance précédente, nouveaux records.

### Progression

- Statistiques du programme actif par défaut, ou d’un autre programme, d’une séance libre, ou de tous.
- Volume total par séance, avec filtre par lettre de séance.
- Suivi cardio par appareil : allure /500 m, allure /km, vitesse km/h ou étages/min.
- Progression par exercice : charge maximale avec le 1RM estimé (formule d’Epley, séries de 10 répétitions ou moins) ou volume cumulé ; pour un exercice au poids du corps, répétitions de la meilleure série.
- Suivi du poids corporel.
- Analyse mensuelle : records (charge, lest ou répétitions), paliers et évolution du tonnage.

### Historique

- Liste des séances groupée par mois, filtrable par programme ; chaque séance indique son programme d’origine.
- Consultation et modification des séances passées.
- Détail d'une séance (programme d'origine), modification ou suppression.
- « Sauvegarder » (fichier JSON) et « Restaurer » : fenêtre de choix entre les 5 dernières sauvegardes Google Drive et un fichier de l’appareil.

### Réglages

- Accès par la roue crantée de l’Historique.
- Choix du thème : clair, sombre ou automatique.
- Fond d’écran : 9 images (Course, Barre, Haltères, Kettlebell, Studio, Râtelier, Squat, Poigne, Disques) ou aucun, propre à l’appareil.
- Sauvegarde Google Drive (connexion, état, déconnexion).
- Inviter quelqu’un : QR code vers l’application et son adresse.
- Application : version, mises à jour, liens vers les règles de confidentialité et les conditions d’utilisation.

---

## 🗂 Structure du projet

```text
suivi-fitness/
├── index.html          # Page principale
├── app.js              # Logique de l’application
├── style.css           # Styles et thèmes
├── sw.js               # Service Worker (PWA)
├── manifest.json       # Configuration PWA
├── data.json           # Données par défaut
├── presentation.html, confidentialite.html, conditions.html   # Pages publiques (Google : page d'accueil, confidentialité, conditions)
├── wallpapers/         # Fonds d’écran (images + vignettes)
├── CHANGELOG.md        # Historique des versions
├── tests/              # Tests automatiques (voir tests/README.md)
├── js/                 # catalogue.js (exercices), programmes.js (onglet Programmes), Chart.js, qrcode.js et security.js
├── css/                # Styles complémentaires (polices)
├── fonts/              # Polices embarquées
└── icons/              # Icônes de l’application et des exercices
```

---

## 🔄 Mise à jour de version

À chaque release, incrémenter simultanément :

- `version` dans `manifest.json` ;
- `APP_VERSION` dans `sw.js`.

Le changement du Service Worker permet au navigateur de mettre à jour le cache et donc l’application sur les appareils déjà installés. Tenir aussi `CHANGELOG.md` et ce fichier à jour, et lancer les tests des groupes concernés (`python3 tests/run_tests.py seance`, voir `tests/README.md`) avant chaque déploiement sur `dev`.

---

## 🌙 Prérequis

Aucun. L’application fonctionne avec HTML, CSS et JavaScript natifs.
