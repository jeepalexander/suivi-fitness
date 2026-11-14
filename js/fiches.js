// Fiches d'exercice (1.7.84, co-auteur : Claude) : comment bien faire chaque exercice du catalogue.
// Ouvertes par un appui long sur n'importe quelle image d'exercice. Clé = id du catalogue (js/catalogue.js).
//   f : « Bien faire » (étapes, dans l'ordre du mouvement) · e : « À éviter » · m : muscles travaillés
// Conseils généraux de technique ; ils ne remplacent pas l'avis d'un coach ou d'un professionnel de santé.
const FICHES = {
  // ---------- Jambes ----------
  1: { f: ["Dos et bassin bien plaqués contre le dossier.", "Pieds à largeur de hanches, au milieu (voire plus bas) de la plateforme.", "Descends jusqu'à ce que les genoux forment un angle droit environ, sans décoller le bas du dos.", "Pousse avec tout le pied, genoux dans l'axe des pieds, sans verrouiller en haut."],
       e: ["Laisser les genoux rentrer vers l'intérieur.", "Descendre si bas que le bassin s'enroule.", "Verrouiller les genoux en extension."], m: "Quadriceps, fessiers, ischio-jambiers." },
  2: { f: ["Barre posée sur le haut du dos, mains serrées, coudes sous la barre.", "Pieds à largeur d'épaules, pointes légèrement ouvertes.", "Inspire, gaine le ventre, puis descends en poussant les hanches en arrière et les genoux vers l'avant.", "Descends au moins cuisses parallèles au sol, dos neutre, puis remonte en poussant dans le sol."],
       e: ["Arrondir le bas du dos en bas du mouvement.", "Décoller les talons.", "Laisser les genoux rentrer en montant."], m: "Quadriceps, fessiers, adducteurs, lombaires." },
  3: { f: ["Un haltère dans chaque main, bras le long du corps.", "Pieds à largeur d'épaules, regard devant.", "Descends en poussant les hanches en arrière, buste droit, dos neutre.", "Remonte en poussant dans les talons et le milieu du pied."],
       e: ["Arrondir le dos pour aller plus bas.", "Laisser les genoux rentrer."], m: "Quadriceps, fessiers, adducteurs." },
  4: { f: ["Tiens un haltère ou une kettlebell contre la poitrine, coudes vers le bas.", "Pieds un peu plus larges que les épaules, pointes ouvertes.", "Descends entre tes jambes, buste droit, coudes à l'intérieur des genoux.", "Remonte en gardant la charge collée au corps."],
       e: ["Laisser la charge s'éloigner de la poitrine.", "S'enrouler vers l'avant en bas."], m: "Quadriceps, fessiers, gainage." },
  5: { f: ["Pied arrière posé sur un banc, pied avant assez loin devant.", "Buste droit ou légèrement penché, haltères le long du corps.", "Descends le genou arrière vers le sol, genou avant dans l'axe du pied.", "Remonte en poussant dans le talon avant ; change de jambe à la fin de la série."],
       e: ["Pied avant trop proche du banc (genou qui part loin devant).", "Pousser avec la jambe arrière."], m: "Quadriceps, fessiers (jambe avant)." },
  6: { f: ["Dos et épaules bien calés contre le dossier.", "Pieds à largeur de hanches, au milieu de la plateforme.", "Descends lentement jusqu'aux cuisses parallèles ou un peu plus bas.", "Remonte en poussant avec tout le pied, sans verrouiller les genoux."],
       e: ["Décoller les talons.", "Rebondir en bas du mouvement."], m: "Quadriceps, fessiers." },
  7: { f: ["Debout, un haltère dans chaque main.", "Fais un grand pas en avant.", "Descends jusqu'à ce que le genou arrière frôle le sol, buste droit.", "Repousse avec le pied avant pour revenir debout ; alterne ou enchaîne une jambe."],
       e: ["Pas trop court : le genou avant dépasse largement le pied.", "Laisser le genou avant rentrer vers l'intérieur."], m: "Quadriceps, fessiers, ischio-jambiers." },
  8: { f: ["Un haltère dans chaque main, regard devant.", "Avance d'un grand pas et descends le genou arrière vers le sol.", "Pousse sur le pied avant et enchaîne directement le pas suivant.", "Garde le buste droit et un rythme régulier."],
       e: ["Pas trop courts ou trop rapides.", "Buste qui bascule vers l'avant."], m: "Quadriceps, fessiers, ischio-jambiers." },
  9: { f: ["Place tout le pied sur un banc ou une box stable.", "Monte en poussant dans le talon du pied posé sur le banc.", "Tends complètement la jambe en haut, sans t'aider de la jambe arrière.", "Redescends lentement et contrôle la descente."],
       e: ["Pousser avec le pied resté au sol.", "Banc trop haut (genou plus haut que la hanche)."], m: "Quadriceps, fessiers." },
  10: { f: ["Pieds à largeur de hanches, barre au-dessus du milieu du pied.", "Attrape la barre, tibias contre la barre, dos plat, épaules au-dessus de la barre.", "Inspire, gaine, puis pousse dans le sol en gardant la barre collée aux jambes.", "Termine debout en serrant les fessiers ; redescends en poussant les hanches en arrière."],
        e: ["Arrondir le dos.", "Barre qui s'éloigne des jambes.", "Se cambrer en arrière en haut."], m: "Fessiers, ischio-jambiers, lombaires, dos, trapèzes." },
  11: { f: ["Debout, barre tenue bras tendus, genoux légèrement fléchis.", "Pousse les hanches en arrière en laissant glisser la barre le long des cuisses.", "Descends jusqu'à sentir l'étirement des ischio-jambiers, dos plat.", "Remonte en ramenant les hanches vers l'avant."],
        e: ["Arrondir le dos pour descendre plus bas.", "Plier les genoux comme pour un squat."], m: "Ischio-jambiers, fessiers, lombaires." },
  12: { f: ["Debout, jambes presque tendues, barre bras tendus.", "Bascule le buste vers l'avant en gardant le dos plat.", "Descends jusqu'à l'étirement des ischio-jambiers, sans forcer.", "Remonte en contrôlant, hanches vers l'avant."],
        e: ["Arrondir le dos.", "Verrouiller les genoux complètement."], m: "Ischio-jambiers, fessiers, lombaires." },
  13: { f: ["Haut du dos appuyé sur un banc, barre sur le pli des hanches (avec une mousse).", "Pieds à plat, tibias verticaux en haut du mouvement.", "Pousse les hanches vers le haut jusqu'à l'alignement épaules-hanches-genoux.", "Serre les fessiers une seconde en haut, puis redescends en contrôlant."],
        e: ["Se cambrer pour monter plus haut.", "Pousser avec la pointe des pieds."], m: "Fessiers, ischio-jambiers." },
  14: { f: ["Haut du dos sur un banc, haltère posé sur le pli des hanches.", "Pieds à plat, à largeur de hanches.", "Monte les hanches jusqu'à l'alignement épaules-hanches-genoux.", "Marque une pause en serrant les fessiers, puis redescends."],
        e: ["Cambrer le bas du dos en haut.", "Descendre trop vite."], m: "Fessiers, ischio-jambiers." },
  15: { f: ["Règle le siège : genoux alignés avec l'axe de la machine.", "Boudin posé sur le bas des tibias, dos contre le dossier.", "Tends les jambes jusqu'en haut et serre les cuisses une seconde.", "Redescends lentement, sans laisser la charge retomber."],
        e: ["Donner des à-coups.", "Décoller les fesses du siège."], m: "Quadriceps." },
  16: { f: ["Même réglage que la leg extension, une seule jambe sur le boudin.", "Dos calé, mains sur les poignées.", "Tends la jambe complètement et marque une pause.", "Redescends lentement ; fais le même nombre de répétitions de chaque côté."],
        e: ["Compenser avec le bassin.", "Choisir une charge trop lourde pour la jambe la plus faible."], m: "Quadriceps (une jambe à la fois)." },
  17: { f: ["Allongé sur le ventre, genoux juste après le bord du banc.", "Boudin au-dessus des talons, bassin plaqué.", "Ramène les talons vers les fesses sans décoller le bassin.", "Redescends lentement jusqu'aux jambes presque tendues."],
        e: ["Décoller les hanches du banc.", "Laisser retomber la charge."], m: "Ischio-jambiers, mollets." },
  18: { f: ["Règle le siège : genoux alignés avec l'axe de la machine.", "Boudin au-dessus des talons, cuisses bloquées par l'appui.", "Ramène les talons sous le siège en contrôlant.", "Remonte lentement jusqu'aux jambes presque tendues."],
        e: ["Décoller les cuisses de l'appui.", "Mouvement trop rapide."], m: "Ischio-jambiers." },
  19: { f: ["Assis, dos contre le dossier, coussins contre l'extérieur des genoux.", "Écarte les jambes en contrôlant le mouvement.", "Marque une courte pause jambes écartées.", "Reviens lentement sans laisser les plaques se toucher."],
        e: ["Balancer le buste pour aider.", "Laisser la charge claquer au retour."], m: "Moyen fessier, abducteurs." },
  20: { f: ["Assis, dos contre le dossier, coussins contre l'intérieur des genoux.", "Serre les jambes l'une vers l'autre en contrôlant.", "Marque une courte pause jambes serrées.", "Reviens lentement à l'ouverture de départ."],
        e: ["Ouverture de départ trop grande.", "Donner des à-coups."], m: "Adducteurs." },
  21: { f: ["Pointe des pieds sur le bord de la marche ou de la plateforme.", "Laisse descendre les talons pour étirer les mollets.", "Monte le plus haut possible sur la pointe des pieds.", "Marque une pause en haut, puis redescends lentement."],
        e: ["Rebondir en bas du mouvement.", "Plier les genoux pour aider."], m: "Mollets (gastrocnémiens)." },
  22: { f: ["Assis, avant des pieds sur le repose-pied, coussin sur le bas des cuisses.", "Laisse descendre les talons pour étirer.", "Monte les talons le plus haut possible.", "Marque une pause, puis redescends lentement."],
        e: ["Amplitude trop courte.", "Rebondir en bas."], m: "Mollets (soléaire)." },
  23: { f: ["Debout, un haltère dans chaque main ou dans une main avec appui.", "Pointe des pieds sur une marche, talons dans le vide.", "Monte sur la pointe des pieds le plus haut possible.", "Redescends lentement jusqu'à l'étirement."],
        e: ["Rebondir en bas.", "Perdre l'équilibre : tiens-toi d'une main si besoin."], m: "Mollets." },
  // ---------- Dos ----------
  25: { f: ["Assis, cuisses bloquées sous les boudins.", "Prise un peu plus large que les épaules, buste légèrement en arrière.", "Tire la barre vers le haut de la poitrine en abaissant les épaules.", "Remonte lentement jusqu'aux bras tendus."],
        e: ["Tirer derrière la nuque.", "Se balancer en arrière pour aider."], m: "Grand dorsal, biceps, arrière des épaules." },
  26: { f: ["Suspendu à la barre, prise un peu plus large que les épaules, paumes vers l'avant.", "Abaisse les épaules et gaine le ventre.", "Tire jusqu'à passer le menton au-dessus de la barre.", "Redescends en contrôlant jusqu'aux bras tendus."],
        e: ["Se balancer pour monter.", "Faire des demi-répétitions."], m: "Grand dorsal, biceps, trapèzes." },
  27: { f: ["Règle l'assistance : plus elle est lourde, plus c'est facile.", "Genoux ou pieds sur l'appui, prise un peu plus large que les épaules.", "Tire jusqu'au menton au-dessus de la barre en abaissant les épaules.", "Redescends lentement jusqu'aux bras tendus."],
        e: ["Garder trop d'assistance : diminue-la au fil des séances.", "Amplitude incomplète."], m: "Grand dorsal, biceps." },
  28: { f: ["Suspendu aux poignées parallèles, paumes face à face.", "Abaisse les épaules, gaine le ventre.", "Tire jusqu'au menton au-dessus des poignées, coudes près du corps.", "Redescends en contrôlant jusqu'aux bras tendus."],
        e: ["Se balancer.", "Lâcher la descente."], m: "Grand dorsal, biceps, brachial." },
  29: { f: ["Debout, barre en main, genoux fléchis.", "Penche le buste à 45° environ, dos plat.", "Tire la barre vers le bas du ventre en serrant les omoplates.", "Redescends en contrôlant, sans redresser le buste."],
        e: ["Arrondir le dos.", "Se redresser à chaque répétition."], m: "Grand dorsal, rhomboïdes, trapèzes, biceps." },
  30: { f: ["Un haltère dans chaque main, buste penché à 45° environ, dos plat.", "Bras tendus sous les épaules.", "Tire les haltères vers les hanches en serrant les omoplates.", "Redescends lentement."],
        e: ["Arrondir le dos.", "Tirer avec élan."], m: "Grand dorsal, rhomboïdes, biceps." },
  31: { f: ["Une main et un genou sur le banc, dos plat.", "Haltère dans l'autre main, bras tendu.", "Tire l'haltère vers la hanche, coude près du corps.", "Redescends lentement ; change de côté à la fin de la série."],
        e: ["Tourner le buste pour monter plus haut.", "Tirer vers l'épaule plutôt que vers la hanche."], m: "Grand dorsal, rhomboïdes, biceps." },
  32: { f: ["Assis, pieds calés, buste droit.", "Saisis la poignée bras tendus.", "Tire vers le bas du ventre en serrant les omoplates.", "Reviens lentement, bras tendus, sans arrondir le dos."],
        e: ["Se balancer d'avant en arrière.", "Hausser les épaules."], m: "Grand dorsal, rhomboïdes, biceps." },
  33: { f: ["Assis face à la poulie basse, genoux légèrement fléchis.", "Buste droit, poignée en main, bras tendus.", "Tire la poignée vers le ventre en serrant les omoplates.", "Reviens en contrôlant, épaules basses."],
        e: ["Se pencher en arrière pour tirer.", "Arrondir le dos au retour."], m: "Grand dorsal, rhomboïdes, biceps." },
  34: { f: ["Debout face à la poulie haute, barre ou corde en main, bras presque tendus.", "Buste légèrement penché, ventre gainé.", "Ramène la barre vers les cuisses en gardant les bras tendus.", "Remonte lentement jusqu'à hauteur des yeux."],
        e: ["Plier les coudes (le mouvement devient un tirage).", "Se balancer."], m: "Grand dorsal." },
  35: { f: ["Poulie à hauteur du visage, corde en main, paumes face à face.", "Recule d'un pas, bras tendus.", "Tire la corde vers le visage en écartant les mains, coudes hauts.", "Reviens lentement."],
        e: ["Charge trop lourde : tu tires avec le dos et non les épaules.", "Coudes qui descendent."], m: "Arrière des épaules, trapèzes, rotateurs de l'épaule." },
  36: { f: ["Allongé en travers ou le long d'un banc, haltère tenu à deux mains au-dessus de la poitrine.", "Coudes légèrement fléchis, fixes.", "Descends l'haltère derrière la tête jusqu'à l'étirement.", "Ramène-le au-dessus de la poitrine."],
        e: ["Descendre trop loin (épaules qui tirent).", "Plier et tendre les coudes pendant le mouvement."], m: "Grand dorsal, pectoraux." },
  37: { f: ["Debout, un haltère dans chaque main, bras le long du corps.", "Monte les épaules vers les oreilles.", "Marque une pause d'une seconde en haut.", "Redescends lentement."],
        e: ["Faire des rotations d'épaules.", "Plier les coudes."], m: "Trapèzes supérieurs." },
  38: { f: ["Debout, barre tenue bras tendus devant les cuisses.", "Monte les épaules vers les oreilles.", "Marque une pause d'une seconde en haut.", "Redescends lentement."],
        e: ["Rouler les épaules.", "Donner de l'élan avec les jambes."], m: "Trapèzes supérieurs." },
  // ---------- Pectoraux ----------
  39: { f: ["Allongé, yeux sous la barre, pieds à plat au sol.", "Omoplates serrées et basses, légère cambrure, fessiers sur le banc.", "Mains un peu plus larges que les épaules, poignets droits.", "Descends la barre jusqu'au bas des pectoraux, coudes à 45° environ.", "Pousse en expirant, jusqu'aux bras tendus sans verrouiller."],
        e: ["Faire rebondir la barre sur la poitrine.", "Décoller les fessiers du banc.", "Coudes écartés à 90° (épaules exposées)."], m: "Pectoraux, avant des épaules, triceps." },
  40: { f: ["Allongé, un haltère dans chaque main au-dessus de la poitrine.", "Omoplates serrées, pieds à plat.", "Descends les haltères sur les côtés de la poitrine, coudes à 45° environ.", "Pousse jusqu'aux bras tendus en rapprochant légèrement les haltères."],
        e: ["Descendre trop bas (épaules en avant).", "Choquer les haltères en haut."], m: "Pectoraux, avant des épaules, triceps." },
  41: { f: ["Banc incliné à 30° environ, omoplates serrées.", "Mains un peu plus larges que les épaules.", "Descends la barre vers le haut de la poitrine.", "Pousse jusqu'aux bras tendus sans verrouiller."],
        e: ["Banc trop incliné (le travail passe aux épaules).", "Décoller les fessiers."], m: "Haut des pectoraux, avant des épaules, triceps." },
  42: { f: ["Banc incliné à 30° environ, un haltère dans chaque main.", "Omoplates serrées, pieds à plat.", "Descends les haltères sur les côtés du haut de la poitrine.", "Pousse jusqu'aux bras tendus."],
        e: ["Banc trop incliné.", "Descente trop rapide."], m: "Haut des pectoraux, avant des épaules, triceps." },
  43: { f: ["Banc décliné, jambes bien calées.", "Omoplates serrées, mains un peu plus larges que les épaules.", "Descends la barre vers le bas de la poitrine.", "Pousse jusqu'aux bras tendus ; fais-toi aider pour sortir la barre."],
        e: ["Descendre vers le cou.", "Travailler seul avec une charge lourde."], m: "Bas des pectoraux, triceps." },
  44: { f: ["Mains sur les barres parallèles, bras tendus, épaules basses.", "Penche légèrement le buste vers l'avant.", "Descends jusqu'aux coudes à angle droit environ.", "Remonte jusqu'aux bras tendus."],
        e: ["Descendre trop bas si les épaules tirent.", "Hausser les épaules."], m: "Pectoraux, triceps, avant des épaules." },
  45: { f: ["Mains un peu plus larges que les épaules, corps aligné de la tête aux talons.", "Gaine le ventre et serre les fessiers.", "Descends la poitrine près du sol, coudes à 45° environ.", "Remonte jusqu'aux bras tendus."],
        e: ["Laisser le bassin s'affaisser.", "Coudes écartés à 90°."], m: "Pectoraux, triceps, avant des épaules, gainage." },
  46: { f: ["Lest sur le dos (gilet ou disque calé), corps aligné.", "Mains un peu plus larges que les épaules.", "Descends la poitrine près du sol, coudes à 45° environ.", "Remonte jusqu'aux bras tendus."],
        e: ["Lest mal calé qui glisse.", "Bassin qui s'affaisse."], m: "Pectoraux, triceps, avant des épaules." },
  47: { f: ["Allongé, haltères au-dessus de la poitrine, coudes légèrement fléchis.", "Ouvre les bras en arc de cercle, coudes fixes.", "Descends jusqu'à l'étirement des pectoraux, sans aller plus loin.", "Ramène les haltères au-dessus de la poitrine comme pour serrer un arbre."],
        e: ["Tendre complètement les bras.", "Charge trop lourde (le mouvement devient un développé)."], m: "Pectoraux." },
  48: { f: ["Banc incliné à 30° environ, coudes légèrement fléchis.", "Ouvre les bras en arc de cercle.", "Descends jusqu'à l'étirement du haut des pectoraux.", "Ramène les haltères au-dessus de la poitrine."],
        e: ["Descendre trop bas.", "Plier les coudes en cours de mouvement."], m: "Haut des pectoraux." },
  49: { f: ["Entre deux poulies hautes, une poignée dans chaque main, un pied en avant.", "Coudes légèrement fléchis, buste un peu penché.", "Ramène les mains devant toi en arc de cercle jusqu'à les croiser.", "Reviens lentement jusqu'à l'étirement."],
        e: ["Plier les coudes pour tirer.", "Revenir trop loin en arrière."], m: "Pectoraux." },
  50: { f: ["Face à la poulie haute, barre ou corde en main, bras presque tendus.", "Buste légèrement penché vers l'avant.", "Ramène la barre vers les cuisses en arc de cercle.", "Remonte lentement."],
        e: ["Plier les coudes.", "Se balancer."], m: "Pectoraux, grand dorsal." },
  // ---------- Épaules ----------
  51: { f: ["Debout, barre au niveau des clavicules, mains un peu plus larges que les épaules.", "Gaine le ventre et serre les fessiers.", "Pousse la barre au-dessus de la tête en écartant légèrement le visage.", "Termine bras tendus, barre au-dessus du milieu du pied ; redescends en contrôlant."],
        e: ["Se cambrer fortement.", "Pousser la barre devant soi au lieu de la monter droite."], m: "Épaules, triceps, haut des pectoraux." },
  52: { f: ["Assis, dos contre le dossier, haltères à hauteur des épaules.", "Paumes vers l'avant, coudes sous les poignets.", "Pousse les haltères au-dessus de la tête.", "Redescends jusqu'au niveau des oreilles environ."],
        e: ["Décoller le dos du dossier.", "Choquer les haltères en haut."], m: "Épaules, triceps." },
  53: { f: ["Assis, haltères devant les épaules, paumes vers toi.", "Pousse vers le haut en tournant les paumes vers l'avant.", "Termine bras tendus au-dessus de la tête.", "Redescends en refaisant la rotation inverse."],
        e: ["Charge trop lourde pour contrôler la rotation.", "Se cambrer."], m: "Épaules (avant et côtés), triceps." },
  54: { f: ["Règle le siège : poignées à hauteur des épaules.", "Dos contre le dossier.", "Pousse jusqu'aux bras presque tendus.", "Redescends lentement."],
        e: ["Décoller le dos.", "Verrouiller les coudes."], m: "Épaules, triceps." },
  55: { f: ["Debout, haltères le long du corps, coudes légèrement fléchis.", "Monte les bras sur les côtés jusqu'à la hauteur des épaules.", "Mène le mouvement avec les coudes, petits doigts légèrement plus hauts.", "Redescends lentement."],
        e: ["Se balancer pour monter.", "Monter au-dessus des épaules en haussant les trapèzes."], m: "Épaules (faisceau latéral)." },
  56: { f: ["Debout, haltères devant les cuisses.", "Monte un bras ou les deux devant toi jusqu'à la hauteur des yeux.", "Coudes légèrement fléchis.", "Redescends lentement."],
        e: ["Se pencher en arrière.", "Donner de l'élan."], m: "Avant des épaules." },
  57: { f: ["Buste penché vers l'avant, dos plat, haltères sous la poitrine.", "Coudes légèrement fléchis.", "Ouvre les bras sur les côtés jusqu'à la hauteur des épaules.", "Redescends lentement."],
        e: ["Se redresser pendant le mouvement.", "Serrer les omoplates au lieu de travailler l'arrière des épaules."], m: "Arrière des épaules, rhomboïdes." },
  58: { f: ["Debout, barre ou haltères devant les cuisses, prise à largeur d'épaules.", "Monte la charge le long du corps, coudes devant et plus hauts que les mains.", "Arrête-toi à hauteur de la poitrine.", "Redescends lentement."],
        e: ["Prise trop serrée.", "Monter jusqu'au menton si les épaules gênent."], m: "Épaules, trapèzes." },
  // ---------- Bras ----------
  59: { f: ["Debout, haltères le long du corps, paumes vers l'avant.", "Coudes collés au buste.", "Monte les haltères vers les épaules en serrant les biceps.", "Redescends lentement jusqu'aux bras tendus."],
        e: ["Balancer le buste.", "Avancer les coudes."], m: "Biceps." },
  60: { f: ["Debout, barre EZ en main sur les poignées inclinées.", "Coudes collés au buste.", "Monte la barre vers les épaules.", "Redescends lentement jusqu'aux bras tendus."],
        e: ["Se cambrer pour monter.", "Lâcher la descente."], m: "Biceps, brachial." },
  62: { f: ["Assis sur un banc incliné à 45° environ, bras pendants.", "Paumes vers l'avant.", "Monte les haltères sans avancer les coudes.", "Redescends lentement jusqu'à l'étirement complet."],
        e: ["Décoller le dos du banc.", "Avancer les coudes."], m: "Biceps (chef long)." },
  63: { f: ["Debout, haltères le long du corps, paumes face à face.", "Coudes collés au buste.", "Monte les haltères en gardant les paumes face à face.", "Redescends lentement."],
        e: ["Balancer les haltères.", "Tourner les poignets."], m: "Brachial, biceps, avant-bras." },
  64: { f: ["Face à la poulie basse, barre ou corde en main.", "Coudes collés au buste.", "Monte vers les épaules en serrant les biceps.", "Redescends lentement, la tension reste constante."],
        e: ["Reculer les coudes.", "Se pencher en arrière."], m: "Biceps." },
  65: { f: ["Assis, coude posé contre l'intérieur de la cuisse.", "Haltère en main, bras tendu.", "Monte l'haltère vers l'épaule.", "Redescends lentement ; change de bras à la fin de la série."],
        e: ["Décoller le coude de la cuisse.", "Aider avec l'épaule."], m: "Biceps." },
  66: { f: ["Face à la poulie haute, barre ou corde en main.", "Coudes collés au buste, fixes.", "Pousse vers le bas jusqu'aux bras tendus.", "Remonte lentement jusqu'à l'angle droit environ."],
        e: ["Écarter les coudes.", "Se pencher au-dessus de la charge."], m: "Triceps." },
  68: { f: ["Assis ou debout, haltère tenu à deux mains au-dessus de la tête.", "Coudes pointés vers le haut, près de la tête.", "Descends l'haltère derrière la tête.", "Remonte jusqu'aux bras tendus."],
        e: ["Écarter les coudes.", "Se cambrer."], m: "Triceps (chef long)." },
  69: { f: ["Allongé sur un banc, barre EZ ou haltères bras tendus au-dessus du front.", "Coudes fixes, pointés vers le plafond.", "Descends la charge vers le front en pliant les coudes.", "Remonte jusqu'aux bras tendus."],
        e: ["Laisser les coudes s'écarter.", "Bouger les épaules."], m: "Triceps." },
  70: { f: ["Buste penché, une main en appui, haltère dans l'autre main.", "Bras collé au corps, coude plié à angle droit.", "Tends le bras vers l'arrière.", "Reviens lentement ; change de côté."],
        e: ["Bouger le coude.", "Donner de l'élan."], m: "Triceps." },
  71: { f: ["Mains sur les barres parallèles ou un banc, buste droit.", "Coudes près du corps.", "Descends jusqu'aux coudes à angle droit environ.", "Remonte jusqu'aux bras tendus."],
        e: ["Pencher le buste en avant (le travail passe aux pectoraux).", "Descendre trop bas si les épaules tirent."], m: "Triceps, pectoraux." },
  // ---------- Abdos ----------
  72: { f: ["Allongé, genoux fléchis, pieds au sol, mains derrière la tête sans tirer.", "Enroule le haut du dos en décollant les épaules.", "Monte en expirant.", "Redescends lentement."],
        e: ["Tirer sur la nuque.", "Se relever avec élan."], m: "Grands droits de l'abdomen." },
  73: { f: ["À genoux face à la poulie haute, corde tenue près de la tête.", "Enroule le buste vers le sol en rapprochant les côtes du bassin.", "Expire en descendant.", "Remonte lentement sans relâcher la tension."],
        e: ["Tirer avec les bras.", "Bouger les hanches au lieu d'enrouler le buste."], m: "Grands droits de l'abdomen." },
  74: { f: ["Suspendu à la barre, bras tendus, épaules basses.", "Monte les genoux ou les jambes tendues vers la poitrine.", "Enroule le bassin en haut.", "Redescends lentement sans te balancer."],
        e: ["Se balancer.", "Monter les jambes sans enrouler le bassin."], m: "Abdominaux, fléchisseurs de hanche." },
  75: { f: ["Allongé sur le dos, mains sous les fesses ou le long du corps.", "Bas du dos plaqué au sol.", "Monte les jambes jusqu'à la verticale.", "Redescends lentement sans toucher le sol."],
        e: ["Cambrer le bas du dos.", "Laisser retomber les jambes."], m: "Bas des abdominaux, fléchisseurs de hanche." },
  76: { f: ["Appui sur les avant-bras, coudes sous les épaules.", "Corps aligné de la tête aux talons.", "Serre les fessiers et gaine le ventre.", "Respire normalement et tiens la position."],
        e: ["Laisser le bassin s'affaisser.", "Lever les fesses trop haut."], m: "Gainage abdominal, transverse." },
  77: { f: ["Sur le côté, appui sur l'avant-bras, coude sous l'épaule.", "Pieds l'un sur l'autre, corps aligné.", "Monte le bassin et tiens la position.", "Change de côté à mi-temps."],
        e: ["Laisser le bassin descendre.", "Tourner le buste vers le sol."], m: "Obliques, gainage latéral." },
  78: { f: ["Assis, genoux fléchis, buste incliné en arrière, dos droit.", "Mains jointes ou charge tenue devant la poitrine.", "Tourne le buste d'un côté puis de l'autre.", "Garde les pieds au sol pour commencer, puis décolle-les."],
        e: ["Arrondir le dos.", "Bouger seulement les bras."], m: "Obliques, abdominaux." },
  79: { f: ["À genoux, mains sur la roue sous les épaules.", "Gaine le ventre, dos neutre.", "Fais rouler la roue vers l'avant aussi loin que tu restes gainé.", "Reviens en contractant les abdominaux."],
        e: ["Cambrer le bas du dos.", "Aller trop loin trop tôt."], m: "Abdominaux, gainage, grand dorsal." },
  // ---------- Cardio ----------
  24: { f: ["Corde réglée : poignées à hauteur des aisselles, pied posé au milieu.", "Coudes près du corps, la rotation vient des poignets.", "Saute bas, sur l'avant des pieds.", "Garde un rythme régulier et respire."],
        e: ["Sauter trop haut.", "Tourner la corde avec les bras."], m: "Mollets, cardio." },
  80: { f: ["Pieds sanglés, poignée en main, bras tendus.", "Pousse d'abord avec les jambes, puis bascule le buste, puis tire les bras.", "Reviens dans l'ordre inverse : bras, buste, jambes.", "Garde un rythme régulier (24 à 30 coups par minute)."],
        e: ["Tirer avec les bras avant de pousser les jambes.", "Arrondir le dos."], m: "Jambes, dos, bras, cardio." },
  81: { f: ["Règle la selle : jambe presque tendue en bas du coup de pédale.", "Buste détendu, mains légères sur le guidon.", "Garde une cadence régulière.", "Augmente la résistance plutôt que de pédaler en force."],
        e: ["Selle trop basse.", "Se balancer sur la selle."], m: "Quadriceps, fessiers, cardio." },
  82: { f: ["Démarre doucement puis augmente la vitesse.", "Buste droit, regard devant.", "Pose le pied sous le corps, foulée naturelle.", "Garde les mains libres, ne te tiens pas aux barres."],
        e: ["Se tenir aux barres.", "Courir au bord du tapis."], m: "Jambes, cardio." },
  85: { f: ["Debout face à la machine, poignées en main, bras tendus en haut.", "Tire vers le bas en pliant légèrement les genoux et les hanches.", "Termine mains près des cuisses.", "Remonte en contrôlant."],
        e: ["Tirer seulement avec les bras.", "Arrondir le dos."], m: "Dos, bras, gainage, cardio." },
  86: { f: ["Pieds bien à plat sur les pédales.", "Buste droit, mains sur les poignées mobiles.", "Pousse et tire avec les bras en même temps que les jambes.", "Garde une cadence régulière."],
        e: ["Se pencher sur les poignées.", "Pédaler sur la pointe des pieds."], m: "Jambes, bras, cardio." },
  87: { f: ["Monte en posant tout le pied sur la marche.", "Buste droit, mains légères sur les rampes.", "Garde une vitesse que tu tiens toute la durée.", "Respire régulièrement."],
        e: ["S'appuyer de tout son poids sur les rampes.", "Monter sur la pointe des pieds."], m: "Jambes, fessiers, cardio." },
  83: { f: ["Debout, buste droit.", "Monte les genoux à hauteur de hanches en alternant.", "Atterris sur l'avant du pied.", "Accompagne avec les bras."],
        e: ["Se pencher en arrière.", "Atterrir sur les talons."], m: "Fléchisseurs de hanche, mollets, cardio." },
  84: { f: ["Debout, accroupis-toi et pose les mains au sol.", "Lance les pieds en arrière en position de pompe.", "Ramène les pieds vers les mains.", "Saute bras en l'air, puis enchaîne."],
        e: ["Laisser le bassin s'affaisser en planche.", "Atterrir jambes tendues."], m: "Tout le corps, cardio." }
};

// ---------- Fiche d'un exercice : appui long sur n'importe quelle image d'exercice ----------
// Couche à part (au-dessus des volets) : la fiche peut s'ouvrir depuis la liste « Ajouter un exercice » sans la fermer.
function ficheHtml(e) {
  const fiche = FICHES[e.id] || null;
  const chips = [e.group];
  if (e.poly) chips.push('Polyarticulaire');
  if (!e.cardio && e.sets && e.reps) chips.push(`${e.sets} × ${e.reps}${e.rest ? ' · repos ' + formatRestDuration(e.rest) : ''}`);
  else if (e.cardio) chips.push('Cardio');
  let html = `<div class="exf-hero"><div class="ex-icon-badge">${getIcon(e.name, true)}</div></div>
    <h2 class="sheet-title center" id="fiche-title">${escapeHtml(e.name)}</h2>
    <div class="exf-chips">${chips.map(c => `<span class="exf-chip">${escapeHtml(c)}</span>`).join('')}</div>`;
  if (fiche) {
    html += `<h3 class="exf-h">Bien faire</h3><ol class="exf-list">${fiche.f.map(t => `<li>${escapeHtml(t)}</li>`).join('')}</ol>`;
    if (fiche.e && fiche.e.length) html += `<h3 class="exf-h">À éviter</h3><ul class="exf-list avoid">${fiche.e.map(t => `<li>${escapeHtml(t)}</li>`).join('')}</ul>`;
    if (fiche.m) html += `<h3 class="exf-h">Muscles</h3><p class="sheet-text">${escapeHtml(fiche.m)}</p>`;
  }
  html += `<button type="button" class="btn btn-secondary" onclick="closeFiche()">Fermer</button>`;
  return html;
}

function openFiche(ref) {
  const e = exInfo(ref);
  if (!e || !e.name) return;
  let overlay = document.getElementById('fiche-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'fiche-overlay';
    overlay.className = 'sheet-overlay fiche-overlay';
    overlay.addEventListener('click', ev => { if (ev.target === overlay) closeFiche(); });
    document.body.appendChild(overlay);
  }
  overlay.innerHTML = `<div class="sheet tall fiche-sheet" role="dialog" aria-modal="true" aria-labelledby="fiche-title"><button type="button" class="sheet-close fiche-close" aria-label="Fermer" onclick="closeFiche()">${CLOSE_SVG}</button>${ficheHtml(e)}</div>`;
  overlay.classList.add('open');
}

function closeFiche() {
  const overlay = document.getElementById('fiche-overlay');
  if (overlay) { overlay.classList.remove('open'); overlay.innerHTML = ''; }
}

document.addEventListener('keydown', ev => {
  if (ev.key === 'Escape') { const o = document.getElementById('fiche-overlay'); if (o && o.classList.contains('open')) { ev.stopPropagation(); closeFiche(); } }
}, true);

// Appui long (≈ 0,5 s, comme sur les tuiles de programme) sur une image d'exercice, partout dans l'app.
// Le toucher simple garde son effet habituel ; après un appui long, le clic qui suit est ignoré.
(function bindFicheLongPress() {
  const LONG_MS = 500, MOVE_PX = 10;
  let timer = null, startX = 0, startY = 0, fired = false;
  const cancel = () => { clearTimeout(timer); timer = null; };
  document.addEventListener('pointerdown', ev => {
    const badge = ev.target.closest && ev.target.closest('.ex-icon-badge');
    if (!badge || badge.closest('.fiche-sheet')) return;
    const src = badge.querySelector('[data-ex]');
    if (!src) return;
    fired = false; startX = ev.clientX; startY = ev.clientY;
    cancel();
    timer = setTimeout(() => {
      timer = null; fired = true;
      try { if (navigator.vibrate) navigator.vibrate(15); } catch (_) {}
      openFiche(src.dataset.ex);
    }, LONG_MS);
  }, true);
  document.addEventListener('pointermove', ev => { if (timer && Math.hypot(ev.clientX - startX, ev.clientY - startY) > MOVE_PX) cancel(); }, true);
  ['pointerup', 'pointercancel', 'scroll'].forEach(t => document.addEventListener(t, cancel, true));
  document.addEventListener('click', ev => { if (fired) { fired = false; ev.stopPropagation(); ev.preventDefault(); } }, true);
  document.addEventListener('contextmenu', ev => { if (ev.target.closest && ev.target.closest('.ex-icon-badge')) ev.preventDefault(); }, true);
})();
