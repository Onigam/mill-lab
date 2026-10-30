// Assembly guide of the machine (wave 2, extended in completion wave A): 34 steps that build the screw as a KIT, assembled on the spot in the
// water chamber, the way the video says a heavy machine has to be: brought down in pieces by an access that is often a ladder, with no lifting gear.
//
//   1        `site`      bring the kit pieces into the chamber (nothing is installed: the lifting and the ladder are the lesson)
//   2-3      `screw`     the two bearings, which fix the axis and so the slope
//   4-6      `screw`     the core, the blade modules, the fasteners (the video: long wooden pieces on the core, sets of three blades screwed on top)
//   7-8      `screw`     the trough around the screw, then a turn by hand (the check installs nothing)
//   9-10     `screw`     the inlet sill and the outlet pool, which set the levels of the water
//   11-15    `screw`     the speed multiplier: chain stage (sprocket, countershaft, counter sprocket, chain) then the large pulley
//   16-21    `generator` the generator opened: frame, bearings, shaft and rotor, magnets, stator and coils, terminal box. The video's generator is
//                        bought, not built; these six steps show what is inside what you buy and what can be repaired
//   22-23    `screw`     the closed generator with its small pulley on its mount, the belt
//   24-33    `powerroom` the powerhouse's wall: board, breaker and fuses, rectifier, controller, battery, dump load, inverter, energy meter, earthing,
//                        and the first test (which installs nothing). The earthing is prepared outside before the wiring; it is bonded last here only
//                        because the guide follows the wall; the first test checks its continuity before anything is switched on
//   34       `screw`     the first filling, where the pockets of water appear
//
// Every id of the `screw`, `generator` and `powerroom` worlds is installed in exactly ONE step (a test checks it); three steps install nothing,
// the delivery of the kit, the turn by hand and the first test. The order follows the video where it is explicit (structure and bearings, then the
// screw, then the trough, then the chain and the generator, and the water raised last) and engineering sense elsewhere; the guide says so where
// it is the lab's reading. The electrics have no source in the video beyond a sentence or two: their order is the lab's (sources of energy last,
// the load before the water, the room tested before the first filling).
//
// Not a construction plan: it says what each step is FOR and what to check. No torque is given (no source states one), no dimension beyond
// what src/three/dims.ts or the model gives, and every figure is tagged. Durations are rough estimates (« ≈ 4 h (est.) »).
// Safety is first: confined space and the ladder, heavy parts, wood dust, entanglement in the chain and belt, strong magnets, the battery and
// its short-circuit current, direct-current arcs, the qualified electrician, and a screw that races without a load (docs/research.md §7).
// The screw and the generator are GENERIC: nothing here says they are the video builders' machine.
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
    id: 'gen-frame',
    scene: 'generator',
    title: l('Poser la carcasse de la génératrice', 'Set the generator’s frame'),
    text: l(
      'La génératrice de la vidéo est un modèle du commerce, livré tout assemblé ; le labo l’ouvre pour montrer ce qui la fait marcher et ce que l’on peut réparer. On part de la carcasse : une virole ronde et rigide, fermée par deux flasques qui porteront les roulements. Posez-la d’aplomb, sur ses pattes. Si elle n’est pas ronde, l’entrefer sera irrégulier et les aimants tireront le rotor d’un seul côté.',
      'The video’s generator is a bought model, delivered assembled; the lab opens it to show what makes it work and what can be repaired. Start with the frame: a round, rigid shell, closed by two end shields that will carry the bearings. Set it true, on its feet. If it is not round, the gap will be uneven and the magnets will pull the rotor to one side.',
    ),
    parts: ['gen-frame'],
    tools: [l('Niveau', 'Level'), l('Établi propre', 'Clean bench'), l('Chiffons', 'Rags')],
    tip: l(
      'Rangez les vis de chaque flasque dans une boîte étiquetée : elles ne sont pas toutes identiques.',
      'Keep the screws of each end shield in a labelled box: they are not all identical.',
    ),
    duration: '≈ 30 min (est.)',
  },
  {
    id: 'gen-bearings',
    scene: 'generator',
    title: l('Monter les deux roulements dans les flasques', 'Fit the two bearings in the end shields'),
    text: l(
      'Les deux roulements gardent le rotor centré dans le stator, à une fraction de millimètre près. Enfoncez chacun dans son flasque en poussant sur sa seule bague extérieure, avec un tube : un choc sur les billes y laisse une marque et le roulement grondera pour toujours. Celui du côté de la poulie portera aussi la traction de la courroie.',
      'The two bearings keep the rotor centred in the stator, to a fraction of a millimetre. Press each into its end shield by its outer ring only, with a tube: a blow on the balls leaves a dent and the bearing will rumble for ever. The one on the pulley side will also carry the pull of the belt.',
    ),
    parts: ['gen-bearings'],
    tools: [
      l('Tube de montage et maillet', 'Fitting tube and mallet'),
      l('Graisse du fabricant', 'Maker’s grease'),
      l('Gants propres', 'Clean gloves'),
    ],
    tip: l(
      'Poussez toujours sur la bague qui entre dans son logement : la bague extérieure dans le flasque, l’intérieure sur l’arbre.',
      'Always push on the ring that goes into its seat: the outer ring in the end shield, the inner ring on the shaft.',
    ),
    duration: '≈ 1 h (est.)',
  },
  {
    id: 'gen-rotor-shaft',
    scene: 'generator',
    title: l('Caler le rotor sur l’arbre', 'Key the rotor on the shaft'),
    text: lf(
      'L’arbre porte le rotor, un cylindre d’acier qui refermera le circuit magnétique derrière les aimants. Une clavette les lie, pour que les {torqueGen} N·m du point de calcul (résultat du modèle) passent de l’un à l’autre sans glisser. Enfilez le rotor, calez-le, puis faites tourner l’ensemble sur deux appuis : un rotor qui voile frottera sur le stator.',
      'The shaft carries the rotor, a steel cylinder that will close the magnetic circuit behind the magnets. A key joins them, so that the {torqueGen} N·m of the design point (model result) pass from one to the other without slipping. Slide the rotor on, key it, then spin the assembly on two supports: a rotor that wobbles will rub on the stator.',
    ),
    parts: ['gen-shaft', 'gen-rotor'],
    tools: [
      l('Clavette et maillet', 'Key and mallet'),
      l('Comparateur', 'Dial gauge'),
      l('Deux prismes en V', 'Two V-blocks'),
    ],
    tip: l(
      'Lisez le faux-rond au comparateur en tournant l’arbre : un rotor rond ne se corrige pas après coup.',
      'Read the runout with the dial gauge while turning the shaft: a true rotor cannot be put right afterwards.',
    ),
    duration: '≈ 1 h (est.)',
  },
  {
    id: 'gen-magnets',
    scene: 'generator',
    title: l('Coller les aimants sur le rotor', 'Bond the magnets onto the rotor'),
    text: lf(
      'Collez les {genPoles} aimants (estimation) à la surface du rotor, nord et sud en alternance, chacun à sa place repérée. C’est l’alternance qui fait alterner la tension : un pôle passe devant une bobine, puis le pôle opposé. Vérifiez la polarité de chacun avant la prise de la colle : un aimant à l’envers se cache jusqu’à la fermeture de la machine, et fait chuter la tension.',
      'Bond the {genPoles} magnets (estimate) to the surface of the rotor, north and south alternating, each in its marked place. The alternation is what makes the voltage alternate: a pole passes a coil, then the opposite pole. Check the polarity of each before the glue sets: a magnet the wrong way round stays hidden until the machine is closed, and makes the voltage fall.',
    ),
    parts: ['gen-magnets'],
    tools: [
      l('Gabarit de collage en bois', 'Wooden bonding jig'),
      l('Colle du fabricant', 'Maker’s adhesive'),
      l('Boussole', 'Compass'),
      l('Outils sans fer', 'Non-ferrous tools'),
    ],
    tip: l(
      'Un gabarit en bois, aux emplacements marqués, tient chaque aimant pendant le collage et l’empêche de sauter vers son voisin.',
      'A wooden jig with the places marked holds each magnet while it is bonded and stops it leaping to its neighbour.',
    ),
    warning: l(
      'Aimants puissants : ils sautent l’un vers l’autre ou vers l’acier, pincent la peau et peuvent éclater. Un seul à la fois, gants et lunettes, outils sans fer, loin des montres, des cartes bancaires et des stimulateurs cardiaques.',
      'Powerful magnets: they leap towards each other or towards steel, pinch the skin and can shatter. One at a time, gloves and goggles, non-ferrous tools, away from watches, bank cards and pacemakers.',
    ),
    duration: '≈ 2 h (est.)',
  },
  {
    id: 'gen-stator-coils',
    scene: 'generator',
    title: l('Réunir le stator bobiné et le rotor', 'Bring the wound stator and the rotor together'),
    text: lf(
      'Le stator, des tôles d’acier à {genSlots} dents (estimation), porte autant de bobines de cuivre, {genCoilsPerPhase} par phase. Il se place dans la carcasse, puis le rotor y glisse : les aimants tirent le rotor vers les dents, on ferme donc l’entrefer lentement, avec un tube de guidage. Tournez ensuite l’arbre à la main : les crans que l’on sent sont les aimants qui trouvent les dents.',
      'The stator, steel plates with {genSlots} teeth (estimate), carries as many copper coils, {genCoilsPerPhase} per phase. It goes into the frame, then the rotor slides in: the magnets pull the rotor towards the teeth, so the gap is closed slowly, with a guide tube. Then turn the shaft by hand: the clicks you feel are the magnets finding the teeth.',
    ),
    parts: ['gen-stator', 'gen-coils'],
    tools: [
      l('Tube de guidage non magnétique', 'Non-magnetic guide tube'),
      l('Ohmmètre', 'Ohmmeter'),
      l('Contrôleur d’isolement', 'Insulation tester'),
    ],
    tip: l(
      'Avant de fermer, mesurez la résistance des trois phases deux à deux : trois valeurs égales disent trois bobinages sains.',
      'Before closing, measure the resistance of the three phases two by two: three equal values mean three healthy windings.',
    ),
    warning: l(
      'Le rotor est attiré par le stator avec une grande force et peut se coincer en claquant : jamais les doigts dans l’entrefer ni entre les flasques. Glissez-le lentement, à deux.',
      'The rotor is pulled to the stator with great force and can snap shut: never fingers in the gap or between the end shields. Slide it slowly, with two people.',
    ),
    duration: '≈ 2 h (est.)',
  },
  {
    id: 'gen-terminals',
    scene: 'generator',
    title: l('Relier les trois phases à la boîte à bornes', 'Connect the three phases to the terminal box'),
    text: l(
      'Les trois fils des bobinages sortent de la carcasse et finissent dans la boîte à bornes, sur le dessus. Chacun va à sa cosse, serrée et repérée ; une borne de terre relie la carcasse à la prise de terre. Un presse-étoupe tient le câble qui partira vers le local technique et garde l’eau dehors. Rappelez-vous : avec des aimants, la boîte est sous tension dès que l’arbre tourne, même à la main.',
      'The three wires of the windings leave the frame and end in the terminal box on top. Each goes to its own lug, tightened and marked; an earth terminal bonds the frame to the earthing. A cable gland holds the cable that will leave for the powerhouse and keeps the water out. Remember: with magnets, the box is live as soon as the shaft turns, even by hand.',
    ),
    parts: ['gen-terminals'],
    tools: [
      l('Pince à sertir', 'Crimping tool'),
      l('Multimètre', 'Multimeter'),
      l('Tournevis isolés', 'Insulated screwdrivers'),
    ],
    tip: l(
      'Laissez au câble une boucle d’égouttage juste avant la boîte : l’eau qui suit le câble tombe au sol au lieu d’entrer.',
      'Leave the cable a drip loop just before the box: the water running along the cable drops to the ground instead of going in.',
    ),
    warning: l(
      'Une génératrice à aimants ne s’éteint pas : tant que l’arbre tourne, même à la main, les bornes sont sous tension. Ne touchez jamais une cosse nue, et gardez les fils isolés en bout tant qu’ils ne sont pas raccordés.',
      'A magnet generator cannot be switched off: as long as the shaft turns, even by hand, the terminals are live. Never touch a bare lug, and keep the wires insulated at their ends until they are connected.',
    ),
    duration: '≈ 1 h (est.)',
  },
  {
    id: 'generator',
    scene: 'screw',
    title: l('Poser la génératrice et sa petite poulie', 'Fit the generator and its small pulley'),
    text: lf(
      'Refermée, la génératrice se pose sur un support réglable, sa petite poulie dans le plan de la grande, pour pouvoir tendre la courroie. Elle est lente, à aimants permanents (dans la vidéo : comme sur les éoliennes), et le labo la suppose bobinée pour {genRpm} tr/min et {busVolts} V (hypothèse). Protégez ses bornes de l’humidité et placez-la au-dessus des crues.',
      'Closed again, the generator is set on an adjustable mount, its small pulley in the plane of the large one, so that the belt can be tensioned. It is slow, permanent-magnet (in the video: like those of wind turbines), and the lab assumes it wound for {genRpm} rpm and {busVolts} V (assumption). Protect its terminals from damp and place it above flood level.',
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
    id: 'board',
    scene: 'powerroom',
    title: l('Fixer le tableau sur un mur sec', 'Fix the board on a dry wall'),
    text: l(
      'Le tableau porte tous les appareils du local. Choisissez un mur sec, au-dessus des crues, loin de l’eau et des gaz de la batterie, avec de la place autour pour la chaleur et pour travailler. Fixez la plaque d’aplomb, avec des chevilles faites pour le mur, et prévoyez l’entrée des câbles par le bas. Tracez sur la porte la place de chaque appareil : le jour d’une panne, elle servira.',
      'The board carries all the room’s devices. Choose a dry wall, above flood level, away from the water and from the battery’s gases, with room around it for the heat and for working. Fix the plate true, with anchors made for the wall, and plan for the cables to enter from below. Mark on the door the place of each device: on the day of a fault, it will be needed.',
    ),
    parts: ['switchboard'],
    tools: [
      l('Niveau', 'Level'),
      l('Perceuse à percussion', 'Hammer drill'),
      l('Chevilles et étiquettes', 'Anchors and labels'),
    ],
    tip: l(
      'Faites entrer les câbles par le bas, jamais par le haut : l’eau qui suit un câble y entre moins.',
      'Bring the cables in from below, never from above: water running along a cable is less likely to get in.',
    ),
    warning: l(
      'Avant de percer, assurez-vous qu’aucune ligne électrique ni canalisation ne passe dans le mur. Masque, lunettes et protections auditives pour la pierre.',
      'Before drilling, make sure no electrical line or pipe runs through the wall. Mask, goggles and ear protection for stone.',
    ),
    duration: '≈ 3 h (est.)',
  },
  {
    id: 'protections',
    scene: 'powerroom',
    title: l(
      'Poser le disjoncteur continu et la boîte à fusibles, ouverts',
      'Fit the DC breaker and the fuse box, open',
    ),
    text: lf(
      'Posez d’abord les protections, le disjoncteur ouvert et les fusibles retirés : rien ne peut être mis sous tension par erreur pendant le travail. Ils doivent être faits pour le courant continu et pour une tension supérieure à celle de la génératrice sans charge, {freeRunVolts} V (résultat du modèle), pas seulement à celle de la batterie, {busVolts} V (hypothèse). Le disjoncteur isole et protège d’une surcharge ; les fusibles, très rapides, protègent les câbles d’un court-circuit.',
      'Fit the protections first, with the breaker open and the fuses out: nothing can be energised by mistake while you work. They must be made for direct current and for a voltage above that of the generator with no load, {freeRunVolts} V (model result), not only the battery’s {busVolts} V (assumption). The breaker isolates and protects against an overload; the fuses, very fast, protect the cables against a short circuit.',
    ),
    parts: ['dc-breaker', 'fuse-box'],
    tools: [l('Tournevis isolés', 'Insulated screwdrivers'), l('Étiquettes', 'Labels'), l('Multimètre', 'Multimeter')],
    tip: l(
      'Rangez à côté des fusibles de rechange du même calibre, étiquetés : on n’ouvre pas le tableau pour chercher le bon.',
      'Keep spare fuses of the same rating next to them, labelled: nobody should open the board to hunt for the right one.',
    ),
    warning: l(
      'Jamais d’appareil prévu pour l’alternatif sur du continu : l’arc ne s’éteint pas de lui-même et peut brûler l’appareil. Laissez tout ouvert jusqu’au premier essai, avec un cadenas et une étiquette.',
      'Never a device made for alternating current on direct current: the arc does not go out by itself and can burn the device. Leave everything open until the first test, with a padlock and a tag.',
    ),
    duration: '≈ 2 h (est.)',
  },
  {
    id: 'rectifier',
    scene: 'powerroom',
    title: l('Monter le redresseur, dissipateur à l’air libre', 'Mount the rectifier, heat sink in free air'),
    text: lf(
      'Le redresseur change l’alternatif triphasé de la génératrice en continu ; au point de calcul, il perd {diodeLossW} W en chaleur (résultat du modèle). Fixez-le sur le tableau, dissipateur à l’air libre, puis reliez à son entrée, hors tension, les trois fils du câble venu de la génératrice. L’ordre des trois phases n’a pas d’importance ; la polarité de la sortie, si. Laissez la sortie libre pour l’instant.',
      'The rectifier turns the generator’s three-phase alternating current into direct current; at the design point, it loses {diodeLossW} W as heat (model result). Fix it on the board, heat sink in free air, then connect to its input, with no power, the three wires of the cable from the generator. The order of the three phases does not matter; the polarity of the output does. Leave the output free for now.',
    ),
    parts: ['rectifier'],
    tools: [l('Pince à sertir', 'Crimping tool'), l('Multimètre', 'Multimeter'), l('Outils isolés', 'Insulated tools')],
    tip: l(
      'Ne l’enfermez pas dans une boîte étanche : sa chaleur doit sortir.',
      'Do not shut it in a sealed box: its heat has to get out.',
    ),
    warning: l(
      'Câblage : l’affaire d’un électricien qualifié. Le câble de la génératrice est sous tension dès que l’arbre tourne, même à la main : vanne verrouillée, câble isolé en bout.',
      'Wiring: a job for a qualified electrician. The generator’s cable is live as soon as the shaft turns, even by hand: gate locked, cable insulated at its end.',
    ),
    duration: '≈ 2 h (est.)',
  },
  {
    id: 'controller',
    scene: 'powerroom',
    title: l(
      'Monter le régulateur de charge et régler ses seuils',
      'Mount the charge controller and set its thresholds',
    ),
    text: l(
      'Le régulateur lit la tension de la batterie et décide : charger, ou détourner le surplus vers la charge de délestage, pour que la génératrice trouve toujours un frein. Fixez-le après le redresseur et branchez le fil qui mesure la tension de la batterie. Ses seuils dépendent du type de batterie : ils viennent du fabricant de celle-ci, pas du labo, qui ne simule pas le régulateur.',
      'The controller reads the battery voltage and decides: charge, or divert the surplus to the dump load, so that the generator always meets a brake. Fix it after the rectifier and connect the wire that senses the battery voltage. Its thresholds depend on the battery type: they come from the battery’s maker, not from the lab, which does not simulate the controller.',
    ),
    parts: ['charge-controller'],
    tools: [
      l('Multimètre', 'Multimeter'),
      l('Outils isolés', 'Insulated tools'),
      l('Notice de la batterie', 'The battery’s manual'),
    ],
    tip: l(
      'Notez les seuils réglés sur une étiquette collée dans le tableau.',
      'Write the thresholds set on a label stuck inside the board.',
    ),
    warning: l(
      'Un régulateur mal réglé peut surcharger la batterie, et une batterie surchargée chauffe, gonfle ou prend feu. Seuils du fabricant, réglage vérifié par un électricien.',
      'A badly set controller can overcharge the battery, and an overcharged battery heats, swells or catches fire. The maker’s thresholds, setting checked by an electrician.',
    ),
    duration: '≈ 2 h (est.)',
  },
  {
    id: 'battery',
    scene: 'powerroom',
    title: l('Poser la batterie, bornes couvertes', 'Set the battery, terminals covered'),
    text: lf(
      'Posez la batterie sur une étagère solide et ventilée, loin de l’eau, de la chaleur et des étincelles. Reliez son câble au porte-fusible, fusible retiré et disjoncteur ouvert : une batterie est toujours sous tension, et la dernière connexion ne se fait qu’au premier essai. Elle recevra {elecKw} kW, soit {current} A, au point de calcul (résultat du modèle) ; sa capacité n’est pas modélisée.',
      'Set the battery on a solid, ventilated shelf, away from water, heat and sparks. Connect its cable to the fuse holder, with the fuse out and the breaker open: a battery is always live, and the last connection is made only at the first test. It will receive {elecKw} kW, that is {current} A, at the design point (model result); its capacity is not modelled.',
    ),
    parts: ['battery'],
    tools: [
      l('Outils isolés', 'Insulated tools'),
      l('Capuchons de bornes', 'Terminal covers'),
      l('Multimètre', 'Multimeter'),
    ],
    tip: l(
      'Couvrez les bornes dès la pose : un outil qui tombe dessus suffit à faire un court-circuit.',
      'Cover the terminals as soon as it is set: a tool dropping on them is enough to make a short circuit.',
    ),
    warning: l(
      'Aucun court-circuit : outils isolés, ni bague ni montre. Une batterie débite des centaines d’ampères et peut projeter du métal fondu ; une batterie au plomb dégage de l’hydrogène. Pas de flamme ni d’étincelle, et on aère.',
      'No short circuit: insulated tools, no ring or watch. A battery delivers hundreds of amps and can spit molten metal; a lead-acid battery gives off hydrogen. No flame or spark, and ventilate.',
    ),
    duration: '≈ 2 h (est.)',
  },
  {
    id: 'dump-load',
    scene: 'powerroom',
    title: l('Poser et câbler la charge de délestage', 'Fit and wire the dump load'),
    text: lf(
      'Posez la charge de délestage là où sa chaleur ne gêne rien : à l’air libre, loin de tout ce qui brûle et derrière une grille, ou dans un ballon d’eau. Elle doit pouvoir absorber toute l’électricité de la centrale, {elecKw} kW au point de calcul (résultat du modèle), quand la batterie est pleine. Reliez-la au régulateur par des câbles aussi gros que ceux de la batterie. Le labo ne la simule pas.',
      'Fit the dump load where its heat harms nothing: in free air, clear of anything that burns and behind a guard, or in a water tank. It must be able to absorb all the plant’s electricity, {elecKw} kW at the design point (model result), when the battery is full. Connect it to the controller with cables as thick as the battery’s. The lab does not simulate it.',
    ),
    parts: ['dump-load'],
    tools: [
      l('Outils isolés', 'Insulated tools'),
      l('Grille de protection', 'Guard grille'),
      l('Thermomètre', 'Thermometer'),
    ],
    tip: l(
      'Dans l’eau d’un ballon, le délestage donne de l’eau chaude : l’énergie « perdue » sert à quelque chose.',
      'In the water of a tank, the dump load makes hot water: the “wasted” energy is good for something.',
    ),
    warning: l(
      'Elle devient très chaude : à distance de tout ce qui brûle, sous grille, jamais dans un coffre fermé. Si elle se déconnecte, la génératrice n’est plus freinée : ses connexions valent celles de la batterie.',
      'It gets very hot: well clear of anything that burns, under a guard, never in a closed box. If it disconnects, the generator is no longer braked: its connections matter as much as the battery’s.',
    ),
    duration: '≈ 2 h (est.)',
  },
  {
    id: 'inverter',
    scene: 'powerroom',
    title: l('Poser l’onduleur près de la batterie', 'Set the inverter near the battery'),
    text: l(
      'L’onduleur fait de l’alternatif à partir du continu de la batterie, pour les appareils de la maison. Posez-le près d’elle, avec des câbles continus courts et épais, son propre fusible et de l’air tout autour. Ne reliez pas encore sa sortie à la maison : c’est le dernier geste de l’électricien, après la mise à la terre, avec un disjoncteur différentiel sur le circuit.',
      'The inverter makes alternating current from the battery’s direct current, for the house’s appliances. Set it near the battery, with short, thick direct-current cables, its own fuse and air all round it. Do not connect its output to the house yet: that is the electrician’s last gesture, after the earthing, with a residual-current device on the circuit.',
    ),
    parts: ['inverter'],
    tools: [l('Pince à sertir', 'Crimping tool'), l('Outils isolés', 'Insulated tools'), l('Multimètre', 'Multimeter')],
    tip: l(
      'Plus les câbles continus sont courts, moins ils perdent : à 48 V, le courant est fort.',
      'The shorter the direct-current cables, the less they lose: at 48 V, the current is large.',
    ),
    warning: l(
      'Sa sortie donne une tension mortelle, comme le secteur. Raccordement à la maison : l’affaire d’un électricien qualifié, selon les règles du pays.',
      'Its output gives a lethal voltage, like the mains. Connection to the house: a job for a qualified electrician, following the country’s rules.',
    ),
    duration: '≈ 2 h (est.)',
  },
  {
    id: 'meter',
    scene: 'powerroom',
    title: l('Installer le compteur d’énergie', 'Install the energy meter'),
    text: lf(
      'Le compteur d’énergie mesure le courant par un shunt, sur le fil de la batterie, puis multiplie et additionne : il compte les kilowattheures. C’est ainsi que l’année tirée du labo, {yearKwh} kWh (résultat du modèle), se remplace un jour par la vôtre. Vérifiez le sens du shunt : monté à l’envers, il compte l’énergie à l’envers.',
      'The energy meter measures the current through a shunt on the battery’s wire, then multiplies and adds up: it counts the kilowatt-hours. This is how the lab’s drawn year, {yearKwh} kWh (model result), is one day replaced by your own. Check the direction of the shunt: fitted the wrong way round, it counts the energy backwards.',
    ),
    parts: ['energy-meter'],
    tools: [
      l('Multimètre', 'Multimeter'),
      l('Pince pour courant continu', 'DC clamp meter'),
      l('Étiquettes', 'Labels'),
    ],
    tip: l(
      'Notez sa lecture le jour de la mise en service : sans point de départ, un compteur ne raconte rien.',
      'Note its reading on the day of commissioning: without a starting point, a meter tells nothing.',
    ),
    warning: l(
      'Les fils de mesure sont fins et reliés à la batterie : sans fusible, un court-circuit les fait fondre. Protégez-les.',
      'The measuring wires are thin and linked to the battery: without a fuse, a short circuit makes them melt. Protect them.',
    ),
    duration: '≈ 1 h (est.)',
  },
  {
    id: 'earthing',
    scene: 'powerroom',
    title: l('Relier toutes les masses à la prise de terre', 'Bond every frame to the earth'),
    text: lf(
      'Le piquet est planté dehors ; un conducteur vert et jaune de {earthMm2} mm² (estimation) y relie le métal de la génératrice, du tableau, de l’onduleur, du support de la batterie et de la charge de délestage. Ainsi un défaut trouve un chemin vers le sol et fait déclencher la protection. Les parafoudres se placent à l’arrivée du câble de la génératrice. L’électricien mesure la prise et note la valeur.',
      'The rod is driven outside; a green-and-yellow conductor of {earthMm2} mm² (estimate) bonds to it the metal of the generator, the board, the inverter, the battery rack and the dump load. A fault then finds a path to the ground and trips the protection. The surge protectors go where the generator’s cable arrives. The electrician measures the earth and notes the value.',
    ),
    parts: ['earthing'],
    tools: [
      l('Masse et pince de piquet', 'Maul and rod clamp'),
      l('Testeur de terre', 'Earth tester'),
      l('Pince à sertir', 'Crimping tool'),
    ],
    tip: l(
      'Sur un vrai chantier, le piquet se plante avant tout câblage, et la prise se mesure : sa valeur change avec le sol et la saison.',
      'On a real site, the rod is driven before any wiring, and the earth is measured: its value changes with the soil and the season.',
    ),
    warning: l(
      'Une masse mal reliée peut rester sous tension sans que rien ne le montre. Travail d’un électricien qualifié, qui mesure ; jamais pendant un orage. Avant de planter, vérifiez l’absence de câble ou de canalisation enterrés.',
      'A frame badly bonded can stay live with nothing to show it. Work for a qualified electrician, who measures; never during a storm. Before driving the rod, check there is no buried cable or pipe.',
    ),
    duration: '≈ 3 h (est.)',
  },
  {
    id: 'first-test',
    scene: 'powerroom',
    title: l('Essayer le local avant l’eau', 'Test the room before the water'),
    text: l(
      'Au multimètre, vérifiez d’abord, tout étant ouvert : continuité de la terre, polarités, absence de court-circuit entre les pôles, isolement. Puis fermez dans cet ordre : fusible de la batterie, disjoncteur, onduleur en dernier. Regardez la tension sur le régulateur, puis essayez la charge de délestage en abaissant le seuil de détournement. L’eau n’entre que si tout est juste.',
      'With the multimeter, first check, everything being open: continuity of the earth, polarities, no short circuit between the poles, insulation. Then close in this order: the battery’s fuse, the breaker, the inverter last. Watch the voltage on the controller, then try the dump load by lowering the diversion threshold. The water goes in only if everything is right.',
    ),
    parts: [],
    tools: [
      l('Multimètre', 'Multimeter'),
      l('Contrôleur d’isolement', 'Insulation tester'),
      l('Carnet de relevés', 'Notebook for readings'),
    ],
    tip: l(
      'Notez toutes les valeurs dans un carnet : elles sont votre référence le jour où quelque chose dérive.',
      'Write all the values in a notebook: they are your reference on the day something drifts.',
    ),
    warning: l(
      'Premier essai sous tension : jamais seul, lunettes, outils isolés, quelqu’un qui sait où couper, et vanne de tête verrouillée tant que le local n’est pas validé.',
      'First live test: never alone, goggles, insulated tools, someone who knows where to cut, and the head gate locked until the room is approved.',
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
