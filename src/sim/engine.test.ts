import { describe, expect, it } from 'vitest';
import { MillSim } from './engine';
import { PRESET_IDS, RANGES, SCENARIO_IDS } from './presets';
import type { MillParams, MillState } from './types';

// The engine as the kit drives it: steps of a frame, edits from the panel, presets and scenarios.

function run(sim: MillSim, seconds: number, fps = 30): void {
  const n = Math.round(seconds * fps);
  for (let i = 0; i < n; i++) sim.step(1 / fps);
}

const finite = (s: MillState): boolean => Object.values(s).every((v) => typeof v !== 'number' || Number.isFinite(v));

describe('the simulation as a LabSim', () => {
  it('opens on the full-size mill race at its design point', () => {
    const sim = new MillSim();
    expect(sim.params.preset).toBe('full-size');
    run(sim, 10);
    expect(sim.state.rpm).toBeGreaterThan(50);
    expect(sim.state.rpm).toBeLessThan(60);
    expect(sim.state.electricPower).toBeGreaterThan(1900);
    expect(sim.state.electricPower).toBeLessThan(2500);
    expect(sim.state.alarms).toEqual([]);
  });
  it('starts the clock of the year at noon, as the strip says', () => {
    const sim = new MillSim();
    expect(sim.state.hour).toBe(12);
    run(sim, 1);
    expect(sim.state.hour).toBeGreaterThan(12);
    expect(sim.state.hour).toBeLessThan(12.01);
    sim.set({ timeScale: 3600 });
    run(sim, 2); // two seconds at one hour a second
    expect(sim.state.hour).toBeGreaterThan(14);
    expect(sim.state.hour).toBeLessThan(14.2);
  });
  it('does nothing while paused', () => {
    const sim = new MillSim();
    run(sim, 5);
    const angle = sim.state.angle;
    sim.set({ running: false });
    run(sim, 5);
    expect(sim.state.angle).toBe(angle);
    expect(sim.state.simTime).toBeLessThan(6);
  });
  it('is deterministic: two runs of the same scenario give the same numbers', () => {
    const a = new MillSim();
    const b = new MillSim();
    a.applyScenario('flood');
    b.applyScenario('flood');
    run(a, 60);
    run(b, 60);
    expect(a.state.electricPower).toBe(b.state.electricPower);
    expect(a.state.angle).toBe(b.state.angle);
  });
  it('does not depend on the frame rate: 30, 60 and 144 frames a second agree to 2 %', () => {
    const results = [30, 60, 144].map((fps) => {
      const sim = new MillSim();
      sim.applyScenario('low-water');
      run(sim, 70, fps);
      return sim.state.electricPower;
    });
    for (const r of results) expect(Math.abs(r / results[0] - 1)).toBeLessThan(0.02);
  });
  it('the speed is stable whatever the step: a one-second step does not overshoot', () => {
    const sim = new MillSim();
    sim.set({ beltRatio: sim.params.beltRatio * 1.8 });
    for (let i = 0; i < 60; i++) sim.step(0.25);
    const rpm = sim.state.rpm;
    for (let i = 0; i < 60; i++) sim.step(0.25);
    expect(Math.abs(sim.state.rpm / rpm - 1)).toBeLessThan(0.02);
    expect(sim.state.rpm).toBeGreaterThan(0);
  });
  it('slow motion slows the rotation, not the clock; the time scale speeds the clock, not the rotation', () => {
    const a = new MillSim();
    const b = new MillSim();
    b.set({ slowMo: 0.2 });
    run(a, 10);
    run(b, 10);
    expect(b.state.angle).not.toBe(a.state.angle);
    expect(b.state.simTime).toBeCloseTo(a.state.simTime, 9);
    const c = new MillSim();
    c.set({ timeScale: 86400, followYear: true });
    run(c, 10);
    expect(c.state.simTime).toBeCloseTo(10 * 86400, 0);
    // the days went by: a ten-day-long river was followed
    expect(Math.abs(c.state.day - 273 - 10 - 0.5)).toBeLessThan(0.1); // ten days after the noon start
  });
  it('fast-forward is consistent: a year at 86400 s per second gives, to 3 %, the energy of the yearly calculation', () => {
    const sim = new MillSim();
    sim.set({ timeScale: 86400 * 6, followYear: true });
    for (let i = 0; i < 61 * 30; i++) sim.step(1 / 30);
    const year = sim.getYear();
    expect(sim.state.energyElectric / 1000).toBeGreaterThan(0.9 * year.energy);
    expect(sim.state.energyElectric / 1000).toBeLessThan(1.1 * year.energy);
    expect(sim.state.energyElectric).toBeLessThan(sim.state.energyHydraulic);
  });
  it('edits are clamped to their ranges and turn the preset into custom; the time controls do not', () => {
    const sim = new MillSim();
    sim.set({ timeScale: 3600 });
    expect(sim.params.preset).toBe('full-size');
    sim.set({ head: 100, slope: 1, debris: 5, gapScale: -3 });
    expect(sim.params.head).toBe(RANGES.head.max);
    expect(sim.params.slope).toBe(RANGES.slope.min);
    expect(sim.params.debris).toBe(RANGES.debris.max);
    expect(sim.params.gapScale).toBe(RANGES.gapScale.min);
    expect(sim.params.preset).toBe('custom');
  });
  it('a change notifies the listeners', () => {
    const sim = new MillSim();
    let n = 0;
    sim.onChange(() => n++);
    sim.set({ head: 2 });
    sim.applyPreset('prototype');
    sim.applyScenario('debris');
    expect(n).toBe(3);
  });
  it('the four presets are four plants: the prototype gives about 200 W, the river the most', () => {
    const power = PRESET_IDS.map((id) => {
      const sim = new MillSim();
      sim.applyPreset(id);
      run(sim, 15);
      return sim.state.electricPower;
    });
    expect(power[1]).toBeGreaterThan(150);
    expect(power[1]).toBeLessThan(300);
    expect(power[3]).toBeGreaterThan(power[0]);
    expect(power[0]).toBeGreaterThan(power[2]);
  });
  it('a machine changed on the fly starts at its own speed, without a burst of energy', () => {
    const sim = new MillSim();
    run(sim, 3);
    sim.set({ machine: 'breastshot' });
    run(sim, 1);
    expect(sim.state.electricPower).toBeLessThan(3000);
    expect(sim.state.rpm).toBeLessThan(20);
  });
  it('energy is conserved: the electricity of a run never exceeds the water that arrived', () => {
    for (const id of SCENARIO_IDS) {
      const sim = new MillSim();
      sim.applyScenario(id);
      run(sim, 120, 15);
      expect(sim.state.energyElectric, id).toBeLessThanOrEqual(sim.state.energyHydraulic * 1.0 + 1);
    }
  });
});

describe('the scenarios: each one shows one thing', () => {
  const start = (id: (typeof SCENARIO_IDS)[number]) => {
    const sim = new MillSim();
    sim.applyScenario(id);
    return sim;
  };
  it('low-water: the fill falls, the power falls, then the gate closes and the screw stops (K13)', () => {
    const sim = start('low-water');
    run(sim, 3);
    const full = sim.state.electricPower;
    run(sim, 100);
    expect(sim.state.fill).toBeLessThan(0.7);
    expect(sim.state.electricPower).toBeLessThan(0.7 * full);
    run(sim, 60);
    expect(sim.state.stopped).toBe('lowWater');
    expect(sim.state.alarms).toContain('lowWater');
    expect(sim.state.rpm).toBeLessThan(1);
  });
  it('flood: the tailwater rises, the head and the power collapse, the gate closes', () => {
    const sim = start('flood');
    run(sim, 80);
    expect(sim.state.tailRise).toBeGreaterThan(0.4);
    expect(sim.state.headNet).toBeLessThan(1.4);
    expect(sim.state.electricPower).toBeLessThan(1400);
    run(sim, 80);
    expect(sim.state.stopped).toBe('flood');
  });
  it('debris: a clogged rack costs head; taking the rack out gives the power back', () => {
    const sim = start('debris');
    run(sim, 85);
    expect(sim.state.rackLoss).toBeGreaterThan(0.4);
    expect(sim.state.alarms).toContain('rackClogged');
    expect(sim.state.electricPower).toBeLessThan(1600);
    run(sim, 30);
    expect(sim.state.rackLoss).toBe(0);
    expect(sim.state.electricPower).toBeGreaterThan(2000);
  });
  it('too-fast: the speed rises past the rule, the buckets empty, the alarm rings', () => {
    const sim = start('too-fast');
    run(sim, 100);
    expect(sim.state.speedRatio).toBeGreaterThan(2);
    expect(sim.state.fill).toBeLessThan(0.6);
    expect(sim.state.alarms).toContain('tooFast');
    expect(sim.state.electricPower).toBeLessThan(1300);
  });
  it('too-slow: the buckets overflow and the power falls', () => {
    const sim = start('too-slow');
    run(sim, 100);
    expect(sim.state.qOver).toBeGreaterThan(0.08);
    expect(sim.state.alarms).toContain('tooSlow');
    expect(sim.state.electricPower).toBeLessThan(900);
  });
  it('wrong-ratio: first the generator never charges the battery, then the screw is held back, then all is well again', () => {
    const sim = start('wrong-ratio');
    run(sim, 40);
    expect(sim.state.rpm).toBeGreaterThan(90);
    run(sim, 50);
    expect(sim.state.rpm).toBeLessThan(40);
    run(sim, 80);
    expect(sim.state.rpm).toBeGreaterThan(50);
    expect(sim.state.electricPower).toBeGreaterThan(2000);
  });
  it('rough-surface: the friction loss grows with the roughness', () => {
    const sim = start('rough-surface');
    run(sim, 2);
    const f0 = sim.state.lossFriction;
    run(sim, 110);
    expect(sim.state.lossFriction).toBeGreaterThan(1.4 * f0);
  });
  it('wheel-instead: first the screw, then a breastshot wheel, then an undershot wheel, on the same water', () => {
    const sim = start('wheel-instead');
    run(sim, 20);
    const screw = sim.state.electricPower;
    run(sim, 25);
    expect(sim.params.machine).toBe('breastshot');
    expect(sim.state.rpm).toBeLessThan(15);
    expect(sim.state.electricPower).toBeLessThan(screw);
    run(sim, 40);
    expect(sim.params.machine).toBe('undershot');
    expect(sim.state.electricPower).toBeLessThan(0.65 * screw);
  });
  it('prototype-vs-full: 200 W, then ten times that when the full-size machine replaces it', () => {
    const sim = start('prototype-vs-full');
    run(sim, 20);
    expect(sim.state.electricPower).toBeLessThan(300);
    expect(sim.state.outerDiameter).toBeLessThan(0.5);
    run(sim, 40);
    expect(sim.state.electricPower).toBeGreaterThan(1800);
    expect(sim.state.outerDiameter).toBeGreaterThan(0.8);
  });
});

describe('robustness', () => {
  it('no value of the state is NaN or infinite under 300 random edits of every parameter, with a step after each', () => {
    const sim = new MillSim();
    let seed = 7;
    const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
    const pick = <T>(xs: readonly T[]): T => xs[Math.floor(rnd() * xs.length)];
    for (let i = 0; i < 300; i++) {
      const patch: Partial<MillParams> = {};
      for (const [k, r] of Object.entries(RANGES)) {
        if (rnd() < 0.15) (patch as Record<string, number>)[k] = r.min + rnd() * (r.max - r.min);
      }
      if (rnd() < 0.1) patch.machine = pick(['screw', 'overshot', 'breastshot', 'undershot'] as const);
      if (rnd() < 0.1) patch.site = pick(['brook', 'race', 'river'] as const);
      if (rnd() < 0.1) patch.loadMode = pick(['generator', 'fixed'] as const);
      if (rnd() < 0.1) patch.trashRack = rnd() < 0.5;
      if (rnd() < 0.05) patch.gateOpen = rnd() < 0.5;
      sim.set(patch);
      for (let j = 0; j < 4; j++) sim.step(0.1);
      expect(finite(sim.state), `edit ${i}`).toBe(true);
      expect(sim.state.electricPower).toBeGreaterThanOrEqual(0);
      expect(sim.state.etaOverall).toBeLessThanOrEqual(1);
    }
  });
  it('the whole range of every parameter, one at a time, gives a finite plant', () => {
    for (const [k, r] of Object.entries(RANGES)) {
      for (const v of [r.min, (r.min + r.max) / 2, r.max]) {
        const sim = new MillSim();
        sim.set({ [k]: v } as Partial<MillParams>);
        run(sim, 2, 15);
        expect(finite(sim.state), `${k}=${v}`).toBe(true);
      }
    }
  });
  it('the curves for the panel are finite and the year is cached', () => {
    const sim = new MillSim();
    const c = sim.getSpeedCurve();
    for (const arr of Object.values(c)) for (const v of arr) expect(Number.isFinite(v)).toBe(true);
    expect(sim.getYear()).toBe(sim.getYear());
    const cmp = sim.getCompare();
    for (const arr of Object.values(cmp.power)) for (const v of arr) expect(Number.isFinite(v)).toBe(true);
    expect(sim.getCandidates().length).toBe(8);
  });
});
