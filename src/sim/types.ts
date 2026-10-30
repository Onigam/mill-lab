import type { SiteId } from './site';
import type { WheelType } from './wheel';

// Shared types of the mill simulation. The engine (engine.ts) writes `MillState` every frame; the 3D scene, the strip and the
// simulation panel only read it. SI everywhere (m, m³/s, W, N·m, V, A) except rotation speeds in rpm and angles in degrees
// where a human reads them.

export type PresetId = 'full-size' | 'prototype' | 'brook' | 'river';
export type ScenarioId =
  | 'low-water'
  | 'flood'
  | 'debris'
  | 'too-fast'
  | 'too-slow'
  | 'wrong-ratio'
  | 'rough-surface'
  | 'wheel-instead'
  | 'prototype-vs-full';

export type MachineId = 'screw' | WheelType;
export type LoadMode = 'generator' | 'fixed';

export type AlarmKey =
  'lowWater' | 'flood' | 'gateClosed' | 'tooFast' | 'tooSlow' | 'noCharge' | 'rackClogged' | 'outOfRange';

/** Everything the visitor can edit live (all through `MillSim.set`). Ranges are in presets.ts (`RANGES`). */
export interface MillParams {
  // ---- kit time controls (required by LabSim)
  /** Visual slow motion of the rotation (1, 0.2, 0.05, 0.02). */
  slowMo: number;
  /** Simulated seconds per real second for the clock of the year (1, 3600, 86400, 604800). */
  timeScale: number;
  running: boolean;
  /** Which preset the values come from; 'custom' as soon as the visitor edits something. */
  preset: PresetId | 'custom';

  // ---- the site
  site: SiteId;
  /** Head of the site at the design tailwater level, m: the screw is as long as it needs to cover it. */
  head: number;
  /** Flow the machine is sized for, m³/s. */
  designFlow: number;
  /** Flow of the river now (used unless the lab follows the year), m³/s. */
  riverFlow: number;
  /** The river follows the seasons of the clock instead of the slider. */
  followYear: boolean;
  /** Extra rise of the tailwater above its design level, m (a flooded outlet). */
  tailwater: number;
  /** The head gate is open. */
  gateOpen: boolean;

  // ---- the machine
  machine: MachineId;
  /** Inclination of the screw, degrees. */
  slope: number;
  /** Wall roughness, mm. */
  roughness: number;
  /** Gap between blade tips and trough, as a multiple of the usual rule. */
  gapScale: number;
  /** A trash rack in the intake (the screw does not need one) and how much of it the debris blocks, 0 to 1. */
  trashRack: boolean;
  debris: number;

  // ---- the drive and the generator
  /** Speed ratios of the chain (slow side) and of the belt (fast side). */
  chainRatio: number;
  beltRatio: number;
  loadMode: LoadMode;
  /** Speed imposed on the machine when the load mode is 'fixed', rpm. */
  fixedRpm: number;
}

/** The steady operating point of the plant (what it settles to), see system.ts. */
export interface Operating {
  // water
  riverFlow: number;
  reservedFlow: number;
  usableFlow: number;
  /** Flow that enters the machine, flow that goes by the weir. */
  flow: number;
  bypassFlow: number;
  tailRise: number;
  rackLoss: number;
  headNet: number;
  sitePower: number;
  // machine
  stopped: 'no' | 'lowWater' | 'flood' | 'closed' | 'noStart';
  omega: number;
  rpm: number;
  fill: number;
  qBucket: number;
  qGap: number;
  qOver: number;
  hydraulicPower: number;
  shaftPower: number;
  torque: number;
  etaMachine: number;
  // losses of the machine (screw): W
  lossGap: number;
  lossOverflow: number;
  lossDrawdown: number;
  lossInlet: number;
  lossOutlet: number;
  lossFriction: number;
  lossBearing: number;
  // drive and generator
  generatorRpm: number;
  driveEfficiency: number;
  generatorTorque: number;
  openCircuitVolts: number;
  current: number;
  electricPower: number;
  generatorEfficiency: number;
  lossDrive: number;
  lossGenerator: number;
  etaOverall: number;
  charging: boolean;
  speedRatio: number;
  inRange: boolean;
}

/** The state handed to the 3D scene, the strip and the panel every frame (flat, read only). */
export interface MillState extends Operating {
  // ---- clock
  simTime: number;
  /** Day of the year (0 = 1 January), fractional, and the hour of the day. */
  day: number;
  hour: number;
  /** The machine and its site as set in the parameters (the 3D view draws them at this size), m. */
  outerDiameter: number;
  innerDiameter: number;
  pitch: number;
  length: number;
  slopeDeg: number;
  wheelDiameter: number;
  wheelWidth: number;
  // ---- for the 3D view
  /** Visual angle of the machine, rad in 0..2π, increasing with time, already scaled by the slow motion. */
  angle: number;
  // ---- energy counters (Wh, slow clock)
  energyHydraulic: number;
  energyElectric: number;
  energyToday: number;
  alarms: AlarmKey[];
}

/** The last minute of the live quantities, sampled every 0.25 s (for the time-series charts). */
export interface Scope {
  t: number[];
  rpm: number[];
  shaftPower: number[];
  electricPower: number[];
  flow: number[];
}
