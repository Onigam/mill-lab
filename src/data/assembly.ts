// Assembly guide of the machine (wave 2, data role): 20 steps that build the screw as a KIT, assembled on the spot in the water chamber, the
// way the video says a heavy machine has to be: brought down in pieces by an access that is often a ladder, with no lifting gear.
//
//   1        `site`   bring the kit pieces into the chamber (nothing is installed: the lifting and the ladder are the lesson)
//   2-3      `screw`  the two bearings, which fix the axis and so the slope
//   4-6      `screw`  the core, the blade modules, the fasteners (the video: long wooden pieces on the core, sets of three blades screwed on top)
//   7-8      `screw`  the trough around the screw, then a turn by hand (the check installs nothing)
//   9-10     `screw`  the inlet sill and the outlet pool, which set the levels of the water
//   11-15    `screw`  the speed multiplier: chain stage (sprocket, countershaft, counter sprocket, chain) then the large pulley
//   16-17    `screw`  the generator with its small pulley, the belt
//   18-19    `screw`  the electronics, the battery (the load before the water)
//   20       `screw`  the first filling, where the pockets of water appear
//
// Every id of the `screw` world is installed in exactly ONE step (a test checks it); two steps install nothing, the delivery of the kit and
// the turn by hand. The order follows the video where it is explicit (structure and bearings, then the screw, then the trough, then the chain
// and the generator, and the water raised last) and engineering sense elsewhere; the guide says so where it is the lab's reading.
//
// Not a construction plan: it says what each step is FOR and what to check. No torque is given (no source states one), no dimension beyond
// what src/three/dims.ts or the model gives, and every figure is tagged. Durations are rough estimates (« ≈ 4 h (est.) »).
// Safety is first: confined space and the ladder, heavy parts, wood dust, entanglement in the chain and belt, the battery, and a screw
// that races without a load (docs/research.md §7). The screw is GENERIC: nothing here says it is the video builders' machine.
import type { GuideStep } from '@onigam/lab-kit/content';
import { l } from '@onigam/lab-kit/i18n';
import { lf } from './part-helpers';

export const ASSEMBLY: GuideStep[] = [
  {
    id: 'bring-kit',
    scene: 'site',
    title: l('Amener le kit dans la chambre', 'Bring the kit into the chamber'),
    text: l(
      'Une vis est lourde, et la chambre d’eau n’a souvent qu’une échelle pour accès, sans grue : voilà pourquoi, dans la vidéo, la machine arrive en kit, en morceaux, et s’assemble sur place. Chaque pièce doit donc pouvoir se porter à la main. Préparez le chemin, dégagez la chambre, fermez et verrouillez la vanne de tête, puis descendez les pièces une à une, à la corde.',
      'A screw is heavy, and the water chamber often has only a ladder for access, with no crane: that is why, in the video, the machine arrives as a kit, in pieces, and is assembled on the spot. Each piece must therefore be carryable by hand. Prepare the way, clear the chamber, shut and lock the head gate, then lower the pieces one by one, on a rope.',
    ),
    parts: [],
    tools: [
      l('Corde et poulie', 'Rope and pulley'),
      l('Échelle fixée', 'Fixed ladder'),
      l('Lampe frontale et casque', 'Head torch and helmet'),
    ],
    tip: l(
      'Numérotez les pièces à l’atelier : le montage sur place en sera bien plus rapide.',
      'Number the pieces in the workshop: the assembly on site will be much faster.',
    ),
    warning: l(
      'Espace confiné : jamais seul, jamais vanne ouverte. Une échelle se monte face à elle, les mains libres : les pièces se hissent à la corde ou se passent de main en main, on ne les porte jamais sur l’échelle.',
      'Confined space: never alone, never with the gate open. A ladder is climbed facing it, hands free: pieces are hauled on a rope or passed from hand to hand, never carried on the ladder.',
    ),
    duration: '≈ 4 h (est.)',
  },
  {
    id: 'lower-bearing',
    scene: 'screw',
    title: l('Poser le palier bas', 'Fit the lower bearing'),
    text: l(
      'Les paliers fixent l’axe de la vis, donc sa pente. On commence par le bas, là où l’eau repart : posez son support sur un pilier ou une dalle, à la hauteur voulue au-dessus de l’eau de sortie. Dans la vidéo, quatre petits plots portent une structure toute simple. Laissez-le accessible : c’est le roulement le plus exposé à l’humidité.',
      'The bearings fix the axis of the screw, hence its slope. Start at the bottom, where the water leaves: set its housing on a pier or a slab, at the height wanted above the outlet water. In the video, four small blocks carry a very plain structure. Leave it reachable: it is the bearing most exposed to damp.',
    ),
    parts: ['lower-bearing'],
    tools: [
      l('Niveau, cordeau et mètre', 'Level, string line and tape'),
      l('Clés', 'Spanners'),
      l('Perceuse à percussion', 'Hammer drill'),
    ],
    tip: l(
      'Tracez d’abord sur le mur la ligne de l’axe, à 22° : tout le reste en dépend.',
      'First draw the line of the axis on the wall, at 22°: everything else depends on it.',
    ),
    warning: l(
      'Percer la pierre soulève une poussière qui se respire mal : masque, lunettes et protections auditives.',
      'Drilling stone raises a dust that is bad to breathe: mask, goggles and ear protection.',
    ),
    duration: '≈ 3 h (est.)',
  },
  {
    id: 'upper-bearing',
    scene: 'screw',
    title: l('Poser le palier haut, aligné sur le bas', 'Fit the upper bearing, aligned with the lower'),
    text: l(
      'Le palier haut retient la vis. Posez-le au-dessus de l’eau, sur la même droite que le palier bas : un cordeau tendu entre les deux la matérialise. Un défaut d’alignement de quelques millimètres suffit à faire frotter les pales dans l’auge. Gardez de la place, derrière lui, pour l’arbre qui sortira vers la transmission.',
      'The upper bearing holds the screw. Set it above the water, on the same line as the lower bearing: a string stretched between the two shows it. A misalignment of a few millimetres is enough to make the blades rub in the trough. Keep room behind it for the shaft that will go out to the drive.',
    ),
    parts: ['upper-bearing'],
    tools: [l('Cordeau et niveau', 'String line and level'), l('Mètre', 'Tape'), l('Clés', 'Spanners')],
    tip: l(
      'Mesurez les deux paliers l’un par rapport à l’autre, pas seulement chacun par rapport au mur.',
      'Measure the two bearings against each other, not only each against the wall.',
    ),
    duration: '≈ 3 h (est.)',
  },
  {
    id: 'core',
    scene: 'screw',
    title: l('Glisser le noyau sur ses deux paliers', 'Slide the core onto its two bearings'),
    text: lf(
      'Le noyau est la plus longue pièce du kit. Glissez-le dans les deux roulements, à plusieurs et sur des sangles. La partie tournante entière pèse environ {mass} kg de bois (estimation) : on ne la porte jamais seul. Calez le noyau avant de le lâcher, puis tournez-le à la main : il doit tourner rond, sans point dur.',
      'The core is the longest piece of the kit. Slide it into the two bearings, with several people and on slings. The whole turning part weighs about {mass} kg of timber (estimate): it is never carried alone. Wedge the core before letting go, then turn it by hand: it must run true, with no tight spot.',
    ),
    parts: ['screw-core'],
    tools: [
      l('Sangles de levage', 'Lifting slings'),
      l('Cales', 'Wedges'),
      l('Deux ou trois personnes', 'Two or three people'),
    ],
    warning: l(
      'Poids et pincement : mains loin des paliers pendant la pose, calage avant de lâcher, personne sous la charge.',
      'Weight and pinching: hands clear of the bearings during fitting, wedge before letting go, nobody under the load.',
    ),
    duration: '≈ 3 h (est.)',
  },
  {
    id: 'modules',
    scene: 'screw',
    title: l('Visser les modules de pales sur le noyau', 'Screw the blade modules onto the core'),
    text: l(
      'Vissez les modules de pales sur le noyau, du bas vers le haut. Chacun porte, dans la vidéo, trois pales : les trois filets doivent se raccorder d’un module au suivant sans décrochement, sinon l’eau s’y perd. C’est ce qui fait de la machine un kit : tout module se dévisse pour être changé. Ne serrez pas à fond tout de suite.',
      'Screw the blade modules onto the core, from the bottom up. Each one carries, in the video, three blades: the three threads must join from one module to the next without a jog, or the water is lost there. That is what makes the machine a kit: any module can be unscrewed and changed. Do not tighten fully yet.',
    ),
    parts: ['blade-module'],
    tools: [l('Visseuse', 'Screw driver'), l('Règle et cales', 'Straightedge and wedges'), l('Gants', 'Gloves')],
    tip: l(
      'Contrôlez la continuité du filet à la main, en suivant la pale d’un module au suivant.',
      'Check the continuity of the thread by hand, following the blade from one module to the next.',
    ),
    warning: l(
      'Éclats de bois, bords vifs, poussière : gants, lunettes, et masque pour poncer.',
      'Splinters, sharp edges, dust: gloves, goggles, and a mask for sanding.',
    ),
    duration: '≈ 6 h (est.)',
  },
  {
    id: 'fasteners',
    scene: 'screw',
    title: l('Serrer les fixations des pales', 'Tighten the blade fasteners'),
    text: lf(
      'Serrez les fixations de chaque module, en croix, sans forcer. Elles font passer à l’axe l’effort que l’eau exerce sur les pales : {torqueScrew} N·m au point de calcul (résultat du modèle). Aucun couple de serrage n’est donné ici : il dépend du bois et de qui construit. Reprenez-les après les premiers jours, quand le bois a pris l’eau.',
      'Tighten the fasteners of each module, crosswise, without force. They carry to the shaft the load that the water puts on the blades: {torqueScrew} N·m at the design point (model result). No tightening torque is given here: it depends on the timber and on who builds. Go over them again after the first few days, when the timber has taken water.',
    ),
    parts: ['blade-fastener'],
    tools: [l('Clé à cliquet', 'Ratchet spanner'), l('Marqueur', 'Marker')],
    tip: l(
      'Marquez d’un trait chaque fixation serrée : un trait qui se décale dit une vis qui bouge.',
      'Mark each tightened fastener with a line: a line that shifts means a screw that moves.',
    ),
    duration: '≈ 3 h (est.)',
  },
  {
    id: 'trough',
    scene: 'screw',
    title: l('Fermer l’auge autour de la vis', 'Close the trough around the screw'),
    text: lf(
      'L’auge se monte ou se coule autour de la vis : douelles de bois cerclées dans la vidéo, béton dans le dessin du labo. Son rôle : être bien ronde, à {gapMm} mm du bord des pales (dérivé, règle publiée). C’est la grande difficulté de la vidéo. Mesurez le jeu tout le long et tout le tour avec des cales : trop grand, l’eau fuit ; trop petit, la vis frotte.',
      'The trough is built or cast around the screw: hooped timber staves in the video, concrete in the lab’s drawing. Its job: to be truly round, at {gapMm} mm from the blade edges (derived, published rule). It is the great difficulty of the video. Measure the gap all along and all round with feeler gauges: too large, the water leaks; too small, the screw rubs.',
    ),
    parts: ['trough'],
    tools: [
      l('Cales d’épaisseur', 'Feeler gauges'),
      l('Sangles ou cerclage', 'Straps or hooping'),
      l('Niveau', 'Level'),
    ],
    tip: l(
      'Mieux vaut un jeu régulier de quelques millimètres qu’un jeu parfait en un point et nul ailleurs.',
      'A regular gap of a few millimetres beats a perfect gap in one place and none elsewhere.',
    ),
    warning: l(
      'Doigts entre auge et pales : tournez la vis lentement, à la main, et ne glissez jamais la main entre une pale et l’auge.',
      'Fingers between trough and blades: turn the screw slowly, by hand, and never slip a hand between a blade and the trough.',
    ),
    duration: '≈ 8 h (est.)',
  },
  {
    id: 'turn-by-hand',
    scene: 'screw',
    title: l('Faire tourner la vis à la main', 'Turn the screw by hand'),
    text: l(
      'Avant tout branchement, tournez la vis lentement, à la main, sur un tour complet et sur toute sa longueur : pas de point dur, pas de frottement, un jeu régulier. C’est la vérification des paliers, de l’auge et des filets ensemble. Si quelque chose frotte, c’est maintenant qu’on le rectifie, avant l’eau et avant la mécanique.',
      'Before any connection, turn the screw slowly, by hand, through a full turn and along its whole length: no tight spot, no rubbing, an even gap. It checks the bearings, the trough and the threads together. If anything rubs, now is the time to put it right, before the water and before the mechanics.',
    ),
    parts: [],
    tools: [l('Cales d’épaisseur', 'Feeler gauges'), l('Lampe', 'Torch'), l('Craie', 'Chalk')],
    tip: l(
      'Marquez à la craie chaque endroit qui frotte, tournez, et revenez-y : le point dur se retrouve.',
      'Chalk each place that rubs, turn, and come back to it: the tight spot can be found again.',
    ),
    warning: l(
      'Une vis qui tourne happe : arrêt complet, vanne verrouillée, personne dans l’auge.',
      'A turning screw snatches: full stop, gate locked, nobody in the trough.',
    ),
    duration: '≈ 2 h (est.)',
  },
  {
    id: 'inlet-sill',
    scene: 'screw',
    title: l('Régler le seuil d’entrée', 'Set the inlet sill'),
    text: lf(
      'Le seuil d’entrée règle le niveau de l’eau qui entre dans la vis. Calez-le au niveau amont prévu (chute du point de calcul : {head} m, hypothèse). Trop haut, la vis s’alimente mal ; trop bas, elle perd de la chute. Étanchez le joint avec la maçonnerie : l’eau qui passe à côté des poches ne produit rien.',
      'The inlet sill sets the level of the water that enters the screw. Set it at the planned upstream level (design-point head: {head} m, assumption). Too high, the screw is poorly fed; too low, it loses head. Seal the joint with the masonry: water that goes past the pockets produces nothing.',
    ),
    parts: ['inlet-sill'],
    tools: [l('Niveau', 'Level'), l('Mortier ou mastic', 'Mortar or sealant'), l('Mètre', 'Tape')],
    tip: l(
      'Notez ce niveau sur le mur : toutes les saisons suivantes se comparent à lui.',
      'Note this level on the wall: every later season is compared to it.',
    ),
    duration: '≈ 3 h (est.)',
  },
  {
    id: 'outlet-pool',
    scene: 'screw',
    title: l('Régler le bassin de sortie', 'Set the outlet pool'),
    text: lf(
      'Le bassin de sortie rejoint le canal de fuite. Son niveau décide de ce qu’on perd en sortie. Réglez-le pour que l’eau du bas atteigne environ {tailDepth} m au-dessus du point bas de l’auge (dérivé, valeur publiée), puis peignez sur le mur un repère de niveau : un repère vaut mieux que la mémoire.',
      'The outlet pool joins the tailrace. Its level decides what is lost at the outlet. Set it so that the water at the bottom reaches about {tailDepth} m above the lowest point of the trough (derived, published value), then paint a level mark on the wall: a mark beats memory.',
    ),
    parts: ['outlet-pool'],
    tools: [l('Niveau', 'Level'), l('Peinture et pinceau', 'Paint and brush'), l('Mètre', 'Tape')],
    tip: l(
      'En crue, l’eau aval monte avant que la vanne ne se ferme : prévoyez un bassin que l’eau peut quitter librement.',
      'In a flood, the water downstream rises before the gate shuts: provide a pool that the water can leave freely.',
    ),
    duration: '≈ 3 h (est.)',
  },
  {
    id: 'drive-sprocket',
    scene: 'screw',
    title: l('Caler le grand pignon sur l’arbre de la vis', 'Key the large sprocket onto the screw’s shaft'),
    text: lf(
      'Calez le grand pignon sur l’arbre haut de la vis : clavette, vis de blocage au frein-filet. C’est par lui que la puissance sort, avec le plus fort couple de toute la transmission : {torqueScrew} N·m au point de calcul (résultat du modèle). Plus le pignon est grand, moins la chaîne tire pour un même couple.',
      'Key the large sprocket onto the screw’s top shaft: key, set screw with thread-lock. It is through it that the power leaves, with the greatest torque of the whole drive: {torqueScrew} N·m at the design point (model result). The larger the sprocket, the less the chain pulls for the same torque.',
    ),
    parts: ['drive-sprocket'],
    tools: [l('Clés Allen', 'Allen keys'), l('Frein-filet', 'Thread-lock'), l('Maillet', 'Mallet')],
    tip: l(
      'Posez la clavette avant le pignon, et vérifiez après coup que le pignon ne voile pas.',
      'Fit the key before the sprocket, and check afterwards that the sprocket does not wobble.',
    ),
    duration: '≈ 1 h (est.)',
  },
  {
    id: 'countershaft',
    scene: 'screw',
    title: l('Poser l’arbre intermédiaire', 'Fit the countershaft'),
    text: lf(
      'L’arbre intermédiaire relie les deux étages. Posez-le sur ses deux paliers, parallèle à l’arbre de la vis, à la distance qui convient à la chaîne d’un côté, à la courroie de l’autre. Il tournera plus vite que la vis : {countershaftRpm} tr/min (résultat du modèle). Vérifiez qu’il tourne librement avant de monter quoi que ce soit dessus.',
      'The countershaft links the two stages. Fit it on its two bearings, parallel to the screw’s shaft, at the distance that suits the chain on one side, the belt on the other. It will turn faster than the screw: {countershaftRpm} rpm (model result). Check it turns freely before fitting anything on it.',
    ),
    parts: ['countershaft'],
    tools: [l('Niveau', 'Level'), l('Règle', 'Straightedge'), l('Clés', 'Spanners')],
    duration: '≈ 3 h (est.)',
  },
  {
    id: 'counter-sprocket',
    scene: 'screw',
    title: l(
      'Monter le pignon de renvoi, dans le plan du grand',
      'Fit the counter sprocket, in the plane of the large one',
    ),
    text: lf(
      'Le petit pignon de renvoi se cale sur l’arbre intermédiaire, dans le même plan que le grand pignon : une règle posée contre les deux doit les toucher tous deux. Le rapport de leurs dents est celui de l’étage, {chain} (dérivé) : l’arbre intermédiaire tourne {chain} fois plus vite que la vis.',
      'The small counter sprocket is keyed onto the countershaft, in the same plane as the large sprocket: a straightedge held against both must touch both. The ratio of their teeth is that of the stage, {chain} (derived): the countershaft turns {chain} times faster than the screw.',
    ),
    parts: ['counter-sprocket'],
    tools: [l('Règle', 'Straightedge'), l('Clés Allen', 'Allen keys'), l('Frein-filet', 'Thread-lock')],
    tip: l(
      'Un désalignement de la chaîne ronge un flanc de dents : l’alignement se contrôle avant la chaîne, pas après.',
      'A misaligned chain gnaws a flank of the teeth: alignment is checked before the chain, not after.',
    ),
    duration: '≈ 1 h (est.)',
  },
  {
    id: 'chain',
    scene: 'screw',
    title: l('Poser et tendre la chaîne', 'Fit and tension the chain'),
    text: l(
      'Passez la chaîne sur les deux pignons et tendez-la : ni battante, ni raide. C’est le premier étage du multiplicateur ; une chaîne ne glisse pas et encaisse le gros couple. Graissez-la avec un produit qui ne pollue pas la rivière, et fermez-la dans son carter avant toute mise en marche.',
      'Pass the chain over both sprockets and tension it: neither flapping nor stiff. It is the first stage of the speed multiplier; a chain does not slip and carries the big torque. Grease it with a product that does not pollute the river, and enclose it in its guard before any start-up.',
    ),
    parts: ['chain'],
    tools: [l('Outil à riveter la chaîne', 'Chain-riveting tool'), l('Graisse', 'Grease'), l('Carter', 'Guard')],
    warning: l(
      'Une chaîne en marche happe doigts, vêtements, cheveux : carter fermé, pas de manches larges, arrêt complet avant d’y toucher.',
      'A running chain snatches fingers, clothing, hair: guard closed, no loose sleeves, full stop before touching it.',
    ),
    duration: '≈ 2 h (est.)',
  },
  {
    id: 'pulley-large',
    scene: 'screw',
    title: l('Caler la grande poulie', 'Key the large pulley'),
    text: lf(
      'Calez la grande poulie à l’autre bout de l’arbre intermédiaire. Elle est {belt} fois plus grande que la petite poulie de la génératrice (dérivé) : c’est ce rapport qui amène la génératrice à {genRpm} tr/min (hypothèse). Vérifiez qu’elle ne voile pas en tournant l’arbre à la main.',
      'Key the large pulley at the other end of the countershaft. It is {belt} times larger than the generator’s small pulley (derived): this ratio takes the generator to {genRpm} rpm (assumption). Check it does not wobble by turning the shaft by hand.',
    ),
    parts: ['pulley-large'],
    tools: [l('Clés Allen', 'Allen keys'), l('Frein-filet', 'Thread-lock'), l('Comparateur', 'Dial gauge')],
    duration: '≈ 1 h (est.)',
  },
  {
    id: 'generator',
    scene: 'screw',
    title: l('Poser la génératrice et sa petite poulie', 'Fit the generator and its small pulley'),
    text: lf(
      'Posez la génératrice sur un support réglable, sa petite poulie dans le plan de la grande, pour pouvoir tendre la courroie. Elle est lente, à aimants permanents (dans la vidéo : comme sur les éoliennes), et le labo la suppose bobinée pour {genRpm} tr/min et {busVolts} V (hypothèse). Protégez ses bornes de l’humidité et placez-la au-dessus des crues.',
      'Fit the generator on an adjustable mount, its small pulley in the plane of the large one, so that the belt can be tensioned. It is slow, permanent-magnet (in the video: like those of wind turbines), and the lab assumes it wound for {genRpm} rpm and {busVolts} V (assumption). Protect its terminals from damp and place it above flood level.',
    ),
    parts: ['generator', 'pulley-small'],
    tools: [l('Niveau et règle', 'Level and straightedge'), l('Clés', 'Spanners'), l('Boîte étanche', 'Sealed box')],
    tip: l(
      'La génératrice est l’une des pièces les plus lourdes : posez-la à deux, sur ses pieds, avant de la serrer.',
      'The generator is one of the heaviest pieces: set it down with two people, on its feet, before tightening.',
    ),
    duration: '≈ 3 h (est.)',
  },
  {
    id: 'belt',
    scene: 'screw',
    title: l('Poser et tendre la courroie', 'Fit and tension the belt'),
    text: l(
      'Passez la courroie sur les deux poulies et tendez-la en déplaçant la génératrice : une flèche modérée au milieu du brin. C’est le second étage, léger et silencieux, qui multiplie encore la vitesse. Trop lâche, elle patine ; trop tendue, elle use les roulements. Fermez-la sous un carter avant la mise en marche.',
      'Pass the belt over the two pulleys and tension it by moving the generator: a moderate sag in the middle of the run. This is the second stage, light and quiet, which multiplies the speed again. Too slack, it slips; too tight, it wears the bearings. Enclose it in a guard before start-up.',
    ),
    parts: ['belt'],
    tools: [l('Règle', 'Straightedge'), l('Clés', 'Spanners'), l('Carter', 'Guard')],
    warning: l(
      'Une courroie happe aussi : carter fermé, pas de manches larges, vanne verrouillée avant d’y toucher.',
      'A belt snatches too: guard closed, no loose sleeves, gate locked before touching it.',
    ),
    duration: '≈ 2 h (est.)',
  },
  {
    id: 'electronics',
    scene: 'screw',
    title: l('Câbler le redresseur et le régulateur', 'Wire the rectifier and the controller'),
    text: lf(
      'Câblez le redresseur, puis le régulateur de charge, sur un panneau au sec près de la génératrice. Le redresseur change l’alternatif triphasé en continu ; le régulateur protège la batterie en détournant le surplus vers une charge de délestage, pour que la génératrice garde un frein. Choisissez câbles et fusibles pour plus que les {current} A du point de calcul (résultat du modèle).',
      'Wire the rectifier, then the charge controller, on a board in the dry near the generator. The rectifier turns three-phase alternating current into direct current; the controller protects the battery by diverting the surplus to a dump load, so that the generator always keeps a brake. Choose cables and fuses for more than the {current} A of the design point (model result).',
    ),
    parts: ['rectifier', 'charge-controller'],
    tools: [l('Pince à sertir', 'Crimping tool'), l('Multimètre', 'Multimeter'), l('Outils isolés', 'Insulated tools')],
    warning: l(
      'Câblage et raccordement : l’affaire d’un électricien qualifié. Vanne verrouillée avant de câbler : une génératrice qui tourne sans charge donne une tension bien plus haute que celle de la batterie.',
      'Wiring and connection: a job for a qualified electrician. Gate locked before wiring: a generator that turns with no load gives a voltage far above the battery’s.',
    ),
    duration: '≈ 4 h (est.)',
  },
  {
    id: 'battery',
    scene: 'screw',
    title: l('Brancher la batterie : la charge avant l’eau', 'Connect the battery: the load before the water'),
    text: lf(
      'Branchez la batterie en dernier, après un fusible placé au plus près d’elle, et branchez la charge avant d’ouvrir l’eau : sans charge, la vis s’emballe, jusqu’à {freeRunRpm} tr/min (résultat du modèle). Le modèle prend la batterie idéale, à {busVolts} V (hypothèse). Aérez le local : une batterie au plomb dégage de l’hydrogène.',
      'Connect the battery last, after a fuse placed as close to it as possible, and connect the load before opening the water: with no load, the screw races, up to {freeRunRpm} rpm (model result). The model takes the battery as ideal, at {busVolts} V (assumption). Ventilate the room: a lead-acid battery gives off hydrogen.',
    ),
    parts: ['battery'],
    tools: [
      l('Outils isolés', 'Insulated tools'),
      l('Fusible et porte-fusible', 'Fuse and fuse holder'),
      l('Multimètre', 'Multimeter'),
    ],
    warning: l(
      'Aucun court-circuit : outils isolés, ni bague ni montre. Une batterie débite des centaines d’ampères et peut projeter du métal fondu. Pas de flamme ni d’étincelle.',
      'No short circuit: insulated tools, no ring or watch. A battery delivers hundreds of amps and can spit molten metal. No flame or spark.',
    ),
    duration: '≈ 2 h (est.)',
  },
  {
    id: 'first-water',
    scene: 'screw',
    title: l('Première mise en eau', 'First filling'),
    text: lf(
      'Charge branchée et carters en place, ouvrez très peu la vanne de tête : la vis tourne presque seule, sur le seul frottement (la vidéo parle d’autorotation), ce qui montre qu’elle tourne rond. Puis montez le niveau peu à peu : les poches d’eau se remplissent, la vis monte vers {rpm} tr/min et la génératrice commence à charger vers {cutInRpm} tr/min (résultat du modèle).',
      'With the load connected and the guards in place, open the head gate very little: the screw turns almost on its own, on friction alone (the video speaks of autorotation), which shows it runs true. Then raise the level gradually: the water pockets fill, the screw rises towards {rpm} rpm and the generator starts to charge near {cutInRpm} rpm (model result).',
    ),
    parts: ['trapped-water'],
    tools: [l('Montre', 'Watch'), l('Multimètre', 'Multimeter'), l('Lampe', 'Torch')],
    tip: l(
      'À l’arrêt, après la première heure, touchez les paliers : ils ne doivent pas chauffer.',
      'At rest, after the first hour, touch the bearings: they must not heat up.',
    ),
    warning: l(
      'Personne dans la chambre, main sur la vanne de sécurité : au moindre bruit anormal ou frottement, fermez. Ouvrir en grand sans charge ferait partir la vis à toute vitesse.',
      'Nobody in the chamber, hand on the safety gate: at the slightest abnormal noise or rubbing, shut. Opening wide with no load would make the screw race.',
    ),
    duration: '≈ 3 h (est.)',
  },
];
