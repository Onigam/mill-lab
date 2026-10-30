import type { UiKey } from '../i18n/ui';
import { G, RHO } from '../sim/machine';
import {
  CHOOSER_BOX,
  POWER_LINES,
  TURBINE_TYPES,
  ZONES,
  equalPowerFlow,
  powerLine,
  zonePolygon,
  type TurbineType,
} from '../sim/chooser';
import type { MachineId, MillParams, MillState, PresetId, ScenarioId, Scope } from '../sim/types';
import type { SiteId } from '../sim/site';
import type { YearResult } from '../sim/year';

// What the simulation panel plots and says, as plain functions of the simulation (no DOM), so that a test can check the
// numbers behind the charts and the wording of the status line without a browser.

export const PRESET_KEYS: Record<PresetId, UiKey> = {
  'full-size': 'presetFullSize',
  prototype: 'presetPrototype',
  brook: 'presetBrook',
  river: 'presetRiver',
};

export const SCENARIO_KEYS: Record<ScenarioId, UiKey> = {
  'low-water': 'scenarioLowWater',
  flood: 'scenarioFlood',
  debris: 'scenarioDebris',
  'too-fast': 'scenarioTooFast',
  'too-slow': 'scenarioTooSlow',
  'wrong-ratio': 'scenarioWrongRatio',
  'rough-surface': 'scenarioRough',
  'wheel-instead': 'scenarioWheel',
  'prototype-vs-full': 'scenarioPrototype',
};

export const SITE_KEYS: Record<SiteId, UiKey> = { brook: 'siteBrook', race: 'siteRace', river: 'siteRiver' };

export const MACHINE_KEYS: Record<MachineId, UiKey> = {
  screw: 'machineScrew',
  overshot: 'machineOvershot',
  breastshot: 'machineBreastshot',
  undershot: 'machineUndershot',
};

export const TYPE_KEYS: Record<TurbineType, UiKey> = {
  undershot: 'typeUndershot',
  breastshot: 'typeBreastshot',
  overshot: 'typeOvershot',
  screw: 'typeScrew',
  kaplan: 'typeKaplan',
  crossflow: 'typeCrossflow',
  francis: 'typeFrancis',
  pelton: 'typePelton',
};

/** Colours of the types in the chooser chart (the kit's series colours, and a few more of the same weight). */
export const TYPE_COLORS: Record<TurbineType, string> = {
  undershot: '#6b7280',
  breastshot: '#c4692c',
  overshot: '#7a4a1e',
  screw: '#2a7fb8',
  kaplan: '#2f8f5b',
  crossflow: '#6b4fd8',
  francis: '#b23a48',
  pelton: '#c99700',
};

/** A round upper bound of a chart axis: 1, 2, 2.5 or 5 times a power of ten. */
export function niceCeil(v: number): number {
  if (!(v > 0)) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  for (const m of [1, 2, 2.5, 5, 10]) if (v <= m * p) return m * p;
  return 10 * p;
}

/**
 * A round upper bound for an axis that has three intervals (the kit's charts label four ticks): three times 1, 2, 2.5 or 5
 * times a power of ten, so that every tick is a round number.
 */
export function niceCeil3(v: number): number {
  if (!(v > 0)) return 3;
  const p = Math.pow(10, Math.floor(Math.log10(v / 3)));
  for (const m of [1, 2, 2.5, 5, 10]) if (v <= 3 * m * p) return 3 * m * p;
  return 30 * p;
}

export interface Readout {
  key: UiKey;
  value: number;
  digits: number;
  unit: string;
}

const lps = (q: number) => q * 1000;
const flowDigits = (q: number) => (lps(q) < 10 ? 1 : 0);

/** The few live figures that stay in sight. */
export function mainReadouts(s: MillState, unitRpm: string): Readout[] {
  return [
    { key: 'liveElectric', value: s.electricPower, digits: 0, unit: 'W' },
    { key: 'liveWater', value: s.hydraulicPower, digits: 0, unit: 'W' },
    { key: 'liveEfficiency', value: 100 * s.etaOverall, digits: 0, unit: '%' },
    { key: 'liveSpeed', value: s.rpm, digits: 0, unit: unitRpm },
    { key: 'liveFill', value: 100 * Math.min(s.fill, 1), digits: 0, unit: '%' },
    { key: 'liveFlow', value: lps(s.flow), digits: flowDigits(s.flow), unit: 'L/s' },
    { key: 'liveHead', value: s.headNet, digits: 2, unit: 'm' },
  ];
}

/** The rest, folded. */
export function moreReadouts(s: MillState, unitRpm: string): Readout[] {
  return [
    { key: 'liveMachineEff', value: 100 * s.etaMachine, digits: 0, unit: '%' },
    { key: 'liveShaft', value: s.shaftPower, digits: 0, unit: 'W' },
    { key: 'liveTorque', value: s.torque, digits: 0, unit: 'N·m' },
    { key: 'liveGenSpeed', value: s.generatorRpm, digits: 0, unit: unitRpm },
    { key: 'liveVolts', value: s.openCircuitVolts, digits: 0, unit: 'V' },
    { key: 'liveCurrent', value: s.current, digits: 1, unit: 'A' },
    { key: 'liveBypass', value: lps(s.bypassFlow), digits: flowDigits(s.bypassFlow), unit: 'L/s' },
    { key: 'liveReserved', value: lps(s.reservedFlow), digits: flowDigits(s.reservedFlow), unit: 'L/s' },
    { key: 'liveOverflow', value: lps(s.qOver), digits: flowDigits(s.qOver), unit: 'L/s' },
    { key: 'liveLeak', value: lps(s.qGap), digits: flowDigits(s.qGap), unit: 'L/s' },
    {
      key: 'liveDrawdown',
      value: s.lossDrawdown / Math.max(1e-9, RHO * G * Math.max(s.qBucket, 1e-9)),
      digits: 2,
      unit: 'm',
    },
    { key: 'liveSpeedRule', value: s.speedRatio, digits: 2, unit: '×' },
  ];
}

export interface Segment {
  key: UiKey;
  watts: number;
  colour: string;
}

/** The power of the water split between the electricity and the losses of each stage (they add up to the power of the water). */
export function lossSegments(s: MillState): Segment[] {
  const leak = Math.max(
    0,
    s.hydraulicPower - (s.shaftPower + s.lossFriction + s.lossBearing + s.lossOutlet + s.lossInlet),
  );
  return [
    { key: 'chainElectric', watts: s.electricPower, colour: '#2f8f5b' },
    { key: 'chainGenerator', watts: s.lossGenerator, colour: '#c99700' },
    { key: 'chainDrive', watts: s.lossDrive, colour: '#c4692c' },
    { key: 'chainOutlet', watts: s.lossOutlet, colour: '#6b4fd8' },
    { key: 'chainFriction', watts: s.lossFriction + s.lossBearing, colour: '#8a7a5c' },
    { key: 'chainInlet', watts: s.lossInlet, colour: '#b23a48' },
    { key: 'chainLeak', watts: leak, colour: '#2a7fb8' },
  ];
}

export type Tone = 'note' | 'warn';

/** What the status line says now: one message, the most important first. `warn` messages get the warning callout. */
export function statusOf(s: MillState, p: MillParams): { key: UiKey; tone: Tone } {
  if (s.stopped === 'flood') return { key: 'statusFlood', tone: 'warn' };
  if (s.stopped === 'lowWater') return { key: 'statusLowWater', tone: 'warn' };
  if (s.stopped === 'closed') return { key: 'statusClosed', tone: 'note' };
  if (s.stopped === 'noStart') return { key: 'statusNoStart', tone: 'warn' };
  const a = s.alarms;
  if (a.includes('noCharge')) return { key: 'statusNoCharge', tone: 'warn' };
  if (a.includes('tooFast')) return { key: 'statusTooFast', tone: 'warn' };
  if (a.includes('tooSlow')) return { key: 'statusTooSlow', tone: 'warn' };
  if (a.includes('rackClogged')) return { key: 'statusRack', tone: 'warn' };
  if (a.includes('outOfRange')) return { key: 'statusOutOfRange', tone: 'warn' };
  return { key: p.machine === 'screw' ? 'statusRunning' : 'statusWheelRunning', tone: 'note' };
}

// ------------------------------------------------------------------------------------------------ charts

export interface Curve {
  rpm: number[];
  machineTorque: number[];
  loadTorque: number[];
  shaftPower: number[];
  efficiency: number[];
  fill: number[];
}

export function speedChartData(c: Curve) {
  return {
    xs: c.rpm,
    ys: {
      power: c.shaftPower.map((v) => Math.max(0, v)),
      efficiency: c.efficiency.map((v) => 100 * v),
      fill: c.fill.map((v) => 100 * Math.min(1, v)),
    },
  };
}

/**
 * The torque of the machine and of the load. The load climbs without limit with the speed, so the axis stops at 1.8 times the
 * greatest torque of the machine and the part of the load above it is left out: the two curves cross in plain sight.
 */
export function torqueChartData(c: Curve) {
  const machine = c.machineTorque.map((v) => Math.max(0, v));
  const top = niceCeil3(1.8 * Math.max(1, ...machine));
  return { xs: c.rpm, yMax: top, ys: { machine, load: c.loadTorque.map((v) => (v <= top ? v : NaN)) } };
}

/** The chooser chart: closed outlines of the zones and lines of equal power, in log10 units, sharing one list of abscissas. */
export function chooserChartData(): { xs: number[]; ys: Record<string, number[]> } {
  const box = CHOOSER_BOX;
  const xs: number[] = [box.xMin];
  const spans: { key: string; from: number; pts: [number, number][] }[] = [];
  const add = (key: string, pts: [number, number][]) => {
    spans.push({ key, from: xs.length, pts });
    for (const p of pts) xs.push(p[0]);
  };
  for (const t of TURBINE_TYPES) add(`zone-${t}`, zonePolygon(t, box));
  POWER_LINES.forEach((p, i) => add(`line-${i}`, powerLine(p, 0.75, box)));
  xs.push(box.xMax);
  const ys: Record<string, number[]> = {};
  for (const sp of spans) {
    const col = new Array<number>(xs.length).fill(NaN);
    sp.pts.forEach((pt, i) => (col[sp.from + i] = pt[1]));
    ys[sp.key] = col;
  }
  return { xs, ys };
}

/** Power of a line of equal power at a head, for the legend (the label of the line). */
export const linePowerLabel = (watts: number): string =>
  watts >= 1e6 ? `${watts / 1e6} MW` : watts >= 1e3 ? `${watts / 1e3} kW` : `${watts} W`;

export const siteMarker = (head: number, flow: number) => ({ x: Math.log10(head), y: Math.log10(flow) });

export const flowForLine = equalPowerFlow;

export function compareChartData(c: { river: number[]; power: Record<MachineId, number[]> }) {
  return { xs: c.river.map((q) => q * 1000), ys: { ...c.power } };
}

/** The 365 days: flows in L/s for a small site, in m³/s for a large one (the unit is returned). */
export function yearChartData(y: YearResult, reserved: number) {
  const top = Math.max(...y.river);
  const unitScale = top < 1 ? 1000 : 1;
  const xs = y.river.map((_, d) => d);
  return {
    xs,
    unit: unitScale === 1000 ? 'L/s' : 'm³/s',
    flows: {
      river: y.river.map((q) => q * unitScale),
      taken: y.flow.map((q) => q * unitScale),
      reserved: y.river.map(() => reserved * unitScale),
    },
    power: y.power,
  };
}

/** The last minute, with time counted back from now (0 at the right edge). */
export function liveChartData(scope: Scope) {
  const n = scope.t.length;
  const last = n ? scope.t[n - 1] : 0;
  return { xs: scope.t.map((x) => x - last), rpm: scope.rpm, power: scope.electricPower };
}

/** Expected wheel and screw efficiencies listed by the sources, for the legend under the comparison chart. */
export const ZONE_HEADS = ZONES;
