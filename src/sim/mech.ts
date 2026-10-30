// sim/mech: the drive between a slow machine and a generator, and the generator that follows the load. Written to move to
// the kit later: pure functions, SI units, no import from the lab. Angular speeds in rad/s, torques in N·m, powers in W,
// voltages in V, currents in A; rpm only in the helpers that say so.

export const rpmToRad = (rpm: number): number => (rpm * 2 * Math.PI) / 60;
export const radToRpm = (omega: number): number => (omega * 60) / (2 * Math.PI);

/** Speed ratio of one belt or chain stage: the large wheel over the small one (the small one turns faster). */
export const stageRatio = (dLarge: number, dSmall: number): number => dLarge / dSmall;

/** Ratio of stages in series: the product. */
export const totalRatio = (stages: readonly number[]): number => stages.reduce((a, r) => a * r, 1);

/** Efficiency of stages in series: the product. */
export const totalEfficiency = (efficiencies: readonly number[]): number => efficiencies.reduce((a, e) => a * e, 1);

/** Torque T = P / ω. The slower the shaft, the bigger the torque for the same power. */
export const torque = (power: number, omega: number): number => (omega > 0 ? power / omega : Infinity);

/** How many stages of at most `maxStage` are needed to reach `ratio` (at least one). */
export const stagesNeeded = (ratio: number, maxStage: number): number =>
  Math.max(1, Math.ceil(Math.log(Math.max(ratio, 1)) / Math.log(maxStage) - 1e-9));

export interface StageState {
  /** Speed (rad/s) and torque (N·m) at the input shaft of the stage, and at its output. */
  omegaIn: number;
  omegaOut: number;
  torqueIn: number;
  torqueOut: number;
}

/**
 * Speeds and torques along a train of stages driven from the slow shaft: speed multiplied by the ratio, torque divided by
 * ratio × efficiency (the power loses the efficiency of each stage).
 */
export function driveTrain(
  omega: number,
  torqueIn: number,
  stages: readonly { ratio: number; efficiency: number }[],
): StageState[] {
  const out: StageState[] = [];
  let w = omega;
  let t = torqueIn;
  for (const s of stages) {
    const wOut = w * s.ratio;
    const tOut = (t * s.efficiency) / s.ratio;
    out.push({ omegaIn: w, omegaOut: wOut, torqueIn: t, torqueOut: tOut });
    w = wOut;
    t = tOut;
  }
  return out;
}

/**
 * A permanent-magnet generator on a rectifier and a battery (or a DC bus held at `busVolts`). The voltage is proportional
 * to the speed, the torque to the current: V_oc = k·ω and T = k·I, with k = 1.35 × (line voltage per rad/s) for a
 * three-phase bridge. Current flows only above the cut-in speed, where V_oc exceeds the bus plus the diode drop.
 */
export interface Generator {
  /** Rectified open-circuit volts per rad/s: V_oc = voltsPerRad · ω, and torque = voltsPerRad · current. */
  voltsPerRad: number;
  /** Resistance of the circuit seen by the DC current (windings and cables), Ω. */
  resistance: number;
  busVolts: number;
  /** Drop of the two diodes in the conducting path, V. */
  diodeDrop: number;
}

export interface GeneratorPoint {
  omega: number;
  openCircuitVolts: number;
  current: number;
  /** Mechanical power taken at the shaft (air gap), W, and electrical power into the bus, W. */
  shaftPower: number;
  electricPower: number;
  torque: number;
  copperLoss: number;
  diodeLoss: number;
  /** Efficiency electric / shaft (1 when nothing flows). */
  efficiency: number;
}

export function generatorAt(g: Generator, omega: number): GeneratorPoint {
  const voc = g.voltsPerRad * omega;
  const current = Math.max(0, (voc - g.diodeDrop - g.busVolts) / g.resistance);
  const shaftPower = voc * current;
  const electricPower = g.busVolts * current;
  return {
    omega,
    openCircuitVolts: voc,
    current,
    shaftPower,
    electricPower,
    torque: g.voltsPerRad * current,
    copperLoss: g.resistance * current * current,
    diodeLoss: g.diodeDrop * current,
    efficiency: shaftPower > 0 ? electricPower / shaftPower : 1,
  };
}

/** Speed (rad/s) at which the generator starts to charge. */
export const cutInOmega = (g: Generator): number => (g.busVolts + g.diodeDrop) / g.voltsPerRad;

/**
 * Wind a generator for a rated point: at `ratedOmega` it takes `ratedShaftPower`, and the open-circuit voltage there is
 * `1 + headroom` times the bus. The resistance follows from the current. (A design choice, not a measurement.)
 */
export function designGenerator(
  ratedShaftPower: number,
  ratedOmega: number,
  busVolts: number,
  diodeDrop: number,
  headroom: number,
): Generator {
  const voc = busVolts * (1 + headroom);
  const current = ratedShaftPower / voc;
  const resistance = (voc - diodeDrop - busVolts) / current;
  return { voltsPerRad: voc / ratedOmega, resistance, busVolts, diodeDrop };
}

/** Torque the generator asks of the slow shaft through the drive: T_slow = ratio × T_gen / efficiency. */
export function loadTorqueAtSlowShaft(g: Generator, omegaSlow: number, ratio: number, driveEfficiency: number): number {
  return (ratio * generatorAt(g, omegaSlow * ratio).torque) / driveEfficiency;
}

/**
 * The speed of the slow shaft where the torque of the machine equals the torque of the load. `supply(ω)` must decrease and
 * `load(ω)` must not decrease with ω (true of a screw or a wheel and of a generator on a battery). Returns 0 when the machine
 * cannot even start, `omegaMax` when the load never catches it (runaway).
 */
export function matchSpeed(supply: (w: number) => number, load: (w: number) => number, omegaMax: number): number {
  const net = (w: number) => supply(w) - load(w);
  const tiny = omegaMax * 1e-6;
  if (net(tiny) <= 0) return 0;
  if (net(omegaMax) >= 0) return omegaMax;
  let a = tiny;
  let b = omegaMax;
  for (let i = 0; i < 30; i++) {
    const m = 0.5 * (a + b);
    if (net(m) > 0) a = m;
    else b = m;
  }
  return 0.5 * (a + b);
}

/**
 * The lesson "why a multiplier": for the same power, a generator turning at the speed of the screw needs
 * `slowOmega-to-fastOmega` times the torque, and a winding giving the battery voltage at that speed needs the same ratio
 * of volts per rad/s.
 */
export function multiplierLesson(power: number, slowOmega: number, fastOmega: number) {
  const slowTorque = torque(power, slowOmega);
  const fastTorque = torque(power, fastOmega);
  return { slowTorque, fastTorque, torqueRatio: slowTorque / fastTorque, ratio: fastOmega / slowOmega };
}
