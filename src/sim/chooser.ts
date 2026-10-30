import { G, KAPLAN_AXIAL_SPEED, RHO } from './machine';

// "Which turbine for my site?" The zones where each type is used, in head (m) and flow (m³/s), and the lines of equal power
// P = η ρ g Q H. The zones OVERLAP and the sources disagree at their edges (docs/research.md S5, S8, S9): the chart draws
// zones, never lines, and the data here only says where each type is usual. Pure functions for the chart (panels/model.ts).

export type TurbineType =
  'undershot' | 'breastshot' | 'overshot' | 'screw' | 'crossflow' | 'kaplan' | 'francis' | 'pelton';

export const TURBINE_TYPES: TurbineType[] = [
  'undershot',
  'breastshot',
  'overshot',
  'screw',
  'kaplan',
  'crossflow',
  'francis',
  'pelton',
];

export interface Zone {
  /** Usual heads of the type, m (sources: S8 for the wheels, S5 for the screw, S9 for the turbines). */
  head: [number, number];
  /** Usual flows, m³/s: reported for the screw (S5), otherwise the limits come from the power window below. */
  flow: [number, number] | null;
  /** Usual power window of the type, W (ESTIMATE, used for the diagonal edges of a zone that has no reported flow range). */
  power: [number, number];
  /** Typical peak efficiency of the type, used for the lines of equal power and the expected power (ESTIMATE; crossflow 0.74 is K10). */
  eta: number;
  /** Where the head range comes from. */
  source: string;
}

export const ZONES: Record<TurbineType, Zone> = {
  undershot: { head: [0.3, 2], flow: null, power: [100, 2e4], eta: 0.45, source: 'S8' },
  breastshot: { head: [1.5, 3], flow: null, power: [200, 5e4], eta: 0.6, source: 'S8' },
  overshot: { head: [2.5, 10], flow: null, power: [200, 1e5], eta: 0.75, source: 'S8' },
  screw: { head: [0.1, 10], flow: [0.01, 14.5], power: [10, 1e6], eta: 0.75, source: 'S5' },
  kaplan: { head: [2, 40], flow: null, power: [2e4, 5e7], eta: 0.88, source: 'S9' },
  crossflow: { head: [8, 60], flow: null, power: [5e3, 2e6], eta: 0.74, source: 'S9' },
  francis: { head: [25, 350], flow: null, power: [5e4, 1e8], eta: 0.88, source: 'S9' },
  pelton: { head: [75, 1500], flow: null, power: [5e3, 3e7], eta: 0.9, source: 'S9' },
};

/** Flow (m³/s) that carries the power P through the head H at efficiency eta. */
export const equalPowerFlow = (power: number, head: number, eta: number): number => power / (eta * RHO * G * head);

/** The flow limits of a zone at a head, m³/s. */
export function flowLimits(type: TurbineType, head: number): [number, number] {
  const z = ZONES[type];
  if (z.flow) return z.flow;
  return [equalPowerFlow(z.power[0], head, z.eta), equalPowerFlow(z.power[1], head, z.eta)];
}

export function inHeadRange(type: TurbineType, head: number): boolean {
  const [a, b] = ZONES[type].head;
  return head >= a && head <= b;
}

export function fits(type: TurbineType, head: number, flow: number): boolean {
  if (!inHeadRange(type, head)) return false;
  const [lo, hi] = flowLimits(type, head);
  return flow >= lo && flow <= hi;
}

/** The corners of a zone in (log10 H, log10 Q), closed, clipped to the chart box. */
export function zonePolygon(type: TurbineType, box: ChartBox, steps = 6): [number, number][] {
  const [h0, h1] = ZONES[type].head;
  const pts: [number, number][] = [];
  const clampY = (q: number) => Math.min(box.yMax, Math.max(box.yMin, Math.log10(q)));
  const clampX = (h: number) => Math.min(box.xMax, Math.max(box.xMin, Math.log10(h)));
  for (let i = 0; i <= steps; i++) {
    const h = h0 * Math.pow(h1 / h0, i / steps);
    pts.push([clampX(h), clampY(flowLimits(type, h)[0])]);
  }
  for (let i = steps; i >= 0; i--) {
    const h = h0 * Math.pow(h1 / h0, i / steps);
    pts.push([clampX(h), clampY(flowLimits(type, h)[1])]);
  }
  pts.push(pts[0]);
  return pts;
}

export interface ChartBox {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

/** The box of the chooser chart: heads from 0.1 m to 1 km, flows from 10 L/s to 10 m³/s (log10 units). */
export const CHOOSER_BOX: ChartBox = { xMin: -1, xMax: 3, yMin: -2, yMax: 1 };

/** Powers of the lines of equal power, W. */
export const POWER_LINES = [1e3, 1e4, 1e5, 1e6];

/** A line of equal power in the chart box: the points where it lies inside it (log10 units). */
export function powerLine(power: number, eta: number, box: ChartBox, n = 80): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const x = box.xMin + ((box.xMax - box.xMin) * i) / n;
    const y = Math.log10(equalPowerFlow(power, Math.pow(10, x), eta));
    out.push([x, y >= box.yMin && y <= box.yMax ? y : NaN]);
  }
  return out;
}

export interface Candidate {
  type: TurbineType;
  headInRange: boolean;
  fits: boolean;
  eta: number;
  /** Power the type would give at this site, W. */
  power: number;
}

/** Every type for a site: does it fit, and what would it give. Sorted with the fitting types first, then by power. */
export function candidatesFor(head: number, flow: number): Candidate[] {
  return TURBINE_TYPES.map((type) => ({
    type,
    headInRange: inHeadRange(type, head),
    fits: fits(type, head, flow),
    eta: ZONES[type].eta,
    power: ZONES[type].eta * RHO * G * flow * head,
  })).sort(
    (a, b) => Number(b.fits) - Number(a.fits) || Number(b.headInRange) - Number(a.headInRange) || b.power - a.power,
  );
}

/** Diameter of a runner that passes the flow Q at the given axial speed, m (K9: a screw is big for what it produces). */
export const runnerDiameter = (flow: number, axialSpeed = KAPLAN_AXIAL_SPEED): number =>
  Math.sqrt((4 * flow) / (Math.PI * axialSpeed));
