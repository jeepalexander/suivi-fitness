# \ud83c\udfcb Suivi Fitness

**Application PWA de suivi d'entra\u00eenement en salle de sport**

[![Version](https://img.shields.io/badge/version-1.1.6-blue)](https://github.com/jeepalexander/suivi-fitness)
[![License](https://img.shields.io/badge/license-MIT-green)]

---

## \ud83d\uccc Fonctionnalit\u00e9s

\u2705 **Programmes d'entra\u00eenement** A/B/C avec 17 exercices personnalisables
\u2705 **Suivi des s\u00e9ances** avec historique d\u00e9taill\u00e9 (poids, r\u00e9p\u00e9titions, tonnage)
\u2705 **Graphiques de progression** (Volume Total, Progression par Exercice, Poids Corporel)
\u2705 **Analyse mensuelle** avec d\u00e9tection de records et paliers
\u2705 **Gestion automatique du deload** (semaines 10-12)
\u2705 **Chronom\u00e8tre de repos** (2 min) avec notifications sonores
\u2705 **Mode hors-ligne** complet (PWA avec Service Worker)
\u2705 **Export/Import** des donn\u00e9es en JSON
\u2705 **Design responsive** optimis\u00e9 pour mobile

---

## \ud83d\ude80 Installation

1. **En ligne** : Ouvrir [l'application](https://jeepalexander.github.io/suivi-fitness) dans un navigateur mobile
2. **Installation PWA** : Ajouter \u00e0 l'\u00e9cran d'accueil depuis votre navigateur
3. **Local** : Cl\u00f4ner le d\u00e9p\u00f4t et ouvrir `index.html` dans un navigateur

---

## \ud83d\udcc Utilisation

### Programme
- Affichage des exercices pour les s\u00e9ances A, B et C
- Indications des charges par d\u00e9faut

### S\u00e9ance
- Saisie des poids et r\u00e9p\u00e9titions pour chaque exercice
- Chronom\u00e8tre int\u00e9gr\u00e9 pour le temps de s\u00e9ance
- Timer de repos entre les s\u00e9ries

### Graphiques
- Visualisation du volume total par s\u00e9ance
- Progression par exercice (charge max ou volume)
- Analyse mensuelle automatique avec d\u00e9tection de records et paliers

### Historique
- Liste de toutes les s\u00e9ances enregistr\u00e9es
- Export/Import des donn\u00e9es

---

## \ud83d\ud27 Contribuer

Les contributions sont les bienvenues ! Ouvrir une PR ou un issue pour :
- Rapport de bugs
- Suggestions de fonctionnalit\u00e9s
- Am\u00e9liorations du code

---

## \ud83d\udc68 Structure du projet

```
suivi-fitness/
\u251c\u2500\u2500 index.html          # Page principale
\u251c\u2500\u2500 app.js              # Logique de l'application
\u251c\u2500\u2500 style.css           # Styles
\u251c\u2500\u2500 sw.js               # Service Worker (PWA)
\u251c\u2500\u2500 manifest.json       # Configuration PWA
\u251c\u2500\u2500 data.json           # Donn\u00e9es par d\u00e9faut
\u251c\u2500\u2500 CHANGELOG.md         # Historique des versions
\u2514\u2500\u2500 icons/              # Ic\u00f4nes des exercices
```

---

## \ud83c\udf11 Pr\u00e9requis

Aucun ! L'application fonctionne avec HTML/CSS/JS natif.

---

## \ud83d\udca1 License

MIT