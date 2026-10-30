// Parts of the `site` world (ids frozen in src/part-ids.ts, 12 of them): the mill race at the scale of the place.
//
// Conventions of the catalogue (checked by ../data.test.ts):
//   - `maintenance` is THREE paragraphs, each opened by a bold label, in this order: the typical failure, how a visitor can check it, the
//     routine maintenance (see `maint`).
//   - Who says what is always visible in the text, by name (never by a research code): the video, the published design rules, another video,
//     the model (« modèle »), or the lab's own drawing (« estimation »). A value computed from reported figures is « dérivé », from the
//     simulation « résultat du modèle », a constant of the model « hypothèse du modèle ». Nobody is named: no person, channel, company or
//     brand (the credits live in the Sources panel).
//   - The screw is GENERIC. The video's builders publish no dimension and no efficiency, and nothing here says or suggests that the machine
//     drawn is theirs. The prototype's 200 W and the 2 kW target are reported hopes (the sheets of `house-load` and `powerhouse`), never results.
//   - Water rights, the reserved flow and fish passage are said ONCE, in general terms, in the Sources panel (`legal`) and in the first
//     installation step; these sheets only say what the object does and that its size is set by the authority, site by site.
//   - Lengths of the 3D model come from ../../three/dims.ts, never retyped.
import type { PartInfo } from '@onigam/lab-kit/content';
import { l } from '@onigam/lab-kit/i18n';
import { lf, maint, sp, tf } from '../part-helpers';

export const SITE_PARTS: PartInfo[] = [
  {
    id: 'river',
    scene: 'site',
    category: 'site',
    name: l('Rivière', 'River'),
    short: l(
      'L’eau qui fait tout : on en prend une part, on la rend en aval.',
      'The water behind everything: a share is taken, and given back downstream.',
    ),
    description: l(
      'Une centrale hydraulique ne consomme pas l’eau : elle la prélève, s’en sert et la rend. Il y a d’abord la rivière ; un jour quelqu’un barre une part de son lit, creuse un canal vers un moulin, et l’eau rejoint le cours principal plus bas. Entre la prise et le retour, le tronçon « court-circuité » ne reçoit que le débit réservé, plus le surplus quand la rivière est haute. Le labo dessine trois cours d’eau génériques (un petit ruisseau, un bief de moulin, une rivière) dont l’année, avec de l’eau l’hiver et au printemps, des basses eaux l’été et quelques crues, est tirée au hasard une fois pour toutes : ce sont des estimations de sites typiques, pas des mesures.',
      'A hydropower plant does not use up the water: it takes it, uses it and gives it back. First there is the river; one day someone dams part of its bed, digs a canal to a mill, and the water rejoins the main stream further down. Between the intake and the return, the “bypassed” reach receives only the reserved flow, plus the surplus when the river is high. The lab draws three generic watercourses (a small brook, a mill race, a river) whose year, with water in winter and spring, low water in summer and a few floods, is drawn at random once and for all: they are estimates of typical sites, not measurements.',
    ),
    material: l('Eau douce, galets et graviers du lit', 'Fresh water, pebbles and gravel of the bed'),
    specs: [
      sp(
        'Cours d’eau du labo',
        'Lab watercourses',
        l('petit ruisseau, bief de moulin, rivière', 'small brook, mill race, river'),
      ),
      sp(
        'Débit moyen : ruisseau / bief / rivière',
        'Mean flow: brook / race / river',
        tf('estimate', '{meanBrookLs} L/s / {meanRaceLs} L/s / {meanRiverM3} m³/s'),
      ),
      sp('Débit médian du bief, année tirée', 'Median flow of the race, drawn year', tf('model', '{medianLs} L/s')),
      sp(
        'Eau consommée par la centrale',
        'Water used up by the plant',
        l('aucune : elle est prélevée puis rendue (vidéo)', 'none: it is taken then returned (video)'),
      ),
      sp(
        'Part laissée à la rivière',
        'Share left in the river',
        tf(
          'assumed',
          '{reservedPct} % du débit moyen, soit {reservedLs} L/s sur le bief',
          '{reservedPct}% of the mean flow, that is {reservedLs} L/s on the race',
        ),
      ),
    ],
    maintenance: maint(
      {
        failure:
          'Les crues charrient arbres, graviers et feuilles qui encombrent le seuil et le canal ; les basses eaux d’été laissent trop peu d’eau pour tourner, et la vase ou les graviers comblent peu à peu ce qui est calme.',
        check:
          'Lisez le niveau sur une échelle graduée plantée dans le lit et notez-le avec la date : en quelques saisons, vous connaîtrez l’année réelle du site, que le labo ne peut que dessiner.',
        care: 'Après une crue, dégagez les embâcles (les branches coincées) et les atterrissements qui détournent le courant. Une rivière se surveille de toute façon en amont : un orage lointain peut la gonfler en quelques heures.',
      },
      {
        failure:
          'Floods carry trees, gravel and leaves that clog the weir and the canal; summer low water leaves too little to turn the machine, and silt or gravel gradually fill whatever is calm.',
        check:
          'Read the level on a graduated gauge fixed in the bed and note it with the date: in a few seasons you will know the real year of the site, which the lab can only draw.',
        care: 'After a flood, clear the jams (stuck branches) and the gravel bars that divert the current. A river should be watched upstream anyway: a distant storm can swell it within hours.',
      },
    ),
    tip: l(
      'Ce n’est pas la puissance qui compte, c’est le nombre d’heures où l’on produit dans l’année et le fait de s’en servir à ce moment-là : c’est ce que dit la vidéo.',
      'What counts is not the power but the number of hours you produce in a year and whether you use the energy then: that is what the video says.',
    ),
    video: ['07:19', '43:41'],
    design: l(
      'Un site de moulin a un avantage énorme : le seuil, le canal et la chambre existent depuis des siècles. La vis s’y installe sans béton ni grand chantier, et rend à l’ouvrage un usage.',
      'A mill site has a huge advantage: the weir, the canal and the chamber have been there for centuries. The screw fits in without concrete or a big building site, and gives the works a use again.',
    ),
  },
  {
    id: 'weir',
    scene: 'site',
    category: 'structure',
    name: l('Seuil', 'Weir'),
    short: l(
      'Petit barrage qui relève l’eau et la pousse vers la prise du canal.',
      'Small dam that raises the water and pushes it towards the canal intake.',
    ),
    description: l(
      'Le seuil est un petit barrage en travers de la rivière : il relève le niveau de l’eau d’une hauteur modeste et la dirige vers la prise du bief. Quand la rivière apporte plus que la machine ne prend, le surplus passe par-dessus la crête. Le niveau qu’il fixe en amont fait une part de la chute de la machine. Mais c’est aussi un obstacle pour les poissons et pour les graviers, que la rivière transporte : voilà pourquoi on lui associe un débit réservé et une passe à poissons, et pourquoi, dans certains pays, des seuils sont arasés pour rétablir la continuité de la rivière, ce que la vidéo rappelle.',
      'The weir is a small dam across the river: it raises the water level by a modest height and sends it towards the intake of the headrace. When the river brings more than the machine takes, the surplus goes over the crest. The level it sets upstream makes up part of the machine’s head. But it is also an obstacle for fish and for the gravel the river carries: that is why a reserved flow and a fish pass go with it, and why, in some countries, weirs are levelled to restore the continuity of the river, as the video recalls.',
    ),
    material: l('Pierre, maçonnerie, bois ou béton selon l’âge', 'Stone, masonry, timber or concrete depending on age'),
    specs: [
      sp(
        'Hauteur de la crête',
        'Height of the crest',
        l('non donnée par les sources : propre à chaque site', 'not given by the sources: specific to each site'),
      ),
      sp(
        'Surplus',
        'Surplus',
        l(
          'l’eau qui ne passe pas dans la machine passe par-dessus la crête',
          'the water the machine does not take goes over the crest',
        ),
      ),
      sp(
        'En crue',
        'In a flood',
        tf(
          'assumed',
          'vanne fermée au-dessus de {floodM3} m³/s ici : tout passe par-dessus',
          'gate shut above {floodM3} m³/s here: everything goes over the top',
        ),
      ),
      sp(
        'Ce qu’il arrête',
        'What it stops',
        l('les poissons qui montent et les graviers', 'fish swimming upstream, and gravel'),
      ),
    ],
    maintenance: maint(
      {
        failure:
          'La rivière affouille le pied du seuil et l’eau fuit sous la crête ; les graviers et la vase s’accumulent derrière ; une crue arrache des pierres ou des planches.',
        check:
          'Regardez la crête de profil : le niveau doit être régulier, sans trou ni marche. Après une crue, l’eau passe-t-elle encore là où elle doit, avec un filet continu par l’échancrure ?',
        care: 'Réparez les joints et les pierres, évacuez les atterrissements. Un seuil ancien est un ouvrage de caractère, souvent protégé : ne l’abaissez ni ne le relevez sans avis, sa hauteur fixe la chute et les droits.',
      },
      {
        failure:
          'The river undercuts the foot of the weir and water leaks beneath the crest; gravel and silt build up behind it; a flood tears out stones or planks.',
        check:
          'Look at the crest in profile: the level should be even, with no hole or step. After a flood, does the water still go where it should, with a steady trickle through the notch?',
        care: 'Repair joints and stones, clear the gravel bars. An old weir is a structure of character, often protected: do not lower or raise it without advice, its height sets the head and the rights.',
      },
    ),
    tip: l(
      'Le seuil est la partie la plus ancienne de l’ouvrage et la plus discutée : il donne la chute, mais il barre la rivière.',
      'The weir is the oldest part of the works and the most debated: it gives the head, but it blocks the river.',
    ),
    video: ['07:25', '43:56'],
    design: l(
      'La vis laisse descendre les poissons et les sédiments, mais elle ne règle que la moitié du problème : la montée se règle ailleurs, par la passe, et la quantité d’eau laissée à la rivière par l’échancrure.',
      'The screw lets fish and sediment down, but it settles only half of the problem: the way up is settled elsewhere, by the fish pass, and the amount of water left in the river by the notch.',
    ),
  },
  {
    id: 'headrace',
    scene: 'site',
    category: 'hydraulic',
    name: l('Bief d’amenée', 'Headrace'),
    short: l(
      'Canal presque plat qui conduit l’eau du seuil à la chambre d’eau.',
      'Almost flat canal that carries the water from the weir to the water chamber.',
    ),
    description: lf(
      'Le bief, ou canal d’amenée, conduit l’eau de la prise jusqu’à la chambre du moulin. Il est presque plat, pour que l’eau n’y perde pas la chute qu’on veut garder pour la machine, et l’eau y coule lentement : le labo suppose {canalSpeed} m/s, assez pour que la vase ne s’y dépose pas trop. Chaque centimètre de chute perdu dans le canal coûte environ {cmW} W de puissance d’eau au point de calcul (dérivé, pour {flowLs} L/s). Dans le moulin de la vidéo, la fin du bief est un chenal de bois étanche, fait avec un menuisier pour se glisser dans l’ancien conduit sans rien casser.',
      'The headrace, or leat, carries the water from the intake to the mill’s chamber. It is almost flat, so that the water does not lose there the head you want to keep for the machine, and the water runs slowly: the lab assumes {canalSpeed} m/s, enough for silt not to settle too much. Every centimetre of head lost in the canal costs about {cmW} W of water power at the design point (derived, for {flowLs} L/s). In the video’s mill, the end of the headrace is a watertight wooden channel, made with a joiner to slide into the old duct without breaking anything.',
    ),
    material: l(
      'Terre et pierre, maçonnerie ; chenal de bois dans la vidéo',
      'Earth and stone, masonry; wooden channel in the video',
    ),
    specs: [
      sp('Vitesse de l’eau', 'Water speed', tf('assumed', '{canalSpeed} m/s')),
      sp(
        'Pente du canal',
        'Slope of the canal',
        l('presque nulle : la chute est gardée pour la vis', 'almost none: the head is kept for the screw'),
      ),
      sp(
        'Chute perdue par centimètre',
        'Head lost per centimetre',
        tf('derived', '≈ {cmW} W d’eau pour {flowLs} L/s', '≈ {cmW} W of water for {flowLs} L/s'),
      ),
      sp('Pertes de chute dans le canal', 'Head losses in the canal', l('non modélisées', 'not modelled')),
      sp(
        'Dans la vidéo',
        'In the video',
        l('chenal en bois étanche, fait avec un menuisier', 'watertight wooden channel, made with a joiner'),
      ),
    ],
    maintenance: maint(
      {
        failure:
          'Le canal s’envase, ses berges se creusent, des feuilles et des branches s’y accumulent, une fuite apparaît sous le mur ; un chenal de bois gonfle ou sèche et perd son étanchéité.',
        check:
          'Après une pluie, regardez le canal : l’eau doit y être lente et claire. Comparez le niveau au début et à la fin : un écart qui grandit dit des pertes qui augmentent.',
        care: 'Curez la vase, rebouchez les fuites, gardez les berges dégagées. Un chenal de bois doit rester en eau : ne le laissez pas sécher au soleil.',
      },
      {
        failure:
          'The canal silts up, its banks erode, leaves and branches pile up, a leak appears under the wall; a wooden channel swells or dries and loses its tightness.',
        check:
          'After rain, look at the canal: the water should be slow and clear. Compare the level at the start and at the end: a growing difference means growing losses.',
        care: 'Dredge the silt, plug the leaks, keep the banks clear. A wooden channel must stay wet: do not let it dry in the sun.',
      },
    ),
    tip: l(
      'Un canal large et lent perd moins de chute qu’un canal étroit et rapide : quelques centimètres économisés, ce sont des watts gagnés toute l’année.',
      'A wide, slow canal loses less head than a narrow, fast one: a few centimetres saved are watts gained all year.',
    ),
    video: ['07:29', '16:19'],
    design: l(
      'Le canal ne sert qu’à amener l’eau sans la faire tomber : toute la chute doit arriver intacte à la chambre, où la vis la prend.',
      'The canal only brings the water without letting it fall: all the head must reach the chamber intact, where the screw takes it.',
    ),
  },
  {
    id: 'trash-rack',
    scene: 'site',
    category: 'hydraulic',
    name: l('Grille grossière', 'Coarse rack'),
    short: l(
      'Grille à gros barreaux : elle arrête troncs et planches. La vis n’a pas besoin de grille fine.',
      'Wide-barred rack: it stops logs and planks. The screw needs no fine rack.',
    ),
    description: lf(
      'Une turbine rapide a des pales fines : une branche ou une pierre l’abîme, et le poisson qui y entre n’en sort pas indemne. On la protège donc par une grille serrée devant la prise, qu’un dégrilleur doit racler sans cesse. Cette grille se bouche de feuilles et mange de la chute : dans le modèle, propre, elle coûte environ {rackCleanCm} cm ; bouchée à 80 %, {rack80Head} m (un tiers de la puissance) ; à 90 %, {rack90Head} m (résultat du modèle, canal à {canalSpeed} m/s en hypothèse), plus que toute la chute. La vis tourne lentement, ses pales sont épaisses et ses poches larges : feuilles, brindilles, graviers et poissons la traversent, et l’on s’installe directement dans la chambre, sans dégrilleur. Honnêtement, cela ne veut pas dire « aucune protection » : une grille à gros barreaux en tête de canal arrête les troncs et les planches, qui pourraient se coincer dans le jeu de quelques millimètres entre pale et auge ; c’est un jugement d’ingénieur que le labo ne modélise pas.',
      'A fast turbine has thin blades: a branch or a stone damages it, and a fish that gets in does not come out unharmed. So it is protected by a tight rack in front of the intake, which a rack cleaner must rake all the time. That rack clogs with leaves and eats head: in the model, clean, it costs about {rackCleanCm} cm; blocked at 80%, {rack80Head} m (a third of the power); at 90%, {rack90Head} m (model result, canal at {canalSpeed} m/s as an assumption), more than the whole head. The screw turns slowly, its blades are thick and its pockets wide: leaves, twigs, gravel and fish pass through it, and you can install it directly in the chamber, with no rack cleaner. Honestly, this does not mean “no protection at all”: a rack with wide bars at the head of the canal stops logs and planks, which could jam in the gap of a few millimetres between blade and trough; that is an engineer’s judgement, which the lab does not model.',
    ),
    material: l('Acier galvanisé ou inox, barreaux espacés', 'Galvanised or stainless steel, widely spaced bars'),
    specs: [
      sp(
        'Écartement des barreaux',
        'Bar spacing',
        l('large, à fixer sur place : aucune source ne le donne', 'wide, to be set on site: no source gives it'),
      ),
      sp(
        'Perte de chute, grille propre',
        'Head lost, clean rack',
        tf('model', '≈ {rackCleanCm} cm', '≈ {rackCleanCm} cm'),
      ),
      sp(
        'Grille bouchée à 80 %',
        'Rack blocked at 80%',
        tf(
          'model',
          '{rack80Head} m perdus sur la chute du point de calcul',
          '{rack80Head} m lost out of the head of the design point',
        ),
      ),
      sp(
        'Grille bouchée à 90 %',
        'Rack blocked at 90%',
        tf(
          'model',
          '{rack90Head} m : plus que la chute, la machine s’arrête',
          '{rack90Head} m: more than the head, the machine stops',
        ),
      ),
      sp(
        'Dégrilleur',
        'Rack cleaner',
        l(
          'inutile pour une vis, indispensable pour une turbine rapide (vidéo)',
          'not needed for a screw, essential for a fast turbine (video)',
        ),
      ),
    ],
    maintenance: maint(
      {
        failure:
          'Un tronc, une planche ou une grosse pierre qui franchit la grille et se coince entre pale et auge peut bloquer ou fendre la vis ; la grille grossière elle-même se couvre de bois flotté et fait refluer l’eau en crue.',
        check:
          'Passez devant la grille après une crue ou un gros orage : l’eau doit passer sans tourbillon ni creux devant les barreaux, et le niveau avant et après la grille doit être presque le même.',
        care: 'Retirez les débris à la main avec un râteau à long manche, depuis la berge, vanne fermée : jamais seul, jamais debout dans l’eau d’un canal qui coule. Ne laissez pas un tas de feuilles s’accumuler.',
      },
      {
        failure:
          'A trunk, a plank or a large stone that gets past the rack and jams between blade and trough can block or split the screw; the coarse rack itself covers with driftwood and makes the water back up in a flood.',
        check:
          'Stand by the rack after a flood or a heavy storm: the water should pass with no swirl or dip in front of the bars, and the level before and after the rack should be almost the same.',
        care: 'Take out the debris by hand with a long-handled rake, from the bank, gate shut: never alone, never standing in the water of a flowing canal. Do not let a heap of leaves build up.',
      },
    ),
    tip: l(
      'Ne confondez pas les deux protections : une grille à gros barreaux dans l’eau protège la vis, un garde-corps au-dessus de la vis protège les personnes.',
      'Do not mix up the two protections: a wide-barred rack in the water protects the screw, a guard rail above the screw protects people.',
    ),
    video: ['10:07', '21:00'],
    design: lf(
      'Une grille fine, c’est de la chute perdue, un moteur de nettoyage et de l’entretien. La vis déplace ce coût vers sa taille : pour le même débit, une turbine Kaplan aurait une roue d’environ {kaplanM} m, la vis est {kaplanTimes} fois plus grande (résultat du modèle, vitesse axiale supposée de l’eau dans la roue) : c’est le sens de « une vis est grosse pour ce qu’elle produit », dit la vidéo.',
      'A fine rack means lost head, a cleaning motor and upkeep. The screw moves that cost into its size: for the same flow, a Kaplan turbine would have a runner of about {kaplanM} m, the screw is {kaplanTimes} times larger (model result, with an assumed axial water speed in the runner): that is the meaning of “a screw is big for what it produces”, says the video.',
    ),
  },
  {
    id: 'intake-gate',
    scene: 'site',
    category: 'hydraulic',
    name: l('Vanne de tête', 'Head gate'),
    short: l(
      'Vanne en tête du canal : elle coupe l’eau pour travailler, en crue et à la mise en route.',
      'Gate at the head of the canal: it cuts the water to work, in a flood and at start-up.',
    ),
    description: lf(
      'La vanne de tête est la porte de la machine : ouverte, l’eau descend le bief ; fermée, rien ne passe et la vis s’arrête. On la ferme pour travailler en sécurité, en crue (le labo la ferme quand la rivière dépasse {floodFactor} fois son débit médian, soit {floodM3} m³/s ici, une hypothèse) et en basses eaux (sous {lowCutPct} % du débit de calcul, aussi une hypothèse). La vidéo en montre deux : une petite vanne de sécurité qui coupe l’arrivée en cas de surdébit pour éviter l’emballement, et une vanne de contrôle motorisée, faite maison, qui règle le niveau de l’eau dans la vis. Sans charge électrique, ouvrir toute grande la vanne fait partir la vis à toute vitesse : le modèle trouve environ {freeRunRpm} tr/min.',
      'The head gate is the machine’s door: open, the water runs down the headrace; shut, nothing passes and the screw stops. It is shut to work safely, in a flood (the lab shuts it when the river goes above {floodFactor} times its median flow, that is {floodM3} m³/s here, an assumption) and in low water (below {lowCutPct}% of the design flow, also an assumption). The video shows two: a small safety gate that cuts the supply in case of excess flow to prevent runaway, and a motorised control gate, home-made, that sets the water level in the screw. With no electrical load, opening the gate wide makes the screw race: the model finds about {freeRunRpm} rpm.',
    ),
    material: l(
      'Acier ou bois, tige et commande manuelle ou motorisée',
      'Steel or timber, stem and hand or motorised drive',
    ),
    specs: [
      sp(
        'Fermeture en crue',
        'Closing in a flood',
        tf('assumed', 'au-dessus de {floodFactor} fois le débit médian', 'above {floodFactor} times the median flow'),
      ),
      sp(
        'Fermeture en basses eaux',
        'Closing in low water',
        tf('assumed', 'sous {lowCutPct} % du débit de calcul', 'below {lowCutPct}% of the design flow'),
      ),
      sp(
        'Vis sans charge',
        'Screw with no load',
        tf(
          'model',
          '≈ {freeRunRpm} tr/min, soit {freeRunFactor} fois la vitesse normale',
          '≈ {freeRunRpm} rpm, that is {freeRunFactor} times the normal speed',
        ),
      ),
      sp(
        'Dans la vidéo',
        'In the video',
        l(
          'une petite vanne de sécurité et une vanne de contrôle motorisée',
          'a small safety gate and a motorised control gate',
        ),
      ),
    ],
    maintenance: maint(
      {
        failure:
          'La vanne se grippe ou ne ferme plus (rouille, bois gonflé, vase dans les coulisses) ; la commande électrique tombe en panne juste au moment où il faudrait fermer.',
        check:
          'Manœuvrez-la à vide, souvent, jusqu’à la fermeture complète : elle doit descendre sans à-coup et laisser passer peu d’eau fermée. Essayez la fermeture de sécurité quand la vis tourne à vide.',
        care: 'Graissez la tige, nettoyez les coulisses, prévoyez une manœuvre à la main si le moteur lâche.',
      },
      {
        failure:
          'The gate seizes or no longer shuts (rust, swollen timber, silt in the guides); the electric drive fails just when it should shut.',
        check:
          'Operate it with no load, often, right down to full closure: it should come down smoothly and let little water through when shut. Test the safety closure while the screw turns with no load.',
        care: 'Grease the stem, clean the guides, provide a hand operation in case the motor gives up.',
      },
    ),
    tip: l(
      'Avant tout travail dans le canal, dans la chambre ou sur la vis : fermez la vanne, verrouillez-la avec un cadenas dont vous gardez la clé, et attendez l’arrêt complet.',
      'Before any work in the canal, in the chamber or on the screw: shut the gate, lock it with a padlock whose key you keep, and wait for a complete stop.',
    ),
    video: ['28:24', '28:51'],
    design: l(
      'La vanne a deux métiers : protéger (couper l’eau en crue ou en cas de survitesse) et régler (garder la vis à la bonne vitesse en réglant le niveau d’eau dedans). Le labo ne modélise que le premier : ouverte ou fermée.',
      'The gate has two jobs: protect (cut the water in a flood or in an overspeed) and regulate (keep the screw at the right speed by setting the water level in it). The lab models only the first: open or shut.',
    ),
  },
  {
    id: 'reserved-flow-notch',
    scene: 'site',
    category: 'hydraulic',
    name: l('Échancrure du débit réservé', 'Reserved-flow notch'),
    short: l(
      'Entaille calibrée du seuil : elle laisse toujours à la rivière l’eau qui lui revient.',
      'Calibrated notch in the weir: it always leaves the river the water that is its due.',
    ),
    description: lf(
      'Même quand la machine prend presque tout, une part de l’eau doit rester dans le lit de la rivière, sous le seuil : c’est le débit réservé, de quoi garder la vie du cours d’eau. L’échancrure est l’entaille calibrée dans la crête du seuil, ou l’ouverture de la prise, par où ce débit passe en continu sans que personne n’y pense. Sa taille est fixée par l’autorité, site par site ; le labo suppose un dixième du débit moyen, soit {reservedLs} L/s sur son bief (hypothèse : aucune de ses sources ne donne cette règle), alors qu’une centrale de montagne, dans une autre vidéo, en laisse 64 L/s. En basses eaux, la machine s’arrête plutôt que de prendre cette eau : la vidéo le dit, en été il faut souvent tout laisser à la rivière.',
      'Even when the machine takes almost everything, a share of the water must stay in the river bed, below the weir: this is the reserved flow, enough to keep the stream alive. The notch is the calibrated cut in the crest of the weir, or the opening of the intake, through which that flow passes continuously without anyone having to think of it. Its size is set by the authority, site by site; the lab assumes a tenth of the mean flow, that is {reservedLs} L/s on its race (assumption: none of its sources gives that rule), whereas a mountain plant, in another video, leaves 64 L/s. In low water, the machine stops rather than take that water: the video says so, in summer you often have to leave everything to the river.',
    ),
    material: l(
      'Pierre ou bois du seuil, parfois lame d’acier calibrée',
      'Stone or timber of the weir, sometimes a calibrated steel blade',
    ),
    specs: [
      sp(
        'Part laissée à la rivière',
        'Share left in the river',
        tf(
          'assumed',
          '{reservedPct} % du débit moyen, soit {reservedLs} L/s sur le bief',
          '{reservedPct}% of the mean flow, that is {reservedLs} L/s on the race',
        ),
      ),
      sp(
        'Centrale de montagne (autre vidéo)',
        'Mountain plant (another video)',
        l('64 L/s laissés dans le torrent', '64 L/s left in the stream'),
      ),
      sp(
        'Qui fixe la valeur',
        'Who sets the value',
        l('l’autorité, site par site, selon le pays', 'the authority, site by site, depending on the country'),
      ),
      sp(
        'La machine s’arrête',
        'The machine stops',
        tf('assumed', 'quand la rivière passe sous {lowCutLs} L/s', 'when the river falls below {lowCutLs} L/s'),
      ),
      sp(
        'Jours à l’arrêt, année tirée',
        'Days stopped, drawn year',
        tf('model', '{daysLow} jours de basses eaux', '{daysLow} days of low water'),
      ),
    ],
    maintenance: maint(
      {
        failure:
          'L’échancrure se bouche (feuilles, graviers, algues) ; ou, plus grave, on l’élargit « pour prendre un peu plus » et la rivière s’assèche sous le seuil sans que l’on s’en aperçoive.',
        check:
          'En saison sèche, regardez au pied du seuil : un filet continu doit passer. Mesurez-le avec un seau et une montre (volume divisé par le temps) pour vérifier qu’il correspond à la valeur fixée.',
        care: 'Dégagez-la après chaque crue ; ne modifiez jamais sa taille, elle est fixée pour le site.',
      },
      {
        failure:
          'The notch clogs (leaves, gravel, algae); or, worse, it is widened “to take a little more” and the river dries up below the weir without anyone noticing.',
        check:
          'In the dry season, look at the foot of the weir: a steady trickle must pass. Measure it with a bucket and a watch (volume divided by time) to check it matches the set value.',
        care: 'Clear it after every flood; never change its size, it is set for the site.',
      },
    ),
    tip: lf(
      'Trente litres par seconde, ce sont trois seaux de dix litres qui se vident chaque seconde : voilà, en hypothèse du labo ({reservedLs} L/s), ce qui reste à la rivière sur le bief.',
      'Thirty litres a second is three ten-litre buckets emptied every second: that is what the lab assumes ({reservedLs} L/s) stays in the river on the race.',
    ),
    video: ['21:27', '46:26'],
    design: l(
      'Une entaille n’a aucune pièce mobile ni aucun opérateur : ni panne, ni oubli. C’est pourquoi on la préfère à une vanne que l’on pourrait fermer par erreur.',
      'A notch has no moving part and no operator: no breakdown, no forgetting. That is why it is preferred to a gate that could be shut by mistake.',
    ),
  },
  {
    id: 'fish-pass',
    scene: 'site',
    category: 'hydraulic',
    name: l('Passe à poissons', 'Fish pass'),
    short: l(
      'Escalier de bassins qui permet aux poissons de remonter le seuil.',
      'Staircase of pools that lets fish swim up past the weir.',
    ),
    description: l(
      'Un poisson doit pouvoir descendre la rivière, mais aussi la remonter. La vis aide à la descente : la vidéo la décrit comme un toboggan qui tourne, où le poisson reste dans sa poche d’eau et descend avec elle. Elle ne règle pas la montée : pour franchir le seuil vers l’amont, il faut une passe. Le plus simple est une suite de petits bassins en escalier, où l’eau tombe d’un bassin à l’autre par une marche que le poisson franchit en nageant ou en sautant. Le débit qui la parcourt est pris sur le débit réservé, jour et nuit. Les constructeurs de la vidéo travaillent sur une passe en bois et veulent mesurer, avant et après, ce qu’elle apporte au ruisseau.',
      'A fish must be able to go down the river, but also to go back up. The screw helps with the way down: the video describes it as a turning slide, where the fish stays in its pocket of water and goes down with it. It does not settle the way up: to pass the weir upstream, a pass is needed. The simplest is a series of small pools in a staircase, where the water falls from one pool to the next over a step that the fish swims or leaps over. The flow through it is taken from the reserved flow, day and night. The video’s builders are working on a wooden pass and want to measure, before and after, what it brings to the stream.',
    ),
    material: l('Bois, pierre ou béton rugueux', 'Timber, stone or rough concrete'),
    specs: [
      sp('Rôle', 'Role', l('la montaison : aider les poissons à remonter', 'upstream passage: helping fish swim up')),
      sp(
        'Formes citées dans la vidéo',
        'Forms named in the video',
        l('bassins successifs, passe en bois, ascenseur à poissons', 'successive pools, wooden pass, fish lift'),
      ),
      sp('Débit', 'Flow', l('pris sur le débit réservé', 'taken from the reserved flow')),
      sp(
        'Dimensions',
        'Dimensions',
        l(
          'propres à chaque espèce et à chaque site : le labo n’en donne aucune',
          'specific to each species and site: the lab gives none',
        ),
      ),
      sp(
        'Modèle de poisson',
        'Fish model',
        l('aucun : le labo ne simule pas les poissons', 'none: the lab does not simulate fish'),
      ),
    ],
    maintenance: maint(
      {
        failure:
          'Bassins ou marches encombrés de branches et de graviers, eau trop faible ou trop forte, marches érodées : le poisson ne passe plus sans que rien ne le montre.',
        check:
          'Regardez-la en hiver et en basses eaux : l’eau doit couler dans tous les bassins et franchir chaque marche sans la noyer. Son entrée doit se trouver là où les poissons arrivent, au pied du seuil.',
        care: 'Dégagez-la à la main après les crues ; faites vérifier son efficacité par un spécialiste du cours d’eau, avec un suivi des poissons avant et après.',
      },
      {
        failure:
          'Pools or steps blocked by branches and gravel, too little or too much water, eroded steps: the fish can no longer pass and nothing shows it.',
        check:
          'Look at it in winter and in low water: water must flow in every pool and pass each step without drowning it. Its entrance must lie where the fish arrive, at the foot of the weir.',
        care: 'Clear it by hand after floods; have its effectiveness checked by a stream specialist, with fish monitoring before and after.',
      },
    ),
    tip: l(
      'Une passe à poissons est un ouvrage de spécialiste, dimensionné pour les espèces du cours d’eau et vérifié sur place : ne l’improvisez pas.',
      'A fish pass is a specialist’s work, sized for the species of the stream and checked on site: do not improvise it.',
    ),
    video: ['01:46', '04:21'],
    design: l(
      'La vis laisse descendre, la passe laisse monter : ensemble elles rétablissent la continuité de la rivière. Sans l’une ou l’autre, le seuil reste un piège ou un obstacle.',
      'The screw lets fish down, the pass lets them up: together they restore the continuity of the river. Without one or the other, the weir remains a trap or an obstacle.',
    ),
  },
  {
    id: 'water-chamber',
    scene: 'site',
    category: 'structure',
    name: l('Chambre d’eau', 'Water chamber'),
    short: l(
      'Ancienne chambre de pierre sous le moulin, où l’eau tombe : la vis s’y installe. Cliquez pour y entrer.',
      'Old stone chamber under the mill where the water falls: the screw goes in it. Click to go in.',
    ),
    description: lf(
      'La chambre d’eau est la salle de pierre, sous le moulin, où l’eau du bief tombait sur l’ancienne roue ou l’ancienne turbine. C’est là que se pose la vis, comme à l’origine, sans rien casser : dans la vidéo, les deux vieux conduits sont gardés et un seul sert. L’accès y est souvent sportif, par une échelle, sans moyen de levage ; or une vis est lourde (environ {mass} kg de bois pour celle du labo, estimation). C’est pourquoi la machine arrive en kit, en morceaux, et s’assemble sur place. C’est aussi un lieu dangereux : espace confiné, eau, pierre glissante.',
      'The water chamber is the stone room, under the mill, where the water of the headrace used to fall on the old wheel or turbine. This is where the screw goes, as it was originally, without breaking anything: in the video, the two old ducts are kept and only one is used. Access is often athletic, by a ladder, with no lifting gear; yet a screw is heavy (about {mass} kg of wood for the lab’s, an estimate). That is why the machine arrives as a kit, in pieces, and is assembled on the spot. It is also a dangerous place: confined space, water, slippery stone.',
    ),
    material: l('Pierre et maçonnerie, voûte', 'Stone and masonry, vaulted'),
    specs: [
      sp(
        'Chute à utiliser',
        'Head to use',
        l('1,5 à 2 m sur les petits moulins abandonnés (vidéo)', '1.5 to 2 m on small abandoned mills (video)'),
      ),
      sp('Accès', 'Access', l('échelle, pas de moyen de levage (vidéo)', 'ladder, no lifting gear (video)')),
      sp(
        'Masse de la partie tournante',
        'Mass of the turning part',
        tf('estimate', '≈ {mass} kg de bois', '≈ {mass} kg of timber'),
      ),
      sp(
        'Hauteur disponible',
        'Headroom',
        l(
          'limitée quand le moulin est devenu un logement (vidéo)',
          'limited when the mill has become a dwelling (video)',
        ),
      ),
    ],
    maintenance: maint(
      {
        failure:
          'Humidité, vase et graviers déposés au fond, joints qui se délitent, échelle glissante, mauvais air dans un volume fermé.',
        check:
          'Avant d’y descendre : vanne de tête fermée et verrouillée, éclairage, une personne qui reste dehors et vous entend. Dedans, examinez les murs et le sol à la lampe : fissures, joints qui coulent, repères d’eau.',
        care: 'Retirez graviers et vase après chaque crue, remplacez ou fixez l’échelle, aérez, et laissez la maçonnerie respirer.',
      },
      {
        failure:
          'Damp, silt and gravel settled on the floor, joints breaking up, a slippery ladder, bad air in a closed volume.',
        check:
          'Before going down: head gate shut and locked, lighting, one person staying outside who can hear you. Inside, examine the walls and floor by torchlight: cracks, joints running, water marks.',
        care: 'Remove gravel and silt after every flood, replace or secure the ladder, ventilate, and let the masonry breathe.',
      },
    ),
    tip: l(
      'Espace confiné : ne descendez jamais seul, jamais machine en marche, jamais avec de l’eau qui peut monter ; une échelle se monte et se descend face à elle, sans rien porter de lourd.',
      'Confined space: never go down alone, never with the machine running, never with water that can rise; a ladder is climbed facing it, carrying nothing heavy.',
    ),
    video: ['12:42', '15:01'],
    design: l(
      'La chambre explique le choix de la vis : on s’installe où l’eau tombait déjà, avec peu de génie civil. Plutôt que de monter une machine lourde en atelier et de la descendre, on la monte sur place, pièce par pièce.',
      'The chamber explains the choice of the screw: it goes where the water already fell, with little civil engineering. Rather than building a heavy machine in a workshop and lowering it, you build it on the spot, piece by piece.',
    ),
  },
  {
    id: 'tailrace',
    scene: 'site',
    category: 'hydraulic',
    name: l('Canal de fuite', 'Tailrace'),
    short: l(
      'Canal qui rend l’eau à la rivière, en aval du moulin.',
      'Canal that returns the water to the river, downstream of the mill.',
    ),
    description: lf(
      'Le canal de fuite, ou de restitution, ramène l’eau turbinée jusqu’à la rivière ; dans le moulin de la vidéo il mesure une centaine de mètres. Son niveau compte autant que celui du bief : la chute de la machine est la différence des deux. Quand la rivière monte, le canal se remplit et la chute fond : dans le modèle, l’eau aval monte de {tailPerDecade} m à chaque multiplication par dix du débit au-dessus de la médiane (hypothèse). À {floodFactor} fois la médiane, elle a monté de {tailGate} m, et il ne reste que {headLeft} m de chute (résultat du modèle).',
      'The tailrace, or return canal, brings the used water back to the river; in the video’s mill it is about a hundred metres long. Its level counts as much as the headrace’s: the machine’s head is the difference between the two. When the river rises, the canal fills and the head melts away: in the model, the water downstream rises by {tailPerDecade} m for every tenfold increase of the flow above the median (assumption). At {floodFactor} times the median it has risen by {tailGate} m, and only {headLeft} m of head is left (model result).',
    ),
    material: l('Terre, pierre, maçonnerie', 'Earth, stone, masonry'),
    specs: [
      sp('Longueur (moulin de la vidéo)', 'Length (the video’s mill)', l('environ 100 m', 'about 100 m')),
      sp(
        'Montée de l’eau aval',
        'Rise of the water downstream',
        tf(
          'assumed',
          '{tailPerDecade} m par décade de débit au-dessus de la médiane',
          '{tailPerDecade} m per tenfold flow above the median',
        ),
      ),
      sp(
        'À la fermeture en crue',
        'When the gate shuts in a flood',
        tf('model', '+{tailGate} m, il reste {headLeft} m de chute', '+{tailGate} m, {headLeft} m of head left'),
      ),
      sp(
        'Eau aval plus haute de 0,5 m',
        'Water downstream 0.5 m higher',
        tf('model', '{tail05Pct} % de puissance électrique en moins', '{tail05Pct}% less electric power'),
      ),
    ],
    maintenance: maint(
      {
        failure:
          'Le canal s’envase, un arbre tombe en travers, un obstacle au débouché fait refluer l’eau et noie la sortie de la vis : la chute baisse, et la vis perd plus encore dans ses derniers godets.',
        check:
          'Comparez le niveau de l’eau à la sortie de la vis et celui de la rivière : un écart qui grandit à débit égal dit un canal qui se bouche.',
        care: 'Curez la vase, coupez les branches qui pendent, gardez le débouché dégagé. Le canal rend l’eau à un cours qui peut monter vite : n’y marchez pas en crue.',
      },
      {
        failure:
          'The canal silts up, a tree falls across it, an obstacle at the outfall makes the water back up and drowns the screw’s outlet: the head drops, and the screw loses still more in its last buckets.',
        check:
          'Compare the water level at the screw’s outlet and that of the river: a gap that grows at equal flow means a clogging canal.',
        care: 'Dredge the silt, cut overhanging branches, keep the outfall clear. The canal returns the water to a stream that can rise fast: do not walk in it during a flood.',
      },
    ),
    tip: l(
      'Un centimètre de chute perdu en aval coûte autant qu’un centimètre perdu en amont : l’eau doit repartir librement.',
      'A centimetre of head lost downstream costs as much as a centimetre lost upstream: the water must be free to leave.',
    ),
    video: ['07:36', '12:47'],
    design: l(
      'Le canal de fuite est la moitié oubliée de la chute. On pense à la hauteur d’où l’eau tombe, moins à la hauteur où elle atterrit ; pourtant, c’est la différence des deux qui donne la puissance.',
      'The tailrace is the forgotten half of the head. We think of the height the water falls from, less of the height where it lands; yet it is the difference of the two that gives the power.',
    ),
  },
  {
    id: 'mill-building',
    scene: 'site',
    category: 'site',
    name: l('Moulin', 'Mill'),
    short: l(
      'Le bâtiment ancien au-dessus de la chambre : il porte, abrite et limite les hauteurs possibles.',
      'The old building above the chamber: it carries, shelters and limits the possible heights.',
    ),
    description: l(
      'Le moulin est le bâtiment de pierre dont la chambre d’eau occupe le sous-sol. Il compte pour trois choses : sa structure ne doit pas être abîmée (la vidéo tient à ne rien casser dans ces bâtisses vieilles de plusieurs siècles), sa hauteur sous plancher limite la longueur et la pente de la vis, et il abrite ce que l’électricité alimente. Beaucoup de moulins ont été transformés en logements : un plancher ou un mur est apparu là où il n’y en avait pas. Dans la vidéo, le moulin abrite un petit studio dont le serveur à basse consommation doit tourner avec l’électricité de la vis.',
      'The mill is the stone building whose basement is the water chamber. It matters for three things: its structure must not be damaged (the video is keen to break nothing in these centuries-old buildings), its headroom limits the length and slope of the screw, and it shelters whatever the electricity feeds. Many mills have been turned into homes: a floor or a wall has appeared where there was none. In the video, the mill houses a small studio whose low-consumption server is meant to run on the screw’s electricity.',
    ),
    material: l('Pierre, chaux, bois de charpente', 'Stone, lime, timber framing'),
    specs: [
      sp(
        'Rôle',
        'Role',
        l('abriter la chambre, la machine et ses usages', 'shelter the chamber, the machine and its uses'),
      ),
      sp(
        'Hauteur sous plancher',
        'Headroom',
        l(
          'limite la pente et la longueur de la vis : à vérifier sur place',
          'limits the slope and length of the screw: to be checked on site',
        ),
      ),
      sp(
        'Statut',
        'Status',
        l(
          'ouvrage ancien, souvent protégé : on ne le casse pas (vidéo)',
          'old structure, often protected: not to be broken (video)',
        ),
      ),
    ],
    maintenance: maint(
      {
        failure:
          'L’humidité remonte dans les murs et dans la chambre, les enduits et les joints se dégradent, un plancher pourrit, la vis fait vibrer la structure.',
        check:
          'Notez les fissures, les traces d’eau et l’humidité du bois ; vis en marche, posez la main sur le plancher au-dessus : il ne doit pas vibrer.',
        care: 'Laissez les murs respirer (enduits de chaux ou de terre), gardez le toit et les gouttières en état, tenez le sol de la chambre dégagé.',
      },
      {
        failure:
          'Damp rises in the walls and in the chamber, renders and joints decay, a floor rots, the screw makes the structure vibrate.',
        check:
          'Note cracks, water marks and the moisture of the timber; with the screw running, put a hand on the floor above: it should not vibrate.',
        care: 'Let the walls breathe (lime or earth renders), keep the roof and gutters in good order, keep the chamber floor clear.',
      },
    ),
    tip: l(
      'Gardez le bâtiment tel qu’il est : la vis se glisse dans la chambre d’origine et n’exige ni démolition ni béton.',
      'Keep the building as it is: the screw slips into the original chamber and needs neither demolition nor concrete.',
    ),
    video: ['02:25', '16:46'],
    design: l(
      'On ne reconstruit pas un moulin pour y mettre une machine : on met la machine dans le moulin. Les contraintes du bâtiment, la hauteur surtout, deviennent des données de départ du projet.',
      'You do not rebuild a mill to put a machine in it: you put the machine in the mill. The building’s constraints, height above all, become the starting data of the project.',
    ),
  },
  {
    id: 'powerhouse',
    scene: 'site',
    category: 'electrical',
    name: l('Local technique', 'Powerhouse'),
    short: l(
      'Petit local sec qui abrite toute l’électricité, de la protection à l’onduleur : une seule pièce du site, que l’on peut visiter.',
      'Small dry room that holds all the electrics, from protection to inverter: ONE part of the site, which can be entered.',
    ),
    description: lf(
      'Le local technique est la petite pièce sèche où arrive le câble de la génératrice. Sur son mur, dans l’ordre du courant : des protections, le redresseur, qui change l’alternatif en continu ; le régulateur de charge, qui protège la batterie, avec sa charge de délestage ; la batterie, qui garde l’énergie ; l’onduleur, qui fabrique du courant alternatif pour la maison ; et un compteur d’énergie, le tout sur un tableau relié à la terre. Sur le site, ils forment une seule pièce ; entrez-y pour voir chaque appareil à sa place, dans l’ordre où le courant les traverse. Au point de calcul, le modèle envoie {elecKw} kW dans une batterie de {busVolts} V (hypothèse) ; les pertes de l’onduleur et des câbles ne sont pas modélisées.',
      'The powerhouse is the small dry room where the generator’s cable arrives. On its wall, in the order of the current: protections, the rectifier, which turns alternating current into direct current; the charge controller, which protects the battery, with its dump load; the battery, which keeps the energy; the inverter, which makes alternating current for the house; and an energy meter, all on a board bonded to the earth. On the site they form a single part; go in to see each device in its place, in the order the current goes through them. At the design point, the model sends {elecKw} kW into a {busVolts} V battery (assumption); the losses of the inverter and of the cables are not modelled.',
    ),
    material: l('Armoire électrique, batterie, câbles', 'Electrical cabinet, battery, cables'),
    specs: [
      sp(
        'Contenu',
        'Contents',
        l(
          'protections, redresseur, régulateur, batterie, charge de délestage, onduleur, compteur, tableau, terre',
          'protections, rectifier, controller, battery, dump load, inverter, meter, board, earthing',
        ),
      ),
      sp('Tension de la batterie', 'Battery voltage', tf('assumed', '{busVolts} V', '{busVolts} V')),
      sp(
        'Vers la batterie, point de calcul',
        'To the battery, design point',
        tf('model', '{elecKw} kW, soit environ {current} A', '{elecKw} kW, that is about {current} A'),
      ),
      sp('Onduleur', 'Inverter', l('non modélisé', 'not modelled')),
      sp(
        'Branchement et raccordement',
        'Wiring and connection',
        l('par un électricien qualifié', 'by a qualified electrician'),
      ),
    ],
    maintenance: maint(
      {
        failure:
          'Une borne mal serrée chauffe, un fusible fond, la batterie gonfle ou perd sa capacité, l’humidité ou une souris s’installe dans l’armoire, un câble sous-dimensionné s’échauffe.',
        check:
          'Regardez et sentez : odeur de brûlé, câble qui noircit, borne qui blanchit ou verdit ; mesurez la tension de la batterie au repos et en charge.',
        care: 'Resserrez les bornes, gardez le local sec et aéré, étiquetez les circuits, et faites inspecter l’ensemble par un électricien.',
      },
      {
        failure:
          'A loose terminal heats up, a fuse blows, the battery swells or loses capacity, damp or a mouse moves into the cabinet, an undersized cable overheats.',
        check:
          'Look and smell: a burning smell, a cable that blackens, a terminal that turns white or green; measure the battery voltage at rest and while charging.',
        care: 'Retighten the terminals, keep the room dry and ventilated, label the circuits, and have the whole thing inspected by an electrician.',
      },
    ),
    tip: lf(
      'Ne court-circuitez jamais une batterie : au point de calcul, déjà {current} A y passent (résultat du modèle), et un court-circuit en débite des centaines. Un fusible ou un disjoncteur se place au plus près de la batterie, et un onduleur raccordé à la maison produit une tension mortelle.',
      'Never short-circuit a battery: at the design point {current} A already flow (model result), and a short circuit delivers hundreds. A fuse or breaker goes as close as possible to the battery, and an inverter connected to the house produces a lethal voltage.',
    ),
    video: ['22:21', '50:03'],
    design: l(
      'Rien ne doit être près de l’eau : le local est sec, au-dessus des crues, et près de la maison, pour que le câble soit court, car en basse tension le courant est fort et les pertes croissent avec son carré.',
      'Nothing should be near the water: the room is dry, above flood level, and close to the house, so that the cable is short, because at low voltage the current is large and the losses grow with its square.',
    ),
  },
  {
    id: 'house-load',
    scene: 'site',
    category: 'site',
    name: l('Maison', 'House'),
    short: l(
      'Ce que l’électricité alimente : on s’en sert sur place, elle ne se revend pas.',
      'What the electricity feeds: it is used on the spot, not sold.',
    ),
    description: lf(
      'À l’autre bout du câble, il y a ce que l’on veut alimenter : une maison, un atelier, un petit serveur. La vidéo vise l’autoconsommation, pas la vente : chaque kilowattheure produit est un kilowattheure que l’on n’achète pas. Ce qui compte n’est pas la puissance du moment, mais le nombre d’heures où l’on produit dans l’année et le fait de s’en servir alors : la vis tourne l’hiver et la nuit, quand le solaire se repose, et le complète bien. Sur le bief du labo, le modèle donne {yearKwh} kWh dans l’année tirée, soit {meanKw} kW en moyenne, dont {winter} % de décembre à février, qui ne sont que {winterShare} % de l’année (résultat du modèle).',
      'At the other end of the cable is whatever you want to feed: a house, a workshop, a small server. The video aims at self-consumption, not at selling: every kilowatt-hour produced is a kilowatt-hour you do not buy. What counts is not the power of the moment but the number of hours you produce in a year and whether you use it then: the screw turns in winter and at night, when solar rests, and complements it well. On the lab’s race, the model gives {yearKwh} kWh in the drawn year, that is {meanKw} kW on average, with {winter}% from December to February, which are only {winterShare}% of the year (model result).',
    ),
    material: l('Réseau intérieur de la maison ou de l’atelier', 'Indoor wiring of the house or workshop'),
    specs: [
      sp(
        'Énergie de l’année tirée',
        'Energy of the drawn year',
        tf('model', '≈ {yearKwh} kWh, soit {meanKw} kW en moyenne', '≈ {yearKwh} kWh, that is {meanKw} kW on average'),
      ),
      sp(
        'Facteur de charge',
        'Capacity factor',
        tf('model', '{cf} % de la puissance nominale', '{cf}% of the rated power'),
      ),
      sp(
        'Part de l’hiver (décembre à février)',
        'Share of winter (December to February)',
        tf(
          'model',
          '{winter} % de l’énergie en {winterShare} % de l’année',
          '{winter}% of the energy in {winterShare}% of the year',
        ),
      ),
      sp(
        'Heures de marche, année tirée',
        'Hours running, drawn year',
        tf(
          'model',
          '≈ {hours} h, dont {daysLow} jours d’arrêt en basses eaux',
          '≈ {hours} h, with {daysLow} days stopped in low water',
        ),
      ),
      sp(
        'Part de l’énergie de l’eau du site utilisée',
        'Share of the site’s water energy used',
        tf('model', '{used} %', '{used}%'),
      ),
      sp(
        'Prototype de la vidéo',
        'The video’s prototype',
        l('environ 200 W annoncés, 200 à 300 W possibles', 'about 200 W announced, 200 to 300 W possible'),
      ),
      sp(
        'Le modèle pour le prototype',
        'The model for the prototype',
        tf(
          'model',
          '{protoW} W avec la chute et le débit tirés de ces 200 W : un raisonnement circulaire, qui ne « confirme » pas la vidéo',
          '{protoW} W with the head and flow derived from those 200 W: a circular argument, which does not “confirm” the video',
        ),
      ),
      sp(
        'Vis grandeur nature (objectif annoncé)',
        'Full-size screw (announced target)',
        l('environ 2 kW nominal : un espoir, pas un résultat', 'about 2 kW rated: a hope, not a result'),
      ),
    ],
    maintenance: maint(
      {
        failure:
          'Une charge mal choisie (un appareil gourmand au démarrage), un onduleur surchargé, une batterie vidée en été quand la vis s’arrête.',
        check:
          'Notez ce que vous consommez et à quelle heure, puis comparez avec ce que le site peut donner en hiver et en été : l’écart se voit vite.',
        care: 'Adaptez les usages à la saison : le moulin produit l’hiver, moins l’été ; un peu de solaire ou un autre appoint complète l’été.',
      },
      {
        failure:
          'A badly chosen load (an appliance hungry at start-up), an overloaded inverter, a battery emptied in summer when the screw stops.',
        check:
          'Note what you use and at what hour, then compare with what the site can give in winter and in summer: the gap shows quickly.',
        care: 'Fit the uses to the season: the mill produces in winter, less in summer; a little solar or another back-up fills in the summer.',
      },
    ),
    tip: l(
      'Pensez en kilowattheures par an, pas en watts : un petit débit qui coule tout l’hiver donne plus qu’une grosse puissance d’un instant.',
      'Think in kilowatt-hours per year, not in watts: a small flow running all winter gives more than a big power of a moment.',
    ),
    video: ['11:19', '21:14'],
    design: l(
      'La vidéo rattache la production à un usage précis et concret, un serveur à basse consommation : montrer qu’en autonomie, avec peu, on fait tourner quelque chose de réel.',
      'The video ties the production to a precise, concrete use, a low-consumption server: showing that in autonomy, with little, something real can be run.',
    ),
  },
];
