# 🏋 Mon Carnet de Salle

**Application PWA de suivi d'entraînement en salle de sport** (dépôt `suivi-fitness`)

[![Version](https://img.shields.io/badge/version-1.7.10-blue)](https://github.com/jeepalexander/suivi-fitness)
[![License](https://img.shields.io/badge/license-MIT-green)]

---

## ✨ Fonctionnalités

- ✅ **Programmes sur mesure** : 2 à 6 séances (A à F) qui tournent en boucle, ou **séances libres** ; un seul élément actif, les autres en mémoire (activation, appui long pour modifier)
- ✅ **Catalogue de 86 exercices** (`js/catalogue.js`) : séries, répétitions et repos par défaut issus de la littérature, modes de saisie (kg × réps, poids du corps + lest, réps, durée, cardio durée + distance ou étages)
- ✅ **Suivi des séances** : poids, répétitions, séries, tonnage, durée et historique détaillé
- ✅ **Brouillon de séance** : la saisie en cours est sauvegardée automatiquement et restaurée après un rechargement ou une fermeture de l’application
- ✅ **Progression** : volume total, progression par exercice et poids corporel
- ✅ **Analyse mensuelle** : records, paliers détectés par exercice et progression par séance, par programme ou pour tous les programmes
- ✅ **Gestion automatique du deload** (séances 10 à 12 de chaque cycle), reportable d'une séance
- ✅ **Chronomètre de séance** et **timer de repos** propre à chaque exercice, avec notification sonore
- ✅ **Design « Blanc minimaliste »** : fond uni, peu de couleurs, ombres légères, en thème **clair, sombre ou automatique** (mémorisé sur l’appareil)
- ✅ **Interface mobile optimisée** : en-tête fixe, navigation basse stable et zone de contenu défilante
- ✅ **Mode hors-ligne complet** (PWA avec Service Worker)
- ✅ **Sauvegarde Google Drive automatique** avec versions : un fichier `fitness-backup-AAAA-MM-JJ-HH-MM-SS.json` par sauvegarde dans le dossier « MON CARNET DE SALLE », les 5 plus récentes conservées et restaurables au choix depuis l’Historique
- ✅ **Export / Import** des données au format JSON, avec assainissement des fichiers importés et Content-Security-Policy

---

## 🆕 Version 1.7.0 : programmes sur mesure

- Le programme fixe A/B/C laisse la place à des **programmes créés par l’usager** (2 à 6 séances, A à F) et à des **séances libres**.
- **Migration automatique** au premier lancement : tout l’historique existant est rattaché au programme « Hypertrophie » (les séances A, B, C d’avant), qui devient le programme actif. Nombre de séances, tonnage et records sont vérifiés identiques ; une copie des données d’origine reste sur l’appareil.
- Les temps de repos et réglages par défaut viennent du **catalogue d’exercices** (`js/catalogue.js`), le rameur s’affiche en allure /500 m.
- La sauvegarde Google Drive fonctionne comme avant (un fichier complet, 5 versions) et contient désormais les programmes.

Le détail est dans [CHANGELOG.md](CHANGELOG.md).

---

## 🚀 Installation

1. **En ligne** : ouvrir [l’application](https://jeepalexander.github.io/suivi-fitness) dans un navigateur mobile.
2. **Installation PWA** : ajouter l’application à l’écran d’accueil depuis le navigateur.
3. **En local** : cloner le dépôt puis ouvrir `index.html` dans un navigateur.

---

## 📱 Utilisation

### Programme

- Bouton + : créer un programme (séances A à F en boucle) ou une séance libre (sans récurrence).
- Grande tuile de l’élément actif (noire pour un programme, sable pour une séance libre) : prochaine séance, nombre d’exercices et de séries, détail, bouton de démarrage.
- « En mémoire » : programmes en pause ou nouveaux, séances libres ; « Activer » / « Réactiver » met l’actif en pause.
- Appui long sur une tuile : modifier ou supprimer (l’historique est toujours conservé).
- Restauration des programmes depuis la dernière sauvegarde Google Drive (nouvel appareil).

### Séance

- Charge la prochaine séance de l’élément actif (ou « Aucune séance prévue »).
- Saisie des poids et répétitions pour chaque série (lest pour le poids du corps, durée et distance ou étages pour le cardio) : valeurs suggérées en pâle, série en cours surélevée, série validée en vert.
- Ajout ou suppression de séries par exercice.
- Suggestions basées sur les dernières charges réellement effectuées.
- Chronomètre de séance et timer de repos.
- Sauvegarde automatique du brouillon pendant la séance.
- Seules les séries cochées sont enregistrées ; une confirmation s’affiche si la séance est partielle.

### Progression

- Statistiques du programme actif par défaut, ou d’un autre programme, d’une séance libre, ou de tous.
- Volume total par séance, avec filtre par lettre de séance.
- Suivi cardio par appareil : allure /500 m, allure /km, vitesse km/h ou étages/min.
- Progression par exercice : charge maximale ou volume cumulé.
- Suivi du poids corporel.
- Analyse mensuelle : records, paliers et évolution du tonnage.

### Historique

- Liste des séances groupée par mois, filtrable par programme ; chaque séance indique son programme d’origine.
- Consultation et modification des séances passées.
- Détail d'une séance (programme d'origine), modification ou suppression.
- « Sauvegarder » (fichier JSON) et « Restaurer » : fenêtre de choix entre les 5 dernières sauvegardes Google Drive et un fichier de l’appareil.

### Réglages

- Accès par la roue crantée de l’Historique.
- Choix du thème : clair, sombre ou automatique.
- Fond d’écran : 5 images (Course, Barre, Haltères, Kettlebell, Studio) ou aucun, propre à l’appareil.
- Sauvegarde Google Drive (connexion, état, déconnexion) et vérification des mises à jour.

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
├── wallpapers/         # Fonds d’écran (images + vignettes)
├── CHANGELOG.md        # Historique des versions
├── tests/              # Tests automatiques (voir tests/README.md)
├── js/                 # catalogue.js (exercices), programmes.js (onglet Programme), Chart.js et security.js
├── css/                # Styles complémentaires (polices)
├── fonts/              # Polices embarquées
└── icons/              # Icônes de l’application et des exercices
```

---

## 🔄 Mise à jour de version

À chaque release, incrémenter simultanément :

- `version` dans `manifest.json` ;
- `APP_VERSION` dans `sw.js`.

Le changement du Service Worker permet au navigateur de mettre à jour le cache et donc l’application sur les appareils déjà installés.

---

## 🌙 Prérequis

Aucun. L’application fonctionne avec HTML, CSS et JavaScript natifs.
