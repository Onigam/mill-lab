import { getLang, registerStrings, tx, type CommonKey } from '@onigam/lab-kit/i18n';

// The lab's own interface strings, `key: [fr, en]`. The ones every lab shares (modes, toolbar, panels,
// guides) live in the kit; add here only what is specific to this lab.

const LAB = {
  tagline: ['Explorer · Comprendre · Construire', 'Explore · Understand · Build'],
  plansIntro: [
    'Planches A3 générées à partir des cotes du modèle 3D.',
    'A3 sheets generated from the 3D model dimensions.',
  ],
  lessonsIntro: ['Leçons courtes liées à la 3D.', 'Short lessons tied to the 3D view.'],
  disclaimer: [
    'Reconstitution pédagogique indépendante. Ce n’est pas un plan officiel.',
    'Independent educational reconstruction. It is not an official drawing.',
  ],
  sceneDevice: ['Dispositif', 'Device'],
  groupDevice: ['Dispositif', 'Device'],

  // ---- simulation panel: introduction, starting points, scenarios
  simTitle: ['Simulation', 'Simulation'],
  simIntro: [
    'Une vis d’Archimède dans le bief d’un moulin : l’eau tombe de la hauteur du site, la vis tourne lentement, une chaîne puis une courroie font monter la vitesse jusqu’à la génératrice, qui charge la batterie. Tout ce qui est affiché est calculé par les équations, rien n’est tracé à la main.',
    'An Archimedes screw in a mill race: the water falls through the head of the site, the screw turns slowly, a chain then a belt raise the speed up to the generator, which charges the battery. Everything shown is computed by the equations, nothing is drawn by hand.',
  ],
  preset: ['Point de départ', 'Starting point'],
  presetFullSize: ['Moulin, pleine taille', 'Mill, full size'],
  presetPrototype: ['Prototype d’environ 200 W', 'Prototype of about 200 W'],
  presetBrook: ['Petit ruisseau', 'Small brook'],
  presetRiver: ['Rivière avec un seuil', 'River with a weir'],
  custom: ['Personnalisé', 'Custom'],
  resetSim: ['Recommencer', 'Start over'],
  scenarios: ['Scénarios', 'Scenarios'],
  scenarioHint: [
    'Chaque scénario règle le site et la machine, puis change une chose en direct. La vitesse du temps (bas de l’écran) fait défiler les saisons ; le ralenti de la barre d’outils suit la rotation.',
    'Each scenario sets the site and the machine, then changes one thing live. The time speed (bottom of the screen) runs through the seasons; the slow motion of the toolbar follows the rotation.',
  ],
  scenarioLowWater: ['Basses eaux : la rivière baisse', 'Low water: the river falls'],
  scenarioFlood: ['Crue : la vanne se ferme', 'Flood: the gate closes'],
  scenarioDebris: ['Feuilles et branches : la grille se colmate', 'Leaves and branches: the rack clogs'],
  scenarioTooFast: ['Vis trop rapide', 'Screw too fast'],
  scenarioTooSlow: ['Vis trop lente', 'Screw too slow'],
  scenarioWrongRatio: ['Mauvais rapport de transmission', 'Wrong drive ratio'],
  scenarioRough: ['Parois rouillées ou rugueuses', 'Rusty or rough surfaces'],
  scenarioWheel: ['Une roue à la place de la vis', 'A wheel instead of the screw'],
  scenarioPrototype: ['Prototype puis pleine taille', 'Prototype, then full size'],

  // ---- status line
  statusRunning: [
    'La vis tourne : l’eau remplit les godets, les godets descendent et la génératrice charge la batterie.',
    'The screw turns: the water fills the buckets, the buckets go down and the generator charges the battery.',
  ],
  statusWheelRunning: [
    'La roue tourne et charge la batterie. Comparez sa vitesse, son rendement et le rapport de transmission qu’elle exige avec ceux de la vis.',
    'The wheel turns and charges the battery. Compare its speed, its efficiency and the drive ratio it demands with the screw’s.',
  ],
  statusLowWater: [
    'Basses eaux : il ne reste plus assez d’eau une fois le débit réservé laissé à la rivière. La vanne est fermée et la vis s’arrête.',
    'Low water: not enough is left once the reserved flow stays in the river. The gate is shut and the screw stops.',
  ],
  statusFlood: [
    'Crue : la rivière est trop haute, l’eau en aval remonte et mange la chute. La vanne est fermée.',
    'Flood: the river is too high, the water downstream rises and eats the head. The gate is shut.',
  ],
  statusClosed: ['La vanne est fermée : rien ne passe.', 'The gate is shut: nothing passes.'],
  statusNoStart: [
    'La machine ne démarre pas : la chute qui reste est trop faible pour vaincre les pertes.',
    'The machine does not start: the head that is left is too small to beat the losses.',
  ],
  statusTooFast: [
    'Vis trop rapide : les godets restent à moitié vides, les frottements montent et l’eau est brassée. Ralentissez-la ou changez le rapport de transmission.',
    'Screw too fast: the buckets stay half empty, friction rises and the water is churned. Slow it down or change the drive ratio.',
  ],
  statusTooSlow: [
    'Vis trop lente : les godets sont pleins, le surplus déborde et descend sans rien produire.',
    'Screw too slow: the buckets are full, the surplus overflows and falls without producing anything.',
  ],
  statusNoCharge: [
    'La génératrice ne charge pas : à cette vitesse sa tension reste sous celle de la batterie. La vis s’emballe à vide.',
    'The generator is not charging: at this speed its voltage stays under the battery’s. The screw runs away unloaded.',
  ],
  statusRack: [
    'La grille s’est colmatée : elle mange une partie de la chute. La vis, elle, n’a pas besoin de grille.',
    'The rack has clogged: it eats part of the head. The screw does not need a rack.',
  ],
  statusOutOfRange: [
    'Cette roue sort de la plage de chute où on l’emploie : le résultat vaut pour la comparaison, pas pour un projet.',
    'This wheel is outside the heads where it is used: the result is for comparison, not for a project.',
  ],

  // ---- live readouts
  liveElectric: ['Électricité', 'Electricity'],
  liveWater: ['Puissance eau', 'Water power'],
  liveEfficiency: ['Rendement', 'Efficiency'],
  liveSpeed: ['Vitesse', 'Speed'],
  liveFill: ['Remplissage', 'Filling'],
  liveFlow: ['Débit', 'Flow'],
  liveHead: ['Chute nette', 'Net head'],
  liveMachineEff: ['Rendement de la machine', 'Efficiency of the machine'],
  liveShaft: ['Puissance sur l’arbre', 'Power on the shaft'],
  liveTorque: ['Couple sur l’arbre', 'Torque on the shaft'],
  liveGenSpeed: ['Vitesse de la génératrice', 'Generator speed'],
  liveVolts: ['Tension à vide de la génératrice', 'Open-circuit voltage of the generator'],
  liveCurrent: ['Courant vers la batterie', 'Current to the battery'],
  liveBypass: ['Eau qui passe par le déversoir', 'Water that goes over the weir'],
  liveReserved: ['Débit réservé à la rivière', 'Reserved flow left in the river'],
  liveSpeedRule: ['Vitesse de la machine / règle', 'Machine speed / rule'],
  liveDrawdown: ['Chute perdue par baisse du plan d’eau', 'Head lost as the pool level falls'],
  liveOverflow: ['Débordement', 'Overflow'],
  liveLeak: ['Fuite par le jeu', 'Leak through the gap'],
  liveDay: ['Jour de l’année', 'Day of the year'],
  liveEnergyToday: ['Énergie du jour', 'Energy of the day'],
  liveEnergyRun: ['Énergie depuis le début', 'Energy since the start'],
  unitRpm: ['tr/min', 'rpm'],
  unitLs: ['L/s', 'L/s'],
  unitM3s: ['m³/s', 'm³/s'],
  unitKwhYear: ['kWh par an', 'kWh a year'],
  unitMetre: ['m', 'm'],

  // ---- where the water power goes
  chainTitle: ['Où va la puissance de l’eau', 'Where the power of the water goes'],
  chainHint: [
    'Une barre : toute la puissance de l’eau qui arrive. Le vert est l’électricité qui entre dans la batterie ; le reste est perdu à chaque étage, dans l’ordre où l’eau et l’arbre le rencontrent.',
    'One bar: all the power of the water that arrives. Green is the electricity that enters the battery; the rest is lost at each stage, in the order the water and the shaft meet them.',
  ],
  chainElectric: ['Électricité', 'Electricity'],
  chainGenerator: ['Génératrice', 'Generator'],
  chainDrive: ['Chaîne et courroie', 'Chain and belt'],
  chainOutlet: ['Sortie de la vis', 'Outlet of the screw'],
  chainFriction: ['Frottements', 'Friction'],
  chainLeak: ['Fuites et débordement', 'Leaks and overflow'],
  chainInlet: ['Entrée', 'Inlet'],
  chainMachineOfWater: ['machine / eau', 'machine / water'],
  chainElectricOfShaft: ['électricité / arbre', 'electricity / shaft'],

  // ---- controls: site
  secSite: ['Le site et l’eau', 'The site and the water'],
  siteSelect: ['Cours d’eau', 'Watercourse'],
  siteBrook: ['Petit ruisseau', 'Small brook'],
  siteRace: ['Bief de moulin', 'Mill race'],
  siteRiver: ['Rivière', 'River'],
  siteHint: [
    'Chaque cours d’eau a son année : de l’eau en hiver et au printemps, des basses eaux l’été, quelques crues. Elle est tirée une fois pour toutes, la même à chaque visite.',
    'Each watercourse has its own year: water in winter and spring, low water in summer, a few floods. It is drawn once and for all, the same at every visit.',
  ],
  head: ['Chute du site', 'Head of the site'],
  headHint: [
    'La différence de niveau entre l’eau en amont et l’eau en aval. La vis est assez longue pour la couvrir : sa longueur est la chute divisée par le sinus de la pente.',
    'The difference in level between the water upstream and downstream. The screw is long enough to cover it: its length is the head divided by the sine of the slope.',
  ],
  designFlow: ['Débit de dimensionnement', 'Design flow'],
  designFlowHint: [
    'Le débit pour lequel on a dimensionné la machine, et donc le plus grand qu’elle avale. Le diamètre de la vis en découle par les règles publiées ; il n’est pas choisi.',
    'The flow the machine is sized for, and so the most it swallows. The diameter of the screw follows from the published rules; it is not chosen.',
  ],
  riverFlow: ['Débit de la rivière', 'Flow of the river'],
  riverFlowHint: [
    'On en laisse une part dans la rivière (le débit réservé) ; la machine prend le reste, jusqu’à sa capacité ; le surplus passe par le déversoir. Quand la rivière monte, l’eau en aval remonte aussi et la chute baisse.',
    'A share stays in the river (the reserved flow); the machine takes the rest, up to its capacity; the surplus goes over the weir. When the river rises the water downstream rises too and the head falls.',
  ],
  followYear: ['Suivre les saisons de l’horloge', 'Follow the seasons of the clock'],
  tailwater: ['Eau en aval plus haute que prévu', 'Water downstream higher than planned'],
  tailwaterHint: [
    'Une sortie noyée fait perdre de la chute, et la vis perd plus encore dans ses derniers godets. Une valeur négative est une sortie trop basse : les godets se vident trop tôt.',
    'A drowned outlet loses head, and the screw loses more still in its last buckets. A negative value is an outlet that is too low: the buckets empty too early.',
  ],
  gateOpen: ['Vanne d’entrée ouverte', 'Head gate open'],

  // ---- controls: machine
  secMachine: ['La machine', 'The machine'],
  machineSelect: ['Machine', 'Machine'],
  machineScrew: ['Vis d’Archimède', 'Archimedes screw'],
  machineOvershot: ['Roue par-dessus', 'Overshot wheel'],
  machineBreastshot: ['Roue de poitrine', 'Breastshot wheel'],
  machineUndershot: ['Roue par-dessous', 'Undershot wheel'],
  machineHint: [
    'La roue sert de comparaison : mêmes site, même eau, même batterie. Le rapport de transmission suit la machine choisie.',
    'The wheel is there for comparison: same site, same water, same battery. The drive ratio follows the machine you choose.',
  ],
  slope: ['Pente de la vis', 'Slope of the screw'],
  slopeHint: [
    'Les vis installées sont le plus souvent inclinées d’environ 22 degrés. Plus raide, la vis est plus courte ; plus douce, elle est plus longue et fuit moins.',
    'Installed screws are most often tilted by about 22 degrees. Steeper, the screw is shorter; gentler, it is longer and leaks less.',
  ],
  roughness: ['Rugosité des parois', 'Wall roughness'],
  roughnessHint: [
    'Du bois neuf au métal piqué de rouille : les frottements de l’eau sur les pales et l’auge augmentent. Sur une vis lente, l’effet reste modéré.',
    'From new wood to rust-pitted metal: the friction of the water on the blades and the trough rises. On a slow screw the effect stays moderate.',
  ],
  gapScale: ['Jeu entre les pales et l’auge', 'Gap between blades and trough'],
  gapHint: [
    'Le jeu laisse l’eau fuir d’un godet vers celui du dessous, sans rien produire. Un jeu qui s’use fait chuter le rendement.',
    'The gap lets water leak from one bucket to the one below, producing nothing. A gap that wears makes the efficiency fall.',
  ],
  trashRack: ['Grille à l’entrée', 'Rack at the intake'],
  debris: ['Colmatage de la grille', 'Blockage of the rack'],
  rackHint: [
    'Les turbines à pales fines exigent une grille ; la vis laisse passer feuilles et branches, donc peut s’en passer. Colmatée, une grille coûte de la chute.',
    'Turbines with thin blades need a rack; the screw lets leaves and branches through, so it can go without. Clogged, a rack costs head.',
  ],
  dimsTitle: ['Dimensions calculées', 'Calculated dimensions'],
  dimsHint: [
    'Aucune dimension de la vis du film n’est publiée : celles-ci viennent des règles de dimensionnement publiées, à partir de la chute et du débit.',
    'No dimension of the video’s screw is published: these come from the published sizing rules, from the head and the flow.',
  ],
  dimDiameter: ['Diamètre extérieur', 'Outer diameter'],
  dimLength: ['Longueur', 'Length'],
  dimPitch: ['Pas', 'Pitch'],
  dimGap: ['Jeu', 'Gap'],
  dimRule: ['Vitesse de la règle', 'Speed of the rule'],
  dimRuleHint: [
    'La règle de la vitesse maximale d’une vis, 50 divisé par le diamètre à la puissance deux tiers (diamètre en mètres, résultat en tr/min), est celle de l’eau qui a le temps de remplir les godets sans être brassée. Le film parle de 30 à 60 tr/min.',
    'The rule for the top speed of a screw, 50 divided by the diameter to the power two thirds (diameter in metres, result in rpm), is that of water that has time to fill the buckets without being churned. The video speaks of 30 to 60 rpm.',
  ],
  dimWheel: ['Diamètre de la roue', 'Diameter of the wheel'],
  dimWheelWidth: ['Largeur de la roue', 'Width of the wheel'],

  // ---- controls: drive and generator
  secDrive: ['La transmission et la génératrice', 'The drive and the generator'],
  chainRatio: ['Rapport de la chaîne (côté lent)', 'Chain ratio (slow side)'],
  beltRatio: ['Rapport de la courroie (côté rapide)', 'Belt ratio (fast side)'],
  ratioTotal: ['Rapport total', 'Total ratio'],
  ratioSuits: ['Rapport qui convient', 'Ratio that suits'],
  driveHint: [
    'La vis tourne lentement, la génératrice veut plusieurs centaines de tr/min : le rapport total est le produit de ceux de la chaîne et de la courroie. La génératrice est bobinée pour la machine dimensionnée ; si vous changez la chute ou le débit, ajustez le rapport.',
    'The screw turns slowly, the generator wants several hundred rpm: the total ratio is the product of the chain’s and the belt’s. The generator is wound for the machine that was sized; if you change the head or the flow, adjust the ratio.',
  ],
  loadMode: ['Ce qui règle la vitesse', 'What sets the speed'],
  loadGenerator: ['La génératrice sur la batterie', 'The generator on the battery'],
  loadFixed: ['Une vitesse imposée', 'An imposed speed'],
  fixedRpm: ['Vitesse imposée', 'Imposed speed'],
  loadHint: [
    'Sur la batterie, la vitesse trouve toute seule son équilibre : la génératrice freine d’autant plus que ça tourne vite. Avec une vitesse imposée (un variateur), on voit ce que la vis fait seule à chaque vitesse.',
    'On the battery, the speed finds its balance by itself: the generator brakes harder the faster it turns. With an imposed speed (a drive) you see what the screw does by itself at each speed.',
  ],
  multiplierTitle: ['Pourquoi un multiplicateur', 'Why a multiplier'],
  multiplierSlow: ['Couple de la machine', 'Torque of the machine'],
  multiplierFast: ['Couple à la génératrice', 'Torque at the generator'],
  multiplierRatio: ['Rapport des couples', 'Ratio of the torques'],
  multiplierHint: [
    'La même puissance, divisée par une vitesse dix fois plus petite, donne un couple dix fois plus grand : sans multiplicateur il faudrait une génératrice dix fois plus lourde, ou à bobinage dix fois plus fin. Un grand rapport a un prix : un étage de plus, des pertes, du bruit.',
    'The same power, divided by a speed ten times smaller, gives ten times the torque: without a multiplier the generator would have to be ten times heavier, or wound ten times finer. A big ratio has a price: one more stage, losses, noise.',
  ],

  // ---- more
  secMore: ['Tous les chiffres', 'All the figures'],

  // ---- charts
  chartSpeed: ['La machine selon sa vitesse', 'The machine against its speed'],
  chartSpeedHint: [
    'À débit fixé : la puissance sur l’arbre et son rendement, selon la vitesse. À gauche de l’optimum la vis déborde, à droite ses godets se vident. Les repères : votre vitesse, et la règle.',
    'At a fixed flow: the power on the shaft and its efficiency, against the speed. Left of the optimum the screw overflows, right of it the buckets empty. The marks: your speed, and the rule.',
  ],
  seriesShaft: ['Puissance sur l’arbre (W)', 'Power on the shaft (W)'],
  seriesEfficiency: ['Rendement (%)', 'Efficiency (%)'],
  seriesFill: ['Remplissage (%)', 'Filling (%)'],
  markNow: ['maintenant', 'now'],
  markRule: ['règle', 'rule'],
  chartTorque: ['Le couple de la machine et celui de la génératrice', 'The torque of the machine and of the generator'],
  chartTorqueHint: [
    'La vitesse s’établit là où les deux courbes se croisent : la machine pousse moins fort quand elle va vite, la génératrice freine plus fort. Trop peu de rapport et la génératrice ne freine jamais.',
    'The speed settles where the two curves cross: the machine pushes less when it runs fast, the generator brakes harder. With too little ratio the generator never brakes.',
  ],
  seriesMachineTorque: ['Couple de la machine (N·m)', 'Torque of the machine (N·m)'],
  seriesLoadTorque: ['Couple demandé par la génératrice (N·m)', 'Torque asked by the generator (N·m)'],
  chartChooser: [
    'Quelle turbine pour mon site ? (chute en m, débit en m³/s)',
    'Which turbine for my site? (head in m, flow in m³/s)',
  ],
  chartChooserHint: [
    'Chute en abscisse, débit en ordonnée, échelles logarithmiques. Les zones se recouvrent et les sources ne s’accordent pas sur leurs bords ; les lignes pointillées sont d’égale puissance. Le point est votre site. Pour les très hautes chutes, voyez le laboratoire de la turbine Pelton.',
    'Head across, flow up, logarithmic scales. The zones overlap and the sources disagree at their edges; the dashed lines are of equal power. The dot is your site. For very high heads, see the Pelton turbine lab.',
  ],
  markSite: ['votre site', 'your site'],
  chooserFits: ['convient', 'fits'],
  chooserHeadOnly: ['chute dans la plage, débit hors plage', 'head in range, flow out of range'],
  chooserNo: ['hors plage', 'out of range'],
  chooserPower: ['puissance attendue', 'expected power'],
  typeUndershot: ['Roue par-dessous', 'Undershot wheel'],
  typeBreastshot: ['Roue de poitrine', 'Breastshot wheel'],
  typeOvershot: ['Roue par-dessus', 'Overshot wheel'],
  typeScrew: ['Vis d’Archimède', 'Archimedes screw'],
  typeKaplan: ['Kaplan', 'Kaplan'],
  typeCrossflow: ['Banki (à flux traversant)', 'Crossflow'],
  typeFrancis: ['Francis', 'Francis'],
  typePelton: ['Pelton', 'Pelton'],
  powerLine: ['d’égale puissance', 'of equal power'],
  chartCompare: ['Le même site avec une roue', 'The same site with a wheel'],
  chartCompareHint: [
    'Électricité produite selon le débit de la rivière, pour la vis et pour chaque roue, sur la même chute et avec la même batterie. Les sources donnent pour les roues des rendements très différents : le modèle reste prudent et les montre à côté de ceux de la vis.',
    'Electricity produced against the flow of the river, for the screw and for each wheel, on the same head and with the same battery. The sources give very different efficiencies for wheels: the model stays cautious and shows them beside the screw’s.',
  ],
  seriesElectric: ['Électricité (W)', 'Electricity (W)'],
  wheelSources: [
    'Rendements des sources, au mieux : roue par-dessus 80 à 90 % (encyclopédie) et environ 85 % (revue) ; roue de poitrine 50 à 60 % et 75 à 80 % ; roue par-dessous 50 à 60 % et environ 85 %. Les sources divergent, surtout pour la roue de poitrine.',
    'Efficiencies of the sources, at best: overshot wheel 80 to 90 % (encyclopaedia) and about 85 % (review); breastshot wheel 50 to 60 % and 75 to 80 %; undershot wheel 50 to 60 % and about 85 %. The sources disagree, most for the breastshot wheel.',
  ],
  chartYear: ['Une année sur ce site', 'A year at this site'],
  chartYearHint: [
    'Les 365 jours de l’année du cours d’eau : la rivière, l’eau que prend la machine, le débit réservé. L’énergie est la somme des jours. Le repère est la date de l’horloge.',
    'The 365 days of the year of the watercourse: the river, the water the machine takes, the reserved flow. The energy is the sum of the days. The mark is the date of the clock.',
  ],
  seriesRiver: ['Rivière', 'River'],
  seriesMachineFlow: ['Pris par la machine', 'Taken by the machine'],
  seriesReservedFlow: ['Débit réservé', 'Reserved flow'],
  chartYearPower: ['Puissance électrique de chaque jour', 'Electric power of each day'],
  seriesYearPower: ['Puissance du jour (W)', 'Power of the day (W)'],
  yearlyTitle: ['L’année en chiffres', 'The year in figures'],
  yearlyHint: [
    'Le facteur de charge compare l’énergie de l’année à celle qu’aurait donnée la puissance nominale pendant toute l’année. Un moulin dimensionné sur un débit moyen produit moins en été et laisse l’eau en trop de l’hiver passer par le déversoir : il complète bien le solaire.',
    'The capacity factor compares the energy of the year with what the rated power would give over the whole year. A mill sized on an average flow produces less in summer and lets the surplus of winter go over the weir: it complements solar well.',
  ],
  yearlyEnergy: ['Énergie de l’année', 'Energy of the year'],
  yearlyMean: ['Puissance moyenne', 'Mean power'],
  yearlyRated: ['Puissance nominale', 'Rated power'],
  yearlyCf: ['Facteur de charge', 'Capacity factor'],
  yearlyStopped: ['Jours à l’arrêt (basses eaux)', 'Days stopped (low water)'],
  yearlyFlood: ['Jours à l’arrêt (crue)', 'Days stopped (flood)'],
  yearlyHours: ['Heures de marche', 'Hours running'],
  yearlyWinter: [
    'Part de l’énergie en décembre, janvier, février',
    'Share of the energy in December, January, February',
  ],
  yearlyShare: ['du site utilisée', 'of the site used'],
  chartLive: ['La dernière minute', 'The last minute'],
  chartLiveSpeed: ['Vitesse de la machine (tr/min)', 'Speed of the machine (rpm)'],
  chartLivePower: ['Électricité (W)', 'Electricity (W)'],
  chartLiveHint: [
    'Vitesse et puissance de la dernière minute. Elles bougent quand un scénario change quelque chose : la vitesse met quelques secondes à s’établir, à cause de l’inertie de la vis.',
    'Speed and power over the last minute. They move when a scenario changes something: the speed takes a few seconds to settle, because of the inertia of the screw.',
  ],
  computing: ['Calcul des courbes…', 'Computing the curves…'],
  monthShort: [
    'janv.,févr.,mars,avr.,mai,juin,juil.,août,sept.,oct.,nov.,déc.',
    'Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec',
  ],
  stripPower: ['Électricité', 'Electricity'],
  stripSpeed: ['Vitesse', 'Speed'],
  stripFlow: ['Débit utilisé', 'Flow used'],
  stripEfficiency: ['Rendement', 'Efficiency'],
  stripNoteStopped: ['à l’arrêt', 'stopped'],
  alarmLowWater: ['Basses eaux : arrêt', 'Low water: stopped'],
  alarmFlood: ['Crue : arrêt', 'Flood: stopped'],
  alarmGateClosed: ['Vanne fermée', 'Gate shut'],
  alarmTooFast: ['Vis trop rapide', 'Screw too fast'],
  alarmTooSlow: ['Vis trop lente : débordement', 'Screw too slow: overflow'],
  alarmNoCharge: ['La génératrice ne charge pas', 'Generator not charging'],
  alarmRack: ['Grille colmatée', 'Rack clogged'],
  alarmRange: ['Roue hors plage de chute', 'Wheel outside its heads'],

  // ---- the two worlds, the buttons that lead to them, the Sources panel: notice, warnings, outline of the video (data role, wave 2)
  // `tagline` and `disclaimer` above are the template's and stay; the lab's own versions follow (the lead picks them in src/lab.ts).
  labTagline: [
    'Une vis d’Archimède, une petite chute, de l’électricité',
    'An Archimedes screw, a small head, electricity',
  ],
  sceneSite: ['Site', 'Site'],
  sceneScrew: ['Vis', 'Screw'],
  goSite: ['Voir le site', 'See the site'],
  goScrew: ['Voir la vis', 'See the screw'],
  goChamber: ['Entrer dans la chambre d’eau', 'Go into the water chamber'],
  groupSite: ['Le site', 'The site'],
  groupScrew: ['La vis', 'The screw'],
  noticeGeneric: [
    'La vis dessinée ici est générique : ses dimensions viennent des règles de dimensionnement publiées, appliquées à une chute et à un débit choisis, pas d’une machine réelle. Le film montre trois filets, une pente, une transmission ; il ne donne ni diamètre, ni longueur, ni rendement. Les puissances et les rendements affichés sont les résultats d’un modèle pédagogique, jamais des mesures, et ce n’est pas un plan de construction.',
    'The screw drawn here is generic: its dimensions come from published sizing rules, applied to a chosen head and flow, not from a real machine. The film shows three threads, a slope, a drive; it gives no diameter, no length, no efficiency. The powers and efficiencies shown are results of an educational model, never measurements, and this is not a construction plan.',
  ],
  safety: [
    'Reconstitution pédagogique, pas un plan de construction. Un canal, une rivière et une chambre d’eau sont des lieux où l’on se noie : n’y allez jamais seul, jamais machine en marche, et fermez et verrouillez la vanne de tête avant tout travail. Une vis, une chaîne ou une courroie qui tournent happent un bras, une manche, des cheveux : gardez les carters et un garde-corps. Descendre une machine lourde par une échelle est dangereux : montez-la en pièces, à plusieurs, à la corde. Une batterie débite des courants énormes en cas de court-circuit et peut dégager un gaz explosif ou prendre feu : un fusible au plus près, des outils isolés, un électricien pour le câblage et le raccordement. Sans charge électrique, la vis s’emballe et la génératrice monte en tension : la vanne de sécurité est la seconde protection. Les outils et la poussière de bois demandent lunettes, gants et masque.',
    'Educational reconstruction, not a construction plan. A canal, a river and a water chamber are places where people drown: never go alone, never with the machine running, and shut and lock the head gate before any work. A screw, a chain or a belt that turn snatch an arm, a sleeve, hair: keep the guards and a guard rail. Lowering a heavy machine down a ladder is dangerous: bring it in pieces, with several people, on a rope. A battery delivers huge currents in a short circuit and may give off an explosive gas or catch fire: a fuse as close as possible, insulated tools, an electrician for the wiring and the connection. With no electrical load, the screw races and the generator’s voltage climbs: the safety gate is the second protection. Tools and wood dust call for goggles, gloves and a mask.',
  ],
  legal: [
    'Un bief n’est pas libre d’usage. Il faut un droit d’utiliser l’eau (pour un moulin ancien, un droit parfois très vieux, à faire reconnaître : en France, on parle de droit « fondé en titre ») et, selon le pays, une autorisation de produire de l’électricité. Une part de l’eau, le débit réservé, doit rester dans la rivière, et les poissons doivent pouvoir la descendre et la remonter (la continuité écologique) : c’est l’administration de l’eau qui fixe ces valeurs, site par site. Les démarches peuvent prendre des années. Ces règles dépendent du pays : renseignez-vous auprès du service de l’eau du vôtre.',
    'A mill race is not free to use. You need a right to use the water (for an old mill, sometimes a very old right that has to be recognised) and, depending on the country, a permit to produce electricity. A share of the water, the reserved flow, must stay in the river, and fish must be able to pass both ways: the water authority sets these values, site by site. The paperwork can take years. These rules depend on the country: ask the water service of yours.',
  ],
  chapters: ['Sommaire de la vidéo', 'Video outline'],
  sourcesNoCopy: [
    'Aucune image ni aucun texte de la vidéo n’est repris : seuls des faits et des chiffres, avec leur horodatage.',
    'No footage or text from the video is reused: only facts and figures, with their timestamps.',
  ],

  // ---- lessons (lessons role, wave 3): the intro of the Lessons mode, to wire as `lessons: { intro: strL('lessonsIntroMill'), items: LESSONS }`
  // (the template's `lessonsIntro` above is the lead's and stays unchanged)
  lessonsIntroMill: [
    'Six leçons courtes, de l’eau aux watts jusqu’à l’année du moulin. Chacune ouvre la vue 3D sur la pièce dont elle parle, souvent avec un scénario à lancer dans la Simulation, et finit par un petit quiz.',
    'Six short lessons, from water to watts to the year of the mill. Each one opens the 3D view on the part it talks about, often with a scenario to run in the Simulation, and ends with a small quiz.',
  ],
} as const satisfies Record<string, readonly [string, string]>;

registerStrings(LAB);

/** The dictionary itself, for the parity test (src/panels/strings.test.ts). */
export const LAB_STRINGS: Record<string, readonly [string, string]> = LAB;

export type UiKey = keyof typeof LAB | CommonKey;

export { colon } from '@onigam/lab-kit/i18n';

export function t(key: UiKey): string {
  return tx(key);
}

/** Number with the decimal separator of the interface language (7,5 in French, 7.5 in English). */
export function num(value: number, digits = 0): string {
  if (!Number.isFinite(value)) return '—';
  if (Math.round(Math.abs(value) * 10 ** digits) === 0) value = 0; // no "-0,0" for tiny negatives
  return value.toLocaleString(getLang() === 'fr' ? 'fr-FR' : 'en-GB', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/** The short names of the twelve months in the interface language. */
export function months(): string[] {
  return t('monthShort').split(',');
}
