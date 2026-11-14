# Changelog - Suivi Fitness

Toutes les modifications notables de ce projet seront documentées dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet respecte [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.7.80] - 2026-11-14
### ✍️ Premier lancement : « Bienvenue ! » à la place de « Bonjour, » (co-auteur : Claude)
- Sur l'écran vide du tout premier lancement, l'accueil manuscrit dit seulement « Bienvenue ! » (à la taille de « Bonjour, »), à gauche de la flèche. Le reste de l'accueil ne change pas. Maquette : planche 1.
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.7.80.

---

## [1.7.79] - 2026-11-14
### 📱 Plein écran jusqu'en haut avec Chrome (co-auteur : Claude)
- **Correction** : l'application installée depuis Chrome (Android) laissait une bande vide en haut de l'écran, à hauteur de la caméra, alors que celle de Firefox montait jusqu'au bord. Chrome réserve cette zone tant que la page ne dit pas qu'elle sait s'y afficher : `viewport-fit=cover` ajouté à `index.html`.
- L'en-tête et ses boutons (+, Réglages, Retour) descendent de la hauteur de cette zone (`--safe-top`) : les titres restent exactement où ils étaient, rien ne passe sous la caméra. Le fond de l'app (blanc, sombre ou fond d'écran) remplit désormais la bande.
- Aucun changement dans un navigateur ni sur un écran sans encoche (`--safe-top` vaut 0).
- `test_plein_ecran.py` (groupe `style`) : balise présente, en-tête inchangé sans encoche, décalé d'exactement la zone réservée avec encoche (390 et 360 px, clair et sombre).
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.7.79.

---

## [1.7.78] - 2026-11-14
### ✍️ Accueil manuscrit : date locale, variantes, bilan du mois, « Semaine de déload », Bienvenue (co-auteur : Claude)
- **Correction** : la date du jour vient du téléphone (heure locale) et non plus de l'heure UTC. Entre minuit et 1 h (2 h en été), l'app se croyait encore la veille : « Belle séance aujourd'hui » pouvait viser la séance de la veille, et le compte des 10 jours avait un jour d'écart.
- **Variantes** : chaque situation a plusieurs phrases ; une variante est tirée par jour et reste la même toute la journée. Ordre : aucun programme actif, séance faite aujourd'hui, **bilan du mois disponible** (nouveau, du 1er au 10 tant que le post-it est là : « Ton bilan d'octobre t'attend ! »…), retour après 10 jours, **semaine de déload** (« Semaine de déload : … »), première séance, sinon motivation (8 phrases).
- **Premier lancement** (aucun programme, aucune séance) : « Bonjour, Bienvenue ! » en manuscrit à gauche de la flèche. Un usager qui a supprimé tous ses programmes mais garde un historique ne le voit pas. Maquette : planche 1.
- `test_accueil.py` : variantes, phrase stable dans la journée, date locale à 0 h 30, bilan, Bienvenue (390 et 360 px).
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.7.78.

---

## [1.7.77] - 2026-11-14
### 🔎 Pastilles d'icônes d'exercices +10 % (co-auteur : Claude)
- Illustration et rond gris agrandis de 10 % par rapport à la 1.7.76, dans tous les onglets : détail du programme 77 → 84,7 px ; « Ajouter un exercice », éditeur de programme et lignes de Séance 60,5 → 66,55 px.
- +15 % a été essayé puis écarté : à 360 px de large, « Développé militaire » ouvert dans Séance aurait été coupé (« … »).
- Aucun débordement à 390 et 360 px, clair et sombre, et les noms d'exercice ouverts tiennent sur une ligne (vérifié dans Chromium).
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.7.77.

---

## [1.7.76] - 2026-11-14
### 🖼️ Icônes corrigées et complétées, « Extension triceps à la poulie » retiré (co-auteur : Claude)
- **Nouvelles icônes** : Relevés de jambes suspendu, Burpees, Ski trainer, Vélo elliptique et Stair climber (recadrés sur les jambes).
- **Icônes remplacées** : Soulevé de terre (photo « SDT classique »), Rameur (nouvelle photo, zoom moyen), Montées de genoux (nouvelle photo, zoom fort).
- **Corrections** : icônes de Fentes et Fentes marchées inversées ; l'icône du Développé incliné, qui montrait des haltères, passe au **Développé incliné haltères** (fichier `incline_dumbbell_press.png`) — le Développé incliné à la barre reprend l'icône générique ; la Rotation russe reprend l'icône générique en attendant une photo avec les pieds visibles.
- **« Extension triceps à la poulie » (n° 67) retiré du catalogue**, déjà couvert par « Extension triceps » : au chargement, programmes, historique et dernière charge qui l'utilisaient passent à « Extension triceps » (n° 66) ; un programme partagé qui le contient s'ouvre aussi sur « Extension triceps ».
- Nouveau test `test_exercice_retire.py` (groupe `programmes`, 12 contrôles) : rattachement, liste d'ajout, icônes présentes et en cache. `test_poly_1rm.py` : 11 exercices de Bras.
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.7.76.

---

## [1.7.75] - 2026-11-14
### 🏷️ Accueil sans titre, Historique indépendant des programmes (co-auteur : Claude)
- **Accueil Programmes** : plus de titre « Programmes » (« MON CARNET DE SALLE » et le bouton + restent) ; l'accueil manuscrit remonte. « Actif » devient **« Programme actif »**, ou **« Séance libre active »** pour une séance libre.
- **Historique** : le titre de la page donne le **nombre de toutes les séances** (« 33 séances ») et le sous-titre le mois de la première (« depuis juillet 2026 »). L'Historique est **indépendant des programmes** : les filtres par programme sont retirés, toutes les séances sont toujours listées ; chaque ligne garde le nom de son programme.
- Maquette : planches 12, 15 et 27. Tests adaptés (`test_programmes.py`, `test_accueil.py`, `test_reglages.py`, `test_supprimer_seance.py`, `test_titre_seance.py`).
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.7.75.

---

## [1.7.74] - 2026-11-14
### 📐 Séance : nom du programme et nom de la séance alignés (co-auteur : Claude)
- 12 px entre l'icône de 44 px et le titre, partout : le nom du programme (16 px jusqu'ici) commence maintenant au même endroit que le nom de la séance. La page Fond d'écran (flèche retour puis titre) suit la même règle, comme l'éditeur. Maquette : planches 22 et 23.
- Nouveau test `test_alignement_titres.py` (groupe `seance`, 16 contrôles).
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.7.74.

---

## [1.7.73] - 2026-11-14
### 📐 Accueil Programmes : moins d'espace sous l'astuce (co-auteur : Claude)
- 16 px au lieu de 32 entre « Astuce : Reste appuyé… » et le menu, seulement sur l'accueil Programmes. Le contenu laisse ainsi du jeu : l'écran ne doit plus bouger sous le doigt quand un programme est actif. Les autres onglets, l'éditeur et l'écran du + ne changent pas. Maquette : planche 12.
- `test_ecart_memoire.py` vérifie les 16 px et l'absence de défilement (20 contrôles).
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.7.73.

---

## [1.7.72] - 2026-11-14
### 🖼️ 33 nouvelles icônes d'exercices, pastilles plus grandes (co-auteur : Claude)
- **33 nouvelles icônes** validées sur la planche de contrôle : Squat, Squat haltères, Squat goblet, Squat bulgare, Hack squat, Fentes, Montées sur banc, Soulevé de terre roumain et jambes tendues, Hip thrust, Hip thrust haltères, Leg extension unilatéral, Leg curl assis, Abductions et Adductions machine, Mollets assis, Rowing barre, Développé haltères, Pompes, Pull-over poulie, Développé haltères assis, Élévations frontales, Curl marteau, Curl concentration, Extension triceps à la poulie, Extension triceps en arrière, Relevé de buste, Relevés de jambes au sol, Planche, Rotation russe, Corde à sauter, Vélo, Montées de genoux. PNG 512 × 512 détourés, même cadrage que les icônes existantes ; ajoutées au catalogue (champ `icon`) et au cache du service worker.
- **12 icônes d'origine agrandies** de 11 à 12 % (le maximum sans rien couper) pour remplir la pastille comme les nouvelles : Tractions, Mollets, Oiseau, Fentes marchées, Leg extension, Leg curl, Élévations latérales, Rameur, Dips, Presse à cuisses, Développé militaire, Tirage vertical. Les 7 autres sont inchangées.
- **Pastilles d'icônes +10 %** (image et rond gris) dans tous les onglets : détail du programme 70 → 77 px ; ajout d'exercice, éditeur de programme et Séance 55 → 60,5 px. Aucun débordement à 390 et 360 px, clair et sombre (vérifié dans Chromium).
- 34 exercices gardent l'icône générique en attendant leur image (liste dans le projet : `ICONES_MANQUANTES.md`).
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.7.72.

---

## [1.7.71] - 2026-11-14
### 🧹 Plus de marges qui s'additionnent (co-auteur : Claude)
- Tuile active ouverte : les 28 px entre la tuile et son détail (16 + 12 jusqu'ici) tiennent en une seule marge ; la 1.7.70 les avait ramenés par erreur à 12 px.
- Quatre écarts faits de deux marges additionnées passent à une seule marge, **sans rien changer à l'écran** (positions identiques au pixel, vérifiées dans Chromium) : écran du + (24 px au-dessus de « Recevoir un programme »), Inviter quelqu'un et QR code d'un programme (20 px au-dessus du QR, 12 px au-dessus de « Fermer »), Recevoir un programme (24 px sous le champ).
- Nouveau test `test_marges_doublees.py` (groupe `programmes`, 30 contrôles) : il échoue dès que deux marges voisines s'additionnent quelque part (onglets, écran du +, éditeur, bilans, volets). `test_ecart_memoire.py` vérifie aussi l'écart tuile / détail.
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.7.71.

---

## [1.7.70] - 2026-11-14
### 📐 Écart réduit entre la tuile active et « En mémoire » (co-auteur : Claude)
- Détail fermé, la tuile active gardait une ancienne marge de 16 px qui s'ajoutait aux 28 px prévus avant « En mémoire » (44 px en tout). Il ne reste que l'espacement standard `section-gap` (28 px), comme lorsque le détail est ouvert. Maquette : planche 12 alignée sur 28 px.
- Nouveau test `test_ecart_memoire.py` (groupe `programmes`, 12 contrôles).
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.7.70.

---

## [1.7.69] - 2026-11-13
### 🏆 Une seule règle de record : bilans, trophées et « Records battus ce mois-ci » (co-auteur : Claude)
- La liste « Records battus ce mois-ci » suit maintenant la même règle que les bilans et le graphique Trophées, donc le chiffre du mois en cours est identique partout : un exercice **déjà fait avant** dont la meilleure charge, le meilleur **temps** (cardio, exercices au temps) ou la meilleure série au **poids du corps** (plus de lest, ou plus de répétitions au même lest) bat tout l'historique précédent.
- Nouveautés qui en découlent : les records de **cardio** apparaissent dans la liste (« 12:00 », « +2:00 ») ; les records au **poids du corps** comptent aussi dans les **bilans** et les **trophées** (les bilans passés peuvent donc augmenter si tu fais des tractions, dips…) ; un tout premier passage n'est plus listé comme record.
- Règle partagée : `bilanRecordsIn` (`js/bilan.js`), utilisée par `bilanRecordCount`, le graphique et la liste. Aucun changement de style.
- `test_trophees.py` : liste alignée, cardio en temps (46 contrôles) ; `test_poids_du_corps.py` inchangé et vert.
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.7.69.

---

## [1.7.68] - 2026-11-13
### 🏆 Trophées : mêmes chiffres que les bilans, depuis le début (co-auteur : Claude)
- Chaque mois du graphique compte désormais les records **exactement comme le bilan du mois** (« x records » dans Historique › Bilans) : meilleure charge — ou meilleur temps pour le cardio et les exercices au temps — qui bat tout l'historique précédent, et seulement pour un exercice **déjà fait avant** (un premier passage n'est plus un trophée). Règle partagée : `bilanRecordCountIn` (`js/bilan.js`), sur le périmètre choisi en haut de Progression.
- Le graphique part du **premier mois du périmètre** au lieu des 6 derniers mois ; sous le total : « depuis juillet 2026 » pour un programme, « tous programmes confondus » pour « Tous les programmes ».
- Au-delà de la largeur de l'écran, la rangée de mois **défile** horizontalement et s'ouvre sur le mois en cours (aucun changement de style).
- `test_trophees.py` : chaque mois comparé au bilan, libellé, historique de 14 mois (41 contrôles).
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.7.68.

---

## [1.7.67] - 2026-11-13
### 🏆 Carte « Trophées » dans Progression (co-auteur : Claude)
- Nouvelle carte avant « Records battus ce mois-ci » : le **total de trophées** des 6 derniers mois en grand, « en 6 mois » en petit gris (même présentation que « Suivi cardio » et « Poids corporel »), puis un graphique en **barres fines dorées** terminées par un **trophée**, le **nombre au-dessus** et les **mois en abscisse**. Un mois sans record : petit rond gris et « 0 ». Aucun détail, rien à toucher.
- Un trophée = un record battu, compté comme « Records battus ce mois-ci » (`recordsForMonth`, extrait de `analyzeMonthlyProgress`) ; même périmètre que le reste de la page (programme choisi en haut ou « Tous les programmes »).
- Nouvelles couleurs : `--trophy` #E0A800 (sombre #F2C14E) et `--trophy-stem` (même or à 35 %).
- Maquette : planche 25d. Nouveau test `test_trophees.py` (groupe `progression`, 390 et 360 px, clair et sombre, données construites).
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.7.67.

---

## [1.7.66] - 2026-11-13
### 🧪 Pastille « TEST » dans la version de test (co-auteur : Claude)
- Dans la version de test (`…/suivi-fitness/dev/`), une pastille « TEST » s'affiche à côté de « MON CARNET DE SALLE », sur tous les écrans (`markTestVersion`, `.test-pill`, couleurs de la pastille Déload : `warn`, `warn-tint`, `warn-border`). Jamais en production.
- Maquette : planche 37. Tests : `test_prod_test.py` (pastille présente en test, absente en production).
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.7.66.

---

## [1.7.65] - 2026-11-13
### 🔒 Script de connexion Google chargé seulement quand le Drive sert (co-auteur : Claude)
- Google Safe Browsing signale `jeepalexander.github.io/suivi-fitness/` comme « pages trompeuses », sans URL précise : probable faux positif d'une petite app en `github.io` qui charge la connexion Google sur chaque page. Le script Google Identity Services n'est plus dans `index.html` : `loadGoogleIdentity()` le charge à la demande — au lancement si le Drive est déjà connecté (navigateur), à l'ouverture de Réglages, de « Sauvegarder », de « Restaurer » et de la restauration de programmes, et à l'appui sur « Se connecter » / au renouvellement silencieux. Un visiteur qui n'utilise pas le Drive (ou un robot d'exploration) ne charge rien de Google.
- Déconnexion : le script est chargé si besoin pour révoquer l'accès. Application installée : inchangé (connexion par redirection).
- Aucun changement visible. Tests : `test_prod_test.py` (aucun script Google au lancement sans Drive, préchargé à l'ouverture de Réglages, chargé au lancement si le Drive est connecté). Suite complète : tous les tests passent.
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.7.65.

---

## [1.7.64] - 2026-11-13
### 🧪 Production et version de test publiées séparément (co-auteur : Claude)
- **Publication** (`.github/workflows/pages.yml`, `tools/assembler_site.py`) : `main` à l'adresse actuelle `…/suivi-fitness/` (production, personnes invitées) et `dev` dans `…/suivi-fitness/dev/` (version de test), publiées ensemble par GitHub Actions. Un envoi sur `dev` relance la publication (`dev-pages.yml`). Les tests et outils ne sont pas publiés. Réglage nécessaire : Settings › Pages › Source = « GitHub Actions ».
- **Icône de test** : dans `dev/`, le manifeste devient « Mon Carnet de Salle (TEST) » / « Carnet TEST » pour distinguer les deux icônes sur l'écran d'accueil.
- **Liens** : depuis la version de test, « Inviter quelqu'un » et « Partager le programme » mènent toujours à la production (`appShareUrl`, `isTestVersion`).
- **Service workers** : les deux versions sont sur le même domaine. Chaque version nomme ses caches d'après son dossier (`suivi-fitness:/suivi-fitness/:1.7.64`, `…/dev/:…`) et ne supprime que les siens ; la production ignore les fichiers de `dev/`. Les anciens caches (`suivi-fitness-1.7.x`) sont supprimés.
- Les deux versions partagent les données du téléphone (même domaine).
- Branche `backup` : copie figée de `main` (1.7.62) au 13/11/2026.
- Nouveau test `test_prod_test.py` (groupe `reglages`, 14 contrôles : site assemblé, liens, manifestes, caches séparés).
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.7.64.

---

## [1.7.63] - 2026-11-13
### 🐛 La reconnexion à Google ne fait plus disparaître la fenêtre de fin de séance (co-auteur : Claude)
- Après une nouvelle séance, la sauvegarde sur le Drive — et, si l'accès a expiré, la reconnexion à Google (fenêtre Google dans le navigateur, redirection dans l'application installée) — attend maintenant le « OK » de la fenêtre « Bravo ! » (`finishDialogOk`). Avant, elle partait à l'enregistrement et la fenêtre de fin disparaissait avant d'avoir été lue.
- Message à l'enregistrement : « Google Drive : accès expiré, reconnexion automatique après « OK » ».
- Accès valide : rien ne change (l'envoi part en fond, sans quitter l'application). Modification d'une ancienne séance : envoi immédiat comme avant (pas de fenêtre de fin). Application fermée sans « OK » : la séance est enregistrée sur le téléphone et la sauvegarde part plus tard, comme toute sauvegarde en attente.
- Tests : `test_drive_installee.py` et `test_drive_sauvegarde.py` vérifient qu'aucune reconnexion n'a lieu avant « OK ».
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.7.63.

---

## [1.7.62] - 2026-11-13
### 💾 Sauvegarder sur le Drive : reconnexion forcée si l'accès a expiré (co-auteur : Claude)
- Dans l'application installée, quand l'accès Google a expiré, « Sauvegarder › Sur Google Drive » lance tout de suite la reconnexion, comme l'enregistrement d'une séance (message « Connexion Google expirée : reconnexion en cours… »). La demande est gardée 10 minutes (`h49_drive_force_pending`) : au retour de Google, une nouvelle version part sur le Drive, même sans changement, l'Historique s'affiche avec le message « Sauvegarde envoyée sur Google Drive : … ». Elle n'est envoyée qu'une fois.
- Contrairement à la reconnexion automatique après une séance, elle n'attend pas 2 minutes entre deux essais : c'est un appui explicite.
- Dans le navigateur, le renouvellement silencieux reste tenté d'abord ; s'il échoue, le message renvoie vers Réglages comme avant.
- Tests : `test_sauvegarde_fichier.py` (60 contrôles, dont l'application installée : reconnexion, envoi au retour, pas de doublon).
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.7.62.

---

## [1.7.61] - 2026-11-13
### 💾 « Sauvegarder » demande où enregistrer (co-auteur : Claude)
- **Volet « Sauvegarder »** (Historique), dans le style de « Restaurer » : « Sur Google Drive » (nouvelle version maintenant, dans « MON CARNET DE SALLE ») ou « Sur ce téléphone » (fichier dans le dossier Téléchargements), puis « Sauvegarder sur le Drive » / « Télécharger le fichier » et « Annuler ». Le Drive est choisi par défaut s'il est connecté ; jamais connecté : seul « Sur ce téléphone » est proposé, avec « Se connecter à Google Drive ».
- **Sur Google Drive** : une nouvelle version est envoyée tout de suite, même sans changement depuis le dernier envoi (`syncDriveBackup({ force: true })`), avec un message qui donne son nom. Accès Google expiré (renouvellement silencieux impossible), conflit avec une sauvegarde plus complète ou envoi impossible : rien n'est envoyé et le message le dit. Les 5 versions les plus récentes restent gardées.
- **Sur ce téléphone** : même nom que sur le Drive, `fitness-backup-AAAA-MM-JJ-HH-MM-SS.json` (au lieu de `mon-carnet-de-salle-AAAA-MM-JJ.json`). Message de confirmation et repli sur le téléchargement inchangés (1.7.60).
- Guillemets insécables dans les messages de sauvegarde.
- Maquette : nouvelle planche 27c. Tests : `test_sauvegarde_fichier.py` (44 contrôles : sans Drive, Drive connecté, accès expiré ; clair et sombre).
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.7.61.

---

## [1.7.60] - 2026-11-13
### 🐛 « Sauvegarder » ne montrait rien (co-auteur : Claude)
- **Cause** : l'app passe d'abord par le menu de partage du téléphone, mais Chrome sur Android refuse de partager un fichier `.json`. Elle repassait alors en téléchargement, sans aucun signe à l'écran.
- **Correctif** : après le téléchargement, un message le confirme : « Sauvegarde téléchargée : « mon-carnet-de-salle-AAAA-MM-JJ.json », dans le dossier Téléchargements du téléphone. Pour la remettre : Historique › Restaurer › Choisir un fichier… ». Un partage refusé ou impossible télécharge aussi le fichier ; un partage fermé par l'usager ne fait rien de plus.
- Nom du fichier : `mon-carnet-de-salle-AAAA-MM-JJ.json` (avant : la date seule), plus facile à retrouver.
- Nouveau test `test_sauvegarde_fichier.py` (groupe `historique`, clair et sombre).
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.7.60.

---

## [1.7.59] - 2026-11-13
### ✨ Le même exercice plusieurs fois dans une séance (co-auteur : Claude)
- **Éditeur** : dans « Ajouter un exercice », un exercice déjà présent n'est plus grisé. Sa mention verte devient « Déjà dans la séance · ajouter encore » et il se coche comme les autres ; il est ajouté en fin de séance, puis se déplace avec Monter / Descendre. Valable aussi pour le cardio (rameur au début et à la fin, par exemple). Pas de numéro sur les passages.
- **Séance** : chaque passage est une ligne à part, avec ses séries, ses coches, ses charges et le chrono, à sa place dans l'ordre. Le brouillon (rechargement) garde chaque passage séparément.
- **Charges proposées** : chaque passage reprend les charges du même passage la dernière fois (le 2ᵉ passage celles du 2ᵉ). Un passage jamais fait reprend celles du premier. « Dernière fois · … » suit la même règle.
- **Historique** : la séance garde les passages séparés, dans l'ordre ; le rang du passage est enregistré (`occ`, absent pour le premier, donc les anciennes séances et sauvegardes restent lisibles). Modifier une ancienne séance rouvre chaque passage avec ses séries.
- **Progression, records, paliers, bilan du mois** : les passages d'un même exercice sont additionnés (séries mises bout à bout, tonnage additionné, charge max = la meilleure) ; un seul record par exercice en fin de séance.
- **Programme** : le nombre de séries fait est reporté sur le bon passage. Le partage par lien ou QR code transporte les doublons.
- Maquette : planches 6 et 7. Nouveau test `test_doublons.py` (groupes `seance` et `programmes`, clair et sombre). Suite complète : 37 tests OK.
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.7.59.

---

## [1.7.58] - 2026-11-13
### 📐 Écran du bouton + : moins d'espace en haut (co-auteur : Claude)
- **Cause trouvée** : l'écran « Choisis comment t'entraîner » était plus haut que l'écran du téléphone (environ 794 px pour 785 disponibles à 390 × 844). La page débordait, l'espace élastique qui cale les tuiles en bas était à son minimum, et « Recevoir un programme » finissait contre le menu tant qu'on ne faisait pas défiler.
- **Correction** : 28 px de moins en haut. « Choisis comment t'entraîner » remonte juste sous la flèche retour (4 px au lieu de 20) et l'espace élastique n'a plus de minimum sur cet écran. Tout tient sans défiler dès 360 × 820 ; « Recevoir un programme » retrouve son écart d'origine, 32 px au-dessus du menu.
- **Retiré** : la marge de 24 px ajoutée sous « Recevoir un programme » et la hauteur « visible » (`--app-h`) de la 1.7.57, qui n'étaient pas la cause. Le corps de page reprend `100dvh`.
- Tests : `test_choix_espace.py` remplace `test_hauteur_visible.py` (groupe `style`).
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.7.58.

---

## [1.7.57] - 2026-11-13
### 📐 Hauteur visible en plein écran ; « Recevoir un programme » plus haut (co-auteur : Claude)
- **Hauteur de la page** : elle suit maintenant la hauteur réellement visible (`--app-h`, mesurée par `window.innerHeight` au lancement, à chaque changement de taille et à la rotation), au lieu de `100dvh`. En plein écran, Chrome Android peut compter dans `100dvh` la bande des gestes d'Android : le bas de la page passait alors sous l'écran et les blocs calés en bas se rapprochaient du menu. `100dvh` reste la valeur de secours.
- **Écran du bouton +** : « Recevoir un programme » remonte de 24 px ; il est à 56 px au-dessus du menu du bas (32 px avant), sur tous les écrans.
- Maquette : planche 4. Nouveau test `test_hauteur_visible.py` (groupe `style` : hauteur suivie à 390, 360 et 412 px, clair et sombre, après redimensionnement ; écart de 56 px).
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.7.57.

---

## [1.7.56] - 2026-11-13
### 🖼️ Fonds d'écran : Studio et Poulie retirés, Traction déplacé (co-auteur : Claude)
- Les fonds Studio et Poulie sont retirés (images supprimées du dépôt et du cache). Il reste 17 images, plus « Aucun ».
- Traction se place juste après Salle blanche.
- Si Studio ou Poulie était choisi, l'app revient au fond blanc (« Aucun ») : une valeur inconnue est ignorée, comme avant.
- Maquette : planche 29b. Tests : `test_fond_ecran.py` (18 choix, 17 vignettes, 34 images en cache).
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.7.56.

---

## [1.7.55] - 2026-11-13
### 🖼️ 10 nouveaux fonds d'écran (co-auteur : Claude)
- Réglages › Fond d'écran propose 19 images (plus « Aucun ») : Cuivre, Géométrie, Salle blanche, Poulie, Cordes, Fente, Rack, Silhouette, Escaliers et Traction s'ajoutent après Disques.
- Images au format des fonds existants (1000 px de large au plus, vignettes de 240 px), cadrées sur leur sujet, avec les mêmes voiles en clair et en sombre. Elles sont mises en cache par le service worker (environ 1,4 Mo de plus, disponibles hors connexion).
- La rangée de vignettes se charge au fil du défilement, comme avant.
- Maquette : planche 29b. Tests : `test_fond_ecran.py` (20 choix, les 19 vignettes chargées en faisant défiler la rangée, 38 images en cache).
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.7.55.

---

## [1.7.54] - 2026-11-13
### 🖼️ Icône de l'application agrandie (co-auteur : Claude)
- Le disque de 10 kg occupe 8 % de place en plus dans l'icône : la marge transparente autour est réduite, rien n'est coupé (ressort compris).
- Concerne `icons/icon-192.png`, `icons/icon-512.png` (écran d'accueil Android, écran de lancement, onglet, page de présentation) et `icons/apple-touch-icon.png` (iPhone, toujours sur fond blanc). Recadrées depuis `icons/source/icon-source-1600.png`.
- Maquette : planche 36.
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.7.54.

---

## [1.7.53] - 2026-11-12
### 🖼️ Nouvelle icône de l'application (co-auteur : Claude)
- Nouvelle icône « disque de 10 kg » pour l'écran d'accueil, l'onglet du navigateur et la page de présentation.
- Manifest : deux tailles, `icons/icon-192.png` et `icons/icon-512.png` (fond transparent ; Chrome Android la pose sur un disque blanc).
- iPhone : `icons/apple-touch-icon.png` (180 px) posée sur fond blanc, car iOS remplirait la transparence en noir.
- Image source en 1600 × 1600 conservée dans `icons/source/icon-source-1600.png` (non mise en cache).
- L'ancienne `icons/app-icon.png` est retirée ; favicon ajouté à `index.html` ; les trois icônes sont mises en cache par le service worker.
- Tests : `test_presentation.py` suit le nouveau fichier.
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.7.53.

---

## [1.7.52] - 2026-11-12
### ✨ Partager et recevoir un programme (co-auteur : Claude)
- **Partager** : en bas de l'éditeur d'un programme ou d'une séance libre déjà enregistré, « Partager le programme » (au-dessus de « Supprimer »). Le volet propose « Envoyer le lien » (menu de partage du téléphone : WhatsApp, SMS, mail…) ou « Afficher le QR code » (à scanner face à face).
- **Ce qui part** : le nom, le type, les séances, les exercices et leur nombre de séries, rien d'autre (ni historique, ni charges, ni Google Drive). Tout tient dans le lien (environ 250 caractères, compressé), sans serveur.
- **Recevoir** : le lien ou le QR ouvre l'app sur la fenêtre « Programme reçu » (séances avec leurs pastilles, exercices et séries), avec « Ajouter à mes programmes » ou « Annuler ». Le programme rejoint « En mémoire » avec la mention « Reçu » jusqu'à sa première activation, sans changer le programme actif (il devient actif s'il n'y en a pas). Un nom déjà pris devient « Hypertrophie (2) ».
- **Menu + → « Recevoir un programme »** : coller le lien reçu (il peut être au milieu d'un message), ou « Scanner un QR code » avec la caméra arrière dans l'app (lecteur intégré à Chrome ; bouton caché si le navigateur n'en a pas). La caméra s'arrête dès la lecture ou à l'annulation.
- **Sécurité** : le contenu reçu est vérifié (exercices du catalogue seulement, 1 à 10 séries, noms nettoyés, taille limitée) ; sinon « Lien illisible : ce lien ne contient pas de programme valide ».
- Nouveau fichier `js/partage.js` (mis en cache par le service worker). Tests : `test_partage.py` (56 contrôles, clair et sombre ; caméra et lecteur simulés).
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.7.52.

---

## [1.7.51] - 2026-11-12
### ✨ Bilan du mois : même périmètre que Progression (co-auteur : Claude)
- Ouvert depuis Progression (mois de « 4 derniers mois » ou « Tous les bilans »), le bilan ne compte que les séances du programme choisi en haut de l'écran (ou de tous) : les chiffres concordent avec les barres. Le sous-titre le dit : « Hypertrophie · comparé à septembre. »
- « Tous les bilans » rappelle le programme sous son titre et ne liste que ses mois.
- Le post-it de l'écran Programmes garde le bilan de toutes les séances du mois.
- Design system en ligne : jetons `postit` et `postit-ink`, fiche « Bilan du mois ».
- Tests : `test_bilan.py` (périmètre depuis Progression et depuis le post-it).
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.7.51.

---

## [1.7.50] - 2026-11-12
### ✨ Bilan du mois (co-auteur : Claude)
- **Post-it sur l'écran Programmes** : du 1er au 10 du mois, s'il y a eu au moins une séance le mois précédent, un post-it jaune carré (100 px, incliné, écriture manuscrite) se colle à droite entre le message d'accueil et « Actif » : « Ton bilan du mois de septembre ». Pas de notification du téléphone.
- **Pop-up centré** (style de la fenêtre d'une séance de l'Historique), comparé au mois précédent : séances, tonnage (+ %), régularité (séances par semaine), temps d'entraînement, cardio (distance et temps, s'il y en a), nombre de records battus. Un seul bouton « OK » : il ferme le bilan, l'archive et retire le post-it (aussi après un rechargement). Échap ou un toucher à côté font de même.
- **Archives dans Progression** : dans « 4 derniers mois », chaque mois terminé avec des séances porte un chevron et ouvre son bilan. Sous les barres, le lien « Tous les bilans » ouvre la liste de tous les mois terminés (« 13 séances · 9 records », « aucun record »).
- Le bilan couvre toutes les séances du mois, tous programmes confondus. Les records suivent la règle de la fenêtre de fin de séance (charge, ou durée pour le cardio et les exercices au temps), comparés à tout l'historique antérieur.
- Nouvelles couleurs `--postit` (#FFE58A) et `--postit-ink` (#3A2E0A), identiques en clair et en sombre. Nouveau fichier `js/bilan.js` (mis en cache par le service worker).
- Maquette : planches 35 (Bilan du mois) et 25 (Progression). Tests : `test_bilan.py` (post-it, pop-up, archivage, fin au 10 du mois, Progression, clair et sombre).
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.7.50.

---

## [1.7.49] - 2026-11-11
### 🧪 Version de test : mise à jour sans changement visible (co-auteur : Claude)
- Seul le numéro de version change. Sert à vérifier si la mise à jour de l'application (rechargement) fait perdre le plein écran dans Firefox pour Android.
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.7.49.

---

## [1.7.48] - 2026-11-11
### ✨ Séance : bouton PAUSE ADAPTATIVE à côté du compteur de séries (co-auteur : Claude)
- Le bouton PAUSE ADAPTATIVE (et le chrono vert une fois lancé) quitte le haut à droite pour se placer à droite de « 0 / 22 séries », juste au-dessus de la barre de progression : plus près de la saisie et du pouce.
- « Durée : 00:00 » passe sous le compteur de séries, en 14 px ; les deux lignes tiennent dans la hauteur du bouton (44 px) et se centrent sur lui. Un toucher sur la durée met toujours le chrono de séance en pause.
- Le titre de la page Séance n'a plus besoin de descendre sous le bouton : il reste à sa hauteur normale, quel que soit le nom ; l'en-tête gagne environ 16 px.
- Tests : `test_titre_seance.py` (place du bouton, séries et durée dans sa hauteur, titre non décalé).
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.7.48.

---

## [1.7.47] - 2026-11-11
### 🌐 Page de présentation publique pour Google (co-auteur : Claude)
- Nouvelle page `presentation.html` (planche 34 de la maquette), hors de l'application : nom exact « Mon Carnet de Salle », à quoi sert l'app, bouton « Ouvrir l'application », ce que fait l'app, usage de Google Drive (un seul dossier, portée `drive.file`), liens visibles vers les règles de confidentialité et les conditions d'utilisation, contact et résumé en anglais. Même style que les pages légales, clair ou sombre selon le téléphone.
- Elle sert de page d'accueil déclarée dans Google Auth Platform › Branding : Google demande une page publique qui présente l'app et renvoie vers ses règles de confidentialité.
- L'application elle-même ne change pas. Test test_presentation.py (390 / 360 px, ordinateur, clair et sombre).
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.7.47.

---

## [1.7.46] - 2026-11-11
### 🧪 Test de contraste automatique (co-auteur : Claude)
- Nouveau `tests/test_contraste.py` (groupe `style`) : sur 18 écrans, en clair et en sombre, chaque texte visible doit avoir un contraste d'au moins 4,5:1 (3:1 en grand) et chaque icône d'au moins 3:1. Exception validée : le « 1× » doré des pastilles non remplies en sombre. Non mesurés : la tuile de progression (dégradé) et les valeurs suggérées pâles.
- Aucun changement visible dans l'app.
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.7.46.

---

## [1.7.45] - 2026-11-11
### 🎨 Bouton de suppression lisible en sombre, tests par groupes (co-auteur : Claude)
- Mode sombre : le bouton rouge des volets de suppression (« Supprimer la séance », « Retirer la séance »…) prend le même rouge qu'en mode clair ; le texte blanc devient lisible (contraste 2,5 → 5,5). Nouveau jeton `--danger-strong` ; le rose `--danger` reste pour l'icône poubelle et les valeurs négatives.
- Tests : `run_tests.py` accepte des groupes par onglet (`seance`, `programmes`, `progression`, `historique`, `reglages`, `drive`, `style`), des fichiers précis et `-j N` pour lancer N tests en parallèle (2 par défaut) ; `--liste` affiche les groupes. `test_fenetres.py` vérifie la lisibilité du bouton de suppression.
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.7.45.

---

## [1.7.44] - 2026-11-11
### 🎨 Pastille « 1× » lisible partout (co-auteur : Claude)
- Progression, bouton du haut (mode clair) : le « 1× » sur la pastille sable passe en brun (il était blanc, illisible).
- Mode sombre, fenêtres « Voir les statistiques de » et « Restaurer un programme » : le « 1× » passe en doré, comme sur la page Séance depuis la 1.7.43.
- Tests : `test_pastille_1x.py` (nouveau) mesure le contraste de chaque « 1× » visible sur 6 écrans, en clair et en sombre.
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.7.44.

---

## [1.7.43] - 2026-11-11
### 🎨 Séance libre : « 1× » lisible en mode sombre (co-auteur : Claude)
- Page Séance, mode sombre : le « 1× » de la pastille séance libre prend la couleur dorée de ses pointillés (il était brun foncé sur fond sombre). Rien ne change en mode clair ni dans l'onglet Programmes.
- Tests : `test_titre_seance.py` (couleur du 1× en clair et en sombre) ; `test_brouillon.py` ne lève plus d'erreur quand la même boîte de dialogue est acceptée deux fois.
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.7.43.

---

## [1.7.42] - 2026-11-11
### ✨ Séance : phrase d'échauffement juste avant le premier exercice de force, titre à hauteur constante (co-auteur : Claude)
- La phrase « Ajoute 2 séries légères au premier exercice de force pour t'échauffer » se place à chaque affichage juste au-dessus du premier exercice de force, après le cardio éventuel (rameur, tapis…).
- Elle s'affiche désormais aussi quand la séance ne commence pas par le rameur (avant : seulement si le rameur était en tête) ; cachée si la séance n'a que du cardio.
- Titre de la page Séance à la même hauteur pour un programme et une séance libre, quel que soit le nom : il passe toujours sous le bouton PAUSE ADAPTATIVE, et la pastille 1× prend la taille de l'icône de cycle (44 px).
- Tests mis à jour (`test_fin_seance.py`, `test_titre_seance.py`, `test_brouillon.py`) ; `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.7.42.

---

## [1.7.41] - 2026-11-11
### ✨ Onglet Séance : icône du type de programme devant le titre (co-auteur : Claude)
- Devant le nom du programme : l'icône de cycle (pastille sombre) ; devant le nom d'une séance libre : la pastille 1× en pointillés.
- Séance libre : plus de ligne pastille 1× + nom sous le titre, seulement l'icône et le nom (la ligne « Modification · date » reste en modification d'une ancienne séance).
- Phrase d'échauffement : « au premier exercice de force » (au lieu de « à la première séance de force »).
- Tests mis à jour (`test_titre_seance.py`, `test_programmes.py`, `test_fin_seance.py`) ; `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.7.41.

---

## [1.7.40] - 2026-11-11
### ✨ Onglet Séance : titre dynamique, échauffement reformulé, allure cardio sous la saisie (co-auteur : Claude)
- Titre de la page Séance : nom du programme actif ou de la séance libre (au lieu de « Séance », qui reste quand rien n'est prévu). Un nom long passe sous le bouton PAUSE ADAPTATIVE et peut tenir sur deux lignes.
- Phrase d'échauffement : « (i) Ajoute 2 séries légères à la première séance de force (poids) pour t'échauffer (flamme) ».
- Cardio : le cadre Allure / Vitesse remonte juste sous la ligne de saisie en cours et passe sous son ombre ; il reprend sa place quand la ligne n'est plus en cours.
- Tests : `test_titre_seance.py` (nouveau), `test_fin_seance.py` et `test_programmes.py` mis à jour.
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.7.40.

---

## [1.7.39] - 2026-11-11
### 🔄 « Reconnecter maintenant » : plus d'onglet Firefox ni de page blanche (co-auteur : Claude)
- Accès Google expiré : le bouton suit désormais le même mécanisme que l'enregistrement d'une séance, qui se reconnectait déjà sans intervention : renouvellement silencieux avec le compte déjà connu. Avant, il forçait l'écran d'autorisation Google (« consent »), qui s'ouvrait dans un onglet Firefox, redemandait les autorisations et finissait sur une page blanche (Firefox ne se déclare pas toujours comme application installée).
- Si Google exige quand même une confirmation : message « touche à nouveau », et l'appui suivant ouvre la connexion complète. Première connexion et application reconnue comme installée : inchangées.
- Test : `test_drive_reconnexion.py` (reproduit le problème sans le correctif).
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.7.39.

---

## [1.7.38] - 2026-11-11
### 📝 Documentation remise en cohérence (co-auteur : Claude)
- **README.md rétabli** : il avait été vidé par erreur en 1.7.13. Il reprend la présentation complète, mise à jour pour la 1.7.38 (fin de séance, bouton pause, polyarticulaires, 1RM estimé, poids du corps en répétitions, fonds d'écran, inviter quelqu'un, liens légaux, résumé des versions depuis la 1.7.0).
- **tests/README.md** : les 28 fichiers lancés par `run_tests.py` sont décrits, avec leur nombre de contrôles (11 manquaient) ; descriptions d'invitation et de fond d'écran mises à jour.
- Aucun changement de l'application elle-même. `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.7.38.

---


## [1.7.37] - 2026-11-11
### 🔗 Inviter quelqu'un : QR code seul (co-auteur : Claude)
- Le bouton « Partager le lien » est retiré de la fenêtre « Inviter quelqu'un » : il reste le QR code, l'adresse de l'application écrite dessous et « Fermer ». Sous Firefox pour Android, un partage abandonné restait en attente et s'affichait ensuite à la place des menus de choix (exercice du graphique) et du choix de fichier.
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.7.37.

---

## [1.7.36] - 2026-11-11
### 🔧 Restauration locale : plus de demande d'accès à la caméra et au micro (co-auteur : Claude)
- Le champ de choix de fichier de « Restaurer › Choisir un fichier… » n'accepte plus que les sauvegardes `.json`. Sans type précisé, Firefox pour Android proposait aussi photo, vidéo et son, et demandait donc l'accès à la caméra et au micro ; un refus empêchait le sélecteur de s'ouvrir.
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.7.36.

---

## [1.7.35] - 2026-11-11
### 🤸 Exercices au poids du corps : progression en répétitions (co-auteur : Claude)
- **Progression par exercice** : pour un exercice au poids du corps (tractions, dips, dips triceps, pompes lestées, relevés de jambes suspendu), le bouton « Charge max » devient **« Répétitions »** et la courbe suit la **meilleure série** de chaque séance (plus fort lest, puis le plus de répétitions), au lieu d'une charge qui ne bougeait pas. Graduations en nombres entiers, à partir de 0.
- **Info-bulle** : « 12 rép. », avec le lest quand il y en a un (« 12 rép. · PDC +5 kg »).
- **Légende** : « Meilleure série 15 rép. · Record 22 rép. » (sans 1RM estimé), et une phrase qui explique la lecture en répétitions.
- **Records du mois** : un exercice au poids du corps bat son record avec plus de lest (« Tractions · PDC +5 kg · +5 kg ») ou plus de répétitions au même lest (« Dips · 22 rép. · +8 rép. »). Les anciennes séances sans lest comptent comme poids du corps seul.
- « Volume cumulé » inchangé : pesée du jour + lest.
- Test test_poids_du_corps.py (390/360 px, clair/sombre) ; test_poly_1rm.py ajusté à la nouvelle légende.
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.7.35.

---

## [1.7.34] - 2026-11-10
### 🏋️ Filtre « Polyarticulaires » et 1RM estimé (co-auteur : Claude)
- **Ajouter un exercice : puce « Polyarticulaires »** juste après « Tous ». Elle liste les 34 exercices qui font bouger au moins deux articulations (définition de l'ACSM 2009, revues de Gentil 2017 et Paoli 2017) : squats, presse, fentes, montées sur banc, soulevé de terre, tirages, tractions, rowings, tirage facial, développés, dips, pompes, tirage menton, dips triceps. Le soulevé de terre roumain, le soulevé de terre jambes tendues et les hip thrusts restent monoarticulaires (mouvement de hanche seule). Cardio et abdos ne sont pas concernés. Catalogue v1.2 : champ `poly`.
- **Progression par exercice : 1RM estimé en pointillé** sur le graphique « Charge max », formule d'Epley (charge × (1 + reps / 30)) appliquée à la meilleure série de 10 répétitions ou moins de chaque séance. Seulement pour les exercices saisis en kg × répétitions (pas pour les exercices au poids du corps, le gainage ni le cardio), pas en « Volume cumulé ».
- **Légende sous le graphique** : « Charge max 82 kg · 1RM estimé 98,5 kg » (dernières valeurs), et une phrase qui explique le pointillé.
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.7.34.

---

## [1.7.33] - 2026-11-10
### 📊 Progression : chiffres et textes plus lisibles (co-auteur : Claude)
- **Valeurs en 17 px** (taille du tonnage de l'Historique) : tonnages des 4 derniers mois, kg et gain des records, kg des paliers, % de la progression par séance / programme.
- **Textes associés en 16 px** (taille des dates de l'Historique) : mois et nombre de séances, noms d'exercice, phrase des paliers, noms de la progression par programme.
- **Paliers** : « sans progression depuis X séances » (sans la date), sur une ligne, directement sous le nom de l'exercice ; poids à droite sur la ligne du nom.
- **Gélules des records et des paliers** : même hauteur (68 px).
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.7.33.

---

## [1.7.32] - 2026-11-10
### 📐 Rationalisation, suite : espacements, interlignes, mouvement, superpositions, rangement (co-auteur : Claude)
- **Espacements** (marges et marges intérieures) sur une grille de 4 px : 33 → 15 valeurs (micro-ajustements de 1 et 2 px et décalages négatifs conservés, marge de page 26 px inchangée). Exception : la tuile active garde sa hauteur validée (écart sous la ligne de séance 12 px, pied 4 px).
- **Écarts entre éléments** : 4 / 8 / 12 / 16 px (2, 3 → 4 ; 6 → 8 ; 10 → 12 ; 14 → 16).
- **Interlignes** : 11 → 4 (1 ; 1,05 titres ; 1,35 petits textes ; 1,45 paragraphes).
- **Mouvement** : deux durées nommées, `--t-fast` (0,15 s) et `--t-normal` (0,25 s) ; l'appui long garde 0,45 s.
- **Superpositions** : échelle nommée `--z-wallpaper` … `--z-toast` (mêmes valeurs).
- **Rangement de style.css** : un seul bloc de variables par thème ; échauffement, nom d'exercice et sous-titre de séance définis à un seul endroit ; sections nommées par composant.
- **Restes** : classes inutilisées `.next-card-info` et `.type-letter` supprimées ; texte de Progression vide et écart des boutons Google Drive sortis du code en dur ; fenêtre de fin de séance à 20 px de marge pour que « Séance (A) terminée » tienne à 360 px.
- Tests : suite complète au vert ; captures avant / après de 8 écrans.
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.7.32.

---

## [1.7.31] - 2026-11-10
### 📐 Rationalisation de la feuille de style (co-auteur : Claude)
Aucun changement de couleur, de style ou de mise en page ; seules des valeurs nées écran par écran sont ramenées à quelques paliers (planches « Pastilles de séance : 3 tailles » et « Rationalisation, lot B » de la maquette).
- **Pastilles de séance** : 3 tailles — 56 px (détail d'une séance), 44 px (par défaut, y compris le choix « programme ou séance libre », 42 → 44), 40 px (tuile active, fin de séance 38 → 40, « Presque prêt » 36 → 40). Classe `.type-pill.tiny`, inutilisée, supprimée.
- **Tailles de texte** : 38 → 15 paliers (12, 13, 14, 15, 16, 17, 18, 20, 22, 24, 28, 30, 32, 42, 73 px). Plus visible : nom du programme dans la tuile active 26,6 → 28 px.
- **Rayons** : 18 → 5 (pilule, 10, 16, 22, 32 px) ; les éléments dont le rayon valait la moitié de la hauteur deviennent des pilules ; tuiles et détail de séance 34 → 32 px.
- **Hauteurs** : paliers 40 / 44 / 48 / 52 / 56 px (puces de filtre 38 → 40, puces de l'ajout 42 → 44, bascule du graphique 36 → 40, saisie des séries et coche 50 → 52).
- **Icônes** : 16 / 20 / 24 px (+ l'icône d'écran vide à 34 px).
- **Illustrations d'exercice** : éditeur 51 → 55 px (55 partout, 70 dans le détail).
- **Couleurs et ombres en dur → variables** : `--on-color`, `--hero-ink`, `--hero-chip`, `--hero-axis`, `--warn-icon(-bg)`, `--info(-icon-bg)`, `--record`, `--flame`, `--qr-bg`, `--sand-ico`, `--live-glow`, `--sh-sand`, `--sh-danger`, `--sh-thumb(-lg)`, `--sh-badge`, `--sh-toast`, `--veil-home`, `--veil-page`, `--font-hand` (mêmes valeurs, thème sombre compris).
- Tests : suite complète au vert ; captures avant / après de 8 écrans comparées.
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.7.31.

---

## [1.7.30] - 2026-11-10
### ⏸️ Mettre le programme actif en pause depuis sa tuile (co-auteur : Claude)
- **Bouton pause** (rond de 40 px, pictogramme pause) en haut à droite de la tuile du programme actif, aligné sur son icône ; aussi sur la séance libre active (couleur sable).
- Un appui passe le programme **En mémoire** (« En pause depuis le … ») ; plus aucun programme n'est actif (« Aucun programme actif »). « Réactiver » le remet en service.
- Si une séance est en cours, un volet demande confirmation (« Mettre en pause « … » ? » / « Continuer la séance ») ; confirmer remet le chrono à zéro et supprime le brouillon.
- Tests : `test_pause_actif.py` (18 contrôles, 390 px clair / 360 px sombre).
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.7.30.

---

## [1.7.29] - 2026-11-10
### 🎨 Fenêtres de l'app dans un seul style ; tuile de progression en dégradé (co-auteur : Claude)
- **Plus aucune boîte système** (confirm / alert) : toutes deviennent le volet du bas de l'app, comme « Supprimer le programme » : pastille d'icône (ambre = attention, rouge = suppression, gris = Google Drive, bleu = information), titre, texte court, bouton principal (rouge pour une suppression) et bouton gris pour renoncer ; toucher le fond ou Échap = renoncer. Les messages d'information n'ont qu'un bouton OK.
  - Éditeur : retour ou bouton Programmes avec une saisie non enregistrée (« Attention · Revenir en arrière annulera la saisie. Continuer ? »), retirer une séance remplie, abandonner une sélection d'exercices (le volet passe au-dessus de la liste).
  - Séance : aucune série cochée, série à corriger, séries non cochées, annuler la séance en cours.
  - Historique : supprimer une séance (au-dessus du détail), restaurer une sauvegarde Drive, remplacer / effacer la sauvegarde Drive, réinitialiser les données, import de fichier ; erreurs Google Drive.
- **Progression** : la tuile principale passe à un dégradé indigo profond avec un reflet magenta en haut à droite ; son titre reste « Indice de progression » quel que soit le programme choisi.
- Tests : `test_fenetres.py` (53 contrôles sur les vrais volets, 390 px clair / 360 px sombre, aucune boîte système, plus aucun `confirm()` / `alert()` dans le code) ; les tests existants répondent aux volets via un point d'accroche de test ; textes mis à jour.
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.7.29.

---

## [1.7.28] - 2026-11-10
### 🎨 Éditeur de programme : enregistrement plus clair ; liens légaux dans Réglages (co-auteur : Claude)
- **Éditeur** : la phrase « Ajoute au moins un exercice dans chaque séance pour enregistrer » disparaît. Le bouton « Enregistrer le programme » apparaît et reste actif dès qu'un exercice est choisi.
- **Séances vides à l'enregistrement** : un volet « Presque prêt » résume la situation (une ligne par séance : pastille, nom, nombre d'exercices et de séries avec une coche, ou « Aucun exercice · À compléter »), avec « Compléter la séance B » (ouvre la première séance vide) et « Fermer ». Rien n'est enregistré tant qu'une séance est vide.
- **Réglages › Application** : liens « Règles de confidentialité » et « Conditions d'utilisation » (nouvel onglet).
- Tests : `test_editeur_incomplet.py` (42 contrôles, 390/360 px, clair/sombre) ; `test_programmes.py` adapté.
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.7.28.

---

## [1.7.27] - 2026-11-09
### 🎨 Séance : en-tête allégé, échauffement, fenêtre de fin de séance (co-auteur : Claude)
- **Bouton « Programmes »** de la barre : ramène toujours à la page de départ (choix d'un programme, éditeur ou détail refermés). Depuis l'éditeur avec une saisie non enregistrée, la confirmation « Quitter sans enregistrer ? » est demandée.
- **En-tête de Séance** : plus de « Séance du jour · programme » ; seuls la pastille et le nom de la séance restent (la ligne « Modification · date » reste affichée quand on corrige une ancienne séance).
- **Échauffement** : flamme orange, « 2 séries légères sur le 1er exercice de force » suivi du pictogramme poids (l'emoji 🚣 et « après le rameur » disparaissent).
- **Noms d'exercice** : toujours sur une ligne, terminés par « … » s'ils sont trop longs (exercice ouvert ou fermé). La flèche reste en bout de ligne.
- **Fenêtre de fin de séance** (après « Valider & Enregistrer ») à la place du message en bas d'écran : « Bravo ! » en manuscrit, « Séance (A) terminée » (« Séance terminée » pour une séance libre), tonnage, écart avec la précédente séance du même type (« +300 kg / précédente » en vert, baisse en gris ; absent sans séance précédente), puis « Nouveau record » avec la coupe et une ligne par record (charge maximale, ou durée pour le cardio et le gainage ; absent sans record), bouton OK. Une modification d'ancienne séance garde le message habituel. Les avertissements (pesée manquante, reconnexion Google Drive) s'affichent toujours en message.
- Tests : `test_fin_seance.py` (56 contrôles à 390 et 360 px, clair et sombre) ; `test_validation.py`, `test_rameur.py`, `test_programmes.py`, `test_drive_sauvegarde.py`, `test_drive_installee.py` adaptés à la fenêtre de fin.
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.7.27.

---

## [1.7.26] - 2026-11-09
### 🐛 Réactiver un programme n'ouvre plus Firefox (co-auteur : Claude)
- Accès Google expiré : créer, modifier, activer, réactiver ou supprimer un programme (ou supprimer une séance de l'historique) tentait encore de renouveler l'accès par la fenêtre Google, qui ouvre Firefox (Firefox ne se déclare pas toujours comme application installée, d'où le passage par cette fenêtre). Ces actions ne tentent plus aucun renouvellement : la sauvegarde reste en attente et part avec la prochaine séance enregistrée ou via « Reconnecter maintenant ». L'enregistrement d'une séance garde son comportement.
- Test : `test_drive_android.py` (Firefox navigateur, accès expiré : créer / activer / réactiver un programme sans fenêtre Google ; reproduit le problème sans le correctif).
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.7.26.

---

## [1.7.25] - 2026-11-09
### 🎨 Tuile du programme actif selon la planche validée (co-auteur : Claude)
- **Tuile du programme actif** : pastille de séance (A, B…) à la taille de l'icône du programme et dans la même colonne ; nom de la séance aligné sur le nom du programme, « exercices · séries » dessous ; trait pointillé de sous l'icône jusqu'à « + de détail », en passant derrière la pastille de séance ; « + de détail » en bas à gauche, aligné sur le bas de la flèche rouge en bas à droite ; marges intérieures de 12 px. La pastille « Déload −20 % » se place au bout de la ligne « exercices · séries » et passe à la ligne si la place manque (aucun texte coupé).
- **Séance libre active** : « exercices · séries » sous le nom, même ligne du bas, pas de trait pointillé.
- **Programmes en mémoire** : marges latérales de 12 px — icônes et boutons alignés avec la tuile active.
- **« Actif »** (aussi pour la séance libre), aligné sur « En mémoire » ; point vert de 7 px à l'ombre centrée sur un cercle vert pâle de 18 px.
- Tests : `test_accueil.py` (alignements, trait, taille de la pastille, « Actif »), `test_programmes.py`.
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.7.25.

---

## [1.7.24] - 2026-11-09
### ✨ Accueil Programmes : message manuscrit et tuile compacte (co-auteur : Claude)
- **Message d'accueil manuscrit** en haut de l'onglet Programmes (police Caveat, licence OFL, hébergée avec l'app pour fonctionner hors connexion) : « Bonjour, » (5 h – 18 h) ou « Bonsoir, », puis une phrase selon le contexte — séance déjà faite aujourd'hui (« Belle séance aujourd'hui. Place à la récup ! »), retour après 10 jours ou plus (« Content de te revoir ! On s'y remet ? »), semaine de déload, pas encore de séance, pas de programme actif, sinon « Prêt à te dépasser aujourd'hui ? ».
- **Tuile active −25 % de hauteur** (278 → 206 px avec le déload), sans perte d'information : bouton démarrer à droite du nom, pastille « Déload −20 % » au bout de la ligne de la prochaine séance, « exercices · séries » et « + de détail » sur la dernière ligne.
- **Fond Poigne** recadré : le logo du short n'est plus dans l'image.
- Test : `test_accueil.py` (19 contrôles).
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.7.24.

---

## [1.7.23] - 2026-11-09
### 🎨 4 nouveaux fonds d'écran (co-auteur : Claude)
- **Réglages › Fond d'écran** : Râtelier (kettlebells colorées), Squat, Poigne et Disques s'ajoutent à Course, Barre, Haltères, Kettlebell et Studio — 9 images + « Aucun ». Images en 1000 px + vignettes, mises en cache pour fonctionner hors connexion.
- Test : `test_fond_ecran.py` (10 choix, 18 images en cache).
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.7.23.

---

## [1.7.22] - 2026-11-09
### 📄 Pages publiques pour Google (co-auteur : Claude)
- `confidentialite.html` (règles de confidentialité) et `conditions.html` (conditions d'utilisation), demandées par Google pour publier l'accès Google Drive de l'application (sortie du mode Test). Pages autonomes dans le style de l'app (polices locales, thème clair / sombre), avec un résumé en anglais pour les relecteurs Google : données sur l'appareil, sauvegarde facultative dans le Drive de l'utilisateur via `drive.file` uniquement, pas de serveur ni de traceur, respect de la Google API Services User Data Policy (Limited Use), suppression et retrait de l'accès. Contact : jeanphilippealexander@gmail.com.
- Ces deux pages sont aussi publiées seules sur `main` (sans autre changement de l'app en production) pour être accessibles à https://jeepalexander.github.io/suivi-fitness/confidentialite.html et …/conditions.html.
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.7.22.

---

## [1.7.21] - 2026-11-09
### ✨ Inviter quelqu'un + astuce (co-auteur : Claude)
- **Réglages › Inviter quelqu'un** (entre Google Drive et Application) : « Afficher le QR code » ouvre une fenêtre avec un QR code vers l'adresse de l'application, le lien en clair et « Partager le lien » (partage du téléphone) ou « Copier le lien ». La personne ouvre l'app sur son téléphone, l'installe et la connecte à son propre Google Drive. QR noir sur fond blanc, lisible aussi en thème sombre ; bibliothèque `js/qrcode.js` (qrcode-generator 2.0.4, Kazuhiko Arase, licence MIT) mise en cache pour fonctionner hors connexion.
- **Programmes** : symbole (i) et « Astuce : » devant « Reste appuyé sur un programme… » ; « Tes autres programmes apparaîtront ici » centré.
- Test : `test_invitation.py` (23 contrôles, dont la lecture du QR code).
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.7.21.

---

## [1.7.20] - 2026-11-09
### 🎨 Accueil Programmes : « Actif » et « En mémoire » (co-auteur : Claude)
- « Programme actif » devient **« Actif »** (« Active » pour une séance libre), à la même taille que « En mémoire » ; pastille verte conservée.
- La catégorie **« En mémoire »** reste affichée même vide, avec « Tes autres programmes apparaîtront ici ».
- Test : `test_programmes.py` (88 contrôles).
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.7.20.

---

## [1.7.19] - 2026-11-09
### 🎨 Pause, « En mémoire » et page Fond d'écran (co-auteur : Claude)
- **Gélule de pause au repos** : plus étroite (144 → 124 px), logo du chrono agrandi (18 → 24 px). Décompte et « GO ! » inchangés.
- **Programmes** : symbole pause (couleur des mentions « En pause ») devant « En mémoire ».
- **Réglages › Fond d'écran** : voile de l'accueil Programmes, pour bien voir le fond choisi au-dessus des vignettes.
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.7.19.

---

## [1.7.18] - 2026-11-09
### 🎨 Séance, Programmes, pause et fond d'écran (co-auteur : Claude)
- **Séance** (planche, écran 22a) : l'en-tête fixe (titre, séance du jour, déload, progression) est sur fond uni ; l'image de fond ne se voit que sous les exercices.
- **Programmes** : « Programme actif » / « Séance libre active » (et « Aucun programme actif ») en noir foncé, pastille verte conservée ; bouton + de l'en-tête en noir.
- **Gélule de pause** : au repos, « PAUSE » / « ADAPTATIVE » sur 2 lignes, sans la durée tant que le décompte n'est pas lancé, gélule de même taille (144 × 44). Décompte et « GO ! » inchangés ; la durée qui sera lancée reste lue par les lecteurs d'écran.
- **Réglages › Fond d'écran** : les vignettes défilent sur une seule ligne en bas de l'écran, positionnées sur le fond choisi.
- Tests : `test_chrono.py` (libellé 2 lignes et taille), `test_programmes.py`, `test_annuler_seance.py` adaptés.
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.7.18.

---

## [1.7.17] - 2026-11-09
### 🎨 Éditeur : visuels d'exercice agrandis (co-auteur : Claude)
- Création / modification d'un programme ou d'une séance libre : icône et pastille de chaque exercice +15 % (44 → 51 px) ; fenêtre « Ajouter à la séance » : +15 % (48 → 55 px).
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.7.17.

---

## [1.7.16] - 2026-11-09
### ✨ Éditeur : déplacement des exercices par le menu seulement (co-auteur : Claude)
- Création / modification d'un programme ou d'une séance libre : la poignée de glisser-déposer (6 points) disparaît des lignes d'exercice.
- Menu ⋮ d'un exercice : il reste ouvert après « Monter » ou « Descendre » et suit l'exercice à sa nouvelle place (plusieurs crans d'affilée possibles) ; « Annuler » devient « Fermer ».
- Test : `test_editeur_deplacer.py` (26 contrôles, 390 et 360 px).
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.7.16.

---

## [1.7.15] - 2026-11-09
### 🎨 Éditeur de programme : voile des autres onglets (co-auteur : Claude)
- Création et modification d'un programme ou d'une séance libre : même voile que Séance, Progression, Historique et Réglages (100 / 95 / 76 / 100 % à 0 / 30 / 72 / 100 % de la hauteur), au lieu de celui de l'accueil Programmes. Thème sombre : même chose en noir.
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.7.15.

---

## [1.7.14] - 2026-11-09
### 🎨 Séance : visuels d'exercice agrandis (co-auteur : Claude)
- Icône et pastille grise de chaque exercice dans l'onglet Séance : +15 % (48 → 55 px), ouvert ou fermé.
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.7.14.

---

## [1.7.13] - 2026-11-09
### 🎨 Voile des autres onglets renforcé (co-auteur : Claude)
- Séance, Progression, Historique, Réglages (planche, écran 32) : 100 % (haut) · 95 % à 30 % de la hauteur · 76 % à 72 % · 100 % (bas). Onglet Programmes inchangé. Même chose en noir pour le thème sombre.
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.7.13.

---

## [1.7.12] - 2026-11-09
### 🎨 Voile du fond d'écran ajusté (co-auteur : Claude)
- Valeurs validées sur la planche (écrans 31 et 32), en opacité du voile selon la hauteur de l'écran :
  - **Programmes** : 95 % (haut) · 82 % à 22 % · 15 % à 42 % · 60 % à 72 % · 88 % (bas) ;
  - **autres onglets** : 100 % (haut) · 90 % à 22 % · 68 % à 72 % · 96 % (bas).
- Thème sombre : mêmes opacités avec un voile noir.
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.7.12.

---

## [1.7.11] - 2026-11-09
### 🐛 Valider un programme n'ouvre plus Firefox (co-auteur : Claude)
- Application installée, accès Google expiré : créer, modifier, activer ou supprimer un programme (ou supprimer une séance de l'historique) lançait la reconnexion automatique à Google, qui ouvrait Firefox en mode normal. Cette reconnexion est désormais réservée à l'enregistrement d'une séance ; pour les programmes, la sauvegarde reste en attente (« modifications en attente d'envoi ») et part avec la prochaine séance enregistrée ou via « Reconnecter maintenant ».
- Test : `test_drive_android.py` (Firefox installé, accès expiré : programme validé / activé sans onglet ouvert).
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.7.11.

---

## [1.7.10] - 2026-11-09
### 🎨 Pastilles et voile (co-auteur : Claude)
- Pastille grise réduite (86 % de la case de l'icône) : l'icône garde sa taille et déborde un peu plus du rond.
- Fond d'écran : hors onglet Programmes, voile plus couvrant et plus régulier (88 → 72 → 88 %) pour garder l'image en retrait derrière la saisie ; l'onglet Programmes garde le dégradé de la planche.
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.7.10.

---

## [1.7.9] - 2026-11-09
### 🎨 Pastilles d'icônes (co-auteur : Claude)
- Pastille plus grise derrière les icônes d'exercice (`--icon-pastille` : #E4E4E9, #2C2C33 en sombre).
- Icônes plus grandes (96 % de la pastille) et non rognées : elles dépassent légèrement du rond, comme sur la planche.
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.7.9.

---

## [1.7.8] - 2026-11-09
### 🎨 Fond d'écran : alignement sur la planche de concept (co-auteur : Claude)
- **Voile dégradé selon la hauteur** : plus couvrant en haut (titres) et en bas (navigation), plus léger au milieu où l'image se voit (82 % → 55 % → 30 % → 72 % → 84 %). Équivalent sombre en thème sombre.
- **Tuile du programme actif légèrement transparente** quand un fond d'écran est choisi (84 %, image floutée dessous) ; idem pour la tuile sable de la séance libre.
- **Pastilles grises derrière les icônes d'exercice** : détail du programme (70 px, ombre douce), Séance, éditeur, fenêtre d'ajout.
- **Séance** : l'icône de l'exercice ouvert garde sa taille (48 px) au lieu de rétrécir sur les écrans étroits.
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.7.8.

---

## [1.7.7] - 2026-11-08
### ✨ Fond d'écran et bloc Drive (co-auteur : Claude)
- **Réglages › Fond d'écran** (sous Apparence) : une ligne avec la vignette et le nom du fond choisi ouvre la page « Fond d'écran » (bouton retour, grille de vignettes). 5 images : Course, Barre, Haltères, Kettlebell, Studio, plus « Aucun » (par défaut, fond blanc comme avant). Le choix s'applique tout de suite sur toutes les pages, sous un voile clair (ou sombre en thème sombre) qui garde le texte lisible.
- Le choix est propre à l'appareil, comme le thème : il ne fait pas partie des sauvegardes. Il est posé avant le premier affichage (pas de flash au lancement). Les images (`wallpapers/`, 1000 px + vignettes) sont mises en cache pour fonctionner hors connexion.
- **Sauvegarde Google Drive** : « Sauvegarde automatique : JJ/MM HH:MM » sur la première ligne (ou « : envoi en cours… » / « : modifications en attente d'envoi »), le compte dessous ; la ligne « Dernière sauvegarde » disparaît.
- Tests : nouveau `test_fond_ecran.py` (20 contrôles) ; textes Drive alignés.
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.7.7.

---

## [1.7.6] - 2026-11-08
### ✏️ Sauvegarde Google Drive (co-auteur : Claude)
- **Dossier Drive renommé « MON CARNET DE SALLE »** (au lieu de « FITNESS AAP – Séances »). Le dossier existant est **renommé** automatiquement à la première sauvegarde (une seule fois par appareil) : les 5 sauvegardes restent dedans, rien n'est déplacé ni recréé. Un nouvel appareil retrouve le dossier sous l'un ou l'autre nom. En cas d'échec du renommage, les sauvegardes continuent normalement.
- **Réglages, bloc simplifié** : le bouton (Connecter / Déconnecter) d'abord ; dessous, l'état avec une pastille verte devant « Sauvegarde automatique », le compte et la date de dernière sauvegarde ; puis : « Chaque séance validée déclenche une sauvegarde dans le dossier « MON CARNET DE SALLE ». 5 sauvegardes y sont conservées. Pour en reprendre une, touche « Restaurer » dans l'Historique. »
- Tests : renommage du dossier (ancien nom retrouvé, dossier déjà connu, une seule fois) ; textes alignés.
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.7.6.

---

## [1.7.5] - 2026-11-08
### 🐛 Fenêtre « Restaurer une sauvegarde » (co-auteur : Claude)
- **Choisir une sauvegarde ne rouvre plus la fenêtre** : la ligne cochée et le bouton se mettent à jour sur place (plus d'animation d'ouverture à chaque appui, défilement conservé). Même chose à l'arrivée de la liste Drive.
- **Dates** : « Aujourd'hui à 18:42:00 », « Hier à 19:15:00 », sinon la date (« 05/11/2026 à 19:15:00 »). La confirmation garde la date complète.
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.7.5.

---

## [1.7.4] - 2026-11-08
### 🐛 Corrections (co-auteur : Claude)
- **« Reconnecter maintenant » (application installée avec Firefox)** : le bouton ouvrait la page Google dans un onglet Firefox séparé, qui revenait sur l'application sans lui rendre l'accès. Il suit maintenant exactement le même chemin que la reconnexion automatique après l'enregistrement d'une séance (qui, elle, reste dans l'application et fonctionne) : connexion par redirection lancée environ 0,4 s après l'appui. Même chose pour « Connecter Google Drive » et le lien de la fenêtre « Restaurer une sauvegarde ». Navigateur (non installé) : inchangé.
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.7.4.

---

## [1.7.3] - 2026-11-08
### ✨ Restaurer une sauvegarde (co-auteur : Claude)
- **Historique › Restaurer** ouvre la fenêtre **« Restaurer une sauvegarde »** (planche de concept, écran 27b) : les 5 dernières sauvegardes Google Drive (date et heure, « La plus récente » / « Version précédente ») et « Choisir un fichier… » pour un fichier créé avec « Sauvegarder ». Un seul choix (la plus récente cochée par défaut) ; bouton « Restaurer cette sauvegarde » ou « Choisir le fichier », puis la confirmation habituelle avant tout remplacement. Sans connexion Drive : le fichier seul et un lien « Se connecter à Google Drive ».
- **Réglages** : « Restaurer depuis Drive » et la liste dans la page sont supprimés (redondants). Le bouton « Restaurer » ne reste qu'en cas de conflit de sauvegarde, et ouvre la même fenêtre. Texte d'aide : « pour en reprendre une, touche « Restaurer » dans l'Historique ».
### ✏️ Onglet Programmes
- Onglet et titre renommés **« Programmes »**.
- Pastille verte : « Programme actif » ou « Séance libre active », sans le nom.
- Tuile de l'élément actif : pictogramme du type et **nom du programme (ou de la séance libre) en grand** ; pastille et nom de la prochaine séance en petit (programme seulement) ; exercices et séries ; « + de détail » et démarrer.
- Tests : `test_programmes` (84 contrôles), `test_drive_versions`, `test_drive_sauvegarde` et `test_reglages` alignés sur la fenêtre de restauration.
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.7.3.

---

## [1.7.2] - 2026-11-08
### ✏️ Nom de l'application (co-auteur : Claude)
- L'application s'appelle **Mon Carnet de Salle**, comme sur la maquette : en-tête de toutes les pages (« MON CARNET DE SALLE »), titre de l'onglet du navigateur, nom à l'installation (`manifest.json` : « Mon Carnet de Salle », raccourci « Mon Carnet » sous l'icône) et titre du partage de la sauvegarde.
- Inchangés pour ne rien casser : le dossier Google Drive « FITNESS AAP – Séances », les noms des fichiers de sauvegarde, le dépôt et l'adresse de l'application.
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.7.2.

---

## [1.7.1] - 2026-11-08
### 🐛 Corrections (co-auteur : Claude)
- **Onglet Programme** : la tuile active, « En mémoire » et le texte d'aide sont alignés vers le bas de l'écran, au-dessus de la barre de navigation, comme sur la maquette (ils restaient collés en haut). Le détail déplié fait défiler la page normalement.
- **Créer un programme ou une séance libre** (écran « Choisis comment t'entraîner ») : le texte et les deux cartes sont alignés vers le bas ; le bouton retour reste en haut.
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.7.1.

---

## [1.7.0] - 2026-11-08
### ✨ Programmes sur mesure (co-auteur : Claude)
Spécification « Programmes sur mesure » et maquette « Programme nouvel usager » (écrans 1 à 30).
- **Programmes** de 2 à 6 séances (A à F, nouvelles couleurs D vert, E violet, F framboise) qui tournent en boucle, et **séances libres** (sans récurrence, pastille 1× sable). Un seul élément actif ; les autres sont « En mémoire ».
- **Onglet Programme** : bouton + (créer un programme ou une séance libre), éditeur (nom, séances, exercices réordonnables), feuille « Ajouter un exercice » (recherche, filtres par groupe, sélection multiple), activation sans confirmation (l'ancien actif passe en pause), « Nouveau » pour un élément jamais activé, appui long pour modifier ou supprimer, écran « rien de prévu » au premier lancement, restauration des programmes depuis la dernière sauvegarde Drive (cochés, arrivent en pause, sans doublon).
- **Catalogue de 86 exercices** (`js/catalogue.js`) : séries, répétitions et repos par défaut sourcés (ACSM 2009, Schoenfeld 2016 et 2021, Singer 2024). Le chrono de pause prend le repos de l'exercice ouvert : 3:00 polyarticulaire lourd, 2:00 polyarticulaire, 1:30 isolation, 1:00 abdos et gainage.
- **Modes de saisie** : kg × réps, poids du corps + lest (« Lest (kg) », vide = PDC, charge réelle = dernière pesée + lest), réps seules, durée, cardio durée + distance (allure /500 m pour rameur et ski trainer, /km pour le tapis, km/h pour les vélos) ou durée + étages (stair climber).
- **Onglet Séance** : charge la séance de l'élément actif (« Séance du jour · programme » ou « Séance libre ») ; « Première fois · 3 × 6–10 réps » ; le nombre de séries fait devient la référence ; « Aucune séance prévue » si rien n'est actif.
- **Déload** global inchangé, **reportable** d'une séance (« Reporter à la prochaine séance », annulable).
- **Progression** : sélecteur (programme actif par défaut, autre programme, séance libre ou « Tous les programmes »), indice et analyses calculés sur l'élément choisi, lettres de séance du programme, progression par programme pour « Tous », suivi cardio par appareil avec menu.
- **Historique** : filtres par programme, pastille de la séance ou 1×, programme d'origine sur chaque ligne et dans le détail ; un programme supprimé reste lisible.
### 🔄 Migration (une seule fois)
- L'historique existant est rattaché au programme **« Hypertrophie »** (séances A, B, C du programme fixe, même nombre de séries), actif, avec la séance suivante de la rotation.
- Noms d'exercices alignés sur le catalogue (Leg extension, Leg curl, Oiseau) avec leur identifiant ; contrôle nombre de séances, tonnage et records avant / après, retour à l'original en cas d'écart. Copie intégrale d'origine conservée sur l'appareil (`h49_state_v1_backup`).
- Le rameur s'affiche désormais en allure **/500 m** (données inchangées).
- Une ancienne sauvegarde importée ou restaurée est convertie de la même façon.
### 💾 Sauvegarde
- Mode inchangé : un fichier complet horodaté, 5 versions conservées. Il contient désormais les programmes et séances libres ; créer, modifier, activer ou supprimer un programme déclenche une sauvegarde.
### 🧪 Tests
- Nouveau `tests/test_programmes.py` (79 contrôles) ; `test_chrono`, `test_rameur` et `test_drive_sauvegarde` alignés (repos du catalogue, allure /500 m, programmes dans la sauvegarde). `test_chrono` attend désormais le lancement du repos après le rameur, comportement voulu depuis 1.6.21.
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.7.0.

---

## [1.6.36] - 2026-11-07
### ✏️ Réglages
- **Apparence** : texte d'explication supprimé (les boutons Clair / Sombre / Auto suffisent).
- Texte sous la version au tutoiement, comme le reste de l'application (« Tu peux néanmoins cliquer sur « Vérifier » »).
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.6.36.

---

## [1.6.35] - 2026-11-07
### ✏️ Textes de la page Réglages simplifiés
- **Apparence** : seule la première phrase d'explication est conservée.
- **Sauvegarde Google Drive** (connecté) : une information par ligne — « Sauvegarde automatique activée », le compte, « Dernière sauvegarde : date » (ou « Envoi en cours… » / « Modifications en attente d'envoi »). Les messages d'accès expiré, de conflit et d'erreur sont inchangés.
- Texte sous « Restaurer depuis Drive » raccourci (sauvegarde à chaque séance ou modification, 5 dernières conservées et restaurables).
- Texte sous la version : vérification à chaque lancement, bouton « Vérifier », aucune installation automatique.
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.6.35.

---

## [1.6.34] - 2026-11-07
### 🐛 Corrections
- **« Reconnecter maintenant » dans l'application installée avec Firefox (Android)** : la connexion Google s'ouvrait toujours dans **Chrome**. Chrome recevait l'accès, mais l'application installée avec Firefox ne partage pas le stockage de Chrome : elle ne le voyait jamais, même en suivant la procédure. La connexion s'ouvre maintenant dans un **nouvel onglet du navigateur qui a installé l'application** (Firefox, Samsung Internet…). Au retour, cet onglet affiche « Connexion réussie, tu peux fermer cet onglet » et l'application reprend l'accès automatiquement.
- Application installée avec Chrome : comportement inchangé (intent vers le vrai Chrome).
- Ouverture d'onglet refusée par le navigateur (ex. reconnexion automatique) : plus de départ vers une page blanche, un message invite à toucher « Reconnecter maintenant ».
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.6.34.

---

## [1.6.33] - 2026-11-07
### ✨ Nouveautés
- **Versions de la sauvegarde Google Drive** : chaque sauvegarde automatique crée désormais un **nouveau fichier** `fitness-backup-AAAA-MM-JJ-HH-MM-SS.json` (heure de l'appareil) dans le dossier « FITNESS AAP – Séances », au lieu d'écraser le précédent. Rien n'est envoyé si les données n'ont pas changé (inchangé).
- **5 versions conservées** : après chaque envoi réussi, les sauvegardes au-delà des 5 plus récentes sont mises à la **corbeille du Drive** (récupérables 30 jours). L'ancien fichier `sauvegarde_complete.json` compte comme une version : il reste restaurable tant qu'il fait partie des 5 plus récentes. Les autres fichiers du dossier ne sont jamais touchés.
- **Échec de suppression non bloquant** : si la mise à la corbeille d'une vieille sauvegarde échoue, la sauvegarde principale reste réussie ; l'erreur est seulement notée dans la console.
- **Restaurer depuis Drive** : affiche la liste des **5 dernières sauvegardes** avec leur date et heure ; chacune a son bouton « Restaurer » (même confirmation et même import assaini qu'avant). Sauvegarde disparue entre-temps : message et liste rafraîchie.
- Protection « appareil vide » renforcée : une sauvegarde vide n'est jamais envoyée par-dessus la sauvegarde la plus récente du Drive si celle-ci contient des séances.
- Format du JSON sauvegardé inchangé.
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.6.33.

---

## [1.6.32] - 2026-11-07
### 🐛 Corrections
- **Connexion Google Drive depuis l'application plein écran (Android)** : la page de connexion Google ouverte dans l'onglet intégré de l'application restait blanche. Elle s'ouvre maintenant dans le **vrai Chrome** (intent, avec repli sur l'ouverture habituelle si Chrome est absent). Au retour, l'onglet Chrome affiche « Connexion réussie, tu peux fermer cet onglet », et l'application plein écran **reprend automatiquement le jeton** (stockage partagé : événement `storage` + retour au premier plan).
- Navigateur (non installé) et bureau : comportement inchangé.
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.6.32.

---

## [1.6.31] - 2026-11-07
### 🐛 Corrections
- **Bouton honnête** : quand l'appareil ne contient aucune séance, « Remplacer par cet appareil » devient **« Effacer définitivement la sauvegarde Drive »** (en rouge), avec un message et une confirmation « Effacer DÉFINITIVEMENT… » qui disent clairement que la sauvegarde sera vidée. Appareil non vide : libellé « Remplacer par cet appareil » inchangé.
- **« modifiée le date inconnue »** : la date réelle de la sauvegarde Drive est désormais lue et affichée (y compris pour un conflit déjà enregistré sans date).
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.6.31.

---

## [1.6.30] - 2026-11-07
### 🐛 Corrections
- **La réinitialisation des données ne vide plus la sauvegarde Google Drive.** Quand cet appareil n'a plus aucune séance (réinitialisation, données effacées), la sauvegarde automatique n'écrase plus un fichier Drive qui en contient : l'envoi est suspendu et l'écran Réglages propose « Restaurer depuis Drive » ou « Remplacer » (choix explicite). Une suppression volontaire de séances reste purgée normalement.
- « Restaurer depuis Drive » avec une sauvegarde **vide** : message explicatif, aucune donnée locale modifiée.
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.6.30.

---

## [1.6.29] - 2026-11-07
### 🔧 Divers
- **`data.json` vidé** : plus aucune séance, pesée ni charge d'exemple dans l'application (33 séances d'essai supprimées). Un nouvel appareil, ou « Réinitialiser les données », démarre sur un historique vide (la sauvegarde Google Drive se restaure depuis les Réglages).
- Les tests utilisent désormais leur propre jeu d'essai `tests/fixture_data.json`.
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.6.29.

---

## [1.6.28] - 2026-11-07
### 🎨 Design
- **Progression globale** : la variation « +x % vs mois précédent » n'a plus de fond (elle ressemblait à un bouton) et est remontée contre le chiffre, plus éloignée du titre du graphique.
- Titre du graphique : « Volume total (kg) par : » (suivi des boutons Séances · A / B / C · Mois).
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.6.28.

---

## [1.6.27] - 2026-11-07
### 🎨 Design
- **Progression globale** : hauteur du graphique (210 px) et zone de tracé **identiques** en vue par séance, par mois et par jour (plus de saut à la bascule) ; l'axe Y fixe est aligné sur les graduations.
- **Vue par jour** : un **trait de graduation pour chaque jour** écoulé (plus marqué chaque semaine, avec sa date).
- Boutons de la tuile : ordre **Séances · A / B / C · Mois** (« Par mois » devient « Mois »).
- Le bouton en haut à droite devient une **icône** (courbe posée sur une règle graduée) ; état pressé en vue par jour.
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.6.27.

---

## [1.6.26] - 2026-11-06
### 🎨 Design
- **Vue « Par jour » de la progression** : l'**axe vertical (kg) est désormais fixe** à gauche, seul le graphique défile ; l'**échelle est resserrée d'un facteur ~3** (9 px par jour au lieu de 26) pour voir plusieurs semaines d'un coup ; marges aux extrémités pour que les dates de début et de fin ne soient pas rognées.
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.6.26.

---

## [1.6.25] - 2026-11-06
### ✨ Nouveautés
- **Progression globale : vue « Par jour »**. Bouton en haut à droite de la tuile : il bascule entre le graphique actuel (un point par séance) et une version avec **chaque jour écoulé** entre la première séance et aujourd'hui, pour visualiser l'écart entre les séances (les séances restent reliées par la courbe). Le graphique **défile horizontalement** : il s'ouvre sur les séances les plus récentes, on remonte le temps en glissant vers la gauche. Repères toutes les semaines, détail (date, séance, tonnage) au toucher d'un point. Fonctionne aussi avec le filtre A / B / C ; « Par mois » ramène à la vue par séance.

### 🎨 Design
- L'onglet **Graphiques** devient **Progression** (barre de navigation, titre de l'écran).
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.6.25.

---

## [1.6.24] - 2026-11-06
### 🐛 Corrections
- **Message « Empêcher cette page d'ouvrir des dialogues supplémentaires »** à l'enregistrement : Chrome l'ajoute quand deux boîtes de dialogue s'enchaînent (confirmation puis « Séance enregistrée »). Le récapitulatif d'enregistrement (et celui du chargement d'une séance à modifier) s'affiche désormais dans un **bandeau non bloquant** qui disparaît seul après quelques secondes (ou au toucher), sans clic requis.
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.6.24.

---

## [1.6.23] - 2026-11-06
### ✨ Nouveautés
- **Supprimer une séance de l'historique** : bouton « Supprimer la séance » dans la fiche de la séance (avec confirmation). L'historique, les graphiques, les dernières charges proposées et la prochaine séance (A/B/C) sont recalculés.
- **La sauvegarde Google Drive est mise à jour automatiquement** : la séance supprimée est retirée de `sauvegarde_complete.json`. Une suppression volontaire n'est jamais prise pour un conflit (liste `h49_drive_deleted_ids`, vidée après envoi réussi).

### 🎨 Design
- Nouvelle icône du rameur (`icons/rower.png`).
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.6.23.

---

## [1.6.22] - 2026-11-06
### 🐛 Corrections
- **Service worker** : la liste du cache hors-ligne (`sw.js`) pointait vers `icons/rowing.png`, renommé `rower.png` ; le fichier manquant faisait échouer l'installation du service worker (pas de mise à jour ni de mode hors-ligne). Corrigé.
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.6.22.

---

## [1.6.21] - 2026-11-06
### ✨ Nouveautés
- **Suivi cardio** (onglet Graphiques) : courbe de l'allure au km du rameur par date, avec l'allure de la dernière séance (plus bas = plus rapide).
- **Allure sous la saisie du rameur** (min:ss /km), recalculée en direct.
- **Saisie de la durée au pavé numérique** : on tape les chiffres (« 430 » devient 4:30, « 1015 » devient 10:15), le pavé n'ayant pas de touche « : ».

### 🎨 Design
- Le rameur utilise l'icône `icons/rower.png`.
- Titre sans numéro de version (il reste dans Réglages).
- Écran Programme épuré : plus de mention d'échauffement ni de titre « Au programme », uniquement les icônes et noms des exercices.
- Champs de saisie : `appearance: none` pour un rendu identique (gélule ombrée) sur tous les navigateurs mobiles.
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.6.21.

---

## [1.6.20] - 2026-11-05
### ✨ Nouveautés
- **Rameur dans les séances** : exercice en première position des séances A, B et C, avec **une seule ligne** « Durée (min:ss) / Distance (m) » saisie à la main (un nombre seul est lu en minutes). Valeurs de la dernière séance reprises, « Dernière fois · 1 050 m en 4:15 », coche = lancement du chrono de pause, compté dans « x / n séries ».
- Enregistré dans l'historique avec `seconds` et `meters` (poids/reps à 0) : **aucun impact sur le tonnage, les charges max et les records**. Absent de la liste des exercices des Graphiques.
- Mention d'échauffement mise à jour (le rameur est désormais saisi dans la séance).
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.6.20.

---

## [1.6.19] - 2026-11-05
### 🎨 Design
- **Chrono de pause** : la frontière de la bande de progression est désormais **droite** (plus arrondie) et reste rognée par la gélule ; elle avance de **gauche à droite** (la gélule démarre foncée et se remplit de clair). Contraste nettement renforcé, en clair comme en sombre (couleurs `--timer-base` / `--timer-fill`).
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.6.19.

---

## [1.6.18] - 2026-11-05
### 🎨 Design
- **Chrono de pause** : retour à la gélule d'origine (icône + « PAUSE m:ss »). Pendant le décompte, une bande claire au bord arrondi et lumineux remplit la gélule et se rétracte vers la gauche, sur fond vert plus profond (contraste renforcé). Remplacement de l'anneau de la 1.6.17.
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.6.18.

---

## [1.6.17] - 2026-11-04
### 🐛 Corrections
- **Annuler la séance** arrête aussi le chrono de pause (décompte et « GO ! » ne continuent plus) et le remet à « PAUSE m:ss ».

### 🎨 Design
- **Chrono de pause modernisé** : la barre blanche qui débordait est remplacée par un anneau de progression fin autour de l'icône, qui se vide en douceur ; fond vert doux pendant le décompte, chiffres à largeur fixe (plus de tremblement).
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.6.17.

---

## [1.6.16] - 2026-11-04
### ✨ Nouveautés
- **Annuler une séance en cours** : nouveau bouton « Annuler la séance » (avec confirmation) sous « Valider ». Il arrête et remet à zéro le chrono, supprime le brouillon et ramène au Programme ; rien n'est enregistré.

### 🔧 Divers
- Badge de version du `README.md` aligné (il affichait 1.6.12).
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.6.16.

---

## [1.6.15] - 2026-11-04
### 🐛 Amélioration des messages d'erreur
- **Vérification de mise à jour** : Affichage de l'erreur exacte au lieu du message générique "hors connexion ?" pour faciliter le diagnostic.

---
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.6.15.

---

## [1.6.14] - 2026-11-04
### 🐛 Corrections de bugs
- **CSS** : Suppression de la duplication de `.timer-btn` qui empêchait l'affichage correct de la barre de progression.
- **Vérification de version** : Réalignement des versions après correction du CSS.

---
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.6.14.

---

## [1.6.13] - 2026-11-04
### ⏱️ Barre de progression visible
- Correction du `z-index` sur `.timer-btn::before` pour que la barre de progression du timer de pause soit **visible au-dessus du contenu** du bouton.

---
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.6.13.

---

## [1.6.12] - 2026-11-04
### 🗂️ Google Drive : UNE seule sauvegarde complète (plus de fichiers par séance)
- Le dossier « FITNESS AAP – Séances » contient désormais **un seul fichier**, `sauvegarde_complete.json`, avec tout l'état de l'application (historique, poids corporel, dernières charges) : c'est exactement le format du bouton « Restaurer » de l'Historique.
- **Première connexion :** le dossier est créé s'il n'existe pas, avec la sauvegarde complète (tout l'historique déjà présent).
- **Ensuite :** le même fichier est **mis à jour** (jamais dupliqué) à chaque séance enregistrée ou modifiée, et à chaque modification des données (poids, suppression…) tant que l'accès est valide. Rien n'est renvoyé si rien n'a changé (empreinte des données retenue) ; les modifications faites sans accès valide partent dès qu'il revient (« modifications en attente d'envoi »). Réglages affiche la date de la dernière sauvegarde.
- **Restaurer depuis Drive :** nouveau bouton dans Réglages (confirmation avec la date et le nombre de séances, avertissement de remplacement, contenu assaini comme l'import manuel).
- **Protection :** si une sauvegarde existe déjà sur le Drive avec des séances que cet appareil n'a pas (réinstallation, autre appareil…), elle n'est **jamais écrasée** : l'envoi est suspendu et Réglages propose « Restaurer depuis Drive » ou « Remplacer par cet appareil ».
- Supprimés : fichiers `seance_*.json`, file d'attente de séances, envoi de l'historique séance par séance (les anciens repères sont effacés au démarrage). Les fichiers `seance_*.json` éventuellement déjà présents sur le Drive ne sont pas touchés : tu peux les supprimer à la main.
- Correctif : « modifiée le Invalid Date » quand Google ne renvoie pas de date.
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.6.12.

---

## [1.6.11] - 2026-11-04
### 🔁 Application installée : reconnexion automatique à l'enregistrement d'une séance
- Si l'accès Google (≈ 1 h) a expiré quand tu enregistres une séance (ou une modification), l'application **se reconnecte toute seule** par redirection, sans question ni appui : la séance est d'abord gardée en file d'attente, puis part au retour de Google.
- Le message « Séance enregistrée » ajoute la ligne « Google Drive : accès expiré, reconnexion automatique… » (uniquement dans ce cas).
- Garde-fou : une seule reconnexion automatique toutes les 2 minutes ; si Google refuse au retour, la raison s'affiche dans Réglages (« Connexion Google refusée (…) ») et les séances restent en attente, sans boucle d'allers-retours.
- Dans le navigateur, rien ne change (renouvellement silencieux par la fenêtre). Si Drive n'a jamais été connecté : aucune redirection, aucune mention.
- Correctif : la raison d'un refus de Google au retour s'affiche aussi quand Drive avait déjà été connecté.
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.6.11.

---

## [1.6.10] - 2026-11-04
### 📲 Google Drive : connexion possible depuis l'application installée (plein écran) + séances modifiées mises à jour
- **Constat sur téléphone :** installée sur l'écran d'accueil, l'application ouvrait la fenêtre de connexion Google dans un onglet séparé, qui restait sur une page blanche (le résultat ne revenait jamais à l'application).
- **Application installée :** la connexion se fait maintenant **par redirection** (la page va chez Google puis revient avec l'accès, lu au démarrage, adresse nettoyée, « state » anti-falsification vérifié). Dans le navigateur, la fenêtre habituelle est conservée.
- ⚠️ **À faire une fois dans Google Cloud :** ajouter `https://jeepalexander.github.io/suivi-fitness/` aux « URI de redirection autorisés » de l'identifiant client OAuth.
- Dans l'application installée, le renouvellement silencieux n'est pas possible : si l'accès (≈ 1 h) a expiré, la séance reste en file d'attente et Réglages propose « Reconnecter maintenant ».
- **Séance modifiée :** son fichier Drive est **mis à jour** au lieu d'en créer un second du même nom. L'identifiant du fichier est retenu pour chaque séance (retrouvé par son nom pour les fichiers envoyés avant) ; si le fichier a été supprimé du Drive, il est recréé.
- Retour dans l'application : l'état de Drive est relu ; la file d'attente ne peut plus être envoyée deux fois en parallèle.
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.6.10.

---

## [1.6.9] - 2026-11-04
### 📦 Google Drive : envoi de tout l'historique à la première connexion
- Si le dossier « FITNESS AAP – Séances » **n'existe pas** sur le Drive, l'application le crée puis y envoie **tout l'historique déjà présent** (une séance = un fichier `seance_AAAA-MM-JJ.json` ; si plusieurs séances le même jour : `_1`, `_2`…).
- Se déclenche tout seul : à la connexion, à l'ouverture de l'application, à l'ouverture de Réglages et après un enregistrement de séance. Si le dossier existe déjà, rien n'est renvoyé.
- Reprise automatique : si l'envoi s'interrompt (jeton expiré, réseau coupé, refus de Google), les séances déjà envoyées sont retenues et seules les autres partent ensuite, sans doublon.
- Réglages affiche l'avancement (« envoi de l'historique vers Drive (12/33)… ») puis « historique envoyé (33 séances) ».
- Une seule création de dossier à la fois (plus de risque de dossiers en double).
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.6.9.

---

## [1.6.8] - 2026-11-04
### 🔎 Google Drive : l'application dit la vérité quand Google refuse l'accès
- Constat sur téléphone : Google répondait « 403 » à **toutes** les requêtes Drive (lecture de l'adresse et du dossier). L'ancien texte « sauvegarde automatique active » était donc trompeur.
- Réglages affiche maintenant la **raison donnée par Google** (ex. « Google refuse l'accès à Drive (403 accessNotConfigured) — les séances ne sont pas sauvegardées ») avec une aide adaptée (API Drive non activée, autorisation non accordée...).
- Même message si l'envoi d'une séance est refusé ; la séance reste en file d'attente.
- Test d'accès à Drive à chaque connexion et à chaque ouverture de Réglages : le message disparaît tout seul dès que le problème est réglé.
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.6.8.

---

## [1.6.7] - 2026-11-04
### 👤 Compte Google : lecture de l'adresse fiabilisée
- Si l'API Drive « about » ne donne pas l'adresse, une **seconde méthode** la lit sur le propriétaire du dossier de sauvegarde créé par l'application (aucune permission supplémentaire, aucune nouvelle autorisation à donner).
- Si aucune des deux ne répond, Réglages **affiche la raison** (ex. « adresse du compte indisponible (about : erreur 403 ; dossier : erreur 404) ») au lieu de ne rien montrer.
- Nouvel essai de lecture à chaque ouverture de Réglages tant que l'adresse est inconnue.
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.6.7.

---

## [1.6.6] - 2026-11-03
### 🔄 Google Drive : plus besoin de se reconnecter toutes les heures
- Le jeton Google ne dure qu'environ 1 h. À chaque « Enregistrer la séance », s'il a expiré, l'application en redemande **un nouveau toute seule** (demande silencieuse, sans choix de compte grâce à l'adresse déjà connue), envoie la séance, puis les séances restées en attente.
- Le souhait de sauvegarde est retenu (`h49_drive_wanted`) jusqu'à un clic sur « Déconnecter » ; l'expiration du jeton n'oublie plus le compte ni le dossier.
- Si Google demande quand même une confirmation (fenêtre refusée, session Google fermée), rien n'est perdu : la séance reste en file d'attente et Réglages l'indique (« N séances en attente d'envoi », bouton « Reconnecter maintenant »).
- Réglages : l'état est rafraîchi à chaque ouverture de la page.
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.6.6.

---

## [1.6.5] - 2026-11-03
### 👤 Compte Google affiché dans Réglages
- Une fois Google Drive connecté, la carte « Sauvegarde Google Drive » indique l'adresse du compte (« Connecté : adresse — sauvegarde automatique active »).
- L'adresse est lue via l'API Drive (déjà autorisée), stockée sur l'appareil seulement (`h49_drive_account`, hors sauvegarde exportée), affichée en texte brut et effacée à la déconnexion.
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.6.5.

---

## [1.6.4] - 2026-11-03
### 🛠️ Correctif : l'application démarre de nouveau (et fonctionne hors-ligne)
- `app.js` est de nouveau le **code complet de l'application** (v1.6.0 avec sauvegarde Google Drive). Le chargeur qui allait chercher le code sur jsDelivr est supprimé : il empêchait `initApp` de s'exécuter (écran Programme vide) et rendait l'application inutilisable sans réseau.
- `security.js` assainit de nouveau les sauvegardes importées (il s'exécute après `app.js`, donc `importData` existe).
- Politique de sécurité (CSP) resserrée : `cdn.jsdelivr.net` et `raw.githubusercontent.com` retirés ; seuls les domaines Google nécessaires à la sauvegarde Drive restent autorisés.
- Fichier orphelin `app-part1.js` supprimé.
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.6.4.
- Non restauré : l'affichage du compte Google connecté dans Réglages (prévu en 1.6.1, code perdu), à refaire si souhaité.

---

## [1.6.3] - 2026-11-03
### ⚠️ Version défectueuse (corrigée en 1.6.4)
- Tentative de réparation par un chargeur `app.js` chargeant le code depuis jsDelivr (CSP élargie). Application non initialisée et hors-ligne impossible.

---

## [1.6.2] - 2026-11-03
### ⚠️ Version défectueuse (corrigée en 1.6.4)
- `app.js` scindé en parties (`app-part1.js`) et premières tentatives de chargeur. Non fonctionnel.

---

## [1.6.1] - 2026-11-03
### ⚠️ Version défectueuse (corrigée en 1.6.4)
- Tentative d'affichage du compte Google dans Réglages ; `app.js` a été écrasé par un contenu vide. Fonctionnalité perdue.

---

## [1.6.0] - 2026-11-03
### ☁️ Sauvegarde automatique Google Drive
- Carte « Sauvegarde Google Drive » dans Réglages : à chaque séance enregistrée, un fichier `seance_AAAA-MM-JJ.json` est créé dans le dossier « FITNESS AAP – Séances » (portée `drive.file`).
- CSP étendue à Google Identity Services et aux API Google.

---

## [1.5.9] - 2026-11-03
### ⏱️ Barre de progression propre
- La barre de progression du timer utilise désormais un **pseudo-élément CSS** (`::before`) au lieu d'une div supplémentaire, pour une intégration plus propre et sans débordement.

---
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.5.9.

---

## [1.5.8] - 2026-11-03
### ⏱️ Barre de progression droite
- La barre de progression du timer est maintenant **droite** (sans bordure arrondie) à l'intérieur de la pastille.

---
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.5.8.

---

## [1.5.7] - 2026-11-03
### ⏱️ Barre de progression du timer
- **La pastille du timer de repos se vide progressivement** pendant le décompte, pour visualiser le temps restant.

---
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.5.7.

---

## [1.5.6] - 2026-11-03
### ⏱️ Timer de repos automatique
- **Le timer de repos se relance automatiquement à chaque validation de série** avec la durée adaptée à l'exercice en cours. Plus besoin de cliquer manuellement sur la pastille de pause.

---
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.5.6.

---

## [1.5.4] - 2026-11-01
### 🧹 Nettoyage du CSS (aucun changement visuel)
- Le bloc « BLANC MINIMALISTE (v1.4.0) », qui surchargeait les règles d'origine, est **fusionné dans les règles de chaque composant** : une seule valeur par propriété, plus de règle écrasée par une autre. `style.css` passe de 803 à 473 lignes (40,8 → 31,7 Ko) et est réorganisé en 11 sections (jetons, base, en-tête, navigation, composants communs, Programme, Séance, Graphiques, Historique, Réglages, fenêtre de séance).
- **Règles mortes supprimées :** `.workout-meta-bar`, `.program-ex-row`, `.analysis-block`, `.type-pill.small` (identique à `.type-pill`), `#tab-seance .session-head` (la bannière est dans l'en-tête), `#deload-subtitle` en doublon, rayures de bordures jamais visibles (`border: none` appliqué par-dessus).
- **Variables inutilisées supprimées :** `--accent-text`, `--pill-chip`, `--pill-track`, `--primary-tint`, `--line`, `--primary-soft`, `--success-border`, `--radius-card`, `--shadow-card`, `--shadow-float`, `--shadow-nav`, `--shadow-sticky`. `--gutter` et `--sh-btn` rejoignent les jetons.
- **Vérification :** instantané des styles calculés de tous les éléments dans 20 états (5 pages, exercice ouvert, séries cochées, chrono prêt / en cours / terminé, modale, avis de mise à jour, records, paliers, conseils, déload) × 3 largeurs (360, 390, 600 px) × 2 thèmes, avant et après : **0 écart** à part `grid-template-columns` sur la barre de navigation, qui est en flex et l'ignorait déjà.

---
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.5.4.

---

## [1.5.3] - 2026-11-01
### ⏱️ Temps de repos raccourcis
- Les repos proposés par le chrono étaient trop longs : **2:30** pour les mouvements lourds (soulevé de terre, presse, développés couché et incliné), **1:30** pour les autres mouvements polyarticulaires et par défaut, **1:00** pour l'isolation (avant : 3:00 / 2:00 / 1:30).
- Valeurs modifiables dans `REST_BY_EXERCISE` (`app.js`).
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.5.3.

---

## [1.5.2] - 2026-11-01
### 🎨 Nouvelles icônes d'exercices
- Les icônes d'exercices sont remplacées par de nouveaux visuels (`icons/*.png`).
- Elles sont plus détaillées donc plus lourdes (≈ 2,2 Mo au total, contre ≈ 0,5 Mo avant) : la première installation / mise à jour télécharge davantage ; ensuite tout est servi hors-ligne depuis le cache.
- `manifest.json` et `APP_VERSION` (`sw.js`) alignés sur 1.5.2.

---

## [1.5.1] - 2026-11-01
### ⚙️ Nouvelle page « Réglages »
- Les cartes **Apparence** (Clair / Sombre / Auto) et **Application** (version, « Vérifier », avis « version prête ») quittent l'onglet Historique, qui est désormais plus court : il garde Sauvegarder / Restaurer, la liste des séances et la réinitialisation.
- Un **bouton roue dentée en haut à droite de l'Historique** ouvre la page Réglages ; un bouton **« Retour »** à la même place revient à l'Historique. La page n'a pas d'icône propre dans la barre du bas (l'icône Historique reste allumée).
- La **pastille rouge « mise à jour »** apparaît maintenant aussi sur la roue dentée, pour que l'avis reste visible depuis l'Historique.
- Aucune donnée touchée : le choix de thème et la sauvegarde fonctionnent comme avant.

### 🧪 Tests
- Nouveau `test_reglages.py` (17 contrôles) ; `test_mise_a_jour.py` et `test_mise_en_page.py` suivent la nouvelle page (5 pages × 2 largeurs × 2 thèmes). Total : 90 contrôles.

---

## [1.5.0] - 2026-11-01
### 🔔 Indicateur de mise à jour
- Nouvelle carte **« Application »** dans l'onglet Historique : version exécutée, bouton « Vérifier » (« À jour · vérifié à hh:mm », « Vérification impossible » si le réseau est coupé).
- Quand une nouvelle version vient d'être installée en arrière-plan, un avis « La version X est prête » apparaît dans cette carte, avec une **pastille rouge sur l'icône Historique** et un bouton **« Relancer maintenant »** (la saisie en cours est conservée par les brouillons).
- **L'application ne se recharge jamais toute seule** : l'avis ne s'affiche que si la version installée diffère de celle qui tourne. Vérification silencieuse au retour au premier plan (au plus toutes les 30 min).
- Correctif du service worker : à l'installation, les fichiers sont désormais réclamés au réseau (`cache: 'reload'`) au lieu du cache HTTP du navigateur, qui pouvait enregistrer d'anciens fichiers sous le numéro de la nouvelle version (le téléphone restait alors sur l'ancien code). Le service worker prévient aussi les pages ouvertes (`SW_ACTIVATED`).

### 💾 Poids corporel dans le brouillon
- Le poids tapé dans l'onglet Graphiques est conservé (rechargement, application fermée par le système) pendant 24 h, dans un brouillon séparé de celui de la séance : enregistrer une séance ne l'efface pas.
- Vidé à « Ajouter », à la réinitialisation et à l'import d'une sauvegarde ; valeur strictement validée à la restauration (nombre de 1 à 3 chiffres, 2 décimales au plus) ; jamais inclus dans la sauvegarde exportée.

### ⏱️ Chrono de repos adapté à l'exercice
- Le chrono propose la durée de l'**exercice ouvert** : « PAUSE 3:00 » (soulevé de terre, presse, développés couché et incliné), « PAUSE 2:00 » (autres mouvements polyarticulaires, durée par défaut), « PAUSE 1:30 » (exercices d'isolation). Il se met à jour tout seul quand on change d'exercice ou qu'on passe au suivant.
- Le décompte en cours et le « GO ! » ne changent jamais quand on ouvre un autre exercice ; le décompte s'affiche dès l'appui.
- Les durées sont regroupées dans `REST_BY_EXERCISE` (`app.js`) : un seul endroit à modifier.

### 🧪 Tests
- 3 nouveaux fichiers (`test_poids_brouillon.py`, `test_chrono.py`, `test_mise_a_jour.py`) ; `test_mise_en_page.py` couvre l'avis « version prête ». Total : 73 contrôles.

---

## [1.4.4] - 2026-11-01
### 🧹 Rangement de `app.js` (aucun changement de comportement ni de design)
- Sommaire en tête de fichier et 16 sections aux séparateurs uniformes (constantes, état, thème, données, déload, Programme, chronos, brouillon, Séance, Historique, Graphiques, analyse, navigation, import/export, démarrage).
- Variables globales regroupées dans une seule section « État », avec leur rôle commenté.
- Fonctions remises dans un ordre logique ; le gestionnaire d'enregistrement de séance devient une fonction nommée, `submitWorkout`.
- Vérifié : le code est identique ligne à ligne, hors cette fonction nommée.

---

## [1.4.3] - 2026-11-01
### ✅ Seules les séries cochées sont enregistrées
- Les valeurs suggérées mais non validées ne sont plus ajoutées à l'historique : tonnage, records et paliers ne comptent que les séries cochées. Un exercice sans série cochée n'apparaît pas dans la séance enregistrée.
- Aucune série cochée : l'enregistrement est refusé.
- Série cochée avec un poids ou des répétitions invalides (vide, 0, répétitions non entières) : refus, l'exercice s'ouvre et le champ à corriger prend le focus.
- **Séance partielle : confirmation** (« Enregistrer N séries cochées ? M séries non cochées seront ignorées »).
- Modification d'une ancienne séance : les séries déjà enregistrées reviennent cochées, les autres restent à cocher.
- Les dernières charges ne mémorisent que les séries cochées ; message de fin avec le nombre de séries enregistrées ; courte phrase d'aide au-dessus du bouton d'enregistrement.
- Aucun changement de design.

---

## [1.4.2] - 2026-11-01
### 🎨 Retour aux couleurs d'origine sur trois éléments de la Séance
- Rappel « N'oublie pas d'arrêter le suivi de ta montre ! » : ambre d'origine.
- Badge du chrono de repos : fond de carte avec bordure et texte indigo (prêt), vert (en cours), rouge de séance C (terminé), comme avant.
- Barre de progression des séries de la séance : indigo d'origine (`--indigo`, `#3730E3` en clair, `#9AA1FF` en sombre).

---

## [1.4.1] - 2026-11-01
### 🎯 Ajustements du design après usage
- **Titre d'exercice sur une seule ligne** : l'exercice ouvert n'est plus enfermé dans une carte (icône 52 px, nom 18 px, boutons − / + 40 px), ce qui laisse la place au nom, même « Développé militaire », à 360 et 390 px.
- **Séries : le vert signale une série validée** (comme avant), le rouge n'est plus utilisé pour les séries. Série en cours = ligne surélevée avec case cerclée d'encre ; série validée = case verte avec coche.
- **Valeurs d'une série à faire en pâle** (suggestions non saisies, contraste volontairement bas) ; elles passent en encre dès qu'on les saisit ou que la série devient la série en cours. Valable en thème clair et sombre.
- **Badges Déload** : retour aux couleurs ambre d'origine (accueil, séance, historique), l'éclair suit la couleur du texte.

---

## [1.4.0] - 2026-10-31
### 🎨 Nouveau design « Blanc minimaliste » (thèmes clair et sombre)
- Fond uni, très peu de couleurs : encre noire (blanc cassé en sombre), rouge pour l'action, violet pour le bloc de progression globale. Plus de cartes ni de bordures ; des ombres basses et denses là où elles aident la lecture.
- **Programme** : grand bloc « Prochaine séance » (noir en clair, **blanc cassé en sombre**) avec bouton rouge rond ; exercices en grille 3 × 2 d'icônes sans cadre, avec ombre portée.
- **Navigation** : pastille flottante, l'onglet actif affiche son libellé (libellés accessibles conservés pour les lecteurs d'écran).
- **Séance** : champs en pastilles, série en cours surélevée avec validation rouge, séries validées en grisé ; chrono de repos prêt / en cours / terminé.
- **Pastilles A / B / C** en cercles de couleur ; pastille et tag **Déload** avec éclair rouge (accueil, séance, historique).
- **Graphiques** : bloc violet conservé dans les deux thèmes ; courbes et graduations aux couleurs du thème.
- Gris secondaire assombri pour respecter le contraste 4,5:1. Aucun changement de données ni de logique.

---

## [1.3.9] - 2026-10-30
### 🛡️ Durcissement sécurité
- Ajout d’une **Content-Security-Policy** limitant scripts, styles, images, polices et connexions à la même origine.
- Ajout de `js/security.js` : les sauvegardes JSON importées sont analysées et les caractères `<` / `>` sont retirés de toutes les chaînes afin de prévenir l’injection HTML ou JavaScript.
- `js/security.js` est préchargé par le service worker pour rester actif hors-ligne.

---

## [1.3.8] - 2026-10-29
### 🧭 Navigation du bas immobile dans le navigateur
- Seule une **zone centrale défile** (`#app-scroll`) ; le document lui-même ne défile plus. Dans Chrome (onglet normal), la barre d'adresse ne se replie donc plus et la barre de navigation du bas ne « saute » plus pendant le défilement.
- L'en-tête (et la bannière de séance) est maintenant fixe par construction, hors de la zone défilante. Le tirer-pour-rafraîchir reste désactivé (`overscroll-behavior: contain`).
- Le défilement revient en haut à chaque changement d'onglet.

---

## [1.3.7] - 2026-10-29
### 📌 En-tête fixe sur tous les onglets
- Le **nom de l'application avec son numéro de version et le titre de l'onglet** (Programme, Graphiques, Historique) restent désormais collés en haut de l'écran pendant le défilement, comme sur l'onglet Séance.

---

## [1.3.6] - 2026-10-29
### 📌 Bannière de séance stable
- L'**en-tête (titre) et la bannière** (nom de la séance, déload, progression, durée) forment désormais **un seul bloc collé en haut** de l'onglet Séance : plus de décalage de 15 px au premier défilement, plus de deux éléments collants indépendants qui pouvaient se désynchroniser (Android / barre d'adresse).
- La marge de défilement des exercices s'appuie sur la hauteur de ce bloc unique.

---

## [1.3.5] - 2026-10-29
### 🔠 Polices +1 px
- **Toutes les tailles de police augmentent d'1 px** (59 règles CSS : titres, chiffres, libellés, boutons, navigation, pastilles ; texte de base 17 px) ainsi que les textes des **graphiques** (légendes 13 px, dates de l'axe 10 px).
- Contrôle automatisé à 360 px et 390 px, thèmes clair et sombre, sur les 4 onglets (exercices ouverts, chrono lancé, fenêtre de modification, valeurs à 3 chiffres) : **aucun texte rogné, aucun débordement, pas de défilement horizontal**.
- Ajustements pour que rien ne se dégrade : dates de l'axe des graphiques toujours à l'horizontale (certaines sont sautées plutôt qu'inclinées) ; sur écran étroit (≤ 380 px), icône de l'exercice ouvert et boutons − / + légèrement réduits (44 px et 40 px) pour que « Presse à cuisses » reste sur une ligne.

---

## [1.3.4] - 2026-10-29
### 🛡️ La saisie en cours n'est plus perdue
- **Brouillon de séance** : poids, répétitions, séries validées, nombre de séries, exercice ouvert et chrono sont copiés dans la mémoire de l'appareil à chaque action, et **restaurés automatiquement** si l'application se recharge (tirer pour rafraîchir par erreur, application fermée par le système, mise à jour...). Le brouillon est effacé à l'enregistrement de la séance et abandonné au bout de 24 h. Il survit aussi à la modification d'une ancienne séance.
- **Plus de « tirer pour rafraîchir »** : le geste du navigateur qui rechargeait l'application est désactivé (`overscroll-behavior`).
- Le chrono de séance affiche tout de suite la bonne durée au lieu de repartir de 00:00 pendant une seconde.

---

## [1.3.3] - 2026-10-29
### 🔤 Police des titres : Saira Semi Condensed
- **Titres et chiffres** passent de Chakra Petch à **Saira Semi Condensed** (600 / 700) : sportive et technique, plus discrète et plus étroite. Le texte courant reste en Figtree.
- Police embarquée en local (licence SIL OFL 1.1) et préchargée par le service worker : fonctionne hors-ligne. Les fichiers Chakra Petch sont supprimés.

---

## [1.3.2] - 2026-10-28
### 🖼️ Icônes d'exercices sans fond
- Les 18 icônes sont **détourées** (PNG transparents) et recadrées au plus juste : plus de fond gris propre à chaque image, ni de tuile arrondie derrière. Elles se posent directement sur le fond de la carte, en thème clair comme en thème sombre.
- Emplacements légèrement agrandis (tuiles du Programme 64 px, ligne d'exercice 48 px, exercice ouvert 60 px) et affichage sans recadrage (`object-fit: contain`).
- Images redimensionnées en 192×192 : ≈ 490 Ko au total (≈ 690 Ko avant).
- L'icône d'écran d'accueil (manifest et `apple-touch-icon`) garde l'image d'origine dans `icons/app-icon.png` (une icône transparente s'afficherait sur fond noir) ; ajoutée à `ASSETS` du service worker.

---

## [1.3.1] - 2026-10-28
### 🌙 Thème sombre
- **Nouvelle carte « Apparence »** en haut de l'onglet Historique (sous Sauvegarder / Restaurer) : **Clair / Sombre / Auto**. « Auto » suit le réglage du téléphone, y compris quand il change en cours d'utilisation. **Clair par défaut.**
- Le choix est mémorisé sur l'appareil (`h49_theme`) et n'est pas inclus dans la sauvegarde des séances.
- Palette sombre « ardoise bleutée » : fond `#0B0F1A`, cartes `#151B2B`, texte `#E8ECF5`. Primaire éclairci pour le texte et les icônes, boutons en indigo `#4F46E5`, vert/ambre éclaircis pour les états. Le bloc héros indigo, les pastilles A/B/C et les icônes d'exercices sont inchangés.
- **Pas de flash blanc** au lancement : le thème est appliqué par un petit script avant le premier affichage. La couleur de la barre du navigateur (`theme-color`) suit le thème. Barre d'état iOS laissée en `default`.
- **Graphiques** : couleurs lues depuis les variables CSS (`--chart-*`) et redessinées au changement de thème.
- Design : nouveaux jetons (`--primary-strong`, `--hero-bg`, `--on-success`, `--danger`, ombres et voile de fenêtre) ; le thème clair reste visuellement identique.

---

## [1.3.0] - 2026-10-28
### 🔤 Nouvelle police : Chakra Petch
- **Titres et chiffres** (titres d'écran, poids des séries, indice de progression, tonnages, chrono) passent de Bricolage Grotesque à **Chakra Petch** (600 / 700), plus sportive et technique. Le texte courant reste en Figtree.
- Police embarquée en local (licence SIL OFL 1.1) et préchargée par le service worker : fonctionne hors-ligne. Les fichiers Bricolage Grotesque sont supprimés.
- Contrôle en thème clair à 360 px et 390 px : aucun débordement sur les 4 onglets.

---

## [1.2.1] - 2026-10-22
### 🔧 Écran Séance
- **En-tête fixe** : le titre, le chrono de pause, la pastille de séance, le déload et la progression (« n / total séries », durée, barre) restent à l'écran pendant le défilement des exercices. Le chrono n'en recouvre plus le contenu.
- Suppression de la ligne « Prochaine séance : X » sous le titre (redondante) ; en modification, la date est indiquée dans l'étiquette « Modification · jj/mm ».

---

## [1.2.0] - 2026-10-22
### 🎨 Nouveau design - étape 7/7 : finition (design terminé)
- **Ligne de contexte** sous le titre (« Prochaine séance : A ») affichée uniquement sur l'onglet Séance.
- **Mode hors-ligne** : toutes les icônes d'exercices sont désormais préchargées par le service worker (testé en coupant le réseau : 4 onglets et images OK).
- Contrôle de cohérence : les couleurs restantes écrites en dur sont volontaires (blanc sur le bloc indigo, ombres, fond de fenêtre, couleurs A/B/C nécessaires aux graphiques).

---

## [1.1.17] - 2026-10-22
### 🎨 Nouveau design - étape 6/7 : Historique
- **En-tête** : compteur « N séances enregistrées » ; boutons Sauvegarder / Restaurer en haut de page (plus de barre fixe au-dessus de la navigation).
- **Liste groupée par mois** (titre du mois + « N séances · X T »), chaque ligne affichant pastille de séance, date (« Sam. 10 oct. »), durée (ou « Durée non enregistrée »), tonnage et chevron ; pastille « Déload » le cas échéant.
- **Fenêtre de modification** restylée (pastille, résumé de la séance, boutons aux couleurs du thème) ; elle se ferme aussi en touchant le fond.

---

## [1.1.16] - 2026-10-22
### 🎨 Nouveau design - étape 5/7 : Graphiques et analyse
- **Bloc héros indigo** : indice de progression global en grand, pastille « X % vs mois précédent », filtres Séances / Par mois / A·B·C et courbe de volume blanche.
- **4 derniers mois** en barres horizontales (le mois courant en indigo, libellé « Ce mois-ci »).
- **Records**, **paliers** et **progression par séance** (A/B/C en barres colorées) présentés en cartes séparées.
- **Progression par exercice** : bascule Charge max / Volume cumulé et bande ambre sur les séances du palier en cours.
- **Poids corporel** : valeur actuelle en grand, courbe et champ d'ajout restylés.

---

## [1.1.15] - 2026-10-22
### 🎨 Nouveau design - étape 4/7 : écran Séance
- **En-tête de séance** : pastille A/B/C, nom de la séance, pastille « Déload actif » et barre de progression des séries avec durée.
- **Exercices en accordéon** : un seul exercice ouvert à la fois (le suivant s'ouvre quand l'exercice est terminé), résumé « N séries · charges » sur les exercices fermés.
- **Exercice ouvert** : ligne « Dernière fois · N kg max » (calculée depuis l'historique), boutons − / + pour le nombre de séries, grandes cases Kg / Réps et validation par coche.
- **Chrono** : puce flottante avec icône horloge, qui ne masque plus l'exercice ouvert.

---

## [1.1.14] - 2026-10-21
### 🎨 Nouveau design - étape 3/7 : écran Programme
- **Carte « Prochaine séance »** : pastille de la séance (A/B/C), nom, pastille « Déload actif » si besoin,
  gros bouton « Démarrer la séance » (ouvre l'onglet Séance) et rappel d'échauffement.
- **« Au programme »** : exercices de la prochaine séance en grille de 3 colonnes (icône + nom).
- **« Ensuite »** : les deux autres séances sur une ligne chacune ; un appui déplie la liste de leurs exercices.
- Le rappel d'échauffement du haut de page est intégré à la carte.

---

## [1.1.13] - 2026-10-21
### 🎨 Nouveau design - étape 2/7 : en-tête et navigation
- **Navigation flottante** : barre blanche arrondie, détachée des bords et du bas de l'écran, avec icônes
  fines ; l'onglet actif est sur fond indigo clair.
- **En-tête de page** : grand titre de l'onglet (Programme, Séance, Graphiques, Historique) avec, au-dessus,
  le nom de l'application et sa version, et en dessous le contexte (ex. « Prochaine séance : A »).
- **Chrono de repos** : devient une puce flottante en haut à droite, toujours accessible pendant la séance.
- Barre de sauvegarde de l'onglet Historique repositionnée au-dessus de la navigation.
- Aucun changement de fonctionnement.

---

## [1.1.12] - 2026-10-20
### 🎨 Nouveau design - étape 1/7 : polices et thème clair
- Thème clair indigo (fond clair, cartes blanches, couleur principale indigo) appliquée à toute l'application,
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
- Modification d'une séance : le compteur de durée n'affiche plus un « 00:00 » trompeur. Il indique désormais la durée enregistrée de la séance (libellé « Durée enregistrée »), ou « N/A » si la durée n'était pas renseignée.
- Le chrono ne démarre plus tout seul lors de la saisie d'une série pendant une modification, ce qui évite d'écraser la durée d'origine par « < 1 min ».

---

## [1.0.2] - 2026-10-17
### 🐛 Corrections
- Modification d'une séance : l'originale n'est plus supprimée de l'historique dès l'ouverture du formulaire. Elle n'est remplacée qu'à la validation, ce qui évite toute perte de données si l'on quitte l'application en cours de modification.
- La durée et le statut de déload d'origine sont conservés lors de la modification d'une séance.
- La modification d'une ancienne séance ne change pas les dernières charges utilisées pour les suggestions.
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
