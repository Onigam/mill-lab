// The figures that the texts of src/data write by {placeholder}, so that the French and the English spellings of a number
// (7,5 / 7.5) can never drift apart, and so that one test (data.test.ts) can check every model result against the simulation.
// A figure that a SOURCE reports (3 threads, 30 to 60 rpm, 1.5 to 2 m of head, 22° of slope…) is written in the text itself and
// checked against the allow-list of data.test.ts, with its source; a figure that is DERIVED, a MODEL RESULT, an ASSUMPTION or an
// ESTIMATE lives here and a text that uses one says so (see `lf` in part-helpers.ts).
//
// Status words (the same as docs/physics.md):
//   MODEL     an output of src/sim for the default machine (preset `full-size`: the mill race, 1.75 m, 180 L/s), rounded as the texts
//             print it; data.test.ts recomputes each one from the simulation, so a change of src/sim cannot go unnoticed;
//   DERIVED   computed from reported or published figures (the sizing rules), with the computation next to it;
//   ASSUMED   a constant of the model that no source gives (src/sim/machine.ts), an assumption of the lab;
//   ESTIMATE  an order of magnitude or a dimension that no source gives.
// Nothing here is tuned to print the 200 W of the prototype or the 2 kW target: those two are REPORTED hopes (research K3, K5), quoted as
// such; the powers and efficiencies below are what the equations give at the design point and are always said to be the model's.
//
// Lengths of the 3D model are NOT here: they come from src/three/dims.ts (see parts/*, assembly.ts).

export const MODEL = {
  // the water and the power at the design point (docs/physics.md §7.1)
  waterKw: 3.09, // kW of hydraulic power: ρ g Q H_net with 180 L/s and 1.75 m
  shaftKw: 2.61, // kW on the screw's shaft
  elecKw: 2.2, // kW into the battery
  etaScrew: 84.6, // % of the water power that reaches the shaft
  etaAll: 71, // % from the water to the battery (71.1)
  etaDrive: 94, // % chain and belt together (94.1)
  etaGen: 89, // % generator at its rated point (89.3), a result of how it is wound
  lossGapW: 155, // W leaking through the gap
  lossOutletW: 90, // W lost at the outlet (89.5)
  lossFrictionW: 186, // W of friction of the water on the blades and the core
  lossInletW: 26, // W lost where the blades enter the pool
  lossDriveW: 155, // W lost in the chain and the belt
  lossGenW: 263, // W lost in the generator and its rectifier
  diodeLossW: 69, // W of the generator's losses burnt in the diodes of the rectifier (1.5 V × 45.8 A)
  copperLossW: 194, // W of the generator's losses burnt in its windings
  rpm: 55, // rpm of the screw at the design point (55.1; the rule gives 55.3)
  torqueScrew: 453, // N·m on the screw's shaft
  torqueGen: 39, // N·m on the generator's shaft
  countershaftRpm: 182, // rpm of the countershaft (55.1 × 3.3)
  countershaftTorque: 135, // N·m on the countershaft
  genShaftKw: 2.46, // kW on the generator's shaft (after the drive)
  cutInRpm: 552, // rpm of the generator where it starts to charge a 48 V battery
  cutInScrewRpm: 51, // rpm of the screw at that moment (552 / 10.89)
  voc: 53.7, // V at the open terminals of the rectifier at 600 rpm
  current: 46, // A into the battery (45.8)
  freeRunRpm: 180, // rpm of the screw with the generator disconnected (no load at all)
  freeRunFactor: 3.3, // times its design speed
  freeRunGenRpm: 1960, // rpm of the generator in that case (180 × 10.89)
  freeRunVolts: 176, // V at the open terminals of the rectifier then (0.856 V per rad/s × 205.5 rad/s)
  gap2Eff: 80.5, // % screw efficiency with a gap twice the rule
  gap4Eff: 73, // % with a gap four times the rule (73.3)
  gap05Eff: 86.8, // % with half the gap
  rough5Loss: 6.5, // % of the electric power lost when the walls go from 0.5 to 5 mm of roughness (6.48)
  rack80Head: 0.53, // m of head lost in a rack 80 % blocked (0.532)
  rack90Head: 2.65, // m lost in a rack 90 % blocked: more than the whole head
  rackCleanCm: 1, // cm of head lost in a clean rack (0.98)
  tail05Pct: 34, // % of the electric power lost when the water downstream rises by 0.5 m (34.3)
  tailGate: 1.17, // m of rise of the water downstream at the flow where the gate closes in a flood
  headLeft: 0.58, // m of head left then
  third: 80, // % screw efficiency at a third of the design flow (80.3)
  thirdFill: 43, // % of the buckets filled then
  drawdown: 46, // cm: height between an empty and a full bucket (0.46 m): the pool can sink by that much
  ratioWheelLow: 30, // the drive ratio a wheel needs (30.5 for the overshot wheel…)
  ratioWheelHigh: 61, // … up to 61 for the breastshot wheel
  wheelOverKw: 1.8, // kW from the same water through an overshot wheel (1.84)
  wheelBreastKw: 1.8, // breastshot (1.85)
  wheelUnderKw: 1.1, // undershot (1.15)
  beltLowRpm: 118, // rpm of the screw with a belt ratio 0.45 times the right one (118.5)
  beltHighRpm: 28, // rpm with a belt ratio 1.9 times the right one (28.0)
  beltLowEl: 1.3, // kW with a belt ratio 0.45 times the right one: the screw runs at twice its speed (1.32)
  beltHighEl: 1.2, // kW with a belt ratio 1.9 times the right one: the screw is held at half speed (1.23)
  yearKwh: 9800, // kWh a year at the mill race of the lab (9,823)
  meanKw: 1.1, // kW mean power over the year (1.12)
  cf: 51, // % capacity factor (50.9)
  daysLow: 57, // days stopped for low water in the drawn year
  hours: 7400, // hours running in the drawn year (7,368)
  winter: 28, // % of the year's energy made from December to February (28.1)
  winterShare: 24.7, // % of the year those 90 days are
  used: 24, // % of the energy of the site's water that the year turns into electricity (24.2)
  medianLs: 224, // L/s: median flow of the drawn year of the mill race (223.9)
  cmW: 18, // W of water power per centimetre of head lost at 180 L/s (17.7)
  kaplanM: 0.24, // m: the runner of a Kaplan turbine for the same flow (4 m/s axial speed through the runner: an estimate of the chooser)
  kaplanTimes: 3.6, // times smaller than the screw (0.86 / 0.24)
  lossBearingW: 5, // W lost in the two bearings (5.4), 0.2 % of the water power
  qBucketLs: 170, // L/s that really go through the pockets (170.2)
  qGapLs: 9, // L/s that leak through the gap (9.0)
  protoW: 206, // W from the prototype's head and flow (1 m, 31 L/s): the research's own circular derivation, not a result about the video
  genResistance: 0.09, // ohm: the resistance the model gives to the circuit seen by the rectified current, windings and cables (0.093)
  genK: 0.86, // V per rad/s, which is also N·m per ampere: the generator's constant (k = 0.856), the model's winding
} as const;

export const FIG = {
  // ---- the design point (assumption and derivation, research K5 and §8)
  head: [1.75, 2], // m: the head of the lab's design point, in the 1.5 to 2 m the video reports (ASSUMED)
  flowLs: [180, 0], // L/s: what 2 kW needs at 65 % over 1.75 m (DERIVED, research §2 sanity checks)
  // ---- model results
  waterKw: [MODEL.waterKw, 2],
  shaftKw: [MODEL.shaftKw, 2],
  elecKw: [MODEL.elecKw, 2],
  etaScrew: [MODEL.etaScrew, 1],
  etaAll: [MODEL.etaAll, 0],
  etaDrive: [MODEL.etaDrive, 0],
  etaGen: [MODEL.etaGen, 0],
  lossGapW: [MODEL.lossGapW, 0],
  lossOutletW: [MODEL.lossOutletW, 0],
  lossFrictionW: [MODEL.lossFrictionW, 0],
  lossInletW: [MODEL.lossInletW, 0],
  lossDriveW: [MODEL.lossDriveW, 0],
  lossGenW: [MODEL.lossGenW, 0],
  diodeLossW: [MODEL.diodeLossW, 0],
  copperLossW: [MODEL.copperLossW, 0],
  rpm: [MODEL.rpm, 0],
  torqueScrew: [MODEL.torqueScrew, 0],
  torqueGen: [MODEL.torqueGen, 0],
  countershaftRpm: [MODEL.countershaftRpm, 0],
  countershaftTorque: [MODEL.countershaftTorque, 0],
  genShaftKw: [MODEL.genShaftKw, 2],
  cutInRpm: [MODEL.cutInRpm, 0],
  cutInScrewRpm: [MODEL.cutInScrewRpm, 0],
  voc: [MODEL.voc, 1],
  current: [MODEL.current, 0],
  freeRunRpm: [MODEL.freeRunRpm, 0],
  freeRunFactor: [MODEL.freeRunFactor, 1],
  freeRunGenRpm: [MODEL.freeRunGenRpm, 0],
  freeRunVolts: [MODEL.freeRunVolts, 0],
  gap2Eff: [MODEL.gap2Eff, 1],
  gap4Eff: [MODEL.gap4Eff, 0],
  gap05Eff: [MODEL.gap05Eff, 1],
  rough5Loss: [MODEL.rough5Loss, 1],
  rack80Head: [MODEL.rack80Head, 2],
  rack90Head: [MODEL.rack90Head, 2],
  rackCleanCm: [MODEL.rackCleanCm, 0],
  tail05Pct: [MODEL.tail05Pct, 0],
  tailGate: [MODEL.tailGate, 2],
  headLeft: [MODEL.headLeft, 2],
  third: [MODEL.third, 0],
  thirdFill: [MODEL.thirdFill, 0],
  drawdown: [MODEL.drawdown, 0],
  ratioWheelLow: [MODEL.ratioWheelLow, 0],
  ratioWheelHigh: [MODEL.ratioWheelHigh, 0],
  wheelOverKw: [MODEL.wheelOverKw, 1],
  wheelBreastKw: [MODEL.wheelBreastKw, 1],
  wheelUnderKw: [MODEL.wheelUnderKw, 1],
  beltLowRpm: [MODEL.beltLowRpm, 0],
  beltHighRpm: [MODEL.beltHighRpm, 0],
  beltLowEl: [MODEL.beltLowEl, 1],
  beltHighEl: [MODEL.beltHighEl, 1],
  yearKwh: [MODEL.yearKwh, 0],
  meanKw: [MODEL.meanKw, 1],
  cf: [MODEL.cf, 0],
  daysLow: [MODEL.daysLow, 0],
  hours: [MODEL.hours, 0],
  winter: [MODEL.winter, 0],
  winterShare: [MODEL.winterShare, 1],
  used: [MODEL.used, 0],
  medianLs: [MODEL.medianLs, 0],
  cmW: [MODEL.cmW, 0],
  kaplanM: [MODEL.kaplanM, 2],
  kaplanTimes: [MODEL.kaplanTimes, 1],
  lossBearingW: [MODEL.lossBearingW, 0],
  qBucketLs: [MODEL.qBucketLs, 0],
  qGapLs: [MODEL.qGapLs, 0],
  protoW: [MODEL.protoW, 0],
  genResistance: [MODEL.genResistance, 2],
  genK: [MODEL.genK, 2],
  // ---- derived from the published sizing rules and the model's geometry (the dimensions of the 3D model are in dims.ts)
  rectFactor: [1.35, 2], // 3√2/π: the rectified voltage of a three-phase bridge, in line voltages
  ratio: [10.9, 1], // 3.3 × 3.3 (the ratios that bring the generator to its rated speed at the design speed)
  chain: [3.3, 1],
  belt: [3.3, 1],
  pocketSpeed: [0.79, 2], // m/s: pitch × speed, the speed at which a pocket of water slides down the screw
  transit: [5.9, 1], // s: length / that speed
  stepCm: [11, 0], // cm: the levels of two pockets in a row differ by pitch / 3 × sin 22° = 10.7 cm
  buckets: [16, 0], // pockets in the three threads together: 3 × length / pitch = 16.3
  bucketL: [62, 0], // litres in one full pocket (61.8)
  bucketsM3: [1, 0], // m³ (a tonne) of water held in the pockets when all are full (16.3 × 61.8 L)
  tailDepth: [0.48, 2], // m: optimal water depth over the lowest point of the trough at the lower end: 0.60 × D × cos 22° (published, via dims.ts)
  tipSpeed: [2.5, 1], // m/s: speed of the blade tips (ω × D / 2)
  gapMm: [4.2, 1], // mm: 0.0045 × √D, the published gap rule at D = 0.86 m
  diameter: [0.86, 2], // m: outer diameter, sized so that full pockets at the speed rule carry 180 L/s
  inner: [0.46, 2], // m: core diameter, 0.5357 × D (the optimum of the published rule for three threads)
  pitch: [0.86, 2], // m: advance of a thread per turn, equal to the diameter (the built proportion of the published rule)
  // ---- derived from the model's generator and the design point (completion wave A: the generator opened and the powerhouse)
  genLineV: [39.8, 1], // V (rms) between two phases at 600 rpm: the rectified 53.7 V divided by 1.35
  genPhaseV: [23, 0], // V (rms) of one phase of a star winding: the line voltage divided by √3 (22.98)
  genPhaseA: [37, 0], // A (rms) in each phase when the bridge delivers 45.8 A: √(2/3) of the direct current (37.4)
  freeRunForce: [11, 0], // times the centrifugal force on the rotor at the racing speed: (180 / 55)² = 10.6
  dumpOhm: [1.05, 2], // ohm: battery volts divided by the current of the design point, the resistance that swallows the whole electric power (48 / 45.8)
  invA: [63, 0], // A drawn from a 48 V battery by a 3 kW inverter before its losses (62.5)
  // ---- assumptions of the model (src/sim/machine.ts)
  genRpm: [600, 0], // rpm: rated speed of the generator (research K7: "several hundred rpm")
  busVolts: [48, 0], // V: the battery bank
  diodeDrop: [1.5, 1], // V: two diodes in a three-phase bridge
  chainEff: [98, 0], // %
  beltEff: [96, 0], // %
  headroom: [12, 0], // %: open-circuit voltage above the battery's at the rated speed (a choice of winding)
  stageMax: [5, 0], // largest ratio of one stage
  reservedPct: [10, 0], // % of the mean flow left in the river
  reservedLs: [30, 0], // L/s: that, on the lab's mill race (mean 300 L/s)
  floodFactor: [6, 0], // times the median flow: the gate closes
  floodM3: [1.34, 2], // m³/s: that flow on the mill race (6 × the median 0.224)
  tailPerDecade: [1.5, 1], // m of rise of the water downstream for every tenfold increase of the river flow above its median (race)
  lowCutPct: [15, 0], // % of the design flow below which the gate closes
  lowCutLs: [57, 0], // L/s of river below which the machine stops (27 L/s usable + 30 L/s reserved)
  canalSpeed: [0.8, 1], // m/s: speed of the water in the canal
  // ---- estimates (the sources give orders of magnitude only: research §3, §5.6)
  mass: [220, 0], // kg of wood in the turning part (222.96)
  length: [4.67, 2], // m: head / sin 22°, assuming the screw covers exactly the head
  meanBrookLs: [60, 0], // L/s: mean flow of the lab's small brook
  meanRaceLs: [300, 0], // L/s: mean flow of the lab's mill race
  meanRiverM3: [3, 0], // m³/s: mean flow of the lab's river
  // the generator opened and the powerhouse (completion wave A): the design of the machine and the ratings of the equipment are the lab's
  // estimates; the sources give none of them (the video shows a bought generator and says nothing of the electrical cabinet)
  genPoles: [16, 0], // magnets on the rotor, north and south alternating
  genSlots: [24, 0], // teeth (and slots) of the stator, one coil on each
  genCoilsPerPhase: [8, 0], // 24 coils / 3 phases
  genFreq: [80, 0], // Hz: poles × rpm / 120 = 16 × 600 / 120
  breakerA: [63, 0], // A: rating of the DC breaker, above the 46 A of service
  fuseA: [80, 0], // A: rating of the battery fuse, above the breaker's and below what the cable carries
  batCableMm2: [25, 0], // mm²: section of the battery cables
  earthMm2: [16, 0], // mm²: section of the bonding conductor
  invKw: [3, 0], // kW: rated power of the inverter
} as const satisfies Record<string, readonly [number, number]>;

export type FigName = keyof typeof FIG;

/** Placeholders by status: a text that uses one must say so, in each language (see `lf` in part-helpers.ts). */
export const MODEL_KEYS: ReadonlySet<string> = new Set([
  'waterKw',
  'shaftKw',
  'elecKw',
  'etaScrew',
  'etaAll',
  'etaDrive',
  'etaGen',
  'lossGapW',
  'lossOutletW',
  'lossFrictionW',
  'lossInletW',
  'lossDriveW',
  'lossGenW',
  'diodeLossW',
  'copperLossW',
  'rpm',
  'torqueScrew',
  'torqueGen',
  'countershaftRpm',
  'countershaftTorque',
  'genShaftKw',
  'cutInRpm',
  'cutInScrewRpm',
  'voc',
  'current',
  'freeRunRpm',
  'freeRunFactor',
  'freeRunGenRpm',
  'freeRunVolts',
  'gap2Eff',
  'gap4Eff',
  'gap05Eff',
  'rough5Loss',
  'rack80Head',
  'rack90Head',
  'rackCleanCm',
  'tail05Pct',
  'tailGate',
  'headLeft',
  'third',
  'thirdFill',
  'drawdown',
  'ratioWheelLow',
  'ratioWheelHigh',
  'wheelOverKw',
  'wheelBreastKw',
  'wheelUnderKw',
  'beltLowRpm',
  'beltHighRpm',
  'beltLowEl',
  'beltHighEl',
  'yearKwh',
  'meanKw',
  'cf',
  'daysLow',
  'hours',
  'winter',
  'winterShare',
  'used',
  'medianLs',
  'lossBearingW',
  'qBucketLs',
  'qGapLs',
  'kaplanM',
  'kaplanTimes',
  'protoW',
  'genResistance',
  'genK',
]);
export const DERIVED_KEYS: ReadonlySet<string> = new Set([
  'cmW',
  'rectFactor',
  'flowLs',
  'ratio',
  'chain',
  'belt',
  'pocketSpeed',
  'transit',
  'stepCm',
  'buckets',
  'bucketL',
  'bucketsM3',
  'tipSpeed',
  'tailDepth',
  'gapMm',
  'diameter',
  'inner',
  'pitch',
  'genLineV',
  'genPhaseV',
  'genPhaseA',
  'freeRunForce',
  'dumpOhm',
  'invA',
]);
export const ASSUMED_KEYS: ReadonlySet<string> = new Set([
  'head',
  'genRpm',
  'busVolts',
  'diodeDrop',
  'chainEff',
  'beltEff',
  'headroom',
  'stageMax',
  'reservedPct',
  'reservedLs',
  'floodFactor',
  'floodM3',
  'tailPerDecade',
  'lowCutPct',
  'lowCutLs',
  'canalSpeed',
]);
export const ESTIMATE_KEYS: ReadonlySet<string> = new Set([
  'mass',
  'length',
  'meanBrookLs',
  'meanRaceLs',
  'meanRiverM3',
  'genPoles',
  'genSlots',
  'genCoilsPerPhase',
  'genFreq',
  'breakerA',
  'fuseA',
  'batCableMm2',
  'earthMm2',
  'invKw',
]);
