// Outline of the main video (57 min) for the Sources panel: [timestamp, French, English]. The video has no chapter list of its own that the
// lab uses: this is the lab's outline, which follows the structure of the private transcript (docs/transcript-s1-viseta-screw.md, git-ignored;
// its captions garble the numbers, so none is taken from it) and is written in our own words, with neutral wording: nobody is named, the
// credit to the video and its authors lives in the Sources panel. Each timestamp is where the topic starts. The video ends at 57:16.
// The first six are the ones of docs/research.md §1 (0:34, 5:06, 12:36, 15:01, 24:05, 38:52). Completion wave A added the three topics where the
// electrics appear (14:01 the generator connected without a load, 22:03 the batteries and a continuous production, 30:31 the motor and the
// electronics of the control gate), read in the private transcript for their timestamps only.

export const CHAPTERS: [timestamp: string, fr: string, en: string][] = [
  ['00:00', 'Un collectif redonne vie à un vieux moulin', 'A collective gives an old mill a second life'],
  [
    '00:34',
    'Le projet : une turbine qui laisse passer les poissons et les sédiments',
    'The project: a turbine that lets fish and sediment through',
  ],
  [
    '05:06',
    'La maquette animée : seuil, canal, moulin et canal de fuite',
    'The animated model: weir, canal, mill and tailrace',
  ],
  [
    '08:26',
    'Quelle turbine pour quelle chute, et pourquoi une vis pour les petits moulins',
    'Which turbine for which head, and why a screw for small mills',
  ],
  ['12:36', 'La chambre d’eau, et le kit assemblé sur place', 'The water chamber, and the kit assembled on the spot'],
  [
    '14:01',
    'Première eau : la vis tourne sur ses frottements, la génératrice est raccordée mais sans charge',
    'First water: the screw turns on its own friction, the generator connected but with no load',
  ],
  [
    '15:01',
    'L’ancienne installation, les supports, les paliers et l’auge',
    'The old installation, the supports, the bearings and the trough',
  ],
  ['19:21', 'Le plus dur : un tube de bois bien rond', 'The hardest part: a truly round wooden tube'],
  ['20:36', 'Taille, puissance, et complémentarité avec le solaire', 'Size, power, and how it complements solar'],
  ['22:03', 'Une production continue, qui ménage les batteries', 'A continuous production, which spares the batteries'],
  ['22:36', 'La chaîne, la génératrice et la mise en eau', 'The chain, the generator and the first filling'],
  [
    '24:05',
    'La technique : trois filets, modules de bois et paliers',
    'The technique: three threads, timber modules and bearings',
  ],
  ['28:04', 'Crues, vanne de sécurité et vanne de contrôle', 'Floods, the safety gate and the control gate'],
  [
    '30:31',
    'Le moteur et l’électronique qui pilotent la vanne',
    'The motor and the electronics that drive the control gate',
  ],
  [
    '31:47',
    'Deux prototypes, et la puissance et le rendement espérés',
    'Two prototypes, and the power and efficiency hoped for',
  ],
  ['35:43', 'La génératrice, la courroie et les compromis', 'The generator, the belt and the compromises'],
  ['38:52', 'Droit d’eau et histoire du moulin', 'Water rights and the history of the mill'],
  [
    '46:12',
    'Prise d’eau, débit réservé et visite des services de l’eau',
    'Intake, reserved flow and the visit of the water service',
  ],
  [
    '49:37',
    'À quoi sert l’électricité : un serveur à basse consommation',
    'What the electricity is for: a low-consumption server',
  ],
];
