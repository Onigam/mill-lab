// Parts of the `screw` world, third part (ids frozen in src/part-ids.ts): the generator at the end of the belt. The rectifier, the charge
// controller and the battery used to be drawn beside it; since completion wave A they stand in the powerhouse (`powerroom` world, see
// ./powerroom.ts), and the generator itself can be opened in section (`generator` world, see ./generator.ts). On the `site`, the powerhouse is
// ONE part that houses them all.
//
// What the video gives: a generator of the kind used on wind turbines, bought rather than made (industrial means are mostly abroad), chosen
// to turn relatively slowly so that the transmission stays simple; a belt-and-pulley system between the screw and it; an electrical load
// that has to be connected before much water is let in, because without a load the screw races; and the point that a continuous production
// is gentle on batteries. What it does NOT give: the model, the power, the winding, the battery, the electronics.
// Those come from src/sim/mech.ts (docs/physics.md §1.8): a permanent-magnet three-phase generator, a diode bridge, an ideal 48 V battery,
// the generator wound for the machine that was sized; its efficiency (89 %) is a RESULT of that choice; the controller, the dump load and
// the inverter are not simulated. Conventions: see ./site.ts.
import type { PartInfo } from '@onigam/lab-kit/content';
import { l } from '@onigam/lab-kit/i18n';
import { lf, maint, sp, tf } from '../part-helpers';

export const ELECTRIC_PARTS: PartInfo[] = [
  {
    id: 'generator',
    scene: 'screw',
    category: 'electrical',
    name: l('Génératrice', 'Generator'),
    short: l(
      'Génératrice à aimants permanents, lente : elle transforme la rotation en électricité pour la batterie.',
      'Slow permanent-magnet generator: it turns the rotation into electricity for the battery.',
    ),
    description: lf(
      'La génératrice transforme la rotation en électricité. La vidéo la décrit : le modèle que l’on emploie sur les éoliennes, acheté plutôt que fait sur place, choisi lent pour simplifier la transmission. Le labo la dessine à aimants permanents, en triphasé, sur une batterie de {busVolts} V (hypothèse) : sa tension à vide est proportionnelle à sa vitesse, son couple proportionnel au courant. Elle ne charge qu’à partir de {cutInRpm} tr/min, quand sa tension dépasse celle de la batterie (résultat du modèle) ; au-dessus, le courant monte vite et la freine, ce qui fixe la vitesse de la vis. Au point de calcul : {voc} V à vide, {current} A, et {etaGen} % de rendement, qui est un résultat de la façon dont elle est bobinée (résultat du modèle). Ouvrez-la pour la voir en coupe : stator, bobines, rotor et aimants.',
      'The generator turns the rotation into electricity. The video describes it: the kind used on wind turbines, bought rather than made on the spot, chosen slow to keep the transmission simple. The lab draws it as a permanent-magnet, three-phase machine, on a {busVolts} V battery (assumption): its open-circuit voltage is proportional to its speed, its torque proportional to the current. It charges only from {cutInRpm} rpm, when its voltage exceeds the battery’s (model result); above that, the current rises fast and brakes it, which fixes the speed of the screw. At the design point: {voc} V open-circuit, {current} A, and {etaGen}% efficiency, which is a result of how it is wound (model result). Open it to see it in section: stator, coils, rotor and magnets.',
    ),
    material: l(
      'Aimants permanents, bobinages de cuivre, carcasse d’acier ou d’aluminium',
      'Permanent magnets, copper windings, steel or aluminium casing',
    ),
    specs: [
      sp(
        'Type',
        'Type',
        l(
          'à aimants permanents, triphasée, lente (vidéo : comme sur les éoliennes)',
          'permanent-magnet, three-phase, slow (video: like those of wind turbines)',
        ),
      ),
      sp(
        'Vitesse nominale',
        'Rated speed',
        tf(
          'assumed',
          '{genRpm} tr/min ; la vidéo dit « plusieurs centaines »',
          '{genRpm} rpm; the video says “several hundred”',
        ),
      ),
      sp(
        'Début de charge',
        'Charging starts',
        tf(
          'model',
          '{cutInRpm} tr/min, soit {cutInScrewRpm} tr/min à la vis',
          '{cutInRpm} rpm, that is {cutInScrewRpm} rpm at the screw',
        ),
      ),
      sp(
        'Au point de calcul',
        'At the design point',
        tf(
          'model',
          '{voc} V à vide, {current} A, {torqueGen} N·m',
          '{voc} V open-circuit, {current} A, {torqueGen} N·m',
        ),
      ),
      sp(
        'Rendement nominal',
        'Rated efficiency',
        tf(
          'model',
          '{etaGen} %, soit {lossGenW} W de pertes (cuivre {copperLossW} W, diodes {diodeLossW} W)',
          '{etaGen}%, that is {lossGenW} W of losses (copper {copperLossW} W, diodes {diodeLossW} W)',
        ),
      ),
      sp(
        'Puissance sur l’arbre de la génératrice',
        'Power on the generator’s shaft',
        tf('model', '{genShaftKw} kW, après la chaîne et la courroie', '{genShaftKw} kW, after the chain and the belt'),
      ),
      sp(
        'Tension à vide nominale',
        'Rated open-circuit voltage',
        tf(
          'assumed',
          '{headroom} % au-dessus de celle de la batterie (choix de bobinage)',
          '{headroom}% above the battery’s (a choice of winding)',
        ),
      ),
      sp(
        'Sans batterie',
        'With no battery',
        tf(
          'model',
          'vis à {freeRunRpm} tr/min, génératrice à {freeRunGenRpm} tr/min, {freeRunVolts} V à vide',
          'screw at {freeRunRpm} rpm, generator at {freeRunGenRpm} rpm, {freeRunVolts} V open-circuit',
        ),
      ),
    ],
    maintenance: maint(
      {
        failure:
          'Roulements fatigués, bobinage qui chauffe et dont l’isolant vieillit, humidité dans le boîtier, aimants affaiblis par la chaleur, câbles de sortie arrachés par les vibrations, poulie qui prend du jeu sur l’arbre.',
        check:
          'Arrêt complet, vanne verrouillée : mesurez l’isolement des bobinages au multimètre ou au contrôleur d’isolement, tournez l’arbre à la main (pas de point dur), regardez la poulie et les fixations. En marche, écoutez, sans toucher.',
        care: 'Tenez-la au sec et ventilée, hors des crues, graissez selon la notice, vérifiez serrage et alignement des poulies, et resserrez les cosses.',
      },
      {
        failure:
          'Tired bearings, a winding that heats up and whose insulation ages, damp in the casing, magnets weakened by heat, output cables torn by vibration, a pulley that gets play on the shaft.',
        check:
          'At a full stop with the gate locked: measure the winding insulation with a multimeter or an insulation tester, turn the shaft by hand (no tight spot), look at the pulley and the fixings. Running, listen, without touching.',
        care: 'Keep it dry and ventilated, above flood level, grease following the manual, check tightness and alignment of the pulleys, and retighten the lugs.',
      },
    ),
    tip: lf(
      'Ne débranchez jamais la batterie quand la vis tourne : sans charge, la vis s’emballe (jusqu’à {freeRunRpm} tr/min) et la tension à vide de la génératrice monte vers {freeRunVolts} V, bien au-dessus de celle de la batterie (résultat du modèle). Fermez d’abord la vanne.',
      'Never disconnect the battery while the screw turns: with no load, the screw races (up to {freeRunRpm} rpm) and the generator’s open-circuit voltage climbs towards {freeRunVolts} V, far above the battery’s (model result). Shut the gate first.',
    ),
    video: ['35:43', '36:33'],
    design: l(
      'Le choix est un compromis, dit la vidéo : une génératrice lente simplifie les transmissions mais est plus volumineuse ; une rapide est plus petite mais ajoute des pertes et de la mécanique. En choisir une qui n’est pas adaptée coûte de l’énergie à chaque instant.',
      'The choice is a compromise, says the video: a slow generator simplifies the transmissions but is bulkier; a fast one is smaller but adds losses and mechanics. Choosing one that is not suitable costs energy at every moment.',
    ),
  },
];
