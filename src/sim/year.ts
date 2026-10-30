import { DAYS, HOURS_PER_YEAR } from './machine';
import { dailyFlows, floodFlow, reservedFlow } from './site';
import { plantFor, solvePlant, type PlantParams } from './system';

// A year of the plant: the daily flows of the site (site.ts) through the plant (system.ts), one steady state per day. The
// annual energy, the capacity factor, the days the plant stood still and why, and the winter share are results.

export interface YearResult {
  /** Daily river flow, usable flow, flow through the machine, electric power (W), index = day of the year. */
  river: number[];
  usable: number[];
  flow: number[];
  power: number[];
  /** Energy of the year, kWh, mean power, W, and capacity factor against the rated power of the plant. */
  energy: number;
  meanPower: number;
  capacityFactor: number;
  /** Days the plant stood still, by cause, and the hours it ran. */
  daysLowWater: number;
  daysFlood: number;
  hoursRunning: number;
  /** Energy of each month, kWh. */
  monthly: number[];
  /** Share of the energy produced from December to February, and the share of the year those months are. */
  winterShare: number;
  winterDays: number;
  /** Energy the site would give at the head with the usable flow and an efficiency of 1, kWh. */
  siteEnergy: number;
  ratedPower: number;
}

import { monthOf } from './site';
const monthIndex = (d: number): number => monthOf(d);

export function simulateYear(p: PlantParams): YearResult {
  const base = { ...p, gateOpen: true };
  const q = dailyFlows(p.site);
  const river: number[] = [];
  const usable: number[] = [];
  const flow: number[] = [];
  const power: number[] = [];
  const monthly = new Array(12).fill(0);
  let energy = 0;
  let siteEnergy = 0;
  let lowWater = 0;
  let flood = 0;
  let hours = 0;
  let winter = 0;
  const reserved = reservedFlow(p.site);
  for (let d = 0; d < DAYS; d++) {
    const o = solvePlant(base, q[d]);
    river.push(q[d]);
    usable.push(Math.max(0, q[d] - reserved));
    flow.push(o.flow);
    power.push(o.electricPower);
    const kwh = (o.electricPower * 24) / 1000;
    energy += kwh;
    siteEnergy += (o.sitePower * 24) / 1000;
    monthly[monthIndex(d)] += kwh;
    if (o.stopped === 'lowWater') lowWater++;
    if (o.stopped === 'flood') flood++;
    if (o.electricPower > 1) hours += 24;
    if (d < 59 || d >= 334) winter += kwh;
  }
  const rated = plantFor(p).ratedElectric;
  return {
    river,
    usable,
    flow,
    power,
    energy,
    meanPower: (energy * 1000) / HOURS_PER_YEAR,
    capacityFactor: (energy * 1000) / (rated * HOURS_PER_YEAR),
    daysLowWater: lowWater,
    daysFlood: flood,
    hoursRunning: hours,
    monthly,
    winterShare: energy > 0 ? winter / energy : 0,
    winterDays: 59 + (DAYS - 334),
    siteEnergy,
    ratedPower: rated,
  };
}

/** Flow-duration curve: flows sorted from the highest, with the share of the year each is exceeded, %. */
export function flowDuration(river: number[]): { share: number[]; flow: number[] } {
  const sorted = [...river].sort((a, b) => b - a);
  return { share: sorted.map((_, i) => (100 * (i + 0.5)) / sorted.length), flow: sorted };
}

export const floodLimit = floodFlow;
