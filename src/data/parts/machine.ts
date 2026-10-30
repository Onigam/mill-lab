// Parts of the `screw` world, first half (ids frozen in src/part-ids.ts): the water that is the lesson (`trapped-water`, `inlet-sill`,
// `outlet-pool`) and the turning machine in its trough (`trough`, `screw-core`, `blade-module`, `blade-fastener`, the two bearings).
// The drive (chain, belt) is in ./drive.ts and the generator at the end of the belt in ./electric.ts (the electronics are in ./powerroom.ts).
// Conventions: see ./site.ts.
//
// The screw is GENERIC. What the video gives: three threads wound on a core, the screw inclined and half immersed, wooden parts bolted
// together and repairable by the owner (long wooden pieces on the core, sets of three blades screwed on top), a round trough with a very
// small gap (the hardest thing to make: a wooden tube, hooped), two bearings (industrial ball bearings in metal parts machined to order),
// 30 to 60 rpm, and a kit assembled in the chamber. What it does NOT give: any diameter, length, pitch, wood section or efficiency. Those
// come from the published design rules through src/sim (docs/physics.md §1.2) and are tagged « dérivé » or « estimation ». Lengths of the
// 3D model come from src/three/dims.ts (the test checks the agreement).
import type { PartInfo } from '@onigam/lab-kit/content';
import { l } from '@onigam/lab-kit/i18n';
import { lf, maint, sp, tf } from '../part-helpers';

export const MACHINE_PARTS: PartInfo[] = [
  {
    id: 'trough',
    scene: 'screw',
    category: 'structure',
    name: l('Auge', 'Trough'),
    short: l(
      'Le tube fixe dans lequel la vis tourne : bien rond, à quelques millimètres des pales.',
      'The fixed tube the screw turns in: truly round, a few millimetres from the blades.',
    ),
    description: lf(
      'L’auge est la pièce fixe que la vis épouse : un cylindre dans lequel elle tourne, immergée à moitié. Tout son travail est d’être bien ronde et de ne laisser qu’un jeu minuscule autour des pales, car par ce jeu l’eau fuit d’une poche vers celle du dessous sans rien produire, et un poisson pourrait s’y coincer si le jeu dépassait une limite. La règle publiée donne 0,0045 fois la racine du diamètre : {gapMm} mm pour la vis du labo (dérivé), moins d’un demi pour cent de son diamètre. C’est, dans la vidéo, la grande difficulté : un tube de bois bien rond, dont ses constructeurs ont appris le principe dans les anciennes canalisations en bois ; le dessin du labo, lui, en fait une demi-gouttière de béton (estimation). Au point de calcul, le jeu laisse fuir {lossGapW} W sur {waterKw} kW d’eau (résultat du modèle).',
      'The trough is the fixed part that the screw hugs: a cylinder in which it turns, half immersed. All its job is to be truly round and to leave only a tiny gap around the blades, because through this gap the water leaks from one pocket to the one below without producing anything, and a fish could be trapped there if the gap went beyond a limit. The published rule gives 0.0045 times the square root of the diameter: {gapMm} mm for the lab’s screw (derived), less than half a percent of its diameter. In the video this is the great difficulty: a truly round wooden tube, whose principle its builders learnt from old wooden pipes; the lab’s drawing, for its part, makes it a concrete half-pipe (estimate). At the design point, the gap lets {lossGapW} W leak out of {waterKw} kW of water (model result).',
    ),
    material: l(
      'Bois cerclé de sangles ou d’inox dans la vidéo ; béton dans le dessin du labo',
      'Timber hooped with straps or stainless steel in the video; concrete in the lab’s drawing',
    ),
    specs: [
      sp(
        'Jeu entre pales et auge',
        'Gap between blades and trough',
        tf('derived', '≈ {gapMm} mm (0,0045 × √D, règle publiée)', '≈ {gapMm} mm (0.0045 × √D, published rule)'),
      ),
      sp(
        'Forme',
        'Shape',
        l('cylindre bien rond, vis à moitié immergée (vidéo)', 'truly round cylinder, screw half immersed (video)'),
      ),
      sp(
        'Fuite par le jeu, point de calcul',
        'Leak through the gap, design point',
        tf('model', '{lossGapW} W, soit {qGapLs} L/s', '{lossGapW} W, that is {qGapLs} L/s'),
      ),
      sp(
        'Jeu réduit de moitié / doublé / quadruplé',
        'Gap halved / doubled / quadrupled',
        tf(
          'model',
          'rendement de la vis {gap05Eff} % / {gap2Eff} % / {gap4Eff} % au lieu de {etaScrew} %',
          'screw efficiency {gap05Eff}% / {gap2Eff}% / {gap4Eff}% instead of {etaScrew}%',
        ),
      ),
      sp(
        'Parois rugueuses (0,5 à 5 mm)',
        'Rough walls (0.5 to 5 mm)',
        tf('model', '{rough5Loss} % d’électricité en moins', '{rough5Loss}% less electricity'),
      ),
      sp(
        'Maintien des douelles',
        'Holding the staves',
        l(
          'sangles pendant les essais, cerclage inox ensuite (vidéo)',
          'straps during the tests, stainless hooping afterwards (video)',
        ),
      ),
    ],
    maintenance: maint(
      {
        failure:
          'Le bois gonfle ou sèche : l’auge se déforme en ovale, le jeu change, la vis frotte ou fuit ; les sangles se détendent ; la paroi se couvre d’algues et de dépôts qui freinent l’eau.',
        check:
          'Vanne fermée, faites tourner la vis lentement à la main : elle ne doit avoir ni point dur ni frottement sur un tour entier. À la lampe, un trait de lumière régulier doit courir le long des pales ; mesurez le jeu en plusieurs endroits avec des cales.',
        care: 'Le bois dure quand il reste immergé (vidéo) et craint les alternances de mouillé et de sec. Resserrez les sangles, brossez les dépôts, remplacez une douelle fendue ; n’appliquez aucun produit toxique sur un bois qui baigne dans une rivière vivante.',
      },
      {
        failure:
          'The timber swells or dries: the trough warps into an oval, the gap changes, the screw rubs or leaks; the straps slacken; the wall covers with algae and deposits that slow the water.',
        check:
          'With the gate shut, turn the screw slowly by hand: it must have no tight spot or rubbing over a full turn. By torchlight, an even line of light should run along the blades; measure the gap in several places with feeler gauges.',
        care: 'Timber lasts when it stays submerged (video) and dislikes alternating wet and dry. Retighten the straps, brush off deposits, replace a split stave; apply no toxic product to timber that sits in a living river.',
      },
    ),
    tip: l(
      'Mieux vaut un jeu régulier de quelques millimètres tout le long qu’un jeu parfait en un point et nul ailleurs : une auge un peu ovale se paie en frottements ou en fuites.',
      'A regular gap of a few millimetres all along beats a perfect gap in one place and none elsewhere: a slightly oval trough is paid for in rubbing or in leaks.',
    ),
    video: ['18:24', '19:21'],
    design: l(
      'La vis, au fond, est la partie facile : le plus dur est le tube qui l’entoure. Et un jeu qui s’use fait tomber le rendement, comme le montre le curseur « jeu » du labo.',
      'The screw, deep down, is the easy part: the hardest is the tube around it. And a gap that wears makes the efficiency fall, as the lab’s “gap” slider shows.',
    ),
  },
  {
    id: 'screw-core',
    scene: 'screw',
    category: 'mechanical',
    name: l('Noyau central', 'Screw core'),
    short: l(
      'Le tube central autour duquel s’enroulent les trois filets.',
      'The central tube around which the three threads wind.',
    ),
    description: lf(
      'Le noyau est le cylindre central de la vis, que la vidéo appelle le fût : trois filets s’enroulent autour de lui, comme les trois fils d’un filetage très gros. Ses pièces de bois sont longues, et les modules de pales se vissent par-dessus. Son diamètre suit une règle publiée, un peu plus de la moitié de celui de la vis pour trois filets : {inner} m pour {diameter} m (dérivé). Trop gros, il prend la place de l’eau ; trop fin, il plie, car il porte tout entre les deux paliers. À ses deux bouts, des axes métalliques, faits à façon dans la vidéo, entrent dans les roulements. La partie tournante entière pèse environ {mass} kg de bois (estimation), plus l’eau des poches.',
      'The core is the central cylinder of the screw, which the video calls the shaft: three threads wind around it, like the three threads of a very coarse screw. Its timber pieces are long, and the blade modules are screwed on top. Its diameter follows a published rule, a little more than half that of the screw for three threads: {inner} m for {diameter} m (derived). Too big, it takes the water’s place; too slim, it bends, because it carries everything between the two bearings. At its two ends, metal stub shafts, made to order in the video, run in the bearings. The whole turning part weighs about {mass} kg of timber (estimate), plus the water in the pockets.',
    ),
    material: l('Bois, tube creux ; bouts d’axe en acier', 'Timber, hollow tube; steel shaft ends'),
    specs: [
      sp(
        'Diamètre du noyau',
        'Core diameter',
        tf('derived', '{inner} m (0,5357 × le diamètre)', '{inner} m (0.5357 × the diameter)'),
      ),
      sp('Diamètre de la vis', 'Screw diameter', tf('derived', '{diameter} m', '{diameter} m')),
      sp('Filets', 'Threads', l('3 (vidéo)', '3 (video)')),
      sp(
        'Longueur de la vis',
        'Length of the screw',
        tf('estimate', '≈ {length} m (chute ÷ sin 22°)', '≈ {length} m (head ÷ sin 22°)'),
      ),
      sp(
        'Masse de la partie tournante',
        'Mass of the turning part',
        tf('estimate', '≈ {mass} kg de bois', '≈ {mass} kg of timber'),
      ),
      sp(
        'Bouts d’axe',
        'Shaft ends',
        l('pièces métalliques faites à façon (vidéo)', 'metal parts made to order (video)'),
      ),
    ],
    maintenance: maint(
      {
        failure:
          'Le bois du noyau se fend, s’imbibe et gonfle ; les assemblages se desserrent ; un bout d’axe tourne dans son logement ; le noyau fléchit s’il est trop fin.',
        check:
          'Faites tourner la vis lentement, vanne fermée : le noyau ne doit pas « voiler » (osciller) ni faire de bruit. Regardez les deux bouts d’axe : pas de jeu, pas de trace de rouille ou de frottement.',
        care: 'Gardez le bois dans l’eau ou bien sec, pas tantôt l’un tantôt l’autre ; graissez les bouts d’axe hors de l’eau ; n’y mettez aucun produit toxique pour la rivière.',
      },
      {
        failure:
          'The core timber splits, soaks and swells; the joints loosen; a shaft end turns in its housing; the core sags if it is too slim.',
        check:
          'Turn the screw slowly, with the gate shut: the core must not “wobble” or make noise. Look at the two shaft ends: no play, no trace of rust or rubbing.',
        care: 'Keep the timber in the water or fully dry, not alternately one and the other; grease the shaft ends out of the water; use no product toxic to the river.',
      },
    ),
    tip: l(
      'Le noyau est tout sauf un détail : sa taille décide du volume d’eau que chaque poche peut emporter, donc de la taille de la vis pour un débit donné.',
      'The core is anything but a detail: its size decides how much water each pocket can carry, hence the size of the screw for a given flow.',
    ),
    video: ['25:17', '26:07'],
    design: l(
      'La règle publiée équilibre deux exigences : plus de noyau, moins de place pour l’eau ; moins de noyau, un axe fragile. Pour trois filets, elle donne un peu plus de la moitié du diamètre.',
      'The published rule balances two demands: more core, less room for water; less core, a fragile shaft. For three threads, it gives a little over half the diameter.',
    ),
  },
  {
    id: 'blade-module',
    scene: 'screw',
    category: 'mechanical',
    name: l('Module de pales', 'Blade module'),
    short: l(
      'Pièce de bois qui porte trois pales : elle se visse sur le noyau, comme dans un kit.',
      'Timber piece that carries three blades: it is screwed onto the core, as in a kit.',
    ),
    description: lf(
      'La vidéo découpe la vis en pièces de bois : de longues pièces sur le noyau, puis des ensembles qui portent chacun trois pales et se vissent par-dessus. Voilà ce qui permet de monter la machine en kit dans la chambre, et de la réparer chez soi : si une pale casse, on dévisse le module et on le change. Une pale est une hélice, une surface qui avance de {pitch} m le long de l’axe à chaque tour (le pas, dérivé). Avec trois filets et une pente de 22°, chaque pale sépare deux niveaux d’eau d’environ {stepCm} cm (dérivé). Au bout, les pales passent à {tipSpeed} m/s (dérivé) ; sur la sûreté des poissons, la vidéo cite des essais industriels, mais le labo n’a aucun modèle de blessure.',
      'The video cuts the screw into timber pieces: long pieces on the core, then assemblies that each carry three blades and are screwed on top. That is what allows the machine to be built as a kit in the chamber, and repaired at home: if a blade breaks, you unscrew the module and change it. A blade is a helix, a surface that advances {pitch} m along the axis at each turn (the pitch, derived). With three threads and a slope of 22°, each blade separates two water levels about {stepCm} cm apart (derived). At the tip, the blades move at {tipSpeed} m/s (derived); on the safety of fish, the video cites industrial tests, but the lab has no injury model.',
    ),
    material: l(
      'Bois : chêne pour le premier prototype de la vidéo, mélèze pour le suivant',
      'Timber: oak for the video’s first prototype, larch for the next',
    ),
    specs: [
      sp('Filets', 'Threads', l('3 (vidéo)', '3 (video)')),
      sp(
        'Pas de la vis',
        'Pitch of the screw',
        tf('derived', '{pitch} m, égal au diamètre', '{pitch} m, equal to the diameter'),
      ),
      sp(
        'Pente',
        'Slope',
        l(
          '22° : l’angle le plus courant des vis installées (études publiées)',
          '22°: the most common angle of installed screws (published surveys)',
        ),
      ),
      sp(
        'Vitesse du bout des pales',
        'Blade tip speed',
        tf('derived', '≈ {tipSpeed} m/s à la vitesse de calcul', '≈ {tipSpeed} m/s at the design speed'),
      ),
      sp(
        'Frottement de l’eau sur pales et noyau',
        'Friction of the water on blades and core',
        tf('model', '{lossFrictionW} W', '{lossFrictionW} W'),
      ),
      sp('Marche d’eau par pale', 'Water step per blade', tf('derived', '≈ {stepCm} cm', '≈ {stepCm} cm')),
      sp(
        'Entretien par le propriétaire',
        'Owner repair',
        l('on dévisse et on revisse (vidéo)', 'unscrew and screw back (video)'),
      ),
    ],
    maintenance: maint(
      {
        failure:
          'Une pale ou un module se fend ou se déforme (le bois travaille entre l’eau et le sec) ; un choc avec une pierre ou une branche abîme un bord ; des vis desserrées donnent du jeu.',
        check:
          'Vis hors d’eau, vanne fermée, éclairez et suivez chaque filet du haut en bas : bord intact, surface lisse, pas de fente. Tapotez doucement du doigt : un son sourd peut signaler du bois pourri.',
        care: 'Remplacez le module abîmé plutôt que de le ragréer, poncez les bavures. La rugosité coûte de la puissance : de 0,5 à 5 mm, {rough5Loss} % d’électricité en moins (résultat du modèle).',
      },
      {
        failure:
          'A blade or a module splits or warps (the timber works between wet and dry); a knock from a stone or a branch damages an edge; loose screws give play.',
        check:
          'With the screw out of the water, gate shut, light and follow each thread from top to bottom: edge intact, surface smooth, no split. Tap gently with a finger: a dull sound can mean rotten timber.',
        care: 'Replace a damaged module rather than patching it, sand off burrs. Roughness costs power: from 0.5 to 5 mm, {rough5Loss}% less electricity (model result).',
      },
    ),
    tip: l(
      'Ne changez qu’un module à la fois et gardez les trois filets en phase : un module monté décalé fait un décrochement du filet, où l’eau se perd.',
      'Change only one module at a time and keep the three threads in phase: a module fitted out of step makes a jog in the thread, where the water is lost.',
    ),
    video: ['26:07', '26:34'],
    design: l(
      'Les modules sont pensés pour le propriétaire : ce choix, fait a priori sur le premier modèle, peut encore changer, disent les constructeurs de la vidéo. Il coûte un peu de rigidité, mais donne une machine que l’on sait démonter et réparer.',
      'The modules are designed for the owner: this choice, made a priori on the first model, may still change, say the video’s builders. It costs a little stiffness, but gives a machine you can take apart and repair.',
    ),
  },
  {
    id: 'blade-fastener',
    scene: 'screw',
    category: 'mechanical',
    name: l('Fixations des pales', 'Blade fasteners'),
    short: l(
      'Vis et boulons qui tiennent les modules sur le noyau : démontables, pour réparer.',
      'Screws and bolts that hold the modules on the core: removable, for repairs.',
    ),
    description: lf(
      'Les modules ne sont pas collés : ils sont vissés, et la vidéo insiste qu’on peut les dévisser et les revisser. Chaque fixation traverse le bois du module et le serre sur le noyau. Elle fait passer l’effort des pales, que l’eau pousse, jusqu’au noyau puis à l’axe : au point de calcul, la vis transmet {torqueScrew} N·m (résultat du modèle). Aucune source ne décrit ces fixations : le dessin du labo en choisit (voir les caractéristiques, estimation de catalogue), mais leur couple de serrage n’est pas donné, car il dépend du bois, de la section et de qui construit. Elles sont dessinées en acier inoxydable (estimation), car un acier nu rouillerait vite dans l’eau.',
      'The modules are not glued: they are screwed, and the video insists that they can be unscrewed and screwed back. Each fastener passes through the timber of the module and clamps it on the core. It carries the load of the blades, which the water pushes, to the core and then to the shaft: at the design point, the screw transmits {torqueScrew} N·m (model result). No source describes these fasteners: the lab’s drawing chooses some (see the specifications, a catalogue estimate), but their tightening torque is not given, because it depends on the timber, the section and who builds. They are drawn in stainless steel (estimate), because bare steel would rust quickly in water.',
    ),
    material: l('Acier inoxydable (estimation)', 'Stainless steel (estimate)'),
    specs: [
      sp(
        'Couple à transmettre',
        'Torque to carry',
        tf('model', '{torqueScrew} N·m à {rpm} tr/min', '{torqueScrew} N·m at {rpm} rpm'),
      ),
      sp('Matière', 'Material', tf('estimate', 'acier inoxydable', 'stainless steel')),
      sp(
        'Couple de serrage',
        'Tightening torque',
        l(
          'non donné par les sources : à calculer pour le bois et la machine',
          'not given by the sources: to be worked out for the timber and the machine',
        ),
      ),
      sp(
        'Démontage',
        'Taking apart',
        l('oui : on dévisse et on revisse (vidéo)', 'yes: unscrew and screw back (video)'),
      ),
    ],
    maintenance: maint(
      {
        failure:
          'Les vis se desserrent (le bois gonfle et sèche, la vis vibre), s’oxydent, ou arrachent le bois du module ; un trou s’ovalise et donne du jeu.',
        check:
          'Vis hors d’eau, testez chaque fixation à la clé, sans forcer, en cherchant celles qui tournent ; regardez les têtes : rouille, traces brunes dans le bois.',
        care: 'Resserrez après les premières semaines, puis à chaque saison ; remplacez une fixation rouillée par une neuve identique, jamais en mélangeant des aciers différents.',
      },
      {
        failure:
          'Screws loosen (the timber swells and dries, the screw vibrates), rust, or tear the timber of the module; a hole turns oval and gives play.',
        check:
          'With the screw out of the water, test each fastener with a spanner, without force, looking for those that turn; look at the heads: rust, brown stains in the timber.',
        care: 'Retighten after the first few weeks, then every season; replace a rusty fastener with an identical new one, never mixing different steels.',
      },
    ),
    tip: l(
      'Resserrez en croix et régulièrement : sur du bois qui travaille, un serrage ne tient pas pour toujours. Aucun couple n’est donné ici, ce n’est pas un plan de construction.',
      'Retighten crosswise and regularly: on timber that works, a tightening does not last for ever. No torque is given here, this is not a construction plan.',
    ),
    video: ['26:20', '26:41'],
    design: l(
      'Un assemblage vissé est moins rigide qu’un assemblage collé, mais on peut le défaire : c’est le prix de la réparation par le propriétaire, que les constructeurs de la vidéo mettent en avant.',
      'A screwed joint is less stiff than a glued one, but it can be undone: that is the price of repair by the owner, which the video’s builders put forward.',
    ),
  },
  {
    id: 'upper-bearing',
    scene: 'screw',
    category: 'mechanical',
    name: l('Palier haut', 'Upper bearing'),
    short: l(
      'Roulement en haut de la vis : il la guide, la retient, et c’est par là que sort l’arbre.',
      'Bearing at the top of the screw: it guides it, holds it, and the shaft leaves through it.',
    ),
    description: lf(
      'Le palier haut est un roulement à billes industriel, monté dans un support fixé à la structure, au-dessus de l’eau. Il guide l’extrémité haute de la vis ; dans ce dessin, c’est lui qui reprend la poussée le long de l’axe, car la vis penchée tend à glisser vers le bas (estimation du labo : la vidéo dit seulement que ce palier la retient). C’est aussi par ce bout que sort l’arbre vers la transmission, et que passent les {torqueScrew} N·m du point de calcul (résultat du modèle). Les axes de la vidéo sont des pièces métalliques faites à façon par un petit usineur, les roulements des roulements industriels du commerce.',
      'The upper bearing is an industrial ball bearing, mounted in a housing fixed to the structure, above the water. It guides the top end of the screw; in this drawing, it is the one that takes the thrust along the axis, because the tilted screw tends to slide downhill (the lab’s estimate: the video says only that this bearing holds it). The shaft also leaves through this end towards the drive, carrying the {torqueScrew} N·m of the design point (model result). The video’s shafts are metal parts made to order by a small machine shop, the bearings industrial bearings from the trade.',
    ),
    material: l(
      'Roulement à billes d’acier, support en acier ou en fonte',
      'Steel ball bearing, steel or cast-iron housing',
    ),
    specs: [
      sp(
        'Rôle',
        'Role',
        tf(
          'estimate',
          'guide l’extrémité haute et retient la poussée axiale',
          'guides the top end and takes the axial thrust',
        ),
      ),
      sp('Type', 'Type', l('roulement industriel du commerce (vidéo)', 'industrial bearing from the trade (video)')),
      sp('Vitesse', 'Speed', tf('model', '{rpm} tr/min', '{rpm} rpm')),
      sp('Couple transmis', 'Torque carried', tf('model', '{torqueScrew} N·m', '{torqueScrew} N·m')),
      sp(
        'Pertes des deux paliers',
        'Losses of the two bearings',
        tf(
          'model',
          '≈ {lossBearingW} W (frottement supposé : μ = 0,01)',
          '≈ {lossBearingW} W (assumed friction: μ = 0.01)',
        ),
      ),
    ],
    maintenance: maint(
      {
        failure:
          'Le roulement chauffe, grince ou prend du jeu ; la graisse sèche ou se lessive ; le support se desserre ; les éclaboussures et la condensation le rouillent.',
        check:
          'Vis à l’arrêt, vanne fermée, faites-la tourner à la main : pas de point dur ni de jeu en poussant l’axe. À la mise en route, un grondement est un roulement fatigué ; la main posée sur le boîtier ne doit sentir aucune chaleur anormale.',
        care: 'Graissez selon l’avis du fabricant du roulement, protégez-le des éclaboussures, et changez-le avant la fin de sa vie, pas après la casse.',
      },
      {
        failure:
          'The bearing heats up, squeaks or gets play; the grease dries or washes out; the housing loosens; splashes and condensation rust it.',
        check:
          'With the screw stopped and the gate shut, turn it by hand: no tight spot or play when pushing the shaft. At start-up, a rumble is a tired bearing; a hand on the housing must feel no abnormal heat.',
        care: 'Grease following the bearing maker’s advice, protect it from splashes, and change it before the end of its life, not after it fails.',
      },
    ),
    tip: l(
      'Gardez un roulement de rechange identique : c’est la pièce du commerce qui s’use, et elle ne se trouve pas toujours le jour où l’on en a besoin.',
      'Keep an identical spare bearing: it is the shop-bought part that wears out, and it is not always to be found the day you need it.',
    ),
    video: ['17:49', '27:31'],
    design: l(
      'Un roulement du commerce fait ce que ni le bois ni le tour de main ne font : tenir un axe rond avec très peu de frottement. Le modèle compte à peine 0,2 % de perte pour les deux paliers.',
      'A shop-bought bearing does what neither timber nor craft can: hold a round shaft with very little friction. The model counts barely 0.2% of loss for the two bearings.',
    ),
  },
  {
    id: 'lower-bearing',
    scene: 'screw',
    category: 'mechanical',
    name: l('Palier bas', 'Lower bearing'),
    short: l(
      'Roulement en bas de la vis, près de l’eau : il guide l’extrémité aval.',
      'Bearing at the bottom of the screw, near the water: it guides the downstream end.',
    ),
    description: l(
      'Le palier bas tient l’autre bout de la vis, au bas de la pente, là où l’eau repart. Il guide l’axe, sans porter la poussée (estimation : elle est au palier haut). Il vit dans l’humidité, éclaboussé, parfois noyé en crue : c’est le roulement le plus exposé, donc celui qu’il faut protéger par des joints et une graisse qui résiste à l’eau. Les deux paliers doivent tenir la vis sur une même droite, penchée de 22°, avec l’auge tout autour : un défaut d’alignement de quelques millimètres suffit à faire frotter les pales. La vidéo ne décrit que sa fonction : la turbine y est tenue en bas.',
      'The lower bearing holds the other end of the screw, at the bottom of the slope, where the water leaves. It guides the shaft without carrying the thrust (estimate: that is at the upper bearing). It lives in damp, splashed, sometimes drowned in a flood: it is the most exposed bearing, so it must be protected by seals and a grease that resists water. The two bearings must hold the screw on one straight line, tilted at 22°, with the trough all around it: a misalignment of a few millimetres is enough to make the blades rub. The video describes only its function: the turbine is held at the bottom there.',
    ),
    material: l(
      'Roulement à billes d’acier, support en acier inoxydable',
      'Steel ball bearing, stainless steel housing',
    ),
    specs: [
      sp(
        'Rôle',
        'Role',
        tf('estimate', 'guide l’extrémité basse, sans la poussée', 'guides the bottom end, without the thrust'),
      ),
      sp('Exposition', 'Exposure', l('humide, éclaboussé, noyé en crue', 'damp, splashed, drowned in a flood')),
      sp(
        'Étanchéité',
        'Sealing',
        l(
          'joints et graisse choisis pour l’eau : aucune source ne les décrit',
          'seals and grease chosen for water: no source describes them',
        ),
      ),
      sp(
        'Alignement',
        'Alignment',
        l('même droite que le palier haut, penchée de 22°', 'same line as the upper bearing, tilted at 22°'),
      ),
    ],
    maintenance: maint(
      {
        failure:
          'L’eau entre dans le roulement : la graisse se lessive, il rouille et se grippe ; le sable et la vase l’usent ; en crue il se noie, et le niveau d’eau le recouvre.',
        check:
          'Vanne fermée, faites tourner la vis à la main : point dur ? jeu en poussant l’axe ? Une graisse blanchâtre ou laiteuse est de la graisse qui a pris l’eau.',
        care: 'Regraissez plus souvent que le palier haut, changez les joints, rincez la vase après chaque crue.',
      },
      {
        failure:
          'Water gets into the bearing: the grease washes out, it rusts and seizes; sand and silt wear it; in a flood it drowns, and the water level covers it.',
        check:
          'With the gate shut, turn the screw by hand: tight spot? play when pushing the shaft? A whitish or milky grease is grease that has taken water.',
        care: 'Regrease more often than the upper bearing, change the seals, rinse off the silt after every flood.',
      },
    ),
    tip: l(
      'Un palier sous l’eau, c’est un entretien qu’on ne voit pas : prévoyez-le accessible (échelle, plancher) pour ne pas devoir le deviner.',
      'A bearing under water is upkeep you cannot see: make it reachable (ladder, floor) so you do not have to guess.',
    ),
    video: ['18:03', '18:13'],
    design: l(
      'Les deux paliers se partagent le travail : le haut retient, le bas guide. Cela permet au bas d’être simple, étanche et facile à remplacer, là où l’humidité est la plus forte.',
      'The two bearings share the job: the top one holds, the bottom one guides. This lets the bottom one be simple, sealed and easy to replace, where the damp is greatest.',
    ),
  },
  {
    id: 'inlet-sill',
    scene: 'screw',
    category: 'hydraulic',
    name: l('Seuil d’entrée', 'Inlet sill'),
    short: l(
      'Seuil par lequel l’eau entre dans les premières poches : il règle ce que la vis avale.',
      'Sill over which the water enters the first pockets: it sets what the screw swallows.',
    ),
    description: lf(
      'En tête de la vis, l’eau du bief déborde le seuil d’entrée et tombe dans les premières poches. Une vis ne fixe pas son débit : elle avale ce qui arrive, jusqu’à ce que ses poches soient pleines. Quand il arrive moins d’eau, le plan d’eau amont s’abaisse, de {drawdown} cm au plus entre une poche vide et une poche pleine, ce qui coûte un peu de chute ; la vis, elle, garde son rendement : à un tiers du débit de calcul, le modèle lui donne {third} % de l’eau qu’elle reçoit (résultat du modèle). Là où les pales plongent dans l’eau, elles éclaboussent, et cela coûte {lossInletW} W au point de calcul (résultat du modèle). Dans la vidéo, on monte le niveau de l’eau peu à peu à la première mise en eau.',
      'At the head of the screw, the water of the headrace spills over the inlet sill and falls into the first pockets. A screw does not fix its flow: it swallows what arrives, until its pockets are full. When less water arrives, the pool upstream sinks, by {drawdown} cm at most between an empty and a full pocket, which costs a little head; the screw itself keeps its efficiency: at a third of the design flow, the model gives it {third}% of the water power it receives (model result). Where the blades plunge into the water they splash, and that costs {lossInletW} W at the design point (model result). In the video, the water level is raised gradually at the first filling.',
    ),
    material: l('Pierre, bois ou acier du radier d’entrée', 'Stone, timber or steel of the inlet apron'),
    specs: [
      sp('Débit de calcul', 'Design flow', tf('derived', '{flowLs} L/s', '{flowLs} L/s')),
      sp(
        'Chute du point de calcul',
        'Head of the design point',
        tf('assumed', '{head} m (la vidéo parle de 1,5 à 2 m)', '{head} m (the video speaks of 1.5 to 2 m)'),
      ),
      sp(
        'Baisse possible du plan d’eau',
        'Possible sinking of the pool',
        tf('model', '{drawdown} cm entre poche vide et pleine', '{drawdown} cm between an empty and a full pocket'),
      ),
      sp(
        'Rendement à un tiers du débit',
        'Efficiency at a third of the flow',
        tf(
          'model',
          '{third} % de l’eau reçue, poches remplies à {thirdFill} %',
          '{third}% of the water received, pockets {thirdFill}% full',
        ),
      ),
      sp('Perte à l’entrée', 'Loss at the inlet', tf('model', '{lossInletW} W', '{lossInletW} W')),
    ],
    maintenance: maint(
      {
        failure:
          'Le seuil s’envase ou se couvre de feuilles ; un jeu entre le seuil et la tête de la vis fait fuir l’eau sans passer par les poches ; le niveau d’entrée dérive à cause d’un affouillement.',
        check:
          'Regardez l’eau entrer : une nappe régulière, sans tourbillon ni éclaboussure. Le niveau amont, à débit connu, doit rester le même d’une saison à l’autre.',
        care: 'Dégagez feuilles et vase ; ne changez pas la hauteur du seuil à l’œil, c’est elle qui règle le remplissage.',
      },
      {
        failure:
          'The sill silts up or covers with leaves; a gap between the sill and the head of the screw lets water leak without going through the pockets; the inlet level drifts because of scouring.',
        check:
          'Watch the water come in: an even sheet, with no swirl or splash. The upstream level, at a known flow, should stay the same from one season to the next.',
        care: 'Clear leaves and silt; do not change the height of the sill by eye, it is what sets the filling.',
      },
    ),
    tip: l(
      'À la première mise en eau, montez le niveau peu à peu, avant d’ouvrir en grand ; et ne le faites qu’une fois la génératrice branchée, car une vis sans charge s’emballe.',
      'At the first filling, raise the level gradually, before opening wide; and do it only once the generator is connected, because a screw with no load races.',
    ),
    video: ['22:50', '28:51'],
    design: l(
      'Cette souplesse est l’atout de la vis : dans les essais publiés que le modèle retrouve, son rendement reste presque constant jusqu’à environ un tiers du débit. C’est un bon atout pour un cours d’eau qui change toute l’année.',
      'This flexibility is the screw’s asset: in the published tests that the model reproduces, its efficiency stays almost flat down to about a third of the flow. It is a good asset for a stream that changes all year.',
    ),
  },
  {
    id: 'outlet-pool',
    scene: 'screw',
    category: 'hydraulic',
    name: l('Bassin de sortie', 'Outlet pool'),
    short: l(
      'Bassin où plongent les dernières poches : son niveau décide de ce qu’on perd en sortie.',
      'Pool where the last pockets plunge: its level decides what is lost at the outlet.',
    ),
    description: lf(
      'Au bas de la vis, les poches se vident dans le bassin de sortie, qui rejoint le canal de fuite. Son niveau compte : les études publiées donnent une immersion optimale du bas de la vis. Trop haute, l’eau noie les derniers godets et mange de la chute ; trop basse, les godets se vident trop tôt et l’eau tombe pour rien. À l’optimum, la perte de sortie est de {lossOutletW} W au point de calcul, soit environ 3 % de la puissance de l’eau (résultat du modèle). Si l’eau aval monte de 0,5 m, la machine perd {tail05Pct} % de sa puissance électrique (résultat du modèle).',
      'At the bottom of the screw the pockets empty into the outlet pool, which joins the tailrace. Its level matters: published studies give an optimal immersion of the bottom of the screw. Too high, the water drowns the last buckets and eats head; too low, the buckets empty too early and the water falls for nothing. At the optimum, the outlet loss is {lossOutletW} W at the design point, about 3% of the water power (model result). If the water downstream rises by 0.5 m, the machine loses {tail05Pct}% of its electric power (model result).',
    ),
    material: l('Maçonnerie, radier de pierre ou de béton', 'Masonry, stone or concrete apron'),
    specs: [
      sp(
        'Profondeur d’eau optimale au bas de l’auge',
        'Optimal water depth at the bottom of the trough',
        tf(
          'derived',
          '≈ {tailDepth} m (60 % de D × cos 22°, valeur publiée)',
          '≈ {tailDepth} m (60% of D × cos 22°, published value)',
        ),
      ),
      sp(
        'Perte en sortie, niveau optimal',
        'Outlet loss, optimal level',
        tf('model', '{lossOutletW} W', '{lossOutletW} W'),
      ),
      sp(
        'Eau aval plus haute de 0,5 m',
        'Water downstream 0.5 m higher',
        tf('model', '{tail05Pct} % d’électricité en moins', '{tail05Pct}% less electricity'),
      ),
      sp(
        'Eau aval trop basse',
        'Water downstream too low',
        l(
          'les godets se vident avant le bas : la chute n’est pas toute prise',
          'the buckets empty before the bottom: not all the head is taken',
        ),
      ),
      sp(
        'À la fermeture en crue',
        'When the gate shuts in a flood',
        tf(
          'model',
          '+{tailGate} m aval, il reste {headLeft} m de chute',
          '+{tailGate} m downstream, {headLeft} m of head left',
        ),
      ),
    ],
    maintenance: maint(
      {
        failure:
          'Le bassin s’envase ou le canal de fuite refoule : le niveau monte et noie la sortie ; ou le lit se creuse et le niveau baisse, les godets se vident trop tôt.',
        check: 'Comparez le niveau du bassin, à débit connu, avec le repère noté à la mise en service.',
        care: 'Curez le bassin, gardez la sortie dégagée, et notez le niveau le jour du réglage : un repère peint sur le mur vaut mieux que la mémoire.',
      },
      {
        failure:
          'The pool silts up or the tailrace backs up: the level rises and drowns the outlet; or the bed erodes and the level drops, the buckets empty too early.',
        check: 'Compare the pool level, at a known flow, with the mark noted at commissioning.',
        care: 'Dredge the pool, keep the outlet clear, and note the level on the day of setting up: a mark painted on the wall beats memory.',
      },
    ),
    tip: l(
      'En crue, c’est ce bassin qui fait perdre la chute : l’eau aval monte avant que la vanne ne se ferme.',
      'In a flood, it is this pool that makes the head disappear: the water downstream rises before the gate shuts.',
    ),
    video: ['12:45', '23:12'],
    design: l(
      'On pense à la hauteur d’où l’eau tombe ; ici, c’est la hauteur où elle atterrit qui se règle finement : une vis perd plus qu’une roue à mal sortir son eau.',
      'We think of the height the water falls from; here, it is the height where it lands that needs fine setting: a screw loses more than a wheel by getting its water out badly.',
    ),
  },
  {
    id: 'trapped-water',
    scene: 'screw',
    category: 'hydraulic',
    name: l('Poche d’eau', 'Water pocket'),
    short: l(
      'L’eau emprisonnée entre deux pales : le cœur de la vis, un toboggan qui tourne.',
      'The water trapped between two blades: the heart of the screw, a slide that turns.',
    ),
    description: lf(
      'Une vis d’Archimède ne pousse pas l’eau, elle la laisse descendre. Inclinée, elle accueille l’eau par le haut ; l’eau reste prise entre deux filets, dans l’auge, et ne peut aller plus loin que sa poche. Comme la vis est penchée, chaque poche est environ {stepCm} cm plus haute que celle du dessous (dérivé) : un escalier d’eau de {buckets} marches (dérivé), qui additionnent la chute. L’eau pousse les pales, la vis tourne, et la poche descend à {pocketSpeed} m/s le long de l’axe, soit {transit} s du haut au bas (dérivé). La vidéo l’explique ainsi : l’eau pèse sur la moitié basse et déséquilibre la vis ; un poisson qui entre reste dans sa poche et descend avec elle.',
      'An Archimedes screw does not push the water, it lets it go down. Tilted, it receives the water at the top; the water stays caught between two threads, in the trough, and cannot go further than its pocket. As the screw is tilted, each pocket is about {stepCm} cm higher than the one below (derived): a staircase of water with {buckets} steps (derived), which add up to the head. The water pushes the blades, the screw turns, and the pocket goes down at {pocketSpeed} m/s along the axis, that is {transit} s from top to bottom (derived). The video explains it this way: the water weighs on the lower half and unbalances the screw; a fish that gets in stays in its pocket and goes down with it.',
    ),
    material: l('Eau : la seule pièce qui n’est pas solide', 'Water: the only part that is not solid'),
    specs: [
      sp('Volume d’une poche pleine', 'Volume of a full pocket', tf('derived', '≈ {bucketL} L', '≈ {bucketL} L')),
      sp('Poches dans les trois filets', 'Pockets in the three threads', tf('derived', '≈ {buckets}', '≈ {buckets}')),
      sp(
        'Eau en transit, toutes pleines',
        'Water in transit, all full',
        tf('derived', '≈ {bucketsM3} m³, soit une tonne', '≈ {bucketsM3} m³, that is a tonne'),
      ),
      sp(
        'Marche d’une poche à l’autre',
        'Step from one pocket to the next',
        tf('derived', '≈ {stepCm} cm', '≈ {stepCm} cm'),
      ),
      sp(
        'Vitesse de descente',
        'Speed of descent',
        tf(
          'derived',
          '≈ {pocketSpeed} m/s, soit {transit} s pour la longueur',
          '≈ {pocketSpeed} m/s, that is {transit} s for the length',
        ),
      ),
      sp(
        'À un tiers du débit',
        'At a third of the flow',
        tf('model', 'poches remplies à {thirdFill} %', 'pockets {thirdFill}% full'),
      ),
    ],
    maintenance: maint(
      {
        failure:
          'Ce que l’eau emporte avec elle : feuilles, sable, graviers. La poche se vide trop tôt si le jeu s’use, déborde si la vis tourne trop lentement, et se remplit à moitié si elle tourne trop vite.',
        check:
          'Regardez les poches de côté ou à la lampe : la surface de l’eau doit rester horizontale dans chaque poche, quelle que soit la rotation, et les poches doivent être pleines au débit de calcul.',
        care: 'On n’entretient pas l’eau : on entretient ce qui la tient, l’auge, les pales, le jeu, et la vitesse.',
      },
      {
        failure:
          'What the water carries with it: leaves, sand, gravel. The pocket empties too early if the gap wears, overflows if the screw turns too slowly, and fills only halfway if it turns too fast.',
        check:
          'Look at the pockets from the side or by torchlight: the water surface must stay horizontal in each pocket, whatever the rotation, and the pockets must be full at the design flow.',
        care: 'You do not maintain water: you maintain what holds it, the trough, the blades, the gap, and the speed.',
      },
    ),
    tip: l(
      'Cherchez la surface horizontale : dans chaque poche, l’eau reste à plat pendant que la vis tourne. C’est la différence de niveau entre deux poches voisines qui pousse chaque pale.',
      'Look for the level surface: in each pocket the water stays flat while the screw turns. It is the difference in level between two neighbouring pockets that pushes each blade.',
    ),
    video: ['09:35', '25:30'],
    design: lf(
      'Le débit se compte en poches : trois poches de {bucketL} L chacune par tour, à {rpm} tr/min, font environ {qBucketLs} L/s ; les {qGapLs} L/s qui manquent pour atteindre {flowLs} L/s fuient par le jeu (résultat du modèle, dérivé du débit de calcul). Voilà pourquoi la vis est grosse pour ce qu’elle produit.',
      'The flow is counted in pockets: three pockets of {bucketL} L each per turn, at {rpm} rpm, make about {qBucketLs} L/s; the {qGapLs} L/s missing to reach {flowLs} L/s leak through the gap (model result, derived from the design flow). That is why the screw is big for what it produces.',
    ),
  },
];
