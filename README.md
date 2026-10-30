# 🏋 Suivi Fitness

**Application PWA de suivi d'entraînement en salle de sport**

[![Version](https://img.shields.io/badge/version-1.3.8-blue)](https://github.com/jeepalexander/suivi-fitness)
[![License](https://img.shields.io/badge/license-MIT-green)]

---

## ✨ Fonctionnalités

- ✅ **Programmes d'entraînement** A/B/C avec exercices personnalisables et charges par défaut
- ✅ **Suivi des séances** : poids, répétitions, séries, tonnage, durée et historique détaillé
- ✅ **Brouillon de séance** : la saisie en cours est sauvegardée automatiquement et restaurée après un rechargement ou une fermeture de l’application
- ✅ **Graphiques de progression** : volume total, progression par exercice et poids corporel
- ✅ **Analyse mensuelle** : records, paliers détectés par exercice et progression par séance A/B/C
- ✅ **Gestion automatique du deload** (semaines 10-12)
- ✅ **Chronomètre de séance** et **timer de repos** de 2 minutes avec notification sonore
- ✅ **Thème clair, sombre ou automatique**, mémorisé sur l’appareil
- ✅ **Interface mobile optimisée** : en-tête fixe, navigation basse stable et zone de contenu défilante
- ✅ **Mode hors-ligne complet** (PWA avec Service Worker)
- ✅ **Export / Import** des données au format JSON

---

## 🚀 Installation

1. **En ligne** : ouvrir [l’application](https://jeepalexander.github.io/suivi-fitness) dans un navigateur mobile.
2. **Installation PWA** : ajouter l’application à l’écran d’accueil depuis le navigateur.
3. **En local** : cloner le dépôt puis ouvrir `index.html` dans un navigateur.

---

## 📱 Utilisation

### Programme

- Affichage de la prochaine séance A, B ou C.
- Liste des exercices prévus, avec icônes et charges par défaut.
- Indication du deload lorsqu’il est actif.

### Séance

- Saisie des poids et répétitions pour chaque série.
- Ajout ou suppression de séries par exercice.
- Suggestions basées sur les dernières charges réellement effectuées.
- Chronomètre de séance et timer de repos.
- Sauvegarde automatique du brouillon pendant la séance.

### Graphiques

- Volume total par séance, avec filtre A / B / C.
- Progression par exercice : charge maximale ou volume cumulé.
- Suivi du poids corporel.
- Analyse mensuelle : records, paliers et évolution du tonnage.

### Historique

- Liste des séances groupée par mois.
- Consultation et modification des séances passées.
- Sauvegarde et restauration des données en JSON.
- Choix du thème : clair, sombre ou automatique.

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
├── CHANGELOG.md        # Historique des versions
├── js/                 # Bibliothèques locales
├── css/                # Styles complémentaires
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

---

## 📄 Licence

MIT