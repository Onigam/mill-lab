// Installation guide of the site (wave 2, extended in completion wave A): 16 steps across the `site`, `screw` and `powerroom` worlds, in the order a
// real project follows: the water right and the permits BEFORE anything, then the reserved flow and the fish pass, the weir and the canal, the head
// gate and the coarse rack, the chamber and the mill, the levels of the screw, the drive, the powerhouse (the building, then its electrics in the room
// itself: earth and board first, protections, wiring in the order of the current, the battery last), the tailrace, the check of the room, the first
// start and what to watch, and the stop procedure.
//
//   1  rights            `site`      the river (what must be known and obtained before spending a euro)
//   2  flow-and-fish     `site`      the reserved-flow notch and the fish pass
//   3  weir-canal        `site`      the weir and the headrace
//   4  gate-rack         `site`      the head gate and the coarse rack
//   5  chamber           `site`      the water chamber and the mill building
//   6  levels            `screw`     the inlet sill and the outlet pool (the levels that fix the head and the slope)
//   7  drive             `screw`     aligning and guarding the drive (nothing new is installed: the assembly guide built it)
//   8  powerhouse        `site`      the building and the house it feeds
//   9  earth-and-board   `powerroom` the earth rod and the board, before any wire
//   10 protections       `powerroom` the DC breaker and the fuse box, open
//   11 wire-chain        `powerroom` rectifier, charge controller and dump load, in the order of the current
//   12 battery-last      `powerroom` the battery, then the inverter and the energy meter
//   13 tailrace          `site`      the tailrace
//   14 electrical-check  `powerroom` the check of the room before the water (nothing installed)
//   15 first-start       `screw`     the first filling: the pockets of water appear; what to watch
//   16 stop              `site`      the stop procedure (nothing installed)
//
// Every id of `site` and of `powerroom` is installed in exactly ONE step (a test checks it). The `screw` steps list only the three ids that the SITE
// sets (the two levels and the water); the rest of the machine is shown solid, as the assembly guide built it, and the `generator` world, a bought
// machine opened, has no step here. Three steps install nothing.
//
// What depends on the country is said as such: the water right, the permit to produce, the reserved flow and the fish pass (said once,
// in general terms, with the French wording only in the French text), the electrical rules, building rules. The video's source for the French
// context is the one mill it shows; the lab publishes no legal advice. The electrical steps are the lab's reading of a small off-grid 48 V
// plant (the video gives a sentence or two of it): their order (earth first, protections open, sources last, the load before the water, isolate
// and test dead before touching) is the general rule, not a wiring plan. Safety is first (docs/research.md §7): drowning, confined space and
// ladder, the rotating screw, the battery and its short-circuit current, direct-current arcs, the qualified electrician, a screw that races
// without a load.
// Each step text stays within 80 words in both languages. DURATIONS ARE ROUGH ESTIMATES; no torque is given; no dimension beyond the model.
import type { GuideStep } from '@onigam/lab-kit/content';
import { l } from '@onigam/lab-kit/i18n';
import { lf } from './part-helpers';

export const INSTALL: GuideStep[] = [
  {
    id: 'rights',
    scene: 'site',
    title: l('Droit d’eau et permis, avant toute chose', 'Water right and permits, before anything'),
    text: l(
      'Un bief n’est pas libre d’usage. Avant d’acheter ou de construire quoi que ce soit, renseignez-vous : le droit d’utiliser l’eau (pour un moulin ancien, un droit parfois très vieux, à faire reconnaître), l’autorisation de produire de l’électricité, le débit à laisser à la rivière, le passage des poissons. Tout cela dépend du pays et de la rivière, et les démarches peuvent prendre des années. Observez aussi la rivière toute une année.',
      'A mill race is not free to use. Before buying or building anything, find out: the right to use the water (for an old mill, sometimes a very old right that has to be recognised), the permit to produce electricity, the flow to leave in the river, the passage for fish. All this depends on the country and the river, and the paperwork can take years. Also watch the river for a whole year.',
    ),
    parts: ['river'],
    tools: [
      l('Dossier et patience', 'A file and patience'),
      l('Échelle de niveau, seau et montre', 'Level gauge, bucket and watch'),
    ],
    tip: l(
      'Notez le niveau et le débit de la rivière une fois par semaine : le labo n’en dessine qu’une année, la vôtre sera différente.',
      'Note the river’s level and flow once a week: the lab draws only one year, yours will differ.',
    ),
    warning: l(
      'Ce labo ne donne aucun avis juridique : en France, adressez-vous au service de l’État chargé de l’eau (droit « fondé en titre » des moulins d’avant la Révolution) ; ailleurs, à l’autorité de l’eau de votre pays.',
      'This lab gives no legal advice: ask the water authority of your country about the right, the permit and the values to respect.',
    ),
  },
  {
    id: 'flow-and-fish',
    scene: 'site',
    title: l('Régler le débit réservé et la passe à poissons', 'Settle the reserved flow and the fish pass'),
    text: lf(
      'Avant de prendre de l’eau, décidez ce qui reste à la rivière : une échancrure calibrée dans le seuil laisse passer en permanence le débit réservé. Le labo suppose un dixième du débit moyen, {reservedLs} L/s sur son bief (hypothèse) ; la valeur réelle est fixée par l’autorité. La passe à poissons laisse remonter le seuil ; la vis, elle, ne s’occupe que de la descente.',
      'Before taking water, decide what stays in the river: a calibrated notch in the weir lets the reserved flow pass all the time. The lab assumes a tenth of the mean flow, {reservedLs} L/s on its race (assumption); the real value is set by the authority. The fish pass lets fish swim up the weir; the screw only takes care of the way down.',
    ),
    parts: ['reserved-flow-notch', 'fish-pass'],
    tools: [l('Seau et montre', 'Bucket and watch'), l('Un spécialiste des poissons', 'A fish specialist')],
    tip: l(
      'Un seau de dix litres qui se remplit en une seconde fait dix litres par seconde : le moyen le plus simple de vérifier un filet d’eau.',
      'A ten-litre bucket that fills in a second makes ten litres a second: the simplest way to check a trickle.',
    ),
    warning: l(
      'Une passe à poissons se dimensionne avec un spécialiste, jamais au jugé ; et on n’élargit jamais l’échancrure « pour prendre un peu plus ».',
      'A fish pass is sized with a specialist, never by guesswork; and the notch is never widened “to take a little more”.',
    ),
    duration: '≈ 16 h (est.)',
  },
  {
    id: 'weir-canal',
    scene: 'site',
    title: l('Remettre en état le seuil et le bief', 'Restore the weir and the headrace'),
    text: lf(
      'Le seuil relève l’eau ; le bief la conduit à la chambre. Souvent, ils existent déjà : contrôlez le seuil (fuites, affouillement), curez le bief, vérifiez que sa pente reste presque nulle. Chaque centimètre de chute perdu coûte environ {cmW} W de puissance d’eau pour {flowLs} L/s (dérivé) : sur {head} m de chute (hypothèse), c’est moins d’un pour cent par centimètre.',
      'The weir raises the water; the headrace brings it to the chamber. Often they already exist: check the weir (leaks, scouring), dredge the headrace, check that its slope stays almost nil. Every centimetre of head lost costs about {cmW} W of water power for {flowLs} L/s (derived): on {head} m of head (assumption), that is less than one percent per centimetre.',
    ),
    parts: ['weir', 'headrace'],
    tools: [
      l('Pelle et râteau', 'Spade and rake'),
      l('Niveau de chantier', 'Site level'),
      l('Gilet de sauvetage', 'Life jacket'),
    ],
    warning: l(
      'Berges glissantes, eau froide et rapide : ne travaillez jamais seul au bord d’un canal ou d’une rivière, ni dans l’eau d’un canal qui coule ; gilet et corde de sécurité.',
      'Slippery banks, cold fast water: never work alone beside a canal or river, or in the water of a flowing canal; life jacket and safety line.',
    ),
    duration: '≈ 24 h (est.)',
  },
  {
    id: 'gate-rack',
    scene: 'site',
    title: l('Poser la vanne de tête et la grille grossière', 'Fit the head gate and the coarse rack'),
    text: l(
      'La vanne coupe l’eau : elle doit se verrouiller par un cadenas et se manœuvrer depuis la berge, à sec, même en crue. La grille, à gros barreaux, arrête troncs et planches ; une vis n’a pas besoin de grille fine ni de dégrilleur, car feuilles, branches fines et poissons la traversent. Restez prudent : un tronc coincé dans le jeu entre pale et auge peut bloquer la vis.',
      'The gate cuts the water: it must lock with a padlock and be operated from the bank, dry-shod, even in a flood. The rack, with wide bars, stops logs and planks; a screw needs no fine rack or rack cleaner, because leaves, thin branches and fish pass through it. Stay careful: a log jammed in the gap between blade and trough can block the screw.',
    ),
    parts: ['intake-gate', 'trash-rack'],
    tools: [l('Cadenas', 'Padlock'), l('Râteau à long manche', 'Long-handled rake'), l('Niveau', 'Level')],
    tip: l(
      'Prévoyez une manœuvre à la main : un moteur de vanne tombe en panne juste quand on en a besoin.',
      'Provide a hand operation: a gate motor fails just when it is needed.',
    ),
    duration: '≈ 16 h (est.)',
  },
  {
    id: 'chamber',
    scene: 'site',
    title: l('Préparer la chambre d’eau et vérifier le moulin', 'Prepare the water chamber and check the mill'),
    text: lf(
      'Vanne fermée et verrouillée, vidangez la chambre, curez la vase, contrôlez les murs et le sol. Relevez la hauteur sous plancher, l’accès (échelle) et le chemin des pièces : une vis est lourde (environ {mass} kg de bois, estimation), d’où le kit assemblé sur place. Gardez l’ouvrage tel qu’il est : la vis s’y glisse, on ne casse pas des murs de plusieurs siècles.',
      'With the gate shut and locked, drain the chamber, clear the silt, check the walls and floor. Note the headroom, the access (ladder) and the way for the pieces: a screw is heavy (about {mass} kg of timber, an estimate), hence the kit assembled on the spot. Keep the structure as it is: the screw slips in, centuries-old walls are not to be broken.',
    ),
    parts: ['water-chamber', 'mill-building'],
    tools: [l('Pompe de vidange', 'Drain pump'), l('Lampe', 'Torch'), l('Mètre laser', 'Laser tape')],
    warning: l(
      'Espace confiné : ne descendez jamais seul, jamais sans que la vanne soit fermée et verrouillée, jamais avec de l’eau qui peut monter ; échelle fixée, éclairage, un témoin dehors.',
      'Confined space: never go down alone, never unless the gate is shut and locked, never with water that can rise; fixed ladder, lighting, a watcher outside.',
    ),
    duration: '≈ 16 h (est.)',
  },
  {
    id: 'levels',
    scene: 'screw',
    title: l('Caler la vis sur les niveaux du site', 'Set the screw on the levels of the site'),
    text: l(
      'Les niveaux de l’eau décident de tout : le seuil d’entrée fixe l’eau d’amont, le bassin de sortie l’eau d’aval, et leur différence est la chute. La vis est assez longue pour la couvrir, la chute divisée par le sinus de la pente (22°, l’angle le plus courant). Mesurez ces niveaux sur place, au printemps comme à l’étiage, avant de poser quoi que ce soit.',
      'The water levels decide everything: the inlet sill fixes the upstream water, the outlet pool the downstream water, and their difference is the head. The screw is long enough to cover it, the head divided by the sine of the slope (22°, the most usual angle). Measure these levels on site, in spring as in low water, before laying anything.',
    ),
    parts: ['inlet-sill', 'outlet-pool'],
    tools: [
      l('Niveau de chantier', 'Site level'),
      l('Mètre', 'Tape'),
      l('Peinture pour les repères', 'Paint for the marks'),
    ],
    tip: l(
      'Peignez les repères de niveau sur le mur : toute l’exploitation suivante se compare à eux.',
      'Paint the level marks on the wall: all later operation is compared to them.',
    ),
    duration: '≈ 8 h (est.)',
  },
  {
    id: 'drive',
    scene: 'screw',
    title: l('Aligner la transmission et fermer les carters', 'Align the drive and close the guards'),
    text: lf(
      'Les deux pignons sont dans le même plan, les deux poulies aussi ; la chaîne et la courroie sont tendues à la main, ni battantes ni raides ; la génératrice est fixée. Le rapport total est {ratio} (dérivé) : s’il est faux, la vis tourne trop vite ou trop lente et perd de la puissance. Fermez les carters de la chaîne, de la courroie et de la vis avant de rouvrir l’eau.',
      'The two sprockets are in the same plane, the two pulleys too; the chain and the belt are tensioned by hand, neither flapping nor stiff; the generator is fixed. The total ratio is {ratio} (derived): if it is wrong, the screw turns too fast or too slow and loses power. Close the guards of the chain, the belt and the screw before reopening the water.',
    ),
    parts: [],
    tools: [l('Règle', 'Straightedge'), l('Clés', 'Spanners'), l('Carters', 'Guards')],
    warning: l(
      'Une chaîne, une courroie, une vis qui tournent happent un bras, une manche, des cheveux : carters en place, un garde-corps au-dessus de la vis, jamais de main près d’une pièce qui tourne.',
      'A chain, a belt, a screw that turn snatch an arm, a sleeve, hair: guards in place, a guard rail above the screw, never a hand near a turning part.',
    ),
    duration: '≈ 8 h (est.)',
  },
  {
    id: 'powerhouse',
    scene: 'site',
    title: l(
      'Construire le local technique, au sec et près de la maison',
      'Build the powerhouse, dry and close to the house',
    ),
    text: l(
      'Le local technique, sec, aéré et au-dessus des crues, abritera le tableau, la batterie et l’onduleur. Plus il est près de la maison, plus le câble est court et moins il perd, car en basse tension le courant est fort. Il se ferme à clé, pour les enfants et les animaux. Le câblage vient ensuite, dans le local lui-même, dans l’ordre des étapes suivantes. La maison se branche en dernier, par un électricien.',
      'The powerhouse, dry, ventilated and above flood level, will hold the board, the battery and the inverter. The closer it is to the house, the shorter the cable and the less it loses, because at low voltage the current is large. It locks, against children and animals. The wiring comes next, in the room itself, in the order of the following steps. The house is connected last, by an electrician.',
    ),
    parts: ['powerhouse', 'house-load'],
    tools: [
      l('Câbles et fusibles', 'Cables and fuses'),
      l('Multimètre', 'Multimeter'),
      l('Outils isolés', 'Insulated tools'),
    ],
    warning: l(
      'Câblage et raccordement au réseau : l’affaire d’un électricien qualifié, selon les règles de votre pays. Une batterie ne se court-circuite jamais ; l’onduleur donne une tension mortelle.',
      'Wiring and grid connection: a job for a qualified electrician, following your country’s rules. A battery is never short-circuited; the inverter gives a lethal voltage.',
    ),
    duration: '≈ 24 h (est.)',
  },
  {
    id: 'earth-and-board',
    scene: 'powerroom',
    title: l(
      'Planter la prise de terre et fixer le tableau, avant tout fil',
      'Drive the earth rod and fix the board, before any wire',
    ),
    text: l(
      'Avant qu’un fil porte du courant, plantez le piquet et fixez le tableau. La terre d’abord : toutes les carcasses métalliques y seront reliées, et des parafoudres écouleront les surtensions loin du matériel. Le tableau est l’ossature du local : appareils, étiquettes, schéma sur la porte. Un électricien mesure la résistance de la prise et la note ; elle varie avec le sol et la saison.',
      'Before any wire carries current, drive the rod and fix the board. Earth first: every metal frame will be bonded to it, and surge protectors will drain surges away from the equipment. The board is the backbone of the room: devices, labels, a diagram on the door. An electrician measures the earth resistance and notes it; it varies with soil and season.',
    ),
    parts: ['earthing', 'switchboard'],
    tools: [
      l('Masse et pince de piquet', 'Maul and rod clamp'),
      l('Testeur de terre', 'Earth tester'),
      l('Perceuse à percussion', 'Hammer drill'),
    ],
    tip: l(
      'Plantez le piquet là où il reste accessible, et ne le recouvrez pas : on devra le mesurer chaque année.',
      'Drive the rod where it stays reachable, and do not cover it: it will have to be measured every year.',
    ),
    warning: l(
      'Avant de planter, vérifiez l’absence de câble ou de canalisation enterrés. Prise de terre et tableau : travail d’un électricien qualifié ; jamais pendant un orage.',
      'Before driving the rod, check there is no buried cable or pipe. Earthing and board: work for a qualified electrician; never during a storm.',
    ),
    duration: '≈ 8 h (est.)',
  },
  {
    id: 'protections',
    scene: 'powerroom',
    title: l('Placer les protections avant les appareils', 'Place the protections before the devices'),
    text: lf(
      'Posez les protections avant tout le reste, ouvertes et fusibles retirés, pour que rien ne soit mis sous tension par erreur : un disjoncteur pour courant continu, qui isole et protège d’une surcharge, et des fusibles près de la batterie, qui protègent chaque câble d’un court-circuit pouvant débiter des centaines d’ampères. Chaque calibre est au-dessus du courant de service ({current} A au point de calcul, résultat du modèle) et sous ce que le câble supporte.',
      'Fit the protections before anything else, open and with the fuses out, so that nothing is energised by mistake: a breaker for direct current, which isolates and protects against an overload, and fuses near the battery, which protect each cable against a short circuit that can deliver hundreds of amps. Each rating is above the service current ({current} A at the design point, model result) and below what the cable carries.',
    ),
    parts: ['dc-breaker', 'fuse-box'],
    tools: [
      l('Cadenas et étiquettes', 'Padlocks and tags'),
      l('Tournevis isolés', 'Insulated screwdrivers'),
      l('Multimètre', 'Multimeter'),
    ],
    tip: l(
      'Un cadenas et une étiquette sur chaque appareil ouvert pour travailler : celui qui arrive après vous sait qu’il ne doit pas le fermer.',
      'A padlock and a tag on every device opened to work: whoever arrives after you knows not to close it.',
    ),
    warning: l(
      'En continu, l’arc d’une coupure ne s’éteint pas de lui-même : des appareils faits pour le continu, jamais un fusible plus gros pour qu’il « ne saute plus ». Disjoncteur et fusibles se choisissent avec un électricien qualifié.',
      'With direct current, the arc of a break does not go out by itself: devices made for direct current, never a bigger fuse so that it “stops blowing”. Breaker and fuses are chosen with a qualified electrician.',
    ),
    duration: '≈ 4 h (est.)',
  },
  {
    id: 'wire-chain',
    scene: 'powerroom',
    title: l(
      'Câbler de la génératrice vers la batterie, charge de délestage comprise',
      'Wire from the generator towards the battery, dump load included',
    ),
    text: lf(
      'Câblez dans l’ordre du courant, tout étant isolé : le câble de la génératrice au redresseur, le redresseur au régulateur, le régulateur à la charge de délestage. La batterie, source d’énergie, est laissée pour la fin. La charge de délestage passe avant elle, parce que le frein doit exister avant la puissance : sans lui, la vis n’a rien à pousser et s’emballe. Les câbles se choisissent pour le courant : {batCableMm2} mm² pour ceux de la batterie (estimation).',
      'Wire in the order of the current, with everything isolated: the generator’s cable to the rectifier, the rectifier to the controller, the controller to the dump load. The battery, a source of energy, is left for last. The dump load goes in before it, because the brake must exist before the power does: without it, the screw has nothing to push against and races. Cables are chosen for the current: {batCableMm2} mm² for the battery’s (estimate).',
    ),
    parts: ['rectifier', 'charge-controller', 'dump-load'],
    tools: [l('Pince à sertir', 'Crimping tool'), l('Multimètre', 'Multimeter'), l('Outils isolés', 'Insulated tools')],
    tip: l(
      'Repérez chaque fil par une couleur et une étiquette avant de le brancher : une polarité inversée détruit un appareil.',
      'Mark each wire with a colour and a label before connecting it: a reversed polarity destroys a device.',
    ),
    warning: l(
      'Câblage : l’affaire d’un électricien qualifié. Le câble de la génératrice est sous tension dès que l’arbre tourne, même à la main : vanne de tête verrouillée, câble isolé en bout.',
      'Wiring: a job for a qualified electrician. The generator’s cable is live as soon as the shaft turns, even by hand: head gate locked, cable insulated at its end.',
    ),
    duration: '≈ 12 h (est.)',
  },
  {
    id: 'battery-last',
    scene: 'powerroom',
    title: l(
      'Brancher la batterie en dernier, puis l’onduleur et le compteur',
      'Connect the battery last, then the inverter and the meter',
    ),
    text: l(
      'La batterie se branche en dernier des sources, avec des outils isolés : fusible mis, disjoncteur fermé, le régulateur s’allume. Viennent ensuite l’onduleur, fermé en dernier, et le compteur d’énergie. À partir de là, le local est sous tension côté batterie même génératrice arrêtée : étiquetez-le et fermez la porte à clé. La maison se raccorde ensuite, par l’électricien, après un essai de l’onduleur seul.',
      'The battery is connected last of the sources, with insulated tools: fuse in, breaker closed, the controller lights up. Then come the inverter, closed last, and the energy meter. From then on the room is live on the battery side even with the generator stopped: label it and lock the door. The house is connected afterwards, by the electrician, after a test of the inverter alone.',
    ),
    parts: ['battery', 'inverter', 'energy-meter'],
    tools: [
      l('Outils isolés', 'Insulated tools'),
      l('Capuchons de bornes', 'Terminal covers'),
      l('Multimètre', 'Multimeter'),
    ],
    warning: l(
      'Un court-circuit sur une batterie peut projeter du métal fondu : outils isolés, ni bague ni montre, lunettes. L’onduleur donne une tension mortelle : raccordement par un électricien qualifié.',
      'A short circuit on a battery can spit molten metal: insulated tools, no ring or watch, goggles. The inverter gives a lethal voltage: connection by a qualified electrician.',
    ),
    duration: '≈ 6 h (est.)',
  },
  {
    id: 'tailrace',
    scene: 'site',
    title: l('Dégager le canal de fuite', 'Clear the tailrace'),
    text: lf(
      'Avant de mettre en eau, l’eau doit pouvoir repartir librement jusqu’à la rivière : curez le canal de fuite, coupez les branches, dégagez le débouché. Son niveau compte autant que celui du bief : dans le modèle, une eau aval plus haute de 0,5 m coûte {tail05Pct} % de l’électricité (résultat du modèle). Vérifiez aussi où le canal rejoint la rivière en crue.',
      'Before filling, the water must be able to leave freely to the river: dredge the tailrace, cut the branches, clear the outfall. Its level counts as much as the headrace’s: in the model, water downstream 0.5 m higher costs {tail05Pct}% of the electricity (model result). Also check where the canal meets the river in a flood.',
    ),
    parts: ['tailrace'],
    tools: [l('Pelle et râteau', 'Spade and rake'), l('Cisaille', 'Loppers'), l('Gilet de sauvetage', 'Life jacket')],
    warning: l(
      'Le canal rend l’eau à un cours qui peut monter vite : ne marchez pas dedans en crue, ne travaillez pas seul au bord.',
      'The canal returns the water to a stream that can rise fast: do not walk in it during a flood, do not work alone at the edge.',
    ),
    duration: '≈ 16 h (est.)',
  },
  {
    id: 'electrical-check',
    scene: 'powerroom',
    title: l('Contrôler le local avant la première mise en route', 'Check the room before the first start'),
    text: l(
      'Avant l’eau, contrôlez depuis le tableau : la terre est continue, les polarités sont justes, il n’y a pas de court-circuit entre les pôles, les étiquettes sont posées, le disjoncteur s’ouvre et se ferme, la charge de délestage chauffe quand on le lui demande, les fusibles sont les bons. Notez les valeurs dans un carnet : c’est votre référence le jour où quelque chose dérive.',
      'Before the water, check from the board: the earth is continuous, the polarities are right, there is no short circuit between the poles, the labels are on, the breaker opens and closes, the dump load heats when asked, the fuses are the right ones. Write the values in a notebook: it is your reference on the day something drifts.',
    ),
    parts: [],
    tools: [l('Multimètre', 'Multimeter'), l('Contrôleur d’isolement', 'Insulation tester'), l('Carnet', 'Notebook')],
    tip: l(
      'Ordre de fermeture : fusible de la batterie, disjoncteur, onduleur en dernier. L’ordre d’arrêt est l’inverse.',
      'Order of closing: the battery’s fuse, the breaker, the inverter last. The order of stopping is the reverse.',
    ),
    warning: l(
      'Tout essai sous tension se fait à deux, avec quelqu’un qui sait où couper, lunettes et outils isolés, vanne de tête verrouillée.',
      'Every live test is done by two, with someone who knows where to cut, goggles and insulated tools, head gate locked.',
    ),
    duration: '≈ 4 h (est.)',
  },
  {
    id: 'first-start',
    scene: 'screw',
    title: l('Première mise en route et points à surveiller', 'First start and what to watch'),
    text: lf(
      'Charge branchée, carters en place, ouvrez très peu la vanne de tête, puis montez peu à peu. Surveillez : bruit et frottements, chaleur des paliers, remplissage des poches, courant de charge (environ {current} A au point de calcul, résultat du modèle), tension de la batterie, niveaux amont et aval. N’attendez pas les chiffres du labo : la vidéo espère environ 2 kW pour une grande vis et annonce 200 W pour son prototype, le modèle donne {elecKw} kW.',
      'With the load connected and the guards in place, open the head gate very little, then raise it gradually. Watch: noise and rubbing, bearing heat, filling of the pockets, charging current (about {current} A at the design point, model result), battery voltage, upstream and downstream levels. Do not expect the lab’s figures: the video hopes for about 2 kW for a large screw and announces 200 W for its prototype, the model gives {elecKw} kW.',
    ),
    parts: ['trapped-water'],
    tools: [l('Montre et carnet', 'Watch and notebook'), l('Multimètre', 'Multimeter'), l('Lampe', 'Torch')],
    tip: l(
      'Notez le niveau amont, le courant et le bruit à chaque ouverture : c’est votre carnet de référence.',
      'Note the upstream level, the current and the noise at each opening: this is your reference notebook.',
    ),
    warning: l(
      'Main sur la vanne de sécurité, personne dans la chambre ; ouvrir en grand sans charge ferait partir la vis à toute vitesse. Au moindre doute, fermez.',
      'Hand on the safety gate, nobody in the chamber; opening wide with no load would make the screw race. At the slightest doubt, shut.',
    ),
    duration: '≈ 8 h (est.)',
  },
  {
    id: 'stop',
    scene: 'site',
    title: l('Arrêter, verrouiller, attendre', 'Stop, lock, wait'),
    text: l(
      'Dans cet ordre : fermez la vanne de tête, laissez la vis ralentir et s’arrêter, puis ouvrez le disjoncteur continu ; si vous coupez la charge d’abord, la vis s’emballe. Retirez les fusibles, verrouillez la vanne et le disjoncteur avec des cadenas dont vous gardez les clés, et laissez une étiquette. Vérifiez l’absence de tension avant de toucher quoi que ce soit, et attendez que l’eau soit retombée avant de descendre dans la chambre.',
      'In this order: shut the head gate, let the screw slow down and stop, then open the DC breaker; if you cut the load first, the screw races. Take out the fuses, lock the gate and the breaker with padlocks whose keys you keep, and leave a tag. Check that nothing is live before touching anything, and wait for the water to drop before going down into the chamber.',
    ),
    parts: [],
    tools: [l('Cadenas et étiquette', 'Padlock and tag'), l('Lampe', 'Torch')],
    tip: l(
      'Faites cette procédure un jour où tout va bien, plusieurs fois : c’est celle qu’on devra savoir par cœur un jour de tempête.',
      'Rehearse this procedure on a day when all is well, several times: it is the one you will need by heart on a stormy day.',
    ),
    warning: l(
      'Ne comptez jamais sur la seule fermeture électrique : verrouillez mécaniquement la vanne avant tout travail dans le canal, la chambre ou sur la vis.',
      'Never rely on the electrical shut-off alone: lock the gate mechanically before any work in the canal, the chamber or on the screw.',
    ),
    duration: '≈ 15 min (est.)',
  },
];
