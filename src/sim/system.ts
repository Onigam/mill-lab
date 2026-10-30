import {
  BELT_EFFICIENCY,
  BUS_VOLTS,
  CANAL_SPEED,
  CHAIN_EFFICIENCY,
  DIODE_DROP,
  FLOW_MIN_FRAC,
  G,
  GEN_HEADROOM,
  GEN_RATED_RPM,
  RACK_CLEAN_ZETA,
  RHO,
  STAGE_RATIO_MAX,
  WHEEL_CAPACITY_FACTOR,
} from './machine';
import {
  cutInOmega,
  designGenerator,
  generatorAt,
  loadTorqueAtSlowShaft,
  matchSpeed,
  radToRpm,
  rpmToRad,
  stagesNeeded,
  type Generator,
} from './mech';
import { clamp } from './physics';
import { floodFlow, reservedFlow, tailRise, type SiteId } from './site';
import { screwPoint, sizeScrew, swallowingCapacity, type ScrewDesign } from './screw';
import type { MachineId, LoadMode, Operating } from './types';
import { sizeWheel, wheelPoint, type WheelDesign } from './wheel';

// The whole plant at one instant, steady: the water of the site, the machine (screw or wheel), the chain and belt, the
// generator on its battery. The speed of the machine is the one where its torque meets the torque of the load (mech.ts).

/** What the plant depends on (a subset of MillParams). */
export interface PlantParams {
  site: SiteId;
  head: number;
  designFlow: number;
  riverFlow?: number;
  tailwater: number;
  gateOpen: boolean;
  machine: MachineId;
  slope: number;
  roughness: number;
  gapScale: number;
  trashRack: boolean;
  debris: number;
  chainRatio: number;
  beltRatio: number;
  loadMode: LoadMode;
  fixedRpm: number;
}

/** The machine and the generator wound for it. */
export interface Plant {
  machine: MachineId;
  screw: ScrewDesign | null;
  wheel: WheelDesign | null;
  designRpm: number;
  designOmega: number;
  /** Shaft power of the machine at its design flow and speed, W. */
  designShaftPower: number;
  generator: Generator;
  /** Ratios that bring the generator to its rated speed when the machine turns at its design speed. */
  defaultChain: number;
  defaultBelt: number;
  /** Electric power at the rated point, W. */
  ratedElectric: number;
}

/** Efficiency of the chain and the belt, with an extra stage for every ratio beyond what two stages can do. */
export function driveEfficiency(chain: number, belt: number): number {
  const stages = Math.max(2, stagesNeeded(chain * belt, STAGE_RATIO_MAX));
  return CHAIN_EFFICIENCY * BELT_EFFICIENCY * Math.pow(BELT_EFFICIENCY, stages - 2);
}

const plantCache = new Map<string, Plant>();

export function plantFor(p: Pick<PlantParams, 'machine' | 'head' | 'designFlow' | 'slope' | 'roughness'>): Plant {
  const key = [p.machine, p.head, p.designFlow, p.slope].join('|');
  const hit = plantCache.get(key);
  if (hit) return hit;
  let designShaftPower: number;
  let designOmega: number;
  let screw: ScrewDesign | null = null;
  let wheel: WheelDesign | null = null;
  if (p.machine === 'screw') {
    screw = sizeScrew({ designFlow: p.designFlow, head: p.head, slopeDeg: p.slope });
    designOmega = rpmToRad(screw.designRpm);
    designShaftPower = screwPoint(screw, { flow: p.designFlow, omega: designOmega }).shaftPower;
  } else {
    wheel = sizeWheel(p.machine, p.head, p.designFlow);
    designOmega = rpmToRad(wheel.designRpm);
    designShaftPower = wheelPoint(wheel, { flow: p.designFlow, omega: designOmega }).shaftPower;
  }
  const designRpm = radToRpm(designOmega);
  const total = Math.max(1, GEN_RATED_RPM / designRpm);
  const chain = Math.max(1, Math.round(Math.min(STAGE_RATIO_MAX, Math.sqrt(total)) * 10) / 10);
  const belt = Math.max(1, Math.round((total / chain) * 10) / 10);
  const ratedShaft = designShaftPower * driveEfficiency(chain, belt);
  const generator = designGenerator(
    Math.max(ratedShaft, 1),
    rpmToRad(GEN_RATED_RPM),
    BUS_VOLTS,
    DIODE_DROP,
    GEN_HEADROOM,
  );
  const plant: Plant = {
    machine: p.machine,
    screw,
    wheel,
    designRpm,
    designOmega,
    designShaftPower,
    generator,
    defaultChain: chain,
    defaultBelt: belt,
    ratedElectric: ratedShaft / (1 + GEN_HEADROOM),
  };
  plantCache.set(key, plant);
  return plant;
}

/** Head lost in a rack of bars on the intake canal, m (zero without a rack). */
export function rackHeadLoss(rack: boolean, blocked: number): number {
  if (!rack) return 0;
  const b = clamp(blocked, 0, 0.95);
  const zeta = RACK_CLEAN_ZETA + Math.min(100, (b / (1 - b)) ** 2);
  return (zeta * CANAL_SPEED * CANAL_SPEED) / (2 * G);
}

/** Flow the machine can take, m³/s. */
export function capacityOf(plant: Plant, gapScale: number): number {
  return plant.screw ? swallowingCapacity(plant.screw, 1, gapScale) : plant.wheel!.designFlow * WHEEL_CAPACITY_FACTOR;
}

/** The conditions of one instant and the torque curves of the machine and of its load, shared by the steady solver and the engine. */
export function plantAt(p: PlantParams, riverFlow: number) {
  const plant = plantFor(p);
  const reserved = reservedFlow(p.site);
  const usable = Math.max(0, riverFlow - reserved);
  const tail = tailRise(p.site, riverFlow) + p.tailwater;
  const rack = rackHeadLoss(p.trashRack, p.debris);
  let stopped: Operating['stopped'] = 'no';
  if (!p.gateOpen) stopped = 'closed';
  else if (riverFlow > floodFlow(p.site)) stopped = 'flood';
  else if (usable < FLOW_MIN_FRAC * p.designFlow) stopped = 'lowWater';
  const flow = stopped === 'no' ? Math.min(usable, capacityOf(plant, p.gapScale)) : 0;
  const ratio = p.chainRatio * p.beltRatio;
  const effD = driveEfficiency(p.chainRatio, p.beltRatio);
  const input = { flow, tailRise: tail, headLoss: rack, roughnessMm: p.roughness, gapScale: p.gapScale };
  const machineAt = (omega: number) =>
    plant.screw
      ? screwPoint(plant.screw, { ...input, omega })
      : { ...wheelPoint(plant.wheel!, { ...input, omega }), idealPower: 0 };
  return {
    plant,
    reserved,
    usable,
    tail,
    rack,
    stopped,
    flow,
    ratio,
    effD,
    machineAt,
    /** Torque the machine offers at the slow shaft, N·m. */
    supply: (w: number) => machineAt(w).torque,
    /** Torque the generator asks of it through the drive, N·m. */
    load: (w: number) => loadTorqueAtSlowShaft(plant.generator, w, ratio, effD),
    omegaMax: plant.designOmega * 4,
  };
}

/**
 * The operating point of the plant for the given parameters and river flow: the steady one, or, when `omegaNow` is given,
 * what the plant does while the machine turns at that speed (the engine uses it while the speed is still changing).
 */
export function solvePlant(p: PlantParams, riverFlow: number, omegaNow?: number): Operating {
  const c = plantAt(p, riverFlow);
  const { plant, flow, ratio, effD } = c;
  let stopped: Operating['stopped'] = c.stopped;
  const fixed = p.loadMode === 'fixed';
  let omega = 0;
  if (flow > 0 && omegaNow !== undefined) omega = omegaNow;
  else if (flow > 0) omega = fixed ? rpmToRad(p.fixedRpm) : matchSpeed(c.supply, c.load, c.omegaMax);
  if (flow > 0 && omega === 0 && stopped === 'no' && omegaNow === undefined) stopped = 'noStart';
  const m = c.machineAt(omega > 0 ? omega : 1e-9);
  const sc = plant.screw && omega > 0 ? (m as ReturnType<typeof screwPoint>) : null;
  const shaft = omega > 0 ? Math.max(0, m.shaftPower) : 0;

  let genShaft: number;
  let electric: number;
  let current: number;
  let voc: number;
  let genTorque: number;
  if (fixed) {
    // the speed is imposed (a drive or a grid-tied machine): the generator is as efficient as at its rated point
    genShaft = shaft * effD;
    electric = genShaft / (1 + GEN_HEADROOM);
    current = electric / BUS_VOLTS;
    voc = BUS_VOLTS * (1 + GEN_HEADROOM);
    genTorque = omega > 0 ? genShaft / (omega * ratio) : 0;
  } else {
    const g = generatorAt(plant.generator, omega * ratio);
    genShaft = g.shaftPower;
    electric = g.electricPower;
    current = g.current;
    voc = g.openCircuitVolts;
    genTorque = g.torque;
  }
  const hydraulic = m.hydraulicPower;
  return {
    riverFlow,
    reservedFlow: c.reserved,
    usableFlow: c.usable,
    flow,
    bypassFlow: Math.max(0, c.usable - flow),
    tailRise: c.tail,
    rackLoss: c.rack,
    headNet: m.headNet,
    sitePower: RHO * G * c.usable * p.head,
    stopped,
    omega,
    rpm: radToRpm(omega),
    fill: sc ? sc.fill : m.fill,
    qBucket: sc ? sc.qBucket : 0,
    qGap: sc ? sc.qGap : 0,
    qOver: sc ? sc.qOver : 0,
    hydraulicPower: hydraulic,
    shaftPower: shaft,
    torque: omega > 0 ? shaft / omega : 0,
    etaMachine: hydraulic > 0 ? shaft / hydraulic : 0,
    lossGap: sc ? sc.gapLoss : 0,
    lossOverflow: sc ? sc.overflowLoss : 0,
    lossDrawdown: sc ? sc.drawdownLoss : 0,
    lossInlet: sc ? sc.inletLoss : 0,
    lossOutlet: sc ? sc.outletLoss : 0,
    lossFriction: sc ? sc.frictionLoss : 0,
    lossBearing: sc ? sc.bearingLoss : 0,
    generatorRpm: radToRpm(omega * ratio),
    driveEfficiency: effD,
    generatorTorque: genTorque,
    openCircuitVolts: voc,
    current,
    electricPower: electric,
    generatorEfficiency: genShaft > 0 ? electric / genShaft : 1,
    lossDrive: Math.max(0, shaft - genShaft),
    lossGenerator: Math.max(0, genShaft - electric),
    etaOverall: hydraulic > 0 ? electric / hydraulic : 0,
    charging: electric > 0.5,
    speedRatio: sc ? sc.speedRatio : plant.designRpm > 0 ? radToRpm(omega) / plant.designRpm : 0,
    inRange: plant.wheel ? (m as ReturnType<typeof wheelPoint>).inRange : true,
  };
}

/** Speed (rpm of the generator shaft) at which the generator starts to charge, for the given ratio. */
export const cutInGeneratorRpm = (plant: Plant): number => radToRpm(cutInOmega(plant.generator));
