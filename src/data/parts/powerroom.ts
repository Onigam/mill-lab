// Parts of the `powerroom` world (ids frozen in src/part-ids.ts, 10 of them): the wall of the little powerhouse, where the current of the
// generator goes through protection, rectification, regulation, storage and use. `rectifier`, `charge-controller` and `battery` used to be drawn
// beside the generator in the `screw` world; they stand here now, and their sheets say so.
//
// What the sources say: almost nothing of this room. The video mentions the electrical protections in one sentence (28:22), the electrical
// load that brakes the turbine and the generator connected before it (14:29 to 14:53), the batteries that a continuous production spares (22:21)
// and the low-consumption server that the production feeds (49:37 to 50:03); it never shows a cabinet. Everything else is the lab's reading of a
// small off-grid 48 V plant, and its numbers are ESTIMATES, tagged on the sheets: the ratings (breaker 63 A, fuse 80 A, inverter 3 kW), the
// cable sections (25 mm² for the battery, 16 mm² for the bonding), the sizes (read from src/three/dims.ts). The MODEL RESULTS come from src/sim:
// 2.2 kW and 46 A into an ideal 48 V battery at the design point, 53.7 V rectified at the open terminals of the generator, 176 V when the
// screw races with no load, 9,800 kWh in the drawn year. Nothing downstream of the battery is simulated: the DUMP LOAD (the model has none:
// its battery takes any current), the charge controller, the inverter, the meter and the protections are not in the model, and their sheets
// say so. No brand, no product, no wiring plan: each sheet says what the device is FOR. Conventions: see ./site.ts.
//
// The wall is drawn in the order the current meets the devices. A real board places its protections on both sides of the rectifier (a switch on
// the alternating side, a breaker and fuses on the direct side), so the sheets of the two protections say that the lab shows them at the head of
// the wall to be found first, and that the exact place of each is an electrician's choice.
import type { PartInfo } from '@onigam/lab-kit/content';
import { l } from '@onigam/lab-kit/i18n';
import { lf, maint, sp, tf } from '../part-helpers';

export const POWERROOM_PARTS: PartInfo[] = [
  {
    id: 'dc-breaker',
    scene: 'powerroom',
    category: 'electrical',
    name: l('Disjoncteur continu', 'DC breaker'),
    short: l(
      'Le gros interrupteur du local : on l’ouvre pour isoler et travailler, il s’ouvre seul sur une surcharge.',
      'The room’s big switch: you open it to isolate and work, and it opens by itself on an overload.',
    ),
    description: lf(
      'Le disjoncteur continu est le gros interrupteur du local : on l’ouvre à la main pour isoler le reste de l’installation avant d’y travailler, et il s’ouvre tout seul quand le courant dépasse ce que le câble supporte. Il est fait pour le courant continu, et cela change tout : en alternatif, le courant repasse par zéro des dizaines de fois par seconde et l’arc d’une coupure s’éteint de lui-même ; en continu, l’arc ne s’éteint pas, et le disjoncteur doit l’étirer et le souffler. Sa tension nominale doit dépasser la plus haute que le circuit puisse voir, et pas seulement celle de la batterie : {freeRunVolts} V à vide, la vis emballée (résultat du modèle). Le labo en choisit un de {breakerA} A (estimation), au-dessus des {current} A de service (résultat du modèle). Le labo le dessine en tête du mur, avant le redresseur, pour qu’on le trouve d’abord ; dans une installation réelle, un disjoncteur pour le continu se place du côté continu, après le redresseur, et la liaison alternative de la génératrice a son propre sectionneur : la place de chaque protection est le choix d’un électricien.',
      'The DC breaker is the room’s big switch: you open it by hand to isolate the rest of the installation before working on it, and it opens by itself when the current exceeds what the cable can carry. It is built for direct current, and that changes everything: with alternating current, the current passes through zero dozens of times a second and the arc of a break goes out by itself; with direct current, the arc does not go out, and the breaker has to stretch it and blow it out. Its rated voltage must exceed the highest the circuit can see, not only the battery’s: {freeRunVolts} V open-circuit, with the screw racing (model result). The lab picks one of {breakerA} A (estimate), above the {current} A of service (model result). The lab draws it at the head of the wall, before the rectifier, so that it is found first; in a real installation, a breaker for direct current goes on the direct side, after the rectifier, and the generator’s alternating link has its own isolator: the place of each protection is an electrician’s choice.',
    ),
    material: l(
      'Boîtier isolant, contacts métalliques, chambre d’extinction de l’arc',
      'Insulating case, metal contacts, arc-quenching chamber',
    ),
    specs: [
      sp(
        'Rôle',
        'Role',
        l('isoler à la main, couper seul sur une surcharge', 'isolate by hand, cut by itself on an overload'),
      ),
      sp(
        'Calibre',
        'Rating',
        lf(
          '{breakerA} A (estimation), pour {current} A de service (résultat du modèle)',
          '{breakerA} A (estimate), for {current} A of service (model result)',
        ),
      ),
      sp(
        'Tension à tenir',
        'Voltage to withstand',
        tf(
          'model',
          'plus que {freeRunVolts} V (vis emballée, sans charge)',
          'more than {freeRunVolts} V (screw racing, no load)',
        ),
      ),
      sp('Pôles', 'Poles', l('deux, le plus et le moins', 'two, the plus and the minus')),
      sp(
        'Type',
        'Type',
        l('magnéto-thermique, prévu pour le courant continu', 'thermal-magnetic, built for direct current'),
      ),
    ],
    maintenance: maint(
      {
        failure:
          'Des contacts qui brûlent ou se soudent après une grosse coupure, un mécanisme qui se grippe faute de manœuvres, une borne desserrée qui chauffe et fait déclencher à tort.',
        check:
          'Isolé et verrouillé en amont : manœuvrez-le plusieurs fois, il doit claquer net, sans dureté. Regardez les bornes : aucune couleur de brûlé. Après un déclenchement, cherchez la cause avant de le refermer.',
        care: 'Manœuvrez-le de temps en temps pour garder les contacts propres, resserrez les bornes, marquez « ouvert » et « fermé », et remplacez-le après une grosse coupure, comme l’indique son fabricant.',
      },
      {
        failure:
          'Contacts that burn or weld after a big break, a mechanism that seizes for lack of operation, a loose terminal that heats and trips it wrongly.',
        check:
          'Isolated and locked upstream: operate it several times, it should snap cleanly, with no stiffness. Look at the terminals: no burnt colour. After a trip, find the cause before closing it again.',
        care: 'Operate it now and then to keep the contacts clean, retighten the terminals, mark “open” and “closed”, and replace it after a big break, as its maker advises.',
      },
    ),
    tip: l(
      'Un disjoncteur qui a déclenché n’est pas un bouton de remise en marche : cherchez pourquoi avant de le refermer. Et mettez un cadenas et une étiquette sur celui que vous avez ouvert pour travailler.',
      'A breaker that has tripped is not a restart button: find out why before closing it again. And put a padlock and a tag on the one you opened to work.',
    ),
    video: ['28:22'],
    design: l(
      'Fusibles et disjoncteur se complètent : le disjoncteur se manœuvre à la main et se remet en service, le fusible, plus rapide, est le dernier rempart contre un court-circuit. Aucun des deux ne remplace l’autre.',
      'Fuses and breaker complement each other: the breaker is operated by hand and can be reset, the fuse, faster, is the last rampart against a short circuit. Neither replaces the other.',
    ),
  },
  {
    id: 'fuse-box',
    scene: 'powerroom',
    category: 'electrical',
    name: l('Boîte à fusibles', 'Fuse box'),
    short: l(
      'Un fusible par branche, au plus près de la batterie : il fond en une fraction de seconde sur un court-circuit.',
      'One fuse per branch, as close as possible to the battery: it melts in a fraction of a second on a short circuit.',
    ),
    description: lf(
      'Un fusible est un fil calibré qui fond quand le courant dépasse sa limite : simple, sans pièce mobile, et très rapide. Il est indispensable parce qu’une batterie peut débiter des centaines d’ampères, voire plus, en cas de court-circuit, bien plus que ce qu’un disjoncteur sait couper, et qu’un câble en surcharge chauffe jusqu’à brûler son isolant. Le fusible protège donc le câble, pas l’appareil : le labo en choisit un de {fuseA} A (estimation), au-dessus du disjoncteur et des {current} A de service (résultat du modèle), et en dessous de ce que supporte le câble de {batCableMm2} mm² (estimation). On en met un par branche (batterie, onduleur, charge de délestage), le premier au plus près de la borne de la batterie : le labo groupe les fusibles en tête du mur pour qu’on les trouve, mais en vrai celui de la batterie se place tout contre elle. Un fusible pour courant continu doit couper de grosses intensités sans arc persistant, et avoir lui aussi une tension nominale assez haute.',
      'A fuse is a calibrated wire that melts when the current exceeds its limit: simple, with no moving part, and very fast. It is essential because a battery can deliver hundreds of amps, or more, in a short circuit, far more than a breaker can cut, and an overloaded cable heats until its insulation burns. The fuse therefore protects the cable, not the device: the lab picks one of {fuseA} A (estimate), above the breaker and the {current} A of service (model result), and below what the {batCableMm2} mm² cable (estimate) carries. There is one per branch (battery, inverter, dump load), the first as close as possible to the battery terminal: the lab groups the fuses at the head of the wall so that they are found, but in reality the battery’s sits right against it. A fuse for direct current must cut heavy currents without a lasting arc, and its rated voltage too must be high enough.',
    ),
    material: l(
      'Élément fusible calibré dans un corps en céramique, porte-fusible',
      'Calibrated fusible element in a ceramic body, fuse holder',
    ),
    specs: [
      sp('Rôle', 'Role', l('protéger le câble d’un court-circuit', 'protect the cable from a short circuit')),
      sp(
        'Calibre du fusible de la batterie',
        'Rating of the battery fuse',
        lf(
          '{fuseA} A (estimation), contre {current} A de service (résultat du modèle)',
          '{fuseA} A (estimate), against {current} A of service (model result)',
        ),
      ),
      sp(
        'Section du câble de la batterie',
        'Section of the battery cable',
        tf('estimate', '{batCableMm2} mm²', '{batCableMm2} mm²'),
      ),
      sp(
        'Place',
        'Place',
        l('au plus près de la borne de la batterie', 'as close as possible to the battery terminal'),
      ),
      sp(
        'Un par branche',
        'One per branch',
        l('batterie, onduleur, charge de délestage', 'battery, inverter, dump load'),
      ),
    ],
    maintenance: maint(
      {
        failure:
          'Un porte-fusible mal serré chauffe et brûle, un fusible vieilli fond sans raison, un fusible trop faible saute à chaque pointe, un calibre trop fort ne protège plus le câble.',
        check:
          'Isolé et ouvert, fusible retiré : les contacts du porte-fusible doivent être brillants, sans trace de chaleur ; vérifiez la continuité du fusible au multimètre, et que le calibre inscrit est le bon.',
        care: 'Gardez des fusibles de rechange identiques, rangés à côté et étiquetés ; resserrez les porte-fusibles ; ne « réparez » jamais un fusible.',
      },
      {
        failure:
          'A fuse holder that is not tight heats up and burns, an aged fuse blows for no reason, a fuse that is too small blows at every peak, a rating that is too large no longer protects the cable.',
        check:
          'Isolated and open, fuse removed: the fuse holder’s contacts should be bright, with no sign of heat; check the fuse’s continuity with a multimeter, and that the printed rating is the right one.',
        care: 'Keep identical spare fuses, stored alongside and labelled; retighten the fuse holders; never “repair” a fuse.',
      },
    ),
    tip: l(
      'Ne remplacez jamais un fusible fondu par un plus gros, ni par un fil ou une pièce de métal : il protège le câble, et le câble ne protège plus rien. Un fusible fondu dit qu’il s’est passé quelque chose : cherchez quoi.',
      'Never replace a blown fuse with a bigger one, or with a wire or a piece of metal: it protects the cable, and the cable protects nothing. A blown fuse says that something happened: find out what.',
    ),
    video: ['28:22'],
    design: l(
      'Le fusible se place près de la source : un court-circuit entre la batterie et lui n’est protégé par rien, donc ce tronçon doit être le plus court possible.',
      'The fuse goes close to the source: a short circuit between the battery and it is protected by nothing, so that stretch must be as short as possible.',
    ),
  },
  {
    id: 'rectifier',
    scene: 'powerroom',
    category: 'electrical',
    name: l('Redresseur', 'Rectifier'),
    short: l(
      'Six diodes qui changent le courant alternatif triphasé en courant continu.',
      'Six diodes that turn three-phase alternating current into direct current.',
    ),
    description: lf(
      'La génératrice produit du courant alternatif à trois phases, dont le sens change sans cesse, et le câble qui part de sa boîte à bornes l’amène jusqu’ici, dans le local technique. Une batterie veut du courant continu. Le redresseur est un pont de six diodes, des clapets électriques qui ne laissent passer le courant que dans un sens : il garde à chaque instant la plus haute des tensions entre deux phases, et la tension continue obtenue vaut {rectFactor} fois la tension entre phases (dérivé). Deux diodes sont en série à chaque instant, et le modèle compte {diodeDrop} V de chute au total (hypothèse) : au point de calcul, {diodeLossW} W s’y perdent en chaleur (résultat du modèle). Ses diodes doivent résister à la tension d’une génératrice sans charge, {freeRunVolts} V (résultat du modèle), et son dissipateur doit rester à l’air libre.',
      'The generator produces three-phase alternating current, whose direction keeps changing, and the cable leaving its terminal box brings it here, into the powerhouse. A battery wants direct current. The rectifier is a bridge of six diodes, electrical one-way valves that let current through in one direction only: at every instant it keeps the highest of the voltages between two phases, and the direct voltage obtained is {rectFactor} times the voltage between phases (derived). Two diodes are in series at any instant, and the model counts {diodeDrop} V of drop in total (assumption): at the design point, {diodeLossW} W are lost there as heat (model result). Its diodes must withstand the voltage of a generator with no load, {freeRunVolts} V (model result), and its heat sink must stay in free air.',
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
      sp(
        'Tension inverse à tenir',
        'Reverse voltage to withstand',
        tf('model', 'plus que {freeRunVolts} V (sans charge)', 'more than {freeRunVolts} V (no load)'),
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
    scene: 'powerroom',
    category: 'electrical',
    name: l('Régulateur de charge', 'Charge controller'),
    short: l(
      'Il protège la batterie : quand elle est pleine, il détourne le courant vers la charge de délestage.',
      'It protects the battery: when it is full, it diverts the current to the dump load.',
    ),
    description: lf(
      'Une batterie pleine n’accepte plus de courant, mais l’eau continue de couler et la vis de tourner. Si l’on débranche brutalement la génératrice, la vis n’est plus freinée : le modèle trouve alors environ {freeRunRpm} tr/min, soit {freeRunFactor} fois la vitesse normale (résultat du modèle). Le régulateur de charge, placé entre le redresseur et la batterie, surveille la tension de celle-ci et règle ce qu’elle reçoit ; quand elle est pleine, il détourne le surplus vers la charge de délestage, la résistance voisine, pour que la génératrice garde toujours un frein. La vidéo le dit autrement : dès qu’on a une charge électrique, on peut freiner la turbine ; sans elle, ouvrir la vanne fait partir la vis. Le labo ne simule pas le régulateur : la batterie y est idéale, à {busVolts} V (hypothèse).',
      'A full battery accepts no more current, but the water keeps flowing and the screw keeps turning. If the generator is abruptly disconnected, the screw is no longer braked: the model then finds about {freeRunRpm} rpm, that is {freeRunFactor} times the normal speed (model result). The charge controller, placed between the rectifier and the battery, watches the battery’s voltage and manages what it receives; when it is full, it diverts the surplus to the dump load, the resistor next to it, so that the generator always has a brake. The video puts it another way: once there is an electrical load, the turbine can be braked; without it, opening the gate sends the screw racing. The lab does not simulate the controller: the battery there is ideal, at {busVolts} V (assumption).',
    ),
    material: l('Électronique de puissance dans un boîtier ventilé', 'Power electronics in a ventilated case'),
    specs: [
      sp(
        'Rôle',
        'Role',
        l(
          'limiter la charge et détourner le surplus vers la charge de délestage',
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
    scene: 'powerroom',
    category: 'electrical',
    name: l('Batterie', 'Battery'),
    short: l(
      'Elle garde l’énergie quand la vis s’arrête : un réservoir à basse tension, mais à courant fort.',
      'It keeps the energy when the screw stops: a low-voltage reservoir with a heavy current.',
    ),
    description: lf(
      'La batterie reçoit le courant du régulateur et le rend à la maison la nuit, en basses eaux, quand on veut. La vis tourne presque sans arrêt tout l’hiver : la batterie n’a que des charges douces, sans grands à-coups, et ménage ainsi sa durée de vie, dit la vidéo. Le modèle la prend idéale, à {busVolts} V (hypothèse), et lui envoie {elecKw} kW, soit {current} A, au point de calcul (résultat du modèle) ; sa capacité n’est pas modélisée. Dans le local, elle repose sur une étagère solide et ventilée, loin de l’eau, fusible au plus près de sa borne. C’est le composant le plus dangereux du site : de l’énergie stockée, des courts-circuits qui débitent des centaines d’ampères, de l’hydrogène pour une batterie au plomb, un feu difficile à éteindre pour un lithium.',
      'The battery receives the current from the controller and gives it back to the house at night, in low water, when you like. The screw turns almost without stopping all winter: the battery gets only gentle charges, without big jolts, and so spares its life, says the video. The model takes it as ideal, at {busVolts} V (assumption), and sends it {elecKw} kW, that is {current} A, at the design point (model result); its capacity is not modelled. In the room it rests on a solid, ventilated shelf, away from the water, with a fuse as close as possible to its terminal. It is the most dangerous component of the site: stored energy, short circuits that deliver hundreds of amps, hydrogen for a lead-acid battery, a fire that is hard to put out for a lithium one.',
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
  {
    id: 'dump-load',
    scene: 'powerroom',
    category: 'electrical',
    name: l('Charge de délestage', 'Dump load'),
    short: l(
      'Une grosse résistance qui avale le surplus quand la batterie est pleine, pour que la génératrice garde un frein. Non simulée.',
      'A big resistor that swallows the surplus when the battery is full, so that the generator keeps a brake. Not simulated.',
    ),
    description: lf(
      'L’eau ne s’arrête pas parce que la batterie est pleine. La charge de délestage est une résistance (un élément chauffant, à l’air ou plongé dans l’eau d’un ballon) sur laquelle le régulateur envoie le courant que la batterie n’accepte plus : la génératrice garde ainsi toujours un frein, et la vis ne s’emballe pas. La vidéo le dit : dès qu’il y a une charge électrique, on peut freiner la turbine, et lui donner de l’eau et de la puissance. Pour tenir ce rôle, la charge doit pouvoir absorber toute l’électricité que la centrale peut faire, {elecKw} kW au point de calcul (résultat du modèle), soit une résistance d’environ {dumpOhm} Ω (dérivé) sous {busVolts} V (hypothèse). Le labo ne la simule pas : son modèle n’a pas de charge de délestage, la batterie y est idéale et prend tout ; les centrales réelles en ont une.',
      'The water does not stop because the battery is full. The dump load is a resistor (a heating element, in air or plunged into the water of a tank) to which the controller sends the current that the battery no longer accepts: the generator thus always keeps a brake, and the screw does not race. The video says it: once there is an electrical load, the turbine can be braked, and given water and power. To do this job, the load must be able to absorb all the electricity the plant can make, {elecKw} kW at the design point (model result), that is a resistance of about {dumpOhm} Ω (derived) at {busVolts} V (assumption). The lab does not simulate it: its model has no dump load, its battery is ideal and takes everything; real plants have one.',
    ),
    material: l(
      'Résistance de puissance ou élément chauffant (à l’air ou dans l’eau), support incombustible',
      'Power resistor or heating element (in air or in water), non-combustible mount',
    ),
    specs: [
      sp(
        'Rôle',
        'Role',
        l(
          'absorber le surplus quand la batterie est pleine et garder un frein à la génératrice',
          'absorb the surplus when the battery is full and keep a brake on the generator',
        ),
      ),
      sp(
        'À absorber, au moins',
        'To absorb, at least',
        tf('model', '{elecKw} kW, tout ce que la centrale peut faire', '{elecKw} kW, all that the plant can make'),
      ),
      sp(
        'Résistance',
        'Resistance',
        lf(
          '≈ {dumpOhm} Ω (dérivé), sous {busVolts} V (hypothèse)',
          '≈ {dumpOhm} Ω (derived), at {busVolts} V (assumption)',
        ),
      ),
      sp(
        'Dans le modèle',
        'In the model',
        l('non simulée : le modèle n’a pas de charge de délestage', 'not simulated: the model has no dump load'),
      ),
      sp('Danger', 'Hazard', l('très chaude, risque d’incendie', 'very hot, fire risk')),
    ],
    maintenance: maint(
      {
        failure:
          'Un élément qui grille ou dont la connexion se coupe : la génératrice n’est plus freinée quand la batterie est pleine, et la panne est silencieuse. Le tartre sur un élément immergé, la poussière sur une résistance à l’air, une connexion qui chauffe.',
        check:
          'Une fois l’an, avec un électricien, simulez une batterie pleine en abaissant le seuil de détournement : la charge doit chauffer, l’eau du ballon doit tiédir, la vis ne doit pas s’emballer. Mesurez aussi sa résistance, machine isolée.',
        care: 'Dégagez-la de tout ce qui brûle, gardez-la ventilée et hors de portée des mains, détartrez un élément immergé, resserrez les connexions.',
      },
      {
        failure:
          'An element that burns out or whose connection breaks: the generator is no longer braked when the battery is full, and the fault is silent. Scale on an immersed element, dust on a resistor in air, a connection that heats up.',
        check:
          'Once a year, with an electrician, simulate a full battery by lowering the diversion threshold: the load should heat up, the water in the tank should warm, the screw should not race. Also measure its resistance, with the machine isolated.',
        care: 'Clear it of anything that burns, keep it ventilated and out of reach of hands, descale an immersed element, retighten the connections.',
      },
    ),
    tip: l(
      'Une charge de délestage qui ne chauffe pas est la panne la plus discrète et la plus dangereuse : rien ne l’annonce, et la vis n’est plus freinée. Testez-la, et gardez la vanne de sécurité en second rempart.',
      'A dump load that does not heat up is the quietest and most dangerous fault: nothing announces it, and the screw is no longer braked. Test it, and keep the safety gate as a second rampart.',
    ),
    video: ['14:35'],
    design: l(
      'Brûler de l’énergie paraît absurde, mais l’eau coule de toute façon : mieux vaut qu’elle chauffe un ballon ou un local que de laisser la vis s’emballer. Dans une centrale réelle, c’est la dernière défense électrique, avant la vanne qui coupe l’eau.',
      'Burning energy looks absurd, but the water flows anyway: better that it heats a tank or a room than that the screw races. In a real plant, it is the last electrical defence, before the gate that cuts the water.',
    ),
  },
  {
    id: 'inverter',
    scene: 'powerroom',
    category: 'electrical',
    name: l('Onduleur', 'Inverter'),
    short: l(
      'Il change le continu de la batterie en alternatif, à la tension du secteur, pour les appareils de la maison.',
      'It turns the battery’s direct current into alternating current, at mains voltage, for the house’s appliances.',
    ),
    description: lf(
      'La plupart des appareils de la maison veulent du courant alternatif à la tension du secteur, pas les {busVolts} V continus de la batterie (hypothèse). L’onduleur les fabrique : il découpe le courant continu très vite pour en faire une onde alternative. Le labo en dessine un de {invKw} kW (estimation), qui tirerait environ {invA} A de la batterie à pleine puissance, avant ses pertes (dérivé) : plus que les courants de charge, donc ses câbles sont courts et épais, et son fusible est à lui. Ni lui ni ses pertes ne sont dans le modèle, qui s’arrête à la batterie. Sa sortie est une tension de secteur, mortelle ; la raccorder à la maison est l’affaire d’un électricien qualifié, qui suit les règles du pays.',
      'Most of the house’s appliances want alternating current at mains voltage, not the battery’s {busVolts} V direct current (assumption). The inverter makes it: it chops the direct current very fast to build an alternating wave. The lab draws one of {invKw} kW (estimate), which would draw about {invA} A from the battery at full power, before its losses (derived): more than the charging currents, so its cables are short and thick, and its fuse is its own. Neither it nor its losses are in the model, which stops at the battery. Its output is mains voltage, which is lethal; connecting it to the house is a job for a qualified electrician, following the country’s rules.',
    ),
    material: l(
      'Électronique de puissance, ventilateur, boîtier métallique',
      'Power electronics, cooling fan, metal case',
    ),
    specs: [
      sp(
        'Rôle',
        'Role',
        l('continu de la batterie vers alternatif du secteur', 'direct current of the battery to alternating mains'),
      ),
      sp('Puissance dessinée', 'Drawn power', tf('estimate', '{invKw} kW', '{invKw} kW')),
      sp(
        'Courant pris à la batterie, à pleine puissance',
        'Current drawn from the battery, at full power',
        tf('derived', '≈ {invA} A, avant pertes', '≈ {invA} A, before losses'),
      ),
      sp(
        'Dans le modèle',
        'In the model',
        l('non modélisé : le modèle s’arrête à la batterie', 'not modelled: the model stops at the battery'),
      ),
      sp('Sortie', 'Output', l('tension du secteur du pays : mortelle', 'the country’s mains voltage: lethal')),
    ],
    maintenance: maint(
      {
        failure:
          'Surchauffe d’un onduleur enfermé ou poussiéreux, ventilateur encrassé, cosses du côté continu qui chauffent (forts courants), arrêts intempestifs quand la batterie est basse ou qu’un appareil appelle trop de courant au démarrage.',
        check:
          'Courant coupé des deux côtés et verrouillé : regardez les cosses continues (couleur, serrage), la poussière dans les ouïes, le ventilateur. Lisez le journal des défauts s’il en a un.',
        care: 'Dépoussiérez, resserrez les cosses, gardez de l’air tout autour, et ne l’enfermez pas dans un coffre étanche.',
      },
      {
        failure:
          'Overheating of an enclosed or dusty inverter, a clogged fan, direct-current lugs that heat up (heavy currents), untimely shutdowns when the battery is low or an appliance asks too much current at start-up.',
        check:
          'With the current cut on both sides and locked, look at the direct-current lugs (colour, tightness), the dust in the vents, the fan. Read the fault log if it has one.',
        care: 'Dust it, retighten the lugs, keep air all round it, and do not shut it in a sealed box.',
      },
    ),
    tip: lf(
      'Choisissez-le d’après ce qu’il doit alimenter, pas d’après la puissance de la turbine : la vis ne fait que {elecKw} kW (résultat du modèle), mais un moteur ou un compresseur appelle, au démarrage, un courant bien plus grand que sa puissance. L’onduleur, lui, vit sur la réserve de la batterie.',
      'Choose it for what it has to feed, not for the turbine’s power: the screw makes only {elecKw} kW (model result), but a motor or a compressor draws, at start-up, a current far greater than its power. The inverter, for its part, lives on the battery’s reserve.',
    ),
    design: l(
      'L’onduleur fait de la batterie une prise de courant : sans lui, la maison ne peut pas utiliser son électricité. Il consomme aussi un peu à vide, et pour un petit usage permanent cela compte.',
      'The inverter makes the battery into a wall socket: without it, the house cannot use its electricity. It also uses a little when idle, and for a small permanent use that counts.',
    ),
  },
  {
    id: 'energy-meter',
    scene: 'powerroom',
    category: 'electrical',
    name: l('Compteur d’énergie', 'Energy meter'),
    short: l(
      'Il compte les kilowattheures produits : la puissance multipliée par le temps.',
      'It counts the kilowatt-hours produced: power multiplied by time.',
    ),
    description: lf(
      'Une puissance est un débit d’énergie ; le compteur d’énergie compte ce qui a coulé. Il mesure le courant par un shunt, une petite résistance de précision placée sur le fil de la batterie, mesure la tension, multiplie les deux et additionne au fil du temps : un kilowattheure, c’est un kilowatt pendant une heure. La vidéo insiste là-dessus : ce qui compte n’est pas la puissance du moment, mais le nombre d’heures où l’on produit dans l’année et le fait de s’en servir. Sur le bief du labo, le modèle donne {yearKwh} kWh dans l’année tirée, soit {meanKw} kW en moyenne (résultat du modèle) ; le compteur du labo suit la simulation, le vôtre dira la vraie année.',
      'A power is a flow of energy; the energy meter counts what has flowed. It measures the current through a shunt, a small precision resistor placed on the battery’s wire, measures the voltage, multiplies the two and adds up over time: a kilowatt-hour is one kilowatt for one hour. The video insists on this: what counts is not the power of the moment but the number of hours you produce in a year and whether you use it. On the lab’s race, the model gives {yearKwh} kWh in the drawn year, that is {meanKw} kW on average (model result); the lab’s meter follows the simulation, yours will tell the real year.',
    ),
    material: l(
      'Shunt de mesure, électronique de mesure, afficheur',
      'Measuring shunt, measuring electronics, display',
    ),
    specs: [
      sp(
        'Unité',
        'Unit',
        l('kilowattheure (kWh) : un kilowatt pendant une heure', 'kilowatt-hour (kWh): one kilowatt for one hour'),
      ),
      sp(
        'Mesure',
        'Measurement',
        l(
          'courant par un shunt, tension, produit additionné dans le temps',
          'current through a shunt, voltage, product added up over time',
        ),
      ),
      sp(
        'Année tirée du bief',
        'Drawn year of the race',
        tf('model', '≈ {yearKwh} kWh, soit {meanKw} kW en moyenne', '≈ {yearKwh} kWh, that is {meanKw} kW on average'),
      ),
      sp('Précision', 'Accuracy', l('non modélisée', 'not modelled')),
    ],
    maintenance: maint(
      {
        failure:
          'Un shunt mal serré ou branché à l’envers fausse la mesure ; la pile ou l’alimentation du compteur lâche et la mémoire s’efface ; l’afficheur vieillit.',
        check:
          'Comparez son courant à celui d’une pince ampèremétrique pour courant continu, au même instant ; comparez l’énergie notée sur plusieurs jours à la tension de la batterie.',
        care: 'Resserrez le shunt, vérifiez l’alimentation du compteur, et sauvegardez les relevés dans un carnet ou un fichier.',
      },
      {
        failure:
          'A shunt that is loose or connected the wrong way round spoils the measurement; the meter’s battery or supply fails and its memory is erased; the display ages.',
        check:
          'Compare its current with that of a clamp meter for direct current, at the same moment; compare the energy noted over several days with the battery voltage.',
        care: 'Retighten the shunt, check the meter’s supply, and back up the readings in a notebook or a file.',
      },
    ),
    tip: l(
      'Notez la lecture du compteur à date fixe, chaque mois : en une année, vous aurez la vraie courbe de votre site, que le labo ne peut que dessiner.',
      'Note the meter reading on a fixed date, every month: in a year, you will have the real curve of your site, which the lab can only draw.',
    ),
    design: l(
      'Mesurer coûte peu et rend le reste vérifiable : sans compteur, on ne sait jamais si les chiffres d’un modèle, comme ceux de ce labo, se retrouvent sur place.',
      'Measuring costs little and makes the rest checkable: without a meter, you never know whether the figures of a model, like this lab’s, are found on site.',
    ),
  },
  {
    id: 'switchboard',
    scene: 'powerroom',
    category: 'structure',
    name: l('Tableau électrique', 'Switchboard'),
    short: l(
      'Le coffret fixé au mur qui porte, protège et étiquette les appareils du local.',
      'The wall-mounted enclosure that carries, protects and labels the room’s devices.',
    ),
    description: l(
      'Le tableau électrique est le coffret et le panneau fixés au mur qui portent les appareils : des rails pour les protections, des barres de cuivre qui répartissent les forts courants continus, des presse-étoupes pour faire entrer les câbles par le bas. Il sépare les circuits : d’un côté le continu à fort courant de la batterie, de l’autre l’alternatif de l’onduleur, où se placent aussi un disjoncteur différentiel et un disjoncteur pour la maison. Une porte, une étiquette sur chaque circuit et un schéma collé à l’intérieur permettent à quelqu’un qui ne l’a pas câblé de s’y retrouver. Le coffret protège les appareils de la poussière et des éclaboussures, mais pas de l’humidité qui s’installe : il est au sec, au-dessus des crues. Sa taille, comme le calibre des appareils, est une estimation du labo.',
      'The switchboard is the enclosure and panel fixed to the wall that carry the devices: rails for the protections, copper bars that spread the heavy direct currents, cable glands to bring the cables in from below. It separates the circuits: on one side the battery’s heavy direct current, on the other the inverter’s alternating current, where a residual-current device and a breaker for the house are also fitted. A door, a label on each circuit and a diagram stuck inside let someone who did not wire it find their way. The enclosure protects the devices from dust and splashes, but not from damp that sets in: it stands dry, above flood level. Its size, like the rating of the devices, is an estimate of the lab’s.',
    ),
    material: l(
      'Coffret métallique ou en plastique, rails, barres de cuivre',
      'Metal or plastic enclosure, rails, copper bars',
    ),
    specs: [
      sp(
        'Contenu',
        'Contents',
        l(
          'protections, redresseur, régulateur, onduleur, compteur',
          'protections, rectifier, controller, inverter, meter',
        ),
      ),
      sp(
        'Circuits',
        'Circuits',
        l(
          'continu à fort courant d’un côté, alternatif de l’autre',
          'heavy direct current on one side, alternating on the other',
        ),
      ),
      sp(
        'Repérage',
        'Marking',
        l('une étiquette par circuit, un schéma sur la porte', 'a label per circuit, a diagram on the door'),
      ),
      sp('Câbles', 'Cables', l('entrée par le bas, presse-étoupes', 'entry from below, cable glands')),
    ],
    maintenance: maint(
      {
        failure:
          'Condensation, poussière, insectes ou souris dans le coffret ; un joint de barre desserré qui chauffe ; des étiquettes effacées qui mènent à la mauvaise manœuvre le jour de la panne.',
        check:
          'Isolé et verrouillé : ouvrez la porte et cherchez des gouttes, de la rouille, de la poussière, un nid, une couleur de cuivre ou de plastique brûlé. Vérifiez que chaque étiquette est lisible et que le schéma est à jour.',
        care: 'Gardez la porte fermée et le coffret au sec, mettez un sachet déshydratant si l’air est humide, resserrez les barres, et mettez le schéma à jour à chaque changement.',
      },
      {
        failure:
          'Condensation, dust, insects or mice in the enclosure; a loose bar joint that heats up; faded labels that lead to the wrong operation on the day of a fault.',
        check:
          'Isolated and locked: open the door and look for drops, rust, dust, a nest, a colour of burnt copper or plastic. Check that every label is legible and the diagram up to date.',
        care: 'Keep the door shut and the enclosure dry, add a desiccant bag if the air is damp, retighten the bars, and update the diagram at every change.',
      },
    ),
    tip: l(
      'Un schéma à l’intérieur de la porte et une étiquette sur chaque circuit : le jour d’une panne, ce n’est pas forcément celui qui a câblé qui intervient.',
      'A diagram inside the door and a label on every circuit: on the day of a fault, the one who did the wiring is not necessarily the one who steps in.',
    ),
    design: l(
      'Séparer, dans le même coffret, le continu à fort courant de l’alternatif mortel oblige à ranger : chaque circuit a sa place, ses protections et son étiquette.',
      'Separating, in the same enclosure, heavy direct current from lethal alternating current forces tidiness: each circuit has its place, its protections and its label.',
    ),
  },
  {
    id: 'earthing',
    scene: 'powerroom',
    category: 'electrical',
    name: l('Mise à la terre', 'Earthing'),
    short: l(
      'Un piquet planté dans le sol, relié à toutes les masses : il donne un chemin aux défauts et aux surtensions.',
      'A rod driven into the ground and bonded to every frame: it gives faults and surges a path.',
    ),
    description: lf(
      'La mise à la terre se compose d’un piquet planté dans le sol à l’extérieur, d’un conducteur vert et jaune qui y relie toutes les carcasses métalliques de l’installation (génératrice, tableau, onduleur, support de la batterie, charge de délestage) et de parafoudres à l’arrivée du câble de la génératrice. Elle a trois rôles : donner à un courant de défaut un chemin facile vers le sol, pour que la protection déclenche au lieu qu’une carcasse reste sous tension ; mettre toutes les masses au même potentiel ; et écouler les surtensions, celles de la foudre en particulier, car le câble de la génératrice est un long fil à l’extérieur. Le labo dessine un conducteur de {earthMm2} mm² (estimation). Qu’un pôle du circuit de {busVolts} V (hypothèse) soit lui-même relié à la terre dépend de l’installation et des règles du pays : c’est le choix d’un électricien qualifié, qui mesure aussi la résistance de la prise.',
      'The earthing consists of a rod driven into the ground outside, a green-and-yellow conductor that bonds to it every metal frame of the installation (generator, board, inverter, battery rack, dump load) and surge protectors where the generator’s cable arrives. It has three jobs: to give a fault current an easy path to the ground, so that the protection trips instead of a frame staying live; to bring all the metalwork to the same potential; and to drain surges, lightning’s in particular, since the generator’s cable is a long wire outdoors. The lab draws a conductor of {earthMm2} mm² (estimate). Whether one pole of the {busVolts} V circuit (assumption) is itself earthed depends on the installation and the country’s rules: it is the choice of a qualified electrician, who also measures the resistance of the earth.',
    ),
    material: l(
      'Piquet de cuivre ou d’acier cuivré, conducteur vert et jaune, parafoudres',
      'Copper or copper-clad steel rod, green-and-yellow conductor, surge protectors',
    ),
    specs: [
      sp(
        'Éléments',
        'Elements',
        l('piquet, conducteur de liaison, parafoudres', 'rod, bonding conductor, surge protectors'),
      ),
      sp('Section du conducteur', 'Section of the conductor', tf('estimate', '{earthMm2} mm²', '{earthMm2} mm²')),
      sp(
        'Valeur de la prise',
        'Value of the earth',
        l(
          'à mesurer sur place : elle dépend du sol et de la saison',
          'to be measured on site: it depends on the soil and the season',
        ),
      ),
      sp('Qui', 'Who', l('un électricien qualifié', 'a qualified electrician')),
    ],
    maintenance: maint(
      {
        failure:
          'La corrosion ronge la pince du piquet ou le conducteur, un fil coupé par une pelle ou un animal, un sol sec qui fait monter la résistance, un parafoudre usé par une surtension : rien de tout cela ne se voit en marche.',
        check:
          'L’électricien mesure la résistance de la prise chaque année et après un orage ; le voyant du parafoudre change quand il est usé ; vous vérifiez à vue la pince, le conducteur, et la continuité entre le tableau et chaque carcasse.',
        care: 'Protégez les connexions de la corrosion, gardez le piquet accessible, remplacez un parafoudre qui a travaillé, et ne coupez ni ne déplacez jamais un conducteur de terre sans le remettre.',
      },
      {
        failure:
          'Corrosion eats the rod’s clamp or the conductor, a wire cut by a spade or an animal, dry soil that raises the resistance, a surge protector worn out by a surge: none of it shows while running.',
        check:
          'The electrician measures the earth’s resistance every year and after a storm; the surge protector’s indicator changes when it is spent; you check by eye the clamp, the conductor, and the continuity between the board and each frame.',
        care: 'Protect the connections from corrosion, keep the rod reachable, replace a surge protector that has worked, and never cut or move an earth conductor without putting it back.',
      },
    ),
    tip: l(
      'Une mise à la terre ne se voit pas quand elle marche, ni quand elle est coupée : seule une mesure dit qu’elle existe. Faites-la mesurer, et notez la valeur.',
      'An earthing cannot be seen working, nor when it is broken: only a measurement says it exists. Have it measured, and note the value.',
    ),
    design: l(
      'Comme toutes les protections, elle ne sert que le jour où quelque chose va mal. Elle est donc peu chère à bien faire, et très chère à avoir oubliée.',
      'Like all protections, it serves only on the day something goes wrong. It is therefore cheap to do well, and very expensive to have forgotten.',
    ),
  },
];
