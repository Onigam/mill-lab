// Parts of the `screw` world, third part (ids frozen in src/part-ids.ts): the generator and its electronics, drawn beside it, and the
// battery. On the `site`, the powerhouse is ONE part that houses the rectifier, the charge controller, the battery and an inverter.
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
      'La génératrice transforme la rotation en électricité. La vidéo la décrit : le modèle que l’on emploie sur les éoliennes, acheté plutôt que fait sur place, choisi lent pour simplifier la transmission. Le labo la dessine à aimants permanents, en triphasé, sur une batterie de {busVolts} V (hypothèse) : sa tension à vide est proportionnelle à sa vitesse, son couple proportionnel au courant. Elle ne charge qu’à partir de {cutInRpm} tr/min, quand sa tension dépasse celle de la batterie (résultat du modèle) ; au-dessus, le courant monte vite et la freine, ce qui fixe la vitesse de la vis. Au point de calcul : {voc} V à vide, {current} A, et {etaGen} % de rendement, qui est un résultat de la façon dont elle est bobinée (résultat du modèle).',
      'The generator turns the rotation into electricity. The video describes it: the kind used on wind turbines, bought rather than made on the spot, chosen slow to keep the transmission simple. The lab draws it as a permanent-magnet, three-phase machine, on a {busVolts} V battery (assumption): its open-circuit voltage is proportional to its speed, its torque proportional to the current. It charges only from {cutInRpm} rpm, when its voltage exceeds the battery’s (model result); above that, the current rises fast and brakes it, which fixes the speed of the screw. At the design point: {voc} V open-circuit, {current} A, and {etaGen}% efficiency, which is a result of how it is wound (model result).',
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
  {
    id: 'rectifier',
    scene: 'screw',
    category: 'electrical',
    name: l('Redresseur', 'Rectifier'),
    short: l(
      'Six diodes qui changent le courant alternatif triphasé en courant continu.',
      'Six diodes that turn three-phase alternating current into direct current.',
    ),
    description: lf(
      'La génératrice produit du courant alternatif à trois phases, dont le sens change sans cesse. Une batterie veut du courant continu. Le redresseur est un pont de six diodes, des clapets électriques qui ne laissent passer le courant que dans un sens : il garde à chaque instant la plus haute des tensions entre deux phases, et la tension continue obtenue vaut {rectFactor} fois la tension entre phases (dérivé). Deux diodes sont en série à chaque instant, et le modèle compte {diodeDrop} V de chute au total (hypothèse) : au point de calcul, {diodeLossW} W s’y perdent en chaleur (résultat du modèle).',
      'The generator produces three-phase alternating current, whose direction keeps changing. A battery wants direct current. The rectifier is a bridge of six diodes, electrical one-way valves that let current through in one direction only: at every instant it keeps the highest of the voltages between two phases, and the direct voltage obtained is {rectFactor} times the voltage between phases (derived). Two diodes are in series at any instant, and the model counts {diodeDrop} V of drop in total (assumption): at the design point, {diodeLossW} W are lost there as heat (model result).',
    ),
    material: l('Silicium, sur un dissipateur d’aluminium', 'Silicon, on an aluminium heat sink'),
    specs: [
      sp('Type', 'Type', l('pont de six diodes, triphasé', 'six-diode bridge, three-phase')),
      sp(
        'Tension continue obtenue',
        'Direct voltage obtained',
        tf('derived', '{rectFactor} × la tension entre phases', '{rectFactor} × the voltage between phases'),
      ),
      sp(
        'Chute de tension',
        'Voltage drop',
        tf('assumed', '{diodeDrop} V (deux diodes en série)', '{diodeDrop} V (two diodes in series)'),
      ),
      sp(
        'Chaleur au point de calcul',
        'Heat at the design point',
        tf('model', '{diodeLossW} W pour {current} A', '{diodeLossW} W for {current} A'),
      ),
    ],
    maintenance: maint(
      {
        failure:
          'Une diode claque, en court-circuit (la batterie se décharge dans la génératrice) ou coupée (la tension chute) ; le dissipateur encrassé fait surchauffer le pont.',
        check:
          'Batterie débranchée, vanne verrouillée, essayez chaque diode au multimètre : elle ne conduit que dans un sens. Après une marche, approchez la main du dissipateur sans le saisir : il est chaud, pas brûlant.',
        care: 'Gardez le dissipateur propre et ventilé, serrez les bornes, et ne l’enfermez pas dans une boîte étanche.',
      },
      {
        failure:
          'A diode fails, shorted (the battery discharges into the generator) or open (the voltage drops); a dirty heat sink makes the bridge overheat.',
        check:
          'With the battery disconnected and the gate locked, test each diode with a multimeter: it conducts in one direction only. After a run, bring a hand near the heat sink without gripping it: it is warm, not scalding.',
        care: 'Keep the heat sink clean and ventilated, tighten the terminals, and do not shut it in a sealed box.',
      },
    ),
    tip: l(
      'Un redresseur chauffe : cette chaleur est de l’énergie perdue, mais aussi de la chaleur à évacuer. Ne le noyez pas dans une boîte étanche.',
      'A rectifier heats up: that heat is lost energy, but also heat to be removed. Do not bury it in a sealed box.',
    ),
    design: l(
      'Redresser coûte peu : une chute de tension fixe, quelle que soit la vitesse. C’est ce qui rend la génératrice peu sensible à la vitesse, tant que sa tension dépasse celle de la batterie.',
      'Rectifying costs little: a fixed voltage drop, whatever the speed. That is what makes the generator insensitive to speed, as long as its voltage exceeds the battery’s.',
    ),
  },
  {
    id: 'charge-controller',
    scene: 'screw',
    category: 'electrical',
    name: l('Régulateur de charge', 'Charge controller'),
    short: l(
      'Il protège la batterie : quand elle est pleine, il détourne le courant vers une charge de délestage.',
      'It protects the battery: when it is full, it diverts the current to a dump load.',
    ),
    description: lf(
      'Une batterie pleine n’accepte plus de courant, mais l’eau continue de couler et la vis de tourner. Si l’on débranche brutalement la génératrice, la vis n’est plus freinée : le modèle trouve alors environ {freeRunRpm} tr/min, soit {freeRunFactor} fois la vitesse normale (résultat du modèle). Le régulateur règle ce que reçoit la batterie et détourne le surplus vers une charge de délestage, une résistance qui chauffe (à l’air ou dans l’eau), pour que la génératrice garde toujours un frein. La vidéo le dit autrement : dès qu’on a une charge électrique, on peut freiner la turbine ; sans elle, ouvrir la vanne fait partir la vis. Le labo ne simule pas le régulateur : la batterie y est idéale, à {busVolts} V (hypothèse).',
      'A full battery accepts no more current, but the water keeps flowing and the screw keeps turning. If the generator is abruptly disconnected, the screw is no longer braked: the model then finds about {freeRunRpm} rpm, that is {freeRunFactor} times the normal speed (model result). The controller manages what the battery receives and diverts the surplus to a dump load, a resistor that heats up (in air or in water), so that the generator always has a brake. The video puts it another way: once there is an electrical load, the turbine can be braked; without it, opening the gate sends the screw racing. The lab does not simulate the controller: the battery there is ideal, at {busVolts} V (assumption).',
    ),
    material: l(
      'Électronique de puissance, boîtier ventilé ; charge de délestage résistive',
      'Power electronics, ventilated box; resistive dump load',
    ),
    specs: [
      sp(
        'Rôle',
        'Role',
        l(
          'limiter la charge et détourner le surplus vers le délestage',
          'limit the charge and divert the surplus to the dump load',
        ),
      ),
      sp(
        'Sans aucune charge',
        'With no load at all',
        tf(
          'model',
          'vis à {freeRunRpm} tr/min, {freeRunFactor} fois la normale',
          'screw at {freeRunRpm} rpm, {freeRunFactor} times normal',
        ),
      ),
      sp(
        'Courant à supporter',
        'Current to carry',
        tf('model', 'plus que les {current} A du point de calcul', 'more than the {current} A of the design point'),
      ),
      sp('Dans le modèle', 'In the model', l('non simulé : batterie idéale', 'not simulated: ideal battery')),
    ],
    maintenance: maint(
      {
        failure:
          'Le régulateur se bloque ou tombe en panne, la charge de délestage est coupée ou noyée de poussière : la vis n’est plus freinée quand la batterie est pleine ; une sonde déréglée charge trop ou pas assez ; une connexion chauffe.',
        check:
          'Une fois l’an, simulez une batterie pleine : la charge de délestage doit chauffer et la vis ne doit pas s’emballer. Contrôlez que la vanne de sécurité se ferme aussi.',
        care: 'Nettoyez, resserrez les bornes, tenez la charge de délestage ventilée et hors de portée des mains.',
      },
      {
        failure:
          'The controller locks up or fails, the dump load is disconnected or choked with dust: the screw is no longer braked when the battery is full; a misset sensor charges too much or too little; a connection heats up.',
        check:
          'Once a year, simulate a full battery: the dump load should heat up and the screw should not race. Check that the safety gate shuts too.',
        care: 'Clean, retighten the terminals, keep the dump load ventilated and out of reach of hands.',
      },
    ),
    tip: l(
      'Ne comptez jamais sur le régulateur seul : la vanne de sécurité, qui coupe l’eau, est la seconde protection contre l’emballement. Deux valent mieux qu’une.',
      'Never rely on the controller alone: the safety gate, which cuts the water, is the second protection against racing. Two beat one.',
    ),
    video: ['14:29', '14:41'],
    design: l(
      'Le régulateur et la vanne protègent de deux façons : l’un en gardant toujours un frein électrique, l’autre en coupant l’eau. La vidéo a les deux.',
      'The controller and the gate protect in two ways: one by always keeping an electrical brake, the other by cutting the water. The video has both.',
    ),
  },
  {
    id: 'battery',
    scene: 'screw',
    category: 'electrical',
    name: l('Batterie', 'Battery'),
    short: l(
      'Elle garde l’énergie quand la vis s’arrête : un réservoir à basse tension, mais à courant fort.',
      'It keeps the energy when the screw stops: a low-voltage reservoir with a heavy current.',
    ),
    description: lf(
      'La batterie reçoit le courant du redresseur et le rend à la maison la nuit, en basses eaux, quand on veut. La vis tourne presque sans arrêt tout l’hiver : la batterie n’a que des charges douces, sans grands à-coups, et ménage ainsi sa durée de vie, dit la vidéo. Le modèle la prend idéale, à {busVolts} V (hypothèse), et lui envoie {elecKw} kW, soit {current} A, au point de calcul (résultat du modèle) ; sa capacité n’est pas modélisée. C’est le composant le plus dangereux du site : de l’énergie stockée, des courts-circuits qui débitent des centaines d’ampères, de l’hydrogène pour une batterie au plomb, un feu difficile à éteindre pour un lithium.',
      'The battery receives the current from the rectifier and gives it back to the house at night, in low water, when you like. The screw turns almost without stopping all winter: the battery gets only gentle charges, without big jolts, and so spares its life, says the video. The model takes it as ideal, at {busVolts} V (assumption), and sends it {elecKw} kW, that is {current} A, at the design point (model result); its capacity is not modelled. It is the most dangerous component of the site: stored energy, short circuits that deliver hundreds of amps, hydrogen for a lead-acid battery, a fire that is hard to put out for a lithium one.',
    ),
    material: l('Plomb ou lithium : aucune source ne choisit', 'Lead-acid or lithium: no source chooses'),
    specs: [
      sp('Tension', 'Voltage', tf('assumed', '{busVolts} V', '{busVolts} V')),
      sp(
        'Reçoit, point de calcul',
        'Receives, design point',
        tf('model', '{elecKw} kW, {current} A', '{elecKw} kW, {current} A'),
      ),
      sp(
        'Capacité',
        'Capacity',
        l('non modélisée : le modèle prend une batterie idéale', 'not modelled: the model takes an ideal battery'),
      ),
      sp(
        'Chimie',
        'Chemistry',
        l(
          'plomb ou lithium : à choisir selon l’usage et la sécurité',
          'lead-acid or lithium: to be chosen for the use and for safety',
        ),
      ),
      sp('Danger principal', 'Main hazard', l('court-circuit, gaz et feu', 'short circuit, gas and fire')),
    ],
    maintenance: maint(
      {
        failure:
          'Sulfatation (plomb), déséquilibre entre éléments, surcharge ou décharge profonde, gonflement, bornes oxydées, ventilation insuffisante (l’hydrogène s’accumule en haut).',
        check:
          'Mesurez la tension au repos et en charge, regardez les bornes (propres), l’odeur, le gonflement du boîtier, la température après une longue charge.',
        care: 'Aérez le local, placez un fusible au plus près de la batterie, utilisez des outils isolés, ne posez aucun objet métallique sur les bornes, et faites contrôler l’ensemble par un professionnel.',
      },
      {
        failure:
          'Sulphation (lead-acid), imbalance between cells, overcharge or deep discharge, swelling, oxidised terminals, insufficient ventilation (hydrogen collects at the top).',
        check:
          'Measure the voltage at rest and while charging, look at the terminals (clean), the smell, the swelling of the case, the temperature after a long charge.',
        care: 'Ventilate the room, put a fuse as close to the battery as possible, use insulated tools, place no metal object on the terminals, and have the whole thing checked by a professional.',
      },
    ),
    tip: l(
      'Ne court-circuitez jamais une batterie, même une seconde, avec un outil ou une chaîne de bijou : ses bornes brûlent et projettent du métal fondu. Pas de flamme ni d’étincelle à côté.',
      'Never short-circuit a battery, even for a second, with a tool or a piece of jewellery: its terminals burn and spit molten metal. No flame or spark nearby.',
    ),
    video: ['22:21'],
    design: l(
      'Une production continue ménage la batterie : charge douce, décharge douce. C’est un autre atout du petit débit qui coule tout l’hiver, face à une production par à-coups.',
      'A continuous production spares the battery: gentle charge, gentle discharge. It is another asset of the small flow that runs all winter, compared with a jerky production.',
    ),
  },
];
