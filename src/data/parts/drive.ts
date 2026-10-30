// Parts of the `screw` world, second part (ids frozen in src/part-ids.ts): the drive, a SPEED MULTIPLIER in two stages. The screw turns at
// 30 to 60 rpm (the video) and the generator wants several hundred: a slow stage of chain (the sprocket on the screw and the counter sprocket)
// onto the countershaft, then a fast stage of belt (the large pulley on the countershaft and the small pulley on the generator).
//
// Why chain, then belt (research §8, decision 7): the highest torque is on the slow side, where a chain, which cannot slip, carries it
// best; the belt, quiet and forgiving, takes the small torque of the fast side. The video mentions both, a sprocket with a chain next to the
// multiplier and a belt-and-pulley system; the lab reads them as chain then belt, as the owner decided.
//
// Numbers: the ratios 3.3 and 3.3 are those that bring the generator to its rated 600 rpm at the design speed (src/sim/system.ts, derived);
// chain 98 % and belt 96 % are assumptions of the model (src/sim/machine.ts); speeds and torques are model results. The diameters of the
// sprockets and pulleys, when a sheet gives them, come from src/three/dims.ts. Conventions: see ./site.ts.
import type { PartInfo } from '@onigam/lab-kit/content';
import { l } from '@onigam/lab-kit/i18n';
import { lf, maint, sp, tf } from '../part-helpers';

export const DRIVE_PARTS: PartInfo[] = [
  {
    id: 'drive-sprocket',
    scene: 'screw',
    category: 'mechanical',
    name: l('Pignon de la vis', 'Drive sprocket'),
    short: l(
      'Grand pignon sur l’arbre de la vis : il reçoit la chaîne, premier étage du multiplicateur.',
      'Large sprocket on the screw’s shaft: it takes the chain, first stage of the speed multiplier.',
    ),
    description: lf(
      'Le pignon de la vis est une roue dentée fixée sur l’arbre, au bout haut de la vis. La chaîne s’y engrène : c’est par lui que la puissance sort de la machine. Dans la vidéo, une chaîne s’accroche à ce pignon et le multiplicateur est raccordé juste à côté. Il est grand, car il est sur l’arbre lent, là où le couple est le plus fort : {torqueScrew} N·m au point de calcul (résultat du modèle). Pour un même couple, la chaîne tire d’autant moins que le pignon est grand. Face à lui, un petit pignon de renvoi fait tourner l’arbre intermédiaire {chain} fois plus vite (dérivé).',
      'The drive sprocket is a toothed wheel fixed on the shaft, at the top end of the screw. The chain meshes on it: it is through it that the power leaves the machine. In the video, a chain hooks onto this sprocket and the multiplier is connected right beside it. It is large because it sits on the slow shaft, where the torque is greatest: {torqueScrew} N·m at the design point (model result). For the same torque, the chain pulls less the larger the sprocket. Facing it, a small counter sprocket makes the countershaft turn {chain} times faster (derived).',
    ),
    material: l('Acier, pignon à chaîne à rouleaux du commerce', 'Steel, roller-chain sprocket from the trade'),
    specs: [
      sp(
        'Rôle',
        'Role',
        l('sortie de la puissance de la vis vers la chaîne', 'taking the power out of the screw to the chain'),
      ),
      sp('Rapport de l’étage chaîne', 'Chain stage ratio', tf('derived', '{chain}', '{chain}')),
      sp('Vitesse', 'Speed', tf('model', '{rpm} tr/min', '{rpm} rpm')),
      sp('Couple', 'Torque', tf('model', '{torqueScrew} N·m', '{torqueScrew} N·m')),
      sp(
        'Tension de la chaîne',
        'Chain tension',
        l(
          'force = couple ÷ rayon du pignon : un grand pignon la réduit',
          'force = torque ÷ sprocket radius: a large sprocket reduces it',
        ),
      ),
    ],
    maintenance: maint(
      {
        failure:
          'Les dents s’usent en crochet, le pignon voile, la clavette prend du jeu, la vis de blocage se desserre ; une chaîne mal alignée ronge un flanc.',
        check:
          'Vanne fermée et arrêt complet, appuyez une règle contre les deux pignons : ils doivent être dans le même plan. Secouez la chaîne sur le pignon : des dents en « aileron de requin » ou une chaîne qui monte sur les dents disent l’usure.',
        care: 'Changez toujours pignons et chaîne ensemble, serrez la clavette et les vis de blocage au frein-filet, et fermez le tout dans un carter.',
      },
      {
        failure:
          'The teeth wear into hooks, the sprocket wobbles, the key gets play, the set screw loosens; a misaligned chain gnaws a flank.',
        check:
          'With the gate shut and a complete stop, hold a straightedge against the two sprockets: they must be in the same plane. Shake the chain on the sprocket: “shark-fin” teeth or a chain that rides up the teeth tell wear.',
        care: 'Always change sprockets and chain together, tighten the key and set screws with thread-lock, and enclose it all in a guard.',
      },
    ),
    tip: l(
      'Une chaîne en marche happe un doigt, un vêtement, des cheveux : carter fermé, pas de manche ample, arrêt et cadenas de la vanne avant d’y toucher.',
      'A running chain snatches a finger, a garment, hair: guard closed, no loose sleeves, gate stopped and padlocked before touching it.',
    ),
    video: ['22:36'],
    design: l(
      'Chaîne côté lent, courroie côté rapide : la chaîne, qui ne glisse pas, encaisse le gros couple, la courroie, silencieuse, convient au petit couple rapide. Les deux étages sont ce qui évite une seule énorme poulie.',
      'Chain on the slow side, belt on the fast side: the chain, which cannot slip, carries the big torque; the quiet belt suits the small, fast torque. The two stages are what avoid one enormous pulley.',
    ),
  },
  {
    id: 'chain',
    scene: 'screw',
    category: 'mechanical',
    name: l('Chaîne', 'Chain'),
    short: l(
      'Chaîne à rouleaux : elle transmet la puissance sans glisser, au premier étage.',
      'Roller chain: it carries the power without slipping, at the first stage.',
    ),
    description: lf(
      'La chaîne relie le grand pignon de la vis au petit pignon de renvoi. Elle ne glisse pas : chaque rouleau tombe dans un creux de denture, ce qui convient au couple de {torqueScrew} N·m de l’arbre lent (résultat du modèle). Son rendement est élevé : le modèle suppose {chainEff} % (hypothèse ; les études publiées citent des multiplicateurs au-delà de 95 %). Elle s’use pourtant, car chaque articulation frotte à chaque passage : elle s’allonge, demande de la graisse et se tend de temps en temps. La chaîne et la courroie ensemble perdent {lossDriveW} W sur {shaftKw} kW au point de calcul (résultat du modèle).',
      'The chain connects the large screw sprocket to the small counter sprocket. It does not slip: each roller drops into a tooth space, which suits the {torqueScrew} N·m of the slow shaft (model result). Its efficiency is high: the model assumes {chainEff}% (assumption; published studies cite multipliers above 95%). It still wears, because each joint rubs at every pass: it lengthens, wants grease and needs tightening from time to time. The chain and the belt together lose {lossDriveW} W out of {shaftKw} kW at the design point (model result).',
    ),
    material: l('Acier, chaîne à rouleaux du commerce', 'Steel, roller chain from the trade'),
    specs: [
      sp('Rendement', 'Efficiency', tf('assumed', '{chainEff} %', '{chainEff}%')),
      sp(
        'Rendement de la chaîne et de la courroie ensemble',
        'Efficiency of chain and belt together',
        tf('model', '{etaDrive} %', '{etaDrive}%'),
      ),
      sp('Puissance transmise', 'Power carried', tf('model', '{shaftKw} kW', '{shaftKw} kW')),
      sp(
        'Pertes de la chaîne et de la courroie',
        'Chain and belt losses',
        tf('model', '{lossDriveW} W', '{lossDriveW} W'),
      ),
      sp('Type', 'Type', tf('estimate', 'chaîne à rouleaux du commerce', 'roller chain from the trade')),
      sp(
        'Ne glisse pas',
        'Does not slip',
        l('oui : c’est son avantage sur la courroie', 'yes: this is its advantage over the belt'),
      ),
    ],
    maintenance: maint(
      {
        failure:
          'Allongement par usure des articulations, maillon dur, rouille, saut de dents, rupture : une chaîne qui saute ou casse peut fouetter autour d’elle.',
        check:
          'À l’arrêt, mesurez la flèche au milieu du brin : trop lâche, elle bat ; trop tendue, elle use les paliers. Les maillons doivent être souples, sans point dur ni rouille.',
        care: 'Huilez ou graissez avec un produit qui ne pollue pas la rivière, retendez, et changez la chaîne avant la limite d’allongement du fabricant.',
      },
      {
        failure:
          'Lengthening by joint wear, a stiff link, rust, skipped teeth, breakage: a chain that jumps or breaks can whip around.',
        check:
          'At rest, measure the sag in the middle of the run: too slack, it flaps; too tight, it wears the bearings. The links must be supple, with no tight spot or rust.',
        care: 'Oil or grease with a product that does not pollute the river, retighten, and change the chain before the maker’s limit of lengthening.',
      },
    ),
    tip: l(
      'Un carter ferme la chaîne : elle n’a aucune pitié pour les doigts, et l’huile qui en tombe finirait dans l’eau.',
      'A guard encloses the chain: it has no mercy for fingers, and the oil that drips from it would end up in the water.',
    ),
    video: ['22:36', '22:41'],
    design: l(
      'Le rendement de la chaîne compte peu devant celui du reste : la plupart des pertes sont ailleurs, dans la fuite par le jeu, le frottement de l’eau et la génératrice.',
      'The chain’s efficiency matters little next to the rest: most of the losses are elsewhere, in the leak through the gap, the friction of the water and the generator.',
    ),
  },
  {
    id: 'counter-sprocket',
    scene: 'screw',
    category: 'mechanical',
    name: l('Pignon de renvoi', 'Counter sprocket'),
    short: l(
      'Petit pignon de l’arbre intermédiaire : il tourne plus vite que la vis, avec moins de couple.',
      'Small sprocket on the countershaft: it turns faster than the screw, with less torque.',
    ),
    description: lf(
      'Le pignon de renvoi est le petit pignon de l’étage de chaîne, fixé sur l’arbre intermédiaire. Il a plus de dents en moins que le pignon de la vis, dans le rapport de {chain} (dérivé), donc il tourne {chain} fois plus vite : {countershaftRpm} tr/min contre {rpm} (résultat du modèle). Le couple est divisé d’autant : {countershaftTorque} N·m contre {torqueScrew} (résultat du modèle, pertes de la chaîne comprises). Comme il engrène moins de dents que le grand, il s’use plus vite et demande plus d’attention.',
      'The counter sprocket is the small sprocket of the chain stage, fixed on the countershaft. It has fewer teeth than the screw sprocket, in the ratio of {chain} (derived), so it turns {chain} times faster: {countershaftRpm} rpm against {rpm} (model result). The torque is divided by as much: {countershaftTorque} N·m against {torqueScrew} (model result, chain losses included). As it meshes fewer teeth than the large one, it wears faster and needs more attention.',
    ),
    material: l('Acier, pignon à chaîne à rouleaux du commerce', 'Steel, roller-chain sprocket from the trade'),
    specs: [
      sp('Rapport de l’étage chaîne', 'Chain stage ratio', tf('derived', '{chain}', '{chain}')),
      sp('Vitesse', 'Speed', tf('model', '{countershaftRpm} tr/min', '{countershaftRpm} rpm')),
      sp('Couple', 'Torque', tf('model', '{countershaftTorque} N·m', '{countershaftTorque} N·m')),
      sp(
        'Usure',
        'Wear',
        l(
          'plus rapide que le grand pignon : moins de dents en prise',
          'faster than the large sprocket: fewer teeth in mesh',
        ),
      ),
    ],
    maintenance: maint(
      {
        failure:
          'Les dents s’usent plus vite que celles du grand pignon, la clavette prend du jeu, le pignon se désaligne de celui de la vis.',
        check:
          'Regardez les dents à la lampe : un profil en crochet ou un bord brillant dit l’usure. Vérifiez l’alignement avec une règle posée contre les deux pignons.',
        care: 'Changez-le avec la chaîne, sans attendre de voir la chaîne sauter ; gardez le carter fermé.',
      },
      {
        failure:
          'The teeth wear faster than those of the large sprocket, the key gets play, the sprocket drifts out of line with the screw’s.',
        check:
          'Look at the teeth by torchlight: a hooked profile or a bright edge tells wear. Check alignment with a straightedge held against the two sprockets.',
        care: 'Change it with the chain, without waiting to see the chain jump; keep the guard closed.',
      },
    ),
    tip: l(
      'Quand la chaîne est neuve, le petit pignon est le premier à vouloir être changé : ne montez pas une chaîne neuve sur un pignon usé.',
      'When the chain is new, the small sprocket is the first to want changing: do not fit a new chain on a worn sprocket.',
    ),
    video: ['22:36'],
    design: l(
      'On ne gagne pas de puissance en multipliant la vitesse : on échange du couple contre de la vitesse, et l’on perd un peu au passage. La puissance reste, au frottement près.',
      'We gain no power by multiplying the speed: we trade torque for speed, and lose a little on the way. The power remains, friction apart.',
    ),
  },
  {
    id: 'countershaft',
    scene: 'screw',
    category: 'mechanical',
    name: l('Arbre intermédiaire', 'Countershaft'),
    short: l(
      'Arbre qui relie les deux étages : il reçoit la chaîne d’un côté et porte la grande poulie de l’autre.',
      'Shaft linking the two stages: it takes the chain on one side and carries the large pulley on the other.',
    ),
    description: lf(
      'L’arbre intermédiaire (ou de renvoi) est le lien entre les deux étages : sur un bout, le pignon de renvoi reçoit la chaîne ; sur l’autre, la grande poulie entraîne la courroie. Il tourne à {countershaftRpm} tr/min avec {countershaftTorque} N·m, entre la vis lente et la génératrice rapide (résultat du modèle). Pourquoi deux étages plutôt qu’un ? Un seul étage de {ratio} (dérivé : {chain} × {belt}) obligerait à une grande poulie plus de dix fois plus grande que la petite, et le modèle limite un étage à {stageMax} (hypothèse). Il tient sur deux paliers du commerce, alignés sur l’arbre de la vis.',
      'The countershaft is the link between the two stages: at one end the counter sprocket takes the chain; at the other the large pulley drives the belt. It turns at {countershaftRpm} rpm with {countershaftTorque} N·m, between the slow screw and the fast generator (model result). Why two stages rather than one? A single stage of {ratio} (derived: {chain} × {belt}) would need a large pulley more than ten times bigger than the small one, and the model limits one stage to {stageMax} (assumption). It sits on two bearings from the trade, aligned with the screw’s shaft.',
    ),
    material: l('Acier, arbre plein sur deux paliers', 'Steel, solid shaft on two bearings'),
    specs: [
      sp('Vitesse', 'Speed', tf('model', '{countershaftRpm} tr/min', '{countershaftRpm} rpm')),
      sp('Couple', 'Torque', tf('model', '{countershaftTorque} N·m', '{countershaftTorque} N·m')),
      sp(
        'Vitesses citées par la vidéo',
        'Speeds named by the video',
        l('vis de 30 à 60 tr/min, génératrice de plusieurs centaines', 'screw 30 to 60 rpm, generator several hundred'),
      ),
      sp(
        'Rapport total, vis → génératrice',
        'Total ratio, screw → generator',
        tf('derived', '{ratio} ({chain} × {belt})', '{ratio} ({chain} × {belt})'),
      ),
      sp('Rapport maximal d’un étage', 'Largest ratio of one stage', tf('assumed', '{stageMax}', '{stageMax}')),
      sp(
        'Une roue à la place de la vis',
        'A wheel instead of the screw',
        tf(
          'model',
          'il faudrait un rapport de {ratioWheelLow} à {ratioWheelHigh}',
          'a ratio of {ratioWheelLow} to {ratioWheelHigh} would be needed',
        ),
      ),
      sp(
        'Même eau dans une roue (comparaison)',
        'Same water in a wheel (comparison)',
        tf(
          'model',
          '{wheelOverKw} / {wheelBreastKw} / {wheelUnderKw} kW (par-dessus / de poitrine / par-dessous) au lieu de {elecKw} kW ; modèle ancré sur des sources qui divergent',
          '{wheelOverKw} / {wheelBreastKw} / {wheelUnderKw} kW (overshot / breastshot / undershot) instead of {elecKw} kW; model anchored on sources that disagree',
        ),
      ),
    ],
    maintenance: maint(
      {
        failure:
          'Un roulement fatigué, une clavette qui prend du jeu, un désalignement des deux étages ; un arbre qui plie sous la tension de la courroie.',
        check:
          'À l’arrêt, secouez l’arbre : aucun jeu. Mise en route, écoutez-le : un grondement ou une chaleur anormale d’un palier annonce une usure.',
        care: 'Graissez les paliers, contrôlez les clavettes et l’alignement du pignon et de la poulie, serrez la visserie.',
      },
      {
        failure:
          'A tired bearing, a key with play, a misalignment of the two stages; a shaft that bends under the belt tension.',
        check:
          'At rest, shake the shaft: no play. At start-up, listen to it: a rumble or an abnormal heat from a bearing announces wear.',
        care: 'Grease the bearings, check the keys and the alignment of sprocket and pulley, tighten the fasteners.',
      },
    ),
    tip: l(
      'Le rapport total est le produit des deux étages, pas leur somme : 3,3 fois 3,3, et non 3,3 plus 3,3. Changer un seul étage change tout.',
      'The total ratio is the product of the two stages, not their sum: 3.3 times 3.3, not 3.3 plus 3.3. Changing one stage changes everything.',
    ),
    video: ['22:36'],
    design: lf(
      'Une roue de moulin tourne à 10 ou 20 tours par minute : elle exigerait un rapport de {ratioWheelLow} à {ratioWheelHigh} (résultat du modèle). La vis, plus rapide, se contente de {ratio} (dérivé), ce que dit la vidéo : un multiplicateur plus petit.',
      'A mill wheel turns at 10 or 20 revolutions a minute: it would need a ratio of {ratioWheelLow} to {ratioWheelHigh} (model result). The screw, faster, makes do with {ratio} (derived), which is what the video says: a smaller multiplier.',
    ),
  },
  {
    id: 'pulley-large',
    scene: 'screw',
    category: 'mechanical',
    name: l('Grande poulie', 'Large pulley'),
    short: l(
      'Grande poulie de l’arbre intermédiaire : elle entraîne la courroie, second étage du multiplicateur.',
      'Large pulley on the countershaft: it drives the belt, second stage of the multiplier.',
    ),
    description: lf(
      'La grande poulie est fixée sur l’arbre intermédiaire et fait tourner la courroie. Elle est {belt} fois plus grande que la petite poulie de la génératrice (dérivé), et c’est ce quotient de diamètres qui fait passer la vitesse de {countershaftRpm} à {genRpm} tr/min (résultat du modèle et hypothèse : {genRpm} tr/min est la vitesse nominale que le modèle donne à la génératrice). Sur une grande poulie, la courroie s’enroule sur un grand arc et fléchit peu : elle y adhère bien et s’y use lentement.',
      'The large pulley is fixed on the countershaft and sets the belt moving. It is {belt} times larger than the generator’s small pulley (derived), and it is this quotient of diameters that takes the speed from {countershaftRpm} to {genRpm} rpm (model result and assumption: {genRpm} rpm is the rated speed the model gives the generator). On a large pulley the belt wraps over a large arc and bends little: it grips well and wears slowly.',
    ),
    material: l('Acier ou fonte, poulie à gorge du commerce', 'Steel or cast iron, grooved pulley from the trade'),
    specs: [
      sp('Rapport de l’étage courroie', 'Belt stage ratio', tf('derived', '{belt}', '{belt}')),
      sp('Vitesse', 'Speed', tf('model', '{countershaftRpm} tr/min', '{countershaftRpm} rpm')),
      sp('Couple', 'Torque', tf('model', '{countershaftTorque} N·m', '{countershaftTorque} N·m')),
      sp(
        'Vitesse visée à la génératrice',
        'Target speed at the generator',
        tf('assumed', '{genRpm} tr/min', '{genRpm} rpm'),
      ),
    ],
    maintenance: maint(
      {
        failure:
          'Les gorges se polissent ou s’usent, la poulie voile, la clavette prend du jeu ; de l’huile ou de l’eau sur les gorges fait glisser la courroie.',
        check:
          'Vanne fermée, tournez la poulie et regardez-la de face : pas de voile. Passez le doigt dans les gorges (arrêt complet) : pas d’arête, pas de brillant.',
        care: 'Nettoyez les gorges au chiffon sec, gardez-les propres d’huile, remplacez la poulie avec la courroie si les gorges sont usées.',
      },
      {
        failure:
          'The grooves polish or wear, the pulley wobbles, the key gets play; oil or water on the grooves makes the belt slip.',
        check:
          'With the gate shut, turn the pulley and look at it face on: no wobble. Run a finger along the grooves (full stop): no ridge, no shine.',
        care: 'Clean the grooves with a dry cloth, keep them free of oil, replace the pulley with the belt if the grooves are worn.',
      },
    ),
    tip: l(
      'Le rapport est un quotient de diamètres : doubler le diamètre de la grande poulie double le rapport. Avant de changer une poulie, refaites le compte de la vitesse de la génératrice.',
      'The ratio is a quotient of diameters: doubling the large pulley’s diameter doubles the ratio. Before changing a pulley, redo the sum of the generator’s speed.',
    ),
    video: ['36:15'],
    design: l(
      'Une grande poulie pour peu de couple : le second étage est léger, silencieux et sans lubrification. C’est ce que la courroie sait faire de mieux.',
      'A large pulley for little torque: the second stage is light, quiet and unlubricated. It is what a belt does best.',
    ),
  },
  {
    id: 'belt',
    scene: 'screw',
    category: 'mechanical',
    name: l('Courroie', 'Belt'),
    short: l(
      'Courroie du second étage : elle multiplie encore la vitesse, sans bruit, et glisse avant de casser.',
      'Belt of the second stage: it multiplies the speed again, quietly, and slips before breaking.',
    ),
    description: lf(
      'La courroie relie la grande poulie à la petite et multiplie encore la vitesse, jusqu’à {genRpm} tr/min à la génératrice (hypothèse : la vidéo dit « plusieurs centaines de tours par minute »). Elle n’est pas rigide : elle glisse si la génératrice se bloque, ce qui la protège un peu, mais son rendement est plus faible que celui de la chaîne, {beltEff} % (hypothèse), et il faut la tendre. Un mauvais rapport se paie vite : trop petit, la vis tourne à {beltLowRpm} tr/min et produit {beltLowEl} kW ; trop grand, elle est freinée à {beltHighRpm} tr/min et ne donne que {beltHighEl} kW (résultat du modèle, au lieu de {elecKw} kW). Une turbine à flux traversant de 30 kW, dans une autre vidéo, a une courroie plate d’un rapport d’environ 2,6.',
      'The belt links the large pulley to the small one and multiplies the speed again, up to {genRpm} rpm at the generator (assumption: the video says “several hundred revolutions a minute”). It is not rigid: it slips if the generator seizes, which protects it a little, but its efficiency is lower than the chain’s, {beltEff}% (assumption), and it must be tensioned. A wrong ratio is paid for fast: too small, the screw turns at {beltLowRpm} rpm and produces {beltLowEl} kW; too large, it is held back to {beltHighRpm} rpm and gives only {beltHighEl} kW (model result, instead of {elecKw} kW). A 30 kW crossflow turbine, in another video, has a flat belt with a ratio of about 2.6.',
    ),
    material: l(
      'Caoutchouc armé, courroie trapézoïdale ou plate du commerce',
      'Reinforced rubber, V-belt or flat belt from the trade',
    ),
    specs: [
      sp('Rendement', 'Efficiency', tf('assumed', '{beltEff} %', '{beltEff}%')),
      sp('Vitesse de sortie', 'Output speed', tf('assumed', '{genRpm} tr/min', '{genRpm} rpm')),
      sp(
        'Rapport trop petit (× 0,45)',
        'Ratio too small (× 0.45)',
        tf('model', 'vis à {beltLowRpm} tr/min, {beltLowEl} kW', 'screw at {beltLowRpm} rpm, {beltLowEl} kW'),
      ),
      sp(
        'Rapport trop grand (× 1,9)',
        'Ratio too large (× 1.9)',
        tf('model', 'vis à {beltHighRpm} tr/min, {beltHighEl} kW', 'screw at {beltHighRpm} rpm, {beltHighEl} kW'),
      ),
      sp(
        'Turbine de 30 kW (autre vidéo)',
        '30 kW turbine (another video)',
        l('courroie plate, 380 → 990 tr/min, rapport environ 2,6', 'flat belt, 380 → 990 rpm, ratio about 2.6'),
      ),
    ],
    maintenance: maint(
      {
        failure:
          'La courroie s’use, craquelle, s’étire ou glisse : un sifflement, une odeur de caoutchouc, une poussière noire autour. Mal tendue, elle patine ; trop tendue, elle abîme les roulements.',
        check:
          'À l’arrêt complet, appuyez sur le brin au milieu : la flèche doit être modérée. Regardez les flancs : brillants, craquelés ou effilochés disent qu’il faut la changer.',
        care: 'Retendez après les premières heures, éloignez l’huile et l’eau, changez la courroie avant qu’elle ne casse, et tenez-la sous un carter.',
      },
      {
        failure:
          'The belt wears, cracks, stretches or slips: a squeal, a smell of rubber, black dust around. Too slack, it slips; too tight, it damages the bearings.',
        check:
          'At a full stop, press on the run in the middle: the sag must be moderate. Look at the flanks: shiny, cracked or frayed means it must be changed.',
        care: 'Retension after the first hours, keep oil and water away, change the belt before it breaks, and keep it under a guard.',
      },
    ),
    tip: l(
      'Une courroie happe aussi : carter fermé, pas de manche ample, vanne verrouillée avant d’y toucher. Une courroie qui siffle à vide est une courroie trop lâche.',
      'A belt snatches too: guard closed, no loose sleeves, gate locked before touching it. A belt that squeals at no load is a belt too slack.',
    ),
    video: ['36:06', '36:15'],
    design: l(
      'La vidéo l’explique bien : on choisit une génératrice qui tourne relativement lentement pour simplifier les transmissions, car plus vite, il faudrait un système plus compliqué, donc plus de pertes. Tout est compromis.',
      'The video explains it well: a generator that turns relatively slowly is chosen to simplify the transmissions, because faster, a more complicated system would be needed, hence more losses. Everything is a compromise.',
    ),
  },
  {
    id: 'pulley-small',
    scene: 'screw',
    category: 'mechanical',
    name: l('Petite poulie', 'Small pulley'),
    short: l(
      'Petite poulie sur l’arbre de la génératrice : elle tourne vite, avec peu de couple.',
      'Small pulley on the generator’s shaft: it turns fast, with little torque.',
    ),
    description: lf(
      'La petite poulie est fixée sur l’arbre de la génératrice. Dans la vidéo, la vis tourne de 30 à 60 tr/min et la génératrice en demande plusieurs centaines : c’est le travail du multiplicateur. Elle tourne {belt} fois plus vite que la grande (dérivé) : {genRpm} tr/min (hypothèse du modèle), avec seulement {torqueGen} N·m (résultat du modèle), contre {torqueScrew} N·m à la vis. C’est tout l’intérêt du multiplicateur : la même puissance, sous un couple plus de dix fois plus petit, que la génératrice sait prendre. Sans lui, il faudrait une génératrice plus de dix fois plus lourde, ou un bobinage plus de dix fois plus fin. Une poulie ne doit pas être trop petite : la courroie qui s’enroule sur un trop faible rayon se fatigue vite.',
      'The small pulley is fixed on the generator’s shaft. In the video, the screw turns at 30 to 60 rpm and the generator wants several hundred: that is the multiplier’s job. It turns {belt} times faster than the large one (derived): {genRpm} rpm (model assumption), with only {torqueGen} N·m (model result), against {torqueScrew} N·m at the screw. This is the whole point of the multiplier: the same power, under a torque more than ten times smaller, which the generator can take. Without it, the generator would have to be more than ten times heavier, or wound more than ten times finer. A pulley must not be too small: a belt that wraps over too small a radius tires quickly.',
    ),
    material: l('Acier ou aluminium, poulie à gorge du commerce', 'Steel or aluminium, grooved pulley from the trade'),
    specs: [
      sp('Vitesse', 'Speed', tf('assumed', '{genRpm} tr/min', '{genRpm} rpm')),
      sp('Couple à la génératrice', 'Torque at the generator', tf('model', '{torqueGen} N·m', '{torqueGen} N·m')),
      sp('Couple à la vis', 'Torque at the screw', tf('model', '{torqueScrew} N·m', '{torqueScrew} N·m')),
      sp('Rapport de l’étage courroie', 'Belt stage ratio', tf('derived', '{belt}', '{belt}')),
      sp('Rapport total', 'Total ratio', tf('derived', '{ratio}', '{ratio}')),
    ],
    maintenance: maint(
      {
        failure:
          'Les gorges s’usent, la poulie voile, la clavette ou la vis de blocage prend du jeu, ce qui fait tourner la poulie sur l’arbre ; un mauvais alignement avec la grande poulie ronge un flanc de courroie.',
        check:
          'À l’arrêt, tournez la poulie à la main et regardez-la de face : pas de voile. Alignez une règle sur les deux poulies : mêmes plans.',
        care: 'Serrez la vis de blocage au frein-filet, nettoyez les gorges, remplacez la poulie avec la courroie quand elle est usée.',
      },
      {
        failure:
          'The grooves wear, the pulley wobbles, the key or set screw gets play so that the pulley turns on the shaft; a misalignment with the large pulley gnaws a belt flank.',
        check:
          'At rest, turn the pulley by hand and look at it face on: no wobble. Lay a straightedge across both pulleys: same planes.',
        care: 'Tighten the set screw with thread-lock, clean the grooves, replace the pulley with the belt when it is worn.',
      },
    ),
    tip: l(
      'Cette poulie tourne à plus de dix fois la vitesse de la vis : un défaut d’équilibre qui ne se voit pas sur la vis se sent ici. Elle doit tourner rond.',
      'This pulley turns at over ten times the screw’s speed: an imbalance that does not show on the screw is felt here. It must run true.',
    ),
    video: ['36:15'],
    design: l(
      'La petite poulie est la plus rapide et la plus légère de toute la chaîne mécanique : elle fait le lien entre l’eau, lente et lourde, et l’électricité, rapide et légère.',
      'The small pulley is the fastest and lightest of the whole mechanical chain: it is the link between the water, slow and heavy, and the electricity, fast and light.',
    ),
  },
];
