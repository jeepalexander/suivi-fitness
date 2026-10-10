# Changelog - Suivi Fitness

Toutes les modifications notables de ce projet seront documentées dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet respecte [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.1] - 2026-10-10
### 🐛 Corrections
- Correction de l'affichage des séances dans l'historique : les badges affichent maintenant uniquement la lettre (A, B, C) au lieu de "SÉANCE A", "SÉANCE B", etc.

---

## [1.0.0] - 2024-10-11
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
