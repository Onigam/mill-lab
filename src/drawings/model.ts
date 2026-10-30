// What the simulation gives at the design point, for the sheets that print MODEL RESULTS (PL-03). Computed on first use from src/sim, never
// typed; drawings.test.ts recomputes every one of them by an independent route (and the rounded figures of src/data/figures.ts), so that a
// recalibration of the model fails loudly. The design point is the preset `full-size` (docs/research.md §8): the mill race, 1.75 m, 180 L/s.
import { BUS_VOLTS, CHAIN_EFFICIENCY, DIODE_DROP } from '../sim/machine';
import { MillSim } from '../sim/engine';
import { cutInOmega, radToRpm } from '../sim/mech';
import { presetParams } from '../sim/presets';
import { plantFor, solvePlant } from '../sim/system';

export interface DrivePoint {
  /** Screw shaft: speed (rpm), torque (N·m), power (W). */
  screw: { rpm: number; torque: number; power: number };
  /** Countershaft, after the chain: it carries the small sprocket and the large pulley. */
  counter: { rpm: number; torque: number; power: number };
  /** Generator shaft, after the belt. */
  generator: { rpm: number; torque: number; power: number };
  /** Ratios of the chain stage, of the belt stage and of the two together. */
  chain: number;
  belt: number;
  total: number;
  /** Electrical side: open-circuit voltage of the rectifier at the rated speed (V), current into the battery (A), power into it (W), the bus (V). */
  voc: number;
  current: number;
  electric: number;
  bus: number;
  /** Power of the water that arrives (W) and the efficiency of the chain and belt together (0..1). */
  water: number;
  etaDrive: number;
  /** Generator speed at which the battery starts to charge, rpm of the generator and of the screw. */
  cutInGenRpm: number;
  cutInScrewRpm: number;
  /** Loss in the diodes of the rectifier, W. */
  diodeLoss: number;
}

let cache: DrivePoint | null = null;

/** The steady operating point of the full-size preset, with the chain and the belt split into three shafts. */
export function drivePoint(): DrivePoint {
  if (cache) return cache;
  const p = presetParams('full-size');
  const plant = plantFor(p);
  const op = solvePlant(p, p.riverFlow);
  const w = op.omega;
  const counterPower = op.shaftPower * CHAIN_EFFICIENCY;
  const genPower = op.shaftPower * op.driveEfficiency;
  const total = p.chainRatio * p.beltRatio;
  const cutIn = radToRpm(cutInOmega(plant.generator));
  cache = {
    screw: { rpm: op.rpm, torque: op.torque, power: op.shaftPower },
    counter: { rpm: op.rpm * p.chainRatio, torque: counterPower / (w * p.chainRatio), power: counterPower },
    generator: { rpm: op.generatorRpm, torque: op.generatorTorque, power: genPower },
    chain: p.chainRatio,
    belt: p.beltRatio,
    total,
    voc: op.openCircuitVolts,
    current: op.current,
    electric: op.electricPower,
    bus: BUS_VOLTS,
    water: op.hydraulicPower,
    etaDrive: op.driveEfficiency,
    cutInGenRpm: cutIn,
    cutInScrewRpm: cutIn / total,
    diodeLoss: DIODE_DROP * op.current,
  };
  return cache;
}

export interface TorqueCurve {
  /** Speed of the screw, rpm. */
  rpm: number[];
  /** Torque of the screw at its shaft and torque the generator asks of it through the drive, N·m. */
  machine: number[];
  load: number[];
  /** Power on the screw's shaft, W. */
  power: number[];
}

let curve: TorqueCurve | null = null;

/** The curves the simulation panel plots (`MillSim.getSpeedCurve`, 240 points from 0 to 2.6 times the design speed: the power has a sharp maximum at the design speed that the panel's 60 points only just show), at the design flow of the preset. */
export function torqueCurve(): TorqueCurve {
  if (curve) return curve;
  const c = new MillSim().getSpeedCurve(240);
  curve = { rpm: c.rpm, machine: c.machineTorque, load: c.loadTorque, power: c.shaftPower };
  return curve;
}
