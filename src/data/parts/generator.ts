// Parts of the `generator` world (ids frozen in src/part-ids.ts, 8 of them): the permanent-magnet generator opened, in section and exploded.
//
// The machine: a three-phase, radial-flux generator with an INNER rotor and SURFACE magnets, the one the drive turns at about 600 rpm and that
// the `screw` world draws closed (same frame, shaft and terminal box). What the sources say: the video shows a bought generator, of the kind
// used on wind turbines, chosen slow to keep the transmission simple (35:43 to 36:48); it never opens it. What is therefore the lab's own
// ESTIMATE, tagged on the sheets: the number of poles (16), the slots (24), the coils per phase (8), the electrical frequency
// (poles × rpm / 120 = 80 Hz), the magnet material, the air gap and every size (read from src/three/dims.ts). The MODEL RESULTS at the design
// point come from src/sim/mech.ts (docs/physics.md §1.8): 600 rpm at the generator (an assumption), 39 N·m, 46 A, 53.7 V rectified at the
// open terminals, a circuit resistance of 0.09 Ω, a torque constant of 0.86 N·m per ampere. The model does not compute the iron or friction
// losses of the generator: its efficiency (89 %) is copper and diodes only. The generator is GENERIC, and says so. Conventions: see ./site.ts.
//
// The one safety fact of this machine, said in several places: a permanent-magnet generator cannot be switched off. As long as its shaft turns,
// its terminals are live.
import type { PartInfo } from '@onigam/lab-kit/content';
import { l } from '@onigam/lab-kit/i18n';
import { lf, maint, sp, tagged, tf } from '../part-helpers';

export const GENERATOR_PARTS: PartInfo[] = [
  {
    id: 'gen-frame',
    scene: 'generator',
    category: 'structure',
    name: l('Carcasse', 'Frame'),
    short: l(
      'Le boîtier rond qui tient le stator, porte les roulements et se boulonne sur son support.',
      'The round casing that holds the stator, carries the bearings and bolts onto its mount.',
    ),
    description: lf(
      'La carcasse est le boîtier de la génératrice : une virole cylindrique fermée par deux flasques, avec des pattes pour la boulonner sur son support. Elle tient le stator serré, porte les roulements dans ses flasques et garde l’ensemble rond, ce qui compte plus qu’il n’y paraît : si l’entrefer entre le rotor et le stator n’est pas régulier, les aimants tirent le rotor d’un seul côté. Elle protège aussi de la poussière et des éclaboussures, et conduit vers l’extérieur la chaleur du stator. Enfin elle encaisse le couple de réaction : les {torqueGen} N·m que l’arbre reçoit au point de calcul (résultat du modèle) poussent la carcasse en sens inverse, et ce sont les pattes qui les retiennent. La vidéo montre la génératrice entière, installée derrière la turbine ; l’intérieur que le labo ouvre ici est une image générique de ce genre de machine.',
      'The frame is the generator’s casing: a cylindrical shell closed by two end shields, with feet to bolt it onto its mount. It holds the stator tight, carries the bearings in its end shields and keeps everything round, which matters more than it seems: if the gap between rotor and stator is not even, the magnets pull the rotor to one side. It also protects against dust and splashes, and carries the stator’s heat out. Last, it takes the reaction torque: the {torqueGen} N·m that the shaft receives at the design point (model result) push the frame the other way, and the feet hold them back. The video shows the whole generator, installed behind the turbine; the inside that the lab opens here is a generic picture of this kind of machine.',
    ),
    material: l('Aluminium moulé ou acier, flasques usinés', 'Cast aluminium or steel, machined end shields'),
    specs: [
      sp(
        'Rôle',
        'Role',
        l(
          'tenir le stator, porter les roulements, reprendre le couple',
          'hold the stator, carry the bearings, take the torque',
        ),
      ),
      sp(
        'Couple de réaction',
        'Reaction torque',
        tf('model', '{torqueGen} N·m au point de calcul', '{torqueGen} N·m at the design point'),
      ),
      sp(
        'Forme dessinée',
        'Drawn shape',
        tagged(
          'estimate',
          'virole ronde fermée par deux flasques, avec des pattes',
          'round shell closed by two end shields, with feet',
        ),
      ),
      sp(
        'Protection',
        'Protection',
        l(
          'contre la poussière et les éclaboussures, pas contre l’immersion',
          'against dust and splashes, not against immersion',
        ),
      ),
    ],
    maintenance: maint(
      {
        failure:
          'Fissure ou corrosion, pattes qui se desserrent sous les vibrations, condensation qui s’accumule à l’intérieur, joints vieillis par où l’eau entre.',
        check:
          'Machine arrêtée et vanne verrouillée : cherchez rouille, fissure et traces de ruissellement, essayez de remuer la carcasse sur son support, et notez où elle est la plus chaude après une longue marche (chaude, jamais brûlante au toucher).',
        care: 'Resserrez les boulons des pattes, gardez les ailettes et les ouïes dégagées, retouchez la peinture, et laissez ouvert le petit orifice d’évacuation de la condensation s’il y en a un.',
      },
      {
        failure:
          'A crack or corrosion, feet that work loose under vibration, condensation that builds up inside, aged seals through which water enters.',
        check:
          'With the machine stopped and the gate locked, look for rust, cracks and traces of running water, try to rock the frame on its mount, and note where it is hottest after a long run (warm, never scalding to the touch).',
        care: 'Retighten the foot bolts, keep the fins and vents clear, touch up the paint, and leave the small condensation drain open if there is one.',
      },
    ),
    tip: l(
      'Serrez à fond les boulons de réglage une fois la courroie tendue : un support qui glisse défait la tension, et la carcasse tournerait sous son propre couple.',
      'Tighten the adjusting bolts hard once the belt is tensioned: a mount that slides loses the tension, and the frame would turn under its own torque.',
    ),
    video: ['35:43'],
    design: l(
      'Une virole ronde et rigide est la forme la plus simple pour garder un entrefer fin et régulier tout autour. Les ailettes, quand il y en a, ne servent qu’à évacuer la chaleur : une machine fermée est protégée de l’humidité, mais elle ne se refroidit que par sa peau.',
      'A round, rigid shell is the simplest shape for keeping a thin, even gap all the way round. Fins, when there are any, only carry heat away: a closed machine is protected from damp, but cools only through its skin.',
    ),
  },
  {
    id: 'gen-stator',
    scene: 'generator',
    category: 'electrical',
    name: l('Stator', 'Stator'),
    short: l(
      'La partie fixe : des tôles d’acier à dents, qui guident le flux des aimants vers les bobines.',
      'The fixed part: toothed steel plates that guide the magnets’ flux to the coils.',
    ),
    description: lf(
      'Le stator est la partie fixe de la machine : une couronne de tôles d’acier minces, empilées et isolées les unes des autres, dont l’intérieur est creusé de {genSlots} encoches (estimation). Entre deux encoches se dresse une dent, qui canalise le flux magnétique des aimants vers la bobine qui l’entoure. Les tôles sont minces pour une raison : dans un bloc d’acier plein, le flux qui varie ferait circuler des courants parasites qui chaufferaient le fer pour rien. Le stator est enfilé dans la carcasse, et c’est lui qui reçoit les {torqueGen} N·m de réaction au point de calcul (résultat du modèle). Le modèle ne compte que les pertes du cuivre et des diodes : celles du fer ne sont pas calculées.',
      'The stator is the fixed part of the machine: a ring of thin steel plates, stacked and insulated from one another, whose inside is cut into {genSlots} slots (estimate). Between two slots stands a tooth, which channels the magnets’ flux to the coil around it. The plates are thin for a reason: in a solid block of steel, the changing flux would drive stray currents that heat the iron for nothing. The stator is pressed into the frame, and it is the one that takes the {torqueGen} N·m of reaction at the design point (model result). The model counts only the losses of the copper and the diodes: those of the iron are not calculated.',
    ),
    material: l('Tôles d’acier électrique, isolées et empilées', 'Electrical-steel plates, insulated and stacked'),
    specs: [
      sp(
        'Encoches et dents',
        'Slots and teeth',
        tf('estimate', '{genSlots}, une bobine sur chaque dent', '{genSlots}, one coil on each tooth'),
      ),
      sp('Construction', 'Construction', l('tôles minces empilées et isolées', 'thin plates, stacked and insulated')),
      sp('Pertes dans le fer', 'Iron losses', l('non calculées par le modèle', 'not calculated by the model')),
      sp(
        'Couple repris',
        'Torque taken',
        tf('model', '{torqueGen} N·m au point de calcul', '{torqueGen} N·m at the design point'),
      ),
    ],
    maintenance: maint(
      {
        failure:
          'Tôles qui se desserrent et vibrent, rouille sur l’alésage, poussière ou limaille de fer collée par les aimants, dents abîmées par un frottement du rotor.',
        check:
          'Courant isolé et vanne verrouillée : tournez l’arbre à la main. On sent des crans réguliers, les aimants qui cherchent les dents ; un point dur ou un grattement n’est pas normal.',
        care: 'Gardez l’intérieur propre et sec, ne démontez pas sans nécessité, et ne rayez jamais l’alésage.',
      },
      {
        failure:
          'Plates that work loose and buzz, rust in the bore, dust or iron filings stuck by the magnets, teeth damaged by the rotor rubbing.',
        check:
          'With the current isolated and the gate locked, turn the shaft by hand. You feel regular clicks, the magnets looking for the teeth; a tight spot or a scraping noise is not normal.',
        care: 'Keep the inside clean and dry, do not take it apart without need, and never scratch the bore.',
      },
    ),
    tip: l(
      'Les crans que l’on sent en tournant l’arbre à la main sont normaux : ce sont les aimants qui s’alignent sur les dents (le couple de crantage). La vis doit les franchir pour démarrer.',
      'The clicks you feel when turning the shaft by hand are normal: they are the magnets lining up with the teeth (the cogging torque). The screw has to get over them to start.',
    ),
    design: l(
      'Une dent par bobine, avec peu d’encoches, donne un stator simple à fabriquer, à bobiner et à réparer. Le prix à payer : des crans, que l’on sent à la main.',
      'One tooth per coil, with few slots, gives a stator that is simple to make, to wind and to repair. The price: clicks, which can be felt by hand.',
    ),
  },
  {
    id: 'gen-coils',
    scene: 'generator',
    category: 'electrical',
    name: l('Bobines', 'Coils'),
    short: l(
      'Du fil de cuivre enroulé autour des dents : les aimants qui passent y font naître la tension.',
      'Copper wire wound round the teeth: the passing magnets raise the voltage in it.',
    ),
    description: lf(
      'Chaque dent du stator porte une bobine de fil de cuivre émaillé. Quand un aimant passe devant, le flux qui traverse la bobine varie, et une tension naît dans le fil : c’est le principe de l’induction. Les {genSlots} bobines (estimation) forment trois phases de {genCoilsPerPhase} bobines chacune (estimation), reliées en série dans chaque phase, d’où trois fils de sortie. Au point de calcul, la tension redressée est de {voc} V à vide (résultat du modèle), soit {genLineV} V entre deux phases (dérivé), et le courant dans chaque phase est d’environ {genPhaseA} A (dérivé). Le modèle donne au circuit entier, bobinages et câbles, une résistance de {genResistance} Ω : à {current} A, elle chauffe de {copperLossW} W (résultat du modèle).',
      'Each tooth of the stator carries a coil of enamelled copper wire. When a magnet passes in front, the flux through the coil changes and a voltage is born in the wire: this is the principle of induction. The {genSlots} coils (estimate) form three phases of {genCoilsPerPhase} coils each (estimate), joined in series within each phase, hence three output wires. At the design point, the rectified voltage is {voc} V open-circuit (model result), that is {genLineV} V between two phases (derived), and the current in each phase is about {genPhaseA} A (derived). The model gives the whole circuit, windings and cables, a resistance of {genResistance} Ω: at {current} A, it heats by {copperLossW} W (model result).',
    ),
    material: l(
      'Fil de cuivre émaillé, vernis ou résine d’imprégnation',
      'Enamelled copper wire, varnish or impregnating resin',
    ),
    specs: [
      sp(
        'Bobines',
        'Coils',
        tf(
          'estimate',
          '{genSlots}, soit {genCoilsPerPhase} par phase',
          '{genSlots}, that is {genCoilsPerPhase} per phase',
        ),
      ),
      sp(
        'Tension entre deux phases',
        'Voltage between two phases',
        tf('derived', '{genLineV} V à la vitesse nominale', '{genLineV} V at the rated speed'),
      ),
      sp(
        'Tension d’une phase, si le montage est en étoile',
        'Voltage of one phase, if star-connected',
        tf('derived', '≈ {genPhaseV} V à la vitesse nominale', '≈ {genPhaseV} V at the rated speed'),
      ),
      sp(
        'Courant dans chaque phase',
        'Current in each phase',
        tf('derived', '≈ {genPhaseA} A au point de calcul', '≈ {genPhaseA} A at the design point'),
      ),
      sp(
        'Résistance du circuit',
        'Circuit resistance',
        tf(
          'model',
          '{genResistance} Ω, soit {copperLossW} W de chaleur à {current} A',
          '{genResistance} Ω, that is {copperLossW} W of heat at {current} A',
        ),
      ),
    ],
    maintenance: maint(
      {
        failure:
          'L’isolant du fil vieillit avec la chaleur : deux spires se touchent, la bobine chauffe plus que les autres et la tension baisse. L’humidité, elle, fait fuir le courant vers la carcasse.',
        check:
          'Machine arrêtée, câble débranché : mesurez la résistance entre les trois paires de fils, elle doit être la même ; faites mesurer l’isolement vers la carcasse par un électricien. Une odeur de vernis chaud est un avertissement.',
        care: 'Ne dépassez jamais le courant prévu (le fusible et le disjoncteur en sont garants), gardez le bobinage sec et propre, et faites reprendre l’imprégnation par un atelier de bobinage si elle se fendille.',
      },
      {
        failure:
          'The wire’s insulation ages with heat: two turns touch, the coil heats more than the others and the voltage drops. Damp, for its part, lets current leak to the frame.',
        check:
          'With the machine stopped and the cable disconnected, measure the resistance between the three pairs of wires, which should be the same; have an electrician measure the insulation to the frame. A smell of hot varnish is a warning.',
        care: 'Never exceed the intended current (the fuse and the breaker are the guarantee), keep the winding dry and clean, and have a winding shop redo the impregnation if it cracks.',
      },
    ),
    tip: l(
      'Mesurez, machine à l’arrêt et câble débranché, la résistance entre les trois paires de fils : trois valeurs égales disent trois phases saines, un écart annonce une bobine en défaut.',
      'With the machine stopped and the cable disconnected, measure the resistance between the three pairs of wires: three equal values mean three healthy phases, a difference announces a faulty coil.',
    ),
    design: l(
      'Une bobine autour d’une seule dent garde des têtes de bobine courtes : moins de cuivre perdu hors du fer, donc moins de pertes, et une bobine facile à rebobiner. C’est le choix courant des machines lentes à nombreux pôles.',
      'A coil round a single tooth keeps the end turns short: less copper outside the iron, so fewer losses, and a coil that is easy to rewind. It is the usual choice for slow machines with many poles.',
    ),
  },
  {
    id: 'gen-rotor',
    scene: 'generator',
    category: 'mechanical',
    name: l('Rotor', 'Rotor'),
    short: l(
      'La partie qui tourne : un cylindre d’acier qui porte les aimants et se cale sur l’arbre.',
      'The turning part: a steel cylinder that carries the magnets and is keyed on the shaft.',
    ),
    description: lf(
      'Le rotor est la partie qui tourne, au centre de la machine : un cylindre d’acier, calé sur l’arbre, qui porte les aimants à sa surface et referme derrière eux le circuit magnétique. Il tourne à l’intérieur du stator, dont le sépare un mince entrefer. À {genRpm} tr/min (hypothèse), soit dix tours par seconde, ses {genPoles} pôles (estimation) font osciller la tension {genFreq} fois par seconde (estimation) : le nombre de pôles multiplié par la vitesse en tours par minute, divisé par 120. La vidéo dit qu’on a choisi une machine lente pour simplifier la transmission ; beaucoup de pôles est la façon d’avoir de la tension à basse vitesse. Sans charge, la vis emballée le porte à {freeRunGenRpm} tr/min (résultat du modèle).',
      'The rotor is the turning part, at the centre of the machine: a steel cylinder, keyed on the shaft, that carries the magnets on its surface and closes the magnetic circuit behind them. It turns inside the stator, from which a thin air gap separates it. At {genRpm} rpm (assumption), that is ten turns a second, its {genPoles} poles (estimate) make the voltage swing {genFreq} times a second (estimate): the number of poles times the speed in rpm, divided by 120. The video says a slow machine was chosen to keep the transmission simple; many poles is the way to get voltage at low speed. With no load, the racing screw takes it to {freeRunGenRpm} rpm (model result).',
    ),
    material: l('Acier, aimants collés, équilibré', 'Steel, bonded magnets, balanced'),
    specs: [
      sp(
        'Pôles',
        'Poles',
        tf('estimate', '{genPoles}, nord et sud en alternance', '{genPoles}, north and south alternating'),
      ),
      sp('Vitesse nominale', 'Rated speed', tf('assumed', '{genRpm} tr/min', '{genRpm} rpm')),
      sp(
        'Fréquence électrique',
        'Electrical frequency',
        tf(
          'estimate',
          '{genFreq} Hz à la vitesse nominale (pôles × tr/min ÷ 120)',
          '{genFreq} Hz at the rated speed (poles × rpm ÷ 120)',
        ),
      ),
      sp(
        'Sans charge',
        'With no load',
        tf(
          'model',
          'jusqu’à {freeRunGenRpm} tr/min (vis à {freeRunRpm} tr/min)',
          'up to {freeRunGenRpm} rpm (screw at {freeRunRpm} rpm)',
        ),
      ),
    ],
    maintenance: maint(
      {
        failure:
          'Un aimant qui se décolle, un rotor qui frotte sur le stator parce qu’un roulement a pris du jeu, un déséquilibre qui fait vibrer toute la machine.',
        check:
          'Courant isolé, vanne verrouillée, courroie ôtée : tournez le rotor à la main, il doit tourner rond avec les mêmes crans partout, sans grattement. En marche, une vibration que la main sent sur la carcasse est un déséquilibre.',
        care: 'Gardez l’intérieur propre : les aimants attirent la limaille. Faites équilibrer le rotor après toute intervention, et ne le sortez jamais sans cause.',
      },
      {
        failure:
          'A magnet that comes unstuck, a rotor that rubs on the stator because a bearing has got play, an imbalance that makes the whole machine vibrate.',
        check:
          'With the current isolated, the gate locked and the belt off, turn the rotor by hand: it should turn true, with the same clicks everywhere and no scraping. Running, a vibration felt by hand on the frame is an imbalance.',
        care: 'Keep the inside clean: the magnets attract filings. Have the rotor balanced after any work on it, and never take it out without cause.',
      },
    ),
    tip: lf(
      'Si la vis s’emballe, la force centrifuge sur le rotor est multipliée par environ {freeRunForce} (dérivé), car la vitesse l’est par {freeRunFactor} (résultat du modèle) et la force suit le carré de la vitesse : une raison de plus de ne jamais laisser la génératrice sans charge.',
      'If the screw races, the centrifugal force on the rotor is multiplied by about {freeRunForce} (derived), because the speed is multiplied by {freeRunFactor} (model result) and the force follows the square of the speed: one more reason never to leave the generator without a load.',
    ),
    design: l(
      'Un rotor intérieur est le plus simple à équilibrer et à refroidir : les aimants sont à l’abri au centre, et la chaleur des bobines s’évacue par la carcasse. Les aimants en surface, collés sur l’acier, sont faciles à poser et à contrôler, mais il faut les retenir quand la vitesse monte.',
      'An inner rotor is the simplest to balance and to cool: the magnets are sheltered in the centre, and the coils’ heat leaves through the frame. Surface magnets, bonded to the steel, are easy to fit and to inspect, but have to be held back when the speed rises.',
    ),
  },
  {
    id: 'gen-magnets',
    scene: 'generator',
    category: 'electrical',
    name: l('Aimants', 'Magnets'),
    short: l(
      'Les aimants permanents : des pôles nord et sud en alternance, qui créent le champ sans consommer de courant.',
      'The permanent magnets: alternating north and south poles that create the field without using current.',
    ),
    description: lf(
      'Les aimants sont ce qui rend la machine « à aimants permanents » : posés à la surface du rotor, {genPoles} en tout (estimation), nord et sud en alternance, ils créent le champ magnétique sans consommer le moindre courant. Quand ils défilent devant les bobines, ils y font naître la tension ; plus ils sont forts, plus la tension et le couple sont grands, avec une même constante : {genK} N·m par ampère, qui est aussi {genK} V par rad/s (résultat du modèle). C’est ce qui lie les deux faces de la machine : plus le rotor tourne vite, plus la tension monte ; plus la batterie tire de courant, plus il faut de couple. Le labo ne choisit pas le matériau des aimants : aucune source ne le donne, et les tailles dessinées sont des estimations.',
      'The magnets are what makes the machine “permanent-magnet”: set on the surface of the rotor, {genPoles} in all (estimate), north and south alternating, they create the magnetic field without using any current. When they sweep past the coils, they raise the voltage in them; the stronger they are, the greater the voltage and the torque, with one constant: {genK} N·m per ampere, which is also {genK} V per rad/s (model result). That is what ties the two faces of the machine: the faster the rotor turns, the higher the voltage; the more current the battery draws, the more torque is needed. The lab does not choose the magnet material: no source gives it, and the sizes drawn are estimates.',
    ),
    material: l('Néodyme ou ferrite : aucune source ne choisit', 'Neodymium or ferrite: no source chooses'),
    specs: [
      sp(
        'Nombre',
        'Number',
        tf('estimate', '{genPoles}, nord et sud en alternance', '{genPoles}, north and south alternating'),
      ),
      sp(
        'Constante de la machine',
        'Machine constant',
        tf('model', '{genK} N·m par A, soit {genK} V par rad/s', '{genK} N·m per A, that is {genK} V per rad/s'),
      ),
      sp(
        'Matériau',
        'Material',
        l('néodyme ou ferrite : aucune source ne choisit', 'neodymium or ferrite: no source chooses'),
      ),
      sp(
        'Fixation dessinée',
        'Drawn fixing',
        tagged('estimate', 'collés sur la surface du rotor', 'bonded to the surface of the rotor'),
      ),
    ],
    maintenance: maint(
      {
        failure:
          'Une partie de l’aimantation se perd pour de bon par une forte chaleur, un choc ou un courant excessif dans les bobines ; le revêtement s’écaille et l’aimant rouille ; un aimant se décolle.',
        check:
          'Machine arrêtée et isolée, regardez et touchez : rouille, écailles de revêtement, limaille collée, aimant qui bouge. Si, à débit égal, la batterie reçoit moins de courant qu’avant, des aimants affaiblis en sont une cause possible parmi d’autres.',
        care: 'Ne chauffez jamais la machine, ne la frappez pas, protégez-la de l’humidité, et faites ouvrir le rotor par un atelier qui sait manipuler des aimants puissants.',
      },
      {
        failure:
          'Some of the magnetisation is lost for good through strong heat, a knock or an excessive current in the coils; the coating flakes and the magnet rusts; a magnet comes unstuck.',
        check:
          'With the machine stopped and isolated, look and feel: rust, flaking coating, stuck filings, a magnet that moves. If, at the same flow, the battery receives less current than before, weakened magnets are one possible cause among others.',
        care: 'Never heat the machine, never knock it, protect it from damp, and have the rotor opened by a shop that knows how to handle powerful magnets.',
      },
    ),
    tip: l(
      'Un aimant puissant ne se tient pas à la main : il saute vers l’acier, pince la peau et peut éclater. Un à la fois, gants, lunettes, cales de bois, et loin des montres, des cartes bancaires et des stimulateurs cardiaques.',
      'A strong magnet is not held in the hand: it leaps to steel, pinches skin and can shatter. One at a time, gloves, goggles, wooden spacers, and away from watches, bank cards and pacemakers.',
    ),
    design: l(
      'Sans aimants, il faudrait alimenter un électroaimant au rotor, avec des bagues, des balais et un courant d’excitation. Les aimants suppriment tout cela, à un prix : on ne peut pas les éteindre. Tant que l’arbre tourne, la machine produit.',
      'Without magnets, an electromagnet on the rotor would have to be fed, with slip rings, brushes and an excitation current. Magnets do away with all that, at a price: they cannot be switched off. As long as the shaft turns, the machine produces.',
    ),
  },
  {
    id: 'gen-shaft',
    scene: 'generator',
    category: 'mechanical',
    name: l('Arbre', 'Shaft'),
    short: l(
      'L’axe d’acier qui porte le rotor et reçoit la petite poulie : le couple entre par lui.',
      'The steel axle that carries the rotor and receives the small pulley: the torque comes in through it.',
    ),
    description: lf(
      'L’arbre est l’axe d’acier de la génératrice. À l’avant, un bout d’arbre dépasse de la carcasse et reçoit la petite poulie, calée par une clavette : c’est là que la courroie de la vidéo apporte la rotation. À l’intérieur, il porte le rotor et repose sur les deux roulements. Il transmet {torqueGen} N·m au point de calcul (résultat du modèle), à {genRpm} tr/min (hypothèse). Il a deux efforts à tenir : le couple, qui le tord, et la traction de la courroie, qui le plie et pousse sur le roulement du côté de la poulie.',
      'The shaft is the generator’s steel axle. At the front, a shaft stub sticks out of the frame and receives the small pulley, fixed by a key: this is where the video’s belt brings the rotation. Inside, it carries the rotor and rests on the two bearings. It transmits {torqueGen} N·m at the design point (model result), at {genRpm} rpm (assumption). It has two loads to bear: the torque, which twists it, and the belt’s pull, which bends it and pushes on the bearing on the pulley side.',
    ),
    material: l('Acier usiné, avec une rainure de clavette', 'Machined steel with a keyway'),
    specs: [
      sp('Couple transmis', 'Torque transmitted', tf('model', '{torqueGen} N·m', '{torqueGen} N·m')),
      sp('Vitesse', 'Speed', tf('assumed', '{genRpm} tr/min', '{genRpm} rpm')),
      sp(
        'Efforts',
        'Loads',
        l('couple (torsion) et traction de la courroie (flexion)', 'torque (twisting) and belt pull (bending)'),
      ),
    ],
    maintenance: maint(
      {
        failure:
          'Clavette ou rainure qui prend du jeu et laisse glisser la poulie ; fissure de fatigue au fond de la rainure ; arbre faussé par une courroie trop tendue ; joint d’étanchéité usé à la sortie.',
        check:
          'Vanne verrouillée, courroie ôtée : empoignez la poulie et essayez de la faire bouger sur l’arbre et en travers, il ne doit y avoir aucun jeu. Regardez le joint à la sortie de l’arbre : sec et propre.',
        care: 'Tendez la courroie comme prévu, pas plus ; mettez du frein-filet sur la vis de blocage de la poulie ; gardez le bout d’arbre propre et légèrement graissé.',
      },
      {
        failure:
          'A key or keyway that gets play and lets the pulley slip; a fatigue crack at the bottom of the keyway; a shaft bent by a belt that is too tight; a worn seal where the shaft leaves.',
        check:
          'With the gate locked and the belt off, grip the pulley and try to move it on the shaft and sideways: there should be no play. Look at the seal where the shaft leaves: dry and clean.',
        care: 'Tension the belt as intended, no more; put thread-lock on the pulley’s set screw; keep the shaft stub clean and lightly greased.',
      },
    ),
    tip: l(
      'Tracez un trait de peinture en travers de la poulie et du bout d’arbre : s’il se décale, la poulie glisse sur l’arbre.',
      'Draw a line of paint across the pulley and the shaft stub: if it shifts, the pulley is slipping on the shaft.',
    ),
    video: ['36:15'],
    design: l(
      'Le bout d’arbre est court pour que la courroie tire près du roulement : moins de flexion, moins d’effort sur lui. Un arbre plus gros serait plus rigide, mais il ne résout pas le problème d’une courroie trop tendue.',
      'The shaft stub is short so that the belt pulls close to the bearing: less bending, less load on it. A thicker shaft would be stiffer, but it does not solve the problem of a belt that is too tight.',
    ),
  },
  {
    id: 'gen-bearings',
    scene: 'generator',
    category: 'mechanical',
    name: l('Roulements', 'Bearings'),
    short: l(
      'Deux roulements à billes qui tiennent le rotor centré et le laissent tourner presque sans frottement.',
      'Two ball bearings that keep the rotor centred and let it turn with almost no friction.',
    ),
    description: lf(
      'Deux roulements à billes, un dans chaque flasque, portent l’arbre et le rotor. Leur premier rôle est de garder le rotor exactement centré dans le stator : l’entrefer est mince, et un roulement qui prend du jeu laisse le rotor frotter sur les dents. Du côté de la poulie, le roulement porte aussi la traction de la courroie. Ce sont en général les pièces qui s’usent en premier dans une génératrice ; le labo les dessine scellés et graissés à vie (estimation). Le modèle ne calcule pas leur frottement : il ne compte que celui des deux paliers de la vis, {lossBearingW} W en tout (résultat du modèle).',
      'Two ball bearings, one in each end shield, carry the shaft and the rotor. Their first job is to keep the rotor exactly centred in the stator: the gap is thin, and a bearing that gets play lets the rotor rub on the teeth. On the pulley side, the bearing also carries the belt’s pull. They are generally the parts that wear out first in a generator; the lab draws them sealed and greased for life (estimate). The model does not calculate their friction: it counts only that of the screw’s two bearings, {lossBearingW} W in all (model result).',
    ),
    material: l('Acier à roulements, billes d’acier, graisse', 'Bearing steel, steel balls, grease'),
    specs: [
      sp(
        'Nombre et type',
        'Number and type',
        tagged('estimate', 'deux roulements à billes scellés', 'two sealed ball bearings'),
      ),
      sp(
        'Charge particulière',
        'Special load',
        l('côté poulie : la traction de la courroie', 'pulley side: the belt’s pull'),
      ),
      sp(
        'Frottement',
        'Friction',
        l('non calculé par le modèle pour la génératrice', 'not calculated by the model for the generator'),
      ),
    ],
    maintenance: maint(
      {
        failure:
          'Un grondement qui grandit, de la chaleur, un jeu qui laisse le rotor frotter sur le stator ; une graisse qui sèche ou qui sort ; un joint percé par où l’eau entre ; une courroie trop tendue qui les use avant l’heure.',
        check:
          'Courroie ôtée, vanne verrouillée : faites tourner l’arbre à la main, sans point dur ni grincement, puis poussez-le et tirez-le dans l’axe : aucun jeu. En marche, la main posée sur un flasque ne doit sentir qu’une chaleur normale.',
        care: 'Changez les deux roulements ensemble, par des roulements identiques, avant la panne ; un roulement scellé ne se regraisse pas. Gardez l’eau et une courroie trop tendue loin d’eux.',
      },
      {
        failure:
          'A growing rumble, heat, play that lets the rotor rub on the stator; grease that dries or leaks out; a pierced seal through which water enters; a belt that is too tight and wears them out early.',
        check:
          'With the belt off and the gate locked, turn the shaft by hand, with no tight spot or squeak, then push and pull it along its axis: no play. Running, a hand on an end shield should feel only normal warmth.',
        care: 'Change both bearings together, with identical ones, before they fail; a sealed bearing is not regreased. Keep water, and a belt that is too tight, away from them.',
      },
    ),
    tip: l(
      'Un grondement qui grandit, une chaleur qui monte : changez les roulements avant qu’ils ne laissent le rotor frotter sur le stator, ce qui abîme les bobines.',
      'A growing rumble, rising heat: change the bearings before they let the rotor rub on the stator, which damages the coils.',
    ),
    design: l(
      'Deux roulements espacés tiennent un axe mieux qu’un seul. Scellés et graissés à vie, ils conviennent à une machine laissée seule dans un local humide. L’entrefer mince ne tolère que très peu de jeu.',
      'Two bearings set apart hold an axle better than one. Sealed and greased for life, they suit a machine left alone in a damp room. The thin gap tolerates very little play.',
    ),
  },
  {
    id: 'gen-terminals',
    scene: 'generator',
    category: 'electrical',
    name: l('Boîte à bornes', 'Terminal box'),
    short: l(
      'La boîte étanche où les trois phases sortent de la machine et se raccordent au câble.',
      'The sealed box where the three phases leave the machine and join the cable.',
    ),
    description: lf(
      'La boîte à bornes, posée sur la carcasse, est l’endroit où les trois fils du bobinage sortent de la machine. Chacun finit sur une cosse repérée et serrée, avec une borne de terre pour relier la carcasse à la prise de terre ; un presse-étoupe fixe le câble qui part vers le local technique et empêche l’eau d’entrer. Ce qui sort n’est pas du continu : ce sont trois phases d’alternatif, d’environ {genLineV} V entre deux phases (dérivé) et {genPhaseA} A par phase (dérivé) au point de calcul ; c’est le redresseur du local technique qui en fera du continu. Sans charge, la tension redressée monterait à {freeRunVolts} V (résultat du modèle). Et comme les aimants permanents ne s’éteignent pas, ces bornes sont sous tension dès que l’arbre tourne, même à la main. La vidéo dit seulement que la génératrice était raccordée avant que la charge ne le soit.',
      'The terminal box, set on the frame, is where the three wires of the winding leave the machine. Each ends on a marked, tightened lug, with an earth terminal to bond the frame to the earthing; a cable gland fixes the cable that leaves for the powerhouse and keeps the water out. What leaves is not direct current: it is three phases of alternating current, about {genLineV} V between two phases (derived) and {genPhaseA} A per phase (derived) at the design point; the rectifier in the powerhouse will turn it into direct current. With no load, the rectified voltage would climb to {freeRunVolts} V (model result). And as permanent magnets cannot be switched off, these terminals are live as soon as the shaft turns, even by hand. The video says only that the generator was connected before the load was.',
    ),
    material: l(
      'Boîte d’aluminium ou de plastique, joint, presse-étoupe, cosses de cuivre',
      'Aluminium or plastic box, gasket, cable gland, copper lugs',
    ),
    specs: [
      sp('Sorties', 'Outputs', l('trois phases et une borne de terre', 'three phases and an earth terminal')),
      sp(
        'Tension entre deux phases',
        'Voltage between two phases',
        tf('derived', '{genLineV} V au point de calcul', '{genLineV} V at the design point'),
      ),
      sp(
        'Courant par phase',
        'Current per phase',
        tf('derived', '{genPhaseA} A au point de calcul', '{genPhaseA} A at the design point'),
      ),
      sp(
        'Sans charge',
        'With no load',
        tf('model', '{freeRunVolts} V redressés, vis emballée', '{freeRunVolts} V rectified, screw racing'),
      ),
    ],
    maintenance: maint(
      {
        failure:
          'Une cosse mal serrée chauffe, noircit et finit par brûler ; l’eau et la condensation corrodent les bornes ; le câble, tiré par les vibrations, arrache la connexion ; le joint se fige et laisse entrer l’humidité.',
        check:
          'Machine arrêtée, vanne verrouillée, câble débranché ou isolé en bout : regardez les cosses (couleur, odeur de brûlé), tirez légèrement sur chaque fil, cherchez des traces d’eau dans la boîte.',
        care: 'Resserrez les cosses, refaites le joint du couvercle, remplacez un presse-étoupe fendu, laissez au câble une boucle d’égouttage avant la boîte pour que l’eau tombe au sol au lieu d’entrer, et refermez toujours la boîte avant la remise en marche.',
      },
      {
        failure:
          'A loose lug heats up, blackens and ends by burning; water and condensation corrode the terminals; the cable, tugged by vibration, tears the connection out; the gasket sets hard and lets damp in.',
        check:
          'With the machine stopped, the gate locked and the cable disconnected or insulated at its end, look at the lugs (colour, smell of burning), tug lightly on each wire, look for traces of water in the box.',
        care: 'Retighten the lugs, redo the lid’s gasket, replace a cracked cable gland, leave the cable a drip loop before the box so that water falls to the ground instead of going in, and always close the box before restarting.',
      },
    ),
    tip: l(
      'Tant que l’arbre peut tourner, même à la main ou sous l’eau qui passe, les bornes peuvent être sous tension : vanne verrouillée et arbre immobile avant d’y toucher.',
      'As long as the shaft can turn, even by hand or under the water going through, the terminals can be live: gate locked and shaft still before touching them.',
    ),
    video: ['14:31'],
    design: l(
      'Une boîte à bornes sépare le branchement de la machine : on travaille dans un espace propre et étanche, loin des bobinages qui chauffent et qui vibrent. Le câble qui en part est la seule liaison avec le reste du site.',
      'A terminal box separates the connection from the machine: you work in a clean, sealed space, away from the windings that heat up and vibrate. The cable leaving it is the only link with the rest of the site.',
    ),
  },
];
