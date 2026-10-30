import type { LabSim } from '@onigam/lab-kit/ui';
import { candidatesFor, CHOOSER_BOX, type Candidate } from './chooser';
import { SECONDS_PER_DAY, SPEED_ALARM_FACTOR, TAU_STOP, WHEEL_MASS_PER_AREA } from './machine';
import { loadTorqueAtSlowShaft, rpmToRad } from './mech';
import { clamp } from './physics';
import {
  defaultRatios,
  presetParams,
  RANGES,
  riverFlowMax,
  scenarioSetup,
  START_DAY,
  type Ramp,
  type RangedKey,
  type ScheduledEvent,
} from './presets';
import { flowOnDay } from './site';
import { driveEfficiency, plantAt, plantFor, solvePlant, type Plant, type PlantParams } from './system';
import type { AlarmKey, MachineId, MillParams, MillState, Operating, PresetId, ScenarioId, Scope } from './types';
import { simulateYear, type YearResult } from './year';

// MillSim: the whole mill as the kit's `LabSim`. The plant is steady at every instant (system.ts) except for one thing, the
// rotation speed, which follows the torque balance with the inertia of the machine; the slow clock (the season, the
// energy counters) runs at `timeScale`; the scripted scenarios run in real seconds. Deterministic: no random number is
// drawn at run time (the year of the site is drawn once, from a seed).

/** Longest step integrated at once, s (a tab that was in the background does not make one giant step). */
const DT_MAX = 0.25;
const SCOPE_EVERY = 0.25;
const SCOPE_LENGTH = 240;

const TIME_KEYS: (keyof MillParams)[] = ['slowMo', 'timeScale', 'running'];

/** The parameters the plant depends on: when none of them has changed the steady state is not solved again. */
const EQ_KEYS: (keyof MillParams)[] = [
  'site',
  'head',
  'designFlow',
  'riverFlow',
  'tailwater',
  'gateOpen',
  'machine',
  'slope',
  'roughness',
  'gapScale',
  'trashRack',
  'debris',
  'chainRatio',
  'beltRatio',
  'loadMode',
  'fixedRpm',
];

const plantParams = (p: MillParams): PlantParams => p;

function initialState(p: MillParams): MillState {
  const plant = plantFor(p);
  const op = solvePlant(plantParams(p), p.riverFlow);
  return {
    ...op,
    simTime: 0,
    day: START_DAY,
    hour: 8,
    outerDiameter: plant.screw?.outerDiameter ?? 0,
    innerDiameter: plant.screw?.innerDiameter ?? 0,
    pitch: plant.screw?.pitch ?? 0,
    length: plant.screw?.length ?? 0,
    slopeDeg: p.slope,
    wheelDiameter: plant.wheel?.diameter ?? 0,
    wheelWidth: plant.wheel?.width ?? 0,
    angle: 0,
    energyHydraulic: 0,
    energyElectric: 0,
    energyToday: 0,
    alarms: [],
  };
}

export class MillSim implements LabSim {
  readonly params: MillParams;
  readonly state: MillState;
  readonly scope: Scope = { t: [], rpm: [], shaftPower: [], electricPower: [], flow: [] };
  private listeners = new Set<() => void>();
  private events: ScheduledEvent[] = [];
  private ramps: Ramp[] = [];
  private scriptTime = 0;
  private fired = new Set<number>();
  private eqSnapshot: unknown[] = [];
  private opKey = NaN;
  private op!: Operating;
  private eq: Operating;
  private sinceScope = 0;
  private scopeClock = 0;
  private year: { key: string; value: YearResult } | null = null;
  private lastPreset: PresetId | ScenarioId = 'full-size';
  private lastKind: 'preset' | 'scenario' = 'preset';

  constructor() {
    this.params = presetParams('full-size');
    this.state = initialState(this.params);
    this.eq = this.state;
    this.refreshEquilibrium();
    this.state.omega = this.eq.omega;
    this.refreshState(0);
  }

  // ------------------------------------------------------------------ the LabSim contract

  onChange(fn: () => void): void {
    this.listeners.add(fn);
  }

  emit(): void {
    this.listeners.forEach((fn) => fn());
  }

  /** Change parameters (clamped). Anything but the time controls turns the preset into 'custom'. */
  set(patch: Partial<MillParams>): void {
    const p = this.params as unknown as Record<string, unknown>;
    const before = this.params.machine;
    let physical = false;
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined) continue;
      if (key in RANGES) {
        const range = RANGES[key as RangedKey];
        const max = key === 'riverFlow' ? riverFlowMax((patch.site ?? this.params.site) as never) : range.max;
        p[key] = clamp(Number(value), range.min, max);
      } else if (key === 'slowMo' || key === 'timeScale') {
        p[key] = Math.max(0, Number(value));
      } else {
        p[key] = value;
      }
      if (!TIME_KEYS.includes(key as keyof MillParams) && key !== 'preset') {
        physical = true;
        // the visitor takes over a quantity a scenario was moving
        this.ramps = this.ramps.filter((r) => r.key !== key);
      }
    }
    if (physical && patch.preset === undefined) this.params.preset = 'custom';
    // another machine needs another drive: the ratios that suit it come with it (unless the caller chose them)
    if (patch.machine && patch.machine !== before && patch.chainRatio === undefined && patch.beltRatio === undefined) {
      Object.assign(
        this.params,
        defaultRatios(patch.machine, this.params.head, this.params.designFlow, this.params.slope),
      );
    }
    this.refreshEquilibrium();
    // a machine that is replaced starts at its own operating point, not with the energy of the one it replaces
    if (patch.machine && patch.machine !== before) this.state.omega = this.eq.omega;
    this.emit();
  }

  applyPreset(id: PresetId): void {
    this.lastPreset = id;
    this.lastKind = 'preset';
    this.load(presetParams(id), [], []);
  }

  applyScenario(id: ScenarioId): void {
    this.lastPreset = id;
    this.lastKind = 'scenario';
    const s = scenarioSetup(id);
    this.load(s.params, s.events, s.ramps);
  }

  /** Start again from the last preset or scenario. */
  reset(): void {
    if (this.lastKind === 'preset') this.applyPreset(this.lastPreset as PresetId);
    else this.applyScenario(this.lastPreset as ScenarioId);
  }

  private load(next: MillParams, events: ScheduledEvent[], ramps: Ramp[]): void {
    const time = { slowMo: this.params.slowMo, timeScale: this.params.timeScale, running: this.params.running };
    Object.assign(this.params, next, time);
    this.events = events;
    this.ramps = ramps;
    this.scriptTime = 0;
    this.fired.clear();
    const s = this.state;
    s.simTime = 0;
    s.day = START_DAY;
    s.hour = 8;
    s.energyHydraulic = 0;
    s.energyElectric = 0;
    s.energyToday = 0;
    this.scope.t.length = this.scope.rpm.length = this.scope.shaftPower.length = 0;
    this.scope.electricPower.length = this.scope.flow.length = 0;
    this.scopeClock = 0;
    this.applyRamps();
    this.refreshEquilibrium();
    this.state.omega = this.eq.omega;
    this.refreshState(0);
    this.emit();
  }

  // ------------------------------------------------------------------ time

  step(dtReal: number): void {
    if (!this.params.running) return;
    const dt = Math.min(Math.max(dtReal, 0), DT_MAX);
    if (dt === 0) return;
    const p = this.params;
    const s = this.state;
    this.advanceScript(dt);
    // the clock of the year
    const clock = dt * p.timeScale;
    s.simTime += clock;
    const days = START_DAY + s.simTime / SECONDS_PER_DAY;
    const wasDay = Math.floor(s.day);
    s.day = days % 365;
    s.hour = (days - Math.floor(days)) * 24;
    if (Math.floor(s.day) !== wasDay) s.energyToday = 0;
    if (p.followYear) {
      const q = flowOnDay(p.site, s.day);
      if (Math.abs(q - p.riverFlow) > 1e-9) p.riverFlow = clamp(q, 0, riverFlowMax(p.site));
    }
    this.refreshEquilibrium();
    s.omega = this.nextSpeed(s.omega, dt);
    s.angle = (s.angle + s.omega * dt * p.slowMo) % (2 * Math.PI);
    this.refreshState(clock);
    this.sample(dt);
  }

  /**
   * The rotation speed after dt: J dω/dt = T_machine(ω) − T_load(ω), solved implicitly (the right-hand side falls with ω, so
   * the step is stable whatever dt is). A machine that has lost its water, or is held at a speed by a drive, follows a
   * simple lag instead.
   */
  private nextSpeed(omega: number, dt: number): number {
    const p = this.params;
    const target = this.eq.omega;
    if (this.eq.flow <= 0 || p.loadMode === 'fixed') {
      const tau = target <= 1e-6 ? TAU_STOP : 1;
      const w = omega + (target - omega) * (1 - Math.exp(-dt / tau));
      return w < 1e-4 ? 0 : w;
    }
    if (Math.abs(omega - target) < 1e-3 * Math.max(target, 1e-3)) return target;
    const c = plantAt(plantParams(p), p.riverFlow);
    const inertia = this.inertia();
    // g(x) = J (x − ω)/dt − (T_machine(x) − T_load(x)) increases with x: bisection
    const g = (x: number) => (inertia * (x - omega)) / dt - (c.supply(x) - c.load(x));
    let lo = 0;
    let hi = c.omegaMax;
    for (let i = 0; i < 30; i++) {
      const mid = 0.5 * (lo + hi);
      if (g(mid) > 0) hi = mid;
      else lo = mid;
    }
    return 0.5 * (lo + hi);
  }

  /** Moment of inertia of the turning machine, kg·m². */
  private inertia(): number {
    const plant = plantFor(this.params);
    if (plant.screw) return plant.screw.inertia;
    const w = plant.wheel!;
    return 0.5 * WHEEL_MASS_PER_AREA * w.diameter * w.width * (w.diameter / 2) ** 2;
  }

  private advanceScript(dt: number): void {
    this.scriptTime += dt;
    this.events.forEach((e, i) => {
      if (this.fired.has(i) || this.scriptTime < e.at) return;
      this.fired.add(i);
      if (e.preset) {
        const keep = this.ramps;
        const events = this.events;
        const fired = new Set(this.fired);
        const next = presetParams(e.preset, this.params.machine);
        this.load(
          next,
          events,
          keep.filter(() => false),
        );
        this.events = events;
        this.fired = fired;
        this.scriptTime = e.at;
      } else {
        this.set(e.patch);
        this.params.preset = 'custom';
      }
    });
    this.applyRamps();
  }

  private applyRamps(): void {
    for (const r of this.ramps) {
      if (this.scriptTime < r.at) {
        (this.params as unknown as Record<string, number>)[r.key] = r.from;
        continue;
      }
      const u = clamp((this.scriptTime - r.at) / r.duration, 0, 1);
      const v = r.from + (r.to - r.from) * u;
      const range = RANGES[r.key];
      (this.params as unknown as Record<string, number>)[r.key] = clamp(
        v,
        range.min,
        r.key === 'riverFlow' ? riverFlowMax(this.params.site) : range.max,
      );
    }
  }

  // ------------------------------------------------------------------ the steady state and its time constant

  private refreshEquilibrium(): void {
    const p = this.params as unknown as Record<string, unknown>;
    let same = this.eqSnapshot.length === EQ_KEYS.length;
    if (same) {
      for (let i = 0; i < EQ_KEYS.length; i++) {
        const v = p[EQ_KEYS[i]];
        const prev = this.eqSnapshot[i];
        if (v !== prev && !(typeof v === 'number' && typeof prev === 'number' && Math.abs(v - prev) < 1e-9)) {
          same = false;
          break;
        }
      }
    }
    if (same) return;
    this.eqSnapshot = EQ_KEYS.map((k) => p[k]);
    this.opKey = NaN;
    this.eq = solvePlant(plantParams(this.params), this.params.riverFlow);
  }

  /** Fill the state from the plant at the speed it has now. */
  private refreshState(clock: number): void {
    const p = this.params;
    const s = this.state;
    const plant: Plant = plantFor(p);
    if (clock === 0 || this.opKey !== s.omega) {
      this.op = solvePlant(plantParams(p), p.riverFlow, s.omega);
      this.opKey = s.omega;
    }
    const op = this.op;
    // the stop is a decision of the site (gate, flood, low water), whatever the speed is still doing
    const stopped = this.eq.stopped;
    const live: Operating = stopped === 'no' || stopped === 'noStart' ? op : { ...op, stopped };
    Object.assign(s, live);
    s.outerDiameter = plant.screw?.outerDiameter ?? 0;
    s.innerDiameter = plant.screw?.innerDiameter ?? 0;
    s.pitch = plant.screw?.pitch ?? 0;
    s.length = plant.screw?.length ?? 0;
    s.slopeDeg = p.slope;
    s.wheelDiameter = plant.wheel?.diameter ?? 0;
    s.wheelWidth = plant.wheel?.width ?? 0;
    if (clock > 0) {
      s.energyHydraulic += (s.hydraulicPower * clock) / 3600;
      const e = (s.electricPower * clock) / 3600;
      s.energyElectric += e;
      s.energyToday += e;
    }
    s.alarms = this.alarms(s, plant);
  }

  private alarms(s: MillState, plant: Plant): AlarmKey[] {
    const a: AlarmKey[] = [];
    if (s.stopped === 'lowWater') a.push('lowWater');
    if (s.stopped === 'flood') a.push('flood');
    if (s.stopped === 'closed') a.push('gateClosed');
    if (plant.screw && s.omega > 0 && s.speedRatio > SPEED_ALARM_FACTOR) a.push('tooFast');
    if (s.qOver > 0.02 * Math.max(s.flow, 1e-9) && s.omega > 0) a.push('tooSlow');
    if (s.flow > 0 && s.omega > 0 && !s.charging && this.params.loadMode === 'generator') a.push('noCharge');
    if (this.params.trashRack && s.rackLoss > 0.1 * this.params.head) a.push('rackClogged');
    if (!s.inRange) a.push('outOfRange');
    return a;
  }

  private sample(dt: number): void {
    this.sinceScope += dt;
    this.scopeClock += dt;
    if (this.sinceScope < SCOPE_EVERY) return;
    this.sinceScope = 0;
    const sc = this.scope;
    const s = this.state;
    sc.t.push(this.scopeClock);
    sc.rpm.push(s.rpm);
    sc.shaftPower.push(s.shaftPower);
    sc.electricPower.push(s.electricPower);
    sc.flow.push(s.flow);
    if (sc.t.length > SCOPE_LENGTH) for (const k of Object.keys(sc) as (keyof Scope)[]) sc[k].shift();
  }

  // ------------------------------------------------------------------ what the panel plots (computed on demand, cached)

  /** The plant of the current parameters (geometry, generator). */
  get plant(): Plant {
    return plantFor(this.params);
  }

  /** The steady operating point the plant is heading to. */
  get equilibrium(): Operating {
    return this.eq;
  }

  /** A year of the current plant at the current site (about 90 ms the first time, then cached). */
  getYear(): YearResult {
    const p = this.params;
    const key = JSON.stringify([
      p.site,
      p.head,
      p.designFlow,
      p.machine,
      p.slope,
      p.roughness,
      p.gapScale,
      p.tailwater,
      p.trashRack,
      p.debris,
      p.chainRatio,
      p.beltRatio,
      p.loadMode,
      p.fixedRpm,
    ]);
    if (!this.year || this.year.key !== key) this.year = { key, value: simulateYear(plantParams(p)) };
    return this.year.value;
  }

  /** The types of turbine for this site, fitting ones first. */
  getCandidates(): Candidate[] {
    return candidatesFor(this.params.head, this.params.designFlow);
  }

  /** The same site with the screw and with each wheel: electric power against river flow. */
  getCompare(points = 24): { river: number[]; power: Record<MachineId, number[]> } {
    const p = this.params;
    const machines: MachineId[] = ['screw', 'overshot', 'breastshot', 'undershot'];
    const top = riverFlowMax(p.site) / 4;
    const river = Array.from({ length: points }, (_, i) => (top * (i + 1)) / points);
    const power = {} as Record<MachineId, number[]>;
    for (const m of machines) {
      const r = defaultRatios(m, p.head, p.designFlow, p.slope);
      const q: PlantParams = { ...plantParams(p), machine: m, ...r, loadMode: 'generator', gateOpen: true };
      power[m] = river.map((x) => solvePlant(q, x).electricPower);
    }
    return { river, power };
  }

  /** Torque of the machine and of the load against speed at the current flow (for the speed chart). */
  getSpeedCurve(points = 60): {
    rpm: number[];
    machineTorque: number[];
    loadTorque: number[];
    shaftPower: number[];
    efficiency: number[];
    fill: number[];
  } {
    const p = this.params;
    const plant = this.plant;
    const maxRpm = plant.designRpm * 2.6;
    const rpm: number[] = [];
    const machineTorque: number[] = [];
    const loadTorque: number[] = [];
    const shaftPower: number[] = [];
    const efficiency: number[] = [];
    const fill: number[] = [];
    const ratio = p.chainRatio * p.beltRatio;
    const eff = driveEfficiency(p.chainRatio, p.beltRatio);
    for (let i = 1; i <= points; i++) {
      const r = (maxRpm * i) / points;
      const o = solvePlant(plantParams(p), p.riverFlow, rpmToRad(r));
      rpm.push(r);
      machineTorque.push(o.torque);
      loadTorque.push(p.loadMode === 'generator' ? loadTorqueAtSlowShaft(plant.generator, rpmToRad(r), ratio, eff) : 0);
      shaftPower.push(o.shaftPower);
      efficiency.push(o.etaMachine);
      fill.push(o.fill);
    }
    return { rpm, machineTorque, loadTorque, shaftPower, efficiency, fill };
  }

  /** Re-exports for the panel: the chooser box and the ranges. */
  readonly chooserBox = CHOOSER_BOX;
}
