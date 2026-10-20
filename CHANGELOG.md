# Changelog - Suivi Fitness

Toutes les modifications notables de ce projet seront documentées dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet respecte [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.1.12] - 2026-10-20
### 🎨 Nouveau design - étape 1/7 : polices et thème clair
- Thème clair indigo (fond clair, cartes blanches, couleur principale indigo) appliqué à toute l'application,
  via des variables CSS (jetons de design) réutilisables pour les étapes suivantes.
- Nouvelles polices embarquées en local (fonctionnent hors-ligne) : Bricolage Grotesque (titres et chiffres)
  et Figtree (texte). Remplace Inter.
- Couleurs des séances A/B/C et des graphiques mises à jour (contraste renforcé).
- Fenêtre de séance, badge de déload, tuiles du programme et barre d'état du téléphone adaptés au thème clair.
- Aucun changement de fonctionnement.

---

## [1.1.11] - 2026-10-18
### 📊 Améliorations
- **Paliers détectés** : la détection se fait désormais **par exercice, sur ses 4 dernières séances réalisées**
  (indépendamment des mois). Il y a palier quand aucune des 3 séances suivantes ne dépasse la plus ancienne des 4,
  ni en charge max ni en volume. La série est prolongée tant que c'est vrai (« depuis le JJ/MM (N séances) »).
  Remplace le calcul basé sur les mois (1.1.10).
- Conseil « palier » supprimé (doublon avec la section « Paliers détectés »).

---

## [1.1.10] - 2026-10-18
### 📊 Améliorations
- **Analyse mensuelle (onglet Graphiques)** :
  - Les « 4 derniers mois » sont désormais des mois calendaires : le dernier bloc est toujours « Ce mois-ci »,
    même sans séance (0 séance, 0,0 T), et un mois sans séance est affiché à 0 au lieu d'être sauté.
    On ne remonte pas avant le premier mois contenant des séances.
  - « Mois dernier vs précédent » se base aussi sur les mois calendaires.
  - Nouvelle section « Paliers détectés » (avec le message « Aucun palier détecté » quand il n'y en a pas).
  - **Détection des paliers corrigée** : l'ancien calcul exigeait un volume mensuel strictement identique d'un mois
    à l'autre (donc ne se déclenchait quasiment jamais). Un exercice est désormais en palier si, sur les 2 derniers
    mois complets, sa charge max ET son volume mensuel ne progressent pas (mois en cours exclu, exercice pratiqué le
    mois dernier). Affichage « sans progression depuis … ».
  - Conseil « palier » : suppression de l'icône ⚠️ en double.

---

## [1.1.9] - 2026-10-18
### 📊 Améliorations
- **Analyse mensuelle (onglet Graphiques)** :
  - Titre de section « 4 derniers mois » ; le bloc du mois en cours s'intitule « Ce mois-ci » (badge « en cours » supprimé).
  - Titre « Records battus ce mois-ci » (records calculés sur le mois calendaire réel).
  - Nouvelle section « Progression » :
    - conservation du calcul mois dernier vs mois précédent ;
    - **indice de progression global** sur l'ensemble des séances, sans tenir compte des mois (moyenne des progressions A, B et C), qui remplace l'ancien calcul basé sur le premier mois complet ;
    - **pourcentage de progression par séance** (A, B, C) : tonnage médian des 3 dernières séances vs les 3 premières, séances de décharge exclues.
  - Le mois en cours est désormais déterminé par la date du jour (et non plus par le dernier mois contenant des séances).

---

## [1.1.8] - 2026-10-18
### 🐛 Corrections
- **Plantage de l'application sur DEV** : `app.js` contenait une erreur de syntaxe (reste de l'ancienne
  fonction `renderProgressAnalysis()` laissé après la nouvelle version, introduit en 1.1.7), ce qui empêchait
  tout le script de se charger. Code orphelin supprimé.

---

## [1.1.7] - 2026-10-18
### 📊 Améliorations
- **Analyse mensuelle de progression** dans l'onglet Graphiques :
  - Résumé mensuel limité aux 4 derniers mois (mois en cours inclus).
  - Badge "en cours" pour le mois actuel.
  - Records battus : uniquement ceux du mois en cours (dernier record par exercice).
  - Paliers détectés : prend en compte à la fois le poids ET le volume (pas de palier si le volume augmente).
  - Statistiques globales : comparaison mois dernier vs mois précédent (exclut le mois en cours).
  - Indice de progression global sur l'ensemble des mois complets.
  - Conseils : pire exercice en palier identifié, déséquilibre A/B/C détecté.

---

## [1.1.6] - 2026-10-18
### 📊 Ajouts
- **Analyse mensuelle de progression** dans l'onglet Graphiques :
  - Résumé mensuel avec tonnage total et nombre de séances par mois.
  - Détection automatique des **records battus** par exercice avec amélioration en kg.
  - Détection des **paliers** (exercices sans progression depuis 2+ mois).
  - Statistiques globales de progression vs mois précédent.
  - Conseils personnalisés basés sur les données (volume, fréquence, paliers).

---

## [1.1.5] - 2026-10-18
### 🐛 Corrections
- Onglet Séance : le bouton « + » d'un exercice ajoute enfin une série. La nouvelle ligne n'était jamais insérée dans la grille (le code ajoutait le blanc situé avant la balise au lieu de la ligne elle-même), si bien que rien ne s'affichait. La série ajoutée reprend les valeurs de la précédente, est numérotée correctement, est comptée dans « Séries » et est bien enregistrée avec la séance.

---

## [1.1.4] - 2026-10-18
### 🪶 Ajouts
- La version de l'application est affichée dans le titre de l'écran d'accueil (« SUIVI FITNESS X.X.X »), lue automatiquement depuis `manifest.json`.
- Onglet Séance : le compteur fixe de séries est remplacé par des boutons « − » / « + » permettant d'ajouter ou de supprimer une série pour chaque exercice (une série minimum ; la nouvelle série reprend les valeurs de la dernière).

### 🐛 Corrections
- Timer de repos : affichage de « PAUSE » à l'état initial (au lieu de « 2:00 »). Après « GO ! », un appui ramène le timer à l'état « PAUSE » sans relancer immédiatement le chrono ; un appui pendant le décompte l'arrête et le réinitialise.
- Historique : marge de défilement ajoutée sous la liste pour que la barre de sauvegarde fixe ne masque plus les dernières séances.

### 🛠️ Notes techniques
- `sw.js` : le nom du cache intègre désormais une constante `APP_VERSION` à incrémenter à chaque release en même temps que `manifest.json` (le navigateur ne réinstalle un service worker que si son fichier change — voir le commentaire dans `sw.js`).

---

## [1.1.3] - 2026-10-18
### 🪶 Ajouts
- Les boutons de sauvegarde et de restauration sont désormais fixés en bas de l'écran (au-dessus de la navigation) dans l'onglet Historique : ils restent accessibles sans faire défiler la liste des séances.

### 🐛 Corrections
- Le fichier de sauvegarde est nommé `AAAA-MM-JJ.json` (au lieu de `sauvegarde_fitness_AAAA-MM-JJ.json`), plus court dans la feuille de partage.
- Libellé du bouton d'export simplifié en « Sauvegarder » ; le bouton d'import devient « Restaurer une sauvegarde » pour lever l'ambiguïté avec les termes « Importer » affichés par les applications cibles (Drive, etc.).

---

## [1.1.2] - 2026-10-18
### 🪶 Ajouts
- Service worker (`sw.js`) : l'application est désormais réellement utilisable hors ligne (mise en cache de l'interface, des scripts, des styles, des icônes et de `data.json`). Le nom du cache est dérivé automatiquement de la version du `manifest.json` : incrémenter la version suffit à forcer la mise à jour du cache chez tous les utilisateurs.

### 🐛 Corrections
- Une sauvegarde locale corrompue ne bloque plus le démarrage : `localStorage` est réinitialisé proprement au lieu de lever une exception non gérée.

### 🧹 Nettoyage
- Suppression du bloc de code mort « vérification Chart.js » (le garde-fou `typeof Chart === 'undefined'` ne pouvait jamais se déclencher depuis que la bibliothèque locale est chargée).

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
