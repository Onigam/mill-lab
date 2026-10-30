import { frictionFactor } from '@onigam/lab-kit/sim/hydraulic';
import { bucketAt, bucketField, bucketTable, type BucketTable } from './bucket';
import {
  BEARING_MU,
  BEARING_RADIUS_FRAC,
  BLADES,
  BLADE_THICKNESS_FRAC,
  CORE_WALL_FRAC,
  C_LEAK,
  G,
  GAP_COEFF,
  K_INLET,
  OUTLET_PI,
  OUTLET_X_MAX,
  PITCH_RATIO,
  PSI_OPT,
  RADIUS_RATIO,
  RHO,
  ROUGHNESS_NEW_MM,
  SPEED_RULE_RPM,
  WOOD_DENSITY,
} from './machine';
import { bisect, clamp } from './physics';

// The Archimedes screw used as a turbine: geometry from the design point, then the steady performance at any flow and speed.
// Pure TypeScript, SI inside (rpm only where a human reads it). The method follows the structure of the published models
// (Lubitz, Lyons & Simmons 2014; Kozyn & Lubitz 2017; Simmons & Lubitz 2024): shaft power = ideal power of the buckets minus
// the losses, and the flow splits into Q = Q_b + Q_g + Q_o (bucket, gap leakage, overflow). docs/physics.md says, formula by
// formula, which parts were checked in a source we read and which are the lab's own estimate.

export interface ScrewDesign {
  blades: number;
  radiusRatio: number;
  pitchRatio: number;
  slope: number;
  slopeDeg: number;
  /** Outer and inner diameter, pitch, flighted length, gap between blade tips and trough: m. */
  outerDiameter: number;
  innerDiameter: number;
  pitch: number;
  length: number;
  gap: number;
  /** Head the screw covers, m: length × sin(slope). */
  head: number;
  /** Flow and speed it was sized for. */
  designFlow: number;
  designRpm: number;
  /** Volume of one full bucket, m³, and number of buckets in the screw. */
  bucketVolume: number;
  buckets: number;
  /** Fraction of one pitch occupied by water when the buckets are full (Rorres's n). */
  volumeRatio: number;
  /** Depth between an empty and a full bucket (the part of the head lost when the screw is under-filled), m. */
  bucketDepth: number;
  /** Mass of the turning part, kg, and its moment of inertia about the axis, kg·m². */
  mass: number;
  inertia: number;
  table: BucketTable;
}

/** The rotation speed rule of Nagel 1968 (quoted by Rorres 2000): n = 50 / D^(2/3), rpm, D in metres. */
export const speedRuleRpm = (diameter: number, coeff = SPEED_RULE_RPM): number => coeff / Math.pow(diameter, 2 / 3);

/** Gap between the blade tips and the trough: g = 0.0045 · sqrt(D_o), m (Nagel 1968 via Dellinger 2015). */
export const nagelGap = (diameter: number): number => GAP_COEFF * Math.sqrt(diameter);

function ratiosOf(slopeDeg: number) {
  return {
    radiusRatio: RADIUS_RATIO,
    pitchRatio: PITCH_RATIO,
    blades: BLADES,
    slope: (slopeDeg * Math.PI) / 180,
  };
}

/** Flow of a full-bucket screw of outer diameter D turning at `rpm`, m³/s: bucket flow + gap leakage (any shape, Nagel's gap). */
export function fullBucketFlow(table: BucketTable, d: number, rpm: number): number {
  const r = d / 2;
  const full = bucketAt(table, 1);
  const qb = (table.ratios.blades * full.volume * r ** 3 * rpm) / 60;
  const qg = C_LEAK * nagelGap(d) * Math.sqrt(2 * G * table.headStep * r) * full.tip * r;
  return qb + qg;
}

const fullFlowAtRule = (d: number, table: BucketTable): number => fullBucketFlow(table, d, speedRuleRpm(d));

/** Outer diameter (m) of the screw that carries `flow` with full buckets at the rule speed. */
export function diameterForFlow(flow: number, slopeDeg = 22): number {
  const table = bucketTable(ratiosOf(slopeDeg));
  return bisect((d) => fullFlowAtRule(d, table) - flow, 0.02, 20, 70);
}

/** Moment of area of the helicoid blades per pitch: ∫ sqrt(r² + a²) dr · 2π, a = S/2π. */
function helicoidArea(ri: number, ro: number, pitch: number): number {
  const a = pitch / (2 * Math.PI);
  const prim = (r: number) => 0.5 * (r * Math.sqrt(r * r + a * a) + a * a * Math.asinh(r / a));
  return 2 * Math.PI * (prim(ro) - prim(ri));
}

/** Size the screw: the diameter from the flow, the pitch, the length from the head, the gap from Nagel's rule. */
export function sizeScrew(opts: { designFlow: number; head: number; slopeDeg: number }): ScrewDesign {
  const q = ratiosOf(opts.slopeDeg);
  const table = bucketTable(q);
  const d = diameterForFlow(opts.designFlow, opts.slopeDeg);
  const r = d / 2;
  const pitch = PITCH_RATIO * d;
  const length = opts.head / Math.sin(q.slope);
  const full = bucketAt(table, 1);
  const bladeMass =
    WOOD_DENSITY * BLADE_THICKNESS_FRAC * d * q.blades * helicoidArea(RADIUS_RATIO * r, r, pitch) * (length / pitch);
  const di = RADIUS_RATIO * d;
  const coreMass = WOOD_DENSITY * Math.PI * (di / 2) ** 2 * (1 - (1 - (2 * CORE_WALL_FRAC * d) / di) ** 2) * length;
  const mass = bladeMass + coreMass;
  return {
    blades: q.blades,
    radiusRatio: q.radiusRatio,
    pitchRatio: q.pitchRatio,
    slope: q.slope,
    slopeDeg: opts.slopeDeg,
    outerDiameter: d,
    innerDiameter: di,
    pitch,
    length,
    gap: nagelGap(d),
    head: opts.head,
    designFlow: opts.designFlow,
    designRpm: speedRuleRpm(d),
    bucketVolume: full.volume * r ** 3,
    buckets: (q.blades * length) / pitch,
    volumeRatio: table.volumeRatio,
    bucketDepth: table.depth * r,
    mass,
    inertia: 0.5 * mass * r * r,
    table,
  };
}

/** What the visitor or the season does to a screw. */
export interface ScrewInput {
  /** Flow arriving at the screw, m³/s. */
  flow: number;
  /** Rotation speed, rad/s. */
  omega: number;
  /** Rise of the tailwater above its design level, m (negative = lower). */
  tailRise?: number;
  /** Head lost upstream of the screw (a clogged rack), m. */
  headLoss?: number;
  /** Wall roughness, mm. */
  roughnessMm?: number;
  /** Gap as a multiple of Nagel's rule (a worn screw leaks more). */
  gapScale?: number;
}

/** The steady state of the screw at one flow and one speed. Powers in W, flows in m³/s, heads in m. */
export interface ScrewPoint {
  omega: number;
  rpm: number;
  /** rpm over the rule n = 50 / D^(2/3). */
  speedRatio: number;
  flow: number;
  /** Bucket fill height ratio (1 = buckets full to the saddle) and overflow. */
  fill: number;
  overfilled: boolean;
  qBucket: number;
  qGap: number;
  qOver: number;
  /** Head between the pool and the tailwater, head the screw captures. */
  headNet: number;
  headCaptured: number;
  /** Power of the water that arrives: ρ g Q (H_net − drawdown of the pool). */
  hydraulicPower: number;
  /** Power of the water that goes through the buckets, after the drawdown of the pool. */
  idealPower: number;
  /** Power the leaking water would have carried: lost (information). */
  gapLoss: number;
  overflowLoss: number;
  drawdownLoss: number;
  inletLoss: number;
  outletLoss: number;
  frictionLoss: number;
  bearingLoss: number;
  /** Signed power at the shaft and torque (negative: the screw would have to be driven). */
  shaftPower: number;
  torque: number;
  /** Shaft power over hydraulic power, 0 when the screw brakes. */
  efficiency: number;
}

/** Leakage through the gap at a fill, m³/s (Torricelli law along the blade tip, bucket.ts). */
export function gapLeakage(d: ScrewDesign, f: number, gapScale = 1): number {
  const r = d.outerDiameter / 2;
  return C_LEAK * d.gap * gapScale * Math.sqrt(2 * G * d.table.headStep * r) * bucketField(d.table, f, 'tip') * r;
}

/** Outlet dynamic loss factor Π(x), x = ψ_L − ψ_L* (Simmons & Lubitz 2024, eq. 3.11, N = 3). */
export const outletFactor = (x: number): number => OUTLET_PI.a * x * x + OUTLET_PI.b * x + OUTLET_PI.c;

export function screwPoint(d: ScrewDesign, input: ScrewInput): ScrewPoint {
  const { flow } = input;
  const omega = Math.max(input.omega, 1e-9);
  const tailRise = input.tailRise ?? 0;
  const gapScale = input.gapScale ?? 1;
  const roughness = (input.roughnessMm ?? ROUGHNESS_NEW_MM) / 1000;
  const r = d.outerDiameter / 2;
  const n = d.blades;
  // continuity: Q = Q_b(f) + Q_g(f) (+ Q_o when the buckets are full and the screw is too slow). Both terms are piecewise
  // linear in f between the nodes of the table, so the fill is found by walking the nodes, exactly.
  const kb = (n * r ** 3 * omega) / (2 * Math.PI);
  const kg = C_LEAK * d.gap * gapScale * Math.sqrt(2 * G * d.table.headStep * r) * r;
  const nodes = d.table.samples;
  const last = nodes.length - 1;
  const bucketFlow = (f: number) => kb * bucketField(d.table, f, 'volume');
  const capacity = kb * nodes[last].volume + kg * nodes[last].tip;
  let f = 1;
  let qOver = 0;
  if (flow >= capacity) {
    qOver = flow - capacity;
  } else {
    let i = 0;
    while (i < last - 1 && kb * nodes[i + 1].volume + kg * nodes[i + 1].tip <= flow) i++;
    const q0 = kb * nodes[i].volume + kg * nodes[i].tip;
    const q1 = kb * nodes[i + 1].volume + kg * nodes[i + 1].tip;
    f = (i + (q1 > q0 ? Math.min(1, Math.max(0, (flow - q0) / (q1 - q0))) : 0)) / last;
  }
  const qBucket = bucketFlow(f);
  const qGap = gapLeakage(d, f, gapScale);

  const headNet = Math.max(0, d.head - tailRise - (input.headLoss ?? 0));
  const headCaptured = Math.min(headNet, d.head);
  const drawdown = (1 - f) * d.bucketDepth;
  const usable = Math.max(0, headCaptured - drawdown);
  // the water that arrives has the head of the (lowered) pool; the drawdown is reported apart as the head lost at low fill
  const hydraulic = RHO * G * flow * Math.max(0, headNet - drawdown);
  const ideal = RHO * G * qBucket * usable;

  const tipSpeed = omega * r;
  const inlet = K_INLET * 0.5 * RHO * qBucket * tipSpeed * tipSpeed;
  // ψ_L − ψ_L*, the tailwater above the optimal submergence; the correlation stops at +0.2 to +0.3 (their data), held beyond OUTLET_X_MAX
  const x = Math.min(OUTLET_X_MAX, tailRise / (d.outerDiameter * Math.cos(d.slope)));
  const outlet = RHO * G * qBucket * d.outerDiameter * outletFactor(x);

  // viscous friction of the wetted blades and core, ½ρ c_f ω³ ∫ r³ dA, over the buckets (the trough is at rest)
  const wet = bucketAt(d.table, f);
  const gapWidth = d.outerDiameter - d.innerDiameter;
  const cf = frictionFactor(0.5 * tipSpeed * (1 + d.radiusRatio) + 1e-6, gapWidth, roughness) / 4;
  const friction = 0.5 * RHO * cf * omega ** 3 * d.buckets * wet.wetR3 * r ** 5;

  const bearing = BEARING_MU * d.mass * G * BEARING_RADIUS_FRAC * d.outerDiameter * omega;
  const shaft = ideal - inlet - outlet - friction - bearing;
  return {
    omega,
    rpm: (omega * 60) / (2 * Math.PI),
    speedRatio: (omega * 60) / (2 * Math.PI) / speedRuleRpm(d.outerDiameter),
    flow,
    fill: f,
    overfilled: qOver > 0,
    qBucket,
    qGap,
    qOver,
    headNet,
    headCaptured,
    hydraulicPower: hydraulic,
    idealPower: ideal,
    gapLoss: RHO * G * qGap * headNet,
    overflowLoss: RHO * G * qOver * headNet,
    drawdownLoss: RHO * G * qBucket * drawdown,
    inletLoss: inlet,
    outletLoss: outlet,
    frictionLoss: friction,
    bearingLoss: bearing,
    shaftPower: shaft,
    torque: shaft / omega,
    efficiency: hydraulic > 0 ? Math.max(0, shaft) / hydraulic : 0,
  };
}

/** Flow the screw can pass with full buckets at `factor` times its design speed (the swallowing capacity), m³/s. */
export function swallowingCapacity(d: ScrewDesign, factor = 1, gapScale = 1): number {
  const omega = ((d.designRpm * factor) / 60) * 2 * Math.PI;
  const r = d.outerDiameter / 2;
  return (d.blades * bucketAt(d.table, 1).volume * r ** 3 * omega) / (2 * Math.PI) + gapLeakage(d, 1, gapScale);
}

/** The speed (rpm) where the shaft power is greatest at a given flow, by a scan (for the charts and the tests). */
export function bestSpeed(
  d: ScrewDesign,
  flow: number,
  input: Partial<ScrewInput> = {},
): { rpm: number; point: ScrewPoint } {
  let best: ScrewPoint | null = null;
  const top = d.designRpm * 3;
  for (let i = 1; i <= 120; i++) {
    const rpm = (top * i) / 120;
    const p = screwPoint(d, { ...input, flow, omega: (rpm * 2 * Math.PI) / 60 });
    if (!best || p.shaftPower > best.shaftPower) best = p;
  }
  return { rpm: best!.rpm, point: best! };
}

/** Curve of shaft power and efficiency against speed at one flow (rpm from 0 to `maxRpm`). */
export function speedCurve(d: ScrewDesign, flow: number, input: Partial<ScrewInput>, maxRpm: number, points = 60) {
  const out: ScrewPoint[] = [];
  for (let i = 1; i <= points; i++) {
    const rpm = (maxRpm * i) / points;
    out.push(screwPoint(d, { ...input, flow, omega: (clamp(rpm, 0.01, 1e4) * 2 * Math.PI) / 60 }));
  }
  return out;
}

export const OPTIMAL_SUBMERGENCE = PSI_OPT;
