// The six lessons of the lab (the owner chose Lite, docs/research.md §8; docs/lessons.md): from water to watts, why a screw works,
// why a speed multiplier, which turbine for my site, a wheel or a screw, the year of the mill. Each one opens a world, a part and a
// starting point (and offers a scenario) of the simulation, ends with two or three quiz questions, and quotes only numbers that
// come from a source, from the simulation or from the dimensions, said as such (lessons-fig.ts explains the kinds of figure).
//
// Shape (lessons.test.ts pins it): 3 or 4 paragraphs of at most 85 words and 4 sentences, sentences of at most 36 words, about 200
// to 250 words a lesson; every term is defined once, in bold, in the first lesson that needs it (power, flow, head, efficiency in
// 1; pocket, rpm in 2; torque, ratio in 3; zones, lines of equal power, crossflow and Pelton turbines in 4; overshot, undershot and
// breastshot wheels in 5; water right, reserved flow, low water, flood, kilowatt-hour, capacity factor in 6); a quiz question has
// three choices of about the same length, a wrong one for each misconception the text names.
//
// The honest points, said plainly where they matter and not on every sentence (wave 1 findings, docs/research.md §10):
//   - the screw is GENERIC; the video's 200 W (prototype) and 2 kW (aim) are hopes, and the model's 2.2 kW at the flow the lab
//     worked out from them is a circular derivation: what the model really tests is its efficiency, a point above the hoped 60 to
//     70 % (lesson 1);
//   - the lab has NO fish model; the gentleness of the screw is the video's word, not a result (lesson 2);
//   - the wheel's efficiency comes from sources that disagree, and the lab's wheel is anchored on their ranges: it is not an
//     independent result (lesson 5);
//   - the reserved flow of one tenth, the gate rules and the three yearly hydrologies are the lab's estimates or draws, not
//     measurements (lesson 6); the edges of the chooser's zones are estimates, except the screw's (lesson 4).
// Sources are named in words (the video, another video, a published design rule, an encyclopaedia, a review), never by research
// code, and nobody is named: the one name allowed is the owner's own lab, Pelton Lab, once, in lesson 4.

import type { Lesson } from '@onigam/lab-kit/content';
import { l } from '@onigam/lab-kit/i18n';
import { chip, lx } from './lessons-fig';

export const LESSONS: Lesson[] = [
  // ------------------------------------------------------------------------------------------------ 1. from water to watts
  {
    id: 'water-to-watts',
    title: l('De l’eau aux watts', 'From water to watts'),
    summary: l(
      'Une seule formule dit ce que peut donner l’eau qui tombe. Voyez ce qu’il en reste dans la batterie, et ce que le modèle ne prouve pas.',
      'One formula says what falling water can give. See how much is left in the battery, and what the model does not prove.',
    ),
    body: [
      lx(
        'La **puissance** de l’eau qui tombe, l’énergie cédée chaque seconde, se compte en watts. Elle vaut le **débit** Q (l’eau qui passe par seconde) fois la **chute** H (la hauteur dont elle tombe), fois 1 000 kg par m³ (la masse de l’eau) et 9,81 (la pesanteur). À retenir : 100 litres par seconde qui tombent de 1 mètre donnent environ 1 kW.',
        'The **power** of falling water, the energy it gives up each second, is counted in watts. It equals the **flow** Q (the water passing each second) times the **head** H (the height it falls), times 1,000 kg per m³ (the mass of the water) and 9.81 (gravity). One to remember: 100 litres a second falling 1 metre give about 1 kW.',
      ),
      lx(
        'Débit et chute se remplacent l’un l’autre : avec dix fois plus de chute, dix fois moins d’eau donnent la même puissance. Une autre vidéo cite une centrale de 30 kW : environ 1,5 m³/s pour 3 m de chute, mais environ 20 L/s pour 200 m (chiffres dits à l’oral, donc arrondis).',
        'Flow and head stand in for each other: with ten times the head, a tenth of the water gives the same power. Another video quotes a 30 kW plant: about 1.5 m³/s at 3 m of head, but about 20 L/s at 200 m (spoken figures, so rounded).',
      ),
      lx(
        'Tout n’arrive pas à la batterie. Au point de calcul du labo, le modèle trouve {waterKw} kW dans l’eau, {shaftKw} kW sur l’arbre de la vis et {elecKw} kW dans la batterie. Le **rendement**, la part qui reste, est de {etaScrew} % pour la vis et de {etaAll} % de l’eau à la batterie (résultats du modèle).',
        'Not everything reaches the battery. At the lab’s design point, the model finds {waterKw} kW in the water, {shaftKw} kW on the screw’s shaft and {elecKw} kW into the battery. The **efficiency**, the share that is left, is {etaScrew}% for the screw and {etaAll}% from water to battery (model results).',
      ),
      lx(
        'La vidéo espère de 60 à 70 % de l’eau à l’électricité et n’a rien mesuré ; ses 200 W pour le prototype et ses 2 kW visés sont aussi des espoirs. Le labo a pris {head} m de chute (hypothèse, dans la fourchette de la vidéo) et en a déduit environ {flowLs} L/s (dérivé) pour ces 2 kW. Les {elecKw} kW du modèle ne confirment donc pas la vidéo : ils montrent seulement que le modèle est un point plus généreux que l’espoir.',
        'The video hopes for 60 to 70% from water to electricity and has measured nothing; its 200 W for the prototype and its 2 kW aim are hopes too. The lab took {head} m of head (assumption, within the video’s range) and worked out about {flowLs} L/s (derived) for those 2 kW. The model’s {elecKw} kW therefore does not confirm the video: it only shows that the model is a point more generous than the hope.',
      ),
    ],
    figures: [
      chip('100 L/s qui tombent de 1 m', '100 L/s falling 1 m', '≈ 1 kW'),
      chip('Puissance : eau → batterie (modèle)', 'Power: water → battery (model)', '{waterKw} → {elecKw} kW'),
      chip('Rendement : eau → batterie (modèle)', 'Efficiency: water → battery (model)', '{etaAll} %', '{etaAll}%'),
    ],
    formula: 'P = ρ · g · Q · H',
    focus: { scene: 'site', part: 'weir', preset: 'full-size' },
    video: '31:47',
    quiz: [
      {
        q: l(
          'Deux sites donnent la même puissance, mais l’un a dix fois plus de chute que l’autre. Que dire de leurs débits ?',
          'Two sites give the same power, but one has ten times the head of the other. What can you say about their flows?',
        ),
        choices: [
          l(
            'Ils sont égaux : la puissance ne dépend que de la machine',
            'They are equal: the power depends only on the machine',
          ),
          l('Le site le plus haut a un débit dix fois plus petit', 'The higher site has a flow ten times smaller'),
          l('Le site le plus haut a un débit dix fois plus grand', 'The higher site has a flow ten times larger'),
        ],
        answer: 1,
        explain: lx(
          '**Dix fois plus petit.** La puissance est le débit fois la chute (fois deux constantes) : à puissance égale, dix fois plus de chute veut dire dix fois moins de débit. Les chiffres de la vidéo le montrent : 1,5 m³/s sous 3 m portent {water3m} kW d’eau, 20 L/s sous 200 m en portent {water200m} (calcul).',
          '**Ten times smaller.** Power is the flow times the head (times two constants): for the same power, ten times the head means a tenth of the flow. The video’s figures show it: 1.5 m³/s at 3 m carries {water3m} kW of water, 20 L/s at 200 m carries {water200m} (calculation).',
        ),
      },
      {
        q: l(
          'Un ruisseau apporte 100 L/s sous 1 m de chute. Avec le rendement du modèle, combien arrive environ dans la batterie ?',
          'A stream brings 100 L/s over 1 m of head. With the model’s efficiency, about how much reaches the battery?',
        ),
        choices: [
          l('Environ 70 W : presque tout se perd en route', 'About 70 W: nearly everything is lost on the way'),
          l('Environ 1 kW : l’eau donne tout ce qu’elle porte', 'About 1 kW: the water gives all it carries'),
          lx(
            'Environ {batt1} W, soit {etaAll} % du kilowatt de l’eau',
            'About {batt1} W, that is {etaAll}% of the water’s kilowatt',
          ),
        ],
        answer: 2,
        explain: lx(
          '**Environ {batt1} W.** L’eau porte {hydro1} kW (calcul) ; avec les {etaAll} % du modèle, il en reste près de {batt1} W. C’est à peu près la proportion que la vidéo espère, mais ici c’est un résultat du modèle, pas une mesure.',
          '**About {batt1} W.** The water carries {hydro1} kW (calculation); with the model’s {etaAll}%, close to {batt1} W is left. That is about the share the video hopes for, but here it is a model result, not a measurement.',
        ),
      },
      {
        q: lx(
          'La vidéo espère de 60 à 70 % de l’eau à l’électricité ; le modèle en trouve {etaAll} %. Que faut-il en conclure ?',
          'The video hopes for 60 to 70% from water to electricity; the model finds {etaAll}%. What should you conclude?',
        ),
        choices: [
          l(
            'Que le modèle est un point plus généreux que l’espoir, à vérifier',
            'That the model is a point more generous than the hope, to be checked',
          ),
          lx(
            'Que la vidéo a déjà mesuré {etaAll} % et que son espoir était prudent',
            'That the video has already measured {etaAll}% and its hope was cautious',
          ),
          lx(
            'Qu’une vis construite d’après ce modèle donnera forcément {etaAll} %',
            'That a screw built to this model will surely give {etaAll}% in practice',
          ),
        ],
        answer: 0,
        explain: lx(
          'Le modèle applique des équations publiées avec des constantes que les sources ne donnent pas : ses {etaAll} % sont un résultat à vérifier, pas une mesure. Des centrales réelles bien conçues atteignent environ 75 % de la rivière au fil, selon une étude publiée.',
          'The model applies published equations with constants that the sources do not give: its {etaAll}% is a result to be checked, not a measurement. Well-designed real plants reach about 75% from the river to the wire, according to a published study.',
        ),
      },
    ],
  },

  // ------------------------------------------------------------------------------------------------ 2. why a screw works
  {
    id: 'why-screw',
    title: l('Pourquoi une vis marche', 'Why a screw works'),
    summary: l(
      'L’eau reste prise entre deux pales et les fait tourner en descendant, lentement. Trop vite, la vis se vide ; trop lente, elle déborde.',
      'The water is caught between two blades and turns them as it goes down, slowly. Too fast and the screw runs half empty; too slow and it overflows.',
    ),
    body: [
      lx(
        'Inclinée, la vis reçoit l’eau par le haut. Entre deux pales, l’eau reste prise dans une **poche**, fermée par l’auge fixe. Chaque poche est environ {stepCm} cm plus basse que celle du dessus (dérivé) : chaque pale est donc plus poussée par sa face haute que par sa face basse, et cette différence la fait tourner. L’eau n’est pas poussée le long de la vis, elle est portée vers le bas.',
        'Tilted, the screw takes in water at the top. Between two blades the water stays caught in a **pocket**, closed by the fixed trough. Each pocket is about {stepCm} cm lower than the one above (derived): each blade is therefore pushed harder on its high face than on its low face, and that difference turns it. The water is not pushed along the screw, it is carried down.',
      ),
      lx(
        'La vis tourne lentement : de 30 à 60 tours par minute (**tr/min**) dans la vidéo. Une règle de dimensionnement publiée donne environ 50 divisé par le diamètre, en mètres, à la puissance deux tiers. Pour la vis générique du labo, de {diameter} m de diamètre (dérivé), le modèle trouve {rpm} tr/min (résultat du modèle).',
        'The screw turns slowly: 30 to 60 turns a minute (**rpm**) in the video. A published sizing rule gives about 50 divided by the diameter, in metres, to the power two thirds. For the lab’s generic screw, {diameter} m across (derived), the model finds {rpm} rpm (model result).',
      ),
      lx(
        'Trop vite, l’eau n’a plus le temps de remplir les poches. Dans le scénario, la vitesse monte à 2,4 fois la règle : les poches ne sont remplies qu’à {fastFill} % et la puissance sur l’arbre tombe à {fastShaft} % (modèle). Trop lente, la vis déborde : le surplus descend sans rien produire.',
        'Too fast, the water no longer has time to fill the pockets. In the scenario the speed climbs to 2.4 times the rule: the pockets are only {fastFill}% full and the power on the shaft falls to {fastShaft}% (model). Too slow, the screw overflows: the surplus goes down producing nothing.',
      ),
      lx(
        'La vidéo présente cette lenteur comme douce pour les poissons, qui descendent dans leur poche d’eau, et la vis n’a pas besoin d’une grille fine, qui se bouche. Le labo n’a aucun modèle de poisson : il ne sait pas dire combien survivent, il reprend ce que dit la vidéo. Une grille à gros barreaux reste utile contre les troncs.',
        'The video presents this slowness as gentle on fish, which ride down in their pocket of water, and the screw needs no fine rack, which clogs. The lab has no fish model: it cannot say how many survive, it repeats what the video says. A rack with wide bars is still useful against logs.',
      ),
    ],
    figures: [
      chip('Poches · marche entre deux (dérivé)', 'Pockets · step between two (derived)', '{buckets} · {stepCm} cm'),
      chip('Vitesse : vidéo / modèle', 'Speed: video / model', '30 à 60 / {rpm} tr/min', '30 to 60 / {rpm} rpm'),
      chip(
        'À 2,4 fois la règle : remplissage (modèle)',
        'At 2.4 times the rule: filling (model)',
        '{fastFill} %',
        '{fastFill}%',
      ),
    ],
    formula: 'n = 50 / D^(2/3)',
    focus: { scene: 'screw', part: 'trapped-water', preset: 'full-size', scenario: 'too-fast' },
    video: '05:06',
    quiz: [
      {
        q: l('Qu’est-ce qui fait tourner la vis ?', 'What makes the screw turn?'),
        choices: [
          l(
            'Un jet d’eau rapide qui frappe les pales, comme sur une roue par-dessous',
            'A fast jet of water striking the blades, as it does on an undershot wheel',
          ),
          l(
            'L’eau plus haute d’un côté de chaque pale que de l’autre',
            'The water standing higher on one side of each blade than on the other',
          ),
          l(
            'Le poids de la vis elle-même, qui glisse le long de son axe incliné',
            'The weight of the screw itself, sliding down its own tilted axis by gravity',
          ),
        ],
        answer: 1,
        explain: lx(
          'Entre deux poches voisines, l’eau diffère d’environ {stepCm} cm de hauteur (dérivé) : la pression est plus forte sur une face de la pale que sur l’autre. Il n’y a pas de jet (une roue par-dessous en utilise un, leçon 5), et la vis ne glisse pas : ses paliers la tiennent.',
          'Between two neighbouring pockets the water differs by about {stepCm} cm in height (derived): the pressure is greater on one face of the blade than on the other. There is no jet (an undershot wheel uses one, lesson 5), and the screw does not slide: its bearings hold it.',
        ),
      },
      {
        q: l(
          'Dans le scénario, la vis est forcée à 2,4 fois sa vitesse. Que se passe-t-il pour les poches et pour la puissance ?',
          'In the scenario the screw is forced to 2.4 times its speed. What happens to the pockets and to the power?',
        ),
        choices: [
          l(
            'Les poches se vident à moitié et la puissance est divisée par deux',
            'The pockets run half empty and the power on the shaft is halved',
          ),
          l(
            'Les poches restent pleines à ras bord et la puissance sur l’arbre double',
            'The pockets stay full to the brim and the power on the shaft doubles',
          ),
          l(
            'Les poches débordent par-dessus les pales et la puissance ne change pas',
            'The pockets overflow over the blades and the power does not change',
          ),
        ],
        answer: 0,
        explain: lx(
          'L’eau n’a plus le temps de remplir les poches : {fastFill} % de remplissage et {fastShaft} % de la puissance sur l’arbre (modèle). Ce sont les poches d’une vis trop lente qui débordent : le surplus descend sans rien produire.',
          'The water no longer has time to fill the pockets: {fastFill}% filling and {fastShaft}% of the shaft power (model). It is the pockets of a screw turning too slowly that overflow: the surplus goes down producing nothing.',
        ),
      },
      {
        q: l('Que peut dire le labo des poissons ?', 'What can the lab say about fish?'),
        choices: [
          l(
            'Combien survivent à la descente dans la vis à son rythme normal',
            'How many survive the trip down the screw at its normal pace',
          ),
          l(
            'Qu’une grille n’est jamais utile devant une vis d’Archimède',
            'That a rack is never useful in front of an Archimedes screw',
          ),
          l('Rien de calculé : il n’a pas de modèle de poisson', 'Nothing calculated: it has no fish model'),
        ],
        answer: 2,
        explain: lx(
          'Le labo calcule l’eau, pas les poissons : la douceur de la vis vient de la vidéo et de sa lenteur. Quant à la grille, une grille à gros barreaux arrête les troncs, qui pourraient se coincer dans le jeu de {gapMm} mm entre pale et auge (dérivé).',
          'The lab calculates the water, not the fish: the gentleness of the screw comes from the video and its slowness. As for the rack, a rack with wide bars stops logs, which could jam in the {gapMm} mm gap between blade and trough (derived).',
        ),
      },
    ],
  },

  // ------------------------------------------------------------------------------------------------ 3. why a speed multiplier
  {
    id: 'speed-multiplier',
    title: l('Pourquoi un multiplicateur de vitesse', 'Why a speed multiplier'),
    summary: l(
      'La vis tourne lentement mais fort, la génératrice veut tourner vite : la chaîne et la courroie échangent l’un contre l’autre.',
      'The screw turns slowly but hard, the generator wants to turn fast: the chain and the belt trade one for the other.',
    ),
    body: [
      lx(
        'Une machine qui tourne donne de la puissance en combinant une vitesse et un **couple**, la force de torsion, comme celle d’une main sur une clé (en newtons-mètres, N·m). La puissance est le couple fois la vitesse de rotation. À puissance égale, vitesse et couple s’échangent : tourner dix fois plus vite, c’est dix fois moins de couple.',
        'A turning machine delivers power by combining a speed and a **torque**, the twisting force, like that of a hand on a spanner (in newton-metres, N·m). Power is torque times rotation speed. For the same power, speed and torque trade: ten times the speed means a tenth of the torque.',
      ),
      lx(
        'Le modèle fait tourner la vis à {rpm} tr/min avec {torqueScrew} N·m. La génératrice, elle, veut plusieurs centaines de tr/min d’après la vidéo : le labo prend {genRpm} (hypothèse), où la même puissance ne demande que {torqueGen} N·m (résultats du modèle). Il faut donc un **rapport** de transmission, vitesse de sortie divisée par vitesse d’entrée, de {ratio} (dérivé).',
        'The model turns the screw at {rpm} rpm with {torqueScrew} N·m. The generator, for its part, wants several hundred rpm according to the video: the lab takes {genRpm} (assumption), where the same power needs only {torqueGen} N·m (model results). So a transmission **ratio**, output speed divided by input speed, of {ratio} (derived) is needed.',
      ),
      lx(
        'Ce rapport est le produit de deux étages : une chaîne de {chain}, puis une courroie de {belt} (dérivé). Un seul étage ne dépasse pas environ {stageMax} dans le modèle (hypothèse), et chaque étage coûte un peu : {etaDrive} % de la puissance passent. Le labo met la chaîne, qui ne glisse pas, du côté lent, où le couple est fort, et la courroie, souple, du côté rapide. Chaîne et courroie happent une manche : elles restent sous carter.',
        'This ratio is the product of two stages: a chain of {chain}, then a belt of {belt} (derived). A single stage does not go beyond about {stageMax} in the model (assumption), and each stage costs a little: {etaDrive}% of the power gets through. The lab puts the chain, which does not slip, on the slow side, where the torque is high, and the belt, flexible, on the fast side. A chain and a belt snatch a sleeve: they stay behind guards.',
      ),
      lx(
        'Dans le scénario, un rapport de courroie réduit à 0,45 fois le bon fait accélérer la vis jusqu’à {scenLowRpm} tr/min, poches à moitié vides, pour {beltLowEl} kW. À 1,9 fois le bon, elle est freinée à {beltHighRpm} tr/min, déborde, et donne {beltHighEl} kW, au lieu de {elecKw1} kW (résultats du modèle).',
        'In the scenario, a belt ratio cut to 0.45 times the right one makes the screw speed up to {scenLowRpm} rpm, pockets half empty, for {beltLowEl} kW. At 1.9 times the right one it is held back to {beltHighRpm} rpm, overflows, and gives {beltHighEl} kW, instead of {elecKw1} kW (model results).',
      ),
    ],
    figures: [
      chip(
        'Couple : vis → génératrice (modèle)',
        'Torque: screw → generator (model)',
        '{torqueScrew} → {torqueGen} N·m',
      ),
      chip('Rapport : chaîne × courroie (dérivé)', 'Ratio: chain × belt (derived)', '{chain} × {belt} = {ratio}'),
      chip(
        'Électricité avec un mauvais rapport (modèle)',
        'Electricity with a bad ratio (model)',
        '{beltLowEl} / {beltHighEl} kW',
      ),
    ],
    formula: 'T = P / ω',
    focus: { scene: 'screw', part: 'pulley-large', preset: 'full-size', scenario: 'wrong-ratio' },
    video: '35:43',
    quiz: [
      {
        q: l(
          'Sur l’arbre de la génératrice, qui tourne environ dix fois plus vite que la vis, le couple est…',
          'On the generator’s shaft, which turns about ten times faster than the screw, the torque is…',
        ),
        choices: [
          l(
            'à peu près le même : le couple ne dépend pas de la vitesse de rotation',
            'about the same: torque does not depend on the rotation speed',
          ),
          l(
            'environ dix fois plus grand : plus vite, c’est plus fort',
            'about ten times greater: faster means stronger',
          ),
          l(
            'environ dix fois plus petit : vitesse et couple s’échangent',
            'about ten times smaller: speed and torque trade',
          ),
        ],
        answer: 2,
        explain: lx(
          'À puissance égale, ce que l’on gagne en vitesse, on le perd en couple : {torqueScrew} N·m sur la vis, {torqueGen} N·m sur la génératrice (résultats du modèle). La transmission perd un peu de puissance, d’où un couple un peu plus faible encore que le rapport seul ne le dirait.',
          'For the same power, what you gain in speed you lose in torque: {torqueScrew} N·m on the screw, {torqueGen} N·m on the generator (model results). The transmission loses a little power, hence a torque a little lower still than the ratio alone would say.',
        ),
      },
      {
        q: l('Pourquoi une chaîne d’abord, puis une courroie ?', 'Why a chain first and then a belt?'),
        choices: [
          l(
            'La chaîne multiplie la vitesse et la courroie multiplie le couple',
            'The chain multiplies the speed and the belt multiplies the torque',
          ),
          l(
            'La chaîne ne glisse pas sous le gros couple lent ; la courroie suffit côté rapide',
            'The chain does not slip under the big slow torque; a belt will do on the fast side',
          ),
          l(
            'Deux étages perdent moins de puissance qu’un seul étage, donc ils sont plus économiques',
            'Two stages lose less power than a single stage, so they are cheaper to run in the long run',
          ),
        ],
        answer: 1,
        explain: lx(
          'Du côté lent, le couple est fort et une chaîne ne glisse pas ; du côté rapide, il est faible et une courroie suffit. Deux étages coûtent plus qu’un seul (chaîne {chainEff} %, courroie {beltEff} % : hypothèses du modèle), mais un seul ne donnerait pas le rapport voulu.',
          'On the slow side the torque is strong and a chain does not slip; on the fast side it is weak and a belt will do. Two stages cost more than one (chain {chainEff}%, belt {beltEff}%: model assumptions), but a single one would not give the ratio wanted.',
        ),
      },
      {
        q: l(
          'Dans le scénario, le rapport de la courroie est réduit à 0,45 fois le bon. Que fait la vis ?',
          'In the scenario the belt ratio is cut to 0.45 times the right one. What does the screw do?',
        ),
        choices: [
          l(
            'Elle accélère à environ deux fois sa vitesse et donne bien moins',
            'It speeds up to about twice its speed and gives much less',
          ),
          l(
            'Rien : la génératrice s’adapte tout seule et la puissance ne change pas',
            'Nothing: the generator adapts by itself and the power does not change',
          ),
          l(
            'Elle s’arrête net, faute de couple pour tourner la génératrice',
            'It stops, for lack of torque to turn the generator',
          ),
        ],
        answer: 0,
        explain: lx(
          'La génératrice ne charge qu’au-dessus d’une vitesse minimale ({cutInRpm} tr/min, résultat du modèle) : la vis accélère jusqu’à l’atteindre, à {scenLowRpm} tr/min. Ses poches sont à moitié vides, et il reste {beltLowEl} kW au lieu de {elecKw1} kW.',
          'The generator only charges above a minimum speed ({cutInRpm} rpm, model result): the screw speeds up until it reaches it, at {scenLowRpm} rpm. Its pockets are half empty, and {beltLowEl} kW is left instead of {elecKw1} kW.',
        ),
      },
    ],
  },

  // ------------------------------------------------------------------------------------------------ 4. which turbine for my site
  {
    id: 'which-turbine',
    title: l('Quelle turbine pour mon site ?', 'Which turbine for my site?'),
    summary: l(
      'La chute et le débit désignent la machine. Les zones se recouvrent, et les sources ne s’accordent pas sur leurs bords.',
      'Head and flow point to the machine. The zones overlap, and the sources disagree at their edges.',
    ),
    body: [
      lx(
        'Dans la Simulation, le graphique « Quelle turbine pour mon site ? » met la chute en abscisse et le débit en ordonnée (échelles logarithmiques), et votre site y est un point. Des **zones** montrent où chaque machine est d’usage ; des **lignes d’égale puissance**, en pointillé, relient les sites qui portent la même puissance.',
        'In the Simulation, the chart “Which turbine for my site?” puts the head across and the flow up (logarithmic scales), and your site is a dot on it. **Zones** show where each machine is used; dashed **lines of equal power** join the sites that carry the same power.',
      ),
      lx(
        'La vis couvre de 0,1 à 10 m de chute et de 0,01 à 14,5 m³/s (limites publiées). Les roues à aubes la recoupent de 0,3 à 10 m, et une turbine Kaplan (une hélice dans une conduite) la rejoint dès 2 m. Plusieurs machines conviennent donc au même site, et les sources divergent sur les bords : les zones se recouvrent.',
        'The screw covers 0.1 to 10 m of head and 0.01 to 14.5 m³/s (published limits). Water wheels overlap it from 0.3 to 10 m, and a Kaplan turbine (a propeller in a pipe) joins in from 2 m. Several machines therefore suit the same site, and the sources differ at the edges: the zones overlap.',
      ),
      lx(
        'Dans une autre vidéo, une **turbine à flux traversant** (l’eau traverse deux fois la roue) tire 30 kW de 450 L/s sur 9,22 m : l’eau porte {crossWater} kW, soit un rendement de {crossEta} % (calcul). Une centrale de montagne, dans une autre vidéo, tire 987 kW d’une **turbine Pelton** (un jet frappe des godets) sous 220 m, à 750 tr/min. Pour les très hautes chutes, voyez Pelton Lab, le labo consacré à cette turbine.',
        'In another video a **crossflow turbine** (the water crosses the runner twice) draws 30 kW from 450 L/s over 9.22 m: the water carries {crossWater} kW, so an efficiency of {crossEta}% (calculation). A mountain plant, in another video, draws 987 kW from a **Pelton turbine** (a jet strikes buckets) under 220 m, at 750 rpm. For very high heads, see Pelton Lab, the lab devoted to that turbine.',
      ),
      lx(
        'Lisez ce graphique avec prudence. Les chutes des zones viennent de sources publiées ; les débits, sauf ceux de la vis, et le rendement type de chaque machine sont des estimations du labo. Pour le point de départ « Rivière avec un seuil » (3 m, 2,2 m³/s), le site tombe dans quatre zones à la fois : le graphique laisse comparer, il ne choisit pas.',
        'Read this chart with care. The heads of the zones come from published sources; the flows, except the screw’s, and the typical efficiency of each machine are the lab’s estimates. For the starting point “River with a weir” (3 m, 2.2 m³/s), the site falls in four zones at once: the chart lets you compare, it does not choose.',
      ),
    ],
    figures: [
      chip('Vis, chutes d’usage (publié)', 'Screw, usual heads (published)', '0,1 à 10 m', '0.1 to 10 m'),
      chip(
        'Flux traversant (autre vidéo)',
        'Crossflow (another video)',
        '9,22 m · 450 L/s · 30 kW',
        '9.22 m · 450 L/s · 30 kW',
      ),
      chip('Pelton (autre vidéo)', 'Pelton (another video)', '220 m · 987 kW'),
    ],
    formula: 'P = η · ρ · g · Q · H',
    focus: { scene: 'site', part: 'water-chamber', preset: 'river' },
    video: '08:26',
    quiz: [
      {
        q: l(
          'Un site a 200 m de chute et seulement 20 L/s. Quelle machine convient ?',
          'A site has 200 m of head and only 20 L/s. Which machine suits it?',
        ),
        choices: [
          l(
            'Une vis d’Archimède, puisqu’elle accepte tous les débits',
            'An Archimedes screw, since it accepts any flow',
          ),
          l(
            'Une turbine à flux traversant, d’usage courant de 8 à 60 m de chute',
            'A crossflow turbine, commonly used from 8 to 60 m of head',
          ),
          l('Une turbine Pelton, faite pour les très hautes chutes', 'A Pelton turbine, made for very high heads'),
        ],
        answer: 2,
        explain: lx(
          'Le débit est faible, mais la chute est haute : 20 L/s sous 200 m portent {water200m} kW d’eau (calcul). La vis ne dépasse pas 10 m de chute, la zone du flux traversant s’arrête à 60 m, et celle de la Pelton commence vers 75 m.',
          'The flow is small, but the head is high: 20 L/s at 200 m carries {water200m} kW of water (calculation). The screw does not go beyond 10 m of head, the crossflow zone stops at 60 m, and the Pelton’s starts around 75 m.',
        ),
      },
      {
        q: l('Pourquoi les zones du graphique se recouvrent-elles ?', 'Why do the zones of the chart overlap?'),
        choices: [
          l(
            'Parce que le graphique est mal dessiné, avec des zones tracées au hasard sur la page',
            'Because the chart is badly drawn, with zones traced at random across the page',
          ),
          l(
            'Parce que plusieurs machines peuvent servir un même site et que les sources divergent',
            'Because several machines can serve the same site and the sources differ',
          ),
          l(
            'Parce que chaque machine marche partout pourvu qu’on la fasse assez grande ou petite',
            'Because every machine works anywhere provided it is made big or small enough',
          ),
        ],
        answer: 1,
        explain: l(
          'Les sources ne tracent pas de frontière nette : une roue, une vis ou une turbine Kaplan peuvent toutes faire l’affaire à quelques mètres de chute, avec des rendements et des coûts différents. Hors de sa zone, une machine ne rend plus : une vis ne descend pas 200 m.',
          'The sources draw no sharp border: a wheel, a screw or a Kaplan turbine can all do the job at a few metres of head, with different efficiencies and costs. Outside its zone a machine no longer pays off: a screw does not go down 200 m.',
        ),
      },
    ],
  },

  // ------------------------------------------------------------------------------------------------ 5. a wheel or a screw
  {
    id: 'wheel-or-screw',
    title: l('Une roue ou une vis ?', 'A wheel or a screw?'),
    summary: l(
      'Une roue tourne par le poids ou par l’élan de l’eau. Les sources lui donnent des rendements très différents.',
      'A wheel turns by the weight or the momentum of the water. The sources give it very different efficiencies.',
    ),
    body: [
      lx(
        'Une roue à aubes tourne par le poids de l’eau ou par son élan. La roue **par-dessus** reçoit l’eau en haut, dans des godets, et profite de toute la chute (chutes de 2,5 à 10 m, selon une source). La roue **par-dessous** est poussée en bas par le courant : sa force vient presque toute de la vitesse de l’eau (0,3 à 2 m). La roue **de poitrine** est entre les deux (1,5 à 3 m).',
        'A water wheel turns by the weight of the water or by its momentum. The **overshot** wheel takes the water at the top, in buckets, and uses the whole drop (heads of 2.5 to 10 m, according to one source). The **undershot** wheel is pushed at the bottom by the current: nearly all its force comes from the speed of the water (0.3 to 2 m). The **breastshot** wheel is in between (1.5 to 3 m).',
      ),
      lx(
        'Quel rendement ? Les sources ne s’accordent pas. Par-dessus : 80 à 90 % (encyclopédie) ou environ 85 % (revue) ; de poitrine : 50 à 60 % ou 75 à 80 % ; par-dessous : 50 à 60 % ou environ 85 %. Le labo garde les deux fourchettes au lieu d’en choisir une.',
        'What efficiency? The sources disagree. Overshot: 80 to 90% (encyclopaedia) or about 85% (review); breastshot: 50 to 60% or 75 to 80%; undershot: 50 to 60% or about 85%. The lab keeps both ranges instead of picking one.',
      ),
      lx(
        'La roue du labo n’est pas un résultat indépendant : ses constantes sont réglées pour que le meilleur rendement de chaque type tombe dans ces fourchettes ou près d’elles. Sur la même eau que la vis, le modèle donne {wheelBreastKw} kW avec la roue de poitrine et {wheelUnderKw} kW avec la roue par-dessous, contre {elecKw1} kW avec la vis. Sa roue par-dessous, à pales plates, reste sous les deux sources.',
        'The lab’s wheel is not an independent result: its constants are set so that the best efficiency of each type falls within those ranges or near them. On the same water as the screw, the model gives {wheelBreastKw} kW with the breastshot wheel and {wheelUnderKw} kW with the undershot wheel, against {elecKw1} kW with the screw. Its undershot wheel, with flat paddles, stays under both sources.',
      ),
      lx(
        'Une roue tourne lentement : de {wheelRpmLow} à {wheelRpmHigh} tr/min dans le modèle, contre {rpm} pour la vis. Il lui faut un rapport de {ratioWheelLow} à {ratioWheelHigh}, contre {ratio} pour la vis (dérivé) : un troisième étage, donc plus de pertes. Lancez le scénario pour les voir tour à tour sur la même eau.',
        'A wheel turns slowly: {wheelRpmLow} to {wheelRpmHigh} rpm in the model, against {rpm} for the screw. It needs a ratio of {ratioWheelLow} to {ratioWheelHigh}, against {ratio} for the screw (derived): a third stage, so more losses. Run the scenario to see them in turn on the same water.',
      ),
    ],
    figures: [
      chip(
        'Même eau : poitrine · dessous · vis (modèle)',
        'Same water: breastshot · undershot · screw (model)',
        '{wheelBreastKw} · {wheelUnderKw} · {elecKw1} kW',
      ),
      chip(
        'Tours par minute : roue / vis (modèle)',
        'Turns per minute: wheel / screw (model)',
        '{wheelRpmLow} à {wheelRpmHigh} / {rpm}',
        '{wheelRpmLow} to {wheelRpmHigh} / {rpm}',
      ),
      chip(
        'Rapport exigé : roue (modèle) / vis (dérivé)',
        'Ratio needed: wheel (model) / screw (derived)',
        '{ratioWheelLow} à {ratioWheelHigh} / {ratio}',
        '{ratioWheelLow} to {ratioWheelHigh} / {ratio}',
      ),
    ],
    focus: { scene: 'screw', part: 'blade-module', preset: 'full-size', scenario: 'wheel-instead' },
    quiz: [
      {
        q: l(
          'Une source donne 50 à 60 % pour une roue par-dessous, une autre environ 85 %. Que faire de ces deux chiffres ?',
          'One source gives 50 to 60% for an undershot wheel, another about 85%. What should you do with these two figures?',
        ),
        choices: [
          l(
            'Prendre le plus haut : une roue bien faite atteint toujours 85 %',
            'Take the higher one: a well-made wheel simply reaches 85% in practice',
          ),
          l(
            'Garder les deux fourchettes : la roue du labo est réglée dessus',
            'Keep both ranges: the lab’s wheel is set on them, it settles nothing',
          ),
          l(
            'Faire confiance au modèle du labo, qui calcule la vraie valeur de la roue',
            'Trust the lab’s model, which calculates the true value of the wheel from physics',
          ),
        ],
        answer: 1,
        explain: l(
          'Les sources divergent, surtout pour la roue de poitrine, et le labo n’a pas de loi qui les départage : sa roue est réglée sur leurs fourchettes, ce n’est pas un résultat indépendant. La roue par-dessous du modèle, à pales plates, reste sous les deux sources.',
          'The sources differ, most for the breastshot wheel, and the lab has no law that decides between them: its wheel is set on their ranges, it is not an independent result. The model’s undershot wheel, with flat paddles, stays under both sources.',
        ),
      },
      {
        q: l(
          'Pourquoi une roue demande-t-elle un multiplicateur bien plus fort qu’une vis ?',
          'Why does a wheel need a much stronger speed multiplier than a screw?',
        ),
        choices: [
          l(
            'Elle tourne bien plus lentement, pour la même vitesse de génératrice',
            'It turns much more slowly, for the same generator speed',
          ),
          l(
            'Elle est plus lourde et plus grande, donc il faut plus d’engrenages pour l’entraîner',
            'It is heavier and bigger, so more gears are needed to drive it',
          ),
          l(
            'Sa génératrice est plus grosse et plus exigeante, donc elle demande plus de tours',
            'Its generator is bigger and more demanding, so it asks for more turns',
          ),
        ],
        answer: 0,
        explain: lx(
          'Le rapport est la vitesse voulue à la génératrice divisée par celle de la machine : plus la machine est lente, plus il est grand. Il faut {ratioWheelLow} à {ratioWheelHigh} pour une roue (modèle), contre {ratio} pour la vis (dérivé), donc un étage de plus et des pertes en plus.',
          'The ratio is the speed wanted at the generator divided by the machine’s: the slower the machine, the bigger it is. It takes {ratioWheelLow} to {ratioWheelHigh} for a wheel (model), against {ratio} for the screw (derived), so one more stage and more losses.',
        ),
      },
    ],
  },

  // ------------------------------------------------------------------------------------------------ 6. the year of the mill
  {
    id: 'mill-year',
    title: l('L’année du moulin', 'The year of the mill'),
    summary: l(
      'La rivière varie, garde sa part et arrête la machine en basses eaux comme en crue. Une année type, tirée par le calcul, pas mesurée.',
      'The river varies, keeps its share, and stops the machine in low water and in flood. A typical year, drawn by calculation, not measured.',
    ),
    body: [
      lx(
        'Une rivière n’a pas un débit mais un par jour : la centrale d’une autre vidéo s’arrête deux à quatre mois en été. Le labo tire trois années types (ruisseau, bief, rivière) d’ordres de grandeur : ce ne sont pas des mesures. Sur le bief, qui coule à {meanRaceLs} L/s en moyenne (estimation), la moitié des jours apporte moins de {medianLs} L/s (résultat du modèle).',
        'A river has not one flow but one a day: the plant of another video stops for two to four months in summer. The lab draws three typical years (brook, mill race, river) from orders of magnitude: they are not measurements. On the race, which flows at {meanRaceLs} L/s on average (estimate), half the days bring less than {medianLs} L/s (model result).',
      ),
      lx(
        'Avant de produire, il faut un **droit d’eau**, et les démarches prennent parfois des années. Une part de l’eau, le **débit réservé**, doit rester dans la rivière, et les poissons doivent pouvoir passer. Ces règles dépendent du pays : l’autorité de l’eau fixe les valeurs site par site ; le labo suppose un dixième du débit moyen, soit {reservedLs} L/s (hypothèse).',
        'Before producing anything you need a **water right**, and the paperwork can take years. A share of the water, the **reserved flow**, must stay in the river, and fish must be able to pass. These rules depend on the country: the water authority sets the values site by site; the lab assumes a tenth of the mean flow, that is {reservedLs} L/s (assumption).',
      ),
      lx(
        'Deux situations arrêtent la machine. En **basses eaux**, l’eau disponible, débit réservé laissé, tombe sous {lowCutPct} % de son débit de calcul (hypothèse) : {daysLow} jours dans l’année tirée (résultat du modèle). En **crue**, l’eau d’aval monte et mange la chute ; au-delà de {floodFactor} fois le débit médian (hypothèse), la vanne se ferme. Ne vous approchez jamais d’un canal en crue.',
        'Two situations stop the machine. In **low water**, the water available, reserved flow left behind, falls under {lowCutPct}% of its design flow (assumption): {daysLow} days in the drawn year (model result). In a **flood**, the water downstream rises and eats the head; beyond {floodFactor} times the median flow (assumption), the gate closes. Never go near a canal in flood.',
      ),
      lx(
        'Sur l’année tirée, la machine produit {yearKwh} **kilowattheures** (un kWh, c’est 1 kW pendant une heure). Son **facteur de charge**, l’énergie de l’année rapportée à celle de sa puissance nominale tenue sans arrêt, est de {cf} % (résultats du modèle). Décembre à février font {winterShare} % de l’année et {winter} % de l’énergie : l’hiver aide un peu, quand le solaire manque.',
        'Over the drawn year the machine produces {yearKwh} **kilowatt-hours** (one kWh is 1 kW for an hour). Its **capacity factor**, the year’s energy compared with that of its rated power held without a break, is {cf}% (model results). December to February make up {winterShare}% of the year and {winter}% of the energy: winter helps a little, when solar is short.',
      ),
    ],
    figures: [
      chip('Énergie de l’année tirée (modèle)', 'Energy of the drawn year (model)', '{yearKwh} kWh'),
      chip('Facteur de charge (modèle)', 'Capacity factor (model)', '{cf} %', '{cf}%'),
      chip('Arrêt en basses eaux (modèle)', 'Stopped in low water (model)', '{daysLow} jours', '{daysLow} days'),
    ],
    formula: 'CF = E / (P · 8760 h)',
    focus: { scene: 'site', part: 'reserved-flow-notch', preset: 'full-size', scenario: 'low-water' },
    video: '20:36',
    quiz: [
      {
        q: l('Qu’est-ce que le débit réservé ?', 'What is the reserved flow?'),
        choices: [
          l(
            'Le débit maximal que la vis peut avaler quand ses poches sont pleines et qu’elle tourne à sa vitesse',
            'The largest flow the screw can swallow when its pockets are full and it turns at its speed',
          ),
          l(
            'La part de l’eau qui doit rester dans la rivière, même si on pourrait tout prendre',
            'The share of the water that must stay in the river, even if one could take it all',
          ),
          l(
            'L’eau mise de côté dans le bief pour faire tourner la vis les jours sans pluie, en été',
            'The water set aside in the race to keep the screw turning on days without rain, in summer',
          ),
        ],
        answer: 1,
        explain: lx(
          'L’autorité de l’eau le fixe, site par site. Le labo suppose un dixième du débit moyen, {reservedLs} L/s (hypothèse : aucune de ses sources ne donne cette règle), et la machine s’arrête plutôt que de le prendre.',
          'The water authority sets it, site by site. The lab assumes a tenth of the mean flow, {reservedLs} L/s (assumption: none of its sources gives that rule), and the machine stops rather than take it.',
        ),
      },
      {
        q: l(
          'Pourquoi une crue arrête-t-elle la machine alors qu’il y a bien plus d’eau ?',
          'Why does a flood stop the machine when there is far more water?',
        ),
        choices: [
          l('Parce que l’eau d’aval monte et mange la chute', 'Because the water downstream rises and eats the head'),
          l(
            'Parce que la vis ne peut pas tourner dans une eau aussi haute',
            'Because the screw cannot turn in such high water',
          ),
          l(
            'Parce que la vis s’emballe dès qu’il y a trop d’eau en amont',
            'Because the screw runs away as soon as there is too much water upstream',
          ),
        ],
        answer: 0,
        explain: lx(
          'La puissance dépend de la chute autant que du débit. À la limite où la vanne se ferme, l’eau d’aval a monté de {tailGate} m (modèle) et il ne reste que {headLeft} m de chute sur {head} m (hypothèse).',
          'Power depends on the head as much as on the flow. At the limit where the gate closes, the water downstream has risen by {tailGate} m (model) and only {headLeft} m of head is left out of {head} m (assumption).',
        ),
      },
      {
        q: lx(
          'Dans le modèle, le facteur de charge de l’année tirée est de {cf} %. Cela veut dire que…',
          'In the model, the capacity factor of the drawn year is {cf}%. That means…',
        ),
        choices: [
          l(
            'la machine tourne un peu plus de la moitié du temps, et elle s’arrête tout le reste de l’année',
            'the machine runs a little over half the time and stands idle all the rest of the year',
          ),
          l(
            'la machine transforme en électricité un peu plus de la moitié de l’énergie que l’eau lui apporte',
            'the machine turns a little over half of the energy the water brings it into electricity',
          ),
          l(
            'l’énergie de l’année vaut un peu plus de la moitié de celle de sa puissance nominale en continu',
            'the year’s energy is a little over half of what its rated power would give non-stop',
          ),
        ],
        answer: 2,
        explain: lx(
          'Ici {meanKw} kW en moyenne sur {ratedKw} kW de puissance nominale. La machine tourne {hours} heures sur 8 760, bien plus que la moitié du temps, mais souvent sous sa puissance nominale ; et son rendement est un autre nombre, {etaAll} % (résultats du modèle).',
          'Here {meanKw} kW on average out of {ratedKw} kW of rated power. The machine runs {hours} hours out of 8,760, well over half the time, but often below its rated power; and its efficiency is another figure, {etaAll}% (model results).',
        ),
      },
    ],
  },
];
