# Suivi Fitness

**Application PWA de suivi d'entrainenement en salle de sport**

[![Version](https://img.shields.io/badge/version-1.1.6-blue)](https://github.com/jeepalexander/suivi-fitness)
[![License](https://img.shields.io/badge/license-MIT-green)]

---

## Fonctionnalités

\u2705 **Programmes d'entrainenement** A/B/C avec 17 exercices personnalisables
\u2705 **Suivi des séances** avec historique de taillé (poids, répétitions, tonnage)
\u2705 **Graphiques de progression** (Volume Total, Progression par Exercice, Poids Corporel)
\u2705 **Analyse mensuelle** avec détection de records et paliers
\u2705 **Gestion automatique du deload** (semaines 10-12)
\u2705 **Chronomètre de repos** (2 min) avec notifications sonores
\u2705 **Mode hors-ligne** complet (PWA avec Service Worker)
\u2705 **Export/Import** des données en JSON
\u2705 **Design responsive** optimisé pour mobile

---

## Installation

1. **En ligne** : Ouvrir [l'application](https://jeepalexander.github.io/suivi-fitness) dans un navigateur mobile
2. **Installation PWA** : Ajouter à l'écran d'accueil depuis votre navigateur
3. **Local** : Clôner le dépôt et ouvrir `index.html` dans un navigateur

---

## Utilisation

### Programme
- Affichage des exercices pour les séances A, B et C
- Indications des charges par défaut

### Séance
- Saisie des poids et répétitions pour chaque exercice
- Chronomètre intégré pour le temps de séance
- Timer de repos entre les séries

### Graphiques
- Visualisation du volume total par séance
- Progression par exercice (charge max ou volume)
- Analyse mensuelle automatique avec détection de records et paliers

### Historique
- Liste de toutes les séances enregistrées
- Export/Import des données

---

## Contribuer

Les contributions sont les bienvenues ! Ouvrir une PR ou un issue pour :
- Rapport de bugs
- Suggestions de fonctionnalités
- Améliorations du code

---

## Structure du projet

```
suivi-fitness/
\u251c\u2500\u2500 index.html          # Page principale
\u251c\u2500\u2500 app.js              # Logique de l'application
\u251c\u2500\u2500 style.css           # Styles
\u251c\u2500\u2500 sw.js               # Service Worker (PWA)
\u251c\u2500\u2500 manifest.json       # Configuration PWA
\u251c\u2500\u2500 data.json           # Données par défaut
\u251c\u2500\u2500 CHANGELOG.md         # Historique des versions
\u2514\u2500\u2500 icons/              # Icônes des exercices
```

---

## Prérequis

Aucun ! L'application fonctionne avec HTML/CSS/JS natif.

---

## License

MIT
