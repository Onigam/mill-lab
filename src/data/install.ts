// Installation guide of the site (wave 2, data role): 11 steps across the `site` and `screw` worlds, in the order a real project follows:
// the water right and the permits BEFORE anything, then the reserved flow and the fish pass, the weir and the canal, the head gate and the
// coarse rack, the chamber and the mill, the levels of the screw, the drive, the powerhouse and the load, the tailrace, the first start and
// what to watch, and the stop procedure.
//
//   1  rights          `site`   the river (what must be known and obtained before spending a euro)
//   2  flow-and-fish   `site`   the reserved-flow notch and the fish pass
//   3  weir-canal      `site`   the weir and the headrace
//   4  gate-rack       `site`   the head gate and the coarse rack
//   5  chamber         `site`   the water chamber and the mill building
//   6  levels          `screw`  the inlet sill and the outlet pool (the levels that fix the head and the slope)
//   7  drive           `screw`  aligning and guarding the drive (nothing new is installed: the assembly guide built it)
//   8  powerhouse      `site`   the powerhouse (rectifier, controller, battery, inverter in ONE part) and the house it feeds
//   9  tailrace        `site`   the tailrace
//   10 first-start     `screw`  the first filling: the pockets of water appear; what to watch
//   11 stop            `site`   the stop procedure (nothing installed)
//
// Every id of `site` is installed in exactly ONE step (a test checks it). The `screw` steps list only the three ids that the SITE sets
// (the two levels and the water); the rest of the machine is shown solid, as the assembly guide built it. Two steps install nothing.
//
// What depends on the country is said as such: the water right, the permit to produce, the reserved flow and the fish pass (said once,
// in general terms, with the French wording only in the French text), the electrical rules, building rules. The video's source for the French
// context is the one mill it shows; the lab publishes no legal advice. Safety is first (docs/research.md §7): drowning, confined space and
// ladder, the rotating screw, the 48 V battery, a screw that races without a load.
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
      'Installer le local technique, la batterie et l’usage',
      'Install the powerhouse, the battery and the load',
    ),
    text: l(
      'Le local technique, sec et au-dessus des crues, abrite redresseur, régulateur, batterie et onduleur ; plus il est près de la maison, plus le câble est court et moins il perd, car en basse tension le courant est fort. Fusible au plus près de la batterie, disjoncteur, charge de délestage, mise à la terre. La maison se branche en dernier, par un électricien.',
      'The powerhouse, dry and above flood level, holds the rectifier, controller, battery and inverter; the closer it is to the house, the shorter the cable and the less it loses, because at low voltage the current is large. Fuse as close as possible to the battery, circuit breaker, dump load, earthing. The house is connected last, by an electrician.',
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
    id: 'first-start',
    scene: 'screw',
    title: l('Première mise en route et points à surveiller', 'First start and what to watch'),
    text: lf(
      'Charge branchée, carters en place, ouvrez très peu la vanne de tête, puis montez peu à peu. Surveillez : bruit et frottements, chaleur des paliers, remplissage des poches, courant de charge (environ {current} A au point de calcul, résultat du modèle), niveaux amont et aval. Ne vous attendez pas aux chiffres du labo : la vidéo espère environ 2 kW pour une grande vis et annonce 200 W pour son prototype, le modèle donne {elecKw} kW au point de calcul.',
      'With the load connected and the guards in place, open the head gate very little, then raise it gradually. Watch: noise and rubbing, bearing heat, filling of the pockets, charging current (about {current} A at the design point, model result), upstream and downstream levels. Do not expect the lab’s figures: the video hopes for about 2 kW for a large screw and announces 200 W for its prototype, the model gives {elecKw} kW at the design point.',
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
      'Dans cet ordre : fermez la vanne de tête, laissez la vis ralentir et s’arrêter, puis ouvrez le disjoncteur de la batterie ; si vous coupez la charge d’abord, la vis s’emballe. Verrouillez la vanne avec un cadenas dont vous gardez la clé, et laissez une étiquette. Attendez l’arrêt complet avant de toucher quoi que ce soit, et que l’eau soit retombée avant de descendre dans la chambre.',
      'In this order: shut the head gate, let the screw slow down and stop, then open the battery’s circuit breaker; if you cut the load first, the screw races. Lock the gate with a padlock whose key you keep, and leave a tag. Wait for a complete stop before touching anything, and for the water to drop before going down into the chamber.',
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
