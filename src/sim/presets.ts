import { SLOPE_DEG_DEFAULT } from './machine';
import { medianFlow, type SiteId } from './site';
import { plantFor } from './system';
import type { MachineId, MillParams, PresetId, ScenarioId } from './types';

// The lab's story and its knobs. Presets are the design points (docs/research.md §8: the full-size small mill by default, the
// prototype of the video, a brook and a river); scenarios are small scripted situations used by the lessons. Every number is
// either REPORTED (K-number), DERIVED, or an ESTIMATE of docs/physics.md.

/** Allowed range and slider step of every editable number. */
export const RANGES = {
  head: { min: 0.3, max: 6, step: 0.05 },
  designFlow: { min: 0.01, max: 5, step: 0.005 },
  slope: { min: 15, max: 35, step: 1 },
  tailwater: { min: -0.3, max: 1.5, step: 0.05 },
  roughness: { min: 0.05, max: 5, step: 0.05 },
  gapScale: { min: 0.5, max: 4, step: 0.1 },
  debris: { min: 0, max: 0.95, step: 0.05 },
  chainRatio: { min: 1, max: 6, step: 0.1 },
  beltRatio: { min: 1, max: 8, step: 0.1 },
  fixedRpm: { min: 5, max: 200, step: 1 },
  riverFlow: { min: 0, max: 20, step: 0.001 },
} as const;

export type RangedKey = keyof typeof RANGES;

/** Largest river flow of the slider for a site, m³/s: eight times its median, rounded up to a round figure. */
export function riverFlowMax(site: SiteId): number {
  const q = 8 * medianFlow(site);
  const p = Math.pow(10, Math.floor(Math.log10(q)));
  for (const m of [1, 2, 2.5, 5, 10]) if (q <= m * p) return m * p;
  return 10 * p;
}

export const riverFlowStep = (site: SiteId): number => riverFlowMax(site) / 400;

/** Start of the clock: 1 October, a quiet day (the plant is mid-way between summer low water and winter high flow). */
export const START_DAY = 273;

interface Design {
  site: SiteId;
  head: number;
  designFlow: number;
  riverFlow: number;
}

const DESIGNS: Record<PresetId, Design> = {
  // K5: head 1.5 to 2 m on an abandoned mill, about 2 kW; 1.75 m and 180 L/s are DERIVED from it at 65 % (research §2)
  'full-size': { site: 'race', head: 1.75, designFlow: 0.18, riverFlow: 0.22 },
  // K3: about 200 W; 1 m and 31 L/s are the research's DERIVED example (300 W of water power at 65 %), not reported
  prototype: { site: 'brook', head: 1, designFlow: 0.031, riverFlow: 0.045 },
  brook: { site: 'brook', head: 1.5, designFlow: 0.035, riverFlow: 0.045 },
  river: { site: 'river', head: 3, designFlow: 2.2, riverFlow: 2.5 },
};

/** The drive ratios that bring the generator to its rated speed when the machine turns at its design speed. */
export function defaultRatios(machine: MachineId, head: number, designFlow: number, slope: number) {
  const p = plantFor({ machine, head, designFlow, slope, roughness: 0.5 });
  return { chainRatio: p.defaultChain, beltRatio: p.defaultBelt };
}

export function presetParams(id: PresetId, machine: MachineId = 'screw'): MillParams {
  const d = DESIGNS[id];
  const ratios = defaultRatios(machine, d.head, d.designFlow, SLOPE_DEG_DEFAULT);
  return {
    slowMo: 1,
    timeScale: 1,
    running: true,
    preset: id,
    site: d.site,
    head: d.head,
    designFlow: d.designFlow,
    riverFlow: d.riverFlow,
    followYear: false,
    tailwater: 0,
    gateOpen: true,
    machine,
    slope: SLOPE_DEG_DEFAULT,
    roughness: 0.5,
    gapScale: 1,
    trashRack: false,
    debris: 0,
    ...ratios,
    loadMode: 'generator',
    fixedRpm: 50,
  };
}

/** A change of parameters scheduled at a time of the scenario (real seconds since it began). */
export interface ScheduledEvent {
  at: number;
  patch: Partial<MillParams>;
  /** Or a whole preset, as the visitor would choose it. */
  preset?: PresetId;
}

/** A parameter that moves linearly from `from` to `to` between `at` and `at + duration` (real seconds). */
export interface Ramp {
  key: 'riverFlow' | 'tailwater' | 'debris' | 'fixedRpm' | 'roughness';
  at: number;
  duration: number;
  from: number;
  to: number;
}

export interface ScenarioSetup {
  params: MillParams;
  events: ScheduledEvent[];
  ramps: Ramp[];
}

export function scenarioSetup(id: ScenarioId): ScenarioSetup {
  const s = scenarioBase(id);
  // a scenario is a variation of a preset: the preset select then shows "custom"
  return { ...s, params: { ...s.params, preset: 'custom' } };
}

function scenarioBase(id: ScenarioId): ScenarioSetup {
  const full = presetParams('full-size');
  const none = { events: [], ramps: [] };
  const rpm0 = plantFor(full).designRpm;
  switch (id) {
    case 'low-water':
      // the river falls to the reserved flow: the machine slows, then the gate closes (K13: two to four months a year)
      return { params: full, events: [], ramps: [{ key: 'riverFlow', at: 5, duration: 150, from: 0.22, to: 0.03 }] };
    case 'flood':
      // the river rises, the tailwater climbs, the head collapses; the gate closes (the owner's rule: six times the median)
      return { params: full, events: [], ramps: [{ key: 'riverFlow', at: 5, duration: 150, from: 0.22, to: 1.9 }] };
    case 'debris':
      // a rack in the intake clogs with leaves; at 100 s the rack is taken out, as a screw allows
      return {
        params: { ...full, trashRack: true },
        events: [{ at: 100, patch: { trashRack: false } }],
        ramps: [{ key: 'debris', at: 5, duration: 90, from: 0, to: 0.9 }],
      };
    case 'too-fast':
      // the speed is imposed (a drive): up to 2.4 times the usual speed, the buckets half empty
      return {
        params: { ...full, loadMode: 'fixed', fixedRpm: Math.round(rpm0) },
        ...none,
        ramps: [{ key: 'fixedRpm', at: 5, duration: 90, from: Math.round(rpm0), to: Math.round(2.4 * rpm0) }],
      };
    case 'too-slow':
      return {
        params: { ...full, loadMode: 'fixed', fixedRpm: Math.round(rpm0) },
        ...none,
        ramps: [{ key: 'fixedRpm', at: 5, duration: 90, from: Math.round(rpm0), to: Math.round(0.3 * rpm0) }],
      };
    case 'wrong-ratio':
      // belt too small a ratio (rounded to 1.5): the generator is below the battery voltage for a moment, then the screw settles at
      // about 117 rpm, 1.3 kW and half-empty pockets (the engine, not a rule of thumb: src/data/lessons.test.ts pins the transient);
      // then too large: the screw is held back
      return {
        params: full,
        events: [
          { at: 15, patch: { beltRatio: Math.max(1, Math.round(0.45 * full.beltRatio * 10) / 10) } },
          { at: 75, patch: { beltRatio: Math.min(8, Math.round(1.9 * full.beltRatio * 10) / 10) } },
          { at: 135, patch: { beltRatio: full.beltRatio } },
        ],
        ramps: [],
      };
    case 'rough-surface':
      return { params: full, events: [], ramps: [{ key: 'roughness', at: 5, duration: 100, from: 0.5, to: 5 }] };
    case 'wheel-instead':
      // the same site, the same water: first the screw, then a breastshot wheel, then an undershot wheel
      return {
        params: full,
        events: [
          { at: 30, patch: { machine: 'breastshot' } },
          { at: 70, patch: { machine: 'undershot' } },
        ],
        ramps: [],
      };
    case 'prototype-vs-full':
      return {
        params: presetParams('prototype'),
        events: [{ at: 40, patch: {}, preset: 'full-size' }],
        ramps: [],
      };
    default:
      return { params: full, ...none };
  }
}

export const PRESET_IDS: PresetId[] = ['full-size', 'prototype', 'brook', 'river'];
export const SCENARIO_IDS: ScenarioId[] = [
  'low-water',
  'flood',
  'debris',
  'too-fast',
  'too-slow',
  'wrong-ratio',
  'rough-surface',
  'wheel-instead',
  'prototype-vs-full',
];
