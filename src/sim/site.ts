import { DAYS, FLOOD_GATE_FACTOR, RESERVED_FRACTION } from './machine';

// The water of the site: head, a year of daily river flows, the flow that must stay in the river, the tailwater that rises
// with the river. Three presets (a small brook, a mill race, a river). Every number is an ESTIMATE of a typical site: the
// sources only give orders of magnitude (docs/research.md §3, §5.6, K13, K16). A year is made, not measured: seasonal
// swing + correlated weather + a few floods, drawn from a seeded generator, so a run is reproducible.

export type SiteId = 'brook' | 'race' | 'river';
export const SITE_IDS: SiteId[] = ['brook', 'race', 'river'];

export interface SiteHydrology {
  id: SiteId;
  /** Mean annual flow, m³/s. */
  meanFlow: number;
  /** Amplitude of the seasonal swing, as a natural-log factor (0 = none). */
  seasonal: number;
  /** Day of the year of the highest water (0 = 1 January). */
  peakDay: number;
  /** Spread of the day-to-day weather, natural-log units, and its memory (per day). */
  weather: number;
  memory: number;
  /** Floods of the year: number, size (× the flow of the day) and length (days). */
  floods: { count: number; size: number; days: number };
  /** Rise of the tailwater for each tenfold increase of the river flow above its median, m. */
  tailPerDecade: number;
  seed: number;
}

export const SITES: Record<SiteId, SiteHydrology> = {
  brook: {
    id: 'brook',
    meanFlow: 0.06,
    seasonal: 1.1,
    peakDay: 40,
    weather: 0.55,
    memory: 0.85,
    floods: { count: 3, size: 3, days: 3 },
    tailPerDecade: 1.0,
    seed: 11,
  },
  race: {
    id: 'race',
    meanFlow: 0.3,
    seasonal: 1.0,
    peakDay: 45,
    weather: 0.45,
    memory: 0.9,
    floods: { count: 3, size: 3.5, days: 4 },
    tailPerDecade: 1.5,
    seed: 23,
  },
  river: {
    id: 'river',
    meanFlow: 3,
    seasonal: 0.7,
    peakDay: 55,
    weather: 0.35,
    memory: 0.93,
    floods: { count: 2, size: 3, days: 6 },
    tailPerDecade: 2.0,
    seed: 37,
  },
};

/** A small seeded generator (mulberry32), uniform in [0, 1). */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A standard normal number from two uniform ones (Box–Muller). */
function normal(u: () => number): number {
  const a = Math.max(u(), 1e-12);
  return Math.sqrt(-2 * Math.log(a)) * Math.cos(2 * Math.PI * u());
}

const yearCache = new Map<SiteId, Float64Array>();

/** The 365 daily flows of the year of a site, m³/s; their mean is the mean flow of the site. */
export function dailyFlows(id: SiteId): Float64Array {
  const hit = yearCache.get(id);
  if (hit) return hit;
  const s = SITES[id];
  const u = rng(s.seed);
  const out = new Float64Array(DAYS);
  // weather: an AR(1) process in log units with unit variance, scaled by `weather`
  let w = 0;
  const k = Math.sqrt(1 - s.memory * s.memory);
  const log = new Float64Array(DAYS);
  for (let d = 0; d < DAYS; d++) {
    w = s.memory * w + k * normal(u);
    log[d] = s.seasonal * Math.cos((2 * Math.PI * (d - s.peakDay)) / DAYS) + s.weather * w;
  }
  // floods: a few winter or spring events, a factor on the flow of those days
  const mult = new Float64Array(DAYS).fill(1);
  for (let i = 0; i < s.floods.count; i++) {
    const start = Math.floor(((i + 0.5) / s.floods.count) * 240 + 20 * u());
    for (let j = 0; j < s.floods.days; j++) {
      const day = (start + j) % DAYS;
      mult[day] = Math.max(mult[day], 1 + (s.floods.size - 1) * Math.sin((Math.PI * (j + 0.5)) / s.floods.days));
    }
  }
  let sum = 0;
  for (let d = 0; d < DAYS; d++) {
    out[d] = Math.exp(log[d]) * mult[d];
    sum += out[d];
  }
  const norm = (s.meanFlow * DAYS) / sum;
  for (let d = 0; d < DAYS; d++) out[d] *= norm;
  yearCache.set(id, out);
  return out;
}

/** Flow on a (fractional) day of the year, m³/s, interpolated between the daily values. */
export function flowOnDay(id: SiteId, day: number): number {
  const q = dailyFlows(id);
  const x = ((day % DAYS) + DAYS) % DAYS;
  const i = Math.floor(x);
  const w = x - i;
  return q[i] * (1 - w) + q[(i + 1) % DAYS] * w;
}

/** Flow exceeded during a fraction p of the year (the flow-duration curve), m³/s. */
const sortedCache = new Map<SiteId, number[]>();

export function exceedanceFlow(id: SiteId, p: number): number {
  let sorted = sortedCache.get(id);
  if (!sorted) {
    sorted = Array.from(dailyFlows(id)).sort((a, b) => b - a);
    sortedCache.set(id, sorted);
  }
  const i = Math.min(DAYS - 1, Math.max(0, Math.round(p * (DAYS - 1))));
  return sorted[i];
}

export const medianFlow = (id: SiteId): number => exceedanceFlow(id, 0.5);

/** Flow that must stay in the river, m³/s. */
export const reservedFlow = (id: SiteId): number => RESERVED_FRACTION * SITES[id].meanFlow;

/** Flow above which the owner closes the gate, m³/s. */
export const floodFlow = (id: SiteId): number => FLOOD_GATE_FACTOR * medianFlow(id);

/** Rise of the tailwater caused by the river flow, m: zero up to the median flow, then a fixed rise per tenfold increase. */
export function tailRise(id: SiteId, riverFlow: number): number {
  const q0 = medianFlow(id);
  return riverFlow > q0 ? SITES[id].tailPerDecade * Math.log10(riverFlow / q0) : 0;
}

/** Month (0 to 11) of a day of the year. */
export function monthOf(day: number): number {
  const edges = [31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334, 365];
  const d = ((Math.floor(day) % DAYS) + DAYS) % DAYS;
  return edges.findIndex((e) => d < e);
}

/** Day of the month (1-based) of a day of the year. */
export function dayOfMonth(day: number): number {
  const edges = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  const d = ((Math.floor(day) % DAYS) + DAYS) % DAYS;
  return d - edges[monthOf(d)] + 1;
}
