# Changelog - Suivi Fitness

Toutes les modifications notables de ce projet seront documentées dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet respecte [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.1.1] - 2026-10-18
### 🐛 Corrections
- Les graphiques (Volume Total, Progression par Exercice, Poids Corporel) s'affichent de nouveau. Le fichier local `js/chart.umd.min.js`, introduit avec le mode hors-ligne, n'était pas la vraie bibliothèque Chart.js mais un substitut de 5 Ko contenant une erreur de syntaxe : le navigateur le rejetait, `Chart` n'existait pas et tous les graphiques restaient vides. Il est remplacé par la vraie bibliothèque Chart.js 4.4.1 (build UMD officiel, MIT), toujours servie en local pour le mode hors-ligne.

---

## [1.1.0] - 2026-10-18
### 🪶 Ajouts
- Nouveau filtre « A / B / C » sur le graphique « Volume Total Séance » : à chaque appui, il affiche successivement la progression du tonnage de la séance A, puis B, puis C, puis de nouveau A, et ainsi de suite. Le bouton indique la séance affichée (« Séance A », « Séance B »…) et la courbe prend la couleur de cette séance. Depuis un autre filtre, le premier appui démarre sur la séance A.

### 🐛 Corrections
- Les séries non effectuées (0 kg / 0 rép.) ne faussent plus les suggestions de charges : l'application remonte à la dernière séance où la série a réellement été faite, ou reprend la valeur par défaut du programme. Plus de proposition à « 0 kg × 0 rép. » ni de répétitions à 0 sur les Tractions.
- Les dernières charges mémorisées (`lastWeights`) ne retiennent plus les séries non effectuées.
- Le graphique « Progression par Exercice » ignore les séances où l'exercice n'a pas été fait, au lieu de tracer de faux creux à 0, et la charge max ne tient compte que des séries réellement effectuées.

### 🧹 Nettoyage
- Suppression du filtre « 4 dernières séances » (`week`), présent dans le code mais jamais accessible depuis l'interface.

---

## [1.0.3] - 2026-10-17
### 🐛 Corrections
- Modification d'une séance : le compteur de durée n'affiche plus un « 00:00 » trompeur. Il indique désormais la durée enregistrée de la séance (libellé « Durée enregistrée »), ou « N/A » si elle n'était pas renseignée.
- Le chrono ne démarre plus tout seul lors de la saisie d'une série pendant une modification, ce qui évite d'écraser la durée d'origine par « < 1 min ».

---

## [1.0.2] - 2026-10-17
### 🐛 Corrections
- Modification d'une séance : l'originale n'est plus supprimée de l'historique dès l'ouverture du formulaire. Elle n'est remplacée qu'à la validation, ce qui évite toute perte de données si l'on quitte l'application en cours de modification.
- La durée et le statut de déload d'origine sont conservés lors de la modification d'une séance.
- La modification d'une ancienne séance ne change plus les dernières charges utilisées pour les suggestions.
- Correction de la date de la version 1.0.0 dans ce changelog (11/10/2024 → 31/10/2025, date du premier dépôt).

### 🪶 Ajouts
- Bouton « Annuler la modification » dans l'onglet Séance pour abandonner une modification sans rien perdre.

---

## [1.0.1] - 2026-10-10
### 🐛 Corrections
- Correction de l'affichage des séances dans l'historique : les badges affichent maintenant uniquement la lettre (A, B, C) au lieu de "SÉANCE A", "SÉANCE B", etc.

---

## [1.0.0] - 2025-10-31
### 🪶 Ajouts
- Version initiale complète de l'application.
- Programme d'entraînement A/B/C avec 17 exercices personnalisés.
- Suivi des séances avec historique détaillé (poids, répétitions, tonnage).
- Graphiques de progression (Volume Total, Progression par Exercice, Poids Corporel).
- Gestion automatique du **deload** (semaines 10-12).
- Chronomètre de repos (2 min) avec notifications sonores et vibrations.
- Chronomètre de séance intégré.
- Export/Import des données en JSON (pour sauvegarde et partage).
- Design responsive optimisé pour mobile.
- Thème sombre avec couleurs personnalisables.

### 🛠️ Fonctionnalités Techniques
- Stockage local des données via `localStorage`.
- Persistance du timer de repos même si l'onglet est fermé.
- Suggestions intelligentes de poids basées sur l'historique.
- Calcul automatique du tonnage total par séance.

---

## [0.9.0] - 2024-09-15 *(Version de développement)*
### 🪶 Ajouts
- Structure de base HTML/CSS/JS.
- Affichage du programme global (A/B/C).
- Formulaire de saisie des séances.
- Historique des séances.
