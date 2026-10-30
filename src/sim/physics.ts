import { G, RHO } from './machine';

// Hydraulic arithmetic shared by every machine (pure, SI). These are the formulas behind K1, K10 to K13 and K16 of
// docs/research.md: they are exact, the video only rounds them.

/** Hydraulic power of a flow Q (m³/s) falling through a head H (m): P = ρ g Q H, in W. */
export const hydraulicPower = (q: number, head: number): number => RHO * G * q * head;

/** Flow (m³/s) that carries the power P (W) through the head H at efficiency eta. */
export const flowForPower = (power: number, head: number, eta = 1): number => power / (eta * RHO * G * head);

/** Head (m) at which the flow Q gives the power P at efficiency eta. */
export const headForPower = (power: number, q: number, eta = 1): number => power / (eta * RHO * G * q);

/** Overall efficiency of a plant: electric power over hydraulic power. */
export const overallEfficiency = (electric: number, q: number, head: number): number =>
  electric / hydraulicPower(q, head);

/** Pressure at the foot of a head of water, bar. */
export const pressureBar = (head: number): number => (RHO * G * head) / 1e5;

/** Hours of a year during which a plant ran, from the hours counted over several years. */
export const hoursPerYear = (hours: number, years: number): number => hours / years;

/** A speed ratio D_large / D_small of a belt (K11: a 1 m flywheel on a 0.385 m pulley gives 2.6). */
export const beltRatio = (dLarge: number, dSmall: number): number => dLarge / dSmall;

/** Clamp a number into [lo, hi]. */
export const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

/** Linear interpolation of a sampled curve (xs increasing) at x, clamped at the ends. */
export function interp(xs: readonly number[], ys: readonly number[], x: number): number {
  const n = xs.length;
  if (x <= xs[0]) return ys[0];
  if (x >= xs[n - 1]) return ys[n - 1];
  let lo = 0;
  let hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (xs[mid] <= x) lo = mid;
    else hi = mid;
  }
  const w = (x - xs[lo]) / (xs[hi] - xs[lo]);
  return ys[lo] + (ys[hi] - ys[lo]) * w;
}

/** Bisection of a function that changes sign on [lo, hi]; returns the root to the given tolerance. */
export function bisect(f: (x: number) => number, lo: number, hi: number, iterations = 60): number {
  let a = lo;
  let b = hi;
  const fa = f(a);
  for (let i = 0; i < iterations; i++) {
    const m = 0.5 * (a + b);
    const fm = f(m);
    if (fm === 0) return m;
    if (Math.sign(fm) === Math.sign(fa)) a = m;
    else b = m;
  }
  return 0.5 * (a + b);
}
