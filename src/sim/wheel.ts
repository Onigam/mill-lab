import {
  BUCKET_DEPTH,
  BUCKET_FILL_SHARE,
  DESIGN_FILL,
  G,
  RHO,
  SLUICE_CV,
  SLUICE_OPENING,
  SPILL_PER_FILL,
  WHEEL_CLEARANCE,
  WHEEL_HYDRAULIC as HYDRAULIC,
  WHEEL_MECH,
  WHEEL_RIM_SPEED,
} from './machine';
import { clamp } from './physics';

// The water wheel, for comparison only: overshot (weight of the water), breastshot (both) and undershot (momentum).
// A deliberately small model: head utilisation × hydraulic factor × speed factor × bearings. Every number is an ESTIMATE:
// the sources give efficiency ranges, not equations, and disagree with each other (WHEEL_SOURCES). The spill and hydraulic
// factors below were set to plausible values that keep the PEAK of each type inside the ranges of the sources (the research
// asks the model to reproduce them, §5.3): the wheel is therefore anchored on the sources, it is not an independent result.
// docs/physics.md prints where each type falls.

export type WheelType = 'overshot' | 'breastshot' | 'undershot';

/** Efficiency ranges of the sources read by the research (docs/research.md §1), peak efficiency of the type, fractions. */
export const WHEEL_SOURCES: Record<
  WheelType,
  { encyclopaedia: [number, number]; review: [number, number] | null; head: [number, number] }
> = {
  // S6 (encyclopaedia): overshot 80 to 90 %, breastshot 50 to 60 %, undershot 50 to 60 % (about 20 % before the 18th century);
  // S7 (review of gravity wheels): about 85 % (overshot, undershot), 75 to 80 % (breastshot); S8: heads in metres
  overshot: { encyclopaedia: [0.8, 0.9], review: [0.85, 0.85], head: [2.5, 10] },
  breastshot: { encyclopaedia: [0.5, 0.6], review: [0.75, 0.8], head: [1.5, 3] },
  undershot: { encyclopaedia: [0.5, 0.6], review: [0.85, 0.85], head: [0.3, 2] },
};

export interface WheelDesign {
  type: WheelType;
  head: number;
  designFlow: number;
  diameter: number;
  width: number;
  /** Rim speed (m/s) and rotation speed (rpm) at the best operating point. */
  rimSpeed: number;
  designRpm: number;
}

export function sizeWheel(type: WheelType, head: number, designFlow: number): WheelDesign {
  const diameter =
    type === 'overshot' ? Math.max(0.5, head - WHEEL_CLEARANCE.overshot) : type === 'breastshot' ? 2 * head : 3;
  // the best rim speed of an undershot wheel is half the speed of the jet; the others turn at the speed of the machine's type
  const jet = SLUICE_CV * Math.sqrt(2 * G * head);
  const u = type === 'undershot' ? jet / 2 : WHEEL_RIM_SPEED[type];
  const perMetre = u * BUCKET_DEPTH * BUCKET_FILL_SHARE; // flow per metre of width with full buckets
  const width = type === 'undershot' ? designFlow / (jet * SLUICE_OPENING) : designFlow / (DESIGN_FILL * perMetre);
  return {
    type,
    head,
    designFlow,
    diameter,
    width,
    rimSpeed: u,
    designRpm: ((u / (diameter / 2)) * 60) / (2 * Math.PI),
  };
}

export interface WheelPoint {
  omega: number;
  rpm: number;
  flow: number;
  fill: number;
  headNet: number;
  hydraulicPower: number;
  shaftPower: number;
  torque: number;
  efficiency: number;
  /** Does the head of the site lie inside the range of the sources for this type? */
  inRange: boolean;
}

export function wheelPoint(
  w: WheelDesign,
  input: { flow: number; omega: number; tailRise?: number; headLoss?: number },
): WheelPoint {
  const omega = Math.max(input.omega, 1e-9);
  const headNet = Math.max(0, w.head - (input.tailRise ?? 0) - (input.headLoss ?? 0));
  const hydraulic = RHO * G * input.flow * headNet;
  const u = omega * (w.diameter / 2);
  let eta: number;
  let fill = 0;
  if (w.type === 'undershot') {
    // momentum: the sluice turns the head into a jet v = Cv sqrt(2 g H); a paddle at u takes 4x(1 − x) of it, x = u/(2·v/2)
    const v = SLUICE_CV * Math.sqrt(2 * G * Math.max(headNet, 1e-6));
    const x = u / v;
    eta = SLUICE_CV * SLUICE_CV * clamp(4 * x * (1 - x), 0, 1) * 0.5 * HYDRAULIC.undershot * WHEEL_MECH;
  } else {
    const clear = WHEEL_CLEARANCE[w.type];
    const perMetre = Math.max(u, 1e-6) * BUCKET_DEPTH * BUCKET_FILL_SHARE;
    fill = input.flow / (w.width * perMetre);
    const spill = clamp(1 - SPILL_PER_FILL * Math.min(fill, 2), 0, 1);
    const x = u / w.rimSpeed;
    const speed = clamp(x * (2 - x), 0, 1);
    const head = headNet > 0 ? Math.max(0, headNet - clear) / headNet : 0;
    eta = head * HYDRAULIC[w.type] * spill * speed * WHEEL_MECH;
  }
  const shaft = eta * hydraulic;
  const range = WHEEL_SOURCES[w.type].head;
  return {
    omega,
    rpm: (omega * 60) / (2 * Math.PI),
    flow: input.flow,
    fill,
    headNet,
    hydraulicPower: hydraulic,
    shaftPower: shaft,
    torque: shaft / omega,
    efficiency: eta,
    inRange: w.head >= range[0] && w.head <= range[1],
  };
}
